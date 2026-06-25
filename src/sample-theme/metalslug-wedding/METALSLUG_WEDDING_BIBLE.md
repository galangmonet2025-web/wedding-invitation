# METAL SLUG WEDDING — GAME DESIGN BIBLE

> **Output Tahap 1.** Dokumen ini adalah **sumber kebenaran** untuk men-generate 3 file tema
> (`index.html` + `index.css` + `index.js`) di Tahap 2. **Dokumen ini TIDAK meng-implementasi
> kode tema** — ia men-spec & mendeskripsikan setiap keputusan agar Tahap 2 tinggal mengikuti.
>
> - **Arketipe:** Run-and-gun / platformer-shooter klasik — referensi **Metal Slug (SNK, 1996)**.
> - **Engine:** **Phaser 3.80.1** (single-file: 1 HTML + 1 CSS + 1 JS, IIFE, aset procedural/CDN).
> - **Host:** SaaS undangan ini (ThemeWrapper meng-inject HTML/CSS/JS, binding via templateParser).
> - **Resolusi internal:** 540×960 (potret mobile) — di-FIT ke frame.
> - **Bahasa domain:** Indonesia (variabel tema, copy UI).

---

## DAFTAR ISI

**BAGIAN INTI (game design)**
- §0 Meta & Elevator Pitch
- §1 Core Principles (8 filosofi)
- §2 Core Gameplay Loop
- §3 World / Level Structure
- §4 Player System (state machine + fisika ber-angka)
- §5 Enemy / Obstacle System
- §6 Interaction & Collision Matrix
- §7 Power-up / Weapon System
- §8 Difficulty Scaling
- §9 Camera & Readability
- §10 Game Feel / Juice
- §11 Audio Design
- §12 Anti-Frustration Rules

**APPENDIX game-design (kedalaman ala Mario)**
- APPENDIX A — PATTERN LIBRARY (30 pola ber-ID)
- APPENDIX B — ENTITY ENCYCLOPEDIA
- APPENDIX C — BIOME / STAGE LIBRARY (6 stage)
- APPENDIX D — BOSS / CLIMAX SYSTEM
- APPENDIX E — VALIDATOR ENGINE
- APPENDIX F — GENERATION ALGORITHM

**APPENDIX teknis (Phaser 3)**
- APPENDIX S — SINGLE-FILE ARCHITECTURE
- APPENDIX T — TECHNICAL FOUNDATION (Phaser 3.80.1)

**APPENDIX integrasi undangan**
- APPENDIX W — WEDDING INTEGRATION (section → kepingan)
- APPENDIX X — COLLECTION MECHANIC
- APPENDIX Y — CHEAT SYSTEM
- APPENDIX Z — HOST CONTRACT & WIRING

---

# §0. META & ELEVATOR PITCH

**Judul game:** *METAL SLUG WEDDING — Operation: Pelaminan*
**Arketipe:** Run-and-gun side-scroller (Metal Slug / Contra family).
**Mood pasangan:** energik, heroik-jenaka, "perjuangan menuju pelaminan". Cocok untuk pasangan
yang suka retro arcade, militer-komedi, aksi cepat.

**Elevator pitch (1 paragraf):**
> Tamu memerankan seorang prajurit cinta yang menembus 6 sektor medan perang menuju "Markas
> Pelaminan". Sepanjang jalan ia **menyelamatkan POW** (tahanan berjanggut khas Metal Slug yang
> di-reskin jadi **kurir undangan**) — tiap POW yang diselamatkan menyerahkan **satu kepingan
> undangan** (amplop 💌). Senjata diganti dari pistol default ke Heavy MG / Shotgun / Flame /
> Rocket; ada SV-001 "Slug" yang bisa dinaiki; boss tiap akhir sektor. Di sektor terakhir, tamu
> menggagalkan rencana "membatalkan pernikahan" dan **menyelamatkan kedua mempelai** → undangan
> resmi terbuka. Tamu yang tak ingin bermain cukup tekan **Cheat (★)** untuk membuka semua
> kepingan & undangan langsung.

**Versi & arsitektur:** Phaser **3.80.1**, single-file (3 berkas), aset **procedural**
(`graphics.generateTexture`) + fallback. Tidak ada bundler/module. Semua JS dibungkus host dalam
IIFE dengan cleanup hook global `window.__gwCleanup`.

**Kenapa Metal Slug cocok untuk undangan (the why):**
1. **POW-rescue = mekanik koleksi bawaan.** Metal Slug *sudah* punya loop "selamatkan tawanan →
   dapat hadiah". Kita tinggal mengganti hadiah jadi kepingan undangan. Koleksi terasa **organik**,
   bukan tempelan.
2. **Side-scroll selalu-maju = narasi "perjalanan".** Maju ke kanan = maju menuju pelaminan.
3. **Tone jenaka** Metal Slug (ekspresi kaget, ledakan lebay) bikin undangan terasa hangat & lucu,
   bukan game perang serius.

> **GOLDEN RULE §0:** Game dulu, baru undangan. Bila sebuah keputusan desain membuat game kurang
> enak demi memajang undangan, keputusan itu salah — cari cara agar undangan *ditemukan lewat
> bermain*, bukan dipajang.

---

# §1. CORE PRINCIPLES

Delapan filosofi. Tiap prinsip: **aturan keras** + **BENAR/SALAH** + **WHY**.

### 1.1 Playability First (Game Dulu)
- **Aturan:** target **60fps** di mobile mid-range; input→aksi latency ≤ **2 frame** (~33ms).
  Tidak ada frame-drop saat ledakan (pakai pooling, cap partikel ~100 aktif).
- ✅ BENAR: peluru, musuh, partikel semua dari Group pool; `runChildUpdate:true`.
- ❌ SALAH: `new Bullet()` tiap tembakan → GC hitch saat tembak-spam.
- **WHY:** run-and-gun adalah genre *reaksi*. Lag 100ms = mati tak adil = tamu frustrasi & menutup
  undangan.

### 1.2 Teach Before Test (Onboarding tanpa kata — metode Mario 1-1)
- **Aturan:** tiap mekanik baru muncul **pertama kali di zona fail-proof** (tak ada musuh/jurang
  mematikan di radius 5 tile). Kemunculan-pertama consequence-free.
- ✅ BENAR: POW pertama ditaruh di start-safe-zone Stage 1, tanpa musuh, dengan panah on-screen
  "tembak/ sentuh untuk menyelamatkan".
- ❌ SALAH: POW pertama dikelilingi 3 turret → tamu mati sebelum paham cara rescue.
- **WHY:** tamu undangan **bukan gamer**. Frustasi di 10 detik pertama = churn.

### 1.3 Fair Challenge (Telegraph segalanya)
- **Aturan:** setiap serangan musuh & boss punya **wind-up ≥ 0.5s (≥15 frame)**; makin lethal
  makin panjang. Channel redundan: pose + flash + SFX.
- ❌ SALAH: turret menembak instan tanpa animasi isi-peluru.
- **WHY:** kesulitan harus datang dari **eksekusi**, bukan tebak-tebakan. (Sumber: GDKeys Anatomy
  of an Attack.)

### 1.4 Readability (Silhouette & warna)
- **Aturan:** musuh terbaca dari **siluet** sebelum beraksi; hazard mematikan = warna **merah/
  oranye menyala**; reward (POW/amplop) = warna **cyan/emas berkilau**. Objek mirip = perilaku
  sama (no instakill lookalike).
- **WHY:** di layar HP kecil, pemain mem-parse bentuk & warna, bukan detail.

### 1.5 Discovery / Reward
- **Aturan:** tiap interaksi pertama me-**reward** (rescue POW pertama → SFX kemenangan + amplop
  terbang ke HUD). Bangun kebiasaan "mendekati POW itu baik".
- **WHY:** loop koleksi hidup dari dopamin kecil berulang.

### 1.6 Inklusif (Cheat sebagai jalan masuk, bukan dosa)
- **Aturan:** Cheat (★) **selalu** terlihat & 1-klik membuka semua kepingan + undangan, **tanpa
  menghukum** (tidak ada "skor 0 / kamu curang" yang menghina). Game tetap bisa dimainkan saat
  cheat (invincible).
- **WHY:** sebagian tamu (orang tua, tamu tergesa) hanya ingin info acara. Mereka **tetap tamu
  utama**.

### 1.7 Mobile-First
- **Aturan:** target sentuh ≥ **44×44 CSS px**, spacing ≥ **8px**; kontrol di **green zone**
  bawah; HUD di atas (dilihat, tak di-tap). Floating-fire opsional; D-pad/joystick kiri, tombol
  aksi kanan.
- **WHY:** ~75% sentuhan = jempol; kontrol di atas = jari menutup karakter.

### 1.8 Undangan Fungsional (Host contract sakral)
- **Aturan:** RSVP, ucapan, amplop, QR, musik **wajib jalan** via ID host verbatim & fungsi
  global host. Game theme **tidak boleh** mematikan fitur backend.
- ❌ SALAH: memberi prefix `ms-` ke `wish-name` → ucapan mati diam-diam.
- **WHY:** undangan yang cantik tapi RSVP-nya mati = produk gagal.

> **GOLDEN RULE §1:** Tiap prinsip punya angka. Kalau sebuah aturan tak bisa diukur, ia belum
> selesai ditulis.

---

# §2. CORE GAMEPLAY LOOP

**Verb utama:** **TEMBAK** (8-arah-ish), **LOMPAT**, **TIARAP/MERUNDUK**, **SELAMATKAN POW**.

```
        ┌─────────────────────────────────────────────────────┐
        │                  1 PUTARAN LOOP                      │
        │                                                      │
   maju → ▶  scan layar (musuh? POW? hazard? amplop?)          │
        │      │                                               │
        │      ├─ musuh → TEMBAK / LOMPATi / TIARAP di bawah    │
        │      │           peluru → musuh mati → +skor + juice  │
        │      │                                               │
        │      ├─ POW (kurir) → dekati / tembak ikatan →        │
        │      │           RESCUE → amplod 💌 terbang ke HUD →   │
        │      │           unlockInfo(key) → ikon section nyala │
        │      │                                               │
        │      ├─ crate senjata → TEMBAK → drop H/S/F/R → ambil │
        │      │                                               │
        │      └─ hazard (jurang/api) → LOMPAT / hindar         │
        │      │                                               │
        │      ▼                                               │
        │   checkpoint → boss sektor → kalahkan → STAGE CLEAR   │
        │      │                                               │
        └──────┴──────────────► sektor berikutnya ─────────────┘
                                       │
                  semua POW diselamatkan ATAU boss final kalah
                                       ▼
                       KLIMAKS: selamatkan mempelai → BUKA UNDANGAN
```

**Ritme mikro (per ~3 detik):** *ancaman muncul → respons (tembak/hindar) → feedback (juice) →
napas singkat*. Ritme makro (per stage): *Start→Teach→Practice→Test→Reward(POW)→Boss→Clear*.

> **GOLDEN RULE §2:** Tiap putaran loop harus menghasilkan **feedback dalam 2 frame**. Aksi tanpa
> reaksi = loop mati.

---

