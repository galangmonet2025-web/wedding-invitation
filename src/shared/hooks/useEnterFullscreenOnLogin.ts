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

const isMobile = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(max-width: 1023px)').matches ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

type FsElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
};

/**
 * Coba masuk fullscreen. Mengembalikan Promise<boolean> — true bila permintaan
 * diterima (atau kita sudah fullscreen), false bila ditolak/tak didukung.
 */
function goFullscreen(): Promise<boolean> {
    if (document.fullscreenElement) return Promise.resolve(true);

    // Prefer <html>, tapi sebagian WebView Android hanya mengizinkan <body>.
    const el = document.documentElement as FsElement;
    const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;

    if (!req) {
        dbg('Fullscreen API tidak tersedia di browser ini');
        return Promise.resolve(false);
    }

    try {
        const ret = req.call(el);
        return Promise.resolve(ret as Promise<void> | undefined)
            .then(() => {
                dbg('requestFullscreen OK');
                return true;
            })
            .catch((err) => {
                dbg('requestFullscreen DITOLAK:', err?.message || err);
                return false;
            });
    } catch (err) {
        dbg('requestFullscreen throw:', err);
        return Promise.resolve(false);
    }
}

export function useEnterFullscreenOnLogin() {
    useEffect(() => {
        let pending = false;
        try {
            pending = sessionStorage.getItem(FULLSCREEN_ON_LOGIN_KEY) === '1';
        } catch {
            pending = false;
        }

        dbg('mount', { pending, mobile: isMobile(), ua: navigator.userAgent });

        if (!pending) return;

        // Di desktop kita tidak mau fullscreen — buang flag & selesai.
        if (!isMobile()) {
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
        const opts: AddEventListenerOptions = { passive: true };
        const addListeners = () => {
            window.addEventListener('touchstart', onGesture, opts);
            window.addEventListener('pointerdown', onGesture, opts);
            window.addEventListener('click', onGesture, opts);
        };
        const removeListeners = () => {
            window.removeEventListener('touchstart', onGesture, opts);
            window.removeEventListener('pointerdown', onGesture, opts);
            window.removeEventListener('click', onGesture, opts);
        };

        addListeners();
        return removeListeners;
    }, []);
}
