/* Uji: sisa-sisa pertarungan bos TIDAK tertinggal di layar setelah bos kalah,
   dan mempelai wanita BERDIRI DI TANAH (tidak melayang).

   Dua laporan user:
     1. "tulisan TAHAN & bar hp boss masih muncul ketika boss sudah dikalahkan"
     2. "saya ga mau object pengantin wanita floating seperti itu"

   Bug 1 bukan soal defeatBoss lupa membersihkan — ia SUDAH membersihkan.
   Penyebabnya rantai empat tween bersarang di bossAttack(): bos hanya BISA
   mati saat jendela rentan terbuka, dan pada saat itu callback penutup
   jendela masih terbang. Callback itu mendarat ~1 detik SESUDAH defeatBoss,
   memanggil setBossVulnerable(false), menemukan bossLabel sudah null, lalu
   MEMBUATNYA LAGI dengan teks "TAHAN". Jadi labelnya adalah hantu yang
   lahir sesudah kematian, bukan sisa yang lupa dihapus.

   Karena itu tes di bawah tidak cuma memeriksa keadaan tepat sesudah
   defeatBoss (itu SUDAH benar sebelum perbaikan, dan tes semacam itu akan
   LULUS PALSU) — tes ini menjalankan callback yang tertunda.
*/
const fs = require('fs');

const js = fs.readFileSync('index.js', 'utf8');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

/* ---------- ambil badan fungsi yang diuji (batas = prototype berikutnya) --- */
/* Batasnya adalah "};" DI KOLOM 0 milik fungsi itu sendiri, bukan
   "prototype berikutnya": defeatBoss adalah metode bos yang TERAKHIR, jadi
   pencarian "prototype berikutnya" tidak menemukan apa pun dan ikut menelan
   sisa berkas — termasuk bootThemeInit() yang menyentuh `document`. */
function bodyOf(name) {
  const s = js.indexOf('GameScene.prototype.' + name + ' = function');
  if (s < 0) return '';
  const e = js.indexOf('\n};', s);
  return e < 0 ? '' : js.slice(s, e + 3);
}

const setVuln = bodyOf('setBossVulnerable');
const attack = bodyOf('bossAttack');
const defeat = bodyOf('defeatBoss');
const update = bodyOf('updateBoss');
const blocked = bodyOf('showBlockedHit');

/* Setiap badan fungsi WAJIB ketemu. Dulu di sini ada `|| js` sebagai
   cadangan — dan karena nama yang dicari ternyata salah, cadangan itu
   menyuntikkan SELURUH file ke dalam new Function(). Cadangan diam-diam
   seperti itu mengubah salah-nama menjadi kegagalan yang membingungkan. */
[['setBossVulnerable', setVuln], ['bossAttack', attack],
 ['defeatBoss', defeat], ['updateBoss', update],
 ['showBlockedHit', blocked]].forEach(function (p) {
  if (!p[1]) { console.log('GAGAL badan fungsi tidak ketemu: ' + p[0]); fail++; }
});
if (fail) { console.log('\n' + fail + ' GAGAL'); process.exit(1); }

/* =====================================================================
   BAGIAN 1 — SIMULASI: hantu tidak boleh lahir sesudah bos kalah
   ===================================================================== */

/* Model kecil Phaser: yang penting hanya bahwa tween onComplete TERTUNDA,
   karena persis penundaan itulah yang melahirkan bug. */
function makeScene() {
  const pending = [];
  const objs = [];
  function obj(kind, txt) {
    const o = {
      kind, text: txt || '', destroyed: false, visible: true,
      setOrigin() { return o; }, setDepth() { return o; },
      setVisible(v) { o.visible = v; return o; },
      setText(t) { o.text = t; return o; },
      setColor() { return o; }, setPosition() { return o; },
      setScale() { return o; }, setTint() { return o; },
      setAlpha(v) { o.alpha = v; return o; },
      clearTint() { return o; }, setFlipX() { return o; },
      add() { return o; }, stop() { o.stopped = true; return o; },
      destroy() { o.destroyed = true; }
    };
    objs.push(o);
    return o;
  }
  const sc = {
    _pending: pending, _objs: objs,
    bossActive: true, bossVulnerable: false, bossHp: 1, bossPhase: 3,
    GY: 400,
    boss: Object.assign(obj('boss'), { x: 100, y: 100, baseY: 100, active: true }),
    player: { x: 80, y: 300, body: { velocity: { y: 0 }, blocked: { down: true }, touching: { down: false } } },
    stageIdx: 4,
    add: {
      text: (x, y, t) => obj('text', t),
      rectangle: () => obj('rect'),
      container: () => obj('container'),
      sprite: () => obj('sprite'),
      image: () => obj('image')
    },
    tweens: { add: (cfg) => { const t = obj('tween'); if (cfg.onComplete) pending.push(cfg.onComplete); return t; } },
    cameras: { main: { shake() {}, flash() {}, setBounds() {} } },
    time: { now: 1000 },
    physics: { world: { gravity: { y: 0 } } },
    /* efek luar yang tidak relevan bagi tes ini */
    addScore() {}, hurtPlayer() {}
  };
  return sc;
}

