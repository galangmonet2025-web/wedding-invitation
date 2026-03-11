import { useState, useEffect } from 'react';

interface ProxyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
}

// Global memory cache
const memoryImageCache = new Map<string, string>();

// Helper to get from cache (memory or localstorage)
const getCachedImage = (key: string): string | null => {
    if (memoryImageCache.has(key)) return memoryImageCache.get(key)!;
    try {
        const stored = localStorage.getItem(`img_cache_${key}`);
        if (stored) {
            memoryImageCache.set(key, stored);
            return stored;
        }
    } catch { }
    return null;
};

// Helper to set cache
const setCachedImage = (key: string, base64Src: string) => {
    memoryImageCache.set(key, base64Src);
    try {
        localStorage.setItem(`img_cache_${key}`, base64Src);
    } catch {
        // localStorage might be full, that's fine, we fall back to memory
    }
};

export function ProxyImage({ src, ...props }: ProxyImageProps) {
    const [imgSrc, setImgSrc] = useState<string | null>(() => {
        if (!src) return null;
        if (src.includes('action=imageProxy') && !src.startsWith('data:')) {
            return getCachedImage(src);
        }
        return src;
    });
    const [loading, setLoading] = useState<boolean>(() => {
        if (!src) return false;
        if (src.includes('action=imageProxy') && !src.startsWith('data:')) {
            return !getCachedImage(src);
        }
        return false;
    });

    useEffect(() => {
        let isMounted = true;

        if (!src) {
            setImgSrc(null);
            return;
        }

        if (src.includes('action=imageProxy') && !src.startsWith('data:')) {
            const cached = getCachedImage(src);
            if (cached) {
                if (imgSrc !== cached) setImgSrc(cached);
                return;
            }

            setLoading(true);
            // Fetch proxy JSON
            fetch(src)
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data?.base64 && isMounted) {
                        const base64Src = `data:${data.data.mimeType};base64,${data.data.base64}`;
                        setCachedImage(src, base64Src);
                        setImgSrc(base64Src);
                    }
                })
                .catch(err => console.error("Failed to load proxied image:", err))
                .finally(() => {
                    if (isMounted) setLoading(false);
                });
        } else {
            setImgSrc(src);
        }

        return () => { isMounted = false; };
    }, [src]);

    if (loading && !imgSrc) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse ${props.className || ''}`}>
                <div className="w-6 h-6 border-[3px] border-gold-200 border-t-gold-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!imgSrc) return null;

    return <img src={imgSrc} {...props} />;
}
