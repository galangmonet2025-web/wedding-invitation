import { useState, useEffect, useCallback, useMemo, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, parse } from 'date-fns';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import kosaIcon from '@/assets/img/kosa-icon.png';
import { useAuthStore } from '../store/authStore';
import { authApi, publicApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineCalendar, HiOutlineGlobe, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { LoadingOverlay } from '@/shared/components/Loading';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { RetroAuthAside, RetroAuthStyle } from '../components/RetroAuthChrome';

export function RegisterPage() {
    // Saat registrasi cukup minta NAMA PANGGILAN (nickname) mempelai; nama LENGKAP
    // (bride_name/groom_name) diisi belakangan di halaman Pengaturan Konten. Field
    // *_name tetap ada di state karena backend registerTenant mewajibkannya — saat
    // submit kita isi *_name = nickname sebagai nilai awal (bisa diubah nanti).
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
            if (name === 'plan_type') {
                const selectedPlan = planTypes.find(p => p.plan_type === value);
                if (selectedPlan) {
                    next.guest_limit = selectedPlan.guest_limit;
                }
            }
            return next;
        });
    };

    // Slug otomatis dari NAMA PANGGILAN mempelai (nickname). Nickname sudah berupa
    // satu kata, tapi tetap dibersihkan (huruf/angka, spasi→'') agar aman jadi slug.
    const slugifyNick = (nick: string) =>
        (nick || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

    const generateSmartSlug = useCallback((groomNick: string, brideNick: string) => {
        const g = slugifyNick(groomNick);
        const b = slugifyNick(brideNick);

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
                className="lp-input has-icon w-full cursor-pointer"
            />
            <HiOutlineCalendar className="lp-input-ico" />
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
                    className="lp-input has-icon w-full"
                    autoComplete="off"
                    showYearDropdown
                    scrollableYearDropdown
                    yearDropdownItemNumber={15}
                    customInput={<CustomDateInput />}
                />
                {/* Datepicker bergaya gelap agar SENADA dengan panel form.
                    CATATAN: font pixel 'Press Start 2P' TIDAK dipakai untuk isi
                    kalender — huruf pixel terlalu lebar sehingga angka 2-digit saling
                    bertumpuk. Hanya JUDUL BULAN yang pixel (teks pendek); nama hari &
                    angka pakai font normal + tiap sel diberi ukuran & line-height tetap
                    supaya rapi tidak menumpuk. */}
                <style>{`
                    .premium-datepicker .react-datepicker-wrapper { width: 100%; }
                    .premium-datepicker .react-datepicker {
                        font-family: inherit;
                        border-radius: 3px;
                        border: 3px solid #000;
                        box-shadow: 6px 6px 0 rgba(0,0,0,.5);
                        overflow: hidden;
                        background: #1b1530;
                    }
                    .premium-datepicker .react-datepicker__header {
                        background-color: #171326;
                        border-bottom: 3px solid #000;
                        padding-top: 10px;
                    }
                    .premium-datepicker .react-datepicker__current-month {
                        font-family: 'Press Start 2P', monospace;
                        color: #fac000; font-size: 9px; letter-spacing: 1px; margin-bottom: 6px;
                    }
                    .premium-datepicker .react-datepicker-time__header,
                    .premium-datepicker .react-datepicker-year-header {
                        color: #fac000; font-size: 12px; font-weight: 700;
                    }
                    .premium-datepicker .react-datepicker__day-name {
                        color: rgba(255,255,255,.55); font-size: 11px; font-weight: 700;
                        width: 2rem; line-height: 1.6rem; margin: 2px;
                    }
                    .premium-datepicker .react-datepicker__day {
                        color: #fff; font-size: 12px; font-weight: 600; border-radius: 4px;
                        width: 2rem; height: 2rem; line-height: 2rem; margin: 2px;
                    }
                    .premium-datepicker .react-datepicker__day--outside-month { color: rgba(255,255,255,.25); }
                    .premium-datepicker .react-datepicker__day--selected,
                    .premium-datepicker .react-datepicker__day--keyboard-selected {
                        background-color: #fac000 !important;
                        color: #000 !important;
                        border-radius: 4px;
                    }
                    .premium-datepicker .react-datepicker__day:hover {
                        background-color: rgba(250,192,0,.25);
                        border-radius: 4px;
                    }
                    .premium-datepicker .react-datepicker__navigation-icon::before { border-color: #fac000; }
                    .premium-datepicker .react-datepicker__year-dropdown,
                    .premium-datepicker .react-datepicker__month-dropdown {
                        background: #1b1530; border: 3px solid #000; color: #fff; font-size: 12px;
                    }
                    .premium-datepicker .react-datepicker__year-option:hover,
                    .premium-datepicker .react-datepicker__month-option:hover { background: rgba(250,192,0,.25); }
                    .premium-datepicker .react-datepicker__triangle { display: none; }
                `}</style>
            </div>
        );
    };

    // Effect for auto-slug generation and availability check (dari nickname).
    useEffect(() => {
        if (!isAutoSlug || (!form.groom_nickname && !form.bride_nickname)) {
            if (isAutoSlug) setForm(prev => ({ ...prev, domain_slug: '' }));
            return;
        }

        setIsCheckingSlug(true);
        const timer = setTimeout(async () => {
            const baseSlug = generateSmartSlug(form.groom_nickname, form.bride_nickname);
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
    }, [form.groom_nickname, form.bride_nickname, isAutoSlug, generateSmartSlug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Saat registrasi kita minta NICKNAME, bukan nama lengkap. Validasi pakai
        // field nickname yang benar-benar diisi user.
        const requiredFields = ['groom_nickname', 'bride_nickname', 'religion', 'wedding_date', 'domain_slug', 'username', 'password', 'plan_type'];
        const missingField = requiredFields.find(field => !String((form as any)[field] || '').trim());

        if (missingField) {
            toast.error(t('auth.fill_all_fields'));
            return;
        }

        setLoading(true);
        try {
            // Saat registrasi, ke-4 kolom mempelai (bride_nickname, bride_name,
            // groom_nickname, groom_name) diisi SAMA dengan nilai nickname. Nama
            // LENGKAP dilengkapi/diperbaiki user nanti di halaman Pengaturan Konten
            // (yang punya field nama lengkap + panggilan terpisah).
            const groomNick = form.groom_nickname.trim();
            const brideNick = form.bride_nickname.trim();
            const payload = {
                ...form,
                groom_nickname: groomNick,
                bride_nickname: brideNick,
                groom_name: groomNick,
                bride_name: brideNick,
            };
            const response = await authApi.registerTenant(payload, { skipLoader: true } as any);
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
        <div className="rm-lp min-h-screen flex" style={{ background: 'var(--lp-ink)' }}>
            <RetroAuthStyle />
            {loading && <LoadingOverlay message={t('auth.creating_wedding')} />}

            {/* Panel kiri — "world 1-1" langit + dekorasi retro (lg+) */}
            <RetroAuthAside
                logoUrl={logoUrl}
                fallbackLogo={kosaIcon}
                title={displaySiteName}
                desc={displaySiteDesc}
            >
                <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-4">
                    {[t('auth.feat_guests'), t('auth.feat_checkin'), t('auth.feat_gifts'), t('auth.feat_analytics')].map((feat, i) => (
                        <div key={i} className="flex items-center gap-3 text-white/85">
                            <span className="lp-coin" style={{ position: 'static', animation: 'lp-spin 1.6s steps(8) infinite' }} />
                            <span className="lp-pixel text-[8px] leading-[1.6]">{feat}</span>
                        </div>
                    ))}
                </div>
            </RetroAuthAside>

            {/* Panel kanan — form registrasi */}
            <div className="lp-form-panel w-full lg:w-[600px] lg:flex-shrink-0 flex items-center justify-center p-8 overflow-y-auto relative">
                <div className="absolute top-8 right-8 z-10">
                    <LanguageSwitcher />
                </div>

                <div className="w-full max-w-md">
                    <Link to="/landing-page" className="lg:hidden flex items-center justify-center gap-3 mb-6">
                        <div className="lp-logo-block overflow-hidden p-2">
                            <img src={logoUrl || kosaIcon} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    </Link>

                    <div className="mb-6">
                        <span className="lp-eyebrow lp-blink">NEW GAME</span>
                        <h2 className="lp-pixel text-base sm:text-lg text-white leading-[1.6] mt-4 mb-3" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                            {t('auth.register_title')}
                        </h2>
                        <p className="text-white/60 font-medium text-sm">{t('auth.register_desc')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">

                            <div>
                                <label htmlFor="groom_nickname" className="lp-label">{t('auth.groom_nickname')}</label>
                                <input
                                    id="groom_nickname"
                                    name="groom_nickname"
                                    type="text"
                                    value={form.groom_nickname}
                                    onChange={handleChange}
                                    className="lp-input"
                                    placeholder={t('auth.groom_nickname_placeholder')}
                                />
                            </div>
                            <div>
                                <label htmlFor="bride_nickname" className="lp-label">{t('auth.bride_nickname')}</label>
                                <input
                                    id="bride_nickname"
                                    name="bride_nickname"
                                    type="text"
                                    value={form.bride_nickname}
                                    onChange={handleChange}
                                    className="lp-input"
                                    placeholder={t('auth.bride_nickname_placeholder')}
                                />
                            </div>
                            <div>
                                <label htmlFor="religion" className="lp-label">{t('auth.religion_label')}</label>
                                <select
                                    id="religion"
                                    name="religion"
                                    value={form.religion}
                                    onChange={handleChange}
                                    className="lp-input"
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
                                <label htmlFor="plan_type" className="lp-label">{t('auth.plan_type_label')}</label>
                                <select
                                    id="plan_type"
                                    name="plan_type"
                                    value={form.plan_type}
                                    onChange={handleChange}
                                    className="lp-input"
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
                            <label htmlFor="wedding_date" className="lp-label">{t('auth.wedding_date')}</label>
                            <DateInputLocal
                                value={form.wedding_date}
                                onChange={(val) => setForm(prev => ({ ...prev, wedding_date: val }))}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="domain_slug" className="lp-label !mb-0">{t('auth.domain_slug')}</label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isAutoSlug}
                                        onChange={(e) => {
                                            setIsAutoSlug(e.target.checked);
                                            if (e.target.checked) setSlugStatus({ message: '', isConflict: false });
                                        }}
                                        className="w-4 h-4 accent-[var(--lp-coin)] cursor-pointer"
                                    />
                                    <span className="lp-pixel text-[7px] text-white/50 group-hover:text-[var(--lp-coin)] transition-colors">{t('auth.auto_fill')}</span>
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
                                    className="lp-input has-icon has-icon-right"
                                    placeholder="bride-and-groom"
                                />
                                <HiOutlineGlobe className="lp-input-ico" />
                                {isCheckingSlug && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-[var(--lp-coin)]/25 border-t-[var(--lp-coin)] rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            {slugStatus.message && (
                                <p className="text-[11px] text-amber-300 mt-2 font-semibold bg-amber-500/10 p-2 rounded border-2 border-amber-500/40">
                                    {slugStatus.message}
                                </p>
                            )}
                            <p className="text-xs text-white/40 mt-2 font-medium break-all">
                                URL: {window.location.host}{window.location.pathname}#/<span className="font-semibold" style={{ color: 'var(--lp-coin)' }}>{form.domain_slug || 'your-slug'}</span>
                            </p>
                        </div>

                        <div className="pt-3 flex items-center gap-3">
                            <span className="lp-pixel text-[8px]" style={{ color: 'var(--lp-coin)' }}>▶</span>
                            <p className="lp-pixel text-[8px] tracking-wider text-white/70">{t('auth.admin_account')}</p>
                            <span className="flex-1 h-[3px]" style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.2) 0 6px, transparent 6px 12px)' }} />
                        </div>

                        <div>
                            <label htmlFor="reg-username" className="lp-label">{t('auth.username')}</label>
                            <div className="relative">
                                <input
                                    id="reg-username"
                                    name="username"
                                    type="text"
                                    value={form.username}
                                    onChange={handleChange}
                                    className="lp-input has-icon"
                                    placeholder={t('auth.username_placeholder')}
                                    autoComplete="username"
                                />
                                <HiOutlineUser className="lp-input-ico" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="reg-password" className="lp-label">{t('auth.password')}</label>
                            <div className="relative">
                                <input
                                    id="reg-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={handleChange}
                                    className="lp-input has-icon has-icon-right"
                                    placeholder={t('auth.password_hint')}
                                    autoComplete="new-password"
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="lp-btn lp-btn-coin w-full text-[11px] py-4 mt-2"
                        >
                            {loading ? t('auth.creating_wedding') : t('auth.register_button')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="lp-pixel text-[8px] leading-[1.8] text-white/50">
                            {t('auth.already_have_account')}{' '}
                            <Link to="/login" className="lp-link">
                                {t('auth.login_link')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
