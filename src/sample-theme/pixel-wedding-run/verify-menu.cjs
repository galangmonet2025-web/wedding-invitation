/* Harness jsdom: memverifikasi penambahan "kelengkapan info" tema
   pixel-wedding-run — menu navigasi, FAB, footer penyedia, sapaan tamu,
   dan aturan pause-on-dialog. Dijalankan: node verify-menu.cjs */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.cwd(), '../../../node_modules/jsdom'));

const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

/* --- mini template parser (setara host untuk fitur yang dipakai tema) --- */
function render(tpl, data) {
  let s = tpl;
  const truthy = (k) => {
    const v = data[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  };
  // #each
  s = s.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (m, key, body) => {
    const list = data[key] || [];
    return list.map(item =>
      body.replace(/\{\{this\.([\w]+)\}\}/g, (_, f) => item[f] ?? '')
    ).join('');
  });
  // #if / #unless (berulang sampai stabil -> menangani nesting)
  for (let i = 0; i < 12; i++) {
    const before = s;
    s = s.replace(/\{\{#if\s+([\w.]+)\}\}((?:(?!\{\{#if|\{\{#unless)[\s\S])*?)\{\{\/if\}\}/g,
      (m, k, body) => (truthy(k) ? body : ''));
    s = s.replace(/\{\{#unless\s+([\w.]+)\}\}((?:(?!\{\{#unless|\{\{#if)[\s\S])*?)\{\{\/unless\}\}/g,
      (m, k, body) => (truthy(k) ? '' : body));
    if (s === before) break;
  }
  // scalar
  s = s.replace(/\{\{([\w.]+)\}\}/g, (m, k) => (data[k] ?? ''));
  return s;
}

const DATA = {
  groom_nickname: 'Andi', bride_nickname: 'Sari',
  groom_name: 'Andi Pratama', bride_name: 'Sari Dewi',
  wedding_date: '20 Desember 2026', wedding_date_iso: '2026-12-20T09:00:00+07:00',
  tanggal_akad: '20 Des 2026', jam_akad: '09.00',
  nama_lokasi_akad: 'Masjid Agung', keterangan_lokasi_akad: 'Jl. Merdeka 1',
  akad_map: 'https://maps.example/a',
  /* Resepsi di lokasi BERBEDA -> stage ke-2 muncul di panel kanan. */
  flag_lokasi_akad_dan_resepsi_berbeda: true,
  tanggal_resepsi: '20 Des 2026', jam_resepsi: '11.00',
  nama_lokasi_resepsi: 'Gedung Serbaguna',
  keterangan_lokasi_resepsi: 'Jl. Melati 9',
  resepsi_map: 'https://maps.example/r',
  site_name: 'Kosa Invitation', site_url: 'https://kosa.example',
  site_logo: 'https://img.example/logo.png', tagline: 'Undangan digital elegan',
  flag_use_instagram_webconfig: true, url_instagram_webconfig: 'https://ig.example',
  flag_use_tiktok_webconfig: true, url_tiktok_webconfig: 'https://tt.example',
  flag_use_youtube_webconfig: true, url_youtube_webconfig: 'https://yt.example',
  flag_use_whatsapp_webconfig: true, url_whatsapp_webconfig: 'https://wa.example',
  nama_tamu: 'Budi Santoso', guest_name: 'Budi Santoso', kode_undangan: 'ABC123',
  is_link_umum_and_not_for_spesific_guest: false,
  has_gallery: true, galleries: [{ url: 'g1' }, { url: 'g2' }],
  tampilkan_amplop_online: true, bank_1: 'BCA', rek_1: '123456', nama_rek_1: 'Andi',
  flag_pakai_timeline_kisah: true,
  timeline_kisah: [{ tanggal: '2020', judul: 'Bertemu', deskripsi: 'x' }],
  flag_pakai_additional_feature_story_balasan_instagram: true,
  sample_story_1: 's1', frame_balasan_instagram: 'frame.png',
  is_fitur_live_streaming: true, link_live_streaming: 'https://live.example',
  wishes: [], kalimat_penutup: 'Terima kasih', quote: 'Q', quote_by: 'QB',
};

const dom = new JSDOM('<!doctype html><body>' + render(HTML, DATA) + '</body>',
  { runScripts: 'outside-only' });
const D = dom.window.document;

let fail = 0;
const ok = (cond, label, extra) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (cond || !extra ? '' : ' -> ' + extra));
  if (!cond) fail++;
};

console.log('\n=== 1. FLOATING UI (FAB) ===');
ok(!!D.getElementById('btn-show-menu'), 'tombol menu ada');
ok(!!D.getElementById('btn-show-qr'), 'tombol QR ada');
ok(!!D.getElementById('pwr-fab-top'), 'tombol kembali-ke-atas ada');
ok(!!D.getElementById('btn-toggle-music'), 'hook musik host ada');
ok(!!D.getElementById('bg-music'), '#bg-music ada');

console.log('\n=== 2. PANEL MENU ===');
ok(!!D.getElementById('pwr-menu'), 'kontainer menu ada');
ok(!!D.getElementById('pwr-menu-list'), 'wadah daftar menu ada');
ok(!D.getElementById('pwr-menu').classList.contains('show'), 'menu tertutup saat awal');

console.log('\n=== 3. FOOTER PENYEDIA (section closing) ===');
const foot = D.querySelector('.pwr-foot');
ok(!!foot, 'footer ada');
ok(foot && /Kosa Invitation/.test(foot.querySelector('.pwr-foot-name').textContent), 'nama web tampil');
ok(!!(foot && foot.querySelector('.pwr-foot-logo')), 'logo web tampil');
ok(!!(foot && foot.querySelector('.pwr-foot-tagline')), 'tagline tampil');
const url = foot && foot.querySelector('.pwr-foot-url');
ok(!!url && url.getAttribute('href') === 'https://kosa.example', 'tautan situs benar');
const socs = foot ? foot.querySelectorAll('.pwr-foot-soc') : [];
ok(socs.length === 4, 'ke-4 ikon sosial media tampil', 'dapat ' + socs.length);
const hrefs = [...socs].map(a => a.getAttribute('href'));
ok(hrefs.every(h => h && h.startsWith('https://')), 'semua tautan sosmed terisi', hrefs.join(','));

console.log('\n=== 4. SAPAAN TAMU ===');
const greet = D.querySelector('.pwr-sec-greet-name');
ok(!!greet && greet.textContent.trim() === 'Budi Santoso', 'nama tamu tampil di hero');

console.log('\n=== 5. STORY IG: foto + bingkai ===');
const card = D.querySelector('.pwr-story-card');
ok(!!card, 'kartu story ada');
ok(!!(card && card.querySelector('.pwr-story-frame')), 'bingkai IG ter-render');

console.log('\n=== 6. KONTRAK HOST TETAP UTUH ===');
const src = D.getElementById('inv-source');
for (const p of ['rsvp-status', 'rsvp-guests', 'rsvp-code', 'btn-submit-kehadiran',
                 'alert-submit-kehadiran', 'wish-name', 'wish-message',
                 'btn-submit-ucapan', 'alert-submit-ucapan', 'wish-form', 'rsvp-form']) {
  ok(!!src.querySelector('[data-pwrid="' + p + '"]'), 'data-pwrid ' + p);
}
const st = src.querySelector('[data-pwrid="rsvp-status"]');
const vals = [...st.querySelectorAll('option')].map(o => o.value);
ok(JSON.stringify(vals) === JSON.stringify(['hadir', 'tidak-hadir']),
  'nilai rsvp-status lowercase', vals.join('|'));
ok(!!src.querySelector('[data-rsvp-branch="hadir"]') &&
   !!src.querySelector('[data-rsvp-branch="tidak"]'), 'card RSVP punya kedua cabang');
ok(!!src.querySelector('[data-wish-template]'), 'template ucapan ada');
ok(!!src.querySelector('[data-loop="wishes"]'), 'wadah loop ucapan ada');

console.log('\n=== 7. TIDAK ADA DUPLICATE ID ===');
const ids = [...D.querySelectorAll('[id]')].map(e => e.id);
const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
ok(dup.length === 0, 'tanpa duplicate id', dup.join(','));

console.log('\n=== 8. SECTION TERBACA scanSections() ===');
const secs = [...src.querySelectorAll('[data-info]')];
ok(secs.length >= 10, 'jumlah section', secs.length + ' section');
ok(secs.every(s => s.getAttribute('data-title')), 'setiap section punya data-title (label menu)');
console.log('        menu akan berisi: ' +
  secs.map(s => s.getAttribute('data-title')).join(' · '));

console.log('\n=== 9. TAUTAN UMUM (tanpa tamu spesifik) ===');
const dom2 = new JSDOM('<!doctype html><body>' + render(HTML,
  Object.assign({}, DATA, { is_link_umum_and_not_for_spesific_guest: true, nama_tamu: '' })) + '</body>');
const D2 = dom2.window.document;
ok(!D2.querySelector('.pwr-sec-greet'), 'sapaan tamu disembunyikan');
ok(!D2.querySelector('[data-pwrid="rsvp-form"]'), 'form RSVP disembunyikan');
ok(!D2.querySelector('[data-pwrid="wish-form"]'), 'form ucapan disembunyikan');
ok(!!D2.querySelector('[data-loop="wishes"]'), 'daftar ucapan TETAP tampil (boleh dibaca)');
ok(!!D2.querySelector('.pwr-foot'), 'footer penyedia tetap tampil');

console.log('\n=== 10. index.js: menu masuk guard pause ===');
const js = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const guards = js.match(/'\.pwr-overlay\.show[^']*'/g) || [];
ok(guards.length === 2, 'dua guard overlay ditemukan', String(guards.length));
ok(guards.every(g => g.includes('#pwr-menu.show')),
  'kedua guard menyertakan #pwr-menu.show (game membeku saat menu buka)');
for (const fn of ['openMenu', 'closeMenu', 'gotoSection', 'buildMenuList',
                  'syncScrollTopBtn', 'scrollRevealTop']) {
  ok(js.includes('function ' + fn + '('), 'fungsi ' + fn + ' terdefinisi');
}
ok(/'btn-show-menu':\s*function/.test(js), 'btn-show-menu terdaftar di tabel delegasi');
ok(/data-goto/.test(js), 'handler [data-goto] ada');
ok(js.includes('__pwrScrollBound'), 'listener scroll dipasang sekali + punya cleanup');

console.log('\n=== 11. GATE isOpened HOST (akar bug "FAB tak terlihat") ===');
/* Host: `.is-closed #theme-fab-container{display:none!important}` dan isOpened
   HANYA di-set oleh klik pada #btn-open-invitation. Tanpa ID itu, seluruh
   floating button tak pernah muncul di undangan live. */
const openBtn = D.getElementById('btn-open-invitation');
ok(!!openBtn, '#btn-open-invitation ADA (pemicu isOpened satu-satunya)');
/* ⚠️ PEMICU HOST HARUS TERPISAH DARI TOMBOL MULAI.
   Host menangkap klik #btn-open-invitation lalu memanggil setIsOpened +
   setIsPlaying; keduanya membuat host MENGEKSEKUSI ULANG JS tema. Kalau
   ID itu menempel di tombol MULAI, game yang baru dimulai langsung
   dibongkar dan yang tersisa hanya musik. */
ok(!!openBtn && !openBtn.closest('#pwr-ov-cover'),
  'pemicu host BUKAN tombol MULAI di cover (kalau ya, game dibongkar saat start)');
ok(!!openBtn && (openBtn.className || '').indexOf('pwr-host-open') > -1,
  'pemicu host adalah elemen tersembunyi khusus');
const startBtn = D.getElementById('pwr-btn-start');
ok(!!startBtn && !!startBtn.closest('#pwr-ov-cover'), 'tombol MULAI ada di cover');
ok(!!startBtn && startBtn.id !== 'btn-open-invitation',
  'tombol MULAI tidak memakai id pemicu host');
const fabc = D.getElementById('theme-fab-container');
ok(!!fabc && !openBtn.closest('#theme-fab-container'),
  'pemicu host BUKAN di dalam fab-container (tersembunyi saat is-closed)');
ok(js.includes('function notifyHostOpened('), 'notifyHostOpened() ada');
ok(/skipToInvitation[\s\S]{0,400}notifyHostOpened\(\)/.test(js),
  'jalur skip memberi tahu host');
ok(/if \(reading\) notifyHostOpened\(\);/.test(js),
  'host diberi tahu saat undangan DIBUKA, bukan saat game dimulai');
ok(/'pwr-btn-start':\s*function/.test(js), 'tombol MULAI terdaftar di tabel delegasi');
const startFn3 = js.slice(js.indexOf('function startFromCover('), js.indexOf('function skipToInvitation('));
ok(!/__pwrHostOpened = true/.test(startFn3),
  'startFromCover TIDAK mengklaim host sudah dibuka');
console.log('\n=== 12. FAB tahan `display:block!important` dari host ===');
const css = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
const fabRule = css.match(/\.pwr-fab\s*\{[^}]*\}/);
ok(!!fabRule && !/display:\s*flex/.test(fabRule[0]),
  'aturan .pwr-fab tidak bergantung pada display:flex (host memaksa block)');
ok(/\.pwr-fab\s*>\s*\.pwr-fab-btn\s*\+\s*\.pwr-fab-btn/.test(css),
  'jarak antar tombol pakai margin, bukan gap flex');

console.log('\n=== 13. PALET BIRU LAUT - KARANG ===');
/* Palet diganti atas permintaan user ("ganti aja temanya ga usah kuning
   merah"). Yang diuji BUKAN lagi nama warna tertentu, melainkan ATURAN
   yang membuat palet apa pun tetap terbaca — supaya tes ini tidak perlu
   ditulis ulang tiap kali warnanya diganti lagi. Bukti keterbacaan
   angka-per-angka ada di verify-contrast.cjs, yang menghitung rasio
   kontras SELURUH aturan CSS. */
/* Komentar tidak dihitung: berkas ini menyimpan CATATAN SEJARAH warna
   lama sebagai penjelasan bug, dan itu justru berguna. Yang dilarang
   adalah warna lama yang masih DIPAKAI. */
const cssNoCmt = css.replace(/\/\*[\s\S]*?\*\//g, '');
const oldHex = (cssNoCmt.match(/#e85888|#ff90b8|#fff4e6|#ffd34d|#5fe3d0|#1a1228|#241c38|#35e07a|#7dffae|#ffb43d|#38d9c0|#d8f5e2|#0b1410|#e52521|#f7b500|#2eb02e|#ffd93d|#fff6e0|#3a2415|#e8729a|#d6517f/gi) || []);
ok(oldHex.length === 0, 'tidak ada sisa hex palet lama (ungu-pink / CRT / kuning-merah)', oldHex.join(','));

/* PANEL GELAP + TEKS TERANG — arah yang sekarang dikunci. */
ok(/--pwr-panel:\s*#0f2340/.test(css), 'panel game = biru laut GELAP');
ok(/--pwr-cream:\s*#eaf2ff/.test(css), 'teks utama = putih kebiruan (TERANG di panel gelap)');
ok(/--pwr-pink:\s*#ff7a59/.test(css), 'KARANG (aksen utama)');
ok(/--pwr-cyan:\s*#3fb9cf/.test(css), 'TOSKA (aksen sekunder)');

/* ATURAN STRUKTURAL: tiap aksen punya DUA tingkat — versi terang untuk
   TEKS di panel gelap, versi tua untuk LATAR di belakang teks putih.
   Menyatukan keduanya adalah akar bug kontras yang berulang. */
ok(/--pwr-pink-fill:/.test(css) && /--pwr-cyan-fill:/.test(css),
  'aksen punya varian -fill (latar) terpisah dari varian teks');
ok(/\.pwr-btn-primary\s*\{[^}]*var\(--pwr-pink-fill\)/.test(css),
  'tombol utama memakai varian -fill, bukan warna teks');

const usesBlue = (css.match(/var\(--pwr-blue\)/g) || []).length;
ok(usesBlue >= 8, 'biru dipakai di banyak elemen, bukan sekadar token', usesBlue + 'x');
/* Kerangka spacewar: kartu acara ditandai GARIS TEPI rose di kiri kartu
   (border-left) + tag teks rose, bukan lencana berlatar penuh. Jadi akad
   & resepsi tetap terbedakan sekilas. */
ok(/\.pwr-side-event \{[^{}]*border-left:\s*4px solid var\(--dok-rose\)/.test(css),
  'kartu acara ditandai garis tepi rose (ala spacewar)');
ok(!/:hover:hover/.test(css), 'tidak ada selector :hover ganda');
ok(/--pwr-doc-bg:\s*#eef2f8/.test(css), 'kertas undangan = kertas DINGIN (tetap terang untuk dibaca)');
ok(/--pwr-doc-text:\s*#16233a/.test(css), 'tinta undangan = biru tinta gelap');
/* Scanline CRT = garis gelap horizontal tiap 3px di seluruh layar.
   repeating-linear-gradient sendiri masih dipakai untuk tekstur tab
   kartrid (90deg), jadi yang dicek adalah pola scanline-nya. */
ok(!/rgba(0,0,0,.16) 0px, rgba(0,0,0,.16) 1px/.test(css), 'scanline CRT sudah dibuang');
ok(css.includes('#6b9bff'), 'pita langit biru dipakai (selaras PAL game)');
ok(/#5ec44a/.test(css), 'strip rumput dipakai (selaras PAL game)');
const jsOld = (js.match(/0xe85888|0xff90b8|0x35e07a|0x7dffae|0x38d9c0/g) || []);
ok(jsOld.length === 0, 'aksen UI di index.js bukan palet lama', jsOld.join(','));
ok(/pink:0xe5342a/.test(js) || /0xe5342a/.test(js), 'aksen game = merah Mario');
/* Biome game HARUS tetap berwarna — kalau diseragamkan, gameplay tak terbaca */
ok(js.includes('sky2:0x6fb4e8'), 'warna biome/langit game TIDAK ikut diubah (gameplay tetap terbaca)');

console.log('\n=== 14. KONTRAS TEKS (bug kutipan pudar di screenshot) ===');
/* Tinta undangan sekarang WARNA PENUH, bukan rgba ber-alpha.
   Alpha .66 yang lama hanya mencapai 3.6:1 di kertas — salah satu teks
   yang dilaporkan sulit dibaca. Hierarki dibuat dari warna yang lebih
   lembut, bukan dari transparansi. */
ok(/--pwr-doc-text:\s*#16233a/.test(css), 'tinta utama = warna penuh (bukan rgba ber-alpha)');
ok(/--pwr-doc-mute:\s*#4a5b76/.test(css), 'tinta sekunder = warna penuh, tetap >=4.5:1');
ok(!/--pwr-doc-(text|mute):\s*rgba/.test(css), 'tinta dokumen tidak lagi memakai alpha');
const quoteRule = css.match(/\.pwr-sec-quote p \{[^}]*\}/);
ok(!!quoteRule && /color:\s*var\(--pwr-doc-text\)/.test(quoteRule[0]),
  'teks kutipan memakai warna penuh (dulu nyaris tak terbaca)');

console.log('\n=== 15. FAB HANYA DI UNDANGAN, BUKAN DI GAME ===');
ok(/body:not\(\.pwr-reading\)\s*\.pwr-fab/.test(css),
  'FAB disembunyikan selama TIDAK membaca undangan');
ok(/body\.pwr-reading\s*\.pwr-fab/.test(css), 'FAB tampil saat mode membaca');
const hideRule = css.match(/body:not\(\.pwr-reading\)\s*\.pwr-fab\s*\{[^}]*\}/);
ok(!!hideRule && /visibility:\s*hidden/.test(hideRule[0]) && !/display:/.test(hideRule[0]),
  'pakai visibility (bukan display) — host memaksa display:block!important');
ok(js.includes('function syncReadingMode('), 'syncReadingMode() ada');
/* Setiap jalur buka/tutup harus memanggilnya, kalau tidak FAB nyangkut */
const calls = (js.match(/syncReadingMode\(\)/g) || []).length;
ok(calls >= 5, 'dipanggil di semua jalur buka/tutup', calls + ' panggilan');
ok(/pwr-piece-modal\.show/.test(js.slice(js.indexOf('function syncReadingMode'), js.indexOf('function syncReadingMode') + 320)),
  'modal kepingan ikut dihitung sebagai "membaca"');
ok(/classList\.remove\('pwr-reading'\)/.test(js),
  'kelas body dibersihkan saat cleanup (tidak bocor ke tema lain)');

console.log('\n=== 16. PANEL KANAN — KERANGKA ala SPACE WAR (kiri lebar + kanan info) ===');
const side = D.getElementById('pwr-side');
ok(!!side, 'panel kanan ada');

/* ---- KERANGKA: disamakan dengan spacewar-wedding (permintaan user) ----
   Panel ini berkali-kali "diredesain". Sekarang tulangnya = spacewar:
     .pwr-side-panel (flex-column, align tengah)
       header: badge + logo + baris misi (.pwr-side-op)
       .pwr-side-grid (2 kolom, KIRI LEBIH LEBAR):
         KIRI  .pwr-side-hero = kanvas mempelai LEBAR + misi + hint + kontrol
         KANAN .pwr-side-info = nama/tanggal/tamu + kartu acara + tombol buka */
const panel = side && side.querySelector('.pwr-side-panel');
ok(!!panel, 'wadah panel (.pwr-side-panel) ada');
const grid = panel && panel.querySelector('.pwr-side-grid');
ok(!!grid, 'grid 2 kolom ada');
const cols = grid ? [...grid.children].map(e => e.className.split(' ')[0]) : [];
ok(cols.length === 2, 'grid = TEPAT 2 kolom', cols.join(','));
ok(cols[0] === 'pwr-side-hero', 'kolom kiri = hero (kanvas + kontrol)', cols[0]);
ok(cols[1] === 'pwr-side-info', 'kolom kanan = info undangan', cols[1]);

/* Kerangka-kerangka LAMA yang ditolak tidak boleh diam-diam kembali —
   termasuk medali bulat & kolom kiri/kanan versi jumper. */
[['pwr-poster', 'poster'], ['pwr-stack', 'tumpukan'], ['pwr-bay', 'bilah bawah'],
 ['pwr-mq', 'pita marquee'], ['pwr-cart', 'keping kartrid'], ['pwr-lv', 'baris stage'],
 ['pwr-board', 'papan waktu'], ['pwr-cell', 'sel bento'],
 ['pwr-side-medallion', 'medali bulat jumper'], ['pwr-side-left', 'kolom kiri jumper'],
 ['pwr-side-right', 'kolom kanan jumper'], ['pwr-side-cd', 'kotak hitung mundur jumper']]
  .forEach(([cls, label]) => ok(!side.querySelector('.' + cls),
    'kerangka lama "' + label + '" tidak dipakai lagi'));

/* Kepala panel: badge + logo + baris misi (pola spacewar). */
ok(!!side.querySelector('.pwr-side-head .pwr-side-badge'), 'lencana kepala ada');
ok(!!side.querySelector('.pwr-side-head .pwr-side-logo'), 'logo tema ada');
ok(!!side.querySelector('.pwr-side-head .pwr-side-op'), 'baris misi (op) ada');

/* Kolom kiri (hero): kanvas mempelai LEBAR (bukan medali), misi, kontrol. */
const stage = side.querySelector('.pwr-side-hero .pwr-couple-stage canvas');
ok(!!stage, 'ilustrasi mempelai = KANVAS LEBAR (bukan medali bulat)');
ok(stage && stage.id === 'pwr-couple',
  'kanvas memakai #pwr-couple — dicari drawCoupleCanvas() lewat ID');
ok(!!side.querySelector('.pwr-side-hero .pwr-side-mission'), 'kartu cara bermain di hero');
ok(!!side.querySelector('.pwr-side-hero .pwr-side-ctrl .pwr-side-keys'),
  'kartu KONTROL PEMAIN + daftar tombol di hero (ala .sw-side-ctrl)');

/* Kolom kanan (info): nama, tanggal, kartu acara, tombol buka. */
ok(!!side.querySelector('.pwr-side-info .pwr-side-names'), 'nama mempelai di kolom kanan');
ok(!!side.querySelector('.pwr-side-info .pwr-side-date'), 'tanggal di kolom kanan');
ok(side.querySelectorAll('.pwr-side-info .pwr-side-event').length === 2,
  'akad + resepsi jadi 2 kartu acara');
ok(!!side.querySelector('.pwr-side-info .pwr-side-open'), 'tombol buka undangan di kolom kanan');
ok(!!side.querySelector('.pwr-side-map'), 'tombol peta ada');

/* PEMANDANGAN, bukan kertas polos. */
ok(!!side.querySelector('.pwr-side-veil'), 'lapis cahaya ada');
ok(!!side.querySelector('.pwr-side-deco'), 'hiasan melayang ada');
const sideRule = css.slice(css.indexOf('.pwr-side {', css.indexOf('@media (min-width: 980px)')));
ok(/background:\s*linear-gradient/.test(sideRule.slice(0, 700)),
  'panel beralas pemandangan bergradasi, bukan bidang polos');

/* Kerangka spacewar: .pwr-side flex-center yang mengisi sisa lebar, panel
   di-align tengah; tetap overflow hidden supaya sama tinggi dengan frame. */
ok(/overflow:\s*hidden/.test(sideRule.slice(0, 700)),
  'panel kanan overflow hidden (sama tinggi dgn frame)');
ok(/display:\s*flex/.test(sideRule.slice(0, 700)) &&
   /align-items:\s*center/.test(sideRule.slice(0, 700)),
  'panel flex-center (ala .sw-cover-side)');
ok(!/\.pwr-side[^{]*\{[^{}]*overflow-y:\s*auto/.test(css),
  'tidak ada kolom panel yang bergulir sendiri');
const gridRule = css.match(/\.pwr-side-grid \{[^{}]*\}/);
ok(!!gridRule && /display:\s*grid/.test(gridRule[0]), 'grid memakai CSS grid');
ok(!!gridRule && /grid-template-columns:\s*minmax\(0, 1\.25fr\) minmax\(0, 1fr\)/.test(gridRule[0]),
  'kolom KIRI LEBIH LEBAR (1.25fr / 1fr, ala spacewar)');
ok(!!gridRule && /align-items:\s*center/.test(gridRule[0]),
  'dua kolom di-align TENGAH, bukan direntang');
/* Layar pendek ditangani dengan mengecilkan isi — pengganti scrollbar. */
ok(/@media \(max-height: \d+px\)/.test(css),
  'ada aturan layar pendek supaya tetap muat tanpa scroll');

/* Countdown {{countdown_*}} TETAP dilarang di panel (id tm-countdown-*
   hanya boleh sekali di dokumen). Kerangka spacewar memang tanpa countdown
   di panel — yang dijaga: tidak ada yang menyelundupkannya kembali. */
ok(!side.querySelector('[data-side-countdown]'),
  'panel kanan tanpa hitung mundur (ikut spacewar)');
ok(!/\{\{countdown_/.test(side.innerHTML),
  'tidak ada token {{countdown_*}} di panel (id host tak boleh dobel)');

console.log('\n=== 17. ★ AKSES TOOLS TETAP ADA (jangan pernah hilang) ===');
const star = D.getElementById('pwr-tune-star');
ok(!!star, '✦ pemicu panel tuning ADA');
ok(!!star && !!star.closest('.pwr-side-badge'),
  '✦ disisipkan inline di lencana panel (ala spacewar #sw-tuner-btn)');
ok(!!D.getElementById('pwr-tune'), 'panel tuning ada');
ok(!!D.getElementById('pwr-swap'), 'dialog ganti sprite ada');
for (const id of ['pwr-tune-close', 'pwr-tune-reset', 'pwr-tune-copy',
                  'pwr-tune-swap', 'pwr-tune-apply', 'pwr-swap-apply']) {
  ok(!!D.getElementById(id), 'kontrol tools ' + id);
}
ok(/pwr-tune-star/.test(css), '★ masih punya aturan CSS');

console.log('\n=== 18. BACKSOUND HANYA DI HALAMAN UNDANGAN ===');
/* Tombol backsound tidak boleh ada di toolbar game (kiri-atas layar main) */
const iconbar = D.getElementById('pwr-iconbar');
ok(!!iconbar, 'toolbar game ada');
ok(!iconbar.querySelector('#pwr-btn-music'),
  'toolbar game TIDAK punya tombol backsound');
ok(!!D.querySelector('#theme-fab-container #pwr-btn-music'),
  'tombol backsound ada di FAB undangan (otomatis ikut mode membaca)');
ok(D.querySelectorAll('#pwr-btn-music').length === 1, 'hanya satu tombol backsound');
/* Efek suara game TETAP di toolbar — beda urusan dari backsound */
ok(!!iconbar.querySelector('#pwr-btn-sfx'), 'tombol efek suara game tetap di toolbar');
/* Musik tidak boleh diputar saat mulai bermain */
/* Komentar dibuang dulu: penjelasan "dulu setMusic(true) dipanggil di sini"
   bukan kode dan tidak boleh dihitung. */
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const startFn = stripComments(js.slice(js.indexOf('function startFromCover('),
                                       js.indexOf('function skipToInvitation(')));
ok(/setMusic\(false\)/.test(startFn) && !/setMusic\(true\)/.test(startFn),
  'startFromCover TIDAK memutar backsound (mulai bermain = senyap)');
/* Aturan tunggal: musik mengikuti mode membaca, ditentukan di satu tempat.
   Ini mencegah jalur buka/tutup terlewat — dulu modal kepingan menampilkan
   isi undangan tapi musiknya diam. */
const syncFn = stripComments(js.slice(js.indexOf('function syncReadingMode('),
                                      js.indexOf('function buildMenuList(')));
ok(/setMusic\(reading\)/.test(syncFn),
  'syncReadingMode = SATU sumber kebenaran musik (reveal + modal kepingan)');
/* Tidak boleh ada pemanggil lain yang menyalakan musik di luar aturan itu,
   selain tombol musik manual milik tamu. */
const truthy = (stripComments(js).match(/setMusic\(true\)/g) || []).length;
ok(truthy === 0, 'tak ada setMusic(true) tersebar yang bisa saling menimpa',
  String(truthy));
/* Tema tidak boleh memutar audio sendiri — itu milik host */
ok(!/\baudio\.play\(\)|bgMusic\.play\(\)/.test(js),
  'tema tidak pernah memanggil audio.play() sendiri');

console.log('\n=== 19. STYLING UNDANGAN ≠ STYLING GAME ===');
/* Undangan meniru tema non-game (pil membulat, serif, bayangan blur);
   layar game tetap pixel/blok. Token-nya sengaja dipisah (--dok-*). */
ok(/--dok-serif:/.test(css) && /--dok-rose:/.test(css),
  'token undangan (--dok-*) terpisah dari token game (--pwr-*)');
ok(/\.pwr-reveal-body \.pwr-btn-primary[\s\S]{0,600}?border-radius:\s*999px/.test(css),
  'tombol di undangan = pil membulat');
ok(/\.pwr-reveal-body \.pwr-btn-primary[\s\S]{0,600}?linear-gradient/.test(css),
  'tombol di undangan pakai gradien (ala lake-como)');
/* Tombol GAME harus tetap blok: bayangan padat, bukan blur */
const gameBtn = css.match(/\n\.pwr-btn-primary \{[^}]*\}/);
ok(!!gameBtn && /box-shadow:\s*0 4px 0/.test(gameBtn[0]),
  'tombol game tetap bayangan blok padat (bukan blur)');
ok(!!gameBtn && !/border-radius:\s*999px/.test(gameBtn[0]),
  'tombol game TIDAK ikut jadi pil');
ok(/\.pwr-menu-box \{[\s\S]{0,300}?border-radius:\s*26px/.test(css),
  'menu = kartu membulat ala non-game');
ok(/body\.pwr-reading \.pwr-fab-btn[\s\S]{0,400}?border-radius:\s*50%/.test(css),
  'FAB undangan bulat (game pakai kotak)');
ok(/\.pwr-reveal-body[\s\S]{0,200}?-webkit-font-smoothing:\s*antialiased/.test(css),
  'teks undangan dihaluskan (game pakai `none` untuk pixel tajam)');
/* Elemen khas game tidak boleh bocor ke halaman undangan */
ok(/\.pwr-reveal-body::before, \.pwr-reveal-body::after \{ content: none; \}/.test(css),
  'pita langit & strip rumput dimatikan di halaman undangan');

console.log('\n=== 20. MUSIK: TEMA GAME ≠ TEMA NON-GAME ===');
/* Non-game: musik saat undangan dibuka. Game: MULAI = main (senyap),
   musik baru menyala saat ikon undangan 💌 ditekan. */
ok(/'pwr-btn-open':\s*function \(\) \{ revealFullInvitation\(\); \}/.test(js),
  'ikon undangan 💌 di toolbar membuka reveal');
const syncFn2 = stripComments(js.slice(js.indexOf('function syncReadingMode('),
                                       js.indexOf('function buildMenuList(')));
ok(/setMusic\(reading\)/.test(syncFn2),
  'musik terikat MODE MEMBACA, bukan start game');
ok(/#pwr-reveal\.show, #pwr-piece-modal\.show/.test(syncFn2),
  'reveal DAN modal kepingan sama-sama dihitung "membaca"');
const startFn2 = stripComments(js.slice(js.indexOf('function startFromCover('),
                                        js.indexOf('function skipToInvitation(')));
ok(!/setMusic\(true\)/.test(startFn2), 'MULAI game tidak memutar musik');

console.log('\n=== 22. PANEL KANAN TIDAK MEREGANG (bug kotak kuning raksasa) ===');
/* Riwayat bug: elemen di dalam baris grid `1fr` pernah memakai
   `grid-auto-rows: 1fr` / `height:100%`, sehingga di layar tinggi memakan
   sisa ruang dan jadi kotak raksasa.

   Kerangka spacewar: .pwr-side-grid di-align tengah dan tiap kartu
   (.pwr-side-event / .pwr-side-mission) berukuran isinya sendiri. Yang
   dijaga di sini: tidak ada yang memuai lagi. */
const evRule = css.match(/\.pwr-side-event \{[^{}]*\}/);
ok(!!evRule && !/height:\s*100%/.test(evRule[0]),
  'kartu acara tidak dipaksa setinggi wadahnya');
const missRule = css.match(/\.pwr-side-mission \{[^{}]*\}/);
ok(!!missRule && !/height:\s*100%/.test(missRule[0]),
  'kartu misi tidak dipaksa setinggi wadahnya');
ok(!/\.pwr-side-grid \{[^{}]*grid-auto-rows:\s*1fr/.test(css),
  'grid tidak memuai baris (grid-auto-rows 1fr)');
/* Kerangka-kerangka lama yang pernah memicu bug ini sudah tidak ada. */
ok(!/grid-template-rows:\s*auto minmax\(0, 1fr\) auto auto/.test(css),
  'grid 4-baris lama benar-benar sudah dibuang');
ok(!/\.pwr-board \.pwr-side-countdown \{/.test(css),
  'countdown versi papan bento sudah dibuang');

console.log('\n=== 21. KETERBACAAN ELEMEN IN-GAME (di atas langit terang) ===');
/* HUD, toolbar, kepingan, dan FAB melayang di atas langit biru terang.
   Polanya harus: PANEL GELAP PEKAT + BORDER TERANG. Sebelumnya border
   memakai var(--pwr-line) yang sejak palet Mario bernilai KUNING —
   kuning di atas langit biru terang praktis tidak terbaca. */
const ruleOf = (sel) => {
  const i = css.indexOf('\n' + sel + ' {');
  return i < 0 ? '' : css.slice(i, css.indexOf('}', i));
};
for (const sel of ['.pwr-iconbtn', '.pwr-piece', '.pwr-fab-btn']) {
  const r = ruleOf(sel);
  ok(/background:\s*rgba\(10,6,20,\.\d+\)/.test(r), sel + ' berlatar gelap pekat');
  ok(/border:\s*2px solid rgba\(255,255,255/.test(r), sel + ' berborder terang');
  ok(!/var\(--pwr-line\)/.test(r), sel + ' tidak memakai border kuning');
}
ok(/\.pwr-hud-row > \* \{[^}]*rgba\(10, 6, 20, \.92\)/.test(css),
  'alas HUD pekat (.92) supaya skor terbaca di langit');
/* --pwr-cream sejak palet Mario = COKLAT TUA (teks kertas undangan).
   Memakainya sebagai warna teks di panel gelap = gelap-di-gelap. */
const shellRule = ruleOf('.pwr-shell');
/* ARAHNYA SUDAH DIBALIK: --pwr-cream kini justru TEKS TERANG
   (#eaf2ff) untuk panel gelap, jadi memakainya di shell BENAR —
   kebalikan dari aturan lama saat cream masih coklat tua. */
ok(/color:\s*var\(--pwr-cream\)/.test(shellRule),
  'teks dasar shell memakai --pwr-cream (kini warna TERANG)');
const closeRule = ruleOf('.pwr-modal-close');
ok(!/color:\s*var\(--pwr-doc-text\)/.test(closeRule),
  'tombol tutup modal tidak memakai tinta gelap di atas bilah gelap');
const btn2 = ruleOf('.pwr-btn-secondary');
/* Tombol "BATAL": dulu teks krem di atas latar nyaris putih = 1.17:1
   (tombol yang hampir tak terlihat di tangkapan layar user). Sekarang
   panelnya gelap, jadi teks terang + isian nyata adalah yang benar. */
ok(/color:\s*var\(--pwr-cream\)/.test(btn2),
  'tombol sekunder memakai teks terang di panel gelap');
ok(/background:\s*var\(--pwr-panel-2\)/.test(btn2),
  'tombol sekunder punya isian nyata, bukan rgba putih .06 yang lenyap');

console.log('\n=== 23. PANEL KANAN: TIAP TEKS TERBACA DI LATARNYA SENDIRI ===');
/* Panel kanan sekarang punya DUA jenis latar, dan itulah sumber jebakannya:
     1. PEMANDANGAN (langit terang) -> teks harus PUTIH + bayangan tinta
     2. KARTU PUTIH                 -> teks harus TINTA GELAP
   Memakai token yang salah di salah satunya membuat teks jadi hantu.
   Diukur pada revisi sebelumnya: --pwr-cream di atas kertas = 1.00:1,
   yaitu benar-benar tak terlihat — itulah "text sulit dibaca" yang
   dilaporkan user. Cek ini mengunci keduanya dengan angka, bukan kira-kira. */
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
const CARD = '#ffffff';    // kartu acara & cara bermain
// Token teks di atas KARTU PUTIH — diukur terhadap latar nyatanya.
[['--pwr-doc-text', '#16233a'], ['--pwr-doc-mute', '#4a5b76'],
 ['--dok-rose-deep', '#8f3220']]
  .forEach(([name, hex]) => {
    ok(ratio(hex, CARD) >= 4.5,
      `${name} terbaca di kartu putih (${ratio(hex, CARD).toFixed(2)}:1)`);
  });

/* Teks di atas KARTU wajib memakai token tinta gelap. */
[['event-line',  /\.pwr-side-event-line\s*\{[^{}]*--pwr-doc-text/],
 ['event-place', /\.pwr-side-event-place\s*\{[^{}]*--pwr-doc-text/],
 ['event-addr',  /\.pwr-side-event-addr\s*\{[^{}]*--pwr-doc-mute/],
 ['mission-text', /\.pwr-side-mission-text \{[^{}]*--pwr-doc-mute/],
 ['mission-title', /\.pwr-side-mission-title \{[^{}]*--dok-rose-deep/],
 ['ctrl-title', /\.pwr-side-ctrl-title \{[^{}]*--dok-rose-deep/],
 ['key-desc', /\.pwr-key-desc \{[^{}]*--pwr-doc-mute/]]
  .forEach(([label, re]) => ok(re.test(css), `${label} memakai tinta gelap di kartu putih`));

/* Teks di atas PEMANDANGAN wajib putih/kuning + bayangan tinta, kalau tidak
   ia lenyap di langit terang. */
[['side-names', /\.pwr-side-names \{[^{}]*color:\s*#fff/],
 ['side-logo',  /\.pwr-side-logo \{[^{}]*color:\s*#fff/],
 ['info-title', /\.pwr-side-info-title \{[^{}]*color:\s*#fff/],
 ['side-hint',  /\.pwr-side-hint \{[^{}]*color:\s*#fff/]]
  .forEach(([label, re]) => ok(re.test(css), `${label} putih di atas pemandangan`));
[['side-names', /\.pwr-side-names \{[^{}]*text-shadow/],
 ['side-date',  /\.pwr-side-date \{[^{}]*text-shadow/],
 ['side-logo',  /\.pwr-side-logo \{[^{}]*text-shadow/],
 ['info-title', /\.pwr-side-info-title \{[^{}]*text-shadow/]]
  .forEach(([label, re]) => ok(re.test(css), `${label} punya bayangan tinta (terbaca di langit terang)`));

/* Token panel GELAP tidak boleh bocor ke teks di atas kartu putih:
   --pwr-cream (#eaf2ff) di kartu putih = 1.07:1 — praktis tak terlihat. */
ok(ratio('#eaf2ff', CARD) < 4.5, '--pwr-cream memang TIDAK layak di kartu putih (bukti angka)');
const cardRules = (css.match(/\.pwr-side-(event|mission)[a-z-]*\s*\{[^{}]*\}/g) || []);
ok(!cardRules.some(r => /--pwr-cream/.test(r)),
  'tidak ada teks kartu yang memakai --pwr-cream');

console.log('\n=== 24. PINTU KE TOOLS GAME TETAP ADA ===');
/* Permintaan eksplisit user berulang kali: rapikan panel kanan TAPI jangan
   hilangkan akses ke tools. ★ di baut kanan-atas kartrid adalah SATU-SATUNYA
   pintu ke panel tuning & dialog ganti sprite. */
ok(/id="pwr-tune-star"/.test(HTML), 'pemicu ✦ tools masih ada di HTML');
ok(/class="pwr-tune-star"/.test(HTML), 'pemicu ✦ memakai kelas yang di-style');
/* ✦ kini disisipkan INLINE di lencana (ala spacewar #sw-tuner-btn): menyatu
   dengan tulisan lencana (mewarisi font & warna, tanpa chrome tombol) tapi
   tetap bisa diklik, dan berubah warna saat disorot. */
ok(/\.pwr-tune-star \{[^{}]*cursor:\s*pointer/.test(css), 'gaya ✦ ada & bisa diklik');
ok(/\.pwr-tune-star \{[^{}]*color:\s*inherit/.test(css),
  '✦ mewarisi warna lencana (menyatu, tak terlihat sebagai tombol)');
ok(/\.pwr-tune-star:hover \{[^{}]*color:/.test(css), '✦ berubah warna saat disorot');
ok(/'pwr-tune-star':\s*function/.test(js), '✦ masih terdaftar di tabel klik terdelegasi');

console.log('\n' + (fail === 0
  ? '>>> SEMUA CEK LOLOS'
  : '>>> ' + fail + ' CEK GAGAL'));
process.exit(fail === 0 ? 0 : 1);
