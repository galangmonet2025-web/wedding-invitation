# Technical Foundation — Phaser 3.80.1 (bahan baku APPENDIX T Bible)

> Semua API & nilai konstanta di sini diverifikasi ke dokumentasi resmi + tag git `v3.80.1`.
> Pakai ini saat menulis **APPENDIX T (Technical Foundation)** di Bible yang digenerate.
> Landmine terbesar: **Particle Emitter API ditulis-ulang di 3.60** (§7).

---

## 1. Game config & boot

```js
const config = {
  type: Phaser.AUTO,              // AUTO(coba WebGL→Canvas) | CANVAS | WEBGL | HEADLESS
  width: 540, height: 960,        // ruang koordinat logis (potret mobile)
  parent: 'gw-stage',             // id DOM / HTMLElement
  backgroundColor: '#0b0e1a',
  scene: [BootScene, GameScene],
  physics: { default: 'arcade', arcade: { gravity: { y: 1000 }, debug: false } },
  render: { pixelArt: true, antialias: false, roundPixels: true },
  scale: {
    mode: Phaser.Scale.FIT,       // FIT = muat ke parent, jaga aspect (paling umum)
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 540, height: 960,
  },
};
const game = new Phaser.Game(config);
```

**Scale mode** (nilai dari `SCALE_MODE_CONST.js`): `NONE`(0), `WIDTH_CONTROLS_HEIGHT`(1),
`HEIGHT_CONTROLS_WIDTH`(2), **`FIT`(3)** muat-dalam jaga-aspect (letterbox), `ENVELOP`(4)
cover-parent (tepi terpotong), `RESIZE`(5) isi-parent abaikan-aspect (**ukuran world ikut
berubah → kamu yang reposition**, paling sering disalahgunakan), `EXPAND`(6) baru di 3.80.

**`autoCenter`**: `NO_CENTER`(0), `CENTER_BOTH`(1), `CENTER_HORIZONTALLY`(2), `CENTER_VERTICALLY`(3).

> **⚠️ Trap "ukuran 0 saat init".** Kalau `parent` belum punya dimensi terukur saat
> `new Phaser.Game()` (display:none, belum di DOM, flex 0-height) → FIT/RESIZE hitung `0×0` →
> canvas collapse. **Fix:** pastikan parent sudah ter-attach & ber-CSS-size sebelum konstruksi;
> ukur via `getBoundingClientRect()` & pass width/height tetap; atau panggil
> `game.scale.refresh()` setelah punya dimensi nyata. **Sangat relevan** karena tema disuntik
> ke container host yang bisa ber-size setelah mount. JANGAN andalkan `this.scale.width` di
> `create()`.

---

## 2. Scene lifecycle & manajemen

Urutan per start scene: `init(data)` → `preload()` (skip kalau tak ada load) → `create(data)`
→ `update(time, delta)` (tiap step; pakai `delta` ms agar gerak frame-rate-independent).

Transisi (semua **queued** — efektif di awal step berikutnya):
- `scene.start(key, data)` — stop pemanggil, start target fresh.
- `scene.launch(key, data)` — start target **paralel**, pemanggil tetap jalan (HUD/overlay).
- `scene.switch(key)` — **sleep** pemanggil, start/wake target (toggle murah).
- `scene.run/pause/resume/sleep/wake/stop`.

Data antar scene: `this.scene.start('Game', {level:3})` → diterima di `init` & `create`. Antar
scene aktif: event (`this.scene.get('UI').events.emit(...)`) atau `this.registry.set/get(...)`.

---

## 3. Arcade Physics — platformer movement

