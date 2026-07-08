import { useEffect } from 'react';

/**
 * Setelah login di MOBILE kita ingin app masuk mode fullscreen. Namun
 * Fullscreen API browser HANYA boleh dipanggil dari sebuah user-gesture
 * (tap/klik) — tidak bisa otomatis saat halaman dimuat. Karena flow login
 * melakukan HARD RELOAD, gesture klik tombol Login hilang bersama reload.
 *
 * Solusinya: saat login sukses kita set flag di sessionStorage
 * (`FULLSCREEN_ON_LOGIN_KEY`), yang bertahan menembus reload. Hook ini
 * dipasang di layout admin dan menunggu TAP PERTAMA user; tap itulah gesture
 * valid yang memicu requestFullscreen. Flag hanya dibersihkan SETELAH
 * fullscreen benar-benar aktif — jadi kalau tap pertama ditolak/diabaikan,
 * tap berikutnya masih mencoba lagi.
 */
export const FULLSCREEN_ON_LOGIN_KEY = 'enterFullscreenOnLogin';

/** Set true di URL (?fsdebug=1) atau localStorage untuk melihat alasan gagal. */
function debugEnabled() {
    try {
        return (
            localStorage.getItem('fsDebug') === '1' ||
            /[?&#]fsdebug=1/.test(window.location.href)
        );
    } catch {
        return false;
    }
}
function dbg(...args: unknown[]) {
    if (!debugEnabled()) return;
    // eslint-disable-next-line no-console
    console.log('[fullscreen]', ...args);
    // Juga tampilkan di layar (toast kecil) agar bisa didiagnosa langsung di HP
    // tanpa chrome://inspect.
    // Saat fullscreen sedang AKTIF, jangan tampilkan kotak debug — ia menutupi
    // bagian bawah layar. (Log ke console tetap jalan.)
    if (document.fullscreenElement) {
        const existing = document.getElementById('fs-debug-box');
        if (existing) existing.remove();
        return;
    }
    try {
        let box = document.getElementById('fs-debug-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'fs-debug-box';
            box.style.cssText =
                'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;' +
                'background:rgba(0,0,0,.85);color:#0f0;font:12px/1.4 monospace;' +
                'padding:8px 10px;border-radius:8px;max-height:40vh;overflow:auto;white-space:pre-wrap';
            document.body.appendChild(box);
        }
        const line = args
            .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
            .join(' ');
        box.textContent = `${line}\n${box.textContent || ''}`.slice(0, 2000);
    } catch {
        /* ignore */
    }
}

/** Tandai bahwa fullscreen harus diminta pada interaksi berikutnya (dipanggil saat login sukses). */
export function requestFullscreenAfterLogin() {
    try {
        sessionStorage.setItem(FULLSCREEN_ON_LOGIN_KEY, '1');
    } catch {
        /* sessionStorage bisa gagal di private mode — abaikan diam-diam */
    }
}

/**
 * Deteksi perangkat mobile. Selain lebar viewport (yang bisa MELESET di HP
 * beresolusi tinggi / DPR besar — mis. 2800×1260 melapor innerWidth besar dan
 * dikira desktop), kita juga cek user-agent DAN kemampuan sentuh + tidak ada
 * pointer halus (mouse). Jadi tenant yang login dari HP layar lebar tetap
 * dikenali sebagai mobile. Diekspor agar redirect pasca-login memakai logika
 * deteksi yang sama.
 */
export const isMobileDevice = () =>
    typeof window !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent) ||
        window.matchMedia?.('(max-width: 1023px)').matches ||
        window.matchMedia?.('(pointer: coarse) and (hover: none)').matches ||
        navigator.maxTouchPoints > 1);

const isMobile = isMobileDevice;

type FsElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
};

/**
 * Coba masuk fullscreen. Mengembalikan Promise<boolean> — true bila permintaan
 * diterima (atau kita sudah fullscreen), false bila ditolak/tak didukung.
 */
function requestOn(el: FsElement): Promise<boolean> | null {
    const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
    if (!req) return null;
    try {
        const ret = req.call(el);
        return Promise.resolve(ret as Promise<void> | undefined)
            .then(() => true)
            .catch((err) => {
                dbg('requestFullscreen DITOLAK:', (err && err.message) || err);
                return false;
            });
    } catch (err) {
        dbg('requestFullscreen throw:', err);
        return Promise.resolve(false);
    }
}

