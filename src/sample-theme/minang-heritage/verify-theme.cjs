/* Render <theme>-heritage/index.html with the REAL templateParser.ts (transpiled by the
   repo's own tsc), then assert the DOM with jsdom.
   Usage: node verify-theme.cjs <theme> <prefix> <maxSlot>      e.g. ... batak bt 8

   Playbook §10.4/§12.6: an imitation parser produced false alarms before, so use the
   real parser. Known NON-bugs, deliberately not flagged:
     - #btn-show-qr twice  -> host delegates via target.closest (ThemeWrapper.tsx:521/809)
     - {{...}} inside a CSS comment -> documentation, not a binding
     - index.html already contains .mock-app-screen -> do not wrap it again
*/
const fs = require('fs');
const path = require('path');
const ts = require('c:/Users/msiso/wedding-invitation/node_modules/typescript');
const { JSDOM } = require('c:/Users/msiso/wedding-invitation/node_modules/jsdom');

const [THEME_NAME, PREFIX, MAXSLOT_S] = process.argv.slice(2);
if (!THEME_NAME || !PREFIX || !MAXSLOT_S) {
  console.error('usage: node verify-theme.cjs <theme> <prefix> <maxSlot>');
  process.exit(2);
}
const MAXSLOT = parseInt(MAXSLOT_S, 10);
const ROOT = 'c:/Users/msiso/wedding-invitation';
const THEME = path.join(ROOT, 'src/sample-theme', THEME_NAME + '-heritage');

// --- load the real parser -------------------------------------------------
const src = fs.readFileSync(path.join(ROOT, 'src/utils/templateParser.ts'), 'utf8');
const outputText = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('exports', 'module', 'require', outputText)(mod.exports, mod, require);
const parseTemplate = mod.exports.parseTemplate || mod.exports.default;
if (typeof parseTemplate !== 'function') throw new Error('parseTemplate not found');

const data = {
  nama_panggilan_pria: 'Agus', nama_panggilan_wanita: 'Tuba',
  nama_lengkap_pria: 'Agus Salim', nama_lengkap_wanita: 'Tuba Agustina',
  tanggal_akad: '2026-09-12', jam_akad: '08:00',
  tanggal_resepsi: '2026-09-12', jam_resepsi: '11:00',
  nama_lokasi_resepsi: 'Gedung Sate', alamat_resepsi: 'Bandung',
  nama_lokasi_akad: 'Masjid Raya', alamat_akad: 'Bandung',
  guest_name: 'Budi', invitation_code: 'INV123',
  list_ucapan: [{ nama: 'Rina', pesan: 'Selamat!', waktu: '1j' }],
  is_sudah_isi_konfirmasi_kehadiran: false, is_sudah_isi_ucapan: false, is_hadir: false,
  // Optional sections sit behind {{#if}} — flag names read from the theme itself
  // (grep '{{#if' index.html), NOT invented. With them off, ids that index.js queries
  // (wedding-calendar, story-carousel) never render and the rename-drift check below
  // reports a phantom bug.
  flag_pakai_timeline_kisah: true, is_fitur_gallery: true, has_gallery: true,
  flag_pakai_additional_feature_story_balasan_instagram: true,
  galleries: ['g1.jpg', 'g2.jpg'], stories: [{ judul: 'Awal', tanggal: '2020', cerita: 'Bertemu' }],
  is_fitur_live_streaming: true, tampilkan_amplop_online: true,
  flag_tampilkan_nama_orang_tua: true, flag_tampilkan_sosial_media_mempelai: true,
  flag_lokasi_akad_dan_resepsi_berbeda: true, flag_pakai_2_rekening: true,
  is_link_umum_and_not_for_spesific_guest: false,
  photo_cover: 'c.jpg', photo_hero_cover: 'h.jpg', photo_closing: 'cl.jpg',
  quote_1: 'Quote satu', quote_7: 'Quote tujuh',
};
for (let i = 1; i <= 12; i++) data['asset_image_' + i] = 'A' + i + '.webp';

const htmlSrc = fs.readFileSync(path.join(THEME, 'index.html'), 'utf8');
const cssSrc = fs.readFileSync(path.join(THEME, 'index.css'), 'utf8');
const jsSrc = fs.readFileSync(path.join(THEME, 'index.js'), 'utf8');
const rendered = parseTemplate(htmlSrc, data);
const doc = new JSDOM('<body>' + rendered + '</body>').window.document;
const cssNoC = cssSrc.replace(/\/\*[\s\S]*?\*\//g, '');
const jsNoC = jsSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

let fail = 0;
const ok = (cond, label, extra = '') => {
  console.log((cond ? '  OK   ' : '  FAIL ') + label + (extra && !cond ? ' -> ' + extra : ''));
  if (!cond) fail++;
};
console.log('\n=========== ' + THEME_NAME.toUpperCase() + ' (prefix ' + PREFIX + '-, ' + MAXSLOT + ' slots) ===========');

console.log('--- template + host contract ---');
const unresolved = rendered.match(/\{\{[^}]*\}\}/g) || [];
ok(unresolved.length === 0, 'no unresolved {{...}}', unresolved.slice(0, 3).join(' '));
for (const id of ['bg-music', 'play-icon', 'pause-icon', 'wish-name', 'wish-message',
  'rsvp-status', 'rsvp-guests', 'rsvp-code']) {
  const n = doc.querySelectorAll('#' + id).length;
  ok(n === 1, '#' + id + ' unique (host reads it by value)', 'count=' + n);
}
for (const id of ['btn-show-qr', 'btn-show-menu', 'btn-toggle-music', 'btn-submit-ucapan', 'btn-submit-kehadiran']) {
  ok(doc.querySelectorAll('#' + id).length >= 1, '#' + id + ' present (delegated)', 'count=0');
}

