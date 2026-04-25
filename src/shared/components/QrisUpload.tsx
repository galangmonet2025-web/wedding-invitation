import { useState, useCallback, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { HiOutlineUpload, HiOutlineTrash, HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { imageApi } from '@/core/api/imageApi';
import { useBackgroundTaskStore } from '../store/backgroundTaskStore';
import type { ImageRecord } from '@/types';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { detectQRCodeBounds } from '../utils/detectQRCode';
import { ProxyImage } from './ProxyImage';
import { Lightbox } from '@/shared/components/Lightbox';

interface QrisUploadProps {
    imageType: string;
    title: string;
    description?: string;
    currentImageUrl?: string | null;
    onUploadSuccess: (cdnUrl: string) => void;
    onDeleteSuccess: () => void;
}

export function QrisUpload({
    imageType,
    title,
    description,
    currentImageUrl,
    onUploadSuccess,
    onDeleteSuccess
}: QrisUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const { addTask, updateTask, tasks } = useBackgroundTaskStore();

    // Cropper State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
    const [isDetecting, setIsDetecting] = useState(false);
    const [initialCropArea, setInitialCropArea] = useState<any>(undefined);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Clean up URLs
    useEffect(() => {
        return () => {
            if (imageSrc) URL.revokeObjectURL(imageSrc);
        };
    }, [imageSrc]);


    // Handle File Selection (Pre-Crop)
    const handleFileSelect = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        const file = Array.isArray(files) ? files[0] : files[0];

        if (!file.type.startsWith('image/')) {
            toast.error(`File "${file.name}" bukan gambar yang valid.`);
            return;
        }

        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        
        setIsDetecting(true);
        setImageSrc(url);
        
        // Reset base state
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setInitialCropArea(undefined);

        // Auto detect QR
        const bounds = await detectQRCodeBounds(url);
        if (bounds) {
            setInitialCropArea(bounds);
            toast.success("QR Code terdeteksi! Posisi crop telah disesuaikan otomatis.");
        } else {
            toast.error("Tidak dapat mendeteksi bingkai QR secara otomatis. Silakan sesuaikan manual.", { id: 'qr-fail' });
        }
        
        setIsDetecting(false);
    };

    const onCropAreaChange = useCallback((_: any, croppedPixels: any) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    // Handle Upload Crop Result
    const handleCropSave = async () => {
        try {
            if (!imageSrc || !croppedAreaPixels || !selectedFile) return;

            setUploading(true);
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
            
            if (!croppedFile) {
                toast.error("Gagal melakukan crop gambar.");
                setUploading(false);
                return;
            }

            // Close modal
            setImageSrc(null);

            const fileToUpload = new File([croppedFile], `${selectedFile.name.replace(/\.[^/.]+$/, "")}_qris.webp`, { type: 'image/webp' });

            const taskId = `upload-${imageType}-${Date.now()}`;
            addTask({
                id: taskId,
                name: `Upload QRIS: ${title}`,
                total: 1
            });

            const options = {
                maxSizeMB: 0.15,
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/webp'
            };

            const compressedFile = await imageCompression(fileToUpload, options);
            
            const getDimensions = (): Promise<{ w: number, h: number }> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve({ w: img.width, h: img.height });
                    img.src = URL.createObjectURL(compressedFile);
                });
            };
            const dims = await getDimensions();

            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onload = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                
                try {
                    const response = await imageApi.uploadImage({
                        image_type: imageType,
                        file_name: fileToUpload.name,
                        base64_data: base64Data,
                        mime_type: 'image/webp',
                        width: dims.w,
                        height: dims.h,
                        size_kb: Math.round(compressedFile.size / 1024)
                    }, { skipLoader: true } as any);

                    if (response.success && response.data) {
                        onUploadSuccess(response.data.cdn_url || response.data.drive_url);
                        updateTask(taskId, { successCount: 1, failCount: 0, progress: 100, status: 'success' });
                    } else {
                        updateTask(taskId, { successCount: 0, failCount: 1, progress: 100, status: 'error' });
                        toast.error("Gagal mengupload QRIS.");
                    }
                } catch (err: any) {
                    toast.error(err.message || "Gagal mengupload QRIS.");
                    updateTask(taskId, { successCount: 0, failCount: 1, progress: 100, status: 'error' });
                }
            };
            
        } catch (e: any) {
            console.error(e);
            toast.error("Terjadi kesalahan.");
        } finally {
            setUploading(false);
            setSelectedFile(null);
            setCroppedAreaPixels(null);
            setMediaSize({ width: 0, height: 0 });
        }
    };

    const handleDelete = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        setDeleting(true);
        onDeleteSuccess();
        setDeleting(false);
        setShowDeleteModal(false);
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
            handleFileSelect(e.dataTransfer.files);
        }
    }, []);


    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                    {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
                </div>
            </div>

            {currentImageUrl ? (
                <div className="w-full relative group">
                    <div className="relative w-40 h-40 max-w-[200px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <ProxyImage
                            src={currentImageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                        {/* Clickable Overlay for Lightbox */}
                        <div
                            className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-0"
                            onClick={() => setIsLightboxOpen(true)}
                        >
                            <div className="bg-white/90 dark:bg-black/50 p-2 rounded-full backdrop-blur-sm shadow-sm">
                                <HiOutlinePhotograph className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </div>
                        </div>
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs z-10"
                            title="Hapus gambar"
                        >
                            {deleting ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <HiOutlineTrash className="w-3.5 h-3.5" />
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                     <p className="text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                         <strong>Info:</strong> Silakan upload foto screenshot QRIS yang valid. Nantinya Anda dapat memotong (crop) hanya pada area kotak QRIS sebelum gambar disimpan, agar tamu dapat men-scan kode tersebut dengan mudah.
                     </p>
                    <label
                        className={`relative flex flex-col items-center justify-center w-full min-h-[160px] rounded-xl border-2 border-dashed transition-all cursor-pointer
                            ${dragActive ? 'border-gold-500 bg-gold-50/50 dark:bg-gold-500/10' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500'}
                            ${tasks.some(t => t.status === 'running' && t.id.startsWith(`upload-${imageType}`)) ? 'opacity-50 cursor-not-allowed pointer-events-none grayscale' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                            {(() => {
                                const isCurrentlyUploading = tasks.some(t => t.status === 'running' && t.id.startsWith(`upload-${imageType}`));
                                
                                if (uploading || isCurrentlyUploading) {
                                    return (
                                        <>
                                            <div className="w-6 h-6 border-[3px] border-gold-200 border-t-gold-500 rounded-full animate-spin mb-2" />
                                            <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                Sedang mengupload...
                                            </p>
                                        </>
                                    );
                                }

                                return (
                                    <>
                                        <div className="flex items-end justify-center mb-4 gap-2 opacity-50">
                                             <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded border-2 border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center p-1">
                                                 <div className="w-full h-full border border-gray-400 border-dashed rounded relative">
                                                    <div className="absolute top-1 left-1 w-2 h-2 border-tl border-gray-500"></div>
                                                    <div className="absolute top-1 right-1 w-2 h-2 border-tr border-gray-500"></div>
                                                    <div className="absolute bottom-1 left-1 w-2 h-2 border-bl border-gray-500"></div>
                                                    <div className="absolute bottom-1 right-1 w-2 h-2 border-br border-gray-500"></div>
                                                 </div>
                                             </div>
                                        </div>
                                        <div className="p-2 bg-gold-50 dark:bg-gold-900/20 rounded-full text-gold-500 mb-2">
                                            <HiOutlineUpload className="w-5 h-5" />
                                        </div>
                                        <p className="mb-0.5 text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-semibold text-gold-600 dark:text-gold-400">Pilih foto QRIS</span> atau seret kesini
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                            Format: JPG, PNG, WEBP (Max 5MB)
                                        </p>
                                    </>
                                );
                            })()}
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg, image/png, image/webp"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    handleFileSelect(e.target.files);
                                    e.target.value = ''; // reset
                                }
                            }}
                            disabled={uploading || tasks.some(t => t.status === 'running' && t.id.startsWith(`upload-${imageType}`))}
                        />
                    </label>
                </div>
            )}

            {/* Modal Crop */}
            {imageSrc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Header Modal */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Crop Area QRIS</h3>
                                <p className="text-xs text-gray-500">Atur kotak pembatas persis mengelilingi kode QR.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setImageSrc(null);
                                    setSelectedFile(null);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Modal */}
                        <div className="flex flex-col lg:flex-row flex-1 min-h-[400px] overflow-auto">
                            {/* Kiri: Cropper Area */}
                            <div className="relative w-full lg:w-1/2 h-[400px] lg:h-auto bg-gray-100 dark:bg-black/50 border-r border-gray-100 dark:border-gray-800 flex items-center justify-center">
                                {isDetecting ? (
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-gold-500 animate-spin mb-3" />
                                        <p className="text-sm font-medium">Mendeteksi Posisi QRIS...</p>
                                    </div>
                                ) : (
                                    <>
                                        <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropAreaChange={onCropAreaChange}
                                    onZoomChange={setZoom}
                                            onMediaLoaded={(media) => setMediaSize({ width: media.naturalWidth, height: media.naturalHeight })}
                                            initialCroppedAreaPixels={initialCropArea}
                                        />
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] max-w-sm flex items-center gap-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-4 py-3 rounded-full shadow-lg">
                                            <button 
                                                type="button"
                                                onClick={() => setZoom(z => Math.max(1, z - 0.1))}
                                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                                            >
                                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">-</span>
                                            </button>
                                            <input
                                                type="range"
                                                value={zoom}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                aria-labelledby="Zoom"
                                                onChange={(e) => setZoom(Number(e.target.value))}
                                                className="flex-1 accent-gold-500"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                                            >
                                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">+</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Kanan: Preview Box */}
                            <div className="w-full lg:w-1/2 p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
                                <h4 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">Hasil Pemotongan (Preview)</h4>
                                
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-[256px] flex flex-col items-center justify-center aspect-square flex-shrink-0">
                                    {imageSrc && croppedAreaPixels && mediaSize.width > 0 ? (
                                        <div className="relative w-full h-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                                            <img
                                                src={imageSrc}
                                                alt="Crop Preview"
                                                style={{
                                                    maxWidth: 'none',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: `${(mediaSize.width / croppedAreaPixels.width) * 100}%`,
                                                    height: `${(mediaSize.height / croppedAreaPixels.height) * 100}%`,
                                                    transform: `translate(-${(croppedAreaPixels.x / mediaSize.width) * 100}%, -${(croppedAreaPixels.y / mediaSize.height) * 100}%)`
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-gray-400 animate-spin mb-2" />
                                            <span className="text-xs">Memuat preview...</span>
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-center text-gray-500 mt-6 max-w-sm">
                                    Pastikan hasil potong terlihat jelas, tidak blur, dan fokus hanya pada bagian QR code tanpa ornamen berlebih.
                                </p>
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-white dark:bg-gray-900">
                            <button
                                onClick={() => {
                                    setImageSrc(null);
                                    setSelectedFile(null);
                                }}
                                className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCropSave}
                                disabled={uploading || !croppedAreaPixels}
                                className="px-5 py-2 text-sm font-medium text-white bg-gold-600 hover:bg-gold-700 rounded-lg transition-colors disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                            >
                                {uploading ? (
                                     <>
                                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                         Menyimpan...
                                     </>
                                ) : (
                                    'Simpan QRIS & Upload'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLightboxOpen && currentImageUrl && (
                <Lightbox 
                    images={[{ url: currentImageUrl }]} 
                    onClose={() => setIsLightboxOpen(false)} 
                />
            )}

            {/* Modal Konfirmasi Hapus */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl max-w-sm w-full text-center border border-gray-100 dark:border-gray-700">
                        <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HiOutlineTrash className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Hapus QRIS?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-2">
                            Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus gambar QRIS ini?
                        </p>
                        <div className="flex gap-3 justify-center w-full">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
                            >
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
