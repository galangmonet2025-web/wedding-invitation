import { useState, useEffect, Suspense, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTranslation } from 'react-i18next';
import kosaIcon from '@/assets/img/kosa-icon.png';

import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import {
    HiOutlineHome,
    HiOutlineUsers,
    HiOutlineHeart,
    HiOutlineGift,
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineLogout,
    HiOutlineX,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineOfficeBuilding,
    HiOutlineChartBar,
    HiOutlineDocumentText,
    HiOutlineQrcode,
    HiOutlineColorSwatch,
    HiOutlineChatAlt2,
    HiOutlinePuzzle,
    HiOutlineKey,
    HiOutlineExternalLink,
    HiOutlineCreditCard,
    HiOutlineAdjustments,
    HiOutlineTicket,
    HiOutlineAnnotation,
    HiOutlineArchive,
    HiOutlineViewGrid,
    HiOutlineDesktopComputer,
    HiOutlineBadgeCheck,
} from 'react-icons/hi';
import type { IconType } from 'react-icons';
import { useThemeStore } from '@/shared/hooks/useThemeStore';
import { BackgroundTaskIndicator } from '@/shared/components/BackgroundTaskIndicator';
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useEnterFullscreenOnLogin } from '@/shared/hooks/useEnterFullscreenOnLogin';
import { FullscreenButton } from '@/shared/components/FullscreenButton';

export interface AdminNavItem {
    to: string;
    icon: IconType;
    label: string;
    roles: string[];
    desc: string;
    /** Vibrant per-item icon color for the Gojek-style service grid. */
    color: string;
}

/**
 * The service-grid used to fill each tile with a fully-saturated `bg-*-500`,
 * which read as a noisy rainbow. This maps that solid color to a SOFT tint
 * (light background + colored icon) so the grid feels calm & premium while each
 * item keeps its color identity. Falls back to a neutral tint for unknown keys.
 *
 * NOTE: class strings are spelled out in full so Tailwind's JIT can see them
 * (dynamic `bg-${c}-50` would be purged).
 */
const SERVICE_TINT: Record<string, string> = {
    'bg-gold-500': 'bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400',
    'bg-cyan-500': 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
    'bg-sky-500': 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    'bg-emerald-500': 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    'bg-teal-500': 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    'bg-pink-500': 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
    'bg-rose-500': 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    'bg-amber-500': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    'bg-fuchsia-500': 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400',
    'bg-violet-500': 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    'bg-indigo-500': 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    'bg-slate-500': 'bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300',
    'bg-yellow-500': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
};

/**
 * DULU memetakan tiap warna menu ke tint-nya sendiri, sehingga grid layanan
 * tampil sebagai pelangi. Sekarang SELURUH ikon memakai satu tint emas yang
 * senada dengan Home Page — parameter `color` sengaja diabaikan (tetap ada agar
 * pemanggilnya tak perlu diubah, dan SERVICE_TINT tetap jadi rujukan bila suatu
 * saat warna per-menu dihidupkan lagi).
 */
export function serviceIconTint(_color?: string): string {
    return 'bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400';
}

/**
 * Warna TEKS untuk badge jenis paket (basic/pro/premium) di pojok kanan gold
 * header — badge-nya berlatar putih, jadi cukup warnai teksnya. Casing dari
 * backend bisa bervariasi → di-lower dulu. Konvensi warna plan mengikuti
 * TenantPage (basic=biru, pro=amber, premium=gold).
 */
function planTextClass(plan?: string): string {
    switch (String(plan || '').toLowerCase().trim()) {
        case 'premium':
            return 'text-gold-600';
        case 'pro':
            return 'text-amber-600';
        default:
            return 'text-sky-600';
    }
}

/**
 * Menu definition shared by the AdminLayout chrome and the Gojek-style Home
 * service grid. Uses the /admin/* route tree (parity with /private/*) and a
 * vibrant per-item color for the service icons.
 */
