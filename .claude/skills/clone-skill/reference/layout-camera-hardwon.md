# Layout, Kamera, Kontrol, Grafis & Boss — aturan TERUKUR yang sudah dibayar (jangan diulang)

> Bahan baku untuk **§7 (Layout)**, **§9 (Camera)**, **§10 (Juice/Grafis)**, **APPENDIX S/T
> (boot/ground/tekstur)**, **APPENDIX D (Boss)** & **APPENDIX Z (HUD/host)** di Bible yang
> digenerate. Semua aturan di bawah lahir dari **bug nyata pada tema `metalslug-wedding`**
> (side-scroller Phaser, dua putaran perbaikan). Bible **wajib** menuangkan semuanya sebagai rules
> **ber-angka + diagram ASCII + contoh kode Phaser 3.80.1**, bukan kalimat normatif. Tiap aturan
> punya "BUG yang dicegah".
>
> **Daftar aturan:** §1 Kamera · §2 Ground vs controller · §3 HUD map · §4 Layout PC ·
> §5 Boss walk-in · §6 Grafis prosedural (shading) · §7 Backdrop per-biome parallax ·
> §8 Stage-select + difficulty sekaligus · §9 Panel info PC = pure undangan + canvas couple ·
> §10 Toast/notifikasi (atas-tengah) · §11 Boss HP bar + bisa kalah · §12 Animasi per-state ·
> §13 Level design kaya (elevation/cover/pijakan/musuh) · §14 Dialog pilih pakai tombol OK ·
> §15 Riset UX & environment per-stage · §16 Boss hit manual + aim-ke-player · §17 Undangan ramah
> (tanpa nyawa, respawn aman) · §18 Crouch resize on-state-change (anti-judder) · §19 Animasi
> frame-by-frame procedural · §20 Semua UI terasa game (no link telanjang) · §21 Reset penuh
> (storage+stage+ulangi pilih kesulitan) · §22 Peluru vs musuh di atas balok (anti-tembus +
> sweep anti-tunnel) · §23 Spawn musuh relatif-kamera (musuh off-screen tak bisa kena tembak).

---

## 1. KAMERA side-scroller — dorong player ke KIRI, jangan ke tengah

**BUG yang dicegah:** `startFollow` default menaruh player di **tengah** layar → pandangan ke
depan (arah musuh datang) cuma ~50% layar → terasa sempit & pemain kaget oleh musuh yang muncul
mendadak.

**Aturan ber-angka (Phaser 3.80.1):**
- **Follow offset** geser player ke **kiri ~34–40% lebar layar** untuk game yang **selalu maju ke
  kanan**: `cameras.main.setFollowOffset(-Math.round(BW * 0.40), -70)` + `setDeadzone(20, 120)`.
  (Tanda **negatif** = konten bergeser sehingga player tampak lebih ke kiri.) **Nilai yang sudah
  diuji bertahap:** 0.22 → masih sempit; 0.34 → lebih baik; **0.40 → nyaman** (target). **Batas atas
  ~0.42** — lebih dari itu player terlalu mepet tepi kiri & musuh dari belakang/kiri tak terlihat.
  Untuk game dua-arah, pakai offset **dinamis** mengikuti `facing` (lerp ±0.35·BW).
- **Deadzone kecil & responsif:** `setDeadzone(40, 120)` (BUKAN 120×200 yang lembam). Lebar
  deadzone besar bikin kamera telat mengikuti → pandangan depan menyempit lagi.
- **Lerp** 0.1–0.15: `startFollow(player, true, 0.14, 0.14)`.
- **Lookahead** sudah otomatis lewat offset; pastikan **pendaratan tiap lompatan terlihat saat
  takeoff** (no blind jump).

```js
this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
this.cameras.main.setDeadzone(20, 120);
this.cameras.main.setFollowOffset(-Math.round(BW * 0.40), -70);  // player → kiri ⅖, depan luas
```

```
  Layar (side-scroll maju ke kanan):
  ┌───────────────────────────────────────┐
  │           │                           │
  │   [P]→    │   ← ~60% layar = pandangan │   ✅ BENAR (offset -40%·BW)
  │           │      ke DEPAN (musuh datang)│
  └───────────────────────────────────────┘
       40%

  ┌───────────────────────────────────────┐
  │              │            │            │
  │         [P]→ │  cuma 50%  │            │   ❌ SALAH (player di tengah,
  │              │   ke depan │            │       pandangan depan sempit)
  └───────────────────────────────────────┘
```

> **Golden Rule kamera:** game maju-ke-kanan → player di **kiri ~⅖ layar** (offset -0.40·BW, batas
> ~0.42) via `setFollowOffset` negatif + deadzone kecil. Jangan biarkan player di tengah.

---

## 2. GROUND (permukaan tanah) harus DI ATAS zona kontrol sentuh

**BUG yang dicegah:** tanah ditaruh terlalu rendah (mis. `BH − 90`) → karakter berdiri **di balik
tombol FIRE/JMP/joystick** di perangkat sentuh → pemain tak bisa melihat/menggerakkan karakter.

**Aturan ber-angka:**
- Zona kontrol sentuh tingginya **±120px** (joystick + tombol aksi) + margin. Maka **garis tanah
  WAJIB ≥ 180px dari bawah** pada perangkat sentuh:
  - Touch: `GROUND_Y = BH − 200`.
  - Desktop (keyboard, kontrol disembunyikan): `GROUND_Y = BH − 150` (konsisten).
- Deteksi sekali saat boot, **sebelum** menata world:
```js
var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
CONFIG.GROUND_Y = BH - (isTouch ? 200 : 150);
```
- Karakter tinggi ~38px → kaki di `GROUND_Y`, kepala di `GROUND_Y − 38`. Dengan `BH − 200`,
  clearance ke atas zona kontrol ≥ **80px** (cukup melihat karakter penuh + lompatannya).

```
  Frame mobile (BH tinggi):
  ┌─────────────────────────┐  y=0
  │ HUD                     │
  │                         │
  │        (langit)         │
  │   [karakter]            │  ← kaki di GROUND_Y = BH-200
  │ ════════ tanah ═════════│  y = BH-200
  │  ↑ clearance ≥80px      │
  │ [joy]      [FIRE][JMP]  │  ← zona kontrol ±120px
  └─────────────────────────┘  y=BH
```

> **Golden Rule ground:** di perangkat sentuh, **naikkan tanah ≥180px dari bawah** (pakai
> `BH − 200`). Hitung `isTouch` saat boot. Karakter tak boleh pernah berada di belakang controller.

---

## 3. POSISI ICON-BUTTON & CONTROLLER (HUD map yang sudah terbukti)

**BUG yang dicegah:** menaruh tombol aksi (★/▦/💌/musik/reset) di **kanan-atas** & indikator
kepingan di **kiri-bawah** terasa terbalik & menabrak kontrol. Konvensi yang enak:

