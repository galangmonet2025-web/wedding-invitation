/* =====================================================================
   Suntik assets/sprite-map.json ke dalam index.js sebagai SHEET_MAP.
   ---------------------------------------------------------------------
   Kenapa perlu di-inline: ThemeWrapper host hanya menerima 3 string
   (html/css/js). Tema tidak punya berkas pendamping yang bisa di-fetch(),
   jadi peta harus ikut di dalam index.js.

   Bentuk yang ditulis sengaja RINGKAS — satu frame = array [i,x,y,w,h]
   alih-alih objek — supaya tidak menggelembungkan berkas. Peta lengkap
   773 frame turun dari ~90 kB (JSON objek) ke ~20 kB.

   Jalankan SETELAH build-sheet.cjs:
       node assets/build-sheet.cjs
       node assets/inline-map.cjs
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const JS = path.join(DIR, '..', 'index.js');
const MAP = path.join(DIR, 'sprite-map.json');

const BEGIN = '/* <<<SHEET_MAP:BEGIN — dibuat otomatis, jangan diedit tangan>>> */';
const END = '/* <<<SHEET_MAP:END>>> */';

const m = JSON.parse(fs.readFileSync(MAP, 'utf8'));

/* groups -> { nama: [[i,x,y,w,h], ...] }, atlas ditandai lewat cw/ch */
const out = {};
for (const [name, gr] of Object.entries(m.groups)) {
  out[name] = gr.frames.map(f => [f.i, f.x, f.y, f.w, f.h]);
}

const lines = [];
lines.push(BEGIN);
lines.push('/* Peta sprite sheet: nama kelompok -> daftar frame [i, x, y, w, h].');
lines.push('   i = nomor yang tercetak di bawah kotak pada sprite-sheet.png.');
lines.push('   x/y sudah menunjuk ke ISI kotak (bingkai ungu dikecualikan).');
lines.push('   Sheet ' + m._sheet.w + 'x' + m._sheet.h + ', ' + m.count + ' kotak, ' +
           Object.keys(out).length + ' kelompok. */');
lines.push('var SHEET_SIZE = { w: ' + m._sheet.w + ', h: ' + m._sheet.h + ' };');
lines.push('var SHEET_MAP = {');
const names = Object.keys(out);
names.forEach((n, idx) => {
  const frames = out[n].map(f => '[' + f.join(',') + ']').join(',');
  lines.push('  ' + JSON.stringify(n) + ': [' + frames + ']' + (idx < names.length - 1 ? ',' : ''));
});
lines.push('};');
lines.push(END);

const block = lines.join('\n');

let js = fs.readFileSync(JS, 'utf8');
const i = js.indexOf(BEGIN), j = js.indexOf(END);
if (i < 0 || j < 0) {
  console.error('GAGAL: penanda SHEET_MAP tidak ditemukan di index.js.');
  console.error('Tambahkan dua baris ini di index.js lebih dulu:');
  console.error('  ' + BEGIN);
  console.error('  ' + END);
  process.exit(1);
}
js = js.slice(0, i) + block + js.slice(j + END.length);
fs.writeFileSync(JS, js);

console.log('SHEET_MAP disuntik ke index.js');
console.log('  kelompok :', names.length);
console.log('  frame    :', m.count);
console.log('  besar    :', (Buffer.byteLength(block) / 1024).toFixed(1), 'kB');
