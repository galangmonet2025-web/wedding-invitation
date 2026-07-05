import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import kosaIcon from '@/assets/img/kosa-icon.png';
import { useAuthStore } from '../store/authStore';
import { authApi, publicApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { LoadingOverlay } from '@/shared/components/Loading';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { RetroAuthAside, RetroAuthStyle } from '../components/RetroAuthChrome';

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
    const [siteDescription, setSiteDescription] = useState<string>('');

    const displaySiteName = siteName || t('auth.platform_title');
    const displaySiteDesc = siteDescription || t('auth.platform_desc');

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
                    if (res.data.site_description) {
                        setSiteDescription(res.data.site_description);
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
                const targetPath = response.data.user.role === 'superadmin'
                    ? '/#/private/global-dashboard'
                    : (response.data.user.role === 'staff' ? '/#/private/scanner' : '/#/private/dashboard');

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
        <div className="rm-lp min-h-screen flex" style={{ background: 'var(--lp-ink)' }}>
            <RetroAuthStyle />
            {loading && <LoadingOverlay message={t('auth.logging_in')} />}

            {/* Panel kiri — "world 1-1" langit + dekorasi retro (lg+) */}
            <RetroAuthAside
                logoUrl={logoUrl}
                fallbackLogo={kosaIcon}
                title={displaySiteName}
                desc={displaySiteDesc}
            >
                <div className="mt-12 flex items-center gap-8">
                    <div className="text-center">
                        <p className="lp-stat-num" style={{ color: 'var(--lp-coin)' }}>100+</p>
                        <p className="lp-pixel text-[7px] tracking-widest text-white/60 mt-2">{t('auth.active_weddings')}</p>
                    </div>
                    <div className="lp-divider-v" />
                    <div className="text-center">
                        <p className="lp-stat-num" style={{ color: 'var(--lp-coin)' }}>10K+</p>
                        <p className="lp-pixel text-[7px] tracking-widest text-white/60 mt-2">{t('auth.guests_managed')}</p>
                    </div>
                    <div className="lp-divider-v" />
                    <div className="text-center">
                        <p className="lp-stat-num" style={{ color: 'var(--lp-coin)' }}>99%</p>
                        <p className="lp-pixel text-[7px] tracking-widest text-white/60 mt-2">{t('auth.uptime')}</p>
                    </div>
                </div>
            </RetroAuthAside>

            {/* Panel kanan — form login */}
            <div className="lp-form-panel w-full lg:w-[600px] lg:flex-shrink-0 flex items-center justify-center p-8 relative">
                <div className="absolute top-8 right-8 z-10">
                    <LanguageSwitcher />
                </div>

                <div className="w-full max-w-md">
                    {/* Logo mobile */}
                    <Link to="/landing-page" className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="lp-logo-block overflow-hidden p-2">
                            <img src={logoUrl || kosaIcon} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="lp-pixel text-sm text-white leading-[1.6]">
                            {siteName ? siteName : <>WEDDING<span style={{ color: 'var(--lp-coin)' }}>SAAS</span></>}
                        </h1>
                    </Link>

                    <div className="mb-8">
                        <span className="lp-eyebrow lp-blink">PRESS START</span>
                        <h2 className="lp-pixel text-base sm:text-lg text-white leading-[1.6] mt-4 mb-3" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                            {t('auth.welcome_back')}
                        </h2>
                        <p className="text-white/60 font-medium text-sm">{t('auth.login_desc')}</p>
                    </div>

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
                            className="lp-btn lp-btn-coin w-full text-[11px] py-4 mt-2"
                        >
                            {loading ? t('auth.logging_in') : t('auth.login_button')}
                        </button>
                    </form>

                    <div className="mt-7 text-center">
                        <p className="lp-pixel text-[8px] leading-[1.8] text-white/50">
                            {t('auth.no_account')}{' '}
                            <Link to="/register" className="lp-link">
                                {t('auth.register_link')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
