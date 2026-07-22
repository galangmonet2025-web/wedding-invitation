/* Uji: menembak bos berkali-kali TIDAK membuat bos hilang.

   Laporan user: "ada bugs, ketika boss di tembak, bossnya malah ilang
   ga muncul2 lagi".

   Penyebabnya tween kedip-kena di hitBoss():
     tweens.add({ targets: b, alpha: 0.4, duration: 70, yoyo: true, repeat: 2 })
   dibuat TANPA disimpan dan TANPA menghentikan yang sebelumnya.

   Selama satu-satunya cara melukai bos adalah MENGINJAK, itu aman:
   jendela rentan cuma terbuka sesaat, jadi dua pukulan tak pernah
   berdekatan. MENEMBAK mengubahnya — jeda tembak 300ms sementara tween
   ini hidup ~420ms (70 x yoyo x repeat 2). Tembakan kedua menumpuk tween
   baru di atas tween lama yang masih berjalan; keduanya menulis alpha,
   dan yang tertinggal bisa 0.4. Bos tersangkut nyaris transparan =
   "hilang" dari sisi pemain, padahal objeknya masih ada.

   Karena itu tes ini TIDAK memanggil hitBoss sekali lalu memeriksa
   hasilnya — itu akan lulus bahkan pada kode yang rusak. Yang diuji
   adalah PUKULAN BERUNTUN dengan tween yang masih hidup.
*/
const fs = require('fs');
const js = fs.readFileSync('index.js', 'utf8');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

function bodyOf(n) {
  const s = js.indexOf('GameScene.prototype.' + n + ' = function');
  if (s < 0) return '';
  const e = js.indexOf('\n};', s);
  return e < 0 ? '' : js.slice(s, e + 3);
}
const NAMES = ['shotHitsBoss', 'showBlockedHit', 'hitBoss', 'setBossVulnerable',
               'defeatBoss', 'activateBoss', 'updateBoss', 'manualBossHit'];
const srcs = NAMES.map(bodyOf);
srcs.forEach((s, i) => { if (!s) { console.log('GAGAL badan tak ketemu: ' + NAMES[i]); fail++; } });
if (fail) { console.log('\n' + fail + ' GAGAL'); process.exit(1); }

/* ---------- model Phaser seperlunya ----------
   Yang WAJIB ditiru dengan benar: tween yang masih hidup tetap menulis
   properti target-nya. Itulah mekanisme bug-nya; kalau tween dimodelkan
   sebagai "langsung selesai", bug-nya lenyap dan tes jadi tak berguna. */
function mk(kind) {
  const o = {
    kind, active: true, visible: true, alpha: 1, x: 100, y: 100,
    destroyed: false, stopped: false,
    setActive(v) { o.active = v; return o; },
    setVisible(v) { o.visible = v; return o; },
    setAlpha(v) { o.alpha = v; return o; },
    setOrigin() { return o; }, setDepth() { return o; },
    setText() { return o; }, setColor() { return o; }, setPosition() { return o; },
    setScale() { return o; }, setTint() { return o; }, clearTint() { return o; },
    setFlipX() { return o; }, setTexture() { return o; },
    add() { return o; },
    destroy() { o.destroyed = true; },
    disableBody(h, d) { o.body.enable = false; if (d) o.active = false; if (h) o.visible = false; return o; }
  };
  o.body = { enable: true, velocity: { x: 0, y: 0 }, setAllowGravity() {}, setSize() {},
             setOffset() {}, setVelocity() {}, reset() {}, stop() {} };
  return o;
}

function makeScene() {
  const live = [];                      /* tween yang masih berjalan */
  const sc = {
    _live: live,
    bossActive: true, bossVulnerable: true, bossHp: 12, bossPhase: 1,
    GY: 400, time: { now: 1000 },
    boss: Object.assign(mk('boss'), { baseY: 300 }),
    L: { len: 4200 },
    player: { x: 90, y: 300, body: { velocity: { y: 5 }, blocked: { down: true }, touching: { down: false } } },
    stageIdx: 5,
    add: { text: () => mk('text'), rectangle: () => mk('rect'), container: () => mk('container') },
    tweens: {
      add(cfg) {
        const tw = {
          cfg, done: false,
          stop() {
            if (tw.done) return tw;
            tw.done = true;
            const i = live.indexOf(tw); if (i >= 0) live.splice(i, 1);
            if (cfg.onStop) cfg.onStop();
            return tw;
          }
        };
        /* Tween MULAI menulis: alpha target langsung bergerak ke nilai
           tujuan. Ini yang membuat bos tampak nyaris transparan. */
        if (cfg.alpha !== undefined) {
          [].concat(cfg.targets).forEach(t => { if (t && t.setAlpha) t.setAlpha(cfg.alpha); });
        }
        live.push(tw);
        return tw;
      }
    },
    cameras: { main: { shake() {}, flash() {}, setBounds() {} } },
    physics: { world: { gravity: { y: 0 } }, add: { overlap() {} } },
    addScore() {}, hurtPlayer() {}
  };
  sc.bossHpBg = mk('hpbg'); sc.bossHpFill = mk('hpfill');
  const proto = new Function(
    'sfx', 'toast', 'fireworks', 'announceCompleted', 'saveStore',
    'STORE', 'STAGES', 'PHYS', 'BOSS_ARENA_W', 'BW', 'BH',
    'var GameScene = function(){};' + srcs.join('\n') + 'return GameScene.prototype;'
  )(() => {}, () => {}, () => {}, () => {}, () => {},
    { maxStage: 0 }, [1, 2, 3, 4, 5, 6], { JUMP_VELOCITY: 540 }, 300, 540, 960);
  Object.keys(proto).forEach(k => { sc[k] = proto[k]; });
  return sc;
}
/* Selesaikan tween tertua (seperti Phaser saat durasinya habis). */
function finishOldest(sc) {
  const tw = sc._live.shift();
  if (!tw || tw.done) return;
  tw.done = true;
  if (tw.cfg.onComplete) tw.cfg.onComplete();
}