export function useAdminNavItems(): AdminNavItem[] {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'superadmin';
    const isImpersonating = !!(user as any)?.is_impersonating;
    const showTenantMenu = !isSuperAdmin || isImpersonating;

    return useMemo(() => {
        const items: AdminNavItem[] = !showTenantMenu
            ? [
                { to: '/admin/global-dashboard', icon: HiOutlineChartBar, label: t('sidebar.global_dashboard'), roles: ['superadmin'], desc: t('sidebar.global_dashboard_desc', 'Statistik platform, estimasi pendapatan, dan fitur tertunda'), color: 'bg-violet-500' },
                { to: '/admin/tenants', icon: HiOutlineOfficeBuilding, label: t('sidebar.manage_tenants'), roles: ['superadmin'], desc: t('sidebar.manage_tenants_desc', 'Kelola semua tenant pengguna, masa aktif, dan status data pernikahan'), color: 'bg-sky-500' },
                { to: '/admin/themes', icon: HiOutlineColorSwatch, label: t('sidebar.manage_themes'), roles: ['superadmin'], desc: t('sidebar.manage_themes_desc', 'Kelola database desain tema, template undangan, dan kategori plan'), color: 'bg-pink-500' },
                { to: '/admin/master-quotes', icon: HiOutlineAnnotation, label: t('sidebar.master_quotes', 'Master Quotes'), roles: ['superadmin'], desc: t('sidebar.master_quotes_desc', 'Kelola katalog quotes undangan, atur quote default, dan status aktif'), color: 'bg-amber-500' },
                { to: '/admin/additional-features', icon: HiOutlinePuzzle, label: t('sidebar.additional_feature'), roles: ['superadmin'], desc: t('sidebar.additional_feature_desc', 'Konfigurasi add-on kustom, input tenant, dan hasil output admin'), color: 'bg-teal-500' },
                { to: '/admin/plan-config', icon: HiOutlineAdjustments, label: t('sidebar.plan_config', 'Konfigurasi Paket'), roles: ['superadmin'], desc: t('sidebar.plan_config_desc', 'Atur harga paket basic/pro/premium, guest limit, dan list fitur benefit'), color: 'bg-indigo-500' },
                { to: '/admin/transactions', icon: HiOutlineCreditCard, label: t('sidebar.monitoring_transactions', 'Monitoring Transaksi'), roles: ['superadmin'], desc: t('sidebar.monitoring_transactions_desc', 'Pantau riwayat pembayaran invoice, nominal transfer, dan status order'), color: 'bg-emerald-500' },
                { to: '/admin/coupons', icon: HiOutlineTicket, label: t('sidebar.coupon', 'Coupon'), roles: ['superadmin'], desc: t('sidebar.coupon_desc', 'Buat dan kelola kode promo diskon untuk pembayaran paket tenant'), color: 'bg-rose-500' },
                { to: '/admin/archive-restore', icon: HiOutlineArchive, label: t('sidebar.archive_restore', 'Archive & Restore'), roles: ['superadmin'], desc: t('sidebar.archive_restore_desc', 'Arsipkan data tenant untuk menghemat database, lalu pulihkan kapan saja'), color: 'bg-slate-500' },
                { to: '/admin/reviews', icon: HiOutlineChatAlt2, label: t('sidebar.review_rating'), roles: ['superadmin'], desc: t('sidebar.review_rating_desc', 'Moderasi ulasan bintang, komentar feedback, dan testimoni pengguna'), color: 'bg-yellow-500' },
                { to: '/admin/website-config', icon: HiOutlineCog, label: t('sidebar.website_config'), roles: ['superadmin'], desc: t('sidebar.website_config_desc', 'Atur identitas web, logo platform, kontak support, dan banner landing page'), color: 'bg-cyan-500' },
                { to: '/admin/activity', icon: HiOutlineClipboardList, label: t('sidebar.system_activity'), roles: ['superadmin'], desc: t('sidebar.system_activity_desc', 'Audit log sistem dan rekaman aktivitas administratif platform'), color: 'bg-fuchsia-500' },
            ]
            : [
                { to: '/admin/dashboard', icon: HiOutlineHome, label: t('sidebar.dashboard'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: t('sidebar.dashboard_desc', 'Ringkasan data RSVP tamu, ucapan selamat, dan kuota undangan Anda'), color: 'bg-gold-500' },
                { to: '/admin/invitation-content', icon: HiOutlineDocumentText, label: t('sidebar.content_settings'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.content_settings_desc', 'Ubah detail mempelai, jadwal akad & resepsi, kompilasi galeri foto, dan backsound'), color: 'bg-pink-500' },
                { to: '/admin/scanner', icon: HiOutlineQrcode, label: t('sidebar.scanner_kehadiran', 'Scanner Kehadiran'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: t('sidebar.scanner_kehadiran_desc', 'Gunakan kamera scanner QR Code tamu untuk absensi meja resepsionis'), color: 'bg-cyan-500' },
                { to: '/admin/guests', icon: HiOutlineUsers, label: t('sidebar.guests'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: t('sidebar.guests_desc', 'Kelola database tamu undangan pernikahan, kategori grup, dan link sebar'), color: 'bg-sky-500' },
                { to: '/admin/whatsapp-blast', icon: HiOutlineChatAlt2, label: t('sidebar.whatsapp_blast'), roles: ['tenant_admin', 'superadmin'], desc: t('whatsapp_blast.description', 'Kirim undangan personal ke tamu via WhatsApp'), color: 'bg-emerald-500' },
                { to: '/admin/staff', icon: HiOutlineDocumentText, label: t('sidebar.manage_staff'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.manage_staff_desc', 'Kelola panitia penerima tamu di lokasi acara serta petugas scanner QR'), color: 'bg-teal-500' },
                { to: '/admin/wishes', icon: HiOutlineHeart, label: t('sidebar.wishes'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.wishes_desc', 'Kelola ucapan selamat dan doa restu yang dikirimkan oleh tamu undangan'), color: 'bg-rose-500' },
                { to: '/admin/gifts', icon: HiOutlineGift, label: t('sidebar.gifts'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.gifts_desc', 'Atur rekening amplop digital, kiriman kado fisik, dan konfirmasi hadiah tamu'), color: 'bg-amber-500' },
                { to: '/admin/additional-features', icon: HiOutlinePuzzle, label: t('sidebar.additional_feature'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.additional_feature_desc', 'Aktivasi, unggah data input, dan download output untuk menu add-on kustom'), color: 'bg-fuchsia-500' },
                { to: '/admin/payments', icon: HiOutlineCreditCard, label: t('sidebar.payments', 'Pembayaran'), roles: ['tenant_admin'], desc: t('sidebar.payments_desc', 'Riwayat invoice pembayaran paket langganan serta pembelian fitur kustom'), color: 'bg-indigo-500' },
                { to: '/admin/activity', icon: HiOutlineClipboardList, label: t('sidebar.activity_log'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.activity_log_desc', 'Lihat rekaman audit log perubahan data dan aktivitas penting pada undangan'), color: 'bg-slate-500' },
            ];
        return items
            .filter((item) => item.roles.includes(user?.role || ''))
            .filter((item) => !(isImpersonating && item.to === '/admin/scanner'));
    }, [showTenantMenu, isImpersonating, user?.role, t]);
}

export function AdminLayout() {
    const [moreOpen, setMoreOpen] = useState(false);
    const { user, tenant, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const location = useLocation();

    // On mobile, enter fullscreen on the first tap after login (see hook).
    useEnterFullscreenOnLogin();

    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const [siteName, setSiteName] = useState('');
    const [siteLogo, setSiteLogo] = useState('');

    const isSuperAdmin = user?.role === 'superadmin';
    const isImpersonating = !!(user as any)?.is_impersonating;
    const showTenantMenu = !isSuperAdmin || isImpersonating;

    const filteredNavItems = useAdminNavItems();
    const headerAction = useAdminHeaderActionStore(s => s.action);

    // Favicon / site branding (mirrors the legacy layout so /admin looks native).
    useEffect(() => {
        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = kosaIcon;

        const fetchConfig = async () => {
            try {
                const { publicApi } = await import('@/core/api/endpoints');
                const { fetchProxyImageBase64 } = await import('@/shared/components/ProxyImage');
                const res = await publicApi.getWebsiteConfig();
                if (res.success) {
                    if (res.data.site_name) setSiteName(res.data.site_name);
                    if (res.data.site_logo) {
                        const resolvedLogo = await fetchProxyImageBase64(res.data.site_logo);
                        setSiteLogo(resolvedLogo);
                        const fav = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                        if (fav) fav.href = resolvedLogo;
                    }
                }
            } catch (err) {
                console.error('Failed to load website config for favicon:', err);
            }
        };
        fetchConfig();
    }, []);

    const handleLogout = () => {
        logout();
        sessionStorage.removeItem('review_fill_later');
        sessionStorage.removeItem('review_checked_this_session');
        window.location.href = window.location.origin + window.location.pathname + '#/login';
    };

    // Bottom nav = 4 primary items + a "Menu" entry that opens the full grid.
    const bottomNavItems = filteredNavItems.slice(0, 4);

    const isHome = location.pathname === '/admin' || location.pathname === '/admin/dashboard'
        || (showTenantMenu ? false : location.pathname === '/admin/global-dashboard');

    const activeItem = useMemo(() => {
        const exact = filteredNavItems.find(i => location.pathname === i.to);
        if (exact) return exact;
        return filteredNavItems.find(i => location.pathname.startsWith(i.to + '/'));
    }, [filteredNavItems, location.pathname]);

    const isThemeEditor = location.pathname.startsWith('/admin/themes/editor/');
    const headerTitle = isThemeEditor
        ? t('theme_editor.title', 'Theme Editor')
        : activeItem?.label ?? (isSuperAdmin ? t('topbar.superadmin_panel', 'Super Admin Panel') : t('topbar.wedding_dashboard', 'Wedding Dashboard'));
    const headerDesc = isThemeEditor
        ? t('theme_editor.description', 'Sesuaikan visual, tata letak, dan detail undangan')
        : activeItem?.desc ?? '';
    // Icon of the active menu, shown to the left of the title on non-Home pages.
    const ActiveIcon = isThemeEditor ? HiOutlineColorSwatch : activeItem?.icon;

    const invitationUrl = tenant?.domain_slug
        ? `${window.location.origin}${window.location.pathname}#/${tenant.domain_slug}`
        : null;
    const classicTarget = `${location.pathname.replace(/^\/admin/, '/private') || '/private/dashboard'}${location.search}`;

    const displayName = tenant
        ? `${tenant.bride_nickname || tenant.bride_name?.split(' ')[0] || ''} & ${tenant.groom_nickname || tenant.groom_name?.split(' ')[0] || ''}`
        : user?.username;

    return (
        <div className={`admin-shell min-h-screen [overflow-x:clip] ${isDark ? 'dark' : ''}`}>
            {/* Lapisan ambient ala HomePage (.hp-backdrop) — HANYA di mobile.
                Tanpa ini semua panel kaca di bawah tidak punya apa pun untuk
                di-blur, sehingga efeknya hilang dan tampil seperti putih rata. */}
            <div className="admin-backdrop" aria-hidden="true">
                <div className="admin-orb admin-orb-1" />
                <div className="admin-orb admin-orb-2" />
                <div className="admin-orb admin-orb-3" />
                <div className="admin-grain" />
            </div>

            <div className="flex min-h-screen min-w-0">
                {/* ===== Desktop sidebar (gold accent) ===== */}
                <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 flex-col bg-white dark:bg-wedding-dark-card border-r border-gray-100 dark:border-gray-800">
                    <div className="px-5 py-5 flex items-center gap-3">
                        {siteLogo ? (
                            <img src={siteLogo} alt={siteName || 'Logo'} className="w-11 h-11 rounded-2xl object-contain p-1 bg-gradient-to-br from-gold-400 to-gold-600 shadow-gold" />
                        ) : (
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                                <span className="text-white font-display font-black text-lg">{siteName ? siteName[0].toUpperCase() : 'W'}</span>
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="font-display font-black text-lg leading-tight truncate text-gray-800 dark:text-white">
                                {siteName || <>Wedding<span className="text-gradient-gold">SaaS</span></>}
                            </h1>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin Studio</p>
                        </div>
                    </div>

                    {tenant && showTenantMenu && (
                        <div className="mx-4 mb-2 rounded-2xl p-3 bg-gold-50 dark:bg-gold-900/10 border border-gold-100 dark:border-gold-900/30">
                            {isImpersonating && (
                                <div className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-orange-500">
                                    <span>👤</span> {t('sidebar.viewing_tenant', 'Viewing as Tenant')}
                                </div>
                            )}
                            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{tenant.bride_name} & {tenant.groom_name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{tenant.domain_slug}</p>
                        </div>
                    )}

                    <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto no-scrollbar">
                        {filteredNavItems.map((item) => (
                            <NavLink key={item.to} to={item.to} end={item.to === '/admin/dashboard'} className={({ isActive }) => `admin-navlink ${isActive ? 'is-active' : ''}`}>
                                {({ isActive }) => (
                                    <>
                                        {/* item.color sengaja TIDAK dipakai lagi: warna
                                            per-menu membuat rail terbaca sebagai pelangi.
                                            Warna kotak & ikon kini seragam (emas/gelap saat
                                            aktif) lewat .admin-navlink-icon di index.css. */}
                                        <span className={`admin-navlink-icon ${isActive ? '' : 'opacity-90'}`}>
                                            <item.icon className="w-[18px] h-[18px]" />
                                        </span>
                                        <span className="truncate">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
                        {/* Language + dark mode */}
                        <div className="flex items-center gap-2 px-1 pb-1">
                            <LanguageSwitcher />
                            <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 active:scale-95 transition-transform">
                                {isDark ? <HiOutlineSun className="w-4.5 h-4.5 text-gold-400" /> : <HiOutlineMoon className="w-4.5 h-4.5 text-gray-500" />}
                                <span>{isDark ? t('sidebar.light_mode', 'Mode Terang') : t('sidebar.dark_mode', 'Mode Gelap')}</span>
                            </button>
                        </div>
                        <button onClick={() => navigate(classicTarget)} className="admin-navlink w-full text-gray-600 dark:text-gray-300">
                            <span className="admin-navlink-icon"><HiOutlineDesktopComputer className="w-[18px] h-[18px]" /></span>
                            <span>{t('view_switch.to_classic', 'Versi Klasik')}</span>
                        </button>
                        <button onClick={() => setPasswordModalOpen(true)} className="admin-navlink w-full text-gray-600 dark:text-gray-300">
                            <span className="admin-navlink-icon"><HiOutlineKey className="w-[18px] h-[18px]" /></span>
                            <span>{t('sidebar.change_password')}</span>
                        </button>
                        <button onClick={() => setLogoutConfirmOpen(true)} className="admin-navlink w-full text-red-500">
                            {/* Keluar tetap MERAH — itu sinyal keamanan, bukan hiasan.
                                Hanya dilembutkan jadi kotak bertint + ikon merah. */}
                            <span className="admin-navlink-icon is-danger"><HiOutlineLogout className="w-[18px] h-[18px]" /></span>
                            <span>{t('sidebar.logout')}</span>
                        </button>
                    </div>
                </aside>

                {/* ===== Main column ===== */}
                <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:ml-72">
                    {/* ===== Header =====
                        DESKTOP (lg+): pita emas Gojek yang lama — tidak diubah.
                        MOBILE (<lg): pita KACA bergaya HomePage — judul serif
                        Playfair, eyebrow emas berhuruf kapital, garis rambut
                        emas di bawah. Dua penampilan ini dipisah dengan kelas
                        responsif pada elemen yang sama supaya tidak ada header
                        ganda yang saling menimpa saat sticky. */}
                    <header className="admin-header-hp relative overflow-hidden sticky top-0 z-30 lg:rounded-b-3xl lg:shadow-lg lg:shadow-gold-900/10">
                        {/* Soft decorative depth so the gold band isn't flat (desktop only) */}
                        <div className="hidden lg:block pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/15 blur-2xl" />
                        <div className="hidden lg:block pointer-events-none absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-black/10 blur-2xl" />

                        {(isImpersonating || user?.role === 'staff') && (
                            <div className={`relative px-4 lg:px-8 py-1.5 text-center text-[10px] lg:text-[11px] font-bold uppercase tracking-[.16em] lg:tracking-wider text-white ${isImpersonating ? 'bg-orange-500/90' : 'bg-blue-500/90'}`}>
                                {isImpersonating
                                    ? `👤 Viewing as Tenant: ${tenant?.bride_name} & ${tenant?.groom_name}`
                                    : `Staff Receptionist: ${tenant?.bride_name} & ${tenant?.groom_name}`}
                            </div>
                        )}
                        <div className="relative flex items-center justify-between gap-3 px-4 lg:px-8 pt-3 pb-3.5 lg:pt-3.5 lg:pb-4 min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {isHome ? (
                                    <div className="min-w-0">
                                        <p className="admin-eyebrow lg:hidden mb-1.5">{t('dashboard.welcome_back', 'Selamat datang')}</p>
                                        <p className="hidden lg:block text-xs text-white/85 leading-tight mb-0.5">{t('dashboard.welcome_back', 'Halo, selamat datang')} 👋</p>
                                        <h2 className="admin-serif lg:hidden text-[22px] leading-tight truncate">{displayName}</h2>
                                        <h2 className="hidden lg:block text-lg lg:text-xl font-bold text-white leading-tight truncate">{displayName}</h2>
                                    </div>
                                ) : (
                                    <>
                                        {/* Icon of the active menu, before its title */}
                                        {ActiveIcon && (
                                            <>
                                                <span className="admin-header-mark lg:hidden">
                                                    <ActiveIcon className="w-[21px] h-[21px]" />
                                                </span>
                                                <span className="hidden lg:flex w-10 h-10 rounded-2xl bg-white/20 ring-1 ring-white/25 items-center justify-center shrink-0">
                                                    <ActiveIcon className="w-[22px] h-[22px] text-white" />
                                                </span>
                                            </>
                                        )}
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <h2 className="admin-serif lg:hidden text-[19px] leading-tight truncate">{headerTitle}</h2>
                                            <h2 className="hidden lg:block text-base lg:text-lg font-bold text-white leading-tight truncate">{headerTitle}</h2>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* Badge jenis paket tenant — di pojok kanan header, selalu terlihat. */}
                                {tenant && showTenantMenu && (
                                    <>
                                        <span
                                            className="admin-plan-pill lg:hidden"
                                            title={`Paket: ${String(tenant.plan_type || '').toUpperCase()}`}
                                        >
                                            {tenant.plan_type}
                                        </span>
                                        <span
                                            className={`hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white shadow-sm text-[11px] font-black uppercase tracking-wider ${planTextClass(tenant.plan_type)}`}
                                            title={`Paket: ${String(tenant.plan_type || '').toUpperCase()}`}
                                        >
                                            <HiOutlineBadgeCheck className="w-3.5 h-3.5" />
                                            {tenant.plan_type}
                                        </span>
                                    </>
                                )}
                                <button onClick={() => navigate(classicTarget)} className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider text-gold-700 bg-white shadow-sm active:scale-95 transition-transform" title={t('view_switch.to_classic', 'Versi Klasik') as string}>
                                    <HiOutlineDesktopComputer className="w-4 h-4" />
                                    <span className="hidden md:inline">{t('view_switch.to_classic', 'Versi Klasik')}</span>
                                </button>
                                {/* Page-injected header action (e.g. the refresh
                                    button on Kelola Undangan), sits next to Buka Undangan. */}
                                {headerAction}
                                {/* Tombol fullscreen manual, di sebelah KIRI ikon
                                    Buka Undangan (untuk HP yang tak fullscreen otomatis). */}
                                <FullscreenButton />
                                {invitationUrl && showTenantMenu && (
                                    <a href={invitationUrl} target="_blank" rel="noopener noreferrer" className="admin-icon-btn-hp lg:hidden" title={t('topbar.open_invitation', 'Buka Undangan')}>
                                        <HiOutlineExternalLink className="w-[18px] h-[18px]" />
                                    </a>
                                )}
                                {invitationUrl && showTenantMenu && (
                                    <a href={invitationUrl} target="_blank" rel="noopener noreferrer" className="admin-icon-btn hidden lg:flex" title={t('topbar.open_invitation', 'Buka Undangan')}>
                                        <HiOutlineExternalLink className="w-5 h-5" />
                                    </a>
                                )}
                                {/* Indikator proses latar belakang: TAMPIL JUGA di layar kecil.
                                    Komponennya sudah self-hiding (null saat tidak ada task) dan
                                    ukurannya seukuran ikon lain, jadi tidak perlu di-hide di HP —
                                    justru di HP-lah user paling butuh tahu ada proses berjalan/gagal. */}
                                <BackgroundTaskIndicator />
                            </div>
                        </div>
                        {/* Garis rambut emas penutup header (mobile) — .hp-rule */}
                        <span className="admin-rule lg:hidden" aria-hidden="true" />
                    </header>

                    {/* Page content — .admin-scope restyles reused pages to match. */}
                    <main className="admin-scope flex-1 min-w-0 [overflow-x:clip] px-3 sm:px-5 lg:px-8 py-4 lg:py-6 pb-28 lg:pb-8">
                        <Suspense fallback={
                            <div className="flex items-center justify-center py-24">
                                <div className="w-11 h-11 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin" />
                            </div>
                        }>
                            <Outlet />
                        </Suspense>
                    </main>
                </div>
            </div>

            {/* ===== Mobile bottom nav (minimalist, Gojek-style) ===== */}
            <nav className="admin-bottomnav-hp lg:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
                <div className="grid grid-cols-5">
                    {bottomNavItems.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.to === '/admin/dashboard'} className={({ isActive }) => `admin-tab-hp ${isActive ? 'is-active' : ''}`}>
                            <item.icon className="w-[21px] h-[21px]" />
                            <span className="admin-tab-hp-label">{item.label}</span>
                        </NavLink>
                    ))}
                    <button onClick={() => setMoreOpen(true)} className={`admin-tab-hp ${moreOpen ? 'is-active' : ''}`}>
                        <HiOutlineViewGrid className="w-[21px] h-[21px]" />
                        <span className="admin-tab-hp-label">{t('sidebar.menu', 'Menu')}</span>
                    </button>
                </div>
            </nav>

            {/* ===== Mobile "Menu" sheet (full grid) ===== */}
            {moreOpen && (
                <div className="lg:hidden fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-[#1A1A1F]/45 backdrop-blur-sm animate-fade-in" onClick={() => setMoreOpen(false)} />
                    <div className="admin-sheet-hp absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-[2rem] animate-slide-up flex flex-col">
                        <div className="pt-3 flex justify-center shrink-0">
                            <div className="w-12 h-1.5 rounded-full" style={{ background: 'var(--ad-line)' }} />
                        </div>
                        <div className="px-5 pt-3.5 pb-3 flex items-start justify-between gap-3 shrink-0">
                            <div className="min-w-0">
                                <p className="admin-eyebrow mb-1.5">{t('sidebar.menu', 'Menu')}</p>
                                <h3 className="admin-serif text-[21px] leading-tight truncate">
                                    {showTenantMenu
                                        ? t('topbar.wedding_dashboard', 'Wedding Dashboard')
                                        : t('topbar.superadmin_panel', 'Super Admin Panel')}
                                </h3>
                            </div>
                            <button onClick={() => setMoreOpen(false)} className="admin-icon-btn-hp mt-1" aria-label={t('common.close', 'Tutup') as string}>
                                <HiOutlineX className="w-[18px] h-[18px]" />
                            </button>
                        </div>
                        <span className="admin-rule mx-5 shrink-0" aria-hidden="true" />

                        <div className="px-5 pb-6 overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-4 gap-y-5 gap-x-2 pt-5">
                                {filteredNavItems.map((item) => {
                                    const isActive = activeItem?.to === item.to;
                                    return (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            end={item.to === '/admin/dashboard'}
                                            onClick={() => setMoreOpen(false)}
                                            className={`admin-service-hp ${isActive ? 'is-active' : ''}`}
                                        >
                                            <span className="admin-service-hp-icon"><item.icon className="w-6 h-6" /></span>
                                            <span className="admin-service-hp-label">{item.label}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>

                            <span className="admin-rule mt-6 mb-5 block" aria-hidden="true" />

                            {/* Settings row — language + dark mode moved here from the header */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="admin-glass-card flex items-center justify-between gap-2 p-3.5">
                                    <span className="text-xs font-semibold" style={{ color: 'var(--ad-ink-soft)' }}>{t('sidebar.language', 'Bahasa')}</span>
                                    <LanguageSwitcher />
                                </div>
                                <button onClick={toggleTheme} className="admin-glass-card flex items-center justify-between gap-2 p-3.5">
                                    <span className="text-xs font-semibold text-left" style={{ color: 'var(--ad-ink-soft)' }}>{isDark ? t('sidebar.light_mode', 'Mode Terang') : t('sidebar.dark_mode', 'Mode Gelap')}</span>
                                    {isDark
                                        ? <HiOutlineSun className="w-5 h-5 shrink-0" style={{ color: 'var(--ad-gold-light)' }} />
                                        : <HiOutlineMoon className="w-5 h-5 shrink-0" style={{ color: 'var(--ad-gold-deep)' }} />}
                                </button>
                            </div>

                            {/* "Versi Klasik" intentionally hidden on mobile — the
                                classic view is a desktop-oriented layout, so the
                                switcher is only offered from the desktop sidebar/header. */}

                            <div className="admin-glass-card mt-3 p-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Kotak inisial: latar GELAP + garis rambut emas,
                                        meniru .hp-brand-mark di HomePage. */}
                                    <div
                                        className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
                                        style={{ background: 'var(--ad-ink)', border: '1px solid rgba(212,175,55,.32)' }}
                                    >
                                        <span className="admin-serif text-lg" style={{ color: 'var(--ad-gold-light)' }}>
                                            {user?.username?.[0]?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ad-ink)' }}>{user?.username}</p>
                                        <p className="admin-eyebrow mt-1">{user?.role?.replace('_', ' ')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <button onClick={() => { setMoreOpen(false); setPasswordModalOpen(true); }} className="admin-btn-ghost">
                                    <HiOutlineKey className="w-[18px] h-[18px]" style={{ color: 'var(--ad-gold-deep)' }} />
                                    {t('sidebar.change_password')}
                                </button>
                                <button onClick={() => { setMoreOpen(false); setLogoutConfirmOpen(true); }} className="admin-btn-ghost admin-btn-danger-soft">
                                    <HiOutlineLogout className="w-[18px] h-[18px]" />
                                    {t('sidebar.logout')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />

            <ConfirmDialog
                isOpen={logoutConfirmOpen}
                onClose={() => setLogoutConfirmOpen(false)}
                onConfirm={() => { setLogoutConfirmOpen(false); handleLogout(); }}
                variant="danger"
                icon={<HiOutlineLogout className="w-5 h-5 shrink-0 mt-0.5" />}
                warningTitle={t('sidebar.logout_confirm_title', 'Keluar dari Akun')}
                title={t('sidebar.logout_confirm_title', 'Keluar dari Akun')}
                message={t('sidebar.logout_confirm_message', 'Apakah Anda yakin ingin keluar dari akun ini?')}
                description={t('sidebar.logout_confirm_desc', 'Anda perlu login kembali untuk mengakses dashboard.')}
                confirmLabel={t('sidebar.logout_confirm_button', 'Ya, Keluar')}
                cancelLabel={t('common.cancel', 'Batal')}
            />
        </div>
    );
}
