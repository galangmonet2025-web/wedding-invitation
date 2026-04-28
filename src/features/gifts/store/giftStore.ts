import { create } from 'zustand';
import { giftApi } from '@/core/api/endpoints';
import { Gift } from '@/types';

interface GiftState {
    gifts: Gift[];
    loading: boolean;
    hasLoaded: boolean;
    
    fetchGifts: (force?: boolean) => Promise<void>;
    addGift: (gift: Gift) => void;
    deleteGift: (id: string) => void;
}

export const useGiftStore = create<GiftState>((set, get) => ({
    gifts: [],
    loading: false,
    hasLoaded: false,

    fetchGifts: async (force = false) => {
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const response = await giftApi.getGifts();
            if (response.success) {
                set({ 
                    gifts: response.data, 
                    hasLoaded: true 
                });
            }
        } catch (error) {
            console.error('Failed to fetch gifts:', error);
        } finally {
            set({ loading: false });
        }
    },

    addGift: (gift: Gift) => {
        set((state) => ({
            gifts: [gift, ...state.gifts]
        }));
    },

    deleteGift: (id: string) => {
        set((state) => ({
            gifts: state.gifts.filter((g) => g.id !== id)
        }));
    },
}));
