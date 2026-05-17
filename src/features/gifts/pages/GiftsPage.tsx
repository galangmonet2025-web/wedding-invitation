import { useEffect, useState } from 'react';
import { giftApi } from '@/core/api/endpoints';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { Gift } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCurrencyDollar, HiOutlineRefresh } from 'react-icons/hi';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';
import { useTranslation } from 'react-i18next';

import { useGiftStore } from '../store/giftStore';

export function GiftsPage() {
    const { t } = useTranslation();
    const { gifts, loading, fetchGifts, addGift, deleteGift: deleteGiftInStore } = useGiftStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [giftToDelete, setGiftToDelete] = useState<Gift | null>(null);
    const [form, setForm] = useState({ guest_name: '', amount: 0, bank_name: '' });

    useEffect(() => {
        fetchGifts();
    }, []);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const totalAmount = gifts.reduce((sum, g) => sum + g.amount, 0);

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
            render: (g: Gift) => <span className="badge-info">{g.bank_name}</span>,
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
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('gifts.recorded_count', { count: gifts.length })}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 border border-gray-200 dark:border-gray-700">
                        <button onClick={handleExportExcel} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            Excel
                        </button>
                        <button onClick={handleExportPdf} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            PDF
                        </button>
                    </div>
                    <button 
                        onClick={() => fetchGifts(true)} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title={t('common.refresh', 'Segarkan')}
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2">
                        <HiOutlinePlus className="w-4 h-4" />
                        {t('gifts.record_button', 'Record Gift')}
                    </button>
                </div>
            </div>

            {/* Total Gift Card */}
            <div className="card bg-gradient-to-r from-gold-500 to-gold-700 text-white border-0">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                        <HiOutlineCurrencyDollar className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">{t('gifts.total_amount', 'Total Gift Amount')}</p>
                        <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
                    </div>
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
            <Modal
                isOpen={!!giftToDelete}
                onClose={() => setGiftToDelete(null)}
                title="Hapus Catatan Hadiah"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-base mb-1">Konfirmasi Hapus</p>
                                <p>Apakah Anda yakin ingin menghapus catatan hadiah dari <b>{giftToDelete?.guest_name}</b>? Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setGiftToDelete(null)} className="btn-ghost">Batal</button>
                        <button onClick={handleDelete} className="btn-danger py-2 px-6">Ya, Hapus</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
