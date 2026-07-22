/* Uji TERAPKAN LANGSUNG: mengganti sprite harus terlihat tanpa mengulang
   stage, dan HANYA mengulang stage kalau ukuran/jumlah rangka berubah. */
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

/* Kanvas tiruan yang MENCATAT gambar apa yang ditulis ke tiap tekstur. */
const drawLog = {};
let curKey = null;
function fakeCanvas(width, height) {
  const cv = {
    width, height,
    getContext: () => ({
      imageSmoothingEnabled: true,
      clearRect: () => { if (curKey) drawLog[curKey] = []; },
      drawImage: (...a) => { if (curKey) (drawLog[curKey] = drawLog[curKey] || []).push(a); },
      save(){}, restore(){}, translate(){}, scale(){}, fillRect(){}, fillText(){},
      beginPath(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){},
      arc(){}, rect(){},
      getImageData: (x, y, a, b) => ({ data: new Uint8ClampedArray(a * b * 4) })
    })
  };
  return cv;
}
w.HTMLCanvasElement.prototype.getContext = function () {
  const cv = this;
  return {
    imageSmoothingEnabled: true,
    drawImage: (...a) => { if (curKey) (drawLog[curKey] = drawLog[curKey] || []).push(a); },
    clearRect: () => { if (curKey) drawLog[curKey] = []; },
    getImageData: (x, y, a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }),
    fillRect(){}, fillText(){}, save(){}, restore(){}, translate(){}, scale(){},
    beginPath(){}, closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){},
    arc(){}, rect(){}
  };
};
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

/* ---- scene tiruan dgn tekstur ber-kanvas nyata ---- */
const textures = {};
let refreshed = [];
function makeTex(key, ww, hh) {
  const cv = fakeCanvas(ww, hh);
  textures[key] = {
    source: [{ width: ww, height: hh, image: cv, update(){ refreshed.push(key); } }],
    refresh() { refreshed.push(key); }
  };
}
const anims = {};
const scene = {
  sys: { isActive: () => true },
  textures: {
    exists: k => !!textures[k],
    get: k => textures[k],
    addCanvas: (k, cv) => { makeTex(k, cv.width || 32, cv.height || 32); },
    remove: k => { delete textures[k]; },
    getTextureKeys: () => Object.keys(textures)
  },
  anims: { exists: k => !!anims[k], get: k => anims[k],
           create: c => (anims[c.key] = c), remove: k => { delete anims[k]; } },
  physics: { world: { gravity: { y: 0 } } }
};
w.GAME = { scene: { getScene: k => (k === 'GameScene' ? scene : null) } };

/* buat tekstur seukuran yang engine harapkan */
w.ASSET_MAP.forEach(m => { const s = w.sizeOf(m); makeTex(m.key, s.w, s.h); });
/* Rangka TAMBAHAN ("__aN") juga perlu ada. Sejak koin di-bake 8 rangka
   (ASSET_MAP cuma punya 4), tanpa ini teksturnya hilang dan
   liveApplySprites() benar memutuskan "tidak bisa live" — uji berikutnya
   lalu gagal karena panggung tiruannya kurang lengkap, bukan karena
   fiturnya rusak. */
w.ANIM_SLOTS.forEach(sl => {
  const ks = w.slotActiveKeys(sl);
  for (let j = sl.keys.length; j < ks.length; j++) {
    const ex = w.extraEntryFor(sl, ks[j], j);
    if (ex) { const s = w.sizeOf(ex); makeTex(ks[j], s.w, s.h); }
  }
});
w.ANIM_SLOTS.forEach(sl => {
  const nm = w.slotAnimName(sl.id);
  if (nm) anims[nm] = { key: nm, frames: w.slotActiveKeys(sl).map(k => ({ key: k })) };
});

/* ---- 1. currentScene() memakai key yang BENAR ---- */
ok(w.currentScene() === scene, "currentScene() menemukan scene 'GameScene'");
ok(/getScene\('GameScene'\)/.test(js) && !/getScene\('game'\)/.test(js),
   "tidak ada lagi lookup ke key 'game' yang salah");

/* applyLivePhysics benar-benar mengubah gravitasi (dulu diam-diam null) */
w.PHYS.GRAVITY_Y = 1234;
w.applyLivePhysics();
ok(scene.physics.world.gravity.y === 1234,
   'applyLivePhysics() benar-benar mengubah gravitasi (dapat ' +
   scene.physics.world.gravity.y + ')');

/* ---- 2. ganti gambar saja -> LIVE, tanpa ulang stage ----
   Dipakai key TANPA penggantian tingkat-slot ter-bake. Koin sekarang
   punya SWAP_ANIM_DEF, dan penggantian slot memang MENANG atas SWAP
   per-key — memakai t_coin0 di sini akan menguji hal yang salah dan
   gagal karena alasan yang keliru. */