# §3. WORLD / LEVEL STRUCTURE

**Skala koordinat:** world 540×960 logis. **Tile virtual = 30px** (18 kolom × 32 baris layar).
Side-scroll horizontal: kamera mengikuti player ke kanan; world tiap stage **lebar 5400–7200px**
(180–240 tile) = ±4–6 layar.

**Anatomi satu stage (template pacing):**

```
[START SAFE]→[TEACH]→[PRACTICE]→[TEST/GAUNTLET]→[REWARD/POW]→[CHECKPOINT]→[BOSS ARENA]→[CLEAR]
   ~600px      ~900px    ~1200px      ~1500px         (POW di       (mid)        ~900px
  no enemy   1 mekanik  ulang+risiko  puncak musuh    sepanjang)
```

- **START SAFE ZONE (≥600px / 20 tile):** tanpa musuh & jurang. Ruang kosong di kiri + scenery di
  kanan → isyarat "maju ke kanan" tanpa teks (metode Mario 1-1).
- **Goal/Boss area:** arena horizontal 900px terkunci (kamera berhenti) saat boss aktif.
- **Kepadatan:** jarak antar-encounter ≥ **1.0× lebar layar (540px)** di stage awal, mengetat ke
  ~0.6× di stage akhir.
- **Vertikalitas:** platform 2–3 lapis; ketinggian lompat (lihat §4) menentukan jangkauan.

**Aturan keadilan penempatan:**
- **Section inti undangan di stage awal.** `hero`, `schedule`, `rsvp` (info acara terpenting)
  diselamatkan di **Stage 1–2** → tamu yang berhenti di tengah tetap dapat info pokok (lihat §6.5
  SKILL / APPENDIX W).
- **POW (kepingan) ≠ powerup ofensif** — tidak memberi buff gameplay (jaga loop koleksi terpisah).

> **GOLDEN RULE §3:** Tiap stage punya **start safe zone ≥20 tile** dan **minimal 1 checkpoint
> sebelum boss**. Tidak ada boss tanpa checkpoint di depannya.

---

# §4. PLAYER SYSTEM

**Arsitektur:** `class Player extends Phaser.Physics.Arcade.Sprite`. Tambahkan ke
`scene.physics.add.existing(this)`; `setCollideWorldBounds(true)`.

### 4.1 State Machine

```
        ┌──────────────────────────────────────────────┐
        │                                              │
   ┌─► IDLE ─(move)─► RUN ─(jump)─► JUMP ─(apex)─► FALL ─┤
   │    │  ▲           │  ▲           │                 │
   │  (down)│        (down)│       (land)               │
   │    ▼  │           ▼  │           ▼                 │
   │  PRONE─┘        (shoot overlays any ground state)  │
   │                                                    │
   │  ── HURT (i-frame) ◄─ damage ─ from any state      │
   │  ── DEAD ◄─ hp<=0 / pit / one-hit (NORMAL+)        │
   │  ── RIDE_SLUG ◄─ enter SV-001 (overrides movement) │
   └────────────────────────────────────────────────────┘
```

State: `idle, run, jump, fall, prone, hurt, dead, ride_slug`. **SHOOT bukan state** — ia aksi
overlay (boleh menembak sambil idle/run/jump/prone). Arah tembak dari input (lihat 4.4).

### 4.2 Fisika (angka konkret — frame @60fps, gravity world y=1400)

| Parameter | Nilai | Catatan |
|---|---|---|
| `RUN_SPEED` | **220 px/s** | kecepatan lari penuh |
| `RUN_ACCEL` | **1800 px/s²** | akselerasi (momentum ringan, ~0.12s ke top speed) |
| `RUN_DRAG` | **2200 px/s²** | deselerasi saat lepas tombol |
| `GRAVITY_Y` | **1400 px/s²** | world gravity |
| `JUMP_VELOCITY` | **-560 px/s** | tinggi lompat ≈ 112px (≈ 3.7 tile) |
| `JUMP_CUT` | **0.45** | variable jump: lepas tombol → `vy *= 0.45` |
| `COYOTE_MS` | **90ms** (~5.4 frame) | masih bisa lompat 90ms setelah lepas tepi |
| `JUMP_BUFFER_MS` | **100ms** (~6 frame) | tekan lompat 100ms sebelum mendarat tetap kebaca |
| `PRONE_HEIGHT` | **50%** body | tiarap → hitbox setengah, peluru horizontal lewat di atas |
| `MAX_FALL` | **900 px/s** | terminal velocity (anti tembus lantai) |
| `INVULN_MS` | **1200ms** | i-frame setelah kena (blink), hanya di EASY/cheat |

**Lompat:** pakai `Phaser.Input.Keyboard.JustDown` (edge), konsumsi coyote agar **tak ada double
jump**. Variable height via `JustUp` + `vy<0` → `vy *= JUMP_CUT`.

### 4.3 Nyawa / death model
- **NORMAL/HARD:** klasik Metal Slug **one-hit death** (kena peluru/musuh/jurang → mati 1×), tapi
  punya **stok nyawa** (default 3) + respawn di checkpoint terakhir.
- **EASY:** **2-hit** (ada i-frame `INVULN_MS`), nyawa 5. (downgrade kesulitan, lihat §8.)
- **CHEAT:** invincible total (lihat APPENDIX Y).
- Respawn: muncul di checkpoint, **tanpa spawn-kill** (musuh di radius 300px di-freeze 1s saat
  respawn).

### 4.4 Input abstraction & arah tembak
Map keyboard **dan** touch ke satu model:
```
input = { left, right, up, down, jump, fire, special, board }
```
- **Keyboard:** `←/→` atau `A/D` gerak; `↑/W` aim-up; `↓/S` prone/aim-down; `Space/Z` lompat;
  `X/J` tembak (hold = auto-fire MG); `C/K` granat (`special`); `E` masuk/keluar Slug (`board`).
- **Touch:** D-pad kiri (kiri/kanan + up/down untuk aim), tombol kanan **FIRE** (besar) +
  **JMP** + **GRENADE** kecil. Tahan-tekan FIRE = auto-fire.
- **Arah tembak (Metal Slug-style, bukan full 8-arah Contra):** horizontal default; `up` →
  tembak atas; `up+arah` → diagonal 45°; `prone` → tembak horizontal sambil rendah. (Metal Slug
  klasik: 8 arah lewat kombinasi; kita pakai 5 arah utama: ←,→,↑,↗,↘ untuk kesederhanaan mobile.)

### 4.5 Melee & granat (otentik Metal Slug)
- **Granat:** lempar parabola (busur), AoE radius 60px, **stok terbatas** (default 10), reload
  via crate. SFX + flash. Granat = senjata utility, bukan kepingan.
- **Melee (knife/tendang):** saat musuh **berdekatan ≤40px**, tekan FIRE → serangan jarak-dekat
  instan (1 hit). Beri window agar tamu tak mati saat musuh menempel.

> **GOLDEN RULE §4:** Semua angka fisika ada di **satu config object**. Jangan sebar konstanta.
> Lompat & kontrol harus terasa *responsif* (coyote 90ms + buffer 100ms wajib).

---

# §5. ENEMY / OBSTACLE SYSTEM

**Pooling wajib:** semua musuh & peluru dari `physics.add.group({classType, maxSize, runChildUpdate:true})`.
`get()` selalu null-check.

### 5.1 Palet musuh (Metal Slug reskin — jenaka, bertema "penghalang menuju pelaminan")

| ID | Nama | HP | Perilaku | Telegraph | Threat |
|---|---|---|---|---|---|
| `E001` | **Rebel Mantan** (rusher) | 1 | jalan ke player, mati 1-hit | jalan pelan, siluet jelas | rendah (mook) |
| `E002` | **Penghulu Galau** (ranged) | 1 | berhenti, tembak lurus | angkat tangan 0.6s + flash | sedang |
| `E003` | **Turret Drama** (statik) | 3 | menara, tembak burst 3 | moncong merah 0.7s | sedang |
| `E004` | **Drone Gosip** (terbang) | 2 | sinus melayang, jatuhkan bom | dengung + bayangan bom | sedang |
| `E005` | **Tank Mertua** (heavy) | 8 | maju lambat, meriam parabola | laras naik 1.0s + bunyi | tinggi |
| `H001` | **Jurang Keraguan** (pit) | — | jatuh = mati | tepi terlihat saat takeoff | hazard |
| `H002` | **Api Cemburu** (flame jet) | — | semburan periodik | celah 1.2s sebelum nyala | hazard |

**Aturan palet (run-and-gun sweet spot):**
- **Maks 2 tipe musuh per wave**, hard-cap 3. Selalu campur **≥1 ranged + 1 rusher**.
- Mook (`E001`,`E002`) mati **1 hit**; hanya `E005` (tank) yang tahan lama & **ber-telegraph**.
- **Silhouette terbaca** dari jauh sebelum beraksi.

### 5.2 Wave shape
- **Fight normal: TRIANGLE** — mulai 1 musuh, tiap sub-wave +1, puncak, lalu reda. Spawn dari
  **tepi layar arah gerak** (kanan), jarak spawn ≥ **1.5× lebar layar di depan** (≥810px) → tak
  ada "muncul di wajah".
- **Menuju mini-boss/boss: DIAMOND** — fodder banyak → lebih sedikit tapi kuat → 1 elite/tank.
- **3–5 puncak per stage**; mini-boss di tengah stage.

### 5.3 AI state machine (contoh `E002` ranged)
```
SPAWN → APPROACH (jalan ke jarak tembak ~300px)
      → AIM (telegraph 0.6s: angkat tangan + flash)
      → FIRE (1 peluru lurus, reactable speed 260px/s)
      → COOLDOWN (1.2s) → AIM …   (mati 1 hit kapan pun)
```

### 5.4 Bullet rules
- Semua peluru musuh **ber-telegraph & reactable**: kecepatan ≤ **300px/s** (pemain bisa
  hindar/tiarap). Tidak ada peluru lebih cepat dari reaksi (~250ms).
- Peluru di-pool; cull saat keluar `worldView` (`setActive(false).setVisible(false)`).

> **GOLDEN RULE §5:** ≤2 tipe musuh/wave, ≥1 ranged, mook 1-hit, spawn ≥1.5× layar di depan,
> semua peluru ber-telegraph. Wave normal = triangle; menuju boss = diamond.

---

# §6. INTERACTION & COLLISION MATRIX

`collider` = deteksi + separasi (lantai/platform/dinding). `overlap` = deteksi saja (pickup/
trigger/damage). Process-callback untuk one-way platform.

| A ↓ \ B → | Platform | Enemy body | Enemy bullet | POW/Amplop | Weapon crate | Pit/Flame | Player bullet |
|---|---|---|---|---|---|---|---|
| **Player** | collide (stand) | overlap → **damage** | overlap → **damage** | overlap → **rescue/unlock** | overlap → **pickup weapon** | overlap → **death** | — |
| **Player bullet** | collide → despawn | overlap → **damage enemy** | — | overlap → **rescue POW** (tembak ikatan) | overlap → **buka crate** | collide → despawn | — |
| **Enemy** | collide | — | — | — | — | collide (some) | (kena player bullet) |
| **Grenade** | bounce→explode | AoE damage | — | AoE rescue | AoE buka | — | — |

