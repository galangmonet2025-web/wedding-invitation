# JUMPER WEDDING — GAME DESIGN BIBLE

> ## ⚠️ REVISI KONSEP (v2 — override semua bagian di bawah yang bertentangan)
>
> Konsep game diubah oleh user. Poin di bawah **menang** atas teks lama di Bible ini
> (§4, APPENDIX C/D, dll.) yang masih menyebut "melompat berdua" / klimaks di Zona 5:
>
> 1. **Player = MEMPELAI LAKI-LAKI SAJA** (jas, melompat sendiri). BUKAN lagi "couple satu body".
>    Sprite `t_couple_*` sekarang menggambar **groom solo**. Mempelai perempuan **tidak** ikut
>    melompat — ia hanya digambar (`t_bride`) berdiri di altar saat reuni Stage 3.
> 2. **Cerita = groom MENCARI calon istrinya.** Ia ada di **puncak Stage 3** (0-based zone
>    index `CFG.CLIMAX_ZONE = 2`). Klimaks/altar **pindah dari Zona 5 → Stage 3**.
> 3. **Stage 3 = finale utama.** Groom mencapai altar → `activateClimax()` → `showBrideAtAltar()`
>    (bride fade-in) → `announceReunion()`: **kepingan INTI undangan ter-reveal** di sini.
> 4. **Stage 4 & 5 = BONUS opsional.** Undangan inti sudah kebuka setelah Stage 3. Bonus berisi
>    section **nice-to-have** (`gallery`, `story`, `happiness`) yang di-*hold-back*: mereka
>    disortir ke **akhir** array `SECTIONS` (`BONUS_LAST`), jadi ambang koin kumulatifnya
>    paling tinggi → hanya terbuka bila tamu **lanjut main** ke Stage 4-5. `CORE_SECTIONS`
>    (sisanya) reveal di reuni; `coreUnlocked()` (bukan `allUnlocked()`) yang membuka tombol 💌.
> 5. **Stage 3 BUKAN dead-end:** selain altar+`climaxY`, ada **gerbang bonus** di atas altar
>    (`gateY = endY+0.12·BH`) + catch-platform, supaya tamu bisa autoFly lanjut ke Stage 4.
>    Reuni **selalu** fire lebih dulu dari gerbang (verified: `climaxY` lebih rendah dari `gateY`).
> 6. `announceWin()` sekarang hanya untuk **tuntas Stage 5** (bonus finale). Reuni pakai
>    `announceReunion()`. Flag store baru: `STORE.reunited`.
>
> Semua diverifikasi via jsdom + logic harness (ordering reuni-sebelum-gerbang, sorting bonus,
> reveal core-only). Sisa Bible di bawah tetap berlaku untuk mekanik jumper generik.

> ## 🎨 REVISI GRAFIS v3 (extreme visual + motion pass — override art lama)
>
> User minta grafis ditingkatkan ekstrem + "gerakan mendetail di setiap aksi". Semua art
> tetap **prosedural** (`graphics.generateTexture`, tanpa spritesheet/atlas/PNG eksternal) —
> ditingkatkan lewat helper baru di `buildTextures`: `lerpC/vgrad(banded gradient)/orb(radial)/
> glow(halo)/sparkle`. Ringkasan:
>
> - **Groom sprite = 8 pose benar-benar beda** (bukan 3): `drawGroomSprite(o)` memakai resep
>   `{arms,legs,tail,torsoY,mouth,shadow,hurt,celebrate}` → coat-tails mengikuti arah gerak,
>   kaki tuck/split/crouch, jas ber-gradient + lapel + dasi + boutonniere, rambut + wajah.
> - **Animasi frame** (tak ada Phaser AnimationManager) via `stepAnims(dt)`: ticker cycle
>   `getData('anim'){frames,fps,t}` + hover `getData('bob'){base,amp,w,ph}`. Kunci frame baru:
>   `t_ring/1/2/3`(spin), `t_heart/1/2`(pulse), `t_enemy_{bee,bird,stormcloud,ufo}/+1`,
>   `t_shieldbubble,t_star4,t_petal,t_dust`. Bee = wing-flap + patrol vx; bird/ufo/cloud = flap/
>   glow/flash + bob (bukan diam lagi).
> - **Motion per aksi:** stretch berbasis vy (gated `_squashing`), **eased bank** `_leanAngle`,
>   squash-on-land + **dust puff** + **platform dip** + **mount recoil**, collectible **pop +
>   float "+N" text**, **thrust particles** propeller/jetpack, **shield bubble** ikut couple,
>   enemy **defeat spin-corpse** + **hit-flash**, hurt **spin-tumble** (gated `_tumbling`),
>   **gate open bloom**, reunion **cinematic** (bride walk-in + groom celebrate bob + camera
>   zoom punch + petal/star burst).
> - **Backdrop kaya:** sky 3-stop, **matahari/bulan** + glow, **bintang** (zona malam) + twinkle,
>   **bukit siluet**, parallax awan/balon/kelopak/burung yang **drift + wrap** (`stepCamera`).
> - **Canvas desktop** kini **beranimasi** (RAF `_canvasRAF`, terdaftar di disposers): awan
>   drift, hati mengambang, couple sway, sun radial-glow, gown/tux ber-gradient.
>
> **Invarian dijaga:** physics body & hitbox tak berubah bermakna; host contract utuh; flag
> transform `_squashing/_tumbling/_climaxLock` selalu di-reset via `resetCoupleTransforms()`
> saat `killTweensOf(couple)` (buildZone & reachGate) — jangan biarkan killed tween menyisakan
> flag stuck. Powerup state reset tiap stage di `buildZone`. Diverifikasi: `node --check` +
> texkey-coverage harness (semua frame ada) + reunion/climax harness tetap PASS + review
> adversarial (0 CRIT/MAJOR). **Belum diverifikasi visual di editor (mesin ini blank headless).**

> **Tema:** `jumper-wedding` · **Arketipe:** Vertical Jumper / Doodle-Jump-like (auto-bounce) ·
> **Engine:** Phaser **3.80.1** (single-file: `index.html` + `index.css` + `index.js`) ·
> **Mood:** ceria, ringan, romantis — "sang mempelai pria melompat mencari calon istrinya".
>
> **STATUS:** Ini **Bible** (Tahap 1). Ia **men-spec** game & integrasi undangan super-detail.
> **BUKAN** implementasi. 3 file tema di-generate **terpisah** (Tahap 2) dengan Bible ini sebagai
> satu-satunya sumber kebenaran.
>
> **Perbedaan sumbu (BACA DULU — kritikal).** Semua referensi hard-won di skill ini lahir dari
> **side-scroller horizontal** (maju ke KANAN, kamera ikut sumbu-X). Jumper ini **VERTIKAL**
> (naik ke ATAS, kamera ikut sumbu-Y). Karena itu Bible ini secara sadar **mentranspos** tiap
> aturan ke sumbu-Y (lihat kotak "⇄ TRANSPOSE" tiap kali muncul). Contoh: "spawn musuh relatif
> kamera-X, lahir di tepi kanan" → "spawn platform/musuh relatif kamera-**Y**, lahir di tepi
> **atas**"; "kamera dorong player ke kiri ⅖" → "kamera taruh player di **bawah-tengah ~⅗**
> sehingga pandangan ke **atas** (arah naik) luas". Aturan tetap ber-angka; hanya sumbunya diputar.

---

## DAFTAR ISI

- **§0** Meta & elevator pitch
- **§1** Core Principles (7 filosofi)
- **§2** Core Gameplay Loop
- **§3** World / Level Structure (vertikal) + beat-sheet Doodle Jump + validator NO DEAD AIR
- **§4** Player System (couple auto-bounce, state machine, fisika ber-angka)
- **§5** Enemy / Obstacle System (spawn relatif-kamera-Y)
- **§6** Interaction & Collision Matrix
- **§7** Power-up / Item System (spring/trampoline/propeller/jetpack/shield)
- **§8** Difficulty Scaling (zona ketinggian, sawtooth)
- **§9** Camera & Readability (vertikal) + Layout mobile-first + desktop 2-kolom
- **§10** Game Feel / Juice + Grafis (shading, frame-by-frame)
- **§11** Audio Design (SFX only; backsound = host)
- **§12** Anti-Frustration Rules
- **APPENDIX A** Pattern Library (≥28 pola pita platform ber-ID)
- **APPENDIX B** Entity Encyclopedia (YAML)
- **APPENDIX C** Biome / Zone Library (5 zona + parallax)
- **APPENDIX D** Climax System ("Menara Pelaminan" — pengganti boss horizontal)
- **APPENDIX E** Validator Engine (playability + density gate)
- **APPENDIX F** Generation Algorithm (deterministik + regen loop)
- **APPENDIX T** Technical Foundation (Phaser 3.80.1)
- **APPENDIX S** Single-file Architecture + boot aman + ground/kontrol ber-angka
- **APPENDIX P** Aset PNG (5 sprite sheet + JSON + frame-map + urutan upload)
- **APPENDIX W** Wedding Integration (section → kepingan)
- **APPENDIX X** Collection Mechanic (item cincin/hati, quota, no-auto-open)
- **APPENDIX Y** Cheat System + Reset penuh
- **APPENDIX Z** Host Contract & Wiring (ID verbatim, musik, layout)

---

## §0 — META & ELEVATOR PITCH

**Elevator pitch.** Tamu membuka undangan dan menemukan **sepasang pengantin mungil yang memantul
tanpa henti ke atas**, dari satu pijakan ke pijakan berikutnya, menaiki sebuah menara langit
bertema pernikahan. Tamu hanya perlu **memiringkan HP / geser kiri-kanan** untuk mengarahkan
pendaratan. Sepanjang pendakian bertebaran **cincin 💍 dan hati ❤️** yang harus dipungut;
mengumpulkan cukup banyak akan **membuka kepingan informasi undangan** (perkenalan → akad →
resepsi → RSVP → galeri, sesuai section yang benar-benar ada). Di puncak menunggu **"Menara
Pelaminan"** — klimaks perayaan tempat kedua mempelai berdiri di pelaminan, kembang api meledak,
dan undangan lengkap siap dibuka. Tamu yang tak mau bermain menekan **★ Cheat** dan undangan
langsung terbuka penuh.

**Referensi klasik.** Doodle Jump (Lima Sky, 2009) — vertical endless jumper dengan auto-bounce,
horizontal wrap, platform hijau/biru/coklat/putih, power-up (spring/trampoline/propeller/jetpack/
shield), monster & UFO. Kita ambil mekanik kanoniknya, ubah endless → **ber-zona berujung klimaks
undangan**, dan tema visual → pernikahan.

**Arsitektur.** Single-file (3 file), IIFE, Phaser `3.80.1` di-CDN oleh host (`window.Phaser`) +
fallback `ensurePhaser()`. Resolusi internal **potret 540×960**. Tanpa bundler, tanpa import.

**Golden Rule §0:** *Ini undangan yang menyamar jadi jumper yang menyenangkan — bukan jumper
yang kebetulan ada undangannya. Game harus enak dulu (60fps, pantulan renyah, tujuan jelas),
undangan adalah hadiah yang ditemukan dengan memanjat.*

---

## §1 — CORE PRINCIPLES (7 filosofi)

Tiap prinsip: **aturan keras** + **BENAR/SALAH** + **WHY**.

### 1.1 Playability First (game dulu, baru undangan)
- **Aturan:** 60fps di mobile mid-range; pantulan terasa **renyah** (freeze 2–4 frame + squash saat
  mendarat); input latency ≤1 frame.
- **BENAR:** pantulan otomatis konsisten, geser kiri-kanan responsif, kamera naik mulus.
  **SALAH:** frame drop saat banyak partikel; pantulan "nyangkut" karena logika collision salah.
