/* Uji KETAHANAN LOOP GAME.

   Gejala yang dikejar (dilaporkan user):
     "gamenya berhenti, tapi klik button2 masih bisa; pas reset game /
      pindah stage, game tetap menampilkan layar yang freeze itu"

   Ketiga gejala itu satu penyebab: SATU exception di dalam update()
   mematikan step Phaser SELAMANYA.

     - tombol DOM masih hidup    -> thread JS tidak mati, cuma loop-nya
     - layar beku                -> render ikut berhenti bersama step
     - reset TIDAK menolong      -> scene.restart() itu TERTUNDA; yang
                                    menjalankannya adalah step yang sudah
                                    mati, jadi create() tidak pernah jalan

   Karena itu yang diuji di sini bukan "apakah ada bug X", tapi apakah
   update() SANGGUP MENELAN error dan tetap melangkah di frame berikutnya.
*/
const fs = require('fs');
let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const js = fs.readFileSync('index.js', 'utf8');

/* ---------- 1. MODEL: buktikan mekanismenya, bukan menebak ----------
   Tiruan minimal cara Phaser melangkah: satu throw yang tidak ditangkap
   menghentikan seluruh loop, dan restart yang antre tidak pernah jalan. */
function fakePhaser(sceneUpdate) {
  const st = { steps: 0, created: 0, alive: true, pendingRestart: false };
  st.step = function () {
    if (!st.alive) return;                 /* loop sudah mati */
    if (st.pendingRestart) { st.pendingRestart = false; st.created++; return; }
    sceneUpdate(st);                       /* throw di sini = loop mati */
    st.steps++;
  };
  st.run = function (n) {
    for (let i = 0; i < n; i++) {
      try { st.step(); }
      catch (e) { st.alive = false; }      /* Phaser: RAF berhenti */
    }
  };
  st.restart = function () { st.pendingRestart = true; };
  return st;
}

/* tanpa penjaga: sekali throw -> mati permanen, restart tak berguna */
let tick = 0;
const bad = fakePhaser(() => { tick++; if (tick === 3) throw new Error('boom'); });
bad.run(10);
ok(bad.alive === false, 'MODEL: throw tanpa penjaga -> loop mati');
bad.restart();
bad.run(10);
ok(bad.created === 0,
   'MODEL: restart() TIDAK pernah jalan sesudah loop mati — persis gejala ' +
   '"reset game tetap freeze" (created=' + bad.created + ')');

/* dengan penjaga: throw ditelan, loop lanjut, restart bekerja */
let tick2 = 0;
const good = fakePhaser((s) => {
  try { tick2++; if (tick2 === 3) throw new Error('boom'); }
  catch (e) { /* ditelan */ }
});
good.run(10);
ok(good.alive === true, 'MODEL: dgn penjaga -> loop tetap hidup');
good.restart(); good.run(2);
ok(good.created === 1, 'MODEL: dgn penjaga -> restart() berjalan normal');

/* ---------- 2. KODE NYATA: update() harus punya penjaga ---------- */
function bodyOf(name) {
  const i = js.indexOf('GameScene.prototype.' + name + ' = function');
  if (i < 0) return null;
  const j = js.indexOf('\n};', i);
  return js.slice(i, j);
}
const upd = bodyOf('update');
const inner = bodyOf('updateInner');
ok(!!upd, 'update() ditemukan');
ok(!!inner, 'isi loop dipindah ke updateInner()');
/* Pembungkusnya HARUS berupa try/catch di sekeliling pemanggilan
   updateInner(). Kalau try/catch ditaruh di dalam updateInner, "return"
   lebih awal di sana tetap aman — tapi throw dari BARIS MANA PUN yang di
   luar try akan tetap mematikan loop. Membungkus di pemanggil menutup
   seluruh badan sekaligus, termasuk semua jalur return. */
ok(/try\s*\{[\s\S]*this\.updateInner\([\s\S]*?\}\s*catch/.test(upd || ''),
   'update() membungkus updateInner() dgn try/catch (satu throw tidak ' +
   'boleh mematikan loop selamanya)');
ok(/catch/.test(upd) && /_loopErr/.test(upd),
   'error yang tertangkap DICATAT, bukan ditelan diam-diam ' +
   '(kalau diam-diam, bug berikutnya tak akan pernah terlihat)');
ok(/console\.error/.test(upd || ''), 'error dilaporkan ke konsol');
ok(/msg !== _loopErrLast/.test(upd || ''),
   'pesan yang SAMA tidak diulang tiap frame (60x/detik akan menutupi ' +
   'penyebab aslinya)');

/* ---------- 3. kesempatan pulih ---------- */
ok(/_loopErrCount/.test(js), 'jumlah error dihitung');
ok(/_loopErrRun\s*=\s*0/.test(upd || ''),
   'hitungan beruntun di-reset saat ada frame yang sehat — kalau tidak, ' +
   'error sesekali akan menumpuk sampai memicu pemulihan palsu');
ok(/_loopErrRun === 30/.test(upd || '') && /scene\.restart/.test(upd || ''),
   'sesudah beberapa frame rusak beruntun, stage dibangun ulang otomatis');

/* ---------- 4. reset paksa tersedia ---------- */
ok(/rebootGame/.test(js), 'ada jalur rebootGame() sebagai pemulihan keras');

/* ---------- 5. sub-update ikut terlindungi ----------
   updateEnemies/pumpSpawns dipanggil dari updateInner(), yang seluruhnya
   berada di dalam try milik update(). */
['pumpSpawns', 'updateEnemies'].forEach(fn => {
  ok(inner && inner.indexOf('this.' + fn + '(') > -1,
     'this.' + fn + '() berada di updateInner() (ikut terlindungi)');
});

/* ---------- 6. aturan lama tidak rusak ---------- */
ok(/anyOverlayOpen\(\)/.test(inner || ''),
   'updateInner() tetap membekukan permainan saat dialog terbuka');
ok(/this\.clearSeq/.test(inner || ''),
   'urutan outro stage-clear tetap ada');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
