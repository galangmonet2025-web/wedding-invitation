import { create } from 'zustand';
import { invitationContentApi } from '@/core/api/endpoints';
import { imageApi } from '@/core/api/imageApi';
import { InvitationContent, ImageRecord } from '@/types';
import toast from 'react-hot-toast';

interface InvitationContentState {
    content: Partial<InvitationContent> | null;
    images: ImageRecord[];
    loading: boolean;
    hasLoadedContent: boolean;
    hasLoadedImages: boolean;
    
    fetchContent: (force?: boolean, tenantData?: any) => Promise<void>;
    fetchImages: (force?: boolean) => Promise<void>;
    updateContent: (updates: Partial<InvitationContent>) => Promise<boolean>;
    setContent: (content: Partial<InvitationContent>) => void;
    addImage: (image: ImageRecord) => void;
    deleteImage: (id: string) => Promise<boolean>;
    bulkDeleteImages: (ids: string[]) => Promise<boolean>;
    removeImageLocally: (id: string) => void;
}

// Helpers to normalize data from GAS backend
const sanitizeValue = (val: any): string => {
    if (val === null || val === undefined || val === 'null') return '';
    return String(val);
};

const parseApiDate = (val: any): string => {
    if (!val || val === 'null') return '';
    const str = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            if (yyyy > 9999 || yyyy < 1900) return '';
            return `${yyyy}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
    } catch { /* ignore */ }
    return '';
};

const parseApiTime = (val: any): string => {
    if (!val || val === 'null') return '';
    const str = String(val);
    if (/^\d{2}:\d{2}$/.test(str)) return str;
    try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        }
    } catch { /* ignore */ }
    return '';
};

export const useInvitationContentStore = create<InvitationContentState>((set, get) => ({
    content: null,
    images: [],
    loading: false,
    hasLoadedContent: false,
    hasLoadedImages: false,

    setContent: (content) => set({ content }),

    fetchContent: async (force = false, tenantData = null) => {
        if (get().hasLoadedContent && !force) return;

        set({ loading: true });
        try {
            const res = await invitationContentApi.getContent();
            if (res.success && res.data) {
                const data = { ...res.data };
                
                // Sanitize null strings
                for (const key of Object.keys(data) as Array<keyof InvitationContent>) {
                    if (data[key] === 'null') (data as any)[key] = '';
                }

                // Normalization
                data.wedding_date = parseApiDate(data.wedding_date) || tenantData?.wedding_date || '';
                data.tanggal_akad = parseApiDate(data.tanggal_akad) || tenantData?.wedding_date || '';
                data.jam_awal_akad = parseApiTime(data.jam_awal_akad);
                data.jam_akhir_akad = parseApiTime(data.jam_akhir_akad);
                data.jam_awal_resepsi = parseApiTime(data.jam_awal_resepsi);
                data.jam_akhir_resepsi = parseApiTime(data.jam_akhir_resepsi);
                data.keterangan_lokasi_resepsi = sanitizeValue(data.keterangan_lokasi_resepsi);
                data.keterangan_lokasi_akad = sanitizeValue(data.keterangan_lokasi_akad);

                set({ 
                    content: data, 
                    hasLoadedContent: true 
                });
            }
        } catch (error) {
            console.error('Failed to fetch invitation content:', error);
        } finally {
            set({ loading: false });
        }
    },

    fetchImages: async (force = false) => {
        if (get().hasLoadedImages && !force) return;
        
        try {
            const res = await imageApi.getTenantImages();
            if (res.success) {
                set({ 
                    images: res.data, 
                    hasLoadedImages: true 
                });
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
        }
    },

    addImage: (image) => set((state) => {
        if (image.image_type === 'gallery') {
            return { images: [...state.images, image] };
        }
        // For single-type images, replace the existing one
        const filtered = state.images.filter(img => img.image_type !== image.image_type);
        return { images: [...filtered, image] };
    }),

    deleteImage: async (id: string) => {
        const originalImages = get().images;
        // Optimistic update
        set((state) => ({
            images: state.images.filter(img => img.id !== id)
        }));

        try {
            const res = await imageApi.deleteImage(id, { skipLoader: true } as any);
            if (res.success) {
                toast.success('Gambar berhasil dihapus');
                return true;
            }
            set({ images: originalImages });
            toast.error(res.message);
            return false;
        } catch (error) {
            set({ images: originalImages });
            toast.error('Gagal menghapus gambar');
            return false;
        }
    },

    // Batch delete: ONE request trashes every Drive file + removes its Images row
    // in a single sheet rewrite. Optimistically removes only the ids the backend
    // CONFIRMS deleted, restoring any that failed so no row is left orphaned.
    bulkDeleteImages: async (ids: string[]) => {
        if (!ids || ids.length === 0) return true;
        const originalImages = get().images;

        try {
            const res = await imageApi.deleteImages(ids, { skipLoader: true } as any);
            if (res.success) {
                const deleted = new Set(res.data?.deleted || []);
                const failed = res.data?.failed || [];
                // Remove only confirmed-deleted images; keep the rest untouched.
                set((state) => ({
                    images: state.images.filter(img => !deleted.has(img.id)),
                }));
                if (failed.length > 0) {
                    toast.error(`${deleted.size} foto dihapus, ${failed.length} gagal dan tetap dipertahankan.`);
                } else {
                    toast.success(`${deleted.size} foto berhasil dihapus`);
                }
                return failed.length === 0;
            }
            set({ images: originalImages });
            toast.error(res.message || 'Gagal menghapus foto');
            return false;
        } catch (error) {
            set({ images: originalImages });
            toast.error('Gagal menghapus foto');
            return false;
        }
    },

    updateContent: async (updates: Partial<InvitationContent>) => {
        try {
            const res = await invitationContentApi.updateContent(updates, { skipLoader: true } as any);
            if (res.success) {
                set((state) => ({
                    content: state.content ? { ...state.content, ...updates } : updates
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to update content:', error);
            return false;
        }
    },
    removeImageLocally: (id: string) => set((state) => ({
        images: state.images.filter(img => img.id !== id)
    })),
}));
