import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineX } from 'react-icons/hi';

interface GlassModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    /** Max width of the card. Defaults to a phone-friendly narrow width. */
    maxWidth?: string;
}

/**
 * Frosted-glass modal shell for the guest-facing invitation dialogs (QR card,
 * "isi data kehadiran" form). Deliberately CHROME-LESS: no built-in title bar —
 * the content owns its own header — so each dialog can be redesigned end to end.
 *
 * Look: heavily blurred translucent backdrop + a semi-transparent glass card
 * (backdrop-blur, subtle white/dark tint, hairline border, soft shadow). Simple
 * and elegant; works in light & dark. Only a floating close button is provided.
 */
export function GlassModal({ isOpen, onClose, children, maxWidth = 'max-w-[360px]' }: GlassModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.addEventListener('keydown', onKey);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            {/* Blurred translucent backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-xl animate-fade-in"
                onClick={onClose}
            />

            {/* Glass card */}
            <div
                className={`relative w-full ${maxWidth} my-auto animate-slide-up`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Floating close button */}
                <button
                    onClick={onClose}
                    aria-label="Tutup"
                    className="absolute -top-3 -right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-600 dark:text-gray-300 ring-1 ring-black/5 dark:ring-white/10 shadow-lg transition-all hover:bg-white dark:hover:bg-gray-700 active:scale-90"
                >
                    <HiOutlineX className="w-4 h-4" />
                </button>

                <div className="relative rounded-[26px] overflow-hidden bg-white/70 dark:bg-gray-900/60 backdrop-blur-2xl ring-1 ring-white/40 dark:ring-white/10 shadow-2xl shadow-black/30">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
