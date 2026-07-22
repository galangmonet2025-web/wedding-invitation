/* Uji slider NAIK/TURUN + bendera berkibar + pemain Mask Dude. */
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

let calls = [], canvases = [];
w.HTMLCanvasElement.prototype.getContext = function () {
  const cv = this;
  return {
    imageSmoothingEnabled: true,
    drawImage: (...a) => calls.push({ a, cw: cv.width, ch: cv.height }),
    getImageData: (x, y, a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }),
    fillRect(){}, clearRect(){}, fillText(){}, save(){}, restore(){},
    translate(x, y) { calls.push({ translate: [x, y] }); },
    scale(){}, beginPath(){}, closePath(){}, fill(){}, stroke(){},
    moveTo(){}, lineTo(){}, arc(){}, rect(){}
  };
};
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
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

/* ---- 1. pemain memakai Mask Dude ---- */
const players = AM.filter(m => /^t_groom_/.test(m.key));
ok(players.length === 9 && players.every(m => /Mask Dude/.test(m.grp)),
   'semua 9 rangka pemain memakai Mask Dude');

/* ---- 2. bendera akhir punya 4 rangka & animasinya terdaftar ---- */
const goals = AM.filter(m => /^t_goal\d?$/.test(m.key));
ok(goals.length === 4, 'garis akhir punya 4 rangka (dapat ' + goals.length + ')');
ok(goals.every(m => /Flag Idle/.test(m.grp)),
   'keempatnya dari "Checkpoint (Flag Idle)" yang memang beranimasi');
const fset = goals.map(m => m.f).join(',');
ok(new Set(goals.map(m => m.f)).size === 4,
   'keempat rangka BERBEDA (f=' + fset + ') — bukan gambar sama diulang');
ok(goals.every(m => m.w === goals[0].w && m.h === goals[0].h),
   'keempat rangka seukuran (hitbox stabil saat berkibar)');
/* Animasi kini didaftarkan lewat ANIM_SLOTS (nama diambil dari slot),
   bukan baris makeAnim mati — supaya jumlah rangkanya ikut berubah saat
   user mengganti kelompok sumbernya. */
const goalSlot = w.ANIM_SLOTS.find(s => s.id === 'goal');
ok(!!goalSlot && goalSlot.anim === 'goal_wave',
   "slot 'goal' memakai nama animasi 'goal_wave'");
ok(goalSlot && goalSlot.keys.length === 4,
   'slot goal punya 4 rangka bawaan (dapat ' + (goalSlot ? goalSlot.keys.length : 0) + ')');
ok(w.slotAnimName('goal') === 'goal_wave',
   "slotAnimName('goal') mengembalikan 'goal_wave' (>1 rangka = bergerak)");
ok(/playSlot\(this\.goal, 'goal'\)/.test(js), "goal dimainkan lewat playSlot()");
ok(/'coin_spin','q_blink','piece_float','goal_wave'/.test(js),
   "'goal_wave' ikut dibuang saat purge (tidak menumpuk saat restart)");
