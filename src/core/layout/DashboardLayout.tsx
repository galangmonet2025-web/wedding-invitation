import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { additionalFeatureApi } from '@/core/api/endpoints';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import {
    HiOutlineHome,
    HiOutlineUsers,
    HiOutlineHeart,
    HiOutlineGift,
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineLogout,
    HiOutlineMenu,
    HiOutlineX,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineOfficeBuilding,
    HiOutlineChartBar,
    HiOutlineDocumentText,
    HiOutlineUserAdd,
    HiOutlineQrcode,
    HiOutlineColorSwatch,
    HiOutlineChatAlt2,
    HiOutlinePuzzle,
    HiOutlineKey,
    HiOutlineExternalLink,
    HiOutlineCreditCard,
    HiOutlineAdjustments,
} from 'react-icons/hi';
import { useThemeStore } from '@/shared/hooks/useThemeStore';
import { BackgroundTaskIndicator } from '@/shared/components/BackgroundTaskIndicator';
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal';

function MobileMenuOverlay({
    isOpen,
    onClose,
    items,
    user,
    tenant,
    onLogout,
    onChangePassword,
    t,
    isDark,
    toggleTheme,
    isSuperAdmin
}: any) {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] lg:hidden animate-fade-in overflow-hidden ${isDark ? 'dark' : ''}`}>
            {/* Background with animated blur */}
            <div className="absolute inset-0 bg-white/95 dark:bg-wedding-dark backdrop-blur-2xl" />

            {/* Decorative background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-gold-400/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-gold-600/10 rounded-full blur-3xl animate-pulse" />

            <div className="relative h-full flex flex-col p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                            <span className="text-white font-display font-bold text-lg">W</span>
                        </div>
                        <h1 className="font-display font-bold text-lg text-gray-800 dark:text-white">
                            Wedding<span className="text-gradient-gold">SaaS</span>
                        </h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-wedding-dark-card text-gray-500 active:scale-90 transition-transform"
                    >
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>

                {/* Tenant / User Welcome */}
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-gold-600 uppercase tracking-widest mb-1">{t('dashboard.welcome_back', 'Selamat Datang Kembali')}</p>
                        <h2 className="text-2xl font-display font-bold text-gray-800 dark:text-white leading-tight truncate">
                            {tenant
                                ? `${tenant.bride_nickname || tenant.bride_name.split(' ')[0]} & ${tenant.groom_nickname || tenant.groom_name.split(' ')[0]}`
                                : user?.username
                            }
                        </h2>
                    </div>

                    {/* Open Invitation Shortcut next to Nickname */}
                    {tenant?.domain_slug && !isSuperAdmin && (
                        <a
                            href={`${window.location.origin}${window.location.pathname}#/${tenant.domain_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className="w-10 h-10 bg-white dark:bg-wedding-dark-card border border-gray-150 dark:border-gray-800 rounded-2xl text-gold-500 shadow-sm flex items-center justify-center active:scale-90 transition-transform shrink-0"
                            title={t('topbar.open_invitation', 'Buka Undangan')}
                        >
                            <HiOutlineExternalLink className="w-5 h-5 text-gold-500" />
                        </a>
                    )}
                </div>

                {/* Grid Menu Container */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-10 px-1">
                    <div className="grid grid-cols-3 gap-3 p-1">
                        {items.map((item: any) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 active:scale-95 ${isActive
                                        ? 'bg-gold-500 text-white shadow-gold transform scale-105 z-10'
                                        : 'bg-white dark:bg-wedding-dark-card border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-450 shadow-sm'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-50 dark:bg-wedding-dark'
                                            }`}>
                                            <item.icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-[9px] font-bold text-center leading-tight uppercase tracking-wider h-7 flex items-center overflow-hidden">
                                            {item.label}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>

                    {/* Quick Settings Section for Mobile integrated into Profile Card below */}
                </div>

                {/* Bottom Profile & Actions */}
                <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-wedding-dark-card rounded-3xl border border-gray-100 dark:border-gray-800/50">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold shrink-0">
                                    <span className="text-white font-bold text-xl">{user?.username?.[0]?.toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{user?.username}</p>
                                    <p className="text-[10px] text-gold-600 font-bold uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
                                </div>
                            </div>

                            {/* 2 Compact Settings Icon Buttons inside Card */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* Language Switcher for Mobile */}
                                <LanguageSwitcher />

                                {/* Dark Mode Switcher for Mobile */}
                                <button
                                    onClick={toggleTheme}
                                    className="w-9 h-9 bg-white dark:bg-wedding-dark border border-gray-150 dark:border-gray-800 rounded-xl text-gray-500 hover:text-gold-500 shadow-sm flex items-center justify-center active:scale-90 transition-transform"
                                    aria-label="Toggle dark mode"
                                >
                                    {isDark ? (
                                        <HiOutlineSun className="w-4.5 h-4.5 text-gold-400" />
                                    ) : (
                                        <HiOutlineMoon className="w-4.5 h-4.5 text-gray-500" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { onClose(); onChangePassword(); }}
                            className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-wedding-dark-card border border-gray-100 dark:border-gray-800 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-400 active:scale-95 transition-all shadow-sm"
                        >
                            <HiOutlineKey className="w-5 h-5 text-gold-500" />
                            {t('sidebar.change_password')}
                        </button>
                        <button
                            onClick={onLogout}
                            className="flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/20 rounded-2xl text-xs font-bold text-red-600 active:scale-95 transition-all shadow-sm"
                        >
                            <HiOutlineLogout className="w-5 h-5" />
                            {t('sidebar.logout')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, tenant, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const location = useLocation();

    const getHeaderTitle = () => {
        if (location.pathname.startsWith('/private/themes/editor/')) {
            return t('theme_editor.title', 'Theme Editor');
        }

        // Exact match first
        const exactMatch = filteredNavItems.find(item => location.pathname === item.to);
        if (exactMatch) return exactMatch.label;

        // Prefix match for nested routes
        const prefixMatch = filteredNavItems.find(item => {
            return item.to !== '/private' && location.pathname.startsWith(item.to + '/');
        });
        if (prefixMatch) return prefixMatch.label;

        return isSuperAdmin ? t('topbar.superadmin_panel', 'Super Admin Panel') : t('topbar.wedding_dashboard', 'Wedding Dashboard');
    };

    const getHeaderDescription = () => {
        if (location.pathname.startsWith('/private/themes/editor/')) {
            return t('theme_editor.description', 'Sesuaikan visual, tata letak, dan detail undangan');
        }

        // Exact match first
        const exactMatch = filteredNavItems.find(item => location.pathname === item.to);
        if (exactMatch) return exactMatch.desc;

        // Prefix match for nested routes
        const prefixMatch = filteredNavItems.find(item => {
            return item.to !== '/private' && location.pathname.startsWith(item.to + '/');
        });
        if (prefixMatch) return prefixMatch.desc;

        return '';
    };

    // Fetch Global Website Config for Favicon
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { publicApi } = await import('@/core/api/endpoints');
                const { fetchProxyImageBase64 } = await import('@/shared/components/ProxyImage');
                const res = await publicApi.getWebsiteConfig();
                if (res.success && res.data.site_logo) {
                    const resolvedLogo = await fetchProxyImageBase64(res.data.site_logo);
                    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                    if (!favicon) {
                        favicon = document.createElement('link');
                        favicon.rel = 'icon';
                        document.head.appendChild(favicon);
                    }
                    favicon.href = resolvedLogo;
                }
            } catch (err) {
                console.error('Failed to load website config for favicon:', err);
            }
        };
        fetchConfig();
    }, []);
    const isSuperAdmin = user?.role === 'superadmin';
    const isImpersonating = !!(user as any)?.is_impersonating;
    // When impersonating, show tenant menus even though role is superadmin
    const showTenantMenu = !isSuperAdmin || isImpersonating;

    const handleLogout = () => {
        logout();
        sessionStorage.removeItem('review_fill_later');
        sessionStorage.removeItem('review_checked_this_session');

        // Force a full page reload on logout to wipe memory and prevent session leakage
        window.location.href = window.location.origin + window.location.pathname + '#/login';
    };

    const navItems = !showTenantMenu
        ? [
            { to: '/private/global-dashboard', icon: HiOutlineChartBar, label: t('sidebar.global_dashboard'), roles: ['superadmin'], desc: 'Statistik platform, estimasi pendapatan, dan fitur tertunda' },
            { to: '/private/tenants', icon: HiOutlineOfficeBuilding, label: t('sidebar.manage_tenants'), roles: ['superadmin'], desc: 'Kelola semua tenant pengguna, masa aktif, dan status data pernikahan' },
            { to: '/private/themes', icon: HiOutlineColorSwatch, label: t('sidebar.manage_themes'), roles: ['superadmin'], desc: 'Kelola database desain tema, template undangan, dan kategori plan' },
            { to: '/private/additional-features', icon: HiOutlinePuzzle, label: t('sidebar.additional_feature'), roles: ['superadmin'], desc: 'Konfigurasi add-on kustom, input tenant, dan hasil output admin' },
            { to: '/private/plan-config', icon: HiOutlineAdjustments, label: t('sidebar.plan_config', 'Konfigurasi Paket'), roles: ['superadmin'], desc: 'Atur harga paket basic/pro/premium, guest limit, dan list fitur benefit' },
            { to: '/private/transactions', icon: HiOutlineCreditCard, label: 'Monitoring Transaksi', roles: ['superadmin'], desc: 'Pantau riwayat pembayaran invoice, nominal transfer, dan status order' },
            { to: '/private/reviews', icon: HiOutlineChatAlt2, label: t('sidebar.review_rating'), roles: ['superadmin'], desc: 'Moderasi ulasan bintang, komentar feedback, dan testimoni pengguna' },
            { to: '/private/website-config', icon: HiOutlineCog, label: t('sidebar.website_config'), roles: ['superadmin'], desc: 'Atur identitas web, logo platform, kontak support, dan banner landing page' },
            { to: '/private/activity', icon: HiOutlineClipboardList, label: t('sidebar.system_activity'), roles: ['superadmin'], desc: 'Audit log sistem dan rekaman aktivitas administratif platform' },
        ]
        : [
            { to: '/private/dashboard', icon: HiOutlineHome, label: t('sidebar.dashboard'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: 'Ringkasan data RSVP tamu, ucapan selamat, dan kuota undangan Anda' },
            { to: '/private/scanner', icon: HiOutlineQrcode, label: t('sidebar.scanner_kehadiran', 'Scanner Kehadiran'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: 'Gunakan kamera scanner QR Code tamu untuk absensi meja resepsionis' },
            { to: '/private/guests', icon: HiOutlineUsers, label: t('sidebar.guests'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: 'Kelola database tamu undangan pernikahan, kategori grup, dan link sebar' },
            { to: '/private/whatsapp-blast', icon: HiOutlineChatAlt2, label: t('sidebar.whatsapp_blast'), roles: ['tenant_admin', 'superadmin'], desc: t('whatsapp_blast.description', 'Kirim undangan personal ke tamu via WhatsApp') },
            { to: '/private/staff', icon: HiOutlineDocumentText, label: t('sidebar.manage_staff'), roles: ['tenant_admin', 'superadmin'], desc: 'Kelola panitia penerima tamu di lokasi acara serta petugas scanner QR' },
            { to: '/private/invitation-content', icon: HiOutlineDocumentText, label: t('sidebar.content_settings'), roles: ['tenant_admin', 'superadmin'], desc: 'Ubah detail mempelai, jadwal akad & resepsi, kompilasi galeri foto, dan backsound' },
            { to: '/private/wishes', icon: HiOutlineHeart, label: t('sidebar.wishes'), roles: ['tenant_admin', 'superadmin'], desc: 'Kelola ucapan selamat dan doa restu yang dikirimkan oleh tamu undangan' },
            { to: '/private/gifts', icon: HiOutlineGift, label: t('sidebar.gifts'), roles: ['tenant_admin', 'superadmin'], desc: 'Atur rekening amplop digital, kiriman kado fisik, dan konfirmasi hadiah tamu' },
            { to: '/private/additional-features', icon: HiOutlinePuzzle, label: t('sidebar.additional_feature'), roles: ['tenant_admin', 'superadmin'], desc: 'Aktivasi, unggah data input, dan download output untuk menu add-on kustom' },
            { to: '/private/payments', icon: HiOutlineCreditCard, label: 'Pembayaran', roles: ['tenant_admin'], desc: 'Riwayat invoice pembayaran paket langganan serta pembelian fitur kustom' },
            { to: '/private/activity', icon: HiOutlineClipboardList, label: t('sidebar.activity_log'), roles: ['tenant_admin', 'superadmin'], desc: 'Lihat rekaman audit log perubahan data dan aktivitas penting pada undangan' },
        ];

    const filteredNavItems = navItems.filter((item) => item.roles.includes(user?.role || ''));

    return (
        <div className={`min-h-screen flex ${isDark ? 'dark' : ''}`}>
            {/* Mobile Menu Overlay */}
            <MobileMenuOverlay
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                items={filteredNavItems}
                user={user}
                tenant={tenant}
                onLogout={handleLogout}
                onChangePassword={() => setPasswordModalOpen(true)}
                t={t}
                isDark={isDark}
                toggleTheme={toggleTheme}
                isSuperAdmin={isSuperAdmin}
            />

            {/* Desktop Sidebar (Only visible on LG up) */}
            <aside
                className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-wedding-dark-card border-r border-gray-100 dark:border-gray-700 
        hidden lg:flex flex-col"
            >
                {/* Logo */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                            <span className="text-white font-display font-bold text-lg">W</span>
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-lg text-gray-800 dark:text-white">
                                Wedding<span className="text-gradient-gold">SaaS</span>
                            </h1>
                            <p className="text-xs text-gray-400">Platform Management</p>
                        </div>
                    </div>
                </div>

                {/* Tenant Info */}
                {tenant && showTenantMenu && (
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        {isImpersonating && (
                            <div className="mb-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-xs text-orange-700 dark:text-orange-400 font-medium flex items-center gap-1">
                                <span>👤</span> {t('sidebar.viewing_tenant', 'Viewing as Tenant')}
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                                <HiOutlineHeart className="w-4 h-4 text-gold-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                    {tenant.bride_name} & {tenant.groom_name}
                                </p>
                                <p className="text-xs text-gray-400">{tenant.domain_slug}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('sidebar.menu')}</p>
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User Info & Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{user?.username}</p>
                            <p className="text-xs text-gold-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setPasswordModalOpen(true)}
                        className="sidebar-link w-full mb-1 text-gray-600 dark:text-gray-300"
                    >
                        <HiOutlineKey className="w-5 h-5" />
                        <span>{t('sidebar.change_password')}</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                    >
                        <HiOutlineLogout className="w-5 h-5" />
                        <span>{t('sidebar.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 lg:ml-72 flex flex-col min-h-screen bg-wedding-bg dark:bg-wedding-dark overflow-hidden">
                {/* Topbar */}
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-wedding-dark-card/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between px-4 lg:px-8 h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <HiOutlineMenu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div className="flex flex-col justify-center">
                                {/* Breadcrumb / Context Badge */}
                                {isImpersonating && (
                                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 tracking-wider uppercase mb-0.5">
                                        Viewing as Tenant: {tenant?.bride_name} & {tenant?.groom_name}
                                    </span>
                                )}
                                {user?.role === 'staff' && (
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mb-0.5">
                                        Staff Receptionist: {tenant?.bride_name} & {tenant?.groom_name}
                                    </span>
                                )}

                                <h2 className="text-sm md:text-base font-black text-gray-800 dark:text-white leading-tight">
                                    {getHeaderTitle()}
                                </h2>
                                {getHeaderDescription() && (
                                    <p className="text-[9px] md:text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block truncate max-w-[280px] md:max-w-[450px]">
                                        {getHeaderDescription()}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-3">
                                {/* Open Invitation Shortcut */}
                                {tenant?.domain_slug && !isSuperAdmin && (
                                    <a
                                        href={`${window.location.origin}${window.location.pathname}#/${tenant.domain_slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gold-500 text-gray-500 hover:text-gold-600 transition-all flex items-center gap-2 group shadow-sm"
                                        title={t('topbar.open_invitation', 'Buka Undangan')}
                                    >
                                        <HiOutlineExternalLink className="w-5 h-5" />
                                        <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wider">{t('topbar.open_invitation', 'Buka Undangan')}</span>
                                    </a>
                                )}

                                {/* Background Tasks Indicator */}
                                <BackgroundTaskIndicator />

                                {/* Language Toggle */}
                                <LanguageSwitcher />

                                {/* Dark Mode Toggle */}
                                <button
                                    onClick={toggleTheme}
                                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                                    aria-label="Toggle dark mode"
                                >
                                    {isDark ? (
                                        <HiOutlineSun className="w-5 h-5 text-gold-400" />
                                    ) : (
                                        <HiOutlineMoon className="w-5 h-5 text-gray-500" />
                                    )}
                                </button>
                            </div>

                            {/* User Badge */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gold-50 dark:bg-gold-900/20 rounded-full">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-xs font-medium text-gold-700 dark:text-gold-400 capitalize">
                                    {user?.role?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-3 lg:p-8 overflow-y-auto">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="px-8 py-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-center text-xs text-gray-400">
                        © 2026 Wedding SaaS Platform. Built with ❤️
                    </p>
                </footer>
            </div>

            <ChangePasswordModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
            />
        </div>
    );
}