```js
const JUMP_VELOCITY = -420, COYOTE_MS = 100, JUMP_CUT = 0.5;
update(time, delta) {
  const body = this.player.body;
  const onGround = body.blocked.down;            // === body.onFloor()
  if (onGround) this.coyote = COYOTE_MS;
  else          this.coyote = Math.max(0, this.coyote - delta);
  if (Phaser.Input.Keyboard.JustDown(this.jumpKey) && this.coyote > 0) {
    body.setVelocityY(JUMP_VELOCITY); this.coyote = 0;   // consume → no double jump
  }
  if (Phaser.Input.Keyboard.JustUp(this.jumpKey) && body.velocity.y < 0) {
    body.setVelocityY(body.velocity.y * JUMP_CUT);        // variable jump height
  }
}
```

- **Gravity:** world `arcade.gravity.y`; per-body `body.setGravity()` (di-ADD ke world);
  matikan `body.setAllowGravity(false)`.
- **Collider vs overlap:** `physics.add.collider(a,b,cb,processCb)` deteksi **+ separasi**
  (lantai/dinding). `physics.add.overlap(...)` deteksi saja, **tanpa separasi** (pickup/trigger).
  Process-callback (arg ke-4) jalan duluan; return `false` buang pasangan (one-way platform).
- **Static vs dynamic group:** `physics.add.staticGroup()` immovable & murah (platform); kalau
  pindahkan static body panggil `group.refresh()`. `physics.add.group()` dynamic penuh.
- **Flag separasi:** `body.touching{up,down,left,right}` = kontak dgn **dynamic body** lain;
  `body.blocked{...}` = kontak dgn **world-bounds / static / tilemap**; `onFloor()`⇔`blocked.down`.
  **Aturan:** berdiri di platform static → `blocked.down`; berdiri di sprite bergerak →
  `touching.down`. `body.wasTouching` = frame sebelumnya (deteksi momen tumbukan).
- Pakai `JustDown/JustUp` (edge event), **bukan** `isDown`, agar lompat sekali per tekan.

---

## 4. Object pooling & Groups

```js
class Bullet extends Phaser.GameObjects.Sprite {
  constructor(scene){ super(scene,0,0,'bullet'); }
  fire(x,y){ this.setActive(true).setVisible(true).setPosition(x,y); }
  update(){ this.y -= 8; if (this.y < 0) this.scene.bullets.killAndHide(this); }
}
this.bullets = this.add.group({ classType: Bullet, maxSize: 30, runChildUpdate: true });
const b = this.bullets.get(); if (b) b.fire(player.x, player.y);   // SELALU null-check
```

- Config: `classType`, `maxSize` (set cap nyata, jangan -1), `runChildUpdate` (panggil
  `update()` tiap member aktif).
- `get()` ambil member **inactive**; **return `null` saat maxSize penuh** → null-check.
  `killAndHide(child)` = `setActive(false).setVisible(false)` (kembalikan ke pool).
- Untuk arcade body pakai `physics.add.group(...)` & reset `body.enable`/velocity saat reuse.
- Kenapa: `new`/`destroy` tiap frame → GC pause (frame hitch) + realokasi WebGL.

---

## 5. Procedural texture (krusial — tanpa asset eksternal, bebas CORS)

```js
const g = this.make.graphics({ x:0, y:0 }, false);     // off display-list (untuk baking)
g.fillStyle(0xff3344, 1); g.fillRect(0,0,16,16);
g.lineStyle(2, 0xffffff, 1); g.strokeRect(0,0,16,16);
g.generateTexture('player', 16, 16);                   // bake → texture cache
g.destroy();                                           // texture tetap ada di cache
this.add.sprite(100,100,'player');
```

> **⚠️ Bug #1: key bentrok saat scene restart.** `create()` jalan lagi → regenerate. Guard:
> `if (!this.textures.exists('player')) { …generate… }` atau `this.textures.remove('player')`
> dulu. Jangan bake grafik yang sering berubah (bocor GPU texture) — pakai Graphics live.

