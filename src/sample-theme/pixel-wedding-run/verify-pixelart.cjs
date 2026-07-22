/* Uji MUTU PIXEL ART pada latar/pemandangan.

   Permintaan user: "saya mau pemandangan/background-nya dibuat lebih
   detail lagi tapi tetap pixel art. Cari referensi bagaimana ciri-ciri
   pixel art yang bagus."

   Kaidah yang dijadikan acuan (Slynyrd Pixelblog, Saint11 "Consistency",
   Arne Niklas Jansson, Pixel Parmesan, Derek Yu):

     1. SATU GRID PIKSEL. Mencampur blok 4px & 8px ("mixels") adalah
        penanda amatir paling kentara: mata mengunci pada blok terbesar
        dan menganggap sisanya cacat.
     2. Kedalaman lewat WARNA (perspektif atmosfer), bukan lewat blok
        yang diperbesar.
     3. Gradasi TIDAK boleh mulus; pita datar besar = banding.
     4. Ramp warna tidak dibuat dengan mencampur hitam/putih — rona
        bergeser hangat ke arah cahaya, dingin ke arah bayangan.

   Semua diuji dari GEOMETRI GAMBAR yang benar-benar dipanggil (fillRect
   dicatat), bukan dari membaca teks kode. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => ({
  imageSmoothingEnabled: true, drawImage(){}, clearRect(){}, fillRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){}
});
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);

/* Graphics tiruan: mencatat tiap fillRect + warna yang berlaku. */
function recorder() {
  const rects = [];
  let cur = 0;
  return {
    rects,
    fillStyle(c) { cur = c; },
    fillRect(x, y, ww, hh) { rects.push({ x, y, w: ww, h: hh, c: cur }); },
    generateTexture(){}, destroy(){},
    lineStyle(){}, strokeRect(){}, beginPath(){}, closePath(){},
    fillPath(){}, strokePath(){}, moveTo(){}, lineTo(){}, fillCircle(){},
    fillTriangle(){}, save(){}, restore(){}
  };
}

const GRID = w.GRID;
ok(GRID === 4, 'GRID latar = 4px (satu ukuran piksel untuk semua)');

/* =====================================================================
   1. SATU GRID — uji utama
   ===================================================================== */
const painters = Object.keys(w).filter(k => /^paint[A-Z]/.test(k) &&
                                            typeof w[k] === 'function');
ok(painters.length >= 10,
   'ditemukan ' + painters.length + ' fungsi lukis latar: ' + painters.join(', '));

/* Tiap painter dipanggil dgn argumen wajar; SEMUA fillRect harus jatuh
   di kelipatan GRID (posisi maupun ukuran). Kalau ada yang tidak, itu
   persis cacat "mixel" yang membuat gambar tidak terbaca sebagai pixel
   art. dp sengaja diberi nilai NGACO (7 & 8) untuk membuktikan bahwa
   painter mengabaikannya dan tetap memakai GRID. */
const GY = 820;
const ARGS = {
  paintMountain: [640, GY, 200, 180, 0x5f8f78, 0xe6ecd8, 0.5, 8],
  paintCloud:    [300, 200, 120, 0xffffff, 0xdddddd, false],
  paintPine:     [200, GY, 90, 0x2d4a3e, 7],
  paintWindmill: [300, GY, 140, 0x5f8f78, 0xe6ecd8, 0xe6ecd8, 7],
  paintShip:     [300, GY, 120, 0x3f7590, 0xe6ecd8, 8],
  paintBaratie:  [300, GY, 150, 0x3f7590, 0xe6ecd8, 0xfff2cc, 7],
  paintPyramid:  [300, GY, 200, 0xd8b48c, 0xffeccc, 8],
  paintDome:     [300, GY, 160, 0xc79a5e, 0xffeccc, 7],
  paintGiantFern:[300, GY, 150, 0x5f8258, 0x7b9a68, 7],
  paintBeanstalk:[300, GY, 300, 0x9fd8cc, 0xc4ece0, 7],
  paintArlongPark:[300, GY, 220, 0x1c2a48, 0x33456e, 0x8898c4, 7],
  paintJollyShip:[300, 400, 60, 0x2d4a3e, 0xe6ecd8, 0xe6ecd8, 7],
  paintPalm:     [300, GY, 130, 0xc79a5e, 0xe0bc84, 7],
  paintCactus:   [300, GY, 90, 0x5f8f78, 0x7fae90, 7]
};

