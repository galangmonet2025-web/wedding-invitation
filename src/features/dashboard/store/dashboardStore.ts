import { create } from 'zustand';
import { dashboardApi } from '@/core/api/endpoints';
import type { TenantDashboard } from '@/types';

interface DashboardState {
    tenantDashboard: TenantDashboard | null;
    globalDashboard: any | null;
    loading: boolean;
    hasLoadedTenant: boolean;
    hasLoadedGlobal: boolean;

    fetchTenantDashboard: (force?: boolean) => Promise<boolean>;
    fetchGlobalDashboard: (force?: boolean) => Promise<boolean>;
    clearDashboard: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    tenantDashboard: null,
    globalDashboard: null,
    loading: false,
    hasLoadedTenant: false,
    hasLoadedGlobal: false,

    fetchTenantDashboard: async (force = false) => {
        if (!force && get().hasLoadedTenant && get().tenantDashboard) {
            return true;
        }

        set({ loading: true });
        try {
            const res = await dashboardApi.getTenantDashboard();
            if (res.success) {
                set({ 
                    tenantDashboard: res.data, 
                    hasLoadedTenant: true,
                    loading: false 
                });
                return true;
            }
        } catch (error) {
            console.error('Failed to fetch tenant dashboard:', error);
        } finally {
            set({ loading: false });
        }
        return false;
    },

    fetchGlobalDashboard: async (force = false) => {
        if (!force && get().hasLoadedGlobal && get().globalDashboard) {
            return true;
        }

        set({ loading: true });
        try {
            const res = await dashboardApi.getGlobalDashboard();
            if (res.success) {
                set({ 
                    globalDashboard: res.data, 
                    hasLoadedGlobal: true,
                    loading: false 
                });
                return true;
            }
        } catch (error) {
            console.error('Failed to fetch global dashboard:', error);
        } finally {
            set({ loading: false });
        }
        return false;
    },

    clearDashboard: () => set({ 
        tenantDashboard: null, 
        globalDashboard: null, 
        hasLoadedTenant: false, 
        hasLoadedGlobal: false 
    })
}));
