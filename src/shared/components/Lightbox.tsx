import React from 'react';
import { HiOutlineX, HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi';
import { ProxyImage } from './ProxyImage';

interface LightboxProps {
    images: { url: string; caption?: string }[];
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

    if (images.length === 0) return null;

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-[101] p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
            >
                <HiOutlineX className="w-6 h-6" />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-4 z-[101] p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
                    >
                        <HiOutlineChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 z-[101] p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
                    >
                        <HiOutlineChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            <div 
                className="relative max-w-5xl max-h-[90vh] w-full px-12 flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                <ProxyImage
                    src={images[currentIndex].url}
                    alt={images[currentIndex].caption || "Lightbox image"}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
                {images[currentIndex].caption && (
                    <p className="text-white mt-4 text-center text-lg font-medium">
                        {images[currentIndex].caption}
                    </p>
                )}
                {images.length > 1 && (
                    <p className="text-white/50 text-sm mt-2">
                        {currentIndex + 1} / {images.length}
                    </p>
                )}
            </div>
        </div>
    );
}
