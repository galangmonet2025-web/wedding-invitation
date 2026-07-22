/* Simulasi: developer menempel hasil "Salin nilai" ke index.js, lalu
   dibuka di browser BARU (localStorage kosong). Bawaan harus berlaku. */
const fs = require('fs');
const { JSDOM } = require('jsdom');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

let js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

/* Tempel bawaan, persis seperti hasil tunerSnapshot().
   Blok DEF diganti UTUH lewat regex, bukan mencocokkan "= {};" literal:
   blok itu sekarang sudah berisi nilai ter-bake sungguhan, jadi pola
   lama tidak pernah cocok dan uji ini diam-diam menguji hal lain. */
function replaceDefBlock(src, name, body) {
  /* Diikat ke AWAL BARIS (^ + flag m). Tanpa itu, polanya juga cocok
     dengan teks "var SWAP_DEF = {" yang ada DI DALAM string literal
     tunerSnapshot(), sehingga hasil tempelan jadi JS rusak. */
  /* Blok kosong satu baris ("var SCALE_DEF = {};") HARUS dicoba lebih
     dulu. Pola multi-baris di bawahnya butuh "};" di awal baris, jadi
     kalau blok yang dicari kosong, polanya melahap terus sampai "};"
     milik blok BERIKUTNYA — menghapus deklarasi yang tidak bersalah
     (dulu: NUDGE_DEF ikut hilang, dan errornya muncul jauh dari sini). */
  const reEmpty = new RegExp('^var ' + name + ' = \\{\\s*\\};', 'm');
  const re = new RegExp('^var ' + name + ' = \\{[\\s\\S]*?^\\};', 'm');
  const use = reEmpty.test(src) ? reEmpty : re;
  if (!use.test(src)) throw new Error('blok ' + name + ' tidak ditemukan');
  return src.replace(use, 'var ' + name + ' = {\n' + body + '\n};');
}
js = replaceDefBlock(js, 'SWAP_DEF',
  "  't_groom_idle0': { grp: 'Main Characters/Virtual Guy/Idle', f: 0 }");
js = replaceDefBlock(js, 'SCALE_DEF', "  't_e1_0': 0.6");

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => ({
  imageSmoothingEnabled: true, drawImage(){}, fillRect(){}, clearRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){} });
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);

ok(w.SWAP.t_groom_idle0 &&
   w.SWAP.t_groom_idle0.grp === 'Main Characters/Virtual Guy/Idle',
   'localStorage kosong -> SWAP memakai SWAP_DEF yang di-bake');
ok(Math.abs(w.scaleOf('t_e1_0') - 0.6) < 1e-9,
   'localStorage kosong -> SCALE memakai SCALE_DEF (' + w.scaleOf('t_e1_0') + ')');

const ent = w.ASSET_MAP.find(m => m.key === 't_groom_idle0');
ok(w.effectiveSrc(ent).grp === 'Main Characters/Virtual Guy/Idle',
   'potongan tekstur benar-benar mengikuti bawaan yang di-bake');

/* localStorage harus MENIMPA bawaan */
w.localStorage.setItem('pwr_swap_v1',
  JSON.stringify({ t_groom_idle0: { grp: 'Main Characters/Pink Man/Idle', f: 0 } }));
w.loadSwap();
ok(w.SWAP.t_groom_idle0.grp === 'Main Characters/Pink Man/Idle',
   'pilihan lokal menimpa bawaan yang di-bake');

/* key lain yang tidak ada di localStorage tetap dari bawaan */
w.localStorage.setItem('pwr_scale_v1', JSON.stringify({ t_e3_0: 1.4 }));
w.loadScale();
ok(Math.abs(w.scaleOf('t_e1_0') - 0.6) < 1e-9 &&
   Math.abs(w.scaleOf('t_e3_0') - 1.4) < 1e-9,
   'gabungan: bawaan + lokal (t_e1_0=0.6 dari bake, t_e3_0=1.4 dari lokal)');

