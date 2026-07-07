import { createHashRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

// --- Eager: public entry points (invitation + landing + auth) ---
// These are what a guest hits first, so we don't want a chunk round-trip here.
import { InvitationPage } from '@/features/invitation/pages/InvitationPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { NewLandingPage } from '@/features/landing/pages/NewLandingPage';

// --- Lazy: the admin/tenant dashboard. These pull in heavy deps (Monaco,
// exceljs, jspdf, recharts, html2canvas, dnd-kit). A guest opening an
// invitation should never download any of this — code-splitting keeps the
// dashboard out of the public bundle entirely. ---
const DashboardLayout = lazy(() => import('@/core/layout/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const AdminLayout = lazy(() => import('@/core/layout/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminHomePage = lazy(() => import('@/features/dashboard/pages/AdminHomePage').then(m => ({ default: m.AdminHomePage })));
const ProtectedRoute = lazy(() => import('@/core/guards/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })));
const ImpersonatePage = lazy(() => import('@/features/auth/pages/ImpersonatePage').then(m => ({ default: m.ImpersonatePage })));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const GlobalDashboardPage = lazy(() => import('@/features/dashboard/pages/GlobalDashboardPage').then(m => ({ default: m.GlobalDashboardPage })));
const GuestPage = lazy(() => import('@/features/guest/pages/GuestPage').then(m => ({ default: m.GuestPage })));
const WhatsAppBlastPage = lazy(() => import('@/features/guest/pages/WhatsAppBlastPage').then(m => ({ default: m.WhatsAppBlastPage })));
const StaffPage = lazy(() => import('@/features/tenant/pages/StaffPage').then(m => ({ default: m.StaffPage })));
const ScannerPage = lazy(() => import('@/features/scanner/pages/ScannerPage').then(m => ({ default: m.ScannerPage })));
const TenantPage = lazy(() => import('@/features/tenant/pages/TenantPage').then(m => ({ default: m.TenantPage })));
const WishesPage = lazy(() => import('@/features/wishes/pages/WishesPage').then(m => ({ default: m.WishesPage })));
const GiftsPage = lazy(() => import('@/features/gifts/pages/GiftsPage').then(m => ({ default: m.GiftsPage })));
const ActivityPage = lazy(() => import('@/features/activity/pages/ActivityPage').then(m => ({ default: m.ActivityPage })));
const InvitationContentPage = lazy(() => import('@/features/invitation/pages/InvitationContentPage').then(m => ({ default: m.InvitationContentPage })));
const ManageThemesPage = lazy(() => import('@/features/admin/pages/ManageThemesPage').then(m => ({ default: m.ManageThemesPage })));
const ThemeEditorPage = lazy(() => import('@/features/admin/pages/ThemeEditorPage').then(m => ({ default: m.ThemeEditorPage })));
const WebsiteConfigPage = lazy(() => import('@/features/admin/pages/WebsiteConfigPage').then(m => ({ default: m.WebsiteConfigPage })));
const PlanConfigPage = lazy(() => import('@/features/admin/pages/PlanConfigPage').then(m => ({ default: m.PlanConfigPage })));
const LandingPage = lazy(() => import('@/features/landing/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AdditionalFeaturePage = lazy(() => import('@/features/admin/pages/AdditionalFeaturePage').then(m => ({ default: m.AdditionalFeaturePage })));
const TenantAdditionalFeaturePage = lazy(() => import('@/features/tenant/pages/TenantAdditionalFeaturePage').then(m => ({ default: m.TenantAdditionalFeaturePage })));
const ReviewPage = lazy(() => import('@/features/admin/pages/ReviewPage').then(m => ({ default: m.ReviewPage })));
const PaymentPage = lazy(() => import('@/features/payment/pages/PaymentPage').then(m => ({ default: m.PaymentPage })));
const TransactionMonitoringPage = lazy(() => import('@/features/admin/pages/TransactionMonitoringPage').then(m => ({ default: m.TransactionMonitoringPage })));
const CouponPage = lazy(() => import('@/features/admin/pages/CouponPage').then(m => ({ default: m.CouponPage })));
const MasterQuotesListPage = lazy(() => import('@/features/admin/pages/MasterQuotesListPage').then(m => ({ default: m.MasterQuotesListPage })));
const MasterQuotesFormPage = lazy(() => import('@/features/admin/pages/MasterQuotesFormPage').then(m => ({ default: m.MasterQuotesFormPage })));
const ArchiveRestorePage = lazy(() => import('@/features/admin/pages/ArchiveRestorePage').then(m => ({ default: m.ArchiveRestorePage })));

// Lightweight fallback shown while a lazy admin chunk loads.
function RouteFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-wedding-bg dark:bg-wedding-dark">
            <div className="w-10 h-10 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin" />
        </div>
    );
}

// Wrap a lazy element in a Suspense boundary so it can stream in.
function L(node: React.ReactNode) {
    return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

function AdditionalFeatureRouter() {
    const user = useAuthStore(state => state.user);
    if (user?.role === 'superadmin') {
        return <AdditionalFeaturePage />;
    }
    return <TenantAdditionalFeaturePage />;
}


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
                <a href="#/private/dashboard" className="btn-primary inline-block">Go to Dashboard</a>
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
                <a href="#/private/dashboard" className="btn-primary inline-block">Back to Dashboard</a>
            </div>
        </div>
    );
}

export const router = createHashRouter([
    {
        path: '/',
        children: [
            {
                index: true,
                element: <Navigate to="/landing-page" replace />,
            },
            {
                path: 'home',
                element: L(<LandingPage />),
            },
            {
                path: 'landing-page',
                element: <NewLandingPage />,
            },
            {
                path: 'login',
                element: <LoginPage />,
            },
            {
                path: 'register',
                element: <RegisterPage />,
            },
            {
                path: 'private',
                children: [

                    
                    {
                        path: 'impersonate',
                        element: L(<ImpersonatePage />),
                    },
                    {
                        path: '',
                        element: L(
                            <ProtectedRoute>
                                <DashboardLayout />
                            </ProtectedRoute>
                        ),
                        children: [
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
                                path: 'whatsapp-blast',
                                element: (
                                    <ProtectedRoute allowedRoles={['tenant_admin', 'superadmin']}>
                                        <WhatsAppBlastPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'staff',
                                element: (
                                    <ProtectedRoute allowedRoles={['tenant_admin']}>
                                        <StaffPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'scanner',
                                element: (
                                    <ProtectedRoute allowedRoles={['tenant_admin', 'staff']}>
                                        <ScannerPage />
                                    </ProtectedRoute>
                                ),
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
                                path: 'themes',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <ManageThemesPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'themes/editor/:id',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <ThemeEditorPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'website-config',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <WebsiteConfigPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'plan-config',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <PlanConfigPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'reviews',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <ReviewPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'master-quotes',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <MasterQuotesListPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'master-quotes/new',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <MasterQuotesFormPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'master-quotes/edit/:id',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <MasterQuotesFormPage />
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
                                path: 'invitation-content',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin', 'tenant_admin']}>
                                        <InvitationContentPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'additional-features',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin', 'tenant_admin']}>
                                        <AdditionalFeatureRouter />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'payments',
                                element: (
                                    <ProtectedRoute allowedRoles={['tenant_admin']}>
                                        <PaymentPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'transactions',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <TransactionMonitoringPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'coupons',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <CouponPage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'archive-restore',
                                element: (
                                    <ProtectedRoute allowedRoles={['superadmin']}>
                                        <ArchiveRestorePage />
                                    </ProtectedRoute>
                                ),
                            },
                            {
                                path: 'unauthorized',
                                element: <UnauthorizedPage />,
                            },
                        ],
                    },
                ],
            },
            {
                // NEW admin experience — a bold & colorful, mobile-first re-skin
                // of the exact same page components used under /private. The
                // legacy /private tree above is intentionally left untouched;
                // this is a parallel tree so both URLs keep working.
                path: 'admin',
                element: L(
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                ),
                children: [
                    { index: true, element: <Navigate to="/admin/dashboard" replace /> },
                    { path: 'dashboard', element: <AdminHomePage /> },
                    {
                        path: 'global-dashboard',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <GlobalDashboardPage />
                            </ProtectedRoute>
                        ),
                    },
                    { path: 'guests', element: <GuestPage /> },
                    {
                        path: 'whatsapp-blast',
                        element: (
                            <ProtectedRoute allowedRoles={['tenant_admin', 'superadmin']}>
                                <WhatsAppBlastPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'staff',
                        element: (
                            <ProtectedRoute allowedRoles={['tenant_admin']}>
                                <StaffPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'scanner',
                        element: (
                            <ProtectedRoute allowedRoles={['tenant_admin', 'staff']}>
                                <ScannerPage />
                            </ProtectedRoute>
                        ),
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
                        path: 'themes',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <ManageThemesPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'themes/editor/:id',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <ThemeEditorPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'website-config',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <WebsiteConfigPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'plan-config',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <PlanConfigPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'reviews',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <ReviewPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'master-quotes',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <MasterQuotesListPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'master-quotes/new',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <MasterQuotesFormPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'master-quotes/edit/:id',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <MasterQuotesFormPage />
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
                        path: 'invitation-content',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin', 'tenant_admin']}>
                                <InvitationContentPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'additional-features',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin', 'tenant_admin']}>
                                <AdditionalFeatureRouter />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'payments',
                        element: (
                            <ProtectedRoute allowedRoles={['tenant_admin']}>
                                <PaymentPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'transactions',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <TransactionMonitoringPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'coupons',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <CouponPage />
                            </ProtectedRoute>
                        ),
                    },
                    {
                        path: 'archive-restore',
                        element: (
                            <ProtectedRoute allowedRoles={['superadmin']}>
                                <ArchiveRestorePage />
                            </ProtectedRoute>
                        ),
                    },
                    { path: 'unauthorized', element: <UnauthorizedPage /> },
                ],
            },
            {
                // Theme preview URL: forces a specific theme (by code) onto a real
                // tenant's invitation, e.g. /#/preview/kode-tema/dini-galang?guestid=XXX
                path: 'preview/:themeCode/:slug',
                element: <InvitationPage />,
            },
            {
                path: ':slug',
                element: <InvitationPage />,
            },
        ],
    },
    {
        path: '*',
        element: <NotFoundPage />,
    },
]);
