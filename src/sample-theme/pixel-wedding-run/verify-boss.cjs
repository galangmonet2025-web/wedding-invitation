/* Uji BOS MODEL BARU (ala retromario, tanpa jendela rentan).

   Permintaan user, tiga kali berturut:
     - "karakter boss masih hilang ketika di tembak"
     - "cara nyerangnya masih ga sama dengan retromario"
     - "ga usah ada timing kapan harus nyerang, buat supaya bisa
        di serang terus"

   Jadi yang diuji:
     1. TIDAK ADA jendela rentan — bos bisa dilukai kapan saja, dibatasi
        hanya oleh invulnMs sesudah kena (bukan menunggu aba-aba).
     2. Damage TIDAK memakai tween — kedip lewat penghitung frame, jadi
        alpha/tint tidak mungkin tersangkut dan bos tidak "hilang".
     3. Sesudah invuln habis, bos WAJIB kembali alpha 1 + tanpa tint.
     4. Kalah bersih: tidak ada sisa label/cincin/tween.
     5. Mesin lama benar-benar dibuang (tidak ada setBossVulnerable dll).
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
const NAMES = ['updateBoss', 'hitBoss', 'defeatBoss', 'activateBoss', 'shotHitsBoss'];
const srcs = NAMES.map(bodyOf);
srcs.forEach((s, i) => { if (!s) { console.log('GAGAL badan tak ketemu: ' + NAMES[i]); fail++; } });
if (fail) { console.log('\n' + fail + ' GAGAL'); process.exit(1); }

/* ---------- mock Phaser seperlunya ----------
   Yang WAJIB benar: setTint/clearTint/setAlpha MENCATAT keadaan, supaya
   kita bisa memeriksa bos benar-benar terlihat penuh sesudah invuln. */
function mk(kind) {
  const o = {
    kind, active: true, visible: true, alpha: 1, tint: null, _tintCalls: 0,
    renderFlags: 15,
    x: 100, y: 300, scaleX: 1, scaleY: 1, flipX: false, destroyed: false,
    tex: null, invulnMs: 0, flashMs: 0, baseY: 300, displayHeight: 117,
    body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: false },
            enable: true, setAllowGravity() {}, setSize() {}, setOffset() {},
            setVelocity() {}, reset() {}, stop() {} },
    setActive(v) { o.active = v; return o; },
    setVisible(v) { o.visible = v; return o; },
    setAlpha(v) { o.alpha = v; return o; },
    setTint(v) { o._tintCalls++; o.tint = v; return o; },
    setTintFill(v) { o._tintCalls++; o.tint = v; return o; },
    clearTint() { o.tint = null; return o; },
    setOrigin() { return o; }, setDepth() { return o; }, setScale(v) { o.scaleX = v; return o; },
    setFlipX(v) { o.flipX = v; return o; }, setTexture(k) { o.tex = k; return o; },
    setImmovable() { return o; }, setPosition(x, y) { o.x = x; o.y = y; return o; },
    setText() { return o; }, setColor() { return o; },
    add() { return o; }, stop() { return o; },
    disableBody(h, d) { o.body.enable = false; if (d) o.active = false; if (h) o.visible = false; return o; },
    destroy() { o.destroyed = true; }
  };
  return o;
}

