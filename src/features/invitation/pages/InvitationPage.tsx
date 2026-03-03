import { useEffect, useState, useRef } from 'react';
import '../invitation.css';
import { useParams } from 'react-router-dom';
import { publicApi } from '@/core/api/endpoints';
import type { Wish, InvitationContent, TimelineItem } from '@/types';
import { HiOutlineMusicNote, HiPause, HiPlay } from 'react-icons/hi';

interface TenantPublic {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    domain_slug: string;
}

interface InvitationData {
    tenant: TenantPublic;
    wishes: Wish[];
    content: Partial<InvitationContent>;
}

interface InvitationPageProps {
    previewData?: Partial<InvitationContent> | null;
}

export function InvitationPage({ previewData }: InvitationPageProps) {
    const { slug } = useParams<{ slug: string }>();
    const [data, setData] = useState<InvitationData | null>(null);
    const [loading, setLoading] = useState(!previewData); // Only load if not previewing
    const [error, setError] = useState('');
    const [isOpened, setIsOpened] = useState(false);
    const [wishes, setWishes] = useState<Wish[]>([]);

    // We merge the fetched content with the injected previewData (which takes precedence)
    const activeContent = previewData || data?.content || {};

    // Parse Timeline if exists
    let timeline: TimelineItem[] = [];
    if (activeContent.timeline_kisah) {
        try {
            timeline = JSON.parse(activeContent.timeline_kisah);
        } catch { }
    }

    const { tenant } = data || {
        // Demo fallback for previewing without fetching a tenant
        tenant: {
            bride_name: 'Fiona',
            groom_name: 'Galang',
            wedding_date: '2026-10-20',
            domain_slug: 'demo'
        }
    };

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [youtubeId, setYoutubeId] = useState<string | null>(null);

    useEffect(() => {
        const musicLink = activeContent.link_backsound_music;
        if (!musicLink) return;

        // Check if it's a YouTube link
        const ytMatch = musicLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/))([^&?\n]+)/);
        if (ytMatch && ytMatch[1]) {
            setYoutubeId(ytMatch[1]);
            // YouTube iframe logic handled in JSX
            return;
        }

        // Standard Audio logic
        if (!audioRef.current) {
            audioRef.current = new Audio(musicLink);
            audioRef.current.loop = true;
        }

        if (isPlaying) {
            audioRef.current.play().catch(console.error);
        } else {
            audioRef.current.pause();
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, [isPlaying, activeContent.link_backsound_music]);

    // RSVP State
    const [rsvpCode, setRsvpCode] = useState('');
    const [rsvpStatus, setRsvpStatus] = useState<'confirmed' | 'declined'>('confirmed');
    const [rsvpGuests, setRsvpGuests] = useState(1);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [rsvpResult, setRsvpResult] = useState<{ success: boolean; message: string } | null>(null);

    // Wish State
    const [wishName, setWishName] = useState('');
    const [wishMessage, setWishMessage] = useState('');
    const [wishLoading, setWishLoading] = useState(false);

    // Countdown
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    // Sections ref for scroll animation
    const sectionsRef = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        if (slug && !previewData) fetchInvitation();
    }, [slug, previewData]);

    useEffect(() => {
        // Safe check for tenant data
        const weddingDateStr = data?.tenant?.wedding_date || tenant?.wedding_date;
        if (!weddingDateStr) return;

        const interval = setInterval(() => {
            const target = new Date(weddingDateStr).getTime();
            const now = Date.now();
            const diff = Math.max(0, target - now);
            setCountdown({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000),
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [data, tenant?.wedding_date]);

    // Scroll animation observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('inv-visible');
                    }
                });
            },
            { threshold: 0.15 }
        );
        sectionsRef.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [isOpened, data, previewData]);

    const fetchInvitation = async () => {
        try {
            const res = await publicApi.getInvitation(slug!);
            if (res.success) {
                setData(res.data);
                setWishes(res.data.wishes || []);
            } else {
                setError(res.message || 'Invitation not found');
            }
        } catch {
            setError('Failed to load invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleRSVP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rsvpCode.trim()) return;
        setRsvpLoading(true);
        setRsvpResult(null);
        try {
            const res = await publicApi.submitRSVP({
                slug: slug!,
                invitation_code: rsvpCode.trim(),
                status: rsvpStatus,
                number_of_guests: rsvpGuests,
            });
            setRsvpResult({ success: res.success, message: res.message });
            if (res.success) setRsvpCode('');
        } catch {
            setRsvpResult({ success: false, message: 'Failed to submit RSVP' });
        } finally {
            setRsvpLoading(false);
        }
    };

    const handleWish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wishName.trim() || !wishMessage.trim()) return;
        setWishLoading(true);
        try {
            const res = await publicApi.submitWish({
                slug: slug!,
                guest_name: wishName.trim(),
                message: wishMessage.trim(),
            });
            if (res.success && res.data) {
                setWishes((prev) => [res.data, ...prev]);
                setWishName('');
                setWishMessage('');
            }
        } catch {
            // silent fail
        } finally {
            setWishLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Baru saja';
        if (mins < 60) return `${mins} menit lalu`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} jam lalu`;
        const days = Math.floor(hours / 24);
        return `${days} hari lalu`;
    };

    const getBool = (val: any) => {
        if (typeof val === 'boolean') return val;
        return val === 'true' || val === '1';
    };

    // LOADING
    if (loading) {
        return (
            <div className="inv-page inv-loading">
                <div className="inv-spinner" />
                <p>Memuat undangan...</p>
            </div>
        );
    }

    // ERROR
    if (error || (!data && !previewData)) {
        return (
            <div className="inv-page inv-error">
                <div className="inv-error-icon">💌</div>
                <h2>Undangan Tidak Ditemukan</h2>
                <p>{error || 'Link undangan tidak valid.'}</p>
            </div>
        );
    }

    // COVER (before opened)
    if (!isOpened) {
        return (
            <div className="inv-page inv-cover">
                <div className="inv-cover-overlay" />
                <div className="inv-cover-content">
                    {getBool(activeContent.flag_pakai_kalimat_pembuka_custom) && activeContent.kalimat_pembuka_undangan && (
                        <p className="inv-cover-opening text-sm italic font-serif text-white/90 mb-6 max-w-sm mx-auto text-center leading-relaxed">
                            {activeContent.kalimat_pembuka_undangan}
                        </p>
                    )}
                    <p className="inv-cover-label">The Wedding Of</p>
                    <h1 className="inv-cover-names">
                        {tenant.groom_name} <span>&</span> {tenant.bride_name}
                    </h1>
                    <p className="inv-cover-date">{formatDate(tenant.wedding_date)}</p>
                    <button className="inv-cover-btn mt-6" onClick={() => { setIsOpened(true); setIsPlaying(true); }}>
                        <span>💌</span> Buka Undangan
                    </button>
                </div>
                <div className="inv-cover-ornament inv-cover-ornament-top" />
                <div className="inv-cover-ornament inv-cover-ornament-bottom" />
            </div>
        );
    }

    // MAIN INVITATION
    return (
        <div className="inv-page inv-main">

            {/* HERO */}
            <section className="inv-section inv-hero" ref={(el) => { sectionsRef.current[0] = el; }}>
                <div className="inv-hero-bg" />
                <div className="inv-hero-content inv-animate">
                    <p className="inv-hero-bismillah">
                        <span dir="rtl">{getBool(activeContent.flag_pakai_kalimat_pembuka_custom) ? activeContent.kalimat_pembuka_undangan : 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'}</span>
                    </p>
                    <p className="inv-hero-label">{activeContent.custom_kalimat_1 || 'We are getting married'}</p>
                    <h1 className="inv-hero-names">
                        {tenant.groom_name} <span className="inv-amp">&</span> {tenant.bride_name}
                    </h1>
                    <div className="inv-hero-date-badge">
                        <span>{formatDate(tenant.wedding_date)}</span>
                    </div>
                    {activeContent.custom_kalimat_2 && (
                        <p className="mt-8 text-sm max-w-md mx-auto italic opacity-90 leading-relaxed font-serif">
                            "{activeContent.custom_kalimat_2}"
                        </p>
                    )}
                </div>
            </section>

            {/* COUPLE */}
            <section className="inv-section inv-couple" ref={(el) => { sectionsRef.current[1] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Mempelai</p>
                    <h2 className="inv-section-title">Insya Allah</h2>
                    <div className="inv-couple-grid">
                        <div className="inv-couple-card">
                            <div className="inv-couple-avatar">🤵</div>
                            <h3>{tenant.groom_name}</h3>
                            <p>Mempelai Pria</p>
                            {getBool(activeContent.flag_tampilkan_nama_orang_tua) && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Putra dari Bpk. {activeContent.nama_bapak_laki_laki} & Ibu {activeContent.nama_ibu_laki_laki}
                                </p>
                            )}
                            {getBool(activeContent.flag_tampilkan_sosial_media_mempelai) && activeContent.account_media_sosial_laki_laki && (
                                <a href={`https://instagram.com/${activeContent.account_media_sosial_laki_laki.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs text-gold-600 hover:text-gold-700 mt-2 inline-block">
                                    {activeContent.account_media_sosial_laki_laki}
                                </a>
                            )}
                        </div>
                        <div className="inv-couple-divider">
                            <span className="inv-heart">♥</span>
                        </div>
                        <div className="inv-couple-card">
                            <div className="inv-couple-avatar">👰</div>
                            <h3>{tenant.bride_name}</h3>
                            <p>Mempelai Wanita</p>
                            {getBool(activeContent.flag_tampilkan_nama_orang_tua) && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Putri dari Bpk. {activeContent.nama_bapak_perempuan} & Ibu {activeContent.nama_ibu_perempuan}
                                </p>
                            )}
                            {getBool(activeContent.flag_tampilkan_sosial_media_mempelai) && activeContent.account_media_sosial_perempuan && (
                                <a href={`https://instagram.com/${activeContent.account_media_sosial_perempuan.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-xs text-gold-600 hover:text-gold-700 mt-2 inline-block">
                                    {activeContent.account_media_sosial_perempuan}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* TIMELINE KISAH (If Enabled) */}
            {getBool(activeContent.flag_pakai_timeline_kisah) && timeline.length > 0 && (
                <section className="inv-section inv-story" ref={(el) => { sectionsRef.current[2] = el; }}>
                    <div className="inv-section-inner inv-animate">
                        <p className="inv-section-subtitle">Love Story</p>
                        <h2 className="inv-section-title">Perjalanan Cinta Kami</h2>
                        <div className="max-w-2xl mx-auto mt-8 space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gold-200 before:to-transparent">
                            {timeline.map((item, idx) => (
                                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-gold-400 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl shadow-sm bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                                        <div className="flex flex-col space-y-1 mb-2">
                                            <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">{item.tanggal}</span>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white font-serif">{item.judul}</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-sans">{item.deskripsi}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* COUNTDOWN */}
            <section className="inv-section inv-countdown-section" ref={(el) => { sectionsRef.current[3] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Menuju Hari Bahagia</p>
                    <h2 className="inv-section-title">Hitung Mundur</h2>
                    <div className="inv-countdown-grid">
                        {[
                            { value: countdown.days, label: 'Hari' },
                            { value: countdown.hours, label: 'Jam' },
                            { value: countdown.minutes, label: 'Menit' },
                            { value: countdown.seconds, label: 'Detik' },
                        ].map((item) => (
                            <div key={item.label} className="inv-countdown-item">
                                <span className="inv-countdown-value">{String(item.value).padStart(2, '0')}</span>
                                <span className="inv-countdown-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* EVENT DETAILS */}
            <section className="inv-section inv-event" ref={(el) => { sectionsRef.current[4] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Detail Acara</p>
                    <h2 className="inv-section-title">Akad & Resepsi</h2>
                    <div className="inv-event-grid">
                        <div className="inv-event-card">
                            <div className="inv-event-icon">🕌</div>
                            <h3>Akad Nikah</h3>
                            <p className="inv-event-date">{activeContent.tanggal_akad ? formatDate(activeContent.tanggal_akad) : formatDate(tenant.wedding_date)}</p>
                            <p className="inv-event-time">
                                {activeContent.jam_awal_akad || '08:00'} - {activeContent.jam_akhir_akad || '10:00'} WIB
                            </p>
                            <p className="inv-event-location font-semibold">{activeContent.nama_lokasi_akad || 'Masjid Al-Ikhlas'}</p>
                            <p className="text-sm text-gray-500 mt-2">{activeContent.keterangan_lokasi_akad}</p>
                            {activeContent.akad_map && (
                                <a href={activeContent.akad_map} target="_blank" rel="noreferrer" className="inline-block mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm rounded-lg transition-colors">
                                    📍 Buka di Google Maps
                                </a>
                            )}
                        </div>
                        {getBool(activeContent.flag_lokasi_akad_dan_resepsi_berbeda) ? (
                            <div className="inv-event-card">
                                <div className="inv-event-icon">🎉</div>
                                <h3>Resepsi</h3>
                                <p className="inv-event-date">{formatDate(tenant.wedding_date)}</p>
                                <p className="inv-event-time">
                                    {activeContent.jam_awal_resepsi || '11:00'} - {activeContent.jam_akhir_resepsi || '14:00'} WIB
                                </p>
                                <p className="inv-event-location font-semibold">{activeContent.nama_lokasi_resepsi || 'Gedung Serbaguna'}</p>
                                <p className="text-sm text-gray-500 mt-2">{activeContent.keterangan_lokasi_resepsi}</p>
                                {activeContent.resepsi_map && (
                                    <a href={activeContent.resepsi_map} target="_blank" rel="noreferrer" className="inline-block mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm rounded-lg transition-colors">
                                        📍 Buka di Google Maps
                                    </a>
                                )}
                            </div>
                        ) : (
                            <div className="inv-event-card">
                                <div className="inv-event-icon">🎉</div>
                                <h3>Resepsi</h3>
                                <p className="inv-event-date">{formatDate(tenant.wedding_date)}</p>
                                <p className="inv-event-time">
                                    {activeContent.jam_awal_resepsi || '11:00'} - {activeContent.jam_akhir_resepsi || '14:00'} WIB
                                </p>
                                <p className="inv-event-location font-semibold">{activeContent.nama_lokasi_akad || 'Lokasi Sama Dengan Akad'}</p>
                                <p className="text-sm text-gray-500 mt-2">{activeContent.keterangan_lokasi_akad}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* PROTOCOL HEADER (Custom Text 3) */}
            {activeContent.custom_kalimat_3 && (
                <section className="py-12 px-6 text-center max-w-2xl mx-auto font-serif italic text-gray-600 dark:text-gray-400">
                    "{activeContent.custom_kalimat_3}"
                </section>
            )}

            {/* RSVP */}
            <section className="inv-section inv-rsvp" ref={(el) => { sectionsRef.current[5] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Konfirmasi Kehadiran</p>
                    <h2 className="inv-section-title">RSVP</h2>
                    <form className="inv-rsvp-form" onSubmit={handleRSVP}>
                        <div className="inv-form-group">
                            <label>Kode Undangan</label>
                            <input
                                type="text"
                                value={rsvpCode}
                                onChange={(e) => setRsvpCode(e.target.value.toUpperCase())}
                                placeholder="Masukkan kode undangan (contoh: WED-XXXXXX)"
                                required
                            />
                        </div>
                        <div className="inv-form-row">
                            <div className="inv-form-group">
                                <label>Konfirmasi</label>
                                <select value={rsvpStatus} onChange={(e) => setRsvpStatus(e.target.value as 'confirmed' | 'declined')}>
                                    <option value="confirmed">✅ Hadir</option>
                                    <option value="declined">❌ Tidak Hadir</option>
                                </select>
                            </div>
                            {rsvpStatus === 'confirmed' && (
                                <div className="inv-form-group">
                                    <label>Jumlah Tamu</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={rsvpGuests}
                                        onChange={(e) => setRsvpGuests(Number(e.target.value) || 1)}
                                    />
                                </div>
                            )}
                        </div>
                        <button type="submit" className="inv-btn" disabled={rsvpLoading}>
                            {rsvpLoading ? 'Mengirim...' : 'Kirim RSVP'}
                        </button>
                        {rsvpResult && (
                            <div className={`inv-alert ${rsvpResult.success ? 'inv-alert-success' : 'inv-alert-error'}`}>
                                {rsvpResult.message}
                            </div>
                        )}
                    </form>
                </div>
            </section>

            {/* WISHES */}
            <section className="inv-section inv-wishes" ref={(el) => { sectionsRef.current[6] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Ucapan & Doa</p>
                    <h2 className="inv-section-title">Kirim Ucapan</h2>
                    <form className="inv-wish-form" onSubmit={handleWish}>
                        <div className="inv-form-group">
                            <label>Nama</label>
                            <input
                                type="text"
                                value={wishName}
                                onChange={(e) => setWishName(e.target.value)}
                                placeholder="Nama Anda"
                                required
                            />
                        </div>
                        <div className="inv-form-group">
                            <label>Ucapan & Doa</label>
                            <textarea
                                value={wishMessage}
                                onChange={(e) => setWishMessage(e.target.value)}
                                placeholder="Tulis ucapan dan doa terbaik Anda..."
                                rows={3}
                                required
                            />
                        </div>
                        <button type="submit" className="inv-btn" disabled={wishLoading}>
                            {wishLoading ? 'Mengirim...' : '💌 Kirim Ucapan'}
                        </button>
                    </form>

                    <div className="inv-wish-list">
                        {wishes.length === 0 && (
                            <p className="inv-wish-empty">Jadilah yang pertama mengirim ucapan! 💕</p>
                        )}
                        {wishes.map((w, i) => (
                            <div key={w.id || i} className="inv-wish-card">
                                <div className="inv-wish-header">
                                    <div className="inv-wish-avatar">{w.guest_name.charAt(0).toUpperCase()}</div>
                                    <div>
                                        <h4>{w.guest_name}</h4>
                                        <span className="inv-wish-time">{timeAgo(w.created_at)}</span>
                                    </div>
                                </div>
                                <p>{w.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* GIFT */}
            {activeContent.tampilkan_amplop_online && (
                <section className="inv-section inv-gift" ref={(el) => { sectionsRef.current[7] = el; }}>
                    <div className="inv-section-inner inv-animate">
                        <p className="inv-section-subtitle">Amplop Digital</p>
                        <h2 className="inv-section-title">Wedding Gift</h2>
                        <p className="inv-gift-desc">
                            Doa restu Anda merupakan karunia yang sangat berarti bagi kami.
                            Namun jika Anda ingin memberikan tanda kasih, kami menyediakan amplop digital.
                        </p>
                        <div className="inv-gift-cards">
                            {activeContent.nama_bank_1 && (
                                <div className="inv-gift-card">
                                    <div className="inv-gift-bank">🏦 {activeContent.nama_bank_1}</div>
                                    <div className="inv-gift-number">{activeContent.nomor_rekening_bank_1}</div>
                                    <div className="inv-gift-name">a.n. {activeContent.nama_rekening_bank_1}</div>
                                    <button
                                        type="button"
                                        className="inv-btn-outline"
                                        onClick={() => navigator.clipboard.writeText(activeContent.nomor_rekening_bank_1 || '')}
                                    >
                                        📋 Salin No. Rekening
                                    </button>
                                </div>
                            )}
                            {activeContent.nama_bank_2 && (
                                <div className="inv-gift-card">
                                    <div className="inv-gift-bank">🏦 {activeContent.nama_bank_2}</div>
                                    <div className="inv-gift-number">{activeContent.nomor_rekening_bank_2}</div>
                                    <div className="inv-gift-name">a.n. {activeContent.nama_rekening_bank_2}</div>
                                    <button
                                        type="button"
                                        className="inv-btn-outline"
                                        onClick={() => navigator.clipboard.writeText(activeContent.nomor_rekening_bank_2 || '')}
                                    >
                                        📋 Salin No. Rekening
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* FOOTER */}
            <footer className="inv-footer">
                <div className="inv-footer-ornament" />
                <p className="inv-footer-thanks max-w-lg mx-auto mb-4">{activeContent.flag_pakai_kalimat_penutup_custom ? activeContent.kalimat_penutup_undangan : 'Terima kasih atas kehadiran dan doa restunya'}</p>
                {activeContent.custom_kalimat_4 && (
                    <p className="max-w-md mx-auto mb-6 text-sm italic font-serif">"{activeContent.custom_kalimat_4}"</p>
                )}
                <h2 className="inv-footer-names">
                    {tenant.groom_name} & {tenant.bride_name}
                </h2>
                <p className="inv-footer-powered">Wedding SaaS Platform</p>
            </footer>

            {/* HIDDEN YOUTUBE PLAYER */}
            {youtubeId && isPlaying && (
                <iframe
                    width="0"
                    height="0"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&enablejsapi=1`}
                    title="YouTube Background Music"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="hidden"
                />
            )}

            {/* FLOATING MUSIC BUTTON */}
            {activeContent.link_backsound_music && (
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="fixed bottom-6 right-6 z-50 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-xl border border-gold-100 text-gold-600 hover:bg-gold-50 transition-all hover:scale-110 active:scale-95 flex items-center justify-center animate-fade-in"
                    aria-label="Toggle Music"
                >
                    {isPlaying ? <HiPause className="w-6 h-6 animate-pulse" /> : <HiPlay className="w-6 h-6" />}
                </button>
            )}
        </div>
    );
}
