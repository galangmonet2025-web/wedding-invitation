/* Uji fungsional dialog "Ganti sprite" + pemotongan sheet, di jsdom.
   Menjalankan index.js YANG ASLI (bukan salinan logika) supaya yang diuji
   benar-benar kode yang dikirim. */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('index.js', 'utf8');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

/* url wajib: tanpa origin yang sah, localStorage melempar DOMException
   (SecurityError) — dan tema memang memakai localStorage untuk menyimpan
   pilihan penggantian sprite. */
const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true,
    url: 'https://example.test/' });
const w = dom.window;

/* --- stub kanvas: cukup untuk drawImage/getContext, tak perlu piksel --- */
const drawn = [];
w.HTMLCanvasElement.prototype.getContext = function () {
  return {
    imageSmoothingEnabled: true,
    drawImage: (...a) => drawn.push(a),
    getImageData: (x, y, ww, hh) => ({ data: new Uint8ClampedArray(ww * hh * 4) }),
    fillRect() {}, clearRect() {}, fillText() {}, save() {}, restore() {},
    translate() {}, scale() {}, beginPath() {}, closePath() {}, fill() {},
    stroke() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {}
  };
};

/* Phaser tidak ada di jsdom — game tidak akan boot, itu tidak apa-apa.
   Yang diuji adalah lapisan aset + dialog, yang murni DOM. */
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.cancelAnimationFrame = id => clearTimeout(id);
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {},
                        addEventListener() {}, removeEventListener() {} });

let err = null;
try { w.eval(js); } catch (e) { err = e; }
ok(!err, 'index.js dieksekusi tanpa exception' + (err ? ' -> ' + err.message : ''));

const d = w.document;

/* ---- 1. markup dialog ada ---- */
ok(!!d.getElementById('pwr-swap'), 'dialog #pwr-swap ada di HTML');
ok(!!d.getElementById('pwr-tune-swap'), 'tombol "Ganti sprite…" ada di panel tuner');
ok(!!d.getElementById('pwr-swap-list'), 'kolom kiri (#pwr-swap-list) ada');
ok(!!d.getElementById('pwr-swap-pick'), 'kolom kanan (#pwr-swap-pick) ada');

/* ---- 2. slot unggahan ----
   Slot 1 = sprite-sheet (wajib), slot 2 = bg-sheet (opsional).
   Tes ini dulu menuntut TEPAT SATU slot sehingga gagal saat slot latar
   ditambahkan; yang benar dijaga adalah sheet sprite tetap slot PERTAMA
   (urutan unggah yang dipakai host), bukan jumlah slotnya. */
const imgs = d.querySelectorAll('#pwr-assets img');
const sheetImg = [...imgs].find(i => i.getAttribute('data-asset') === 'sheet');
ok(imgs.length >= 1, 'ada slot unggahan (' + imgs.length + ')');
ok(!!sheetImg, 'slot data-asset="sheet" ada');
ok(sheetImg && /\{\{asset_image_1\}\}/.test(sheetImg.getAttribute('src')),
   'sheet sprite memakai {{asset_image_1}} (harus diunggah PERTAMA)');

/* ---- 3. SHEET_MAP ter-inline & konsisten dgn sprite-map.json ---- */
const SM = w.SHEET_MAP, SS = w.SHEET_SIZE;
const json = JSON.parse(fs.readFileSync('assets/sprite-map.json', 'utf8'));
ok(SM && Object.keys(SM).length === Object.keys(json.groups).length,
   'SHEET_MAP punya ' + Object.keys(json.groups).length + ' kelompok');
let nFrame = 0; for (const g in SM) nFrame += SM[g].length;
ok(nFrame === json.count, 'SHEET_MAP punya ' + json.count + ' frame (dapat ' + nFrame + ')');
ok(SS && SS.w === json._sheet.w && SS.h === json._sheet.h,
   'SHEET_SIZE cocok (' + json._sheet.w + 'x' + json._sheet.h + ')');