function makeScene(opts) {
  opts = opts || {};
  const tweens = [];
  const sc = {
    _tweens: tweens,
    bossActive: true, bossHp: 12, bossPhase: 1, GY: 400, L: { len: 5600 },
    stageIdx: 5,
    /* Origin bos = KAKI, jadi boss.y = GY (tanah) dan tubuhnya menempati
       pita [GY - bossHeadH .. GY]. */
    bossHeadH: 120,
    bossGateX: 99999,          /* jauh: gerbang tidak mengganggu uji kontak */
    boss: mk('boss'),
    player: { x: 100, y: 300, dying: false,
      body: { velocity: { x: 0, y: opts.pvy === undefined ? 0 : opts.pvy },
              blocked: { down: true }, touching: { down: false } } },
    add: { text: () => mk('text'), rectangle: () => mk('rect'), container: () => mk('container'),
           particles: () => {
             if (opts.particlesThrow) throw new Error('particle boom');
             return { explode() {}, destroy() {}, setDepth() { return this; } };
           } },
    /* t_spark ADA (dibake saat boot) -> jalur partikel di hitBoss benar-benar
       dijalankan, jadi kita menguji jalur nyata, bukan cabang mati. */
    textures: { exists: (k) => k === 't_spark' || !!opts.texturesExist },
    time: { now: 1000, delayedCall() {} },
    tweens: { add: (c) => { tweens.push(c); if (c.onComplete) c.onComplete(); return { stop() {} }; } },
    cameras: { main: { shake() {}, flash() {}, setBounds() {} } },
    physics: { world: { gravity: { y: 0 } }, add: { overlap() {} } },
    addScore() {}, hurtPlayer() { sc._hurt = (sc._hurt || 0) + 1; }
  };
  sc.bossHpBg = mk('hpbg'); sc.bossHpFill = mk('hpfill');
  sc.boss.y = 400; sc.boss.baseY = 400;      /* kaki di GY */
  const proto = new Function(
    'sfx', 'toast', 'fireworks', 'announceCompleted', 'saveStore',
    'STORE', 'STAGES', 'PHYS', 'BOSS_ARENA_W', 'BW', 'BH',
    'BOSS_INVULN_MS', 'BOSS_FLASH_MS',
    'var GameScene = function(){};' + srcs.join('\n') + 'return GameScene.prototype;'
  )(() => {}, () => {}, () => {}, () => {}, () => {},
    { maxStage: 0 }, [1, 2, 3, 4, 5, 6], { JUMP_VELOCITY: 540, GRAVITY_Y: 1000 },
    300, 540, 960,
    /BOSS_INVULN_MS = (\d+)/.test(js) ? +RegExp.$1 : 650,
    /BOSS_FLASH_MS = (\d+)/.test(js) ? +RegExp.$1 : 200);
  Object.keys(proto).forEach(k => { sc[k] = proto[k]; });
  return sc;
}

/* =====================================================================
   1. BISA DISERANG KAPAN SAJA (tanpa jendela rentan)
   ===================================================================== */
console.log('--- bisa diserang kapan saja ---');
const sc = makeScene();
/* Tembak 12x; tapi hormati invuln: majukan waktu di antara tembakan. */
let landed = 0;
for (let i = 0; i < 40 && sc.bossHp > 0; i++) {
  const before = sc.bossHp;
  sc.hitBoss();
  if (sc.bossHp < before) landed++;
  if (!sc.boss) break;              /* kalah -> defeatBoss meng-null-kan bos */
  /* habiskan invuln: dorong penghitung ke nol lewat updateBoss */
  for (let f = 0; f < 60 && sc.boss && sc.boss.invulnMs > 0; f++) sc.updateBoss(1000 + i * 100 + f * 16, 16);
}
ok(landed === 12, 'butuh tepat 12 pukulan untuk menghabiskan HP (' + landed + ')');
ok(sc.bossHp === 0, 'HP habis');

/* =====================================================================
   2. invuln MEMBATASI pukulan beruntun (bukan jendela, tapi cooldown)
   ===================================================================== */
console.log('\n--- invuln antar-hit ---');
const sc2 = makeScene();
sc2.hitBoss();
const hpAfter1 = sc2.bossHp;
sc2.hitBoss();                 /* langsung lagi, tanpa menunggu */
sc2.hitBoss();
ok(sc2.bossHp === hpAfter1,
   'pukulan beruntun tanpa jeda TIDAK menembus HP (invuln aktif) — HP ' +
   sc2.bossHp);
/* sesudah invuln habis, bisa kena lagi */
for (let f = 0; f < 80 && sc2.boss.invulnMs > 0; f++) sc2.updateBoss(2000 + f * 16, 16);
sc2.hitBoss();
ok(sc2.bossHp === hpAfter1 - 1, 'sesudah invuln habis, pukulan berikutnya kena');

/* =====================================================================
   3. BOS TIDAK HILANG — alpha kembali PENUH sesudah kedip
   ===================================================================== */
