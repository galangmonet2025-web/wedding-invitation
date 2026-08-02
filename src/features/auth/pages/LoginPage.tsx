import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import kosaIcon from '@/assets/img/kosa-icon.png';
import { useAuthStore } from '../store/authStore';
import { authApi, publicApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { AuthShell } from '../components/AuthChrome';
import { requestFullscreenAfterLogin, isMobileDevice } from '@/shared/hooks/useEnterFullscreenOnLogin';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [siteName, setSiteName] = useState<string>('');

    const displaySiteName = siteName || t('auth.platform_title');

    // Fetch Global Website Config for Favicon & branding data
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
                const { fetchProxyImageBase64 } = await import('@/shared/components/ProxyImage');
                const res = await publicApi.getWebsiteConfig();
                if (res.success) {
                    if (res.data.site_name) {
                        setSiteName(res.data.site_name);
                    }
                    if (res.data.site_logo) {
                        const resolvedLogo = await fetchProxyImageBase64(res.data.site_logo);
                        setLogoUrl(resolvedLogo);
                        let fav = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                        if (fav) {
                            fav.href = resolvedLogo;
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load website config:', err);
            }
        };
        fetchConfig();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!username.trim() || !password.trim()) {
            setErrorMsg(t('auth.fill_all_fields'));
            return;
        }

        // --- BACKDOOR SUPERADMIN LOGIN FOR DEVELOPMENT ---
        if (username === 'superadmin' && password === 'admin123') {
            const fakeSuperAdminUser = {
                id: 'super-123',
                username: 'superadmin',
                role: 'superadmin' as const,
                tenant_id: 'system',
                created_at: new Date().toISOString()
            };
            const mockTenant = {
                id: 'system',
                domain_slug: 'system',
                bride_name: 'System',
                groom_name: 'Admin',
                wedding_date: new Date().toISOString(),
                status_account: 'active' as const,
                package: 'premium' as const,
                plan_type: 'premium' as const,
                guest_limit: 999999,
                created_at: new Date().toISOString(),
                payment_deadline: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status_payment: 'Sudah dibayar' as const
            };
            const targetPath = fakeSuperAdminUser.role === 'superadmin'
                ? '/#/private/global-dashboard'
                : '/#/private/dashboard';

            setAuth('dummy-superadmin-token', fakeSuperAdminUser, mockTenant);
            toast.success(t('auth.welcome_superadmin'));

            // On mobile, enter fullscreen on the first tap after the reload lands.
            requestFullscreenAfterLogin();
            // Force a full page reload to clear all SPA state/stores for the new session
            window.location.href = window.location.origin + window.location.pathname + targetPath;
            return;
        }
        // ------------------------------------------------

        setLoading(true);
        try {
            const response = await authApi.login({ username, password }, { skipLoader: true } as any);
            if (response.success) {
                setAuth(response.data.token, response.data.user, response.data.tenant);
                toast.success(t('auth.welcome_back_toast'));
                // Tenant admin yang login dari HP diarahkan ke UI "Versi Mobile"
                // (/admin/*), bukan dashboard klasik (/private/*). Superadmin & staff
                // tetap ke route klasik. Guest bisa pindah kapan saja lewat tombol
                // Versi Klasik/Versi Mobile (ViewSwitchButton).
                const tenantDashboard = isMobileDevice() ? '/#/admin/dashboard' : '/#/private/dashboard';
                const targetPath = response.data.user.role === 'superadmin'
                    ? '/#/private/global-dashboard'
                    : (response.data.user.role === 'staff' ? '/#/private/scanner' : tenantDashboard);

                // On mobile, enter fullscreen on the first tap after the reload lands.
                requestFullscreenAfterLogin();
                // Force a full page reload to clear all SPA state/stores for the new session
                window.location.href = window.location.origin + window.location.pathname + targetPath;
            } else {
                setErrorMsg(response.message || t('auth.invalid_credentials'));
            }
        } catch (error: unknown) {
            const msg = (error instanceof Error) ? error.message : null;
            setErrorMsg(msg || t('auth.network_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            logoUrl={logoUrl}
            fallbackLogo={kosaIcon}
            title={displaySiteName}
            eyebrow={t('auth.login_button')}
            heading={t('auth.welcome_back')}
            subheading={t('auth.login_desc')}
            topRight={<LanguageSwitcher />}
            aside={
                <div className="au-stats">
                    <div>
                        <p className="au-stat-num">100+</p>
                        <p className="au-stat-label">{t('auth.active_weddings')}</p>
                    </div>
                    <div>
                        <p className="au-stat-num">10K+</p>
                        <p className="au-stat-label">{t('auth.guests_managed')}</p>
                    </div>
                    <div>
                        <p className="au-stat-num">99%</p>
                        <p className="au-stat-label">{t('auth.uptime')}</p>
                    </div>
                </div>
            }
        >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="lp-label">{t('auth.username')}</label>
                            <div className="relative">
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="lp-input has-icon"
                                    placeholder={t('auth.username_field_placeholder')}
                                    autoComplete="username"
                                />
                                <HiOutlineMail className="lp-input-ico" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="lp-label">{t('auth.password')}</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                                    className={`lp-input has-icon has-icon-right ${errorMsg ? 'is-error' : ''}`}
                                    placeholder={t('auth.password_field_placeholder')}
                                    autoComplete="current-password"
                                />
                                <HiOutlineLockClosed className="lp-input-ico" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="lp-input-eye"
                                >
                                    {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Alert error inline */}
                        {errorMsg && (
                            <div className="lp-alert animate-shake">
                                <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="lp-btn lp-btn-coin w-full mt-2"
                        >
                            {loading && (
                                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                            )}
                            {loading ? t('auth.logging_in') : t('auth.login_button')}
                        </button>
                    </form>

                    <p className="au-foot-note">
                        {t('auth.no_account')}{' '}
                        <Link to="/register" className="lp-link">
                            {t('auth.register_link')}
                        </Link>
                    </p>
        </AuthShell>
    );
}
