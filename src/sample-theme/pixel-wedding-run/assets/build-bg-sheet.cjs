/* =====================================================================
   EKSPOR LAPIS LATAR (PARALLAX) STAGE 1-6 KE SATU PNG
   ---------------------------------------------------------------------
   Jalankan:  node assets/build-bg-sheet.cjs
   Output  :  assets/bg-sheet.png
              assets/bg-map.json

   KENAPA BEGINI
     Latar tiap stage TIDAK berasal dari berkas gambar — semuanya digambar
     prosedural oleh index.js lewat Phaser Graphics. Supaya PNG yang
     dihasilkan BENAR-BENAR sama dengan yang tampil di game (bukan gambar
     tiruan), skrip ini menjalankan FUNGSI LUKIS ASLI dari index.js di
     atas stub Graphics kecil, lalu menulis pikselnya sendiri.

     Aman karena gridGuard() di index.js memang hanya membolehkan
     fillStyle + fillRect untuk latar — jadi stub-nya cukup dua metode.

   TATA LETAK — meniru assets/sprite-sheet.png supaya alurnya sama:
     - tiap lapis dibungkus KOTAK berbingkai ungu #a020f0 setebal 1px
     - di bawah tiap kotak ada NOMOR indeks (font bitmap 3x5)
     - kotak dikelompokkan per STAGE, satu stage satu baris

   Bingkai & nomor hanyalah penanda batas supaya isi kotak bisa diganti
   lalu dibaca ulang; keduanya bukan bagian dari gambar latar.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, 'png.cjs'));

const ROOT = path.join(__dirname, '..');
const OUT = __dirname;
const SRC = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');

/* ---- tata letak (disamakan dengan build-sheet.cjs) ---- */
const FRAME = { r: 0xa0, g: 0x20, b: 0xf0 };
const BORDER = 1, GAP = 6, NUMH = 6, PAD = 8;

const DIGIT = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};

/* =====================================================================
   1. AMBIL POTONGAN KODE ASLI DARI index.js
   ===================================================================== */
function grabFn(name) {
  const start = SRC.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('fungsi tidak ada: ' + name);
  let d = 0, end = -1;
  for (let i = SRC.indexOf('{', start); i < SRC.length; i++) {
    if (SRC[i] === '{') d++;
    else if (SRC[i] === '}') { d--; if (d === 0) { end = i + 1; break; } }
  }
  return SRC.slice(start, end);
}
function grabVar(decl) {
  const start = SRC.indexOf(decl);
  if (start < 0) throw new Error('deklarasi tidak ada: ' + decl);
  /* var X = [ ... ];  — cari penutup kurung yang seimbang */
  const open = SRC.indexOf('[', start);
  let d = 0, end = -1;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '[') d++;
    else if (SRC[i] === ']') { d--; if (d === 0) { end = i + 1; break; } }
  }
  return SRC.slice(start, end) + ';';
}
function grabMethod(name) {
  const start = SRC.indexOf('GameScene.prototype.' + name + ' = function');
  if (start < 0) throw new Error('metode tidak ada: ' + name);
  let d = 0, end = -1;
  for (let i = SRC.indexOf('{', start); i < SRC.length; i++) {
    if (SRC[i] === '{') d++;
    else if (SRC[i] === '}') { d--; if (d === 0) { end = i + 1; break; } }
  }
  return SRC.slice(start, end);
}

/* =====================================================================
   2. STUB GRAPHICS — merekam fillRect ke buffer RGBA
   ===================================================================== */
function makeCanvas(w, h) {
  const buf = new Uint8Array(w * h * 4);
  let cur = 0x000000, alpha = 1;
  return {
    buf, w, h,
    fillStyle(c, a) { cur = c >>> 0; alpha = (a === undefined ? 1 : a); },
    fillRect(x, y, rw, rh) {
      x = Math.round(x); y = Math.round(y);
      rw = Math.round(rw); rh = Math.round(rh);
      const r = (cur >> 16) & 255, g = (cur >> 8) & 255, b = cur & 255;
      const x0 = Math.max(0, x), y0 = Math.max(0, y);
      const x1 = Math.min(w, x + rw), y1 = Math.min(h, y + rh);
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const o = (py * w + px) * 4;
          const sa = Math.max(0, Math.min(1, alpha));
          /* komposit "source-over" sederhana */
          const da = buf[o + 3] / 255;
          const oa = sa + da * (1 - sa);
          if (oa <= 0) { buf[o + 3] = 0; continue; }
          buf[o]     = Math.round((r * sa + buf[o]     * da * (1 - sa)) / oa);
          buf[o + 1] = Math.round((g * sa + buf[o + 1] * da * (1 - sa)) / oa);
          buf[o + 2] = Math.round((b * sa + buf[o + 2] * da * (1 - sa)) / oa);
          buf[o + 3] = Math.round(oa * 255);
        }
      }
    },
    /* gridGuard meneruskan dua ini; latar tidak memakainya. */
    lineStyle() {}, strokeRect() {},
  };
}