console.log('\n--- bos tidak pernah tersangkut transparan ---');
const sc3 = makeScene();
sc3.hitBoss();
ok(sc3.boss.flashMs > 0, 'kena -> flashMs menyala');
/* jalankan frame sampai flash & invuln habis */
let t = 3000;
for (let f = 0; f < 120 && (sc3.boss.flashMs > 0 || sc3.boss.invulnMs > 0); f++) {
  sc3.updateBoss(t, 16); t += 16;
}
ok(sc3.boss.alpha === 1,
   'sesudah kedip selesai, alpha KEMBALI 1 (bos terlihat penuh) — inti bug "hilang"');
/* TIDAK BOLEH memakai setTint sama sekali: WEBGL-only, dan di renderer
   CANVAS (yang dipakai host tanpa WebGL) bikin sprite CanvasTexture
   hilang. Inti perbaikan terbaru. */
ok(sc3.boss._tintCalls === 0,
   'updateBoss TIDAK memanggil setTint (tint = WEBGL-only, bikin bos hilang ' +
   'di renderer canvas) — dapat ' + sc3.boss._tintCalls + ' panggilan');

/* Sekalipun ditembak berkali-kali sepanjang banyak frame, alpha tidak
   pernah tinggal < 1 di keadaan tidak-kebal. */
const sc4 = makeScene();
let stuck = 0;
let tt = 5000;
for (let i = 0; i < 200; i++) {
  if (sc4.bossHp <= 0) break;
  if (sc4.boss.invulnMs <= 0 && i % 3 === 0) sc4.hitBoss();
  sc4.updateBoss(tt, 16); tt += 16;
  /* di keadaan TIDAK kebal & TIDAK flash, alpha harus 1 */
  if (sc4.boss.invulnMs <= 0 && sc4.boss.flashMs <= 0 &&
      sc4.boss.active && sc4.boss.alpha < 1) stuck++;
}
ok(stuck === 0,
   'sepanjang pertarungan penuh, alpha tak pernah tinggal < 1 saat normal (' +
   stuck + ' frame nyangkut)');

/* =====================================================================
   3b. JARING PENGAMAN: bos TAK PERNAH "ilang" total, apa pun yang gagal
   ---------------------------------------------------------------------
   Inti keluhan berulang user: "pas di tembak masih hilang". Meski logika
   alpha benar, sesuatu di frame (partikel melempar, texture-swap meleset,
   NaN posisi/skala) bisa membuat bos tak tergambar. updateBoss sekarang
   punya jaring pengaman yang MEMAKSA bos kembali dapat digambar tiap frame.
   ===================================================================== */
console.log('\n--- jaring pengaman: bos tak pernah ilang ---');

/* (a) Partikel di hitBoss MELEMPAR -> tidak boleh menstrand bos. */
const scThrow = makeScene({ particlesThrow: true });
let threw = false;
try { scThrow.hitBoss(); } catch (e) { threw = true; }
ok(!threw, 'kegagalan partikel di hitBoss ditangkap (tidak melempar keluar)');
ok(scThrow.bossHp === 11, 'HP tetap berkurang walau partikel gagal');
scThrow.updateBoss(3000, 16);
ok(scThrow.boss.visible === true && scThrow.boss.alpha > 0,
   'sesudah partikel gagal, updateBoss tetap menjaga bos terlihat');

/* (b) Ada yang menyetel alpha=0 / visible=false / NaN posisi di tengah
   frame -> updateBoss WAJIB memulihkannya di frame berikutnya. */
const scRescue = makeScene();
scRescue.boss.alpha = 0;               /* seolah efek luar menghilangkannya */
scRescue.boss.visible = false;
scRescue.boss.x = NaN; scRescue.boss.y = NaN;
scRescue.boss.scaleX = 0;
scRescue.updateBoss(3200, 16);
ok(scRescue.boss.visible === true, 'visible dipulihkan ke true');
ok(scRescue.boss.alpha > 0, 'alpha 0 dipulihkan (> 0)');
ok(isFinite(scRescue.boss.x) && isFinite(scRescue.boss.y),
   'posisi NaN dipulihkan ke koordinat berhingga');
ok(scRescue.boss.scaleX !== 0 && isFinite(scRescue.boss.scaleX),
   'skala 0/NaN dipulihkan');

/* (c) Bukti jaring pengaman ini ADA di kode updateBoss (bukan cuma di mock). */
const ub2 = bodyOf('updateBoss');
ok(/setVisible\(true\)/.test(ub2),
   'updateBoss memaksa setVisible(true) sebagai jaring pengaman');