- **WHY:** jumper hidup dari *flow* memantul. Sekali patah, tamu langsung menutup tab.

### 1.2 Teach Before Test (onboarding sunyi)
- **Aturan:** **500px pertama** (zona aman) = platform HIJAU statis rapat, tanpa musuh, tanpa
  celah lebar. Cincin pertama muncul dalam 1–2 pantulan (ajarkan "pungut itu bagus").
- **BENAR:** platform pertama tepat di bawah couple; sekali geser → dapat cincin → toast "💍 +1".
  **SALAH:** langsung platform biru bergerak + musuh di pantulan pertama.
- **WHY:** tamu non-gamer harus paham kontrol tanpa teks panjang.

### 1.3 Fair Challenge (ramah — tanpa game-over klasik)
- **Aturan:** **TIDAK ADA nyawa/game-over yang mengulang dari awal.** Kena musuh = couple
  "terpelanting" (knockback + i-frame ~900ms), **bukan** mati. Jatuh ke bawah layar = **respawn
  aman** ke pijakan terakhir yang dilewati (checkpoint pita), bukan ke dasar zona. Lihat §12 & §8.
- **WHY:** undangan, bukan skill-game hardcore. Tamu **selalu bisa maju**. (⇄ transpose dari
  hard-won §17: "jatuh jurang → respawn ke titik aman".)

### 1.4 Readability (keterbacaan vertikal)
- **Aturan:** siluet couple unik & selalu terlihat; platform kontras terhadap langit; **pendaratan
  berikutnya selalu tampak saat takeoff** (no blind jump ke atas — jarak vertikal antar pita ≤
  jangkauan pantul, §4). Musuh diberi telegraph (kedip/goyang) ≥0.4s sebelum mematikan.
- **WHY:** pemain mengarahkan pendaratan ke atas; kalau target tak terlihat, terasa tak adil.

### 1.5 Discovery / Reward (kepingan sebagai harta)
- **Aturan:** kepingan info **tidak** didapat otomatis dengan naik — harus **memungut** cincin/hati
  hingga ambang, lalu ambang membuka 1 kepingan. Reward cadence ≤ setiap ~1.5 layar (§3).
- **WHY:** menemukan > diberi. Undangan terasa "diperjuangkan".

### 1.6 Inklusif (Cheat = jalan pintas terhormat)
- **Aturan:** satu tombol ★ → semua kepingan terbuka + tombol Buka Undangan aktif + couple kebal +
  akses semua zona. Bisa di-toggle balik. (APPENDIX Y.)
- **WHY:** sebagian tamu (orang tua, tamu formal) cuma ingin baca undangan. Jangan sandera mereka.

### 1.7 Mobile-first, Desktop 2-kolom
- **Aturan:** target utama HP potret. Kontrol = tilt + geser sentuh + keyboard. Desktop = **TEPAT
  2 kolom**: frame game **mentok KIRI** (480px) + panel **pure undangan** KANAN (§9 / APPENDIX Z).
- **WHY:** mayoritas tamu buka dari WhatsApp di HP.

> **Golden Rule §1:** *Renyah, ramah, terbaca, inklusif. Kalau sebuah aturan bikin game lebih
> sulit tanpa bikin lebih seru untuk tamu non-gamer, buang aturan itu.*

---

## §2 — CORE GAMEPLAY LOOP

```
        ┌─────────────────────────────────────────────┐
        │   AUTO-BOUNCE (naik) ── couple memantul      │
        │            ▲                                  │
        │   geser ◄──┼──► arahkan pendaratan            │
        │            │    (horizontal wrap kiri↔kanan)  │
        │      mendarat di pijakan → PANTUL lagi (juice)│
        │            │                                  │
        │   pungut 💍/❤️ ── musuh/jebakan (dodge/injak) │
        │            │                                  │
        │   ambang kepingan tercapai → 💌 kepingan buka │
        │            │                                  │
        │   kamera NAIK mengikuti ketinggian tertinggi  │
        │            │                                  │
        │   capai PUNCAK zona → transisi sinematik      │
        │            ▼                                  │
        │   ZONA baru (lebih tinggi, lebih menantang)   │
        └─────────────────────────────────────────────┘
                     ▲ ulang sampai MENARA PELAMINAN (klimaks)
```

**Verb utama:** **melompat otomatis** (pasif) + **mengarahkan** (aktif, satu sumbu: kiri/kanan) +
**memungut** + **menghindar/menembak** (opsional, lihat §5/§7). "Skill" pemain = timing geser &
membaca pita platform di atas.

**Satu putaran (loop mikro, ~0.8–1.4 detik):** takeoff → naik → apex → arahkan → turun → mendarat
di pijakan (squash + SFX + pantul) → ulang. Layer di atasnya (loop makro): pungut kepingan, naik
zona, capai klimaks.

> **Golden Rule §2:** *Satu-satunya input wajib adalah kiri/kanan. Semua kedalaman lahir dari
> membaca pita platform di atas + memilih jalur cincin. Jangan menambah verb wajib kedua.*

---

## §3 — WORLD / LEVEL STRUCTURE (vertikal) + BEAT-SHEET + VALIDATOR NO DEAD AIR

### 3.1 Struktur ketinggian

- **Satuan dunia = tinggi vertikal.** Dunia digambar dari `y=0` (puncak zona) ke `y=ZONE_H`
  (dasar). Couple **naik = y mengecil**. `BW=540`, `BH=960` (viewport).
- **Zona (pengganti "stage").** 5 zona bertingkat (APPENDIX C), tiap zona tinggi **`ZONE_H ≈ 12×BH`
  = 11.520px** (≈ 40–70 detik pendakian). Total 5 zona → klimaks Menara Pelaminan.
- **Segmen = "pita" (band) horizontal setinggi 1 viewport (`BH`).** Level di-generate per pita dari
  atas ke bawah (APPENDIX A/F). Kamera menampilkan ~1 pita + sedikit.
- **Start safe zone:** pita pertama tiap zona (≈ 500–600px) → HIJAU statis rapat, tanpa musuh
  (§1.2). Dekorasi & platform tetap wajib (zona aman ≠ kosong).
- **Puncak zona = "gerbang" (portal bunga / awan cahaya).** Menyentuhnya memicu **transisi
  sinematik** (§10.4): banner in-canvas `ZONA CLEAR` → couple auto-terbang ke atas keluar layar
  (input terkunci, kebal) → zona berikut auto-load → couple masuk dari bawah (tween).

**Pacing template per zona:** `Aman → Ajari (platform baru) → Latih → Uji (gauntlet) → Napas
(cincin trail) → Gerbang`. 3–5 "puncak kesulitan" + 1 mini-encounter (kawanan musuh) per zona.

> **⇄ TRANSPOSE:** "panjang level px per arketipe + start safe zone + goal area + pacing
> Start→Teach→Practice→Test→Reward→Goal" (hard-won §13 / template §3) diputar 90°: panjang → tinggi,
> maju-kanan → naik-atas, goal-area kanan → gerbang atas.

### 3.2 BEAT-SHEET REFERENSI — Doodle Jump (metode density §1, diputar ke vertikal)

Hasil riset (Wikipedia + Doodle Jump Wiki/Fandom + strategy guides). Satu "run" awal Doodle Jump,
dibaca **dari bawah (mulai) ke atas (tinggi)**, dipecah jadi cluster tiap ~1 layar:

| # | Ketinggian | Event (platform / power-up / musuh / terrain) |
|---|-----------|-----------------------------------------------|
| 1 | mulai | **platform HIJAU statis rapat**; Doodler auto-bounce; ajari tilt |
| 2 | +1 layar | **spring merah** pertama (launch ~3× tinggi) di satu platform hijau — reward di muka |
| 3 | +2 layar | **platform BIRU bergerak horizontal** muncul selingan hijau — target bergerak |
| 4 | +3 layar | **platform COKLAT breakable** (pecah saat dipijak) — harus segera pantul lagi |
| 5 | +3–4 | **monster pertama** (statis di platform) → injak dari atas / tembak / dodge |
| 6 | +5 | **trampolin** (bounce lebih tinggi dari spring) + **cincin/skor pickup** (dopamin) |
| 7 | +6 | **platform PUTIH disappearing** (hilang setelah 1 pijak) — timing ketat |
| 8 | +7 | **propeller hat / jetpack** → auto-naik lama (breather aktif, bukan kosong) |
| 9 | +8 | **UFO / black hole** hazard → hindari; layar makin jarang platform |
| 10 | +9→ | **spacing platform membesar**, lebih banyak breakable/putih, monster campur → gauntlet |
| 11 | puncak | (versi kita) **GERBANG BUNGA** → transisi zona |

**Yang generator pelajari:**
- Power-up pertama **dalam 1 layar** (spring), bukan lama — reward di muka.
- **Reward cadence** (spring/tramp/cincin/skor) tiap ~1–1.5 layar → dopamin konstan.
- Eskalasi tipe platform **monoton**: hijau → +biru bergerak → +coklat pecah → +putih hilang;
  eskalasi musuh: statis → +terbang/UFO.
- **Spacing membesar** seiring tinggi = knob difficulty utama (§8), **bukan** dibuat mustahil.
- Layar **tak pernah kosong**: selalu ada pita platform + minimal 1 reward/dekorasi/awan bergerak.

### 3.3 DENSITY METRICS (LANTAI — divalidasi per pita `BH`)

> Ini **lantai** (minimum), bukan plafon. Zona aman dikecualikan **hanya** dari kuota *musuh*.
> ⇄ transpose dari density-engine §2 (musuh/layar, pijakan/layar, prop/layar, dead-air, reward).

| Metrik | Lantai (minimum wajib) | Catatan |
|---|---|---|
| **Reachable platforms / pita** (`BH`) | **≥ 5** pijakan yang **bisa dicapai** dari pijakan di bawahnya (jarak vertikal ≤ `JUMP_REACH`, §4) | jawab "pijakan untuk naik kurang" — ini metrik terpenting jumper |
| **Max vertical gap** antar pijakan reachable | **≤ `JUMP_REACH`** (easy 0.72·apex · normal 0.82 · hard 0.9) | > ini = blind/impossible jump → REGEN |
| **Max "dead air" vertikal** (tanpa platform/item/musuh/prop) | **≤ 0.6× tinggi layar** (`0.6·BH`) | tak boleh ada bentang kosong |
| **Musuh aktif / pita** (zona tempur) | **≥ 1**, target 1–2 (easy 0–1 · normal 1 · hard 2) | jumper lebih longgar dari run-gun; musuh terlalu banyak = tak adil |
| **Reward cadence** (cincin/hati/skor/power-up) | tiap **≤ 1.5 layar** (`≤1.5·BH`) | dopamin; kepingan **menambah**, bukan mengganti |
| **Prop dekorasi / pita** | **≥ 1 far-parallax + 1 landmark mid + 2 foreground** (awan/balon/kelopak/lampion) | jawab "dekorasi kurang" |
| **Ambient motion / pita** | **≥ 1** (awan hanyut / kelopak jatuh / kupu-kupu / lampion goyang) | layar tak boleh beku |
| **Power-up besar** (spring-shoes/propeller/jetpack) | 1 per **pivot eskalasi** (≈ tiap ~4 pita) | breather aktif |
| **Horizontal density** platform per pita | cukup 1 jalur naik yang jelas + 1 jalur cabang cincin | jangan penuh sesak (jumper butuh ruang gerak) |

**Rasio tipe platform (kalibrasi, geser per-zona §8):** hijau-statis ~55% / biru-bergerak ~20% /
coklat-breakable ~15% / putih-disappearing ~10%. Zona awal lebih hijau; putih/breakable naik di zona
tinggi. **Kluster "movers"/"breakables" ≤ 3 berturut** (Pattern Chain Rule, APPENDIX A).