/* =====================================================================
   3. SANDBOX: jalankan kode lukis asli
   ===================================================================== */
/* Dependensi diselesaikan TRANSITIF dari kode aslinya, bukan didaftar
   manual: fungsi lukis saling memanggil (paintSkyDithered -> ditherBand ->
   ...), dan daftar tangan pasti ketinggalan begitu latar diubah. */
const KATA_KUNCI = new Set(['if', 'for', 'while', 'switch', 'return', 'function',
  'catch', 'typeof', 'new', 'delete', 'void', 'in', 'of', 'do', 'else']);
function depsOf(code) {
  return [...new Set([...code.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)].map(m => m[1]))]
    .filter(n => !KATA_KUNCI.has(n) && SRC.includes('function ' + n + '('));
}
const fnSrc = [];
const sudah = new Set();
function tarik(name) {
  if (sudah.has(name)) return;
  let code;
  try { code = grabFn(name); } catch (e) { return; }
  sudah.add(name);
  for (const d of depsOf(code)) tarik(d);   /* dependensi dulu */
  fnSrc.push(code);
}
/* Titik masuk: dua fungsi yang dipanggil langsung oleh renderer. */
for (const n of ['gridGuard', 'paintSkyDithered']) tarik(n);
/* Lalu semua yang dipanggil dari dalam buildParallax. */
for (const n of depsOf(grabMethod('buildParallax'))) tarik(n);

/* Konstanta global yang dirujuk kode lukis — juga diambil dari sumbernya
   supaya nilainya tidak pernah berbeda dari game. */
function grabConst(name) {
  const re = new RegExp('^var ' + name + '\\s*=', 'm');
  const m = SRC.match(re);
  if (!m) return '';
  const start = m.index;
  const open = SRC.indexOf('=', start) + 1;
  /* Array/objek multi-baris: cari penutup seimbang; skalar: sampai ';' */
  const firstCh = SRC.slice(open).match(/\S/);
  const ch = firstCh ? firstCh[0] : '';
  if (ch === '[' || ch === '{') {
    const o = SRC.indexOf(ch, open), close = ch === '[' ? ']' : '}';
    let d = 0, end = -1;
    for (let i = o; i < SRC.length; i++) {
      if (SRC[i] === ch) d++;
      else if (SRC[i] === close) { d--; if (d === 0) { end = i + 1; break; } }
    }
    return SRC.slice(start, end) + ';';
  }
  return SRC.slice(start, SRC.indexOf(';', open) + 1);
}
const KONSTAN = ['BAYER4', 'DP', 'GRID', 'TILE', 'PX', 'TPX', 'HPX'];
const constSrc = KONSTAN.map(grabConst).filter(Boolean);

