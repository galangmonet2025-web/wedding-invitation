// IndexedDB-backed cache for proxied base64 images.
//
// Kenapa ada file ini:
// Gambar undangan di-proxy dari Google Drive menjadi data-URL base64 (lihat
// ProxyImage.tsx & Code.gs imageProxy). base64 itu besar; menyimpannya di
// localStorage cepat menembus kuota ~5MB per domain, sehingga setItem gagal
// diam-diam dan gambar selalu di-fetch ulang setiap kunjungan -> undangan
// terasa lambat walau sudah pernah dibuka.
//
// IndexedDB punya kuota jauh lebih besar (puluhan-ratusan MB), jadi cocok
// sebagai backing store untuk base64. Modul ini menyediakan akses async ke
// IndexedDB sekaligus meng-hydrate sebuah memory-cache sinkron supaya API lama
// (getCachedImage/setCachedImage di ProxyImage.tsx) tetap bisa sinkron.

const DB_NAME = 'invitation-image-cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') {
            resolve(null);
            return;
        }
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });

    return dbPromise;
}

export async function idbGet(key: string): Promise<string | null> {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get(key);
            req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

export async function idbSet(key: string, value: string): Promise<void> {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
            tx.onabort = () => resolve();
        } catch {
            resolve();
        }
    });
}

// Load every cached entry into a Map once, so the synchronous getCachedImage()
// can serve cache hits immediately on subsequent visits without awaiting IDB.
export async function idbGetAll(): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const db = await openDB();
    if (!db) return out;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    if (typeof cursor.value === 'string') {
                        out.set(String(cursor.key), cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(out);
                }
            };
            req.onerror = () => resolve(out);
        } catch {
            resolve(out);
        }
    });
}