/* ---- Nilai yang BENAR-BENAR di-bake di index.js sekarang ----
   Dijalankan pada berkas ASLI (bukan yang ditempel di atas), supaya
   salah ketik pada blok bawaan langsung ketahuan di sini. */
const dom2 = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w2 = dom2.window;
w2.HTMLCanvasElement.prototype.getContext = () => ({
  imageSmoothingEnabled: true, drawImage(){}, fillRect(){}, clearRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){} });
w2.Phaser = undefined;
w2.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w2.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                         addEventListener(){}, removeEventListener(){} });
w2.eval(fs.readFileSync('index.js', 'utf8'));

const SM2 = w2.SHEET_MAP;
/* tiap rujukan di keempat blok bawaan harus benar-benar ada di sheet */
let refBad = [];
for (const k in w2.SWAP_DEF) {
  const s = w2.SWAP_DEF[k];
  if (!SM2[s.grp] || (s.f || 0) >= SM2[s.grp].length) refBad.push('SWAP ' + k);
}
for (const id in w2.SWAP_ANIM_DEF) {
  w2.SWAP_ANIM_DEF[id].forEach((fr, i) => {
    if (!SM2[fr.grp] || fr.f >= SM2[fr.grp].length) refBad.push('ANIM ' + id + '#' + i);
  });
}
ok(refBad.length === 0, 'semua rujukan bawaan ada di sheet' +
   (refBad.length ? ' -> ' + refBad.join(', ') : ''));

/* jumlah rangka tidak melebihi max slot (kalau lebih, diam-diam dipotong) */
let overMax = [];
for (const id in w2.SWAP_ANIM_DEF) {
  const sl = w2.slotById(id);
  if (!sl) { overMax.push(id + ' (slot tak ada)'); continue; }
  const want = w2.SWAP_ANIM_DEF[id].length, max = sl.max || 8;
  if (want > max) overMax.push(id + ' ' + want + '>' + max);
}
ok(overMax.length === 0, 'jumlah rangka bawaan muat di max tiap slot' +
   (overMax.length ? ' -> ' + overMax.join(', ') : ''));

/* slotFrames() memang memakai susunan bawaan itu, bukan mengabaikannya */
const coinSl = w2.slotById('coin');
ok(w2.slotFrames(coinSl).length === 8 &&
   w2.slotFrames(coinSl).every(f => f.grp === 'Items/Fruits/Bananas'),
   'coin ter-bake 8 rangka Bananas (' + w2.slotFrames(coinSl).length + ')');
const goalSl = w2.slotById('goal');
ok(w2.slotFrames(goalSl).length === 10, 'goal ter-bake 10 rangka (bendera berkibar)');
ok(w2.slotAnimName('goal') === 'goal_wave', 'goal tetap beranimasi');
/* foe2 dua-wujud: TIDAK boleh berubah jadi animasi walau diberi 2 entri */
ok(w2.slotAnimName('foe2') === null,
   'foe2 tetap dua-WUJUD, bukan animasi (utuh/cangkang dipilih logika game)');
/* NUDGE_DEF t_goal:-9 sudah DIBUANG. Dulu itu tambalan manual untuk
   menarik bendera yang tenggelam karena dipatok GY-80 dgn acuan tengah.
   Sesudah acuannya diperbaiki (kaki dipatok ke tanah), geseran itu
   justru mengangkat bendera dari tanah. */
ok(w2.nudgeOf('t_goal') === 0,
   'bendera tanpa geseran bawaan — kakinya menapak tanah (' +
   w2.nudgeOf('t_goal') + ')');
/* Bendera diperbesar 2,5x lewat SCALE_DEF. Yang penting BUKAN angkanya
   saja, tapi bahwa SEMUA rangka goal punya angka yang SAMA: ukuran
   disimpan per rangka, jadi satu rangka yang tertinggal membuat bendera
   berkedip besar-kecil mengikuti animasinya. */