let offGrid = [], notRun = [], drewNothing = [];
painters.forEach(name => {
  const a = ARGS[name];
  if (!a) { notRun.push(name); return; }
  const g = recorder();
  /* Digambar lewat gridGuard — persis jalur yang dipakai mkLayer di
     produksi. Menguji painter TANPA penjaga akan menguji jalur yang
     tidak pernah dipakai game. */
  try { w[name].apply(null, [w.gridGuard(g)].concat(a)); }
  catch (e) { offGrid.push(name + ' (error: ' + e.message + ')'); return; }
  if (!g.rects.length) { drewNothing.push(name); return; }
  const bad = g.rects.filter(r =>
    r.x % GRID !== 0 || r.y % GRID !== 0 ||
    r.w % GRID !== 0 || r.h % GRID !== 0);
  if (bad.length) {
    const s = bad[0];
    offGrid.push(name + ' ' + bad.length + '/' + g.rects.length +
      ' rect di luar grid, contoh (' + s.x + ',' + s.y + ' ' + s.w + 'x' + s.h + ')');
  }
});

if (notRun.length) console.log('        (tidak diuji, argumen tak dikenal: ' + notRun.join(', ') + ')');
ok(drewNothing.length === 0,
   'tiap painter benar-benar menggambar sesuatu' +
   (drewNothing.length ? ' -> kosong: ' + drewNothing.join(', ') : ''));
ok(offGrid.length === 0,
   'SEMUA elemen latar jatuh di grid ' + GRID + 'px — tidak ada "mixel"' +
   (offGrid.length ? '\n        -> ' + offGrid.join('\n        -> ') : ''));

/* dp ngaco tidak berpengaruh: bukti painter benar-benar mengabaikannya */
function rectsOf(name, dpVal) {
  const a = ARGS[name].slice();
  a[a.length - 1] = dpVal;
  const g = recorder();
  w[name].apply(null, [w.gridGuard(g)].concat(a));
  return JSON.stringify(g.rects);
}
ok(rectsOf('paintPine', 7) === rectsOf('paintPine', 16),
   'nilai dp lama diabaikan — grid tidak bisa lagi dipalsukan per-objek');

/* =====================================================================
   2. RAMP WARNA — rona bergeser, bukan campur hitam/putih
   ===================================================================== */
const base = 0x5f8f78;                       /* hijau sedang */
const lit  = w.shade(base, 0.5);
const dark = w.shade(base, -0.5);
const hsv  = c => w.rgbToHsv(c);
const hb = hsv(base), hl = hsv(lit), hd = hsv(dark);

ok(hl.v > hb.v && hd.v < hb.v, 'shade(): terang lebih tinggi nilainya, gelap lebih rendah');
/* jarak rona berputar terpendek */
const dh = (a, b) => Math.abs(((b - a + 540) % 360) - 180);
ok(dh(hb.h, hl.h) > 1 && dh(hb.h, hd.h) > 1,
   'rona BERGESER saat terang/gelap (bukan sekadar campur hitam/putih) — ' +
   'terang ' + dh(hb.h, hl.h).toFixed(1) + '°, gelap ' + dh(hb.h, hd.h).toFixed(1) + '°');
/* arah geser: terang -> hangat (45), gelap -> dingin (250) */
ok(dh(hl.h, 45) < dh(hb.h, 45),
   'sisi terang bergeser ke arah HANGAT (kuning-jingga)');
ok(dh(hd.h, 250) < dh(hb.h, 250),
   'sisi gelap bergeser ke arah DINGIN (biru-ungu)');
ok(hl.s <= hb.s + 0.001,
   'saturasi TIDAK naik bersama kecerahan (kesalahan warna paling umum) — ' +
   hb.s.toFixed(2) + ' -> ' + hl.s.toFixed(2));

/* tidak pernah mentok 0/1 */
let clip = 0;
for (let t = -1; t <= 1.0001; t += 0.1) {
  const k = hsv(w.shade(base, t));
  if (k.s <= 0.001 || k.s >= 0.999 || k.v <= 0.001 || k.v >= 0.999) clip++;
}
ok(clip === 0, 'ramp tidak pernah mentok saturasi/nilai 0% atau 100%');

/* =====================================================================
   3. PERSPEKTIF ATMOSFER
   ===================================================================== */
const sky = 0xe6ecd8;
const nearC = 0x2d4a3e;
const d0 = w.hazeTo(nearC, sky, 0);
const d1 = w.hazeTo(nearC, sky, 0.3);
const d2 = w.hazeTo(nearC, sky, 0.7);
const dist = (a, b) => {
  const A = hsv(a), B = hsv(b);
  return Math.abs(A.v - B.v) + Math.abs(A.s - B.s);
};
ok(d0 === nearC, 'hazeTo(t=0) tidak mengubah apa pun (lapis terdekat)');
ok(dist(d2, sky) < dist(d1, sky) && dist(d1, sky) < dist(nearC, sky),
   'makin jauh -> makin menyatu dgn warna langit (saturasi turun & nilai naik bersamaan)');
ok(hsv(d2).s < hsv(nearC).s, 'lapis jauh kehilangan saturasi');

/* =====================================================================
   4. LANGIT: bertahap, tidak ada pita datar raksasa
   ===================================================================== */
