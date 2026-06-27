# SPACEWAR WEDDING — GAME DESIGN BIBLE

> **Output Tahap 1.** Dokumen ini adalah **sumber kebenaran** untuk men-generate 3 file tema
> (`index.html` + `index.css` + `index.js`) di Tahap 2. **Jangan** menulis 3 file itu sekarang.
> Engine = **Phaser 3.80.1**, arsitektur **single-file** (IIFE, tanpa bundler, aset
> procedural + opsi PNG sprite-sheet). Target kedalaman: **≥ Bible Mario** tetapi spesifik ke
> arketipe **horizontal space shoot-'em-up** (R-Type / Gradius / Metal Slug "space mission").

---

## DAFTAR ISI

- **§0** Meta & elevator pitch
- **§1** Core Principles (8 filosofi)
- **§2** Core Gameplay Loop
- **§3** World / Sector Structure + beat-sheet density (NO DEAD AIR)
- **§4** Player System (the Ship "BIDUK BINTANG")
- **§5** Enemy / Obstacle System (≥6 tipe + spawn relatif-kamera)
- **§6** Interaction & Collision Matrix
- **§7** Power-up / Weapon System (Power Meter ala Gradius)
- **§8** Difficulty Scaling (ramah undangan, tanpa nyawa)
- **§9** Camera & Readability
- **§10** Game Feel / Juice + Grafis
- **§11** Audio Design
- **§12** Anti-Frustration Rules
- **APPENDIX A** — Pattern Library (≥28 pola ber-ID)
- **APPENDIX B** — Entity Encyclopedia (yaml)
- **APPENDIX C** — Biome / Sector Library (6 sektor)
- **APPENDIX D** — Boss / Climax System (3 fase, "Stasiun Pelaminan")
- **APPENDIX E** — Validator Engine (playability + density)
- **APPENDIX F** — Generation Algorithm
- **APPENDIX T** — Technical Foundation (Phaser 3.80.1)
- **APPENDIX S** — Single-file Architecture + boot
- **APPENDIX P** — Aset PNG (5 sprite sheet)
- **APPENDIX W** — Wedding Integration (section → kepingan)
- **APPENDIX X** — Collection Mechanic
- **APPENDIX Y** — Cheat System + Reset penuh
- **APPENDIX Z** — Host Contract & Wiring (layout 2-kolom, HUD, toast, dialog)
- **§V** — Catatan Verifikasi (Tahap 2)

---

## §0 — META & ELEVATOR PITCH

| Field | Nilai |
|---|---|
| **Nama tema (folder)** | `spacewar-wedding` |
| **Judul game** | **BIDUK BINTANG — Space War Wedding** ("biduk" = bahtera/perahu, kiasan bahtera rumah tangga) |
| **Arketipe** | Horizontal-scrolling shoot-'em-up (shmup) |
| **Referensi klasik** | R-Type (Force pod, charge beam, hazard lingkungan), Gradius (Power Meter capsule, formasi, option), Metal Slug "space" mission (kepadatan, juice) |
| **Engine** | Phaser 3.80.1, arcade physics **gravity y=0** (ship terbang bebas 2D) |
| **Arsitektur** | single-file 3-berkas, IIFE, cleanup hook `window.__gwCleanup` |
| **Mood pasangan** | epik-romantis sci-fi: "menembus perang antarbintang menuju Stasiun Pelaminan" |
| **Resolusi internal** | potret mobile, diukur dari parent (`getBoundingClientRect`), `Scale.FIT` |

**Elevator pitch.** Dua kru pengantin — **kapten pria (BIDUK)** dan **navigator wanita (BINTANG)** —
menerbangkan satu kapal kecil menembus 6 sektor galaksi yang dijaga armada asteroid, drone, turret
orbital, dan korvet musuh. Tiap sektor menyembunyikan **kapsul-undangan** (💌 berbentuk kapsul Gradius)
yang harus **ditembak/diambil** di tengah baku-tembak; mengumpulkannya membuka kepingan undangan satu
per satu. Klimaks: menembus **Stasiun Pelaminan** (boss benteng bergaya R-Type) untuk "menyatukan dua
bintang". Tamu yang tak ingin bermain cukup menekan **★ Cheat** untuk membuka semua kepingan instan.
Undangan tetap berfungsi penuh: RSVP, ucapan, amplop, QR, musik — semua lewat kontrak host.

> **Catatan engine penting (beda dari platformer):** ini **bukan** game gravitasi. Kapal terbang
> bebas (thrust ke 8 arah), **tidak ada "tanah"**. Aturan `GROUND_Y` (§Z) **diadaptasi**: bukan garis
> tanah, melainkan **batas bawah area-main (`PLAY_BOTTOM`)** supaya kapal & musuh tak pernah berada di
> belakang kontrol sentuh. Semua aturan layout/kamera/HUD/boss/density tetap berlaku.

---

## §1 — CORE PRINCIPLES (filosofi yang menyetir tiap keputusan)

Tiap prinsip: **aturan keras** + **BENAR/SALAH** + **WHY**.

### 1.1 Playability First (Game Dulu, Baru Undangan)
- **Aturan:** target **60fps**; input→tembak latency ≤ 1 frame; kapal harus terasa "responsif &
  licin". Undangan adalah **hadiah yang ditemukan**, bukan paksaan.
- ✅ BENAR: spawn musuh, hazard, kapsul mengalir terus; menembak selalu memberi ledakan.
- ❌ SALAH: layar kosong panjang lalu tiba-tiba "menang"; kepingan otomatis tanpa main.
- **WHY:** kalau game-nya hambar, tamu menutup tab sebelum sampai undangan.

### 1.2 Teach Before Test (onboarding tanpa kata — metode Mario 1-1 diadaptasi shmup)
- **Aturan:** 600px pertama (start safe zone) = 1 drone lambat telegraph + 1 asteroid besar pelan +
  1 kapsul power-up gratis. Tak ada hazard mematikan sebelum pemain menembak ≥3×.
- ✅ BENAR: drone pertama bergerak pelan lurus → memaksa tembakan pertama; mati 1-hit = "menembak itu
  benar".
- ❌ SALAH: turret menembak pemain di detik 0.
- **WHY:** pemain non-gamer belajar lewat interaksi aman, bukan teks.

### 1.3 Fair Challenge (telegraph wajib)
- **Aturan:** tiap serangan high-damage punya **wind-up ≥0.5s (≥15 frame)** lewat ≥2 kanal (kedip
  warna + SFX charge). Peluru musuh **reactable** (≤ kecepatan reaksi pemain).
- **WHY:** padat ≠ tidak adil. Kematian harus terbaca sebagai "salahku", bukan "curang".

### 1.4 Readability (siluet & warna)
- **Aturan:** kapal pemain = **cyan/putih** (warna "kita"); peluru pemain = cyan terang; musuh =
  merah/oranye/ungu; peluru musuh = **amber/merah menyala** dengan inti putih. Kapsul-undangan =
  **emas berdenyut** (beda total dari power-up biru). Siluet tiap entity unik.
- **WHY:** di layar penuh peluru, pemain harus instan tahu "apa yang membahayakanku & apa yang
  kukoleksi".

### 1.5 Discovery / Reward (dopamin terjadwal)
- **Aturan:** reward nyata (power-up / kapsul / skor-besar) tiap **≤15–20 detik** (§3, §7).
- **WHY:** shmup klasik menjaga aliran reward; kepingan undangan **menambah** cadence, bukan
  menggantikan.

### 1.6 Inklusif (Cheat Mode, §Y)
- **Aturan:** satu tombol ★ → semua kepingan terbuka + kapal kebal + stage-select + pilih kesulitan.
- **WHY:** undangan harus bisa dibuka tamu yang benci game.

### 1.7 Ramah (undangan, bukan shmup hardcore)
- **Aturan:** **TANPA nyawa & game-over** (§8). Kena = **knockback kecil + i-frame**, bukan mati.
  Kapal keluar batas/terdorong hazard = relokasi ke titik **aman**. EASY default.
- **WHY:** R-Type asli brutal (one-hit + checkpoint mundur); itu racun untuk undangan.

### 1.8 No Dead Air (kepadatan ditegakkan validator, §3/§E)
- **Aturan:** tiap jendela 1-layar wajib ada musuh/hazard/kapsul/ledakan/prop bergerak. Segmen sepi
  = **regenerate** (validator, bukan harapan).
- **WHY:** sumber utama "game terasa hambar".

> **Golden Rule §1:** *Buat game-nya enak & padat dulu; undangan menyelinap masuk sebagai hadiah.*

---

## §2 — CORE GAMEPLAY LOOP

```
        ┌──────────────────────────────────────────────────────┐
        │  TERBANG (thrust 8-arah)  →  TEMBAK (auto-fire/charge)│
        │        ↑                              │               │
        │   hindari peluru &              hancurkan musuh /     │
        │   hazard lingkungan             asteroid / formasi    │
        │        │                              ↓               │
        │   ambil POWER-UP biru          jatuh KAPSUL (biru=power│
        │   (Power Meter ala Gradius)     emas=undangan 💌)      │
        │        │                              ↓               │
        │   pilih senjata (laser/spread/  UNLOCK kepingan →     │
        │   missile/option/shield)        ikon menyala + toast  │
        └───────────────┬──────────────────────────────────────┘
                        ↓  (tiap sektor)
              MINI-BOSS / pivot eskalasi → SEKTOR berikut
                        ↓  (sektor 6)
        STASIUN PELAMINAN (boss benteng) → SATUKAN DUA BINTANG → menang
```

**Verb utama:** **TERBANG** (gerak bebas 2D) + **TEMBAK** (hold = auto-fire; tahan lalu lepas =
charge beam ala R-Type). Verb sekunder: **CHARGE**, **SWAP power-up** (Power Meter), **BOM/granat**
(opsional, layar-clear).

> **Golden Rule §2:** satu putaran = *terbang–tembak–hindar–ambil*; undangan adalah hasil "ambil",
> bukan "selesaikan level".

---

## §3 — WORLD / SECTOR STRUCTURE + BEAT-SHEET (NO DEAD AIR)

### 3.1 Struktur sektor (angka konkret)

- Game = **6 sektor** (APPENDIX C). Tiap sektor = **scroll horizontal** sepanjang
  `SECTOR_LEN = 7200 px` (≈ 60–90 detik @ scroll auto), kecuali sektor boss `len ≈ 4800` (koridor
  approach + arena).
- **Scroll otomatis** ke kanan dengan kecepatan `SCROLL = 90 px/s` (EASY) / `110` (NORMAL) /
  `135` (HARD). Kapal pemain bisa bergerak relatif di dalam viewport (R-Type style), tapi tak bisa
  mundur keluar tepi kiri kamera.
- **Start safe zone:** 600px pertama tiap sektor (onboarding/breather), dikecualikan dari kuota
  *musuh* (tapi **tetap** wajib prop + ≥1 musuh telegraph pelan).
- **Goal sektor:** mini-boss (sektor 1–5) atau **Stasiun Pelaminan** (sektor 6).
- **Pacing template per sektor:** `Start(breather) → Teach(formasi mudah) → Practice(2 bidang
  ancaman) → Test(gauntlet/hazard) → Reward(power-spike+kapsul) → Mini-boss`.
- **Kurva sawtooth:** 3–5 puncak per sektor + 1 mini-boss; lembah **tetap terisi** (asteroid drift,
  capsule, prop bergerak) — bukan kosong.

### 3.2 Beat-sheet referensi (reverse-engineer R-Type St.1 + Gradius St.1) — *kepadatan yang ditiru*

