/* Membuktikan logika penanda HIJAU = "belum tersimpan di source".

   Aturan yang diminta user:
     - HIJAU  : nilai baru ada di localStorage, BEDA dari *_DEF di index.js.
                Akan HILANG kalau "Hapus data tersimpan" ditekan.
     - ABU    : nilai sudah di-bake ke *_DEF (aman, ikut ke semua tamu),
                walaupun objeknya bukan sprite bawaan asli.

   Fungsi pembanding diekstrak APA ADANYA dari index.js — bukan disalin
   ulang — supaya tes benar-benar menguji kode yang dipakai.

   Jalankan: node verify-unsaved.cjs */
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

/* --- ekstrak sekumpulan fungsi dari index.js --- */
function grab(name) {
  const start = SRC.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('tidak ada fungsi ' + name);
  let d = 0, end = -1;
  for (let i = SRC.indexOf('{', start); i < SRC.length; i++) {
    if (SRC[i] === '{') d++;
    else if (SRC[i] === '}') { d--; if (d === 0) { end = i + 1; break; } }
  }
  return SRC.slice(start, end);
}
const NAMES = ['_defScale', '_defNudge', 'scaleUnsaved', 'nudgeUnsaved',
               'swapUnsaved', 'slotAnimUnsaved', 'entryUnsaved'];
const ctx = new Function(`
  ${NAMES.map(grab).join('\n')}
  /* Dependensi dari index.js yang tidak ikut diekstrak — distub dengan
     perilaku setara agar yang diuji murni logika pembandingnya. */
  var SCALE = {}, NUDGE = {}, SWAP = {}, SWAP_ANIM = {};
  var SCALE_DEF = {}, NUDGE_DEF = {}, SWAP_DEF = {}, SWAP_ANIM_DEF = {};
  function settingKey(k) { return k; }
  function scalable() { return true; }
  var SCALE_MIN = 0.2, SCALE_MAX = 4, NUDGE_MIN = -64, NUDGE_MAX = 64;
  function scaleOf(key) {
    var s = SCALE[settingKey(key)];
    if (typeof s !== 'number' || !isFinite(s)) return 1;
    return Math.max(SCALE_MIN, Math.min(SCALE_MAX, s));
  }
  function nudgeOf(key) {
    var v = NUDGE[settingKey(key)];
    if (typeof v !== 'number' || !isFinite(v)) return 0;
    return Math.max(NUDGE_MIN, Math.min(NUDGE_MAX, Math.round(v)));
  }
  function normalizeAnimList(l) { return (l && l.length) ? l : null; }
  function slotActiveKeys(slot) { return slot.keys; }
  return {
    set: function (o) {
      SCALE = o.SCALE || {}; NUDGE = o.NUDGE || {};
      SWAP = o.SWAP || {}; SWAP_ANIM = o.SWAP_ANIM || {};
      SCALE_DEF = o.SCALE_DEF || {}; NUDGE_DEF = o.NUDGE_DEF || {};
      SWAP_DEF = o.SWAP_DEF || {}; SWAP_ANIM_DEF = o.SWAP_ANIM_DEF || {};
    },
    entryUnsaved: entryUnsaved, swapUnsaved: swapUnsaved,
    scaleUnsaved: scaleUnsaved, nudgeUnsaved: nudgeUnsaved,
    slotAnimUnsaved: slotAnimUnsaved
  };
`)();

let fail = 0;
const ok = (c, label, extra) => {
  console.log((c ? '  PASS  ' : '  FAIL  ') + label + (c || !extra ? '' : ' -> ' + extra));
  if (!c) fail++;
};

const SLOT = { id: 'siput', keys: ['t_e2a', 't_e2b'], max: 8 };
const F = (grp, f) => ({ grp: grp, f: f });

console.log('\n=== 1. SPRITE PER-KEY ===');
ctx.set({});
ok(!ctx.swapUnsaved('t_x'), 'tak pernah diganti -> ABU');

