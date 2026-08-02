/* =====================================================================
   PIXEL WEDDING RUN — index.js
   Tema undangan pernikahan berbasis game platformer 16-bit (Phaser 3.80.1)
   Bible: PIXEL_WEDDING_RUN_BIBLE.md

   LAPISAN (walau monolitik):
     [0] CLEANUP HOOK      window.__pwrCleanup  (WAJIB paling atas)
     [1] CONST & CONFIG    PHYS, DENSITY, PALETTE, STAGES
     [2] STORAGE           STORE (localStorage), seed, unlocked, diff
     [3] BINDING READER    val(), scanSections()
     [4] HOST WIRING       delegated listener, musik mirror, de-ID clone
     [5] UI / OVERLAY      cover, stage-select, piece-modal, reveal, toast
     [6] PHASER BOOT       ensurePhaser, bootGame, showError
     [7] TEXTURES          drawGroom/drawEnemy... + makeTexture
     [8] SCENES            BootScene, GameScene
     [9] GAMEPLAY          Player, Enemy, Boss, generator, validator
     [10] INIT             startWhenReady, auto-resume

   ATURAN HOST YANG TIDAK BOLEH DILANGGAR (diverifikasi dari ThemeWrapper.tsx):
     - Script ini di-RE-EXECUTE saat [jsBase, isOpened] berubah -> WAJIB cleanup
       hook + listener terdelegasi di document (BUKAN MutationObserver).
     - JANGAN reset window.__pwrStarted di cleanup (intro akan terulang).
     - JANGAN memutar backsound tenant (milik host).
     - JANGAN pasang listener klik sendiri di #btn-submit-* (dobel submit).
     - De-ID #inv-source saat clone hidup (duplicate id -> form terkirim kosong).
   ===================================================================== */

/* =====================================================================
   [0] CLEANUP HOOK — HARUS PALING ATAS
   ===================================================================== */
if (typeof window.__pwrCleanup === 'function') {
  try { window.__pwrCleanup(); } catch (e) {}
}
var cleanupFns = [];
function onCleanup(fn) { cleanupFns.push(fn); }
window.__pwrCleanup = function () {
  cleanupFns.forEach(function (f) { try { f(); } catch (e) {} });
  cleanupFns = [];
  window.__pwrCleanup = null;
};
/* CATATAN: window.__pwrStarted SENGAJA tidak di-reset di sini.
   isOpened flip -> script re-exec; kalau flag ikut hilang, pemain ditarik
   balik ke PRESS START dan progres run hilang. */


/* =====================================================================
   [1] CONST & CONFIG
   ===================================================================== */
var VERSION = '1.0.0';
var STORE_KEY = 'pwr_progress_v1';

/* Fisika DIAMBIL dari repo phaser3-mario — jangan diubah, ini yang bikin
   feel-nya benar. Sumber: src/index.js + src/object/Player.js */
/* ⚠️ PENYESUAIAN SKALA (penting — jangan dikembalikan ke angka repo mentah).
   Repo aslinya bermain di viewport 700x224 px. Di sana jump 210 / gravity 300
   menghasilkan lompatan 73px = SEPERTIGA tinggi layar → terasa tinggi & lega.
   Frame kita POTRET 540x960, jadi 73px hanya ~7,6% layar → terasa seperti
   tersandung, dan platform terasa tak terjangkau.

   Rasio yang dipertahankan adalah PROPORSI TERHADAP LAYAR, bukan angka absolut:
   224px * 0.33 = 73px   →   960px * 0.30 = ~288px
   Dengan gravity 900 & jump 720:  h = 720^2/(2*900) = 288px = 9 tile
   D_max = 200 * (2*720/900) = 320px = 10 tile
   Ini membuat lompatan terasa sama leganya seperti di game aslinya. */
var PHYS = {
  /* REVISI 5 — "lompat terlalu tinggi & melayang".
     Kesalahan revisi sebelumnya: saya menaikkan tinggi lompat dengan
     mempertahankan RASIO gravitasi:jump dari repo. Rasio itu menjaga bentuk
     lengkungan, tapi waktu di udara ikut membesar (t = 2v/g). Hasilnya 288px
     dengan 1,60 detik melayang — dua kali lipat Mario asli (~0,70s).

     Tinggi dan lama melayang adalah DUA tuas terpisah:
       tinggi  h = v^2 / (2g)      <- turunkan v
       melayang t = 2v / g         <- naikkan g
     Menaikkan g memperpendek keduanya; menurunkan v hanya memperpendek tinggi.
     Jadi g dinaikkan tajam (900->1700) dan v sedikit turun (720->680). */
  /* REVISI 6 — "bentuk lengkungan", dikalibrasi ulang ke repo phaser3-mario.
     Revisi 5 memperbaiki TINGGI dan LAMA MELAYANG, tapi melewatkan tuas
     ketiga yang justru paling menentukan rasa platformer: RASIO h/D
     (tinggi lompat : jarak mendatar sekali lompat).

       Mario asli (g300 v210 s150, tile 16): h=2,3 tile  D=6,6 tile  h/D=0,35
       Revisi 5    (g1700 v810 s200, tile 32): h=6,0 tile D=6,0 tile  h/D=1,01

     h/D 1,01 berarti lompatan setinggi jaraknya — KOTAK, terasa seperti
     pogo, bukan platformer. Efek sampingnya nyata di tata letak: generator
     harus merenggangkan objek sejauh D (6 tile) SEKALIGUS menumpuknya
     setinggi 6 tile, dan itulah sumber "banyak ruang kosong antar object".

     Menaikkan RUN_SPEED (200->300) adalah tuas yang melebarkan lengkungan
     TANPA menambah tinggi maupun lama melayang — D = s * t.
     Mario murni (g600 v420) memberi h/D 0,35 tepat, tapi melayang 1,40s
     yaitu keluhan "melayang" yang sudah diperbaiki di revisi 5. Jadi
     diambil kompromi: bentuk jelas Mario, melayang tetap di bawah 1,1s. */
  GRAVITY_Y:     1000,    /* h=4,6 tile  D=10,1 tile  t=1,08s  h/D=0,45 */
  RUN_SPEED:      300,    /* tuas pelebar lengkungan — JANGAN turunkan sendirian */
  JUMP_VELOCITY:  540,
  COYOTE_MS:       85,
  JUMP_BUFFER_MS:  85,
  INVULN_MS:     1000,
  KNOCKBACK_X:    180,
  KNOCKBACK_Y:   -380
};

var TILE = 32;

/* Turunan jump-arc. Angka di bawah adalah BAWAAN v4 (g1000 v540 s300);
   keduanya dihitung ulang tiap slider tuner digeser, jadi jangan pernah
   menyalin hasilnya jadi angka mati di tempat lain.
     tinggi = 540^2/(2*1000)      = 146px = 4,6 tile
     D_max  = 300 * (2*540/1000)  = 324px = 10,1 tile
   -> pijakan naik dibatasi H_REACH; gap dibatasi 92% D_max (fixPlayability
      menyisipkan platform kalau terlampaui). */
var JUMP_H_PX = (PHYS.JUMP_VELOCITY * PHYS.JUMP_VELOCITY) / (2 * PHYS.GRAVITY_Y);
var D_MAX_PX  = PHYS.RUN_SPEED * (2 * PHYS.JUMP_VELOCITY / PHYS.GRAVITY_Y);

/* ---- KETINGGIAN TURUNAN (jangan hardcode angka px lagi) ----------------
   Pelajaran revisi 5: seluruh geometri level ditulis sebagai angka mati
   (GY-150, GY-210, ...) yang diam-diam mengasumsikan lompat 288px. Begitu
   tinggi lompat diubah, koin/blok/KEPINGAN UNDANGAN jadi tak terjangkau —
   dan kepingan yang tak terjangkau berarti undangan tak bisa dibuka sama
   sekali. Sekarang semuanya diturunkan dari JUMP_H_PX supaya ikut otomatis.

   Batas aman 0.85 x JUMP_H: pemain jarang menekan lompat pada frame optimal,
   dan hitbox kaki butuh ruang untuk mendarat di atas platform. */
var H_REACH  = JUMP_H_PX * 0.85;              /* setinggi apa masih terjangkau */
var H_COIN   = Math.round(JUMP_H_PX * 0.60);  /* koin di lengkungan lompat     */
var H_BLOCK  = Math.round(JUMP_H_PX * 0.72);  /* blok ? / bata: pukul dari bawah */
var H_PLAT   = Math.round(JUMP_H_PX * 0.66);  /* platform pijakan naik         */
var H_PLAT2  = Math.round(JUMP_H_PX * 0.80);  /* platform tingkat kedua        */
var COIN_OVER_PLAT = 40;                      /* jarak koin di atas pijakan    */
/* Jarak koin di BAWAH baris bata melayang. Harus > radius ambil (22px)
   supaya koin tidak menempel/tenggelam di bata di atasnya. */
var COIN_UNDER_ROW = 30;
/* H_FLY & H_PIECE sengaja di BAWAH H_REACH (0.85), bukan sekadar mendekatinya.
   Kepingan yang meleset sedikit saja = section undangan tak bisa dibuka —
   kegagalan paling mahal di tema ini, jadi marginnya dilebihkan. */
var H_FLY    = Math.round(JUMP_H_PX * 0.78);  /* musuh terbang: harus bisa diinjak */
var H_PIECE  = Math.round(JUMP_H_PX * 0.74);  /* kepingan off-path             */
var H_PIECE_LO = 64;                          /* kepingan on-path (setinggi dada) */

/* =====================================================================
   [1b] TUNER — nilai yang bisa diatur LANGSUNG DI DALAM GAME
   ---------------------------------------------------------------------
   Semua angka di sini menimpa konstanta di atas, lalu recomputeDerived()
   MENGHITUNG ULANG seluruh ketinggian turunan. Itu penting: kalau tinggi
   lompat diubah tanpa menghitung ulang H_PIECE dkk, kepingan undangan bisa
   jadi TIDAK TERJANGKAU -> undangan tak bisa dibuka sama sekali.
   ===================================================================== */
/* v2: 'ceiling' DIGANTI NAMA jadi 'groundY' (arti lamanya memang tinggi
   TANAH), dan ditambah 'platH' yang mengatur tinggi PIJAKAN MELAYANG —
   inilah yang dimaksud user dengan "plafon". Kunci penyimpanan dinaikkan
   ke v2 supaya nilai lama tidak salah-tafsir. */
/* v3: nilai hasil penyetelan user di panel ATUR GAME sudah DI-BAKE jadi
   bawaan. Kunci dinaikkan ke v3 supaya nilai tersimpan lama (v2) tidak
   menimpa bawaan baru ini di browser yang pernah membukanya. */
/* v4: fisika dikalibrasi ulang ke rasio lengkungan repo phaser3-mario
   (lihat REVISI 6 di blok PHYS). Kunci WAJIB naik ke v4 — kalau tidak,
   browser yang pernah membuka tema ini masih menyimpan v3 (jumpVel 810 /
   gravity 1700 / runSpeed 200) di localStorage dan nilai lama itu akan
   MENIMPA bawaan baru lewat loadTune(), sehingga perubahan tak terasa. */
var TUNE_KEY = 'pwr_tune_v4';
var TUNE_DEF = {
  pixel:      3,    /* PX — besar piksel sprite/tile (2..8)            */
  groundY:   90,    /* jarak TANAH dari dasar layar                    */
  /* platH/platH2 dinaikkan (74->92, 54->86) dari hasil penyetelan di
     panel ATUR GAME. Keduanya tetap DI-CLAMP <= H_REACH oleh
     recomputeDerived(), jadi pijakan tidak akan pernah melewati
     jangkauan lompat walau angkanya mendekati 100. */
  platH:     92,    /* % jangkauan -> tinggi PIJAKAN MELAYANG          */
  platH2:    86,    /* % jangkauan -> pijakan tingkat KEDUA            */
  jumpVel:  540,    /* kecepatan lompat -> tinggi                      */
  gravity: 1000,    /* gravitasi -> lama melayang                      */
  runSpeed: 300,    /* kecepatan lari -> jarak lompat mendatar         */
  reach:     90,    /* % JUMP_H yang dianggap masih terjangkau         */
  bgDetail: 190     /* % kerapatan prop latar                          */
};
var TUNE = null;

function loadTune() {
  var t = {}, k;
  for (k in TUNE_DEF) if (Object.prototype.hasOwnProperty.call(TUNE_DEF, k)) t[k] = TUNE_DEF[k];
  try {
    var raw = localStorage.getItem(TUNE_KEY);
    if (raw) {
      var s = JSON.parse(raw);
      for (k in TUNE_DEF) if (typeof s[k] === 'number' && isFinite(s[k])) t[k] = s[k];
    }
  } catch (e) {}
  return t;
}
function saveTune() {
  try { localStorage.setItem(TUNE_KEY, JSON.stringify(TUNE)); } catch (e) {}
}

/* Terapkan TUNE -> PHYS/PX, lalu turunkan ulang SEMUA ketinggian.
   Dipanggil saat boot dan tiap kali slider digeser. */
function recomputeDerived() {
  if (!TUNE) TUNE = loadTune();
  PHYS.JUMP_VELOCITY = TUNE.jumpVel;
  PHYS.GRAVITY_Y     = TUNE.gravity;
  PHYS.RUN_SPEED     = TUNE.runSpeed;
  PX  = TUNE.pixel;
  HPX = Math.max(1, Math.round(TUNE.pixel / 2));
  TPX = TUNE.pixel;

  JUMP_H_PX = (PHYS.JUMP_VELOCITY * PHYS.JUMP_VELOCITY) / (2 * PHYS.GRAVITY_Y);
  D_MAX_PX  = PHYS.RUN_SPEED * (2 * PHYS.JUMP_VELOCITY / PHYS.GRAVITY_Y);

  var r = Math.max(0.40, Math.min(0.95, TUNE.reach / 100));
  H_REACH  = JUMP_H_PX * r;
  H_COIN   = Math.round(JUMP_H_PX * (r * 0.71));
  H_BLOCK  = Math.round(JUMP_H_PX * (r * 0.85));
  H_FLY    = Math.round(JUMP_H_PX * (r * 0.92));
  H_PIECE  = Math.round(JUMP_H_PX * (r * 0.87));

  /* PIJAKAN MELAYANG — diatur sendiri lewat slider (bukan angka mati).
     Di-CLAMP <= H_REACH: pijakan yang lebih tinggi dari jangkauan lompat
     akan membuat rute mustahil dilewati, dan pada beberapa pola pijakan
     itulah satu-satunya jalan menuju kepingan undangan. */
  var p1 = Math.max(0.30, Math.min(1.00, TUNE.platH  / 100));
  var p2 = Math.max(0.30, Math.min(1.00, TUNE.platH2 / 100));
  if (p2 < p1) p2 = p1;                    /* tingkat 2 tak boleh di bawah tingkat 1 */
  /* Math.floor (BUKAN round): pembulatan ke atas bisa melampaui H_REACH
     sebesar 1px dan itu sudah cukup membuat pijakan tak terjangkau. */
  H_PLAT   = Math.min(Math.floor(H_REACH), Math.floor(JUMP_H_PX * r * p1));
  H_PLAT2  = Math.min(Math.floor(H_REACH), Math.floor(JUMP_H_PX * r * p2));
  /* Jarak koin di ATAS papan pijakan. Harus lebih besar dari radius ambil
     koin (22px) supaya koin tidak tampak tenggelam di dalam papan, tapi
     tetap di bawah jangkauan lompat dari papan itu. */
  COIN_OVER_PLAT = Math.max(30, Math.min(Math.floor(H_REACH * 0.45), 56));
}

var DIFF = {
  easy:   { minEnemies: 1, enemyMul: 0.80, invuln: 1400, gapMul: 0.85, coyote: 120, pieceOnPath: 1.00 },
  normal: { minEnemies: 2, enemyMul: 1.00, invuln: 1000, gapMul: 1.00, coyote:  85, pieceOnPath: 0.60 },
  hard:   { minEnemies: 3, enemyMul: 1.25, invuln:  700, gapMul: 1.10, coyote:  60, pieceOnPath: 0.50 }
};

/* ============================================================
   PALET SINEMATIK PER-STAGE  (revisi 4 — "retro pixel art cantik")

   Kunci keindahan referensi BUKAN sprite-nya, tapi LATAR-nya:
     1. Atmospheric perspective — makin jauh makin PUCAT & rendah kontras,
        bukan makin gelap. Lapis jauh hampir menyatu dengan langit.
     2. Dithering (checkerboard) sebagai gradasi, bukan gradient halus.
     3. Palet SEMPIT & harmonis (analog), bukan warna primer NES.

   Tiap stage punya ramp 5-langkah: sky2(atas) -> sky1 -> far -> mid -> near.
   Nilai far/mid/near sengaja BERDEKATAN dengan langit di ujung jauh, lalu
   melebar kontrasnya ke arah kamera. Itu yang bikin "berkabut" & sinematik. */
/* PALET PER-PULAU (riset One Piece — tiap pulau punya dasar budaya nyata
   yang berbeda, itu kunci supaya 6 stage TIDAK terlihat mirip):
     0 Foosha    — desa tepi laut East Blue, pagi biru cerah, kincir angin
     1 Baratie   — restoran terapung di laut, biru laut + kuning-merah kapal
     2 Little Garden — hutan purba, hijau lembap + kabut + gunung berapi
     3 Alabasta  — gurun (dasar: Mesir), pasir emas + langit panas
     4 Skypiea   — pulau langit (dasar: Mesoamerika), putih-toska di atas awan
     5 Arlong Park — sarang bos, malam gelap + air laut, satu-satunya malam */
var SKIES = [
  /* 0 FOOSHA — pagi East Blue: biru bersih, rumput hangat */
  { sky2:0x6fb4e8, sky1:0x9fd4f2, far:0x8fb6cc, farHi:0xe6ecd8, mid:0x5f8f78, midHi:0x7fae90,
    near:0x2d4a3e, nearHi:0x3d6152, gTop:0x8fc46a, gMid:0x5c9a63, gBot:0x3f7a5a, sun:0xfff2cc },
  /* 1 BARATIE — laut lepas: biru lebih pekat, buih pucat di cakrawala */
  { sky2:0x4fa2d8, sky1:0x86c8e8, far:0x6f9fc0, farHi:0xdfe8e4, mid:0x3f7590, midHi:0x5c94a8,
    near:0x1e3a4e, nearHi:0x2d5266, gTop:0x4a90b8, gMid:0x36708f, gBot:0x27526c, sun:0xfff0d0 },
  /* 2 LITTLE GARDEN — hutan purba: hijau lembap, kabut tebal, semburat vulkanik */
  { sky2:0xbcd0b4, sky1:0xd2e2cc, far:0x9db49a, farHi:0xe0d8ba, mid:0x5f8258, midHi:0x7b9a68,
    near:0x223a28, nearHi:0x32502f, gTop:0x7cb058, gMid:0x4f8347, gBot:0x35633c, sun:0xecdcb4 },
  /* 3 ALABASTA — gurun tengah hari: langit panas, pasir emas */
  { sky2:0x59b6e0, sky1:0x9ad6ea, far:0xd8b48c, farHi:0xffeccc, mid:0xc79a5e, midHi:0xe0bc84,
    near:0x8a6034, nearHi:0xa87c46, gTop:0xe8c47c, gMid:0xc79a5e, gBot:0x9a7040, sun:0xfff4d8 },
  /* 4 SKYPIEA — pulau langit: serba pucat & lembut, di ATAS awan */
  { sky2:0x7fd8e8, sky1:0xb4ecf2, far:0xd8ecec, farHi:0xffffff, mid:0x9fd8cc, midHi:0xc4ece0,
    near:0x5f9f9c, nearHi:0x7cbcb4, gTop:0xdff4ec, gMid:0xb0dcd4, gBot:0x86bcb6, sun:0xffffff },
  /* 5 ARLONG PARK — malam laut: indigo gelap, pantulan air, bulan dingin */
  { sky2:0x121a3a, sky1:0x24325e, far:0x2a3a62, farHi:0x8898c4, mid:0x1c2a48, midHi:0x33456e,
    near:0x0e1428, nearHi:0x1c2740, gTop:0x35507c, gMid:0x243c5e, gBot:0x182a44, sun:0xdfe8ff }
];

var PAL = {
  skyTop:'#6b9bff', skyBot:'#a8c8ff',
  grass:0x5ec44a, grassHi:0x8ee878, grassSh:0x3a8c2e,
  dirt:0xc8763c,  dirtHi:0xe0985c,  dirtSh:0x8f5228,
  brick:0xc05a2c, brickHi:0xe08050, brickSh:0x8a3c18,
  qblock:0xf0c020,qblockHi:0xffe870,qblockSh:0xb08010,
  pipe:0x3aa83a,  pipeHi:0x6ed86e,  pipeSh:0x227022,
  suit:0x2a2a3e,  suitHi:0x4a4a60,  suitSh:0x16161f,
  shirt:0xfdfdfd, skin:0xf0c8a0,    skinSh:0xc89a70,
  tie:0xe5342a,
  pink:0xe5342a,  pinkHi:0xff6b52,  pinkSh:0xa81e16,
  ink:0x2b1a12,   gold:0xf0c020,    cyan:0x2e9e46
};

/* 6 stage — GRAND LINE ROUTE. Urutan mengikuti perjalanan kanon Topi Jerami
   (East Blue -> Grand Line -> pulau langit) dan sengaja dipilih yang paling
   BEDA satu sama lain secara visual: desa hijau -> laut -> hutan purba ->
   gurun -> langit -> sarang bos malam.
   'biome' dipakai oleh generator latar & prop supaya tiap pulau punya
   siluet parallax sendiri (bukan gunung+pinus untuk semua). */
var STAGES = [
  { id:0, name:'DESA FOOSHA',    short:'FOOSHA',  len:6400, pieces:3, enemies:['E1'],
    biome:'village', ground:'grass' },
  { id:1, name:'BARATIE',        short:'BARATIE', len:7000, pieces:3, enemies:['E1','E2'],
    biome:'sea',     ground:'wood' },
  { id:2, name:'LITTLE GARDEN',  short:'GARDEN',  len:7400, pieces:2, enemies:['E1','E2','E3','E4'],
    biome:'jungle',  ground:'forest' },
  { id:3, name:'ALABASTA',       short:'ALABASTA',len:7800, pieces:2, enemies:['E1','E2','E5'],
    biome:'desert',  ground:'sand' },
  { id:4, name:'SKYPIEA',        short:'SKYPIEA', len:6800, pieces:1, enemies:['E1','E5','E6'],
    biome:'sky',     ground:'cloud' },
  { id:5, name:'ARLONG PARK',    short:'ARLONG',  len:5600, pieces:0, enemies:['E1'],
    biome:'lair',    ground:'marble', boss:true }
];

var QUOTA_SHAPE = [3, 3, 2, 2, 1, 0];   /* sum = 11 (semua section aktif) */

var SECTION_ICON = {
  hero:'💍', couple:'👰', rsvp:'✉️', schedule:'📅', streaming:'📺',
  story:'📖', gallery:'📷', happiness:'✨', wishes:'💬', gift:'🎁', closing:'🙏'
};

/* State runtime */
var GAME = null;
var STORE = null;
var INFOS = [];
var QUOTA = [];
var cheat = { on: false };
var runState = null;
/* Mode wujud pemain ('dasar' | 'besar'). Dideklarasikan DI SINI, bukan
   dekat PW_SKIN: freshRun() menulisinya dan bisa terpanggil lebih dulu —
   kalau deklarasinya ada di bawah, inisialisasinya akan menimpa nilai
   yang baru saja ditulis. */
var _playerMode = 'dasar';
var pendingDiff = null, pendingStage = null;
var BW = 540, BH = 960;
var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);


/* =====================================================================
   [2] STORAGE
   ===================================================================== */
/* Inisialisasi state minimal. Idempoten & aman dipanggil dari mana saja —
   dipakai sebagai guard di tiap entry point publik, karena host me-render HTML
   lebih dulu dari eksekusi JS, jadi tombol BISA diklik sebelum init selesai. */
function ensureBooted() {
  if (!TUNE) { TUNE = loadTune(); recomputeDerived(); }
  if (!STORE) STORE = loadStore();
  if (!INFOS || !INFOS.length) INFOS = scanSections();
  if (!QUOTA || !QUOTA.length) QUOTA = scaleQuota(INFOS.length);
  if (!runState) runState = freshRun();
}

function defaults() {
  return {
    v: 1,
    seed: (Date.now() % 2147483647) || 12345,
    diff: 'easy',
    unlocked: [],
    maxStage: 0,
    best: 0,
    announcedAll: false,
    completed: false,
    /* Efek suara game (lompat/koin/stomp). TERPISAH dari backsound:
       backsound itu milik host dan diatur lewat #btn-toggle-music,
       tema tidak boleh memutarnya sendiri. Dua-duanya punya tombol
       sendiri karena memang dua hal berbeda. */
    sfxOn: true
  };
}
function loadStore() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaults();
    var o = JSON.parse(raw);
    var d = defaults();
    for (var k in d) if (!(k in o)) o[k] = d[k];
    if (!Array.isArray(o.unlocked)) o.unlocked = [];
    if (!DIFF[o.diff]) o.diff = 'easy';
    return o;
  } catch (e) { return defaults(); }
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); } catch (e) {}
}
function freshRun() {
  /* Wujud pemain ikut disetel ulang: tanpa ini, mati saat memakai
     power-up membuat permainan berikutnya dimulai dengan tokoh
     power-up padahal efeknya sudah tidak ada. */
  _playerMode = 'dasar';
  return { stage: 0, score: 0, powerup: null, powerupUntil: 0, started: false };
}

/* PRNG ber-seed (mulberry32) — layout deterministik, JANGAN Math.random() */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/* =====================================================================
   [3] BINDING READER
   Host menjalankan templateParser SEBELUM JS ini jalan -> {{var}} sudah jadi
   teks biasa di DOM. Baca TEKS RENDERED, bukan atribut.
   ===================================================================== */
function val(k, fb) {
  var el = document.querySelector('[data-var="' + k + '"]');
  var v = el ? (el.textContent || '').trim() : '';
  if (!v || v.indexOf('{{') === 0) return fb || '';
  return v;
}
function scanSections() {
  var src = document.getElementById('inv-source');
  if (!src) return [];
  var out = [];
  var nodes = src.querySelectorAll('[data-info]');
  for (var i = 0; i < nodes.length; i++) {
    var key = nodes[i].getAttribute('data-info');
    if (key && out.indexOf(key) === -1) out.push(key);
  }
  return out;
}
function sectionTitle(key) {
  var src = document.getElementById('inv-source');
  var el = src && src.querySelector('[data-info="' + key + '"]');
  return (el && el.getAttribute('data-title')) || key;
}

/* Quota kepingan per stage — auto-scale saat section dikurangi flag */
function scaleQuota(total) {
  var sum = 0, i;
  for (i = 0; i < QUOTA_SHAPE.length; i++) sum += QUOTA_SHAPE[i];
  if (total >= sum) return QUOTA_SHAPE.slice();
  var out = [];
  for (i = 0; i < QUOTA_SHAPE.length; i++) out.push(Math.floor(QUOTA_SHAPE[i] * total / sum));
  var got = 0;
  for (i = 0; i < out.length; i++) got += out[i];
  var left = total - got;
  i = 0;
  var guard = 0;
  while (left > 0 && guard++ < 100) {
    if (QUOTA_SHAPE[i] > 0) { out[i]++; left--; }
    i = (i + 1) % out.length;
  }
  return out;
}

/* Pemetaan stage -> kepingan DETERMINISTIK dari nomor stage (slice kontigu).
   JANGAN pakai counter berjalan: cheat stage-jump/replay -> kepingan ganda. */
function piecesForStage(stageIdx) {
  var start = 0;
  for (var i = 0; i < stageIdx && i < QUOTA.length; i++) start += QUOTA[i];
  var n = QUOTA[stageIdx] || 0;
  return INFOS.slice(start, start + n);
}


/* =====================================================================
   [4] HOST WIRING
   ===================================================================== */

/* ---- 4.1 ID host yang harus dipindah saat clone hidup ----
   Host punya pick() yang memilih elemen VISIBLE saat ada duplicate id, TAPI
   ada 3 lubang yang TIDAK dilindungi (diverifikasi dari ThemeWrapper.tsx):
     1. #rsvp-code           -> container.querySelector polos (baris 785)
     2. field gift           -> tidak pakai pick()
     3. #tm-countdown-*      -> query tunggal, hanya copy pertama berdetak
   Karena itu de-ID WAJIB. */
var HOST_IDS = [
  'rsvp-form','rsvp-status','rsvp-guests','rsvp-code','btn-submit-kehadiran',
  'alert-submit-kehadiran','wish-form','wish-name','wish-message','btn-submit-ucapan',
  'alert-submit-ucapan','gift-name','gift-amount','gift-bank','alert-submit-hadiah',
  'btn-submit-hadiah','tm-countdown-days','tm-countdown-hours','tm-countdown-minutes',
  'tm-countdown-seconds'
];

/* Saat clone TAMPIL: matikan id di #inv-source (id -> data-pwrid).
   Saat clone DITUTUP: kembalikan.
   Urutan WAJIB: clone dulu -> tempel -> baru setSourceHostIds(false). */
/* Matikan SEMUA id host yang berada DI LUAR container `keep` (clone yang sedang
   tampil), lalu kembalikan lagi saat clone ditutup.

   Kenapa menyapu seluruh dokumen, bukan hanya #inv-source: sebuah clone lama
   yang belum sempat dibersihkan (mis. reveal ditutup saat piece-modal dibuka)
   juga membawa id host. Kalau hanya #inv-source yang di-de-ID, dua clone
   ber-id bisa hidup bersamaan → host membaca elemen yang salah dan form
   terkirim kosong. Aturannya: TEPAT SATU elemen ber-id host di dokumen. */
function setSourceHostIds(on, keep) {
  var i, id, nodes, j, el;
  if (on) {
    /* Kembalikan id ke #inv-source (satu-satunya pemilik saat idle) */
    var src = document.getElementById('inv-source');
    if (!src) return;
    for (i = 0; i < HOST_IDS.length; i++) {
      id = HOST_IDS[i];
      el = src.querySelector('[data-pwrid="' + id + '"]');
      if (el && !document.getElementById(id)) {
        el.setAttribute('id', id);
        el.removeAttribute('data-pwrid');
      }
    }
    return;
  }
  /* Matikan id di mana pun KECUALI di dalam `keep` */
  for (i = 0; i < HOST_IDS.length; i++) {
    id = HOST_IDS[i];
    nodes = document.querySelectorAll('[id="' + id + '"]');
    for (j = 0; j < nodes.length; j++) {
      el = nodes[j];
      if (keep && keep.contains(el)) continue;      /* clone aktif: biarkan */
      el.setAttribute('data-pwrid', id);
      el.removeAttribute('id');
    }
  }
}

/* Pasang id host asli pada CLONE (data-pwrid -> id). Dipanggil setelah clone
   ditempel ke DOM dan setelah source di-de-ID. */
function applyHostIds(root) {
  if (!root) return;
  var nodes = root.querySelectorAll('[data-pwrid]');
  for (var i = 0; i < nodes.length; i++) {
    var id = nodes[i].getAttribute('data-pwrid');
    nodes[i].setAttribute('id', id);
    nodes[i].removeAttribute('data-pwrid');
  }
}

/* Hidrasi gambar: source pakai data-src supaya tidak menarik bandwidth saat
   tersembunyi; clone yang tampil baru di-load. */
function hydrateImages(root) {
  if (!root) return;
  var imgs = root.querySelectorAll('img[data-src]');
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].getAttribute('data-src');
    if (src && src.indexOf('{{') !== 0) imgs[i].setAttribute('src', src);
    imgs[i].removeAttribute('data-src');
  }
}

/* Cabang RSVP: tampilkan hanya cabang yang sesuai bila tamu sudah konfirmasi. */
function syncRsvpBranchLocal(root) {
  if (!root) return;
  var card = root.querySelector('#alert-submit-kehadiran, [data-pwrid="alert-submit-kehadiran"]');
  if (!card) return;
  var branches = card.querySelectorAll('[data-rsvp-branch]');
  var shown = false;
  for (var i = 0; i < branches.length; i++) {
    if (branches[i].classList.contains('is-active')) shown = true;
  }
  /* Kalau host belum menandai, default tampilkan cabang "hadir" supaya card
     tidak kosong saat host mem-flip display-nya. */
  if (!shown && branches.length) branches[0].classList.add('is-active');
}

/* ---- 4.2 MUSIK ----
   Host pemilik penuh Audio/YouTube. Tema HANYA boleh mengklik #btn-toggle-music.
   Ikon play/pause DITULIS HOST — tema tidak menyentuhnya. */
var musicWanted = false, musicGen = 0;
function hostMusicPlaying() {
  var btn = document.getElementById('btn-toggle-music');
  if (btn && btn.classList.contains('music-playing')) return true;
  var pause = document.getElementById('pause-icon');
  if (pause && pause.style.display && pause.style.display !== 'none') return true;
  return false;
}
function setMusic(want) {
  musicWanted = !!want;
  var gen = ++musicGen, tries = 0;
  (function attempt() {
    if (gen !== musicGen || tries++ > 6) return;
    var btn = document.getElementById('btn-toggle-music');
    if (btn && hostMusicPlaying() !== musicWanted) { try { btn.click(); } catch (e) {} }
    if (hostMusicPlaying() !== musicWanted) {
      var t = setTimeout(attempt, 260);
      onCleanup(function () { clearTimeout(t); });
    }
  })();
}
function syncMusicIcon() {
  var btn = document.getElementById('pwr-btn-music');
  if (btn) btn.classList.toggle('is-on', hostMusicPlaying());
}

/* ---- EFEK SUARA GAME (bukan backsound) ----
   Ikonnya menunjukkan KEADAAN SEKARANG: 🔊 = bunyi menyala,
   🔇 = dibisukan. Disimpan di STORE supaya pilihannya bertahan
   sesudah muat ulang — kalau tidak, pemain harus mematikannya lagi
   tiap kali membuka undangan. */
function syncSfxIcon() {
  var btn = document.getElementById('pwr-btn-sfx');
  if (!btn) return;
  var on = !(STORE && STORE.sfxOn === false);
  btn.textContent = on ? '🔊' : '🔇';
  btn.classList.toggle('is-on', on);
  btn.setAttribute('title', on ? 'Efek suara: nyala' : 'Efek suara: bisu');
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function toggleSfx() {
  ensureBooted();
  STORE.sfxOn = (STORE.sfxOn === false);
  saveStore();
  syncSfxIcon();
  /* Bunyi konfirmasi hanya saat MENYALAKAN — kalau dibunyikan saat
     membisukan, tombolnya terasa tidak menurut. */
  if (STORE.sfxOn) sfx('coin');
  toast(STORE.sfxOn ? 'Efek suara nyala' : 'Efek suara dibisukan', 'ok', 1400);
}

/* ---- 4.3 LISTENER TERDELEGASI (satu, di document) ----
   JANGAN pakai MutationObserver: terbukti merusak di retromario v1.3.3-1.3.5
   (observer terpicu tulisan DOM tema sendiri; guard memblokir re-bind /
   double-bind). Dihapus total di v1.3.6, diganti delegasi ini. */
var DELEGATED = {
  'pwr-tune-star':      function () { toggleTuner(); },
  'pwr-tune-close':     function () { closeTuner(); },
  'pwr-tune-reset':     function () { resetTuner(); },
  'pwr-tune-copy':      function () { copyTuner(); },
  'pwr-tune-wipe':      function () { wipeStored(); },
  'pwr-tune-apply':     function () { applyTuner(); },
  'pwr-tune-swap':      function () { closeTuner(); openSwap(); },
  'pwr-swap-close':     function () { closeSwap(); },
  'pwr-swap-reset':     function () { resetSwap(); },
  'pwr-swap-all':       function () { toggleSwapAll(); },
  'pwr-swap-apply':     function () { applySwap(); },
  'pwr-btn-cheat':      function () { toggleCheat(); },
  'pwr-btn-stage':      function () { openStageSelect(); },
  'pwr-btn-open':       function () { revealFullInvitation(); },
  'pwr-btn-music':      function () { setMusic(!musicWanted); setTimeout(syncMusicIcon, 320); },
  'pwr-btn-sfx':        function () { toggleSfx(); },
  'pwr-btn-reset':      function () { showOverlay('reset'); },
  /* Tombol MULAI memakai id #btn-open-invitation — host menangkap klik ini
     dan men-set isOpened=true, yang membuat host berhenti memaksa
     `.is-closed #theme-fab-container{display:none}`. Tanpa itu, floating
     button (menu/QR/musik) TIDAK PERNAH terlihat di undangan live. */
  'pwr-btn-start':      function () { startFromCover(); },
  'pwr-btn-skip':       function () { skipToInvitation(); },
  'pwr-side-open':      function () { revealFullInvitation(); },
  'pwr-stage-ok':       function () { commitStageSelect(); },
  'pwr-stage-cancel':   function () { hideOverlay('stage'); },
  'pwr-reset-yes':      function () { resetGame(); },
  'pwr-reset-no':       function () { hideOverlay('reset'); },
  'pwr-piece-close':    function () { closePieceModal(); },
  'pwr-reveal-back':    function () { closeReveal(); },
  'pwr-celebrate-open': function () { hideOverlay('celebrate'); revealFullInvitation(); },
  'pwr-celebrate-close':function () { hideOverlay('celebrate'); },
  'btn-show-menu':      function () { openMenu(); },
  'pwr-menu-close':     function () { closeMenu(); },
  'pwr-fab-top':        function () { scrollRevealTop(); }
};

function onDocClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;

  /* Tombol tema */
  for (var id in DELEGATED) {
    if (t.closest('#' + id)) { e.preventDefault(); DELEGATED[id](e); return; }
  }
  /* Item menu navigasi -> lompat ke section */
  var mItem = t.closest('[data-goto]');
  if (mItem) { e.preventDefault(); gotoSection(mItem.getAttribute('data-goto')); return; }
  /* Klik latar gelap menu = tutup */
  if (t.id === 'pwr-menu') { closeMenu(); return; }

  /* Picker kesulitan (dipakai cover DAN stage-select — satu handler) */
  var diffOpt = t.closest('.pwr-diff-opt');
  if (diffOpt) { pickDiff(diffOpt.getAttribute('data-diff')); return; }
  /* Sel stage */
  var cell = t.closest('.pwr-stage-cell');
  if (cell && !cell.classList.contains('is-locked')) {
    pickStage(parseInt(cell.getAttribute('data-stage'), 10)); return;
  }
  /* Ikon kepingan -> buka modal section */
  var piece = t.closest('.pwr-piece');
  if (piece && piece.classList.contains('is-unlocked')) {
    openPieceModal(piece.getAttribute('data-key')); return;
  }
  /* Dialog ganti sprite: pilih objek (kiri) */
  var swItem = t.closest('[data-swap-key]');
  if (swItem) {
    _swapSel = swItem.getAttribute('data-swap-key');
    _swapFrame = 0;                  /* objek baru -> mulai dari rangka 1 */
    buildSwapList(); buildSwapPicker();
    return;
  }
  /* HAPUS satu rangka. Diperiksa SEBELUM pemilihan rangka, karena tombol
     × berada di dalam kotak rangka — kalau urutannya dibalik, klik ×
     hanya akan memilih rangka itu dan tidak pernah menghapus. */
  var frDel = t.closest('[data-frame-del]');
  if (frDel) {
    var dSlot = slotById(frDel.getAttribute('data-frame-slot'));
    if (dSlot) {
      var dl = slotFrames(dSlot).slice();
      var di = parseInt(frDel.getAttribute('data-frame-del'), 10) || 0;
      if (dl.length > 1) {
        dl.splice(di, 1);
        SWAP_ANIM[dSlot.id] = dl;
        saveSwapAnim();
        if (_swapFrame >= dl.length) _swapFrame = dl.length - 1;
        buildSwapList(); buildSwapPicker();
        swapNote(dl.length > 1
          ? 'Rangka dihapus — tersisa ' + dl.length + ' rangka. Tekan "Terapkan".'
          : 'Rangka dihapus — objek jadi diam (1 rangka). Tekan "Terapkan".');
      }
    }
    return;
  }
  /* Pilih rangka ke-i untuk diedit */
  var frSel = t.closest('[data-frame-idx]');
  if (frSel) {
    _swapFrame = parseInt(frSel.getAttribute('data-frame-idx'), 10) || 0;
    buildSwapPicker();
    return;
  }
  /* TAMBAH rangka baru. Rangka baru menyalin rangka terakhir supaya
     objeknya tidak mendadak berkedip ke gambar asing; user tinggal
     memilih sprite penggantinya. */
  var frAdd = t.closest('[data-frame-add]');
  if (frAdd) {
    var aSlot = slotById(frAdd.getAttribute('data-frame-add'));
    if (aSlot) {
      var al = slotFrames(aSlot).slice();
      var maxA = Math.max(1, aSlot.max || 8);
      if (al.length < maxA) {
        /* Key rangka TERAKHIR sebelum menambah, dan key rangka BARU. */
        var prevKeys = slotActiveKeys(aSlot);
        var srcKey = prevKeys[prevKeys.length - 1];
        var last = al[al.length - 1];
        al.push({ grp: last.grp, f: last.f });
        SWAP_ANIM[aSlot.id] = al;
        /* SEED ukuran & geser rangka baru dari rangka sebelumnya, sekali
           saja saat lahir. Setelah ini tiap rangka bebas diubah sendiri
           (tidak ada pewarisan di settingKey lagi). Tanpa seed ini,
           rangka baru lahir 1,0/0 padahal rangka lain mungkin sudah
           diskalakan -> objek berkedip besar-kecil saat beranimasi. */
        var newKeys = slotActiveKeys(aSlot);
        var newKey = newKeys[newKeys.length - 1];
        if (srcKey && newKey && newKey !== srcKey) {
          var sSc = scaleOf(srcKey), sNz = nudgeOf(srcKey);
          if (sSc !== 1) SCALE[newKey] = sSc; else delete SCALE[newKey];
          if (sNz !== 0) NUDGE[newKey] = sNz; else delete NUDGE[newKey];
          saveScale(); saveNudge();
        }
        saveSwapAnim();
        _swapFrame = al.length - 1;
        buildSwapList(); buildSwapPicker();
        swapNote('Rangka ke-' + al.length + ' ditambahkan (salinan rangka ' +
                 'sebelumnya). Pilih sprite penggantinya di bawah.');
      }
    }
    return;
  }
  /* Dialog ganti sprite: PAKAI SELURUH KELOMPOK (tingkat slot).
     Ini yang membuat objek statis jadi bergerak — kelompok dengan banyak
     rangka langsung dipasang sebagai animasi. */
  var useGrp = t.closest('[data-anim-grp]');
  if (useGrp) {
    var gid = useGrp.getAttribute('data-anim-grp');
    var sid = useGrp.getAttribute('data-anim-slot');
    var sl = slotById(sid);
    if (sl && SHEET_MAP[gid]) {
      /* Ambil rangka BERURUTAN dari awal kelompok, bukan sebaran merata.
         Kelompok animasi di sheet ini memang sudah satu siklus utuh
         (mis. Run 12 rangka), jadi urutan aslinya justru yang benar —
         dan susunannya langsung terlihat di deret kotak, sehingga user
         bisa membuang rangka yang tidak diinginkan sendiri. */
      var nUse = Math.min(sl.max || 8, SHEET_MAP[gid].length);
      var lst = [];
      for (var gi = 0; gi < nUse; gi++) lst.push({ grp: gid, f: gi });
      SWAP_ANIM[sid] = lst;
      saveSwapAnim();
      _swapFrame = 0;
      buildSwapList(); buildSwapPicker();
      swapNote(nUse > 1
        ? 'Dipasang ' + nUse + ' rangka — objek akan BERGERAK. Tekan "Terapkan".'
        : 'Dipasang 1 rangka (diam). Tekan "Terapkan".');
    }
    return;
  }
  /* Samakan setelan ukuran/geser SEMUA rangka ke rangka yang dipilih */
  var sameAll = t.closest('[data-same-slot]');
  if (sameAll) {
    var mSlot = slotById(sameAll.getAttribute('data-same-slot'));
    if (mSlot) {
      var mKeys = slotActiveKeys(mSlot);
      var srcK = mKeys[Math.min(Math.max(_swapFrame, 0), mKeys.length - 1)];
      var vSc = scaleOf(srcK), vNz = nudgeOf(srcK);
      for (var mi = 0; mi < mKeys.length; mi++) {
        /* Nilai bawaan DIHAPUS, bukan ditulis 1/0 — supaya "Salin nilai"
           tidak memuat entri yang sebenarnya sama dengan bawaan. */
        if (vSc === 1) delete SCALE[mKeys[mi]]; else SCALE[mKeys[mi]] = vSc;
        if (vNz === 0) delete NUDGE[mKeys[mi]]; else NUDGE[mKeys[mi]] = vNz;
      }
      saveScale(); saveNudge();
      buildSwapList(); buildSwapPicker();
      swapNote('Semua ' + mKeys.length + ' rangka disamakan: ' +
               Math.round(vSc * 100) + '%' +
               (vNz !== 0 ? ', geser ' + (vNz < 0 ? 'naik ' : 'turun ') +
                            Math.abs(vNz) + 'px' : '') +
               '. Tekan "Terapkan" agar terlihat di game.');
    }
    return;
  }
  /* Kembalikan satu objek ke bawaan */
  var animReset = t.closest('[data-anim-reset]');
  if (animReset) {
    var rSlot = slotById(animReset.getAttribute('data-anim-reset'));
    /* Kumpulkan key SELAGI penggantian masih ada: rangka tambahan
       ("__aN") hanya bisa dihitung dari SWAP_ANIM. Kalau SWAP_ANIM
       dihapus lebih dulu, setelan rangka tambahan jadi yatim — tak
       terlihat lagi di UI tapi tetap tersimpan di localStorage. */
    var rKeys = rSlot ? slotActiveKeys(rSlot).concat(rSlot.keys) : [];
    delete SWAP_ANIM[animReset.getAttribute('data-anim-reset')];
    /* Buang juga SWAP/SCALE/NUDGE per-key milik slot itu, kalau tidak
       sisa nilai lama akan langsung mengambil alih dan objek tidak
       benar-benar kembali ke bawaan. */
    for (var ri = 0; ri < rKeys.length; ri++) {
      delete SWAP[rKeys[ri]];
      delete SCALE[rKeys[ri]];
      delete NUDGE[rKeys[ri]];
    }
    if (rKeys.length) { saveSwap(); saveScale(); saveNudge(); }
    _swapFrame = 0;
    saveSwapAnim();
    buildSwapList(); buildSwapPicker();
    swapNote('Objek dikembalikan ke bawaan. Tekan "Terapkan".');
    return;
  }
  /* Dialog ganti sprite: pilih sprite pengganti (kanan) */
  var swCell = t.closest('[data-swap-grp]');
  if (swCell && _swapSel) {
    var g = swCell.getAttribute('data-swap-grp');
    var f = parseInt(swCell.getAttribute('data-swap-f'), 10) || 0;
    var ent = swapEntry(_swapSel);
    var pSlot = slotOfKey(_swapSel);
    if (pSlot) {
      /* Objek ber-slot: tulis ke RANGKA YANG SEDANG DIPILIH, bukan ke
         SWAP per-key. Ini yang membuat tiap rangka bebas mengambil
         sprite dari kelompok mana saja. */
      var pl = slotFrames(pSlot).slice();
      var pi = Math.min(Math.max(_swapFrame, 0), pl.length - 1);
      pl[pi] = { grp: g, f: f };
      SWAP_ANIM[pSlot.id] = pl;
      saveSwapAnim();
      /* SWAP per-key untuk key slot ini tidak lagi berarti apa-apa
         (SWAP_ANIM menang); dibuang supaya tidak jadi nilai hantu yang
         muncul lagi saat objek dikembalikan ke bawaan. */
      for (var pk = 0; pk < pSlot.keys.length; pk++) delete SWAP[pSlot.keys[pk]];
      saveSwap();
      buildSwapList(); buildSwapPicker();
      if (liveApplySprites()) swapNote('Diterapkan langsung.');
      else swapNote('Rangka ' + (pi + 1) + ' diganti. Tekan "Terapkan".');
      return;
    }
    /* Kembali ke bawaan kalau memilih ulang nilai aslinya — supaya
       daftar tidak terus menandai "diganti" padahal isinya sama. */
    if (ent && ent.grp === g && (ent.f || 0) === f) delete SWAP[_swapSel];
    else SWAP[_swapSel] = { grp: g, f: f };
    /* Potongan yang MERAKIT satu benda ikut berubah bersama. Mengganti
       hanya bagian tengah pijakan akan membuat ujungnya tidak menyambung
       — pijakan lalu terlihat menggantung tanpa tumpuan. */
    siblingKeysOf(_swapSel).forEach(function (sk) {
      if (SWAP[_swapSel]) SWAP[sk] = { grp: g, f: f };
      else delete SWAP[sk];
    });
    saveSwap();
    buildSwapList(); buildSwapPicker();
    /* Langsung terlihat: mengganti gambar (ukuran tetap) tidak butuh
       stage diulang, jadi tidak perlu menunggu tombol "Terapkan". */
    if (liveApplySprites()) swapNote('Diterapkan langsung.');
    else swapNote('Dipilih. Tekan "Terapkan" agar terlihat di game.');
    return;
  }
  /* Salin nomor rekening */
  var bankNo = t.closest('[data-copy]');
  if (bankNo) {
    var no = bankNo.getAttribute('data-copy') || bankNo.textContent;
    copyText(String(no).trim());
    return;
  }
}
document.addEventListener('click', onDocClick);
onCleanup(function () { document.removeEventListener('click', onDocClick); });

/* =====================================================================
   [4b] PANEL TUNING GAME
   ---------------------------------------------------------------------
   Satu daftar spesifikasi -> slider di-generate otomatis. Menambah
   parameter cukup menambah satu baris di TUNE_SPECS.
   'live' = true berarti perubahan langsung terasa tanpa memuat ulang
   stage (fisika murni). Yang mengubah GEOMETRI LEVEL (piksel, plafon)
   butuh stage dibangun ulang -> tombol "Terapkan & ulang stage".
   ===================================================================== */
var TUNE_SPECS = [
  { k:'pixel',    label:'Besar piksel',      min:2,   max:8,    step:1,
    hint:'Ukuran 1 piksel sprite & tile. Kecil = sprite lebih halus/detail.', live:false },
  /* "Plafon" versi user = PIJAKAN MELAYANG, bukan tanah. Dua slider di
     bawah inilah yang mengatur itu; keduanya otomatis dibatasi agar tidak
     melebihi jangkauan lompat (rute tetap bisa dilewati). */
  { k:'platH',    label:'Tinggi pijakan melayang', min:30, max:100, step:2,
    hint:'Ketinggian platform melayang (% jangkauan lompat). Turunkan bila terasa terlalu tinggi.', live:false },
  { k:'platH2',   label:'Tinggi pijakan tingkat 2', min:30, max:100, step:2,
    hint:'Platform susun kedua. Otomatis tidak pernah di bawah tingkat 1.', live:false },
  { k:'groundY',  label:'Tinggi tanah',      min:80,  max:420,  step:10,
    hint:'Jarak permukaan tanah ke dasar layar (ruang main vertikal).', live:false },
  { k:'jumpVel',  label:'Tinggi loncatan',   min:380, max:1000, step:10,
    hint:'Kecepatan lompat. Naik = lompatan lebih tinggi.', live:true },
  { k:'gravity',  label:'Gravitasi',         min:700, max:3000, step:50,
    hint:'Naik = jatuh lebih cepat & tidak melayang.', live:true },
  { k:'runSpeed', label:'Kecepatan lari',    min:100, max:400,  step:10,
    hint:'Ikut menentukan sejauh apa jurang bisa dilompati.', live:true },
  { k:'reach',    label:'Jangkauan aman (%)',min:50,  max:95,   step:1,
    hint:'% tinggi lompat yang dipakai menaruh kepingan/platform. Turunkan bila terasa mepet.', live:false },
  { k:'bgDetail', label:'Kerapatan latar (%)',min:40, max:200,  step:10,
    hint:'Banyaknya prop latar (pohon, awan, landmark).', live:false }
];

var _tuneBuilt = false;
function tuneNote(msg) {
  var n = document.getElementById('pwr-tune-note');
  if (n) n.textContent = msg || '';
}
/* Nilai fisika ini belum di-bake ke TUNE_DEF? (lihat konvensi hijau di
   dialog Ganti Sprite — sengaja disamakan). Perbandingan angka dilonggarkan
   sedikit karena slider bisa menghasilkan galat pembulatan float. */
function tuneUnsaved(k) {
  var cur = TUNE[k], def = TUNE_DEF[k];
  if (typeof cur !== 'number' || typeof def !== 'number') return cur !== def;
  return Math.abs(cur - def) > 1e-9;
}
/* Pasang/lepas penanda hijau pada satu angka di panel Atur Game. */
function markTuneVal(el, k) {
  if (!el) return;
  var un = tuneUnsaved(k);
  el.classList.toggle('is-unsaved', un);
  el.title = un
    ? 'Belum tersimpan di index.js (bawaan: ' + TUNE_DEF[k] + '). ' +
      'Tekan "Salin nilai" lalu tempelkan ke TUNE_DEF, kalau tidak nilainya ' +
      'hilang saat "Hapus data tersimpan".'
    : '';
}
/* Berapa slider yang nilainya masih hanya di localStorage. */
function tuneUnsavedCount() {
  var n = 0;
  for (var i = 0; i < TUNE_SPECS.length; i++) {
    if (tuneUnsaved(TUNE_SPECS[i].k)) n++;
  }
  return n;
}

function buildTuner() {
  var list = document.getElementById('pwr-tune-list');
  if (!list) return;
  list.innerHTML = '';
  ensureBooted();
  TUNE_SPECS.forEach(function (spec) {
    var row = document.createElement('div'); row.className = 'pwr-tune-row';
    var top = document.createElement('div'); top.className = 'pwr-tune-row-top';
    var nm  = document.createElement('span'); nm.className = 'pwr-tune-row-name'; nm.textContent = spec.label;
    var vl  = document.createElement('span'); vl.className = 'pwr-tune-row-val';  vl.textContent = TUNE[spec.k];
    /* Penanda "belum tersimpan di source" — konvensi yang sama dengan
       dialog Ganti Sprite: HIJAU berarti nilainya beda dari TUNE_DEF yang
       di-bake ke index.js, jadi baru ada di localStorage dan akan hilang
       saat "Hapus data tersimpan" ditekan. */
    markTuneVal(vl, spec.k);
    top.appendChild(nm); top.appendChild(vl);
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = spec.min; inp.max = spec.max; inp.step = spec.step;
    inp.value = TUNE[spec.k];
    var hint = document.createElement('div'); hint.className = 'pwr-tune-row-hint'; hint.textContent = spec.hint;
    inp.addEventListener('input', function () {
      var v = parseFloat(inp.value);
      TUNE[spec.k] = v; vl.textContent = v;
      markTuneVal(vl, spec.k);         /* hijau/abu ikut berubah seketika */
      syncTuneUnsavedBadge();
      saveTune();
      recomputeDerived();
      if (spec.live) { applyLivePhysics(); tuneNote('Diterapkan langsung.'); }
      else tuneNote('Butuh "Terapkan & ulang stage" agar terlihat.');
      updateTuneReadout();
    });
    row.appendChild(top); row.appendChild(inp); row.appendChild(hint);
    list.appendChild(row);
  });
  /* Baris info turunan — supaya pengaruh slider terlihat angkanya. */
  var out = document.createElement('div');
  out.className = 'pwr-tune-row-hint'; out.id = 'pwr-tune-readout';
  out.style.paddingTop = '8px';
  list.appendChild(out);
  _tuneBuilt = true;
  updateTuneReadout();
  syncTuneUnsavedBadge();
}

/* Lencana "● N belum tersimpan" di kepala panel Atur Game. */
function syncTuneUnsavedBadge() {
  var b = document.getElementById('pwr-tune-unsaved');
  if (!b) return;
  var n = tuneUnsavedCount();
  b.textContent = n ? '● ' + n + ' belum tersimpan' : '';
  b.title = n
    ? n + ' nilai baru ada di browser ini. Tekan "Salin nilai" lalu ' +
      'tempelkan ke index.js supaya permanen.'
    : '';
}
function updateTuneReadout() {
  var el = document.getElementById('pwr-tune-readout');
  if (!el) return;
  /* Rasio h/D ditampilkan karena inilah tuas yang paling menentukan RASA
     lompatan sekaligus kerapatan level: 0,35 = Mario (lengkungan lebar),
     1,0 = kotak/pogo yang dulu bikin objek terpaksa direnggangkan. */
  var ratio = D_MAX_PX > 0 ? (JUMP_H_PX / D_MAX_PX) : 0;
  var txt =
    'Lompat ' + Math.round(JUMP_H_PX) + 'px · ' +
    'jarak ' + Math.round(D_MAX_PX) + 'px · ' +
    'rasio ' + ratio.toFixed(2) + (ratio <= 0.60 ? '' : ' (kotak!)') + ' · ' +
    'pijakan ' + Math.round(H_PLAT) + '/' + Math.round(H_PLAT2) + 'px · ' +
    'kepingan ' + Math.round(H_PIECE) + 'px · ' +
    'jangkauan ' + Math.round(H_REACH) + 'px · ' +
    'tanah y=' + Math.round(CONFIG_GROUND_Y());
  /* Beri tahu kalau nilai slider sedang DIKOREKSI otomatis, jangan diam-diam:
     tingkat 2 di bawah tingkat 1 akan dinaikkan, dan pijakan yang melebihi
     jangkauan akan dipotong. Tanpa catatan ini, slider terlihat "tidak
     berpengaruh" padahal sedang dibatasi demi rute yang tetap bisa dilewati. */
  var warn = [];
  if (TUNE.platH2 < TUNE.platH) warn.push('tingkat 2 dinaikkan menyamai tingkat 1');
  if (Math.floor(JUMP_H_PX * (TUNE.reach / 100) * (TUNE.platH / 100)) > Math.floor(H_REACH))
    warn.push('pijakan dipotong ke batas jangkauan');
  el.textContent = txt + (warn.length ? '  ⚠ ' + warn.join('; ') : '');
}
/* Fisika bisa diubah tanpa membangun ulang level.

   BUG YANG DIPERBAIKI: dulu baris ini mencari scene bernama 'game',
   padahal GameScene mendaftar dengan key 'GameScene'. getScene() selalu
   mengembalikan null, jadi slider gravitasi yang berlabel "Diterapkan
   langsung" sebenarnya TIDAK PERNAH diterapkan sampai stage diulang.
   Sekarang memakai currentScene() supaya kuncinya hanya ditulis satu
   tempat dan tidak bisa meleset lagi. */
function applyLivePhysics() {
  var sc = currentScene();
  if (sc && sc.physics && sc.physics.world && sc.physics.world.gravity) {
    sc.physics.world.gravity.y = PHYS.GRAVITY_Y;
  }
  updateTuneReadout();
}
function toggleTuner() {
  var p = document.getElementById('pwr-tune');
  if (!p) return;
  if (p.classList.contains('show')) { closeTuner(); return; }
  if (!_tuneBuilt) buildTuner(); else { buildTuner(); }
  p.classList.add('show'); p.setAttribute('aria-hidden', 'false');
}
function closeTuner() {
  var p = document.getElementById('pwr-tune');
  if (p) { p.classList.remove('show'); p.setAttribute('aria-hidden', 'true'); }
}
function resetTuner() {
  var k;
  TUNE = {};
  for (k in TUNE_DEF) if (Object.prototype.hasOwnProperty.call(TUNE_DEF, k)) TUNE[k] = TUNE_DEF[k];
  saveTune(); recomputeDerived(); buildTuner(); applyLivePhysics();
  tuneNote('Nilai dikembalikan ke bawaan.');
}

/* SEMUA kunci simpanan tema di localStorage.
   Satu daftar saja: kalau nanti ada kunci baru, tambahkan DI SINI supaya
   "Hapus data tersimpan" tidak diam-diam menyisakan setelan lama. */
function storedKeys() {
  return [TUNE_KEY, SWAP_KEY, SCALE_KEY, NUDGE_KEY, SWAP_ANIM_KEY, STORE_KEY];
}
/* Berapa banyak kunci yang BENAR-BENAR ada — dipakai untuk memberi tahu
   user kalau sebenarnya tidak ada apa-apa untuk dihapus. */
function storedCount() {
  var n = 0, ks = storedKeys();
  for (var i = 0; i < ks.length; i++) {
    try { if (localStorage.getItem(ks[i]) !== null) n++; } catch (e) {}
  }
  return n;
}

/* HAPUS seluruh setelan tersimpan -> semua nilai kembali ke bawaan game.
   -------------------------------------------------------------------
   "Bawaan game" di sini bukan angka yang ditulis ulang di fungsi ini,
   melainkan blok *_DEF yang di-bake di index.js. Itu sebabnya caranya
   HAPUS-lalu-MUAT-ULANG, bukan menyalin nilai satu per satu: tiap
   load*() sudah mulai dari *_DEF, jadi hasilnya dijamin sama persis
   dengan yang ada di kode — tidak ada dua sumber kebenaran yang bisa
   lari berbeda.

   Progres main (STORE) ikut dihapus karena user meminta "data pengaturan
   game yang tersimpan"; STORE menyimpan juga kesulitan, stage terbuka,
   dan sakelar SFX — semuanya pengaturan. */
function wipeStored() {
  var had = storedCount();
  var ks = storedKeys();
  for (var i = 0; i < ks.length; i++) {
    try { localStorage.removeItem(ks[i]); } catch (e) {}
  }

  /* Muat ulang dari *_DEF (bukan dari localStorage yang barusan kosong). */
  TUNE = loadTune();
  loadSwap(); loadScale(); loadNudge(); loadSwapAnim();
  STORE = loadStore();

  recomputeDerived();
  applyLivePhysics();
  buildTuner();
  updateTuneReadout();
  syncSfxIcon();

  /* Dialog sprite mungkin sedang terbuka / pernah dibangun: isinya harus
     ikut menunjukkan bawaan, bukan pilihan yang sudah tidak ada lagi. */
  try { if (document.getElementById('pwr-swap-list')) { buildSwapList(); buildSwapPicker(); } } catch (e) {}

  /* Tekstur lama dibuat dari sprite pilihan user -> harus dibuang, kalau
     tidak gambar lama tetap terlihat walau datanya sudah hilang. */
  _tuneTexDirty = true;
  try {
    var sc = currentScene();
    if (sc && runState) {
      try { if (sc.scene.isPaused()) sc.scene.resume(); } catch (e2) {}
      sc.scene.restart({ stage: runState.stage, resumeX: resumeXOf(sc) });
    } else {
      rebootGame();
    }
  } catch (e3) {}

  updateHud();
  tuneNote(had
    ? 'Data tersimpan dihapus (' + had + ' bagian). Semua nilai kembali ke bawaan game.'
    : 'Tidak ada data tersimpan — semua nilai memang sudah bawaan.');
}
/* Salin SELURUH setelan yang bisa diubah dari UI, bukan cuma slider
   fisika. Dulu hanya TUNE_DEF yang ikut, sehingga penggantian sprite &
   ukuran diam-diam tertinggal: setelan hilang saat ganti perangkat dan
   tidak pernah sampai ke kode. Sekarang ketiganya dikeluarkan sebagai
   blok yang tinggal ditempel menimpa yang ada di index.js. */
function tunerSnapshot() {
  var out = [];

  var lines = TUNE_SPECS.map(function (s) { return '  ' + s.k + ': ' + TUNE[s.k] + ','; });
  out.push('var TUNE_DEF = {\n' + lines.join('\n') + '\n};');

  /* Hanya key yang BENAR-BENAR diubah yang ditulis — supaya blok tetap
     pendek dan jelas mana yang bukan bawaan. */
  var swapKeys = [], k;
  for (k in SWAP) {
    if (Object.prototype.hasOwnProperty.call(SWAP, k) && SWAP[k]) swapKeys.push(k);
  }
  swapKeys.sort();
  if (swapKeys.length) {
    out.push('var SWAP_DEF = {\n' + swapKeys.map(function (key) {
      var s = SWAP[key];
      var fr = sheetFrame(s.grp, s.f || 0);
      return "  '" + key + "': { grp: '" + s.grp + "', f: " + (s.f || 0) + ' }' +
             ',    /* #' + (fr ? fr.i : '?') + ' */';
    }).join('\n') + '\n};');
  } else {
    out.push('/* SWAP_DEF: tidak ada sprite yang diganti */');
  }

  var scaleKeys = [];
  for (k in SCALE) {
    if (Object.prototype.hasOwnProperty.call(SCALE, k) && scaleOf(k) !== 1) scaleKeys.push(k);
  }
  scaleKeys.sort();
  if (scaleKeys.length) {
    out.push('var SCALE_DEF = {\n' + scaleKeys.map(function (key) {
      return "  '" + key + "': " + scaleOf(key) + ',';
    }).join('\n') + '\n};');
  } else {
    out.push('/* SCALE_DEF: tidak ada ukuran yang diubah */');
  }

  /* Hanya slot yang susunannya BEDA dari bawaan yang ditulis. Menulis
     semua slot akan membekukan susunan bawaan ke dalam kode, sehingga
     perbaikan bawaan di kemudian hari tidak pernah terpakai. */
  var animKeys = [];
  for (k in SWAP_ANIM) {
    if (!Object.prototype.hasOwnProperty.call(SWAP_ANIM, k) || !SWAP_ANIM[k]) continue;
    var slK = slotById(k);
    if (slK && slotIsCustom(slK)) animKeys.push(k);
  }
  animKeys.sort();
  if (animKeys.length) {
    out.push('var SWAP_ANIM_DEF = {\n' + animKeys.map(function (id) {
      var s = SWAP_ANIM[id];
      var body = s.map(function (fr) {
        var sf = sheetFrame(fr.grp, fr.f);
        return "    { grp: '" + fr.grp + "', f: " + fr.f + ' }' +
               ',   /* #' + (sf ? sf.i : '?') + ' */';
      }).join('\n');
      return "  '" + id + "': [\n" + body + '\n  ],' +
             (s.length > 1 ? '   /* ' + s.length + ' rangka */' : '   /* diam */');
    }).join('\n') + '\n};');
  } else {
    out.push('/* SWAP_ANIM_DEF: tidak ada objek yang diganti susunan rangkanya */');
  }

  var nudgeKeys = [];
  for (k in NUDGE) {
    if (Object.prototype.hasOwnProperty.call(NUDGE, k) && nudgeOf(k) !== 0) nudgeKeys.push(k);
  }
  nudgeKeys.sort();
  if (nudgeKeys.length) {
    out.push('var NUDGE_DEF = {\n' + nudgeKeys.map(function (key) {
      var v = nudgeOf(key);
      return "  '" + key + "': " + v + ',    /* ' +
             (v < 0 ? 'naik ' : 'turun ') + Math.abs(v) + 'px */';
    }).join('\n') + '\n};');
  } else {
    out.push('/* NUDGE_DEF: tidak ada posisi yang digeser */');
  }

  return out.join('\n\n');
}

function copyTuner() {
  var nSwap = 0, nScale = 0, nNudge = 0, k;
  for (k in SWAP) if (Object.prototype.hasOwnProperty.call(SWAP, k) && SWAP[k]) nSwap++;
  for (k in SCALE) if (Object.prototype.hasOwnProperty.call(SCALE, k) && scaleOf(k) !== 1) nScale++;
  for (k in NUDGE) if (Object.prototype.hasOwnProperty.call(NUDGE, k) && nudgeOf(k) !== 0) nNudge++;
  copyText(tunerSnapshot());
  tuneNote('Disalin: setelan game' +
           (nSwap ? ', ' + nSwap + ' sprite diganti' : '') +
           (nScale ? ', ' + nScale + ' ukuran diubah' : '') +
           (nNudge ? ', ' + nNudge + ' posisi digeser' : '') +
           ' — kirim ke developer untuk di-bake ke kode.');
}
/* Membangun ulang stage memakai nilai baru (untuk piksel/plafon/jangkauan). */
/* Menandai bahwa tekstur harus dibuang & dibuat ulang pada create()
   berikutnya. Dibaca oleh buildTextures() (lihat purgeArtTextures). */
var _tuneTexDirty = false;

/* Buang tekstur & animasi lama. WAJIB dipanggil dari DALAM create() scene
   yang baru — saat itu display list sudah kosong, jadi tidak ada sprite
   yang menunjuk tekstur yang dihapus.

   BUG YANG DIPERBAIKI (dilaporkan: "atur ulang game, ga terjadi apapun,
   game malah stuck"): versi sebelumnya menghapus tekstur LANGSUNG lalu
   memanggil scene.restart(). Padahal restart() di Phaser TERTUNDA ke step
   berikutnya, sehingga ada 1 frame di mana sprite pemain/musuh/parallax
   masih hidup TAPI teksturnya sudah dimusnahkan -> render loop melempar
   exception -> kanvas beku tanpa pesan error. */
function purgeArtTextures(sc) {
  if (!sc || !sc.textures || !sc.textures.getTextureKeys) return;
  if (sc.anims) {
    ['groom_idle','groom_run','e1_walk','e3_fly','e6_walk',
     'coin_spin','q_blink','piece_float','goal_wave'].forEach(function (k) {
      try { if (sc.anims.exists(k)) sc.anims.remove(k); } catch (e) {}
    });
    /* Animasi yang DIBUAT oleh slot (termasuk nama "<id>_anim" untuk objek
       statis yang dijadikan bergerak). Tanpa ini, mengganti slot dua kali
       menyisakan animasi lama yang masih menunjuk tekstur terhapus. */
    ANIM_SLOTS.forEach(function (sl) {
      [sl.anim, sl.id + '_anim'].forEach(function (nm) {
        if (!nm) return;
        try { if (sc.anims.exists(nm)) sc.anims.remove(nm); } catch (e) {}
        /* Versi WUJUD POWER-UP ("<anim>__pwNinjaFrog", dst).
           Teksturnya ("t_groom_*__pwX") ikut terhapus di bawah karena
           diawali "t_", jadi animasinya WAJIB dibuang juga. Kalau tidak,
           ronde berikutnya memutar animasi yang rangkanya sudah tidak
           ada — Phaser berhenti di tengah update() dan layar membeku,
           dan restart tidak menolong karena sisanya ikut terbawa. */
        for (var pcK in PW_SKIN) {
          if (!Object.prototype.hasOwnProperty.call(PW_SKIN, pcK)) continue;
          var nm2 = nm + '__pw' + PW_SKIN[pcK].replace(/[^A-Za-z]/g, '');
          try { if (sc.anims.exists(nm2)) sc.anims.remove(nm2); } catch (e) {}
        }
      });
    });
  }
  sc.textures.getTextureKeys().forEach(function (k) {
    if (!k) return;
    /* "__a" = rangka tambahan hasil slot; ikut dibuang supaya jumlah
       rangka bisa mengecil lagi saat slot diganti. */
    if (k.indexOf('t_') === 0 || k.indexOf('pwr_') === 0 || k.indexOf('__a') > -1) {
      try { sc.textures.remove(k); } catch (e) {}
    }
  });
}

/* Posisi pemain sekarang, untuk dilanjutkan sesudah stage dibangun
   ulang. null kalau belum ada pemain (scene baru dibuat). */
function resumeXOf(sc) {
  try {
    if (sc && sc.player && typeof sc.player.x === 'number') return sc.player.x;
  } catch (e) {}
  return null;
}

function applyTuner() {
  recomputeDerived();
  tuneNote('Membangun ulang stage…');
  try {
    var sc = currentScene();
    if (!sc || !runState) { rebootGame(); tuneNote('Game dijalankan ulang.'); updateTuneReadout(); return; }

    /* Scene yang sedang PAUSED tidak memproses step, jadi restart() tidak
       akan pernah dijalankan -> "ga terjadi apapun". Bangunkan dulu. */
    try { if (sc.scene.isPaused()) sc.scene.resume(); } catch (e) {}

    /* Tandai saja; pembuangan tekstur dilakukan di awal create() berikutnya
       (lewat buildTextures) ketika display list sudah bersih. */
    _tuneTexDirty = true;
    /* Lanjut dari tempat pemain berada, bukan dari awal stage. Slider
       tuner MENGUBAH GEOMETRI level (tinggi pijakan, besar piksel), jadi
       stage memang harus dibangun ulang — tapi itu bukan alasan untuk
       melempar pemain kembali ke garis start. */
    sc.scene.restart({ stage: runState.stage, resumeX: resumeXOf(sc) });
    tuneNote('Stage dibangun ulang dengan nilai baru.');
  } catch (e) {
    tuneNote('Gagal membangun ulang: ' + (e && e.message ? e.message : e));
  }
  updateTuneReadout();
}

/* =====================================================================
   [4c] DIALOG "GANTI SPRITE"
   ---------------------------------------------------------------------
   Dua tingkat:
     1) daftar OBJEK GAME (kiri)  -> "sprite ini"
     2) daftar PILIHAN dari sheet -> "diganti dengan sprite apa"

   Pratinjaunya digambar langsung dari sheet yang sudah dimuat, jadi
   yang terlihat di dialog = yang akan tampil di game. Kalau sheet belum
   diunggah, dialog memberi tahu dan tidak menampilkan kotak kosong.

   Pilihan sengaja DISARING per jenis (pick): mengganti tile tanah dengan
   sprite karakter 32x32 secara teknis jalan, tapi hasilnya tanah
   bergambar orang — menyaring membuat daftarnya pendek dan masuk akal.
   Tetap ada tombol "Tampilkan semua" untuk yang mau bebas.
   ===================================================================== */

/* Pola kelompok yang ditawarkan untuk tiap jenis slot. */
var PICK_FILTER = {
  char: [/^Main Characters\//i],
  foe:  [/^Main Characters\//i, /^Enemies\//i],
  tile: [/^Terrain\//i, /Sand Mud Ice \(|Sand Mud Ice$/i],
  item: [/^Items\//i, /^Traps\//i, /^Other\//i],
  /* Dekorasi: gambar utuh mana pun. "Background/*" SENGAJA TIDAK ada di
     sini — isinya ubin pola polos 2 warna (wallpaper), bukan objek, dan
     memilihnya menghasilkan kotak polos yang tak terlihat di langit. */
  decor: [/^Terrain\//i, /^Items\//i, /^Traps\//i, /^Other\//i]
};

var _swapSel = null;      /* key tekstur yang sedang diedit */
var _swapFrame = 0;       /* rangka ke berapa dari objek itu yang disorot */
var _swapAll = false;     /* true = abaikan PICK_FILTER */

function swapEntry(key) {
  for (var i = 0; i < ASSET_MAP.length; i++) {
    if (ASSET_MAP[i].key === key) return ASSET_MAP[i];
  }
  return null;
}

/* Key tekstur untuk rangka ke-i dari objek yang sedang dipilih.
   Slider ukuran/geser menulis ke key INI, bukan ke key objeknya —
   itulah yang membuat tiap rangka bisa disetel sendiri-sendiri. */
function selectedFrameKey() {
  var slot = _swapSel ? slotOfKey(_swapSel) : null;
  if (!slot) return _swapSel;
  var keys = slotActiveKeys(slot);
  return keys[Math.min(Math.max(_swapFrame, 0), keys.length - 1)] || _swapSel;
}

/* Apakah rangka-rangka sebuah slot punya setelan ukuran/geser yang
   BERBEDA satu sama lain. Dipakai untuk memutuskan apakah tombol
   "Samakan ke semua rangka" perlu ditampilkan — tombol yang selalu ada
   tapi sering tidak berefek justru menyesatkan. */
function slotSettingsDiffer(slot) {
  var keys = slotActiveKeys(slot);
  if (keys.length < 2) return false;
  var s0 = scaleOf(keys[0]), n0 = nudgeOf(keys[0]);
  for (var i = 1; i < keys.length; i++) {
    if (scaleOf(keys[i]) !== s0 || nudgeOf(keys[i]) !== n0) return true;
  }
  return false;
}

/* Entri ASSET_MAP (asli atau semu) untuk rangka yang sedang dipilih,
   supaya sizeOf()/pratinjau memakai ukuran rangka itu sendiri. */
function selectedFrameEntry() {
  var key = selectedFrameKey();
  var m = swapEntry(key);
  if (m) return m;
  var i = String(key).indexOf('__a');
  if (i >= 0) {
    var slot = slotById(String(key).slice(0, i));
    if (slot) return extraEntryFor(slot, key, slotActiveKeys(slot).indexOf(key));
  }
  return swapEntry(_swapSel);
}

/* Daftar kelompok yang boleh dipilih untuk sebuah slot. */
function swapCandidates(m) {
  var pats = (!_swapAll && PICK_FILTER[m.pick]) || null;
  var out = [];
  for (var g in SHEET_MAP) {
    if (!Object.prototype.hasOwnProperty.call(SHEET_MAP, g)) continue;
    if (pats && !pats.some(function (r) { return r.test(g); })) continue;
    out.push(g);
  }
  out.sort();
  return out;
}

/* Kotak pratinjau satu frame sheet, digambar apa adanya (skala seragam). */
function swapThumb(grp, f, box) {
  var img = _assetImg.sheet;
  var fr = sheetFrame(grp, f);
  var cv = document.createElement('canvas');
  cv.width = box; cv.height = box;
  cv.className = 'pwr-swap-thumb';
  var cx = cv.getContext('2d');
  if (cx && img && fr) {
    cx.imageSmoothingEnabled = false;
    var k = Math.min(box / fr.w, box / fr.h);
    var dw = Math.max(1, Math.round(fr.w * k)), dh = Math.max(1, Math.round(fr.h * k));
    try {
      cx.drawImage(img, fr.x, fr.y, fr.w, fr.h,
                   Math.round((box - dw) / 2), Math.round((box - dh) / 2), dw, dh);
    } catch (e) {}
  }
  return cv;
}

function swapNote(msg) {
  var n = document.getElementById('pwr-swap-note');
  if (n) n.textContent = msg || '';
}

/* Sisi KIRI: daftar objek game yang bisa diganti. */
function buildSwapList() {
  var list = document.getElementById('pwr-swap-list');
  if (!list) return;
  list.innerHTML = '';
  /* Satu OBJEK = satu baris. Key yang tergabung dalam sebuah slot
     (mis. 4 rangka koin) diwakili oleh key PERTAMA saja — dulu tiap
     rangka jadi baris sendiri, sehingga daftar panjang dan mengganti
     satu objek berarti mengulang pekerjaan yang sama 4 kali. */
  var seenSlot = {};
  var nUnsaved = 0;
  ASSET_MAP.forEach(function (m) {
    if (!m.label) return;
    var sl = slotOfKey(m.key);
    if (sl) {
      if (seenSlot[sl.id]) return;      /* rangka lain dari slot yang sama */
      seenSlot[sl.id] = true;
    }
    var src = effectiveSrc(m);
    var fr = sheetFrame(src.grp, src.f);
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'pwr-swap-item' + (m.key === _swapSel ? ' is-sel' : '');
    row.setAttribute('data-swap-key', m.key);
    row.appendChild(swapThumb(src.grp, src.f, 34));
    var txt = document.createElement('span');
    txt.className = 'pwr-swap-item-txt';
    var nm = document.createElement('b');
    nm.textContent = sl ? sl.label : m.label;
    var sub = document.createElement('i');
    var k = scaleOf(m.key), nz = nudgeOf(m.key);
    var custom = sl ? slotIsCustom(sl) : false;
    /* Jumlah rangka SEBENARNYA, termasuk yang bawaan — dulu baris ini
       hanya menampilkan jumlah kalau objeknya diganti, sehingga objek
       bawaan berangka 2 terlihat seolah cuma punya 1. */
    var nFrame = sl ? slotFrames(sl).length : 1;
    /* Setelan sekarang per RANGKA, jadi baris ini harus meringkas SEMUA
       rangka — kalau hanya membaca rangka 1, penyetelan di rangka 2
       tidak akan terlihat sama sekali dari daftar. */
    var nTuned = 0;
    if (sl) {
      var aKeys = slotActiveKeys(sl);
      for (var ai = 0; ai < aKeys.length; ai++) {
        if (scaleOf(aKeys[ai]) !== 1 || nudgeOf(aKeys[ai]) !== 0) nTuned++;
      }
    } else if (k !== 1 || nz !== 0) nTuned = 1;
    var tuneTxt = '';
    if (sl && nTuned > 0) {
      tuneTxt = nTuned === nFrame && nFrame === 1
        ? '  ·  ' + Math.round(k * 100) + '%'
        : '  ·  ' + nTuned + ' rangka disetel';
    } else if (!sl && nTuned > 0) {
      tuneTxt = (k !== 1 ? '  ·  ' + Math.round(k * 100) + '%' : '') +
                (nz !== 0 ? '  ·  ' + (nz < 0 ? '↑' : '↓') + Math.abs(nz) : '');
    }
    /* Kata depannya membedakan TIGA keadaan, bukan dua:
         "bawaan"    — sprite prosedural asli, tak pernah diganti
         "tersimpan" — sudah di-bake ke *_DEF di index.js (aman)
         "diganti"   — baru ada di localStorage (hijau, bisa hilang)  */
    var unsaved = entryUnsaved(m, sl);
    var changed = sl ? custom : !!SWAP[m.key];
    var stateTxt = !changed ? 'bawaan' : (unsaved ? 'diganti' : 'tersimpan');
    sub.textContent = (sl
                        ? stateTxt + ' → ' + nFrame + ' rangka'
                        : stateTxt + (changed ? ' → #' : ' #') + (fr ? fr.i : '?')) +
                      (nFrame > 1 ? ' ▶' : '') + tuneTxt;
    /* HIJAU = "belum tersimpan di source". Bukan sekadar "bukan sprite
       bawaan": nilai yang sudah di-bake ke *_DEF tampil ABU karena aman —
       ia tidak akan hilang saat "Hapus data tersimpan" ditekan. */
    if (unsaved) { sub.className = 'is-swapped'; nUnsaved++; }
    txt.appendChild(nm); txt.appendChild(sub);
    row.appendChild(txt);
    list.appendChild(row);
  });

  /* Ringkasan di kepala kolom: berapa objek yang nilainya masih hanya di
     localStorage. Ditaruh di sini (bukan di #pwr-swap-note) supaya tidak
     tertimpa pesan sementara seperti "Diterapkan langsung." */
  var badge = document.getElementById('pwr-swap-unsaved');
  if (badge) {
    badge.textContent = nUnsaved
      ? '● ' + nUnsaved + ' belum tersimpan'
      : '';
    badge.title = nUnsaved
      ? nUnsaved + ' objek nilainya baru ada di browser ini. Tekan "Salin ' +
        'nilai" lalu tempelkan ke index.js supaya permanen — kalau tidak, ' +
        'nilainya hilang saat "Hapus data tersimpan" ditekan.'
      : '';
  }
}

/* Sisi KANAN: pilihan sprite pengganti untuk slot terpilih. */
function buildSwapPicker() {
  var wrap = document.getElementById('pwr-swap-pick');
  var head = document.getElementById('pwr-swap-pick-head');
  if (!wrap) return;
  wrap.innerHTML = '';
  var m = _swapSel ? swapEntry(_swapSel) : null;
  if (!m) {
    if (head) head.textContent = 'Pilih objek di kiri dulu';
    return;
  }
  if (head) head.textContent = 'Ganti "' + m.label + '" dengan:';

  /* Setelan ukuran & geser berlaku untuk RANGKA yang sedang dipilih,
     bukan untuk seluruh objek — jadi rangka 1 dan rangka 2 boleh punya
     ukuran/posisi berbeda. mFrame = entri rangka itu. */
  var slotSel = slotOfKey(m.key);
  var fkey = selectedFrameKey();
  var mFrame = selectedFrameEntry() || m;
  var nFrames = slotSel ? slotFrames(slotSel).length : 1;

  /* --- slider UKURAN untuk RANGKA ini (kalau boleh diskala) --- */
  var sc = document.createElement('div');
  sc.className = 'pwr-swap-size';
  if (!scalable(m.key)) {
    /* Terangkan KENAPA tidak ada slider, jangan cuma dihilangkan. */
    sc.className += ' is-locked';
    sc.textContent = 'Ukuran objek ini terkunci: posisinya mengikuti ' +
                     'grid level 32px, jadi mengubah ukuran akan membuat ' +
                     'gambar tidak sejajar dengan petak dan rute lompat ' +
                     'bisa jadi tak terlewati.';
    wrap.appendChild(sc);
  } else {
    var sz = sizeOf(mFrame);
    var scTop = document.createElement('div');
    scTop.className = 'pwr-swap-size-top';
    var scNm = document.createElement('span');
    scNm.textContent = nFrames > 1 ? 'Ukuran — rangka ' + (_swapFrame + 1) : 'Ukuran';
    var scVal = document.createElement('span');
    scVal.textContent = Math.round(scaleOf(fkey) * 100) + '%  (' + sz.w + '×' + sz.h + 'px)';
    scTop.appendChild(scNm); scTop.appendChild(scVal);
    var scInp = document.createElement('input');
    scInp.type = 'range';
    scInp.min = Math.round(SCALE_MIN * 100);
    scInp.max = Math.round(SCALE_MAX * 100);
    scInp.step = 5;
    scInp.value = Math.round(scaleOf(fkey) * 100);
    var scHint = document.createElement('div');
    scHint.className = 'pwr-swap-size-hint';
    scHint.textContent = nFrames > 1
      ? 'Berlaku untuk rangka ' + (_swapFrame + 1) + ' saja — tiap rangka ' +
        'boleh beda ukuran. Kotak tumbukan tetap mengikuti rangka 1 supaya ' +
        'objek tidak berkedip menembus lantai.'
      : 'Kotak tumbukan ikut berubah, jadi ruang yang dipakai objek di ' +
        'dunia juga menyesuaikan.';
    scInp.addEventListener('input', function () {
      var v = parseInt(scInp.value, 10) / 100;
      if (v === 1) delete SCALE[fkey]; else SCALE[fkey] = v;
      saveScale();
      var s2 = sizeOf(mFrame);
      scVal.textContent = Math.round(v * 100) + '%  (' + s2.w + '×' + s2.h + 'px)';
      swapNote('Ukuran rangka ' + (_swapFrame + 1) +
               ' diubah. Tekan "Terapkan" agar terlihat di game.');
      buildSwapList();
    });
    sc.appendChild(scTop); sc.appendChild(scInp); sc.appendChild(scHint);

    /* --- slider NAIK / TURUN --- */
    var nudgeLabel = function (v) {
      if (v === 0) return 'pas di tempatnya';
      return (v < 0 ? 'naik ' : 'turun ') + Math.abs(v) + 'px';
    };
    var nzTop = document.createElement('div');
    nzTop.className = 'pwr-swap-size-top';
    var nzNm = document.createElement('span');
    nzNm.textContent = nFrames > 1
      ? 'Naik / turun — rangka ' + (_swapFrame + 1) : 'Naik / turun';
    var nzVal = document.createElement('span');
    nzVal.textContent = nudgeLabel(nudgeOf(fkey));
    nzTop.appendChild(nzNm); nzTop.appendChild(nzVal);
    var nzInp = document.createElement('input');
    nzInp.type = 'range';
    nzInp.min = NUDGE_MIN; nzInp.max = NUDGE_MAX; nzInp.step = 1;
    nzInp.value = nudgeOf(fkey);
    var nzHint = document.createElement('div');
    nzHint.className = 'pwr-swap-size-hint';
    nzHint.textContent = 'Geser ke kiri = naik, ke kanan = turun.' +
      (nFrames > 1 ? ' Berlaku untuk rangka ' + (_swapFrame + 1) + ' saja.'
                   : ' Kotak tumbukan ikut bergeser.');
    nzInp.addEventListener('input', function () {
      var v = parseInt(nzInp.value, 10) || 0;
      if (v === 0) delete NUDGE[fkey]; else NUDGE[fkey] = v;
      saveNudge();
      nzVal.textContent = nudgeLabel(v);
      swapNote('Posisi rangka ' + (_swapFrame + 1) +
               ' diubah. Tekan "Terapkan" agar terlihat di game.');
      buildSwapList();
    });
    sc.appendChild(nzTop); sc.appendChild(nzInp); sc.appendChild(nzHint);

    /* --- SAMAKAN KE SEMUA RANGKA ---
       Hanya muncul kalau rangka-rangkanya MEMANG berbeda. Menampilkannya
       terus-menerus akan jadi tombol yang tidak melakukan apa-apa di
       kebanyakan keadaan, dan user tidak bisa tahu apakah objeknya sudah
       seragam atau belum tanpa mengklik satu per satu. */
    if (nFrames > 1 && slotSel && slotSettingsDiffer(slotSel)) {
      var same = document.createElement('button');
      same.type = 'button';
      same.className = 'pwr-tune-btn pwr-swap-sameall';
      same.setAttribute('data-same-slot', slotSel.id);
      same.textContent = 'Samakan ke semua rangka (' + nFrames + ')';
      var sameHint = document.createElement('div');
      sameHint.className = 'pwr-swap-size-hint';
      sameHint.textContent = 'Ukuran & posisi rangka ' + (_swapFrame + 1) +
                             ' (' + Math.round(scaleOf(fkey) * 100) + '%, ' +
                             nudgeLabel(nudgeOf(fkey)) + ') dipakai untuk ' +
                             'semua rangka objek ini.';
      sc.appendChild(same); sc.appendChild(sameHint);
    }

    wrap.appendChild(sc);
  }

  /* --- SUSUNAN RANGKA (kalau key ini milik sebuah slot) ---
     Ditampilkan APA ADANYA: satu kotak per rangka yang benar-benar
     dipakai game, berurutan. Kotak terakhir bertanda "+" untuk menambah
     rangka berikutnya. Jadi user melihat susunan yang sesungguhnya —
     bukan seluruh isi kelompok sumber, yang jumlahnya hampir selalu
     berbeda (mis. game pakai 2 rangka, kelompoknya berisi 11). */
  var slot = slotOfKey(m.key);
  var frames = slot ? slotFrames(slot) : null;
  if (slot) {
    var nNow = frames.length;
    var maxF = Math.max(1, slot.max || 8);
    var av = document.createElement('div');
    av.className = 'pwr-swap-anim';

    var avTop = document.createElement('div');
    avTop.className = 'pwr-swap-size-top';
    var avNm = document.createElement('span');
    avNm.textContent = slot.twoState ? 'Wujud objek' : 'Susunan rangka';
    var avVal = document.createElement('span');
    avVal.textContent = slot.twoState
      ? nNow + ' wujud'
      : (nNow > 1 ? nNow + ' rangka — bergerak' : '1 rangka — diam');
    avTop.appendChild(avNm); avTop.appendChild(avVal);
    av.appendChild(avTop);

    var avHint = document.createElement('div');
    avHint.className = 'pwr-swap-size-hint';
    avHint.textContent = slot.twoState
      ? 'Wujud ini dipilih jalannya permainan (mis. utuh/rusak), bukan ' +
        'animasi. Klik satu kotak lalu pilih sprite di bawah untuk ' +
        'menggantinya.'
      : (maxF < 2
          ? 'Objek ini digambar diam dan tidak bisa dianimasikan. Klik ' +
            'kotaknya lalu pilih sprite pengganti di bawah.'
          : 'Klik satu kotak untuk mengganti rangka itu — sprite boleh ' +
            'diambil dari kelompok mana saja. Kotak "+" menambah rangka ' +
            'baru; dua rangka atau lebih membuat objek bergerak.');
    av.appendChild(avHint);

    /* Deret kotak rangka + kotak tambah di akhir. */
    var strip = document.createElement('div');
    strip.className = 'pwr-swap-frames';
    frames.forEach(function (fr, i) {
      var cellFr = document.createElement('button');
      cellFr.type = 'button';
      cellFr.className = 'pwr-swap-frame' + (i === _swapFrame ? ' is-sel' : '');
      cellFr.setAttribute('data-frame-idx', i);
      cellFr.setAttribute('data-frame-slot', slot.id);
      var sf = sheetFrame(fr.grp, fr.f);
      /* Tandai rangka yang punya setelan ukuran/geser sendiri, supaya
         terlihat tanpa harus mengklik satu per satu. */
      var fKeys = slotActiveKeys(slot);
      var fk = fKeys[i] || slot.keys[0];
      var fSc = scaleOf(fk), fNz = nudgeOf(fk);
      var tuned = (fSc !== 1 || fNz !== 0);
      if (tuned) cellFr.className += ' is-tuned';
      cellFr.title = fr.grp + ' #' + (sf ? sf.i : '?') +
        (tuned ? '  ·  ' + Math.round(fSc * 100) + '%' +
                 (fNz !== 0 ? (fNz < 0 ? ' ↑' : ' ↓') + Math.abs(fNz) : '') : '');
      cellFr.appendChild(swapThumb(fr.grp, fr.f, 40));
      /* NOMOR SPRITE, bukan nomor urut. Urutannya sudah terbaca sendiri
         dari kiri ke kanan, jadi menulis 1,2,3 tidak menambah informasi —
         sedangkan nomor sprite (yang tercetak di sheet) tidak terlihat di
         mana pun kecuali di sini. */
      var lb = document.createElement('span');
      lb.className = 'pwr-swap-frame-n';
      lb.textContent = sf ? sf.i : '?';
      cellFr.appendChild(lb);
      /* Rangka bisa dibuang hanya kalau masih tersisa >1 — objek tanpa
         rangka sama sekali tidak punya gambar. */
      if (frames.length > 1) {
        var del = document.createElement('span');
        del.className = 'pwr-swap-frame-x';
        del.setAttribute('data-frame-del', i);
        del.setAttribute('data-frame-slot', slot.id);
        del.textContent = '×';
        del.title = 'Hapus rangka ini';
        cellFr.appendChild(del);
      }
      strip.appendChild(cellFr);
    });
    /* Kotak "+" — hanya kalau slot ini memang boleh punya rangka lebih.
       Objek dekorasi (max 1) tidak menampilkannya, karena Phaser Image
       tidak bisa dianimasikan sama sekali dan tombolnya akan menipu. */
    if (frames.length < maxF && !slot.twoState) {
      var addB = document.createElement('button');
      addB.type = 'button';
      addB.className = 'pwr-swap-frame is-add';
      addB.setAttribute('data-frame-add', slot.id);
      addB.title = 'Tambah rangka ke-' + (frames.length + 1);
      var plus = document.createElement('span');
      plus.className = 'pwr-swap-frame-plus';
      plus.textContent = '+';
      addB.appendChild(plus);
      strip.appendChild(addB);
    }
    av.appendChild(strip);

    /* tombol kembalikan slot ini ke bawaan */
    if (slotIsCustom(slot)) {
      var undo = document.createElement('button');
      undo.type = 'button';
      undo.className = 'pwr-tune-btn pwr-swap-undo';
      undo.textContent = 'Kembalikan objek ini ke bawaan';
      undo.setAttribute('data-anim-reset', slot.id);
      av.appendChild(undo);
    }
    wrap.appendChild(av);
  }

  /* Sprite mana yang sedang disorot di daftar bawah: kalau sebuah rangka
     sedang dipilih, itu yang ditandai — bukan rangka pertama. */
  var cur = (slot && frames && frames[_swapFrame])
    ? frames[_swapFrame] : effectiveSrc(m);
  var groups = swapCandidates(m);
  if (!groups.length) {
    wrap.innerHTML = '<div class="pwr-swap-empty">Tidak ada kandidat. Coba "Tampilkan semua".</div>';
    return;
  }
  /* Kelompok yang dipakai rangka yang sedang disorot — dipakai menandai
     tombol "pakai seluruh kelompok" yang sedang aktif. */
  var curSlotGrp = (slot && frames && frames.length) ? frames[0].grp : null;

  groups.forEach(function (g) {
    var sec = document.createElement('div');
    sec.className = 'pwr-swap-grp';
    var h = document.createElement('div');
    h.className = 'pwr-swap-grp-h';
    h.textContent = g + '  (' + SHEET_MAP[g].length + ' rangka)';
    sec.appendChild(h);

    /* Jalan pintas: pakai SELURUH isi kelompok ini sebagai susunan rangka.
       Berguna untuk kelompok animasi utuh (mis. Run 12 rangka). Susunan
       hasilnya langsung terlihat di deret kotak di atas, jadi user tetap
       bisa membuang/mengganti rangka satu per satu setelahnya. */
    if (slot && !slot.twoState) {
      var nUse = Math.min(slot.max || 8, SHEET_MAP[g].length);
      var allSame = frames.length === nUse && frames.every(function (fr, i) {
        return fr.grp === g && fr.f === i;
      });
      var useBtn = document.createElement('button');
      useBtn.type = 'button';
      useBtn.className = 'pwr-swap-usegrp' + (allSame ? ' is-cur' : '');
      useBtn.setAttribute('data-anim-grp', g);
      useBtn.setAttribute('data-anim-slot', slot.id);
      useBtn.textContent = nUse > 1
        ? 'Pakai seluruh kelompok — ' + nUse + ' rangka (bergerak)'
        : 'Pakai kelompok ini (1 rangka, diam)';
      sec.appendChild(useBtn);
    }

    var grid = document.createElement('div');
    grid.className = 'pwr-swap-grid';
    SHEET_MAP[g].forEach(function (fr, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pwr-swap-cell' +
        (g === cur.grp && idx === cur.f ? ' is-cur' : '');
      b.setAttribute('data-swap-grp', g);
      b.setAttribute('data-swap-f', idx);
      b.title = g + ' #' + fr[0] + ' (' + fr[3] + '×' + fr[4] + ')';
      b.appendChild(swapThumb(g, idx, 40));
      var n = document.createElement('span');
      n.className = 'pwr-swap-cell-n'; n.textContent = fr[0];
      b.appendChild(n);
      grid.appendChild(b);
    });
    sec.appendChild(grid);
    wrap.appendChild(sec);
  });
}

function openSwap() {
  var p = document.getElementById('pwr-swap');
  if (!p) return;
  ensureBooted();
  if (!_assetImg.sheet) {
    /* Tanpa sheet, semua pratinjau akan kosong — lebih jujur bilang. */
    swapNote('Sprite sheet belum diunggah. Unggah assets/sprite-sheet.png ' +
             'sebagai Asset Media pertama, lalu buka lagi dialog ini.');
  } else {
    swapNote('');
  }
  if (!_swapSel && ASSET_MAP.length) _swapSel = ASSET_MAP[0].key;
  buildSwapList();
  buildSwapPicker();
  p.classList.add('show');
  p.setAttribute('aria-hidden', 'false');
}
function closeSwap() {
  var p = document.getElementById('pwr-swap');
  if (p) { p.classList.remove('show'); p.setAttribute('aria-hidden', 'true'); }
}
/* Kembali ke BAWAAN, yaitu SWAP_DEF/SCALE_DEF yang di-bake — bukan
   sekadar dikosongkan. Simpanan lokal dihapus dulu supaya loadSwap()
   tidak langsung menimpanya lagi dengan nilai lama. */
function resetSwap() {
  try { localStorage.removeItem(SWAP_KEY); } catch (e) {}
  try { localStorage.removeItem(SCALE_KEY); } catch (e) {}
  try { localStorage.removeItem(NUDGE_KEY); } catch (e) {}
  try { localStorage.removeItem(SWAP_ANIM_KEY); } catch (e) {}
  loadSwap(); loadScale(); loadNudge(); loadSwapAnim();
  buildSwapList(); buildSwapPicker();
  swapNote('Semua sprite & ukuran dikembalikan ke bawaan. ' +
           'Tekan "Terapkan" agar terlihat.');
}
function toggleSwapAll() {
  _swapAll = !_swapAll;
  var b = document.getElementById('pwr-swap-all');
  if (b) b.textContent = _swapAll ? 'Saring per jenis' : 'Tampilkan semua';
  buildSwapPicker();
}
/* Terapkan = buang tekstur lama lalu bangun ulang stage, jalur yang sama
   dengan tuner supaya tidak ada dua mekanisme rebuild yang bisa lari
   berbeda. */
/* Terapkan penggantian sprite TANPA mengulang stage.
   ---------------------------------------------------------------------
   Sprite di Phaser menyimpan RUJUKAN ke key tekstur, bukan salinan
   gambarnya. Jadi kalau isi kanvas sebuah tekstur ditimpa di tempat,
   semua sprite yang memakainya langsung ikut berubah pada frame
   berikutnya — tanpa membangun ulang level, tanpa kehilangan posisi
   pemain, skor, atau kepingan yang sudah dikumpulkan.

   Yang TIDAK bisa dilakukan tanpa ulang stage:
     - mengubah UKURAN tekstur (hitbox statis sudah terlanjur dihitung
       oleh refreshBody() saat objek dibuat);
     - menambah/mengurangi JUMLAH rangka (animasi harus didaftar ulang).
   Dua hal itu terdeteksi di bawah dan barulah stage diulang.

   Mengembalikan true kalau berhasil live, false kalau perlu ulang stage. */
function liveApplySprites() {
  var sc = currentScene();
  if (!sc || !sc.textures || !sc.sys || !sc.sys.isActive || !sc.sys.isActive()) return false;

  var needRestart = false;
  var changed = 0;

  /* 1. Ukuran tekstur atau jumlah rangka berubah? -> wajib ulang stage. */
  var i, m, sz, tex, kk2;
  for (i = 0; i < ASSET_MAP.length && !needRestart; i++) {
    m = ASSET_MAP[i];
    sz = sizeOf(m);
    /* Periksa kunci dasar DAN kunci per-stage: keduanya harus masih
       seukuran, kalau tidak hitbox statisnya sudah tidak cocok. */
    var keysToCheck = [m.key];
    if (m.stages) {
      for (var s3 = 0; s3 < STAGES.length; s3++) keysToCheck.push(m.key + '_s' + s3);
    }
    for (var q = 0; q < keysToCheck.length; q++) {
      kk2 = keysToCheck[q];
      tex = sc.textures.exists(kk2) ? sc.textures.get(kk2) : null;
      if (!tex || !tex.source || !tex.source[0]) continue;
      if (tex.source[0].width !== sz.w || tex.source[0].height !== sz.h) {
        needRestart = true; break;
      }
    }
  }
  if (!needRestart) {
    for (i = 0; i < ANIM_SLOTS.length; i++) {
      var sl = ANIM_SLOTS[i];
      /* Slot dua-wujud (bos/E2/E5) punya beberapa key TAPI memang tidak
         pernah dianimasikan — jumlah key-nya tidak boleh dibandingkan
         dengan jumlah rangka animasi, karena selalu tidak sama dan akan
         memaksa ulang stage terus-menerus. */
      if (sl.twoState) continue;
      var nm = sl.anim || (sl.id + '_anim');
      /* Berapa rangka yang SEHARUSNYA dipakai sekarang; 1 = tidak ada
         animasi sama sekali. */
      var want = slotAnimName(sl.id) ? slotActiveKeys(sl).length : 1;
      /* Berapa yang SEDANG terpasang di scene. */
      var have = sc.anims.exists(nm) ? sc.anims.get(nm).frames.length : 1;
      /* Beda berarti animasi harus didaftar ulang (termasuk kasus
         diam -> bergerak dan sebaliknya) -> tidak bisa live. */
      if (want !== have) { needRestart = true; break; }
    }
  }
  /* Rangka TAMBAHAN ("__aN") juga punya setelan ukuran sendiri sekarang.
     Tanpa pemeriksaan ini, memperbesar rangka ke-2 akan dianggap bisa
     live padahal kanvasnya harus dibuat ulang — hasilnya gambar
     terpotong diam-diam. */
  if (!needRestart) {
    for (i = 0; i < ANIM_SLOTS.length && !needRestart; i++) {
      var sl3 = ANIM_SLOTS[i];
      var ks3 = slotActiveKeys(sl3);
      for (var j3 = sl3.keys.length; j3 < ks3.length; j3++) {
        var ex3 = extraEntryFor(sl3, ks3[j3], j3);
        if (!ex3 || !sc.textures.exists(ks3[j3])) continue;
        var tx3 = sc.textures.get(ks3[j3]);
        if (!tx3 || !tx3.source || !tx3.source[0]) continue;
        var sz3 = sizeOf(ex3);
        if (tx3.source[0].width !== sz3.w || tx3.source[0].height !== sz3.h) {
          needRestart = true; break;
        }
      }
    }
  }
  if (needRestart) return false;

  /* 2. Gambar ulang isi tiap tekstur DI TEMPAT. */
  var img = _assetImg.sheet;
  if (!img) return false;

  for (i = 0; i < ASSET_MAP.length; i++) {
    m = ASSET_MAP[i];
    if (sc.textures.exists(m.key) && redrawTexture(sc, m, m.key)) changed++;
    /* Dekorasi juga terdaftar per-stage, dan HARUS diperiksa terpisah:
       sebagian prop (mis. pagar) TIDAK punya tekstur kunci-dasar sama
       sekali — buildTextures() hanya membuat 't_fence_s0..s5'. Kalau
       kunci per-stage ikut dilewati saat kunci dasar tidak ada, sprite
       pagar tidak pernah ter-update ("ganti sprite pagar ga ngefek"). */
    if (m.stages) {
      for (var s2 = 0; s2 < STAGES.length; s2++) {
        var sk = m.key + '_s' + s2;
        if (sc.textures.exists(sk) && redrawTexture(sc, m, sk)) changed++;
      }
    }
  }
  /* rangka animasi tambahan */
  for (i = 0; i < ANIM_SLOTS.length; i++) {
    var sl2 = ANIM_SLOTS[i];
    var keys2 = slotActiveKeys(sl2);
    for (var j = sl2.keys.length; j < keys2.length; j++) {
      var ex = extraEntryFor(sl2, keys2[j], j);
      if (ex && sc.textures.exists(keys2[j])) redrawTexture(sc, ex, keys2[j]);
    }
  }
  /* Tekstur sudah ditimpa, tapi TileSprite masih memakai pola lama yang
     di-bake saat dibuat — tanpa ini, "isian tanah" tidak pernah berubah. */
  if (changed > 0) refreshGroundFill(sc);
  return changed > 0;
}

/* Paksa tiap TileSprite isian tanah membangun ULANG pola internalnya.

   Kenapa perlu: redrawTexture() menimpa kanvas tekstur di tempat. Untuk
   Image/Sprite biasa itu cukup — mereka membaca tekstur saat menggambar.
   TileSprite TIDAK: ia mem-bake pola (fillPattern/fillCanvas) sekali saat
   dibuat, jadi piksel baru tak pernah terlihat. Gejalanya persis "permukaan
   tanah berubah, isian tanah tidak ngaruh sama sekali".

   setTexture() dengan kunci yang sama memaksa Phaser mengambil ulang
   sumbernya dan menyusun pola baru. Dipanggil setelah semua tekstur
   digambar ulang, bukan per tekstur.

   Menyapu SELURUH display list, bukan daftar yang dicatat manual: selain
   isian tanah, bagian TENGAH pijakan melayang juga tileSprite (ujung kiri &
   kanannya Image — itulah sebabnya ujung pijakan berubah tapi tengahnya
   tidak). Lapis parallax ikut tersapu dan itu memang diinginkan. */
function refreshGroundFill(sc) {
  if (!sc || !sc.children || !sc.children.list) return 0;
  var list = sc.children.list, n = 0;
  for (var i = 0; i < list.length; i++) {
    var ts = list[i];
    /* Hanya TileSprite yang bermasalah — Image/Sprite membaca tekstur
       saat menggambar, jadi timpaan kanvas sudah cukup untuk mereka. */
    if (!ts || ts.type !== 'TileSprite' || !ts.texture || !ts.setTexture) continue;
    try {
      ts.setTexture(ts.texture.key);   /* kunci sama = paksa susun ulang pola */
      n++;
    } catch (e) {}
  }
  return n;
}

/* Timpa isi kanvas sebuah tekstur yang SUDAH ada, lalu tandai agar GPU
   mengunggah ulang. Ukuran kanvas tidak diubah — pemanggil sudah
   memastikan ukurannya masih sama. */
function redrawTexture(sc, m, key) {
  try {
    var tex = sc.textures.get(key);
    var srcObj = tex && tex.source && tex.source[0];
    var cv = srcObj && srcObj.image;
    if (!cv || !cv.getContext) return false;          /* bukan CanvasTexture */
    var cx = cv.getContext('2d');
    if (!cx) return false;

    var img = _assetImg.sheet;
    var src = effectiveSrc(m);
    var fr = sheetFrame(src.grp, src.f);
    if (!img || !fr) return false;
    if (fr.x + fr.w > img.width || fr.y + fr.h > img.height) return false;

    cx.clearRect(0, 0, cv.width, cv.height);
    cx.imageSmoothingEnabled = false;

    var n = nudgeOf(m.key);
    var bodyH = cv.height - Math.abs(n);
    var offY = n < 0 ? 0 : Math.abs(n);

    if (m.stack) {
      var bw = cv.width;
      for (var bottom = bodyH; bottom > 0; bottom -= bw) {
        var top = Math.max(0, bottom - bw);
        var drawH = bottom - top;
        var srcH = Math.max(1, Math.round(fr.h * (drawH / bw)));
        cx.drawImage(img, fr.x, fr.y + (fr.h - srcH), fr.w, srcH,
                     0, offY + top, cv.width, drawH);
      }
    } else if (m.fill) {
      /* Sama seperti di assetToTexture(): menutup penuh tanpa merentang.
         Jalur LIVE ini harus memakai cara yang sama persis, kalau tidak
         gambar berubah bentuk begitu diterapkan langsung vs saat stage
         dibangun ulang. */
      drawCover(cx, img, fr.x, fr.y, fr.w, fr.h, 0, offY, cv.width, bodyH);
    } else {
      cx.save();
      cx.translate(0, offY);
      drawFit(cx, img, fr.x, fr.y, fr.w, fr.h, cv.width, bodyH);
      cx.restore();
    }
    /* WAJIB: tanpa ini tekstur di GPU masih memakai piksel lama. */
    if (tex.refresh) tex.refresh();
    else if (srcObj.update) srcObj.update();
    return true;
  } catch (e) { return false; }
}

function applySwap() {
  swapNote('Menerapkan…');
  /* 1. Coba LIVE dulu — tekstur ditimpa di tempat, tidak ada yang hilang:
     posisi pemain, skor, kepingan, musuh, semuanya tetap. */
  if (liveApplySprites()) {
    swapNote('Sprite diterapkan langsung — permainan tidak terganggu.');
    buildSwapList();
    return;
  }
  /* 2. Perubahan UKURAN / JUMLAH RANGKA mengubah kanvas tekstur, dan
     hitbox diturunkan dari situ — stage memang harus dibangun ulang.
     Tapi pemain TIDAK dilempar ke awal: dia dilanjutkan dari titik aman
     beberapa langkah di belakang posisinya, sama seperti respawn saat
     jatuh. Skor & kepingan ada di runState/STORE, jadi ikut selamat. */
  var sc = currentScene();
  var rx = resumeXOf(sc);
  recomputeDerived();
  try {
    if (!sc || !runState) { rebootGame(); swapNote('Game dijalankan ulang.'); }
    else {
      try { if (sc.scene.isPaused()) sc.scene.resume(); } catch (e) {}
      _tuneTexDirty = true;
      sc.scene.restart({ stage: runState.stage, resumeX: rx });
      swapNote(rx != null
        ? 'Ukuran sprite berubah — stage dimuat ulang, permainan dilanjutkan ' +
          'dari titik terakhir.'
        : 'Ukuran sprite berubah — stage dimuat ulang.');
    }
  } catch (e) {
    swapNote('Gagal menerapkan: ' + (e && e.message ? e.message : e));
  }
  buildSwapList();
}

function copyText(s) {
  if (!s) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(s);
    } else {
      var ta = document.createElement('textarea');
      ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) {}
      document.body.removeChild(ta);
    }
    toast('Nomor rekening disalin', 'ok');
  } catch (e) {}
}


/* =====================================================================
   [5] UI / OVERLAY
   ===================================================================== */
var OV = { cover:'pwr-ov-cover', stage:'pwr-ov-stage', reset:'pwr-ov-reset', celebrate:'pwr-ov-celebrate' };

function showOverlay(name) {
  var el = document.getElementById(OV[name]);
  if (el) el.classList.add('show');
  pauseIfNeeded();
}
function hideOverlay(name) {
  var el = document.getElementById(OV[name]);
  if (el) el.classList.remove('show');
  resumeIfPossible();
}
function isOverlayVisible(name) {
  var el = document.getElementById(OV[name]);
  return !!(el && el.classList.contains('show'));
}
/* True bila ADA overlay/dialog/popup yang menutupi panggung — termasuk cover.
   Dipakai untuk MEMBEKUKAN game: gameplay tidak boleh berjalan di balik dialog
   (kebocoran universal di 5 tema sebelumnya adalah piece-modal yang lupa
   membekukan). Cover ikut dihitung karena saat cover tampil, run memang belum
   dimulai. */
function anyOverlayOpen() {
  return !!document.querySelector(
    '.pwr-overlay.show, #pwr-piece-modal.show, #pwr-reveal.show, #pwr-menu.show'
  );
}
/* Sama seperti di atas TAPI mengabaikan cover — dipakai saat kita perlu tahu
   apakah ada dialog yang muncul DI ATAS game yang sedang berjalan. */
function anyDialogOverGame() {
  return !!document.querySelector(
    '.pwr-overlay.show:not(.pwr-overlay-cover), #pwr-piece-modal.show, #pwr-reveal.show, #pwr-menu.show'
  );
}

/* Freeze game saat dialog/popup APA PUN terbuka.
   Ini kebocoran universal di 5 tema sebelumnya (piece-modal). */
function pauseIfNeeded() {
  var sc = currentScene();
  if (sc && sc.scene && !sc.scene.isPaused()) { try { sc.scene.pause(); } catch (e) {} }
}
function resumeIfPossible() {
  if (anyOverlayOpen()) return;
  var sc = currentScene();
  if (sc && sc.scene && sc.scene.isPaused()) { try { sc.scene.resume(); } catch (e) {} }
}
function currentScene() {
  if (!GAME || !GAME.scene) return null;
  try { return GAME.scene.getScene('GameScene'); } catch (e) { return null; }
}

/* ---- Toast (atas-tengah 18%) ---- */
var toastTimer = null;
/* =====================================================================
   FONT BITMAP DARI SPRITE SHEET
   ---------------------------------------------------------------------
   Pack menyertakan "Menu/Text/Text (White)" & "(Black)": 50 glyph 8x10.
   Urutannya sudah diperiksa satu per satu dengan merender tiap glyph
   jadi ASCII — BUKAN tebakan dari nama berkas:

       idx  0..25 = A..Z
       idx 26..29 = KOSONG (sel spasi di strip font)
       idx 30..39 = 0..9
       idx 40..44 = . , : ? !
       idx 45..46 = ( )

   Karakter yang tidak ada di strip (huruf kecil, aksen, emoji) dipetakan
   ke huruf besarnya; kalau tetap tidak ada, dilewati sebagai spasi.

   Kalau sheet belum diunggah, renderText() mengembalikan null dan
   pemanggil memakai teks HTML biasa — jadi tidak ada yang hilang. */
var FONT_GRP = 'Menu/Text/Text (White)';
/* Peta karakter -> indeks glyph. Ditulis sebagai OBJEK, bukan string
   berindeks: dgn string, spasi pengisi di posisi 26..29 ikut tercari
   oleh indexOf(' '), sehingga karakter SPASI salah dipetakan ke glyph
   kosong 26 alih-alih diperlakukan sebagai jarak antar kata. */
var FONT_MAP = (function () {
  var m = {}, i;
  for (i = 0; i < 26; i++) m[String.fromCharCode(65 + i)] = i;   /* A-Z -> 0..25 */
  /* 26..29 sengaja dilewati: sel kosong di strip font. */
  for (i = 0; i < 10; i++) m[String(i)] = 30 + i;                /* 0-9 -> 30..39 */
  /* 40..48 — bentuk tiap glyph sudah diperiksa satu per satu dgn
     merendernya jadi ASCII, jadi '+' dan '-' ini bukan tebakan. */
  var punct = '.,:?!()+-';
  for (i = 0; i < punct.length; i++) m[punct[i]] = 40 + i;
  return m;
})();
/* Urutan glyph 0..46 sebagai teks — dipakai uji & keterbacaan. */
var FONT_ORDER = (function () {
  var s = '', k, i;
  for (i = 0; i < 49; i++) {
    var ch = ' ';
    for (k in FONT_MAP) if (FONT_MAP[k] === i) { ch = k; break; }
    s += ch;
  }
  return s;
})();
var FONT_W = 8, FONT_H = 10;

function fontIndex(ch) {
  if (ch === ' ') return -1;              /* spasi = jarak, bukan glyph */
  var i = FONT_MAP[ch.toUpperCase()];
  return (typeof i === 'number') ? i : -1;
}

/* Ukuran teks dalam piksel sumber (sebelum diperbesar). */
function measureText(str, tracking) {
  tracking = tracking === undefined ? 1 : tracking;
  var n = 0;
  for (var i = 0; i < str.length; i++) n++;
  return { w: n * (FONT_W + tracking) - tracking, h: FONT_H };
}

/* Gambar teks ke sebuah kanvas baru memakai glyph dari sheet.
   Mengembalikan <canvas>, atau null kalau sheet belum siap. */
function renderText(str, scale, tracking) {
  var img = _assetImg.sheet;
  var grp = SHEET_MAP[FONT_GRP];
  if (!img || !grp || !grp.length) return null;
  scale = scale || 2;
  tracking = tracking === undefined ? 1 : tracking;

  var m = measureText(str, tracking);
  var t = newCanvas(m.w * scale, m.h * scale);
  if (!t.cx) return null;
  t.cx.imageSmoothingEnabled = false;

  var x = 0;
  for (var i = 0; i < str.length; i++) {
    var gi = fontIndex(str[i]);
    if (gi >= 0 && grp[gi]) {
      var fr = grp[gi];               /* [i, x, y, w, h] */
      try {
        t.cx.drawImage(img, fr[1], fr[2], fr[3], fr[4],
                       x * scale, 0, fr[3] * scale, fr[4] * scale);
      } catch (e) { return null; }
    }
    x += FONT_W + tracking;           /* spasi & glyph tak dikenal tetap maju */
  }
  return t.cv;
}

/* Apakah seluruh karakter pesan ada di strip font? Kalau ada satu saja
   yang tidak (emoji, ★, &, —), pesan itu HARUS dirender sebagai teks
   biasa — memaksakan font bitmap akan menghapus karakter itu diam-diam
   dan mengubah arti pesannya. */
function fontCanRender(str) {
  for (var i = 0; i < str.length; i++) {
    var c = str[i];
    if (c === ' ') continue;
    if (fontIndex(c) < 0) return false;
  }
  return true;
}

function toast(msg, kind, ms) {
  var el = document.getElementById('pwr-toast');
  if (!el) return;
  /* Font bitmap dipakai kalau SEMUA karakternya tersedia; kalau tidak,
     jatuh ke teks biasa. Sheet yang belum diunggah juga jatuh ke teks. */
  /* Font bitmap HANYA dipakai kalau pesan PENDEK cukup ditampilkan 2x
     (glyph 8x10 -> 16x20) tanpa meluber. Kalau pesan panjang, memaksa
     bitmap 1-baris berarti mengecilkannya jadi tak terbaca (dilaporkan
     user: "text ini kecil sekali") — untuk itu kita jatuh ke teks biasa
     yang BISA membungkus ke 2 baris dan sudah dibesarkan lewat CSS
     (clamp 15-20px, tebal). Jadi: pendek = bitmap tajam 2x; panjang =
     teks biasa yang membungkus & tetap besar. */
  var maxW = (el.clientWidth || 300) - 36;
  var fits2x = measureText(msg, 1).w * 2 <= maxW;
  var cv = (fontCanRender(msg) && fits2x) ? renderText(msg, 2, 1) : null;
  if (cv) {
    el.innerHTML = '';
    cv.className = 'pwr-toast-bmp';
    el.appendChild(cv);
  } else {
    el.textContent = msg;
  }
  el.className = 'pwr-toast show' + (kind === 'warn' ? ' is-warn' : kind === 'danger' ? ' is-danger' : '');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 3200);
  onCleanup(function () { if (toastTimer) clearTimeout(toastTimer); });
}

/* ---- Indikator kepingan ---- */
function rebuildIndicators() {
  if (!STORE) ensureBooted();
  var wrap = document.getElementById('pwr-pieces');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (var i = 0; i < INFOS.length; i++) {
    var key = INFOS[i];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pwr-piece' + (STORE.unlocked.indexOf(key) !== -1 ? ' is-unlocked' : '');
    b.setAttribute('data-key', key);
    b.setAttribute('title', sectionTitle(key));
    b.textContent = SECTION_ICON[key] || '💌';
    wrap.appendChild(b);
  }
  updatePieceCount();
}
function lightIndicator(key) {
  var el = document.querySelector('.pwr-piece[data-key="' + key + '"]');
  if (el) el.classList.add('is-unlocked');
  updatePieceCount();
}
function updatePieceCount() {
  if (!STORE) return;
  var c = document.getElementById('pwr-piece-count');
  var t = document.getElementById('pwr-piece-total');
  if (c) c.textContent = String(STORE.unlocked.length);
  if (t) t.textContent = String(INFOS.length);
  var openBtn = document.getElementById('pwr-btn-open');
  if (openBtn) {
    var can = STORE.unlocked.length >= INFOS.length || cheat.on;
    openBtn.disabled = !can;
    openBtn.classList.toggle('is-on', can);
  }
}

/* ---- Modal satu kepingan ----
   Hanya SATU clone ber-ID pada satu waktu: tutup reveal dulu. */
function openPieceModal(key) {
  if (!key) return;
  if (!STORE) ensureBooted();
  closeReveal();
  var src = document.getElementById('inv-source');
  var sec = src && src.querySelector('[data-info="' + key + '"]');
  var body = document.getElementById('pwr-piece-body');
  var title = document.getElementById('pwr-piece-title');
  var modal = document.getElementById('pwr-piece-modal');
  if (!sec || !body || !modal) return;

  body.innerHTML = '';
  var clone = sec.cloneNode(true);          /* 1. clone dulu (mewarisi data-pwrid) */
  body.appendChild(clone);                   /* 2. tempel ke DOM */
  applyHostIds(clone);                       /* 3. pasang id asli di clone */
  setSourceHostIds(false, body);             /* 4. matikan id di SEMUA tempat lain */
  hydrateImages(clone);
  syncRsvpBranchLocal(clone);

  if (title) title.textContent = sectionTitle(key);
  modal.classList.add('show');
  syncReadingMode();
  pauseIfNeeded();
}
function closePieceModal() {
  var modal = document.getElementById('pwr-piece-modal');
  var body = document.getElementById('pwr-piece-body');
  if (modal) modal.classList.remove('show');
  syncReadingMode();
  if (body) body.innerHTML = '';
  setSourceHostIds(true);                    /* kembalikan id ke source */
  resumeIfPossible();
}

/* ---- Reveal undangan lengkap ---- */
function revealFullInvitation() {
  /* Guard: tombol bisa diklik sebelum startWhenReady() selesai (host me-render
     HTML lebih dulu dari eksekusi JS). Tanpa ini -> TypeError STORE null. */
  if (!STORE) ensureBooted();
  if (STORE.unlocked.length < INFOS.length && !cheat.on) {
    toast('Kumpulkan semua kepingan dulu — atau tekan ★ untuk membuka langsung', 'warn', 4200);
    return;
  }
  closePieceModal();
  var src = document.getElementById('inv-source');
  var body = document.getElementById('pwr-reveal-body');
  var wrap = document.getElementById('pwr-reveal');
  if (!src || !body || !wrap) return;

  body.innerHTML = '';
  var secs = src.querySelectorAll('[data-info]');
  var frag = document.createDocumentFragment();
  for (var i = 0; i < secs.length; i++) frag.appendChild(secs[i].cloneNode(true));
  body.appendChild(frag);                    /* 1-2. clone + tempel */
  applyHostIds(body);                        /* 3. id asli di clone */
  setSourceHostIds(false, body);             /* 4. matikan id di SEMUA tempat lain */
  hydrateImages(body);
  syncRsvpBranchLocal(body);

  wrap.classList.add('show');
  syncReadingMode();
  body.scrollTop = 0;
  /* Tombol "kembali ke atas" mengikuti posisi scroll isi reveal.
     Dipasang sekali saja; body-nya elemen tetap, hanya isinya yang diganti. */
  if (!body.__pwrScrollBound) {
    body.addEventListener('scroll', syncScrollTopBtn, { passive: true });
    body.__pwrScrollBound = true;
    onCleanup(function () {
      try { body.removeEventListener('scroll', syncScrollTopBtn); } catch (e) {}
      body.__pwrScrollBound = false;
    });
  }
  syncScrollTopBtn();
  pauseIfNeeded();
}
function closeReveal() {
  var wrap = document.getElementById('pwr-reveal');
  var body = document.getElementById('pwr-reveal-body');
  if (wrap) wrap.classList.remove('show');
  if (body) body.innerHTML = '';
  syncReadingMode();                 /* kembali bermain -> FAB disembunyikan */
  var topBtn = document.getElementById('pwr-fab-top');
  if (topBtn) topBtn.style.display = 'none';
  setSourceHostIds(true);
  resumeIfPossible();
  /* Host bisa mengganti innerHTML saat state berubah -> canvas jadi detached.
     Cek & re-boot bila perlu (self-heal, bukan MutationObserver). */
  if (!gameStageAttached() && window.__pwrStarted) rebootGame();
}

/* =====================================================================
   MENU NAVIGASI SECTION (#btn-show-menu)
   ---------------------------------------------------------------------
   Daftar dibangun dari section yang BENAR-BENAR ada di #inv-source, jadi
   section yang dimatikan flag tidak pernah muncul sebagai menu mati.
   Memilih menu = buka reveal (kalau belum) lalu scroll ke section itu.
   ===================================================================== */
/* FAB (menu/QR/musik) hanya boleh terlihat saat tamu MEMBACA undangan,
   tidak saat bermain — di layar game ia menutupi HUD dan tombol lompat.
   Satu-satunya sumber kebenaran: kelas .pwr-reading di <body>, dibaca CSS.
   Dipanggil dari SETIAP jalur yang membuka/menutup undangan. */
function syncReadingMode() {
  var reading = !!document.querySelector('#pwr-reveal.show, #pwr-piece-modal.show');
  try { document.body.classList.toggle('pwr-reading', reading); } catch (e) {}
  /* ⚠️ PERLAKUAN TEMA GAME BERBEDA DARI TEMA NON-GAME.
       Tema non-game : musik menyala begitu undangan dibuka (satu layar).
       Tema game     : MULAI = masuk permainan, bukan membuka undangan —
                       di sana yang berbunyi hanya efek suara game.
                       Backsound baru menyala saat tamu menekan ikon
                       undangan 💌 (#pwr-btn-open di toolbar, atau
                       kepingan) yang membuka reveal/modal.
     Karena itu musik diikatkan ke MODE MEMBACA, bukan ke start game.
     Satu tempat saja supaya tak ada jalur buka/tutup yang terlewat —
     dulu modal kepingan menampilkan isi undangan tapi musiknya diam. */
  setMusic(reading);
  /* Saat tamu BENAR-BENAR membuka undangan, beri tahu host supaya FAB
     (menu/QR/musik) muncul. Aman dipanggil di sini: re-exec JS oleh host
     hanya membongkar-pasang, dan game memang sedang di-pause. */
  if (reading) notifyHostOpened();
}
/* Kelas menempel di <body> (di luar container tema), jadi WAJIB dibersihkan
   saat tema di-unmount — kalau tidak, FAB tema lain ikut terpengaruh. */
onCleanup(function () {
  try { document.body.classList.remove('pwr-reading'); } catch (e) {}
});

function buildMenuList() {
  var list = document.getElementById('pwr-menu-list');
  if (!list) return;
  var keys = scanSections();
  list.innerHTML = '';
  for (var i = 0; i < keys.length; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pwr-menu-item';
    b.setAttribute('data-goto', keys[i]);
    b.textContent = sectionTitle(keys[i]);
    list.appendChild(b);
  }
}
function openMenu() {
  var m = document.getElementById('pwr-menu');
  if (!m) return;
  buildMenuList();
  m.classList.add('show');
  m.setAttribute('aria-hidden', 'false');
  pauseIfNeeded();               /* menu = dialog -> game membeku */
}
function closeMenu() {
  var m = document.getElementById('pwr-menu');
  if (!m) return;
  m.classList.remove('show');
  m.setAttribute('aria-hidden', 'true');
  resumeIfPossible();
}
/* Lompat ke satu section. Reveal dibuka dulu bila belum tampil; kalau
   kepingan belum lengkap, revealFullInvitation() sendiri yang menolak
   (dan menampilkan toast), jadi aturan game tetap dihormati. */
function gotoSection(key) {
  closeMenu();
  var wrap = document.getElementById('pwr-reveal');
  if (!wrap || !wrap.classList.contains('show')) revealFullInvitation();
  if (!wrap || !wrap.classList.contains('show')) return;   /* ditolak: belum lengkap */
  var body = document.getElementById('pwr-reveal-body');
  var target = body && body.querySelector('[data-info="' + key + '"]');
  if (!target) return;
  try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  catch (e) { body.scrollTop = target.offsetTop; }
}

/* Tombol "kembali ke atas": hanya tampil saat isi reveal ter-scroll. */
function syncScrollTopBtn() {
  var btn = document.getElementById('pwr-fab-top');
  var body = document.getElementById('pwr-reveal-body');
  if (!btn) return;
  var on = !!body && body.scrollTop > 240;
  btn.style.display = on ? 'flex' : 'none';
}
function scrollRevealTop() {
  var body = document.getElementById('pwr-reveal-body');
  if (!body) return;
  try { body.scrollTo({ top: 0, behavior: 'smooth' }); }
  catch (e) { body.scrollTop = 0; }
}

/* ---- Picker kesulitan & stage (2 langkah: klik = pending, OK = commit) ---- */
function pickDiff(d) {
  if (!DIFF[d]) return;
  if (!STORE) ensureBooted();
  pendingDiff = d;
  var opts = document.querySelectorAll('.pwr-diff-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('is-sel', opts[i].getAttribute('data-diff') === d);
  }
  /* Di cover, kesulitan langsung dipakai saat MULAI (tak perlu OK terpisah) */
  if (!isOverlayVisible('stage')) { STORE.diff = d; saveStore(); }
}
function pickStage(idx) {
  pendingStage = idx;
  var cells = document.querySelectorAll('.pwr-stage-cell');
  for (var i = 0; i < cells.length; i++) {
    cells[i].classList.toggle('is-sel', parseInt(cells[i].getAttribute('data-stage'), 10) === idx);
  }
}
function openStageSelect() {
  if (!STORE) ensureBooted();
  var grid = document.getElementById('pwr-stage-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (var i = 0; i < STAGES.length; i++) {
    var locked = !cheat.on && i > STORE.maxStage;
    var cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'pwr-stage-cell' + (locked ? ' is-locked' : '') +
                     (i === (runState ? runState.stage : 0) ? ' is-sel' : '');
    cell.setAttribute('data-stage', String(i));
    cell.innerHTML = '<b>' + (i + 1) + '</b><span>' + (locked ? '🔒' : STAGES[i].short) + '</span>';
    grid.appendChild(cell);
  }
  pendingStage = runState ? runState.stage : 0;
  pendingDiff = STORE.diff;
  var opts = document.querySelectorAll('#pwr-ov-stage .pwr-diff-opt');
  for (var j = 0; j < opts.length; j++) {
    opts[j].classList.toggle('is-sel', opts[j].getAttribute('data-diff') === STORE.diff);
  }
  showOverlay('stage');
}
function commitStageSelect() {
  if (pendingDiff && DIFF[pendingDiff]) STORE.diff = pendingDiff;
  saveStore();
  var target = (pendingStage == null) ? (runState ? runState.stage : 0) : pendingStage;
  hideOverlay('stage');
  startRun(target);
}

/* ---- Cover ---- */

/* Beri tahu host "undangan sudah dibuka".
   Host HANYA men-set isOpened lewat klik pada #btn-open-invitation; selama
   isOpened false ia memaksa `.is-closed #theme-fab-container{display:none}`
   sehingga floating button (menu/QR/musik) tak pernah terlihat.
   Tombol MULAI sudah memakai id itu, jadi jalurnya alami. Untuk jalur LAIN
   (skip / celebration) kita klik tombolnya secara programatik. Idempoten:
   host boleh menerima ini lebih dari sekali. */
function notifyHostOpened() {
  if (window.__pwrHostOpened) return;
  window.__pwrHostOpened = true;
  /* Elemen tersembunyi khusus untuk ini — bukan tombol MULAI. */
  var btn = document.getElementById('btn-open-invitation');
  if (btn) { try { btn.click(); } catch (e) {} }
}

function startFromCover() {
  if (!STORE) ensureBooted();
  hideOverlay('cover');
  window.__pwrStarted = true;      /* JANGAN di-reset di cleanup */
  startRun(0);
  /* ⚠️ JANGAN memutar backsound di sini. Backsound tenant hanya milik
     HALAMAN UNDANGAN; saat bermain yang berbunyi cuma efek suara game.
     Aturan tunggalnya ada di syncReadingMode(); baris ini pengaman
     eksplisit untuk jalur masuk game (cover -> main), yang tidak
     melewati reveal/modal sehingga syncReadingMode tak terpanggil. */
  setMusic(false);
}
function skipToInvitation() {
  if (!STORE) ensureBooted();
  /* Tamu yang tak ingin bermain: buka semua, langsung ke undangan. */
  for (var i = 0; i < INFOS.length; i++) unlockInfo(INFOS[i], true);
  hideOverlay('cover');
  window.__pwrStarted = true;
  notifyHostOpened();              /* FAB host harus ikut muncul di jalur ini */
  revealFullInvitation();
}


/* =====================================================================
   [5b] KEPINGAN UNDANGAN & CELEBRATION
   ===================================================================== */

/* Ambil kepingan: HANYA nyalakan ikon + toast + SFX + partikel.
   JANGAN auto-open modal — itu memutus gameplay & terasa memaksa. */
function unlockInfo(key, silent) {
  if (!STORE) ensureBooted();
  if (!key || STORE.unlocked.indexOf(key) !== -1) return false;   /* idempoten */
  STORE.unlocked.push(key);
  saveStore();
  lightIndicator(key);
  if (!silent) {
    toast('💌 Kepingan didapat: ' + sectionTitle(key), 'ok', 2800);
    sfx('piece');
  }
  if (STORE.unlocked.length >= INFOS.length) announceAllCollected();
  return true;
}

/* Pemicu A: kepingan terakhir didapat (bisa terjadi SEBELUM game tamat) */
function announceAllCollected() {
  if (STORE.announcedAll) return;         /* guard sekali-tampil, di-persist */
  STORE.announcedAll = true;
  saveStore();

  var sc = currentScene();
  if (sc && sc.cameras && sc.cameras.main) {
    sc.cameras.main.flash(300, 255, 255, 255);
    sc.cameras.main.shake(400, 0.012);
  }
  sfx('fanfare');
  fireworks();
  toast('✨ Semua kepingan terkumpul!', 'ok', 4000);

  /* Beat ~4.5 detik SEBELUM dialog — beri momen bernapas */
  var t = setTimeout(function () {
    showCelebrate(
      '💌',
      'SEMUA KEPINGAN TERKUMPUL!',
      'Undangan ' + (val('groom_nickname') || 'kami') + ' & ' +
      (val('bride_nickname') || '') + ' kini lengkap dan siap dibuka.'
    );
  }, 4500);
  onCleanup(function () { clearTimeout(t); });
}

/* Pemicu B: game tamat (boss dikalahkan) */
function announceCompleted() {
  if (STORE.completed) return;            /* guard sekali-tampil, di-persist */
  STORE.completed = true;
  /* Menang = SEMUA kepingan terbuka (undangan tak pernah terkunci) */
  for (var i = 0; i < INFOS.length; i++) {
    if (STORE.unlocked.indexOf(INFOS[i]) === -1) STORE.unlocked.push(INFOS[i]);
  }
  saveStore();
  rebuildIndicators();

  var t = setTimeout(function () {
    showCelebrate(
      '💒',
      'HAPPILY EVER AFTER',
      (val('groom_nickname') || 'Mempelai') + ' & ' + (val('bride_nickname') || '') +
      ' akhirnya bersatu di pelaminan! Skor akhir: ' +
      String(runState ? runState.score : 0) + '.'
    );
  }, 4500);
  onCleanup(function () { clearTimeout(t); });
}

function showCelebrate(emoji, title, text) {
  var e = document.getElementById('pwr-celebrate-emoji');
  var t = document.getElementById('pwr-celebrate-title');
  var x = document.getElementById('pwr-celebrate-text');
  if (e) e.textContent = emoji;
  if (t) t.textContent = title;
  if (x) x.textContent = text;
  showOverlay('celebrate');
}

function fireworks() {
  var sc = currentScene();
  if (!sc || !sc.add || !sc.textures || !sc.textures.exists('t_spark')) return;
  var cam = sc.cameras.main;
  for (var i = 0; i < 5; i++) {
    (function (n) {
      var d = sc.time.delayedCall(n * 320, function () {
        if (!sc.scene || !sc.add) return;
        var px = cam.scrollX + 90 + Math.random() * (BW - 180);
        var py = 120 + Math.random() * 220;
        var em = sc.add.particles(px, py, 't_spark', {
          speed: { min: 60, max: 200 }, lifespan: 900, quantity: 18,
          scale: { start: 1, end: 0 }, blendMode: 'ADD',
          tint: [0xf0c020, 0xe5342a, 0x2e9e46], emitting: false
        });
        em.setDepth(60);
        em.explode(18);
        sc.time.delayedCall(1100, function () { try { em.destroy(); } catch (e) {} });
      });
    })(i);
  }
}


/* =====================================================================
   [5c] CHEAT & RESET
   ===================================================================== */
function toggleCheat() {
  if (!STORE) ensureBooted();
  cheat.on = !cheat.on;
  var btn = document.getElementById('pwr-btn-cheat');
  if (btn) btn.classList.toggle('is-on', cheat.on);

  if (cheat.on) {
    /* Ranah UNDANGAN: semua kepingan terbuka */
    for (var i = 0; i < INFOS.length; i++) unlockInfo(INFOS[i], i > 0);
    /* Ranah GAME: kebal + semua stage terbuka */
    var sc = currentScene();
    if (sc && sc.player) sc.player.invincible = true;
    toast('★ Mode santai: kebal, semua stage & undangan terbuka', 'ok', 3600);
  } else {
    var sc2 = currentScene();
    if (sc2 && sc2.player) sc2.player.invincible = false;
    toast('Mode normal kembali aktif', null, 2400);
    /* Kepingan yang sudah terbuka TETAP terbuka (tidak dicabut) */
  }
  updatePieceCount();
  /* cheat.on SENGAJA tidak di-persist: satu HP sering dipakai banyak tamu. */
}

/* RESET = PENUH: wipe storage (incl. kesulitan) + destroy game + kembali ke cover */
function resetGame() {
  if (!STORE) ensureBooted();
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  STORE = defaults();
  saveStore();

  if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
  window.__pwrGame = null;
  runState = freshRun();
  cheat.on = false;

  var cb = document.getElementById('pwr-btn-cheat');
  if (cb) cb.classList.remove('is-on');

  INFOS = scanSections();
  QUOTA = scaleQuota(INFOS.length);
  rebuildIndicators();

  /* Reset picker kesulitan ke default */
  var opts = document.querySelectorAll('.pwr-diff-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('is-sel', opts[i].getAttribute('data-diff') === STORE.diff);
  }

  hideOverlay('reset');
  hideOverlay('stage');
  hideOverlay('celebrate');
  closePieceModal();
  closeReveal();
  updateHud();
  showOverlay('cover');
  toast('Progres direset. Silakan mulai lagi.', null, 2800);
}


/* =====================================================================
   [6] PHASER BOOT
   ===================================================================== */
function showError(msg) {
  var el = document.getElementById('pwr-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideError() {
  var el = document.getElementById('pwr-error');
  if (el) el.style.display = 'none';
}

function ensurePhaser(cb) {
  if (window.Phaser && window.Phaser.VERSION) return cb();
  var existing = document.getElementById('pwr-phaser-lib');
  if (existing) {
    existing.addEventListener('load', cb);
    return;
  }
  var s = document.createElement('script');
  s.id = 'pwr-phaser-lib';
  s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
  s.onload = function () { hideError(); cb(); };
  s.onerror = function () {
    showError('Gagal memuat mesin game. Periksa koneksi internet, lalu muat ulang halaman. Undangan tetap bisa dibuka lewat tombol 💌.');
  };
  document.head.appendChild(s);
}

function gameStageAttached() {
  var c = GAME && GAME.canvas;
  return !!(c && document.contains(c));
}

/* Muat semua berkas sprite DULU, baru boot Phaser.
   Alasan: create() berjalan sinkron dan langsung memanggil buildTextures(),
   sedangkan <img> dimuat async. Kalau tidak ditunggu di sini, frame pertama
   selalu memakai art prosedural lalu berganti mendadak setelah berkas
   selesai dimuat. loadAssets() punya timeout 8 detik dan SELALU memanggil
   callback, jadi game TETAP boot walau sebagian/seluruh berkas gagal. */
function bootGame() {
  if (!_assetTried) { loadAssets(function () { bootGameNow(); }); return; }
  bootGameNow();
}

function bootGameNow() {
  var parent = document.getElementById('pwr-stage');
  if (!parent) return;
  if (!window.Phaser || !window.Phaser.Scene) return;   /* Phaser belum siap */
  linkScene();                                          /* graft prototype sekarang */

  /* Ukur PARENT, jangan baca scale.width/height di create() (bisa 0 -> blank) */
  var r = parent.getBoundingClientRect();
  BW = Math.max(320, Math.round(r.width))  || 540;
  BH = Math.max(480, Math.round(r.height)) || 960;

  if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }

  GAME = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parent,
    width: BW, height: BH,
    pixelArt: true,
    roundPixels: true,
    /* Warna dasar canvas = langit stage 1. Kalau dibiarkan biru NES lama, akan
       terlihat kilatan biru sesaat sebelum backdrop tergambar di stage senja. */
    backgroundColor: '#cfe3dd',
    fps: { target: 60, forceSetTimeOut: false },
    physics: { default: 'arcade', arcade: { gravity: { y: PHYS.GRAVITY_Y }, debug: false } },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [GameScene]
  });
  window.__pwrGame = GAME;
  onCleanup(function () {
    if (GAME) { try { GAME.destroy(true); } catch (e) {} }
    GAME = null; window.__pwrGame = null;
  });
}

function rebootGame() {
  bootGame();
  var sc = currentScene();
  if (sc && runState) sc.scene.restart({ stage: runState.stage });
}

function startRun(stageIdx) {
  if (!STORE) ensureBooted();
  runState = runState || freshRun();
  runState.stage = stageIdx || 0;
  runState.started = true;
  if (!GAME || !gameStageAttached()) bootGame();
  var sc = currentScene();
  if (sc) { try { sc.scene.restart({ stage: runState.stage }); } catch (e) {} }
  updateHud();
}


/* =====================================================================
   [7] SISTEM GAMBAR — PIXEL ART (REVISI 3)
   =====================================================================
   ⚠️ DUA KOREKSI dari uji coba putaran 3:

   A. "MASIH KURANG PIXEL" → pikselnya terlalu KECIL & terlalu BANYAK.
      Revisi 2: grid 15x20 @ PX=3 = 45x60 px → detail halus, terbaca "ilustrasi".
      Sprite retro asli justru grid KECIL dengan piksel BESAR:
        Mario NES  = 16x16 grid
        Sonic      = 24x32 grid
      Revisi 3: grid 12x16 @ PX=4 = 48x64 px. Ukuran layar mirip, tapi
      JUMLAH piksel jauh lebih sedikit → tiap piksel terlihat besar & kotak.

   B. "KURANGI BORDER HITAM" → outline penuh keliling adalah kesalahan.
      Diukur: 41% piksel sprite revisi 2 adalah outline 'I'. Sprite NES/SNES
      TIDAK punya garis hitam keliling — kedalaman datang dari KONTRAS WARNA
      dan shadow di sisi bawah/kanan saja.
      Revisi 3: outline hanya dipakai untuk DETAIL (mata, mulut, nat bata),
      bukan sebagai bingkai. Target <10% piksel gelap.

   Aturan menggambar sekarang:
     - JANGAN bingkai bentuk dengan 'I'.
     - Bedakan bentuk dari latar lewat warna JENUH & kontras nilai.
     - Volume dibuat dengan 2-3 tone: terang (kiri-atas), base, gelap (kanan-bawah).
     - 'I' hanya untuk fitur: pupil, garis mulut, nat, lubang.
   ===================================================================== */

var PX  = 4;   /* piksel besar untuk sprite — naik dari 3 */
var TPX = 4;   /* tile 32px = grid 8x8 @ PX 4 — piksel tile ikut diperbesar */
/* HPX = separuh PX. Dipakai art-map DETAIL ber-grid 2x (mis. 24x32) supaya
   ukuran akhir di layar identik dengan art-map lama 12x16 @ PX.
   Referensi (Ape Escape) memakai ~24x32 dengan outline + 4 nilai warna;
   itu MUSTAHIL di 12x16, jadi kerapatan grid harus naik, bukan skalanya. */
var HPX = 2;

function paintArt(g, rows, pal, px, ox, oy) {
  px = px || PX; ox = ox || 0; oy = oy || 0;
  for (var y = 0; y < rows.length; y++) {
    var line = rows[y];
    var runStart = -1, runKey = null;
    for (var x = 0; x <= line.length; x++) {
      var ch = x < line.length ? line.charAt(x) : null;
      var col = (ch && ch !== '.' && ch !== ' ') ? pal[ch] : undefined;
      if (col !== runKey) {
        if (runKey !== undefined && runKey !== null && runStart >= 0) {
          g.fillStyle(runKey, 1);
          g.fillRect(ox + runStart * px, oy + y * px, (x - runStart) * px, px);
        }
        runStart = x; runKey = col;
      }
    }
  }
}
function artW(rows, px) {
  var m = 0;
  for (var i = 0; i < rows.length; i++) m = Math.max(m, rows[i].length);
  return m * (px || PX);
}
function artH(rows, px) { return rows.length * (px || PX); }

function row(w, fn) { var s = ''; for (var i = 0; i < w; i++) s += fn(i); return s; }
function fill(w, ch) { return row(w, function () { return ch; }); }

/* ---------------------------------------------------------------
   PALET — jenuh, kontras nilai kuat supaya bentuk terbaca TANPA outline.
   --------------------------------------------------------------- */
var CP = {
  I: 0x101018,   /* HANYA untuk detail: pupil, mulut, nat. BUKAN bingkai. */
  K: 0x2c2038,

  /* mempelai — warna DIREDAM agar menyatu dengan latar berkabut.
     Versi lama memakai biru/merah jenuh (#2f3f92 / #f02a5e) yang meloncat keluar
     dari palet analog dan membuat karakter terlihat seperti stiker yang
     ditempel. Di referensi, karakter justru lebih gelap & kalem daripada
     lingkungannya — siluetnya yang terbaca, bukan warnanya yang berteriak. */
  J: 0x2a3139,   /* jas hitam Sanji  */
  j: 0x434c58,   /* jas terang (lipatan/kerah) */
  k: 0x171c22,   /* jas gelap        */
  L: 0x2a3139,   /* celana — sewarna jas (setelan) */
  l: 0x434c58,   /* celana terang    */
  T: 0xa9632b,   /* dasi coklat — dicerahkan agar terpisah dari jas hitam */
  W: 0xffffff,
  w: 0xc6c2d8,
  S: 0xffcc9c,   /* kulit            */
  s: 0xd4915e,   /* kulit gelap      */
  H: 0xe4b91e,   /* rambut pirang Sanji */
  h: 0xf5da5c,   /* pirang terang (highlight) */

  /* --- aksen khas Sanji --- */
  X: 0xf0d64a,   /* kemeja kuning    */
  o: 0xe0a814,   /* kancing emas / bayangan kemeja */
  f: 0x8a6a2c,   /* jenggot/goatee & alis (pirang gelap) */
  '#':0xf4f0e0,  /* batang rokok     */
  '*':0xff7a3c,  /* bara rokok       */

  G: 0xfff2f8,   /* gaun             */
  g: 0xe3bcd4,

  /* =================================================================
     RAMP DETAIL (revisi "ala Ape Escape"): tiap material sekarang punya
     4-5 nilai + SATU warna garis luar. Referensi 16-bit yang bagus selalu
     punya (a) outline gelap keliling, (b) minimal 3 nilai isi, (c) 1 sorot
     nyaris putih. Dengan hanya 2 nilai (versi lama) sprite terlihat datar
     seperti clip-art, sekeras apa pun bentuknya digambar.
     Huruf sengaja BARU supaya art-map lama tidak berubah artinya.
     ================================================================= */
  /* OUTLINE universal — hampir hitam, sedikit ungu.
     CATATAN: JANGAN pakai huruf 'Q' di sini; 'Q' sudah dipakai palet
     lingkungan (0xffc000, emas) di bawah, dan objek literal JS memakai
     definisi TERAKHIR — outline akan berubah jadi kuning menyala. */
  ',': 0x0d0b14,

  /* kulit: bayangan -> dasar -> terang -> sorot */
  '1': 0xa8663a, '2': 0xd89a68, '3': 0xffcc9c, '4': 0xffe6cc,
  /* rambut pirang Sanji */
  '5': 0x8a6a12, '6': 0xc9a018, '7': 0xe4b91e, '8': 0xf7e06a,
  /* jas hitam */
  '9': 0x0f1318, '0': 0x1e242c, '!': 0x2a3139, '@': 0x3f4a58,
  /* kemeja kuning */
  '$': 0xb8912a, '%': 0xdcb733, '^': 0xf0d64a, '&': 0xfaee9a,
  /* biru marinir / kulit Arlong */
  '(': 0x14406e, ')': 0x1f66a8, '[': 0x3c9ad8, ']': 0x8fd4f2,
  /* merah (cangkang Den Den, aksen) */
  '{': 0x7a1018, '}': 0xb81c28, '<': 0xe83c48, '>': 0xff8a90,
  /* putih/abu (kemeja marinir, layar, awan) */
  '=': 0x8f97a8, '+': 0xb9c0cd, '_': 0xdde3ec, '~': 0xffffff,
  /* coklat kayu (tong, ushanka, tiang) */
  ';': 0x4a2c14, ':': 0x7a4a24, '?': 0xa9632b, '/': 0xd08a4e,

  /* musuh — warna jenuh, nilai kontras */
  R: 0xe81c30,  r: 0xff6070,  e: 0x9c1020,
  P: 0xf060d0,  p: 0xffa8f0,  q: 0x9c3080,
  N: 0x40e060,  n: 0x1c9440,
  U: 0xa040f0,  u: 0xd8a0ff,
  B: 0xff4080,  b: 0xffa0c0,
  C: 0x28a0f0,  c: 0x78d0ff,

  Y: 0xffcc00,  y: 0xfff8a0,  O: 0xc08018,

  /* lingkungan */
  A: 0x3cc030,  a: 0x74f858,  z: 0x1c8020,
  D: 0xc87030,  d: 0xf0a058,  E: 0x804018,
  M: 0xe06028,  m: 0xff9c60,  x: 0x983010,
  V: 0x1cc01c,  v: 0x60ff60,  Z: 0x0c7808,
  Q: 0xffc000,
  F: 0x48e8d8
};

/* =====================================================================
   SPRITE — grid KECIL, piksel BESAR, TANPA bingkai hitam
   ===================================================================== */

/* ---- MEMPELAI PRIA "SANJI" — 12 x 16 (ala Mario 16x16) ----
   Riset karakter (One Piece Wiki / Wikipedia) → ciri yang WAJIB terbaca
   walau cuma 12x16 piksel. Diurut dari yang paling mudah dikenali:
     1. Rambut PIRANG yang menutup SATU mata (pra-timeskip: mata kiri).
        Di grid sekecil ini, poni miring menutup separuh wajah = siluet
        paling khas; itu sebabnya wajahnya sengaja tidak simetris.
     2. ALIS SPIRAL — fitur nomor satu Sanji. Mustahil menggambar spiral
        utuh dalam 1 piksel, jadi dipakai "ekor" alis yang mencuat ke
        samping (2 px 'f') di atas mata yang TERLIHAT: itu bacaan spiral
        yang paling jujur pada resolusi ini.
     3. GOATEE gelap di dagu (dia berjenggot setelah timeskip).
     4. ROKOK — 2 px putih + 1 px bara oranye di sudut mulut. Aksen
        terkecil tapi langsung "Sanji". Hilang saat pose 'hurt'
        (rokoknya jatuh saat kena pukul — sekalian jadi feedback visual).
     5. Setelan HITAM double-breasted + kemeja KUNING + dasi COKLAT.
   Tetap 12x16 persis seperti sprite sebelumnya supaya hitbox, offset
   fisika, dan seluruh frame animasi tidak perlu diubah. */
function groomArt(pose) {
  /* ---- KAKI (12 baris) — Black Leg: tungkai PANJANG (ciri Sanji) ----
     Urutan tiap tungkai: paha -> lutut -> betis -> sepatu hitam mengkilap.
     '@' dipakai sebagai sorot lipatan celana di sisi kena cahaya. */
  var legs;
  if (pose === 'run1') legs = [
    '....,!!!!,..,!!!!,......',
    '....,!@00,..,00@!,......',
    '....,!@0,....,0@!,......',
    '...,!@0,......,0@!,.....',
    '...,!@0,......,0@!,.....',
    '..,!@0,........,0@!,....',
    '..,!00,........,00!,....',
    '..,00,..........,00,....',
    '.,,00,,........,,00,,...',
    '.,9999,........,9999,...',
    '.,9~99,........,99~9,...',
    '.,,,,,,........,,,,,,...'
  ];
  else if (pose === 'run2') legs = [
    '.....,!!!!!!!!,.........',
    '.....,!@0000@!,.........',
    '.....,!@0..0@!,.........',
    '.....,!@0..0@!,.........',
    '....,!@0,..,0@!,........',
    '....,!@0,..,0@!,........',
    '....,!00,..,00!,........',
    '....,00,....,00,........',
    '...,,00,,..,,00,,.......',
    '...,9999,..,9999,.......',
    '...,9~99,..,99~9,.......',
    '...,,,,,,..,,,,,,.......'
  ];
  else if (pose === 'run3') legs = [
    '...,!!!!,......,!!!!,...',
    '...,!@00,......,00@!,...',
    '..,!@0,..........,0@!,..',
    '..,!@0,..........,0@!,..',
    '.,!@0,............,0@!,.',
    '.,!@0,............,0@!,.',
    ',!00,..............,00!,',
    ',00,................,00,',
    ',00,,..............,,00,',
    ',9999,............,9999,',
    ',9~99,............,99~9,',
    ',,,,,,............,,,,,,'
  ];
  else if (pose === 'jump' || pose === 'fall') legs = [
    '....,!!!!,..,!!!!,......',
    '....,!@00,..,00@!,......',
    '....,!@0,....,0@!,......',
    '....,!@0,....,0@!,......',
    '....,!@0,....,0@!,......',
    '....,!@0,....,0@!,......',
    '....,!00,....,00!,......',
    '....,00,......,00,......',
    '...,,00,,....,,00,,.....',
    '...,9999,....,9999,.....',
    '...,9~99,....,99~9,.....',
    '...,,,,,,....,,,,,,.....'
  ];
  else if (pose === 'idle2') legs = [
    '.....,!!!!!!!!,.........',
    '.....,!@0000@!,.........',
    '.....,!@0000@!,.........',
    '.....,!@0,,0@!,.........',
    '.....,!@0,,0@!,.........',
    '....,!@0,..,0@!,........',
    '....,!00,..,00!,........',
    '....,00,....,00,........',
    '...,,00,,..,,00,,.......',
    '...,9999,..,9999,.......',
    '...,9~99,..,99~9,.......',
    '...,,,,,,..,,,,,,.......'
  ];
  else legs = [   /* idle / run0 */
    '.....,!!!!!!!!,.........',
    '.....,!@0000@!,.........',
    '.....,!@0000@!,.........',
    '.....,!@0,,0@!,.........',
    '.....,!@0,,0@!,.........',
    '.....,!@0,,0@!,.........',
    '.....,!00,,00!,.........',
    '.....,00,..,00,.........',
    '....,,00,..,00,,........',
    '....,9999,,9999,........',
    '....,9~99,,99~9,........',
    '....,,,,,,,,,,,,........'
  ];

  var up = (pose === 'jump' || pose === 'fall');
  var hurt = (pose === 'hurt');

  /* ---- LENGAN + DADA (6 baris) ----
     Dada: klep jas hitam double-breasted mengapit kemeja kuning + dasi. */
  /* Lengan = 2 baris terakhir torso (pinggang + tangan).
     Saat melompat, kedua tangan terangkat ke atas. */
  var arms = up ? [
    ',33,.,!0!^:^!0!,.,33,...',
    ',,,,.,!00!%!00!,.,,,,...'
  ] : [
    '.,!@!,!0!^:^!0!,,!@!,...',
    '.,332,,!00!%!00!,,233,..'
  ];

  /* ---- KEPALA (18 baris) ----
     Riset One Piece: poni pirang menutup SATU mata, ALIS SPIRAL, goatee,
     dan rokok. Di 24px lebar, spiral alis akhirnya bisa digambar sebagai
     lengkung 3px sungguhan (di 12px dulu cuma bisa 'ekor' 2px). */
  /* Proporsi: kepala 12 baris, badan+lengan 6, kaki 8, sisa 6 untuk bahu.
     Kepala 18 baris (versi pertama) membuat sosoknya jadi bayi berkepala
     besar — di referensi kepala kira-kira 1/3 tinggi total, bukan 1/2. */
  var eyeL = hurt ? ',4,' : ',3,';
  /* Mata: pupil gelap + 1px kilau putih. Alis spiral di baris atasnya. */
  /* Mata: 1px pupil gelap + 1px kilau putih TEPAT di sebelahnya.
     Sisa baris HARUS kulit — versi sebelumnya menaburkan outline ',' di
     dalam wajah sehingga alis/mata/hidung menyatu jadi coreng hitam. */
  /* Mata = 1 px pupil ',' + 1 px kilau '~' menempel, SISANYA kulit.
     Jangan mengapit pupil dengan outline (',3,~,') — pada 1 px per fitur,
     outline di kedua sisi menyatu jadi pita hitam melintang, dan itulah
     yang membuat wajah versi sebelumnya seperti bercoreng. */
  var eyeRow = hurt
    ? '..,56773,1~33332,.......'
    : '..,56773,~333332,.......';
  var cig = hurt ? '.........' : '..,##*,..';
  /* Mulut cukup 2 px gelap; 3 px membuatnya menganga seperti luka. */
  var mouthRow = hurt
    ? '..,5673,,2333,,.........'
    : '..,5673,,2333,,' + cig;

  /* Kepala dipadatkan jadi 12 baris (dari 16). Di 32 baris total, kepala
     16 baris = setengah tinggi badan -> terbaca chibi/bayi. Referensi
     memakai kira-kira 1/3, jadi 11-12 baris adalah target yang benar;
     4 baris yang dihemat dialihkan ke torso supaya sosoknya tegap. */
  return [
    /* ---- KEPALA (12 baris) ---- */
    '......,,,,,,,,..........',   /* garis luar rambut */
    '.....,56777776,.........',
    '....,5677888876,........',   /* sorot ubun-ubun */
    '....,567788887,,........',
    '...,567773333332,.......',   /* batas poni -> dahi */
    '...,5677733333332,......',   /* ALIS: ekor '7' mencuat = bacaan spiral */
    eyeRow,                        /* MATA (pupil + kilau) */
    '..,56773332233332,......',   /* hidung (bayangan '2') */
    mouthRow,                      /* MULUT + ROKOK */
    '..,5673333::33332,......',   /* GOATEE */
    '...,5673333333332,......',
    '....,,1333333332,.......',   /* rahang */
    /* ---- LEHER + BAHU (6 baris) — torso lebih panjang ---- */
    '......,12333332,........',
    '.....,,!!!!!!!!,,.......',   /* kerah jas */
    '....,!@!!!^:^!!!@!,.....',   /* bahu + kemeja kuning + dasi 1px */
    '....,!@!!!^:^!!!@!,.....',
    '....,!@!!!^:^!!!@!,.....',
    '....,!0!!!^%^!!!0!,.....'
  ].concat(arms).concat(legs);
}

/* ---- MEMPELAI WANITA — 12 x 16 ---- */
function brideArt() {
  return [
    '....GGGG....',
    '...GGGGGG...',
    '..GGSSSSGG..',
    '..GSSSSSSG..',
    '..GSISSISG..',
    '..GSSSSSSG..',
    '...SSIISS...',
    '....SSSS....',
    '...WWWWWW...',
    '..WWWWWWWW..',
    '.WWWWWWWWWT.',
    '.WWWWWWWWWT.',
    'WWWWWWWWWWWW',
    'WWWWWWWWWWWW',
    'WWWWWWWWWWWW',
    'wwwwwwwwwwww'
  ];
}

/* ---- E1 PRAJURIT MARINIR — 10 x 8 ----
   Riset: seragam marinir standar = kemeja PUTIH lengan pendek, dasi/scarf
   BIRU, celana biru tua, dan TOPI PUTIH bertuliskan MARINE. Pada 10x8 yang
   terbaca cuma 3 hal, jadi itu yang ditonjolkan:
     topi putih lebar -> badan putih -> celana biru tua.
   Marinir adalah musuh paling generik & paling sering muncul di One Piece,
   jadi pas jadi musuh dasar yang hadir di SEMUA stage. */
function kepikArt(frame) {
  /* 20x16 (2x grid, HPX) — cukup ruang untuk outline + 4 nilai warna.
     Kanon seragam marinir: topi PUTIH bertulis MARINE, kemeja putih,
     scarf BIRU, celana biru tua. */
  var legs = frame
    ? ['...,((,....,((,.....',
       '...,))!,..,!)),.....',
       '..,,((,,..,,((,,....',
       '..,9999,..,9999,....']
    : ['....,((,,((,........',
       '....,))!,!)),.......',
       '...,,((,,((,,.......',
       '...,9999,9999,......'];
  return [
    '.....,,,,,,,,,......',   /* garis luar topi */
    '....,_~~~~~~~_,.....',   /* topi putih + sorot */
    '....,=_______=,.....',
    '....,(((((((((,.....',   /* pita biru topi */
    '.....,23333332,.....',   /* dahi */
    '.....,3,~33,~3,.....',   /* MATA (pupil + kilau) */
    '.....,33333333,.....',
    '.....,332,,233,.....',   /* mulut */
    '....,,_~~~~~_,,.....',   /* kerah kemeja putih */
    '...,_~~~~~~~~~_,....',
    '...,_~,(((((,~_,....',   /* scarf biru */
    '...,_~~~~~~~~~_,....',
    '...,=_________=,....',
    '...,(((((((((((,....',   /* celana biru tua */
    '...,)(((((((((),....',
    '....,,,,,,,,,,,.....'
  ].concat(legs);
}

/* ---- E2 SIPUT — 11 x 10 ---- */
function siputArt(mode) {
  /* Cangkang = tempurung telepon: badan MERAH dengan bintik gelap dan
     lingkaran pemutar (dial) di tengah — itu ciri Den Den Mushi. */
  if (mode === 'shell') return [
    '...eeeee...',
    '..eRRRRRe..',
    '.eRRWWWRRe.',
    'eRRWeeeWRRe',
    'eRWeRRReWRe',   /* dial telepon */
    'eRRWeeeWRRe',
    'eRRRWWWRRRe',
    '.eRRRRRRRe.',
    '..eeeeeee..',
    '...KKKKK...'
  ];
  /* Berjalan: badan siput KUNING-krem (khas Den Den Mushi) + 2 tangkai mata
     mencuat ke kiri; cangkang merah bertengger di punggung. */
  return [
    'I....eeee..',
    'I..eeRRRRe.',
    'II.eRWeeWRe',
    'YY.eRWeRRWe',
    'YYYeRRWWWRe',
    'YYYYeRRRRe.',
    'YYYYYeeee..',
    'YYYYYYYYY..',
    'yyyyyyyyy..',
    '...........'
  ];
}

/* ---- E3 NEWS COO — 11 x 9 ----
   Burung camar pengantar koran; musuh TERBANG paling ikonik di One Piece
   (muncul di hampir semua arc). Badan putih, paruh & kaki kuning, ujung
   sayap gelap, membawa gulungan koran putih. 3 frame = kepak sayap. */
function kupuArt(frame) {
  if (frame === 0) return [   /* sayap terangkat penuh */
    'kW.......Wk',
    'WWW.....WWW',
    '.WWW.W.WWW.',
    '..WWWWWWW..',
    '..WWWIWWW..',   /* mata */
    '...WWWWWY..',   /* paruh kuning */
    '...WWWWW...',
    '....WWW....',
    '....Y.Y....'    /* kaki */
  ];
  if (frame === 1) return [   /* sayap mendatar */
    '...........',
    'kWW.....WWk',
    'WWWW.W.WWWW',
    '..WWWWWWW..',
    '..WWWIWWW..',
    '...WWWWWY..',
    '...WWWWW...',
    '....WWW....',
    '....Y.Y....'
  ];
  return [                    /* sayap turun */
    '...........',
    '.....W.....',
    '..WWWWWWW..',
    '..WWWIWWW..',
    'kWWWWWWWY..',
    'WWWW.WWWW..',
    '.WW..WWW...',
    '....WWW....',
    '....Y.Y....'
  ];
}

/* ---- E4 PAYUNG BAROQUE WORKS (Miss Valentine) — 9 x 12 ----
   Agen Baroque Works yang melayang turun dengan PAYUNG belang — musuh
   udara yang jatuh menimpa pemain. Payung belang kuning-hitam adalah
   siluet paling khasnya; di bawahnya tangkai + sosok kecil menggantung. */
function balonArt() {
  return [
    '..KKYKK..',
    '.KKYYYKK.',
    'KKYYYYYKK',   /* kubah payung belang kuning-hitam */
    'KYYYYYYYK',
    'YYYYYYYYY',
    '....K....',   /* tangkai */
    '...HHH...',   /* rambut pirang */
    '...SIS...',   /* wajah */
    '..YYYYY..',   /* gaun kuning */
    '.YYYYYYY.',
    '..YYYYY..',
    '...K.K...'    /* kaki */
  ];
}

/* ---- E5 TUMPUKAN TONG HARTA — 10 x 15 ----
   Tong kayu & peti harta karun bertumpuk (barang wajib di dermaga bajak
   laut). Kena sekali -> tumpukan teratas hancur (hits>=1), sisanya tetap
   jadi rintangan. Lingkar besi gelap tiap 3 baris = bacaan "tong". */
function kadoArt(hits) {
  var top = hits >= 1 ? ['..........','..........','..........','..........','..........']
                      : ['..DDDDDD..','..DdddddD.','..EEEEEE..','..DdddddD.','..DDDDDD..'];
  return top.concat([
    '.DDDDDDDD.',
    '.DddddddD.',
    '.EEEEEEEE.',   /* lingkar besi */
    '.DddddddD.',
    '.DDDDDDDD.',
    'YYYYYYYYYY',   /* peti harta emas */
    'YyYYYYYYyY',
    'EEEEYYEEEE',   /* gembok */
    'YYYYYYYYYY',
    'YYYYYYYYYY'
  ]);
}

/* ---- E6 MERIAM MARINIR — 10 x 10 ----
   Meriam beroda khas kapal Marinir. 'frame' menganimasikan sumbu menyala:
   percikan api muncul-hilang di ujung sumbu, jadi musuh ini terbaca
   "sedang mengisi tembakan" tanpa perlu frame tambahan. */
function jamArt(frame) {
  var fuse = frame ? '.....*....' : '.....y....';
  return [
    fuse,                /* percikan sumbu */
    '....K.....',
    'IIIIIIII..',        /* laras meriam */
    'IIwwwwII..',
    'IIIIIIII..',
    '.KKKKKKKK.',        /* dudukan kayu */
    '.KEEEEEEK.',
    '.KKKKKKKK.',
    'KK......KK',
    'wKK....KKw'         /* roda */
  ];
}

/* ---- KOIN — 7 x 7 ---- */
function koinArt(frame) {
  if (frame === 0) return [
    '..YYY..',
    '.YyyyY.',
    'YyYYYyY',
    'YyYTYyY',
    'YyYYYyY',
    '.YyyyY.',
    '..YYY..'
  ];
  if (frame === 1 || frame === 3) return [
    '..YYY..',
    '..YyY..',
    '..yYy..',
    '..yTy..',
    '..yYy..',
    '..YyY..',
    '..YYY..'
  ];
  return [
    '...Y...',
    '...Y...',
    '...y...',
    '...y...',
    '...y...',
    '...Y...',
    '...Y...'
  ];
}

/* ---- KOTAK UNDANGAN — 10 x 8 ---- */
function pieceArt(frame) {
  var sp = (frame % 2) ? 'y........y' : '..........';
  return [
    sp,
    'TTTTTTTTTT',
    'TrTTTTTTrT',
    'TTrTTTTrTT',
    'TTTrTTrTTT',
    'TTTTWWTTTT',
    'TTTWWWWTTT',
    'TTTTTTTTTT'
  ];
}

/* ---- POWER-UP — 9 x 9 ---- */
function powerupArt(kind) {
  if (kind === 'melati') return [
    '..WWWWW..',
    '.WWWWWWW.',
    'WWWyYyWWW',
    'WWyYYYyWW',
    'WWWyYyWWW',
    '.WWWWWWW.',
    '..WWWWW..',
    '....A....',
    '....A....'
  ];
  if (kind === 'cincin') return [
    '....F....',
    '...FWF...',
    '....F....',
    '..YYYYY..',
    '.Yy...yY.',
    '.Yy...yY.',
    '..YYYYY..',
    '.........',
    '.........'
  ];
  if (kind === 'buket') return [
    /* BUKET bunga — power-up MENEMBAK. Sengaja dibuat merah muda &
       bulat supaya jelas beda siluetnya dari melati (putih) dan
       cincin (emas) walau ukurannya sama-sama 9x9. */
    '..P.P.P..',
    '.PpPpPpP.',
    'PpP<P>PpP',
    '.PpPpPpP.',
    '..PPPPP..',
    '...,,,...',
    '...:::...',
    '..:::::..',
    '...,,,...'
  ];
  return [
    '....W....',
    '..TTTTT..',
    '.TTTTTTT.',
    'TTbTTbTTT',
    'TTTTTTTTT',
    '....K....',
    '....K....',
    '....K....',
    '...KK....'
  ];
}
/* PELURU buket — kelopak bunga melesat. Kecil (5x5) supaya terbaca
   sebagai proyektil, bukan sebagai benda yang bisa diambil. */
function shotArt() {
  return [
    '.ppp.',
    'p<P>p',
    'pP~Pp',
    'p<P>p',
    '.ppp.'
  ];
}
function sparkArt() { return ['yW', 'Wy']; }

/* =====================================================================
   TILE 32px — grid 8x8 @ TPX=4 (piksel BESAR, bukan 16x16 halus)
   Tekstur tetap ada, tapi kasar. Nat bata pakai 'I' — itu DETAIL, bukan bingkai.
   ===================================================================== */

function groundArt(kind) {
  var g1, g2, b1, b2, b3;
  if (kind === 'wood')        { g1='d'; g2='D'; b1='D'; b2='E'; b3='E'; }
  else if (kind === 'forest') { g1='a'; g2='A'; b1='E'; b2='E'; b3='K'; }
  else if (kind === 'clay')   { g1='d'; g2='D'; b1='D'; b2='E'; b3='E'; }
  /* ALABASTA — pasir: permukaan emas pucat, batuan gurun di bawahnya */
  else if (kind === 'sand')   { g1='y'; g2='Y'; b1='D'; b2='E'; b3='E'; }
  /* SKYPIEA — awan padat: putih di atas, perut abu-kebiruan */
  else if (kind === 'cloud')  { g1='W'; g2='w'; b1='w'; b2='u'; b3='u'; }
  else if (kind === 'marble') { g1='W'; g2='w'; b1='w'; b2='K'; b3='K'; }
  else                        { g1='a'; g2='A'; b1='D'; b2='E'; b3='E'; }
  return [
    g1+g1+g1+g1+g1+g1+g1+g1,
    g2+g1+g2+g2+g1+g2+g2+g1,   /* dithering rumput */
    g2+g2+g2+g2+g2+g2+g2+g2,
    b1+b1+b1+b1+b1+b1+b1+b1,
    b1+b2+b1+b1+b1+b2+b1+b1,   /* kerikil */
    b1+b1+b1+b2+b1+b1+b1+b1,
    b2+b1+b2+b1+b2+b1+b2+b1,   /* dithering bawah */
    b3+b3+b3+b3+b3+b3+b3+b3
  ];
}

function brickArt() {
  return [
    'mmmmmmmm',
    'MMMIMMMI',
    'MMMIMMMI',
    'xxxIxxxI',
    'mmmmmmmm',
    'IMMMIMMM',
    'IMMMIMMM',
    'IxxxIxxx'
  ];
}

function qblockArt(frame, dead) {
  if (dead) return [
    'EEEEEEEE',
    'EDDDDDDE',
    'EDDDDDDE',
    'EDDDDDDE',
    'EDDDDDDE',
    'EDDDDDDE',
    'EDDDDDDE',
    'EEEEEEEE'
  ];
  /* Tanda '?' harus terbaca pada grid 8x8 — bentuknya dibuat tegas:
       .XXX..     baris atas melengkung
       ...X..     turun ke kanan
       ..XX..     belok
       ..X...
       ......     jeda
       ..X...     titik
     Rivet sudut pakai 'Y' (kuning gelap), bukan hitam. */
  var G = (frame % 2 === 0) ? 'y' : 'W';
  return [
    'YQQQQQQY',
    'QQ' + G + G + G + 'QQQ',
    'QQQQ' + G + 'QQQ',
    'QQQ' + G + G + 'QQQ',
    'QQQ' + G + 'QQQQ',
    'QQQQQQQQ',
    'QQQ' + G + 'QQQQ',
    'YQQQQQQY'
  ];
}

function platArt() {
  return [
    'dddddddd',
    'DDDDDDDD',
    'EEEEEEEE'
  ];
}

function pipeArt(tiles) {
  var rows = [
    'vvvvvvvvvvvvvvvv',
    'vVVVVVVVVVVVVVVv',
    'VVVVVVVVVVVVVVVV',
    'ZZZZZZZZZZZZZZZZ'
  ];
  var shaft = '..vvVVVVVVVVZZ..';
  for (var i = 0; i < tiles; i++) rows.push(shaft);
  return rows;
}

function goalArt() {
  var rows = [
    '...TTT...',
    '..TrrrT..',
    '..TrTrT..',
    '...TTT...',
    '....T....'
  ];
  for (var i = 0; i < 6; i++) rows.push(i < 4 ? '....WTTTT' : '....W....');
  for (var j = 0; j < 26; j++) rows.push('....W....');
  return rows;
}

/* ---- BOS: ARLONG — 16 x 20, 3 fase ----
   Riset (One Piece Wiki / Netflix prosthetics team): Arlong "si Gergaji"
   adalah manusia-ikan HIU GERGAJI. Ciri kanon yang dipakai:
     - kulit BIRU MUDA (light blue), bukan hijau
     - HIDUNG PANJANG BERGERIGI seperti moncong hiu gergaji  <- ciri #1
     - rambut hitam sebahu dengan widow's peak + SIRIP di belakang kepala
     - insang di leher, gigi tajam, badan berotot
   Fase menaikkan intensitas: 1 normal -> 2 marah (mulut menganga, kulit
   lebih gelap) -> 3 murka (kulit paling gelap + gigi penuh + aura).
   Digambar eksplisit baris-per-baris (bukan lingkaran prosedural) karena
   moncong gergaji harus presisi supaya terbaca. */
function bossArt(phase) {
  /* Kulit biru berjenjang: '#'=dasar, '='=sorot, '-'=bayangan.
     Fase 1 pucat -> fase 3 paling jenuh (makin murka makin gelap). */
  var base = phase >= 3 ? '(' : phase === 2 ? ')' : '[';
  var lite = phase >= 3 ? ')' : phase === 2 ? '[' : ']';
  var dark = '(';

  /* Mulut: makin marah makin menganga & penuh gigi (lebar tetap 32). */
  var mouth = phase >= 3 ? '.....,#~~~~~~~~#,...............'
            : phase === 2 ? '.....,##~~~~~~##,...............'
            :               '.....,###~~~~###,...............';

  var rows = [
    '........,,,,,,,,,,,.............',   /* ushanka coklat (kanon) */
    '.......,;::::::::;,.............',
    '......,;:////////:;,............',
    '......,::////////::,............',
    '......,,,,,,,,,,,,,,............',
    '.....,,,,,,,,,,,,,,,............',   /* rambut hitam sebahu */
    '.....,,,,,,,,,,,,,,,............',
    '....,,,,,#######,,,,,...........',   /* widow's peak */
    '....,,,,#########,,,,,,.........',   /* + sirip tengkuk */
    '....,,,###=###=###,,,,,,........',
    '....,,,##,~#=,~#=##,,,,,,.......',   /* MATA (pupil + kilau) */
    '.....,############-,,,,,........',
    '..,,,,############-,,,,.........',
    /* MONCONG GERGAJI — ciri #1 Arlong. Harus MENJULUR keluar dari
       siluet kepala dan bergerigi jelas; versi tipis 1px sebelumnya
       tenggelam di dalam kepala dan tidak terbaca sama sekali. */
    ',~,~,~,~,#########-,............',   /* gerigi atas */
    ',~~~~~~~~,########-,............',   /* badan moncong */
    ',,~,~,~,~,#######-,.............',   /* gerigi bawah */
    '..,,,,,,,,#######-,.............',
    mouth,                                 /* MULUT + GIGI */
    '.....,-##########-,.............',
    '.....,-#########-,..............',
    '....,,-#,,,#,,,#-,..............',   /* garis INSANG leher */
    '...,,-###########-,,............',
    '..,^^^^^^,^^^^^^,^^^,...........',   /* kemeja kuning bertotol hitam */
    '.,^^^,^^^^^^,^^^^^^^^,..........',
    '.,^^^^^^^^,^^^^^,^^^^,..........',
    '.,^^,^^^^^^^^^,^^^^^^,..........',
    '.,$^^^^^,^^^^^^^^^,^$,..........',
    '..,$$^^^^^^^^^^^^^$$,...........',
    '...,,-############-,,...........',   /* pinggang */
    '....,;::::::::::::;,............',   /* celana coklat */
    '....,;::::::::::::;,............',
    '....,;:::::,,:::::;,............',
    '....,;::::,..,::::;,............',
    '....,#####,..,#####,............',   /* betis */
    '....,#####,..,#####,............',
    '....,-###-,..,-###-,............',
    '...,,#####,,,,#####,,...........',
    '...,;::::;,..,;::::;,...........',   /* sandal kulit coklat */
    '...,,,,,,,,..,,,,,,,,...........'
  ];
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    out.push(rows[i].replace(/#/g, base).replace(/=/g, lite).replace(/-/g, dark));
  }
  return out;
}

/* Prop — kecil & kasar */
function bushArt() {
  return [
    '..aaaa..',
    '.aAAAAa.',
    'aAAzzAAa',
    'AAAAAAAA',
    '.AAAAAA.'
  ];
}
function rockArt() {
  return [
    '..wwww..',
    '.wwwwww.',
    'wwWwwwKw',
    'wKwwwKKw',
    '.KKKKKK.'
  ];
}
function flowerArt() {
  return [
    'T.Y.T',
    'TTYTT',
    '.TTT.',
    '..A..',
    '..A..'
  ];
}
/* =====================================================================
   REVISI 6 — PEMANDANGAN RIMBUN
   Referensi baru menuntut hal berbeda dari referensi pertama: bukan lagi
   minimalis-berkabut, tapi PADAT & DETAIL. Tiga ciri yang paling menentukan:

     1. AWAN CUMULUS BERGUMPAL yang menempati 30-50% bidang gambar. Bukan
        balok datar, tapi gumpalan bertumpuk dengan sisi terang (kena
        matahari) dan perut abu-abu.
     2. POHON BERDAUN, bukan siluet segitiga. Mahkotanya bergerombol tak
        beraturan dengan 3 nilai hijau: sorot, badan, bayangan.
     3. RUMPUT HIDUP — bunga kecil, rumpun, batu, bukan bidang warna polos.

   Semua tetap dibangun dari kotak (tanpa primitif mulus) dan tetap sebagai
   petak berulang supaya biaya gambarnya tetap (pelajaran revisi 5).
   ===================================================================== */

/* ---- AWAN CUMULUS: gumpalan bertumpuk, 24x14 ----
   Dibangun sebagai 'blob' — kumpulan lingkaran-piksel yang saling tumpang
   tindih, lalu diwarnai 3 nilai: puncak putih (kena matahari), badan putih
   pucat, perut abu-kebiruan. Itu yang memberi VOLUME; awan satu warna
   terlihat seperti tempelan kertas. */
function cloudArt(variant) {
  var W = 24, H = 14;
  /* daftar gumpalan: [cx, cy, r] */
  var blobs = variant === 1
    ? [[6,8,4],[11,6,5],[16,7,4],[20,9,3],[9,10,4],[14,10,4]]
    : variant === 2
    ? [[5,9,3],[9,6,4],[13,5,5],[18,7,4],[21,9,3],[12,10,4]]
    : [[7,9,4],[12,7,5],[17,8,4],[10,11,3],[15,11,3],[20,10,3]];

  function inBlob(x, y) {
    for (var i = 0; i < blobs.length; i++) {
      var dx = x - blobs[i][0], dy = (y - blobs[i][1]) * 1.35;
      if (dx * dx + dy * dy <= blobs[i][2] * blobs[i][2]) return blobs[i][1];
    }
    return -1;
  }
  var out = [];
  for (var y = 0; y < H; y++) {
    out.push(row(W, function (x) {
      var cy = inBlob(x, y);
      if (cy < 0) return '.';
      /* atas gumpalan = sorot, tengah = putih, bawah = perut abu */
      var above = inBlob(x, y - 2) < 0;
      var below = inBlob(x, y + 2) < 0;
      if (above) return 'W';        /* sorot matahari */
      if (below) return 'u';        /* perut abu-kebiruan */
      return 'w';                   /* badan */
    }));
  }
  return out;
}

/* ---- POHON BERDAUN (mahkota bergerombol) 20x24 ----
   Beda dari pinus: mahkotanya BULAT TAK BERATURAN dengan gerombol daun,
   bukan segitiga bertingkat. 3 nilai hijau + batang bercabang. */
function leafTreeArt(variant) {
  var W = 20, H = 20;
  /* Mahkota diangkat ke atas & batang dipendekkan: versi pertama punya batang
     lurus 10 baris yang membuat pohon terlihat seperti tiang, bukan pohon. */
  var clumps = variant === 1
    ? [[10,6,6],[6,8,4],[14,8,4],[9,10,5],[13,10,4]]
    : [[9,5,5],[13,7,5],[6,9,4],[11,9,5],[15,10,3]];

  function inClump(x, y) {
    for (var i = 0; i < clumps.length; i++) {
      var dx = x - clumps[i][0], dy = (y - clumps[i][1]) * 1.15;
      if (dx * dx + dy * dy <= clumps[i][2] * clumps[i][2]) return true;
    }
    return false;
  }
  var out = [];
  for (var y = 0; y < H; y++) {
    out.push(row(W, function (x) {
      /* Batang digambar SEBELUM mahkota diuji, tapi hanya di bawah mahkota,
         supaya daun tidak menelan pangkalnya. */
      if (y >= 13) {
        if (x === 9) return 'D';        /* sisi terang batang */
        if (x === 10) return 'E';       /* sisi gelap batang  */
        if (y === 13 && x >= 7 && x <= 8) return 'E';   /* cabang kiri  */
        if (y === 14 && x >= 11 && x <= 12) return 'E'; /* cabang kanan */
      }
      if (!inClump(x, y)) return '.';
      /* pencahayaan: kiri-atas sorot, kanan-bawah bayangan */
      var lit = !inClump(x - 1, y - 1);
      var dark = !inClump(x + 1, y + 2);
      if (lit) return 'a';          /* sorot hijau muda */
      if (dark) return 'z';         /* bayangan hijau tua */
      return 'A';                   /* badan hijau */
    }));
  }
  return out;
}

/* ---- RUMPUN BUNGA — memberi kehidupan di padang rumput ---- */
function flowerPatchArt(variant) {
  if (variant === 1) return [
    '.Y...T...',
    'AAA.AAA.A',
    'AAAAAAAAA',
    '.AAAAAAA.'
  ];
  if (variant === 2) return [
    '..W...Y..',
    '.AAA.AAA.',
    'AAAAAAAAA',
    '.AAAAAAA.'
  ];
  return [
    'T...W..T.',
    'AAA.AAAAA',
    'AAAAAAAAA',
    '.AAAAAAA.'
  ];
}

/* ---- PAGAR KAYU — landmark khas referensi #1 ---- */
function fenceArt() {
  return [
    'D......D',
    'DEEEEEED',
    'D......D',
    'DEEEEEED',
    'D......D',
    'D......D'
  ];
}
function grassTuftArt() {
  return [
    '.A...A.',
    'AAA.AAA',
    'AAAAAAA',
    '.AAAAA.'
  ];
}

/* =====================================================================
   REGISTRASI
   ===================================================================== */
/* Jalankan fn dengan sebagian CP ditimpa sementara, lalu kembalikan seperti
   semula. Dipakai supaya SATU art-map (mis. groundArt) bisa menghasilkan
   tekstur berbeda-beda per stage tanpa menduplikasi art-map-nya. */
/* Ambil key tekstur per-stage bila ada, kalau tidak pakai fallback.
   Defensif: stage baru / tekstur gagal dibuat tidak boleh membuat layar blank. */
function scene_texKey(scene, prefix, id, fb) {
  var k = prefix + id;
  return (scene.textures && scene.textures.exists(k)) ? k : fb;
}

function withPal(overrides, fn) {
  var saved = {}, k;
  for (k in overrides) if (Object.prototype.hasOwnProperty.call(overrides, k)) {
    saved[k] = CP[k];
    CP[k] = overrides[k];
  }
  try { fn(); }
  finally {
    for (k in saved) if (Object.prototype.hasOwnProperty.call(saved, k)) CP[k] = saved[k];
  }
}

function makeArtTexture(scene, key, rows, px) {
  if (scene.textures.exists(key)) return;
  px = px || PX;
  var g = scene.make.graphics({ x: 0, y: 0, add: false });
  paintArt(g, rows, CP, px);
  g.generateTexture(key, artW(rows, px), artH(rows, px));
  g.destroy();
}
function makeTexture(scene, key, w, h, drawFn) {
  if (scene.textures.exists(key)) return;
  var g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFn(g);
  g.generateTexture(key, w, h);
  g.destroy();
}
function makeAnim(scene, key, frameKeys, frameRate, repeat) {
  if (scene.anims.exists(key)) return;
  var frames = [];
  for (var i = 0; i < frameKeys.length; i++) frames.push({ key: frameKeys[i] });
  scene.anims.create({
    key: key, frames: frames, frameRate: frameRate,
    repeat: (repeat === undefined ? -1 : repeat)
  });
}

/* =====================================================================
   [ASET PNG] SATU sprite sheet + peta JSON
   ---------------------------------------------------------------------
   MEKANISME: semua sprite berada di SATU berkas assets/sprite-sheet.png,
   diunggah lewat Theme Editor > Asset Media sebagai SLOT PERTAMA, jadi
   terbaca sebagai {{asset_image_1}}.

   Tiap sprite ditaruh di dalam kotak berbingkai ungu 1px, diberi jarak,
   dan DIBERI NOMOR yang tercetak di bawah kotaknya. Nomor itu = nilai
   "i" di assets/sprite-map.json, yang memetakan:

       groups[nama].frames[] = { i, x, y, w, h }

   x/y menunjuk ke ISI kotak — bingkai ungu SUDAH dikecualikan saat peta
   dibuat, jadi engine tinggal memotong apa adanya tanpa perlu menebak
   atau memangkas apa pun.

   Peta JSON di-INLINE ke dalam berkas ini (SHEET_MAP di bawah) karena
   ThemeWrapper hanya menerima 3 string — html/css/js — sehingga tema
   tidak bisa fetch() berkas pendamping. Regenerasi keduanya sekaligus:

       node assets/build-sheet.cjs        (tulis PNG + JSON)
       node assets/inline-map.cjs         (suntik JSON ke index.js)

   Kalau sheet BELUM diunggah, src-nya masih berupa teks
   "{{asset_image_1}}"; assetUrl() mengembalikan null dan SEMUA sprite
   memakai art prosedural, jadi game tetap jalan.

   Sumber: Pixel Adventure 1 (Pixel Frog) — CC0, boleh dipakai komersial.
   ===================================================================== */

/* Slot unggahan (urutan = urutan Asset Media di Theme Editor).
     slot 1 = sprite  (karakter, musuh, tile, prop)
     slot 2 = latar   (lapis parallax per stage)
   Slot 2 BOLEH kosong: kalau belum diunggah, latar kembali digambar
   prosedural seperti sebelumnya, jadi undangan yang sudah live aman. */
var ASSETS = [
  { slot: 1, name: 'sheet', file: 'sprite-sheet.png' },
  { slot: 2, name: 'bg',    file: 'bg-sheet.png' }
];

/* <<<SHEET_MAP:BEGIN — dibuat otomatis, jangan diedit tangan>>> */
/* Peta sprite sheet: nama kelompok -> daftar frame [i, x, y, w, h].
   i = nomor yang tercetak di bawah kotak pada sprite-sheet.png.
   x/y sudah menunjuk ke ISI kotak (bingkai ungu dikecualikan).
   Sheet 2048x1475, 773 kotak, 175 kelompok. */
var SHEET_SIZE = { w: 2048, h: 1475 };
var SHEET_MAP = {
  "20 Enemies": [[0,7,7,630,500]],
  "Background/Blue": [[1,645,7,64,64]],
  "Background/Brown": [[2,717,7,64,64]],
  "Background/Gray": [[3,789,7,64,64]],
  "Background/Green": [[4,861,7,64,64]],
  "Background/Pink": [[5,933,7,64,64]],
  "Background/Purple": [[6,1005,7,64,64]],
  "Background/Yellow": [[7,1077,7,64,64]],
  "Hello": [[8,1149,7,630,500]],
  "Items/Boxes/Box1/Break": [[9,1787,7,28,24],[10,1823,7,28,24],[11,1859,7,28,24],[12,1895,7,28,24]],
  "Items/Boxes/Box1/Hit": [[13,1931,7,28,24],[14,1967,7,28,24],[15,2003,7,28,24]],
  "Items/Boxes/Box1/Idle": [[16,7,521,28,24]],
  "Items/Boxes/Box2/Break": [[17,43,521,28,24],[18,79,521,28,24],[19,115,521,28,24],[20,151,521,28,24]],
  "Items/Boxes/Box2/Hit": [[21,187,521,28,24],[22,223,521,28,24],[23,259,521,28,24],[24,295,521,28,24]],
  "Items/Boxes/Box2/Idle": [[25,331,521,28,24]],
  "Items/Boxes/Box3/Break": [[26,367,521,28,24],[27,403,521,28,24],[28,439,521,28,24],[29,475,521,28,24]],
  "Items/Boxes/Box3/Hit": [[30,511,521,28,24],[31,547,521,28,24]],
  "Items/Boxes/Box3/Idle": [[32,583,521,28,24]],
  "Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)": [[33,619,521,64,64],[34,691,521,64,64],[35,763,521,64,64],[36,835,521,64,64],[37,907,521,64,64],[38,979,521,64,64],[39,1051,521,64,64],[40,1123,521,64,64],[41,1195,521,64,64],[42,1267,521,64,64]],
  "Items/Checkpoints/Checkpoint/Checkpoint (Flag Out)": [[43,1339,521,64,64],[44,1411,521,64,64],[45,1483,521,64,64],[46,1555,521,64,64],[47,1627,521,64,64],[48,1699,521,64,64],[49,1771,521,64,64],[50,1843,521,64,64],[51,1915,521,64,64],[52,7,599,64,64],[53,79,599,64,64],[54,151,599,64,64],[55,223,599,64,64],[56,295,599,64,64],[57,367,599,64,64],[58,439,599,64,64],[59,511,599,64,64],[60,583,599,64,64],[61,655,599,64,64],[62,727,599,64,64],[63,799,599,64,64],[64,871,599,64,64],[65,943,599,64,64],[66,1015,599,64,64],[67,1087,599,64,64],[68,1159,599,64,64]],
  "Items/Checkpoints/Checkpoint/Checkpoint (No Flag)": [[69,1231,599,64,64]],
  "Items/Checkpoints/End/End (Idle)": [[70,1303,599,64,64]],
  "Items/Checkpoints/End/End (Pressed)": [[71,1375,599,64,64],[72,1447,599,64,64],[73,1519,599,64,64],[74,1591,599,64,64],[75,1663,599,64,64],[76,1735,599,64,64],[77,1807,599,64,64],[78,1879,599,64,64]],
  "Items/Checkpoints/Start/Start (Idle)": [[79,1951,599,64,64]],
  "Items/Checkpoints/Start/Start (Moving)": [[80,7,677,64,64],[81,79,677,64,64],[82,151,677,64,64],[83,223,677,64,64],[84,295,677,64,64],[85,367,677,64,64],[86,439,677,64,64],[87,511,677,64,64],[88,583,677,64,64],[89,655,677,64,64],[90,727,677,64,64],[91,799,677,64,64],[92,871,677,64,64],[93,943,677,64,64],[94,1015,677,64,64],[95,1087,677,64,64],[96,1159,677,64,64]],
  "Items/Fruits/Apple": [[97,1231,677,32,32],[98,1271,677,32,32],[99,1311,677,32,32],[100,1351,677,32,32],[101,1391,677,32,32],[102,1431,677,32,32],[103,1471,677,32,32],[104,1511,677,32,32],[105,1551,677,32,32],[106,1591,677,32,32],[107,1631,677,32,32],[108,1671,677,32,32],[109,1711,677,32,32],[110,1751,677,32,32],[111,1791,677,32,32],[112,1831,677,32,32],[113,1871,677,32,32]],
  "Items/Fruits/Bananas": [[114,1911,677,32,32],[115,1951,677,32,32],[116,1991,677,32,32],[117,7,755,32,32],[118,47,755,32,32],[119,87,755,32,32],[120,127,755,32,32],[121,167,755,32,32],[122,207,755,32,32],[123,247,755,32,32],[124,287,755,32,32],[125,327,755,32,32],[126,367,755,32,32],[127,407,755,32,32],[128,447,755,32,32],[129,487,755,32,32],[130,527,755,32,32]],
  "Items/Fruits/Cherries": [[131,567,755,32,32],[132,607,755,32,32],[133,647,755,32,32],[134,687,755,32,32],[135,727,755,32,32],[136,767,755,32,32],[137,807,755,32,32],[138,847,755,32,32],[139,887,755,32,32],[140,927,755,32,32],[141,967,755,32,32],[142,1007,755,32,32],[143,1047,755,32,32],[144,1087,755,32,32],[145,1127,755,32,32],[146,1167,755,32,32],[147,1207,755,32,32]],
  "Items/Fruits/Collected": [[148,1247,755,32,32],[149,1287,755,32,32],[150,1327,755,32,32],[151,1367,755,32,32],[152,1407,755,32,32],[153,1447,755,32,32]],
  "Items/Fruits/Kiwi": [[154,1487,755,32,32],[155,1527,755,32,32],[156,1567,755,32,32],[157,1607,755,32,32],[158,1647,755,32,32],[159,1687,755,32,32],[160,1727,755,32,32],[161,1767,755,32,32],[162,1807,755,32,32],[163,1847,755,32,32],[164,1887,755,32,32],[165,1927,755,32,32],[166,1967,755,32,32],[167,2007,755,32,32],[168,7,801,32,32],[169,47,801,32,32],[170,87,801,32,32]],
  "Items/Fruits/Melon": [[171,127,801,32,32],[172,167,801,32,32],[173,207,801,32,32],[174,247,801,32,32],[175,287,801,32,32],[176,327,801,32,32],[177,367,801,32,32],[178,407,801,32,32],[179,447,801,32,32],[180,487,801,32,32],[181,527,801,32,32],[182,567,801,32,32],[183,607,801,32,32],[184,647,801,32,32],[185,687,801,32,32],[186,727,801,32,32],[187,767,801,32,32]],
  "Items/Fruits/Orange": [[188,807,801,32,32],[189,847,801,32,32],[190,887,801,32,32],[191,927,801,32,32],[192,967,801,32,32],[193,1007,801,32,32],[194,1047,801,32,32],[195,1087,801,32,32],[196,1127,801,32,32],[197,1167,801,32,32],[198,1207,801,32,32],[199,1247,801,32,32],[200,1287,801,32,32],[201,1327,801,32,32],[202,1367,801,32,32],[203,1407,801,32,32],[204,1447,801,32,32]],
  "Items/Fruits/Pineapple": [[205,1487,801,32,32],[206,1527,801,32,32],[207,1567,801,32,32],[208,1607,801,32,32],[209,1647,801,32,32],[210,1687,801,32,32],[211,1727,801,32,32],[212,1767,801,32,32],[213,1807,801,32,32],[214,1847,801,32,32],[215,1887,801,32,32],[216,1927,801,32,32],[217,1967,801,32,32],[218,2007,801,32,32],[219,7,847,32,32],[220,47,847,32,32],[221,87,847,32,32]],
  "Items/Fruits/Strawberry": [[222,127,847,32,32],[223,167,847,32,32],[224,207,847,32,32],[225,247,847,32,32],[226,287,847,32,32],[227,327,847,32,32],[228,367,847,32,32],[229,407,847,32,32],[230,447,847,32,32],[231,487,847,32,32],[232,527,847,32,32],[233,567,847,32,32],[234,607,847,32,32],[235,647,847,32,32],[236,687,847,32,32],[237,727,847,32,32],[238,767,847,32,32]],
  "Main Characters/Appearing": [[239,807,847,96,96],[240,911,847,96,96],[241,1015,847,96,96],[242,1119,847,96,96],[243,1223,847,96,96],[244,1327,847,96,96],[245,1431,847,96,96]],
  "Main Characters/Desappearing": [[246,1535,847,96,96],[247,1639,847,96,96],[248,1743,847,96,96],[249,1847,847,96,96],[250,7,957,96,96],[251,111,957,96,96],[252,215,957,96,96]],
  "Main Characters/Mask Dude/Double Jump": [[253,319,957,32,32],[254,359,957,32,32],[255,399,957,32,32],[256,439,957,32,32],[257,479,957,32,32],[258,519,957,32,32]],
  "Main Characters/Mask Dude/Fall": [[259,559,957,32,32]],
  "Main Characters/Mask Dude/Hit": [[260,599,957,32,32],[261,639,957,32,32],[262,679,957,32,32],[263,719,957,32,32],[264,759,957,32,32],[265,799,957,32,32],[266,839,957,32,32]],
  "Main Characters/Mask Dude/Idle": [[267,879,957,32,32],[268,919,957,32,32],[269,959,957,32,32],[270,999,957,32,32],[271,1039,957,32,32],[272,1079,957,32,32],[273,1119,957,32,32],[274,1159,957,32,32],[275,1199,957,32,32],[276,1239,957,32,32],[277,1279,957,32,32]],
  "Main Characters/Mask Dude/Jump": [[278,1319,957,32,32]],
  "Main Characters/Mask Dude/Run": [[279,1359,957,32,32],[280,1399,957,32,32],[281,1439,957,32,32],[282,1479,957,32,32],[283,1519,957,32,32],[284,1559,957,32,32],[285,1599,957,32,32],[286,1639,957,32,32],[287,1679,957,32,32],[288,1719,957,32,32],[289,1759,957,32,32],[290,1799,957,32,32]],
  "Main Characters/Mask Dude/Wall Jump": [[291,1839,957,32,32],[292,1879,957,32,32],[293,1919,957,32,32],[294,1959,957,32,32],[295,1999,957,32,32]],
  "Main Characters/Ninja Frog/Double Jump": [[296,7,1067,32,32],[297,47,1067,32,32],[298,87,1067,32,32],[299,127,1067,32,32],[300,167,1067,32,32],[301,207,1067,32,32]],
  "Main Characters/Ninja Frog/Fall": [[302,247,1067,32,32]],
  "Main Characters/Ninja Frog/Hit": [[303,287,1067,32,32],[304,327,1067,32,32],[305,367,1067,32,32],[306,407,1067,32,32],[307,447,1067,32,32],[308,487,1067,32,32],[309,527,1067,32,32]],
  "Main Characters/Ninja Frog/Idle": [[310,567,1067,32,32],[311,607,1067,32,32],[312,647,1067,32,32],[313,687,1067,32,32],[314,727,1067,32,32],[315,767,1067,32,32],[316,807,1067,32,32],[317,847,1067,32,32],[318,887,1067,32,32],[319,927,1067,32,32],[320,967,1067,32,32]],
  "Main Characters/Ninja Frog/Jump": [[321,1007,1067,32,32]],
  "Main Characters/Ninja Frog/Run": [[322,1047,1067,32,32],[323,1087,1067,32,32],[324,1127,1067,32,32],[325,1167,1067,32,32],[326,1207,1067,32,32],[327,1247,1067,32,32],[328,1287,1067,32,32],[329,1327,1067,32,32],[330,1367,1067,32,32],[331,1407,1067,32,32],[332,1447,1067,32,32],[333,1487,1067,32,32]],
  "Main Characters/Ninja Frog/Wall Jump": [[334,1527,1067,32,32],[335,1567,1067,32,32],[336,1607,1067,32,32],[337,1647,1067,32,32],[338,1687,1067,32,32]],
  "Main Characters/Pink Man/Double Jump": [[339,1727,1067,32,32],[340,1767,1067,32,32],[341,1807,1067,32,32],[342,1847,1067,32,32],[343,1887,1067,32,32],[344,1927,1067,32,32]],
  "Main Characters/Pink Man/Fall": [[345,1967,1067,32,32]],
  "Main Characters/Pink Man/Hit": [[346,2007,1067,32,32],[347,7,1113,32,32],[348,47,1113,32,32],[349,87,1113,32,32],[350,127,1113,32,32],[351,167,1113,32,32],[352,207,1113,32,32]],
  "Main Characters/Pink Man/Idle": [[353,247,1113,32,32],[354,287,1113,32,32],[355,327,1113,32,32],[356,367,1113,32,32],[357,407,1113,32,32],[358,447,1113,32,32],[359,487,1113,32,32],[360,527,1113,32,32],[361,567,1113,32,32],[362,607,1113,32,32],[363,647,1113,32,32]],
  "Main Characters/Pink Man/Jump": [[364,687,1113,32,32]],
  "Main Characters/Pink Man/Run": [[365,727,1113,32,32],[366,767,1113,32,32],[367,807,1113,32,32],[368,847,1113,32,32],[369,887,1113,32,32],[370,927,1113,32,32],[371,967,1113,32,32],[372,1007,1113,32,32],[373,1047,1113,32,32],[374,1087,1113,32,32],[375,1127,1113,32,32],[376,1167,1113,32,32]],
  "Main Characters/Pink Man/Wall Jump": [[377,1207,1113,32,32],[378,1247,1113,32,32],[379,1287,1113,32,32],[380,1327,1113,32,32],[381,1367,1113,32,32]],
  "Main Characters/Virtual Guy/Double Jump": [[382,1407,1113,32,32],[383,1447,1113,32,32],[384,1487,1113,32,32],[385,1527,1113,32,32],[386,1567,1113,32,32],[387,1607,1113,32,32]],
  "Main Characters/Virtual Guy/Fall": [[388,1647,1113,32,32]],
  "Main Characters/Virtual Guy/Hit": [[389,1687,1113,32,32],[390,1727,1113,32,32],[391,1767,1113,32,32],[392,1807,1113,32,32],[393,1847,1113,32,32],[394,1887,1113,32,32],[395,1927,1113,32,32]],
  "Main Characters/Virtual Guy/Idle": [[396,1967,1113,32,32],[397,2007,1113,32,32],[398,7,1159,32,32],[399,47,1159,32,32],[400,87,1159,32,32],[401,127,1159,32,32],[402,167,1159,32,32],[403,207,1159,32,32],[404,247,1159,32,32],[405,287,1159,32,32],[406,327,1159,32,32]],
  "Main Characters/Virtual Guy/Jump": [[407,367,1159,32,32]],
  "Main Characters/Virtual Guy/Run": [[408,407,1159,32,32],[409,447,1159,32,32],[410,487,1159,32,32],[411,527,1159,32,32],[412,567,1159,32,32],[413,607,1159,32,32],[414,647,1159,32,32],[415,687,1159,32,32],[416,727,1159,32,32],[417,767,1159,32,32],[418,807,1159,32,32],[419,847,1159,32,32]],
  "Main Characters/Virtual Guy/Wall Jump": [[420,887,1159,32,32],[421,927,1159,32,32],[422,967,1159,32,32],[423,1007,1159,32,32],[424,1047,1159,32,32]],
  "Menu/Buttons/Achievements": [[425,1087,1159,21,22]],
  "Menu/Buttons/Back": [[426,1116,1159,15,16]],
  "Menu/Buttons/Close": [[427,1139,1159,15,16]],
  "Menu/Buttons/Leaderboard": [[428,1162,1159,21,22]],
  "Menu/Buttons/Levels": [[429,1191,1159,21,22]],
  "Menu/Buttons/Next": [[430,1220,1159,21,22]],
  "Menu/Buttons/Play": [[431,1249,1159,21,22]],
  "Menu/Buttons/Previous": [[432,1278,1159,21,22]],
  "Menu/Buttons/Restart": [[433,1307,1159,21,22]],
  "Menu/Buttons/Settings": [[434,1336,1159,21,22]],
  "Menu/Buttons/Volume": [[435,1365,1159,21,22]],
  "Menu/Levels/01": [[436,1394,1159,19,17]],
  "Menu/Levels/02": [[437,1421,1159,19,17]],
  "Menu/Levels/03": [[438,1448,1159,19,17]],
  "Menu/Levels/04": [[439,1475,1159,19,17]],
  "Menu/Levels/05": [[440,1502,1159,19,17]],
  "Menu/Levels/06": [[441,1529,1159,19,17]],
  "Menu/Levels/07": [[442,1556,1159,19,17]],
  "Menu/Levels/08": [[443,1583,1159,19,17]],
  "Menu/Levels/09": [[444,1610,1159,19,17]],
  "Menu/Levels/10": [[445,1637,1159,19,17]],
  "Menu/Levels/11": [[446,1664,1159,19,17]],
  "Menu/Levels/12": [[447,1691,1159,19,17]],
  "Menu/Levels/13": [[448,1718,1159,19,17]],
  "Menu/Levels/14": [[449,1745,1159,19,17]],
  "Menu/Levels/15": [[450,1772,1159,19,17]],
  "Menu/Levels/16": [[451,1799,1159,19,17]],
  "Menu/Levels/17": [[452,1826,1159,19,17]],
  "Menu/Levels/18": [[453,1853,1159,19,17]],
  "Menu/Levels/19": [[454,1880,1159,19,17]],
  "Menu/Levels/20": [[455,1907,1159,19,17]],
  "Menu/Levels/21": [[456,1934,1159,19,17]],
  "Menu/Levels/22": [[457,1961,1159,19,17]],
  "Menu/Levels/23": [[458,1988,1159,19,17]],
  "Menu/Levels/24": [[459,2015,1159,19,17]],
  "Menu/Levels/25": [[460,7,1205,19,17]],
  "Menu/Levels/26": [[461,34,1205,19,17]],
  "Menu/Levels/27": [[462,61,1205,19,17]],
  "Menu/Levels/28": [[463,88,1205,19,17]],
  "Menu/Levels/29": [[464,115,1205,19,17]],
  "Menu/Levels/30": [[465,142,1205,19,17]],
  "Menu/Levels/31": [[466,169,1205,19,17]],
  "Menu/Levels/32": [[467,196,1205,19,17]],
  "Menu/Levels/33": [[468,223,1205,19,17]],
  "Menu/Levels/34": [[469,250,1205,19,17]],
  "Menu/Levels/35": [[470,277,1205,19,17]],
  "Menu/Levels/36": [[471,304,1205,19,17]],
  "Menu/Levels/37": [[472,331,1205,19,17]],
  "Menu/Levels/38": [[473,358,1205,19,17]],
  "Menu/Levels/39": [[474,385,1205,19,17]],
  "Menu/Levels/40": [[475,412,1205,19,17]],
  "Menu/Levels/41": [[476,439,1205,19,17]],
  "Menu/Levels/42": [[477,466,1205,19,17]],
  "Menu/Levels/43": [[478,493,1205,19,17]],
  "Menu/Levels/44": [[479,520,1205,19,17]],
  "Menu/Levels/45": [[480,547,1205,19,17]],
  "Menu/Levels/46": [[481,574,1205,19,17]],
  "Menu/Levels/47": [[482,601,1205,19,17]],
  "Menu/Levels/48": [[483,628,1205,19,17]],
  "Menu/Levels/49": [[484,655,1205,19,17]],
  "Menu/Levels/50": [[485,682,1205,19,17]],
  "Menu/Text/Text (Black)": [[486,709,1205,8,10],[487,725,1205,8,10],[488,741,1205,8,10],[489,757,1205,8,10],[490,773,1205,8,10],[491,789,1205,8,10],[492,805,1205,8,10],[493,821,1205,8,10],[494,837,1205,8,10],[495,853,1205,8,10],[496,869,1205,8,10],[497,885,1205,8,10],[498,901,1205,8,10],[499,917,1205,8,10],[500,933,1205,8,10],[501,949,1205,8,10],[502,965,1205,8,10],[503,981,1205,8,10],[504,997,1205,8,10],[505,1013,1205,8,10],[506,1029,1205,8,10],[507,1045,1205,8,10],[508,1061,1205,8,10],[509,1077,1205,8,10],[510,1093,1205,8,10],[511,1109,1205,8,10],[512,1125,1205,8,10],[513,1141,1205,8,10],[514,1157,1205,8,10],[515,1173,1205,8,10],[516,1189,1205,8,10],[517,1205,1205,8,10],[518,1221,1205,8,10],[519,1237,1205,8,10],[520,1253,1205,8,10],[521,1269,1205,8,10],[522,1285,1205,8,10],[523,1301,1205,8,10],[524,1317,1205,8,10],[525,1333,1205,8,10],[526,1349,1205,8,10],[527,1365,1205,8,10],[528,1381,1205,8,10],[529,1397,1205,8,10],[530,1413,1205,8,10],[531,1429,1205,8,10],[532,1445,1205,8,10],[533,1461,1205,8,10],[534,1477,1205,8,10],[535,1493,1205,8,10]],
  "Menu/Text/Text (White)": [[536,1509,1205,8,10],[537,1525,1205,8,10],[538,1541,1205,8,10],[539,1557,1205,8,10],[540,1573,1205,8,10],[541,1589,1205,8,10],[542,1605,1205,8,10],[543,1621,1205,8,10],[544,1637,1205,8,10],[545,1653,1205,8,10],[546,1669,1205,8,10],[547,1685,1205,8,10],[548,1701,1205,8,10],[549,1717,1205,8,10],[550,1733,1205,8,10],[551,1749,1205,8,10],[552,1765,1205,8,10],[553,1781,1205,8,10],[554,1797,1205,8,10],[555,1813,1205,8,10],[556,1829,1205,8,10],[557,1845,1205,8,10],[558,1861,1205,8,10],[559,1877,1205,8,10],[560,1893,1205,8,10],[561,1909,1205,8,10],[562,1925,1205,8,10],[563,1941,1205,8,10],[564,1957,1205,8,10],[565,1973,1205,8,10],[566,1989,1205,8,10],[567,2005,1205,8,10],[568,2021,1205,8,10],[569,7,1236,8,10],[570,23,1236,8,10],[571,39,1236,8,10],[572,55,1236,8,10],[573,71,1236,8,10],[574,87,1236,8,10],[575,103,1236,8,10],[576,119,1236,8,10],[577,135,1236,8,10],[578,151,1236,8,10],[579,167,1236,8,10],[580,183,1236,8,10],[581,199,1236,8,10],[582,215,1236,8,10],[583,231,1236,8,10],[584,247,1236,8,10],[585,263,1236,8,10]],
  "Other/Confetti": [[586,279,1236,16,16],[587,303,1236,16,16],[588,327,1236,16,16],[589,351,1236,16,16],[590,375,1236,16,16],[591,399,1236,16,16]],
  "Other/Dust Particle": [[592,423,1236,16,16]],
  "Other/Shadow": [[593,447,1236,16,16]],
  "Other/Transition": [[594,471,1236,44,44]],
  "Terrain/Terrain": [[595,523,1236,48,48],[596,579,1236,32,32],[597,619,1236,48,48],[598,675,1236,32,32],[599,715,1236,48,16],[600,771,1236,32,32],[601,811,1236,16,16],[602,835,1236,16,48],[603,859,1236,48,5],[604,915,1236,48,5],[605,971,1236,48,5],[606,1027,1236,48,48],[607,1083,1236,32,32],[608,1123,1236,48,48],[609,1179,1236,32,32],[610,1219,1236,48,16],[611,1275,1236,32,32],[612,1315,1236,16,16],[613,1339,1236,16,48],[614,1363,1236,48,48],[615,1419,1236,32,32],[616,1459,1236,48,48],[617,1515,1236,32,32],[618,1555,1236,48,48],[619,1611,1236,32,32],[620,1651,1236,48,16],[621,1707,1236,32,32],[622,1747,1236,16,16],[623,1771,1236,16,48],[624,1795,1236,48,16],[625,1851,1236,32,32],[626,1891,1236,16,16],[627,1915,1236,16,48]],
  "Traps/Arrow/Hit": [[628,1939,1236,18,18],[629,1965,1236,18,18],[630,1991,1236,18,18],[631,2017,1236,18,18]],
  "Traps/Arrow/Idle": [[632,7,1298,18,18],[633,33,1298,18,18],[634,59,1298,18,18],[635,85,1298,18,18],[636,111,1298,18,18],[637,137,1298,18,18],[638,163,1298,18,18],[639,189,1298,18,18],[640,215,1298,18,18],[641,241,1298,18,18]],
  "Traps/Blocks/HitSide": [[642,267,1298,22,22],[643,297,1298,22,22],[644,327,1298,22,22]],
  "Traps/Blocks/HitTop": [[645,357,1298,22,22],[646,387,1298,22,22],[647,417,1298,22,22]],
  "Traps/Blocks/Idle": [[648,447,1298,22,22]],
  "Traps/Blocks/Part 1": [[649,477,1298,22,22],[650,507,1298,22,22],[651,537,1298,22,22]],
  "Traps/Blocks/Part 2": [[652,567,1298,22,22],[653,597,1298,22,22],[654,627,1298,22,22]],
  "Traps/Falling Platforms/Off": [[655,657,1298,32,10]],
  "Traps/Falling Platforms/On": [[656,697,1298,32,10],[657,737,1298,32,10],[658,777,1298,32,10],[659,817,1298,32,10]],
  "Traps/Fan/Off": [[660,857,1298,8,8],[661,873,1298,8,8],[662,889,1298,8,8]],
  "Traps/Fan/On": [[663,905,1298,24,8],[664,937,1298,24,8],[665,969,1298,24,8],[666,1001,1298,24,8]],
  "Traps/Fire/Hit": [[667,1033,1298,16,32],[668,1057,1298,16,32],[669,1081,1298,16,32],[670,1105,1298,16,32]],
  "Traps/Fire/Off": [[671,1129,1298,16,32]],
  "Traps/Fire/On": [[672,1153,1298,16,32],[673,1177,1298,16,32],[674,1201,1298,16,32]],
  "Traps/Platforms/Brown Off": [[675,1225,1298,8,8],[676,1241,1298,8,8],[677,1257,1298,8,8],[678,1273,1298,8,8]],
  "Traps/Platforms/Brown On": [[679,1289,1298,32,8],[680,1329,1298,32,8],[681,1369,1298,32,8],[682,1409,1298,32,8],[683,1449,1298,32,8],[684,1489,1298,32,8],[685,1529,1298,32,8],[686,1569,1298,32,8]],
  "Traps/Platforms/Chain": [[687,1609,1298,8,8]],
  "Traps/Platforms/Grey Off": [[688,1625,1298,8,8],[689,1641,1298,8,8],[690,1657,1298,8,8],[691,1673,1298,8,8]],
  "Traps/Platforms/Grey On": [[692,1689,1298,32,8],[693,1729,1298,32,8],[694,1769,1298,32,8],[695,1809,1298,32,8],[696,1849,1298,32,8],[697,1889,1298,32,8],[698,1929,1298,32,8],[699,1969,1298,32,8]],
  "Traps/Rock Head/Blink": [[700,7,1344,42,42],[701,57,1344,42,42],[702,107,1344,42,42],[703,157,1344,42,42]],
  "Traps/Rock Head/Bottom Hit": [[704,207,1344,42,42],[705,257,1344,42,42],[706,307,1344,42,42],[707,357,1344,42,42]],
  "Traps/Rock Head/Idle": [[708,407,1344,42,42]],
  "Traps/Rock Head/Left Hit": [[709,457,1344,42,42],[710,507,1344,42,42],[711,557,1344,42,42],[712,607,1344,42,42]],
  "Traps/Rock Head/Right Hit": [[713,657,1344,42,42],[714,707,1344,42,42],[715,757,1344,42,42],[716,807,1344,42,42]],
  "Traps/Rock Head/Top Hit": [[717,857,1344,42,42],[718,907,1344,42,42],[719,957,1344,42,42],[720,1007,1344,42,42]],
  "Traps/Sand Mud Ice/Ice Particle": [[721,1057,1344,16,16]],
  "Traps/Sand Mud Ice/Mud Particle": [[722,1081,1344,16,16]],
  "Traps/Sand Mud Ice/Sand Mud Ice": [[723,1105,1344,48,48],[724,1161,1344,32,32],[725,1201,1344,48,48],[726,1257,1344,32,32],[727,1297,1344,48,48],[728,1353,1344,32,32]],
  "Traps/Sand Mud Ice/Sand Particle": [[729,1393,1344,16,16]],
  "Traps/Saw/Chain": [[730,1417,1344,8,8]],
  "Traps/Saw/Off": [[731,1433,1344,38,38]],
  "Traps/Saw/On": [[732,1479,1344,38,38],[733,1525,1344,38,38],[734,1571,1344,38,38],[735,1617,1344,38,38],[736,1663,1344,38,38],[737,1709,1344,38,38],[738,1755,1344,38,38],[739,1801,1344,38,38]],
  "Traps/Spike Head/Blink": [[740,1847,1344,54,52],[741,1909,1344,54,52],[742,1971,1344,54,52],[743,7,1410,54,52]],
  "Traps/Spike Head/Bottom Hit": [[744,69,1410,54,52],[745,131,1410,54,52],[746,193,1410,54,52],[747,255,1410,54,52]],
  "Traps/Spike Head/Idle": [[748,317,1410,54,52]],
  "Traps/Spike Head/Left Hit": [[749,379,1410,54,52],[750,441,1410,54,52],[751,503,1410,54,52],[752,565,1410,54,52]],
  "Traps/Spike Head/Right Hit": [[753,627,1410,54,52],[754,689,1410,54,52],[755,751,1410,54,52],[756,813,1410,54,52]],
  "Traps/Spike Head/Top Hit": [[757,875,1410,54,52],[758,937,1410,54,52],[759,999,1410,54,52],[760,1061,1410,54,52]],
  "Traps/Spiked Ball/Chain": [[761,1123,1410,8,8]],
  "Traps/Spiked Ball/Spiked Ball": [[762,1139,1410,28,28]],
  "Traps/Spikes/Idle": [[763,1175,1410,16,16]],
  "Traps/Trampoline/Idle": [[764,1199,1410,28,28]],
  "Traps/Trampoline/Jump": [[765,1235,1410,28,28],[766,1271,1410,28,28],[767,1307,1410,28,28],[768,1343,1410,28,28],[769,1379,1410,28,28],[770,1415,1410,28,28],[771,1451,1410,28,28],[772,1487,1410,28,28]]
};
/* <<<SHEET_MAP:END>>> */

/* Pemetaan SPRITE SHEET -> KEY TEKSTUR engine.

     key   : key tekstur yang ditimpa (harus sama dengan yang dipakai game)
     grp   : nama kelompok di SHEET_MAP (= folder+berkas asal di pack)
     f     : frame ke-berapa DI DALAM kelompok itu (bukan nomor global)
     stack : blok ditumpuk jadi tiang setinggi h
     w / h : ukuran tujuan di DUNIA — WAJIB sama dengan sprite prosedural
             yang digantikan, kalau tidak hitbox meleset dan sprite
             tampak melayang atau tenggelam.
     label : nama yang muncul di dialog "Ganti sprite"
     pick  : pola kelompok yang BOLEH dipilih sebagai pengganti di dialog
             (dibatasi supaya ukuran/gaya tetap masuk akal)

   KENAPA nama kelompok, bukan nomor global: nomor bergeser tiap kali
   sheet dibangun ulang (menambah satu sprite menggeser semua sesudahnya).
   Nama kelompok + offset frame tetap stabil. Nomor yang tercetak di sheet
   tetap berguna untuk MEMBACA, dan dialog menampilkannya. */

/* =====================================================================
   SLOT ANIMASI — satu objek game = satu slot yang bisa diganti UTUH
   ---------------------------------------------------------------------
   Dulu dialog hanya bisa mengganti SATU rangka pada satu waktu. Itu
   merepotkan untuk objek beranimasi (harus mengganti 4 rangka satu per
   satu, dan kalau salah satu lupa, objeknya berkedip antara dua wujud),
   dan MUSTAHIL untuk membuat objek statis jadi bergerak.

   Sekarang tiap objek dijelaskan sebagai SLOT:

     id     : nama slot (dipakai SWAP_ANIM sebagai kunci)
     label  : nama yang tampil di dialog
     keys   : daftar key tekstur yang dipakai objek ini, BERURUTAN
     anim   : nama animasi Phaser (null = objek memang statis)
     fps    : kecepatan animasi
     pick   : saringan kelompok yang boleh dipilih
     max    : berapa banyak rangka yang boleh dipakai (batas atas)

   Mengganti slot = memilih SATU kelompok sumber, lalu engine mengambil
   rangka dari kelompok itu dan membagikannya ke keys[] secara merata.

   Kalau kelompok sumber punya >1 rangka DAN slot mengizinkan animasi,
   objek yang tadinya statis akan BERGERAK — karena keys-nya bertambah
   dan animasi didaftarkan otomatis. Inilah yang membuat, misalnya, duri
   diam bisa diganti gergaji berputar 8 rangka.
   ===================================================================== */
var ANIM_SLOTS = [
  { id: 'player_idle', label: 'Pengantin pria — diam',  anim: 'groom_idle', fps: 3,
    keys: ['t_groom_idle0', 't_groom_idle1'], pick: 'char', max: 6 },
  { id: 'player_run',  label: 'Pengantin pria — lari',  anim: 'groom_run',  fps: 10,
    keys: ['t_groom_run0','t_groom_run1','t_groom_run2','t_groom_run3'], pick: 'char', max: 8 },
  { id: 'player_jump', label: 'Pengantin pria — lompat', anim: null, fps: 0,
    keys: ['t_groom_jump'], pick: 'char', max: 1 },
  { id: 'player_fall', label: 'Pengantin pria — jatuh',  anim: null, fps: 0,
    keys: ['t_groom_fall'], pick: 'char', max: 1 },
  { id: 'player_hurt', label: 'Pengantin pria — kena',   anim: null, fps: 0,
    keys: ['t_groom_hurt'], pick: 'char', max: 1 },

  { id: 'foe1', label: 'Musuh 1 (jalan)', anim: 'e1_walk', fps: 6,
    keys: ['t_e1_0','t_e1_1'], pick: 'foe', max: 6 },
  { id: 'foe3', label: 'Musuh 3 (terbang)', anim: 'e3_fly', fps: 12,
    keys: ['t_e3_0','t_e3_1','t_e3_2'], pick: 'foe', max: 6 },
  { id: 'foe6', label: 'Musuh 6 (jalan)', anim: 'e6_walk', fps: 8,
    keys: ['t_e6_0','t_e6_1'], pick: 'foe', max: 6 },
  { id: 'foe4', label: 'Musuh balon', anim: 'e4_idle', fps: 6,
    keys: ['t_e4'], pick: 'item', max: 6 },

  { id: 'coin',  label: 'Koin', anim: 'coin_spin', fps: 10,
    keys: ['t_coin0','t_coin1','t_coin2','t_coin3'], pick: 'item', max: 8 },
  { id: 'qblock', label: 'Blok ?', anim: 'q_blink', fps: 5,
    keys: ['t_q0','t_q1','t_q2','t_q3'], pick: 'item', max: 8 },
  { id: 'goal',  label: 'Garis akhir (bendera)', anim: 'goal_wave', fps: 8,
    keys: ['t_goal','t_goal1','t_goal2','t_goal3'], pick: 'item', max: 10 },

  { id: 'pw_melati', label: 'Power-up melati', anim: 'pw_melati_spin', fps: 8,
    keys: ['t_pw_melati'], pick: 'item', max: 6 },
  { id: 'pw_cincin', label: 'Power-up cincin', anim: 'pw_cincin_spin', fps: 8,
    keys: ['t_pw_cincin'], pick: 'item', max: 6 },
  { id: 'pw_payung', label: 'Power-up payung', anim: 'pw_payung_spin', fps: 8,
    keys: ['t_pw_payung'], pick: 'item', max: 6 },
  { id: 'pw_buket', label: 'Power-up buket (tembak)', anim: 'pw_buket_spin', fps: 8,
    keys: ['t_pw_buket'], pick: 'item', max: 6 },
  { id: 'shot', label: 'Peluru buket', anim: 'shot_spin', fps: 12,
    keys: ['t_shot'], pick: 'item', max: 6 },

  /* --- objek yang tadinya prosedural penuh --- */
  { id: 'piece', label: 'Kepingan puzzle', anim: 'piece_float', fps: 6,
    keys: ['t_piece0','t_piece1','t_piece2','t_piece3'], pick: 'item', max: 8 },
  { id: 'bride', label: 'Pengantin wanita', anim: 'bride_idle', fps: 4,
    keys: ['t_bride'], pick: 'char', max: 6 },
  /* Bos: 3 key = 3 FASE yang dipilih dari sisa HP (setTexture('t_boss'+ph)),
     bukan rangka animasi. Sama seperti foe2/foe5 -> twoState. */
  { id: 'boss',  label: 'Bos (3 fase)', anim: null, fps: 0,
    keys: ['t_boss1','t_boss2','t_boss3'], pick: 'foe', max: 3, twoState: true },
  /* foe2 & foe5 punya DUA WUJUD (utuh/cangkang, utuh/rusak) yang dipilih
     oleh logika game, bukan rangka animasi berurutan. max:2 menjaga agar
     keduanya tidak diperlakukan sebagai siklus animasi — kalau dianimasikan,
     musuh akan berkedip antara utuh dan rusak terus-menerus. */
  { id: 'foe2',  label: 'Musuh 2 (siput)', anim: null, fps: 0,
    keys: ['t_e2_walk','t_e2_shell'], pick: 'foe', max: 2, twoState: true },
  { id: 'foe5',  label: 'Musuh 5 (kotak)', anim: null, fps: 0,
    keys: ['t_e5_0','t_e5_1'], pick: 'foe', max: 2, twoState: true },

  /* DEKORASI: max 1 rangka — sengaja tidak bisa dianimasikan.
     Prop ini digambar dengan this.add.image(), dan Phaser Image TIDAK
     punya komponen animasi sama sekali; play() akan diabaikan diam-diam.
     Mengizinkan >1 rangka hanya akan memberi slider yang tak berefek.
     Menggantinya dengan sprite lain tetap bisa — cuma tidak bergerak. */
  { id: 'bush',   label: 'Semak',  anim: null, fps: 0, keys: ['t_bush'],   pick: 'decor', max: 1 },
  { id: 'rock',   label: 'Batu',   anim: null, fps: 0, keys: ['t_rock'],   pick: 'decor', max: 1 },
  { id: 'flower', label: 'Bunga',  anim: null, fps: 0, keys: ['t_flower'], pick: 'decor', max: 1 },
  { id: 'tuft',   label: 'Rumput', anim: null, fps: 0, keys: ['t_tuft'],   pick: 'decor', max: 1 },
  { id: 'fence',  label: 'Pagar',   anim: null, fps: 0, keys: ['t_fence'],  pick: 'decor', max: 1 }
];

/* ---- WUJUD PEMAIN SAAT POWER-UP AKTIF ----------------------------
   Tiap power-up memberi pemain SET SPRITE yang berbeda, jadi pemain
   bisa melihat efeknya sedang jalan tanpa membaca HUD.

   Yang diganti hanya NAMA TOKOH-nya ("Mask Dude" -> "Ninja Frog", dst).
   Struktur di dalamnya sama persis untuk keempat tokoh (Idle 11, Run 12,
   Jump 1, Fall 1, Hit 7), jadi nomor rangka yang sudah dipilih user
   tetap sah dan tidak perlu 36 entri ASSET_MAP tambahan.

   'besar' = efek melati, yang memang mengubah wujud permanen sampai
   kena musuh — beda dari cincin/payung yang berdurasi. */
var PW_SKIN = {
  besar:  'Pink Man',      /* melati: badan membesar */
  cincin: 'Ninja Frog',    /* kebal                  */
  payung: 'Virtual Guy'    /* lompat ringan          */
};
var PLAYER_BASE_CHAR = 'Mask Dude';

/* Tokoh yang SEDANG dipakai pemain, dari state permainan.
   Mode 'besar' kalah dari power-up berdurasi supaya efek yang sedang
   berjalan (dan akan berakhir) selalu terlihat. */
function currentPlayerChar() {
  var pu = (typeof runState !== 'undefined' && runState) ? runState.powerup : null;
  if (pu && PW_SKIN[pu]) return PW_SKIN[pu];
  /* Mode 'besar' disimpan di sprite pemain (p.mode), bukan di runState —
     dicatat ke _playerMode saat berubah supaya bisa dibaca dari sini
     tanpa menyeret referensi sprite ke seluruh berkas. */
  if (_playerMode === 'besar' && PW_SKIN.besar) return PW_SKIN.besar;
  return PLAYER_BASE_CHAR;
}
/* Pasang ulang wujud pemain sesuai tokoh yang berlaku SEKARANG.
   Dipanggil saat power-up didapat/habis dan saat mode besar hilang.
   Animasi yang sedang jalan diputar ulang dengan nama bertokoh; kalau
   sedang statis (lompat/jatuh), teksturnya yang ditukar. */
function refreshPlayerSkin(p) {
  if (!p || !p.scene) return;
  var moving = p.body && Math.abs(p.body.velocity.x) > 5;
  var onGround = p.body && (p.body.blocked.down || p.body.touching.down);
  var id = !onGround ? (p.body && p.body.velocity.y < 0 ? 'player_jump' : 'player_fall')
                     : (moving ? 'player_run' : 'player_idle');
  playSlot(p, id, false);
}

/* Key tekstur "bayangan" untuk sebuah key pemain pada tokoh tertentu.
   t_groom_run1 + "Ninja Frog" -> "t_groom_run1__pwNinjaFrog" */
function skinKey(key, chr) {
  if (!chr || chr === PLAYER_BASE_CHAR) return key;
  return key + '__pw' + chr.replace(/[^A-Za-z]/g, '');
}

/* Entri untuk key pemain yang bukan bagian ASSET_MAP (rangka tambahan
   "__aN" hasil user menambah rangka). */
function skinBaseEntry(key) {
  var i = String(key).indexOf('__a');
  if (i < 0) return null;
  var slot = slotById(String(key).slice(0, i));
  if (!slot) return null;
  return extraEntryFor(slot, key, slotActiveKeys(slot).indexOf(key));
}

/* Semua key pemain yang perlu dibuatkan versi per-tokoh. */
function playerSkinKeys() {
  var out = [], i, j;
  var ids = ['player_idle', 'player_run', 'player_jump', 'player_fall', 'player_hurt'];
  for (i = 0; i < ids.length; i++) {
    var sl = slotById(ids[i]);
    if (!sl) continue;
    var ks = slotActiveKeys(sl);
    for (j = 0; j < ks.length; j++) out.push(ks[j]);
  }
  return out;
}

function slotById(id) {
  for (var i = 0; i < ANIM_SLOTS.length; i++) {
    if (ANIM_SLOTS[i].id === id) return ANIM_SLOTS[i];
  }
  return null;
}
/* Slot yang memiliki sebuah key tekstur (null kalau key itu berdiri
   sendiri, mis. tile tanah). */
function slotOfKey(key) {
  for (var i = 0; i < ANIM_SLOTS.length; i++) {
    if (ANIM_SLOTS[i].keys.indexOf(key) > -1) return ANIM_SLOTS[i];
  }
  return null;
}

var ASSET_MAP = [
  /* --- PEMAIN (48x68 = ukuran art prosedural groom) --- */
  { key: 't_groom_idle0', grp: 'Main Characters/Mask Dude/Idle', f:  0, w: 48, h: 68, label: 'Pengantin pria — diam 1', pick: 'char' },
  { key: 't_groom_idle1', grp: 'Main Characters/Mask Dude/Idle', f:  5, w: 48, h: 68, label: 'Pengantin pria — diam 2', pick: 'char' },
  { key: 't_groom_run0',  grp: 'Main Characters/Mask Dude/Run',  f:  0, w: 48, h: 68, label: 'Pengantin pria — lari 1', pick: 'char' },
  { key: 't_groom_run1',  grp: 'Main Characters/Mask Dude/Run',  f:  3, w: 48, h: 68, label: 'Pengantin pria — lari 2', pick: 'char' },
  { key: 't_groom_run2',  grp: 'Main Characters/Mask Dude/Run',  f:  6, w: 48, h: 68, label: 'Pengantin pria — lari 3', pick: 'char' },
  { key: 't_groom_run3',  grp: 'Main Characters/Mask Dude/Run',  f:  9, w: 48, h: 68, label: 'Pengantin pria — lari 4', pick: 'char' },
  { key: 't_groom_jump',  grp: 'Main Characters/Mask Dude/Jump', f:  0, w: 48, h: 68, label: 'Pengantin pria — lompat', pick: 'char' },
  { key: 't_groom_fall',  grp: 'Main Characters/Mask Dude/Fall', f:  0, w: 48, h: 68, label: 'Pengantin pria — jatuh',  pick: 'char' },
  { key: 't_groom_hurt',  grp: 'Main Characters/Mask Dude/Hit',  f:  0, w: 48, h: 68, label: 'Pengantin pria — kena',   pick: 'char' },

  /* --- MUSUH. Ukuran = sprite prosedural yang digantikan (ENEMY_BODY).
         E2 (cangkang) & E5 (2 tahap rusak) TIDAK diganti: pack tidak
         punya padanan frame-nya, dan mengganti separuh membuat musuh
         berubah wujud saat diinjak. --- */
  { key: 't_e1_0', grp: 'Main Characters/Pink Man/Run',    f: 0, w: 40, h: 40, label: 'Musuh 1 — rangka 1', pick: 'foe' },
  { key: 't_e1_1', grp: 'Main Characters/Pink Man/Run',    f: 6, w: 40, h: 40, label: 'Musuh 1 — rangka 2', pick: 'foe' },
  { key: 't_e3_0', grp: 'Main Characters/Mask Dude/Run',   f: 0, w: 44, h: 36, label: 'Musuh 3 — rangka 1', pick: 'foe' },
  { key: 't_e3_1', grp: 'Main Characters/Mask Dude/Run',   f: 4, w: 44, h: 36, label: 'Musuh 3 — rangka 2', pick: 'foe' },
  { key: 't_e3_2', grp: 'Main Characters/Mask Dude/Run',   f: 8, w: 44, h: 36, label: 'Musuh 3 — rangka 3', pick: 'foe' },
  { key: 't_e6_0', grp: 'Main Characters/Virtual Guy/Run', f: 0, w: 40, h: 40, label: 'Musuh 6 — rangka 1', pick: 'foe' },
  { key: 't_e6_1', grp: 'Main Characters/Virtual Guy/Run', f: 6, w: 40, h: 40, label: 'Musuh 6 — rangka 2', pick: 'foe' },

  /* --- TANAH per-stage. Tiap stage boleh beda blok terrain supaya
         paletnya cocok dengan langit stage itu. --- */
  /* TANAH dibagi dua lapis: baris PERMUKAAN (yang dipijak) punya sprite
     sendiri, terpisah dari ISIAN di bawahnya. Dulu keduanya memakai satu
     tekstur, sehingga baris rumput ikut terulang ke bawah dan tanah
     terlihat seperti tumpukan baris rumput. */
  { key: 't_gr_top_s0', grp: 'Terrain/Terrain', f: 20, w: 32, h: 32, fill: true, label: 'Permukaan tanah stage 1', pick: 'tile' },
  { key: 't_gr_top_s1', grp: 'Terrain/Terrain', f: 11, w: 32, h: 32, fill: true, label: 'Permukaan tanah stage 2', pick: 'tile' },
  { key: 't_gr_top_s2', grp: 'Terrain/Terrain', f:  2, w: 32, h: 32, fill: true, label: 'Permukaan tanah stage 3', pick: 'tile' },
  { key: 't_gr_top_s3', grp: 'Terrain/Terrain', f: 21, w: 32, h: 32, fill: true, label: 'Permukaan tanah stage 4', pick: 'tile' },
  { key: 't_gr_top_s4', grp: 'Terrain/Terrain', f: 13, w: 32, h: 32, fill: true, label: 'Permukaan tanah stage 5', pick: 'tile' },
  { key: 't_gr_top_s5', grp: 'Terrain/Terrain', f: 23, w: 32, h: 32, fill: true, label: 'Permukaan tanah stage 6', pick: 'tile' },

  { key: 't_gr_s0', grp: 'Terrain/Terrain', f:  0, w: 32, h: 32, fill: true, label: 'Isian tanah stage 1', pick: 'tile' },
  { key: 't_gr_s1', grp: 'Terrain/Terrain', f: 11, w: 32, h: 32, fill: true, label: 'Isian tanah stage 2', pick: 'tile' },
  { key: 't_gr_s2', grp: 'Terrain/Terrain', f:  2, w: 32, h: 32, fill: true, label: 'Isian tanah stage 3', pick: 'tile' },
  { key: 't_gr_s3', grp: 'Terrain/Terrain', f: 21, w: 32, h: 32, fill: true, label: 'Isian tanah stage 4', pick: 'tile' },
  { key: 't_gr_s4', grp: 'Terrain/Terrain', f: 13, w: 32, h: 32, fill: true, label: 'Isian tanah stage 5', pick: 'tile' },
  { key: 't_gr_s5', grp: 'Terrain/Terrain', f: 23, w: 32, h: 32, fill: true, label: 'Isian tanah stage 6', pick: 'tile' },

  /* --- BATA: blok terrain padat.
         BUKAN peti kayu — peti pernah dipakai dan hasilnya layar penuh
         kotak coklat ("MALAH RUSAK"). --- */
  { key: 't_brick', grp: 'Terrain/Terrain', f: 6, w: 32, h: 32, fill: true, label: 'Bata', pick: 'tile' },

  /* --- PIJAKAN MELAYANG. Memakai blok terrain penuh 48x48 yang
         diregangkan; dulu dirakit dari 3 sel grid, sekarang satu blok
         utuh dari sheet. --- */
  /* Pijakan melayang dirakit dari TIGA potong: ujung kiri - tengah -
     ujung kanan. Sebelumnya satu sprite persegi diregangkan mendatar
     (setScale(w/TILE, 1)), sehingga pijakan panjang tampak seperti
     gambar yang molor — teksturnya melar dan garis batanya ikut
     melebar. Dengan tiga potong, hanya bagian TENGAH yang diulang
     (tileSprite), kedua ujungnya digambar apa adanya. */
  { key: 't_plat',   grp: 'Terrain/Terrain', f: 0, w: 32, h: 32, fill: true, label: 'Pijakan — tengah',     pick: 'tile' },
  { key: 't_plat_l', grp: 'Terrain/Terrain', f: 0, w: 32, h: 32, fill: true, label: 'Pijakan — ujung kiri', pick: 'tile' },
  { key: 't_plat_r', grp: 'Terrain/Terrain', f: 0, w: 32, h: 32, fill: true, label: 'Pijakan — ujung kanan', pick: 'tile' },

  /* --- TIANG pengganti pipa hijau.
         TINGGI WAJIB 64/96/128: refreshBody() mengambil hitbox dari
         UKURAN TEKSTUR, sedangkan level menaruh pipa di y = GY - ph.
         Kalau tekstur lebih tinggi, rintangan memblokir rute. --- */
  { key: 't_pipe64',  grp: 'Terrain/Terrain', f: 0, stack: 1, w: 48, h:  64, label: 'Tiang pendek',  pick: 'tile' },
  { key: 't_pipe96',  grp: 'Terrain/Terrain', f: 0, stack: 2, w: 48, h:  96, label: 'Tiang sedang',  pick: 'tile' },
  { key: 't_pipe128', grp: 'Terrain/Terrain', f: 0, stack: 3, w: 48, h: 128, label: 'Tiang tinggi',  pick: 'tile' },

  /* --- OBJEK YANG DULU PROSEDURAL, sekarang ikut sprite (permintaan
         "saya mau semua nya pakai sprite kecuali background").

         UKURAN DI SINI BUKAN TEBAKAN. Tiap w/h disamakan dengan sprite
         prosedural yang digantikan (diukur lewat artW/artH), atau dengan
         petak tempat objek ditaruh. Kalau meleset, hitbox tidak cocok
         dan objek melayang / tenggelam — bug yang sudah pernah terjadi. --- */

  /* Koin: ikut petak 32 (this.coins.create memakai titik tengah petak). */
  { key: 't_coin0', grp: 'Items/Fruits/Apple', f:  0, w: 28, h: 28, label: 'Koin — rangka 1', pick: 'item' },
  { key: 't_coin1', grp: 'Items/Fruits/Apple', f:  4, w: 28, h: 28, label: 'Koin — rangka 2', pick: 'item' },
  { key: 't_coin2', grp: 'Items/Fruits/Apple', f:  8, w: 28, h: 28, label: 'Koin — rangka 3', pick: 'item' },
  { key: 't_coin3', grp: 'Items/Fruits/Apple', f: 12, w: 28, h: 28, label: 'Koin — rangka 4', pick: 'item' },

  /* Blok "?": WAJIB 32x32 — diletakkan di s.x+16 / s.y+16, yaitu tengah
     petak 32. Ukuran lain membuat blok tidak sejajar dengan bata di
     sebelahnya. 4 rangka animasi kedip + 1 rangka mati. */
  { key: 't_q0',     grp: 'Items/Boxes/Box2/Idle',  f: 0, w: 32, h: 32, fill: true, label: 'Blok ? — kedip 1', pick: 'item' },
  { key: 't_q1',     grp: 'Items/Boxes/Box2/Hit',   f: 0, w: 32, h: 32, fill: true, label: 'Blok ? — kedip 2', pick: 'item' },
  { key: 't_q2',     grp: 'Items/Boxes/Box2/Hit',   f: 1, w: 32, h: 32, fill: true, label: 'Blok ? — kedip 3', pick: 'item' },
  { key: 't_q3',     grp: 'Items/Boxes/Box2/Hit',   f: 2, w: 32, h: 32, fill: true, label: 'Blok ? — kedip 4', pick: 'item' },
  { key: 't_q_dead', grp: 'Items/Boxes/Box3/Idle',  f: 0, w: 32, h: 32, fill: true, label: 'Blok ? — sudah dipakai', pick: 'item' },

  /* Power-up: sprite prosedural 30x30. */
  { key: 't_pw_melati', grp: 'Items/Fruits/Bananas',  f: 0, w: 30, h: 30, label: 'Power-up melati', pick: 'item' },
  { key: 't_pw_cincin', grp: 'Items/Fruits/Cherries', f: 0, w: 30, h: 30, label: 'Power-up cincin', pick: 'item' },
  { key: 't_pw_payung', grp: 'Items/Fruits/Melon',    f: 0, w: 30, h: 30, label: 'Power-up payung', pick: 'item' },
  { key: 't_pw_buket',  grp: 'Items/Fruits/Strawberry', f: 0, w: 30, h: 30, label: 'Power-up buket (tembak)', pick: 'item' },
  /* Peluru sengaja KECIL (18px): harus terbaca sebagai proyektil, bukan
     benda yang bisa dipungut. */
  { key: 't_shot',      grp: 'Items/Fruits/Apple',    f: 0, w: 18, h: 18, label: 'Peluru buket', pick: 'item' },

  /* Percikan partikel — kecil, ukuran prosedural 6x6 terlalu kasar untuk
     sprite 16x16; dipakai 12x12 agar tetap mungil tapi terbaca. */
  { key: 't_spark', grp: 'Other/Confetti', f: 0, w: 12, h: 12, label: 'Percikan', pick: 'item' },

  /* Musuh E4 & E5: ukuran WAJIB sama dgn ENEMY_BODY (E4 36x48, E5 40x60). */
  { key: 't_e4',   grp: 'Traps/Trampoline/Idle',  f: 0, w: 36, h: 48, label: 'Musuh balon',        pick: 'item' },
  { key: 't_e5_0', grp: 'Items/Boxes/Box1/Idle',  f: 0, w: 40, h: 60, label: 'Musuh kotak — utuh', pick: 'item' },
  { key: 't_e5_1', grp: 'Items/Boxes/Box1/Break', f: 1, w: 40, h: 60, label: 'Musuh kotak — rusak', pick: 'item' },

  /* Garis akhir: TIANG tinggi 27x111 di art prosedural. Titik acuannya
     KAKI (setOrigin(0.5, 1)) dan ditaruh tepat di permukaan tanah, jadi
     berapa pun tingginya bendera selalu berdiri di atas tanah — dulu
     dipatok GY-80 dgn acuan tengah, sehingga membesarkannya membuat
     kakinya tenggelam.
     Sprite Checkpoint pack cuma 64x64 (persegi), jadi kanvasnya
     dipertahankan 32x112 dan sprite ditempel rata-bawah di dalamnya —
     bendera duduk di dasar tiang, tinggi tumbukan tetap seperti semula.

     BERKIBAR: "Checkpoint (Flag Idle)" punya 10 rangka animasi, dulu cuma
     rangka 0 yang dipakai sehingga benderanya diam. Sekarang 4 rangka
     diambil merata (0,2,4,6) dan dijalankan sebagai anim 'goal_wave'.
     Keempatnya WAJIB seukuran, kalau tidak hitbox berubah tiap rangka. */
  { key: 't_goal',  grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 0,
    w: 32, h: 112, label: 'Garis akhir — kibar 1', pick: 'item' },
  { key: 't_goal1', grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 2,
    w: 32, h: 112, label: 'Garis akhir — kibar 2', pick: 'item' },
  { key: 't_goal2', grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 4,
    w: 32, h: 112, label: 'Garis akhir — kibar 3', pick: 'item' },
  { key: 't_goal3', grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 6,
    w: 32, h: 112, label: 'Garis akhir — kibar 4', pick: 'item' },

  /* =================================================================
     OBJEK YANG TADINYA PROSEDURAL SEPENUHNYA
     -----------------------------------------------------------------
     Ditambahkan atas permintaan: "object2 yang belum pakai sprite juga
     perlu ditambahkan di dialog".

     Semua w/h di bawah DIUKUR dari art proseduralnya (artW/artH), bukan
     ditebak — kalau meleset, hitbox tidak cocok dan objek melayang.

     Bawaannya SENGAJA menunjuk kelompok yang mirip, tapi kalau kamu
     tidak suka tinggal ganti lewat dialog. Yang penting sekarang semua
     objek PUNYA slot, jadi bisa disentuh tanpa mengubah kode.
     ================================================================= */

  /* Kepingan puzzle — 4 rangka, sudah beranimasi (piece_float). */
  { key: 't_piece0', grp: 'Items/Fruits/Strawberry', f:  0, w: 40, h: 32, label: 'Kepingan — 1', pick: 'item' },
  { key: 't_piece1', grp: 'Items/Fruits/Strawberry', f:  4, w: 40, h: 32, label: 'Kepingan — 2', pick: 'item' },
  { key: 't_piece2', grp: 'Items/Fruits/Strawberry', f:  8, w: 40, h: 32, label: 'Kepingan — 3', pick: 'item' },
  { key: 't_piece3', grp: 'Items/Fruits/Strawberry', f: 12, w: 40, h: 32, label: 'Kepingan — 4', pick: 'item' },

  /* Pengantin wanita di garis akhir — gambar diam, bukan fisika. */
  { key: 't_bride', grp: 'Main Characters/Pink Man/Idle', f: 0, w: 48, h: 64, label: 'Pengantin wanita', pick: 'char' },

  /* BOS 3 fase. 96x117 — sprite pack jauh lebih kecil, tapi drawFit()
     memperbesarnya seragam & rata bawah, jadi tetap berdiri di tanah. */
  { key: 't_boss1', grp: 'Main Characters/Virtual Guy/Idle', f: 0, w: 96, h: 117, label: 'Bos — fase 1', pick: 'foe' },
  { key: 't_boss2', grp: 'Main Characters/Virtual Guy/Hit', f: 0, w: 96, h: 117, label: 'Bos — fase 2', pick: 'foe' },
  { key: 't_boss3', grp: 'Main Characters/Virtual Guy/Run', f: 0, w: 96, h: 117, label: 'Bos — fase 3', pick: 'foe' },

  /* Musuh E2 (bercangkang). Dua wujud: jalan & cangkang. Ukuran WAJIB
     sama — kalau beda, musuh melompat posisinya saat diinjak. */
  { key: 't_e2_walk',  grp: 'Main Characters/Ninja Frog/Run',  f: 0, w: 44, h: 40, label: 'Musuh 2 — jalan', pick: 'foe' },
  { key: 't_e2_shell', grp: 'Main Characters/Ninja Frog/Hit',  f: 0, w: 44, h: 40, label: 'Musuh 2 — cangkang', pick: 'foe' },

  /* DEKORASI DEPAN. stages:true = tekstur didaftarkan juga dengan
     akhiran _s0.._s5, karena scene_texKey() mencari kunci per-stage
     lebih dulu dan hanya jatuh ke kunci dasar kalau yang itu tak ada. */
  { key: 't_bush',   grp: 'Items/Fruits/Apple',  f: 0, w: 40, h: 25, label: 'Semak',  pick: 'decor', stages: true },
  { key: 't_rock',   grp: 'Terrain/Terrain',     f: 1, w: 40, h: 25, label: 'Batu',   pick: 'decor', stages: true },
  { key: 't_flower', grp: 'Items/Fruits/Cherries', f: 0, w: 25, h: 25, label: 'Bunga', pick: 'decor', stages: true },
  { key: 't_tuft',   grp: 'Terrain/Terrain',     f: 2, w: 35, h: 20, label: 'Rumput', pick: 'decor', stages: true },

  /* LATAR (parallax): AWAN & POHON TIDAK DIPETAKAN — disengaja.
     -----------------------------------------------------------------
     Percobaan pertama memetakannya ke "Background/*" dan hasilnya salah:
     Background/* BUKAN gambar awan, melainkan UBIN POLA bergaris 64x64
     berisi dua warna, 100% buram, tanpa bentuk apa pun — bahan wallpaper
     yang memang dibuat untuk diulang.

     Akibatnya awan "terganti" tapi berubah jadi kotak polos yang
     direntangkan ke 192x112 pada depth -70 dengan alpha rendah, sehingga
     di langit praktis tak terlihat -> terbaca sebagai "ga ke ganti".

     Pack ini adalah tileset platformer; TIDAK ADA art awan/pohon di
     dalamnya. Memaksakan sprite lain (buah, checkpoint, tile terrain)
     sebagai awan hanya menghasilkan benda melayang yang aneh. Jadi awan,
     pohon, dan rumpun bunga tetap PROSEDURAL, dan sengaja tidak muncul
     di dialog supaya tidak ada tombol yang terlihat rusak.

     Pagar tetap dipetakan: bentuknya memang kotak/tiang, dan tile
     terrain adalah padanan yang masuk akal untuk itu. */
  { key: 't_fence', grp: 'Terrain/Terrain', f: 4, w: 32, h: 24, label: 'Pagar', pick: 'decor', stages: true }
];

/* =====================================================================
   LATAR DARI BERKAS UNGGAHAN (assets/bg-sheet.png)
   ---------------------------------------------------------------------
   BG_MAP memetakan KUNCI LAPIS -> kotak di dalam bg-sheet.png.
   Kunci lapis sama persis dengan yang dipakai buildParallax(), mis.
   'pwr_far_0' (siluet jauh stage 1) atau 'sky_3' (langit stage 4).

   Koordinatnya menunjuk ke ISI kotak — bingkai ungu penanda sudah
   dikecualikan saat peta dibuat, jadi engine memotong apa adanya.

   Regenerasi setelah mengubah/menambah lapis:
       node assets/build-bg-sheet.cjs     (tulis PNG + JSON)
       node assets/inline-bg-map.cjs      (suntik JSON ke sini)
   ===================================================================== */
/* <<<BG_MAP:BEGIN — dibuat otomatis, jangan diedit tangan>>> */
/* Peta lapis latar: kunci lapis -> [x, y, w, h] di bg-sheet.png.
   Koordinat menunjuk ke ISI kotak (bingkai ungu dikecualikan).
   Sheet 3282x18708, 59 lapis, stage 1-6.
   Nomor yang tercetak di bawah tiap kotak = urutan di daftar ini. */
var BG_SHEET_SIZE = { w: 3282, h: 18708 };
var BG_MAP = {
  'sky_0': [9,9,540,960],
  '_sun_0': [557,9,540,960],
  'pwr_cl1_0': [1105,9,1080,960],
  'pwr_cl2_0': [2193,9,1080,960],
  'pwr_sea_0': [9,989,1080,960],
  'pwr_far_0': [1097,989,1080,960],
  'pwr_midm_0': [2185,989,1080,960],
  'pwr_tf_0': [9,1969,1080,960],
  'pwr_tn_0': [1097,1969,1080,960],
  'pwr_haze_0': [2185,1969,1080,960],
  'sky_1': [9,2961,540,960],
  '_sun_1': [557,2961,540,960],
  'pwr_cl1_1': [1105,2961,1080,960],
  'pwr_cl2_1': [2193,2961,1080,960],
  'pwr_sea_1': [9,3941,1080,960],
  'pwr_far_1': [1097,3941,1080,960],
  'pwr_midm_1': [2185,3941,1080,960],
  'pwr_tf_1': [9,4921,1080,960],
  'pwr_tn_1': [1097,4921,1080,960],
  'pwr_haze_1': [2185,4921,1080,960],
  'sky_2': [9,5913,540,960],
  '_sun_2': [557,5913,540,960],
  'pwr_cl1_2': [1105,5913,1080,960],
  'pwr_cl2_2': [2193,5913,1080,960],
  'pwr_far_2': [9,6893,1080,960],
  'pwr_midm_2': [1097,6893,1080,960],
  'pwr_tf_2': [2185,6893,1080,960],
  'pwr_tn_2': [9,7873,1080,960],
  'pwr_haze_2': [1097,7873,1080,960],
  'sky_3': [9,8865,540,960],
  '_sun_3': [557,8865,540,960],
  'pwr_cl1_3': [1105,8865,1080,960],
  'pwr_cl2_3': [2193,8865,1080,960],
  'pwr_far_3': [9,9845,1080,960],
  'pwr_midm_3': [1097,9845,1080,960],
  'pwr_tf_3': [2185,9845,1080,960],
  'pwr_tn_3': [9,10825,1080,960],
  'pwr_haze_3': [1097,10825,1080,960],
  'sky_4': [9,11817,540,960],
  '_sun_4': [557,11817,540,960],
  'pwr_cl1_4': [1105,11817,1080,960],
  'pwr_cl2_4': [2193,11817,1080,960],
  'pwr_far_4': [9,12797,1080,960],
  'pwr_midm_4': [1097,12797,1080,960],
  'pwr_tf_4': [2185,12797,1080,960],
  'pwr_tn_4': [9,13777,1080,960],
  'pwr_lm_4': [1097,13777,1080,960],
  'pwr_haze_4': [2185,13777,1080,960],
  'sky_5': [9,14769,540,960],
  '_sun_5': [557,14769,540,960],
  'pwr_cl1_5': [1105,14769,1080,960],
  'pwr_cl2_5': [2193,14769,1080,960],
  'pwr_sea_5': [9,15749,1080,960],
  'pwr_far_5': [1097,15749,1080,960],
  'pwr_midm_5': [2185,15749,1080,960],
  'pwr_tf_5': [9,16729,1080,960],
  'pwr_tn_5': [1097,16729,1080,960],
  'pwr_lm_5': [2185,16729,1080,960],
  'pwr_haze_5': [9,17709,1080,960]
};
/* <<<BG_MAP:END>>> */

/* Buat tekstur lapis latar dengan MEMOTONG dari bg-sheet.png.
   Mengembalikan true kalau berhasil; false berarti pemanggil harus
   memakai art prosedural (sheet belum diunggah, kunci tak ada di peta,
   atau kotaknya di luar batas gambar). */
function bgTextureFromSheet(scene, key, w, h) {
  var img = _assetImg.bg;
  if (!img) return false;
  var box = BG_MAP[key];
  if (!box) return false;
  /* box = [x, y, w, h] di dalam sheet */
  var sx = box[0], sy = box[1], sw = box[2], sh = box[3];
  if (sx < 0 || sy < 0 || sx + sw > img.width || sy + sh > img.height) return false;
  try {
    var cv = newCanvas(w, h);
    var cx = cv.getContext('2d');
    if (!cx) return false;
    cx.imageSmoothingEnabled = false;    /* pixel art: jangan diperhalus */
    /* Digambar sebesar tekstur yang diminta. Ukuran kotak di sheet
       biasanya sudah sama (540x960); kalau user menyimpan ulang dengan
       ukuran lain, gambarnya diskalakan alih-alih terpotong. */
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    scene.textures.addCanvas(key, cv);
    return true;
  } catch (e) { return false; }
}

var _assetImg = {};      /* name -> <img> yang sudah dimuat */
var _assetTried = false;

/* Cari URL sebuah slot. Placeholder "{{...}}" berarti belum diunggah. */
function assetUrl(name) {
  try {
    var els = document.querySelectorAll('#pwr-assets img[data-asset="' + name + '"]');
    for (var i = 0; i < els.length; i++) {
      var v = (els[i].getAttribute('src') || '').trim();
      if (!v || v.indexOf('{{') > -1) continue;
      return v;
    }
    return null;
  } catch (e) { return null; }
}

/* Muat SEMUA slot yang terisi, lalu panggil cb.
   Selalu memanggil cb (ada timeout), jadi game tetap boot walau
   sebagian atau seluruh unggahan gagal. */
function loadAssets(cb) {
  if (_assetTried) { cb(); return; }
  _assetTried = true;
  var pending = 0, done = false, timer = null;
  var finish = function () {
    if (done) return;
    done = true;
    if (timer) { clearTimeout(timer); timer = null; }
    cb();
  };
  for (var i = 0; i < ASSETS.length; i++) {
    (function (a) {
      var url = assetUrl(a.name);
      if (!url) return;
      pending++;
      var im = new Image();
      /* crossOrigin supaya kanvas tidak ter-taint saat drawImage. */
      im.crossOrigin = 'anonymous';
      var settle = function (ok) {
        if (ok) _assetImg[a.name] = im;
        if (--pending <= 0) finish();
      };
      im.onload = function () { settle(im.width > 0 && im.height > 0); };
      im.onerror = function () { settle(false); };
      im.src = url;
    })(ASSETS[i]);
  }
  if (!pending) { finish(); return; }
  /* Jangan menggantung selamanya kalau ada URL yang lambat atau mati. */
  timer = setTimeout(finish, 8000);
}

function newCanvas(w, h) {
  var cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  var cx = cv.getContext('2d');
  if (cx) cx.imageSmoothingEnabled = false;
  return { cv: cv, cx: cx };
}

/* Gambar potongan ke kanvas w x h dengan SKALA SERAGAM + RATA BAWAH.
   Seragam supaya sprite tidak gepeng; rata bawah supaya kaki menyentuh
   dasar kanvas — titik yang dipakai body fisika sebagai pijakan. Tanpa
   ini sprite tampak melayang di atas tanah. */
function drawFit(cx, img, sx, sy, sw, sh, w, h) {
  var k = Math.min(w / sw, h / sh);
  var dw = Math.round(sw * k), dh = Math.round(sh * k);
  cx.drawImage(img, sx, sy, sw, sh, Math.round((w - dw) / 2), h - dh, dw, dh);
}

/* Isi kotak tujuan PENUH tanpa merusak proporsi: sumbernya dipotong
   (di-crop) di tengah, bukan diregangkan.

   BUG YANG DIPERBAIKI (screenshot user: "banyak object ke-stretch /
   merentang jadi rusak tampilannya", terlihat di tanah & latar):
   tile ber-'fill:true' dulu digambar dgn drawImage(..., sz.w, bodyH)
   yang MEMAKSA sumber apa pun ke kotak 32x32. Kelompok Terrain berisi
   11 rangka yang TIDAK persegi — ada yang 48x5 (rasio 9.6:1). Memilih
   salah satunya membuat gambarnya melar jadi coreng, bukan tile.

   Cover dipakai (bukan drawFit/contain) karena tile HARUS menutup
   petaknya penuh; menyisakan tepi kosong akan membuat garis celah di
   antara petak tanah. */
function drawCover(cx, img, sx, sy, sw, sh, dx, dy, w, h) {
  var k = Math.max(w / sw, h / sh);       /* skala terkecil yg menutup */
  var cw = Math.min(sw, w / k);           /* lebar sumber yang dipakai */
  var ch = Math.min(sh, h / k);           /* tinggi sumber yang dipakai */
  cx.drawImage(img,
    sx + (sw - cw) / 2, sy + (sh - ch) / 2, cw, ch,   /* potong di TENGAH */
    dx, dy, w, h);
}

/* ---- PENGGANTIAN SPRITE (dialog "Ganti sprite") ----
   Simpanan: key tekstur -> { grp, f }. Kalau sebuah key ada di sini,
   nilainya menang atas ASSET_MAP. Disimpan di localStorage supaya
   pilihan bertahan setelah muat ulang. */
/* BAWAAN yang di-bake ke kode. Isi lewat tombol "Salin nilai" di panel
   tuner, lalu tempel menimpa blok ini — dengan begitu setelan berlaku
   untuk SEMUA tenant, bukan cuma browser yang pernah mengaturnya.
   localStorage (hasil utak-atik di perangkat ini) menimpa nilai di sini. */
var SWAP_DEF = {
  't_brick':   { grp: 'Terrain/Terrain', f: 19 },   /* #614 — bata */
  't_bush':    { grp: 'Traps/Sand Mud Ice/Mud Particle', f: 0 },  /* #722 — semak */
  't_gr_s0':   { grp: 'Terrain/Terrain', f: 20 },   /* #615 — tanah stage 1 */
  /* KETIGA potongan pijakan WAJIB memakai rangka yang sama.
     Bug yang diperbaiki ("kok jadi melayang ini pijakannya"): saat
     pijakan dipecah jadi kiri-tengah-kanan, hanya 't_plat' yang punya
     penggantian ter-bake. Dua ujungnya diam-diam tetap memakai rangka
     bawaan (#595) yang bentuk & warnanya lain, sehingga ujung pijakan
     tidak menyambung dengan tengahnya — terbaca sebagai papan
     menggantung tanpa tumpuan. */
  't_plat':    { grp: 'Terrain/Terrain', f: 19 },   /* #614 — pijakan tengah */
  't_plat_l':  { grp: 'Terrain/Terrain', f: 19 },   /* #614 — ujung kiri  */
  't_plat_r':  { grp: 'Terrain/Terrain', f: 19 },   /* #614 — ujung kanan */
  't_q_dead':  { grp: 'Terrain/Terrain', f: 19 },   /* #614 — blok ? sudah dipukul */
  't_rock':    { grp: 'Terrain/Terrain', f: 24 }    /* #619 — batu */
};

/* POTONGAN YANG MERAKIT SATU BENDA.
   -------------------------------------------------------------------
   Beberapa benda digambar dari beberapa tekstur yang berdampingan:
   pijakan = ujung kiri + tengah + ujung kanan. Ketiganya HARUS memakai
   rangka yang sama; kalau tidak, sambungannya tidak nyambung dan
   pijakan terbaca sebagai papan melayang tanpa tumpuan.

   (Tanah permukaan vs isian SENGAJA tidak dimasukkan: keduanya memang
   dirancang boleh berbeda — baris atas rumput, bawahnya tanah.) */
var PIECE_SETS = [
  ['t_plat_l', 't_plat', 't_plat_r']
];
function siblingKeysOf(key) {
  for (var i = 0; i < PIECE_SETS.length; i++) {
    if (PIECE_SETS[i].indexOf(key) > -1) {
      return PIECE_SETS[i].filter(function (k) { return k !== key; });
    }
  }
  return [];
}

var SWAP_KEY = 'pwr_swap_v1';
var SWAP = {};
function loadSwap() {
  var k;
  /* mulai dari bawaan yang di-bake ... */
  SWAP = {};
  for (k in SWAP_DEF) {
    if (Object.prototype.hasOwnProperty.call(SWAP_DEF, k)) SWAP[k] = SWAP_DEF[k];
  }
  /* ... lalu timpa dengan simpanan lokal kalau ada */
  try {
    var raw = localStorage.getItem(SWAP_KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) SWAP[k] = o[k];
      }
    }
  } catch (e) {}
}
function saveSwap() {
  try { localStorage.setItem(SWAP_KEY, JSON.stringify(SWAP)); } catch (e) {}
}
loadSwap();

/* ---- UKURAN SPRITE (slider perbesar/perkecil) ----
   SCALE[key] = pengali ukuran, 1 = bawaan. Rentang dijaga supaya sprite
   tidak menghilang atau membanjiri layar.

   PENTING — ini BUKAN sekadar memperkecil gambar. Ukuran tekstur yang
   dihasilkan ikut berubah, dan SEMUA hitbox diturunkan dari ukuran
   tekstur (lihat bodyFor / spawnEnemy / t_pipe*). Jadi kalau bos dikecilkan,
   kotak tumbukannya ikut mengecil — bukan cuma gambarnya yang kecil
   sementara ruang yang dipakai tetap besar. */
/* Bawaan ukuran yang di-bake — sama polanya dengan SWAP_DEF.

   BENDERA AKHIR STAGE (goal) diperbesar 2,5x pada SEMUA rangkanya.
   Sepuluh key, bukan satu, karena slot 'goal' kini memakai 10 rangka
   Checkpoint (Flag Idle) sedangkan ASSET_MAP hanya menyediakan 4 key
   bawaan (t_goal, t_goal1..3); rangka ke-5 dan seterusnya hidup di key
   tambahan 'goal__a5'..'goal__a10' (lihat slotActiveKeys).

   Kesepuluhnya WAJIB bernilai sama: setelan ukuran disimpan per rangka,
   jadi kalau salah satu tertinggal, bendera akan berkedip besar-kecil
   mengikuti animasinya. Ada uji yang menjaga ini (verify-scale). */
var SCALE_DEF = {
  't_goal':      2.5,
  't_goal1':     2.5,
  't_goal2':     2.5,
  't_goal3':     2.5,
  'goal__a5':    2.5,
  'goal__a6':    2.5,
  'goal__a7':    2.5,
  'goal__a8':    2.5,
  'goal__a9':    2.5,
  'goal__a10':   2.5,

  /* PENGANTIN PRIA dikecilkan 0,9x — SEMUA rangkanya, tanpa kecuali.
     Kalau satu rangka tertinggal di 1,0, badan pemain akan berkedip
     besar-kecil mengikuti animasi lari, dan yang lebih parah: HITBOX
     ikut berubah tiap rangka (lihat setPlayerBody), sehingga muat/tidak
     muatnya pemain di celah jadi berubah-ubah tanpa sebab yang terlihat. */
  't_groom_idle0': 0.9,
  't_groom_idle1': 0.9,
  't_groom_run0':  0.9,
  't_groom_run1':  0.9,
  't_groom_run2':  0.9,
  't_groom_run3':  0.9,
  't_groom_jump':  0.9,
  't_groom_fall':  0.9,
  't_groom_hurt':  0.9,

  /* POWER-UP BUKET diperbesar 2,05x (30 -> 61px) supaya jelas terlihat
     beda dari melati/cincin/payung yang sama-sama 30px — buket adalah
     satu-satunya power-up yang membuka kemampuan menembak, jadi pemain
     harus bisa mengenalinya sekilas. */
  't_pw_buket':    2.05,

  /* PELURU dikecilkan 0,55x (18 -> 10px): harus terbaca sebagai
     proyektil, bukan benda yang bisa dipungut.
     ⚠️ Lihat fireShot(): ukuran hitbox peluru diturunkan DARI TEKSTUR,
     bukan angka mati — kalau dipatok 14px seperti dulu, mengecilkan
     gambar justru menyisakan tumbukan tak terlihat 4px di tiap sisi. */
  't_shot':        0.55
};

var SCALE_KEY = 'pwr_scale_v1';
var SCALE = {};
var SCALE_MIN = 0.4, SCALE_MAX = 2.5;
function loadScale() {
  var k;
  SCALE = {};
  for (k in SCALE_DEF) {
    if (Object.prototype.hasOwnProperty.call(SCALE_DEF, k)) SCALE[k] = SCALE_DEF[k];
  }
  try {
    var raw = localStorage.getItem(SCALE_KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) SCALE[k] = o[k];
      }
    }
  } catch (e) {}
}
function saveScale() {
  try { localStorage.setItem(SCALE_KEY, JSON.stringify(SCALE)); } catch (e) {}
}
loadScale();

/* OBJEK YANG TIDAK BOLEH DISKALA.
   -------------------------------------------------------------------
   Generator level menaruh benda-benda ini pada GRID TETAP 32px:
     bata & blok "?"  -> s.x + 16, s.y + 16   (tengah petak 32)
     tiang/pipa       -> s.y + s.ph / 2       (tinggi 64/96/128)
     pijakan melayang -> setScale(s.w / TILE) (sudah diregangkan sendiri)
     tanah            -> ubin berulang selebar 32

   Kalau teksturnya diperbesar/diperkecil, gambar tidak lagi sejajar
   dengan petaknya: muncul celah atau tumpang-tindih, dan rute lompat
   yang sudah dihitung bisa jadi tak terlewati. Jadi slider ukuran
   sengaja TIDAK berlaku untuk key ini — dan dialog menyembunyikannya
   supaya tidak terlihat seperti tombol rusak. */
function scalable(key) {
  /* t_plat_l / t_plat_r ikut terkunci: ketiganya potongan yang dirakit
     jadi satu pijakan, ukurannya ditentukan lebar pijakan di level. */
  return !/^t_(brick|plat|plat_l|plat_r|pipe\d+|gr_s\d|gr_top_s\d|q\d|q_dead)$/.test(key);
}

/* Setelan ukuran & geser disimpan PER RANGKA, memakai key rangka itu
   sendiri ("t_e1_0", "bride__a3", ...). Jadi satu objek berangka dua
   boleh punya ukuran/geseran berbeda di tiap rangkanya.

   Dulu semua rangka dipaksa memakai setelan rangka pertama, supaya
   objek tidak berkedip berubah ukuran. Sekarang perbedaan itu justru
   yang diminta, jadi yang dijaga bukan lagi "semua rangka sama", tapi
   HITBOX-nya: body Phaser hanya disetel saat sprite dibuat / ganti state
   (refreshBody(), setPlayerBody(), enemyBodySize()), TIDAK tiap rangka
   animasi. Jadi ukuran tumbukan mengikuti rangka pertama dan tidak ikut
   berubah-ubah walau tiap rangka digambar berbeda. */
function settingKey(key) {
  /* Salinan wujud power-up ("..__pwNinjaFrog") memakai setelan key
     ASLINYA. Wujud itu hanya berganti tokoh, bukan objek lain — kalau
     punya ukuran sendiri, pemain akan berubah besar saat power-up
     menyala dan hitbox-nya tidak lagi cocok. */
  var i = String(key).indexOf('__pw');
  var k = i < 0 ? String(key) : String(key).slice(0, i);
  /* RANGKA TAMBAHAN ("shot__a2", "goal__a7") TIDAK lagi mewarisi setelan
     rangka pertama — tiap rangka bebas punya ukuran & posisi sendiri
     (keputusan user: "tiap rangka bebas sendiri").
     -------------------------------------------------------------------
     Dulu di sini setelan rangka tambahan dipaksa mengikuti rangka 1,
     untuk mencegah objek BERKEDIP besar-kecil saat rangka tambahan
     lahir dengan skala 1,0 padahal rangka 1 sudah diskalakan. Tapi itu
     merenggut kemampuan menyetel tiap rangka sendiri-sendiri.

     Kedip dicegah dengan cara yang tidak mengunci: saat user MENAMBAH
     rangka lewat dialog, nilai skala/geser rangka baru DI-SEED dari
     rangka sebelumnya (lihat handler [data-frame-add]) — jadi awalnya
     seragam, tapi setelah itu boleh diubah. Rangka tambahan yang di-bake
     (goal__a5..a10) sudah punya entri SCALE_DEF sendiri, jadi tidak
     bergantung pada pewarisan ini. */
  /* Salinan per-stage ("t_bush_s3") juga memakai setelan kunci dasar.
     Tanpa ini, slider ukuran/geser pada dekorasi tidak berpengaruh sama
     sekali di dalam game — persis seperti bug penggantian sprite-nya. */
  return baseKeyOf(k);
}

function scaleOf(key) {
  key = settingKey(key);
  if (!scalable(key)) return 1;
  var s = SCALE[key];
  if (typeof s !== 'number' || !isFinite(s)) return 1;
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
}

/* ---- GESER TEGAK (slider naik/turun) ----
   NUDGE[key] = pergeseran dalam piksel; negatif = NAIK, positif = TURUN.

   Dikerjakan dengan MENGGAMBAR ULANG sprite di dalam kanvasnya, bukan
   menggeser sprite di dunia. Alasannya sama dengan slider ukuran: hitbox
   diturunkan dari kanvas tekstur, jadi menggeser isi kanvas otomatis
   menggeser kotak tumbukannya juga. Kalau sprite digeser lewat posisi
   dunia, gambar naik tapi tumbukannya tetap di tempat lama.

   Kanvas DIPERTINGGI sebanyak pergeseran supaya bagian yang keluar tidak
   terpotong — tekstur tetap memuat seluruh gambar. */
var NUDGE_KEY = 'pwr_nudge_v1';
/* Kosong. Dulu berisi 't_goal': -9 — tambalan manual untuk menarik
   bendera yang tenggelam. Sesudah titik acuannya diperbaiki (kaki
   dipatok ke permukaan tanah, bukan tengah ke GY-80), geseran itu
   justru MENGANGKAT bendera 9px dari tanah. Dibiarkan kosong supaya
   benderanya benar-benar menapak. */
var NUDGE_DEF = {};
var NUDGE = {};
var NUDGE_MIN = -24, NUDGE_MAX = 24;
function loadNudge() {
  var k;
  NUDGE = {};
  for (k in NUDGE_DEF) {
    if (Object.prototype.hasOwnProperty.call(NUDGE_DEF, k)) NUDGE[k] = NUDGE_DEF[k];
  }
  try {
    var raw = localStorage.getItem(NUDGE_KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) NUDGE[k] = o[k];
      }
    }
  } catch (e) {}
}
function saveNudge() {
  try { localStorage.setItem(NUDGE_KEY, JSON.stringify(NUDGE)); } catch (e) {}
}
loadNudge();

function nudgeOf(key) {
  key = settingKey(key);
  /* Objek yang terikat grid tidak boleh digeser — alasannya sama dengan
     scalable(): posisinya sudah dipatok generator level. */
  if (!scalable(key)) return 0;
  var v = NUDGE[key];
  if (typeof v !== 'number' || !isFinite(v)) return 0;
  return Math.max(NUDGE_MIN, Math.min(NUDGE_MAX, Math.round(v)));
}

/* Ukuran tekstur yang BERLAKU untuk sebuah entri, sesudah slider.
   Dibulatkan & minimal 4px supaya kanvas tidak pernah 0. */
function sizeOf(m) {
  var k = scaleOf(m.key);
  var n = nudgeOf(m.key);
  return {
    w: Math.max(4, Math.round(m.w * k)),
    /* Kanvas ditinggikan sebesar pergeseran supaya gambar tidak terpotong
       saat digeser naik/turun. |n| dipakai karena arah mana pun sama-sama
       membutuhkan ruang ekstra. */
    h: Math.max(4, Math.round(m.h * k) + Math.abs(n))
  };
}

/* ---- PENGGANTIAN TINGKAT SLOT (satu objek sekaligus) ----

   SWAP_ANIM[slotId] = [ {grp,f}, {grp,f}, ... ] — DAFTAR RANGKA yang
   dipakai objek ini, berurutan, satu entri per rangka.

   Dulu bentuknya { grp, n }: "pakai kelompok X sebanyak n rangka".
   Bentuk itu TIDAK BISA menyatakan susunan yang sebenarnya dipakai game.
   Contoh nyata: pengantin diam memakai rangka 0 dan 5 dari kelompok Idle
   yang berisi 11 rangka. { grp:'Idle', n:2 } akan diartikan sebagai
   rangka 0 dan 10 (sebaran merata), bukan 0 dan 5 — jadi apa yang
   ditampilkan dialog tidak pernah sama dengan apa yang dipakai game, dan
   mencampur rangka dari dua kelompok berbeda mustahil.

   Dengan daftar eksplisit, susunan bisa ditampilkan apa adanya dan tiap
   rangka bebas diambil dari kelompok mana pun. */
var SWAP_ANIM_KEY = 'pwr_swapanim_v1';
var SWAP_ANIM_DEF = {
  'coin': [
    { grp: 'Items/Fruits/Bananas', f: 0 },   /* #114 */
    { grp: 'Items/Fruits/Bananas', f: 1 },   /* #115 */
    { grp: 'Items/Fruits/Bananas', f: 2 },   /* #116 */
    { grp: 'Items/Fruits/Bananas', f: 3 },   /* #117 */
    { grp: 'Items/Fruits/Bananas', f: 4 },   /* #118 */
    { grp: 'Items/Fruits/Bananas', f: 5 },   /* #119 */
    { grp: 'Items/Fruits/Bananas', f: 6 },   /* #120 */
    { grp: 'Items/Fruits/Bananas', f: 7 }    /* #121 */
  ],   /* 8 rangka */
  /* foe2 = dua WUJUD (utuh / cangkang) yang dipilih logika permainan,
     bukan siklus animasi — twoState, jadi tidak pernah diputar. */
  'foe2': [
    { grp: 'Main Characters/Ninja Frog/Run', f: 0 },          /* #322 utuh    */
    { grp: 'Main Characters/Ninja Frog/Double Jump', f: 1 }   /* #297 cangkang */
  ],   /* 2 wujud */
  'foe3': [
    { grp: 'Main Characters/Pink Man/Wall Jump', f: 3 },   /* #380 */
    { grp: 'Main Characters/Pink Man/Wall Jump', f: 0 }    /* #377 */
  ],   /* 2 rangka */
  'foe4': [
    { grp: 'Items/Fruits/Collected', f: 3 },   /* #151 */
    { grp: 'Items/Fruits/Collected', f: 4 }    /* #152 */
  ],   /* 2 rangka */
  'goal': [
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 0 },   /* #33 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 1 },   /* #34 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 2 },   /* #35 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 3 },   /* #36 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 4 },   /* #37 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 5 },   /* #38 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 6 },   /* #39 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 7 },   /* #40 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 8 },   /* #41 */
    { grp: 'Items/Checkpoints/Checkpoint/Checkpoint (Flag Idle)', f: 9 }    /* #42 */
  ],   /* 10 rangka */
  'piece': [
    { grp: 'Traps/Arrow/Hit', f: 0 },   /* #628 */
    { grp: 'Traps/Arrow/Hit', f: 1 },   /* #629 */
    { grp: 'Traps/Arrow/Hit', f: 2 },   /* #630 */
    { grp: 'Traps/Arrow/Hit', f: 3 }    /* #631 */
  ],   /* 4 rangka */
  'qblock': [
    { grp: 'Items/Boxes/Box1/Hit', f: 0 },   /* #13 */
    { grp: 'Items/Boxes/Box1/Hit', f: 1 },   /* #14 */
    { grp: 'Items/Boxes/Box1/Hit', f: 2 }    /* #15 */
  ],   /* 3 rangka */
  /* PELURU kini BERGERAK (dulu 1 rangka diam). Rangka 0,1,2,5 dari
     "Collected" — kelompok percikan, jadi peluru terbaca sebagai
     kelopak yang melesat, bukan buah yang melayang. */
  'shot': [
    { grp: 'Items/Fruits/Collected', f: 0 },   /* #148 */
    { grp: 'Items/Fruits/Collected', f: 1 },   /* #149 */
    { grp: 'Items/Fruits/Collected', f: 2 },   /* #150 */
    { grp: 'Items/Fruits/Collected', f: 5 }    /* #153 */
  ]    /* 4 rangka */
};
var SWAP_ANIM = {};
/* Terima BENTUK LAMA { grp, n } maupun bentuk baru [ {grp,f}, ... ].
   Nilai lama bisa sudah tersimpan di localStorage pengguna atau ter-bake
   di SWAP_ANIM_DEF, jadi membuangnya begitu saja akan menghapus hasil
   penyetelan yang sudah dilakukan. */
function normalizeAnimList(v, slot) {
  var out = [], i;
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Array]') {
    for (i = 0; i < v.length; i++) {
      if (v[i] && SHEET_MAP[v[i].grp] && SHEET_MAP[v[i].grp].length) {
        out.push({ grp: v[i].grp, f: Math.min(v[i].f || 0, SHEET_MAP[v[i].grp].length - 1) });
      }
    }
    return out.length ? out : null;
  }
  /* bentuk lama: sebarkan n rangka merata sepanjang kelompok */
  if (v.grp && SHEET_MAP[v.grp] && SHEET_MAP[v.grp].length) {
    var avail = SHEET_MAP[v.grp].length;
    var n = Math.max(1, Math.min(slot ? (slot.max || 8) : 8, v.n || 1, avail));
    for (i = 0; i < n; i++) {
      out.push({ grp: v.grp, f: n <= 1 ? 0 : Math.round(i * (avail - 1) / (n - 1)) });
    }
    return out;
  }
  return null;
}
function loadSwapAnim() {
  var k;
  SWAP_ANIM = {};
  for (k in SWAP_ANIM_DEF) {
    if (Object.prototype.hasOwnProperty.call(SWAP_ANIM_DEF, k)) SWAP_ANIM[k] = SWAP_ANIM_DEF[k];
  }
  try {
    var raw = localStorage.getItem(SWAP_ANIM_KEY);
    if (raw) {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) SWAP_ANIM[k] = o[k];
      }
    }
  } catch (e) {}
  /* satukan bentuknya SEKALI di sini, supaya sisa kode cuma tahu daftar */
  for (k in SWAP_ANIM) {
    if (!Object.prototype.hasOwnProperty.call(SWAP_ANIM, k)) continue;
    var norm = normalizeAnimList(SWAP_ANIM[k], slotById(k));
    if (norm) SWAP_ANIM[k] = norm; else delete SWAP_ANIM[k];
  }
}
function saveSwapAnim() {
  try { localStorage.setItem(SWAP_ANIM_KEY, JSON.stringify(SWAP_ANIM)); } catch (e) {}
}
loadSwapAnim();

/* Susunan rangka BAWAAN sebuah slot, dibaca dari ASSET_MAP.
   Inilah yang benar-benar dipakai game kalau tidak diganti — mis.
   pengantin diam = Idle#0 + Idle#5. Dialog memakai ini supaya yang
   ditampilkan sama persis dengan yang berjalan. */
function slotDefaultFrames(slot) {
  var out = [];
  for (var i = 0; i < slot.keys.length; i++) {
    var m = swapEntry(slot.keys[i]);
    if (m) out.push({ grp: m.grp, f: m.f || 0 });
  }
  return out;
}

/* Susunan rangka yang BERLAKU sekarang: hasil ganti kalau ada, kalau
   tidak ya bawaan. Selalu berupa daftar {grp,f} — tidak pernah null,
   jadi pemanggil tidak perlu menangani dua kemungkinan bentuk. */
function slotFrames(slot) {
  var s = SWAP_ANIM[slot.id];
  /* Terima juga bentuk lama {grp,n} kalau ada yang menulis langsung ke
     SWAP_ANIM tanpa lewat loadSwapAnim() — lebih baik dinormalkan di
     sini daripada objeknya berakhir tanpa rangka sama sekali. */
  if (s && !s.length && s.grp) s = normalizeAnimList(s, slot);
  if (s && s.length) return s.slice(0, Math.max(1, slot.max || 8));
  return slotDefaultFrames(slot);
}

/* =====================================================================
   "BELUM TERSIMPAN DI SOURCE" — penanda hijau di dialog Ganti Sprite
   ---------------------------------------------------------------------
   Ada DUA lapis nilai untuk tiap setelan:
     1. *_DEF   — sudah di-BAKE ke index.js (permanen, ikut ke semua tamu)
     2. localStorage — hasil utak-atik di browser ini saja (sementara)

   loadSwap()/loadScale()/… menyalin *_DEF lalu MENIMPA-nya dengan isi
   localStorage. Jadi nilai yang sedang berlaku (SWAP/SCALE/NUDGE/
   SWAP_ANIM) tidak memberi tahu apakah ia sudah aman di kode atau baru
   ada di localStorage.

   Fungsi di bawah membandingkan nilai BERLAKU dengan *_DEF. Beda =
   "belum tersimpan di source" = ditandai hijau, dan memang akan HILANG
   kalau tombol "Hapus data tersimpan" ditekan.

   *_DEF tidak pernah diubah setelah dimuat, jadi tak perlu menyalin
   baseline — cukup dibaca langsung. */
function _defScale(key) {
  var v = SCALE_DEF[settingKey(key)];
  return (typeof v === 'number' && isFinite(v)) ? v : 1;
}
function _defNudge(key) {
  var v = NUDGE_DEF[settingKey(key)];
  return (typeof v === 'number' && isFinite(v)) ? Math.round(v) : 0;
}
/* Ukuran rangka ini belum di-bake? */
function scaleUnsaved(key) { return scaleOf(key) !== _defScale(key); }
/* Geser tegak rangka ini belum di-bake? */
function nudgeUnsaved(key) { return nudgeOf(key) !== _defNudge(key); }

/* Sprite per-key (objek tanpa slot) belum di-bake? */
function swapUnsaved(key) {
  var cur = SWAP[key], def = SWAP_DEF[key];
  if (!cur && !def) return false;
  if (!cur || !def) return true;
  return cur.grp !== def.grp || cur.f !== def.f;
}

/* Susunan rangka slot belum di-bake?
   Dibandingkan per-rangka: jumlah rangka boleh sama tapi isinya beda. */
function slotAnimUnsaved(slot) {
  if (!slot) return false;
  var cur = SWAP_ANIM[slot.id], def = SWAP_ANIM_DEF[slot.id];
  var curN = normalizeAnimList(cur, slot) || null;
  var defN = normalizeAnimList(def, slot) || null;
  if (!curN && !defN) return false;
  if (!curN || !defN) return true;
  if (curN.length !== defN.length) return true;
  for (var i = 0; i < curN.length; i++) {
    if (curN[i].grp !== defN[i].grp || curN[i].f !== defN[i].f) return true;
  }
  return false;
}

/* Ringkasan untuk SATU baris daftar: apakah ada apa pun pada objek ini
   yang belum tersimpan di kode (sprite, susunan rangka, ukuran, geser)?
   Memeriksa SEMUA rangka — kalau hanya rangka 1 yang dilihat, penyetelan
   di rangka 2 tidak akan tertandai. */
function entryUnsaved(m, slot) {
  if (slot) {
    if (slotAnimUnsaved(slot)) return true;
    var keys = slotActiveKeys(slot);
    for (var i = 0; i < keys.length; i++) {
      if (swapUnsaved(keys[i])) return true;
      if (scaleUnsaved(keys[i]) || nudgeUnsaved(keys[i])) return true;
    }
    return false;
  }
  return swapUnsaved(m.key) || scaleUnsaved(m.key) || nudgeUnsaved(m.key);
}

/* Apakah slot ini sedang memakai susunan selain bawaannya. */
function slotIsCustom(slot) {
  var s = SWAP_ANIM[slot.id];
  if (!s || !s.length) return false;
  var d = slotDefaultFrames(slot);
  if (d.length !== s.length) return true;
  for (var i = 0; i < d.length; i++) {
    if (d[i].grp !== s[i].grp || d[i].f !== s[i].f) return true;
  }
  return false;
}

/* Sumber potongan yang BERLAKU untuk sebuah entri.
   Urutan menang: slot (SWAP_ANIM) -> per-key (SWAP) -> bawaan ASSET_MAP. */
/* Kunci ASLI sebuah tekstur, membuang akhiran "_sN" milik salinan
   per-stage.

   BUG YANG DIPERBAIKI (dilaporkan: "banyak object yang ketika diubah
   spritenya ga mengupdate tampilan game"): dekorasi digambar memakai
   kunci per-stage (t_bush_s0..s5), sedangkan dialog menyimpan pilihan
   user di kunci DASAR (t_bush). effectiveSrc() mencari SWAP['t_bush_s0']
   yang tidak pernah ada, jadi pilihan user diabaikan diam-diam dan
   dekorasi tetap memakai gambar bawaan. Terkena SEMUA dekorasi: semak,
   batu, bunga, rumput, pagar. */
function baseKeyOf(key) {
  var m = /^(.*)_s\d+$/.exec(String(key));
  if (!m) return key;
  /* HANYA potong kalau kunci dasarnya memang ada di ASSET_MAP.
     't_gr_s0' dan 't_gr_top_s0' JUGA berakhiran "_s<angka>", tapi itu
     kunci sungguhan (tanah per-stage), bukan salinan — memotongnya jadi
     't_gr' akan membuat pilihan user hilang, bukan diperbaiki. */
  for (var i = 0; i < ASSET_MAP.length; i++) {
    if (ASSET_MAP[i].key === key) return key;      /* kunci asli */
  }
  for (var j = 0; j < ASSET_MAP.length; j++) {
    if (ASSET_MAP[j].key === m[1]) return m[1];    /* salinan per-stage */
  }
  return key;
}

function effectiveSrc(m) {
  /* Salinan per-stage mewarisi pilihan dari kunci dasarnya. */
  var bk = baseKeyOf(m.key);
  var slot = slotOfKey(bk);
  if (slot && SWAP_ANIM[slot.id]) {
    var fl = slotFrames(slot);
    var idx = slot.keys.indexOf(bk);
    /* key di luar jangkauan daftar -> pakai rangka terakhir, jangan kosong */
    var fr0 = fl[Math.min(Math.max(idx, 0), fl.length - 1)];
    if (fr0) return { grp: fr0.grp, f: fr0.f };
  }
  var s = SWAP[bk];
  if (s && SHEET_MAP[s.grp] && SHEET_MAP[s.grp][s.f || 0]) {
    return { grp: s.grp, f: s.f || 0 };
  }
  return { grp: m.grp, f: m.f || 0 };
}

/* Daftar key yang AKTIF untuk sebuah slot sekarang.

   Kalau slot diganti dengan kelompok yang punya LEBIH BANYAK rangka
   daripada key bawaannya, key tambahan DIBUAT di sini dengan akhiran
   "__a2", "__a3", dst. Inilah yang membuat objek statis (1 key) bisa
   menjadi bergerak (n key + animasi) — tanpa ini, rangka ke-2 dan
   seterusnya tidak punya tempat dan objeknya tetap diam. */
function slotActiveKeys(slot) {
  if (!SWAP_ANIM[slot.id]) return slot.keys.slice();
  var n = slotFrames(slot).length, out = [], i;
  for (i = 0; i < n; i++) {
    out.push(i < slot.keys.length ? slot.keys[i] : slot.id + '__a' + (i + 1));
  }
  return out;
}

/* Entri ASSET_MAP semu untuk key tambahan hasil slotActiveKeys().
   Ukurannya menyalin key pertama slot supaya hitbox tetap konsisten. */
function extraEntryFor(slot, key, i) {
  var base = null;
  for (var j = 0; j < ASSET_MAP.length; j++) {
    if (ASSET_MAP[j].key === slot.keys[0]) { base = ASSET_MAP[j]; break; }
  }
  if (!base) return null;
  var fl = slotFrames(slot);
  var fr = fl[Math.min(i, fl.length - 1)];
  if (!fr) return null;
  return {
    key: key, grp: fr.grp, f: fr.f,
    w: base.w, h: base.h, fill: base.fill, stack: base.stack,
    label: base.label, pick: base.pick, _extra: true, _slot: slot.id
  };
}

/* Ambil kotak [i,x,y,w,h] dari SHEET_MAP. null kalau tidak ada. */
function sheetFrame(grp, f) {
  var g = SHEET_MAP[grp];
  if (!g || !g.length) return null;
  var fr = g[Math.min(f || 0, g.length - 1)];
  if (!fr) return null;
  return { i: fr[0], x: fr[1], y: fr[2], w: fr[3], h: fr[4] };
}

/* Satu entri ASSET_MAP -> satu tekstur. true kalau berhasil.

   Semua potongan berasal dari SATU gambar (sheet). Koordinat di SHEET_MAP
   sudah menunjuk ke ISI kotak, jadi bingkai ungu TIDAK ikut terbawa dan
   tidak perlu dipangkas lagi di sini. */
function assetToTexture(scene, m) {
  var img = _assetImg.sheet;
  if (!img) return false;
  if (scene.textures.exists(m.key)) return true;
  var src = effectiveSrc(m);
  var fr = sheetFrame(src.grp, src.f);
  if (!fr) return false;
  /* Jangan mengambil di luar batas gambar: sheet yang diunggah bisa saja
     versi lama/berbeda ukuran. Lebih baik jatuh ke art prosedural. */
  if (fr.x + fr.w > img.width || fr.y + fr.h > img.height) return false;
  /* Ukuran AKHIR sudah termasuk slider perbesar/perkecil. Karena hitbox
     diturunkan dari ukuran tekstur, memperkecil di sini otomatis
     memperkecil ruang yang dipakai objek di dunia. */
  var sz = sizeOf(m);
  var t = newCanvas(sz.w, sz.h);
  if (!t.cx) return false;

  /* Geser tegak. Kanvas sudah ditinggikan |n| oleh sizeOf(); di sini
     ditentukan DI BAGIAN MANA kanvas itu sprite digambar:

       n < 0 (NAIK)  -> gambar di bagian ATAS kanvas, sisa ruang di bawah
                        ikut jadi bagian tekstur, sehingga kaki body turun
                        dan sprite tampak terangkat dari tanah.
       n > 0 (TURUN) -> gambar di bagian BAWAH kanvas, ruang kosong di atas.

     Karena hitbox diturunkan dari kanvas, tumbukannya ikut bergeser —
     bukan cuma gambarnya. */
  var n = nudgeOf(m.key);
  var bodyH = sz.h - Math.abs(n);        /* tinggi area gambar sebenarnya */
  var offY = n < 0 ? 0 : Math.abs(n);    /* posisi area gambar di kanvas  */

  try {
    if (m.stack) {
      /* blok ditumpuk jadi tiang; digambar dari BAWAH supaya dasarnya
         selalu padat, blok teratas boleh terpotong. */
      var bw = sz.w;                      /* satu blok selebar tujuan */
      for (var bottom = bodyH; bottom > 0; bottom -= bw) {
        var top = Math.max(0, bottom - bw);
        var drawH = bottom - top;
        var srcH = Math.max(1, Math.round(fr.h * (drawH / bw)));
        t.cx.drawImage(img, fr.x, fr.y + (fr.h - srcH), fr.w, srcH,
                       0, offY + top, sz.w, drawH);
      }
    } else if (m.fill) {
      /* Menutup penuh TANPA merentang: sumber non-persegi dipotong di
         tengah. Tile tanah/bata harus menyambung tanpa celah, jadi tidak
         boleh memakai drawFit() yang menyisakan tepi kosong. */
      drawCover(t.cx, img, fr.x, fr.y, fr.w, fr.h, 0, offY, sz.w, bodyH);
    } else {
      /* drawFit() merata-bawahkan di dalam kotak setinggi bodyH; kotak itu
         sendiri digeser lewat translate(). */
      t.cx.save();
      t.cx.translate(0, offY);
      drawFit(t.cx, img, fr.x, fr.y, fr.w, fr.h, sz.w, bodyH);
      t.cx.restore();
    }
    scene.textures.addCanvas(m.key, t.cv);
    return true;
  } catch (e) { return false; }
}

/* Daftarkan semua tekstur dari berkas yang berhasil dimuat.
   Dipanggil SETELAH purge dan SEBELUM buildTextures(), supaya guard
   'exists' di makeArtTexture() melewati versi proseduralnya. */
function applySheetTextures(scene) {
  var okPlayer = 0, playerTotal = 0, i, m, isPlayer;
  for (i = 0; i < ASSET_MAP.length; i++) {
    m = ASSET_MAP[i];
    isPlayer = m.key.indexOf('t_groom_') === 0;
    if (isPlayer) playerTotal++;
    if (assetToTexture(scene, m) && isPlayer) okPlayer++;
  }

  /* Dekorasi/latar dipakai lewat scene_texKey(prefix, stageId) yang
     MENCARI KUNCI PER-STAGE lebih dulu (mis. 't_bush_s3') dan hanya
     jatuh ke kunci dasar kalau yang itu tidak ada. Kunci per-stage selalu
     dibuat oleh buildTextures(), jadi tanpa langkah ini versi sprite
     tidak akan pernah terpakai — tertimpa diam-diam oleh yang prosedural.
     Karena itu tekstur yang sama didaftarkan ulang untuk tiap stage. */
  for (i = 0; i < ASSET_MAP.length; i++) {
    m = ASSET_MAP[i];
    if (!m.stages) continue;
    for (var sI = 0; sI < STAGES.length; sI++) {
      var sk = m.key + '_s' + sI;
      try { if (scene.textures.exists(sk)) scene.textures.remove(sk); } catch (e) {}
      var clone = {};
      for (var kk in m) if (Object.prototype.hasOwnProperty.call(m, kk)) clone[kk] = m[kk];
      clone.key = sk;
      assetToTexture(scene, clone);
    }
  }

  /* Rangka TAMBAHAN untuk slot yang diganti dengan kelompok beranimasi
     lebih panjang daripada key bawaannya. Dikerjakan sesudah ASSET_MAP
     supaya key aslinya sudah ada sebagai acuan ukuran. */
  for (i = 0; i < ANIM_SLOTS.length; i++) {
    var slot = ANIM_SLOTS[i];
    var keys = slotActiveKeys(slot);
    for (var j = slot.keys.length; j < keys.length; j++) {
      var ex = extraEntryFor(slot, keys[j], j);
      if (ex) assetToTexture(scene, ex);
    }
  }
  /* WUJUD POWER-UP: salinan tiap rangka pemain memakai tokoh lain.
     Hanya dibuat kalau sprite pemain memang berasal dari sheet — versi
     prosedural tidak punya tokoh alternatif, dan memaksakannya akan
     membuat pemain berkedip antara dua gaya gambar. */
  if (okPlayer > 0 && okPlayer === playerTotal) {
    var pKeys = playerSkinKeys();
    for (var c in PW_SKIN) {
      if (!Object.prototype.hasOwnProperty.call(PW_SKIN, c)) continue;
      var chr = PW_SKIN[c];
      for (var pk = 0; pk < pKeys.length; pk++) {
        var baseM = swapEntry(pKeys[pk]) || skinBaseEntry(pKeys[pk]);
        if (!baseM) continue;
        var sk2 = skinKey(pKeys[pk], chr);
        if (sk2 === pKeys[pk] || scene.textures.exists(sk2)) continue;
        var src2 = effectiveSrc(baseM);
        /* Ganti NAMA TOKOH pada kelompoknya, pertahankan state & rangka.
           Kalau kelompoknya bukan Main Characters (user mengganti pemain
           dengan sprite lain), tokoh alternatif tidak ada -> lewati saja
           supaya tidak memaksa gambar yang salah. */
        var g2 = src2.grp.replace(
          /^Main Characters\/[^/]+\//, 'Main Characters/' + chr + '/');
        if (g2 === src2.grp || !SHEET_MAP[g2]) continue;
        var cloneS = {};
        for (var kk2 in baseM) {
          if (Object.prototype.hasOwnProperty.call(baseM, kk2)) cloneS[kk2] = baseM[kk2];
        }
        cloneS.key = sk2; cloneS.grp = g2;
        cloneS.f = Math.min(src2.f, SHEET_MAP[g2].length - 1);
        cloneS._skinOf = pKeys[pk];
        assetToTexture(scene, cloneS);
      }
    }
  }

  /* Pemain semua-atau-tidak: sebagian frame PNG + sebagian prosedural
     membuat pemain berkedip antara dua gaya art. */
  if (okPlayer > 0 && okPlayer < playerTotal) {
    for (i = 0; i < ASSET_MAP.length; i++) {
      if (ASSET_MAP[i].key.indexOf('t_groom_') === 0) {
        try { scene.textures.remove(ASSET_MAP[i].key); } catch (e) {}
      }
    }
    return 0;
  }
  return okPlayer;
}

function buildTextures(scene) {
  var i;
  /* CATATAN: purge SUDAH dipindah ke create(), tepat SEBELUM
     applySheetTextures(). Jangan kembalikan ke sini — purge di titik ini
     akan menghapus potongan sprite sheet yang baru saja didaftarkan
     (semua key-nya berawalan 't_'), dan pemain balik ke art prosedural
     setiap kali tuner menekan "Terapkan & ulang stage". */
  /* HPX = setengah PX. Sprite detail digambar di grid 2x lebih rapat
     (24x32 alih-alih 12x16) TAPI dengan piksel setengah ukuran, sehingga
     UKURAN DI LAYAR PERSIS SAMA — hanya kerapatan detailnya yang naik 4x.
     Ini yang membuat outline, sorot mata, dan lipatan kain muat digambar. */
  makeArtTexture(scene, 't_groom_idle0', groomArt('idle'), HPX);
  makeArtTexture(scene, 't_groom_idle1', groomArt('idle2'), HPX);
  ['run0','run1','run2','run3'].forEach(function (p, n) {
    makeArtTexture(scene, 't_groom_run' + n, groomArt(p), HPX);
  });
  makeArtTexture(scene, 't_groom_jump', groomArt('jump'), HPX);
  makeArtTexture(scene, 't_groom_fall', groomArt('fall'), HPX);
  makeArtTexture(scene, 't_groom_hurt', groomArt('hurt'), HPX);
  makeArtTexture(scene, 't_bride',      brideArt());

  makeArtTexture(scene, 't_e1_0', kepikArt(0), HPX);
  makeArtTexture(scene, 't_e1_1', kepikArt(1), HPX);
  makeArtTexture(scene, 't_e2_walk',  siputArt('walk'));
  makeArtTexture(scene, 't_e2_shell', siputArt('shell'));
  for (i = 0; i < 3; i++) makeArtTexture(scene, 't_e3_' + i, kupuArt(i));
  makeArtTexture(scene, 't_e4', balonArt());
  makeArtTexture(scene, 't_e5_0', kadoArt(0));
  makeArtTexture(scene, 't_e5_1', kadoArt(1));
  makeArtTexture(scene, 't_e6_0', jamArt(0));
  makeArtTexture(scene, 't_e6_1', jamArt(1));

  for (i = 0; i < 4; i++) makeArtTexture(scene, 't_coin' + i, koinArt(i));
  for (i = 0; i < 4; i++) makeArtTexture(scene, 't_piece' + i, pieceArt(i));
  makeArtTexture(scene, 't_pw_melati', powerupArt('melati'));
  makeArtTexture(scene, 't_pw_cincin', powerupArt('cincin'));
  makeArtTexture(scene, 't_pw_payung', powerupArt('payung'));
  makeArtTexture(scene, 't_pw_buket',  powerupArt('buket'));
  makeArtTexture(scene, 't_shot',      shotArt());
  makeArtTexture(scene, 't_spark', sparkArt(), 3);

  for (i = 0; i < 4; i++) makeArtTexture(scene, 't_q' + i, qblockArt(i, false), TPX);
  makeArtTexture(scene, 't_q_dead', qblockArt(0, true), TPX);
  makeArtTexture(scene, 't_brick',  brickArt(), TPX);
  makeArtTexture(scene, 't_plat',   platArt(), TPX);
  /* Ujung kiri/kanan pijakan. Versi proseduralnya memakai gambar yang
     sama dgn bagian tengah — sheet ini tidak punya varian ujung, jadi
     bedanya baru terasa kalau user memilih sprite ujung sendiri lewat
     dialog. Key-nya tetap dibuat supaya pilihan itu ADA. */
  makeArtTexture(scene, 't_plat_l', platArt(), TPX);
  makeArtTexture(scene, 't_plat_r', platArt(), TPX);
  /* Tanah & prop dibuat SEKALI PER STAGE dengan palet stage itu. Kalau memakai
     satu warna global, rumput hijau NES akan bertabrakan dengan langit senja /
     malam dan seluruh kesatuan warna hilang — itu yang membuat gambar terlihat
     "tempelan" alih-alih satu pemandangan. */
  for (var sIdx = 0; sIdx < STAGES.length; sIdx++) {
    var Sx = STAGES[sIdx], Px = SKIES[sIdx] || SKIES[0];
    withPal({ a: Px.gTop, A: Px.gMid, z: Px.gBot,
              D: blend(Px.gMid, 0x000000, 0.30), d: Px.gMid,
              E: blend(Px.gBot, 0x000000, 0.42) }, function () {
      makeArtTexture(scene, 't_gr_s' + sIdx, groundArt(Sx.ground), TPX);
      /* Permukaan: versi proseduralnya sama dgn isian (art tanah memang
         satu petak). Key-nya tetap dibuat supaya baris permukaan BISA
         diganti sendiri dari dialog tanpa ikut mengubah isian. */
      makeArtTexture(scene, 't_gr_top_s' + sIdx, groundArt(Sx.ground), TPX);
      makeArtTexture(scene, 't_bush_s' + sIdx,   bushArt(), 5);
      makeArtTexture(scene, 't_tuft_s' + sIdx,   grassTuftArt(), 5);
    });
    /* Awan mengambil warna dari haze stage supaya menyatu dengan langit. */
    withPal({ W: Px.farHi, w: blend(Px.farHi, Px.sky1, 0.55) }, function () {
      /* 3 varian awan supaya langit tidak terlihat berulang kaku — di
         referensi, tiap gumpalan awan bentuknya berbeda. */
      makeArtTexture(scene, 't_cloud_s' + sIdx,  cloudArt(1), 7);
      makeArtTexture(scene, 't_cloud2_s' + sIdx, cloudArt(2), 7);
      makeArtTexture(scene, 't_cloud3_s' + sIdx, cloudArt(3), 7);
    });

    /* Pohon berdaun & rumpun bunga ikut palet stage */
    withPal({ a: Px.gTop, A: Px.gMid, z: Px.gBot,
              D: blend(Px.gMid, 0x000000, 0.35), E: blend(Px.gBot, 0x000000, 0.50),
              T: 0xe86a8a, Y: 0xf0c020, W: 0xffffff }, function () {
      makeArtTexture(scene, 't_ltree_s' + sIdx,  leafTreeArt(1), 5);
      makeArtTexture(scene, 't_ltree2_s' + sIdx, leafTreeArt(2), 5);
      makeArtTexture(scene, 't_fpatch_s' + sIdx,  flowerPatchArt(1), 4);
      makeArtTexture(scene, 't_fpatch2_s' + sIdx, flowerPatchArt(2), 4);
      makeArtTexture(scene, 't_fpatch3_s' + sIdx, flowerPatchArt(3), 4);
      makeArtTexture(scene, 't_fence_s' + sIdx,   fenceArt(), 4);
    });
  }

  makeArtTexture(scene, 't_pipe64',  pipeArt(12), TPX);
  makeArtTexture(scene, 't_pipe96',  pipeArt(20), TPX);
  makeArtTexture(scene, 't_pipe128', pipeArt(28), TPX);

  /* Cadangan prosedural: bendera diam. Rangka kibar 1-3 memakai gambar
     yang sama supaya anim 'goal_wave' tetap punya 4 rangka yang sah
     walau sheet belum diunggah (tampak diam, bukan error). */
  makeArtTexture(scene, 't_goal',  goalArt(), TPX);
  makeArtTexture(scene, 't_goal1', goalArt(), TPX);
  makeArtTexture(scene, 't_goal2', goalArt(), TPX);
  makeArtTexture(scene, 't_goal3', goalArt(), TPX);
  /* px 6 -> 3: grid bos naik 16x20 menjadi 32x40, jadi piksel dipotong
     separuh supaya UKURAN AKHIR DI LAYAR tetap sama seperti sebelumnya. */
  for (i = 1; i <= 3; i++) makeArtTexture(scene, 't_boss' + i, bossArt(i), 3);

  makeArtTexture(scene, 't_bush',   bushArt(), 5);
  makeArtTexture(scene, 't_rock',   rockArt(), 5);
  makeArtTexture(scene, 't_flower', flowerArt(), 5);
  makeArtTexture(scene, 't_tuft',   grassTuftArt(), 5);
  makeArtTexture(scene, 't_cloud',  cloudArt(), 8);

  /* Animasi SLOT — daftar rangkanya diambil dari slotActiveKeys(), jadi
     ikut berubah kalau user mengganti slot dengan kelompok yang punya
     jumlah rangka berbeda. Objek yang bawaannya statis (1 key, anim:null)
     akan MENDAPAT animasi di sini begitu diberi >1 rangka. */
  for (i = 0; i < ANIM_SLOTS.length; i++) {
    var sl = ANIM_SLOTS[i];
    if (sl.twoState) continue;                   /* utuh/rusak, bukan siklus */
    var ks = slotActiveKeys(sl).filter(function (k) { return scene.textures.exists(k); });
    if (ks.length < 2) continue;                 /* 1 rangka = tetap diam */
    var animName = sl.anim || (sl.id + '_anim');
    makeAnim(scene, animName, ks, sl.fps || 8);

    /* Versi per-tokoh untuk wujud power-up. Hanya didaftarkan kalau
       SEMUA rangka tokoh itu ada — animasi setengah jadi akan membuat
       pemain berkedip kembali ke tokoh dasar di rangka yang hilang. */
    if (/^player_/.test(sl.id)) {
      for (var pc in PW_SKIN) {
        if (!Object.prototype.hasOwnProperty.call(PW_SKIN, pc)) continue;
        var chrA = PW_SKIN[pc];
        var sks = ks.map(function (k) { return skinKey(k, chrA); });
        var allThere = sks.every(function (k) { return scene.textures.exists(k); });
        if (!allThere) continue;
        makeAnim(scene, animName + '__pw' + chrA.replace(/[^A-Za-z]/g, ''),
                 sks, sl.fps || 8);
      }
    }
  }

  /* Animasi non-slot (tidak bisa diganti dari dialog). */
  makeAnim(scene, 'piece_float',['t_piece0','t_piece1','t_piece2','t_piece3'], 6);
}

/* Nama animasi yang BERLAKU untuk sebuah slot sekarang, atau null kalau
   slot itu sedang statis. Dipakai pemanggil play() supaya tidak menebak
   nama yang belum tentu terdaftar. */
function slotAnimName(id) {
  var sl = slotById(id);
  if (!sl) return null;
  /* Slot dua-wujud (utuh/rusak) TIDAK pernah dianimasikan: kedua
     rangkanya adalah STATE yang dipilih logika game, bukan siklus. */
  if (sl.twoState) return null;
  var n = slotActiveKeys(sl).length;
  if (n < 2) return null;
  return sl.anim || (sl.id + '_anim');
}
/* Mainkan animasi slot kalau ada; kalau tidak, pasang tekstur diamnya.
   Satu jalur ini dipakai semua pemanggil supaya objek statis-yang-
   dijadikan-bergerak tidak perlu perubahan di tiap tempat. */
function playSlot(sprite, id, ignoreIfPlaying) {
  if (!sprite) return;
  var nm = slotAnimName(id);
  var sc = sprite.scene;
  /* Pemain memakai wujud tokoh sesuai power-up yang sedang aktif.
     Kalau versi tokoh itu belum terdaftar (mis. sprite pemain diganti
     ke kelompok non-Main Characters), jatuh ke animasi dasar — lebih
     baik tokoh biasa daripada pemain tanpa gambar. */
  if (/^player_/.test(id) && sc && sc.anims) {
    var chr = currentPlayerChar();
    if (chr !== PLAYER_BASE_CHAR) {
      var suf = '__pw' + chr.replace(/[^A-Za-z]/g, '');
      if (nm && sc.anims.exists(nm + suf)) {
        sprite.play(nm + suf, ignoreIfPlaying !== false);
        return;
      }
      /* slot statis (lompat/jatuh/kena): tukar TEKSTUR-nya saja */
      if (!nm) {
        var sl0 = slotById(id);
        var k0 = sl0 && slotActiveKeys(sl0)[0];
        var sk0 = k0 && skinKey(k0, chr);
        if (sk0 && sc.textures && sc.textures.exists(sk0)) {
          sprite.setTexture(sk0);
          return;
        }
      }
    } else if (!nm) {
      /* Tokoh dasar, slot STATIS (lompat/jatuh/kena): pasang teksturnya.

         Dulu di sini hanya menukar tekstur kalau yang terpasang punya
         akhiran "__pw" — maksudnya "kembalikan dari wujud power-up".
         Akibatnya, saat tokoh dasar, playSlot('player_hurt') tidak
         memasang apa pun dan rangka kena/lompat/jatuh TIDAK PERNAH
         muncul: tanpa error, cuma gambar yang tidak berubah.

         Aman dilakukan untuk pemain karena slot pemain tidak punya
         "wujud" yang dipilih logika game — beda dari musuh dua-wujud
         (E2 cangkang, E5 rusak) yang justru rusak kalau di-set ulang,
         dan itulah sebabnya cabang ini dibatasi ke slot player_*. */
      var slB = slotById(id);
      var kB = slB && slotActiveKeys(slB)[0];
      if (kB && sc.textures && sc.textures.exists(kB) &&
          (!sprite.texture || sprite.texture.key !== kB)) {
        sprite.setTexture(kB);
        return;
      }
    }
  }
  if (nm && sprite.anims && sc && sc.anims && sc.anims.exists(nm)) {
    sprite.play(nm, ignoreIfPlaying !== false);
    return;
  }
  /* Tanpa animasi: JANGAN memasang ulang tekstur.
     spawnEnemy() sudah memanggil setTexture() dengan wujud yang benar,
     dan musuh dua-wujud (E2 cangkang, E5 rusak) bisa dipanggil ulang
     saat state-nya sudah berubah — menimpanya dengan keys[0] akan
     mengembalikannya ke wujud utuh secara keliru. */
}





/* =====================================================================
   [7b] SFX — Web Audio prosedural (SFX game milik tema; backsound milik host)
   ===================================================================== */
var actx = null;
function audioCtx() {
  if (actx) return actx;
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    onCleanup(function () { try { actx.close(); } catch (e) {} actx = null; });
  } catch (e) { actx = null; }
  return actx;
}
function tone(freq, dur, type, vol, slideTo) {
  var ac = audioCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    var o = ac.createOscillator(), gn = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), ac.currentTime + dur);
    gn.gain.setValueAtTime(vol || 0.06, ac.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.0008, ac.currentTime + dur);
    o.connect(gn); gn.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur + 0.02);
  } catch (e) {}
}
function sfxMuted() { return !!(STORE && STORE.sfxOn === false); }

/* Nada BERTUNDA. Wajib lewat sini, jangan setTimeout(tone) langsung:
   keadaan bisu diperiksa ULANG saat nada benar-benar dibunyikan.
   Tanpa itu, membisukan tepat sesudah mengambil koin/power-up masih
   meloloskan nada susulannya — bunyi yang "tidak menurut". */
function toneLater(delay, freq, dur, type, vol, slideTo) {
  setTimeout(function () {
    if (sfxMuted()) return;
    tone(freq, dur, type, vol, slideTo);
  }, delay);
}

function sfx(kind) {
  /* Gerbang bisu untuk nada LANGSUNG; nada bertunda dijaga terpisah di
     toneLater() karena bisa berbunyi sesudah keadaan berubah. Keduanya
     diperiksa di lapis sfx, bukan di tone(): tone() juga dipakai untuk
     hal lain, dan menaruh penjaga di sana akan membisukan yang bukan
     efek suara game. */
  if (sfxMuted()) return;
  var v = 1 + (Math.random() * 0.06 - 0.03);   /* pitch-vary +-1..3 semitone */
  switch (kind) {
    case 'jump':    tone(320 * v, 0.09, 'square', 0.05, 520); break;
    case 'land':    tone(150 * v, 0.05, 'triangle', 0.04, 90); break;
    case 'stomp':   tone(400 * v, 0.11, 'square', 0.06, 180); break;
    case 'coin':    tone(988 * v, 0.06, 'square', 0.05);
                    toneLater(55, 1319 * v, 0.09, 'square', 0.05); break;
    case 'bump':    tone(180 * v, 0.07, 'triangle', 0.05); break;
    case 'hurt':    tone(300, 0.25, 'sawtooth', 0.06, 80); break;
    case 'powerup': [392, 523, 659, 1047].forEach(function (f, i) {
                      toneLater(i * 70, f, 0.1, 'square', 0.05); }); break;
    case 'piece':   [523, 659, 784].forEach(function (f, i) {
                      toneLater(i * 90, f, 0.12, 'square', 0.06); }); break;
    case 'bosshit': tone(220, 0.12, 'sawtooth', 0.06, 120); break;
    /* Tembakan: pendek & naik, supaya terdengar "melesat" dan tidak
       menutupi bunyi lompat yang sering terjadi bersamaan. */
    case 'shoot':   tone(660 * v, 0.05, 'square', 0.035, 990); break;
    /* Tertahan: nada rendah tumpul — jelas terdengar BEDA dari 'bosshit'
       supaya pemain tahu tembakannya tidak melukai. */
    case 'block':   tone(150, 0.07, 'triangle', 0.04, 110); break;
    case 'fanfare': [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) {
                      toneLater(i * 150, f, 0.18, 'square', 0.06); }); break;
  }
}


/* =====================================================================
   [8] GENERATOR LEVEL (APPENDIX F)
   Pipeline: spine -> patterns -> elevation -> entities -> decor
             -> validateDensity -> pieces -> validatePlayability
   Layout DETERMINISTIK (PRNG ber-seed) supaya kepingan tak "pindah" saat reload.
   ===================================================================== */
function buildLevel(stageIdx, diffKey, seed) {
  var S = STAGES[stageIdx];
  var D = DIFF[diffKey] || DIFF.easy;
  var rnd = mulberry32(seed + stageIdx * 7919);
  var len = S.len;

  var L = {
    len: len,
    stage: stageIdx,
    ground: [],      /* {x,w} segmen tanah; celah di antaranya = jurang */
    solids: [],      /* {x,y,w,h,kind} brick/qblock/platform/pipe */
    coins: [],       /* {x,y} */
    spawns: [],      /* {x,y,type} data INERT terurut triggerX */
    pieces: [],      /* {x,y,key} */
    powerups: [],    /* {x,y,kind} */
    props: [],       /* {x,y,kind,layer} */
    goalX: len - 200
  };

  var GY = CONFIG_GROUND_Y();
  var x = 0;

  /* --- 1. START SAFE ZONE (T001): 600px, 0 musuh --- */
  L.ground.push({ x: 0, w: 640 });
  for (var c = 0; c < 3; c++) L.coins.push({ x: 300 + c * 40, y: GY - H_COIN });
  L.solids.push({ x: 480, y: GY - H_BLOCK, w: 32, h: 32, kind: 'q', item: 'coin' });
  x = 640;

  /* --- 2. BODY: rangkai pola sampai mendekati goal --- */
  var lastKind = '';
  var sameCount = 0;
  var sinceReward = 0;
  var guard = 0;

  while (x < L.len - 700 && guard++ < 400) {
    var kind = pickPattern(rnd, S, lastKind, sameCount);
    if (kind === lastKind) sameCount++; else { sameCount = 1; lastKind = kind; }

    var adv = 0;
    if (kind === 'gap') {
      adv = placeGap(L, x, GY, rnd, D, stageIdx);
    } else if (kind === 'blocks') {
      adv = placeBlocks(L, x, GY, rnd, stageIdx);
    } else if (kind === 'pipe') {
      adv = placePipe(L, x, GY, rnd, stageIdx);
    } else if (kind === 'enemy') {
      adv = placeEnemyRun(L, x, GY, rnd, S, D);
    } else {
      adv = placeFlat(L, x, GY, rnd);
    }
    x += adv;
    sinceReward += adv;

    /* Reward cadence: koin trail tiap <=1350px */
    if (sinceReward > 1200) {
      for (var k = 0; k < 5; k++) L.coins.push({ x: x - 200 + k * 34, y: GY - H_COIN });
      sinceReward = 0;
    }
  }

  /* --- 3. TANGGA KEMENANGAN + GOAL (F001), 0 musuh 5 tile terakhir --- */
  L.ground.push({ x: x, w: L.len - x });
  var steps = 4;
  for (var s = 0; s < steps; s++) {
    for (var h = 0; h <= s; h++) {
      L.solids.push({ x: x + 120 + s * TILE, y: GY - TILE * (h + 1), w: TILE, h: TILE, kind: 'hard' });
    }
  }
  L.goalX = x + 120 + steps * TILE + 90;

  /* --- 4. ELEVASI: jamin >=1 pijakan naik tiap 6-10 tile --- */
  ensureElevation(L, GY, rnd);

  /* --- 5. DEKORASI: penuhi kuota per segmen --- */
  buildDecor(L, GY, rnd, S);

  /* --- 6. VALIDATE DENSITY -> tambal segmen yang gagal --- */
  fixDensity(L, GY, rnd, S, D);

  /* --- 7. KEPINGAN (setelah density lolos, supaya bukan penambal) --- */
  placePieces(L, GY, rnd, stageIdx, D);

  /* --- 8. VALIDATE PLAYABILITY --- */
  fixPlayability(L, GY);

  /* --- 9. JAMIN JATAH KOTAK POWER-UP ---
     HARUS sebelum fixCoinReachability: langkah ini menambah solid baru,
     dan koin yang jadi tertutup olehnya perlu ikut diperiksa ulang.
     Ketika urutannya dibalik, 63 koin (0.60%) tenggelam di dalam kotak
     yang baru dibuat dan tidak ada yang membersihkannya. */
  fixPowerupQuota(L, GY, rnd, stageIdx);

  /* --- 10. BERSIHKAN KOIN YANG TIDAK BISA DIAMBIL --- */
  fixCoinReachability(L, GY);

  /* Urutkan spawn list menaik (WAJIB untuk spawn relatif-kamera) */
  L.spawns.sort(function (a, b) { return a.x - b.x; });
  return L;
}

/* Buang / turunkan koin yang mustahil diambil.
   ---------------------------------------------------------------------
   BUG YANG DIPERBAIKI (dilaporkan user dgn screenshot: "point disini kan
   ga bisa diambil / harusnya ga ada penempatan yang seperti itu").

   Penyebabnya: beberapa penempat koin menaruh koin secara BUTA tanpa
   melihat apa yang sudah ada di sana. Yang terbesar adalah "reward
   cadence trail" — 5 koin dijejer tiap 1200px tanpa memeriksa apakah
   titiknya sudah terisi tangga, bata, atau pipa. Audit atas 12.320 koin
   menemukan 14,6% tidak bisa diambil, mayoritas TENGGELAM DI DALAM blok.

   Jalan keluar dipilih sebagai PASCA-PROSES, bukan menambal 8 pemanggil
   satu per satu: pemanggil berikutnya pasti lupa lagi, sedangkan di sini
   seluruh tata letak akhir sudah terlihat.

   Tiga kasus yang ditangani:
     1. koin di DALAM blok padat            -> coba naikkan, kalau tak
                                               bisa, buang;
     2. koin lebih tinggi dari jangkauan    -> turunkan ke H_COIN di atas
        dari pijakan mana pun                  pijakan terdekat;
     3. koin terhimpit blok tepat di atas   -> buang (kepala pemain
                                               membentur duluan).  */
/* Jamin tiap stage punya CUKUP kotak-? berisi power-up.
   ---------------------------------------------------------------------
   BUG YANG DIPERBAIKI (dilaporkan user: "berkali2 saya main ga ketemu
   tembakan di stage 1 dan stage 6").

   Penyebabnya bukan daftar power-up — buket memang sudah terdaftar di
   semua stage. Masalahnya KOTAKNYA yang hampir tidak pernah ada:
   spawnPowerup() cuma dipanggil dari kotak ber-item 'power', dan kotak
   semacam itu hanya lahir di SATU cabang placeBlocks (B001 "six-block"),
   HANYA di posisi ke-2, lalu masih diundi 50% lagi. Hasil pengukuran
   200 seed x 3 kesulitan sebelum perbaikan:

     STAGE 1 FOOSHA   1.06 kotak   30.0% permainan NOL kotak
     STAGE 2 BARATIE  0.67 kotak   48.0%
     STAGE 3 GARDEN   0.82 kotak   44.0%
     STAGE 4 ALABASTA 1.05 kotak   31.8%
     STAGE 5 SKYPIEA  0.78 kotak   46.2%
     STAGE 6 ARLONG   0.35 kotak   70.5%   <-- stage BOS, paling butuh

   Stage bos justru paling miskin karena levelnya terpendek (4200 px vs
   6400-7800), sedangkan kotak lahir dari cabang yang muncul sebanding
   panjang level. Menaikkan porsi buket di daftar tidak akan menolong:
   yang langka adalah kotaknya, bukan isinya.

   Ditulis sebagai PASCA-PROSES mengikuti pola fixDensity/fixPlayability:
   menambal placeBlocks saja tidak cukup, karena cabang B002/B003 memang
   tidak pernah membuat kotak-? sama sekali. */
var POWER_BOX_MIN = 3;        /* jatah normal per stage */
var POWER_BOX_MIN_BOSS = 4;   /* stage bos: senjata paling dibutuhkan */

function powerQuotaFor(stageIdx) {
  var S = STAGES[stageIdx];
  return (S && S.boss) ? POWER_BOX_MIN_BOSS : POWER_BOX_MIN;
}

function fixPowerupQuota(L, GY, rnd, stageIdx) {
  var need = powerQuotaFor(stageIdx);
  var have = 0, i;
  for (i = 0; i < L.solids.length; i++) {
    if (L.solids[i].item === 'power') have++;
  }
  if (have >= need) return;

  /* LANGKAH 1 — ubah kotak-? berisi KOIN jadi power.
     Paling murah: tata letaknya sudah terbukti bisa dijangkau (sudah
     lolos fixPlayability), jadi tidak ada risiko menaruh kotak di tempat
     mustahil. Dipilih yang tersebar merata sepanjang level, bukan yang
     pertama-pertama, supaya tidak menumpuk di awal. */
  var coinQ = [];
  for (i = 0; i < L.solids.length; i++) {
    var s = L.solids[i];
    if (s.kind === 'q' && s.item !== 'power') coinQ.push(s);
  }
  coinQ.sort(function (a, b) { return a.x - b.x; });
  var k = coinQ.length;
  while (have < need && k > 0) {
    /* ambil yang terjauh dulu supaya menyebar: indeks 0, tengah, akhir... */
    var idx = Math.floor((have % need) * (k - 1) / Math.max(1, need - 1));
    var pick = coinQ.splice(Math.min(idx, coinQ.length - 1), 1)[0];
    if (!pick) break;
    pick.item = 'power';
    have++; k = coinQ.length;
  }
  if (have >= need) return;

  /* LANGKAH 2 — masih kurang: buat kotak BARU di atas tanah datar.
     Ketinggiannya H_BLOCK, sama dengan kotak lain, supaya bisa dipukul
     dari bawah. Titiknya dipilih di tanah yang benar-benar ada dan tidak
     bertabrakan dengan solid lain. */
  var by = GY - H_BLOCK;
  var tries = 0;
  while (have < need && tries < 400) {
    tries++;
    /* sebar sepanjang level, hindari 600px pertama (area start) dan
       200px terakhir (garis akhir / arena bos) */
    var lo = 600, hi = Math.max(lo + 200, L.len - 200);
    var x = lo + rnd() * (hi - lo);
    x = Math.round(x / TILE) * TILE;

    /* harus ada TANAH di bawahnya (bukan jurang) */
    var onGround = false;
    for (i = 0; i < L.ground.length; i++) {
      if (x >= L.ground[i].x + 40 && x <= L.ground[i].x + L.ground[i].w - 40) {
        onGround = true; break;
      }
    }
    if (!onGround) continue;

    /* jangan bertumpuk dengan solid mana pun (beri jarak 1 tile) */
    var clash = false;
    for (i = 0; i < L.solids.length; i++) {
      var o = L.solids[i];
      if (Math.abs(o.x - x) < TILE * 1.5 && Math.abs(o.y - by) < TILE * 1.5) {
        clash = true; break;
      }
    }
    if (clash) continue;

    /* jangan menutupi kepingan undangan */
    for (i = 0; i < (L.pieces || []).length; i++) {
      if (Math.abs(L.pieces[i].x - x) < TILE * 2) { clash = true; break; }
    }
    if (clash) continue;

    /* jangan menelan koin. fixCoinReachability sesudah ini memang akan
       membuang koin yang tertutup, tapi lebih baik tidak menciptakan
       masalahnya: membuang koin berarti pemain kehilangan poin yang
       tadinya bisa diambil. */
    for (i = 0; i < (L.coins || []).length; i++) {
      if (Math.abs(L.coins[i].x - x) < TILE &&
          Math.abs(L.coins[i].y - by) < TILE) { clash = true; break; }
    }
    if (clash) continue;

    L.solids.push({ x: x, y: by, w: TILE, h: TILE, kind: 'q', item: 'power' });
    have++;
  }
}

function fixCoinReachability(L, GY) {
  if (!L.coins || !L.coins.length) return;

  /* Kotak semua benda padat, memakai konvensi yang SAMA dengan create():
     bata/blok memakai titik tengah (x+16, y+16); plat memakai (x+w/2, y+7). */
  var boxes = [];
  for (var i = 0; i < L.solids.length; i++) {
    var o = L.solids[i];
    if (o.kind === 'pipe') {
      boxes.push({ l: o.x, r: o.x + 64, t: o.y, b: o.y + o.ph });
    } else if (o.kind === 'plat') {
      boxes.push({ l: o.x, r: o.x + o.w, t: o.y, b: o.y + 14 });
    } else {
      boxes.push({ l: o.x, r: o.x + TILE, t: o.y, b: o.y + TILE });
    }
  }

  var PICK_R = 22;          /* radius ambil koin, dilonggarkan */
  var COIN_R = 10;          /* separuh BADAN koin (untuk uji tumpang tindih) */
  /* Ukuran badan pemain diambil dari tekstur yang BENAR-BENAR dipakai,
     bukan angka mati. Kalau sprite pemain dikecilkan lewat slider
     (SCALE_DEF t_groom_* = 0.9), hitboxnya ikut mengecil — dan
     pemeriksaan kelayakan koin/lorong harus memakai angka yang sama,
     kalau tidak ia menilai lebar yang tidak pernah ada di layar. */
  var PLAYER_W = playerBodyW();
  var PLAYER_H = playerBodyH();

  /* JARAK AMAN MENYELINAP.
     Lorong yang lebarnya PERSIS selebar badan secara teori muat, tapi
     dalam praktik mustahil: pada RUN_SPEED 300px/s dan 60fps, pemain
     berpindah 5px tiap frame, jadi ia hampir tidak pernah mendarat
     tepat di satu-satunya posisi yang muat. Lorong harus lebih lebar
     daripada badan MINIMAL sebesar satu langkah frame di tiap sisi,
     supaya masuknya bisa diandalkan dan bukan undian. */
  var STEP_PX = Math.ceil(PHYS.RUN_SPEED / 60);
  var PLAYER_FIT = PLAYER_W + STEP_PX * 2;
  var out = [];

  for (var c = 0; c < L.coins.length; c++) {
    var k = L.coins[c];
    var x = k.x, y = k.y;

    /* --- pijakan tertinggi tepat di bawah koin (tanah kalau tak ada) --- */
    function standUnder(px, py) {
      var top = GY;
      for (var b = 0; b < boxes.length; b++) {
        var bx = boxes[b];
        if (px > bx.l && px < bx.r && bx.t >= py && bx.t < top) top = bx.t;
      }
      return top;
    }
    /* Koin punya BADAN, bukan sekadar titik. Versi lama menguji titik
       tengahnya saja (py > bx.t), sehingga koin yang menempel persis di
       permukaan papan dianggap "tidak di dalam blok" dan dibiarkan —
       padahal di layar koin itu terlihat tertanam di dalam papan dan
       tidak bisa diambil. Radius COIN_R dipakai ke segala arah. */
    function insideSolid(px, py) {
      for (var b = 0; b < boxes.length; b++) {
        var bx = boxes[b];
        if (px + COIN_R > bx.l && px - COIN_R < bx.r &&
            py + COIN_R > bx.t && py - COIN_R < bx.b) return true;
      }
      return false;
    }
    /* dasar blok terdekat DI ATAS koin */
    function ceilAbove(px, py) {
      var cy = -1e9;
      for (var b = 0; b < boxes.length; b++) {
        var bx = boxes[b];
        if (px > bx.l && px < bx.r && bx.b <= py && bx.b > cy) cy = bx.b;
      }
      return cy;
    }

    /* 1. tenggelam di dalam blok -> angkat ke atas blok itu */
    if (insideSolid(x, y)) {
      var lift = ceilAbove(x, y - 1);
      var top2 = GY;
      for (var b2 = 0; b2 < boxes.length; b2++) {
        var bb = boxes[b2];
        if (x > bb.l && x < bb.r && bb.t < top2) top2 = bb.t;
      }
      /* Melayang JELAS di atas permukaan. top2 - PICK_R saja tidak cukup:
         itu menempatkan tepi bawah koin persis menyentuh papan, sehingga
         koin tetap terlihat tertanam. */
      y = top2 - (PICK_R + COIN_R);
      if (insideSolid(x, y)) continue;        /* masih terjepit -> buang */
    }

    /* 2. terlalu tinggi dari pijakan -> turunkan */
    var stand = standUnder(x, y);
    if (stand - y > H_REACH) y = stand - H_COIN;

    /* 3. terhimpit blok di atas -> buang */
    var ceilY = ceilAbove(x, y);
    if (ceilY > -1e8 && (y - ceilY) < PICK_R) continue;

    /* 4. TERJEPIT MENDATAR: lorong di kiri-kanan lebih sempit daripada
       badan pemain. Ini bisa terjadi walau tiap penghasil pola sudah
       benar sendiri-sendiri — mis. pipa kebetulan berdiri tepat di
       sebelah baris bata, menyisakan lorong 26px untuk badan 30px.
       Karena penyebabnya kombinasi ANTAR pola, perbaikannya harus di
       sini (pass umum), bukan ditambal satu per satu di penghasilnya.

       Ditangani dgn MENURUNKAN koin ke bawah rintangan; kalau di sana
       pun masih sempit, koinnya dibuang — lebih baik hilang satu koin
       daripada ada koin yang mustahil diambil. */
    var corridorAt = function (py) {
      var top = py - PLAYER_H / 2, bot = py + PLAYER_H / 2;
      var lE = -1e9, rE = 1e9;
      for (var b3 = 0; b3 < boxes.length; b3++) {
        var bb3 = boxes[b3];
        if (bb3.b <= top || bb3.t >= bot) continue;
        if (bb3.r <= x && bb3.r > lE) lE = bb3.r;
        if (bb3.l >= x && bb3.l < rE) rE = bb3.l;
      }
      return rE - lE;
    };
    if (corridorAt(y) < PLAYER_FIT) {
      /* coba di bawah rintangan terdekat (masih dalam jangkauan lompat) */
      var moved = false;
      var floorY = standUnder(x, y);
      for (var tryY = y + TILE; tryY <= floorY - PICK_R; tryY += TILE / 2) {
        if (corridorAt(tryY) >= PLAYER_FIT && !insideSolid(x, tryY)) {
          y = tryY; moved = true; break;
        }
      }
      if (!moved) continue;                   /* tetap sempit -> buang */
    }

    /* jangan sampai hasil penyesuaian malah masuk ke blok lain */
    if (insideSolid(x, y)) continue;

    out.push({ x: x, y: y });
  }

  L.coins = out;
}

/* Tinggi permukaan TANAH (bukan pijakan melayang). Diambil dari tuner
   supaya bisa diatur langsung di dalam game; di layar sentuh ditambah
   ruang untuk tombol virtual. */
function CONFIG_GROUND_Y() {
  var c = (TUNE && TUNE.groundY) || 150;
  return BH - (isTouch ? (c + 50) : c);
}

function pickPattern(rnd, S, lastKind, sameCount) {
  var w = S.id === 0 ? { flat: 30, blocks: 30, enemy: 15, gap: 10, pipe: 10 }
        : S.id === 1 ? { flat: 15, blocks: 20, enemy: 15, gap: 30, pipe: 15 }
        : S.id === 2 ? { flat: 10, blocks: 20, enemy: 20, gap: 20, pipe: 25 }
        : S.id === 3 ? { flat: 10, blocks: 25, enemy: 20, gap: 25, pipe: 15 }
        : S.id === 4 ? { flat: 5,  blocks: 20, enemy: 30, gap: 20, pipe: 20 }
        :              { flat: 40, blocks: 20, enemy: 25, gap: 10, pipe: 5  };

  /* Chaining: maks 3 pola sejenis berturut */
  if (sameCount >= 3) w[lastKind] = 0;
  /* Gap tidak boleh langsung setelah gauntlet musuh */
  if (lastKind === 'enemy') w.gap = Math.round(w.gap * 0.35);

  var total = 0, k;
  for (k in w) total += w[k];
  var r = rnd() * total, acc = 0;
  for (k in w) { acc += w[k]; if (r <= acc) return k; }
  return 'flat';
}

/* ---- LEBAR SEGMEN (revisi 6) -------------------------------------------
   Sumber "banyak ruang kosong antar object". Empat fungsi place* memakai
   lebar MATI 300..500px (9,4..15,6 tile) yang ditulis saat D_max masih 191px.
   Level asli Mario (level1.json: 240 tile / 34 segmen tanah) rata-rata
   7,1 TILE per segmen — tema ini ~12 tile, yakni 1,7x lebih renggang.

   Sekarang lebar diturunkan dari SEG_W supaya ikut menyesuaikan kalau
   lengkungan lompat diubah lewat panel tuner, bukan angka mati lagi.
   Basis 7,1 tile dinyatakan sebagai rasio terhadap D_max (324px):
     7,1 tile * 32px = 227px ~= 0,70 * D_max                            */
function segW(rnd, lo, hi) {
  var base = D_MAX_PX * 0.70;
  return Math.round(base * (lo + rnd() * (hi - lo)));
}

function placeFlat(L, x, GY, rnd) {
  var w = segW(rnd, 0.90, 1.45);
  L.ground.push({ x: x, w: w });
  var n = 3 + Math.floor(rnd() * 3);
  for (var i = 0; i < n; i++) L.coins.push({ x: x + 60 + i * 36, y: GY - H_COIN });
  return w;
}

function placeGap(L, x, GY, rnd, D, stageIdx) {
  var pre = 220 + Math.floor(rnd() * 120);
  L.ground.push({ x: x, w: pre });

  /* Lebar gap: naik bertahap per stage, dibatasi D_max */
  var pctByStage = [0.38, 0.55, 0.62, 0.70, 0.75, 0.50];
  var pct = pctByStage[stageIdx] * (0.85 + rnd() * 0.25) * D.gapMul;
  pct = Math.min(pct, 0.92);                     /* HARD CAP 92% D_max */
  var gap = Math.round(D_MAX_PX * pct);

  /* Gap lebar -> pecah dengan platform tengah (G003) */
  if (gap > D_MAX_PX * 0.7 && rnd() < 0.5) {
    var mid = x + pre + Math.round(gap / 2);
    L.solids.push({ x: mid - TILE, y: GY - H_PLAT, w: TILE * 2, h: 14, kind: 'plat' });
    L.coins.push({ x: mid, y: GY - H_COIN });
  }
  return pre + gap;
}

function placeBlocks(L, x, GY, rnd, stageIdx) {
  var w = segW(rnd, 0.95, 1.40);
  L.ground.push({ x: x, w: w });
  var mode = rnd();
  var bx = x + 90;
  var by = GY - H_BLOCK;

  if (mode < 0.35) {
    /* B001 Six-block formation */
    var items = ['brick', 'q', 'brick', 'brick', 'q', 'brick'];
    for (var i = 0; i < 6; i++) {
      L.solids.push({
        x: bx + i * TILE, y: by, w: TILE, h: TILE,
        kind: items[i] === 'q' ? 'q' : 'brick',
        item: items[i] === 'q' ? (i === 1 && rnd() < 0.5 ? 'power' : 'coin') : null
      });
    }
  } else if (mode < 0.65) {
    /* B002 Stair blocks (tiap anak tangga <=2 tile, total masih di bawah 9) */
    var steps = 3 + Math.floor(rnd() * 2);
    for (var s = 0; s < steps; s++) {
      L.solids.push({ x: bx + s * TILE, y: GY - TILE * (s + 1), w: TILE, h: TILE, kind: 'hard' });
    }
  } else {
    /* B003 Floating row.

       BUG YANG DIPERBAIKI (dilaporkan user dgn screenshot: "point disini
       kan ga bisa diambil"): dulu koin ditaruh di `by - 46`, angka mati.
       Semua ketinggian lain diturunkan dari JUMP_H_PX, yang satu ini
       tidak — sesudah fisika dikalibrasi ulang, koin duduk di 158px
       sementara batas jangkauan cuma 131px. Tidak terjangkau dari tanah,
       dan barisnya rapat tanpa celah sehingga tidak ada jalan naik ke
       atasnya. Koinnya benar-benar mustahil diambil.

       Sekarang: koin ditaruh SETINGGI H_COIN (lengkungan lompat yang
       sudah terbukti terjangkau) dan HANYA di kolom yang tidak terhalang
       blok — yaitu di CELAH antar-blok, bukan di atas setiap blok. */
    var n = 5 + Math.floor(rnd() * 3);

    /* CELAH SELEBAR 2 TILE, BUKAN 1.
       -----------------------------------------------------------------
       Dilaporkan user (dgn tangkapan layar): "di space yg kecil itu kok
       kyknya susah bangt buat nyelip... harus di ulang-ulang beberapa
       kali dulu", dan "sudah saya kecilkan sprite karakternya tapi tetap
       harus pixel perfect".

       Hitungannya memang mustahil, dan mengecilkan sprite tidak bisa
       menyelamatkannya:
         celah 1 tile          = 32px
         hitbox pemain 0,9x    = 27px  (sebelumnya 30px)
         sisa ruang            = 5px total, 2,5px per sisi
         perpindahan per frame = RUN_SPEED 300px/s / 60fps = 5px
       Perpindahan satu frame LEBIH BESAR daripada seluruh toleransi
       celah. Artinya pemain hanya bisa masuk kalau kebetulan posisi
       framenya pas — persis "harus pixel perfect" yang dikeluhkan.

       Dengan 2 tile (64px) sisa ruangnya jadi 37px, atau ~18px per sisi:
       lebih lebar dari satu langkah frame, jadi menjatuhkan diri lewat
       celah menjadi gerakan yang BISA DIANDALKAN — bukan undian.
       Jumlah blok dinaikkan (5..7) supaya barisnya tidak jadi terlalu
       pendek setelah dua kolomnya dikosongkan. */
    var gapAt = 1 + Math.floor(rnd() * Math.max(1, n - 3));
    var gapEnd = gapAt + 1;                    /* celah = gapAt & gapAt+1 */
    for (var j = 0; j < n; j++) {
      if (j === gapAt || j === gapEnd) continue;   /* celah: tanpa blok */
      var isQ = (j === Math.floor(n / 2) && j !== gapAt && j !== gapEnd);
      L.solids.push({
        x: bx + j * TILE, y: by, w: TILE, h: TILE,
        kind: isQ ? 'q' : 'brick', item: isQ ? 'coin' : null
      });
    }
    /* Koin di BAWAH baris blok, bukan di dalam celahnya.

       BUG YANG DIPERBAIKI (dilaporkan dgn screenshot: "koin tidak bisa
       diambil dari atas maupun dari bawah"): koin dulu ditaruh setinggi
       H_COIN, yang jatuh PERSIS di rentang tegak baris bata
       (H_BLOCK-TILE .. H_BLOCK). Jadi koin duduk di ANTARA dua bata,
       dan celahnya cuma selebar 1 tile = 32px sementara badan pemain
       30px — sisa ruang 1px per sisi, praktis mustahil dimasuki. Dari
       atas terhalang bata, dari bawah terhalang bata juga.

       Sekarang koin digantung JELAS DI BAWAH baris blok, dengan jarak
       lebih besar dari radius ambil supaya tidak menempel ke bata. Di
       situ pemain tinggal melompat dari tanah tanpa perlu menyelinap
       masuk celah sempit sama sekali. */
    var rowBottom = GY - (H_BLOCK - TILE);     /* sisi BAWAH baris bata */
    var coinY = Math.max(rowBottom + COIN_UNDER_ROW, GY - H_COIN);
    /* Jangan sampai malah tenggelam ke tanah kalau barisnya rendah. */
    if (coinY > GY - 28) coinY = GY - 28;
    /* Koin di TENGAH celah 2-tile (gapAt & gapAt+1) -> +TILE, bukan +16. */
    L.coins.push({ x: bx + gapAt * TILE + TILE, y: coinY });
  }
  return w;
}

function placePipe(L, x, GY, rnd, stageIdx) {
  var w = segW(rnd, 0.90, 1.38);
  L.ground.push({ x: x, w: w });
  var heights = [64, 96, 128];
  var n = 1 + Math.floor(rnd() * 2);
  for (var i = 0; i < n; i++) {
    var h = heights[Math.min(2, Math.floor(rnd() * (stageIdx < 2 ? 2 : 3)))];
    L.solids.push({ x: x + 90 + i * 190, y: GY - h, w: 64, h: h, kind: 'pipe', ph: h });
  }
  return w;
}

function placeEnemyRun(L, x, GY, rnd, S, D) {
  var w = segW(rnd, 0.90, 1.38);
  L.ground.push({ x: x, w: w });
  var pool = S.enemies;
  /* Plafon variasi: maks 2 tipe per encounter */
  var t1 = pool[Math.floor(rnd() * pool.length)];
  var t2 = pool[Math.floor(rnd() * pool.length)];
  var n = Math.max(D.minEnemies, 1 + Math.floor(rnd() * 2));
  for (var i = 0; i < n; i++) {
    var type = (i % 2 === 0) ? t1 : t2;
    var ey = (type === 'E3' || type === 'E4')
      ? GY - H_FLY - Math.floor(rnd() * 40) : GY - 40;
    L.spawns.push({ x: x + 110 + i * (90 + Math.floor(rnd() * 60)), y: ey, type: type });
  }
  return w;
}

/* Jamin pijakan naik tiap 6-10 tile (192-320px) */
function ensureElevation(L, GY, rnd) {
  var step = 260;
  for (var x = 700; x < L.len - 700; x += step) {
    var found = false;
    for (var i = 0; i < L.solids.length; i++) {
      var s = L.solids[i];
      if (s.x > x - step && s.x < x + step && s.y < GY - 40) { found = true; break; }
    }
    if (!found && isGroundAt(L, x)) {
      L.solids.push({ x: x, y: GY - H_PLAT, w: TILE * 2, h: 14, kind: 'plat' });
      /* Koin MELAYANG di atas pijakan, bukan setinggi pijakan lain.
         Dulu dipakai H_PLAT2, padahal keduanya di-clamp ke H_REACH: pada
         setelan bawaan (platH 74, platH2 54) H_PLAT dan H_PLAT2 sama-sama
         jadi 97, sehingga koin tertanam PERSIS di dalam papan pijakan dan
         tidak bisa diambil. Tingginya kini diturunkan dari pijakan itu
         sendiri, jadi selalu ada jarak berapa pun setelan slidernya. */
      L.coins.push({ x: x + 32, y: GY - H_PLAT - COIN_OVER_PLAT });
    }
  }
}

function isGroundAt(L, x) {
  for (var i = 0; i < L.ground.length; i++) {
    if (x >= L.ground[i].x && x <= L.ground[i].x + L.ground[i].w) return true;
  }
  return false;
}

/* Cari koordinat x BERTANAH di dalam [x0,x1). Dipakai validator saat menambal:
   mengecek hanya titik tengah segmen tidak cukup — tengah sering jatuh di jurang,
   sehingga tambalan tak pernah terjadi & segmen selamanya gagal validasi. */
function findGroundInSegment(L, x0, x1) {
  for (var x = x0 + 60; x < x1 - 40; x += 40) {
    if (isGroundAt(L, x)) return x;
  }
  return null;
}

/* Dekorasi: >=1 far + 1-2 landmark + 2-4 foreground + >=1 ambient per layar */
function buildDecor(L, GY, rnd, S) {
  for (var x = 0; x < L.len; x += BW) {
    L.props.push({ x: x + 60 + rnd() * 200, y: GY - 190, kind: 'far', layer: 0.2 });
    L.props.push({ x: x + 150 + rnd() * 240, y: GY - 20, kind: 'land', layer: 0.45 });
    var nFg = 2 + Math.floor(rnd() * 3);
    for (var i = 0; i < nFg; i++) {
      L.props.push({ x: x + rnd() * BW, y: GY - 6, kind: 'fg', layer: 0.7 });
    }
    L.props.push({ x: x + rnd() * BW, y: 90 + rnd() * 140, kind: 'amb', layer: 0.1 });
  }
}

/* Validator density: tambal segmen yang gagal (bukan diluluskan) */
function fixDensity(L, GY, rnd, S, D) {
  var passes = 0;
  while (passes++ < 5) {
    var fails = validateDensity(L, GY, D);
    if (!fails.length) break;
    for (var i = 0; i < fails.length; i++) {
      var f = fails[i], x = f[0];
      if (f[1] === 'enemies') {
        /* Cari titik BERTANAH di dalam segmen — jangan cuma cek tengahnya,
           karena tengah segmen sering jatuh tepat di jurang sehingga tambalan
           tak pernah terjadi dan segmen selamanya gagal. */
        var sx = findGroundInSegment(L, x, x + BW);
        if (sx != null) {
          var pool = S.enemies;
          L.spawns.push({ x: sx, y: GY - 40, type: pool[Math.floor(rnd() * pool.length)] });
        } else {
          /* Segmen ini memang jurang penuh (mis. rangkaian gap) — musuh tak
             mungkin berdiri. Isi dengan koin melayang supaya tetap tidak sepi. */
          for (var q = 0; q < 4; q++) L.coins.push({ x: x + 110 + q * 44, y: GY - H_COIN });
        }
      } else if (f[1] === 'interactive' || f[1] === 'deadair') {
        for (var c = 0; c < 4; c++) L.coins.push({ x: x + 120 + c * 40, y: GY - H_COIN });
      } else if (f[1] === 'platforms') {
        /* Platform melayang boleh di atas jurang (justru berguna), jadi tak
           perlu syarat bertanah — cukup taruh di dalam segmen. */
        L.solids.push({ x: x + BW / 2, y: GY - H_PLAT, w: TILE * 2, h: 14, kind: 'plat' });
      } else if (f[1] === 'props') {
        for (var p = 0; p < 3; p++) L.props.push({ x: x + rnd() * BW, y: GY - 6, kind: 'fg', layer: 0.7 });
      }
    }
  }
}

function validateDensity(L, GY, D) {
  var fails = [];
  for (var x = 0; x < L.len - BW; x += BW) {
    var safe = x < 640;
    var nEnemy = countIn(L.spawns, x, x + BW);
    var nCoin  = countIn(L.coins,  x, x + BW);
    var nSolid = countIn(L.solids, x, x + BW);
    var nProp  = 0, i;
    for (i = 0; i < L.props.length; i++) {
      if (L.props[i].kind === 'fg' && L.props[i].x >= x && L.props[i].x < x + BW) nProp++;
    }
    var nPlat = 0;
    for (i = 0; i < L.solids.length; i++) {
      if (L.solids[i].x >= x && L.solids[i].x < x + BW && L.solids[i].y < GY - 40) nPlat++;
    }
    if (!safe && nEnemy < D.minEnemies) fails.push([x, 'enemies']);
    if (nCoin + nSolid < 2)             fails.push([x, 'interactive']);
    if (nPlat < 1)                      fails.push([x, 'platforms']);
    if (nProp < 2)                      fails.push([x, 'props']);
    /* Dead air: segmen tanpa apa pun */
    if (nEnemy + nCoin + nSolid === 0)  fails.push([x, 'deadair']);
  }
  return fails;
}
function countIn(arr, x0, x1) {
  var n = 0;
  for (var i = 0; i < arr.length; i++) if (arr[i].x >= x0 && arr[i].x < x1) n++;
  return n;
}

/* Kepingan: 60% jalur utama / 40% platform atas (EASY: 100% jalur) */
function placePieces(L, GY, rnd, stageIdx, D) {
  var keys = piecesForStage(stageIdx);
  if (!keys.length) return;
  var span = (L.goalX - 900) / keys.length;
  for (var i = 0; i < keys.length; i++) {
    var px = 800 + i * span + rnd() * (span * 0.35);
    /* Pastikan berdiri di atas tanah */
    var guard = 0;
    while (!isGroundAt(L, px) && guard++ < 40) px += 60;
    var onPath = rnd() < D.pieceOnPath;
    var py = onPath ? GY - H_PIECE_LO : GY - H_PIECE;
    if (!onPath) {
      /* M002: platform pijakan. Tingginya H_PLAT2 yang sudah di-CLAMP
         <= H_REACH di recomputeDerived(), jadi tetap terjangkau berapa pun
         setelan lompat di panel tuner. */
      L.solids.push({ x: px - TILE, y: GY - H_PLAT2, w: TILE * 2, h: 14, kind: 'plat' });
    }
    L.pieces.push({ x: px, y: py, key: keys[i] });
  }
}

/* CELAH "HAMPIR MUAT" DI BARIS MELAYANG.
   ---------------------------------------------------------------------
   Dilaporkan user: menjatuhkan diri lewat celah plafon "harus diulang
   beberapa kali dulu" walau sprite sudah dikecilkan.

   Selain celah yang memang dibuat generator (sudah dilebarkan jadi 2
   tile), ada celah yang lahir TANPA SENGAJA: dua baris melayang yang
   kebetulan berhenti berdekatan menyisakan ruang 36-37px. Karena
   penyebabnya KOMBINASI antar-pola — bukan satu penghasil yang salah —
   perbaikannya harus di pass umum seperti ini, bukan ditambal di
   masing-masing penghasil.

   Aturannya: sebuah celah boleh SEMPIT (jelas bukan jalan, pemain tidak
   akan mencoba) atau LEBAR (jelas bisa dilewati). Yang dilarang adalah
   yang di antaranya — cukup lebar untuk terlihat seperti jalan, tapi
   terlalu sempit untuk dimasuki tanpa ketepatan piksel. Celah seperti
   itu DITUTUP: lebih baik jelas-jelas tembok daripada jebakan. */
function fixTightGaps(L) {
  var bodyW = playerBodyW();
  var step = Math.ceil(PHYS.RUN_SPEED / 60);
  var need = bodyW + step * 2;              /* lebar minimum yang andal */
  var byY = {}, i;
  for (i = 0; i < L.solids.length; i++) {
    var b = L.solids[i];
    if (b.kind !== 'brick' && b.kind !== 'q') continue;
    (byY[b.y] = byY[b.y] || []).push(b);
  }
  var added = 0;
  for (var yk in byY) {
    if (!Object.prototype.hasOwnProperty.call(byY, yk)) continue;
    var row = byY[yk].sort(function (a, b2) { return a.x - b2.x; });
    for (var j = 1; j < row.length; j++) {
      var left = row[j - 1].x + row[j - 1].w;
      var gap = row[j].x - left;
      /* Hanya celah "hampir muat" yang disentuh: lebih lebar dari badan
         (jadi menggoda) tapi sisa ruangnya di bawah satu langkah frame. */
      if (gap > bodyW && gap < need) {
        L.solids.push({ x: left, y: row[j].y, w: gap, h: TILE, kind: 'brick', item: null });
        added++;
      }
    }
  }
  return added;
}

/* Playability: perbaiki gap mustahil & kepingan tak terjangkau */
function fixPlayability(L, GY) {
  fixTightGaps(L);
  /* Urutkan ground, cek tiap celah */
  L.ground.sort(function (a, b) { return a.x - b.x; });
  for (var i = 0; i < L.ground.length - 1; i++) {
    var end = L.ground[i].x + L.ground[i].w;
    var next = L.ground[i + 1].x;
    var gap = next - end;
    if (gap > D_MAX_PX * 0.92) {
      /* Terlalu lebar -> sisipkan platform tengah */
      L.solids.push({ x: end + gap / 2 - TILE, y: GY - H_PLAT, w: TILE * 2, h: 14, kind: 'plat' });
    }
  }
  /* Kepingan tidak boleh melayang di atas jurang tanpa pijakan */
  for (var p = 0; p < L.pieces.length; p++) {
    var pc = L.pieces[p];
    if (!isGroundAt(L, pc.x)) {
      var hasPlat = false;
      for (var s = 0; s < L.solids.length; s++) {
        var so = L.solids[s];
        if (Math.abs(so.x - pc.x) < 60 && so.y > pc.y) { hasPlat = true; break; }
      }
      if (!hasPlat) L.solids.push({ x: pc.x - TILE, y: pc.y + 50, w: TILE * 2, h: 14, kind: 'plat' });
    }
  }
}


/* =====================================================================
   [9] GAME SCENE
   ===================================================================== */
/* ⚠️ PENTING: pewarisan dari Phaser.Scene DITUNDA sampai Phaser benar-benar
   ter-load (linkScene(), dipanggil dari bootGame). Kalau ditulis di top-level
   sebagai `GameScene.prototype = Object.create(Phaser.Scene.prototype)`, script
   ini MATI dengan ReferenceError saat Phaser belum siap — dan ensurePhaser()
   memuatnya secara ASYNC, jadi kondisi itu normal terjadi, bukan kasus langka.
   Semua method di bawah didefinisikan pada objek biasa, lalu di-graft. */
function GameScene() {
  if (window.Phaser && window.Phaser.Scene) {
    window.Phaser.Scene.call(this, { key: 'GameScene' });
  }
}
var _sceneLinked = false;
function linkScene() {
  if (_sceneLinked || !window.Phaser || !window.Phaser.Scene) return;
  var own = GameScene.prototype;                       /* method yang sudah ditulis */
  var proto = Object.create(window.Phaser.Scene.prototype);
  for (var k in own) if (Object.prototype.hasOwnProperty.call(own, k)) proto[k] = own[k];
  proto.constructor = GameScene;
  GameScene.prototype = proto;
  _sceneLinked = true;
}

GameScene.prototype.init = function (data) {
  this.stageIdx = (data && typeof data.stage === 'number') ? data.stage : (runState ? runState.stage : 0);
  /* Posisi lanjut sesudah stage dibangun ulang (mis. sesudah ganti
     sprite yang mengubah ukuran). Tanpa ini pemain selalu dilempar
     kembali ke awal stage padahal cuma gambarnya yang berubah. */
  this.resumeX = (data && typeof data.resumeX === 'number') ? data.resumeX : null;
  this.diffKey = STORE.diff || 'easy';
  this.D = DIFF[this.diffKey] || DIFF.easy;
  /* Reset flag boss tiap stage — jangan bocor antar sektor */
  this.arenaX = null;
  this.bossActive = false;
  this.bossHp = 12;
  this._next = 0;
  this.clearSeq = null;
};

GameScene.prototype.create = function () {
  var self = this;
  var S = STAGES[this.stageIdx];
  var GY = CONFIG_GROUND_Y();
  this.GY = GY;

  /* URUTAN PENTING — jangan dibalik.
     purgeArtTextures() membuang SEMUA key 't_*', termasuk potongan sheet.
     Dulu ia dipanggil di dalam buildTextures(); kalau begitu, potongan
     sheet yang didaftarkan lebih dulu ikut terhapus dan pemain diam-diam
     balik ke art prosedural sesudah "Terapkan & ulang stage".
     Sekarang purge dikeluarkan ke sini supaya urutannya eksplisit:
       purge -> daftarkan sheet -> bangun sisa prosedural (guard exists). */
  if (_tuneTexDirty) { purgeArtTextures(this); _tuneTexDirty = false; }
  applySheetTextures(this);
  buildTextures(this);

  this.L = buildLevel(this.stageIdx, this.diffKey, STORE.seed);
  var L = this.L;

  this.physics.world.setBounds(0, 0, L.len, BH + 400);

  /* ---- Backdrop: sky + 3 lapis parallax ----
     LANGIT juga bisa berasal dari bg-sheet.png. Kalau kotak 'sky_<id>'
     ada di sana, dipasang sebagai gambar; kalau tidak, digambar
     prosedural seperti semula. */
  this.bgGroup = this.add.group();
  var skyKey = 'sky_' + S.id;
  if (bgTextureFromSheet(this, skyKey, BW, BH)) {
    var skyImg = this.add.image(0, 0, skyKey).setOrigin(0, 0)
      .setScrollFactor(0).setDepth(-100);
    skyImg.setDisplaySize(BW, BH);
    this.bgGroup.add(skyImg);
  } else {
    var sky = this.add.graphics().setScrollFactor(0).setDepth(-100);
    paintSkyDithered(sky, SKIES[S.id] || SKIES[0], GY);
    this.bgGroup.add(sky);
  }
  this.buildParallax(S, GY);

  /* ---- Tanah & solid ---- */
  this.platforms = this.physics.add.staticGroup();
  /* DUA lapis tekstur: permukaan (baris 1, yang dipijak) dan isian
     (baris 2 ke bawah). Keduanya bisa diganti sendiri-sendiri dari
     dialog. Kalau tekstur permukaan tidak ada, jatuh ke tekstur isian
     supaya tanah tidak pernah bolong. */
  var gTex = scene_texKey(this, 't_gr_s', S.id, 't_gr_s0');
  var gTop = scene_texKey(this, 't_gr_top_s', S.id, 't_gr_top_s0');
  if (!this.textures.exists(gTop)) gTop = gTex;
  /* Kedalaman isian tanah: dari permukaan sampai DASAR LAYAR.

     BUG YANG DIPERBAIKI (screenshot user: "ground masih terdapat blank
     space"): dulu lapisan bawah dipatok 2 baris, jadi tanah berhenti di
     GY + 96px. Padahal jarak permukaan ke dasar layar = TUNE.groundY,
     ditambah 50px lagi di layar sentuh — total 200px. Sisanya ~104px
     tampak kosong. Reset memang membuatnya "benar" sesaat karena BH
     terukur ulang, tapi celahnya tetap ada; yang salah bukan waktunya,
     melainkan kedalamannya yang tidak pernah dihitung dari BH.

     Dipakai tileSprite, BUKAN ratusan add.image: mengisi 200px x panjang
     level dengan petak 32px menghasilkan ~1300 objek (dulu 412), padahal
     hasil gambarnya identik. Satu tileSprite per segmen = 1 objek. */
  var fillH = Math.max(TILE, Math.ceil((BH - GY) / TILE) * TILE);
  for (var i = 0; i < L.ground.length; i++) {
    var seg = L.ground[i];
    var tiles = Math.ceil(seg.w / TILE);
    for (var t = 0; t < tiles; t++) {
      var gx = seg.x + t * TILE;
      if (gx > L.len) break;
      this.platforms.create(gx + TILE / 2, GY + TILE / 2, gTop).refreshBody();
    }
    /* isian di bawah permukaan */
    var segW2 = Math.min(seg.w, Math.max(0, L.len - seg.x));
    if (segW2 > 0) {
      this.add.tileSprite(seg.x, GY + TILE, segW2, fillH, gTex)
        .setOrigin(0, 0).setDepth(-5);
      /* ⚠️ TileSprite MEM-BAKE pola-nya sendiri saat dibuat. Menimpa kanvas
         tekstur sumber (yang dilakukan redrawTexture saat ganti sprite)
         TIDAK terlihat di sini — inilah sebabnya "isian tanah diubah tapi
         tidak ngaruh", padahal permukaannya (Image biasa) langsung berubah.
         Objeknya dicatat supaya bisa dipaksa membangun ulang pola setelah
         swap; lihat refreshGroundFill(). */
    }
  }

  this.bricks = this.physics.add.staticGroup();
  this.hardBlocks = this.physics.add.staticGroup();
  for (i = 0; i < L.solids.length; i++) {
    var s = L.solids[i];
    var obj;
    if (s.kind === 'q') {
      obj = this.bricks.create(s.x + 16, s.y + 16, 't_q0');
      obj.setData('kind', 'q'); obj.setData('item', s.item || 'coin');
      playSlot(obj, 'qblock');
    } else if (s.kind === 'brick') {
      obj = this.bricks.create(s.x + 16, s.y + 16, 't_brick');
      obj.setData('kind', 'brick');
    } else if (s.kind === 'plat') {
      /* Hitbox tetap SATU objek selebar pijakan (tak berubah dari
         sebelumnya). Yang berubah hanya gambarnya: dirakit dari ujung
         kiri + tengah berulang + ujung kanan, bukan satu sprite yang
         diregangkan. Badan fisiknya dibuat tak terlihat supaya tidak
         menimpa rakitan itu. */
      obj = this.hardBlocks.create(s.x + s.w / 2, s.y + 7, 't_plat');
      obj.setScale(s.w / TILE, 1).refreshBody();
      obj.setVisible(false);
      this.drawPlatform(s.x, s.y, s.w);
    } else if (s.kind === 'pipe') {
      var key = s.ph >= 128 ? 't_pipe128' : s.ph >= 96 ? 't_pipe96' : 't_pipe64';
      obj = this.hardBlocks.create(s.x + 32, s.y + s.ph / 2, key);
    } else {
      obj = this.hardBlocks.create(s.x + 16, s.y + 16, 't_brick');
    }
    if (obj && obj.refreshBody) obj.refreshBody();
  }

  /* ---- Koin ---- */
  this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
  for (i = 0; i < L.coins.length; i++) {
    var cn = this.coins.create(L.coins[i].x, L.coins[i].y, 't_coin0');
    playSlot(cn, 'coin');
    cn.body.setAllowGravity(false);
  }

  /* ---- Kepingan undangan ---- */
  this.pieces = this.physics.add.group({ allowGravity: false, immovable: true });
  for (i = 0; i < L.pieces.length; i++) {
    var pc = L.pieces[i];
    if (STORE.unlocked.indexOf(pc.key) !== -1) continue;   /* sudah diambil */
    var pe = this.pieces.create(pc.x, pc.y, 't_piece0');
    pe.setData('key', pc.key);
    playSlot(pe, 'piece');
    pe.body.setAllowGravity(false);
    this.tweens.add({ targets: pe, y: pc.y - 10, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /* ---- Power-up (keluar dari blok) ---- */
  this.powerups = this.physics.add.group();

  /* ---- Musuh: group + spawnList data inert ---- */
  this.enemies = this.physics.add.group({ maxSize: 32, runChildUpdate: false });
  this.spawnList = L.spawns;

  /* ---- Peluru BUKET (power-up menembak) ----
     Kolam tetap (maxSize) supaya menembak terus-menerus tidak pernah
     menambah objek baru — pola yang sama dengan musuh. */
  this.shots = this.physics.add.group({ maxSize: SHOT_MAX, runChildUpdate: false });
  this.shotCdUntil = 0;

  /* POWER-UP BERDURASI TIDAK BOLEH MELINTASI STAGE.
     -----------------------------------------------------------------
     runState hidup terus antar-stage, tapi `powerupUntil` diukur dengan
     this.time.now — dan JAM ITU KEMBALI KE NOL setiap scene dibangun
     ulang (ganti stage, mati, "Terapkan" dari dialog sprite). Akibatnya
     `time > powerupUntil` tidak akan pernah benar lagi dan power-up
     yang terbawa jadi BERLAKU SELAMANYA.

     Aturannya disamakan dengan retromario: kemampuan menembak tidak
     ikut berpindah stage. Jadi power-up berdurasi dibersihkan di sini,
     saat dunia baru dibangun. */
  if (runState && runState.powerup) {
    runState.powerup = null;
    runState.powerupUntil = 0;
    this.physics.world.gravity.y = PHYS.GRAVITY_Y;
  }
  /* Jaminan "kotak power-up pertama = buket" berlaku PER STAGE.
     Disetel eksplisit di sini, tidak mengandalkan scene selalu objek
     baru: restart di tempat (Terapkan dari dialog sprite, resumeX) bisa
     memakai ulang instance yang sama, dan kalau bendera ini terbawa,
     stage berikutnya kehilangan jaminannya tanpa gejala yang kelihatan. */
  this._buketGiven = false;
  syncShootBtn();

  /* ---- Player ---- */
  this.player = this.physics.add.sprite(90, GY - 80, 't_groom_idle0');
  this.player.setCollideWorldBounds(false);
  setPlayerBody(this.player, 'dasar');
  this.player.setDepth(10);
  playSlot(this.player, 'player_idle');
  this.player.direction = 1;
  this.player.invuln = 0;
  this.player.invincible = cheat.on;
  this.player.mode = 'dasar';
  this.player.autoFly = false;
  this.player.respawnX = 90;
  this.player.lastGroundTime = 0;
  this.player.jumpBufferAt = -9999;
  this.player.dying = false;

  /* ---- Goal ----
     KAKI bendera dipatok ke permukaan tanah, bukan titik tengahnya ke
     angka mati.

     BUG YANG DIPERBAIKI (screenshot user: "bendera ga bisa pas di atas
     ground, selalu muncul di bawah tanah"): dulu ditaruh di GY - 80,
     angka mati yang mengasumsikan tinggi tekstur ~160px. Begitu bendera
     diperbesar lewat slider, setengah tingginya melebihi 80 dan kakinya
     tenggelam — pada 250% (tinggi 280px) kakinya jatuh 60px DI BAWAH
     tanah. Slider naik/turun mentok di 24px, jadi tidak akan pernah
     cukup untuk menariknya keluar; itu sebabnya terasa "tidak bisa".

     Sekarang y dihitung dari tinggi tekstur yang BERLAKU, sehingga
     kakinya selalu menyentuh tanah berapa pun skalanya. */
  this.goal = this.physics.add.staticSprite(L.goalX, GY, 't_goal');
  this.goal.setOrigin(0.5, 1);            /* titik acuan = KAKI, bukan tengah */
  this.goal.setPosition(L.goalX, GY);
  this.goal.refreshBody();
  /* Bendera berkibar. refreshBody() SUDAH dipanggil di atas dan keempat
     rangka seukuran, jadi hitbox tidak berubah saat anim berjalan. */
  playSlot(this.goal, 'goal');

  /* ---- Boss (stage terakhir) ---- */
  if (S.boss) this.buildBossArena(L, GY);

  /* ---- COLLIDER / OVERLAP (urutan penting) ---- */
  this.physics.add.collider(this.player, this.platforms);
  this.physics.add.collider(this.player, this.hardBlocks);
  this.physics.add.collider(this.player, this.bricks, this.hitBrick, null, this);

  this.physics.add.collider(this.enemies, this.platforms);
  this.physics.add.collider(this.enemies, this.hardBlocks);
  this.physics.add.collider(this.enemies, this.bricks);

  this.physics.add.collider(this.powerups, this.platforms);
  this.physics.add.collider(this.powerups, this.hardBlocks);
  this.physics.add.collider(this.powerups, this.bricks);

  /* Player x enemies WAJIB overlap (bukan collider) — repo GameScene:498 */
  this.physics.add.overlap(this.player, this.enemies, this.touchEnemy, null, this);
  /* Peluru BUKET: kena musuh, dan kena bos. Bos dipasang belakangan
     (di buildBossArena) karena sprite-nya baru ada di stage bos. */
  this.physics.add.overlap(this.shots, this.enemies, this.shotHitsEnemy, null, this);
  this.physics.add.overlap(this.player, this.coins, this.takeCoin, null, this);
  this.physics.add.overlap(this.player, this.pieces, this.takePiece, null, this);
  this.physics.add.overlap(this.player, this.powerups, this.takePowerup, null, this);
  this.physics.add.overlap(this.player, this.goal, this.reachGoal, null, this);

  /* ---- Kamera: X -40% (pandangan depan) + Y +100 (anti goyang saat lompat) ----

     JANGAN mempersempit tinggi bounds kamera (pernah dicoba & MERUSAK).
     Viewport-nya setinggi BH (960px). Kalau bounds dibuat lebih pendek dari
     viewport (mis. setBounds(..., BH - camTop)), Phaser tidak bisa mengisi
     layar dari dunia yang lebih pendek: scrollY ter-clamp, tanah terlempar
     ke atas layar, dan lapis ber-scrollFactor 0 (langit) serta parallax
     muncul sebagai PITA bertumpuk di bawahnya. Tinggi bounds HARUS >= tinggi
     viewport. Ruang kosong diatasi lewat penempatan konten (garis cakrawala
     & isi latar), bukan lewat pemotongan kamera. */
  var cam = this.cameras.main;
  cam.setBounds(0, 0, L.len, BH);
  cam.startFollow(this.player, true, 0.14, 0.14);
  cam.setDeadzone(20, 120);
  cam.setFollowOffset(-Math.round(BW * 0.40), 100);

  /* ---- LANJUT DARI POSISI TERAKHIR (bukan dari awal stage) ----
     Dipakai sesudah stage dibangun ulang karena ganti sprite mengubah
     ukuran. Pemain diletakkan MUNDUR sedikit dari tempat terakhir, di
     titik berpijak yang aman — sama seperti respawn saat jatuh — supaya
     tidak muncul di dalam blok atau di atas jurang. Kamera dipatok ke
     situ juga, kalau tidak akan terlihat menyapu dari awal stage. */
  if (this.resumeX != null) {
    var rx = Math.max(90, Math.min(this.resumeX, L.len - 120));
    var safeX = this.findSafeRespawn(rx + 200);   /* mundur ~200px */
    this.player.setPosition(safeX, GY - 90);
    this.player.body.reset(safeX, GY - 90);
    this.player.respawnX = safeX;
    this.player.invuln = 900;                     /* jangan langsung kena */
    cam.centerOn(safeX, this.player.y);
    /* Musuh yang kebetulan tepat di titik munculnya dibekukan sesaat,
       supaya tidak langsung menabrak begitu stage kembali jalan. */
    this.freezeEnemiesNear(safeX, 900);
  }

  /* ---- Input ---- */
  this.setupInput();

  updateHud();
  hideError();

  /* Kalau ada overlay terbuka saat scene dibuat, langsung pause */
  if (anyOverlayOpen()) { try { this.scene.pause(); } catch (e) {} }
};

/* Campur dua warna 0xRRGGBB dengan rasio t (0=a, 1=b). Dipakai untuk
   membangun ramp atmospheric perspective tanpa menulis warna manual. */
function blend(a, b, t) {
  var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  var r = Math.round(ar + (br - ar) * t);
  var g = Math.round(ag + (bg - ag) * t);
  var bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/* ============================================================
   DITHERING — inti dari "retro pixel art cantik"

   Gradient halus (fillGradientStyle) adalah penanda paling kuat bahwa sebuah
   gambar BUKAN pixel art. Hardware 8/16-bit tidak punya cukup warna, jadi
   seniman mencampur dua warna solid dengan pola checkerboard supaya mata
   melihat warna antara. Pola itulah yang kita tiru.

   ditherBand(g, cTop, cBot, y, h, DP) menggambar transisi cTop->cBot setinggi h
   dalam beberapa tahap; tiap tahap makin banyak titik cBot-nya (0/16, 4/16,
   8/16, 12/16, 16/16) memakai matriks Bayer 4x4. Hasilnya gradasi bertekstur,
   bukan gradasi mulus. */
var BAYER4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

/* DP = ukuran satu titik dither dalam piksel layar. Harus SAMA ATAU LEBIH BESAR
   dari PX sprite (4) — kalau lebih kecil, pola terlihat seperti noise/JPEG
   artifact, bukan dither yang disengaja. */
var DP = 4;

/* =====================================================================
   SATU GRID PIKSEL UNTUK SELURUH LATAR  —  "the sacred rule"
   =====================================================================
   Cacat paling merusak pada versi sebelumnya BUKAN kurang detail,
   melainkan GRID PIKSEL YANG BERCAMPUR: gunung digambar pada blok 8px,
   kincir & Baratie pada 6px, pohon & dither pada 4px. Semuanya tampil
   berdampingan dalam satu layar.

   Kenapa itu fatal — mata mengunci pada blok TERBESAR yang terlihat dan
   menganggapnya "satu piksel". Semua yang lebih halus lalu terbaca
   sebagai cacat/artefak, bukan detail. Efeknya persis: gambar berhenti
   terbaca sebagai pixel art dan mulai terbaca sebagai gambar biasa yang
   diperbesar asal-asalan. Istilahnya "mixels", dan sumber-sumber rujukan
   (Saint11 "Consistency", Slynyrd, Arne Niklas Jansson) menyebutnya
   sebagai penanda paling jelas karya amatir.

   Karena itu SELURUH latar sekarang digambar pada SATU grid: GRID.
   Kedalaman TIDAK BOLEH lagi dinyatakan dengan memperbesar blok
   (itu melanggar aturan yang sama); kedalaman dinyatakan lewat WARNA
   (lihat hazeTo) dan lewat KERAPATAN DETAIL (lihat tangga vegetasi).

   snapG() memaksa sebuah koordinat ke grid itu. Semua fungsi lukis latar
   memakainya, jadi tidak ada lagi tepi yang jatuh di antara piksel. */
var GRID = 4;
function snapG(v) { return Math.round(v / GRID) * GRID; }

/* PENJAGA GRID.
   -------------------------------------------------------------------
   Memakai snapG() di tiap perhitungan tidak cukup dan tidak tahan lama:
   fungsi lukis latar menghitung posisi dari lusinan ekspresi (cx - w/2,
   fl * ((h - dp*4) / 8), dst). Cukup SATU yang lupa dibulatkan untuk
   memunculkan kembali tepi setengah-piksel, dan itu tidak akan
   ketahuan sampai ada yang memelototi layar.

   Jadi pembulatan dilakukan di SATU pintu keluar: pembungkus ini
   menyalin objek Graphics dan membulatkan setiap fillRect ke grid.
   Semua lapis latar digambar lewat pembungkus ini, sehingga aturan
   "satu grid" berlaku secara struktural — bukan bergantung pada
   kedisiplinan tiap pemanggil.

   CATATAN: lebar/tinggi dibulatkan MINIMAL 1 sel, supaya detail tipis
   (tiang, bilah kincir) tidak lenyap jadi 0 saat dibulatkan. */
function gridGuard(g) {
  return {
    fillStyle: function (c, a) { g.fillStyle(c, a); },
    fillRect: function (x, y, w, h) {
      var x0 = snapG(x), y0 = snapG(y);
      g.fillRect(x0, y0,
                 Math.max(GRID, snapG(w)),
                 Math.max(GRID, snapG(h)));
    },
    /* SENGAJA hanya fillRect + fillStyle yang disediakan.
       Bentuk lengkung (fillCircle/arc/fillTriangle) tidak boleh dipakai
       di latar sama sekali: hasilnya tepi anti-alias yang tidak duduk di
       grid piksel, dan itu langsung merusak kesan pixel art. Melarangnya
       di sini membuat aturan itu ditegakkan oleh KODE — bukan sekadar
       diingat-ingat. Lingkaran dibuat dari kotak ber-step (lihat cakram
       matahari di buildParallax). */
    lineStyle:  function () { return g.lineStyle.apply(g, arguments); },
    strokeRect: function () { return g.strokeRect.apply(g, arguments); }
  };
}

/* ---------------------------------------------------------------------
   WARNA: RAMP DENGAN PERGESERAN RONA (bukan campur hitam/putih)
   ---------------------------------------------------------------------
   Aturan yang dilanggar versi lama: bayangan dibuat dengan menggelapkan
   warna yang sama. Di alam itu tidak terjadi — cahaya terang condong
   ke kuning/jingga (hangat) dan bayangan condong ke biru/ungu (dingin).
   Ramp yang dibuat dengan mencampur hitam/putih selalu terlihat kusam
   dan "berkapur".

   shade(c, t) menggeser sebuah warna sepanjang ramp:
     t > 0  -> ke arah cahaya : lebih terang, rona bergeser HANGAT
     t < 0  -> ke arah bayang : lebih gelap,  rona bergeser DINGIN
   Saturasi mengikuti kurva berpuncak di tengah (tidak pernah 0 atau 1),
   sebab menggabungkan saturasi tinggi dengan kecerahan tinggi adalah
   kesalahan warna yang paling sering disebut. */
function rgbToHsv(c) {
  var r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  var h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  return { h: h, s: mx === 0 ? 0 : d / mx, v: mx };
}
function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));
  var c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  var r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return (Math.round((r + m) * 255) << 16) |
         (Math.round((g + m) * 255) << 8) |
          Math.round((b + m) * 255);
}
/* Rona "hangat" (kuning-jingga) ada di sekitar 45 derajat; rona "dingin"
   (biru-ungu) di sekitar 250. Pergeseran dibatasi ~22 derajat per langkah
   penuh: lebih dari itu warnanya berubah identitas, bukan lagi terlihat
   sebagai benda yang sama terkena cahaya berbeda. */
function shade(c, t) {
  var k = rgbToHsv(c);
  var amt = Math.max(-1, Math.min(1, t));
  var target = amt > 0 ? 45 : 250;
  /* jalan memutar terpendek menuju rona target */
  var dh = ((target - k.h + 540) % 360) - 180;
  var h = k.h + dh * Math.abs(amt) * 0.22;
  var v = k.v + (amt > 0 ? (1 - k.v) * amt * 0.55 : k.v * amt * 0.45);
  /* saturasi berpuncak di tengah: turun saat sangat terang MAUPUN sangat gelap */
  var s = k.s * (1 - Math.abs(amt) * 0.28) + (amt > 0 ? -0.04 * amt : 0.06 * Math.abs(amt));
  return hsvToRgb(h, Math.max(0.04, Math.min(0.92, s)), Math.max(0.03, Math.min(0.97, v)));
}

/* PERSPEKTIF ATMOSFER — satu-satunya alat kedalaman yang sah sekarang.
   Makin jauh sebuah lapis, warnanya makin MENYATU dengan langit:
   saturasi turun, nilai naik, kontras dalam-lapis mengecil. Ketiganya
   terjadi sekaligus hanya dengan menarik warna ke arah warna langit,
   jadi cukup satu operasi. t = 0 (dekat) .. 1 (paling jauh). */
function hazeTo(c, skyC, t) {
  var k = Math.max(0, Math.min(1, t));
  return blend(c, skyC, k);
}

function ditherBand(g, cTop, cBot, y0, h, dp) {
  dp = dp || DP;
  var cols = Math.ceil(BW / dp);
  var rows = Math.ceil(h / dp);
  if (rows < 1) return;
  /* dasar solid cTop, lalu tebar titik cBot sesuai ambang Bayer */
  g.fillStyle(cTop, 1);
  g.fillRect(0, y0, BW, h);
  g.fillStyle(cBot, 1);
  for (var r = 0; r < rows; r++) {
    /* t: 0 di atas -> 1 di bawah. Dipetakan ke ambang 0..16. */
    var t = rows === 1 ? 1 : r / (rows - 1);
    var thr = t * 16;
    for (var c = 0; c < cols; c++) {
      if (BAYER4[r & 3][c & 3] < thr) {
        g.fillRect(c * dp, y0 + r * dp, dp, dp);
      }
    }
  }
}

/* Langit = 3 pita dither bertumpuk (sky2 -> sky1 -> horizon pucat).
   Pita paling bawah sengaja dibuat paling terang: itu "haze" di garis cakrawala
   yang membuat gunung terlihat jauh. */
function paintSkyDithered(g, P, GY) {
  /* Garis cakrawala DIIKATKAN KE TANAH, bukan ke persentase tinggi frame.
     Bug yang diperbaiki ("banyak ruang kosong antar object"): dulu hzY
     dipatok di BH*0.30 (y=288). Begitu tanah ditaruh rendah (groundY 90 ->
     tanah y=870), muncul pita datar setinggi ~580px antara cakrawala dan
     tanah yang tidak berisi apa-apa — terlihat sebagai langit pucat hampa
     di tengah layar. Sekarang cakrawala selalu duduk sedikit di atas garis
     tanah, sehingga gradasi langit berakhir tepat di tempat lanskap mulai. */
  var ground = (typeof GY === 'number' && GY > 0) ? GY : Math.round(BH * 0.72);
  var hzY = Math.max(Math.round(BH * 0.10), Math.round(ground - BH * 0.20));
  var band = Math.round(BH * 0.08);

  /* LANGIT SEBAGAI SATU RAMP BERTAHAP, bukan 3 pita datar.
     -----------------------------------------------------------------
     Versi lama: blok datar sky2, satu dither, blok datar sky1, satu
     dither, blok datar farHi. Dua lompatan warna besar yang di-dither
     tipis akan terbaca sebagai PITA (banding) — cacat yang paling
     sering disebut pada langit pixel art.

     Perbaikannya sesuai kaidah dithering: perbanyak WARNA ANTARA lalu
     pakai pola dither yang sedikit, bukan sebaliknya. Di sini langit
     dibagi 5 langkah warna (sky2 -> sky1 -> farHi), dan tiap batas
     antar-langkah diberi pita dither. Karena beda warna tiap langkah
     jadi kecil, ditherinya halus dan pitanya hilang.

     Tinggi tiap langkah TIDAK sama rata (menyempit ke arah cakrawala):
     pita selebar sama persis justru menegaskan banding. */
  var STEPS = 5;
  var cols = [], i;
  for (i = 0; i <= STEPS; i++) {
    var t = i / STEPS;
    /* dua bagian: atas sky2->sky1, bawah sky1->farHi */
    cols.push(t < 0.5 ? blend(P.sky2, P.sky1, t * 2)
                      : blend(P.sky1, P.farHi, (t - 0.5) * 2));
  }
  /* bobot menyempit ke bawah -> langit terasa "menjauh" ke cakrawala */
  var wsum = 0, ws = [];
  for (i = 0; i < STEPS; i++) { var wv = 1.5 - i * 0.18; ws.push(wv); wsum += wv; }
  var y = 0;
  for (i = 0; i < STEPS; i++) {
    var hSeg = Math.round(hzY * (ws[i] / wsum));
    if (i === STEPS - 1) hSeg = Math.max(0, hzY - y);
    /* separuh atas tiap segmen solid, separuh bawah meleburkan ke warna
       berikutnya — inilah yang menghapus garis batas. */
    var solidH = Math.max(0, Math.round(hSeg * 0.45));
    g.fillStyle(cols[i], 1);
    g.fillRect(0, y, BW, solidH);
    ditherBand(g, cols[i], cols[i + 1], y + solidH, Math.max(1, hSeg - solidH));
    y += hSeg;
  }
  /* haze cakrawala: langkah terakhir -> farHi (paling pucat) */
  ditherBand(g, cols[STEPS], P.farHi, hzY, band);
  g.fillStyle(P.farHi, 1);
  g.fillRect(0, hzY + band, BW, Math.max(0, BH - hzY - band));

  /* AWAN TERJAUH DIPANGGANG KE DALAM LANGIT.
     Awan paling jauh bukan lapis tersendiri — kontrasnya nyaris nol,
     jadi menaruhnya di lapis parallax sendiri hanya menambah biaya
     tanpa terlihat. Yang benar: lukiskan langsung ke langit dengan
     beda warna sangat tipis. Inilah yang mengisi "langit kosong" di
     bagian atas layar tanpa membuatnya ramai. */
  var cf = blend(cols[1], P.farHi, 0.55);
  for (var ci = 0; ci < 7; ci++) {
    var cxp = ((ci * 337) % Math.max(1, BW - 120)) + 40;
    var cyp = Math.round(BH * 0.06) + ((ci * 97) % Math.round(hzY * 0.42));
    paintCloud(g, cxp, cyp, 74 + (ci * 37) % 70, cf, cf, true);
  }
}

/* ------------------------------------------------------------------
   AWAN — gugusan gumpalan, bukan satu elips.
   Awan pixel art yang meyakinkan dibangun dari beberapa gumpalan
   bertumpuk dengan puncak TIDAK sama tinggi, dasar RATA (awan kumulus
   memang beralas datar), dan sisi bawah sedikit lebih gelap.
   Digambar per-kolom pada grid tunggal, sama seperti gunung. */
function paintCloud(g, cx, cy, w, cBody, cShade, flat) {
  var half = snapG(w / 2);
  var x0 = snapG(cx - half), x1 = snapG(cx + half);
  var baseY = snapG(cy);
  var lit = flat ? cBody : shade(cBody, 0.18);
  var sh  = flat ? cBody : shade(cShade, -0.14);
  for (var x = x0; x < x1; x += GRID) {
    var p = (x - x0) / Math.max(GRID, x1 - x0);       /* 0..1 sepanjang awan */
    /* tiga gumpalan dengan puncak berbeda; sin ganda supaya tidak simetris */
    var lobe = Math.sin(p * Math.PI) * 0.72
             + Math.sin(p * Math.PI * 3.1 + 1.2) * 0.20
             + Math.sin(p * Math.PI * 5.7) * 0.08;
    var h = snapG(Math.max(0, lobe) * w * 0.34);
    if (h < GRID) continue;
    g.fillStyle(lit, 1);
    g.fillRect(x, baseY - h, GRID, h);
    /* bibir bawah lebih gelap: memberi awan volume, bukan siluet datar */
    if (!flat) {
      g.fillStyle(sh, 1);
      g.fillRect(x, baseY - GRID, GRID, GRID);
    }
  }
}

/* ------------------------------------------------------------------
   SILUET GUNUNG — pengganti "bukit tangga seragam".

   Bukit versi lama memakai lebar yang menyusut linear (wHalf = (steps-s)*11)
   sehingga tiap bukit adalah segitiga identik: terbaca sebagai pola, bukan
   pemandangan. Gunung asli punya puncak ASIMETRIS (satu sisi curam, satu sisi
   landai) dan tinggi yang tidak beraturan.

   Fungsi ini menggambar satu gunung sebagai kolom-kolom piksel: untuk tiap x
   dihitung tinggi permukaan, lalu diisi dari permukaan ke bawah. Karena tinggi
   dihitung per-kolom (bukan per-baris), lerengnya bisa beda kiri-kanan. */
function paintMountain(g, cx, baseY, peakH, halfW, cBody, cSnow, snowFrac, dp) {
  /* dp diabaikan: SEMUA latar memakai satu grid (lihat GRID). Parameter
     dipertahankan supaya pemanggil lama tidak perlu diubah serentak. */
  dp = GRID;
  var x0 = snapG(cx - halfW), x1 = snapG(cx + halfW);
  var lean = (halfW * 0.22);                 /* puncak digeser -> asimetris */
  var apexX = cx - lean;
  var snowY = baseY - peakH * (snowFrac || 0.55);
  /* Arah cahaya TETAP dari kiri-atas (konvensi pixel art). Lereng yang
     membelakangi cahaya digelapkan + didinginkan; yang menghadap cahaya
     dihangatkan. Versi lama memakai satu warna datar untuk seluruh
     gunung sehingga bentuknya hanya terbaca lewat garis luar. */
  var cLit = shade(cBody, 0.24);
  var cDark = shade(cBody, -0.20);
  for (var x = x0; x < x1; x += dp) {
    var d = x < apexX ? (x - x0) / (apexX - x0) : 1 - (x - apexX) / (x1 - apexX);
    if (d <= 0) continue;
    /* Punggungan bergerigi: derau bertingkat (dua frekuensi) supaya garis
       puncak tidak mulus seperti kurva matematika. Nilainya deterministik
       dari x sehingga petak tetap bisa diulang tanpa berkedip. */
    var n = Math.sin(x * 0.09) * 0.045 + Math.sin(x * 0.31) * 0.022;
    /* d^0.72 -> lereng cekung (khas gunung), bukan garis lurus segitiga */
    var h = peakH * (Math.pow(d, 0.72) + n);
    var topY = snapG(baseY - h);
    if (topY >= baseY) continue;
    g.fillStyle(x < apexX ? cLit : cDark, 1);
    g.fillRect(x, topY, dp, baseY - topY);
    if (topY < snowY) {
      /* Tudung salju: makin ke puncak makin tebal. Sisi teduh memakai
         salju yang didinginkan supaya tudungnya ikut punya bentuk. */
      var capH = Math.min(snowY - topY, peakH * 0.42);
      g.fillStyle(x < apexX ? cSnow : shade(cSnow, -0.16), 1);
      g.fillRect(x, topY, dp, Math.max(dp, snapG(capH)));
    }
  }
}

/* Pohon pinus bertingkat — siluet segitiga bertumpuk (bukan satu segitiga).
   Tiap tingkat sedikit lebih lebar dari yang di atasnya dan dipisah 1 langkah,
   itu yang membuat pinus terbaca sebagai pinus pada resolusi rendah. */
function paintPine(g, cx, baseY, h, c, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var tiers = 4;
  var tierH = h / tiers;
  g.fillStyle(c, 1);
  for (var t = 0; t < tiers; t++) {
    var topY = baseY - h + t * tierH;
    var wMax = (h * 0.30) * (0.45 + t * 0.22);
    var rows = Math.ceil(tierH / dp);
    for (var r = 0; r < rows; r++) {
      var w = wMax * ((r + 1) / rows);
      var y = topY + r * dp;
      g.fillRect(Math.round((cx - w) / dp) * dp, y, Math.round(w * 2 / dp) * dp || dp, dp);
    }
  }
  /* batang pendek */
  g.fillRect(cx - dp, baseY - dp * 2, dp * 2, dp * 3);
}

/* ============================================================
   LANDMARK PER-PULAU (One Piece) — inilah yang membuat tiap stage
   terbaca sebagai TEMPAT tertentu, bukan "gunung generik" berulang.
   Semua digambar dari fillRect (grid DP) supaya tetap gaya pixel-art,
   dan semua dipakai DI DALAM mkLayer (petak berulang) sehingga biaya
   gambarnya tetap — pelajaran mahal dari revisi 5 (lihat catatan di
   buildParallax: JANGAN menggambar sepanjang L.len).
   ============================================================ */

/* --- KINCIR ANGIN (Desa Foosha) — 'Windmill Village' adalah nama harfiah
   desa ini, jadi kincir adalah siluet wajibnya. --- */
function paintWindmill(g, cx, baseY, h, cBody, cRoof, cBlade, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  var bw = snap(h * 0.34);
  var topY = snap(baseY - h);

  /* Menara sedikit MENGERUCUT ke atas (khas kincir), bukan balok lurus. */
  for (var y = 0; y < h; y += dp) {
    var p = y / h;
    var w = snap(bw * (0.68 + p * 0.32));
    g.fillStyle(cBody, 1);
    g.fillRect(cx - w / 2, topY + y, w, dp);
  }
  /* Atap kerucut */
  g.fillStyle(cRoof, 1);
  for (var r = 0; r < 4; r++) {
    var rw = snap(bw * (0.72 - r * 0.16));
    if (rw <= 0) continue;
    g.fillRect(cx - rw / 2, topY - (r + 1) * dp, rw, dp);
  }
  /* Baling-baling 4 bilah — poros di ATAS badan menara supaya tidak
     tertelan lapis pohon di depannya. Bilah dibuat tebal 2dp agar terlihat
     dari jauh (versi lama 1dp -> cuma terbaca sebagai garis silang tipis). */
  var hubY = topY + snap(h * 0.10);
  var bl   = snap(h * 0.42);
  g.fillStyle(cBlade, 1);
  for (var t = dp; t <= bl; t += dp) {
    g.fillRect(cx - t, hubY - t, dp * 2, dp);          /* kiri-atas  */
    g.fillRect(cx + t - dp, hubY - t, dp * 2, dp);     /* kanan-atas */
    g.fillRect(cx - t, hubY + t - dp, dp * 2, dp);     /* kiri-bawah */
    g.fillRect(cx + t - dp, hubY + t - dp, dp * 2, dp);/* kanan-bawah*/
  }
  g.fillStyle(cRoof, 1);
  g.fillRect(cx - dp, hubY - dp, dp * 2, dp * 2);      /* poros */
}

/* --- LAYAR KAPAL BAJAK LAUT (Baratie / laut) — siluet kapal di cakrawala. --- */
function paintShip(g, cx, baseY, h, cHull, cSail, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  var hw   = snap(h * 0.86);          /* lebar lambung */
  var hullH = dp * 3;
  var mastTop = snap(baseY - h);

  /* Tiang dulu (di belakang layar) */
  g.fillStyle(cHull, 1);
  g.fillRect(snap(cx - dp / 2), mastTop, dp, h - hullH);

  /* LAYAR: dua layar persegi besar yang menggantung dari tiang. Dibuat
     LEBAR (hampir selebar lambung) — versi sempit sebelumnya cuma 3-6 blok
     di dp=8 sehingga terbaca sebagai batang gelas, bukan layar. */
  var sailH = snap(h * 0.62);
  g.fillStyle(cSail, 1);
  for (var y = 0; y < sailH; y += dp) {
    var p    = y / sailH;
    /* jeda tipis di tengah = pemisah dua layar bertingkat */
    if (Math.abs(p - 0.5) < 0.045) continue;
    var half = snap(hw * (0.34 + p * 0.16));
    var bow  = snap(Math.sin(p * Math.PI) * dp);
    g.fillRect(cx - half - bow, mastTop + dp + y, (half + bow) * 2, dp);
  }

  /* LAMBUNG: trapesium terbalik (lebar di atas, menyempit ke lunas) */
  g.fillStyle(cHull, 1);
  for (var i = 0; i < 4; i++) {
    var w = snap(hw - i * dp * 2);
    if (w <= 0) continue;
    g.fillRect(cx - w / 2, baseY - hullH + i * dp, w, dp);
  }
}

/* --- BARATIE — kanon: restoran terapung; lambungnya BERBENTUK IKAN dan di
   punggungnya berdiri bangunan restoran beberapa lantai. Itu siluet yang
   tidak dimiliki lokasi lain, jadi wajib dipakai sebagai landmark stage. --- */
function paintBaratie(g, cx, baseY, h, cHull, cRoof, cWin, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  var bw = snap(h * 1.25);                 /* lambung ikan melebar */
  var bh = snap(h * 0.42);
  var hullTop = snap(baseY - bh);

  /* Lambung ikan: badan lonjong + ekor menjulang di kanan */
  g.fillStyle(cHull, 1);
  for (var y = 0; y < bh; y += dp) {
    var p = y / bh;
    var w = snap(bw * (0.72 + Math.sin((1 - p) * Math.PI * 0.5) * 0.28));
    g.fillRect(cx - w / 2, hullTop + y, w, dp);
  }
  /* ekor */
  for (var t = 0; t < 3; t++) {
    g.fillRect(snap(cx + bw * 0.44), hullTop - dp * t, dp * 2, dp * (3 + t));
  }
  /* mata ikan di haluan kiri */
  g.fillStyle(cWin, 1);
  g.fillRect(snap(cx - bw * 0.40), hullTop + dp, dp * 2, dp * 2);

  /* Bangunan restoran bertingkat di punggung */
  var rw = snap(bw * 0.52), rh = snap(h * 0.52);
  g.fillStyle(cRoof, 1);
  g.fillRect(cx - rw / 2, hullTop - rh, rw, rh);
  /* atap runcing */
  for (var r = 0; r < 3; r++) {
    var w2 = snap(rw * (1 - r * 0.26));
    g.fillRect(cx - w2 / 2, hullTop - rh - (r + 1) * dp, w2, dp);
  }
  /* jendela menyala 2 baris */
  g.fillStyle(cWin, 0.9);
  for (var wy = 0; wy < 2; wy++) {
    for (var wx = 0; wx < 3; wx++) {
      g.fillRect(cx - rw / 2 + dp + wx * snap(rw / 3), hullTop - rh + dp * 2 + wy * snap(rh / 2), dp * 2, dp * 2);
    }
  }
}

/* --- LAUT + OMBAK — One Piece adalah dunia BAJAK LAUT; tanpa laut di
   cakrawala, pemandangan bisa jadi pulau mana saja. Pita laut ini dipasang
   di lapis jauh untuk SEMUA pulau kecuali Skypiea (di atas awan) dan
   Little Garden (pedalaman hutan). --- */
function paintSea(g, y0, w, h, cDeep, cMid, cFoam, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  g.fillStyle(cDeep, 1);
  g.fillRect(0, y0, w, h);
  /* Garis ombak horizontal: makin ke bawah makin rapat & terang =
     bacaan perspektif permukaan air. */
  for (var y = 0; y < h; y += dp * 2) {
    var p = y / h;
    g.fillStyle(p > 0.45 ? cFoam : cMid, p > 0.45 ? 0.55 : 0.4);
    var step = snap(46 - p * 22);
    for (var x = snap((y * 7) % step); x < w; x += step) {
      g.fillRect(x, y0 + y, snap(10 + p * 14), dp);
    }
  }
}

/* --- KAPAL BERBENDERA JOLLY ROGER — ikon paling universal One Piece.
   Dipakai sebagai siluet kecil di garis laut. --- */
function paintJollyShip(g, cx, baseY, h, cHull, cSail, cFlag, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  var hw = snap(h * 0.80), mastTop = snap(baseY - h);
  g.fillStyle(cHull, 1);
  g.fillRect(snap(cx - dp / 2), mastTop, dp, h - dp * 3);
  /* layar */
  g.fillStyle(cSail, 1);
  var sh = snap(h * 0.50);
  for (var y = 0; y < sh; y += dp) {
    var p = y / sh, half = snap(hw * (0.30 + p * 0.18));
    g.fillRect(cx - half, mastTop + dp * 3 + y, half * 2, dp);
  }
  /* bendera tengkorak di puncak tiang: kotak + 2 titik mata */
  g.fillStyle(cFlag, 1);
  g.fillRect(cx, mastTop, dp * 4, dp * 3);
  g.fillStyle(cHull, 1);
  g.fillRect(cx + dp, mastTop + dp, dp, dp);
  g.fillRect(cx + dp * 3, mastTop + dp, dp, dp);
  /* lambung */
  g.fillStyle(cHull, 1);
  for (var i = 0; i < 3; i++) {
    var w2 = snap(hw - i * dp * 2);
    if (w2 > 0) g.fillRect(cx - w2 / 2, baseY - dp * 3 + i * dp, w2, dp);
  }
}

/* --- POHON KELAPA — pulau tropis East Blue (Cocoyasi kanon: pohon palem
   + kebun jeruk). Siluet palem instan membaca "pulau bajak laut". --- */
function paintPalm(g, cx, baseY, h, cTrunk, cLeaf, cLeafHi, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  /* batang melengkung */
  for (var y = 0; y < h; y += dp) {
    var p = y / h;
    var bend = snap(Math.sin(p * 1.1) * h * 0.16);
    g.fillStyle(cTrunk, 1);
    g.fillRect(snap(cx + bend - dp / 2), baseY - h + y, dp * 2, dp);
  }
  var topX = snap(cx + Math.sin(1.1) * h * 0.16), topY = snap(baseY - h);
  /* 5 pelepah melengkung turun */
  for (var f = 0; f < 5; f++) {
    var ang = -0.35 + f * 0.42;
    var len = h * (0.30 + (f % 2) * 0.08);
    for (var t = 0; t < len; t += dp) {
      var q = t / len;
      var lx = snap(topX + Math.cos(ang) * t * (f < 2 ? -1 : 1));
      var ly = snap(topY + Math.sin(ang) * t * 0.5 + q * q * h * 0.16);
      g.fillStyle(q < 0.5 ? cLeafHi : cLeaf, 1);
      g.fillRect(lx, ly, dp, dp * 2);
    }
  }
  /* buah kelapa */
  g.fillStyle(cTrunk, 1);
  g.fillRect(topX - dp, topY + dp, dp * 2, dp * 2);
}

/* --- PIRAMIDA / KUBAH ALABASTA — kanon: kasino Rain Dinners berbentuk
   PIRAMIDA, dan istana Alubarna berkubah ala Al-Aqsa. --- */
function paintPyramid(g, cx, baseY, h, cBody, cHi, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  var half = snap(h * 0.78);
  for (var y = 0; y < h; y += dp) {
    var w = snap(half * (y / h));
    if (w <= 0) continue;
    /* Sisi KANAN gelap, sisi KIRI terang, dibagi tepat di sumbu -> garis
       diagonal tajam dari puncak ke alas. Itu yang membuat piramida
       terbaca sebagai piramida (bukan gundukan): dua bidang, satu rusuk. */
    g.fillStyle(cBody, 1);
    g.fillRect(cx, baseY - h + y, w, dp);
    g.fillStyle(cHi, 1);
    g.fillRect(cx - w, baseY - h + y, w, dp);
  }
}
function paintDome(g, cx, baseY, h, cBody, cHi, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  var r  = snap(h * 0.42);
  var wallY = snap(baseY - h * 0.55);     /* garis pangkal kubah */
  var wallH = baseY - wallY;

  /* Badan gedung + deret LENGKUNG PINTU (ciri arsitektur Alabasta:
     istana Alubarna berkubah ala Al-Aqsa). Tanpa lengkungan ini kubah
     cuma terbaca sebagai gundukan pasir. */
  g.fillStyle(cBody, 1);
  g.fillRect(cx - r, wallY, r * 2, wallH);
  g.fillStyle(cHi, 1);
  g.fillRect(cx - r, wallY, r * 2, dp);   /* lis atas dinding */
  var arches = 3, aw = snap((r * 2) / (arches * 2 + 1));
  for (var a = 0; a < arches; a++) {
    var ax = snap(cx - r + aw + a * aw * 2);
    g.fillStyle(cHi, 1);
    g.fillRect(ax, wallY + dp * 3, aw, wallH - dp * 3);   /* lubang pintu terang */
    g.fillStyle(cBody, 1);
    g.fillRect(ax, wallY + dp * 3, dp, dp);               /* sudut lengkung */
    g.fillRect(ax + aw - dp, wallY + dp * 3, dp, dp);
  }

  /* Kubah bawang: setengah lingkaran, sisi kiri kena matahari. */
  for (var y = -r; y <= 0; y += dp) {
    var w = snap(Math.sqrt(Math.max(0, r * r - y * y)));
    if (w <= 0) continue;
    g.fillStyle(cBody, 1);
    g.fillRect(cx - w, wallY + y, w * 2, dp);
    g.fillStyle(cHi, 1);
    g.fillRect(cx - w, wallY + y, Math.max(dp, snap(w * 0.45)), dp);
  }
  /* Menara puncak */
  g.fillStyle(cHi, 1);
  g.fillRect(cx - dp / 2, wallY - r - dp * 3, dp, dp * 3);
}

/* --- PAKIS RAKSASA / GUNUNG TENGKORAK (Little Garden) — kanon: pulau purba
   dengan flora raksasa dan DUA gunung yang sebenarnya tengkorak Sea King. --- */
function paintGiantFern(g, cx, baseY, h, cDark, cLite, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  /* Batang tebal (2 dp) supaya tidak hilang di kejauhan. */
  g.fillStyle(cDark, 1);
  g.fillRect(snap(cx - dp), snap(baseY - h), dp * 2, h);

  /* Pelepah: MENYIRIP — tulang pelepah miring ke atas-luar, lalu tiap
     ruas menjulurkan DAUN PENDEK ke bawah. Itu yang membedakan pakis dari
     kabel: ada gerigi daun, bukan satu lengkung mulus.
     Rentang horizontal DIBATASI (<= 0.34*h) supaya pakis bertetangga tidak
     saling menyambung jadi jaring — bug versi sebelumnya, yang membuat
     lapis ini terbaca sebagai rangka rumah kaca / tiang listrik. */
  var FR = 4;
  var reach = h * 0.30;
  for (var f = 0; f < FR; f++) {
    var t01 = f / (FR - 1);                        /* 0 pucuk -> 1 pangkal */
    var fy  = snap(baseY - h + dp * 3 + t01 * (h * 0.56));
    var flen = reach * (0.46 + t01 * 0.54);        /* pelepah bawah lebih panjang */
    for (var s = -1; s <= 1; s += 2) {
      for (var t = dp; t < flen; t += dp) {
        var p    = t / flen;
        /* tulang pelepah NAIK sedikit lalu turun di ujung (melengkung) */
        var rib  = snap(-Math.sin(p * 2.2) * (h * 0.06) + p * p * (h * 0.10));
        var bx   = snap(cx + s * t);
        g.fillStyle(cDark, 1);
        g.fillRect(bx, fy + rib, dp, dp);
        /* daun menjulur ke bawah tiap 2 ruas -> gerigi khas pakis */
        if (t % (dp * 2) === 0 && p < 0.92) {
          var leaf = Math.max(dp, snap((1 - p) * dp * 3));
          g.fillStyle(cLite, 1);
          g.fillRect(bx, fy + rib + dp, dp, leaf);
        }
      }
    }
  }
}

/* --- GIANT JACK (Skypiea) — kanon: batang kacang RAKSASA yang menjulang
   menembus Upper Yard, plus reruntuhan emas kota Shandora di kakinya.
   Tanpa ini Skypiea cuma jadi bidang putih kosong. --- */
function paintBeanstalk(g, cx, baseY, h, cStalk, cLeaf, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var snap = function (v) { return Math.round(v / dp) * dp; };
  var sw = snap(h * 0.075);
  /* Batang berpilin: sedikit berkelok supaya organik, bukan tiang lurus */
  for (var y = 0; y < h; y += dp) {
    var wob = snap(Math.sin(y / (h * 0.14)) * dp * 1.6);
    g.fillStyle(cStalk, 1);
    g.fillRect(cx + wob - sw / 2, baseY - h + y, sw, dp);
    /* garis pilin terang di sisi kiri batang */
    if ((y / dp) % 3 === 0) {
      g.fillStyle(cLeaf, 1);
      g.fillRect(cx + wob - sw / 2, baseY - h + y, dp, dp);
    }
  }
  /* Daun besar menjulur berselang-seling */
  for (var f = 0; f < 5; f++) {
    var fy = snap(baseY - h + dp * 4 + f * (h * 0.19));
    var s  = (f % 2 === 0) ? 1 : -1;
    var fl = snap(h * 0.16);
    g.fillStyle(cLeaf, 1);
    for (var t = 0; t < fl; t += dp) {
      var p = t / fl;
      var th = Math.max(dp, snap((1 - p) * dp * 3));
      g.fillRect(snap(cx + s * (sw / 2 + t)), fy - th / 2, dp, th);
    }
  }
}

/* --- MENARA ARLONG PARK — kanon: bangunan DELAPAN LANTAI di tepi laut
   dengan Jolly Roger di puncak. (Bukan berbentuk hiu — itu keliru populer.) --- */
function paintArlongPark(g, cx, baseY, h, cBody, cHi, cFlag, dp) {
  dp = GRID;   /* satu grid untuk semua latar */
  var w = Math.round(h * 0.46 / dp) * dp;
  g.fillStyle(cBody, 1);
  g.fillRect(cx - w / 2, baseY - h, w, h);
  /* garis 8 lantai + jendela menyala */
  for (var fl = 0; fl < 8; fl++) {
    var fy = baseY - h + dp * 2 + fl * ((h - dp * 4) / 8);
    g.fillStyle(cHi, 1);
    g.fillRect(cx - w / 2, Math.round(fy / dp) * dp, w, dp);
    g.fillStyle(cFlag, 0.55);
    for (var wx = 0; wx < 3; wx++) {
      g.fillRect(cx - w / 2 + dp * 2 + wx * (w / 3), Math.round(fy / dp) * dp + dp * 2, dp * 2, dp * 2);
    }
  }
  /* tiang + Jolly Roger di puncak */
  g.fillStyle(cHi, 1);
  g.fillRect(cx - dp / 2, baseY - h - dp * 5, dp, dp * 5);
  g.fillStyle(cFlag, 1);
  g.fillRect(cx, baseY - h - dp * 5, dp * 5, dp * 4);
}

/* ============================================================
   PARALLAX 6 LAPIS + atmospheric perspective.

   Urutan depth (jauh -> dekat):
     -100 langit (dither)      scroll 0
      -92 matahari/bintang     scroll 0.04
      -80 gunung jauh          scroll 0.12   <- paling pucat, hampir = langit
      -70 awan                 scroll 0.10
      -60 gunung tengah        scroll 0.22
      -50 hutan jauh           scroll 0.34
      -40 hutan dekat          scroll 0.50   <- paling gelap & kontras
      -30 kabut pita           scroll 0.50
       -8 prop foreground      scroll 1

   Aturan yang menghasilkan "cantik": SATURASI & KONTRAS naik searah kamera.
   Lapis jauh memakai warna yang cuma beda tipis dari langit. */
/* Buat satu lapis parallax sebagai tileSprite dari petak yang digambar sekali.
   Alasan memakai ini alih-alih Graphics panjang: biaya gambar jadi TETAP
   (satu petak) dan GPU yang mengulanginya, bukan CPU menggambar ribuan rect.
   Tekstur di-cache per stage sehingga masuk-keluar stage tidak menggambar ulang. */
GameScene.prototype.mkLayer = function (key, w, h, scroll, depth, drawFn) {
  if (!this.textures.exists(key)) {
    /* SUMBER LATAR — dua jalur, dengan urutan menang yang tegas:
         1. bg-sheet.png yang diunggah user (kalau kotak untuk kunci ini ada)
         2. art prosedural (bawaan; juga jadi cadangan bila unggahan gagal)
       Dengan begitu user tinggal mengganti isi kotak di bg-sheet lalu
       unggah ulang, tanpa menyentuh kode sama sekali. */
    if (!bgTextureFromSheet(this, key, w, h)) {
      var g = this.make.graphics({ x: 0, y: 0, add: false });
      /* Digambar lewat penjaga grid: apa pun yang dihitung fungsi lukis,
         hasil akhirnya selalu jatuh di grid GRID px. Inilah yang menjamin
         tidak ada "mixel" di seluruh latar. */
      drawFn(gridGuard(g));
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }
  /* Lebar tampil harus menutupi seluruh jangkauan lapis ini saat kamera berjalan
     dari 0 sampai ujung level: kamera bergerak (L.len - BW), lapis ikut bergerak
     sebanyak itu x scroll, jadi butuh selebar itu + satu layar. tileSprite yang
     mengulang teksturnya, jadi lebar besar TIDAK menambah biaya gambar. */
  var span = Math.ceil((this.L.len - BW) * scroll) + BW + w;
  var ts = this.add.tileSprite(0, 0, span, h, key).setOrigin(0, 0);
  ts.setScrollFactor(scroll).setDepth(depth);
  return ts;
};

GameScene.prototype.buildParallax = function (S, GY) {
  var L = this.L;
  var P = SKIES[S.id] || SKIES[0];
  /* Hanya Arlong Park yang malam. Alabasta = tengah hari terik (matahari
     tinggi & besar), Skypiea = terang merata di atas awan. */
  var isNight = (S.biome === 'lair');
  var isDusk  = (S.biome === 'desert');

  /* ---- MATAHARI / BULAN: cakram piksel (kotak ber-step, bukan fillCircle) ----
     Bisa diganti dari bg-sheet.png lewat kunci '_sun_<id>'. */
  var sunKey = '_sun_' + S.id;
  if (bgTextureFromSheet(this, sunKey, BW, BH)) {
    this.add.image(0, 0, sunKey).setOrigin(0, 0)
      .setScrollFactor(0.04).setDepth(-92).setDisplaySize(BW, BH);
  } else {
  var gSun = this.add.graphics().setScrollFactor(0.04).setDepth(-92);
  var sunX = Math.round(BW * (isDusk ? 0.68 : 0.24));
  var sunY = Math.round(BH * (isDusk ? 0.26 : 0.14));
  var sunR = isDusk ? 34 : 22;
  gSun.fillStyle(P.sun, isNight ? 0.85 : 0.55);
  for (var sy = -sunR; sy < sunR; sy += DP) {
    var halfW = Math.round(Math.sqrt(Math.max(0, sunR * sunR - sy * sy)) / DP) * DP;
    if (halfW > 0) gSun.fillRect(sunX - halfW, sunY + sy, halfW * 2, DP);
  }
  /* Bintang khusus malam — dither jarang, ukuran 1 DP */
  if (isNight) {
    gSun.fillStyle(0xffffff, 0.9);
    for (var st = 0; st < 90; st++) {
      var stx = ((st * 137) % Math.round(BW / DP)) * DP;
      var sty = ((st * 71) % Math.round(BH * 0.42 / DP)) * DP;
      gSun.fillRect(stx, sty, DP, DP);
    }
  }
  }   /* akhir cadangan prosedural matahari/bintang */

  /* ---- LAPIS 1-4 sebagai PETAK BERULANG ----------------------------------
     PENTING (bug yang sudah dibayar): jangan pernah menggambar lapis parallax
     sepanjang L.len. Level sepanjang 6400px dengan dither 4px berarti ribuan
     kolom x belasan baris = ratusan ribu fillRect PER STAGE — tab membeku dan
     seluruh UI (termasuk tombol MULAI) berhenti merespons.

     Pola benar: gambar SATU petak selebar layar ke tekstur, lalu ulangi dengan
     tileSprite. Biaya jadi tetap, tidak peduli panjang level. Lebar petak
     dibuat kelipatan 4 (grid DP) supaya sambungannya tak terlihat. */
  var TILEW = BW * 2;   /* 1080px — cukup lebar agar pengulangan tak kentara */

  /* BIOME menentukan isi lapis jauh & dekat. Tanpa ini semua pulau memakai
     gunung+pinus yang sama, dan itulah kenapa stage terasa berulang. */
  var biome = S.biome || 'village';

  /* Kerapatan latar ikut mengatur JARAK antar elemen parallax, bukan cuma
     prop foreground. Dipakai sebagai pembagi jarak: 190% -> jarak x0.53.
     Dibatasi bawah lewat Math.max() di tiap pemakaian supaya elemen besar
     (kincir, palem, Baratie) tidak saling menimpa saat slider dimaksimalkan. */
  var dens = Math.max(0.4, Math.min(2.0, ((TUNE && TUNE.bgDetail) || 100) / 100));
  var gap = function (base, floor) {
    return Math.max(floor || 1, Math.round(base / dens));
  };

  /* ---- AWAN: DUA LAPIS, mengikuti tangga perspektif atmosfer ----------
     Langit di versi sebelumnya kosong melompong di bagian atas layar —
     terlihat jelas pada tangkapan layar mobile. Yang mengisinya bukan
     "lebih banyak benda", melainkan tangga kedalaman yang sama seperti
     daratan: awan terjauh sudah dipanggang ke dalam langit (kontras
     nyaris nol, lihat paintSkyDithered), lalu dua lapis di sini makin
     dekat, makin kontras, makin bergerak.

     Kecepatannya sangat lambat (0.05 & 0.10) supaya langit terasa jauh;
     kalau awan bergerak secepat gunung, kedalamannya rusak. */
  var cloudFar = blend(P.farHi, P.sky1, 0.34);
  this.mkLayer('pwr_cl1_' + S.id, TILEW, BH, 0.05, -90, function (gg) {
    for (var i = 0, x = 20; x < TILEW + 160; x += gap(300, 210), i++) {
      paintCloud(gg, x, Math.round(BH * 0.10) + (i * 53) % Math.round(BH * 0.16),
                 96 + (i * 41) % 80, cloudFar, cloudFar, true);
    }
  });
  var cloudNear = isNight ? blend(P.farHi, P.sky1, 0.55) : P.farHi;
  this.mkLayer('pwr_cl2_' + S.id, TILEW, BH, 0.10, -88, function (gg) {
    for (var i = 0, x = 120; x < TILEW + 200; x += gap(420, 300), i++) {
      paintCloud(gg, x, Math.round(BH * 0.13) + (i * 71) % Math.round(BH * 0.14),
                 130 + (i * 47) % 90, cloudNear, cloudNear, false);
    }
  });

  /* ---- LAUT DI CAKRAWALA (0.08) — dunia One Piece adalah dunia bajak
     laut; hampir semua pulau dikelilingi laut. Tanpa pita laut ini,
     pemandangan bisa jadi pulau generik mana pun. Skypiea (di atas awan)
     dan Little Garden (pedalaman) sengaja dikecualikan. ---- */
  /* CATATAN: Alabasta SENGAJA tidak diberi laut. Kanon-nya kerajaan gurun
     yang luas; menaruh pita ombak di garis cakrawala membuat pasirnya
     terlihat seperti berair (terverifikasi lewat render pratinjau). */
  if (biome === 'village' || biome === 'sea' || biome === 'lair') {
    var seaTop = GY - 150, seaH = 120;
    this.mkLayer('pwr_sea_' + S.id, TILEW, BH, 0.08, -84, function (gg) {
      paintSea(gg, seaTop, TILEW, seaH, P.far, P.mid, P.farHi, 4);
      /* Kapal bajak laut berbendera tengkorak di garis laut */
      for (var si = 0, sx = 90; sx < TILEW + 200; sx += gap(330,200), si++) {
        paintJollyShip(gg, sx, seaTop + 40 + (si * 17) % 30,
                       58 + (si * 23) % 26, P.near, P.farHi, P.farHi, 4);
      }
    });
  }

  /* ---- LAPIS JAUH (0.12): siluet besar khas pulau ----
     JARAK DINYATAKAN LEWAT WARNA, bukan lewat blok yang lebih besar.
     Dulu lapis ini digambar pada grid 8px sementara lapis depan 4px —
     itu melanggar aturan satu-grid dan membuat seluruh gambar terlihat
     seperti dua karya berbeda ditempel. Sekarang grid-nya sama, dan
     yang membedakan jauh/dekat adalah kabut: siluet lapis jauh ditarik
     ~30% ke arah warna cakrawala sehingga nilainya rapat ke langit,
     persis seperti gunung sungguhan di kejauhan. */
  var hzFar = function (c) { return hazeTo(c, P.farHi, 0.30); };
  /* Salinan palet yang SUDAH berkabut, dipakai khusus lapis jauh.
     Sengaja diberi nama sendiri (bukan menimpa P) supaya jelas terbaca
     lapis mana memakai warna yang mana. */
  var PF = {
    far:  hzFar(P.far),  farHi: hzFar(P.farHi),
    mid:  hzFar(P.mid),  midHi: hzFar(P.midHi),
    sun:  P.sun
  };
  this.mkLayer('pwr_far_' + S.id, TILEW, BH, 0.12, -80, function (gg) {
    var i, x;
    if (biome === 'desert') {
      /* ALABASTA — piramida (Rain Dinners) + kubah istana Alubarna */
      for (i = 0, x = -60; x < TILEW + 200; x += gap(340,240), i++) {
        if (i % 2 === 0) paintPyramid(gg, x + 170, GY - 120, 200 + (i * 37) % 70, PF.far, PF.farHi, 8);
        else             paintDome(gg, x + 170, GY - 120, 190 + (i * 53) % 60, PF.far, PF.farHi, 8);
      }
    } else if (biome === 'sky') {
      /* SKYPIEA — gumpalan awan raksasa sebagai "gunung" */
      for (i = 0, x = -80; x < TILEW + 200; x += gap(220,170), i++) {
        paintMountain(gg, x + 110, GY - 90, 150 + (i * 47) % 80,
                      170 + (i * 31) % 60, PF.far, PF.farHi, 0.0, 8);
      }
    } else if (biome === 'sea') {
      /* BARATIE — laut lepas: kapal di cakrawala. Lambung memakai PF.mid
         (bukan PF.far) supaya siluetnya TERBACA; PF.far hampir sewarna langit
         dan membuat kapal lenyap — layar putih pucat memberi kontras. */
      for (i = 0, x = 40; x < TILEW + 200; x += gap(380,260), i++) {
        paintShip(gg, x, GY - 150, 110 + (i * 29) % 40, PF.mid, PF.farHi, 8);
      }
    } else if (biome === 'jungle') {
      /* LITTLE GARDEN — gunung purba berkabut.
         CATATAN: sempat dicoba menaruh "gunung tengkorak Sea King" (kanon)
         di lapis ini, tapi lapis jauh memang di-haze mendekati warna langit
         (atmospheric perspective), jadi rongga mata & rahangnya SELALU luruh
         jadi kotak gelap tak terbaca — sudah diverifikasi lewat render pada
         2 ukuran & 2 ketinggian. Identitas pulau ini akhirnya dibawa oleh
         PAKIS RAKSASA di lapis depan, yang kontrasnya cukup. */
      for (i = 0, x = -140; x < TILEW + 200; x += gap(300,210), i++) {
        paintMountain(gg, x + 150, GY - 150, 190 + ((i * 53) % 90),
                      200 + ((i * 37) % 70), PF.far, PF.farHi, 0.0, 8);
      }
    } else {
      for (i = 0, x = -140; x < TILEW + 200; x += gap(300,210), i++) {
        paintMountain(gg, x + 150, GY - 150, 190 + ((i * 53) % 90),
                      200 + ((i * 37) % 70), PF.far, PF.farHi, 0.52, 8);
      }
    }
  });

  /* ---- LAPIS TENGAH (0.22) ---- */
  this.mkLayer('pwr_midm_' + S.id, TILEW, BH, 0.22, -60, function (gg) {
    var i, x, cMid = blend(P.far, P.mid, 0.5);
    if (biome === 'village') {
      /* FOOSHA — deret kincir angin (nama desa = Desa Kincir Angin) */
      for (i = 0, x = 40; x < TILEW + 200; x += gap(260,190), i++) {
        paintWindmill(gg, x, GY - 92, 130 + (i * 41) % 50, cMid, P.farHi, P.farHi, 6);
      }
    } else if (biome === 'lair') {
      /* ARLONG PARK — menara 8 lantai berbendera Jolly Roger */
      for (i = 0, x = 120; x < TILEW + 200; x += gap(420,300), i++) {
        paintArlongPark(gg, x, GY - 80, 220 + (i * 37) % 60, cMid, P.midHi, P.farHi, 6);
      }
    } else if (biome === 'sky') {
      /* SKYPIEA — Giant Jack menembus awan (kanon Upper Yard) */
      for (i = 0, x = 60; x < TILEW + 200; x += 340, i++) {
        paintBeanstalk(gg, x, GY - 30, 300 + (i * 41) % 80, cMid, P.midHi, 6);
      }
    } else if (biome === 'desert') {
      for (i = 0, x = -60; x < TILEW + 200; x += gap(300,210), i++) {
        paintDome(gg, x + 140, GY - 90, 120 + (i * 43) % 50, cMid, P.farHi, 6);
      }
    } else if (biome === 'sea') {
      /* Selang-seling: restoran-ikan Baratie (landmark) & kapal biasa. */
      for (i = 0, x = -40; x < TILEW + 200; x += gap(300,210), i++) {
        if (i % 2 === 0) paintBaratie(gg, x + 150, GY - 92, 150 + (i * 23) % 40, cMid, P.near, P.sun, 6);
        else             paintShip(gg, x + 150, GY - 96, 150 + (i * 37) % 50, cMid, P.farHi, 6);
      }
    } else {
      for (i = 0, x = -100; x < TILEW + 200; x += 250, i++) {
        paintMountain(gg, x + 120, GY - 100, 130 + ((i * 41) % 60),
                      160 + ((i * 29) % 50), cMid, P.farHi,
                      biome === 'jungle' ? 0.0 : 0.62, 8);
      }
    }
  });

  /* ---- LAPIS VEGETASI JAUH (0.34) ---- */
  this.mkLayer('pwr_tf_' + S.id, TILEW, BH, 0.34, -50, function (gg) {
    var i, x;
    if (biome === 'jungle') {
      /* LITTLE GARDEN — pakis raksasa, bukan pinus */
      for (i = 0, x = -40; x < TILEW + 80; x += gap(78,62), i++) {
        paintGiantFern(gg, x, GY - 66, 120 + (i * 53) % 60, P.mid, P.midHi, 4);
      }
    } else if (biome === 'desert' || biome === 'sea' || biome === 'sky') {
      /* gurun/laut/langit tidak berhutan — pita rendah saja, biar lapang */
      gg.fillStyle(P.mid, 1);
      gg.fillRect(0, GY - 40, TILEW, 46);
    } else if (biome === 'village') {
      /* FOOSHA — pohon RENGGANG & rendah: ini desa berbukit, bukan rimba.
         Rapat seperti hutan akan menelan siluet kincir di lapis belakang. */
      for (i = 0, x = -50; x < TILEW + 60; x += gap(96,72), i++) {
        paintPine(gg, x, GY - 62, 54 + ((i * 37) % 26), P.mid, 4);
      }
      gg.fillStyle(P.mid, 1);
      gg.fillRect(0, GY - 46, TILEW, 52);
    } else {
      for (i = 0, x = -60; x < TILEW + 60; x += gap(34,26), i++) {
        paintPine(gg, x, GY - 70, 90 + ((i * 47) % 60), P.mid, 4);
      }
      gg.fillStyle(P.mid, 1);
      gg.fillRect(0, GY - 74, TILEW, 80);
    }
  });

  /* ---- LAPIS VEGETASI DEKAT (0.50) — paling gelap & kontras ---- */
  this.mkLayer('pwr_tn_' + S.id, TILEW, BH, 0.50, -40, function (gg) {
    var i, x;
    if (biome === 'jungle') {
      for (i = 0, x = -30; x < TILEW + 80; x += gap(96,80), i++) {
        paintGiantFern(gg, x, GY - 22, 170 + (i * 61) % 70, P.near, P.nearHi, 4);
      }
      gg.fillStyle(P.near, 1);
      gg.fillRect(0, GY - 26, TILEW, 34);
    } else if (biome === 'desert') {
      /* bukit pasir bergelombang, bukan pohon */
      for (i = 0, x = -80; x < TILEW + 120; x += gap(190,150), i++) {
        paintMountain(gg, x + 95, GY - 20, 54 + (i * 29) % 26, 120, P.near, P.nearHi, 0.0, 8);
      }
      gg.fillStyle(P.near, 1);
      gg.fillRect(0, GY - 24, TILEW, 32);
    } else if (biome === 'sea' || biome === 'sky') {
      gg.fillStyle(P.near, 1);
      gg.fillRect(0, GY - 24, TILEW, 32);
    } else if (biome === 'village') {
      /* FOOSHA/Cocoyasi = pulau TROPIS East Blue (kanon: pohon palem &
         kebun jeruk), jadi palem — bukan pinus — yang benar di sini. */
      for (i = 0, x = -40; x < TILEW + 60; x += gap(118,96), i++) {
        paintPalm(gg, x, GY - 22, 96 + ((i * 43) % 40), P.near, P.near, P.nearHi, 4);
      }
      gg.fillStyle(P.near, 1);
      gg.fillRect(0, GY - 26, TILEW, 34);
    } else {
      for (i = 0, x = -40; x < TILEW + 60; x += gap(46,36), i++) {
        paintPine(gg, x, GY - 26, 130 + ((i * 61) % 80), P.near, 4);
      }
      gg.fillStyle(P.near, 1);
      gg.fillRect(0, GY - 30, TILEW, 40);
    }
  });

  /* ---- LAPIS 5: POHON BERDAUN besar di tepi (scroll 0.72) ----
     Referensi selalu punya pohon BESAR di sisi kiri/kanan yang membingkai
     pemandangan — itu yang memberi kesan "berada di dalam" lanskap, bukan
     menatapnya dari jauh. Hanya untuk pulau BERPOHON — gurun, laut lepas,
     pulau langit, dan sarang bos tidak punya pohon besar. */
  if (biome === 'village' || biome === 'jungle') {
    var ltK  = scene_texKey(this, 't_ltree_s',  S.id, null);
    var ltK2 = scene_texKey(this, 't_ltree2_s', S.id, null);
    if (ltK) {
      for (var lt = 0, li = 0; lt < L.len; lt += 620, li++) {
        var key = (li % 2 === 0) ? ltK : (ltK2 || ltK);
        var im2 = this.add.image(lt + (li % 3) * 90, GY + 6, key)
          .setOrigin(0.5, 1).setDepth(-20).setScrollFactor(0.72);
        im2.setScale(li % 3 === 0 ? 1.25 : 1);
        if (li % 2 === 1) im2.setFlipX(true);
      }
    }
  }

  /* ---- LANDMARK dekat: reruntuhan Shandora (Skypiea) / bangunan sarang ----
     Skypiea kanon punya reruntuhan kota emas di Upper Yard; sarang bos punya
     deretan bangunan dermaga. Keduanya butuh massa gelap dekat kamera. */
  if (biome === 'sky' || biome === 'lair') {
    var isSky = (biome === 'sky');
    this.mkLayer('pwr_lm_' + S.id, TILEW, BH, 0.45, -45, function (gg) {
      for (var lx = 0; lx < TILEW; lx += 320) {
        var bw = 96, bh = isSky ? 150 : 180;
        gg.fillStyle(P.near, 1);
        gg.fillRect(lx + 40, GY - bh, bw, bh);
        gg.fillStyle(P.nearHi, 1);
        gg.fillRect(lx + 40, GY - bh, bw, DP * 2);
        if (isSky) {
          /* pilar batu bergerigi — reruntuhan, bukan jendela menyala */
          gg.fillStyle(P.nearHi, 1);
          for (var px = 0; px < 3; px++) {
            gg.fillRect(lx + 48 + px * 30, GY - bh - DP * 3, DP * 3, DP * 3);
          }
        } else {
          gg.fillStyle(P.sun, 0.75);
          for (var wy = 0; wy < 4; wy++) {
            for (var wx = 0; wx < 3; wx++) {
              gg.fillRect(lx + 56 + wx * 26, GY - bh + 28 + wy * 34, 12, 16);
            }
          }
        }
      }
    });
  }

  /* ---- KABUT: pita dither antara hutan jauh & hutan dekat.
     Ini yang menjual kedalaman — tanpa ini lapisan terlihat seperti stiker
     bertumpuk, bukan jarak. ---- */
  var hazeH = 56;
  var hazeY = GY - 96;
  this.mkLayer('pwr_haze_' + S.id, TILEW, BH, 0.42, -46, function (gg) {
    var hRows = Math.ceil(hazeH / DP);
    var hCols = Math.ceil(TILEW / DP);
    gg.fillStyle(P.farHi, isNight ? 0.22 : 0.40);
    for (var hr = 0; hr < hRows; hr++) {
      /* makin ke bawah makin jarang -> kabut menipis ke tanah */
      var ht = 16 - (hr / (hRows - 1)) * 16;
      for (var hc = 0; hc < hCols; hc++) {
        if (BAYER4[hr & 3][hc & 3] < ht) gg.fillRect(hc * DP, hazeY + hr * DP, DP, DP);
      }
    }
  });

  /* ---- AWAN ---- */
  var cloudAlpha = isNight ? 0.22 : isDusk ? 0.70 : 1;
  var spanCloud = Math.ceil(L.len * 0.1) + BW * 2;
  var ci = 0;
  for (var cx2 = 20; cx2 < spanCloud; cx2 += 190) {
    var cy = 40 + (ci % 4) * 54;
    /* Ganti-ganti 3 varian: awan yang bentuknya sama persis berulang terbaca
       sebagai pola wallpaper, bukan langit. */
    var cKeys = [
      scene_texKey(this, 't_cloud_s',  S.id, 't_cloud'),
      scene_texKey(this, 't_cloud2_s', S.id, 't_cloud'),
      scene_texKey(this, 't_cloud3_s', S.id, 't_cloud')
    ];
    var cloudKey = cKeys[ci % 3];
    if (this.textures.exists(cloudKey)) {
      var im = this.add.image(cx2, cy, cloudKey)
        .setScrollFactor(0.1).setDepth(-70).setAlpha(cloudAlpha);
      im.setScale(ci % 3 === 0 ? 1.5 : ci % 3 === 1 ? 1.1 : 0.8);
    }
    ci++;
  }

  /* ---- PROP FOREGROUND (tetap, tapi dijarangkan sedikit supaya tanah
     tidak ramai bersaing dengan latar yang sekarang jauh lebih kaya) ---- */
  var bushK = scene_texKey(this, 't_bush_s', S.id, 't_bush');
  var tuftK = scene_texKey(this, 't_tuft_s', S.id, 't_tuft');
  var fp1 = scene_texKey(this, 't_fpatch_s',  S.id, 't_flower');
  var fp2 = scene_texKey(this, 't_fpatch2_s', S.id, 't_flower');
  var fp3 = scene_texKey(this, 't_fpatch3_s', S.id, 't_flower');
  var fenceK = scene_texKey(this, 't_fence_s', S.id, null);
  /* Padang rumput di referensi penuh rumpun bunga kecil — itu yang membedakan
     "rumput hidup" dari bidang hijau polos. */
  /* Gurun/langit/sarang tidak berbunga: hanya batu & rumpun jarang. */
  var propKeys = (biome === 'desert' || biome === 'sky' || biome === 'lair')
    ? ['t_rock', tuftK]
    : [bushK, fp1, tuftK, fp2, 't_rock', tuftK, fp3, bushK];
  var pi = 0;
  /* ---- PENEMPATAN PROP ----
     Dua hal yang diperbaiki setelah terlihat di layar pada kerapatan tinggi:

     1. TUMPANG TINDIH. Dulu jarak = 78/kerapatan, jadi pada 190% jaraknya
        41px sementara lebar propnya sendiri ~40-60px -> pohon berdempetan
        dan saling menimpa. Sekarang jarak minimum DITURUNKAN DARI LEBAR
        prop terlebar (bukan angka mati), sehingga serapat apa pun slider
        digeser, prop tidak pernah bertindihan.

     2. TERLALU RAPI. Jarak yang seragam terbaca sebagai pola buatan, bukan
        pemandangan. Ditambah jitter deterministik (dari PRNG ber-seed
        supaya level tetap sama tiap kali dimuat) dan variasi skala. */
  var dens = Math.max(0.4, Math.min(2.0, ((TUNE && TUNE.bgDetail) || 100) / 100));
  /* Lebar prop terbesar yang benar-benar dipakai stage ini. */
  var maxPropW = 0;
  for (var mk = 0; mk < propKeys.length; mk++) {
    var kk = propKeys[mk];
    if (!kk || !this.textures.exists(kk)) continue;
    var src = this.textures.get(kk).getSourceImage();
    if (src && src.width > maxPropW) maxPropW = src.width;
  }
  if (!maxPropW) maxPropW = 48;
  /* Jarak ideal mengecil saat kerapatan naik, TAPI tidak boleh lebih rapat
     dari lebar prop + sedikit sela (86% lebar -> masih ada rongga). */
  var minGap  = Math.ceil(maxPropW * 0.86);
  var propGap = Math.max(minGap, Math.round(96 / dens));
  var jr = mulberry32(((STORE && STORE.seed) || 1) ^ 0x9e37);
  for (var px2 = 120; px2 < L.len; px2 += propGap) {
    var k = propKeys[pi % propKeys.length];
    pi++;
    if (!k || !this.textures.exists(k)) continue;
    /* Jitter <= 30% jarak: memecah keteraturan tanpa membuat prop bertumpuk. */
    var jx = Math.round((jr() - 0.5) * propGap * 0.6);
    var wx = px2 + jx;
    if (wx < 60 || wx > L.len - 60) continue;
    if (!isGroundAt(L, wx)) continue;
    var pr = this.add.image(wx, GY + 3, k).setOrigin(0.5, 1).setDepth(-8);
    if (k === tuftK) pr.setDepth(-6);
    /* Skala bervariasi -> kedalaman; yang lebih kecil didorong ke belakang. */
    var sc2 = 0.78 + jr() * 0.42;
    pr.setScale(sc2);
    if (sc2 < 0.95) pr.setDepth(-9);
    if (jr() < 0.35) pr.setFlipX(true);
  }

  /* ---- PAGAR KAYU membentang di tepi jalan (khas referensi #1) ----
     Elemen buatan manusia memberi SKALA pada lanskap: mata jadi tahu seberapa
     besar bukit itu. Tanpa itu, pemandangan terasa mengambang. */
  if (fenceK && (biome === 'village' || biome === 'jungle')) {
    for (var fx2 = 200; fx2 < L.len; fx2 += 32) {
      if (!isGroundAt(L, fx2)) continue;
      /* pagar hanya di ruas tertentu, bukan sepanjang level */
      if (Math.floor(fx2 / 640) % 2 === 1) continue;
      this.add.image(fx2, GY - 2, fenceK)
        .setOrigin(0.5, 1).setDepth(-9).setScrollFactor(0.9).setAlpha(0.95);
    }
  }
};

GameScene.prototype.setupInput = function () {
  var self = this;
  this.input.keyboard.removeAllKeys(true);
  this.keys = this.input.keyboard.addKeys({
    left: Phaser.Input.Keyboard.KeyCodes.LEFT,
    right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    a: Phaser.Input.Keyboard.KeyCodes.A,
    d: Phaser.Input.Keyboard.KeyCodes.D,
    up: Phaser.Input.Keyboard.KeyCodes.UP,
    w: Phaser.Input.Keyboard.KeyCodes.W,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    /* Dua tombol untuk menembak: X (dekat tombol arah) dan E (pola yang
       sama dengan retromario). */
    x: Phaser.Input.Keyboard.KeyCodes.X,
    e: Phaser.Input.Keyboard.KeyCodes.E
  });
  this.touch = { left: false, right: false, jump: false, shoot: false };

  /* Joystick floating + tombol JMP (DOM, bukan Phaser input) */
  var joyBase = document.getElementById('pwr-joy-base');
  var joyKnob = document.getElementById('pwr-joy-knob');
  var jumpBtn = document.getElementById('pwr-btn-jump');
  var joyId = null, joyOx = 0;

  function joyStart(e) {
    var t = e.changedTouches ? e.changedTouches[0] : e;
    joyId = e.changedTouches ? t.identifier : 'mouse';
    var r = joyBase.getBoundingClientRect();
    joyOx = r.left + r.width / 2;
    e.preventDefault();
  }
  function joyMove(e) {
    if (joyId === null) return;
    var t = e.changedTouches ? findTouch(e.changedTouches, joyId) : e;
    if (!t) return;
    var dx = Math.max(-40, Math.min(40, t.clientX - joyOx));
    if (joyKnob) joyKnob.style.transform = 'translateX(' + dx + 'px)';
    self.touch.left = dx < -10;
    self.touch.right = dx > 10;
    e.preventDefault();
  }
  function joyEnd(e) {
    joyId = null;
    if (joyKnob) joyKnob.style.transform = '';
    self.touch.left = self.touch.right = false;
  }
  function findTouch(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
    return null;
  }
  function jumpDown(e) { self.touch.jump = true; self.player.jumpBufferAt = self.time.now; e.preventDefault(); }
  function jumpUp(e)   { self.touch.jump = false; }
  /* Tembak = satu ketuk satu peluru. Flag-nya dibersihkan oleh
     updateInner setelah dibaca, jadi tidak perlu penangan "lepas". */
  function shootDown(e) { self.touch.shoot = true; e.preventDefault(); }

  if (joyBase) {
    joyBase.addEventListener('touchstart', joyStart, { passive: false });
    joyBase.addEventListener('mousedown', joyStart);
    window.addEventListener('touchmove', joyMove, { passive: false });
    window.addEventListener('mousemove', joyMove);
    window.addEventListener('touchend', joyEnd);
    window.addEventListener('mouseup', joyEnd);
  }
  if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', jumpDown, { passive: false });
    jumpBtn.addEventListener('mousedown', jumpDown);
    jumpBtn.addEventListener('touchend', jumpUp);
    jumpBtn.addEventListener('mouseup', jumpUp);
  }
  var shootBtn = document.getElementById('pwr-btn-shoot');
  if (shootBtn) {
    shootBtn.addEventListener('touchstart', shootDown, { passive: false });
    shootBtn.addEventListener('mousedown', shootDown);
  }
  var offInput = function () {
    if (shootBtn) {
      shootBtn.removeEventListener('touchstart', shootDown);
      shootBtn.removeEventListener('mousedown', shootDown);
    }
    if (joyBase) {
      joyBase.removeEventListener('touchstart', joyStart);
      joyBase.removeEventListener('mousedown', joyStart);
    }
    window.removeEventListener('touchmove', joyMove);
    window.removeEventListener('mousemove', joyMove);
    window.removeEventListener('touchend', joyEnd);
    window.removeEventListener('mouseup', joyEnd);
    if (jumpBtn) {
      jumpBtn.removeEventListener('touchstart', jumpDown);
      jumpBtn.removeEventListener('mousedown', jumpDown);
      jumpBtn.removeEventListener('touchend', jumpUp);
      jumpBtn.removeEventListener('mouseup', jumpUp);
    }
  };
  onCleanup(offInput);
  this.events.once('shutdown', offInput);
};

/* ---------------------------------------------------------------
   UPDATE LOOP
   --------------------------------------------------------------- */
/* PENJAGA LOOP — jangan dihapus.

   Di Phaser, SATU exception yang lolos dari update() mematikan step
   selamanya. Akibatnya persis seperti yang dilaporkan:
     - layar membeku, TAPI tombol DOM masih bisa diklik
       (thread JS hidup, cuma loop game-nya berhenti);
     - "atur ulang" / pindah stage tidak menolong, karena
       scene.restart() itu TERTUNDA dan yang menjalankannya adalah step
       yang sudah mati — create() tidak pernah dipanggil.

   Karena itu isi update() dipindah ke updateInner() dan dibungkus di
   sini. Error tetap DICATAT (bukan ditelan diam-diam), dibatasi supaya
   tidak membanjiri konsol, dan sesudah beberapa kali berturut-turut
   game dipulihkan paksa daripada dibiarkan berjalan rusak. */
var _loopErrCount = 0;      /* total error yang tertangkap di update() */
var _loopErrRun = 0;        /* berapa frame BERTURUT-TURUT yang error   */
var _loopErrLast = '';

GameScene.prototype.update = function (time, delta) {
  try {
    this.updateInner(time, delta);
    _loopErrRun = 0;                    /* frame sehat -> hitungan reset */
  } catch (e) {
    _loopErrCount++;
    _loopErrRun++;
    var msg = (e && e.message) ? e.message : String(e);
    /* Hanya laporkan pesan BARU: error yang sama tiap frame akan
       membanjiri konsol dan menutupi penyebab aslinya. */
    if (msg !== _loopErrLast) {
      _loopErrLast = msg;
      try {
        console.error('[pwr] update() error #' + _loopErrCount + ': ' + msg,
                      e && e.stack ? e.stack : '');
      } catch (e2) {}
    }
    /* Beberapa frame rusak beruntun = keadaan tidak bisa dipulihkan
       sendiri (mis. tekstur/animasi hilang). Bangun ulang stage sekali,
       bukan dibiarkan membeku tanpa penjelasan. */
    if (_loopErrRun === 30) {
      try {
        toast('Game dipulihkan otomatis.', 'warn', 2200);
        _tuneTexDirty = true;
        this.scene.restart({ stage: runState ? runState.stage : 0 });
      } catch (e3) {}
    }
  }
};

GameScene.prototype.updateInner = function (time, delta) {
  /* Freeze saat dialog terbuka — kebocoran universal 5 tema sebelumnya */
  if (anyOverlayOpen()) return;

  var p = this.player;
  if (!p || !p.body) return;

  /* Outro stage clear (sinematik, scene TIDAK di-pause) */
  if (this.clearSeq) { this.updateClearSeq(time, delta); return; }

  /* Spawn relatif-kamera: musuh off-screen = DATA, bukan entity */
  this.pumpSpawns();

  /* Musuh update + culling */
  this.updateEnemies(time);

  if (p.dying) return;

  /* --- Input --- */
  var left  = this.keys.left.isDown || this.keys.a.isDown || this.touch.left;
  var right = this.keys.right.isDown || this.keys.d.isDown || this.touch.right;
  var jumpDown = this.keys.up.isDown || this.keys.w.isDown || this.keys.space.isDown || this.touch.jump;

  /* TEMBAK — tombol layar atau tombol X/E. Ditangani SEBELUM autoFly
     supaya jeda tembak tetap berjalan konsisten. Ditembakkan sekali per
     tekan (bukan otomatis saat ditahan): menahan tombol lalu memuntahkan
     peluru terus-menerus membuat bos terlalu mudah. */
  var shootDown = (this.keys.x && this.keys.x.isDown) ||
                  (this.keys.e && this.keys.e.isDown) || this.touch.shoot;
  if (shootDown && !p.wasShootDown) this.fireShot(time);
  p.wasShootDown = shootDown;
  this.touch.shoot = false;          /* sentuhan = satu tembakan per ketuk */

  if (p.autoFly) { p.body.velocity.x = PHYS.RUN_SPEED * 1.4; playSlot(p, 'player_run'); return; }

  var onGround = p.body.blocked.down || p.body.touching.down;
  if (onGround) p.lastGroundTime = time;
  if (jumpDown && !p.wasJumpDown) p.jumpBufferAt = time;
  p.wasJumpDown = jumpDown;

  /* Gerak horizontal (dari repo: velocity langsung, bukan akselerasi) */
  if (left)       { p.direction = -1; p.body.velocity.x = -PHYS.RUN_SPEED; p.setFlipX(true); }
  else if (right) { p.direction = 1;  p.body.velocity.x =  PHYS.RUN_SPEED; p.setFlipX(false); }
  else            { p.body.velocity.x = 0; }

  /* Lompat: coyote + buffer. Repo: HANYA saat blocked.down (tanpa ini = infinite jump) */
  var canCoyote = (time - p.lastGroundTime) <= this.D.coyote;
  var buffered = (time - p.jumpBufferAt) <= PHYS.JUMP_BUFFER_MS;
  if (buffered && (onGround || canCoyote)) {
    p.body.velocity.y = -PHYS.JUMP_VELOCITY;
    p.jumpBufferAt = -9999;
    p.lastGroundTime = -9999;
    p.setScale(0.9, 1.1);
    sfx('jump');
  }

  /* Animasi per-state */
  if (!onGround) {
    p.setTexture(p.body.velocity.y < 0 ? 't_groom_jump' : 't_groom_fall');
    p.anims.stop();
  } else {
    if (p.scaleY !== 1) this.tweens.add({ targets: p, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.out' });
    if (left || right) playSlot(p, 'player_run');
    else playSlot(p, 'player_idle');
  }

  /* i-frame blink */
  if (p.invuln > 0) {
    p.invuln -= delta;
    p.setAlpha(Math.floor(time / 60) % 2 ? 0.35 : 1);
    if (p.invuln <= 0) p.setAlpha(1);
  }

  /* Power-up kedaluwarsa */
  /* Buket tidak pernah masuk ke sini: powerupUntil = Infinity, dan
     `time > Infinity` selalu false. Ia berakhir lewat create() saat stage
     berganti, bukan lewat jam. */
  if (runState.powerup && time > runState.powerupUntil) {
    runState.powerup = null;
    p.invincible = cheat.on;
    this.physics.world.gravity.y = PHYS.GRAVITY_Y;
    refreshPlayerSkin(p);            /* wujud kembali sesuai state */
    updateHud();
    syncShootBtn();
  }

  /* Peluru: umur & keluar layar */
  this.updateShots(time);
  /* Tombol tembak hanya muncul saat memang bisa menembak. Diperiksa tiap
     frame karena power-up bisa habis kapan saja. */
  syncShootBtn();

  /* Jatuh ke jurang -> respawn AMAN (bukan mati, bukan balik ke awal) */
  if (p.y > BH + 120) this.fallOut();

  /* Boss */
  if (this.boss) {
    if (!this.bossActive && p.x >= this.arenaX) this.activateBoss();
    if (this.bossActive) this.updateBoss(time, delta);   /* kontak diurus di dalam updateBoss */
  }
};

/* Spawn relatif-kamera (aturan hard-won §23) */
GameScene.prototype.pumpSpawns = function () {
  var cam = this.cameras.main;
  var edge = cam.scrollX + BW;
  while (this._next < this.spawnList.length && edge >= this.spawnList[this._next].x) {
    var r = this.spawnList[this._next++];
    this.spawnEnemy(r.type, Math.max(r.x, edge - 20), r.y);
  }
  /* Despawn saat ter-scroll keluar kiri (anti-leak) */
  var kids = this.enemies.getChildren();
  for (var i = 0; i < kids.length; i++) {
    var e = kids[i];
    if (e.active && e.body && e.body.right < cam.scrollX - 120) e.disableBody(true, true);
  }
};

/* Ukuran hitbox per tipe. WAJIB di-set ulang tiap spawn: musuh didaur ulang dari
   pool, jadi E5 (32x48) yang mati lalu dipakai ulang sebagai E1 (28x24) akan
   MEMBAWA hitbox lamanya kalau tidak di-resize -> pemain "kena monster yang tak
   terlihat". setTexture() TIDAK mengubah ukuran body. */
/* Disesuaikan ke sprite REVISI 2 yang lebih besar (lihat tabel di bawah).
   Body sengaja ~78% lebar & ~80% tinggi sprite: hitbox sedikit lebih kecil dari
   gambar terasa lebih adil bagi pemain (miss terasa seperti nyaris kena). */
/* Hitbox PEMAIN diturunkan dari UKURAN TEKSTUR yang sedang dipakai,
   bukan angka mati. Dulu 30x54 offset(9,14) untuk sprite 48x68; rasio
   itulah yang dipertahankan, sehingga saat slider ukuran mengecilkan
   sprite, kotak tumbukan ikut mengecil dengan proporsi sama.

   Tanpa ini, mengecilkan pemain hanya mengecilkan GAMBAR sementara
   ruang yang ditempatinya tetap sebesar semula — persis keluhan
   "jgn karakternya doang kecil tp space yang dipakai tetap besar".

     dasar : 30/48 lebar, 54/68 tinggi, kaki menempel dasar tekstur
     besar : 30/48 lebar, 62/68 tinggi  */
var PLAYER_BODY_RATIO = {
  dasar: { w: 30 / 48, h: 54 / 68 },
  besar: { w: 30 / 48, h: 62 / 68 }
};

/* UKURAN BADAN PEMAIN YANG SEBENARNYA, sesudah slider ukuran.
   Dipakai generator level untuk menilai "muat atau tidak" — jangan
   memakai angka mati 30x54: itu ukuran pada skala 1,0, dan begitu
   sprite pemain dikecilkan lewat dialog, generator akan menilai badan
   yang lebih besar daripada yang benar-benar ada di layar (celah
   dianggap terlalu sempit padahal muat, atau sebaliknya). */
function playerTexSize() {
  var m = null;
  for (var i = 0; i < ASSET_MAP.length; i++) {
    if (ASSET_MAP[i].key === 't_groom_idle0') { m = ASSET_MAP[i]; break; }
  }
  if (!m) return { w: 48, h: 68 };
  return sizeOf(m);
}
function playerBodyW() {
  return Math.max(4, Math.round(playerTexSize().w * PLAYER_BODY_RATIO.dasar.w));
}
function playerBodyH() {
  return Math.max(4, Math.round(playerTexSize().h * PLAYER_BODY_RATIO.dasar.h));
}
function setPlayerBody(p, mode) {
  if (!p || !p.body) return;
  var r = PLAYER_BODY_RATIO[mode] || PLAYER_BODY_RATIO.dasar;
  var bw = Math.max(4, Math.round(p.width * r.w));
  var bh = Math.max(4, Math.round(p.height * r.h));
  p.body.setSize(bw, bh);
  /* Rata tengah mendatar, rata BAWAH tegak: kaki sprite = kaki body,
     titik yang dipakai Phaser untuk menapak tanah. */
  p.body.setOffset(Math.round((p.width - bw) / 2), p.height - bh);
}

/* Hitbox musuh. Angka = ukuran body PADA UKURAN SPRITE BAWAAN (kolom
   kedua), disimpan bersama ukuran acuannya supaya bisa diubah jadi
   RASIO saat sprite diperbesar/diperkecil lewat slider.

        [bodyW, bodyH, spriteW, spriteH]  */
var ENEMY_BODY = {
  E1: [31, 34, 40, 40],
  E2: [34, 32, 44, 40],
  E3: [34, 29, 44, 36],
  E4: [28, 38, 36, 48],
  E5: [31, 48, 40, 60],
  E6: [31, 32, 40, 40]
};

/* Body musuh sesuai ukuran tekstur yang SEDANG dipakai. Kalau sprite
   dikecilkan lewat slider, rasio body dipertahankan sehingga ruang
   tumbukannya ikut mengecil. */
function enemyBodySize(type, texW, texH) {
  var b = ENEMY_BODY[type] || [24, 20, 32, 32];
  return [
    Math.max(4, Math.round(texW * (b[0] / b[2]))),
    Math.max(4, Math.round(texH * (b[1] / b[3])))
  ];
}

GameScene.prototype.spawnEnemy = function (type, x, y) {
  var texMap = { E1:'t_e1_0', E2:'t_e2_walk', E3:'t_e3_0', E4:'t_e4', E5:'t_e5_0', E6:'t_e6_0' };
  var e = this.enemies.get(x, y, texMap[type] || 't_e1_0');
  if (!e) return null;

  /* Bersihkan sisa state dari pemakaian sebelumnya (pool reuse) */
  e.anims && e.anims.stop();
  e.setActive(true).setVisible(true);
  e.setAlpha(1).setScale(1).setAngle(0).setFlipX(false);
  e.setTexture(texMap[type] || 't_e1_0');

  if (e.body) {
    e.body.enable = true;
    e.body.reset(x, y);
    /* Resize hitbox SESUAI TIPE BARU — inti perbaikan bug hitbox hantu.
       Diturunkan dari ukuran tekstur, jadi ikut slider ukuran sprite. */
    var bs = enemyBodySize(type, e.width, e.height);
    e.body.setSize(bs[0], bs[1]);
    e.body.setOffset((e.width - bs[0]) / 2, e.height - bs[1]);
    e.body.setVelocity(0, 0);
  }

  e.setData('type', type);
  e.setData('hits', 0);
  e.alive = true;
  e.direction = -1;
  e.speed = ({ E1:30, E2:30, E3:45, E4:25, E5:0, E6:55 }[type] || 30) * this.D.enemyMul;
  e.setDepth(8);
  e.isShell = false; e.shellFly = false; e.recoverAt = 0;
  e.baseY = y;
  e.t0 = this.time.now;
  if (type === 'E3' || type === 'E4') { e.body.setAllowGravity(false); }
  else { e.body.setAllowGravity(true); }
  /* Semua tipe lewat playSlot(): E2/E4/E5 bawaannya diam, tapi kalau
     slotnya diberi >1 rangka dari dialog, mereka HARUS ikut bergerak.
     Dulu hanya E1/E3/E6 yang dimainkan, sehingga menambah rangka pada
     tipe lain tidak berpengaruh apa-apa. */
  var foeSlot = { E1:'foe1', E2:'foe2', E3:'foe3', E4:'foe4', E5:'foe5', E6:'foe6' }[type];
  if (foeSlot) playSlot(e, foeSlot);
  return e;
};

GameScene.prototype.updateEnemies = function (time) {
  var p = this.player;
  var kids = this.enemies.getChildren();
  for (var i = 0; i < kids.length; i++) {
    var e = kids[i];
    if (!e.active || !e.body || !e.alive) continue;

    /* Culling dari repo: berhenti update kalau jauh */
    if (Math.abs(e.x - p.x) >= 450) continue;

    var type = e.getData('type');

    if (type === 'E3') {
      /* Terbang sinus */
      e.body.velocity.x = -e.speed;
      e.y = e.baseY + Math.sin((time - e.t0) / 2000 * Math.PI * 2) * 64;
      continue;
    }
    if (type === 'E4') {
      /* Melayang naik-turun di tempat */
      e.body.velocity.x = 0;
      e.y = e.baseY + Math.sin((time - e.t0) / 2400 * Math.PI * 2) * 48;
      continue;
    }
    if (type === 'E5') { e.body.velocity.x = 0; continue; }

    if (type === 'E6') {
      /* Pengejar lambat; berhenti di tepi jurang (tidak bunuh diri) */
      var dir = (p.x < e.x) ? -1 : 1;
      if (this.hasGroundAhead(e, dir)) { e.direction = dir; e.body.velocity.x = e.speed * dir; }
      else e.body.velocity.x = 0;
      e.setFlipX(dir < 0);
      continue;
    }

    /* E1 / E2: URUTAN KRITIS — balik arah DULU, baru set velocity.
       Repo: "后移动,否则会鬼畜" (kalau dibalik, sprite gemetar di dinding) */
    if (e.body.onWall()) e.direction *= -1;

    if (type === 'E2' && e.isShell) {
      if (e.shellFly) {
        e.body.velocity.x = 300 * e.direction;
        /* Cangkang melesat membunuh musuh lain */
        for (var j = 0; j < kids.length; j++) {
          var o = kids[j];
          if (o !== e && o.active && o.alive && Math.abs(o.x - e.x) < 26 && Math.abs(o.y - e.y) < 30) {
            this.killEnemy(o, 10);
          }
        }
      } else {
        e.body.velocity.x = 0;
        if (e.recoverAt && time > e.recoverAt) {
          e.isShell = false;
          e.setTexture('t_e2_walk');
          e.direction = -1;
        }
      }
    } else {
      e.body.velocity.x = e.speed * e.direction;
      e.setFlipX(e.direction > 0);
    }
  }
};

GameScene.prototype.hasGroundAhead = function (e, dir) {
  var probeX = e.x + dir * 22;
  var L = this.L;
  for (var i = 0; i < L.ground.length; i++) {
    if (probeX >= L.ground[i].x && probeX <= L.ground[i].x + L.ground[i].w) return true;
  }
  return false;
};

/* ---------------------------------------------------------------
   INTERAKSI
   --------------------------------------------------------------- */
GameScene.prototype.touchEnemy = function (p, e) {
  /* Guard berlapis: musuh yang sedang memainkan animasi mati (alive=false) atau
     yang body-nya sudah dimatikan TIDAK boleh melukai/ditumpuk lagi. Tanpa ini
     pemain "kena monster" dari bangkai yang belum hilang dari layar. */
  if (!e.active || !e.alive || !e.body || !e.body.enable || p.dying) return;
  var type = e.getData('type');

  /* Syarat injak (dari repo): DUA-DUANYA wajib true */
  var stomp = e.body.touching.up && p.body.touching.down;

  if (stomp) {
    if (type === 'E2') {
      if (!e.isShell) {
        /* Injak-1: masuk cangkang, player terpental (repo: scene.player.jump()) */
        e.isShell = true; e.shellFly = false;
        e.direction = 0; e.body.velocity.x = 0;
        e.setTexture('t_e2_shell');
        e.anims.stop();
        e.recoverAt = this.time.now + 6000;   /* 3000 mulai pulih + 3000 selesai */
        p.body.velocity.y = -PHYS.JUMP_VELOCITY;
        this.addScore(20); sfx('stomp'); this.juiceStomp(e);
      } else {
        /* Injak-2: melesat, arah dari posisi player */
        e.shellFly = true;
        e.direction = (p.x - e.x) >= e.body.halfWidth ? -1 : 1;
        p.body.velocity.y = -PHYS.JUMP_VELOCITY;
        this.addScore(10); sfx('stomp');
      }
      return;
    }
    if (type === 'E5') {
      var hits = e.getData('hits') + 1;
      e.setData('hits', hits);
      if (hits >= 2) { this.killEnemy(e, 40); }
      else {
        /* Tahap rusak: sprite jadi pendek (separuh tinggi). Body ikut
           diturunkan dari tekstur BARU supaya tetap pas walau ukuran
           sprite diubah lewat slider. */
        e.setTexture('t_e5_1');
        var eh = Math.max(4, Math.round(e.height * 0.5));
        e.body.setSize(Math.max(4, Math.round(e.width * 0.8)), eh);
        e.body.setOffset(Math.round((e.width - e.width * 0.8) / 2), e.height - eh);
        e.y += eh;
      }
      p.body.velocity.y = -PHYS.JUMP_VELOCITY;
      sfx('stomp');
      return;
    }
    this.killEnemy(e, 20);
    p.body.velocity.y = -PHYS.JUMP_VELOCITY * 0.8;
    return;
  }

  /* Cangkang diam tidak melukai; ditendang jadi melesat */
  if (type === 'E2' && e.isShell && !e.shellFly) {
    e.shellFly = true;
    e.direction = (p.x < e.x) ? 1 : -1;
    return;
  }
  this.hurtPlayer(e);
};

GameScene.prototype.killEnemy = function (e, score) {
  if (!e.alive) return;
  e.alive = false;
  if (e.body) e.body.enable = false;
  this.addScore(score || 20);
  sfx('stomp');
  this.juiceStomp(e);
  this.tweens.add({
    targets: e, scaleY: 0.25, alpha: 0, y: e.y + 8, duration: 320,
    onComplete: function () { try { e.disableBody(true, true); } catch (err) {} }
  });
};

GameScene.prototype.juiceStomp = function (e) {
  this.cameras.main.shake(90, 0.008);
  if (this.textures.exists('t_spark')) {
    var em = this.add.particles(e.x, e.y, 't_spark', {
      speed: { min: 40, max: 130 }, lifespan: 420, quantity: 6,
      scale: { start: 0.9, end: 0 }, blendMode: 'ADD', emitting: false
    });
    em.explode(6);
    this.time.delayedCall(600, function () { try { em.destroy(); } catch (err) {} });
  }
};

GameScene.prototype.hurtPlayer = function (src) {
  var p = this.player;
  if (p.invuln > 0 || p.invincible || cheat.on || p.dying) return;

  /* TANPA nyawa, TANPA game-over: knockback + i-frame */
  var dir = (p.x < src.x) ? -1 : 1;
  p.body.velocity.x = PHYS.KNOCKBACK_X * dir;
  p.body.velocity.y = PHYS.KNOCKBACK_Y;
  p.invuln = this.D.invuln;

  if (p.mode === 'besar') {
    p.mode = 'dasar';
    _playerMode = 'dasar';
    setPlayerBody(p, 'dasar');
  }
  /* Rangka "kena" dipasang PALING AKHIR. Sebelumnya setTexture() ada di
     atas dan refreshPlayerSkin() di bawahnya langsung menimpanya dengan
     idle/lari, jadi rangka kena tidak pernah benar-benar terlihat.
     playSlot() dipakai supaya wujud power-up yang masih aktif tetap
     dihormati (mis. kena musuh saat memakai payung). */
  playSlot(p, 'player_hurt', false);
  sfx('hurt');
  this.cameras.main.shake(160, 0.02);
  this.cameras.main.flash(80, 255, 60, 60);
};

GameScene.prototype.fallOut = function () {
  var p = this.player;
  if (p.dying) return;
  p.dying = true;
  p.body.enable = false;

  /* Animasi dari repo: naik 16px (600ms) lalu jatuh (2000ms) — dipercepat */
  var self = this;
  this.tweens.add({
    targets: p, y: p.y - 16, duration: 400, ease: 'Power1',
    onComplete: function () {
      var sx = self.findSafeRespawn(p.x);
      self.cameras.main.fade(180, 0, 0, 0);
      self.time.delayedCall(220, function () {
        p.setPosition(sx, self.GY - 90);
        p.body.enable = true;
        p.body.setVelocity(0, 0);
        p.dying = false;
        p.invuln = 1200;
        self.cameras.main.fadeIn(180, 0, 0, 0);
        /* Freeze musuh sekitar 1 detik (anti spawn-kill) */
        self.freezeEnemiesNear(sx, 1000);
        toast('Coba lagi dari titik aman', null, 1800);
      });
    }
  });
};

/* Gambar pijakan melayang dari TIGA potong sprite.

   Kenapa tidak satu sprite diregangkan: pijakan bisa selebar 2-6 tile,
   dan meregangkan satu gambar 32px ke 192px membuat pola batanya melar
   (terlihat jelas di pijakan panjang). Dengan potongan, ukuran piksel
   tiap potong tetap sama berapa pun panjang pijakannya.

   Bagian TENGAH memakai tileSprite supaya biayanya satu objek, bukan
   satu add.image per petak. */
GameScene.prototype.drawPlatform = function (x, y, w) {
  /* Bukan tekstur per-stage, jadi kunci dipakai langsung (jangan lewat
     scene_texKey: fungsi itu merangkai prefix+id dan akan menghasilkan
     "t_plat_lnull" kalau id-nya kosong). */
  var kL = 't_plat_l', kM = 't_plat', kR = 't_plat_r';
  var has = function (k) { return this.textures.exists(k); }.bind(this);
  /* Kalau potongan ujung tidak ada (mis. sheet belum diunggah), pakai
     potongan tengah untuk ketiganya — lebih baik seragam daripada
     bolong. */
  if (!has(kM)) return;
  if (!has(kL)) kL = kM;
  if (!has(kR)) kR = kM;

  var D = 6;                              /* di atas isian tanah (-5) */
  var endW = Math.min(TILE, Math.floor(w / 2));
  if (w <= TILE) {                        /* terlalu pendek utk 3 potong */
    this.add.image(x, y, kM).setOrigin(0, 0).setDisplaySize(w, TILE).setDepth(D);
    return;
  }
  this.add.image(x, y, kL).setOrigin(0, 0)
      .setDisplaySize(endW, TILE).setDepth(D);
  var midW = w - endW * 2;
  if (midW > 0) {
    this.add.tileSprite(x + endW, y, midW, TILE, kM)
        .setOrigin(0, 0).setDepth(D);
  }
  this.add.image(x + w - endW, y, kR).setOrigin(0, 0)
      .setDisplaySize(endW, TILE).setDepth(D);
};

GameScene.prototype.findSafeRespawn = function (fromX) {
  for (var x = fromX - 200; x > 60; x -= 40) {
    if (!this.groundAtX(x)) continue;
    if (this.enemyNear(x, 220)) continue;
    return x;
  }
  return this.player.respawnX || 90;
};
GameScene.prototype.groundAtX = function (x) {
  var L = this.L;
  for (var i = 0; i < L.ground.length; i++) {
    if (x >= L.ground[i].x + 20 && x <= L.ground[i].x + L.ground[i].w - 20) return true;
  }
  return false;
};
GameScene.prototype.enemyNear = function (x, r) {
  var kids = this.enemies.getChildren();
  for (var i = 0; i < kids.length; i++) {
    if (kids[i].active && kids[i].alive && Math.abs(kids[i].x - x) < r) return true;
  }
  return false;
};
GameScene.prototype.freezeEnemiesNear = function (x, ms) {
  var kids = this.enemies.getChildren();
  var frozen = [];
  for (var i = 0; i < kids.length; i++) {
    var e = kids[i];
    if (e.active && e.alive && Math.abs(e.x - x) < 320) {
      var sp = e.speed; e.speed = 0; frozen.push({ e: e, sp: sp });
    }
  }
  this.time.delayedCall(ms, function () {
    for (var j = 0; j < frozen.length; j++) frozen[j].e.speed = frozen[j].sp;
  });
};

/* Pukul blok dari bawah (dari repo: touching.up && touching.down, guard isCollided) */
GameScene.prototype.hitBrick = function (p, b) {
  if (!(p.body.touching.up && b.body.touching.down)) return;
  var kind = b.getData('kind');

  if (kind === 'q') {
    if (b.getData('dead')) return;             /* guard: isi keluar sekali saja */
    b.setData('dead', true);
    b.anims.stop();
    b.setTexture('t_q_dead');
    this.bumpTween(b);
    var item = b.getData('item');
    if (item === 'power') this.spawnPowerup(b.x, b.y - 32);
    else this.popCoin(b.x, b.y - 32);
    sfx('bump');
  } else {
    this.bumpTween(b);
    sfx('bump');
    if (p.mode === 'besar') {
      /* Mode besar menghancurkan bata */
      var self = this;
      this.tweens.add({
        targets: b, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 180,
        onComplete: function () { try { b.destroy(); } catch (e) {} }
      });
      this.addScore(10);
    }
  }
};

/* Tween pukul blok: y-8, 100ms, ease Quintic, yoyo (persis dari repo) */
GameScene.prototype.bumpTween = function (b) {
  this.tweens.add({ targets: b, y: b.y - 8, duration: 100, ease: 'Quintic', yoyo: true });
};

GameScene.prototype.popCoin = function (x, y) {
  var c = this.add.image(x, y, 't_coin0').setDepth(12);
  this.addScore(50);
  sfx('coin');
  var self = this;
  this.tweens.add({
    targets: c, y: y - 56, duration: 200, ease: 'Quintic', yoyo: true,
    onComplete: function () { try { c.destroy(); } catch (e) {} }
  });
};

/* Stage mana yang boleh menjatuhkan BUKET (power-up menembak).
   SEMUA stage — permintaan user: senjata jangan langka.
   STAGES ada 6 (indeks 0..5); bos = indeks 5 = STAGE 6.

   DITULIS SEBAGAI NOMOR STAGE (yang dilihat pemain di HUD), bukan indeks.
   Ini pernah salah: dulu isinya [1,3,5] tapi dibandingkan dengan stageIdx
   yang berbasis 0, jadi yang benar-benar dapat buket adalah stage 2, 4,
   dan 6 — stage 1 dan 3 tidak pernah punya buket sama sekali. Stage 6
   kebetulan memang stage bos, sehingga bagian terpentingnya tetap jalan
   dan salahnya tidak kelihatan. Karena itu satuannya ditegaskan di sini
   dan konversinya dikurung di satu fungsi. */
var BUKET_STAGE_NOS = [1, 2, 3, 4, 5, 6];
function stageHasBuket(stageIdx) {
  return BUKET_STAGE_NOS.indexOf(stageIdx + 1) > -1;
}

GameScene.prototype.spawnPowerup = function (x, y) {
  var kind;
  /* KOTAK PERTAMA di stage ini DIJAMIN buket, tidak diundi.
     Menjamin jumlah kotak saja belum cukup: dengan 3 kotak dan peluang
     40% per kotak, masih ada 21.5% permainan yang tidak pernah mendapat
     senjata sama sekali — cukup sering untuk terasa seperti "tidak ada
     tembakan di stage ini", persis yang dilaporkan user. Undian tetap
     dipakai untuk kotak-kotak berikutnya supaya variasinya tidak hilang. */
  if (stageHasBuket(this.stageIdx) && !this._buketGiven) {
    kind = 'buket';
    this._buketGiven = true;
  } else {
    var kinds = ['melati', 'cincin', 'payung'];
    /* Di stage ber-buket, peluangnya dinaikkan (2 slot dari 5) supaya
       pemain benar-benar sempat menemukannya lagi sesudah yang pertama. */
    if (stageHasBuket(this.stageIdx)) kinds = kinds.concat(['buket', 'buket']);
    kind = kinds[Math.floor(Math.random() * kinds.length)];
  }
  var pu = this.powerups.create(x, y, 't_pw_' + kind);
  pu.setData('kind', kind);
  pu.setDepth(9);
  /* Mainkan animasi kalau slot ini diberi >1 rangka lewat dialog.
     Tanpa baris ini animasinya terdaftar tapi tidak pernah dijalankan —
     objek tetap diam di rangka pertama ("ganti 1 jadi >1 ga berfungsi"). */
  playSlot(pu, 'pw_' + kind);
  /* Keluar dari blok: tween y -= h*2, 200ms, Quintic, yoyo (pola repo Mushroom) */
  this.tweens.add({ targets: pu, y: y - 48, duration: 200, ease: 'Quintic', yoyo: true });
  pu.body.velocity.x = (this.player.x < x) ? 60 : -60;
  pu.setBounce(0, 0);
  sfx('powerup');
};

GameScene.prototype.takeCoin = function (p, c) {
  if (!c.active) return;
  c.disableBody(true, true);
  this.addScore(50);
  sfx('coin');
};

GameScene.prototype.takePiece = function (p, pc) {
  if (!pc.active) return;
  var key = pc.getData('key');
  pc.disableBody(true, true);

  /* Juice: freeze + shake + flash + partikel hati + terbang ke HUD */
  this.cameras.main.shake(150, 0.015);
  this.cameras.main.flash(60, 255, 255, 255);
  if (this.textures.exists('t_piece0')) {
    var fly = this.add.image(pc.x, pc.y, 't_piece0').setDepth(70);
    var cam = this.cameras.main;
    this.tweens.add({
      targets: fly,
      x: cam.scrollX + BW - 40, y: 90,
      scaleX: 0.4, scaleY: 0.4, alpha: 0.2,
      duration: 620, ease: 'Cubic.easeIn',
      onComplete: function () { try { fly.destroy(); } catch (e) {} }
    });
  }
  this.addScore(100);
  unlockInfo(key);     /* nyalakan ikon — JANGAN auto-open modal */
};

/* Keterangan power-up untuk pesan saat didapat.
   Teks HURUF BESAR & tanpa emoji: strip font sheet hanya punya A-Z, 0-9,
   dan .,:?!() — huruf kecil dipetakan ke besar, sisanya jadi spasi. */
/* SATU durasi untuk SEMUA power-up berdurasi (permintaan: "power up
   dibuat selama 16 detik semua"). Ditulis sekali di sini dan dipakai
   ulang di mana-mana — dulu 8000 & 10000 ditulis terpisah di kode dan
   di teks keterangan, jadi bisa meleset satu sama lain. */
var PW_MS = 16000;
var PW_SEC = Math.round(PW_MS / 1000);

var POWERUP_INFO = {
  melati: { label: 'MELATI',  effect: 'BADAN MEMBESAR' },
  cincin: { label: 'CINCIN',  effect: 'KEBAL ' + PW_SEC + ' DETIK' },
  payung: { label: 'PAYUNG',  effect: 'LOMPAT RINGAN ' + PW_SEC + ' DETIK' },
  /* Buket TIDAK memakai PW_SEC: ia berlaku sampai stage selesai. */
  buket:  { label: 'BUKET',   effect: 'TEMBAK SAMPAI STAGE SELESAI' }
};

GameScene.prototype.takePowerup = function (p, pu) {
  if (!pu.active) return;
  var kind = pu.getData('kind');
  pu.disableBody(true, true);
  sfx('powerup');
  this.cameras.main.flash(50, 255, 220, 90);

  if (kind === 'melati') {
    p.mode = 'besar';
    _playerMode = 'besar';
    setPlayerBody(p, 'besar');           /* mode BESAR */
    this.tweens.add({ targets: p, scaleX: 1.25, scaleY: 1.25, duration: 140, yoyo: true });
  } else if (kind === 'cincin') {
    runState.powerup = 'cincin';
    runState.powerupUntil = this.time.now + PW_MS;
    p.invincible = true;
  } else if (kind === 'buket') {
    /* BUKET — menembak di tempat. Tidak mengubah gravitasi maupun
       kekebalan; satu-satunya efeknya membuka kemampuan menembak.

       BERBEDA dari power-up lain: berlaku SAMPAI STAGE SELESAI, bukan 16
       detik. Alasannya gunanya justru di pertarungan bos, dan bos butuh
       12 pukulan dengan jendela rentan yang hanya terbuka sesaat — jam
       16 detik hampir pasti habis di tengah pertarungan, tepat saat
       senjatanya paling dibutuhkan.

       Infinity, bukan angka besar: perbandingannya `time > powerupUntil`,
       dan `time > Infinity` selalu false — tidak ada nilai jam yang bisa
       melewatinya. Angka besar (mis. 999999) hanya menunda masalah.
       Yang MENGAKHIRI-nya adalah pergantian stage: create() membersihkan
       runState.powerup setiap dunia dibangun ulang, jadi buket tidak
       terbawa ke stage berikutnya. */
    runState.powerup = 'buket';
    runState.powerupUntil = Infinity;
    this.shotCdUntil = 0;              /* boleh langsung menembak */
  } else {
    runState.powerup = 'payung';
    runState.powerupUntil = this.time.now + PW_MS;
    this.physics.world.gravity.y = PHYS.GRAVITY_Y * 0.5;
  }
  /* Wujud pemain ikut berganti supaya efeknya terlihat di layar, bukan
     cuma di HUD. */
  refreshPlayerSkin(p);
  /* Beri tahu APA yang didapat & efeknya — sebelumnya power-up hanya
     berkedip lalu diam, jadi pemain tidak tahu apa yang berubah.
     Durasinya diambil dari angka yang sama dengan efek di atas supaya
     tidak bisa meleset kalau salah satunya diubah. */
  var info = POWERUP_INFO[kind];
  if (info) toast(info.label + ' - ' + info.effect, 'ok', 2600);
  this.addScore(30);
  updateHud();
};

GameScene.prototype.addScore = function (n) {
  if (cheat.on) return;                 /* skor beku saat cheat */
  runState.score += n;
  if (runState.score > STORE.best) { STORE.best = runState.score; saveStore(); }
  updateHud();
};

/* ---------------------------------------------------------------
   GOAL & TRANSISI SINEMATIK
   --------------------------------------------------------------- */
GameScene.prototype.reachGoal = function () {
  if (this.clearSeq) return;
  var S = STAGES[this.stageIdx];
  if (S.boss) return;                   /* stage boss selesai lewat defeatBoss */

  this.clearSeq = { phase: 'banner', t: 0 };
  this.player.invuln = 999999;
  this.player.autoFly = true;

  if (this.stageIdx + 1 > STORE.maxStage) { STORE.maxStage = this.stageIdx + 1; saveStore(); }

  var cam = this.cameras.main;
  this.banner = this.add.text(BW / 2, BH * 0.34, 'STAGE CLEAR', {
    fontFamily: 'Courier New, monospace', fontSize: '30px', color: '#ffd34d',
    stroke: '#1a1228', strokeThickness: 6
  }).setOrigin(0.5).setScrollFactor(0).setDepth(80).setScale(0.5);
  this.tweens.add({ targets: this.banner, scaleX: 1, scaleY: 1, duration: 320, ease: 'Back.out' });
  sfx('fanfare');
};

GameScene.prototype.updateClearSeq = function (time, delta) {
  var cs = this.clearSeq;
  cs.t += delta;
  var p = this.player;

  if (cs.phase === 'banner') {
    p.body.velocity.x = 0;
    if (cs.t > 950) { cs.phase = 'fly'; cs.t = 0; }
    return;
  }
  if (cs.phase === 'fly') {
    p.body.velocity.x = Math.min(900, 200 + cs.t * 1.6);
    playSlot(p, 'player_run');
    var cam = this.cameras.main;
    if (p.x > cam.scrollX + BW + 60 || cs.t > 2500) { cs.phase = 'done'; }
    return;
  }
  if (cs.phase === 'done') {
    this.clearSeq = null;
    if (this.banner) { try { this.banner.destroy(); } catch (e) {} this.banner = null; }
    var next = this.stageIdx + 1;
    if (next >= STAGES.length) { announceCompleted(); return; }
    runState.stage = next;
    this.scene.restart({ stage: next });
  }
};

/* =====================================================================
   MENEMBAK (power-up BUKET)
   =====================================================================
   Modelnya diambil dari retromario (fireball), tapi disesuaikan:

   - retromario melempar bola api MELENGKUNG yang memantul di tanah,
     karena di sana menembak dipakai untuk membersihkan musuh darat
     sambil berlari.
   - Di sini peluru MELUNCUR LURUS tanpa gravitasi. Alasannya bos di
     tema ini MELAYANG dan bergoyang naik-turun; peluru melengkung akan
     selalu jatuh di bawahnya dan pemain tidak akan pernah bisa
     mengenainya. Peluru lurus membuat power-up ini benar-benar berguna
     melawan bos — yang justru inti permintaannya.

   Batas yang ditiru apa adanya dari retromario karena memang terbukti:
   jumlah peluru di layar dibatasi, ada jeda tembak, dan peluru mati
   saat keluar layar (bukan terbang selamanya menghabiskan memori). */
var SHOT_MAX = 3;          /* peluru serentak di layar (retromario: 2) */
var SHOT_CD = 300;         /* jeda antar tembakan, ms (retromario: 18 frame = 300ms) */
var SHOT_SPEED = 520;      /* px/detik, lurus mendatar */
var SHOT_LIFE = 1400;      /* umur maksimum, ms — jaring pengaman kalau lolos dari layar */

/* Boleh menembak? Satu-satunya sumber kebenaran, dipakai UI maupun logika. */
function canShoot() {
  return !!(runState && runState.powerup === 'buket');
}

/* Tombol tembak hanya ADA saat bisa menembak — tombol mati yang selalu
   terlihat mengajarkan pemain untuk mengabaikannya. Kelasnya di-set
   hanya saat BERUBAH: menulis classList tiap frame membuat browser
   menghitung ulang gaya 60x/detik tanpa guna. */
var _shootBtnOn = null;
function syncShootBtn() {
  var on = canShoot();
  if (on === _shootBtnOn) return;
  _shootBtnOn = on;
  var b = document.getElementById('pwr-btn-shoot');
  if (b) b.classList.toggle('is-available', on);
}

GameScene.prototype.fireShot = function (time) {
  if (!canShoot()) return false;
  if (this.clearSeq || !this.player || this.player.dying) return false;
  if (time < this.shotCdUntil) return false;

  /* Kolam penuh = jangan menembak. getFirstDead() akan mengembalikan
     null, dan memaksa create() di sini justru melewati batas kolam. */
  var live = this.shots.countActive(true);
  if (live >= SHOT_MAX) return false;

  var p = this.player;
  var dir = p.direction >= 0 ? 1 : -1;
  var s = this.shots.get(p.x + dir * 22, p.y - 4, 't_shot');
  if (!s) return false;

  /* enableBody(), BUKAN setActive() + body.reset().
     ---------------------------------------------------------------------
     BUG YANG DIPERBAIKI (dilaporkan user: "mekanisme tembak kok aneh kyk
     kasih ranjau / awal2 bener pelurunya melesat kedepan / ga lama setelah
     itu ketika klik tembak pelurunya malah berhenti di tempat kita nembak").

     Peluru dipakai ulang dari kolam. Saat sebuah peluru kena musuh atau
     habis umur, ia di-disableBody(true, true) — dan itu menyetel
     body.enable = false. Ketika group.get() mengembalikan objek yang sama
     nanti, setActive(true) hanya menghidupkan GAME OBJECT-nya; body.reset()
     memindahkan posisi dan menghentikan badan, tapi TIDAK pernah
     menyalakan kembali body.enable. Jadi kecepatan 520 tertulis ke badan
     MATI: fisika tidak menggerakkannya, sementara sprite-nya tetap
     tergambar. Hasilnya peluru menggantung diam di titik tembak — persis
     "ranjau" yang dilihat user.

     Tembakan pertama-pertama benar karena objeknya masih baru (enable
     masih true bawaan); gejalanya baru muncul sesudah daur ulang dimulai.

     enableBody(reset, x, y, enableGameObject, showGameObject) menyalakan
     body.enable SEKALIGUS mengaktifkan & menampilkan objeknya, jadi tidak
     ada lagi keadaan setengah hidup. */
  var sx = p.x + dir * 22, sy = p.y - 4;
  if (s.body) {
    s.enableBody(true, sx, sy, true, true);
    s.body.setAllowGravity(false);            /* LURUS — lihat catatan di atas */
    s.body.setVelocity(dir * SHOT_SPEED, 0);
    /* Hitbox DITURUNKAN DARI TEKSTUR, bukan angka mati.
       Dulu dipatok 14x14 — cocok untuk peluru 18px bawaan, tapi begitu
       't_shot' dikecilkan lewat slider (sekarang 0,55 -> 10px), kotak
       tumbukannya jadi LEBIH BESAR daripada gambarnya: musuh mati
       tersenggol udara kosong ~2px di tiap sisi. Rasio 78% dipertahankan
       dari nilai lama (14/18), jadi rasanya sama pada ukuran bawaan. */
    var sw = Math.max(4, Math.round(s.width * 0.78));
    var shh = Math.max(4, Math.round(s.height * 0.78));
    s.body.setSize(sw, shh);
    s.body.setOffset(Math.round((s.width - sw) / 2),
                     Math.round((s.height - shh) / 2));
  } else {
    s.setActive(true).setVisible(true);
    s.x = sx; s.y = sy;
  }
  s.setDepth(11);
  s.setFlipX(dir < 0);
  s.diesAt = time + SHOT_LIFE;
  playSlot(s, 'shot');
  this.shotCdUntil = time + SHOT_CD;
  sfx('shoot');
  return true;
};

/* Buang peluru yang habis umur / keluar layar. Tanpa ini peluru yang
   meleset akan hidup selamanya dan kolam cepat penuh — pemain lalu
   merasa "tembakannya tidak keluar" padahal kolamnya tersumbat. */
GameScene.prototype.updateShots = function (time) {
  var cam = this.cameras.main;
  var kids = this.shots.getChildren();
  for (var i = 0; i < kids.length; i++) {
    var s = kids[i];
    if (!s.active) continue;
    if ((s.diesAt && time > s.diesAt) ||
        s.x < cam.scrollX - 60 || s.x > cam.scrollX + BW + 60) {
      s.disableBody(true, true);
    }
  }
};

/* Peluru mengenai musuh biasa. */
GameScene.prototype.shotHitsEnemy = function (s, e) {
  if (!s.active || !e.active) return;
  s.disableBody(true, true);               /* tidak menembus — 1 peluru 1 musuh */
  this.killEnemy(e, 20);
};

/* Peluru mengenai bos.

   ⚠️ AKAR BUG "BOS ILANG SAAT DITEMBAK" (dilaporkan user berkali-kali) ⚠️
   ---------------------------------------------------------------------
   physics.add.overlap(this.shots, this.boss, ...) — object1 = GROUP peluru,
   object2 = SPRITE tunggal bos. Phaser 3.80.1 (World.js collideHandler ->
   collideSpriteVsGroup) MENORMALKAN urutan argumen: SPRITE TUNGGAL selalu
   dikirim sebagai argumen PERTAMA, anggota GROUP sebagai argumen KEDUA —
   TANPA memandang urutan yang kita tulis di add.overlap.

   Jadi callback ini dipanggil sebagai shotHitsBoss(BOS, PELURU), bukan
   (peluru, bos). Kode lama menulis s.disableBody(true, true) pada argumen
   pertama = pada BOS -> active=false & visible=false -> BOS HILANG persis
   saat ditembak (HP masih penuh karena hitBoss ikut jalan tapi bos sudah
   dimatikan). Inilah penyebab sebenarnya — bukan alpha/tint/partikel.

   Perbaikan: JANGAN andalkan urutan. Kenali mana yang bos (this.boss) dan
   mana yang peluru berdasar identitas, lalu matikan HANYA peluru. */
GameScene.prototype.shotHitsBoss = function (a, c) {
  var b = this.boss;
  if (!b || !b.active || !this.bossActive) return;
  /* Bos adalah argumen mana pun yang === this.boss; peluru yang satunya. */
  var shot = (a === b) ? c : a;
  if (!shot || !shot.active) return;
  if (typeof shot.disableBody === 'function') shot.disableBody(true, true);
  /* JANGAN PERNAH menyentuh 'b' (bos) di sini dengan disable/hide. */
  /* Tidak ada lagi "jendela rentan": bos selalu bisa dilukai (permintaan
     user). Yang membatasi hanya invulnMs sesudah kena — diperiksa di dalam
     hitBoss(), jadi peluru saat bos masih kebal otomatis tak berefek. */
  this.hitBoss();
};

/* ---------------------------------------------------------------
   BOSS
   --------------------------------------------------------------- */
GameScene.prototype.buildBossArena = function (L, GY) {
  /* TATA LETAK ARENA (permintaan user):
       - bos DULU, bendera jauh SESUDAHNYA
       - selama bos hidup, pemain DITAHAN di arena; baru boleh maju
         setelah bos kalah
     Jadi arena bos ditaruh jauh dari bendera. Bendera & mempelai di ujung
     level (dipasang di create()/di sini), arena bos ~1200px sebelumnya. */
  var flagX = L.goalX;                        /* ujung — tempat bendera */
  this.bossHomeX = flagX - 1250;              /* bos bertarung di sini */
  this.arenaX = this.bossHomeX - Math.round(BW * 0.5);  /* pemicu aktif */
  /* Gerbang: tepi kanan tempat pemain ditahan selama bos hidup. Sedikit
     di kanan rumah bos supaya ada ruang bertarung, tapi masih jauh dari
     bendera. */
  this.bossGateX = this.bossHomeX + 180;

  /* Bos BERDIRI DI TANAH.
     BUG YANG DIPERBAIKI (dilaporkan user: "bossnya ga napak tanah").
     Dulu baseY = GY - 120 dengan origin TENGAH: titik tengah 120px di atas
     tanah, kaki (setengah tinggi ~58px di bawahnya) berhenti di GY-62 —
     melayang 62px. Sekarang acuannya KAKI (setOrigin(0.5,1)) dan baseY =
     GY, aturan yang sama dengan bendera & mempelai, jadi kakinya menempel
     tanah berapa pun tinggi/skalanya. */
  this.boss = this.physics.add.sprite(this.bossHomeX, GY, 't_boss1');
  this.boss.setOrigin(0.5, 1);
  this.boss.body.setAllowGravity(false);
  this.boss.setImmovable(true);
  this.boss.setAlpha(0);              /* JANGAN setActive(false) — body ikut mati */
  this.boss.setDepth(9);
  /* Peluru bisa melukai bos — dipasang di sini karena sprite bos baru
     ada sekarang. Tanpa ini power-up menembak jadi tidak berguna
     justru di tempat yang paling membutuhkannya. */
  this.physics.add.overlap(this.shots, this.boss, this.shotHitsBoss, null, this);
  this.bossHp = 12;
  this.bossPhase = 1;
  this.boss.baseY = GY;              /* kaki di tanah (origin kaki) */
  /* Penghitung damage-feedback (frame-based, bukan tween). Diinisialisasi
     di sini supaya updateBoss tidak membaca undefined pada frame pertama. */
  this.boss.invulnMs = 0;
  this.boss.flashMs = 0;

  /* Penjaga di koridor MENUJU arena (bukan sesudahnya) supaya approach
     tidak kosong. */
  for (var i = 0; i < 3; i++) {
    this.spawnList.push({ x: this.arenaX - 500 + i * 150, y: GY - 40, type: 'E1' });
  }

  /* Tinggi kepala bos di atas kakinya — dipakai menaruh bar HP & indikator.
     Origin bos = KAKI, jadi kepalanya di y - displayHeight. Dihitung dari
     tinggi tekstur SEBENARNYA (ikut skala/ganti sprite), bukan angka mati,
     supaya bar tetap di atas kepala berapa pun ukuran bosnya. */
  this.bossHeadH = (this.boss.displayHeight || 117) + 16;

  /* HP bar KECIL di ATAS KEPALA boss (world-space) */
  this.bossHpBg = this.add.rectangle(this.boss.x, this.boss.y - this.bossHeadH, 94, 7, 0x000000)
    .setDepth(50).setVisible(false);
  this.bossHpFill = this.add.rectangle(this.boss.x - 45, this.boss.y - this.bossHeadH, 90, 5, 0xe23b2e)
    .setOrigin(0, 0.5).setDepth(51).setVisible(false);

  /* Mempelai wanita menunggu di pelaminan.
     add.SPRITE, bukan add.image: Image tidak punya komponen animasi sama
     sekali, jadi kalau slot ini diberi >1 rangka lewat dialog, play()
     akan diabaikan diam-diam dan gambarnya tetap statis.

     Titik acuan = KAKI (setOrigin(0.5, 1)) dan y = GY persis, aturan yang
     sama dengan tiang garis akhir. Sebelumnya dipatok GY-60 dengan acuan
     TENGAH — angka itu cuma terkaan setengah tinggi tekstur bawaan (64px),
     jadi begitu ukurannya diubah lewat dialog skala/ganti sprite, mempelai
     melayang atau tenggelam. Dengan acuan kaki, berapa pun ukurannya dia
     tetap berdiri di tanah.
     Tween naik-turun juga dibuang: itu membuatnya melayang SECARA SENGAJA
     6px di atas tanah — mempelai berdiri menunggu, bukan hantu. */
  /* Mempelai berdiri DI SAMPING bendera (di ujung, jauh dari arena bos),
     jadi pemain baru menghampirinya setelah bos kalah & gerbang terbuka. */
  var brideX = L.goalX + 70;
  this.bride = this.add.sprite(brideX, GY, 't_bride').setDepth(8);
  this.bride.setOrigin(0.5, 1);
  this.bride.setPosition(brideX, GY);
  playSlot(this.bride, 'bride');
};

GameScene.prototype.activateBoss = function () {
  this.bossActive = true;
  /* Muncul langsung penuh, BUKAN tween alpha: updateBoss menulis alpha
     tiap frame (untuk kedip damage), jadi tween fade-in akan langsung
     tertimpa dan malah membuat bos berkedip aneh saat kemunculan. */
  this.boss.setAlpha(1);
  /* Kunci kamera ke ARENA (bukan ke ujung level): arena kini jauh sebelum
     bendera, jadi mengunci ke L.len-BW akan memperlihatkan tempat yang
     salah. Batas kiri dipatok supaya pemandangan tidak menyapu mundur,
     kanan dibatasi gerbang supaya bendera belum terlihat. Dilepas lagi
     saat bos kalah (defeatBoss) agar pemain bisa berjalan ke bendera. */
  var camL = Math.max(0, this.arenaX - Math.round(BW * 0.25));
  var camW = (this.bossGateX + 120) - camL;
  this.cameras.main.setBounds(camL, 0, Math.max(BW, camW), BH);
  this.cameras.main.flash(300, 255, 255, 255);
  this.bossHpBg.setVisible(true);
  this.bossHpFill.setVisible(true);
  sfx('bosshit');
  /* Aturan baru: bos SELALU bisa diserang — tidak ada aba-aba yang harus
     ditunggu. Cukup injak dari atas atau tembak. */
  toast('SANG PENJAGA WAKTU muncul! Injak dari atas atau tembak dengan BUKET!', 'warn', 5200);
};

/* Lebar arena bos, dalam px. Bos memantul di dalam pita ini.
   Diambil dari retromario (8 petak = 128px) lalu diperlebar karena
   layar tema ini lebih besar dan bos di sini melayang. */
var BOSS_ARENA_W = 300;

GameScene.prototype.updateBoss = function (time, delta) {
  var b = this.boss;
  if (!b || !b.active) return;

  /* ---- MODEL RETROMARIO, TANPA JENDELA RENTAN ----------------------
     Permintaan user: "ga usah ada timing kapan harus nyerang, buat
     supaya bisa di serang terus". Di retromario bos memang begitu —
     satu-satunya gerbang adalah invuln beberapa frame SESUDAH kena
     (supaya satu tembakan tidak menghabiskan HP sekaligus), bukan
     jendela yang harus ditunggu. Bos SELALU bisa diinjak/ditembak.

     Damage ditampilkan lewat PENGHITUNG FRAME (hitFlash), bukan tween.
     Inilah yang memperbaiki "bos hilang saat ditembak": penghitung
     menghitung mundur sendiri tiap frame dan tidak mungkin tersangkut,
     sedangkan tween tint/alpha bisa saling menimpa dan meninggalkan bos
     separuh transparan. */

  /* Penghitung kebal & kedip — turun tiap frame, satuan ms.
     ---------------------------------------------------------------------
     BUG YANG DIPERBAIKI (dilaporkan berkali-kali: "pas di tembak masih
     ilang"). Riset Phaser: setTint() adalah fitur WEBGL-ONLY. Tema ini
     memakai Phaser.AUTO yang JATUH ke renderer CANVAS di perangkat/host
     tanpa WebGL (kasus umum di dalam ThemeWrapper). Di renderer Canvas,
     setTint pada sprite bertekstur CanvasTexture berinteraksi buruk
     (known issue #2453: frame beku / tinted-canvas nyangkut) dan bisa
     membuat sprite tidak tergambar sama sekali.

     Perbaikannya: BUANG setTint sepenuhnya. Umpan balik "kena" cukup
     lewat KEDIP ALPHA (identik di canvas & webgl) — dan tiap cabang
     WAJIB menyetel alpha eksplisit supaya tidak ada keadaan yang
     meninggalkan alpha rendah. Nilai terendah 0.4, tak pernah 0, jadi
     bos selalu terlihat. Percikan putih (partikel) memberi "pukulan"
     yang lebih jelas daripada tint, dan itu jalur yang sudah terbukti
     bekerja di tema ini (juiceStomp). */
  if (b.invulnMs > 0) b.invulnMs -= delta;
  if (b.flashMs > 0) {
    b.flashMs -= delta;
    /* kedip cepat saat baru kena (alpha, bukan tint) */
    b.setAlpha(Math.floor(time / 40) % 2 ? 0.35 : 1);
  } else if (b.invulnMs > 0) {
    /* masih kebal: kedip lebih lambat */
    b.setAlpha(Math.floor(time / 70) % 2 ? 0.55 : 1);
  } else {
    b.setAlpha(1);                 /* keadaan normal: selalu penuh */
  }
  /* JARING PENGAMAN TERAKHIR (dilaporkan berulang: bos "ilang" total saat
     ditembak, meski kode alpha di atas tak pernah menulis 0). Apa pun yang
     terjadi di frame ini — texture-swap yang meleset, efek yang menyetel
     renderable=false, dsb. — paksa bos KEMBALI dapat digambar tiap frame.
     Ini tidak mengubah gameplay; hanya menjamin bos tak pernah menghilang. */
  b.setVisible(true);
  if (!(b.alpha > 0)) b.setAlpha(1);            /* tangkap NaN/0 dari mana pun */
  b.renderFlags |= 1;                            /* pastikan flag render menyala */
  if (b.scaleX === 0 || b.scaleY === 0 || !isFinite(b.scaleX) || !isFinite(b.scaleY)) b.setScale(1);

  /* ---- PATROLI + PANTUL di pita arena ---- */
  if (b.dirX === undefined) {
    b.dirX = -1;
    b.homeX = b.x;
    b.arenaL = b.homeX - BOSS_ARENA_W * 0.5;
    b.arenaR = b.homeX + BOSS_ARENA_W * 0.5;
    b.jumpCdMs = 1400;
    b.vy = 0;
  }
  /* Makin rendah HP makin cepat (fase 1..3 -> 78/104/130 px/s). */
  var spd = 52 + this.bossPhase * 26;
  b.x += b.dirX * spd * (delta / 1000);
  if (b.x < b.arenaL) { b.x = b.arenaL; b.dirX = 1; }
  if (b.x > b.arenaR) { b.x = b.arenaR; b.dirX = -1; }
  b.setFlipX(b.dirX > 0);

  /* ---- LOMPAT ter-telegraph (dari retromario: adil & terbaca) ----
     Bos memantul naik-turun dengan gravitasi sendiri, bukan bobbing sinus:
     lompatan yang sungguhan lebih mudah dihindari daripada goyang. */
  var GY = this.GY;
  var floorY = b.baseY;                        /* ketinggian "berdiri" bos */
  b.vy += 1600 * (delta / 1000);               /* gravitasi bos */
  b.y += b.vy * (delta / 1000);
  if (b.y >= floorY) { b.y = floorY; b.vy = 0; b.onFloor = true; }
  else b.onFloor = false;

  if (b.onFloor) {
    b.jumpCdMs -= delta;
    /* aba-aba 220ms sebelum lompat */
    if (b.jumpCdMs <= 220 && !b._warned) { b._warned = true; sfx('bosshit'); }
    if (b.jumpCdMs <= 0) {
      b.vy = -540 - this.bossPhase * 40;        /* makin galak tiap fase */
      b.jumpCdMs = 1600 - this.bossPhase * 260;  /* makin sering tiap fase */
      b._warned = false;
    }
  }

  /* ANTI-NaN posisi — dijalankan SESUDAH patroli & gravitasi (justru dua
     tempat itu yang bisa menghasilkan NaN kalau salah satu inputnya rusak).
     Sprite ber-posisi/vy NaN TIDAK digambar Phaser (vanish senyap). Pulihkan
     ke titik "berdiri" yang pasti berhingga: homeX kalau ada, kalau tidak
     posisi sekarang yang masih valid, kalau tidak pun bossHomeX. */
  if (!isFinite(b.x)) { b.x = isFinite(b.homeX) ? b.homeX : (isFinite(this.bossHomeX) ? this.bossHomeX : 0); b.dirX = -1; }
  if (!isFinite(b.y)) { b.y = isFinite(b.baseY) ? b.baseY : this.GY; b.vy = 0; }
  if (!isFinite(b.vy)) b.vy = 0;

  /* ---- GERBANG: tahan pemain di arena selama bos hidup ----
     Permintaan user: "boss dulu, kl bossnya udh kalah baru bisa maju lagi
     & ketemu bendera". Selama bossActive, pemain tidak boleh melewati
     bossGateX; begitu bos kalah, defeatBoss menyetel bossActive=false dan
     gerbang ini berhenti berlaku, jadi pemain bebas maju ke bendera. */
  var p0 = this.player;
  if (p0 && this.bossGateX != null && p0.x > this.bossGateX) {
    p0.x = this.bossGateX;
    if (p0.body && p0.body.velocity.x > 0) p0.body.velocity.x = 0;
  }

  /* Bar HP mengikuti KEPALA bos (origin bos = kaki, jadi kepala di
     y - bossHeadH). Diperiksa keberadaannya: dihapus saat kalah, dan
     satu throw di update() mematikan loop. */
  var headY = b.y - (this.bossHeadH || 133);
  if (this.bossHpBg) this.bossHpBg.setPosition(b.x, headY);
  if (this.bossHpFill) {
    this.bossHpFill.setPosition(b.x - 45, headY);
    this.bossHpFill.width = 90 * Math.max(0, this.bossHp / 12);
  }

  /* ---- KONTAK: injak = damage (dari atas), samping = pemain terluka ----
     Persis retromario: stomp hanya sah kalau pemain SEDANG JATUH dan
     mendarat di kepala bos. Tidak ada aba-aba, tidak ada jendela — asal
     dari atas, kena. */
  var p = this.player;
  /* Origin bos = KAKI, jadi tubuhnya menempati pita [b.y - headH .. b.y].
     Titik "kepala" (yang harus diinjak) ada di atas pita itu. */
  var headH = this.bossHeadH || 133;
  var headTop = b.y - headH;
  var overlapX = Math.abs(p.x - b.x) < 42;
  var overlapY = (p.y > headTop - 24) && (p.y < b.y);   /* tubuh pemain menembus pita bos */
  if (p && !p.dying && overlapX && overlapY) {
    /* Injak sah kalau pemain SEDANG JATUH dan berada di paruh ATAS bos
       (dekat kepala), bukan menabrak dari samping/bawah. */
    var stomp = p.body.velocity.y > 0 && (p.y < headTop + headH * 0.45);
    if (stomp) {
      this.hitBoss();
      p.body.velocity.y = -PHYS.JUMP_VELOCITY * 0.85;
    } else {
      this.hurtPlayer(b);
    }
  }

  /* ---- FASE dari sisa HP ---- */
  var ph = this.bossHp > 8 ? 1 : this.bossHp > 4 ? 2 : 3;
  if (ph !== this.bossPhase) {
    this.bossPhase = ph;
    /* Ganti tekstur fase HANYA kalau key-nya ada. Riset Phaser 3.80.1:
       setTexture ke key yang hilang / ber-frame __BASE 0x0 membuat sprite
       tak tergambar sama sekali (bos "ilang"). Kalau key fase tak ada,
       pertahankan tekstur sekarang daripada mengosongkan bos. */
    var pkey = 't_boss' + ph;
    if (this.textures.exists(pkey)) {
      b.setTexture(pkey);
      /* setTexture bisa menyetel ulang alpha/visible pada sebagian jalur —
         kembalikan segera supaya bos tak berkedip hilang saat pindah fase. */
      b.setVisible(true);
      if (!(b.alpha > 0)) b.setAlpha(1);
    }
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.shake(300, 0.02);
    toast('BOS FASE ' + ph + '!', 'warn', 1100);
  }
};

/* Satu kali damage ke bos. Dijaga oleh invulnMs (bukan jendela rentan):
   selama masih kebal sesudah kena, hit berikutnya diabaikan — supaya satu
   tembakan atau satu injakan tidak menghabiskan beberapa HP sekaligus.
   Aturannya persis retromario (invuln ~0,67 dtk). */
var BOSS_INVULN_MS = 650;
var BOSS_FLASH_MS = 200;

GameScene.prototype.hitBoss = function () {
  var b = this.boss;
  if (!b || this.bossHp <= 0 || (b.invulnMs && b.invulnMs > 0)) return;
  this.bossHp--;
  /* KEDIP KENA lewat PENGHITUNG FRAME, bukan tween.
     ---------------------------------------------------------------------
     BUG YANG DIPERBAIKI (dilaporkan berulang: "karakter boss masih hilang
     ketika di tembak"). Versi tween menyetel alpha bolak-balik lalu
     mengandalkan callback untuk memulihkannya; dua tween yang tumpang
     tindih (mudah terjadi saat menembak cepat) saling menimpa dan
     meninggalkan bos separuh transparan — praktis hilang.

     Sekarang tidak ada tween DAN tidak ada tint. invulnMs & flashMs
     adalah penghitung yang DITURUNKAN di updateBoss tiap frame; ALPHA
     dihitung ULANG dari penghitung itu tiap frame, dan saat keduanya nol,
     updateBoss memaksa setAlpha(1). Tidak ada keadaan yang bisa
     tersangkut karena tidak ada yang menjadwalkan nilai ke masa depan —
     semuanya diturunkan dari penghitung yang pasti menuju nol. */
  b.invulnMs = BOSS_INVULN_MS;
  b.flashMs = BOSS_FLASH_MS;
  b.setAlpha(1);                    /* mulai kedip dari keadaan terlihat penuh */
  sfx('bosshit');
  /* Percikan putih di titik kena — umpan balik "pukulan" yang jelas &
     portabel (jalur yang sama dengan juiceStomp, terbukti bekerja di
     canvas maupun webgl). Menggantikan kedip tint yang tidak jalan di
     renderer canvas. */
  /* Bungkus try/catch: kalau pembuatan/ledakan partikel melempar (mis. frame
     __BASE t_spark bermasalah di renderer tertentu), lemparan itu MENGHENTIKAN
     sisa tick — meninggalkan bos dengan state separuh & tak digambar lagi.
     Efek kosmetik tak boleh sampai mematikan logika bos. */
  try {
    if (this.textures.exists('t_spark')) {
      var em = this.add.particles(b.x, b.y - (this.bossHeadH || 133) * 0.5, 't_spark', {
        speed: { min: 60, max: 180 }, lifespan: 380, quantity: 10,
        scale: { start: 1, end: 0 }, blendMode: 'ADD', emitting: false
      });
      em.setDepth(52);
      em.explode(10);
      this.time.delayedCall(500, function () { try { em.destroy(); } catch (e) {} });
    }
  } catch (e) {}
  try {
    this.cameras.main.shake(140, 0.012);
    this.cameras.main.flash(40, 255, 255, 255);
  } catch (e) {}
  this.addScore(100);
  if (this.bossHp <= 0) this.defeatBoss();
};

GameScene.prototype.defeatBoss = function () {
  var self = this, b = this.boss;
  this.bossActive = false;   /* HARUS lebih dulu: kontak & peluru membacanya
                                sebagai tanda berhenti */
  /* Bar HP DIHAPUS, bukan disembunyikan — yang disembunyikan masih bisa
     dimunculkan lagi oleh kode yang berjalan belakangan; dihapus tidak. */
  if (this.bossHpBg) { this.bossHpBg.destroy(); this.bossHpBg = null; }
  if (this.bossHpFill) { this.bossHpFill.destroy(); this.bossHpFill = null; }
  /* Model baru tidak punya lagi jendela rentan, tint, label, cincin, atau
     tween kedip yang perlu dibersihkan. Cukup pastikan bos terlihat penuh
     sebelum animasi lenyap. */
  b.setAlpha(1);
  b.setScale(1);
  this.cameras.main.shake(600, 0.03);
  this.cameras.main.flash(200, 255, 255, 255);
  sfx('fanfare');

  /* GERBANG DIBUKA: pemain kini boleh maju ke bendera. Kamera dilepas ke
     seluruh panjang level supaya bisa mengikuti pemain berjalan ke ujung.
     (Model baru: bos dulu, baru bendera — mempelai TIDAK dipindah ke
     pemain; pemain yang menghampiri mempelai di ujung.) */
  this.bossGateX = null;
  this.cameras.main.setBounds(0, 0, this.L.len, BH);

  this.tweens.add({
    targets: b, alpha: 0, scaleX: 1.4, scaleY: 1.4, angle: 180, duration: 900,
    onComplete: function () { try { b.destroy(); } catch (e) {} self.boss = null; }
  });

  fireworks();
  if (this.stageIdx + 1 > STORE.maxStage) { STORE.maxStage = STAGES.length; saveStore(); }
  announceCompleted();
};


/* =====================================================================
   [10] HUD & INIT
   ===================================================================== */
function updateHud() {
  if (!STORE) return;
  var sc = document.getElementById('pwr-score');
  var st = document.getElementById('pwr-stage-num');
  var tt = document.getElementById('pwr-stage-total');
  var ch = document.getElementById('pwr-powerup-chip');
  if (sc) sc.textContent = String(runState ? runState.score : 0).padStart(6, '0');
  if (st) st.textContent = String((runState ? runState.stage : 0) + 1);
  if (tt) tt.textContent = String(STAGES.length);
  if (ch) {
    var pu = runState && runState.powerup;
    ch.textContent = pu === 'cincin' ? '💍 KEBAL'
                   : pu === 'payung' ? '☂️ RINGAN'
                   : pu === 'buket'  ? '💐 TEMBAK'
                   : '—';
  }
  updatePieceCount();
}

/* Countdown panel kanan — dihitung SENDIRI dari wedding_date_iso.
   Sengaja tidak memakai {{countdown_*}}: variabel itu membawa id tm-countdown-*
   yang hanya boleh muncul SEKALI di dokumen (host meng-update via query tunggal).
   ID host tetap dipakai di #inv-source, panel kanan pakai jalur mandiri ini. */
function startSideCountdown() {
  var wrap = document.querySelector('[data-side-countdown]');
  if (!wrap) return;
  var iso = (wrap.getAttribute('data-target') || '').trim();
  if (!iso || iso.indexOf('{{') === 0) return;
  var target = new Date(iso + 'T00:00:00').getTime();
  if (isNaN(target)) return;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = Math.max(0, target - Date.now());
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    var map = { d: d, h: pad(h), m: pad(m), s: pad(s) };
    for (var k in map) {
      var el = wrap.querySelector('[data-cd="' + k + '"]');
      if (el) el.textContent = String(map[k]);
    }
  }
  tick();
  var iv = setInterval(tick, 1000);
  onCleanup(function () { clearInterval(iv); });
}

/* Canvas couple di panel kanan (Canvas 2D biasa, BUKAN Phaser) */
function drawCoupleCanvas() {
  var cv = document.getElementById('pwr-couple');
  if (!cv || !cv.getContext) return;
  var ctx = null;
  try { ctx = cv.getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx) return;                 /* canvas tak tersedia -> lewati, jangan crash */
  var W = cv.width, H = cv.height;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  /* Langit senja */
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ff9a5c'); g.addColorStop(0.55, '#c86a8c'); g.addColorStop(1, '#7a4a8c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  /* Matahari — kotak bertangga, BUKAN arc (biar konsisten pixel art) */
  (function sunPx() {
    var sx = W * 0.74, sy = H * 0.34, r = 46, st = 8;
    ctx.fillStyle = '#ffd34d';
    for (var yy = -r; yy < r; yy += st) {
      var half = Math.round(Math.sqrt(Math.max(0, r * r - yy * yy)) / st) * st;
      ctx.fillRect(sx - half, sy + yy, half * 2, st);
    }
  })();

  /* Bukit — tangga piksel, bukan segitiga mulus */
  function hillPx(cx, baseY, peakH, color, step) {
    ctx.fillStyle = color;
    var steps = Math.round(peakH / step);
    for (var s = 0; s < steps; s++) {
      var wHalf = (steps - s) * step * 1.5;
      ctx.fillRect(cx - wHalf, baseY - s * step, wHalf * 2, step);
    }
  }
  hillPx(W * 0.24, H * 0.72, H * 0.28, '#6a3a7a', 10);
  hillPx(W * 0.64, H * 0.72, H * 0.32, '#5a2f6a', 10);

  /* Tanah */
  ctx.fillStyle = '#3a8c2e'; ctx.fillRect(0, H * 0.72, W, H * 0.10);
  ctx.fillStyle = '#c8763c'; ctx.fillRect(0, H * 0.80, W, H * 0.20);

  /* Blok & pipa (vibe game) */
  function blk(x, y, s, c1, c2) {
    ctx.fillStyle = c1; ctx.fillRect(x, y, s, s);
    ctx.fillStyle = c2; ctx.fillRect(x, y, s, s * 0.24);
    ctx.strokeStyle = '#1a1228'; ctx.lineWidth = 2; ctx.strokeRect(x, y, s, s);
  }
  blk(70, H * 0.50, 34, '#f0c020', '#ffe870');
  blk(104, H * 0.50, 34, '#c05a2c', '#e08050');
  ctx.fillStyle = '#3aa83a'; ctx.fillRect(W - 110, H * 0.56, 62, H * 0.24);
  ctx.fillStyle = '#6ed86e'; ctx.fillRect(W - 110, H * 0.56, 62, 14);
  ctx.strokeStyle = '#1a1228'; ctx.lineWidth = 2; ctx.strokeRect(W - 110, H * 0.56, 62, H * 0.24);

  /* Mempelai (skala besar, pixel chunky) */
  var s = 4.2, bx = W * 0.36, by = H * 0.72;
  function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(bx + x * s, by - (y + h) * s, w * s, h * s); }

  /* Pria */
  px(-6, 0, 3, 7, '#16161f'); px(-2, 0, 3, 7, '#16161f');
  px(-7, 6, 9, 9, '#2a2a3e');
  px(-4, 7, 2, 6, '#fdfdfd'); px(-3.4, 8, 1, 4, '#e85888');
  px(-5, 14, 7, 7, '#f0c8a0');
  px(-5, 19, 7, 3, '#2b1d12');
  px(-3.6, 16.4, 1.2, 1.2, '#1a1228'); px(-0.8, 16.4, 1.2, 1.2, '#1a1228');

  /* Wanita */
  px(3, 0, 11, 8, '#fdfdfd');
  px(5, 7, 7, 8, '#fdfdfd');
  px(6, 14, 7, 7, '#f0c8a0');
  px(5.4, 18, 8, 4, '#f4f4ff');
  px(7.4, 16.4, 1.2, 1.2, '#1a1228'); px(10.2, 16.4, 1.2, 1.2, '#1a1228');
  /* Buket — kotak piksel */
  ctx.fillStyle = '#e85888';
  ctx.fillRect(bx + 13.6 * s, by - 11 * s, 3 * s, 2 * s);
  ctx.fillRect(bx + 13 * s, by - 9 * s, 4 * s, 2 * s);
  ctx.fillStyle = '#3a8c2e';
  ctx.fillRect(bx + 14.4 * s, by - 7 * s, 1.2 * s, 4 * s);

  /* Hati melayang — disusun dari kotak (pixel-art heart), bukan arc */
  function heart(cx, cy, r, c) {
    ctx.fillStyle = c;
    var u = Math.max(2, Math.round(r / 3));   /* 1 piksel besar */
    var map = [
      '.XX.XX.',
      'XXXXXXX',
      'XXXXXXX',
      '.XXXXX.',
      '..XXX..',
      '...X...'
    ];
    for (var y = 0; y < map.length; y++) {
      for (var x = 0; x < map[y].length; x++) {
        if (map[y].charAt(x) === 'X') {
          ctx.fillRect(cx - 3.5 * u + x * u, cy - 3 * u + y * u, u, u);
        }
      }
    }
  }
  heart(W * 0.47, H * 0.30, 13, '#e85888');
  heart(W * 0.55, H * 0.19, 8, '#ff90b8');
  heart(W * 0.40, H * 0.17, 6, '#ffd34d');

  /* Banner */
  ctx.fillStyle = '#241c38';
  ctx.fillRect(W * 0.28, 14, W * 0.44, 32);
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.28, 14, W * 0.44, 32);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 17px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('JUST MARRIED', W * 0.5, 36);
}

/* Idempoten — aman dipanggil berkali-kali (re-inject) */
function startWhenReady() {
  STORE = loadStore();
  INFOS = scanSections();
  QUOTA = scaleQuota(INFOS.length);
  runState = runState || freshRun();

  /* Tiap langkah dibungkus: satu kegagalan (mis. canvas tak tersedia di
     browser tertentu) TIDAK boleh menggagalkan seluruh init. */
  try { rebuildIndicators(); } catch (e) {}
  try { updateHud(); } catch (e) {}
  /* Ikon efek suara mengikuti STORE. WAJIB di sini, bukan cuma saat
     tombolnya diklik: host bisa menulis ulang innerHTML tema (re-inject),
     dan tombol yang baru selalu lahir dengan 🔊 dari HTML — kalau tidak
     disinkronkan, pemain yang sudah membisukan akan melihat ikon "nyala"
     padahal suaranya bisu. startWhenReady() memang idempoten & dipanggil
     lagi tiap re-inject, jadi ini titik yang tepat. */
  try { syncSfxIcon(); } catch (e) {}
  try { drawCoupleCanvas(); } catch (e) {}
  try { startSideCountdown(); } catch (e) {}

  /* Sinkronkan picker kesulitan dengan STORE */
  var opts = document.querySelectorAll('.pwr-diff-opt');
  for (var i = 0; i < opts.length; i++) {
    opts[i].classList.toggle('is-sel', opts[i].getAttribute('data-diff') === STORE.diff);
  }

  /* Mirror ikon musik berkala (host yang menulis ikon aslinya) */
  var mi = setInterval(syncMusicIcon, 900);
  onCleanup(function () { clearInterval(mi); });

  /* Self-heal: host bisa mengganti innerHTML -> canvas detached.
     Cek berkala, BUKAN MutationObserver (terbukti merusak di retromario). */
  var heal = setInterval(function () {
    if (window.__pwrStarted && GAME && !gameStageAttached()) rebootGame();
  }, 1500);
  onCleanup(function () { clearInterval(heal); });

  ensurePhaser(function () {
    if (!window.Phaser) return;
    /* AUTO-RESUME: lanjutkan HANYA kalau cover/reveal TIDAK tampil.
       Kalau tidak dicek, re-exec saat isOpened flip akan menarik pemain
       keluar dari PRESS START. */
    if (window.__pwrStarted && !isOverlayVisible('cover') && !anyOverlayOpen()) {
      bootGame();
      var sc = currentScene();
      if (sc) { try { sc.scene.restart({ stage: runState.stage }); } catch (e) {} }
    } else if (!window.__pwrStarted) {
      showOverlay('cover');
    }
  });
}

/* Boot.
   Host meng-inject <script> ini SETELAH HTML tema ter-render, jadi umumnya
   readyState sudah 'interactive'/'complete' dan kita bisa langsung jalan.
   Menunggu DOMContentLoaded saja BERBAHAYA: kalau event itu sudah lewat,
   listener tak pernah terpanggil dan tema mati diam-diam (INFOS kosong,
   indikator tak terbangun). Karena itu: jalan sekarang bila DOM sudah siap,
   dan tetap pasang listener sebagai cadangan bila belum. */
(function bootThemeInit() {
  var ran = false;
  function go() {
    if (ran) return;
    ran = true;
    try { startWhenReady(); } catch (e) {
      showError('Tema gagal dimuat: ' + (e && e.message ? e.message : e));
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go, { once: true });
    /* Jaring pengaman kalau event terlewat karena timing injeksi host */
    var t = setTimeout(go, 1200);
    onCleanup(function () { clearTimeout(t); });
  } else {
    go();
  }
})();
