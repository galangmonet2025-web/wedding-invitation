/* Uji: sprite TIDAK boleh merentang saat dipasang ke tile.

   Keluhan user (dgn screenshot): "saat ubah-ubah sprite, banyak object
   yang ke-stretch / merentang jadi rusak tampilannya. Salah satunya
   background, dan ground."

   Sebabnya: entri ber-'fill:true' (tanah, bata, pijakan, blok ?)
   digambar dgn drawImage(..., 32, 32) yang MEMAKSA sumber apa pun ke
   petak 32x32. Kelompok Terrain berisi 11 rangka non-persegi — ada yang
   48x5 (rasio 9.6:1). Dipaksa jadi 32x32 = coreng, bukan tile.

   Yang diuji: PROPORSI sumber yang benar-benar diambil. Kalau rasio
   potongan sumber != rasio kotak tujuan, berarti gambarnya melar. */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const P = require('./assets/png.cjs');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sheet = P.readPNG('assets/sprite-sheet.png');
const map = JSON.parse(fs.readFileSync('assets/sprite-map.json', 'utf8'));

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;

const drawLog = {};
let curKey = null;
w.HTMLCanvasElement.prototype.getContext = () => ({
  imageSmoothingEnabled: true,
  drawImage: (...a) => { if (curKey) (drawLog[curKey] = drawLog[curKey] || []).push(a); },
  clearRect: () => { if (curKey) drawLog[curKey] = []; },
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillRect(){}, fillText(){}, save(){}, restore(){}, translate(){}, scale(){},
  beginPath(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){},
  arc(){}, rect(){}
});
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

const textures = {};
const scene = {
  textures: { exists: k => !!textures[k], addCanvas: (k, cv) => { textures[k] = cv; },
              get: k => textures[k], remove: k => { delete textures[k]; },
              getTextureKeys: () => Object.keys(textures) },
  anims: { exists: () => false, create(){}, remove(){}, get: () => null }
};
const origATT = w.assetToTexture;
w.assetToTexture = function (sc, m) {
  curKey = m.key; const r = origATT.call(w, sc, m); curKey = null; return r;
};

/* ---- 1. berapa banyak kandidat 'tile' yang non-persegi? ---- */
const tilePats = w.PICK_FILTER.tile;
const tileGroups = Object.keys(w.SHEET_MAP)
  .filter(g => tilePats.some(r => r.test(g)));
let nonSquare = [];
tileGroups.forEach(g => {
  map.groups[g].frames.forEach((f, i) => {
    if (f.w !== f.h) nonSquare.push({ g, i, w: f.w, h: f.h, id: f.i });
  });
});
ok(nonSquare.length > 0,
   'ada ' + nonSquare.length + ' rangka NON-PERSEGI yang bisa dipilih ' +
   'untuk tile — inilah sumber masalahnya');
const worst = nonSquare.reduce((a, b) =>
  (Math.max(a.w/a.h, a.h/a.w) > Math.max(b.w/b.h, b.h/b.w) ? a : b));
console.log('        paling ekstrem: #' + worst.id + ' ' + worst.w + 'x' + worst.h +
            ' (rasio ' + Math.max(worst.w/worst.h, worst.h/worst.w).toFixed(1) + ':1)');

/* ---- 2. dipasang ke tile: TIDAK boleh melar ---- */
function cropRatioFor(key, grp, f) {
  w.SWAP[key] = { grp: grp, f: f };
  Object.keys(textures).forEach(k => delete textures[k]);
  drawLog[key] = [];
  const m = w.ASSET_MAP.find(e => e.key === key);
  w.assetToTexture(scene, m);
  delete w.SWAP[key];
  const d = (drawLog[key] || [])[0];
  if (!d) return null;
  /* drawImage(img, sx,sy,sw,sh, dx,dy,dw,dh) */
  return { sw: d[3], sh: d[4], dw: d[7], dh: d[8] };
}

