import { create } from 'zustand';
import { ActivityLog } from '@/types';
import { activityApi } from '@/core/api/endpoints';

interface ActivityState {
    logs: ActivityLog[];
    lastUpdated: number | null;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    fetchLogs: (force?: boolean) => Promise<void>;
    setLogs: (logs: ActivityLog[]) => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
    logs: [],
    lastUpdated: null,
    isLoading: false,
    error: null,

    fetchLogs: async (force = false) => {
        const { lastUpdated, isLoading, logs } = get();
        
        // Cache for 5 minutes unless forced
        const isStale = !lastUpdated || (Date.now() - lastUpdated > 5 * 60 * 1000);
        
        if (!force && !isStale && logs.length > 0) return;
        if (isLoading) return;

        set({ isLoading: true, error: null });
        try {
            const res = await activityApi.getActivityLogs();
            if (res.success) {
                set({ 
                    logs: res.data, 
                    lastUpdated: Date.now(),
                    isLoading: false 
                });
            } else {
                set({ error: res.message, isLoading: false });
            }
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch logs', isLoading: false });
        }
    },

    setLogs: (logs: ActivityLog[]) => {
        set({ logs, lastUpdated: Date.now() });
    }
}));
