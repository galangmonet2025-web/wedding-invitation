/* Uji FONT BITMAP dari sheet + pesan power-up.

   Yang paling penting diuji: PETA URUTAN GLYPH. Kalau meleset satu saja,
   semua teks jadi acak — dan itu tidak akan ketahuan tanpa membandingkan
   bentuk piksel glyph dengan huruf yang seharusnya. */
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
let draws = [];
w.HTMLCanvasElement.prototype.getContext = function () { return {
  imageSmoothingEnabled: true,
  drawImage: (...a) => draws.push(a),
  getImageData: (x, y, a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }),
  fillRect(){}, clearRect(){}, fillText(){}, save(){}, restore(){}, translate(){},
  scale(){}, beginPath(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){},
  lineTo(){}, arc(){}, rect(){} }; };
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);

/* ---- 1. kelompok font ada & berukuran benar ---- */
const grp = map.groups['Menu/Text/Text (White)'];
ok(!!grp && grp.frames.length === 50, 'kelompok font punya 50 glyph');
ok(grp.frames.every(f => f.w === 8 && f.h === 10), 'tiap glyph 8x10');

/* ---- 2. PETA URUTAN benar — dibuktikan dari BENTUK PIKSEL ----
   Tiap huruf punya ciri bentuk yang bisa diperiksa tanpa mata:
   dibandingkan lebar baris atas/tengah/bawah & simetri. Di sini dipakai
   sidik jari sederhana: pola baris mana yang terisi. */
function glyphRows(idx) {
  const f = grp.frames[idx];
  const out = [];
  for (let y = 0; y < f.h; y++) {
    let s = '';
    for (let x = 0; x < f.w; x++) {
      const o = ((f.y + y) * sheet.w + (f.x + x)) * 4;
      s += sheet.data[o + 3] > 8 ? '#' : '.';
    }
    out.push(s);
  }
  return out;
}
const isEmpty = idx => glyphRows(idx).every(r => !r.includes('#'));

/* A (idx 0): atap sempit, badan lebar, ada lubang di tengah bawah */
const A = glyphRows(0);
ok(A[1].indexOf('#') > A[3].indexOf('#'), 'glyph 0 = A (puncak lebih sempit dari badan)');
ok(A[8].includes('.') && A[8].startsWith('.##'), 'glyph 0 = A (kaki terpisah)');

/* I (idx 8): kolom sempit di tengah, sama di semua baris */
const I = glyphRows(8);
const iCols = I.filter(r => r.includes('#')).map(r => r.indexOf('#'));
ok(new Set(iCols).size <= 2, 'glyph 8 = I (batang lurus)');

/* O (idx 14) simetris kiri-kanan */
const O = glyphRows(14);
ok(O.every(r => r === r.split('').reverse().join('')), 'glyph 14 = O (simetris)');

/* 26..29 KOSONG (sel spasi) */
ok([26,27,28,29].every(isEmpty), 'idx 26..29 kosong (sel spasi strip font)');
ok(!isEmpty(25) && !isEmpty(30), 'idx 25 (Z) & 30 (0) TIDAK kosong');

/* 40 = titik: hanya 2 baris terbawah terisi, di tengah */
const dot = glyphRows(40);
ok(dot.slice(0, 6).every(r => !r.includes('#')) && dot[7].includes('#'),
   'idx 40 = titik (hanya bawah-tengah)');

/* ---- 3. FONT_ORDER di kode cocok dgn temuan di atas ---- */
ok(w.FONT_ORDER.slice(0, 26) === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
   'FONT_ORDER 0..25 = A..Z');
ok(w.FONT_ORDER.slice(26, 30) === '    ', 'FONT_ORDER 26..29 = spasi');
ok(w.FONT_ORDER.slice(30, 40) === '0123456789', 'FONT_ORDER 30..39 = 0..9');
/* Strip punya 50 sel tapi hanya 49 yang terpakai — sel 49 memang kosong
   di sumbernya, jadi tidak dipetakan ke karakter apa pun. */
