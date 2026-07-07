import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiOutlineDeviceMobile, HiOutlineDesktopComputer } from 'react-icons/hi';

/**
 * Toggles between the two parallel admin route trees that share identical
 * sub-paths (see the router):
 *   - `/private/*` → legacy desktop dashboard (DashboardLayout)
 *   - `/admin/*`   → new bold & colorful, mobile-first UI (AdminLayout)
 *
 * It swaps ONLY the base prefix and keeps the rest of the path + query string,
 * so e.g. `/private/additional-features` ⇄ `/admin/additional-features`.
 *
 * `variant`:
 *   - "full"    → labelled pill button (desktop sidebars / topbars)
 *   - "compact" → icon-only round button (tight mobile spots)
 */
export function ViewSwitchButton({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const isNewView = pathname.startsWith('/admin');
    // Target = same path with the prefix flipped. Fall back to the dashboard
    // if we can't cleanly strip the prefix.
    const rest = isNewView
        ? pathname.replace(/^\/admin/, '') || '/dashboard'
        : pathname.replace(/^\/private/, '') || '/dashboard';
    const target = `${isNewView ? '/private' : '/admin'}${rest}${search}`;

    const label = isNewView
        ? t('view_switch.to_classic', 'Versi Klasik')
        : t('view_switch.to_mobile', 'Versi Mobile');
    const Icon = isNewView ? HiOutlineDesktopComputer : HiOutlineDeviceMobile;

    if (variant === 'compact') {
        return (
            <button
                onClick={() => navigate(target)}
                title={label}
                aria-label={label}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-fuchsia-500/30 active:scale-90 transition-transform"
            >
                <Icon className="w-5 h-5" />
            </button>
        );
    }

    return (
        <button
            onClick={() => navigate(target)}
            title={label}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-fuchsia-500/30 hover:shadow-lg hover:shadow-fuchsia-500/40 active:scale-95 transition-all"
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </button>
    );
}