**Aturan posisi (mobile frame, koordinat dari tepi):**

| Elemen | Posisi | Catatan |
|---|---|---|
| **HUD baris atas** | atas penuh (nyawa kiri · skor tengah · sektor kanan) | dilihat, **tak di-tap** |
| **Weapon chip** | atas-kiri `top:42 left:10` | info kecil |
| **Progress kepingan** `n/N 💌` | atas-kanan `top:42 right:10` | info kecil |
| **Kolom ICON-BUTTON** (★ cheat, ▦ stage-select, 💌 buka-undangan, 🎵 musik, ⟲ reset) | **KIRI-ATAS** `top:72 left:8`, kolom vertikal | sering ditekan-saat-jeda |
| **Indikator kepingan** (N ikon dinamis) | **KANAN-ATAS** `top:72 right:8`, wrap rata-kanan, `max-width:130px` | menyala saat unlock |
| **Joystick** | **KIRI-BAWAH** (green zone) | jempol kiri |
| **FIRE (besar) + JMP + GRENADE** | **KANAN-BAWAH** (green zone) | jempol kanan |

```
  ┌───────────────────────────────────────────┐
  │ ♥×3        SCORE 000200      SEKTOR 1 [N]  │  ← HUD (atas)
  │ [Wpn]                            3/11 💌   │  ← weapon kiri · progress kanan
  │ ┌───┐                              ┌─┬─┬─┐ │
  │ │ ★ │  ← ICON-BUTTON (kiri-atas)   │💌│♥│✓│ │  ← indikator kepingan
  │ │ ▦ │                              └─┴─┴─┘ │     (kanan-atas)
  │ │💌 │                                      │
  │ │🎵 │                                      │
  │ │ ⟲ │                                      │
  │ └───┘            (area main)               │
  │                                            │
  │         [karakter di atas tanah]           │
  │ ══════════════ tanah ══════════════════════│
  │  ╭───╮                          ┌────┐ ┌──┐│
  │  │joy│  ← KIRI-BAWAH      KANAN→ │FIRE│ │JM││  ← kontrol sentuh
  │  ╰───╯                          └────┘ │P ││     (green zone bawah)
  │                                  ✦nade └──┘│
  └───────────────────────────────────────────┘
```

**Aturan ukuran sentuh (sudah ada di game-feel-and-level-design.md §9, tegakkan):** target
**≥44×44 CSS px**, spacing **≥8px**, hormati `env(safe-area-inset-*)`. FIRE paling besar (~82px).

> **Golden Rule HUD:** ICON-BUTTON **kiri-atas**, indikator kepingan **kanan-atas**, joystick
> **kiri-bawah**, FIRE/JMP **kanan-bawah**. HUD info (skor/nyawa/progress) di atas — dilihat, tak
> di-tap. Jangan menaruh tombol aksi menutupi kontrol/karakter.

---

## 4. LAYOUT DESKTOP 2-KOLOM — frame game MENTOK KIRI, info wedding mengisi KANAN

**BUG yang dicegah:** shell `justify-content: center` membuat frame game **mengambang di tengah**
dengan ruang kosong kiri-kanan → boros & tak rapi. Yang diminati: frame **mentok ke satu sisi**,
sisi lain **diisi informasi wedding** (bukan sekadar dekorasi).

**Arah OTORITATIF (revisi — ikuti ini untuk tema baru):**
**frame game = KIRI (dipatok, lebar tetap) · panel info wedding = KANAN (mengisi sisa).**

> Catatan sejarah: versi awal SKILL menulis "cover kiri / frame kanan". **Yang benar sekarang:
> FRAME KIRI / INFO KANAN.** Yang **mutlak** tetap: **TEPAT 2 kolom**, **satu area interaktif
> saja**, dan **tidak ada 3 kolom / dekorasi identik di dua sisi**. (Bila ada brief khusus minta
> frame di kanan, boleh dibalik — tapi default baru = frame kiri.)

**Aturan ber-angka (CSS):**
```css
/* mobile: satu frame saja, center */
.gw-shell { display:flex; justify-content:center; align-items:stretch; }
.gw-cover-side { display:none; }            /* panel info disembunyikan di mobile */

@media (min-width: 980px) {                  /* satu breakpoint, konsisten */
  .gw-shell { justify-content:flex-start; } /* mentok kiri, JANGAN center */
  .gw-frame {
    order:1; flex:0 0 auto;                  /* frame render pertama → pojok kiri */
    width:480px; max-width:480px;            /* lebar TETAP */
    height:100vh; max-height:100vh; aspect-ratio:auto; border-radius:0;
  }
  .gw-cover-side {
    display:block; order:2; flex:1;          /* mengisi SISA lebar di kanan */
    min-width:320px; overflow-y:auto; padding:40px 48px;
  }
  .gw-cover-side .inner { max-width:440px; margin:0 auto; }  /* konten jangan melar */
}
@media (hover:hover) and (pointer:fine) and (min-width:980px) {
  .gw-touch { opacity:0; pointer-events:none; }  /* desktop pakai keyboard */
}
```

**Isi panel KANAN: PURE undangan — TANPA tombol game (PRESS START/pilih-level/kontrol-keyboard
ada di cover overlay DALAM frame, bukan di panel ini).** Lihat **§9** untuk isi lengkap (canvas
couple + info akad/resepsi + map). `#btn-show-qr` boleh tetap di dalam frame game (aksi undangan),
bukan di panel kanan.

```
  DESKTOP (≥980px):
  ┌──────────────┬────────────────────────────────┐
  │ FRAME GAME   │ PANEL INFO WEDDING (kanan, PURE)│
  │ (kiri, 480px,│ • canvas couple (jas + gaun)    │
  │  dipatok)    │ • nama mempelai + tanggal       │
  │  = game +    │ • Jadwal Akad / Resepsi + MAP   │
  │  undangan    │ • 💌 BUKA UNDANGAN LENGKAP       │
  │  scroll      │ (NO tombol game; mengisi sisa    │
  │  (satu-satu- │  lebar, konten center max 440px)│
  │  nya inter-  │                                 │
  │  aktif)      │                                 │
  └──────────────┴────────────────────────────────┘
   ✅ frame mentok kiri · info PURE undangan kanan · TEPAT 2 kolom
```

> **Golden Rule layout PC:** `justify-content:flex-start` + frame `order:1 flex:0 0 auto width:480px`
> (mentok kiri) + panel info `order:2 flex:1` (mengisi kanan, **pure undangan + canvas couple**,
> lihat §9). **Bukan** center, **bukan** 3 kolom, **bukan** tombol game di kanan. Di mobile hanya
> frame tampil.

---

## 5. BOSS arena WAJIB punya WALK-IN — jangan lock kamera + spawn boss seketika