ctx.set({ SWAP: { t_x: F('A', 1) }, SWAP_DEF: { t_x: F('A', 1) } });
ok(!ctx.swapUnsaved('t_x'),
  'sudah di-bake ke SWAP_DEF -> ABU (INI inti permintaan user)');

ctx.set({ SWAP: { t_x: F('A', 2) }, SWAP_DEF: { t_x: F('A', 1) } });
ok(ctx.swapUnsaved('t_x'), 'diubah lagi setelah bake -> HIJAU');

ctx.set({ SWAP: { t_x: F('A', 1) } });
ok(ctx.swapUnsaved('t_x'), 'baru di localStorage, belum di-bake -> HIJAU');

ctx.set({ SWAP_DEF: { t_x: F('A', 1) } });
ok(ctx.swapUnsaved('t_x'), 'ada di DEF tapi hilang dari nilai berlaku -> HIJAU');

console.log('\n=== 2. UKURAN & GESER ===');
ctx.set({ SCALE: { t_x: 2.5 }, SCALE_DEF: { t_x: 2.5 } });
ok(!ctx.scaleUnsaved('t_x'), 'ukuran sudah di-bake -> ABU');
ctx.set({ SCALE: { t_x: 2.5 }, SCALE_DEF: { t_x: 1 } });
ok(ctx.scaleUnsaved('t_x'), 'ukuran beda dari DEF -> HIJAU');
ctx.set({ SCALE: { t_x: 1 } });
ok(!ctx.scaleUnsaved('t_x'), 'ukuran 100% = bawaan -> ABU');

ctx.set({ NUDGE: { t_x: -8 }, NUDGE_DEF: { t_x: -8 } });
ok(!ctx.nudgeUnsaved('t_x'), 'geser sudah di-bake -> ABU');
ctx.set({ NUDGE: { t_x: -8 } });
ok(ctx.nudgeUnsaved('t_x'), 'geser baru di localStorage -> HIJAU');

console.log('\n=== 3. SUSUNAN RANGKA (slot) ===');
const two = [F('G', 1), F('G', 2)];
ctx.set({ SWAP_ANIM: { siput: two }, SWAP_ANIM_DEF: { siput: two } });
ok(!ctx.slotAnimUnsaved(SLOT), 'susunan rangka sudah di-bake -> ABU');

ctx.set({ SWAP_ANIM: { siput: [F('G', 1), F('G', 9)] },
          SWAP_ANIM_DEF: { siput: two } });
ok(ctx.slotAnimUnsaved(SLOT),
  'jumlah rangka SAMA tapi isinya beda -> HIJAU (dibandingkan per-rangka)');

ctx.set({ SWAP_ANIM: { siput: [F('G', 1)] }, SWAP_ANIM_DEF: { siput: two } });
ok(ctx.slotAnimUnsaved(SLOT), 'jumlah rangka beda -> HIJAU');

ctx.set({ SWAP_ANIM: { siput: two } });
ok(ctx.slotAnimUnsaved(SLOT), 'susunan baru di localStorage -> HIJAU');

console.log('\n=== 4. RINGKASAN SATU BARIS (entryUnsaved) ===');
const M = { key: 't_e2a' };

ctx.set({ SWAP_ANIM: { siput: two }, SWAP_ANIM_DEF: { siput: two } });
ok(!ctx.entryUnsaved(M, SLOT), 'semua sudah di-bake -> baris ABU');

/* Kasus yang mudah terlewat: penyetelan ada di rangka KE-2, bukan ke-1 */
ctx.set({ SWAP_ANIM: { siput: two }, SWAP_ANIM_DEF: { siput: two },
          SCALE: { t_e2b: 2 } });
ok(ctx.entryUnsaved(M, SLOT),
  'ukuran rangka KE-2 belum di-bake -> baris HIJAU (bukan cuma rangka 1)');

ctx.set({ SWAP_ANIM: { siput: two }, SWAP_ANIM_DEF: { siput: two },
          NUDGE: { t_e2b: 5 } });
ok(ctx.entryUnsaved(M, SLOT), 'geser rangka ke-2 belum di-bake -> HIJAU');

