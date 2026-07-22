/* Uji WUJUD PEMAIN per POWER-UP + setelan ukuran/geser PER RANGKA.

   Yang diuji bukan "fungsinya ada", tapi bahwa tekstur yang dipasang
   benar-benar MEMOTONG BAGIAN SHEET YANG BERBEDA — kalau cuma memeriksa
   nama key, salah pemetaan kelompok tidak akan ketahuan. */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const P = require('./assets/png.cjs');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sheet = P.readPNG('assets/sprite-sheet.png');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;

/* Catat potongan sheet yang digambar ke tiap tekstur. */
const drawLog = {};
let curKey = null;
w.HTMLCanvasElement.prototype.getContext = function () {
  return {
    imageSmoothingEnabled: true,
    drawImage: (...a) => { if (curKey) (drawLog[curKey] = drawLog[curKey] || []).push(a); },
    clearRect: () => { if (curKey) drawLog[curKey] = []; },
    getImageData: (x, y, a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }),
    fillRect(){}, fillText(){}, save(){}, restore(){}, translate(){}, scale(){},
    beginPath(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){},
    arc(){}, rect(){}
  };
};
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

/* ---- scene tiruan yang mencatat tekstur & animasi ---- */
const added = {}, anims = {};
const scene = {
  textures: {
    exists: k => !!added[k],
    addCanvas: (k, cv) => { added[k] = cv; },
    get: k => added[k],
    remove: k => { delete added[k]; }
  },
  anims: {
    exists: n => !!anims[n],
    get: n => anims[n],
    create: cfg => { anims[cfg.key] = { key: cfg.key, frames: cfg.frames }; },
    remove: n => { delete anims[n]; },
    generateFrameNumbers: () => []
  },
  /* makeArtTexture() menggambar art prosedural lewat Graphics.
     Distub supaya buildTextures() bisa jalan — yang diuji di sini
     animasinya, bukan gambar proseduralnya. */
  make: {
    graphics: () => {
      const g = {
        fillStyle: () => g, fillRect: () => g, clear: () => g,
        lineStyle: () => g, strokeRect: () => g, beginPath: () => g,
        closePath: () => g, fillPath: () => g, strokePath: () => g,
        moveTo: () => g, lineTo: () => g, fillCircle: () => g,
        fillTriangle: () => g, destroy: () => g,
        generateTexture: (k) => { added[k] = { width: 1, height: 1 }; return g; }
      };
      return g;
    }
  }
};
/* assetToTexture memakai newCanvas(); tandai key yang sedang digambar */
const origATT = w.assetToTexture;
w.assetToTexture = function (sc, m) {
  curKey = m.key;
  const r = origATT.call(w, sc, m);
  curKey = null;
  return r;
};

/* ================= 1. PETA WUJUD ================= */
const SK = w.PW_SKIN;
ok(SK && Object.keys(SK).length === 3, 'ada 3 wujud power-up (dapat ' +
   (SK ? Object.keys(SK).length : 0) + ')');
ok(SK.besar && SK.cincin && SK.payung, 'melati(besar)/cincin/payung punya wujud');
const chars = Object.keys(SK).map(k => SK[k]);
ok(new Set(chars).size === 3, 'ketiganya tokoh BERBEDA (' + chars.join(', ') + ')');
ok(!chars.includes(w.PLAYER_BASE_CHAR),
   'tak ada yang memakai tokoh dasar "' + w.PLAYER_BASE_CHAR + '"');

/* tokoh yang dipakai memang ADA di sheet, untuk SEMUA state pemain */
const STATES = ['Idle', 'Run', 'Jump', 'Fall', 'Hit'];
let missing = [];
chars.concat([w.PLAYER_BASE_CHAR]).forEach(c => {
  STATES.forEach(s => {
    if (!w.SHEET_MAP['Main Characters/' + c + '/' + s]) missing.push(c + '/' + s);
  });
});
ok(missing.length === 0, 'semua tokoh punya kelima state di sheet' +
   (missing.length ? ' -> KURANG: ' + missing.join(', ') : ''));