**BUG yang dicegah:** stage boss langsung menampilkan boss **tanpa karakter pemain terlihat**.
Penyebab: saat membangun arena boss, kode langsung `cameras.main.setBounds(len-BW, 0, BW, BH)`
(kunci kamera ke sisi kanan) **dan** men-spawn boss aktif — padahal player di-spawn di kiri
(`x≈120`) → player off-screen, boss muncul seketika tanpa konteks.

**Aturan ber-angka:**
- Boss sektor **tetap punya koridor walk-in** (panjang ≥ `BW`, mis. world boss `len≈3000`). Player
  spawn di kiri seperti sektor biasa; kamera **mengikuti normal** dulu.
- Boss dibuat **INACTIVE** (`setActive(false).setAlpha(0)`) + simpan `arenaX = len − 0.9·BW`.
- Di `update`, **saat `player.x >= arenaX`** → `activateBoss()`: fade-in boss, **baru** kunci
  kamera `setBounds(len−BW,0,BW,BH)`, pasang dinding kiri arena, flash + SFX.
- Reset `arenaX=null; bossActive=false` di awal tiap `buildSector` (jangan bocor ke sektor biasa).
- Beri 2–3 musuh penjaga di koridor agar approach tak kosong.

```js
// buildBossArena: boss inactive, simpan arenaX
this.arenaX = len - Math.round(BW * 0.9);
this.boss.setActive(false).setAlpha(0);
// update(): trigger saat player masuk arena
if (this.boss && !this.bossActive && this.player.x >= this.arenaX) this.activateBoss();
// activateBoss(): fade-in + lock camera SEKARANG (bukan saat build)
this.bossActive = true; this.tweens.add({targets:this.boss, alpha:1, duration:400});
this.cameras.main.setBounds(len - BW, 0, BW, BH);
```

> **Golden Rule boss:** boss sektor = **walk-in dulu, baru fight**. Kamera dikunci & boss
> di-aktifkan **saat player mencapai `arenaX`**, BUKAN saat arena dibangun. Reset flag tiap sektor.

---

## 6. GRAFIS prosedural harus DI-SHADE + ada OUTLINE — jangan flat/miskin

**BUG yang dicegah:** sprite `fillRect` satu-warna terlihat "basic/testing", bukan game jadi.

**Aturan ber-angka (tiap sprite `generateTexture`):**
- Pakai **3 tone per bentuk**: base + **highlight** (top ~22% tinggi, lebih terang) + **shadow**
  (bottom ~22%, lebih gelap) + **outline gelap** (`lineStyle(2, 0x10140d)`). Buat helper
  `box(g,x,y,w,h,base,hi,sh)` + `outline(g,...)` agar konsisten.
- Tambah **detail pembeda**: mata, helm/topi, roda-gigi tank, weak-point boss bersinar
  (`fillCircle` kuning + inti putih), dll. Siluet tiap entity **unik & terbaca** (Bible §1.4).
- Default **procedural** (bebas CORS). Sprite eksternal opsional dari CDN CORS-ok + **fallback
  procedural** — jangan pernah blank.

```js
function box(g,x,y,w,h,base,hi,sh){
  g.fillStyle(base,1); g.fillRect(x,y,w,h);
  if(hi!=null){ g.fillStyle(hi,1); g.fillRect(x,y,w,Math.max(1,h*0.22|0)); }
  if(sh!=null){ g.fillStyle(sh,1); g.fillRect(x,y+h-(h*0.22|0),w,Math.max(1,h*0.22|0)); }
}
function outline(g,x,y,w,h){ g.lineStyle(2,0x10140d,1); g.strokeRect(x,y,w,h); }
```

> **Golden Rule grafis:** tiap sprite = base + highlight + shadow + outline (3 tone + garis).
> Flat single-color = belum selesai. Siluet harus unik per entity.

---

## 7. BACKDROP per-biome + 3 lapis PARALLAX + props — dunia jangan kosong

**BUG yang dicegah:** area main hitam/kosong; semua sektor terlihat sama.

**Aturan ber-angka:**
- **Sky gradient per sektor** (palet berbeda: pagi/senja/gurun/pangkalan/pelaminan) via
  `graphics.fillGradientStyle(top,top,bot,bot,1).fillRect(0,0,BW,BH).setScrollFactor(0)`.
- **≥3 lapis parallax** dengan `scrollFactor` berbeda: jauh `0.2–0.25` (gunung), medium `0.45`
  (bukit), dekat `0.7` (vegetasi/props). Tiling sepanjang `worldW` (loop `for` step 220–300px).
- **Props bertema biome**: palem/semak (jungle), sandbag/barel/bendera (pangkalan), dll —
  `setOrigin(0.5,1).setDepth(-20)` di belakang gameplay; + dekorasi foreground di tanah
  (`depth -2`).
- **Rebuild backdrop per sektor** (depend `worldW` + biome); simpan di `bgGroup` & `clear` tiap
  ganti sektor. Awan `setScrollFactor(0.1)`.

> **Golden Rule backdrop:** tiap sektor = sky palet sendiri + ≥3 lapis parallax + props biome.
> Rebuild per sektor, `clear` group lama. Jangan ada layar kosong/hitam.

---

## 8. STAGE-SELECT sekaligus pilih KESULITAN

**BUG yang dicegah:** overlay stage-select hanya pilih sektor; pemain tak bisa set kesulitan di
situ (harus balik ke cover) — seperti retromario yang menggabung keduanya.

**Aturan:** overlay stage-select memuat **baris tombol kesulitan (EASY/NORMAL/HARD)** di atas grid
sektor. Pakai **class yang sama** dengan picker kesulitan di cover (mis. `.diff-opt`) supaya satu
handler `pickDiff()` meng-update `STORE.diff` untuk semuanya; saat sektor dipilih, `startRun(idx)`
otomatis pakai `STORE.diff` terbaru. Keduanya ter-apply sekaligus.

> **Golden Rule stage-select:** satu overlay = pilih **sektor + kesulitan** sekaligus (pola
> retromario). Difficulty pakai class/handler yang sama dengan cover → konsisten.

---

## 9. PANEL INFO PC = PURE undangan + CANVAS COUPLE bertema game (no game buttons)

**BUG yang dicegah:** panel kanan desktop berisi tombol game (PRESS START/pilih-level/kontrol) →
membingungkan; user mau panel kanan **murni undangan** yang cantik & bertema game.

**Aturan:**
- **TIDAK ada tombol game** di panel kanan. PRESS START / pilih-kesulitan / petunjuk kontrol →
  pindah ke **cover overlay DALAM frame game**. Panel kanan hanya boleh: **💌 BUKA UNDANGAN
  LENGKAP** (aksi undangan) + link MAP.
