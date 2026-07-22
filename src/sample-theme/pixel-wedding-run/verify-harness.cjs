/* Harness verifikasi PIXEL WEDDING RUN — Bible §13.2
   Menjalankan index.js sungguhan di jsdom (Phaser di-stub) lalu meng-assert
   invarian kontrak host + logika kepingan. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIR = __dirname;
let html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(DIR, 'index.js'), 'utf8');

/* --- Simulasikan templateParser host: resolve {{vars}} & {{#if}} --- */
const DATA = {
  groom_nickname: 'Bagas', bride_nickname: 'Sari',
  groom_name: 'Bagas Prasetyo', bride_name: 'Sari Wulandari',
  wedding_date: '12 Desember 2026', wedding_date_iso: '2026-12-12',
  tanggal_akad: '12 Desember 2026', jam_akad: '08.00 WIB',
  nama_lokasi_akad: 'Masjid Agung', keterangan_lokasi_akad: 'Jl. Merdeka 1',
  akad_map: 'https://maps.example/1',
  kode_undangan: 'WED-ABC123', guest_name: 'Budi',
  site_name: 'WeddingSaaS', quote: 'Cinta itu sabar', quote_by: 'QS',
  countdown_hari: '<span id="tm-countdown-days">10</span>',
  countdown_jam: '<span id="tm-countdown-hours">04</span>',
  countdown_menit: '<span id="tm-countdown-minutes">30</span>',
  countdown_detik: '<span id="tm-countdown-seconds">15</span>',
  bank_1: 'BCA', rek_1: '1234567890', nama_rek_1: 'Bagas',
  kalimat_penutup: 'Terima kasih.',
  /* flags */
  flag_lokasi_akad_dan_resepsi_berbeda: false,
  is_fitur_live_streaming: false,
  flag_pakai_timeline_kisah: false,
  has_gallery: false,
  flag_pakai_additional_feature_story_balasan_instagram: false,
  tampilkan_amplop_online: true,
  flag_tampilkan_nama_orang_tua: false,
  flag_tampilkan_sosial_media_mempelai: false,
  flag_pakai_2_rekening: false,
  flag_pakai_qris_rekening_1: false,
  flag_kirim_hadiah_offline: false,
  wishes: []
};

function truthy(v) {
  if (v === undefined || v === null) return false;
  if (v === false || v === 'false' || v === 'FALSE' || v === '0' || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
/* Resolve {{#if}}/{{/if}} berulang dari dalam ke luar, lalu {{#each}}, lalu {{var}} */
function render(tpl) {
  let prev = null, out = tpl, guard = 0;
  while (prev !== out && guard++ < 40) {
    prev = out;
    out = out.replace(/\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if)[\s\S])*?)\{\{\/if\}\}/g,
      (m, key, body) => {
        const parts = body.split(/\{\{else\}\}/);
        return truthy(DATA[key]) ? parts[0] : (parts[1] || '');
      });
  }
  out = out.replace(/\{\{#each\s+([\w.]+)\}\}[\s\S]*?\{\{\/each\}\}/g, (m, key) => {
    const arr = DATA[key];
    return Array.isArray(arr) && arr.length ? m : '';
  });
  out = out.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in DATA ? String(DATA[k]) : ''));
  return out;
}
html = render(html);
if (process.env.PWR_DEBUG) {
  const secs = [...html.matchAll(/data-info="([a-z]+)"/g)].map(m => m[1]);
  console.log('[debug] section setelah render:', secs.length, JSON.stringify(secs));
  console.log('[debug] sisa {{ :', (html.match(/\{\{/g) || []).length);
  const leftover = html.match(/\{\{[^}]{0,40}/g);
  if (leftover) console.log('[debug] contoh sisa:', JSON.stringify(leftover.slice(0, 6)));
}

/* --- Boot jsdom --- */
const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
  url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only'
});
const { window } = dom;
global.window = window; global.document = window.document;
global.navigator = window.navigator; global.localStorage = window.localStorage;
global.CSS = window.CSS;

/* Stub Phaser minimal — kita menguji lapisan integrasi, bukan render */
let sceneInstance = null;
function Scene(cfg) { this.sys = { settings: cfg }; }
Scene.prototype.add = {};
window.Phaser = {
  VERSION: '3.80.1', AUTO: 0,
  Scene: function (cfg) { this._cfg = cfg; },
  Scale: { NONE: 0, NO_CENTER: 0, FIT: 1, CENTER_BOTH: 2, RESIZE: 3 },
  Input: { Keyboard: { KeyCodes: { LEFT:37, RIGHT:39, UP:38, A:65, D:68, W:87, SPACE:32 } } },
  Math: { Between: (a, b) => a },
  Game: function (cfg) {
    this.canvas = window.document.createElement('canvas');
    const stage = window.document.getElementById('pwr-stage');
    if (stage) stage.appendChild(this.canvas);
    this.destroyed = false;
    this.scene = { getScene: () => sceneInstance };
    this.destroy = function () { this.destroyed = true; try { this.canvas.remove(); } catch(e){} };
  }
};
window.Phaser.Scene.prototype = {};

/* Stub AudioContext & rAF */
window.AudioContext = function () {
  return { state:'running', currentTime:0, resume(){}, close(){},
    createOscillator: () => ({ type:'', frequency:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} },
      connect(){}, start(){}, stop(){} }),
    createGain: () => ({ gain:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} }),
    destination: {} };
};

/* --- Jalankan index.js --- */
const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond, extra: extra || '' });
}
try {
  window.eval(js);
} catch (e) {
  check('index.js dieksekusi tanpa error', false, e.message);
  report(); process.exit(1);
}
/* jsdom melaporkan readyState 'loading' walau DOM sudah lengkap, sehingga tema
   menunggu DOMContentLoaded. Picu event itu supaya init benar-benar berjalan —
   ini mensimulasikan browser sungguhan, bukan melewati logika tema. */
try {
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
} catch (e) {}
check('T0  init berjalan setelah DOMContentLoaded', window.eval('STORE !== null'));

/* =====================================================================
   TES
   ===================================================================== */

/* 1. Section riil terdeteksi dinamis (flag mematikan 5 section) */
const infos = window.eval('INFOS');
const expected = ['hero','couple','rsvp','schedule','wishes','gift','closing'];
check('T1  scanSections dinamis (7 section aktif)',
  JSON.stringify(infos) === JSON.stringify(expected), JSON.stringify(infos));

/* 2. Quota ter-scale saat section < 11 */
const quota = window.eval('QUOTA');
const qsum = quota.reduce((a,b)=>a+b,0);
check('T2  quota auto-scale = jumlah section', qsum === infos.length,
  `quota=${JSON.stringify(quota)} sum=${qsum} infos=${infos.length}`);

/* 3. piecesForStage deterministik + tidak duplikat lintas stage */
const p0a = window.eval('piecesForStage(0)').join(',');
const p0b = window.eval('piecesForStage(0)').join(',');
let allPieces = [];
for (let i = 0; i < 6; i++) allPieces = allPieces.concat(window.eval(`piecesForStage(${i})`));
const uniq = new Set(allPieces);
check('T3  piecesForStage deterministik', p0a === p0b, p0a);
check('T3b pemetaan stage tidak duplikat', uniq.size === allPieces.length,
  `total=${allPieces.length} unik=${uniq.size}`);
check('T3c semua section terpetakan', uniq.size === infos.length,
  `terpetakan=${uniq.size} infos=${infos.length}`);

/* 4. RSVP casing — WAJIB lowercase hadir/tidak-hadir */
const statusEl = document.querySelector('[data-pwrid="rsvp-status"]');
const optVals = statusEl ? Array.from(statusEl.querySelectorAll('option')).map(o=>o.value) : [];
check('T4  rsvp-status lowercase hadir/tidak-hadir',
  JSON.stringify(optVals) === JSON.stringify(['hadir','tidak-hadir']), JSON.stringify(optVals));

/* 5. Card RSVP punya [data-rsvp-branch] (host tak menimpa innerHTML) */
const card = document.querySelector('[data-pwrid="alert-submit-kehadiran"]');
const branches = card ? card.querySelectorAll('[data-rsvp-branch]').length : 0;
check('T5  alert-submit-kehadiran punya 2 branch', branches === 2, `branch=${branches}`);

/* 6. Template ucapan ada */
check('T6  [data-wish-template] tersedia',
  !!document.querySelector('[data-wish-template]'));
check('T6b [data-loop="wishes"] tersedia',
  !!document.querySelector('[data-loop="wishes"]'));

/* 7. DE-ID: sebelum clone, TIDAK ada id host di source (pakai data-pwrid) */
const idsBefore = ['rsvp-code','rsvp-status','wish-name','tm-countdown-days']
  .map(id => document.querySelectorAll('#' + id).length);
check('T7  sebelum clone: nol duplicate id host',
  idsBefore.every(n => n <= 1), JSON.stringify(idsBefore));