> Disusun dari StrategyWiki R-Type/Stage 1, Gradius/Stage 1, Shmups Wiki. Tujuan: **ekstrak lantai
> kepadatan**, bukan menyalin. ~70–90 detik main, **13 cluster event**:

| # | Posisi | Event (musuh / item / hazard / formasi / boss) |
|---|--------|-----------------------------------------------|
| 1 | spawn | starfield + **landmark: bulan pecah** (parallax); 1 drone lambat lurus → tembakan pertama |
| 2 | +detik | **kapsul biru gratis** (power-up pertama dalam detik, ala Gradius "power di muka") |
| 3 | layar sama | **formasi 5 drone gelombang** (sinus) dari kanan-atas → bila semua dihancurkan, drop kapsul |
| 4 | atas/bawah | **2 turret orbital** menempel di struktur atas+bawah (ancaman 2-bidang vertikal) |
| 5 | mid | **kapsul-undangan 💌 #1** melayang (harus ditembak/diambil) + asteroid drift sebagai cover |
| 6 | mid | **ladang asteroid** (hazard lingkungan R-Type) — celah sempit, drift pelan, bisa ditembak hancur |
| 7 | eskalasi | **korvet ranged** muncul, menembak burst telegraph → melee(drone)+ranged(korvet) bersamaan |
| 8 | **sabuk laser** | TERRAIN berubah: **palang laser berkedip** (on/off 1.2s) + drone penyusup di celah + **barel-plasma** (chain-explode) → 3 bidang |
| 9 | struktur | **gun-platform** (turret heavy) di dinding + **kapsul-undangan 💌 #2** di balik celah |
| 10 | **gerbang** | **power-up besar: FORCE POD** (option/laser kuat) diberikan tepat sebelum musuh berat |
| 11 | gauntlet | **2 korvet heavy** datang **satu per satu** (gated di balik dapat Force) |
| 12 | dasar | **POW: bebaskan "satelit komunikasi" → CHARGE-BEAM upgrade** (reward besar) |
| 13 | **MINI-BOSS** | **Penjaga Gerbang** (drone-carrier): semburan peluru fan + spawn drone; weak-point inti |

