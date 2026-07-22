/* Memverifikasi alur "latar dari berkas unggahan":
     bg-sheet.png  ->  BG_MAP  ->  bgTextureFromSheet()  ->  mkLayer/sky/sun

   Yang paling penting dicek: KUNCI yang ditulis exporter harus SAMA
   PERSIS dengan kunci yang diminta engine saat membangun stage. Kalau
   meleset satu huruf, sheet terunggah tapi latar tetap prosedural dan
   tidak ada pesan error apa pun — gagal diam-diam.

   Jalankan: node verify-bgsheet.cjs */
const fs = require('fs');
const path = require('path');
const P = require(path.join(__dirname, 'assets', 'png.cjs'));

const SRC = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'bg-map.json'), 'utf8'));

let fail = 0;
const ok = (c, label, extra) => {
  console.log((c ? '  PASS  ' : '  FAIL  ') + label + (c || !extra ? '' : ' -> ' + extra));
  if (!c) fail++;
};

console.log('\n=== 1. BERKAS ADA ===');
const pngPath = path.join(__dirname, 'assets', 'bg-sheet.png');
ok(fs.existsSync(pngPath), 'assets/bg-sheet.png ada');
const img = P.readPNG(pngPath);
ok(img.w === map.w && img.h === map.h, 'ukuran PNG cocok dengan peta',
  img.w + 'x' + img.h + ' vs ' + map.w + 'x' + map.h);

console.log('\n=== 2. SLOT UNGGAHAN ===');
ok(/\{ slot: 2, name: 'bg',\s*file: 'bg-sheet\.png' \}/.test(SRC),
  'slot 2 terdaftar di ASSETS');
ok(/data-asset="bg" src="\{\{asset_image_2\}\}"/.test(HTML),
  'tag <img data-asset="bg"> memakai {{asset_image_2}}');

console.log('\n=== 3. BG_MAP TERSUNTIK ===');
const mapBlock = SRC.slice(SRC.indexOf('var BG_MAP = {'), SRC.indexOf('<<<BG_MAP:END'));
const keysInJs = [...mapBlock.matchAll(/'([^']+)':\s*\[/g)].map(m => m[1]);
ok(keysInJs.length === map.items.length,
  'jumlah lapis di index.js == bg-map.json', keysInJs.length + ' vs ' + map.items.length);
ok(new Set(keysInJs).size === keysInJs.length, 'tidak ada kunci duplikat');

