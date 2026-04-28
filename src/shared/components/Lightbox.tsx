import React from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineX, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import { ProxyImage } from './ProxyImage';

interface LightboxProps {
    images: { 
        url: string; 
        caption?: string;
        file_name?: string;
        width?: number;
        height?: number;
        size_kb?: number;
    }[];
    initialIndex?: number;
    onClose: () => void;
}

export function Lightbox({ images, initialIndex = 0, onClose }: LightboxProps) {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

    const next = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    React.useEffect(() => {
        document.documentElement.classList.add('lightbox-open');
        document.body.classList.add('lightbox-open');
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev + 1) % images.length);
            if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.documentElement.classList.remove('lightbox-open');
            document.body.classList.remove('lightbox-open');
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [images.length, onClose]);

    if (images.length === 0) return null;

    const portalRoot = document.getElementById('lightbox-root') || document.body;
    const currentImg = images[currentIndex];

    return createPortal(
        <div 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                width: '100vw', 
                height: '100vh',
                zIndex: 2147483647,
                backgroundColor: 'rgba(0, 0, 0, 0.8)', // Semi-transparent dark
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(12px)', // Premium blur effect
                WebkitBackdropFilter: 'blur(12px)',
                overflow: 'hidden'
            }}
            className="animate-fade-in"
        >
            {/* Backdrop Area (Clickable) */}
            <div 
                className="absolute inset-0 cursor-pointer"
                onClick={onClose}
            />
            
            <button
                onClick={onClose}
                style={{ zIndex: 2147483647 }}
                className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm border border-white/10 shadow-2xl active:scale-90"
                title="Tutup (Esc)"
            >
                <HiOutlineX className="w-8 h-8" />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-6 z-[100000] p-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm border border-white/10 group"
                    >
                        <HiOutlineChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-6 z-[100000] p-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-sm border border-white/10 group"
                    >
                        <HiOutlineChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                    </button>
                </>
            )}

            <div 
                className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative group overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
                    <ProxyImage
                        src={currentImg.url}
                        alt={currentImg.caption || currentImg.file_name || "Lightbox image"}
                        className="max-w-full max-h-[75vh] object-contain select-none"
                    />
                </div>
                
                <div className="mt-6 flex flex-col items-center animate-slide-up text-center">
                    {(currentImg.caption || currentImg.file_name) && (
                        <p className="text-white text-lg font-medium drop-shadow-md">
                            {currentImg.caption || currentImg.file_name}
                        </p>
                    )}
                    
                    {(currentImg.width || currentImg.size_kb) && (
                        <p className="text-white/50 text-xs mt-1 font-mono uppercase tracking-widest">
                            {currentImg.width && `${currentImg.width}x${currentImg.height}`}
                            {currentImg.size_kb && ` • ${currentImg.size_kb} KB`}
                        </p>
                    )}

                    {images.length > 1 && (
                        <div className="mt-4 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                            <p className="text-white/80 text-sm font-medium">
                                {currentIndex + 1} <span className="mx-1 text-white/30">/</span> {images.length}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        portalRoot
    );
}
