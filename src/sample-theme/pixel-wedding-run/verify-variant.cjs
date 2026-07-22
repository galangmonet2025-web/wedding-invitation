/* Uji PENGGANTIAN TINGKAT SLOT:
     - ganti seluruh objek sekaligus dengan satu kelompok
     - objek DIAM bisa dibuat BERGERAK dengan memberi >1 rangka
     - objek bergerak bisa dikembalikan jadi diam
     - semua objek (termasuk yang tadinya prosedural) muncul di dialog */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const P = require('./assets/png.cjs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('index.js', 'utf8');
const sheet = P.readPNG('assets/sprite-sheet.png');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;
let calls = [];
w.HTMLCanvasElement.prototype.getContext = function () { return {
  imageSmoothingEnabled: true,
  drawImage: (...a) => calls.push(a),
  getImageData: (x, y, a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }),
  fillRect(){}, clearRect(){}, fillText(){}, save(){}, restore(){}, translate(){},
  scale(){}, beginPath(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){},
  lineTo(){}, arc(){}, rect(){} }; };
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

const SM = w.SHEET_MAP, AM = w.ASSET_MAP;
const ent = k => AM.find(m => m.key === k);

/* ---- 1. semua objek punya slot / muncul di dialog ---- */
ok(w.ANIM_SLOTS.length >= 20,
   'ada ' + w.ANIM_SLOTS.length + ' slot objek');
const badSlot = w.ANIM_SLOTS.filter(s => s.keys.some(k => !ent(k)));
ok(badSlot.length === 0, 'semua key slot ada di ASSET_MAP' +
   (badSlot.length ? ' -> ' + badSlot.map(s => s.id).join(',') : ''));

/* objek yang dulu prosedural kini terpetakan */
/* Awan & pohon SENGAJA tidak ada di daftar ini — lihat tes di bagian 14. */
['t_piece0','t_bride','t_boss1','t_e2_walk','t_e2_shell',
 't_bush','t_rock','t_flower','t_tuft','t_fence']
  .forEach(k => ok(!!ent(k), 'objek dulu-prosedural terpetakan: ' + k));

/* ---- 2. ukuran = ukuran art prosedural (hitbox tidak meleset) ---- */
const SIZES = { t_piece0:[40,32], t_bride:[48,64], t_boss1:[96,117],
                t_e2_walk:[44,40], t_e2_shell:[44,40], t_bush:[40,25],
                t_rock:[40,25], t_flower:[25,25], t_tuft:[35,20],
                t_fence:[32,24] };
const wrongSize = Object.entries(SIZES).filter(([k, s]) => {
  const e = ent(k); return !e || e.w !== s[0] || e.h !== s[1];
});
ok(wrongSize.length === 0, 'ukuran cocok dgn art prosedural' +
   (wrongSize.length ? ' -> ' + wrongSize.map(x => x[0]).join(',') : ''));

/* ---- 3. semua grp menunjuk kelompok yang ADA ---- */
const badGrp = AM.filter(m => !SM[m.grp]);
ok(badGrp.length === 0, 'semua grp ada di SHEET_MAP' +
   (badGrp.length ? ' -> ' + badGrp.map(m => m.key + ':' + m.grp).join(', ') : ''));
const badF = AM.filter(m => SM[m.grp] && (m.f || 0) >= SM[m.grp].length);
ok(badF.length === 0, 'semua f dalam jangkauan' +
   (badF.length ? ' -> ' + badF.map(m => m.key).join(',') : ''));

/* ---- 3b. SUSUNAN BAWAAN DITAMPILKAN APA ADANYA ----
   Ini inti keluhan: game memakai rangka 0 dan 5 dari kelompok Idle yang
   berisi 11 rangka. Model lama { grp, n } tidak bisa menyatakan itu —
   n=2 selalu diartikan rangka 0 dan 10. Jadi yang dilihat user di dialog
   TIDAK PERNAH sama dengan yang berjalan di game. */
const idleSlot = w.slotById('player_idle');
const idleDef = w.slotDefaultFrames(idleSlot);
ok(idleDef.length === idleSlot.keys.length,
   'susunan bawaan = jumlah key slot (' + idleDef.length + ' rangka)');
