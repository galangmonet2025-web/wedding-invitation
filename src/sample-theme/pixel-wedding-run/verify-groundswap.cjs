/* Membuktikan bug "isian tanah diubah tapi tidak ngaruh" dan perbaikannya.

   Model: Phaser TileSprite mem-BAKE pola-nya saat dibuat (fillPattern dari
   kanvas sumber). Menimpa kanvas tekstur di tempat — yang dilakukan
   redrawTexture() — TIDAK terlihat di TileSprite, hanya di Image/Sprite.
   setTexture(kunci-yang-sama) memaksa pola disusun ulang.

   Harness ini mereplikasi model itu, lalu menjalankan refreshGroundFill()
   YANG SESUNGGUHNYA dari index.js (diekstrak, bukan disalin ulang).

   Jalankan: node verify-groundswap.cjs */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

/* --- ambil fungsi refreshGroundFill apa adanya dari index.js --- */
const start = SRC.indexOf('function refreshGroundFill(');
if (start < 0) { console.error('refreshGroundFill tidak ditemukan'); process.exit(1); }
let depth = 0, end = -1;
for (let i = SRC.indexOf('{', start); i < SRC.length; i++) {
  if (SRC[i] === '{') depth++;
  else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const refreshGroundFill = new Function(
  SRC.slice(start, end) + '; return refreshGroundFill;')();

/* --- model minimal Phaser --- */
class Texture {                       /* kanvas yang bisa ditimpa di tempat */
  constructor(key, pixels) { this.key = key; this.pixels = pixels; }
}
class Image {                         /* membaca tekstur saat menggambar */
  constructor(tex) { this.type = 'Image'; this.texture = tex; }
  get drawn() { return this.texture.pixels; }
}
class TileSprite {                    /* mem-bake pola saat dibuat */
  constructor(tex) {
    this.type = 'TileSprite';
    this.texture = tex;
    this._pattern = tex.pixels;       /* <- salinan, inilah akar bug */
  }
  setTexture(key) {
    if (key !== this.texture.key) throw new Error('kunci beda');
    this._pattern = this.texture.pixels;   /* susun ulang dari sumber */
    return this;
  }
  get drawn() { return this._pattern; }
}

let fail = 0;
const ok = (c, label, extra) => {
  console.log((c ? '  PASS  ' : '  FAIL  ') + label + (c || !extra ? '' : ' -> ' + extra));
  if (!c) fail++;
};

/* --- susun scene seperti buildGround(): permukaan Image, isian TileSprite --- */
const texTop  = new Texture('t_gr_top_s0', 'RUMPUT-LAMA');
const texFill = new Texture('t_gr_s0', 'TANAH-LAMA');
const texPlat = new Texture('t_plat_mid', 'PIJAKAN-LAMA');

const surface  = new Image(texTop);          /* platforms.create(...) */
const fill     = new TileSprite(texFill);    /* add.tileSprite(...)   */
const platMid  = new TileSprite(texPlat);    /* tengah pijakan melayang */
const scene = { children: { list: [surface, fill, platMid] } };

console.log('\n=== 1. KONDISI AWAL ===');
ok(surface.drawn === 'RUMPUT-LAMA', 'permukaan menggambar tekstur lama');
ok(fill.drawn === 'TANAH-LAMA', 'isian menggambar tekstur lama');

console.log('\n=== 2. USER GANTI SPRITE (redrawTexture menimpa kanvas) ===');
texTop.pixels  = 'RUMPUT-BARU';
texFill.pixels = 'TANAH-BARU';
texPlat.pixels = 'PIJAKAN-BARU';

ok(surface.drawn === 'RUMPUT-BARU',
  'permukaan LANGSUNG ikut berubah (Image baca tekstur saat gambar)');
/* Inilah bug yang dilaporkan user: */
ok(fill.drawn === 'TANAH-LAMA',
  'BUG TERBUKTI: isian masih pola lama walau tekstur sudah ditimpa',
  fill.drawn);
ok(platMid.drawn === 'PIJAKAN-LAMA',
  'bug yang sama pada bagian TENGAH pijakan melayang');

console.log('\n=== 3. SETELAH refreshGroundFill() (perbaikan) ===');
const n = refreshGroundFill(scene);
ok(n === 2, 'menyegarkan tepat 2 TileSprite (Image dilewati)', 'dapat ' + n);
ok(fill.drawn === 'TANAH-BARU', 'isian tanah SEKARANG ikut berubah', fill.drawn);
ok(platMid.drawn === 'PIJAKAN-BARU', 'tengah pijakan ikut berubah', platMid.drawn);
ok(surface.drawn === 'RUMPUT-BARU', 'permukaan tetap benar (tidak rusak)');

console.log('\n=== 4. KETAHANAN ===');
ok(refreshGroundFill(null) === 0, 'scene null aman');
ok(refreshGroundFill({}) === 0, 'scene tanpa children aman');
ok(refreshGroundFill({ children: { list: [null, { type: 'TileSprite' }] } }) === 0,
  'objek rusak/tanpa tekstur dilewati, tidak melempar error');
const broken = new TileSprite(new Texture('x', 'a'));
broken.setTexture = () => { throw new Error('boom'); };
ok(refreshGroundFill({ children: { list: [broken] } }) === 0,
  'setTexture yang melempar error tidak menjatuhkan swap');

console.log('\n=== 5. TERPASANG DI JALUR SWAP ===');
ok(/if \(changed > 0\) refreshGroundFill\(sc\);/.test(SRC),
  'dipanggil dari liveApplySprites setelah tekstur digambar ulang');
const live = SRC.slice(SRC.indexOf('function liveApplySprites('),
                       SRC.indexOf('function refreshGroundFill('));
ok(live.lastIndexOf('refreshGroundFill') < live.lastIndexOf('return changed > 0'),
  'dipanggil SEBELUM return (bukan kode mati)');
ok(!/_groundFills/.test(SRC), 'tidak ada sisa pelacakan manual yang tak terpakai');

console.log('\n' + (fail === 0 ? '>>> SEMUA CEK LOLOS' : '>>> ' + fail + ' CEK GAGAL'));
process.exit(fail === 0 ? 0 : 1);
