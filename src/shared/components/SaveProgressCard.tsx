import { useEffect } from 'react';
import { HiCheck, HiX, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useSaveProgressStore } from '@/shared/store/saveProgressStore';
import type { SaveStepStatus } from '@/shared/store/saveProgressStore';

function StepIcon({ status }: { status: SaveStepStatus }) {
    if (status === 'done') {
        return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <HiCheck className="h-3.5 w-3.5" />
            </span>
        );
    }
    if (status === 'error') {
        return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white">
                <HiX className="h-3.5 w-3.5" />
            </span>
        );
    }
    if (status === 'active') {
        return (
            <span className="flex h-5 w-5 items-center justify-center">
                <span className="h-4 w-4 rounded-full border-2 border-gold-200 border-t-gold-500 animate-spin" />
            </span>
        );
    }
    if (status === 'skipped') {
        return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-[10px] text-gray-400">
                –
            </span>
        );
    }
    // pending
    return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-700" />
    );
}

/**
 * Floating progress card, pinned bottom-right. Driven entirely by
 * useSaveProgressStore. Meant for multi-step flows (currently the theme save)
 * that want to show what's happening step-by-step instead of a full-screen
 * blocking overlay. Mount once near the app root.
 */
export function SaveProgressCard() {
    const { visible, title, steps, outcome, reset } = useSaveProgressStore();

    // Auto-dismiss a little after the flow settles.
    useEffect(() => {
        if (!visible || outcome === 'running') return;
        const ms = outcome === 'success' ? 2200 : 6000;
        const t = setTimeout(() => reset(), ms);
        return () => clearTimeout(t);
    }, [visible, outcome, reset]);

    if (!visible) return null;

    const accent =
        outcome === 'success'
            ? 'border-emerald-400/60'
            : outcome === 'error'
            ? 'border-red-400/60'
            : 'border-gold-300/60';

    return (
        <div className="fixed bottom-4 right-4 z-[10001] w-[min(92vw,22rem)] animate-fade-in">
            <div
                className={`rounded-2xl border ${accent} bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl overflow-hidden`}
            >
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        {outcome === 'running' && (
                            <span className="h-4 w-4 rounded-full border-2 border-gold-200 border-t-gold-500 animate-spin" />
                        )}
                        {outcome === 'success' && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                                <HiCheck className="h-3.5 w-3.5" />
                            </span>
                        )}
                        {outcome === 'error' && (
                            <HiOutlineExclamationCircle className="h-5 w-5 text-red-500" />
                        )}
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {outcome === 'success'
                                ? `${title} — selesai`
                                : outcome === 'error'
                                ? `${title} — gagal`
                                : title}
                        </h3>
                    </div>
                    {outcome !== 'running' && (
                        <button
                            type="button"
                            onClick={reset}
                            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                            aria-label="Tutup"
                        >
                            <HiX className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <ul className="px-4 pb-3 space-y-2.5">
                    {steps.map((s) => (
                        <li key={s.key} className="flex items-start gap-2.5">
                            <span className="mt-0.5">
                                <StepIcon status={s.status} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p
                                    className={`text-[13px] leading-tight ${
                                        s.status === 'pending'
                                            ? 'text-gray-400 dark:text-gray-500'
                                            : s.status === 'error'
                                            ? 'text-red-600 dark:text-red-400 font-medium'
                                            : 'text-gray-800 dark:text-gray-100'
                                    }`}
                                >
                                    {s.label}
                                </p>
                                {s.detail && (
                                    <p className="text-[11px] leading-tight text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                        {s.detail}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
