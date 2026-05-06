import { create } from 'zustand';
import { additionalFeatureApi } from '@/core/api/endpoints';
import { TenantActiveFeature } from '@/types';
import toast from 'react-hot-toast';

interface TenantFeatureState {
    features: TenantActiveFeature[];
    availableFeatures: TenantActiveFeature[];
    loading: boolean;
    hasLoaded: boolean;
    
    fetchFeatures: (force?: boolean) => Promise<void>;
    updateLocalFeature: (id: string, value: string) => void;
    purchaseFeature: (featureId: string) => Promise<boolean>;
}

export const useTenantFeatureStore = create<TenantFeatureState>((set, get) => ({
    features: [],
    availableFeatures: [],
    loading: false,
    hasLoaded: false,

    fetchFeatures: async (force = false) => {
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const res = await additionalFeatureApi.getTenantFeatures();
            if (res.success) {
                // Split features into active (purchased) and available (not purchased yet)
                const allFeatures = res.data || [];
                const activeFeatures = allFeatures.filter(f => !!f.id);
                const unpurchasedFeatures = allFeatures.filter(f => !f.id);

                set({ 
                    features: activeFeatures, 
                    availableFeatures: unpurchasedFeatures,
                    hasLoaded: true 
                });
            }
        } catch (error) {
            toast.error('Gagal memuat fitur tambahan');
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

    purchaseFeature: async (featureId: string) => {
        set({ loading: true });
        try {
            const res = await additionalFeatureApi.updateTenantFeature({
                additional_feature_id: featureId
            });
            if (res.success) {
                toast.success('Permintaan aktivasi fitur berhasil dikirim');
                await get().fetchFeatures(true);
                return true;
            }
            return false;
        } catch (error) {
            toast.error('Gagal membeli fitur');
            return false;
        } finally {
            set({ loading: false });
        }
    }
}));
