import { create } from 'zustand';
import { additionalFeatureApi } from '@/core/api/endpoints';
import { MstAdditionalFeature } from '@/types';
import toast from 'react-hot-toast';

interface AdditionalFeatureState {
    features: MstAdditionalFeature[];
    loading: boolean;
    hasLoaded: boolean;
    lastFetched: number | null;
    fetchFeatures: (force?: boolean) => Promise<void>;
    addFeature: (feature: MstAdditionalFeature) => void;
    updateFeature: (id: string, updates: Partial<MstAdditionalFeature>) => void;
    removeFeature: (id: string) => void;
}

export const useAdditionalFeatureStore = create<AdditionalFeatureState>((set, get) => ({
    features: [],
    loading: false,
    hasLoaded: false,
    lastFetched: null,

    fetchFeatures: async (force = false) => {
        const { lastFetched, loading, hasLoaded } = get();
        const now = Date.now();
        
        if (!force && hasLoaded && lastFetched && (now - lastFetched < 5 * 60 * 1000)) {
            return;
        }

        if (loading) return;

        set({ loading: true });
        try {
            const res = await additionalFeatureApi.getMstFeatures();
            if (res.success) {
                set({ 
                    features: res.data || [], 
                    lastFetched: now,
                    hasLoaded: true 
                });
            }
        } catch (error) {
            toast.error('Gagal mengambil data fitur tambahan');
        } finally {
            set({ loading: false });
        }
    },

    addFeature: (feature) => {
        set((state) => ({
            features: [feature, ...state.features]
        }));
    },

    updateFeature: (id, updates) => {
        set((state) => ({
            features: state.features.map((f) => 
                f.id === id ? { ...f, ...updates } : f
            )
        }));
    },

    removeFeature: (id) => {
        set((state) => ({
            features: state.features.filter((f) => f.id !== id)
        }));
    }
}));