ok(w.FONT_ORDER.length === 49, 'FONT_ORDER memetakan 49 glyph (sel 49 kosong)');
ok(w.fontIndex('+') === 47 && w.fontIndex('-') === 48,
   "'+' -> 47 dan '-' -> 48 (bentuknya sudah diperiksa)");

/* ---- 4. fontIndex memetakan dgn benar ---- */
ok(w.fontIndex('A') === 0 && w.fontIndex('Z') === 25, 'A->0, Z->25');
ok(w.fontIndex('0') === 30 && w.fontIndex('9') === 39, '0->30, 9->39');
ok(w.fontIndex('a') === 0, 'huruf kecil dipetakan ke besar');
ok(w.fontIndex('.') === 40, 'titik -> 40');
ok(w.fontIndex('💌') < 0 && w.fontIndex('★') < 0, 'emoji & simbol tak dikenal -> -1');

/* ---- 5. renderText memotong glyph yang BENAR ---- */
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };
draws = [];
w.renderText('AZ', 2, 1);
ok(draws.length === 2, 'render "AZ" menggambar 2 glyph');
const fA = grp.frames[0], fZ = grp.frames[25];
ok(draws[0] && draws[0][1] === fA.x && draws[0][2] === fA.y,
   'glyph pertama ambil koordinat A (' + (draws[0] ? draws[0][1] + ',' + draws[0][2] : '-') + ')');
ok(draws[1] && draws[1][1] === fZ.x && draws[1][2] === fZ.y,
   'glyph kedua ambil koordinat Z');
/* jarak antar glyph = 8 + tracking, dikali skala */
ok(draws[1][5] - draws[0][5] === (8 + 1) * 2, 'jarak antar glyph benar (18px @2x)');

/* spasi tidak menggambar tapi tetap memajukan kursor */
draws = [];
w.renderText('A A', 2, 1);
ok(draws.length === 2, 'spasi tidak menggambar glyph');
ok(draws[1][5] - draws[0][5] === (8 + 1) * 2 * 2, 'spasi tetap memajukan kursor');

/* ---- 6. sheet belum ada -> null (bukan crash) ---- */
const saved = w._assetImg.sheet;
w._assetImg.sheet = null;
let threw = false, r;
try { r = w.renderText('TEST', 2, 1); } catch (e) { threw = true; }
ok(!threw && r === null, 'tanpa sheet: renderText null tanpa exception');
w._assetImg.sheet = saved;

/* ---- 7. fontCanRender menolak karakter yang tak ada ---- */
ok(w.fontCanRender('HALO DUNIA') === true, 'teks A-Z + spasi bisa dirender');
/* Tanda hubung TERNYATA ADA di strip (glyph 48) — ketahuan saat glyph
   47..48 dirender jadi ASCII, sebelumnya tidak dipetakan sama sekali. */
ok(w.fontCanRender('MELATI - BADAN MEMBESAR') === true,
   'pesan power-up (pakai tanda hubung) bisa dirender font sprite');
ok(w.fontCanRender('SKOR + 30') === true, "tanda '+' juga bisa dirender");
ok(w.fontCanRender('💌 KEPINGAN') === false, 'emoji -> tolak');

