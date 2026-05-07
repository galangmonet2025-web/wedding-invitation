import { create } from 'zustand';
import { paymentApi } from '@/core/api/endpoints';
import type { MstPlanType, MstPlanFeature } from '@/types';
import toast from 'react-hot-toast';

interface PlanState {
    plans: MstPlanType[];
    allFeatures: MstPlanFeature[];
    loading: boolean;
    hasLoaded: boolean;
    lastFetched: number | null;
    
    fetchData: (force?: boolean, silent?: boolean) => Promise<void>;
    setPlans: (plans: MstPlanType[]) => void;
    setAllFeatures: (features: MstPlanFeature[]) => void;
    updatePlanInStore: (plan_type: string, updates: Partial<MstPlanType>) => void;
    updateFeatureInStore: (id: string, updates: Partial<MstPlanFeature>) => void;
}

export const usePlanStore = create<PlanState>((set, get) => ({
    plans: [],
    allFeatures: [],
    loading: false,
    hasLoaded: false,
    lastFetched: null,

    fetchData: async (force = false, silent = false) => {
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
            const [planRes, featRes] = await Promise.all([
                paymentApi.getPlanTypes(config),
                paymentApi.getPlanFeatures(undefined, config)
            ]);
            
            if (planRes.success && featRes.success) {
                set({ 
                    plans: planRes.data || [], 
                    allFeatures: featRes.data || [],
                    lastFetched: now,
                    hasLoaded: true 
                });
            }
        } catch (error) {
            toast.error('Gagal mengambil data konfigurasi paket');
        } finally {
            set({ loading: false });
        }
    },

    setPlans: (plans) => set({ plans }),
    
    setAllFeatures: (allFeatures) => set({ allFeatures }),

    updatePlanInStore: (plan_type, updates) => {
        set((state) => ({
            plans: state.plans.map((p) => 
                p.plan_type === plan_type ? { ...p, ...updates } : p
            )
        }));
    },

    updateFeatureInStore: (id, updates) => {
        set((state) => ({
            allFeatures: state.allFeatures.map((f) => 
                f.id === id ? { ...f, ...updates } : f
            )
        }));
    }
}));