### 3.4 VALIDATOR NO DEAD AIR (ringkas — spec penuh APPENDIX E/F)

Tiap pita dipindai: `reachablePlatforms ≥ 5`, `maxVerticalGap ≤ JUMP_REACH`, `deadAir ≤ 0.6·BH`,
`enemies ≥ minEnemies` (di zona tempur), `rewardGap ≤ 1.5·BH`, `far/mid/fg props ≥ kuota`,
`ambient ≥ 1`. **Pita gagal → regenerate pita itu** (atau sisip filler cincin-trail/prop/platform).
**Invarian keras jumper:** *tak boleh ada pijakan reachable-terakhir yang di atasnya tak ada
pijakan lain dalam `JUMP_REACH`* → itu **softlock** (couple tak bisa naik lagi).

> **Golden Rule §3:** *Pada tiap pita setinggi layar HARUS ada minimal 5 pijakan yang benar-benar
> bisa dicapai berurutan ke atas, + minimal 1 reward, + dekorasi bergerak. Pita yang bisa dilewati
> tanpa memungut apa pun / dengan lompatan mustahil = GAGAL → regen. Padat & selalu bisa naik.*

---

## §4 — PLAYER SYSTEM (couple auto-bounce)

### 4.1 Arsitektur

```
class Doodler extends Phaser.Physics.Arcade.Sprite   // "the couple", satu body
  // dua sprite kepala (groom+bride) menempel sebagai child / digambar satu tekstur berdua
  state: RISE | APEX | FALL | HURT | LAUNCH(powerup) | CELEBRATE
```

Couple = **satu physics body** (agar collision sederhana), divisualkan sebagai **dua kepala
mungil berdampingan** (groom berjas+dasi kiri, bride bergaun+kerudung+buket kanan) di atas satu
"pegas" kecil / sepatu bersama. Ini menjaga "melompat bersama" tanpa dua body yang harus disinkron.

### 4.2 Fisika ber-angka (KANONIK jumper — verifikasi ke Doodle Jump)

| Konstanta | Nilai | Alasan |
|---|---|---|
| `GRAVITY_Y` | **1400** px/s² | jatuh terasa "berbobot" tapi tak lambat |
| `BOUNCE_VELOCITY` | **-820** px/s | pantul standar saat mendarat di platform apa pun |
| `SPRING_VELOCITY` | **-1500** px/s | spring (§7) ~1.8× pantul biasa |
| `TRAMPOLINE_VELOCITY` | **-1750** px/s | trampolin sedikit di atas spring |
| `PROPELLER_VELOCITY` | **-620** px/s (ditahan ~2.2s) | naik konstan lambat lama (auto) |
| `JETPACK_VELOCITY` | **-900** px/s (ditahan ~2.6s) | naik konstan cepat lama |
| `MOVE_SPEED_X` | **480** px/s (target), lerp | geser kiri/kanan responsif |
| `TILT_GAIN` | `clamp(gamma/22, -1, 1) × MOVE_SPEED_X` | akselerometer → kecepatan-x |
| `AIR_DRAG_X` | 0.86 per frame saat tak ada input | berhenti halus |
| `JUMP_REACH` (apex tinggi pantul biasa) | `BOUNCE_VELOCITY²/(2·GRAVITY)` ≈ **240px** | dasar `maxVerticalGap` (§3.3) |

- **Auto-bounce:** saat `body.blocked.down` (mendarat di platform, one-way collider) **ATAU** overlap
  bagian atas platform saat `velocity.y > 0` → set `velocity.y = -BOUNCE_VELOCITY` (atau nilai
  power-up). **Tak ada tombol lompat.** Lompatan otomatis, konsisten.
- **One-way platform (WAJIB):** couple hanya memantul saat **turun** & kakinya di atas permukaan
  platform (`processCallback`: terima hanya bila `body.velocity.y > 0 && body.bottom ≤ plat.top +
  tol`). Saat naik, tembus platform. (Teknik APPENDIX T.)
- **Horizontal wrap (KANONIK):** `if (x < -w/2) x = BW + w/2; if (x > BW + w/2) x = -w/2;` — keluar
  kiri muncul kanan. Wajib, ciri khas Doodle Jump.
- **Variable height?** Tidak — jumper murni auto-bounce konstan. Tinggi diatur **power-up**, bukan
  tekan-tahan.

### 4.3 State machine (ANIMASI per-state WAJIB — jangan statis)

```
RISE   : couple sedikit stretch vertikal (scaleY 1.08), rambut/gaun terangkat, senyum
APEX   : squash ringan di puncak (frame "melayang"), kelopak di sekitar
FALL   : scaleY 1.0, kaki menjuntai, sedikit lean ke arah gerak-x (setAngle ±6°)
LAND   : squash kuat (scaleY 0.78, scaleX 1.2) 3 frame → balik (juice §10)
HURT   : flash merah + spin kecil + knockback (i-frame), confetti hilang
LAUNCH : pose "yeay" (tangan ke atas) saat spring/tramp/propeller/jetpack
CELEBRATE: pose berpelukan di pelaminan (klimaks, APPENDIX D)
```

- **Frame-by-frame procedural** (APPENDIX T §19 hard-won): drawer ber-parameter `drawCouple(g,
  {bob, lean, squash, armsUp, hurt})` → generate `t_couple_rise/apex/fall/land/hurt/launch/celebrate`
  + idle 2-frame (napas). `anims.create` guard `anims.exists`.
- **Facing:** `setFlipX` mengikuti arah gerak-x (groom/bride tetap sisi masing-masing → gunakan
  lean+flip pada satu tekstur gabungan; atau simpan 2 tekstur mirror).

### 4.4 Input abstraction

Map semua sumber ke satu model `{ moveX: -1..1, fire: bool, restartTilt: bool }`:
- **Keyboard:** `←/→` atau `A/D` → `moveX = ∓1`. `Space`/`↑` = tembak (bila senjata aktif, §5).
- **Touch geser:** drag di area main → `moveX` proporsional ke delta-x; atau tombol virtual
  kiri/kanan besar di bawah (kiri-bawah & kanan-bawah, §9).
- **Tilt (mobile utama):** `window.addEventListener('deviceorientation')` → `gamma` → `TILT_GAIN`.
  Butuh **izin iOS 13+**: tombol "Aktifkan Tilt" memanggil `DeviceOrientationEvent.requestPermission()`
  saat PRESS START (gesture). Fallback ke geser bila ditolak/absen.
- **Tembak (opsional):** tap layar atas → peluru "cinta" ke atas untuk melumpuhkan monster (§5).
  Auto-aim ke musuh terdekat di atas (seperti Doodle Jump Android).

> **Golden Rule §4:** *Auto-bounce konstan + one-way platform + horizontal wrap = jantung jumper.
> Satu sumbu input (kiri/kanan). Pantulan harus renyah (squash-land + SFX + freeze 3 frame). Tiap
> state punya pose sendiri; couple tak pernah sprite beku.*

---

## §5 — ENEMY / OBSTACLE SYSTEM (spawn relatif kamera-Y)

### 5.1 Pool musuh/hazard (≥5 tipe, peran beda)

| Tipe | Peran | Perilaku | Cara diatasi |
|---|---|---|---|
| **Lebah** `bee` | rusher udara pelan | melayang horizontal bolak-balik di jalur | injak dari atas (pantul) / tembak / dodge |
| **Burung** `bird` | flyer statis-hover | diam di ketinggian, mematikan bila disentuh samping | injak / tembak / lewati |
| **Awan hitam** `stormcloud` | hazard statis | menutupi jalur, menyetrum (telegraph kilat 0.4s) | dodge / lewati di sela |
| **UFO** `ufo` | penculik | melayang; menyedot bila couple terlalu dekat (radius telegraph) | jauhi / tembak 3× |
| **Black hole** `blackhole` | hazard menyedot | statis, radius gravitasi kecil | jangan mendekat (spasi aman) |
| **Balon paku** `spikeballoon` | drifting obstacle | naik pelan dari bawah, meletus kena couple → knockback | dodge / tembak |

- **≤2 tipe musuh per pita** (sweet spot), pool besar lintas zona. Musuh datang dari **beberapa
  posisi** (di platform, melayang di sela, menyeberang).
- **Injak-dari-atas (KANONIK):** bila `couple.velocity.y > 0` (turun) & mendarat di kepala musuh
  yang bisa-diinjak (`bee/bird`) → musuh mati + couple pantul (`-BOUNCE`). Bila menyentuh dari
  samping/bawah → couple HURT (knockback + i-frame, §12), musuh selamat.
- **Tembak (opsional):** peluru "hati/bintang" ke atas melumpuhkan `bee/bird/ufo`. Auto-aim ke
  musuh terdekat di atas. Peluru **despawn di tepi atas viewport** + lifetime ~0.9s (⇄ hard-won §23:
  peluru despawn di tepi; di sini tepi = **atas**).

### 5.2 SPAWN RELATIF KAMERA-Y (WAJIB — invarian anti-bug)

> **⇄ TRANSPOSE dari hard-won §23** (spawn musuh relatif kamera-X, lahir di tepi kanan). Di jumper,
> dunia digenerate ke ATAS; kamera bergerak ke atas (`scrollY` mengecil). **Musuh & platform
> off-screen = DATA inert**, di-instantiate jadi entity ber-hitbox **saat tepi ATAS layar
> mencapainya**, lahir **di tepi atas** — bukan semua aktif saat zona di-build.

1. **Platform & musuh off-screen di ATAS = record** `{y: triggerY, type, x, ...}` di array **terurut
   `triggerY` menaik-ke-atas** (y mengecil). JANGAN `create()` semua saat build zona.
2. **Spawn via pointer + ambang scroll-atas:** tiap frame
   `while (next<list.length && cam.scrollY <= list[next].triggerY) { spawn(list[next]); next++; }`
   Entity lahir di `y = list[next].triggerY` (yang saat itu ≈ tepi atas viewport).
3. **Hitbox hanya untuk entity aktif.** Yang belum di-spawn tak punya body → musuh yang **belum
   masuk layar TIDAK bisa kena tembak** (invarian, verifikasi harness).
4. **Peluru couple despawn di tepi atas** (`bl.y < cam.scrollY - 16`) + lifetime; cap 2–3 peluru.
5. **Musuh/platform self-despawn saat ter-scroll keluar BAWAH** (`e.top > cam.scrollY + BH + grace`)
   → set populasi hidup ≈ on/near-screen (pooling, anti-leak). Platform yang lewat bawah tak
   di-recycle sebagai jalur (couple tak turun) tapi tetap dibersihkan.

```js
// update(): spawn relatif kamera-Y (dunia ke ATAS → scrollY MENGECIL)
var cam = this.cameras.main, topEdge = cam.scrollY;      // tepi atas viewport (world-y)
while (this._next < this.spawnList.length && topEdge <= this.spawnList[this._next].triggerY) {
  var r = this.spawnList[this._next++];
  this.spawnEntity(r);                                    // lahir di r.triggerY (≈ tepi atas)
}
// peluru edge-despawn (tepi ATAS):
this.bullets.children.iterate(function (b) {
  if (b && b.active && b.y < cam.scrollY - 16) b.disableBody(true, true);
});
```

### 5.3 Difficulty knobs musuh
`minEnemiesPerBand` (easy 0 · normal 1 · hard 2), kecepatan lebah, radius sedot UFO/blackhole,
frekuensi stormcloud. Sawtooth: gauntlet padat → napas (power-up + cincin).

> **Golden Rule §5:** *Musuh off-screen adalah resep, bukan makhluk — di-masak (spawn+hitbox) saat
> tepi ATAS layar mencapainya. Injak-dari-atas membunuh; sentuh samping = knockback (bukan mati).
> ≤2 tipe/pita, tapi selalu ADA di zona tempur.*

