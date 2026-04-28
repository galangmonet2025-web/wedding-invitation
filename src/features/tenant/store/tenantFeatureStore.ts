import { create } from 'zustand';
import { additionalFeatureApi } from '@/core/api/endpoints';
import { TenantActiveFeature } from '@/types';
import toast from 'react-hot-toast';

interface TenantFeatureState {
    features: TenantActiveFeature[];
    loading: boolean;
    hasLoaded: boolean;
    
    fetchFeatures: (force?: boolean) => Promise<void>;
    updateLocalFeature: (id: string, value: string) => void;
}

export const useTenantFeatureStore = create<TenantFeatureState>((set, get) => ({
    features: [],
    loading: false,
    hasLoaded: false,

    fetchFeatures: async (force = false) => {
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const res = await additionalFeatureApi.getTenantFeatures();
            if (res.success) {
                // For tenant, we only show features that are active
                const activeFeatures = res.data?.filter(f => f.active && f.mst_active) || [];
                set({ 
                    features: activeFeatures, 
                    hasLoaded: true 
                });
            }
        } catch (error) {
            toast.error('Failed to load additional features');
        } finally {
            set({ loading: false });
        }
    },

    updateLocalFeature: (id: string, value: string) => {
        set((state) => ({
            features: state.features.map((f) => 
                f.additional_feature_id === id ? { ...f, input_tenant_data: value } : f
            )
        }));
    },
}));
