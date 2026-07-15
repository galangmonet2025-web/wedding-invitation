import { useState, useEffect } from 'react';
import { HiCheck, HiCalendar, HiLocationMarker, HiClock } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { GlassModal } from './GlassModal';

interface RSVPSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        title: string;
        date: string;
        time: string;
        location: string;
        calendarUrl: string;
    } | null;
}

/**
 * RSVP-success dialog with the "save to Google Calendar" action.
 *
 * Styled to match the guest-facing glass dialogs (QR card / "isi data kehadiran"):
 * frosted GlassModal shell + centered header + gold hairline + glass detail rows.
 * The old heavy green gradient header band was replaced by a soft emerald success
 * badge so the dialog reads as the same family as the rest of the invitation UI.
 */
export function RSVPSuccessModal({ isOpen, onClose, data }: RSVPSuccessModalProps) {
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !data || !mounted || typeof document === 'undefined' || !document.body) return null;

    const rows = [
        { Icon: HiCalendar, label: t('modals.rsvp_success.event'), value: data.title },
        { Icon: HiClock, label: t('modals.rsvp_success.time'), value: `${data.date}, ${data.time}` },
        { Icon: HiLocationMarker, label: t('modals.rsvp_success.location'), value: data.location },
    ];

    return (
        <GlassModal isOpen={isOpen} onClose={onClose}>
            <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center">
                {/* Success badge */}
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/25">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-900/20">
                        <HiCheck className="w-5 h-5 text-white" />
                    </span>
                </span>

                {/* Header */}
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    {t('modals.rsvp_success.title')}
                </h3>
                <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {t('modals.rsvp_success.description')}
                </p>
                <span className="mt-4 h-px w-10 bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

                {/* Event details — glass rows */}
                <div className="mt-5 w-full rounded-2xl bg-white/50 dark:bg-white/5 ring-1 ring-gray-200/70 dark:ring-white/10 divide-y divide-gray-200/60 dark:divide-white/10 text-left overflow-hidden">
                    {rows.map(({ Icon, label, value }) => (
                        <div key={label} className="flex items-start gap-3 px-4 py-3">
                            <Icon className="w-4 h-4 text-gold-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                                    {label}
                                </p>
                                <p className="mt-0.5 text-[13px] font-semibold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">
                                    {value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Google Calendar CTA */}
                <a
                    href={data.calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 w-full py-3 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 ring-1 ring-[#4285F4]/40 text-[#4285F4] dark:text-blue-300 font-semibold text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <HiCalendar className="w-[18px] h-[18px]" />
                    {t('modals.rsvp_success.save_calendar')}
                </a>

                <button
                    onClick={onClose}
                    className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    {t('common.close')}
                </button>
            </div>
        </GlassModal>
    );
}