---

## §6 — INTERACTION & COLLISION MATRIX

| A ↓ / B → | Platform (one-way) | Musuh injak-able | Musuh/hazard non-injak | Cincin/Hati | Power-up | Gerbang zona |
|---|---|---|---|---|---|---|
| **Couple turun (vy>0)** | **PANTUL** (`-BOUNCE`/power) + squash + SFX | **injak → musuh mati + PANTUL** | **HURT** (knockback+i-frame) | **collect** | **aktifkan** (launch) | **transisi zona** |
| **Couple naik (vy<0)** | tembus (one-way) | HURT bila kena samping/bawah | HURT | collect | aktifkan | — |
| **Peluru couple** | — | **kill musuh** | **damage UFO / hancurkan** | — | — | — |

**Aturan:**
- Platform: `overlap`/collider **one-way** dg `processCallback` (§4.2). Cincin/hati/power-up:
  `overlap` (tanpa separasi). Musuh: `overlap` + cek arah `velocity.y` untuk injak vs hurt.
- **i-frame** saat HURT: `invulnMs ≈ 900` → couple tak bisa HURT lagi, blink alpha.
- **Peluru vs musuh di depan platform:** daftarkan overlap `bullets×enemies` **sebelum** collider
  lain; `hitEnemy` guard `active` (idempotent) + sweep manual anti-tunnel (⇄ hard-won §22).

> **Golden Rule §6:** *Arah kecepatan-Y menentukan segalanya: turun ke platform/musuh-injakable =
> pantul; naik = tembus platform / kena musuh. Semua i-frame & idempotent.*

---

## §7 — POWER-UP / ITEM SYSTEM (gameplay — bukan kepingan undangan)

> **Powerup ≠ kepingan.** Kepingan (cincin/hati → info undangan) murni koleksi (APPENDIX X). Power-up
> di sini mengubah gameplay. **Relevance Rule (⇄ hard-won):** power-up "auto-naik" (propeller/jetpack)
> harus punya **usage window** — jangan taruh tepat sebelum gerbang zona tanpa rintangan; taruh di
> sebelum segmen gauntlet/celah lebar agar berguna. Kalau tak ada guna → ganti reward pasif (skor).

| Power-up | Efek | Durasi | Penempatan (relevance) |
|---|---|---|---|
| **Spring merah** `spring` | `SPRING_VELOCITY` (-1500) sekali | instan | menempel di platform; sebelum celah sedang |
| **Trampolin** `tramp` | `TRAMPOLINE_VELOCITY` (-1750) sekali | instan | sebelum celah lebar |
| **Sepatu pegas** `springshoes` | 5× pantul lebih tinggi berturut | ~5 pantul | awal gauntlet |
| **Baling-baling** `propeller` | naik konstan lambat, tembus musuh | ~2.2s | sebelum gauntlet padat/musuh banyak |
| **Jetpack** `jetpack` | naik konstan cepat, kebal | ~2.6s | sebelum celah SANGAT lebar / kawanan |
| **Perisai** `shield` (bubble) | 1× serapan HURT | sampai kena | zona tinggi (musuh rapat) |

- **Auto-naik power-up (propeller/jetpack):** input `moveX` tetap aktif (bisa arahkan), couple
  **kebal**, kamera tetap ikut. Saat habis → kembali FALL normal, mendarat di platform terdekat di
  bawah (jangan drop ke jurang: sistem menaruh platform aman di ujung auto-naik).
- **Visual/juice:** partikel jejak (spark), SFX naik, pose LAUNCH (§4.3), UI kecil "durasi".

> **Golden Rule §7:** *Tiap power-up ofensif/mobilitas wajib punya segmen tempat ia berguna sebelum
> gerbang. Auto-naik tak boleh menjatuhkan couple ke jurang saat habis — selalu ada pijakan aman di
> ujungnya. Kepingan undangan bukan power-up.*

---

## §8 — DIFFICULTY SCALING (zona ketinggian + sawtooth)

- **3 preset (knobs, bukan angka mati):**

| Knob | EASY | NORMAL | HARD |
|---|---|---|---|
| `maxVerticalGap` (× apex) | 0.72 | 0.82 | 0.90 |
| `minEnemiesPerBand` | 0–1 | 1 | 2 |
| ratio breakable+putih | 15% | 25% | 38% |
| ratio biru-bergerak | 15% | 20% | 28% |
| `springFrequency` | tinggi | sedang | rendah |
| `invulnMs` (i-frame) | 1100 | 900 | 700 |
| kecepatan platform biru | pelan | sedang | cepat |

- **EASY = default undangan** (§1.3). Cheat → efektif "tak bisa gagal".
- **Kurva sawtooth per zona:** gap & musuh naik menuju gauntlet, lalu **turun** di napas (spring +
  cincin trail), lalu naik lagi lebih tinggi. Lembah **tetap terisi** (cincin/prop), bukan kosong.
- **Antar-zona:** tiap zona naik satu tingkat baseline (spacing & rasio platform sulit), tapi **selalu
  di bawah `JUMP_REACH` preset** (validator §3.4 menjamin reachable).
- **Ramah (⇄ hard-won §17):** tanpa nyawa/game-over; jatuh ke bawah layar → respawn ke **checkpoint
  pita** terakhir (pijakan reachable terakhir yang dilewati), bukan awal zona; freeze musuh ~1s
  setelah respawn (anti spawn-kill).

> **Golden Rule §8:** *Kesulitan = spacing platform & rasio platform-sulit yang membesar per zona
> (kanonik Doodle Jump), TAPI validator menjamin selalu reachable. Default EASY. Jatuh = mundur ke
> pijakan aman terakhir, bukan ulang dari nol.*

---

## §9 — CAMERA & READABILITY (vertikal) + LAYOUT

### 9.1 Kamera vertikal (⇄ TRANSPOSE hard-won §1)

Hard-won §1: side-scroller maju-kanan → dorong player ke **kiri ⅖** (offset `-0.40·BW`) agar
pandangan **depan (kanan)** luas. Jumper naik-atas → dorong couple ke **bawah ⅗** agar pandangan
**depan (atas, arah naik)** luas.

**Aturan ber-angka:**
- Kamera **hanya naik, tak pernah turun** (kanonik jumper): `cam.scrollY = Math.min(cam.scrollY,
  couple.y - BH*0.62)`. Couple ditahan di **~62% tinggi layar dari atas** (⅗ ke bawah) → ~60% layar
  di atasnya untuk membaca pita berikut.
- **Follow custom, bukan `startFollow` biasa** (karena kamera one-way): update manual `scrollY`
  hanya saat couple naik melewati ambang. Saat couple turun (belum jatuh keluar), kamera **diam**.
- **`setDeadzone` tak dipakai** (follow manual). Lerp ringan saat naik cepat (power-up): lerp 0.16.
- **No blind jump:** karena couple di 62%, pijakan berikut (≤`JUMP_REACH`≈240px di atas) selalu
  masuk 60% layar atas → terlihat saat takeoff (§1.4).

```js
// update(): kamera one-way ke ATAS, couple di ~62% tinggi layar
var targetScroll = this.couple.y - BH * 0.62;
if (targetScroll < this.cameras.main.scrollY)
  this.cameras.main.scrollY += (targetScroll - this.cameras.main.scrollY) * 0.16; // naik halus
// jatuh: couple.y > cam.scrollY + BH → trigger respawn/knockdown (§8/§12), kamera TETAP
```

### 9.2 GROUND & zona kontrol (⇄ hard-won §2)

Jumper tak punya "tanah" permanen (dunia melayang), TAPI kontrol sentuh & couple **tetap tak boleh
tumpang tindih**. Couple ditahan di 62% (≈`0.62·BH` dari atas = ~365px dari bawah) → **jauh di atas**
zona kontrol bawah (±160px). Aman by-design. Tombol tembak/geser di **green zone bawah**:
`CONTROL_Y = BH - (isTouch ? 170 : 120)`. `isTouch` dihitung saat boot.

### 9.3 HUD MAP (⇄ hard-won §3 — icon kiri-atas, indikator kanan-atas)

```
  ┌───────────────────────────────────────────┐
  │ SKOR 001200            TINGGI 640m  ZONA 2 │ ← HUD info (atas, dilihat, tak di-tap)
  │ ┌───┐                              ┌─┬─┬─┐ │
  │ │ ★ │ ICON-BUTTON (KIRI-ATAS)      │💍❤✓│ │ ← indikator kepingan (KANAN-ATAS, dinamis)
  │ │ ▦ │ ★cheat ▦zona-select          └─┴─┴─┘ │
  │ │💌 │ 💌buka-undangan  🎵musik  ⟲reset      │
  │ │🎵⟲│                                       │
  │ └───┘                                       │
  │            (couple memantul di ~62%)        │
  │              [👰🤵] ← couple                 │
  │                                             │
  │  ╭───╮                          ┌────┐┌──┐ │
  │  │ ◄ │ GESER KIRI      TEMBAK→  │ ▲  ││► │ │ ← kontrol sentuh (green zone bawah)
  │  ╰───╯                          └────┘└──┘ │   (◄ ► geser · ▲ tembak opsional)
  └───────────────────────────────────────────┘
```
ICON-BUTTON **kiri-atas** (★ cheat, ▦ zona-select, 💌 buka-undangan, 🎵 musik, ⟲ reset) · indikator
kepingan **kanan-atas** · geser **kiri-bawah & kanan-bawah** · tembak **kanan-bawah**. Target sentuh
≥44px, spacing ≥8px, `safe-area-inset`. Di desktop kontrol sentuh disembunyikan (keyboard).

### 9.4 TOAST (⇄ hard-won §10 — atas-tengah, bukan dasar)

Toast "💍 +1 / kepingan terbuka" di **atas-tengah** `top:18–30%`, 3–6s, warna+ikon (cyan/✓ sukses,
merah bahaya). JANGAN di dasar (ketutupan kontrol).

### 9.5 LAYOUT DESKTOP 2-KOLOM (⇄ hard-won §4/§9 — frame KIRI, panel undangan KANAN)

- `.gw-shell{justify-content:flex-start}` · `.gw-frame{order:1;flex:0 0 auto;width:480px;height:100vh}`
  (frame game mentok KIRI) · `.gw-cover-side{order:2;flex:1;overflow-y:auto}` (panel undangan mengisi
  KANAN). Satu breakpoint `980px`; mobile = **hanya frame**; desktop = kontrol sentuh disembunyikan.
- **Panel KANAN = PURE undangan (TANPA tombol game).** Berisi **`<canvas>` Canvas-2D (bukan Phaser)**
  menggambar couple bertema jumper (langit senja, awan, balon, kelopak, pelaminan bunga, banner
  "JUST MARRIED"), lalu nama mempelai + tanggal, **Akad & Resepsi** (waktu/tanggal/tempat/alamat +
  link MAP, dibungkus `{{#if}}`), dan **satu** tombol `💌 BUKA UNDANGAN LENGKAP`. PRESS START /
  pilih-kesulitan / petunjuk kontrol → di **cover overlay DALAM frame**, bukan di panel ini.

> **Golden Rule §9:** *Kamera one-way ke ATAS, couple ditahan di ~62% tinggi layar (pandangan naik
> luas, no blind jump). ICON kiri-atas · indikator kanan-atas · kontrol bawah. Toast atas-tengah.
> Desktop = 2 kolom (frame kiri 480px + panel pure-undangan kanan dengan canvas couple).*

---

## §10 — GAME FEEL / JUICE + GRAFIS