/* jumlah rangka tiap state SAMA antar tokoh -> nomor rangka tetap sah */
let mismatch = [];
STATES.forEach(s => {
  const n0 = w.SHEET_MAP['Main Characters/' + w.PLAYER_BASE_CHAR + '/' + s].length;
  chars.forEach(c => {
    const n = w.SHEET_MAP['Main Characters/' + c + '/' + s].length;
    if (n !== n0) mismatch.push(c + '/' + s + ' ' + n + '!=' + n0);
  });
});
ok(mismatch.length === 0,
   'jumlah rangka tiap state sama antar tokoh (nomor rangka user tetap sah)' +
   (mismatch.length ? ' -> ' + mismatch.join(', ') : ''));

/* ================= 2. skinKey ================= */
ok(w.skinKey('t_groom_run1', w.PLAYER_BASE_CHAR) === 't_groom_run1',
   'tokoh dasar tidak menambah akhiran');
ok(w.skinKey('t_groom_run1', 'Ninja Frog') === 't_groom_run1__pwNinjaFrog',
   'tokoh lain -> key bayangan (' + w.skinKey('t_groom_run1', 'Ninja Frog') + ')');
/* setelan ukuran/geser diambil dari key ASLI */
w.SCALE['t_groom_run1'] = 0.5;
ok(Math.abs(w.scaleOf('t_groom_run1__pwNinjaFrog') - 0.5) < 1e-9,
   'wujud power-up mewarisi SKALA key aslinya (tidak berubah besar)');
w.NUDGE['t_groom_run1'] = -7;
ok(w.nudgeOf('t_groom_run1__pwNinjaFrog') === -7,
   'wujud power-up mewarisi GESERAN key aslinya');
delete w.SCALE['t_groom_run1']; delete w.NUDGE['t_groom_run1'];

/* ================= 3. tekstur wujud benar-benar dibuat ================= */
w.applySheetTextures(scene);
const pKeys = w.playerSkinKeys();
ok(pKeys.length === 9, 'ada 9 rangka pemain (dapat ' + pKeys.length + ')');
let madeAll = true, made = 0;
chars.forEach(c => {
  pKeys.forEach(k => {
    const sk = w.skinKey(k, c);
    if (added[sk]) made++; else madeAll = false;
  });
});
ok(madeAll, 'tekstur wujud dibuat untuk semua rangka x semua tokoh (' +
   made + '/' + (pKeys.length * chars.length) + ')');

/* POTONGANNYA BEDA — ini yang membuktikan tokohnya benar-benar lain,
   bukan cuma key baru berisi gambar yang sama. */
function crop(key) {
  const d = drawLog[key];
  return d && d.length ? d[0].slice(1, 5).join(',') : null;
}
let sameCrop = [];
pKeys.forEach(k => {
  const base = crop(k);
  chars.forEach(c => {
    const s = crop(w.skinKey(k, c));
    if (base && s && base === s) sameCrop.push(k + '/' + c);
  });
});
ok(sameCrop.length === 0,
   'tiap wujud memotong bagian sheet BERBEDA dari tokoh dasar' +
   (sameCrop.length ? ' -> SAMA: ' + sameCrop.slice(0, 4).join(', ') : ''));

/* ukurannya sama -> hitbox pemain tidak berubah saat power-up menyala */
let szBad = [];
pKeys.forEach(k => {
  chars.forEach(c => {
    const a = added[k], b = added[w.skinKey(k, c)];
    if (a && b && (a.width !== b.width || a.height !== b.height)) szBad.push(k + '/' + c);
  });
});
ok(szBad.length === 0,
   'wujud power-up SEUKURAN tokoh dasar (hitbox tidak berubah)' +
   (szBad.length ? ' -> ' + szBad.join(', ') : ''));

/* ================= 4. currentPlayerChar mengikuti state ================= */
w.runState = w.freshRun();
ok(w.currentPlayerChar() === w.PLAYER_BASE_CHAR, 'awal: tokoh dasar');
w.runState.powerup = 'cincin';
ok(w.currentPlayerChar() === SK.cincin, 'cincin -> ' + SK.cincin);
w.runState.powerup = 'payung';
ok(w.currentPlayerChar() === SK.payung, 'payung -> ' + SK.payung);
w.runState.powerup = null;
ok(w.currentPlayerChar() === w.PLAYER_BASE_CHAR, 'power-up habis -> tokoh dasar');
/* melati = mode besar, bukan power-up berdurasi */
w._playerMode = 'besar';
ok(w.currentPlayerChar() === SK.besar, 'mode besar (melati) -> ' + SK.besar);
/* power-up berdurasi menang atas mode besar: efek yang akan HABIS
   harus terlihat, kalau tidak pemain tidak tahu kapan berakhir */
