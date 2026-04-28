import { create } from 'zustand';
import { tenantApi } from '@/core/api/endpoints';
import { Tenant } from '@/types';
import toast from 'react-hot-toast';

interface TenantState {
    tenants: Tenant[];
    loading: boolean;
    hasLoaded: boolean;
    tenantFeaturesCache: Record<string, any[]>; // Cache for features per tenant
    
    fetchTenants: (force?: boolean) => Promise<void>;
    addTenant: (tenant: Tenant) => void;
    updateTenant: (id: string, updates: Partial<Tenant>) => void;
    setTenantFeatures: (tenantId: string, features: any[]) => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
    tenants: [],
    loading: false,
    hasLoaded: false,
    tenantFeaturesCache: {},

    fetchTenants: async (force = false) => {
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const res = await tenantApi.getTenants();
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