**Aturan damage & i-frame:**
- Player kena → **HURT** state. NORMAL: langsung mati (kurangi nyawa, respawn). EASY/cheat:
  i-frame `INVULN_MS=1200ms` (blink, kebal sementara).
- **Player bullet vs POW = rescue** (bisa juga overlap tubuh = rescue). Jadi tamu bisa
  menyelamatkan POW dengan **menembak tali pengikat** *atau* menyentuhnya (dua jalur, sesuai
  Metal Slug).

> **GOLDEN RULE §6:** Collide untuk yang harus berhenti, overlap untuk yang harus memicu. POW
> punya **dua jalur rescue** (tembak ATAU sentuh) supaya tak pernah mustahil diraih.

---

# §7. POWER-UP / WEAPON SYSTEM

Senjata = item **gameplay** (BUKAN kepingan undangan). Diturunkan dari **weapon crate** (kotak
kayu/peti) yang **ditembak** → menjatuhkan ikon huruf (H/S/F/R), atau dari beberapa POW (sebagian
POW memberi senjata alih-alih kepingan — sesuai Metal Slug; tapi POW "kurir undangan" selalu beri
kepingan, lihat APPENDIX W).

### 7.1 Weapon triangle (coverage ↔ damage ↔ rate)

| Kode | Senjata | Damage | Rate | Coverage | Ammo | Catatan |
|---|---|---|---|---|---|---|
| `P` | **Pistol** (default) | 1 | sedang | single lurus | ∞ | senjata dasar; **mati = balik ke pistol** |
| `H` | **Heavy MG** | 1 | **sangat cepat** | sempit lurus | 200 peluru | "Heavy Machine Gun" — DPS tinggi, jangkauan sempit |
| `S` | **Shotgun** | 3 | lambat | **kerucut lebar** | 30 | one-shot grup mook & vehicle (3–5 hit) |
| `F` | **Flame Shot** | 2/tick | sedang | semburan area | 30 | bakar musuh, area pendek |
| `R` | **Rocket Launcher** | 8 | **lambat** | proyektil besar | 10 | paling kuat per tembakan, lambat |

**Aturan inti (risk/reward Metal Slug):**
- **Mati → senjata turun ke Pistol** (ammo special hangus). Ini jantung tegangan run-and-gun.
- Cap proyektil simultan per senjata (mis. MG ≤ 12 di layar) demi performa.
- Ammo special habis → auto balik Pistol.

### 7.2 Powerup Relevance Rule (usage-window — wajib)
- Tiap senjata ofensif yang di-drop harus punya **≥1 kesempatan pakai** (≥1 musuh/segmen
  berbahaya) **sebelum** mencapai goal/checkpoint berikutnya. Powerup ofensif **dilarang** ditaruh
  di segmen terakhir tanpa musuh atau tepat sebelum Goal.
- Bila secara level tak ada musuh sesudah titik itu → ganti drop dengan **reward pasif**
  (skor / granat / nyawa). *Useful > Reachable.*

### 7.3 SV-001 "Slug" (kendaraan ikonik)
- Muncul ≥1× per 2 stage di posisi tertentu (`board` untuk masuk). Saat dikendarai:
  - **Vulcan 360°** (rapid, arah ikut aim), **cannon** parabola (granat-vehicle), bisa **gilas**
    mook.
  - **HP kendaraan** (mis. 6) terpisah; rusak → keluar paksa, player kembali rentan.
- Slug = **breather + power fantasy** setelah gauntlet berat. Letakkan setelah spike kesulitan.

> **GOLDEN RULE §7:** Mati = pistol. Tiap senjata ofensif punya usage-window sebelum goal.
> Kepingan undangan **tidak pernah** jadi powerup ofensif.

---

# §8. DIFFICULTY SCALING

Tiga preset = **knobs**, bukan level berbeda. Dipilih di cover (PRESS START) & bisa diubah cheat.

| Knob | EASY | NORMAL | HARD |
|---|---|---|---|
| Death model | 2-hit + i-frame | one-hit | one-hit |
| Nyawa awal | 5 | 3 | 2 |
| Enemy density | ×0.7 | ×1.0 | ×1.4 |
| Enemy bullet speed | ×0.8 | ×1.0 | ×1.2 |
| Telegraph (wind-up) | +0.2s | baseline | -0.1s (min tetap ≥0.4s) |
| Checkpoint | tiap segmen | tiap stage tengah | hanya awal stage |
| POW (kepingan) | identik di semua | identik | identik |

> **Kepingan/POW TIDAK terpengaruh kesulitan** — undangan sama lengkapnya di EASY/HARD. Yang
> berubah hanya tantangan game.

**Kurva (sawtooth / peak-and-valley):** jangan ramp lurus. Tiap stage: naik ke puncak (gauntlet/
mini-boss) → **lembah breather** (Slug / koridor aman / POW reward) → naik lebih tinggi (boss).
Antar-stage tren naik; tiap akhir spike beri napas.

```
difficulty
  ^            boss            BOSS
  |         /\   /\          /\  FINAL
  |     /\ /  \ /  \   /\   /  \  /\
  |  /\/  V    V    \ /  \ /    \/  \
  | /  breather      V    V          \___ (clear)
  +----------------------------------------> progress
```

> **GOLDEN RULE §8:** Kesulitan = knob, bukan konten. Kurva sawtooth, bukan tanjakan lurus.
> Koleksi undangan kebal terhadap kesulitan.

---

# §9. CAMERA & READABILITY

- **Follow + lerp:** `cameras.main.startFollow(player, true, 0.12, 0.12)` (lerp ~0.1 cepat).
  **Deadzone** horizontal ~120px supaya jitter kecil tak menggoyang kamera.
- **Lookahead:** geser kamera **+80px ke arah hadap** player (lihat musuh datang lebih awal).
- **Bounds:** `cameras.main.setBounds(0,0, stageWidth, 960)`; saat boss → kunci bounds ke arena.
- **No blind jump:** pendaratan tiap lompatan **terlihat saat takeoff** (jangan loncat ke layar
  belum ke-scroll). Lookahead membantu ini.
- **Readability rules:** telegraph semua hazard; siluet musuh unik; foreground parallax **tidak**
  menutupi gameplay (alpha rendah / di belakang).

> **GOLDEN RULE §9:** Kamera melihat **sedikit ke depan** arah gerak. Tak pernah ada lompatan ke
> area yang belum terlihat.

---

# §10. GAME FEEL / JUICE

Stack **semua** efek di **frame impact yang sama**. Juice menghias feedback, **tidak** mengubah
hitbox/simulasi.

| Event | Freeze | Shake (`camera.shake`) | Flash | Partikel (API 3.60+) | SFX |
|---|---|---|---|---|---|
| Tembak (pistol) | — | — | muzzle 1f | percikan kecil 3 | pew (pitch ±2 st) |
| Musuh mati (mook) | 2 frame | 0.008, 100ms | putih 1f | ledakan 8 | pop |
| Tank/boss kena | 3–4 frame | 0.02, 150ms | putih 2f | 12 | thud |
| Player kena (death) | 5 frame | 0.04, 220ms | **merah** 2f | 16 | hit + jingle kalah |
| Rescue POW (amplop) | 3 frame | — | **cyan** 2f | hati/bintang 14 + amplop tween ke HUD | jingle ceria |
| Boss phase-change | 6 frame | 0.03, 200ms | putih 3f | 20 | roar |
| Ledakan granat | 4 frame | 0.025, 180ms | oranye 2f | 18 | boom |

**Detail terukur:**
- **Hit-pause:** normal 2–4 frame; berat 5–8 frame; **cap 0.5s**. Bekukan attacker+victim
  (set `body.enable=false` sesaat / pause tween) lalu lanjut.
- **Screen shake (trauma model):** simpan `trauma∈[0,1]`, hit kecil `+=0.2`, ledakan `+=0.5`,
  clamp 1, decay linear ~0.5–1s, terapkan `intensity = (trauma²)×0.04` ke `camera.shake`.
- **Squash & stretch player** saat mendarat: tinggi→80% lebar→125%, ease balik ~120ms + overshoot.
- **SFX pitch-vary ±1–3 semitone** pada bunyi berulang (3–5 varian).
- **Partikel WAJIB API 3.60+:** `this.add.particles(x,y,key,{...})` → `ParticleEmitter`;
  `em.explode(n,x,y)`. **JANGAN** `createEmitter()` (di-hapus 3.60, throw di 3.80.1).

> **GOLDEN RULE §10:** Stack shake+freeze+flash+partikel+SFX di frame impact. Aksi sering = juice
> kecil; event langka (boss/rescue) = juice besar.

---

# §11. AUDIO DESIGN

- **SFX game = milik tema**, dimainkan via **Web Audio** (oscillator/buffer) atau `this.sound`.
  Kategori: `jump, shoot(per-weapon), hit, enemyDie, rescue, weaponPickup, grenade, bossHit,
  phaseChange, win, lose`.
- **Pitch-vary** ±1–3 semitone untuk bunyi berulang (tembak/mati).
- **Backsound undangan = MILIK HOST.** Tema **DILARANG** `audio.play()` link backsound tenant.
  Host (`InvitationPage`) yang memutar (hanya saat `isPlaying && isOpened`). Tema hanya boleh klik
  `#btn-toggle-music` & **mirror** ikon (lihat APPENDIX Z — mirror harus idempotent).
- **Win music** saat klimaks = **SFX game internal** (jingle kemenangan), **bukan** backsound
  tenant. Boleh fanfare prosedural pendek.

> **GOLDEN RULE §11:** Tema memutar SFX-nya sendiri; backsound undangan **tak pernah** disentuh
> tema. Win-fanfare = audio game, bukan backsound tenant.

---

# §12. ANTI-FRUSTRATION RULES

1. **Coyote time 90ms + jump buffer 100ms** (sudah di §4) — wajib.
2. **Corner-correction ~6px:** kepala nyangkut sudut platform saat lompat → geser halus, jangan
   mentok.
3. **No spawn-kill:** setelah respawn/checkpoint, musuh radius 300px **freeze 1s** + tak ada peluru
   aktif mengenai 0.5s pertama.
4. **No mandatory-hidden:** kepingan undangan **tak boleh** wajib di jalur rahasia tersembunyi yang
   tak terlihat. Boleh ada rahasia *opsional* (filler skor), tapi kepingan inti selalu di jalur
   utama / terlihat.
5. **Telegraph hazard pertama setelah checkpoint** — hazard mematikan pertama sesudah checkpoint
   harus ber-wind-up jelas (tamu baru "bangun").
6. **No instakill lookalike:** objek yang tampak sama berperilaku sama (api selalu bahaya, amplop
   selalu baik).
7. **Auto-aim assist ringan (opsional EASY):** snap arah tembak ke musuh terdekat dalam ±10°
   (mengurangi frustrasi aim di mobile).

> **GOLDEN RULE §12:** Kalau pemain mati & merasa "itu bukan salahku", sebuah aturan §12 dilanggar.

