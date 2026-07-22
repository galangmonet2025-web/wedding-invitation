/* =====================================================================
   Suntik assets/bg-map.json ke dalam index.js sebagai BG_MAP.
   ---------------------------------------------------------------------
   Alasannya sama dengan inline-map.cjs: ThemeWrapper host hanya menerima
   3 string (html/css/js), jadi tema tidak bisa fetch() berkas pendamping.
   Peta harus ikut di dalam index.js.

   Bentuknya RINGKAS — kunci lapis -> [x, y, w, h] — karena engine hanya
   perlu tahu di mana memotongnya.

   Jalankan SETELAH build-bg-sheet.cjs:
       node assets/build-bg-sheet.cjs
       node assets/inline-bg-map.cjs
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const JS = path.join(DIR, '..', 'index.js');
const MAP = path.join(DIR, 'bg-map.json');

const BEGIN = '/* <<<BG_MAP:BEGIN — dibuat otomatis, jangan diedit tangan>>> */';
const END = '/* <<<BG_MAP:END>>> */';

const m = JSON.parse(fs.readFileSync(MAP, 'utf8'));

const rows = m.items
  .slice()
  .sort((a, b) => a.i - b.i)
  .map(it => "  '" + it.key + "': [" + it.x + ',' + it.y + ',' + it.w + ',' + it.h + ']');

const block = [
  BEGIN,
  '/* Peta lapis latar: kunci lapis -> [x, y, w, h] di bg-sheet.png.',
  '   Koordinat menunjuk ke ISI kotak (bingkai ungu dikecualikan).',
  '   Sheet ' + m.w + 'x' + m.h + ', ' + m.items.length + ' lapis, stage 1-6.',
  '   Nomor yang tercetak di bawah tiap kotak = urutan di daftar ini. */',
  'var BG_SHEET_SIZE = { w: ' + m.w + ', h: ' + m.h + ' };',
  'var BG_MAP = {',
  rows.join(',\n'),
  '};',
  END,
].join('\n');

let js = fs.readFileSync(JS, 'utf8');
const a = js.indexOf(BEGIN);
const b = js.indexOf(END);
if (a < 0 || b < 0) {
  console.error('Penanda BG_MAP tidak ditemukan di index.js.');
  console.error('Pastikan blok berikut ada (boleh kosong isinya):');
  console.error('  ' + BEGIN);
  console.error('  ' + END);
  process.exit(1);
}
js = js.slice(0, a) + block + js.slice(b + END.length);
fs.writeFileSync(JS, js);

console.log('BG_MAP disuntik  : ' + m.items.length + ' lapis');
console.log('ukuran sheet     : ' + m.w + 'x' + m.h);
console.log('index.js diperbarui.');
