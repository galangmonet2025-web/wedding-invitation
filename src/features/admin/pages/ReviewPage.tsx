import { useEffect, useState } from 'react';
import { reviewApi } from '@/core/api/endpoints';
import { PageLoader } from '@/shared/components/Loading';
import type { ReviewAndRating } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlineChatAlt2, HiOutlineExternalLink, HiOutlineStar, HiSave } from 'react-icons/hi';

export function ReviewPage() {
    const [reviews, setReviews] = useState<ReviewAndRating[]>([]);
    const [originalReviews, setOriginalReviews] = useState<Record<string, ReviewAndRating>>({});
    const [loading, setLoading] = useState(true);
    const [savingIds, setSavingIds] = useState<string[]>([]);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await reviewApi.getReviews();
            if (res.success) {
                const data = res.data || [];
                setReviews(data);
                
                // Keep track of original values to detect changes
                const originals: Record<string, ReviewAndRating> = {};
                data.forEach(r => {
                    originals[r.id] = { ...r };
                });
                setOriginalReviews(originals);
            }
        } catch {
            toast.error('Gagal memuat review');
        } finally {
            setLoading(false);
        }
    };

    const handleLocalChange = (id: string, field: keyof ReviewAndRating, value: any) => {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
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

    const isRowChanged = (review: ReviewAndRating) => {
        const original = originalReviews[review.id];
        if (!original) return false;
        
        return (
            review.alamat !== original.alamat || 
            review.flag_show_review !== original.flag_show_review
        );
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Review and Rating</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola review dari tenant setelah hari pernikahan</p>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Undangan</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Comment</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Alamat</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Show</th>
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
                                                <p className="text-xs text-gray-400 mt-0.5">{review.plan_type} plan</p>
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
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={review.flag_show_review === true || review.flag_show_review === 'TRUE'}
                                                        onChange={(e) => handleLocalChange(review.id, 'flag_show_review', e.target.checked ? 'TRUE' : 'FALSE')}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-600"></div>
                                                </label>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isSaving ? (
                                                    <div className="w-5 h-5 border-2 border-gold-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSaveRow(review)}
                                                        disabled={!hasChanges}
                                                        className={`p-2 rounded-lg transition-all ${
                                                            hasChanges 
                                                            ? 'bg-gold-100 text-gold-600 hover:bg-gold-200' 
                                                            : 'text-gray-300 cursor-not-allowed'
                                                        }`}
                                                        title="Simpan Perubahan"
                                                    >
                                                        <HiSave className="w-5 h-5" />
                                                    </button>
                                                )}
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
            </div>
        </div>
    );
}