const idleReal = idleSlot.keys.map(k => { const e = ent(k); return e.grp + '#' + (e.f || 0); });
const idleShown = idleDef.map(f => f.grp + '#' + f.f);
ok(idleShown.join(' | ') === idleReal.join(' | '),
   'susunan yang DITAMPILKAN persis = yang dipakai game (' + idleShown.join(', ') + ')');
/* dan memang BUKAN sebaran merata sepanjang kelompok */
const idleAvail = SM[idleDef[0].grp].length;
ok(idleAvail > idleDef.length,
   'kelompok sumbernya lebih besar (' + idleAvail + ' rangka) dari yang dipakai (' +
   idleDef.length + ') — inilah beda yang dulu membingungkan');
ok(idleDef[idleDef.length - 1].f !== idleAvail - 1,
   'rangka terakhir bukan rangka terakhir kelompok (f=' +
   idleDef[idleDef.length - 1].f + ', bukan ' + (idleAvail - 1) + ')');
/* tanpa penggantian, slotFrames() = bawaan */
ok(!w.SWAP_ANIM['player_idle'], 'bawaan: player_idle tidak ada di SWAP_ANIM');
ok(JSON.stringify(w.slotFrames(idleSlot)) === JSON.stringify(idleDef),
   'slotFrames() tanpa penggantian = susunan bawaan');
ok(w.slotIsCustom(idleSlot) === false, 'slotIsCustom bawaan = false');

/* ---- 4. DIAM -> BERGERAK ---- */
const still = w.slotById('bride');
ok(still.keys.length === 1, 'pengantin wanita bawaannya 1 rangka (diam)');
ok(w.slotAnimName('bride') === null, 'bawaan: tidak ada animasi');

/* beri 6 rangka eksplisit dari kelompok 11-rangka */
const PMI = 'Main Characters/Pink Man/Idle';
w.SWAP_ANIM.bride = [0,2,4,6,8,10].map(f => ({ grp: PMI, f }));
const keysNow = w.slotActiveKeys(still);
ok(keysNow.length === 6, 'diberi 6 rangka -> slotActiveKeys jadi 6 (dapat ' +
   keysNow.length + ')');
ok(keysNow[0] === 't_bride' && /^bride__a/.test(keysNow[1]),
   'rangka tambahan diberi key baru "bride__aN" (' + keysNow[1] + ')');
ok(w.slotAnimName('bride') === 'bride_idle',
   'objek diam kini PUNYA animasi: ' + w.slotAnimName('bride'));
ok(w.slotIsCustom(still) === true, 'slotIsCustom setelah diganti = true');

/* rangka dipakai PERSIS seperti yang diminta — tidak dihitung ulang */
const got = w.slotFrames(still).map(f => f.f);
ok(got.join(',') === '0,2,4,6,8,10',
   'rangka dipakai persis seperti didaftarkan (' + got.join(',') + ')');
ok(w.effectiveSrc(ent('t_bride')).f === 0, 'rangka 1 -> f=0');
const x3 = w.extraEntryFor(still, keysNow[3], 3);
ok(x3.f === 6, 'rangka ke-4 -> f=6 (bukan hasil sebaran merata)');

/* ---- 5. tekstur tambahan benar-benar dibuat & isinya beda ---- */
const added = {};
const scene = { textures: {
  exists: k => !!added[k], addCanvas: (k, cv) => { added[k] = cv; },
  remove: k => { delete added[k]; } } };
w.applySheetTextures(scene);
const madeExtra = keysNow.filter(k => added[k]);
ok(madeExtra.length === 6, 'keenam tekstur rangka dibuat (dapat ' +
   madeExtra.length + ')');

/* potongan rangka 1 vs rangka 6 harus BEDA koordinat */
function cropOf(key, i) {
  const e = i === 0 ? ent('t_bride') : w.extraEntryFor(still, key, i);
  delete added[key]; calls = [];
  w.assetToTexture(scene, e);
  return calls.length ? calls[0].slice(1, 5).join(',') : null;
}
const c0 = cropOf(keysNow[0], 0), c5 = cropOf(keysNow[5], 5);
ok(c0 && c5 && c0 !== c5,
   'rangka 1 dan rangka 6 memotong bagian sheet BERBEDA (animasi nyata)');

