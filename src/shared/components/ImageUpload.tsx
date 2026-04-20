import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { HiOutlineUpload, HiOutlineTrash, HiOutlinePhotograph } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { imageApi } from '@/core/api/imageApi';
import { ProxyImage } from './ProxyImage';
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
}

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
    maxFiles
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

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

        for (let i = 0; i < total; i++) {
            const file = filesArray[i];
            setUploadProgress({ current: i + 1, total });

            // Basic validation
            if (!file.type.startsWith('image/')) {
                toast.error(`File "${file.name}" bukan gambar yang valid.`);
                continue;
            }

            if (file.size > 5 * 1024 * 1024) {
                toast.error(`Ukuran "${file.name}" terlalu besar (Max 5MB).`);
                continue;
            }

            const toastId = toast.loading(`${total > 1 ? `[${i + 1}/${total}] ` : ''}Memproses ${file.name}...`);

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

                // Convert to Base64
                const base64Data = await convertToBase64(compressedFile);

                toast.loading(`${total > 1 ? `[${i + 1}/${total}] ` : ''}Mengupload ${file.name}...`, { id: toastId });

                // Upload via API
                const response = await imageApi.uploadImage({
                    image_type: imageType,
                    file_name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
                    base64_data: base64Data,
                    mime_type: 'image/webp',
                    width: dims.w,
                    height: dims.h,
                    size_kb: Math.round(compressedFile.size / 1024)
                });

                if (response.success && response.data) {
                    toast.success(`${file.name} berhasil diupload!`, { id: toastId });
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
                    toast.error(response.message || `Gagal mengupload ${file.name}`, { id: toastId });
                }

            } catch (error: any) {
                console.error('Upload Error:', error);
                toast.error(`Terjadi kesalahan pada ${file.name}: ${error.message}`, { id: toastId });
            }
        }

        setUploading(false);
        setUploadProgress(null);
    };

    const handleDelete = async () => {
        if (!currentImage?.id) return;

        if (!confirm('Apakah Yakin ingin menghapus gambar ini?')) return;

        setDeleting(true);
        const toastId = toast.loading('Menghapus gambar...');

        try {
            const response = await imageApi.deleteImage(currentImage.id);
            if (response.success) {
                toast.success('Gambar berhasil dihapus!', { id: toastId });
                onDeleteSuccess(currentImage.id);
            } else {
                toast.error(response.message || 'Gagal menghapus gambar', { id: toastId });
            }
        } catch (error: any) {
            console.error('Delete Error:', error);
            toast.error(error.message || 'Terjadi kesalahan saat menghapus gambar', { id: toastId });
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
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
                </div>
                {currentImage && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-xs flex items-center gap-1 text-red-600 hover:text-red-700 font-medium bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-md transition-colors"
                    >
                        {deleting ? (
                            <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                            <HiOutlineTrash className="w-3.5 h-3.5" />
                        )}
                        Hapus Gambar
                    </button>
                )}
            </div>

            {currentImage ? (
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
                </div>
            ) : (
                <label
                    className={`relative flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed transition-colors cursor-pointer
                        ${dragActive ? 'border-gold-500 bg-gold-50/50 dark:bg-gold-500/10' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500'}
                        ${aspectClass}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center pt-3 pb-4 text-center px-2">
                        {uploading ? (
                            <>
                                <div className="w-6 h-6 border-[3px] border-gold-200 border-t-gold-500 rounded-full animate-spin mb-2" />
                                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {uploadProgress ? `Mengupload ${uploadProgress.current}/${uploadProgress.total}` : 'Memproses...'}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">Mohon tunggu</p>
                            </>
                        ) : (
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
                        )}
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
                        disabled={uploading}
                    />
                </label>
            )}
        </div>
    );
}