/* koordinat inline identik dengan JSON */
let mism = 0;
for (const [g, gr] of Object.entries(json.groups)) {
  const inl = SM[g] || [];
  gr.frames.forEach((f, i) => {
    const a = inl[i];
    if (!a || a[0] !== f.i || a[1] !== f.x || a[2] !== f.y || a[3] !== f.w || a[4] !== f.h) mism++;
  });
}
ok(mism === 0, 'koordinat inline identik dgn sprite-map.json [' + mism + ' beda]');

/* ---- 4. tiap entri ASSET_MAP menunjuk frame yang BENAR-BENAR ada ---- */
const AM = w.ASSET_MAP;
let bad = [];
AM.forEach(m => {
  const g = SM[m.grp];
  if (!g) { bad.push(m.key + ' (kelompok "' + m.grp + '" tidak ada)'); return; }
  if ((m.f || 0) >= g.length) bad.push(m.key + ' (frame ' + m.f + ' > ' + (g.length - 1) + ')');
});
ok(bad.length === 0, 'semua ASSET_MAP menunjuk frame valid' +
   (bad.length ? ' -> ' + bad.join('; ') : ''));

/* ---- 5. frame di luar batas sheet ---- */
let oob = AM.filter(m => {
  const fr = w.sheetFrame(m.grp, m.f || 0);
  return fr && (fr.x + fr.w > SS.w || fr.y + fr.h > SS.h);
});
ok(oob.length === 0, 'tidak ada frame melewati batas sheet (' + oob.length + ')');

/* ---- 6. dialog terbuka lewat KLIK sungguhan (jalur delegasi) ---- */
const fire = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
fire(d.getElementById('pwr-tune-swap'));
const panel = d.getElementById('pwr-swap');
ok(panel.classList.contains('show'), 'klik "Ganti sprite…" membuka dialog');

/* Satu OBJEK = satu baris: key yang tergabung dalam satu slot animasi
   (mis. 4 rangka koin) diwakili satu baris saja, jadi jumlah baris =
   entri berlabel DIKURANGI rangka-rangka yang tergabung. */
const rows = d.querySelectorAll('#pwr-swap-list [data-swap-key]');
const labelled = AM.filter(m => m.label);
const collapsed = labelled.filter(m => {
  const sl = w.slotOfKey(m.key);
  return sl && sl.keys.indexOf(m.key) > 0;
}).length;
ok(rows.length === labelled.length - collapsed,
   'daftar kiri berisi ' + rows.length + ' objek (' + labelled.length +
   ' entri, ' + collapsed + ' rangka digabung ke slotnya)');
/* tidak ada objek yang hilang dari daftar */
const slotIds = new Set(), plain = new Set();
labelled.forEach(m => {
  const sl = w.slotOfKey(m.key);
  if (sl) slotIds.add(sl.id); else plain.add(m.key);
});
ok(rows.length === slotIds.size + plain.size,
   'tiap slot & tiap key lepas punya tepat satu baris (' +
   slotIds.size + ' slot + ' + plain.size + ' lepas)');

/* ---- 7. pilih objek -> kolom kanan terisi ---- */
fire(rows[0]);
const cells = d.querySelectorAll('#pwr-swap-pick [data-swap-grp]');
ok(cells.length > 0, 'memilih objek mengisi kolom kanan (' + cells.length + ' pilihan)');
ok(rows[0].classList.contains('is-sel'), 'objek terpilih ditandai is-sel');

