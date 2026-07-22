/* Uji SLIDER UKURAN: memperkecil/memperbesar sprite harus ikut mengubah
   KOTAK TUMBUKAN, bukan cuma gambarnya.

   Keluhan yang diuji: "jgn karakternya doang kecil tp block nya tetep
   pakai space yang dipakai tetap pakai space besar". */
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
const sizes = [];
w.HTMLCanvasElement.prototype.getContext = function () { return {
  imageSmoothingEnabled: true,
  drawImage: (...a) => calls.push(a),
  getImageData: (x, y, ww, hh) => ({ data: new Uint8ClampedArray(ww * hh * 4) }),
  fillRect(){}, clearRect(){}, fillText(){}, save(){}, restore(){}, translate(){},
  scale(){}, beginPath(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){},
  lineTo(){}, arc(){}, rect(){} }; };
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

const added = {};
const scene = { textures: {
  exists: k => !!added[k], addCanvas: (k, cv) => { added[k] = cv; },
  remove: k => { delete added[k]; } } };
const AM = w.ASSET_MAP;
const ent = k => AM.find(m => m.key === k);

/* ---- 1. skala mengubah UKURAN KANVAS tekstur ---- */
const pl = ent('t_groom_idle0');
delete added[pl.key];
/* PENTING: skala MENGGANTI, bukan menumpuk.
   Dulu tes ini mengambil sizeOf() lebih dulu sebagai "base" lalu
   mengharapkan 0.5 x base. Itu benar hanya SELAMA pemain tidak punya
   skala ter-bake. Sekarang t_groom_* di-bake 0,9x, jadi sizeOf() awal
   sudah 43x61 sementara SCALE[key]=0.5 menghasilkan 0,5 x UKURAN ASLI
   (48x68), bukan 0,5 x 43x61. Acuan yang benar adalah ukuran mentah di
   ASSET_MAP. */
const raw = { w: pl.w, h: pl.h };
w.SCALE[pl.key] = 0.5;
const half = w.sizeOf(pl);
ok(half.w === Math.round(raw.w * 0.5) && half.h === Math.round(raw.h * 0.5),
   'skala 50% -> ukuran asli ' + raw.w + 'x' + raw.h + ' jadi ' + half.w + 'x' + half.h);

w.SCALE[pl.key] = 2;
const dbl = w.sizeOf(pl);
ok(dbl.w === raw.w * 2 && dbl.h === raw.h * 2,
   'skala 200% -> tekstur jadi ' + dbl.w + 'x' + dbl.h);
delete w.SCALE[pl.key];

/* ---- 2. HITBOX PEMAIN ikut ukuran tekstur ---- */
function fakePlayer(tw, th) {
  const p = { width: tw, height: th, body: {
    _w:0,_h:0,_ox:0,_oy:0,
    setSize(a,b){this._w=a;this._h=b;return this;},
    setOffset(a,b){this._ox=a;this._oy=b;return this;} } };
  return p;
}
const pFull = fakePlayer(48, 68);  w.setPlayerBody(pFull, 'dasar');
const pHalf = fakePlayer(24, 34);  w.setPlayerBody(pHalf, 'dasar');
ok(pFull.body._w === 30 && pFull.body._h === 54,
   'pemain ukuran penuh -> body 30x54 (nilai lama dipertahankan) dapat ' +
   pFull.body._w + 'x' + pFull.body._h);
ok(pHalf.body._w === 15 && pHalf.body._h === 27,
   'pemain setengah -> body IKUT mengecil jadi ' +
   pHalf.body._w + 'x' + pHalf.body._h + ' (bukan tetap 30x54)');
ok(pHalf.body._oy === pHalf.height - pHalf.body._h,
   'kaki body menempel dasar tekstur (offset y=' + pHalf.body._oy + ')');

