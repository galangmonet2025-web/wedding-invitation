import { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { additionalFeatureApi } from '@/core/api/endpoints';
import { useTranslation } from 'react-i18next';
import kosaIcon from '@/assets/img/kosa-icon.png';

import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { RetroAuthStyle } from '@/features/auth/components/RetroAuthChrome';
import { UserMenu } from '@/shared/components/UserMenu';
import { useEnterFullscreenOnLogin } from '@/shared/hooks/useEnterFullscreenOnLogin';
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
    HiOutlineTicket,
    HiOutlineAnnotation,
    HiOutlineArchive,
    HiOutlineChevronDoubleLeft,
    HiOutlineChevronDoubleRight,
    HiOutlineDeviceMobile,
    HiOutlineBadgeCheck,
} from 'react-icons/hi';
import { useThemeStore } from '@/shared/hooks/useThemeStore';
import { BackgroundTaskIndicator } from '@/shared/components/BackgroundTaskIndicator';
import { ChangePasswordModal } from '@/shared/components/ChangePasswordModal';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

/**
 * Gaya khusus SHELL admin klasik (/private) agar SENADA dengan landing/login/
 * register (retro "world 1-1"). Hanya menata cangkang: rail sidebar, nav link,
 * topbar, footer — TIDAK menyentuh isi halaman (Outlet). Semua di-scope ke
 * `.rm-lp` supaya kelas global (mis. .sidebar-link untuk /admin) tak berubah.
 * Token warna (--lp-*) berasal dari <RetroAuthStyle/> yang dirender berdampingan.
 */
