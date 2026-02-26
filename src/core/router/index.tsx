import { createHashRouter } from 'react-router-dom';
import { DashboardLayout } from '@/core/layout/DashboardLayout';
import { ProtectedRoute } from '@/core/guards/ProtectedRoute';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { GlobalDashboardPage } from '@/features/dashboard/pages/GlobalDashboardPage';
import { GuestPage } from '@/features/guest/pages/GuestPage';
import { TenantPage } from '@/features/tenant/pages/TenantPage';
import { WishesPage } from '@/features/wishes/pages/WishesPage';
import { GiftsPage } from '@/features/gifts/pages/GiftsPage';
import { ActivityPage } from '@/features/activity/pages/ActivityPage';
import { InvitationPage } from '@/features/invitation/pages/InvitationPage';
import { Navigate } from 'react-router-dom';

function UnauthorizedPage() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="card text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </div>
                <h2 className="text-xl font-display font-bold text-gray-800 dark:text-white mb-2">Access Denied</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">You don't have permission to access this page.</p>
                <a href="/dashboard" className="btn-primary inline-block">Go to Dashboard</a>
            </div>
        </div>
    );
}

function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-wedding-bg dark:bg-wedding-dark">
            <div className="card text-center max-w-md">
                <p className="text-6xl font-display font-bold text-gradient-gold mb-4">404</p>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Page Not Found</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
                <a href="/dashboard" className="btn-primary inline-block">Back to Dashboard</a>
            </div>
        </div>
    );
}

export const router = createHashRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },
    {
        path: '/invitation/:slug',
        element: <InvitationPage />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <DashboardLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: 'dashboard',
                element: <DashboardPage />,
            },
            {
                path: 'global-dashboard',
                element: (
                    <ProtectedRoute allowedRoles={['superadmin']}>
                        <GlobalDashboardPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'guests',
                element: <GuestPage />,
            },
            {
                path: 'tenants',
                element: (
                    <ProtectedRoute allowedRoles={['superadmin']}>
                        <TenantPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'wishes',
                element: (
                    <ProtectedRoute allowedRoles={['superadmin', 'tenant_admin']}>
                        <WishesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'gifts',
                element: (
                    <ProtectedRoute allowedRoles={['superadmin', 'tenant_admin']}>
                        <GiftsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'activity',
                element: (
                    <ProtectedRoute allowedRoles={['superadmin', 'tenant_admin']}>
                        <ActivityPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'unauthorized',
                element: <UnauthorizedPage />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