/* Muat fungsi-fungsi asli dari index.js ke dalam scene tiruan. */
function loadInto(sc) {
  const shim = `
    var sfx = function(){}, toast = function(){}, fireworks = function(){},
        announceCompleted = function(){}, saveStore = function(){},
        STORE = { maxStage: 0 }, STAGES = [1,2,3,4,5],
        PHYS = { JUMP_VELOCITY: 500 };
    var GameScene = function(){};
    ${setVuln}
    ${attack}
    ${defeat}
    ${blocked}
    return GameScene.prototype;
  `;
  const proto = new Function(shim)();
  Object.keys(proto).forEach(k => { sc[k] = proto[k]; });
  return sc;
}

/* --- Skenario nyata: jendela rentan dibuka, bos mati, callback mendarat --- */
const sc = loadInto(makeScene());
/* Tandai bar HP supaya bisa dibedakan dari 12 kotak cincin indikator,
   yang juga dibuat lewat add.rectangle. */
sc.bossHpBg = sc.add.rectangle(); sc.bossHpBg.kind = 'hpbar';
sc.bossHpFill = sc.add.rectangle(); sc.bossHpFill.kind = 'hpbar';

/* JALUR ASLI, bukan setBossVulnerable() langsung. Ini penting: jendela
   rentan hanya dibuka dari dalam rantai tween bossAttack, dan justru
   rantai itulah yang menjadwalkan callback penutup. Memanggil
   setBossVulnerable(true) langsung tidak menjadwalkan apa pun, sehingga
   tes akan LULUS PALSU tanpa pernah menyentuh bug yang sebenarnya. */
sc.bossAttack(sc.time.now, 3);
let g0 = 0;
while (sc._pending.length && g0++ < 10) {
  const batch = sc._pending.splice(0);
  batch.forEach(fn => fn());
  if (sc.bossVulnerable) break;   /* jendela sudah terbuka: berhenti di sini */
}
ok(sc.bossVulnerable === true && sc.bossLabel && sc.bossLabel.text === 'SERANG!',
   'lewat rantai bossAttack: jendela rentan terbuka, label "SERANG!"');

/* Pemain mendarat di kepala bos: HP habis -> defeatBoss.
   Tepat pada momen ini, callback penutup jendela masih tertunda. */
const pendingBefore = sc._pending.length;
ok(pendingBefore > 0,
   'ada callback tertunda saat bos mati (' + pendingBefore + ') — inilah sumber bug');

sc.defeatBoss();

ok(sc.bossLabel === null, 'tepat sesudah kalah: label dibuang');
ok(sc.bossHpBg == null && sc.bossHpFill == null,
   'tepat sesudah kalah: bar HP dibuang (bukan sekadar disembunyikan)');

/* INI bagian yang dulu gagal: jalankan semua callback yang tertunda,
   persis seperti yang dilakukan Phaser satu detik kemudian. */
sc._pending.splice(0).forEach(fn => { try { fn(); } catch (e) { ok(false, 'callback melempar: ' + e.message); } });
/* callback bisa menjadwalkan callback lagi — habiskan sampai bersih */
let guard = 0;
while (sc._pending.length && guard++ < 20) {
  sc._pending.splice(0).forEach(fn => { try { fn(); } catch (e) { ok(false, 'callback melempar: ' + e.message); } });
}

ok(sc.bossLabel == null,
   'SESUDAH callback tertunda mendarat: label TIDAK lahir kembali ' +
   '(dulu di sini muncul "TAHAN" hantu)');

const ghostTahan = sc._objs.filter(o => o.kind === 'text' && o.text === 'TAHAN' && !o.destroyed);
ok(ghostTahan.length === 0,
   'tidak ada satu pun teks "TAHAN" hidup di layar (' + ghostTahan.length + ')');

/* Hanya BAR HP. Cincin indikator juga memakai add.rectangle (12 kotak),
   jadi menyaring dengan kind==='rect' saja ikut menghitungnya dan gagal palsu. */