function goFullscreen(): Promise<boolean> {
    if (document.fullscreenElement) return Promise.resolve(true);

    // Kalau browser secara eksplisit menonaktifkan fullscreen (Permissions-Policy,
    // dijalankan di dalam iframe tanpa allow="fullscreen", dsb.), requestFullscreen
    // akan selalu ditolak — catat supaya alasannya jelas saat debug.
    if (document.fullscreenEnabled === false) {
        dbg('document.fullscreenEnabled = false → fullscreen diblokir oleh browser/kebijakan');
    }

    // Prefer <html>, tapi sebagian WebView/Android hanya mengizinkan <body>.
    const html = requestOn(document.documentElement as FsElement);
    if (html === null) {
        dbg('Fullscreen API tidak tersedia di <html> — coba <body>');
        const body = requestOn(document.body as FsElement);
        if (body === null) { dbg('Fullscreen API tidak tersedia di browser ini'); return Promise.resolve(false); }
        return body.then((ok) => { dbg(ok ? 'fullscreen OK (body)' : 'fullscreen gagal (body)'); return ok; });
    }
    return html.then((ok) => {
        if (ok) { dbg('requestFullscreen OK (html)'); return true; }
        // <html> ditolak → coba <body> sekali sebagai fallback.
        const body = requestOn(document.body as FsElement);
        if (body === null) return false;
        return body.then((ok2) => { dbg(ok2 ? 'fullscreen OK (body-fallback)' : 'fullscreen gagal (body-fallback)'); return ok2; });
    });
}

export function useEnterFullscreenOnLogin() {
    useEffect(() => {
        let pending = false;
        try {
            pending = sessionStorage.getItem(FULLSCREEN_ON_LOGIN_KEY) === '1';
        } catch {
            pending = false;
        }

        dbg('mount', { pending, mobile: isMobile(), fsEnabled: document.fullscreenEnabled, ua: navigator.userAgent });

        if (!pending) return;

        // Di desktop kita tidak mau fullscreen — buang flag & selesai.
        if (!isMobile()) {
            dbg('dianggap desktop → batal fullscreen');
            try { sessionStorage.removeItem(FULLSCREEN_ON_LOGIN_KEY); } catch { /* ignore */ }
            return;
        }

        let done = false;

        const onGesture = () => {
            if (done) return;
            dbg('gesture terdeteksi → coba fullscreen');
            void goFullscreen().then((ok) => {
                if (ok) {
                    done = true;
                    try { sessionStorage.removeItem(FULLSCREEN_ON_LOGIN_KEY); } catch { /* ignore */ }
                    removeListeners();
                    dbg('fullscreen aktif, listener dilepas');
                } else {
                    // Gagal/ditolak: BIARKAN listener terpasang agar tap berikutnya
                    // mencoba lagi (bukan sekali-lalu-menyerah).
                    dbg('fullscreen gagal, menunggu tap berikutnya');
                }
            });
        };

        // Pakai touchstart (paling awal & andal di Android) + pointerdown + click.
        // TIDAK pakai { once:true } supaya bisa retry bila tap pertama ditolak.
        // capture:true → kita menerima gesture LEBIH DULU, sebelum handler lain
        // (mis. tombol/menu) yang bisa memanggil stopPropagation dan menelan tap.
        const opts: AddEventListenerOptions = { passive: true, capture: true };
        const addListeners = () => {
            window.addEventListener('touchstart', onGesture, opts);
            window.addEventListener('pointerdown', onGesture, opts);
            window.addEventListener('pointerup', onGesture, opts);
            window.addEventListener('click', onGesture, opts);
            window.addEventListener('keydown', onGesture, opts);
        };
        const removeListeners = () => {
            window.removeEventListener('touchstart', onGesture, opts);
            window.removeEventListener('pointerdown', onGesture, opts);
            window.removeEventListener('pointerup', onGesture, opts);
            window.removeEventListener('click', onGesture, opts);
            window.removeEventListener('keydown', onGesture, opts);
        };

        addListeners();
        dbg('listener gesture terpasang — menunggu tap pertama');
        return removeListeners;
    }, []);
}
