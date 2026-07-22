/* AUDIT: objek mana yang ganti sprite-nya TIDAK sampai ke layar.

   Keluhan user: "banyak object yang ketika diubah spritenya ga
   mengupdate apa yang ada di tampilan game-nya."

   Cara kerjanya: tiap entri ASSET_MAP menjanjikan "objek ini bisa
   diganti dari dialog". Janji itu hanya benar kalau kunci teksturnya
   BENAR-BENAR dipakai saat menggambar. Jadi audit ini mencari kunci
   yang muncul di ASSET_MAP + dialog, tapi tidak pernah dirujuk oleh
   kode penggambar — itulah yang terasa "sudah diganti tapi tidak
   berubah". */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

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

/* Bagian kode yang MENGGAMBAR (buang definisi ASSET_MAP & dialog,
   supaya "dipakai" berarti benar-benar dipakai menggambar). */
const amStart = js.indexOf('var ASSET_MAP = [');
const amEnd = js.indexOf('\n];', amStart);
const drawCode = js.slice(0, amStart) + js.slice(amEnd);

/* Sebuah kunci dianggap DIPAKAI kalau muncul sebagai:
     - literal 't_xxx' di luar ASSET_MAP, atau
     - hasil rangkaian prefiks ('t_gr_s' + i, 't_pipe' + h, dst), atau
     - anggota ANIM_SLOTS.keys (dimainkan lewat playSlot). */
const slotKeys = new Set();
w.ANIM_SLOTS.forEach(sl => sl.keys.forEach(k => slotKeys.add(k)));

function isUsed(key) {
  if (slotKeys.has(key)) return true;                 /* lewat playSlot */
  if (drawCode.indexOf("'" + key + "'") > -1) return true;
  /* dirakit dari prefiks: cari prefiks terpanjang yang dipakai */
  for (let cut = key.length - 1; cut > 3; cut--) {
    const pre = key.slice(0, cut);
    if (drawCode.indexOf("'" + pre + "' +") > -1) return true;
    if (drawCode.indexOf("'" + pre + "', ") > -1) return true;  /* scene_texKey */
  }
  return false;
}

const labelled = w.ASSET_MAP.filter(m => m.label);
const unused = labelled.filter(m => !isUsed(m.key));

console.log('Entri ASSET_MAP berlabel (muncul di dialog): ' + labelled.length);
console.log('Tidak pernah dipakai menggambar            : ' + unused.length);
if (unused.length) {
  console.log('\nDAFTAR YANG "DIGANTI TAPI TIDAK BERUBAH":');
  unused.forEach(m => console.log('  - ' + m.key + '   [' + m.label + ']'));
}
console.log('');

ok(unused.length === 0,
   'setiap objek di dialog benar-benar dipakai menggambar' +
   (unused.length ? ' -> ' + unused.map(m => m.key).join(', ') : ''));

/* ---- Objek per-stage: kunci dasar TIDAK dipakai, yang dipakai
   kunci "_sN". Pastikan pasangannya konsisten supaya penggantian
   pada kunci dasar ikut merambat ke tiap stage. ---- */
const stageEntries = w.ASSET_MAP.filter(m => m.stages);
stageEntries.forEach(m => {
  ok(/_s' \+ sI|_s' \+ sIdx|m\.key \+ '_s'/.test(js),
     'dekorasi per-stage "' + m.key + '" didaftarkan ulang tiap stage');
});

/* applySheetTextures WAJIB membuat kunci per-stage utk entri stages:true,
   kalau tidak yang terpakai selalu versi prosedural. */
const appl = js.slice(js.indexOf('function applySheetTextures'),
                      js.indexOf('function applySheetTextures') + 2500);
ok(/if \(!m\.stages\) continue;/.test(appl) && /m\.key \+ '_s' \+ sI/.test(appl),
   'applySheetTextures() mendaftarkan ulang tekstur untuk tiap stage');

/* liveApplySprites juga harus menimpa kunci per-stage, bukan cuma dasar */
const live = js.slice(js.indexOf('function liveApplySprites'),
                      js.indexOf('function liveApplySprites') + 4000);
ok(/m\.key \+ '_s' \+ s2/.test(live),
   'liveApplySprites() ikut menimpa kunci per-stage');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
