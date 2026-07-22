/* Uji dua keluhan mobile yang dilaporkan lewat tangkapan layar:

   1. "CONTROLLER PADA MOBILE TERLALU KE BAWAH SEHINGGA SULIT DIMAINKAN"
      Sebab: .pwr-frame memakai 100vh. Di browser mobile, 100vh = tinggi
      viewport TERBESAR (saat bilah alamat tersembunyi). Selama bilah
      alamat terlihat — dan pada undangan yang dibuka dari tautan, ia
      hampir selalu terlihat — dasar frame berada DI BALIK bilah itu,
      membawa serta joystick & tombol lompat.

   2. "TEXT PADA GAME TERLIHAT DOUBLE DAN SUSAH DI BACA (SKOR, STAGE)"
      Sebab: text-shadow offset 2px pada huruf 12-13px. Pada teks
      sekecil itu, bayangan 2px hampir sepertiga tinggi huruf sehingga
      terbaca sebagai SALINAN KEDUA, bukan bayangan. Diperparah
      -webkit-font-smoothing:none yang membuat kedua lapisan bertepi
      keras.

   Diuji dari ATURAN CSS yang benar-benar ada (diurai, bukan dicocokkan
   sebagai teks bebas). */
const fs = require('fs');

const css = fs.readFileSync('index.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

/* Ambil badan sebuah blok selector.
   CATATAN (jebakan yang sempat membuat tes ini salah lapor): selector
   yang sama sering muncul DUA KALI — sekali di aturan utama, sekali di
   dalam @media untuk desktop. Mengambil yang terakhir akan membaca
   aturan desktop (mis. `.pwr-touch{opacity:0}`) dan menyimpulkan
   properti mobile-nya hilang. Karena yang diuji di sini adalah tata
   letak MOBILE (aturan dasar, di luar @media), yang diambil adalah
   kemunculan PERTAMA yang benar-benar memuat properti yang dicari. */
/* Diurai dengan pemindaian teks biasa, BUKAN regex yang dirakit dari
   nama selector: selector CSS penuh karakter yang bermakna khusus di
   regex ('.', '>', '*'), dan merakitnya jadi pola adalah sumber salah
   lapor yang sulit dilihat. */
function bodies(sel) {
  const out = [];
  let i = 0;
  for (;;) {
    const at = css.indexOf(sel, i);
    if (at < 0) break;
    i = at + sel.length;
    /* harus benar-benar AWAL selector, bukan bagian dari nama lain
       (mis. '.pwr-hud-row' vs '.pwr-hud-row-2') */
    const before = at === 0 ? '\n' : css[at - 1];
    if (!/[\s{};,>]/.test(before) && at !== 0) continue;
    let j = i;
    while (j < css.length && /[\s]/.test(css[j])) j++;
    if (css[j] !== '{') continue;              /* ada lanjutan nama/selector */
    const end = css.indexOf('}', j);
    if (end < 0) break;
    out.push(css.slice(j + 1, end));
  }
  return out;
}
function prop(sel, name) {
  const re = new RegExp('(?:^|;)\\s*' + name + '\\s*:([^;]*)', 'i');
  const list = bodies(sel);
  for (let i = 0; i < list.length; i++) {
    const m = re.exec(list[i]);
    if (m) return m[1].trim();
  }
  return null;
}

/* ---------------------------------------------------------------
   1. KONTROL SENTUH
   --------------------------------------------------------------- */
ok(/@supports\s*\(height:\s*100dvh\)/.test(css),
   'ada aturan @supports untuk 100dvh (tinggi viewport yang benar-benar terlihat)');
ok(/@supports[^{]*\{[^}]*\.pwr-frame\s*\{[^}]*height:\s*100dvh/.test(css),
   '.pwr-frame memakai 100dvh saat browser mendukungnya');
ok(prop('.pwr-frame', 'height') === '100vh',
   '100vh tetap ada sebagai cadangan untuk browser lama (dapat: ' +
   prop('.pwr-frame', 'height') + ')');

const touchBottom = prop('.pwr-touch', 'bottom');
ok(!!touchBottom && /env\(safe-area-inset-bottom\)/.test(touchBottom),
   'kontrol menghormati safe-area bawah (poni/indikator gestur)');
const px = /(\d+)px/.exec(touchBottom || '');
ok(px && +px[1] >= 24,
   'kontrol diangkat >=24px dari dasar — di luar jangkauan gestur sistem ' +
   '"geser dari bawah" dan lebih mudah dijangkau ibu jari (dapat: ' +
   (px ? px[1] : '?') + 'px)');

/* tombol lompat & joystick cukup besar untuk disentuh (>=44px, pedoman umum) */
const jumpW = parseInt(prop('.pwr-btn-jump', 'width'), 10);
const jumpH = parseInt(prop('.pwr-btn-jump', 'height'), 10);
ok(jumpW >= 44 && jumpH >= 44,
   'tombol lompat >=44px (' + jumpW + 'x' + jumpH + ')');
const joyW = parseInt(prop('.pwr-joy-base', 'width'), 10);
ok(joyW >= 44, 'joystick >=44px (' + joyW + 'px)');

/* keduanya harus muat di dalam tinggi .pwr-touch, kalau tidak akan terpotong */
const touchH = parseInt(prop('.pwr-touch', 'height'), 10);
const jumpBottom = parseInt(prop('.pwr-btn-jump', 'bottom'), 10);
const joyBottom  = parseInt(prop('.pwr-joy', 'bottom'), 10);
ok(jumpBottom + jumpH <= touchH,
   'tombol lompat muat di dalam area kontrol (' +
   (jumpBottom + jumpH) + ' <= ' + touchH + ')');
ok(joyBottom + joyW <= touchH,
   'joystick muat di dalam area kontrol (' + (joyBottom + joyW) + ' <= ' + touchH + ')');

/* TOMBOL TEMBAK tidak boleh bertabrakan dgn JMP maupun joystick.
   Layar acuan 320px (ponsel terkecil yang masih lazim). */
const shR = parseInt(prop('.pwr-btn-shoot', 'right'), 10);
const shW = parseInt(prop('.pwr-btn-shoot', 'width'), 10);
const shH = parseInt(prop('.pwr-btn-shoot', 'height'), 10);
const shB = parseInt(prop('.pwr-btn-shoot', 'bottom'), 10);
const jmpR = parseInt(prop('.pwr-btn-jump', 'right'), 10);
const joyL = parseInt(prop('.pwr-joy', 'left'), 10);
ok(shR >= jmpR + jumpW,
   'tombol tembak tidak menimpa tombol lompat (jarak ' +
   (shR - jmpR - jumpW) + 'px)');
ok(joyW + joyL + shR + shW <= 320,
   'tombol tembak + joystick masih muat di layar 320px (' +
   (joyW + joyL + shR + shW) + 'px)');
ok(shB + shH <= touchH,
   'tombol tembak muat di dalam area kontrol (' + (shB + shH) + ' <= ' + touchH + ')');
ok(shW >= 44 && shH >= 44, 'tombol tembak >=44px (' + shW + 'x' + shH + ')');

/* tetap disembunyikan di desktop */
ok(/@media \(hover: hover\) and \(pointer: fine\)[^{]*\{[\s\S]{0,120}?\.pwr-touch\s*\{[^}]*opacity:\s*0/.test(css),
   'kontrol sentuh tetap disembunyikan di desktop berkeyboard');

/* ---------------------------------------------------------------
   2. TEKS HUD TIDAK DOBEL
   --------------------------------------------------------------- */
const hudShadow = prop('.pwr-hud', 'text-shadow');
ok(!hudShadow,
   'bayangan 2px pada .pwr-hud SUDAH DIBUANG (itu penyebab teks terlihat dobel)' +
   (hudShadow ? ' -> masih ada: ' + hudShadow : ''));

const rowShadow = prop('.pwr-hud-row > *', 'text-shadow');
ok(!!rowShadow, 'HUD tetap punya kontras lewat garis luar');
/* SEMUA offset harus <=1px: 2px pada teks ~13px = terbaca sebagai salinan */
const offsets = (rowShadow || '').match(/-?\d+px/g) || [];
const tooBig = offsets.filter(o => Math.abs(parseInt(o, 10)) > 1);
ok(offsets.length >= 4,
   'garis luar dipasang di 4 arah (' + offsets.length + ' nilai offset)');
ok(tooBig.length === 0,
   'tidak ada offset bayangan >1px pada teks HUD' +
   (tooBig.length ? ' -> ' + tooBig.join(', ') : ''));

/* latar solid = sumber kontras utama, bukan duplikat huruf */
const bg = prop('.pwr-hud-row > *', 'background');
ok(!!bg && /rgba?\(/.test(bg),
   'teks HUD duduk di atas kotak solid gelap (kontras dari latar, bukan dari salinan huruf)');

/* ukuran huruf naik supaya terbaca di layar kecil */
const f1 = parseFloat(prop('.pwr-hud-row', 'font-size'));
const f2 = parseFloat(prop('.pwr-hud-row-2', 'font-size'));
ok(f1 >= 13, 'baris HUD utama >=13px (dapat ' + f1 + 'px)');
ok(f2 >= 11, 'baris HUD kedua >=11px (dapat ' + f2 + 'px)');

/* elemen HUD yang dirujuk JS harus tetap ada */
['pwr-score', 'pwr-stage-num', 'pwr-piece-count', 'pwr-powerup-chip']
  .forEach(id => ok(html.indexOf('id="' + id + '"') > -1,
                    'elemen HUD #' + id + ' masih ada'));

/* HUD tidak boleh menangkap sentuhan (harus tembus ke game) */
ok(prop('.pwr-hud', 'pointer-events') === 'none',
   'HUD tidak menghalangi sentuhan ke area game');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
