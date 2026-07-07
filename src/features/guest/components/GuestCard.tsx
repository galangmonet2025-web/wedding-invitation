import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Guest } from '@/types';
import {
    HiOutlineQrcode,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlinePhone,
    HiOutlineTag,
    HiOutlineUsers,
    HiOutlineHeart,
    HiOutlineGift,
    HiCheckCircle,
    HiCheck,
} from 'react-icons/hi';

// Truthy check tolerant of the GAS backend returning 'TRUE'/'true'/boolean.
const isTrue = (v: any) => v === true || String(v).toLowerCase() === 'true';

// Deterministic accent per category so the avatar has a stable, friendly color.
const CATEGORY_STYLE: Record<string, { ring: string; text: string; chip: string }> = {
    Family: { ring: 'from-rose-400 to-pink-500', text: 'text-rose-600', chip: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300' },
    Friends: { ring: 'from-sky-400 to-blue-500', text: 'text-sky-600', chip: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300' },
    Work: { ring: 'from-violet-400 to-indigo-500', text: 'text-violet-600', chip: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300' },
    VIP: { ring: 'from-amber-400 to-gold-500', text: 'text-amber-600', chip: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300' },
};
const fallbackStyle = { ring: 'from-gray-400 to-gray-500', text: 'text-gray-600', chip: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300' };

const STATUS_STYLE: Record<string, string> = {
    confirmed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    declined: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
};

interface GuestCardProps {
    guest: Guest;
    isSelected: boolean;
    /** True when bulk-select is possible (non-staff). */
    selectable: boolean;
    /** True when at least one card is already selected (selection mode is active). */
    selectionMode: boolean;
    onToggleSelect: () => void;
    isStaff: boolean;
    onQr: (g: Guest) => void;
    onEdit: (g: Guest) => void;
    onDelete: (g: Guest) => void;
}

const LONG_PRESS_MS = 400;

export function GuestCard({
    guest, isSelected, selectable, selectionMode, onToggleSelect, isStaff, onQr, onEdit, onDelete,
}: GuestCardProps) {
    const { t } = useTranslation();
    const cat = CATEGORY_STYLE[guest.category] || fallbackStyle;

    const wishDone = isTrue(guest.flag_sudah_isi_ucapan);
    const giftDone = isTrue(guest.flag_sudah_kirim_hadiah);

    // Long-press (press & hold) to start selecting / select this card. Once any
    // card is selected (selectionMode), a plain tap toggles select/unselect;
    // otherwise a plain tap opens the edit modal.
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressedRef = useRef(false);

    const clearTimer = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };

    const startPress = () => {
        if (!selectable) return;
        longPressedRef.current = false;
        clearTimer();
        timerRef.current = setTimeout(() => {
            longPressedRef.current = true;
            onToggleSelect(); // enter selection mode + (de)select this card
            // Haptic nudge on supported devices.
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(15);
        }, LONG_PRESS_MS);
    };

    const handleClick = () => {
        // A long-press already handled selection; swallow the trailing click.
        if (longPressedRef.current) { longPressedRef.current = false; return; }
        if (selectable && selectionMode) {
            onToggleSelect(); // in selection mode, tap toggles
            return;
        }
        if (!isStaff) onEdit(guest); // normal mode → open edit
    };

    return (
        <div
            onClick={handleClick}
            onPointerDown={startPress}
            onPointerUp={clearTimer}
            onPointerLeave={clearTimer}
            onPointerCancel={clearTimer}
            onContextMenu={(e) => { if (selectable) e.preventDefault(); }}
            style={{ touchAction: 'pan-y' }}
            className={`relative rounded-xl bg-white dark:bg-wedding-dark-card border p-3 transition-all select-none ${
                isSelected
                    ? 'border-gold-400 ring-2 ring-gold-400/30 shadow-sm'
                    : 'border-gray-100 dark:border-gray-800'
            } ${(!isStaff || selectable) ? 'active:scale-[0.99] cursor-pointer' : ''}`}
        >
            {/* Selection check — muncul di pojok saat card terpilih (pengganti avatar-check) */}
            {isSelected && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center shadow ring-2 ring-white dark:ring-wedding-dark-card">
                    <HiCheck className="w-3.5 h-3.5 text-white" />
                </span>
            )}

            {/* Top: name + code · status (tanpa avatar) */}
            <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight truncate">{guest.name}</p>
                    <span className="inline-block mt-0.5 font-mono text-[10px] tracking-wide text-gray-400">
                        {guest.invitation_code}
                    </span>
                </div>

                {/* Status pill — the primary at-a-glance signal */}
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[guest.status] || 'bg-gray-100 text-gray-600'}`}>
                    {t(`guests.status.${guest.status}`)}
                </span>
            </div>

            {/* Meta row: phone · category · headcount (icons instead of labels) */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300 min-w-0">
                    <HiOutlinePhone className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{guest.phone || '—'}</span>
                </span>
                <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-full ${cat.chip}`}>
                    <HiOutlineTag className="w-2.5 h-2.5" />
                    {guest.category}
                </span>
                <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
                    <HiOutlineUsers className="w-3 h-3 text-gray-400" />
                    {guest.number_of_guests} {t('guests.people', 'org')}
                </span>
            </div>

            {/* Bottom: wish/gift indicators + actions */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/60">
                <div className="flex items-center gap-1.5">
                    <Indicator done={wishDone} icon={<HiOutlineHeart className="w-3 h-3" />} label={t('dashboard.wishes', 'Ucapan')} />
                    <Indicator done={giftDone} icon={<HiOutlineGift className="w-3 h-3" />} label={t('dashboard.gifts', 'Hadiah')} />
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <ActionButton onClick={() => onQr(guest)} title={t('guests.qr_code', 'QR Code')} className="text-gold-600 bg-gold-50 dark:bg-gold-900/20">
                        <HiOutlineQrcode className="w-3.5 h-3.5" />
                    </ActionButton>
                    {!isStaff && (
                        <>
                            <ActionButton onClick={() => onEdit(guest)} title={t('common.edit', 'Ubah')} className="text-blue-600 bg-blue-50 dark:bg-blue-900/20">
                                <HiOutlinePencil className="w-3.5 h-3.5" />
                            </ActionButton>
                            <ActionButton onClick={() => onDelete(guest)} title={t('common.delete', 'Hapus')} className="text-red-500 bg-red-50 dark:bg-red-900/20">
                                <HiOutlineTrash className="w-3.5 h-3.5" />
                            </ActionButton>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function Indicator({ done, icon, label }: { done: boolean; icon: React.ReactNode; label: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                done
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500'
            }`}
            title={label}
        >
            {done ? <HiCheckCircle className="w-3 h-3" /> : icon}
            {label}
        </span>
    );
}

function ActionButton({ onClick, title, className, children }: {
    onClick: () => void; title: string; className: string; children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            aria-label={title}
            className={`w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform ${className}`}
        >
            {children}
        </button>
    );
}