const PLAIN = 't_e1_0';
refreshed = [];
w.SWAP[PLAIN] = { grp: 'Items/Fruits/Kiwi', f: 0 };
const live = w.liveApplySprites();
ok(live === true, 'ganti gambar (ukuran sama) -> diterapkan LANGSUNG');
ok(refreshed.length > 0, 'tekstur di-refresh supaya GPU pakai piksel baru (' +
   refreshed.length + ')');
ok(refreshed.includes(PLAIN), PLAIN + ' termasuk yang di-refresh');

/* isi yang digambar = koordinat kelompok baru */
const json = JSON.parse(fs.readFileSync('assets/sprite-map.json', 'utf8'));
const kiwi = json.groups['Items/Fruits/Kiwi'].frames[0];
curKey = PLAIN;
drawLog[curKey] = [];
w.redrawTexture(scene, w.ASSET_MAP.find(m => m.key === PLAIN), PLAIN);
const d0 = (drawLog[PLAIN] || [])[0];
ok(d0 && d0[1] === kiwi.x && d0[2] === kiwi.y,
   'kanvas ditimpa dgn potongan kelompok BARU (' +
   (d0 ? d0[1] + ',' + d0[2] : 'tidak menggambar') + ' vs ' + kiwi.x + ',' + kiwi.y + ')');
curKey = null;
delete w.SWAP[PLAIN];

/* penggantian tingkat SLOT menang atas per-key — sifat yang membuat
   t_coin0 di atas tidak cocok dipakai; diuji langsung supaya jelas. */
w.SWAP.t_coin0 = { grp: 'Items/Fruits/Kiwi', f: 0 };
ok(w.effectiveSrc(w.ASSET_MAP.find(m => m.key === 't_coin0')).grp ===
   w.SWAP_ANIM_DEF.coin[0].grp,
   'SWAP_ANIM ter-bake menang atas SWAP per-key untuk t_coin0');
delete w.SWAP.t_coin0;

/* ---- 3. ubah UKURAN -> harus ulang stage (hitbox statis terlanjur) ---- */
w.SCALE[PLAIN] = 0.5;
ok(w.liveApplySprites() === false,
   'ubah ukuran -> TIDAK live (butuh ulang stage, hitbox sudah terlanjur)');
delete w.SCALE[PLAIN];

/* ---- 4. ubah GESERAN -> juga ulang stage (tinggi kanvas berubah) ---- */
w.NUDGE[PLAIN] = -8;
ok(w.liveApplySprites() === false, 'ubah geseran -> TIDAK live');
delete w.NUDGE[PLAIN];

/* ---- 5. ubah JUMLAH RANGKA -> ulang stage (animasi harus didaftar ulang) ---- */
w.SWAP_ANIM.bride = [0,2,4,6,8,10].map(f => ({ grp: 'Main Characters/Pink Man/Idle', f }));
ok(w.liveApplySprites() === false,
   'ubah jumlah rangka -> TIDAK live (animasi perlu didaftar ulang)');
delete w.SWAP_ANIM.bride;

/* Mengganti ISI satu rangka (jumlahnya tetap) TIDAK perlu ulang stage —
   inilah yang membuat klik sprite di dialog langsung terlihat. */
const coinSlotL = w.slotById('coin');
const nCoin = w.slotFrames(coinSlotL).length;
/* Berangkat dari susunan yang BERLAKU sekarang (bawaan ter-bake), bukan
   slotDefaultFrames() — koin kini di-bake 8 rangka, sedangkan bawaan
   ASSET_MAP-nya 4; memakai yang salah mengubah JUMLAH rangka dan
   memaksa ulang stage, sehingga uji "live" ini gagal bukan karena
   fiturnya rusak. */
w.SWAP_ANIM.coin = w.slotFrames(coinSlotL).slice();
w.SWAP_ANIM.coin[1] = { grp: 'Traps/Saw/On', f: 0 };
ok(w.slotFrames(coinSlotL).length === nCoin,
   'jumlah rangka tidak berubah (' + nCoin + ')');
ok(w.liveApplySprites() === true,
   'ganti ISI satu rangka -> LIVE (tanpa ulang stage)');
/* KEMBALIKAN ke bawaan ter-bake, bukan dihapus. `delete` akan menjatuhkan
   koin dari 8 rangka (SWAP_ANIM_DEF) ke 4 rangka (ASSET_MAP), sehingga
   animasi 8-rangka yang terlanjur terdaftar di scene tiruan tidak lagi
   cocok — dan uji SESUDAH ini gagal seolah fiturnya rusak. */