/* ---- 6. rangka tambahan mewarisi ukuran & setelan slot ---- */
const exE = w.extraEntryFor(still, keysNow[3], 3);
ok(exE.w === ent('t_bride').w && exE.h === ent('t_bride').h,
   'rangka tambahan berukuran sama dgn rangka 1 (' + exE.w + 'x' + exE.h + ')');
/* Setelan ukuran/geser kini PER RANGKA: tiap rangka punya nilainya
   sendiri dan tidak saling mempengaruhi. */
w.SCALE.t_bride = 0.5;
ok(Math.abs(w.scaleOf('t_bride') - 0.5) < 1e-9, 'rangka 1 memakai skalanya sendiri');
ok(w.scaleOf(keysNow[3]) === 1,
   'rangka lain TIDAK ikut terpengaruh (' + w.scaleOf(keysNow[3]) + ')');
w.SCALE[keysNow[3]] = 1.5;
ok(Math.abs(w.scaleOf(keysNow[3]) - 1.5) < 1e-9 &&
   Math.abs(w.scaleOf('t_bride') - 0.5) < 1e-9,
   'dua rangka boleh punya skala BERBEDA (0.5 vs 1.5)');
/* ukuran tekstur benar-benar mengikuti skala masing-masing */
const szF1 = w.sizeOf(ent('t_bride'));
const szF4 = w.sizeOf(w.extraEntryFor(still, keysNow[3], 3));
ok(szF4.w > szF1.w,
   'ukuran tekstur tiap rangka ikut skalanya (' + szF1.w + ' vs ' + szF4.w + ')');
w.NUDGE.t_bride = -6;
ok(w.nudgeOf('t_bride') === -6 && w.nudgeOf(keysNow[3]) === 0,
   'geseran juga per rangka (rangka 1 = -6, rangka 4 = 0)');
delete w.SCALE.t_bride; delete w.SCALE[keysNow[3]]; delete w.NUDGE.t_bride;

/* ---- 6b. RANGKA BOLEH DICAMPUR DARI KELOMPOK BERBEDA ----
   Ini yang diminta: "bebas pilih susunan sprite dari kelompok mana saja". */
w.SWAP_ANIM.bride = [
  { grp: PMI, f: 0 },
  { grp: 'Items/Fruits/Kiwi', f: 0 },
  { grp: 'Traps/Saw/On', f: 0 }
];
const mixKeys = w.slotActiveKeys(still);
const mixGrps = mixKeys.map((k, i) =>
  i === 0 ? w.effectiveSrc(ent('t_bride')).grp : w.extraEntryFor(still, k, i).grp);
ok(new Set(mixGrps).size === 3,
   'tiga rangka dari TIGA kelompok berbeda (' + mixGrps.join(' | ') + ')');
delete w.SWAP_ANIM.bride;

/* ---- 7. BERGERAK -> DIAM lagi ---- */
w.SWAP_ANIM.bride = [{ grp: PMI, f: 0 }];
ok(w.slotActiveKeys(still).length === 1, 'diturunkan ke 1 rangka');
ok(w.slotAnimName('bride') === null, 'kembali DIAM (tidak ada animasi)');
delete w.SWAP_ANIM.bride;

/* ---- 8. daftar dijepit ke max slot ---- */
const coinSlot = w.slotById('coin');
w.SWAP_ANIM.coin = [];
for (let i = 0; i < 99; i++) w.SWAP_ANIM.coin.push({ grp: 'Traps/Saw/On', f: 0 });
ok(w.slotFrames(coinSlot).length === coinSlot.max,
   'daftar dijepit ke max slot (' + w.slotFrames(coinSlot).length + ')');
delete w.SWAP_ANIM.coin;

/* ---- 8b. bentuk LAMA { grp, n } masih diterima (migrasi) ----
   Nilai lama bisa sudah tersimpan di localStorage pengguna; membuangnya
   akan menghapus hasil penyetelan yang sudah dilakukan. */
w.localStorage.setItem('pwr_swapanim_v1',
  JSON.stringify({ coin: { grp: 'Traps/Saw/On', n: 3 } }));