### 10.1 Juice (angka)
- **Landing squash:** scaleY 0.78 / scaleX 1.2 selama 3 frame → ease balik. Wajib tiap pantul.
- **Freeze-frame** 2–4 frame saat: injak musuh, ambil power-up besar, buka kepingan.
- **`camera.shake(90, 0.012)`** saat HURT / trampolin / injak musuh (intensity float kecil).
- **`camera.flash(70, 255, 240, 200)`** saat kepingan terbuka & klimaks.
- **Partikel (API 3.60+, `this.add.particles(x,y,key,cfg)` → `explode()`):** cincin diambil →
  burst 💍 sparkles; hati → hearts; land → debu kecil; spring → coil spark.
- **SFX pitch-vary** saat pantul beruntun (naikkan pitch tiap pantul cepat).

### 10.2 Grafis prosedural DI-SHADE (⇄ hard-won §6)
Tiap tekstur = base + highlight(top ~22%) + shadow(bottom ~22%) + outline gelap (`box()`/`outline()`
helper). Couple: kulit + jas hitam/dasi (groom) + gaun putih/kerudung/buket (bride), pipi merona.
Platform: papan kayu (hijau→coklat), awan (biru bergerak), es rapuh (coklat breakable), kaca (putih
disappearing) — **siluet & warna unik per tipe** agar terbaca sekilas.

### 10.3 Animasi frame-by-frame (⇄ hard-won §19)
Drawer ber-parameter untuk couple & musuh → banyak frame texture + `anims.create`/`play` per state,
guard `anims.exists`. Lebah: kepak sayap 2–3 frame. Bird: hover bob. UFO: cahaya berputar.

### 10.4 Transisi zona sinematik (bukan pause+tombol)
Banner in-canvas `ZONA CLEAR` → couple `autoFly=true` (input terkunci, kebal) meluncur ke atas keluar
layar → zona baru auto-load (build + spawn-list reset) → couple masuk dari bawah (tween) → input
kembali. Scene tetap jalan (state `clearSeq` di `update()`), dunia dibekukan selama outro.

> **Golden Rule §10:** *Tiap pantul = squash+SFX. Impact besar = freeze+shake+flash+partikel di frame
> yang sama. Grafis di-shade + ber-animasi per-state. Transisi zona sinematik, bukan dialog "Lanjut".*

---

## §11 — AUDIO DESIGN

- **SFX game via `this.sound` / Web Audio internal:** `bounce` (pitch naik saat beruntun), `spring`,
  `collect_ring`, `collect_heart`, `powerup`, `hurt`, `enemy_pop`, `zone_clear`, `win_fanfare`.
- **Backsound undangan = MILIK HOST. JANGAN diputar tema.** Host memegang `Audio(link_backsound_music)`
  / iframe YouTube, hanya play saat `isPlaying && isOpened`. Tema hanya **klik `#btn-toggle-music`** &
  **mirror** ikon, idempotent (APPENDIX Z).

> **Golden Rule §11:** *SFX game bebas (Web Audio). Backsound tenant tak pernah disentuh tema — cuma
> di-toggle via tombol host + mirror ikon idempotent.*

---

## §12 — ANTI-FRUSTRATION RULES

- **Auto-bounce forgiveness:** overlap-top platform generous (toleransi ~10px) → pantul walau nyerempet.
- **Coyote (versi jumper):** bila couple lewat pinggir platform sangat dekat (≤8px) & turun → tetap
  dihitung mendarat (anti "gagal tipis").
- **No spawn-kill:** setelah respawn/checkpoint, freeze musuh ~1s + tak spawn musuh dalam 220px.
- **No blind jump:** validator jamin pijakan berikut ≤`JUMP_REACH` & terlihat (§3.4/§9.1).
- **No mandatory-hidden:** kepingan (cincin/hati) tak pernah di posisi mustahil dicapai; selalu ada
  jalur cabang reachable.
- **Telegraph hazard pertama** tiap zona: stormcloud/UFO pertama diberi kedip/goyang ≥0.4s.
- **Tanpa nyawa/game-over** (§1.3/§8). Jatuh keluar bawah = respawn checkpoint pita, bukan ulang.

> **Golden Rule §12:** *Tamu non-gamer harus SELALU bisa naik. Kegagalan hanya "mundur sedikit ke
> pijakan aman", tak pernah "ulang dari nol". Telegraph sebelum tiap hazard mematikan.*

---

# APPENDIX A — PATTERN LIBRARY (pita platform ber-ID, ≥28 pola)

> Tiap pola = layout satu pita (`BH` tinggi) atau sub-pita. ID: `P###` platform-band, `E###`
> enemy-insert, `R###` reward, `U###` power-up, `H###` hazard. ASCII: `=` hijau statis, `~` biru
> bergerak, `x` coklat breakable, `.` putih disappearing, `S` spring, `T` tramp, `o` cincin,
> `♥` hati, `m` musuh, `^` propeller, `J` jetpack. Bawah = mulai, atas = tujuan naik.

**Platform bands (jalur naik):**
- `P001 STAIR_GREEN` — tangga hijau statis zig-zag (onboarding). ` =   / =   / = / =` (gap ≤0.6·reach).
- `P002 GREEN_WIDE` — 2 jalur hijau paralel (kiri & kanan) + cincin di tengah.
- `P003 BLUE_INTRO` — selingan 1 biru bergerak di antara hijau (target bergerak pertama).
- `P004 BROWN_TIMED` — 1 coklat breakable di puncak jalur → paksa pantul cepat.
- `P005 WHITE_STEP` — 1 putih disappearing sebagai batu loncatan sekali-pakai.
- `P006 WRAP_LANE` — pijakan sengaja di tepi kiri & kanan → dorong pakai horizontal wrap.
- `P007 MOVER_CHAIN` — 2 biru bergerak berurutan (≤3 berturut, chain rule).
- `P008 BREAK_GAUNTLET` — 3 coklat breakable turun-cepat (zona tinggi, hard).
- `P009 GHOST_STEPS` — 3 putih disappearing berselang hijau (timing).
- `P010 SPRING_LAUNCH` — hijau + `S` → melempar melewati celah lebar di atasnya.
- `P011 TRAMP_LEAP` — `T` sebelum celah SANGAT lebar.
- `P012 ZIGZAG_TIGHT` — zig-zag sempit kiri↔kanan (fokus geser presisi).
- `P013 REST_PLATEAU` — dataran hijau rapat (napas setelah gauntlet) + cincin trail.
- `P014 SPLIT_PATH` — dua jalur naik: kiri "aman" (hijau), kanan "berisiko" (breakable) + hati.

**Reward/power-up inserts:**
- `R001 RING_TRAIL` — 3–5 cincin `o` mengikuti busur pantul (isi gap, filler skor).
- `R002 HEART_BRANCH` — hati `♥` di jalur cabang (butuh 1 wrap untuk ambil).
- `R003 PIECE_MARK` — penanda "kepingan hampir cukup" (glow) saat ambang dekat.
- `U001 SPRINGSHOES_PRE` — sepatu pegas sebelum `P008`/`P012`.
- `U002 PROPELLER_PRE` — baling-baling sebelum gauntlet musuh (`E00x` padat).
- `U003 JETPACK_WIDEGAP` — jetpack sebelum celah ekstrem / kawanan.
- `U004 SHIELD_HI` — perisai di zona tinggi (musuh rapat).

**Enemy/hazard inserts:**
- `E001 BEE_CROSS` — lebah menyeberang di sela jalur (dodge/injak).
- `E002 BIRD_HOVER` — burung hover di pinggir jalur utama.
- `E003 STORM_GATE` — awan hitam menutup separuh jalur (telegraph kilat).
- `E004 UFO_LURK` — UFO di atas jalur (radius sedot; propeller aman menembusnya bila `^` diambil).
- `H001 BLACKHOLE_SIDE` — black hole di jalur cabang berisiko (jauhi).
- `H002 SPIKEBALLOON_RISE` — balon paku naik dari bawah pita.

**Pattern Chain Rules:**
- Jangan >3 pita "sulit" (`P007/P008/P009/P012`) berturut tanpa `P013 REST_PLATEAU` di antaranya.
- Movers/breakables ≤3 berturut lalu wajib ≥1 hijau statis.
- Tiap `U00x` power-up wajib diikuti segmen tempat ia berguna (relevance, §7).
- Musuh non-injak (UFO/blackhole) tak boleh menutup **satu-satunya** jalur naik → selalu ada celah.

**Level Generation Formula (% pita per zona, lihat §8/APPENDIX C):**
Zona 1: 70% P001/P002/P013, 20% P003/P010, 10% R/U, 0–1 E. → Zona 5: 30% aman, 45% sulit
(P007/P008/P009/P012), 25% U/E/H. Selalu lulus validator (APPENDIX E).

> **Golden Rule APPENDIX A:** *Bangun pita dari pola ber-ID, patuhi chain rules (napas tiap ≤3 pita
> sulit, movers/breakables ≤3 berturut), tiap power-up punya guna. Selalu ada ≥1 jalur naik reachable
> + jalur cabang cincin.*

---

# APPENDIX B — ENTITY ENCYCLOPEDIA (YAML)

```yaml
couple:                 # player
  body: {w: 46, h: 52, offsetAnchor: bottom}
  states: [rise, apex, fall, land, hurt, launch, celebrate, idle]
  physics: {gravityY: 1400, bounce: -820}
  invulnMs: 900
  kill_condition: none   # tanpa game-over; jatuh keluar-bawah → respawn checkpoint
  collide: {platform: one-way, ring: overlap, enemy: velocityY-dependent}

platform_green:  {type: static,   behavior: bounce, persist: true,  w: 84, h: 20}
platform_blue:   {type: mover,    behavior: bounce, persist: true,  speedX: 60-130, w: 84, h: 20}
platform_brown:  {type: breakable,behavior: bounce_then_break, persist: false, w: 84, h: 22}
platform_white:  {type: vanish,   behavior: bounce_then_vanish(1jump), w: 84, h: 18}

ring:  {value: 1, collect: overlap, fx: sparkle, sfx: collect_ring}   # kepingan currency
heart: {value: 3, collect: overlap, fx: hearts,  sfx: collect_heart}  # bernilai lebih (cabang)

spring:       {launch: -1500, oneShot: true, mount: platform}
trampoline:   {launch: -1750, oneShot: true, mount: platform}
springshoes:  {mode: multiBounce, count: 5, launch: -1050/bounce}
propeller:    {mode: autoRise, vy: -620, dur: 2200, invuln: true}
jetpack:      {mode: autoRise, vy: -900, dur: 2600, invuln: true}
shield:       {mode: absorbOneHurt}

bee:        {hp: 1, stompable: true,  move: horizontalPatrol, speed: 70,  telegraph: none}
bird:       {hp: 1, stompable: true,  move: hover,            speed: 0,   telegraph: bob}
stormcloud: {hp: -1,stompable: false, move: static,          hazard: shock, telegraph: kilat0.4s}
ufo:        {hp: 3, stompable: false, move: hoverDrift, suck: {radius: 120}, telegraph: beam}
blackhole:  {hp: -1,stompable: false, move: static, suck: {radius: 90}}
spikeballoon:{hp:1, stompable: false, move: riseUp, speed: 40, pop: knockback}

gerbang_zona: {trigger: overlap_top, effect: zone_transition_cinematic}
```

State machine musuh (contoh `ufo`): `LURK → (couple in radius) TELEGRAPH_BEAM(0.4s) → SUCK(pull) →
(couple escape/shot) RELEASE`. `bee`: `PATROL_L ↔ PATROL_R`, die → pop partikel.

> **Golden Rule APPENDIX B:** *Tiap entity punya spec numerik + state machine + kill-condition
> eksplisit. Couple tak punya kill-condition (ramah). Platform-persist berbeda per tipe.*

