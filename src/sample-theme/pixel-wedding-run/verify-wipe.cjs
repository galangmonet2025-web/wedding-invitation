/* Uji tombol "Hapus data tersimpan" di dialog ATUR GAME.

   Permintaan user: "tambahkan button utk hapus data pengaturan game yg
   tersimpan di local/session storage, jika diklik value kembali ke nilai
   default yg ada pada game".

   Dua hal yang HARUS benar, dan keduanya diuji lewat HASIL yang terlihat,
   bukan lewat "apakah removeItem dipanggil":
     1. semua kunci simpanan benar-benar hilang;
     2. nilai yang BERLAKU kembali sama persis dengan blok *_DEF di
        index.js — bukan sekadar "berubah". */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('index.css', 'utf8');

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

const LS = w.localStorage;

/* ---- 1. tombolnya ADA dan terpasang ---- */
const btn = w.document.getElementById('pwr-tune-wipe');
ok(!!btn, 'tombol #pwr-tune-wipe ada di dialog');
ok(!!btn && btn.closest('.pwr-tune-foot'),
   'tombol berada di footer dialog ATUR GAME (bukan nyasar ke dialog lain)');
ok(/'pwr-tune-wipe':/.test(js), 'tombol terdaftar di DELEGATED (bisa diklik)');
ok(/\.pwr-tune-btn-warn\s*\{/.test(css), 'punya gaya sendiri (.pwr-tune-btn-warn)');
ok(typeof w.wipeStored === 'function', 'wipeStored() tersedia');

/* ---- 2. daftar kunci LENGKAP ----
   Kalau ada kunci simpanan yang tidak masuk storedKeys(), tombol ini akan
   menyisakan setelan lama diam-diam. Jadi daftar itu dibandingkan dengan
   SEMUA var *_KEY yang benar-benar ada di index.js. */
const declared = [];
const re = /var\s+([A-Z_]*KEY)\s*=\s*'([^']+)'/g;
let m2;
while ((m2 = re.exec(js))) declared.push({ name: m2[1], val: m2[2] });
const listed = w.storedKeys();
ok(declared.length >= 6, 'ditemukan ' + declared.length + ' kunci simpanan di index.js');
const missing = declared.filter(d => listed.indexOf(d.val) < 0);
ok(missing.length === 0,
   'storedKeys() mencakup SEMUA kunci' +
   (missing.length ? ' -> terlewat: ' + missing.map(d => d.name).join(', ') : ''));
ok(new Set(listed).size === listed.length, 'tidak ada kunci ganda di storedKeys()');

/* ---- 3. simpan nilai NGACO ke semua kunci, lalu muat ---- */
LS.setItem('pwr_tune_v4', JSON.stringify({ pixel: 8, gravity: 4321, runSpeed: 111 }));
LS.setItem('pwr_swap_v1', JSON.stringify({ t_coin0: { grp: 'Traps/Saw/On', f: 0 } }));
LS.setItem('pwr_scale_v1', JSON.stringify({ t_e1_0: 2.4 }));
LS.setItem('pwr_nudge_v1', JSON.stringify({ t_e1_0: -19 }));
LS.setItem('pwr_swapanim_v1', JSON.stringify({ coin: [{ grp: 'Traps/Saw/On', f: 0 }] }));
LS.setItem('pwr_progress_v1', JSON.stringify({ v:1, seed:5, diff:'hard', unlocked:[1,2,3],
  maxStage: 4, best: 9999, announcedAll:true, completed:true, sfxOn:false }));

w.TUNE = w.loadTune(); w.loadSwap(); w.loadScale(); w.loadNudge(); w.loadSwapAnim();
w.STORE = w.loadStore(); w.recomputeDerived();

ok(w.TUNE.gravity === 4321, 'pra-syarat: nilai ngaco benar-benar termuat (gravity=4321)');
ok(w.scaleOf('t_e1_0') === 2.4, 'pra-syarat: ukuran ngaco termuat');
ok(w.nudgeOf('t_e1_0') === -19, 'pra-syarat: geser ngaco termuat');
ok(w.STORE.diff === 'hard' && w.STORE.sfxOn === false,
   'pra-syarat: progres/SFX ngaco termuat');
