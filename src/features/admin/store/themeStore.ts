import { create } from 'zustand';
import { themeApi } from '@/core/api/endpoints';
import { Theme } from '@/types';
import toast from 'react-hot-toast';

interface ThemeState {
    themes: Theme[];
    loading: boolean;
    hasLoaded: boolean;
    
    fetchThemes: (force?: boolean) => Promise<void>;
    addTheme: (theme: Theme) => void;
    updateTheme: (id: string, updates: Partial<Theme>) => void;
    deleteTheme: (id: string) => Promise<boolean>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    themes: [],
    loading: false,
    hasLoaded: false,

    fetchThemes: async (force = false) => {
        // Jika sudah pernah load dan tidak dipaksa refresh, gunakan cache
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const res = await themeApi.getThemes();
            if (res.success) {
                set({ 
                    themes: res.data, 
                    hasLoaded: true 
                });
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('Gagal memuat daftar tema');
        } finally {
            set({ loading: false });
        }
    },

    addTheme: (theme: Theme) => {
        set((state) => ({
            themes: [theme, ...state.themes]
        }));
    },

    updateTheme: (id: string, updates: Partial<Theme>) => {
        set((state) => ({
            themes: state.themes.map((t) => 
                t.id === id ? { ...t, ...updates } : t
            )
        }));
    },

    deleteTheme: async (id: string) => {
        try {
            // skipLoader: hapus pakai inline spinner di baris, bukan block-screen loader.
            const res = await themeApi.deleteTheme(id, { skipLoader: true });
            if (res.success) {
                set((state) => ({
                    themes: state.themes.filter((t) => t.id !== id)
                }));
                toast.success('Tema berhasil dihapus');
                return true;
            } else {
                toast.error(res.message);
                return false;
            }
        } catch (error) {
            toast.error('Gagal menghapus tema');
            return false;
        }
    }
}));
