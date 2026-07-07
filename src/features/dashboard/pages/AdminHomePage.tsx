import { NavLink } from 'react-router-dom';
import { useAdminNavItems, serviceIconTint } from '@/core/layout/AdminLayout';
import { DashboardPage } from './DashboardPage';
import { GlobalDashboardPage } from './GlobalDashboardPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTranslation } from 'react-i18next';

/**
 * Gojek-style Home for the /admin experience: a colorful service-icon grid
 * (all menu shortcuts) sitting above the real dashboard content. The grid is
 * the signature "app home" feel; the dashboard below is the existing page,
 * reused verbatim so all its logic (stats, charts, review modal) stays intact.
 *
 * Superadmins (who have no tenant dashboard) get the platform GlobalDashboard
 * underneath instead.
 */
export function AdminHomePage() {
    const items = useAdminNavItems();
    const { user } = useAuthStore();
    const { t } = useTranslation();

    const isSuperAdmin = user?.role === 'superadmin';
    const isImpersonating = !!(user as any)?.is_impersonating;
    const showTenantMenu = !isSuperAdmin || isImpersonating;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Service grid (Gojek-style). Sits just below the header with a
                comfortable gap — no negative overlap so nothing feels cramped. */}
            <div className="mt-1 relative z-10 bg-white dark:bg-wedding-dark-card rounded-3xl shadow-[0_4px_20px_-6px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-gray-800 p-5 lg:p-6">
                <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-8 gap-y-6 gap-x-2">
                    {items.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.to === '/admin/dashboard'} className="admin-service">
                            <span className={`admin-service-icon ${serviceIconTint(item.color)}`}>
                                <item.icon className="w-6 h-6" />
                            </span>
                            <span className="admin-service-label">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Section label */}
            <h3 className="px-1 text-sm font-black text-gray-700 dark:text-gray-200">
                {t('dashboard.overview', 'Ringkasan')}
            </h3>

            {/* Real dashboard content, reused as-is */}
            {showTenantMenu ? <DashboardPage /> : <GlobalDashboardPage />}
        </div>
    );
}