var goalKeys = w2.slotActiveKeys(goalSl);
var goalScales = goalKeys.map(function (k) { return w2.scaleOf(k); });
ok(goalScales.every(function (v) { return v === 2.5; }),
   'SEMUA ' + goalKeys.length + ' rangka bendera diskala 2,5x — tidak berkedip (' +
   goalScales.join(',') + ')');
/* Sebaliknya: jangan ada key SCALE_DEF yang tidak terpakai — itu tanda
   daftar rangka berubah tapi SCALE_DEF tertinggal. Key yang sah = key
   aktif slot mana pun (bukan cuma goal: pengantin pria juga diskala). */
var validKeys = {};
w2.ANIM_SLOTS.forEach(function (sl) {
  w2.slotActiveKeys(sl).forEach(function (k) { validKeys[k] = true; });
});
w2.ASSET_MAP.forEach(function (m) { validKeys[m.key] = true; });
var orphan = Object.keys(w2.SCALE_DEF).filter(function (k) {
  return !validKeys[k];
});
ok(orphan.length === 0,
   'tidak ada key SCALE_DEF yang mubazir' +
   (orphan.length ? ' -> ' + orphan.join(', ') : ''));

/* PENGANTIN PRIA: seluruh rangka harus punya skala yang SAMA.
   Kalau satu rangka tertinggal, badan pemain berkedip besar-kecil saat
   berlari DAN hitboxnya ikut berubah tiap rangka — muat/tidaknya pemain
   di celah plafon jadi berubah-ubah tanpa sebab yang terlihat. */
var groomKeys = Object.keys(w2.SCALE_DEF).filter(function (k) {
  return k.indexOf('t_groom') === 0;
});
if (groomKeys.length) {
  var groomVals = groomKeys.map(function (k) { return w2.SCALE_DEF[k]; });
  ok(new Set(groomVals).size === 1,
     'SEMUA ' + groomKeys.length + ' rangka pengantin pria berskala sama (' +
     groomVals[0] + ') — badan tidak berkedip & hitbox tetap');
  /* dan tidak ada rangka pemain yang TERLEWAT */
  var idleSlotKeys = [];
  ['player_idle', 'player_run', 'player_jump', 'player_fall', 'player_hurt']
    .forEach(function (id) {
      var sl = w2.slotById(id);
      if (sl) idleSlotKeys = idleSlotKeys.concat(w2.slotActiveKeys(sl));
    });
  var missed = idleSlotKeys.filter(function (k) {
    return k.indexOf('t_groom') === 0 && groomKeys.indexOf(k) < 0;
  });
  ok(missed.length === 0,
     'tidak ada rangka pemain yang terlewat dari SCALE_DEF' +
     (missed.length ? ' -> ' + missed.join(', ') : ''));
}
/* ATURAN, bukan angka. Nilai TUNE_DEF memang berubah tiap kali hasil
   penyetelan di panel ATUR GAME di-bake lewat "Salin nilai" — mengunci
   angkanya membuat tes ini gagal PALSU setiap kali itu terjadi, dan
   pesan gagalnya tidak memberi tahu apa yang sebenarnya salah.
   Yang HARUS dijaga adalah rentang & hubungan antar-nilai. */
const T = w2.TUNE_DEF;
ok(T.platH >= 30 && T.platH <= 100, 'platH di rentang slider (' + T.platH + ')');
ok(T.platH2 >= 30 && T.platH2 <= 100, 'platH2 di rentang slider (' + T.platH2 + ')');
ok(T.reach >= 50 && T.reach <= 95, 'reach di rentang slider (' + T.reach + ')');
/* platH2 boleh sama atau lebih tinggi; recomputeDerived() menaikkannya
   kalau lebih rendah, jadi nilai yang lebih rendah bukan bug — tapi
   nilai di luar rentang slider tidak akan pernah bisa diatur ulang
   dari UI, dan itu memang bug. */
ok(w2.TUNE_SPECS.every(s => {
  const v = T[s.k];
  return typeof v === 'number' && v >= s.min && v <= s.max;
}), 'SETIAP nilai TUNE_DEF bisa dicapai oleh slidernya sendiri');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