ok(/isFinite\(b\.x\)/.test(ub2) || /isFinite\(b\.y\)/.test(ub2),
   'updateBoss menjaga posisi bos tetap berhingga (anti-NaN)');

/* (d) setTexture fase dijaga: hanya swap kalau key ADA. */
const ub3 = bodyOf('updateBoss');
ok(/this\.textures\.exists\(pkey\)/.test(ub3) || /textures\.exists\('t_boss'/.test(ub3),
   'ganti tekstur fase dijaga textures.exists (key hilang -> bos tak dikosongkan)');

/* =====================================================================
   4. KONTAK: injak dari atas melukai; dari samping melukai PEMAIN
   ===================================================================== */
console.log('\n--- kontak: injak vs samping ---');
/* Bos: kaki y=400, headTop = 400-120 = 280. Injak sah kalau pemain
   JATUH dan berada di paruh atas (p.y < 280 + 120*0.45 = 334). */
const scStomp = makeScene({ pvy: 300 });        /* pemain jatuh */
scStomp.player.x = scStomp.boss.x;
scStomp.player.y = 300;                          /* di paruh ATAS bos */
const hpB = scStomp.bossHp;
scStomp.updateBoss(6000, 16);
ok(scStomp.bossHp === hpB - 1, 'injak dari atas (vy>0, dekat kepala) melukai bos');

const scSide = makeScene({ pvy: 0 });            /* pemain tidak jatuh */
scSide.player.x = scSide.boss.x;
scSide.player.y = 385;                           /* paruh BAWAH bos, tidak jatuh */
scSide._hurt = 0;
scSide.updateBoss(6000, 16);
ok(scSide._hurt > 0, 'menyentuh dari samping melukai PEMAIN, bukan bos');
ok(scSide.bossHp === 12, 'bos tidak berkurang dari sentuhan samping');

/* =====================================================================
   5. KALAH BERSIH — tidak ada sisa
   ===================================================================== */
console.log('\n--- kalah bersih ---');
const scK = makeScene();
scK.bossHp = 1;
scK.hitBoss();                                   /* HP habis -> defeatBoss */
ok(scK.bossHp === 0, 'HP habis');
ok(scK.bossActive === false, 'bossActive dimatikan');
ok(scK.bossHpBg == null && scK.bossHpFill == null, 'bar HP dihapus');
/* boss di-destroy oleh tween lenyap (onComplete langsung dijalankan di mock) */
ok(scK.boss == null || scK.boss.destroyed, 'sprite bos akhirnya dihapus');

/* =====================================================================
   5b. TATA LETAK: bos napak tanah, gerbang, bendera jauh
   ===================================================================== */
console.log('\n--- tata letak arena ---');

/* (a) BOS NAPAK TANAH — origin kaki + baseY = GY. */
const build = js.slice(js.indexOf('GameScene.prototype.buildBossArena'),
                        js.indexOf('\n};', js.indexOf('GameScene.prototype.buildBossArena')));
ok(/this\.boss\.setOrigin\(0\.5, 1\)/.test(build),
   'bos memakai acuan KAKI (setOrigin(0.5,1)) — supaya napak tanah');
ok(/this\.boss\.baseY = GY;/.test(build),
   'baseY = GY (kaki di permukaan tanah), bukan GY-120 yang bikin melayang');
/* Cek KODE, bukan komentar: baseY & posisi awal bos tidak boleh lagi
   memakai GY-120. (Komentar boleh menyebutnya sebagai catatan bug lama.) */
const buildCode = build.replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/GY - 120/.test(buildCode),
   'tidak ada lagi offset GY-120 di KODE yang membuat bos menggantung');
