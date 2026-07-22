/* =====================================================================
   BANGUN SATU SPRITE SHEET dari SEMUA berkas di ../Free/
   ---------------------------------------------------------------------
   Jalankan:  node assets/build-sheet.cjs
   Output  :  assets/sprite-sheet.png
              assets/sprite-map.json

   TATA LETAK
     - tiap sprite ditaruh dalam KOTAK berbingkai ungu #a020f0 setebal 1px
     - antar kotak diberi JARAK 6px supaya rapi & mudah dibaca mata
     - di bawah tiap kotak digambar NOMOR indeksnya (font bitmap 3x5)
     - kotak diurutkan per-kelompok, tinggi seragam per baris (shelf pack)

   Bingkai & nomor TIDAK ikut terender di game: engine membaca koordinat
   dari sprite-map.json yang menunjuk ke ISI kotak, bukan ke kotaknya.

   ATLAS (Terrain, 20 Enemies, Background, dll) disimpan UTUH sebagai satu
   kotak, lalu dialamati per-sel lewat properti `grid` di JSON. Memecahnya
   jadi 242 kotak terpisah hanya membuat sheet raksasa tanpa manfaat.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, 'png.cjs'));

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'Free');
const OUT = __dirname;

const FRAME = { r: 0xa0, g: 0x20, b: 0xf0 };  /* ungu penanda */
const BORDER = 1;      /* tebal bingkai kotak */
const GAP = 6;         /* jarak antar kotak   */
const NUMH = 6;        /* ruang untuk nomor di bawah kotak */
const MAXW = 2048;     /* lebar maksimum sheet */

/* ---- font bitmap 3x5 untuk nomor ---- */
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
  '9': ['111', '101', '111', '001', '111']
};

/* ---- berkas yang disimpan UTUH sebagai atlas ----
   Hanya untuk gambar yang memang BUKAN kumpulan sel seukuran: poster
   (Hello, 20 Enemies), warna polos (Background), dan efek transisi.

   Terrain & Sand Mud Ice SENGAJA TIDAK di sini: keduanya grid tile
   seukuran, jadi dipecah per-sel supaya tiap tile punya nomor sendiri
   — konsisten dengan animasi yang juga dipecah per-frame. */
const ATLAS = [/^20 Enemies/i, /^Hello/i, /^Background\//i, /Transition/i];

/* ---- berkas yang dipecah per BLOK TERHUBUNG ----
   Terrain & Sand Mud Ice BUKAN grid tile seragam meski namanya
   "(16x16)" / "(16x6)". Isinya blok-blok terrain utuh: hasil deteksi
   flood-fill menunjukkan 14 blok berukuran 80x48, 64x48, dan 48x5.

   Memotongnya per 16x16 MERUSAK gambar — satu blok 80x48 terbelah jadi
   15 potongan tak bermakna, sebagian berisi sudut, sebagian kosong.
   Itu yang terjadi pada versi sebelumnya dan terlihat "ga sesuai
   gambar".

   Jadi keduanya dipecah per blok terhubung: tiap blok jadi SATU kotak
   bernomor, utuh seperti aslinya. Kalau nanti butuh satu tile 16x16 di
   dalam blok, alamati lewat offset di dalam kotak itu. */
const BLOCKS = [/^Terrain\//i, /Sand Mud Ice \(/i];

/* Pecah gambar jadi blok-blok terhubung (4-arah). */
function findBlocks(img) {
  const seen = new Uint8Array(img.w * img.h);
  const op = (x, y) => img.data[(y * img.w + x) * 4 + 3] > 20;
  const out = [];
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (seen[y * img.w + x] || !op(x, y)) continue;
      const st = [[x, y]];
      let minX = x, maxX = x, minY = y, maxY = y;
      seen[y * img.w + x] = 1;
      while (st.length) {
        const c = st.pop(), cx = c[0], cy = c[1];
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let k = 0; k < 4; k++) {
          const nx = cx + nb[k][0], ny = cy + nb[k][1];
          if (nx < 0 || ny < 0 || nx >= img.w || ny >= img.h) continue;
          if (seen[ny * img.w + nx] || !op(nx, ny)) continue;
          seen[ny * img.w + nx] = 1;
          st.push([nx, ny]);
        }
      }
      out.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
    }
  }
  /* urut baca: atas->bawah, kiri->kanan */
  out.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return out;
}

