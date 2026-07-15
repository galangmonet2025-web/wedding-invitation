import { create } from 'zustand';
import { tenantApi } from '@/core/api/endpoints';
import { Tenant } from '@/types';
import toast from 'react-hot-toast';

interface TenantState {
    tenants: Tenant[];
    loading: boolean;
    hasLoaded: boolean;
    tenantFeaturesCache: Record<string, any[]>; // Cache for features per tenant
    
    // silent=true -> pakai skipLoader (tanpa block-screen loader global).
    fetchTenants: (force?: boolean, silent?: boolean) => Promise<void>;
    addTenant: (tenant: Tenant) => void;
    updateTenant: (id: string, updates: Partial<Tenant>) => void;
    setTenantFeatures: (tenantId: string, features: any[]) => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
    tenants: [],
    loading: false,
    hasLoaded: false,
    tenantFeaturesCache: {},

    fetchTenants: async (force = false, silent = false) => {
        if (get().hasLoaded && !force) return;

        // Revalidasi diam: kalau daftar tenant lama sudah ada (atau pemanggil minta
        // silent), refresh tanpa block-loader global — sama seperti themeStore.
        const revalidateSilently = silent || get().hasLoaded;
        set({ loading: true });
        try {
            const res = await tenantApi.getTenants(
                revalidateSilently ? ({ skipLoader: true } as any) : undefined
            );
            if (res.success) {
                set({ 
                    tenants: Array.isArray(res.data) ? res.data : [], 
                    hasLoaded: true 
                });
            }
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        } finally {
            set({ loading: false });
        }
    },

    addTenant: (tenant: Tenant) => {
        set((state) => ({
            tenants: [tenant, ...state.tenants]
        }));
    },

    updateTenant: (id: string, updates: Partial<Tenant>) => {
        set((state) => ({
            tenants: state.tenants.map((t) => 
                t.id === id ? { ...t, ...updates } : t
            )
        }));
    },

    setTenantFeatures: (tenantId: string, features: any[]) => {
        set((state) => ({
            tenantFeaturesCache: {
                ...state.tenantFeaturesCache,
                [tenantId]: features
            }
        }));
    },
}));