**Shading WAJIB (jangan flat single-color — terlihat "testing").** Tiap bentuk = base +
highlight (top ~22%) + shadow (bottom ~22%) + outline gelap. Pakai helper konsisten:
```js
function box(g,x,y,w,h,base,hi,sh){
  g.fillStyle(base,1); g.fillRect(x,y,w,h);
  if(hi!=null){ g.fillStyle(hi,1); g.fillRect(x,y,w,Math.max(1,h*0.22|0)); }            // highlight
  if(sh!=null){ g.fillStyle(sh,1); g.fillRect(x,y+h-(h*0.22|0),w,Math.max(1,h*0.22|0)); } // shadow
}
function outline(g,x,y,w,h){ g.lineStyle(2,0x10140d,1); g.strokeRect(x,y,w,h); }
```
Tambah detail pembeda (mata, helm, roda-gigi, weak-point bersinar) → **siluet unik per entity**.
Detail + props scenery (palem/sandbag/barel/gunung/awan) & backdrop parallax:
[`layout-camera-hardwon.md`](layout-camera-hardwon.md) §6–§7.

---

## 6. Input

- **Keyboard:** `this.input.keyboard.createCursorKeys()` → `{up,down,left,right,space,shift}`;
  `addKey('W')`, `addKeys('W,A,S,D')`. **`Phaser.Input.Keyboard.JustDown(key)/JustUp(key)`**
  static & stateful (true sekali per tekan; panggil ≤1×/frame/key).
- **Pointer/touch:** `this.input.on('pointerdown', p=>…)`; per-objek butuh
  `obj.setInteractive().on('pointerdown', …)`. `this.input.activePointer` adaptif mouse/touch.
- **Virtual joystick (mobile):** plugin rexVirtualJoystick (pin versi via CDN). `createCursorKeys()`
  joystick mengembalikan bentuk `{up,down,left,right}` yang sama → OR langsung dengan keyboard.
- **Input abstraction:** map keyboard+touch ke satu model `{left,right,up,down,fire}`.

---

## 7. Animation, tween, camera juice, PARTICLES (API baru 3.60+)

```js
// Spritesheet & anim (anims global — buat sekali, sprite play by key)
this.anims.create({ key:'run',
  frames: this.anims.generateFrameNumbers('dude', { start:0, end:3 }), frameRate:10, repeat:-1 });
sprite.play('run', true);                    // arg2 = ignoreIfPlaying
// guard: if (!this.anims.exists('run')) {…}  // re-create dgn key sama = warn+no-op

// Tween
this.tweens.add({ targets: sprite, x:400, duration:600, ease:'Power2', yoyo:true });

// Camera juice — intensity SHAKE adalah float kecil (~0.01–0.05), BUKAN piksel
this.cameras.main.shake(120, 0.02);
this.cameras.main.flash(80, 255, 240, 180);
```

> **⚠️ PARTICLES — `ParticleEmitterManager` DIHAPUS di 3.60. `createEmitter()` TIDAK ADA lagi
> (akan throw di 3.80.1).** Pakai API baru:
> ```js
> // ✅ 3.80.1: add.particles(x,y,key,config) → MENGEMBALIKAN ParticleEmitter (objek display)
> const em = this.add.particles(0, 0, 'spark', {
>   speed:{min:-200,max:200}, scale:{start:0.6,end:0}, lifespan:600,
>   blendMode:'ADD', emitting:false });         // emitting:false → explode-only
> em.explode(16, x, y);                          // burst
> // em.destroy() saat shutdown atau bocor.
> // ❌ JANGAN: this.add.particles('spark').createEmitter({...})  → throw
> ```

---

## 8. Tilemap

```js
const level = [[0,0,0,0],[0,-1,-1,0],[0,0,0,0]];          // -1 = kosong
const map = this.make.tilemap({ data: level, tileWidth:16, tileHeight:16 });
const tileset = map.addTilesetImage('tiles');             // key texture
const layer = map.createLayer(0, tileset, 0, 0);
layer.setCollisionBetween(0, 0);                          // atau setCollisionByProperty (perlu Tiled)
this.physics.add.collider(player, layer);                 // SETELAH layer & flag ada
```

Tilemap layer auto-cull off-camera; static-group (1 body/tile) berat di skala besar. **Aturan:**
banyak tile → tilemap; sedikit solid kaya-logika → static group.