/* ---- 8. pesan power-up ada utk KETIGA jenis ---- */
const PI = w.POWERUP_INFO;
ok(PI && Object.keys(PI).length === 4, 'ada info untuk 4 power-up (termasuk buket)');
['melati','cincin','payung','buket'].forEach(k => {
  ok(PI[k] && PI[k].label && PI[k].effect, 'info power-up "' + k + '" lengkap');
});
ok(/toast\(info\.label/.test(js), 'takePowerup memunculkan toast');

/* DURASI DI TEKS HARUS COCOK DGN DURASI DI KODE.
   Dulu tes ini menuliskan angkanya sendiri ("8 DETIK"/"10 DETIK"), jadi
   ia ikut gagal begitu durasinya diseragamkan jadi 16 detik — padahal
   yang seharusnya dijaga bukan angka tertentu, melainkan KECOCOKAN
   antara teks yang dibaca pemain dan angka yang dipakai kode. Sekarang
   angkanya diambil dari PW_SEC, jadi berapa pun nilainya tetap terjaga. */
ok(w.PW_MS === w.PW_SEC * 1000,
   'PW_SEC turunan dari PW_MS (' + w.PW_MS + 'ms = ' + w.PW_SEC + 's)');
/* BUKET tidak lagi di sini: ia berlaku SAMPAI STAGE SELESAI, bukan berjam,
   jadi menuntutnya menyebut detik justru salah. */
['cincin','payung'].forEach(k => {
  ok(PI[k].effect.indexOf(w.PW_SEC + ' DETIK') > -1,
     k + ': teks menyebut ' + w.PW_SEC + ' detik, sama dgn kode -> "' +
     PI[k].effect + '"');
});
/* Aturan yang sama untuk buket, hanya isinya berbeda: teksnya harus
   mencerminkan bahwa ia tidak berjam. */
ok(PI.buket.effect.indexOf('DETIK') < 0 && /STAGE/.test(PI.buket.effect),
   'buket: teks menyatakan sampai stage selesai, bukan detik -> "' +
   PI.buket.effect + '"');
/* dan tidak ada durasi yang ditulis manual lagi di jalur power-up */
ok(!/powerupUntil = this\.time\.now \+ \d+/.test(js),
   'tidak ada angka durasi mentah — semuanya lewat PW_MS');

/* ---- 9. toast lama yang ber-emoji tetap utuh (fallback teks) ---- */
const el = w.document.getElementById('pwr-toast');
w.toast('💌 Kepingan didapat: Akad', 'ok', 1000);
ok(el.textContent.indexOf('💌') >= 0,
   'toast ber-emoji tetap memakai teks biasa (emoji tidak hilang)');

/* ---- 10. toast huruf besar memakai kanvas font ---- */
w.toast('HALO DUNIA', 'ok', 1000);
ok(el.querySelector('canvas.pwr-toast-bmp') !== null,
   'toast huruf besar dirender dgn font sprite (kanvas)');

/* ---- 11. KETERBACAAN: pesan PANJANG jangan dipaksa bitmap 1-baris kecil ----
   Dilaporkan user: "BUKET - TEMBAK SAMPAI STAGE SELESAI" tampil sangat kecil.
   Pesan sepanjang itu tidak muat 2x -> harus jatuh ke TEKS BIASA (bisa
   membungkus & sudah dibesarkan lewat CSS), bukan kanvas bitmap yang
   diperkecil sampai tak terbaca. */
w.toast('BUKET - TEMBAK SAMPAI STAGE SELESAI', 'ok', 1000);
ok(el.querySelector('canvas.pwr-toast-bmp') === null,
   'pesan panjang TIDAK dipaksa jadi kanvas bitmap kecil');
ok(el.textContent.indexOf('TEMBAK SAMPAI STAGE SELESAI') >= 0,
   'pesan panjang tampil sebagai teks biasa (bisa membungkus, terbaca)');

/* ---- 12. CSS: font-size toast fallback dinaikkan dari 12px ---- */
const css = require('fs').readFileSync('index.css', 'utf8');
const toastBlock = css.slice(css.indexOf('.pwr-toast {'),
                             css.indexOf('}', css.indexOf('.pwr-toast {')));
ok(!/font-size:\s*12px/.test(toastBlock),
   'toast tidak lagi 12px (nyaris tak terbaca di ponsel)');
ok(/font-size:\s*clamp\(/.test(toastBlock),
   'toast memakai font-size responsif clamp() supaya besar & ikut layar');
const clampM = /clamp\((\d+)px/.exec(toastBlock);
ok(clampM && +clampM[1] >= 14,
   'ukuran minimum toast >= 14px (' + (clampM ? clampM[1] : '?') + 'px)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