---
---

# APPENDIX A — PATTERN LIBRARY

Katalog **30 pola ber-ID** untuk membangun stage run-and-gun. Prefix: `T`=terrain/platform,
`E`=encounter musuh, `H`=hazard, `R`=reward/POW, `B`=mini-boss/boss-lead. Tile = 30px; layar =
18×32 tile. ASCII: `█`=solid, `▒`=platform one-way, `_`=tanah, ` `=udara, `x`=jurang, `P`=POW,
`▲`=hazard, `e`=mook, `t`=turret/ranged, `T`=tank, `d`=drone, `□`=crate senjata, `S`=Slug,
`→`=arah maju, `▣`=checkpoint, `BOSS`=boss gate.

### TERRAIN (T)
- **T001 Flat Run** — `________________` lantai datar 6–10 tile. *Purpose:* ruang napas/onboarding.
  *Rule:* selalu jadi start-safe-zone. *Chain:* awali stage; jangan >12 tile (membosankan).
- **T002 Single Gap** — `____x___` jurang 2–4 tile (≤ D_max). *Rule:* gap pertama ≤ **40% D_max**
  (≤ ~2 tile). Pendaratan ≥2 tile lebar. *Chain:* setelah T001.
- **T003 Stair Up** — platform menanjak `▒` tiap +1 tile. *Rule:* naik 1 tier kesulitan (lompat
  naik lebih sulit). *Chain:* sebelum vantage/turret.
- **T004 Stair Down** — turun bertahap; aman, pacing turun. *Chain:* setelah spike.
- **T005 Pillar Gauntlet** — pilar `█` selang-seling dengan celah. *Rule:* celah ≤ 60–75% D_max.
- **T006 Двух-Level (two-lane)** — jalur atas `▒` + bawah `_`; pemain pilih risiko/reward.
  *Rule:* jalur atas = lebih bahaya + reward (crate/POW).
- **T007 Bridge Collapse** — jembatan runtuh setelah dipijak 0.5s. *Telegraph:* retak + getar.
- **T008 Vantage Ledge** — tonjolan tinggi tempat turret `t` bertengger. *Rule:* beri cover bawah.

### ENCOUNTER (E)
- **E001 Lone Rusher** — 1×`e` jalan ke player. *Purpose:* teach "tembak". *Failure-proof* di
  kemunculan pertama.
- **E002 Rusher Pair** — 2×`e` jarak 3 tile. *Rule:* triangle awal.
- **E003 Ranged + Cover** — 1×`t` di ledge + 1×`e` rusher. Campur ranged+rusher (sweet spot).
- **E004 Turret Lane** — `t` di vantage menembak koridor. *Rule:* sediakan tiarap/cover; telegraph
  0.7s.
- **E005 Drone Drop** — 1–2×`d` sinus + bom. *Rule:* bayangan bom di tanah (telegraph).
- **E006 Triangle Wave** — `e→e e→e e e` spawn bertahap dari kanan, puncak 3, reda. ≤2 tipe.
- **E007 Pincer** — musuh dari kiri & kanan (1+1). *Rule:* hanya setelah pemain paham aim 2 arah;
  beri ruang tengah.
- **E008 Diamond (boss-lead)** — fodder banyak → 2 ranged → 1 `T` tank elite. Menuju gate boss.
- **E009 Suppressing Turret + Rush** — `t` menahan sementara `e` mendekat. *Rule:* klasik
  cover-fire; jangan >3 entitas.
- **E010 Tank Roadblock** — 1×`T` (8hp) memblok jalan, telegraph meriam 1.0s. Mid-stage spike.

### HAZARD (H)
- **H001 Pit Single** — `x` jurang mematikan. *Rule:* tepi terlihat saat takeoff (no blind).
- **H002 Pit Series** — `x_x_x` jurang+pijakan berirama. *Rule:* pijakan ≥2 tile; ritme konsisten.
- **H003 Flame Jet** — `▲` semburan periodik (nyala 1s / jeda 1.5s). Telegraph celah 1.2s.
- **H004 Crusher/Press** — penekan turun-naik (opsional Slug stage). Telegraph bayangan.
- **H005 Pit + Turret** — jurang dijaga turret seberang. *Rule:* HARD only; sediakan ritme aman.

### REWARD / POW (R)
- **R001 POW Safe** — `P` di lantai datar tanpa musuh (start-safe). *Purpose:* teach rescue.
  **Selalu kepingan pertama stage.**
- **R002 POW Guarded** — `P` di belakang 1 rusher/turret. *Rule:* rescue setelah bereskan 1 musuh.
- **R003 POW Ledge** — `P` di `▒` atas (butuh lompat). *Rule:* jalur terlihat, bukan rahasia.
- **R004 POW + Crate** — `P` dekat `□` crate senjata (rescue + upgrade). Sebelum gauntlet.
- **R005 Weapon Crate Lone** — `□` digantung; tembak → drop H/S/F/R. *Relevance Rule:* ada musuh
  sesudahnya.
- **R006 Slug Bay** — `S` SV-001 parkir. *Rule:* taruh **setelah** spike (breather power-fantasy);
  ada gauntlet sesudahnya agar Slug berguna.
- **R007 Coin/Medal Trail** — jejak medali (filler skor) mengikuti footprint POW yang tak terpakai
  (isi quota kosong; lihat APPENDIX X).

### BOSS LEAD (B)
- **B001 Checkpoint Gate** — `▣` checkpoint + arena menyempit. Sebelum boss.
- **B002 Boss Arena Lock** — kamera kunci, dinding kiri muncul, `BOSS` masuk dari kanan.
- **B003 Mini-boss Mid** — tank besar/elite di tengah stage (bukan boss final).

### Pattern Chain Rules
- **Jangan >3 pola encounter sama berturut-turut** (variasi mencegah bosan/predictable).
- **Hazard berturut maks 2** sebelum disela terrain aman (T001/T004).
- **Tiap gauntlet (E006/E008) didahului ≥1 napas** (T001/R-series) dan **diakhiri reward**.
- **POW (R001–R004)** disebar mengikuti quota stage (APPENDIX X), **bukan** ditumpuk.
- **Slug (R006)** maks 1 per stage, hanya setelah spike.

### Level Generation Formula (% pola per difficulty, per stage)

| Pola | EASY | NORMAL | HARD |
|---|---|---|---|
| Terrain napas (T001/T004) | 35% | 25% | 18% |
| Encounter ringan (E001–E003) | 30% | 28% | 22% |
| Encounter berat (E006–E010) | 10% | 22% | 35% |
| Hazard (H001–H005) | 8% | 12% | 18% |
| Reward/POW (R-series) | 17% | 13% | 7% (POW tetap, filler turun) |

> **GOLDEN RULE A:** Bangun stage dari pola ber-ID, bukan tile-by-tile ad-hoc. Tiap gauntlet
> dibungkus napas-sebelum & reward-sesudah. POW selalu di jalur terlihat.

---

# APPENDIX B — ENTITY ENCYCLOPEDIA

Tiap entity: spec `yaml`, state machine, kill condition, collision.

### B.1 Player
```yaml
id: player
hp: { easy: 2, normal: 1, hard: 1 }   # one-hit kecuali easy
lives: { easy: 5, normal: 3, hard: 2 }
speed: 220            # px/s top
accel: 1800
jump_velocity: -560
gravity: 1400
states: [idle, run, jump, fall, prone, hurt, dead, ride_slug]
weapons: [P, H, S, F, R]   # default P; mati → P
invuln_ms: 1200       # easy/cheat only
collide: [platform]
overlap: [enemy(dmg), enemy_bullet(dmg), pow(rescue), crate(pickup), pit(death), flame(death)]
```

### B.2 Enemies
```yaml
- id: E001_rebel_mantan      # rusher mook
  hp: 1
  speed: 90
  ai: [spawn, approach, contact_damage, die]
  telegraph: walk_silhouette
  kill: player_bullet | melee | grenade | slug_run_over
  reward_on_kill: score 100

- id: E002_penghulu_galau    # ranged
  hp: 1
  speed: 60
  ai: [spawn, approach(300px), aim(0.6s), fire(1 bullet 260px/s), cooldown(1.2s)]
  telegraph: raise_arms + flash
  kill: 1 hit

- id: E003_turret_drama      # static turret
  hp: 3
  speed: 0
  ai: [idle, detect, aim(0.7s), burst(3 bullets), reload(1.5s)]
  telegraph: muzzle_glow_red
  weakness: top/side (lompati lalu tembak)

- id: E004_drone_gosip       # flying
  hp: 2
  speed: 120
  ai: [sine_hover, drop_bomb(telegraph shadow), repeat]
  telegraph: hum_sfx + bomb_shadow

- id: E005_tank_mertua       # heavy
  hp: 8
  speed: 40
  ai: [advance, aim_cannon(1.0s), lob_shell(parabola), recover(1.0s)]
  telegraph: barrel_raise + sfx
  weakness: cockpit flash window during recover

- id: H001_pit / H002_flame  # hazard (bukan entity hidup)
  damage: instant_death
  telegraph: visible_edge / 1.2s pre-flame gap
```

### B.3 POW / Amplop (kepingan — entity koleksi, DETAIL di APPENDIX W/X)
```yaml
id: pow_kurir
hp: invulnerable        # tak bisa mati; hanya di-rescue
bound: true             # terikat; tembak ikatan ATAU sentuh = rescue
on_rescue:
  - unlockInfo(section_key)     # key ditentukan deterministik dari stage (APPENDIX X)
  - amplop_tween_to_hud
  - sfx_rescue + flash_cyan + particles(hearts)
  - toast("Kepingan <judul> didapat!")
  - NO auto-open modal
not_a_weapon: true      # tidak memberi buff gameplay
```

### B.4 Weapon crate
```yaml
id: weapon_crate
hp: 1
on_destroy: drop one of [H,S,F,R]  # weighted by stage; respects Relevance Rule
collide: platform (jatuh kalau digantung)
```

### B.5 SV-001 Slug
```yaml
id: slug
hp: 6
enter: 'board' input saat overlap
weapons: { vulcan: 360deg rapid, cannon: parabola }
abilities: [run_over_mook, jump]
on_destroyed: eject_player (player rentan lagi)
```

> **GOLDEN RULE B:** Setiap entity punya HP, telegraph, kill-condition, & collision eksplisit.
> POW selalu `invulnerable` + dua jalur rescue + `not_a_weapon`.

---

# APPENDIX C — BIOME / STAGE LIBRARY

6 stage = 6 "sektor" perjalanan menuju pelaminan. Tiap stage: palet visual, enemy pool, pattern
priority, physics modifier, difficulty antar-stage. **Section inti undangan di stage awal.**

