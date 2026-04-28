import { create } from 'zustand';
import { wishApi } from '@/core/api/endpoints';
import { Wish } from '@/types';

interface WishState {
    wishes: Wish[];
    loading: boolean;
    hasLoaded: boolean;
    
    fetchWishes: (force?: boolean) => Promise<void>;
    addWish: (wish: Wish) => void;
    deleteWish: (id: string) => void;
}

export const useWishStore = create<WishState>((set, get) => ({
    wishes: [],
    loading: false,
    hasLoaded: false,

    fetchWishes: async (force = false) => {
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const response = await wishApi.getWishes();
            if (response.success) {
                set({ 
                    wishes: response.data, 
                    hasLoaded: true 
                });
            }
        } catch (error) {
            console.error('Failed to fetch wishes:', error);
        } finally {
            set({ loading: false });
        }
    },

    addWish: (wish: Wish) => {
        set((state) => ({
            wishes: [wish, ...state.wishes]
        }));
    },

    deleteWish: (id: string) => {
        set((state) => ({
            wishes: state.wishes.filter((w) => w.id !== id)
        }));
    },
}));
