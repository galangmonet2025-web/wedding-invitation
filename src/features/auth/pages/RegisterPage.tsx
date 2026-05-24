import { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import kosaIcon from '@/assets/img/kosa-icon.png';
import bgRegister from '@/assets/img/bg-register.jpg';
import { useAuthStore } from '../store/authStore';
import { authApi, publicApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { HiOutlineHeart, HiOutlineUser, HiOutlineLockClosed, HiOutlineCalendar, HiOutlineGlobe, HiOutlineMail, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
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

export function RegisterPage() {
    const [form, setForm] = useState({
        bride_name: '',
        bride_nickname: '',
        groom_name: '',
        groom_nickname: '',
        religion: '',
        wedding_date: '',
        domain_slug: '',
        username: '',
        password: '',
        plan_type: 'basic',
        guest_limit: 100,
    });
    const [isAutoGroomNickname, setIsAutoGroomNickname] = useState(true);
    const [isAutoBrideNickname, setIsAutoBrideNickname] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isAutoSlug, setIsAutoSlug] = useState(true);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [slugStatus, setSlugStatus] = useState({ message: '', isConflict: false });
    const [planTypes, setPlanTypes] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { t } = useTranslation();

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [siteName, setSiteName] = useState<string>('');
    const [siteDescription, setSiteDescription] = useState<string>('');

    const displaySiteName = siteName || t('auth.start_journey');
    const displaySiteDesc = siteDescription || t('auth.start_desc');

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

    // Fetch Plan Types
    useEffect(() => {
        const fetchPlanTypes = async () => {
            try {
                const res = await publicApi.getPublicPlanTypes();
                if (res.success) {
                    setPlanTypes(res.data);
                    // Update initial guest_limit based on default basic plan
                    const basicPlan = res.data.find((p: any) => p.plan_type === 'basic');
                    if (basicPlan) {
                        setForm(prev => ({ ...prev, guest_limit: basicPlan.guest_limit }));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch plan types:', err);
            }
        };
        fetchPlanTypes();
    }, []);

    // Set plan_type from URL if exists
    useEffect(() => {
        const planFromUrl = searchParams.get('plan_type');
        if (planFromUrl && ['basic', 'pro', 'premium'].includes(planFromUrl.toLowerCase())) {
            setForm(prev => ({ ...prev, plan_type: planFromUrl.toLowerCase() }));

            // Also sync guest_limit if plans are already loaded
            if (planTypes.length > 0) {
                const selectedPlan = planTypes.find(p => p.plan_type === planFromUrl.toLowerCase());
                if (selectedPlan) {
                    setForm(prev => ({ ...prev, guest_limit: selectedPlan.guest_limit }));
                }
            }
        }
    }, [searchParams, planTypes]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'groom_name' && isAutoGroomNickname) {
                next.groom_nickname = getFirstName(value);
            }
            if (name === 'bride_name' && isAutoBrideNickname) {
                next.bride_nickname = getFirstName(value);
            }
            if (name === 'plan_type') {
                const selectedPlan = planTypes.find(p => p.plan_type === value);
                if (selectedPlan) {
                    next.guest_limit = selectedPlan.guest_limit;
                }
            }
            return next;
        });

        if (name === 'groom_nickname') setIsAutoGroomNickname(false);
        if (name === 'bride_nickname') setIsAutoBrideNickname(false);
    };

    const prefixes = ['muhammad', 'mohammad', 'moh', 'ahmad', 'achmad', 'made', 'nyoman', 'ketut', 'wayan', 'gede', 'putu', 'agus', 'abdul', 'siti', 'sri', 'cut', 'ni', 'luh', 'maria', 'anastasia', 'nur', 'ade'];

    const getFirstName = (fullName: string) => {
        if (!fullName.trim()) return '';
        const parts = fullName.trim().toLowerCase().split(/\s+/);
        let name = parts[0];
        if (parts.length > 1 && prefixes.includes(parts[0])) {
            name = parts[1];
        }
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const generateSmartSlug = useCallback((groom: string, bride: string) => {
        const g = getFirstName(groom).toLowerCase();
        const b = getFirstName(bride).toLowerCase();

        if (!g && !b) return '';
        if (!g) return b;
        if (!b) return g;
        return `${g}-${b}`;
    }, []);

    // Helper for date formatting DD/MM/YYYY <-> YYYY-MM-DD
    const formatToDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('/')) return dateStr; // Already in display format
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
    };

    const formatToValue = (displayStr: string) => {
        if (!displayStr) return '';
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(displayStr)) return displayStr;

        const digits = displayStr.replace(/\D/g, '');
        if (digits.length === 8) {
            const d = digits.substring(0, 2);
            const m = digits.substring(2, 4);
            const y = digits.substring(4, 8);
            return `${y}-${m}-${d}`;
        }
        return displayStr;
    };

    const CustomDateInput = forwardRef(({ value, onClick, placeholder }: any, ref: any) => (
        <div className="relative cursor-pointer" onClick={onClick}>
            <input
                ref={ref}
                value={value}
                readOnly
                placeholder={placeholder}
                className="input-field pl-12 pr-12 w-full cursor-pointer"
            />
            <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
    ));

    const DateInputLocal = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
        const dateValue = useMemo(() => {
            if (!value) return null;
            const parsed = parse(value, 'yyyy-MM-dd', new Date());
            return isNaN(parsed.getTime()) ? null : parsed;
        }, [value]);

        return (
            <div className="w-full premium-datepicker">
                <DatePicker
                    selected={dateValue}
                    onChange={(date: Date | null) => {
                        if (date) {
                            onChange(format(date, 'yyyy-MM-dd'));
                        } else {
                            onChange('');
                        }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY"
                    className="input-field pl-12 pr-12 w-full"
                    autoComplete="off"
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={15}
                    customInput={<CustomDateInput />}
                />
                <style>{`
                    .premium-datepicker .react-datepicker-wrapper {
                        width: 100%;
                    }
                    .premium-datepicker .react-datepicker {
                        font-family: inherit;
                        border-radius: 12px;
                        border: 1px solid #e5e7eb;
                        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                        overflow: hidden;
                    }
                    .premium-datepicker .react-datepicker__header {
                        background-color: #fff;
                        border-bottom: 1px solid #f3f4f6;
                        padding-top: 12px;
                    }
                    .premium-datepicker .react-datepicker__day--selected {
                        background-color: #d4af37 !important;
                        color: #fff !important;
                        border-radius: 8px;
                    }
                    .premium-datepicker .react-datepicker__day:hover {
                        background-color: #fefce8;
                        border-radius: 8px;
                    }
                `}</style>
            </div>
        );
    };

    // Effect for auto-slug generation and availability check
    useEffect(() => {
        if (!isAutoSlug || (!form.groom_name && !form.bride_name)) {
            if (isAutoSlug) setForm(prev => ({ ...prev, domain_slug: '' }));
            return;
        }

        setIsCheckingSlug(true);
        const timer = setTimeout(async () => {
            const baseSlug = generateSmartSlug(form.groom_name, form.bride_name);
            if (!baseSlug) {
                setIsCheckingSlug(false);
                return;
            }

            // Try male-female first
            try {
                const res1 = await authApi.checkSlug(baseSlug);
                if (res1.success && res1.data.available) {
                    setForm(prev => ({ ...prev, domain_slug: baseSlug }));
                    setSlugStatus({ message: '', isConflict: false });
                    return;
                }

                // If taken, try female-male
                const reversedParts = baseSlug.split('-');
                if (reversedParts.length === 2) {
                    const reversedSlug = `${reversedParts[1]}-${reversedParts[0]}`;
                    const res2 = await authApi.checkSlug(reversedSlug);
                    if (res2.success && res2.data.available) {
                        setForm(prev => ({ ...prev, domain_slug: reversedSlug }));
                        setSlugStatus({ message: '', isConflict: false });
                        return;
                    }
                }

                // Both taken
                setSlugStatus({
                    message: t('auth.slug_conflict_error'),
                    isConflict: true
                });
                setIsAutoSlug(false); // Enable manual input
            } catch (error) {
                console.error('Slug check failed', error);
            } finally {
                setIsCheckingSlug(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [form.groom_name, form.bride_name, isAutoSlug, generateSmartSlug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Required fields check (excluding nicknames which are auto-generated and hidden)
        const requiredFields = ['groom_name', 'bride_name', 'religion', 'wedding_date', 'domain_slug', 'username', 'password', 'plan_type'];
        const missingField = requiredFields.find(field => !String((form as any)[field] || '').trim());

        if (missingField) {
            toast.error(t('auth.fill_all_fields'));
            return;
        }

        setLoading(true);
        try {
            const response = await authApi.registerTenant(form, { skipLoader: true } as any);
            if (response.success) {
                setAuth(response.data.token, response.data.user, response.data.tenant);
                toast.success(t('auth.register_success'));
                navigate('/private/dashboard');
            } else {
                toast.error(response.message || t('auth.register_failed'));
            }
        } catch (error: unknown) {
            toast.error(t('auth.register_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {loading && <LoadingOverlay message={t('auth.creating_wedding')} />}

            {/* Left Panel - Premium Layered & Animated Wedding Background */}
            <div className="hidden lg:flex lg:flex-1 relative overflow-hidden bg-black">
                {/* 1. Ken Burns Background Image */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                    <img
                        src={bgRegister}
                        alt="Wedding Altar Background"
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
                    <div className="mt-12 grid grid-cols-2 gap-6 text-sm">
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            {t('auth.feat_guests')}
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            {t('auth.feat_checkin')}
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            {t('auth.feat_gifts')}
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            {t('auth.feat_analytics')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Registration Form */}
            <div className="w-full lg:w-[600px] lg:flex-shrink-0 flex items-center justify-center p-8 bg-white dark:bg-wedding-dark overflow-y-auto relative">
                <div className="absolute top-8 right-8">
                    <LanguageSwitcher />
                </div>

                <div className="w-full max-w-md">
                    <Link to="/home" className="lg:hidden flex items-center justify-center gap-3 mb-6 group">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold group-hover:scale-105 transition-transform duration-300 overflow-hidden p-2">
                            <img src={logoUrl || kosaIcon} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </Link>

                    <div className="mb-6">
                        <h2 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-2">{t('auth.register_title')}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{t('auth.register_desc')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">

                            <div>
                                <label htmlFor="groom_name" className="label-field">{t('auth.groom_name')}</label>
                                <input
                                    id="groom_name"
                                    name="groom_name"
                                    type="text"
                                    value={form.groom_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder={t('auth.groom_name_placeholder')}
                                />
                            </div>
                            <div>
                                <label htmlFor="bride_name" className="label-field">{t('auth.bride_name')}</label>
                                <input
                                    id="bride_name"
                                    name="bride_name"
                                    type="text"
                                    value={form.bride_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder={t('auth.bride_name_placeholder')}
                                />
                            </div>
                            <div>
                                <label htmlFor="religion" className="label-field">{t('auth.religion_label')}</label>
                                <select
                                    id="religion"
                                    name="religion"
                                    value={form.religion}
                                    onChange={handleChange}
                                    className="input-field"
                                >
                                    <option value="" disabled>{t('auth.religion_placeholder')}</option>
                                    <option value="Islam">{t('auth.religions.islam')}</option>
                                    <option value="Kristen Protestan">{t('auth.religions.protestant')}</option>
                                    <option value="Katolik">{t('auth.religions.catholic')}</option>
                                    <option value="Hindu">{t('auth.religions.hindu')}</option>
                                    <option value="Buddha">{t('auth.religions.buddha')}</option>
                                    <option value="Konghucu">{t('auth.religions.confucian')}</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="plan_type" className="label-field">{t('auth.plan_type_label')}</label>
                                <select
                                    id="plan_type"
                                    name="plan_type"
                                    value={form.plan_type}
                                    onChange={handleChange}
                                    className="input-field"
                                >
                                    {planTypes.length > 0 ? (
                                        planTypes.map((p) => (
                                            <option key={p.plan_type} value={p.plan_type}>
                                                {t(`auth.plan_${p.plan_type}`)} ({p.guest_limit === 999999 ? t('dashboard.unlimited') : `${p.guest_limit} Tamu`})
                                            </option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="basic">{t('auth.plan_basic')} (100 Tamu)</option>
                                            <option value="pro">{t('auth.plan_pro')} (500 Tamu)</option>
                                            <option value="premium">{t('auth.plan_premium')} (1000 Tamu)</option>
                                        </>
                                    )}
                                </select>
                            </div>


                        </div>

                        <div>
                            <label htmlFor="wedding_date" className="label-field">{t('auth.wedding_date')}</label>
                            <div className="relative group">
                                <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <DateInputLocal
                                    value={form.wedding_date}
                                    onChange={(val) => setForm(prev => ({ ...prev, wedding_date: val }))}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="domain_slug" className="label-field !mb-0">{t('auth.domain_slug')}</label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isAutoSlug}
                                        onChange={(e) => {
                                            setIsAutoSlug(e.target.checked);
                                            if (e.target.checked) setSlugStatus({ message: '', isConflict: false });
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-gold-600 transition-colors uppercase tracking-wider">{t('auth.auto_fill')}</span>
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    id="domain_slug"
                                    name="domain_slug"
                                    type="text"
                                    value={form.domain_slug}
                                    onChange={handleChange}
                                    disabled={isAutoSlug}
                                    className={`peer input-field pl-12 pr-10 ${isAutoSlug ? 'bg-gray-50/50 cursor-not-allowed opacity-80' : ''}`}
                                    placeholder="bride-and-groom"
                                />
                                <HiOutlineGlobe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 peer-focus:text-gold-500 transition-colors duration-300 pointer-events-none" />
                                {isCheckingSlug && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            {slugStatus.message && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800">
                                    {slugStatus.message}
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                                URL: {window.location.host}{window.location.pathname}#/<span className="text-gold-500 font-medium">{form.domain_slug || 'your-slug'}</span>
                            </p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">{t('auth.admin_account')}</p>
                        </div>

                        <div>
                            <label htmlFor="reg-username" className="label-field">{t('auth.username')}</label>
                            <div className="relative">
                                <input
                                    id="reg-username"
                                    name="username"
                                    type="text"
                                    value={form.username}
                                    onChange={handleChange}
                                    className="peer input-field pl-12"
                                    placeholder={t('auth.username_placeholder')}
                                    autoComplete="username"
                                />
                                <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 peer-focus:text-gold-500 transition-colors duration-300 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="reg-password" className="label-field">{t('auth.password')}</label>
                            <div className="relative">
                                <input
                                    id="reg-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={handleChange}
                                    className="peer input-field pl-12 pr-12"
                                    placeholder={t('auth.password_hint')}
                                    autoComplete="new-password"
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-base mt-2 relative overflow-hidden group hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all duration-300"
                        >
                            {/* Shimmer reflection effect */}
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
                            {loading ? t('auth.creating_wedding') : t('auth.register_button')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('auth.already_have_account')}{' '}
                            <Link to="/login" className="text-gold-600 hover:text-gold-700 font-medium transition-colors">
                                {t('auth.login_link')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