/* 8. Buka reveal -> clone dapat id, source kehilangan id (nol duplikat) */
window.eval('cheat.on = true; for (var i=0;i<INFOS.length;i++) unlockInfo(INFOS[i], true);');
window.eval('revealFullInvitation()');
const dupCheck = {};
['rsvp-code','rsvp-status','rsvp-guests','wish-name','wish-message',
 'btn-submit-kehadiran','alert-submit-kehadiran','tm-countdown-days'].forEach(id => {
  dupCheck[id] = document.querySelectorAll('#' + id).length;
});
const allSingle = Object.values(dupCheck).every(n => n === 1);
check('T8  saat reveal: tiap id host TEPAT 1 (de-ID bekerja)', allSingle, JSON.stringify(dupCheck));

/* 9. Clone yang ber-id adalah yang TAMPIL (bukan #inv-source) */
const codeEl = document.getElementById('rsvp-code');
const insideSource = codeEl ? !!codeEl.closest('#inv-source') : true;
check('T9  #rsvp-code berada di clone, bukan di #inv-source', !insideSource);

/* 10. Tutup reveal -> id kembali ke source, clone kosong */
window.eval('closeReveal()');
const afterClose = document.querySelectorAll('#rsvp-code').length;
const revealBody = document.getElementById('pwr-reveal-body');
check('T10 setelah tutup: id kembali (tepat 1)', afterClose === 1, `n=${afterClose}`);
check('T10b body reveal dikosongkan', revealBody && revealBody.innerHTML.trim() === '');

/* 11. Piece modal juga de-ID (satu clone ber-id pada satu waktu) */
window.eval('openPieceModal("rsvp")');
const dupModal = document.querySelectorAll('#rsvp-status').length;
check('T11 piece modal: nol duplicate id', dupModal === 1, `n=${dupModal}`);
window.eval('closePieceModal()');

/* 12. Freeze saat dialog terbuka */
window.eval('openPieceModal("hero")');
const anyOpen = window.eval('anyOverlayOpen()');
check('T12 anyOverlayOpen true saat modal terbuka', anyOpen === true);
window.eval('closePieceModal()');
/* Cover memang ber-class show di awal (dan itu benar — run belum mulai), jadi
   yang relevan di sini adalah "ada dialog DI ATAS game". */
check('T12b tak ada dialog di atas game setelah modal ditutup',
  window.eval('anyDialogOverGame()') === false);

/* 13. unlockInfo idempoten */
window.eval('STORE.unlocked = []; saveStore();');
const r1 = window.eval('unlockInfo("hero")');
const r2 = window.eval('unlockInfo("hero")');
const nUnlocked = window.eval('STORE.unlocked.length');
check('T13 unlockInfo idempoten', r1 === true && r2 === false && nUnlocked === 1,
  `r1=${r1} r2=${r2} n=${nUnlocked}`);

/* 14. Cheat off tidak mencabut kepingan + mematikan kebal */
window.eval('cheat.on=false; toggleCheat();');           // on
const afterOn = window.eval('STORE.unlocked.length');
window.eval('toggleCheat();');                            // off
const afterOff = window.eval('STORE.unlocked.length');
check('T14 cheat on membuka semua kepingan', afterOn === infos.length, `n=${afterOn}`);
check('T14b cheat off TIDAK mencabut kepingan', afterOff === infos.length, `n=${afterOff}`);
check('T14c cheat.on tidak di-persist',
  !('cheat' in JSON.parse(localStorage.getItem('pwr_progress_v1') || '{}')));

/* 15. Cleanup idempoten + tidak mereset __pwrStarted */
window.__pwrStarted = true;
window.eval('window.__pwrCleanup()');
const startedAfter = window.__pwrStarted;
let cleanupTwiceOk = true;
try { window.eval('if (window.__pwrCleanup) window.__pwrCleanup()'); } catch (e) { cleanupTwiceOk = false; }
check('T15 cleanup tidak mereset __pwrStarted (anti intro re-exec)', startedAfter === true);
check('T15b cleanup aman dipanggil 2x', cleanupTwiceOk);

/* 16. Reset PENUH: storage wipe + diff default + cover tampil */
window.eval(`
  STORE.diff='hard'; STORE.unlocked=['hero','couple']; STORE.maxStage=4; STORE.best=999; saveStore();
`);
window.eval('resetGame()');
const raw = JSON.parse(localStorage.getItem('pwr_progress_v1') || '{}');
const coverShown = document.getElementById('pwr-ov-cover').classList.contains('show');
check('T16 reset: diff kembali default', raw.diff === 'easy', `diff=${raw.diff}`);
check('T16b reset: unlocked kosong', (raw.unlocked||[]).length === 0);
check('T16c reset: maxStage 0', raw.maxStage === 0);
check('T16d reset: kembali ke cover', coverShown === true);

/* 17. Jump-arc sesuai konstanta repo */
const jumpH = window.eval('JUMP_H_PX');
const dmax = window.eval('D_MAX_PX');
/* REVISI 5 — aturan lama di sini JUSTRU penyebab keluhan "melayang".
   Dulu tesnya menuntut lompat >= 28% tinggi layar, dengan alasan menjaga
   proporsi terhadap frame potret. Tapi proporsi layar bukan ukuran yang benar
   untuk rasa lompat: yang dirasakan pemain adalah tinggi dalam TILE dan lama
   di udara. Mengejar 28% memaksa tinggi 288px = 9 tile = 1,6 detik melayang,
   dua kali lipat platformer klasik. Ukuran yang benar: 3-6 tile, <= 0,95s. */
check('T17 tinggi lompat 3-6 tile (ukuran platformer klasik)',
  jumpH >= 96 && jumpH <= 192, `h=${jumpH.toFixed(0)}px (${(jumpH / 32).toFixed(1)} tile)`);
/* REVISI 6: batas atas dinaikkan 2,2 -> 3,2. Batas lama diam-diam
   mengunci lengkungan KOTAK (h/D ~ 1,0). Mario asli justru D = 2,9 x h
   (73,5px tinggi : 210px jauh) — lompatan yang jauh lebih lebar daripada
   tinggi. Batas bawah tetap dijaga: D < h berarti gap tak terlompati. */
check('T17b D_max sebanding tinggi lompat (gap tetap bisa dilompati)',
  dmax >= jumpH && dmax <= jumpH * 3.2, `d=${dmax.toFixed(0)} h=${jumpH.toFixed(0)} D/h=${(dmax / jumpH).toFixed(2)}`);

/* 17d. HITBOX HANTU: tiap tipe musuh punya ukuran body sendiri, dan spawnEnemy
   WAJIB me-resize saat mendaur ulang dari pool. Tanpa ini E5 (30x44) yang dipakai
   ulang sebagai E1 (24x20) membawa hitbox lama -> "kena monster tak terlihat". */
const bodyMap = window.eval('ENEMY_BODY');
check('T17d ENEMY_BODY punya entri untuk 6 tipe',
  bodyMap && Object.keys(bodyMap).length === 6, JSON.stringify(bodyMap));