const liveBars = sc._objs.filter(o => o.kind === 'hpbar' && !o.destroyed);
ok(liveBars.length === 0,
   'tidak ada bar HP hidup yang tersisa (' + liveBars.length + ')');

/* Cincin indikator pun tidak boleh tertinggal berputar di layar. */
const liveRing = sc._objs.filter(o => o.kind === 'container' && !o.destroyed);
ok(liveRing.length === 0,
   'cincin indikator rentan juga ikut dibuang (' + liveRing.length + ')');

/* --- Peluru terakhir yang mendarat sesudah bos kalah tidak memunculkan puff --- */
const sc2 = loadInto(makeScene());
sc2.bossActive = false;
const before2 = sc2._objs.length;
sc2.showBlockedHit(sc2.boss);
ok(sc2._objs.length === before2,
   'peluru mendarat sesudah bos kalah: tidak ada percikan "TAHAN" baru');

/* --- setBossVulnerable ditolak mentah-mentah saat bos sudah kalah --- */
const sc3 = loadInto(makeScene());
sc3.bossActive = false;
sc3.bossLabel = null;
sc3.setBossVulnerable(false);
ok(sc3.bossLabel == null,
   'setBossVulnerable() sesudah kalah tidak membuat label baru');
sc3.setBossVulnerable(true, 1000);
ok(sc3.bossLabel == null && sc3.bossVulnerable === false,
   'bahkan setBossVulnerable(true) pun tidak menghidupkan apa pun lagi');

/* =====================================================================
   BAGIAN 2 — penjaga sumber, supaya perbaikan tidak terkelupas nanti
   ===================================================================== */
ok(/if \(!this\.bossActive\) return;/.test(setVuln),
   'setBossVulnerable dijaga bossActive');
ok((attack.match(/if \(!self\.bossActive\) return;/g) || []).length >= 3,
   'ketiga callback bersarang di bossAttack dijaga (' +
   (attack.match(/if \(!self\.bossActive\) return;/g) || []).length + ')');
ok(/if \(!this\.bossActive\) return;/.test(blocked),
   'showBlockedHit dijaga bossActive');
ok(/this\.bossActive = false;[\s\S]{0,400}?destroy\(\)/.test(defeat),
   'defeatBoss menyetel bossActive=false SEBELUM membersihkan');
ok(/bossHpBg\.destroy\(\)/.test(defeat) && /bossHpFill\.destroy\(\)/.test(defeat),
   'bar HP DIHAPUS, bukan disembunyikan — supaya tidak bisa dimunculkan lagi');

/* update() menyentuh bar tiap frame; sesudah dihapus itu WAJIB dijaga,
   karena satu throw di update() mematikan step Phaser selamanya. */
ok(/if \(this\.bossHpBg\) this\.bossHpBg\.setPosition/.test(update),
   'updateBoss menjaga bossHpBg (throw di update() mematikan loop selamanya)');
ok(/if \(this\.bossHpFill\) \{/.test(update),
   'updateBoss menjaga bossHpFill');

/* =====================================================================
   BAGIAN 3 — mempelai wanita berdiri di tanah, bukan melayang
   ===================================================================== */
const brideLine = js.slice(js.indexOf("this.bride = this.add.sprite"),
                           js.indexOf("playSlot(this.bride"));

ok(/this\.add\.sprite\(L\.len - 60, GY,/.test(brideLine),
   'mempelai ditaruh di y = GY (permukaan tanah), bukan GY-60 terkaan');
ok(/this\.bride\.setOrigin\(0\.5, 1\)/.test(brideLine),
   'titik acuan = KAKI, sama seperti tiang garis akhir');
ok(!/GY - 60/.test(brideLine) && !/GY - 66/.test(brideLine),
   'tidak ada lagi offset tinggi yang dipatok angka');

/* Tween naik-turun tak berujung = melayang secara sengaja. */
const brideRegion = js.slice(js.indexOf('Mempelai wanita menunggu'),
                             js.indexOf("playSlot(this.bride, 'bride');") + 40);
ok(!/yoyo: true, repeat: -1/.test(brideRegion),
   'tween naik-turun tak berujung dibuang (itulah yang membuatnya melayang)');

/* Aturan umum: obyek yang berdiri di tanah memakai acuan kaki.
   Kalau ada yang balik memakai offset tebakan, tangkap di sini. */
ok(/this\.goal\.setOrigin\(0\.5, 1\)/.test(js),
   'tiang garis akhir tetap memakai acuan kaki (aturan yang sama)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