/* ---- 3. HITBOX MUSUH ikut ukuran tekstur ---- */
const eFull = w.enemyBodySize('E1', 40, 40);
const eHalf = w.enemyBodySize('E1', 20, 20);
ok(eFull[0] === 31 && eFull[1] === 34,
   'musuh E1 penuh -> body 31x34 (dapat ' + eFull.join('x') + ')');
ok(eHalf[0] === Math.round(31 / 2) && eHalf[1] === 17,
   'musuh E1 setengah -> body IKUT mengecil ' + eHalf.join('x'));

/* bos besar dikecilkan: cek E5 (paling besar) */
const bFull = w.enemyBodySize('E5', 40, 60);
const bSmall = w.enemyBodySize('E5', 16, 24);
ok(bSmall[0] < bFull[0] && bSmall[1] < bFull[1],
   'bos dikecilkan -> ruang tumbukan ikut kecil (' +
   bFull.join('x') + ' -> ' + bSmall.join('x') + ')');
/* rasio dipertahankan, bukan angka mati */
ok(Math.abs((bSmall[1] / 24) - (bFull[1] / 60)) < 0.05,
   'rasio body/tekstur bos tetap sama saat diperkecil');

/* ---- 4. objek grid TIDAK boleh diskala ---- */
const terkunci = ['t_brick', 't_plat', 't_pipe64', 't_pipe96', 't_pipe128',
                  't_gr_s0', 't_q0', 't_q_dead'];
terkunci.forEach(k => { w.SCALE[k] = 2; });
const bocor = terkunci.filter(k => w.scaleOf(k) !== 1);
ok(bocor.length === 0,
   'objek grid tetap 1x walau SCALE diisi (' + (bocor.join(',') || 'semua terkunci') + ')');

/* dan ukurannya benar-benar tidak berubah */
const br = ent('t_brick');
const brSz = w.sizeOf(br);
ok(brSz.w === br.w && brSz.h === br.h,
   'bata tetap ' + br.w + 'x' + br.h + ' (grid 32px aman)');
terkunci.forEach(k => { delete w.SCALE[k]; });

/* ---- 5. tiang tetap 64/96/128 (hitbox refreshBody) ---- */
const pipes = ['t_pipe64', 't_pipe96', 't_pipe128'].map(k => w.sizeOf(ent(k)).h);
ok(pipes.join(',') === '64,96,128',
   'tinggi tiang tetap 64/96/128 (dapat ' + pipes.join(',') + ')');

/* ---- 6. skala benar-benar sampai ke kanvas tekstur ---- */
const foe = ent('t_e1_0');
delete added[foe.key]; calls = [];
w.assetToTexture(scene, foe);
const dFull = calls[0].slice(5);          /* dx,dy,dw,dh */
w.SCALE[foe.key] = 0.5;
delete added[foe.key]; calls = [];
w.assetToTexture(scene, foe);
const dHalf = calls[0].slice(5);
ok(dHalf[2] < dFull[2] && dHalf[3] < dFull[3],
   'gambar musuh ikut mengecil di kanvas (' +
   dFull[2] + 'x' + dFull[3] + ' -> ' + dHalf[2] + 'x' + dHalf[3] + ')');
/* masih rata bawah & seragam sesudah diskala */
ok(dHalf[1] + dHalf[3] === w.sizeOf(foe).h, 'sprite terskala tetap rata bawah');
ok(Math.abs((dHalf[2] / calls[0][3]) - (dHalf[3] / calls[0][4])) < 0.001,
   'sprite terskala tetap skala seragam (tidak gepeng)');
delete w.SCALE[foe.key];

/* ---- 7. batas slider dijepit ---- */
w.SCALE['t_e1_0'] = 99;
ok(w.scaleOf('t_e1_0') === w.SCALE_MAX || w.scaleOf('t_e1_0') <= 2.5,
   'skala berlebih dijepit ke maksimum (' + w.scaleOf('t_e1_0') + ')');