---

# APPENDIX C — BIOME / ZONE LIBRARY (5 zona)

Tiap zona: palet langit, platform diizinkan, enemy pool, pattern priority, ambient, landmark.
Backdrop WAJIB: **sky gradient per zona + ≥3 lapis parallax (`scrollFactor` 0.2/0.45/0.7, di sini
vertikal) + props + ≥1 ambient motion** (⇄ hard-won §7, diputar vertikal: parallax mengikuti scrollY).

| Zona | Nama | Langit | Platform | Enemy pool | Ambient / landmark |
|---|---|---|---|---|---|
| 1 | **Taman Perkenalan** | pagi cerah biru-hijau | hijau 70%, biru 20% | (none/1 bee) | kupu-kupu, bunga, ayunan taman |
| 2 | **Langit Senja** | oranye-ungu senja | +breakable, +tramp | bee, bird | balon udara, awan jingga, burung kawanan |
| 3 | **Awan Impian** | biru muda + awan tebal | +putih disappearing | bird, stormcloud | awan hanyut, pelangi, lampion |
| 4 | **Malam Bintang** | biru gelap + bintang | movers cepat, breakable byk | stormcloud, ufo | bintang jatuh, bulan, aurora |
| 5 | **Menara Pelaminan** | fajar keemasan | rapat menuju puncak | ufo, blackhole, spikeballoon | kembang api awal, kelopak mawar, pilar bunga |

- **Physics modifier per zona (opsional):** Zona 3 (awan) sedikit "float" — `AIR_DRAG_X` naik
  (terasa mengambang); Zona 4 malam — platform biru lebih cepat.
- **Rebuild backdrop per zona** (`bgGroup.clear`), palet & parallax baru. Awan `scrollFactor` kecil.

> **Golden Rule APPENDIX C:** *5 zona, tiap zona palet langit + platform + musuh + ambient sendiri,
> eskalasi menuju puncak. Backdrop ber-lapis & bergerak — tak ada layar kosong/gelap-mati.*

---

# APPENDIX D — CLIMAX SYSTEM: "MENARA PELAMINAN" (pengganti boss horizontal)

> Jumper vertikal tak punya "boss walk-in horizontal". Klimaksnya = **puncak Zona 5**: sebuah
> **pelaminan bunga** di ketinggian tertinggi. Ini menggantikan boss, TAPI tetap memenuhi kontrak
> celebration 2-pemicu (§6.6 skill).

### D.1 Struktur
- Zona 5 memuncak ke **platform pelaminan besar** (statis, lebar). Di jalur menuju ke sana: gauntlet
  terakhir (ufo/blackhole/spikeballoon) — **tetap ramah** (i-frame, shield tersedia via `U004`).
- **Walk-in versi vertikal (⇄ hard-won §5):** pelaminan **inactive** (alpha 0) sampai couple naik
  melewati `climaxY` (≈ `0.9·BH` sebelum puncak). Saat `couple.y ≤ climaxY` → `activateClimax()`:
  fade-in pelaminan, kamera **berhenti naik** (lock ke puncak), kembang api mulai. **Bukan** langsung
  tampil saat zona di-build.

### D.2 Celebration 2-pemicu (WAJIB dua-duanya)
1. **Kepingan TERAKHIR terkumpul** (bisa terjadi kapan saja, bahkan sebelum puncak) → undangan
   **lengkap & bisa dibuka**. Dialog: "Semua kepingan terkumpul 💌 → undangan siap dibuka".
2. **Mencapai pelaminan (puncak Zona 5)** → cerita **tamat** ("happily ever after"): couple berdiri
   berpelukan, kembang api, dialog happy-ending + skor/tinggi + CTA Buka Undangan.
   > Tahan **kedua urutan** (kepingan dulu / bersamaan di puncak).

### D.3 Beat meriah ±5s SEBELUM dialog
Saat mencapai pelaminan: `camera.flash` + fireworks (partikel ADD) + `win_fanfare` (SFX game, **bukan**
backsound) + confetti + toast → **baru** dialog muncul (`setTimeout ~4.5s`). Dialog menyebut **nama
mempelai dinamis** (`val('groom_nickname')` ♥ `val('bride_nickname')`) + CTA `💌 BUKA UNDANGAN`.

### D.4 Guard sekali-tampil (di-persist)
Flag `announcedAll` (kepingan penuh) & `completed` (puncak) di-persist → perayaan tak terulang saat
reload/re-inject. Saat menang, **pastikan semua kepingan ter-unlock** (undangan tak pernah terkunci).

> **Golden Rule APPENDIX D:** *Klimaks = pelaminan di puncak (walk-in vertikal: aktif saat couple
> capai `climaxY`, bukan saat build). Dua pemicu (kepingan penuh / capai puncak), beat meriah 5s dulu
> lalu dialog dengan nama mempelai + CTA. Guard sekali-tampil. Menang → semua kepingan terbuka.*

---

# APPENDIX E — VALIDATOR ENGINE (playability + density gate)

### E.1 Playability checks (per zona, gate keras)
- `topReachable` — dari pijakan mulai, ada rantai pijakan reachable (gap ≤`JUMP_REACH`) sampai
  gerbang/pelaminan. (BFS busur pantul; wrap horizontal dihitung.)
- `noSoftlock` — tak ada pijakan reachable-terakhir tanpa pijakan lain dalam `JUMP_REACH` di atasnya.
- `allPiecesReachable` — tiap cincin/hati yang dibutuhkan untuk ambang kepingan berada di jalur/cabang
  reachable.
- `noBlindJump` — pijakan berikut selalu masuk 60% layar atas saat takeoff (§9.1).
- `noSpawnKill` — tak ada musuh dalam 220px dari checkpoint/respawn.
- `powerupUsable` — tiap power-up mobilitas punya segmen guna sebelum gerbang (§7).

### E.2 Density gate (⇄ density-engine §5, transpose vertikal — SEG = 1 pita `BH`)

```js
// SEG = pita setinggi BH. Iterasi tiap pita kontigu dari mulai ke puncak.
function validateDensity(zone, BH, opts) {
  var fails = [];
  for (var y = zone.startY; y > zone.endY; y -= BH) {           // dunia ke ATAS → y mengecil
    var seg = zone.band(y, y - BH);
    var reach   = seg.countReachablePlatforms();                 // pijakan yang bisa dicapai
    var enemies = seg.count('enemy');
    var far     = seg.count('parallax_far');
    var mid     = seg.count('landmark_mid');
    var fg      = seg.count('prop_fg');
    var ambient = seg.count('ambient_motion');

    if (reach < opts.minReachablePerBand)            fails.push([y,'reach',reach]);      // ≥5
    if (seg.maxVerticalGap() > opts.maxGap)          fails.push([y,'gap',seg.maxVerticalGap()]);
    if (seg.maxDeadAirY() > opts.maxDeadPx)          fails.push([y,'deadair']);           // ≤0.6·BH
    if (!seg.isSafeZone && enemies < opts.minEnemies)fails.push([y,'enemies',enemies]);
    if (far < 1)                                     fails.push([y,'far']);
    if (mid < 1)                                     fails.push([y,'mid']);
    if (fg  < 2)                                     fails.push([y,'fg']);
    if (ambient < 1)                                 fails.push([y,'ambient']);
  }
  if (zone.maxRewardGap() > opts.rewardEveryPx)      fails.push(['*','reward-gap']);       // ≤1.5·BH
  return fails; // kosong = lolos; else REGENERATE pita gagal
}

var DENSITY = {
  minReachablePerBand: 5,
  maxGap:      Math.round(JUMP_REACH * (diff==='hard'?0.90:diff==='easy'?0.72:0.82)),
  maxDeadPx:   Math.round(BH * 0.6),
  minEnemies:  (diff==='hard'?2:diff==='easy'?0:1),
  rewardEveryPx: Math.round(BH * 1.5),
};
```

### E.3 Scoring (0–100, lulus ≥80)
`playable(30) + fun(20) + fair(20) + rewarding(15) + discovery(15)`. Gagal playability **atau**
density = **tidak lulus** apa pun skornya.

> **Golden Rule APPENDIX E:** *Density & playability adalah gate, bukan checklist. Pita gagal
> (reachable<5 / gap>reach / dead-air / prop kurang) di-REGEN. Softlock & blind-jump = fatal.*

---

# APPENDIX F — GENERATION ALGORITHM (deterministik + regen loop)

```
build_zone(zoneIndex, diff):
  1. pick biome(zoneIndex)                         # palet, pool, priority (APPENDIX C)
  2. build_spine:                                  # tulang jalur naik
       from startY going up: place a REACHABLE platform every gap∈[minGap, maxGap]
       ensure spine reaches gate/pelaminan (topReachable)
  3. fill_patterns:                                # tempel pola APPENDIX A per pita sesuai formula %
       respect chain rules (napas tiap ≤3 sulit; movers/breakables ≤3 berturut)
  4. place_powerups(relevance):                    # sebelum gauntlet/celah lebar (§7)
  5. place_enemies(spawnList, relative-Y):         # sebagai DATA {triggerY,type,x} terurut (§5.2)
  6. place_decor(parallax far/mid + fg props + ambient)  # kuota density (§3.3)
  7. validateDensity + playability → FIX/REGEN loop:
       while (fails): regenerate offending bands / insert filler (ring-trail/prop/platform)
  8. place_pieces(quota per zone, deterministik dari zoneIndex):  # cincin/hati ambang (APPENDIX X)
  9. finalize spawnList (sort by triggerY), set climaxY (zona 5)
```

**Determinisme:** pemetaan zona→kepingan & posisi kunci **deterministik dari `zoneIndex`** (slice
kontigu `INFOS`), bukan counter berjalan — agar cheat zona-jump / replay tak menggandakan kepingan.
Randomness pita boleh (seed per zona), tapi **hasil harus lulus validator**.

> **Golden Rule APPENDIX F:** *spine reachable dulu → tempel pola → power-up relevan → musuh sebagai
> data relatif-Y → dekor kuota → validateDensity/playability REGEN loop → baru tempel kepingan
> (deterministik). Validator bagian dari pipeline, bukan afterthought.*

---

# APPENDIX T — TECHNICAL FOUNDATION (Phaser 3.80.1)

- **Config & boot aman:** `type:AUTO`, `width:540,height:960`, `parent:'gw-stage'`,
  `physics:{default:'arcade',arcade:{gravity:{y:1400}}}`, `scale:{mode:FIT,autoCenter:CENTER_BOTH,
  width:540,height:960}`, `render:{pixelArt:true,antialias:false,roundPixels:true}`.
  **Trap ukuran-0:** JANGAN baca `this.scale.width/height` di `create()`; ukur parent via
  `getBoundingClientRect()`; pass width/height tetap; `game.scale.refresh()` bila perlu.
- **One-way platform (inti jumper):** collider dengan `processCallback`:
  ```js
  this.physics.add.collider(this.couple, this.platforms, this.onLand, function(couple, plat){
    return couple.body.velocity.y > 0 && couple.body.bottom <= plat.body.top + 10; // hanya saat turun
  }, this);
  // onLand: set velocity.y = -BOUNCE (atau power), squash, SFX, break/vanish per tipe
  ```
- **Kamera one-way ke atas:** follow manual `scrollY` (§9.1), bukan `startFollow` biasa.
- **Object pooling (Group):** `platforms`, `rings`, `hearts`, `enemies`, `bullets`, `powerups` sebagai
  Group `maxSize` nyata + `runChildUpdate`; `get()` null-check; `killAndHide` recycle.
- **Procedural texture:** `make.graphics` → `generateTexture` (guard `textures.exists`). Shading helper
  `box()/outline()` (§10.2). Downscale sel PNG ke key engine bila pakai aset (APPENDIX P).