**Yang dipelajari generator:**
- Power-up pertama **dalam detik** (#2), bukan menit.
- Reward/kapsul tiap **~15–20 detik** (#2,#5,#9,#10,#12).
- Eskalasi monoton naik: drone → +turret → +korvet ranged → +hazard laser → +heavy → mini-boss.
- Tiap power berat **digated** (Force diberikan tepat sebelum korvet heavy).
- TERRAIN berubah (#6 ladang asteroid, #8 sabuk laser) — bukan ruang kosong lurus.
- Tiap "napas" tetap terisi (asteroid drift #6, capsule #2) — breather ≠ kosong.

### 3.3 Density Metrics (LANTAI — divalidasi §E)

| Metrik | Lantai (minimum) | Catatan shmup |
|---|---|---|
| **Max dead air** | **≤2 detik / ≤0.75 layar** tanpa entity/event | aturan terkeras |
| **Musuh aktif / layar** (zona tempur) | **≥3–4** (EASY 3 · NORMAL 4 · HARD 6) | "kadang ada kadang nggak" = pelanggaran |
| **Hazard/struktur (pengganti "pijakan") / layar** | **≥1** elemen lingkungan (asteroid cluster / palang laser / dinding turret) tiap ~0.6–1.0 layar | shmup tak punya platform; struktur = "elevasi" |
| **Prop dekorasi / layar** | **≥1 far-parallax (nebula/bintang) + 1–2 landmark midground (planet/bangkai kapal/struktur) + 2–4 destructible foreground (barel-plasma/asteroid/turret kecil)** | jawab "dekorasi kurang" |
| **Ambient motion / layar** | **≥1** (bintang melaju / kilat nebula / puing berputar / kabut) | layar tak boleh beku |
| **Reward cadence** | kapsul/power/kepingan/skor tiap **≤15–20 detik** | dopamin |
| **Power-spike** | 1 reward besar per pivot eskalasi (Force/charge/option) | senjata baru |
| **Destructible / layar** | **≥2** (barel-plasma / asteroid / turret) | ledakan = noise visual konstan |
| **Bidang ancaman di zona eskalasi** | **≥2 simultan** (drone depan + turret vertikal, atau ranged + hazard) | template #8 |

**Rasio tipe musuh (kalibrasi, geser per-sektor):** drone-rush ~50% / ranged(korvet/turret) ~35% /
heavy-vehicle(carrier/mech) ~15%. Sektor awal lebih drone; heavy hanya **setelah** pemain diberi
counter (Force/charge).

> **Golden Rule §3:** *Setiap jendela selebar layar HARUS hidup — musuh, hazard, kapsul, ledakan,
> atau prop bergerak. Lantai ditegakkan validator (§E), bukan harapan.* Datar/kosong/"musuh kadang
> ada kadang nggak" = **gagal → regenerate**.

---

## §4 — PLAYER SYSTEM (Kapal "BIDUK BINTANG")

### 4.1 Arsitektur
```js
class Ship extends Phaser.Physics.Arcade.Sprite {
  constructor(scene,x,y){ super(scene,x,y,'t_ship'); scene.add.existing(this);
    scene.physics.add.existing(this); this.body.setAllowGravity(false); /* shmup: no gravity */ }
}
```
- Gravity dunia **`y:0`** (config). Kapal bergerak via **velocity langsung** dari input (bukan
  akselerasi gravitasi). `body.setCollideWorldBounds(true)` lalu **clamp manual** ke area-main
  (`PLAY_TOP..PLAY_BOTTOM`, §Z) supaya tak ke belakang kontrol/HUD.

### 4.2 State machine (ASCII)
```
        ┌────────────────────────────────────────────────┐
        │            idle (drift halus, mesin menyala)    │
        │  input → thrust(dir) → tilt sprite ±12° (bank)  │
        │  hold fire → autofire ; hold+release → CHARGE   │
        │  hit → hurt (flash+knockback+i-frame ~900ms)    │
        │  charging → charge-glow (level 1→2→3)           │
        │  bomb → screen-clear flash (cooldown)           │
        └────────────────────────────────────────────────┘
states: idle · thrust(up/down/left/right + diag) · charging · firing · hurt · (no "dead": ramah)
```

### 4.3 Fisika & angka (terukur)
| Param | EASY | NORMAL | HARD | Catatan |
|---|---|---|---|---|
| `SHIP_SPEED` (px/s) | 300 | 330 | 360 | velocity langsung; diagonal dinormalisasi (×0.707) |
| `FIRE_RATE` (ms) | 150 | 140 | 130 | auto-fire saat tombol ditahan |
| `BULLET_SPEED` (px/s) | 720 | 720 | 760 | peluru pemain ke kanan; despawn di tepi viewport |
| `MAX_BULLETS` | 14 | 12 | 10 | cap proyektil simultan (pool) |
| `CHARGE_T1/T2/T3` (ms) | 350 / 800 / 1400 | sama | sama | 3 tingkat charge-beam (R-Type) |
| `INVULN_MS` (i-frame) | 1100 | 900 | 700 | setelah kena hit |
| `KNOCKBACK` (px) | 60 | 70 | 80 | dorongan saat kena (bukan mati) |
| `SHIELD_HITS` | 3 | 2 | 2 | bila power-up Shield aktif (menyerap, lalu pecah) |

- **Tilt/bank:** saat thrust vertikal, `setAngle(±12)` (juice; tak ubah hitbox). Saat diam, lerp ke 0.
- **Hitbox kecil & adil (shmup convention):** body **lebih kecil dari sprite** (mis. 14×10 untuk
  sprite 48×34) — "graze" terasa enak. Hitbox terpusat di kokpit.

### 4.4 ANIMASI per-state (WAJIB — jangan statis; §12 hardwon)
- **idle** (2 frame, ~3fps, mesin berdenyut/exhaust kedip), **thrust** (exhaust memanjang 3 frame,
  ~12fps), **bank-up/bank-down** (sayap miring), **charging** (glow inti membesar L1→L3),
  **fire** (recoil kecil + muzzle), **hurt** (flash merah + getar), **shield-on** (gelembung
  berputar). Exhaust = partikel/anim, bukan sprite beku.
- Procedural-friendly: banyak frame texture (APPENDIX P fallback) + `anims.create`/`play`, guard
  `anims.exists` (§19 hardwon).

### 4.5 Input abstraction
- Model tunggal `{up,down,left,right,fire,bomb,charge}` dari **keyboard** (panah/WASD + Space=fire +
  Shift=charge/hold + B=bomb) **DAN** **touch** (floating joystick kiri-bawah + tombol FIRE/CHARGE/
  BOM kanan-bawah). Auto-fire bila `fire` ditahan; charge = tahan FIRE > `CHARGE_T1`.

> **Golden Rule §4:** kapal terbang bebas (no gravity), hitbox kecil-adil, tiap state ber-animasi,
> kena = knockback bukan mati.

---

## §5 — ENEMY / OBSTACLE SYSTEM

### 5.1 Palet musuh (≥6 tipe, peran beda; pool besar; ≤2 tipe/wave)

| ID | Nama | Peran | HP (NORMAL) | Gerak | Serang | Sektor |
|---|---|---|---|---|---|---|
| `E_DRONE` | Drone Pengintai | rusher/fodder | 1 | sinus/lurus ke kiri | tabrak | 1–6 |
| `E_TURRET` | Turret Orbital | ranged statik | 3 | menempel struktur atas/bawah | tembak aimed burst | 1–6 |
| `E_KORVET` | Korvet Merah | ranged mobile | 4 | masuk, tahan, mundur | 3-spread telegraph | 2–6 |
| `E_FLYER` | Pesawat Penyergap | flyer cepat | 2 | menukik diagonal (swoop) | tabrak + 1 peluru | 2–6 |
| `E_CARRIER` | Kapal Induk Drone | heavy/spawner | 10 | drift pelan, immovable-ish | melepas drone tiap 1.5s | 3–6 (mini-boss support) |
| `E_MECH` | Mech Artileri | heavy/tank | 8 | maju–berhenti | rudal lambat homing-lemah | 4–6 |
| `E_MINE` | Ranjau Plasma | hazard ranjau | 1 | diam/drift | meledak saat dekat (telegraph kedip) | 3–6 |
| `H_ASTEROID` | Asteroid | hazard destructible | 2–4 | drift | tabrak (pecah jadi 2 kecil) | semua |
| `H_LASERGATE` | Palang Laser | hazard timing | ∞ | statik | on/off 1.2s (telegraph kedip 0.4s) | 2,4,6 |
| `H_BAREL` | Barel-Plasma | destructible explosive | 1 | statik/drift | meledak → AoE (chain) | semua |

- **≤2 tipe musuh per wave** (sweet spot keterbacaan) **tapi selalu ADA wave** (≥3–4 aktif/layar di
  zona tempur). Mook (`E_DRONE`,`E_FLYER`) mati 1 hit; hanya heavy ber-telegraph yang tahan lama.

### 5.2 AI state machine (contoh `E_KORVET`)
```
spawn(tepi kanan) → ENTER(masuk ke x target, 0.6s) → HOLD(diam, aim 0.5s telegraph) →
FIRE(3-spread aimed ke ship) → COOLDOWN(0.8s) → [ulang 2×] → EXIT(mundur ke kanan) | die
```
Wind-up telegraph: badan kedip + SFX charge ≥0.5s sebelum FIRE (§1.3).

### 5.3 Wave shape (terukur)
- **Triangle** (mulai sedikit → tambah tiap sub-wave → puncak) untuk fight normal.
- **Diamond** (fodder → lebih sedikit-tapi-kuat → 1 elite) menuju mini-boss.
- Spawn **dari tepi kanan layar** (arah datang); formasi: line, sinus, V, pincer (atas+bawah).

### 5.4 Spawn RELATIF-KAMERA (WAJIB — bug "peluru bunuh musuh off-screen", §23 hardwon)
- Musuh off-screen = **DATA inert**: record `{x:triggerX, type, y, fmt}` di array **terurut naik
  `triggerX`**. **JANGAN** `enemies.create()` semua saat build sektor.
- Tiap frame: `while (cam.scrollX + BW >= spawnList[next].x) spawnEnemy(spawnList[next++])`; musuh
  **lahir di `x = max(rec.x, cam.scrollX + BW)`** (tepi kanan), bukan world-X jauh.
- **Hitbox hanya untuk musuh aktif**; musuh belum-spawn tak punya body. Peluru pemain **despawn di
  tepi viewport** (`bl.x > cam.scrollX+BW+16`). Musuh self-despawn saat ter-scroll keluar kiri
  (`e.right < cam.scrollX - grace`).
- **INVARIAN diverifikasi harness:** taruh record di triggerX jauh kanan + tembak → TIDAK kena;
  scroll sampai `edge≥triggerX` → musuh lahir di tepi → baru bisa kena.

### 5.5 Lantai spawn (bukan murni `Math.random()`)
- Density floor (§3.3) **dijamin per-segmen** oleh validator (§E). Spawn probabilistik **dibatasi
  bawah**: bila segmen < `minEnemiesPerScreen`, generator menyisipkan record sampai lolos. "Musuh
  kadang ada kadang nggak" = **bug**, bukan selera.

### 5.6 Pooling
- `physics.add.group({classType, maxSize, runChildUpdate:true})` per tipe (atau satu group + tipe-tag).
  `get()` selalu null-check. Reset `body.enable`/velocity saat reuse. Musuh & peluru musuh **wajib
  pooled** (target 60fps mobile).

### 5.7 ANIMASI musuh (WAJIB)
- Tiap musuh: idle/move (thruster kedip), aim/telegraph (pose+warna beda), fire (recoil+muzzle),
  hurt (flash), die (ledakan partikel). Carrier: bay terbuka saat melepas drone. Mech: recoil meriam.

> **Golden Rule §5:** ≥6 tipe (≤2/wave), spawn relatif-kamera (off-screen = data), lantai kepadatan
> dijamin validator, semua ber-animasi & datang dari beberapa arah.

---

## §6 — INTERACTION & COLLISION MATRIX

| A \ B | Enemy | Peluru musuh | Asteroid/Mine | Palang laser (ON) | Barel-plasma | Power-up biru | Kapsul 💌 emas |
|---|---|---|---|---|---|---|---|
| **Ship** | knockback+i-frame | knockback+i-frame | knockback+i-frame | knockback+i-frame | knockback (ledak) | **collect (overlap)** | **collect → unlockInfo** |
| **Peluru pemain** | damage (kill saat hp 0) | (lewat / opsional cancel) | damage (pecah) | (lewat) | damage → ledak AoE | — | **damage → drop konten** |
| **Charge beam** | pierce + damage besar | cancel | pecah | (lewat) | ledak | — | unlock (sekali) |

- **Collider vs overlap:** ship×enemy/peluru/hazard = **overlap** (deteksi saja; separasi ditangani
  manual via knockback). power-up & kapsul = **overlap** (pickup). Tidak ada lantai/platform solid
  (shmup) → **tak ada collider gravitasi**.
- **i-frame:** saat `INVULN_MS` aktif, ship kedip & semua overlap damage di-skip.
- **Anti-tunnel peluru cepat (§22 hardwon, diadaptasi):** karena tak ada platform yang "memakan"
  peluru, masalah utama = **tunneling** peluru cepat melompati musuh tipis. **`manualEnemyHits()`
  sweep tiap frame** (span prev→now sepanjang sumbu-x) sebagai safety-net; `hitEnemy()` di-guard
  `b.active && e.active` (idempotent, overlap + sweep tak double-count).

> **Golden Rule §6:** ship pakai overlap+knockback (bukan mati); peluru pakai sweep anti-tunnel
> idempotent; kapsul 💌 di-collect, bukan menyelesaikan level.

---

## §7 — POWER-UP / WEAPON SYSTEM (Power Meter ala Gradius)

### 7.1 Power Meter (kapsul biru → pilih upgrade)
- Hancurkan **formasi/enemy spesial** → drop **kapsul biru**. Tiap kapsul **menggeser highlight** di
  Power Meter (HUD bawah-tengah, kecil): `SPEED → MISSILE → DOUBLE → LASER → OPTION(Force) → SHIELD`.
  Tekan **CHARGE/select** saat highlight di slot diinginkan → aktif, meter reset (persis Gradius).
- Auto-fire bila pemain malas pilih (tetap nyaman untuk non-gamer).

### 7.2 Senjata (segitiga coverage↔damage↔rate)
| Senjata | Sifat | Angka |
|---|---|---|
| **DOUBLE** | 2 arah (depan + diagonal atas) | coverage; dmg 1/peluru |
| **LASER** | sinar tembus lurus | damage tinggi, sempit; pierce 3 musuh |
| **MISSILE** | rudal melengkung ke bawah (kena musuh rendah) | melengkapi celah vertikal |
| **SPREAD** | 3-way fan | coverage lebar, dmg 1 |
| **OPTION/FORCE POD** | drone pendamping (R-Type Force) menembak paralel; bisa di depan kapal sbg perisai | reward besar pivot |
| **CHARGE BEAM** | tahan FIRE → lepas: L1 (×3) / L2 (×6 pierce) / L3 (×12 layar-lebar) | risk/reward |
| **SHIELD** | menyerap `SHIELD_HITS` lalu pecah | defensif |

- **Powerup Relevance Rule (§6.5 skill):** senjata ofensif **wajib punya usage-window** — minimal
  ≥1 musuh/segmen berbahaya sebelum goal. Generator (§F) menolak menaruh Force/charge tepat sebelum
  goal tanpa musuh; bila tak ada musuh → ganti **reward pasif** (skor/heal-shield). *Useful >
  Reachable.*
- **Kepingan undangan ≠ power-up ofensif** — kapsul 💌 **tidak** memberi buff gameplay (loop koleksi
  terpisah dari balancing senjata).
- **Ramah:** mati/kena **tidak** menurunkan senjata ke default (beda dari Gradius asli) — undangan,
  bukan hardcore. (Opsi HARD: Shield pecah saja.)

> **Golden Rule §7:** Power Meter Gradius beri pilihan & dopamin; tiap senjata ofensif punya
> usage-window; kapsul undangan tak pernah jadi buff.

---

## §8 — DIFFICULTY SCALING (ramah; tanpa nyawa)

### 8.1 Tiga knob (bukan ramp lurus)
| Knob | EASY | NORMAL | HARD |
|---|---|---|---|
| `SCROLL` px/s | 90 | 110 | 135 |
| `minEnemiesPerScreen` | 3 | 4 | 6 |
| Peluru musuh speed | 180 | 220 | 270 |
| `INVULN_MS` | 1100 | 900 | 700 |
| Kapsul-power frekuensi | tinggi | sedang | rendah |
| Boss TTK target | 22s | 30s | 38s |

### 8.2 Kurva sawtooth
- Per sektor: teach → practice → **puncak (gauntlet)** → lembah (breather terisi) → puncak lebih
  tinggi → mini-boss. Antar sektor naik bertahap; sektor 6 = klimaks.

### 8.3 RAMAH (§17 hardwon — wajib)
- **HAPUS nyawa & game-over.** Kena = **knockback + i-frame**. HUD "nyawa" di-repurpose → **bom/skor/
  shield**.
- **Jangan balik ke awal sektor.** Tak ada checkpoint-mundur brutal R-Type. Bila kapal terdorong ke
  hazard / keluar batas → **relokasi ke titik aman** (mundur ~150px ke ruang bebas musuh ~220px,
  bukan hazard), **freeze musuh sekitar ~1s** (anti spawn-kill).
```js
findSafeRespawn(fromX, fromY){
  for (var dx=0; dx<260; dx+=40){
    var x = Math.max(cam.scrollX+80, fromX-dx);
    if (this.nearHazard(x, fromY)) continue;
    if (this.nearEnemy(x, fromY, 220)) continue;
    return {x:x, y: Phaser.Math.Clamp(fromY, PLAY_TOP+30, PLAY_BOTTOM-30)};
  }
  return {x: cam.scrollX+100, y:(PLAY_TOP+PLAY_BOTTOM)/2};
}
```
- **EASY default** untuk undangan. Cheat = kebal total.

> **Golden Rule §8:** undangan = ramah → tanpa nyawa/game-over; kena=knockback+i-frame; relokasi ke
> titik aman; EASY default. Tantangan via knob, bukan hukuman.

---

## §9 — CAMERA & READABILITY

- **Auto-scroll horizontal**: kamera berjalan ke kanan `SCROLL px/s` (shmup) — bukan follow ketat
  player. Implementasi: `cam.scrollX += SCROLL*dt`; kapal bergerak relatif di viewport.
- **Player tidak di tengah — condong KIRI ⅖ (adaptasi §1 hardwon):** karena ancaman datang dari
  **kanan**, ruang main kapal ideal di **kiri ~40% layar** agar pandangan depan luas. Clamp posisi
  kapal: `shipX ∈ [cam.scrollX+40, cam.scrollX + BW*0.62]` (boleh maju sampai ~62%, default nyaman di
  ~40%). **Jangan** biarkan kapal mepet tepi kanan (musuh muncul tak sempat dibaca).
- **Deadzone tak relevan** (auto-scroll), tapi **lerp halus** untuk goyangan kamera/juice
  (`shake/flash`).
- **No blind spawn:** musuh selalu lahir **di tepi kanan terlihat** (§5.4) + telegraph ≥0.5s sebelum
  menembak → tak ada kejutan tak adil.
- **Boss:** saat masuk arena (§D), kamera **berhenti scroll** (lock) — walk-in (kapal mencapai
  `arenaX`).

> **Golden Rule §9:** auto-scroll ke kanan; kapal di kiri ⅖ (ruang depan luas, batas ~62%); musuh
> lahir di tepi terlihat + telegraph. Tak ada kejutan tak terbaca.

---

## §10 — GAME FEEL / JUICE + GRAFIS

### 10.1 Juice (angka; stack di frame impact yang sama)
- **Hit pause / freeze:** mook 2–4 frame (33–66ms); boss/charge-hit 5–8 frame (cap ~0.4s).
- **Screen shake (trauma model):** `trauma += 0.2` (hit kecil) / `+=0.5` (ledakan besar/boss),
  `shake = trauma²`, decay 200–400ms; `camera.shake(120, 0.02)` (intensity float kecil).
- **Flash:** putih 1–3 frame saat ledakan; merah saat ship kena (`camera.flash(80,255,80,80)`).
- **Squash & stretch:** ledakan asteroid → ring ekspansi; ship charge → inti membesar (×1.25).
- **Partikel (API 3.60+!):** `this.add.particles(0,0,'t_spark',{...emitting:false})` →
  `em.explode(16,x,y)`. **JANGAN** `createEmitter()` (throw di 3.80.1).
- **SFX pitch-vary** ±1–3 semitone pada tembakan berulang; 3–5 variasi.

### 10.2 Grafis prosedural (di-shade — jangan flat; §6 hardwon)
- Tiap sprite = **base + highlight (top ~22%) + shadow (bottom ~22%) + outline gelap**
  (`lineStyle(2,0x0a0e1a)`). Helper `box()`/`outline()` (lihat APPENDIX T §5).
- Detail pembeda: kokpit kaca cyan (ship), mata-sensor merah (drone), laras meriam (mech),
  **weak-point boss bersinar** (kuning + inti putih). Siluet unik per entity.
- **Opsi grafis "game sungguhan": PNG sprite-sheet** (APPENDIX P) menggantikan prosedural; prosedural
  tetap **fallback** (jangan blank).

### 10.3 Backdrop (lihat APPENDIX C; ≥3 lapis parallax)
- Far `scrollFactor 0.15` (nebula gradient + bintang), mid `0.4` (planet/bangkai kapal/struktur),
  near `0.7` (asteroid/puing/turret kecil). Ambient: bintang melaju, kilat nebula, puing berputar.

> **Golden Rule §10:** stack shake+freeze+flash+partikel+SFX di frame impact; tiap sprite di-shade
> + outline; backdrop 3 lapis + ambient. Flat/kosong = belum selesai.

---

## §11 — AUDIO DESIGN

- **SFX game via Web Audio / `this.sound`** (kategori: fire, charge-loop, hit, explode, collect-power,
  collect-piece, shield, win). Pitch-vary tembakan.
- **Backsound undangan = MILIK HOST. JANGAN diputar tema** (§Z). Tema hanya klik `#btn-toggle-music`
  + mirror ikon (idempotent).
- **SFX kemenangan** (celebration §D/§Z) = audio game, **bukan** backsound tenant.

> **Golden Rule §11:** SFX game bebas; backsound tenant tak pernah disentuh tema.

---

## §12 — ANTI-FRUSTRATION RULES

- **No spawn-kill:** musuh lahir di tepi + telegraph ≥0.5s; setelah relokasi/respawn, freeze musuh
  ~1s.
- **No mandatory-hidden:** kepingan 💌 selalu **terlihat & dapat dijangkau** (tidak di balik dinding
  buntu); reachable divalidasi (§E).
- **Telegraph hazard pertama:** palang laser/ranjau pertama tiap sektor diberi telegraph ekstra
  (kedip 0.6s) sebelum aktif.
- **Hitbox adil:** ship hitbox kecil (graze enak); musuh hitbox sedikit generous (memuaskan).
- **Charge tak menghukum:** menahan charge tetap boleh gerak; tak ada penalti bila lepas tanpa target.

> **Golden Rule §12:** semua hazard ter-telegraph; kepingan selalu reachable & terlihat; tak ada
> spawn-kill; hitbox ship kecil-adil.

---

# APPENDIX A — PATTERN LIBRARY (≥28 pola ber-ID)

> Pola = blok level yang bisa di-rangkai generator. Prefix: `W`=wave musuh, `H`=hazard/terrain,
> `S`=struktur, `R`=reward, `P`=kepingan, `B`=mini-boss. Tiap pola: layout ASCII (→ = arah scroll),
> purpose, rules, chaining. (`>`=musuh, `*`=peluru, `O`=asteroid, `≡`=palang laser, `▢`=barel, `$`=
> kapsul biru, `💌`=kapsul undangan, `T`=turret, `■`=struktur.)

| ID | Nama | ASCII | Purpose | Rules | Chain |
|---|---|---|---|---|---|
| `W001` | Drone Line | `> > > >` (lurus) | onboarding tembak | 4 drone 1-hit | sesudah breather |
| `W002` | Sinus Wave | `>~>~>~` | gerak naik-turun | 5 drone sinus; drop $ bila habis | bisa loop ≤2× |
| `W003` | V-Formation | `>`<br>`>>`<br>`>` | reward charge | 4–5 drone bentuk V | sebelum power-spike |
| `W004` | Pincer | `>` (atas) + `>` (bawah) | tekanan 2-arah | drone atas+bawah serempak | zona eskalasi |
| `W005` | Korvet Hold | `>—aim—*` | telegraph ranged | 1–2 korvet HOLD→3-spread | maks 2/wave |
| `W006` | Swoop Flyer | `↘ ↗ ↘` | flyer menukik | 2–3 flyer diagonal | breaker monoton |
| `W007` | Carrier Drop | `[C]→ drone…` | spawner | 1 carrier lepas drone tiap 1.5s | mini-boss support |
| `W008` | Mech March | `[M]→ ▮rudal` | heavy gated | 1–2 mech setelah Force | post power-spike |
| `H010` | Asteroid Field | `O O O` (celah) | hazard navigasi | drift, bisa ditembak pecah | cover natural |
| `H011` | Laser Gate | `≡  ≡  ≡` (on/off) | timing | on/off 1.2s, telegraph 0.4s | maks 3 berturut |
| `H012` | Mine Drift | `◦ ◦ ◦` | hazard ranjau | meledak dekat (kedip) | sparse |
| `H013` | Debris Sweep | `↙puing↙` | ambient+hazard ringan | puing lewat, low-dmg | filler |
| `S014` | Turret Wall | `■T  ■T` | ranged vertikal | 2 turret atas+bawah | dengan W001 |
| `S015` | Gun Platform | `■■■T` | heavy turret | turret hp3 di dinding | gate kepingan |
| `S016` | Hangar Bay | `[bay]→drone` | landmark+spawn | struktur besar (midground) | sektor industri |
| `R020` | Capsule Drop | `…$` | power cadence | drop saat formasi habis | tiap ≤15–20s |
| `R021` | Force Gate | `…[OPTION]` | power-spike | Force/charge sebelum heavy | 1×/pivot |
| `R022` | Satellite POW | `[POW]→charge↑` | reward besar | bebaskan → charge upgrade | mid-sektor |
| `R023` | Score Trail | `· · · ·` | filler skor | trail poin isi slot kosong | anti-dead-air |
| `P030` | Piece Float | `…💌` | kepingan | kapsul emas, tembak/ambil | quota per-sektor |
| `P031` | Piece Behind Gate | `≡…💌` | kepingan ber-tantangan | di balik laser-gate | maks 1/sektor |
| `P032` | Piece Escort | `>>💌>>` | kepingan dikawal | dikelilingi drone | reward usaha |
| `B040` | Gatekeeper | `[mini-boss]` | mini-boss sektor | fan-bullet + spawn drone; weak-point | akhir sektor 1–5 |
| `B041` | Twin Korvet | `[K][K]` | mini-boss alt | 2 korvet elite serempak | variasi |
| `W009` | Elite Diamond | `> >>> > [E]` | diamond ke boss | fodder→elite | pra-mini-boss |
| `H017` | Crusher Wall | `■↕■` (buka-tutup) | celah timing | dinding buka-tutup 1.5s | sektor benteng |
| `R024` | Shield Pickup | `…[SH]` | defensif | shield 2–3 hit | sebelum gauntlet |
| `S018` | Wreck Landmark | `[bangkai kapal]` | landmark midground | rasa tempat (no dmg) | tiap sektor ≥1 |

**Pattern Chain Rules:**
- Jangan **>3 pola sama** berturut (mono = bosan). Setelah `H011`×2 → wajib selingi `W`/`R`.
- Tiap `R021/R022` (power-spike) **wajib** diikuti ≥1 pola berbahaya (`W008`/`B040`) — usage-window.
- Tiap **start safe zone** = `R020` (kapsul gratis) + `W001` pelan + ≥1 prop (`S018`).
- **Reward cadence:** sisipkan `R020/R022/R023/P030` agar gap reward ≤2.5 layar.

**Level Generation Formula (% pola per difficulty, panduan):**
| Pola | EASY | NORMAL | HARD |
|---|---|---|---|
| Wave musuh (W) | 45% | 50% | 55% |
| Hazard/struktur (H/S) | 20% | 22% | 25% |
| Reward (R) | 25% | 18% | 12% |
| Kepingan (P) | sesuai quota sektor | sesuai quota | sesuai quota |
| Mini-boss (B) | 1/sektor | 1/sektor | 1/sektor |

> **Golden Rule A:** rangkai pola dengan chain-rules + reward cadence; tiap power-spike punya
> usage-window; tiap segmen lolos density.

---

# APPENDIX B — ENTITY ENCYCLOPEDIA (yaml)

```yaml
# ---------- PLAYER ----------
ship_biduk_bintang:
  texture: t_ship
  body: { w: 14, h: 10, anchor: center }     # hitbox kecil (graze enak)
  speed: { easy: 300, normal: 330, hard: 360 }
  states: [idle, thrust, charging, firing, hurt, shield]
  fire: { rate_ms: 140, bullet: t_pbullet, speed: 720, max: 12 }
  charge: { t1: 350, t2: 800, t3: 1400 }
  invuln_ms: { easy: 1100, normal: 900, hard: 700 }
  on_hit: knockback   # bukan mati (ramah)
  anims: { idle: 3fps, thrust: 12fps, charging: glow_l1_l3, hurt: flash }

# ---------- MUSUH ----------
E_DRONE:
  texture: t_e_drone
  hp: 1
  behavior: move_left_sinus
  speed: 160
  attack: contact        # tabrak
  score: 100
  die: explode_small
E_TURRET:
  texture: t_e_turret
  hp: 3
  behavior: attach_struct   # menempel atas/bawah
  attack: { type: aimed_burst, telegraph_ms: 600, bullets: 2, bspeed: 220 }
  score: 250
E_KORVET:
  texture: t_e_korvet
  hp: 4
  behavior: enter_hold_fire_exit
  attack: { type: spread3, telegraph_ms: 550, bspeed: 220 }
  score: 350
E_FLYER:
  texture: t_e_flyer
  hp: 2
  behavior: swoop_diagonal
  attack: { type: contact_plus_1, bspeed: 240 }
  score: 200
E_CARRIER:
  texture: t_e_carrier
  hp: 10
  behavior: drift_slow
  attack: { type: spawn_drone, every_ms: 1500, max_children: 6 }
  score: 800
  die: explode_big + drop_capsule
E_MECH:
  texture: t_e_mech
  hp: 8
  behavior: march_stop
  attack: { type: rocket_weakhoming, telegraph_ms: 700, bspeed: 160 }
  score: 600
E_MINE:
  texture: t_e_mine
  hp: 1
  behavior: drift_or_static
  attack: { type: proximity_explode, radius: 70, telegraph_ms: 400 }
  score: 150

# ---------- HAZARD ----------
H_ASTEROID:
  texture: t_asteroid
  hp: { large: 4, small: 2 }
  behavior: drift
  on_destroy_large: split_into_2_small
  attack: contact
H_LASERGATE:
  texture: t_lasergate
  hp: invincible
  behavior: toggle
  cycle: { on_ms: 1200, off_ms: 1200, telegraph_ms: 400 }
H_BAREL:
  texture: t_barel
  hp: 1
  behavior: static_or_drift
  on_destroy: explode_AoE(radius:90, chain:true)

# ---------- KAPSUL ----------
capsule_power:
  texture: t_capsule_blue
  pickup: shift_power_meter   # Gradius style
piece_capsule:
  texture: t_amplop           # kapsul emas berdenyut
  hp: 1                        # bisa ditembak ATAU di-overlap
  pickup: unlockInfo(key)     # kepingan undangan
  glow: gold_pulse

# ---------- BOSS ----------
STASIUN_PELAMINAN:
  texture: t_boss
  hp: { easy: ttk22s, normal: ttk30s, hard: ttk38s }
  phases: 3
  weak_point: core_glow       # R-Type style: inti yang harus ditembak
  walk_in: true               # arenaX
  hit_detect: manual_per_frame # bukan overlap fisika (§16)
  hp_bar: small_above_boss + big_top_center
```

> **Golden Rule B:** tiap entity 1-lawan-1 dengan tekstur engine & state-machine; kebutuhan sprite
> (APPENDIX P) diturunkan dari sini.

---

# APPENDIX C — BIOME / SECTOR LIBRARY (6 sektor)

> Tiap sektor = palet sky/nebula sendiri + ≥3 lapis parallax + props + enemy pool + hazard khas +
> pattern-priority. **Rebuild backdrop per sektor** (`bgGroup.clear`). Kuota prop per lebar-layar:
> ≥1 far + 1–2 landmark mid + 2–4 destructible foreground + ≥1 ambient.

| # | Sektor | Palet nebula | Landmark midground | Hazard khas | Enemy pool (≤2/wave) | Kapsul 💌 |
|---|---|---|---|---|---|---|
| 1 | **Orbit Bumi** | biru-hitam + bumi separuh | bulan pecah, satelit tua | asteroid ringan | drone, turret | 3 |
| 2 | **Sabuk Asteroid** | abu-ungu berdebu | bangkai kapal raksasa | ladang asteroid + mine | drone, korvet, asteroid | 3 |
| 3 | **Nebula Merah** | merah-magenta berkabut | planet gas, badai listrik | palang laser + kabut (low-vis) | korvet, flyer, carrier | 2 |
| 4 | **Pangkalan Musuh** | besi-kuning industri | hangar bay, derek orbital | crusher wall + turret padat | turret, mech, mine | 2 |
| 5 | **Medan Perang** | oranye-asap (puing terbakar) | armada hancur, mercusuar | debris sweep + barel padat | mech, korvet, flyer | 1 |
| 6 | **Stasiun Pelaminan** | emas-violet (cahaya pelaminan) | stasiun cincin raksasa | laser-gate + crusher (approach) | drone+korvet (penjaga) → BOSS | 0 (boss) |

- **Physics modifier opsional:** sektor 3 (nebula) low-visibility (kabut overlay alpha) → musuh
  telegraph diperkuat; sektor 5 (asap) ambient partikel padat.
- **Difficulty antar-sektor:** scroll & density floor naik bertahap (§8); sektor 6 = puncak.
- **Pattern priority per sektor:** sektor 1 lebih `W001/W002/R020` (ajar); sektor 4 lebih `S015/H017`
  (benteng); sektor 5 lebih `W008/W009` (heavy) menuju boss.

> **Golden Rule C:** tiap sektor punya identitas visual + hazard + enemy pool sendiri; backdrop
> 3-lapis + props rebuild per sektor; tak ada layar hitam/kosong.

---

# APPENDIX D — BOSS / CLIMAX SYSTEM — "STASIUN PELAMINAN"

> Klimaks = **menyatukan dua bintang** (menembus benteng yang memisahkan kapten & navigator).
> Bergaya **R-Type boss** (benteng dengan **weak-point inti** yang baru terbuka di fase tertentu).

### D.1 Walk-in (WAJIB — §5 hardwon)
- Sektor 6 punya **koridor approach** (≥1 layar, dijaga 2–3 drone/korvet). Boss dibuat
  **INACTIVE** (`setActive(false)` **HINDARI** untuk body — pakai `setAlpha(0)` + flag `bossActive`;
  lihat D.4). Simpan `arenaX = len − 0.9·BW`.
- Kamera **auto-scroll normal** dulu. Saat `ship.x ≥ arenaX` → `activateBoss()`: fade-in boss,
  **baru** lock kamera (`cam.scrollX` berhenti / `setBounds`), pasang dinding kanan arena, flash+SFX.
- Reset `arenaX=null; bossActive=false` di awal `buildSector` (jangan bocor ke sektor biasa).

### D.2 Tiga fase (threshold HP, eskalasi via evolusi moveset)
| Fase | Threshold HP | Moveset | Safe-window |
|---|---|---|---|
| **1 — Perisai** | 100→66% | turret samping menembak aimed burst; weak-point **tertutup** (tembak turret untuk membuka) | lebar |
| **2 — Inti Terbuka** | 66→33% | weak-point inti terbuka & berdenyut; boss tembak **fan 3-bolt aim ke ship** + spawn 2 drone | sedang |
| **3 — Amukan** | 33→0% | laser sweep horizontal (telegraph 0.8s) + fan 5-bolt + mine drift; inti kedip cepat | sempit |

- **Telegraph:** tiap serangan lethal wind-up **≥0.5s** (kedip+SFX charge); laser sweep ≥0.8s.
- **Weak-point window:** recovery boss ≥0.75–1s setelah serangan besar (cukup untuk hit/charge).
- Transisi fase = beat: flash + SFX + boss bergetar.

### D.3 HP bar + bisa kalah (WAJIB — §11 hardwon, bug dibayar 2×)
- **HP bar besar** fixed top-center arena (`rectangle setScrollFactor(0)`) **DAN** **HP bar kecil di
  ATAS boss** (world-space, ikut posisi). Update tiap `hitBoss`.
- **TTK target 22s(EASY)/30s/38s(HARD)**: `bossHP ≈ DPS_menengah × ttk`. Jangan > 60s.
- Tiap hit: flash + freeze + partikel + bar turun (pemain yakin "masuk").

### D.4 Hit-detection MANUAL (WAJIB — §16 hardwon)
- **JANGAN `setActive(false)`** untuk sembunyikan boss (mematikan body → tak kena tembak). Pakai
  `setAlpha(0)` + flag `bossActive`.
- **Cek hit manual tiap frame** (immune ke bug body bobbing/immovable):
```js
GameScene.prototype.manualBossHits = function(){
  var b=this.boss; if(!b||!b.active||!this.bossActive) return;
  var coreOpen = this.bossPhase>=2;          // weak-point hanya kena saat terbuka
  this.bullets.getChildren().forEach(function(bl){
    if(bl.active && Math.abs(bl.x-b.coreX)<58 && Math.abs(bl.y-b.coreY)<66){
      if(coreOpen && !bl.getData('nade')) this.hitBoss(b);
      this.killBullet(bl);
    }
  }, this);
};
```
- **Peluru boss WAJIB aim ke ship** + fan-spread (±0.12 rad), **bukan** flat konstan.

### D.5 Victory sequence (celebration — 2 pemicu, §Z)
- `defeatBoss()` → beat meriah ±5s (screen flash + fireworks partikel + **SFX kemenangan**) →
  `setTimeout(~4.5s)` → dialog happy-ending (rangkum skor/sektor + **nama mempelai dinamis** +
  CTA "Buka Undangan"). **Saat menang, pastikan SEMUA kepingan ter-unlock.** Guard `completed`
  (persist) agar tak terulang saat re-inject.

> **Golden Rule D:** boss walk-in (aktif saat ship≥arenaX); HP bar (besar+kecil) + TTK 22–38s; hit
> **manual** (alpha bukan setActive false); peluru aim ke ship; victory meriah lalu dialog +
> semua kepingan unlock.

---

# APPENDIX E — VALIDATOR ENGINE

### E.1 Playability checklist (gate keras)
- `goalReachable` — boss/akhir sektor tercapai tanpa softlock.
- `allPiecesReachable` — tiap kapsul 💌 berada di jalur yang **dapat dilewati & terlihat** (tidak di
  balik dinding buntu / di luar `PLAY_TOP..PLAY_BOTTOM`).
- `noSpawnKill` — tak ada musuh menembak dalam 0.5s pertama setelah spawn pemain/relokasi.
- `noUnreadableHazard` — tiap palang laser/ranjau punya telegraph ≥0.4s.
- `weaponUsageWindow` — tiap power-spike ofensif punya ≥1 musuh/segmen berbahaya sebelum goal.
- `pieceNotPowerup` — kapsul 💌 tak memberi buff gameplay.

### E.2 Validator DENSITY "NO DEAD AIR" (gate keras — di-RUN generator)
```js
// SEG = 1 viewport (BW). Iterasi kontigu sepanjang sektor.
function validateDensity(sector, BW, opts){
  var fails=[];
  for (var x=sector.startX; x<sector.endX; x+=BW){
    var seg = sector.window(x, x+BW);
    var enemies   = seg.count('enemy');
    var structHaz = seg.count('struct|hazard');   // pengganti "pijakan": asteroid/laser/turret-wall
    var decorFar  = seg.count('parallax_far');
    var decorMid  = seg.count('landmark_mid');
    var destruct  = seg.count('destructible');     // barel/asteroid/turret
    var ambient   = seg.count('ambient_motion');
    var combat = !seg.isSafeZone;
    if (combat && enemies < opts.minEnemiesPerScreen) fails.push([x,'enemies',enemies]);
    if (structHaz < opts.minStructPerScreen)          fails.push([x,'struct',structHaz]);
    if (decorFar < 1)                                 fails.push([x,'parallax_far']);
    if (decorMid < 1)                                 fails.push([x,'landmark_mid']);
    if (destruct < opts.minDestructiblePerScreen)     fails.push([x,'destructible',destruct]);
    if (ambient < 1)                                  fails.push([x,'ambient']);
    var biggestGap = seg.largestEmptyRun('enemy|capsule|destructible|hazard|event');
    if (biggestGap > opts.maxDeadPx)                  fails.push([x,'deadair',biggestGap]);
  }
  if (sector.maxRewardGap() > opts.rewardEveryPx)     fails.push(['*','reward-gap']);
  return fails; // kosong = lolos; tidak kosong = REGENERATE segmen-segmen itu
}
var DENSITY = {
  minEnemiesPerScreen:    3,                       // easy 3 · normal 4 · hard 6
  minStructPerScreen:     1,                       // ≥1 struktur/hazard tiap layar
  minDestructiblePerScreen: 2,
  maxDeadPx:    Math.round(BW*0.75),
  rewardEveryPx:Math.round(BW*2.5),
};
```
- Validator **bagian dari generation loop** (§F), bukan checklist. **Lantai, bukan plafon.**
  Start safe zone dikecualikan dari kuota *musuh* saja (prop/struktur/ambient tetap wajib).

### E.3 Scoring (lulus ≥80/100)
`playable(0–30) + fun(0–25) + fair(0–20) + rewarding(0–15) + discovery(0–10)`. < 80 → regenerate.

> **Golden Rule E:** segmen yang bisa dilewati tanpa pemain berinteraksi (musuh/hazard/kapsul/
> ledakan/prop) = **GAGAL → regenerate**. Playability + density dua-duanya gate keras.

---

# APPENDIX F — GENERATION ALGORITHM

```
FUNCTION buildSector(idx, diff):
  1. pick biome = SECTORS[idx]; set palette, parallax(3 layers), enemyPool, hazardPool
  2. build spine: startSafeZone(600px) → segments[] sampai SECTOR_LEN → goal(mini-boss|boss)
  3. fill patterns: untuk tiap segmen pilih pola (APPENDIX A) ikut pattern-priority biome +
     chain-rules (no >3 sama; power-spike diikuti bahaya)
  4. place entities: ubah pola jadi spawnList[] (record {x:triggerX,type,y,fmt}) TERURUT naik x;
     props/landmark/destructible ditaruh per layar (kuota APPENDIX C)
  5. validateDensity(sector) → JIKA fails: sisipkan filler (R023 score-trail / W001 / prop /
     destructible) atau REGEN segmen → ULANGI sampai kosong
  6. place pieces: ambil quota[idx] kepingan (APPENDIX X) → P030/P031/P032 di slot reachable,
     section inti (hero/schedule/rsvp) di sektor AWAL
  7. validatePlayability (E.1) → JIKA gagal: fix/regen
  8. score (E.3) ≥80 → commit; else regen
RETURN sector
```
- **Deterministik dari `idx`** (seed = idx) → stage→kepingan deterministik (APPENDIX X), bukan
  counter berjalan (cheat stage-jump aman).

> **Golden Rule F:** density loop **bagian pipeline**; kepingan ditaruh **setelah** density lolos;
> playability+score gate sebelum commit.

---

# APPENDIX T — TECHNICAL FOUNDATION (Phaser 3.80.1)

### T.1 Config & boot aman (gravity 0 untuk shmup)
```js
const config = {
  type: Phaser.AUTO, parent: 'gw-stage',
  width: W, height: H,                       // dari getBoundingClientRect (TETAP) — JANGAN baca this.scale di create()
  backgroundColor: '#05060f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default:'arcade', arcade:{ gravity:{ y:0 }, debug:false } },  // shmup: y:0
  render: { pixelArt:true, antialias:false, roundPixels:true },
  scene: [BootScene, GameScene],
};
```
- **Trap ukuran-0:** ukur parent via `getBoundingClientRect()`, pass W/H **tetap**; bila parent
  belum ter-size, retry `requestAnimationFrame`. `showError()` on-screen bila Phaser gagal.

### T.2 Scene lifecycle
`init(data)`→`preload`→`create`→`update(time,delta)`. Pakai `delta` (ms) → scroll & gerak
frame-rate-independent (`cam.scrollX += SCROLL*delta/1000`).

### T.3 Arcade physics (shmup, no gravity)
- `body.setAllowGravity(false)` tiap entity. Gerak via `setVelocity` langsung dari input/AI.
- **overlap** (bukan collider) untuk ship×musuh/peluru/kapsul (deteksi tanpa separasi); separasi
  ship = knockback manual.
- `JustDown/JustUp` untuk fire-charge edge (charge = tahan; lepas = fire beam).

### T.4 Pooling (peluru, musuh, partikel — WAJIB)
```js
this.bullets = this.add.group({ classType: PBullet, maxSize: 14, runChildUpdate:true });
const b = this.bullets.get(); if (b) b.fire(x,y);     // SELALU null-check
// despawn di tepi viewport (§5.4)
```

### T.5 Procedural texture + SHADING (jangan flat)
```js
function box(g,x,y,w,h,base,hi,sh){
  g.fillStyle(base,1); g.fillRect(x,y,w,h);
  if(hi!=null){ g.fillStyle(hi,1); g.fillRect(x,y,w,Math.max(1,h*0.22|0)); }
  if(sh!=null){ g.fillStyle(sh,1); g.fillRect(x,y+h-(h*0.22|0),w,Math.max(1,h*0.22|0)); }
}
function outline(g,x,y,w,h){ g.lineStyle(2,0x0a0e1a,1); g.strokeRect(x,y,w,h); }
// guard: if(!this.textures.exists('t_ship')){ …generate… }
```
Ship: badan cyan + kokpit kaca + exhaust. Drone: sensor merah. Boss: weak-point glow kuning+inti putih.

### T.6 Input (keyboard + virtual joystick)
- `createCursorKeys()` + `addKeys('W,A,S,D,SPACE,SHIFT,B')`. Touch: floating joystick (rexVirtualJoystick
  pin via CDN) kiri-bawah + tombol FIRE/CHARGE/BOM kanan-bawah. OR keyboard ∥ joystick ke model tunggal.

### T.7 Animation / tween / camera / PARTICLES (API 3.60+!)
```js
this.anims.create({ key:'p_thrust', frames:[{key:'t_ship0'},{key:'t_ship1'},{key:'t_ship2'}], frameRate:12, repeat:-1 });
// guard: if(!this.anims.exists('p_thrust')){…}
const em = this.add.particles(0,0,'t_spark',{ speed:{min:-200,max:200}, scale:{start:0.6,end:0},
  lifespan:600, blendMode:'ADD', emitting:false });
em.explode(16, x, y);                 // ❌ JANGAN createEmitter() → throw di 3.80.1
this.cameras.main.shake(120, 0.02);   // intensity FLOAT kecil, bukan piksel
```

### T.8 Performance (60fps mobile)
- Pooling wajib; sprite biasa **tak auto-cull** → despawn manual off-screen (§5.4). Partikel cap
  ~100 alive, `explode()` ketimbang flow. `render.pixelArt`. Target memori < 150MB.

### T.9 Cleanup & destroy (KRITIKAL — re-inject host)
```js
(function(){
  if (typeof window.__gwCleanup==='function'){ try{window.__gwCleanup();}catch(e){} }
  var offs=[];
  function addGlobal(t,ty,fn,o){ t.addEventListener(ty,fn,o); offs.push(()=>t.removeEventListener(ty,fn,o)); }
  /* …class MainScene… */
  var game = new Phaser.Game(config); window.__gwGame = game;
  window.__gwCleanup = function(){
    offs.forEach(o=>{try{o();}catch(e){}}); offs.length=0;
    if (window.__gwGame) window.__gwGame.destroy(true);    // async next frame; cegah canvas/WebGL numpuk
    window.__gwGame=null; window.__gwCleanup=null;
  };
})();
```

> **Gotchas (kotak peringatan):** (1) particle 3.80.1 = `add.particles(x,y,key,cfg)`, `createEmitter()`
> throw. (2) `camera.shake` intensity float ~0.02. (3) `game.destroy(true)` wajib re-inject; `destroy()`
> async. (4) procedural texture bentrok restart → guard `textures.exists`. (5) ukuran-0 saat container
> belum ter-size. (6) shmup: `gravity y:0` + `setAllowGravity(false)`.

---

# APPENDIX S — SINGLE-FILE ARCHITECTURE + BOOT

- **3 file:** `index.html` (struktur + `#inv-source` + HUD + overlay + `data-asset` sheet),
  `index.css` (layout 2-kolom, HUD map, toast, dialog arcade), `index.js` (IIFE: Ship, EnemyManager,
  pools, Weapon/PowerMeter, Boss, config terpusat, host-wiring).
- **Lapisan logis** walau monolitik: `CONFIG` (semua angka terpusat) · `Ship` · `EnemyManager`
  (spawnList + pointer relatif-kamera) · pools (bullet/ebullet/particle/enemy) · `PowerMeter` ·
  `Boss` · `Invitation` (scan section, unlock, modal, reveal) · `HostWire` (RSVP/ucapan/musik).
- **`ensurePhaser()`** fallback (load CDN bila `window.Phaser` belum ada) lalu boot.
- **Ground vs controller (ADAPTASI shmup):** tak ada tanah; pakai **`PLAY_BOTTOM`** & **`PLAY_TOP`**
  sebagai batas area-main supaya ship & musuh tak di belakang kontrol/HUD:
```js
var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints>0;
CONFIG.PLAY_TOP    = 96;                          // di bawah HUD/icon-button
CONFIG.PLAY_BOTTOM = BH - (isTouch ? 200 : 150);  // di atas zona kontrol (±120px) — sama spirit GROUND_Y
// clamp ship.y ∈ [PLAY_TOP+10, PLAY_BOTTOM-10]; spawn musuh.y dalam rentang ini juga.
```

> **Golden Rule S:** satu file rapi berlapis; boot aman (ukur parent, showError); `PLAY_TOP/BOTTOM`
> jaga entity tak ketutupan kontrol (pengganti GROUND_Y untuk shmup).

---

# APPENDIX P — ASET PNG (5 SPRITE SHEET)

> Grafis "game sungguhan" via PNG; **fallback prosedural wajib** (`using<Kelompok>Assets`). Engine
> men-slice **satu gambar utuh** via frame-map rect eksplisit + downscale ke key engine + key-out bg.
> Pola terbukti: `metalslug-wedding/` (`OBJECT_SHEET`/`ENEMY_SHEET`, slice+bake+anim+fallback).

### P.1 Kebutuhan sprite (diturunkan dari §4/§5/§7/§D)
- **Player:** idle×2, thrust×3, bank-up, bank-down, charging×3(L1–L3), fire, hurt, shield, static.
- **Enemy:** drone(move×2,die), turret(idle,aim,fire,die), korvet(enter,aim,fire,hurt,die),
  flyer(swoop×2,die), carrier(idle,bay-open,die), mech(march×2,aim,fire,die), mine(idle,arm,boom),
  **boss**(phase1,phase2-core,phase3-enraged,defeated).
- **Environment:** nebula tiles, planet/bumi, bulan-pecah, bangkai-kapal, hangar-bay, derek,
  mercusuar, struktur dinding (turret-wall), crusher.
- **Game-object:** peluru pemain, peluru musuh, laser-beam, rudal, partikel spark/heart, ledakan,
  kapsul-power biru, palang-laser, barel-plasma, ranjau.
- **Box-kepingan:** kapsul 💌 emas (denyut 2 frame), penanda, sprite "couple" (kapten+navigator)
  yang disatukan di victory.

### P.2 TEPAT 5 sheet (= 5 file PNG = 5 slot upload)
| # | Kelompok | Isi | Tekstur engine khas |
|---|---|---|---|
| 1 | **player** | semua frame ship | `t_ship*` |
| 2 | **enemy** | drone/turret/korvet/flyer/carrier/mech/mine + **boss** (per-ROW) | `t_e_*`, `t_boss` |
| 3 | **environment** | nebula/planet/landmark/struktur/crusher (tileable seamless) | `t_neb`, `t_planet`, `t_wreck`, `t_wall`… |
| 4 | **game-object** | peluru/laser/rudal/ledakan/partikel/kapsul-power/barel/laser-gate/mine-fx | `t_pbullet`,`t_ebullet`,`t_laser`,`t_spark`,`t_capsule_blue`… |
| 5 | **box-kepingan** | kapsul 💌 emas + penanda + couple disatukan | `t_amplop`,`t_couple` |

- Tata-letak: frame satu entity **horizontal kiri→kanan**; entity beda di **baris beda** (per-ROW,
  seperti `enemy-sprite-sheet.png` metalslug). Frame **boleh beda lebar** → rect eksplisit (P.4).
  Hadap **kanan** (ship & peluru ke kanan; engine flip bila perlu). Sel **≥80×80** (downscale di engine).

### P.3 JSON generate per-kelompok (contoh entri `enemy`)
```json
[
  { "kelompok":"enemy", "name":"boss_station.png",
    "deskripsi":"Stasiun benteng emas-violet bergaya R-Type. 4 frame: fase1 (perisai tertutup, turret samping), fase2 (inti weak-point terbuka berdenyut kuning+inti putih), fase3 (amukan, retak+nyala merah, emitter laser), defeated (meledak, runtuh). Hadap KIRI (menghadap player dari kanan layar). Inti di tengah-kanan sel.",
    "orderNumber":7, "frameWidth":220, "frameHeight":200 }
]
```
Field WAJIB tiap entri: `kelompok, name, deskripsi(+rincian tiap frame+arah+pivot), orderNumber,
frameWidth(≥80), frameHeight(≥80)`. Susun terurut `orderNumber`. **5 JSON** (1/kelompok) + mirror
file `*-assets.json`.

### P.3.1 File `ASSET.md` (WAJIB di-spec, dibuat Tahap 2)
Brief manusiawi membungkus 5 JSON. WAJIB memuat: (1) aturan umum (PNG transparan, pixel-art tanpa
anti-alias, hadap kanan [boss kiri], pivot, sel ≥80×80 ~2× tekstur engine, frame seukuran, penamaan);
(2) **5 tabel kebutuhan** per entity dengan kolom `No|Nama file|frameWidth|frameHeight|Tekstur engine|
Jumlah frame|Deskripsi tiap frame`; (3) **5 blok JSON** (mirror `*-assets.json`); (4) tata-letak sheet
(urutan baris, mulai x/y, catatan beda-lebar→rect); (5) cara pasang (slot `{{asset_image_N}}` urutan
P.5 + fallback prosedural). Pola acuan: `metalslug-wedding/ASSET.md`.

### P.4 Engine slice (frame-map rect eksplisit)
```js
// per-ROW (entity): rect tiap frame eksplisit (beda-lebar aman)
{ key:'t_e_korvet', top:140, ch:96, dh:34, hb:{w:30,h:22},
  frames:['enter','aim','fire','hurt','die'],
  rects:[[6,80],[92,86],[184,104],[296,80],[382,92]] }   // [x,w] pada baris ini
// per-frame [x,y,w,h] (object sheet bercampur)
{ key:'t_amplop', ew:30, eh:24, anim:'o_amplop', rate:3, frames:[[14,200,60,48],[80,200,60,48]] }
```
- `key` = tekstur engine yang digantikan (key lama). `ew/eh/dh` = ukuran tampil (= prosedural lama)
  → downscale → **angka dunia tak berubah**. `hb` = hitbox. `anim/rate` = multi-frame.
- **Key-out bg** bila PNG tak transparan (flood-fill dari tepi). **PNG transparan lebih disukai.**
- **Fallback WAJIB:** slot kosong / gagal load → `buildTextures` prosedural; flag `usingEnemyAssets`
  dst → **tak pernah blank**.

### P.5 URUTAN UPLOAD baku (slot dinomori dari urutan upload)
| Urutan | Kelompok | Variabel host | `data-asset` |
|---|---|---|---|
| 1 | player | `{{asset_image_1}}` | `player_sheet` |
| 2 | enemy | `{{asset_image_2}}` | `enemy_sheet` |
| 3 | environment | `{{asset_image_3}}` | `environment_sheet` |
| 4 | game-object | `{{asset_image_4}}` | `object_sheet` |
| 5 | box-kepingan | `{{asset_image_5}}` | `piece_sheet` |
```html
<img id="aset-player" data-asset="player_sheet"      src="{{asset_image_1}}" hidden>
<img id="aset-enemy"  data-asset="enemy_sheet"       src="{{asset_image_2}}" hidden>
<img id="aset-env"    data-asset="environment_sheet" src="{{asset_image_3}}" hidden>
<img id="aset-object" data-asset="object_sheet"      src="{{asset_image_4}}" hidden>
<img id="aset-piece"  data-asset="piece_sheet"       src="{{asset_image_5}}" hidden>
```
> **Petunjuk Upload (cantumkan ke user):** *Upload sheet urut — 1) player, 2) enemy, 3) environment,
> 4) game-object, 5) box-kepingan — agar `asset_image_N` cocok.* Bila tema sudah memakai slot
> `asset_image` lain (mis. background), **geser nomor & dokumentasikan offset**; nomor di HTML =
> posisi sheet dalam urutan upload.