- **Canvas dekoratif `<canvas>`** (Canvas 2D, BUKAN Phaser) menggambar **mempelai**: pria
  **berjas + dasi**, wanita **bergaun + kerudung + buket** — berdiri di **scene bertema game**
  (sky sunset, gunung, palem, sandbag, barel, hati melayang, banner "JUST MARRIED"). Vibe game
  **melekat** tapi tujuannya jelas undangan.
  - Gambar via helper Canvas 2D (`groom()`, `bride()`, `palm()`, `heart()`, dst).
  - Opsi lanjutan (bila user minta): pakai **foto asli** `photo_groom_photo`/`photo_bride_photo`
    (`drawImage` ke posisi kepala) alih-alih wajah prosedural.
- **Info undangan lengkap**: nickname mempelai (`val('groom_nickname')`/`val('bride_nickname')`),
  tanggal, **Akad & Resepsi** — waktu, tanggal, tempat, alamat, **link peta** (`{{akad_map}}`/
  `{{resepsi_map}}`, dibungkus `{{#if}}`). `{{#if flag_lokasi_akad_dan_resepsi_berbeda}}` untuk
  resepsi terpisah.
- Styling **blend** dengan tema game (font mono, border olive, badge), tapi terbaca sebagai
  undangan.

```html
<aside class="gw-cover-side">           <!-- desktop kanan: PURE undangan -->
  <canvas id="gw-couple-canvas" width="760" height="380"></canvas>   <!-- couple bertema game -->
  <div class="names">{{groom_nickname}} ♥ {{bride_nickname}}</div>
  <div class="event"> AKAD: {{tanggal_akad}} · {{jam_akad}} · {{nama_lokasi_akad}}
       {{#if akad_map}}<a href="{{akad_map}}">▶ MAP</a>{{/if}} </div>
  {{#if flag_lokasi_akad_dan_resepsi_berbeda}}<div class="event">RESEPSI: …{{resepsi_map}}…</div>{{/if}}
  <button id="gw-side-open">💌 BUKA UNDANGAN LENGKAP</button>   <!-- satu-satunya tombol -->
</aside>
```

> **Golden Rule panel PC:** kanan = **pure undangan** + canvas couple (jas/gaun) bertema game +
> akad/resepsi + map. **Nol tombol game** (semua kontrol game di dalam frame). Canvas pakai
> Canvas 2D, bukan Phaser.

---

## 10. TOAST / NOTIFIKASI — jangan di bawah (ketutupan kontrol), taruh di 35% atas

**BUG yang dicegah:** toast "kepingan didapat" muncul **dekat dasar layar** → ketutupan kontrol
sentuh & sulit dibaca → momen reward terasa hambar.

**Aturan ber-angka (riset UX toast):**
- Toast game taruh di **atas-tengah** (best visibility, di garis pandang utama) — secara CSS
  `top: 16–22%` dari atas, `left:50%; transform:translateX(-50%)`. **JANGAN** `bottom: <160px`
  (zona kontrol). User-spec: "tengah atau ~35% dari atas" → `top: ~30–35%` juga oke.
- **Durasi 3–8 detik** (attention span); auto-dismiss; **warna + ikon** untuk pesan instan
  (cyan/✓ = sukses kepingan, merah = bahaya).
- Toast **tidak menutupi** karakter/HUD penting; satu antrian (jangan tumpuk banyak).

```css
.gw-toast { position:absolute; top:18%; left:50%; transform:translate(-50%,-12px);
  z-index:30; opacity:0; transition:.2s; } /* BUKAN bottom: 150px */
.gw-toast.show { opacity:1; transform:translate(-50%,0); }
```

> **Golden Rule toast:** garis pandang utama (atas-tengah, ~18–35% dari atas), 3–8s, warna+ikon.
> Jangan di dasar layar (ketutupan kontrol). Sumber: LogRocket "Toast notifications UX".

---

## 11. BOSS harus BISA KALAH + ada HP BAR — jangan terasa immortal

**BUG yang dicegah:** boss ditembak berkali-kali tapi tak kalah & **tak ada indikator HP** →
pemain tak tahu apakah boss immortal atau HP-nya memang banyak → frustrasi, mengira game rusak.

**Penyebab umum (audit):**
- Overlap `bullets×boss` di-guard `if (bossActive)` tapi `bossActive` tak pernah true (lihat §5),
  atau peluru ter-`killBullet` sebelum `hitBoss` dipanggil, atau `weaponDmg` 0.
- HP boss terlalu tinggi vs DPS senjata (mis. 70 HP, pistol 1 dmg, rate lambat → menit-an).

**Aturan ber-angka:**
- **Tampilkan HP BAR boss** (graphic + opsional angka %) begitu boss aktif — di garis pandang
  (atas-tengah arena). Update tiap `hitBoss`. Ini **wajib** untuk HP tinggi (riset HUD: bar +
  angka saat HP banyak).
- **Balance TTK (time-to-kill) boss ~20–40 detik** dengan senjata menengah: `bossHP ≈ DPS_menengah
  × 30s`. Pistol default harus tetap bisa (lebih lama). Jangan > 60s.
- **Verifikasi jalur damage di harness**: panggil `hitBoss` N kali → `hp` turun → `defeatBoss`
  terpicu di 0. Pastikan `bossActive` true & overlap terdaftar.
- Tiap hit beri **feedback**: flash + freeze + partikel + (bar berkurang) → pemain yakin
  serangannya "masuk".

```js
// HP bar (fixed to camera, top-center of arena)
this.bossHpBg = this.add.rectangle(BW/2, 40, 240, 14, 0x000).setScrollFactor(0).setDepth(50);
this.bossHpFill = this.add.rectangle(BW/2-118, 40, 236, 10, 0xe23b2e).setOrigin(0,0.5).setScrollFactor(0).setDepth(51);
// on hit: this.bossHpFill.width = 236 * Math.max(0, hp/maxhp);
```

> **Golden Rule boss kalah:** boss WAJIB punya HP bar (garis pandang) + TTK 20–40s + feedback
> tiap hit. Verifikasi jalur damage (`hitBoss`→`defeatBoss`) di harness sebelum lapor selesai.

---

## 12. ANIMASI per-STATE (jangan sprite statis) — gerak/lompat/tembak-8-arah/mati

**BUG yang dicegah:** grafis terasa "miskin/kaku" karena 1 sprite statis dipakai untuk semua
keadaan. Metal Slug terkenal justru karena animasi kaya.

**Aturan ber-angka:**
- **Buat frame/pose per STATE** (procedural pun bisa: gambar beberapa varian tekstur atau ubah
  `scale/rotation/offset` per state). Minimum state ber-animasi: **idle (napas 2 frame ~6fps),
  run (4 frame ~10fps), jump (naik), fall (turun), prone (tiarap), shoot (recoil + muzzle), hurt
  (flash+knockback), dead (jatuh/ledak)**.