w.loadSwapAnim();
const migr = w.SWAP_ANIM.coin;
ok(Object.prototype.toString.call(migr) === '[object Array]',
   'bentuk lama {grp,n} diubah jadi daftar rangka');
ok(migr.length === 3 && migr.every(f => f.grp === 'Traps/Saw/On'),
   'hasil migrasi: 3 rangka dari kelompok yang sama');
const sawN = SM['Traps/Saw/On'].length;
ok(migr[0].f === 0 && migr[2].f === sawN - 1,
   'migrasi memakai sebaran merata seperti arti lamanya (' +
   migr.map(f => f.f).join(',') + ')');
w.localStorage.removeItem('pwr_swapanim_v1');
w.loadSwapAnim();

/* ---- 9. slot MENANG atas penggantian per-key ---- */
w.SWAP.t_coin0 = { grp: 'Items/Fruits/Kiwi', f: 0 };
w.SWAP_ANIM.coin = [0,1,2,3].map(f => ({ grp: 'Traps/Saw/On', f }));
ok(w.effectiveSrc(ent('t_coin0')).grp === 'Traps/Saw/On',
   'penggantian slot menang atas per-key');
delete w.SWAP_ANIM.coin;
ok(w.effectiveSrc(ent('t_coin0')).grp === 'Items/Fruits/Kiwi',
   'tanpa slot, per-key kembali berlaku');
delete w.SWAP.t_coin0;

/* ---- 10. UI: tombol "Pakai kelompok ini" ada & bekerja ---- */
const d = w.document;
const fire = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
fire(d.getElementById('pwr-tune-swap'));
const pick = key => fire(d.querySelector('#pwr-swap-list [data-swap-key="' + key + '"]'));

/* ---- 10a. DERET RANGKA menampilkan susunan APA ADANYA ---- */
pick('t_groom_idle0');
let cells = d.querySelectorAll('#pwr-swap-pick .pwr-swap-frame:not(.is-add)');
ok(cells.length === idleDef.length,
   'deret rangka menampilkan ' + idleDef.length + ' kotak, sama dgn yang ' +
   'dipakai game (dapat ' + cells.length + ')');
/* judul tiap kotak menyebut nomor sprite yang BENAR */
const wantTitle = idleDef.map(f => {
  const sf = w.sheetFrame(f.grp, f.f); return f.grp + ' #' + sf.i;
});
const gotTitle = [...cells].map(c => c.getAttribute('title'));
/* Judul kotak boleh MEMUAT keterangan tambahan (mis. "· 90%" saat rangka
   itu punya skala sendiri) — itu memang informasi berguna bagi user.
   Yang wajib dijaga: identitas sprite-nya benar. Menuntut string sama
   persis membuat tes ini gagal hanya karena keterangan bertambah. */
const titleOk = wantTitle.every((want, i) =>
  (gotTitle[i] || '').indexOf(want) === 0);
ok(titleOk,
   'tiap kotak menunjuk sprite yang benar (' + gotTitle.join(', ') + ')');
/* Label kotak = NOMOR SPRITE di sheet, bukan nomor urut 1,2,3.
   Urutan sudah terbaca dari kiri ke kanan; nomor sprite tidak terlihat
   di mana pun selain di sini. */
const wantNo = idleDef.map(f => String(w.sheetFrame(f.grp, f.f).i));
const gotNo = [...cells].map(c => c.querySelector('.pwr-swap-frame-n').textContent);
ok(gotNo.join(',') === wantNo.join(','),
   'label kotak = nomor sprite (' + gotNo.join(',') + ')');
ok(gotNo.join(',') !== idleDef.map((_, i) => i + 1).join(','),
   'label BUKAN nomor urut 1,2,3');

/* kotak "+" ada di AKHIR deret */
const strip = d.querySelector('#pwr-swap-pick .pwr-swap-frames');
ok(strip && strip.lastChild && strip.lastChild.classList.contains('is-add'),
   'kotak "+" berada di akhir deret');

/* ---- 10b. klik "+" menambah rangka ---- */
const before = w.slotFrames(idleSlot).length;
fire(d.querySelector('#pwr-swap-pick [data-frame-add]'));
ok(w.slotFrames(idleSlot).length === before + 1,
   'klik "+" -> rangka bertambah jadi ' + w.slotFrames(idleSlot).length);