w.SCALE['t_e1_0'] = 0.001;
ok(w.scaleOf('t_e1_0') >= 0.4, 'skala terlalu kecil dijepit ke minimum (' +
   w.scaleOf('t_e1_0') + ')');
w.SCALE['t_e1_0'] = NaN;
ok(w.scaleOf('t_e1_0') === 1, 'nilai rusak (NaN) jatuh ke 1x');
delete w.SCALE['t_e1_0'];

/* ---- 8. tekstur tidak pernah 0 px ---- */
const tiny = ent('t_spark');
w.SCALE[tiny.key] = 0.4;
const ts = w.sizeOf(tiny);
ok(ts.w >= 4 && ts.h >= 4, 'sprite terkecil tetap >= 4px (' + ts.w + 'x' + ts.h + ')');
delete w.SCALE[tiny.key];

/* ---- 9. UI: slider muncul utk yg boleh, terkunci utk grid ---- */
const d = w.document;
const fire = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
fire(d.getElementById('pwr-tune-swap'));
function pickRow(key) {
  const r = d.querySelector('#pwr-swap-list [data-swap-key="' + key + '"]');
  fire(r); return r;
}
pickRow('t_groom_idle0');
ok(!!d.querySelector('#pwr-swap-pick input[type=range]'),
   'slider ukuran muncul untuk pemain');
pickRow('t_brick');
ok(!d.querySelector('#pwr-swap-pick input[type=range]') &&
   !!d.querySelector('#pwr-swap-pick .pwr-swap-size.is-locked'),
   'bata: slider diganti keterangan "terkunci"');

/* ---- 10. menggeser slider tersimpan & terbaca ---- */
pickRow('t_e1_0');
const inp = d.querySelector('#pwr-swap-pick input[type=range]');
inp.value = '60';
inp.dispatchEvent(new w.Event('input', { bubbles: true }));
ok(Math.abs(w.scaleOf('t_e1_0') - 0.6) < 1e-9,
   'geser slider ke 60% -> scaleOf = ' + w.scaleOf('t_e1_0'));
const st = JSON.parse(w.localStorage.getItem('pwr_scale_v1') || '{}');
ok(Math.abs(st['t_e1_0'] - 0.6) < 1e-9, 'ukuran tersimpan ke localStorage');

/* kembali ke 100% menghapus entri (tidak menumpuk sampah) */
inp.value = '100';
inp.dispatchEvent(new w.Event('input', { bubbles: true }));
ok(!('t_e1_0' in w.SCALE), 'kembali ke 100% menghapus entri SCALE');

/* ---- 11. reset mengembalikan ukuran ke BAWAAN (bukan sekadar kosong:
   sebagian key punya skala ter-bake di SCALE_DEF, mis. t_goal 2.2) ---- */
w.SCALE['t_e1_0'] = 0.8; w.saveScale();
fire(d.getElementById('pwr-swap-reset'));
ok(JSON.stringify(w.SCALE) === JSON.stringify(w.SCALE_DEF),
   'Kembalikan bawaan -> SCALE == SCALE_DEF');
ok(!('t_e1_0' in w.SCALE), 'perubahan sementara terhapus setelah reset');

/* ---- 11b. MENAMBAH RANGKA MEN-SEED UKURANNYA DARI RANGKA SEBELUMNYA ----
   Ini mekanisme anti-kedip yang menggantikan pewarisan: rangka baru
   lahir dengan ukuran/geser rangka sebelumnya, jadi objek TIDAK berkedip
   saat rangka baru muncul — tapi setelah itu boleh diubah sendiri. */
w.loadScale(); w.loadNudge();
var shotSlot = w.slotById('shot');
var beforeKeys = w.slotActiveKeys(shotSlot);
/* Seed diambil dari rangka TERAKHIR (rangka tepat sebelum yang baru),
   jadi setel skala di key terakhir itu. */