function ShellRetroStyle() {
    return (
        <style>{`
/* ============================================================
   SHELL TOKENS — dua tema:
   • LIGHT (default, .rm-lp)      : putih + aksen ORANGE
   • DARK  (.rm-lp.dark)          : ink gelap + aksen KOIN (kuning), retro NES
   Semua kelas .shell-* & .lp-logo-block memakai token ini, jadi satu set
   aturan otomatis mengikuti mode. Kelas dark di-toggle host lewat useThemeStore.
   ============================================================ */
.rm-lp {
    /* LIGHT — bersih & lembut: putih murni, border tipis netral, orange
       hanya sebagai AKSEN (menu aktif, tombol, ikon). Bevel/shadow halus. */
    --shell-surface: #ffffff;          /* rail / topbar / footer */
    --shell-surface-2: #ffffff;        /* kartu / tombol chip */
    --shell-main-bg: #f8fafc;          /* area konten (slate-50 netral) */
    --shell-border: #e6e8ec;           /* border tipis abu netral */
    --shell-border-w: 1px;             /* garis pemisah shell tipis */
    --shell-comp-border-w: 1px;        /* border komponen (kartu/tombol) tipis */
    --shell-border-soft: #eef0f3;
    --shell-shadow: rgba(15,23,42,.06); /* shadow sangat halus */
    --shell-bevel: 0 1px 2px rgba(15,23,42,.06); /* shadow komponen light: halus, tanpa offset keras */
    --shell-bevel-active: 0 1px 1px rgba(15,23,42,.05);
    --shell-accent: #ea580c;           /* ORANGE 600 */
    --shell-accent-soft: #fff3ea;      /* hover/isi lembut (orange-50) */
    --shell-accent-ink: #ffffff;       /* teks di atas aksen */
    --shell-accent-deep: #c2410c;      /* orange 700 (bevel logo) */
    --shell-text: #1f2937;             /* slate-800 */
    --shell-text-soft: #64748b;        /* slate-500 */
    --shell-eyebrow: #94a3b8;          /* slate-400 */
    --shell-topbar-bg: rgba(255,255,255,.9);
}
.rm-lp.dark {
    /* DARK — gaya retro ink ungu (SHELL = patokan). Warna konten (kartu/tabel)
       diselaraskan ke warna ini lewat tailwind.config.js (wedding-dark /
       wedding-dark-card diubah jadi ungu senada). Border tebal + bevel keras
       (nuansa NES). */
    --shell-surface: var(--lp-ink);    /* #0e0e1a */
    --shell-surface-2: var(--lp-panel);/* #1b1530 */
    --shell-main-bg: var(--lp-ink);
    --shell-border: #000;
    --shell-border-w: 4px;
    --shell-comp-border-w: 3px;
    --shell-border-soft: rgba(255,255,255,.08);
    --shell-shadow: rgba(0,0,0,.45);
    --shell-bevel: 3px 3px 0 rgba(0,0,0,.45);     /* NES hard offset */
    --shell-bevel-active: 1px 1px 0 rgba(0,0,0,.45);
    --shell-accent: var(--lp-coin);
    --shell-accent-soft: rgba(255,255,255,.06);
    --shell-accent-ink: #000;
    --shell-accent-deep: var(--lp-coin-deep);
    --shell-text: rgba(255,255,255,.92);
    --shell-text-soft: rgba(255,255,255,.5);
    --shell-eyebrow: rgba(255,255,255,.45);
    --shell-topbar-bg: rgba(14,14,26,.86);        /* #0e0e1a @ .86 */
}

.rm-lp .shell-aside { background: var(--shell-surface); border-right: var(--shell-border-w) solid var(--shell-border); }
.rm-lp .shell-topbar { background: var(--shell-topbar-bg); backdrop-filter: blur(10px); border-bottom: var(--shell-border-w) solid var(--shell-border); }
.rm-lp .shell-footer { background: var(--shell-surface); border-top: var(--shell-border-w) solid var(--shell-border); }
.rm-lp .shell-divider { border-color: var(--shell-border-soft); }

/* rail brand + tenant/user chips */
.rm-lp .shell-brand-title { font-family: 'Press Start 2P', monospace; font-size: 11px; color: var(--shell-text); line-height: 1.6; }
.rm-lp .shell-eyebrow { font-family: 'Press Start 2P', monospace; font-size: 7px; letter-spacing: 2px; color: var(--shell-eyebrow); text-transform: uppercase; }
.rm-lp .shell-muted { color: var(--shell-text-soft); }
.rm-lp .shell-text { color: var(--shell-text); }
.rm-lp .shell-accent { color: var(--shell-accent); }
.rm-lp .shell-card { background: var(--shell-surface-2); border: var(--shell-comp-border-w) solid var(--shell-border); border-radius: 10px; box-shadow: var(--shell-bevel); }
.rm-lp.dark .shell-card { border-radius: 3px; }

/* nav link — pixel-ish rail row (override global .sidebar-link only inside rm-lp) */
.rm-lp .shell-aside .sidebar-link {
    display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px;
    color: var(--shell-text-soft); font-weight: 700; font-size: 12.5px; letter-spacing: .3px;
    background: transparent; border: 2px solid transparent; transition: background .15s, color .15s, border-color .15s;
}
.rm-lp.dark .shell-aside .sidebar-link { border-radius: 3px; }
.rm-lp .shell-aside .sidebar-link:hover { color: var(--shell-accent); background: var(--shell-accent-soft); }
.rm-lp.dark .shell-aside .sidebar-link:hover { color: var(--shell-text); }
.rm-lp .shell-aside .sidebar-link.active {
    color: var(--shell-accent-ink); background: var(--shell-accent); border-color: transparent;
}
.rm-lp.dark .shell-aside .sidebar-link.active {
    border-color: var(--shell-border); box-shadow: var(--shell-bevel); border-right-width: 2px;
}
.rm-lp .shell-aside .sidebar-link.active:hover { color: var(--shell-accent-ink); background: var(--shell-accent); }

/* mobile grid tiles */
.rm-lp .shell-tile {
    background: var(--shell-surface-2); border: var(--shell-comp-border-w) solid var(--shell-border);
    color: var(--shell-text-soft); box-shadow: var(--shell-bevel); border-radius: 12px;
}
.rm-lp.dark .shell-tile { border-radius: 3px; }
.rm-lp .shell-tile.active { background: var(--shell-accent); color: var(--shell-accent-ink); border-color: transparent; }
.rm-lp.dark .shell-tile.active { border-color: var(--shell-border); }
.rm-lp .shell-tile-ico { background: var(--shell-accent-soft); color: var(--shell-accent); }
.rm-lp.dark .shell-tile-ico { background: rgba(0,0,0,.25); color: inherit; }
.rm-lp .shell-tile-ico.is-active { background: rgba(255,255,255,.22); color: var(--shell-accent-ink); }
.rm-lp.dark .shell-tile-ico.is-active { background: rgba(0,0,0,.15); }

/* collapse handle */
.rm-lp .shell-collapse {
    background: var(--shell-accent); color: var(--shell-accent-ink); border: var(--shell-comp-border-w) solid var(--shell-border); border-radius: 999px;
    box-shadow: var(--shell-bevel);
}
.rm-lp.dark .shell-collapse { border-radius: 3px; }
.rm-lp .shell-collapse:active { transform: translate(1px,1px); box-shadow: var(--shell-bevel-active); }

/* topbar icon buttons + badges */
.rm-lp .shell-icon-btn { background: var(--shell-surface-2); border: var(--shell-comp-border-w) solid var(--shell-border); border-radius: 10px; color: var(--shell-text-soft); box-shadow: var(--shell-bevel); }
.rm-lp.dark .shell-icon-btn { border-radius: 3px; color: var(--shell-text); }
.rm-lp .shell-icon-btn:hover { color: var(--shell-accent); border-color: var(--shell-accent); }
.rm-lp.dark .shell-icon-btn:hover { border-color: var(--shell-border); }
.rm-lp .shell-icon-btn:active { transform: translate(1px,1px); box-shadow: var(--shell-bevel-active); }
.rm-lp .shell-title { font-family: 'Press Start 2P', monospace; font-size: 11px; color: var(--shell-text); line-height: 1.55; }
.rm-lp.dark .shell-title { text-shadow: 2px 2px 0 var(--shell-shadow); }
.rm-lp .shell-desc { color: var(--shell-text-soft); }
.rm-lp .shell-role-badge { background: var(--shell-accent-soft); border: var(--shell-comp-border-w) solid transparent; border-radius: 999px; box-shadow: none; }
.rm-lp.dark .shell-role-badge { background: var(--shell-surface-2); border-color: var(--shell-border); box-shadow: var(--shell-bevel); }
.rm-lp .shell-role-badge span { color: var(--shell-accent); }

/* main content area — light netral / ink di dark. Kartu/form halaman
   (tak disentuh) tetap tampil di atasnya. */
.rm-lp .shell-main { background: var(--shell-main-bg); }

/* .lp-logo-block (koin kuning bawaan) dibuat ikut aksen shell agar oranye di
   light mode; di dark tetap koin kuning + bevel keras. */
.rm-lp .lp-logo-block {
    background: var(--shell-accent); color: var(--shell-accent-ink);
    border: none; border-radius: 10px;
    box-shadow: var(--shell-bevel); animation: none;
}
.rm-lp.dark .lp-logo-block {
    border: 3px solid var(--shell-border); border-radius: 3px;
    box-shadow: inset 0 0 0 3px var(--shell-accent-deep), 3px 3px 0 var(--shell-shadow);
    animation: lp-bob 2.4s steps(2) infinite;
}

/* make the shared LanguageSwitcher legible on either surface */
.rm-lp .shell-topbar button[aria-label="Toggle language"] { background: var(--shell-surface-2); border: var(--shell-comp-border-w) solid var(--shell-border); border-radius: 10px; box-shadow: var(--shell-bevel); }
.rm-lp.dark .shell-topbar button[aria-label="Toggle language"] { border-radius: 3px; }
.rm-lp .shell-topbar button[aria-label="Toggle language"] span { color: var(--shell-text); }

/* ---- UserMenu (dropdown identitas + aksi) ---- */
.rm-lp .um-root { position: relative; }
.rm-lp .um-root-sidebar { width: 100%; }
.rm-lp .um-chev { width: 16px; height: 16px; color: var(--shell-text-soft); transition: transform .15s; flex-shrink: 0; }

/* trigger topbar: avatar + chevron */
.rm-lp .um-trigger-topbar {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px 4px 4px;
    background: var(--shell-surface-2); border: var(--shell-comp-border-w) solid var(--shell-border);
    border-radius: 10px; box-shadow: var(--shell-bevel); cursor: pointer; transition: border-color .15s;
}
.rm-lp.dark .um-trigger-topbar { border-radius: 6px; }
.rm-lp .um-trigger-topbar:hover, .rm-lp .um-trigger-topbar.is-open { border-color: var(--shell-accent); }

/* trigger sidebar: baris penuh avatar + nama/role + chevron */
.rm-lp .um-trigger-sidebar {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
    background: var(--shell-surface-2); border: var(--shell-comp-border-w) solid var(--shell-border);
    border-radius: 10px; box-shadow: var(--shell-bevel); cursor: pointer; transition: border-color .15s;
}
.rm-lp.dark .um-trigger-sidebar { border-radius: 4px; }
.rm-lp .um-trigger-sidebar:hover, .rm-lp .um-trigger-sidebar.is-open { border-color: var(--shell-accent); }
.rm-lp .um-trigger-sidebar.is-collapsed { justify-content: center; padding: 8px 0; }

.rm-lp .um-name { font-size: 12px; font-weight: 700; color: var(--shell-text); }
.rm-lp .um-role { font-size: 10px; text-transform: capitalize; color: var(--shell-accent); }

/* panel dropdown */
.rm-lp .um-panel {
    position: absolute; z-index: 60; width: 224px; padding: 8px;
    background: var(--shell-surface); border: var(--shell-comp-border-w) solid var(--shell-border);
    border-radius: 14px; box-shadow: 0 12px 32px rgba(15,23,42,.16), var(--shell-bevel);
    animation: um-pop .12s ease-out;
}
.rm-lp.dark .um-panel { border-radius: 6px; box-shadow: 0 12px 32px rgba(0,0,0,.5), var(--shell-bevel); }
.rm-lp .um-panel-topbar { top: calc(100% + 8px); right: 0; }
.rm-lp .um-panel-sidebar { bottom: calc(100% + 8px); left: 0; min-width: 200px; }

.rm-lp .um-head { display: flex; align-items: center; gap: 10px; padding: 6px 6px 10px; }
.rm-lp .um-head .um-name { font-size: 13px; }
.rm-lp .um-plan-row { padding: 0 6px 8px; }
.rm-lp .um-plan-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; }
.rm-lp .um-divider { height: 1px; background: var(--shell-border); margin: 2px 0 6px; opacity: .7; }

.rm-lp .um-item {
    display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border-radius: 8px;
    font-size: 12.5px; font-weight: 600; color: var(--shell-text); background: transparent; cursor: pointer;
    transition: background .12s, color .12s;
}
.rm-lp.dark .um-item { border-radius: 4px; }
.rm-lp .um-item:hover { background: var(--shell-accent-soft); color: var(--shell-accent); }
.rm-lp .um-item-ico { color: var(--shell-accent); display: inline-flex; }
/* item "Versi Mobile" — disorot dgn tint aksen supaya menonjol sbg aksi utama */
.rm-lp .um-item-accent { background: var(--shell-accent-soft); color: var(--shell-accent); font-weight: 700; }
.rm-lp .um-item-accent:hover { background: var(--shell-accent); color: var(--shell-accent-ink); }
.rm-lp .um-item-accent:hover .um-item-ico { color: var(--shell-accent-ink); }
.rm-lp .um-item-danger { color: #dc2626; }
.rm-lp.dark .um-item-danger { color: #fca5a5; }
.rm-lp .um-item-danger:hover { background: rgba(220,38,38,.1); color: #dc2626; }
.rm-lp.dark .um-item-danger:hover { color: #fecaca; }
@keyframes um-pop { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
    );
}

/**
 * Warna pill untuk badge jenis paket (basic/pro/premium) tenant. Casing dari
 * backend bisa bervariasi → di-lower dulu. Sejalan dengan konvensi warna plan
 * (basic=biru, pro=amber, premium=gold).
 */
function planPillClass(plan?: string): string {
    switch (String(plan || '').toLowerCase().trim()) {
        case 'premium':
            return 'bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300';
        case 'pro':
            return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
        default:
            return 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300';
    }
}

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
    canOpenInvitation,
    siteName,
    siteLogo,
    switchToMobile
}: any) {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] lg:hidden animate-fade-in overflow-hidden ${isDark ? 'dark' : ''}`}>
            {/* Background — putih di light, ink di dark */}
            <div className="absolute inset-0 shell-main" />

            {/* Decorative background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-gold-400/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-gold-600/10 rounded-full blur-3xl animate-pulse" />

            <div className="relative h-full flex flex-col p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 min-w-0">
                        {siteLogo ? (
                            <img
                                src={siteLogo}
                                alt={siteName || 'Logo'}
                                className="lp-logo-block !w-10 !h-10 overflow-hidden !p-1.5"
                            />
                        ) : (
                            <div className="lp-logo-block !w-10 !h-10 !text-lg">
                                <span>
                                    {siteName ? siteName[0].toUpperCase() : 'W'}
                                </span>
                            </div>
                        )}
                        <h1 className="shell-brand-title truncate !text-sm">
                            {siteName || <>WEDDING<span style={{ color: 'var(--shell-accent)' }}>SAAS</span></>}
                        </h1>
                    </div>
                    <button
                        onClick={onClose}
                        className="shell-icon-btn w-10 h-10 flex items-center justify-center transition-transform"
                    >
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>

                {/* Tenant / User Welcome */}
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="shell-eyebrow mb-1.5" style={{ color: 'var(--shell-accent)' }}>{t('dashboard.welcome_back', 'Selamat Datang Kembali')}</p>
                        <h2 className="text-2xl font-display font-bold shell-text leading-tight truncate">
                            {tenant
                                ? `${tenant.bride_nickname || tenant.bride_name.split(' ')[0]} & ${tenant.groom_nickname || tenant.groom_name.split(' ')[0]}`
                                : user?.username
                            }
                        </h2>
                    </div>

                    {/* Open Invitation Shortcut next to Nickname (shows for tenant admins & impersonating superadmins) */}
                    {tenant?.domain_slug && canOpenInvitation && (
                        <a
                            href={`${window.location.origin}${window.location.pathname}#/${tenant.domain_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className="shell-icon-btn w-10 h-10 flex items-center justify-center transition-transform shrink-0"
                            title={t('topbar.open_invitation', 'Buka Undangan')}
                        >
                            <HiOutlineExternalLink className="w-5 h-5" style={{ color: 'var(--shell-accent)' }} />
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
                                    `shell-tile flex flex-col items-center gap-2 p-3 rounded transition-all duration-200 active:translate-y-[2px] ${isActive ? 'active scale-105 z-10' : ''
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className={`shell-tile-ico w-12 h-12 rounded flex items-center justify-center transition-colors ${isActive ? 'is-active' : ''
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
                <div className="pt-6 border-t shell-divider space-y-4">
                    {/* Switch to the new mobile-first /admin UI */}
                    <button
                        onClick={() => { onClose(); switchToMobile(); }}
                        className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-fuchsia-500/30 active:scale-95 transition-transform"
                    >
                        <HiOutlineDeviceMobile className="w-5 h-5" />
                        {t('view_switch.to_mobile', 'Versi Mobile')}
                    </button>

                    <div className="shell-card p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="lp-logo-block !w-12 !h-12 !text-xl">
                                    <span>{user?.username?.[0]?.toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold shell-text truncate">{user?.username}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--shell-accent)' }}>{user?.role?.replace('_', ' ')}</p>
                                </div>
                            </div>

                            {/* 2 Compact Settings Icon Buttons inside Card */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* Language Switcher for Mobile */}
                                <LanguageSwitcher />

                                {/* Dark Mode Switcher for Mobile */}
                                <button
                                    onClick={toggleTheme}
                                    className="shell-icon-btn w-9 h-9 flex items-center justify-center transition-transform"
                                    aria-label="Toggle dark mode"
                                >
                                    {isDark ? (
                                        <HiOutlineSun className="w-4.5 h-4.5 text-gold-400" />
                                    ) : (
                                        <HiOutlineMoon className="w-4.5 h-4.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { onClose(); onChangePassword(); }}
                            className="shell-card shell-text flex items-center justify-center gap-2 p-4 text-xs font-bold active:translate-y-[2px] transition-transform"
                        >
                            <HiOutlineKey className="w-5 h-5" style={{ color: 'var(--shell-accent)' }} />
                            {t('sidebar.change_password')}
                        </button>
                        <button
                            onClick={onLogout}
                            className="flex items-center justify-center gap-2 p-4 border-[3px] rounded text-xs font-bold text-white active:translate-y-[2px] transition-transform"
                            style={{ background: 'rgba(229,37,33,.92)', borderColor: 'var(--shell-border)', boxShadow: '3px 3px 0 var(--shell-shadow)' }}
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
    // Desktop sidebar collapse (icons-only + tooltip). Persisted across sessions.
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
    });
    const toggleCollapsed = () => setCollapsed(prev => {
        const next = !prev;
        try { localStorage.setItem('sidebar_collapsed', String(next)); } catch { /* ignore */ }
        return next;
    });
    // On mobile, enter fullscreen on the first tap after login (see hook).
    useEnterFullscreenOnLogin();

    const { user, tenant, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
    const [siteName, setSiteName] = useState('');
    const [siteLogo, setSiteLogo] = useState('');
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
        // Set default favicon immediately
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
                    if (res.data.site_name) {
                        setSiteName(res.data.site_name);
                    }
                    if (res.data.site_logo) {
                        const resolvedLogo = await fetchProxyImageBase64(res.data.site_logo);
                        setSiteLogo(resolvedLogo);
                        let fav = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                        if (fav) {
                            fav.href = resolvedLogo;
                        }
                    }
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

    // Pindah ke UI mobile-first (/admin), pertahankan sub-path + query.
    const switchToMobile = () =>
        navigate(`${location.pathname.replace(/^\/private/, '/admin') || '/admin/dashboard'}${location.search}`);

    const navItems = !showTenantMenu
        ? [
            { to: '/private/global-dashboard', icon: HiOutlineChartBar, label: t('sidebar.global_dashboard'), roles: ['superadmin'], desc: t('sidebar.global_dashboard_desc', 'Statistik platform, estimasi pendapatan, dan fitur tertunda') },
            { to: '/private/tenants', icon: HiOutlineOfficeBuilding, label: t('sidebar.manage_tenants'), roles: ['superadmin'], desc: t('sidebar.manage_tenants_desc', 'Kelola semua tenant pengguna, masa aktif, dan status data pernikahan') },
            { to: '/private/themes', icon: HiOutlineColorSwatch, label: t('sidebar.manage_themes'), roles: ['superadmin'], desc: t('sidebar.manage_themes_desc', 'Kelola database desain tema, template undangan, dan kategori plan') },
            { to: '/private/master-quotes', icon: HiOutlineAnnotation, label: t('sidebar.master_quotes', 'Master Quotes'), roles: ['superadmin'], desc: t('sidebar.master_quotes_desc', 'Kelola katalog quotes undangan, atur quote default, dan status aktif') },
            { to: '/private/additional-features', icon: HiOutlinePuzzle, label: t('sidebar.additional_feature'), roles: ['superadmin'], desc: t('sidebar.additional_feature_desc', 'Konfigurasi add-on kustom, input tenant, dan hasil output admin') },
            { to: '/private/plan-config', icon: HiOutlineAdjustments, label: t('sidebar.plan_config', 'Konfigurasi Paket'), roles: ['superadmin'], desc: t('sidebar.plan_config_desc', 'Atur harga paket basic/pro/premium, guest limit, dan list fitur benefit') },
            { to: '/private/transactions', icon: HiOutlineCreditCard, label: t('sidebar.monitoring_transactions', 'Monitoring Transaksi'), roles: ['superadmin'], desc: t('sidebar.monitoring_transactions_desc', 'Pantau riwayat pembayaran invoice, nominal transfer, dan status order') },
            { to: '/private/coupons', icon: HiOutlineTicket, label: t('sidebar.coupon', 'Coupon'), roles: ['superadmin'], desc: t('sidebar.coupon_desc', 'Buat dan kelola kode promo diskon untuk pembayaran paket tenant') },
            { to: '/private/archive-restore', icon: HiOutlineArchive, label: t('sidebar.archive_restore', 'Archive & Restore'), roles: ['superadmin'], desc: t('sidebar.archive_restore_desc', 'Arsipkan data tenant untuk menghemat database, lalu pulihkan kapan saja') },
            { to: '/private/reviews', icon: HiOutlineChatAlt2, label: t('sidebar.review_rating'), roles: ['superadmin'], desc: t('sidebar.review_rating_desc', 'Moderasi ulasan bintang, komentar feedback, dan testimoni pengguna') },
            { to: '/private/website-config', icon: HiOutlineCog, label: t('sidebar.website_config'), roles: ['superadmin'], desc: t('sidebar.website_config_desc', 'Atur identitas web, logo platform, kontak support, dan banner landing page') },
            { to: '/private/activity', icon: HiOutlineClipboardList, label: t('sidebar.system_activity'), roles: ['superadmin'], desc: t('sidebar.system_activity_desc', 'Audit log sistem dan rekaman aktivitas administratif platform') },
        ]
        : [
            { to: '/private/dashboard', icon: HiOutlineHome, label: t('sidebar.dashboard'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: t('sidebar.dashboard_desc', 'Ringkasan data RSVP tamu, ucapan selamat, dan kuota undangan Anda') },
            { to: '/private/scanner', icon: HiOutlineQrcode, label: t('sidebar.scanner_kehadiran', 'Scanner Kehadiran'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: t('sidebar.scanner_kehadiran_desc', 'Gunakan kamera scanner QR Code tamu untuk absensi meja resepsionis') },
            { to: '/private/guests', icon: HiOutlineUsers, label: t('sidebar.guests'), roles: ['tenant_admin', 'staff', 'superadmin'], desc: t('sidebar.guests_desc', 'Kelola database tamu undangan pernikahan, kategori grup, dan link sebar') },
            { to: '/private/whatsapp-blast', icon: HiOutlineChatAlt2, label: t('sidebar.whatsapp_blast'), roles: ['tenant_admin', 'superadmin'], desc: t('whatsapp_blast.description', 'Kirim undangan personal ke tamu via WhatsApp') },
            { to: '/private/staff', icon: HiOutlineDocumentText, label: t('sidebar.manage_staff'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.manage_staff_desc', 'Kelola panitia penerima tamu di lokasi acara serta petugas scanner QR') },
            { to: '/private/invitation-content', icon: HiOutlineDocumentText, label: t('sidebar.content_settings'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.content_settings_desc', 'Ubah detail mempelai, jadwal akad & resepsi, kompilasi galeri foto, dan backsound') },
            { to: '/private/wishes', icon: HiOutlineHeart, label: t('sidebar.wishes'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.wishes_desc', 'Kelola ucapan selamat dan doa restu yang dikirimkan oleh tamu undangan') },
            { to: '/private/gifts', icon: HiOutlineGift, label: t('sidebar.gifts'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.gifts_desc', 'Atur rekening amplop digital, kiriman kado fisik, dan konfirmasi hadiah tamu') },
            { to: '/private/additional-features', icon: HiOutlinePuzzle, label: t('sidebar.additional_feature'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.additional_feature_desc', 'Aktivasi, unggah data input, dan download output untuk menu add-on kustom') },
            { to: '/private/payments', icon: HiOutlineCreditCard, label: t('sidebar.payments', 'Pembayaran'), roles: ['tenant_admin'], desc: t('sidebar.payments_desc', 'Riwayat invoice pembayaran paket langganan serta pembelian fitur kustom') },
            { to: '/private/activity', icon: HiOutlineClipboardList, label: t('sidebar.activity_log'), roles: ['tenant_admin', 'superadmin'], desc: t('sidebar.activity_log_desc', 'Lihat rekaman audit log perubahan data dan aktivitas penting pada undangan') },
        ];

    const filteredNavItems = navItems
        .filter((item) => item.roles.includes(user?.role || ''))
        // Hide the attendance scanner for superadmins impersonating a tenant
        .filter((item) => !(isImpersonating && item.to === '/private/scanner'));

    return (
        <div className={`rm-lp min-h-screen flex ${isDark ? 'dark' : ''}`}>
            <RetroAuthStyle />
            <ShellRetroStyle />
            {/* Mobile Menu Overlay */}
            <MobileMenuOverlay
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                items={filteredNavItems}
                user={user}
                tenant={tenant}
                onLogout={() => setLogoutConfirmOpen(true)}
                onChangePassword={() => setPasswordModalOpen(true)}
                t={t}
                isDark={isDark}
                toggleTheme={toggleTheme}
                canOpenInvitation={showTenantMenu}
                siteName={siteName}
                siteLogo={siteLogo}
                switchToMobile={switchToMobile}
            />

            {/* Desktop Sidebar (Only visible on LG up) */}
            <aside
                className={`shell-aside fixed inset-y-0 left-0 z-50
        hidden lg:flex flex-col transition-[width] duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
            >
                {/* Logo + collapse toggle */}
                <div className={`shell-divider relative px-4 py-3.5 border-b ${collapsed ? 'px-0' : ''}`}>
                    <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
                        {siteLogo ? (
                            <img
                                src={siteLogo}
                                alt={siteName || 'Logo'}
                                className="lp-logo-block !w-8 !h-8 overflow-hidden !p-1"
                            />
                        ) : (
                            <div className="lp-logo-block !w-8 !h-8 !text-base">
                                <span>
                                    {siteName ? siteName[0].toUpperCase() : 'W'}
                                </span>
                            </div>
                        )}
                        {!collapsed && (
                            <div className="min-w-0">
                                <h1 className="shell-brand-title truncate !text-[11px]">
                                    {siteName || <>WEDDING<span style={{ color: 'var(--shell-accent)' }}>SAAS</span></>}
                                </h1>
                                <p className="shell-eyebrow leading-tight mt-1">Platform Management</p>
                            </div>
                        )}
                    </div>
                    {/* Collapse / expand handle — sits on the sidebar's right edge */}
                    <button
                        onClick={toggleCollapsed}
                        title={collapsed ? t('sidebar.expand', 'Perlebar menu') : t('sidebar.collapse', 'Perkecil menu')}
                        aria-label={collapsed ? t('sidebar.expand', 'Perlebar menu') : t('sidebar.collapse', 'Perkecil menu')}
                        className="shell-collapse absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center z-10 transition-transform"
                    >
                        {collapsed ? <HiOutlineChevronDoubleRight className="w-3.5 h-3.5" /> : <HiOutlineChevronDoubleLeft className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className={`flex-1 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-2.5'}`}>
                    {!collapsed && (
                        <p className="shell-eyebrow px-2.5 py-1.5">{t('sidebar.menu')}</p>
                    )}
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            title={collapsed ? item.label : undefined}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
                            }
                        >
                            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Tenant Info — dipindah ke KAKI sidebar (dulu di atas) + info plan.
                    Identitas/aksi user hanya di dropdown topbar. */}
                {tenant && showTenantMenu && (
                    <div className={`shell-divider border-t ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
                        {collapsed ? (
                            <div
                                className="w-9 h-9 mx-auto rounded border-2 flex items-center justify-center"
                                style={{ background: 'var(--shell-border-soft)', borderColor: 'var(--shell-accent)' }}
                                title={`${tenant.bride_name} & ${tenant.groom_name} • ${tenant.domain_slug}${tenant.plan_type ? ' • ' + String(tenant.plan_type).toUpperCase() : ''}`}
                            >
                                <HiOutlineHeart className="w-4 h-4 shell-accent" />
                            </div>
                        ) : (
                            <div>
                                {isImpersonating && (
                                    <div className="mb-2 px-2 py-1 bg-orange-500/15 border-2 border-orange-500/40 rounded text-[10px] text-orange-600 dark:text-orange-300 font-bold flex items-center gap-1">
                                        <span>👤</span> {t('sidebar.viewing_tenant', 'Viewing as Tenant')}
                                    </div>
                                )}
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded border-2 flex items-center justify-center shrink-0" style={{ background: 'var(--shell-border-soft)', borderColor: 'var(--shell-accent)' }}>
                                        <HiOutlineHeart className="w-4 h-4 shell-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold shell-text truncate">
                                            {tenant.bride_name} & {tenant.groom_name}
                                        </p>
                                        <p className="text-[10px] shell-muted truncate">{tenant.domain_slug}</p>
                                    </div>
                                </div>
                                {tenant.plan_type && (
                                    <div className="mt-2.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${planPillClass(tenant.plan_type)}`}>
                                            <HiOutlineBadgeCheck className="w-3.5 h-3.5" />
                                            {tenant.plan_type}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <div className={`shell-main flex-1 flex flex-col min-h-screen overflow-hidden transition-[margin] duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
                {/* Topbar */}
                <header className={`shell-topbar fixed top-0 left-0 right-0 z-30 transition-[left] duration-300 ${collapsed ? 'lg:left-16' : 'lg:left-60'}`}>
                    <div className="flex items-center justify-between px-4 lg:px-8 h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="shell-icon-btn lg:hidden p-2 transition-transform"
                            >
                                <HiOutlineMenu className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col justify-center">
                                {/* Breadcrumb / Context Badge */}
                                {isImpersonating && (
                                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-300 tracking-wider uppercase mb-0.5">
                                        Viewing as Tenant: {tenant?.bride_name} & {tenant?.groom_name}
                                    </span>
                                )}
                                {user?.role === 'staff' && (
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 tracking-wider uppercase mb-0.5">
                                        Staff Receptionist: {tenant?.bride_name} & {tenant?.groom_name}
                                    </span>
                                )}

                                <h2 className="shell-title text-[10px] md:text-[11px]">
                                    {getHeaderTitle()}
                                </h2>
                                {getHeaderDescription() && (
                                    <p className="shell-desc text-[9px] md:text-[11px] mt-1 hidden sm:block truncate max-w-[280px] md:max-w-[450px]">
                                        {getHeaderDescription()}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden lg:flex items-center gap-3">
                                {/* "Versi Mobile" kini ada di dalam UserMenu dropdown. */}

                                {/* Open Invitation Shortcut */}
                                {tenant?.domain_slug && showTenantMenu && (
                                    <a
                                        href={`${window.location.origin}${window.location.pathname}#/${tenant.domain_slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shell-icon-btn px-2.5 py-2 transition-transform flex items-center gap-2 group"
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
                                    className="shell-icon-btn p-2.5 transition-transform"
                                    aria-label="Toggle dark mode"
                                >
                                    {isDark ? (
                                        <HiOutlineSun className="w-5 h-5 text-gold-400" />
                                    ) : (
                                        <HiOutlineMoon className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            {/* Identitas + aksi (role, paket, ganti password, logout)
                                dikelompokkan ke dalam satu avatar-dropdown supaya
                                topbar tidak ramai. Di layar sangat kecil (<sm)
                                pakai hamburger + MobileMenuOverlay, jadi disembunyikan. */}
                            <div className="hidden sm:block">
                                <UserMenu
                                    variant="topbar"
                                    username={user?.username}
                                    role={user?.role}
                                    planType={showTenantMenu ? tenant?.plan_type : undefined}
                                    planPillClass={planPillClass(tenant?.plan_type)}
                                    onChangePassword={() => setPasswordModalOpen(true)}
                                    onLogout={() => setLogoutConfirmOpen(true)}
                                    onSwitchView={switchToMobile}
                                    switchViewLabel={t('view_switch.to_mobile', 'Versi Mobile')}
                                    switchViewIcon={<HiOutlineDeviceMobile className="w-[18px] h-[18px]" />}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-3 lg:p-8 pt-20 lg:pt-24 overflow-y-auto">
                    {/* Per-page Suspense so lazy-loaded route chunks stream in
                        without unmounting the sidebar/topbar. */}
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin" />
                        </div>
                    }>
                        <Outlet />
                    </Suspense>
                </main>

                {/* Footer */}
                <footer className="shell-footer px-8 py-4">
                    <p className="lp-pixel shell-muted text-center text-[8px] leading-[1.8]">
                        © 2026 Wedding SaaS Platform. Built with ❤️
                    </p>
                </footer>
            </div>

            <ChangePasswordModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
            />

            <ConfirmDialog
                isOpen={logoutConfirmOpen}
                onClose={() => setLogoutConfirmOpen(false)}
                onConfirm={() => {
                    setLogoutConfirmOpen(false);
                    handleLogout();
                }}
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
