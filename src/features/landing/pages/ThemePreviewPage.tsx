import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineArrowRight,
    HiOutlineCheck,
    HiOutlineExternalLink,
    HiOutlineExclamation,
    HiOutlineRefresh,
} from 'react-icons/hi';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { useLandingStore } from '@/features/landing/store/landingStore';
import kosaIcon from '@/assets/img/kosa-icon.png';

/**
 * ThemePreviewPage — halaman khusus untuk melihat SATU tema.
 *
 * Rute: /#/tema/:themeCode
 *
 * Kenapa halaman terpisah, bukan langsung membuka /#/preview/:code/:slug —
 * rute preview itu merender undangan MENTAH (dipakai juga oleh Theme Editor
 * admin), jadi tidak ada konteks: nama tema, paket, atau jalan kembali. Halaman
 * ini membungkusnya dengan informasi tema + ajakan mendaftar, dan menampilkan
 * undangan aslinya lewat <iframe> polos (tanpa mockup perangkat).
 *
 * Sumber data = useLandingStore yang sama dengan halaman utama, jadi kalau
 * pengunjung datang dari /#/home-page datanya sudah ada di cache (tanpa fetch
 * ulang). Kalau halaman ini dibuka LANGSUNG (tautan dibagikan / refresh),
 * fetchAll() akan mengambilnya sendiri.
 */

// Slug tenant demo — dipakai bila tema belum punya tenant contoh sendiri.
// Harus cocok dengan domain_slug tenant AKTIF, kalau tidak preview "not found".
const PREVIEW_DEMO_SLUG = 'dini-galang';

