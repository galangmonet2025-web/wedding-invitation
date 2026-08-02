import { Link } from 'react-router-dom';

/**
 * AuthChrome — kerangka visual halaman Masuk & Daftar dengan bahasa desain yang
 * SAMA dengan halaman utama (/#/home-page): putih hangat + kaca + emas.
 *
 * Kenapa komponen ini memakai ULANG nama kelas lama (lp-input, lp-label,
 * lp-btn, lp-alert, dst.) alih-alih memperkenalkan awalan baru: kedua halaman
 * auth sudah memakai kelas-kelas itu di seluruh markup form-nya. Dengan
 * mempertahankan nama, seluruh LOGIKA form (validasi, cek slug, DatePicker,
 * submit) sama sekali tidak perlu disentuh — hanya lapisan gaya yang berganti.
 * Jadi risiko merusak alur pendaftaran/masuk mendekati nol.
 *
 * Catatan kontras (mengikuti riset yang sama dengan halaman utama):
 * emas TIDAK dipakai untuk teks kecil di atas latar terang — hanya untuk garis,
 * ikon, dan aksen. Teks kecil memakai --gold-text yang lolos WCAG AA.
 *
 * CATATAN: jangan pakai backtick di dalam blok <style> — isinya template
 * literal JS, backtick akan menutupnya lebih awal dan merusak file.
 */

interface AuthShellProps {
    /** Logo tenant hasil resolve (base64); null → pakai fallback bundel. */
    logoUrl: string | null;
    fallbackLogo: string;
    /** Nama situs (dari website config) — tampil di merek & footer. */
    title: string;
    /** Label kecil di atas judul form, mis. "Masuk" / "Daftar". */
    eyebrow: string;
    /** Judul utama kartu. */
    heading: string;
    /** Kalimat pendukung di bawah judul form. */
    subheading: string;
    /** Nilai jual ringkas di bawah kartu (statistik / daftar fitur). */
    aside?: React.ReactNode;
    /** Pojok kanan atas (LanguageSwitcher). */
    topRight?: React.ReactNode;
    /** Form + tautan bawah. */
    children: React.ReactNode;
    /** Form panjang (Daftar) memakai kartu yang lebih lebar. */
    wide?: boolean;
}