ok(/this\.physics\.add\.sprite\(this\.bossHomeX, GY,/.test(buildCode),
   'sprite bos dibuat di y = GY (kaki di tanah)');

/* (b) BENDERA JAUH dari arena bos. */
ok(/bossHomeX = flagX - \d+/.test(build) && /flagX = L\.goalX/.test(build),
   'arena bos ditaruh jauh SEBELUM bendera (flagX - jarak besar)');
const gapM = /bossHomeX = flagX - (\d+)/.exec(build);
ok(gapM && +gapM[1] >= 800,
   'jarak arena->bendera cukup jauh (' + (gapM ? gapM[1] : '?') + 'px)');

/* (c) GERBANG menahan pemain selama bos hidup. */
const ub = bodyOf('updateBoss');
ok(/this\.bossGateX/.test(ub) && /p0\.x > this\.bossGateX/.test(ub),
   'updateBoss menahan pemain di bossGateX selama bos hidup');
/* dibuktikan lewat simulasi: pemain yang mencoba melewati gerbang ditahan */
const scGate = makeScene();
scGate.bossGateX = 500;
scGate.player.x = 800;                           /* mencoba lewat */
scGate.player.body.velocity.x = 200;
scGate.updateBoss(7000, 16);
ok(scGate.player.x === 500,
   'pemain ditahan tepat di gerbang (x=' + scGate.player.x + ')');
ok(scGate.player.body.velocity.x === 0,
   'laju maju pemain dihentikan di gerbang');

/* (d) GERBANG DIBUKA saat bos kalah. */
const scOpen = makeScene();
scOpen.bossGateX = 500;
scOpen.bossHp = 1;
scOpen.hitBoss();                                /* -> defeatBoss */
ok(scOpen.bossGateX == null,
   'defeatBoss membuka gerbang (bossGateX = null) -> pemain boleh maju ke bendera');
const defSrc = bodyOf('defeatBoss');
ok(/setBounds\(0, 0, this\.L\.len, BH\)/.test(defSrc),
   'kamera dilepas ke seluruh level saat bos kalah (bisa jalan ke bendera)');
ok(!/x: this\.player\.x \+ 34/.test(defSrc),
   'mempelai TIDAK diseret ke pemain — pemain yang menghampiri (bos dulu, baru bendera)');

/* =====================================================================
   6. MESIN LAMA BENAR-BENAR DIBUANG
   ===================================================================== */
console.log('\n--- mesin lama dibuang ---');
ok(!/setBossVulnerable/.test(js), 'setBossVulnerable() dihapus');
ok(!/bossAttack/.test(js), 'bossAttack() dihapus');
ok(!/manualBossHit/.test(js), 'manualBossHit() dihapus');
ok(!/showBlockedHit/.test(js), 'showBlockedHit() dihapus');
ok(!/bossVulnerable/.test(js), 'flag bossVulnerable tidak ada lagi');
ok(!/bossNextAttack/.test(js), 'jadwal serang (bossNextAttack) dihapus');
ok(!/this\.bossLabel|this\.bossArrow|_bossRing/.test(js),
   'label SERANG/TAHAN, panah, cincin dihapus');
/* hitBoss tidak boleh lagi memakai tween untuk kedip */
const hitSrc = bodyOf('hitBoss');
ok(!/tweens\.add/.test(hitSrc),
   'hitBoss TIDAK memakai tween (kedip lewat penghitung frame)');
ok(/invulnMs/.test(hitSrc) && /flashMs/.test(hitSrc),
   'hitBoss memakai penghitung invulnMs & flashMs');

/* TINT DIBUANG TOTAL dari SEMUA fungsi bos — WEBGL-only, bikin bos hilang
   di renderer canvas. Diperiksa pada kode (komentar boleh menyebutnya). */
const allBossCode = srcs.join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/\bsetTint\b/.test(allBossCode),
   'tidak ada setTint() di seluruh kode bos');
ok(!/\bsetTintFill\b/.test(allBossCode),
   'tidak ada setTintFill() (juga WEBGL-only)');
ok(!/\bclearTint\b/.test(allBossCode),
   'tidak ada clearTint() (tidak perlu lagi karena tint tak dipakai)');
/* Kedip damage HARUS lewat alpha, dan tiap cabang menyetel alpha eksplisit
   (rekomendasi riset: jangan tinggalkan cabang tanpa normalisasi alpha). */
const ubSrc = bodyOf('updateBoss');
const flashBlock = ubSrc.slice(ubSrc.indexOf('if (b.flashMs > 0)'),
                              ubSrc.indexOf('PATROLI'));
const alphaBranches = (flashBlock.match(/setAlpha\(/g) || []).length;
ok(alphaBranches >= 3,
   'tiap cabang (flash / kebal / normal) menyetel alpha eksplisit (' +
   alphaBranches + ') — tidak ada cabang yang meninggalkan alpha nyangkut');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
