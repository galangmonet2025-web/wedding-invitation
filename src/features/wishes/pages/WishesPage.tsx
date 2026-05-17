import { useEffect, useState } from 'react';
import { wishApi } from '@/core/api/endpoints';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { Wish } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineHeart, HiOutlineRefresh } from 'react-icons/hi';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';

import { useWishStore } from '../store/wishStore';

export function WishesPage() {
    const { wishes, loading, fetchWishes, addWish, deleteWish: deleteWishInStore } = useWishStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [wishToDelete, setWishToDelete] = useState<Wish | null>(null);
    const [form, setForm] = useState({ guest_name: '', message: '' });

    useEffect(() => {
        fetchWishes();
    }, []);

    const handleCreate = async () => {
        if (!form.guest_name || !form.message) {
            toast.error('Please fill in all fields');
            return;
        }
        try {
            const response = await wishApi.createWish(form);
            if (response.success) {
                toast.success('Wish added!');
                addWish(response.data); // Optimistic update
                setShowAddModal(false);
                setForm({ guest_name: '', message: '' });
            }
        } catch {
            toast.error('Failed to add wish');
        }
    };

    const handleDelete = async () => {
        if (!wishToDelete) return;
        try {
            await wishApi.deleteWish(wishToDelete.id);
            toast.success('Wish removed');
            deleteWishInStore(wishToDelete.id); // Optimistic update
            setWishToDelete(null);
        } catch {
            toast.error('Failed to delete');
        }
    };

    const exportColumns = [
        { header: 'Nama Tamu', key: 'guest_name' },
        { header: 'Pesan / Ucapan', key: 'message' },
        { header: 'Tanggal Kirim', key: 'created_at', render: (w: Wish) => new Date(w.created_at).toLocaleString('id-ID') },
    ];

    const handleExportExcel = () => {
        exportToExcel(wishes, exportColumns, 'Data_Ucapan_Pernikahan', 'Data Ucapan');
    };

    const handleExportPdf = () => {
        exportToPdf(wishes, exportColumns, 'Data_Ucapan_Pernikahan', 'Data Ucapan & Doa Pernikahan');
    };

    if (loading && wishes.length === 0) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{wishes.length} wishes received</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchWishes(true)} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 border border-gray-200 dark:border-gray-700">
                        <button onClick={handleExportExcel} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            Excel
                        </button>
                        <button onClick={handleExportPdf} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            PDF
                        </button>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2">
                        <HiOutlinePlus className="w-4 h-4" />
                        Add Wish
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishes.map((wish, index) => (
                    <div
                        key={wish.id}
                        className="card hover:shadow-gold group animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">{wish.guest_name[0]}</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-white">{wish.guest_name}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(wish.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setWishToDelete(wish)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-all"
                            >
                                <HiOutlineTrash className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{wish.message}</p>
                        <div className="mt-3 flex items-center gap-1 text-gold-500">
                            <HiOutlineHeart className="w-4 h-4" />
                            <HiOutlineHeart className="w-3 h-3 opacity-60" />
                        </div>
                    </div>
                ))}
            </div>

            {wishes.length === 0 && (
                <div className="card text-center py-16">
                    <HiOutlineHeart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No wishes yet. They will appear here once guests send their wishes.</p>
                </div>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Wedding Wish"
                footer={
                    <>
                        <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                        <button onClick={handleCreate} className="btn-primary">Add Wish</button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-field">Nama Tamu *</label>
                        <input
                            type="text"
                            value={form.guest_name}
                            onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                            className="input-field"
                            placeholder="Guest name"
                        />
                    </div>
                    <div>
                        <label className="label-field">Pesan *</label>
                        <textarea
                            value={form.message}
                            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                            className="input-field min-h-[120px] resize-none"
                            placeholder="Write a heartfelt message..."
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <Modal
                isOpen={!!wishToDelete}
                onClose={() => setWishToDelete(null)}
                title="Hapus Ucapan"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-base mb-1">Konfirmasi Hapus</p>
                                <p>Apakah Anda yakin ingin menghapus ucapan dari <b>{wishToDelete?.guest_name}</b>? Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setWishToDelete(null)} className="btn-ghost">Batal</button>
                        <button onClick={handleDelete} className="btn-danger py-2 px-6">Ya, Hapus</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
