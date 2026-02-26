import { useEffect, useState, useRef } from 'react';
import '../invitation.css';
import { useParams } from 'react-router-dom';
import { publicApi } from '@/core/api/endpoints';
import type { Wish } from '@/types';

interface TenantPublic {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    domain_slug: string;
}

interface InvitationData {
    tenant: TenantPublic;
    wishes: Wish[];
}

export function InvitationPage() {
    const { slug } = useParams<{ slug: string }>();
    const [data, setData] = useState<InvitationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOpened, setIsOpened] = useState(false);
    const [wishes, setWishes] = useState<Wish[]>([]);

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
        if (slug) fetchInvitation();
    }, [slug]);

    useEffect(() => {
        if (!data?.tenant.wedding_date) return;
        const interval = setInterval(() => {
            const target = new Date(data.tenant.wedding_date).getTime();
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
    }, [data]);

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
    }, [isOpened, data]);

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
    if (error || !data) {
        return (
            <div className="inv-page inv-error">
                <div className="inv-error-icon">💌</div>
                <h2>Undangan Tidak Ditemukan</h2>
                <p>{error || 'Link undangan tidak valid.'}</p>
            </div>
        );
    }

    const { tenant } = data;

    // COVER (before opened)
    if (!isOpened) {
        return (
            <div className="inv-page inv-cover">
                <div className="inv-cover-overlay" />
                <div className="inv-cover-content">
                    <p className="inv-cover-label">The Wedding Of</p>
                    <h1 className="inv-cover-names">
                        {tenant.groom_name} <span>&</span> {tenant.bride_name}
                    </h1>
                    <p className="inv-cover-date">{formatDate(tenant.wedding_date)}</p>
                    <button className="inv-cover-btn" onClick={() => setIsOpened(true)}>
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
                    <p className="inv-hero-bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
                    <p className="inv-hero-label">We are getting married</p>
                    <h1 className="inv-hero-names">
                        {tenant.groom_name} <span className="inv-amp">&</span> {tenant.bride_name}
                    </h1>
                    <div className="inv-hero-date-badge">
                        <span>{formatDate(tenant.wedding_date)}</span>
                    </div>
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
                        </div>
                        <div className="inv-couple-divider">
                            <span className="inv-heart">♥</span>
                        </div>
                        <div className="inv-couple-card">
                            <div className="inv-couple-avatar">👰</div>
                            <h3>{tenant.bride_name}</h3>
                            <p>Mempelai Wanita</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* COUNTDOWN */}
            <section className="inv-section inv-countdown-section" ref={(el) => { sectionsRef.current[2] = el; }}>
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
            <section className="inv-section inv-event" ref={(el) => { sectionsRef.current[3] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Detail Acara</p>
                    <h2 className="inv-section-title">Akad & Resepsi</h2>
                    <div className="inv-event-grid">
                        <div className="inv-event-card">
                            <div className="inv-event-icon">🕌</div>
                            <h3>Akad Nikah</h3>
                            <p className="inv-event-date">{formatDate(tenant.wedding_date)}</p>
                            <p className="inv-event-time">08:00 - 10:00 WIB</p>
                            <p className="inv-event-location">Masjid Al-Ikhlas</p>
                        </div>
                        <div className="inv-event-card">
                            <div className="inv-event-icon">🎉</div>
                            <h3>Resepsi</h3>
                            <p className="inv-event-date">{formatDate(tenant.wedding_date)}</p>
                            <p className="inv-event-time">11:00 - 14:00 WIB</p>
                            <p className="inv-event-location">Gedung Serbaguna</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* RSVP */}
            <section className="inv-section inv-rsvp" ref={(el) => { sectionsRef.current[4] = el; }}>
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
            <section className="inv-section inv-wishes" ref={(el) => { sectionsRef.current[5] = el; }}>
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
            <section className="inv-section inv-gift" ref={(el) => { sectionsRef.current[6] = el; }}>
                <div className="inv-section-inner inv-animate">
                    <p className="inv-section-subtitle">Amplop Digital</p>
                    <h2 className="inv-section-title">Wedding Gift</h2>
                    <p className="inv-gift-desc">
                        Doa restu Anda merupakan karunia yang sangat berarti bagi kami.
                        Namun jika Anda ingin memberikan tanda kasih, kami menyediakan amplop digital.
                    </p>
                    <div className="inv-gift-cards">
                        <div className="inv-gift-card">
                            <div className="inv-gift-bank">🏦 Bank BCA</div>
                            <div className="inv-gift-number">1234567890</div>
                            <div className="inv-gift-name">a.n. {tenant.groom_name}</div>
                            <button
                                type="button"
                                className="inv-btn-outline"
                                onClick={() => navigator.clipboard.writeText('1234567890')}
                            >
                                📋 Salin No. Rekening
                            </button>
                        </div>
                        <div className="inv-gift-card">
                            <div className="inv-gift-bank">🏦 Bank Mandiri</div>
                            <div className="inv-gift-number">0987654321</div>
                            <div className="inv-gift-name">a.n. {tenant.bride_name}</div>
                            <button
                                type="button"
                                className="inv-btn-outline"
                                onClick={() => navigator.clipboard.writeText('0987654321')}
                            >
                                📋 Salin No. Rekening
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="inv-footer">
                <div className="inv-footer-ornament" />
                <p className="inv-footer-thanks">Terima kasih atas kehadiran dan doa restunya</p>
                <h2 className="inv-footer-names">
                    {tenant.groom_name} & {tenant.bride_name}
                </h2>
                <p className="inv-footer-powered">Wedding SaaS Platform</p>
            </footer>
        </div>
    );
}