- **Arah tembak 8-arah** (atau ≥5: ←,→,↑,↗,↘): pose lengan/senjata + posisi muzzle **mengikuti
  arah** — bukan selalu horizontal.
- **Musuh juga ber-animasi**: walk-cycle, aim/telegraph (pose beda), die (ledak/partikel).
  Mech (tank) punya roda berputar / recoil meriam.
- Teknik murah Phaser tanpa spritesheet: `squash&stretch` (mendarat → 80%h/125%w), `setFlipX`
  per arah, tween recoil saat tembak, `setAngle` kecil saat lari, partikel jejak.

```js
// state-driven look (procedural-friendly)
if (st==='run')  sprite.setScale(1, 1).play && sprite.play('run', true);
if (st==='jump') sprite.setScale(0.9, 1.1);        // stretch naik
if (st==='land') tweenSquash(sprite);              // 0.8h/1.25w ease balik
if (shooting)    muzzleAt(aimDir);                 // muzzle flash ikut 8-arah
```

> **Golden Rule animasi:** tiap state (idle/run/jump/fall/prone/shoot8/hurt/dead) punya
> pose/gerak sendiri, untuk player **dan** musuh. Statis = belum selesai.

---

## 13. LEVEL DESIGN kaya — elevation, cover, balok pijakan, explosive, variasi musuh

**BUG yang dicegah:** level datar & kosong — halang-rintang minim, sedikit balok pijakan lompat,
variasi musuh kurang → membosankan & tak terasa "run-and-gun".

**Aturan ber-angka (riset Metal Slug/Contra level design):**
- **Varying elevation**: tiap layar punya ≥1 perubahan ketinggian (platform/tangga/parit). Balok
  pijakan lompat (`one-way platform`) **tiap ~6–10 tile** di segmen platforming.
- **Cover & explosive objects**: barel/peti yang bisa ditembak (meledak → damage area), tembok
  cover. Beri **destructible** agar layar "hidup".
- **Variasi musuh ≥5–6 tipe** dengan peran beda (rusher, ranged, turret statik, flyer, heavy/tank,
  + mech/artileri). **≤2 tipe per wave** (sweet spot) tapi **pool besar** lintas sektor. Musuh
  datang dari **beberapa arah** (depan + atas/flyer).
- **Pacing deliberate** (Metal Slug lebih lambat dari Contra): selang gauntlet ↔ napas; 3–5 puncak
  per sektor; mini-boss di tengah.
- **Obstacle/hazard** per biome: pit, flame-jet, crusher, jatuhan, kendaraan musuh.
- **6 biome berbeda** (forest, kota, sungai/salju, canyon/gurun, pangkalan, markas) — tiap biome
  set tile/props/enemy/hazard sendiri (APPENDIX C Bible).

> **Golden Rule level:** tiap layar = elevation + cover + ≥1 encounter; balok pijakan tiap 6–10
> tile; ≥5 tipe musuh (≤2/wave); explosive/destructible; pacing puncak-lembah. Datar-kosong = gagal.

---

## 14. DIALOG PILIH (stage/kesulitan) WAJIB ada tombol OK — jangan auto-apply on-click

**BUG yang dicegah:** klik opsi kesulitan/stage **langsung apply & menutup dialog** → pemain tak
bisa meninjau/membatalkan pilihan → UX buruk (salah klik = langsung mulai).

**Aturan:** dialog pilih = **2 langkah**. Klik opsi hanya **menandai pilihan** (highlight, ubah
state lokal `pendingDiff`/`pendingStage`), **belum** apply. Baru tombol **OK / MULAI** yang
meng-commit & menutup dialog. Sediakan juga **Batal**. Berlaku untuk picker kesulitan **dan** grid
sektor di satu overlay.

```
  ┌─ PILIH SEKTOR & KESULITAN ─┐
  │ [EASY] [NORMAL*] [HARD]    │  ← klik = highlight saja (pendingDiff)
  │ [1][2][3][4][5][6]         │  ← klik = highlight saja (pendingStage)
  │        [ OK ]  [Batal]     │  ← OK = commit & start; Batal = tutup
  └────────────────────────────┘
```

> **Golden Rule dialog pilih:** klik opsi = tandai (pending), **OK** = commit. Jangan auto-apply
> on-click. Sediakan Batal.

---

## 15. RISET UX & ENVIRONMENT sebelum membangun (jangan kira-kira)

**Aturan:** sebelum men-spec environment & UX di Bible, **riset arketipe** (WebSearch) untuk:
- **Enviro per stage**: Metal Slug = 6 misi di lokasi berbeda (hutan, kota bergarnisun, lembah
  bersalju, ngarai, pangkalan militer) — tiap stage **tema visual + hazard + enemy hardware**
  sendiri. Bible APPENDIX C harus se-spesifik ini, bukan generik.
- **UX HUD/feedback**: elemen vital (nyawa, **HP boss**, objektif) di garis pandang utama;
  bar+angka untuk HP tinggi; warna kontras; toast 3–8s atas-tengah.
- Dokumentasikan angka & keputusan di Bible (jangan "kira-kira begini").

> **Golden Rule riset:** environment & UX di Bible harus **didukung riset arketipe + UX**, ber-angka
> & spesifik-stage. Sumber: Hardcore Gaming 101 (Metal Slug), LogRocket (toast UX), Accessible Game
> Design (HUD).

---

## 16. BOSS hit-detection PAKAI CEK MANUAL, bukan andalkan overlap fisika saja

**BUG yang dicegah:** "boss tak bisa ditembak" walau overlap `bullets×boss` terdaftar. Penyebab:
boss yang **bobbing + body di-size/offset + immovable + sempat `setActive(false)`** membuat arcade
overlap tidak konsisten (kadup body nonaktif / posisi body telat ikut sprite). `setActive(false)`
pada sprite fisika **menonaktifkan body** → overlap mati total.

**Aturan:**
- **JANGAN `setActive(false)`** untuk menyembunyikan boss saat walk-in — pakai `setAlpha(0)` +
  flag `bossActive`. Body tetap hidup.
- **Cek hit MANUAL tiap frame** (immune ke bug body): loop peluru aktif, bila
  `|bl.x−boss.x| < hw && |bl.y−boss.y| < hh` → `hitBoss` + `killBullet`. Hitbox **generous**
  (mis. 58×66). Pola sama dipakai grenade-AoE.
```js
GameScene.prototype.manualBossHits = function(){
  var b=this.boss; if(!b||!b.active||!this.bossActive) return;
  this.bullets.getChildren().forEach(function(bl){
    if(bl.active && Math.abs(bl.x-b.x)<58 && Math.abs(bl.y-b.y)<66){
      if(!bl.getData('nade')) this.hitBoss(b); this.killBullet(bl);
    }
  }, this);
};
```
- **HP bar KECIL di ATAS boss** (world-space, ikut posisi boss), bukan banner besar di layar:
  `rectangle(boss.x, boss.y-80, 90, 5)`, update tiap frame.