- **Input:** keyboard `←/→`, pointer drag, `deviceorientation` (izin iOS). Abstraksi `{moveX,fire}`.
- **Animation/tween/particles (API 3.60+!):** `this.add.particles(x,y,key,cfg)` → `explode()`.
  **JANGAN** `createEmitter()` (throw di 3.80.1). `camera.shake` intensity float kecil (~0.012).
- **Cleanup KRITIKAL (script re-inject host):** `window.__gwCleanup()` di baris awal IIFE →
  `game.destroy(true)` + lepas listener `deviceorientation`/`resize` + `cancelAnimationFrame`. Guard
  `anims.exists`. (Pola lengkap APPENDIX S / host-contract.)

> **Golden Rule APPENDIX T:** *One-way collider (turun saja) + kamera one-way ke atas + pooling +
> partikel API 3.60+ + cleanup `game.destroy(true)` + guard texture/anim. Salah satu bocor = re-inject
> menumpuk game.*

---

# APPENDIX S — SINGLE-FILE ARCHITECTURE + boot aman + ground/kontrol ber-angka

- **3 file, IIFE.** Lapisan logis (walau monolitik): `Config`, `Boot/ensurePhaser`, `Textures`
  (buildTextures + slice PNG), `Doodler`, `PlatformManager`, `EnemyManager`, `PowerupManager`,
  `PieceManager` (kepingan), `HUD`, `Overlays`, `Store` (localStorage), `HostBridge` (musik/RSVP/ucapan).
- **`ensurePhaser()`** fallback: bila `!window.Phaser` → inject `<script src=CDN phaser 3.80.1>` lalu
  boot on-load. Selalu ada `showError()` on-screen (bedakan "Phaser gagal load" vs "bug logic").
- **Ground vs controller (⇄ hard-won §2, disesuaikan):** jumper tak berbasis tanah, tapi zona kontrol
  bawah tetap dijaga: `CONTROL_Y = BH - (isTouch ? 170 : 120)`; couple ditahan di ~62% (jauh di atas).
  `isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0` (hitung saat boot).
- **Boot aman:** ukur parent → set config → `new Phaser.Game` → `window.__gwGame` → daftarkan
  `window.__gwCleanup`.

> **Golden Rule APPENDIX S:** *Satu file, boot aman (ukur parent, ensurePhaser, showError, anti-0),
> kontrol bawah `BH-170` (touch), couple di 62% (tak tumpang tindih kontrol). Cleanup terdaftar.*

---

# APPENDIX P — ASET PNG (5 SPRITE SHEET)

Grafis "game sungguhan" via PNG sprite sheet (fallback prosedural WAJIB). **TEPAT 5 sheet** =
5 slot upload. Sel **≥80×80**, hadap default (jumper: couple hadap depan, musuh hadap arah gerak;
flip via engine). Frame satu entity horizontal kiri→kanan; entity beda = baris beda; frame-map **rect
eksplisit** (bukan grid seragam). Engine slice 1 gambar utuh → downscale ke key engine → anim +
key-out bg + fallback.

### P.1 Kebutuhan → 5 kelompok

| # | Kelompok | Isi | Tekstur engine |
|---|---|---|---|
| 1 | **player** | couple: idle×2, rise, apex, fall, land, hurt, launch, celebrate | `t_couple_*` |
| 2 | **enemy** | bee(fly×2,die), bird(hover×2,die), stormcloud(idle,shock), ufo(idle,beam,hit,die), spikeballoon(rise,pop), blackhole(swirl×2) | `t_bee_*`,`t_bird_*`,`t_storm_*`,`t_ufo_*`,`t_balloon_*`,`t_hole_*` |
| 3 | **environment** | platform hijau(tileable), biru, coklat(utuh+pecah), putih(utuh+fade), gerbang bunga, pelaminan, awan, gunung, bunga taman, bintang | `t_plat_green/blue/brown/brown_break/white/white_fade`,`t_gate`,`t_altar`,`t_cloud`,`t_flower`,… |
| 4 | **game-object** | cincin(spin×3), hati(pulse×2), spring(idle,compress), trampolin(idle,stretch), propeller(spin×2), jetpack(idle,flame×2), shield(bubble), peluru cinta, partikel spark/heart, confetti | `t_ring_*`,`t_heart_*`,`t_spring_*`,`t_tramp_*`,`t_prop_*`,`t_jet_*`,`t_shield`,`t_bullet`,`t_spark`,`t_confetti` |
| 5 | **box-kepingan** | wujud "kepingan info": amplop 💌 (float×2), penanda ambang (glow), ikon couple-mini untuk indikator | `t_amplop_*`,`t_piecemark`,`t_coupleicon` |

### P.2 JSON generate (contoh 2 entri; 5 blok penuh di `ASSET.md`)
```json
[
  { "kelompok":"player", "name":"couple.png",
    "deskripsi":"Sepasang pengantin mungil chibi berdampingan: pria kiri berjas hitam+dasi, wanita kanan bergaun putih+kerudung+buket, pipi merona. 9 frame horizontal: idle0/idle1 (napas), rise (badan stretch vertikal, tangan sedikit terangkat), apex (melayang, kelopak), fall (kaki menjuntai), land (squash lebar), hurt (flash merah, spin kecil), launch (dua tangan ke atas 'yeay'), celebrate (berpelukan). Hadap depan-kanan. Kaki di baris bawah sel.",
    "orderNumber":1, "frameWidth":96, "frameHeight":104 },
  { "kelompok":"enemy", "name":"bee.png",
    "deskripsi":"Lebah kartun ramah kuning-hitam bersayap. 3 frame: fly0/fly1 (kepak sayap naik-turun), die (mata X, gepeng + bintang). Hadap kanan. Pusat di tengah sel (terbang).",
    "orderNumber":1, "frameWidth":88, "frameHeight":88 }
]
```

### P.3 Frame-map (rect eksplisit per frame) + downscale + fallback
```js
// per-ROW (entity darat/couple: pivot bawah) & per-frame [x,y,w,h] untuk object kecil
{ key:'t_couple', top:6, ch:104, dh:52, hb:{w:46,h:52},
  frames:['idle0','idle1','rise','apex','fall','land','hurt','launch','celebrate'],
  rects:[[6,0,88],[100,0,88],[194,0,84],[282,0,84],[370,0,84],[458,0,96],[558,0,90],[652,0,90],[746,0,110]] }
// object kecil (downscale ke ew×eh; anim multi-frame):
{ key:'t_ring', ew:26, eh:26, anim:'o_ring', rate:8, frames:[[14,10,72,72],[92,10,60,72],[160,10,44,72]] }
```
Fallback: flag `usingPlayerAssets`/`usingEnemyAssets`/… — slot kosong/gagal → `buildTextures`
prosedural. Tak pernah blank.

### P.4 URUTAN UPLOAD BAKU (kritikal — slot dari urutan)
| Urutan | Kelompok | Variabel | `data-asset` |
|---|---|---|---|
| 1 | player | `{{asset_image_1}}` | `player_sheet` |
| 2 | enemy | `{{asset_image_2}}` | `enemy_sheet` |
| 3 | environment | `{{asset_image_3}}` | `environment_sheet` |
| 4 | game-object | `{{asset_image_4}}` | `object_sheet` |
| 5 | box-kepingan | `{{asset_image_5}}` | `piece_sheet` |

> Bila tema sudah pakai slot `asset_image` lain (mis. background) → geser nomor & dokumentasikan
> offset (pola metalslug slot 15/16). HTML `<img data-asset=... src="{{asset_image_N}}" hidden>`.
> **Petunjuk Upload untuk user WAJIB dicantumkan** di tema: "Upload urut: 1 player, 2 enemy,
> 3 environment, 4 game-object, 5 box-kepingan."