export function AuthShell({
    logoUrl, fallbackLogo, title, eyebrow, heading, subheading,
    aside, topRight, children, wide,
}: AuthShellProps) {
    return (
        <div className="au-root">
            <AuthStyle />

            {/* Lapisan latar: orb ambient + butiran. Sama seperti halaman utama —
                tanpa ini efek kaca tidak terlihat di atas putih rata. */}
            <div className="au-backdrop" aria-hidden="true">
                <span className="au-orb au-orb-1" />
                <span className="au-orb au-orb-2" />
                <span className="au-grain" />
            </div>

            <div className="au-split">
                {/* ══ SISI KIRI — panel putih "editorial" ══
                    Dominan putih dengan sorot emas sangat lembut. Fokusnya satu
                    kutipan besar bertipografi serif + strip nilai jual di bawahnya,
                    bukan blok teks datar. */}
                <aside className="au-aside">
                    <span className="au-aside-glow" aria-hidden="true" />

                    <div className="au-aside-inner">
                        <Link to="/home-page" className="au-brand">
                            <span className="au-brand-mark">
                                <img src={logoUrl || fallbackLogo} alt="" />
                            </span>
                            <span className="au-brand-name">{title}</span>
                        </Link>

                        <div className="au-aside-body">
                            <p className="au-aside-eyebrow">Undangan Pernikahan Digital</p>
                            <p className="au-quote">
                                Setiap kisah layak dibuka dengan cara yang
                                <em> tak terlupakan.</em>
                            </p>
                            {aside && <div className="au-aside-extra">{aside}</div>}
                        </div>

                        <p className="au-aside-foot">© {new Date().getFullYear()} {title}</p>
                    </div>
                </aside>

                {/* ══ SISI KANAN — form ══ */}
                <main className="au-panel">
                    {topRight && <div className="au-top-right">{topRight}</div>}

                    <div className={`au-form-wrap ${wide ? 'is-wide' : ''}`}>
                        {/* Merek untuk layar kecil (sisi kiri disembunyikan) */}
                        <Link to="/home-page" className="au-brand au-brand-mobile">
                            <span className="au-brand-mark">
                                <img src={logoUrl || fallbackLogo} alt="" />
                            </span>
                            <span className="au-brand-name">{title}</span>
                        </Link>

                        <div className="au-form-head">
                            <p className="au-eyebrow">{eyebrow}</p>
                            <h1 className="au-title">{heading}</h1>
                            <p className="au-sub">{subheading}</p>
                        </div>

                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export function AuthStyle() {
    return (
        <style>{`
.au-root{
  --bg:#FDFCFA; --surface:#FFFFFF; --champagne:#FAF3E0;
  --ink:#1A1A1F; --ink-soft:#5A5A66; --ink-mute:#6E6E7A;
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
  -webkit-font-smoothing:antialiased;
}
.au-root *,.au-root *::before,.au-root *::after{box-sizing:border-box;}
/* :not([class]) — reset hanya untuk elemen polos. Selektor "root element"
   berspesifisitas lebih tinggi daripada kelas, jadi tanpa ini margin pada
   elemen berkelas akan dibatalkan diam-diam. */
.au-root p:not([class]){margin:0;}
.au-root h1:not([class]),.au-root h2:not([class]){margin:0;font-weight:400;}
.au-root a:not(.lp-btn){text-decoration:none;color:inherit;}
.au-root img{max-width:100%;display:block;}
.au-root :focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:8px;}

/* ── Latar ── */
.au-backdrop{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;}
.au-orb{position:absolute;border-radius:50%;filter:blur(40px);}
.au-orb-1{width:760px;height:760px;top:-300px;left:-180px;
  background:radial-gradient(circle,rgba(212,175,55,.15),transparent 68%);}
.au-orb-2{width:820px;height:820px;bottom:-14%;right:-300px;
  background:radial-gradient(circle,rgba(226,199,163,.13),transparent 70%);}
.au-grain{position:absolute;inset:-50%;opacity:.03;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");}

/* ── Kerangka DUA SISI ──
   Mobile: satu kolom (sisi kiri disembunyikan). Desktop: kiri editorial + kanan form.
   Pembagiannya PERSENTASE MURNI tanpa max-width — inilah yang dulu bikin
   proporsi timpang: dengan max-width:620px, sisi kiri berhenti tumbuh di layar
   lebar (di 1920px hanya 32%) sementara sisi kanan terus melebar. */
.au-split{display:flex;min-height:100vh;}
/* Sisi kiri: LEBAR 52% & dominan PUTIH. Persentase murni tanpa max-width
   supaya rasionya konsisten dari 1200px sampai layar terlebar. */
.au-aside{display:none;position:relative;width:52%;flex:none;overflow:hidden;
  background:linear-gradient(155deg,#FFFFFF 0%,#FDFBF6 52%,#FAF3E6 100%);
  border-right:1px solid rgba(212,175,55,.22);}
.au-panel{position:relative;flex:1;min-width:0;display:flex;align-items:center;
  justify-content:center;padding:72px 20px 48px;}
.au-top-right{position:absolute;top:18px;right:18px;z-index:10;}
.au-form-wrap{width:100%;max-width:400px;}
.au-form-wrap.is-wide{max-width:560px;}
.au-form-head{margin-bottom:28px;}
.au-brand{display:inline-flex;align-items:center;gap:12px;}
.au-brand-mobile{margin-bottom:30px;}

/* ══ SISI KIRI — panel gelap editorial ══ */
.au-aside-glow{position:absolute;width:820px;height:820px;top:-26%;left:-20%;
  border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(212,175,55,.16),transparent 68%);filter:blur(40px);}
.au-aside-inner{position:relative;z-index:1;display:flex;flex-direction:column;
  justify-content:space-between;width:100%;}
/* Sisi kiri kini TERANG, jadi merek memakai warna default (tinta gelap). */
.au-aside-body{padding:56px 0;}
.au-aside-eyebrow{font-size:12px;font-weight:600;text-transform:uppercase;
  letter-spacing:.2em;color:var(--gold-text);margin-bottom:22px;}
.au-aside-eyebrow::after{content:'';display:block;width:40px;height:2px;margin-top:14px;
  background:var(--gold-grad);border-radius:2px;}
/* Kutipan besar = fokus sisi kiri (menggantikan blok deskripsi datar) */
.au-quote{font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(2.1rem,3.1vw,3.4rem);line-height:1.16;letter-spacing:-.02em;
  color:var(--ink);max-width:16ch;}
.au-quote em{font-style:italic;
  background:var(--gold-grad);-webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;color:var(--gold-deep);}
.au-aside-extra{margin-top:48px;padding-top:38px;
  border-top:1px solid rgba(26,26,31,.1);}
.au-aside-foot{font-size:12.5px;color:var(--ink-mute);}

/* ── Merek ── */
.au-brand-mark{width:42px;height:42px;flex:none;border-radius:12px;display:grid;place-items:center;
  padding:7px;background:var(--ink);border:1px solid rgba(212,175,55,.32);
  box-shadow:0 2px 10px rgba(26,26,31,.16);overflow:hidden;}
.au-brand-mark img{width:100%;height:100%;object-fit:contain;}
.au-brand-name{font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:600;
  letter-spacing:-.01em;color:var(--ink);}

/* ── Judul form ── */
.au-eyebrow{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.2em;
  color:var(--gold-text);margin-bottom:14px;}
.au-eyebrow::after{content:'';display:block;width:40px;height:2px;margin-top:12px;
  background:var(--gold-grad);border-radius:2px;}
.au-title{font-family:'Playfair Display',Georgia,serif;
  font-size:clamp(1.9rem,6vw,2.5rem);line-height:1.12;letter-spacing:-.02em;
  color:var(--ink);margin-bottom:12px;}
.au-sub{font-size:15px;line-height:1.75;color:var(--ink-soft);}

/* ══ FORM — nama kelas SENGAJA dipertahankan dari desain lama ══ */
.lp-label{display:block;font-size:12.5px;font-weight:600;letter-spacing:.02em;
  color:var(--ink);margin-bottom:9px;}
.lp-input{width:100%;height:52px;padding:0 16px;border-radius:14px;
  font-size:15px;color:var(--ink);background:rgba(255,255,255,.7);
  border:1px solid var(--line);outline:none;
  transition:border-color .2s var(--ease-lux),box-shadow .2s var(--ease-lux),background-color .2s var(--ease-lux);}
.lp-input::placeholder{color:var(--ink-mute);opacity:.75;}
.lp-input:hover{border-color:rgba(26,26,31,.16);}
.lp-input:focus{background:#fff;border-color:var(--gold);
  box-shadow:0 0 0 4px rgba(212,175,55,.14);}
.lp-input.has-icon{padding-left:46px;}
.lp-input.has-icon-right{padding-right:46px;}
.lp-input.is-error{border-color:#D9534F;box-shadow:0 0 0 4px rgba(217,83,79,.12);}
/* <select> memakai .lp-input juga — beri ruang untuk tanda panah bawaan. */
select.lp-input{appearance:none;-webkit-appearance:none;cursor:pointer;
  padding-right:40px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%235A5A66'%3E%3Cpath d='M5.5 7.5L10 12l4.5-4.5' stroke='%235A5A66' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 14px center;background-size:18px;}
textarea.lp-input{height:auto;padding:14px 16px;line-height:1.7;resize:vertical;}
.lp-input-ico{position:absolute;left:16px;top:50%;transform:translateY(-50%);
  width:19px;height:19px;color:var(--ink-mute);pointer-events:none;}
.lp-input-eye{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  display:grid;place-items:center;width:34px;height:34px;border-radius:9px;
  color:var(--ink-mute);background:none;border:none;cursor:pointer;
  transition:color .2s var(--ease-lux),background-color .2s var(--ease-lux);}
.lp-input-eye:hover{color:var(--ink);background:rgba(26,26,31,.05);}

/* Tombol — primer GELAP dengan garis rambut emas (sama seperti halaman utama;
   tombol emas padat gagal kontras dan terbaca murahan). */
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:16px 28px;border-radius:999px;font-size:14px;font-weight:600;line-height:1;
  cursor:pointer;white-space:nowrap;border:1px solid transparent;
  transition:transform .2s var(--ease-lux),box-shadow .2s var(--ease-lux),
             border-color .2s var(--ease-lux),background-color .2s var(--ease-lux);}
.lp-btn-coin{background:var(--ink);color:#fff;border-color:rgba(212,175,55,.3);
  box-shadow:0 4px 16px rgba(26,26,31,.18);}
.lp-btn-coin:hover:not(:disabled){transform:translateY(-2px);
  box-shadow:0 10px 28px rgba(26,26,31,.26);border-color:rgba(212,175,55,.6);}
.lp-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;}

/* Peringatan galat */
.lp-alert{display:flex;align-items:flex-start;gap:11px;padding:14px 16px;border-radius:14px;
  font-size:13.5px;line-height:1.6;color:#8A2F2B;
  background:rgba(217,83,79,.08);border:1px solid rgba(217,83,79,.28);}

.lp-link{color:var(--gold-text);font-weight:600;
  transition:color .2s var(--ease-lux);}
.lp-link:hover{color:var(--gold-deep);text-decoration:underline;text-underline-offset:3px;}

/* Teks bantu kecil di bawah field (status slug, dsb.) */
.lp-hint{font-size:12.5px;line-height:1.6;color:var(--ink-mute);}

/* Tautan di bawah form ("Belum punya akun? Daftar") */
.au-foot-note{margin-top:26px;text-align:center;font-size:14px;color:var(--ink-soft);}

/* Statistik & daftar fitur di panel kiri */
/* Strip mendatar di bawah kartu — ringkas, tidak menyaingi form. */
/* Statistik & fitur duduk di SISI KIRI yang TERANG, jadi memakai warna tinta.
   (Kalau latar sisi kiri diubah gelap lagi, warna di sini harus ikut dibalik.) */
.au-stats{display:flex;align-items:flex-start;gap:0;}
.au-stats > div{position:relative;flex:1;padding-right:18px;}
.au-stats > div + div{padding-left:24px;}
.au-stats > div + div::before{content:'';position:absolute;left:0;top:2px;bottom:2px;
  width:1px;background:rgba(212,175,55,.28);}
.au-stat-num{font-family:'Playfair Display',Georgia,serif;font-size:30px;line-height:1;
  letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;}
.au-stat-label{margin-top:10px;font-size:10.5px;text-transform:uppercase;letter-spacing:.15em;
  color:var(--ink-mute);font-weight:500;line-height:1.5;}
.au-feats{display:grid;grid-template-columns:1fr 1fr;gap:14px 22px;}
.au-feat{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--ink-soft);}
.au-feat svg{width:16px;height:16px;flex:none;color:var(--gold-deep);}

/* Kendali kecil di form Daftar (isi-otomatis slug, status ketersediaan) */
.au-check{width:16px;height:16px;accent-color:var(--ink);cursor:pointer;}
.au-check-label{font-size:12.5px;font-weight:500;color:var(--ink-soft);
  transition:color .2s var(--ease-lux);}
.group:hover .au-check-label{color:var(--gold-text);}
.au-mini-spinner{width:17px;height:17px;border-radius:50%;
  border:2px solid rgba(212,175,55,.25);border-top-color:var(--gold);
  animation:au-spin .8s linear infinite;}
@keyframes au-spin{to{transform:rotate(360deg)}}
.au-slug-warn{margin-top:9px;padding:9px 12px;border-radius:11px;font-size:12.5px;
  line-height:1.6;font-weight:500;color:#8A5A00;
  background:rgba(212,175,55,.11);border:1px solid rgba(212,175,55,.34);}
.au-slug-url{margin-top:10px;font-size:12.5px;line-height:1.6;color:var(--ink-mute);word-break:break-all;}
.au-slug-value{font-weight:600;color:var(--gold-text);}

/* Pemisah bagian di form panjang ("Akun Admin") */
.au-sep{display:flex;align-items:center;gap:12px;padding-top:10px;}
.au-sep-label{font-size:11.5px;font-weight:600;text-transform:uppercase;
  letter-spacing:.18em;color:var(--gold-text);white-space:nowrap;}
.au-sep-line{flex:1;height:1px;
  background:linear-gradient(90deg,rgba(212,175,55,.4),transparent);}

@keyframes au-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}
  75%{transform:translateX(5px)}}
.animate-shake{animation:au-shake .32s var(--ease-lux);}

/* ── react-datepicker: samakan dengan bahasa desain ── */
.au-root .react-datepicker-wrapper{width:100%;display:block;}
.au-root .react-datepicker{font-family:'Inter',system-ui,sans-serif;
  border:1px solid var(--line);border-radius:16px;overflow:hidden;
  box-shadow:0 12px 40px rgba(31,38,60,.14);}
.au-root .react-datepicker__header{background:var(--champagne);border-bottom:1px solid rgba(212,175,55,.2);}
.au-root .react-datepicker__day--selected,
.au-root .react-datepicker__day--keyboard-selected{background:var(--ink);color:#fff;}
.au-root .react-datepicker__day--selected:hover{background:var(--ink);}
.au-root .react-datepicker__day:hover{background:rgba(212,175,55,.18);}

@media (prefers-reduced-motion:reduce){
  .au-root *{animation-duration:.01ms!important;transition-duration:.01ms!important;}
}
/* Sisi kiri memakai gradien PADAT (bukan kaca), jadi tidak butuh fallback
   @supports untuk backdrop-filter di sini. */

/* ══════════ RESPONSIF — MOBILE-FIRST ══════════ */
@media (min-width:480px){
  .au-panel{padding:80px 24px 56px;}
  .au-top-right{top:22px;right:24px;}
}
@media (min-width:768px){
  .au-panel{padding:88px 32px 64px;}
  .au-top-right{top:26px;right:32px;}
  /* Form Daftar dua kolom baru masuk akal di lebar ini. */
  .au-form-wrap.is-wide{max-width:600px;}
}
@media (min-width:1200px){
  /* Sisi kiri baru muncul di 1200px (bukan 1024px): dengan lebar 52%, pada
     1024px sisi kanan hanya menyisakan ~412px — terlalu sempit untuk form
     Daftar yang bergrid dua kolom. */
  .au-aside{display:flex;}
  .au-aside-inner{padding:52px 48px 44px;}
  .au-panel{padding:56px 40px;}
  .au-top-right{top:28px;right:40px;}
  .au-brand-mobile{display:none;}
  .au-form-wrap{max-width:400px;}
  .au-form-wrap.is-wide{max-width:520px;}
}
@media (min-width:1440px){
  .au-aside-inner{padding:64px 64px 56px;}
  .au-panel{padding:64px 56px;}
  .au-form-wrap{max-width:420px;}
  .au-form-wrap.is-wide{max-width:560px;}
}
@media (min-width:1760px){
  /* Layar sangat lebar: form ikut membesar sedikit supaya tidak mengambang,
     tapi tetap di bawah panjang baris yang nyaman dibaca. */
  .au-aside-inner{padding:76px 88px 68px;}
  .au-form-wrap{max-width:440px;}
  .au-form-wrap.is-wide{max-width:600px;}
}
        `}</style>
    );
}
