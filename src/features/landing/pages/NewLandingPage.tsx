import { useState, useEffect, useMemo } from 'react';
import { 
    HiOutlineArrowRight, 
    HiOutlineCheck, 
    HiOutlineSparkles, 
    HiOutlineDeviceMobile, 
    HiOutlineCloudUpload, 
    HiOutlineGlobeAlt, 
    HiOutlineMail,
    HiOutlineStar,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineChatAlt,
    HiOutlineCalendar,
    HiOutlineLocationMarker
} from 'react-icons/hi';
import { FaInstagram, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { publicApi } from '@/core/api/endpoints';
import { Theme, MstPlanType, MstPlanFeature, WebsiteConfig, ReviewAndRating, MstAdditionalFeature } from '@/types';

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
    const [activeThemeCategory, setActiveThemeCategory] = useState<string>('All');
    const [reviewIndex, setReviewIndex] = useState(0);

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

                if (configRes.success) {
                    setConfig(configRes.data);
                    setReviews(configRes.data.reviews || []);
                    setAdditionalFeatures(configRes.data.features || []);

                    // Update Favicon
                    if (configRes.data.site_logo) {
                        const { fetchProxyImageBase64 } = await import('@/shared/components/ProxyImage');
                        const resolvedLogo = await fetchProxyImageBase64(configRes.data.site_logo);
                        let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                        if (!favicon) {
                            favicon = document.createElement('link');
                            favicon.rel = 'icon';
                            document.head.appendChild(favicon);
                        }
                        favicon.href = resolvedLogo;
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

    // Theme Grouping
    const themeCategories = useMemo(() => {
        const categories = Array.from(new Set(themes.map(t => t.style_category || 'Modern')));
        return ['All', ...categories];
    }, [themes]);

    const filteredThemes = useMemo(() => {
        if (activeThemeCategory === 'All') return themes;
        return themes.filter(t => t.style_category === activeThemeCategory);
    }, [themes, activeThemeCategory]);

    // Review Auto-slide
    useEffect(() => {
        if (reviews.length === 0) return;
        const timer = setInterval(() => {
            setReviewIndex(prev => (prev + 1) % reviews.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [reviews]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Menyiapkan Pengalaman Premium...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 selection:bg-gold-500/30 selection:text-gold-900 overflow-x-hidden">
            {/* Elegant Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'bg-white/70 dark:bg-gray-950/70 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 py-3' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-gold-600 to-gold-400 rounded-xl flex items-center justify-center text-white shadow-xl shadow-gold-500/20 transform rotate-3">
                            <HiOutlineSparkles className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                                {config?.site_name || 'WEDDING SAAS'}
                            </span>
                            <span className="text-[10px] font-bold text-gold-600 uppercase tracking-[0.2em]">Platform No. 1</span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-10">
                        {['Fitur', 'Tema', 'Harga', 'Testimoni'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-[13px] font-bold uppercase tracking-widest hover:text-gold-500 transition-colors relative group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gold-500 transition-all group-hover:w-full"></span>
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/login" className="hidden sm:block text-sm font-bold text-gray-500 hover:text-gold-500">MASUK</Link>
                        <Link to="/register" className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 px-6 rounded-full text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform active:scale-95">
                            DAFTAR
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Premium Hero Section */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/wedding_saas_hero.png" 
                        alt="Hero background" 
                        className="w-full h-full object-cover opacity-10 dark:opacity-20 scale-110 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white dark:from-gray-950 dark:via-gray-950/80 dark:to-gray-950"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8 text-center lg:text-left">
                            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gold-50 dark:bg-gold-950/30 border border-gold-200/50 dark:border-gold-800/50 text-gold-600 dark:text-gold-400 text-[10px] font-black uppercase tracking-[0.3em] animate-fade-in-up">
                                <span className="w-2 h-2 rounded-full bg-gold-500 animate-ping"></span>
                                Digital Wedding Platform
                            </div>
                            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] dark:text-white">
                                {config?.tagline || 'Momen Spesial,'} <br />
                                <span className="text-gradient-gold">Berkelas.</span>
                            </h1>
                            <p className="text-lg lg:text-xl text-gray-500 dark:text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                                {config?.site_description || 'Buat undangan digital impian Anda dengan platform tercanggih. Mewah, praktis, dan elegan.'}
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start">
                                <Link to="/register" className="w-full sm:w-auto px-10 py-5 bg-gold-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gold-700 shadow-2xl shadow-gold-500/30 transition-all hover:-translate-y-1">
                                    Mulai Sekarang
                                </Link>
                                <a href="#tema" className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm">
                                    Lihat Tema
                                </a>
                            </div>
                            
                            {/* Trust Badge */}
                            <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
                                <div className="text-center lg:text-left">
                                    <div className="text-2xl font-black text-gray-900 dark:text-white">50k+</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Happy Couples</div>
                                </div>
                                <div className="w-px h-10 bg-gray-200 dark:bg-gray-800"></div>
                                <div className="text-center lg:text-left">
                                    <div className="text-2xl font-black text-gray-900 dark:text-white">100+</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Premium Themes</div>
                                </div>
                            </div>
                        </div>

                        <div className="hidden lg:block relative">
                            <div className="absolute -inset-4 bg-gold-500/10 blur-[100px] rounded-full"></div>
                            <img 
                                src="/wedding_saas_hero.png" 
                                alt="Dashboard Mobile" 
                                className="relative z-10 w-[80%] mx-auto rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] border-white dark:border-gray-800 transform rotate-2 hover:rotate-0 transition-transform duration-1000"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Themes Section - Grouped by Style */}
            <section id="tema" className="py-24 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                        <div className="max-w-xl">
                            <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Eksplorasi Kreativitas</div>
                            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter dark:text-white leading-tight">
                                Pilih Gaya Undangan <span className="text-gradient-gold">Impian Anda</span>
                            </h2>
                        </div>
                        
                        {/* Style Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {themeCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveThemeCategory(cat)}
                                    className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeThemeCategory === cat ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        {filteredThemes.length > 0 ? filteredThemes.map((theme) => (
                            <div key={theme.id} className="group relative overflow-hidden rounded-[2rem] bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition-all duration-700">
                                <div className="aspect-[3/4] overflow-hidden relative">
                                    <img 
                                        src={theme.preview_image || `https://placehold.co/600x800?text=${theme.name}`} 
                                        alt={theme.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
                                        <button className="bg-white text-gray-900 px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transform translate-y-10 group-hover:translate-y-0 transition-transform duration-500">
                                            Preview Tema
                                        </button>
                                    </div>
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-gold-600 shadow-xl">
                                        {theme.plan_type}
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-xl font-black mb-1 dark:text-white">{theme.name}</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{theme.style_category || 'Modern Style'}</p>
                                </div>
                            </div>
                        )) : (
                             // Dummy Themes if empty
                             [1,2,3].map(i => (
                                <div key={i} className="group relative overflow-hidden rounded-[2rem] bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 animate-pulse">
                                    <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800"></div>
                                    <div className="p-8 space-y-3">
                                        <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                    </div>
                                </div>
                             ))
                        )}
                    </div>
                </div>
            </section>

            {/* Additional Features - Bento Grid */}
            <section id="fitur" className="py-24 bg-gray-50 dark:bg-gray-900/50">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Fitur Tanpa Batas</div>
                        <h2 className="text-4xl lg:text-6xl font-black tracking-tighter dark:text-white leading-none mb-6">
                            Lebih Dari Sekadar <br /> <span className="text-gradient-gold">Undangan Biasa</span>
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Layanan eksklusif yang dirancang untuk memudahkan manajemen pernikahan Anda.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {additionalFeatures.length > 0 ? additionalFeatures.map((f, i) => (
                            <div key={f.id} className={`p-10 rounded-[2.5rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-500 group ${i === 1 ? 'md:translate-y-6' : ''}`}>
                                <div className="w-16 h-16 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 text-gold-500">
                                    <HiOutlineSparkles className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-black mb-4 dark:text-white">{f.feature_name}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">{f.description || 'Fitur unggulan untuk meningkatkan pengalaman tamu undangan Anda.'}</p>
                                <div className="text-gold-600 font-black text-lg">
                                    {f.price > 0 ? `Rp ${f.price.toLocaleString()}` : 'Free'}
                                </div>
                            </div>
                        )) : (
                            // Default Features if none
                            [
                                { title: 'WhatsApp Blast', desc: 'Kirim ribuan undangan otomatis dalam sekali klik.' },
                                { title: 'Buku Tamu Digital', desc: 'Scan QR Code untuk kehadiran tamu yang lebih praktis.' },
                                { title: 'RSVP Real-time', desc: 'Pantau siapa saja yang akan hadir secara langsung.' }
                            ].map((f, i) => (
                                <div key={i} className="p-10 rounded-[2.5rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all">
                                    <div className="w-14 h-14 bg-gold-50 dark:bg-gold-900/20 rounded-2xl flex items-center justify-center mb-8 text-gold-500"><HiOutlineSparkles className="w-7 h-7" /></div>
                                    <h3 className="text-2xl font-black mb-4 dark:text-white">{f.title}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Pricing Section - High-Contrast */}
            <section id="harga" className="py-24 bg-white dark:bg-gray-950">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Investasi Kebahagiaan</div>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tighter dark:text-white">Pilih Paket Terbaik</h2>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
                        {planTypes.length > 0 ? planTypes.map((p) => (
                            <div key={p.plan_type} className={`relative p-12 rounded-[3rem] border transition-all duration-700 ${p.plan_type === 'premium' ? 'border-gold-500 bg-gray-900 text-white shadow-2xl lg:scale-110 z-10' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'}`}>
                                {p.plan_type === 'premium' && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 bg-gold-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                                        Best Choice
                                    </div>
                                )}
                                <div className="mb-10">
                                    <h3 className={`text-sm font-black uppercase tracking-[0.3em] mb-4 ${p.plan_type === 'premium' ? 'text-gold-400' : 'text-gray-400'}`}>
                                        {p.plan_type}
                                    </h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black tracking-tighter">Rp {(p.price / 1000).toFixed(0)}k</span>
                                        <span className={`text-xs font-bold ${p.plan_type === 'premium' ? 'text-gray-400' : 'text-gray-500'}`}>/lifetime</span>
                                    </div>
                                </div>
                                
                                <div className={`h-px w-full mb-10 ${p.plan_type === 'premium' ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-800'}`}></div>

                                <ul className="space-y-5 mb-12">
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

                                <Link to="/register" className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] text-center block transition-all ${p.plan_type === 'premium' ? 'bg-gold-500 text-white hover:bg-gold-600 hover:shadow-[0_20px_40px_-10px_rgba(198,167,105,0.4)]' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                    Pilih Paket
                                </Link>
                            </div>
                        )) : (
                            // Loading state for plans
                            [1,2,3].map(i => <div key={i} className="h-[500px] bg-gray-50 dark:bg-gray-900 rounded-[3rem] animate-pulse"></div>)
                        )}
                    </div>
                </div>
            </section>

            {/* Testimonials - Scrolling Carousel */}
            <section id="testimoni" className="py-24 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <div className="text-gold-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Kebahagiaan Pengguna</div>
                        <h2 className="text-4xl lg:text-5xl font-black tracking-tighter dark:text-white mb-6">Momen Berkesan Bersama Kami</h2>
                    </div>

                    <div className="relative max-w-5xl mx-auto">
                        <div className="overflow-hidden">
                            <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${reviewIndex * 100}%)` }}>
                                {reviews.length > 0 ? reviews.map((r) => (
                                    <div key={r.id} className="w-full flex-shrink-0 px-4">
                                        <div className="bg-white dark:bg-gray-800 p-12 lg:p-20 rounded-[4rem] text-center shadow-sm relative border border-gray-100 dark:border-gray-700">
                                            <HiOutlineChatAlt className="absolute top-10 left-1/2 -translate-x-1/2 w-20 h-20 text-gold-500/5" />
                                            
                                            <div className="flex items-center justify-center gap-1 mb-8">
                                                {[...Array(Number(r.rate_star))].map((_, i) => (
                                                    <HiOutlineStar key={i} className="w-6 h-6 text-gold-500 fill-current" />
                                                ))}
                                            </div>
                                            
                                            <blockquote className="text-2xl lg:text-3xl font-bold tracking-tight mb-10 dark:text-white italic leading-relaxed">
                                                "{r.comment}"
                                            </blockquote>
                                            
                                            <div className="space-y-2">
                                                <div className="text-xl font-black tracking-tighter uppercase">{r.bride_name} & {r.groom_name}</div>
                                                <div className="flex items-center justify-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1"><HiOutlineCalendar className="w-3 h-3" /> {r.wedding_date}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span className="flex items-center gap-1"><HiOutlineLocationMarker className="w-3 h-3" /> {r.alamat || 'Indonesia'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="w-full flex-shrink-0 px-4 text-center text-gray-400 italic">
                                        Belum ada ulasan publik.
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {reviews.length > 1 && (
                            <>
                                <button 
                                    onClick={() => setReviewIndex(prev => (prev - 1 + reviews.length) % reviews.length)}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-2xl border border-gray-100 dark:border-gray-700 hover:scale-110 transition-transform hidden lg:flex"
                                >
                                    <HiOutlineChevronLeft className="w-6 h-6" />
                                </button>
                                <button 
                                    onClick={() => setReviewIndex(prev => (prev + 1) % reviews.length)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-2xl border border-gray-100 dark:border-gray-700 hover:scale-110 transition-transform hidden lg:flex"
                                >
                                    <HiOutlineChevronRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer - Professional & Rich */}
            <footer className="bg-white dark:bg-gray-950 pt-24 pb-12 border-t border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-16 mb-20">
                        {/* Brand Column */}
                        <div className="lg:col-span-1 space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-white">
                                    <HiOutlineSparkles className="w-6 h-6" />
                                </div>
                                <span className="text-2xl font-black tracking-tighter">{config?.site_name || 'WEDDING SAAS'}</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                Platform pembuatan undangan digital premium terbaik di Indonesia. Abadikan setiap detik kebahagiaan Anda dengan cara yang berkelas.
                            </p>
                            <div className="flex items-center gap-4">
                                <a href={`https://instagram.com/${config?.site_instagram || 'wedding_saas'}`} className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gold-500 hover:text-white transition-all">
                                    <FaInstagram className="w-5 h-5" />
                                </a>
                                <a href={config?.site_tiktok || '#'} className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gold-500 hover:text-white transition-all">
                                    <FaTiktok className="w-4 h-4" />
                                </a>
                                <a href={config?.site_youtube || '#'} className="w-10 h-10 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gold-500 hover:text-white transition-all">
                                    <FaYoutube className="w-5 h-5" />
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-8 text-gold-600">Quick Links</h4>
                            <ul className="space-y-4">
                                {['Fitur', 'Tema', 'Harga', 'Testimoni'].map(item => (
                                    <li key={item}><a href={`#${item.toLowerCase()}`} className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{item}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Support */}
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-8 text-gold-600">Bantuan</h4>
                            <ul className="space-y-4">
                                {['FAQ', 'Tutorial', 'Kebijakan Privasi', 'Syarat & Ketentuan'].map(item => (
                                    <li key={item}><a href="#" className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{item}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="space-y-8">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-6 text-gold-600">Kontak Kami</h4>
                                <div className="space-y-4">
                                    <a href={`mailto:${config?.contact_email || 'hello@weddingsaas.com'}`} className="flex items-center gap-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                        <HiOutlineMail className="w-5 h-5 text-gold-500" />
                                        {config?.contact_email || 'hello@weddingsaas.com'}
                                    </a>
                                    <a href={`https://wa.me/${config?.contact_whatsapp || '628123456789'}`} className="flex items-center gap-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">
                                        <FaWhatsapp className="w-5 h-5 text-gold-500" />
                                        +{config?.contact_whatsapp || '628123456789'}
                                    </a>
                                </div>
                            </div>
                            <div className="p-6 bg-gold-50 dark:bg-gold-900/10 rounded-2xl border border-gold-100 dark:border-gold-900/50">
                                <p className="text-[11px] font-bold text-gold-800 dark:text-gold-400 leading-relaxed uppercase tracking-wider">
                                    Butuh bantuan khusus? <br /> Tim kami siap melayani Anda 24/7.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            © 2026 {config?.site_name || 'WEDDING SAAS'}. All rights reserved.
                        </p>
                        <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            <span className="hover:text-gold-500 cursor-pointer">Security</span>
                            <span className="hover:text-gold-500 cursor-pointer">Privacy</span>
                            <span className="hover:text-gold-500 cursor-pointer">Cookies</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
