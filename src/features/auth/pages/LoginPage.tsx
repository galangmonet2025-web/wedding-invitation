import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import kosaIcon from '@/assets/img/kosa-icon.png';
import bgLogin from '@/assets/img/bg-login.jpg';
import { useAuthStore } from '../store/authStore';
import { authApi, publicApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineHeart, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { LoadingOverlay } from '@/shared/components/Loading';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';

const BACKGROUND_PARTICLES = [
    { size: 4, left: 12, delay: 0.5, duration: 12 },
    { size: 6, left: 28, delay: 2.1, duration: 16 },
    { size: 3, left: 45, delay: 0.0, duration: 10 },
    { size: 5, left: 62, delay: 4.5, duration: 14 },
    { size: 7, left: 81, delay: 1.2, duration: 18 },
    { size: 4, left: 93, delay: 3.3, duration: 11 },
    { size: 5, left: 5, delay: 5.0, duration: 15 },
    { size: 3, left: 37, delay: 1.8, duration: 13 },
    { size: 6, left: 54, delay: 6.2, duration: 17 },
    { size: 4, left: 73, delay: 0.9, duration: 12 },
    { size: 8, left: 88, delay: 2.7, duration: 19 },
    { size: 3, left: 19, delay: 4.1, duration: 11 },
    { size: 5, left: 67, delay: 5.5, duration: 14 },
    { size: 4, left: 32, delay: 3.8, duration: 13 },
    { size: 6, left: 78, delay: 0.2, duration: 15 }
];

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
        <div className="min-h-screen flex">
            {loading && <LoadingOverlay message={t('auth.logging_in')} />}

            {/* Left Panel - Premium Layered & Animated Wedding Background */}
            <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-black">
                {/* 1. Ken Burns Background Image */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                    <img
                        src={bgLogin}
                        alt="Wedding Reception Background"
                        className="w-full h-full object-cover opacity-80 scale-105 animate-slow-zoom"
                    />
                </div>

                {/* 2. Dark Transparent Overlay */}
                <div className="absolute inset-0 bg-black/60 z-[1] pointer-events-none" />



                {/* 5. Floating Sparkle Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2] select-none">
                    {BACKGROUND_PARTICLES.map((p, idx) => (
                        <div
                            key={idx}
                            className="absolute rounded-full bg-gradient-to-b from-gold-200 to-amber-300 blur-[0.5px] animate-drift"
                            style={{
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                left: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${p.duration}s`,
                                bottom: '-20px'
                            }}
                        />
                    ))}
                </div>

                {/* 6. Foreground Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
                    <Link to="/home" className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center mb-8 shadow-2xl hover:bg-white/30 transition-all duration-300 group overflow-hidden p-3">
                        <img src={logoUrl || kosaIcon} alt="Logo" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                    </Link>
                    <h1 className="text-4xl font-display font-bold mb-4 text-center">{displaySiteName}</h1>
                    <p className="text-lg text-white/80 text-center max-w-md leading-relaxed">
                        {displaySiteDesc}
                    </p>
                    <div className="mt-12 flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-3xl font-bold">100+</p>
                            <p className="text-sm text-white/60">{t('auth.active_weddings')}</p>
                        </div>
                        <div className="w-px h-12 bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">10K+</p>
                            <p className="text-sm text-white/60">{t('auth.guests_managed')}</p>
                        </div>
                        <div className="w-px h-12 bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">99%</p>
                            <p className="text-sm text-white/60">{t('auth.uptime')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-[600px] lg:flex-shrink-0 flex items-center justify-center p-8 bg-white dark:bg-wedding-dark relative">
                <div className="absolute top-8 right-8">
                    <LanguageSwitcher />
                </div>

                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <Link to="/home" className="lg:hidden flex items-center justify-center gap-3 mb-8 group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold group-hover:scale-105 transition-transform duration-300 overflow-hidden p-2">
                            <img src={logoUrl || kosaIcon} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white group-hover:text-gold-600 transition-colors duration-300">
                            {siteName ? siteName : <>Wedding<span className="text-gradient-gold">SaaS</span></>}
                        </h1>
                    </Link>

                    <div className="mb-8">
                        <h2 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-2">{t('auth.welcome_back')}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{t('auth.login_desc')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="label-field">{t('auth.username')}</label>
                            <div className="relative">
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="peer input-field pl-12"
                                    placeholder={t('auth.username_field_placeholder')}
                                    autoComplete="username"
                                />
                                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 peer-focus:text-gold-500 transition-colors duration-300 pointer-events-none" />
                            </div>
                        </div>


                        <div>
                            <label htmlFor="password" className="label-field">{t('auth.password')}</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                                    className={`peer input-field pl-12 pr-12 ${errorMsg ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                                    placeholder={t('auth.password_field_placeholder')}
                                    autoComplete="current-password"
                                />
                                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 peer-focus:text-gold-500 transition-colors duration-300 pointer-events-none" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold-500 transition-colors duration-300 focus:outline-none"
                                >
                                    {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Inline error alert */}
                        {errorMsg && (
                            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm animate-shake">
                                <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-base mt-2 relative overflow-hidden group hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all duration-300"
                        >
                            {/* Shimmer reflection effect */}
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                            {loading ? t('auth.logging_in') : t('auth.login_button')}
                        </button>
                    </form>


                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('auth.no_account')}{' '}
                            <Link to="/register" className="text-gold-600 hover:text-gold-700 font-medium transition-colors">
                                {t('auth.register_link')}
                            </Link>
                        </p>
                    </div>

                    {/* <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-center text-gray-400">
                            Demo credentials: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">galang / galang</span> or <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">superadmin / admin123</span>
                        </p>
                    </div> */}
                </div>
            </div>
        </div>
    );
}
