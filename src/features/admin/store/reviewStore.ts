import { create } from 'zustand';
import { reviewApi } from '@/core/api/endpoints';
import { ReviewAndRating } from '@/types';
import toast from 'react-hot-toast';

interface ReviewState {
    reviews: ReviewAndRating[];
    loading: boolean;
    lastFetched: number | null;
    fetchReviews: (force?: boolean) => Promise<void>;
    updateReviewLocal: (id: string, updates: Partial<ReviewAndRating>) => void;
    setReviews: (reviews: ReviewAndRating[]) => void;
    deleteReview: (id: string) => Promise<boolean>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
    reviews: [],
    loading: false,
    lastFetched: null,

    fetchReviews: async (force = false) => {
        const { lastFetched, loading } = get();
        const now = Date.now();
        
        if (!force && lastFetched && (now - lastFetched < 5 * 60 * 1000)) {
            return;
        }

        if (loading) return;

        set({ loading: true });
        try {
            const res = await reviewApi.getReviews();
            if (res.success) {
                set({ 
                    reviews: res.data || [], 
                    lastFetched: now 
                });
            }
        } catch (error) {
            toast.error('Gagal mengambil data review');
        } finally {
            set({ loading: false });
        }
    },

    updateReviewLocal: (id, updates) => {
        set((state) => ({
            reviews: state.reviews.map((r) => 
                r.id === id ? { ...r, ...updates } : r
            )
        }));
    },

    setReviews: (reviews) => set({ reviews }),

    deleteReview: async (id) => {
        try {
            const res = await reviewApi.deleteReview(id);
            if (res.success) {
                set((state) => ({
                    reviews: state.reviews.filter((r) => r.id !== id)
                }));
                toast.success('Review berhasil dihapus');
                return true;
            } else {
                toast.error(res.message || 'Gagal menghapus review');
                return false;
            }
        } catch (error) {
            toast.error('Gagal menghapus review');
            return false;
        }
    }
}));
