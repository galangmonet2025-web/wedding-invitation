import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { User, Tenant } from '@/types';

/**
 * ImpersonatePage
 * Opened in a new tab by superadmin. Reads auth data from URL params,
 * stores it in the authStore (persisted to localStorage), then redirects
 * to the tenant dashboard.
 */
export function ImpersonatePage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { setAuth } = useAuthStore();

    useEffect(() => {
        const raw = params.get('data');
        if (!raw) {
            navigate('/login');
            return;
        }
        try {
            const { token, user, tenant } = JSON.parse(atob(raw)) as {
                token: string;
                user: User;
                tenant: Tenant;
            };
            setAuth(token, user, tenant);
            navigate('/dashboard', { replace: true });
        } catch {
            navigate('/login');
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Membuka sesi tenant...</p>
            </div>
        </div>
    );
}
