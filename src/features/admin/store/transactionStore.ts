import { create } from 'zustand';
import { paymentApi } from '@/core/api/endpoints';
import type { Transaction } from '@/types';
import toast from 'react-hot-toast';

interface TransactionState {
    transactions: Transaction[];
    loading: boolean;
    hasLoaded: boolean;
    lastFetched: number | null;
    
    fetchTransactions: (force?: boolean, silent?: boolean) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
    transactions: [],
    loading: false,
    hasLoaded: false,
    lastFetched: null,

    fetchTransactions: async (force = false, silent = false) => {
        const { lastFetched, loading, hasLoaded } = get();
        const now = Date.now();
        
        // Caching: 5 minutes
        if (!force && hasLoaded && lastFetched && (now - lastFetched < 5 * 60 * 1000)) {
            return;
        }

        if (loading) return;

        if (!silent) set({ loading: true });
        
        const config = silent ? { skipLoader: true } : undefined;

        try {
            const res = await paymentApi.getTransactions(undefined, config);
            if (res.success) {
                set({ 
                    transactions: res.data || [], 
                    lastFetched: now,
                    hasLoaded: true 
                });
            }
        } catch (error) {
            toast.error('Gagal mengambil data transaksi');
        } finally {
            set({ loading: false });
        }
    }
}));
