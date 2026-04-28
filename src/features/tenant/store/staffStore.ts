import { create } from 'zustand';
import { staffApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';

interface StaffState {
    staffs: any[];
    loading: boolean;
    hasLoaded: boolean;
    
    fetchStaffs: (force?: boolean) => Promise<void>;
    addStaff: (staff: any) => void;
    deleteStaff: (id: string) => void;
}

export const useStaffStore = create<StaffState>((set, get) => ({
    staffs: [],
    loading: false,
    hasLoaded: false,

    fetchStaffs: async (force = false) => {
        if (get().hasLoaded && !force) return;

        set({ loading: true });
        try {
            const res = await staffApi.getStaffs();
            if (res.success && res.data) {
                set({ 
                    staffs: res.data, 
                    hasLoaded: true 
                });
            }
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        } finally {
            set({ loading: false });
        }
    },

    addStaff: (staff: any) => {
        set((state) => ({
            staffs: [...state.staffs, staff]
        }));
    },

    deleteStaff: (id: string) => {
        set((state) => ({
            staffs: state.staffs.filter((s) => s.id !== id)
        }));
    },
}));