- **Peluru boss WAJIB mengarah ke player**: vektor `(player.x−mx, player.y−my)` dinormalisasi ×
  speed, beri fan-spread kecil (±0.12 rad) biar dodgeable. **Jangan** tembak flat ke satu arah
  konstan (pemain bingung siapa lawannya).

> **Golden Rule boss hit:** sembunyikan boss via alpha (bukan setActive false); deteksi hit
> **manual** tiap frame; HP bar kecil di atas boss; peluru boss **aim ke player** + spread.

---

## 17. UNDANGAN = GAME RAMAH: HILANGKAN NYAWA, respawn maju-mundur yang AMAN

**BUG yang dicegah:** "terlalu sulit untuk sebuah undangan" — sistem nyawa + game-over + balik ke
awal stage + mati saat respawn (spawn-kill) bikin tamu frustrasi & menutup undangan.

**Aturan (ini undangan, bukan shooter hardcore):**
- **HAPUS nyawa & game-over.** Kena musuh/peluru = **knockback kecil + i-frame** (`invulnMs`),
  **bukan** mati. Repurpose HUD "nyawa" → granat / skor.
- **Jangan balik ke awal stage saat mati.** Hanya **jatuh ke jurang** yang merelokasi player —
  ke titik **mundur ~200px** dari tempat jatuh.
- **Titik respawn WAJIB AMAN**: scan mundur cari x yang (a) **bukan** di hazard, (b) **tak ada
  musuh** dalam ~220px, (c) ada tanah. Bila tak ketemu → checkpoint terakhir. **Freeze musuh
  sekitar 1s** setelah respawn (anti spawn-kill).
```js
findSafeRespawn(fromX){
  for(var x=fromX-200; x>60; x-=40){
    if(this.nearHazard(x,60)) continue;
    if(this.nearEnemy(x,220)) continue;     // barrel bukan musuh
    return x;
  }
  return this.player.respawnX || 120;
}
```
- **EASY default** untuk undangan; cheat tetap kebal. Tujuan: tamu non-gamer **selalu bisa maju**.

> **Golden Rule ramah:** undangan = tanpa nyawa/game-over; kena = knockback+i-frame; jatuh jurang
> = mundur ke titik **aman** (bukan hazard/musuh, bukan awal stage); freeze musuh saat respawn.

---

## 18. CROUCH/RESIZE BODY hanya saat GANTI STATE — jangan tiap frame (judder)

**BUG yang dicegah:** menahan arah bawah (jongkok) bikin karakter **bergetar/judder**. Penyebab:
`body.setSize(...)` dipanggil **tiap frame** saat `down` ditahan → body re-anchor + tabrakan lantai
mendorong naik-turun.

**Aturan:**
- Lacak state prone (`this._prone`); **resize body HANYA saat transisi** `wantProne !== _prone`.
- Saat resize, **anchor bawah** via `setOffset(.., height − newBodyH)` supaya kaki tetap di tanah
  (tak "pop").
- Pose visual (scale) pakai flag state yang **stabil** (`_prone`), bukan baca `input.down` mentah
  (joystick bisa flicker di ambang). Bila perlu, beri **hysteresis** ambang joystick.

> **Golden Rule resize:** ubah ukuran body **on-state-change saja**, anchor bawah. Tiap-frame
> resize = judder.

---

## 19. ANIMASI FRAME-BY-FRAME PROSEDURAL (kalau mau grafis "kaya" tanpa aset CDN)

**Konteks:** transform (squash/lean) saja terasa kaku. Untuk **animasi sungguhan ala Metal Slug**
tanpa men-download spritesheet (harus tetap procedural/CORS-free): **generate banyak frame texture
procedural** lalu buat anim Phaser.

**Aturan:**
- Tulis **satu drawer ber-parameter** (`drawCommando(g, {bob, legPhase, prone, armUp, hurt})`),
  panggil untuk tiap frame → texture terpisah (`t_player_run0..3`, `_idle0..1`, `_jump`, `_fall`,
  `_prone`, `_hurt`).
- Buat anim dgn `this.anims.create({key, frames:[{key:'t_..0'},...], frameRate, repeat:-1})` —
  **guard `anims.exists`** (re-inject). Run-cycle ~12fps, idle ~3fps.
- Di state-machine, `this.play(animKey, true)` per state (idle/run/jump/fall/prone/hurt).
  Squash-land & recoil tetap dipakai sebagai **juice di atas** anim.
- **Musuh** boleh sama: minimal walk 2–3 frame + die. Sprite eksternal CORS-ok tetap opsi, dengan
  fallback procedural.

```js
function drawCommando(g, o){ /* legs offset by o.legPhase, body bob o.bob, etc. */ }
['idle0','idle1','run0','run1','run2','run3','jump','fall','prone','hurt'].forEach(...generate...);
this.anims.create({key:'p_run', frames:[...].map(k=>({key:k})), frameRate:12, repeat:-1});
```

> **Golden Rule grafis kaya:** untuk animasi frame-by-frame tanpa CDN → **generate banyak frame
> texture procedural** + `anims.create` + `play` per-state. Guard `anims.exists`. Juice di atasnya.

---

## 20. SELURUH ELEMEN UI = "TERASA GAME" (tak ada link telanjang)

**BUG yang dicegah:** tombol sekunder (Batal/Tutup) cuma **teks ber-underline** (link) → tak
konsisten, tak terasa game.

**Aturan:**
- **Tiap tombol = tombol game** (mono font, uppercase, border, shadow `0 3px 0`, active translateY).
  Primer (merah/amber), sekunder (olive outline). **Tidak ada** `text-decoration:underline` polos.
- Overlay/dialog bergaya arcade: border tebal, corner-tick, scanline halus, judul pixel
  (text-shadow berlapis).
- Stage-select cell = tombol arcade (nomor besar amber, label kecil), state `is-sel` menyala cyan.
- Konsisten lintas semua overlay (cover, briefing, clear, stage-select, reset, win).

> **Golden Rule UI game:** nol link telanjang; tiap kontrol = tombol game (mono/border/shadow);
> dialog bergaya arcade. Sekunder ≠ underline-link.

---

## 21. RESET = reset PENUH (storage + stage + ulangi pilih kesulitan), bukan sebagian

**BUG yang dicegah:** tombol reset hanya menghapus kepingan tapi **mempertahankan kesulitan,
sektor berjalan, & lanjut di tengah game** → bukan "reset" yang sebenarnya.

**Aturan — reset (setelah konfirmasi overlay) WAJIB melakukan SEMUA ini:**
1. **Hapus localStorage sepenuhnya** — `localStorage.removeItem(storeKey)` lalu set STORE ke
   default (termasuk **`diff` kembali ke default**, `unlocked=[]`, `maxSector=0`, `best=0`,
   guard celebration `announcedAll/completed=false`). Jangan menyisakan `diff` lama.