/* pakai rangka PALING ekstrem sebagai uji terberat */
const r = cropRatioFor('t_gr_s0', worst.g, worst.i);
ok(!!r, 'tekstur tanah tergambar');
if (r) {
  const srcRatio = r.sw / r.sh, dstRatio = r.dw / r.dh;
  ok(Math.abs(srcRatio - dstRatio) < 0.02,
     'rasio potongan sumber = rasio kotak tujuan (' +
     srcRatio.toFixed(2) + ' vs ' + dstRatio.toFixed(2) + ') — tidak melar');
  ok(r.sw <= worst.w + 0.01 && r.sh <= worst.h + 0.01,
     'potongan tidak melebihi ukuran sumber (' +
     r.sw.toFixed(1) + 'x' + r.sh.toFixed(1) + ' dari ' + worst.w + 'x' + worst.h + ')');
  ok(r.dw === 32 && r.dh === 32,
     'kotak tujuan tetap penuh 32x32 (tanpa celah antar petak) — ' +
     r.dw + 'x' + r.dh);
}

/* ---- 3. sumber PERSEGI tidak ikut terpotong ---- */
const sq = tileGroups.map(g => ({ g, f: map.groups[g].frames.findIndex(f => f.w === f.h) }))
                     .find(x => x.f >= 0);
const r2 = cropRatioFor('t_gr_s0', sq.g, sq.f);
if (r2) {
  const src = map.groups[sq.g].frames[sq.f];
  ok(Math.abs(r2.sw - src.w) < 0.01 && Math.abs(r2.sh - src.h) < 0.01,
     'sumber persegi dipakai UTUH, tidak dipotong sia-sia (' +
     r2.sw + 'x' + r2.sh + ' dari ' + src.w + 'x' + src.h + ')');
}

/* ---- 4. SEMUA entri fill:true aman utk rangka non-persegi ---- */
const fillKeys = w.ASSET_MAP.filter(m => m.fill && m.label).map(m => m.key);
ok(fillKeys.length >= 20, 'ada ' + fillKeys.length + ' tile ber-fill:true');
let stretched = [];
fillKeys.forEach(k => {
  const rr = cropRatioFor(k, worst.g, worst.i);
  if (!rr) return;
  if (Math.abs(rr.sw / rr.sh - rr.dw / rr.dh) > 0.02) stretched.push(k);
});
ok(stretched.length === 0,
   'tidak ada tile yang melar saat diberi sprite non-persegi' +
   (stretched.length ? ' -> ' + stretched.join(', ') : ''));

/* ---- 5. jalur LIVE memakai cara yang SAMA ----
   Kalau berbeda, gambar berubah bentuk saat "terapkan langsung" vs
   saat stage dibangun ulang. */
const live = js.slice(js.indexOf('function redrawTexture'),
                      js.indexOf('function redrawTexture') + 2500);
ok(/drawCover\(cx, img/.test(live),
   'redrawTexture() (jalur live) juga memakai drawCover');
const att = js.slice(js.indexOf('function assetToTexture'),
                     js.indexOf('function assetToTexture') + 3000);
ok(/drawCover\(t\.cx, img/.test(att),
   'assetToTexture() memakai drawCover');
ok(!/drawImage\(img, fr\.x, fr\.y, fr\.w, fr\.h, 0, offY, (sz\.w|cv\.width)/.test(js),
   'tidak ada lagi drawImage yang meregangkan paksa');

/* ---- 6. drawCover benar secara matematis ---- */
const calls = [];
const fakeCx = { drawImage: (...a) => calls.push(a) };
/* sumber 48x5 -> kotak 32x32: harus mengambil potongan 5x5 di tengah */
w.drawCover(fakeCx, {}, 0, 0, 48, 5, 0, 0, 32, 32);
const c = calls[0];
ok(Math.abs(c[3] - 5) < 0.01 && Math.abs(c[4] - 5) < 0.01,
   '48x5 -> 32x32: mengambil 5x5 (persegi) dari tengah, dapat ' +
   c[3].toFixed(1) + 'x' + c[4].toFixed(1));
ok(Math.abs(c[1] - 21.5) < 0.01,
   'potongan diambil dari TENGAH sumber (x=' + c[1].toFixed(1) + ')');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
