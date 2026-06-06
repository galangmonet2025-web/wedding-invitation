import React, { useEffect, useState } from 'react';
import { HiOutlineTrash, HiOutlineExclamationCircle } from 'react-icons/hi';
import { Modal } from './Modal';
import { Button } from './Button';

export type ConfirmVariant = 'danger' | 'primary';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    /** Main confirmation message. Can be a string or rich content. */
    message: React.ReactNode;
    /** Smaller secondary line under the message (e.g. "cannot be undone"). */
    description?: React.ReactNode;
    variant?: ConfirmVariant;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Show a spinner on the confirm button and block the dialog. */
    loading?: boolean;
    /** Heading shown inside the warning box. Defaults to a sensible value per variant. */
    warningTitle?: string;
    /** Custom icon for the warning box. Defaults to trash (danger) / exclamation (primary). */
    icon?: React.ReactNode;
    /**
     * Require the user to type this exact string to enable the confirm button
     * (used for high-impact deletes, e.g. typing "DELETE").
     */
    requireText?: string;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    description,
    variant = 'danger',
    confirmLabel,
    cancelLabel = 'Batal',
    loading = false,
    warningTitle,
    icon,
    requireText,
}: ConfirmDialogProps) {
    const [typed, setTyped] = useState('');

    // Reset the typed confirmation whenever the dialog is closed/reopened.
    useEffect(() => {
        if (!isOpen) setTyped('');
    }, [isOpen]);

    const isDanger = variant === 'danger';
    const boxClass = isDanger
        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50 text-red-800 dark:text-red-400'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-400';
    const defaultIcon = isDanger
        ? <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
        : <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />;
    const heading = warningTitle ?? (isDanger ? 'Peringatan Penting!' : 'Konfirmasi');
    const confirmText = confirmLabel ?? (isDanger ? 'Ya, Hapus Permanen' : 'Ya, Lanjutkan');

    const requireOk = !requireText || typed === requireText;

    const handleClose = () => {
        if (loading) return;
        setTyped('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} onConfirm={requireOk && !loading ? onConfirm : undefined}>
            <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${boxClass}`}>
                    <div className="flex gap-3">
                        {icon ?? defaultIcon}
                        <div className="text-sm">
                            <p className="font-semibold text-base mb-1">{heading}</p>
                            <div>{message}</div>
                            {description && <p className="mt-2 text-xs opacity-80">{description}</p>}
                        </div>
                    </div>
                </div>

                {requireText && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-900/30">
                        <p className="text-xs text-orange-800 dark:text-orange-300 font-semibold mb-2">
                            Ketik <b>{requireText}</b> untuk mengkonfirmasi:
                        </p>
                        <input
                            type="text"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={`Ketik ${requireText}...`}
                            className="w-full px-3 py-2 text-sm border border-orange-200 dark:border-orange-900/50 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white"
                        />
                    </div>
                )}

                <div className="flex items-center justify-end gap-3">
                    <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={isDanger ? 'danger' : 'primary'}
                        size="sm"
                        className="px-6"
                        onClick={onConfirm}
                        loading={loading}
                        disabled={!requireOk}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
