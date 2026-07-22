# FOREST RPG WEDDING — GAME DESIGN BIBLE

> **Tema:** `forest-rpg-wedding` · **Arketipe:** Top-down adventure RPG (Zelda-like)
> **Engine:** Phaser **3.80.1** · **Arsitektur:** single-file (3 file: `index.html` + `index.css` + `index.js`)
> **Referensi desain:** [ForestRPG](https://github.com/ikraamg/ForestRPG) (kode MIT, Ikraam Ghoor)
> **Aset:** [Tiny RPG Forest](https://ansimuz.itch.io/tiny-rpg-forest) oleh Ansimuz — **CC0** (public domain)
>
> **STATUS: TAHAP 1 (Bible) — SELESAI. 3 file tema BELUM dibuat.**
> Bible ini adalah sumber kebenaran untuk tahap 2 (generate `index.html`/`index.css`/`index.js`).

---

## DAFTAR ISI

| Bagian | Isi |
|---|---|
| **§0** | Meta, elevator pitch, lisensi aset |
| **§1** | Core Principles (8 prinsip) |
| **§2** | Core Gameplay Loop |
| **§3** | World / Level Structure + **beat-sheet referensi + lantai kepadatan** |
| **§4** | Player System (state machine, fisika, input) |
| **§5** | Enemy System (6 tipe, AI, spawn relatif-kamera) |
| **§6** | Interaction & Collision Matrix |
| **§7** | Power-up / Item System |
| **§8** | Difficulty Scaling (ramah undangan) |
| **§9** | Camera & Readability (top-down room-based) |
| **§10** | Game Feel / Juice + Grafis |
| **§11** | Audio Design |
| **§12** | Anti-Frustration Rules |
| **A** | PATTERN LIBRARY (24 pola ruang) |
| **B** | ENTITY ENCYCLOPEDIA |
| **C** | BIOME / AREA LIBRARY (6 area) |
| **D** | BOSS / CLIMAX SYSTEM (Ent Penjaga Gerbang) |
| **E** | VALIDATOR ENGINE (playability + **density no-dead-air**) |
| **F** | GENERATION ALGORITHM |
| **T** | TECHNICAL FOUNDATION (Phaser 3.80.1) |
| **S** | SINGLE-FILE ARCHITECTURE |
| **P** | ASET PNG (5 sprite sheet + ASSET.md + frame-map + urutan upload) |
| **W** | WEDDING INTEGRATION (section → kepingan) |
| **X** | COLLECTION MECHANIC |
| **Y** | CHEAT SYSTEM + RESET PENUH |
| **Z** | HOST CONTRACT & WIRING |

---

# §0 — META & RINGKASAN

## 0.1 Elevator pitch

> Mempelai berdua tersesat di **Hutan Terlarang** yang memisahkan mereka dari hari pernikahan.
> Hutan dijaga **Treant** (pohon berjalan) dan **Mole** (tikus tanah penggali). Tersebar di enam
> area hutan ada **kepingan undangan** — surat-surat yang tertiup badai. Tamu mengendalikan
> mempelai, menjelajah hutan top-down 4-arah, memanah rintangan, membuka peti, dan
> mengumpulkan setiap kepingan. Ketika semua kepingan terkumpul, **Gerbang Gunung** terbuka —
> di baliknya bukan pintu keluar, melainkan **pelaminan**. Boss terakhir: **Ent Penjaga
> Gerbang**, pohon purba yang harus diyakinkan (dikalahkan) agar merestui.

## 0.2 Kenapa arketipe ini

| Aspek | Alasan |
|---|---|
| **Top-down 4-arah** | Kontrol paling sederhana untuk tamu non-gamer; tanpa fisika lompat, tanpa jurang, tanpa mati karena salah timing. |
| **Room/area-based** | Cocok dengan "1 area = 1 bab kisah pasangan"; kepingan tersebar natural. |
| **Eksplorasi, bukan refleks** | Tamu boleh berjalan santai. Tidak ada tekanan waktu. |
| **Aset CC0 tersedia** | Grafis "game sungguhan" tanpa risiko lisensi (lihat §0.4). |

## 0.3 Perbedaan dari ForestRPG asli (WAJIB — jangan clone mentah)

Ini **bukan** port. ForestRPG dipakai sebagai referensi desain; banyak sistemnya dibuang karena
bertabrakan dengan konteks undangan.

| ForestRPG asli | Tema ini | Alasan |
|---|---|---|
| Webpack + Babel + ES modules, `/src` multi-file | **Single-file IIFE** | Host inject 3 file statis; tak ada bundler. |
| **Skor + leaderboard + localStorage skor** | **DIHAPUS total** | Undangan bukan kompetisi. Tamu tidak diberi nilai. |
| **3 nyawa + game-over → scene GameOver** | **TANPA nyawa, TANPA game-over** | §8/§12. Tamu frustrasi = tutup undangan. |
| **Kalahkan 6 musuh → pintu terbuka** | **Kumpulkan N kepingan → gerbang terbuka** | N dinamis dari section riil (APPENDIX W). |
| **Audio: musik `ancient_path.mp3` + 4 SFX** | **Musik DIBUANG** (host pegang backsound); SFX game via Web Audio | Kontrak host §Z. Musik Pascal Belisle juga bukan CC0. |
| **1 peta 60×45 tile, 17 musuh** | **6 area, kepadatan divalidasi** | Peta asli terlalu sepi (§3.2 — ~1 musuh/layar). |
| Kamera `setZoom(3.5)` follow bebas | Zoom + **room-snap kamera** (§9) | Keterbacaan mobile. |
| HUD sprite mengikuti player tiap frame | HUD DOM di luar canvas | Tak ikut zoom, tak bergetar. |

> **Golden Rule §0.3:** *ForestRPG adalah referensi feel & aset, BUKAN kode yang di-port. Setiap
> sistem yang menghukum pemain (nyawa, game-over, skor, leaderboard) dibuang.*

## 0.4 Lisensi aset (FAKTA TERVERIFIKASI — jangan diubah tanpa cek ulang)

| Komponen | Sumber | Lisensi | Boleh dipakai komersial? |
|---|---|---|---|
| **Kode ForestRPG** | github.com/ikraamg/ForestRPG | **MIT** (terverifikasi via GitHub API `spdx_id`) | ✅ ya |
| **Pixel art** | Ansimuz — *Tiny RPG Forest* (itch.io) | **CC0 1.0 Universal** | ✅ ya, termasuk modifikasi & redistribusi |
| **Musik** `ancient_path` | Pascal Belisle | **TIDAK CC0 / tak terdokumentasi** | ❌ **JANGAN PAKAI** |
| **SFX** repo | tak terdokumentasi | tak jelas | ❌ jangan ambil dari repo; generate sendiri via Web Audio |

**Aturan wajib untuk tahap 2:**
1. **Download pack sendiri** dari `ansimuz.itch.io/tiny-rpg-forest` (name-your-own-price, gratis).
   **Simpan `LICENSE.txt` yang ikut di ZIP** sebagai bukti lisensi di `src/sample-theme/forest-rpg-wedding/assets/`.
2. **JANGAN** menyalin `atlas.png` dari repo ForestRPG — itu hasil repack TexturePacker orang lain.
   Ambil aset mentah dari pack resmi.
3. **JANGAN** menyertakan file audio apa pun dari repo.
4. Atribusi tidak diwajibkan CC0, tapi **tetap cantumkan** di `#inv-source` closing atau komentar
   `index.js`: `// Art: Ansimuz (CC0) — ansimuz.itch.io/tiny-rpg-forest`.

> **Golden Rule §0.4:** *Kode MIT tidak menutupi aset. Aset ini CC0 dan aman — tapi ambil dari
> pack resmi + simpan bukti lisensinya, jangan dari repo pihak ketiga. Audio: nol file.*

## 0.5 Angka kanonik yang diwarisi dari ForestRPG (hasil baca source)

Diekstrak dari `src/config/constants.js` + `map.json` repo asli. Dipakai sebagai **titik awal**,
lalu di-tune di §4/§5.

```js
// ForestRPG asli (referensi)
GAME_WIDTH=800, GAME_HEIGHT=600     // → kita: 540×960 potret (§S)
PLAYER_SPEED=50                     // → kita: 92 (asli terlalu lambat, §4.3)
ARROW_SPEED=270                     // → kita: 300
ENEMY_SPEED=60                      // → kita: per-tipe 34–86 (§5)
TILE_SIZE=16                        // → kita: 16 (tetap, aset 16×16)
KILLS_TO_OPEN_EXIT=6                // → kita: N kepingan dinamis (APPENDIX W)
HURT_INVULN_MS=2000                 // → kita: 1200 (§4.6)
camera.setZoom(3.5)                 // → kita: dihitung dari lebar frame (§9.2)
anims: 6 frame/cycle @ frameRate 6  // → kita: 6 frame @ 8fps (§10.4)
map: 60×45 tile = 960×720 px, 17 musuh (12 mole + 5 treant)
```

---

# §1 — CORE PRINCIPLES

## 1.1 Playability First — game dulu, baru undangan

**Aturan keras:** fitur game (gerak, panah, musuh, area, boss) **selesai & enak** sebelum satu pun
kepingan dipasang. Bila harus memangkas, potong jumlah area — **jangan** potong kualitas kontrol.

- ✅ BENAR: 4 area yang responsif 60fps, tiap ruang punya encounter.
- ❌ SALAH: 6 area tapi input lag & ruang kosong.

**WHY:** tamu yang merasa game-nya murahan akan menutup undangan sebelum menemukan kepingan
pertama. Undangan yang tak terbaca = tema gagal, sebagus apa pun binding-nya.

## 1.2 Teach Before Test

Tiap mekanik baru diperkenalkan di ruang **aman** (tanpa musuh) sebelum diuji.

| Mekanik | Ruang ajar | Ruang uji |
|---|---|---|
| Gerak 4-arah | `A1-R1` (kosong, ada panah petunjuk) | `A1-R2` (1 mole lambat) |
| Panah | `A1-R2` (target latihan: semak bisa ditembak) | `A1-R3` (2 mole) |
| Peti kepingan | `A1-R3` (peti terbuka jelas di tengah) | `A2` dst |
| Batu penghalang | `A2-R1` (1 batu, jelas jalannya) | `A2-R4` (labirin batu) |
| Tuas/kunci | `A3-R1` | `A3-R5` |

## 1.3 Fair Challenge — ancaman selalu terbaca

- Musuh **wajib terlihat ≥0.8 detik** sebelum bisa menyentuh pemain (jarak spawn ≥ 90px dari tepi
  pandang pemain).
- **Tidak ada** musuh yang muncul dari belakang tanpa telegraph.
- Mole yang menggali muncul dengan **partikel tanah 0.5s** sebelum badannya keluar.

## 1.4 Readability — siluet unik

Tiap entity harus dikenali dalam **1 frame** pada layar mobile kecil:

| Entity | Siluet pembeda |
|---|---|
| Player (mempelai) | tinggi ramping + **kerudung/jas** (warna terang) |
| Treant | **lebar & bertajuk** (kanopi di kepala), hijau gelap |
| Mole | **rendah & bulat**, cokelat, moncong pink |
| Peti kepingan | **kotak emas berkilau**, ada 💌 |
| Batu | abu bulat, statis, tanpa animasi |

## 1.5 Discovery & Reward — eksplorasi dibayar

Setiap ruang **wajib** memberi ≥1 dari: kepingan, item, rahasia, atau jalan baru. Ruang yang cuma
koridor = pelanggaran validator (APPENDIX E).

## 1.6 Game Dulu Baru Undangan — kepingan bukan tempelan

Kepingan **tidak** boleh didapat dengan sekadar menyentuh ujung ruang. Tiap kepingan menuntut
≥1 aksi game: kalahkan penjaga, buka peti terkunci, tembak sasaran, atau selesaikan puzzle kecil.

## 1.7 Inklusif — tamu boleh tidak main

Cheat mode (APPENDIX Y) membuka **semua** kepingan seketika. Tamu lansia / non-gamer / yang buru-buru
tetap dapat undangan lengkap. Ini **bukan** fitur tersembunyi yang memalukan — tombol ★ terlihat.

## 1.8 Ramah — tak ada hukuman permanen

TANPA nyawa. TANPA game-over. TANPA kehilangan progress. Kena musuh = knockback + i-frame.
Kepingan yang sudah didapat **tidak pernah** hilang.

> **Golden Rule §1:** *Game harus enak dimainkan tanpa undangan; undangan harus lengkap tanpa
> bermain. Keduanya wajib benar, bukan salah satu.*

---

# §2 — CORE GAMEPLAY LOOP

## 2.1 Verb utama

**JALAN (4-arah) · PANAH (tembak arah hadap) · BUKA (peti/pintu) · KUMPULKAN (kepingan).**

Tidak ada: lompat, tiarap, dash, double-jump. Empat verb ini cukup dan mudah di layar sentuh.

## 2.2 Diagram loop

```
        +--------------------------------------------------+
        |                                                  |
        v                                                  |
   +---------+   lihat    +----------+   pilih   +----------------+
   | MASUK   | ---------> | PINDAI   | --------> | HADAPI ANCAMAN |
   | RUANG   |  ancaman   |  RUANG   |   rute    | (panah/hindar) |
   +---------+  & reward  +----------+           +--------+-------+
                                                          | bersih
                                                          v
   +--------------+  tidak   +---------------+   ya   +----------+
   | RUANG        | <------- | ada kepingan? | -----> | AMBIL    |
   | BERIKUTNYA   |          +---------------+        | KEPINGAN |
   +------+-------+                                   +----+-----+
          |                                                |
          |                              ikon menyala -----+
          |                              + toast + partikel
          |                              (TIDAK auto-open)
          v
   +---------------------+  semua kepingan?   +--------------------+
   | AREA BERIKUTNYA     | -----------------> | GERBANG GUNUNG     |
   | (6 area)            |        ya          | terbuka -> BOSS    |
   +---------------------+                    +---------+----------+
                                                        v
                                              +------------------+
                                              | CELEBRATION      |
                                              | -> BUKA UNDANGAN |
                                              +------------------+
```

## 2.3 Satu putaran = 20–40 detik

| Fase | Durasi target | Isi |
|---|---|---|
| Masuk + pindai ruang | 2–4s | kamera snap, ancaman terlihat semua |
| Hadapi ancaman | 8–20s | 2–5 musuh, 1–3 tembakan panah masing-masing |
| Ambil reward | 2–5s | peti / kepingan / item |
| Transisi ruang | 0.35s | tween kamera |

> **Golden Rule §2:** *Satu ruang = satu keputusan + satu ancaman + satu reward, dalam <=40 detik.
> Ruang yang bisa dilewati lurus tanpa berhenti = gagal.*

---

# §3 — WORLD / LEVEL STRUCTURE

## 3.1 Struktur makro

```
HUTAN TERLARANG
├── AREA 1  Tepi Hutan         (onboarding)      3x3 ruang =  9 ruang
├── AREA 2  Hutan Dalam        (batu & labirin)  3x3       =  9
├── AREA 3  Rawa Berkabut      (kabut, air)      3x3       =  9
├── AREA 4  Ladang Bunga       (breather, cerah) 3x2       =  6
├── AREA 5  Kaki Gunung        (elevasi, batu)   3x3       =  9
└── AREA 6  Gerbang Gunung     (koridor + arena boss) 1x2 =  2
                                                  TOTAL   = 44 ruang
```

**Satu "ruang" (room) = satu layar penuh** = **`ROOM_W x ROOM_H = 11 x 15 tile` = 176x240 px (POTRET)**
(kelipatan `TILE=16`). Diturunkan dari viewport efektif ForestRPG asli (§3.2.a).

## 3.2 BEAT-SHEET REFERENSI (WAJIB — hasil reverse-engineer)

### 3.2.a ForestRPG asli — dan kenapa kepadatannya GAGAL

Diekstrak langsung dari `assets/maps/map.json` + `GameScene.js` + `constants.js` repo asli:

| Metrik | Nilai terukur | Verdict |
|---|---|---|
| Ukuran peta | 60x45 tile = 960x720 px | — |
| Kamera | `setZoom(3.5)` pada canvas 800x600 -> viewport efektif **229x171 px ~ 14x11 tile** | — |
| Jumlah "layar" | 960/229 x 720/171 ~ **4.2 x 4.2 ~ 17.6 layar** | — |
| Total musuh | **17** (12 mole gid6 + 5 treant gid5) | — |
| **Musuh per layar** | **17 / 17.6 ~ 0.97** | **GAGAL** (lantai >=3) |
| Tipe musuh | **2** (mole, treant) | **GAGAL** (lantai >=5) |
| Reward/item | **0** (tak ada item sama sekali; hanya exit) | **GAGAL** |
| Destructible | **0** | **GAGAL** |
| Boss | **tidak ada** | **GAGAL** |

Sebaran musuh aktual (tile coords, dari `Object Layer`):
```
gid6 mole:   (35,6) (14,31) (2,37) (41,24) (53,18) (18,18) (16,11)
             (14,6) (48,5) (34,42) (49,26) (46,19)
gid5 treant: (57,38) (15,23) (7,15) (21,32) (35,15)
```
Banyak layar **kosong sama sekali** (mis. seluruh blok tile x=22..33, y=0..10 tanpa musuh).

> **KESIMPULAN YANG HARUS DIWARISI TEMA INI:** *ForestRPG asli terasa sepi — ~1 musuh/layar, nol
> item, nol destructible, nol boss. Tema ini WAJIB jauh lebih padat. Angka asli dipakai sebagai
> CONTOH KEGAGALAN, bukan target.*

### 3.2.b Beat-sheet Zelda-like — target kepadatan yang ditiru

Disusun dari analisis desain dungeon *A Link to the Past* & *Zelda 1* overworld (sumber §3.6).
Pola per-ruang yang konsisten di seri Zelda:

| # | Beat (per ruang) | Isi kanonik Zelda | Terjemahan ke tema ini |
|---|---|---|---|
| 1 | **Entry read** | pemain masuk, seluruh ruang terlihat sekaligus (no scroll) | kamera snap ke ruang; semua ancaman on-screen |
| 2 | **Ancaman langsung** | 2–6 musuh sudah aktif di ruang | >=3 musuh (normal) |
| 3 | **Objek interaktif** | pot/semak/batu bisa diangkat/dipotong | semak & pot **destructible** >=2/ruang |
| 4 | **Rintangan navigasi** | tangga, jurang, air, blok dorong | >=1 rintangan per ruang |
| 5 | **Reward tersembunyi** | rupee di bawah semak, rahasia di dinding | drop dari destructible; peti rahasia |
| 6 | **Gate** | pintu terkunci / musuh harus habis | pintu area terkunci sampai kepingan area diambil |
| 7 | **Lock-and-key** | kunci kecil dari musuh/peti membuka pintu | kunci area dari mini-encounter |
| 8 | **Item gimmick mid-dungeon** | busur/boomerang di tengah dungeon | Panah Api (A3), Sepatu Cepat (A4) |
| 9 | **Boss = ujian item** | boss dikalahkan pakai item dungeon itu | Ent lemah terhadap Panah Api |

**Ekstraksi angka lantai dari beat-sheet:**
- Beat #2 -> **>=3 musuh/ruang** (zona tempur)
- Beat #3 -> **>=2 destructible/ruang**
- Beat #4 -> **>=1 rintangan navigasi/ruang**
- Beat #5 -> **reward tiap <=2 ruang**
- Beat #1 -> **0 ruang kosong** (dead air = ruang tanpa apa pun)

## 3.3 LANTAI KEPADATAN "NO DEAD AIR" (ber-angka, ditegakkan validator)

> Untuk arketipe top-down, **"segmen" = 1 RUANG** (bukan viewport side-scroll). Sesuai pemetaan
> arketipe di `density-engine.md` §6 baris *Top-down*.

| Metrik | Lantai (minimum WAJIB) | Easy | Normal | Hard |
|---|---|---|---|---|
| **Musuh aktif / ruang** (non-safe) | >=3 | 3 | 4 | 6 |
| **Destructible / ruang** (semak, pot, batu rapuh) | >=2 | 2 | 3 | 3 |
| **Rintangan navigasi / ruang** (batu, air, celah) | >=1 | 1 | 1 | 2 |
| **Dekorasi statis / ruang** (pohon, bunga, jamur, tunggul) | >=6 | 6 | 6 | 6 |
| **Ambient motion / ruang** (kunang-kunang, daun jatuh, riak air, kabut) | >=1 | 1 | 1 | 1 |
| **Reward cadence** | <=2 ruang tanpa reward | 2 | 2 | 3 |
| **Dead air maksimum** | **0 ruang** boleh kosong-total | 0 | 0 | 0 |
| **Tipe musuh (pool total)** | >=5 tipe | 5 | 6 | 6 |
| **Tipe musuh per ruang** | <=2 tipe | 2 | 2 | 2 |

**Aturan tambahan:**
- **Safe zone**: ruang `A1-R1` + ruang pelaminan dikecualikan dari kuota **musuh saja**.
  Dekorasi, destructible, & ambient **tetap wajib** — ruang awal pun tak boleh kosong.
- **Ruang koridor TIDAK diizinkan.** Bila generate menghasilkan ruang yang hanya jalan lewat,
  isi dengan destructible + 1 musuh patroli, atau gabungkan ke ruang tetangga.
- Slot pola yang tidak terisi kepingan -> **isi filler**: semak berisi hati kecil / bunga skor.

## 3.4 Pacing template per area

```
Start -> Teach -> Practice -> Test -> Reward -> Gate
 R1       R2       R3-R4      R5-R7   R8       R9
```

Kurva **sawtooth** (bukan ramp lurus) — tiap area punya puncak & lembah:

```
  intensitas
  ^
6 |              /\                      /-\
5 |        /\   /  \          /\        /   \
4 |   /\  /  \ /    \   /\   /  \   /\ /     \
3 |  /  \/    X      \ /  \ /    \ /  X       \
2 | /                 X    X      X            \
1 |/   (lembah tetap TERISI: dekorasi+destructible+reward)
  +--------------------------------------------------> ruang
   A1        A2        A3      A4      A5        A6(boss)
                              ^
                        breather area
                        (Ladang Bunga)
```

**Lembah != kosong.** Ruang breather tetap punya >=2 destructible + reward + dekorasi penuh.

## 3.5 Struktur ruang (grid & pintu)

Tiap area = grid ruang. Pintu antar-ruang di tengah sisi:

```
  Satu RUANG (11x15 tile = 176x240 px, POTRET)
  +-----------+-+-----------+
  |###########| |###########|   # = dinding pohon (solid)
  |#. . . . . . . . . . . .#|   . = tanah bisa dilalui
  |#. F .  O  . . F . . . .#|   F = dekorasi   O = batu (rintangan)
  +-+. . . . B . . . . . .+-+   B = semak (destructible)
  | |. . m . . . . T . . .| |   m = mole      T = treant
  | |. . . . . P . . . . .| |   P = peti kepingan
  +-+. . . . . . . . B . .+-+
  |#. F . . O . . . . F . .#|
  |#. . . . . . . . . . . .#|
  |###########| |###########|
  +-----------+-+-----------+
   pintu di tengah tiap sisi (lebar 2 tile)
```

- **Pintu**: lebar **2 tile (32px)**, di tengah sisi. Player masuk -> kamera snap ke ruang baru,
  player muncul di sisi berlawanan **offset 24px ke dalam** (jangan tepat di ambang -> langsung
  balik/bolak-balik).
- **Dinding**: 1 tile pohon rapat di tepi ruang, kecuali di pintu.

## 3.6 Sumber riset

- Zelda Dungeon — *Don't Leave the House: Analyzing Dungeons in A Link to The Past*
- GameDeveloper — *Enemy Design in Link to the Past*
- Medium (Bramasole) — *The Ultimate Methodology of creating Zelda-like Dungeon Level*
- Source code ForestRPG (`map.json`, `GameScene.js`, `constants.js`) — **diukur langsung**, §3.2.a

> **Golden Rule §3:** *Satu ruang tak boleh bisa dilewati tanpa pemain berinteraksi dengan apa
> pun. >=3 musuh + >=2 destructible + >=1 rintangan + >=6 dekorasi + >=1 ambient. Ruang kosong =
> REGENERATE, bukan diluluskan.*

---

# §4 — PLAYER SYSTEM

## 4.1 Arsitektur

```js
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 't_player_idle_down');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setSize(10, 12).setOffset(3, 8);   // hitbox < sprite (forgiving)
    this.state   = 'idle';       // idle|walk|shoot|hurt
    this.facing  = 'down';       // up|down|left|right
    this.invulnUntil = 0;
    this.shootCdUntil = 0;
  }
}
```

**Hitbox < sprite** (10x12 pada sprite 16x16) — Zelda klasik memakai hitbox pemaaf agar tamu tak
merasa "kena padahal tidak kena".

## 4.2 State machine

```
                    +---------+
          +-------->|  IDLE   |<---------+
          |         +----+----+          |
          |              | input arah    | vel=0 & cd habis
          |              v               |
          |         +---------+          |
          |         |  WALK   |----------+
          |         +----+----+
          |              | tombol panah
          |              v
          |         +---------+   0.25s
          +---------|  SHOOT  |----------+
          |         +---------+          |
          |                              |
          |         +---------+          |
          +---------|  HURT   |<---------+ overlap musuh
        0.35s       +---------+           (& now > invulnUntil)
```

| State | Durasi | Bisa gerak? | Bisa tembak? | Keluar ke |
|---|---|---|---|---|
| `idle` | — | ya | ya | walk / shoot |
| `walk` | — | ya | ya | idle / shoot |
| `shoot` | 250 ms | **tidak** (vel=0) | tidak | idle |
| `hurt` | 350 ms | tidak (knockback) | tidak | idle |

> **Catatan desain:** ForestRPG asli juga mengunci gerak saat menembak (`player.setVelocity(0)`
> sebelum `new Arrow`). Kita pertahankan — memberi bobot pada tembakan.

## 4.3 Fisika & angka (top-down, gravity = 0)

```js
const PLAYER = {
  SPEED:         92,     // px/s  (asli 50 = terlalu lambat utk mobile; 92 terasa gesit)
  SPEED_BOOTS:  128,     // setelah item Sepatu Cepat (A4)
  ARROW_SPEED:  300,     // asli 270
  SHOOT_CD_MS:  250,     // cooldown antar panah
  SHOOT_LOCK_MS:250,     // durasi state shoot (vel=0)
  INVULN_MS:   1200,     // asli 2000 = terlalu lama (terasa lumpuh); 1200 cukup
  KNOCKBACK:    150,     // px/s, arah menjauh dari musuh
  KNOCKBACK_MS: 350,
  ARROW_LIFETIME_MS: 900,
};
// GRAVITY = 0 (top-down). physics.arcade.gravity = {x:0, y:0}
```

**Kenapa diubah dari asli:**
- `SPEED 50 -> 92`: pada zoom tinggi + ruang 240px, 50px/s butuh ~5 detik menyeberangi ruang —
  terlalu lamban, terasa "berat". 92px/s = ~2.6 detik.
- `INVULN 2000 -> 1200`: 2 detik kedip + tak bisa apa-apa terasa seperti hukuman.

**Gerak 4-arah (bukan 8-arah):** konsisten dengan aset Ansimuz (4 arah animasi) dan input asli
ForestRPG (`if right / else if left / else if up / else if down`). Diagonal **tidak** didukung —
menghindari kebutuhan sprite diagonal yang tak ada di pack.

```js
// Normalisasi: hanya SATU sumbu aktif (prioritas horizontal, seperti ForestRPG asli)
if (input.right)      { vx =  SPEED; facing='right'; }
else if (input.left)  { vx = -SPEED; facing='left';  }
else if (input.up)    { vy = -SPEED; facing='up';    }
else if (input.down)  { vy =  SPEED; facing='down';  }
else                  { vx = vy = 0; }
```

## 4.4 ANIMASI per-state (WAJIB — jangan sprite statis)

Pack Ansimuz menyediakan 4-arah; ForestRPG asli memakai **6 frame @ frameRate 6**. Kita naikkan
ke **8 fps** agar terasa lebih hidup.

| Anim key | Frames | fps | Repeat | Dipakai saat |
|---|---|---|---|---|
| `p_idle_down` | 2 | 3 | -1 | idle, facing down (napas) |
| `p_idle_up` | 2 | 3 | -1 | idle, facing up |
| `p_idle_side` | 2 | 3 | -1 | idle, facing left/right (flipX) |
| `p_walk_down` | 6 | 8 | -1 | walk, facing down |
| `p_walk_up` | 6 | 8 | -1 | walk, facing up |
| `p_walk_side` | 6 | 8 | -1 | walk, facing left/right (flipX) |
| `p_shoot_down` | 3 | 12 | 0 | shoot (recoil + tarik busur) |
| `p_shoot_up` | 3 | 12 | 0 | shoot |
| `p_shoot_side` | 3 | 12 | 0 | shoot |
| `p_hurt` | 2 | 10 | 0 | hurt (flash merah) |

**Left/right pakai satu set + `setFlipX`** — persis pola ForestRPG asli (`IDLE_FRAMES` memetakan
LEFT dan RIGHT ke frame `hero-idle-side` yang sama).

**WAJIB guard re-inject:**
```js
if (!scene.anims.exists('p_walk_down')) { scene.anims.create({...}); }
```

## 4.5 Input abstraction

Satu model input; keyboard & touch di-OR:

```js
function readInput(scene) {
  const k = scene.cursors, j = scene.joy;   // joy = virtual joystick state
  return {
    left:  k.left.isDown  || j.left,
    right: k.right.isDown || j.right,
    up:    k.up.isDown    || j.up,
    down:  k.down.isDown  || j.down,
    fire:  Phaser.Input.Keyboard.JustDown(k.space) || j.fireJustPressed,
  };
}
```

- Keyboard: panah + SPASI (sama dengan ForestRPG asli).
- Touch: joystick **kiri-bawah** + tombol PANAH **kanan-bawah** (§Z HUD map).
- **Hysteresis joystick**: ambang aktif 0.35 radius, ambang lepas 0.22 — mencegah flicker arah
  yang bikin animasi kedip.

## 4.6 Damage & i-frame (RAMAH — tanpa nyawa)

```js
hurtPlayer(player, enemy) {
  const now = this.time.now;
  if (now < player.invulnUntil) return;             // masih kebal
  if (this.cheat.on) return;                        // cheat = kebal total
  player.invulnUntil = now + PLAYER.INVULN_MS;
  player.state = 'hurt';
  // knockback menjauh dari musuh
  const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
  player.body.setVelocity(Math.cos(ang)*PLAYER.KNOCKBACK, Math.sin(ang)*PLAYER.KNOCKBACK);
  this.time.delayedCall(PLAYER.KNOCKBACK_MS, () => {
    player.body.setVelocity(0,0); player.state='idle';
  });
  // juice: flash + shake + SFX. TIDAK ADA pengurangan nyawa.
  this.cameras.main.shake(90, 0.012);
  player.setTint(0xff6666);
  this.time.delayedCall(PLAYER.INVULN_MS, () => player.clearTint());
}
```

**TIDAK ADA:** `health -= 1`, `if (health < 1) gameOver()`, scene `GameOverScene`.
Semua itu ada di ForestRPG asli dan **dibuang** (§0.3, §8).

> **Golden Rule §4:** *4 arah, hitbox pemaaf, tembak mengunci gerak 250ms, kena = knockback +
> i-frame 1200ms. Tak ada nyawa, tak ada mati. Tiap state punya animasinya sendiri.*

---

# §5 — ENEMY / OBSTACLE SYSTEM

## 5.1 Pool musuh — 6 tipe (asli hanya 2)

ForestRPG asli hanya punya **mole** & **treant**, keduanya bergerak lurus memantul
(`body.bounce.set(1)`, velocity konstan). Itu terlalu miskin (§3.2.a). Kita perluas jadi **6 tipe**
dengan peran berbeda, tetap memakai basis art CC0 (varian warna/skala dari 2 sprite dasar +
2 sprite baru).

| # | Tipe | Peran | HP | Speed | Gerak | Damage | Basis art |
|---|---|---|---|---|---|---|---|
| 1 | **Mole** | rusher vertikal | 1 | 60 | patroli vertikal, memantul | 1 | `mole` pack |
| 2 | **Treant** | blocker horizontal | 2 | 34 | patroli horizontal, lambat & tebal | 1 | `treant` pack |
| 3 | **Mole Penggali** | ambusher | 1 | 0 -> 78 | menggali; muncul saat player <=64px, telegraph 0.5s | 1 | `mole` + partikel tanah |
| 4 | **Treant Tua** | ranged | 3 | 0 | statis, melempar biji tiap 2.2s ke arah player | 1 | `treant` recolor gelap |
| 5 | **Kunang Api** | flyer | 1 | 86 | melayang mengejar player (lerp 0.02), abaikan rintangan | 1 | sprite baru (bola cahaya) |
| 6 | **Akar Duri** | hazard statis | - | 0 | muncul-tenggelam siklus 1.6s (0.8s aktif) | 1 | sprite baru (duri) |

**Aturan komposisi:**
- **<=2 tipe per ruang** (sweet spot Zelda — lebih dari itu ruang jadi bising & tak terbaca).
- **Pool besar lintas area** — tiap area memakai subset berbeda (APPENDIX C).
- Tipe #3–#6 **hanya muncul setelah diperkenalkan** di ruang ajar area masing-masing (§1.2).

## 5.2 AI state machine per tipe

### Mole / Treant (patroli memantul — warisan ForestRPG)
```
  +---------+  kena dinding/batu  +---------+
  | PATROL  |-------------------->| BOUNCE  |
  |  (vel   |<--------------------| (balik  |
  |  tetap) |                     |  arah)  |
  +----+----+                     +---------+
       | kena panah
       v
  +---------+
  |  DIE    | -> partikel + SFX + destroy
  +---------+
```
Implementasi: `body.bounce.set(1)` + `setCollideWorldBounds(true)` + collider ke layer dinding.
(Persis pola asli — sederhana & terbaca.)

### Mole Penggali (ambusher)
```
  +----------+ dist<=64px  +-----------+  0.5s  +---------+
  | BURIED   |------------>| TELEGRAPH |------->| CHASE   |
  | (alpha 0,|             | (partikel |        | (kejar  |
  |  no body)|             |  tanah)   |        |  0.9s)  |
  +----------+             +-----------+        +----+----+
       ^                                             | 0.9s habis
       +---------------------------------------------+
```
> **WAJIB:** selama `BURIED`, body **disabled** (`body.enable = false`) — bukan `setActive(false)`
> pada sprite yang masih harus di-update. Musuh terkubur **tidak boleh bisa kena panah** (§5.4).

### Treant Tua (ranged)
```
  +--------+  tiap 2200ms  +---------+  0.6s telegraph  +--------+
  |  IDLE  |-------------->| WIND-UP |----------------->|  FIRE  |
  | (goyang|               | (badan  |                  | (biji  |
  |  pelan)|<--------------|  mundur)|                  | ke plr)|
  +--------+               +---------+                  +--------+
```
Biji: speed 130 px/s, **aim ke posisi player saat fire** (bukan arah tetap), lifetime 2.5s.

### Kunang Api (flyer)
```js
// mengejar dengan lerp lembut (bukan homing sempurna -> bisa dihindari)
const ang = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);
e.body.setVelocity(Math.cos(ang)*86, Math.sin(ang)*86);
// TIDAK di-collider ke dinding (terbang di atas rintangan)
```

### Akar Duri (hazard)
```
ACTIVE (0.8s, body enable, sprite naik) <-> HIDDEN (0.8s, body disable, sprite turun)
```
Telegraph: 0.2s sebelum ACTIVE, tanah retak (sprite crack) muncul.

## 5.3 SPAWN — untuk top-down room-based, spawn = PER-RUANG (bukan relatif-kamera)

> **Catatan penting soal aturan `layout-camera-hardwon.md` §23.** Aturan "spawn relatif-kamera
> (`cam.scrollX + BW >= triggerX`)" ditulis untuk **side-scroller**. Untuk top-down room-based,
> **padanannya adalah spawn per-ruang**, dan invarian keamanannya SAMA:

**INVARIAN WAJIB (dan alasannya):**
1. **Musuh di ruang yang belum dimasuki = DATA INERT.** Simpan sebagai record
   `{room, type, tx, ty}`. **JANGAN** `enemies.create()` untuk seluruh peta saat load.
   (ForestRPG asli melakukan ini — `populateEnemies()` men-spawn **semua 17 musuh sekaligus** dari
   object layer saat `create()`. Di sana tak berakibat fatal karena panah di-cull oleh
   `worldView.contains()`, tapi polanya rapuh dan tidak kita ikuti.)
2. **Musuh di-instantiate saat `enterRoom(roomId)`** dipanggil; **di-destroy saat keluar ruang**.
3. **Musuh non-aktif tidak punya body/hitbox sama sekali** -> mustahil kena panah.
4. **Panah di-despawn saat keluar batas RUANG aktif** (bukan batas dunia):
   ```js
   if (!this.roomRect.contains(arrow.x, arrow.y)) arrow.destroy();
   ```
   Ini menutup bug "panah membunuh musuh di ruang sebelah yang belum terlihat".
5. **Hit-detection hanya atas musuh AKTIF** (`e.active && e.body && e.body.enable`).

```js
// Spawn per-ruang (Phaser 3.80.1)
enterRoom(roomId) {
  this.enemies.clear(true, true);          // destroy penghuni ruang lama
  this.arrows.clear(true, true);           // panah tidak menyeberang ruang
  const recs = this.level.enemiesByRoom[roomId] || [];
  recs.forEach(r => this.spawnEnemy(r.type, r.tx*TILE, r.ty*TILE));
  this.roomRect = this.rectOfRoom(roomId);
  this.snapCameraToRoom(roomId);
}
```

> **Verifikasi harness (WAJIB):** taruh musuh-record di ruang B; berdiri di ruang A; tembak ke arah
> ruang B -> **musuh TIDAK kena** (belum spawn). Masuk ruang B -> musuh muncul -> baru bisa kena.

## 5.4 Hit-detection panah vs musuh (anti-tembus + anti-tunnel)

Panah 300 px/s pada tile 16px berpotensi **tunneling** (300 * 0.016 = 4.8px/frame — aman), tapi
saat `SPEED_BOOTS`/lag frame bisa meleset. Terapkan dua jalur seperti `layout-camera-hardwon.md` §22:

```js
// 1) Overlap arrows x enemies DIDAFTARKAN SEBELUM collider arrows x walls
this.physics.add.overlap(this.arrows, this.enemies, this.hitEnemy, null, this);
this.physics.add.collider(this.arrows, this.wallLayer,
  (a) => a.destroy(),
  (a) => !this.arrowOverEnemy(a));        // process: jangan kill kalau lagi nimpa musuh

// 2) Sweep manual anti-tunnel tiap frame
manualArrowHits() {
  const list = this.enemies.getChildren();
  this.arrows.getChildren().forEach(a => {
    if (!a.active || !a.body) return;
    const vx=a.body.velocity.x, vy=a.body.velocity.y, dt=0.016;
    const x0=a.x-vx*dt, y0=a.y-vy*dt;                    // span 1 frame
    for (const e of list) {
      if (!e.active || !e.body || !e.body.enable) continue;   // terkubur = kebal
      if (this.segmentHitsAABB(x0,y0,a.x,a.y, e.body)) { this.hitEnemy(a,e); break; }
    }
  });
}

// 3) hitEnemy IDEMPOTEN (dipanggil dari 2 jalur -> jangan double-count)
hitEnemy(arrow, enemy) {
  if (!arrow.active || !enemy.active) return;
  arrow.destroy();
  enemy.hp -= 1;
  if (enemy.hp > 0) { enemy.setTint(0xffffff); this.time.delayedCall(80,()=>enemy.clearTint()); return; }
  this.killEnemy(enemy);
}
```

## 5.5 Difficulty knobs musuh

| Knob | Easy | Normal | Hard |
|---|---|---|---|
| Musuh/ruang | 3 | 4 | 6 |
| Speed multiplier | 0.82 | 1.0 | 1.18 |
| Treant Tua fire interval | 2800ms | 2200ms | 1600ms |
| Akar Duri siklus aktif | 0.6s | 0.8s | 1.0s |
| Kunang Api per ruang | 0 | <=1 | <=2 |

> **Golden Rule §5:** *6 tipe, <=2 per ruang, spawn PER-RUANG (musuh di ruang lain tak ber-hitbox),
> panah mati di batas ruang, hit lewat overlap + sweep manual yang idempoten.*

---

# §6 — INTERACTION & COLLISION MATRIX

| A | B | Jenis | Hasil |
|---|---|---|---|
| Player | Wall layer | `collider` | blokir (separasi) |
| Player | Batu / rintangan | `collider` | blokir |
| Player | Enemy | `overlap` | `hurtPlayer` (knockback + i-frame 1200ms) — **tak ada nyawa** |
| Player | Enemy projectile (biji) | `overlap` | `hurtPlayer` + projectile destroy |
| Player | Akar Duri (ACTIVE) | `overlap` | `hurtPlayer` |
| Player | **Peti kepingan** | `overlap` | `openChest` -> `unlockInfo(key)` (§X) |
| Player | Item (hati/bunga/boots/panah api) | `overlap` | `collectItem` |
| Player | Pintu ruang | `overlap` | `enterRoom(next)` |
| Player | **Gerbang Gunung** | `overlap` | jika `allPiecesCollected()` -> boss; else toast "gerbang masih tertutup" |
| Arrow | Enemy | `overlap` (didaftar **duluan**) | `hitEnemy` |
| Arrow | Wall / batu | `collider` + processCallback | destroy panah (kecuali sedang nimpa musuh) |
| Arrow | **Destructible** (semak/pot) | `overlap` | pecah + partikel + kemungkinan drop |
| Arrow | Boss | **cek MANUAL tiap frame** (§D) | `hitBoss` |
| Enemy | Wall layer | `collider` | bounce (balik arah) |
| Enemy | Enemy | *tak ada* | sengaja — hindari macet saling dorong |
| Kunang Api | Wall | *tak ada* | terbang di atas rintangan |

**Aturan damage:**
- Damage ke player **selalu 1 "hit"** — tapi tak ada HP, hanya knockback + i-frame. Efeknya:
  kehilangan waktu & posisi, bukan progress.
- **i-frame berlaku untuk SEMUA sumber** (musuh, biji, duri) — satu timer `invulnUntil`.
- **Cheat ON = kebal total** (return awal di `hurtPlayer`).

---

# §7 — POWER-UP / ITEM SYSTEM

> **ATURAN KERAS: kepingan undangan BUKAN power-up.** Kepingan murni naratif/koleksi dan **tidak
> memberi buff gameplay apa pun**. Ini menjaga loop koleksi terpisah dari balancing (§6.5 SKILL).

| Item | Efek | Durasi | Ditemukan di | Usage window |
|---|---|---|---|---|
| **Bunga Skor** | +poin visual (partikel), tanpa efek mekanik | - | drop destructible | - |
| **Hati Kecil** | reset `invulnUntil` (kebal 2s) | 2s | drop destructible (20%) | - |
| **Panah Api** | panah menembus 1 musuh + damage 2 | permanen (area 3+) | `A3-R5` peti | **>=8 musuh + boss** setelahnya |
| **Sepatu Cepat** | `SPEED 92 -> 128` | permanen (area 4+) | `A4-R3` peti | **>=2 area** setelahnya |
| **Jimat Daun** | i-frame 1200 -> 1800ms | permanen (area 5+) | `A5-R6` peti | **area 5 + boss** |

## 7.1 Powerup Relevance Rule (WAJIB divalidasi)

> Tiap power-up **ofensif** wajib punya **usage window**: minimal 8 musuh atau 1 boss **setelah**
> titik ambilnya. Bila generate menempatkan Panah Api di ruang terakhir sebelum gerbang ->
> **pindahkan atau ganti dengan reward pasif**.

Cek di validator (APPENDIX E):
```js
function validatePowerupRelevance(level) {
  const fails = [];
  for (const p of level.powerups.filter(p => p.offensive)) {
    const after = level.enemiesAfterRoom(p.room);
    const bossAfter = level.bossRoom > p.room;
    if (after < 8 && !bossAfter) fails.push(['powerup-no-window', p.id, after]);
  }
  return fails;
}
```

---

# §8 — DIFFICULTY SCALING

## 8.1 Filosofi: ini undangan, bukan shooter

**Default = EASY.** Tamu yang tidak memilih apa pun mendapat pengalaman paling ramah.

| | Easy (default) | Normal | Hard |
|---|---|---|---|
| Musuh/ruang | 3 | 4 | 6 |
| Speed musuh | x0.82 | x1.0 | x1.18 |
| i-frame player | 1500ms | 1200ms | 1000ms |
| Boss HP | 24 | 32 | 44 |
| Boss fire rate | 2.4s | 1.8s | 1.3s |
| Kunang Api | tidak muncul | <=1/ruang | <=2/ruang |

## 8.2 Yang TIDAK ADA (dibuang dari ForestRPG asli)

- ❌ Sistem nyawa (`health`, `hp1/hp2/hp3` sprite hati)
- ❌ Game-over (`GameOverScene`)
- ❌ Skor & penalti (`scoreCalc -= 200`)
- ❌ Leaderboard (`LeaderBoardScene`, `scores.js`, localStorage skor)
- ❌ Balik ke awal saat kalah

**Konsekuensi:** tamu **tak bisa gagal**. Hanya bisa maju lebih lambat atau lebih cepat.

## 8.3 Kurva sawtooth

Difficulty naik per area, tapi **tiap area punya lembah**:

```
Area:      A1    A2    A3    A4(breather)  A5    A6(boss)
Intensitas: 2  -> 4  -> 5  ->     3     -> 6  ->   7
                                  ^
                          sengaja turun sebelum puncak
```

Area 4 (Ladang Bunga) = **breather wajib** — musuh sedikit, dekorasi paling cerah, banyak reward.
Tapi **tetap lolos lantai kepadatan** (>=3 musuh Easy, >=2 destructible, dst).

## 8.4 Dialog pilih kesulitan — WAJIB tombol OK

> `layout-camera-hardwon.md` §14 — jangan auto-apply on-click.

```
  +-- PILIH AREA & KESULITAN --------+
  | [MUDAH*] [SEDANG] [SULIT]        |  <- klik = highlight saja (pendingDiff)
  | [1][2][3][4][5][6]               |  <- klik = highlight saja (pendingArea)
  |            [ OK ]  [BATAL]       |  <- OK = commit & mulai
  +----------------------------------+
```
Overlay stage-select **memuat picker kesulitan sekaligus** (§8 hardwon) — class `.diff-opt` sama
dengan cover, satu handler `pickDiff()`.

> **Golden Rule §8:** *Default EASY. Tanpa nyawa, tanpa game-over, tanpa skor. Kesulitan hanya
> mengubah kepadatan & kecepatan, tak pernah mengubah "bisa gagal atau tidak".*

---

# §9 — CAMERA & READABILITY (top-down room-based)

## 9.1 Model kamera: ROOM SNAP (bukan follow bebas)

> **Catatan vs `layout-camera-hardwon.md` §1.** Aturan `setFollowOffset(-0.40*BW)` adalah aturan
> **side-scroller** (dorong player ke kiri agar pandangan depan luas). Untuk top-down room-based,
> aturan itu **tidak berlaku** — padanannya adalah **room snap**, di mana **seluruh ruang terlihat
> sekaligus** sehingga "pandangan ke depan" 100% ke segala arah. Ini justru lebih kuat dari
> follow-offset dan merupakan pola kanonik Zelda.

```js
snapCameraToRoom(roomId) {
  const r = this.rectOfRoom(roomId);              // {x,y,w=240,h=176}
  const cam = this.cameras.main;
  cam.stopFollow();
  this.tweens.add({
    targets: cam, scrollX: r.x, scrollY: r.y,
    duration: 350, ease: 'Quad.easeInOut',
  });
  cam.setBounds(r.x, r.y, r.w, r.h);              // kunci ke ruang ini
}
```

- **Transisi 350ms** dengan easing — cukup cepat agar tak membosankan, cukup lambat agar tamu
  paham "saya pindah ruang".
- Selama transisi: **input player dikunci**, musuh dibekukan.

## 9.2 Zoom — dihitung, jangan hardcode

ForestRPG asli memakai `setZoom(3.5)` untuk canvas 800x600. Kita memakai frame potret 540x960 dan
ruang 176x240 px (potret), jadi zoom **dihitung**:

```js
// Ruang harus muat penuh di area game (di atas zona kontrol)
const VIEW_W = BW;                       // 540
const VIEW_H = BH - CONTROL_ZONE_H;      // 960 - 200 = 760  (§S ground rule)
const zoom = Math.min(VIEW_W / ROOM_PX_W, VIEW_H / ROOM_PX_H);   // min(540/176, 760/240)
                                                                  // = min(3.07, 3.17) = 3.07
cam.setZoom(Math.max(1, Math.floor(zoom)));   // BULAT -> 3
cam.setRoundPixels(true);
```

**Hasil:** ruang tampil `528 x 720 px` → mengisi **98% lebar & 95% tinggi** area main.

> ### ⚠️ BUG YANG SUDAH DIBAYAR: ruang LANDSCAPE di frame POTRET
>
> Versi awal memakai ruang **15x11 tile (240x176 px = landscape)** di dalam frame **potret**
> (540x760). Hasilnya zoom terkunci oleh lebar (`540/240 = 2.25`), sehingga tinggi ruang hanya
> `176 x 2.25 = 396px` dari 760px → **ruang cuma mengisi 52% tinggi layar, 364px kosong**.
> Gejala yang dilaporkan: *"gamenya tidak sesuai dengan screen-nya"*.
>
> **Aturan:** **bentuk ruang HARUS mengikuti orientasi frame.** Frame potret → ruang potret
> (`ROOM_W < ROOM_H`). Hitung dulu: `roomPx * zoom` harus ≥ ~90% dari viewport pada KEDUA sumbu.
> Kalau salah satu sumbu < 70%, orientasi ruangnya salah — bukan zoom-nya yang perlu ditambal.
>
> **WAJIB zoom BILANGAN BULAT** untuk pixel-art (bukan kelipatan 0.25). Zoom pecahan membuat tile
> ter-sample setengah piksel → **garis jahitan antar-tile + sprite buram**. Tambah
> `setRoundPixels(true)`.

> **JANGAN** baca `this.scale.width/height` di `create()`. Ukur parent via `getBoundingClientRect()`
> dan pass width/height tetap ke config (APPENDIX T — trap ukuran-0).

## 9.3 Aturan keterbacaan

- **Seluruh ancaman ruang terlihat saat masuk** — tak ada musuh di luar layar dalam ruang aktif.
- **Telegraph wajib** untuk semua serangan: Mole Penggali 0.5s partikel tanah, Treant Tua 0.6s
  wind-up, Akar Duri 0.2s tanah retak.
- **Tak ada "blind corner"**: batu/rintangan tidak boleh menutupi musuh sepenuhnya dari sudut masuk
  pemain (validator memeriksa garis pandang dari tiap pintu).
- **Depth sorting**: `sprite.setDepth(sprite.y)` tiap frame untuk player/musuh/pohon agar objek di
  belakang tergambar di belakang (pola standar top-down).

```js
// depth sort top-down (jalankan di update untuk entity bergerak)
this.depthSorted.forEach(o => o.setDepth(o.y));
```

> **Golden Rule §9:** *Satu ruang = satu layar penuh, kamera snap dengan tween 350ms, zoom dihitung
> & di-snap ke 0.25. Seluruh ancaman terlihat saat masuk. Depth = y.*

---

# §10 — GAME FEEL / JUICE + GRAFIS

## 10.1 Tabel juice (ber-angka)

| Event | Efek (stack di frame yang sama) |
|---|---|
| **Panah lepas** | recoil sprite 2px berlawanan arah (tween 80ms) + SFX pitch-vary ±8% + muzzle spark 3 partikel |
| **Panah kena musuh** | freeze-frame **3 frame (50ms)** + `cam.shake(60, 0.008)` + tint putih 80ms + 6 partikel |
| **Musuh mati** | `cam.shake(90, 0.012)` + 12 partikel warna musuh + sprite scale 1->1.3->0 (tween 180ms) + SFX |
| **Destructible pecah** | 8 partikel daun/pecahan + SFX + kemungkinan drop item |
| **Player kena** | `cam.shake(90, 0.012)` + `cam.flash(60, 255,80,80)` + tint merah + knockback |
| **Ambil item** | sprite naik 12px + fade (tween 300ms) + SFX naik-nada + 5 partikel kuning |
| **AMBIL KEPINGAN** | **freeze 5 frame** + `cam.flash(120, 255,220,140)` + 20 partikel emas + sprite terbang ke ikon indikator (tween 600ms) + toast + SFX fanfare pendek |
| **Ruang bersih** | 4 partikel di tiap sudut + SFX lembut |
| **Gerbang terbuka** | `cam.flash(400)` + shake 300ms + partikel emas dari gerbang |
| **Boss kena** | freeze 4 frame + shake 0.015 + HP bar turun (tween 150ms) |
| **Boss kalah** | shake 600ms 0.03 + 40 partikel + slow-mo (`timeScale` 0.4 selama 800ms) |

> `cam.shake` intensity = **float kecil** (0.008–0.03), **bukan piksel** (APPENDIX T gotcha #2).

## 10.2 Partikel — API 3.80.1 (JANGAN pakai `createEmitter`)

```js
// BENAR (3.60+)
const em = this.add.particles(0, 0, 't_spark', {
  speed: { min: -140, max: 140 },
  scale: { start: 0.9, end: 0 },
  lifespan: 500,
  blendMode: 'ADD',
  emitting: false,           // explode-only
});
em.explode(12, x, y);
// em.destroy() saat shutdown

// SALAH -> throw di 3.80.1:
// this.add.particles('spark').createEmitter({...})
```

**Cap performa mobile:** `maxAliveParticles: 120` global; prefer `explode()` ketimbang flow.

## 10.3 Transisi antar-AREA — sinematik, bukan tombol "Lanjut"

```
1. Layar: banner in-canvas "AREA 1 SELESAI" (fade in 300ms)
2. Player berjalan sendiri ke pintu (flag autoWalk, input DIKUNCI, player kebal)
3. Fade out 400ms
4. Area baru di-load; player masuk dari sisi seberang (tween 500ms)
5. Banner nama area baru "HUTAN DALAM" (fade 300ms, hilang 1.2s)
6. Input dibuka
```

**Scene TIDAK di-pause** — state machine `clearSeq` berjalan di `update()`. Dunia dibekukan
(`enemiesFrozen = true`), player kebal selama outro.

> **JEBAKAN (memory `theme-intro-reexec-bug`):** jangan taruh timer intro di `cleanupFns`. Host
> me-re-execute JS saat `isOpened` berubah -> intro bisa ter-cancel. Simpan progress area di
> `window.__frpgStarted` dan **cek cover** sebelum auto-resume (§Z.4).

## 10.4 GRAFIS — PNG sprite sheet (utama) + prosedural (fallback)

**Jalur utama: aset PNG CC0** (APPENDIX P). Jalur fallback: prosedural ber-shading.

**Aturan shading fallback prosedural (bila slot aset kosong):**
```js
function box(g,x,y,w,h,base,hi,sh){
  g.fillStyle(base,1); g.fillRect(x,y,w,h);
  if(hi!=null){ g.fillStyle(hi,1); g.fillRect(x,y,w,Math.max(1,h*0.22|0)); }
  if(sh!=null){ g.fillStyle(sh,1); g.fillRect(x,y+h-(h*0.22|0),w,Math.max(1,h*0.22|0)); }
}
function outline(g,x,y,w,h){ g.lineStyle(1,0x1a2416,1); g.strokeRect(x,y,w,h); }
```
Tiap sprite = **base + highlight (top 22%) + shadow (bottom 22%) + outline gelap**.
Flat single-color = **belum selesai**.

**Guard texture (re-inject):**
```js
if (!this.textures.exists('t_player_idle_down')) { /* generate */ }
```

## 10.5 Backdrop & ambient per ruang

Tiap ruang WAJIB punya (lantai §3.3):
- **>=6 dekorasi statis**: pohon latar, bunga, jamur, tunggul, batu kecil, rumput tinggi
- **>=1 ambient motion**, pilih sesuai area:
  - A1/A2: kunang-kunang (3–5 partikel melayang lambat, `blendMode ADD`)
  - A3: kabut bergerak (`tileSprite` scroll 6px/s, alpha 0.35) + riak air
  - A4: kelopak bunga jatuh (partikel, gravity 12)
  - A5: debu tertiup (partikel horizontal)
  - A6: cahaya gerbang berdenyut (tween alpha 0.6<->1.0, 2s)

> **Golden Rule §10:** *Tiap aksi dibalas dalam 3 frame: freeze + shake + partikel + SFX + tint,
> ditumpuk di frame impact yang sama. Partikel pakai API 3.60+. Tiap ruang punya >=1 gerak ambient.*

---

# §11 — AUDIO DESIGN

## 11.1 ATURAN MUTLAK: nol file audio

- ❌ **JANGAN** menyertakan file audio apa pun (repo ForestRPG punya `ancient_path.mp3/ogg`,
  `hurt`, `item`, `slash`, `enemy-death` — **semua dibuang**, lisensi tak jelas + §Z musik).
- ❌ **JANGAN** memutar backsound tenant. `{{link_backsound_music}}` adalah milik **host**.
  Tema **hanya** boleh klik `#btn-toggle-music` & mirror ikon (§Z.3).

## 11.2 SFX game = Web Audio sintetis (bebas lisensi, bebas CORS, 0 byte)

```js
// Oscillator sederhana — tak ada file, tak ada lisensi, tak ada request jaringan
function sfx(type, freq, dur, vol) {
  if (!AC) return;                       // AudioContext, dibuat saat gesture pertama
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
  o.connect(g); g.connect(AC.destination);
  o.start(); o.stop(AC.currentTime + dur);
}
```

| SFX | type | freq | dur | vol | Pitch vary |
|---|---|---|---|---|---|
| Panah lepas | `square` | 620 | 0.07 | 0.05 | ±8% |
| Panah kena | `square` | 320 | 0.06 | 0.06 | ±6% |
| Musuh mati | `sawtooth` | 180 -> 80 (ramp) | 0.18 | 0.07 | ±10% |
| Destructible pecah | `square` | 240 | 0.09 | 0.05 | ±12% |
| Player kena | `sawtooth` | 140 | 0.22 | 0.08 | — |
| Ambil item | `sine` | 700 -> 1050 | 0.14 | 0.06 | — |
| **Ambil kepingan** | `sine` arpeggio 660/880/1180 | 0.10 tiap | 0.07 | — |
| Gerbang terbuka | `sine` 300 -> 900 sweep | 0.7 | 0.08 | — |
| Boss kalah | arpeggio 5 nada naik | 0.12 tiap | 0.09 | — |

**AudioContext WAJIB dibuat saat gesture pertama** (autoplay policy):
```js
document.addEventListener('pointerdown', function initAC(){
  if (!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  document.removeEventListener('pointerdown', initAC);
}, { once: true });
```

**Mute SFX** terpisah dari musik host — tombol sendiri, jangan pakai `#btn-toggle-music`.

> **Golden Rule §11:** *Nol file audio. SFX = oscillator Web Audio. Backsound tenant = milik host,
> tema hanya klik `#btn-toggle-music` dan mirror ikon.*

---

# §12 — ANTI-FRUSTRATION RULES

| Aturan | Angka | Kenapa |
|---|---|---|
| **No spawn-kill** | musuh dalam radius **96px** dari titik masuk player dibekukan **800ms** setelah `enterRoom` | tamu tak langsung kena begitu pintu dibuka |
| **Telegraph hazard pertama** | hazard pertama di tiap ruang wajib telegraph **+0.3s lebih lama** dari biasanya | ruang baru = belum hafal |
| **Pintu masuk aman** | radius **40px** dari tiap pintu **tak boleh** ada musuh/hazard saat generate | validator memeriksa |
| **Tak ada kepingan wajib-tersembunyi** | tiap kepingan terlihat dari >=1 posisi berjalan normal di ruangnya | tamu tak perlu menebak |
| **Tak ada softlock** | tiap ruang punya >=1 jalan keluar yang tak butuh item | validator `noSoftlock` |
| **i-frame generous** | 1200ms (Easy 1500ms) | tak "combo-death" |
| **Knockback tidak mendorong ke hazard** | cek posisi tujuan knockback; bila hazard, kurangi jarak | frustrasi berantai |
| **Hitbox pemaaf** | player 10x12 pada sprite 16x16 | terasa adil |
| **Progress permanen** | kepingan yang didapat **tak pernah** hilang, di-persist localStorage | tamu bisa tutup & buka lagi |
| **Reset butuh konfirmasi** | overlay konfirmasi sendiri (**bukan** `confirm()` native) | tak sengaja hapus progress |

## 12.1 Respawn — tidak ada, karena tidak ada kematian

Top-down tanpa jurang: **tak ada jatuh**, **tak ada mati**. Karena itu seluruh sistem
`findSafeRespawn()` (aturan side-scroller `layout-camera-hardwon.md` §17) **tidak diperlukan** —
padanannya sudah dipenuhi oleh "tanpa nyawa + knockback + i-frame".

Bila di masa depan ditambahkan air/jurang: player yang masuk air **didorong balik 24px** ke tile
darat terakhir + i-frame 600ms. **Bukan** kehilangan progress.

> **Golden Rule §12:** *Tamu tak boleh pernah kehilangan sesuatu yang sudah didapat. Kesalahan
> membuat kehilangan WAKTU, bukan PROGRESS.*

---

# APPENDIX A — PATTERN LIBRARY (24 pola ruang)

Tiap pola = layout satu ruang (11x15 tile, potret). ID: `R###` (Room). Generator memilih pola per ruang,
lalu mengisi entity sesuai kuota density (§3.3).

**Legenda ASCII:**
```
#=dinding pohon  .=tanah  O=batu  ~=air  B=semak(destructible)  F=dekorasi
m=slot musuh darat  f=slot musuh terbang  h=slot hazard  P=slot peti/kepingan
D=pintu  *=titik masuk aman (no-spawn radius 40px)
```

## A.1 Pola ONBOARDING (R001–R004)

### R001 — Bilik Awal (safe zone)
```
#####D#####
#.........#
#..F...F..#
D....*....D    Purpose: ruang pertama, mengajar gerak
#..B...B..#    Rules: 0 musuh; >=2 semak; >=6 dekorasi; panah petunjuk ke pintu
#..F...F..#    Chaining: selalu -> R002
#####D#####
```

### R002 — Latihan Panah
```
#####D#####
#....B....#
#..B...B..#    Purpose: mengajar panah (semak = target latihan)
D....*....D    Rules: 1 musuh lambat (Mole, speed x0.6); 4 semak mengelilingi
#..B...B..#    Chaining: -> R003/R005
#..F.F.F..#
#####D#####
```

### R003 — Peti Pertama
```
#####D#####
#..F...F..#
#....P....#    Purpose: mengajar peti kepingan (di TENGAH, tak mungkin terlewat)
D..m...m..D    Rules: 2 musuh mengapit peti; peti terlihat dari semua pintu
#..B...B..#    Chaining: -> R004+
#..F...F..#
#####D#####
```

### R004 — Koridor Berpenghuni
```
#####D#####
#.O.....O.#
#..B...B..#    Purpose: koridor yang TETAP padat (anti dead-air)
D..m.*.m..D    Rules: koridor TIDAK BOLEH kosong; >=2 musuh + >=2 semak
#..B...B..#
#.O.....O.#
#####D#####
```

## A.2 Pola TEMPUR (R005–R012)

### R005 — Kepungan Empat Sudut
```
#####D#####
#m..F.F..m#
#....B....#    Purpose: ancaman dari 4 arah; ajarkan berputar
D....*....D    Rules: 4 musuh sudut (Easy: 3); ruang tengah lapang
#....B....#    Chaining: jangan setelah R006 (dua-duanya padat)
#m..F.F..m#
#####D#####
```

### R006 — Lorong Batu
```
#####D#####
#.OO...OO.#
#..O.m.O..#    Purpose: rintangan navigasi; musuh sulit dihindari
D..*.....*D    Rules: >=6 batu; 3 musuh; sisakan >=2 tile lebar jalan
#..O.m.O..#    Chaining: -> R007/R010
#.OO.m.OO.#
#####D#####
```

### R007 — Penjaga Gerbang Kecil
```
#####D#####
#....T....#
#..B...B..#    Purpose: 1 musuh kuat (Treant hp2) + pengawal
D..m..*..mD    Rules: 1 Treant tengah + 2 Mole; pintu utara terkunci sampai bersih
#..B...B..#
#..F...F..#
#####D#####
```

### R008 — Sarang Penggali (ambush)
```
#####D#####
#.h.....h.#
#..F...F..#    Purpose: memperkenalkan Mole Penggali
D....*....D    Rules: 3 penggali (telegraph 0.5s WAJIB); tanah retak terlihat
#..F...F..#    Chaining: hanya setelah ruang ajar penggali
#.h.....h.#
#####D#####
```

### R009 — Menara Pelempar
```
#####D#####
#..T...T..#
#..O...O..#    Purpose: ranged (Treant Tua) di balik cover
D....*....D    Rules: 2 Treant Tua statis + 2 batu cover untuk PLAYER
#..B...B..#    Rules: player wajib punya >=1 cover; validator memeriksa
#..F...F..#
#####D#####
```

### R010 — Taman Duri
```
#####D#####
#.h.B.h.B.#
#..h...h..#    Purpose: hazard timing (Akar Duri siklus 1.6s)
D..*...*..D    Rules: >=4 duri; offset fase agar ada celah aman selalu
#..h...h..#    Rules: WAJIB ada jalur yang bisa dilewati tanpa kena (validator)
#.B.h.B.h.#
#####D#####
```

### R011 — Terbang Rendah
```
#####D#####
#....f....#
#..O...O..#    Purpose: Kunang Api (abaikan rintangan)
D..*.....*D    Rules: <=2 kunang (Normal 1); batu jadi cover semu (tak berguna vs flyer)
#..O...O..#    Rules: ajarkan bahwa terbang != terhalang
#....m....#
#####D#####
```

### R012 — Arena Campur
```
#####D#####
#m..B.B..m#
#..O...O..#    Purpose: puncak area — 2 tipe musuh sekaligus
D....*....D    Rules: TEPAT 2 tipe (<=2/ruang); 5-6 musuh (Hard)
#..O...O..#    Chaining: hanya sebagai puncak, jangan berturut
#m..B.B..m#
#####D#####
```

## A.3 Pola PUZZLE / EKSPLORASI (R013–R018)

### R013 — Peti Terkunci
```
#####D#####
#....P....#
#..O...O..#    Purpose: lock-and-key (kunci dari R014)
D..m..*..mD    Rules: peti butuh kunci; bila belum punya -> toast petunjuk arah kunci
#..B...B..#
#..F...F..#
#####D#####
```

### R014 — Pemegang Kunci
```
#####D#####
#..F...F..#
#....T....#    Purpose: musuh kuat menjatuhkan kunci (pola Zelda: enemy drops key)
D..m..*..mD    Rules: kunci drop dari Treant; WAJIB drop (bukan probabilitas)
#..B...B..#
#..F...F..#
#####D#####
```

### R015 — Semak Rahasia
```
#####D#####
#.BBB.BBB.#
#.BBB.BBB.#    Purpose: reward tersembunyi (pola Zelda: rupee di bawah semak)
D....*....D    Rules: 1 dari 12 semak menyembunyikan item; sisanya partikel
#.BBB.BBB.#    Rules: TIDAK boleh menyembunyikan KEPINGAN (§12 no mandatory-hidden)
#.BBB.BBB.#
#####D#####
```

### R016 — Jalan Air
```
#####D#####
#.~~~.~~~.#
#.~~~.~~~.#    Purpose: rintangan navigasi (air tak bisa dilalui)
D..*.....*D    Rules: jalur tengah selebar 2 tile; >=1 musuh terbang di atas air
#.~~~.~~~.#    Rules: air = ambient motion (riak) -> memenuhi kuota ambient
#.~~~.~~~.#
#####D#####
```

### R017 — Simpang Empat
```
#####D#####
#..F...F..#
#....B....#    Purpose: hub — 4 pintu, pemain memilih rute
D....*....D    Rules: 3 musuh; papan petunjuk kayu (dekorasi fungsional)
#....B....#    Chaining: 1 per area maksimum
#..F...F..#
#####D#####
```

### R018 — Ruang Item
```
#####D#####
#..O...O..#
#....P....#    Purpose: power-up utama (Panah Api / Sepatu / Jimat)
D..m..*..mD    Rules: 2 penjaga; item di atas alas batu (jelas "penting")
#..O...O..#    Rules: WAJIB tunduk Powerup Relevance Rule (§7.1)
#..F...F..#
#####D#####
```

## A.4 Pola KEPINGAN (R019–R021)

### R019 — Altar Kepingan
```
#####D#####
#.F.....F.#
#..OPO....#    Purpose: kepingan di altar, dijaga
D....*....D    Rules: kepingan di alas batu; 3 penjaga; TERLIHAT dari pintu manapun
#..B...B..#    Rules: mengambil = unlockInfo(key) -> ikon menyala, TIDAK auto-open
#.F.....F.#
#####D#####
```

### R020 — Kepingan Berpenjaga Kuat
```
#####D#####
#....T....#
#..B...B..#    Purpose: kepingan dilepas setelah mengalahkan penjaga
D....P....D    Rules: peti terkunci sampai Treant Tua kalah; telegraph jelas
#..B...B..#
#..m...m..#
#####D#####
```

### R021 — Kepingan Setelah Duri
```
#####D#####
#.h.h.h.h.#
#.........#    Purpose: kepingan di balik hazard timing
D....*..P.D    Rules: jalur aman WAJIB ada (validator); tak butuh item khusus
#.h.h.h.h.#
#..F...F..#
#####D#####
```

## A.5 Pola KHUSUS (R022–R024)

### R022 — Breather Ladang Bunga
```
#####D#####
#FFBFFBFF.#
#F.F.F.F.F#    Purpose: lembah pacing (Area 4)
D....*....D    Rules: musuh MINIMUM saja (3 Easy); dekorasi MAKSIMUM; 2 reward
#F.F.F.F.F#    Rules: TETAP lolos lantai density (bukan ruang kosong!)
#FFBFFBFF.#
#####D#####
```

### R023 — Gerbang Gunung (gate)
```
###########
#..OOGOO..#      G = Gerbang Gunung
#...OOO...#    Purpose: gate menuju boss
D....*....D    Rules: gerbang tertutup sampai allPiecesCollected()
#..B...B..#    Rules: bila belum lengkap -> toast "masih ada N kepingan"
#..F...F..#    Rules: TIDAK mengunci undangan (cheat/koleksi tetap bisa buka)
#####D#####
```

### R024 — Arena Boss (walk-in)
```
###################
#.................#
#.....  BOSS  ....#    Purpose: arena Ent Penjaga (APPENDIX D)
#.................#    Rules: KORIDOR WALK-IN >=1 layar sebelum arena
D......*..........#    Rules: boss INACTIVE sampai player.y <= arenaY
#..O...........O..#    Rules: 2-3 musuh penjaga di koridor (approach tak kosong)
#.................#
###################
```

## A.6 Pattern Chain Rules

| Aturan | Angka |
|---|---|
| Pola sama berturut-turut | **maks 2** (3x sama = regenerate) |
| Ruang puncak (R012) berturut | **maks 1**, wajib diikuti lembah |
| Ruang hazard (R010/R021) berturut | **maks 1** |
| Ruang hub (R017) per area | **maks 1** |
| Ruang safe (R001) per game | **tepat 1** (hanya A1-R1) |
| Jarak antar ruang kepingan | **>=2 ruang** |

## A.7 Level Generation Formula (% pola per area)

| Area | Onboarding | Tempur | Puzzle | Kepingan | Khusus |
|---|---|---|---|---|---|
| A1 Tepi Hutan | 45% | 30% | 10% | 15% | 0% |
| A2 Hutan Dalam | 0% | 55% | 25% | 20% | 0% |
| A3 Rawa | 0% | 45% | 35% | 20% | 0% |
| A4 Ladang (breather) | 0% | 25% | 25% | 20% | 30% (R022) |
| A5 Kaki Gunung | 0% | 60% | 20% | 20% | 0% |
| A6 Gerbang | 0% | 30% | 0% | 0% | 70% (R023/R024) |

> **Golden Rule APPENDIX A:** *24 pola, tiap pola sudah memenuhi lantai density-nya sendiri.
> Maks 2 pola sama berturut. Koridor pun berpenghuni.*

---

# APPENDIX B — ENTITY ENCYCLOPEDIA

## B.1 Player — Mempelai

```yaml
id: player
sprite: t_player_*  (4 arah x 4 state)
size_sprite: 16x16
hitbox: { w: 10, h: 12, offsetX: 3, offsetY: 8 }
speed: 92            # 128 dengan Sepatu Cepat
hp: null             # TIDAK ADA sistem HP
invuln_ms: 1200      # Easy 1500
states: [idle, walk, shoot, hurt]
facing: [up, down, left, right]     # 4 arah, TIDAK diagonal
shoot:
  cooldown_ms: 250
  lock_ms: 250       # vel=0 selama menembak
  projectile: arrow
death: tidak ada     # by design (§8.2)
collision:
  walls: collider
  enemies: overlap -> hurtPlayer (knockback + i-frame)
  chest: overlap -> openChest
  door: overlap -> enterRoom
```

**Kustomisasi mempelai:** sprite player memakai varian **jas** (pria) atau **gaun+kerudung**
(wanita). Pilihan di cover overlay: "MAIN SEBAGAI: [MEMPELAI PRIA] [MEMPELAI WANITA]".
Default: pria. Nama diambil dinamis: `val('groom_nickname')` / `val('bride_nickname')`.

## B.2 Musuh

### Mole (rusher vertikal)
```yaml
id: mole
hp: 1
speed: 60            # x diff multiplier
movement: patrol_vertical    # body.velocity.y = speed, bounce 1
damage: 1
sprite: t_e_mole_*  (walk_up/down/side, die)
hitbox: { w: 10, h: 10 }
kill_condition: 1 panah
drop: { hati: 0.10, bunga: 0.25 }
telegraph: tidak perlu (selalu terlihat)
```

### Treant (blocker horizontal)
```yaml
id: treant
hp: 2
speed: 34
movement: patrol_horizontal
damage: 1
sprite: t_e_treant_*
hitbox: { w: 12, h: 12 }
kill_condition: 2 panah (1 dgn Panah Api)
drop: { hati: 0.15, bunga: 0.30, kunci: kondisional (R014 = 1.0) }
special: hp2 -> tint putih saat hit pertama (feedback WAJIB)
```

### Mole Penggali (ambusher)
```yaml
id: mole_dig
hp: 1
speed: 0 -> 78
states: [BURIED, TELEGRAPH, CHASE]
trigger_radius: 64
telegraph_ms: 500          # partikel tanah, WAJIB
chase_ms: 900              # lalu kembali BURIED
damage: 1
body_enabled: false saat BURIED    # KRITIKAL: tak bisa kena panah saat terkubur
sprite: t_e_moledig_* (buried, emerge x3, chase)
```

### Treant Tua (ranged)
```yaml
id: treant_old
hp: 3
speed: 0                   # statis
fire_interval_ms: 2200     # Easy 2800, Hard 1600
windup_ms: 600             # WAJIB telegraph
projectile: { id: seed, speed: 130, lifetime_ms: 2500, aim: player_position_at_fire }
damage: 1
sprite: t_e_treantold_* (idle, windup, fire, hurt, die)
hitbox: { w: 14, h: 16 }
```

### Kunang Api (flyer)
```yaml
id: firefly
hp: 1
speed: 86
movement: chase_lerp       # angle ke player, tidak homing sempurna
collides_walls: false      # terbang di atas rintangan
damage: 1
sprite: t_e_firefly_* (fly x4, die)
hitbox: { w: 8, h: 8 }
max_per_room: { easy: 0, normal: 1, hard: 2 }
```

### Akar Duri (hazard statis)
```yaml
id: thorn
hp: null                   # TIDAK bisa dibunuh
cycle: { hidden_ms: 800, telegraph_ms: 200, active_ms: 800 }
damage: 1 (hanya saat ACTIVE)
body_enabled: hanya saat ACTIVE
sprite: t_hazard_thorn_* (hidden, crack, up x2)
rule: fase antar-duri di-offset -> selalu ada celah aman (validator)
```

## B.3 Objek

### Peti Kepingan
```yaml
id: chest_piece
sprite: t_piece_chest_* (closed, opening x3, open)
size: 16x16
locked: bool               # R013 butuh kunci
on_overlap: openChest -> unlockInfo(sectionKey)
rule: TIDAK auto-open modal (§X.4). Hanya: ikon nyala + toast + partikel + SFX
rule: sprite kepingan terbang ke ikon indikator (tween 600ms)
persist: unlocked[] di localStorage
```

### Destructible (semak / pot)
```yaml
id: bush | pot
hp: 1 (1 panah)
on_break: partikel 8 + SFX + drop roll
drop_table: { none: 0.55, bunga: 0.25, hati: 0.20 }
rule: >=2 per ruang (lantai density)
```

### Batu (rintangan)
```yaml
id: rock
static: true
collider: player + musuh darat (BUKAN flyer, BUKAN panah? -> panah kena & hancur)
sprite: t_env_rock
rule: >=1 rintangan navigasi per ruang
```

### Item
```yaml
bunga:  { effect: partikel skor visual, permanent: false }
hati:   { effect: invulnUntil = now + 2000, permanent: false }
panah_api: { effect: arrow damage 2 + pierce 1, permanent: true, area: 3 }
sepatu:    { effect: speed 92 -> 128, permanent: true, area: 4 }
jimat:     { effect: invuln 1200 -> 1800, permanent: true, area: 5 }
kunci:     { effect: buka 1 peti terkunci di area itu, consumed: true }
```

### Gerbang Gunung
```yaml
id: gate
states: [closed, opening, open]
condition: allPiecesCollected() || cheat.on
on_locked_touch: toast "Gerbang masih tertutup — N kepingan lagi"
on_open: cam.flash(400) + shake + partikel emas + SFX sweep
leads_to: arena boss (APPENDIX D)
```

> **Golden Rule APPENDIX B:** *Tiap entity punya spec lengkap: hp, speed, hitbox, state machine,
> telegraph, drop, kill condition. Musuh terkubur/tersembunyi WAJIB `body.enable=false`.*

---

# APPENDIX C — BIOME / AREA LIBRARY

## C.1 Tabel ringkas 6 area

| Area | Nama | Ruang | Palet langit/tanah | Enemy pool | Pattern priority | Item |
|---|---|---|---|---|---|---|
| A1 | **Tepi Hutan** | 9 | `#8fbf6a` / `#5a8f42` cerah | mole, treant | onboarding 45% | — |
| A2 | **Hutan Dalam** | 9 | `#4a7a3c` / `#3a5f30` teduh | mole, treant, mole_dig | tempur 55% | — |
| A3 | **Rawa Berkabut** | 9 | `#5a7a72` / `#3f5a52` kabut | treant_old, mole_dig, firefly | puzzle 35% | **Panah Api** |
| A4 | **Ladang Bunga** | 6 | `#a8d878` / `#7ab54a` cerah | mole, firefly | breather 30% | **Sepatu Cepat** |
| A5 | **Kaki Gunung** | 9 | `#8a7a6a` / `#6a5a4a` batu | treant, treant_old, thorn | tempur 60% | **Jimat Daun** |
| A6 | **Gerbang Gunung** | 2 (koridor + arena) | `#c8a860` senja emas | boss + penjaga | khusus 70% | — |

## C.2 Detail per area

### A1 — Tepi Hutan (onboarding)
- **Visual:** pohon jarang, sinar matahari menembus kanopi, rumput cerah.
- **Dekorasi wajib (>=6/ruang):** pohon latar, bunga liar putih, jamur merah, tunggul, batu kecil, rumput tinggi.
- **Ambient:** kunang-kunang 3–5 partikel melayang (lambat, alpha 0.7).
- **Enemy:** hanya mole & treant, speed x0.85 (lebih lambat dari standar — ini area ajar).
- **Kepingan:** 3 (section inti: `hero`, `schedule`, `rsvp` — lihat §W.3).

### A2 — Hutan Dalam (labirin batu)
- **Visual:** pohon rapat, cahaya redup, lumut di batu.
- **Dekorasi:** akar menonjol, batu berlumut, jamur biru, sarang laba-laba, ranting patah, pakis.
- **Ambient:** kunang-kunang + daun jatuh sesekali.
- **Enemy:** + Mole Penggali (diperkenalkan di A2-R2 sebagai ruang ajar).
- **Physics modifier:** tidak ada.
- **Kepingan:** 2.

### A3 — Rawa Berkabut (puzzle + item)
- **Visual:** air dangkal, kabut bergerak, pohon mati.
- **Dekorasi:** teratai, kayu lapuk, batu tenggelam, kabut rendah, akar bengkok, capung.
- **Ambient:** **kabut `tileSprite` scroll 6px/s alpha 0.35** + riak air.
- **Enemy:** + Treant Tua (ranged), + Kunang Api.
- **Physics modifier:** **air dangkal memperlambat player x0.8** (tile bertanda `slow`).
- **Item:** Panah Api di `A3-R5` (usage window: A3 sisa + A4 + A5 + boss = jauh di atas 8 musuh ✓).
- **Kepingan:** 2.

### A4 — Ladang Bunga (breather)
- **Visual:** paling cerah, bunga warna-warni, langit terbuka.
- **Dekorasi:** bunga 5 warna, kupu-kupu, batu putih, pagar kayu, gerobak, jerami.
- **Ambient:** **kelopak bunga jatuh** (partikel, gravity 12, lifespan 3s).
- **Enemy:** minimum lantai saja (3 Easy). Sengaja lega.
- **Item:** Sepatu Cepat di `A4-R3`.
- **Kepingan:** 2. Ini area paling "wedding" — cocok untuk `story` / `gallery`.

### A5 — Kaki Gunung (puncak kesulitan)
- **Visual:** batuan, sedikit vegetasi, jalur menanjak.
- **Dekorasi:** batu besar, kerikil, semak kering, tiang kayu, tengkorak hewan, obor.
- **Ambient:** **debu tertiup horizontal** (partikel).
- **Enemy:** + Akar Duri (hazard). Kepadatan tertinggi.
- **Item:** Jimat Daun di `A5-R6`.
- **Kepingan:** 1–2.

### A6 — Gerbang Gunung (klimaks)
- **Visual:** senja emas, gerbang batu raksasa berukir, cahaya dari balik gerbang.
- **Dekorasi:** pilar batu, obor menyala, bendera, kelopak bertaburan, karpet merah (setelah menang).
- **Ambient:** **cahaya gerbang berdenyut** (tween alpha 0.6<->1.0, 2s) + obor berkedip.
- **Enemy:** 2–3 penjaga di koridor walk-in + **Ent Penjaga Gerbang** (boss).
- **Kepingan:** 0 (semua sudah harus terkumpul untuk masuk).
- **Setelah boss kalah:** ruang berubah jadi **pelaminan** (karpet, bunga, banner nama mempelai).

## C.3 Backdrop & parallax (top-down)

> Top-down tidak punya parallax horizontal seperti side-scroller. Padanannya = **layer visual
> bertumpuk** dengan `scrollFactor` sedikit berbeda untuk memberi kedalaman:

| Layer | `scrollFactor` | Isi | Depth |
|---|---|---|---|
| Sky/base tint | 0 | warna dasar area (gradient halus) | -100 |
| Kanopi jauh | 0.85 | siluet pohon besar (alpha 0.4) | -50 |
| Tile tanah | 1.0 | tileset utama | -20 |
| Dekorasi statis | 1.0 | pohon, bunga, batu (depth = y) | dinamis |
| Entity | 1.0 | player, musuh, item (depth = y) | dinamis |
| Kanopi dekat | 1.08 | daun overlay di tepi layar (alpha 0.5) | 200 |
| Kabut/ambient | 1.02 | partikel & kabut | 250 |

**Rebuild per area:** simpan semua di `bgGroup`; `bgGroup.clear(true,true)` saat ganti area.

> **Golden Rule APPENDIX C:** *6 area, tiap area punya palet + enemy pool + ambient motion +
> >=6 dekorasi/ruang sendiri. Rebuild backdrop tiap ganti area. Nol ruang kosong.*

---

# APPENDIX D — BOSS / CLIMAX SYSTEM: Ent Penjaga Gerbang

## D.0 Konsep naratif

Ent Penjaga Gerbang = pohon purba raksasa yang menjaga jalan ke pelaminan. Ia bukan jahat — ia
**menguji kesungguhan** mempelai. Saat kalah, ia tidak mati: ia **membungkuk & merestui**, akarnya
membuka jalan, kelopak bunga berjatuhan. (Undangan pernikahan — jangan ada pembunuhan brutal.)

## D.1 Spec

```yaml
id: boss_ent
hp: { easy: 24, normal: 32, hard: 44 }
size_sprite: 64x80
hitbox: { w: 52, h: 64 }          # generous
movement: bobbing (tween y +-8px, 1.6s yoyo) + geser horizontal lambat
phases: 3
ttk_target: 25-35 detik           # dengan Panah Api (damage 2, cd 250ms)
defeat: membungkuk (bukan mati) -> gerbang terbuka -> pelaminan
```

**Perhitungan TTK (verifikasi balance):**
```
Panah Api: damage 2, cooldown 250ms -> DPS teoretis 8
Realistis (dodge + reposition): ~40% uptime -> DPS efektif ~3.2
Normal hp 32 -> 32 / 3.2 = 10s  ... TERLALU CEPAT
=> Boss punya fase INVULNERABLE saat telegraph (lihat D.3) + gerak menghindar
=> TTK riil terukur target 25-35s. Bila harness mengukur <20s, naikkan hp.
```

## D.2 WALK-IN WAJIB (bug yang sudah dibayar — `layout-camera-hardwon.md` §5)

> **JANGAN** lock kamera + spawn boss aktif saat arena dibangun. Player akan off-screen dan boss
> muncul tanpa pemain.

```js
buildBossArena() {
  // koridor approach >=1 layar, player masuk dari bawah
  this.arenaY = this.arenaRect.y + Math.round(ROOM_PX_H * 0.9);
  this.boss = this.add.sprite(cx, cy, 't_boss_idle0');
  this.physics.add.existing(this.boss);
  this.boss.setAlpha(0);                 // SEMBUNYI VIA ALPHA
  // JANGAN setActive(false) -> body mati -> tak bisa kena panah (§16 hardwon)
  this.bossActive = false;
  this.spawnCorridorGuards(2);           // approach tak kosong (2-3 penjaga)
}

update() {
  if (this.boss && !this.bossActive && this.player.y <= this.arenaY) this.activateBoss();
}

activateBoss() {
  this.bossActive = true;
  this.tweens.add({ targets: this.boss, alpha: 1, duration: 500 });
  this.cameras.main.setBounds(this.arenaRect.x, this.arenaRect.y, this.arenaRect.w, this.arenaRect.h);
  this.buildBossHpBar();
  this.cameras.main.flash(300, 200, 255, 180);
  sfx('sawtooth', 90, 0.6, 0.09);
}
```

**Reset flag tiap ganti area:** `this.arenaY = null; this.bossActive = false;` di awal
`buildArea()` — jangan bocor ke area biasa.

## D.3 Phase system (3 fase, threshold HP)

| Fase | HP | Perilaku | Attack | Telegraph | Weakness window |
|---|---|---|---|---|---|
| **1 — Menguji** | 100%–66% | bobbing, geser lambat | **Akar Menyembul**: 3 akar dari tanah di posisi player (delay 0.8s) | tanah retak 0.8s | 1.2s setelah akar turun |
| **2 — Marah** | 66%–33% | geser lebih cepat (x1.4) | + **Lemparan Biji**: 5 biji fan-spread ke player | badan mundur 0.6s | 1.0s setelah volley |
| **3 — Terakhir** | 33%–0% | bobbing cepat, tint kemerahan | + **Hempasan Daun**: gelombang melingkar (celah 1 sektor) | seluruh badan bersinar 1.0s | 0.9s setelah hempasan |

**Escalation rule:** tiap fase **menambah** attack, tidak mengganti. Fase 3 = 3 attack bergantian.

**Invulnerable saat telegraph:** boss `invulnerable = true` selama wind-up (mencegah TTK terlalu
cepat & memaksa pemain belajar ritme). Beri feedback visual: sprite berkedip putih tipis.

```js
// Attack: akar menyembul di posisi player (aim ke player, BUKAN arah tetap)
rootAttack() {
  const tx = this.player.x, ty = this.player.y;      // snapshot posisi SAAT telegraph
  this.showCrack(tx, ty);                             // telegraph 0.8s
  this.time.delayedCall(800, () => {
    if (!this.bossActive) return;
    this.spawnRoot(tx, ty);                           // muncul di posisi lama -> bisa dihindari
  });
}

// Attack: biji fan-spread AIM KE PLAYER (§16 hardwon)
seedVolley() {
  const base = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
  for (let i = -2; i <= 2; i++) {
    const a = base + i * 0.14;                        // spread +-0.28 rad
    const s = this.enemyBullets.get();
    if (!s) continue;                                  // null-check pool WAJIB
    s.setPosition(this.boss.x, this.boss.y + 20).setActive(true).setVisible(true);
    s.body.setVelocity(Math.cos(a) * 150, Math.sin(a) * 150);
  }
}
```

## D.4 HP BAR — WAJIB, KECIL, DI ATAS BOSS (world-space)

> `layout-camera-hardwon.md` §11 + §16: HP bar **kecil di atas boss** (ikut posisi), bukan banner
> besar di layar.

```js
buildBossHpBar() {
  this.bossHpBg   = this.add.rectangle(0, 0, 90, 6, 0x1a1008).setDepth(900);
  this.bossHpFill = this.add.rectangle(0, 0, 86, 4, 0x6ad06a).setOrigin(0, 0.5).setDepth(901);
}
updateBossHpBar() {
  if (!this.boss || !this.bossActive) return;
  const bx = this.boss.x, by = this.boss.y - 52;
  this.bossHpBg.setPosition(bx, by);
  this.bossHpFill.setPosition(bx - 43, by);
  this.bossHpFill.width = 86 * Math.max(0, this.bossHp / this.bossHpMax);
  // warna berubah per fase: hijau -> kuning -> merah
  const r = this.bossHp / this.bossHpMax;
  this.bossHpFill.fillColor = r > 0.66 ? 0x6ad06a : (r > 0.33 ? 0xd0c05a : 0xd05a5a);
}
```

## D.5 HIT DETECTION MANUAL (WAJIB — jangan andalkan overlap fisika)

> `layout-camera-hardwon.md` §16: boss yang bobbing + body di-size/offset membuat arcade overlap
> tidak konsisten. **Cek manual tiap frame.**

```js
manualBossHits() {
  const b = this.boss;
  if (!b || !b.active || !this.bossActive || this.bossInvulnerable) return;
  this.arrows.getChildren().forEach(a => {
    if (!a.active) return;
    if (Math.abs(a.x - b.x) < 30 && Math.abs(a.y - b.y) < 36) {   // hitbox generous
      this.hitBoss();
      a.destroy();
    }
  }, this);
}

hitBoss() {
  const dmg = this.hasFireArrow ? 2 : 1;
  this.bossHp -= dmg;
  this.updateBossHpBar();
  // feedback WAJIB tiap hit
  this.boss.setTint(0xffffff);
  this.time.delayedCall(70, () => this.boss.clearTint());
  this.cameras.main.shake(70, 0.015);
  this.freezeFrames(4);
  sfx('square', 260, 0.07, 0.06);
  if (this.bossHp <= 0) this.defeatBoss();
  else this.checkPhaseTransition();
}
```

> **VERIFIKASI HARNESS WAJIB (sebelum lapor selesai):**
> 1. Taruh panah di posisi boss -> panggil `manualBossHits()` -> `bossHp` **turun**.
> 2. Panggil `hitBoss()` berulang -> `defeatBoss()` **terpicu** saat hp <= 0.
> 3. Ukur TTK simulasi -> harus **25–35 detik**, bukan <20s atau >60s.

## D.6 Victory sequence (celebration pemicu #2 — lihat §Z.5)

```
t=0.0s   bossHp <= 0 -> bossActive = false, input dikunci
t=0.0s   time.timeScale = 0.4 (slow-mo)
t=0.0s   cam.shake(600, 0.03) + 40 partikel emas
t=0.8s   timeScale kembali 1.0
t=1.0s   Ent MEMBUNGKUK (tween angle 0 -> 18deg, 900ms) — bukan mati
t=1.5s   cam.flash(500, 255, 230, 170)
t=1.8s   kelopak bunga turun (partikel, 4 detik)
t=2.2s   gerbang terbuka (tween) + SFX sweep + karpet merah muncul
t=3.0s   ruang berubah jadi PELAMINAN (banner nama mempelai dinamis)
t=4.5s   DIALOG happy-ending muncul  <-- beat ~5 detik SEBELUM dialog (WAJIB)
```

**Dialog happy-ending WAJIB memuat:**
- Nama mempelai **dinamis**: `val('groom_nickname')` + `val('bride_nickname')` — jangan hardcode.
- Pencapaian konkret: "Kamu melewati 6 area dan mengumpulkan N kepingan."
- **CTA "BUKA UNDANGAN"** — perayaan tanpa jalan ke undangan = momen sia-sia.
- Guard sekali-tampil: flag `completed` **di-persist** (jangan terulang saat re-inject).

```js
defeatBoss() {
  if (this.bossDefeated) return;          // idempoten
  this.bossDefeated = true;
  STORE.completed = true; saveStore();     // persist guard
  unlockAllInfo();                         // saat menang, SEMUA kepingan ter-unlock (§Z.5)
  // ... sequence di atas ...
  this.time.delayedCall(4500, () => showOverlay('win'));
}
```

> **Golden Rule APPENDIX D:** *Boss = walk-in (aktif saat player masuk arena, bukan saat build),
> sembunyi via alpha bukan setActive(false), hit MANUAL tiap frame, HP bar kecil di atas boss,
> serangan AIM ke player + telegraph, TTK 25–35s, kalah = membungkuk & merestui.*

---

# APPENDIX E — VALIDATOR ENGINE

Validator adalah **gate keras** dalam generation loop (APPENDIX F), bukan checklist manual.

## E.1 VALIDATOR DENSITY "NO DEAD AIR" (wajib, unit = RUANG)

```js
// Unit segmen untuk top-down = 1 RUANG (bukan viewport). Sesuai density-engine.md §6.
function validateDensity(level, opts) {
  const fails = [];
  for (const room of level.rooms) {
    const isSafe = room.id === 'A1-R1' || room.tag === 'pelaminan';

    const enemies      = room.count('enemy');
    const destructible = room.count('destructible');   // semak, pot
    const obstacles    = room.count('obstacle');       // batu, air
    const decor        = room.count('decor');          // pohon, bunga, jamur...
    const ambient      = room.count('ambient_motion');
    const rewards      = room.count('reward');         // item, peti, kepingan

    // --- LANTAI (§3.3). Safe zone dikecualikan dari kuota MUSUH saja ---
    if (!isSafe && enemies < opts.minEnemiesPerRoom)
      fails.push([room.id, 'enemies', enemies, opts.minEnemiesPerRoom]);
    if (destructible < opts.minDestructiblePerRoom)
      fails.push([room.id, 'destructible', destructible]);
    if (obstacles < opts.minObstaclesPerRoom)
      fails.push([room.id, 'obstacles', obstacles]);
    if (decor < opts.minDecorPerRoom)
      fails.push([room.id, 'decor', decor]);
    if (ambient < 1)
      fails.push([room.id, 'ambient', ambient]);

    // --- DEAD AIR: ruang tanpa APA PUN yang interaktif = pelanggaran mutlak ---
    if (enemies + destructible + rewards === 0)
      fails.push([room.id, 'DEAD_AIR', 0]);

    // --- Ruang koridor terlarang ---
    if (room.tag === 'corridor' && enemies + destructible === 0)
      fails.push([room.id, 'empty_corridor', 0]);
  }

  // --- REWARD CADENCE: tak boleh > N ruang berturut tanpa reward ---
  let gap = 0;
  for (const room of level.roomsInPathOrder()) {
    gap = room.count('reward') > 0 ? 0 : gap + 1;
    if (gap > opts.rewardEveryRooms) fails.push([room.id, 'reward-gap', gap]);
  }
  return fails;   // kosong = lolos; tidak kosong = REGENERATE ruang-ruang itu
}

// Knob per difficulty
const DENSITY = {
  easy:   { minEnemiesPerRoom: 3, minDestructiblePerRoom: 2, minObstaclesPerRoom: 1,
            minDecorPerRoom: 6, rewardEveryRooms: 2 },
  normal: { minEnemiesPerRoom: 4, minDestructiblePerRoom: 3, minObstaclesPerRoom: 1,
            minDecorPerRoom: 6, rewardEveryRooms: 2 },
  hard:   { minEnemiesPerRoom: 6, minDestructiblePerRoom: 3, minObstaclesPerRoom: 2,
            minDecorPerRoom: 6, rewardEveryRooms: 3 },
};
```

**Aturan validator (jangan dilanggar):**
- Validator adalah **bagian dari generation loop**, bukan checklist manual.
- **Lantai, bukan plafon.** Boleh lebih padat; tak boleh lebih sepi.
- **Jangan matikan validator demi "cepat".** Lolos playability tapi gagal density = **tetap gagal**
  (itulah sumber "hambar").
- Safe zone dikecualikan dari kuota **musuh saja** — dekorasi & destructible tetap wajib.

## E.2 VALIDATOR PLAYABILITY

```js
function validatePlayability(level) {
  const fails = [];

  // 1. Semua ruang terjangkau dari start (BFS lewat pintu)
  if (level.unreachableRooms().length) fails.push(['unreachable', level.unreachableRooms()]);

  // 2. Semua KEPINGAN terjangkau tanpa item yang belum didapat di titik itu
  for (const p of level.pieces)
    if (!level.reachableWithInventoryAt(p.room, p.id)) fails.push(['piece-unreachable', p.id]);

  // 3. Gerbang & boss terjangkau
  if (!level.reachable('gate')) fails.push(['gate-unreachable']);

  // 4. No softlock: tiap ruang punya >=1 jalan keluar tanpa item
  for (const r of level.rooms)
    if (r.exitsWithoutItem() < 1) fails.push(['softlock', r.id]);

  // 5. No spawn-kill: radius 40px tiap pintu bebas musuh/hazard saat generate
  for (const r of level.rooms)
    for (const d of r.doors)
      if (r.entitiesWithin(d, 40).some(e => e.hurts)) fails.push(['spawn-kill', r.id, d.side]);

  // 6. Hazard selalu punya jalur aman (Akar Duri fase offset)
  for (const r of level.rooms.filter(r => r.hasThorns()))
    if (!r.hasSafePathThroughThorns()) fails.push(['thorn-no-path', r.id]);

  // 7. Blind corner: tiap musuh terlihat dari >=1 pintu masuk
  for (const r of level.rooms)
    for (const e of r.enemies)
      if (!r.visibleFromAnyDoor(e)) fails.push(['blind-enemy', r.id, e.id]);

  // 8. Powerup Relevance Rule (§7.1)
  fails.push(...validatePowerupRelevance(level));

  // 9. Pattern chain (APPENDIX A.6)
  fails.push(...validatePatternChain(level));

  // 10. Kepingan tidak tersembunyi wajib (§12)
  for (const p of level.pieces)
    if (p.hiddenUnderDestructible) fails.push(['piece-hidden', p.id]);

  return fails;
}
```

## E.3 SCORING (lulus >= 80/100)

| Dimensi | Bobot | Kriteria penuh |
|---|---|---|
| **Playable** | 30 | validatePlayability kosong |
| **Dense** (no dead air) | 25 | validateDensity kosong |
| **Fair** | 15 | telegraph lengkap, no spawn-kill, hitbox pemaaf, i-frame cukup |
| **Rewarding** | 15 | reward cadence <=2 ruang, tiap ruang beri sesuatu |
| **Discovery** | 15 | >=1 rahasia/area, kepingan tersebar >=2 ruang jarak, tiap area punya identitas visual |
| | **100** | **lulus >= 80** |

**Skor < 80 = REGENERATE**, bukan "cukup lah".

## E.4 Checklist self-check (dari `layout-camera-hardwon.md`, disesuaikan top-down)

- [ ] Kamera: **room snap** tween 350ms + `setBounds` per ruang; zoom dihitung & di-snap 0.25 (§9.2)
- [ ] Ground/kontrol: area game >= `BH - 200` pada touch; kontrol tak menutupi player (§S.3)
- [ ] ICON-BUTTON kiri-atas · indikator kepingan kanan-atas · joystick kiri-bawah · PANAH kanan-bawah (§Z.2)
- [ ] Target sentuh >=44px, spacing >=8px, hormati safe-area
- [ ] Desktop: frame **mentok kiri 480px**, panel kanan **pure undangan**; `justify-content:flex-start`; 1 breakpoint 980px
- [ ] **Boss walk-in**: inactive sampai `player.y <= arenaY`; kamera dikunci saat aktivasi; flag reset tiap area
- [ ] **Grafis**: PNG sheet (APPENDIX P) + fallback prosedural ber-shading (base+hi+shadow+outline)
- [ ] **Backdrop**: palet per-area + layer bertumpuk + >=6 dekorasi + >=1 ambient; rebuild per area
- [ ] **Stage-select** memuat picker kesulitan sekaligus (class `.diff-opt` sama dengan cover)
- [ ] **Panel PC** = canvas couple (jas/gaun) + akad/resepsi + map; **nol tombol game**
- [ ] **Toast** atas-tengah (18–35% dari atas), 3–8s, warna+ikon; BUKAN di dasar layar
- [ ] **Boss**: HP bar kecil di atas boss + TTK 25–35s + feedback tiap hit; jalur damage diverifikasi harness
- [ ] **Animasi per-state**: idle/walk/shoot/hurt x 4 arah untuk player; walk/die untuk musuh
- [ ] **Ruang**: >=3 musuh + >=2 destructible + >=1 rintangan + >=6 dekorasi + >=1 ambient
- [ ] **Dialog pilih** (area/kesulitan): klik = pending, **OK** = commit; ada Batal
- [ ] **Ramah**: tanpa nyawa/game-over/skor; kena = knockback + i-frame
- [ ] **UI game**: nol link telanjang; tiap tombol = tombol game
- [ ] **Reset PENUH**: wipe storage (incl. kesulitan), `GAME.destroy(true)`, kembali ke cover
- [ ] **Panah vs musuh**: overlap enemies didaftar SEBELUM collider walls + processCallback + sweep manual; `hitEnemy` idempoten
- [ ] **Spawn per-ruang**: musuh ruang lain tak ber-hitbox; panah mati di batas ruang (diverifikasi harness)
- [ ] **De-ID `#inv-source`** saat clone aktif (§Z.6) — diverifikasi jsdom
- [ ] **`{{#if}}` membungkus `<section>`**, bukan isinya (§Z.7)
- [ ] **`rsvp-status` value lowercase** `hadir`/`tidak-hadir` (§Z.8)

> **Golden Rule APPENDIX E:** *Kalau sebuah ruang bisa dilewati tanpa pemain berinteraksi dengan
> apa pun, ruang itu GAGAL dan di-generate ulang. Padat itu fitur, bukan bug.*

---

# APPENDIX F — GENERATION ALGORITHM

## F.1 Pipeline deterministik

```
1. BUILD GRAPH        -> tentukan grid ruang per area + koneksi pintu (lock-key graph DULU)
2. ASSIGN PATTERNS    -> pilih pola (APPENDIX A) per ruang sesuai % area (A.7) + chain rules (A.6)
3. PLACE OBSTACLES    -> batu/air sesuai pola; pastikan jalur >=2 tile
4. PLACE ENEMIES      -> isi slot m/f/h sesuai enemy pool area (C.1) + kuota difficulty
5. PLACE DECOR        -> isi >=6 dekorasi + >=1 ambient per ruang
6. VALIDATE DENSITY   -> validateDensity() ; GAGAL -> FIX/REGEN ruang itu -> ulangi (maks 8x)
7. PLACE PIECES       -> quota per area (APPENDIX X.2) ; deterministik dari nomor area
8. PLACE POWERUPS     -> sesuai C.1 ; cek Powerup Relevance Rule
9. VALIDATE PLAY      -> validatePlayability() ; GAGAL -> FIX/REGEN -> ulangi (maks 8x)
10. SCORE             -> < 80 -> kembali ke 2 dengan seed berbeda
11. EMIT              -> struktur level siap dipakai scene
```

> **KRITIS:** langkah 6 (density) berjalan **SEBELUM** penempatan kepingan (7). Alasannya: kepingan
> tidak boleh dipakai untuk "menambal" ruang sepi. Ruang harus sudah padat **tanpa** kepingan.

## F.2 Lock-and-key graph DULU, baru ruang (pola Zelda)

```js
// Zelda-like: rancang GRAF dulu (ruang mana mengunci ruang mana), baru isi ruangnya.
function buildAreaGraph(areaIdx, rng) {
  const g = new RoomGraph(3, 3);              // grid 3x3
  g.setStart('R1');
  g.setGate('R9', { needs: 'area_pieces' });  // pintu keluar area
  if (areaIdx >= 2) {                          // area 2+ punya lock-key internal
    const keyRoom  = g.pickRoom(rng, { minDistFromStart: 2 });
    const lockRoom = g.pickRoom(rng, { after: keyRoom, minDist: 1 });
    g.addLock(lockRoom, { keyFrom: keyRoom });
    // WAJIB: kunci selalu SEBELUM gembok di urutan path (validator #2)
  }
  return g;
}
```

## F.3 Regenerate loop (fix-first, regen-last)

```js
function generateArea(areaIdx, diff, rng) {
  const opts = DENSITY[diff];
  for (let attempt = 0; attempt < 8; attempt++) {
    const level = assemble(areaIdx, rng);
    let fails = validateDensity(level, opts);
    if (fails.length) {
      fixDensity(level, fails, opts);          // FIX dulu: sisipkan prop/musuh/destructible
      fails = validateDensity(level, opts);    // ukur ulang
    }
    if (fails.length) { rng.reseed(); continue; }   // masih gagal -> REGEN

    let pfails = validatePlayability(level);
    if (pfails.length) { fixPlayability(level, pfails); pfails = validatePlayability(level); }
    if (pfails.length) { rng.reseed(); continue; }

    if (scoreLevel(level) >= 80) return level;
    rng.reseed();
  }
  return FALLBACK_AREA[areaIdx];    // level tangan-tulis yang dijamin lolos (jangan pernah blank)
}
```

**`fixDensity` — urutan penambalan (murah -> mahal):**
1. Kurang dekorasi -> tambah dekorasi di tile kosong (paling murah, tak mengubah gameplay)
2. Kurang ambient -> tambah 1 emitter ambient area
3. Kurang destructible -> ganti dekorasi jadi semak
4. Kurang rintangan -> tambah batu di tepi (jangan blokir jalur)
5. Kurang musuh -> tambah dari enemy pool area, **hormati <=2 tipe/ruang** & radius pintu 40px
6. DEAD_AIR -> ruang di-rebuild total dengan pola tempur

## F.4 Master instruction (untuk meng-generate area baru)

> Prompt siap-pakai bila nanti perlu menambah area:

```
Generate AREA <N> untuk forest-rpg-wedding.
- Grid 3x3 ruang, ruang = 11x15 tile (potret).
- Palet & enemy pool: lihat APPENDIX C.1 baris area <N>.
- Pattern priority: lihat APPENDIX A.7 baris area <N>.
- Terapkan lantai density APPENDIX E.1 pada difficulty <diff>.
- Lock-key graph dibangun DULU (F.2), baru isi ruang.
- Jalankan pipeline F.1 langkah 1-11. Density (6) SEBELUM kepingan (7).
- Kepingan area ini: <k> buah, ambil dari slice INFOS deterministik (APPENDIX X.2).
- Output: struktur JSON {rooms[], doors[], enemies[], decor[], pieces[], powerups[]}.
- Tolak hasil dengan skor < 80; regenerate dengan seed baru (maks 8x), lalu FALLBACK_AREA.
```

> **Golden Rule APPENDIX F:** *Density divalidasi SEBELUM kepingan ditempatkan — kepingan tak
> boleh jadi tambalan ruang sepi. Fix dulu (murah), regen belakangan, fallback tangan-tulis
> supaya tak pernah blank.*

---

# APPENDIX T — TECHNICAL FOUNDATION (Phaser 3.80.1)

## T.1 Game config & BOOT AMAN (trap ukuran-0)

```js
function bootGame() {
  const parent = document.getElementById('frpg-stage');
  if (!parent) { showError('Container game tidak ditemukan'); return; }

  // WAJIB: ukur parent SENDIRI. JANGAN andalkan this.scale.width di create().
  const rect = parent.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) {          // belum ter-size -> tunda
    return void requestAnimationFrame(bootGame);
  }
  const BW = 540, BH = 960;                          // ruang koordinat LOGIS tetap

  const config = {
    type: Phaser.AUTO,
    parent: parent,
    width: BW, height: BH,                           // tetap, bukan dari scale
    backgroundColor: '#1a2416',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: BW, height: BH },
    scene: [BootScene, GameScene],
  };
  GAME = new Phaser.Game(config);
}
```

> **GRAVITY = 0** — ini top-down, bukan platformer. Salah satu kesalahan paling umum saat
> mengadaptasi contoh platformer.

## T.2 ensurePhaser() — fallback CDN

Host **biasanya** sudah meng-load Phaser (`window.Phaser`), tapi tema **tetap wajib** punya fallback:

```js
function ensurePhaser(cb) {
  if (window.Phaser && window.Phaser.VERSION) return cb();
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
  s.onload = cb;
  s.onerror = () => showError('Gagal memuat Phaser. Periksa koneksi.');
  document.head.appendChild(s);
  disposers.push(() => { try { s.remove(); } catch(e){} });
}
```

**`showError()` WAJIB ada** — tanpa itu "Phaser gagal load" dan "game ada bug logic" sama-sama
tampil sebagai canvas kosong dan tak bisa dibedakan (§10 SKILL).

```js
function showError(msg) {
  const el = document.getElementById('frpg-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
```

## T.3 Scene lifecycle

`init(data)` -> `preload()` -> `create(data)` -> `update(time, delta)`

**Pakai `delta` untuk semua timer manual** agar frame-rate-independent:
```js
update(time, delta) {
  this.thornTimer += delta;
  if (this.thornTimer >= 1600) { this.toggleThorns(); this.thornTimer = 0; }
}
```

## T.4 Arcade physics — top-down

```js
// Player: gravity 0, tak ada blocked.down yang relevan
this.player.body.setSize(10, 12).setOffset(3, 8);
this.player.setCollideWorldBounds(true);

// Collider vs overlap
this.physics.add.collider(this.player, this.wallLayer);        // separasi
this.physics.add.overlap(this.player, this.chests, this.openChest, null, this);  // trigger

// URUTAN PENTING (§5.4): overlap arrows x enemies SEBELUM collider arrows x walls
this.physics.add.overlap(this.arrows, this.enemies, this.hitEnemy, null, this);
this.physics.add.collider(this.arrows, this.wallLayer,
  (a) => a.destroy(),
  (a) => !this.arrowOverEnemy(a));    // processCallback: return false = skip
```

**Musuh patroli memantul** (warisan ForestRPG, terverifikasi di source asli):
```js
enemy.setImmovable(true);
enemy.setCollideWorldBounds(true);
enemy.body.bounce.set(1);
enemy.body.velocity.y = ENEMY_SPEED;   // vertikal (mole) atau .x (treant)
```

## T.5 Object pooling

```js
this.arrows = this.physics.add.group({ classType: Arrow, maxSize: 12, runChildUpdate: true });
const a = this.arrows.get();
if (!a) return;                   // WAJIB null-check saat maxSize penuh
a.setActive(true).setVisible(true).setPosition(px, py);
a.body.enable = true;
```

**Cap:** panah 12, biji musuh 20, partikel `maxAliveParticles: 120`.

## T.6 Procedural texture (fallback) — guard WAJIB

```js
function buildFallbackTextures(scene) {
  if (scene.textures.exists('t_player_idle_down')) return;    // GUARD re-inject
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // ... box() + outline() ...
  g.generateTexture('t_player_idle_down', 16, 16);
  g.destroy();
}
```

## T.7 Animation — guard `anims.exists`

```js
if (!scene.anims.exists('p_walk_down')) {
  scene.anims.create({
    key: 'p_walk_down',
    frames: [0,1,2,3,4,5].map(i => ({ key: 't_player_walk_down_' + i })),
    frameRate: 8, repeat: -1,
  });
}
```
Re-create dengan key sama = warning + no-op, tapi guard tetap wajib agar bersih.

## T.8 PARTICLES — API 3.60+ (gotcha terbesar)

```js
// BENAR 3.80.1
const em = this.add.particles(0, 0, 't_spark', {
  speed: { min: -140, max: 140 }, scale: { start: 0.9, end: 0 },
  lifespan: 500, blendMode: 'ADD', emitting: false,
});
em.explode(12, x, y);
disposers.push(() => { try { em.destroy(); } catch(e){} });

// SALAH -> THROW di 3.80.1 (ParticleEmitterManager dihapus di 3.60)
// this.add.particles('spark').createEmitter({ ... })
```

## T.9 Camera juice

```js
this.cameras.main.shake(90, 0.012);      // intensity = FLOAT KECIL, bukan piksel
this.cameras.main.flash(120, 255, 220, 140);
```

## T.10 Tilemap

Ruang kecil (11x15 potret) x 44 ruang. **Pakai tilemap** untuk tanah/dinding (auto-cull), **static group**
untuk objek kaya-logika (batu yang bisa dihancurkan, peti).

```js
const map = this.make.tilemap({ data: roomData, tileWidth: 16, tileHeight: 16 });
const tiles = map.addTilesetImage('t_tileset');
const ground = map.createLayer(0, tiles, ox, oy);
this.wallLayer = map.createLayer(1, tiles, ox, oy);
this.wallLayer.setCollisionBetween(1, 40);
this.physics.add.collider(this.player, this.wallLayer);   // SETELAH layer & flag ada
```

## T.11 Performance (target 60fps mobile)

| Aturan | Angka |
|---|---|
| Entity hidup serentak | <= 20 (1 ruang saja — spawn per-ruang membantu besar) |
| Partikel hidup | <= 120 |
| Panah pool | 12 |
| Depth sort | hanya entity bergerak (<= 20), bukan semua dekorasi |
| Tilemap | auto-cull; sprite biasa **tidak** -> `setVisible(false)` off-room |
| Texture | atlas tunggal per sheet -> batch draw call |

**Depth sort murah:**
```js
// hanya untuk yang bergerak; dekorasi statis di-set sekali saat spawn
this.depthSorted.forEach(o => { if (o.active) o.setDepth(o.y); });
```

## T.12 CLEANUP & DESTROY (KRITIKAL — host re-inject berkali-kali)

```js
(function () {
  // 1. Panggil cleanup run sebelumnya, DI BARIS PALING AWAL
  if (typeof window.__frpgCleanup === 'function') {
    try { window.__frpgCleanup(); } catch (e) {}
  }
  const disposers = [];
  function addGlobal(target, type, fn, opt) {
    target.addEventListener(type, fn, opt);
    disposers.push(() => target.removeEventListener(type, fn, opt));
  }

  let GAME = null;

  window.__frpgCleanup = function () {
    disposers.forEach(d => { try { d(); } catch (e) {} });
    disposers.length = 0;
    if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
    window.__frpgCleanup = null;
  };

  // ... boot ...
  disposers.push(() => { if (GAME) GAME.destroy(true); });
})();
```

**Gotcha `destroy()` async:** `game.destroy(true)` hanya set `pendingDestroy`, jalan di frame
berikutnya. **JANGAN** `destroy()` lalu `new Phaser.Game()` di tick yang sama -> dua game hidup
1 frame -> blank.

```js
// Bila HARUS re-boot sinkron:
GAME.events.once('destroy', () => bootGame());
GAME.destroy(true);
```

## T.13 GUARD CANVAS DETACH saat host re-inject (memory `metalslug-reinject-detached-canvas`)

**Bug nyata:** host me-re-inject HTML -> `#frpg-stage` diganti elemen baru -> canvas Phaser lama
**detach** dari DOM. Game masih "hidup" tapi menggambar ke canvas yatim -> layar mati tanpa error.

```js
function gameStageAttached() {
  if (!GAME || !GAME.canvas) return false;
  return document.body.contains(GAME.canvas);
}

// cek sebelum resume / start run
function safeStartRun(areaIdx) {
  if (GAME && !gameStageAttached()) {
    // canvas yatim -> bongkar & boot ulang (JANGAN hot-load ke canvas mati)
    GAME.events.once('destroy', () => { GAME = null; bootGame(() => startRun(areaIdx)); });
    GAME.destroy(true);
    return;
  }
  if (!GAME) { bootGame(() => startRun(areaIdx)); return; }
  startRun(areaIdx);   // hot-load ke scene yang ada
}
```

> **JANGAN** `GAME.destroy(true)` lalu `new Phaser.Game()` sinkron di stage yang sama —
> `destroy` deferred, balapan dengan canvas baru -> blank (memory `spacewar`/`metalslug`).

## T.14 Gotcha checklist

1. Particle 3.80.1 = `this.add.particles(x,y,key,cfg)`; `createEmitter()` **throw**.
2. `camera.shake` intensity = float kecil (~0.012), **bukan piksel**.
3. Tilemap auto-cull; sprite biasa **tidak**.
4. `game.destroy(true)` wajib saat re-inject; **async** (frame berikutnya).
5. **GRAVITY = 0** (top-down) — bukan 1000.
6. Procedural texture bentrok saat restart -> guard `textures.exists`.
7. Trap "ukuran 0 saat init" — ukur parent via `getBoundingClientRect()`, jangan `this.scale.width`.
8. `anims.create` dengan key sama = warn+no-op -> guard `anims.exists`.
9. Canvas detach setelah re-inject HTML -> `gameStageAttached()` (T.13).
10. Pool `get()` bisa `null` saat penuh -> **selalu null-check**.

---

# APPENDIX S — SINGLE-FILE ARCHITECTURE

## S.1 Tiga file

```
src/sample-theme/forest-rpg-wedding/
├── index.html        # struktur DOM + #inv-source + slot aset + HUD + overlay
├── index.css         # layout 2-kolom, HUD, overlay, kontrol sentuh
├── index.js          # SELURUH game (IIFE) + wiring host
├── FOREST_RPG_BIBLE.md
├── ASSET.md                     # brief pembuat aset (APPENDIX P.3.1)
├── player-assets.json
├── enemy-assets.json
├── environment-assets.json
├── object-assets.json
├── piece-assets.json
└── assets/
    ├── LICENSE-ansimuz.txt      # BUKTI LISENSI CC0 (WAJIB, §0.4)
    └── *-frame-map.json
```

## S.2 Lapisan logis di dalam satu IIFE

Walau monolitik, kode tetap berlapis:

```js
(function () {
  'use strict';
  // ---- 0. CLEANUP (paling awal) ----------------------
  // ---- 1. CONFIG terpusat ----------------------------
  const CONFIG = { TILE:16, ROOM_W:15, ROOM_H:11, BW:540, BH:960, ... };
  // ---- 2. STORE (localStorage: unlocked, diff, maxArea, guards) ----
  // ---- 3. DOM helpers: $, val(), toast(), showOverlay() ----
  // ---- 4. HOST WIRING: musik mirror, RSVP, ucapan, countdown ----
  // ---- 5. LEVEL GEN: buildAreaGraph, assemble, validators ----
  // ---- 6. TEXTURES: loadSheets() + buildFallbackTextures() ----
  // ---- 7. SCENES: BootScene, GameScene ---------------
  // ---- 8. UI: indikator kepingan, cheat, reset, stage-select ----
  // ---- 9. SIDE PANEL: canvas couple (Canvas 2D, BUKAN Phaser) ----
  // ---- 10. BOOT: ensurePhaser -> bootGame ------------
})();
```

**Config terpusat & data-driven** — semua angka dari Bible ini masuk ke `CONFIG`, tidak tersebar
sebagai magic number.

## S.3 GROUND / area main vs zona kontrol (ber-angka)

> Aturan `layout-camera-hardwon.md` §2 diterjemahkan ke top-down: yang penting **area render game
> tidak tertutup kontrol sentuh**.

```js
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
CONFIG.CONTROL_ZONE_H = isTouch ? 200 : 150;      // tinggi zona kontrol
CONFIG.VIEW_H = CONFIG.BH - CONFIG.CONTROL_ZONE_H; // 960-200 = 760 area game efektif
```

- Kamera ruang di-**center pada area efektif** (bukan tengah canvas):
  ```js
  cam.setViewport(0, 0, CONFIG.BW, CONFIG.VIEW_H);
  ```
- Player tak pernah berada di belakang joystick karena viewport kamera berhenti di atas zona kontrol.
- Clearance minimum player <-> kontrol: **>=80px**.

```
  Frame mobile (BH=960):
  +-------------------------+  y=0
  | HUD (info, tak di-tap)  |
  | [icons]        [pieces] |
  |                         |
  |    AREA GAME (kamera)   |  <- viewport kamera: 0..760
  |    ruang 176x240 @3x |
  |                         |
  +-------------------------+  y=760
  | [joy]        [PANAH]    |  <- zona kontrol 200px
  +-------------------------+  y=960
```

## S.4 Tidak ada bundler

- Tak ada `import`/`export`. Semua di satu IIFE.
- Tak ada `class` yang bergantung modul — boleh pakai `class` ES6 (didukung semua browser target).
- Aset **bukan** file lokal — masuk lewat `{{asset_image_N}}` (APPENDIX P).

> **Golden Rule APPENDIX S:** *Satu IIFE berlapis, config terpusat, cleanup di baris pertama,
> viewport kamera berhenti di atas zona kontrol (`BH - 200` pada touch).*

---

# APPENDIX P — ASET PNG (SPRITE SHEET)

> **Konteks khusus tema ini:** berbeda dari tema lain yang harus menggambar sprite dari nol, tema
> ini punya **aset CC0 siap pakai** (Tiny RPG Forest). APPENDIX P di sini punya **dua mode**:
> - **Mode A (disarankan):** pakai aset Ansimuz asli, di-repack jadi 5 sheet sesuai spec di bawah.
> - **Mode B:** generate sprite baru via image-gen mengikuti `deskripsi` JSON.
> Keduanya memakai **frame-map & slot upload yang sama**, jadi `index.js` tak berubah.

## P.0 Mekanisme host (FAKTA — jangan dikarang)

1. Upload per gambar di **Theme Editor** -> tiap gambar dapat `media_code` berurutan:
   `image_1`, `image_2`, ... **Nomor di-derive dari URUTAN upload** (drag-reorder me-renumber).
2. Tiap aset jadi variabel `{{asset_image_<N>}}` yang di-resolve parser jadi URL/base64 **sebelum**
   JS tema jalan.
3. Tema membaca URL lewat elemen ber-`data-asset`, lalu `index.js` me-load & men-**slice** sendiri.

> **Konsekuensi:** urutan upload = sumber kebenaran. Salah urut = sheet ke slot salah = grafis kacau.

## P.1 Kebutuhan sprite — diturunkan dari gameplay (bukan menebak)

Diturunkan 1-lawan-1 dari §4.4 (player states) + APPENDIX B (entity) + APPENDIX C (environment).

| Sumber Bible | Sprite yang dibutuhkan |
|---|---|
| §4.2 state machine player | idle x4 arah (2 frame), walk x4 arah (6 frame), shoot x4 arah (3 frame), hurt (2 frame) |
| B.2 Mole | walk_up/down/side (6 frame masing-masing), die (3) |
| B.2 Treant | walk_up/down/side (6), die (3) |
| B.2 Mole Penggali | buried (1), emerge (3), chase (4), die (3) |
| B.2 Treant Tua | idle (2), windup (2), fire (2), hurt (1), die (3) |
| B.2 Kunang Api | fly (4), die (3) |
| B.2 Akar Duri | hidden (1), crack (2), up (2) |
| APPENDIX D boss | idle (2), windup (2), attack_root (2), attack_seed (2), hurt (1), bow/defeated (3) |
| C.1-C.2 environment | tileset tanah (seamless), dinding pohon, batu, air (2 frame riak), semak, pot, pohon latar, bunga x5, jamur, tunggul, teratai, obor (2 frame), gerbang (closed/opening/open) |
| §10.1 objek | panah x4 arah, panah api x4, biji musuh, spark, kelopak, daun, partikel tanah |
| APPENDIX X kepingan | peti closed/opening x3/open, ikon kepingan (amplop), couple sprite (pelaminan) |

## P.2 Pengelompokan — TEPAT 5 sheet

| # | Kelompok | Isi | Tekstur engine |
|---|---|---|---|
| 1 | **player** | idle/walk/shoot/hurt x 4 arah (mempelai pria + wanita) | `t_player_*` |
| 2 | **enemy** | mole, treant, mole_dig, treant_old, firefly, thorn, **boss ent** | `t_e_*`, `t_boss_*` |
| 3 | **environment** | tileset tanah/dinding, batu, air, pohon, bunga, jamur, tunggul, teratai, obor, gerbang | `t_tileset`, `t_env_*`, `t_gate_*` |
| 4 | **game-object** | panah x4, panah api, biji, spark, kelopak, daun, partikel tanah, item (hati/bunga/sepatu/jimat/kunci) | `t_arrow_*`, `t_item_*`, `t_fx_*` |
| 5 | **box-kepingan** | peti kepingan (closed/opening x3/open), ikon amplop, sprite couple pelaminan | `t_piece_*`, `t_couple_*` |

**Tata-letak dalam tiap sheet:**
- Frame satu entity disusun **horizontal kiri->kanan** (frame 0 paling kiri).
- **Entity berbeda di baris berbeda** (per-ROW).
- Frame **boleh beda lebar** (pose serang lebih lebar) -> frame-map mencatat **rect eksplisit**.
- **Hadap KANAN** untuk sprite berarah-samping; engine `setFlipX` untuk kiri.
- Pivot: entity darat = kaki di baris bawah sel; terbang (firefly) = tengah sel.

## P.3 JSON generate per-kelompok

### `player-assets.json`
```json
[
  {
    "kelompok": "player",
    "name": "player_groom.png",
    "deskripsi": "Mempelai pria pixel-art top-down, jas hitam + dasi + kemeja putih, rambut gelap. 4 baris arah (down, up, side-kanan, side-kanan-duplikat-untuk-shoot). Tiap baris: 2 frame idle (napas naik-turun 1px), 6 frame walk (langkah kaki bergantian), 3 frame shoot (tarik busur, lepas, recoil), 2 frame hurt (badan tersentak + tint merah). Membawa busur kayu kecil. Hadap KANAN untuk baris side. Kaki menapak baris bawah sel.",
    "orderNumber": 1,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "player",
    "name": "player_bride.png",
    "deskripsi": "Mempelai wanita pixel-art top-down, gaun putih panjang + kerudung/veil putih, rambut gelap. Struktur frame IDENTIK dengan player_groom.png (2 idle, 6 walk, 3 shoot, 2 hurt per arah, 4 baris arah) agar frame-map sama persis. Membawa busur kayu kecil. Gaun berayun halus saat walk. Hadap KANAN untuk baris side. Kaki menapak baris bawah sel.",
    "orderNumber": 2,
    "frameWidth": 80,
    "frameHeight": 80
  }
]
```

### `enemy-assets.json`
```json
[
  {
    "kelompok": "enemy",
    "name": "enemy_mole.png",
    "deskripsi": "Tikus tanah (mole) cokelat (#8a6a4a), badan bulat rendah, moncong pink, cakar krem. 3 baris arah (down, up, side-kanan), tiap baris 6 frame walk (badan bergoyang kiri-kanan, cakar bergerak). Baris ke-4: 3 frame die (badan mengempis + puff debu). Hadap KANAN pada baris side. Kaki di baris bawah sel.",
    "orderNumber": 1,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "enemy",
    "name": "enemy_treant.png",
    "deskripsi": "Treant hijau gelap (#3a5f30), pohon berjalan bertajuk kanopi di kepala, batang cokelat, dua kaki akar, mata kuning bersinar. 3 baris arah (down, up, side-kanan), tiap baris 6 frame walk (kanopi bergoyang, akar melangkah berat). Baris ke-4: 3 frame die (tumbang ke samping + daun berhamburan). Siluet LEBAR & BERTAJUK agar beda jelas dari mole. Hadap KANAN pada baris side.",
    "orderNumber": 2,
    "frameWidth": 96,
    "frameHeight": 96
  },
  {
    "kelompok": "enemy",
    "name": "enemy_mole_dig.png",
    "deskripsi": "Mole penggali, varian mole dengan helm daun. Baris 1: 1 frame buried (hanya gundukan tanah, tanpa badan). Baris 2: 3 frame emerge (tanah retak, kepala muncul, badan penuh). Baris 3: 4 frame chase (lari cepat, debu di belakang). Baris 4: 3 frame die. Hadap KANAN.",
    "orderNumber": 3,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "enemy",
    "name": "enemy_treant_old.png",
    "deskripsi": "Treant Tua, pohon purba STATIS warna cokelat gelap keabuan (#4a3f32), lumut biru di batang, mata merah. Baris tunggal 10 frame: 2 idle (goyang pelan), 2 windup (badan mundur, lengan ranting terangkat), 2 fire (lengan melempar ke depan + biji lepas), 1 hurt (kilat putih), 3 die (retak lalu runtuh jadi tunggul). Hadap KANAN.",
    "orderNumber": 4,
    "frameWidth": 96,
    "frameHeight": 112
  },
  {
    "kelompok": "enemy",
    "name": "enemy_firefly.png",
    "deskripsi": "Kunang Api: bola cahaya oranye-kuning (#ffb84a) dengan sayap transparan tipis dan ekor cahaya. 4 frame fly (denyut terang-redup + sayap mengepak), 3 frame die (pecah jadi percikan). Melayang di TENGAH sel (bukan kaki di bawah). Glow lembut di sekeliling.",
    "orderNumber": 5,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "enemy",
    "name": "enemy_thorn.png",
    "deskripsi": "Akar Duri hazard: 1 frame hidden (tanah rata, retak samar), 2 frame crack (retak melebar + partikel tanah), 2 frame up (duri akar cokelat gelap ujung tajam menyembul penuh). Total 5 frame horizontal. Pivot di dasar sel.",
    "orderNumber": 6,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "enemy",
    "name": "boss_ent.png",
    "deskripsi": "ENT PENJAGA GERBANG: pohon purba RAKSASA berwajah, batang lebar berlumut, kanopi lebat, dua lengan ranting panjang, mata hijau bersinar, akar besar sebagai kaki. 12 frame horizontal: 2 idle (kanopi bergoyang, napas), 2 windup (lengan terangkat tinggi, mata menyala terang), 2 attack_root (lengan menghantam tanah), 2 attack_seed (lengan melempar ke depan, biji lepas), 1 hurt (kilat putih seluruh badan), 3 defeated (MEMBUNGKUK hormat perlahan, mata melembut jadi kuning hangat, kelopak bunga muncul - BUKAN mati/hancur). Hadap BAWAH (menghadap pemain). Skala jauh lebih besar dari musuh lain.",
    "orderNumber": 7,
    "frameWidth": 160,
    "frameHeight": 192
  }
]
```

### `environment-assets.json`
```json
[
  {
    "kelompok": "environment",
    "name": "env_tileset.png",
    "deskripsi": "Tileset hutan top-down 16x16 per tile, disusun grid. Isi: tanah rumput (4 varian seamless), tanah jalur cokelat (4 varian seamless), tepi rumput-ke-jalur (8 tile transisi), air dangkal (2 frame riak), tepi air (4), batu lantai (4), lumut (2). SEAMLESS WAJIB - tile bersebelahan tak boleh menampakkan garis jahitan. Palet hijau hutan (#5a8f42 terang, #3a5f30 gelap), cokelat (#8a6a4a).",
    "orderNumber": 1,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "environment",
    "name": "env_props.png",
    "deskripsi": "Props hutan top-down, tiap item satu sel: pohon besar (kanopi lebat, 1 frame), pohon kecil, semak destructible (2 frame: utuh, bergetar), pot tanah liat, batu besar, batu kecil, tunggul kayu, jamur merah, jamur biru, bunga putih, bunga kuning, bunga merah, bunga ungu, bunga biru, rumput tinggi, pakis, teratai, kayu lapuk, akar menonjol, tengkorak hewan, pagar kayu, gerobak, jerami, papan petunjuk, obor (2 frame api berkedip), pilar batu, bendera. Semua top-down, bayangan lembut di bawah, pivot dasar sel.",
    "orderNumber": 2,
    "frameWidth": 80,
    "frameHeight": 96
  },
  {
    "kelompok": "environment",
    "name": "env_gate.png",
    "deskripsi": "Gerbang Gunung: gapura batu raksasa berukir motif daun & hati, dua pilar + lengkung atas. 3 frame: closed (pintu batu rapat, gelap), opening (celah bercahaya emas melebar, partikel), open (terbuka penuh, cahaya emas terang menyembur, karpet merah terlihat di baliknya). Skala besar. Hadap BAWAH.",
    "orderNumber": 3,
    "frameWidth": 192,
    "frameHeight": 160
  }
]
```

### `object-assets.json`
```json
[
  {
    "kelompok": "game-object",
    "name": "obj_arrows.png",
    "deskripsi": "Panah & proyektil. Baris 1: panah kayu biasa 4 arah (atas, bawah, kiri, kanan) - batang cokelat, bulu putih, mata panah abu. Baris 2: panah api 4 arah - sama tapi menyala oranye dengan jejak api. Baris 3: biji musuh (bola cokelat berduri, 2 frame berputar), muzzle spark (2 frame). Ukuran tampil kecil di engine (panah ~12x5 px) tapi sel tetap besar agar tajam.",
    "orderNumber": 1,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "game-object",
    "name": "obj_items.png",
    "deskripsi": "Item, tiap satu sel: hati merah kecil (2 frame denyut), bunga skor kuning (2 frame kilau), Panah Api pickup (busur menyala oranye di atas alas batu), Sepatu Cepat (sepatu kulit bersayap kecil), Jimat Daun (liontin daun hijau bersinar), Kunci kuningan (2 frame kilau). Semua melayang sedikit dengan bayangan bulat di bawah.",
    "orderNumber": 2,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "game-object",
    "name": "obj_fx.png",
    "deskripsi": "Partikel & efek, tiap satu sel: spark putih-kuning, daun hijau jatuh (3 rotasi), kelopak bunga pink (3 rotasi), gumpalan tanah cokelat, puff debu abu (3 frame mengembang), percikan air biru, kunang-kunang glow (2 frame), ledakan daun (4 frame). Latar transparan, tepi tegas tanpa anti-alias.",
    "orderNumber": 3,
    "frameWidth": 80,
    "frameHeight": 80
  }
]
```

### `piece-assets.json`
```json
[
  {
    "kelompok": "box-kepingan",
    "name": "piece_chest.png",
    "deskripsi": "Peti kepingan undangan: peti kayu dengan pengikat EMAS dan ukiran HATI di tutup, bersinar lembut. 5 frame horizontal: closed (tutup rapat, kilau emas berdenyut), opening x3 (tutup terangkat bertahap, cahaya emas menyembur makin terang), open (terbuka penuh, SURAT UNDANGAN putih ber-segel lilin merah melayang keluar). Varian terkunci: gembok kecil di depan (frame ke-6). Pivot dasar sel.",
    "orderNumber": 1,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "box-kepingan",
    "name": "piece_envelope.png",
    "deskripsi": "Ikon kepingan undangan: amplop putih ber-segel lilin merah bermotif hati. 4 frame: idle (melayang naik-turun lembut dengan kilau), terkumpul (kilau emas terang), redup/terkunci (abu-abu, alpha rendah), pecah-jadi-cahaya (3 partikel). Dipakai sebagai sprite terbang saat kepingan diambil (tween ke ikon indikator).",
    "orderNumber": 2,
    "frameWidth": 80,
    "frameHeight": 80
  },
  {
    "kelompok": "box-kepingan",
    "name": "piece_couple.png",
    "deskripsi": "Mempelai berdua di PELAMINAN (dipakai setelah boss kalah): pria berjas hitam + dasi dan wanita bergaun putih + kerudung + buket bunga, berdiri berdampingan bergandengan tangan di atas karpet merah, latar gapura bunga. 3 frame: idle (napas lembut), melambai (tangan bebas melambai), hati muncul (partikel hati kecil di atas kepala). Top-down/tiga-perempat, hadap BAWAH ke pemain. Skala besar.",
    "orderNumber": 3,
    "frameWidth": 160,
    "frameHeight": 160
  }
]
```

## P.3.1 File `ASSET.md` (WAJIB dibuat di tahap 2)

`ASSET.md` = brief manusiawi untuk pembuat aset, memuat:
1. **Aturan umum**: PNG transparan, pixel-art tanpa anti-alias, hadap KANAN, pivot kaki di baris
   bawah sel, sel >=80x80, semua frame satu entity ukuran sel sama, penamaan file persis.
2. **5 tabel kebutuhan** (kolom: `No | Nama file | frameWidth | frameHeight | Tekstur engine |
   Jumlah frame | Deskripsi tiap frame`).
3. **5 blok JSON** (persis isi P.3), di-mirror sebagai `*-assets.json`.
4. **Tata-letak sheet** (urutan baris, mulai x/y) + catatan frame boleh beda lebar.
5. **Cara pasang**: slot `{{asset_image_N}}` (P.5) + catatan fallback prosedural.
6. **Catatan khusus tema ini:** *"Mode A — bila memakai pack Ansimuz Tiny RPG Forest (CC0),
   repack frame-nya ke tata-letak di atas; simpan `LICENSE.txt` pack ke `assets/`."*

## P.4 Engine men-slice sheet

PNG diupload **utuh**; `index.js` me-slice via **frame-map rect EKSPLISIT**.

```js
// Frame-map per-ROW (rect eksplisit — JANGAN asumsi grid seragam)
const ENEMY_SHEET = [
  { key: 't_e_mole_down', top: 0,   ch: 80,  dh: 16, hb: { w: 10, h: 10 },
    frames: ['w0','w1','w2','w3','w4','w5'], anim: 'e_mole_down', rate: 8,
    rects: [[0,80],[80,80],[160,80],[240,80],[320,80],[400,80]] },
  { key: 't_e_treant_down', top: 320, ch: 96, dh: 20, hb: { w: 12, h: 12 },
    frames: ['w0','w1','w2','w3','w4','w5'], anim: 'e_treant_down', rate: 6,
    rects: [[0,96],[96,96],[192,96],[288,96],[384,96],[480,96]] },
  { key: 't_boss_ent', top: 900, ch: 192, dh: 80, hb: { w: 52, h: 64 },
    frames: ['idle0','idle1','wind0','wind1','root0','root1','seed0','seed1','hurt','bow0','bow1','bow2'],
    anim: 'boss_idle', rate: 3,
    rects: [[0,160],[160,160],[320,176],[496,176],[672,200],[872,200],
            [1072,176],[1248,176],[1424,160],[1584,168],[1752,168],[1920,168]] },
];
```

- `key` = **tekstur engine yang digantikan** (key lama yang sudah dipakai `create()`/`tileSprite()`)
- `dh` = **ukuran tampil** (= ukuran tekstur prosedural lama) -> engine **downscale** ke sini ->
  **semua angka dunia (hitbox, spawn, kamera) tidak berubah**
- `hb` = hitbox dunia
- `anim`+`rate` = bangun anim Phaser (guard `anims.exists`)

```js
function sliceSheet(scene, imgKey, table, flagName) {
  const src = scene.textures.get(imgKey).getSourceImage();
  table.forEach(row => {
    row.rects.forEach((r, i) => {
      const [x, w] = r;
      const cv = document.createElement('canvas');
      const scale = row.dh / row.ch;
      cv.width = Math.round(w * scale); cv.height = row.dh;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;                 // pixel-art: JANGAN smooth
      ctx.drawImage(src, x, row.top, w, row.ch, 0, 0, cv.width, cv.height);
      const key = row.frames.length > 1 ? row.key + '_' + i : row.key;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      scene.textures.addCanvas(key, cv);
    });
    if (row.anim && !scene.anims.exists(row.anim)) {
      scene.anims.create({
        key: row.anim,
        frames: row.frames.map((_, i) => ({ key: row.key + '_' + i })),
        frameRate: row.rate, repeat: -1,
      });
    }
  });
  scene[flagName] = true;
}
```

**Key-out background** bila PNG tidak transparan: flood-fill dari tepi (warna yang menyambung ke
pinggir). **PNG transparan asli lebih disukai.**

**FALLBACK WAJIB:**
```js
const sheetUrl = (name) => {
  const el = document.querySelector('[data-asset="' + name + '"]');
  const src = el && el.getAttribute('src');
  if (!src || src.indexOf('{{') === 0) return null;    // slot kosong / tak ter-resolve
  return src;
};
// bila null -> buildFallbackTextures() prosedural. Game TAK PERNAH blank.
```

## P.5 URUTAN UPLOAD BAKU (kritikal)

| Urutan upload | Kelompok | Variabel host | `data-asset` |
|---|---|---|---|
| 1 | **player** | `{{asset_image_1}}` | `data-asset="player_sheet"` |
| 2 | **enemy** | `{{asset_image_2}}` | `data-asset="enemy_sheet"` |
| 3 | **environment** | `{{asset_image_3}}` | `data-asset="environment_sheet"` |
| 4 | **game-object** | `{{asset_image_4}}` | `data-asset="object_sheet"` |
| 5 | **box-kepingan** | `{{asset_image_5}}` | `data-asset="piece_sheet"` |

```html
<img id="aset-player" data-asset="player_sheet"      src="{{asset_image_1}}" hidden>
<img id="aset-enemy"  data-asset="enemy_sheet"       src="{{asset_image_2}}" hidden>
<img id="aset-env"    data-asset="environment_sheet" src="{{asset_image_3}}" hidden>
<img id="aset-object" data-asset="object_sheet"      src="{{asset_image_4}}" hidden>
<img id="aset-piece"  data-asset="piece_sheet"       src="{{asset_image_5}}" hidden>
```

> **PETUNJUK UPLOAD UNTUK USER (WAJIB dicantumkan di UI/README tema):**
> *"Upload 5 sheet **sesuai urutan ini**: 1) player, 2) enemy, 3) environment, 4) game-object,
> 5) box-kepingan — agar `asset_image_N` cocok. Bila tema sudah memakai slot aset lain, geser
> nomornya dan sesuaikan `src` di `index.html`."*

## P.6 Panduan prompt image-gen (Mode B)

Wajib ada di prompt:
> *pixel-art sprite sheet, latar transparan (alpha), frame disusun horizontal kiri->kanan, ukuran
> sel `<frameWidth>x<frameHeight>` px seragam, hadap kanan, tanpa anti-alias/blur tepi, kaki
> menapak baris bawah sel, **no text, no watermark, no UI**.*

Plus: sebut **jumlah & makna tiap frame** dari `deskripsi`, dan **palet hex** dari APPENDIX C agar
animasi tak "kedip" warna.

## P.7 Checklist APPENDIX P

- [ ] Kebutuhan sprite diturunkan dari gameplay (P.1), 1-lawan-1 dengan tekstur engine APPENDIX B–D
- [ ] TEPAT 5 sheet (player/enemy/environment/game-object/box-kepingan)
- [ ] 5 JSON generate, tiap entri: `kelompok, name, deskripsi, orderNumber, frameWidth(>=80), frameHeight(>=80)`
- [ ] `ASSET.md` di-spec (P.3.1) + mirror `*-assets.json`
- [ ] Frame-map **rect eksplisit per frame** (bukan grid seragam) + `dh` downscale + `hb` + `anim/rate`
- [ ] Urutan upload baku ditetapkan & nomor `{{asset_image_N}}` di HTML cocok
- [ ] Fallback prosedural per kelompok (`using<Kelompok>Assets`) -> tak pernah blank
- [ ] Tileset **seamless**; hadap **kanan**; pivot kaki di baris bawah
- [ ] Petunjuk Upload untuk user + panduan prompt image-gen tercantum
- [ ] **`assets/LICENSE-ansimuz.txt` disertakan** bila memakai Mode A (§0.4)

> **Golden Rule APPENDIX P:** *Satu kelompok = satu sheet = satu slot upload. Engine men-slice satu
> gambar utuh via frame-map rect eksplisit lalu downscale ke key lama, sehingga semua kode lama
> tetap jalan. Slot kosong = fallback prosedural, bukan blank.*

---

# APPENDIX W — WEDDING INTEGRATION (pemetaan section -> kepingan)

## W.1 Sumber binding tunggal: `#inv-source`

**SATU-SATUNYA tempat `{{vars}}` hidup.** Modal kepingan & reveal penuh **meng-clone** dari sini.
Jangan pernah menduplikasi binding ke tempat lain.

```html
<div class="frpg-invitation" id="inv-source">
  <section data-info="hero"> ... </section>
  <section data-info="couple"> ... </section>
  <section data-info="rsvp"> ... </section>
  <section data-info="schedule"> ... </section>
  {{#if is_fitur_live_streaming}}<section data-info="streaming"> ... </section>{{/if}}
  {{#if flag_pakai_timeline_kisah}}<section data-info="story"> ... </section>{{/if}}
  {{#if has_gallery}}<section data-info="gallery"> ... </section>{{/if}}
  {{#if flag_pakai_additional_feature_story_balasan_instagram}}<section data-info="happiness"> ... </section>{{/if}}
  <section data-info="wishes"> ... </section>
  {{#if tampilkan_amplop_online}}<section data-info="gift"> ... </section>{{/if}}
  <section data-info="closing"> ... </section>
</div>
```

> **JEBAKAN FATAL — `{{#if}}` WAJIB MEMBUNGKUS `<section>`, bukan isinya.**
> ```html
> {{#if has_gallery}}<section data-info="gallery"> ... </section>{{/if}}   <!-- BENAR -->
> <section data-info="gallery">{{#if has_gallery}} ... {{/if}}</section>   <!-- SALAH -->
> ```
> Kalau salah: section tetap ada di DOM walau kosong -> terhitung section riil -> muncul
> **kepingan hantu** -> `allPiecesCollected()` menunggu kepingan blank -> undangan **tak pernah**
> bisa lengkap.

## W.2 Tabel 11 section (variabel TERVERIFIKASI ke `dynamic-variables.md`)

| # | `data-info` | Isi & variabel utama | Flag pembungkus |
|---|---|---|---|
| 1 | `hero` | `{{groom_nickname}}`, `{{bride_nickname}}`, `{{wedding_date}}`, `{{quote}}`/`{{quote_by}}`, bg `{{photo_hero_cover}}` | selalu ada |
| 2 | `couple` | `{{groom_name}}`/`{{bride_name}}`, `{{photo_groom_photo}}`/`{{photo_bride_photo}}`, ortu `{{nama_bapak_laki_laki}}`/`{{nama_ibu_laki_laki}}`/`{{nama_bapak_perempuan}}`/`{{nama_ibu_perempuan}}`, `{{ig_laki_laki}}`/`{{ig_perempuan}}` | ortu: `{{#if flag_tampilkan_nama_orang_tua}}` · sosmed: `{{#if flag_tampilkan_sosial_media_mempelai}}` |
| 3 | `rsvp` | countdown `{{countdown_hari}}`/`{{countdown_jam}}`/`{{countdown_menit}}`/`{{countdown_detik}}` + form RSVP (ID host) | selalu ada |
| 4 | `schedule` | Akad `{{tanggal_akad}}`,`{{jam_akad}}`,`{{nama_lokasi_akad}}`,`{{keterangan_lokasi_akad}}`,`{{akad_map}}` + Resepsi `{{tanggal_resepsi}}`,`{{jam_resepsi}}`,`{{nama_lokasi_resepsi}}`,`{{keterangan_lokasi_resepsi}}`,`{{resepsi_map}}` | resepsi terpisah: `{{#if flag_lokasi_akad_dan_resepsi_berbeda}}` |
| 5 | `streaming` | `{{link_live_streaming}}` | `{{#if is_fitur_live_streaming}}` |
| 6 | `story` | `{{#each timeline_kisah}}` -> `{{this.tanggal}}`/`{{this.judul}}`/`{{this.deskripsi}}` | `{{#if flag_pakai_timeline_kisah}}` |
| 7 | `gallery` | `{{#each galleries}}` -> `{{this.url}}` | `{{#if has_gallery}}` |
| 8 | `happiness` | `{{sample_story_1}}`..`{{sample_story_3}}`, `{{frame_balasan_instagram}}`, `{{link_balasan_instagram}}` | `{{#if flag_pakai_additional_feature_story_balasan_instagram}}` |
| 9 | `wishes` | form ucapan (ID host) + `{{#each wishes}}` -> `{{this.guest_name}}`/`{{this.guest_message}}`/`{{this.guest_comment_time}}` | selalu ada |
| 10 | `gift` | `{{bank_1}}`/`{{rek_1}}`/`{{nama_rek_1}}` (+`_2`), QRIS `{{gambar_qris_rekening_1}}`/`_2`, `{{alamat_lokasi_kirim_hadiah_offline}}` | `{{#if tampilkan_amplop_online}}`, `{{#if flag_pakai_2_rekening}}`, `{{#if flag_pakai_qris_rekening_1}}`/`_2`, `{{#if flag_kirim_hadiah_offline}}` |
| 11 | `closing` | `{{kalimat_penutup}}`, `{{site_name}}`/`{{site_url}}` | selalu ada |

> **JANGAN mengarang nama variabel.** Variabel tak dikenal diganti **string kosong** oleh
> `templateParser.ts` -> data hilang **diam-diam** (tak ada error). Semua nama di atas sudah
> diverifikasi ke `reference/dynamic-variables.md`.

## W.3 Penempatan kepingan per area (section inti di area awal)

> **Aturan §6.5 SKILL:** section inti (`hero`, `schedule`, `rsvp`) **wajib di area awal** supaya
> tamu yang berhenti di tengah tetap mendapat info pokok.

| Area | Kepingan (bila 11 section lengkap) | Alasan |
|---|---|---|
| **A1** Tepi Hutan | `hero`, `schedule`, `rsvp` | **INFO POKOK** — didapat paling awal |
| **A2** Hutan Dalam | `couple`, `story` | identitas & kisah |
| **A3** Rawa | `gallery`, `streaming` | media |
| **A4** Ladang Bunga | `happiness`, `wishes` | area paling "wedding" |
| **A5** Kaki Gunung | `gift`, `closing` | penutup |
| **A6** Gerbang | 0 | semua harus sudah terkumpul |

**Quota default:** `[3, 2, 2, 2, 2, 0]` (sum = 11).

## W.4 Aturan penempatan (WAJIB)

1. **Reachable** — tiap kepingan terjangkau tanpa item yang belum didapat di titik itu (validator E.2 #2).
2. **Tidak tersembunyi wajib** — kepingan **tidak boleh** disembunyikan di bawah destructible atau
   di balik rahasia yang tak terlihat (§12, validator E.2 #10). Tamu tak boleh perlu menebak.
3. **Kepingan != power-up ofensif** — kepingan **tidak memberi buff gameplay apa pun** (§7).
4. **Jarak >=2 ruang** antar ruang kepingan (APPENDIX A.6).
5. **Menuntut aksi game** — tiap kepingan butuh >=1 dari: kalahkan penjaga, buka peti (mungkin
   terkunci), atau lewati hazard. **Bukan** sekadar menyentuh ujung ruang (§1.6).
6. **Terlihat dari pintu** — peti kepingan terlihat dari >=1 pintu masuk ruangnya.

> **Golden Rule APPENDIX W:** *Satu sumber binding (`#inv-source`), `{{#if}}` membungkus section,
> section inti di area awal, kepingan selalu terjangkau & tak pernah wajib-tersembunyi.*

---

# APPENDIX X — COLLECTION MECHANIC

## X.1 Scan section riil (JANGAN hardcode 11)

```js
// Dijalankan saat boot. Section yang flag-nya false SUDAH DIHAPUS parser -> tak terdeteksi.
function scanSections() {
  const nodes = document.querySelectorAll('#inv-source > section[data-info]');
  return Array.prototype.map.call(nodes, function (el) {
    return {
      key:   el.getAttribute('data-info'),
      title: (el.querySelector('[data-sec-title]') || {}).textContent || el.getAttribute('data-info'),
      el:    el,
    };
  });
}
const INFOS = scanSections();      // <- jumlah kepingan & ikon indikator DARI SINI
const N = INFOS.length;            // BUKAN 11 hardcode
```

## X.2 Quota per area + AUTO-SCALE (saat section dikurangi flag)

```js
// Shape default untuk 11 section. Harus diskalakan proporsional bila N < 11.
const QUOTA_SHAPE = [3, 2, 2, 2, 2, 0];        // A1..A6, sum = 11

function computeQuota(n) {
  const shape = QUOTA_SHAPE, total = shape.reduce((a, b) => a + b, 0);
  if (n === total) return shape.slice();
  // skala proporsional, lalu perbaiki sisa pembulatan
  const raw = shape.map(v => v * n / total);
  const out = raw.map(Math.floor);
  let rem = n - out.reduce((a, b) => a + b, 0);
  // bagikan sisa ke area dengan pecahan terbesar (area AWAL diprioritaskan -> info pokok dulu)
  const order = raw.map((v, i) => [i, v - Math.floor(v)])
                   .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  for (let k = 0; rem > 0; k = (k + 1) % order.length, rem--) out[order[k][0]]++;
  return out;
}
```

**Contoh auto-scale** (mis. tenant menonaktifkan `gallery`, `streaming`, `happiness` -> N=8):
```
QUOTA_SHAPE [3,2,2,2,2,0] (11)  ->  computeQuota(8) = [3,2,1,1,1,0]  (sum 8) ✓
```

## X.3 Pemetaan area -> kepingan DETERMINISTIK (bukan counter berjalan)

> **Aturan keras:** pemetaan diturunkan dari **nomor area** via slice kontigu `INFOS`, **bukan**
> dari counter global. Kalau pakai counter, cheat stage-jump / replay area -> **kepingan ganda atau
> desync**.

```js
function piecesForArea(areaIdx) {
  const q = computeQuota(INFOS.length);
  let start = 0;
  for (let i = 0; i < areaIdx; i++) start += q[i];
  return INFOS.slice(start, start + q[areaIdx]);   // slice kontigu, deterministik
}
```

Sifat penting: `piecesForArea(2)` **selalu** mengembalikan hasil yang sama, berapa kali pun area
itu dimainkan ulang, dan tak peduli urutan pemain menjelajah.

## X.4 Respons saat kepingan diambil

> **JANGAN AUTO-OPEN MODAL.** Mengambil kepingan hanya menyalakan ikon + toast + SFX + partikel +
> animasi terbang. **Tamu memilih sendiri** kapan membaca. Auto-open memutus gameplay & terasa
> memaksa.

```js
function unlockInfo(key) {
  if (STORE.unlocked.indexOf(key) >= 0) return;      // idempoten
  STORE.unlocked.push(key);
  saveStore();                                        // PERSIST (progress tak pernah hilang)

  lightIndicator(key);                                // 1. ikon indikator menyala + clickable
  flyPieceToIndicator(key);                           // 2. sprite amplop terbang (tween 600ms)
  toast('Kepingan didapat: ' + titleOf(key), 'success');  // 3. toast atas-tengah 3-8s
  sfxArpeggio([660, 880, 1180]);                      // 4. SFX
  burstParticles(20, 'gold');                         // 5. partikel emas
  freezeFrames(5);                                    // 6. freeze 5 frame
  cameraFlash(120, 255, 220, 140);                    // 7. flash

  updateProgressChip();                               // "3/11 kepingan"
  updateOpenButton();                                 // tombol Buka Undangan bila lengkap
  if (allPiecesCollected()) announceAllCollected();   // celebration pemicu #1 (§Z.5)
}
```

**Bentuk kepingan di game ini:** **peti kayu ber-ukiran hati** (`t_piece_chest_*`) yang saat dibuka
melepaskan **amplop bersegel** (`t_piece_envelope_*`) yang terbang ke ikon indikator.

## X.5 Indikator kepingan (N ikon DINAMIS)

```js
function buildIndicators() {
  const wrap = $('frpg-pieces');
  wrap.innerHTML = '';
  INFOS.forEach(function (info) {
    const b = document.createElement('button');
    b.className = 'frpg-piece-ico';
    b.setAttribute('data-piece', info.key);
    b.setAttribute('type', 'button');
    b.title = info.title;
    b.textContent = ICON_OF[info.key] || '?';
    b.disabled = true;                                 // default: redup & tak bisa diklik
    b.addEventListener('click', function () {
      if (b.disabled) return;
      openPieceModal(info.key);                        // clone dari #inv-source
    });
    wrap.appendChild(b);
  });
  // pulihkan state dari STORE (progress persist)
  STORE.unlocked.forEach(lightIndicator);
}
```

| `data-info` | Ikon |
|---|---|
| `hero` | 💌 |
| `couple` | 💑 |
| `rsvp` | ✅ |
| `schedule` | 📅 |
| `streaming` | 📺 |
| `story` | 📖 |
| `gallery` | 🖼️ |
| `happiness` | 📸 |
| `wishes` | 💬 |
| `gift` | 🎁 |
| `closing` | 🌿 |

## X.6 Modal kepingan — CLONE dengan DE-ID (KRITIS)

> **BUG NYATA (memory `game-theme-clone-invsource-duplicate-id`):** tema game yang meng-clone
> `#inv-source` membuat **DUPLIKAT ID host** (`wish-name`, `rsvp-status`, dll). Host membaca elemen
> **pertama** di DOM — yaitu salinan tersembunyi yang kosong -> **RSVP & ucapan terkirim blank**,
> countdown beku.

**Solusi: de-ID sumber selama clone hidup.**

```js
const HOST_IDS = ['btn-show-qr','btn-show-menu','btn-toggle-music','btn-music','bg-music',
  'play-icon','pause-icon','btn-submit-ucapan','wish-name','wish-message',
  'btn-submit-kehadiran','rsvp-status','rsvp-guests','rsvp-code',
  'btn-submit-hadiah','gift-name','gift-amount','gift-bank',
  'alert-submit-kehadiran','alert-submit-ucapan','alert-submit-hadiah',
  'tm-countdown-days','tm-countdown-hours','tm-countdown-minutes','tm-countdown-seconds'];

function deIdSource(on) {
  const root = $('inv-source'); if (!root) return;
  HOST_IDS.forEach(function (id) {
    if (on) {
      const el = root.querySelector('#' + CSS.escape(id));
      if (el) { el.setAttribute('data-was-id', id); el.removeAttribute('id'); }
    } else {
      const el = root.querySelector('[data-was-id="' + id + '"]');
      if (el) { el.setAttribute('id', id); el.removeAttribute('data-was-id'); }
    }
  });
}

function openPieceModal(key) {
  const info = INFOS.filter(i => i.key === key)[0]; if (!info) return;
  deIdSource(true);                                   // 1. lucuti ID dari SUMBER
  const clone = info.el.cloneNode(true);              // 2. clone (tanpa ID host)
  restoreHostIds(clone);                              // 3. kembalikan ID di CLONE (yang aktif)
  const body = $('frpg-modal-body');
  body.innerHTML = ''; body.appendChild(clone);
  wireHostForms(clone);                               // 4. pasang handler RSVP/ucapan di clone
  showOverlay('modal');
  freezeGame(true);                                   // 5. FREEZE game (§Z.9)
}

function closePieceModal() {
  $('frpg-modal-body').innerHTML = '';
  deIdSource(false);                                  // kembalikan ID ke sumber
  showOverlay(null);
  freezeGame(false);
}
```

**Invarian:** pada saat mana pun, **tepat satu** elemen di seluruh dokumen memiliki tiap ID host.

> **Verifikasi jsdom WAJIB:** buka modal `rsvp` -> `document.querySelectorAll('#rsvp-status').length === 1`
> -> isi & submit -> nilai terbaca benar -> tutup modal -> ID kembali ke `#inv-source`, tetap 1.

## X.7 Tombol "Buka Undangan" (reveal penuh)

```js
function updateOpenButton() {
  const btn = $('frpg-open-invitation');
  const ok = allPiecesCollected() || cheat.on;
  btn.disabled = !ok;
  btn.textContent = ok ? '💌 BUKA UNDANGAN'
                       : '🔒 ' + STORE.unlocked.length + '/' + INFOS.length + ' KEPINGAN';
}

function revealFullInvitation() {
  deIdSource(true);
  const wrap = $('frpg-reveal-body'); wrap.innerHTML = '';
  INFOS.forEach(function (info) {                     // SEMUA section berurutan
    const c = info.el.cloneNode(true);
    restoreHostIds(c); wrap.appendChild(c);
  });
  wireHostForms(wrap);
  showOverlay('reveal');                              // scroll vertikal DI DALAM frame
  freezeGame(true);
}
```

## X.8 Filler untuk slot sisa

Bila sebuah area punya quota kepingan 0 (mis. A6) atau lebih sedikit dari slot pola yang tersedia,
slot sisa **wajib diisi filler** agar level tetap padat:
- Peti biasa berisi **bunga skor** (visual saja) atau **hati kecil**
- Jangan biarkan slot `P` kosong -> ruang jadi sepi -> gagal validator density

> **Golden Rule APPENDIX X:** *N dari scan, quota auto-scale, pemetaan deterministik dari nomor
> area, ambil = ikon nyala + toast (BUKAN auto-open), clone selalu dengan de-ID sumber.*

---

# APPENDIX Y — CHEAT SYSTEM + RESET PENUH

## Y.1 Satu flag, dua ranah

```js
const cheat = { on: false };       // TIDAK di-persist (lihat Y.3)

function toggleCheat() {
  cheat.on = !cheat.on;
  $('frpg-cheat-btn').classList.toggle('is-on', cheat.on);

  if (cheat.on) {
    // --- RANAH UNDANGAN: semua kepingan terbuka ---
    INFOS.forEach(i => unlockInfo(i.key));      // idempoten, ter-persist
    updateOpenButton();
    // --- RANAH GAME: bebas & kebal ---
    $('frpg-areaselect-btn').hidden = false;    // stage-select terbuka (semua area)
    toast('Mode bebas aktif — semua kepingan terbuka & kebal', 'info');
  } else {
    $('frpg-areaselect-btn').hidden = true;     // tantangan kembali
    toast('Mode bebas nonaktif', 'info');
  }
}
```

| Ranah | Efek saat ON |
|---|---|
| **Undangan** | semua kepingan ter-unlock; tombol Buka Undangan aktif |
| **Gameplay** | player **kebal total** (`hurtPlayer` return awal) |
| **Progression** | **semua area** bisa dipilih tanpa menyelesaikan sebelumnya |
| **Kesulitan** | bebas dipilih kapan saja |

## Y.2 Cheat-bypass audit (sumber bug berulang — memory `retromario-debugging`)

Setiap jalur yang memeriksa `cheat.on` **wajib** didaftar & diuji:

| Jalur | Cek | Risiko bila bocor |
|---|---|---|
| `hurtPlayer()` | `if (cheat.on) return;` | kebal bocor ke mode normal |
| `gate.onTouch()` | `allPiecesCollected() \|\| cheat.on` | gerbang terbuka tanpa kepingan di mode normal |
| `updateOpenButton()` | `allPiecesCollected() \|\| cheat.on` | tombol aktif tanpa syarat |
| `areaSelect visible` | `cheat.on` | semua area terbuka di mode normal |
| `bossHp` | **TIDAK** dipengaruhi cheat | boss instant-kill = anti-klimaks |

> **Aturan:** cheat **tidak pernah** mengubah data yang di-persist selain `unlocked`. Khususnya:
> jangan menaikkan `maxArea` karena cheat — kalau tidak, mematikan cheat meninggalkan progress palsu.

## Y.3 Persist cheat = keputusan sadar -> **DEFAULT: JANGAN**

**Keputusan tema ini: `cheat.on` TIDAK di-persist.**

**Alasan:** satu HP sering dipakai **banyak tamu** (dioper saat resepsi). Mem-persist cheat membuat
device itu **selamanya mode mudah** untuk semua tamu berikutnya. Reload mengembalikan mode jujur,
tapi **kepingan yang sudah dibuka tetap terbuka** (`unlocked` di-persist) — jadi tak ada yang hilang.

**Yang DI-persist:**
```js
const STORE_KEY = 'frpg_wedding_v1';
const DEFAULTS = {
  unlocked:   [],        // kepingan yang sudah didapat  <- PERSIST
  diff:       'easy',    // kesulitan                     <- PERSIST
  maxArea:    0,         // area terjauh                  <- PERSIST
  announcedAll: false,   // guard celebration #1           <- PERSIST
  completed:  false,     // guard celebration #2           <- PERSIST
};
// cheat.on -> TIDAK di STORE
```

## Y.4 RESET = PENUH (bug yang sudah dibayar — `layout-camera-hardwon.md` §21)

> Reset yang hanya menghapus kepingan tapi mempertahankan kesulitan/area/lanjut-main **bukan reset**.

```js
function resetGame() {
  // 1. WIPE storage sepenuhnya (termasuk diff kembali ke default)
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  STORE = JSON.parse(JSON.stringify(DEFAULTS));      // diff -> 'easy', unlocked [], maxArea 0,
                                                      // announcedAll/completed -> false

  // 2. BONGKAR game yang berjalan -> area benar-benar di-reset
  if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
  runState = freshRun();
  cheat.on = false;
  $('frpg-cheat-btn').classList.remove('is-on');
  $('frpg-areaselect-btn').hidden = true;
  window.__frpgStarted = null;                        // jangan auto-resume setelah reset

  // 3. REBUILD UI
  buildIndicators();                                   // semua kepingan terkunci lagi
  resetDiffPickerUI();                                 // picker kesulitan kembali default
  updateOpenButton();
  updateProgressChip();

  // 4. KEMBALI KE COVER -> pemain memilih kesulitan lagi & PRESS START dari awal
  showOverlay('cover');
}
```

**Konfirmasi WAJIB pakai overlay sendiri, BUKAN `confirm()` native:**
```
  +-- HAPUS SEMUA PROGRES? -----------+
  | Semua kepingan undangan yang      |
  | sudah dikumpulkan akan hilang     |
  | dan permainan mulai dari awal.    |
  |                                   |
  |      [ YA, HAPUS ]  [ BATAL ]     |
  +-----------------------------------+
```

> **Verifikasi harness WAJIB:** tulis storage palsu (`diff:'hard'`, `unlocked:[...]`, `maxArea:4`)
> -> klik reset -> assert storage **ter-wipe** (`diff==='easy'`, `unlocked.length===0`,
> `maxArea===0`) **dan** overlay cover (picker kesulitan) tampil.

> **Golden Rule APPENDIX Y:** *Satu flag, dua ranah. Cheat tak di-persist (device dipakai banyak
> tamu), kepingan selalu di-persist. Reset = wipe storage + destroy game + kembali ke cover.*

---

# APPENDIX Z — HOST CONTRACT & WIRING

> Ini appendix **paling tidak boleh salah**. Melanggar satu pun aturan di sini membuat fitur
> backend **mati diam-diam** (tanpa error di console).

## Z.1 Bagaimana tema disuntik

| Bagian | Cara | Konsekuensi |
|---|---|---|
| **HTML** | `dangerouslySetInnerHTML` | DOM diganti utuh saat re-render |
| **CSS** | `<style>` | — |
| **JS** | IIFE dalam `<script id="theme-custom-js">`, **DIHAPUS & DIJALANKAN ULANG** setiap `jsBase`/`isOpened`/`htmlBase` berubah | **wajib cleanup hook** |
| **Binding** | `templateParser.ts` jalan **SEBELUM** JS tema | `{{vars}}` sudah jadi teks; **tidak ada substitusi `data-var` runtime** |

**Re-inject sering terjadi** — bukan hanya saat ganti tema, tapi **tiap tamu submit ucapan/RSVP/
hadiah** (host me-recompute HTML). Cleanup hook wajib idempoten.

## Z.2 Cara baca binding — `val()` helper

```js
// Pola: elemen punya DUA hal — data-var (kunci cari) + {{key}} (diisi parser)
// <span data-var="groom_nickname">{{groom_nickname}}</span>
function val(k, fb) {
  const el = document.querySelector('[data-var="' + k + '"]');
  const v = el ? (el.textContent || '').trim() : '';
  if (!v || v.indexOf('{{') === 0) return fb || '';    // var tak ter-resolve -> fallback
  return v;
}
```

**Dipakai untuk:** nama mempelai di dialog game, banner pelaminan, teks celebration, panel kanan.
**JANGAN** hardcode nama mempelai di mana pun.

## Z.3 ID HOST — VERBATIM, tanpa prefix

| ID | Fungsi host |
|---|---|
| `btn-show-qr` | Buka popup QR (host intercept capture-phase) |
| `btn-show-menu` | Buka menu navigasi |
| `btn-toggle-music` / `btn-music` | Toggle `isPlaying`; host swap ikon |
| `bg-music` | Target mirror event play/pause (**BUKAN** player asli; tanpa `<source>`) |
| `play-icon` / `pause-icon` | Host set `display` sesuai state |
| `btn-submit-ucapan` + `wish-name` + `wish-message` | Submit ucapan |
| `btn-submit-kehadiran` + `rsvp-status` + `rsvp-guests` + `rsvp-code` | Submit RSVP |
| `btn-submit-hadiah` + `gift-name` + `gift-amount` + `gift-bank` | Konfirmasi hadiah (opsional) |
| `alert-submit-kehadiran` / `alert-submit-ucapan` / `alert-submit-hadiah` | Container pesan hasil |

> **Mengubah / memberi prefix ID host = fitur backend-nya MATI DIAM-DIAM.** Berlaku juga saat form
> dipanggil dari dalam modal kepingan / reveal (karena itu §X.6 de-ID).

## Z.4 MUSIK — tema TIDAK BOLEH memutar backsound tenant

Host (`InvitationPage`) memegang `new Audio(link_backsound_music)` / iframe YouTube; hanya play saat
`isPlaying && isOpened`. Tema **hanya** boleh:
1. klik `#btn-toggle-music` untuk mengubah niat play/pause,
2. **mirror** ikon (host juga dispatch event `play`/`pause` ke `#bg-music`).

> ❌ **JANGAN** `audio.play()` backsound tenant dari tema.
> ❌ **JANGAN** menyertakan file musik sendiri (§11).
> ✅ SFX game via Web Audio internal = bebas.

**Mirror WAJIB IDEMPOTEN (bug mahal — memory `retromario-host-music`):**
Mengklik `#btn-toggle-music` dua kali (karena membaca class lama sebelum React flip state) justru
**mematikan musik lagi** -> "musik tidak jalan".

```js
let musicWanted = null;      // intent
let musicGen = 0;            // generation guard

function hostMusicIsPlaying() {
  const bg = document.getElementById('bg-music');
  const pi = document.getElementById('pause-icon');
  if (pi) return pi.style.display !== 'none';     // pause-icon tampil = sedang play
  return !!(bg && !bg.paused);
}

function setMusicIntent(want) {
  musicWanted = want;
  const gen = ++musicGen;
  (function attempt(tries) {
    if (gen !== musicGen) return;                  // intent lebih baru menang
    if (hostMusicIsPlaying() === want) return;     // state host SUDAH benar -> JANGAN klik
    const btn = document.getElementById('btn-toggle-music') || document.getElementById('btn-music');
    if (btn) btn.click();
    if (tries > 0) setTimeout(() => attempt(tries - 1), 350);   // retry terjadwal
  })(3);
}
```

> **JANGAN** tema mem-mirror `#bg-music` ke ikonnya sendiri secara agresif — **host adalah
> satu-satunya penulis ikon** (memory `theme-cover-scroll-and-music-icon`). Tema hanya membaca.

## Z.5 RSVP / UCAPAN — panggil fungsi global host + fallback

Memasang ID host saja **tidak cukup**.

```js
function wireHostForms(root) {
  const bu = root.querySelector('#btn-submit-ucapan');
  if (bu) bu.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
    localUcapanFallback(root);                     // optimistic UI
  });

  const bk = root.querySelector('#btn-submit-kehadiran');
  if (bk) bk.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
    localRsvpFallback(root);
  });
}
```

### Z.5.a `rsvp-status` — VALUE WAJIB LOWERCASE (bug yang sudah dibayar)

> **BUG NYATA (memory `rsvp-status-value-casing-bug`):** tema game memakai `value="Hadir"` ->
> host membandingkan **exact lowercase** `'hadir'` -> semua tamu tercatat **DECLINED**.

```html
<!-- BENAR -->
<select id="rsvp-status">
  <option value="hadir">Hadir</option>
  <option value="tidak-hadir">Tidak Hadir</option>
</select>

<!-- SALAH -> semua tamu tercatat tidak hadir -->
<!-- <option value="Hadir">Hadir</option> -->
<!-- <option value="Ragu">Ragu-ragu</option>   (nilai "Ragu" tidak dikenal host) -->
```

**Hanya dua nilai** yang sah: `hadir` dan `tidak-hadir`. **JANGAN** menambah opsi "Ragu"/"Mungkin".

### Z.5.b Jangan timpa card hasil RSVP (bug yang sudah dibayar)

> **BUG NYATA (memory `rsvp-card-vs-alert-overwrite`):** `#alert-submit-kehadiran` bisa berupa
> **card** berisi `[data-rsvp-branch]`. Tema yang menulis status line ke situ **menimpa** card
> thank-you -> tamu hanya melihat teks "submitted successfully".

```js
function writeAlert(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.querySelector('[data-rsvp-branch]')) return;   // ini CARD -> JANGAN ditimpa
  el.textContent = msg;
}
```

## Z.6 COUNTDOWN — jangan ditimpa

`{{countdown_hari}}`/`{{countdown_jam}}`/`{{countdown_menit}}`/`{{countdown_detik}}` di-render host
jadi `<span>` ber-ID (`#tm-countdown-days/hours/minutes/seconds`) yang **di-update host tiap detik**.

> ❌ **JANGAN** menimpa `innerHTML` container countdown lewat loop game.
> ✅ Bila tema butuh countdown sendiri (mis. di panel kanan), hitung dari `{{wedding_date_iso}}`
> ke elemen **milik tema sendiri** (memory `theme-countdown-sources`).

## Z.6.5 BOOT — DUA BUG YANG SUDAH DIBAYAR (gejala: "semua tombol tidak berfungsi")

> Keduanya ditemukan saat tema live: **cover tampil normal, tapi TIDAK ADA tombol yang bereaksi.**
> Tidak ada error di console — inilah yang membuatnya sulit didiagnosis.

### Bug 1 — `DOMContentLoaded` TIDAK AKAN PERNAH fire

```js
// SALAH — tombol mati total di host
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else { boot(); }
```

**Kenapa gagal:** host menyuntik tema ke halaman yang **SUDAH selesai dimuat**
(`dangerouslySetInnerHTML` + `<script>` disisipkan setelah mount). `DOMContentLoaded` sudah lewat
jauh sebelumnya, jadi listener **tak pernah dipanggil** → `wireUI()` tak pernah jalan → semua
tombol mati, tanpa error.

```js
// BENAR — HTML tema DIJAMIN sudah ada di DOM sebelum <script> tema dieksekusi
boot();
```

> **Aturan:** di tema yang di-inject host, **JANGAN pernah** menunggu `DOMContentLoaded` /
> `window.onload`. Panggil boot **langsung**.

### Bug 2 — wiring UI bergantung pada Phaser

```js
// SALAH — undangan ikut mati kalau CDN game gagal
ensurePhaser(function () { init(); });     // init() berisi wireUI()
```

**Kenapa gagal:** bila CDN Phaser diblokir (offline, CSP, adblock, jaringan lambat),
`script.onerror` menyala dan callback **tak pernah** dipanggil. Akibatnya bukan cuma game mati —
**seluruh undangan** ikut mati karena tombolnya tak ter-wire. Ini melanggar §1.7 (Inklusif):
undangan harus tetap bisa dibuka tanpa bermain.

```js
// BENAR — pisahkan: UI dulu (sinkron, tanpa jaringan), Phaser belakangan
function boot() {
  if (!initUI()) return;                   // wireUI + indikator + canvas panel — TANPA Phaser
  ensurePhaser(function () { initGame(); });  // gagal = game mati, undangan TETAP jalan
}
```

**Degradasi yang wajib saat Phaser gagal (`onPhaserFail`):**
1. `phaserFailed = true`
2. `unlockAllInfo()` — jangan kunci tamu dari undangan karena engine game gagal
3. Ubah label tombol START → **"BUKA UNDANGAN"**
4. Toast + teks penjelas: *"Game tidak dapat dimuat — undangan tetap bisa dibuka."*

**Guard TERPUSAT di `startRun()`** (bukan di tiap pemanggil, agar tak ada yang terlewat):
```js
function startRun(areaIdx) {
  if (phaserFailed) { revealFullInvitation(); return; }
  if (!phaserReady || !window.Phaser) { pendingStart = true; toast('Memuat game...'); return; }
  // ... lanjut normal
}
```
`pendingStart` menangani kasus tamu menekan START **sebelum** Phaser selesai dimuat — tombol
memberi umpan balik, lalu run otomatis dimulai begitu engine siap. **Jangan diam saja** (tamu
mengira tombol rusak).

### Bug 3 — listener per-elemen MATI saat host re-render (PENYEBAB UTAMA)

**Fakta host** ([`ThemeWrapper.tsx`](src/features/invitation/components/ThemeWrapper.tsx)):
```jsx
<div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlBase }} onClick={handleClick} />
```
- Container tema di-render dengan `dangerouslySetInnerHTML`. **Tiap `htmlBase` berubah, React
  MENGGANTI SELURUH DOM tema** — semua node lama dibuang berikut listener-nya.
- Tapi **JS tema hanya di-re-inject saat `[jsBase, isOpened]` berubah** (deps `useEffect`),
  **BUKAN** saat `htmlBase` berubah — ini disengaja host (agar game tidak ter-reboot tiap submit).
- `htmlBase` berubah **sangat sering**: tamu submit RSVP/ucapan/hadiah, gambar ter-resolve, dll.

**Akibatnya:** `addEventListener` per-elemen menempel di node yang **sudah dibuang** →
tombol jadi DOM baru **tanpa listener** → *"semua tombol tidak berfungsi"*, tanpa error.

```js
// SALAH — mati setelah re-render pertama
document.getElementById('frpg-start-btn').addEventListener('click', fn);

// BENAR — delegasi di document; node boleh diganti berkali-kali, handler tetap hidup
document.addEventListener('click', function (ev) {
  var hit = ev.target.closest('[id]');
  while (hit) { if (ACTIONS[hit.id]) { ACTIONS[hit.id](); return; }
                hit = hit.parentElement ? hit.parentElement.closest('[id]') : null; }
  var df = ev.target.closest('.diff-opt'); if (df) { /* ... */ }
}, true);   // capture: jalan sebelum handler React host
```

**Plus MutationObserver** untuk membangun ulang bagian yang di-render JS (indikator kepingan,
grid area, canvas panel) setelah DOM diganti.

> ⚠️ **JEBAKAN observer (browser hang):** `buildIndicators()` menulis DOM yang sedang diobservasi →
> observer memicu dirinya sendiri = **loop tak berhenti**. Wajib ada flag `selfMutating` +
> early-return murah (`wrap.children.length === INFOS.length`) sebelum bekerja.

> ⚠️ **STATE VISUAL WAJIB DI-SYNC ULANG.** Setelah DOM diganti, `cheat.on` (state JS) masih hidup
> tapi class `.is-on` (state visual) **hilang**. Tanpa `syncCheatBtn()`/`syncSfxBtn()`/`syncSel()`
> di `onDomReplaced()`, tombol tampak mati padahal handler jalan — klik berikutnya seolah tak
> berefek. Sinkronkan **semua** state visual, bukan hanya membangun ulang node.

> **Golden Rule Z.6.5:** *Boot langsung, jangan tunggu DOMContentLoaded. Wire UI SEBELUM & TANPA
> Phaser. **Semua klik lewat delegasi di `document`, jangan pernah `addEventListener` per-elemen
> pada node yang dirender host.** Engine game gagal ≠ undangan gagal.*

---

## Z.7 CLEANUP HOOK (baris paling awal) + AUTO-RESUME ber-syarat

```js
(function () {
  if (typeof window.__frpgCleanup === 'function') {
    try { window.__frpgCleanup(); } catch (e) {}
  }
  const disposers = [];
  window.__frpgCleanup = function () {
    disposers.forEach(d => { try { d(); } catch (e) {} });
    disposers.length = 0;
    if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
    window.__frpgCleanup = null;
  };
  // ...
})();
```

### Auto-resume WAJIB cek cover (bug "START gabisa dibuka lagi")

`window.__frpgStarted` bertahan lintas re-injeksi. Auto-resume **tanpa syarat** akan menarik pemain
keluar dari cover yang baru saja di-`show` host -> tombol START seperti mati.

```js
function init() {
  wireUI(); buildIndicators(); wireHostForms(document);
  try {
    const coverUp  = hasClass('frpg-cover',  'show');
    const revealUp = hasClass('frpg-reveal', 'show');
    if (window.__frpgStarted && !coverUp && !revealUp) {     // <- CEK COVER, jangan unconditional
      const rs = window.__frpgStarted;
      setTimeout(() => { try { safeStartRun((rs && rs.area) || 0); } catch (e) {} }, 60);
    }
  } catch (e) {}
}
```

> **JEBAKAN intro (memory `theme-intro-reexec-bug`):** jangan menaruh timer animasi intro di
> `disposers`. Host me-re-execute JS saat `isOpened` berubah -> intro ter-cancel -> animasi buka
> tampil di preview tapi **tidak** di undangan live.

## Z.8 FREEZE GAME saat dialog/modal terbuka (memory `game-theme-pause-on-dialog`)

> **Kebocoran universal:** modal kepingan terbuka tapi game **terus jalan** di belakang -> musuh
> tetap bergerak, player bisa kena saat sedang membaca undangan.

```js
function freezeGame(on) {
  if (!GAME) return;
  const sc = GAME.scene.getScene('GameScene');
  if (!sc) return;
  if (on) { sc.scene.pause(); sc.sfxMuted = true; }
  else    { sc.scene.resume(); sc.sfxMuted = false; }
}
```

**WAJIB dipanggil saat:** modal kepingan, reveal undangan, overlay cover/win/reset-confirm/
area-select, lightbox galeri, popup QR.

## Z.9 LIGHTBOX — pakai class BERBEDA

Host universal lightbox memicu pada `.gallery-item` / `.lightbox-injection`.

```html
<!-- BENAR: class sendiri, tidak dibajak host -->
<div class="frpg-gallery-item"> ... </div>
```

## Z.10 LAYOUT DESKTOP — TEPAT 2 kolom, frame KIRI

```
  DESKTOP (>=980px):
  +--------------+--------------------------------+
  | FRAME GAME   | PANEL UNDANGAN (kanan, PURE)   |
  | (KIRI, 480px,| - canvas couple (jas + gaun)   |
  |  dipatok)    | - nama mempelai + tanggal      |
  |  = game +    | - Akad / Resepsi + link MAP    |
  |  undangan    | - 💌 BUKA UNDANGAN LENGKAP     |
  |  scroll      |                                |
  |  SATU-SATUNYA| (NOL tombol game; PRESS START/ |
  |  interaktif  |  kesulitan/kontrol ada di      |
  |              |  cover overlay DALAM frame)    |
  +--------------+--------------------------------+
```

```css
/* mobile: satu frame saja */
.frpg-shell { display:flex; justify-content:center; align-items:stretch; }
.frpg-side  { display:none; }

@media (min-width: 980px) {                 /* SATU breakpoint */
  .frpg-shell { justify-content:flex-start; }        /* mentok kiri, JANGAN center */
  .frpg-frame { order:1; flex:0 0 auto; width:480px; max-width:480px;
                height:100vh; max-height:100vh; border-radius:0; }
  .frpg-side  { display:block; order:2; flex:1; min-width:320px;
                overflow-y:auto; padding:40px 48px; }
  .frpg-side .inner { max-width:440px; margin:0 auto; }
}
@media (hover:hover) and (pointer:fine) and (min-width:980px) {
  .frpg-touch { opacity:0; pointer-events:none; }    /* desktop pakai keyboard */
}
```

**Panel kanan = PURE undangan:** `<canvas id="frpg-couple-canvas">` (**Canvas 2D, BUKAN Phaser**)
menggambar mempelai pria berjas+dasi & wanita bergaun+kerudung+buket dalam scene bertema hutan
(pohon, bunga, kunang-kunang, gerbang, banner "JUST MARRIED"), lalu nama mempelai + tanggal +
Akad/Resepsi + link map, dan **satu** tombol `💌 BUKA UNDANGAN LENGKAP`.

> ❌ **JANGAN:** frame di tengah; 3 kolom; tombol game di panel kanan; canvas couple pakai Phaser.

## Z.11 HUD MAP (mobile)

```
  +-------------------------------------------+
  |          AREA 1 - TEPI HUTAN              |  <- HUD info (dilihat, tak di-tap)
  |                              3/11 💌       |  <- progress kanan
  | +---+                          +-+-+-+     |
  | | ★ |  ICON-BUTTON (KIRI-ATAS) |💌|💑|✅|   |  <- indikator kepingan (KANAN-ATAS)
  | | ▦ |  ★cheat ▦area 💌buka     +-+-+-+     |
  | |💌 |  🎵musik ⟲reset                      |
  | |🎵 |                                      |
  | | ⟲ |         (area main - kamera)         |
  | +---+                                      |
  |         [mempelai di dalam ruang]          |
  |                                            |  <- viewport kamera berhenti di y=760
  |  +-----+                       +--------+  |
  |  | joy |  KIRI-BAWAH    KANAN->| PANAH  |  |  <- kontrol sentuh (zona 200px)
  |  +-----+                       +--------+  |
  +-------------------------------------------+
```

| Elemen | Posisi |
|---|---|
| HUD info (nama area) | atas penuh |
| Progress kepingan `n/N 💌` | atas-kanan `top:42 right:10` |
| **ICON-BUTTON** (★ cheat, ▦ area-select, 💌 buka, 🎵 musik, ⟲ reset) | **KIRI-ATAS** `top:72 left:8`, kolom vertikal |
| **Indikator kepingan** (N ikon dinamis) | **KANAN-ATAS** `top:72 right:8`, wrap rata-kanan, `max-width:130px` |
| **Joystick** | **KIRI-BAWAH** |
| **Tombol PANAH** (besar ~82px) | **KANAN-BAWAH** |

Target sentuh **>=44x44 CSS px**, spacing **>=8px**, hormati `env(safe-area-inset-*)`.

## Z.12 TOAST — atas-tengah, JANGAN di dasar

```css
.frpg-toast { position:absolute; top:18%; left:50%;
  transform:translate(-50%,-12px); z-index:30; opacity:0; transition:.2s; }
.frpg-toast.show { opacity:1; transform:translate(-50%,0); }
/* BUKAN bottom:150px -> ketutupan kontrol sentuh */
```
Durasi **3–8 detik**, auto-dismiss, **warna + ikon** (cyan/✓ sukses, kuning/! info, merah bahaya).
Satu antrian — jangan menumpuk.

## Z.13 CELEBRATION — DUA pemicu terpisah, keduanya wajib

> Keduanya bisa terjadi di **urutan mana pun**. Desain harus tahan kedua urutan.

### Pemicu #1 — kepingan TERAKHIR didapat (undangan lengkap, tanpa harus tamat game)

```js
function announceAllCollected() {
  if (STORE.announcedAll) return;               // guard sekali-tampil (DI-PERSIST)
  STORE.announcedAll = true; saveStore();

  // --- beat meriah ~5 detik SEBELUM dialog (WAJIB, jangan dialog seketika) ---
  cameraFlash(400, 255, 230, 170);
  fireworksParticles(40);
  sfxArpeggio([523, 659, 784, 1046]);
  toast('Semua kepingan terkumpul!', 'success');

  setTimeout(function () {                       // ~4.5s -> beri momen "bernapas"
    showOverlay('allCollected');                 // dialog + CTA "BUKA UNDANGAN"
  }, 4500);
}
```

**Isi dialog (WAJIB):**
- nama mempelai **dinamis**: `val('groom_nickname') + ' & ' + val('bride_nickname')`
- pencapaian konkret: "Semua N kepingan undangan telah terkumpul."
- **CTA `💌 BUKA UNDANGAN`** — perayaan tanpa jalan ke undangan = sia-sia
- tombol sekunder "Lanjut Bermain" (game belum tamat)

### Pemicu #2 — game TAMAT (boss kalah)

Lihat APPENDIX D.6. Guard `STORE.completed` (di-persist). Dialog happy-ending memuat rangkuman +
CTA `💌 BUKA UNDANGAN`.

### Aturan bersama

```js
// Saat MENANG, pastikan SEMUA kepingan ter-unlock -> undangan tak pernah terkunci
function unlockAllInfo() { INFOS.forEach(i => unlockInfo(i.key)); }
```

> Guard `announcedAll`/`completed` **DI-PERSIST** (beda dari `cheat.on` yang tidak) — supaya
> perayaan tidak terulang tiap kali host me-re-inject JS.

## Z.14 Kerangka HTML minimum

```html
<div class="frpg-shell">
  <!-- FRAME GAME (desktop: KIRI 480px; mobile: satu-satunya yang tampil) -->
  <div class="frpg-frame">
    <div class="frpg-stage" id="frpg-stage"><!-- canvas Phaser --></div>
    <div id="frpg-error" class="frpg-error" style="display:none"></div>

    <!-- HUD info -->
    <div class="frpg-hud"><span id="frpg-area-name">AREA 1</span>
      <span id="frpg-progress">0/0 💌</span></div>

    <!-- ICON-BUTTON kiri-atas -->
    <div class="frpg-icons">
      <button id="frpg-cheat-btn"   type="button">★</button>
      <button id="frpg-areaselect-btn" type="button" hidden>▦</button>
      <button id="frpg-open-invitation" type="button">💌</button>
      <button id="btn-toggle-music" type="button">🎵</button>
      <button id="frpg-reset-btn"   type="button">⟲</button>
    </div>

    <!-- indikator kepingan kanan-atas (diisi JS, DINAMIS) -->
    <div class="frpg-pieces" id="frpg-pieces"></div>

    <!-- kontrol sentuh -->
    <div class="frpg-touch">
      <div class="frpg-joy" id="frpg-joy"></div>
      <button class="frpg-fire" id="frpg-fire" type="button">PANAH</button>
    </div>

    <!-- overlay: cover(diff+START), area-select, modal kepingan, reveal, allCollected, win, reset -->
    <div class="frpg-overlay" id="frpg-cover"> ... </div>
    <div class="frpg-overlay" id="frpg-modal"><div id="frpg-modal-body"></div></div>
    <div class="frpg-overlay" id="frpg-reveal"><div id="frpg-reveal-body"></div></div>
  </div>

  <!-- PANEL UNDANGAN (desktop KANAN, PURE undangan, nol tombol game) -->
  <aside class="frpg-side">
    <div class="inner">
      <canvas id="frpg-couple-canvas" width="760" height="380"></canvas>
      <div class="names"><span data-var="groom_nickname">{{groom_nickname}}</span> ♥
                         <span data-var="bride_nickname">{{bride_nickname}}</span></div>
      <div class="date"><span data-var="wedding_date">{{wedding_date}}</span></div>
      <div class="event">AKAD: {{tanggal_akad}} · {{jam_akad}} · {{nama_lokasi_akad}}
        {{#if akad_map}}<a href="{{akad_map}}" target="_blank" rel="noopener">▶ MAP</a>{{/if}}</div>
      {{#if flag_lokasi_akad_dan_resepsi_berbeda}}
      <div class="event">RESEPSI: {{tanggal_resepsi}} · {{jam_resepsi}} · {{nama_lokasi_resepsi}}
        {{#if resepsi_map}}<a href="{{resepsi_map}}" target="_blank" rel="noopener">▶ MAP</a>{{/if}}</div>
      {{/if}}
      <button id="frpg-side-open" type="button">💌 BUKA UNDANGAN LENGKAP</button>
    </div>
  </aside>

  <!-- SATU-SATUNYA sumber binding -->
  <div class="frpg-invitation" id="inv-source"> ...11 section (lihat W.1)... </div>

  <!-- slot aset (urutan upload P.5) -->
  <img data-asset="player_sheet"      src="{{asset_image_1}}" hidden>
  <img data-asset="enemy_sheet"       src="{{asset_image_2}}" hidden>
  <img data-asset="environment_sheet" src="{{asset_image_3}}" hidden>
  <img data-asset="object_sheet"      src="{{asset_image_4}}" hidden>
  <img data-asset="piece_sheet"       src="{{asset_image_5}}" hidden>

  <!-- mirror musik host -->
  <audio id="bg-music"></audio>
</div>
```

## Z.15 UI = TERASA GAME (nol link telanjang)

- Tiap tombol = **tombol game**: font mono, uppercase, border, `box-shadow: 0 3px 0`, `active`
  translateY. Primer (hijau hutan/emas), sekunder (outline olive).
- **Tidak ada** `text-decoration: underline` polos untuk tombol sekunder (Batal/Tutup).
- Overlay bergaya arcade-hutan: border tebal, corner-tick daun, judul dengan text-shadow berlapis.
- **Dialog pilih (area/kesulitan) WAJIB tombol OK** — klik opsi = highlight (pending), OK = commit,
  ada Batal (§8.4).

> **Golden Rule APPENDIX Z:** *ID host verbatim & tepat satu di DOM (de-ID saat clone); musik milik
> host (mirror idempoten, jangan play sendiri); `rsvp-status` lowercase; `{{#if}}` membungkus
> section; freeze game saat dialog; cleanup di baris pertama + auto-resume hanya bila cover tidak
> tampil; layout 2 kolom frame-kiri.*

---

# §13 — VERIFIKASI (untuk tahap 2)

## 13.1 Yang TIDAK bekerja di mesin ini

> ❌ **Screenshot headless Chrome SELALU BLANK di mesin ini.** Jangan dipercaya, jangan dipakai
> sebagai bukti "tema jalan".

## 13.2 Cara verifikasi yang benar

| Yang diuji | Cara |
|---|---|
| **Tampilan & gameplay nyata** | Paste 3 file ke **Theme Editor** host (`ThemeEditorPage.tsx`) -> buka preview; atau minta user mencoba |
| **Logika game/loop** | **Harness Node headless** yang menjalankan `update()` asli dengan RAF di-stub (**bukan** memanggil fungsi step langsung) |
| **DOM/binding/host-contract** | **jsdom** harness |
| **Phaser gagal load vs bug logic** | `showError()` on-screen (T.2) — tanpa ini keduanya sama-sama canvas kosong |

## 13.3 Daftar tes harness WAJIB sebelum lapor selesai

| # | Tes | Assert |
|---|---|---|
| 1 | **Boss bisa kalah** | panah di posisi boss -> `manualBossHits()` -> `bossHp` turun; `hitBoss()` berulang -> `defeatBoss()` terpicu |
| 2 | **TTK boss** | simulasi DPS -> **25–35 detik** (bukan <20s / >60s) |
| 3 | **Spawn per-ruang** | musuh di ruang B; player di ruang A; tembak -> **TIDAK kena**; masuk ruang B -> musuh ada -> bisa kena |
| 4 | **Panah vs musuh di balik rintangan** | musuh hp1 di dekat batu -> 1 panah -> musuh mati, panah habis (tak "tembus") |
| 5 | **De-ID clone** (jsdom) | buka modal rsvp -> `querySelectorAll('#rsvp-status').length === 1`; tutup -> ID kembali ke `#inv-source`, tetap 1 |
| 6 | **`rsvp-status` lowercase** (jsdom) | semua `option[value]` di `#rsvp-status` cocok `/^(hadir\|tidak-hadir)$/` |
| 7 | **Section dinamis** (jsdom) | hapus `<section data-info="gallery">` -> `INFOS.length` berkurang; `computeQuota` menyesuaikan; tak ada kepingan hantu |
| 8 | **`allPiecesCollected()`** | unlock semua `INFOS` -> true; kurang satu -> false |
| 9 | **Reset penuh** | tulis storage palsu (`diff:'hard'`, `maxArea:4`) -> `resetGame()` -> storage ter-wipe, cover tampil |
| 10 | **Cleanup idempoten** | jalankan IIFE 3x berturut -> hanya **1** canvas di DOM, **1** `Phaser.Game` hidup |
| 11 | **Freeze saat dialog** | buka modal -> `scene.sys.isPaused()` true; tutup -> false |
| 12 | **Validator density** | tiap ruang hasil generate lolos `validateDensity()`; 0 ruang DEAD_AIR |
| 13 | **Musik idempoten** | `setMusicIntent(true)` saat host sudah play -> **0** klik ke `#btn-toggle-music` |
| 14 | **Powerup relevance** | tiap powerup ofensif punya >=8 musuh atau boss setelahnya |
| 15 | **BOOT: tombol ter-wire** (jsdom) | jalankan `index.js` sungguhan → klik ★/kesulitan/LEWATI → efeknya nyata. **Bukan** sekadar cek `addEventListener` ada di source (Z.6.5) |
| 16 | **BOOT: Phaser gagal** (jsdom) | picu `script.onerror` → tombol TETAP berfungsi, START jadi "BUKA UNDANGAN", kepingan ter-unlock |
| 17 | **BOOT: Phaser lambat** (jsdom) | klik START sebelum engine siap → muncul toast "Memuat game...", tidak diam & tidak crash |

## 13.4 Waspada bug berulang

- **Cheat-bypass** (memory `retromario-debugging`) — kebal/kepingan bocor ke mode normal (audit Y.2).
- **Canvas detach setelah re-inject** (memory `metalslug-reinject-detached-canvas`) — `gameStageAttached()` (T.13).
- **Chunk JS besar -> `#ERROR!` di Sheets** (memory `theme-chunk-sheets-error`) — bila `index.js`
  besar, pastikan `Code.gs` memakai `setNumberFormat('@')` + `SpreadsheetApp.flush()` sebelum tulis.

---

# §14 — RINGKASAN KEPUTUSAN DESAIN (quick reference)

| Keputusan | Nilai | Sumber |
|---|---|---|
| Engine | Phaser 3.80.1, single-file IIFE | §0, APPENDIX S |
| Resolusi logis | 540x960 potret | APPENDIX S |
| Ruang | **11x15 tile = 176x240 px (POTRET)** — mengisi ~95% frame | §3.1, §9.2 |
| Kamera | room-snap, tween 350ms, zoom dihitung & snap 0.25 | §9 |
| Gravity | **0** (top-down) | APPENDIX T |
| Player speed | 92 (128 dgn sepatu) | §4.3 |
| Arah | 4 (bukan 8/diagonal) | §4.3 |
| i-frame | 1200ms (Easy 1500) | §4.3 |
| Nyawa / game-over / skor | **TIDAK ADA** | §8.2 |
| Musuh | 6 tipe, <=2/ruang, >=3/ruang | §5, §3.3 |
| Spawn | **per-ruang** (bukan seluruh peta) | §5.3 |
| Area | 6 (A1..A6), 44 ruang (9+9+9+6+9+2) | §3.1 |
| Boss | Ent Penjaga, 3 fase, HP bar di atas boss, TTK 25–35s, walk-in | APPENDIX D |
| Kepingan | N **dinamis** dari `#inv-source`, quota `[3,2,2,2,2,0]` auto-scale | APPENDIX W/X |
| Cheat persist | **TIDAK** (kepingan **YA**) | Y.3 |
| Audio | **nol file**; SFX Web Audio; backsound = milik host | §11, Z.4 |
| Aset | 5 PNG sheet (Ansimuz CC0) + fallback prosedural | APPENDIX P |
| Layout desktop | 2 kolom, frame **kiri 480px**, panel kanan pure undangan | Z.10 |
| Difficulty default | **EASY** | §8.1 |

---

# §15 — CHECKLIST BIBLE "SELESAI"

- [x] Mengikuti kerangka `bible-template.md` — §0–§12 + APPENDIX A–F + T/S/P + W–Z lengkap
- [x] Spesifik-arketipe (top-down Zelda-like): 24 pola ruang, entity encyclopedia, 6 area, boss 3 fase
- [x] **Beat-sheet referensi ADA** — ForestRPG asli **diukur langsung** (§3.2.a: 0.97 musuh/layar = contoh gagal) + beat-sheet Zelda (§3.2.b)
- [x] **Lantai kepadatan ber-angka + validator density** yang memaksa regen (§3.3, APPENDIX E.1, F.3)
- [x] Aturan ber-angka, bukan kata sifat
- [x] Contoh kode **Phaser 3.80.1 benar** (partikel API 3.60+, `game.destroy(true)`, gravity 0)
- [x] **APPENDIX P** — 5 sheet + 5 JSON (sel >=80x80) + `ASSET.md` + frame-map rect eksplisit + urutan upload + fallback
- [x] Nama variabel **terverifikasi** ke `dynamic-variables.md` (nol karangan)
- [x] APPENDIX W–Z lengkap: kepingan dinamis & reachable, cheat, celebration 2-pemicu, layout 2-kolom, musik idempoten, `{{#if}}` membungkus section, ID host verbatim
- [x] Tiap bagian besar punya **Golden Rule**
- [x] Disimpan di `src/sample-theme/forest-rpg-wedding/FOREST_RPG_BIBLE.md`
- [x] **Lisensi aset didokumentasikan & diverifikasi** (§0.4) — MIT kode, CC0 art, audio dibuang

---

> **GOLDEN RULE TERTINGGI TEMA INI:**
> *Game harus enak dimainkan tanpa undangan; undangan harus lengkap tanpa bermain.
> Tamu tak pernah bisa gagal, tak pernah kehilangan progress, dan tak pernah terkunci dari
> detail asli pernikahan.*

---

**AKHIR BIBLE — TAHAP 1 SELESAI.**
Tahap 2 (generate `index.html` + `index.css` + `index.js` + `ASSET.md` + 5 `*-assets.json`)
adalah panggilan terpisah yang memakai Bible ini sebagai sumber kebenaran.
