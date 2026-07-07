import { create } from 'zustand';
import type { ReactNode } from 'react';

/**
 * Lets a content page inject an action button (or any node) into the AdminLayout
 * gold header, rendered next to the "Buka Undangan" shortcut. The page sets it
 * on mount and clears it on unmount via the useAdminHeaderAction hook below.
 *
 * Only used by the new /admin layout — the legacy /private DashboardLayout
 * ignores it.
 */
interface AdminHeaderActionStore {
    action: ReactNode | null;
    setAction: (node: ReactNode | null) => void;
}

export const useAdminHeaderActionStore = create<AdminHeaderActionStore>((set) => ({
    action: null,
    setAction: (node) => set({ action: node }),
}));