> **Golden Rule P:** 1 kelompok = 1 sheet = 1 slot upload; engine slice 1 gambar via frame-map rect
> eksplisit + downscale + fallback prosedural; urutan upload baku. Boss hadap kiri (inti weak-point).

---

# APPENDIX W — WEDDING INTEGRATION (section → kepingan)

### W.1 Sumber binding tunggal (`#inv-source`)
Tulis SEMUA section **sekali** di `#inv-source` (tersembunyi), `{{vars}}` & `data-info="<key>"` per
`<section>`. Satu-satunya tempat binding hidup. Modal kepingan & reveal **meng-clone** dari sini.

### W.2 11 section + flag + variabel (terverifikasi ke dynamic-variables.md — TIDAK dikarang)
| # | `data-info` | Variabel utama | Flag pembungkus `{{#if}}` (membungkus `<section>`) |
|---|---|---|---|
| 1 | `hero` | `groom_nickname`,`bride_nickname`,`wedding_date`,`quote`,`quote_by`,`photo_hero_cover` | selalu |
| 2 | `couple` | `groom_name`,`bride_name`,`photo_groom_photo`,`photo_bride_photo`,`nama_bapak_laki_laki`,`nama_ibu_laki_laki`,`nama_bapak_perempuan`,`nama_ibu_perempuan`,`ig_laki_laki`,`ig_perempuan` | ortu:`flag_tampilkan_nama_orang_tua` · sosmed:`flag_tampilkan_sosial_media_mempelai` |
| 3 | `rsvp` | countdown `#tm-countdown-*` (host), form RSVP (id host) | selalu |
| 4 | `schedule` | `tanggal_akad`,`jam_akad`,`nama_lokasi_akad`,`keterangan_lokasi_akad`,`akad_map` + `*_resepsi` | resepsi:`flag_lokasi_akad_dan_resepsi_berbeda` |
| 5 | `streaming` | `link_live_streaming` | `is_fitur_live_streaming` |
| 6 | `story` | `{{#each timeline_kisah}} this.tanggal/judul/deskripsi {{/each}}` | `flag_pakai_timeline_kisah` |
| 7 | `gallery` | `{{#each galleries}} this.url {{/each}}` | `has_gallery` |
| 8 | `happiness` | `sample_story_1..3`,`frame_balasan_instagram`,`link_balasan_instagram` | `flag_pakai_additional_feature_story_balasan_instagram` |
| 9 | `wishes` | form ucapan (id host) + `{{#each wishes}} this.guest_name/guest_message/guest_comment_time {{/each}}` | selalu |
| 10 | `gift` | `bank_1`,`rek_1`,`nama_rek_1`(+`_2`),`gambar_qris_rekening_1/2`,`alamat_lokasi_kirim_hadiah_offline` | `tampilkan_amplop_online`,`flag_pakai_2_rekening`,`flag_pakai_qris_rekening_1/2`,`flag_kirim_hadiah_offline` |
| 11 | `closing` | `kalimat_penutup`,`site_name`,`site_url` | selalu |