cells = d.querySelectorAll('#pwr-swap-pick .pwr-swap-frame:not(.is-add)');
ok(cells.length === before + 1, 'deret ikut bertambah jadi ' + cells.length + ' kotak');
ok(w._swapFrame === before, 'rangka baru langsung terpilih untuk diedit');

/* ---- 10c. memilih sprite masuk ke RANGKA YANG DIPILIH saja ---- */
/* Ambil sel dari kelompok LAIN daripada kelompok bawaan rangka 1, supaya
   yang diuji benar-benar "campur kelompok", bukan ganti nomor rangka. */
const otherCell = [...d.querySelectorAll('#pwr-swap-pick [data-swap-grp]')]
  .find(c => c.getAttribute('data-swap-grp') !== idleDef[0].grp);
if (otherCell) {
  const oGrp = otherCell.getAttribute('data-swap-grp');
  const oF = parseInt(otherCell.getAttribute('data-swap-f'), 10) || 0;
  fire(otherCell);
  const fl = w.slotFrames(idleSlot);
  ok(fl[before].grp === oGrp && fl[before].f === oF,
     'sprite dipilih masuk ke rangka ke-' + (before + 1) + ' (' + oGrp + '#' + oF + ')');
  ok(fl[0].grp === idleDef[0].grp && fl[0].f === idleDef[0].f,
     'rangka 1 TIDAK ikut berubah (' + fl[0].grp + '#' + fl[0].f + ')');
  ok(fl[0].grp !== fl[before].grp,
     'hasilnya benar-benar campuran DUA kelompok berbeda');
} else { ok(false, 'tidak ada sel dari kelompok lain'); }

/* ---- 10d. tombol × menghapus satu rangka ---- */
const nBefore = w.slotFrames(idleSlot).length;
fire(d.querySelector('#pwr-swap-pick [data-frame-del="' + (nBefore - 1) + '"]'));
ok(w.slotFrames(idleSlot).length === nBefore - 1,
   'klik × -> rangka berkurang jadi ' + w.slotFrames(idleSlot).length);
/* rangka terakhir tidak boleh dihapus */
w.SWAP_ANIM['player_idle'] = [{ grp: PMI, f: 0 }];
w.buildSwapPicker();
ok(d.querySelector('#pwr-swap-pick [data-frame-del]') === null,
   'saat tersisa 1 rangka, tombol × tidak ditampilkan');
delete w.SWAP_ANIM['player_idle'];
w._swapFrame = 0;

/* ---- 10d2. tombol "Samakan ke semua rangka" ----
   Muncul HANYA kalau setelan antar rangka memang berbeda. */
pick('t_groom_idle0');
w._swapFrame = 0;
const idleKeys0 = w.slotActiveKeys(idleSlot);
/* semua rangka masih sama -> tombol tidak boleh ada */
idleKeys0.forEach(k => { delete w.SCALE[k]; delete w.NUDGE[k]; });
w.buildSwapPicker();
ok(d.querySelector('#pwr-swap-pick [data-same-slot]') === null,
   'setelan semua rangka sama -> tombol "Samakan" TIDAK ditampilkan');
ok(w.slotSettingsDiffer(idleSlot) === false, 'slotSettingsDiffer = false saat seragam');

/* buat rangka 2 berbeda -> tombol muncul */
w.SCALE[idleKeys0[1]] = 1.5;
w.buildSwapPicker();
ok(w.slotSettingsDiffer(idleSlot) === true, 'slotSettingsDiffer = true saat beda');
const sameBtn = d.querySelector('#pwr-swap-pick [data-same-slot]');
ok(!!sameBtn, 'ada rangka berbeda -> tombol "Samakan" muncul');

/* pilih rangka 1 (skala 0.8) lalu samakan -> semua jadi 0.8 */
w.SCALE[idleKeys0[0]] = 0.8;
w.NUDGE[idleKeys0[0]] = -5;
w._swapFrame = 0;
w.buildSwapPicker();
fire(d.querySelector('#pwr-swap-pick [data-same-slot]'));
const allSc = idleKeys0.map(k => w.scaleOf(k));
const allNz = idleKeys0.map(k => w.nudgeOf(k));
ok(allSc.every(v => Math.abs(v - 0.8) < 1e-9),
   'semua rangka jadi 80% (' + allSc.map(v => Math.round(v * 100)).join(',') + ')');
