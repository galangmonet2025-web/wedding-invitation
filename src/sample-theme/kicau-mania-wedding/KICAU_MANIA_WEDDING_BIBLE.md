# KICAU MANIA WEDDING — Game Design Bible

> **Tema undangan pernikahan berbasis game — arketipe: FLAPPY BIRD (tap-to-flap).**
> Engine **Phaser 3.80.1**, single-file (`index.html` + `index.css` + `index.js`), sprite
> **prosedural** (tanpa upload gambar wajib; opsi PNG sheet di APPENDIX P).
> Di-clone dari kerangka & kontrak-host **`spacewar-wedding`** (versi terbaru), BUKAN retromario.
>
> **Output dokumen ini = spesifikasi.** Bible ini yang dipakai (panggilan terpisah) untuk
> men-generate 3 file tema. Bible tidak mengimplementasi; ia men-spec sampai actionable.

---

## DAFTAR ISI

- §0 Meta & Elevator Pitch
- §1 Core Principles (7 filosofi)
- §2 Core Gameplay Loop
- §3 World / Level Structure — beat-sheet Flappy + density "NO DEAD AIR"
- §4 Player System (Burung Kicau — tap-to-flap)
- §5 Obstacle System (Sangkar/pipa + hazard ≥5 tipe)
- §6 Interaction & Collision Matrix
- §7 Power-up / Item System (Voer/Jangkrik/Masteran) + Gacor Meter
- §8 Difficulty Scaling (undangan = ramah)
- §9 Camera & Readability (side-scroll horizontal)
- §10 Game Feel / Juice + Grafis + transisi sinematik
- §11 Audio Design (SFX flap/score/hit/die)
- §12 Anti-Frustration Rules
- APPENDIX A — Pattern Library (≥24 pola sangkar)
- APPENDIX B — Entity Encyclopedia
- APPENDIX C — Biome / Stage Library (6 stage)
- APPENDIX D — Climax System (bukan boss: "all pieces" + finale)
- APPENDIX E — Validator Engine (density gate + playability)
- APPENDIX F — Generation Algorithm
- APPENDIX T — Technical Foundation (Phaser 3.80.1)
- APPENDIX S — Single-File Architecture
- APPENDIX P — Aset PNG (sprite sheet) + Sprite Tuner + Asset Adjuster
- APPENDIX W — Wedding Integration (section→kepingan)
- APPENDIX X — Collection Mechanic + teks "KICAU MANIA" per-kata
- APPENDIX Y — Cheat System + reset penuh
- APPENDIX Z — Host Contract & Wiring + layout 2-kolom

---

## §0 META & ELEVATOR PITCH