const P = w.SKIES[0];
const gSky = recorder();
w.BW = w.BW || 540; w.BH = w.BH || 960;
w.paintSkyDithered(gSky, P, GY);
ok(gSky.rects.length > 200,
   'langit digambar bertahap (' + gSky.rects.length + ' rect, bukan 3 blok datar)');
const skyColors = new Set(gSky.rects.map(r => r.c));
ok(skyColors.size >= 6,
   'langit memakai ' + skyColors.size + ' warna antara — gradasi tidak melompat (anti-banding)');
/* Pita datar raksasa = banding. Yang diperiksa hanya bagian langit yang
   BENAR-BENAR TERLIHAT, yaitu di ATAS garis cakrawala. Di bawah
   cakrawala memang ada satu blok isian polos, tapi seluruhnya tertimpa
   lapis daratan/laut — memaksanya ber-dither hanya membakar ribuan
   fillRect untuk piksel yang tidak pernah tampak. */
const hzY = Math.max(Math.round(w.BH * 0.10), Math.round(GY - w.BH * 0.20));
const tall = gSky.rects.filter(r =>
  r.w >= w.BW && r.h > w.BH * 0.25 && r.y < hzY);
ok(tall.length === 0,
   'tidak ada pita datar raksasa di langit yang terlihat (di atas cakrawala y=' + hzY + ')' +
   (tall.length ? ' -> ada ' + tall.length + ' setinggi ' + tall[0].h + 'px' : ''));
/* dan pastikan blok polos itu memang di bawah cakrawala, bukan alasan */
const below = gSky.rects.filter(r => r.w >= w.BW && r.h > w.BH * 0.25);
ok(below.every(r => r.y >= hzY),
   'blok polos hanya ada DI BAWAH cakrawala (tertimpa daratan)');

/* awan benar-benar tergambar ke dalam langit */
const gc = recorder();
w.paintCloud(w.gridGuard(gc), 300, 200, 140, 0xffffff, 0xdddddd, false);
ok(gc.rects.length > 8, 'awan tergambar sebagai gugusan kolom (' + gc.rects.length + ')');
const cloudTops = gc.rects.filter(r => r.h > GRID).map(r => r.y);
ok(new Set(cloudTops).size > 2,
   'puncak awan TIDAK rata — beberapa gumpalan, bukan satu elips (' +
   new Set(cloudTops).size + ' ketinggian berbeda)');

/* =====================================================================
   5. SILUET: bentuk tidak seragam / tidak berulang identik
   ===================================================================== */
/* dua gunung dgn parameter berbeda harus menghasilkan siluet berbeda */
function ridge(seedX, peak) {
  const g = recorder();
  w.paintMountain(w.gridGuard(g), seedX, GY, peak, 180, 0x5f8f78, 0xe6ecd8, 0.5, 8);
  const top = {};
  g.rects.forEach(r => { if (top[r.x] === undefined || r.y < top[r.x]) top[r.x] = r.y; });
  return top;
}
const r1 = ridge(640, 200), r2 = ridge(640, 240);
ok(JSON.stringify(r1) !== JSON.stringify(r2), 'gunung dgn tinggi berbeda -> siluet berbeda');
/* garis puncak tidak mulus: harus ada naik-turun (gerigi), bukan kurva bersih */
const xs = Object.keys(r1).map(Number).sort((a, b) => a - b);
let dirChanges = 0;
for (let i = 2; i < xs.length; i++) {
  const a = r1[xs[i-2]], b = r1[xs[i-1]], c = r1[xs[i]];
  if ((b - a) * (c - b) < 0) dirChanges++;
}
ok(dirChanges >= 3,
   'punggungan gunung bergerigi, bukan kurva mulus (' + dirChanges + ' perubahan arah)');

/* gunung punya sisi terang & sisi gelap (bukan satu warna datar) */
const gm = recorder();
w.paintMountain(w.gridGuard(gm), 640, GY, 200, 180, 0x5f8f78, 0xe6ecd8, 0.5, 8);
const bodyCols = new Set(gm.rects.map(r => r.c));
ok(bodyCols.size >= 3,
   'gunung memakai ' + bodyCols.size + ' warna (sisi kena cahaya vs sisi teduh + salju)');

/* =====================================================================
   6. DITHER: ukuran sel = ukuran piksel dasar
   ===================================================================== */
const gd = recorder();
w.ditherBand(gd, 0x000000, 0xffffff, 0, 64);
const cells = gd.rects.filter(r => r.w < w.BW);       /* titik dither */
ok(cells.length > 0, 'ditherBand menebar titik');
const badCell = cells.filter(r => r.w !== w.DP || r.h !== w.DP);
ok(badCell.length === 0,
   'tiap titik dither berukuran tepat DP=' + w.DP + 'px (sama dgn grid, bukan noise)');
ok(w.DP === GRID, 'ukuran sel dither = ukuran grid latar (' + w.DP + '=' + GRID + ')');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
