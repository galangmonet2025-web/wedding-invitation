import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { HiOutlineUpload, HiOutlineTrash, HiOutlinePhotograph } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { imageApi } from '@/core/api/imageApi';
import { ProxyImage } from './ProxyImage';
import { Modal } from './Modal';
import { useBackgroundTaskStore } from '../store/backgroundTaskStore';
import { setCachedImage } from './ProxyImage';
import type { ImageRecord } from '@/types';

interface ImageUploadProps {
    imageType: string;
    title: string;
    description?: string;
    currentImage?: ImageRecord | null;
    onUploadSuccess: (image: ImageRecord) => void;
    onDeleteSuccess: (imageId: string) => void;
    onClick?: (image: ImageRecord) => void;
    aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
    allowMultiple?: boolean;
    maxFiles?: number;
    onBeforeUpload?: (file: File, index: number) => Promise<{ fileName?: string }>;
    className?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function ImageUpload({
    imageType,
    title,
    description,
    currentImage,
    onUploadSuccess,
    onDeleteSuccess,
    onClick,
    aspectRatio = 'auto',
    allowMultiple = false,
    maxFiles,
    className = ''
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const { tasks, addTask, updateTask } = useBackgroundTaskStore();


    // Compression constraints based on design
    const getCompressionOptions = () => {
        let maxWidthOrHeight = 1920;
        let maxSizeMB = 0.3; // 300KB default

        switch (imageType) {
            case 'hero_cover':
            case 'background':
                maxWidthOrHeight = 1920;
                maxSizeMB = 0.3;
                break;
            case 'gallery':
            case 'story_photo':
                maxWidthOrHeight = 1200;
                maxSizeMB = 0.2;
                break;
            case 'bride_photo':
            case 'groom_photo':
                maxWidthOrHeight = 800;
                maxSizeMB = 0.15;
                break;
            case 'theme_preview':
                // Theme preview images: allow up to 5 MB and max dimension 1200
                maxWidthOrHeight = 1200;
                maxSizeMB = 0.2;
                break;
            default:
                maxWidthOrHeight = 1200;
                maxSizeMB = 0.2;
                break;
        }

        return {
            maxSizeMB,
            maxWidthOrHeight,
            useWebWorker: true,
            fileType: 'image/webp' // Target format WebP based on standard
        };
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the data URL prefix e.g., "data:image/webp;base64,"
                const base64Data = result.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleFileUpload = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;

        const filesArray = Array.from(files);

        // Check maxFiles if provided
        if (maxFiles && filesArray.length > maxFiles) {
            toast.error(`Anda hanya dapat memilih maksimal ${maxFiles} foto sekaligus.`);
            return;
        }

        setUploading(true);
        const total = filesArray.length;
        setUploadProgress({ current: 0, total });

        // Always use background task for visibility in header and store
        const taskId = `upload-${imageType}-${Date.now()}`;
        addTask({
            id: taskId,
            name: total > 1 ? `Upload ${total} Foto: ${title}` : `Upload Foto: ${title}`,
            total: total
        });

        let successCount = 0;
        let failCount = 0;
        let failedFiles: string[] = [];

        for (let i = 0; i < total; i++) {
            if (i > 0) await sleep(1000); // Beri jeda 1 detik antar upload agar lebih stabil
            const file = filesArray[i];
            setUploadProgress({ current: i + 1, total });

            // Basic validation
            if (!file.type.startsWith('image/')) {
                toast.error(`File "${file.name}" bukan gambar yang valid.`);
                failCount++;
                failedFiles.push(file.name);
                updateTask(taskId, {
                    failCount,
                    failedFiles,
                    progress: Math.round(((successCount + failCount) / total) * 100)
                });
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                toast.error(`Ukuran "${file.name}" terlalu besar (Max 10MB).`);
                failCount++;
                failedFiles.push(file.name);
                updateTask(taskId, {
                    failCount,
                    failedFiles,
                    progress: Math.round(((successCount + failCount) / total) * 100)
                });
                continue;
            }

            try {
                // Compress image
                const options = getCompressionOptions();
                const compressedFile = await imageCompression(file, options);

                // Get dimensions
                const getDimensions = (): Promise<{ w: number, h: number }> => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve({ w: img.width, h: img.height });
                        img.src = URL.createObjectURL(compressedFile);
                    });
                };
                const dims = await getDimensions();

                // Convert to Data URL (for local cache and API)
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(compressedFile);
                });
                const base64Data = dataUrl.split(',')[1];

