/* Uji: GANTI SPRITE tidak melempar pemain ke awal stage.

   Permintaan user: "saat ganti sprite lalu klik terapkan, jangan buat
   gamenya ulang dari awal. Kalau memang butuh render ulang, mundurin
   aja karakternya beberapa langkah ke belakang seperti re-spawn ketika
   mati. Atau lebih bagus lagi kalau bisa langsung keganti saat itu juga."

   Jadi ada DUA tingkat yang diuji:
     1. ganti gambar saja  -> LIVE, tidak ada restart sama sekali;
     2. ganti UKURAN       -> stage dimuat ulang (hitbox ikut ukuran
                              tekstur, tidak bisa dihindari) TAPI dengan
                              resumeX, bukan dari x=90.
*/
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
w.HTMLCanvasElement.prototype.getContext = () => ({
  imageSmoothingEnabled: true, drawImage(){}, fillRect(){}, clearRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){} });
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

/* ---- scene tiruan yang MENCATAT argumen restart ---- */
const textures = {};
function makeTex(k, ww, hh) {
  textures[k] = { source: [{ width: ww, height: hh, image: { getContext: () => ({
    clearRect(){}, drawImage(){}, save(){}, restore(){}, translate(){},
    imageSmoothingEnabled: false }) }, update(){} }], refresh(){} };
}
const anims = {};
let restartArgs = null, restartCount = 0;
const scene = {
  sys: { isActive: () => true },
  player: { x: 4200, y: 500 },
  textures: {
    exists: k => !!textures[k], get: k => textures[k],
    addCanvas: (k, cv) => makeTex(k, cv.width || 32, cv.height || 32),
    remove: k => { delete textures[k]; },
    getTextureKeys: () => Object.keys(textures)
  },
  anims: { exists: k => !!anims[k], get: k => anims[k],
           create: c => (anims[c.key] = c), remove: k => { delete anims[k]; } },
  physics: { world: { gravity: { y: 0 } } },
  scene: {
    isPaused: () => false, resume: () => {},
    restart: (arg) => { restartCount++; restartArgs = arg; }
  }
};
w.GAME = { scene: { getScene: k => (k === 'GameScene' ? scene : null) } };

w.ASSET_MAP.forEach(m => { const s = w.sizeOf(m); makeTex(m.key, s.w, s.h); });
w.ANIM_SLOTS.forEach(sl => {
  const ks = w.slotActiveKeys(sl);
  for (let j = sl.keys.length; j < ks.length; j++) {
    const ex = w.extraEntryFor(sl, ks[j], j);
    if (ex) { const s = w.sizeOf(ex); makeTex(ks[j], s.w, s.h); }
  }
  const nm = w.slotAnimName(sl.id);
  if (nm) anims[nm] = { key: nm, frames: ks.map(k => ({ key: k })) };
});

/* Permainan dianggap sedang berjalan (ada runState), kalau tidak
   applySwap() akan mengambil jalur rebootGame() dan bukan itu yang diuji. */
w.ensureBooted();
w.runState.stage = 2;

/* ---- 1. resumeXOf membaca posisi pemain ---- */
ok(w.resumeXOf(scene) === 4200, 'resumeXOf() membaca posisi pemain (4200)');
ok(w.resumeXOf(null) === null, 'tanpa scene -> null (bukan exception)');
ok(w.resumeXOf({}) === null, 'scene tanpa pemain -> null');

/* ---- 2. GANTI GAMBAR SAJA -> live, TANPA restart ---- */
restartCount = 0; restartArgs = null;
w.SWAP['t_e1_0'] = { grp: 'Items/Fruits/Kiwi', f: 0 };
w.applySwap();
ok(restartCount === 0,
   'ganti gambar (ukuran sama): TIDAK ada restart sama sekali (' +
   restartCount + ')');
const note1 = w.document.getElementById('pwr-swap-note');
ok(note1 && /langsung/i.test(note1.textContent),
   'pesannya menyebut diterapkan langsung ("' +
   (note1 ? note1.textContent : '') + '")');