2. **Bongkar game yang berjalan** (`GAME.destroy(true)`) → **stage benar-benar di-reset**, bukan
   sekadar lanjut. Reset `runState` & `cheat=false` (matikan badge ★, sembunyikan stage-select).
3. **Rebuild indikator** (semua kepingan terkunci lagi) + reset UI picker kesulitan ke default.
4. **Kembali ke layar COVER** (`showOverlay('cover')`) supaya pemain **memilih kesulitan lagi**
   lalu PRESS START dari awal.
5. **Verifikasi di harness**: tulis storage palsu → klik reset → assert storage ter-wipe
   (diff→default, sektor→0) & cover (picker kesulitan) tampil.

```js
function resetGame(){
  localStorage.removeItem(STORE_KEY);                 // 1: wipe storage
  STORE = defaults();                                  // diff→'normal', unlocked=[], dst.
  if (GAME){ GAME.destroy(true); GAME = null; }         // 2: tear down stage
  runState = freshRun(); cheat.on = false;             // reset run + cheat
  rebuildIndicators(); resetDiffPickerUI();             // 3
  showOverlay('cover');                                 // 4: re-pick difficulty + START
}
```

> **Golden Rule reset:** reset = **PENUH** — storage di-wipe (incl. kesulitan), game dibongkar
> (stage reset), kembali ke cover untuk pilih kesulitan lagi. Bukan cuma hapus kepingan.

---

## 22. PELURU vs MUSUH DI ATAS BALOK — anti-tembus + sweep anti-tunnel

**BUG yang dicegah:** "musuh di atas balok/platform, pas ditembak pelurunya nembus & musuh tidak
mati". Dua penyebab terpisah, dua-duanya harus ditutup:

1. **Collider `bullets×platforms` memenangkan platform.** Peluru yang menuju musuh yang **berdiri
   di atas platform** kena **sudut/sisi platform** lebih dulu dan di-`killBullet` sebelum overlap
   `bullets×enemies` sempat terdaftar di step yang sama → terlihat "tembus" (peluru hilang diam,
   musuh utuh). Phaser memproses collider/overlap dalam satu langkah, urutannya tidak dijamin
   menguntungkan musuh.
2. **Tunneling.** Peluru cepat (560–720 px/s) bisa **melompati** body musuh yang tipis dalam satu
   frame → overlap tak pernah true.

**Aturan:**
- **Daftarkan overlap `bullets×enemies` SEBELUM collider `bullets×platforms`** (resolusi musuh
  lebih dulu di langkah yang sama).
- **`processCallback` pada collider platform: tolak kill** bila peluru sedang overlap musuh hidup.
  Collider Phaser menerima arg ke-5 (process callback) — `return false` ⇒ skip.
```js
this.physics.add.overlap(this.bullets, this.enemies, (b,e)=>this.hitEnemy(b,e));
this.physics.add.collider(this.bullets, this.platforms,
  (b)=>this.killBullet(b),
  (b)=>!this.bulletOverEnemy(b));        // process: jangan kill kalau lagi nimpa musuh
```
- **Cek hit MANUAL tiap frame** sebagai safety-net (pola sama dengan boss, §16) — pakai **sweep
  span** sepanjang sumbu gerak (prev→now) supaya peluru cepat tak tunnel; AABB supaya musuh di
  platform pasti kena. `hitEnemy()` **di-guard `b.active && e.active`** sehingga aman dipanggil
  dari overlap **dan** sweep manual tanpa double-count.
```js
GameScene.prototype.manualEnemyHits = function(){
  var self=this, list=this.enemies.getChildren();
  this.bullets.getChildren().forEach(function(bl){
    if(!bl.active||!bl.body) return;
    var by=bl.y, vx=bl.body.velocity.x;
    var x0 = vx<0 ? bl.x : bl.x-Math.abs(vx)*0.016;   // span lompatan 1 frame
    var x1 = vx<0 ? bl.x+Math.abs(vx)*0.016 : bl.x;
    for(var i=0;i<list.length;i++){ var e=list[i],eb=e.body; if(!e.active||!eb) continue;
      if(x1>eb.left-6 && x0<eb.right+6 && by>eb.top-6 && by<eb.bottom+6){ self.hitEnemy(bl,e); break; }
    }
  });
};
```

> **Golden Rule peluru-vs-musuh:** musuh **selalu menang** atas platform (overlap-first +
> process-callback) **dan** ada sweep manual anti-tunnel tiap frame. `hitEnemy` idempotent
> (guard active) supaya dua jalur damage tak double-count. Verifikasi di harness: musuh hp-1 di
> atas platform → 1 peluru → musuh mati, peluru habis.

---

## 23. SPAWN MUSUH RELATIF-KAMERA — peluru JANGAN bisa membunuh musuh yang belum masuk layar

**BUG yang dicegah (nyata, `metalslug-wedding`):** *"peluru kita bisa membunuh musuh yang bahkan
belum masuk ke dalam frame."* Di Metal Slug asli ini **mustahil** — bukan karena peluru pendek,
tapi karena **musuh yang belum masuk layar BELUM ADA sebagai entity**. Ia cuma **data spawn inert**
(`{trigger_x, type, y}`) di list; baru di-instantiate jadi entity hidup (punya hitbox) **saat scroll
kamera mencapai trigger-nya, muncul DI TEPI KANAN layar** — bukan menunggu di world-X jauh-kanan
dengan hitbox aktif. (Sumber: teardown Contra "Retro Game Internals" + perilaku scroll-lock & cap
proyektil Metal Slug; lihat ringkasan riset.)

**Akar masalah di clone:** generator **meng-spawn SEMUA musuh aktif saat level-load** di world-X
masing-masing → musuh off-screen-kanan sudah jadi objek collidable → peluru world-space berjarak
jauh mengenainya. **Perbaiki spawn model & bug ini mustahil secara struktural.**

**Aturan ber-angka (Phaser 3.80.1):**

1. **Musuh off-screen = DATA, bukan entity.** Simpan sebagai record `{x: triggerX, type, y}` di array
   **terurut naik `triggerX`**. JANGAN `enemies.create(...)` untuk semua saat build stage.
2. **Spawn via pointer + ambang scroll.** Tiap frame: `while (cam.scrollX + BW >= rec[next].x) { spawnEnemy(rec[next]); next++ }`.
   Musuh **lahir di `x = cam.scrollX + BW`** (tepi kanan) atau record-X-nya bila ≥ tepi — **bukan**
   di world-X jauh di luar layar. Margin off-edge **≤ 1 lebar-sprite** untuk sprite lebar yang "masuk".
