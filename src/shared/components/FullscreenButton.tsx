import { useEffect, useState } from 'react';
import { HiOutlineArrowsExpand } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';

type FsElement = HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    mozRequestFullScreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
};
type FsDocument = Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
    mozFullScreenElement?: Element | null;
    mozCancelFullScreen?: () => Promise<void> | void;
    msFullscreenElement?: Element | null;
    msExitFullscreen?: () => Promise<void> | void;
};

function currentFullscreenEl(): Element | null {
    const d = document as FsDocument;
    return (
        d.fullscreenElement ||
        d.webkitFullscreenElement ||
        d.mozFullScreenElement ||
        d.msFullscreenElement ||
        null
    );
}

function enterFullscreen(): void {
    const el = document.documentElement as FsElement;
    const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
    // Fallback ke <body> untuk sebagian WebView Android yang hanya mengizinkannya.
    if (req) { try { void req.call(el); return; } catch { /* coba body */ } }
    const body = document.body as FsElement;
    const bReq =
        body.requestFullscreen ||
        body.webkitRequestFullscreen ||
        body.mozRequestFullScreen ||
        body.msRequestFullscreen;
    if (bReq) { try { void bReq.call(body); } catch { /* menyerah diam-diam */ } }
}

function exitFullscreen(): void {
    const d = document as FsDocument;
    const exit =
        d.exitFullscreen ||
        d.webkitExitFullscreen ||
        d.mozCancelFullScreen ||
        d.msExitFullscreen;
    if (exit) { try { void exit.call(d); } catch { /* abaikan */ } }
}

/**
 * Tombol toggle fullscreen manual. Berguna di HP yang tidak masuk fullscreen
 * otomatis pasca-login (mis. gesture pertama tak tertangkap, atau Fullscreen API
 * ditolak sekali). Ikon + tooltip menyesuaikan status fullscreen saat ini.
 *
 * Memakai class `admin-icon-btn` agar tampil identik dengan ikon toolbar header
 * di AdminLayout (mis. "Buka Undangan"), sehingga pas diletakkan bersebelahan.
 */
export function FullscreenButton({ className = 'admin-icon-btn' }: { className?: string }) {
    const { t } = useTranslation();
    const [isFs, setIsFs] = useState<boolean>(() => !!currentFullscreenEl());

    useEffect(() => {
        const sync = () => setIsFs(!!currentFullscreenEl());
        const events = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        events.forEach((e) => document.addEventListener(e, sync));
        return () => events.forEach((e) => document.removeEventListener(e, sync));
    }, []);

    const toggle = () => {
        if (currentFullscreenEl()) exitFullscreen();
        else enterFullscreen();
    };

    const label = isFs
        ? t('topbar.exit_fullscreen', 'Keluar Layar Penuh')
        : t('topbar.enter_fullscreen', 'Layar Penuh');

    return (
        <button
            type="button"
            onClick={toggle}
            className={`${className}${isFs ? ' is-fs-active' : ''}`}
            title={label}
            aria-label={label}
            aria-pressed={isFs}
        >
            <HiOutlineArrowsExpand className="w-5 h-5 transition-colors" />
        </button>
    );
}
