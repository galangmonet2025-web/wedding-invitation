import { useState, useEffect, useMemo, useRef } from 'react';
import {
    HiOutlineCheck,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineChevronDown,
    HiOutlineLocationMarker,
    HiOutlineMail,
    HiOutlineMenu,
    HiOutlineX,
    HiOutlineArrowRight,
} from 'react-icons/hi';
import { FaInstagram, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { ReviewAndRating } from '@/types';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { useLandingStore } from '@/features/landing/store/landingStore';
import kosaIcon from '@/assets/img/kosa-icon.png';
import lp01 from '@/assets/img/lp01.jpg';
import lp02 from '@/assets/img/lp02.jpg';

// Demo tenant slug used by the theme-preview URL (/#/preview/<theme_code>/<slug>).
// The preview forces this theme onto the demo tenant's real invitation data.
// Must match an ACTIVE tenant's domain_slug, otherwise the preview shows "not found".
const PREVIEW_DEMO_SLUG = 'dini-galang';

// Theme code + slug used for the LIVE hero preview iframe. Built as a constant
// so the URL is dynamic (assembled from vars) yet easy to swap here.
const HERO_PREVIEW_THEME = 'metal-slug';
const HERO_PREVIEW_URL = `#/preview/${HERO_PREVIEW_THEME}/${PREVIEW_DEMO_SLUG}`;

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

// ── Retro-game feature highlights (icons are emoji so no extra deps needed) ──
const RETRO_FEATURES: Array<{ emoji: string; title: string; desc: string; hero?: boolean; tag?: string }> = [
    {
        emoji: '🎮',
        title: 'Undangan yang Bisa DIMAINKAN',
        desc: 'Tamu bermain langsung di dalam undangan untuk membuka tiap bagiannya — petualangan interaktif ala game retro yang mengubah undangan jadi momen seru. Tetap ramah untuk semua tamu berkat tombol "LIHAT UNDANGAN" instan.',
        hero: true,
        tag: 'EKSKLUSIF',
    },
    { emoji: '🪄', title: 'Fully controllable', desc: 'Kamu punya akses untuk mengubah isi undangan sesuai dengan keinginanmu. Mulai dari data mempelai, lokasi acara, foto, love story, music background, sampai live streaming.' },
    { emoji: '💰', title: 'Anti boncos', desc: 'Adjustment apapun yang kamu lakukan sendiri tidak akan ditambahkan kedalam hitungan biaya, lakukan perubahan bahkan di detik-detik terakhir sebelum hari H!' },
    { emoji: '💻', title: 'Live preview', desc: 'Nikmati pengalaman melihat hasil perubahan design undangan secara real-time langsung dari Desktop kamu — cepat, praktis, dan tanpa ribet.' },
    { emoji: '📲', title: 'Scanner kehadiran', desc: 'Tracking data tamu menggunakan QR code, tamu yang di undangan secara khusus maupun tamu umum semua mendapatkan QR code, jadi kamu tidak perlu khawatir akan ada data tamu yang tidak tercatat.' },
    { emoji: '👨‍👩‍👧', title: 'Google contact + WhatsApp', desc: 'Tidak perlu repot buat data tamu undangan satu persatu, kamu bisa import dari google contact. dan dikirim undangan personal via Whatsapp.' },
    { emoji: '📖', title: 'Data reporting', desc: 'Semua data ucapan, kehadiran tamu, gift yang masuk akan tercatat sehingga kamu bisa mengeceknya kapan saja.' },
];

export function NewLandingPage() {
    // Data comes from a session cache (Zustand). Fetched once and kept, so
    // navigating to login/register and back renders instantly — no re-fetch,
    // no loading flash. See landingStore.ts.
    const config = useLandingStore(s => s.config);
    const themes = useLandingStore(s => s.themes);
    // true setelah fetch pertama selesai — dipakai membedakan "sedang load tema"
    // dari "sudah load tapi memang belum ada tema published" (empty state).
    const landingLoaded = useLandingStore(s => s.loaded);
    const planTypes = useLandingStore(s => s.planTypes);
    const planFeatures = useLandingStore(s => s.planFeatures);
    const reviews = useLandingStore(s => s.reviews);
    const additionalFeatures = useLandingStore(s => s.additionalFeatures);
    const logoUrl = useLandingStore(s => s.logoUrl);
    const fetchAll = useLandingStore(s => s.fetchAll);

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

    // Fetch once and cache in the store. On return visits (from login/register)
    // this is a no-op — the cached data is already in the store, so the page
    // renders instantly with no loading flash.
    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // Track scroll for the navbar solid/transparent state.
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Lock body scroll while the mobile menu is open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    // Theme Grouping — tab kategori dibangun DINAMIS dari kategori yang benar-benar
    // ada di DB (kosong diabaikan, di-dedup & diurutkan). Tema tanpa kategori hanya
    // muncul di tab "All", sehingga tab tidak pernah kosong (konsisten dgn admin).
    const themeCategories = useMemo(() => {
        const categories = Array.from(
            new Set(
                themes
                    .map(t => (t.style_category || '').trim())
                    .filter(c => c !== '')
            )
        ).sort((a, b) => a.localeCompare(b, 'id'));
        return ['All', ...categories];
    }, [themes]);

    const filteredThemes = useMemo(() => {
        if (activeThemeCategory === 'All') return themes;
        return themes.filter(t => (t.style_category || '').trim() === activeThemeCategory);
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

    // NOTE: we intentionally do NOT gate the whole page behind a loading screen.
    // Every data-driven section (themes, plans, features, reviews) has its own
    // skeleton/dummy fallback, and the static chrome (navbar, hero copy, FAQ,
    // footer) renders from bundled defaults. So the page paints immediately and
    // each section fills in as its data arrives — instead of a 3s full-screen
    // "LOADING…" while the slowest Apps Script request finishes.
    const siteName = config?.site_name || 'Kosa Invitation';

    return (
        <div className="rm-lp min-h-screen font-sans overflow-x-hidden" style={{ background: 'var(--lp-ink)', color: '#fff' }}>
            <RetroStyles />

            {/* ============ NAVBAR ============ */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled || menuOpen ? 'lp-nav-solid py-2.5' : 'py-4 lg:py-5'}`}>
                <div className="container mx-auto px-5 sm:px-6 flex items-center justify-between">
                    <Link to="/landing-page" className="flex items-center gap-3 group">
                        <div className="lp-logo-block overflow-hidden p-2">
                            <img src={logoUrl || kosaIcon} alt={siteName} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="lp-pixel text-[13px] sm:text-[15px] text-white" style={{ textShadow: '2px 2px 0 rgba(0,0,0,.5)' }}>
                                {siteName}
                            </span>
                            <span className="lp-pixel text-[6px] sm:text-[7px] mt-1.5 tracking-[0.2em]" style={{ color: 'var(--lp-coin)' }}>UNDANGAN DIGITAL</span>
                        </div>
                    </Link>

                    <div className="hidden lg:flex items-center gap-8">
                        {NAV_LINKS.map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} onClick={(e) => scrollToSection(e, item.toLowerCase())}
                                className="lp-pixel text-[8px] uppercase tracking-widest text-white/80 hover:text-[var(--lp-coin)] transition-colors">
                                {item}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/login" className="hidden sm:block lp-pixel text-[8px] uppercase tracking-widest text-white/70 hover:text-[var(--lp-coin)] transition-colors">MASUK</Link>
                        <Link to="/register" className="lp-btn lp-btn-coin text-[8px] px-4 py-2.5">DAFTAR</Link>
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            aria-label="Buka menu"
                            className="lg:hidden w-10 h-10 -mr-1.5 flex items-center justify-center text-white"
                        >
                            {menuOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile / Tablet menu */}
                <div className={`lg:hidden overflow-hidden transition-all duration-500 ease-out ${menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="container mx-auto px-5 sm:px-6 py-4 flex flex-col gap-1.5">
                        {NAV_LINKS.map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                onClick={(e) => scrollToSection(e, item.toLowerCase())}
                                className="lp-pixel text-[9px] py-3 px-4 uppercase tracking-widest text-white/80 hover:text-[var(--lp-coin)] hover:bg-white/5 rounded transition-colors"
                            >
                                {item}
                            </a>
                        ))}
                        <Link
                            to="/login"
                            onClick={() => setMenuOpen(false)}
                            className="sm:hidden lp-pixel text-[9px] py-3 px-4 uppercase tracking-widest text-white/80 hover:text-[var(--lp-coin)] hover:bg-white/5 rounded transition-colors"
                        >
                            Masuk
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ============ HERO ============ */}
            <section className="lp-hero relative min-h-[92vh] lg:min-h-screen flex items-center pt-28 pb-20 lg:pt-24 overflow-hidden">
                {/* pixel sky decor */}
                <div className="lp-hero-deco" aria-hidden="true">
                    <span className="lp-cloud c1" /><span className="lp-cloud c2" /><span className="lp-cloud c3" />
                    <span className="lp-hill h1" /><span className="lp-hill h2" />
                    <span className="lp-qblock d1">?</span><span className="lp-qblock d2">?</span>
                    <span className="lp-coin co1" /><span className="lp-coin co2" />
                </div>
                {/* ground strip + playable endless-runner mini-game (PC only) */}
                <HeroRunner />

                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="grid lg:grid-cols-12 gap-10 items-center">
                        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                            <div className="lp-badge inline-flex items-center gap-2 lp-bob">
                                <span className="lp-badge-dot" />
                                UNDANGAN PERNIKAHAN DIGITAL
                            </div>

                            <h1 className="lp-pixel text-[1.5rem] sm:text-4xl lg:text-[3rem] text-white" style={{ textShadow: '4px 4px 0 rgba(0,0,0,.4)', lineHeight: 1 }}>
                                {config?.tagline || 'MOMEN SPESIAL'}<br />
                                <span style={{ color: 'var(--lp-coin)' }}>LEVEL UP!</span>
                            </h1>

                            <p className="text-sm sm:text-base text-white/85 max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                                {config?.site_description || 'Buat undangan digital impian Anda dengan platform tercanggih. Seru dimainkan, praktis, dan berkesan untuk setiap tamu.'}
                            </p>

                            {/* Quick highlights — fitur nyata yang menjual */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                                {['RSVP Real-time', 'Scan QR Check-in', 'WhatsApp Blast'].map((feat) => (
                                    <span key={feat} className="lp-chip">
                                        <HiOutlineCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--lp-green)' }} />
                                        {feat}
                                    </span>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-center lg:justify-start max-w-md mx-auto lg:mx-0 pt-2">
                                <a href="#keunggulan" onClick={(e) => scrollToSection(e, 'keunggulan')} id="lp-hero-start" className="lp-btn lp-btn-coin group inline-flex items-center justify-center gap-2 whitespace-nowrap text-[11px] px-6 py-4">
                                    MULAI PETUALANGAN
                                    <HiOutlineArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                                </a>
                                <a href="#tema" onClick={(e) => scrollToSection(e, 'tema')} className="lp-btn lp-btn-green inline-flex items-center justify-center whitespace-nowrap text-[11px] px-6 py-4">
                                    LIHAT TEMA
                                </a>
                            </div>

                            {/* Trust row — rating & jumlah ulasan (data real saja) */}
                            {avgRating && (
                                <div className="flex items-center justify-center lg:justify-start gap-3 pt-3">
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className="lp-star" />
                                        ))}
                                    </div>
                                    <div className="lp-pixel text-[8px] text-white/80">
                                        <span style={{ color: 'var(--lp-coin)' }}>{avgRating}</span>
                                        <span className="text-white/50"> · {reviews.length} ULASAN</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hero live-preview — a pixel phone frame running the real
                            invitation theme in an iframe, flanked by two theme
                            screenshots. Click a side frame to swap it to center.
                            Visible from tablet up. */}
                        <div className="hidden md:block lg:col-span-5 relative">
                            <HeroShowcase avgRating={avgRating} reviewCount={reviews.length} />
                            {/* Tap-through overlay CTA: open the full preview in a new tab */}
                            <a
                                href={HERO_PREVIEW_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="lp-btn lp-btn-coin text-[8px] px-4 py-2.5 mt-5 inline-flex items-center gap-2 mx-auto"
                                style={{ display: 'flex', width: 'fit-content' }}
                            >
                                ▶ MAINKAN PREVIEW
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ KEUNGGULAN (Why Choose Us) ============ */}
            <section id="keunggulan" className="scroll-mt-24 lp-band lp-band-dark py-16 sm:py-24 relative overflow-hidden">
                <BandDecor variant="a" />
                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                        <div className="lp-eyebrow">★ KENAPA MEMILIH KAMI ★</div>
                        <h2 className="lp-pixel text-xl sm:text-3xl lg:text-4xl text-white leading-[1.5] mt-4 mb-4" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                            UNDANGAN YANG <span style={{ color: 'var(--lp-coin)' }}>TAK TERLUPAKAN</span>
                        </h2>
                        <p className="text-white/70 font-medium text-sm sm:text-base">
                            Bukan sekadar undangan digital — sebuah petualangan istimewa untuk Anda dan setiap tamu.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
                        {RETRO_FEATURES.map((f, i) => (
                            <div
                                key={i}
                                className={`lp-card group ${f.hero ? 'sm:col-span-2 lg:col-span-3 lp-card-hero' : ''}`}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="lp-feat-ico group-hover:-translate-y-1 transition-transform">{f.emoji}</span>
                                    {f.tag && <span className="lp-tag">{f.tag}</span>}
                                </div>
                                <h3 className={`lp-pixel text-white mb-3 leading-[1.5] ${f.hero ? 'text-sm sm:text-lg' : 'text-[11px] sm:text-xs'}`}>
                                    {f.title}
                                </h3>
                                <p className={`text-white/75 leading-relaxed ${f.hero ? 'text-sm sm:text-base max-w-xl' : 'text-xs sm:text-sm'}`}>
                                    {f.desc}
                                </p>
                                {f.hero && (
                                    <div className="mt-5 lp-pixel text-[8px] tracking-widest inline-flex items-center gap-1.5" style={{ color: 'var(--lp-coin)' }}>
                                        ⭐ EFEK WOW & MUDAH DIBAGIKAN
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ THEMES ============ */}
            <section id="tema" className="scroll-mt-24 lp-band lp-band-sky py-16 sm:py-24 relative overflow-hidden">
                <BandDecor variant="b" />
                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
                        <div className="max-w-xl">
                            <div className="lp-eyebrow">▶ SELECT YOUR STAGE ◀</div>
                            <h2 className="lp-pixel text-xl sm:text-3xl lg:text-4xl text-white leading-[1.5] mt-4" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                                PILIH GAYA <span style={{ color: 'var(--lp-coin)' }}>UNDANGANMU</span>
                            </h2>
                        </div>

                        {/* Style Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 no-scrollbar">
                            {themeCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveThemeCategory(cat)}
                                    className={`lp-pixel text-[8px] px-4 py-2.5 uppercase tracking-widest whitespace-nowrap transition-all lp-pill ${activeThemeCategory === cat ? 'is-active' : ''}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mobile: ≤3 tema → 1 baris saja; >3 tema → 2 baris (grid-flow-col
                        mengisi per kolom ke bawah, jadi tiap baris jumlahnya seimbang,
                        selisih maksimal 1). Lebih dari muat layar → scroll horizontal.
                        sm+: kembali ke grid biasa.
                        Empty state (sudah load tapi tak ada tema) ditaruh DI LUAR grid
                        supaya tidak terjepit lebar kolom `auto-cols-[44vw]`. */}
                    {landingLoaded && filteredThemes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-white/10 rounded-2xl bg-black/20">
                            <div className="text-5xl mb-4" aria-hidden="true">🎨</div>
                            <h3 className="lp-pixel text-[11px] sm:text-xs text-white mb-3 uppercase tracking-widest">
                                {themes.length === 0 ? 'Tema Segera Hadir' : 'Belum Ada Tema di Kategori Ini'}
                            </h3>
                            <p className="text-xs sm:text-sm text-white/60 max-w-sm leading-relaxed">
                                {themes.length === 0
                                    ? 'Koleksi tema undangan kami sedang disiapkan. Nantikan pilihan tema menarik dalam waktu dekat.'
                                    : 'Coba pilih kategori lain untuk melihat tema yang tersedia.'}
                            </p>
                        </div>
                    ) : (
                    <div className={`grid ${filteredThemes.length > 3 ? 'grid-rows-2' : 'grid-rows-1'} grid-flow-col auto-cols-[44vw] sm:grid-rows-none sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-5 px-5 sm:mx-0 sm:px-0 pb-4 sm:pb-0 no-scrollbar`}>
                        {filteredThemes.length > 0 ? filteredThemes.map((theme) => {
                            // Themes tagged "Playable" get the deluxe treatment: a
                            // glowing coin-gold frame, a 🎮 PLAYABLE ribbon, floating
                            // coins, and a "MAINKAN" preview button — the wow tier.
                            const isPlayable = (theme.style_category || '').trim().toLowerCase() === 'playable';
                            return (
                            <div key={theme.id} className={`lp-theme group relative w-full sm:w-auto snap-start ${isPlayable ? 'lp-theme-playable' : ''}`}>
                                <div className="aspect-[9/16] overflow-hidden relative" style={{ background: '#0e0e1a' }}>
                                    {isPlayable && <div className="lp-play-ribbon">🎮 PLAYABLE</div>}
                                    <ProxyImage
                                        src={theme.preview_image || `https://placehold.co/450x800?text=${encodeURIComponent(theme.name)}`}
                                        alt={theme.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-black/0"></div>
                                    <div className="absolute inset-x-0 bottom-0 p-3 flex justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                                        {theme.code ? (
                                            <a
                                                // Tema dengan tenant contoh -> preview pakai slug tenant itu.
                                                // Kalau kosong, jatuh ke demo slug default seperti biasa.
                                                href={`#/preview/${theme.code}/${(theme.sample_tenant_slug || '').trim() || PREVIEW_DEMO_SLUG}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`lp-btn text-[7px] px-3 py-2 ${isPlayable ? 'lp-btn-green' : 'lp-btn-coin'}`}
                                            >
                                                {isPlayable ? '▶ MAINKAN' : '▶ PREVIEW'}
                                            </a>
                                        ) : (
                                            <span
                                                title="Tema ini belum punya kode preview"
                                                className="lp-pixel text-[7px] px-3 py-2 uppercase tracking-widest cursor-not-allowed"
                                                style={{ background: 'rgba(255,255,255,.6)', color: '#555', border: '2px solid #000' }}
                                            >
                                                SEGERA
                                            </span>
                                        )}
                                    </div>
                                    <div className={`lp-theme-tag is-${String(theme.plan_type || '').toLowerCase().trim() || 'basic'}`}>{theme.plan_type}</div>
                                </div>
                                <div className="p-3 sm:p-3.5">
                                    <h3 className="lp-pixel text-[9px] mb-2 text-white truncate">{theme.name}</h3>
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: isPlayable ? 'var(--lp-green)' : 'var(--lp-coin)' }}>
                                        {isPlayable ? '★ BISA DIMAINKAN ★' : (theme.style_category || 'Modern Style')}
                                    </p>
                                </div>
                            </div>
                            );
                        }) : (
                            // Grid ini hanya dirender saat MASIH loading (empty-state
                            // pasca-load sudah ditangani di luar grid), jadi fallback =
                            // skeleton loading.
                            [1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="lp-theme w-full sm:w-auto snap-start animate-pulse">
                                    <div className="aspect-[9/16] bg-black/40"></div>
                                    <div className="p-3 space-y-2">
                                        <div className="h-3 w-1/2 bg-white/10 rounded"></div>
                                        <div className="h-2 w-1/3 bg-white/10 rounded"></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    )}
                </div>
            </section>

            {/* ============ PRICING ============ */}
            <section id="harga" className="scroll-mt-24 lp-band lp-band-dark py-16 sm:py-24 relative overflow-hidden">
                <BandDecor variant="c" />
                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <div className="lp-eyebrow">🪙 INSERT COIN 🪙</div>
                        <h2 className="lp-pixel text-xl sm:text-3xl lg:text-4xl text-white leading-[1.5] mt-4" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                            PILIH PAKET <span style={{ color: 'var(--lp-coin)' }}>TERBAIK</span>
                        </h2>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
                        {orderedPlans.length > 0 ? orderedPlans.map((p) => {
                            const isPremium = p.plan_type === 'premium';
                            return (
                                <div
                                    key={p.plan_type}
                                    className={`lp-price relative ${isPremium ? 'lp-price-best sm:col-span-2 lg:col-span-1 lg:order-2' : ''} ${p.plan_type === 'pro' ? 'lg:order-1' : ''} ${p.plan_type === 'basic' ? 'lg:order-3' : ''}`}
                                >
                                    {isPremium && (
                                        <div className="lp-best-tag">★ BEST CHOICE ★</div>
                                    )}
                                    <div className="mb-8">
                                        <h3 className="lp-pixel text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: isPremium ? 'var(--lp-coin)' : 'rgba(255,255,255,.55)' }}>
                                            {p.plan_type}
                                        </h3>
                                        <div className="flex items-baseline gap-2">
                                            <span className="lp-pixel text-2xl sm:text-3xl text-white">Rp {(p.price / 1000).toFixed(0)}k</span>
                                            <span className="text-[10px] font-bold text-white/50">/lifetime</span>
                                        </div>
                                    </div>

                                    <div className="lp-divider mb-8" />

                                    <ul className="space-y-4 mb-10">
                                        <li className="flex items-center gap-3 text-sm font-medium text-white/90">
                                            <span className="lp-check" />
                                            <span>Limit {p.guest_limit} Tamu</span>
                                        </li>
                                        {planFeatures.filter(f => f.plan_id === p.plan_type).map(f => (
                                            <li key={f.id} className="flex items-center gap-3 text-sm font-medium text-white/90">
                                                <span className="lp-check" />
                                                <span>{f.feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Link to={`/register?plan_type=${encodeURIComponent(p.plan_type)}`} className={`lp-btn w-full text-center block text-[10px] py-4 ${isPremium ? 'lp-btn-coin' : 'lp-btn-ghost'}`}>
                                        PILIH PAKET
                                    </Link>
                                </div>
                            );
                        }) : (
                            // Loading state for plans
                            [1, 2, 3].map(i => <div key={i} className="h-[480px] bg-black/30 lp-pixel-border animate-pulse"></div>)
                        )}
                    </div>
                </div>
            </section>

            {/* ============ FEATURES (Additional) ============ */}
            <section id="fitur" className="scroll-mt-24 lp-band lp-band-sky py-16 sm:py-24 relative overflow-hidden">
                <BandDecor variant="d" />
                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
                        <div className="lp-eyebrow">🎁 POWER-UPS 🎁</div>
                        <h2 className="lp-pixel text-xl sm:text-3xl lg:text-4xl text-white leading-[1.5] mt-4 mb-5" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                            LEBIH DARI <span style={{ color: 'var(--lp-coin)' }}>UNDANGAN BIASA</span>
                        </h2>
                        <p className="text-white/70 font-medium text-sm sm:text-base">Layanan eksklusif untuk melengkapi undangan Anda. Aktifkan sesuai kebutuhan.</p>
                    </div>

                    <div className="max-w-3xl mx-auto lp-list">
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
                            <div key={f.key} className="lp-list-item flex items-center gap-4 sm:gap-5 py-5 sm:py-6 group">
                                <span className="lp-qmark group-hover:-translate-y-1 transition-transform">?</span>
                                <div className="min-w-0 flex-1">
                                    <h3 className="lp-pixel text-[10px] sm:text-[11px] text-white leading-[1.6] break-words mb-1.5">{f.name}</h3>
                                    <p className="text-white/70 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                                </div>
                                {f.price && (
                                    <div className="shrink-0 lp-pixel text-[9px] sm:text-[10px]" style={{ color: f.price === 'Free' ? 'var(--lp-green)' : 'var(--lp-coin)' }}>
                                        {f.price === 'Free' ? 'FREE' : f.price}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ TESTIMONIALS ============ */}
            <section id="testimoni" className="scroll-mt-24 lp-band lp-band-dark py-16 sm:py-24 relative overflow-hidden">
                <BandDecor variant="e" />
                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="text-center mb-12 sm:mb-16">
                        <div className="lp-eyebrow">💬 HIGH SCORES 💬</div>
                        <h2 className="lp-pixel text-xl sm:text-3xl lg:text-4xl text-white leading-[1.5] mt-4" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                            MEREKA SUDAH <span style={{ color: 'var(--lp-coin)' }}>MEMBUKTIKANNYA</span>
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
                                    const highlight = perView === 3 && (i - slide) % 3 === 1;
                                    const initials = `${(r.bride_name?.[0] || '').toUpperCase()}${(r.groom_name?.[0] || '').toUpperCase()}`;
                                    return (
                                        <div
                                            key={r.id}
                                            className="shrink-0 px-2.5 sm:px-3"
                                            style={{ width: `${100 / perView}%` }}
                                        >
                                            <div className={`lp-testi flex flex-col h-full ${highlight ? 'lp-testi-hi' : ''}`}>
                                                <div className="flex items-center gap-1 mb-5">
                                                    {[...Array(Math.max(0, Math.min(5, Number(r.rate_star) || 0)))].map((_, s) => (
                                                        <span key={s} className="lp-star" />
                                                    ))}
                                                </div>

                                                <blockquote className={`text-sm leading-relaxed mb-7 flex-1 ${highlight ? 'text-white/85' : 'text-white/75'}`}>
                                                    "{r.comment}"
                                                </blockquote>

                                                <div className="flex items-center gap-3.5 mt-auto">
                                                    <div className="lp-avatar">
                                                        {initials || '♥'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="lp-pixel text-[8px] text-white truncate">{r.bride_name} &amp; {r.groom_name}</div>
                                                        <div className="flex items-center gap-1.5 text-xs font-medium mt-1.5" style={{ color: highlight ? 'var(--lp-coin)' : 'rgba(255,255,255,.5)' }}>
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
                                    className="lp-nav-btn absolute left-0 top-1/2 -translate-y-1/2 lg:-translate-x-1/2"
                                >
                                    <HiOutlineChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
                                </button>
                                <button
                                    aria-label="Testimoni berikutnya"
                                    onClick={() => setSlide(s => (s >= maxSlide ? 0 : s + 1))}
                                    className="lp-nav-btn absolute right-0 top-1/2 -translate-y-1/2 lg:translate-x-1/2"
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
                                            className={`lp-dot-nav ${i === slide ? 'is-active' : ''}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ============ FAQ ============ */}
            <section id="faq" className="scroll-mt-24 lp-band lp-band-sky py-16 sm:py-24 relative overflow-hidden">
                <BandDecor variant="f" />
                <div className="container mx-auto px-5 sm:px-6 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <div className="lp-eyebrow">❔ NEED A HINT ❔</div>
                        <h2 className="lp-pixel text-xl sm:text-3xl lg:text-4xl text-white leading-[1.5] mt-4" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.4)' }}>
                            PERTANYAAN <span style={{ color: 'var(--lp-coin)' }}>UMUM</span>
                        </h2>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-4">
                        {FAQ_ITEMS.map((item, i) => {
                            const open = openFaq === i;
                            return (
                                <div key={i} className={`lp-faq ${open ? 'is-open' : ''}`}>
                                    <button
                                        onClick={() => setOpenFaq(open ? null : i)}
                                        aria-expanded={open}
                                        className="w-full flex items-center justify-between gap-4 text-left px-5 sm:px-7 py-5"
                                    >
                                        <span className="lp-pixel text-[10px] sm:text-[11px] leading-[1.6] text-white">{item.q}</span>
                                        <HiOutlineChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--lp-coin)' }} />
                                    </button>
                                    <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <p className="px-5 sm:px-7 pb-6 text-sm text-white/75 leading-relaxed whitespace-pre-line">
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
            <section className="lp-band lp-band-dark py-16 sm:py-20">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="lp-cta relative overflow-hidden px-6 sm:px-12 lg:px-20 py-14 sm:py-20 text-center">
                        <div className="lp-cta-deco" aria-hidden="true">
                            <span className="lp-coin co1" /><span className="lp-coin co2" /><span className="lp-qblock d1">?</span>
                        </div>
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="lp-pixel text-lg sm:text-2xl lg:text-3xl text-white leading-[1.55] mb-6" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.5)' }}>
                                SIAP BIKIN UNDANGAN <span style={{ color: 'var(--lp-coin)' }}>IMPIAN?</span>
                            </h2>
                            <p className="text-white/80 text-sm sm:text-base mb-9">Daftar dan mulai rancang undangan digital Anda dalam hitungan menit.</p>
                            <Link to="/register" className="lp-btn lp-btn-coin inline-flex items-center justify-center gap-2 text-[11px] px-9 py-4 lp-blink-soft">
                                DAFTAR SEKARANG
                                <HiOutlineArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ FOOTER ============ */}
            <footer className="lp-footer pt-16 sm:pt-20 pb-10">
                <div className="container mx-auto px-5 sm:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-16 mb-12 sm:mb-16">
                        {/* Brand Column */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="lp-logo-block overflow-hidden p-2">
                                    <img src={logoUrl || kosaIcon} alt={siteName} className="w-full h-full object-contain" />
                                </div>
                                <span className="lp-pixel text-sm text-white">{siteName}</span>
                            </div>
                            <p className="text-white/60 text-sm leading-relaxed font-medium max-w-sm">
                                Platform pembuatan undangan digital untuk mengabadikan setiap momen kebahagiaan Anda — seru, praktis, dan tak terlupakan.
                            </p>
                            {(config?.site_instagram || config?.site_tiktok || config?.site_youtube) && (
                                <div className="flex items-center gap-3">
                                    {config?.site_instagram && (
                                        <a href={`https://instagram.com/${config.site_instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="lp-social">
                                            <FaInstagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {config?.site_tiktok && (
                                        <a href={config.site_tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="lp-social">
                                            <FaTiktok className="w-4 h-4" />
                                        </a>
                                    )}
                                    {config?.site_youtube && (
                                        <a href={config.site_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="lp-social">
                                            <FaYoutube className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quick Links — anchor sections that actually exist */}
                        <div>
                            <h4 className="lp-pixel text-[9px] uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--lp-coin)' }}>NAVIGASI</h4>
                            <ul className="space-y-3.5">
                                {NAV_LINKS.map(item => (
                                    <li key={item}><a href={`#${item.toLowerCase()}`} onClick={(e) => scrollToSection(e, item.toLowerCase())} className="text-sm font-bold text-white/60 hover:text-[var(--lp-coin)] transition-colors">{item}</a></li>
                                ))}
                                <li><Link to="/login" className="text-sm font-bold text-white/60 hover:text-[var(--lp-coin)] transition-colors">Masuk</Link></li>
                                <li><Link to="/register" className="text-sm font-bold text-white/60 hover:text-[var(--lp-coin)] transition-colors">Daftar</Link></li>
                            </ul>
                        </div>

                        {/* Contact — only shown when configured */}
                        {(config?.contact_email || config?.contact_whatsapp) && (
                            <div>
                                <h4 className="lp-pixel text-[9px] uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--lp-coin)' }}>KONTAK KAMI</h4>
                                <div className="space-y-4">
                                    {config?.contact_email && (
                                        <a href={`mailto:${config.contact_email}`} className="flex items-center gap-3 text-sm font-bold text-white/60 hover:text-white break-all">
                                            <HiOutlineMail className="w-5 h-5 shrink-0" style={{ color: 'var(--lp-coin)' }} />
                                            {config.contact_email}
                                        </a>
                                    )}
                                    {config?.contact_whatsapp && (
                                        <a href={`https://wa.me/${config.contact_whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm font-bold text-white/60 hover:text-white">
                                            <FaWhatsapp className="w-5 h-5 shrink-0" style={{ color: 'var(--lp-coin)' }} />
                                            +{config.contact_whatsapp}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-white/10">
                        <p className="lp-pixel text-[7px] sm:text-[8px] text-white/40 uppercase tracking-widest text-center leading-[1.8]">
                            © 2026 {siteName}. GAME OVER? INSERT COIN TO CONTINUE ♥
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

/* ==========================================================================
   HeroShowcase — the center live-preview phone flanked by two theme
   screenshots. All three panels are the SAME size; the active one sits in the
   center (the live iframe when it's active, an enlarged screenshot otherwise).
   Clicking a side panel swaps it into the center. Screenshots ≥ xl only.
   ========================================================================== */
type ShowcaseKey = 'live' | 'shot1' | 'shot2';

function HeroShowcase({ avgRating, reviewCount }: { avgRating: string | null; reviewCount: number }) {
    const [center, setCenter] = useState<ShowcaseKey>('live');

    // CRITICAL: the panels are rendered in a FIXED DOM order with stable keys and
    // are NEVER conditionally mounted/unmounted. In particular the live <iframe>
    // is mounted exactly once and stays mounted. Which panel appears in the
    // center is decided purely by CSS `order` (flexbox), so clicking a side
    // panel only re-styles nodes — it never re-creates the iframe, so the live
    // preview (and any game running inside it) does NOT reload.
    const PANELS: ShowcaseKey[] = ['live', 'shot1', 'shot2'];

    // Assign flex `order` so `center` sits in the middle (order 1) and the other
    // two flank it left (0) / right (2), keeping their natural relative order.
    const flanks = PANELS.filter((k) => k !== center);
    const orderOf = (key: ShowcaseKey): number => {
        if (key === center) return 1;
        return flanks[0] === key ? 0 : 2;
    };

    const sideProps = (key: ShowcaseKey) => ({
        role: 'button' as const,
        tabIndex: 0,
        onClick: () => setCenter(key),
        onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCenter(key); }
        },
    });

    return (
        <div className="lp-hero-stage">
            {PANELS.map((key) => {
                const isCenter = key === center;
                const order = orderOf(key);
                // position class drives rotation/overlap of the two flanks
                const pos = isCenter ? 'is-center' : order === 0 ? 'is-left' : 'is-right';
                const cls = `lp-hero-slot ${isCenter ? 'lp-hero-slot-center' : 'lp-hero-slot-side'} ${pos}`;
                // side panels are clickable; the centered one is not
                const interactive = isCenter ? {} : sideProps(key);

                if (key === 'live') {
                    return (
                        <div key="live" className={cls} style={{ order }} {...interactive}>
                            {/* frame chrome */}
                            <div className="lp-hero-frame">
                                <div className="lp-hero-card-top">
                                    <span className="lp-dot r" /><span className="lp-dot y" /><span className="lp-dot g" />
                                    <span className="lp-pixel text-[7px] text-white/70 ml-2">WORLD 1-1</span>
                                    <span className="lp-live-badge ml-auto"><span className="lp-live-dot" /> LIVE</span>
                                </div>
                                <div className="lp-hero-screen">
                                    {/* mounted once, never torn down → no reload on swap */}
                                    <iframe
                                        src={HERO_PREVIEW_URL}
                                        title="Pratinjau undangan interaktif"
                                        loading="lazy"
                                        className="lp-hero-iframe"
                                        scrolling="no"
                                    />
                                    {/* when this panel is a flank, an overlay covers the
                                        iframe so pointer events don't reach it and it reads
                                        as a clickable card. The iframe keeps running underneath. */}
                                    {!isCenter && (
                                        <div className="lp-hero-live-poster">
                                            <span className="lp-pixel text-[8px] text-white/90">▶ LIVE</span>
                                            <span className="lp-pixel text-[6px] text-white/60 mt-2">KLIK UTK MAIN</span>
                                        </div>
                                    )}
                                </div>
                                {isCenter && avgRating && (
                                    <div className="lp-hero-chip">
                                        <span className="lp-star" />
                                        <div className="leading-tight">
                                            <div className="lp-pixel text-[9px]" style={{ color: 'var(--lp-coin)' }}>{avgRating}/5.0</div>
                                            <div className="lp-pixel text-[6px] text-white/60 mt-1">{reviewCount} ULASAN</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                }

                // screenshot panels (shot1 / shot2)
                const img = key === 'shot1' ? lp01 : lp02;
                return (
                    <div key={key} className={cls} style={{ order }} {...interactive}>
                        <div className="lp-hero-frame">
                            {isCenter && (
                                <div className="lp-hero-card-top">
                                    <span className="lp-dot r" /><span className="lp-dot y" /><span className="lp-dot g" />
                                    <span className="lp-pixel text-[7px] text-white/70 ml-2">TEMA</span>
                                    <span className="lp-live-badge ml-auto">DEMO</span>
                                </div>
                            )}
                            <div className="lp-hero-screen">
                                <img src={img} alt="" className="lp-hero-shot-img" loading="lazy" />
                                {!isCenter && <span className="lp-hero-side-hint">KLIK</span>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ==========================================================================
   HeroRunner — a tiny playable endless-runner pinned to the hero's ground
   strip (à la the Chrome dino game), Mario-flavoured. DESKTOP ONLY: hidden
   under 900px via CSS (it needs a keyboard / deliberate click and shouldn't
   steal taps on mobile). The player auto-runs; Space / ArrowUp / click jumps
   over scrolling obstacles (goombas & pipes). Physics run on a single RAF loop
   whose id + listeners are torn down on unmount so nothing leaks.
   All sprites are CSS pixel blocks — no image assets.
   ========================================================================== */
function HeroRunner() {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<HTMLDivElement | null>(null);
    const worldRef = useRef<HTMLDivElement | null>(null);   // holds obstacles
    const scoreRef = useRef<HTMLSpanElement | null>(null);
    const [dead, setDead] = useState(false);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const root = rootRef.current, player = playerRef.current, world = worldRef.current;
        if (!root || !player || !world) return;

        // ---- tunables (ground-relative units, px) ----
        const GROUND = 0;            // player bottom offset baseline
        const GRAVITY = 2400;        // px/s²
        const JUMP_V = 720;          // initial jump velocity px/s
        const BASE_SPEED = 300;      // px/s obstacle scroll
        const SPAWN_MIN = 0.9, SPAWN_MAX = 1.7; // seconds between spawns

        const RUN_X_SPEED = 260;     // px/s horizontal walk speed (maju/mundur)
        const PW = 26;               // player width (hitbox)

        // default spawn X = horizontally under the hero PRESS START button, so
        // the runner starts right below it. Falls back to a small left offset.
        const defaultX = () => {
            const btn = document.getElementById('lp-hero-start');
            if (!btn) return 34;
            const b = btn.getBoundingClientRect();
            const r = root.getBoundingClientRect();
            const x = b.left - r.left + b.width / 2 - PW / 2;   // center under button
            return Math.max(8, Math.min(x, root.clientWidth - PW - 8));
        };

        type Obs = { el: HTMLDivElement; x: number; w: number; h: number };
        let obstacles: Obs[] = [];
        let y = 0, vy = 0;           // player vertical pos/vel
        let px = defaultX();         // player horizontal position (left offset)
        let moveDir = 0;             // -1 mundur, +1 maju, 0 diam (from held keys)
        let facing = 1;              // last non-zero dir, for sprite flip
        let running = false;
        let over = false;
        let hasStarted = false;
        let speed = BASE_SPEED;
        let dist = 0;
        let spawnTimer = 0, nextSpawn = 1.2;
        let last = 0, rafId = 0;
        // deterministic-ish varied spawns without Math.random dependency issues
        let seed = 12345;
        const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

        const setScore = (v: number) => { if (scoreRef.current) scoreRef.current.textContent = String(Math.floor(v)).padStart(5, '0'); };

        const spawn = () => {
            const el = document.createElement('div');
            const isPipe = rnd() > 0.55;
            el.className = isPipe ? 'lp-run-obs lp-run-pipe' : 'lp-run-obs lp-run-goomba';
            const w = isPipe ? 26 : 24;
            const h = isPipe ? 34 : 22;
            const rootW = root.clientWidth;
            const o: Obs = { el, x: rootW + 20, w, h };
            el.style.transform = `translateX(${o.x}px)`;
            world.appendChild(el);
            obstacles.push(o);
        };

        const clearObstacles = () => { obstacles.forEach(o => o.el.remove()); obstacles = []; };

        const applyPlayer = () => { player.style.transform = `translate(${px - 34}px, ${-y}px) scaleX(${facing})`; };

        const reset = () => {
            over = false; y = 0; vy = 0; speed = BASE_SPEED; dist = 0;
            px = defaultX(); moveDir = 0; facing = 1;
            spawnTimer = 0; nextSpawn = 1.0; clearObstacles(); setScore(0);
            applyPlayer();
            player.classList.remove('is-dead');
            root.classList.remove('is-over');
            setDead(false);
        };

        const jump = () => {
            if (over) { reset(); running = true; return; }
            if (!hasStarted) { hasStarted = true; running = true; setStarted(true); }
            if (y <= 0.5) vy = JUMP_V;         // only when grounded
        };

        const die = () => {
            over = true; running = false;
            player.classList.add('is-dead');
            root.classList.add('is-over');
            setDead(true);
        };

        const loop = (t: number) => {
            rafId = requestAnimationFrame(loop);
            if (!last) last = t;
            let dt = (t - last) / 1000; last = t;
            if (dt > 0.05) dt = 0.05;          // clamp after tab-switch

            if (running && !over) {
                // player physics — vertical (jump)
                vy -= GRAVITY * dt;
                y += vy * dt;
                if (y < 0) { y = 0; vy = 0; }

                // player physics — horizontal (maju/mundur), clamped in bounds
                if (moveDir !== 0) {
                    px += moveDir * RUN_X_SPEED * dt;
                    facing = moveDir;
                    const maxX = root.clientWidth - PW - 8;
                    if (px < 8) px = 8;
                    if (px > maxX) px = maxX;
                }
                // combined transform: horizontal position + jump height + facing flip
                applyPlayer();

                // difficulty ramps slowly with distance
                dist += speed * dt;
                speed = BASE_SPEED + Math.min(260, dist / 60);
                setScore(dist / 10);

                // spawn cadence
                spawnTimer += dt;
                if (spawnTimer >= nextSpawn) {
                    spawnTimer = 0;
                    nextSpawn = SPAWN_MIN + rnd() * (SPAWN_MAX - SPAWN_MIN);
                    spawn();
                }

                // move obstacles + collide against the player's LIVE x (px)
                for (const o of obstacles) {
                    o.x -= speed * dt;
                    o.el.style.transform = `translateX(${o.x}px)`;
                    // AABB: player occupies [px, px+PW]; a hit needs horizontal
                    // overlap AND the player low enough to touch the obstacle.
                    const hit = o.x < px + PW && o.x + o.w > px && y < o.h - 4;
                    if (hit) die();
                }
                // cull off-screen
                if (obstacles.length && obstacles[0].x + obstacles[0].w < -10) {
                    obstacles[0].el.remove();
                    obstacles.shift();
                }
            }
        };

        // ignore game keys while typing in a field, and only when the runner is
        // actually on screen (desktop)
        const active = () => {
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea') return false;
            return getComputedStyle(root).display !== 'none';
        };
        const isJump = (e: KeyboardEvent) => e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ' || e.key === 'ArrowUp';
        const isLeft = (e: KeyboardEvent) => e.code === 'ArrowLeft' || e.code === 'KeyA';
        const isRight = (e: KeyboardEvent) => e.code === 'ArrowRight' || e.code === 'KeyD';

        const onKeyDown = (e: KeyboardEvent) => {
            if (!(isJump(e) || isLeft(e) || isRight(e))) return;
            if (!active()) return;
            e.preventDefault();
            if (isJump(e)) { jump(); return; }
            // maju/mundur: auto-start the run on first move too
            if (over) return;
            if (!hasStarted) { hasStarted = true; running = true; setStarted(true); }
            if (isLeft(e)) moveDir = -1;
            else if (isRight(e)) moveDir = 1;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (isLeft(e) && moveDir === -1) moveDir = 0;
            else if (isRight(e) && moveDir === 1) moveDir = 0;
        };
        const onClick = () => { if (active()) jump(); };

        // keep the resting character under the PRESS START button; realign on
        // resize but only while idle (don't yank the player mid-run).
        const onResize = () => { if (!hasStarted || over) { px = defaultX(); applyPlayer(); } };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('resize', onResize);
        root.addEventListener('click', onClick);

        // place the player under the button on first paint, then start the loop
        px = defaultX();
        applyPlayer();
        rafId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('resize', onResize);
            root.removeEventListener('click', onClick);
            clearObstacles();
        };
    }, []);

    return (
        <div className="lp-runner" ref={rootRef} aria-hidden="true">
            {/* score */}
            <div className="lp-run-score">HI <span ref={scoreRef}>00000</span></div>
            {/* hint / game-over */}
            {!started && <div className="lp-run-hint">◀ ▶ GERAK · SPASI LOMPAT · KLIK MAIN</div>}
            {dead && <div className="lp-run-hint lp-run-over">GAME OVER · KLIK UNTUK ULANG</div>}
            {/* moving world (obstacles injected here) */}
            <div className="lp-run-world" ref={worldRef} aria-hidden="true" />
            {/* the runner */}
            <div className="lp-run-player" ref={playerRef} aria-hidden="true">
                <span className="rp-cap" /><span className="rp-face" /><span className="rp-leg l" /><span className="rp-leg r" />
            </div>
            {/* the ground strip itself */}
            <div className="lp-run-ground" aria-hidden="true" />
        </div>
    );
}

/* ==========================================================================
   BandDecor — a non-interactive layer of floating pixel-art Mario props that
   sits BEHIND each section's content (z-1, content is z-10). Every prop has
   pointer-events:none + low opacity so it decorates without ever blocking a
   tap or hurting text contrast. `variant` picks a different prop mix per band
   so the page doesn't feel repetitive as you scroll.
   ========================================================================== */
function BandDecor({ variant }: { variant: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' }) {
    // Each variant is a small hand-placed arrangement. Positions are inline so
    // one CSS block covers the shared look and the JSX controls placement.
    const sets: Record<string, React.ReactNode> = {
        // Keunggulan — clouds + coins + a couple of ? blocks up top
        a: (
            <>
                <span className="bd-cloud" style={{ top: '8%', left: '-10%' }} />
                <span className="bd-cloud" style={{ top: '52%', left: '-14%', animationDuration: '34s', transform: 'scale(.8)' }} />
                <span className="bd-qblock" style={{ top: '16%', right: '5%' }}>?</span>
                <span className="bd-coin" style={{ top: '38%', right: '9%' }} />
                <span className="bd-star" style={{ bottom: '16%', left: '6%' }} />
                <span className="bd-brick" style={{ bottom: '22%', right: '7%' }} />
            </>
        ),
        // Tema — pipe + goomba near the ground, coins drifting
        b: (
            <>
                <span className="bd-cloud" style={{ top: '10%', left: '-12%', animationDuration: '30s' }} />
                <span className="bd-coin" style={{ top: '24%', left: '7%' }} />
                <span className="bd-qblock" style={{ top: '60%', left: '4%' }}>?</span>
                <span className="bd-pipe" style={{ bottom: '14px', right: '4%' }} />
                <span className="bd-goomba" style={{ bottom: '16px', left: '9%' }} />
                <span className="bd-star" style={{ top: '20%', right: '6%' }} />
            </>
        ),
        // Harga — coins galore (money vibe) + ? blocks
        c: (
            <>
                <span className="bd-coin" style={{ top: '14%', left: '6%' }} />
                <span className="bd-coin" style={{ top: '30%', right: '7%', animationDelay: '-.5s' }} />
                <span className="bd-coin" style={{ bottom: '24%', left: '10%', animationDelay: '-.8s' }} />
                <span className="bd-qblock" style={{ top: '20%', right: '12%' }}>?</span>
                <span className="bd-brick" style={{ top: '46%', left: '3%' }} />
                <span className="bd-star" style={{ bottom: '18%', right: '6%' }} />
            </>
        ),
        // Fitur — clouds + hill silhouette + a pipe
        d: (
            <>
                <span className="bd-cloud" style={{ top: '9%', left: '-12%', animationDuration: '32s' }} />
                <span className="bd-hill" style={{ bottom: '14px', left: '-30px' }} />
                <span className="bd-hill" style={{ bottom: '14px', right: '-40px', width: '150px', height: '80px' }} />
                <span className="bd-qblock" style={{ top: '18%', right: '5%' }}>?</span>
                <span className="bd-coin" style={{ top: '44%', left: '5%' }} />
                <span className="bd-goomba" style={{ bottom: '16px', right: '10%' }} />
            </>
        ),
        // Testimoni — stars (high scores) + coins
        e: (
            <>
                <span className="bd-star" style={{ top: '12%', left: '6%' }} />
                <span className="bd-star" style={{ bottom: '20%', right: '7%', animationDelay: '-1s' }} />
                <span className="bd-coin" style={{ top: '30%', right: '10%' }} />
                <span className="bd-qblock" style={{ top: '54%', left: '4%' }}>?</span>
                <span className="bd-cloud" style={{ top: '10%', left: '-12%', animationDuration: '36s' }} />
            </>
        ),
        // FAQ — ? blocks (questions!) + a coin
        f: (
            <>
                <span className="bd-qblock" style={{ top: '14%', left: '6%' }}>?</span>
                <span className="bd-qblock" style={{ bottom: '22%', right: '7%', animationDelay: '-1s' }}>?</span>
                <span className="bd-coin" style={{ top: '40%', right: '10%' }} />
                <span className="bd-cloud" style={{ top: '8%', left: '-12%', animationDuration: '30s' }} />
                <span className="bd-star" style={{ bottom: '18%', left: '9%' }} />
            </>
        ),
    };
    return <div className="lp-band-deco" aria-hidden="true">{sets[variant]}</div>;
}

/* ==========================================================================
   Retro-game styling — scoped to `.rm-lp` so it can't leak into the rest of
   the app. Loads the pixel font, defines the NES palette, pixel borders,
   3D block buttons, and all the floating Mario-style decor.
   ========================================================================== */
function RetroStyles() {
    return (
        <style>{`
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.rm-lp {
    --lp-sky: #5c94fc;
    --lp-sky-2: #7aa8ff;
    --lp-sky-deep: #3a6ad6;
    --lp-ink: #0e0e1a;
    --lp-ink-2: #171326;
    --lp-panel: #1b1530;
    --lp-coin: #fac000;
    --lp-coin-deep: #e89000;
    --lp-red: #e52521;
    --lp-red-2: #b81b18;
    --lp-green: #43b047;
    --lp-green-2: #2f8a33;
    --lp-ground: #c84c0c;
    --lp-ground-2: #e07b2a;
    -webkit-tap-highlight-color: transparent;
}
.rm-lp .lp-pixel { font-family: 'Press Start 2P', monospace; }

/* ---- pixel-block buttons (3D NES press feel) ---- */
.rm-lp .lp-btn {
    font-family: 'Press Start 2P', monospace;
    text-transform: uppercase; letter-spacing: 1px; line-height: 1.5;
    border: 3px solid #000; cursor: pointer; text-decoration: none;
    white-space: nowrap;                 /* text + icon stay on one line */
    transition: transform .1s, box-shadow .1s;
    display: inline-flex; align-items: center; justify-content: center;
}
.rm-lp .lp-btn:active { transform: translateY(4px); }
.rm-lp .lp-btn-coin { background: var(--lp-coin); color: #000; box-shadow: 0 5px 0 var(--lp-coin-deep); }
.rm-lp .lp-btn-coin:active { box-shadow: 0 1px 0 var(--lp-coin-deep); }
.rm-lp .lp-btn-green { background: var(--lp-green); color: #fff; box-shadow: 0 5px 0 var(--lp-green-2); }
.rm-lp .lp-btn-green:active { box-shadow: 0 1px 0 var(--lp-green-2); }
.rm-lp .lp-btn-ghost { background: rgba(255,255,255,.08); color: #fff; box-shadow: 0 5px 0 rgba(0,0,0,.5); }
.rm-lp .lp-btn-ghost:active { box-shadow: 0 1px 0 rgba(0,0,0,.5); }

.rm-lp .lp-pixel-border { border: 4px solid #000; box-shadow: 6px 6px 0 rgba(0,0,0,.5); }

/* ---- navbar ---- */
.rm-lp .lp-nav-solid {
    background: rgba(14,14,26,.92); backdrop-filter: blur(6px);
    border-bottom: 3px solid #000; box-shadow: 0 4px 0 rgba(0,0,0,.35);
}
.rm-lp .lp-logo-block {
    width: 40px; height: 40px; flex: 0 0 40px; display: flex; align-items: center; justify-content: center;
    font-family: 'Press Start 2P', monospace; font-size: 16px; color: #7a4d00;
    background: var(--lp-coin); border: 3px solid #000; border-radius: 3px;
    box-shadow: inset 0 0 0 3px var(--lp-coin-deep), 3px 3px 0 rgba(0,0,0,.4);
    animation: lp-bob 2.4s steps(2) infinite;
}

/* ---- hero ---- */
.rm-lp .lp-hero {
    background: linear-gradient(180deg, var(--lp-sky-deep) 0%, var(--lp-sky) 55%, var(--lp-sky-2) 100%);
}
/* ---- Hero endless-runner mini-game (desktop only) ---- */
.rm-lp .lp-runner {
    position: absolute; left: -1px; right: -1px; bottom: 0; height: 92px; z-index: 5;
    /* NO clipping on the root — so the player can jump above the strip with no
       hard clip line. Off-screen obstacles are clipped by .lp-hero (overflow). */
    overflow: visible;
    cursor: pointer; display: none;   /* shown on desktop below */
    /* The line some browsers painted at this box's top edge was a GPU
       compositing seam: .lp-runner is promoted to its own layer (positioned +
       animated children) and its box edge could land on a fractional pixel,
       anti-aliasing against the hero gradient behind it. Pinning it to its own
       pixel-snapped layer removes the seam. */
    transform: translateZ(0);
    -webkit-backface-visibility: hidden; backface-visibility: hidden;
    /* The intermittent full-width "border" was the browser's FOCUS OUTLINE:
       clicking the runner focuses it (role=button + tabindex), then pressing a
       key triggers :focus-visible, drawing an outline around this full-width
       box — read as a line at its top edge. It's a game surface, not a
       nav control, so suppress the outline. */
    outline: none;
}
.rm-lp .lp-runner:focus, .rm-lp .lp-runner:focus-visible { outline: none; box-shadow: none; }
@media (min-width: 900px) { .rm-lp .lp-runner { display: block; } }
/* the ground strip the runner sits on (no top border — blends into the sky) */
.rm-lp .lp-run-ground {
    position: absolute; left: 0; right: 0; bottom: 0; height: 46px; z-index: 1;
    background: repeating-linear-gradient(90deg, var(--lp-ground) 0 30px, var(--lp-ground-2) 30px 32px);
}
/* Obstacle lane. It repaints every frame (obstacles translateX), and a
   composited layer's hard TOP edge sitting over the sky flickers a 1px seam on
   those repaints — THIS was the intermittent "border" that came and went with
   the moving obstacles. Fix: push the lane's top FAR above the hero so its top
   edge is off-screen (clipped by .lp-hero's overflow) and can never be seen.
   Obstacles stay bottom-anchored (bottom:46px), so gameplay is unchanged. */
.rm-lp .lp-run-world {
    position: absolute; left: 0; right: 0; bottom: 0; top: -100vh; z-index: 2;
}
/* obstacles are absolutely placed on the ground line (46px up), moved via
   translateX by JS. */
.rm-lp .lp-run-obs { position: absolute; left: 0; bottom: 46px; image-rendering: pixelated; }
.rm-lp .lp-run-pipe {
    width: 26px; height: 34px; background: var(--lp-green); border: 3px solid #000;
    box-shadow: inset -6px 0 0 rgba(0,0,0,.18), inset 6px 0 0 rgba(255,255,255,.22);
}
.rm-lp .lp-run-pipe::before {
    content: ''; position: absolute; top: -8px; left: -5px; right: -5px; height: 11px;
    background: var(--lp-green); border: 3px solid #000;
}
.rm-lp .lp-run-goomba {
    width: 24px; height: 22px; background: #9a5a2a; border: 3px solid #000;
    border-radius: 12px 12px 4px 4px;
    /* NB: no transform-based walk here — JS drives translateX to scroll it, and
       a CSS transform animation would clobber that. The scroll IS the motion. */
    animation: lp-run-squash .5s steps(2) infinite;
}
@keyframes lp-run-squash { 50% { border-radius: 12px 12px 8px 8px; height: 20px; } }
.rm-lp .lp-run-goomba::before, .rm-lp .lp-run-goomba::after { content: ''; position: absolute; top: 7px; width: 4px; height: 5px; background: #fff; }
.rm-lp .lp-run-goomba::before { left: 4px; } .rm-lp .lp-run-goomba::after { right: 4px; }
/* the player — a little pixel runner, bottom-anchored above the ground */
.rm-lp .lp-run-player {
    position: absolute; left: 34px; bottom: 46px; width: 26px; height: 28px; z-index: 3;
    image-rendering: pixelated;
}
.rm-lp .rp-cap  { position: absolute; top: 0; left: 2px; width: 22px; height: 8px; background: var(--lp-red); border: 2px solid #000; }
.rm-lp .rp-face { position: absolute; top: 7px; left: 4px; width: 18px; height: 12px; background: #ffcf9e; border: 2px solid #000; }
.rm-lp .rp-leg  { position: absolute; bottom: 0; width: 8px; height: 9px; background: #2a4fb0; border: 2px solid #000; }
.rm-lp .rp-leg.l { left: 3px; animation: lp-run-legA .18s steps(2) infinite; }
.rm-lp .rp-leg.r { right: 3px; animation: lp-run-legB .18s steps(2) infinite; }
@keyframes lp-run-legA { 50% { transform: translateY(-3px); } }
@keyframes lp-run-legB { 0%, 100% { transform: translateY(-3px); } 50% { transform: translateY(0); } }
.rm-lp .lp-run-player.is-dead .rp-leg { animation: none; }
.rm-lp .lp-run-player.is-dead { filter: grayscale(.5) brightness(.8); }
/* HUD */
.rm-lp .lp-run-score {
    position: absolute; top: 8px; right: 12px; z-index: 4;
    font-family: 'Press Start 2P', monospace; font-size: 9px; color: #fff;
    text-shadow: 1px 1px 0 rgba(0,0,0,.6); opacity: .8; letter-spacing: 1px;
}
.rm-lp .lp-run-hint {
    position: absolute; top: 10px; left: 50%; transform: translateX(-50%); z-index: 4;
    font-family: 'Press Start 2P', monospace; font-size: 8px; color: var(--lp-coin);
    text-shadow: 1px 1px 0 rgba(0,0,0,.6); white-space: nowrap;
    animation: lp-blink 1.1s steps(2) infinite;
}
.rm-lp .lp-run-over { color: #fff; background: rgba(0,0,0,.55); padding: 5px 9px; border: 2px solid #000; border-radius: 3px; animation: none; }
.rm-lp .lp-hero-deco { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.rm-lp .lp-hero-deco > span { position: absolute; image-rendering: pixelated; }

.rm-lp .lp-cloud {
    width: 30px; height: 12px; background: #fff; border-radius: 7px;
    box-shadow: 16px -7px 0 0 #fff, 34px 0 0 0 #fff, -3px 0 0 0 #fff; opacity: .9;
    animation: lp-drift 26s linear infinite;
}
.rm-lp .lp-cloud.c1 { top: 12%; left: -16%; }
.rm-lp .lp-cloud.c2 { top: 26%; left: -24%; transform: scale(1.3); animation-duration: 36s; }
.rm-lp .lp-cloud.c3 { top: 18%; left: -12%; transform: scale(.8); animation-duration: 30s; animation-delay: -8s; }
.rm-lp .lp-hill { bottom: 46px; width: 150px; height: 74px; background: #3a8a3a; border-radius: 74px 74px 0 0; opacity: .5; }
.rm-lp .lp-hill.h1 { left: -40px; }
.rm-lp .lp-hill.h2 { right: -50px; width: 190px; height: 96px; background: #2f6a2f; }
.rm-lp .lp-qblock {
    width: 32px; height: 32px; border: 3px solid #000; box-shadow: 3px 3px 0 rgba(0,0,0,.4);
    background: var(--lp-coin); color: #7a4d00; border-radius: 3px;
    font-family: 'Press Start 2P', monospace; font-size: 15px;
    display: flex; align-items: center; justify-content: center;
    animation: lp-bob 3s ease-in-out infinite;
}
.rm-lp .lp-qblock.d1 { top: 20%; right: 10%; }
.rm-lp .lp-qblock.d2 { top: 44%; right: 6%; animation-delay: -1s; }
.rm-lp .lp-coin {
    width: 16px; height: 20px; background: #fde36a; border: 2px solid #b56f00; border-radius: 4px;
    box-shadow: 0 0 0 1.5px #000; opacity: .95; animation: lp-spin 1.6s steps(8) infinite;
}
.rm-lp .lp-coin.co1 { top: 34%; left: 12%; }
.rm-lp .lp-coin.co2 { top: 54%; right: 18%; animation-delay: -.6s; }
.rm-lp .lp-pipe {
    bottom: 46px; right: 8%; width: 52px; height: 66px; background: var(--lp-green);
    border: 3px solid #000; opacity: .9;
    box-shadow: inset -8px 0 0 rgba(0,0,0,.18), inset 8px 0 0 rgba(255,255,255,.22);
}
.rm-lp .lp-pipe::before {
    content: ''; position: absolute; top: -10px; left: -7px; right: -7px; height: 14px;
    background: var(--lp-green); border: 3px solid #000;
}
.rm-lp .lp-goomba {
    bottom: 50px; left: 13%; width: 30px; height: 26px; background: #9a5a2a;
    border: 3px solid #000; border-radius: 15px 15px 4px 4px; opacity: .92;
    animation: lp-walk 3s ease-in-out infinite;
}
.rm-lp .lp-goomba::before, .rm-lp .lp-goomba::after { content: ''; position: absolute; top: 9px; width: 5px; height: 6px; background: #fff; }
.rm-lp .lp-goomba::before { left: 5px; } .rm-lp .lp-goomba::after { right: 5px; }

.rm-lp .lp-badge {
    font-family: 'Press Start 2P', monospace; font-size: 8px; letter-spacing: 1.5px; color: #fff;
    background: var(--lp-red); padding: 8px 12px; border: 3px solid #000; border-radius: 3px;
    box-shadow: 3px 3px 0 rgba(0,0,0,.35);
}
.rm-lp .lp-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: lp-blink 1s steps(2) infinite; }

.rm-lp .lp-chip {
    display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #fff;
    background: rgba(0,0,0,.28); border: 2px solid rgba(0,0,0,.5); border-radius: 4px; padding: 6px 10px;
}
.rm-lp .lp-star {
    width: 16px; height: 16px; display: inline-block; background: var(--lp-coin);
    clip-path: polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
    filter: drop-shadow(1px 1px 0 rgba(0,0,0,.4));
}

/* Hero stage: 3 EQUAL-size panels (center + 2 flanks). Panels are rendered in a
   FIXED DOM order (live, shot1, shot2) and never remounted — their visual left/
   center/right position is set purely by flexbox 'order' (inline style) + the
   .is-left/.is-center/.is-right classes below. That's what keeps the live
   iframe from reloading when you click a flank. */
.rm-lp .lp-hero-stage {
    position: relative; display: flex; align-items: center; justify-content: center;
}
.rm-lp .lp-hero-slot { flex: 0 0 auto; transition: transform .5s, filter .3s; }
.rm-lp .lp-hero-slot-center { z-index: 3; }
.rm-lp .lp-hero-slot-side { z-index: 1; display: none; cursor: pointer; }
@media (min-width: 1280px) { .rm-lp .lp-hero-slot-side { display: block; } }
/* flank positioning keyed off the position class (NOT :first/:last-child, since
   DOM order is fixed and only 'order' changes) */
.rm-lp .lp-hero-slot.is-left  { transform: rotate(-5deg) translateY(20px); margin-right: -30px; }
.rm-lp .lp-hero-slot.is-right { transform: rotate(5deg)  translateY(20px); margin-left: -30px; }
.rm-lp .lp-hero-slot.is-left:hover  { transform: rotate(-2deg) translateY(8px); }
.rm-lp .lp-hero-slot.is-right:hover { transform: rotate(2deg)  translateY(8px); }

/* The frame chrome (border/shadow/size) lives on .lp-hero-frame so the outer
   slot can own position/order without fighting the frame's transform. */
.rm-lp .lp-hero-frame {
    position: relative; width: 260px; max-width: 100%;
    border: 5px solid #000; background: var(--lp-panel);
    border-radius: 6px; overflow: hidden; transition: filter .3s, box-shadow .3s, transform .6s;
}
/* center = big + strong shadow + slight tilt that straightens on hover */
.rm-lp .lp-hero-slot-center .lp-hero-frame {
    box-shadow: 8px 8px 0 rgba(0,0,0,.5); transform: rotate(1.5deg);
}
.rm-lp .lp-hero-slot-center .lp-hero-frame:hover { transform: rotate(0); }
@media (min-width: 1024px) { .rm-lp .lp-hero-slot-center .lp-hero-frame { width: 400px; } }
/* flanks = same style, slightly smaller + dimmed until hovered */
.rm-lp .lp-hero-slot-side .lp-hero-frame {
    box-shadow: 6px 6px 0 rgba(0,0,0,.45); filter: brightness(.82) saturate(.9);
}
@media (min-width: 1280px) { .rm-lp .lp-hero-slot-side .lp-hero-frame { width: 300px; } }
.rm-lp .lp-hero-slot-side:hover .lp-hero-frame { filter: brightness(1) saturate(1); }

.rm-lp .lp-hero-shot-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
/* poster overlays the (still-running) live iframe when it's a flank; it also
   swallows pointer events so clicks land on the slot, not inside the iframe. */
.rm-lp .lp-hero-live-poster {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center; z-index: 3;
    background: rgba(14,14,26,.72); backdrop-filter: blur(1px);
}
.rm-lp .lp-hero-side-hint {
    position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
    font-family: 'Press Start 2P', monospace; font-size: 7px;
    background: var(--lp-coin); color: #0e0e1a; border: 2px solid #000;
    padding: 3px 6px; border-radius: 3px; z-index: 2;
}

.rm-lp .lp-hero-card-top {
    display: flex; align-items: center; gap: 6px; padding: 8px 12px;
    background: var(--lp-red); border-bottom: 3px solid #000;
}
.rm-lp .lp-dot { width: 11px; height: 11px; border-radius: 50%; border: 2px solid #000; }
.rm-lp .lp-dot.r { background: #ff5a55; } .rm-lp .lp-dot.y { background: var(--lp-coin); } .rm-lp .lp-dot.g { background: var(--lp-green); }
.rm-lp .lp-live-badge {
    display: inline-flex; align-items: center; gap: 5px; font-family: 'Press Start 2P', monospace;
    font-size: 6px; letter-spacing: 1px; color: #fff; background: rgba(0,0,0,.35);
    border: 2px solid #000; border-radius: 3px; padding: 3px 6px;
}
.rm-lp .lp-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--lp-green); animation: lp-blink 1s steps(2) infinite; }
/* the 9:16 screen; iframe fills it and is scaled so a phone-width invitation
   fits the narrow frame without its own scrollbars. */
.rm-lp .lp-hero-screen {
    position: relative; width: 100%; aspect-ratio: 9 / 16; background: #000; overflow: hidden;
}
.rm-lp .lp-hero-iframe {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    border: 0; display: block; background: #0e0e1a;
}
.rm-lp .lp-hero-chip {
    position: absolute; bottom: 10px; left: 10px; display: flex; align-items: center; gap: 8px;
    background: rgba(14,14,26,.92); border: 3px solid #000; box-shadow: 3px 3px 0 rgba(0,0,0,.4);
    padding: 7px 10px; border-radius: 3px; z-index: 2;
}

/* ---- section bands ---- */
.rm-lp .lp-band { position: relative; }
.rm-lp .lp-band-dark { background: var(--lp-ink); }
.rm-lp .lp-band-sky {
    background:
        radial-gradient(circle at 18% 22%, rgba(255,255,255,.05) 0 6px, transparent 7px),
        radial-gradient(circle at 82% 16%, rgba(255,255,255,.04) 0 5px, transparent 6px),
        linear-gradient(180deg, #2a4fb0 0%, #3a6ad6 55%, #2b5ac0 100%);
}
/* solid ground strip capping every band bottom */
.rm-lp .lp-band::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 14px;
    background: repeating-linear-gradient(90deg, var(--lp-ground) 0 30px, #a83e08 30px 32px);
    border-top: 4px solid var(--lp-ground-2);
}
.rm-lp .lp-band-dark::after {
    background: repeating-linear-gradient(90deg, #6a4422 0 30px, #523218 30px 32px);
    border-top: 4px solid #8a5a2c;
}

/* ---- per-band floating decor layer (behind content: z-1, content is z-10) ---- */
.rm-lp .lp-band-deco {
    position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none;
}
.rm-lp .lp-band-deco > span { position: absolute; image-rendering: pixelated; will-change: transform; }
/* keep decor from crowding the text on dark bands (lower contrast there) */
.rm-lp .lp-band-dark .lp-band-deco { opacity: .5; }
.rm-lp .lp-band-sky  .lp-band-deco { opacity: .6; }

/* pixel cloud (box-shadow puffs) — drifts across then loops */
.rm-lp .bd-cloud {
    width: 26px; height: 10px; background: #fff; border-radius: 6px;
    box-shadow: 14px -6px 0 0 #fff, 30px 0 0 0 #fff, -2px 0 0 0 #fff;
    animation: lp-drift 30s linear infinite;
}
/* ? question block (bobbing) */
.rm-lp .bd-qblock {
    width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
    font-family: 'Press Start 2P', monospace; font-size: 12px; color: #7a4d00;
    background: var(--lp-coin); border: 3px solid #000; border-radius: 3px;
    box-shadow: 2px 2px 0 rgba(0,0,0,.4); animation: lp-bob 3s ease-in-out infinite;
}
/* brick block */
.rm-lp .bd-brick {
    width: 26px; height: 26px; background: #b86a2c; border: 3px solid #000;
    box-shadow: inset 0 0 0 2px #7a3d12, 2px 2px 0 rgba(0,0,0,.4);
    animation: lp-bob 3.2s ease-in-out infinite;
}
/* spinning coin */
.rm-lp .bd-coin {
    width: 14px; height: 18px; background: #fde36a; border: 2px solid #b56f00; border-radius: 4px;
    box-shadow: 0 0 0 1.5px #000; animation: lp-spin 1.6s steps(8) infinite;
}
/* star */
.rm-lp .bd-star {
    width: 20px; height: 20px; background: var(--lp-coin);
    clip-path: polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
    filter: drop-shadow(1px 1px 0 rgba(0,0,0,.4)); animation: lp-bob 2.6s ease-in-out infinite;
}
/* green pipe (pinned near the ground strip) */
.rm-lp .bd-pipe {
    width: 42px; height: 52px; background: var(--lp-green); border: 3px solid #000;
    box-shadow: inset -7px 0 0 rgba(0,0,0,.18), inset 7px 0 0 rgba(255,255,255,.22);
}
.rm-lp .bd-pipe::before {
    content: ''; position: absolute; top: -9px; left: -6px; right: -6px; height: 12px;
    background: var(--lp-green); border: 3px solid #000;
}
/* walking goomba */
.rm-lp .bd-goomba {
    width: 26px; height: 22px; background: #9a5a2a; border: 3px solid #000;
    border-radius: 13px 13px 4px 4px; animation: lp-walk 3s ease-in-out infinite;
}
.rm-lp .bd-goomba::before, .rm-lp .bd-goomba::after { content: ''; position: absolute; top: 8px; width: 4px; height: 5px; background: #fff; }
.rm-lp .bd-goomba::before { left: 5px; } .rm-lp .bd-goomba::after { right: 5px; }
/* distant green hill */
.rm-lp .bd-hill { width: 120px; height: 64px; background: #3a8a3a; border-radius: 64px 64px 0 0; opacity: .6; }

/* respect reduced-motion: freeze the decor animations */
@media (prefers-reduced-motion: reduce) {
    .rm-lp .lp-band-deco > span { animation: none !important; }
}

.rm-lp .lp-eyebrow {
    display: inline-block; font-family: 'Press Start 2P', monospace; font-size: 8px; letter-spacing: 2px;
    color: #000; background: var(--lp-coin); border: 3px solid #000; border-radius: 3px;
    padding: 6px 10px; box-shadow: 3px 3px 0 rgba(0,0,0,.4);
}

/* ---- keunggulan cards ---- */
.rm-lp .lp-card {
    position: relative; background: var(--lp-panel); border: 4px solid #000;
    box-shadow: 6px 6px 0 rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.05);
    padding: 26px 22px; transition: transform .2s;
}
.rm-lp .lp-card:hover { transform: translateY(-4px); }
.rm-lp .lp-card-hero { background: linear-gradient(180deg, #241a44, #15102a); border-color: #000; box-shadow: 6px 6px 0 rgba(0,0,0,.55), inset 0 0 0 2px var(--lp-coin); }
.rm-lp .lp-feat-ico {
    width: 48px; height: 48px; flex: 0 0 48px; display: inline-flex; align-items: center; justify-content: center;
    font-size: 24px; background: rgba(0,0,0,.3); border: 3px solid #000; border-radius: 4px; box-shadow: 2px 2px 0 rgba(0,0,0,.4);
}
.rm-lp .lp-tag {
    font-family: 'Press Start 2P', monospace; font-size: 7px; letter-spacing: 1px; color: #000;
    background: var(--lp-coin); border: 2px solid #000; padding: 5px 8px; border-radius: 3px; box-shadow: 2px 2px 0 rgba(0,0,0,.4);
}

/* ---- pill filter ---- */
.rm-lp .lp-pill {
    color: #fff; background: rgba(14,14,26,.55); border: 3px solid #000; border-radius: 3px;
    box-shadow: 0 3px 0 rgba(0,0,0,.5); line-height: 1.5;
}
.rm-lp .lp-pill:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,.5); }
.rm-lp .lp-pill.is-active { background: var(--lp-coin); color: #000; }

/* ---- theme cards ---- */
.rm-lp .lp-theme {
    overflow: hidden; background: var(--lp-panel); border: 4px solid #000;
    box-shadow: 5px 5px 0 rgba(0,0,0,.5); transition: transform .3s;
}
.rm-lp .lp-theme:hover { transform: translateY(-4px); }
.rm-lp .lp-theme-tag {
    position: absolute; top: 8px; right: 8px; font-family: 'Press Start 2P', monospace; font-size: 7px;
    letter-spacing: 1px; text-transform: uppercase; color: #000; background: var(--lp-coin);
    border: 2px solid #000; padding: 4px 7px; border-radius: 3px; box-shadow: 2px 2px 0 rgba(0,0,0,.4);
    z-index: 3;
}
/* Warna badge dibedakan per jenis plan: basic=biru, pro=emas, premium=merah.
   (default di atas = emas, jadi pro tak perlu override.) */
.rm-lp .lp-theme-tag.is-basic   { background: var(--lp-sky); color: #fff; }
.rm-lp .lp-theme-tag.is-pro     { background: var(--lp-coin); color: #000; }
.rm-lp .lp-theme-tag.is-premium { background: var(--lp-red); color: #fff; }

/* ---- PLAYABLE deluxe theme card (the "wow" tier) ----
   Highlight WITHOUT changing the card's box size, so the grid stays aligned:
   the glowing coin frame lives on the inner image (clipped, no spill), the
   ribbon sits inside the top-left, and only a lift on hover — no scale. */
.rm-lp .lp-theme-playable {
    border-color: var(--lp-coin);
    box-shadow: 5px 5px 0 rgba(0,0,0,.5), 0 0 18px rgba(250,192,0,.5);
    animation: lp-playglow 1.8s ease-in-out infinite;
}
.rm-lp .lp-theme-playable:hover { transform: translateY(-6px); }
@keyframes lp-playglow {
    0%, 100% { box-shadow: 5px 5px 0 rgba(0,0,0,.5), 0 0 14px rgba(250,192,0,.4); }
    50%      { box-shadow: 5px 5px 0 rgba(0,0,0,.5), 0 0 26px rgba(250,192,0,.8); }
}
/* PLAYABLE ribbon — sits at the top-right, directly BELOW the plan tag (which
   keeps its usual top-right spot), so the two badges stack neatly on one side. */
.rm-lp .lp-play-ribbon {
    position: absolute; top: 30px; right: 8px; z-index: 4;
    font-family: 'Press Start 2P', monospace; font-size: 7px; letter-spacing: 1px; white-space: nowrap;
    color: #000; background: var(--lp-green); border: 2px solid #000;
    padding: 4px 7px; border-radius: 3px; box-shadow: 2px 2px 0 rgba(0,0,0,.45);
    text-shadow: none;
}

/* ---- pricing ---- */
.rm-lp .lp-price {
    background: var(--lp-panel); border: 4px solid #000; box-shadow: 6px 6px 0 rgba(0,0,0,.5);
    padding: 32px 28px; transition: transform .3s;
}
.rm-lp .lp-price:not(.lp-price-best):hover { transform: translateY(-4px); }
.rm-lp .lp-price-best {
    background: linear-gradient(180deg, #241a44, #15102a);
    box-shadow: 6px 6px 0 rgba(0,0,0,.55), 0 0 0 4px var(--lp-coin), inset 0 0 0 2px rgba(255,255,255,.06);
}
@media (min-width: 1024px) { .rm-lp .lp-price-best { transform: translateY(-8px) scale(1.03); } }
.rm-lp .lp-best-tag {
    position: absolute; top: 0; left: 50%; transform: translate(-50%,-55%);
    font-family: 'Press Start 2P', monospace; font-size: 8px; letter-spacing: 1px; color: #000;
    background: var(--lp-coin); border: 3px solid #000; padding: 7px 12px; border-radius: 3px;
    box-shadow: 3px 3px 0 rgba(0,0,0,.4); white-space: nowrap;
}
.rm-lp .lp-divider { height: 3px; background: repeating-linear-gradient(90deg, rgba(255,255,255,.25) 0 6px, transparent 6px 12px); }
.rm-lp .lp-check {
    width: 16px; height: 16px; flex: 0 0 16px; background: var(--lp-green); border: 2px solid #000; border-radius: 3px; position: relative;
}
.rm-lp .lp-check::after {
    content: ''; position: absolute; left: 4px; top: 1px; width: 4px; height: 8px;
    border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg);
}

/* ---- feature list (power-ups) ---- */
.rm-lp .lp-list {
    background: var(--lp-panel); border: 4px solid #000; box-shadow: 6px 6px 0 rgba(0,0,0,.5);
    padding: 4px 22px;
}
.rm-lp .lp-list-item + .lp-list-item { border-top: 3px dashed rgba(255,255,255,.14); }
.rm-lp .lp-qmark {
    width: 46px; height: 46px; flex: 0 0 46px; display: inline-flex; align-items: center; justify-content: center;
    font-family: 'Press Start 2P', monospace; font-size: 18px; color: #7a4d00;
    background: var(--lp-coin); border: 3px solid #000; border-radius: 4px;
    box-shadow: inset 0 0 0 3px var(--lp-coin-deep), 2px 2px 0 rgba(0,0,0,.4);
}

/* ---- testimonials ---- */
.rm-lp .lp-testi {
    background: var(--lp-panel); border: 4px solid #000; box-shadow: 5px 5px 0 rgba(0,0,0,.5);
    padding: 26px 22px; transition: transform .3s;
}
.rm-lp .lp-testi-hi { background: linear-gradient(180deg, #241a44, #15102a); box-shadow: 5px 5px 0 rgba(0,0,0,.55), inset 0 0 0 2px var(--lp-coin); }
.rm-lp .lp-avatar {
    width: 46px; height: 46px; flex: 0 0 46px; display: flex; align-items: center; justify-content: center;
    font-family: 'Press Start 2P', monospace; font-size: 10px; color: #000;
    background: var(--lp-coin); border: 3px solid #000; border-radius: 3px; box-shadow: 2px 2px 0 rgba(0,0,0,.4);
}
.rm-lp .lp-nav-btn {
    width: 44px; height: 44px; background: var(--lp-coin); border: 3px solid #000; color: #000; cursor: pointer;
    box-shadow: 0 4px 0 var(--lp-coin-deep); display: flex; align-items: center; justify-content: center; z-index: 2;
    transition: transform .1s, box-shadow .1s;
}
@media (min-width: 1024px) { .rm-lp .lp-nav-btn { width: 54px; height: 54px; } }
.rm-lp .lp-nav-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--lp-coin-deep); }
.rm-lp .lp-dot-nav { width: 12px; height: 12px; background: rgba(255,255,255,.25); border: 2px solid #000; transition: all .2s; }
.rm-lp .lp-dot-nav.is-active { width: 28px; background: var(--lp-coin); }

/* ---- FAQ ---- */
.rm-lp .lp-faq { background: var(--lp-panel); border: 3px solid #000; box-shadow: 4px 4px 0 rgba(0,0,0,.45); transition: border-color .2s; }
.rm-lp .lp-faq.is-open { border-color: var(--lp-coin); box-shadow: 4px 4px 0 rgba(0,0,0,.45), inset 0 0 0 2px rgba(250,192,0,.2); }

/* ---- CTA ---- */
.rm-lp .lp-cta {
    background: linear-gradient(180deg, #241a44, #120e26); border: 4px solid #000;
    box-shadow: 8px 8px 0 rgba(0,0,0,.5), 0 0 0 4px var(--lp-coin);
}
.rm-lp .lp-cta-deco { position: absolute; inset: 0; pointer-events: none; }
.rm-lp .lp-cta-deco .lp-coin.co1 { top: 20%; left: 8%; }
.rm-lp .lp-cta-deco .lp-coin.co2 { bottom: 24%; right: 10%; }
.rm-lp .lp-cta-deco .lp-qblock.d1 { top: 60%; left: 12%; opacity: .5; }

/* ---- footer ---- */
.rm-lp .lp-footer { background: #08060f; border-top: 4px solid #000; }
.rm-lp .lp-social {
    width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; color: #fff;
    background: rgba(255,255,255,.06); border: 3px solid #000; border-radius: 3px;
    box-shadow: 0 3px 0 rgba(0,0,0,.5); transition: all .15s;
}
.rm-lp .lp-social:hover { background: var(--lp-coin); color: #000; transform: translateY(-2px); }

/* ---- loading coin ---- */
.rm-lp .lp-coin-spin {
    width: 40px; height: 52px; background: var(--lp-coin); border: 4px solid #000; border-radius: 6px;
    box-shadow: inset 0 0 0 4px var(--lp-coin-deep); animation: lp-spin .8s steps(6) infinite;
}

/* ---- animations ---- */
@keyframes lp-drift { from { transform: translateX(0); } to { transform: translateX(150vw); } }
@keyframes lp-bob { 50% { transform: translateY(-6px); } }
@keyframes lp-spin { 50% { transform: scaleX(.15); } }
@keyframes lp-blink { 50% { opacity: .3; } }
@keyframes lp-walk { 50% { transform: translateX(24px) scaleX(-1); } }
.rm-lp .lp-bob { animation: lp-bob 2.6s ease-in-out infinite; }
.rm-lp .lp-blink { animation: lp-blink 1.1s steps(2) infinite; }
.rm-lp .lp-blink-soft { animation: lp-blink 1.6s steps(2) infinite; }

.rm-lp .no-scrollbar::-webkit-scrollbar { display: none; }
.rm-lp .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
    );
}