console.log('--- RSVP casing ---');
const statusEl = doc.querySelector('#rsvp-status');
const vals = statusEl ? [...statusEl.querySelectorAll('option')].map(o => o.value) : [];
ok(vals.length > 0, 'rsvp-status has options');
ok(vals.every(v => v === '' || v === 'hadir' || v === 'tidak-hadir'),
  'values lowercase hadir/tidak-hadir only', JSON.stringify(vals));

console.log('--- asset slots ---');
for (let i = 1; i <= MAXSLOT; i++) ok(rendered.includes('A' + i + '.webp'), 'asset_image_' + i + ' wired');
const refs = [...new Set(htmlSrc.match(/asset_image_\d+/g) || [])].map(x => parseInt(x.split('_')[2], 10));
const over = refs.filter(n => n > MAXSLOT);
ok(over.length === 0, 'no slot referenced beyond ' + MAXSLOT, 'refs slot ' + over.join(','));
const assetFiles = fs.readdirSync(path.join(THEME, 'asset')).filter(f => /\.webp$/i.test(f));
ok(assetFiles.length >= MAXSLOT, 'asset/ holds >= ' + MAXSLOT + ' webp files', assetFiles.length + ' files');
ok(fs.existsSync(path.join(THEME, 'asset/ASSET.md')), 'asset/ASSET.md exists (upload map)');
ok(!/\{\{/.test(cssNoC), 'no live {{var}} in CSS (CSS is never template-parsed)');

/* Mirror pair (§11.1/§13.1). Corner sprays only exist in generations that ship the
   artwork; jawa-blue legitimately has none, so this is conditional — asserting their
   presence for every theme would be a harness bug, not a theme defect. When they DO
   exist they must be two distinct artworks and therefore must NOT be CSS-mirrored. */
console.log('--- mirror pair (§11.1) ---');
const sprayL = doc.querySelector('.' + PREFIX + '-spray-l');
const sprayR = doc.querySelector('.' + PREFIX + '-spray-r');
if (sprayL || sprayR) {
  ok(!!(sprayL && sprayR), 'spray l AND r both exist');
  ok(!!(sprayL && sprayR) && sprayL.getAttribute('style') !== sprayR.getAttribute('style'),
    'spray L/R use DIFFERENT artwork (real mirror pair)');
  const sprayRules = cssNoC.match(new RegExp('\\.' + PREFIX + '-spray[^{]*\\{[^}]*\\}', 'g')) || [];
  ok(!sprayRules.some(r => /scaleX\(-1\)/.test(r)), 'no scaleX(-1) on spray (artwork already mirrored)');
} else {
  console.log('  SKIP  no corner sprays in this theme (source ships no such artwork)');
}

console.log('--- 3-layer stack + backdrop ---');
const redSection = doc.querySelector('.section-red');
if (redSection) {
  const kids = [...redSection.children];
  const iBg = kids.findIndex(k => k.classList.contains(PREFIX + '-red-bg'));
  const iMotif = kids.findIndex(k => k.classList.contains(PREFIX + '-motif'));
  ok(iBg === 0, '.' + PREFIX + '-red-bg is first child of .section-red', 'index ' + iBg);
  // Motif bands only exist where the source ships band artwork (not jawa-blue).
  if (iMotif !== -1) ok(iBg < iMotif, 'pattern paints before motif bands');
  else console.log('  SKIP  no motif bands in this theme (source ships no band artwork)');
} else ok(false, '.section-red exists');
const screen = doc.querySelector('.mock-app-screen');
ok(doc.querySelectorAll('.mock-app-screen').length === 1, 'exactly one .mock-app-screen');
ok(!!(screen && screen.firstElementChild && screen.firstElementChild.classList.contains(PREFIX + '-page-bg')),
  '.' + PREFIX + '-page-bg is FIRST child of scroller',
  screen && screen.firstElementChild ? screen.firstElementChild.className : 'n/a');
ok(new RegExp('\\.' + PREFIX + '-page-bg\\s*\\{[^}]*position:\\s*fixed').test(cssNoC),
  '.' + PREFIX + '-page-bg is position:fixed (adds zero scroll height)');

console.log('--- section order + music default (§6.2) ---');
const secs = [...doc.querySelectorAll('section')];
const iCover = secs.findIndex(s => s.classList.contains('section-cover'));
const iHero = secs.findIndex(s => s.classList.contains('section-hero'));
ok(iCover > -1 && iHero > -1 && iCover < iHero, 'cover precedes hero');
const playIcon = doc.querySelector('#play-icon'), pauseIcon = doc.querySelector('#pause-icon');
ok(!!playIcon && !/display:\s*none/.test(playIcon.getAttribute('style') || ''), 'play-icon visible by default');
ok(!!pauseIcon && /display:\s*none/.test(pauseIcon.getAttribute('style') || ''), 'pause-icon hidden by default');
ok(!/audio\.paused|musicMirror/.test(jsNoC), 'no music mirror (host is the only icon writer)');
const plays = [...jsNoC.matchAll(/(\w+)\.play\(\)/g)].map(m => m[1]);
ok(!plays.some(t => /audio|music|bg/i.test(t)), 'no audio.play() (host owns music)', plays.join(','));

console.log('--- scroll lock (§6.1) ---');
ok(/\.mock-app-screen:not\(\.reveal-content\)\s*\{[^}]*overflow-y:\s*hidden/.test(cssNoC),
  'scroll lock uses overflow-y (shorthand `overflow` provably does NOT work)');

console.log('--- rename hygiene + chunking ---');
/* Leftover-sunda check. IMPORTANT: only CODE identifiers are a defect. Prose like
   'cloned from "sunda-heritage"' or '150px here — Sunda is the odd one at 200px/.35'
   is deliberate lineage/comparison documentation the playbook (§12.4) wants KEPT, so
   strip comments before judging. Flagging those was a false alarm of MY harness — the
   6 build reviewers were right. Skipped entirely when self-testing sunda itself. */
if (THEME_NAME !== 'sunda') {
  const codeOnly = cssNoC + htmlSrc.replace(/<!--[\s\S]*?-->/g, '') + jsNoC;
  const leftover = codeOnly.match(/__sundaCleanup|__snCountdownTimer|snFloat|\bsn-[a-z]/g) || [];
  ok(leftover.length === 0, 'no leftover sunda CODE identifiers', [...new Set(leftover)].join(','));
}
/* Cleanup hook must exist and be RUN on entry (host re-executes this script on every
   input change; without it, listeners/RAF stack). Don't derive the name from the CLI
   arg — a hyphenated theme ("jawa-blue") would yield "__jawa-blueCleanup", which can
   never be a valid JS identifier. Assert the SHAPE instead. */
const hook = (jsSrc.match(/window\.__(\w+)Cleanup\s*=/) || [])[1];
ok(!!hook, 'registers a global cleanup hook (window.__<name>Cleanup)');
if (hook) {
  const called = new RegExp('window\\.__' + hook + 'Cleanup\\(\\)').test(jsNoC);
  ok(called, 'cleanup hook __' + hook + 'Cleanup is CALLED on entry (no stacked listeners)');
}
/* Rename-drift guard: an id renamed in index.html but not in index.js = dead feature
   (e.g. frozen countdown). But NOT every queried id is required:
     - `getElementById('wedding-calendar') || getElementById('<prefix>-wed-date')` is a
       deliberate FALLBACK chain (memory: theme-countdown-sources). Only the chain as a
       whole must resolve; wedding-calendar is absent in this whole theme family and
       present in others (black-gold, netflix, ...). Verified, not assumed.
     - ids inside {{#if}} blocks that this fixture leaves off would also read as missing.
   So: flag a queried id only when it is NOT part of a `||` chain that resolves. */
const chains = [...jsNoC.matchAll(/getElementById\(['"][^'"]+['"]\)(?:\s*\|\|\s*document\.getElementById\(['"][^'"]+['"]\))+/g)]
  .map(m => [...m[0].matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(x => x[1]));
const inChain = new Set(chains.flat());
for (const chain of chains) {
  ok(chain.some(id => doc.getElementById(id)),
    'countdown/date fallback chain resolves (' + chain.join(' || ') + ')', 'none of them exist');
}
const queried = [...new Set([...jsNoC.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]))]
  .filter(id => !inChain.has(id));
const missingQ = queried.filter(id => !doc.getElementById(id));
ok(missingQ.length === 0, 'every required id index.js queries exists in HTML (rename drift)',
  'missing: ' + missingQ.join(','));
for (const [f, s] of [['index.html', htmlSrc], ['index.css', cssSrc], ['index.js', jsSrc]]) {
  ok(Math.ceil(s.length / 50000) === 1, f + ' fits 1 Sheets chunk (<50k)', s.length + ' chars');
}
const o = (cssSrc.match(/{/g) || []).length, c = (cssSrc.match(/}/g) || []).length;
ok(o === c, 'CSS braces balanced', o + ' vs ' + c);

console.log(fail === 0 ? '==> ' + THEME_NAME + ': ALL PASSED' : '==> ' + THEME_NAME + ': ' + fail + ' FAILED');
process.exit(fail === 0 ? 0 : 1);
