import { create } from 'zustand';

interface ApiStore {
    loadingCount: number;
    incrementLoading: () => void;
    decrementLoading: () => void;
}

export const useApiStore = create<ApiStore>((set) => ({
    loadingCount: 0,
    incrementLoading: () => set((state) => ({ loadingCount: state.loadingCount + 1 })),
    decrementLoading: () => set((state) => ({ loadingCount: Math.max(0, state.loadingCount - 1) })),
}));