/* =====================================================================
   1. TEMBAKAN BERUNTUN — inti bug
   ===================================================================== */
console.log('--- tembakan beruntun (jeda 300ms, tween kedip ~420ms) ---');
const sc = makeScene();
for (let n = 1; n <= 5; n++) {
  sc.bossVulnerable = true;             /* jendela terbuka */
  sc.hitBoss();
  ok(sc._live.filter(t => !t.done && t.cfg.alpha !== undefined).length <= 1,
     'pukulan ' + n + ': hanya SATU tween alpha hidup pada satu waktu (' +
     sc._live.filter(t => !t.done && t.cfg.alpha !== undefined).length + ')');
}
/* Semua tween akhirnya selesai */
let g = 0;
while (sc._live.length && g++ < 50) finishOldest(sc);

ok(sc.boss.alpha === 1,
   'sesudah 5 pukulan beruntun, bos KEMBALI TERLIHAT PENUH (alpha ' +
   sc.boss.alpha + ') — dulu tersangkut 0.4 dan terbaca "hilang"');
ok(sc.boss.alpha > 0.9,
   'bos tidak tersangkut nyaris transparan');
ok(!sc.boss.destroyed, 'bos tidak terhapus oleh pukulan biasa');
ok(sc.bossHp === 7, 'HP berkurang tepat 5 (' + sc.bossHp + ')');

/* =====================================================================
   2. TWEEN YANG DIPOTONG TETAP MENGEMBALIKAN ALPHA
   ===================================================================== */
console.log('\n--- tween dipotong di tengah ---');
const sc2 = makeScene();
sc2.hitBoss();
ok(sc2.boss.alpha < 1, 'saat kedip berjalan, alpha memang turun (' + sc2.boss.alpha + ')');
sc2.hitBoss();                          /* memotong tween pertama */
while (sc2._live.length && g++ < 80) finishOldest(sc2);
ok(sc2.boss.alpha === 1,
   'stop() ikut memulihkan alpha (onStop), bukan hanya onComplete');

/* =====================================================================
   3. BOS KALAH: tween kedip tidak berebut dengan tween lenyap
   ===================================================================== */
console.log('\n--- bos kalah tepat saat kedip berjalan ---');
const sc3 = makeScene();
sc3.bossHp = 1;
sc3.bossVulnerable = true;
sc3.hitBoss();                          /* HP habis -> defeatBoss */
ok(sc3.bossHp === 0, 'HP habis');
ok(sc3.bossActive === false, 'bossActive dimatikan');
const hitTw = sc3._bossHitTw;
ok(!hitTw || hitTw.done,
   'tween kedip dihentikan sebelum tween lenyap dijalankan');

/* =====================================================================
   4. PENJAGA SUMBER
   ===================================================================== */
console.log('\n--- penjaga sumber ---');
const hitSrc = bodyOf('hitBoss');
ok(/this\._bossHitTw/.test(hitSrc),
   'tween kedip DISIMPAN (bisa dihentikan), bukan dibuat lalu dilupakan');
ok(/if \(this\._bossHitTw\) \{ try \{ this\._bossHitTw\.stop\(\)/.test(hitSrc),
   'tween sebelumnya dihentikan dulu — tidak ada dua penulis alpha');
ok(/onStop:/.test(hitSrc),
   'ada onStop: stop() tidak memanggil onComplete, jadi tanpa ini alpha ' +
   'bisa tertinggal 0.4');
ok(/onComplete: function \(\) \{ b\.setAlpha\(1\)/.test(hitSrc),
   'onComplete memulihkan alpha ke 1');
const defSrc = bodyOf('defeatBoss');
ok(/_bossHitTw/.test(defSrc),
   'defeatBoss ikut menghentikan tween kedip sebelum tween lenyap');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