ok(allNz.every(v => v === -5),
   'semua rangka jadi geser -5 (' + allNz.join(',') + ')');
ok(w.slotSettingsDiffer(idleSlot) === false, 'sesudah disamakan, tidak beda lagi');
ok(d.querySelector('#pwr-swap-pick [data-same-slot]') === null,
   'tombol hilang sendiri sesudah seragam');

/* nilai BAWAAN dihapus, bukan ditulis 1/0 — supaya "Salin nilai" bersih */
idleKeys0.forEach(k => { delete w.SCALE[k]; delete w.NUDGE[k]; });
w.SCALE[idleKeys0[1]] = 1.4;
w._swapFrame = 0;                       /* rangka 1 = bawaan (100%, 0) */
w.buildSwapPicker();
fire(d.querySelector('#pwr-swap-pick [data-same-slot]'));
const leftovers = idleKeys0.filter(k => (k in w.SCALE) || (k in w.NUDGE));
ok(leftovers.length === 0,
   'menyamakan ke nilai bawaan MENGHAPUS entri, bukan menulis 1/0' +
   (leftovers.length ? ' -> sisa: ' + leftovers.join(', ') : ''));
idleKeys0.forEach(k => { delete w.SCALE[k]; delete w.NUDGE[k]; });

/* ---- 10e. tombol "Pakai seluruh kelompok" ---- */
pick('t_coin0');
const useBtns = d.querySelectorAll('#pwr-swap-pick [data-anim-grp]');
ok(useBtns.length > 0, 'ada tombol "Pakai seluruh kelompok" (' + useBtns.length + ')');
const target = [...useBtns].find(b => /Saw\/On/.test(b.getAttribute('data-anim-grp')))
            || useBtns[0];
const tgrp = target.getAttribute('data-anim-grp');
fire(target);
ok(w.SWAP_ANIM.coin && w.SWAP_ANIM.coin.every(f => f.grp === tgrp),
   'klik tombol mengganti seluruh slot -> ' + tgrp);
ok(w.SWAP_ANIM.coin.map(f => f.f).join(',') ===
   [...Array(w.SWAP_ANIM.coin.length).keys()].join(','),
   'rangka diambil BERURUTAN dari awal kelompok (' +
   w.SWAP_ANIM.coin.map(f => f.f).join(',') + ')');
/* dan deretnya langsung mencerminkan itu */
ok(d.querySelectorAll('#pwr-swap-pick .pwr-swap-frame:not(.is-add)').length ===
   w.SWAP_ANIM.coin.length, 'deret rangka ikut memperlihatkan hasilnya');

/* tombol kembalikan objek ini */
const undo = d.querySelector('#pwr-swap-pick [data-anim-reset]');
ok(!!undo, 'ada tombol "Kembalikan objek ini ke bawaan"');
fire(undo);
ok(!w.SWAP_ANIM.coin, 'klik -> slot kembali ke bawaan');
ok(JSON.stringify(w.slotFrames(coinSlot)) ===
   JSON.stringify(w.slotDefaultFrames(coinSlot)),
   'setelah dikembalikan, susunannya = bawaan lagi');

/* ---- 11. tersimpan & ikut "Salin nilai" ---- */
w.SWAP_ANIM.coin = [0,1,2,3].map(f => ({ grp: 'Traps/Saw/On', f }));
w.saveSwapAnim();
const st = JSON.parse(w.localStorage.getItem('pwr_swapanim_v1') || '{}');
ok(st.coin && st.coin.length === 4 && st.coin[0].grp === 'Traps/Saw/On',
   'tersimpan ke localStorage sebagai daftar rangka');
