/* Uji KONTRAS TEKS pada seluruh index.css.

   Dilaporkan user (dgn tangkapan layar dialog "PILIH STAGE & KESULITAN"):
   "ini stylingnya kok setengah-setengah ya, disitu masih ada yg sulit
   dibaca textnya".

   SEBABNYA (terukur, bukan selera): palet tema pernah DIBALIK dari panel
   gelap menjadi kertas terang. Sebagian aturan warna ikut diperbarui,
   sebagian tertinggal memakai warna yang dulu benar di atas panel gelap.
   Yang paling parah:

     .pwr-stage-cell b  ->  color #f7b500 (emas) di atas #ffd93d (kuning)
                            = rasio 1.32:1  (praktis kuning di atas kuning)

   Itulah "setengah-setengah" yang dilihat user: bukan gaya yang tidak
   selesai, tapi peninggalan palet lama.

   Cacat kedua: teks diredupkan dengan `opacity`. Di atas latar TERANG,
   opacity menarik warna teks MENDEKATI warna latar, jadi justru
   menghapus kontras. Hierarki harus dibuat dgn WARNA yang lebih lembut
   tapi tetap pekat.

   Ambang yang dipakai = WCAG AA: 4.5:1 teks biasa, 3.0:1 teks besar
   (>=16px atau >=14px tebal). */
const fs = require('fs');
const cssRaw = fs.readFileSync('index.css', 'utf8');
/* KOMENTAR DIBUANG DULU.
   Komentar CSS di berkas ini panjang dan sering memuat '{' atau '}'
   (contoh kode, rumus). Kalau dibiarkan, pemisah blok ikut memotong di
   dalam komentar dan selector jadi salah baca — itu yang membuat tiga
   uji di bawah gagal palsu padahal CSS-nya sudah benar. */
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

/* ---- palet ---- */
const vars = {};
/* SEMUA variabel warna, bukan hanya --pwr-*. Panel undangan memakai
   keluarga --dok-* (dan sebagiannya rgba); membatasi ke --pwr- membuat
   seluruh dialog undangan — menu, modal kepingan, halaman baca — lolos
   tanpa pernah diperiksa. */
(css.match(/--[a-z0-9-]+:\s*(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/g) || []).forEach(s => {
  const i = s.indexOf(':');
  vars[s.slice(0, i).trim()] = s.slice(i + 1).trim();
});
ok(Object.keys(vars).length > 10,
   'palet terbaca (' + Object.keys(vars).length + ' variabel warna)');

/* Semua warna yang mungkin jadi latar sebuah deklarasi.
   Latar bisa berupa GRADIEN dgn beberapa perhentian warna; teks harus
   terbaca di atas SEMUANYA, jadi yang diuji adalah perhentian dengan
   kontras TERBURUK — bukan cuma yang pertama. */
/* rgba(r,g,b,a) -> {hex, a}. TITIK BUTA yang membuat versi pertama uji
   ini melaporkan "semua lulus" padahal tombol "Langsung buka undangan
   saja" dan "BATAL" nyaris tak terbaca: warnanya ditulis rgba(), dan
   parser lama HANYA mengenali #rrggbb sehingga aturan itu dilewati
   diam-diam. Warna yang tidak dikenali WAJIB dilaporkan, bukan
   dilewati — itu bedanya "sudah diperiksa" dengan "tidak diperiksa". */
function parseRgba(v) {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(v);
  if (!m) return null;
  const h = '#' + [1, 2, 3].map(i =>
    (+m[i]).toString(16).padStart(2, '0')).join('');
  return { hex: h, a: m[4] === undefined ? 1 : parseFloat(m[4]) };
}
/* Campur warna depan ber-alpha di atas latar -> warna tampak nyata. */
function over(fgHex, a, bgHex) {
  const f = parseInt(fgHex.slice(1), 16), b = parseInt(bgHex.slice(1), 16);
  const mix = (s, t) => Math.round(s * a + t * (1 - a));
  return '#' + [16, 8, 0].map(sh =>
    mix((f >> sh) & 255, (b >> sh) & 255).toString(16).padStart(2, '0')).join('');
}
function hexAll(v) {
  v = (v || '').trim();
  const out = [];
  const varRe = /var\((--[a-z0-9-]+)\)/g;
  let m;
  while ((m = varRe.exec(v))) {
    const resolved = vars[m[1]];
    if (!resolved) continue;
    const rg = parseRgba(resolved);
    out.push(rg ? rg.hex : expand(resolved));
  }
  /* #rgb MAUPUN #rrggbb. Bentuk 3 digit ('#fff') dulu tidak dikenali,
     jadi seluruh tombol berteks putih lolos tanpa diperiksa. */
  const hRe = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  while ((m = hRe.exec(v))) out.push(expand(m[0]));
  const rgRe = /rgba?\([^)]*\)/g;
  while ((m = rgRe.exec(v))) {
    const rg = parseRgba(m[0]);
    if (rg) out.push(rg.hex);
  }
  return out;
}
/* '#fff' -> '#ffffff' */
function expand(h) {
  if (h.length !== 4) return h;
  return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
}
function hex(v) {
  const a = hexAll(v);
  return a.length ? a[0] : null;
}
function lum(h) {
  const c = parseInt(h.slice(1), 16);
  const s = [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255]
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}
function ratio(a, b) {
  const l1 = Math.max(lum(a), lum(b)), l2 = Math.min(lum(a), lum(b));
  return (l1 + 0.05) / (l2 + 0.05);
}

