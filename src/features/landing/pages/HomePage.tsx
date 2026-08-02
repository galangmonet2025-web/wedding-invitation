import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    HiOutlineChevronDown,
    HiOutlineLocationMarker,
    HiOutlineMail,
    HiOutlineMenu,
    HiOutlineX,
    HiOutlineArrowRight,
    HiOutlineCheck,
    HiOutlineExclamation,
    HiOutlineExternalLink,
    HiOutlineRefresh,
} from 'react-icons/hi';
import { FaInstagram, FaTiktok, FaYoutube, FaWhatsapp } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { ReviewAndRating, Theme } from '@/types';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { useLandingStore } from '@/features/landing/store/landingStore';
import kosaIcon from '@/assets/img/kosa-icon.png';

/**
 * HomePage — halaman landing "putih + glass + emas".
 *
 * Arah desain sengaja BERBEDA TOTAL dari NewLandingPage (retro pixel-game):
 * di sini nilai jualnya adalah DESAIN — editorial, premium, profesional.
 * Tidak ada satu pun klaim "tema game" di halaman ini.
 *
 * Sumber data identik dengan landing lama (useLandingStore), jadi keduanya
 * bisa hidup berdampingan tanpa fetch ganda: store-nya cache per sesi.
 *
 * CATATAN DESAIN PENTING (kenapa ada lapisan orb + grain di <HomeStyles/>):
 * efek glass (backdrop-filter) TIDAK TERLIHAT di atas warna putih rata —
 * blur butuh sesuatu di belakangnya. Lapisan ambient orb + noise itulah yang
 * membuat semua panel kaca punya alasan untuk eksis. Jangan dihapus.
 */

const NAV_LINKS: Array<{ label: string; id: string }> = [
    { label: 'Koleksi', id: 'koleksi' },
    { label: 'Cara Kerja', id: 'cara-kerja' },
    { label: 'Fitur', id: 'fitur' },
    { label: 'Harga', id: 'harga' },
    { label: 'Testimoni', id: 'testimoni' },
    { label: 'FAQ', id: 'faq' },
];

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
    {
        q: 'Apakah metode pembayarannya aman?',
        a: 'Sangat aman. Kami menggunakan sistem pembayaran otomatis melalui Midtrans yang mendukung berbagai metode pembayaran seperti Transfer Bank, QRIS, dan E-Wallet (GoPay, OVO, Dana) dengan verifikasi instan.\n\nSelain itu, kami juga menyediakan pembayaran melalui Shopee. Namun, metode ini hanya tersedia untuk pembelian undangan. Untuk pembelian fitur tambahan (additional feature), pembayaran tetap dilakukan melalui Midtrans di website kami.',
    },
    {
        q: 'Apakah undangan bisa dikustomisasi?',
        a: 'Tentu. Nama, tanggal acara, foto, tema, serta seluruh konten undangan dapat disesuaikan sepenuhnya melalui editor visual yang mudah digunakan.',
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
    {
        q: 'Berapa lama undangan saya aktif?',
        a: 'Undangan Anda tetap dapat diakses tamu setelah dipublikasikan, dan seluruh data — ucapan, konfirmasi kehadiran, hingga catatan hadiah — tersimpan rapi di dashboard sehingga bisa Anda tinjau kembali kapan saja.',
    },
];

// Jumlah minimum ulasan publik agar data asli dipakai. Di bawah ini,
// section testimoni jatuh ke set kurasi di bawah.
const MIN_REAL_REVIEWS = 3;

// Ulasan kurasi — hanya tampil bila DB punya < MIN_REAL_REVIEWS ulasan.
// Tiap ulasan menyorot SATU fitur yang benar-benar ada di platform ini.
const DUMMY_REVIEWS: Array<Pick<ReviewAndRating, 'id' | 'comment' | 'rate_star' | 'bride_name' | 'groom_name' | 'wedding_date' | 'alamat'>> = [
    { id: 'd1', rate_star: 5, comment: 'Desainnya benar-benar di luar dugaan. Banyak tamu mengira kami menyewa studio khusus untuk membuatnya. Kesan pertama undangan ini terasa sangat mahal.', bride_name: 'Anissa', groom_name: 'Rizky', wedding_date: '2025', alamat: 'Jakarta' },
    { id: 'd2', rate_star: 5, comment: 'Tiap tamu dapat tautan undangan personal, jadi begitu dibuka langsung muncul namanya. Mereka merasa benar-benar diundang secara khusus. Sentuhan kecil yang berkesan.', bride_name: 'Dinda', groom_name: 'Fadil', wedding_date: '2025', alamat: 'Surabaya' },
    { id: 'd3', rate_star: 5, comment: 'RSVP real-time-nya sangat membantu. Kami bisa pantau dari dashboard siapa yang konfirmasi hadir, jadi estimasi katering jauh lebih akurat. Tidak ada lagi tebak-tebakan.', bride_name: 'Nisa', groom_name: 'Maulana', wedding_date: '2025', alamat: 'Bandung' },
    { id: 'd4', rate_star: 5, comment: 'Scan QR Code di pintu masuk membuat check-in tamu sangat cepat dan rapi. Penerima tamu tinggal memindai, langsung tercatat siapa yang sudah datang.', bride_name: 'Sari', groom_name: 'Bagus', wedding_date: '2025', alamat: 'Yogyakarta' },
    { id: 'd5', rate_star: 5, comment: 'Amplop digital dan QRIS-nya memudahkan tamu yang ingin mengirim hadiah. Semua nominal yang masuk otomatis tercatat rapi dan bisa kami ekspor. Transparan.', bride_name: 'Putri', groom_name: 'Arif', wedding_date: '2025', alamat: 'Semarang' },
    { id: 'd6', rate_star: 5, comment: 'Buku ucapan digitalnya menjadi kenang-kenangan paling berharga. Doa dan ucapan dari semua tamu tersimpan dan bisa kami baca ulang kapan saja.', bride_name: 'Maya', groom_name: 'Doni', wedding_date: '2024', alamat: 'Medan' },
    { id: 'd7', rate_star: 5, comment: 'Berkat fitur live streaming, keluarga kami yang di luar kota dan luar negeri tetap bisa menyaksikan akad secara langsung. Momen sakral itu bisa dibagi ke semua.', bride_name: 'Intan', groom_name: 'Yoga', wedding_date: '2025', alamat: 'Balikpapan' },
    { id: 'd8', rate_star: 5, comment: 'Galeri foto pre-wedding dengan iringan musiknya membuat undangan terasa hidup dan elegan. Banyak tamu bilang ini undangan digital tercantik yang pernah mereka buka.', bride_name: 'Lia', groom_name: 'Hendra', wedding_date: '2024', alamat: 'Makassar' },
    { id: 'd9', rate_star: 5, comment: 'Daftar tamu langsung kami impor dari Google Contacts, jadi tidak perlu mengetik satu per satu. Hitung mundur menuju hari H di undangannya juga membuat tamu makin antusias.', bride_name: 'Rara', groom_name: 'Andi', wedding_date: '2025', alamat: 'Malang' },
    { id: 'd10', rate_star: 5, comment: 'Pilihan temanya banyak dan semuanya terasa mewah. Kami sempat mencoba beberapa lewat fitur pratinjau sebelum memutuskan. Hasil akhirnya sesuai dengan konsep pernikahan kami.', bride_name: 'Fitri', groom_name: 'Galih', wedding_date: '2024', alamat: 'Bekasi' },
];

// Tiga langkah "cara kerja" — menurunkan kecemasan "susah nggak sih".
const STEPS: Array<{ title: string; desc: string }> = [
    { title: 'Pilih Desain', desc: 'Telusuri koleksi tema yang dikurasi. Lihat pratinjau langsung sebelum memutuskan — tanpa perlu mendaftar terlebih dahulu.' },
    { title: 'Sesuaikan Isi', desc: 'Lengkapi data mempelai, jadwal akad dan resepsi, galeri foto, cerita cinta, hingga iringan musik lewat editor visual.' },
    { title: 'Sebar & Pantau', desc: 'Kirim tautan personal ke setiap tamu melalui WhatsApp, lalu pantau konfirmasi kehadiran dan ucapan dari satu dashboard.' },
];

// Kelompok fitur — mengikuti pola "kategori, bukan daftar datar" agar terbaca
// sebagai kapabilitas produk, bukan checklist panjang.
const FEATURE_GROUPS: Array<{ eyebrow: string; title: string; desc: string; points: string[] }> = [
    {
        eyebrow: 'Distribusi',
        title: 'Undangan personal, terkirim otomatis',
        desc: 'Setiap tamu menerima tautan miliknya sendiri — begitu dibuka, namanya langsung tertulis di halaman pembuka. Susun templat pesan sekali, lalu sebarkan ke seluruh daftar tamu melalui WhatsApp.',
        points: ['Tautan personal per tamu', 'Templat pesan WhatsApp', 'Impor dari Google Contacts', 'Berbagi tautan umum'],
    },
    {
        eyebrow: 'Manajemen Tamu',
        title: 'Satu dashboard untuk seluruh daftar tamu',
        desc: 'Kelola ratusan nama tanpa spreadsheet terpisah. Konfirmasi kehadiran masuk secara real-time, sehingga estimasi katering dan tempat duduk jauh lebih akurat.',
        points: ['RSVP real-time', 'Impor CSV & Kontak', 'Pengelompokan tamu', 'Ekspor data'],
    },
    {
        eyebrow: 'Hari Pelaksanaan',
        title: 'Check-in tamu cukup dengan pindai',
        desc: 'Setiap tamu memiliki QR Code, baik yang diundang khusus maupun tamu umum. Penerima tamu tinggal memindai di pintu masuk dan kehadiran langsung tercatat — antrean berkurang, data tetap rapi.',
        points: ['Pemindai QR bawaan', 'Catatan kehadiran langsung', 'Akses untuk petugas', 'Rekap kehadiran'],
    },
    {
        eyebrow: 'Interaksi Tamu',
        title: 'Ucapan, hadiah, dan kenangan tersimpan',
        desc: 'Tamu dapat menuliskan doa, mengirim hadiah lewat transfer atau QRIS, dan menyaksikan momen akad dari mana saja. Semua yang masuk tercatat otomatis di dashboard Anda.',
        points: ['Buku ucapan digital', 'Amplop digital & QRIS', 'Live streaming', 'Rekap hadiah'],
    },
];

