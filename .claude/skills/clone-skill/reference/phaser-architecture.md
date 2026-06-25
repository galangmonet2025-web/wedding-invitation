# Arsitektur Phaser 3 (single-file)

> Berbasis `CONTRA-DEVELOPMENT-PHARSER-BIBLE.md` (§268+) + memory `game-phaser-theme`.
> Tema = 1 HTML + 1 CSS + 1 JS, tanpa bundler, aset via CDN/procedural.

## Boot aman (hindari 2 bug blank-canvas)

```js
// 1) pastikan Phaser ada (host CDN-load, tapi sediakan fallback)
function ensurePhaser(cb) {
  if (window.Phaser) return cb();
  if (window.__phaserReady) return window.__phaserReady.then(cb);
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
  s.onload = cb;
  s.onerror = () => showError('Gagal memuat Phaser');
  document.body.appendChild(s);
}

// 2) ukur parent SEBELUM membuat game — JANGAN andalkan this.scale.width di create()
function bootGame() {
  const stage = document.getElementById('gw-stage');
  const r = stage.getBoundingClientRect();
  const W = Math.max(320, Math.round(r.width));
  const H = Math.max(480, Math.round(r.height));   // ukuran TETAP, dipakai untuk menata world
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'gw-stage',
    width: W, height: H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 1000 }, debug: false } },
    scene: [BootScene, GameScene],
  });
  // daftarkan cleanup:
  // disposers.push(() => game.destroy(true));
}

// 3) showError on-screen supaya "Phaser gagal" beda dari "logic bug"
function showError(msg) {
  const el = document.getElementById('gw-stage');
  if (el) el.insertAdjacentHTML('beforeend',
    `<div style="position:absolute;inset:0;display:grid;place-items:center;color:#f66;font:14px monospace;background:#111">${msg}</div>`);
}
```

**Dua bug yang bikin canvas blank (silent, tanpa error):**
1. Nama variabel meng-shadow fungsi boot (mis. `const boot = <element>` lalu memanggil
   `boot`). Beri nama booter berbeda dari variabel elemen.
2. Pakai `Scale.RESIZE` lalu baca `this.scale.width/height` di `create()` saat masih `0` →
   semua objek lahir off-screen. FIX: tata world memakai `W`/`H` tetap dari
   `getBoundingClientRect()` di atas.

## Lapisan (monolithic, tetap rapi)

Walau satu file, pisahkan secara logis (kelas/objek dalam IIFE):
`Player` (extends `Phaser.Physics.Arcade.Sprite`) · `StateMachine` · `Weapon`/aksi inti ·
`EnemyManager` (spawn/pool/AI) · object pools (bullet/particle/enemy) · `Boss`/klimaks ·
config terpusat (jangan hardcode angka tersebar) · data-driven bila bisa.

## Update order (jaga stabil 60fps)

`Input → State → Movement → Aksi/Weapon → Animation → Collision → Camera → UI`

## Performa

- **Pooling wajib** (peluru/musuh/partikel/ledakan) — jangan `new` tiap frame.
- Culling: objek di luar `cameras.main.worldView` → `setActive(false)`/`setVisible(false)`,
  dan jangan biarkan menembak dari off-screen.
- Batas partikel aktif (~100). Target memori mobile < 150MB.

## Aset

- **Default procedural** (`graphics.generateTexture`) — reliabel, tanpa CORS, kohesif.
- Sprite eksternal HANYA dari CDN terbukti CORS-ok; **selalu fallback procedural** bila load
  gagal / frame < ekspektasi. Jangan pernah blank.
- Real art game komersial (Mario/Contra/dll) = berhak cipta. Gunakan gaya pixel-art bikinan
  sendiri yang "terinspirasi", bukan rip.

## Kontrol

- Input abstraction: keyboard (panah/WASD + aksi) DAN touch (joystick analog + tombol)
  menghasilkan model input sama `{left,right,up,down,fire/aksi}`.
- **Ground vs controller (BUG yang sudah dibayar):** tombol sentuh menutupi karakter bila tanah
  terlalu rendah. **Aturan ber-angka:** `GROUND_Y = BH − (isTouch ? 200 : 150)` (zona kontrol
  ±120px → tanah ≥180px dari bawah pada touch; clearance karakter ≥80px). Hitung
  `isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0` saat boot, **sebelum**
  menata world. Detail + diagram: [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §2.

## Kamera (side-scroller — BUG yang sudah dibayar)

- Game maju-ke-kanan → **dorong player ke kiri ~40% layar** agar pandangan depan luas:
  `setFollowOffset(-Math.round(BW*0.40), -70)` + `setDeadzone(20,120)` + `startFollow(p,true,0.14,0.14)`.
  **Jangan** biarkan player di tengah (pandangan depan menyempit); batas ~0.42. Detail + diagram:
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §1.

## Persistensi

- `localStorage` (key versioned, dibungkus `try/catch`): kepingan terbuka, area tertinggi,
  skor terbaik, kesulitan, flag guard perayaan (mis. `announcedAll`/`completed`).
- **Mode cheat: default JANGAN di-persist** (lihat SKILL §6) — reload mengembalikan game ke
  mode jujur. Mem-persist cheat = device selamanya "mode mudah"; pilih sadar bila device
  dipakai banyak tamu.
- Reset = tombol terpisah + overlay konfirmasi (bukan `confirm()` native).
