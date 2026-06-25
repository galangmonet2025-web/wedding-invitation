# METAL SLUG 2 — WEDDING THEME · GAME DESIGN BIBLE (Phaser 3.80.1)

> **Output Tahap 1.** Ini dokumen sumber-kebenaran untuk men-generate 3 file tema
> (`index.html` + `index.css` + `index.js`) di Tahap 2. Arketipe: **run-and-gun side-scroll
> shooter** (Metal Slug / Contra). Engine: **Phaser 3.80.1**, single-file, prosedural.
>
> **DIBUAT untuk MEMPERBAIKI 2 cacat fatal versi `metalslug-wedding`:**
> 1. **HAMBAR** — stage kosong: pijakan kurang, dekorasi sepi, musuh "kadang ada kadang nggak".
>    → diperbaiki oleh **Density Engine "NO DEAD AIR"** (§3, APPENDIX A/C, validator APPENDIX E).
> 2. **Peluru membunuh musuh yang BELUM masuk layar.** → diperbaiki oleh **spawn relatif-kamera**
>    (§5, APPENDIX B/T) — musuh off-screen = data inert, tak ber-hitbox sampai lahir di tepi.
>
> Aturan **ber-angka** (bukan kata sifat). Tiap bagian besar punya **Golden Rule**.

---

## DAFTAR ISI

- §0 Meta & ringkasan · §1 Core Principles · §2 Core Gameplay Loop · §3 World/Level Structure
  (+ beat-sheet + density) · §4 Player System · §5 Enemy System (+ spawn relatif-kamera)
  · §6 Collision Matrix · §7 Power-up/Weapon System · §8 Difficulty Scaling · §9 Camera &
  Readability · §10 Juice + Grafis · §11 Audio · §12 Anti-Frustration
- APPENDIX A Pattern Library · B Entity Encyclopedia · C Biome/Stage Library · D Boss/Climax
  · E Validator Engine (+ density validator) · F Generation Algorithm
- APPENDIX T Technical Foundation (Phaser 3.80.1) · S Single-file Architecture
- APPENDIX W Wedding Integration · X Collection Mechanic · Y Cheat System · Z Host Contract & Wiring

---

## §0 META & RINGKASAN

- **Judul game:** *Metal Slug 2 — Operation: Pelaminan*.
- **Arketipe:** run-and-gun side-scroll shooter (referensi: Metal Slug "Super Vehicle-001", 1996).
- **Mood pasangan:** energik, heroik, "berjuang menembus medan menuju pelaminan".
- **Engine:** Phaser 3.80.1, single-file (HTML/CSS/JS), tekstur **prosedural** (anti-CORS).
- **Resolusi logis:** 540×960 (potret mobile) — diukur dari parent via `getBoundingClientRect`.
- **Elevator pitch:** Tamu mengendalikan seorang prajurit (mempelai pria) yang menembus 6 sektor
  jungle→pesisir→markas. Tiap sektor **padat** musuh, ledakan, dan POW. Kepingan undangan =
  **amplop 💌 melayang yang harus DITEMBAK**. Klimaks: selamatkan mempelai wanita yang ditawan di
  markas boss. Cheat Mode untuk tamu yang ingin langsung membuka undangan.
- **Dua cacat yang DILARANG terulang:** (a) stage hambar; (b) peluru membunuh musuh off-screen.

> **Golden Rule §0:** Game dulu, baru undangan — tapi *game yang PADAT & JUJUR secara mekanik*.
> Bible ini gagal kalau ada satu layar yang bisa dilewati tanpa interaksi, atau satu peluru yang
> mengenai musuh yang belum lahir.

---

## §1 CORE PRINCIPLES

1. **Playability First.** 60fps, kontrol responsif (input→aksi ≤1 frame). Pooling wajib.
   *BENAR:* peluru/musuh/partikel dari Group ber-`maxSize`. *SALAH:* `new`/`destroy` tiap frame.
2. **NO DEAD AIR (anti-hambar).** Tiap jendela selebar-layar (1× viewport) **wajib** memuat
   ≥1 hal hidup: musuh/item/ledakan/prop/elevasi/event. Lantai kepadatan **divalidasi** (§3,
   APPENDIX E). *Alasan:* "musuh kadang ada kadang nggak" = bug yang membunuh feel arcade.
3. **Spawn Jujur (anti off-screen kill).** Musuh yang belum masuk layar **belum ada** — ia data
   inert tanpa hitbox; lahir di tepi kanan saat scroll mencapainya. Peluru mati di tepi viewport.
   *Alasan:* di Metal Slug asli kamu **tidak bisa** menembak musuh yang belum terlihat.
4. **Teach Before Test.** Tiap mekanik/musuh baru diperkenalkan di zona fail-proof sebelum diuji
   (Kishōtenketsu). Musuh berat hanya muncul **setelah** pemain diberi counter (senjata/Slug).
5. **Fair Challenge.** Semua serangan ber-telegraph (wind-up ≥0.5s/15 frame). Tidak ada
   spawn-kill, tidak ada blind jump. Mook mati 1 hit; hanya "heavy" yang tahan lama.
6. **Readability.** Siluet unik per entity (shading base+hi+shadow+outline). Musuh terbaca dari
   jauh sebelum beraksi. HUD info di atas (dilihat, tak di-tap).
7. **Discovery/Reward.** Kepingan = hadiah yang **ditemukan** (ditembak), bukan diberi otomatis.
   Reward cadence ≤15–20s (POW/skor/senjata) menjaga dopamin.
8. **Game Ramah (undangan, bukan shooter hardcore).** Default **tanpa nyawa/game-over**; kena =
   knockback + i-frame; jatuh jurang = respawn ke titik aman (mundur).
9. **Inklusif.** Cheat Mode: invincible + semua kepingan + semua stage terbuka.

> **Golden Rule §1:** Padat, jujur, ramah, terbaca. Empat-empatnya wajib — bukan pilih salah satu.

---

## §2 CORE GAMEPLAY LOOP

```
        ┌──────────────────────────────────────────────────────┐
        │  MAJU KE KANAN (auto-scroll mengikuti player)         │
        │     │                                                 │
        │     ▼                                                 │
        │  Musuh lahir DI TEPI KANAN (saat scroll capai trigger)│
        │     │                                                 │
        │     ▼                                                 │
        │  TEMBAK (8-arah) / LOMPAT / TIARAP / GRENADE          │
        │     │                                                 │
        │     ├──► musuh mati → skor + ledakan (juice)          │
        │     ├──► amplop 💌 → TEMBAK → kepingan unlock         │
        │     ├──► POW → bebaskan → reward (skor/senjata)       │
        │     └──► crate → senjata baru (M/S/L/F)               │
        │     │                                                 │
        │     ▼                                                 │
        │  SCROLL-LOCK arena → bersihkan wave → lock lepas      │
        │     │                                                 │
        │     ▼                                                 │
        │  Sektor selesai → "AREA CLEAR" → sektor berikut       │
        │     │                                                 │
        │     ▼                                                 │
        │  Sektor 6: BOSS (walk-in) → selamatkan mempelai →     │
        │  CELEBRATION → buka undangan                          │
        └──────────────────────────────────────────────────────┘
```

**Verb utama:** `lari`, `lompat (variable height)`, `tiarap`, `tembak 8-arah`, `lempar granat`.
Satu putaran inti = "maju → musuh muncul dari depan → tembak/hindari → ambil reward → maju lagi",
diulang dengan kepadatan konstan (§3) sampai scroll-lock/boss.

> **Golden Rule §2:** Selalu maju ke kanan; ancaman selalu datang dari depan/atas; reward selalu
> dekat. Loop tak boleh pernah "sepi" lebih dari ~2 detik.

---