export function HomePage() {
    // Data dari cache sesi (Zustand) — sama persis dengan landing lama.
    const config = useLandingStore(s => s.config);
    const themes = useLandingStore(s => s.themes);
    const landingLoaded = useLandingStore(s => s.loaded);
    const planTypes = useLandingStore(s => s.planTypes);
    const planFeatures = useLandingStore(s => s.planFeatures);
    const reviews = useLandingStore(s => s.reviews);
    const additionalFeatures = useLandingStore(s => s.additionalFeatures);
    const logoUrl = useLandingStore(s => s.logoUrl);
    const fetchAll = useLandingStore(s => s.fetchAll);

    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeThemeCategory, setActiveThemeCategory] = useState<string>('Semua');
    const [openFaq, setOpenFaq] = useState<number | null>(0);
    // Kode tema yang sedang dibuka di overlay pratinjau (null = tertutup).
    const [previewCode, setPreviewCode] = useState<string | null>(null);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Pulihkan posisi gulir saat kembali dari halaman tema (/#/tema/:kode).
    // Data sudah di cache store, jadi tanpa ini halaman memang tampil instan
    // tapi melompat ke atas — yang terasa seperti "memuat ulang".
    // Disimpan di sessionStorage supaya bertahan melewati unmount komponen.
    useEffect(() => {
        const KEY = 'hp-scroll';
        const saved = Number(sessionStorage.getItem(KEY) || '0');
        if (saved > 0) {
            // Dua rAF: tunggu sampai layout selesai supaya tinggi halaman sudah
            // final; kalau langsung, target scroll belum ada dan gagal senyap.
            requestAnimationFrame(() => requestAnimationFrame(() => {
                window.scrollTo(0, saved);
            }));
        }
        const save = () => sessionStorage.setItem(KEY, String(window.scrollY));
        window.addEventListener('scroll', save, { passive: true });
        return () => { save(); window.removeEventListener('scroll', save); };
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Kunci scroll body selama menu mobile terbuka.
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    // Kategori tema dibangun DINAMIS dari kategori yang benar-benar ada di DB.
    // Tema tanpa kategori hanya muncul di tab "Semua", jadi tab tak pernah kosong.
    const themeCategories = useMemo(() => {
        const cats = Array.from(new Set(
            themes.map(t => (t.style_category || '').trim()).filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, 'id'));
        return ['Semua', ...cats];
    }, [themes]);

    const filteredThemes = useMemo(() => {
        if (activeThemeCategory === 'Semua') return themes;
        return themes.filter(t => (t.style_category || '').trim() === activeThemeCategory);
    }, [themes, activeThemeCategory]);

    // Urutkan kartu harga: premium di tengah (desktop), teratas di mobile.
    const orderedPlans = useMemo(() => {
        const order: Record<string, number> = { pro: 0, premium: 1, basic: 2 };
        return [...planTypes].sort((a, b) => (order[a.plan_type] ?? 9) - (order[b.plan_type] ?? 9));
    }, [planTypes]);

    const displayReviews = useMemo(
        () => (reviews.length >= MIN_REAL_REVIEWS ? reviews : DUMMY_REVIEWS),
        [reviews]
    );

    // Rata-rata rating dari ulasan publik ASLI saja (null bila belum ada).
    const avgRating = useMemo(() => {
        const rated = reviews.map(r => Number(r.rate_star)).filter(n => n > 0);
        if (!rated.length) return null;
        return (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1);
    }, [reviews]);

    // Scroll halus ke section TANPA mengubah hash URL (aplikasi pakai HashRouter,
    // jadi #anchor sungguhan akan membajak route).
    const scrollToSection = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setMenuOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const siteName = config?.site_name || 'Kosa Invitation';

    // Tema unggulan untuk panel kaca di hero (maks 3, hanya yang punya gambar).
    const heroThemes = useMemo(
        () => themes.filter(t => t.preview_image).slice(0, 3),
        [themes]
    );

    return (
        <div className="hp-root">
            <HomeStyles />
            <HomeBackdrop />
            <ScrollReveal />

            {/* ══════════════════ NAV ══════════════════ */}
            <header className={`hp-nav ${scrolled || menuOpen ? 'is-solid' : ''}`}>
                <div className="hp-container hp-nav-inner">
                    <Link to="/home-page" className="hp-brand" onClick={() => setMenuOpen(false)}>
                        <span className="hp-brand-mark">
                            <img src={logoUrl || kosaIcon} alt="" />
                        </span>
                        <span className="hp-brand-text">
                            <span className="hp-brand-name">{siteName}</span>
                            <span className="hp-brand-sub">Undangan Digital</span>
                        </span>
                    </Link>

                    <nav className="hp-nav-links">
                        {NAV_LINKS.map(l => (
                            <a key={l.id} href={`#${l.id}`} onClick={e => scrollToSection(e, l.id)}>{l.label}</a>
                        ))}
                    </nav>

                    <div className="hp-nav-actions">
                        <Link to="/login" className="hp-nav-login">Masuk</Link>
                        <Link to="/register" className="hp-btn hp-btn-primary hp-btn-sm">Mulai Sekarang</Link>
                        <button
                            className="hp-burger"
                            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen(o => !o)}
                        >
                            {menuOpen ? <HiOutlineX /> : <HiOutlineMenu />}
                        </button>
                    </div>
                </div>

                <div className={`hp-mobile-menu ${menuOpen ? 'is-open' : ''}`}>
                    <div className="hp-container">
                        {NAV_LINKS.map(l => (
                            <a key={l.id} href={`#${l.id}`} onClick={e => scrollToSection(e, l.id)}>{l.label}</a>
                        ))}
                        <Link to="/login" onClick={() => setMenuOpen(false)}>Masuk</Link>
                    </div>
                </div>
            </header>

            {/* ══════════════════ HERO ══════════════════ */}
            <section className="hp-hero">
                <div className="hp-container hp-hero-grid">
                    <div className="hp-hero-copy">
                        <p className="hp-eyebrow" data-reveal>Undangan Pernikahan Digital</p>
                        <h1 className="hp-hero-title" data-reveal data-reveal-delay="1">
                            {config?.tagline
                                ? config.tagline
                                : <>Undangan yang<br /><em>seindah</em> hari Anda</>}
                        </h1>
                        <p className="hp-hero-lead" data-reveal data-reveal-delay="2">
                            {config?.site_description
                                || 'Desain yang dirancang dengan cermat, disusun rapi dalam hitungan menit, dan siap dibagikan ke setiap tamu — lengkap dengan konfirmasi kehadiran, buku ucapan, dan pencatatan hadiah.'}
                        </p>

                        <div className="hp-hero-cta" data-reveal data-reveal-delay="3">
                            <Link to="/register" className="hp-btn hp-btn-primary">
                                Mulai Sekarang <HiOutlineArrowRight />
                            </Link>
                            <a href="#koleksi" onClick={e => scrollToSection(e, 'koleksi')} className="hp-btn hp-btn-ghost">
                                Lihat Koleksi
                            </a>
                        </div>

                        <p className="hp-hero-note" data-reveal data-reveal-delay="4">
                            Pratinjau tema gratis · Bisa diubah kapan saja · Tanpa biaya tambahan untuk revisi mandiri
                        </p>
                    </div>

                    <div className="hp-hero-visual" data-reveal data-reveal-delay="2">
                        <HeroGallery themes={heroThemes} loaded={landingLoaded} />
                    </div>
                </div>
            </section>

            {/* ══════════════════ STAT STRIP (kaca, memotong batas hero) ══════════════════ */}
            <div className="hp-container">
                <div className={`hp-stats${landingLoaded ? '' : ' is-loading'}`} data-reveal aria-busy={!landingLoaded}>
                    <Stat value={`${themes.length}`} label="Tema Terkurasi" loading={!landingLoaded} />
                    <Stat value={avgRating || '5.0'} label="Rata-rata Ulasan" suffix="★" loading={!landingLoaded} />
                    <Stat value={`${reviews.length}`} label="Ulasan Pasangan" loading={!landingLoaded} />
                    {/* Angka tetap — tidak bergantung data, jadi tak perlu skeleton. */}
                    <Stat value="10" label="Menit Menyiapkan" suffix="mnt" />
                </div>
            </div>

            {/* ══════════════════ KOLEKSI TEMA ══════════════════ */}
            <section id="koleksi" className="hp-section">
                <div className="hp-container">
                    <div className="hp-section-head">
                        <div>
                            <p className="hp-eyebrow" data-reveal>Koleksi</p>
                            <h2 className="hp-h2" data-reveal data-reveal-delay="1">
                                Setiap tema dirancang<br />sebagai karya tersendiri
                            </h2>
                        </div>
                        <p className="hp-section-lead" data-reveal data-reveal-delay="2">
                            Tipografi, komposisi, dan warna disusun satu per satu — bukan hasil templat yang diulang.
                            Buka pratinjau mana pun secara langsung sebelum Anda memutuskan.
                        </p>
                    </div>

                    {themeCategories.length > 1 && (
                        <div className="hp-filter" data-reveal>
                            {themeCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveThemeCategory(cat)}
                                    className={`hp-chip ${activeThemeCategory === cat ? 'is-active' : ''}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}

                    {landingLoaded && filteredThemes.length === 0 ? (
                        <div className="hp-empty">
                            <h3>{themes.length === 0 ? 'Koleksi segera hadir' : 'Belum ada tema di kategori ini'}</h3>
                            <p>
                                {themes.length === 0
                                    ? 'Koleksi tema kami sedang disiapkan. Nantikan pilihan desain terbaru dalam waktu dekat.'
                                    : 'Silakan pilih kategori lain untuk melihat tema yang tersedia.'}
                            </p>
                        </div>
                    ) : (
                        <div className="hp-theme-grid">
                            {filteredThemes.length > 0 ? filteredThemes.map((theme, i) => {
                                // SELURUH kartu membuka OVERLAY pratinjau di halaman
                                // yang sama (tanpa pindah rute). Tema tanpa `code`
                                // belum punya pratinjau, jadi non-interaktif.
                                const card = (
                                    <>
                                        <div className="hp-theme-shot">
                                            <ProxyImage
                                                src={theme.preview_image || `https://placehold.co/450x800?text=${encodeURIComponent(theme.name)}`}
                                                alt={theme.name}
                                                loading="lazy"
                                                className="hp-theme-img"
                                            />
                                            <span className="hp-theme-plan">{theme.plan_type}</span>
                                            <div className="hp-theme-veil">
                                                {theme.code
                                                    ? <span className="hp-btn hp-btn-light hp-btn-sm">Lihat Pratinjau</span>
                                                    : <span className="hp-theme-soon">Segera Hadir</span>}
                                            </div>
                                        </div>
                                        <div className="hp-theme-meta">
                                            <h3>{theme.name}</h3>
                                            <p>{theme.style_category || 'Modern'}</p>
                                        </div>
                                    </>
                                );
                                return theme.code ? (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        onClick={() => setPreviewCode(theme.code!)}
                                        className="hp-theme is-link"
                                        aria-label={`Lihat pratinjau tema ${theme.name}`}
                                        data-reveal
                                        data-reveal-delay={String(i % 4)}
                                    >
                                        {card}
                                    </button>
                                ) : (
                                    <article key={theme.id} className="hp-theme" data-reveal data-reveal-delay={String(i % 4)}>
                                        {card}
                                    </article>
                                );
                            }) : (
                                [0, 1, 2, 3, 4].map(i => (
                                    <div key={i} className="hp-theme hp-theme-skeleton">
                                        <div className="hp-theme-shot" />
                                        <div className="hp-theme-meta">
                                            <span className="hp-sk-line" style={{ width: '60%' }} />
                                            <span className="hp-sk-line" style={{ width: '36%' }} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </section>

            <Rule />

            {/* ══════════════════ CARA KERJA ══════════════════ */}
            <section id="cara-kerja" className="hp-section">
                <div className="hp-container">
                    <div className="hp-section-head hp-section-head-center">
                        <div>
                            <p className="hp-eyebrow" data-reveal>Cara Kerja</p>
                            <h2 className="hp-h2" data-reveal data-reveal-delay="1">Siap dibagikan dalam tiga langkah</h2>
                        </div>
                    </div>

                    <div className="hp-steps">
                        {STEPS.map((s, i) => (
                            <div key={s.title} className="hp-step" data-reveal data-reveal-delay={String(i)}>
                                <span className="hp-step-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                                <h3>{s.title}</h3>
                                <p>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Rule />

            {/* ══════════════════ FITUR (editorial split, selang-seling) ══════════════════ */}
            <section id="fitur" className="hp-section">
                <div className="hp-container">
                    <div className="hp-section-head">
                        <div>
                            <p className="hp-eyebrow" data-reveal>Kemampuan</p>
                            <h2 className="hp-h2" data-reveal data-reveal-delay="1">
                                Lebih dari sekadar<br />halaman yang indah
                            </h2>
                        </div>
                        <p className="hp-section-lead" data-reveal data-reveal-delay="2">
                            Di balik desainnya, ada perangkat lengkap untuk mengelola tamu, kehadiran, dan setiap
                            momen yang ingin Anda simpan.
                        </p>
                    </div>

                    <div className="hp-features">
                        {FEATURE_GROUPS.map((g, i) => (
                            <article key={g.title} className={`hp-feature ${i % 2 ? 'is-flip' : ''}`} data-reveal>
                                <div className="hp-feature-body">
                                    <p className="hp-feature-eyebrow">{g.eyebrow}</p>
                                    <h3>{g.title}</h3>
                                    <p className="hp-feature-desc">{g.desc}</p>
                                    <ul className="hp-feature-points">
                                        {g.points.map(pt => (
                                            <li key={pt}><HiOutlineCheck aria-hidden="true" />{pt}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="hp-feature-side" aria-hidden="true">
                                    <span className="hp-feature-index">{String(i + 1).padStart(2, '0')}</span>
                                </div>
                            </article>
                        ))}
                    </div>

                    {/* Layanan tambahan — daftar hairline, permukaan padat (teks panjang) */}
                    {additionalFeatures.length > 0 && (
                        <div className="hp-addons" data-reveal>
                            <p className="hp-eyebrow">Layanan Tambahan</p>
                            <div className="hp-addon-list">
                                {additionalFeatures.map(f => (
                                    <div key={f.id} className="hp-addon">
                                        <div>
                                            <h4>{f.feature_name}</h4>
                                            <p>{f.description || 'Layanan pelengkap untuk menyempurnakan undangan Anda.'}</p>
                                        </div>
                                        <span className="hp-addon-price">
                                            {f.price > 0 ? `Rp ${f.price.toLocaleString('id-ID')}` : 'Gratis'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <Rule />

            {/* ══════════════════ HARGA ══════════════════ */}
            <section id="harga" className="hp-section">
                <div className="hp-container">
                    <div className="hp-section-head hp-section-head-center">
                        <div>
                            <p className="hp-eyebrow" data-reveal>Harga</p>
                            <h2 className="hp-h2" data-reveal data-reveal-delay="1">Satu kali bayar, untuk selamanya</h2>
                            <p className="hp-section-lead hp-section-lead-center" data-reveal data-reveal-delay="2">
                                Tanpa biaya berlangganan. Ubah isi undangan sesering yang Anda mau — bahkan di
                                hari terakhir sebelum acara — tanpa tambahan biaya.
                            </p>
                        </div>
                    </div>

                    <div className="hp-plans">
                        {orderedPlans.length > 0 ? orderedPlans.map((p, i) => {
                            const isBest = p.plan_type === 'premium';
                            return (
                                <div key={p.plan_type} className={`hp-plan ${isBest ? 'is-best' : ''}`} data-reveal data-reveal-delay={String(i)}>
                                    {isBest && <span className="hp-plan-flag">Paling Diminati</span>}
                                    <p className="hp-plan-name">{p.plan_type}</p>
                                    <p className="hp-plan-price">
                                        <span className="hp-plan-cur">Rp</span>
                                        {p.price.toLocaleString('id-ID')}
                                    </p>
                                    <p className="hp-plan-term">Pembayaran satu kali</p>

                                    <span className="hp-plan-rule" />

                                    <ul className="hp-plan-list">
                                        <li><HiOutlineCheck aria-hidden="true" />Hingga {p.guest_limit} tamu</li>
                                        {planFeatures.filter(f => f.plan_id === p.plan_type).map(f => (
                                            <li key={f.id}><HiOutlineCheck aria-hidden="true" />{f.feature}</li>
                                        ))}
                                    </ul>

                                    <Link
                                        to={`/register?plan_type=${encodeURIComponent(p.plan_type)}`}
                                        className={`hp-btn ${isBest ? 'hp-btn-primary' : 'hp-btn-outline'} hp-btn-block`}
                                    >
                                        Pilih {p.plan_type}
                                    </Link>
                                </div>
                            );
                        }) : (
                            // Kerangka kartu harga dibuat BERISI (judul, harga,
                            // beberapa baris fitur, tombol) — kotak kosong
                            // berdenyut tidak memberi tahu apa yang akan muncul.
                            [0, 1, 2].map(i => (
                                <div key={i} className="hp-plan hp-plan-skeleton" aria-hidden="true">
                                    <span className="hp-sk-line" style={{ width: '42%', height: 13 }} />
                                    <span className="hp-sk-line" style={{ width: '64%', height: 34, marginTop: 18 }} />
                                    <span className="hp-sk-rule" />
                                    <span className="hp-sk-line" style={{ width: '88%' }} />
                                    <span className="hp-sk-line" style={{ width: '76%' }} />
                                    <span className="hp-sk-line" style={{ width: '82%' }} />
                                    <span className="hp-sk-line hp-sk-btn" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <Rule />

            {/* ══════════════════ TESTIMONI ══════════════════ */}
            <section id="testimoni" className="hp-section">
                <div className="hp-container">
                    <div className="hp-section-head hp-section-head-center">
                        <div>
                            <p className="hp-eyebrow" data-reveal>Testimoni</p>
                            <h2 className="hp-h2" data-reveal data-reveal-delay="1">Cerita dari pasangan yang lebih dulu</h2>
                        </div>
                    </div>

                    <TestimonialCarousel reviews={displayReviews.slice(0, 6)} />
                </div>
            </section>

            <Rule />

            {/* ══════════════════ FAQ ══════════════════ */}
            <section id="faq" className="hp-section">
                <div className="hp-container hp-faq-wrap">
                    <div className="hp-faq-aside">
                        <p className="hp-eyebrow" data-reveal>Pertanyaan Umum</p>
                        <h2 className="hp-h2" data-reveal data-reveal-delay="1">Hal yang sering ditanyakan</h2>
                        <p className="hp-section-lead" data-reveal data-reveal-delay="2">
                            Belum menemukan jawabannya? Tim kami siap membantu.
                        </p>
                        {config?.contact_whatsapp && (
                            <a
                                href={`https://wa.me/${config.contact_whatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hp-btn hp-btn-outline hp-btn-sm"
                                data-reveal
                                data-reveal-delay="3"
                            >
                                <FaWhatsapp aria-hidden="true" /> Hubungi Kami
                            </a>
                        )}
                    </div>

                    <div className="hp-faq-list" data-reveal>
                        {FAQ_ITEMS.map((item, i) => {
                            const open = openFaq === i;
                            return (
                                <div key={i} className={`hp-faq ${open ? 'is-open' : ''}`}>
                                    <button onClick={() => setOpenFaq(open ? null : i)} aria-expanded={open}>
                                        <span>{item.q}</span>
                                        <HiOutlineChevronDown aria-hidden="true" />
                                    </button>
                                    <div className="hp-faq-panel">
                                        <div><p>{item.a}</p></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ══════════════════ CTA PENUTUP (gelap — emas akhirnya bersinar) ══════════════════ */}
            <section className="hp-final">
                <div className="hp-container">
                    <div className="hp-final-inner">
                        <p className="hp-eyebrow hp-eyebrow-dark" data-reveal>Mulai Hari Ini</p>
                        <h2 className="hp-final-title" data-reveal data-reveal-delay="1">
                            Hari Anda layak mendapat<br />undangan yang setara
                        </h2>
                        <p className="hp-final-lead" data-reveal data-reveal-delay="2">
                            Pilih desainnya, lengkapi isinya, lalu bagikan. Selebihnya biar kami yang urus.
                        </p>
                        <div className="hp-final-cta" data-reveal data-reveal-delay="3">
                            <Link to="/register" className="hp-btn hp-btn-gold">
                                Buat Undangan Anda <HiOutlineArrowRight />
                            </Link>
                            <a href="#koleksi" onClick={e => scrollToSection(e, 'koleksi')} className="hp-btn hp-btn-ghost-dark">
                                Telusuri Koleksi
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ FOOTER ══════════════════ */}
            <footer className="hp-footer">
                <div className="hp-container">
                    <div className="hp-footer-grid">
                        <div className="hp-footer-brand">
                            <span className="hp-brand-mark">
                                <img src={logoUrl || kosaIcon} alt="" />
                            </span>
                            <p className="hp-footer-name">{siteName}</p>
                            <p className="hp-footer-desc">
                                Platform undangan pernikahan digital untuk mengabadikan setiap momen kebahagiaan Anda —
                                dirancang dengan cermat, dikelola dengan mudah.
                            </p>
                            {(config?.site_instagram || config?.site_tiktok || config?.site_youtube) && (
                                <div className="hp-social">
                                    {config?.site_instagram && (
                                        <a href={`https://instagram.com/${config.site_instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FaInstagram /></a>
                                    )}
                                    {config?.site_tiktok && (
                                        <a href={config.site_tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><FaTiktok /></a>
                                    )}
                                    {config?.site_youtube && (
                                        <a href={config.site_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><FaYoutube /></a>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="hp-footer-col">
                            <h4>Jelajahi</h4>
                            <ul>
                                {NAV_LINKS.map(l => (
                                    <li key={l.id}><a href={`#${l.id}`} onClick={e => scrollToSection(e, l.id)}>{l.label}</a></li>
                                ))}
                            </ul>
                        </div>

                        <div className="hp-footer-col">
                            <h4>Akun</h4>
                            <ul>
                                <li><Link to="/login">Masuk</Link></li>
                                <li><Link to="/register">Daftar</Link></li>
                            </ul>
                        </div>

                        {(config?.contact_email || config?.contact_whatsapp) && (
                            <div className="hp-footer-col is-wide">
                                <h4>Kontak</h4>
                                <ul>
                                    {config?.contact_email && (
                                        <li>
                                            <a href={`mailto:${config.contact_email}`}>
                                                <HiOutlineMail aria-hidden="true" />{config.contact_email}
                                            </a>
                                        </li>
                                    )}
                                    {config?.contact_whatsapp && (
                                        <li>
                                            <a href={`https://wa.me/${config.contact_whatsapp}`} target="_blank" rel="noopener noreferrer">
                                                <FaWhatsapp aria-hidden="true" />+{config.contact_whatsapp}
                                            </a>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="hp-footer-base">
                        <p>© {new Date().getFullYear()} {siteName}. Seluruh hak cipta dilindungi.</p>
                        <p>Dibuat dengan saksama di Indonesia.</p>
                    </div>
                </div>
            </footer>

            {/* Overlay pratinjau tema — tetap di halaman ini, tanpa pindah rute. */}
            <ThemePreviewOverlay
                code={previewCode}
                themes={themes}
                onClose={() => setPreviewCode(null)}
                onSelect={setPreviewCode}
            />
        </div>
    );
}

/**
 * ThemePreviewOverlay — pratinjau satu tema sebagai lapisan fullscreen di atas
 * halaman, TANPA berpindah rute. Halaman di belakangnya tetap hidup, jadi
 * kembali ke koleksi terasa instan (posisi gulir & data tidak hilang).
 *
 * Slug tenant demo dipakai bila tema belum punya tenant contoh sendiri.
 */
const PREVIEW_DEMO_SLUG = 'dini-galang';

function ThemePreviewOverlay({
    code, themes, onClose, onSelect,
}: {
    code: string | null;
    themes: Theme[];
    onClose: () => void;
    onSelect: (code: string) => void;
}) {
    const [frameLoaded, setFrameLoaded] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const theme = useMemo(
        () => themes.find(t => (t.code || '').trim() === (code || '').trim()),
        [themes, code]
    );

    const others = useMemo(
        () => themes.filter(t => t.code && (t.code || '').trim() !== (code || '').trim()).slice(0, 8),
        [themes, code]
    );

    // Ganti tema → iframe dipasang ulang, jadi status muat harus direset.
    useEffect(() => { setFrameLoaded(false); }, [code]);

    // Kunci gulir halaman di belakang + tutup dengan tombol Escape.
    useEffect(() => {
        if (!code) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [code, onClose]);

    if (!code || !theme) return null;

    const slug = (theme.sample_tenant_slug || '').trim() || PREVIEW_DEMO_SLUG;
    const previewUrl = theme.code ? `#/preview/${theme.code}/${slug}` : '';

    return (
        <div className="hp-ov" role="dialog" aria-modal="true" aria-label={`Pratinjau tema ${theme.name}`}>
            <div className="hp-ov-scrim" onClick={onClose} />

            <div className="hp-ov-panel">
                <header className="hp-ov-bar">
                  <div className="hp-ov-bar-inner">
                    <button type="button" onClick={onClose} className="hp-ov-close">
                        <HiOutlineX aria-hidden="true" /> <span>Tutup</span>
                    </button>
                    <p className="hp-ov-bar-title">{theme.name}</p>
                    <Link to={`/register?theme=${encodeURIComponent(theme.code || '')}`} className="hp-btn hp-btn-primary hp-btn-sm">
                        Pakai Tema Ini
                    </Link>
                  </div>
                </header>

                <div className="hp-ov-body">
                  <div className="hp-ov-inner">
                    {/* Kolom kiri: keterangan tema */}
                    <section className="hp-ov-info">
                        <p className="hp-eyebrow">Pratinjau Tema</p>
                        <h2 className="hp-ov-title">{theme.name}</h2>

                        <div className="hp-ov-tags">
                            <span className="hp-ov-tag is-plan">{theme.plan_type}</span>
                            {theme.style_category && <span className="hp-ov-tag">{theme.style_category}</span>}
                        </div>

                        <p className="hp-ov-desc">
                            Inilah tampilan undangan Anda dengan tema <strong>{theme.name}</strong>. Contoh ini
                            memakai data pernikahan sungguhan — nama, tanggal, foto, dan seluruh isinya nanti
                            dapat Anda ganti sendiri melalui editor.
                        </p>

                        {/* Catatan peramban — selalu tampil untuk semua pengunjung. */}
                        <div className="hp-ov-note" role="note">
                            <span className="hp-ov-note-ico" aria-hidden="true"><HiOutlineExclamation /></span>
                            <div>
                                <p className="hp-ov-note-title">Optimal dibuka di Google Chrome versi terbaru</p>
                                <p className="hp-ov-note-body">
                                    Tema ini memakai animasi, efek visual, dan pemutar musik yang paling stabil
                                    pada Google Chrome versi terbaru. Pada peramban lain atau versi lama,
                                    sebagian tampilan dapat berbeda atau tidak berjalan semestinya.
                                </p>
                            </div>
                        </div>

                        <ul className="hp-ov-points">
                            <li><HiOutlineCheck aria-hidden="true" />Seluruh isi dapat disesuaikan</li>
                            <li><HiOutlineCheck aria-hidden="true" />Tautan personal untuk tiap tamu</li>
                            <li><HiOutlineCheck aria-hidden="true" />Konfirmasi kehadiran &amp; buku ucapan</li>
                        </ul>

                        <div className="hp-ov-cta">
                            <Link to={`/register?theme=${encodeURIComponent(theme.code || '')}`} className="hp-btn hp-btn-primary">
                                Pakai Tema Ini <HiOutlineArrowRight aria-hidden="true" />
                            </Link>
                            {previewUrl && (
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="hp-btn hp-btn-ghost">
                                    Buka Tab Baru <HiOutlineExternalLink aria-hidden="true" />
                                </a>
                            )}
                        </div>

                    </section>

                    {/* Kolom kanan: undangan (iframe polos, tanpa bingkai HP) */}
                    <section className="hp-ov-stage">
                        <div className="hp-ov-screen">
                            {!frameLoaded && (
                                <div className="hp-ov-loading">
                                    <span className="hp-ov-spinner" aria-hidden="true" />
                                    <p>Memuat undangan…</p>
                                </div>
                            )}
                            <iframe
                                // previewUrl WAJIB ikut jadi key: berpindah tema lewat
                                // daftar "Tema Lainnya" tidak meng-unmount overlay, jadi
                                // tanpa ini React memakai ULANG iframe lama dan pratinjau
                                // tidak ikut berganti.
                                key={`${previewUrl}#${reloadKey}`}
                                src={previewUrl}
                                title={`Pratinjau tema ${theme.name}`}
                                className="hp-ov-frame"
                                onLoad={() => setFrameLoaded(true)}
                            />
                        </div>
                        <button
                            type="button"
                            className="hp-ov-reload"
                            onClick={() => { setFrameLoaded(false); setReloadKey(k => k + 1); }}
                        >
                            <HiOutlineRefresh aria-hidden="true" /> Muat ulang pratinjau
                        </button>
                    </section>

                    {/* "Tema Lainnya" dipisah jadi anak grid TERSENDIRI, bukan
                        lagi bagian kolom keterangan. Sebelumnya ia ikut di dalam
                        .hp-ov-info, sehingga di mobile (kolom menumpuk) pengunjung
                        harus melewati SELURUH keterangan + galeri tema lain dulu
                        sebelum sampai ke pratinjaunya sendiri. Sebagai anak
                        terpisah, urutannya bisa diatur `order` per breakpoint. */}
                    {others.length > 0 && (
                        <section className="hp-ov-others">
                            <p className="hp-eyebrow">Tema Lainnya</p>
                            <div className="hp-ov-others-grid">
                                {others.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => onSelect(t.code!)}
                                        className="hp-ov-other"
                                        aria-label={`Lihat tema ${t.name}`}
                                    >
                                        <span className="hp-ov-other-shot">
                                            <ProxyImage
                                                src={t.preview_image || `https://placehold.co/450x800?text=${encodeURIComponent(t.name)}`}
                                                alt={t.name}
                                                loading="lazy"
                                            />
                                        </span>
                                        <span className="hp-ov-other-name">{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                  </div>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Sub-komponen
   ══════════════════════════════════════════════════════════════════ */

function Stat({ value, label, suffix, loading }: { value: string; label: string; suffix?: string; loading?: boolean }) {
    // Saat memuat, angka diganti batang berdenyut — bukan tanda '—' diam yang
    // terbaca seperti "datanya kosong/rusak". Label tetap tampil supaya
    // pengunjung sudah bisa membaca strukturnya sebelum angkanya datang.
    return (
        <div className="hp-stat">
            {loading ? (
                <span className="hp-stat-skel" aria-hidden="true" />
            ) : (
                <p className="hp-stat-val">
                    {value}{suffix && <span className="hp-stat-suffix">{suffix}</span>}
                </p>
            )}
            <p className="hp-stat-label">{label}</p>
        </div>
    );
}

/** Garis pemisah emas yang memudar di kedua ujung. */
function Rule() {
    return <div className="hp-container"><span className="hp-rule" /></div>;
}

/**
 * HeroGallery — tiga panel tema bertumpuk dalam bingkai kaca.
 * Panel tengah lebih besar; dua sisi miring di belakangnya. Ini juga yang
 * memberi "isi" untuk diburamkan oleh kartu kaca di sekitarnya.
 */
function HeroGallery({ themes, loaded }: { themes: Array<{ id: string; name: string; preview_image?: string }>; loaded: boolean }) {
    const slots = [0, 1, 2];
    return (
        <div className="hp-gallery">
            <span className="hp-gallery-glow" aria-hidden="true" />
            {slots.map(i => {
                const t = themes[i];
                const pos = i === 0 ? 'is-left' : i === 1 ? 'is-center' : 'is-right';
                return (
                    <div key={t?.id || `slot-${i}`} className={`hp-gallery-card ${pos}`}>
                        {t?.preview_image ? (
                            <ProxyImage src={t.preview_image} alt={t.name} loading={i === 1 ? 'eager' : 'lazy'} className="hp-gallery-img" />
                        ) : (
                            <div className={`hp-gallery-ph ${loaded ? '' : 'is-loading'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * TestimonialCarousel — 3 kolom di PC, 1 kolom yang bisa digeser di mobile.
 *
 * KENAPA scroll-snap NATIF, bukan track transform:
 * geser jari jadi scroll sungguhan (momentum, rubber-band, dan aksesibilitas
 * keyboard/screen-reader ikut gratis). Kalau JS gagal, ia tetap berupa baris
 * yang bisa digulir — bukan slide yang macet di kartu pertama.
 *
 * KENAPA jumlah halaman DIHITUNG dari geometri, bukan dikunci angka:
 * PC menampilkan 3 kartu sekaligus, mobile 1. Kalau indikator di-hardcode
 * "6 titik", tampilan PC akan punya titik yang tak pernah bisa dicapai. Maka
 * halaman = round(lebar_scroll / lebar_terlihat), dibaca ulang saat resize.
 *
 * Auto-swipe berhenti saat pengguna menyentuh/hover/fokus, dan saat tab tidak
 * terlihat — memutar carousel di tab latar hanya membuang baterai.
 */
const TESTI_AUTOPLAY_MS = 5000;

export function TestimonialCarousel({ reviews }: { reviews: Array<Pick<ReviewAndRating, 'id' | 'comment' | 'rate_star' | 'bride_name' | 'groom_name' | 'wedding_date' | 'alamat'>> }) {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const [page, setPage] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    // progres 0..1 untuk halaman yang sedang tampil (mengisi bilah indikator).
    const [progress, setProgress] = useState(0);
    // Sengaja ref, bukan state: jeda hover tidak mengubah apa pun di layar,
    // jadi tak perlu memicu render ulang tiap kali tetikus masuk/keluar.
    const paused = useRef(false);
    // Ditandai true saat pengguna berpindah sendiri; interval membacanya lalu
    // mengulang hitungan mundur dari nol.
    const restart = useRef(false);

    // Nama pasangan per halaman — HANYA dipakai sebagai aria-label tombol
    // indikator (tidak pernah tampil di layar), supaya pengguna pembaca layar
    // tetap tahu tiap ruas itu apa, bukan sekadar "tombol 1, tombol 2".
    const perPage = pageCount > 0 ? Math.max(1, Math.round(reviews.length / pageCount)) : 1;
    const pageLabels = useMemo(
        () => Array.from({ length: pageCount }, (_, i) => {
            const r = reviews[i * perPage];
            return r?.bride_name || `Testimoni ${i + 1}`;
        }),
        [reviews, pageCount, perPage]
    );

    // Ukur berapa "halaman" geser yang sebenarnya ada pada lebar layar saat ini.
    const measure = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        const per = el.clientWidth || 1;
        // Toleransi 4px: pembulatan sub-pixel bisa memunculkan halaman hantu.
        const total = el.scrollWidth - per > 4 ? Math.round(el.scrollWidth / per) : 1;
        setPageCount(Math.max(1, total));
        setPage(Math.round(el.scrollLeft / per));
    }, []);

    useEffect(() => {
        measure();
        const el = trackRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [measure, reviews.length]);

    // Posisi halaman dibaca dari scroll sungguhan, bukan disimpan terpisah —
    // supaya indikator tetap benar walau digeser jari (bukan lewat tombol).
    const onScroll = useCallback(() => {
        const el = trackRef.current;
        if (!el) return;
        const per = el.clientWidth || 1;
        setPage(Math.round(el.scrollLeft / per));
    }, []);

    const goTo = useCallback((idx: number) => {
        const el = trackRef.current;
        if (!el) return;
        const per = el.clientWidth || 1;
        restart.current = true;
        el.scrollTo({ left: per * idx, behavior: 'smooth' });
    }, []);

    // Auto-swipe berbasis TICK, bukan setInterval polos: bilah progres perlu
    // tahu sudah berapa lama halaman ini bertahan supaya isiannya bisa tumbuh.
    // Dengan interval biasa, UI tidak punya cara membaca sisa waktu.
    useEffect(() => {
        if (pageCount <= 1) { setProgress(0); return; }
        if (typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const TICK = 50;
        let elapsed = 0;
        const id = window.setInterval(() => {
            // Navigasi oleh pengguna (panah/klik bilah/geser jari) meminta
            // hitungan mundur diulang lewat ref ini.
            if (restart.current) { restart.current = false; elapsed = 0; setProgress(0); }
            if (paused.current || document.hidden) return;
            elapsed += TICK;
            if (elapsed >= TESTI_AUTOPLAY_MS) {
                elapsed = 0;
                setProgress(0);
                const el = trackRef.current;
                if (!el) return;
                const per = el.clientWidth || 1;
                const next = (Math.round(el.scrollLeft / per) + 1) % pageCount;
                el.scrollTo({ left: per * next, behavior: 'smooth' });
            } else {
                setProgress(elapsed / TESTI_AUTOPLAY_MS);
            }
        }, TICK);

        return () => window.clearInterval(id);
        // JANGAN masukkan `page` ke sini. scrollTo memicu banyak event `scroll`
        // selama animasi halus; kalau efek ini ikut `page`, interval dibongkar
        // dan `elapsed` kembali 0 di tengah jalan — autoplay bisa mandek total.
        // Reset hitungan dilakukan lewat ref `restart`, bukan lewat remount.
    }, [pageCount]);

    // Jeda hanya sesaat selama pengguna menyentuh/hover/fokus. Tidak ada
    // tombol jeda, jadi cukup ref — tak perlu render ulang untuk ini.
    const hold = useCallback(() => { paused.current = true; }, []);
    const release = useCallback(() => {
        paused.current = false;
        // Beri satu putaran penuh lagi setelah pengguna melepas — bukan sisa
        // waktu yang tinggal sedikit dari sebelum ia menyentuh.
        restart.current = true;
    }, []);

    const step = useCallback((dir: number) => {
        const el = trackRef.current;
        if (!el) return;
        const per = el.clientWidth || 1;
        const cur = Math.round(el.scrollLeft / per);
        // Melingkar di kedua arah supaya panah tidak pernah jadi jalan buntu.
        const next = (cur + dir + pageCount) % pageCount;
        restart.current = true;
        el.scrollTo({ left: per * next, behavior: 'smooth' });
    }, [pageCount]);

    return (
        <div
            className="hp-testi-wrap"
            onMouseEnter={hold}
            onMouseLeave={release}
            onFocusCapture={hold}
            onBlurCapture={release}
            onTouchStart={hold}
            onTouchEnd={release}
        >
            <div
                className="hp-testi-grid"
                ref={trackRef}
                onScroll={onScroll}
                role="group"
                aria-roledescription="carousel"
                aria-label="Testimoni pasangan"
            >
                {reviews.map((r, i) => {
                    const initials = `${(r.bride_name?.[0] || '').toUpperCase()}${(r.groom_name?.[0] || '').toUpperCase()}`;
                    const stars = Math.max(0, Math.min(5, Number(r.rate_star) || 0));
                    return (
                        <figure key={r.id} className="hp-testi" data-reveal data-reveal-delay={String(i % 3)}>
                            <div className="hp-testi-stars" aria-label={`${stars} dari 5 bintang`}>
                                {'★'.repeat(stars)}<span className="hp-testi-stars-off">{'★'.repeat(5 - stars)}</span>
                            </div>
                            <blockquote>{r.comment}</blockquote>
                            <figcaption>
                                <span className="hp-testi-avatar">{initials || '♥'}</span>
                                <span>
                                    <strong>{r.bride_name} &amp; {r.groom_name}</strong>
                                    <small>
                                        <HiOutlineLocationMarker aria-hidden="true" />
                                        {r.alamat || 'Indonesia'}{r.wedding_date ? ` · ${r.wedding_date}` : ''}
                                    </small>
                                </span>
                            </figcaption>
                        </figure>
                    );
                })}
            </div>

            {pageCount > 1 && (
                <div className="hp-testi-nav">
                    <button
                        type="button"
                        className="hp-testi-arrow"
                        onClick={() => step(-1)}
                        aria-label="Testimoni sebelumnya"
                    >
                        <HiOutlineArrowRight aria-hidden="true" style={{ transform: 'rotate(180deg)' }} />
                    </button>

                    {/* Indikator MURNI VISUAL — tanpa teks, tanpa angka.
                        Tiap ruas = satu halaman, jadi jumlah halaman terbaca
                        dari banyaknya ruas. Ruas aktif terisi seiring waktu:
                        itulah yang memberi tahu carousel bergerak sendiri dan
                        seberapa dekat pergantian, tanpa satu huruf pun.
                        Tetap bisa diklik untuk melompat. */}
                    <div className="hp-testi-track" role="tablist" aria-label="Pilih testimoni">
                        {Array.from({ length: pageCount }, (_, i) => (
                            <button
                                key={i}
                                type="button"
                                role="tab"
                                aria-selected={i === page}
                                // Nama aksesibel tetap ada untuk pembaca layar,
                                // tapi TIDAK pernah tampil sebagai teks di layar.
                                aria-label={pageLabels[i]}
                                className={`hp-testi-seg${i === page ? ' is-on' : ''}${i < page ? ' is-past' : ''}`}
                                onClick={() => goTo(i)}
                            >
                                <span
                                    className="hp-testi-seg-fill"
                                    style={i === page ? { transform: `scaleX(${progress})` } : undefined}
                                />
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="hp-testi-arrow"
                        onClick={() => step(1)}
                        aria-label="Testimoni berikutnya"
                    >
                        <HiOutlineArrowRight aria-hidden="true" />
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * ScrollReveal — IntersectionObserver tunggal untuk semua [data-reveal].
 *
 * Sengaja satu observer untuk seluruh halaman (bukan per-komponen) supaya murah,
 * dan tiap elemen di-`unobserve` setelah tampil — reveal TIDAK pernah diulang
 * saat menggulir ke atas. Node baru (mis. tema yang datang belakangan dari API)
 * ditangkap oleh MutationObserver.
 */
function ScrollReveal() {
    const seen = useRef<WeakSet<Element>>(new WeakSet());

    useEffect(() => {
        const root = document.querySelector('.hp-root');
        if (!root) return;

        // Tanpa IntersectionObserver (atau bila pengguna meminta gerakan
        // dikurangi), JANGAN aktifkan mode reveal sama sekali — biarkan konten
        // tampil apa adanya. Ini yang menjaga halaman tetap terbaca.
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || typeof IntersectionObserver === 'undefined') return;

        // Baru sekarang aman menyembunyikan: animasi dijamin bisa mengembalikan.
        root.classList.add('hp-reveal-ready');

        const io = new IntersectionObserver(
            entries => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add('is-in');
                        io.unobserve(e.target);
                    }
                }
            },
            // threshold 0: section yang lebih TINGGI dari viewport tidak akan
            // pernah mencapai rasio >0 yang besar, jadi ambang seperti 0.12
            // membuatnya tak pernah tampil. Ambang 0 = "begitu menyentuh layar".
            { threshold: 0, rootMargin: '0px 0px -5% 0px' }
        );

        const observeAll = () => {
            document.querySelectorAll('[data-reveal]').forEach(el => {
                if (seen.current.has(el)) return;
                seen.current.add(el);
                io.observe(el);
            });
        };
        observeAll();

        // Tema/plan/ulasan tiba setelah fetch → node baru perlu ikut diamati.
        // Hanya bereaksi pada penambahan NODE; perubahan atribut/class diabaikan
        // supaya penambahan .is-in tidak memicu observer ini berulang.
        const mo = new MutationObserver(observeAll);
        mo.observe(document.body, { childList: true, subtree: true });

        // Jaring pengaman: apa pun yang masih tersembunyi setelah 3 detik
        // (mis. elemen di luar alur, atau observer yang tak pernah menembak)
        // dipaksa tampil. Konten tidak boleh hilang gara-gara animasi.
        const failsafe = window.setTimeout(() => {
            document.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => el.classList.add('is-in'));
        }, 3000);

        return () => {
            io.disconnect();
            mo.disconnect();
            window.clearTimeout(failsafe);
            root.classList.remove('hp-reveal-ready');
        };
    }, []);

    return null;
}

/**
 * HomeBackdrop — lapisan latar tetap: orb ambient + butiran (grain).
 *
 * INI FONDASI SELURUH ARAH DESAIN. Tanpa sesuatu yang tidak rata di belakangnya,
 * backdrop-filter tidak menghasilkan apa pun yang terlihat dan semua panel kaca
 * akan tampak seperti kartu putih biasa.
 */
function HomeBackdrop() {
    return (
        <div className="hp-backdrop" aria-hidden="true">
            <span className="hp-orb hp-orb-1" />
            <span className="hp-orb hp-orb-2" />
            <span className="hp-orb hp-orb-3" />
            <span className="hp-grain" />
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Gaya — dilingkupi .hp-root supaya tidak bocor ke halaman lain.
   ══════════════════════════════════════════════════════════════════ */
function HomeStyles() {
    return (
        <style>{`
.hp-root{
  /* ── Warna ── */
  --bg:#FDFCFA;            /* off-white hangat, BUKAN #fff murni */
  --surface:#FFFFFF;
  --champagne:#FAF3E0;
  --ink:#1A1A1F;
  --ink-soft:#5A5A66;
  /* #6E6E7A, bukan #8A8A96: token ini dipakai pada teks kecil (11–13px seperti
     label statistik & keterangan paket). Nilai yang lebih terang hanya mencapai
     ~3.3:1 di atas --bg — gagal WCAG AA untuk teks normal. Ini lolos 4.5:1
     sambil tetap terbaca "redup" terhadap --ink-soft. */
  --ink-mute:#6E6E7A;
  --line:rgba(26,26,31,.09);
  --gold:#D4AF37;
  --gold-deep:#B8860B;
  /* Emas untuk TEKS KECIL (eyebrow, label, harga add-on). --gold-deep hanya
     mencapai ~3.2:1 di atas --bg; ini ~4.6:1 sehingga lolos WCAG AA tanpa
     kehilangan nuansa emas. Ikon, garis, dan ornamen tetap pakai --gold-deep
     karena aturan kontras teks tidak berlaku di sana. */
  --gold-text:#8A6508;
  --gold-light:#E8C86A;
  --gold-pale:#F0E2C0;
  --gold-grad:linear-gradient(135deg,#B8860B 0%,#E8C86A 38%,#D4AF37 55%,#F5E4A8 72%,#B8860B 100%);

  /* ── Kaca (tiga tingkat saja — jangan tambah tingkat keempat) ── */
  --glass-1:rgba(255,255,255,.62);
  --glass-2:rgba(255,255,255,.55);
  --glass-3:rgba(255,255,255,.82);
  --glass-border:rgba(255,255,255,.75);
  --glass-rim:inset 0 1px 0 rgba(255,255,255,.9);
  --glass-shadow:0 8px 32px rgba(31,38,60,.07);
  --glass-shadow-lift:0 16px 48px rgba(31,38,60,.12);

  /* ── Gerak ── */
  --ease-lux:cubic-bezier(.22,1,.36,1);
  --ease-soft:cubic-bezier(.6,.2,.1,1);

  position:relative;
  /* isolation:isolate mengurung .hp-backdrop (z-index:-1) di dalam halaman ini
     supaya ia tidak jatuh ke belakang latar <body>/app dan menghilang. */
  isolation:isolate;
  min-height:100vh;
  background:var(--bg);
  color:var(--ink);
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  font-size:16px;
  line-height:1.7;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}
.hp-root *,.hp-root *::before,.hp-root *::after{box-sizing:border-box;}
/* :not([class]) WAJIB — sama seperti reset ul di atas. ".hp-root p"
   berspesifisitas 11 dan mengalahkan SEMUA kelas pada <p> (10), sehingga
   margin pada .hp-eyebrow, .hp-desc, dsb. dibuang tanpa jejak.
   Inilah akar keluhan "spacing mepet" yang berulang. */
.hp-root p:not([class]){margin:0;}
.hp-root h1,.hp-root h2,.hp-root h3,.hp-root h4{margin:0;font-weight:400;}
/* :not([class]) WAJIB. Selektor ".hp-root ul" berspesifisitas 11 (class+element)
   sehingga MENGALAHKAN aturan berkelas seperti .hp-plan-list / .hp-feature-points
   (10) — margin:0 di sini membatalkan margin-bottom mereka tanpa jejak dan tata
   letak jadi mepet. Reset hanya untuk <ul> polos; yang berkelas atur sendiri. */
.hp-root ul:not([class]){margin:0;padding:0;list-style:none;}
.hp-root ul[class]{padding:0;list-style:none;}
/* :not(.hp-btn) itu WAJIB. Tanpanya selektor reset anchor (spesifisitas 11)
   mengalahkan .hp-btn-primary / .hp-btn-gold / .hp-btn-light /
   .hp-btn-ghost-dark (10), sehingga color:inherit menang dan label tombol jadi
   gelap di atas latar gelap alias tak terlihat. Hanya berlaku untuk tombol
   berupa anchor, bukan elemen button.
   CATATAN: jangan pakai backtick di dalam blok gaya ini — isinya template
   literal JS, backtick akan menutupnya lebih awal dan merusak file. */
.hp-root a:not(.hp-btn){text-decoration:none;color:inherit;}
.hp-root a.hp-btn{text-decoration:none;}
.hp-root img{max-width:100%;display:block;}
.hp-root button{font:inherit;color:inherit;background:none;border:none;cursor:pointer;}

/* ══ LATAR: orb + butiran. Ini yang membuat kaca terlihat. ══ */
/* z-index:-1 (bukan 0) + isolation:isolate pada .hp-root: orb berukuran ~900px
   dengan filter:blur() membuat stacking context sendiri dan meluber jauh
   melewati kotaknya. Pada z-index:0 ia bersaing dengan .hp-hero/.hp-section
   yang hanya z-index:1 dan menutupi isinya. Dipaksa ke belakang semua konten. */
.hp-backdrop{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;}
.hp-orb{position:absolute;border-radius:50%;filter:blur(40px);}
.hp-orb-1{width:820px;height:820px;top:-320px;left:-180px;
  background:radial-gradient(circle,rgba(212,175,55,.15),transparent 68%);}
.hp-orb-2{width:900px;height:900px;top:22%;right:-340px;
  background:radial-gradient(circle,rgba(226,199,163,.14),transparent 70%);}
.hp-orb-3{width:760px;height:760px;bottom:6%;left:8%;
  background:radial-gradient(circle,rgba(178,190,214,.10),transparent 70%);}
.hp-grain{position:absolute;inset:-50%;opacity:.032;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");}

/* ══ Kerangka ══ */
.hp-container{width:100%;max-width:1240px;margin:0 auto;padding:0 20px;position:relative;z-index:1;}
.hp-section{position:relative;z-index:1;padding:72px 0;}

/* ══ Tipografi ══ */
.hp-eyebrow{
  font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.2em;
  color:var(--gold-text);margin-bottom:18px;
}
.hp-eyebrow::after{
  content:'';display:block;width:40px;height:2px;margin-top:14px;
  background:var(--gold-grad);border-radius:2px;
}
.hp-eyebrow-dark{color:var(--gold-light);}
.hp-h2{
  font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(2rem,4vw,3.4rem);line-height:1.12;letter-spacing:-.015em;
  color:var(--ink);
}
.hp-section-head{
  display:grid;grid-template-columns:1fr;gap:20px;align-items:start;margin-bottom:44px;
}
/* justify-items:stretch (bukan center): dengan nilai center, div pembungkus
   menyusut ke lebar konten TERLEBAR (judul), sehingga paragraf ber-max-width
   lebih sempit dipusatkan terhadap div itu — bukan terhadap section — dan
   terlihat tidak sejajar dengan judul. Dengan stretch, tiap anak memakai lebar
   penuh dan text-align:center memusatkannya pada sumbu yang sama. */
.hp-section-head-center{grid-template-columns:1fr;text-align:center;justify-items:stretch;max-width:760px;margin-inline:auto;}
.hp-section-head-center > *{width:100%;}
.hp-section-head-center .hp-eyebrow::after{margin-inline:auto;}
.hp-section-lead{font-size:17px;line-height:1.75;color:var(--ink-soft);max-width:56ch;}
.hp-section-lead-center{margin:24px auto 0;}
/* Di header terpusat, paragraf lead SELALU dipusatkan — tak peduli dipakai
   dengan kelas -center atau tidak. Ini menjaga judul & paragraf sesumbu. */
.hp-section-head-center .hp-section-lead{margin-inline:auto;}

.hp-rule{
  display:block;height:1px;
  background:linear-gradient(90deg,transparent,rgba(212,175,55,.35) 50%,transparent);
}

/* ══ Tombol ══ */
.hp-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:16px 30px;border-radius:999px;
  font-size:14px;font-weight:600;letter-spacing:.01em;line-height:1;
  cursor:pointer;white-space:nowrap;
  transition:transform .2s var(--ease-lux),box-shadow .2s var(--ease-lux),
             background-color .2s var(--ease-lux),border-color .2s var(--ease-lux),color .2s var(--ease-lux);
}
.hp-btn svg{width:16px;height:16px;flex:none;}
.hp-btn-sm{padding:11px 20px;font-size:13px;}
.hp-btn-block{width:100%;}
/* Primer = GELAP dengan garis rambut emas. Tombol emas padat terbaca murahan
   dan gagal kontras — lihat catatan riset. */
.hp-btn-primary{background:var(--ink);color:#fff;box-shadow:0 4px 16px rgba(26,26,31,.18);border:1px solid rgba(212,175,55,.3);}
.hp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(26,26,31,.26);border-color:rgba(212,175,55,.6);}
.hp-btn-ghost{background:var(--glass-1);color:var(--ink);border:1px solid var(--glass-border);
  -webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);box-shadow:var(--glass-rim);}
.hp-btn-ghost:hover{transform:translateY(-2px);background:rgba(255,255,255,.82);border-color:rgba(212,175,55,.45);}
.hp-btn-outline{background:transparent;color:var(--ink);border:1px solid rgba(26,26,31,.18);}
.hp-btn-outline:hover{transform:translateY(-2px);border-color:var(--gold);color:var(--gold-deep);}
.hp-btn-light{background:rgba(255,255,255,.94);color:var(--ink);border:1px solid rgba(255,255,255,.7);}
.hp-btn-light:hover{transform:translateY(-2px);background:#fff;}
/* Emas padat hanya di atas latar GELAP — di sanalah ia benar-benar bersinar. */
.hp-btn-gold{background:var(--gold-grad);color:#26200C;border:1px solid rgba(245,228,168,.5);box-shadow:0 6px 22px rgba(212,175,55,.28);}
.hp-btn-gold:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(212,175,55,.4);}
.hp-btn-ghost-dark{background:rgba(255,255,255,.06);color:#F3F1EC;border:1px solid rgba(255,255,255,.22);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);}
.hp-btn-ghost-dark:hover{transform:translateY(-2px);background:rgba(255,255,255,.12);border-color:rgba(212,175,55,.5);}

/* ══ NAV (kaca tingkat 2) ══ */
.hp-nav{position:fixed;top:0;left:0;right:0;z-index:100;transition:background-color .3s var(--ease-lux),box-shadow .3s var(--ease-lux),border-color .3s var(--ease-lux);
  border-bottom:1px solid transparent;transform:translateZ(0);}
.hp-nav.is-solid{
  background:var(--glass-2);
  -webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);
  border-bottom-color:rgba(212,175,55,.16);
  box-shadow:0 1px 24px rgba(31,38,60,.05);
}
.hp-nav-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;height:76px;}
.hp-nav.is-solid .hp-nav-inner{height:66px;}
.hp-nav-inner,.hp-nav.is-solid .hp-nav-inner{transition:height .3s var(--ease-lux);}
.hp-brand{display:flex;align-items:center;gap:12px;}
/* Latar GELAP, bukan kaca putih: berkas logo (kosa-icon.png) 100% piksel putih
   murni — dibuat untuk latar gelap. Di atas kaca putih ia hilang sama sekali.
   Kotak gelap ini sekaligus berfungsi sebagai bingkai merek yang tegas.
   Kalau suatu saat logo diganti versi gelap/berwarna, latar ini perlu ditinjau. */
.hp-brand-mark{width:42px;height:42px;flex:none;border-radius:12px;display:grid;place-items:center;padding:7px;
  background:var(--ink);border:1px solid rgba(212,175,55,.32);
  box-shadow:0 2px 10px rgba(26,26,31,.16);overflow:hidden;}
.hp-brand-mark img{width:100%;height:100%;object-fit:contain;}
.hp-brand-text{display:flex;flex-direction:column;line-height:1.1;}
.hp-brand-name{font-family:'Playfair Display',serif;font-size:19px;font-weight:600;letter-spacing:-.01em;color:var(--ink);}
.hp-brand-sub{font-size:9.5px;text-transform:uppercase;letter-spacing:.22em;color:var(--gold-text);margin-top:4px;font-weight:600;}
.hp-nav-links{display:none;align-items:center;gap:34px;}
.hp-nav-links a{font-size:14px;font-weight:500;color:var(--ink-soft);position:relative;padding:6px 0;transition:color .2s var(--ease-lux);}
.hp-nav-links a::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:var(--gold);
  transform:scaleX(0);transform-origin:left;transition:transform .25s var(--ease-lux);}
.hp-nav-links a:hover{color:var(--ink);}
.hp-nav-links a:hover::after{transform:scaleX(1);}
.hp-nav-actions{display:flex;align-items:center;gap:14px;}
.hp-nav-login{font-size:14px;font-weight:500;color:var(--ink-soft);transition:color .2s var(--ease-lux);}
.hp-nav-login:hover{color:var(--gold-deep);}
.hp-burger{display:flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:12px;color:var(--ink);}
.hp-burger svg{width:24px;height:24px;}
.hp-mobile-menu{display:block;overflow:hidden;max-height:0;opacity:0;transition:max-height .4s var(--ease-lux),opacity .3s var(--ease-lux);}
.hp-mobile-menu.is-open{max-height:460px;opacity:1;}
.hp-mobile-menu .hp-container{display:flex;flex-direction:column;padding-top:8px;padding-bottom:22px;}
.hp-mobile-menu a{padding:14px 4px;font-size:15px;font-weight:500;color:var(--ink-soft);border-bottom:1px solid var(--line);}
.hp-mobile-menu a:last-child{border-bottom:none;}

/* ══ HERO ══ */
/* MOBILE-FIRST: nilai dasar = tampilan HP. Layar besar dinaikkan lewat
   @media (min-width:...) di blok RESPONSIF paling bawah. */
.hp-hero{position:relative;z-index:1;padding:120px 0 64px;}
.hp-hero-grid{display:grid;grid-template-columns:1fr;gap:48px;align-items:center;}
.hp-hero-title{
  font-family:'Playfair Display',Georgia,serif;
  /* Batas bawah 2.15rem: pada 2.6rem judul memakan 5 baris di layar 360px.
     Ruas tengah 8vw (bukan 5.6vw) supaya benar-benar menskala di HP —
     pada 5.6vw nilainya selalu kalah dari batas bawah sampai lebar ~750px,
     jadi clamp-nya praktis mati di seluruh rentang mobile. */
  font-size:clamp(2.15rem,8vw,4.9rem);line-height:1.08;letter-spacing:-.022em;color:var(--ink);
  margin-bottom:26px;
}
.hp-hero-title em{font-style:italic;
  background:var(--gold-grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:var(--gold-deep);}
.hp-hero-lead{font-size:16.5px;line-height:1.8;color:var(--ink-soft);max-width:54ch;}
.hp-hero-cta{display:flex;flex-wrap:wrap;flex-direction:column;align-items:stretch;gap:12px;margin-top:38px;}
/* margin-top BESAR di sini bukan berlebihan: .hp-btn-primary punya
   box-shadow 0 4px 16px yang menjulur ~20px ke bawah tombol. Jarak 22px
   hampir seluruhnya "dimakan" bayangan itu sehingga catatan terlihat menempel.
   Ruang optis yang terasa ≈ nilai ini dikurangi ~20px. */
.hp-hero-note{margin-top:34px;font-size:13px;line-height:1.75;color:var(--ink-mute);letter-spacing:.01em;}

/* Galeri hero — tiga panel, tengah dominan */
.hp-hero-visual{position:relative;}
.hp-gallery{position:relative;height:430px;display:flex;align-items:center;justify-content:center;}
.hp-gallery-glow{position:absolute;width:420px;height:420px;border-radius:50%;
  background:radial-gradient(circle,rgba(212,175,55,.2),transparent 68%);filter:blur(30px);}
.hp-gallery-card{position:absolute;border-radius:22px;overflow:hidden;background:#EFEDE8;
  border:1px solid rgba(255,255,255,.8);
  box-shadow:0 18px 50px rgba(31,38,60,.14);
  transition:transform .5s var(--ease-lux),box-shadow .5s var(--ease-lux);}
.hp-gallery-card.is-center{width:236px;height:452px;z-index:3;}
.hp-gallery-card.is-left{width:186px;height:356px;transform:translateX(-138px) rotate(-7deg);z-index:2;opacity:.94;}
.hp-gallery-card.is-right{width:186px;height:356px;transform:translateX(138px) rotate(7deg);z-index:2;opacity:.94;}
.hp-gallery:hover .is-left{transform:translateX(-152px) rotate(-9deg);}
.hp-gallery:hover .is-right{transform:translateX(152px) rotate(9deg);}
.hp-gallery-card.is-center:hover{transform:translateY(-6px);box-shadow:0 26px 64px rgba(31,38,60,.2);}
.hp-gallery-img{width:100%;height:100%;object-fit:cover;}
.hp-gallery-ph{width:100%;height:100%;background:linear-gradient(160deg,#F4F1EA,#E7E3DA);}
.hp-gallery-ph.is-loading{animation:hp-pulse 1.6s var(--ease-soft) infinite;}
@keyframes hp-pulse{0%,100%{opacity:1}50%{opacity:.55}}

/* ══ STAT STRIP — kaca yang melayang di antara dua section ══ */
.hp-stats{
  position:relative;z-index:2;
  display:grid;grid-template-columns:1fr 1fr;
  background:var(--glass-1);
  -webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);
  border:1px solid var(--glass-border);border-radius:24px;
  box-shadow:var(--glass-shadow),var(--glass-rim);
  padding:30px 14px;
}
.hp-stat{text-align:center;padding:0 18px;position:relative;}
.hp-stat + .hp-stat::before{content:'';position:absolute;left:0;top:6px;bottom:6px;width:1px;background:rgba(212,175,55,.25);}
.hp-stat-val{font-family:'Playfair Display',serif;font-size:clamp(2rem,3.4vw,3.1rem);line-height:1;
  letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;}
.hp-stat-suffix{font-size:.5em;color:var(--gold-deep);margin-left:5px;vertical-align:super;letter-spacing:0;}
.hp-stat-label{margin-top:12px;font-size:11.5px;text-transform:uppercase;letter-spacing:.18em;color:var(--ink-mute);font-weight:500;}

/* Batang pengganti angka selagi data belum tiba.
   Tingginya DISAMAKAN dengan .hp-stat-val (font-size + line-height:1) supaya
   strip tidak berubah tinggi saat angka datang — pergeseran layout mendadak
   justru membuat halaman terasa berantakan, bukan cepat. */
.hp-stat-skel{display:block;height:clamp(2rem,3.4vw,3.1rem);width:58%;margin:0 auto;
  border-radius:9px;background:linear-gradient(90deg,
    rgba(26,26,31,.07) 0%,rgba(212,175,55,.2) 50%,rgba(26,26,31,.07) 100%);
  background-size:200% 100%;animation:hp-shimmer 1.4s linear infinite;}

/* Kilau berjalan — lebih terbaca sebagai "sedang memuat" daripada kedip
   opasitas, yang mudah disangka animasi dekoratif biasa. */
@keyframes hp-shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

/* ══ KOLEKSI TEMA ══ */
.hp-filter{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:44px;}
.hp-chip{
  padding:9px 20px;border-radius:999px;font-size:13px;font-weight:500;color:var(--ink-soft);
  background:rgba(255,255,255,.6);border:1px solid var(--line);
  transition:all .2s var(--ease-lux);
}
.hp-chip:hover{border-color:rgba(212,175,55,.5);color:var(--ink);}
.hp-chip.is-active{background:var(--ink);color:#fff;border-color:var(--ink);}

/* Kartu tema PADAT (bukan kaca) — grid berulang dengan backdrop-filter
   membuat scroll tersendat di HP kelas menengah. */
.hp-theme-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
/* display:block WAJIB: kartu kini dirender sebagai <a> (Link). Anchor default-nya
   inline, yang merusak tinggi kartu & aspect-ratio gambar di dalamnya. */
.hp-theme{display:block;border-radius:20px;overflow:hidden;background:var(--surface);border:1px solid var(--line);
  box-shadow:0 4px 18px rgba(31,38,60,.05);color:inherit;
  transition:transform .22s var(--ease-lux),box-shadow .22s var(--ease-lux),border-color .22s var(--ease-lux);}
/* Seluruh kartu dapat diklik, jadi "tombol" di dalamnya hanya hiasan —
   matikan pointer events supaya tidak ada target klik bersarang. */
.hp-theme.is-link .hp-theme-veil > *{pointer-events:none;}
.hp-theme:hover{transform:translateY(-4px);box-shadow:var(--glass-shadow-lift);border-color:rgba(212,175,55,.4);}
.hp-theme-shot{position:relative;aspect-ratio:9/16;overflow:hidden;background:#F1EFEA;}
.hp-theme-img{width:100%;height:100%;object-fit:cover;transition:transform .6s var(--ease-lux);}
.hp-theme:hover .hp-theme-img{transform:scale(1.045);}
.hp-theme-plan{position:absolute;top:12px;left:12px;padding:5px 12px;border-radius:999px;
  font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:var(--ink);
  background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  border:1px solid rgba(255,255,255,.7);}
.hp-theme-veil{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:14px;
  background:linear-gradient(to top,rgba(16,16,22,.7),transparent 52%);
  opacity:1;transition:opacity .28s var(--ease-lux);}
.hp-theme:hover .hp-theme-veil,.hp-theme:focus-within .hp-theme-veil{opacity:1;}
.hp-theme-soon{padding:11px 20px;border-radius:999px;font-size:12px;font-weight:600;
  background:rgba(255,255,255,.28);color:#fff;border:1px solid rgba(255,255,255,.4);}
.hp-theme-meta{padding:14px 14px 18px;}
.hp-theme-meta h3{font-family:'Playfair Display',serif;font-size:18px;font-weight:500;letter-spacing:-.01em;
  color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hp-theme-meta p{margin-top:7px;font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:var(--gold-text);font-weight:600;}
.hp-theme-skeleton{pointer-events:none;}
.hp-theme-skeleton .hp-theme-shot{animation:hp-pulse 1.6s var(--ease-soft) infinite;}
/* Baris teks tiruan ikut berkilau — sebelumnya DIAM sementara gambar di atasnya
   berdenyut, sehingga kartu terlihat setengah rusak, bukan sedang memuat. */
.hp-sk-line{display:block;height:11px;border-radius:6px;margin-bottom:9px;
  background:linear-gradient(90deg,
    rgba(26,26,31,.07) 0%,rgba(212,175,55,.18) 50%,rgba(26,26,31,.07) 100%);
  background-size:200% 100%;animation:hp-shimmer 1.4s linear infinite;}
.hp-empty{text-align:center;padding:88px 32px;border:1px solid var(--line);border-radius:24px;background:rgba(255,255,255,.5);}
.hp-empty h3{font-family:'Playfair Display',serif;font-size:24px;margin-bottom:12px;}
.hp-empty p{color:var(--ink-soft);max-width:44ch;margin-inline:auto;}

/* ══ CARA KERJA — angka "hantu" ══ */
.hp-steps{display:grid;grid-template-columns:1fr;gap:18px;}
.hp-step{position:relative;padding:32px 22px 28px;border-radius:24px;
  background:var(--glass-1);
  -webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);
  border:1px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-rim);
  transition:transform .22s var(--ease-lux),box-shadow .22s var(--ease-lux);}
.hp-step:hover{transform:translateY(-4px);box-shadow:var(--glass-shadow-lift),var(--glass-rim);}
.hp-step-num{position:absolute;top:12px;right:16px;
  font-family:'Playfair Display',serif;font-size:68px;line-height:1;font-weight:700;
  color:transparent;-webkit-text-stroke:1px rgba(212,175,55,.34);pointer-events:none;user-select:none;}
.hp-step h3{position:relative;font-family:'Playfair Display',serif;font-size:25px;font-weight:500;
  letter-spacing:-.01em;margin-bottom:14px;}
.hp-step p{position:relative;font-size:15px;line-height:1.7;color:var(--ink-soft);}

/* ══ FITUR — split editorial selang-seling ══ */
.hp-features{display:flex;flex-direction:column;gap:18px;}
.hp-feature{display:grid;grid-template-columns:1fr;gap:24px;align-items:center;
  padding:32px 22px;border-radius:24px;
  background:var(--glass-1);
  -webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);
  border:1px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-rim);
  transition:transform .22s var(--ease-lux),box-shadow .22s var(--ease-lux),border-color .22s var(--ease-lux);}
.hp-feature:hover{transform:translateY(-4px);box-shadow:var(--glass-shadow-lift),var(--glass-rim);border-color:rgba(212,175,55,.38);}
.hp-feature.is-flip{grid-template-columns:1fr;}
.hp-feature.is-flip .hp-feature-body{order:2;}
.hp-feature.is-flip .hp-feature-side{order:1;}
.hp-feature-eyebrow{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.2em;color:var(--gold-text);margin-bottom:16px;}
.hp-feature h3{font-family:'Playfair Display',serif;font-size:clamp(1.5rem,2.4vw,2rem);line-height:1.22;
  letter-spacing:-.015em;margin-bottom:18px;max-width:22ch;}
.hp-feature-desc{font-size:16px;line-height:1.75;color:var(--ink-soft);max-width:60ch;}
.hp-feature-points{display:flex;flex-wrap:wrap;gap:12px 26px;margin-top:26px;}
.hp-feature-points li{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:500;color:var(--ink);}
.hp-feature-points svg{width:15px;height:15px;flex:none;color:var(--gold-deep);}
.hp-feature-side{display:grid;place-items:center;justify-items:start;}
.hp-feature-index{font-family:'Playfair Display',serif;font-size:84px;line-height:1;font-weight:700;
  color:transparent;-webkit-text-stroke:1px rgba(212,175,55,.3);user-select:none;}

/* Layanan tambahan — daftar hairline di permukaan padat */
.hp-addons{margin-top:48px;padding:32px 24px;border-radius:24px;background:var(--surface);border:1px solid var(--line);}
.hp-addon-list{display:grid;gap:0;}
.hp-addon{display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:10px;
  padding:24px 0;border-bottom:1px solid var(--line);}
.hp-addon:last-child{border-bottom:none;}
.hp-addon h4{font-family:'Playfair Display',serif;font-size:19px;font-weight:500;margin-bottom:7px;}
.hp-addon p{font-size:14.5px;line-height:1.7;color:var(--ink-soft);max-width:62ch;}
.hp-addon-price{flex:none;font-size:14px;font-weight:600;color:var(--gold-text);white-space:nowrap;padding-top:3px;}

/* ══ HARGA ══ */
.hp-plans{display:grid;grid-template-columns:1fr;gap:22px;align-items:start;max-width:460px;margin-inline:auto;}
.hp-plan{position:relative;padding:34px 24px 30px;border-radius:24px;
  background:var(--glass-1);
  -webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);
  border:1px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-rim);
  display:flex;flex-direction:column;
  transition:transform .22s var(--ease-lux),box-shadow .22s var(--ease-lux),border-color .22s var(--ease-lux);}
.hp-plan:hover{transform:translateY(-4px);box-shadow:var(--glass-shadow-lift),var(--glass-rim);}
.hp-plan.is-best{background:var(--glass-3);border-color:rgba(212,175,55,.5);
  box-shadow:0 18px 54px rgba(184,134,11,.16),var(--glass-rim);}
.hp-plan-flag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);
  padding:7px 20px;border-radius:999px;white-space:nowrap;
  font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;
  background:var(--gold-grad);color:#26200C;box-shadow:0 5px 16px rgba(212,175,55,.34);}
.hp-plan-name{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.2em;color:var(--ink-mute);margin-bottom:20px;}
.hp-plan.is-best .hp-plan-name{color:var(--gold-text);}
.hp-plan-price{font-family:'Playfair Display',serif;font-size:clamp(2.1rem,3.2vw,2.9rem);line-height:1;
  letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;}
.hp-plan-cur{font-size:.46em;color:var(--ink-mute);margin-right:7px;vertical-align:super;letter-spacing:0;}
.hp-plan-term{margin-top:12px;font-size:13px;color:var(--ink-mute);}
.hp-plan-rule{display:block;height:1px;margin:30px 0;
  background:linear-gradient(90deg,rgba(212,175,55,.32),transparent);}
.hp-plan-list{display:flex;flex-direction:column;gap:14px;margin-bottom:34px;flex:1;}
.hp-plan-list li{display:flex;align-items:flex-start;gap:11px;font-size:14.5px;line-height:1.6;color:var(--ink-soft);}
.hp-plan-list svg{width:16px;height:16px;flex:none;margin-top:3px;color:var(--gold-deep);}
.hp-plan .hp-btn{text-transform:capitalize;}
/* Isinya sudah berkilau sendiri (.hp-sk-line), jadi kartunya TIDAK ikut
   berdenyut — dua animasi bertumpuk membuat gerakannya terbaca kacau. */
.hp-plan-skeleton{min-height:430px;display:flex;flex-direction:column;}
.hp-plan-skeleton .hp-sk-btn{height:46px;width:100%;border-radius:999px;margin-top:auto;}
.hp-sk-rule{display:block;height:1px;margin:26px 0 22px;
  background:linear-gradient(90deg,rgba(212,175,55,.3),transparent);}

/* ══ TESTIMONI ══
   Mobile: 1 kartu per layar, digeser dengan scroll-snap NATIF.
   PC (≥860px): kembali jadi grid 3 kolom biasa, tanpa geser.

   Catatan: kartu memakai flex-basis 100%, BUKAN width:100%. Pada scroller
   horizontal, lebar persen bisa dihitung terhadap scrollWidth (bukan viewport
   scroller) di sebagian peramban, dan kartu jadi menciut. */
.hp-testi-grid{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;
  scroll-behavior:smooth;-webkit-overflow-scrolling:touch;
  /* Padding bawah memberi ruang untuk bayangan kartu saat hover/lift. */
  padding-bottom:8px;
  scrollbar-width:none;}
.hp-testi-grid::-webkit-scrollbar{display:none;}
.hp-testi-grid > .hp-testi{flex:0 0 100%;scroll-snap-align:start;min-width:0;}

/* ── Indikator: panah + ruas progres. TANPA teks & tanpa angka. ──
   Catatan riset (NN/g, Smashing, WCAG 2.2) yang tetap dipatuhi:
   • Titik polos dihindari — di sini ruas selebar penuh, bukan titik 8px.
   • Sasaran sentuh minimal 24×24px (WCAG 2.5.8) → dipenuhi lewat ::before
     transparan, sehingga garis tetap tampak tipis.
   • Kontrol dikelompokkan berdekatan agar ganti arah tidak perlu jauh.
   3 anak saja: panah-kiri, ruas, panah-kanan. */
.hp-testi-nav{display:grid;grid-template-columns:auto 1fr auto;align-items:center;
  gap:14px;margin-top:28px;}

.hp-testi-arrow{width:40px;height:40px;flex:none;display:grid;place-items:center;
  padding:0;cursor:pointer;border-radius:50%;color:var(--ink-soft);
  background:var(--glass-1);
  -webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);
  border:1px solid var(--glass-border);box-shadow:var(--glass-rim);
  transition:color .22s var(--ease-lux),border-color .22s var(--ease-lux),
             background .22s var(--ease-lux),transform .22s var(--ease-lux);}
.hp-testi-arrow svg{width:17px;height:17px;}
.hp-testi-arrow:hover{color:var(--gold-text);border-color:rgba(212,175,55,.5);transform:scale(1.06);}
.hp-testi-arrow:active{transform:scale(.96);}

/* Deretan ruas progres. Lebar rata (flex:1) → banyaknya ruas = jumlah halaman. */
.hp-testi-track{display:flex;align-items:center;gap:6px;min-width:0;}

/* Ruas TERLIHAT setipis 4px demi kesan halus, tetapi area SENTUHNYA
   dilebarkan jadi 24px lewat ::before transparan di bawah ini — WCAG 2.5.8
   mengukur sasaran sentuh, bukan piksel yang tampak. Ini yang membuat garis
   tetap ramping tanpa menyulitkan jari. */
.hp-testi-seg{position:relative;flex:1;min-width:0;height:4px;padding:0;
  cursor:pointer;border:0;border-radius:999px;background:rgba(26,26,31,.12);
  transition:background .22s var(--ease-lux);}
.hp-testi-seg::before{content:'';position:absolute;left:0;right:0;top:50%;
  height:24px;transform:translateY(-50%);}
.hp-testi-seg:hover{background:rgba(212,175,55,.3);}
/* Halaman yang sudah lewat tetap emas pudar — jejak "sudah sampai mana". */
.hp-testi-seg.is-past{background:rgba(212,175,55,.45);}

/* Isian ruas aktif: satu-satunya penanda bahwa carousel berjalan sendiri
   dan seberapa dekat pergantian berikutnya. Tanpa teks, tanpa angka. */
.hp-testi-seg-fill{position:absolute;inset:0;border-radius:999px;
  background:linear-gradient(90deg,var(--gold),var(--gold-deep));
  transform:scaleX(0);transform-origin:left center;
  /* Transisi pendek: nilai diperbarui tiap 50ms; transisi panjang membuat
     isian tertinggal jauh di belakang waktu sebenarnya. */
  transition:transform .05s linear;}

.hp-testi{margin:0;padding:28px 22px;border-radius:24px;
  background:var(--glass-1);
  -webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);
  border:1px solid var(--glass-border);box-shadow:var(--glass-shadow),var(--glass-rim);
  display:flex;flex-direction:column;
  transition:transform .22s var(--ease-lux),box-shadow .22s var(--ease-lux),border-color .22s var(--ease-lux);}
.hp-testi:hover{transform:translateY(-4px);box-shadow:var(--glass-shadow-lift),var(--glass-rim);border-color:rgba(212,175,55,.38);}
.hp-testi-stars{font-size:15px;letter-spacing:.16em;color:var(--gold);margin-bottom:22px;}
.hp-testi-stars-off{color:rgba(26,26,31,.14);}
.hp-testi blockquote{margin:0 0 30px;font-size:15.5px;line-height:1.78;color:var(--ink-soft);flex:1;}
.hp-testi blockquote::before{content:'\\201C';}
.hp-testi blockquote::after{content:'\\201D';}
.hp-testi figcaption{display:flex;align-items:center;gap:14px;}
.hp-testi-avatar{width:44px;height:44px;flex:none;border-radius:50%;display:grid;place-items:center;
  font-size:13.5px;font-weight:600;letter-spacing:.04em;color:var(--gold-text);
  background:linear-gradient(140deg,#FBF4E2,#F0E2C0);border:1px solid rgba(212,175,55,.34);}
.hp-testi figcaption strong{display:block;font-family:'Playfair Display',serif;font-size:16px;font-weight:600;color:var(--ink);}
.hp-testi figcaption small{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:12.5px;color:var(--ink-mute);}
.hp-testi figcaption small svg{width:13px;height:13px;flex:none;}

/* ══ FAQ — permukaan padat (teks panjang jangan di atas kaca) ══ */
.hp-faq-wrap{display:grid;grid-template-columns:1fr;gap:36px;align-items:start;}
.hp-faq-aside{position:static;}
.hp-faq-aside .hp-btn{margin-top:30px;}
.hp-faq-list{display:flex;flex-direction:column;border-top:1px solid var(--line);}
.hp-faq{border-bottom:1px solid var(--line);}
.hp-faq > button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:26px;
  padding:26px 4px;text-align:left;transition:color .2s var(--ease-lux);}
.hp-faq > button span{font-family:'Playfair Display',serif;font-size:19px;font-weight:500;letter-spacing:-.01em;line-height:1.4;}
.hp-faq > button svg{width:19px;height:19px;flex:none;color:var(--gold-deep);transition:transform .3s var(--ease-lux);}
.hp-faq:hover > button{color:var(--gold-deep);}
.hp-faq.is-open > button svg{transform:rotate(180deg);}
.hp-faq-panel{display:grid;grid-template-rows:0fr;opacity:0;
  transition:grid-template-rows .34s var(--ease-lux),opacity .28s var(--ease-lux);}
.hp-faq.is-open .hp-faq-panel{grid-template-rows:1fr;opacity:1;}
.hp-faq-panel > div{overflow:hidden;}
.hp-faq-panel p{padding:0 4px 28px;font-size:15.5px;line-height:1.8;color:var(--ink-soft);white-space:pre-line;max-width:66ch;}

/* ══ CTA PENUTUP — gelap, tempat emas benar-benar bersinar ══ */
.hp-final{position:relative;z-index:1;padding:80px 0;background:#131318;overflow:hidden;}
.hp-final::before{content:'';position:absolute;width:900px;height:900px;top:-46%;left:50%;transform:translateX(-50%);
  background:radial-gradient(circle,rgba(212,175,55,.19),transparent 66%);pointer-events:none;}
.hp-final-inner{position:relative;text-align:center;max-width:760px;margin-inline:auto;}
.hp-final-inner .hp-eyebrow::after{margin-inline:auto;}
.hp-final-title{font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(2.1rem,4.4vw,3.6rem);line-height:1.14;letter-spacing:-.02em;color:#FBFAF7;margin-bottom:24px;}
.hp-final-lead{font-size:17px;line-height:1.75;color:rgba(251,250,247,.66);max-width:52ch;margin-inline:auto;}
.hp-final-cta{display:flex;flex-wrap:wrap;flex-direction:column;gap:12px;justify-content:center;margin-top:36px;}

/* ══ FOOTER ══ */
/* ══ FOOTER — MOBILE-FIRST ══
   Dasar = tampilan HP. Tiga koreksi utama dibanding versi sebelumnya:
   1. Kolom tautan TIDAK lagi menumpuk satu per satu (footer jadi sangat
      panjang di HP). "Jelajahi" & "Akun" berbagi 2 kolom sejak layar terkecil.
   2. Baris tautan diberi min-height 44px — sebelumnya setinggi teks saja
      (~22px), di bawah ambang sasaran sentuh dan sulit ditekan jari.
   3. Padding & jarak dikecilkan di HP, baru membesar di layar lebar. */
.hp-footer{position:relative;z-index:1;background:#0E0E12;color:rgba(251,250,247,.62);padding:48px 0 24px;}
.hp-footer-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px 20px;padding-bottom:34px;
  border-bottom:1px solid rgba(255,255,255,.09);}
/* Blok merek membentang penuh; hanya kolom tautan yang berbagi dua kolom. */
.hp-footer-brand{grid-column:1/-1;}
.hp-footer-brand .hp-brand-mark{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.14);margin-bottom:16px;}
.hp-footer-name{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;color:#FBFAF7;margin-bottom:12px;}
.hp-footer-desc{font-size:14px;line-height:1.7;max-width:38ch;}
.hp-social{display:flex;gap:10px;margin-top:20px;}
.hp-social a{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:rgba(251,250,247,.78);
  transition:all .2s var(--ease-lux);}
.hp-social a:hover{background:rgba(212,175,55,.16);border-color:rgba(212,175,55,.5);color:var(--gold-light);transform:translateY(-2px);}
.hp-social svg{width:18px;height:18px;}
/* Kolom Kontak membentang penuh: alamat surel panjang dan akan terpotong
   kalau dipaksa masuk setengah lebar layar HP. */
.hp-footer-col.is-wide{grid-column:1/-1;}
.hp-footer-col h4{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;color:var(--gold-light);margin-bottom:10px;}
.hp-footer-col ul{display:flex;flex-direction:column;gap:0;}
/* min-height 44px: nyaman ditekan jari, sekaligus menghapus kebutuhan gap. */
.hp-footer-col a{display:flex;align-items:center;gap:10px;min-height:44px;
  font-size:14.5px;transition:color .2s var(--ease-lux);word-break:break-word;}
.hp-footer-col a:hover{color:var(--gold-light);}
.hp-footer-col svg{width:16px;height:16px;flex:none;color:var(--gold-deep);}
.hp-footer-base{display:flex;flex-wrap:wrap;flex-direction:column;text-align:center;justify-content:center;gap:10px;padding-top:26px;font-size:12.5px;color:rgba(251,250,247,.4);}

/* ══ OVERLAY PRATINJAU TEMA ══
   Fullscreen di atas halaman; halaman di belakangnya tetap hidup sehingga
   menutup overlay terasa instan (posisi gulir & data tidak hilang). */
.hp-ov{position:fixed;inset:0;z-index:200;display:flex;align-items:stretch;justify-content:center;}
.hp-ov-scrim{position:absolute;inset:0;background:rgba(16,16,22,.55);
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  animation:hp-ov-fade .25s var(--ease-lux);}
.hp-ov-panel{position:relative;display:flex;flex-direction:column;width:100%;
  background:var(--bg);animation:hp-ov-rise .3s var(--ease-lux);overflow:hidden;}
@keyframes hp-ov-fade{from{opacity:0}to{opacity:1}}
@keyframes hp-ov-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

/* Bilah tetap selebar layar (garis bawahnya membentang penuh), tetapi ISI-nya
   dikunci ke 1240px lewat pembungkus dalam supaya sebaris dengan konten. */
.hp-ov-bar{flex:none;border-bottom:1px solid rgba(212,175,55,.18);
  background:rgba(255,255,255,.82);
  -webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);}
.hp-ov-bar-inner{width:100%;max-width:1240px;margin:0 auto;
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  height:60px;padding:0 20px;}
.hp-ov-close{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:500;
  color:var(--ink-soft);padding:9px 14px;border-radius:999px;border:1px solid var(--line);
  background:rgba(255,255,255,.7);transition:all .2s var(--ease-lux);}
.hp-ov-close:hover{color:var(--ink);border-color:rgba(212,175,55,.45);}
.hp-ov-close svg{width:17px;height:17px;flex:none;}
.hp-ov-bar-title{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:600;
  letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  max-width:40vw;text-align:center;}

/* Badan overlay bergulir sendiri (bukan body) supaya halaman di belakang diam.
   Peran scroll dan peran grid SENGAJA dipisah: pembungkus luar yang bergulir
   (lebar penuh, agar bilah gulir menempel di tepi layar), sedangkan isinya
   dibatasi .hp-ov-inner dengan max-width & margin auto yang SAMA PERSIS dengan
   .hp-container — supaya konten overlay sejajar dengan halaman utama. */
.hp-ov-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.hp-ov-inner{width:100%;max-width:1240px;margin:0 auto;
  display:grid;grid-template-columns:1fr;gap:32px;padding:28px 20px 44px;align-content:start;}

/* MOBILE-FIRST: yang diklik pengunjung adalah TEMA — maka pratinjaunya harus
   yang pertama terlihat, bukan hasil menggulir panjang. Urutan DOM dibiarkan
   apa adanya (keterangan dulu) demi pembaca layar & desktop; di layar sempit
   urutan VISUAL dibalik memakai properti order. Tanpa ini, di HP pengunjung
   melewati seluruh keterangan + galeri "Tema Lainnya" sebelum melihat
   temanya sendiri. */
.hp-ov-stage{order:1;}
.hp-ov-info{order:2;}
.hp-ov-others{order:3;}

.hp-ov-title{font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(1.9rem,6vw,2.6rem);line-height:1.12;letter-spacing:-.02em;margin-bottom:18px;}
.hp-ov-tags{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:24px;}
.hp-ov-tag{padding:7px 15px;border-radius:999px;font-size:11.5px;font-weight:600;
  text-transform:uppercase;letter-spacing:.14em;color:var(--ink-soft);
  background:rgba(255,255,255,.7);border:1px solid var(--line);}
.hp-ov-tag.is-plan{color:#26200C;background:var(--gold-grad);border-color:rgba(245,228,168,.6);}
.hp-ov-desc{font-size:15.5px;line-height:1.8;color:var(--ink-soft);max-width:60ch;margin-bottom:28px;}
.hp-ov-desc strong{color:var(--ink);font-weight:600;}

.hp-ov-note{display:flex;gap:14px;padding:18px 20px;border-radius:18px;
  background:linear-gradient(140deg,rgba(251,244,226,.92),rgba(255,255,255,.72));
  border:1px solid rgba(212,175,55,.34);
  box-shadow:0 6px 22px rgba(184,134,11,.09),var(--glass-rim);margin-bottom:30px;}
.hp-ov-note-ico{flex:none;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;
  background:var(--gold-grad);color:#26200C;box-shadow:0 3px 10px rgba(212,175,55,.3);}
.hp-ov-note-ico svg{width:20px;height:20px;}
.hp-ov-note-title{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:6px;line-height:1.5;}
.hp-ov-note-body{font-size:13px;line-height:1.75;color:var(--ink-soft);}

.hp-ov-points{display:flex;flex-direction:column;gap:13px;margin-bottom:34px;}
.hp-ov-points li{display:flex;align-items:center;gap:10px;font-size:14.5px;color:var(--ink-soft);}
.hp-ov-points svg{width:16px;height:16px;flex:none;color:var(--gold-deep);}
.hp-ov-cta{display:flex;flex-direction:column;gap:12px;}
.hp-ov-cta .hp-btn{width:100%;}

/* Panggung pratinjau — iframe polos, tanpa mockup perangkat. */
.hp-ov-stage{display:flex;flex-direction:column;align-items:center;gap:14px;}
.hp-ov-screen{position:relative;width:100%;max-width:460px;aspect-ratio:9/17;
  border-radius:20px;overflow:hidden;background:#F1EFEA;border:1px solid var(--line);
  box-shadow:0 12px 40px rgba(31,38,60,.12);}
.hp-ov-frame{width:100%;height:100%;border:0;display:block;}
.hp-ov-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:14px;background:#F7F5F0;color:var(--ink-mute);font-size:13.5px;text-align:center;padding:24px;}
.hp-ov-spinner{width:32px;height:32px;border-radius:50%;
  border:3px solid rgba(212,175,55,.22);border-top-color:var(--gold);animation:hp-ov-spin .8s linear infinite;}
@keyframes hp-ov-spin{to{transform:rotate(360deg)}}
.hp-ov-reload{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;
  color:var(--ink-mute);padding:9px 16px;border-radius:999px;border:1px solid var(--line);
  background:rgba(255,255,255,.6);transition:all .2s var(--ease-lux);}
.hp-ov-reload:hover{color:var(--ink);border-color:rgba(212,175,55,.45);}
.hp-ov-reload svg{width:15px;height:15px;}

.hp-ov-others{margin-top:36px;padding-top:28px;border-top:1px solid var(--line);}
.hp-ov-others-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:22px;}
.hp-ov-other{display:block;text-align:left;transition:transform .2s var(--ease-lux);}
.hp-ov-other:hover{transform:translateY(-3px);}
.hp-ov-other-shot{display:block;aspect-ratio:9/16;border-radius:12px;overflow:hidden;
  background:#F1EFEA;border:1px solid var(--line);}
.hp-ov-other-shot img{width:100%;height:100%;object-fit:cover;}
.hp-ov-other-name{display:block;margin-top:9px;font-family:'Playfair Display',Georgia,serif;
  font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* ══ REVEAL ══
   PENTING: konten TERLIHAT secara bawaan. Keadaan tersembunyi HANYA aktif
   setelah JS memasang .hp-reveal-ready di root (progressive enhancement).
   Kalau observer gagal/JS mati, halaman tetap terbaca penuh — jangan pernah
   menggantungkan visibilitas konten pada IntersectionObserver. */
.hp-root.hp-reveal-ready [data-reveal]{opacity:0;transform:translateY(24px);
  transition:opacity .8s var(--ease-lux),transform .8s var(--ease-lux);}
.hp-root.hp-reveal-ready [data-reveal].is-in{opacity:1;transform:none;}
.hp-root [data-reveal-delay="1"]{transition-delay:.1s;}
.hp-root [data-reveal-delay="2"]{transition-delay:.2s;}
.hp-root [data-reveal-delay="3"]{transition-delay:.3s;}
.hp-root [data-reveal-delay="4"]{transition-delay:.4s;}

/* ══ Fallback: peramban tanpa backdrop-filter → permukaan padat, bukan teks melayang ══ */
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .hp-nav.is-solid,.hp-stats,.hp-step,.hp-feature,.hp-plan,.hp-testi,.hp-btn-ghost,.hp-theme-plan{
    background:rgba(255,255,255,.95);
  }
  .hp-plan.is-best{background:#fff;}
}

/* ══ Aksesibilitas ══ */
.hp-root :focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:6px;}
@media (prefers-reduced-motion:reduce){
  .hp-root [data-reveal]{opacity:1;transform:none;transition:none;}
  .hp-root *{animation-duration:.01ms!important;transition-duration:.01ms!important;}
  /* Kerangka muat: animasi dimatikan aturan di atas, dan tanpa ini gradien
     berhenti di posisi acak sehingga terlihat seperti batang belang yang
     rusak. Diberi warna rata supaya tetap terbaca sebagai penampung kosong. */
  .hp-root .hp-sk-line,.hp-root .hp-stat-skel{
    background:rgba(26,26,31,.09);background-size:auto;}
}
/* Perangkat yang meminta transparansi dikurangi → kaca jadi hampir padat. */
@media (prefers-reduced-transparency:reduce){
  .hp-nav.is-solid,.hp-stats,.hp-step,.hp-feature,.hp-plan,.hp-testi{
    background:rgba(255,255,255,.94);
    -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  }
}

/* ══════════ RESPONSIF — MOBILE-FIRST ══════════
   Nilai dasar di atas = tampilan HP. Tiap blok di bawah MENAIKKAN ke layar
   yang lebih besar. Urutan menaik, jadi aturan berikutnya menimpa sebelumnya. */

/* ── HP besar (≥480px) ── */
@media (min-width:480px){
  .hp-container{padding:0 24px;}
  .hp-addon{flex-direction:row;align-items:flex-start;}
  .hp-footer-base{flex-direction:row;text-align:left;}
}

/* ── Tablet (≥640px) ── */
@media (min-width:640px){
  .hp-ov-cta{flex-direction:row;}
  .hp-ov-cta .hp-btn{width:auto;}
  .hp-ov-bar-inner{height:66px;padding:0 24px;}
  .hp-ov-inner{padding:36px 24px 56px;gap:40px;}
  .hp-ov-others-grid{grid-template-columns:repeat(4,1fr);gap:14px;}
  .hp-section{padding:88px 0;}
  .hp-hero{padding:132px 0 56px;}
  .hp-hero-cta{flex-direction:row;align-items:center;gap:14px;margin-top:44px;}
  .hp-hero-cta .hp-btn{width:auto;}
  .hp-hero-note{margin-top:38px;}
  .hp-final-cta{flex-direction:row;justify-content:center;}
  .hp-final-cta .hp-btn{width:auto;}
  .hp-theme-grid{grid-template-columns:repeat(3,1fr);gap:20px;}
  /* Masih carousel di sini, tapi 2 kartu terlihat sekaligus. */
  .hp-testi-grid{gap:22px;}
  .hp-testi-grid > .hp-testi{flex-basis:calc((100% - 22px) / 2);}
  /* Satu baris: tombol jeda pindah ke kolom ke-4, tak lagi turun ke bawah. */
  .hp-testi-nav{gap:16px;}
  .hp-testi-track{gap:8px;}
  /* Cukup lebar untuk 3 kolom tautan sejajar; Kontak tak perlu penuh lagi. */
  .hp-footer-grid{grid-template-columns:repeat(3,1fr);gap:36px 24px;padding-bottom:40px;}
  .hp-footer-col.is-wide{grid-column:auto;}
  .hp-footer{padding:60px 0 26px;}
  .hp-footer-name{font-size:21px;}
  .hp-footer-desc{font-size:14.5px;}
  .hp-steps{gap:24px;}
  .hp-feature,.hp-feature.is-flip{padding:44px 38px;}
  .hp-addons{padding:44px 40px;}
  .hp-plan{padding:42px 34px 38px;}
  .hp-testi{padding:34px 30px;}
  .hp-step{padding:40px 32px 36px;}
  .hp-stats{padding:34px 20px;}
  .hp-final{padding:96px 0;}
  .hp-footer{padding:72px 0 32px;}
}

/* ── Tablet besar (≥860px) ── */
@media (min-width:860px){
  .hp-section{padding:104px 0;}
  .hp-container{padding:0 32px;}
  .hp-steps{grid-template-columns:repeat(3,1fr);gap:26px;}
  .hp-stats{grid-template-columns:repeat(4,1fr);padding:36px 22px;}
  .hp-theme-grid{grid-template-columns:repeat(4,1fr);gap:22px;}
  /* PC: kembali ke grid 3 kolom. overflow:visible WAJIB — scroller yang
     masih hidup akan memotong bayangan kartu saat hover. */
  .hp-testi-grid{display:grid;grid-template-columns:repeat(3,1fr);
    overflow:visible;scroll-snap-type:none;padding-bottom:0;}
  .hp-testi-grid > .hp-testi{flex-basis:auto;scroll-snap-align:none;}
  .hp-testi-nav{display:none;}
  .hp-plans{grid-template-columns:repeat(3,1fr);gap:24px;max-width:none;}
  .hp-plan.is-best{order:0;}
  .hp-section-head{margin-bottom:56px;}
  .hp-features{gap:22px;}
  /* Hover baru diaktifkan di sini: di layar sentuh veil harus selalu tampil. */
  .hp-theme-veil{opacity:0;background:linear-gradient(to top,rgba(16,16,22,.72),rgba(16,16,22,.08) 46%,transparent);}
}

/* ── Desktop (≥1081px): nav penuh, layout dua kolom ── */
@media (min-width:1081px){
  /* Dua kolom: keterangan bergulir di kiri, pratinjau menempel di kanan.
     Di sini properti order dikembalikan normal — layar lebar menampilkan
     keterangan dan pratinjau BERSAMAAN, jadi tak perlu ada yang didahulukan. */
  .hp-ov-inner{grid-template-columns:1fr 480px;gap:56px 56px;padding:44px 32px 64px;align-content:start;}
  .hp-ov-info{order:0;grid-column:1;grid-row:1;}
  .hp-ov-stage{order:0;grid-column:2;grid-row:1;position:sticky;top:0;align-self:start;}
  /* "Tema Lainnya" membentang penuh di bawah kedua kolom. Tanpa penempatan
     eksplisit ini, ia akan terjepit jadi kolom ke-3 yang tak pernah ada. */
  .hp-ov-others{order:0;grid-column:1/-1;grid-row:2;margin-top:8px;}
  .hp-ov-bar-inner{padding:0 32px;}
  .hp-ov-screen{max-width:480px;}
  .hp-ov-others-grid{grid-template-columns:repeat(6,1fr);}
  .hp-nav-links{display:flex;}
  .hp-burger{display:none;}
  .hp-mobile-menu{display:none;}
  .hp-section{padding:128px 0;}
  .hp-hero{padding:180px 0 72px;}
  .hp-hero-grid{grid-template-columns:1.05fr .95fr;gap:64px;}
  .hp-hero-lead{font-size:18px;}
  /* :not(.hp-section-head-center) WAJIB: tanpa itu override 2 kolom ini
     (spesifisitas setara, ditulis belakangan) menimpa varian center, isinya
     jatuh ke kolom kiri dan judul terlihat melenceng dari tengah. */
  .hp-section-head:not(.hp-section-head-center){grid-template-columns:1fr 1fr;gap:48px;align-items:end;margin-bottom:64px;}
  .hp-section-head-center{margin-bottom:64px;}
  .hp-faq-wrap{grid-template-columns:.8fr 1.2fr;gap:72px;}
  .hp-faq-aside{position:sticky;top:112px;}
  /* Baru di sini merek sejajar dengan kolom tautan (4 kolom satu baris).
     grid-column WAJIB dikembalikan: di bawah ini ia membentang penuh. */
  .hp-footer-grid{grid-template-columns:1.5fr 1fr 1fr 1.2fr;gap:56px;padding-bottom:56px;}
  .hp-footer-brand{grid-column:auto;}
  .hp-feature{grid-template-columns:1fr 250px;gap:40px;padding:52px 56px;}
  .hp-feature.is-flip{grid-template-columns:250px 1fr;}
  .hp-feature.is-flip .hp-feature-body{order:2;}
  .hp-feature.is-flip .hp-feature-side{order:1;}
  .hp-feature-side{justify-items:center;}
  .hp-feature-index{font-size:132px;}
  .hp-theme-grid{grid-template-columns:repeat(auto-fill,minmax(216px,1fr));gap:26px;}
  .hp-testi-grid{gap:26px;}
  .hp-addons{margin-top:72px;padding:52px 56px;}
  .hp-final{padding:112px 0;}
  .hp-footer{padding:88px 0 36px;}
  .hp-gallery{height:520px;}
}
`}</style>
    );
}
