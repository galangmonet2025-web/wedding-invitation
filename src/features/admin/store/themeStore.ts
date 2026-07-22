import { create } from 'zustand';
import { themeApi } from '@/core/api/endpoints';
import { Theme } from '@/types';
import toast from 'react-hot-toast';

interface ThemeState {
    themes: Theme[];
    loading: boolean;
    hasLoaded: boolean;
    
    fetchThemes: (force?: boolean, silent?: boolean) => Promise<void>;
    addTheme: (theme: Theme) => void;
    updateTheme: (id: string, updates: Partial<Theme>) => void;
    deleteTheme: (id: string) => Promise<boolean>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    themes: [],
    loading: false,
    hasLoaded: false,

    fetchThemes: async (force = false, silent = false) => {
        // Jika sudah pernah load dan tidak dipaksa refresh, gunakan cache
        if (get().hasLoaded && !force) return;

        // Revalidasi diam: kalau daftar tema lama sudah ada, refresh tanpa block-
        // loader global (stale-while-revalidate) supaya buka menu tak nge-block.
        const revalidateSilently = silent || get().hasLoaded;
        set({ loading: true });
        try {
            // skipTemplates: store ini memasok DAFTAR tema (kartu di Kelola Tema,
            // picker tenant) yang cuma perlu metadata. Isi html/css/js dimuat
            // terpisah oleh Theme Editor lewat getThemes tanpa flag ini.
            const res = await themeApi.getThemes(
                revalidateSilently ? ({ skipLoader: true } as any) : {},
                { skipTemplates: true }
            );
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
