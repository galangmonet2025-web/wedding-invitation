/* AKAR BUG "BOS ILANG SAAT DITEMBAK" — argumen overlap Phaser tertukar.
   ---------------------------------------------------------------------
   Dilaporkan user BERKALI-KALI: "pas di tembak masih hilang". Semua tebakan
   render (alpha/tint/partikel) salah sasaran. Penyebab sebenarnya:

   physics.add.overlap(this.shots [GROUP], this.boss [SPRITE], cb)
   Phaser 3.80.1 (World.js collideHandler -> collideSpriteVsGroup)
   MENORMALKAN urutan: SPRITE tunggal selalu jadi argumen PERTAMA, anggota
   GROUP jadi KEDUA. Jadi cb dipanggil (BOS, PELURU) — bukan (peluru, bos).

   Kode lama: shotHitsBoss(s, b){ s.disableBody(true,true); ... } -> mematikan
   argumen PERTAMA = BOS -> active=false, visible=false -> bos HILANG saat
   ditembak.

   Uji ini MENIRU normalisasi Phaser (mengirim bos sebagai arg pertama) dan
   memastikan: (1) bos TIDAK PERNAH di-disable/hide, (2) peluru YANG di-disable,
   (3) HP tetap turun. Lalu MEMBUKTIKAN uji menangkap bug dengan mengembalikan
   perilaku lama. */
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

const shotHitsBossSrc = bodyOf('shotHitsBoss');
ok(!!shotHitsBossSrc, 'shotHitsBoss ditemukan');

/* ---- objek tiruan ---- */
function mkSprite(kind) {
  const o = {
    kind, active: true, visible: true, alpha: 1, x: 100, y: 300,
    _disableCalls: 0,
    disableBody(hideAndDeactivate, dontHide) {
      o._disableCalls++;
      /* Semantik Phaser disableBody(disableGameObject, hideGameObject):
         disableBody(true, true) -> active=false, visible=false. */
      if (hideAndDeactivate) o.active = false;
      if (dontHide) o.visible = false;
      return o;
    }
  };
  return o;
}

/* Scene minimal untuk menjalankan shotHitsBoss + hitBoss. */
function makeScene() {
  const boss = mkSprite('boss');
  boss.invulnMs = 0; boss.flashMs = 0; boss.setAlpha = (v) => { boss.alpha = v; return boss; };
  boss.setVisible = (v) => { boss.visible = v; return boss; };
  const sc = {
    boss, bossActive: true, bossHp: 12, bossPhase: 1, bossHeadH: 120,
    textures: { exists: () => false },
    add: { particles: () => ({ explode() {}, destroy() {}, setDepth() { return this; } }) },
    time: { now: 1000, delayedCall() {} },
    cameras: { main: { shake() {}, flash() {} } },
    addScore() {},
    defeatBoss() { sc._defeated = true; },   /* stub: cukup tahu HP habis */
  };
  const proto = new Function(
    'sfx', 'BOSS_INVULN_MS', 'BOSS_FLASH_MS',
    'var GameScene=function(){};' + bodyOf('shotHitsBoss') + '\n' + bodyOf('hitBoss') +
    'return GameScene.prototype;'
  )(() => {},
    /BOSS_INVULN_MS = (\d+)/.test(js) ? +RegExp.$1 : 650,
    /BOSS_FLASH_MS = (\d+)/.test(js) ? +RegExp.$1 : 200);
  sc.shotHitsBoss = proto.shotHitsBoss;
  sc.hitBoss = proto.hitBoss;
  return sc;
}

/* =====================================================================
   1. NORMALISASI PHASER: cb dipanggil (BOS, PELURU) — bos jangan mati
   ===================================================================== */
console.log('--- overlap Phaser mengirim (bos, peluru): bos tak boleh dimatikan ---');
const sc = makeScene();
const bullet = mkSprite('bullet');
const hpBefore = sc.bossHp;

/* Persis seperti Phaser 3.80.1: sprite tunggal (bos) sebagai argumen PERTAMA. */
sc.shotHitsBoss(sc.boss, bullet);

ok(sc.boss.active === true, 'BOS tetap active (tidak di-disable) — inti bug');
ok(sc.boss.visible === true, 'BOS tetap visible (tidak disembunyikan) — inti bug');
ok(sc.boss._disableCalls === 0, 'disableBody TIDAK pernah dipanggil pada bos');
ok(bullet.active === false && bullet.visible === false,
   'PELURU yang di-disable (bukan bos)');
ok(bullet._disableCalls === 1, 'disableBody dipanggil tepat sekali pada peluru');
ok(sc.bossHp === hpBefore - 1, 'HP bos turun 1 (hitBoss tetap jalan)');

/* =====================================================================
   2. KETAHANAN URUTAN: sekalipun Phaser suatu saat mengirim (peluru, bos),
      fungsi harus tetap benar (dikenali lewat identitas this.boss)
   ===================================================================== */
console.log('\n--- ketahanan: urutan terbalik pun bos tetap aman ---');
const sc2 = makeScene();
const bullet2 = mkSprite('bullet');
sc2.shotHitsBoss(bullet2, sc2.boss);         /* urutan (peluru, bos) */
ok(sc2.boss.active === true && sc2.boss.visible === true,
   'bos tetap aman walau argumen (peluru, bos)');
ok(bullet2.active === false, 'peluru tetap yang di-disable');
ok(sc2.bossHp === 11, 'HP tetap turun');

/* =====================================================================
   3. GUARD STATIK: kode tidak boleh men-disable argumen membabi buta
   ===================================================================== */
console.log('\n--- guard statik pada kode ---');
const codeNoComment = shotHitsBossSrc.replace(/\/\*[\s\S]*?\*\//g, '');
/* Tidak boleh ada 's.disableBody' pada argumen pertama tanpa cek identitas.
   Pola aman: menghitung 'shot' lewat perbandingan dengan this.boss. */
ok(/=== *b\b/.test(codeNoComment) || /=== *this\.boss/.test(codeNoComment),
   'shotHitsBoss mengenali peluru vs bos lewat identitas (=== this.boss)');
ok(/disableBody/.test(codeNoComment), 'peluru tetap di-disable (1 peluru 1 kena)');
/* Argumen pertama TIDAK boleh langsung di-disable tanpa cek. */
const firstArg = /function *\(([a-zA-Z0-9_]+)/.exec(codeNoComment);
if (firstArg) {
  const a0 = firstArg[1];
  const blind = new RegExp('\\b' + a0 + '\\.disableBody');
  ok(!blind.test(codeNoComment),
     'argumen pertama (' + a0 + ') TIDAK di-disable membabi buta (akar bug)');
}

/* =====================================================================
   4. BUKTI UJI MENANGKAP BUG: jalankan versi LAMA -> harus GAGAL
   ===================================================================== */
console.log('\n--- bukti: uji menangkap perilaku lama ---');
function makeSceneOld() {
  const sc = makeScene();
  /* versi lama: matikan argumen pertama membabi buta */
  sc.shotHitsBoss = function (s, b) {
    if (!s.active || !b || !b.active || !this.bossActive) return;
    s.disableBody(true, true);
    this.hitBoss();
  };
  return sc;
}
const scOld = makeSceneOld();
scOld.shotHitsBoss(scOld.boss, mkSprite('bullet'));   /* Phaser kirim (bos, peluru) */
const bugReproduced = (scOld.boss.active === false && scOld.boss.visible === false);
ok(bugReproduced,
   'versi LAMA benar-benar mematikan bos saat ditembak (uji ini valid menangkapnya)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