## §3 WORLD / LEVEL STRUCTURE — beat-sheet + DENSITY ENGINE

### 3.1 Struktur makro

- **6 sektor** (biome berbeda, APPENDIX C). Tiap sektor = **panjang dunia ~5400–7200px**
  (≈ 10–13 layar @ BW=540). Auto-scroll mengikuti player (kamera follow, §9).
- **Start safe zone** tiap sektor: **600px pertama** tanpa musuh (onboarding) — TAPI tetap berisi
  prop/landmark + 1 musuh telegraph pelan di ujungnya (zona awal tak boleh kosong).
- **Goal/boss:** sektor 1–5 berakhir di "AREA CLEAR" gate; sektor 6 = arena boss (walk-in, §APP-D).
- **Pacing template per sektor:** `Start(safe) → Teach → Practice → Test(gauntlet) → Reward(POW)
  → Test2 → Scroll-lock mini-gauntlet → AREA CLEAR`. Kurva **sawtooth** (puncak-lembah), bukan
  ramp lurus — tapi **lembah tetap terisi** (POW/prop, bukan kosong).

### 3.2 BEAT-SHEET REFERENSI — Metal Slug Mission 1 (DNA kepadatan yang ditiru)

> Reverse-engineer (sumber: arcadequartermaster, gamesurge walkthrough, Wikipedia, GameFAQs).
> Stage ~60–90 detik tapi memuat **13 cluster event** — itulah kepadatan yang Sektor 1 kita tiru.

| # | Posisi | Event |
|---|--------|-------|
| 1 | spawn | landmark batu besar; rebel **melee-rush** langsung menyerbu |
| 2 | +detik | **peti senjata → Heavy MG** (senjata pertama, dalam hitungan detik) |
| 3 | layar sama | set-piece komedik (2 prajurit berebut babi) + skor |
| 4 | atas | **POW #1** di tiang → reward (medali/acak) |
| 5 | kapal selam | **POW #2** → amunisi; **peti FlameShot**; prop kapal selam |
| 6 | sesudah sub | **heli pengebom** jatuhkan 4 bom → ancaman udara (layer baru) |
| 7 | mendekat sungai | infanteri + **rocket-diver ranged** → eskalasi melee→ranged |
| 8 | **sungai dangkal** | terrain berubah; penyelam dari air + penembak di platform atas + **barel** → 3 bidang ancaman |
| 9 | rumah kayu | 2 prajurit pelempar granat |
| 10 | **gerbang kendaraan** | **tank SV-001 (Slug)** tersedia → power-spike |
| 11 | rapids | **2 tank Girida-O** satu per satu (gated di balik Slug) |
| 12 | air terjun | bebaskan **2 POW** di pesawat → Rocket Launcher |
| 13 | **BOSS Tetsuyuki** | laser cannon, volley 3 bolt (telegraph charge), fase-2 bola laser high/low |