w.runState.powerup = 'cincin';
ok(w.currentPlayerChar() === SK.cincin,
   'cincin menang atas mode besar (efek berdurasi harus terlihat)');
w.runState.powerup = null; w._playerMode = 'dasar';

/* freshRun() menyetel ulang wujud */
w._playerMode = 'besar';
w.runState = w.freshRun();
ok(w.currentPlayerChar() === w.PLAYER_BASE_CHAR,
   'mulai permainan baru -> wujud kembali dasar (tidak bocor antar ronde)');

/* ================= 5. animasi per tokoh terdaftar =================
   Animasi didaftarkan di dalam buildTextures(), bukan fungsi terpisah.
   Tekstur sheet sudah dibuat di atas; buildTextures() tidak menimpanya
   karena assetToTexture()/makeArtTexture() melewati key yang sudah ada. */
w.buildTextures(scene);
const animNames = Object.keys(anims);
const wantAnim = ['groom_idle', 'groom_run'];
wantAnim.forEach(a => {
  ok(anims[a], 'animasi dasar "' + a + '" terdaftar');
  chars.forEach(c => {
    const n = a + '__pw' + c.replace(/[^A-Za-z]/g, '');
    ok(!!anims[n], 'animasi wujud "' + n + '" terdaftar');
  });
});
/* rangka animasi wujud harus memakai key bertokoh, bukan key dasar */
const runPw = anims['groom_run__pw' + SK.cincin.replace(/[^A-Za-z]/g, '')];
if (runPw && runPw.frames) {
  const allSkin = runPw.frames.every(f => /__pw/.test(f.key || ''));
  ok(allSkin, 'animasi wujud memakai rangka bertokoh, bukan tokoh dasar');
} else { ok(false, 'animasi wujud lari tidak punya rangka'); }

/* ================= 6. playSlot memilih animasi bertokoh ================= */
let played = [], texSet = [];
const fakeP = {
  scene: scene, anims: {}, texture: { key: 't_groom_idle0' },
  play: (n) => played.push(n),
  setTexture: (k) => { texSet.push(k); fakeP.texture = { key: k }; },
  body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } }
};
w.runState = w.freshRun();
played = [];
w.playSlot(fakeP, 'player_idle');
ok(played[0] === 'groom_idle', 'tanpa power-up: animasi dasar (' + played[0] + ')');
w.runState.powerup = 'cincin';
played = [];
w.playSlot(fakeP, 'player_idle');
ok(/__pw/.test(played[0] || ''),
   'dengan cincin: animasi bertokoh (' + played[0] + ')');
ok(played[0] === 'groom_idle__pw' + SK.cincin.replace(/[^A-Za-z]/g, ''),
   'tokohnya sesuai power-up yang aktif');
/* slot statis (lompat) -> tukar tekstur, bukan play() */
texSet = []; played = [];
w.playSlot(fakeP, 'player_jump');
ok(texSet.length === 1 && /__pw/.test(texSet[0]),
   'slot statis: tekstur ditukar ke wujud (' + texSet[0] + ')');
/* kembali ke dasar -> tekstur dikembalikan */
w.runState.powerup = null;
texSet = [];
w.playSlot(fakeP, 'player_jump');
ok(texSet.length === 1 && !/__pw/.test(texSet[0]),
   'power-up habis: tekstur statis kembali ke tokoh dasar (' + texSet[0] + ')');

/* ================= 7. takePowerup memanggil refresh ================= */
ok(/refreshPlayerSkin\(p\)/.test(js), 'takePowerup memanggil refreshPlayerSkin');
ok(/refreshPlayerSkin\(p\);\s*\/\* wujud kembali sesuai state \*\//.test(js) ||
   /powerup = null;[\s\S]{0,200}refreshPlayerSkin/.test(js),
   'power-up kedaluwarsa juga memanggil refreshPlayerSkin');
ok(/_playerMode = 'besar'/.test(js) && /_playerMode = 'dasar'/.test(js),
   'mode besar dicatat & dibatalkan saat kena musuh');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