---

## 9. Performance (target 60fps mobile)

- **Culling:** tilemap auto-cull; **sprite biasa TIDAK** → matikan manual off-screen.
- `setActive(false)` keluar dari update; `setVisible(false)` skip render (pakai ini, bukan
  `setAlpha(0)`). Objek pool/mati: set **keduanya**.
- Partikel: cap `quantity`/`frequency`/`maxAliveParticles`, `lifespan` pendek, prefer
  `explode()` ketimbang flow tinggi, reuse 1 emitter. Live particle ratusan rendah di mobile.
- `render:{ pixelArt:true, antialias:false, roundPixels:true }`. Texture atlas → batch draw call.
- **Leak saat restart:** stop tween infinite & `time.addEvent` loop di `shutdown`; `destroy()`
  emitter; `this.events.off(...)`; guard `anims.exists`; prefer pooling.

---

## 10. Cleanup & destroy (KRITIKAL — script di-re-inject host berkali-kali)

`game.destroy(removeCanvas, noReturn)`:
- `removeCanvas: true` → buang `<canvas>` dari DOM, kembalikan ke pool — **cegah canvas
  bertumpuk & WebGL context bocor** (browser cap ~16 context). **Pakai `game.destroy(true)`.**
- `destroy()` **async**: hanya set `pendingDestroy`; jalan di awal frame berikut. Jadi
  `destroy()` + `new Phaser.Game()` di tick sama = game lama hidup 1 frame → sequence via
  `game.events.once('destroy', boot)` bila harus boot sinkron.

Scene `SHUTDOWN` (stop/sleep/restart) vs `DESTROY` (permanen). `this.events` auto-clear, TAPI
listener di `this.input`, `window`, `game.events` **tidak** → lepas sendiri (pakai `once`).

**Pola boot+teardown idempotent untuk tema single-file yang di-re-inject:**
```js
(function () {
  if (typeof window.__gwCleanup === 'function') { try { window.__gwCleanup(); } catch(e){} }
  var offs = [];
  function addGlobal(t,type,fn,opt){ t.addEventListener(type,fn,opt); offs.push(()=>t.removeEventListener(type,fn,opt)); }

  class MainScene extends Phaser.Scene {
    create(){
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.time.removeAllEvents(); this.tweens.killAll();
        this.input.keyboard.removeAllKeys(true);
      });
      addGlobal(window, 'resize', () => {/* … */});
    }
  }
  var game = new Phaser.Game({ type:Phaser.AUTO, parent:'gw-stage', scene:[MainScene] });
  window.__gwGame = game;
  window.__gwCleanup = function () {
    offs.forEach(off => { try{off();}catch(e){} }); offs.length = 0;
    if (window.__gwGame) window.__gwGame.destroy(true);   // async, next frame
    window.__gwGame = null; window.__gwCleanup = null;
  };
})();
```
> Sambungkan `__gwCleanup` ke kontrak host (ThemeWrapper memanggil cleanup tema saat re-eksekusi
> — lihat [`host-contract.md`](host-contract.md)). teardown-sebelum-boot menjamin **satu** game,
> **satu** RAF, **satu** canvas.

---

## Callout "gotchas" (taruh sebagai kotak peringatan di Bible)

1. Particle 3.80.1 = `this.add.particles(x,y,key,cfg)` → `ParticleEmitter`; `createEmitter()` **throw**.
2. `camera.shake` intensity = float kecil (~0.02), **bukan piksel**.
3. Tilemap auto-cull; sprite biasa tidak.
4. `game.destroy(true)` wajib untuk re-inject (else canvas/WebGL numpuk). `destroy()` async.
5. `onFloor()` ⇔ `blocked.down`; lompat pakai `JustDown/JustUp`.
6. Procedural texture bentrok saat restart → guard `textures.exists(key)`.
7. "Ukuran 0 saat init" saat container host belum ter-size.