export function ThemePreviewPage() {
    const { themeCode } = useParams<{ themeCode: string }>();

    const themes = useLandingStore(s => s.themes);
    const config = useLandingStore(s => s.config);
    const logoUrl = useLandingStore(s => s.logoUrl);
    const loaded = useLandingStore(s => s.loaded);
    const fetchAll = useLandingStore(s => s.fetchAll);

    // Kunci remount iframe untuk tombol "Muat ulang".
    const [reloadKey, setReloadKey] = useState(0);
    const [frameLoaded, setFrameLoaded] = useState(false);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Selalu mulai dari atas — pengunjung datang dari posisi scroll halaman utama.
    // Sekaligus reset status iframe: berpindah tema memasang iframe BARU (key-nya
    // ikut previewUrl), jadi frameLoaded harus kembali false supaya indikator
    // "Memuat undangan…" muncul lagi, bukan area kosong tanpa umpan balik.
    useEffect(() => {
        window.scrollTo(0, 0);
        setFrameLoaded(false);
    }, [themeCode]);

    const theme = useMemo(
        () => themes.find(t => (t.code || '').trim() === (themeCode || '').trim()),
        [themes, themeCode]
    );

    const siteName = config?.site_name || 'Kosa Invitation';

    // Tema lain untuk baris "jelajahi lainnya" (maks 6, selain yang dibuka).
    const others = useMemo(
        () => themes.filter(t => t.code && (t.code || '').trim() !== (themeCode || '').trim()).slice(0, 6),
        [themes, themeCode]
    );

    const slug = (theme?.sample_tenant_slug || '').trim() || PREVIEW_DEMO_SLUG;
    const previewUrl = theme?.code ? `#/preview/${theme.code}/${slug}` : '';

    // Judul tab mengikuti tema yang dibuka; dipulihkan saat keluar halaman.
    useEffect(() => {
        if (!theme) return;
        const prev = document.title;
        document.title = `${theme.name} — ${siteName}`;
        return () => { document.title = prev; };
    }, [theme, siteName]);

    // Belum selesai memuat DAN tema belum ketemu → tampilkan status memuat,
    // bukan "tidak ditemukan" (yang keliru saat data masih dalam perjalanan).
    if (!loaded && !theme) {
        return (
            <div className="tp-root">
                <ThemePreviewStyles />
                <div className="tp-state">
                    <span className="tp-spinner" aria-hidden="true" />
                    <p>Memuat tema…</p>
                </div>
            </div>
        );
    }

    if (!theme) {
        return (
            <div className="tp-root">
                <ThemePreviewStyles />
                <div className="tp-state">
                    <h1>Tema tidak ditemukan</h1>
                    <p>Tema yang Anda cari mungkin sudah tidak tersedia atau tautannya keliru.</p>
                    <Link to="/home-page" className="tp-btn tp-btn-primary">
                        <HiOutlineArrowLeft aria-hidden="true" /> Kembali ke Koleksi
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="tp-root">
            <ThemePreviewStyles />
            <div className="tp-backdrop" aria-hidden="true">
                <span className="tp-orb tp-orb-1" />
                <span className="tp-orb tp-orb-2" />
            </div>

            {/* ── Bar atas ── */}
            <header className="tp-bar">
                <div className="tp-container tp-bar-inner">
                    <Link to="/home-page" className="tp-back">
                        <HiOutlineArrowLeft aria-hidden="true" />
                        <span>Koleksi</span>
                    </Link>
                    <Link to="/home-page" className="tp-brand">
                        <span className="tp-brand-mark"><img src={logoUrl || kosaIcon} alt="" /></span>
                        <span className="tp-brand-name">{siteName}</span>
                    </Link>
                    <Link to={`/register?theme=${encodeURIComponent(theme.code || '')}`} className="tp-btn tp-btn-primary tp-btn-sm">
                        Pakai Tema Ini
                    </Link>
                </div>
            </header>

            <main className="tp-container tp-main">
                {/* ── Kolom kiri: detail tema ── */}
                <section className="tp-info">
                    <p className="tp-eyebrow">Pratinjau Tema</p>
                    <h1 className="tp-title">{theme.name}</h1>

                    <div className="tp-tags">
                        <span className="tp-tag tp-tag-plan">{theme.plan_type}</span>
                        {theme.style_category && <span className="tp-tag">{theme.style_category}</span>}
                    </div>

                    <p className="tp-desc">
                        Inilah tampilan undangan Anda dengan tema <strong>{theme.name}</strong>. Contoh di
                        samping menggunakan data pernikahan sungguhan — nama, tanggal, foto, dan seluruh
                        isinya nanti dapat Anda ganti sendiri melalui editor.
                    </p>

                    {/* Catatan peramban — selalu tampil untuk semua pengunjung. */}
                    <div className="tp-note" role="note">
                        <span className="tp-note-ico" aria-hidden="true"><HiOutlineExclamation /></span>
                        <div>
                            <p className="tp-note-title">Optimal dibuka di Google Chrome versi terbaru</p>
                            <p className="tp-note-body">
                                Tema ini memakai animasi, efek visual, dan pemutar musik yang paling stabil
                                pada Google Chrome versi terbaru. Pada peramban lain atau versi lama,
                                sebagian tampilan dapat berbeda atau tidak berjalan semestinya.
                            </p>
                        </div>
                    </div>

                    <ul className="tp-points">
                        <li><HiOutlineCheck aria-hidden="true" />Seluruh isi dapat disesuaikan</li>
                        <li><HiOutlineCheck aria-hidden="true" />Tautan personal untuk tiap tamu</li>
                        <li><HiOutlineCheck aria-hidden="true" />Konfirmasi kehadiran &amp; buku ucapan</li>
                    </ul>

                    <div className="tp-cta">
                        <Link to={`/register?theme=${encodeURIComponent(theme.code || '')}`} className="tp-btn tp-btn-primary">
                            Pakai Tema Ini <HiOutlineArrowRight aria-hidden="true" />
                        </Link>
                        {previewUrl && (
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="tp-btn tp-btn-ghost">
                                Buka Layar Penuh <HiOutlineExternalLink aria-hidden="true" />
                            </a>
                        )}
                    </div>
                </section>

                {/* ── Kolom kanan: undangan (iframe polos, tanpa bingkai HP) ── */}
                <section className="tp-stage">
                    <div className="tp-screen">
                        {previewUrl ? (
                            <>
                                {!frameLoaded && (
                                    <div className="tp-frame-loading">
                                        <span className="tp-spinner" aria-hidden="true" />
                                        <p>Memuat undangan…</p>
                                    </div>
                                )}
                                <iframe
                                    // previewUrl WAJIB ikut jadi key. Berpindah tema
                                    // lewat daftar di bawah tidak meng-unmount halaman
                                    // (rute sama, hanya :themeCode berubah), jadi tanpa
                                    // ini React memakai ULANG iframe lama dan pratinjau
                                    // tidak ikut berganti meski informasinya sudah baru.
                                    key={`${previewUrl}#${reloadKey}`}
                                    src={previewUrl}
                                    title={`Pratinjau tema ${theme.name}`}
                                    className="tp-frame"
                                    onLoad={() => setFrameLoaded(true)}
                                />
                            </>
                        ) : (
                            <div className="tp-frame-loading">
                                <p>Tema ini belum memiliki pratinjau.</p>
                            </div>
                        )}
                    </div>

                    {previewUrl && (
                        <button
                            className="tp-reload"
                            onClick={() => { setFrameLoaded(false); setReloadKey(k => k + 1); }}
                        >
                            <HiOutlineRefresh aria-hidden="true" /> Muat ulang pratinjau
                        </button>
                    )}
                </section>
            </main>

            {/* ── Tema lainnya ── */}
            {others.length > 0 && (
                <section className="tp-others">
                    <div className="tp-container">
                        <p className="tp-eyebrow">Tema Lainnya</p>
                        <div className="tp-others-grid">
                            {others.map(t => (
                                <Link key={t.id} to={`/tema/${t.code}`} className="tp-other">
                                    <div className="tp-other-shot">
                                        {/* WAJIB ProxyImage, bukan <img>: URL preview_image memakai
                                            action=imageProxy yang mengembalikan base64 sebagai
                                            text/plain — bukan byte gambar — sehingga <img> biasa
                                            selalu gagal memuat (ikon rusak). */}
                                        <ProxyImage
                                            src={t.preview_image || `https://placehold.co/450x800?text=${encodeURIComponent(t.name)}`}
                                            alt={t.name}
                                            loading="lazy"
                                        />
                                    </div>
                                    <p className="tp-other-name">{t.name}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   Gaya — dilingkupi .tp-root. Mobile-first: nilai dasar = HP,
   dinaikkan lewat @media (min-width:...).
   CATATAN: jangan pakai backtick di dalam blok ini — isinya template
   literal JS, backtick akan menutupnya lebih awal dan merusak file.
   ══════════════════════════════════════════════════════════════════ */
function ThemePreviewStyles() {
    return (
        <style>{`
.tp-root{
  --bg:#FDFCFA; --ink:#1A1A1F; --ink-soft:#5A5A66; --ink-mute:#6E6E7A;
  --line:rgba(26,26,31,.09);
  --gold:#D4AF37; --gold-deep:#B8860B; --gold-text:#8A6508; --gold-light:#E8C86A;
  --gold-grad:linear-gradient(135deg,#B8860B 0%,#E8C86A 38%,#D4AF37 55%,#F5E4A8 72%,#B8860B 100%);
  --glass-1:rgba(255,255,255,.62); --glass-border:rgba(255,255,255,.75);
  --glass-rim:inset 0 1px 0 rgba(255,255,255,.9);
  --glass-shadow:0 8px 32px rgba(31,38,60,.07);
  --ease-lux:cubic-bezier(.22,1,.36,1);
  position:relative; isolation:isolate; min-height:100vh;
  background:var(--bg); color:var(--ink);
  font-family:'Inter',system-ui,-apple-system,sans-serif; font-size:16px; line-height:1.7;
  -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.tp-root *,.tp-root *::before,.tp-root *::after{box-sizing:border-box;}
/* :not([class]) WAJIB — sama seperti reset ul di atas. ".tp-root p"
   berspesifisitas 11 dan mengalahkan SEMUA kelas pada <p> (10), sehingga
   margin pada .tp-eyebrow, .tp-desc, dsb. dibuang tanpa jejak.
   Inilah akar keluhan "spacing mepet" yang berulang. */
.tp-root p:not([class]){margin:0;}
.tp-root h1{margin:0;font-weight:400;}
/* :not([class]) WAJIB. Selektor ".tp-root ul" berspesifisitas 11 (class+element)
   sehingga MENGALAHKAN aturan berkelas seperti .tp-points (10) — margin:0 di
   sini membatalkan margin-bottom mereka tanpa jejak, dan tata letak jadi mepet.
   Reset hanya untuk <ul> polos; yang sudah punya kelas mengatur dirinya sendiri. */
.tp-root ul:not([class]){margin:0;padding:0;list-style:none;}
.tp-root ul[class]{padding:0;list-style:none;}
.tp-root a:not(.tp-btn){text-decoration:none;color:inherit;}
.tp-root a.tp-btn{text-decoration:none;}
.tp-root img{max-width:100%;display:block;}
.tp-root button{font:inherit;color:inherit;background:none;border:none;cursor:pointer;}
.tp-root :focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:6px;}

.tp-backdrop{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;}
.tp-orb{position:absolute;border-radius:50%;filter:blur(40px);}
.tp-orb-1{width:720px;height:720px;top:-280px;left:-160px;
  background:radial-gradient(circle,rgba(212,175,55,.14),transparent 68%);}
.tp-orb-2{width:800px;height:800px;bottom:-10%;right:-300px;
  background:radial-gradient(circle,rgba(226,199,163,.13),transparent 70%);}

.tp-container{width:100%;max-width:1240px;margin:0 auto;padding:0 20px;position:relative;z-index:1;}

/* ── Bar atas ── */
.tp-bar{position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.72);
  -webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);
  border-bottom:1px solid rgba(212,175,55,.16);transform:translateZ(0);}
.tp-bar-inner{display:flex;align-items:center;justify-content:space-between;gap:14px;height:64px;}
.tp-back{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:500;color:var(--ink-soft);
  transition:color .2s var(--ease-lux);}
.tp-back:hover{color:var(--gold-text);}
.tp-back svg{width:18px;height:18px;flex:none;}
.tp-brand{display:none;align-items:center;gap:10px;}
.tp-brand-mark{width:34px;height:34px;flex:none;border-radius:10px;display:grid;place-items:center;padding:6px;
  background:var(--ink);border:1px solid rgba(212,175,55,.32);overflow:hidden;}
.tp-brand-mark img{width:100%;height:100%;object-fit:contain;}
.tp-brand-name{font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:600;letter-spacing:-.01em;}

/* ── Tombol ── */
.tp-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;
  padding:15px 26px;border-radius:999px;font-size:14px;font-weight:600;line-height:1;
  white-space:nowrap;cursor:pointer;
  transition:transform .2s var(--ease-lux),box-shadow .2s var(--ease-lux),border-color .2s var(--ease-lux),background-color .2s var(--ease-lux);}
.tp-btn svg{width:16px;height:16px;flex:none;}
.tp-btn-sm{padding:11px 18px;font-size:13px;}
.tp-btn-primary{background:var(--ink);color:#fff;border:1px solid rgba(212,175,55,.3);
  box-shadow:0 4px 16px rgba(26,26,31,.18);}
.tp-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(26,26,31,.26);border-color:rgba(212,175,55,.6);}
.tp-btn-ghost{background:var(--glass-1);color:var(--ink);border:1px solid var(--glass-border);
  -webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);
  box-shadow:var(--glass-rim);}
.tp-btn-ghost:hover{transform:translateY(-2px);background:rgba(255,255,255,.84);border-color:rgba(212,175,55,.45);}

/* ── Tata letak utama ── */
.tp-main{display:grid;grid-template-columns:1fr;gap:48px;padding-top:44px;padding-bottom:72px;align-items:start;}

.tp-eyebrow{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.2em;
  color:var(--gold-text);margin-bottom:16px;}
.tp-eyebrow::after{content:'';display:block;width:40px;height:2px;margin-top:12px;
  background:var(--gold-grad);border-radius:2px;}
.tp-title{font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(2.1rem,7vw,3.2rem);line-height:1.12;letter-spacing:-.02em;margin-bottom:20px;}
.tp-tags{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:28px;}
.tp-tag{padding:7px 15px;border-radius:999px;font-size:11.5px;font-weight:600;
  text-transform:uppercase;letter-spacing:.14em;color:var(--ink-soft);
  background:rgba(255,255,255,.7);border:1px solid var(--line);}
.tp-tag-plan{color:#26200C;background:var(--gold-grad);border-color:rgba(245,228,168,.6);}
.tp-desc{font-size:16px;line-height:1.8;color:var(--ink-soft);max-width:60ch;margin-bottom:32px;}
.tp-desc strong{color:var(--ink);font-weight:600;}

/* ── Catatan peramban ── */
.tp-note{display:flex;gap:14px;padding:20px 22px;border-radius:18px;
  background:linear-gradient(140deg,rgba(251,244,226,.9),rgba(255,255,255,.7));
  border:1px solid rgba(212,175,55,.34);
  box-shadow:0 6px 22px rgba(184,134,11,.09),var(--glass-rim);margin-bottom:34px;}
.tp-note-ico{flex:none;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;
  background:var(--gold-grad);color:#26200C;box-shadow:0 3px 10px rgba(212,175,55,.3);}
.tp-note-ico svg{width:21px;height:21px;}
.tp-note-title{font-size:14.5px;font-weight:700;color:var(--ink);margin-bottom:6px;line-height:1.5;}
.tp-note-body{font-size:13.5px;line-height:1.75;color:var(--ink-soft);}

.tp-points{display:flex;flex-direction:column;gap:14px;margin-bottom:40px;}
.tp-points li{display:flex;align-items:center;gap:10px;font-size:14.5px;color:var(--ink-soft);}
.tp-points svg{width:16px;height:16px;flex:none;color:var(--gold-deep);}

.tp-cta{display:flex;flex-direction:column;gap:12px;}
.tp-cta .tp-btn{width:100%;}

/* ── Bingkai HP ── */
.tp-stage{display:flex;flex-direction:column;align-items:center;gap:18px;}
/* Iframe polos tanpa bezel/notch perangkat — undangan tampil apa adanya.
   Sudut membulat + garis tipis saja supaya tetap menyatu dengan bahasa desain
   halaman, tanpa berpura-pura jadi mockup HP. */
.tp-screen{position:relative;width:100%;max-width:420px;aspect-ratio:9/17;
  border-radius:20px;overflow:hidden;background:#F1EFEA;
  border:1px solid var(--line);
  box-shadow:0 12px 40px rgba(31,38,60,.12);}
.tp-frame{width:100%;height:100%;border:0;display:block;}
.tp-frame-loading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:14px;background:#F7F5F0;color:var(--ink-mute);font-size:13.5px;text-align:center;padding:24px;}
.tp-reload{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--ink-mute);
  padding:9px 16px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.6);
  transition:all .2s var(--ease-lux);}
.tp-reload:hover{color:var(--ink);border-color:rgba(212,175,55,.45);}
.tp-reload svg{width:15px;height:15px;}

/* ── Status (memuat / tak ditemukan) ── */
.tp-state{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;text-align:center;padding:40px 24px;}
.tp-state h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.7rem,5vw,2.4rem);letter-spacing:-.02em;}
.tp-state p{color:var(--ink-soft);max-width:44ch;}
.tp-state .tp-btn{margin-top:10px;}
.tp-spinner{width:34px;height:34px;border-radius:50%;
  border:3px solid rgba(212,175,55,.22);border-top-color:var(--gold);
  animation:tp-spin .8s linear infinite;}
@keyframes tp-spin{to{transform:rotate(360deg)}}

/* ── Tema lainnya ── */
.tp-others{padding:52px 0 72px;border-top:1px solid var(--line);}
.tp-others-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:28px;}
.tp-other{display:block;transition:transform .22s var(--ease-lux);}
.tp-other:hover{transform:translateY(-4px);}
.tp-other-shot{aspect-ratio:9/16;border-radius:14px;overflow:hidden;background:#F1EFEA;
  border:1px solid var(--line);box-shadow:0 4px 16px rgba(31,38,60,.06);}
.tp-other-shot img{width:100%;height:100%;object-fit:cover;}
.tp-other-name{margin-top:12px;font-family:'Playfair Display',Georgia,serif;font-size:14.5px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

@media (prefers-reduced-motion:reduce){
  .tp-root *{animation-duration:.01ms!important;transition-duration:.01ms!important;}
}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){
  .tp-bar,.tp-btn-ghost{background:rgba(255,255,255,.96);}
}

/* ══════════ RESPONSIF — MOBILE-FIRST ══════════ */
@media (min-width:480px){
  .tp-container{padding:0 24px;}
  .tp-cta{flex-direction:row;}
  .tp-cta .tp-btn{width:auto;}
}
@media (min-width:768px){
  .tp-brand{display:flex;}
  .tp-bar-inner{height:70px;}
  .tp-main{padding-top:52px;padding-bottom:80px;gap:52px;}
  .tp-others-grid{grid-template-columns:repeat(4,1fr);gap:18px;}
  .tp-screen{max-width:460px;}
}
@media (min-width:1024px){
  .tp-container{padding:0 32px;}
  /* Dua kolom: detail di kiri, bingkai HP menempel saat menggulir. */
  .tp-main{grid-template-columns:1fr 440px;gap:64px;padding-top:64px;padding-bottom:96px;}
  .tp-stage{position:sticky;top:96px;}
  .tp-others-grid{grid-template-columns:repeat(6,1fr);}
  .tp-others{padding:64px 0 88px;}
}
        `}</style>
    );
}