const snap = w.tunerSnapshot();
ok(/var SWAP_ANIM_DEF = \{[\s\S]*coin[\s\S]*Saw\/On/.test(snap),
   'salinan memuat SWAP_ANIM_DEF');
let ev = null;
try { ev = new Function(snap + '; return SWAP_ANIM_DEF;')(); } catch (e) {}
ok(ev && ev.coin && ev.coin.length === 4 && ev.coin[3].f === 3,
   'SWAP_ANIM_DEF hasil salinan sah & memuat tiap rangka');
/* slot yang TIDAK diubah tidak ikut ditulis — kalau ikut, susunan bawaan
   membeku ke dalam kode dan perbaikan bawaan tidak pernah terpakai. */
ok(ev && !ev.player_idle,
   'slot yang masih bawaan tidak ikut ditulis ke SWAP_ANIM_DEF');

/* ---- 12. reset mengosongkan ---- */
fire(d.getElementById('pwr-swap-reset'));
ok(JSON.stringify(w.SWAP_ANIM) === JSON.stringify(w.SWAP_ANIM_DEF),
   'Kembalikan bawaan -> SWAP_ANIM == SWAP_ANIM_DEF');

/* ---- 13. dekorasi didaftarkan utk tiap stage ---- */
ok(/if \(!m\.stages\) continue;/.test(js),
   'ada jalur khusus mendaftarkan tekstur per-stage');
const decor = AM.filter(m => m.stages);
ok(decor.length >= 5, decor.length + ' objek dekorasi memakai stages:true');

/* ---- 14. TIAP slot yang bisa bergerak HARUS benar-benar dimainkan ----
   BUG NYATA yang ditangkap tes ini: animasi terdaftar dengan benar, tapi
   tidak ada yang memanggil play() pada objeknya — sehingga "ganti 1 jadi
   >1 rangka" tidak berefek apa-apa dan gambar tetap statis. */
const playedIds = new Set([...js.matchAll(/playSlot\([^,]+,\s*'(\w+)'/g)].map(m => m[1]));
const dynPw  = /playSlot\(pu, 'pw_' \+ kind\)/.test(js);
const dynFoe = /if \(foeSlot\) playSlot/.test(js);
const singlePose = new Set(['player_jump', 'player_fall', 'player_hurt']);
const notPlayed = w.ANIM_SLOTS.filter(s => {
  if ((s.max || 8) < 2 || s.twoState) return false;  /* memang tak bisa gerak */
  if (singlePose.has(s.id)) return false;            /* pose tunggal */
  if (playedIds.has(s.id)) return false;
  if (dynPw && /^pw_/.test(s.id)) return false;      /* playSlot(pu,'pw_'+kind) */
  if (dynFoe && /^foe\d$/.test(s.id)) return false;  /* lewat peta foeSlot */
  return true;
});
ok(notPlayed.length === 0,
   'tiap slot yang bisa bergerak dimainkan lewat playSlot()' +
   (notPlayed.length ? ' -> TIDAK: ' + notPlayed.map(s => s.id).join(', ') : ''));

ok(/this\.bride = this\.add\.sprite\(/.test(js),
   'pengantin wanita dibuat dgn add.sprite (Image tidak bisa dianimasikan)');

/* slot dua-wujud: rangkanya adalah STATE, bukan siklus animasi */
['foe2', 'foe5', 'boss'].forEach(id => {
  const s = w.slotById(id);
  ok(s && s.twoState === true, 'slot ' + id + ' ditandai twoState');
  ok(w.slotAnimName(id) === null, 'slot ' + id + ' tidak pernah dianimasikan');
});

ok(!/sprite\.setTexture\(sl\.keys\[0\]\)/.test(js),
   'playSlot tidak memasang ulang keys[0] (wujud rusak E5 tidak ter-reset)');

/* awan & pohon: pack TIDAK punya art-nya, jadi sengaja tidak dipetakan */
ok(!AM.some(m => /^t_cloud|^t_ltree/.test(m.key)),
   'awan & pohon TIDAK dipetakan (Background/* cuma ubin pola polos)');
ok(!JSON.stringify(w.PICK_FILTER).includes('Background'),
   'Background/* tidak ditawarkan sebagai kandidat');

/* dekorasi digambar dgn add.image -> max 1, jangan janjikan animasi */
['bush', 'rock', 'flower', 'tuft', 'fence'].forEach(id => {
  const s = w.slotById(id);
  ok(s && s.max === 1, 'dekorasi ' + id + ' dibatasi 1 rangka (add.image tak bisa animasi)');
});

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
