import { create } from 'zustand';
import { invitationContentApi } from '@/core/api/endpoints';
import { InvitationContent } from '@/types';

interface InvitationContentState {
    content: InvitationContent | null;
    loading: boolean;
    hasLoaded: boolean;
    
    fetchContent: (force?: boolean) => Promise<void>;
    updateContent: (updates: Partial<InvitationContent>) => Promise<boolean>;
}

export const useInvitationContentStore = create<InvitationContentState>((set, get) => ({
    content: null,
    loading: false,
    hasLoaded: false,

    fetchContent: async (force = false) => {
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const res = await invitationContentApi.getContent();
            if (res.success && res.data) {
                set({ 
                    content: res.data, 
                    hasLoaded: true 
                });
            }
        } catch (error) {
            console.error('Failed to fetch invitation content:', error);
        } finally {
            set({ loading: false });
        }
    },

    updateContent: async (updates: Partial<InvitationContent>) => {
        try {
            const res = await invitationContentApi.updateContent(updates);
            if (res.success) {
                set((state) => ({
                    content: state.content ? { ...state.content, ...updates } : null
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to update content:', error);
            return false;
        }
    },
}));
