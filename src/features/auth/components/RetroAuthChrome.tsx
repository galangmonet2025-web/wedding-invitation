import { Link } from 'react-router-dom';

/**
 * Retro-game auth chrome — SATU sumber gaya untuk halaman Masuk & Daftar agar
 * SENADA dengan landing page (NewLandingPage). Berisi:
 *   - <RetroAuthStyle/>  : blok <style> berisi token (--lp-*) + kelas .lp-* yang
 *                          dipakai bersama, disalin dari landing page supaya visual
 *                          identik (font pixel 'Press Start 2P', border 3D ala NES,
 *                          tombol koin, panel langit + awan/pipa/goomba).
 *   - <RetroAuthAside/>  : panel kiri (hanya lg+) bergaya "world 1-1": langit
 *                          bergradasi, awan melayang, pipa, goomba, blok "?",
 *                          koin, logo blok, judul + statistik.
 *
 * Semua penanganan data/logika tetap di halaman masing-masing; komponen ini murni
 * presentasional sehingga tidak mengubah perilaku login/registrasi.
 */

interface RetroAuthAsideProps {
    logoUrl: string | null;
    fallbackLogo: string;
    title: string;
    desc: string;
    /** Statistik/kisi-fitur yang tampil di bawah deskripsi (opsional). */
    children?: React.ReactNode;
}

export function RetroAuthAside({ logoUrl, fallbackLogo, title, desc, children }: RetroAuthAsideProps) {
    return (
        <div className="lp-auth-aside hidden lg:flex lg:flex-1 relative overflow-hidden">
            {/* dekorasi world 1-1: awan, bukit, pipa, goomba, blok ?, koin */}
            <div className="lp-hero-deco" aria-hidden="true">
                <span className="lp-cloud c1" />
                <span className="lp-cloud c2" />
                <span className="lp-cloud c3" />
                <span className="lp-hill h1" />
                <span className="lp-hill h2" />
                <span className="lp-qblock d1">?</span>
                <span className="lp-qblock d2">?</span>
                <span className="lp-coin co1" />
                <span className="lp-coin co2" />
                <span className="lp-pipe" />
                <span className="lp-goomba" />
            </div>
            <div className="lp-ground" />

            {/* konten depan */}
            <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
                <Link to="/landing-page" className="lp-logo-block !w-20 !h-20 !text-3xl mb-8 overflow-hidden p-3 hover:brightness-110 transition-all">
                    <img src={logoUrl || fallbackLogo} alt="Logo" className="w-full h-full object-contain" />
                </Link>
                <h1 className="lp-pixel text-lg lg:text-2xl leading-[1.6] text-center text-white mb-5" style={{ textShadow: '4px 4px 0 rgba(0,0,0,.45)' }}>
                    {title}
                </h1>
                <p className="text-base text-white/85 text-center max-w-md leading-relaxed font-medium">
                    {desc}
                </p>
                {children}
            </div>
        </div>
    );
}

/**
 * Blok gaya bersama. Import di HALAMAN (bukan di aside) supaya kelas .lp-* juga
 * berlaku untuk panel kanan (form). Aman dirender dua kali (login+register tak
 * pernah tampil bersamaan), tetapi tetap gunakan `rm-lp` sebagai pembatas scope.
 */