console.log('\n=== 4. KUNCI COCOK DENGAN YANG DIMINTA ENGINE ===');
/* Kunci yang benar-benar dipakai engine, dibaca dari kode aslinya. */
const wanted = new Set();
for (let sid = 0; sid < 6; sid++) {
  wanted.add('sky_' + sid);
  wanted.add('_sun_' + sid);
}
/* mkLayer('pwr_xxx_' + S.id, ...) -> kumpulkan prefiksnya dari sumber */
const par = SRC.slice(SRC.indexOf('GameScene.prototype.buildParallax'));
const prefixes = [...new Set([...par.matchAll(/mkLayer\('([a-z0-9_]+?)_'\s*\+\s*S\.id/g)]
  .map(m => m[1]))];
ok(prefixes.length >= 8, 'prefiks lapis parallax terbaca dari kode', prefixes.join(','));
for (const p of prefixes) for (let sid = 0; sid < 6; sid++) wanted.add(p + '_' + sid);

const have = new Set(keysInJs);
/* Tiap kunci di peta HARUS termasuk yang mungkin diminta engine. */
const asing = keysInJs.filter(k => !wanted.has(k));
ok(asing.length === 0, 'tidak ada kunci asing di peta', asing.slice(0, 4).join(','));
/* Sebaliknya: kunci yang diekspor harus mencakup lapis inti tiap stage. */
for (let sid = 0; sid < 6; sid++) {
  ok(have.has('sky_' + sid), 'stage ' + (sid + 1) + ': langit ada di peta');
  ok(have.has('pwr_far_' + sid), 'stage ' + (sid + 1) + ': siluet jauh ada di peta');
}

console.log('\n=== 5. KOORDINAT VALID ===');
let bad = 0, oob = 0;
for (const it of map.items) {
  if (it.w <= 0 || it.h <= 0) bad++;
  if (it.x < 0 || it.y < 0 || it.x + it.w > map.w || it.y + it.h > map.h) oob++;
}
ok(bad === 0, 'semua kotak berukuran positif');
ok(oob === 0, 'tidak ada kotak di luar batas gambar');
/* tumpang tindih akan membuat dua lapis saling mencuri piksel */
let clash = 0;
for (let i = 0; i < map.items.length; i++) {
  for (let j = i + 1; j < map.items.length; j++) {
    const a = map.items[i], b = map.items[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) clash++;
  }
}
ok(clash === 0, 'tidak ada kotak yang tumpang tindih', String(clash));

console.log('\n=== 6. BINGKAI UNGU DI LUAR AREA POTONG ===');
/* Koordinat peta harus menunjuk ISI kotak; bingkai ungu tepat di
   sebelah luarnya. Kalau meleset, garis ungu ikut terpotong dan
   muncul sebagai garis di dalam game. */
const px = (x, y) => { const o = (y * img.w + x) * 4; return [img.data[o], img.data[o + 1], img.data[o + 2]]; };
const isUngu = c => c[0] === 0xa0 && c[1] === 0x20 && c[2] === 0xf0;
let frameOK = 0, bleed = 0;
for (const it of map.items) {
  if (isUngu(px(it.x - 1, it.y - 1))) frameOK++;
  /* piksel paling kiri-atas ISI tidak boleh ungu */
  if (isUngu(px(it.x, it.y))) bleed++;
}
ok(frameOK === map.items.length, 'setiap kotak berbingkai ungu', frameOK + '/' + map.items.length);
ok(bleed === 0, 'bingkai TIDAK ikut masuk area potong', String(bleed));

console.log('\n=== 7. TERPASANG DI ENGINE ===');
ok(/function bgTextureFromSheet\(/.test(SRC), 'bgTextureFromSheet() ada');
const mk = SRC.slice(SRC.indexOf('GameScene.prototype.mkLayer'),
                     SRC.indexOf('GameScene.prototype.mkLayer') + 900);
ok(/if \(!bgTextureFromSheet\(this, key, w, h\)\)/.test(mk),
  'mkLayer mencoba sheet dulu, prosedural sebagai cadangan');
ok(/bgTextureFromSheet\(this, skyKey, BW, BH\)/.test(SRC), 'langit ikut jalur sheet');
ok(/bgTextureFromSheet\(this, sunKey, BW, BH\)/.test(SRC), 'matahari/bintang ikut jalur sheet');
/* Fallback WAJIB: undangan yang sudah live tidak boleh rusak kalau
   slot 2 dikosongkan. */
const fn = SRC.slice(SRC.indexOf('function bgTextureFromSheet('),
                     SRC.indexOf('var _assetImg = {}'));
ok(/if \(!img\) return false;/.test(fn), 'sheet belum diunggah -> kembali prosedural');
ok(/if \(!box\) return false;/.test(fn), 'kunci tak ada di peta -> kembali prosedural');
ok(/return false;\s*\}\s*$/m.test(fn) || /catch \(e\) \{ return false; \}/.test(fn),
  'error saat memotong -> kembali prosedural');
ok(/imageSmoothingEnabled = false/.test(fn), 'pixel art tidak diperhalus');

console.log('\n=== 8. RINGKASAN ISI ===');
for (let s = 1; s <= 6; s++) {
  const r = map.items.filter(m => m.stage === s);
  console.log('  Stage ' + s + ': ' + r.length + ' lapis  (#' + r[0].i + '-#' + r[r.length - 1].i + ')');
}

console.log('\n' + (fail === 0 ? '>>> SEMUA CEK LOLOS' : '>>> ' + fail + ' CEK GAGAL'));
process.exit(fail === 0 ? 0 : 1);
