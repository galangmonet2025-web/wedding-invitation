import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant, TokenPayload, Role } from '@/types';

interface AuthState {
    token: string | null;
    user: User | null;
    tenant: Tenant | null;
    isAuthenticated: boolean;

    setAuth: (token: string, user: User, tenant: Tenant) => void;
    setUser: (user: User) => void;
    logout: () => void;
    // Accepts a full tenant OR a partial patch. A patch is MERGED onto the current
    // tenant so consecutive calls (e.g. save theme then save quotes in the same
    // flow) don't clobber each other via stale `{...tenant}` snapshots.
    updateTenant: (patch: Partial<Tenant>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            tenant: null,
            isAuthenticated: false,

            setAuth: (token: string, user: User, tenant: Tenant) =>
                set({
                    token,
                    user,
                    tenant,
                    isAuthenticated: true,
                }),

            setUser: (user: User) => set({ user }),

            logout: () =>
                set({
                    token: null,
                    user: null,
                    tenant: null,
                    isAuthenticated: false,
                }),

            // Merge the patch onto the CURRENT tenant (from the latest state), so a
            // caller passing only { theme_id } can't wipe quotes_id (and vice-versa),
            // and two updates in the same tick don't overwrite each other's fields.
            updateTenant: (patch: Partial<Tenant>) =>
                set((state) => ({
                    tenant: state.tenant ? ({ ...state.tenant, ...patch } as Tenant) : (patch as Tenant),
                })),
        }),
        {
            name: 'wedding-saas-auth',
            storage: {
                getItem: (name) => {
                    const str = sessionStorage.getItem(name);
                    return str ? JSON.parse(str) : null;
                },
                setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
                removeItem: (name) => sessionStorage.removeItem(name),
            },
            partialize: (state: AuthState) => ({
                token: state.token,
                user: state.user,
                tenant: state.tenant,
                isAuthenticated: state.isAuthenticated,
            } as AuthState),
        }
    )
);