const swappedCrop = JSON.stringify(w.effectiveSrc(w.ASSET_MAP.find(x => x.key === 't_coin0')));
ok(w.storedCount() === 6, 'storedCount() melihat 6 bagian tersimpan');

/* ---- 4. KLIK: hapus ---- */
w.wipeStored();

const left = w.storedKeys().filter(k => LS.getItem(k) !== null);
ok(left.length === 0, 'semua kunci terhapus dari localStorage' +
   (left.length ? ' -> tersisa: ' + left.join(', ') : ''));
ok(w.storedCount() === 0, 'storedCount() kembali 0');

/* ---- 5. nilai BERLAKU = blok *_DEF di kode (bukan sekadar "berubah") ---- */
let defsMismatch = [];
Object.keys(w.TUNE_DEF).forEach(k => {
  if (w.TUNE[k] !== w.TUNE_DEF[k]) defsMismatch.push(k + '=' + w.TUNE[k] + ' (mau ' + w.TUNE_DEF[k] + ')');
});
ok(defsMismatch.length === 0,
   'SEMUA nilai fisika = TUNE_DEF' + (defsMismatch.length ? ' -> ' + defsMismatch.join(', ') : ''));
ok(w.scaleOf('t_e1_0') === 1, 'ukuran kembali bawaan (1)');
ok(w.nudgeOf('t_e1_0') === 0, 'geser kembali bawaan (0)');
ok(w.STORE.diff === 'easy', 'kesulitan kembali bawaan (easy)');
ok(w.STORE.sfxOn === true, 'SFX kembali nyala');
ok(w.STORE.unlocked.length === 0 && w.STORE.maxStage === 0, 'progres stage kembali kosong');

/* penggantian sprite ikut hilang: sumber t_coin0 kembali seperti bawaan */
const afterCrop = JSON.stringify(w.effectiveSrc(w.ASSET_MAP.find(x => x.key === 't_coin0')));
ok(afterCrop !== swappedCrop, 'penggantian sprite ikut terhapus (sumber berubah kembali)');

/* ---- 6. hasilnya IDENTIK dengan boot bersih ----
   Ini uji yang sebenarnya: apakah "hapus" benar-benar setara dengan
   membuka game di perangkat yang belum pernah dipakai. */
function snapshot() {
  return JSON.stringify({
    tune: w.TUNE, swap: w.SWAP, scale: w.SCALE, nudge: w.NUDGE, anim: w.SWAP_ANIM
  });
}
const afterWipe = snapshot();
LS.clear();
w.TUNE = w.loadTune(); w.loadSwap(); w.loadScale(); w.loadNudge(); w.loadSwapAnim();
ok(snapshot() === afterWipe,
   'keadaan sesudah hapus IDENTIK dengan boot di perangkat bersih');

/* ---- 7. dipanggil saat storage KOSONG: tidak error, beri tahu user ---- */
let threw = false;
try { w.wipeStored(); } catch (e) { threw = true; console.log('        ' + e.message); }
ok(!threw, 'aman dipanggil dua kali (storage sudah kosong)');
const note = w.document.getElementById('pwr-tune-note');
ok(note && /sudah bawaan/i.test(note.textContent),
   'user diberi tahu kalau memang tidak ada yang perlu dihapus -> "' +
   (note ? note.textContent : '') + '"');

/* ---- 8. tekstur lama ditandai untuk dibuang ----
   Tanpa ini gambar sprite pilihan lama tetap terlihat walau datanya hilang. */
ok(/_tuneTexDirty\s*=\s*true;/.test(
     js.slice(js.indexOf('function wipeStored'), js.indexOf('function wipeStored') + 2200)),
   'wipeStored() menandai tekstur untuk dibangun ulang');

/* ---- 9. tidak mengganggu tombol lain ---- */
ok(typeof w.resetTuner === 'function' && /TUNE_DEF/.test(String(w.resetTuner)),
   '"Reset" lama tetap ada dan tetap hanya menyentuh slider fisika');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
