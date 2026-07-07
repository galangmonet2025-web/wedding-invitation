import { useLocation } from 'react-router-dom';

/**
 * The admin dashboard is served from TWO parallel route trees that share the
 * exact same page components:
 *   - `/private/*`  → the original (legacy) DashboardLayout
 *   - `/admin/*`    → the new mobile-first AdminLayout (bold & colorful)
 *
 * Any page that navigates to a SIBLING page (e.g. themes → theme editor,
 * master-quotes list → form) must not hardcode `/private/...`, or the link
 * would jump the user out of the `/admin` tree. This hook returns the base
 * prefix for whichever tree is currently active so those navigations stay
 * inside it.
 */
export function useBasePath(): '/admin' | '/private' {
    const { pathname } = useLocation();
    return pathname.startsWith('/admin') ? '/admin' : '/private';
}