                // Upload via API with Retry Logic
                let response = null;
                let retries = 0;
                const maxRetries = 1; // Reduced retries for faster failure feedback

                const safeFileName = file.name
                    .replace(/\.[^/.]+$/, "") // Remove extension
                    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
                    .toLowerCase() + ".webp";

                while (retries <= maxRetries) {
                    try {
                        response = await imageApi.uploadImage({
                            image_type: imageType,
                            file_name: safeFileName,
                            base64_data: base64Data,
                            mime_type: 'image/webp',
                            width: dims.w,
                            height: dims.h,
                            size_kb: Math.round(compressedFile.size / 1024)
                        }, { skipLoader: true } as any);

                        if (response.success) break;

                        retries++;
                        if (retries <= maxRetries) await sleep(1000 * retries); // Exponential backoff
                    } catch (err) {
                        retries++;
                        if (retries > maxRetries) throw err;
                        await sleep(1000 * retries);
                    }
                }

                if (response && response.success && response.data) {
                    successCount++;

                    // Cache the FULL Data URL locally so ProxyImage can show it instantly
                    if (response.data.cdn_url) {
                        setCachedImage(response.data.cdn_url, dataUrl);
                    }

                    const newRecord: ImageRecord = {
                        id: response.data.id,
                        tenant_id: 'temp',
                        image_type: imageType,
                        file_name: response.data.file_name,
                        drive_file_id: response.data.drive_file_id,
                        drive_url: response.data.drive_url,
                        cdn_url: response.data.cdn_url,
                        width: dims.w,
                        height: dims.h,
                        size_kb: Math.round(compressedFile.size / 1024),
                        created_at: new Date().toISOString()
                    };
                    onUploadSuccess(newRecord);
                } else {
                    failCount++;
                    failedFiles.push(file.name);
                }

            } catch (error: any) {
                failCount++;
                failedFiles.push(file.name);
                console.error('Upload Error:', error);
            }

            // Update background task status
            const isFinished = (successCount + failCount) === total;
            let details = isFinished ? `Selesai: ${successCount} berhasil, ${failCount} gagal` : undefined;

            if (isFinished && failCount > 0) {
                details += ` (Gagal: ${failedFiles.join(', ')})`;
            }

            updateTask(taskId, {
                successCount,
                failCount,
                failedFiles,
                progress: Math.round(((successCount + failCount) / total) * 100),
                status: isFinished ? (failCount === 0 ? 'success' : 'error') : 'running',
                details
            });
        }

        setUploading(false);
        setUploadProgress(null);

    };

    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const handleDelete = async () => {
        if (!currentImage?.id) return;
        setDeleting(true);
        setShowDeleteModal(false);

        try {
            const response = await imageApi.deleteImage(currentImage.id, { skipLoader: true } as any);
            if (response.success) {
                toast.success('Gambar berhasil dihapus!');
                onDeleteSuccess(currentImage.id);
            } else {
                toast.error(response.message || 'Gagal menghapus gambar');
            }
        } catch (error: any) {
            console.error('Delete Error:', error);
            toast.error(error.message || 'Terjadi kesalahan saat menghapus gambar');
        } finally {
            setDeleting(false);
        }
    };

    // Drag and drop handlers
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    }, []);

    const aspectClass = {
        'video': 'aspect-video',
        'square': 'aspect-square',
        'portrait': 'aspect-[3/4]',
        'auto': 'aspect-auto min-h-[140px]'
    }[aspectRatio];

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
                </div>
                {currentImage && (
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deleting}
                        className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 font-medium bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-md transition-colors"
                    >
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                        Hapus Gambar
                    </button>
                )}
            </div>

            {currentImage ? (
                <div className="space-y-1.5 animate-fade-in">
                    <div
                        className={`relative w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${aspectClass} group`}
                    >
                        <ProxyImage
                            src={currentImage.cdn_url || currentImage.drive_url}
                            alt={title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />

                        {/* Dark gradient for text info at the bottom */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent pt-8 pb-3 px-3 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <p className="text-white text-[11px] font-medium truncate leading-tight">{currentImage.file_name}</p>
                            <p className="text-white/80 text-[9px] leading-tight">{currentImage.width}x{currentImage.height} • {currentImage.size_kb} KB</p>
                        </div>

                        {/* Clickable Overlay for Lightbox */}
                        {onClick && (
                            <div
                                className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-0"
                                onClick={() => onClick(currentImage)}
                            >
                                <div className="bg-white/90 dark:bg-black/50 p-2 rounded-full backdrop-blur-sm shadow-sm">
                                    <HiOutlinePhotograph className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                                </div>
                            </div>
                        )}

                        {/* Deleting Overlay */}
                        {deleting && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-[1px] animate-fade-in">
                                <div className="w-8 h-8 border-[3px] border-white/20 border-t-red-500 rounded-full animate-spin mb-2" />
                                <span className="text-[10px] text-white font-medium">Menghapus...</span>
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate text-center px-1 font-medium italic">
                        {currentImage.file_name}
                    </p>
                </div>
            ) : (
                <label
                    className={`relative flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed transition-all cursor-pointer
                        ${dragActive ? 'border-gold-500 bg-gold-50/50 dark:bg-gold-500/10' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500'}
                        ${tasks.some(t => t.status === 'running' && t.id.startsWith(`upload-${imageType}`)) ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : ''}
                        ${aspectClass}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center pt-3 pb-4 text-center px-2">
                        {(() => {
                            const isCurrentlyUploading = tasks.some(t => t.status === 'running' && t.id.startsWith(`upload-${imageType}`));

                            if (uploading || isCurrentlyUploading) {
                                return (
                                    <>
                                        <div className="w-6 h-6 border-[3px] border-gold-200 border-t-gold-500 rounded-full animate-spin mb-2" />
                                        <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                            Sedang mengupload...
                                        </p>
                                        <p className="text-[9px] text-gray-400 dark:text-gray-500">Mohon tunggu hingga selesai</p>
                                    </>
                                );
                            }

                            return (
                                <>
                                    <div className="p-2 bg-gold-50 dark:bg-gold-900/20 rounded-full text-gold-500 mb-2">
                                        <HiOutlineUpload className="w-5 h-5" />
                                    </div>
                                    <p className="mb-0.5 text-xs text-gray-600 dark:text-gray-300">
                                        <span className="font-semibold text-gold-600 dark:text-gold-400">Pilih {allowMultiple ? 'foto-foto' : 'gambar'}</span>
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        Max 5MB {allowMultiple ? '(Banyak file sekaligus)' : ''}
                                    </p>
                                </>
                            );
                        })()}
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg, image/png, image/webp"
                        multiple={allowMultiple}
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFileUpload(e.target.files);
                            }
                        }}
                        disabled={uploading || tasks.some(t => t.status === 'running' && t.id.startsWith(`upload-${imageType}`))}
                    />
                </label>
            )}

            {/* Modal Konfirmasi Hapus */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Hapus Gambar"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-base mb-1">Konfirmasi Hapus</p>
                                <p>Apakah Anda yakin ingin menghapus gambar <b>{currentImage?.file_name}</b>? Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setShowDeleteModal(false)} className="btn-ghost" disabled={deleting}>Batal</button>
                        <button
                            onClick={handleDelete}
                            className="btn-danger py-2 px-6 flex items-center gap-2"
                            disabled={deleting}
                        >
                            {deleting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