ok(/makeArtTexture\(scene, 't_goal1'/.test(js),
   'ada cadangan prosedural untuk rangka kibar (sheet belum diunggah)');

/* ---- 3. nudge mengubah TINGGI KANVAS (=> hitbox) ---- */
const foe = ent('t_e1_0');
const base = w.sizeOf(foe);
w.NUDGE[foe.key] = -10;                       /* naik 10px */
const up = w.sizeOf(foe);
ok(up.h === base.h + 10, 'naik 10px -> kanvas lebih tinggi 10 (' +
   base.h + ' -> ' + up.h + ')');
w.NUDGE[foe.key] = 10;                        /* turun 10px */
const down = w.sizeOf(foe);
ok(down.h === base.h + 10, 'turun 10px -> kanvas juga +10 (ruang tidak terpotong)');
ok(up.w === base.w && down.w === base.w, 'lebar tidak ikut berubah');

/* ---- 4. arah gambar benar: naik = digambar di atas, turun = di bawah ---- */
function drawOffsetFor(key, n) {
  const m = ent(key);
  if (n === 0) delete w.NUDGE[key]; else w.NUDGE[key] = n;
  delete added[key]; calls = [];
  w.assetToTexture(scene, m);
  const tr = calls.find(c => c.translate);
  return tr ? tr.translate[1] : 0;
}
ok(drawOffsetFor('t_e1_0', -10) === 0,
   'NAIK: sprite digambar di bagian atas kanvas (offset 0)');
ok(drawOffsetFor('t_e1_0', 10) === 10,
   'TURUN: sprite digambar 10px dari atas (ruang kosong di atasnya)');
ok(drawOffsetFor('t_e1_0', 0) === 0, 'tanpa geser: offset 0');
delete w.NUDGE['t_e1_0'];

/* ---- 5. objek grid TIDAK boleh digeser ---- */
['t_brick', 't_plat', 't_pipe64', 't_gr_s0', 't_q0'].forEach(k => { w.NUDGE[k] = 12; });
const bocor = ['t_brick','t_plat','t_pipe64','t_gr_s0','t_q0'].filter(k => w.nudgeOf(k) !== 0);
ok(bocor.length === 0, 'objek grid tetap 0 walau NUDGE diisi (' +
   (bocor.join(',') || 'semua terkunci') + ')');
const brSz = w.sizeOf(ent('t_brick'));
ok(brSz.h === ent('t_brick').h, 'tinggi bata tidak berubah (grid aman)');
['t_brick','t_plat','t_pipe64','t_gr_s0','t_q0'].forEach(k => { delete w.NUDGE[k]; });

/* ---- 6. batas dijepit & nilai rusak aman ---- */
w.NUDGE['t_e1_0'] = 999;
ok(w.nudgeOf('t_e1_0') === w.NUDGE_MAX, 'geser berlebih dijepit ke ' + w.NUDGE_MAX);
w.NUDGE['t_e1_0'] = -999;
ok(w.nudgeOf('t_e1_0') === w.NUDGE_MIN, 'geser berlebih (-) dijepit ke ' + w.NUDGE_MIN);
w.NUDGE['t_e1_0'] = NaN;
ok(w.nudgeOf('t_e1_0') === 0, 'nilai rusak (NaN) jatuh ke 0');
w.NUDGE['t_e1_0'] = 3.7;
ok(w.nudgeOf('t_e1_0') === 4, 'nilai pecahan dibulatkan (' + w.nudgeOf('t_e1_0') + ')');
delete w.NUDGE['t_e1_0'];

/* ---- 7. skala + geser dipakai BERSAMAAN ---- */
const pl = ent('t_groom_idle0');
w.SCALE[pl.key] = 0.5; w.NUDGE[pl.key] = -8;
const both = w.sizeOf(pl);
ok(both.w === Math.round(pl.w * 0.5), 'gabungan: lebar ikut skala (' + both.w + ')');
ok(both.h === Math.round(pl.h * 0.5) + 8,
   'gabungan: tinggi = skala + ruang geser (' + both.h + ')');
delete w.SCALE[pl.key]; delete w.NUDGE[pl.key];

/* ---- 8. UI: slider naik/turun ada, dan terkunci utk grid ---- */
const d = w.document;
const fire = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
fire(d.getElementById('pwr-tune-swap'));
const pick = key => fire(d.querySelector('#pwr-swap-list [data-swap-key="' + key + '"]'));

pick('t_groom_idle0');
let ranges = d.querySelectorAll('#pwr-swap-pick input[type=range]');
ok(ranges.length === 2, 'ada DUA slider (ukuran + naik/turun), dapat ' + ranges.length);
ok(/Naik \/ turun/.test(d.getElementById('pwr-swap-pick').textContent),
   'slider kedua berlabel "Naik / turun"');

pick('t_brick');
ok(d.querySelectorAll('#pwr-swap-pick input[type=range]').length === 0,
   'bata: kedua slider disembunyikan (grid terkunci)');

/* ---- 9. menggeser slider tersimpan ---- */
pick('t_e1_0');
ranges = d.querySelectorAll('#pwr-swap-pick input[type=range]');
const nz = ranges[1];
nz.value = '-6';
nz.dispatchEvent(new w.Event('input', { bubbles: true }));
ok(w.nudgeOf('t_e1_0') === -6, 'geser slider -> nudgeOf = ' + w.nudgeOf('t_e1_0'));
const st = JSON.parse(w.localStorage.getItem('pwr_nudge_v1') || '{}');
ok(st['t_e1_0'] === -6, 'tersimpan ke localStorage');
nz.value = '0';
nz.dispatchEvent(new w.Event('input', { bubbles: true }));
ok(!('t_e1_0' in w.NUDGE), 'kembali ke 0 menghapus entri NUDGE');

/* ---- 10. "Salin nilai" ikut membawa NUDGE_DEF ---- */
w.NUDGE.t_e1_0 = -6;
const snap = w.tunerSnapshot();
ok(/var NUDGE_DEF = \{[\s\S]*t_e1_0.*-6/.test(snap), 'salinan memuat NUDGE_DEF');
let ev = null;
try { ev = new Function(snap + '; return NUDGE_DEF;')(); } catch (e) {}
ok(ev && ev.t_e1_0 === -6, 'NUDGE_DEF hasil salinan bisa dieksekusi & nilainya benar');
delete w.NUDGE.t_e1_0;
/* Blok NUDGE_DEF selalu ada — entah berisi entri (ada geseran ter-bake,
   mis. t_goal -9) atau catatan "tidak ada". */
ok(/var NUDGE_DEF = \{|NUDGE_DEF: tidak ada posisi/.test(w.tunerSnapshot()),
   'salinan selalu memuat blok NUDGE_DEF');

/* ---- 11. reset mengosongkan geseran juga ---- */
w.NUDGE.t_e1_0 = 5; w.saveNudge();
fire(d.getElementById('pwr-swap-reset'));
ok(JSON.stringify(w.NUDGE) === JSON.stringify(w.NUDGE_DEF),
   'Kembalikan bawaan -> NUDGE == NUDGE_DEF');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