delete w.SWAP['t_e1_0'];

/* ---- 3. GANTI UKURAN -> restart TAPI membawa resumeX ---- */
restartCount = 0; restartArgs = null;
w.SCALE['t_e1_0'] = 0.5;
w.applySwap();
ok(restartCount === 1, 'ganti ukuran: stage dimuat ulang sekali');
ok(restartArgs && typeof restartArgs.resumeX === 'number',
   'restart membawa resumeX (bukan mulai dari awal)');
ok(restartArgs && restartArgs.resumeX === 4200,
   'resumeX = posisi pemain saat itu (' +
   (restartArgs ? restartArgs.resumeX : '-') + ')');
ok(restartArgs && typeof restartArgs.stage === 'number',
   'stage yang sama ikut dibawa (tidak balik ke stage 1)');
const note2 = w.document.getElementById('pwr-swap-note');
ok(note2 && /dilanjutkan|titik terakhir/i.test(note2.textContent),
   'pesannya jujur bahwa permainan dilanjutkan ("' +
   (note2 ? note2.textContent : '') + '")');
delete w.SCALE['t_e1_0'];

/* ---- 4. init() menerima & menyimpan resumeX ---- */
const initBody = js.slice(js.indexOf('GameScene.prototype.init = function'),
                          js.indexOf('GameScene.prototype.init = function') + 900);
ok(/this\.resumeX/.test(initBody), 'init() menyimpan data.resumeX');
ok(/typeof data\.resumeX === 'number'/.test(initBody),
   'resumeX divalidasi sbg angka (data restart bisa kosong)');
ok(/this\.resumeX = .*: null/.test(initBody),
   'tanpa resumeX -> null, jadi mulai normal dari awal stage');

/* ---- 5. create() memakainya dgn titik AMAN, bukan mentah ---- */
/* BADAN create() SEUTUHNYA, bukan potongan 12000 karakter.
   Jendela tetap itu rapuh: create() bertambah panjang (kini ~45.000
   karakter) dan potongan yang dicari kebetulan duduk di sekitar 12.100
   -> tes gagal PALSU walau kodenya utuh. Batas yang benar adalah
   pernyataan GameScene.prototype berikutnya. */
const _cStart = js.indexOf('GameScene.prototype.create = function');
const _cEnd = js.indexOf('\nGameScene.prototype.', _cStart + 10);
const createBody = js.slice(_cStart, _cEnd < 0 ? js.length : _cEnd);
ok(/if \(this\.resumeX != null\)/.test(createBody),
   'create() memakai resumeX kalau ada');
ok(/findSafeRespawn/.test(createBody),
   'posisinya dicari lewat findSafeRespawn() — sama seperti respawn saat ' +
   'jatuh, supaya tidak muncul di dalam blok atau di atas jurang');
ok(/freezeEnemiesNear/.test(createBody),
   'musuh di sekitar titik muncul dibekukan sesaat (anti tabrak langsung)');
ok(/invuln = 900|invuln = \d+/.test(createBody),
   'diberi kebal sesaat sesudah muncul');
ok(/cam\.centerOn/.test(createBody),
   'kamera dipatok ke titik itu (kalau tidak, terlihat menyapu dari awal)');

/* ---- 6. applyTuner juga membawa resumeX ---- */
const tunerBody = js.slice(js.indexOf('function applyTuner'),
                           js.indexOf('function applyTuner') + 1400);
ok(/resumeX: resumeXOf\(sc\)/.test(tunerBody),
   'applyTuner() (slider fisika) juga melanjutkan dari posisi terakhir');

/* ---- 7. resumeX dijepit ke dalam batas level ---- */
ok(/Math\.max\(90, Math\.min\(this\.resumeX, L\.len - 120\)\)/.test(createBody),
   'resumeX dijepit ke dalam panjang level (nilai liar tidak menembus batas)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
