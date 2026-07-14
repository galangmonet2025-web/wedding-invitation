// Safe localStorage helpers + a one-time purge of legacy oversized entries.
//
// Kenapa ada file ini:
// Build lama sempat menyimpan base64 gambar (dan cache tema) langsung di
// localStorage. Data itu masih tertinggal di browser sebagian user dan
// memenuhi kuota ~5MB, sehingga SETIAP localStorage.setItem berikutnya —
// bahkan hanya menyimpan preferensi kecil seperti 'manageThemesViewMode' —
// melempar QuotaExceededError dan mematikan seluruh halaman.
//
// Solusi dua lapis:
//  1. safeSetItem/safeGetItem: pembungkus try/catch supaya kegagalan storage
//     tidak pernah menjatuhkan aplikasi.
//  2. purgeLegacyStorageBlobs(): sekali saat startup, hapus entri besar/legacy
//     agar kuota kembali kosong untuk preferensi kecil.

export function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function safeSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Kuota penuh / storage dinonaktifkan (private mode). Coba bersihkan
        // sisa blob legacy lalu tulis ulang sekali; kalau tetap gagal, abaikan.
        try {
            purgeLegacyStorageBlobs();
            localStorage.setItem(key, value);
        } catch {
            /* ignore — biarkan preferensi hanya hidup di memori */
        }
    }
}

// Kunci-kunci preferensi kecil yang memang sengaja kita simpan. Apa pun di luar
// daftar ini yang berukuran besar dianggap sampah build lama dan boleh dihapus.
const KNOWN_SMALL_KEYS = new Set<string>([
    'manageThemesViewMode',
    'sidebar_collapsed',
    'wedding-saas-theme',
    'website-config-show-preview',
    'theme-editor-show-preview',
    'theme-editor-layout-mode',
]);

// Entri lebih besar dari ini hampir pasti base64/cache tema dari build lama.
const LEGACY_BLOB_THRESHOLD = 50 * 1024; // 50KB

let purged = false;

// Bersihkan entri localStorage besar yang bukan preferensi kecil kita. Dipanggil
// sekali saat startup (dan sebagai fallback saat setItem gagal). Idempoten.
export function purgeLegacyStorageBlobs(): void {
    if (purged) return;
    purged = true;
    try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (KNOWN_SMALL_KEYS.has(key)) continue;
            const val = localStorage.getItem(key);
            if (val && val.length > LEGACY_BLOB_THRESHOLD) {
                toRemove.push(key);
            }
        }
        toRemove.forEach((key) => {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
        });
    } catch {
        /* localStorage tidak tersedia — tidak ada yang perlu dibersihkan */
    }
}