/* ---- kumpulkan blok aturan ---- */
const blocks = [];
const re = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = re.exec(css))) {
  const raw = m[1].trim();
  if (raw.startsWith('@')) continue;   /* '%' dulu ikut dibuang -> blok sah ikut terlewat */
  const body = m[2];
  const get = p => {
    const x = new RegExp('(?:^|;)\\s*' + p + '\\s*:\\s*([^;]+)').exec(body);
    return x ? x[1].trim() : null;
  };
  /* selector boleh berupa daftar "a, b" — pecah */
  raw.split(',').map(s => s.trim()).filter(Boolean).forEach(sel => {
    blocks.push({
      sel: sel,
      color: get('color'),
      bg: get('background(?:-color)?'),
      fs: get('font-size'),
      fw: get('font-weight'),
      op: get('opacity')
    });
  });
}
ok(blocks.length > 50, 'aturan CSS terurai (' + blocks.length + ' blok)');

/* Latar EFEKTIF sebuah selector: dari dirinya sendiri, atau dari
   selector INDUK terdekat (paling spesifik) yang menetapkan latar.
   Induk = selector yang menjadi awalan, mis. '.pwr-stage-cell' untuk
   '.pwr-stage-cell b'. Yang dipilih adalah yang TERPANJANG (terdekat),
   bukan yang terakhir ditemukan — kesalahan itu membuat versi pertama
   uji ini melewatkan bug yang justru sedang dicari. */
/* Latar sebuah selector, SUDAH memperhitungkan alpha.
   `background: rgba(201,69,44,.12)` hanya MEWARNAI TIPIS apa pun yang
   ada di belakangnya. Menganggapnya warna padat membuat uji ini
   melaporkan "teks di atas karang pekat" untuk sesuatu yang sebenarnya
   hampir sepenuhnya sewarna induknya — tiga laporan gagal palsu.

   Ditelusuri berjenjang: kalau latar sebuah lapis semi-transparan,
   campurkan ke latar lapis di belakangnya, terus ke atas. */
/* DASAR PER-WILAYAH. Tema ini punya DUA permukaan yang sangat berbeda:
     - layar game & dialognya  -> panel GELAP (--pwr-panel)
     - panel/halaman undangan  -> kertas TERANG (--pwr-doc-bg)
   Memakai satu dasar untuk keduanya membuat elemen undangan dinilai
   seolah duduk di panel gelap (dan sebaliknya) — lima laporan gagal
   palsu. Wilayah ditentukan dari nama selectornya. */
const DOC_PREFIX = ['.pwr-side', '.pwr-thanks', '.pwr-sec', '.pwr-modal-body',
                    '.pwr-reveal-body', '.pwr-menu-box', '.pwr-lv', '.pwr-cd',
                    '.pwr-foot', '.pwr-event', '.pwr-tl', '.pwr-couple',
                    '.pwr-cart', '.pwr-input', '.pwr-mq', '.pwr-menu-item', '.pwr-menu-'];