3. **Hitbox HANYA untuk musuh aktif.** Musuh yang belum di-spawn **tak punya body/hitbox sama sekali**.
   Ini sendiri membuat bug-nya mustahil.
4. **Hit-detection iterasi musuh AKTIF.** Sweep/overlap berjalan atas `enemies` group yang hidup
   (cek `e.active && e.body`), **bukan** atas tabel level penuh. (Konsisten dgn §22 `manualEnemyHits`.)
5. **Peluru player despawn di tepi viewport** (`bl.x > cam.scrollX + BW` atau `< cam.scrollX`) **dan/atau
   lifetime ~0.5–1.0s**. Peluru tak boleh terus terbang ke world off-screen-kanan. (Plus cap proyektil
   senjata berat ~2–3 di layar.)
6. **Musuh self-despawn saat ter-scroll keluar kiri** (`e.right < cam.scrollX - grace`) → set populasi
   hidup ≈ yang on/near-screen (anti-leak, sinkron dgn pooling §5 Enemy).
7. **Scroll-lock arena = clamp `cam` + bounds.** Saat terkunci, scroll berhenti → pointer spawn (#2)
   **otomatis beku** → wave = record dengan `triggerX ≤ lockX`. Lepas lock saat **musuh-vital wave = 0**,
   lalu lepas clamp. Konsisten dgn **boss walk-in §5** (`arenaX`).

```js
// Spawn relatif-kamera (taruh di update(), pola Phaser):
this._next = this._next || 0;
var cam = this.cameras.main, edge = cam.scrollX + BW;
while (this._next < this.spawnList.length && edge >= this.spawnList[this._next].x) {
  var r = this.spawnList[this._next++];
  this.spawnEnemy(r.type, Math.max(r.x, edge), r.y);   // lahir DI/di-belakang tepi, tak lebih jauh
}
// Bullet edge-despawn (cegah hit off-screen):
this.bullets.children.iterate(function (b) {
  if (!b || !b.active) return;
  if (b.x > cam.scrollX + BW + 16 || b.x < cam.scrollX - 16) b.disableBody(true, true);
});
```

> **INVARIAN yang DIVERIFIKASI di harness:** *Tak ada musuh ber-hitbox kecuali `state==ACTIVE`; musuh
> jadi ACTIVE hanya saat `cam.scrollX+BW ≥ triggerX` (lahir di tepi). Peluru despawn di tepi viewport.*
> Tes: taruh musuh-record di `triggerX` jauh di kanan + tembak → **TIDAK** kena (belum spawn); scroll
> sampai `edge≥triggerX` → musuh muncul di tepi → baru bisa kena. Pegang invarian ini → "peluru bunuh
> musuh off-screen" mustahil.

> **Golden Rule spawn:** musuh off-screen adalah **resep, bukan makhluk** — di-masak (spawn + hitbox)
> tepat saat tepi kanan layar mencapainya. Spawn-saat-load di world-X jauh = bug. Peluru mati di tepi.

---

## Checklist ringkas (masukkan ke APPENDIX E / self-check Bible)

- [ ] Kamera: `setFollowOffset(-~0.40·BW, -70)` + `setDeadzone(20,120)` → player di kiri ⅖, depan luas (batas ~0.42).
- [ ] Ground: `GROUND_Y = BH − (isTouch ? 200 : 150)`; clearance karakter ↔ controller ≥80px.
- [ ] ICON-BUTTON kiri-atas · indikator kepingan kanan-atas · joystick kiri-bawah · FIRE/JMP kanan-bawah.
- [ ] Target sentuh ≥44px, spacing ≥8px, hormati safe-area.
- [ ] Desktop: frame **mentok kiri** (480px), panel kanan **pure undangan** (no game buttons); `justify-content:flex-start`; 1 breakpoint (980px); mobile = frame saja.
- [ ] **Boss walk-in**: boss inactive sampai `player.x ≥ arenaX`; kamera dikunci saat aktivasi, bukan saat build; reset flag tiap sektor.
- [ ] **Grafis**: tiap sprite base+highlight+shadow+outline (3 tone + garis); siluet unik.
- [ ] **Backdrop**: sky palet per-biome + ≥3 lapis parallax + props; rebuild & clear per sektor.
- [ ] **Stage-select** memuat picker kesulitan sekaligus (class/handler sama dengan cover).
- [ ] **Panel PC** = canvas couple (jas/gaun) bertema game + info akad/resepsi + map; nol tombol game.
- [ ] **Toast** di atas-tengah (~18–35% dari atas), 3–8s, warna+ikon; BUKAN di dasar layar.
- [ ] **Boss**: ada HP bar (garis pandang) + TTK 20–40s + feedback tiap hit; jalur damage diverifikasi harness.
- [ ] **Animasi per-state**: idle/run/jump/fall/prone/shoot-8-arah/hurt/dead untuk player & musuh.
- [ ] **Level**: elevation + cover + balok pijakan tiap 6–10 tile + explosive + ≥5 tipe musuh (≤2/wave); pacing puncak-lembah.
- [ ] **Dialog pilih** (stage/kesulitan): klik = tandai (pending), tombol **OK** = commit; ada Batal.
- [ ] **Riset** environment per-stage + UX HUD/toast sebelum men-spec (ber-angka, spesifik-stage).
- [ ] **Boss hit**: sembunyi via alpha (bukan setActive false); cek hit **manual** tiap frame; HP bar kecil di atas boss; peluru boss **aim ke player**.
- [ ] **Ramah undangan**: tanpa nyawa/game-over; kena = knockback+i-frame; jatuh jurang = respawn ke titik **aman** (bukan hazard/musuh/awal stage).
- [ ] **Crouch/resize body** hanya on-state-change (anchor bawah) — bukan tiap frame (judder).
- [ ] **Animasi kaya** (opsional): frame texture procedural + `anims.create`/`play` per-state, guard `anims.exists`.
- [ ] **UI game**: nol link telanjang; tiap tombol = tombol game (mono/border/shadow); dialog arcade.
- [ ] **Reset PENUH**: wipe storage (incl. kesulitan), `GAME.destroy(true)` (stage reset), kembali ke cover (pilih kesulitan lagi); diverifikasi harness.
- [ ] **Peluru vs musuh di atas balok**: overlap enemies didaftar SEBELUM collider platform + `processCallback` tolak-kill saat nimpa musuh + `manualEnemyHits` sweep anti-tunnel; `hitEnemy` guard active (idempotent); diverifikasi harness.
- [ ] **Spawn relatif-kamera**: musuh off-screen = data inert (list `triggerX` terurut), di-spawn DI TEPI saat `cam.scrollX+BW ≥ triggerX`; hitbox hanya saat aktif; peluru despawn di tepi viewport; **musuh belum-masuk-layar TIDAK bisa kena tembak** (diverifikasi harness). §23
