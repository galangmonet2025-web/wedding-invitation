/* Melacak: kenapa peluru BERHENTI DI TEMPAT sesudah beberapa tembakan.
   Menirukan perilaku Arcade Physics yang relevan seteliti mungkin:
     - group.get() memakai ulang anggota yang mati (disableBody)
     - disableBody(true,true) -> setActive(false), setVisible(false),
       body.enable = false, DAN body.stop() (kecepatan jadi 0)
     - body.reset(x,y) -> stop() + posisi, TAPI TIDAK menyalakan enable
   Tujuannya menemukan urutan mana yang membuat kecepatan hilang. */

const fs = require('fs');
const js = fs.readFileSync('index.js', 'utf8');

/* --- model Body ala Arcade --- */
function Body(go) {
  this.gameObject = go;
  this.enable = true;
  this.velocity = { x: 0, y: 0 };
  this.allowGravity = true;
  this.width = 8; this.height = 8;
}
Body.prototype.stop = function () { this.velocity.x = 0; this.velocity.y = 0; return this; };
Body.prototype.reset = function (x, y) {
  /* Phaser: reset() memindahkan badan DAN memanggil stop().
     Penting: reset() TIDAK mengubah `enable`. */
  this.gameObject.x = x; this.gameObject.y = y;
  this.stop();
  return this;
};
Body.prototype.setAllowGravity = function (v) { this.allowGravity = v; return this; };
Body.prototype.setVelocity = function (x, y) {
  if (!this.enable) {
    /* Ini inti masalahnya kalau terjadi: menulis kecepatan ke badan yang
       masih mati. Kita catat, tidak diam-diam. */
    this._wroteWhileDisabled = true;
  }
  this.velocity.x = x; this.velocity.y = y; return this;
};
Body.prototype.setSize = function (w, h) { this.width = w; this.height = h; return this; };
Body.prototype.setOffset = function () { return this; };

/* --- model GameObject --- */
function GO() {
  this.x = 0; this.y = 0;
  this.active = false; this.visible = false;
  this.body = new Body(this);
}
GO.prototype.setActive = function (v) { this.active = v; return this; };
GO.prototype.setVisible = function (v) { this.visible = v; return this; };
GO.prototype.setDepth = function () { return this; };
GO.prototype.setFlipX = function () { return this; };
GO.prototype.setTexture = function () { return this; };
GO.prototype.disableBody = function (hide, deactivate) {
  /* Phaser: menonaktifkan badan, menghentikannya, dan (opsional)
     menyembunyikan + menonaktifkan game object. */
  this.body.enable = false;
  this.body.stop();
  if (deactivate) this.setActive(false);
  if (hide) this.setVisible(false);
  return this;
};
GO.prototype.enableBody = function (reset, x, y, enableGO, showGO) {
  this.body.enable = true;
  if (reset) { this.x = x; this.y = y; this.body.stop(); }
  if (enableGO) this.setActive(true);
  if (showGO) this.setVisible(true);
  return this;
};

/* --- model Group dgn maxSize + daur ulang --- */
function Group(max) { this.max = max; this.kids = []; }
Group.prototype.getChildren = function () { return this.kids; };
Group.prototype.countActive = function () {
  return this.kids.filter(k => k.active).length;
};
Group.prototype.get = function (x, y) {
  /* Phaser: pakai ulang yang MATI dulu; kalau tidak ada & masih di bawah
     maxSize, buat baru; kalau kolam penuh -> null. */
  let s = this.kids.find(k => !k.active);
  if (s) { s.x = x; s.y = y; return s; }
  if (this.kids.length >= this.max) return null;
  s = new GO(); s.x = x; s.y = y;
  this.kids.push(s);
  return s;
};

/* --- ambil fireShot ASLI dari index.js --- */
function bodyOf(name) {
  const s = js.indexOf('GameScene.prototype.' + name + ' = function');
  const e = js.indexOf('\n};', s);
  return js.slice(s, e + 3);
}
const SHOT_SPEED = /var SHOT_SPEED = (\d+)/.exec(js)[1] | 0;
const SHOT_MAX = /var SHOT_MAX = (\d+)/.exec(js)[1] | 0;
const SHOT_CD = /var SHOT_CD = (\d+)/.exec(js)[1] | 0;
const SHOT_LIFE = /var SHOT_LIFE = (\d+)/.exec(js)[1] | 0;