/* Belah satu wilayah blok jadi objek-objeknya.

   48 adalah ukuran blok penuh (3 tile @16). Satu wilayah terhubung berisi
   DUA objek yang bersentuhan: blok penuh 48x48, lalu blok pelengkap di
   sisa ruangnya. Sisa dirapatkan ke isi nyata supaya tidak menyisakan
   ruang transparan.

   Sumbu potong berbeda per berkas karena tata letaknya diputar:
     Terrain (16x16)      -> wilayah 80x48 / 64x48, blok penuh di KIRI,
                             pelengkap di kanan   -> potong pada x=48
     Sand Mud Ice (16x6)  -> wilayah 48x80, blok penuh di ATAS,
                             pelengkap di bawah   -> potong pada y=48

   Aturan potong = GEOMETRI, bukan warna. Percobaan sebelumnya memakai
   "garis gelap pemisah" dan gagal: tekstur bergaris membuat garis palsu di
   tengah objek, sementara tekstur polos tidak membentuk garis sama sekali
   di batas yang benar. */
const BLOCK_SIZE = 48;
const TILE = 16;

/* Sebagian "blok 48x48" sebenarnya BUKAN persegi penuh melainkan huruf L:
   dua baris tile teratas penuh selebar 48, lalu baris tile terbawah
   menjorok masuk 16px di kiri (takik di sudut kiri-bawah).

   Bentuk ini memuat tiga objek terpisah, sesuai ukurannya:

       persegi panjang 48x16   (jalur atas)
       persegi         32x32   (badan, menempel kanan-bawah)
       persegi kecil   16x16   (sudut kiri, tepat di bawah jalur)

   Diperiksa piksel-demi-piksel pada keempat blok L: susunan ini menutupi
   area solid TEPAT — nol piksel tak-tertutup, nol tumpang-tindih, nol
   piksel transparan ikut terbawa.

   Dikembalikan null kalau blok ternyata persegi penuh biasa. */
function splitL(img, b) {
  if (b.w !== BLOCK_SIZE || b.h !== BLOCK_SIZE) return null;
  const solid = (x, y) => img.data[((b.y + y) * img.w + (b.x + x)) * 4 + 3] > 8;
  /* takik = kolom 0..15 pada baris 32..47; di luar itu harus terisi */
  for (let y = 0; y < BLOCK_SIZE; y++) {
    for (let x = 0; x < BLOCK_SIZE; x++) {
      const notch = x < TILE && y >= TILE * 2;
      if (solid(x, y) === notch) return null;
    }
  }
  return [
    /* persegi panjang: jalur atas selebar penuh */
    { x: b.x,        y: b.y,            w: BLOCK_SIZE, h: TILE     },
    /* persegi: badan 32x32 menempel kanan-bawah */
    { x: b.x + TILE, y: b.y + TILE,     w: TILE * 2,   h: TILE * 2 },
    /* persegi kecil: sudut kiri tepat di bawah jalur */
    { x: b.x,        y: b.y + TILE,     w: TILE,       h: TILE     }
  ];
}

function splitBlock(img, b, axis) {
  const span = axis === 'y' ? b.h : b.w;
  if (span <= BLOCK_SIZE) return splitL(img, b) || [b];
  const out = [];
  const push = (x, y, w, h) => {
    const bb = P.bbox(img, x, y, w, h);
    if (!bb) return;
    const part = { x: x + bb.x, y: y + bb.y, w: bb.w, h: bb.h };
    const l = splitL(img, part);
    if (l) out.push(...l); else out.push(part);
  };
  if (axis === 'y') {
    push(b.x, b.y, b.w, BLOCK_SIZE);
    push(b.x, b.y + BLOCK_SIZE, b.w, b.h - BLOCK_SIZE);
  } else {
    push(b.x, b.y, BLOCK_SIZE, b.h);
    push(b.x + BLOCK_SIZE, b.y, b.w - BLOCK_SIZE, b.h);
  }
  return out.length ? out : [b];
}