| Stage | Nama sektor | Palet | Enemy pool | Pattern priority | Physics mod | POW (kepingan tipikal) |
|---|---|---|---|---|---|---|
| **1** | **Markas Latih** (jungle camp) | hijau/khaki, langit pagi | E001, E002, crate | T001/E001/R001 (teach) | normal | `hero`, `couple` |
| **2** | **Kota Tua** (urban ruins) | abu/oranye senja | E001–E003, drone | E003/E004/H001 | normal | `rsvp`, `schedule` |
| **3** | **Jembatan Sungai** | biru/teal, air | E002–E004, H001/H002 | H002/T002/E006 | angin dorong ±20px/s | `streaming`/`story` (flag) |
| **4** | **Gurun Konvoi** (Slug stage) | pasir/emas | E001,E005 tank, Slug | R006/E010/E008 | panas (visual heat) | `gallery`/`happiness` (flag) |
| **5** | **Pangkalan Musuh** | metalik gelap | E003,E004,E005 | E008/H003/E010 | gravitasi normal, sempit | `wishes` |
| **6** | **Markas Pelaminan** (boss) | merah-emas, pita | semua + BOSS | B001/B002/D-phases | arena lock | `gift`(flag), `closing` |

**Aturan biome:**
- **Physics modifier ringan** (angin Stage 3, pasir Stage 4) menambah variasi tanpa mengubah
  kontrol inti. Modifier ≤ **10%** efek (jangan bikin kontrol terasa "rusak").
- **Enemy pool naik bertahap:** Stage 1 cuma mook+ranged; tank (`E005`) baru muncul Stage 4;
  Stage 5–6 paling padat.
- **Pattern priority** mengikuti Level Generation Formula (APPENDIX A) per difficulty.
- **POW mapping dinamis** — tabel di atas adalah *tipikal*; pemetaan riil dihitung dari **section
  yang benar-benar ada** (APPENDIX W/X), bukan hardcode.

> **GOLDEN RULE C:** Sektor naik kesulitan & kepadatan bertahap. Modifier fisika ≤10%. Section
> inti (`hero/rsvp/schedule`) selalu di Stage 1–2.

---

# APPENDIX D — BOSS / CLIMAX SYSTEM

**Boss final (Stage 6):** **"Jenderal Pembatal Nikah"** — bos besar yang menyandera kedua
mempelai. Mengalahkannya = **menyelamatkan mempelai** = klimaks undangan.

### D.1 Arena rules
- Kamera **kunci** ke arena 900px (bounds di-set ulang). Dinding kiri muncul (no mundur).
- Mempelai (`groom_nickname`/`bride_nickname`) tampak **tersandera di kandang** di latar — visual
  goal yang konstan (motivasi).
- Lantai datar + 2 platform `▒` untuk reposisi/menghindar.

### D.2 Phase system (3 fase, threshold HP)

```
PHASE 1 (HP 100→66%): "Tembakan Drama"
  - attack A: burst peluru lurus 3× (telegraph 0.6s, moncong merah)
  - attack B: lob granat parabola (bayangan target di tanah, 0.8s)
  - safe window (recovery): 1.0s setelah attack B → tembak weak point (dada berkilau)

PHASE 2 (HP 66→33%): "Amukan" — EVOLUSI moveset, bukan mekanik baru
  - attack A dipercepat (telegraph 0.5s), burst 5×
  - tambah: drone gosip dipanggil 2× (E004) — fodder
  - safe window menyempit → 0.8s
  - transisi ditandai: flash putih 3f + freeze 6f + roar (beat)

PHASE 3 (HP 33→0%): "Putus Asa"
  - sweep flame jet melintang (telegraph 1.2s, ada celah aman 1 tile)
  - rocket barrage (3 roket, telegraph laras 1.0s)
  - safe window 0.75s (cukup 1–2 hit senjata cepat / 1 rocket player)
  - HP rendah → bos berkedip, minta "ampun" (komedi Metal Slug)
```

### D.3 Telegraph & weakness (fairness)
- **Min tell 0.5s**, makin lethal makin panjang (flame sweep 1.2s). Channel: pose + flash + SFX.
- **Weakness window (recovery) ≥ 0.75s** Phase 3, 1.0s Phase 1 → punishable (cukup untuk hit/
  heal). Weak point = **dada berkilau jelas**, bukan pixel-hunt.
- Tiap fase **mempersempit safe-window** (eskalasi), tapi **tak pernah** menghapus telegraph.

### D.4 Mid-boss (tiap stage 2–5)
Mini-boss lebih kecil (tank elite `E005`+ / turret-cluster), 1 fase, telegraph 0.7s, weak point
jelas. Mengakhiri stage; **tidak** memberi kepingan (kepingan dari POW, bukan dari menamatkan
stage).

### D.5 Victory sequence (selamatkan mempelai)
1. Boss HP 0 → **freeze 8f + flash putih + shake 0.04** + ledakan besar (partikel 24).
2. Kandang mempelai pecah → sprite `groom`/`bride` keluar, animasi senang.
3. **Beat meriah ±4.5s** (fireworks + jingle kemenangan game, **bukan** backsound tenant) +
   confetti.
4. Lalu dialog happy-ending (lihat APPENDIX Z celebration) → CTA **Buka Undangan**.

> **GOLDEN RULE D:** 3 fase via threshold HP, eskalasi dengan **mengevolusi** moveset (bukan
> menempel mekanik asing), telegraph tak pernah hilang, weak window punishable. Boss = ujian semua
> verb. Menang = mempelai selamat + undangan tak pernah terkunci.

---

# APPENDIX E — VALIDATOR ENGINE

Sebelum sebuah stage dianggap "siap", jalankan checklist + scoring. (Pola Mario APPENDIX F.)

### E.1 Playability checklist (semua harus PASS)
```
[ ] goalReachable        : ada jalur dari spawn ke boss-gate (tanpa lompatan > D_max)
[ ] allPiecesReachable   : tiap POW di stage berada di jalur utama/terlihat (no mandatory-hidden)
[ ] noSoftlock           : tak ada area yang menjebak pemain (pit tanpa respawn checkpoint)
[ ] noImpossibleJump     : tiap gap wajib ≤ D_max; gap pertama ≤ 40% D_max
[ ] noSpawnKill          : tak ada musuh/peluru aktif di radius 300px checkpoint saat respawn
[ ] noBlindJump          : pendaratan terlihat saat takeoff (lookahead cukup)
[ ] telegraphAll         : setiap musuh/boss/hazard ber-wind-up ≥0.5s (≥0.4s HARD)
[ ] weaponUsable         : tiap weapon drop punya ≥1 musuh sesudahnya sebelum goal (Relevance Rule)
[ ] checkpointBeforeBoss : ada ≥1 checkpoint sebelum tiap boss
[ ] coreSectionsEarly    : hero/rsvp/schedule (jika ada) berada di Stage 1–2
[ ] hostIdsIntact        : ID host verbatim ada di #inv-source (APPENDIX Z)
[ ] sectionWrappedByFlag : {{#if}} membungkus <section>, bukan isinya
```
Jika ada FAIL → **regenerate/fix** segmen terkait lalu validasi ulang (loop).

### E.2 Scoring (0–100, lulus ≥80)
```
playable   (0–25): goalReachable + noSoftlock + noImpossibleJump + noSpawnKill
fun        (0–20): variasi pola (≤3 sama berturut), 3–5 puncak/stage, kurva sawtooth
fair       (0–25): telegraphAll + noBlindJump + weaponUsable + coyote/buffer ada
rewarding  (0–15): tiap interaksi pertama me-reward; POW juice lengkap; filler skor mengisi quota
discovery  (0–15): POW reachable & dinamis; rahasia opsional ada; klimaks selamatkan mempelai
TOTAL = sum; PASS bila ≥80 DAN tidak ada checklist E.1 yang FAIL.
```

### E.3 Cheat-bypass audit (blind spot berulang — lihat memory retromario-debugging)
```
[ ] cheat invincible TIDAK bocor ke mode normal setelah toggle-off
[ ] unlocked (kepingan) persist; cheat flag default TIDAK persist
[ ] reload setelah cheat → game kembali "jujur", tapi kepingan tetap kebuka
[ ] stage-select via cheat TIDAK menggandakan kepingan (mapping deterministik dari stage, bukan counter)
[ ] celebration guard (announcedAll/completed) persist & tak terulang saat re-inject
```

> **GOLDEN RULE E:** Stage tidak "selesai" sampai lulus checklist E.1 (semua PASS) **dan** skor
> ≥80 **dan** audit cheat-bypass bersih.

---

# APPENDIX F — GENERATION ALGORITHM

Langkah deterministik membangun satu stage (dipakai Tahap 2 / saat menambah stage baru).

### F.1 Build pipeline
```
1. BUILD SPINE
   - tentukan panjang stage (180–240 tile) & posisi: start-safe, checkpoint(s), boss-gate.
   - letakkan lantai dasar T001 di start (≥20 tile, no enemy).

2. ASSIGN POW QUOTA (kepingan)
   - scan #inv-source → daftar section riil (APPENDIX W).
   - distribusi quota per-stage shape [Q1..Q6] (APPENDIX X), sum = jumlah section.
   - map stage→section DETERMINISTIK (slice kontigu INFOS), bukan counter berjalan.

3. FILL PATTERNS
   - sepanjang spine, tempel pola dari APPENDIX A mengikuti Level Generation Formula (% per diff).
   - sisipkan napas (T001/T004) sesuai Chain Rules; jangan >3 encounter sama berturut.

4. PLACE ENTITIES
   - POW (R001–R004) sesuai quota stage, di jalur terlihat; POW pertama stage = R001 (safe).
   - musuh per wave: ≤2 tipe, ≥1 ranged, triangle normal / diamond menuju boss.
   - weapon crate (R005) hanya bila ada musuh sesudahnya (Relevance Rule).
   - Slug (R006) maks 1, setelah spike.
   - filler medali (R007) mengisi quota POW yang kosong (footprint sama).

5. VALIDATE (APPENDIX E)
   - jalankan checklist E.1 + scoring E.2 + audit E.3.

6. FIX LOOP
   - untuk tiap FAIL: terapkan perbaikan minimal (mis. lebarkan pendaratan, tambah telegraph,
     pindah weapon drop) → ulang langkah 5 sampai PASS.
```

### F.2 Master instruction (untuk meng-generate stage baru di Tahap 2)
> "Bangun Stage N sektor `<nama>` sepanjang `<len>` tile. Mulai start-safe ≥20 tile. Ambil section
> riil dari `#inv-source`, alokasikan POW sesuai quota `[Q...]`, map deterministik. Isi spine
> dengan pola APPENDIX A pada rasio `<diff>` (Formula), patuhi Chain Rules. Tempel musuh: ≤2
> tipe/wave, ≥1 ranged, triangle/diamond menuju boss. Weapon crate hanya bila ada musuh
> sesudahnya. Validasi dengan APPENDIX E sampai semua PASS & skor ≥80. Tidak ada kepingan di jalur
> tersembunyi wajib. Telegraph semua. Output: array data-driven (spine + entity list) untuk
> di-render Phaser, bukan hardcode posisi tersebar."

> **GOLDEN RULE F:** Spine dulu → quota POW → pola → entity → validasi → fix-loop. Pemetaan
> stage→kepingan **deterministik dari nomor stage**, tak pernah dari counter berjalan.

---
---

# APPENDIX S — SINGLE-FILE ARCHITECTURE

