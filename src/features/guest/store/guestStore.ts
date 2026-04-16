import { create } from 'zustand';
import { guestApi } from '@/core/api/endpoints';
import type { Guest, GuestFilters, CreateGuestRequest, UpdateGuestRequest } from '@/types';
import toast from 'react-hot-toast';

interface GuestState {
    guests: Guest[];
    total: number;
    totalPages: number;
    loading: boolean;
    filters: GuestFilters;
    selectedIds: string[];

    setFilters: (filters: Partial<GuestFilters>) => void;
    setSelectedIds: (ids: string[]) => void;
    fetchGuests: () => Promise<void>;
    createGuest: (data: CreateGuestRequest) => Promise<boolean>;
    updateGuest: (data: UpdateGuestRequest, silent?: boolean) => Promise<boolean>;
    deleteGuest: (id: string) => Promise<boolean>;
    bulkDelete: () => Promise<boolean>;
    bulkCreateGuests: (guests: CreateGuestRequest[]) => Promise<{ successCount: number; failedItems: CreateGuestRequest[] }>;
    updateBlastStatus: (id: string, sent: boolean, silent?: boolean) => Promise<boolean>;
}

export const useGuestStore = create<GuestState>((set, get) => ({
    guests: [],
    total: 0,
    totalPages: 0,
    loading: false,
    filters: {
        search: '',
        status: '',
        category: '',
        page: 1,
        limit: 10,
    },
    selectedIds: [],

    setFilters: (newFilters: Partial<GuestFilters>) =>
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        })),

    setSelectedIds: (ids: string[]) => set({ selectedIds: ids }),

    fetchGuests: async () => {
        set({ loading: true });
        try {
            const response = await guestApi.getGuests(get().filters);
            if (response.success) {
                set({
                    guests: response.data.items,
                    total: response.data.total,
                    totalPages: response.data.total_pages,
                });
            }
        } catch {
            // Use mock data for demo
            const mockGuests: Guest[] = Array.from({ length: 15 }, (_, i) => ({
                id: `g${i + 1}`,
                tenant_id: 't1',
                name: ['Ahmad Rizki', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Fajar Nugraha', 'Gita Savitri', 'Hadi Wibowo', 'Indah Permata', 'Joko Widodo', 'Kartini', 'Lukman Hakim', 'Maya Sari', 'Nur Hidayah', 'Oscar Pratama', 'Putri Diana'][i],
                phone: `0812${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
                category: ['Family', 'Friends', 'Work', 'VIP'][Math.floor(Math.random() * 4)],
                invitation_code: `WED-${String(1000 + i).padStart(4, '0')}`,
                status: (['confirmed', 'declined', 'pending'] as const)[Math.floor(Math.random() * 3)],
                number_of_guests: Math.floor(Math.random() * 3) + 1,
                checkin_status: Math.random() > 0.5 ? 'checked_in' : 'not_checked_in',
                created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
            }));

            const { search, status, category, page, limit } = get().filters;
            let filtered = mockGuests;
            if (search) filtered = filtered.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
            if (status) filtered = filtered.filter((g) => g.status === status);
            if (category) filtered = filtered.filter((g) => g.category === category);

            const startIdx = (page - 1) * limit;
            const paged = filtered.slice(startIdx, startIdx + limit);

            set({
                guests: paged,
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / limit),
            });
        } finally {
            set({ loading: false });
        }
    },

    createGuest: async (data: CreateGuestRequest) => {
        try {
            const response = await guestApi.createGuest(data);
            if (response.success) {
                toast.success('Guest added successfully');
                get().fetchGuests();
                return true;
            }
            toast.error(response.message);
            return false;
        } catch {
            toast.error('Failed to add guest');
            return false;
        }
    },

    updateGuest: async (data: UpdateGuestRequest, silent = false) => {
        if (!silent) set({ loading: true });
        try {
            const response = await guestApi.updateGuest(data);
            if (response.success) {
                if (!silent) {
                    toast.success('Guest updated successfully');
                    get().fetchGuests();
                } else {
                    // Update local state directly for silent mode
                    set(state => ({
                        guests: state.guests.map(g => g.id === data.id ? { ...g, ...data } : g)
                    }));
                }
                return true;
            }
            if (!silent) toast.error(response.message);
            return false;
        } catch {
            if (!silent) toast.error('Failed to update guest');
            return false;
        } finally {
            if (!silent) set({ loading: false });
        }
    },

    deleteGuest: async (id: string) => {
        try {
            const response = await guestApi.deleteGuest(id);
            if (response.success) {
                toast.success('Guest deleted');
                get().fetchGuests();
                return true;
            }
            toast.error(response.message);
            return false;
        } catch {
            toast.error('Failed to delete guest');
            return false;
        }
    },

    bulkDelete: async () => {
        const { selectedIds } = get();
        if (selectedIds.length === 0) return false;
        try {
            const response = await guestApi.bulkDeleteGuests(selectedIds);
            if (response.success) {
                toast.success(`${selectedIds.length} guests deleted`);
                set({ selectedIds: [] });
                get().fetchGuests();
                return true;
            }
            toast.error(response.message);
            return false;
        } catch {
            toast.error('Failed to delete guests');
            return false;
        }
    },
    bulkCreateGuests: async (data: CreateGuestRequest[]) => {
        set({ loading: true });
        const CHUNK_SIZE = 10;
        let successCount = 0;
        let failedItems: CreateGuestRequest[] = [];

        try {
            for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                const chunk = data.slice(i, i + CHUNK_SIZE);
                const progress = Math.min(i + CHUNK_SIZE, data.length);
                
                const toastId = toast.loading(`Mengimpor tamu... (${progress}/${data.length})`);
                
                try {
                     // Always set overwrite to true as requested by user
                    const response = await guestApi.importGuests(chunk, true);
                    toast.dismiss(toastId);
                    
                    if (response.success) {
                        successCount += chunk.length;
                    } else {
                        failedItems = [...failedItems, ...chunk];
                        toast.error(`Gagal mengimpor batch ${Math.floor(i / CHUNK_SIZE) + 1}`);
                    }
                } catch (err) {
                    toast.dismiss(toastId);
                    failedItems = [...failedItems, ...chunk];
                    toast.error(`Error pada batch ${Math.floor(i / CHUNK_SIZE) + 1}`);
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} tamu berhasil diproses`);
                get().fetchGuests();
            }
            
            return { successCount, failedItems };
        } finally {
            set({ loading: false });
        }
    },

    updateBlastStatus: async (id: string, sent: boolean, silent = false) => {
        if (!silent) set({ loading: true });
        
        // Optimistic update
        const originalGuests = get().guests;
        if (silent) {
            set(state => ({
                guests: state.guests.map(g => 
                    g.id === id ? { ...g, flag_sudah_kirim_undangan_via_whatsapp: sent } : g
                )
            }));
        }

        try {
            const response = await guestApi.updateGuestBlastStatus(id, sent);
            if (response.success) {
                if (!silent) {
                    toast.success('Status blast diperbarui');
                    get().fetchGuests();
                }
                return true;
            }
            // Rollback on failure if silent
            if (silent) set({ guests: originalGuests });
            if (!silent) toast.error(response.message);
            return false;
        } catch {
            if (silent) set({ guests: originalGuests });
            if (!silent) toast.error('Gagal memperbarui status blast');
            return false;
        } finally {
            if (!silent) set({ loading: false });
        }
    },
}));