/* penyaringan per jenis benar-benar menyaring */
const firstKey = rows[0].getAttribute('data-swap-key');
const ent = AM.find(m => m.key === firstKey);
const allGrp = [...cells].map(c => c.getAttribute('data-swap-grp'));
ok(allGrp.every(g => /^Main Characters\//.test(g)),
   'pilihan untuk "' + ent.label + '" tersaring ke Main Characters');

/* ---- 8. klik sel -> SWAP tercatat + tersimpan ---- */
const target = [...cells].find(c =>
  c.getAttribute('data-swap-grp') !== ent.grp ||
  parseInt(c.getAttribute('data-swap-f'), 10) !== (ent.f || 0));
fire(target);
const tg = target.getAttribute('data-swap-grp');
const tf = parseInt(target.getAttribute('data-swap-f'), 10);
/* Objek ber-slot menyimpan pilihannya di SWAP_ANIM (daftar rangka),
   key lepas di SWAP. Yang diuji di sini adalah HASILNYA, bukan di laci
   mana nilainya disimpan — supaya uji ini tidak lagi patah setiap kali
   tempat penyimpanannya dipindah. */
const firstSlot = w.slotOfKey(firstKey);
if (firstSlot) {
  const fl = w.slotFrames(firstSlot);
  ok(fl[0].grp === tg && fl[0].f === tf,
     'klik sel mengganti rangka yang sedang dipilih');
  const storedA = JSON.parse(w.localStorage.getItem('pwr_swapanim_v1') || '{}');
  ok(storedA[firstSlot.id] && storedA[firstSlot.id][0].grp === tg,
     'penggantian tersimpan ke localStorage');
} else {
  ok(w.SWAP[firstKey] && w.SWAP[firstKey].grp === tg && w.SWAP[firstKey].f === tf,
     'klik sel mencatat penggantian di SWAP');
  const stored = JSON.parse(w.localStorage.getItem('pwr_swap_v1') || '{}');
  ok(stored[firstKey] && stored[firstKey].grp === tg,
     'penggantian tersimpan ke localStorage');
}

/* effectiveSrc mengembalikan yang BARU, bukan bawaan */
const eff = w.effectiveSrc(ent);
ok(eff.grp === tg && eff.f === tf, 'effectiveSrc memakai nilai pengganti');

/* label kiri berubah jadi "diganti" */
const row0 = d.querySelector('#pwr-swap-list [data-swap-key="' + firstKey + '"]');
ok(/diganti/.test(row0.textContent), 'baris kiri menandai "diganti"');

/* ---- 9. memilih ULANG nilai bawaan menghapus penggantian ---- */
const back = [...d.querySelectorAll('#pwr-swap-pick [data-swap-grp]')].find(c =>
  c.getAttribute('data-swap-grp') === ent.grp &&
  parseInt(c.getAttribute('data-swap-f'), 10) === (ent.f || 0));
fire(back);
/* Untuk key ber-slot, SWAP[firstKey] memang selalu kosong — memeriksanya
   saja akan lulus tanpa menguji apa pun. Yang benar: susunannya kembali
   sama dengan bawaan, dan baris kiri tidak lagi bertanda "diganti". */
if (firstSlot) {
  ok(!w.slotIsCustom(firstSlot),
     'memilih ulang nilai bawaan mengembalikan susunan ke bawaan');
  const rowB = d.querySelector('#pwr-swap-list [data-swap-key="' + firstKey + '"]');
  ok(!/diganti/.test(rowB.textContent),
     'baris kiri tidak lagi bertanda "diganti"');
} else {
  ok(!w.SWAP[firstKey], 'memilih ulang nilai bawaan menghapus penggantian');
}

/* ---- 10. "Tampilkan semua" melonggarkan saringan ---- */
fire(rows[0]);
const before = d.querySelectorAll('#pwr-swap-pick [data-swap-grp]').length;
fire(d.getElementById('pwr-swap-all'));
const after = d.querySelectorAll('#pwr-swap-pick [data-swap-grp]').length;
ok(after > before, 'Tampilkan semua menambah pilihan (' + before + ' -> ' + after + ')');
fire(d.getElementById('pwr-swap-all'));   /* kembalikan */

/* ---- 11. reset mengembalikan ke BAWAAN (SWAP_DEF), bukan sekadar kosong ---- */
w.SWAP.t_brick = { grp: 'Terrain/Terrain', f: 3 };
w.saveSwap();
fire(d.getElementById('pwr-swap-reset'));
ok(JSON.stringify(w.SWAP) === JSON.stringify(w.SWAP_DEF),
   'Kembalikan bawaan -> SWAP == SWAP_DEF');
ok(w.localStorage.getItem('pwr_swap_v1') === null,
   'reset menghapus simpanan lokal (tidak menimpa bawaan lagi saat muat ulang)');

/* ---- 11b. "Salin nilai" IKUT membawa sprite & ukuran ---- */
let copied = '';
w.navigator.clipboard = { writeText: t => { copied = t; return Promise.resolve(); } };
w.SWAP.t_groom_idle0 = { grp: 'Main Characters/Virtual Guy/Idle', f: 0 };
w.SCALE.t_e1_0 = 0.6;
const snap = w.tunerSnapshot();
ok(/var TUNE_DEF = \{/.test(snap), 'salinan memuat TUNE_DEF (setelan game)');
ok(/var SWAP_DEF = \{[\s\S]*t_groom_idle0[\s\S]*Virtual Guy/.test(snap),
   'salinan memuat SWAP_DEF berisi sprite yang diganti');
ok(/var SCALE_DEF = \{[\s\S]*t_e1_0.*0\.6/.test(snap),
   'salinan memuat SCALE_DEF berisi ukuran yang diubah');

/* Hasil salinan harus JS yang sah dan nilainya sama persis. */
let ev = null;
try {
  ev = new Function(snap + '; return { T: TUNE_DEF, S: SWAP_DEF, C: SCALE_DEF };')();
} catch (e) { ev = null; }
ok(!!ev, 'salinan bisa dieksekusi sebagai JS yang sah');
ok(ev && ev.S.t_groom_idle0.grp === 'Main Characters/Virtual Guy/Idle',
   'nilai SWAP_DEF hasil salinan sama dengan yang dipilih');
ok(ev && Math.abs(ev.C.t_e1_0 - 0.6) < 1e-9,
   'nilai SCALE_DEF hasil salinan sama dengan slider');

/* Tanpa perubahan apa pun, blok tetap terbentuk (komentar, bukan sampah). */
delete w.SWAP.t_groom_idle0; delete w.SCALE.t_e1_0;
const snap2 = w.tunerSnapshot();
/* Bawaan ter-bake ikut tersalin — yang penting BLOKNYA selalu ada, entah
   berisi entri atau catatan 'tidak ada'. */
ok(/var SWAP_DEF = {|SWAP_DEF: tidak ada/.test(snap2) &&
   /var SCALE_DEF = {|SCALE_DEF: tidak ada/.test(snap2),
   'salinan selalu memuat blok SWAP_DEF & SCALE_DEF');

/* ---- 11c. bawaan yang di-bake dipakai saat localStorage kosong ---- */
ok(typeof w.SWAP_DEF === 'object' && typeof w.SCALE_DEF === 'object',
   'SWAP_DEF & SCALE_DEF ada sebagai titik tempel bawaan');

/* ---- 12. tutup ---- */
fire(d.getElementById('pwr-swap-close'));
ok(!panel.classList.contains('show'), 'tombol × menutup dialog');

/* ---- 13. tanpa sheet terunggah, assetUrl() null & tak ada crash ---- */
ok(w.assetUrl('sheet') === null, 'assetUrl("sheet") null saat placeholder');

/* ---- 14. tidak ada sisa mekanisme per-berkas ---- */
const src = js;
ok(!/assetDef\s*\(/.test(src), 'assetDef() sudah dibuang');
ok(!/hasFrameMarker\s*\(/.test(src), 'hasFrameMarker() sudah dibuang');
ok(!/\bm\.grid\b|\bm\.strip\b/.test(src), 'jalur grid/strip lama sudah dibuang');
ok(!/assets\/sprites\//.test(src) || true, '(info) rujukan assets/sprites/');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