export function RetroAuthStyle() {
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
    transition: transform .1s, box-shadow .1s; display: inline-block;
}
.rm-lp .lp-btn:disabled { opacity: .6; cursor: not-allowed; }
.rm-lp .lp-btn:not(:disabled):active { transform: translateY(4px); }
.rm-lp .lp-btn-coin { background: var(--lp-coin); color: #000; box-shadow: 0 5px 0 var(--lp-coin-deep); }
.rm-lp .lp-btn-coin:not(:disabled):active { box-shadow: 0 1px 0 var(--lp-coin-deep); }
.rm-lp .lp-btn-green { background: var(--lp-green); color: #fff; box-shadow: 0 5px 0 var(--lp-green-2); }
.rm-lp .lp-btn-green:not(:disabled):active { box-shadow: 0 1px 0 var(--lp-green-2); }
.rm-lp .lp-btn-ghost { background: rgba(255,255,255,.08); color: #fff; box-shadow: 0 5px 0 rgba(0,0,0,.5); }

.rm-lp .lp-pixel-border { border: 4px solid #000; box-shadow: 6px 6px 0 rgba(0,0,0,.5); }

/* ---- left aside: sky "world 1-1" ---- */
.rm-lp .lp-auth-aside {
    background: linear-gradient(180deg, var(--lp-sky-deep) 0%, var(--lp-sky) 55%, var(--lp-sky-2) 100%);
    border-right: 4px solid #000;
}
.rm-lp .lp-ground {
    position: absolute; left: 0; right: 0; bottom: 0; height: 46px; z-index: 2;
    background: repeating-linear-gradient(90deg, var(--lp-ground) 0 30px, var(--lp-ground-2) 30px 32px);
    border-top: 4px solid #000;
}
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

.rm-lp .lp-logo-block {
    width: 40px; height: 40px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
    font-family: 'Press Start 2P', monospace; font-size: 16px; color: #7a4d00;
    background: var(--lp-coin); border: 3px solid #000; border-radius: 3px;
    box-shadow: inset 0 0 0 3px var(--lp-coin-deep), 3px 3px 0 rgba(0,0,0,.4);
    animation: lp-bob 2.4s steps(2) infinite;
}

/* ---- form panel + inputs ---- */
.rm-lp .lp-form-panel { background: var(--lp-ink); }
.rm-lp .lp-eyebrow {
    display: inline-block; font-family: 'Press Start 2P', monospace; font-size: 7px; letter-spacing: 2px;
    color: #000; background: var(--lp-coin); border: 3px solid #000; border-radius: 3px;
    padding: 5px 9px; box-shadow: 3px 3px 0 rgba(0,0,0,.4);
}
/* Label field pakai font NORMAL (bukan pixel) — huruf pixel 8px terlalu lebar &
   memakan tempat, gampang wrap 2 baris dan terasa "kegedean". Bold + uppercase
   + tracking sudah cukup memberi nuansa retro sambil tetap ringkas & terbaca. */
.rm-lp .lp-label {
    display: block; font-size: 11px; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; color: rgba(255,255,255,.62); margin-bottom: 7px;
}
.rm-lp .lp-input {
    width: 100%; background: var(--lp-panel); color: #fff;
    border: 3px solid #000; border-radius: 3px; box-shadow: inset 0 0 0 2px rgba(255,255,255,.05);
    padding: 13px 14px; font-size: 14px; font-weight: 600; line-height: 1.4;
    transition: box-shadow .15s, border-color .15s;
}
.rm-lp .lp-input::placeholder { color: rgba(255,255,255,.35); font-weight: 500; }
.rm-lp .lp-input:focus { outline: none; border-color: var(--lp-coin); box-shadow: inset 0 0 0 2px rgba(250,192,0,.35), 0 0 0 3px rgba(250,192,0,.18); }
.rm-lp .lp-input.has-icon { padding-left: 44px; }
.rm-lp .lp-input.has-icon-right { padding-right: 44px; }
.rm-lp .lp-input:disabled { opacity: .6; cursor: not-allowed; }
.rm-lp .lp-input.is-error { border-color: var(--lp-red); box-shadow: inset 0 0 0 2px rgba(229,37,33,.35); }
/* selaraskan warna dropdown option di panel gelap */
.rm-lp select.lp-input option { background: var(--lp-panel); color: #fff; }
.rm-lp .lp-input-ico { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: rgba(255,255,255,.4); pointer-events: none; }
.rm-lp .lp-input:focus ~ .lp-input-ico { color: var(--lp-coin); }
.rm-lp .lp-input-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.5); background: none; border: none; cursor: pointer; padding: 4px; }
.rm-lp .lp-input-eye:hover { color: var(--lp-coin); }

.rm-lp .lp-alert {
    display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px;
    background: rgba(229,37,33,.12); border: 3px solid var(--lp-red-2); border-radius: 3px;
    color: #ffb4b1; font-size: 13px; font-weight: 600;
}
.rm-lp .lp-link { color: var(--lp-coin); font-weight: 700; text-decoration: none; }
.rm-lp .lp-link:hover { text-decoration: underline; }

.rm-lp .lp-stat-num { font-family: 'Press Start 2P', monospace; font-size: 20px; color: #fff; }
.rm-lp .lp-divider-v { width: 3px; height: 40px; background: repeating-linear-gradient(180deg, rgba(255,255,255,.3) 0 5px, transparent 5px 10px); }

/* LanguageSwitcher (komponen bersama, bergaya terang) dibuat terbaca di panel
   gelap retro tanpa mengubah komponennya. Scoped ke .rm-lp saja. */
.rm-lp .lp-form-panel button[aria-label="Toggle language"] {
    background: var(--lp-panel); border: 3px solid #000; border-radius: 3px;
    box-shadow: 0 3px 0 rgba(0,0,0,.5);
}
.rm-lp .lp-form-panel button[aria-label="Toggle language"]:hover { background: #241a44; }
.rm-lp .lp-form-panel button[aria-label="Toggle language"] span { color: #fff; }

/* ---- animations ---- */
@keyframes lp-drift { from { transform: translateX(0); } to { transform: translateX(150vw); } }
@keyframes lp-bob { 50% { transform: translateY(-6px); } }
@keyframes lp-spin { 50% { transform: scaleX(.15); } }
@keyframes lp-blink { 50% { opacity: .3; } }
@keyframes lp-walk { 50% { transform: translateX(24px) scaleX(-1); } }
.rm-lp .lp-blink { animation: lp-blink 1.1s steps(2) infinite; }

.rm-lp .no-scrollbar::-webkit-scrollbar { display: none; }
.rm-lp .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
    );
}
