import { useEffect, useState, useMemo, useRef } from 'react';
import { wishApi } from '@/core/api/endpoints';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { PageLoader } from '@/shared/components/Loading';
import type { Wish } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineHeart,
    HiOutlineRefresh,
    HiOutlineChatAlt2,
    HiOutlineUsers,
    HiOutlineDotsHorizontal,
    HiOutlineDocumentDownload,
    HiOutlineDocumentText,
} from 'react-icons/hi';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';

import { useWishStore } from '../store/wishStore';

export function WishesPage() {
    const { wishes, loading, fetchWishes, addWish, deleteWish: deleteWishInStore } = useWishStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [wishToDelete, setWishToDelete] = useState<Wish | null>(null);
    const [form, setForm] = useState({ guest_name: '', message: '' });
    const [toolsOpen, setToolsOpen] = useState(false);
    const toolsRef = useRef<HTMLDivElement>(null);
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    const isAdminLayout = useBasePath() === '/admin';

    useEffect(() => {
        fetchWishes();
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
                onClick={() => fetchWishes(true)}
                disabled={loading}
                title="Refresh Data"
                aria-label="Refresh Data"
                className="admin-icon-btn"
            >
                <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        );
        return () => setHeaderAction(null);
    }, [loading, isAdminLayout]);

    // Ringkasan: total ucapan + jumlah tamu unik yang mengirim.
    const stats = useMemo(() => {
        const uniqueGuests = new Set(wishes.map(w => String(w.guest_name || '').trim().toLowerCase()).filter(Boolean));
        return { total: wishes.length, guests: uniqueGuests.size };
    }, [wishes]);

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
            {/* ===== Header: action row + stat strip (samakan dgn Daftar Tamu) ===== */}
            <div className="space-y-4">
                {/* Action row */}
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                        Ucapan &amp; Doa
                    </h2>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Layout /admin: refresh dipindah ke gold header. Inline hanya untuk /private. */}
                        {!isAdminLayout && (
                            <IconButton
                                onClick={() => fetchWishes(true)}
                                title="Refresh Data"
                                spinning={loading}
                                icon={<HiOutlineRefresh className="w-4 h-4" />}
                            />
                        )}
                        {/* Ekspor — satu dropdown menggantikan tombol Excel/PDF terpisah */}
                        <div className="relative" ref={toolsRef}>
                            <button
                                onClick={() => setToolsOpen((v) => !v)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
                                title="Ekspor"
                            >
                                <HiOutlineDotsHorizontal className="w-4 h-4" />
                                <span className="hidden sm:inline">Ekspor</span>
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
                                        Ekspor ke Excel
                                    </button>
                                    <button
                                        onClick={() => { handleExportPdf(); setToolsOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                            <HiOutlineDocumentText className="w-4 h-4" />
                                        </span>
                                        Ekspor ke PDF
                                    </button>
                                </div>
                            )}
                        </div>

                        <Button onClick={() => setShowAddModal(true)} className="text-sm shrink-0" icon={<HiOutlinePlus className="w-4 h-4" />}>
                            <span className="hidden sm:inline">Tambah Ucapan</span>
                            <span className="sm:hidden">Tambah</span>
                        </Button>
                    </div>
                </div>

                {/* Stat strip */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <WishStatPill
                        icon={<HiOutlineChatAlt2 className="w-4 h-4" />}
                        value={stats.total}
                        label="Total Ucapan"
                        tone="gold"
                    />
                    <WishStatPill
                        icon={<HiOutlineUsers className="w-4 h-4" />}
                        value={stats.guests}
                        label="Tamu Berkomentar"
                        tone="emerald"
                    />
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
                <div className="card flex flex-col items-center justify-center text-center py-14 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center mb-4">
                        <HiOutlineHeart className="w-8 h-8 text-gold-500 dark:text-gold-400" />
                    </div>
                    <h3 className="text-base font-black text-gray-800 dark:text-white">Belum ada ucapan</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Ucapan &amp; doa dari tamu akan muncul di sini setelah mereka mengirimnya lewat undangan.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary mt-5 py-2.5 px-5 inline-flex items-center gap-2 text-sm"
                    >
                        <HiOutlinePlus className="w-4 h-4" />
                        Tambah Ucapan Manual
                    </button>
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
            <ConfirmDialog
                isOpen={!!wishToDelete}
                onClose={() => setWishToDelete(null)}
                onConfirm={handleDelete}
                title="Hapus Ucapan"
                warningTitle="Konfirmasi Hapus"
                confirmLabel="Ya, Hapus"
                message={<p>Apakah Anda yakin ingin menghapus ucapan dari <b>{wishToDelete?.guest_name}</b>? Tindakan ini tidak dapat dibatalkan.</p>}
            />
        </div>
    );
}

// Kartu statistik ringkas untuk header — samakan gaya dengan StatPill di Daftar Tamu.
const WISH_STAT_TONE: Record<string, { icon: string; value: string }> = {
    gold: {
        icon: 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
        value: 'text-gray-900 dark:text-white',
    },
    emerald: {
        icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        value: 'text-emerald-600 dark:text-emerald-400',
    },
};

function WishStatPill({ icon, value, label, tone }: {
    icon: React.ReactNode;
    value: number;
    label: string;
    tone: keyof typeof WISH_STAT_TONE;
}) {
    const c = WISH_STAT_TONE[tone] || WISH_STAT_TONE.gold;
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
