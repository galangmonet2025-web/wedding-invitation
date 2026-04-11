import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant, TokenPayload, Role } from '@/types';

interface AuthState {
    token: string | null;
    user: User | null;
    tenant: Tenant | null;
    isAuthenticated: boolean;

    setAuth: (token: string, user: User, tenant: Tenant) => void;
    logout: () => void;
    updateTenant: (tenant: Tenant) => void;
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

            logout: () =>
                set({
                    token: null,
                    user: null,
                    tenant: null,
                    isAuthenticated: false,
                }),

            updateTenant: (tenant: Tenant) => set({ tenant }),
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