Tema = **3 file** (`index.html` + `index.css` + `index.js`), tanpa bundler/module. Semua JS
dibungkus host dalam **IIFE**. Walau monolitik, pisahkan **lapisan logis** dalam IIFE:

```
IIFE
 ├─ CONFIG            // semua angka (fisika, knobs, quota, warna) — TIDAK tersebar
 ├─ ensurePhaser()    // fallback load Phaser 3.80.1 dari CDN bila window.Phaser absen
 ├─ showError(msg)    // pesan on-screen → "Phaser gagal" beda dari "logic bug"
 ├─ bootGame()        // ukur parent via getBoundingClientRect, width/height TETAP
 ├─ class Player extends Phaser.Physics.Arcade.Sprite
 ├─ class StateMachine
 ├─ Weapon / weapon table (P/H/S/F/R)
 ├─ EnemyManager      // spawn / pool / AI
 ├─ pools: bullets, enemyBullets, particles, enemies, pows, crates
 ├─ class Boss        // 3-phase
 ├─ class SlugVehicle
 ├─ WeddingLayer      // scan #inv-source, unlockInfo, modal, reveal (APPENDIX W/X)
 ├─ HostBridge        // music mirror, RSVP/ucapan/QR wiring (APPENDIX Z)
 ├─ Cheat             // toggle, persist policy (APPENDIX Y)
 ├─ UI/HUD            // nyawa, skor, indikator kepingan, tombol
 └─ cleanup (window.__gwCleanup)  // teardown idempotent (APPENDIX T §cleanup)
```

**Aset:** **procedural** via `graphics.generateTexture` (reliabel, bebas CORS, kohesif). Sprite
eksternal HANYA dari CDN terbukti CORS-ok, **selalu fallback procedural** — **jangan pernah
blank**. Gaya pixel-art "terinspirasi" Metal Slug, **bukan rip** art berhak cipta.

**Config terpusat (data-driven):**
```js
const CONFIG = {
  W: 540, H: 960, TILE: 30,
  player: { run: 220, accel: 1800, drag: 2200, jump: -560, jumpCut: 0.45,
            coyoteMs: 90, bufferMs: 100, gravity: 1400, maxFall: 900, invulnMs: 1200 },
  diff: { easy:{hits:2,lives:5,density:0.7,bulletSpd:0.8}, normal:{hits:1,lives:3,density:1.0,bulletSpd:1.0},
          hard:{hits:1,lives:2,density:1.4,bulletSpd:1.2} },
  weapons: { P:{dmg:1,rate:280,proj:'single'}, H:{dmg:1,rate:80,ammo:200,proj:'mg'},
             S:{dmg:3,rate:520,ammo:30,proj:'cone'}, F:{dmg:2,rate:120,ammo:30,proj:'flame'},
             R:{dmg:8,rate:700,ammo:10,proj:'rocket'} },
  quotaShape: [3,3,2,2,1,0],   // per-stage POW quota; sum di-scale ke jumlah section riil
  storeKey: 'msw_v1',          // localStorage versioned
};
```

> **GOLDEN RULE S:** Satu file, lapisan logis jelas, **satu** config object. `ensurePhaser` +
> `showError` + ukur-parent wajib ada sebelum boot.

---

# APPENDIX T — TECHNICAL FOUNDATION (PHASER 3.80.1)

Fakta API terverifikasi. **Landmine terbesar: Particle Emitter API ditulis-ulang di 3.60.**

### T.1 Boot aman (anti "ukuran 0")
```js
function bootGame() {
  const stage = document.getElementById('gw-stage');
  const r = stage.getBoundingClientRect();
  const W = Math.max(320, Math.round(r.width));
  const H = Math.max(480, Math.round(r.height));   // ukuran TETAP untuk menata world
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'gw-stage', width: W, height: H,
    backgroundColor: '#16202a',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    physics: { default:'arcade', arcade:{ gravity:{ y: CONFIG.player.gravity }, debug:false } },
    scene: [BootScene, GameScene, UIScene],
  });
  disposers.push(() => game.destroy(true));   // async, next frame
  window.__gwGame = game;
}
```
> ⚠️ **JANGAN** baca `this.scale.width/height` di `create()` dengan `Scale.RESIZE` — bisa `0` →
> objek lahir off-screen → blank. Tata world dengan `W/H` tetap dari `getBoundingClientRect()`.
> Pakai `Scale.FIT` (letterbox, jaga aspect).

### T.2 Scene lifecycle
`init(data)` → `preload()` → `create(data)` → `update(time, delta)`. Pakai `delta` (ms) agar
frame-rate-independent. HUD overlay via `scene.launch('UIScene')` (paralel) + `registry`/events
untuk komunikasi.

### T.3 Arcade physics — platformer movement
```js
update(time, delta){
  const b = this.player.body, onGround = b.blocked.down;      // === onFloor()
  this.coyote = onGround ? CONFIG.player.coyoteMs : Math.max(0, this.coyote - delta);
  if (Phaser.Input.Keyboard.JustDown(this.keys.jump) && this.coyote > 0){
    b.setVelocityY(CONFIG.player.jump); this.coyote = 0;       // consume → no double jump
  }
  if (Phaser.Input.Keyboard.JustUp(this.keys.jump) && b.velocity.y < 0){
    b.setVelocityY(b.velocity.y * CONFIG.player.jumpCut);      // variable jump
  }
}
```
- **collider** (deteksi+separasi) untuk platform/dinding; **overlap** (deteksi saja) untuk
  pickup/trigger/damage. Process-callback (arg ke-4) untuk one-way platform (return false buang
  pasangan).
- `staticGroup()` untuk platform (immovable, murah; `refresh()` bila dipindah). `physics.add.group()`
  dynamic untuk musuh/peluru.
- `body.blocked.{down,...}` = kontak world/static/tilemap; `body.touching.{...}` = kontak dynamic
  body. `onFloor() ⇔ blocked.down`. Lompat pakai `JustDown/JustUp` (edge), bukan `isDown`.

### T.4 Object pooling
```js
this.bullets = this.add.group({ classType: Bullet, maxSize: 40, runChildUpdate: true });
const b = this.bullets.get();              // SELALU null-check (return null saat penuh)
if (b) b.fire(x, y, dirX, dirY);
// killAndHide(child) = setActive(false).setVisible(false) → kembali ke pool
```
Set `maxSize` nyata (jangan -1). Untuk arcade body, reset `body.enable`/velocity saat reuse.
Pooling wajib untuk bullet/enemy/particle (hindari GC hitch).

### T.5 Procedural texture (guard restart!)
```js
function makeTex(scene, key, w, h, draw){
  if (scene.textures.exists(key)) return;          // guard: create() bisa jalan lagi
  const g = scene.make.graphics({ x:0, y:0 }, false);
  draw(g); g.generateTexture(key, w, h); g.destroy();
}
makeTex(this,'player',24,30, g=>{ g.fillStyle(0x4fd1c5,1); g.fillRect(0,0,24,30); });
```

### T.6 Input (keyboard + virtual joystick)
- `this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,SPACE,X,C,E')` atau `createCursorKeys()`.
- Touch: tombol HTML di overlay (di luar canvas) → set flag input `{left,right,up,down,jump,fire}`.
  Atau plugin rexVirtualJoystick (pin versi CDN) → bentuk `{up,down,left,right}` sama → OR dengan
  keyboard. **Input abstraction**: gabung jadi satu model.

### T.7 Animation / tween / camera / PARTICLES (API 3.60+!)
```js
this.tweens.add({ targets: sprite, x: tx, duration: 600, ease:'Power2', yoyo:true });
this.cameras.main.shake(150, 0.02);                 // intensity = float kecil, BUKAN piksel
this.cameras.main.flash(80, 255, 240, 180);
// ✅ Partikel 3.80.1:
const em = this.add.particles(0,0,'spark',{ speed:{min:-200,max:200}, scale:{start:0.6,end:0},
  lifespan:600, blendMode:'ADD', emitting:false });
em.explode(16, x, y);
// ❌ JANGAN: this.add.particles('spark').createEmitter({...})  → DIHAPUS 3.60, throw di 3.80.1
```

### T.8 Performance (60fps mobile)
- Tilemap auto-cull; **sprite biasa TIDAK** → matikan manual off-screen (`setActive/Visible(false)`).
- Cap partikel aktif ~**100**; prefer `explode()` ketimbang flow tinggi; reuse 1 emitter.
- `render:{ pixelArt:true, antialias:false, roundPixels:true }`. Target memori < 150MB.

### T.9 Cleanup & destroy (KRITIKAL — script di-re-inject host berkali-kali)
```js
(function () {
  if (typeof window.__gwCleanup === 'function'){ try{ window.__gwCleanup(); }catch(e){} }
  const disposers = [];
  function addGlobal(t,type,fn,opt){ t.addEventListener(type,fn,opt);
    disposers.push(()=>t.removeEventListener(type,fn,opt)); }

  class GameScene extends Phaser.Scene {
    create(){
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.time.removeAllEvents(); this.tweens.killAll();
        this.input.keyboard.removeAllKeys(true);
      });
      // ... boot, addGlobal(window,'resize',onResize) ...
    }
  }
  // ... ensurePhaser(() => bootGame()) ...
  window.__gwCleanup = function(){
    disposers.forEach(d=>{ try{ d(); }catch(e){} }); disposers.length = 0;
    if (window.__gwGame){ window.__gwGame.destroy(true); }  // async; cegah canvas/WebGL numpuk
    window.__gwGame = null; window.__gwCleanup = null;
  };
})();
```
> **`game.destroy(true)`** (removeCanvas=true) wajib: cegah `<canvas>` & WebGL context numpuk
> (browser cap ~16 context). `destroy()` **async** (set `pendingDestroy`, jalan next frame) — bila
> butuh boot sinkron, pakai `game.events.once('destroy', boot)`.

### T.10 Gotcha box (taruh sebagai peringatan)
1. Partikel: `add.particles(x,y,key,cfg)` → `ParticleEmitter`; `createEmitter()` **throw**.
2. `camera.shake` intensity = float kecil (~0.02), **bukan piksel**.
3. Tilemap auto-cull; sprite biasa tidak.
4. `game.destroy(true)` wajib re-inject; `destroy()` async.
5. `onFloor() ⇔ blocked.down`; lompat pakai `JustDown/JustUp`.
6. Procedural texture bentrok saat restart → guard `textures.exists(key)`.
7. "Ukuran 0 saat init" bila container host belum ter-size → ukur via `getBoundingClientRect()`.

> **GOLDEN RULE T:** Semua contoh = Phaser 3.80.1 yang benar. Cleanup hook idempotent +
> `game.destroy(true)` adalah syarat hidup tema yang di-re-inject host.

---
---

# APPENDIX W — WEDDING INTEGRATION (section → kepingan)

**Sumber binding TUNGGAL:** `#inv-source` — semua `<section data-info="<key>">` ditulis **sekali**
dengan `{{vars}}`. Binding hidup **hanya di sini**. Modal & reveal **meng-clone** dari sini.

### W.1 11 section, variabel, flag pembungkus (verifikasi ke dynamic-variables.md)

