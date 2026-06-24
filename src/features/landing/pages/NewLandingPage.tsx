import { useState, useEffect, useMemo } from 'react';
import {
    HiOutlineCheck,
    HiOutlineSparkles,
    HiOutlineStar,
    HiOutlineChatAlt,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineChevronDown,
    HiOutlineLocationMarker,
    HiOutlineMail,
    HiOutlineMenu,
    HiOutlineX,
    HiOutlineArrowRight,
    HiOutlinePuzzle,
    HiOutlinePaperAirplane,
    HiOutlineQrcode,
    HiOutlineColorSwatch,
    HiOutlineGift
} from 'react-icons/hi';
import { FaInstagram, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { publicApi } from '@/core/api/endpoints';
import { Theme, MstPlanType, MstPlanFeature, WebsiteConfig, ReviewAndRating, MstAdditionalFeature } from '@/types';
import { ProxyImage } from '@/shared/components/ProxyImage';
import kosaIcon from '@/assets/img/kosa-icon.png';

// Demo tenant slug used by the theme-preview URL (/#/preview/<theme_code>/<slug>).
// The preview forces this theme onto the demo tenant's real invitation data.
// Must match an ACTIVE tenant's domain_slug, otherwise the preview shows "not found".
const PREVIEW_DEMO_SLUG = 'dini-galang';

const NAV_LINKS = ['Keunggulan', 'Tema', 'Harga', 'Fitur', 'Testimoni', 'FAQ'];

// FAQ content for the landing page
const FAQ_ITEMS: Array<{ q: string; a: string }> = [
    {
        q: 'Apakah metode pembayarannya aman?',
        a: 'Sangat aman. Kami menggunakan sistem pembayaran otomatis melalui Midtrans yang mendukung berbagai metode pembayaran seperti Transfer Bank, QRIS, dan E-Wallet (GoPay, OVO, Dana) dengan verifikasi instan.\n\nSelain itu, kami juga menyediakan pembayaran melalui Shopee. Namun, metode ini hanya tersedia untuk pembelian undangan. Untuk pembelian fitur tambahan (additional feature), pembayaran tetap dilakukan melalui Midtrans di website kami.',
    },
    {
        q: 'Apakah undangan bisa dikustomisasi?',
        a: 'Tentu! Nama, tanggal acara, foto, tema, serta seluruh konten undangan dapat disesuaikan sepenuhnya melalui editor visual yang mudah digunakan.',
    },
    {
        q: 'Saya ingin terima beres, bagaimana caranya?',
        a: 'Bisa. Dengan membeli Paket Premium atau fitur tambahan "Terima Beres", seluruh proses pembuatan undangan dapat diserahkan kepada tim kami. Kami akan membantu menyiapkan undangan hingga siap digunakan.',
    },
    {
        q: 'Bagaimana cara membagikan undangan kepada tamu?',
        a: 'Kami menyediakan fitur berbagi undangan melalui WhatsApp. Kamu dapat membuat template pesan undangan dan menggunakannya untuk mengirim undangan kepada seluruh daftar tamu dengan lebih praktis.',
    },
    {
        q: 'Apakah undangan masih bisa diedit setelah dipublikasikan?',
        a: 'Ya. Undangan dapat diedit kapan saja, bahkan setelah dipublikasikan. Setiap perubahan akan tersimpan dan diperbarui secara real-time tanpa perlu membuat ulang atau mencetak ulang undangan.',
    },
];

// Minimum number of public reviews required to show real data.
// Below this, the section falls back to the curated dummy set.
const MIN_REAL_REVIEWS = 3;

// Curated dummy reviews shown only when the DB has fewer than MIN_REAL_REVIEWS.
// Tiap ulasan sengaja menyorot SATU fitur nyata yang ada di platform ini
// (WhatsApp Blast, link personal per tamu, RSVP real-time, scanner QR check-in,
//  buku ucapan, amplop digital/QRIS, galeri+backsound, live streaming,
//  countdown, import Google Contacts, pilihan tema) agar terasa kredibel & menjual.
const DUMMY_REVIEWS: Array<Pick<ReviewAndRating, 'id' | 'comment' | 'rate_star' | 'bride_name' | 'groom_name' | 'wedding_date' | 'alamat'>> = [
    { id: 'd1', rate_star: 5, comment: 'Fitur WhatsApp Blast-nya juara! Sekali atur template, undangan langsung terkirim ke ratusan tamu lengkap dengan nama mereka masing-masing. Hemat waktu banget.', bride_name: 'Anissa', groom_name: 'Rizky', wedding_date: '2025', alamat: 'Jakarta' },
    { id: 'd2', rate_star: 5, comment: 'Tiap tamu dapat link undangan personal, jadi pas dibuka langsung muncul namanya. Mereka merasa benar-benar diundang secara khusus. Sentuhan kecil yang berkesan.', bride_name: 'Dinda', groom_name: 'Fadil', wedding_date: '2025', alamat: 'Surabaya' },
    { id: 'd3', rate_star: 5, comment: 'RSVP real-time-nya sangat membantu. Kami bisa pantau dari dashboard siapa yang konfirmasi hadir, jadi estimasi katering jauh lebih akurat. Nggak ada lagi tebak-tebakan.', bride_name: 'Nisa', groom_name: 'Maulana', wedding_date: '2025', alamat: 'Bandung' },
    { id: 'd4', rate_star: 5, comment: 'Scan QR Code di pintu masuk bikin check-in tamu super cepat dan rapi. Penerima tamu tinggal scan, langsung tercatat siapa yang sudah datang. Antrean hilang!', bride_name: 'Sari', groom_name: 'Bagus', wedding_date: '2025', alamat: 'Yogyakarta' },
    { id: 'd5', rate_star: 5, comment: 'Amplop digital dan QRIS-nya memudahkan tamu yang mau kirim hadiah. Semua nominal yang masuk otomatis tercatat rapi dan bisa kami ekspor ke Excel. Transparan.', bride_name: 'Putri', groom_name: 'Arif', wedding_date: '2025', alamat: 'Semarang' },
    { id: 'd6', rate_star: 5, comment: 'Buku ucapan digitalnya jadi kenang-kenangan paling berharga. Doa dan ucapan dari semua tamu tersimpan dan bisa kami baca ulang kapan saja. Terharu bacanya.', bride_name: 'Maya', groom_name: 'Doni', wedding_date: '2024', alamat: 'Medan' },
    { id: 'd7', rate_star: 5, comment: 'Berkat fitur live streaming, keluarga kami yang di luar kota dan luar negeri tetap bisa menyaksikan akad secara langsung. Momen sakral itu bisa dibagi ke semua.', bride_name: 'Intan', groom_name: 'Yoga', wedding_date: '2025', alamat: 'Balikpapan' },
    { id: 'd8', rate_star: 5, comment: 'Galeri foto pre-wedding plus backsound musiknya bikin undangan terasa hidup dan elegan. Banyak tamu yang bilang ini undangan digital tercantik yang pernah mereka buka.', bride_name: 'Lia', groom_name: 'Hendra', wedding_date: '2024', alamat: 'Makassar' },
    { id: 'd9', rate_star: 5, comment: 'Daftar tamu langsung kami impor dari Google Contacts, jadi nggak perlu ketik manual satu-satu. Countdown menuju hari H di undangannya juga bikin tamu makin antusias.', bride_name: 'Rara', groom_name: 'Andi', wedding_date: '2025', alamat: 'Malang' },
    { id: 'd10', rate_star: 5, comment: 'Pilihan temanya banyak dan semuanya mewah. Kami sempat coba beberapa lewat fitur preview sebelum memutuskan. Hasil akhirnya sesuai banget dengan konsep pernikahan kami.', bride_name: 'Fitri', groom_name: 'Galih', wedding_date: '2024', alamat: 'Bekasi' },
];

export function NewLandingPage() {
    // Data States
    const [config, setConfig] = useState<WebsiteConfig | null>(null);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [planTypes, setPlanTypes] = useState<MstPlanType[]>([]);
    const [planFeatures, setPlanFeatures] = useState<MstPlanFeature[]>([]);
    const [reviews, setReviews] = useState<ReviewAndRating[]>([]);
    const [additionalFeatures, setAdditionalFeatures] = useState<MstAdditionalFeature[]>([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeThemeCategory, setActiveThemeCategory] = useState<string>('All');

    // Testimonial carousel
    const [slide, setSlide] = useState(0);
    const [perView, setPerView] = useState(3); // cards visible per page (responsive)
    const [pauseCarousel, setPauseCarousel] = useState(false);

    // FAQ accordion (first item open by default)
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    // Fetch All Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [configRes, themesRes, plansRes, featuresRes] = await Promise.all([
                    publicApi.getWebsiteConfig(),
                    publicApi.getPublicThemes(),
                    publicApi.getPublicPlanTypes(),
                    publicApi.getPublicPlanFeatures()
                ]);

                // Update Favicon
                let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                if (!favicon) {
                    favicon = document.createElement('link');
                    favicon.rel = 'icon';
                    document.head.appendChild(favicon);
                }
                favicon.href = kosaIcon;

                if (configRes.success) {
                    setConfig(configRes.data);
                    setReviews(configRes.data.reviews || []);
                    setAdditionalFeatures(configRes.data.features || []);

                    // Update Favicon with dynamic site logo if loaded
                    if (configRes.data.site_logo) {
                        const { fetchProxyImageBase64 } = await import('@/shared/components/ProxyImage');
                        const resolvedLogo = await fetchProxyImageBase64(configRes.data.site_logo);
                        let fav = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                        if (fav) {
                            fav.href = resolvedLogo;
                        }
                    }
                }
                if (themesRes.success) setThemes(themesRes.data);
                if (plansRes.success) setPlanTypes(plansRes.data);
                if (featuresRes.success) setPlanFeatures(featuresRes.data);
            } catch (err) {
                console.error('Landing Page Data Fetch Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Lock body scroll while the mobile menu is open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    // Theme Grouping
    const themeCategories = useMemo(() => {
        const categories = Array.from(new Set(themes.map(t => t.style_category || 'Modern')));
        return ['All', ...categories];
    }, [themes]);

    const filteredThemes = useMemo(() => {
        if (activeThemeCategory === 'All') return themes;
        return themes.filter(t => t.style_category === activeThemeCategory);
    }, [themes, activeThemeCategory]);

    // Order plan cards so "premium" sits in the middle on desktop and on top on mobile
    const orderedPlans = useMemo(() => {
        const order: Record<string, number> = { premium: 0, pro: 1, basic: 2 };
        return [...planTypes].sort((a, b) => (order[a.plan_type] ?? 9) - (order[b.plan_type] ?? 9));
    }, [planTypes]);

    // Reviews shown in the testimonials section: real data when the DB has
    // enough of them, otherwise fall back entirely to the curated dummy set.
    const displayReviews = useMemo(
        () => (reviews.length >= MIN_REAL_REVIEWS ? reviews : DUMMY_REVIEWS),
        [reviews]
    );

    // Last slide index that still keeps the page full (no trailing gap)
    const maxSlide = Math.max(0, displayReviews.length - perView);

    // Responsive cards-per-view: 1 (mobile) / 2 (tablet) / 3 (desktop)
    useEffect(() => {
        const compute = () => {
            const w = window.innerWidth;
            setPerView(w >= 1024 ? 3 : w >= 640 ? 2 : 1);
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, []);

    // Keep slide index in range when perView / data changes
    useEffect(() => {
        setSlide(s => Math.min(s, maxSlide));
    }, [maxSlide]);

    // Auto-advance every 4s (pauses on hover); only when there's overflow
    useEffect(() => {
        if (pauseCarousel || maxSlide === 0) return;
        const timer = setInterval(() => {
            setSlide(s => (s >= maxSlide ? 0 : s + 1));
        }, 4000);
        return () => clearInterval(timer);
    }, [pauseCarousel, maxSlide]);

    // Real average rating from actual public reviews (null if none)
    const avgRating = useMemo(() => {
        const rated = reviews.map(r => Number(r.rate_star)).filter(n => n > 0);
        if (rated.length === 0) return null;
        return (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1);
    }, [reviews]);

    // Smooth-scroll to an in-page section WITHOUT changing the URL hash
    // (app uses HashRouter, so a real #anchor would hijack the route).
    const scrollToSection = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse tracking-wide">Menyiapkan Pengalaman Premium...</p>
                </div>
            </div>
        );
    }

    const siteName = config?.site_name || 'WEDDING SAAS';

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 selection:bg-gold-500/30 selection:text-gold-900 overflow-x-hidden">
            {/* ============ NAVBAR ============ */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled || menuOpen ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl shadow-sm border-b border-gray-100 dark:border-gray-800 py-3' : 'bg-transparent py-5 lg:py-6'}`}>
                <div className="container mx-auto px-5 sm:px-6 flex items-center justify-between">
                    <Link to="/landing-page" className="flex items-center gap-2.5 sm:gap-3 group">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-gold-600 to-gold-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gold-500/20 transform rotate-3 group-hover:rotate-6 transition-transform">
                            <HiOutlineSparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg sm:text-xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                                {siteName}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-gold-600 uppercase tracking-[0.2em]">Undangan Digital</span>
                        </div>
                    </Link>

                    <div className="hidden lg:flex items-center gap-10">
                        {NAV_LINKS.map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} onClick={(e) => scrollToSection(e, item.toLowerCase())} className="text-[13px] font-bold uppercase tracking-widest hover:text-gold-500 transition-colors relative group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold-500 transition-all group-hover:w-full"></span>
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link to="/login" className="hidden sm:block text-sm font-bold text-gray-500 hover:text-gold-500 transition-colors">MASUK</Link>
                        <Link to="/register" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 px-5 sm:px-6 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform active:scale-95">
                            DAFTAR
                        </Link>
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            aria-label="Buka menu"
                            className="lg:hidden w-10 h-10 -mr-1.5 flex items-center justify-center text-gray-700 dark:text-gray-200"
                        >
                            {menuOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile / Tablet menu */}
                <div className={`lg:hidden overflow-hidden transition-all duration-500 ease-out ${menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="container mx-auto px-5 sm:px-6 py-4 flex flex-col gap-1">
                        {NAV_LINKS.map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                onClick={(e) => scrollToSection(e, item.toLowerCase())}
                                className="py-3 px-4 rounded-2xl text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gold-50 dark:hover:bg-gold-900/20 hover:text-gold-600 transition-colors"
                            >
                                {item}
                            </a>
                        ))}
                        <Link
                            to="/login"
                            onClick={() => setMenuOpen(false)}
                            className="sm:hidden py-3 px-4 rounded-2xl text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gold-50 dark:hover:bg-gold-900/20 hover:text-gold-600 transition-colors"
                        >
                            Masuk
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ============ HERO ============ */}
            <section className="relative min-h-[88vh] lg:min-h-screen flex items-center pt-28 pb-16 lg:pt-20 lg:pb-0 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/wedding_saas_hero.png"
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover opacity-10 dark:opacity-20 scale-110 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-white/85 to-white dark:from-gray-950 dark:via-gray-950/85 dark:to-gray-950"></div>
                    {/* Decorative gold glow */}
                    <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] bg-gold-500/10 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-0 -left-24 w-[24rem] h-[24rem] bg-gold-400/10 blur-[120px] rounded-full"></div>
                </div>

                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
                        <div className="lg:col-span-6 space-y-6 sm:space-y-7 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm border border-gold-200/60 dark:border-gold-800/50 shadow-sm text-gold-600 dark:text-gold-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] animate-fade-in-up">
                                <span className="relative flex w-2 h-2">
                                    <span className="absolute inline-flex w-full h-full rounded-full bg-gold-500 opacity-75 animate-ping"></span>
                                    <span className="relative inline-flex w-2 h-2 rounded-full bg-gold-500"></span>
                                </span>
                                Undangan Pernikahan Digital
                            </div>
                            <h1 className="font-display text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-7xl xl:text-[5.25rem] font-black tracking-tight dark:text-white">
                                {config?.tagline || 'Momen Spesial,'} <br className="hidden sm:block" />{' '}
                                <span className="text-gradient-gold italic">Berkelas.</span>
                            </h1>
                            <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-md sm:max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                                {config?.site_description || 'Buat undangan digital impian Anda dengan platform tercanggih. Mewah, praktis, dan elegan.'}
                            </p>

                            {/* Quick highlights — fitur nyata yang menjual */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2">
                                {['RSVP Real-time', 'Scan QR Check-in', 'WhatsApp Blast'].map((feat) => (
                                    <span key={feat} className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-gray-600 dark:text-gray-300">
                                        <HiOutlineCheck className="w-4 h-4 text-gold-500 shrink-0" />
                                        {feat}
                                    </span>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 justify-center lg:justify-start max-w-md mx-auto lg:mx-0 pt-1">
                                <Link to="/register" className="group inline-flex items-center justify-center gap-2 whitespace-nowrap px-7 sm:px-8 py-4 bg-gold-600 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-gold-700 shadow-xl shadow-gold-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
                                    Mulai Sekarang
                                    <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                                <a href="#tema" onClick={(e) => scrollToSection(e, 'tema')} className="inline-flex items-center justify-center whitespace-nowrap px-7 sm:px-8 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm">
                                    Lihat Tema
                                </a>
                            </div>

                            {/* Trust row — rating & jumlah ulasan (data real saja) */}
                            {avgRating && (
                                <div className="flex items-center justify-center lg:justify-start gap-3 pt-3 sm:pt-4">
                                    <div className="flex items-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <HiOutlineStar key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-gold-500 fill-current" />
                                        ))}
                                    </div>
                                    <div className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                        <span className="font-black text-gray-900 dark:text-white">{avgRating}</span>
                                        <span className="text-gray-400"> · dari {reviews.length} ulasan</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hero image — visible from tablet up */}
                        <div className="hidden md:block lg:col-span-6 relative mt-8 lg:mt-0">
                            <div className="absolute -inset-4 bg-gold-500/10 blur-[100px] rounded-full"></div>
                            <div className="relative z-10 mx-auto w-[68%] lg:w-[82%]">
                                <div className="absolute -top-5 -left-5 w-24 h-24 border-t-2 border-l-2 border-gold-400/40 rounded-tl-[2rem]"></div>
                                <div className="absolute -bottom-5 -right-5 w-24 h-24 border-b-2 border-r-2 border-gold-400/40 rounded-br-[2rem]"></div>
                                <img
                                    src="/wedding_saas_hero.png"
                                    alt="Pratinjau undangan digital"
                                    className="w-full rounded-[1.2rem] lg:rounded-[1.4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[6px] lg:border-[8px] border-white dark:border-gray-800 transform rotate-2 hover:rotate-0 transition-transform duration-1000"
                                />
                                {/* Floating rating chip on the mockup */}
                                {avgRating && (
                                    <div className="absolute -bottom-5 -left-6 lg:-left-10 z-20 flex items-center gap-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 px-4 py-3">
                                        <div className="w-9 h-9 rounded-xl bg-gold-50 dark:bg-gold-900/30 flex items-center justify-center text-gold-500">
                                            <HiOutlineStar className="w-5 h-5 fill-current" />
                                        </div>
                                        <div className="leading-tight">
                                            <div className="text-sm font-black text-gray-900 dark:text-white">{avgRating} / 5.0</div>
                                            <div className="text-[10px] font-bold text-gray-400">{reviews.length} ulasan</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ KEUNGGULAN (Why Choose Us) ============ */}
            <section id="keunggulan" className="scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-gray-50 dark:bg-gray-900/50 relative overflow-hidden">
                {/* Decorative gold glow */}
                <div className="absolute -top-24 right-0 w-[28rem] h-[28rem] bg-gold-500/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                        <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-3 sm:mb-4">Kenapa Memilih Kami</div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight dark:text-white leading-tight mb-4 sm:mb-5">
                            Undangan yang <span className="text-gradient-gold italic">Tak Terlupakan</span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">
                            Bukan sekadar undangan digital — sebuah pengalaman istimewa untuk Anda dan setiap tamu.
                        </p>
                    </div>

                    {/* Bento-style highlight grid: first card is the hero highlight (spans 2 cols on lg) */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 max-w-6xl mx-auto">
                        {/* 1 — Playable invitation (hero highlight) */}
                        <div className="sm:col-span-2 group relative overflow-hidden p-7 sm:p-9 rounded-[1.2rem] sm:rounded-[1.4rem] bg-gray-900 text-white border border-gold-500/30 shadow-2xl shadow-gold-500/10">
                            <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold-500/20 blur-[90px] rounded-full"></div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-gold-500/15 rounded-2xl flex items-center justify-center text-gold-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <HiOutlinePuzzle className="w-6 h-6 sm:w-7 sm:h-7" />
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-gold-500/15 text-gold-300 text-[9px] font-black uppercase tracking-[0.2em]">Eksklusif</span>
                                </div>
                                <h3 className="font-display text-2xl sm:text-3xl font-black mb-3 leading-tight">
                                    Undangan yang Bisa <span className="text-gradient-gold italic">Dimainkan</span>
                                </h3>
                                <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl">
                                    Hadirkan pengalaman tak terlupakan: tamu bermain langsung di dalam undangan untuk membuka tiap bagiannya —
                                    sebuah petualangan interaktif yang mengubah undangan menjadi momen seru. Tetap ramah untuk semua tamu, dengan
                                    tombol <span className="font-bold text-white">“Lihat Undangan”</span> instan yang membuka undangan penuh kapan saja.
                                </p>
                                <div className="mt-5 flex items-center gap-1.5 text-[11px] font-bold text-gold-300/90 uppercase tracking-widest">
                                    <HiOutlineSparkles className="w-4 h-4" /> Efek wow & mudah dibagikan
                                </div>
                            </div>
                        </div>

                        {/* 2 — WhatsApp Blast personal */}
                        <div className="group p-7 sm:p-8 rounded-[1.2rem] sm:rounded-[1.4rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-5 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center text-gold-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <HiOutlinePaperAirplane className="w-6 h-6 sm:w-7 sm:h-7 rotate-45" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black mb-2 dark:text-white">Undangan Personal per Tamu</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                Sekali atur, kirim ke ratusan tamu lewat WhatsApp — tiap link otomatis menampilkan nama tamu masing-masing.
                                Hemat waktu, dengan kesan personal dan eksklusif.
                            </p>
                        </div>

                        {/* 3 — QR Check-in + dashboard */}
                        <div className="group p-7 sm:p-8 rounded-[1.2rem] sm:rounded-[1.4rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-5 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center text-gold-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <HiOutlineQrcode className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black mb-2 dark:text-white">Check-in QR & Pantau Real-time</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                Catat kehadiran tamu di hari-H cukup dengan scan QR, lengkap dengan input manual untuk tamu dadakan.
                                Semua kehadiran & konfirmasi terpantau langsung dari dashboard.
                            </p>
                        </div>

                        {/* 4 — Themes & customization */}
                        <div className="group p-7 sm:p-8 rounded-[1.2rem] sm:rounded-[1.4rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-5 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center text-gold-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <HiOutlineColorSwatch className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black mb-2 dark:text-white">Tema Mewah & Bisa Disesuaikan</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                Pilihan tema elegan dengan karakter beragam — dari klasik mewah hingga yang unik dan berbeda.
                                Bisa dipratinjau dulu, lalu disesuaikan dengan konsep pernikahan Anda.
                            </p>
                        </div>

                        {/* 5 — Complete guest features */}
                        <div className="sm:col-span-2 lg:col-span-1 group p-7 sm:p-8 rounded-[1.2rem] sm:rounded-[1.4rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 mb-5 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center text-gold-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <HiOutlineGift className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black mb-2 dark:text-white">Fitur Tamu Lengkap dalam Satu Undangan</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                                Buku ucapan digital, amplop online & QRIS, galeri foto, backsound musik, live streaming akad, countdown,
                                hingga love story — semua aktif dan tersimpan otomatis.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ THEMES ============ */}
            <section id="tema" className="scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 mb-10 sm:mb-16">
                        <div className="max-w-xl">
                            <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-3 sm:mb-4">Eksplorasi Kreativitas</div>
                            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight dark:text-white leading-tight">
                                Pilih Gaya Undangan <span className="text-gradient-gold italic">Impian Anda</span>
                            </h2>
                        </div>

                        {/* Style Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 no-scrollbar">
                            {themeCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveThemeCategory(cat)}
                                    className={`px-5 sm:px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeThemeCategory === cat ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mobile: horizontal snap-scroll row. sm+: regular grid. */}
                    <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-5 px-5 sm:mx-0 sm:px-0 pb-4 sm:pb-0 no-scrollbar">
                        {filteredThemes.length > 0 ? filteredThemes.map((theme) => (
                            <div key={theme.id} className="group relative shrink-0 w-[44vw] max-w-[11rem] sm:w-auto sm:max-w-none snap-start overflow-hidden rounded-[1rem] sm:rounded-[1.2rem] bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                                <div className="aspect-[9/16] overflow-hidden relative bg-gray-100 dark:bg-gray-950">
                                    <ProxyImage
                                        src={theme.preview_image || `https://placehold.co/450x800?text=${encodeURIComponent(theme.name)}`}
                                        alt={theme.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                                    />
                                    {/* Always-visible gradient so the badge is readable; CTA reveals on hover (desktop) and is tappable on mobile */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0"></div>
                                    <div className="absolute inset-x-0 bottom-0 p-3 flex justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-500">
                                        {theme.code ? (
                                            <a
                                                href={`#/preview/${theme.code}/${PREVIEW_DEMO_SLUG}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white text-gray-900 px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-widest lg:transform lg:translate-y-4 lg:group-hover:translate-y-0 transition-transform duration-500 hover:bg-gold-500 hover:text-white shadow-xl"
                                            >
                                                Preview
                                            </a>
                                        ) : (
                                            <span
                                                title="Tema ini belum punya kode preview"
                                                className="bg-white/70 text-gray-500 px-4 py-2 rounded-full font-black text-[9px] uppercase tracking-widest cursor-not-allowed"
                                            >
                                                Segera
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-gold-600 shadow-lg">
                                        {theme.plan_type}
                                    </div>
                                </div>
                                <div className="p-3 sm:p-4">
                                    <h3 className="text-sm font-black mb-0.5 dark:text-white truncate">{theme.name}</h3>
                                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{theme.style_category || 'Modern Style'}</p>
                                </div>
                            </div>
                        )) : (
                            // Skeleton themes if empty
                            [1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="group relative shrink-0 w-[44vw] max-w-[11rem] sm:w-auto sm:max-w-none snap-start overflow-hidden rounded-[1rem] sm:rounded-[1.2rem] bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse">
                                    <div className="aspect-[9/16] bg-gray-200 dark:bg-gray-800"></div>
                                    <div className="p-3 sm:p-4 space-y-2">
                                        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                        <div className="h-2.5 w-1/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* ============ PRICING ============ */}
            <section id="harga" className="scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-20">
                        <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-3 sm:mb-4">Investasi Kebahagiaan</div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight dark:text-white">Pilih Paket <span className="text-gradient-gold italic">Terbaik</span></h2>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 max-w-6xl mx-auto items-start">
                        {orderedPlans.length > 0 ? orderedPlans.map((p) => {
                            const isPremium = p.plan_type === 'premium';
                            return (
                                <div
                                    key={p.plan_type}
                                    className={`relative p-8 sm:p-10 lg:p-12 rounded-[1.2rem] sm:rounded-[1.4rem] border transition-all duration-500 ${isPremium
                                        ? 'border-gold-500 bg-gray-900 text-white shadow-2xl shadow-gold-500/10 lg:scale-105 lg:-translate-y-2 z-10 sm:col-span-2 lg:col-span-1 lg:order-2'
                                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:-translate-y-1 hover:shadow-xl'} ${p.plan_type === 'pro' ? 'lg:order-1' : ''} ${p.plan_type === 'basic' ? 'lg:order-3' : ''}`}
                                >
                                    {isPremium && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 sm:px-6 py-2 bg-gold-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                                            Best Choice
                                        </div>
                                    )}
                                    <div className="mb-8 sm:mb-10">
                                        <h3 className={`text-sm font-black uppercase tracking-[0.3em] mb-3 sm:mb-4 ${isPremium ? 'text-gold-400' : 'text-gray-400'}`}>
                                            {p.plan_type}
                                        </h3>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl sm:text-5xl font-black tracking-tighter">Rp {(p.price / 1000).toFixed(0)}k</span>
                                            <span className={`text-xs font-bold ${isPremium ? 'text-gray-400' : 'text-gray-500'}`}>/lifetime</span>
                                        </div>
                                    </div>

                                    <div className={`h-px w-full mb-8 sm:mb-10 ${isPremium ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-800'}`}></div>

                                    <ul className="space-y-4 sm:space-y-5 mb-10 sm:mb-12">
                                        <li className="flex items-center gap-3 text-sm font-medium">
                                            <HiOutlineCheck className="w-5 h-5 text-gold-500 shrink-0" />
                                            <span>Limit {p.guest_limit} Tamu</span>
                                        </li>
                                        {planFeatures.filter(f => f.plan_id === p.plan_type).map(f => (
                                            <li key={f.id} className="flex items-center gap-3 text-sm font-medium">
                                                <HiOutlineCheck className="w-5 h-5 text-gold-500 shrink-0" />
                                                <span>{f.feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Link to="/register" className={`w-full py-4 sm:py-5 rounded-[1.2rem] font-black text-xs uppercase tracking-[0.2em] text-center block transition-all ${isPremium ? 'bg-gold-500 text-white hover:bg-gold-600 hover:shadow-[0_20px_40px_-10px_rgba(198,167,105,0.4)]' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                        Pilih Paket
                                    </Link>
                                </div>
                            );
                        }) : (
                            // Loading state for plans
                            [1, 2, 3].map(i => <div key={i} className="h-[480px] bg-gray-50 dark:bg-gray-900 rounded-[1.4rem] animate-pulse"></div>)
                        )}
                    </div>
                </div>
            </section>

            {/* ============ FEATURES (Additional) ============ */}
            <section id="fitur" className="scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-gray-50 dark:bg-gray-900/50">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                        <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-3 sm:mb-4">Fitur Tambahan</div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-6xl font-black tracking-tight dark:text-white leading-[1.05] mb-5 sm:mb-6">
                            Lebih Dari Sekadar <br className="hidden sm:block" /> <span className="text-gradient-gold italic">Undangan Biasa</span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">Layanan eksklusif untuk melengkapi undangan Anda. Aktifkan sesuai kebutuhan.</p>
                    </div>

                    <div className="max-w-3xl mx-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-[1rem] sm:rounded-[1.2rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm px-5 sm:px-8 lg:px-10">
                        {(additionalFeatures.length > 0
                            ? additionalFeatures.map(f => ({
                                key: f.id,
                                name: f.feature_name,
                                desc: f.description || 'Fitur unggulan untuk meningkatkan pengalaman tamu undangan Anda.',
                                price: f.price > 0 ? `Rp ${f.price.toLocaleString()}` : 'Free',
                            }))
                            : [
                                { key: 'wa', name: 'WhatsApp Blast', desc: 'Kirim undangan personal ke ratusan tamu otomatis lewat WhatsApp, lengkap dengan nama masing-masing.', price: '' },
                                { key: 'rsvp', name: 'RSVP Real-time', desc: 'Pantau konfirmasi kehadiran tamu langsung dari dashboard, akurat untuk estimasi acara.', price: '' },
                                { key: 'scan', name: 'Scan QR Check-in', desc: 'Catat kehadiran tamu di lokasi cukup dengan scan QR Code. Cepat, rapi, tanpa antrean.', price: '' },
                                { key: 'amplop', name: 'Amplop Digital & QRIS', desc: 'Tamu kirim hadiah via transfer atau QRIS, seluruh nominal tercatat otomatis dan bisa diekspor.', price: '' },
                                { key: 'wishes', name: 'Buku Ucapan Digital', desc: 'Kumpulkan doa dan ucapan dari semua tamu sebagai kenang-kenangan yang tersimpan selamanya.', price: '' },
                                { key: 'stream', name: 'Live Streaming', desc: 'Siarkan akad & resepsi secara langsung untuk keluarga yang tak bisa hadir di lokasi.', price: '' },
                            ]
                        ).map(f => (
                            <div key={f.key} className="flex items-center gap-4 sm:gap-6 py-6 sm:py-7 group">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center text-gold-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <HiOutlineSparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base sm:text-lg font-black dark:text-white truncate">{f.name}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                                </div>
                                {f.price && (
                                    <div className={`shrink-0 text-sm sm:text-base font-black ${f.price === 'Free' ? 'text-emerald-500' : 'text-gold-600'}`}>
                                        {f.price}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ TESTIMONIALS ============ */}
            <section id="testimoni" className="scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-gold-50/40 dark:bg-gray-900/50">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="inline-block text-gold-600 dark:text-gold-400 font-bold text-[11px] uppercase tracking-[0.3em] px-5 py-2 rounded-full border border-gold-200/70 dark:border-gold-800/50 mb-5 sm:mb-6">Testimoni</div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight dark:text-white leading-tight">
                            Mereka Sudah <br /> <span className="text-gradient-gold italic">Membuktikannya</span>
                        </h2>
                    </div>

                    <div
                        className="relative max-w-6xl mx-auto"
                        onMouseEnter={() => setPauseCarousel(true)}
                        onMouseLeave={() => setPauseCarousel(false)}
                    >
                        {/* Viewport */}
                        <div className="overflow-hidden px-1 py-2">
                            <div
                                className="flex transition-transform duration-700 ease-out"
                                style={{ transform: `translateX(-${slide * (100 / perView)}%)` }}
                            >
                                {displayReviews.map((r, i) => {
                                    // Highlight the card currently in the middle of the visible page
                                    const highlight = perView === 3 && (i - slide) % 3 === 1;
                                    const initials = `${(r.bride_name?.[0] || '').toUpperCase()}${(r.groom_name?.[0] || '').toUpperCase()}`;
                                    return (
                                        <div
                                            key={r.id}
                                            className="shrink-0 px-2.5 sm:px-3"
                                            style={{ width: `${100 / perView}%` }}
                                        >
                                            <div
                                                className={`flex flex-col h-full p-7 sm:p-8 rounded-[1rem] sm:rounded-[1.2rem] transition-colors duration-500 ${highlight
                                                    ? 'bg-gray-900 text-white shadow-2xl shadow-gold-500/10'
                                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 shadow-sm'}`}
                                            >
                                                <div className="flex items-center gap-1 mb-5 sm:mb-6">
                                                    {[...Array(Math.max(0, Math.min(5, Number(r.rate_star) || 0)))].map((_, s) => (
                                                        <HiOutlineStar key={s} className="w-4 h-4 sm:w-5 sm:h-5 text-gold-500 fill-current" />
                                                    ))}
                                                </div>

                                                <blockquote className={`text-sm sm:text-[15px] leading-relaxed italic mb-7 sm:mb-8 flex-1 ${highlight ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}>
                                                    "{r.comment}"
                                                </blockquote>

                                                <div className="flex items-center gap-3.5 mt-auto">
                                                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 flex items-center justify-center text-white text-xs font-black tracking-wider shadow-md">
                                                        {initials || <HiOutlineChatAlt className="w-5 h-5" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black truncate">{r.bride_name} &amp; {r.groom_name}</div>
                                                        <div className={`flex items-center gap-1.5 text-xs font-medium ${highlight ? 'text-gold-400' : 'text-gray-400'}`}>
                                                            <HiOutlineLocationMarker className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{r.alamat || 'Indonesia'}{r.wedding_date ? `, ${r.wedding_date}` : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Controls — only when content overflows the viewport */}
                        {maxSlide > 0 && (
                            <>
                                <button
                                    aria-label="Testimoni sebelumnya"
                                    onClick={() => setSlide(s => (s <= 0 ? maxSlide : s - 1))}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 lg:-translate-x-1/2 w-11 h-11 lg:w-14 lg:h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-xl border border-gray-100 dark:border-gray-700 hover:scale-110 hover:text-gold-500 transition-all"
                                >
                                    <HiOutlineChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
                                </button>
                                <button
                                    aria-label="Testimoni berikutnya"
                                    onClick={() => setSlide(s => (s >= maxSlide ? 0 : s + 1))}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 lg:translate-x-1/2 w-11 h-11 lg:w-14 lg:h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-xl border border-gray-100 dark:border-gray-700 hover:scale-110 hover:text-gold-500 transition-all"
                                >
                                    <HiOutlineChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
                                </button>

                                {/* Dots: one per slide position */}
                                <div className="flex items-center justify-center gap-2 mt-10">
                                    {Array.from({ length: maxSlide + 1 }).map((_, i) => (
                                        <button
                                            key={i}
                                            aria-label={`Ke testimoni ${i + 1}`}
                                            onClick={() => setSlide(i)}
                                            className={`h-2 rounded-full transition-all ${i === slide ? 'w-7 bg-gold-500' : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gold-300'}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ============ FAQ ============ */}
            <section id="faq" className="scroll-mt-24 py-16 sm:py-20 lg:py-28 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-3 sm:mb-4">Punya Pertanyaan?</div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight dark:text-white">Pertanyaan <span className="text-gradient-gold italic">Umum</span></h2>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {FAQ_ITEMS.map((item, i) => {
                            const open = openFaq === i;
                            return (
                                <div
                                    key={i}
                                    className={`rounded-[1.2rem] sm:rounded-[1.4rem] border transition-colors duration-300 ${open ? 'border-gold-300 dark:border-gold-700 bg-gold-50/50 dark:bg-gold-900/10' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900'}`}
                                >
                                    <button
                                        onClick={() => setOpenFaq(open ? null : i)}
                                        aria-expanded={open}
                                        className="w-full flex items-center justify-between gap-4 text-left px-6 sm:px-8 py-5 sm:py-6"
                                    >
                                        <span className="text-base sm:text-lg font-black dark:text-white">{item.q}</span>
                                        <HiOutlineChevronDown className={`w-5 h-5 shrink-0 text-gold-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <p className="px-6 sm:px-8 pb-6 sm:pb-7 text-sm sm:text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                                                {item.a}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ============ CTA BANNER ============ */}
            <section className="py-16 sm:py-20 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="relative overflow-hidden rounded-[1.2rem] sm:rounded-[1.4rem] bg-gray-900 px-6 sm:px-12 lg:px-20 py-14 sm:py-20 text-center">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold-500/20 blur-[120px] rounded-full"></div>
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gold-400/10 blur-[120px] rounded-full"></div>
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight mb-5 sm:mb-6">
                                Siap Membuat Undangan <span className="text-gradient-gold italic">Impian?</span>
                            </h2>
                            <p className="text-gray-300 text-sm sm:text-base mb-8 sm:mb-10">Daftar dan mulai rancang undangan digital Anda dalam hitungan menit.</p>
                            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-10 py-4 sm:py-5 bg-gold-500 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-gold-600 shadow-xl shadow-gold-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
                                Daftar Sekarang
                                <HiOutlineArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ FOOTER ============ */}
            <footer className="bg-white dark:bg-gray-950 pt-16 sm:pt-24 pb-10 sm:pb-12 border-t border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 sm:gap-12 lg:gap-16 mb-12 sm:mb-20">
                        {/* Brand Column */}
                        <div className="space-y-6 sm:space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-white">
                                    <HiOutlineSparkles className="w-6 h-6" />
                                </div>
                                <span className="text-2xl font-black tracking-tighter">{siteName}</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium max-w-sm">
                                Platform pembuatan undangan digital untuk mengabadikan setiap momen kebahagiaan Anda dengan cara yang berkelas.
                            </p>
                            {(config?.site_instagram || config?.site_tiktok || config?.site_youtube) && (
                                <div className="flex items-center gap-3 sm:gap-4">
                                    {config?.site_instagram && (
                                        <a href={`https://instagram.com/${config.site_instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gold-500 hover:text-white transition-all">
                                            <FaInstagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {config?.site_tiktok && (
                                        <a href={config.site_tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gold-500 hover:text-white transition-all">
                                            <FaTiktok className="w-4 h-4" />
                                        </a>
                                    )}
                                    {config?.site_youtube && (
                                        <a href={config.site_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gold-500 hover:text-white transition-all">
                                            <FaYoutube className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quick Links — anchor sections that actually exist */}
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-6 sm:mb-8 text-gold-600">Navigasi</h4>
                            <ul className="space-y-3 sm:space-y-4">
                                {NAV_LINKS.map(item => (
                                    <li key={item}><a href={`#${item.toLowerCase()}`} onClick={(e) => scrollToSection(e, item.toLowerCase())} className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{item}</a></li>
                                ))}
                                <li><Link to="/login" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Masuk</Link></li>
                                <li><Link to="/register" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Daftar</Link></li>
                            </ul>
                        </div>

                        {/* Contact — only shown when configured */}
                        {(config?.contact_email || config?.contact_whatsapp) && (
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-5 sm:mb-6 text-gold-600">Kontak Kami</h4>
                                <div className="space-y-3 sm:space-y-4">
                                    {config?.contact_email && (
                                        <a href={`mailto:${config.contact_email}`} className="flex items-center gap-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white break-all">
                                            <HiOutlineMail className="w-5 h-5 text-gold-500 shrink-0" />
                                            {config.contact_email}
                                        </a>
                                    )}
                                    {config?.contact_whatsapp && (
                                        <a href={`https://wa.me/${config.contact_whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                            <FaWhatsapp className="w-5 h-5 text-gold-500 shrink-0" />
                                            +{config.contact_whatsapp}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 sm:pt-12 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
                            © 2026 {siteName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