> **WAJIB:** `{{#if flag}}` **MEMBUNGKUS** `<section>`, bukan isinya (else kepingan hantu →
> `allInfoUnlocked()` tak pernah true). Contoh BENAR:
> `{{#if has_gallery}}<section data-info="gallery">…</section>{{/if}}`.

### W.3 Aturan penempatan kepingan
- **Section inti di sektor AWAL:** `hero`,`schedule`,`rsvp` muncul di sektor 1–2 (tamu yang berhenti
  di tengah tetap dapat info pokok).
- **Reachable & terlihat** (validator E.1). **Kapsul 💌 ≠ power-up ofensif** (tak memberi buff).
- Jumlah kepingan & ikon indikator **dinamis** dari scan `#inv-source > section[data-info]` saat boot
  (bukan hardcode 10/11).

> **Golden Rule W:** satu sumber binding; `{{#if}}` bungkus section; section inti di awal; kepingan
> reachable & bukan buff; jumlah dinamis dari section riil.

---

# APPENDIX X — COLLECTION MECHANIC

### X.1 Bentuk kepingan (shmup)
**Kapsul emas berdenyut 💌** (`t_amplop`) melayang di jalur, **berbeda total** dari kapsul-power biru
(`t_capsule_blue`). Bisa **ditembak** (hp 1 → drop konten) **atau** **di-overlap** (ambil langsung).
Pola: `P030` (float), `P031` (di balik laser-gate), `P032` (dikawal drone).