function walk(d, out) {
  for (const f of fs.readdirSync(d).sort()) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.png$/i.test(f)) out.push(p);
  }
  return out;
}

/* Tebak ukuran frame untuk berkas tanpa "(WxH)" di namanya. */
function guessFrame(w, h) {
  if (w === h) return [w, h];
  for (const cand of [h, 32, 28, 24, 22, 16]) {
    if (cand <= w && w % cand === 0) return [cand, h];
  }
  return [w, h];
}

/* ---- kumpulkan semua item yang akan masuk sheet ---- */
const items = [];
for (const p of walk(SRC, [])) {
  let img;
  try { img = P.readPNG(p); } catch (e) { continue; }
  /* Normalisasi pemisah: di Git Bash path.sep bisa '/' sementara path
     dari fs memakai '\', sehingga split(path.sep) gagal memecah dan
     seluruh berkas terlewat (dulu hanya 12 item yang terbaca). */
  const parts = p.replace(/\\/g, '/').split('/');
  const rel = parts.slice(parts.lastIndexOf('Free') + 1).join('/');
  /* path.basename juga bergantung pemisah OS; pakai hasil normalisasi
     di atas supaya konsisten di Git Bash maupun cmd. */
  const base = parts[parts.length - 1].replace(/\.png$/i, '');
  const isAtlas = ATLAS.some(rx => rx.test(rel));
  const m = /\((\d+)x(\d+)\)/.exec(base);

  /* nama kelompok: folder + nama berkas tanpa "(WxH)" */
  const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
  const clean = base.replace(/\s*\(\d+x\d+\)\s*$/, '').trim();
  const group = (dir ? dir + '/' : '') + clean;

  if (isAtlas) {
    items.push({ img, sx: 0, sy: 0, w: img.w, h: img.h,
                 name: group, kind: 'atlas', src: rel });
    continue;
  }

  /* ---- BLOK TERRAIN / SAND MUD ICE ----
     findBlocks() menemukan wilayah terhubung, lalu tiap wilayah dibelah
     lagi lewat splitBlock() pada sumbu yang sesuai (lihat catatan di
     splitBlock: Sand Mud Ice tata letaknya diputar 90 derajat terhadap
     Terrain, jadi potongnya vertikal). */
  if (BLOCKS.some(rx => rx.test(rel))) {
    const axis = /Sand Mud Ice \(/i.test(rel) ? 'y' : 'x';
    let bi = 0;
    findBlocks(img).forEach(b => {
      splitBlock(img, b, axis).forEach(part => {
        items.push({ img, sx: part.x, sy: part.y, w: part.w, h: part.h,
                     name: group, kind: 'block', blk: bi++,
                     ox: part.x, oy: part.y, src: rel });
      });
    });
    continue;
  }

  let fw, fh;
  if (m) { fw = +m[1]; fh = +m[2]; }
  else { const g = guessFrame(img.w, img.h); fw = g[0]; fh = g[1]; }
  const cols = Math.max(1, Math.round(img.w / fw));
  const rows = Math.max(1, Math.round(img.h / fh));
  let f = 0;
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      items.push({ img, sx: cx * fw, sy: ry * fh, w: fw, h: fh,
                   name: group, kind: 'frame', frame: f++, src: rel });
    }
  }
}

/* ---- urutkan: kelompok tetap berdekatan, tinggi mirip berdampingan ---- */
items.sort((a, b) => {
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  /* tile diurut per baris lalu kolom; frame animasi per nomor frame */
  if (a.kind === 'block' && b.kind === 'block') return (a.blk || 0) - (b.blk || 0);
  return (a.frame || 0) - (b.frame || 0);
});

/* ---- shelf packing: baris demi baris, tinggi baris = kotak tertinggi ---- */
const boxW = it => it.w + BORDER * 2;
const boxH = it => it.h + BORDER * 2 + NUMH;

let x = GAP, y = GAP, rowH = 0, sheetW = 0;
for (const it of items) {
  const bw = boxW(it), bh = boxH(it);
  if (x + bw + GAP > MAXW) { x = GAP; y += rowH + GAP; rowH = 0; }
  it.bx = x; it.by = y;
  x += bw + GAP;
  if (bh > rowH) rowH = bh;
  if (x > sheetW) sheetW = x;
}
const sheetH = y + rowH + GAP;
sheetW = Math.min(MAXW, sheetW + GAP);

