# PIXEL WEDDING RUN — GAME DESIGN BIBLE

> **Tema undangan pernikahan berbasis game platformer 16-bit.**
> Engine: **Phaser 3.80.1** · Arsitektur: single-file (3 file tema) · Arketipe: **platformer
> eksplorasi** (referensi kanonik: Super Mario Bros. World 1-1).
>
> **Dokumen ini adalah SUMBER KEBENARAN** untuk tahap-2 (generate `index.html` + `index.css` +
> `index.js`). Semua angka di sini sudah dikalibrasi — jangan ganti dengan tebakan.

---

## ⚖️ §0.0 PERNYATAAN ORISINALITAS ASET (BACA PERTAMA — NON-NEGOTIABLE)

Tema ini **terinspirasi** oleh platformer era 16-bit dan **meminjam MEKANIK** dari repo
open-source [`Tyrone2333/phaser3-mario`](https://github.com/Tyrone2333/phaser3-mario).
Yang diambil dan yang **DILARANG** diambil:

| Diambil ✅ (mekanik — tidak dilindungi hak cipta) | DILARANG ❌ (ekspresi — milik Nintendo) |
|---|---|
| Konstanta fisika (gravity 300, speed 150, jump 210) | Sprite Mario / Luigi / Goomba / Koopa |
| Pola perilaku musuh (patroli, balik di dinding, stomp) | Tileset & atlas dari `/resource` repo itu |
| Struktur cangkang (squish → fly → recover) | Nama karakter Nintendo apa pun |
| Aritmetika kamera (`startFollow` offsetY 100) | Logo, font judul, jingle, ikon khas |
| Tween blok dipukul (y−8, 100ms, Quintic, yoyo) | Karakter "tukang ledeng berkumis bertopi M" |
| Pacing & beat-sheet level (SMB 1-1) | Desain siluet 1:1 dari karakter Nintendo |

**ATURAN KERAS untuk tahap-2:**

1. **Karakter yang dimainkan = MEMPELAI** (pria berjas, wanita bergaun). BUKAN tukang ledeng.
2. **Musuh = desain sendiri** dengan peran *fungsional* sama (patroli darat, cangkang, terbang),
   tapi **bentuk & nama orisinal** (lihat APPENDIX B). Dilarang menamai "Goomba"/"Koopa"
   di kode, komentar, aset, maupun UI.
3. **Tidak ada satu pun byte aset** dari repo sumber. Semua sprite **prosedural** (APPENDIX T)
   atau PNG buatan sendiri (APPENDIX P).
4. **Bahasa visual era 16-bit boleh** (langit biru, awan bulat, blok bata, pipa, perbukitan) —
   ini kosakata genre yang dipakai bebas oleh ratusan game indie, bukan milik satu penerbit.

> **Golden Rule §0.0:** *Kita meniru FISIKA-nya, bukan KARAKTER-nya. Kalau sebuah sprite bisa
> tertukar dengan karakter Nintendo di mata orang awam, sprite itu GAGAL dan harus digambar ulang.*

---

## §0 META & RINGKASAN

| Field | Nilai |
|---|---|
| **Nama tema** | `pixel-wedding-run` |
| **Judul in-game** | **PIXEL WEDDING RUN** |
| **Arketipe** | Platformer eksplorasi (side-scroller, maju ke kanan) |
| **Referensi kanonik** | Super Mario Bros. World 1-1 (beat-sheet §3.2) |
| **Engine** | Phaser 3.80.1, Arcade Physics |
| **Resolusi internal** | 540 × 960 (potret mobile-first) |
| **Mood pasangan** | Ceria, nostalgik, family-friendly, "perjalanan menuju pelaminan" |
| **Folder** | `src/sample-theme/pixel-wedding-run/` |
| **File output tahap-2** | `index.html`, `index.css`, `index.js` |

### Elevator pitch

> Tamu memainkan **mempelai pria** (atau wanita — bisa ditukar) yang berlari melintasi 6 stage
> bertema perjalanan cinta: dari **Taman Perkenalan** sampai **Pelaminan**. Di sepanjang jalan
> tersebar **Kotak Undangan 💌** — tiap kotak berisi satu bagian undangan (jadwal akad, lokasi,
> galeri, ucapan…). Mengambilnya menyalakan ikon di HUD; tamu memilih sendiri kapan membacanya.
> Di stage terakhir, mempelai yang satunya menunggu di pelaminan — dijaga **Sang Penjaga Waktu**
> (boss). Mengalahkannya = "happily ever after". Tamu yang tak ingin bermain cukup menekan **★**
> (cheat) untuk membuka seluruh undangan seketika.

### Daftar isi

- §0.0 Orisinalitas aset · §0 Meta · §1 Core Principles · §2 Core Loop · §3 World/Level
- §4 Player · §5 Enemy · §6 Collision Matrix · §7 Power-up · §8 Difficulty
- §9 Camera · §10 Juice & Grafis · §11 Audio · §12 Anti-Frustration
- APPENDIX A Pattern Library · B Entity Encyclopedia · C Biome Library · D Boss System
- APPENDIX E Validator Engine · F Generation Algorithm
- APPENDIX T Technical Foundation · S Architecture · P Sprite Sheet Assets
- APPENDIX W Wedding Integration · X Collection Mechanic · Y Cheat System · Z Host Contract

---

## §1 CORE PRINCIPLES

### 1.1 Playability First (game dulu, baru undangan)

**Aturan keras:** game harus tetap menyenangkan **walau seluruh lapisan undangan dilepas**.
Kalau kepingan undangan dihapus dan yang tersisa membosankan, desainnya gagal.

- ✅ BENAR: kotak undangan ditaruh di ujung rangkaian lompatan yang **sudah seru dilalui**.
- ❌ SALAH: level datar lurus, kotak undangan ditaruh tiap 300px sebagai satu-satunya daya tarik.

**WHY:** tamu menilai "wah, ini beneran game" dalam **10 detik pertama**. Kalau terasa seperti
slideshow ber-tombol, mereka menutup dan kembali scroll biasa.

### 1.2 Teach Before Test (metode 1-1)

Tiap mekanik baru diperkenalkan di zona **tak bisa gagal**, baru diuji.

| Mekanik | Diperkenalkan (fail-proof) | Diuji |
|---|---|---|
| Lari kanan | Stage 1, 0–600px: ruang kosong kiri, dekorasi menarik di kanan | — |
| Lompat | Musuh pertama jalan **pelan** ke arah pemain, tanah datar | Gap pertama |
| Pukul blok | Blok `?` pertama tepat di atas jalur lompat wajib | Blok berisi power-up |
| Injak musuh | Musuh di tanah datar, tak ada jurang di dekatnya | Musuh di dekat gap |
| Cangkang | Musuh cangkang pertama sendirian, ruang lapang | Cangkang + musuh lain |

### 1.3 Fair Challenge (ini undangan, bukan Dark Souls)

- **TANPA nyawa. TANPA game-over.** (aturan §17 hard-won)
- Kena musuh = knockback + i-frame **1000ms**, bukan mati.
- Jatuh ke jurang = respawn ke titik **aman** (mundur ~200px, bukan awal stage).
- Default difficulty = **EASY**.

**WHY:** tamu adalah ibu-ibu, om-tante, teman kantor. Mereka datang untuk undangan, bukan untuk
ditantang. Frustrasi = undangan ditutup = tujuan bisnis gagal.

### 1.4 Readability (siluet unik)

Tiap entity harus terbaca **dalam 1 frame** pada layar 540px. Aturan: siluet unik + 3 tone
(base/highlight/shadow) + outline gelap 2px. Flat single-color = belum selesai.

### 1.5 Discovery & Reward

Kotak undangan **tidak** ditaruh di jalur utama semua. Distribusi: **60% di jalur**, **40%
butuh sedikit eksplorasi** (lompat ke platform atas, masuk pipa, pukul blok tersembunyi).

**Batas keras:** kepingan **tidak boleh** membutuhkan lompatan >90% D_max atau rahasia tanpa
petunjuk visual. *Discovery ≠ tebak-tebakan.*

### 1.6 Inklusif (cheat wajib)

Satu tombol **★** membuka semua kepingan + kebal + akses semua stage. Tamu yang tak bisa/tak mau
bermain **tetap dapat undangan lengkap**. Ini bukan fitur tambahan — ini **syarat kelayakan**.

### 1.7 No Dead Air

Tidak boleh ada bentang **>0.75 layar (405px)** tanpa sesuatu yang hidup. Ditegakkan oleh
validator (APPENDIX E), bukan harapan.

> **Golden Rule §1:** *Game yang enak dimainkan tanpa undangan + undangan yang lengkap tanpa
> bermain. Dua-duanya harus benar, bukan salah satu.*

---

## §2 CORE GAMEPLAY LOOP

```
        ┌──────────────────────────────────────────────────┐
        │                                                  │
        ▼                                                  │
   ┌─────────┐   lihat    ┌──────────┐   lompat/  ┌──────────────┐
   │ BERLARI │ ────────▶  │ RINTANGAN│ ─────────▶ │  ATASI       │
   │ ke kanan│  ancaman   │ musuh/gap│   injak    │  (feedback!)  │
   └─────────┘            └──────────┘            └───────┬──────┘
        ▲                                                 │
        │                                                 ▼
        │                                          ┌─────────────┐
        │                                          │  REWARD     │
        │                                          │ koin/💌/     │
        │                                          │ power-up    │
        │                                          └──────┬──────┘
        │                                                 │
        │                        ┌────────────────────────┘
        │                        ▼
        │                 ┌─────────────┐  semua      ┌──────────────┐
        └─────────────────│ IKON HUD    │ ─terkumpul─▶│ BUKA UNDANGAN│
          lanjut          │ MENYALA     │             │  (klimaks)   │
                          └─────────────┘             └──────────────┘
```

**Verb utama:** **LOMPAT**. Semua interaksi inti melewati lompat — mengatasi gap, mengalahkan
musuh (injak), membuka blok (pukul dari bawah), meraih kepingan di platform atas.

**Satu putaran ideal = 8–15 detik:** lihat ancaman (1–2s) → posisikan & lompat (1s) → dapat
feedback (0.2s) → ambil reward (1s) → lanjut lari (4–10s).

> **Golden Rule §2:** *Satu verb, banyak konteks.* Jangan tambah verb baru (tembak/dash) — perkaya
> konteks lompatnya.

---

## §3 WORLD / LEVEL STRUCTURE

### 3.1 Dimensi & satuan

| Satuan | Nilai | Catatan |
|---|---|---|
| **TILE** | 32 px | satuan dasar semua layout |
| **BW** (viewport width) | 540 px | ≈ 16.9 tile |
| **BH** (viewport height) | 960 px | potret |
| **GROUND_Y** | `BH − (isTouch ? 200 : 150)` | = 760 (touch) / 810 (desktop) — aturan §2 hard-won |
| **Panjang stage** | 6.000–9.000 px (≈ 190–280 tile) | ≈ 11–17 layar |
| **Durasi target/stage** | 60–100 detik | sesuai SMB 1-1 (~70s) |
| **Start safe zone** | 600 px pertama | dikecualikan dari kuota musuh (bukan dari dekorasi) |

### 3.2 BEAT-SHEET REFERENSI — Super Mario Bros. World 1-1

> **Riset wajib (density-engine §7).** Sumber: Super Mario Wiki, analisis level design.
> **16 musuh darat + 1 musuh cangkang dalam ~14 cluster event** sepanjang ~11 layar.
> Inilah lantai kepadatan yang kita tiru.

| # | Posisi | Event |
|---|---|---|
| 1 | spawn | Tanah datar terbuka, ruang kosong kiri (signpost "ke kanan") |
| 2 | ~layar 1 | **Musuh pertama** jalan pelan mendekat → memaksa lompat pertama |
| 3 | layar 1 | **Blok `?` pertama** → koin (mengajari "pukul dari bawah = bagus") |
| 4 | layar 1–2 | **Formasi 6 blok** (? + bata), power-up di blok kiri |
| 5 | layar 2 | **3 pipa berurutan**, musuh di antara pipa; pipa ke-3 = area rahasia |
| 6 | layar 2–3 | Blok tersembunyi berisi **1-Up** antara pipa ke-4 & jurang pertama |
| 7 | layar 3 | **Jurang pertama** (gap) |
| 8 | layar 4 | Blok `?` berisi power-up; **deret blok panjang** + musuh jatuh dari atas |
| 9 | layar 4–5 | **Blok 10-koin** (pukul berulang); blok berisi **bintang** |
| 10 | layar 5–6 | **Musuh cangkang** muncul pertama kali + beberapa musuh darat |
| 11 | layar 6–7 | Piramida blok keras dengan **celah di tengah** |
| 12 | layar 7–8 | Piramida kedua dengan **jurang di tengah** |
| 13 | layar 9 | 2 musuh darat + deret 4 blok |
| 14 | layar 10–11 | **Tangga akhir** → **tiang bendera** (goal) |

**Yang diekstrak jadi aturan generator:**

- Musuh pertama muncul **dalam ~8 detik**, bukan menit.
- Reward pertama (koin dari blok `?`) **dalam ~10 detik**.
- **Eskalasi monoton:** musuh darat → +pipa/elevasi → +gap → +musuh dari atas → +cangkang →
  +geometri kompleks (piramida+gap) → goal.
- Rahasia (area bonus, 1-Up) ada tapi **opsional** — tak pernah memblokir progres.
- Bentuk akhir selalu **tangga naik → goal** (kemenangan terasa "naik").

### 3.3 LANTAI KEPADATAN (di-validasi, bukan diharapkan)

Per **1 segmen = 1 viewport (540px)**:

| Metrik | Lantai minimum | Kegagalan yang dicegah |
|---|---|---|
| **Max dead air** | ≤ **405 px** (0.75 layar) tanpa entity/event | "ada area kosong" |
| **Musuh/hazard aktif** | ≥ **1** (easy) · **2** (normal) · **3** (hard) | "musuh kadang ada kadang nggak" |
| **Elemen interaktif** | ≥ **2** (blok/koin/platform/pipa/musuh) | layar mati |
| **Pijakan elevasi** | ≥ **1** tiap **6–10 tile** (192–320px) | "pijakan untuk naik kurang" |
| **Parallax jauh** | ≥ **1** | — |
| **Landmark midground** | ≥ **1–2** | "dekorasi environment sepi" |
| **Prop foreground** | ≥ **2–4** (semak, batu, pagar, bunga) | idem |
| **Ambient motion** | ≥ **1** (awan jalan, air, kupu-kupu, rumput goyang) | "layar beku" |
| **Reward cadence** | koin/item tiap ≤ **1.350 px** (2.5 layar) | dopamin drop |

**Rasio tipe musuh (kalibrasi 1-1, geser per-biome):** patroli darat **~70%** · cangkang **~20%**
· terbang **~10%**. Stage awal lebih banyak patroli darat; cangkang baru muncul stage 2+.

### 3.4 Template pacing per stage

```
 0%        15%         40%          65%         85%      100%
 ├─────────┼───────────┼────────────┼───────────┼─────────┤
 │  START  │   TEACH   │  PRACTICE  │   TEST    │ REWARD  │ GOAL
 │ safe    │ mekanik   │ ulang +    │ kombinasi │ koin    │ tangga
 │ zone    │ baru      │ risiko     │ (puncak)  │ trail   │ + goal
 │ no enemy│ fail-proof│ kecil      │           │ napas   │
 └─────────┴───────────┴────────────┴───────────┴─────────┘
   kurva:    ▁▁▂        ▃▄▃▅         ▆▇█▆        ▃▂        ▁
```

**Sawtooth wajib:** tiap stage punya **2–3 puncak** dengan lembah di antaranya. Lembah **tetap
terisi** (koin trail + prop + 1 musuh pelan) — lembah ≠ kosong.

### 3.5 Struktur 6 stage (peta dunia)

| # | Nama stage | Biome | Mekanik baru | Kepingan |
|---|---|---|---|---|
| 1 | **Taman Perkenalan** | Taman siang, langit biru | lompat, injak, blok `?` | 3 |
| 2 | **Jembatan Harapan** | Sungai & jembatan kayu | gap panjang, platform bergerak | 3 |
| 3 | **Hutan Janji** | Hutan rindang, sinar sela daun | musuh terbang, pipa | 2 |
| 4 | **Bukit Restu** | Bukit senja, oranye-ungu | cangkang, platform runtuh | 2 |
| 5 | **Lorong Persiapan** | Interior, lampu gantung | ruang sempit, musuh padat | 1 |
| 6 | **Pelaminan** | Panggung pelaminan, malam berbintang | **BOSS** | 0 (klimaks) |

> Total kepingan default = **11** (= jumlah maksimal section undangan). **Angka ini WAJIB
> dinamis** — lihat APPENDIX X untuk auto-scale saat section dimatikan flag.

> **Golden Rule §3:** *Kalau sebuah segmen bisa dilewati tanpa pemain menyentuh apa pun — musuh,
> blok, lompatan, koin, atau prop bergerak — segmen itu GAGAL validator dan di-generate ulang.*

---

## §4 PLAYER SYSTEM

### 4.1 Identitas

**Karakter = MEMPELAI PRIA** (jas gelap, dasi merah muda, celana formal, rambut rapi).

> **KEPUTUSAN FINAL (dikonfirmasi user):** **SATU karakter saja**, tanpa tombol tukar ke mempelai
> wanita. Alasan: kesederhanaan — satu set sprite, satu set animasi, file lebih ringan.
> Mempelai wanita tetap muncul sebagai **karakter yang ditunggu di pelaminan** (stage 6) dan di
> **canvas couple** panel kanan desktop — jadi keduanya tetap hadir secara naratif.

> ❌ DILARANG: kumis tebal, topi merah bulat berhuruf, baju overall biru, sarung tangan putih
> besar. Kalau ragu, buat lebih formal (ini pernikahan) — jas & gaun adalah pembeda terkuat.

### 4.2 Konstanta fisika (DIAMBIL dari repo, jangan diubah)

```js
// Sumber: phaser3-mario src/index.js + src/object/Player.js
const PHYS = {
  GRAVITY_Y:      300,    // config.physics.arcade.gravity.y
  RUN_SPEED:      150,    // player.speed
  JUMP_VELOCITY:  210,    // player.jumpSpeed → body.velocity.y = -210
  // Turunan (kalibrasi platformer, bukan dari repo):
  COYOTE_MS:       85,    // ~5 frame @60fps (nilai Celeste)
  JUMP_BUFFER_MS:  85,    // ~5 frame
  CORNER_CORRECT:   4,    // px (nilai Celeste)
  INVULN_MS:     1000,    // player.setImmune(1000) di repo
  KNOCKBACK_X:    120,    // px/s — pengganti sistem nyawa
  KNOCKBACK_Y:   -140,
};
```

**Aturan mutlak (dari repo, ini yang bikin feel-nya benar):**

1. **Lompat HANYA saat `body.blocked.down`.** Repo mengomentari alternatifnya sebagai "无限跳"
   (lompat tak terbatas) — itu bug, bukan fitur.
2. **Saat sedang melompat, animasi kiri/kanan di-`return`** supaya tidak menimpa animasi lompat.
3. `isJumping = body.blocked.none && body.velocity !== 0`.

### 4.3 Jump-arc math (kalibrasi tile 32px)

Dengan `gravity = 300`, `jumpVel = 210`:

| Metrik | Rumus | Hasil |
|---|---|---|
| Waktu naik | `v/g = 210/300` | 0.70 s |
| **Tinggi lompat maks** | `v²/(2g) = 210²/600` | **73.5 px ≈ 2.3 tile** |
| Waktu udara total | `2v/g` | 1.40 s |
| **Jarak lompat maks (D_max)** | `speed × t = 150 × 1.40` | **210 px ≈ 6.5 tile** |

**Aturan gap (turunan D_max = 6.5 tile):**

| Posisi gap | Lebar maks | % D_max |
|---|---|---|
| **Gap pertama** (stage 1) | **2.5 tile (80px)** | ~38% |
| Gap awal-menengah | 3.5–4 tile (112–128px) | 55–62% |
| Gap menengah | 4.5–5 tile (144–160px) | 70–77% |
| Gap sulit (stage 4+) | 5.5 tile (176px) | 85% |
| **Gap opsional** (rahasia) | 6 tile (192px) | 92% |
| **DILARANG (wajib)** | > 6 tile | > 92% |

**Aturan tinggi platform:** karena tinggi lompat hanya **2.3 tile**, platform bertingkat **wajib**
berjarak vertikal **≤ 2 tile (64px)**. Naik 3 tile = **mustahil** → validator menolak.

> ⚠️ Ini beda dari Mario asli (4–6 tile) karena `gravity 300` jauh lebih ringan dari SMB. Jangan
> menyalin angka tile Mario mentah-mentah — pakai tabel di atas.

### 4.4 State machine

```
                  ┌──────────────────────────────────────┐
                  │                                       │
          ┌───────▼──────┐  input x≠0   ┌──────────────┐  │
    ┌────▶│     IDLE     │─────────────▶│     RUN      │  │
    │     │ (napas 2fr)  │◀─────────────│  (4fr 10fps) │  │
    │     └───────┬──────┘  input x=0   └──────┬───────┘  │
    │             │                            │          │
    │      jump & blocked.down          jump & blocked.down│
    │             │                            │          │
    │             ▼                            ▼          │
    │     ┌──────────────────────────────────────┐        │
    │     │              JUMP (naik)              │        │
    │     │        vy < 0 · stretch 0.9/1.1       │        │
    │     └───────────────────┬──────────────────┘        │
    │                    vy ≥ 0                            │
    │                         ▼                            │
    │     ┌──────────────────────────────────────┐        │
    │     │              FALL (turun)             │        │
    │     └───────────────────┬──────────────────┘        │
    │              blocked.down (LAND: squash)             │
    └─────────────────────────┴────────────────────────────┘
                              │
                       kena musuh
                              ▼
                     ┌─────────────────┐
                     │      HURT       │ knockback + i-frame 1000ms
                     │  (blink 8Hz)    │ → kembali ke IDLE/RUN
                     └─────────────────┘
                              │
                        jatuh jurang
                              ▼
                     ┌─────────────────┐
                     │  FALL_OUT       │ tween y−16 (600ms) → y+600 (2000ms)
                     │  (dari repo)    │ → findSafeRespawn()
                     └─────────────────┘
```

**Animasi per-state (WAJIB — aturan §12 hard-won):**

| State | Frame | FPS | Catatan |
|---|---|---|---|
| `idle` | 2 | 3 | napas naik-turun 1px |
| `run` | 4 | 10 | kaki bergantian, jas berkibar |
| `jump` | 1 | — | + `setScale(0.9, 1.1)` stretch |
| `fall` | 1 | — | tangan sedikit terangkat |
| `land` | — | — | tween squash `1.25/0.8` → balik 120ms |
| `hurt` | 1 | — | flash merah + blink alpha 8Hz |

### 4.5 Input abstraction

```js
// Satu sumber input, tiga penyedia (keyboard / joystick / tombol layar)
const input = { left:false, right:false, jump:false, jumpJustDown:false };
// Keyboard: A/D/←/→ + W/↑/SPACE
// Touch: joystick kiri-bawah (floating) + tombol JMP kanan-bawah
```

**Aturan mobile:** joystick **floating** (muncul di tempat jempol mendarat), bukan fixed.
Target sentuh ≥ **44×44 px**, spacing ≥ **8px**, hormati `env(safe-area-inset-*)`.

> **Golden Rule §4:** *Fisika dari repo tak boleh diubah (300/150/210) — itu yang bikin terasa
> benar. Yang WAJIB diubah adalah sprite-nya: mempelai, bukan tukang ledeng.*

---

## §5 ENEMY / OBSTACLE SYSTEM

### 5.1 Palet musuh (6 tipe, semua desain orisinal)

> **Penamaan:** semua bertema pernikahan Indonesia. Dilarang memakai nama Nintendo.

| # | Nama | Peran | Speed | HP | Kill | Muncul |
|---|---|---|---|---|---|---|
| E1 | **Kepik Undangan** | patroli darat | 30 | 1 | injak | Stage 1+ |
| E2 | **Siput Seserahan** | cangkang | 30 / 300 | 1 | injak→cangkang→tendang | Stage 2+ |
| E3 | **Kupu Nakal** | terbang sinus | 45 | 1 | injak | Stage 3+ |
| E4 | **Balon Hajatan** | melayang naik-turun | 25 | 1 | injak | Stage 3+ |
| E5 | **Tumpukan Kado** | statis, penghalang | 0 | 2 | injak 2× | Stage 4+ |
| E6 | **Jam Gelisah** | pengejar lambat | 55 | 1 | injak | Stage 5+ |

**Plafon variasi:** ≤ **2 tipe per encounter** (keterbacaan). **Lantai kepadatan:** ≥1–3 musuh
aktif/layar (§3.3) — dua aturan ini hidup bersama: *sedikit tipe, tapi selalu ada*.

### 5.2 AI dasar (DIAMBIL dari repo — urutan operasi kritis)

```js
update() {
  // 1. CULLING (repo: Enemy.js baris 26)
  if (Math.abs(this.x - scene.player.x) >= 450) return;

  // 2. BALIK ARAH DULU  ← URUTAN INI KRITIS
  if (this.body.onWall()) this.direction *= -1;

  // 3. BARU set velocity
  this.body.velocity.x = this.direction * this.speed;
}
```

> ⚠️ **JANGAN dibalik urutannya.** Komentar asli repo: *"后移动,否则会鬼畜"* — "gerakkan setelahnya,
> kalau tidak akan gemetar". Membalik urutan = sprite bergetar di dinding.

### 5.3 Mekanik cangkang (E2 — dari `Koopa.js`)

```
  Injak ke-1              Injak ke-2              Recovery
  ┌──────────┐            ┌──────────┐            ┌──────────┐
  │ berjalan │──injak──▶  │ cangkang │──injak──▶  │ MELESAT  │
  │ speed 30 │  +player   │ speed 0  │  arah dari │ speed 300│
  │          │  terpental │ diam     │  posisi    │ bunuh    │
  └──────────┘            └────┬─────┘  player    │ musuh    │
                               │                  │ lain     │
                          3000ms │                └──────────┘
                               ▼
                        ┌──────────────┐
                        │ mulai pulih  │ (animasi goyang)
                        │  +3000ms     │
                        └──────┬───────┘
                               ▼
                          kembali berjalan
```

**Detail dari repo:**
- Injak-1: `direction = 0`, `velocity.x = 0`, `anims.stop()`, **`scene.player.jump()`** (pemain
  terpental — ini penting, memberi feedback).
- Injak-2: arah lesatan dari `(player.x − this.x) >= body.halfWidth` → kiri/kanan.
- Saat melesat: `physics.world.collide(this, enemiesGroup)` → musuh lain mati.
- Recovery: `startRecover = now + 3000`, `recoverFinish = startRecover + 3000`.

### 5.4 Spawn relatif-kamera (WAJIB — aturan §23 hard-won)

**Musuh off-screen = DATA INERT, bukan entity.**

```js
// spawnList: array record {x: triggerX, type, y} TERURUT NAIK
this._next = this._next || 0;
const cam = this.cameras.main, edge = cam.scrollX + BW;
while (this._next < this.spawnList.length && edge >= this.spawnList[this._next].x) {
  const r = this.spawnList[this._next++];
  this.spawnEnemy(r.type, Math.max(r.x, edge), r.y);   // lahir DI TEPI
}
// Despawn saat ter-scroll keluar kiri (anti-leak)
this.enemies.children.iterate(e => {
  if (e && e.active && e.body && e.body.right < cam.scrollX - 100) e.disableBody(true, true);
});
```

**Invarian yang diverifikasi di harness:** *tidak ada musuh ber-hitbox kecuali sudah di-spawn;
musuh di-spawn hanya saat `cam.scrollX + BW ≥ triggerX`.*

### 5.5 Pooling

Semua musuh via `this.physics.add.group({ classType, maxSize: 24, runChildUpdate: true })`.
Mati → `disableBody(true, true)`, bukan `destroy()`. Repo memakai `setTimeout(2000)` sebelum
remove — kita pakai `scene.time.delayedCall(2000, …)` (aman terhadap `GAME.destroy`).

> **Golden Rule §5:** *Balik arah DULU, baru velocity. Musuh off-screen adalah resep, bukan
> makhluk. Sedikit tipe per layar, tapi tak pernah nol.*

---

## §6 INTERACTION & COLLISION MATRIX

| A | B | Tipe | Hasil |
|---|---|---|---|
| Player | ground/platform | **collider** | berdiri, `blocked.down` = true |
| Player | enemies | **overlap** ⚠️ | `enemy.collidingWithPlayer()` — cek arah |
| Player | brick biasa | **collider** | pukul dari bawah → tween y−8 |
| Player | brick `?` (koin) | **collider** | keluar koin, blok jadi mati |
| Player | brick `?` (power-up) | **collider** | keluar power-up |
| Player | coin | **overlap** | +50 skor, destroy |
| Player | **kotak undangan 💌** | **overlap** | `unlockInfo(key)` — lihat APPENDIX X |
| Player | power-up | **overlap** | `changeMode('upgrade')` |
| Player | deadZone (jurang) | **collider** | `findSafeRespawn()` |
| Enemies | ground/platform | **collider** | patroli, balik di dinding |
| Enemies | brick | **collider** | tidak jatuh tembus |
| Cangkang melesat | enemies | **collide** | musuh lain mati |
| Power-up | ground/brick | **collider** | memantul |

> ⚠️ **Player × enemies WAJIB `overlap`, bukan `collider`** (repo GameScene:498). Kalau pakai
> collider, pemain "terhalang" musuh dan stomp jadi tidak konsisten.

### 6.1 Aturan stomp (dari repo)

```js
// Syarat injak — DUA-DUANYA wajib true
if (this.body.touching.up && scene.player.body.touching.down) { /* mati */ }
else { /* player kena damage */ }
```

### 6.2 Aturan pukul blok (dari repo)

```js
if (player.body.touching.up && brick.body.touching.down) {
  if (brick.isCollided) return;              // guard: isi cuma keluar sekali
  brick.isCollided = true;
  scene.tweens.add({ targets: brick, y: brick.y - 8, duration: 100,
                     ease: 'Quintic', yoyo: true, onComplete: … });
}
```

### 6.3 Damage & i-frame

Kena musuh → **BUKAN mati**:
1. `player.setVelocity(±120, -140)` (knockback menjauh dari musuh)
2. `invuln = true` selama **1000ms**, blink alpha 8Hz
3. Turunkan mode power-up satu tingkat (kalau ada); kalau sudah dasar → **tidak terjadi apa-apa
   selain knockback** (tanpa nyawa, §1.3)

> **Golden Rule §6:** *Overlap untuk musuh, collider untuk dunia. Kena musuh = terpental, bukan
> mati.*

---

## §7 POWER-UP / ITEM SYSTEM

| Item | Efek | Durasi | Dari |
|---|---|---|---|
| **Koin Cinta** 🪙 | +50 skor | — | blok `?`, trail |
| **Bunga Melati** 🌸 | mode BESAR (tahan 1 hit) | permanen | blok `?` |
| **Cincin Berkilau** 💍 | kebal 8 detik + kecepatan ×1.3 | 8s | blok tersembunyi |
| **Payung Pelindung** ☂️ | fall lebih lambat (gravity ×0.5) | 10s | platform tinggi |

**Power-up mengikuti pola repo `Mushroom.js`:** `speed 60`, memantul di dinding, keluar dari blok
via tween `y -= height*2`, `duration 200`, `ease Quintic`, `yoyo: true`. Arah keluar ditentukan
posisi player relatif blok.

**Powerup Relevance Rule:** tiap power-up ofensif/defensif **wajib punya usage window** — minimal
**1 musuh atau 1 hazard** dalam **3 layar** setelahnya. Power-up 100px sebelum goal tanpa
tantangan = **dilarang**, ganti dengan koin.

**Kepingan undangan ≠ power-up.** Kotak undangan **tidak memberi buff gameplay** apa pun. Ini
menjaga loop koleksi terpisah dari balancing.

> **Golden Rule §7:** *Useful > Reachable.* Power-up tanpa kesempatan pakai = ganti koin.

---

## §8 DIFFICULTY SCALING

Tiga knob, **bukan** tiga level terpisah:

| Knob | EASY (default) | NORMAL | HARD |
|---|---|---|---|
| `minEnemiesPerScreen` | 1 | 2 | 3 |
| Kecepatan musuh | ×0.8 (24) | ×1.0 (30) | ×1.25 (37) |
| i-frame | 1400ms | 1000ms | 700ms |
| Lebar gap | ×0.85 | ×1.0 | ×1.1 |
| Coyote time | 120ms | 85ms | 60ms |
| Kotak undangan | semua di jalur utama | 60/40 | 50/50 |

**Default EASY** — ini undangan. Kurva **sawtooth**, bukan ramp: tiap stage naik ke puncak lalu
turun ke lembah sebelum naik lebih tinggi di stage berikutnya.

```
  kesulitan
    ▲
  █ │              ▄▆█           ▄▆█▆
    │        ▄▆█▆▄        ▄▆█▆▄          ▄▆██  ← boss
    │  ▄▆█▆▄                                    
    │▄▆                                          
    └─────────────────────────────────────────▶ stage
      1      2       3       4       5      6
```

> **Golden Rule §8:** *Default ramah. Kesulitan naik lewat kepadatan & kecepatan, bukan lewat
> menghukum kesalahan.*

---

## §9 CAMERA & READABILITY

### 9.1 Konfigurasi (menggabungkan repo + aturan §1 hard-won)

```js
const cam = this.cameras.main;
cam.setBounds(0, 0, LEVEL_W, LEVEL_H);
cam.startFollow(this.player, true, 0.14, 0.14);   // lerp halus
cam.setDeadzone(20, 120);                          // kecil & responsif
cam.setFollowOffset(-Math.round(BW * 0.40), 100);  // ← DUA aturan digabung
```

**Penjelasan `setFollowOffset(-216, 100)`:**

- **X = −0.40·BW = −216px** — aturan §1 hard-won: game maju-ke-kanan → dorong player ke **kiri
  ⅖ layar** supaya pandangan ke depan luas (~60%). Batas atas 0.42; jangan taruh di tengah.
- **Y = +100** — **dari repo** (`startFollow(player, true, 1, 1, 0, 100)`). Komentar aslinya:
  kamera ikut goyang saat lompat; offset 100 mendorong player ke bawah layar sehingga kamera
  menabrak batas atas dan gambar terasa **diam saat melompat**. Ini solusi yang sudah terbukti.

```
  ┌───────────────────────────────────────┐
  │            (langit, batas atas kamera) │
  │                                        │  ← kamera mentok atas
  │   [P]→    │  ~60% pandangan ke DEPAN   │     saat lompat → tidak goyang
  │           │                            │
  │ ══════════╪════ tanah ═════════════════│
  │  [joy]    │              [JMP]         │
  └───────────────────────────────────────┘
      40%
```

### 9.2 Aturan keterbacaan

- **No blind jump:** pendaratan tiap lompatan **wajib terlihat** saat takeoff. Validator menolak
  platform target yang berada di luar viewport pada titik lompat.
- **Telegraph:** hazard baru pertama kali muncul di layar **≥1 detik** sebelum bisa mengenai
  pemain (pada kecepatan lari penuh = ≥150px lead).
- **Objek mirip = perilaku sama.** Dilarang membuat blok yang tampak seperti blok `?` tapi
  mematikan.

> **Golden Rule §9:** *Player di kiri ⅖ (X −0.40·BW) untuk pandangan depan; offset Y +100 supaya
> kamera tak goyang saat lompat. Dua-duanya wajib.*

---

## §10 GAME FEEL / JUICE + GRAFIS

### 10.1 Tabel juice (angka konkret)

| Event | Freeze | Shake | Flash | Partikel | SFX | Lain |
|---|---|---|---|---|---|---|
| Lompat | — | — | — | 2 debu | `jump` (pitch ±2st) | stretch 0.9/1.1 |
| Mendarat | — | — | — | 4 debu | `land` | squash 1.25/0.8, 120ms |
| Injak musuh | **3 frame** | 0.008 | — | 6 bintang | `stomp` | player terpental |
| Pukul blok | 2 frame | 0.005 | — | 3 serpih | `bump` | tween y−8 Quintic yoyo |
| Ambil koin | — | — | — | 5 kilau | `coin` (+1st tiap combo) | angka +50 melayang |
| **Ambil kepingan 💌** | **5 frame** | 0.015 | putih 60ms | 12 hati | `piece` | terbang ke ikon HUD |
| Kena musuh | 4 frame | 0.02 | merah 80ms | 8 | `hurt` | blink 1000ms |
| Power-up | 4 frame | 0.01 | kuning 50ms | 10 | `powerup` | scale pop 1.4→1 |
| Boss kena hit | 3 frame | 0.012 | putih 40ms | 8 | `bosshit` | HP bar turun |
| **Semua kepingan** | — | 0.03 | putih 100ms | **kembang api** | `fanfare` | → dialog (delay 4.5s) |

**Stack semua efek di frame impact yang sama** — itu sihirnya (Vlambeer).

**Screen shake pakai trauma model:** simpan `trauma ∈ [0,1]`, event menambah, decay linear ke 0
dalam ~500ms, terapkan `shake = trauma²`.

### 10.2 Grafis prosedural (WAJIB di-shade)

Tiap sprite = **base + highlight (top 22%) + shadow (bottom 22%) + outline 2px gelap**.

```js
function box(g, x, y, w, h, base, hi, sh) {
  g.fillStyle(base, 1); g.fillRect(x, y, w, h);
  if (hi != null) { g.fillStyle(hi, 1); g.fillRect(x, y, w, Math.max(1, h*0.22|0)); }
  if (sh != null) { g.fillStyle(sh, 1); g.fillRect(x, y+h-(h*0.22|0), w, Math.max(1, h*0.22|0)); }
}
function outline(g, x, y, w, h) { g.lineStyle(2, 0x1a1228, 1); g.strokeRect(x, y, w, h); }
```

**Palet 16-bit (hex tetap — jangan improvisasi):**

| Elemen | Base | Highlight | Shadow |
|---|---|---|---|
| Langit siang | `#6b9bff` | `#a8c8ff` | `#4a7ae0` |
| Awan | `#ffffff` | `#ffffff` | `#d4e4ff` |
| Tanah/rumput | `#5ec44a` | `#8ee878` | `#3a8c2e` |
| Tanah bawah | `#c8763c` | `#e0985c` | `#8f5228` |
| Blok bata | `#c05a2c` | `#e08050` | `#8a3c18` |
| Blok `?` | `#f0c020` | `#ffe870` | `#b08010` |
| Pipa | `#3aa83a` | `#6ed86e` | `#227022` |
| Jas mempelai | `#2a2a3e` | `#4a4a60` | `#16161f` |
| Gaun mempelai | `#fdfdfd` | `#ffffff` | `#dcdce8` |
| Kotak undangan 💌 | `#e85888` | `#ff90b8` | `#a83258` |

### 10.3 Animasi frame-by-frame prosedural

Satu drawer ber-parameter → banyak texture → `anims.create`.

```js
function drawGroom(g, o) { /* o: {legPhase, bob, armUp, hurt} */ }
['idle0','idle1','run0','run1','run2','run3','jump','fall','hurt']
  .forEach(k => { /* generateTexture('t_groom_' + k, 32, 40) */ });
if (!this.anims.exists('groom_run')) {          // ← guard wajib (re-inject)
  this.anims.create({ key:'groom_run',
    frames:['run0','run1','run2','run3'].map(k => ({ key:'t_groom_'+k })),
    frameRate: 10, repeat: -1 });
}
```

### 10.4 Transisi antar-stage = SINEMATIK (jangan pause + tombol)

```
 [STAGE CLEAR banner]  →  [pemain lari sendiri keluar kanan]  →  [stage baru]  →  [masuk dari kiri]
   in-canvas, 0.9s          autoFly=true, input terkunci          auto-load       tween 620ms
```

- **JANGAN `scene.pause()`** — scene tetap jalan supaya outro ber-animasi.
- State machine `clearSeq = { phase: 'banner'|'fly'|'done', t }` dijalankan dari `update()`.
- Selama outro: `player.invuln = true`, musuh dibekukan, input dikunci oleh flag `autoFly`.
- Safety timeout `t > 2500ms → done` supaya tak macet.

> **Golden Rule §10:** *Stack juice di frame yang sama. Tiap sprite 3 tone + outline. Stage clear
> = mini-cutscene, bukan dialog.*

---

## §11 AUDIO DESIGN

**SFX game = milik tema** (Web Audio internal, prosedural — tanpa file eksternal):

| Key | Bentuk | Freq | Durasi |
|---|---|---|---|
| `jump` | square, pitch naik | 320→520 Hz | 90ms |
| `land` | noise pendek | — | 50ms |
| `stomp` | square turun | 400→180 Hz | 110ms |
| `coin` | 2 nada | 988→1319 Hz | 120ms |
| `bump` | triangle | 180 Hz | 70ms |
| `piece` | arpeggio 3 nada | 523→659→784 | 300ms |
| `powerup` | arpeggio naik 4 nada | 392→1047 | 400ms |
| `hurt` | saw turun | 300→80 Hz | 250ms |
| `fanfare` | melodi 6 nada | — | 1400ms |

**Pitch-vary ±1–3 semitone** (×1.06 per semitone) pada SFX berulang (jump, coin, stomp).

> ⚠️ **BACKSOUND UNDANGAN = MILIK HOST. TEMA DILARANG MEMUTARNYA.** Lihat APPENDIX Z §Z.4.

---

## §12 ANTI-FRUSTRATION RULES

| Aturan | Nilai | Alasan |
|---|---|---|
| **Coyote time** | 85ms (~5 frame) | lompat masih diterima setelah lepas tepi |
| **Jump buffer** | 85ms | tekan lompat sedikit sebelum mendarat → tetap lompat |
| **Corner correction** | 4px | kepala nyangkut sudut blok → digeser, bukan berhenti |
| **No spawn-kill** | musuh beku 1000ms setelah respawn | — |
| **Respawn aman** | scan mundur 200px, cek hazard & musuh dalam 220px | §17 hard-money |
| **No mandatory hidden** | kepingan tersembunyi selalu punya petunjuk visual | discovery ≠ tebakan |
| **Telegraph** | hazard pertama setelah checkpoint ≥1s lead | fairness |
| **Gap pertama** | ≤38% D_max (80px) | onboarding |

```js
findSafeRespawn(fromX) {
  for (let x = fromX - 200; x > 60; x -= 40) {
    if (this.nearHazard(x, 60)) continue;
    if (this.nearEnemy(x, 220)) continue;
    if (!this.hasGroundBelow(x)) continue;
    return x;
  }
  return this.player.respawnX || 120;
}
```

> **Golden Rule §12:** *Setiap kematian harus terasa salah pemain, bukan salah level. Kalau ragu,
> berpihak pada pemain.*

---

## APPENDIX A — PATTERN LIBRARY

> **24 pola ber-ID.** Generator merangkai stage dari pola, bukan menaruh objek satu per satu.
> Legenda ASCII: `#` tanah · `=` platform · `B` bata · `?` blok tanya · `P` pipa · `e` musuh darat
> · `s` cangkang · `f` terbang · `o` koin · `M` kotak undangan · `_` jurang · `@` player start.

### A.1 Pola TANAH & ONBOARDING (T-series)

**T001 — Safe Opening** (WAJIB pola pertama tiap stage)
```
                    o o o
  @                        ?
  ################################
```
- Purpose: signpost "ke kanan" tanpa teks (ruang kosong kiri, reward di kanan).
- Rules: **0 musuh**, panjang 600px, ≥2 prop dekorasi, ≥1 ambient motion.
- Chaining: hanya boleh diikuti T002/T003.

**T002 — First Enemy** (fail-proof)
```
        e
  ####################
```
- Rules: musuh jalan **ke arah player**, speed ×0.8; tanah datar ≥8 tile; **tidak ada jurang**
  dalam 6 tile. Mengajari lompat/injak dengan konsekuensi nol.

**T003 — First Question Block**
```
        ?

  ####################
```
- Rules: blok `?` tepat di jalur lompat wajib; isi = koin (positif pertama). Tinggi 2 tile.

**T004 — Coin Trail** (filler wajib untuk lembah pacing)
```
      o o o o o
  ####################
```
- Purpose: mengisi lembah §3.4 agar tak kosong. Cost density rendah.

### A.2 Pola BLOK (B-series)

**B001 — Six-Block Formation** (beat-sheet 1-1 #4)
```
   B ? B B ? B
  ###############
```
- Rules: 1 blok berisi power-up, sisanya koin/kosong. Lebar 6 tile.

**B002 — Stair Blocks**
```
              B
          B   B
      B   B   B
  ###############
```
- Rules: beda tinggi tiap anak tangga **≤2 tile** (batas jump-arc §4.3).

**B003 — Floating Row**
```
    B B B B B B

  ###############
```
- Rules: tinggi 3 tile dari tanah; ≥1 blok berisi sesuatu; boleh ditaruh musuh terbang di atasnya.

**B004 — Multi-Coin Block** (1-1 #9)
```
        B  (10 koin, pukul berulang dalam 6 detik)
  ###############
```

**B005 — Hidden Block** (rahasia opsional)
```
      [?]   tak terlihat sampai dipukul
  ###############
```
- Rules: **tidak pernah** menghalangi progres. Petunjuk visual halus (retak/kilau 1px).

### A.3 Pola GAP (G-series)

**G001 — First Gap** (2.5 tile, 38% D_max)
```
  ##########____##########
```

**G002 — Medium Gap** (4 tile, 62%)
```
  ##########_______##########
```

**G003 — Gap with Platform**
```
              ===
  ##########_____________##########
```
- Rules: platform tengah lebar ≥2 tile (pendaratan lebih lebar dari player).

**G004 — Gap + Enemy Beyond**
```
                    e
  ##########_______##########
```
- Rules: musuh **≥3 tile** dari tepi pendaratan (bukan spawn-kill).

**G005 — Descending Gap Chain**
```
  ####___
      ####___
          ####___
              ##############
```
- Rules: turun lebih mudah dari naik → boleh 3 gap berturut. Maks 3 (aturan chain A.8).

### A.4 Pola PIPA & ELEVASI (P-series)

**P001 — Pipe Row** (1-1 #5)
```
              ##    ####
        ##    ##    ####
  ######PP####PP####PPPP####
```
- Rules: tinggi pipa naik bertahap (2 → 3 → 4 tile) — mengajari variable jump.

**P002 — Pipe with Enemy Between**
```
        ##  e   ##
  ######PP######PP######
```

**P003 — Secret Pipe** (turun ke area bonus)
```
        ##v   bisa dimasuki (tekan bawah)
  ######PP######
```
- Rules: area bonus = koin trail + 1 kotak undangan; keluar via pipa lain di depan.

**P004 — Elevated Platform Run**
```
      ====      ====      ====
  ##############################
```
- Rules: pijakan tiap **6–10 tile** (memenuhi lantai §3.3).

**P005 — Moving Platform** (stage 2+)
```
      <===>   tween horizontal 120px, 2000ms yoyo
  #####_________#####
```

### A.5 Pola MUSUH (E-series)

| ID | Nama | Aturan |
|---|---|---|
| **E001** | Single Patrol | 1 musuh, tanah datar |
| **E002** | Patrol Pair | 2 musuh, jarak ≥4 tile |
| **E003** | Shell Intro | cangkang **sendirian**, ruang lapang ≥10 tile (WAJIB sebelum E2 dipakai bebas) |
| **E004** | Flyer Sine | musuh terbang, amplitudo 2 tile, periode 2s |
| **E005** | Enemy on Platform | musuh di atas platform, uji timing |
| **E006** | Gauntlet | 3–4 musuh campur ≤2 tipe — **hanya di puncak pacing** |

### A.6 Pola KEPINGAN UNDANGAN (M-series)

**M001 — Piece on Path** (60% kasus)
```
        M
  ###############
```
- Rules: di jalur utama, tak bisa terlewat.

**M002 — Piece on High Platform** (40% kasus)
```
        ====M

  ###############
```
- Rules: butuh **1 lompatan** dari platform di bawahnya (≤2 tile). **Tidak boleh** butuh
  rangkaian >2 lompatan.

**M003 — Piece in Secret Pipe** (maks 1 per stage)
- Rules: hanya kalau stage punya P003; selalu ada petunjuk (koin mengarah ke pipa).

**M004 — Piece After Challenge** (reward puncak)
```
                    M
  ##########_______##########
```

### A.7 Pola GOAL (F-series)

**F001 — Victory Staircase** (WAJIB pola terakhir stage 1–5)
```
                        #
                    #   #
                #   #   #
            #   #   #   #  |PITA|
  ##########################
```
- Rules: tangga naik 4–5 anak (≤2 tile beda), lalu pita goal. Kemenangan terasa "naik".
- **0 musuh** dalam 5 tile terakhir (napas sebelum stage clear).

### A.8 CHAINING RULES

1. **Maks 3 pola sejenis berturut-turut** (3× G-series → wajib sisip lain).
2. **T001 wajib pertama**, **F001 wajib terakhir** (stage 1–5).
3. Setelah **E006 (gauntlet)** wajib diikuti **T004** (napas).
4. **G-series tidak boleh langsung** setelah E006 (lelah + presisi = tidak adil).
5. Pola dengan mekanik baru **wajib** versi fail-proof dulu.

### A.9 LEVEL GENERATION FORMULA (% pola per stage)

| Stage | T | B | G | P | E | Kepingan | F |
|---|---|---|---|---|---|---|---|
| 1 | 30% | 30% | 10% | 10% | 15% | 3 | 1 |
| 2 | 15% | 20% | 30% | 15% | 15% | 3 | 1 |
| 3 | 10% | 20% | 20% | 25% | 20% | 2 | 1 |
| 4 | 10% | 25% | 25% | 15% | 20% | 2 | 1 |
| 5 | 5% | 20% | 20% | 20% | 30% | 1 | 1 |
| 6 | — | — | — | — | boss | 0 | boss |

> **Golden Rule APPENDIX A:** *Stage dirakit dari pola, bukan objek. Maks 3 pola sejenis berturut;
> mekanik baru selalu fail-proof dulu.*

---

## APPENDIX B — ENTITY ENCYCLOPEDIA

### B.1 PLAYER — Mempelai

```yaml
id: player
nama: Mempelai (groom | bride, bisa ditukar di cover)
sprite: 32x40 px, prosedural, 3 tone + outline
varian: HANYA groom (keputusan final: satu karakter)
  groom: { jas: '#2a2a3e', kemeja: '#fdfdfd', dasi: '#e85888', kulit: '#f0c8a0' }
  # bride TIDAK dipakai sebagai playable; muncul di stage 6 (NPC) + canvas couple panel kanan
fisika:
  speed: 150            # dari repo
  jumpVelocity: -210    # dari repo
  gravityY: 300         # dari repo (world)
  bodySize: { dasar: [22, 38], besar: [22, 44] }
mode: [DASAR, BESAR]    # disederhanakan dari repo (4 mode -> 2, tanpa fireball)
states: [idle, run, jump, fall, hurt, fallOut]
damage:
  kena_musuh: knockback(+-120, -140) + invuln 1000ms + downgrade mode
  jatuh_jurang: tween(y-16, 600ms) -> tween(y+600, 2000ms) -> findSafeRespawn()
  nyawa: TIDAK ADA
```

> Repo punya 4 mode (DIE/SMALL/BIG/FIRE) + fireball. Kita **buang fireball** — verb tunggal adalah
> lompat (§2). Menambah tembak akan mengencerkan desain.

### B.2 E1 — Kepik Undangan

```yaml
id: kepik_undangan
peran: patroli darat (musuh dasar)
sprite: 28x24, badan bulat merah-tua berbintik putih, antena kecil
      # ORISINAL: bulat-pipih berbintik. BUKAN jamur coklat bermata marah.
speed: 30
hp: 1
ai: patroli; balik arah saat body.onWall(); culling |x - player.x| >= 450
kill: injak (body.touching.up && player.body.touching.down) -> +20 skor
damage_ke_player: knockback + invuln (bukan mati)
anim: [walk 2 frame 6fps, squash (mati) + fade 500ms]
muncul: Stage 1+
```

### B.3 E2 — Siput Seserahan

```yaml
id: siput_seserahan
peran: cangkang (musuh 2-tahap)
sprite: 30x32, cangkang spiral pastel + tubuh siput
      # ORISINAL: siput spiral. BUKAN kura-kura bertempurung hijau berkaki.
speed: { jalan: 30, cangkang_diam: 0, cangkang_melesat: 300 }
hp: 1
recoveryInterval: 3000
state_machine: jalan --injak--> cangkang --injak--> melesat
               cangkang --3000ms--> mulai_pulih --3000ms--> jalan
kill_khusus:
  injak_1: direction=0; velocity.x=0; anims.stop(); scene.player.jump()   # player terpental
  injak_2: arah = (player.x - this.x) >= body.halfWidth ? -1 : 1; speed=300
  saat_melesat: collide enemiesGroup -> musuh lain mati (+10 skor)
muncul: Stage 2+ (E003 intro WAJIB: sendirian, ruang >=10 tile)
```

### B.4 E3 — Kupu Nakal

```yaml
id: kupu_nakal
peran: terbang, gerak sinus
sprite: 26x22, sayap kupu pastel, flap 3 frame
speed: 45 horizontal; amplitudo sinus 64px (2 tile); periode 2000ms
hp: 1
ai: terbang lurus + osilasi vertikal; TIDAK mengejar; body.allowGravity = false
kill: injak
muncul: Stage 3+
catatan: telegraph — masuk layar >=1 detik sebelum bisa mengenai player
```

### B.5 E4 — Balon Hajatan

```yaml
id: balon_hajatan
peran: melayang naik-turun di tempat
sprite: 24x34, balon warna-warni + tali
speed: 25 vertikal saja; rentang 96px (3 tile)
hp: 1
ai: tween yoyo vertikal; tidak bergerak horizontal
kill: injak -> meletus (partikel + SFX pop)
muncul: Stage 3+
```

### B.6 E5 — Tumpukan Kado

```yaml
id: tumpukan_kado
peran: statis, penghalang bertingkat
sprite: 32x48, 3 kotak kado bertumpuk berpita
speed: 0
hp: 2                    # injak 2x (tumpukan berkurang tiap hit)
kill: injak 2x -> runtuh (partikel pita)
muncul: Stage 4+
catatan: setelah hit-1 tinggi jadi 1 tile -> berfungsi ganda sebagai PIJAKAN
```

### B.7 E6 — Jam Gelisah

```yaml
id: jam_gelisah
peran: pengejar lambat (tekanan waktu, tematik hari-H makin dekat)
sprite: 30x30, jam weker berkaki kecil; jarum berputar cepat
speed: 55 (mengejar player horizontal)
hp: 1
ai: bergerak ke arah player; TIDAK melompat; BERHENTI di tepi jurang (tidak bunuh diri)
kill: injak
muncul: Stage 5+
catatan: speed 55 < player 150 -> selalu bisa dilarikan. Tekanan, bukan ancaman mematikan.
```

### B.8 BOSS — Sang Penjaga Waktu

```yaml
id: penjaga_waktu
peran: klimaks stage 6
sprite: 96x110, jam besar bermahkota, dua tangan jarum; weak point = pendulum bersinar
hp: 12                   # TTK ~20-30 detik
fase: 3 (threshold hp 8 dan 4)
kill: injak pendulum saat weakness window terbuka
detail: APPENDIX D
```

### B.9 ITEM & OBJEK

| id | sprite | perilaku |
|---|---|---|
| `koin_cinta` | 20x20, koin hati emas, putar 4 frame | overlap → +50, destroy |
| `bunga_melati` | 24x24 | speed 60, memantul dinding (pola repo Mushroom) |
| `cincin` | 22x22, berkilau | idem; kebal 8s |
| `payung` | 26x26 | idem; gravity ×0.5 selama 10s |
| `kotak_undangan` | 28x28, amplop pink bersegel hati, melayang + berdenyut | overlap → `unlockInfo(key)` |
| `blok_tanya` | 32x32, kuning berkedip 4 frame | pukul bawah → isi keluar, jadi blok mati |
| `blok_bata` | 32x32, bata merah | mode DASAR = memantul; mode BESAR = hancur |
| `pipa` | 64x(64..128), hijau bergaris | solid; varian rahasia bisa dimasuki |
| `pita_goal` | 32x160, tiang + pita satin | overlap → stage clear |

> **Golden Rule APPENDIX B:** *Tiap musuh punya peran fungsional berbeda DAN siluet orisinal.
> Kalau siluetnya bisa tertukar dengan karakter Nintendo, gambar ulang.*

---

## APPENDIX C — BIOME / STAGE LIBRARY

> Tiap stage = biome sendiri: palet langit, 3 lapis parallax, prop khas, pool musuh, modifier.
> **Rebuild backdrop per stage**, `clear` group lama.

### C.1 Stage 1 — TAMAN PERKENALAN
```yaml
mood: ceria, pagi cerah, awal perjumpaan
sky: gradient #6b9bff -> #a8c8ff
parallax:
  far  (0.20): siluet perbukitan hijau-biru + matahari
  mid  (0.45): pohon rindang + gazebo taman (landmark)
  near (0.70): semak bunga, pagar putih rendah
props: bangku taman, pot bunga, papan Selamat Datang
ambient: awan bergerak (0.10), kelopak jatuh, rumput bergoyang
enemy_pool: [E1]
pattern_priority: { T:30%, B:30%, E:15%, G:10%, P:10% }
kepingan: 3
```

### C.2 Stage 2 — JEMBATAN HARAPAN
```yaml
mood: siang terang, air berkilau, melangkah bersama
sky: gradient #58b8e8 -> #a0e0f0
parallax:
  far  (0.20): pegunungan biru berkabut
  mid  (0.45): jembatan gantung besar (landmark), perahu kecil
  near (0.70): alang-alang, batu sungai
props: tiang jembatan, tali, pelampung
ambient: riak air beranimasi, percikan, capung terbang
enemy_pool: [E1, E2]              # cangkang diperkenalkan (E003 wajib)
pattern_priority: { G:30%, B:20%, P:15%, E:15%, T:15% }
kepingan: 3
catatan: platform bergerak (P005) diperkenalkan di sini
```

### C.3 Stage 3 — HUTAN JANJI
```yaml
mood: teduh, sinar menembus dedaunan
sky: gradient #3a7a4a -> #8ec87a (kanopi)
parallax:
  far  (0.20): kanopi hutan gelap + berkas cahaya
  mid  (0.45): batang pohon besar, ayunan tali (landmark)
  near (0.70): pakis, jamur hias, akar
props: batang tumbang, sarang, lentera gantung
ambient: berkas cahaya bergoyang, daun jatuh, kunang-kunang
enemy_pool: [E1, E2, E3, E4]
pattern_priority: { P:25%, B:20%, G:20%, E:20%, T:10% }
kepingan: 2
```

### C.4 Stage 4 — BUKIT RESTU
```yaml
mood: senja hangat, meminta restu
sky: gradient #ff9a5c -> #7a4a8c (sunset)
parallax:
  far  (0.20): siluet bukit ungu + matahari terbenam besar
  mid  (0.45): rumah adat kecil, pohon siluet (landmark)
  near (0.70): ilalang keemasan
props: pagar bambu, tumpukan jerami, lampion
ambient: ilalang bergoyang kuat, kawanan burung, debu keemasan
enemy_pool: [E1, E2, E5]
pattern_priority: { B:25%, G:25%, E:20%, P:15%, T:10% }
kepingan: 2
catatan: platform runtuh (rontok 400ms setelah diinjak) diperkenalkan
```

### C.5 Stage 5 — LORONG PERSIAPAN
```yaml
mood: interior, sibuk, persiapan hari-H
sky: dinding interior #4a3a5c (bukan langit)
parallax:
  far  (0.20): dinding bermotif + jendela
  mid  (0.45): lampu gantung kristal, meja rias (landmark)
  near (0.70): gorden, karpet merah
props: kursi susun, kotak kado, rak bunga, balon
ambient: lampu berkelip, gorden bergoyang, balon melayang
enemy_pool: [E1, E5, E6]
pattern_priority: { E:30%, B:20%, G:20%, P:20%, T:5% }
physics_modifier: langit-langit rendah (ruang sempit, tinggi 6 tile)
kepingan: 1
```

### C.6 Stage 6 — PELAMINAN (BOSS)
```yaml
mood: malam berbintang, megah, klimaks
sky: gradient #1a1240 -> #4a2a6c + bintang berkelip
parallax:
  far  (0.20): langit berbintang + bulan besar
  mid  (0.45): panggung pelaminan berukir (landmark utama)
  near (0.70): karangan bunga, kain drapery
props: lilin, kelopak mawar, karpet merah
ambient: lilin berkedip, kelopak berjatuhan, kilau bintang
enemy_pool: [BOSS] + 2-3 penjaga E1 di koridor walk-in
struktur: koridor approach (>=BW) -> arena boss
kepingan: 0 (klimaks memberi semua yang tersisa)
```

> **Golden Rule APPENDIX C:** *Tiap stage = sky sendiri + 3 lapis parallax + props biome + >=1
> ambient motion. Rebuild per stage. Tidak ada layar kosong.*

---

## APPENDIX D — BOSS / CLIMAX SYSTEM

### D.1 Konsep naratif

**Sang Penjaga Waktu** — jam raksasa bermahkota yang menahan mempelai satunya di pelaminan.
Mengalahkannya = waktu berhenti menghalangi = **kedua mempelai bersatu**. Klimaks emosional,
bukan sekadar rintangan.

### D.2 WALK-IN (WAJIB — aturan hard-won §5)

```js
// buildBossArena(): boss INACTIVE, simpan arenaX
this.arenaX = LEVEL_W - Math.round(BW * 0.9);
this.boss.setAlpha(0);        // JANGAN setActive(false) - body ikut mati (hard-won §16)
this.bossActive = false;

// update(): trigger saat player masuk arena
if (this.boss && !this.bossActive && this.player.x >= this.arenaX) this.activateBoss();

// activateBoss(): fade-in + kunci kamera SEKARANG (bukan saat build)
activateBoss() {
  this.bossActive = true;
  this.tweens.add({ targets: this.boss, alpha: 1, duration: 400 });
  this.cameras.main.setBounds(LEVEL_W - BW, 0, BW, BH);
  this.cameras.main.flash(300, 255, 255, 255);
  this.sfx('bossAppear');
}
```

**Koridor approach:** panjang ≥BW, berisi 2–3 penjaga E1 + karpet merah + lilin (jangan kosong).
Reset `arenaX = null; bossActive = false` di awal tiap `buildStage`.

### D.3 Fase & HP

```yaml
hp_total: 12
ttk_target: 20-30 detik
fase:
  1: { hp: 12..9, serangan: [jarum_sapu], interval: 2600ms, telegraph: 700ms }
  2: { hp: 8..5,  serangan: [jarum_sapu, hujan_gir], interval: 2100ms, telegraph: 600ms }
  3: { hp: 4..1,  serangan: [jarum_sapu_cepat, hujan_gir, hentak], interval: 1700ms, telegraph: 500ms }
transisi: flash putih + shake 0.02 + SFX + 800ms invuln boss
```

### D.4 Attack patterns (semua ber-telegraph ≥500ms)

| Serangan | Telegraph | Active | Recovery | Cara menghindar |
|---|---|---|---|---|
| **Jarum Sapu** | jarum menarik mundur 700ms + kilau | sapuan horizontal 400ms | **1000ms** | lompat |
| **Hujan Gir** | 3 bayangan di lantai 600ms | 3 gir jatuh 500ms | 800ms | berdiri di antara bayangan |
| **Hentak** | boss naik 500ms | jatuh + shockwave 300ms | **1200ms** | lompat saat mendarat |

**Weakness window:** setiap recovery, **pendulum** turun & bersinar (`#ffe870`). Injak pendulum =
1 damage. Recovery ≥1000ms memberi cukup waktu mendekat + lompat.

### D.5 HP BAR (WAJIB — hard-won §11/§16)

HP bar **KECIL di ATAS boss** (world-space, ikut posisi), bukan banner besar:

```js
this.bossHpBg   = this.add.rectangle(boss.x, boss.y - 80, 94, 7, 0x000000).setDepth(50);
this.bossHpFill = this.add.rectangle(boss.x - 45, boss.y - 80, 90, 5, 0xe23b2e)
                    .setOrigin(0, 0.5).setDepth(51);
// tiap frame:
this.bossHpBg.setPosition(boss.x, boss.y - 80);
this.bossHpFill.setPosition(boss.x - 45, boss.y - 80);
this.bossHpFill.width = 90 * Math.max(0, this.bossHp / 12);
```

### D.6 Hit detection MANUAL (WAJIB — hard-won §16)

Boss bobbing + body resize + immovable membuat overlap arcade tidak konsisten:

```js
GameScene.prototype.manualBossHit = function () {
  var b = this.boss;
  if (!b || !b.active || !this.bossActive || !this.bossVulnerable) return;
  var p = this.player;
  if (p.body.velocity.y > 0 &&
      Math.abs(p.x - b.x) < 48 &&
      Math.abs(p.y - (b.y + 40)) < 40) {
    this.hitBoss();
    p.body.velocity.y = -210;      // terpental (pola repo player.jump())
  }
};
```

### D.7 Victory sequence

```
hit ke-12 -> boss membeku 400ms -> flash putih 200ms -> pecah jadi partikel jarum jam
  -> shake 0.03 600ms -> SFX fanfare
  -> mempelai satunya turun dari pelaminan (tween 1200ms)
  -> keduanya bertemu di tengah, hati melayang, kembang api
  -> [tahan 4500ms: momen bernapas]
  -> dialog HAPPILY EVER AFTER + rangkuman + CTA Buka Undangan
  -> SEMUA kepingan tersisa otomatis ter-unlock
```

> **Golden Rule APPENDIX D:** *Walk-in dulu baru fight. HP bar kecil di atas boss. Hit manual,
> jangan andalkan overlap. Alpha 0, jangan setActive(false). Menang = semua kepingan terbuka.*

---

## APPENDIX E — VALIDATOR ENGINE

> Validator adalah **gate keras** di dalam generation loop, bukan checklist manual. Stage yang
> lolos playability tapi **gagal density = tetap gagal**.

### E.1 validateDensity() — NO DEAD AIR

```js
function validateDensity(stage, BW, opts) {
  var fails = [];
  for (var x = stage.startX; x < stage.endX; x += BW) {
    var seg = stage.window(x, x + BW);
    var combat = !seg.isSafeZone;

    if (combat && seg.count('enemy') < opts.minEnemiesPerScreen)
      fails.push([x, 'enemies', seg.count('enemy')]);
    if (seg.count('interactive') < 2)          fails.push([x, 'interactive']);
    if (seg.count('platform_elevated') < opts.minPlatformsPerScreen)
      fails.push([x, 'platforms']);
    if (seg.count('parallax_far') < 1)         fails.push([x, 'parallax_far']);
    if (seg.count('landmark_mid') < 1)         fails.push([x, 'landmark_mid']);
    if (seg.count('prop_foreground') < 2)      fails.push([x, 'props']);
    if (seg.count('ambient_motion') < 1)       fails.push([x, 'ambient']);

    var gap = seg.largestEmptyRun('enemy|coin|block|platform|prop_moving');
    if (gap > opts.maxDeadPx)                  fails.push([x, 'deadair', gap]);
  }
  if (stage.maxRewardGap() > opts.rewardEveryPx) fails.push(['*', 'reward-gap']);
  return fails;                                 // kosong = lolos
}

var DENSITY = {
  minEnemiesPerScreen:   1,                     // easy 1 - normal 2 - hard 3
  minPlatformsPerScreen: 1,
  maxDeadPx:             Math.round(540 * 0.75),  // 405 px
  rewardEveryPx:         Math.round(540 * 2.5),   // 1350 px
};
```

### E.2 validatePlayability()

| Check | Aturan | Gagal = |
|---|---|---|
| `goalReachable` | simulasi lari+lompat dari start → goal | REGEN stage |
| `allPiecesReachable` | tiap kepingan dicapai ≤2 lompatan dari jalur | pindahkan kepingan |
| `noImpossibleJump` | gap ≤6 tile (92% D_max); naik ≤2 tile | perbaiki geometri |
| `noBlindJump` | pendaratan terlihat dalam viewport saat takeoff | perlebar/geser platform |
| `noSpawnKill` | tak ada musuh ≤3 tile dari respawn/pendaratan gap | geser musuh |
| `noSoftlock` | tak ada area masuk-tapi-tak-bisa-keluar | tutup/buka jalan |
| `firstGapEasy` | gap pertama stage 1 ≤2.5 tile | perkecil |
| `powerupUsable` | tiap power-up punya ≥1 musuh/hazard dalam 3 layar | ganti jadi koin |
| `pieceNotBehindHardJump` | kepingan tak butuh lompatan >90% D_max | pindahkan |

### E.3 Scoring (lulus ≥80/100)

| Kategori | Bobot | Kriteria |
|---|---|---|
| **Playable** | 30 | semua check E.2 lolos |
| **Dense** | 25 | 0 fail di E.1 |
| **Fair** | 20 | kurva sawtooth; tak ada 3 pola sejenis berturut; telegraph OK |
| **Rewarding** | 15 | reward cadence ≤1350px; ≥1 power-up/stage |
| **Discovery** | 10 | ≥1 rahasia opsional/stage dengan petunjuk visual |

### E.4 Regeneration loop

```
build -> validateDensity -> gagal? -> REGEN segmen gagal (maks 5x)
                         -> lolos
      validatePlayability -> gagal? -> FIX terarah (maks 3x) -> ulang density
                         -> lolos
                    score >=80? -> ya: PUBLISH
                                -> tidak: REGEN stage (maks 3x) -> fallback stage kurasi
```

**Fallback:** setelah 3× regen masih <80 → pakai **stage kurasi manual** yang di-hardcode
(jaminan tak pernah gagal ke pemain).

> **Golden Rule APPENDIX E:** *Segmen yang bisa dilewati tanpa interaksi = GAGAL, di-regenerate.
> Validator bagian dari pipeline, bukan saran.*

---

## APPENDIX F — GENERATION ALGORITHM

### F.1 Pipeline deterministik

```
1.  INIT        seed = hash(stageIndex, difficulty)      // deterministik
2.  SPINE       garis tanah dasar + jurang sesuai % G-series
3.  PATTERNS    isi pola APPENDIX A sesuai formula A.9, hormati chaining A.8
4.  ELEVATION   pastikan >=1 pijakan naik tiap 6-10 tile (sisip P004 bila kurang)
5.  ENTITIES    musuh sebagai spawnList (data inert, terurut triggerX)
6.  DECOR       isi kuota parallax/landmark/props/ambient per segmen
7.  validateDensity()   -> gagal: REGEN segmen (maks 5x)
8.  PIECES      taruh kotak undangan sesuai quota (APPENDIX X)
9.  validatePlayability() -> gagal: FIX terarah (maks 3x)
10. SCORE       >=80 ? publish : regen stage (maks 3x) : fallback kurasi
```

> ⚠️ **Urutan 7 sebelum 8 disengaja.** Density divalidasi **sebelum** kepingan ditaruh, supaya
> kepingan tidak dipakai sebagai penambal segmen kosong. Kepingan = reward naratif, bukan filler.

### F.2 Master instruction

```
Bangun stage <N> biome <B> untuk PIXEL WEDDING RUN.
- Panjang 6000-9000px, tile 32px, GROUND_Y = BH-(isTouch?200:150).
- Mulai T001 (safe 600px, 0 musuh). Akhiri F001 (tangga + pita).
- Formula pola A.9 baris stage <N>; hormati chaining A.8.
- Pool musuh = APPENDIX C stage <N>; maks 2 tipe per encounter.
- Semua gap <=6 tile; semua kenaikan platform <=2 tile.
- Musuh = spawnList data inert terurut triggerX (JANGAN spawn aktif saat build).
- Penuhi kuota density §3.3 tiap 540px; jalankan validateDensity -> regen segmen gagal.
- Taruh <K> kotak undangan: 60% jalur utama (M001), 40% platform atas (M002).
- Jalankan validatePlayability; skor >=80 wajib.
```

### F.3 Reproducibility

Seed disimpan di `localStorage` bersama progres, sehingga stage **selalu identik** untuk tamu itu
— penting supaya kepingan tidak "pindah" saat reload.

> ⚠️ **JANGAN `Math.random()` telanjang** untuk layout. Pakai PRNG ber-seed (mulberry32).

> **Golden Rule APPENDIX F:** *Density divalidasi sebelum kepingan ditaruh. Layout ber-seed, bukan
> acak. Ada fallback kurasi supaya pemain tak pernah dapat stage rusak.*

---

## APPENDIX T — TECHNICAL FOUNDATION (PHASER 3.80.1)

### T.1 Boot aman (anti ukuran-0)

> ⚠️ **BUG yang sudah dibayar** (`game-phaser-theme`): membaca `this.scale.width/height` di
> `create()` dengan `Scale.RESIZE` bisa mengembalikan **0** → semua objek off-screen → canvas blank.

```js
function bootGame(parentEl) {
  var r = parentEl.getBoundingClientRect();          // ukur PARENT, bukan scale manager
  var BW = Math.max(320, Math.round(r.width))  || 540;
  var BH = Math.max(480, Math.round(r.height)) || 960;

  GAME = new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentEl,
    width: BW, height: BH,                            // ukuran TETAP, di-pass eksplisit
    pixelArt: true,                                   // dari repo
    roundPixels: true,                                // dari repo
    backgroundColor: '#6b9bff',
    fps: { target: 60 },
    physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, GameScene]
  });
}
```

### T.2 ensurePhaser() — fallback loader

```js
function ensurePhaser(cb) {
  if (window.Phaser && window.Phaser.VERSION) return cb();
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
  s.onload = cb;
  s.onerror = function () { showError('Gagal memuat mesin game. Periksa koneksi.'); };
  document.head.appendChild(s);
  onCleanup(function () { try { s.remove(); } catch (e) {} });
}
```

**`showError()` WAJIB ada** — supaya "Phaser gagal load" bisa dibedakan dari "bug logic"
(keduanya sama-sama canvas blank).

### T.3 Procedural texture + guard

```js
function makeTexture(scene, key, w, h, drawFn) {
  if (scene.textures.exists(key)) return;      // guard: re-inject tidak menduplikasi
  var g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawFn(g);
  g.generateTexture(key, w, h);
  g.destroy();
}
```

### T.4 Animasi + guard

```js
function makeAnim(scene, key, frameKeys, frameRate, repeat) {
  if (scene.anims.exists(key)) return;         // guard wajib
  scene.anims.create({
    key: key,
    frames: frameKeys.map(function (k) { return { key: k }; }),
    frameRate: frameRate, repeat: repeat === undefined ? -1 : repeat
  });
}
```

### T.5 Partikel — API 3.60+ (JANGAN pakai API lama)

```js
// ✅ BENAR (3.60+ / 3.80.1)
var emitter = this.add.particles(x, y, 't_spark', {
  speed: { min: 40, max: 120 }, lifespan: 500, quantity: 6,
  scale: { start: 0.8, end: 0 }, blendMode: 'ADD', emitting: false
});
emitter.explode(8);

// ❌ SALAH (dihapus di 3.60 — repo sumber memakai ini karena Phaser lama)
// var particles = this.add.particles('red');
// var emitter = particles.createEmitter({ ... });
```

> ⚠️ Repo sumber (`Player.js:43`) memakai `add.particles(...).createEmitter(...)` — API itu
> **sudah dihapus** di Phaser 3.60. Jangan menyalinnya mentah.

### T.6 Object pooling

```js
this.enemies = this.physics.add.group({
  classType: EnemySprite, maxSize: 24, runChildUpdate: true
});
// mati: e.disableBody(true, true)  — BUKAN destroy()
// hidup lagi: this.enemies.get(x, y, key)
```

### T.7 Timer aman

```js
// ✅ scene.time — otomatis mati saat scene/GAME.destroy()
this.time.delayedCall(2000, fn, null, this);
// ❌ setTimeout global — bocor setelah GAME.destroy (repo memakai ini)
```

### T.8 Cleanup (KRITIKAL — host me-re-inject script)

```js
// PALING ATAS file index.js:
if (typeof window.__pwrCleanup === 'function') { try { window.__pwrCleanup(); } catch (e) {} }
var cleanupFns = [];
function onCleanup(fn) { cleanupFns.push(fn); }
window.__pwrCleanup = function () {
  cleanupFns.forEach(function (f) { try { f(); } catch (e) {} });
  cleanupFns = [];
  window.__pwrCleanup = null;
};
// saat game dibuat:
onCleanup(function () { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__pwrGame = null; });
```

**Yang BOLEH masuk cleanup:** `removeEventListener`, `clearInterval/clearTimeout`,
`cancelAnimationFrame`, `observer.disconnect()`, `GAME.destroy(true)`, menutup lightbox.

**Yang DILARANG masuk cleanup:**
- ❌ Reset `window.__pwrStarted` (flag "sudah mulai") → intro terulang saat `isOpened` flip.
- ❌ Menghapus `localStorage` progres → kepingan tamu hilang.
- ❌ Timer intro/cover.

> **WHY:** host me-re-execute JS tema saat `[jsBase, isOpened]` berubah. Klik "buka undangan"
> mengubah `isOpened` → **JS dieksekusi ulang satu kali**. Kalau flag "sudah mulai" ikut di-reset,
> pemain ditarik kembali ke layar PRESS START.

### T.9 Self-heal canvas (bukan MutationObserver)

> ⚠️ **PELAJARAN dari retromario v1.3.3–1.3.5:** MutationObserver untuk rewire toolbar **justru
> merusak** (observer terpicu oleh tulisan DOM tema sendiri; guard kadang memblokir re-bind atau
> double-bind). **Seluruh mesin observer DIHAPUS di v1.3.6.** Jangan mengulanginya.

```js
// Cek per frame dari game loop, bukan observer:
function gameStageAttached() {
  var c = GAME && GAME.canvas;
  return !!(c && document.contains(c));
}
// di update() atau interval ringan:
if (!gameStageAttached()) reboot();   // host mengganti innerHTML -> canvas detached
```

### T.10 Auto-resume yang benar

```js
// Setelah re-inject, lanjutkan HANYA kalau cover/reveal TIDAK tampil
if (window.__pwrStarted && !isOverlayVisible('cover') && !isRevealOpen()) {
  startWhenReady();      // idempoten
}
```

> **Golden Rule APPENDIX T:** *Cleanup melepas, bukan mereset. Guard `textures.exists`/`anims.exists`
> di semua pembuatan. Self-heal canvas per frame, bukan MutationObserver. Partikel pakai API 3.60+.*

---

## APPENDIX S — PROJECT / SINGLE-FILE ARCHITECTURE

### S.1 Tiga file

| File | Isi |
|---|---|
| `index.html` | Shell 2-kolom, `#inv-source` (semua section + `{{vars}}`), HUD, kontrol sentuh, overlay, `#theme-fab-container` |
| `index.css` | Layout responsif, palet, UI arcade, animasi CSS, `@media (min-width:980px)` |
| `index.js` | IIFE: cleanup → helper → binding reader → Phaser boot → scenes → integrasi undangan |

### S.2 Lapisan logis di dalam index.js (walau monolitik)

```
[0] CLEANUP HOOK          window.__pwrCleanup  (paling atas!)
[1] CONST & CONFIG        PHYS, DENSITY, PALETTE, STAGES
[2] STORAGE               STORE (localStorage), seed, unlocked, diff
[3] BINDING READER        val(key), scanSections()
[4] HOST WIRING           delegated listener, musik mirror, de-ID clone
[5] UI / OVERLAY          cover, stage-select, piece-modal, reveal, toast
[6] PHASER BOOT           ensurePhaser, bootGame, showError
[7] TEXTURES              drawGroom/drawBride/drawEnemy... + makeTexture
[8] SCENES                BootScene, GameScene
[9] GAMEPLAY              Player, Enemy, Boss, generator, validator
[10] INIT                 startWhenReady, auto-resume
```

### S.3 Ground vs controller (hard-won §2)

```js
var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
CONFIG.GROUND_Y = BH - (isTouch ? 200 : 150);
```

Karakter tinggi 40px → kaki di `GROUND_Y`, kepala di `GROUND_Y − 40`. Dengan `BH − 200`,
clearance ke zona kontrol ≥ **80px**.

### S.4 Layout desktop 2-kolom (hard-won §4/§9)

```css
.pwr-shell { display:flex; justify-content:center; align-items:stretch; }
.pwr-side  { display:none; }

@media (min-width: 980px) {
  .pwr-shell { justify-content: flex-start; }        /* mentok kiri, BUKAN center */
  .pwr-frame { order:1; flex:0 0 auto; width:480px; max-width:480px;
               height:100vh; max-height:100vh; border-radius:0; }
  .pwr-side  { display:block; order:2; flex:1; min-width:320px;
               overflow-y:auto; padding:40px 48px; }
  .pwr-side .inner { max-width:440px; margin:0 auto; }
}
@media (hover:hover) and (pointer:fine) and (min-width:980px) {
  .pwr-touch { opacity:0; pointer-events:none; }     /* desktop pakai keyboard */
}
```

**Panel kanan = PURE undangan. NOL tombol game.** PRESS START / pilih kesulitan / petunjuk
keyboard → **cover overlay di DALAM frame**.

Isi panel kanan:
1. `<canvas id="pwr-couple">` — **Canvas 2D biasa, BUKAN Phaser** — menggambar mempelai pria
   berjas & wanita bergaun di scene bertema game (langit senja, bukit, pohon, hati melayang,
   banner "JUST MARRIED").
2. Nama mempelai (`{{groom_nickname}}` ♥ `{{bride_nickname}}`) + tanggal.
3. Akad & Resepsi: waktu, tanggal, tempat, alamat, link map (dibungkus `{{#if}}`).
4. Satu tombol: **💌 BUKA UNDANGAN LENGKAP**.

### S.5 HUD map (hard-won §3)

```
  ┌───────────────────────────────────────────┐
  │ SKOR 000200            STAGE 1/6           │  <- HUD info (atas, tak di-tap)
  │                              3/11 kepingan │
  │ ┌───┐                          ┌─┬─┬─┬─┐   │
  │ │ ★ │  ICON-BUTTON (KIRI-ATAS) │M│M│M│ │   │  <- indikator (KANAN-ATAS)
  │ │ ▦ │  ★cheat ▦stage 💌buka    └─┴─┴─┴─┘   │
  │ │💌 │  🎵musik ⟲reset                       │
  │ │🎵 │                                       │
  │ │ ⟲ │           (area main)                 │
  │ └───┘                                       │
  │        [mempelai di atas tanah]             │
  │ ═════════════ tanah ════════════════════════│  <- GROUND_Y = BH-200
  │  ╭───╮                              ┌────┐ │
  │  │joy│  KIRI-BAWAH          KANAN-> │ JMP│ │  <- kontrol sentuh
  │  ╰───╯                              └────┘ │
  └───────────────────────────────────────────┘
```

Target sentuh ≥44×44px, spacing ≥8px, hormati `env(safe-area-inset-*)`.

### S.6 Toast (hard-won §10)

```css
.pwr-toast { position:absolute; top:18%; left:50%;
             transform:translate(-50%,-12px); z-index:30; opacity:0; transition:.2s; }
.pwr-toast.show { opacity:1; transform:translate(-50%,0); }
```
**JANGAN `bottom:...`** (tertutup kontrol). Durasi 3–8 detik, warna + ikon.

### S.7 UI = terasa game (hard-won §20)

Tiap tombol: font mono, uppercase, border 2px, `box-shadow: 0 3px 0`, `active` → `translateY(2px)`.
**Nol `text-decoration: underline`.** Dialog bergaya arcade (border tebal, corner-tick, scanline).

> **Golden Rule APPENDIX S:** *Frame mentok kiri 480px, panel kanan pure undangan. Icon-button
> kiri-atas, indikator kanan-atas, joystick kiri-bawah, JMP kanan-bawah. Toast di 18% atas.*

---

## APPENDIX P — ASET PNG (SPRITE SHEET) — OPSIONAL

> **Default tema ini = PROSEDURAL** (bebas CORS, tak perlu upload). APPENDIX P adalah **jalur
> upgrade** bila ingin grafis "game sungguhan". **Fallback prosedural WAJIB tetap ada.**

### P.1 Lima sheet (urutan upload BAKU)

| # | Kelompok | Isi | Slot |
|---|---|---|---|
| 1 | **player** | groom idle×2, run×4, jump, fall, hurt · bride (sama) | `{{asset_image_1}}` |
| 2 | **enemy** | E1–E6 (walk×2, die) + boss (idle, telegraph, hurt) | `{{asset_image_2}}` |
| 3 | **environment** | tile tanah, rumput, bata, pipa, platform, tangga, prop biome | `{{asset_image_3}}` |
| 4 | **game-object** | koin×4, bunga, cincin, payung, blok `?`×4, pita goal | `{{asset_image_4}}` |
| 5 | **box-kepingan** | kotak undangan (idle×3, terbuka), ikon indikator 11 section | `{{asset_image_5}}` |

> ⚠️ **Urutan upload menentukan nomor slot.** Upload player dulu, baru enemy, dst.

### P.2 JSON generate (1 per kelompok, sel ≥80×80)

```json
{
  "kelompok": "player",
  "name": "pixel-wedding-run-player",
  "deskripsi": "Sprite sheet 16-bit pixel art. Mempelai PRIA berjas gelap dengan dasi merah muda dan mempelai WANITA bergaun putih dengan kerudung dan buket. Gaya chunky 16x16 di-upscale, palet cerah era SNES, outline gelap 2px. TIDAK BOLEH menyerupai karakter game komersial mana pun - ini pengantin Indonesia, bukan tukang ledeng. Latar tiap sel: checkerboard ungu solid (#FF00FF) untuk key-out.",
  "orderNumber": 1,
  "frameWidth": 80,
  "frameHeight": 80
}
```

### P.3 Frame-map RECT EKSPLISIT (bukan grid seragam)

> ⚠️ **BUG "boss dobel"** terjadi karena memakai grid seragam untuk sheet dengan sprite
> berbeda ukuran. Selalu pakai rect eksplisit.

```js
var FRAME_MAP = {
  t_groom_idle0: { sheet: 1, x:   0, y: 0, w: 80, h: 80, out: [32, 40] },
  t_groom_idle1: { sheet: 1, x:  80, y: 0, w: 80, h: 80, out: [32, 40] },
  t_boss_idle:   { sheet: 2, x:   0, y: 240, w: 240, h: 280, out: [96, 110] }
};
```

Engine: slice → key-out background magenta → downscale ke `out` → `addSpriteSheet`.

### P.4 Fallback

```js
function loadSpriteOrProcedural(scene, key) {
  var url = val('asset_image_' + FRAME_MAP[key].sheet);
  if (!url) return drawProcedural(scene, key);       // tak ada aset -> prosedural
  scene.load.image('sheet' + n, url);
  scene.load.once('loaderror', function () { drawProcedural(scene, key); });
}
```

> **Golden Rule APPENDIX P:** *PNG adalah upgrade, prosedural adalah jaminan. Frame-map rect
> eksplisit. Urutan upload baku.*

---

## APPENDIX W — WEDDING INTEGRATION (section → kepingan)

### W.1 Sebelas section & variabelnya

> ✅ Semua nama variabel **sudah diverifikasi** ke `dynamic-variables.md` + tab "Variabel Tema".
> Variabel tak dikenal → diganti string kosong oleh parser (data hilang diam-diam).

| # | `data-info` | Judul UI | Variabel utama | Flag pembungkus |
|---|---|---|---|---|
| 1 | `hero` | Undangan | `groom_nickname`, `bride_nickname`, `wedding_date`, `quote`, `quote_by`, `photo_hero_cover` | selalu ada |
| 2 | `couple` | Mempelai | `groom_name`, `bride_name`, `photo_groom_photo`, `photo_bride_photo`, `nama_bapak_laki_laki`, `nama_ibu_laki_laki`, `nama_bapak_perempuan`, `nama_ibu_perempuan`, `ig_laki_laki`, `ig_perempuan` | ortu: `flag_tampilkan_nama_orang_tua` · sosmed: `flag_tampilkan_sosial_media_mempelai` |
| 3 | `rsvp` | Konfirmasi | `countdown_hari/jam/menit/detik`, form RSVP | selalu ada |
| 4 | `schedule` | Jadwal | `tanggal_akad`, `jam_akad`, `nama_lokasi_akad`, `keterangan_lokasi_akad`, `akad_map` + `*_resepsi` | resepsi: `flag_lokasi_akad_dan_resepsi_berbeda` |
| 5 | `streaming` | Live | `link_live_streaming` | `is_fitur_live_streaming` |
| 6 | `story` | Kisah | `{{#each timeline_kisah}}` → `this.tanggal/judul/deskripsi` | `flag_pakai_timeline_kisah` |
| 7 | `gallery` | Galeri | `{{#each galleries}}` → `this.url` | `has_gallery` |
| 8 | `happiness` | Story IG | `sample_story_1..3`, `frame_balasan_instagram`, `link_balasan_instagram` | `flag_pakai_additional_feature_story_balasan_instagram` |
| 9 | `wishes` | Ucapan | form + `{{#each wishes}}` → `this.guest_name/guest_message/guest_comment_time` | selalu ada |
| 10 | `gift` | Hadiah | `bank_1`, `rek_1`, `nama_rek_1` (+`_2`), `gambar_qris_rekening_1/2`, `alamat_lokasi_kirim_hadiah_offline` | `tampilkan_amplop_online`, `flag_pakai_2_rekening`, `flag_pakai_qris_rekening_1/2`, `flag_kirim_hadiah_offline` |
| 11 | `closing` | Penutup | `kalimat_penutup`, `site_name`, `site_url` | selalu ada |

### W.2 Satu sumber binding

```html
<div id="inv-source" style="display:none" aria-hidden="true">
  <section data-info="hero">…{{groom_nickname}}…</section>
  {{#if flag_pakai_timeline_kisah}}<section data-info="story">…</section>{{/if}}
  …
</div>
```

**Aturan:** `{{#if}}` **membungkus seluruh `<section>`** — supaya section yang dimatikan flag
benar-benar **absen dari DOM**, dan `scanSections()` menghitung yang riil.

### W.3 Membaca nilai (pola teruji retromario)

```js
function val(k, fb) {
  var el = document.querySelector('[data-var="' + k + '"]');
  var v = el ? (el.textContent || '').trim() : '';
  if (!v || v.indexOf('{{') === 0) return fb || '';   // var tak ter-resolve -> fallback
  return v;
}
```
Markup: `<span data-var="wedding_date">{{wedding_date}}</span>`.

> ⚠️ **Tidak ada substitusi atribut runtime.** Baca **teks yang sudah ter-render**, bukan atribut.

### W.4 Aturan penempatan kepingan

1. **Section inti di stage awal.** `hero`, `schedule`, `rsvp` → **stage 1**. Tamu yang berhenti di
   tengah tetap dapat info pokok.
2. **Kepingan ≠ power-up.** Tidak memberi buff gameplay apa pun.
3. **Reachable:** ≤2 lompatan dari jalur utama; tak pernah butuh lompatan >90% D_max.
4. **60% di jalur (M001) / 40% eksplorasi (M002)** — di EASY jadi 100% di jalur.

> **Golden Rule APPENDIX W:** *Satu sumber binding (`#inv-source`), `{{#if}}` membungkus section,
> baca via teks rendered. Section inti di stage awal.*

---

## APPENDIX X — COLLECTION MECHANIC

### X.1 Scan section riil (jumlah kepingan DINAMIS)

```js
function scanSections() {
  var src = document.getElementById('inv-source');
  if (!src) return [];
  return Array.prototype.slice.call(src.querySelectorAll('[data-info]'))
    .map(function (el) { return el.getAttribute('data-info'); })
    .filter(Boolean);
}
var INFOS = scanSections();     // bisa 6, bisa 11 — TIDAK PERNAH di-hardcode
```

### X.2 Quota per stage + auto-scale

```js
var QUOTA_SHAPE = [3, 3, 2, 2, 1, 0];        // sum = 11 (semua section aktif)

function scaleQuota(total) {
  var sum = QUOTA_SHAPE.reduce(function (a, b) { return a + b; }, 0);
  if (total >= sum) return QUOTA_SHAPE.slice();
  var out = QUOTA_SHAPE.map(function (q) { return Math.floor(q * total / sum); });
  var left = total - out.reduce(function (a, b) { return a + b; }, 0);
  for (var i = 0; left > 0; i = (i + 1) % out.length) {   // sisa -> stage awal dulu
    if (QUOTA_SHAPE[i] > 0) { out[i]++; left--; }
  }
  return out;
}
```

### X.3 Pemetaan stage → kepingan DETERMINISTIK

```js
// Slice kontigu dari INFOS berdasarkan NOMOR STAGE — bukan counter berjalan.
function piecesForStage(stageIdx) {
  var q = scaleQuota(INFOS.length);
  var start = 0;
  for (var i = 0; i < stageIdx; i++) start += q[i];
  return INFOS.slice(start, start + q[stageIdx]);
}
```

> ⚠️ **JANGAN pakai counter global.** Kalau memakai counter berjalan, cheat stage-jump / replay →
> kepingan ganda atau desync.

### X.4 Respons saat kepingan diambil

```js
function unlockInfo(key) {
  if (STORE.unlocked.indexOf(key) !== -1) return;    // idempoten
  STORE.unlocked.push(key);
  saveStore();
  lightIndicator(key);                 // ikon HUD menyala
  toast('💌 Kepingan undangan didapat: ' + labelOf(key));
  sfx('piece');
  particlesHearts(player.x, player.y);
  flyToIndicator(key);                 // animasi terbang ke HUD
  if (STORE.unlocked.length === INFOS.length) announceAllCollected();
}
```

> ⚠️ **JANGAN auto-open modal.** Mengambil kepingan hanya **menyalakan ikon** + toast + SFX +
> partikel. Tamu memilih sendiri kapan membaca. Auto-open memutus gameplay & terasa memaksa.

### X.5 Slot sisa → filler skor

Slot pola M-series yang tak terpakai (karena section sedikit) **diganti koin trail** dengan
footprint sama — level tetap padat, tidak ada lubang di layout.

### X.6 Celebration — DUA pemicu terpisah

| Pemicu | Kondisi | Dialog |
|---|---|---|
| **A** | kepingan terakhir didapat | "Semua kepingan terkumpul — undangan siap dibuka" |
| **B** | boss stage 6 dikalahkan | "HAPPILY EVER AFTER" + rangkuman + CTA |

**Keduanya bisa terjadi di urutan mana pun** — desain harus tahan kedua urutan.

**Beat ~5 detik SEBELUM dialog:** flash + kembang api + SFX fanfare + toast → baru dialog
(`time.delayedCall(4500, …)`). Jangan munculkan dialog seketika.

**Guard sekali-tampil (di-persist):** `STORE.announcedAll`, `STORE.completed` — supaya perayaan
tidak terulang saat reload / re-inject.

Dialog **wajib memakai nama mempelai dinamis**: `val('groom_nickname')`, `val('bride_nickname')`.

> **Golden Rule APPENDIX X:** *Jumlah kepingan dinamis dari scan. Pemetaan deterministik dari
> nomor stage. Ambil = nyalakan ikon, JANGAN auto-open. Dua pemicu celebration, guard di-persist.*

---

## APPENDIX Y — CHEAT SYSTEM

### Y.1 Satu flag, dua ranah

```js
var cheat = { on: false };

function toggleCheat() {
  cheat.on = !cheat.on;
  if (cheat.on) {
    INFOS.forEach(unlockInfo);        // ranah UNDANGAN: semua kepingan terbuka
    player.invincible = true;         // ranah GAME: kebal
    showStageSelect();                // semua stage terbuka
    badgeStar.classList.add('on');
  } else {
    player.invincible = false;
    badgeStar.classList.remove('on');
    // kepingan yang sudah terbuka TETAP terbuka (tak dicabut)
  }
}
```

| Ranah | Efek saat ON |
|---|---|
| **Undangan** | semua kepingan ter-unlock, tombol "Buka Undangan" aktif |
| **Game** | kebal, bebas pilih kesulitan, semua stage terbuka |
| **Skor** | **dibekukan** saat cheat aktif (integritas leaderboard lokal) |

### Y.2 Persist = keputusan sadar → **JANGAN persist**

`STORE.unlocked` **di-persist**. `cheat.on` **TIDAK di-persist**.

**WHY:** satu HP sering dipakai banyak tamu. Kalau cheat di-persist, device itu selamanya "mode
mudah". Tidak persist = reload mengembalikan mode jujur, tapi kepingan yang sudah terbuka tetap
terbuka.

### Y.3 Audit cheat-bypass blind spot

> ⚠️ Sumber bug berulang (`retromario-debugging`). Wajib dicek di harness:

- [ ] Kebal cheat **tidak bocor** ke mode normal setelah toggle off.
- [ ] Stage-select tertutup lagi saat cheat off (kecuali stage yang memang sudah dilewati).
- [ ] Skor beku saat cheat tidak menimpa `STORE.best` yang jujur.
- [ ] `unlockInfo` idempoten — cheat 2× tidak menggandakan indikator.

### Y.4 RESET = PENUH (hard-won §21)

```js
function resetGame() {
  localStorage.removeItem(STORE_KEY);        // 1. wipe TOTAL
  STORE = defaults();                        //    diff->'easy', unlocked=[], maxStage=0,
                                             //    best=0, announcedAll=false, completed=false
  if (GAME) { GAME.destroy(true); GAME = null; }   // 2. bongkar stage
  runState = freshRun(); cheat.on = false;   //    reset run + cheat
  rebuildIndicators(); resetDiffPickerUI();  // 3. semua kepingan terkunci lagi
  showOverlay('cover');                      // 4. kembali ke COVER (pilih kesulitan lagi)
}
```

Konfirmasi via **overlay sendiri** (bukan `confirm()` native).

> **Golden Rule APPENDIX Y:** *Cheat = satu flag, dua ranah. Kepingan di-persist, cheat tidak.
> Reset = wipe storage + destroy game + kembali ke cover.*

---

## APPENDIX Z — HOST CONTRACT & WIRING

> ✅ Semua di bawah **diverifikasi langsung** dari `ThemeWrapper.tsx` + `InvitationPage.tsx`.

### Z.1 ID host — VERBATIM, tanpa prefix

| ID | Milik host | Catatan |
|---|---|---|
| `btn-show-qr` | intercept capture-phase | selalu, tanpa syarat flag |
| `btn-show-menu` | intercept **hanya jika** `flag_use_system_action_button` true | — |
| `btn-toggle-music` / `btn-music` | `setIsPlaying(!isPlaying)` | boleh hidden |
| `bg-music` | host **dispatch** `Event('play'/'pause')` | hook event saja |
| `play-icon` / `pause-icon` | **host menulis `display`** | tema jangan menulis |
| `btn-submit-kehadiran` | host baca form + submit | ⚠️ `innerHTML` ditimpa spinner |
| `rsvp-status` / `rsvp-guests` / `rsvp-code` | dibaca host | ⚠️ `rsvp-code` **query polos** |
| `alert-submit-kehadiran` | card thank-you | lihat Z.2 |
| `rsvp-form` | di-`display:none` saat sukses | — |
| `btn-submit-ucapan`, `wish-name`, `wish-message`, `wish-form`, `alert-submit-ucapan` | host handle | — |
| `tm-countdown-days/hours/minutes/seconds` | host tulis `textContent` tiap detik | ⚠️ query tunggal |
| `theme-fab-container` | host toggle display | — |

> ⚠️ **JANGAN pasang listener klik sendiri** pada `#btn-submit-*`, `#btn-show-qr`,
> `#btn-show-menu`. Satu klik akan diproses **dua kali** (dobel ucapan terkirim).

### Z.2 RSVP — casing NILAI adalah bug-magnet

```html
<select id="rsvp-status">
  <option value="hadir">Ya, saya hadir</option>
  <option value="tidak-hadir">Maaf, berhalangan</option>
</select>
```

**WAJIB lowercase persis `hadir` / `tidak-hadir`.**

**WHY (diverifikasi di dua file):**
- `InvitationPage.tsx:660` — `(raw === 'hadir' || raw === 'confirmed') ? 'confirmed' : 'declined'`
  → **strict equality, case-sensitive**.
- `ThemeWrapper.tsx:802` — `String(status).toLowerCase() === 'hadir'` → **case-insensitive**.

**Akibat kalau menulis `"Hadir"`:** wrapper menampilkan card "hadir" (lolos `.toLowerCase()`),
tapi backend mencatat **DECLINED** (gagal strict equality). **UI dan database berbeda.**

**Card thank-you WAJIB punya branch:**

```html
<div id="alert-submit-kehadiran" style="display:none">
  <div data-rsvp-branch="hadir">Terima kasih, sampai jumpa di hari bahagia kami!</div>
  <div data-rsvp-branch="tidak">Terima kasih atas doa restunya.</div>
</div>
```

**WHY:** `ThemeWrapper.tsx:795` — `rsvpIsCard = !!alertEl.querySelector('[data-rsvp-branch]')`.
Kalau **ada** branch, host **tidak pernah** menyentuh `innerHTML`-nya. Kalau tidak ada, host
meng-`innerHTML = ''` lalu menimpanya → **card cantik hancur**.

### Z.3 Ucapan

```html
<div data-loop="wishes">
  {{#each wishes}}
  <div data-wish-item>
    <span data-wish-field="name">{{this.guest_name}}</span>
    <p data-wish-field="message">{{this.guest_message}}</p>
    <time data-wish-field="time">{{this.guest_comment_time}}</time>
  </div>
  {{/each}}
</div>
<div data-wish-template style="display:none"> … struktur sama … </div>
```

**`[data-wish-template]` WAJIB ada** — tanpa itu, saat list kosong host membuat markup generik
polos yang tampil jelek.

### Z.4 MUSIK — tema DILARANG memutar

**Host pemilik penuh** `Audio`/YouTube player, hanya `play()` saat `isPlaying && isOpened`.

| Boleh ✅ | Dilarang ❌ |
|---|---|
| Menyediakan `<audio id="bg-music">` sebagai hook event | `audio.play()` backsound tenant |
| Klik `#btn-toggle-music` secara programatik | Menulis ikon `#play-icon`/`#pause-icon` |
| Membaca state via `.classList.contains('music-playing')` | Mirror `#bg-music` (host satu-satunya penulis) |
| SFX game via Web Audio | — |

```js
// Sinkronisasi intent dengan generation guard + retry (pola metalslug)
var musicWanted = false, musicGen = 0;
function setMusic(want) {
  musicWanted = want;
  var gen = ++musicGen, tries = 0;
  (function attempt() {
    if (gen !== musicGen || tries++ > 6) return;
    var btn = document.getElementById('btn-toggle-music');
    if (btn && hostMusicPlaying() !== musicWanted) btn.click();
    if (hostMusicPlaying() !== musicWanted) setTimeout(attempt, 260);
  })();
}
```

### Z.5 Listener DELEGATED — satu, di `document`

```js
var DELEGATED = {
  'pwr-btn-cheat':  toggleCheat,
  'pwr-btn-stage':  showStageSelect,
  'pwr-btn-open':   revealFullInvitation,
  'pwr-btn-reset':  confirmReset
};
function onDocClick(e) {
  for (var id in DELEGATED) {
    if (e.target.closest && e.target.closest('#' + id)) { DELEGATED[id](e); return; }
  }
}
document.addEventListener('click', onDocClick);
onCleanup(function () { document.removeEventListener('click', onDocClick); });
```

> ⚠️ **JANGAN pakai MutationObserver.** Terbukti merusak di retromario v1.3.3–1.3.5 (observer
> terpicu tulisan DOM tema sendiri; guard memblokir re-bind / double-bind). Dihapus total di
> v1.3.6, diganti delegasi ini. Metalslug juga **nol** observer.

### Z.6 De-ID `#inv-source` saat clone hidup (WAJIB)

**Masalah:** clone mewarisi ID → ada **dua** `#rsvp-form`, dua `#wish-name`. `querySelector`
mengembalikan yang **pertama** (sumber tersembunyi, input kosong).

**Mitigasi host `pick()`** memilih yang visible — **tapi ada 3 lubang yang TIDAK dilindungi:**

1. `#rsvp-code` — `container.querySelector` polos (`ThemeWrapper.tsx:785`)
2. Field gift (`#gift-name/#gift-amount/#gift-bank/#alert-submit-hadiah`)
3. `#tm-countdown-*` — query tunggal → hanya copy pertama berdetak

**Karena itu de-ID WAJIB, bukan opsional:**

```js
var HOST_IDS = ['rsvp-form','rsvp-status','rsvp-guests','rsvp-code','btn-submit-kehadiran',
  'alert-submit-kehadiran','wish-form','wish-name','wish-message','btn-submit-ucapan',
  'alert-submit-ucapan','gift-name','gift-amount','gift-bank','alert-submit-hadiah',
  'btn-submit-hadiah','tm-countdown-days','tm-countdown-hours','tm-countdown-minutes',
  'tm-countdown-seconds'];

function setSourceHostIds(on) {
  var src = document.getElementById('inv-source'); if (!src) return;
  HOST_IDS.forEach(function (id) {
    if (on) {
      var el = src.querySelector('[data-pwrid="' + id + '"]');
      if (el) { el.setAttribute('id', id); el.removeAttribute('data-pwrid'); }
    } else {
      var e2 = src.querySelector('#' + id);
      if (e2) { e2.setAttribute('data-pwrid', id); e2.removeAttribute('id'); }
    }
  });
}
```

**Urutan WAJIB:** clone dulu → tempel ke DOM → **baru** `setSourceHostIds(false)`.
Saat ditutup → `setSourceHostIds(true)`.

**Hanya SATU clone ber-ID pada satu waktu:** `openPieceModal()` memanggil `closeReveal()` dulu;
`revealFullInvitation()` memanggil `closeModal()` dulu.

### Z.7 `flag_use_system_action_button` = **FALSE**

**Tema game WAJIB set `false`.**

**WHY:** saat `true`, host merender FAB sendiri di `fixed bottom:24 right:24 z-index:999` →
**menutupi tombol JMP** dan berada di atas canvas. Selain itu CSS host memaksa
`#theme-fab-container { display: none !important }` → FAB tema mati total.

**Konsekuensi:** tema wajib menyediakan sendiri di dalam `#theme-fab-container`: `#btn-show-qr`,
`#btn-toggle-music` (boleh hidden), dan menu.

### Z.8 Freeze game saat dialog terbuka (WAJIB)

> ⚠️ **Kebocoran universal di 5 tema sebelumnya** (memory `game-theme-pause-on-dialog`).

```js
function anyOverlayOpen() {
  return !!document.querySelector('.pwr-overlay.show, #pwr-piece-modal.show, #pwr-reveal.show');
}
// di update() paling atas:
if (anyOverlayOpen()) { if (!this.scene.isPaused()) this.scene.pause(); return; }
else if (this.scene.isPaused()) this.scene.resume();
```

Berlaku untuk: piece-modal, reveal undangan, stage-select, cover, reset-confirm, **dan** dialog
celebration.

### Z.9 Countdown

`{{countdown_hari}}` **sudah berupa** `<span id="tm-countdown-days">NN</span>` (host meng-inject
span-nya). Jadi cukup tulis `{{countdown_hari}}` polos.

> ⚠️ **JANGAN membungkusnya lagi** dengan `<span id="tm-countdown-days">` — itu menghasilkan span
> bersarang (metalslug melakukannya; tetap bekerja tapi jangan ditiru).

Alternatif: hitung sendiri dari `{{wedding_date_iso}}`.

> **Golden Rule APPENDIX Z:** *ID verbatim, RSVP lowercase `hadir`/`tidak-hadir`, card wajib
> `[data-rsvp-branch]`, musik milik host, satu listener delegated (nol observer), de-ID source saat
> clone hidup, FAB flag false, freeze saat dialog terbuka.*

---

## §13 VERIFIKASI (untuk tahap-2)

### 13.1 Jebakan mesin ini

> ⚠️ **Screenshot headless Chrome TIDAK bekerja di mesin ini** — selalu blank. Jangan dipercaya
> sebagai bukti.

**Cara verifikasi yang benar:**
1. Paste 3 file ke **Theme Editor** host (`ThemeEditorPage.tsx`) → buka preview.
2. Atau minta user mencobanya langsung.
3. **Logika game** diuji via **harness Node/jsdom** yang menjalankan loop asli dengan RAF di-stub
   (bukan memanggil fungsi step langsung).

### 13.2 Checklist harness (WAJIB lulus sebelum lapor selesai)

| # | Tes | Assert |
|---|---|---|
| 1 | **De-ID clone** | clone dibuka → `document.querySelectorAll('#rsvp-code').length === 1` |
| 2 | **RSVP casing** | `#rsvp-status` hanya bernilai `hadir` / `tidak-hadir` |
| 3 | **RSVP branch** | `#alert-submit-kehadiran` berisi `[data-rsvp-branch]` |
| 4 | **Cleanup** | panggil `__pwrCleanup()` 2× → tak ada error, `GAME === null` |
| 5 | **Re-exec intro** | set `__pwrStarted` → re-exec JS → cover **tidak** muncul lagi |
| 6 | **Kepingan dinamis** | hapus 5 section dari `#inv-source` → `INFOS.length === 6`, quota ter-scale |
| 7 | **Deterministik** | `piecesForStage(2)` dipanggil 2× → hasil identik |
| 8 | **Freeze dialog** | buka piece-modal → `scene.isPaused() === true` |
| 9 | **Spawn kamera** | musuh `triggerX` jauh → tidak ada body; scroll sampai edge → baru ada |
| 10 | **Boss damage** | `hitBoss()` ×12 → `bossHp === 0` → `defeatBoss` terpicu |
| 11 | **Reset penuh** | tulis storage palsu → reset → storage wipe, diff default, cover tampil |
| 12 | **Cheat off** | toggle on→off → `player.invincible === false`, kepingan tetap terbuka |
| 13 | **Jump-arc** | simulasi lompat penuh → tinggi ≥73px, jarak ≥210px |
| 14 | **Density** | generate 6 stage → `validateDensity()` mengembalikan array kosong |

### 13.3 `showError()` wajib

```js
function showError(msg) {
  var el = document.getElementById('pwr-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
```
Supaya "Phaser gagal load" bisa dibedakan dari "bug logic" — keduanya sama-sama canvas blank.

---

## §13.4 BUG YANG DITEMUKAN HARNESS SAAT TAHAP-2 (sudah diperbaiki)

> Lima bug ini **tidak ada di dokumen mana pun sebelumnya** — semuanya ditemukan
> saat harness jsdom dijalankan terhadap implementasi. Dicatat supaya tema game
> berikutnya tidak mengulanginya.

### B1. `Phaser.Scene.prototype` diakses di top-level → tema MATI total

```js
// ❌ SALAH — ReferenceError kalau Phaser belum ter-load
GameScene.prototype = Object.create(Phaser.Scene.prototype);
```
`ensurePhaser()` memuat Phaser **secara async**, jadi kondisi "Phaser belum ada
saat script jalan" itu **normal**, bukan kasus langka. Satu baris ini mematikan
seluruh file — termasuk lapisan undangan yang sebenarnya tak butuh Phaser.

**Fix:** tulis method di objek biasa, lalu graft prototype lewat `linkScene()`
yang dipanggil dari `bootGame()` setelah Phaser siap.

### B2. `{{countdown_*}}` dipakai di DUA tempat → satu diam selamanya

`{{countdown_hari}}` mengembalikan `<span id="tm-countdown-days">NN</span>`
**lengkap dengan ID-nya**. Memakainya di `#inv-source` DAN di panel kanan
menciptakan dua elemen ber-ID sama; host meng-update lewat `querySelector`
tunggal sehingga hanya copy pertama berdetak.

**Fix:** satu ID = satu tempat. Panel kanan menghitung sendiri dari
`{{wedding_date_iso}}` (`startSideCountdown()`).

### B3. De-ID hanya menyapu `#inv-source` → clone lama tetap ber-ID

Menyapu hanya `#inv-source` tidak cukup: clone lama yang belum dibersihkan juga
membawa ID host. Dua clone ber-ID hidup bersamaan → host membaca elemen yang
salah → form terkirim kosong.

**Fix:** `setSourceHostIds(false, keep)` menyapu **seluruh dokumen** kecuali
container clone yang aktif. Urutan: clone → tempel → **pasang ID di clone** →
matikan ID di tempat lain. (Urutan lama — de-ID dulu baru pasang — tidak bekerja
karena source memang tak pernah punya ID.)

### B4. `DOMContentLoaded` saja → init tak pernah jalan bila event sudah lewat

Host meng-inject `<script>` **setelah** HTML ter-render, jadi event itu sering
sudah lewat. Tema mati diam-diam: `INFOS` kosong, indikator tak terbangun, tanpa
pesan error apa pun.

**Fix:** jalan langsung bila `readyState !== 'loading'`, tetap pasang listener
sebagai cadangan, **plus** timeout 1200ms sebagai jaring pengaman.

### B5. Validator density hanya mengecek titik TENGAH segmen

`isGroundAt(x + BW/2)` menolak menambal saat tengah segmen jatuh di jurang —
sehingga segmen itu **selamanya** gagal validasi dan loop `fixDensity` habis
tanpa hasil (3 dari 6 stage gagal).

**Fix:** `findGroundInSegment(L, x0, x1)` memindai seluruh segmen; kalau memang
jurang penuh, isi koin melayang alih-alih musuh.

### Entry-point guard (bukan bug, tapi wajib)

Host me-render HTML lebih dulu dari eksekusi JS, jadi tombol **bisa diklik
sebelum init selesai** → `STORE` null → TypeError. Semua entry point publik
(12 fungsi) diberi `if (!STORE) ensureBooted();`.

> **Golden Rule §13.4:** *Apa pun yang menyentuh Phaser di top-level adalah bom
> waktu. Apa pun yang mengandalkan satu event DOM adalah bom waktu. Verifikasi
> dengan harness, bukan dengan membaca ulang kode.*

---

## §13.5 TEMUAN DARI UJI COBA USER (putaran 1) — 3 masalah, semua diperbaiki

> Ditemukan saat user memainkan build pertama di Theme Editor. Ketiganya **tidak
> tertangkap harness** karena menyangkut rasa & tampilan, bukan logika. Ini bukti
> bahwa harness tidak menggantikan uji main.

### C1. "Grafiknya 100% tidak mirip" — akar masalah: bentuk HALUS

**Penyebab:** sprite digambar dengan `fillCircle` / `fillEllipse` / `fillTriangle`.
Phaser meng-anti-alias tepinya → hasilnya **ilustrasi vektor yang mulus**, bukan
pixel art. Game 16-bit terlihat khas justru karena **pikselnya besar dan
bertangga**.

**Fix — sistem art map:** tiap sprite kini didefinisikan sebagai **grid karakter**,
satu karakter = satu piksel besar (`PX = 3` untuk sprite, `TPX = 4` untuk tile).

```js
var ART = ['..RR..', '.RRRR.', 'RRWWRR'];
paintArt(g, ART, { R: 0xc0392b, W: 0xfdfdfd }, PX);
```

**Aturan keras:** `fillCircle`, `fillEllipse`, `.arc()`, `fillTriangle`,
`strokeCircle` **DILARANG** di seluruh lapisan visual — termasuk parallax, awan,
bukit, matahari, dan canvas couple di panel kanan. Bentuk bulat disusun dari
kotak bertangga. Ditegakkan oleh tes **T24b**.

Bukit parallax → tangga piksel (`STEP = 8`). Awan → tumpukan 3 kotak + bayangan.
Matahari → kotak ber-step dari rumus lingkaran yang di-quantize.

### C2. "Lompatnya tidak bisa sampai naik ke platform"

**Penyebab — kesalahan SKALA, bukan kesalahan angka.** Konstanta repo
(`gravity 300`, `jump 210`) menghasilkan lompatan **73px**. Di repo aslinya
viewport hanya **224px** tinggi → 73px = **⅓ layar**, terasa lega. Frame kita
**potret 960px** → 73px hanya **7,6% layar**, terasa seperti tersandung.

**Fix:** yang dipertahankan adalah **proporsi terhadap layar**, bukan angka absolut.

| | Repo (224px) | Tema ini (960px) |
|---|---|---|
| gravity | 300 | **900** |
| jump velocity | 210 | **720** |
| run speed | 150 | **200** |
| tinggi lompat | 73px (33% layar) | **288px (30% layar)** |
| D_max | 210px | **320px** |

Seluruh geometri level ikut diskalakan (16 titik: tinggi blok, platform, koin,
kepingan, musuh terbang).

> **Pelajaran umum:** menyalin konstanta fisika antar-game hanya sah kalau
> **rasio terhadap viewport** ikut dijaga. Angka absolut tanpa konteks ukuran
> layar adalah jebakan.

### C3. "Kena monster padahal monsternya tidak ada" — HITBOX HANTU

**Dua penyebab terpisah:**

1. **`setTexture()` TIDAK me-resize body.** Musuh didaur ulang dari pool; E5
   (Tumpukan Kado, body 30×44) yang mati lalu dipakai ulang sebagai E1 (Kepik,
   24×20) **membawa hitbox 30×44**. Pemain kena pukul dari udara kosong.
2. **`killEnemy` menunda `disableBody` 320ms** (untuk animasi mati), tapi
   `touchEnemy` hanya mengecek `e.active` — selama animasi itu bangkainya masih
   melukai.

**Fix:**
- Tabel `ENEMY_BODY` per tipe + `body.setSize()` **wajib** di tiap `spawnEnemy`.
- Reset penuh state pool: `setAlpha(1).setScale(1).setAngle(0).setFlipX(false)`,
  `anims.stop()`, `body.setVelocity(0,0)`.
- Guard berlapis di `touchEnemy`: `!e.alive || !e.body || !e.body.enable` → tolak.

Ditegakkan oleh tes **T17d–T17g**.

> **Golden Rule §13.5:** *Pool reuse wajib mereset SEMUA state — tekstur, ukuran
> body, alpha, scale, angle, flip, velocity. Yang tidak di-reset akan menghantui.
> Dan konstanta fisika tidak bisa disalin tanpa menyalin skalanya.*

---

## §13.6 TEMUAN UJI COBA (putaran 2): "sudah piksel tapi kurang terasa retro"

> Setelah C1 diperbaiki (bentuk halus → art map), user melapor: *"bener sih udah
> piksel tapi kayak kurang aja"*. Diagnosis: **kotak-kotak hanya SYARAT, bukan
> penyebab rasa retro.** Lima faktor di bawah yang sebenarnya menentukan.

### D1. Palet terlalu lebar & lembut → terlihat "modern flat"

Palet revisi 1 punya 30+ warna pastel dengan gradasi halus. Era 16-bit dibatasi
jumlah warna, jadi seniman memilih warna **sedikit tapi JENUH & kontras**.

| | Revisi 1 | Revisi 2 |
|---|---|---|
| Jas mempelai | `#2a2a3e` (abu gelap) | `#2b3a7a` (biru tua **jenuh**) |
| Merah musuh | `#c0392b` (bata lembut) | `#d81028` (merah **jenuh**) |
| Rumput | `#5ec44a` | `#38b830` + rampa `#68f050`/`#187818` |
| Outline | `#1a1228` | `#0d0a14` (hampir hitam, lebih tegas) |

Aturan: tiap material punya **rampa 3 langkah** (gelap → base → terang), semuanya
saturasi tinggi. Tidak ada warna pastel-lembut.

### D2. Siluet tidak terbaca

Mempelai revisi 1: jas gelap + celana gelap → **satu gumpalan**. Sprite retro
harus terbaca sebagai bentuk hitam-putih.

Fix: celana pakai warna **berbeda** dari jas (`L: #5a5f7e` vs `J: #2b3a7a`),
kemeja putih besar di dada, dasi merah jenuh sebagai titik fokus.

### D3. Sprite terlalu kecil untuk detail

11×14 piksel tidak cukup untuk wajah + jas + dasi yang terbaca.

| Sprite | Revisi 1 | Revisi 2 |
|---|---|---|
| Mempelai | 11×14 (33×42 px) | **15×20 (45×60 px)** |
| Kepik | 9×8 | **13×11** |
| Siput | 10×11 | **14×13** |
| Tile | grid 8×8 @ TPX=4 | **grid 16×16 @ TPX=2** |

Tile naik 4× detailnya — inilah yang memungkinkan tekstur di D5.

### D4. Latar terlalu jarang

Mario 1-1 punya awan/semak/bukit **rapat**. Revisi 1: 1 bukit tiap 260px, 1 awan
tiap 300px → langit & tanah terasa kosong.

| Elemen | Revisi 1 | Revisi 2 |
|---|---|---|
| Awan | tiap 300px | **tiap 170px** + 3 variasi ukuran |
| Prop tanah | tiap 260px | **tiap 110px**, 5 jenis selang-seling |
| Lapis parallax | 2 (far + mid) | **3** (far + mid + mid2 @ 0.32) |
| Dithering langit | — | **pita checkerboard** di batas gradien |

### D5. Tile polos tanpa tekstur

Tile retro **tidak pernah** rata. Revisi 2:
- **Tanah**: 2 baris rumput → **dithering** `zAzAzA` di transisi → tanah dengan
  kerikil tersebar acak-tetap → dithering gelap di dasar.
- **Bata**: nat horizontal + **nat vertikal berselang-seling tiap band** (pola
  bata sungguhan), highlight baris atas, shadow baris bawah.
- **Blok tanya**: rivet 4 sudut + tanda `?` besar dari peta 8×10 + kilau berkedip.

### Pelajaran metodologis

Art map yang panjang barisnya tidak seragam = sprite rusak diam-diam. Untuk
bentuk kompleks (bata, blok tanya, boss), **bangun baris secara terprogram**
dengan helper `row(w, fn)` yang menjamin panjang, jangan konkatenasi manual —
8 art map sempat meleset 1–5 karakter dan hanya ketahuan lewat render ASCII.

> **Golden Rule §13.6:** *Retro bukan soal kotak, tapi soal BATASAN: warna
> sedikit tapi jenuh, siluet terbaca, tekstur di tiap tile, dan elemen latar yang
> berulang RAPAT. Palet lebar + tile polos + latar jarang = terlihat modern,
> sekotak apa pun pikselnya.*

---

## §13.7 TEMUAN UJI COBA (putaran 3): "masih kurang piksel" + "kurangi border hitam"

### E1. Border hitam berlebihan — 41% sprite adalah OUTLINE

**Diukur, bukan dikira-kira:** sprite mempelai revisi 2 punya 187 piksel terisi,
**77 di antaranya outline `I`** = **41%**. Hampir separuh gambar hanya garis.

**Kenapa salah:** sprite NES/SNES **tidak** dibingkai garis hitam keliling. Mario
tidak punya outline. Kedalaman datang dari **kontras warna** + shadow di sisi
bawah/kanan. Outline penuh membuat sprite terlihat seperti **stiker/clipart**.

**Aturan baru:** `I` (hampir hitam) HANYA untuk **detail** — pupil, garis mulut,
nat bata, lubang. **DILARANG** sebagai bingkai bentuk.

| Sprite | Revisi 2 | Revisi 3 |
|---|---|---|
| Mempelai | 41% | **15%** |
| Kepik | ~35% | **10%** |
| Mempelai wanita | ~30% | **3%** |

Ditegakkan tes **T24e–T24g** (batas ≤18%).

### E2. "Masih kurang piksel" — pikselnya terlalu KECIL & BANYAK

Kesalahan berpikir saya: menambah **detail** (grid 15×20, tile 16×16) justru
membuat gambar terlihat **halus**, bukan retro. Sprite retro asli punya grid
**kecil** dengan piksel **besar**:

| | Mario NES | Revisi 2 | Revisi 3 |
|---|---|---|---|
| Grid mempelai | 16×16 | 15×20 | **12×17** |
| Ukuran piksel | besar | PX=3 | **PX=4** |
| Grid tile | 16×16 | 16×16 | **8×8** |
| Ukuran piksel tile | — | TPX=2 | **TPX=4** |

Ukuran akhir di layar mirip (48×68 vs 45×60), tapi **jumlah piksel jauh lebih
sedikit** → tiap piksel terlihat besar & kotak. Itu yang bikin terasa retro.

> **Pelajaran:** "lebih retro" ≠ "lebih detail". Justru sebaliknya — **batasi**
> jumlah piksel, **perbesar** ukurannya. Detail halus adalah ciri era modern.

Ditegakkan tes **T24h** (PX ≥ 4) dan **T24i** (grid ≤14 kolom).

> **Golden Rule §13.7:** *Piksel BESAR, jumlahnya SEDIKIT, dan JANGAN dibingkai
> hitam. Bentuk dibedakan oleh kontras warna, bukan garis. Kalau sebuah sprite
> butuh outline keliling supaya terbaca, warnanya yang kurang kontras.*

---

## §14 SELF-CHECK BIBLE

- [x] Kerangka `bible-template.md` diikuti — §0–§12 + APPENDIX A–F + T/S/P + W–Z lengkap
- [x] Spesifik-arketipe: 24 pola, 8 entity + boss, 6 biome, boss 3 fase
- [x] **Beat-sheet referensi** SMB 1-1 (14 cluster) → lantai kepadatan ber-angka
- [x] **Validator density** sebagai gate keras dengan pseudocode + knob
- [x] Aturan ber-angka (gravity 300, speed 150, jump 210, D_max 6.5 tile, gap 38–92%)
- [x] Phaser 3.80.1 benar (partikel API 3.60+, `game.destroy(true)`, `blocked.down`)
- [x] APPENDIX P: 5 sheet + JSON + frame-map rect + urutan upload + fallback
- [x] Variabel undangan **terverifikasi** ke `dynamic-variables.md` (nol karangan)
- [x] APPENDIX W–Z lengkap: kepingan dinamis, cheat, celebration 2-pemicu, layout 2-kolom, ID verbatim
- [x] Golden Rule di tiap bagian besar
- [x] **§0.0 orisinalitas aset** — pembeda kritis tema ini
- [x] Disimpan di `src/sample-theme/pixel-wedding-run/PIXEL_WEDDING_RUN_BIBLE.md`

---

## LAMPIRAN — SUMBER

**Mekanik:** [github.com/Tyrone2333/phaser3-mario](https://github.com/Tyrone2333/phaser3-mario)
(`src/index.js`, `src/object/Player.js`, `Enemy.js`, `Koopa.js`, `Goomba.js`, `Mushroom.js`,
`Coin.js`, `src/scene/GameScene.js`) — **mekanik & konstanta saja, nol aset**.

**Level design:** [Super Mario Wiki — World 1-1](https://www.mariowiki.com/World_1-1_(Super_Mario_Bros.)) ·
[World 1-1 — Wikipedia](https://en.wikipedia.org/wiki/World_1-1) ·
[Analysis of Super Mario Bros. 1-1](https://medium.com/creating-immersive-worlds/analysis-of-super-mario-bros-1-1-2eb9a70fbeb4)

**Kontrak host:** `src/features/invitation/components/ThemeWrapper.tsx` ·
`src/features/invitation/pages/InvitationPage.tsx` · `src/utils/templateParser.ts` ·
`src/features/admin/components/ThemeGuideModal.tsx`

**Game feel:** Vlambeer "Art of Screenshake" · Celeste forgiveness values · GMTK 4-Step Level Design
· Csikszentmihalyi Flow · Apple HIG / Material 3 touch targets

---

*Bible ini adalah sumber kebenaran untuk tahap-2. Kalau tahap-2 menyimpang dari angka di sini,
yang salah adalah tahap-2 — bukan Bible.*