**Pelajaran yang DIPAKSAKAN ke generator kita:**
- Senjata pertama datang **dalam detik** (#2) — bukan menit.
- **POW/reward tiap ~15–20 detik** (#2,4,5,12).
- Eskalasi tipe ancaman **monoton naik**: melee → +ranged → +udara → +hazard → +armor → boss.
- Armor digated di balik counter (Slug sebelum tank).
- Terrain berubah (#8 sungai, elevasi naik). Lembah pun terisi (babi #3, POW #4).

### 3.3 DENSITY ENGINE — lantai kepadatan (LANTAI, bukan plafon; divalidasi APPENDIX E)

| Metrik | Lantai wajib (per 1 lebar-layar = BW=540) | Catatan |
|---|---|---|
| **Max "dead air"** | **≤ 2 detik** atau **≤ 0.75×BW (≈405px)** tanpa entity/event | aturan terkeras |
| **Musuh aktif / layar** (zona tempur) | **≥ 3–4** (easy 3 · normal 4 · hard 6) | "kadang ada kadang nggak" = gagal |
| **Pijakan/elevasi / layar** | **≥ 1 platform naik tiap 6–10 tile** (tile=36px → tiap ~216–360px) | jawab "pijakan kurang" |
| **Prop dekorasi / layar** | **≥ 1 far-parallax + 1–2 landmark midground + 2–4 destructible foreground** | jawab "dekorasi sepi" |
| **Ambient motion / layar** | **≥ 1** (air/asap/dedaunan/idle-prop) | layar tak boleh "beku" |
| **Reward cadence** | item/POW/kepingan/skor tiap **≤ 2.5×BW (≈1350px ≈ 15–20s)** | dopamin |
| **Destructible / layar** | **≥ 2** (barel/peti/struktur) | ledakan = noise visual konstan |
| **Bidang ancaman (zona eskalasi)** | **≥ 2 simultan** (darat+udara, atau darat+ranged-vertikal) | template sungai #8 |

**Rasio tipe musuh (kalibrasi):** melee-rush ~55% / ranged ~30% / vehicle-air ~15%. Sektor awal
lebih melee; armor/heavy hanya setelah pemain diberi counter.

> **Golden Rule §3:** Kalau sebuah segmen (1 viewport) bisa dilewati tanpa pemain berinteraksi
> dengan apa pun — musuh, item, lompatan, ledakan, atau prop bergerak — segmen itu **GAGAL** dan
> harus di-generate ulang. Padat itu fitur, bukan bug. Beat-sheet §3.2 = standar kepadatannya.

---

## §4 PLAYER SYSTEM

**Arsitektur:** `class Player extends Phaser.Physics.Arcade.Sprite`, body arcade dynamic.

### 4.1 Fisika (ber-angka)

| Parameter | Nilai | Catatan |
|---|---|---|
| `RUN_SPEED` | 220 px/s | gerak horizontal |
| `GRAVITY_Y` (world) | 1000 | `arcade.gravity.y` |
| `JUMP_VELOCITY` | −470 | tinggi lompat ~ cukup 3 tile |
| `COYOTE_MS` | 100 ms (6 frame) | lompat masih bisa 100ms setelah lepas tepi |
| `JUMP_BUFFER_MS` | 100 ms | tekan lompat 100ms sebelum mendarat tetap kebaca |
| `JUMP_CUT` | 0.5 | lepas tombol → `vy *= 0.5` (variable jump height) |
| `IFRAME_MS` | 1000 ms | kebal 1s setelah kena (blink) |
| `KNOCKBACK` | x:−160, y:−260 | terpental saat kena (bukan mati) |

### 4.2 State machine

```
        ┌─────┐  move   ┌─────┐  jumpKey   ┌──────┐
        │IDLE │────────►│ RUN │───────────►│ JUMP │
        └──┬──┘◄────────└──┬──┘            └───┬──┘
           │ down            │ down            │ vy>0
           ▼                 ▼                 ▼
        ┌──────┐          (run+shoot)       ┌──────┐
        │PRONE │                            │ FALL │
        └──────┘                            └──────┘
   (semua state bisa → SHOOT overlay 8-arah, HURT (i-frame), DEAD→respawn aman)
```

- **SHOOT bukan state penuh** — overlay: pemain bisa tembak sambil idle/run/jump/prone. Arah tembak
  ikut **aim 8-arah** (kombinasi tombol arah; default kanan).
- **PRONE:** resize body **on-state-change saja** (anti-judder): saat masuk prone set body lebih
  pendek + anchor bawah; saat keluar kembalikan. **JANGAN resize tiap frame.**
- **HURT:** knockback + i-frame (blink), bukan game-over. **DEAD** (jatuh jurang) → respawn ke
  `lastSafeX` (titik aman terakhir yang dilewati, mundur — bukan awal stage / hazard / musuh).

### 4.3 Animasi per-state (WAJIB — bukan sprite statis)

`idle` (napas 2-frame), `run` (4-frame), `jump`, `fall`, `prone`, `prone-shoot`, `shoot` (pose
mengikuti 8-arah, muzzle flash ikut arah), `hurt`, `dead`. Pakai `anims.create` + guard
`anims.exists`. Detail teknik di APPENDIX T.

> **Golden Rule §4:** Kontrol responsif + forgiving (coyote+buffer 100ms) + tanpa game-over.
> Pemain mempelai pria tak boleh frustrasi; ini undangan.

---

## §5 ENEMY SYSTEM — spawn RELATIF-KAMERA (anti off-screen-kill)

> **INI INTI PERBAIKAN BUG #2.** Baca penuh; ini kontrak struktural, bukan saran.

### 5.1 Roster musuh (≥6 tipe, peran beda; ≤2 tipe/wave)

| Tipe | Peran | HP | Behavior | Telegraph |
|---|---|---|---|---|
| `rush` | melee-rush | 1 | lari ke arah player, melee kontak | siluet lari (terbaca dari jauh) |
| `range` | ranged darat | 1 | berhenti, tembak horizontal ber-interval | angkat senjata 0.5s sebelum tembak |
| `turret` | statis ranged | 2 | nempel platform/tanah, tembak ke player | putar laras 0.5s |
| `drone` | flyer (udara) | 1 | melayang, jatuhkan bom/tembak ke bawah | hover sebelum drop |
| `tank` | heavy/armor | 6 | maju lambat, cannon ber-arc | laras mundur 0.6s sebelum tembak |
| `mortar` | artileri-arc | 2 | tembak proyektil melengkung | busur indikator jatuh |

### 5.2 SPAWN MODEL — musuh off-screen = DATA, bukan entity

**Akar bug versi lama:** generator meng-`create()` SEMUA musuh aktif saat level-load di world-X
masing-masing → musuh off-screen-kanan punya hitbox → peluru world-space berjarak jauh mengenainya.

**Model benar (diverifikasi dari teardown Contra + perilaku Metal Slug):**

1. **Musuh off-screen = record inert** `{ x: triggerX, type, y, opts }` dalam array
   **terurut naik `triggerX`**. **JANGAN** `enemies.create()` untuk semua saat build stage.
2. **Spawn via pointer + ambang scroll** (di `update()`):
   ```js
   this._next = this._next || 0;
   var cam = this.cameras.main, edge = cam.scrollX + this.BW;
   while (this._next < this.spawnList.length && edge >= this.spawnList[this._next].x) {
     var r = this.spawnList[this._next++];
     this.spawnEnemy(r.type, Math.max(r.x, edge), r.y, r.opts); // lahir DI/di-belakang tepi
   }
   ```
   Musuh **lahir di `x = cam.scrollX + BW`** (tepi kanan) — bukan di world-X jauh di luar layar.
   Margin off-edge **≤ 1 lebar-sprite** untuk sprite lebar (tank) yang "masuk" mulus.
3. **Hitbox HANYA untuk musuh aktif.** Record yang belum di-spawn **tak punya body/hitbox sama
   sekali**. Ini sendiri membuat off-screen-kill **mustahil secara struktural**.
4. **Hit-detection iterasi musuh AKTIF** (`this.enemies` group hidup; cek `e.active && e.body`),
   **bukan** tabel level penuh. Konsisten dengan sweep manual anti-tunnel (§6).
5. **Musuh self-despawn** saat ter-scroll keluar kiri (`e.right < cam.scrollX - 64`) →
   `killAndHide` / kembalikan ke pool. Set populasi hidup ≈ on/near-screen (anti-leak).

### 5.3 SCROLL-LOCK ARENA (gauntlet "layar menunggu")

- Scroll-lock = **clamp kamera** (`cam` `setBounds` sementara / batasi `scrollX ≤ lockX`).
- Karena spawn keyed ke scroll (5.2 #2), clamp **otomatis membekukan pointer spawn** → wave =
  record dengan `triggerX ≤ lockX`. Tidak perlu logika gating terpisah.
- **Lepas lock saat `activeVitalEnemies == 0`** (musuh-wave habis); tag musuh "incidental"
  (endless spawner) sebagai non-blocking agar tak deadlock. Lalu lepas clamp → scroll lanjut.
- Konsisten dengan **boss walk-in** (APPENDIX D) yang memakai `arenaX` yang sama.

### 5.4 AI per-tipe (ringkas; detail APPENDIX B)

`rush`: state `WALK_IN → CHASE` (vx ke player). `range`/`turret`: `IDLE → AIM(0.5s) → FIRE →
COOLDOWN`. `drone`: `HOVER → DROP`. `tank`: `ADVANCE → AIM(0.6s) → CANNON`. Semua tembakan musuh
**aim ke player** + sedikit spread (bukan flat konstan).

> **Golden Rule §5:** Musuh off-screen adalah **resep, bukan makhluk** — di-masak (spawn +
> hitbox) tepat saat tepi kanan layar mencapainya. Spawn-saat-load di world-X jauh = bug.
> Invarian yang diverifikasi harness: *tak ada musuh ber-hitbox kecuali `state==ACTIVE`; jadi
> ACTIVE hanya saat `cam.scrollX+BW ≥ triggerX`. Peluru despawn di tepi.*

---

## §6 INTERACTION & COLLISION MATRIX

| A \ B | platform | enemy | enemy bullet | crate/barrel | amplop 💌 | POW | jurang |
|---|---|---|---|---|---|---|---|
| **player** | collide (stand) | overlap→hurt+knockback (kecuali i-frame/cheat) | overlap→hurt | collide | — | overlap→rescue | fall→respawn aman |
| **player bullet** | collide→despawn (overlap-first) | overlap→`hitEnemy` (manual sweep) | — | overlap→break+explode | overlap→`unlockInfo` | — | — |
| **enemy** | collide | — | — | collide | — | — | — |

**Aturan kunci:**
- **Peluru vs musuh di atas platform (bug versi lama):** daftar `overlap(bullets, enemies)`
  **SEBELUM** `collider(bullets, platforms)`, + `processCallback` collider platform menolak
  membunuh peluru saat sedang menimpa musuh, + **`manualEnemyHits` sweep tiap frame** (anti-tunnel
  peluru cepat). `hitEnemy` **idempotent** (guard `e.active`) agar dua jalur damage tak double.
- **Peluru despawn di tepi viewport** (anti off-screen-kill, §5):
  ```js
  this.bullets.children.iterate(function (b) {
    if (!b || !b.active) return;
    if (b.x > cam.scrollX + BW + 16 || b.x < cam.scrollX - 16) b.disableBody(true, true);
  });
  ```
- **i-frame:** player kena → `IFRAME_MS` kebal + blink; overlap diabaikan selama i-frame.
- **Cheat:** player invincible (semua overlap→hurt di-skip).

> **Golden Rule §6:** Musuh selalu menang atas platform untuk urusan peluru; peluru selalu mati
> di tepi layar. Damage idempotent.

---

## §7 POWER-UP / WEAPON SYSTEM

**Weapon triangle (coverage ↔ damage ↔ rate):**

| Senjata | Kode | Sifat | Cap proyektil di layar |
|---|---|---|---|
| Default (pistol) | — | cepat, 1 arah, lemah | tak terbatas (tapi edge-despawn) |
| Machine Gun | `M` | sangat cepat, sempit | — |
| Spread | `S` | 3-arah, coverage luas | — |
| Laser | `L` | tembus, kuat, lambat | 2–3 |
| Flame | `F` | area dekat, DOT | 2–3 |

- **Drop via crate** (ditembak pecah). **Mati/kena keras → senjata turun ke default** (risk/reward).
- **Powerup Relevance Rule:** senjata ofensif **wajib ada ≥1 musuh** untuk dipakai sebelum AREA
  CLEAR. Crate di segmen tanpa musuh sesudahnya → ganti jadi reward skor.
- **Granat:** stok terbatas (mis. 3), arc throw, AoE. Reisi via POW/crate.

> **Golden Rule §7:** Senjata mengubah feel terus-menerus (drop tiap ~15–25s), tapi mati =
> reset ke default. Powerup ofensif tak pernah sia-sia (selalu ada target).

---

## §8 DIFFICULTY SCALING

Difficulty = **knobs**, bukan level terpisah. Default **RAMAH** (tanpa nyawa/game-over).

| Knob | Easy | Normal | Hard |
|---|---|---|---|
| `minEnemiesPerScreen` (lantai density) | 3 | 4 | 6 |
| Enemy bullet speed | 180 | 230 | 290 |
| Enemy fire interval | 1.6s | 1.2s | 0.9s |
| Player i-frame | 1200ms | 1000ms | 800ms |
| Drone/tank mulai sektor | 3 | 2 | 1 |

- **Kurva sawtooth** antar sektor (puncak gauntlet → lembah POW → puncak lebih tinggi). Lembah
  **tetap terisi** prop/POW.
- Picker kesulitan ada di **cover overlay** & **stage-select** (class/handler sama) — APPENDIX Z.

> **Golden Rule §8:** Naikkan kesulitan lewat **density & kecepatan musuh**, bukan dengan
> menghukum pemain (tanpa nyawa). Lantai density ikut naik per difficulty.

---

## §9 CAMERA & READABILITY

- **Follow offset ke kiri ⅖** (game maju-ke-kanan → pandangan depan luas):
  `cam.setFollowOffset(-Math.round(BW*0.40), -70)` + `cam.setDeadzone(20,120)` +
  `cam.startFollow(player, true, 0.14, 0.14)`. **Batas ~0.42** (lebih → player mepet tepi kiri,
  musuh dari belakang tak terlihat). **JANGAN player di tengah.**
- **Bounds:** `cam.setBounds(0, 0, sectorWidth, BH)`; saat scroll-lock, clamp sementara.
- **No blind jump:** pendaratan tiap lompatan terlihat saat takeoff (offset sudah memberi lookahead).
- **Shake/flash** = juice (§10), bukan mengaburkan keterbacaan.

> **Golden Rule §9:** Player di kiri ⅖, depan luas, deadzone kecil-responsif. Ancaman selalu
> terlihat datang.

---

## §10 GAME FEEL / JUICE + GRAFIS

**Juice (stack semua di frame impact yang sama):**
- **Freeze-frame:** hit normal 2–4 frame; power/kill 5–8 frame (cap ~0.3–0.5s).
- **Screen shake:** model trauma `shake = trauma²`, decay 200–400ms; `cam.shake(120, 0.02)`
  (intensity float kecil ~0.01–0.05, **bukan piksel**). Hit kecil `+=0.2`, ledakan `+=0.5`.
- **Flash:** `cam.flash(80, 255,240,180)` putih=impact; merah saat player kena.
- **Squash & stretch** (jaga volume), **anticipation** (jongkok 2–6 frame sebelum lompat).
- **Partikel:** API 3.60+ (`this.add.particles(x,y,key,cfg)` → `em.explode(n,x,y)`); **JANGAN**
  `createEmitter()` (throw di 3.80.1). Cap `maxAliveParticles`, lifespan pendek.
- **SFX:** pitch-vary ±1–3 semitone pada bunyi berulang (3–5 variasi).

**Grafis prosedural WAJIB di-shade** (flat single-color = belum selesai): tiap sprite = base +
highlight (top ~22%) + shadow (bottom ~22%) + outline gelap (helper `box()`/`outline()`), siluet
unik per entity. Backdrop ber-lapis (APPENDIX C).

> **Golden Rule §10:** Output maksimal untuk input minimal. Tiap tembakan & ledakan terasa.
> Tak ada sprite flat polos.

---

## §11 AUDIO DESIGN

- **SFX game** via Web Audio / `this.sound`: `shoot`, `enemy_die`, `explosion`, `jump`,
  `collect` (amplop), `rescue` (POW), `weapon_pickup`, `win`. Pitch-vary yang berulang.
- **Backsound undangan = MILIK HOST. JANGAN `audio.play()` dari tema.** Tema hanya klik
  `#btn-toggle-music` + mirror ikon (APPENDIX Z).

> **Golden Rule §11:** SFX game bebas & meriah; backsound tenant tak pernah disentuh tema.

---

## §12 ANTI-FRUSTRATION RULES

- Coyote time 100ms + jump buffer 100ms + corner-correction ~4px.
- No spawn-kill: hazard/musuh mematikan pertama **setelah** zona aman/checkpoint, ber-telegraph.
- No mandatory-hidden: kepingan tak boleh disembunyikan di tempat mustahil ditemukan tanpa petunjuk.
- Objek mirip = perilaku sama (no instakill lookalike).
- Jatuh jurang = respawn aman (mundur), bukan reset stage.

> **Golden Rule §12:** Tantangan dari eksekusi, bukan dari ketidakadilan/obscurity.

---

# APPENDIX A — PATTERN LIBRARY (run-and-gun, ≥24 pola)

> Pola = blok level ber-footprint tetap yang generator rangkai jadi sektor. Tiap pola **wajib
> lolos lantai density** (§3.3). ID: `R`=rush, `G`=ground-mix, `E`=elevation, `H`=hazard,
> `V`=vehicle, `A`=arena-lock, `P`=prop/decor, `K`=kepingan. Footprint dalam px (BW=540).

| ID | Nama | Footprint | Layout (ASCII) | Isi & rules |
|---|---|---|---|---|
| `R001` | Rush wave kecil | 540 | `>>  >>  >>` | 3–4 `rush` masuk dari tepi bertahap; trigger ditebar |
| `R002` | Rush gelombang | 720 | `>> >> / >> >>` | triangle: 2→3→4 rush; ≥1 prop di antara |
| `G001` | Mix darat | 540 | `R . r . R` | 2 rush + 1 range; ground level |
| `G002` | Range gauntlet | 720 | `r .. r .. r` | 3 range berjarak; player maju di antara tembakan |
| `E001` | Pijakan naik | 540 | `▔▔  ▁▁▔▔` | 1 platform naik (6–8 tile) + turret di atasnya |
| `E002` | Tangga pijakan | 720 | `_▁▂▃▄` | 3 platform menanjak (jawab "pijakan untuk naik kurang") |
| `E003` | Cover & parit | 540 | `▔ _▁_ ▔` | parit + cover; range di balik cover |
| `H001` | Barel berantai | 540 | `■ ■ ■` | 3 barel explosive (chain) + rush di antaranya |
| `H002` | Sungai (river) | 720 | `~~platform~~` | terrain air + penembak di platform atas + barel (3 bidang ancaman, tiru beat #8) |
| `V001` | Drone udara | 540 | `  ✈  ` | 1–2 drone hover+drop; ancaman udara di atas rush darat |
| `V002` | Tank gate | 720 | `crate→TANK` | crate senjata DULU, lalu 1 tank (Relevance Rule) |
| `A001` | Scroll-lock kecil | 720 | `[lock: 4–6 musuh]` | clamp kamera; ≤2 tipe; lepas saat habis |
| `A002` | Scroll-lock diamond | 900 | `[lock: fodder→elite]` | menuju mini-boss/AREA CLEAR |
| `P001` | Landmark midground | 540 | `🗿` | stone-head/kapal selam/rumah kayu (rasa tempat) |
| `P002` | Foreground destructible | 540 | `▢ ▢ ▢▢` | 2–4 crate/barel/struktur (visual noise) |
| `K001` | Amplop pickup | 540 | `  💌  ` | amplop melayang yang harus DITEMBAK (kepingan); diapit 1–2 musuh (usage window) |
| `K002` | POW rescue | 540 | `  ☺  ` | POW terikat → tembak tali → reward |

**Pattern Chain Rules:**
- **Jangan >3 pola sejenis berturut** (mis. tiga `R` beruntun → bosan). Selingi `E`/`H`/`P`.
- **Setiap 1 pola, minimal 1 sumber prop** (`P001`/`P002`) — tak boleh ada chain tanpa dekorasi.
- **`V`/armor hanya setelah crate senjata** dalam ≤1 pola sebelumnya.
- **`A` (scroll-lock) sekali per ~3–4 layar** untuk ritme puncak-lembah.

**Level Generation Formula (% pola per difficulty, normal):** rush/mix 40% · elevation 20% ·
hazard 15% · vehicle/air 10% · arena-lock 8% · prop/kepingan 7% (kepingan ditempatkan
deterministik dari quota, lihat APPENDIX X).

> **Golden Rule APP-A:** Tiap pola berdiri sendiri lolos density (≥3–4 musuh atau ≥2 prop+1
> elevasi); generator merangkai → otomatis padat. Chain tanpa prop/elevasi = ditolak validator.

---

# APPENDIX B — ENTITY ENCYCLOPEDIA

### Player
```yaml
hp: tak-pakai-nyawa (knockback + i-frame model)
run_speed: 220
jump_velocity: -470
coyote_ms: 100
jump_buffer_ms: 100
iframe_ms: 1000
states: [idle, run, jump, fall, prone, shoot(overlay 8-arah), hurt, dead→respawn-aman]
weapon: default|M|S|L|F  (mati keras → default)
collision: collide(platform), overlap→hurt(enemy/enemy_bullet), overlap→pickup(crate/amplop/POW)
```

### Enemy: rush / range / turret / drone / tank / mortar
```yaml
rush:   { hp:1, speed:140, ai:[WALK_IN→CHASE], dmg:contact, telegraph:siluet-lari }
range:  { hp:1, ai:[IDLE→AIM(0.5s)→FIRE→COOLDOWN], bullet:aim-player, telegraph:angkat-senjata }
turret: { hp:2, static:true, ai:[AIM(0.5s)→FIRE], mount:platform/ground }
drone:  { hp:1, gravity:false, ai:[HOVER→DROP], threat:udara }
tank:   { hp:6, speed:60, ai:[ADVANCE→AIM(0.6s)→CANNON(arc)], gated:butuh-crate-dulu }
mortar: { hp:2, ai:[arc-shell, indikator-jatuh], threat:artileri }
# SEMUA: spawn via record inert (triggerX), lahir di tepi kanan, hitbox hanya saat ACTIVE.
# SEMUA tembakan: aim ke player + spread kecil (bukan flat konstan).
```

### Item / hazard
```yaml
amplop_kepingan: { trigger:DITEMBAK, effect:unlockInfo(key), no-buff, melayang+bob }
POW:             { trigger:tembak-tali/sentuh, effect:reward(skor/senjata/granat) }
crate_senjata:   { trigger:DITEMBAK, drop:M|S|L|F }
barel:           { trigger:DITEMBAK, effect:explode+chain, dmg:enemy&player }
jurang:          { trigger:player-fall, effect:respawn ke lastSafeX (mundur, aman) }
```

### Boss (sektor 6) — lihat APPENDIX D.

> **Golden Rule APP-B:** Mook 1-hit, heavy ber-telegraph. Tiap entity punya siluet & telegraph
> unik. Kepingan ≠ powerup ofensif (murni koleksi).

---

# APPENDIX C — BIOME / STAGE LIBRARY (6 sektor, backdrop PADAT)

> Tiap sektor: sky palet sendiri + **≥3 lapis parallax** (`scrollFactor` 0.2/0.45/0.7) + props,
> rebuild & clear per sektor. **DAN kuota prop per layar** (§3.3): ≥1 far + 1–2 landmark + 2–4
> destructible + ≥1 ambient motion. Slot tak terisi musuh/kepingan → isi prop.

| # | Sektor | Sky palet | Far parallax | Midground landmark | Foreground destructible | Ambient motion | Enemy pool dominan |
|---|---|---|---|---|---|---|---|
| 1 | Jungle | hijau-pagi | kanopi/palem siluet | batu besar, kapal selam | crate, barel, semak | dedaunan goyang | rush, range |
| 2 | Sungai | biru-siang | tebing, air terjun jauh | rumah kayu, scaffold | barel, struktur kayu | rapids, percikan | range, drone, turret |
| 3 | Pesisir | jingga-sore | laut, kapal karam | dermaga, peti kemas | drum, krat | ombak, camar | rush, turret, mortar |
| 4 | Gurun camp | coklat-terik | bukit pasir | tenda, menara jaga | barel BBM, pagar | debu, bendera | range, tank, mortar |
| 5 | Pabrik | abu-mendung | cerobong, pipa | mesin, conveyor | tabung gas, krat | uap, percik api | turret, drone, tank |
| 6 | Markas (boss) | merah-malam | siluet markas | gerbang besar, reflektor | barel, barikade | asap, lampu sorot | mixed + BOSS |

**Physics modifier:** sektor 2 (sungai) area air = `RUN_SPEED ×0.85` di shallow; lainnya normal.
**Difficulty scaling antar-sektor:** sawtooth — sektor genap = puncak gauntlet, ganjil = lebih
banyak POW/reward (lembah terisi).

> **Golden Rule APP-C:** Dunia tak pernah kosong/hitam. Tiap layar punya langit ber-warna,
> 3 lapis parallax, landmark, destructible, dan satu hal yang bergerak.

---

# APPENDIX D — BOSS / CLIMAX SYSTEM (sektor 6 — selamatkan mempelai)

### Boss: "Benteng Tetsujin" (gunboat darat) — fortress yang menawan mempelai wanita

- **WAJIB WALK-IN (bug versi lama):** boss dibuat **inactive** + simpan `arenaX`. Sediakan koridor
  approach (musuh ringan). Kamera dikunci & boss di-aktifkan **saat `player.x ≥ arenaX`** — bukan
  saat arena dibangun. Reset flag boss tiap sektor (anti carry-over).
- **WAJIB HP BAR + bisa kalah:** HP bar **kecil di ATAS boss** (world-space, ikut posisi), turun
  tiap hit. **TTK ~25–35s** (normal). Feedback tiap hit (flash+shake+SFX).
- **Hit-detection MANUAL tiap frame** (`manualBossHits`): boss bobbing/immovable → **jangan**
  andalkan overlap fisika; **jangan `setActive(false)`** (matikan body → tak kena tembak) — sembunyi
  fase pakai **alpha**. Weak point jelas (inti bersinar).
- **Peluru boss aim ke player** + spread (bukan flat konstan).

**Phase system (3 fase, threshold HP):**
```
Fase 1 (100–66%): laser cannon — volley 3 bolt melengkung; telegraph charge 0.6s. Safe: jongkok/lompat.
Fase 2 (66–33%):  + bola laser high/low bergantian (evolusi moveset, bukan tempel mekanik asing).
Fase 3 (33–0%):   + turret samping aktif; safe-window menyempit; transisi ditandai flash.
```

**Victory sequence (selamatkan mempelai):** boss meledak → mempelai wanita (gaun+buket) muncul →
beat meriah ~5s (flash + fireworks + SFX `win`) → dialog happy-ending (CTA buka undangan).

> **Golden Rule APP-D:** Boss walk-in, ber-HP-bar, kalah dalam 25–35s, hit manual, peluru aim
> player. Menang = mempelai terselamatkan → undangan terbuka.

---

# APPENDIX E — VALIDATOR ENGINE (playability + DENSITY gate)

> Validator = **bagian dari generation loop** (APPENDIX F), bukan checklist manual. Segmen yang
> gagal **di-REGENERATE**.

### E.1 Playability checklist
- `goalReachable` — AREA CLEAR/boss tercapai (tak ada gap > D_max wajib).
- `allPiecesReachable` — tiap amplop kepingan bisa ditembak/diraih.
- `noSoftlock` — tak ada scroll-lock yang wavenya mustahil dibersihkan.
- `noSpawnKill` — tak ada musuh/peluru mematikan di 600px safe zone / tepat setelah respawn.
- `weaponUsageWindow` — tiap crate senjata punya ≥1 musuh sebelum AREA CLEAR.

### E.2 DENSITY VALIDATOR — "NO DEAD AIR" (gate keras)
```js
// SEG = 1 viewport (BW=540). Iterasi tiap SEG kontigu sepanjang sektor.
function validateDensity(sector, BW, opts) {
  var fails = [];
  for (var x = sector.startX; x < sector.endX; x += BW) {
    var seg = sector.window(x, x + BW);
    var combat = !seg.isSafeZone;
    if (combat && seg.count('enemy') < opts.minEnemiesPerScreen) fails.push([x,'enemies']);
    if (seg.count('platform_elevated') < opts.minPlatformsPerScreen) fails.push([x,'platforms']);
    if (seg.count('parallax_far') < 1)        fails.push([x,'far']);
    if (seg.count('landmark_mid') < 1)        fails.push([x,'landmark']);
    if (seg.count('destructible') < opts.minDestructiblePerScreen) fails.push([x,'destructible']);
    if (seg.count('ambient_motion') < 1)      fails.push([x,'ambient']);
    if (seg.largestEmptyRun('enemy|item|destructible|event') > opts.maxDeadPx)
                                              fails.push([x,'deadair']);
  }
  if (sector.maxRewardGap() > opts.rewardEveryPx) fails.push(['*','reward-gap']);
  return fails; // kosong=lolos; isi=REGENERATE segmen tsb
}
var DENSITY = {
  minEnemiesPerScreen: 4,           // easy 3 · normal 4 · hard 6
  minPlatformsPerScreen: 1,
  minDestructiblePerScreen: 2,
  maxDeadPx: Math.round(540*0.75),  // ≤405px kosong
  rewardEveryPx: Math.round(540*2.5)// reward tiap ≤1350px
};
```

### E.3 SPAWN-HONESTY VALIDATOR (anti off-screen-kill)
- **Assert:** tak ada entity musuh hidup (`body.enable`) saat `state != ACTIVE`.
- **Assert:** musuh hanya jadi ACTIVE saat `cam.scrollX + BW ≥ triggerX`.
- **Assert:** peluru player ber-`x > cam.scrollX+BW` di-disable dalam ≤1 frame.
- **Test harness:** taruh record `triggerX` jauh kanan → tembak → **TIDAK** kena; scroll sampai
  `edge≥triggerX` → musuh muncul di tepi → baru bisa kena.

### E.4 Scoring (lulus ≥80/100): playable 30 · density 25 · fair 15 · rewarding 15 · discovery 15.

> **Golden Rule APP-E:** Lolos playability TAPI gagal density = **tetap gagal**. Off-screen-kill
> = **fail otomatis** (skor 0), regenerate.

---

# APPENDIX F — GENERATION ALGORITHM (deterministik)

```
PER SEKTOR:
1. build spine        → tentukan sectorWidth, GROUND_Y, safe zone 600px, posisi AREA CLEAR/boss.
2. lay biome backdrop → sky + 3 parallax + landmark + ambient (APPENDIX C) — penuhi kuota prop.
3. fill patterns      → rangkai pola APPENDIX A per Generation Formula + Chain Rules.
4. place entities     → ubah pola jadi spawnList (record {triggerX,type,y}) TERURUT; crate; POW.
5. validateDensity    → APPENDIX E.2 → SEGMEN GAGAL? sisip prop/musuh/elevasi → ULANGI 5.
6. place pieces       → amplop kepingan dari quota deterministik (APPENDIX X), tiap diapit musuh.
7. validate playability + spawn-honesty (E.1/E.3) → gagal? perbaiki → ulangi.
8. emit               → spawnList + platform statics + props + triggers scroll-lock.
RUNTIME: pointer spawn (§5.2) memproses spawnList saat scroll; TIDAK ada create() massal saat load.
```

**Master instruction (untuk Tahap 2):** "Bangun tiap sektor dengan spine→backdrop→patterns→
entities→**validateDensity(regen)**→pieces→validate. Musuh SELALU lewat spawnList relatif-kamera.
Tak ada layar tanpa ≥3–4 musuh / ≥1 elevasi / ≥1 far+landmark + 2–4 destructible / ≥1 ambient.
Reward tiap ≤1350px. Peluru despawn di tepi."

> **Golden Rule APP-F:** Density validator & spawn-relatif-kamera adalah bagian pipeline, bukan
> opsi. Build berhenti hanya saat semua segmen lolos.

---

# APPENDIX T — TECHNICAL FOUNDATION (PHASER 3.80.1)

### T.1 Boot aman (anti ukuran-0 & blank)
```js
function bootGame() {
  var stage = document.getElementById('gw-stage');
  var r = stage.getBoundingClientRect();
  var W = Math.max(320, Math.round(r.width)), H = Math.max(480, Math.round(r.height));
  var game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'gw-stage', width: W, height: H,
    backgroundColor: '#10160e',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default:'arcade', arcade:{ gravity:{ y:1000 }, debug:false } },
    render: { pixelArt:true, antialias:false, roundPixels:true },
    scene: [BootScene, GameScene]
  });
}
```
- **JANGAN** baca `this.scale.width/height` di `create()` (bisa 0) — tata world pakai `W`/`H` tetap.
- `ensurePhaser(cb)` fallback CDN `phaser@3.80.1` bila `window.Phaser` kosong.
- `showError(msg)` on-screen agar "Phaser gagal" beda dari "logic bug".

### T.2 Physics & movement
- `body.blocked.down === onFloor()`; lompat pakai `JustDown/JustUp` (edge), coyote+buffer.
- `collider(a,b,cb,processCb)` separasi; `overlap` deteksi-saja. Platform = `staticGroup` (refresh
  bila dipindah).

### T.3 Pooling (peluru/musuh/partikel)
```js
this.bullets = this.add.group({ classType: Bullet, maxSize: 40, runChildUpdate: true });
var b = this.bullets.get(); if (b) b.fire(x,y,dir);   // SELALU null-check
this.enemies = this.physics.add.group();              // musuh dynamic; reset body saat reuse
```

### T.4 Procedural texture + shading (guard exists)
```js
if (!this.textures.exists('p_idle')) { /* generate via make.graphics + box()/outline() */ }
```
Tiap sprite: base + highlight (top 22%) + shadow (bottom 22%) + outline 0x10140d. Siluet unik.

### T.5 Particles (API 3.60+ — `createEmitter()` THROW)
```js
var em = this.add.particles(0,0,'spark',{ speed:{min:-200,max:200}, scale:{start:0.6,end:0},
  lifespan:600, blendMode:'ADD', emitting:false });
em.explode(16, x, y);   // burst; em.destroy() saat shutdown
```

### T.6 Camera juice
`cam.shake(120, 0.02)` (intensity float), `cam.flash(80,255,240,180)`.

### T.7 SPAWN RELATIF-KAMERA (inti — ulang dari §5)
```js
update(time, delta) {
  var cam = this.cameras.main, edge = cam.scrollX + this.BW;
  while (this._next < this.spawnList.length && edge >= this.spawnList[this._next].x) {
    var r = this.spawnList[this._next++];
    this.spawnEnemy(r.type, Math.max(r.x, edge), r.y, r.opts);
  }
  // despawn musuh keluar kiri
  this.enemies.children.iterate(function(e){
    if (e && e.active && e.body && e.right < cam.scrollX - 64) e.disableBody(true,true);
  });
  // despawn peluru di tepi (anti off-screen-kill)
  this.bullets.children.iterate(function(b){
    if (b && b.active && (b.x > edge+16 || b.x < cam.scrollX-16)) b.disableBody(true,true);
  });
}
```

### T.8 Cleanup (re-inject host) — KRITIKAL
```js
window.__gwCleanup = function(){ offs.forEach(o=>{try{o();}catch(e){}}); offs.length=0;
  if (window.__gwGame) window.__gwGame.destroy(true); window.__gwGame=null; window.__gwCleanup=null; };
```
`game.destroy(true)` (buang canvas, anti WebGL bocor); `destroy()` async (next frame).

> **Golden Rule APP-T:** Phaser 3.80.1 benar (partikel baru, `destroy(true)`, `blocked.down`),
> boot diukur dari parent, spawn relatif-kamera di `update`, cleanup idempotent.

---

# APPENDIX S — SINGLE-FILE ARCHITECTURE

- 3 file (HTML/CSS/JS), IIFE, tanpa bundler/import. Lapisan logis dalam IIFE: `Player`,
  `StateMachine`, `Weapon`, `EnemyManager` (spawnList+pointer+pool+AI), pools (bullet/enemy/
  particle), `Boss`, `config` terpusat (jangan hardcode tersebar).
- **GROUND vs controller (ber-angka):** `GROUND_Y = BH − (isTouch ? 200 : 150)`;
  `isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0` (dihitung **sebelum**
  menata world). Karakter clearance ≥80px dari kontrol.
- **Update order:** `Input → State → Movement → Weapon → SpawnPointer → Animation → Collision →
  Camera → UI`.
- Persistensi `localStorage` (versioned + try/catch): `unlocked`, `maxSector`, `bestScore`,
  `difficulty`, guard `announcedAll`/`completed`. **Cheat default TIDAK di-persist.**

> **Golden Rule APP-S:** Monolitik tapi berlapis; angka terpusat; spawn lewat EnemyManager
> (pointer), bukan create massal.

---

# APPENDIX W — WEDDING INTEGRATION (section → kepingan)

**11 section** (variabel terverifikasi ke daftar resmi; flag membungkus `<section>`):

| # | data-info | Variabel utama | Flag pembungkus |
|---|---|---|---|
| 1 | hero | `groom_nickname`/`bride_nickname`, `wedding_date`, `quote`/`quote_by`, `photo_hero_cover` | selalu |
| 2 | couple | `groom_name`/`bride_name`, `photo_groom_photo`/`photo_bride_photo`, `nama_bapak_*`/`nama_ibu_*`, `ig_*` | ortu:`flag_tampilkan_nama_orang_tua` · sosmed:`flag_tampilkan_sosial_media_mempelai` |
| 3 | rsvp | `countdown_hari/jam/menit/detik`, form RSVP | selalu |
| 4 | schedule | `tanggal_akad`,`jam_akad`,`nama_lokasi_akad`,`keterangan_lokasi_akad`,`akad_map` (+`*_resepsi`) | resepsi:`flag_lokasi_akad_dan_resepsi_berbeda` |
| 5 | streaming | `link_live_streaming` | `is_fitur_live_streaming` |
| 6 | story | `{{#each timeline_kisah}}`→`this.tanggal/judul/deskripsi` | `flag_pakai_timeline_kisah` |
| 7 | gallery | `{{#each galleries}}`→`this.url` | `has_gallery` |
| 8 | happiness | `sample_story_1..3`, `frame_balasan_instagram`, `link_balasan_instagram` | `flag_pakai_additional_feature_story_balasan_instagram` |
| 9 | wishes | form ucapan + `{{#each wishes}}`→`this.guest_name/guest_message/guest_comment_time` | selalu |
| 10 | gift | `bank_1`/`rek_1`/`nama_rek_1` (+`_2`), `gambar_qris_rekening_1/2`, `alamat_lokasi_kirim_hadiah_offline` | `tampilkan_amplop_online`,`flag_pakai_2_rekening`,`flag_pakai_qris_rekening_1/2`,`flag_kirim_hadiah_offline` |
| 11 | closing | `kalimat_penutup`, `site_name`/`site_url` | selalu |

**Aturan penempatan:**
- Kepingan **reachable** (tiap amplop bisa ditembak; diapit musuh = usage window).
- **Section inti di sektor awal:** `hero`, `schedule`, `rsvp` di sektor 1–2 (tamu yang berhenti di
  tengah tetap dapat info pokok).
- **Kepingan ≠ powerup ofensif** (murni koleksi, tanpa buff).

> **Golden Rule APP-W:** Jumlah kepingan = jumlah `<section data-info>` riil (scan boot), bukan
> hardcode. Info pokok di awal.

---

# APPENDIX X — COLLECTION MECHANIC

- **Bentuk kepingan:** amplop 💌 melayang (bob) yang **harus DITEMBAK** — objek khusus, beda dari
  crate senjata (siluet & warna berbeda).
- **Quota per-sektor + auto-scale:** shape default (6 sektor) mis. `[3,3,2,2,0,0]` (sum = jumlah
  section, contoh 10–11). Saat section dikurangi flag → **redistribusi proporsional** ke shape
  yang sama (**jangan hardcode total**).
- **Pemetaan sektor→kepingan DETERMINISTIK** (slice kontigu `INFOS` dari nomor sektor), bukan
  counter berjalan (cheat stage-jump/replay tak menggandakan).
- **Respons ambil:** `unlockInfo(key)` → ikon indikator menyala + toast (atas-tengah) + SFX
  `collect` + partikel + animasi terbang ke inventory + simpan `localStorage`. **NO auto-open
  modal.** Tamu klik ikon sendiri untuk membaca.
- **Slot pola sisa (quota 0 di sektor itu) → filler skor** (coin-trail footprint sama) agar level
  tetap padat.

> **Golden Rule APP-X:** Kepingan ditemukan dengan menembak; mengambil hanya menyalakan ikon +
> toast (tak memutus gameplay). Distribusi gradual & dinamis.

---

# APPENDIX Y — CHEAT SYSTEM

- **Satu flag** (mis. `state.cheat`), tombol `★`. ON →
  - **Undangan:** semua kepingan ter-unlock + tombol Buka Undangan aktif.
  - **Game:** player **invincible**, **bebas pilih kesulitan**, **semua stage terbuka**
    (stage-select). Skor **dibekukan** saat cheat (anti high-score palsu).
- **Toggle balik** mengembalikan tantangan. **Persist:** `unlocked` (kepingan) **di-persist**;
  `cheat` **default TIDAK di-persist** (reload → mode jujur; kepingan tetap kebuka).
- **Audit cheat-bypass blind spot:** pastikan invincible/auto-unlock **tidak bocor** ke mode
  normal saat toggle off (sumber bug berulang — lihat memory `retromario-debugging`).
- **RESET = PENUH** (overlay konfirmasi sendiri, bukan `confirm()`): wipe `localStorage` (incl.
  **kesulitan** kembali default) + `GAME.destroy(true)` (**stage reset**) + reset cheat/run +
  **kembali ke COVER** untuk pilih kesulitan lagi. Verifikasi di harness.

> **Golden Rule APP-Y:** Cheat membuka semuanya tapi membekukan skor & tak di-persist. Reset
> mengembalikan ke kondisi awal sepenuhnya.

---

# APPENDIX Z — HOST CONTRACT & WIRING

### Z.1 ID host verbatim (tanpa prefix)
`btn-show-qr`, `btn-show-menu`, `btn-toggle-music`/`btn-music`, `bg-music`, `play-icon`/
`pause-icon`, `btn-submit-ucapan`+`wish-name`+`wish-message`, `btn-submit-kehadiran`+
`rsvp-status`/`rsvp-guests`/`rsvp-code` (+ opsional hadiah). Mengubah/prefix = fitur backend mati.

### Z.2 Cleanup hook (re-inject tiap submit ucapan/RSVP)
IIFE baris awal panggil `window.__gwCleanup` lama → daftarkan baru (bongkar RAF/listener/
`Phaser.Game`). Idempotent (re-inject sering, bukan cuma ganti tema).

### Z.3 Binding satu sumber (`#inv-source`)
Semua section + `{{vars}}` sekali saja di `#inv-source`. Scan boot → daftar section riil →
jumlah kepingan & ikon. Modal/reveal **clone** dari `#inv-source` (jangan duplikasi binding).
Baca via `val(k,fb)` (teks rendered + fallback). `{{#if}}` **membungkus `<section>`**, bukan isinya.

### Z.4 Musik (mirror idempotent)
Tema **tak boleh** `audio.play()` backsound tenant. Hanya klik `#btn-toggle-music` + mirror ikon.
Simpan **intent** (`musicWanted`) + generation guard; klik hanya bila state host **masih** salah
(retry terjadwal) — anti double-click yang justru mematikan musik.

### Z.5 RSVP/ucapan (panggil global host + fallback)
```js
if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; } // else fallback lokal
if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
```

### Z.6 Countdown
`{{countdown_*}}` di-update host tiap detik (span ber-ID). Jangan timpa innerHTML container itu.

### Z.7 Layout (lihat §7 + layout-camera-hardwon.md)
- **Desktop 2-kolom:** frame game **MENTOK KIRI** (480px, `justify-content:flex-start`, `order:1`,
  `flex:0 0 auto`) + panel kanan **PURE undangan** (`order:2`, `flex:1`): `<canvas>` couple
  (Canvas 2D, jas/gaun, scene bertema game) + nama+tanggal + Akad/Resepsi+map + **satu** tombol
  💌 BUKA UNDANGAN LENGKAP. **No tombol game di kanan.** 1 breakpoint (980px); mobile = frame saja.
- **HUD map:** ICON-BUTTON **kiri-atas** (★/▦/💌/🎵/⟲) · indikator kepingan **kanan-atas** ·
  joystick **kiri-bawah** · FIRE/JMP/GRENADE **kanan-bawah**. Target ≥44px, spacing ≥8px,
  hormati `safe-area-inset`.
- **Toast** atas-tengah (~18–35% dari atas), 3–8s, warna+ikon (BUKAN di dasar).
- **Dialog pilih** (stage/kesulitan): klik=pending, tombol **OK**=commit, ada Batal.

### Z.8 Celebration (2 pemicu, guard di-persist)
1. **Kepingan terakhir** → undangan lengkap (tanpa harus tamat). 2. **Boss kalah** → happy-ending.
Beat meriah ~5s (flash+fireworks+SFX `win`) **sebelum** dialog (`setTimeout ~4.5s`). Dialog sebut
pencapaian + CTA, pakai nama dinamis (`val('groom_nickname')`). Guard `announcedAll`/`completed`
**di-persist** (anti ulang saat re-inject). Saat menang → pastikan semua kepingan ter-unlock.

> **Golden Rule APP-Z:** ID host verbatim, cleanup idempotent, satu sumber binding, musik mirror
> aman, layout 2-kolom frame-kiri/undangan-kanan, celebration 2-pemicu guard.

---

# APPENDIX G — ASET SPRITE (CC0) + FALLBACK PROSEDURAL

Grafis memakai **sprite asli CC0** yang diupload tenant via **Theme Editor** (Asset Media), dibaca
lewat `{{asset_image_N}}` (lihat [`assets/ASSETS.md`](assets/ASSETS.md) untuk urutan upload & lisensi).

- **Pakai aset:** player (idle/run/shoot, komando hijau), enemy infanteri (idle/run), muzzle flash,
  ground tile (dirt+grass), explosion (spritesheet 10×5). Sumber: Sput's Soldier Pack + Kenney
  (semua **CC0**, bukan rip Metal Slug SNK).
- **Tetap prosedural (diperkaya):** backdrop parallax 4-lapis (langit gradien per-biome + 2 lapis
  gunung berlapis + awan + semak depan), boss, peluru, partikel, amplop/crate/barel/POW, couple-canvas.
- **FALLBACK WAJIB (anti-blank):** tiap aset dibaca via `assetUrl(name)` → `null` bila
  `{{asset_image_N}}` belum diupload (placeholder/kosong/`{{`). Saat `null` → game pakai sprite
  **prosedural**. `this.load.on('loaderror')` juga drop tekstur gagal (CORS/404). Flag `useAsset[name]`
  dicek di tiap titik gambar. **Game tak pernah blank**, makin banyak aset diupload makin bagus.
- Player & enemy infanteri di-`fitSprite` ke tinggi dunia ~54–58px; body proporsional terhadap frame.

> **Golden Rule APP-G:** Aset = peningkatan, bukan ketergantungan. Tanpa upload pun game jalan
> (prosedural). Hanya aset CC0 (legal). Spawn/density tak terpengaruh layer grafis.

---

# VERIFIKASI (Tahap 2)

- **Screenshot headless Chrome TIDAK bekerja di mesin ini** (selalu blank). Verifikasi: paste 3
  file ke **Theme Editor** host lalu buka preview, atau minta user.
- **Logika game/loop** via **harness Node headless** (RAF di-stub, jalankan `loop()` asli).
- **Test invarian wajib:**
  1. **Density:** scan tiap viewport sektor → tak ada segmen gagal lantai (E.2).
  2. **Spawn-honesty:** musuh `triggerX` jauh kanan + tembak → tidak kena; scroll → muncul di tepi
     → baru kena (E.3).
  3. **Peluru vs musuh di atas platform:** musuh hp-1 di platform → 1 peluru → mati, peluru habis.
  4. **Boss:** peluru di posisi boss → `manualBossHits` → hp turun → `defeatBoss`.
  5. **Cheat tak bocor** ke mode normal saat toggle off.
- Selalu sediakan `showError()` (bedakan "Phaser gagal" vs "logic bug").

---

## CHECKLIST BIBLE "SELESAI"

- [x] Kerangka §0–§12 + APPENDIX A–F + T/S + W–Z lengkap.
- [x] Spesifik arketipe run-and-gun (roster, weapon triangle, wave shape, boss phase).
- [x] **Density "NO DEAD AIR"** — beat-sheet referensi (§3.2) + lantai ber-angka (§3.3) +
      validator yang memaksa regen (APPENDIX E.2 + F).
- [x] **Spawn relatif-kamera** (anti off-screen-kill) — §5 + APPENDIX B/E.3/T.7.
- [x] Aturan ber-angka (fisika, juice, density, difficulty).
- [x] Phaser 3.80.1 benar (partikel API baru, `destroy(true)`, `blocked.down`, boot anti-ukuran-0).
- [x] Variabel undangan terverifikasi ke daftar resmi (tak ada karangan).
- [x] APPENDIX W–Z: kepingan dinamis & reachable, cheat bypass+audit, celebration 2-pemicu, layout
      2-kolom, musik mirror idempotent, `{{#if}}` membungkus section, ID host verbatim.
- [x] Golden Rule di tiap bagian besar.
- [x] Disimpan di `src/sample-theme/metalslug-2/METALSLUG2_BIBLE.md`.