| # | `data-info` | Variabel utama | Flag pembungkus `<section>` | Selalu ada? |
|---|---|---|---|---|
| 1 | `hero` | `groom_nickname`,`bride_nickname`,`wedding_date`,`quote`,`quote_by`,`photo_hero_cover` | — | ✅ |
| 2 | `couple` | `groom_name`,`bride_name`,`photo_groom_photo`,`photo_bride_photo`,`nama_bapak_laki_laki`,`nama_ibu_laki_laki`,`nama_bapak_perempuan`,`nama_ibu_perempuan`,`ig_laki_laki`,`ig_perempuan` | ortu: `flag_tampilkan_nama_orang_tua`; sosmed: `flag_tampilkan_sosial_media_mempelai` (di DALAM section, bukan membungkus) | ✅ |
| 3 | `rsvp` | `countdown_hari/jam/menit/detik`, form RSVP (id host) | — | ✅ |
| 4 | `schedule` | `tanggal_akad`,`jam_akad`,`nama_lokasi_akad`,`keterangan_lokasi_akad`,`akad_map` (+ `*_resepsi`) | resepsi: `flag_lokasi_akad_dan_resepsi_berbeda` (di dalam) | ✅ |
| 5 | `streaming` | `link_live_streaming` | `is_fitur_live_streaming` | flag |
| 6 | `story` | `{{#each timeline_kisah}} this.tanggal/judul/deskripsi {{/each}}` | `flag_pakai_timeline_kisah` | flag |
| 7 | `gallery` | `{{#each galleries}} this.url {{/each}}` | `has_gallery` | flag |
| 8 | `happiness` | `sample_story_1..3`,`frame_balasan_instagram`,`link_balasan_instagram` | `flag_pakai_additional_feature_story_balasan_instagram` | flag |
| 9 | `wishes` | form ucapan (id host) + `{{#each wishes}} this.guest_name/guest_message/guest_comment_time {{/each}}` | — | ✅ |
| 10 | `gift` | `bank_1`,`rek_1`,`nama_rek_1`(+`_2`),`gambar_qris_rekening_1/2`,`alamat_lokasi_kirim_hadiah_offline` | `tampilkan_amplop_online` (membungkus); di dalam: `flag_pakai_2_rekening`,`flag_pakai_qris_rekening_1/2`,`flag_kirim_hadiah_offline` | flag |
| 11 | `closing` | `kalimat_penutup`,`site_name`,`site_url` | — | ✅ |

> ⚠️ **`{{#if}}` membungkus `<section>`, BUKAN isinya** (host-contract). Salah taruh = section
> kosong tetap di DOM → **kepingan hantu** → `allInfoUnlocked()` tak pernah lengkap.
> ```html
> {{#if has_gallery}}<section data-info="gallery"> … </section>{{/if}}   <!-- BENAR -->
> <section data-info="gallery">{{#if has_gallery}} … {{/if}}</section>   <!-- SALAH -->
> ```
> **Pengecualian:** flag yang bukan penentu keberadaan section (mis. `flag_tampilkan_nama_orang_tua`
> di dalam `couple`, `flag_lokasi_akad_dan_resepsi_berbeda` di dalam `schedule`) boleh di **dalam**
> section — karena section-nya (`couple`/`schedule`) **selalu ada**.

### W.2 Cara baca variabel (golden pattern)
Beri tiap elemen yang dibaca JS **dua hal**: `data-var="<key>"` (kunci internal, BUKAN diproses
parser) **dan** teks `{{<key>}}` (diisi parser). Helper:
```js
function val(k, fb){
  const el = document.querySelector('[data-var="'+k+'"]');
  const v = el ? (el.textContent||'').trim() : '';
  if (!v || v.indexOf('{{') === 0) return fb || '';   // var tak ter-resolve → fallback
  return v;
}
// contoh: <span data-var="groom_nickname">{{groom_nickname}}</span> → val('groom_nickname','Mempelai')
```
Untuk URL gambar (`photo_*`) baca dari `src`/`data-src` elemen, bukan textContent.

### W.3 Scan section riil (jumlah kepingan dinamis — JANGAN hardcode)
```js
const INFOS = Array.from(document.querySelectorAll('#inv-source > section[data-info]'))
  .map(s => ({ key: s.dataset.info, title: SECTION_TITLE[s.dataset.info] || s.dataset.info, el: s }));
const N = INFOS.length;   // jumlah kepingan & ikon indikator = N (3..11), bukan angka tetap
```
`SECTION_TITLE` = peta `data-info → judul Indonesia` ("hero"→"Pembuka", "rsvp"→"Konfirmasi",
"schedule"→"Acara", "gift"→"Amplop", dst.) untuk label indikator & toast.

### W.4 Aturan penempatan kepingan
- **Reachable & terlihat** (no mandatory-hidden) — POW di jalur utama.
- **Section inti di stage awal:** `hero`, `schedule`, `rsvp` (jika ada) di **Stage 1–2** (info acara
  terpenting tetap didapat bila berhenti di tengah).
- **Kepingan ≠ powerup ofensif** (tidak memberi buff). POW invulnerable, dua jalur rescue.
- **Satu sumber binding** (`#inv-source`); modal/reveal clone dari sini, jangan duplikasi `{{vars}}`.

> **GOLDEN RULE W:** Jumlah kepingan = hasil scan `#inv-source` (dinamis 3–11), bukan hardcode.
> `{{#if}}` membungkus `<section>`. Section inti di stage awal. Binding hidup sekali.

---

# APPENDIX X — COLLECTION MECHANIC

### X.1 Bentuk kepingan (run-and-gun)
Kepingan = **POW kurir undangan** (tahanan berjanggut Metal Slug, di-reskin) yang **terikat**.
Rescue dengan **menembak ikatan** (player bullet overlap) **atau menyentuh** (player overlap) —
dua jalur (§6). Saat rescue, ia menyerahkan **amplop 💌** yang **terbang ke HUD** (tween).

### X.2 Quota per-stage + auto-scale
```js
// quotaShape default (6 stage): [3,3,2,2,1,0]  (sum = 11 = semua section ada)
// auto-scale saat section dikurangi flag (N < 11): redistribusi PROPORSIONAL ke shape sama
function buildQuota(N){
  const shape = CONFIG.quotaShape;                 // [3,3,2,2,1,0]
  const base = shape.reduce((a,b)=>a+b,0);         // 11
  // skala tiap stage proporsional, lalu koreksi pembulatan agar sum == N
  let q = shape.map(s => Math.round(s * N / base));
  let diff = N - q.reduce((a,b)=>a+b,0);
  for (let i=0; diff!==0; i=(i+1)%q.length){        // sebar sisa pembulatan dari stage awal
    if (diff>0){ q[i]++; diff--; } else if (q[i]>0){ q[i]--; diff++; }
  }
  return q;   // mis. N=7 → ~[2,2,1,1,1,0]
}
```
- **Distribusi bertahap**: lebih banyak di stage awal (gradual discovery), bukan menumpuk di akhir.
- **JANGAN hardcode total 11.** Selalu dari `N` hasil scan.

### X.3 Pemetaan stage→kepingan DETERMINISTIK (slice kontigu)
```js
// map stage i → potongan INFOS, bukan counter berjalan (anti cheat stage-jump / replay desync)
function infosForStage(stageIndex, quota){
  let start = 0;
  for (let i=0;i<stageIndex;i++) start += quota[i];
  return INFOS.slice(start, start + quota[stageIndex]);   // section persis untuk stage ini
}
```
Karena slice dari nomor stage, lompat-stage (cheat) / replay **tidak** menggandakan/men-desync
kepingan.

### X.4 Respons saat rescue (NO auto-open)
```js
function rescuePOW(pow){
  unlockInfo(pow.key);                       // catat di unlocked Set + localStorage
  lightIndicator(pow.key);                   // ikon section menyala + clickable
  flyAmplopToHUD(pow.x, pow.y);              // tween amplop → slot HUD
  sfx('rescue'); flashCyan(); particlesHearts(pow.x, pow.y);
  toast('Kepingan "'+titleOf(pow.key)+'" diselamatkan!');
  // ❌ JANGAN buka modal otomatis — memutus gameplay. Tamu klik ikon sendiri saat ingin baca.
  if (allInfoUnlocked()) announceAllCollected();   // pemicu celebration #1 (APPENDIX Z)
}
```

### X.5 Modal kepingan & reveal penuh (clone dari #inv-source)
```js
// klik ikon-i (yang sudah menyala) → modal berisi konten section itu
function openPieceModal(key){
  const src = document.querySelector('#inv-source > section[data-info="'+key+'"]');
  modalBody.innerHTML = '';                   // bersihkan
  modalBody.appendChild(src.cloneNode(true)); // CLONE — {{vars}} cukup ada sekali di source
  rewireHostFormsInside(modalBody);           // bila section punya form host (rsvp/wishes) → re-wire
  showModal();
}
// "Buka Undangan" (semua kepingan / cheat) → reveal SEMUA section berurutan di container scroll
function revealFullInvitation(){
  scrollContainer.innerHTML = '';
  INFOS.forEach(info => scrollContainer.appendChild(info.el.cloneNode(true)));
  rewireHostFormsInside(scrollContainer);
  showInvitationScroll();                      // section scroll vertikal DI DALAM frame
}
```
> Karena form host (RSVP/ucapan) di-clone, **re-wire** tombol di dalam clone agar tetap memanggil
> fungsi global host (APPENDIX Z). ID host tetap verbatim di clone.

### X.6 Filler skor untuk quota kosong
Slot quota yang tak terisi kepingan (mis. stage tanpa section) **jangan kosong** — isi **jejak
medali** (R007) dengan footprint sama (skor saja, bukan kepingan), agar level tetap padat.

> **GOLDEN RULE X:** Quota auto-scale dari N riil, mapping deterministik per stage (slice), rescue
> = nyala+toast+juice **tanpa auto-open**, modal/reveal **clone** dari `#inv-source`.

---

# APPENDIX Y — CHEAT SYSTEM

Satu flag `cheat`, dua ranah efek.

### Y.1 Efek
```
CHEAT ON:
  Undangan:  semua kepingan ter-unlock (unlocked = semua key INFOS) → semua ikon nyala;
             tombol "Buka Undangan" langsung aktif.
  Gameplay:  player invincible (kebal peluru/musuh/jurang); stage-select terbuka (akses semua
             stage tanpa menamatkan sebelumnya); bebas ganti kesulitan.
CHEAT OFF (toggle balik): tantangan kembali (invincible mati). unlocked TETAP (sudah kebuka).
```

### Y.2 Persist policy (keputusan sadar — default JANGAN persist cheat)
- **`unlocked` (kepingan) DI-PERSIST** → tamu yang buka via cheat tetap bisa lihat undangan setelah
  reload.
- **`cheat` flag DEFAULT TIDAK DI-PERSIST** → reload mengembalikan game ke **mode jujur** (pola
  retromario). Mem-persist cheat = device selamanya "mode mudah" (buruk bila 1 HP dipakai banyak
  tamu). *Default: jangan persist; kalau ragu, jangan.*