const proto = new Function(
  'SHOT_SPEED', 'SHOT_MAX', 'SHOT_CD', 'SHOT_LIFE', 'canShoot', 'playSlot', 'sfx', 'BW',
  'var GameScene = function(){};' +
  bodyOf('fireShot') + bodyOf('updateShots') +
  'return GameScene.prototype;'
)(SHOT_SPEED, SHOT_MAX, SHOT_CD, SHOT_LIFE, () => true, () => {}, () => {}, 540);

const scene = {
  shots: new Group(SHOT_MAX),
  shotCdUntil: 0,
  player: { x: 300, y: 400, direction: 1, dying: false },
  clearSeq: null,
  cameras: { main: { scrollX: 0 } },
  fireShot: proto.fireShot,
  updateShots: proto.updateShots
};

console.log('SHOT_MAX=' + SHOT_MAX + ' SPEED=' + SHOT_SPEED +
            ' CD=' + SHOT_CD + ' LIFE=' + SHOT_LIFE + '\n');

let t = 0;
let dead = 0;
for (let round = 1; round <= 8; round++) {
  t += SHOT_CD + 10;
  const okFire = scene.fireShot(t);
  const kids = scene.shots.getChildren();
  const last = kids[kids.length - 1];
  const stat = kids.map((k, i) =>
    'p' + i + '{act:' + (k.active ? 'Y' : 'n') +
    ',en:' + (k.body.enable ? 'Y' : 'n') +
    ',vx:' + k.body.velocity.x + '}').join(' ');
  console.log('tembak#' + round + ' -> ' + (okFire ? 'OK ' : 'DITOLAK ') + stat);

  /* peluru diam = kecepatan 0 padahal aktif */
  kids.forEach(k => {
    if (k.active && k.body.velocity.x === 0) dead++;
  });

  /* Simulasikan peluru mengenai musuh pada ronde 2 & 4 -> disableBody,
     yang membuat kolam mendaur ulang objek itu di tembakan berikutnya. */
  if (round === 2 || round === 4) {
    const alive = kids.find(k => k.active);
    if (alive) { alive.disableBody(true, true); console.log('   (peluru kena musuh -> disableBody)'); }
  }
  /* umur habis */
  t += 5;
  scene.updateShots(t);
}

/* =====================================================================
   PENILAIAN
   ===================================================================== */
let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

console.log('');
ok(dead === 0,
   'tidak ada peluru AKTIF berkecepatan 0 — tidak ada yang menggantung ' +
   'diam di titik tembak (' + dead + ')');

const wrote = scene.shots.getChildren().filter(k => k.body._wroteWhileDisabled).length;
ok(wrote === 0,
   'kecepatan tidak pernah ditulis ke badan MATI — inti bug "ranjau" (' +
   wrote + ')');

const halfAlive = scene.shots.getChildren()
  .filter(k => k.active && !k.body.enable).length;
ok(halfAlive === 0,
   'tidak ada peluru setengah hidup (objek aktif tapi badan mati): ' + halfAlive);

/* Kolam tidak boleh terkunci oleh peluru hantu: kalau ada objek aktif
   berbadan mati, countActive() menghitungnya dan menembak jadi DITOLAK
   selamanya walau layar terlihat kosong. */
scene.shots.getChildren().forEach(k => k.disableBody(true, true));
t += SHOT_CD + 10;
ok(scene.fireShot(t) === true,
   'sesudah semua peluru mati, menembak bisa lagi (kolam tidak terkunci)');

/* Penjaga sumber: enableBody, bukan setActive+reset. */
const fireSrc = js.slice(js.indexOf('GameScene.prototype.fireShot'),
                         js.indexOf('\n};', js.indexOf('GameScene.prototype.fireShot')));
ok(/s\.enableBody\(true, sx, sy, true, true\)/.test(fireSrc),
   'fireShot memakai enableBody() — menyalakan body.enable sekaligus');
ok(!/s\.setActive\(true\)\.setVisible\(true\);\s*\n\s*if \(s\.body\)/.test(fireSrc),
   'pola lama (setActive + body.reset) sudah tidak dipakai di jalur utama');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);