const sandbox = new Function('MK', `
  ${grabVar('var SKIES = [')}
  ${grabVar('var STAGES = [')}
  ${constSrc.join('\n')}
  var BW = 540, BH = 960;
  var TUNE = { bgDetail: 100 };
  /* Seed TETAP: penempatan prop latar memakai mulberry32(STORE.seed).
     Dipatok supaya hasil ekspor selalu sama tiap dijalankan. */
  var STORE = { seed: 1 };
  ${fnSrc.join('\n')}

  /* Rekaman lapis: buildParallax memanggil this.mkLayer(...) */
  var LAYERS = [];
  var scene = {
    add: {
      graphics: function () {
        var c = MK(BW, BH);
        var o = {
          _c: c,
          setScrollFactor: function () { return o; },
          setDepth: function () { return o; },
          fillStyle: function (a, b) { c.fillStyle(a, b); return o; },
          fillRect: function (a, b, d, e) { c.fillRect(a, b, d, e); return o; },
        };
        /* Matahari/bintang digambar langsung ke graphics ini. */
        LAYERS.push({ key: '_sun_' + CUR_SID, w: BW, h: BH, canvas: c, scroll: 0.04 });
        return o;
      },
      group: function () { return { add: function () {} }; },
    },
    textures: { exists: function () { return false; } },
    make: { graphics: function () { return null; } },
    mkLayer: function (key, w, h, scroll, depth, drawFn) {
      var c = MK(w, h);
      drawFn(gridGuard({
        fillStyle: function (a, b) { c.fillStyle(a, b); },
        fillRect: function (a, b, d, e) { c.fillRect(a, b, d, e); },
        lineStyle: function () {}, strokeRect: function () {},
      }));
      LAYERS.push({ key: key, w: w, h: h, canvas: c, scroll: scroll, depth: depth });
    },
  };
  /* Data level palsu: buildParallax hanya memakainya untuk PANJANG level
     dan memeriksa "ada tanah di x ini?" (penempatan prop latar). Level
     datar penuh = semua prop muncul, jadi tiap lapis terekspor lengkap. */
  scene.L = { len: 6400, ground: [{ x: 0, w: 6400 }], solids: [], gapY: [] };
  var GameScene = { prototype: {} };
  ${grabMethod('buildParallax')}

  var CUR_SID = 0;
  return function renderStage(sid) {
    CUR_SID = sid;
    LAYERS = [];
    var S = STAGES[sid];
    var GY = BH - 90;
    /* LANGIT sebagai lapis tersendiri (di game: graphics scrollFactor 0). */
    var skyC = MK(BW, BH);
    paintSkyDithered({
      fillStyle: function (a, b) { skyC.fillStyle(a, b); },
      fillRect: function (a, b, d, e) { skyC.fillRect(a, b, d, e); },
    }, SKIES[sid] || SKIES[0], GY);

    GameScene.prototype.buildParallax.call(scene, S, GY);

    var out = [{ key: 'sky_' + sid, w: BW, h: BH, canvas: skyC, scroll: 0 }];
    return out.concat(LAYERS);
  };
`)(makeCanvas);

/* =====================================================================
   4. RENDER 6 STAGE
   ===================================================================== */
const NAMA_LAPIS = {
  sky:  'Langit',
  _sun: 'Matahari/bulan + bintang',
  cl1:  'Awan jauh',
  cl2:  'Awan dekat',
  sea:  'Laut',
  far:  'Siluet jauh',
  midm: 'Lapis tengah',
  tf:   'Pohon jauh',
  tn:   'Pohon dekat',
  lm:   'Penanda khas biome',
  haze: 'Kabut',
};
function labelOf(key) {
  if (key.indexOf('sky_') === 0) return NAMA_LAPIS.sky;
  if (key === '_sun') return NAMA_LAPIS._sun;
  const m = key.match(/^pwr_([a-z0-9]+)_/);
  return (m && NAMA_LAPIS[m[1]]) || key;
}

const items = [];
for (let sid = 0; sid < 6; sid++) {
  let layers;
  try { layers = sandbox(sid); }
  catch (e) { console.error('Stage ' + (sid + 1) + ' gagal: ' + e.message); process.exit(1); }
  for (const L of layers) {
    /* Lapis yang sama sekali kosong (mis. laut di stage non-laut) dilewati
       supaya sheet tidak penuh kotak transparan tanpa guna. */
    let any = false;
    for (let i = 3; i < L.canvas.buf.length; i += 4) { if (L.canvas.buf[i]) { any = true; break; } }
    if (!any) continue;
    items.push({
      stage: sid + 1, key: L.key, label: labelOf(L.key),
      w: L.w, h: L.h, buf: L.canvas.buf, scroll: L.scroll,
    });
  }
}
console.log('lapis terkumpul : ' + items.length);

/* =====================================================================
   5. SUSUN SHEET — satu STAGE satu baris
   ===================================================================== */
/* Tiap lapis selebar layar (540px), jadi 10-11 lapis berjajar = sheet
   ~10900px: terlalu lebar untuk dibuka & diedit dengan nyaman. Satu stage
   dipecah jadi beberapa baris dengan batas MAXW, tapi stage BERIKUTNYA
   selalu mulai di baris baru supaya pengelompokannya tetap terbaca. */