### X.2 Quota per-sektor + auto-scale
- **Scan section riil** saat boot → `INFOS = [hero, couple, rsvp, schedule, …]` (urut & label dari
  `data-info` + judul). `N = INFOS.length`.
- **Quota shape** per 6 sektor (sum = jumlah penuh 10–11; sektor 6 = boss, 0 kepingan):
  `QUOTA = [3,3,2,2,1,0]` (sum 11). Bila section dikurangi flag → **redistribusi proporsional** ke
  shape sama (jangan hardcode total). Algoritma: bagikan `N` mengikuti rasio `QUOTA`, sisa ke sektor
  awal (gradual, bukan menumpuk).
- **Pemetaan stage→kepingan DETERMINISTIK** (slice kontigu `INFOS` per sektor), bukan counter
  berjalan (cheat stage-jump/replay → tak ganda/desync).

### X.3 Respons saat ambil (NO auto-open)
`unlockInfo(key)`:
1. Catat di `unlocked` + **persist localStorage** (key versioned, try/catch).
2. **Ikon indikator** section itu menyala + jadi clickable.
3. **Toast** atas-tengah (~18–35% dari atas, 3–8s, warna cyan + ✓ + judul section).
4. **SFX collect-piece** + **partikel** (heart/spark) + animasi kapsul **terbang ke inventory**.
5. **JANGAN auto-open modal** — tamu memilih sendiri kapan klik ikon untuk membaca.
6. Update progress `n/N 💌` (atas-kanan) + cek `allInfoUnlocked()` → trigger celebration kepingan
   (§Z).