var lastKey = beforeKeys[beforeKeys.length - 1];
w.SCALE[lastKey] = 1.4; w.saveScale();
/* handler tambah-rangka dijalankan lewat klik nyata */
w.openSwap();
(function () {
  var r = d.querySelector('#pwr-swap-list [data-swap-key="t_shot"]');
  if (r) fire(r);
})();
var addBtn = d.querySelector('#pwr-swap-pick [data-frame-add]');
ok(!!addBtn, 'tombol tambah-rangka ada untuk slot shot');
if (addBtn) {
  fire(addBtn);
  var afterKeys = w.slotActiveKeys(shotSlot);
  var newKey = afterKeys[afterKeys.length - 1];
  ok(afterKeys.length === beforeKeys.length + 1,
     'rangka bertambah satu (' + afterKeys.length + ')');
  ok(Math.abs(w.scaleOf(newKey) - 1.4) < 1e-9,
     'rangka baru di-SEED dari rangka sebelumnya (1,4) -> tidak berkedip');
  /* dan sesudahnya bebas diubah tanpa menyeret yang lain */
  w.SCALE[newKey] = 0.7;
  ok(Math.abs(w.scaleOf(newKey) - 0.7) < 1e-9 &&
     Math.abs(w.scaleOf(lastKey) - 1.4) < 1e-9,
     'ubah rangka baru tidak mengubah rangka sumbernya');
}
delete w.SWAP_ANIM['shot'];
w.slotActiveKeys(shotSlot).forEach(function (k) { delete w.SCALE[k]; });
w.saveScale(); w.saveSwapAnim();

/* ---- 12. TIAP RANGKA BEBAS UKURANNYA SENDIRI, TAPI TIDAK BERKEDIP DI
           KEADAAN BAWAAN ----
   Keputusan user: tiap rangka boleh punya ukuran & posisi berbeda
   (rangka 1 = 0,5, rangka 2 = 1,5). Jadi settingKey() TIDAK lagi
   mewariskan rangka tambahan dari rangka pertama.

   Kedip dicegah bukan dengan mengunci, melainkan dengan (a) rangka yang
   di-bake punya entri SCALE_DEF sendiri, dan (b) rangka yang DITAMBAH
   user di-seed dari rangka sebelumnya saat lahir. Karena itu, di keadaan
   BAWAAN (baru loadScale, belum ada yang ditambah manual) semua rangka
   tetap seragam — itu yang diuji di sini. */
w.loadScale(); w.loadNudge();          /* buang sisa utak-atik uji di atas */
var _blink = 0;
w.ANIM_SLOTS.forEach(function (sl) {
  var keys = w.slotActiveKeys(sl);
  if (keys.length < 2) return;
  var scs = keys.map(function (k) { return w.scaleOf(k); });
  var nzs = keys.map(function (k) { return w.nudgeOf(k); });
  var sameS = scs.every(function (v) { return v === scs[0]; });
  var sameN = nzs.every(function (v) { return v === nzs[0]; });
  if (!sameS || !sameN) {
    _blink++;
    console.log('  GAGAL  ' + sl.id + ' berkedip: skala ' + scs.join('/') +
                ', geser ' + nzs.join('/'));
  }
});
ok(_blink === 0,
   'DI KEADAAN BAWAAN, tiap slot seragam di semua rangka (tidak berkedip)');

/* Rangka tambahan TIDAK lagi mewarisi — key-nya berdiri sendiri. */
ok(w.settingKey('shot__a3') === 'shot__a3',
   'rangka tambahan memakai KEY-NYA SENDIRI, bukan diwariskan ke t_shot');
/* Dan karena berdiri sendiri, ukurannya bisa diatur beda dari rangka 1. */
w.SCALE['shot__a3'] = 1.8;
ok(Math.abs(w.scaleOf('shot__a3') - 1.8) < 1e-9,
   'rangka tambahan boleh punya skala sendiri (1,8)');
ok(w.scaleOf('t_shot') !== 1.8,
   'menyetel rangka tambahan TIDAK menyeret rangka 1');
delete w.SCALE['shot__a3'];

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