### P.5 `ASSET.md` (WAJIB di tahap 2)
File `src/sample-theme/jumper-wedding/ASSET.md` = brief pembuat aset: aturan umum (PNG transparan,
pixel-art no-AA, sel ≥80×80, kaki di bawah, penamaan) + **5 tabel kebutuhan** (No|file|w|h|tekstur
engine|jml frame|deskripsi frame) + **5 blok JSON** (mirror `player-assets.json`,…) + tata-letak +
urutan upload. Plus panduan prompt image-gen ("pixel-art sprite sheet, transparent, frames horizontal,
sel WxH seragam, no text/UI").

> **Golden Rule APPENDIX P:** *Satu kelompok = satu sheet = satu slot upload. Engine slice 1 gambar
> via rect eksplisit + downscale ke key lama → kode create/scale/hitbox lama tetap jalan. Slot kosong
> → fallback prosedural. Urutan upload = kebenaran slot.*

---

# APPENDIX W — WEDDING INTEGRATION (section → kepingan)

**Satu sumber binding:** `#inv-source` berisi SEMUA section sekali, `{{vars}}` + `data-info="<key>"`
per `<section>`, flag `{{#if}}` **MEMBUNGKUS `<section>`** (bukan isinya — jebakan kepingan hantu,
host-contract). Boot: scan `#inv-source > section[data-info]` → daftar section riil → **jumlah
kepingan & indikator dinamis** (jangan hardcode).

**Pemetaan section (verifikasi ke dynamic-variables.md — TIDAK mengarang nama):**

| # | `data-info` | Variabel utama | Flag pembungkus |
|---|---|---|---|
| 1 | `hero` | `groom_nickname`,`bride_nickname`,`wedding_date`,`quote`/`quote_by`, bg `photo_hero_cover` | selalu ada |
| 2 | `couple` | `groom_name`,`bride_name`,`photo_groom_photo`,`photo_bride_photo`, ortu `nama_bapak_*`/`nama_ibu_*`, `ig_laki_laki`/`ig_perempuan` | ortu:`flag_tampilkan_nama_orang_tua` · sosmed:`flag_tampilkan_sosial_media_mempelai` |
| 3 | `rsvp` | `countdown_hari/jam/menit/detik` + form RSVP (id host) | selalu ada |
| 4 | `schedule` | `tanggal_akad`,`jam_akad`,`nama_lokasi_akad`,`keterangan_lokasi_akad`,`akad_map` + resepsi `*_resepsi` | resepsi:`flag_lokasi_akad_dan_resepsi_berbeda` |
| 5 | `streaming` | `link_live_streaming` | `is_fitur_live_streaming` |
| 6 | `story` | `{{#each timeline_kisah}} this.tanggal/judul/deskripsi` | `flag_pakai_timeline_kisah` |
| 7 | `gallery` | `{{#each galleries}} this.url` | `has_gallery` |
| 8 | `happiness` | `sample_story_1..3`,`frame_balasan_instagram`,`link_balasan_instagram` | `flag_pakai_additional_feature_story_balasan_instagram` |
| 9 | `wishes` | form ucapan (id host) + `{{#each wishes}} this.guest_name/guest_message/guest_comment_time` | selalu ada |
| 10 | `gift` | `bank_1`/`rek_1`/`nama_rek_1` (+`_2`), QRIS `gambar_qris_rekening_1/2`, `alamat_lokasi_kirim_hadiah_offline` | `tampilkan_amplop_online`,`flag_pakai_2_rekening`,`flag_pakai_qris_rekening_1/2`,`flag_kirim_hadiah_offline` |
| 11 | `closing` | `kalimat_penutup`,`site_name`/`site_url` | selalu ada |

**Aturan penempatan (⇄ §6.5 skill):**
- **Section inti di zona awal:** `hero`, `schedule`, `rsvp` → ambang kepingannya tercapai di **Zona
  1–2** (tamu yang berhenti di tengah tetap dapat info pokok).
- **Kepingan ≠ power-up** (murni naratif/koleksi, tanpa buff).
- Semua kepingan **reachable** (validator `allPiecesReachable`, APPENDIX E).

> **Golden Rule APPENDIX W:** *Satu `#inv-source`, `{{#if}}` membungkus `<section>`, scan → kepingan
> dinamis. Section inti (hero/schedule/rsvp) di zona awal. Nama variabel diverifikasi, tak dikarang.*

---

# APPENDIX X — COLLECTION MECHANIC (currency → kepingan)

### X.1 Bentuk kepingan (khas jumper)
- **Currency = cincin 💍 (nilai 1) & hati ❤️ (nilai 3)** tersebar di jalur & cabang (APPENDIX A
  `R001/R002`). Hati di jalur berisiko/cabang (butuh wrap/geser presisi) → reward > usaha.
- **Ambang → kepingan:** tiap section punya **ambang** currency. Saat total currency melewati ambang
  section berikutnya (urut) → **`unlockInfo(key)`**: ikon indikator section itu menyala + toast +
  SFX + partikel (+ animasi cincin terbang ke indikator). **Currency tetap** (tidak dikurangi) —
  ambang bersifat kumulatif, jadi progres terasa terus maju.

### X.2 Quota per-zona + auto-scale
- **Distribusi ambang deterministik dari section riil:** urutkan section riil → bagi ambang secara
  bertahap (mis. section ke-i butuh currency kumulatif `≈ i × basePerPiece`). `basePerPiece`
  di-skala agar **kepingan awal di Zona 1–2, sisanya menyebar** sampai Zona 4 (jangan menumpuk di
  akhir/awal).
- **Auto-scale saat section dikurangi flag:** jumlah kepingan = jumlah section riil; ambang
  **redistribusi proporsional** (jangan hardcode 11).
- **Cincin/hati yang tersebar** jauh lebih banyak dari yang minimum diperlukan → **filler skor**
  (slot pola sisa jadi cincin trail, §3.3), level tetap padat walau kepingan sedikit.

### X.3 Respons-ambil (WAJIB — no auto-open)
Mengambil cincin/hati **hanya**: +currency, cek ambang, (bila ambang lewat) nyalakan ikon + toast +
SFX + partikel. **JANGAN auto-open modal**. Tamu memilih sendiri klik ikon indikator untuk membaca
section (modal meng-clone dari `#inv-source[data-info=key]`).

> **Golden Rule APPENDIX X:** *Cincin/hati = currency; ambang kumulatif membuka kepingan (currency tak
> berkurang). Deterministik dari section riil, auto-scale saat flag mengurangi section. Ambil kepingan
> = nyalakan ikon + toast, TAK auto-open. Sisa currency = filler skor (level padat).*

---

# APPENDIX Y — CHEAT SYSTEM + RESET PENUH

### Y.1 Cheat (satu flag `cheat.on`, dua ranah)
- **Ke undangan:** semua kepingan **langsung ter-unlock** (semua ikon menyala) + tombol **Buka
  Undangan aktif**.
- **Ke game:** couple **kebal** (tak HURT, tak jatuh keluar — auto-catch), **akses semua zona**
  (zona-select terbuka), bebas pilih kesulitan.
- **Skor dibekukan saat cheat** (fairness). Bisa **di-toggle balik** (kembalikan tantangan).
- **Persist = keputusan sadar (default JANGAN).** Yang di-persist = **hasil koleksi kepingan**
  (`unlocked`), bukan `cheat` (device satu HP dipakai banyak tamu → reload = kembali jujur, tapi
  kepingan yang sudah dibuka tetap kebuka). Guard celebration (`announcedAll`/`completed`)
  **di-persist**.
- **Audit cheat-bypass blind spot** (⇄ memory retromario-debugging): pastikan invincible/piece-unlock
  tak bocor ke mode normal (satu flag, dicek di jalur HURT & di jalur unlock).

### Y.2 RESET = PENUH (⇄ hard-won §21 — bukan sebagian)
Tombol ⟲ → overlay konfirmasi (bukan `confirm()` native). Bila ya:
1. `localStorage.removeItem(STORE_KEY)` → `STORE=defaults()` (**`diff`→default**, `unlocked=[]`,
   `maxZone=0`, `best=0`, `announcedAll=false`, `completed=false`).
2. `GAME.destroy(true)` → **zona benar-benar reset**; `runState=freshRun()`, `cheat.on=false`
   (matikan badge ★, sembunyikan zona-select).
3. Rebuild indikator (semua kepingan terkunci lagi) + reset picker kesulitan.
4. **Kembali ke COVER** (`showOverlay('cover')`) → pilih kesulitan lagi + PRESS START dari awal.
5. Verifikasi harness: tulis storage palsu → reset → assert storage ter-wipe (diff→default,
   zona→0) & cover tampil.

> **Golden Rule APPENDIX Y:** *Satu flag cheat (kebal + auto-unlock kepingan), skor beku, tak
> di-persist (default). Reset = PENUH: wipe storage (incl. kesulitan) + `GAME.destroy(true)` + kembali
> ke cover. Audit agar cheat tak bocor ke mode normal.*

---

# APPENDIX Z — HOST CONTRACT & WIRING

### Z.1 Cleanup + auto-resume
- **`window.__gwCleanup()`** di baris awal IIFE (idempotent): `game.destroy(true)` + lepas listener
  `deviceorientation`/`resize`/pointer + cancelAnimationFrame. Tanpa ini, re-inject (tiap submit
  RSVP/ucapan/hadiah, resolve gambar, toggle musik) → game/loop menumpuk.
- **Auto-resume HANYA bila cover & reveal TIDAK tampil** (⇄ host-contract §auto-resume, bug "START
  gabisa dibuka"): simpan `window.__jwStarted={zone}`; di `init()`, resume hanya jika `!coverUp &&
  !revealUp`. Re-inject yang me-`show` cover → biarkan cover/START berfungsi.

### Z.2 ID host verbatim (tanpa prefix)
`btn-show-qr`, `btn-show-menu`, `btn-toggle-music`/`btn-music`, `bg-music`, `play-icon`/`pause-icon`,
`btn-submit-ucapan`+`wish-name`+`wish-message`, `btn-submit-kehadiran`+`rsvp-status`/`rsvp-guests`/
`rsvp-code`, `alert-submit-*`. Form ini hidup di dalam modal kepingan/reveal (di-clone dari
`#inv-source`) tapi **ID tetap verbatim** (host yang fetch).

### Z.3 Musik (mirror idempotent — jangan putar tema)
Host memegang audio; tema hanya **klik `#btn-toggle-music`** & **mirror ikon**. Simpan **intent**
(`musicWanted`) + generation guard; klik hanya bila state host **masih** salah, dengan retry
terjadwal (⇄ memory retromario-host-music — bug "musik tidak jalan" karena double-click). Mirror
event `play`/`pause` yang host dispatch ke `#bg-music`.

### Z.4 RSVP / ucapan / hadiah (panggil fungsi global + fallback)
```js
if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; } // else fallback lokal
if (typeof window.submitRsvp   === 'function') { window.submitRsvp();   return; }
```
ID input verbatim (`wish-name`/`wish-message`/`rsvp-*`). Ubah/prefix ID = fitur backend mati diam.

### Z.5 Countdown
`{{countdown_hari/jam/menit/detik}}` di-render host jadi `<span>` ber-ID yang **di-update host tiap
detik**. Jangan timpa innerHTML container itu lewat RAF game. (Boleh JS sendiri pakai
`{{wedding_date_iso}}` bila butuh countdown di HUD game.)

### Z.6 Lightbox
Lightbox galeri sendiri → **class berbeda** (mis. `.jw-gallery-item`), bukan `.gallery-item`/
`.lightbox-injection` (agar host tak membajak klik).

### Z.7 Layout 2-kolom + HUD map + toast (ringkas — detail §9)
Desktop: frame game **mentok KIRI** (480px) + panel **pure undangan** KANAN (canvas couple + akad/
resepsi + map, no tombol game). HUD: ICON kiri-atas · indikator kepingan kanan-atas · kontrol bawah.
Toast atas-tengah (~18–30%), 3–6s. Dialog pilih (zona/kesulitan) pakai tombol **OK** (klik = pending,
OK = commit, ada Batal — ⇄ hard-won §14). Semua UI = tombol game (no link telanjang, ⇄ §20).

> **Golden Rule APPENDIX Z:** *Cleanup idempotent + auto-resume cek-cover. ID host verbatim. Musik =
> mirror idempotent (jangan putar tema). RSVP/ucapan panggil fungsi host + fallback. Layout 2-kolom
> frame-kiri/undangan-kanan. Countdown milik host.*

---

## SELF-CHECK (checklist "Bible selesai")

- [x] Mengikuti kerangka bible-template: §0–§12 + APPENDIX A–F + T/S/P + W–Z.
- [x] **Spesifik arketipe jumper** (bukan generik): fisika auto-bounce ber-angka, one-way platform,
      horizontal wrap, kamera one-way ke atas, 4 tipe platform + power-up kanonik Doodle Jump.
- [x] **Beat-sheet referensi Doodle Jump** (§3.2) + **lantai density transpose-vertikal** (§3.3)
      + **validator NO DEAD AIR** (reachable≥5, gap≤reach, dead-air≤0.6·BH, reward≤1.5·BH) sebagai
      **gate regen** (APPENDIX E/F) — bukan checklist.
- [x] Aturan **ber-angka** (gravity/bounce/spring/gap/kamera 62%/kontrol BH-170), bukan kata sifat.
- [x] Contoh kode **Phaser 3.80.1 benar** (one-way processCallback, particles API 3.60+,
      `game.destroy(true)`, spawn relatif kamera-Y).
- [x] **APPENDIX P** (5 sprite sheet + JSON + frame-map rect eksplisit + urutan upload + fallback
      prosedural + `ASSET.md`).
- [x] Nama variabel undangan **terverifikasi** ke dynamic-variables.md (APPENDIX W).
- [x] APPENDIX W–Z lengkap: kepingan reachable & dinamis, cheat + reset penuh, celebration 2-pemicu
      (APPENDIX D), layout 2-kolom, mirror musik idempotent, `{{#if}}` membungkus `<section>`, ID host
      verbatim.
- [x] Semua aturan hard-won ditranspos sadar ke sumbu vertikal (kotak ⇄ TRANSPOSE): kamera, spawn,
      ground/kontrol, boss→klimaks pelaminan, toast, dialog OK, UI game, reset.
- [x] Tiap bagian besar punya **Golden Rule**.
- [x] Disimpan di `src/sample-theme/jumper-wedding/JUMPER_WEDDING_BIBLE.md`.

## CATATAN VERIFIKASI (untuk Tahap 2)

- **Screenshot headless Chrome TIDAK bekerja di mesin ini** (selalu blank) — jangan dipercaya.
- Verifikasi 3 file: paste ke **Theme Editor** host (`ThemeEditorPage.tsx`) → buka preview, atau
  minta user. Logika (auto-bounce, one-way, spawn relatif-Y, kamera one-way, validator, damage/unlock)
  → **harness Node headless** menjalankan `update()` asli dengan RAF di-stub.
- Selalu ada `showError()` on-screen (bedakan "Phaser gagal load" vs "bug logic").
- Waspada **cheat-bypass** (kebal/piece-unlock bocor ke mode normal) — invarian harness.
- Invarian harness jumper WAJIB: (1) tak ada softlock (selalu ada pijakan reachable ≤`JUMP_REACH` di
  atas pijakan reachable-terakhir); (2) musuh/platform belum-masuk-layar **tak** ber-hitbox (spawn
  relatif kamera-Y); (3) reset → storage ter-wipe (diff→default, zona→0) + cover tampil; (4) jalur
  unlock kepingan deterministik dari section riil (tak dobel saat zona-jump).
</content>
</invoke>