### X.4 Filler skor (slot sisa quota)
Slot pola yang tak terisi kepingan → isi `R023` (score-trail) / kapsul-power / prop, supaya level
tetap padat walau kepingan sedikit (anti-dead-air).

> **Golden Rule X:** kapsul 💌 emas (beda dari power biru); quota per-sektor auto-scale; mapping
> deterministik; ambil = nyala+toast+SFX+partikel (**no auto-open**); sisa quota → filler.

---

# APPENDIX Y — CHEAT SYSTEM + RESET PENUH

### Y.1 Cheat (satu flag, dua ranah)
Tombol **★** toggle. Saat ON:
- **Undangan:** semua kepingan **langsung ter-unlock** → semua ikon menyala; tombol Buka Undangan
  aktif.
- **Gameplay:** ship **kebal** (invincible) terhadap semua peluru/musuh/hazard; **stage-select**
  terbuka (akses semua sektor); **bebas pilih kesulitan**.
- **Skor dibekukan** saat cheat (audit: jangan biarkan cheat menambah best-score).
- **Toggle balik** mengembalikan tantangan. Yang **di-persist** = `unlocked` (hasil kepingan),
  **bukan** `cheat` (default JANGAN persist — device dipakai banyak tamu → reload kembali "jujur",
  tapi kepingan tetap kebuka). Pola retromario.
- **Audit cheat-bypass blind spot:** satu flag `ship.cheat`; pastikan i-frame/respawn/score/unlock
  semua membaca flag yang sama (kebal/unlock tak bocor ke mode normal — sumber bug berulang).

### Y.2 Reset = PENUH (§21 hardwon — bukan sebagian)
Tombol **⟲** → overlay konfirmasi (bukan `confirm()` native). Saat dikonfirmasi WAJIB:
1. **Wipe localStorage** (`removeItem(STORE_KEY)`) → STORE ke default (**`diff` kembali default**,
   `unlocked=[]`, `maxSector=0`, `best=0`, guard `announcedAll/completed=false`).
2. **`GAME.destroy(true)`** → stage benar-benar reset (bukan lanjut). Reset `runState`,
   `cheat=false` (matikan badge ★, sembunyikan stage-select).
3. **Rebuild indikator** (semua kepingan terkunci lagi) + reset UI picker kesulitan ke default.
4. **Kembali ke COVER** (`showOverlay('cover')`) → pemain pilih kesulitan lagi & PRESS START.
5. **Verifikasi harness:** tulis storage palsu → reset → assert storage ter-wipe (diff→default,
   sektor→0) & cover tampil.

> **Golden Rule Y:** cheat = unlock+kebal+stage-select+pilih-diff, skor beku, persist hanya kepingan
> (cheat default jangan). Reset = **PENUH** (wipe storage incl. diff + destroy stage + kembali cover).

---

# APPENDIX Z — HOST CONTRACT & WIRING

### Z.1 ID host verbatim (tanpa prefix)
`btn-show-qr`, `btn-show-menu`, `btn-toggle-music`/`btn-music`, `bg-music`, `play-icon`/`pause-icon`,
`btn-submit-ucapan`+`wish-name`+`wish-message`, RSVP `btn-submit-kehadiran`+`rsvp-status`/`rsvp-guests`/
`rsvp-code`, (opsional) `btn-submit-hadiah`+`gift-name`/`gift-amount`/`gift-bank`,
`alert-submit-*`. **Mengubah/prefix = fitur backend mati diam-diam.**