- **`announcedAll`/`completed` (guard celebration) DI-PERSIST** (beda dari cheat) agar perayaan tak
  terulang saat re-inject.

### Y.3 Skor saat cheat
- Saat `cheat` ON, **skor dibekukan** (tidak nambah) → leaderboard/skor jujur tak ternoda.

### Y.4 Reset progress (tombol terpisah + konfirmasi overlay)
- Tombol reset **terpisah** dari cheat. Klik → **overlay konfirmasi sendiri** (BUKAN `confirm()`
  native) → hapus `unlocked`/progress di `localStorage` (`CONFIG.storeKey`).

### Y.5 Cheat-bypass audit (sumber bug berulang)
```
[ ] invincible benar-benar mati saat cheat OFF (tidak bocor ke normal)
[ ] kepingan via cheat = unlocked penuh, dan tetap kebuka setelah reload
[ ] stage-select cheat tidak menggandakan kepingan (mapping deterministik, APPENDIX X.3)
[ ] skor beku saat cheat; cair lagi saat OFF
```

> **GOLDEN RULE Y:** Satu flag, dua ranah. Persist `unlocked` + guard celebration; **jangan**
> persist `cheat` (default). Reset = overlay konfirmasi sendiri. Audit bypass tiap rilis.

---

# APPENDIX Z — HOST CONTRACT & WIRING

### Z.1 ID host hardcoded (VERBATIM, tanpa prefix)
`btn-show-qr`, `btn-show-menu`, `btn-toggle-music`/`btn-music`, `bg-music`, `play-icon`/`pause-icon`,
`btn-submit-ucapan`+`wish-name`+`wish-message`, RSVP `btn-submit-kehadiran`+`rsvp-status`/
`rsvp-guests`/`rsvp-code`, (opsional hadiah) `btn-submit-hadiah`+`gift-name`/`gift-amount`/`gift-bank`,
container `alert-submit-*`. **Mengubah/memberi prefix = fitur backend mati diam-diam.**

### Z.2 RSVP / ucapan — panggil fungsi global host (+ fallback)
```js
// Ucapan: input WAJIB id host (wish-name, wish-message), tombol btn-submit-ucapan
btnUcapan.addEventListener('click', () => {
  if (typeof window.submitUcapan === 'function'){ window.submitUcapan(); return; }
  // fallback optimistic: render thank-you + sisipkan ke list lokal
});
// RSVP: btn-submit-kehadiran + rsvp-status/rsvp-guests/rsvp-code
btnRsvp.addEventListener('click', () => {
  if (typeof window.submitRsvp === 'function'){ window.submitRsvp(); return; }
  // fallback lokal
});
```
Berlaku juga saat form dipanggil dari **dalam modal kepingan / reveal** (X.5 re-wire).

### Z.3 Musik — mirror IDEMPOTENT (bug mahal yang sudah dibayar)
Tema **DILARANG** `audio.play()` backsound tenant. Hanya boleh **klik `#btn-toggle-music`** &
**mirror** ikon. Bahaya: klik 2× (baca class lama sebelum React flip state) → musik mati lagi.
```js
let musicWanted = false, gen = 0;
function setMusic(want){
  musicWanted = want; const myGen = ++gen;
  const tryClick = () => {
    if (myGen !== gen) return;                       // batal bila intent berubah
    const playing = document.getElementById('pause-icon')?.style.display !== 'none';
    if (playing !== musicWanted){                    // klik HANYA bila state host masih salah
      document.getElementById('btn-toggle-music')?.click();
      setTimeout(tryClick, 250);                     // retry terjadwal (state flip async React)
    }
  };
  tryClick();
}
// mirror ikon saat host dispatch play/pause ke #bg-music (jangan andalkan class lama):
document.getElementById('bg-music')?.addEventListener('play',  () => reflectIcon(true));
document.getElementById('bg-music')?.addEventListener('pause', () => reflectIcon(false));
```
- **Countdown** (`countdown_*`) dirender host jadi `<span>` ber-ID yang di-update host tiap detik —
  **jangan** timpa innerHTML container itu lewat RAF game.
- **Win-fanfare** klimaks = SFX game internal, **bukan** backsound tenant.

### Z.4 Lightbox sendiri
Bila mau lightbox galeri, pakai **class berbeda** (`.gw-gallery-item`) — host membajak
`.gallery-item`/`.lightbox-injection`.

### Z.5 Layout 2-kolom (cover KIRI sempit + frame KANAN lebar)
```
┌──────────────┬───────────────────────────┐
│ SISI KIRI    │ SISI KANAN (lebih lebar)  │
│ (sempit)     │ frame mobile = game +     │
│ cover/welcome│ undangan(scroll), HUD,    │
│ • judul+nama │ kontrol, modal kepingan — │
│ • PRESS START│ SATU-SATUNYA area         │
│ • pilih level│ interaktif                │
│ • QR·kontrol │                           │
└──────────────┴───────────────────────────┘
```
- **Kiri (`.gw-cover`, sempit, non-interaktif):** judul "METAL SLUG WEDDING" + badge "Undangan
  Pernikahan", **nama mempelai + tanggal** (`val('groom_nickname')`/`val('bride_nickname')`/
  `val('wedding_date')`), **pilih level + PRESS START + `#btn-show-qr`**, dekorasi tema, **petunjuk
  kontrol keyboard**.
- **Kanan (`.gw-frame`, lebih lebar):** `#gw-stage` (canvas), HUD (nyawa/skor/area/progress
  kepingan), N ikon indikator, tombol (★ cheat, ▦ stage-select, 💌 buka undangan, `btn-show-qr`,
  reset), kontrol sentuh (joystick + FIRE/JMP/GRENADE), overlay (cover pilih-kesulitan, briefing,
  area-clear, rescue, win, reset-confirm, stage-select), dan **section scroll vertikal** saat
  undangan dibuka.
- `@media (min-width: 980px)` memunculkan 2 kolom; **mobile = hanya `.gw-frame`** (cover
  disembunyikan). **JANGAN 3 kolom / dekorasi identik di dua sisi.**

### Z.6 Celebration moment (2 PEMICU terpisah, beat ~5s, guard sekali-tampil)
```
PEMICU #1 — kepingan TERAKHIR didapat (allInfoUnlocked()):
  → undangan lengkap & bisa dibuka (tanpa harus tamat game).
  → announceAllCollected(): beat meriah (flash + fireworks + jingle game + toast) ~4.5s,
    LALU dialog: "Semua kepingan terkumpul! Undangan <groom_nickname> & <bride_nickname>
    siap dibuka." + CTA "Buka Undangan".

PEMICU #2 — boss final kalah (Stage 6) / selamatkan mempelai:
  → cerita tamat ("happily ever after").
  → bossFinale(): victory sequence (APPENDIX D.5) ~4.5s, LALU dialog happy-ending:
    rangkum skor/stage + CTA "Buka Undangan". PASTIKAN semua kepingan ter-unlock saat menang.

Keduanya bisa terjadi di URUTAN MANA PUN (kepingan dulu, atau bersamaan di stage akhir).
Desain tahan kedua urutan.
```
- **Beat ±4.5–5s SEBELUM dialog** (`setTimeout`): screen flash + fireworks/partikel + **SFX
  kemenangan game (BUKAN backsound tenant)** + toast. Jangan munculkan dialog seketika.
- **Dialog wajib pakai nama mempelai DINAMIS** (`val('groom_nickname')` dst.), bukan hardcode, +
  CTA Buka Undangan.
- **Guard di-persist** (`announcedAll`, `completed`) → perayaan tak terulang saat reload/re-inject.
- Saat menang, **pastikan SEMUA kepingan ter-unlock** → undangan tak pernah terkunci dari detail
  asli.

### Z.7 Re-inject reality
JS tema di-inject ulang **tiap** `jsBase`/`isOpened`/`htmlBase` berubah **dan tiap tamu submit
ucapan/RSVP/hadiah** (host recompute HTML). Cleanup hook (`__gwCleanup`, APPENDIX T.9) **wajib
idempotent**; state penting di `localStorage`.

> **GOLDEN RULE Z:** ID host verbatim, panggil fungsi global host + fallback, mirror musik
> idempotent (intent+generation guard), `{{#if}}` membungkus `<section>`, layout 2-kolom (cover
> kiri/frame kanan), celebration 2-pemicu dengan beat ~5s & guard persist.

---
---

# §VERIFIKASI (untuk Tahap 2)

Cara memverifikasi 3 file saat di-generate nanti — **ada jebakan di mesin ini**:

- **Screenshot headless Chrome TIDAK bekerja di mesin ini** — selalu blank, **jangan dipercaya**.
- **Cara benar:** paste 3 file ke **Theme Editor** host (`ThemeEditorPage.tsx`) lalu buka preview,
  **atau** minta user mencoba.
- **Logika game/loop** boleh diuji via **harness Node headless** yang menjalankan loop asli dengan
  RAF di-stub (bukan memanggil fungsi step langsung).
- **Selalu sediakan `showError()`** on-screen agar "Phaser gagal load" beda dari "logic bug"
  (keduanya sama-sama blank canvas).
- **Waspada cheat-mode bypass** (kepingan/kebal bocor ke normal) — audit APPENDIX E.3/Y.5. Lihat
  memory `retromario-debugging`.

---

# §CHECKLIST BIBLE "SELESAI" (self-check)

- [x] Mengikuti kerangka `bible-template.md` — §0–§12 + APPENDIX A–F + S/T + W–Z ada.
- [x] Spesifik-arketipe Metal Slug (POW-rescue, weapon H/S/F/R, SV-001 Slug, one-hit death, boss
      3-fase) — bukan generik.
- [x] Pattern library ≥20 pola (**30**: T/E/H/R/B) + chain rules + generation formula.
- [x] Entity encyclopedia (player, 7 musuh+hazard, POW, crate, Slug) dengan spec yaml.
- [x] Biome/stage library (6 sektor) + boss phase system (3 fase, threshold HP).
- [x] Validator engine (checklist + scoring ≥80) + generation algorithm (spine→quota→fill→validate→fix).
- [x] Aturan **ber-angka** (fisika, juice frame, telegraph detik, quota) dari `game-feel...md`.
- [x] Contoh kode **Phaser 3.80.1 benar** (partikel API 3.60+, `game.destroy(true)`, `blocked.down`,
      guard `textures.exists`).
- [x] Variabel undangan **terverifikasi** ke `dynamic-variables.md` (tak ada karangan).
- [x] APPENDIX W–Z lengkap: kepingan reachable & dinamis, quota auto-scale, mapping deterministik,
      cheat bypass, celebration 2-pemicu, layout 2-kolom, mirror musik idempotent, `{{#if}}`
      membungkus `<section>`, ID host verbatim.
- [x] Tiap bagian besar punya **Golden Rule**.
- [x] Disimpan di `src/sample-theme/metalslug-wedding/METALSLUG_WEDDING_BIBLE.md`.

> **Tahap 1 selesai.** Bible ini siap dipakai (panggilan terpisah) untuk men-generate
> `index.html` + `index.css` + `index.js` di Tahap 2.
