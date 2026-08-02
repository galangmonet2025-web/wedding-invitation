/* Harness verifikasi tema rpg-quest-wedding terhadap kontrak host.
   Screenshot headless tidak bekerja di mesin ini, jadi verifikasi
   dilakukan lewat jsdom + PARSER TEMPLATE yang meniru host
   (depth-tracking, seperti src/utils/templateParser.ts). */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIR = 'src/sample-theme/rpg-quest-wedding';
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(DIR, 'index.css'), 'utf8');
const js = fs.readFileSync(path.join(DIR, 'index.js'), 'utf8');

/* Buang komentar sebelum static-check supaya teks penjelasan di dalam
   komentar tidak dihitung sebagai kode (penyebab false positive). */
const htmlCode = html.replace(/<!--[\s\S]*?-->/g, '');
const jsCode = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) pass++;
  else { fail++; fails.push(name + (detail ? ' — ' + detail : '')); }
}

/* ================= PARSER TEMPLATE (depth-tracking) ================= */

function evaluateCondition(condition, data) {
  const trimmed = condition.trim();
  if (trimmed.includes(' == ')) {
    const [l, r] = trimmed.split(' == ');
    return String(data[l.trim()] ?? '') === r.trim().replace(/^['"]|['"]$/g, '');
  }
  if (trimmed.includes(' != ')) {
    const [l, r] = trimmed.split(' != ');
    return String(data[l.trim()] ?? '') !== r.trim().replace(/^['"]|['"]$/g, '');
  }
  const val = data[trimmed];
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return !(s === '' || s === 'false' || s === '0');
  }
  return !!val;
}

/* Cari indeks {{/name}} yang cocok, dengan depth-tracking. */
function findClose(src, from, name) {
  const openRe = new RegExp('\\{\\{[#^]' + name + '\\s+[^}]*\\}\\}', 'g');
  const closeTok = '{{/' + name + '}}';
  let depth = 1;
  let i = from;
  while (i < src.length) {
    const nextClose = src.indexOf(closeTok, i);
    if (nextClose === -1) return -1;
    const between = src.slice(i, nextClose);
    let opens = 0;
    openRe.lastIndex = 0;
    while (openRe.exec(between)) opens++;
    depth += opens - 1;
    if (depth === 0) return nextClose;
    i = nextClose + closeTok.length;
  }
  return -1;
}

function parseTemplate(template, data) {
  let output = template;
  const blockRe = /\{\{([#^])(if|unless|each|hidden)\s+([^}]+)\}\}/;
  let guard = 0;

  while (guard++ < 10000) {
    const m = output.match(blockRe);
    if (!m) break;

    const [full, type, command, condition] = m;
    const start = m.index;
    const afterOpen = start + full.length;
    const closeStart = findClose(output, afterOpen, command);
    if (closeStart === -1) break;

    const content = output.slice(afterOpen, closeStart);
    const rest = output.slice(closeStart + ('{{/' + command + '}}').length);

    let cond = evaluateCondition(condition, data);
    if (type === '^' || command === 'unless') cond = !cond;

    let replacement = '';

    if (command === 'if' || command === 'unless') {
      // {{else}} hanya dikenali pada depth 0 (sama seperti host)
      let elseIndex = -1, depth = 0;
      for (let k = 0; k < content.length; k++) {
        if (content.startsWith('{{#', k) || content.startsWith('{{^', k)) depth++;
        else if (content.startsWith('{{/', k)) depth--;
        else if (depth === 0 && content.startsWith('{{else}}', k)) { elseIndex = k; break; }
      }
      if (elseIndex !== -1) {
        replacement = cond
          ? parseTemplate(content.slice(0, elseIndex), data)
          : parseTemplate(content.slice(elseIndex + 8), data);
      } else {
        replacement = cond ? parseTemplate(content, data) : '';
      }
    } else if (command === 'hidden') {
      const inner = parseTemplate(content, data);
      replacement = cond
        ? '<div style="display:none" data-hidden-by="' + condition.trim() + '">' + inner + '</div>'
        : inner;
    } else if (command === 'each') {
      const arr = data[condition.trim()];
      if (Array.isArray(arr)) {
        replacement = arr.map((item, idx) => {
          const ctx = Object.assign({}, data, typeof item === 'object' ? item : {});
          let body = parseTemplate(content, ctx);
          body = body.replace(/\{\{this\.(\w+)\}\}/g, (_, k) =>
            (item && typeof item === 'object' && item[k] != null) ? String(item[k]) : '');
          body = body.replace(/\{\{@index_plus_1\}\}/g, String(idx + 1));
          body = body.replace(/\{\{@index\}\}/g, String(idx));
          return body;
        }).join('');
      }
    }

    output = output.slice(0, start) + replacement + rest;
  }

  // countdown -> span host (perilaku InvitationPage)
  output = output
    .replace(/\{\{countdown_hari\}\}/g, '<span id="tm-countdown-days">12</span>')
    .replace(/\{\{countdown_jam\}\}/g, '<span id="tm-countdown-hours">05</span>')
    .replace(/\{\{countdown_menit\}\}/g, '<span id="tm-countdown-minutes">30</span>')
    .replace(/\{\{countdown_detik\}\}/g, '<span id="tm-countdown-seconds">10</span>');

  // variabel tak dikenal -> string kosong
  output = output.replace(/\{\{\s*(@?[a-zA-Z0-9_.]+)\s*\}\}/g, (mm, key) => {
    const val = data[key.trim()];
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return val.url || val.id || '';
    return String(val);
  });

  return output;
}

/* ================= 1. STATIC CHECKS ================= */

ok('tidak pakai #main-content', !/id\s*=\s*["']main-content["']/.test(htmlCode));
ok('tidak pakai atribut data-var', !/\sdata-var\s*=/.test(htmlCode));
ok('tidak pakai atribut data-img/data-bg', !/\sdata-(img|bg)\s*=/.test(htmlCode));
ok('tidak pakai data-if/data-unless', !/\sdata-(if|unless)\s*=/.test(htmlCode));
ok('data-loop hanya satu (wishes)', (htmlCode.match(/data-loop\s*=/g) || []).length === 1);

ok('JS tidak memanggil .play()', !/\.play\s*\(/.test(jsCode));
ok('JS tidak menulis #play-icon', !/play-icon/.test(jsCode));
ok('JS tidak menulis #pause-icon', !/pause-icon/.test(jsCode));
ok('JS tidak menyentuh #bg-music', !/bg-music/.test(jsCode));

ok('cleanup hook dipanggil di awal', /window\.__pgqCleanup/.test(jsCode.slice(0, 800)));
ok('cleanup hook didefinisikan ulang', /window\.__pgqCleanup\s*=\s*function/.test(jsCode));
ok('pakai delegated document click', /on\(document,\s*['"]click['"]/.test(jsCode));
ok('MutationObserver di document.body', /mo\.observe\(document\.body/.test(jsCode));
ok('punya guard needsRewire', /function needsRewire/.test(jsCode));

ok('typewriter pakai Intl.Segmenter', /Intl\.Segmenter/.test(jsCode));
ok('typewriter TIDAK pakai split("")', !/\.split\(\s*['"]{2}\s*\)/.test(jsCode));
ok('JS hormati prefers-reduced-motion', /prefers-reduced-motion/.test(jsCode));

ok('@import di paling atas CSS', cssCode.trimStart().startsWith('@import'));
ok('CSS punya guard reduced-motion', /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(cssCode));
ok('border-image punya border-width', /border-width:\s*18px/.test(cssCode));
ok('border-image-slice pakai fill', /border-image-slice:\s*18 fill/.test(cssCode));
ok('target sentuh 44px', /--pgq-touch:\s*44px/.test(cssCode));
ok('overflow-y longhand pada .pgq-screen', /\.pgq-screen\s*\{[^}]*overflow-y:\s*hidden/.test(cssCode));

const internalAnchors = (htmlCode.match(/<a[^>]+href\s*=\s*["']#(?!\/)/g) || []);
ok('tidak ada <a href="#..."> internal', internalAnchors.length === 0, internalAnchors.length + ' ditemukan');

{
  const tokens = [];
  const re = /\{\{([#^/])(if|unless|each|hidden)\b/g;
  let m;
  while ((m = re.exec(htmlCode))) tokens.push({ kind: m[1], name: m[2] });
  const stack = [];
  let mismatch = 0;
  for (const t of tokens) {
    if (t.kind === '/') { const top = stack.pop(); if (!top || top.name !== t.name) mismatch++; }
    else stack.push(t);
  }
  ok('semua blok template seimbang', mismatch === 0 && stack.length === 0,
    'mismatch=' + mismatch + ' belum-ditutup=' + stack.length);
}

{
  const conds = htmlCode.match(/\{\{[#^](?:if|unless)\s+([^}]+)\}\}/g) || [];
  const bad = conds.filter(c => /[^\s]==|==[^\s]/.test(c));
  ok('operator == dikelilingi spasi', bad.length === 0, JSON.stringify(bad));
}

{
  const bgUrls = htmlCode.match(/background-image:\s*url\(&quot;\{\{(\w+)\}\}&quot;\)/g) || [];
  let ungated = 0;
  for (const mm of bgUrls) {
    const v = mm.match(/\{\{(\w+)\}\}/)[1];
    const idx = htmlCode.indexOf(mm);
    const before = htmlCode.slice(Math.max(0, idx - 400), idx);
    if (!new RegExp('\\{\\{#if ' + v + '\\}\\}').test(before)) ungated++;
  }
  ok('background url({{var}}) selalu digating {{#if}}', ungated === 0, ungated + ' tak digating');
}

/* ================= DATA UJI ================= */

const DATA_FULL = {
  groom_name: 'Panglima Arya', bride_name: 'Ratu Melati',
  groom_nickname: 'Arya', bride_nickname: 'Melati',
  nama_tamu: 'Budi Santoso', guest_name: 'Budi Santoso',
  kode_undangan: 'INV-001',
  wedding_date: 'Sabtu, 20 September 2026',
  tanggal_akad: 'Sabtu, 20 September 2026',
  jam_akad: '08.00 WIB', jam_resepsi: '11.00 WIB',
  nama_lokasi_akad: 'Masjid Agung', keterangan_lokasi_akad: 'Jl. Merdeka 1',
  nama_lokasi_resepsi: 'Gedung Serbaguna', keterangan_lokasi_resepsi: 'Jl. Merdeka 2',
  akad_map: 'https://maps.google.com/a', resepsi_map: 'https://maps.google.com/b',
  kalimat_pembuka: 'Dengan memohon rahmat Tuhan 💍, kami mengundang Anda.',
  kalimat_penutup: 'Terima kasih atas doa restunya.',
  quote: 'Cinta adalah perjalanan', quote_by: 'Anonim',
  photo_hero_cover: 'https://x/a.jpg', photo_groom_photo: 'https://x/g.jpg',
  photo_bride_photo: 'https://x/b.jpg', photo_closing: 'https://x/c.jpg',
  bank_1: 'BCA', rek_1: '1234567890', nama_rek_1: 'Arya',
  bank_2: 'Mandiri', rek_2: '0987654321', nama_rek_2: 'Melati',
  site_name: 'Undangan.id', site_url: 'https://undangan.id', tagline: 'Undangan digital',
  ig_laki_laki: 'arya', ig_perempuan: 'melati',
  tampilkan_amplop_online: true, flag_pakai_2_rekening: true,
  flag_tampilkan_nama_orang_tua: true, flag_tampilkan_sosial_media_mempelai: true,
  flag_pakai_timeline_kisah: true, has_gallery: true, is_fitur_live_streaming: true,
  link_live_streaming: 'https://yt/x',
  is_link_umum_and_not_for_spesific_guest: false,
  is_sudah_isi_konfirmasi_kehadiran: false, is_sudah_isi_ucapan: false, is_hadir: false,
  flag_use_instagram_webconfig: true, url_instagram_webconfig: 'https://ig/x',
  nama_bapak_laki_laki: 'Bpk A', nama_ibu_laki_laki: 'Ibu A',
  nama_bapak_perempuan: 'Bpk B', nama_ibu_perempuan: 'Ibu B',
  galleries: [{ url: 'https://x/1.jpg' }, { url: 'https://x/2.jpg' }],
  timeline_kisah: [{ tanggal: '2020', judul: 'Bertemu', deskripsi: 'Di kampus' }],
  wishes: [{ guest_name: 'Andi', guest_message: 'Selamat! 🎉', guest_comment_time: '1 jam lalu' }],
};

function build(data, wrapperClass, runScripts) {
  const rendered = parseTemplate(html, data);
  return new JSDOM(
    '<!doctype html><html><body><div class="theme-wrapper ' + wrapperClass + '">' + rendered + '</div></body></html>',
    { runScripts: runScripts || 'outside-only', pretendToBeVisual: true }
  );
}

/* ================= 2. DOM — DATA LENGKAP ================= */

const doc = build(DATA_FULL, 'is-closed').window.document;

ok('ada .phone-container', !!doc.querySelector('.phone-container'));
ok('ada .mock-app-screen', !!doc.querySelector('.mock-app-screen'));
ok('.mock-app-screen di dalam .phone-container', !!doc.querySelector('.phone-container .mock-app-screen'));
ok('ada #theme-cover', !!doc.querySelector('#theme-cover'));
ok('#theme-cover di dalam .mock-app-screen', !!doc.querySelector('.mock-app-screen #theme-cover'));
ok('ada .theme-intro-overlay', !!doc.querySelector('.theme-intro-overlay'));
ok('intro overlay BUKAN di dalam #theme-cover', !doc.querySelector('#theme-cover .theme-intro-overlay'));
ok('ada #theme-fab-container', !!doc.querySelector('#theme-fab-container'));
ok('ada <audio id="bg-music">', !!doc.querySelector('audio#bg-music'));

for (const id of ['btn-open-invitation', 'btn-show-menu', 'btn-toggle-music', 'play-icon',
  'pause-icon', 'bg-music', 'btn-submit-ucapan', 'wish-name', 'wish-message',
  'btn-submit-kehadiran', 'rsvp-status', 'rsvp-guests', 'rsvp-code',
  'alert-submit-kehadiran', 'alert-submit-ucapan', 'rsvp-form', 'wish-form']) {
  ok('ID host ada: #' + id, !!doc.getElementById(id));
}

// #btn-show-qr sengaja 2x (sampul + FAB), pola sama seperti java-vintage:
// host menangkapnya lewat closest() sehingga keduanya berfungsi.
ok('#btn-show-qr ada 2 (sampul + FAB, disengaja)',
  doc.querySelectorAll('#btn-show-qr').length === 2,
  'jumlah=' + doc.querySelectorAll('#btn-show-qr').length);

{
  const ids = Array.from(doc.querySelectorAll('[id]')).map(e => e.id).filter(i => i !== 'btn-show-qr');
  const dup = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  ok('tidak ada duplikasi ID lain', dup.length === 0, JSON.stringify(dup));
}

{
  const optVals = Array.from(doc.getElementById('rsvp-status').querySelectorAll('option'))
    .map(o => o.value).filter(Boolean);
  ok('rsvp-status value lowercase hadir/tidak-hadir',
    optVals.length === 2 && optVals.includes('hadir') && optVals.includes('tidak-hadir'),
    JSON.stringify(optVals));
  const cmdVals = Array.from(doc.querySelectorAll('.pgq-cmd-item')).map(b => b.getAttribute('data-rsvp'));
  ok('command menu pakai nilai kontrak',
    cmdVals.length === 2 && cmdVals.includes('hadir') && cmdVals.includes('tidak-hadir'),
    JSON.stringify(cmdVals));
}

{
  const alertEl = doc.getElementById('alert-submit-kehadiran');
  const vals = Array.from(alertEl.querySelectorAll('[data-rsvp-branch]'))
    .map(e => e.getAttribute('data-rsvp-branch'));
  ok('#alert-submit-kehadiran berisi [data-rsvp-branch]', vals.length >= 1, 'ditemukan ' + vals.length);
  ok('kedua branch hadir & tidak ada di DOM',
    vals.includes('hadir') && vals.includes('tidak'), JSON.stringify(vals));
}

{
  const loop = doc.querySelector('[data-loop="wishes"]');
  ok('ada [data-loop="wishes"]', !!loop);
  ok('ada [data-wish-item]', !!loop.querySelector('[data-wish-item]'));
  for (const f of ['name', 'message', 'time'])
    ok('ada [data-wish-field="' + f + '"]', !!loop.querySelector('[data-wish-field="' + f + '"]'));
}

{
  const secs = Array.from(doc.querySelectorAll('section[data-menu-label]'));
  ok('section[data-menu-label] semua punya id', secs.every(s => s.id));
  ok('ada >=5 section bermenu', secs.length >= 5, 'ada ' + secs.length);
}

ok('galeri pakai .gallery-item', doc.querySelectorAll('.gallery-item').length === 2);
ok('section galeri ber-id #gallery', !!doc.querySelector('section#gallery'));

for (const id of ['tm-countdown-days', 'tm-countdown-hours', 'tm-countdown-minutes', 'tm-countdown-seconds'])
  ok('span countdown host: #' + id, !!doc.getElementById(id));

{
  const navItems = Array.from(doc.querySelectorAll('.pgq-menu-list [data-scroll]'));
  ok('menu nav pakai <button>', navItems.length > 0 && navItems.every(n => n.tagName === 'BUTTON'));
  const missing = navItems.map(n => n.getAttribute('data-scroll')).filter(t => !doc.getElementById(t));
  ok('semua target menu ada di DOM', missing.length === 0, JSON.stringify(missing));
}

{
  const bad = (doc.body.innerHTML.match(/url\(\s*["']?\s*["']?\s*\)/g) || []);
  ok('tidak ada url("") liar (data lengkap)', bad.length === 0, bad.length + ' ditemukan');
}

/* ================= 3. LINK UMUM ================= */
{
  const d = build({ ...DATA_FULL, is_link_umum_and_not_for_spesific_guest: true }, 'is-closed').window.document;
  ok('link umum: #rsvp-form tidak dirender', !d.getElementById('rsvp-form'));
  ok('link umum: #wish-form tidak dirender', !d.getElementById('wish-form'));
  ok('link umum: section rsvp tetap ada', !!d.querySelector('section#rsvp'));
  ok('link umum: daftar ucapan tetap tampil', !!d.querySelector('[data-loop="wishes"]'));
  ok('link umum: kartu sapaan sampul disembunyikan', !d.querySelector('.pgq-cover-guest'));
}

/* ================= 4. SUDAH RSVP & UCAPAN ================= */
{
  const d = build({
    ...DATA_FULL, is_sudah_isi_konfirmasi_kehadiran: true,
    is_hadir: true, is_sudah_isi_ucapan: true
  }, 'is-opened').window.document;
  ok('sudah rsvp: #rsvp-form masih di DOM (hidden)', !!d.getElementById('rsvp-form'));
  ok('sudah rsvp: #rsvp-form dibungkus [data-hidden-by]',
    !!d.getElementById('rsvp-form').closest('[data-hidden-by]'));
  ok('sudah rsvp: #alert-submit-kehadiran ada', !!d.getElementById('alert-submit-kehadiran'));
  ok('sudah rsvp: alert punya [data-rsvp-branch]',
    !!d.getElementById('alert-submit-kehadiran').querySelector('[data-rsvp-branch]'));
  ok('sudah ucapan: #alert-submit-ucapan ada', !!d.getElementById('alert-submit-ucapan'));
}

/* ================= 5. DATA MINIMAL ================= */
{
  const d = build({
    groom_nickname: 'A', bride_nickname: 'B', nama_tamu: 'Tamu',
    is_link_umum_and_not_for_spesific_guest: false,
    is_sudah_isi_konfirmasi_kehadiran: false, is_sudah_isi_ucapan: false,
    wishes: [], galleries: [], timeline_kisah: [],
  }, 'is-closed').window.document;
  ok('minimal: struktur inti tetap ada',
    !!d.querySelector('.phone-container') && !!d.querySelector('.mock-app-screen') && !!d.querySelector('#theme-cover'));
  ok('minimal: #rsvp-status ada', !!d.getElementById('rsvp-status'));
  ok('minimal: #btn-submit-kehadiran ada', !!d.getElementById('btn-submit-kehadiran'));
  ok('minimal: #wish-message ada', !!d.getElementById('wish-message'));
  ok('minimal: #btn-toggle-music ada', !!d.getElementById('btn-toggle-music'));
  ok('minimal: section galeri tidak dirender', !d.querySelector('section#gallery'));
  ok('minimal: section kado tidak dirender', !d.querySelector('section#gift'));
  const bad = (d.body.innerHTML.match(/url\(\s*["']?\s*["']?\s*\)/g) || []);
  ok('minimal: tidak ada url("") liar', bad.length === 0, bad.length + ' ditemukan');
  const ids = Array.from(d.querySelectorAll('[id]')).map(e => e.id).filter(i => i !== 'btn-show-qr');
  const dup = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  ok('minimal: tidak ada duplikasi ID', dup.length === 0, JSON.stringify(dup));
}

/* ================= 6. EKSEKUSI JS ================= */
{
  const d2 = build(DATA_FULL, 'is-closed', 'dangerously');
  const w = d2.window;

  w.matchMedia = w.matchMedia || function () { return { matches: false, addListener() { }, removeListener() { } }; };
  if (!w.requestAnimationFrame) {
    w.requestAnimationFrame = function (cb) { return setTimeout(cb, 16); };
    w.cancelAnimationFrame = function (id) { clearTimeout(id); };
  }
  if (!w.IntersectionObserver) {
    w.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; }
      observe(el) { this.cb([{ isIntersecting: true, target: el }]); }
      unobserve() { } disconnect() { }
    };
  }
  w.scrollTo = w.scrollTo || function () { };
  w.Element.prototype.scrollTo = w.Element.prototype.scrollTo || function () { };
  w.Element.prototype.scrollIntoView = w.Element.prototype.scrollIntoView || function () { };

  const doc2 = w.document;
  function exec(flag) {
    const s = doc2.createElement('script');
    s.textContent = 'try { (function(){ ' + js + ' })(); } catch(e){ window.' + flag + ' = e && (e.stack||e.message); }';
    doc2.body.appendChild(s);
  }

  exec('__ERR');
  ok('JS jalan tanpa error', !w.__ERR, w.__ERR);
  ok('cleanup hook terpasang di window', typeof w.__pgqCleanup === 'function');

  const btnHadir = doc2.querySelector('.pgq-cmd-item[data-rsvp="hadir"]');
  btnHadir.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('klik "Hadir" set rsvp-status = hadir',
    doc2.getElementById('rsvp-status').value === 'hadir',
    'value=' + doc2.getElementById('rsvp-status').value);
  ok('klik "Hadir" menandai command aktif', btnHadir.classList.contains('is-active'));

  const btnTidak = doc2.querySelector('.pgq-cmd-item[data-rsvp="tidak-hadir"]');
  btnTidak.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('klik "Tidak Hadir" set value = tidak-hadir',
    doc2.getElementById('rsvp-status').value === 'tidak-hadir');
  ok('tidak-hadir menonaktifkan #rsvp-guests', doc2.getElementById('rsvp-guests').disabled === true);
  ok('hanya satu command aktif', doc2.querySelectorAll('.pgq-cmd-item.is-active').length === 1);

  btnHadir.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('kembali ke hadir mengaktifkan #rsvp-guests', doc2.getElementById('rsvp-guests').disabled === false);

  const ava = doc2.querySelector('.pgq-wish-ava');
  ok('inisial avatar ucapan terisi', (ava.textContent || '').trim() === 'A',
    'isi=' + JSON.stringify(ava.textContent));
  ok('jumlah ucapan terisi', /1 PESAN/.test(doc2.getElementById('pgq-wishes-count').textContent || ''),
    doc2.getElementById('pgq-wishes-count').textContent);

  const msg = doc2.getElementById('pgq-msg-text');
  ok('teks pembuka punya aria-label final (emoji utuh)',
    msg.getAttribute('aria-label') === DATA_FULL.kalimat_pembuka,
    JSON.stringify(msg.getAttribute('aria-label')));

  doc2.getElementById('btn-open-invitation').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('klik buka menandai peti terbuka', doc2.getElementById('pgq-chest').classList.contains('is-open'));
  ok('intro overlay dapat .is-playing', doc2.getElementById('pgq-intro').classList.contains('is-playing'));

  doc2.getElementById('btn-show-menu').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('klik menu membuka panel', doc2.getElementById('pgq-menu').classList.contains('is-open'));
  doc2.getElementById('pgq-menu-close').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('klik tutup menutup panel', !doc2.getElementById('pgq-menu').classList.contains('is-open'));

  let cleanErr = null;
  try { w.__pgqCleanup(); } catch (e) { cleanErr = e.message; }
  ok('cleanup berjalan tanpa error', !cleanErr, cleanErr);

  exec('__ERR2');
  ok('re-eksekusi skrip tanpa error', !w.__ERR2, w.__ERR2);
  ok('flag intro bertahan lintas re-exec', w.__pgqIntroStarted === true);

  doc2.getElementById('rsvp-status').value = '';
  doc2.querySelector('.pgq-cmd-item[data-rsvp="hadir"]')
    .dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('setelah re-exec, RSVP masih berfungsi',
    doc2.getElementById('rsvp-status').value === 'hadir');

  // Simulasi host menyuntik ucapan baru -> MutationObserver harus rewire
  const loop = doc2.querySelector('[data-loop="wishes"]');
  const clone = loop.querySelector('[data-wish-item]').cloneNode(true);
  clone.querySelector('[data-wish-field="name"]').textContent = 'Zaki';
  clone.querySelector('[data-wish-field="message"]').textContent = 'Barakallah';
  clone.querySelector('.pgq-wish-ava').textContent = '';
  loop.insertBefore(clone, loop.firstChild);

  setTimeout(function () {
    const ava2 = loop.querySelector('.pgq-wish-ava');
    ok('ucapan baru dapat inisial (rewire jalan)',
      (ava2.textContent || '').trim() === 'Z', 'isi=' + JSON.stringify(ava2.textContent));
    ok('jumlah ucapan ikut naik',
      /2 PESAN/.test(doc2.getElementById('pgq-wishes-count').textContent || ''),
      doc2.getElementById('pgq-wishes-count').textContent);
    report();
  }, 200);
}

function report() {
  console.log('\n=== HASIL VERIFIKASI ===');
  console.log('LULUS: ' + pass);
  console.log('GAGAL: ' + fail);
  if (fails.length) {
    console.log('\n--- YANG GAGAL ---');
    fails.forEach(f => console.log('  X ' + f));
    process.exitCode = 1;
  } else {
    console.log('\nSemua pemeriksaan lulus.');
  }
}
