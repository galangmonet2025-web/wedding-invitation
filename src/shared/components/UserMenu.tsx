import { useState, useRef, useEffect, ReactNode } from 'react';
import { HiOutlineKey, HiOutlineLogout, HiOutlineChevronDown, HiOutlineBadgeCheck } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';

/**
 * UserMenu — satu dropdown identitas+aksi yang dipakai di DUA tempat pada shell
 * admin klasik (/private):
 *   - variant="topbar"  : avatar bulat + chevron di pojok kanan topbar.
 *   - variant="sidebar" : baris avatar + nama/role + chevron di kaki sidebar.
 *
 * Tujuannya mengelompokkan elemen yang tadinya tersebar (badge role, plan pill,
 * Change Password, Logout) ke dalam satu menu, sehingga topbar & sidebar lebih
 * rapi. Murni presentasional — semua aksi lewat callback dari host.
 *
 * Di-scope ke kelas `.um-*` + memakai token shell (`--shell-*`) supaya senada
 * dengan light/dark shell.
 */

interface UserMenuProps {
    variant: 'topbar' | 'sidebar';
    username?: string;
    role?: string;
    /** Jenis paket tenant (mis. "PRO"); disembunyikan bila kosong / superadmin. */
    planType?: string;
    /** Kelas pill paket dari host (planPillClass) — biar warna konsisten. */
    planPillClass?: string;
    /** Sidebar dalam mode ciut (icon-only): sembunyikan teks nama/role. */
    collapsed?: boolean;
    onChangePassword: () => void;
    onLogout: () => void;
    /** Aksi ganti tampilan (ke /admin "Versi Mobile"); tampil sbg item menu bila diisi. */
    onSwitchView?: () => void;
    switchViewLabel?: string;
    switchViewIcon?: ReactNode;
}

export function UserMenu({
    variant,
    username,
    role,
    planType,
    planPillClass,
    collapsed = false,
    onChangePassword,
    onLogout,
    onSwitchView,
    switchViewLabel,
    switchViewIcon,
}: UserMenuProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Tutup saat klik di luar atau tekan Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const initial = username?.[0]?.toUpperCase() || 'U';
    const roleLabel = role?.replace('_', ' ');

    // Panel dropdown — sama untuk kedua varian, hanya posisi berbeda.
    const panel = (
        <div className={`um-panel ${variant === 'sidebar' ? 'um-panel-sidebar' : 'um-panel-topbar'}`} role="menu">
            <div className="um-head">
                <div className="lp-logo-block !w-9 !h-9 !text-sm">
                    <span>{initial}</span>
                </div>
                <div className="min-w-0">
                    <p className="um-name truncate">{username}</p>
                    <p className="um-role truncate">{roleLabel}</p>
                </div>
            </div>

            {planType && (
                <div className="um-plan-row">
                    <span className={`um-plan-pill ${planPillClass || ''}`}>
                        <HiOutlineBadgeCheck className="w-4 h-4" />
                        {planType}
                    </span>
                </div>
            )}

            <div className="um-divider" />

            {onSwitchView && (
                <button className="um-item um-item-accent" role="menuitem" onClick={() => { setOpen(false); onSwitchView(); }}>
                    <span className="um-item-ico">{switchViewIcon}</span>
                    <span>{switchViewLabel}</span>
                </button>
            )}

            <button className="um-item" role="menuitem" onClick={() => { setOpen(false); onChangePassword(); }}>
                <HiOutlineKey className="w-[18px] h-[18px] um-item-ico" />
                <span>{t('sidebar.change_password')}</span>
            </button>
            <button className="um-item um-item-danger" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>
                <HiOutlineLogout className="w-[18px] h-[18px]" />
                <span>{t('sidebar.logout')}</span>
            </button>
        </div>
    );

    return (
        <div className={`um-root ${variant === 'sidebar' ? 'um-root-sidebar' : ''}`} ref={rootRef}>
            {variant === 'topbar' ? (
                <button
                    type="button"
                    className={`um-trigger-topbar ${open ? 'is-open' : ''}`}
                    onClick={() => setOpen(v => !v)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    title={`${username} • ${roleLabel}`}
                >
                    <div className="lp-logo-block !w-8 !h-8 !text-xs">
                        <span>{initial}</span>
                    </div>
                    <HiOutlineChevronDown className={`um-chev ${open ? 'rotate-180' : ''}`} />
                </button>
            ) : (
                <button
                    type="button"
                    className={`um-trigger-sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}
                    onClick={() => setOpen(v => !v)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    title={collapsed ? `${username} • ${roleLabel}` : undefined}
                >
                    <div className="lp-logo-block !w-8 !h-8 !text-xs shrink-0">
                        <span>{initial}</span>
                    </div>
                    {!collapsed && (
                        <>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="um-name truncate">{username}</p>
                                <p className="um-role truncate">{roleLabel}</p>
                            </div>
                            <HiOutlineChevronDown className={`um-chev ${open ? 'rotate-180' : ''}`} />
                        </>
                    )}
                </button>
            )}

            {open && panel}
        </div>
    );
}
