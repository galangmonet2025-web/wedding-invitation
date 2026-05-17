import { useEffect, useState } from 'react';
import { reviewApi } from '@/core/api/endpoints';
import { PageLoader } from '@/shared/components/Loading';
import { Modal } from '@/shared/components/Modal';
import type { ReviewAndRating } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlineChatAlt2, HiOutlineExternalLink, HiOutlineStar, HiSave, HiOutlineRefresh, HiOutlineTrash } from 'react-icons/hi';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';

import { useReviewStore } from '../store/reviewStore';

export function ReviewPage() {
    const { reviews, loading, fetchReviews, updateReviewLocal, deleteReview } = useReviewStore();
    const [originalReviews, setOriginalReviews] = useState<Record<string, ReviewAndRating>>({});
    const [savingIds, setSavingIds] = useState<string[]>([]);
    const [reviewToDelete, setReviewToDelete] = useState<ReviewAndRating | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, []);

    // Sync original values when reviews data changes from store (e.g. after fetch)
    useEffect(() => {
        if (reviews.length > 0) {
            const originals: Record<string, ReviewAndRating> = {};
            reviews.forEach(r => {
                originals[r.id] = { ...r };
            });
            setOriginalReviews(originals);
        }
    }, [reviews.length]);

    const handleLocalChange = (id: string, field: keyof ReviewAndRating, value: any) => {
        updateReviewLocal(id, { [field]: value });
    };

    const handleSaveRow = async (review: ReviewAndRating) => {
        setSavingIds(prev => [...prev, review.id]);
        try {
            const res = await reviewApi.updateReviewStatus(review.id, {
                flag_show_review: review.flag_show_review,
                alamat: review.alamat
            }, { skipLoader: true } as any);

            if (res.success) {
                toast.success('Data review berhasil disimpan');
                // Update original state
                setOriginalReviews(prev => ({
                    ...prev,
                    [review.id]: { ...review }
                }));
            }
        } catch {
            toast.error('Gagal menyimpan data review');
        } finally {
            setSavingIds(prev => prev.filter(id => id !== review.id));
        }
    };

    const handleDelete = async () => {
        if (!reviewToDelete) return;
        setIsDeleting(true);
        try {
            await deleteReview(reviewToDelete.id);
            setReviewToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const isRowChanged = (review: ReviewAndRating) => {
        const original = originalReviews[review.id];
        if (!original) return false;
        
        return (
            review.alamat !== original.alamat || 
            review.flag_show_review !== original.flag_show_review
        );
    };

    const exportColumns = [
        { header: 'Nama Pasangan', key: 'couple', render: (r: ReviewAndRating) => `${r.bride_name} & ${r.groom_name}` },
        { header: 'Domain Slug', key: 'domain_slug' },
        { header: 'Paket Langganan', key: 'plan_type', render: (r: ReviewAndRating) => r.plan_type.toUpperCase() },
        { header: 'Rating (Bintang)', key: 'rate_star' },
        { header: 'Komentar', key: 'comment' },
        { header: 'Alamat', key: 'alamat' },
        { header: 'Ditampilkan?', key: 'flag_show_review', render: (r: ReviewAndRating) => r.flag_show_review === 'TRUE' || r.flag_show_review === true ? 'Ya' : 'Tidak' },
    ];

    const handleExportExcel = () => {
        exportToExcel(reviews, exportColumns, 'Data_Review_Rating', 'Daftar Review & Rating');
    };

    const handleExportPdf = () => {
        exportToPdf(reviews, exportColumns, 'Data_Review_Rating', 'Laporan Data Review & Rating');
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kelola review dari tenant setelah hari pernikahan</p>
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
                        onClick={() => fetchReviews(true)} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden p-0 border-0 md:border bg-transparent md:bg-white dark:md:bg-wedding-dark-card shadow-none md:shadow-sm">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto bg-white dark:bg-wedding-dark-card rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Undangan</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Comment</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Alamat</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Show</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {reviews.length > 0 ? (
                                reviews.map((review) => {
                                    const hasChanges = isRowChanged(review);
                                    const isSaving = savingIds.includes(review.id);

                                    return (
                                        <tr key={review.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${hasChanges ? 'bg-amber-50/20 dark:bg-amber-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                                    {review.bride_name} & {review.groom_name}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider font-bold">{review.plan_type}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <a 
                                                    href={`#/${review.domain_slug}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="text-gold-600 hover:text-gold-700 text-xs flex items-center gap-1 font-medium"
                                                >
                                                    {review.domain_slug}
                                                    <HiOutlineExternalLink className="w-3 h-3" />
                                                </a>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <HiOutlineStar 
                                                            key={i} 
                                                            className={`w-4 h-4 ${i < review.rate_star ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} 
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={review.comment}>
                                                    {review.comment}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="text"
                                                    value={review.alamat || ''}
                                                    onChange={(e) => handleLocalChange(review.id, 'alamat', e.target.value)}
                                                    className="text-xs bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:border-gold-500 focus:outline-none w-full py-1"
                                                    placeholder="Isi alamat..."
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer" 
                                                            checked={review.flag_show_review === true || review.flag_show_review === 'TRUE'}
                                                            onChange={(e) => handleLocalChange(review.id, 'flag_show_review', e.target.checked ? 'TRUE' : 'FALSE')}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-600"></div>
                                                    </label>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    {isSaving ? (
                                                        <div className="w-5 h-5 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSaveRow(review)}
                                                            disabled={!hasChanges}
                                                            className={`p-1.5 rounded-lg transition-all ${
                                                                hasChanges 
                                                                ? 'bg-gold-100 text-gold-600 hover:bg-gold-200' 
                                                                : 'text-gray-300 cursor-not-allowed'
                                                            }`}
                                                            title="Simpan Perubahan"
                                                        >
                                                            <HiSave className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setReviewToDelete(review)}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-650 transition-all"
                                                        title="Hapus Review"
                                                    >
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <HiOutlineChatAlt2 className="w-12 h-12 text-gray-300" />
                                            <p className="text-gray-500 dark:text-gray-400">Belum ada review dari tenant</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards List View */}
                <div className="block md:hidden space-y-2 bg-gray-50/30 dark:bg-wedding-dark/30">
                    {reviews.length > 0 ? (
                        reviews.map((review) => {
                            const hasChanges = isRowChanged(review);
                            const isSaving = savingIds.includes(review.id);

                            return (
                                <div
                                    key={review.id}
                                    className={`card p-2.5 space-y-1.5 relative transition-all duration-300 border ${
                                        hasChanges
                                            ? 'border-amber-400 bg-amber-50/10 dark:bg-amber-950/5 shadow-md shadow-amber-500/5'
                                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-wedding-dark-card shadow-sm'
                                    }`}
                                >
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="font-bold text-[13px] text-gray-900 dark:text-white leading-tight">
                                                {review.bride_name} & {review.groom_name}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className="px-1.5 py-0.5 inline-flex text-[9px] leading-none font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-550 dark:text-gray-300 uppercase shrink-0">
                                                    {review.plan_type}
                                                </span>
                                                <a 
                                                    href={`#/${review.domain_slug}`} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="text-gold-600 hover:text-gold-700 text-[10.5px] flex items-center gap-0.5 font-medium leading-none truncate max-w-[100px]"
                                                >
                                                    {review.domain_slug}
                                                    <HiOutlineExternalLink className="w-2.5 h-2.5 shrink-0" />
                                                </a>
                                                <div className="flex items-center gap-0.5 shrink-0 pl-1.5 border-l border-gray-200 dark:border-gray-700">
                                                    {[...Array(5)].map((_, i) => (
                                                        <HiOutlineStar 
                                                            key={i} 
                                                            className={`w-3 h-3 ${i < review.rate_star ? 'text-amber-400 fill-amber-400' : 'text-gray-250 dark:text-gray-700'}`} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions in Header */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {isSaving ? (
                                                <div className="w-5 h-5 border-2 border-gold-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <button
                                                    onClick={() => handleSaveRow(review)}
                                                    disabled={!hasChanges}
                                                    className={`p-1 rounded-md transition-all ${
                                                        hasChanges 
                                                        ? 'bg-gold-100 text-gold-600 hover:bg-gold-200' 
                                                        : 'text-gray-300 cursor-not-allowed'
                                                    }`}
                                                    title="Simpan Perubahan"
                                                >
                                                    <HiSave className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setReviewToDelete(review)}
                                                className="p-1 rounded-md text-red-400 hover:bg-red-50 hover:text-red-650 transition-all"
                                                title="Hapus Review"
                                            >
                                                <HiOutlineTrash className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 pt-1.5 border-t border-gray-100/50 dark:border-gray-800/50 items-end">
                                        {/* Alamat Input (col-span-2) */}
                                        <div className="col-span-2 space-y-0.5">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">
                                                Alamat
                                            </span>
                                            <input 
                                                type="text"
                                                value={review.alamat || ''}
                                                onChange={(e) => handleLocalChange(review.id, 'alamat', e.target.value)}
                                                className="w-full bg-gray-50/70 dark:bg-wedding-dark/50 border border-gray-100 dark:border-gray-800 rounded-lg px-2 py-0.5 text-[10.5px] text-gray-750 dark:text-gray-300 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all font-semibold placeholder-gray-400 leading-tight"
                                                placeholder="Isi alamat..."
                                            />
                                        </div>

                                        {/* Tampilkan Switch (col-span-1) */}
                                        <div className="flex flex-col items-center justify-center space-y-0.5">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block leading-none">
                                                Tampil?
                                            </span>
                                            <div className="flex items-center h-5">
                                                <label className="relative inline-flex items-center cursor-pointer scale-75">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={review.flag_show_review === true || review.flag_show_review === 'TRUE'}
                                                        onChange={(e) => handleLocalChange(review.id, 'flag_show_review', e.target.checked ? 'TRUE' : 'FALSE')}
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gold-600"></div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Comment (col-span-3) */}
                                        <div className="col-span-3 space-y-0.5">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">
                                                Komentar
                                            </span>
                                            <div className="bg-gray-50/50 dark:bg-wedding-dark/40 rounded-lg px-2 py-1 border border-gray-100/50 dark:border-gray-850/50">
                                                <p className="text-[10.5px] text-gray-655 dark:text-gray-300 leading-tight italic break-words font-medium">
                                                    "{review.comment}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-xl">
                            <div className="flex flex-col items-center gap-2">
                                <HiOutlineChatAlt2 className="w-10 h-10 text-gray-300" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada review dari tenant</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Konfirmasi Hapus */}
            <Modal
                isOpen={!!reviewToDelete}
                onClose={() => setReviewToDelete(null)}
                title="Hapus Review & Rating"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-base mb-1">Peringatan Penting!</p>
                                <p>Apakah Anda yakin ingin menghapus review dari <b>{reviewToDelete?.bride_name} & {reviewToDelete?.groom_name}</b>?</p>
                                <p className="mt-2 text-xs opacity-80">Data review dan rating ini akan dihapus permanen dan tidak dapat dikembalikan.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setReviewToDelete(null)} className="btn-ghost px-5 py-1.5 text-sm" disabled={isDeleting}>Batal</button>
                        <button 
                            onClick={handleDelete} 
                            className="btn-danger py-1.5 px-6 text-sm flex items-center gap-2"
                            disabled={isDeleting}
                        >
                            {isDeleting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
