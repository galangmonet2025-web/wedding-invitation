/* AUDIT MENYELURUH: ganti sprite TIAP objek satu per satu, lalu periksa
   apakah tekstur yang dipakai game BENAR-BENAR berubah.

   Ini menirukan persis yang dilakukan user di dialog: pilih objek ->
   pilih sprite pengganti -> Terapkan. Yang diperiksa bukan flag atau
   nama key, tapi KOORDINAT POTONGAN SHEET yang tergambar ke kanvas
   tekstur. Kalau koordinatnya tidak berubah, berarti objek itu "sudah
   diganti tapi tampilannya tetap" — keluhan user. */
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

/* Kanvas yang mencatat potongan sheet apa yang digambar ke tiap tekstur */
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

const textures = {};
const scene = {
  textures: {
    exists: k => !!textures[k],
    addCanvas: (k, cv) => { textures[k] = cv; },
    get: k => textures[k],
    remove: k => { delete textures[k]; },
    getTextureKeys: () => Object.keys(textures)
  },
  anims: { exists: () => false, create(){}, remove(){}, get: () => null }
};

/* assetToTexture memakai newCanvas(); tandai key yang sedang digambar */
const origATT = w.assetToTexture;
w.assetToTexture = function (sc, m) {
  curKey = m.key;
  const r = origATT.call(w, sc, m);
  curKey = null;
  return r;
};

/* Potongan sheet yang tergambar untuk sebuah key (x,y sumber). */
function cropOf(key) {
  const d = drawLog[key];
  if (!d || !d.length) return null;
  return d[0][1] + ',' + d[0][2];
}

/* Bangun ulang SEMUA tekstur dari nol, seperti create() melakukannya. */
function rebuildAll() {
  Object.keys(textures).forEach(k => delete textures[k]);
  Object.keys(drawLog).forEach(k => delete drawLog[k]);
  w.applySheetTextures(scene);
}

rebuildAll();

/* Kelompok pengganti yang pasti BEDA dari apa pun yang dipakai sekarang */
const ALT = 'Traps/Saw/On';
const altFrame = w.SHEET_MAP[ALT][0];
const altCrop = altFrame[1] + ',' + altFrame[2];

/* ---- Uji tiap entri berlabel ---- */
const labelled = w.ASSET_MAP.filter(m => m.label);
const broken = [];
const perStageBroken = [];

labelled.forEach(m => {
  const slot = w.slotOfKey(m.key);
  /* set penggantian sesuai jenisnya (slot menang atas per-key) */
  if (slot) w.SWAP_ANIM[slot.id] = [{ grp: ALT, f: 0 }];
  else w.SWAP[m.key] = { grp: ALT, f: 0 };

  rebuildAll();

  /* kunci yang BENAR-BENAR dipakai game untuk objek ini */
  const key = m.key;
  const got = cropOf(key);
  if (got !== altCrop) broken.push({ key, label: m.label, got, want: altCrop });

  /* objek per-stage: kunci "_sN" itulah yang dipakai menggambar */
  if (m.stages) {
    for (let s = 0; s < w.STAGES.length; s++) {
      const sk = key + '_s' + s;
      if (cropOf(sk) !== altCrop) {
        perStageBroken.push(sk + ' (' + m.label + ')');
        break;
      }
    }
  }

  if (slot) delete w.SWAP_ANIM[slot.id]; else delete w.SWAP[m.key];
});

console.log('Objek berlabel diuji : ' + labelled.length);
console.log('Tidak ikut berubah   : ' + broken.length);
if (broken.length) {
  console.log('\nOBJEK YANG "DIGANTI TAPI TAMPILAN TIDAK BERUBAH":');
  broken.forEach(b => console.log('  - ' + b.key + '  [' + b.label + ']' +
    '  potongan=' + (b.got || 'TIDAK DIGAMBAR')));
}
if (perStageBroken.length) {
  console.log('\nPER-STAGE TIDAK IKUT BERUBAH:');
  perStageBroken.forEach(k => console.log('  - ' + k));
}
console.log('');

ok(broken.length === 0,
   'semua objek berubah tampilannya saat sprite-nya diganti' +
   (broken.length ? ' -> ' + broken.length + ' gagal' : ''));
ok(perStageBroken.length === 0,
   'objek per-stage ikut berubah di SEMUA stage' +
   (perStageBroken.length ? ' -> ' + perStageBroken.join(', ') : ''));

/* ---- baseKeyOf(): jangan salah potong kunci yang MEMANG berakhiran _sN ----
   't_gr_s0' & 't_gr_top_s0' itu kunci sungguhan (tanah per-stage), bukan
   salinan. Memotongnya jadi 't_gr' akan menghapus pilihan user. */
ok(w.baseKeyOf('t_bush_s3') === 't_bush',
   'salinan per-stage dipetakan ke kunci dasar (t_bush_s3 -> t_bush)');
ok(w.baseKeyOf('t_gr_s0') === 't_gr_s0',
   't_gr_s0 TIDAK dipotong (itu kunci asli, bukan salinan)');
ok(w.baseKeyOf('t_gr_top_s0') === 't_gr_top_s0',
   't_gr_top_s0 TIDAK dipotong');
ok(w.baseKeyOf('t_plat_l') === 't_plat_l', 't_plat_l utuh');
ok(w.baseKeyOf('t_e1_0') === 't_e1_0', 't_e1_0 utuh');

/* ---- SETELAN ukuran/geser juga merambat ke salinan per-stage ---- */
w.SCALE['t_bush'] = 0.5;
ok(Math.abs(w.scaleOf('t_bush_s2') - 0.5) < 1e-9,
   'slider ukuran dekorasi berlaku juga di kunci per-stage (' +
   w.scaleOf('t_bush_s2') + ')');
w.NUDGE['t_bush'] = -7;
ok(w.nudgeOf('t_bush_s2') === -7,
   'slider naik/turun dekorasi berlaku juga di kunci per-stage');
delete w.SCALE['t_bush']; delete w.NUDGE['t_bush'];
/* tanah per-stage tetap punya setelan SENDIRI-SENDIRI */
w.SCALE['t_gr_s0'] = 0.7;
ok(w.scaleOf('t_gr_s1') === 1,
   'tanah stage 1 & 2 tetap terpisah (bukan ikut-ikutan)');
delete w.SCALE['t_gr_s0'];

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
