import { useEffect, useState, useMemo, useRef } from 'react';
import { giftApi } from '@/core/api/endpoints';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { Badge } from '@/shared/components/Badge';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageLoader } from '@/shared/components/Loading';
import type { Gift } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineCurrencyDollar,
    HiOutlineRefresh,
    HiOutlineGift,
    HiOutlineUsers,
    HiOutlineDotsHorizontal,
    HiOutlineDocumentDownload,
    HiOutlineDocumentText,
} from 'react-icons/hi';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';
import { useTranslation } from 'react-i18next';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';

import { useGiftStore } from '../store/giftStore';

export function GiftsPage() {
    const { t } = useTranslation();
    const { gifts, loading, fetchGifts, addGift, deleteGift: deleteGiftInStore } = useGiftStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [giftToDelete, setGiftToDelete] = useState<Gift | null>(null);
    const [form, setForm] = useState({ guest_name: '', amount: 0, bank_name: '' });
    const [toolsOpen, setToolsOpen] = useState(false);
    const toolsRef = useRef<HTMLDivElement>(null);
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    const isAdminLayout = useBasePath() === '/admin';

    useEffect(() => {
        fetchGifts();
    }, []);

    // Tutup dropdown "Ekspor" saat klik di luar area menu.
    useEffect(() => {
        if (!toolsOpen) return;
        const onDown = (e: MouseEvent) => {
            if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [toolsOpen]);

    // Pada layout /admin, tombol refresh dipindah ke gold header (sebelah "Buka
    // Undangan"). Di /private lama tetap inline.
    useEffect(() => {
        if (!isAdminLayout) return;
        setHeaderAction(
            <button
                onClick={() => fetchGifts(true)}
                disabled={loading}
                title={t('common.refresh', 'Segarkan') as string}
                aria-label={t('common.refresh', 'Segarkan') as string}
                className="admin-icon-btn"
            >
                <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        );
        return () => setHeaderAction(null);
    }, [loading, isAdminLayout]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const totalAmount = gifts.reduce((sum, g) => sum + g.amount, 0);

    // Ringkasan: total nominal, jumlah hadiah, jumlah pemberi unik.
    const stats = useMemo(() => {
        const uniqueGivers = new Set(gifts.map(g => String(g.guest_name || '').trim().toLowerCase()).filter(Boolean));
        return { count: gifts.length, givers: uniqueGivers.size };
    }, [gifts]);

    const handleCreate = async () => {
        if (!form.guest_name || !form.amount || !form.bank_name) {
            toast.error(t('gifts.toast_fill_all', 'Please fill in all fields'));
            return;
        }
        try {
            const response = await giftApi.createGift(form);
            if (response.success) {
                toast.success(t('gifts.toast_success_recorded', 'Gift recorded!'));
                addGift(response.data); // Optimistic update
                setShowAddModal(false);
                setForm({ guest_name: '', amount: 0, bank_name: '' });
            }
        } catch {
            toast.error(t('gifts.toast_error_failed_record', 'Failed to record gift'));
        }
    };

    const handleDelete = async () => {
        if (!giftToDelete) return;
        try {
            await giftApi.deleteGift(giftToDelete.id);
            toast.success(t('gifts.toast_success_deleted', 'Gift removed'));
            deleteGiftInStore(giftToDelete.id); // Optimistic update
            setGiftToDelete(null);
        } catch {
            toast.error(t('gifts.toast_error_failed_delete', 'Failed to delete'));
        }
    };

    const exportColumns = [
        { header: 'Nama Pemberi', key: 'guest_name' },
        { header: 'Nominal Hadiah', key: 'amount', render: (g: Gift) => formatCurrency(g.amount) },
        { header: 'Bank / Sumber', key: 'bank_name' },
        { header: 'Tanggal Diterima', key: 'created_at', render: (g: Gift) => new Date(g.created_at).toLocaleString('id-ID') },
    ];

    const handleExportExcel = () => {
        exportToExcel(gifts, exportColumns, 'Data_Hadiah_Pernikahan', 'Data Hadiah');
    };

    const handleExportPdf = () => {
        // Append Total amount at the end
        // Wait, jspdf autotable will just print the table, but giving it the data is enough.
        exportToPdf(gifts, exportColumns, 'Data_Hadiah_Pernikahan', `Laporan Data Hadiah Pemberian (Total: ${formatCurrency(totalAmount)})`);
    };

    const columns: Column<Gift>[] = [
        {
            key: 'guest_name',
            header: t('gifts.table_guest', 'Guest'),
            render: (g: Gift) => <span className="font-medium text-gray-800 dark:text-white">{g.guest_name}</span>,
        },
        {
            key: 'amount',
            header: t('gifts.table_amount', 'Amount'),
            render: (g: Gift) => <span className="font-semibold text-gold-600">{formatCurrency(g.amount)}</span>,
        },
        {
            key: 'bank_name',
            header: t('gifts.table_bank', 'Bank'),
            render: (g: Gift) => <Badge variant="info">{g.bank_name}</Badge>,
        },
        {
            key: 'created_at',
            header: t('gifts.table_date', 'Date'),
            render: (g: Gift) => new Date(g.created_at).toLocaleDateString('id-ID'),
        },
        {
            key: 'actions',
            header: '',
            render: (g: Gift) => (
                <button
                    onClick={() => setGiftToDelete(g)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                >
                    <HiOutlineTrash className="w-4 h-4" />
                </button>
            ),
        },
    ];

    if (loading && gifts.length === 0) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ===== Header: action row + stat strip (samakan dgn Daftar Tamu) ===== */}
            <div className="space-y-4">
                {/* Action row */}
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                        {t('gifts.page_title', 'Kirim Hadiah')}
                    </h2>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Layout /admin: refresh dipindah ke gold header. Inline hanya untuk /private. */}
                        {!isAdminLayout && (
                            <IconButton
                                onClick={() => fetchGifts(true)}
                                icon={<HiOutlineRefresh className="w-4 h-4" />}
                                spinning={loading}
                                title={t('common.refresh', 'Segarkan')}
                            />
                        )}
                        {/* Ekspor — satu dropdown menggantikan tombol Excel/PDF terpisah */}
                        <div className="relative" ref={toolsRef}>
                            <button
                                onClick={() => setToolsOpen((v) => !v)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
                                title={t('gifts.export', 'Ekspor')}
                            >
                                <HiOutlineDotsHorizontal className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('gifts.export', 'Ekspor')}</span>
                            </button>
                            {toolsOpen && (
                                <div className="absolute right-0 mt-2 w-52 z-30 rounded-2xl bg-white dark:bg-wedding-dark-card border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden animate-fade-in">
                                    <button
                                        onClick={() => { handleExportExcel(); setToolsOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center shrink-0">
                                            <HiOutlineDocumentDownload className="w-4 h-4" />
                                        </span>
                                        {t('gifts.export_excel', 'Ekspor ke Excel')}
                                    </button>
                                    <button
                                        onClick={() => { handleExportPdf(); setToolsOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                            <HiOutlineDocumentText className="w-4 h-4" />
                                        </span>
                                        {t('gifts.export_pdf', 'Ekspor ke PDF')}
                                    </button>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="text-sm shrink-0"
                            icon={<HiOutlinePlus className="w-4 h-4" />}
                        >
                            <span className="hidden sm:inline">{t('gifts.record_button', 'Record Gift')}</span>
                            <span className="sm:hidden">{t('gifts.record_button_short', 'Catat')}</span>
                        </Button>
                    </div>
                </div>

                {/* Stat strip — Total Nominal featured (span penuh), lalu jumlah & pemberi */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {/* Featured: total nominal (kartu gradasi gold, tetap menonjol) */}
                    <div className="col-span-2 card !p-4 bg-gradient-to-r from-gold-500 to-gold-700 text-white border-0 flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                            <HiOutlineCurrencyDollar className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-white/80 font-semibold">{t('gifts.total_amount', 'Total Gift Amount')}</p>
                            <p className="text-2xl sm:text-3xl font-black leading-tight truncate">{formatCurrency(totalAmount)}</p>
                        </div>
                    </div>

                    <GiftStatPill
                        icon={<HiOutlineGift className="w-4 h-4" />}
                        value={stats.count}
                        label={t('gifts.stat_count', 'Jumlah Hadiah')}
                        tone="gold"
                    />
                    <GiftStatPill
                        icon={<HiOutlineUsers className="w-4 h-4" />}
                        value={stats.givers}
                        label={t('gifts.stat_givers', 'Pemberi')}
                        tone="emerald"
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={gifts}
                loading={loading}
                emptyMessage={t('gifts.empty_message', 'No gifts recorded yet')}
            />

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title={t('gifts.modal_title', 'Record Gift')}
                footer={
                    <>
                        <button onClick={() => setShowAddModal(false)} className="btn-ghost">{t('common.cancel', 'Cancel')}</button>
                        <button onClick={handleCreate} className="btn-primary">{t('common.save', 'Record')}</button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-field">{t('gifts.guest_name', 'Guest Name *')}</label>
                        <input
                            type="text"
                            value={form.guest_name}
                            onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                            className="input-field"
                            placeholder={t('gifts.guest_name_placeholder', 'Guest name')}
                        />
                    </div>
                    <div>
                        <label className="label-field">{t('gifts.amount_label', 'Amount (IDR) *')}</label>
                        <input
                            type="number"
                            value={form.amount || ''}
                            onChange={(e) => setForm((f) => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
                            className="input-field"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="label-field">{t('gifts.bank_name_label', 'Bank Name *')}</label>
                        <select
                            value={form.bank_name}
                            onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                            className="select-field"
                        >
                            <option value="">{t('gifts.select_bank', 'Select bank')}</option>
                            <option value="BCA">BCA</option>
                            <option value="Mandiri">Mandiri</option>
                            <option value="BRI">BRI</option>
                            <option value="BNI">BNI</option>
                            <option value="CIMB">CIMB Niaga</option>
                            <option value="Cash">Cash</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <ConfirmDialog
                isOpen={!!giftToDelete}
                onClose={() => setGiftToDelete(null)}
                onConfirm={handleDelete}
                title="Hapus Catatan Hadiah"
                warningTitle="Konfirmasi Hapus"
                confirmLabel="Ya, Hapus"
                message={<p>Apakah Anda yakin ingin menghapus catatan hadiah dari <b>{giftToDelete?.guest_name}</b>? Tindakan ini tidak dapat dibatalkan.</p>}
            />
        </div>
    );
}

// Kartu statistik ringkas untuk header — samakan gaya dengan StatPill di Daftar Tamu.
const GIFT_STAT_TONE: Record<string, { icon: string; value: string }> = {
    gold: {
        icon: 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
        value: 'text-gray-900 dark:text-white',
    },
    emerald: {
        icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        value: 'text-emerald-600 dark:text-emerald-400',
    },
};

function GiftStatPill({ icon, value, label, tone }: {
    icon: React.ReactNode;
    value: number;
    label: string;
    tone: keyof typeof GIFT_STAT_TONE;
}) {
    const c = GIFT_STAT_TONE[tone] || GIFT_STAT_TONE.gold;
    return (
        <div className="card !p-3 flex items-center gap-2.5 min-w-0">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className={`text-xl font-black leading-none ${c.value}`}>{value}</p>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 truncate mt-1">{label}</p>
            </div>
        </div>
    );
}