function baseFor(sel) {
  const doc = DOC_PREFIX.some(p => sel === p || sel.startsWith(p));
  return doc ? hexAll('var(--pwr-doc-bg)') : hexAll('var(--pwr-panel)');
}
function bgFor(sel, depth) {
  depth = depth || 0;
  if (depth > 6) return null;           /* jaga-jaga rantai melingkar */
  let ownRaw = null, parentSel = null, parentLen = -1;
  for (const b of blocks) {
    if (!b.bg) continue;
    const isClear = /^\s*(transparent|none)\b/.test(b.bg);
    if (!isClear && !hexAll(b.bg).length) continue;
    /* Deklarasi TERAKHIR yang menang (urutan CSS) — termasuk kalau yang
       terakhir itu `transparent`. `background: transparent` MEMBATALKAN
       latar sebelumnya, bukan mempertahankannya; tanpa aturan ini,
       tombol peta versi "ghost" (transparan, teks karang) dinilai
       seolah masih berlatar gradien karang penuh -> 1.00:1 palsu. */
    if (b.sel === sel) { ownRaw = isClear ? null : b.bg; continue; }
    if (isClear) continue;
    else if (sel.startsWith(b.sel + ' ') || sel.startsWith(b.sel + '.')) {
      if (b.sel.length > parentLen) { parentLen = b.sel.length; parentSel = b.sel; }
    }
  }
  if (ownRaw) {
    const rg = parseRgba(ownRaw);
    if (rg && rg.a < 1) {
      const base = (parentSel && bgFor(parentSel, depth + 1)) || baseFor(sel);
      return base.map(b => over(rg.hex, rg.a, b));
    }
    return hexAll(ownRaw);
  }
  if (parentSel) return bgFor(parentSel, depth + 1);
  return null;
}
/* Kontras terburuk terhadap seluruh perhentian latar. */
function worstRatio(fg, bgList) {
  let worst = Infinity;
  bgList.forEach(b => { const r = ratio(fg, b); if (r < worst) worst = r; });
  return worst;
}

/* ---- UJI PEMBUKTIAN: alat ini harus bisa menangkap bug aslinya ----
   Tanpa ini, hasil "semua lulus" tidak berarti apa-apa. */
(function selfTest() {
  /* Dipakai warna HARFIAH, bukan variabel palet: uji-diri harus tetap
     bermakna berapa kali pun paletnya diganti. Versi sebelumnya
     memakai --pwr-gold/--pwr-panel-2, jadi begitu palet diganti ke
     biru laut ia malah "gagal" karena kombinasinya tidak lagi buruk —
     padahal yang diuji adalah ALAT UKURNYA, bukan paletnya. */
  const yellowOnYellow = ratio('#f7b500', '#ffd93d');   /* bug asli user */
  ok(yellowOnYellow < 3.0,
     'UJI-DIRI: emas-di-atas-kuning (bug yang dilaporkan) terdeteksi gagal (' +
     yellowOnYellow.toFixed(2) + ':1) — alat ukur terbukti bekerja');
  ok(ratio('#ffffff', '#000000') > 20,
     'UJI-DIRI: putih vs hitam terhitung kontras maksimum (' +
     ratio('#ffffff', '#000000').toFixed(1) + ':1)');
  /* alpha benar-benar diperhitungkan */
  const faded = over('#ffffff', 0.1, '#ffffff');
  ok(ratio(faded, '#ffffff') < 1.1,
     'UJI-DIRI: teks ber-alpha rendah di latar sewarna terdeteksi tak terbaca');

  /* PALET SEKARANG: teks utama vs panel & kertas */
  const onPanel = ratio(hex('var(--pwr-cream)'), hex('var(--pwr-panel)'));
  ok(onPanel >= 4.5,
     'teks utama di panel game lolos (' + onPanel.toFixed(2) + ':1)');
  const onPaper = ratio(hex('var(--pwr-doc-text)'), hex('var(--pwr-doc-bg)'));
  ok(onPaper >= 4.5,
     'tinta utama di kertas undangan lolos (' + onPaper.toFixed(2) + ':1)');
})();

/* ---- sapu seluruh stylesheet ----
   ALPHA & OPACITY diperhitungkan sungguhan, bukan dikira-kira:
   teks rgba(...,.72) di atas kertas terang benar-benar memudar ke arah
   warna kertas, dan `opacity` melakukan hal yang sama pada SELURUH
   elemen. Keduanya dihitung dgn mencampur warna depan ke latar. */
/* Warna teks yang BERLAKU untuk sebuah selector = deklarasi color
   TERAKHIR untuknya. Selector yang sama sering ditulis dua kali (versi
   dasar lalu versi "ghost"); memakai yang pertama membuat uji ini
   memasangkan teks versi lama dgn latar versi baru. */
