import { create } from 'zustand';
import { quotesApi } from '@/core/api/endpoints';
import { QuotesVariant } from '@/types';
import toast from 'react-hot-toast';

interface MasterQuotesState {
    quotes: QuotesVariant[];
    loading: boolean;
    hasLoaded: boolean;
    lastFetched: number | null;
    fetchQuotes: (force?: boolean, silent?: boolean) => Promise<void>;
    updateQuoteLocal: (id: string, updates: Partial<QuotesVariant>) => void;
    setQuotes: (quotes: QuotesVariant[]) => void;
    deleteQuote: (id: string) => Promise<boolean>;
}

export const useMasterQuotesStore = create<MasterQuotesState>((set, get) => ({
    quotes: [],
    loading: false,
    hasLoaded: false,
    lastFetched: null,

    fetchQuotes: async (force = false, silent = false) => {
        const { lastFetched, loading, hasLoaded } = get();
        const now = Date.now();

        // Cache for 5 minutes unless forced
        if (!force && hasLoaded && lastFetched && (now - lastFetched < 5 * 60 * 1000)) {
            return;
        }

        if (loading) return;

        // silent: refresh data without flipping the page-level `loading` flag and
        // without triggering the global block-screen loader (used after inline edits).
        if (!silent) set({ loading: true });
        try {
            const res = await quotesApi.getQuotes(silent ? ({ skipLoader: true } as any) : undefined);
            if (res.success) {
                set({
                    quotes: res.data || [],
                    lastFetched: now,
                    hasLoaded: true,
                });
            }
        } catch (error) {
            toast.error('Gagal mengambil data master quotes');
        } finally {
            if (!silent) set({ loading: false });
        }
    },

    updateQuoteLocal: (id, updates) => {
        set((state) => ({
            quotes: state.quotes.map((q) =>
                q.id === id ? { ...q, ...updates } : q
            ),
        }));
    },

    setQuotes: (quotes) => set({ quotes }),

    deleteQuote: async (id) => {
        try {
            const res = await quotesApi.deleteQuote(id);
            if (res.success) {
                set((state) => ({
                    quotes: state.quotes.filter((q) => q.id !== id),
                }));
                return true;
            } else {
                toast.error(res.message || 'Gagal menghapus quote');
                return false;
            }
        } catch (error) {
            toast.error('Gagal menghapus quote');
            return false;
        }
    },
}));
