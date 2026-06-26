import { useState, useEffect } from 'react';
import { idbGet, idbSet, idbGetAll } from '@/shared/utils/imageCacheDB';

interface ProxyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
}

// Global memory cache. This is the synchronous source of truth; the IndexedDB
// store below is the durable backing store that survives reloads and (unlike
// localStorage) doesn't blow its quota after a few base64 photos. We hydrate
// IndexedDB into this Map once at startup so getCachedImage() stays synchronous.
const memoryImageCache = new Map<string, string>();

// Hydrate the memory cache from IndexedDB as early as possible so repeat
// visitors get instant cache hits without re-downloading every image.
let hydrationPromise: Promise<void> | null = null;
export const hydrateImageCache = (): Promise<void> => {
    if (hydrationPromise) return hydrationPromise;
    hydrationPromise = idbGetAll().then((entries) => {
        entries.forEach((value, key) => {
            if (!memoryImageCache.has(key)) memoryImageCache.set(key, value);
        });
    }).catch(() => { });
    return hydrationPromise;
};
// Kick off hydration on module load.
hydrateImageCache();

// Helper to get from cache (memory only — synchronous). IndexedDB is hydrated
// into memoryImageCache at startup via hydrateImageCache(); the async path in
// fetchProxyImageBase64() also consults IndexedDB directly as a fallback.
export const getCachedImage = (key: string): string | null => {
    if (memoryImageCache.has(key)) return memoryImageCache.get(key)!;
    return null;
};

// Helper to set cache. Writes to memory immediately (sync) and persists to
// IndexedDB in the background (async, fire-and-forget). We no longer use
// localStorage for base64 blobs — its ~5MB quota is too small and silent
// setItem failures were defeating the cache entirely.
export const setCachedImage = (key: string, base64Src: string) => {
    memoryImageCache.set(key, base64Src);
    void idbSet(key, base64Src);
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

            const fetchWithRetry = async (url: string, retries = 3): Promise<void> => {
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    
                    const data = await res.text();
                    if (data.startsWith('data:image')) {
                        if (isMounted) {
                            setCachedImage(url, data);
                            setImgSrc(data);
                            setLoading(false);
                        }
                    } else {
                        // If it's not a data URL, it might be an error message from GAS
                        throw new Error("Invalid image data received");
                    }
                } catch (err) {
                    if (retries > 0 && isMounted) {
                        console.warn(`Retrying image load (${retries} left): ${url}`);
                        setTimeout(() => fetchWithRetry(url, retries - 1), 2000); // Wait 2s before retry
                    } else {
                        console.error("Failed to load proxied image after retries:", err);
                        if (isMounted) setLoading(false);
                    }
                }
            };

            // Check the durable IndexedDB store before hitting the network — the
            // entry may exist there but not yet be hydrated into the memory map.
            void idbGet(src).then((persisted) => {
                if (!isMounted) return;
                if (persisted) {
                    memoryImageCache.set(src, persisted);
                    setImgSrc(persisted);
                    setLoading(false);
                } else {
                    fetchWithRetry(src);
                }
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

export async function fetchProxyImageBase64(src: string): Promise<string> {
    if (!src || !src.includes('action=imageProxy') || src.startsWith('data:')) {
        return src;
    }
    // 1. Synchronous memory hit (fast path for already-hydrated entries).
    const cached = getCachedImage(src);
    if (cached) return cached;

    // 2. Async IndexedDB hit — covers entries not yet pulled into memory by
    //    hydrateImageCache() (e.g. first fetch right after page load).
    const persisted = await idbGet(src);
    if (persisted) {
        memoryImageCache.set(src, persisted);
        return persisted;
    }

    try {
        const res = await fetch(src);
        const data = await res.text();
        if (data.startsWith('data:image')) {
            setCachedImage(src, data);
            return data;
        }
    } catch (err) {
        console.error("Failed to fetch proxy image:", err);
    }
    return src; // fallback
}