function colorOf(sel) {
  let last = null;
  for (const b of blocks) if (b.sel === sel && b.color) last = b.color;
  return last;
}
const bad = [], skipped = [], seenSel = new Set();
blocks.forEach(b => {
  if (!b.color) return;
  if (seenSel.has(b.sel)) return;        /* satu selector diuji sekali */
  seenSel.add(b.sel);
  b = { ...b, color: colorOf(b.sel) };
  const bgList = bgFor(b.sel);
  if (!bgList) return;                   /* latar tak diketahui */
  const fgList = hexAll(b.color);
  if (!fgList.length) { skipped.push(b.sel + '  color:' + b.color); return; }
  let fg = fgList[0];

  /* alpha pada warna teks + opacity elemen -> gabungkan */
  const rg = parseRgba(b.color) ||
             (/var\(/.test(b.color) ? parseRgba(vars[/var\((--[a-z0-9-]+)\)/.exec(b.color)[1]] || '') : null);
  let alpha = rg ? rg.a : 1;
  if (b.op) alpha *= parseFloat(b.op);

  const size = b.fs ? parseFloat(b.fs) : 12;
  const boldish = b.fw && parseInt(b.fw, 10) >= 700;
  const need = (size >= 16 || (size >= 14 && boldish)) ? 3.0 : 4.5;

  let worst = Infinity, worstBg = null;
  bgList.forEach(bgc => {
    const eff = alpha < 1 ? over(fg, alpha, bgc) : fg;
    const r = ratio(eff, bgc);
    if (r < worst) { worst = r; worstBg = bgc; }
  });
  if (worst < need) {
    bad.push(b.sel + '  ' + worst.toFixed(2) + ':1 (butuh ' + need + ')  ' +
             b.color + ' di atas ' + worstBg +
             (alpha < 1 ? '  [alpha efektif ' + alpha.toFixed(2) + ']' : ''));
  }
});
/* Warna yang TIDAK bisa diurai harus terlihat, bukan hilang diam-diam. */
ok(skipped.length === 0,
   'tidak ada warna teks yang gagal diurai (kalau ada, ia LOLOS tanpa ' +
   'diperiksa — persis bagaimana rgba() dulu terlewat)' +
   (skipped.length ? '\n        -> ' + skipped.join('\n        -> ') : ''));
ok(bad.length === 0,
   'semua teks memenuhi ambang kontras' +
   (bad.length ? '\n        -> ' + bad.join('\n        -> ') : ''));

/* ---- aturan khusus dialog yang dikeluhkan ---- */
/* Nilai properti untuk sebuah selector.
   JANGAN berhenti di blok TERAKHIR yang namanya cocok: selector yang
   sama sering muncul lagi di dalam @media (mis. penyesuaian desktop)
   TANPA properti yang dicari, dan versi pertama fungsi ini
   mengembalikan null di situ — membuat tiga uji gagal palsu padahal
   CSS-nya benar. Yang benar: cari blok cocok yang BENAR-BENAR punya
   properti itu, ambil yang terakhir (menang menurut urutan CSS). */
function propOf(sel, p) {
  let found = null;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].sel === sel && blocks[i][p]) found = blocks[i][p];
  }
  return found;
}
const numCol = hex(propOf('.pwr-stage-cell b', 'color'));
const cellBg = bgFor('.pwr-stage-cell b');
ok(numCol && cellBg && worstRatio(numCol, cellBg) >= 4.5,
   'NOMOR STAGE terbaca jelas (' +
   (numCol && cellBg ? worstRatio(numCol, cellBg).toFixed(2) : '?') + ':1)');

/* Latar dialog. Tidak bisa lewat bgFor(): '.pwr-diff-label' bukan
   turunan-nama dari '.pwr-ov-inner' (keduanya kelas terpisah, hubungan
   induk-anaknya ada di HTML, bukan di nama selector). Jadi latarnya
   disebut eksplisit di sini. */
const dlgBg = hexAll(propOf('.pwr-ov-inner', 'bg') || 'var(--pwr-panel)');
ok(dlgBg.length > 0, 'latar dialog terbaca (' + dlgBg.join(', ') + ')');

/* teks tidak boleh lagi diredupkan dgn opacity di dialog ini */
['.pwr-diff-label', '.pwr-stage-cell span'].forEach(sel => {
  const op = propOf(sel, 'op');   /* nama field, bukan nama properti CSS */
  ok(!op,
     sel + ' tidak memakai opacity untuk melemahkan teks' +
     (op ? ' -> masih ' + op : '') +
     ' (di atas latar terang, opacity justru menghapus kontras)');
  const c = hex(propOf(sel, 'color'));
  const bg2 = bgFor(sel) || dlgBg;
  ok(c && bg2 && worstRatio(c, bg2) >= 4.5,
     sel + ' tetap kontras (' + (c && bg2 ? worstRatio(c, bg2).toFixed(2) : '?') + ':1)');
});

/* stage terkunci: lemah itu SENGAJA, tapi jangan sampai lenyap */
/* Nama field di blocks[] adalah 'op', bukan 'opacity' — memakai nama
   properti CSS di sini mengembalikan undefined dan membuat uji ini
   gagal palsu (terbaca "opacity 1" padahal CSS-nya .55). */
const lockOp = parseFloat(propOf('.pwr-stage-cell.is-locked', 'op') || '1');
ok(lockOp >= 0.45 && lockOp < 1,
   'stage terkunci tetap terlihat lemah TAPI masih terbaca (opacity ' +
   lockOp + ')');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
