/* Uji BENDA YANG DIRAKIT DARI BEBERAPA POTONGAN.

   Bug yang dilaporkan (dgn tangkapan layar): "KOK JADI MELAYANG INI
   PIJAKANNYA". Pijakan melayang digambar dari TIGA tekstur berdampingan
   (ujung kiri + tengah + ujung kanan). Saat pijakan dipecah jadi tiga,
   hanya 't_plat' yang diberi penggantian ter-bake di SWAP_DEF; dua
   ujungnya diam-diam tetap memakai rangka bawaan yang bentuk & warnanya
   berbeda. Akibatnya ujung pijakan tidak menyambung dengan tengahnya,
   dan papan itu terbaca sebagai benda menggantung tanpa tumpuan.

   Yang diuji: SUMBER PIKSEL yang benar-benar dipakai tiap potongan —
   bukan sekadar "apakah key-nya ada". Dua potongan yang bersebelahan
   harus memotong rangka yang sama persis. */
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
  imageSmoothingEnabled: true, drawImage(){}, clearRect(){}, fillRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){}
});
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);

/* Sumber piksel efektif sebuah key: "kelompok#rangka". */
function src(k) {
  const m = w.ASSET_MAP.find(e => e.key === k);
  if (!m) return null;
  const e = w.effectiveSrc(m);
  return e.grp + '#' + (e.f || 0);
}

/* ---- 1. daftar potongan terdefinisi & masuk akal ---- */
ok(Array.isArray(w.PIECE_SETS) && w.PIECE_SETS.length > 0,
   'PIECE_SETS mendaftar benda yang dirakit dari beberapa potongan');
const plat = w.PIECE_SETS.find(s => s.indexOf('t_plat') > -1);
ok(!!plat && plat.length === 3,
   'pijakan terdaftar sebagai 3 potongan: ' + (plat || []).join(', '));
/* semua key dalam PIECE_SETS harus benar-benar ada di ASSET_MAP */
const ghost = w.PIECE_SETS.flat().filter(k => !w.ASSET_MAP.find(e => e.key === k));
ok(ghost.length === 0,
   'tidak ada key hantu di PIECE_SETS' + (ghost.length ? ' -> ' + ghost.join(', ') : ''));

/* ---- 2. BAWAAN: tiap kelompok potongan seragam ---- */
w.PIECE_SETS.forEach(set => {
  const vals = set.map(src);
  const uniq = new Set(vals);
  ok(uniq.size === 1,
     'bawaan seragam untuk [' + set.join(' + ') + '] -> ' +
     set.map((k, i) => k + '=' + vals[i]).join('  |  '));
});

/* ---- 3. SWAP_DEF tidak boleh menyentuh sebagian saja ----
   Inilah bentuk persis bug-nya: satu potongan di-bake, sisanya lupa. */
w.PIECE_SETS.forEach(set => {
  const baked = set.filter(k => w.SWAP_DEF[k]);
  ok(baked.length === 0 || baked.length === set.length,
     'SWAP_DEF menyentuh SEMUA atau TIDAK SAMA SEKALI untuk [' + set.join('+') + '] ' +
     '(ter-bake: ' + baked.length + '/' + set.length + ')');
  if (baked.length === set.length) {
    const j = set.map(k => JSON.stringify(w.SWAP_DEF[k]));
    ok(new Set(j).size === 1,
       'nilai SWAP_DEF ketiga potongan identik -> ' + j[0]);
  }
});

/* ---- 4. siblingKeysOf() ---- */
ok(typeof w.siblingKeysOf === 'function', 'siblingKeysOf() tersedia');
ok(w.siblingKeysOf('t_plat').sort().join(',') === 't_plat_l,t_plat_r',
   'siblingKeysOf(t_plat) -> ujung kiri & kanan');
ok(w.siblingKeysOf('t_plat_l').indexOf('t_plat') > -1,
   'berlaku dua arah (ujung -> tengah juga)');
ok(w.siblingKeysOf('t_coin0').length === 0,
   'benda biasa tidak punya saudara (t_coin0)');
/* tanah SENGAJA tidak dikelompokkan: permukaan & isian memang boleh beda */
ok(w.siblingKeysOf('t_gr_s0').length === 0,
   'tanah permukaan/isian TIDAK dipaksa sama (memang dirancang beda)');

/* ---- 5. mengganti SATU potongan menyeret yang lain ----
   Ini menirukan user mengklik sel sprite di dialog. Kalau tidak
   menyeret, user bisa membuat ulang bug ini dgn tangan. */
function setOne(key, grp, f) {
  w.SWAP[key] = { grp: grp, f: f };
  w.siblingKeysOf(key).forEach(k => { w.SWAP[k] = { grp: grp, f: f }; });
}
const ALT = 'Traps/Saw/On';
setOne('t_plat', ALT, 0);
ok(new Set(plat.map(src)).size === 1,
   'ganti bagian TENGAH -> ketiga potongan ikut berubah (' + src('t_plat') + ')');
setOne('t_plat_r', 'Terrain/Terrain', 24);
ok(new Set(plat.map(src)).size === 1,
   'ganti UJUNG KANAN -> ketiganya ikut (' + src('t_plat_r') + ')');
plat.forEach(k => delete w.SWAP[k]);

/* ---- 6. kode dialog benar-benar memanggil penyeretan itu ---- */
ok(/siblingKeysOf\(_swapSel\)/.test(js),
   'jalur klik sel sprite di dialog memanggil siblingKeysOf()');

/* ---- 7. drawPlatform tetap punya cadangan kalau ujung tak ada ---- */
const dp = js.slice(js.indexOf('GameScene.prototype.drawPlatform'),
                    js.indexOf('GameScene.prototype.drawPlatform') + 1400);
ok(/if \(!has\(kL\)\) kL = kM;/.test(dp) && /if \(!has\(kR\)\) kR = kM;/.test(dp),
   'kalau tekstur ujung hilang, dipakai tekstur tengah (seragam, bukan bolong)');
ok(/if \(!has\(kM\)\) return;/.test(dp),
   'tanpa tekstur tengah: tidak menggambar apa-apa (bukan kotak rusak)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