/* ---- render ---- */
const buf = Buffer.alloc(sheetW * sheetH * 4);   /* transparan */

function px(x, y, c) {
  if (x < 0 || y < 0 || x >= sheetW || y >= sheetH) return;
  const o = (y * sheetW + x) * 4;
  buf[o] = c.r; buf[o + 1] = c.g; buf[o + 2] = c.b; buf[o + 3] = 255;
}
function drawNum(n, x, y) {
  const s = String(n);
  for (let i = 0; i < s.length; i++) {
    const g = DIGIT[s[i]];
    if (!g) continue;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++)
        if (g[r][c] === '1') px(x + i * 4 + c, y + r, FRAME);
  }
}

items.forEach((it, idx) => {
  const bw = boxW(it), bh = it.h + BORDER * 2;
  /* bingkai kotak 1px */
  for (let i = 0; i < bw; i++) { px(it.bx + i, it.by, FRAME); px(it.bx + i, it.by + bh - 1, FRAME); }
  for (let i = 0; i < bh; i++) { px(it.bx, it.by + i, FRAME); px(it.bx + bw - 1, it.by + i, FRAME); }
  /* isi */
  P.blit(it.img, it.sx, it.sy, it.w, it.h, buf, sheetW, it.bx + BORDER, it.by + BORDER);
  /* nomor di bawah kotak */
  drawNum(idx, it.bx, it.by + bh + 1);
  /* koordinat ISI (bukan kotak) untuk JSON */
  it.ix = it.bx + BORDER;
  it.iy = it.by + BORDER;
});

P.writePNG(path.join(OUT, 'sprite-sheet.png'), sheetW, sheetH, buf);

/* ---- JSON mapping ---- */
const byName = {};
items.forEach((it, idx) => {
  const e = { i: idx, x: it.ix, y: it.iy, w: it.w, h: it.h };
  if (it.kind === 'atlas') e.atlas = true;
  /* Tile grid menyimpan posisi kolom/baris ASLINYA di berkas sumber,
     supaya tetap bisa dirujuk sebagai koordinat grid (mis. tile rumput
     di kolom 7 baris 0) walaupun sel kosong dilewati saat penomoran. */
  /* Blok terrain menyimpan posisi ASLINYA di berkas sumber (ox/oy)
     supaya tetap bisa dirujuk balik ke koordinat gambar aslinya. */
  if (it.kind === 'block') { e.ox = it.ox; e.oy = it.oy; }
  (byName[it.name] = byName[it.name] || { src: it.src, frames: [] }).frames.push(e);
});

const map = {
  _info: 'Pixel Adventure 1 (Pixel Frog, CC0) — dibangun oleh assets/build-sheet.cjs',
  _sheet: { w: sheetW, h: sheetH },
  _format: {
    border: BORDER, gap: GAP, frameColor: '#a020f0',
    note: 'x/y menunjuk ke ISI kotak (bingkai sudah dikecualikan). ' +
          'Nomor di bawah kotak = indeks "i". Item ber-atlas:true disimpan ' +
          'utuh; pakai grid.cw/ch untuk mengambil satu sel.'
  },
  count: items.length,
  groups: byName
};
fs.writeFileSync(path.join(OUT, 'sprite-map.json'), JSON.stringify(map, null, 1));

/* ---- ringkasan ---- */
const kb = (fs.statSync(path.join(OUT, 'sprite-sheet.png')).size / 1024).toFixed(1);
console.log('sheet     : ' + sheetW + 'x' + sheetH + '  (' + kb + ' kB)');
console.log('item      : ' + items.length + ' kotak, ' + Object.keys(byName).length + ' kelompok');
console.log('atlas     : ' + items.filter(i => i.kind === 'atlas').length);
console.log('kotak     : bingkai ' + BORDER + 'px ungu, jarak ' + GAP + 'px, nomor di bawah');
console.log('-> assets/sprite-sheet.png');
console.log('-> assets/sprite-map.json');