ctx.set({ SWAP_ANIM: { siput: two }, SWAP_ANIM_DEF: { siput: two },
          SCALE: { t_e2b: 2 }, SCALE_DEF: { t_e2b: 2 } });
ok(!ctx.entryUnsaved(M, SLOT), 'ukuran rangka ke-2 SUDAH di-bake -> ABU');

/* Objek tanpa slot */
ctx.set({ SWAP: { t_y: F('A', 3) }, SWAP_DEF: { t_y: F('A', 3) } });
ok(!ctx.entryUnsaved({ key: 't_y' }, null), 'objek tanpa slot, sudah di-bake -> ABU');
ctx.set({ SCALE: { t_y: 1.5 } });
ok(ctx.entryUnsaved({ key: 't_y' }, null),
  'objek BAWAAN tapi ukurannya disetel -> HIJAU');

console.log('\n=== 5. SIMULASI "HAPUS DATA TERSIMPAN" ===');
/* wipeStored() menghapus localStorage lalu memuat ulang dari *_DEF.
   Setelah itu nilai berlaku == *_DEF, jadi TIDAK ADA yang hijau lagi. */
const DEF = {
  SWAP_DEF: { t_x: F('A', 1) }, SCALE_DEF: { t_x: 2 }, NUDGE_DEF: { t_x: -4 },
  SWAP_ANIM_DEF: { siput: two }
};
/* sebelum: ada utak-atik lokal di atas DEF */
ctx.set(Object.assign({
  SWAP: { t_x: F('A', 7) }, SCALE: { t_x: 3.5 }, NUDGE: { t_x: 9 },
  SWAP_ANIM: { siput: [F('G', 4)] }
}, DEF));
ok(ctx.entryUnsaved({ key: 't_x' }, null), 'sebelum wipe: ada yang HIJAU');
ok(ctx.slotAnimUnsaved(SLOT), 'sebelum wipe: susunan rangka HIJAU');
/* sesudah: loader menyalin *_DEF (localStorage kosong) */
ctx.set(Object.assign({
  SWAP: { t_x: F('A', 1) }, SCALE: { t_x: 2 }, NUDGE: { t_x: -4 },
  SWAP_ANIM: { siput: two }
}, DEF));
ok(!ctx.entryUnsaved({ key: 't_x' }, null),
  'sesudah wipe: nilai kembali ke DEF -> tidak ada HIJAU');
ok(!ctx.slotAnimUnsaved(SLOT), 'sesudah wipe: susunan rangka ABU');

console.log('\n=== 6. TERPASANG DI UI ===');
const buildFn = SRC.slice(SRC.indexOf('function buildSwapList('),
                          SRC.indexOf('function buildSwapPicker('));
ok(/var unsaved = entryUnsaved\(m, sl\);/.test(buildFn) &&
   /if \(unsaved\) \{ sub\.className = 'is-swapped'; nUnsaved\+\+; \}/.test(buildFn),
  'buildSwapList memakai entryUnsaved untuk menentukan hijau');
ok(/pwr-swap-unsaved/.test(buildFn) && /belum tersimpan/.test(buildFn),
  'lencana ringkasan "N belum tersimpan" diisi');
ok(!/if \(SWAP\[m\.key\] \|\| custom \|\| nTuned > 0\) sub\.className/.test(SRC),
  'kondisi lama ("bukan bawaan asli") sudah tidak dipakai');
ok(/stateTxt = !changed \? 'bawaan' : \(unsaved \? 'diganti' : 'tersimpan'\)/.test(SRC),
  'label membedakan 3 keadaan: bawaan / tersimpan / diganti');
const wipe = SRC.slice(SRC.indexOf('function wipeStored('),
                       SRC.indexOf('function wipeStored(') + 1400);
ok(/loadSwap\(\); loadScale\(\); loadNudge\(\); loadSwapAnim\(\);/.test(wipe),
  'wipeStored memuat ulang dari *_DEF');