### Z.2 RSVP/ucapan/hadiah — panggil fungsi global host + fallback
```js
if (typeof window.submitUcapan === 'function'){ window.submitUcapan(); return; } // else fallback lokal
if (typeof window.submitRsvp === 'function'){ window.submitRsvp(); return; }
```
Berlaku juga saat form dipanggil dari **dalam modal kepingan/reveal**. Countdown
(`#tm-countdown-*`) di-update host tiap detik — **jangan** timpa innerHTML-nya via RAF game.

### Z.3 Musik — mirror idempotent (JANGAN play backsound tenant)
Host pegang `Audio`/YouTube; play hanya `isPlaying && isOpened`. Tema **hanya** klik
`#btn-toggle-music` + mirror ikon. **Idempotent:** simpan **intent** (`musicWanted`) + generation
guard; klik hanya bila state host **masih** salah (retry terjadwal). Klik dobel (baca class lama
sebelum React flip) → musik mati lagi (bug mahal — hindari).

### Z.4 Layout DESKTOP 2-kolom — frame KIRI, panel undangan KANAN (pure)
```css
.gw-shell { display:flex; justify-content:center; align-items:stretch; }
.gw-cover-side { display:none; }                      /* mobile: sembunyikan panel */
@media (min-width:980px){
  .gw-shell { justify-content:flex-start; }           /* mentok KIRI, bukan center */
  .gw-frame { order:1; flex:0 0 auto; width:480px; max-width:480px; height:100vh; }
  .gw-cover-side { display:block; order:2; flex:1; min-width:320px; overflow-y:auto; padding:40px 48px; }
  .gw-cover-side .inner { max-width:440px; margin:0 auto; }
}
@media (hover:hover) and (pointer:fine) and (min-width:980px){ .gw-touch{ opacity:0; pointer-events:none; } }
```
- **Panel KANAN = PURE undangan, NOL tombol game** (PRESS START/pilih-level/kontrol-keyboard ada di
  **cover overlay DALAM frame**). Isi: **`<canvas id="gw-couple-canvas">` (Canvas 2D, BUKAN Phaser)**
  menggambar **mempelai bertema space**: kapten pria (jas+dasi, helm astronaut transparan/peci) &
  navigator wanita (gaun+kerudung+buket) berdiri di scene luar angkasa (nebula, planet, bintang,
  hati melayang, banner "JUST MARRIED IN SPACE"); + nama mempelai (`val('groom_nickname')` ♥
  `val('bride_nickname')`), tanggal, **Akad/Resepsi** (waktu/tanggal/tempat/alamat + **link MAP**
  `{{akad_map}}`/`{{resepsi_map}}` dibungkus `{{#if}}`; `{{#if flag_lokasi_akad_dan_resepsi_berbeda}}`),
  dan **satu** tombol `💌 BUKA UNDANGAN LENGKAP`.
- **TEPAT 2 kolom** (bukan center, bukan 3, no tombol game di kanan). Mobile = **hanya frame**.

### Z.5 HUD map (mobile frame — posisi terbukti enak)
```
┌───────────────────────────────────────────┐
│ ♥/🛡×3       SCORE 000200     SEKTOR 1 [N]  │ ← HUD info (atas; dilihat, tak di-tap)
│ [Wpn:LASER]                       3/11 💌  │ ← weapon kiri · progress kanan
│ ┌───┐                             ┌─┬─┬─┐  │
│ │★▦ │ ICON-BUTTON (KIRI-ATAS)     │💌♥✓│   │ ← indikator kepingan (KANAN-ATAS)
│ │💌 │ ★cheat ▦stage 💌buka        └─┴─┴─┘  │
│ │🎵⟲│ 🎵musik ⟲reset                       │
│ └───┘   PLAY_TOP ── (area main: ship+musuh)│
│      [ship]→        > > (musuh dari kanan) │
│  ── PLAY_BOTTOM (di atas zona kontrol) ────│
│  ╭───╮                       ┌────┐┌──┐    │
│  │joy│ KIRI-BAWAH     KANAN→ │FIRE││CH│    │ ← joystick + FIRE/CHARGE/BOM
│  ╰───╯                       └────┘│B✦│    │
└───────────────────────────────────────────┘
```
- ICON-BUTTON **kiri-atas** (★cheat ▦stage 💌buka 🎵musik ⟲reset) · indikator kepingan **kanan-atas**
  (wrap rata-kanan, max-width 130px) · joystick **kiri-bawah** · FIRE(besar ~82px)/CHARGE/BOM
  **kanan-bawah**. Target ≥44px, spacing ≥8px, hormati `safe-area-inset`. Power Meter (Gradius)
  strip kecil bawah-tengah.

### Z.6 Toast (atas-tengah; JANGAN di dasar)
`.gw-toast{ position:absolute; top:18%; left:50%; transform:translate(-50%,-12px); z-index:30; }` —
3–8s, warna+ikon (cyan/✓ sukses, merah bahaya). **Bukan** `bottom:<160px` (ketutupan kontrol).

### Z.7 Dialog pilih (stage/kesulitan) pakai tombol OK (no auto-apply)
Klik opsi = **tandai pending** (highlight, `pendingDiff`/`pendingStage`); tombol **OK/MULAI** =
commit & tutup; ada **Batal**. Stage-select **memuat picker kesulitan sekaligus** (class/handler
`pickDiff()` sama dengan cover) → konsisten.

### Z.8 Cover / Open
Boleh `id="theme-cover"` + `id="main-content"` (host handle visibility) **atau** kelola sendiri di
game — konsisten dengan state host bila pakai ID host. Reveal penuh = clone semua `#inv-source >
section` berurutan ke container scroll **di dalam frame**.

### Z.9 Lightbox
Galeri sendiri pakai class **berbeda** dari `.gallery-item`/`.lightbox-injection` (mis.
`.gw-gallery-item`) agar host tak membajak klik.

### Z.10 Celebration (2 pemicu, beat ~5s, guard sekali-tampil)
1. **Kepingan TERAKHIR didapat** → "semua kepingan terkumpul → undangan siap dibuka" (tanpa harus
   tamat game).
2. **Boss kalah (sektor 6 tamat)** → happy-ending (rangkum skor/sektor + ajakan buka undangan).
- Keduanya bisa urutan apa pun → desain tahan kedua urutan. Beat meriah ±5s (flash + fireworks +
  **SFX kemenangan** [audio game, bukan backsound tenant]) **sebelum** dialog (`setTimeout ~4.5s`).
  Dialog sebut pencapaian konkret + **nama mempelai dinamis** + CTA "Buka Undangan". Guard
  `announcedAll`/`completed` (**persist**) anti-ulang. Saat menang, **semua kepingan ter-unlock**.

> **Golden Rule Z:** ID host verbatim + fungsi global host + fallback; musik mirror idempotent;
> desktop frame-kiri/panel-undangan-kanan (canvas couple space, no tombol game); HUD map terbukti;
> toast atas-tengah; dialog OK-commit; celebration 2-pemicu guard-persist.

---

# §V — CATATAN VERIFIKASI (Tahap 2)

- **Screenshot headless Chrome TIDAK bekerja di mesin ini** (selalu blank — jangan dipercaya).
- **Verifikasi benar:** paste 3 file ke **Theme Editor** host (`ThemeEditorPage.tsx`) → buka
  preview, **atau** minta user mencobanya.
- **Logika game/loop** diuji via **harness Node headless** menjalankan `update()` asli dengan **RAF
  di-stub** (bukan memanggil step langsung). Invarian wajib diuji:
  - Spawn relatif-kamera: record di triggerX jauh → tembak → **tidak** kena; scroll `edge≥triggerX`
    → musuh lahir di tepi → kena. (§5.4)
  - Boss damage: `manualBossHits` saat fase≥2 → `hp` turun → `defeatBoss` di 0; HP bar update. (§D)
  - Peluru anti-tunnel: peluru cepat melewati musuh tipis → `manualEnemyHits` sweep tetap kena;
    `hitEnemy` idempotent (overlap+sweep tak double-count). (§6)
  - Reset penuh: storage palsu → reset → storage wipe (diff→default, sektor→0) + cover tampil. (§Y)
  - Kepingan dinamis: matikan flag `has_gallery` → section gallery absen → `N` berkurang → indikator
    & `allInfoUnlocked()` benar (tanpa kepingan hantu). (§W/§X)
- **`showError()` on-screen** wajib → "Phaser gagal load" ≠ "logic bug" (dua-duanya blank canvas).
- Waspada **cheat-mode bypass** (kepingan/kebal bocor ke mode normal) — audit satu flag `ship.cheat`.

---

## SELF-CHECK (checklist Bible "selesai")

- [x] Mengikuti kerangka `bible-template.md` — §0–§12 + APPENDIX A–F + T/S/P + W–Z + §V.
- [x] Spesifik-arketipe (shmup): Power Meter Gradius, Force/charge R-Type, formasi wave, boss benteng
      weak-point — bukan generik. Pattern library **28 pola**, entity encyclopedia yaml, 6-sektor
      biome, boss 3-fase.
- [x] **Density NO DEAD AIR** ditegakkan: beat-sheet R-Type/Gradius (13 cluster) + lantai ber-angka
      (musuh/layar, struktur/hazard, prop, destructible, ambient, reward cadence, max-dead-air) +
      `validateDensity()` gate keras (regen segmen sepi).
- [x] Aturan **ber-angka** (speed/fire-rate/charge/invuln/TTK/scroll/density knobs), bukan kata sifat.
- [x] Kode **Phaser 3.80.1 benar**: `gravity y:0`+`setAllowGravity(false)` (shmup), particle API 3.60+
      (`add.particles`/`explode`, bukan `createEmitter`), `game.destroy(true)`, `shake` float, guard
      `textures/anims.exists`, spawn relatif-kamera, `manualBossHits/manualEnemyHits`.
- [x] **APPENDIX P**: TEPAT 5 sheet + 5 JSON (sel ≥80) + `ASSET.md` spec + frame-map rect eksplisit +
      downscale + urutan upload baku + fallback prosedural.
- [x] Variabel undangan **terverifikasi** ke `dynamic-variables.md` (tak ada karangan).
- [x] APPENDIX W–Z lengkap: kepingan reachable & dinamis, cheat bypass + reset penuh, celebration
      2-pemicu guard-persist, layout 2-kolom (frame kiri/panel kanan pure + canvas couple space),
      mirror musik idempotent, `{{#if}}` membungkus `<section>`, ID host verbatim, HUD map, toast
      atas-tengah, dialog OK-commit.
- [x] Tiap bagian besar punya **Golden Rule** satu-baris.
- [x] Disimpan di `src/sample-theme/spacewar-wedding/SPACEWAR_WEDDING_BIBLE.md`.
- [x] Adaptasi shmup didokumentasikan eksplisit: no-gravity, `PLAY_TOP/BOTTOM` pengganti `GROUND_Y`,
      auto-scroll + kapal kiri-⅖ pengganti follow-offset, anti-tunnel tanpa platform.

**Sumber riset:** [R-Type/Stage 1 — StrategyWiki](https://strategywiki.org/wiki/R-Type/Stage_1) ·
[Gradius/Stage 1 — StrategyWiki](https://strategywiki.org/wiki/Gradius/Stage_1) ·
[Gradius/Gameplay (Power Meter) — StrategyWiki](https://strategywiki.org/wiki/Gradius/Gameplay) ·
[R-Type — Shmups Wiki](https://shmups.wiki/library/R-Type) · density/feel/layout reference files skill.