const MAXW = 3400;   /* muat 5 lapis 540px per baris */
let sheetW = 0, sheetH = PAD;
const placed = [];
for (let s = 1; s <= 6; s++) {
  const stageItems = items.filter(it => it.stage === s);
  if (!stageItems.length) continue;
  let x = PAD, rowH = 0, row = [];
  for (const it of stageItems) {
    const bw = it.w + BORDER * 2;
    if (row.length && x + bw + PAD > MAXW) {      /* baris penuh -> turun */
      sheetW = Math.max(sheetW, x - GAP + PAD);
      sheetH += rowH + GAP * 2;
      placed.push(row);
      row = []; x = PAD; rowH = 0;
    }
    it.bx = x; it.by = sheetH;
    x += bw + GAP;
    rowH = Math.max(rowH, it.h + BORDER * 2 + NUMH);
    row.push(it);
  }
  if (row.length) {
    sheetW = Math.max(sheetW, x - GAP + PAD);
    sheetH += rowH + GAP * 2;
    placed.push(row);
  }
  sheetH += GAP * 2;        /* pemisah antar stage */
}
sheetH += PAD;
console.log('ukuran sheet    : ' + sheetW + 'x' + sheetH);

const sheet = new Uint8Array(sheetW * sheetH * 4);
function px(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= sheetW || y >= sheetH) return;
  const o = (y * sheetW + x) * 4;
  sheet[o] = r; sheet[o + 1] = g; sheet[o + 2] = b; sheet[o + 3] = a === undefined ? 255 : a;
}
function drawNum(n, x, y) {
  const s = String(n);
  let cx = x;
  for (const ch of s) {
    const gl = DIGIT[ch];
    if (gl) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if (gl[r][c] === '1') px(cx + c, y + r, FRAME.r, FRAME.g, FRAME.b);
        }
      }
    }
    cx += 4;
  }
}

let idx = 1;
const map = [];
for (const row of placed) {
  for (const it of row) {
    const bw = it.w + BORDER * 2, bh = it.h + BORDER * 2;
    /* bingkai ungu */
    for (let x = 0; x < bw; x++) { px(it.bx + x, it.by, FRAME.r, FRAME.g, FRAME.b); px(it.bx + x, it.by + bh - 1, FRAME.r, FRAME.g, FRAME.b); }
    for (let y = 0; y < bh; y++) { px(it.bx, it.by + y, FRAME.r, FRAME.g, FRAME.b); px(it.bx + bw - 1, it.by + y, FRAME.r, FRAME.g, FRAME.b); }
    /* isi */
    for (let y = 0; y < it.h; y++) {
      for (let x = 0; x < it.w; x++) {
        const so = (y * it.w + x) * 4;
        px(it.bx + BORDER + x, it.by + BORDER + y,
           it.buf[so], it.buf[so + 1], it.buf[so + 2], it.buf[so + 3]);
      }
    }
    drawNum(idx, it.bx + 1, it.by + bh + 1);
    map.push({
      i: idx, stage: it.stage, layer: it.label, key: it.key,
      x: it.bx + BORDER, y: it.by + BORDER, w: it.w, h: it.h,
      scroll: it.scroll,
    });
    idx++;
  }
}

/* png.cjs memakai Buffer#copy, jadi Uint8Array harus dibungkus dulu. */
P.writePNG(path.join(OUT, 'bg-sheet.png'), sheetW, sheetH, Buffer.from(sheet.buffer));
fs.writeFileSync(path.join(OUT, 'bg-map.json'), JSON.stringify({
  sheet: 'bg-sheet.png', w: sheetW, h: sheetH,
  border: BORDER, gap: GAP, frameColor: '#a020f0',
  catatan: 'Koordinat menunjuk ke ISI kotak (sudah di dalam bingkai ungu).',
  items: map,
}, null, 2));

console.log('kotak           : bingkai ' + BORDER + 'px ungu, nomor di bawah');
console.log('ditulis         : assets/bg-sheet.png + assets/bg-map.json');
for (let s = 1; s <= 6; s++) {
  const r = map.filter(m => m.stage === s);
  console.log('  Stage ' + s + ' (' + r.length + ' lapis): ' +
              r.map(m => '#' + m.i + ' ' + m.layer).join(', '));
}