ok(/buildSwapList\(\)/.test(wipe), 'wipeStored membangun ulang daftar (hijau ikut hilang)');
const cssTxt = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
ok(/\.pwr-swap-item-txt i\.is-swapped::before/.test(cssTxt),
  'penanda ● ada (tidak bergantung warna saja)');

console.log('\n=== 7. PANEL "ATUR GAME" (konvensi yang sama) ===');
/* Panel tuning punya lapis nilai yang sama: TUNE_DEF (di-bake) vs
   localStorage. wipeStored() juga menghapus TUNE_KEY, jadi penandanya
   harus mengikuti aturan yang sama dengan dialog Ganti Sprite. */
const tuneCtx = new Function(`
  ${grab('tuneUnsaved')}
  ${grab('tuneUnsavedCount')}
  var TUNE = {}, TUNE_DEF = {}, TUNE_SPECS = [];
  return {
    set: function (cur, def, specs) { TUNE = cur; TUNE_DEF = def; TUNE_SPECS = specs || []; },
    tuneUnsaved: tuneUnsaved, tuneUnsavedCount: tuneUnsavedCount
  };
`)();

tuneCtx.set({ gravity: 1700 }, { gravity: 1700 });
ok(!tuneCtx.tuneUnsaved('gravity'), 'nilai sama dengan TUNE_DEF -> ABU');
tuneCtx.set({ gravity: 1900 }, { gravity: 1700 });
ok(tuneCtx.tuneUnsaved('gravity'), 'nilai beda dari TUNE_DEF -> HIJAU');
/* Slider float bisa menghasilkan galat pembulatan; jangan sampai
   0.1+0.2 dianggap "berubah". */
tuneCtx.set({ g: 0.1 + 0.2 }, { g: 0.3 });
ok(!tuneCtx.tuneUnsaved('g'), 'galat float tidak dianggap berubah', '0.1+0.2 vs 0.3');

tuneCtx.set({ a: 1, b: 5, c: 9 }, { a: 1, b: 2, c: 3 },
            [{ k: 'a' }, { k: 'b' }, { k: 'c' }]);
ok(tuneCtx.tuneUnsavedCount() === 2, 'penghitung: 2 dari 3 slider belum tersimpan',
  String(tuneCtx.tuneUnsavedCount()));
tuneCtx.set({ a: 1 }, { a: 1 }, [{ k: 'a' }]);
ok(tuneCtx.tuneUnsavedCount() === 0, 'semua sama dengan DEF -> penghitung 0');

const tunerFn = SRC.slice(SRC.indexOf('function buildTuner('),
                          SRC.indexOf('function syncTuneUnsavedBadge('));
ok(/markTuneVal\(vl, spec\.k\)/.test(tunerFn), 'tiap baris slider ditandai');
ok((tunerFn.match(/markTuneVal\(vl, spec\.k\)/g) || []).length >= 2,
  'penanda ikut diperbarui saat slider digeser (bukan hanya saat dibangun)');
ok(/syncTuneUnsavedBadge\(\)/.test(tunerFn), 'lencana ringkasan disegarkan');
/* wipeStored memanggil buildTuner, jadi penanda ikut bersih */
const wipeFn = SRC.slice(SRC.indexOf('function wipeStored('),
                         SRC.indexOf('function wipeStored(') + 1400);
ok(/buildTuner\(\)/.test(wipeFn), 'wipeStored membangun ulang panel tuning');
ok(/TUNE = loadTune\(\)/.test(wipeFn), 'wipeStored memuat ulang TUNE dari DEF');
ok(/\.pwr-tune-row-val\.is-unsaved/.test(cssTxt), 'style hijau panel tuning ada');
ok(/#pwr-tune-unsaved \{[^}]*margin-left:\s*auto/.test(cssTxt),
  'lencana didorong kanan pakai margin (header flex, float tak berlaku)');

console.log('\n' + (fail === 0 ? '>>> SEMUA CEK LOLOS' : '>>> ' + fail + ' CEK GAGAL'));
process.exit(fail === 0 ? 0 : 1);
