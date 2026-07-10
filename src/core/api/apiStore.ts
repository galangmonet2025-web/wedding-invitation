import { create } from 'zustand';

interface ApiStore {
    loadingCount: number;
    // When > 0, the full-screen ApiLoader block is suppressed. Used by flows that
    // present their own inline progress UI (e.g. the theme-save floating card) and
    // don't want the global blocking overlay on top of it. It's a counter (not a
    // bool) so nested/overlapping suppressors compose correctly.
    suppressGlobalLoader: number;
    incrementLoading: () => void;
    decrementLoading: () => void;
    beginSuppressLoader: () => void;
    endSuppressLoader: () => void;
}

export const useApiStore = create<ApiStore>((set) => ({
    loadingCount: 0,
    suppressGlobalLoader: 0,
    incrementLoading: () => set((state) => ({ loadingCount: state.loadingCount + 1 })),
    decrementLoading: () => set((state) => ({ loadingCount: Math.max(0, state.loadingCount - 1) })),
    beginSuppressLoader: () => set((state) => ({ suppressGlobalLoader: state.suppressGlobalLoader + 1 })),
    endSuppressLoader: () => set((state) => ({ suppressGlobalLoader: Math.max(0, state.suppressGlobalLoader - 1) })),
}));