check('T17e spawnEnemy me-resize body (body.setSize dipanggil)',
  /spawnEnemy[\s\S]{0,900}body\.setSize\(/.test(js));
check('T17f spawnEnemy mereset alpha/scale/angle (bersih dari pool)',
  /spawnEnemy[\s\S]{0,600}setAlpha\(1\)[\s\S]{0,60}setScale\(1\)/.test(js));
check('T17g touchEnemy menolak musuh mati / body mati',
  /touchEnemy[\s\S]{0,400}!e\.alive[\s\S]{0,80}body\.enable/.test(js));

/* 18. Generator level: density lolos + gap tak melebihi D_max */
window.eval('BH = 960; BW = 540;');
let densityFails = 0, worstGap = 0, stagesBuilt = 0, pieceCount = 0;
for (let s = 0; s < 6; s++) {
  const L = window.eval(`buildLevel(${s}, 'normal', 12345)`);
  stagesBuilt++;
  pieceCount += L.pieces.length;
  window.__L = L;
  const fails = window.eval(`validateDensity(window.__L, CONFIG_GROUND_Y(), DIFF.normal)`);
  densityFails += fails.length;
  const g = L.ground.slice().sort((a,b)=>a.x-b.x);
  for (let i = 0; i < g.length - 1; i++) {
    const gap = g[i+1].x - (g[i].x + g[i].w);
    if (gap > worstGap) worstGap = gap;
  }
}
check('T18 6 stage ter-generate', stagesBuilt === 6);
check('T18b validateDensity: nol kegagalan', densityFails === 0, `fails=${densityFails}`);
check('T18c gap terlebar <= D_max*0.92', worstGap <= dmax * 0.92 + 1,
  `worst=${worstGap.toFixed(0)} max=${(dmax*0.92).toFixed(0)}`);

/* 19. Spawn list terurut (wajib untuk spawn relatif-kamera) */
const L0 = window.eval("buildLevel(1,'normal',12345)");
let sorted = true;
for (let i = 1; i < L0.spawns.length; i++) {
  if (L0.spawns[i].x < L0.spawns[i-1].x) { sorted = false; break; }
}
check('T19 spawnList terurut menaik', sorted, `n=${L0.spawns.length}`);
check('T19b ada musuh di stage', L0.spawns.length > 0, `n=${L0.spawns.length}`);

/* 20. Kepingan sesuai quota total */
check('T20 total kepingan tersebar = jumlah section', pieceCount === infos.length,
  `tersebar=${pieceCount} infos=${infos.length}`);

/* 21. flag FAB & musik: tema tidak boleh memutar audio sendiri */
check('T21 tema tidak memanggil audio.play()', !/\baudio\s*\.\s*play\s*\(/.test(js) &&
  !/getElementById\(['"]bg-music['"]\)\s*\.\s*play/.test(js));
check('T21b tidak menulis #play-icon / #pause-icon',
  !/getElementById\(['"](play|pause)-icon['"]\)\s*\.\s*style/.test(js));

/* 22. Tidak ada MutationObserver (terbukti merusak di retromario) */
/* Buang komentar dulu: kita MENYEBUT MutationObserver di komentar sebagai
   larangan eksplisit, itu bukan pemakaian. */
const codeOnly = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
check('T22 nol MutationObserver (di luar komentar)', !/MutationObserver/.test(codeOnly));

/* 23. Tidak memasang listener klik ke tombol submit host (anti dobel submit) */
check('T23 tidak meng-handle #btn-submit-* sendiri',
  !/btn-submit-(kehadiran|ucapan|hadiah)['"]\s*\]?\s*\)?\s*\.\s*addEventListener/.test(js) &&
  !/DELEGATED\[[^\]]*btn-submit/.test(js));

/* 24. API Phaser 3.60+ (bukan createEmitter yang dihapus) */
check('T24 tidak memakai createEmitter (API dihapus 3.60)', !/\.createEmitter\s*\(/.test(js));

/* 24b. PIXEL ART: nol bentuk halus. fillCircle/fillEllipse/arc/fillTriangle
   menghasilkan tepi anti-aliased -> terlihat vektor, bukan game 16-bit.
   Ini penyebab keluhan "grafis 100% tidak mirip" pada versi pertama. */
check('T24b nol fillCircle/fillEllipse/arc/fillTriangle (di luar komentar)',
  !/fillCircle|fillEllipse|\.arc\(|fillTriangle|strokeCircle/.test(codeOnly));
check('T24c sistem art map tersedia (paintArt + CP)',
  /function paintArt\(/.test(js) && /var CP = \{/.test(js));
check('T24d sprite dibangun dari art map, bukan primitif',
  /makeArtTexture\(scene, 't_groom_idle0'/.test(js));

/* 24e. RASIO OUTLINE: sprite retro TIDAK dibingkai garis hitam.
   Revisi 2 sempat 41% piksel gelap -> terlihat seperti stiker, bukan sprite.
   Batas: <=18% piksel gelap ('I'/'K') per sprite. */
(function () {
  const artBlock = js.slice(js.indexOf('var PX  = 4;'), js.indexOf('function makeArtTexture'));
  const sandbox = {};
  try {
    new Function('exports', artBlock + '\nexports.g=groomArt;exports.k=kepikArt;exports.s=siputArt;exports.b=brideArt;')(sandbox);
  } catch (e) { /* diabaikan; dicek di bawah */ }
  /* Hitung porsi piksel GELAP. ',' adalah outline sprite detail baru;
     'I'/'K' tetap dihitung karena masih dipakai art-map lama (bride, prop).
     CATATAN: sebelumnya fungsi ini hanya menghitung 'I'/'K', sehingga
     setelah sprite pindah ke outline ',' hasilnya 0% dan tes LULUS PALSU. */
  function inkRatio(rows) {
    let dark = 0, total = 0;
    rows.forEach(r => { for (const c of r) if (c !== '.' && c !== ' ') { total++; if (c === 'I' || c === 'K' || c === ',') dark++; } });
    return total ? dark / total : 1;
  }
  if (sandbox.g) {
    const rg = inkRatio(sandbox.g('idle'));
    const rk = inkRatio(sandbox.k(0));
    const rb = inkRatio(sandbox.b());
    /* Batas dinaikkan 18% -> 42%: sprite ber-outline penuh memang punya
       porsi piksel gelap lebih besar. Yang dijaga sekarang adalah outline
       ADA (>=8%) tapi tidak MENELAN isi (<=42%). */
    check('T24e groom outline 8-42%', rg >= 0.08 && rg <= 0.42, `${Math.round(rg*100)}%`);
    check('T24f kepik outline 8-42%', rk >= 0.08 && rk <= 0.42, `${Math.round(rk*100)}%`);
    check('T24g bride outline <=42%', rb <= 0.42, `${Math.round(rb*100)}%`);
  } else {
    check('T24e art block dapat dievaluasi', false, 'gagal parse');
  }
})();

/* 24h. PIKSEL BESAR: piksel harus tetap KOTAK BESAR (bukan ilustrasi halus).
   PX tetap >= 4 untuk tile/prop; sprite karakter memakai HPX (separuh PX)
   dengan grid 2x lebih rapat, sehingga UKURAN LAYAR sama tapi detail 4x. */
check('T24h PX >= 4 (piksel besar)', /var PX\s*=\s*[4-9]/.test(js));
check('T24h2 HPX = separuh PX (grid detail, ukuran layar tetap)',
  /var HPX\s*=\s*2/.test(js));

/* 24i. REVISI "ala Ape Escape": sprite karakter harus PUNYA OUTLINE dan
   ramp warna berjenjang. Dua ciri itulah yang membedakan pixel art 16-bit
   yang matang dari bidang warna datar. Dulu tes ini mengunci grid <= 14
   kolom (ala Mario 16x16); aturan itu sengaja DIGANTI karena outline +
   4 nilai warna + fitur wajah mustahil muat di 12x16. */
(function () {
  const g = js.slice(js.indexOf('function groomArt'), js.indexOf('function brideArt'));
  const rows = g.match(/'[^']{16,}'/g) || [];
  const wide = rows.filter(r => r.length - 2 >= 20);
  check('T24i grid groom >= 20 kolom (ruang untuk detail)', wide.length > 10,
    'baris lebar=' + wide.length);
  check('T24i2 sprite groom memakai outline (,)',
    /,/.test(g) && (g.match(/,/g) || []).length > 40);
  check('T24i3 kulit memakai ramp >= 3 nilai (1/2/3/4)',
    /1/.test(g) && /2/.test(g) && /3/.test(g));
  check('T24i4 palet punya warna outline gelap',
    /',':\s*0x0d0b14/.test(js));
  /* Jaga jangan sampai 'Q' dipakai lagi sebagai outline: 'Q' sudah
     terdaftar sebagai emas (0xffc000) di palet lingkungan, dan definisi
     terakhir menang -> outline berubah kuning menyala (bug nyata). */
  check('T24i5 outline BUKAN huruf Q (bentrok emas 0xffc000)',
    !/Q:\s*0x0d0b14/.test(js));
})();

/* 25. PRNG ber-seed, bukan Math.random untuk layout */
const buildFn = js.slice(js.indexOf('function buildLevel'), js.indexOf('function CONFIG_GROUND_Y'));
check('T25 buildLevel tidak memakai Math.random langsung',
  !/Math\.random\(/.test(buildFn));

/* =====================================================================
   26. REVISI 4 — "retro pixel art cantik"
   Yang membuat referensi terlihat indah bukan sprite-nya, tapi latarnya:
   dithering menggantikan gradient, palet per-stage, dan atmospheric
   perspective (lapis jauh PUCAT, bukan gelap). Tes di bawah mengunci
   ketiganya supaya tidak diam-diam kembali ke gradient/warna global.
   ===================================================================== */

check('T26 nol fillGradientStyle (gradient halus = bukan pixel art)',
  !codeOnly.includes('fillGradientStyle'));

check('T26b matriks dither Bayer 4x4 ada',
  /BAYER4\s*=\s*\[[\s\S]{0,200}?\[\s*0,\s*8,\s*2,\s*10\s*\]/.test(js));

/* T26c — dulu tes ini mencari teks "ditherBand(" dalam 1600 karakter
   pertama sesudah nama fungsi. Itu rapuh: menambah komentar penjelas
   saja sudah membuatnya gagal walau langitnya tetap ber-dither. Diganti
   dengan memeriksa BADAN fungsi seutuhnya (sampai kurung tutupnya),
   bukan sepotong jendela karakter. Perilaku sesungguhnya diuji terpisah
   di verify-pixelart.cjs, yang benar-benar menjalankan fungsinya. */
check('T26c langit digambar ber-dither, bukan blok polos',
  (() => {
    const i = js.indexOf('function paintSkyDithered');
    if (i < 0) return false;
    const nx = js.indexOf('\nfunction ', i + 10);
    const body = js.slice(i, nx < 0 ? js.length : nx);
    return /ditherBand\(/.test(body);
  })());

/* T26c2 — cakrawala WAJIB mengikuti garis tanah, bukan persentase frame.
   Bug nyata ("banyak ruang kosong antar object"): hzY dipatok BH*0.30
   sementara tanah bisa turun sampai y=880, menyisakan pita datar ~580px
   tanpa isi di tengah layar. */
check('T26c2 cakrawala terikat ke tanah (bukan BH*0.30 mati)',
  /function paintSkyDithered\(g, P, GY\)/.test(js) &&
  /ground - BH \* 0\.20/.test(js) &&
  /paintSkyDithered\(sky, SKIES\[S\.id\] \|\| SKIES\[0\], GY\)/.test(js));

check('T26d ukuran titik dither >= PX sprite (bukan noise)',
  (() => {
    const dp = +(/var DP\s*=\s*(\d+)/.exec(js) || [])[1];
    const px = +(/var PX\s*=\s*(\d+)/.exec(js) || [])[1];
    return { ok: dp >= px, extra: `DP=${dp} PX=${px}` };
  })());

check('T26e ada 6 palet stage (satu per stage)',
  (() => {
    const m = /var SKIES\s*=\s*\[([\s\S]*?)\n\];/.exec(js);
    const n = m ? (m[1].match(/sky2:/g) || []).length : 0;
    return { ok: n === 6, extra: `n=${n}` };
  })());

check('T26f tiap palet stage punya ramp lengkap',
  (() => {
    const m = /var SKIES\s*=\s*\[([\s\S]*?)\n\];/.exec(js);
    if (!m) return { ok: false, extra: 'SKIES tidak ditemukan' };
    const need = ['sky2','sky1','far','farHi','mid','midHi','near','nearHi','gTop','gMid','gBot','sun'];
    const missing = need.filter(k => (m[1].match(new RegExp(k + ':', 'g')) || []).length !== 6);
    return { ok: missing.length === 0, extra: missing.length ? 'kurang: ' + missing.join(',') : 'lengkap' };
  })());

/* Atmospheric perspective: lapis JAUH harus lebih dekat ke warna langit
   daripada lapis DEKAT. Kalau terbalik (jauh lebih gelap), kedalaman hilang
   dan lapisan terlihat seperti stiker bertumpuk. */
check('T26g lapis jauh lebih pucat dari lapis dekat (atmospheric perspective)',
  (() => {
    const m = /var SKIES\s*=\s*\[([\s\S]*?)\n\];/.exec(js);
    if (!m) return { ok: false, extra: 'SKIES tidak ditemukan' };
    const grab = k => [...m[1].matchAll(new RegExp(k + ':\\s*0x([0-9a-f]{6})', 'g'))].map(x => parseInt(x[1], 16));
    const lum = c => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
    const sky = grab('sky1'), far = grab('far'), near = grab('near');
    if (sky.length !== 6) return { ok: false, extra: 'ramp tidak lengkap' };
    const bad = [];
    for (let i = 0; i < 6; i++) {
      const dFar = Math.abs(lum(far[i]) - lum(sky[i]));
      const dNear = Math.abs(lum(near[i]) - lum(sky[i]));
      if (dFar >= dNear) bad.push(`stage${i}`);
    }
    return { ok: bad.length === 0, extra: bad.length ? 'terbalik di ' + bad.join(',') : 'benar 6/6' };
  })());

check('T26h gunung asimetris (bukan segitiga seragam)',
  /function paintMountain[\s\S]{0,900}?lean/.test(js) &&
  /Math\.pow\(d,\s*0\.72\)/.test(js));

check('T26i ada lapis kabut antar-hutan (menjual kedalaman)',
  /mkLayer\('pwr_haze_[\s\S]{0,600}?BAYER4/.test(js));

check('T26j tanah & prop dibuat per-stage lewat withPal',
  /function withPal\(/.test(js) &&
  /withPal\([\s\S]{0,400}?makeArtTexture\(scene, 't_gr_s'/.test(js) &&
  /scene_texKey\(this, 't_gr_s'/.test(js));

check('T26k warna dasar canvas bukan biru NES lama',
  !/backgroundColor:\s*'#6b9bff'/.test(js));

check('T26l sprite mempelai diredam (tidak ada biru/merah jenuh lama)',
  !/J:\s*0x2f3f92/.test(js) && !/T:\s*0xf02a5e/.test(js));

/* =====================================================================
   27. BIAYA GAMBAR LATAR — regresi "tombol MULAI mati"

   Bug nyata: lapis parallax digambar sepanjang L.len. Level 6400px dengan
   dither 4px = ribuan kolom x belasan baris = ratusan ribu fillRect per stage.
   Tab membeku sebelum sempat merespons klik, sehingga SEMUA tombol di cover
   terlihat "tidak berfungsi" padahal listener-nya terpasang.

   Aturan: lapis parallax WAJIB berupa petak selebar layar yang diulang
   (tileSprite), bukan Graphics sepanjang level.
   ===================================================================== */
const parallaxFn = js.slice(
  js.indexOf('GameScene.prototype.buildParallax'),
  js.indexOf('GameScene.prototype.buildBossArena') > 0
    ? js.indexOf('GameScene.prototype.buildBossArena')
    : js.indexOf('GameScene.prototype.buildParallax') + 6000);

check('T27 lapis parallax memakai tileSprite (petak berulang)',
  /this\.add\.tileSprite\(/.test(js) && /GameScene\.prototype\.mkLayer/.test(js));

check('T27b tidak ada loop gambar sepanjang L.len di parallax',
  (() => {
    /* Cari span/hitungan yang mengalikan L.len lalu dipakai sebagai batas loop
       gambar. Yang boleh menyentuh L.len hanyalah lebar TAMPIL tileSprite
       (di mkLayer) dan penempatan prop foreground (bukan menggambar). */
    const bad = [...parallaxFn.matchAll(/for\s*\([^)]*?;[^;]*?<\s*span\w*/g)].map(m => m[0]);
    return { ok: bad.length === 0, extra: bad.length ? bad.join(' | ') : 'bersih' };
  })());

check('T27c mkLayer meng-cache tekstur per stage',
  /mkLayer\s*=\s*function[\s\S]{0,300}?if\s*\(!this\.textures\.exists\(key\)\)/.test(js));

check('T27d petak parallax berukuran tetap (tidak bergantung L.len)',
  /var TILEW\s*=\s*BW\s*\*\s*2/.test(js));

/* =====================================================================
   28. REVISI 5 — lompat tidak lagi melayang, DAN semua tetap terjangkau

   Keluhan: "lompatnya terlalu tinggi & lama banget jatuhnya kyk melayang".
   Penyebab: revisi 4 menaikkan tinggi lompat dengan mempertahankan RASIO
   gravitasi:jump, sehingga waktu di udara (t = 2v/g) ikut membesar.

   Bahaya perbaikannya: seluruh geometri level ditulis sebagai angka px mati
   yang mengasumsikan lompat 288px. Menurunkan tinggi tanpa menyesuaikan =
   KEPINGAN UNDANGAN TAK TERJANGKAU = undangan tak bisa dibuka sama sekali.
   Tes di bawah memverifikasi keduanya sekaligus.
   ===================================================================== */
const PHYS_ = window.eval('PHYS');
const airT5 = 2 * PHYS_.JUMP_VELOCITY / PHYS_.GRAVITY_Y;

/* Ini tuas yang berbeda dari tinggi: t = 2v/g. Tinggi bisa pas tapi tetap
   terasa melayang kalau gravitasinya lemah — itu persis keluhan revisi 4. */
/* REVISI 6: 0,95 -> 1,15s. Melebarkan lengkungan ke rasio Mario menambah
   waktu di udara sedikit (0,95 -> 1,08s); itu disengaja. Ambangnya TIDAK
   dilepas — 1,40s adalah angka yang dulu dikeluhkan "melayang", jadi
   batas 1,15s tetap menjaga jarak aman dari sana. */
check('T28 waktu di udara <= 1.15s (tidak melayang)',
  airT5 <= 1.15, `t=${airT5.toFixed(2)}s`);

check('T28d ketinggian level diturunkan dari JUMP_H_PX, bukan angka mati',
  /var H_PIECE\s*=\s*Math\.round\(JUMP_H_PX/.test(js) &&
  /var H_COIN\s*=\s*Math\.round\(JUMP_H_PX/.test(js) &&
  /var py = onPath \? GY - H_PIECE_LO : GY - H_PIECE;/.test(js));

/* Yang paling penting: JANGKAUAN NYATA, bukan sekadar konstanta.
   Bangun keenam stage sungguhan lalu periksa tiap kepingan & platform. */
check('T28e semua kepingan undangan terjangkau lompatan',
  (() => {
    const H = window.eval('H_REACH');
    const GYv = window.eval('CONFIG_GROUND_Y()');
    const bad = [];
    for (let i = 0; i < 6; i++) {
      const L = window.eval(`buildLevel(${i}, 'normal', 12345)`);
      (L.pieces || []).forEach(p => {
        const above = GYv - p.y;
        if (above > H) bad.push(`stage${i}:${p.key}@${above.toFixed(0)}px`);
      });
    }
    return { ok: bad.length === 0, extra: bad.length ? bad.join(' ') : `batas ${H.toFixed(0)}px` };
  })());

check('T28f semua platform naik terjangkau lompatan',
  (() => {
    const H = window.eval('H_REACH');
    const GYv = window.eval('CONFIG_GROUND_Y()');
    const bad = [];
    for (let i = 0; i < 6; i++) {
      const L = window.eval(`buildLevel(${i}, 'normal', 999)`);
      (L.solids || []).forEach(s2 => {
        if (s2.kind !== 'plat') return;
        const above = GYv - s2.y;
        if (above > H) bad.push(`stage${i}@${above.toFixed(0)}px`);
      });
    }
    return { ok: bad.length === 0, extra: bad.length ? bad.slice(0, 6).join(' ') : `batas ${H.toFixed(0)}px` };
  })());

check('T28g margin kepingan & musuh terbang di bawah H_REACH',
  (() => {
    const reach = window.eval('H_REACH');
    const piece = window.eval('H_PIECE');
    const fly = window.eval('H_FLY');
    return { ok: piece < reach && fly < reach,
             extra: `piece=${piece} fly=${fly} reach=${reach.toFixed(0)}` };
  })());

/* =====================================================================
   29. INDIKATOR BOSS RENTAN — keluhan "ga ketauan bisa diserang/enggak"

   Bug lama: satu-satunya penanda kondisi rentan adalah setAlpha(1), padahal
   di luar jendela alpha boss JUGA 1 — jadi praktis tidak ada indikator.
   Toast menyuruh "injak saat bersinar" tapi tak ada kode yang membuat
   bersinar. Sekarang wajib berlapis DAN keadaan "belum bisa" juga bertanda.
   ===================================================================== */
check('T29 ada setBossVulnerable terpusat (bukan flag mentah)',
  /GameScene\.prototype\.setBossVulnerable\s*=\s*function/.test(js));

check('T29b kondisi rentan ditandai warna + gerak + teks + arah',
  /setBossVulnerable[\s\S]{0,2600}?setTint\(0xffe27a\)/.test(js) &&
  /setBossVulnerable[\s\S]{0,2600}?scaleX: 1\.12/.test(js) &&
  /setBossVulnerable[\s\S]{0,2600}?'SERANG!'/.test(js) &&
  /bossArrow/.test(js));

check('T29c keadaan TIDAK rentan juga punya penanda sendiri',
  /setBossVulnerable[\s\S]{0,2600}?'TAHAN'/.test(js) &&
  /setBossVulnerable[\s\S]{0,2600}?setTint\(0x8fa8d8\)/.test(js));

check('T29d hitBoss lewat setBossVulnerable (indikator ikut dibersihkan)',
  /hitBoss\s*=\s*function[\s\S]{0,500}?this\.setBossVulnerable\(false\)/.test(js) &&
  !/hitBoss\s*=\s*function[\s\S]{0,400}?this\.bossVulnerable\s*=\s*false;/.test(js));

check('T29e indikator dibuang saat boss kalah',
  /defeatBoss[\s\S]{0,900}?bossLabel\.destroy\(\)/.test(js) &&
  /defeatBoss[\s\S]{0,900}?bossArrow\.destroy\(\)/.test(js) &&
  /defeatBoss[\s\S]{0,900}?clearTint\(\)/.test(js));

/* T29f — dulu memakai jendela 1400 karakter sesudah "updateBoss", jadi
   ia gagal begitu fungsi itu bertambah panjang (bos kini berpatroli)
   walau indikatornya tetap mengikuti. Diperiksa pada BADAN fungsi. */
check('T29f indikator mengikuti posisi boss yang bergoyang',
  (() => {
    const i = js.indexOf('GameScene.prototype.updateBoss');
    if (i < 0) return false;
    const nx = js.indexOf('\nGameScene.prototype.', i + 10);
    const body = js.slice(i, nx < 0 ? js.length : nx);
    return /bossLabel\.setPosition\(b\.x/.test(body);
  })());

check('T29g toast menyebut penanda yang benar-benar terlihat',
  /SERANG!/.test(js) && !/Injak pendulumnya saat bersinar/.test(js));

/* =====================================================================
   30. PEMANDANGAN RIMBUN (revisi 6)
   ===================================================================== */
check('T30 awan cumulus bergumpal (bukan balok datar)',
  /function cloudArt\(variant\)[\s\S]{0,900}?blobs/.test(js) &&
  /inBlob/.test(js));

check('T30b awan punya 3 nilai (sorot/badan/perut) = bervolume',
  (() => {
    const m = /function cloudArt\(variant\)([\s\S]*?)\n}/.exec(js);
    if (!m) return { ok: false, extra: 'cloudArt tidak ditemukan' };
    const hasHi = /return 'W'/.test(m[1]);
    const hasMid = /return 'w'/.test(m[1]);
    const hasLow = /return 'u'/.test(m[1]);
    return { ok: hasHi && hasMid && hasLow, extra: `W=${hasHi} w=${hasMid} u=${hasLow}` };
  })());

check('T30c ada 3 varian awan (langit tidak berulang kaku)',
  /cloudArt\(1\)/.test(js) && /cloudArt\(2\)/.test(js) && /cloudArt\(3\)/.test(js));

check('T30d ada pohon berdaun (bukan hanya siluet pinus)',
  /function leafTreeArt/.test(js) && /t_ltree_s/.test(js));

check('T30e pohon berdaun punya sorot & bayangan',
  (() => {
    const m = /function leafTreeArt\(variant\)([\s\S]*?)\n}/.exec(js);
    if (!m) return { ok: false, extra: 'leafTreeArt tidak ditemukan' };
    return { ok: /return 'a'/.test(m[1]) && /return 'z'/.test(m[1]) && /return 'A'/.test(m[1]),
             extra: 'a/A/z' };
  })());

check('T30f padang rumput berbunga (bukan bidang hijau polos)',
  /function flowerPatchArt/.test(js) && /t_fpatch_s/.test(js));

check('T30g semua art-map baru lebar barisnya konsisten',
  (() => {
    const bad = [];
    const mk = (fn, arg) => { try { return window.eval(`${fn}(${arg})`); } catch (e) { return null; } };
    [['cloudArt', 1], ['cloudArt', 2], ['cloudArt', 3],
     ['leafTreeArt', 1], ['leafTreeArt', 2],
     ['flowerPatchArt', 1], ['flowerPatchArt', 2], ['flowerPatchArt', 3],
     ['fenceArt', '']].forEach(([fn, arg]) => {
      const rows = mk(fn, arg);
      if (!rows) { bad.push(`${fn}(${arg}):error`); return; }
      const w = rows[0].length;
      if (rows.some(r => r.length !== w)) bad.push(`${fn}(${arg})`);
    });
    return { ok: bad.length === 0, extra: bad.length ? bad.join(' ') : 'konsisten' };
  })());

check('T30h scenery baru tetap tanpa primitif mulus',
  (() => {
    const seg = js.slice(js.indexOf('function cloudArt'), js.indexOf('function grassTuftArt'));
    return { ok: !/fillCircle|fillEllipse|arc\(|fillTriangle/.test(seg), extra: 'bersih' };
  })());

/* =====================================================================
   31. TUNER DALAM GAME
   Yang dijaga di sini bukan "slider ada", tapi KONSEKUENSINYA: apa pun
   posisi slider, KEPINGAN UNDANGAN harus tetap terjangkau. Kepingan yang
   tak terjangkau = section undangan tak bisa dibuka = kegagalan paling
   mahal di tema ini.
   ===================================================================== */
(function () {
  check('T31 panel tuner ada di HTML', /id="pwr-tune"/.test(html));
  check('T31b pemicu bintang ada di side badge', /id="pwr-tune-star"/.test(html));
  check('T31c tuner terdaftar di DELEGATED (bukan listener sendiri)',
    /'pwr-tune-star':/.test(js) && /'pwr-tune-apply':/.test(js));
  check('T31d nilai tuner dipersist ke localStorage',
    /TUNE_KEY/.test(js) && /localStorage\.setItem\(TUNE_KEY/.test(js));
  /* T31e — BUG NYATA yang pernah terjadi: "atur ulang game, ga terjadi
     apapun, game malah stuck".
     Sebabnya applyTuner menghapus tekstur SECARA LANGSUNG lalu memanggil
     scene.restart(). restart() di Phaser TERTUNDA satu step, jadi ada frame
     di mana sprite masih hidup sementara teksturnya sudah musnah -> render
     loop melempar -> kanvas beku. Tiga assert di bawah mengunci urutan yang
     benar supaya regresi ini tidak terulang. */
  const at = js.slice(js.indexOf('function applyTuner'),
                      js.indexOf('\n}', js.indexOf('updateTuneReadout();',
                        js.indexOf('function applyTuner'))) + 2);
  check('T31e applyTuner TIDAK menghapus tekstur secara langsung',
    !/textures\.remove/.test(at) && !/getTextureKeys/.test(at));
  check('T31e2 pembuangan tekstur ditunda ke create() berikutnya',
    /_tuneTexDirty\s*=\s*true/.test(at) &&
    /if \(_tuneTexDirty\) \{ purgeArtTextures/.test(js));
  check('T31e3 scene di-resume dulu (scene paused tak memproses restart)',
    /isPaused\(\)\)\s*sc\.scene\.resume\(\)/.test(at));
  /* Jendela diperlebar: blok purge kini juga membuang rangka animasi
     tambahan ("__a"), plus komentar yang menjelaskannya. */
  check('T31e4 purgeArtTextures membuang t_*, pwr_*, dan rangka __a',
    /function purgeArtTextures[\s\S]{0,2000}?indexOf\('t_'\)[\s\S]{0,160}?indexOf\('pwr_'\)[\s\S]{0,160}?indexOf\('__a'\)/.test(js));

  const seg2 = js.slice(js.indexOf('var PHYS = {'), js.indexOf('var DIFF = {'));
  const cgy = js.slice(js.indexOf('function CONFIG_GROUND_Y'),
                       js.indexOf('\n}', js.indexOf('function CONFIG_GROUND_Y')) + 2);
  const sb = {};
  try {
    new Function('exports', 'localStorage', 'BH', 'isTouch',
      seg2 + '\n' + cgy +
      '\nexports.load=loadTune;exports.rec=recomputeDerived;' +
      '\nexports.get=function(){return {J:JUMP_H_PX,D:D_MAX_PX,P:H_PIECE,R:H_REACH,' +
      'F:H_FLY,B:H_BLOCK,G:CONFIG_GROUND_Y(),PX:PX,HPX:HPX,' +
      'PL:H_PLAT,PL2:H_PLAT2};};' +
      '\nexports.set=function(t){TUNE=t;};'
    )(sb, { getItem: () => null, setItem: () => {} }, 960, false);
  } catch (e) { /* dilaporkan di bawah */ }

  if (!sb.rec) {
    check('T31f blok tuner dapat dievaluasi', false, 'gagal parse');
  } else {
    const combos = [
      { jumpVel: 380 }, { jumpVel: 1000 }, { gravity: 700 }, { gravity: 3000 },
      { runSpeed: 100 }, { runSpeed: 400 }, { reach: 50 }, { reach: 95 },
      { groundY: 80 }, { groundY: 420 }, { pixel: 2 }, { pixel: 8 },
      { platH: 30 }, { platH: 100 }, { platH2: 30 }, { platH2: 100 },
      { platH: 100, platH2: 30 },        /* tingkat 2 sengaja dibuat < tingkat 1 */
      { jumpVel: 380, gravity: 3000, reach: 95, groundY: 80, platH: 100, platH2: 100 }
    ];
    let bad = 0, worst = '';
    combos.forEach(function (c) {
      const t = sb.load();
      Object.keys(c).forEach(k => { t[k] = c[k]; });
      sb.set(t); sb.rec();
      const v = sb.get();
      if (!(v.P <= v.R && v.R <= v.J && v.F <= v.R && v.B <= v.R)) {
        bad++; worst = JSON.stringify(c);
      }
      if (!(v.PX >= 1 && v.HPX >= 1)) { bad++; worst = 'PX/HPX<1 @' + JSON.stringify(c); }
      if (!(v.G > 0 && v.G < 960)) { bad++; worst = 'groundY liar @' + JSON.stringify(c); }
      /* PIJAKAN MELAYANG wajib masih bisa dicapai, kalau tidak rute buntu. */
      if (!(v.PL <= v.R && v.PL2 <= v.R)) {
        bad++; worst = 'pijakan > jangkauan @' + JSON.stringify(c);
      }
      /* Tingkat 2 tidak boleh lebih rendah dari tingkat 1 (susunan terbalik). */
      if (!(v.PL2 >= v.PL)) {
        bad++; worst = 'pijakan tingkat2 < tingkat1 @' + JSON.stringify(c);
      }
    });
    check('T31f kepingan & pijakan tetap terjangkau di semua posisi slider', bad === 0,
      bad ? `${bad} kombinasi gagal, mis. ${worst}` : `${combos.length} kombinasi aman`);

    const t1 = sb.load(); t1.jumpVel = 400; sb.set(t1); sb.rec();
    const lo = sb.get().J;
    const t2 = sb.load(); t2.jumpVel = 900; sb.set(t2); sb.rec();
    const hi = sb.get().J;
    check('T31g slider tinggi loncatan benar-benar mengubah tinggi', hi > lo * 2,
      `${Math.round(lo)}px -> ${Math.round(hi)}px`);

    const t3 = sb.load(); t3.groundY = 100; sb.set(t3); sb.rec();
    const g1 = sb.get().G;
    const t4 = sb.load(); t4.groundY = 400; sb.set(t4); sb.rec();
    const g2 = sb.get().G;
    check('T31h slider tinggi tanah benar-benar menggeser permukaan', g1 - g2 === 300,
      `${g1} -> ${g2}`);

    /* T31i — koreksi salah paham istilah: "plafon" yang dimaksud user adalah
       PIJAKAN MELAYANG, bukan permukaan tanah. Slider platH wajib benar-benar
       menggerakkan H_PLAT (dulu H_PLAT hanya turunan tetap dari reach, jadi
       tidak ada kendali langsung sama sekali). */
    const t5 = sb.load(); t5.platH = 30; sb.set(t5); sb.rec();
    const pLo = sb.get().PL;
    const t6 = sb.load(); t6.platH = 100; sb.set(t6); sb.rec();
    const pHi = sb.get().PL;
    check('T31i slider pijakan melayang benar-benar mengubah tinggi platform',
      pHi > pLo * 1.8, `${Math.round(pLo)}px -> ${Math.round(pHi)}px`);

    /* Tinggi tanah TIDAK boleh ikut berubah saat menggeser pijakan. */
    const t7 = sb.load(); t7.platH = 30; sb.set(t7); sb.rec();
    const gA = sb.get().G;
    const t8 = sb.load(); t8.platH = 100; sb.set(t8); sb.rec();
    const gB = sb.get().G;
    check('T31j slider pijakan tidak menggeser tanah (dua hal berbeda)',
      gA === gB, `${gA} vs ${gB}`);
  }
})();

/* 33. BAWAAN TUNER (v4).
   Nilai visual (pixel/groundY/platH/platH2/reach/bgDetail) tetap hasil
   penyetelan user. Tiga nilai FISIKA (jumpVel/gravity/runSpeed) diganti di
   revisi 6 saat lengkungan dikalibrasi ke repo phaser3-mario — rasionya
   dijaga oleh T36b, jadi di sini cukup dikunci angkanya supaya tidak
   berubah diam-diam. */
(function () {
  const d = js.slice(js.indexOf('var TUNE_DEF = {'), js.indexOf('};', js.indexOf('var TUNE_DEF = {')));
  const want = { pixel: 3, platH: 74, platH2: 54, groundY: 90, jumpVel: 540,
                 gravity: 1000, runSpeed: 300, reach: 90, bgDetail: 190 };
  let miss = [];
  Object.keys(want).forEach(k => {
    const m = new RegExp(k + '\\s*:\\s*(\\d+)').exec(d);
    if (!m || parseInt(m[1], 10) !== want[k]) miss.push(k + '=' + (m ? m[1] : '?'));
  });
  check('T33 bawaan tuner sesuai (visual user + fisika revisi 6)', miss.length === 0,
    miss.length ? 'meleset: ' + miss.join(',') : 'semua 9 nilai cocok');
  /* T33b dihapus — versi kunci sekarang dijaga T36 (v4). Menyimpan dua tes
     untuk hal yang sama membuat keduanya harus diedit tiap naik versi. */
})();

/* 34. KERAPATAN LATAR — prop tidak boleh bertindihan pada kerapatan tinggi.
   Bug nyata: pada 190% jarak prop (78/1.9=41px) lebih kecil dari lebar
   propnya sendiri (~40-60px), jadi pohon saling menimpa. Sekarang jarak
   minimum diturunkan dari LEBAR tekstur, bukan angka mati. */
(function () {
  check('T34 jarak prop diturunkan dari lebar tekstur (bukan angka mati)',
    /getSourceImage\(\)[\s\S]{0,200}?maxPropW/.test(js));
  check('T34b ada jarak minimum anti-tindih', /var minGap\s*=\s*Math\.ceil\(maxPropW/.test(js));
  check('T34c penempatan prop diberi jitter (tidak berbaris kaku)',
    /jitter/i.test(js) && /mulberry32\(\(\(STORE/.test(js));
  check('T34d kerapatan juga mengatur lapis parallax, bukan cuma prop depan',
    (js.match(/gap\(\d+,\s*\d+\)/g) || []).length >= 12,
    (js.match(/gap\(\d+,\s*\d+\)/g) || []).length + ' loop');

  /* Simulasikan fungsi gap() pada kerapatan maksimum: setiap floor wajib
     >= lebar elemen yang digambar, kalau tidak pasti bertindihan. */
  const pairs = [...js.matchAll(/gap\((\d+),\s*(\d+)\)/g)].map(m => [+m[1], +m[2]]);
  const bad = pairs.filter(([base, floor]) => floor < 1 || floor > base);
  check('T34e semua floor gap masuk akal (0 < floor <= base)', bad.length === 0,
    bad.length ? JSON.stringify(bad) : pairs.length + ' pasangan');
})();

/* 35. KAMERA — REGRESI YANG PERNAH TERJADI ("makin rusak").
   Saya sempat mempersempit tinggi bounds kamera agar langit hampa
   berkurang: cam.setBounds(0, camTop, L.len, BH - camTop). Itu MERUSAK
   tampilan — viewport tetap 960px, jadi dunia yang lebih pendek dari
   viewport membuat scrollY ter-clamp: tanah terlempar ke atas layar dan
   lapis langit/parallax muncul sebagai pita bertumpuk di bawahnya.
   Aturan yang dikunci: tinggi bounds kamera TIDAK BOLEH < tinggi viewport. */
check('T35 bounds kamera setinggi penuh (tidak dipotong)',
  /cam\.setBounds\(0, 0, L\.len, BH\)/.test(js));
/* Cek KODE saja (komentar penjelas boleh menyebut camTop sebagai catatan
   sejarah bug). Baris kode ditandai dengan adanya 'var ' / pemanggilan. */
check('T35b tidak ada lagi pemotongan bounds via camTop',
  !/var camTop\s*=/.test(js) && !/var camH\s*=/.test(js) &&
  !/setBounds\(0, camTop/.test(js));

/* 32. Latar harus terasa ONE PIECE, bukan gunung generik. */
check('T32 ada laut di cakrawala (dunia bajak laut)', /function paintSea\(/.test(js));
check('T32b ada kapal berbendera Jolly Roger', /function paintJollyShip\(/.test(js));
check('T32c ada pohon palem (pulau tropis East Blue)', /function paintPalm\(/.test(js));
check('T32d Alabasta TIDAK diberi laut (gurun)',
  /biome === 'village' \|\| biome === 'sea' \|\| biome === 'lair'/.test(js));
check('T32e tidak ada painter mati (paintSkullMount dihapus)',
  !/paintSkullMount/.test(js));

/* ============================================================
   T38 — SATU SPRITE SHEET + PETA JSON
   ------------------------------------------------------------
   Mekanisme dikembalikan ke "satu sheet" atas permintaan user, TAPI
   rapi: tiap sprite di dalam kotak berbingkai ungu 1px, berjarak, dan
   bernomor; koordinatnya ada di assets/sprite-map.json yang di-inline
   ke index.js sebagai SHEET_MAP (host cuma menerima 3 string, tema
   tidak bisa fetch berkas pendamping).
   ============================================================ */
(function () {
  const fs2 = require('fs'), path2 = require('path');
  /* `html` di atas sudah melewati template-parser, jadi placeholder
     {{asset_image_N}} kemungkinan sudah tersubstitusi. Baca MENTAH. */
  const raw = fs2.readFileSync(path2.join(DIR, 'index.html'), 'utf8');

  /* Tema ini kini punya DUA slot unggahan:
       1 = sprite-sheet.png (wajib)
       2 = bg-sheet.png     (opsional; kalau kosong, latar digambar
                             prosedural seperti sebelumnya)
     Dulu tes ini menuntut TEPAT SATU slot, jadi ia gagal begitu slot
     latar ditambahkan — padahal itu memang fitur yang disengaja.
     Yang seharusnya dijaga BUKAN jumlahnya, melainkan: tiap slot punya
     nama yang jelas, nomornya urut mulai 1, dan tidak ada nomor ganda. */
  const slots = [...raw.matchAll(/data-asset="(\w+)"\s+src="\{\{asset_image_(\d+)\}\}"/g)];
  const slotNames = slots.map(m => m[1]);
  const nums = slots.map(m => +m[2]);
  check('T38 slot unggahan terdaftar & sheet sprite ada',
    slots.length >= 1 && slotNames.indexOf('sheet') > -1,
    slots.length + ' slot: ' + slotNames.join(','));

  check('T38a sheet sprite memakai {{asset_image_1}}',
    nums[slotNames.indexOf('sheet')] === 1, nums.join(','));

  check('T38a2 nomor slot unik & urut dari 1',
    new Set(nums).size === nums.length &&
    nums.slice().sort((a, b) => a - b).every((n, i) => n === i + 1),
    nums.join(','));

  check('T38b wadah aset tersembunyi (tidak mengganggu tata letak)',
    /id="pwr-assets"[\s\S]{0,200}?(aria-hidden|width:0)/.test(raw));

  check('T38c assetUrl menolak placeholder yang belum terisi',
    /v\.indexOf\('\{\{'\)\s*>\s*-1\)\s*continue/.test(js));

  check('T38d loadAssets punya timeout (tidak menggantung selamanya)',
    /timer = setTimeout\(finish, \d+\)/.test(js));

  check('T38e crossOrigin diset (canvas tidak ter-taint)',
    /crossOrigin = 'anonymous'/.test(js));

  /* ASSETS (index.js) harus cocok persis dengan data-asset di HTML —
     kalau meleset, slot terbaca kosong dan sprite diam-diam prosedural. */
  const ab = js.slice(js.indexOf('var ASSETS = ['), js.indexOf('];', js.indexOf('var ASSETS = [')));
  const names = [...ab.matchAll(/name: '(\w+)'/g)].map(m => m[1]);
  check('T38f ASSETS cocok dengan data-asset di html',
    JSON.stringify(names) === JSON.stringify(slots.map(m => m[1])),
    names.join(',') + ' vs ' + slots.map(m => m[1]).join(','));

  /* Berkas sheet + peta harus benar-benar ada. */
  const sheetPath = path2.join(DIR, 'assets', 'sprite-sheet.png');
  const mapPath = path2.join(DIR, 'assets', 'sprite-map.json');
  check('T38g sprite-sheet.png & sprite-map.json ada',
    fs2.existsSync(sheetPath) && fs2.existsSync(mapPath));

  /* SHEET_MAP inline WAJIB sinkron dengan sprite-map.json. Kalau sheet
     dibangun ulang tanpa menjalankan inline-map.cjs, koordinat inline
     menjadi basi dan sprite terpotong di tempat yang salah. */
  const smap = JSON.parse(fs2.readFileSync(mapPath, 'utf8'));
  /* Blok inline diuraikan sebagai JSON, BUKAN dicocokkan dengan regex.
     Percobaan pertama memakai /\[(.*?)\]/ dan gagal palsu di 73 kelompok:
     pola malas berhenti di ']' pertama, sehingga kelompok yang punya
     lebih dari satu frame selalu terlihat terpotong padahal datanya benar. */
  const inlStart = js.indexOf('var SHEET_MAP = {');
  const inlBlock = js.slice(inlStart + 'var SHEET_MAP = '.length,
                            js.indexOf('\n};', inlStart) + 2);
  let beda = 0, nGrp = 0, inl = null;
  try { inl = JSON.parse(inlBlock); } catch (e) { inl = null; }
  if (inl) {
    for (const [g, gr] of Object.entries(smap.groups)) {
      nGrp++;
      const a = inl[g];
      if (!a || a.length !== gr.frames.length) { beda++; continue; }
      if (!gr.frames.every((f, i) =>
            a[i][0] === f.i && a[i][1] === f.x && a[i][2] === f.y &&
            a[i][3] === f.w && a[i][4] === f.h)) beda++;
    }
  }
  check('T38h SHEET_MAP inline sinkron dgn sprite-map.json',
    !!inl && beda === 0 && nGrp > 0,
    !inl ? 'blok inline tidak bisa diurai' :
      (beda ? beda + ' kelompok beda' : nGrp + ' kelompok'));

  check('T38i mekanisme per-berkas lama sudah dibuang',
    !/assetDef\s*\(/.test(js) && !/hasFrameMarker\s*\(/.test(js) &&
    !/\bm\.grid\b/.test(js) && !/\bm\.strip\b/.test(js));

  /* Ukuran sheet yang dicatat harus sama dengan PNG-nya — kalau tidak,
     potongan bisa jatuh di luar batas gambar. */
  const ss = /var SHEET_SIZE = \{ w: (\d+), h: (\d+) \}/.exec(js);
  check('T38k SHEET_SIZE cocok dgn sprite-map.json',
    !!ss && +ss[1] === smap._sheet.w && +ss[2] === smap._sheet.h,
    ss ? ss[1] + 'x' + ss[2] : 'tidak ada');

  check('T38j ASSET.md mencantumkan lisensi CC0 + sumber',
    (() => {
      const p = path2.join(DIR, 'assets', 'ASSET.md');
      if (!fs2.existsSync(p)) return false;
      const t = fs2.readFileSync(p, 'utf8');
      return /Creative Commons Zero|CC0/.test(t) && /Pixel Frog/.test(t);
    })());

  /* ============================================================
     T39 — PENSKALAAN & HITBOX
     ------------------------------------------------------------
     BUG NYATA (dilaporkan user dgn screenshot): sprite 32x32 dipasang
     pada body 30x54 offset(9,14) yang dibuat untuk art prosedural
     48x68. Phaser menempelkan kaki BODY ke tanah, dan karena body
     berakhir 36px di bawah dasar sprite, gambar menggantung di udara.
     ============================================================ */
  check('T39 skala SERAGAM (Math.min), bukan regang per-sumbu',
    /var k = Math\.min\(w \/ sw, h \/ sh\)/.test(js));
  check('T39b ditempel rata BAWAH (kaki menapak), bukan rata atas',
    /cx\.drawImage\(img, sx, sy, sw, sh, Math\.round\(\(w - dw\) \/ 2\), h - dh, dw, dh\)/.test(js));

  const mb = js.slice(js.indexOf('var ASSET_MAP = ['), js.indexOf('\n];', js.indexOf('var ASSET_MAP = [')));
  /* Entri sekarang: { key, grp, f, [stack], [fill], w, h, label, pick } */
  const maps = [...mb.matchAll(/key: '(\w+)',\s*grp: '([^']+)',[^}]*?w:\s*(\d+), h:\s*(\d+)/g)]
    .map(m => ({ key: m[1], grp: m[2], w: +m[3], h: +m[4] }));

  const players = maps.filter(m => /^t_groom_/.test(m.key));
  check('T39c ukuran pemain = art prosedural 48x68',
    players.length === 9 && players.every(p => p.w === 48 && p.h === 68),
    players.length + ' frame');

  /* Ukuran musuh WAJIB sama dengan sprite prosedural yang digantikan,
     kalau tidak ENEMY_BODY tidak pas dan musuh ikut melayang. */
  const eb = js.slice(js.indexOf('var ENEMY_BODY = {'), js.indexOf('};', js.indexOf('var ENEMY_BODY = {')));
  const bad = [];
  maps.filter(m => /^t_e\d_/.test(m.key)).forEach(m => {
    const c = new RegExp(m.key.slice(2, 4).toUpperCase() + ':\\s*\\[\\d+, \\d+\\][^\\n]*sprite (\\d+)x(\\d+)').exec(eb);
    if (c && (m.w !== +c[1] || m.h !== +c[2])) bad.push(`${m.key}: ${m.w}x${m.h} != ${c[1]}x${c[2]}`);
  });
  check('T39d ukuran musuh = ukuran sprite prosedural', bad.length === 0,
    bad.join(' | ') || 'cocok');

  /* E2 (bercangkang) & E5 (2 tahap) SEKARANG memakai sprite. Yang tetap
     wajib dijaga bukan lagi "harus prosedural", melainkan: KEDUA wujudnya
     dipetakan dan SEUKURAN. Kalau cuma satu wujud yang diganti, atau
     ukurannya beda, musuh berubah rupa/melompat saat diinjak. */
  const e2 = maps.filter(m => /^t_e2_/.test(m.key));
  check('T39e musuh bercangkang (E2) dipetakan LENGKAP (jalan + cangkang)',
    e2.length === 2, e2.map(m => m.key).join(' ') || 'tidak dipasang');
  check('T39e1b kedua wujud E2 berukuran sama',
    e2.length === 2 && e2[0].w === e2[1].w && e2[0].h === e2[1].h,
    e2.map(m => m.w + 'x' + m.h).join(' vs '));
  const e5 = maps.filter(m => /^t_e5_/.test(m.key));
  check('T39e2 musuh bertahap (E5) dipetakan LENGKAP (2 tahap)',
    e5.length === 2, e5.map(m => m.key).join(' ') || 'tidak dipasang');
  check('T39e3 kedua tahap E5 berukuran sama (tidak melompat saat rusak)',
    e5.length === 2 && e5[0].w === e5[1].w && e5[0].h === e5[1].h,
    e5.map(m => m.w + 'x' + m.h).join(' vs '));

  /* Tinggi tiang WAJIB 64/96/128: refreshBody() mengambil hitbox dari
     UKURAN TEKSTUR, sedangkan level menaruh pipa di y = GY - ph. */
  const pipes = maps.filter(m => /^t_pipe/.test(m.key));
  check('T39f tiang batu terpasang untuk 3 tinggi pipa',
    pipes.length === 3, pipes.map(p => p.key).join(' '));
  check('T39g tinggi tiang = ph 64/96/128 (hitbox refreshBody)',
    pipes.length === 3 && pipes.every(p => [64, 96, 128].includes(p.h)),
    pipes.map(p => p.key + '=' + p.h).join(' '));

  const grounds = maps.filter(m => /^t_gr_s\d$/.test(m.key));
  check('T39h tanah memakai sprite untuk 6 stage',
    grounds.length === 6, grounds.map(g => g.key).join(' '));
  check('T39i tanah berukuran TILE 32x32', grounds.every(g => g.w === 32 && g.h === 32));

  /* Bata harus dari Terrain (tile padat), BUKAN 'Items/Boxes' (peti kayu).
     Peti pernah dipakai dan hasilnya layar penuh kotak coklat. */
  const brickEntry = maps.find(m => m.key === 't_brick');
  check('T39j bata dari Terrain, BUKAN peti kayu',
    !!brickEntry && /^Terrain\//.test(brickEntry.grp),
    brickEntry ? brickEntry.grp : 'tidak dipasang');

  /* Koin & blok "?" SEKARANG memakai sprite (keputusan user: "pakai
     sprite juga"). Yang dijaga sekarang bukan lagi "harus prosedural",
     melainkan bahwa ukurannya tidak merusak grid:
       blok "?" WAJIB 32x32 — ditaruh di s.x+16 (tengah petak 32);
       animasi kedip butuh 4 rangka + 1 rangka mati. */
  const qs = maps.filter(m => /^t_q\d$/.test(m.key));
  check('T39k blok "?" punya 4 rangka kedip',
    qs.length === 4, qs.map(m => m.key).join(' '));
  check('T39k2 blok "?" berukuran 32x32 (sejajar grid & bata)',
    qs.length === 4 && qs.every(m => m.w === 32 && m.h === 32) &&
    !!maps.find(m => m.key === 't_q_dead' && m.w === 32 && m.h === 32),
    qs.map(m => m.w + 'x' + m.h).join(' '));
  const coins = maps.filter(m => /^t_coin\d$/.test(m.key));
  check('T39k3 koin punya 4 rangka putar',
    coins.length === 4, coins.map(m => m.key).join(' '));

  /* Objek yang posisinya terikat GRID 32px tidak boleh ikut slider
     ukuran — kalau ikut, gambar tidak lagi sejajar petak. */
  /* Diuji lewat PERILAKU scalable(), bukan mencocokkan teks regex-nya:
     versi lama mencocokkan potongan sumber "t_(brick|plat|pipe", jadi
     begitu daftar kuncinya bertambah (t_plat_l/t_plat_r/t_gr_top_s*)
     ujinya gagal walau perilakunya justru makin benar. */
  check('T39o objek grid dikunci dari slider ukuran', (() => {
    /* Ambil regex ASLI dari sumber lalu jalankan — bukan mencocokkan
       teksnya. Ini menguji perilaku tanpa perlu memuat seluruh tema. */
    const m = js.match(/function scalable\(key\) \{[\s\S]*?return !(\/.*?\/)\.test\(key\);/);
    if (!m) return false;
    let re;
    try { re = eval(m[1]); } catch (e) { return false; }
    const scalable = k => !re.test(k);
    const locked = ['t_brick', 't_plat', 't_plat_l', 't_plat_r', 't_pipe64',
                    't_gr_s0', 't_gr_top_s0', 't_q0', 't_q_dead'];
    const free = ['t_coin0', 't_e1_0', 't_groom_idle0', 't_goal'];
    return locked.every(k => scalable(k) === false) &&
           free.every(k => scalable(k) === true);
  })());

  /* Tanah WAJIB terisi sampai dasar layar.
     BUG NYATA (screenshot user): lapisan bawah tanah dipatok 2 baris,
     jadi tanah berhenti di GY+96 sementara dasar layar ada di
     GY + TUNE.groundY (+50 di layar sentuh) = GY+200 -> tersisa ~104px
     kosong. Jumlah baris sekarang dihitung dari BH. */
  check('T39p kedalaman isian tanah dihitung dari BH, bukan angka mati',
    /var fillH = Math\.max\(TILE, Math\.ceil\(\(BH - GY\) \/ TILE\) \* TILE\)/.test(js));
  check('T39q tanah menutup sampai dasar layar di semua ukuran', (() => {
    const TILE = 32;
    for (const bh of [480, 720, 860, 944, 960, 1200]) {
      for (const touch of [true, false]) {
        const GY = bh - (touch ? 200 : 150);
        const fillH = Math.max(TILE, Math.ceil((bh - GY) / TILE) * TILE);
        if (GY + TILE + fillH < bh) return false;
      }
    }
    return true;
  })());
  /* Isian pakai tileSprite (1 objek/segmen), bukan ratusan add.image:
     mengisi 200px x panjang level dengan petak 32px = ~1300 objek. */
  check('T39r isian tanah memakai tileSprite (bukan ratusan add.image)',
    /this\.add\.tileSprite\(seg\.x, GY \+ TILE, segW2, fillH, gTex\)/.test(js));

  check('T39l pemain gagal -> sprite dibuang semua (gaya tak campur)',
    /if \(okPlayer > 0 && okPlayer < playerTotal\)/.test(js));

  /* Urutan di create() menentukan: purge membuang semua key 't_*',
     termasuk hasil potongan berkas. Kalau purge jalan SESUDAH sprite
     didaftarkan, pemain diam-diam balik ke prosedural tiap kali tombol
     "Terapkan & ulang stage" ditekan. */
  const c = js.indexOf('GameScene.prototype.create = function');
  const segc = js.slice(c, c + 1400);
  const p = segc.indexOf('purgeArtTextures');
  const a2 = segc.indexOf('applySheetTextures');
  const b2 = segc.indexOf('buildTextures(this)');
  check('T39m urutan create(): purge -> sprite -> buildTextures',
    p > -1 && a2 > p && b2 > a2, `purge@${p} sprite@${a2} build@${b2}`);
  const bt = js.indexOf('function buildTextures');
  check('T39n purge TIDAK di dalam buildTextures (akan hapus sprite)',
    !/_tuneTexDirty\)\s*\{\s*purgeArtTextures/.test(js.slice(bt, bt + 700)));
})();

report();

function report() {
  const pass = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok);
  console.log('\n=============================================');
  console.log('  HARNESS PIXEL WEDDING RUN');
  console.log('=============================================');
  results.forEach(r => {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.extra ? '   [' + r.extra + ']' : ''}`);
  });
  console.log('---------------------------------------------');
  console.log(`  ${pass}/${results.length} lulus`);
  if (fail.length) {
    console.log('\n  GAGAL:');
    fail.forEach(r => console.log(`   - ${r.name}  ${r.extra}`));
    process.exitCode = 1;
  }
  console.log('');
}