w.SWAP_ANIM.coin = w.SWAP_ANIM_DEF.coin.slice();

/* ---- 6. kembali normal -> live lagi ---- */
w.SWAP.t_brick = { grp: 'Terrain/Terrain', f: 8 };
ok(w.liveApplySprites() === true, 'sesudah dikembalikan, live lagi');
delete w.SWAP.t_brick;

/* ---- 7. dekorasi per-stage ikut ditimpa ---- */
const decor = w.ASSET_MAP.find(m => m.key === 't_fence');
for (let s = 0; s < w.STAGES.length; s++) {
  const sz = w.sizeOf(decor);
  makeTex(decor.key + '_s' + s, sz.w, sz.h);
}
refreshed = [];
w.SWAP[decor.key] = { grp: 'Terrain/Terrain', f: 7 };
w.liveApplySprites();
const stageHit = refreshed.filter(k => k.indexOf(decor.key + '_s') === 0);
ok(stageHit.length === w.STAGES.length,
   'tekstur dekorasi per-stage ikut ditimpa (' + stageHit.length + '/' +
   w.STAGES.length + ')');
delete w.SWAP[decor.key];

/* ---- 8. tanpa scene aktif -> false, bukan exception ---- */
const savedGame = w.GAME;
w.GAME = null;
let threw = false, r;
try { r = w.liveApplySprites(); } catch (e) { threw = true; }
ok(!threw && r === false, 'tanpa scene: kembalikan false tanpa exception');
w.GAME = savedGame;

/* ---- 9. applySwap memilih jalur yang tepat ---- */
ok(/if \(liveApplySprites\(\)\)/.test(js),
   'applySwap mencoba live dulu, baru ulang stage');
ok(/Diterapkan langsung/.test(js), 'ada pesan "diterapkan langsung"');

/* ---- 10. klik sel sprite langsung menerapkan ---- */
ok(/if \(liveApplySprites\(\)\) swapNote\('Diterapkan langsung\.'\)/.test(js),
   'klik sel sprite langsung menerapkan tanpa tombol Terapkan');

/* ---- 11. nilai bawaan yang di-bake ---- */
ok(w.SWAP_DEF['t_gr_s0'] && w.SWAP_DEF['t_gr_s0'].f === 20,
   't_gr_s0 -> Terrain/Terrain #615 (f=20) ter-bake');
ok(w.SWAP_DEF['t_plat'] && w.SWAP_DEF['t_plat'].f === 19,
   't_plat -> Terrain/Terrain #614 (f=19) ter-bake');
/* Bendera akhir stage diperbesar 2,5x lewat SCALE_DEF (ter-bake, jadi
   berlaku untuk semua tenant — bukan cuma browser yang pernah menyetel). */
ok(w.SCALE_DEF['t_goal'] === 2.5, 't_goal diskala 2,5x di SCALE_DEF');
/* Geseran -9 sudah DIBUANG: itu tambalan lama untuk bendera yang
   tenggelam. Sesudah acuannya diperbaiki (kaki dipatok ke tanah),
   geseran itu justru mengangkat bendera dari tanah. */
ok(!w.NUDGE_DEF['t_goal'], 't_goal tidak lagi digeser di NUDGE_DEF');
w.TUNE = w.TUNE || w.loadTune();
/* Yang diuji: TUNE benar-benar DIMUAT DARI TUNE_DEF saat localStorage
   kosong — bukan angka tertentu. Angkanya berubah tiap kali hasil
   penyetelan di-bake, dan mengunci angka membuat tes gagal palsu. */
ok(!!w.TUNE, 'TUNE termuat');
const sameAsDef = Object.keys(w.TUNE_DEF).every(k => w.TUNE[k] === w.TUNE_DEF[k]);
ok(sameAsDef,
   'tanpa localStorage, TUNE = TUNE_DEF persis (bawaan yang di-bake dipakai)');

/* bawaan benar-benar dipakai saat localStorage kosong */
ok(w.SWAP['t_gr_s0'] && w.SWAP['t_gr_s0'].f === 20,
   'SWAP memakai bawaan yang di-bake');
ok(w.scaleOf('t_goal') === 2.5, 'scaleOf(t_goal) = 2,5 (bendera besar)');
/* Skala hanya berlaku kalau key-nya boleh diskala. Kalau suatu saat
   t_goal ikut dikunci grid seperti bata/pijakan, scaleOf() akan
   mengembalikan 1 dan SCALE_DEF diam-diam tidak berpengaruh. */
ok(w.scalable('t_goal'), 't_goal memang boleh diskala (bukan objek terkunci grid)');
ok(w.nudgeOf('t_goal') === 0, 'nudgeOf(t_goal) = 0 (kaki menapak tanah)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
