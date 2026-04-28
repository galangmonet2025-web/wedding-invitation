import { create } from 'zustand';
import { WebsiteConfig } from '@/types';
import { websiteConfigApi } from '@/core/api/endpoints';

interface WebsiteConfigState {
    config: WebsiteConfig | null;
    lastUpdated: number | null;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    fetchConfig: (force?: boolean) => Promise<void>;
    updateLocalConfig: (config: WebsiteConfig) => void;
    setConfig: (config: WebsiteConfig) => void;
}

export const useWebsiteConfigStore = create<WebsiteConfigState>((set, get) => ({
    config: null,
    lastUpdated: null,
    isLoading: false,
    error: null,

    fetchConfig: async (force = false) => {
        const { lastUpdated, isLoading } = get();
        
        // Cache for 5 minutes unless forced
        const isStale = !lastUpdated || (Date.now() - lastUpdated > 5 * 60 * 1000);
        
        if (!force && !isStale && get().config) return;
        if (isLoading) return;

        set({ isLoading: true, error: null });
        try {
            const res = await websiteConfigApi.getConfig();
            if (res.success) {
                set({ 
                    config: res.data, 
                    lastUpdated: Date.now(),
                    isLoading: false 
                });
            } else {
                set({ error: res.message, isLoading: false });
            }
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch config', isLoading: false });
        }
    },

    updateLocalConfig: (config: WebsiteConfig) => {
        set({ config });
    },

    setConfig: (config: WebsiteConfig) => {
        set({ config, lastUpdated: Date.now() });
    }
}));