- **Judul game:** *KICAU MANIA WEDDING* — "Terbang Menuju Pelaminan".
- **Arketipe:** Flappy Bird (tap-to-flap side-scroller endless-terstruktur). Referensi klasik:
  Flappy Bird (Dong Nguyen, 2013). Angka fisika kanonik terverifikasi:
  gravity **800–1200 px/s²**, flap impulse **300–400 px/s ke atas**, gap pipa **140–180px**
  ([Columbia design doc](https://www.cs.columbia.edu/~sedwards/classes/2025/4840-spring/designs/FlappyBird.pdf),
  [NYU difficulty case-study](https://technical.ly/uncategorized/nyu-game-center-flappy-bird-case-study/)).
- **Mood pasangan:** ceria, playful, viral-nyeleneh (lagu **"KICAU MANIA"** Ndarboy Genk x
  Banditoz Yaow) TAPI **di-tone-down jadi kalem/elegan** agar pantas jadi undangan.
- **Tema visual:** dunia hobi **burung kicau Indonesia**. Warna kuning-jingga hangat + aksen
  pink graffiti (dituakan/di-desaturasi ~15–20% dari referensi mentah). Karakter = **burung
  kicau kartun** (murai/lovebird).
- **Elevator pitch:** *Tamu men-tap burung kicau untuk terbang menembus celah SANGKAR burung.
  Di antara sangkar melayang KEPINGAN undangan (sangkar emas 💌) — mengambilnya memunculkan
  teks graffiti "KICAU KICAU KICAU MANIA" per-kata + nama mempelai, dan membuka satu bagian
  undangan. Kumpulkan semua kepingan di Stage 1–3 → undangan siap dibuka. Stage 4–6 bonus
  kejar-skor. Yang tak mau main cukup tekan ★ (cheat) atau 💌.*
- **Engine:** Phaser 3.80.1, single-file, arsitektur monolitik IIFE (APPENDIX S).

> **⚠️ CATATAN ARKETIPE — "endless" jadi "terstruktur-berstage".** Flappy asli endless & satu
> layar. Di sini kita **memotong** jadi 6 stage berpanjang tetap (world horizontal) dengan
> **garis finish** per stage — supaya ada progression, kepingan bisa ditempatkan deterministik,
> dan transisi antar-stage sinematik. Fisika tap-to-flap tetap **otentik Flappy**.

---

## §1 CORE PRINCIPLES

Tiap prinsip: aturan keras + BENAR/SALAH + WHY.

### 1.1 Playability First (Flappy harus terasa Flappy)
- **WAJIB:** satu tap = satu impuls ke atas; lepas = jatuh karena gravitasi konstan; lintasan
  = kurva "loncat-jatuh" khas. Input latency ≤ 1 frame (baca tap di `update`, bukan setTimeout).
- ✅ `bird.body.setVelocityY(-FLAP)` saat tap. ❌ menambah gaya bertahap / smoothing = terasa
  "berat/berenang", bukan Flappy.
- **WHY:** feel Flappy sepenuhnya ada di respons tap instan. Rusak itu → game beda.

### 1.2 Teach Before Test
- Stage 1 dibuka **safe corridor ~1.5 layar tanpa sangkar** + 1 sangkar gap super-lebar
  (≥ 2.2× tinggi burung) sebagai latihan tap. Baru sangkar normal.
- **WHY:** Flappy terkenal "sadis di detik pertama". Untuk undangan itu tidak boleh.

### 1.3 Fair Challenge (undangan, bukan Flappy sadis)
- **TANPA game-over permanen / tanpa skor-reset ke 0 saat nabrak.** Nabrak sangkar/tanah =
  **respawn lembut** di titik aman sedikit ke belakang (bukan awal stage), invuln 1.2s, skor
  **stage tetap** (tidak hangus). Lihat §8, §12.
- **WHY:** tamu yang gagal 3× di Flappy asli akan menutup tab. Undangan tak boleh mengusir tamu.

### 1.4 Readability
- Gap sangkar selalu **jelas** (celah terang + garis panduan tepi). Kepingan 💌 diberi **beacon
  ring + pulse** agar tak tertukar power-up. Background ramai TAPI di-mute (alpha ≤0.55) agar
  gameplay foreground kontras.
- **WHY:** salah baca gap = tabrakan tak adil.

### 1.5 Discovery / Reward
- Undangan **ditemukan** dengan bermain: tiap kepingan = satu bagian undangan. Momen ambil
  kepingan = puncak ("KICAU MANIA" per-kata + nama mempelai). Lihat APPENDIX X.

### 1.6 Game Dulu, Baru Undangan
- Bible tak selesai sampai tiap kepingan punya tempat logis di stage yang **enak dimainkan**
  (60fps, padat, ada tantangan, ada juice). Undangan = hadiah, bukan tempelan.

### 1.7 Inklusif (Cheat + tombol langsung)
- Tamu non-gamer: tombol **★ cheat** (kebal + semua kepingan + semua stage) & **💌 buka
  undangan langsung**. Undangan tak pernah terkunci di balik skill.

> **Golden Rule §1:** *Rasakan Flappy, tapi jangan hukum seperti Flappy. Tap otentik, kegagalan
> lembut.*

---

## §2 CORE GAMEPLAY LOOP

Verb utama: **TAP (flap)**. Verb sekunder: **kumpulkan** (otomatis saat menyentuh 💌).

```
        ┌──────────────────────────────────────────────────┐
        │  TAP → burung naik (impuls) ────────┐             │
        │        │ (lepas)                     ▼             │
        │        └──── gravitasi → jatuh   world scroll KIRI │
        │                    │              (burung diam-X,  │
        │                    ▼               dunia lewat)    │
        │         lewati CELAH SANGKAR ──► +skor +Gacor      │
        │                    │                               │
        │        ┌───────────┴───────────┐                   │
        │   sentuh 💌 KEPINGAN        tabrak sangkar/tanah    │
        │   → unlock section          → respawn lembut       │
        │   → "KICAU MANIA" per-kata    (invuln, skor tetap) │
        │   → nama mempelai                                  │
        │                    │                               │
        │            capai GARIS FINISH stage                │
        │            → STAGE CLEAR sinematik → stage berikut │
        └──────────────────────────────────────────────────┘
   Semua kepingan (akhir Stage 3) → "Undangan siap dibuka" (celebration #1)
   Tamat Stage 6 → finale bonus (celebration #2)
```

Satu "putaran mikro" (≈1.5–3 detik): tap beberapa kali → baca gap berikutnya → lewati →
dapat skor/Gacor → sesekali sambar 💌/power-up. **Tak pernah ada 2 detik tanpa event** (§3).

> **Golden Rule §2:** *Satu jari, satu tujuan: terbang menembus sangkar menuju pelaminan.*

---

## §3 WORLD / LEVEL STRUCTURE

### 3.1 Orientasi & dimensi (Phaser world)
- **Resolusi internal:** ukur `#gw-stage` via `getBoundingClientRect()`; fallback **BW≥320,
  BH≥480**; target potret **~432×768** (skala FIT). JANGAN baca `scale.width` di `create()`.
- **Arah:** **HORIZONTAL** — burung tetap di kolom-X (~30% dari kiri), **dunia scroll ke KIRI**
  (`cam.scrollX` naik). Ini beda dari spacewar (vertikal) — semua sumbu di-swap saat clone.
- **Panjang stage:** **STAGE_LEN = 6400px** (~13–15 celah sangkar) untuk stage berkepingan
  (1–3); **STAGE_LEN = 5200px** untuk stage bonus (4–6). Finish = dinding gerbang di `endX`.
- **GROUND & CEILING:** tanah di `GROUND_Y = BH − (isTouch ? 96 : 72)` (Flappy butuh tanah
  tinggi supaya jatuh terasa; tapi sisakan area main). Langit-langit tak mematikan (burung
  memantul lembut di `y ≤ CEIL_Y = 8`, tak instant-die — anti-frustrasi).

### 3.2 Pacing template per stage
```
[SAFE 1.5 layar] → [TEACH: 1 gap super-lebar] → [PRACTICE: 3–4 gap normal + 1 kepingan]
   → [gauntlet A: gap rapat + hazard] → [breather: gap lebar + power-up]
   → [gauntlet B: hazard 2-bidang] → [kepingan + escort] → [FINISH gerbang]
```
Kurva **sawtooth**: 3 puncak (gauntlet) + 2 lembah (breather), tapi lembah **tetap terisi**
prop bergerak / power-up (bukan kosong).

### 3.3 Beat-sheet referensi Flappy Bird (density source)

> Flappy asli **endless satu-mekanik**, jadi "beat"-nya = **cadence celah + variasi gap +
> event**. Riset ([exploring mechanics](https://flappy-bird.com/exploring-flappy-bird-mechanics-and-strategies/),
> [NYU case-study](https://technical.ly/uncategorized/nyu-game-center-flappy-bird-case-study/)):
> gap **140–180px**, jarak antar-pipa **~1.4–1.6× lebar layar**, kesulitan naik dari **kecepatan
> scroll**, bukan gap mengecil ekstrem. Kita **perkaya** agar tak hambar (Flappy asli minimalis;
> undangan butuh dunia hidup):

| # | Posisi (×layar) | Event (di-adaptasi ke dunia kicau) |
|---|---|---|
| 1 | 0.0 | SAFE zone: burung masuk terbang, background stage (orang mandiin burung) ramai, 0 sangkar |
| 2 | 1.5 | TEACH: 1 sangkar gap super-lebar (2.2× burung) — belajar tap |
| 3 | 2.4 | gap normal #1 + **not-balok skor** (filler) di celah |
| 4 | 3.0 | gap normal #2 + **KEPINGAN 💌 #1** melayang di celah (beacon) |
| 5 | 3.8 | **hazard: KUCING** melompat dari tanah (telegraph 0.6s) — bidang ancaman ke-2 |
| 6 | 4.6 | gauntlet: 3 sangkar rapat (jarak 1.2×) + **JANGKRIK (boost)** di antara |
| 7 | 5.6 | breather: gap lebar + **VOER (shield)** + ambient (daun jatuh) |
| 8 | 6.4 | hazard 2-bidang: **LEBAH** menyerang dari udara + sangkar bergerak naik-turun |
| 9 | 7.4 | **KEPINGAN 💌 #2** + escort (2 kucing) |
| 10 | 8.4 | gauntlet B: sangkar zig-zag (gap tinggi→rendah) + not-balok trail |
| 11 | 9.6 | **MASTERAN** (auto-flap) + landmark midground (tenda lomba) |
| 12 | 10.6 | **KEPINGAN 💌 #3** di puncak lintasan (butuh Gacor/timing) |
| 13 | 12.0 | final stretch: 4 gap ritmis (sinkron beat lagu) → **GERBANG FINISH** |

**Yang generator pelajari:** reward (kepingan/skor/power-up) tiap **≤2.5 layar**; hazard non-
sangkar diperkenalkan **bertahap** (kucing → lebah → sangkar bergerak); tiap layar punya
prop bergerak; SAFE zone tetap ramai dekorasi (bukan kosong).

### 3.4 Density "NO DEAD AIR" (LANTAI ber-angka — validator di APPENDIX E)

| Metrik | Lantai (min wajib) | Catatan kicau |
|---|---|---|
| **Max dead air** | ≤ 0.75× layar tanpa sangkar/item/hazard/prop | aturan terkeras |
| **Sangkar (obstacle) / layar** | **≥ 1** (zona tempur) | Flappy: obstacle = celah; "kadang ada kadang nggak" = gagal |
| **Hazard tambahan / 2 layar** | **≥ 1** (kucing/lebah/sangkar-gerak) di stage ≥2 | 2 bidang ancaman |
| **Reward cadence** | item/kepingan/skor-pickup tiap **≤ 2.5 layar** | dopamin |
| **Far parallax / layar** | ≥ 1 (siluet perbukitan / langit gradien) | dunia hidup |
| **Landmark midground / layar** | 1–2 (tenda lomba, pohon, tiang gantangan) | rasa tempat |
| **Foreground prop / layar** | 2–4 (rumput, batu, ember, sangkar hias non-collide) | |
| **Ambient motion / layar** | ≥ 1 (daun jatuh, kupu-kupu, air ember) | layar tak beku |

> **Golden Rule §3:** *Kalau satu layar bisa dilewati tanpa tap yang berarti, tanpa item, tanpa
> prop bergerak — layar itu GAGAL, regenerate. Flappy minimalis; undangan harus HIDUP.*

---

## §4 PLAYER SYSTEM — Burung Kicau (tap-to-flap)

### 4.1 Arsitektur
`class Bird extends Phaser.Physics.Arcade.Sprite` — **PAKAI gravitasi** (beda dari spacewar
yang gravity:0). Set `this.body.setAllowGravity(true)` + gravity dunia `y: GRAV`.

### 4.2 Fisika (angka konkret — kalibrasi Flappy + ramah undangan)
```yaml
GRAV:            1000        # px/s² (rentang kanonik 800–1200; 1000 = enak di mobile)
FLAP_IMPULSE:    -360        # px/s (kanonik 300–400; set velocityY absolut, bukan +=)
MAX_FALL:        620         # clamp kecepatan jatuh (anti "batu jatuh")
TILT_UP:         -22 deg     # rotasi saat naik (lerp cepat)
TILT_DOWN:       +55 deg     # rotasi saat jatuh (lerp lambat) — juice khas Flappy
FLAP_COOLDOWN:   90 ms       # anti spam-double-tap jadi terbang lurus
hitbox:          w=20 h=16   # LEBIH KECIL dari sprite (fair) — offset ke tengah badan
X_COLUMN:        BW * 0.30   # burung diam di kolom ini; dunia yang bergerak
```
- **Tap** (pointerdown / Space / klik area main) → `body.setVelocityY(FLAP_IMPULSE)` +
  `SFX.flap()` + squash-stretch + kepak sayap (anim frame).
- **Rotasi** = lerp ke target berdasarkan `velocity.y` (naik→hidung ke atas, jatuh→menukik).

### 4.3 State machine
```
        tap                    velocity.y > 40
  IDLE ─────► FLAP_UP ───────────────────────► GLIDE_DOWN
   ▲            │  (kepak 2 frame)                │
   │            └────────── tap ─────────────────┘
   │                                             │ tabrak
   └──────── respawn (invuln 1.2s) ◄──── HURT ◄──┘
                                          │ (blink, knockback ringan)
   AUTO (Masteran aktif): FLAP otomatis tiap ~520ms → GACOR_GLIDE
```
Anim per-state WAJIB (bukan sprite statis):
`bird_flap` (2–3 frame kepak), `bird_glide` (sayap terbuka), `bird_hurt` (merah + bulu
beterbangan), `bird_gacor` (glow + aura, saat Gacor/ngeplong).

### 4.4 Input abstraction
Satu layer `input.flap` (edge-triggered): `pointerdown` di kanvas · `keydown Space/ArrowUp/KeyW`
· klik tombol besar `#km-flap` (mobile). Semua → set `flapEdge=true` 1 frame. Cleanup listener
di `onCleanup`.

> **Golden Rule §4:** *Satu tap, satu impuls absolut. Rotasi mengikuti kecepatan. Hitbox lebih
> kecil dari bulu.*

---

## §5 OBSTACLE SYSTEM — Sangkar + Hazard (≥5 tipe)

Flappy inti = 1 obstacle (pipa). Untuk "no dead air" + dunia kicau, kita punya **1 obstacle
utama (sangkar) + ≥5 hazard/varian** dengan peran beda.

| Tipe | Peran | Perilaku | HP/mati |
|---|---|---|---|
| **Sangkar (cage)** | obstacle utama (pengganti pipa) | pasangan jeruji atas+bawah, celah gap; world-fixed, lewat = skor | tak bisa dihancurkan; tabrak = respawn |
| **Sangkar bergerak** | obstacle dinamis | gap naik-turun sinus (amplitudo ≤60px, lambat) | idem |
| **Kucing** | rusher darat | lompat dari tanah saat burung dekat (telegraph 0.6s: mengendap) | tabrak = respawn; bisa dihindari terbang tinggi |
| **Lebah/Tawon** | flyer udara | melayang di jalur, bergerak sinus pelan | tabrak = respawn |
| **Ranting/Jemuran** | hazard statis sempit | palang horizontal di ketinggian acak (celah atas/bawah) | tabrak = respawn |
| **Daun besar** (opsional stage 5) | hazard visual-blocker | menutupi sebagian layar sesaat (tak mematikan, hanya menantang baca) | — |

**Spawn RELATIF-KAMERA (WAJIB — anti bug "off-screen"):** semua sangkar/hazard = **data inert**
di `spawnList` (terurut `triggerX`), di-instantiate jadi entity ber-body **hanya saat
`cam.scrollX + BW ≥ triggerX`**, lahir **di tepi KANAN** layar. Setelah lewat tepi kiri →
`destroy`. (Pola identik `processSpawnPointer` spacewar, sumbu di-swap ke X.)

**Aturan gap (kalibrasi):**
```yaml
GAP_H:      easy 200 · normal 176 · hard 152   # tinggi celah (kanonik 140–180)
GAP_MARGIN: 70                                 # celah tak pernah mepet tanah/langit
CAGE_DX:    easy 300 · normal 260 · hard 220   # jarak antar-sangkar (px)  (~1.4–1.6× nuansa)
GAP_DRIFT:  maks ±90px antar sangkar berturut  # anti lonjakan gap kejam
```

> **Golden Rule §5:** *Sangkar = pipa berjeruji. Hazard lain memperkaya, bukan menggantikan
> ritme celah. Semua lahir di tepi kanan saat kamera mencapainya — tak pernah aktif off-screen.*

---

## §6 INTERACTION & COLLISION MATRIX

| A \ B | Sangkar/jeruji | Tanah | Langit | Kepingan 💌 | Power-up | Hazard (kucing/lebah/ranting) |
|---|---|---|---|---|---|---|
| **Burung** | tabrak→respawn* | tabrak→respawn* | pantul lembut (no die) | overlap→collect+unlock | overlap→apply | tabrak→respawn* |

`*` respawn hanya jika **tidak** invuln & **tidak** cheat & **tidak** ngeplong(Gacor penuh).
Semua interaksi = **overlap** (bukan collider solid), hit-check manual per-frame untuk sangkar
(anti-tunnel saat scroll cepat). i-frame respawn = 1.2s (easy 1.4s).

- **Collect kepingan:** idempotent (`taken` guard), sekali per kepingan. → `unlockInfo(key)`.
- **Skor:** +1 tiap **melewati** bidang-X tengah sangkar (bukan saat spawn). Pintu skor =
  garis tak-terlihat di `cage.x`, di-flag `scored` sekali.

> **Golden Rule §6:** *Semua overlap, hit sangkar dicek manual tiap frame; langit memantul, tak
> membunuh.*

---

## §7 POWER-UP / ITEM SYSTEM (jargon kicau) + GACOR METER

> **Kepingan undangan BUKAN power-up** (aturan §6.5 skill). Power-up di bawah murni gameplay.
> **Powerup Relevance Rule:** tiap power-up ofensif/defensif harus punya **usage window** —
> jangan taruh Voer/Masteran tepat sebelum gerbang finish tanpa hazard sesudahnya.

| Power-up | Jargon | Efek | Durasi | Visual |
|---|---|---|---|---|
| **Voer** (extra fooding) | 🥣 | **Shield 1× tabrakan** (menyerap 1 hit, lalu hilang) | sampai kena | aura hijau lembut di burung |
| **Jangkrik** | 🦗 | **Boost**: scroll melambat 25% + skor ×1.5 (lebih mudah baca gap) | 4s | trail kuning + speed-line |
| **Masteran** | 🎼 | **Auto-flap "gacor"**: burung terbang otomatis stabil di tengah gap | 3.5s | glow + not-balok mengelilingi |

### 7.1 GACOR METER (fitur khas)
- Bar horizontal di HUD atas. **+1 tiap lewat sangkar.** Penuh di **8 sangkar** (easy 6).
- **Penuh → burung "NGEPLONG"** (mode klimaks singkat, 5s): **kebal** + **skor ×2** + trail
  emas + SFX ngeplong. Setelah 5s meter reset ke 0.
- **Reset ke 0 saat tabrak** (kehilangan momentum "gacor") — insentif jangan asal nabrak.
- **WHY:** memberi combo tematik ("burung makin gacor") tanpa mengubah kontrol inti.

### 7.2 Distribusi power-up
- Muncul sebagai item melayang (beda visual dari 💌). Spawn di breather/gauntlet sesuai
  beat-sheet. Cadence ≥1 power-up per ~2 layar di stage ≥2.

> **Golden Rule §7:** *Voer menjaga, Jangkrik memudahkan, Masteran mengambil alih. Gacor Meter
> mengubah rajin-lewat jadi klimaks kebal.*

---

## §8 DIFFICULTY SCALING (undangan = RAMAH)

Tiga level sebagai **knobs**, bukan gap kejam:
```yaml
easy:   { scroll: 150, GAP_H: 200, CAGE_DX: 300, invulnMs: 1400, gacorNeed: 6, hazardRate: 0.6 }
normal: { scroll: 180, GAP_H: 176, CAGE_DX: 260, invulnMs: 1200, gacorNeed: 8, hazardRate: 1.0 }
hard:   { scroll: 210, GAP_H: 152, CAGE_DX: 220, invulnMs: 1000, gacorNeed: 8, hazardRate: 1.4 }
```
- **TANPA nyawa / TANPA game-over.** Tabrak = respawn lembut (§12). Skor stage **tidak** hangus.
- Kesulitan naik **antar-stage** via `scroll` (kanonik Flappy: speed naik, bukan gap runtuh)
  + `hazardRate`. Kurva **sawtooth** (gauntlet↑ breather↓), bukan ramp lurus.
- Jatuh ke tanah = respawn ke **checkpoint aman** (sangkar terakhir yang dilewati − 1), bukan
  awal stage.

> **Golden Rule §8:** *Naikkan kecepatan, jangan tutup celah. Gagal itu lembut.*

---

## §9 CAMERA & READABILITY (side-scroll horizontal)

- Burung **diam di X** (`BW*0.30`); **kita gerakkan `cam.scrollX` manual** (bukan startFollow) —
  world scroll ke kiri, sama pola auto-scroll spacewar (sumbu di-swap). `scrollSpeed = diff.scroll`.
- Burung di **~30% dari kiri** → pandangan **depan (kanan) luas** untuk baca gap berikutnya.
  JANGAN di tengah (waktu-baca gap berkurang). Batas ~0.35.
- **Deadzone vertikal:** tidak ada follow-Y; burung bebas naik-turun dalam frame (Flappy).
- **Readability:** tiap sangkar punya **garis tepi celah** kontras + highlight gap; hazard punya
  **telegraph** (kucing mengendap 0.6s, lebah berbunyi). No blind obstacle: sangkar pertama
  setelah respawn selalu gap lebar.
- **camera.shake** hanya saat tabrak (intensity ~0.008, 120ms) — jangan strobe tiap skor.

> **Golden Rule §9:** *Burung di ⅓ kiri, mata ke depan. Scroll manual ke kiri. Setiap ancaman
> ditelegraf.*

---

## §10 GAME FEEL / JUICE + GRAFIS + TRANSISI SINEMATIK

### 10.1 Juice (stack di frame impact yang sama)
- **Flap:** squash-stretch (scaleY 1.15→1.0 dalam 90ms) + partikel bulu kecil + `SFX.flap`.
- **Skor lewat sangkar:** angka "+1" pop kecil di gap + chirp naik + Gacor bar isi.
- **Collect 💌:** freeze 3 frame + `camera.flash(0xffe08a,90)` + heart/confetti burst +
  `SFX.collect` + teks "KICAU MANIA" (APPENDIX X).
- **Tabrak:** freeze 4 frame + `camera.shake(120,0.008)` + bulu berhamburan + `SFX.hit`.
- **Ngeplong (Gacor penuh):** flash emas + trail + `SFX.gacor`.
- Partikel **API 3.60+**: `this.add.particles(x,y,key,{...})` — JANGAN `createEmitter()`.

### 10.2 Grafis prosedural (di-shade, bukan flat)
Tiap sprite = base + highlight (atas ~22%) + shadow (bawah ~22%) + outline gelap; siluet unik.
Helper `vgrad/glow/poly/roundBody` (clone dari spacewar `buildTextures`). Gaya **bubble-cartoon
kalem**: warna hangat, outline tebal lembut, tanpa gradient neon berlebih.
- **Burung:** badan bulat, paruh oranye, mata besar, jambul, sayap 2–3 frame. Warna murai
  (biru-hitam) / lovebird (hijau-kuning) — pilih 1 default, sisanya via tuner.
- **Sangkar:** jeruji emas/bambu melengkung atas+bawah, dasar bulat, celah terang.
- **Kepingan 💌:** sangkar-emas mini dengan pita hati + glow gold (BUKAN amplop, agar khas kicau).

### 10.3 Transisi antar-stage SINEMATIK (bukan pause+tombol)
Pola `clearSeq` state-machine di `update()` (clone spacewar):
`banner "STAGE CLEAR" in-canvas` → burung **auto-terbang keluar layar kanan** (`autoFly`, input
terkunci, kebal) → stage baru auto-`loadSector` → burung **masuk dari kiri** (tween). Scene tetap
jalan; dunia dibekukan selama outro.

> **Golden Rule §10:** *Setiap tap & tabrak berbunyi & bergerak. Transisi terbang sendiri, bukan
> tombol "Lanjut".*

---

## §11 AUDIO DESIGN (SFX game — Web Audio internal)

Ganti daftar `SFX.*` spacewar dengan set Flappy-kicau (oscillator `blip()`):
```js
SFX = {
  flap:    () => blip(520, 0.05, 'square',  0.03, 700),   // kepak (naik cepat)
  score:   () => blip(880, 0.06, 'sine',    0.04, 1180),  // chirp "poin"
  collect: () => { blip(660,0.10,'sine',0.05,990); setTimeout(()=>blip(1040,0.12,'sine',0.05,1400),90); }, // kepingan (2 nada)
  power:   () => blip(700, 0.10, 'triangle',0.05, 1200),  // ambil power-up
  gacor:   () => [740,880,1046].forEach((f,i)=>setTimeout(()=>blip(f,0.12,'square',0.05),i*90)), // ngeplong
  hit:     () => blip(200, 0.18, 'sawtooth',0.06, 70),    // tabrak
  win:     () => [523,659,784,1046].forEach((f,i)=>setTimeout(()=>blip(f,0.18,'square',0.05),i*120)),
};
```
- **Mute SFX** toggle (persisted `km_sfx_muted`) — tombol di HUD.
- **Backsound tenant = milik host.** Tema **TIDAK** `audio.play()`. Hanya mirror `#btn-toggle-music`
  (APPENDIX Z). SFX game via Web Audio bebas.

> **Golden Rule §11:** *Kepak & kicau dari Web Audio; lagu Kicau Mania dari host.*

---

## §12 ANTI-FRUSTRATION RULES

- **Flap buffer:** tap ≤120ms sebelum burung "siap" tetap ter-registrasi (tak hilang).
- **Respawn aman:** jatuh/tabrak → muncul kembali di **checkpoint sangkar terakhir − 1**, gap
  lebar, invuln 1.2s, dunia jeda 0.4s (beri napas). **BUKAN** awal stage / di atas hazard.
- **No spawn-kill:** sangkar/hazard pertama setelah respawn selalu gap lebar + tanpa hazard 1 layar.
- **Ceiling pantul (no die):** menyentuh langit-langit memantul, tak membunuh (Flappy asli
  membunuh — terlalu kejam untuk undangan).
- **Telegraph:** kucing mengendap 0.6s, lebah berdengung sebelum masuk jalur.
- **Kepingan tak pernah di balik hazard mustahil:** selalu ada jalur aman ke 💌.

> **Golden Rule §12:** *Gagal = mundur selangkah + kebal sejenak, bukan pengusiran.*

---

# APPENDIX A — PATTERN LIBRARY (≥24 pola sangkar)

Pola ber-ID. Tiap pola: layout (ASCII, `▓`=jeruji, ` `=celah, `💌`=kepingan, `★`=item,
`^`=hazard), purpose, rules, chaining. Satuan horizontal = "kolom sangkar".

**Gap tunggal (fondasi):**
- **C001 GAP_TENGAH** — celah di tengah. `▓/ /▓`. Purpose: baseline. Rule: gap = `GAP_H`.
- **C002 GAP_ATAS** — celah tinggi (burung naik). Rule: gap-center di 30% atas.
- **C003 GAP_BAWAH** — celah rendah. Rule: gap-center di 30% bawah.
- **C004 GAP_LEBAR** (teach/breather) — gap 2.2× burung. Rule: hanya safe-zone / pasca-respawn.

**Rangkaian ritmis (chain):**
- **C010 TANGGA_NAIK** — 3 gap: tengah→atas→lebih atas. Purpose: latih naik bertahap.
- **C011 TANGGA_TURUN** — kebalikan.
- **C012 ZIG_ZAG** — atas→bawah→atas (drift ≤90px). Purpose: puncak gauntlet.
- **C013 RAPAT_RITMIS** — 4 gap `CAGE_DX×0.8`, gap sama tinggi (sinkron beat lagu). Purpose:
  final stretch.

**Sangkar dinamis:**
- **C020 SANGKAR_GERAK** — 1 sangkar gap bergerak sinus ±50px. Rule: amplitudo turun di easy.
- **C021 GERBANG_GANDA** — 2 sangkar sangat dekat, gap selang-seling. Hard only.

**Dengan hazard (2 bidang):**
- **C030 KUCING_LOMPAT** — gap normal + `^kucing` di tanah bawah gap. Purpose: paksa jaga tinggi.
- **C031 LEBAH_JALUR** — gap + `^lebah` melayang di jalur ideal. Purpose: paksa reroute.
- **C032 RANTING_SILANG** — palang horizontal + gap sempit. Purpose: presisi.
- **C033 KUCING+LEBAH** — darat+udara simultan. Hard, pasca power-up.

**Dengan reward:**
- **C040 KEPINGAN_TENGAH** — gap lebar + `💌` di tengah celah (mudah). Untuk kepingan awal.
- **C041 KEPINGAN_PUNCAK** — `💌` di titik tertinggi lintasan (butuh timing/Gacor).
- **C042 KEPINGAN_KAWAL** — `💌` + 2 `^` escort. Untuk kepingan telat-stage.
- **C043 NOTBALOK_TRAIL** — deret `★`skor di kurva lompat ideal (filler). Isi ruang mati.
- **C044 VOER_BREATHER** — gap lebar + `★Voer`. Pasca gauntlet.
- **C045 JANGKRIK_GAUNTLET** — `★Jangkrik` tepat sebelum rapat-ritmis (usage window).
- **C046 MASTERAN_PUNCAK** — `★Masteran` sebelum zig-zag sulit.

**Struktur/landmark (non-collide bg):**
- **C050 TENDA_LOMBA** — landmark midground (stage 2). **C051 TIANG_GANTANGAN** (stage 3).
- **C052 POHON_RINDANG** (stage 5). **C053 PANGGUNG_PIALA** (stage 6, finish).

**Pattern Chain Rules:**
- Jangan >2 pola **sama** berturut (mis. maks 2 `C013` lalu wajib beda).
- Setiap gauntlet (rapat/hazard) **wajib** didahului breather/power-up ≤2 layar sebelumnya.
- Kepingan **tak pernah** di dalam `C021`/`C033` (hindari kepingan di balik hazard mustahil).
- Setelah `C004` (gap lebar) minimal 2 gap normal sebelum gauntlet lagi.

**Level Generation Formula (% pola per difficulty):**
```
easy:   50% gap-tunggal · 25% tangga · 10% hazard · 15% reward
normal: 35% gap-tunggal · 25% tangga/zigzag · 25% hazard · 15% reward
hard:   25% gap-tunggal · 30% zigzag/rapat · 30% hazard · 15% reward
```

> **Golden Rule A:** *Rangkai gap seperti frasa lagu: tanjakan, jeda, klimaks. Jangan ulang
> frasa sama >2×.*

---

# APPENDIX B — ENTITY ENCYCLOPEDIA

```yaml
bird:                      # player
  hp: none (respawn model)
  gravity: 1000
  flap_impulse: -360
  max_fall: 620
  hitbox: {w: 20, h: 16}
  states: [idle, flap_up, glide_down, hurt, gacor_glide]
  anims: [bird_flap(2-3f), bird_glide, bird_hurt, bird_gacor]

cage:                      # obstacle utama (pipa)
  kind: static-world
  gap_h: {easy:200, normal:176, hard:152}
  collide: bird→respawn
  score_gate: +1 saat bird.x melewati cage.x (flag scored)
  anim: jeruji shimmer halus (opsional)

cage_moving:
  extends: cage
  motion: gap_center += sin(t)*amp (amp ≤60, easy ≤40)

kucing:                    # hazard darat (rusher)
  spawn: dari tanah, telegraph mengendap 0.6s
  behavior: lompat parabola saat bird dekat (dx<160)
  collide: bird→respawn
  anim: [kucing_crouch, kucing_jump]

lebah:                     # hazard udara (flyer)
  behavior: melayang sinus pelan di jalur, dx menutup lambat
  collide: bird→respawn
  anim: [lebah_fly(2f sayap)]

ranting:                   # hazard statis
  kind: palang horizontal + gap sempit atas/bawah
  collide: bird→respawn

kepingan (piece 💌):        # BUKAN power-up
  kind: collectible
  visual: sangkar-emas mini + pita hati + beacon ring pulse + ★ marker
  on_collect: unlockInfo(key) + "KICAU MANIA" per-kata + nama mempelai (APPENDIX X)
  guard: taken (idempotent)

powerups:
  voer:      {effect: shield 1 hit, visual: aura hijau}
  jangkrik:  {effect: scroll -25% & score x1.5, dur: 4s}
  masteran:  {effect: auto-flap stabil, dur: 3.5s}

notbalok (skor filler ★):
  on_collect: +skor kecil, isi ruang mati (C043)
```

> **Golden Rule B:** *Setiap entitas satu peran & satu siluet. Kepingan glowing gold, hazard
> ber-telegraph, power-up ber-warna-jargon.*

---

# APPENDIX C — BIOME / STAGE LIBRARY (6 stage)

Semua background **ilustrasi kartun digambar engine** (bukan foto upload). Sky palet per-stage
+ **≥3 lapis parallax** (`scrollFactor` 0.2 / 0.45 / 0.7) + kuota prop (§3.4). Rebuild per stage.

| Stage | Nama | Latar (di-scene) | Palet | Enemy pool | Kepingan? |
|---|---|---|---|---|---|
| 1 | **Mandi Pagi** | orang **memandikan burung** (ember, semprotan, jemuran sangkar) | kuning pagi lembut + biru | kucing (jarang) | ✅ ~1/3 kepingan |
| 2 | **Arena Lomba** | orang **lomba burung** (tenda, gantangan awal, juri, penonton kartun) | jingga hangat + hijau | kucing, lebah | ✅ ~1/3 |
| 3 | **Gantangan** | **burung berjejer digantang** di tiang panjang | biru langit + emas | kucing, lebah, sangkar-gerak | ✅ sisa kepingan (terakhir → undangan siap) |
| 4 | **Pasar Burung** (bonus) | los pasar, sangkar bertumpuk, pedagang | coklat-hangat + merah | lebah, ranting | ❌ bonus skor |
| 5 | **Alam Liar** (bonus) | hutan/pohon rindang, kupu-kupu, kabut tipis | hijau teduh | lebah, daun-blocker | ❌ bonus |
| 6 | **Panggung Juara** (bonus/finale) | panggung piala, konfeti, spanduk juara | emas-ungu meriah | sangkar-gerak, gerbang-ganda | ❌ finale bonus |

**Physics modifier per biome (opsional):** stage 5 (alam liar) angin lembut → sedikit drift-X
prop (bukan mengubah kontrol burung).

**Backdrop wajib PADAT** (anti "dekorasi kurang"): tiap layar = 1 far (siluet bukit/langit) +
1–2 landmark (tenda/tiang/pohon/panggung) + 2–4 foreground prop (rumput/ember/batu/sangkar hias
non-collide) + ≥1 ambient (daun jatuh/kupu-kupu/air ember/konfeti).

> **Golden Rule C:** *Enam dunia hobi kicau, tiga berkepingan; tiap layar penuh prop hidup, tak
> pernah kanvas kosong.*

---

# APPENDIX D — CLIMAX SYSTEM (bukan boss)

Tema ini **tidak punya boss**. Dua pemicu klimaks (keduanya wajib, urutan bebas):

### D.1 Trigger #1 — Semua kepingan terkumpul (akhir Stage 3)
- Saat kepingan terakhir diambil → `announceAllCollected()`:
  1. **beat meriah ~4.5s**: `scene.celebrate('pieces')` — flash + confetti burung + SFX.win +
     teks "KICAU MANIA" besar.
  2. lalu overlay `#km-allpieces` (guard `STORE.announcedAll`): *"Semua kepingan
     `groom_nickname` & `bride_nickname` terkumpul — undangan siap dibuka!"* + tombol
     **Buka Undangan** / **Lanjut Main**.
- Setelah ini tombol **💌 buka undangan** aktif permanen.

### D.2 Trigger #2 — Tamat Stage 6 (finale bonus)
- Menyentuh **GERBANG PANGGUNG JUARA** di akhir stage 6 → `finaleReached()`:
  1. beat ~5s: `scene.celebrate('finale')` — panggung piala + konfeti + burung "ngeplong" +
     **canvas couple** reveal (mempelai + burung juara).
  2. overlay `#km-win` (guard `STORE.completed`): *"Selamat! `groom_nickname` & `bride_nickname`
     jadi juara Kicau Mania — terbang bersama selamanya."* + **Buka Undangan** / **Tutup**.
- **Tahan kedua urutan:** kepingan bisa lengkap sebelum stage 6 (umum), atau tamat stage 6
  tanpa kepingan lengkap (kalau tamu skip via cheat) — kedua guard independen.

### D.3 Panggung Juara (finish stage 6) — bukan HP-boss
- Bukan pertarungan. Gerbang piala = **garis finish besar** dengan animasi konfeti + burung
  couple. Tak ada HP bar. (Aturan boss walk-in/HP-bar di skill TIDAK berlaku — arketipe ini
  tanpa boss; dicatat sebagai keputusan sadar.)

> **Golden Rule D:** *Klimaks kicau bukan bunuh boss — melainkan kepingan lengkap & jadi juara.
> Dua guard, dua perayaan, urutan bebas.*

---

# APPENDIX E — VALIDATOR ENGINE

### E.1 Playability checklist (gate keras)
- `finishReachable` — ada rangkaian tap yang melewati semua sangkar (uji: tiap gap-drift ≤90px,
  gap ≥ `GAP_H`, `CAGE_DX` ≥ minimal jarak-reaksi = `scroll × 0.35s`).
- `allPiecesReachable` — tiap 💌 punya jalur aman (tak di balik `C021/C033`, ada gap masuk).
- `noSpawnKill` — pasca-respawn: 1 layar tanpa hazard, gap lebar.
- `noImpossibleGap` — dua sangkar berturut: `|gapCenterΔ| ≤ FLAP_reach(CAGE_DX)`.
- `safeCeilingFloor` — gap selalu ≥`GAP_MARGIN` dari tanah & langit.

### E.2 Validator DENSITY "NO DEAD AIR" (WAJIB, regen segmen gagal)
```js
// SEG = 1 viewport (BW). Iterasi kontigu sepanjang STAGE_LEN.
function validateDensity(stage, BW, opts) {
  var fails = [];
  for (var x = stage.startX; x < stage.endX; x += BW) {
    var seg = stage.window(x, x + BW);
    var combat = !seg.isSafeZone;
    if (combat && seg.count('cage')       < opts.minObstaclesPerScreen) fails.push([x,'obstacle']);
    if (combat && seg.count('hazard')     < opts.minHazardPer2Screen/2) fails.push([x,'hazard']);
    if (seg.count('parallax_far')  < 1)   fails.push([x,'far']);
    if (seg.count('landmark_mid')  < 1)   fails.push([x,'landmark']);
    if (seg.count('prop_fore')     < 2)   fails.push([x,'prop']);
    if (seg.count('ambient')       < 1)   fails.push([x,'ambient']);
    if (seg.largestEmptyRun('cage|item|hazard|prop') > opts.maxDeadPx) fails.push([x,'deadair']);
  }
  if (stage.maxRewardGap() > opts.rewardEveryPx) fails.push(['*','reward-gap']);
  return fails; // kosong = lolos; else REGENERATE segmen tsb
}
var DENSITY = {
  minObstaclesPerScreen: 1,               // ≥1 sangkar/layar (zona tempur)
  minHazardPer2Screen:   1,               // ≥1 hazard/2 layar (stage ≥2)
  minPropPerScreen:      2,
  maxDeadPx:      Math.round(BW * 0.75),
  rewardEveryPx:  Math.round(BW * 2.5),
};
```

### E.3 Scoring (lulus ≥80/100)
`playable(30) + fun(20) + fair(20) + rewarding(15) + discovery(15)`. Density gagal =
skor otomatis < lulus (regen dulu).

> **Golden Rule E:** *Segmen yang bisa dilewati tanpa tap berarti / tanpa prop bergerak =
> GAGAL, regenerate. Validator jalan di pipeline, bukan harapan.*

---

# APPENDIX F — GENERATION ALGORITHM

```
buildStage(idx):
  1. set biome(idx) → palet, enemy pool, landmark set (APPENDIX C)
  2. build SPINE: SAFE(1.5 layar) → beat-sheet §3.3 di-parametrik ke STAGE_LEN
  3. fill PATTERNS: pilih pola APPENDIX A per Level-Generation-Formula(diff),
     hormati Chain Rules (no >2 sama; breather sebelum gauntlet)
  4. place ENTITIES: sangkar/hazard → spawnList (triggerX terurut, RELATIF-KAMERA)
  5. validateDensity → FIX/REGEN loop (sisip prop/hazard/reward sampai lolos)
  6. place PIECES: infosForSector(idx) via quota deterministik (APPENDIX X);
     tiap 💌 pakai C040/C041/C042, dijamin allPiecesReachable
  7. fill FILLER: ruang mati → notbalok-trail (C043) / prop ambient
  8. validate PLAYABILITY (E.1) → jika gagal, regen segmen terkait
  9. sort spawnList by triggerX ASC; set finishX = STAGE_LEN
```
**Master instruction (generate stage baru):** "Bangun spine dari beat-sheet §3.3, isi pola
sesuai formula difficulty & chain-rules, tempatkan sangkar/hazard sebagai data `triggerX`,
jalankan `validateDensity` sampai lolos, baru tempatkan kepingan deterministik + filler skor,
lalu validasi playability."

> **Golden Rule F:** *Spine → pola → entity → DENSITY-GATE → kepingan → filler → PLAYABILITY-GATE.
> Density gate bagian pipeline, bukan opsional.*

---

# APPENDIX T — TECHNICAL FOUNDATION (Phaser 3.80.1)

- **Boot aman:** ukur `#gw-stage` via `getBoundingClientRect()`, pass **width/height tetap** ke
  config. JANGAN baca `scale.width` di `create()`. `showError()` on-screen bila Phaser gagal.
- **Config:** `type:AUTO`, `parent:'gw-stage'`, `render:{pixelArt:false,antialias:true}` (kalem
  smooth), `scale:{mode:FIT,autoCenter:CENTER_BOTH}`, **`physics:arcade, gravity:{y: GRAV}`**
  (beda dari spacewar y:0 — Flappy butuh gravitasi dunia).
- **Bird body:** `setAllowGravity(true)`, hitbox kecil via `setSize/setOffset`.
- **Pooling:** `this.physics.add.group` untuk sangkar/hazard/kepingan/power-up; `get()/killAndHide()`.
- **Procedural texture:** `make.graphics` + `generateTexture` + guard `textures.exists(key)`.
- **Anim:** `anims.create({key,frames,frameRate,repeat})` guard `anims.exists`; `bird_flap` dll.
- **Partikel API 3.60+:** `this.add.particles(0,0,'t_feather',{...emitting:false}).explode(n,x,y)`.
- **Input:** `this.input.on('pointerdown', flap)` + keyboard + tombol `#km-flap`. Cleanup semua.
- **Cleanup kritikal:** `GAME.destroy(true)` + hook global `window.__gwCleanup` (APPENDIX Z).
- **Hot-load antar-stage:** JANGAN `destroy+new P.Game` sinkron (deferred → blank). Reuse scene,
  `loadSector(idx)` (pola spacewar `startRun`).

> **Golden Rule T:** *Gravitasi dunia ON, ukuran diukur bukan ditebak, texture di-guard, cleanup
> wajib.*

---

# APPENDIX S — SINGLE-FILE ARCHITECTURE

- 3 file `index.html` + `index.css` + `index.js`, IIFE, tanpa bundler. Clone kerangka spacewar.
- Lapisan logis walau monolitik: `CONFIG` (semua angka) · helpers DOM/binding (`val/srcVal`) ·
  wedding-layer (`scanInfos/quota/unlock/reveal`) · `Bird` class · `GameScene` factory ·
  generator (`buildStage/populateStage`) · host-contract (cleanup/music/cheat/celebration).
- `ensurePhaser()` fallback CDN. **Prefix ID tema = `km-`** (mis. `km-flap`, `km-inv`,
  `km-star-btn`, `km-reveal`, `km-modal-body`). **Global cleanup = `window.__gwCleanup`**
  (konsisten dgn spacewar/metalslug).
- **GROUND (mobile):** `GROUND_Y = BH − (isTouch ? 96 : 72)`; tombol besar `#km-flap` di zona
  bawah tak menutupi burung (burung di kolom ~30% kiri, tinggi bervariasi — tap area = seluruh
  kanvas + tombol backup).

> **Golden Rule S:** *Satu file, angka terpusat di CONFIG, prefix `km-`, cleanup `__gwCleanup`.*

---

# APPENDIX P — ASET PNG (SPRITE SHEET) + SPRITE TUNER + ASSET ADJUSTER

Default **prosedural**; PNG sheet = opsi override (clone mekanisme SHEET_MAP spacewar). **5
kelompok sheet** (bila dibuat): player(burung) · enemy(kucing/lebah/ranting) · environment
(sangkar/tanah/landmark) · game-object(power-up voer/jangkrik/masteran) · box-kepingan(💌 +
notbalok). Frame ≥80×80, JSON per-kelompok + `ASSET.md`, frame-map rect eksplisit, downscale ke
key engine, key-out border ungu, urutan upload baku (`{{asset_image_N}}`).

### P.1 SHEET_MAP (ganti isi spacewar → sprite Flappy-kicau)
```
t_bird0/1/2 (kepak) · t_bird_glide · t_bird_hurt · t_bird_gacor
t_cage_top · t_cage_bot · t_cage_move
t_kucing0/1 · t_lebah0/1 · t_ranting
t_piece (💌 sangkar-emas) · t_notbalok
t_voer · t_jangkrik · t_masteran
t_feather (partikel) · t_confetti
t_bg_hill · t_landmark_tenda · t_landmark_tiang · t_landmark_pohon · t_landmark_panggung
```

### P.2 Sprite Tuner (PC dev tool — clone spacewar, akses ★ tersembunyi di side-badge)
`TUNE_SPECS` diganti ke id kicau: `bird, piece, voer, jangkrik, masteran, cage, cage_move,
kucing, lebah, ranting, notbalok, hill, landmark, ambient`. Panel kiri-atas panel kanan
(left:480px, 2 kolom), slider live-apply, tidak mem-pause game, persist `km_tune_v1`, tombol
Salin. **Persis pola metalslug** (wajib per `asset-adjust-skill`).

### P.3 Asset Adjuster (exporter/loader) — clone 1:1 mekanisme spacewar
Exporter menggambar tekstur + border ungu per sel; loader slice PNG upload di rect sama,
key-out ungu, bake ke key. `usingSheetAsset` flag; fallback prosedural bila slot kosong.

> **Golden Rule P:** *Prosedural default; sheet override lewat mekanisme SHEET_MAP yang sama,
> hanya daftar key & tuner-spec yang diganti ke sprite kicau.*

---

# APPENDIX W — WEDDING INTEGRATION (section → kepingan)

### W.1 11 section (dinamis dari `#inv-source`, JANGAN hardcode)
Baca §4 skill. Verifikasi variabel ke `dynamic-variables.md`. `SECTION_TITLE` (clone spacewar):
`hero:Pembuka · couple:Mempelai · rsvp:Konfirmasi · schedule:Acara · streaming:Live Streaming ·
story:Kisah · gallery:Galeri · happiness:Bagikan · wishes:Ucapan · gift:Amplop · closing:Penutup`.

Glyph indikator (tema kicau): `hero:♥ couple:🕊 rsvp:✓ schedule:⌚ streaming:📺 story:📖
gallery:🖼 happiness:📸 wishes:✉ gift:🎁 closing:🏆`; default 💌.

### W.2 Flag pembungkus (di LUAR `<section>`)
`streaming:is_fitur_live_streaming · story:flag_pakai_timeline_kisah · gallery:has_gallery ·
happiness:flag_pakai_additional_feature_story_balasan_instagram · gift:tampilkan_amplop_online`.
`hero/couple/rsvp/schedule/wishes/closing` selalu ada. `{{#if}}` **membungkus** section (bug
kepingan-hantu bila di dalam).

### W.3 Aturan penempatan
- **Section inti (`hero/schedule/rsvp`) di stage AWAL** (Stage 1) — tamu yang berhenti tetap
  dapat info pokok.
- **Kepingan hanya di Stage 1–3.** Stage 4–6 = 0 kepingan (bonus).
- **Kepingan ≠ power-up** (murni koleksi, tanpa buff).
- Variabel dinamis dibaca via `val()` dari teks rendered (bukan atribut).

### W.4 Binding hidup sekali
Semua section ditulis **sekali** di `#inv-source` (hidden) dengan `{{vars}}` + `data-info`.
Modal & full-reveal **clone** dari sana. Form RSVP/ucapan pakai ID host verbatim (APPENDIX Z).

> **Golden Rule W:** *11 section, jumlah kepingan = section riil hasil scan; inti di depan,
> kepingan hanya Stage 1–3, binding sekali.*

---

# APPENDIX X — COLLECTION MECHANIC + teks "KICAU MANIA" per-kata

### X.1 Bentuk kepingan & respons ambil
- **Bentuk:** `t_piece` = **sangkar-emas mini + pita hati**, beacon ring pulse + ★ marker
  (BUKAN amplop — khas kicau). Melayang di celah sangkar khusus (C040/C041/C042).
- **On collect** (overlap burung, guard `taken`): freeze 3f + flash + confetti/heart burst +
  `SFX.collect` + ikon indikator menyala + toast + `unlockInfo(key)` + **animasi terbang ke
  inventory** + **teks KICAU MANIA** (X.3). **NO auto-open modal** (aturan skill).

### X.2 Quota per-stage + auto-scale (deterministik)
Kepingan hanya Stage 1–3. `quotaShape` (6 stage): **`[0.40, 0.35, 0.25, 0, 0, 0]`** dari total
section riil `N` (dibulatkan, sisa didistribusi ke stage 1→3). Contoh `N=11` →
`[4,4,3,0,0,0]`. Contoh `N=8` (beberapa flag off) → `[3,3,2,0,0,0]`. `infosForSector(idx)` =
slice kontigu (bukan counter berjalan) → tahan cheat stage-jump.

### X.3 Teks "KICAU KICAU KICAU MANIA" per-kata (fitur signature)
Saat kepingan diambil, tampilkan **overlay teks in-canvas** bergaya bubble graffiti (pink
magenta + outline hitam tebal + drop-shadow miring, meniru referensi video klip):

```
Sekuens (total ~2.4s), tiap kata pop berurutan:
  t=0.00  "KICAU"   (pop scale 0.6→1.15→1.0, 260ms, Back.out) + chirp
  t=0.30  "KICAU"   (idem, sedikit rotasi beda)
  t=0.60  "KICAU"
  t=0.90  "MANIA"   (lebih besar, warna emas, +confetti)
  t=1.30  "<groom_nickname> & <bride_nickname>"  (fade-in dari bawah, font script kalem)
  t=2.40  seluruh grup fade-out (600ms)
```
- Implementasi: `this.add.container` scrollFactor 0, depth tinggi; tiap kata = `add.text`
  dengan style graffiti (fontFamily bold, stroke hitam ≥6, shadow). Nama mempelai via
  `val('groom_nickname','Mempelai')` & `val('bride_nickname','Mempelai')` — **dinamis**.
- **Guard anti-spam:** kalau 2 kepingan diambil <2.4s, antre (jangan tumpuk); atau percepat
  kata jika beruntun.
- **Kalem:** meski meriah, warna di-desaturasi ~15% & durasi tak mengganggu gameplay (burung
  tetap jalan; overlay tak menutup gap yang sedang dilalui — taruh di ⅓ atas layar).

### X.4 Filler skor
Sisa ruang mati / quota kosong → **notbalok-trail (C043)** di kurva lompat ideal (skor kecil),
menjaga kepadatan tanpa menambah kepingan.

> **Golden Rule X:** *Ambil kepingan = "KICAU KICAU KICAU MANIA" per-kata + nama mempelai, ikon
> menyala, TANPA auto-open. Quota Stage 1–3 deterministik & auto-scale.*

---

# APPENDIX Y — CHEAT SYSTEM + RESET PENUH

### Y.1 Cheat ★ (satu flag, dua ranah — clone spacewar)
- Toggle `#km-star-btn`. **ON:**
  - **Undangan:** `unlockAll()` → semua kepingan menyala + tombol buka undangan aktif.
  - **Game:** burung **kebal** (tabrak diabaikan), **semua stage** terbuka (stage-select),
    bebas pilih kesulitan.
- **NOT persisted** (default) — reload kembali ke mode jujur; tapi **kepingan yang sudah
  dibuka tetap** (persisted). Skor **beku** saat cheat (tak masuk best).
- Guard cheat-bypass: cek `bird.cheat` di semua jalur damage/respawn (audit blind spot).

### Y.2 Reset PENUH (bukan sebagian)
Tombol `#km-reset-btn` → overlay konfirmasi (bukan `confirm()`). Ya →
`resetStore()` (wipe localStorage **termasuk kesulitan→normal**) + `GAME.destroy(true)` (stage
reset) + reset cheat/run + **kembali ke COVER pilih kesulitan lagi**. Verifikasi di harness.

### Y.3 Persist
Persisted: `unlocked[]`, `maxSector`, `best`, `diff`, guard `announcedAll`, `completed`.
NOT persisted: `cheat`. (Identik spacewar.)

> **Golden Rule Y:** *Cheat = kebal + semua kepingan + semua stage, tak dipersist. Reset = total,
> balik ke cover.*

---

# APPENDIX Z — HOST CONTRACT & WIRING + LAYOUT 2-KOLOM

### Z.1 Cleanup hook (baris awal IIFE)
`if(window.__gwCleanup) __gwCleanup();` → kumpul `cleanupFns` via `onCleanup` → set
`window.__gwCleanup`. Bongkar RAF/listener/`GAME.destroy(true)`. **Idempotent** (re-inject tiap
RSVP/ucapan).

### Z.2 MutationObserver re-inject recovery + repaintSideMenu
Clone `wireReinjectRecovery` + `repaintSideMenu` spacewar (observe parent `.km-shell`,
re-paint: indikator, canvas couple, side-bg, versi, progress, tombol cheat/sfx). WAJIB —
host re-inject DOM tanpa re-run JS → side-menu blank tanpa ini.

### Z.3 Auto-resume — cek cover dulu
`window.__kmStarted = {sector}` bertahan lintas re-inject. Auto-resume **HANYA** bila cover &
reveal **tidak** tampil (bug "START gabisa dibuka"). Hot-load sektor ke scene hidup (bukan
destroy+new).

### Z.4 Music mirror (idempotent — JANGAN play backsound)
`hostMusicPlaying()` baca `#pause-icon`; `setMusic(want)` intent + generation guard + retry,
klik `#btn-toggle-music` hanya bila state host salah. Mirror `#play-icon/#pause-icon`. **Tema
TIDAK `audio.play()`.** ID host **verbatim:** `btn-toggle-music`, `bg-music`, `play-icon`,
`pause-icon`.

### Z.5 RSVP / ucapan (ID verbatim + fallback)
Di modal/reveal: `#btn-submit-kehadiran` → `window.submitRsvp?.()` else fallback lokal;
`#btn-submit-ucapan` + `#wish-name` + `#wish-message` → `window.submitUcapan?.()` else fallback.
`#inv-source` verbatim. `rewireHostFormsInside` clone spacewar.

### Z.6 `{{#if}}` membungkus `<section>` (Z.W.2). Lightbox pakai class sendiri (`.km-gallery-item`).

### Z.7 Layout 2-kolom desktop (frame KIRI + panel undangan KANAN)
```
┌──────────────┬────────────────────────────────┐
│ FRAME GAME   │ PANEL UNDANGAN (kanan, PURE)    │
│ KIRI 480px   │ • <canvas> couple bertema kicau │
│ dipatok      │   (mempelai + burung juara +    │
│ = game +     │    sangkar hias + banner)       │
│ undangan     │ • nama mempelai + tanggal       │
│ scroll       │ • Akad / Resepsi + link MAP     │
│ (satu2nya    │ • 💌 BUKA UNDANGAN LENGKAP      │
│ interaktif)  │   (TANPA tombol game di kanan)  │
└──────────────┴────────────────────────────────┘
```
CSS: `.km-shell{justify-content:flex-start}` · `.km-frame{order:1;flex:0 0 auto;width:480px}` ·
`.km-side{order:2;flex:1}`. Breakpoint 980px; mobile hanya frame; desktop sembunyikan tombol
sentuh. **Canvas couple = Canvas 2D** (bukan Phaser): gambar mempelai (jas/gaun) + **burung
kicau juara** + sangkar hias + banner "JUST MARRIED / JUARA KICAU MANIA" (clone
`drawCoupleCanvas` spacewar, ganti motif ruang→kicau). PRESS START / pilih-kesulitan / kontrol
= di **cover overlay dalam frame**, bukan panel kanan.

### Z.8 HUD map (dalam frame)
```
┌───────────────────────────────────────────┐
│ SKOR 000200      GACOR▮▮▮▯▯      STAGE 1   │ ← HUD info atas
│ ┌───┐                          ┌─┬─┬─┬─┐   │
│ │★  │ icon-button KIRI-ATAS    │♥🕊✓⌚│   │ ← indikator kepingan KANAN-ATAS
│ │💌 │ (★cheat 💌buka           └─┴─┴─┴─┘   │
│ │🎵 │  🎵musik 🔊sfx ⟲reset ▦stage)        │
│ │⟲  │                                      │
│ └───┘        (area terbang)                │
│           🕊  ← burung (kolom 30% kiri)     │
│  ▓▓          ▓▓            ▓▓               │ ← sangkar (obstacle)
│  ══════════ tanah ══════════════════════════│ ← GROUND_Y
│                              ┌────────────┐ │
│                              │   TAP/FLAP │ │ ← tombol flap besar KANAN-BAWAH (mobile)
│                              └────────────┘ │
└───────────────────────────────────────────┘
```
icon-button **kiri-atas** (kolom) · indikator kepingan **kanan-atas** · Gacor meter **atas-tengah** ·
tombol **TAP/FLAP** besar **kanan-bawah** (mobile; PC pakai Space/klik). Target ≥44px, `safe-area-inset`.

### Z.9 Toast/notifikasi
Atas-tengah (~18–35% dari atas), 3–8s, warna+ikon. JANGAN di dasar (ketutupan tombol flap).

### Z.10 Dialog pilih (stage/kesulitan) — tombol OK
Klik opsi = pending, **OK** = commit, ada **Batal**. Jangan auto-apply on-click. (Stage-select
muncul saat cheat.)

### Z.11 Celebration (2 pemicu, beat ~5s, guard sekali-tampil)
`announceAllCollected` (guard `announcedAll`) & `finaleReached` (guard `completed`). Beat meriah
dulu (flash+confetti+SFX.win, ~4.5–5s) baru overlay. Dialog sebut nama mempelai dinamis + CTA
Buka Undangan.

> **Golden Rule Z:** *ID host verbatim, musik mirror idempotent (jangan play), frame KIRI panel
> undangan KANAN, cleanup + re-inject recovery, 2 celebration ber-guard.*

---

## CATATAN VERIFIKASI (untuk tahap 2)
- **Screenshot headless Chrome TIDAK bekerja di mesin ini** — selalu blank. Verifikasi: paste 3
  file ke **Theme Editor** host lalu preview, atau minta user.
- **Logika (fisika flap, gap, collision, spawn relatif-kamera)** boleh diuji **harness Node
  headless** yang menjalankan `update()` asli dengan RAF di-stub.
- Selalu `showError()` on-screen (bedakan "Phaser gagal load" vs "bug logic").
- Waspada **cheat-bypass** (kebal/kepingan bocor ke mode normal) — audit tiap jalur.

## CHECKLIST BIBLE "SELESAI"
- [x] Kerangka §0–§12 + APPENDIX A–F + T/S/P + W–Z lengkap.
- [x] Spesifik-arketipe (Flappy): fisika ber-angka, pattern library ≥24, entity encyclopedia,
      6 biome, collection mechanic + teks per-kata.
- [x] Density "NO DEAD AIR": beat-sheet Flappy + lantai ber-angka + validator regen.
- [x] Aturan ber-angka (gravity 1000, flap -360, gap 152–200, dst).
- [x] Contoh Phaser 3.80.1 benar (partikel 3.60+, gravity dunia, generateTexture guard, cleanup).
- [x] APPENDIX P (5 sheet + tuner + adjuster) + variabel terverifikasi (dynamic-variables.md).
- [x] W–Z: kepingan dinamis Stage 1–3, cheat, 2 celebration, layout 2-kolom, mirror musik, `{{#if}}`
      bungkus section, ID host verbatim, prefix `km-`, cleanup `__gwCleanup`.
- [x] Golden Rule per bagian. Disimpan di `src/sample-theme/kicau-mania-wedding/`.
```
