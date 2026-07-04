# RETROMARIO WEDDING — Game Design Bible (Phaser 3.80.1)

> **Arketipe:** Platformer eksplorasi klasik ala **Super Mario Bros** (NES, 1985).
> **Engine:** Phaser **3.80.1** (bukan canvas 2D manual). Arsitektur **single-file** (3 file:
> `index.html` + `index.css` + `index.js`), IIFE, tanpa bundler, aset procedural/PNG-sheet, CDN-only.
> **Status:** TAHAP 1 (Bible). File `index.html/css/js` **belum** dibuat — Bible ini adalah sumber
> kebenaran yang dipakai TAHAP 2 untuk men-generate 3 file tema.
>
> **Target kualitas:** lebih detail & lebih spesifik-arketipe daripada
> `retromario/MARIO_LEVEL_GENERATION_BIBLE.md` (6033 baris, canvas), tetapi **teknis = Phaser 3**.
> Semua aturan **ber-angka**, tiap bagian besar punya **Golden Rule**, tiap contoh kode = API
> Phaser 3.80.1 yang benar.

---

## DAFTAR ISI

**BAGIAN INTI (game design)**
- §0 Meta & Ringkasan (elevator pitch, mood, arketipe)
- §1 Core Principles (8 filosofi)
- §2 Core Gameplay Loop
- §3 World / Level Structure (+ beat-sheet SMB 1-1, lantai kepadatan "NO DEAD AIR")
- §4 Player System (state machine, fisika lompat ber-angka, input, animasi)
- §5 Enemy / Obstacle System (≥6 tipe, spawn relatif-kamera)
- §6 Interaction & Collision Matrix
- §7 Power-up / Item System (Mushroom/Fire/Star + Relevance Rule)
- §8 Difficulty Scaling (sawtooth, undangan ramah tanpa nyawa)
- §9 Camera & Readability (follow-offset ber-angka)
- §10 Game Feel / Juice + Grafis (freeze/shake/flash/partikel + transisi sinematik)
- §11 Audio Design (SFX game; backsound = host)
- §12 Anti-Frustration Rules (coyote/buffer/corner-correct)

**APPENDIX game-design (kedalaman ala Mario)**
- APPENDIX A — PATTERN LIBRARY (40 pola ber-ID)
- APPENDIX B — ENTITY ENCYCLOPEDIA (yaml spec tiap entity)
- APPENDIX C — BIOME / WORLD LIBRARY (6 dunia, parallax + density prop)
- APPENDIX D — BOSS / CLIMAX SYSTEM (Bowser "Raja Kesepian" 3 fase, walk-in, HP bar)
- APPENDIX E — VALIDATOR ENGINE (playability + density "no dead air")
- APPENDIX F — GENERATION ALGORITHM / PROMPT SYSTEM

**APPENDIX teknis (Phaser 3)**
- APPENDIX T — TECHNICAL FOUNDATION (Phaser 3.80.1)
- APPENDIX S — PROJECT / SINGLE-FILE ARCHITECTURE (boot aman, ground vs controller)
- APPENDIX P — ASET PNG (5 sprite sheet + frame-map + urutan upload + fallback)

**APPENDIX integrasi undangan**
- APPENDIX W — WEDDING INTEGRATION (section→kepingan)
- APPENDIX X — COLLECTION MECHANIC (quota, deterministik, respons-ambil)
- APPENDIX Y — CHEAT SYSTEM (+ reset penuh)
- APPENDIX Z — HOST CONTRACT & WIRING (ID host, mirror musik, layout 2-kolom, HUD, toast, dialog OK, celebration)

---

# §0 — META & RINGKASAN

**Judul game:** *RETROMARIO WEDDING — Petualangan Menuju Pelaminan*

**Arketipe & referensi klasik:** Platformer eksplorasi 2D side-scroll, referensi kanonik
**Super Mario Bros** (NES 1985) & **Super Mario World** (SNES 1990). Feel: ceria,
family-friendly, warna cerah, lompat presisi dengan momentum & variable-jump.

**Mood pasangan yang cocok:** ceria, playful, nostalgia 8-bit, "perjalanan penuh warna berdua
menuju hari bahagia". Cocok pasangan yang ingin undangan menyenangkan & ramah semua umur
(anak-anak tamu pun bisa main).

**Elevator pitch (1 paragraf):** Tamu mengendalikan **Pengantin Pria (Si-Groom)** — versi
mungil berjas + topi — yang berlari & melompat menembus **6 dunia bertema** (Padang Rumput,
Bawah Tanah, Pantai Cinta, Langit Awan, Kastil Es, Kastil Terakhir). Di sepanjang jalan, tiap
kepingan informasi undangan tersembunyi di dalam **"Kotak Cinta"** (`?`-block emas berhati)
yang harus **dipukul dari bawah** untuk dibuka — bukan otomatis didapat. Musuh klasik (Goomba,
Koopa, Piranha, Lakitu) menghadang; power-up Jamur/Bunga/Bintang menolong. Klimaks: di Kastil
Terakhir, **Bowser "Raja Kesepian"** menyandera **Pengantin Wanita (Si-Bride)** di dalam sangkar
di atas jembatan; tamu harus mengalahkannya (jatuhkan ke lava via kapak jembatan, ATAU 30 hit)
untuk **menyelamatkan mempelai** → undangan lengkap terbuka dengan perayaan meriah.

**Versi engine & arsitektur:** Phaser `3.80.1`, single-file (IIFE dalam
`<script id="theme-custom-js">`), procedural texture default + opsi 5 PNG sprite sheet (APPENDIX
P), fallback procedural wajib. Resolusi internal **540×960** (potret mobile), `Scale.FIT`.

**Tokoh:**
- **Si-Groom** (player) — pengantin pria mungil, jas hitam, topi/rambut, bisa jadi "Super"
  (lebih tinggi, dengan Jamur) & "Fire" (lempar hati-api, dengan Bunga).
- **Si-Bride** (yang diselamatkan) — di sangkar di puncak tiap kastil (fake-out ala Toad) &
  di kastil terakhir (asli).
- **Bowser "Raja Kesepian"** — boss, naga besar; motif naratif: "raja yang kesepian ingin
  merusak kebahagiaan orang; dikalahkan oleh cinta".

---

# §1 — CORE PRINCIPLES (8 filosofi)

> Tiap prinsip = aturan keras + contoh BENAR/SALAH + alasan (WHY).

## 1.1 Playability First (Game Dulu, Baru Undangan)

**Aturan:** game harus enak **sebagai game** di 60fps sebelum satu kepingan undangan
ditempel. Lompat harus responsif (input→aksi ≤1 frame), ada momentum, ada variable-jump.
- ✅ BENAR: player terasa "berat tapi lincah" — akselerasi ~0.6 tile/detik², momentum terbawa
  saat lompat (§4.2). Menahan tombol = lompat lebih tinggi.
- ❌ SALAH: velocity horizontal langsung 0/max tanpa akselerasi (terasa "es/robot"); lompat
  tinggi tetap apa pun lama tekan.
- **WHY:** undangan adalah *hadiah yang ditemukan dengan bermain*. Kalau gamenya jelek, tamu
  menutup tab sebelum menemukan tanggal pernikahan.

## 1.2 Teach Before Test (Kishōtenketsu 4-act)

**Aturan:** tiap mekanik baru diperkenalkan di zona **tak-bisa-gagal** dulu (Ki), lalu
diulang risiko kecil (Shō), lalu di-twist (Ten), lalu dipensiunkan (Ketsu). Satu mekanik baru
per segmen; kemunculan pertama failure-proof (metode Mario 1-1, §12 + game-feel §10).
- ✅ BENAR: Goomba pertama jalan pelan ke arah player di tanah datar tanpa jurang → memaksa
  lompat pertama, mati murah = mengajari.
- ❌ SALAH: Goomba pertama muncul di tepi jurang → salah lompat = mati tak adil di menit-1.
- **WHY:** tamu non-gamer harus bisa belajar tanpa teks.

## 1.3 Fair Challenge (No Blind Jump)

**Aturan:** pendaratan tiap lompatan **terlihat saat takeoff**; jangan wajibkan gap > D_max;
telegraph semua hazard; objek mirip = perilaku sama (no instakill lookalike).
- ✅ BENAR: kamera follow-offset menggeser player ke kiri ⅖ layar (§9) → jurang di depan
  terlihat sebelum lompat.
- ❌ SALAH: lompat "iman" ke jurang yang landing-nya di luar layar.
- **WHY:** kesulitan harus dari eksekusi, bukan tebak-tebakan.

## 1.4 Readability (Siluet Unik)

**Aturan:** tiap entity punya siluet unik & terbaca dari jauh; sprite di-shade (base+highlight
+shadow+outline, §10/APPENDIX T). Hazard tampak berbahaya, reward tampak menarik.
- ✅ BENAR: Goomba = jamur coklat gepeng bermata marah; Kotak Cinta = `?`-block emas berhati
  berdenyut → jelas "ini spesial".
- ❌ SALAH: semua kotak sama → tamu tak tahu mana yang berisi kepingan.
- **WHY:** affordance menggantikan tutorial teks.

## 1.5 Discovery / Reward (Kepingan = Harta Tersembunyi)

**Aturan:** kepingan undangan **tidak** otomatis didapat dengan menamatkan stage — harus
**ditemukan & dipukul** dari Kotak Cinta. Tiap unlock = SFX+partikel+toast+ikon menyala (§10,
APPENDIX X). **JANGAN auto-open modal** saat kepingan diambil.
- ✅ BENAR: pukul Kotak Cinta dari bawah → hati emas melompat keluar → ikon "schedule" menyala
  → toast "📅 Jadwal Acara ditemukan!".
- ❌ SALAH: sampai flag = semua kepingan langsung ter-unlock (menghilangkan eksplorasi).
- **WHY:** rasa "menemukan" itu inti daya tarik tema ini.

## 1.6 Inklusif (Cheat Mode)

**Aturan:** tamu yang tak mau/tak bisa main **tetap** bisa buka undangan lengkap via Cheat
Mode (★) — semua kepingan langsung ter-koleksi + kebal + stage-select terbuka (§6, APPENDIX Y).
- **WHY:** undangan harus tetap fungsional untuk semua tamu (nenek, anak, non-gamer).

## 1.7 Undangan Ramah (Tanpa Game-Over)

**Aturan:** ini **undangan, bukan speedrun**. **TANPA sistem nyawa/game-over.** Kena musuh =
knockback + i-frame (bukan mati/kecil-lalu-mati). Jatuh jurang = respawn ke titik **aman**
mundur (§8, layout §17). HUD "nyawa" → repurpose jadi koin/skor.
- ✅ BENAR: kena Goomba saat "kecil" → knockback + kedip 1.2s, tetap jalan.
- ❌ SALAH: kena saat kecil → mati → ulang dari awal stage → tamu frustrasi & tutup tab.
- **WHY:** frustrasi = undangan tak terbaca. Default EASY.

## 1.8 Kohesi Tema (8-bit yang Manis)

**Aturan:** palet cerah SMB (langit biru `#5c94fc`, tanah `#c84c0c`, batu `#e45c10`), font
pixel/mono, semua UI = "terasa game" (no link telanjang, §20 layout). Motif pernikahan
menyelip lembut (hati, banner "JUST MARRIED", Kotak Cinta) tanpa merusak vibe retro.

> **Golden Rule §1:** *Game dulu (60fps, responsif, adil), undangan sebagai hadiah tersembunyi;
> ramah tanpa game-over; inklusif via cheat.*

---

# §2 — CORE GAMEPLAY LOOP

**Verb utama:** **LARI** (→) · **LOMPAT** (variable height) · **TINDAK** (stomp musuh dari atas)
· **PUKUL** (`?`/Kotak Cinta dari bawah) · **LEMPAR** (hati-api bila Fire) · **TEMUKAN** (kepingan).

```
        ┌────────────────────────────────────────────────┐
        │                                                │
        ▼                                                │
   [LARI → kanan]                                        │
        │  jurang? musuh? blok?                          │
        ▼                                                │
   ┌─── LOMPAT ───┐                                      │
   │ variable jump │──▶ tindak musuh (stomp)             │
   │ + momentum    │──▶ pukul ?-block (koin/power-up)    │
   └───────────────┘──▶ pukul KOTAK CINTA ──▶ KEPINGAN ──┤ ikon menyala
        │                                    (unlock)    │ +toast+SFX+partikel
        ▼                                                │
   [power-up?] Jamur→Super · Bunga→Fire · Bintang→kebal  │
        │                                                │
        ▼                                                │
   [akhir stage: FLAGPOLE] ──▶ transisi sinematik ───────┘ (§10.1)
        │
        ▼
   [dunia 6: KASTIL] ──▶ BOSS Bowser ──▶ selamatkan Bride ──▶ CELEBRATION
                                                             + reveal undangan
```

**Satu putaran (~4–8 detik):** lihat rintangan di depan (kamera offset) → putuskan lari/lompat
→ eksekusi → dapat feedback (stomp/koin/kepingan) → maju. Loop kepingan **berlapis** di atas
loop platforming: tiap beberapa layar ada Kotak Cinta yang mengundang eksplorasi vertikal.

> **Golden Rule §2:** *Lari-lompat-temukan.* Tiap ~4–8 detik ada keputusan platforming +
> reward; kepingan adalah reward eksplorasi vertikal di atas jalur utama.

---

# §3 — WORLD / LEVEL STRUCTURE

## 3.1 Satuan & panjang

- **Tile = 32×32 px** (di resolusi 540×960; player "kecil" ~26×30, "super" ~26×54).
- **Viewport (BW×BH) ≈ 540×960**; **1 layar ≈ 17 tile lebar**.
- **Panjang stage:** dunia 1–5 = **190–260 tile** (~6000–8300 px) → ~75–110 detik. Dunia 6
  (kastil boss) = **90–120 tile** koridor + arena boss.
- **Struktur pacing template per stage:**
  `Start(safe ~5 tile) → Teach(1 mekanik) → Practice → Test(puncak) → Reward(kepingan/power) → Goal(flagpole)`.
  3–5 **puncak** (gauntlet) + lembah (breather berisi koin/prop) per stage — kurva sawtooth (§8).

## 3.2 Start safe zone (onboarding tanpa kata — metode Mario 1-1)

- **≥5 tile datar** tanpa jurang/musuh berbahaya di awal (kecuali 1 Goomba telegraph pelan di
  tile ~8 untuk memaksa lompat pertama).
- Ruang kosong di kiri + scenery di kanan → "pergi ke kanan" tanpa teks (§10 game-feel).
- Kotak Cinta pertama (kepingan `hero`) muncul di dunia-1 zona awal sebagai `?`-block emas yang
  jelas → pukul-dari-bawah = positif (ajari mekanik kepingan segera, seperti weapon-crate detik-1
  di Metal Slug).
- **Zona awal dikecualikan dari kuota musuh** validator, TAPI **wajib** tetap punya
  dekorasi/parallax + ≥1 pijakan (jangan kosong).

## 3.3 Goal area (flagpole)

- Tangga blok naik (staircase 4–8 tile) → **flagpole** (tiang bendera) di akhir dunia 1–5.
  Menyentuh flagpole = stage clear → **transisi sinematik** (§10.1), bukan pause+tombol.
- Skor bonus dari tinggi grab bendera (juice; tak memengaruhi kepingan).
- Dunia 6 diakhiri **pintu kastil** → arena boss (walk-in, APPENDIX D).

## 3.4 LANTAI KEPADATAN — "NO DEAD AIR" (WAJIB, gate keras)

> **Golden Rule density (kepala §3):** *Pada setiap jendela selebar-layar (1× viewport) HARUS
> ada sesuatu yang hidup: musuh, koin, `?`-block, pijakan elevasi, pipa, rahasia, atau prop
> bergerak. Lantai kepadatan ditegakkan validator (APPENDIX E), bukan harapan. Kalau sebuah
> segmen bisa dilewati tanpa pemain berinteraksi dengan apa pun → segmen GAGAL → regenerate.*

**Lantai kepadatan platformer (dipetakan dari density-engine §2/§6, unit = 1 viewport):**

| Metrik | Lantai (minimum wajib) | Catatan |
|---|---|---|
| **Max dead air** | **≤ 0.75 layar** (≈ ≤2 dtk @ scroll normal) tanpa interaktif | aturan paling keras; gap wajib diisi **coin-trail** |
| **Interaktif / layar** | **≥1 musuh/hazard + ≥1 reward** (koin/blok/`?`/rahasia) | zona tempur; zona awal ≥1 reward |
| **Elevasi / layar** | **≥1 perubahan ketinggian** (pijakan/tangga/pipa) tiap **6–10 tile** | jawab "pijakan untuk naik kurang" |
| **Musuh aktif / layar** (zona tempur) | **≥1–2** (easy 1 · normal 2 · hard 3), target 2–4 di zona padat | "musuh kadang ada kadang nggak" = pelanggaran |
| **Prop dekorasi / layar** | **≥1 far-parallax + 1–2 landmark midground + 2–4 foreground** (bukit, semak, awan, pohon, pipa dekor) | jawab "dekorasi sepi" |
| **Ambient motion / layar** | **≥1** (awan bergerak, air, bendera berkibar, Piranha naik-turun) | layar tak boleh "beku" |
| **Reward cadence** | koin/`?`/power/kepingan tiap **≤ 2.5 layar** (~15–20 dtk) | dopamin |
| **Destructible/interaktif blok** | **≥2** blok bata/`?` per layar di zona blok | ledakan bata = noise visual |

**Rasio musuh (kalibrasi SMB 1-1, geser per-dunia):** rusher-darat (Goomba/Koopa) ~60% /
statik-hazard (Piranha pipa) ~25% / udara (Lakitu/Paratroopa) ~15%. Dunia awal lebih Goomba;
musuh berat/udara muncul setelah pemain terbiasa lompat.

## 3.5 BEAT-SHEET REFERENSI — Super Mario Bros World 1-1 (kepadatan yang ditiru)

> Riset: [Mario Wiki World 1-1], [Thonky SMB1 Guide], [StrategyWiki SMB World 1]. Level ini
> ~90–100 detik main, tapi memuat **13 cluster event** — itulah kepadatannya. Urut kiri→kanan:

| # | Posisi | Event (musuh / blok / koin / pipa / rahasia / terrain) |
|---|--------|--------------------------------------------------------|
| 1 | spawn | tanah datar; ruang kosong kiri → signpost "ke kanan"; **Goomba #1** jalan pelan mendekat (memaksa lompat pertama) |
| 2 | +detik | **`?`-block pertama** (koin) → ajari pukul-dari-bawah = positif |
| 3 | layar sama | **formasi 6-blok** (`?`+bata), blok kiri = **Magic Mushroom** (dipaksa geometri, memantul balik = tak bisa dihindari → belajar "jamur baik") |
| 4 | | **3 pipa** meninggi bertahap → ajari variable-jump sebelum pipa men-gate; pipa terakhir = **warp-zone rahasia (19 koin)** |
| 5 | sesudah pipa | **hidden 1-UP block** + **pit pertama** (telegraph, sempit) + `?` berisi power |
| 6 | atas | **Goomba jatuh** dari deretan blok atas (ancaman dari atas) |
| 7 | | **bata 10-koin** (pukul berulang) + **bata Starman** (kebal) |
| 8 | | **Koopa Troopa** + lebih banyak Goomba (eskalasi tipe musuh) |
| 9 | | piramida **Hard Block** dengan **gap di tengah** (running-jump test) |
| 10 | | piramida kedua dengan **pit di tengah** (gap lebih lebar) |
| 11 | | **2 Goomba** + 4 blok berderet (3 bata + 1 `?` koin) |
| 12 | | pipa (exit warp) tak-bisa-masuk + **tangga blok naik** |
| 13 | **GOAL** | **flagpole** — grab tinggi = skor bonus |

**Yang generator pelajari dari tabel ini (tuangkan sebagai rules):**
- **Reward di muka:** `?`-block koin & Mushroom dalam **detik pertama** (#2,#3), bukan menit.
- **Reward cadence ~15–20 dtk:** `?`/koin/Star/1-UP tersebar (#2,#3,#5,#7).
- **Eskalasi tipe monoton naik:** Goomba-darat → +Goomba-jatuh-dari-atas → +Koopa → +gap-lebar.
- **Terrain berubah:** datar → pipa (elevasi) → pit → piramida → tangga (bukan datar lurus).
- **Rahasia sebagai reward keingintahuan:** warp-pipe & hidden-block (kepingan bisa disembunyikan
  di sini di tema kita).
- **Tiap "napas" tetap terisi:** breather selalu ada koin/pipa/prop (breather ≠ kosong).

## 3.6 Pemetaan kepingan ke terrain (preview; detail APPENDIX W/X)

- Kepingan = **Kotak Cinta** (`?`-block emas berhati). Sebar via quota per-dunia (APPENDIX X).
- **Section inti di dunia awal** (`hero`, `schedule`, `rsvp` di dunia 1–2), agar tamu yang
  berhenti di tengah tetap dapat info pokok (§6.5 skill / layout §17).
- Kotak Cinta boleh disembunyikan di **hidden-block / warp-area** (meniru rahasia SMB 1-1) tapi
  **wajib reachable & telegraph** (jangan mandatory-hidden tanpa petunjuk — §12).

> **Golden Rule §3:** *Tiap layar = elevasi + ≥1 encounter + ≥1 reward; gap diisi coin-trail;
> reward tiap ≤2.5 layar; terrain berubah tiap segmen. Datar-kosong = gagal validator (regen).*

---

# §4 — PLAYER SYSTEM

## 4.1 Arsitektur

```js
class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 't_groom_idle0');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setCollideWorldBounds(false);       // jatuh jurang ditangani manual (§8/§17)
    this.body.setSize(22, 30).setOffset(2, 2);
    this.state = 'idle'; this.facing = 1; this.power = 'small'; // small|super|fire
    this.coyote = 0; this.jumpBuf = 0; this.invulnMs = 0; this.cheat = false;
  }
}
```

## 4.2 Fisika lompat & gerak — ANGKA KANONIK (dari riset SMB/SMW)

> Sumber: [Physics Factbook SMB gravity], [SMW Central quantifying physics], [Mario Wiki Jump].
> Nilai di-skala ke tile 32px @ 60fps. Ini **lantai keterasaan**, bukan angka arbitrer.

| Parameter | Nilai (px, tile=32) | Referensi kanonik |
|---|---|---|
| `WALK_SPEED` | 150 px/s (~4.7 tile/s) | jalan santai |
| `RUN_SPEED` | 300 px/s (~9.4 tile/s) | tahan tombol lari (Shift/B) → momentum |
| `ACCEL` | 900 px/s² | momentum terasa (bukan instant) — SMB "berat tapi lincah" |
| `FRICTION` (decel) | 1200 px/s² | berhenti ~0.25s |
| `AIR_ACCEL` | 600 px/s² | kontrol udara lebih rendah dari darat |
| `GRAVITY` (world) | 2200 px/s² | ~6.9× g (Physics Factbook), skala tile |
| `JUMP_V` (tap) | −620 px/s → ~3 tile | tap = lompat pendek |
| `JUMP_V` (hold penuh) | via `JUMP_CUT` → ~4–4.5 tile standing, ~5–6 running | variable jump |
| `JUMP_CUT` | ×0.45 saat lepas tombol & `vy<0` | variable jump height (§ APPENDIX T §3) |
| `RUN_JUMP_BOOST` | +8% `JUMP_V` saat `|vx| ≥ 0.8·RUN_SPEED` | running jump lebih tinggi (SMB3 table) |
| `MAX_FALL` | 700 px/s | cap "sail down" |
| `COYOTE_MS` | 90 ms (~5 frame) | Celeste 5-frame; forgiveness |
| `JUMP_BUFFER_MS` | 90 ms (~5 frame) | pencet sebelum mendarat = tetap lompat |

**Jump-arc tile-math (untuk level design — APPENDIX A):**
- Vertikal: **standing ~4 tile**; **run-up ~5**; **momentum penuh ~6 (maks)**. Variable: tap ~3.
- Horizontal: **tanpa momentum ~8 tile** (blok 1→9); **lari penuh ~12 tile (maks)**.
- **D_max** (jarak lompat-lari maks) = **12 tile** → gap **jangan** wajibkan > D_max.
- Lompat **naik lebih sulit** dari turun → gap ke atas naik 1 tier kesulitan.

## 4.3 State machine

```
        ┌──────── on ground ────────┐
        ▼                           │
     [IDLE] ◀──vx≈0── [RUN] ──lari cepat──▶ [DASH]
        │ jump           │ jump                │
        ▼                ▼                     ▼
     [JUMP_UP] ──vy>0──▶ [FALL] ──land──▶ (IDLE/RUN)  squash-land juice
        │                │
   (hold=lebih tinggi)   └─ landing (blocked.down) → squash
        │
     [HURT] ← kena musuh (knockback + i-frame; power turun 1 tier) → recover
        │
     [PRONE] ← tahan bawah di darat (crouch; resize body ON-STATE-CHANGE §18)
        │
     [FIRE_CAST] ← tombol lempar (bila power=fire) → recoil → balik state sebelumnya
```

- **Tanpa DEAD state** (undangan ramah §1.7). `HURT` = knockback + i-frame + turun tier power
  (fire→super→small; small tetap small, cuma i-frame). Repurpose "mati" → tidak ada.
- **PRONE:** resize body **hanya saat transisi** `wantProne !== _prone`, anchor bawah
  (`setOffset(.., H − newBodyH)`) — anti-judder (§18). Fire hanya bisa dilempar saat tidak prone.

## 4.4 Input abstraction

```js
// map keyboard + touch → satu model {left,right,up,down,run,jump,fire}
const inp = {
  left:  cursors.left.isDown  || joyLeft,
  right: cursors.right.isDown || joyRight,
  down:  cursors.down.isDown  || joyDown,
  run:   keyShift.isDown || btnRun,          // tahan = lari + boost lompat
  jump:  Phaser.Input.Keyboard.JustDown(keyJump) || btnJumpEdge,   // edge!
  fire:  Phaser.Input.Keyboard.JustDown(keyFire) || btnFireEdge,
};
```
- **Lompat pakai edge** (`JustDown`) + jump-buffer; **jangan** `isDown` (double-jump tak sengaja).
- Touch: joystick kiri-bawah (kiri/kanan/bawah) + tombol **JUMP** (besar) & **RUN/FIRE** kanan-bawah
  (§7 layout / APPENDIX Z). `run` = tahan tombol B ⇒ lari; `fire` di tombol yang sama saat power=fire.

## 4.5 ANIMASI per-state (WAJIB — jangan sprite statis)

> Grafis kaya = animasi frame-by-frame procedural (APPENDIX P fallback) atau PNG sheet (APPENDIX P).
> Minimum state ber-animasi (player):

| State | Frame | fps | Catatan pose |
|---|---|---|---|
| idle | 2 (napas) | ~4 | topi/dasi bergerak halus |
| run | 4 (kaki bergantian) | ~12 | condong sedikit `setAngle(±3)` |
| dash | 4 (run cepat) | ~16 | debu di kaki (partikel) |
| jump_up | 1 (kaki naik) | — | stretch `setScale(0.92,1.1)` |
| fall | 1 (kaki turun) | — | — |
| land | — | — | squash `setScale(1.2,0.8)` tween balik ~120ms |
| prone | 1 (jongkok) | — | body resize on-state-change |
| fire_cast | 2 (recoil+lempar) | ~14 | muzzle "hati-api" di tangan |
| hurt | 1 (tersentak) + kedip alpha | — | flash merah + knockback |

- **Musuh juga ber-animasi** (walk 2–3 frame + squash/die) — §5, APPENDIX B.
- Teknik murah tanpa spritesheet: `setFlipX(facing<0)`, tween recoil saat fire, squash&stretch
  saat lompat/mendarat, partikel debu saat dash. Guard `anims.exists` (re-inject).

## 4.6 Power state (small / super / fire)

| Power | Efek | Didapat | Kena musuh |
|---|---|---|---|
| **small** | tinggi 1 tile, tak bisa hancurkan bata | default | knockback + i-frame (tetap small) |
| **super** | tinggi ~2 tile, hancurkan bata bata biasa dgn head-bump | Jamur (§7.1) | turun ke small |
| **fire** | + lempar "hati-api" (proyektil, max 2 di layar) | Bunga (§7.2) | turun ke super |
- **Star** = kebal sementara ~9s + bisa "tabrak-bunuh" musuh (§7.3), lepas dari power tier.

> **Golden Rule §4:** *Player berat-tapi-lincah (momentum + variable jump ber-angka); tiap state
> ber-animasi; ramah (HURT bukan DEAD); D_max = 12 tile jadi batas desain gap.*

---

# §5 — ENEMY / OBSTACLE SYSTEM

## 5.1 Palet musuh (≥6 tipe, peran beda; ≤2 tipe/wave)

| ID | Nama | Peran | HP | Perilaku | Cara kalah |
|---|---|---|---|---|---|
| E-GOMB | **Goomba** | rusher darat | 1 | jalan lurus, jatuh dari tepi | **stomp** dari atas / hati-api / Star |
| E-KOOP | **Koopa Troopa** | rusher+shell | 1→shell | jalan; stomp → jadi **shell** yang bisa ditendang (bola liar) | stomp 2× / shell / hati-api |
| E-PARA | **Paratroopa** | flyer bounce | 1 | melompat/terbang pola sinus | stomp (jadi Koopa) → stomp lagi |
| E-PIRA | **Piranha Plant** | statik-hazard | ∞ (tak bisa distomp) | naik-turun dari pipa (telegraph); diam saat player dekat mulut pipa | hati-api / Star / hindari |
| E-LAKI | **Lakitu** | ranged-udara | 2 | melayang di atas, lempar **Spiny** ke bawah | hati-api / stomp saat turun / Star |
| E-SPIN | **Spiny** | rusher (tak bisa distomp) | 1 | jalan seperti Goomba tapi **berduri** (stomp = kena) | hati-api / Star |
| E-BUZZ | **Buzzy Beetle** (dunia bawah tanah) | tank-darat | 1→shell | tahan hati-api; stomp → shell | stomp / shell / Star |
| E-HAMMER | **Hammer Bro** (dunia akhir) | ranged-darat | 2 | lompat + lempar palu parabola | stomp saat jeda / hati-api / Star |

- **≤2 tipe per wave** (keterbacaan), **pool besar lintas dunia**. Mook mati 1 hit; hanya
  Hammer Bro/Buzzy telegraph lebih lama.
- Musuh datang dari **beberapa arah**: darat (Goomba/Koopa/Spiny), atas (Lakitu/Goomba-jatuh),
  pipa (Piranha).

## 5.2 AI state machine (contoh Goomba & Lakitu)

```
Goomba:  [WALK →] ──tepi/blok── balik arah ──▶ [WALK ←]
         stomped ──▶ [SQUASH] (flat 8px, 0.4s) ──▶ destroy + skor
         hati-api/star ──▶ [FLIP] (jungkir jatuh) ──▶ destroy

Lakitu:  [HOVER] (ikuti x player, offset atas) ──timer 2.5s──▶ [THROW Spiny]
         ──▶ balik HOVER; player lewat jauh ──▶ [RETREAT] keluar layar
```

## 5.3 Spawn rule — RELATIF-KAMERA (WAJIB, bug "peluru bunuh musuh off-screen" dicegah)

> Untuk platformer, "peluru" = **hati-api** (fire power) & **shell** yang meluncur. Bug yang
> dicegah: hati-api membunuh musuh yang **belum masuk layar**. Fix struktural = musuh off-screen
> **bukan entity**.

**Aturan ber-angka:**
1. **Musuh off-screen = DATA inert:** record `{x: triggerX, type, y, patrol}` di array **terurut
   naik `triggerX`**. JANGAN `enemies.create(...)` semua saat build stage.
2. **Spawn via pointer + ambang scroll** tiap frame:
   `while (next < spawnList.length && cam.scrollX + BW >= spawnList[next].x) { spawnEnemy(...); next++ }`.
   Musuh **lahir di `x = max(record.x, cam.scrollX + BW)`** (tepi kanan), bukan di world-X jauh.
3. **Hitbox HANYA untuk musuh aktif** (belum spawn = tak ada body).
4. **Hati-api & shell despawn di tepi viewport** (`x > cam.scrollX+BW+16 || x < cam.scrollX−16`)
   + lifetime ~1s. Cap hati-api 2 di layar.
5. **Hit-detection iterasi musuh AKTIF** (`e.active && e.body`), + sweep manual anti-tunnel (§22
   layout / APPENDIX T) untuk hati-api cepat vs musuh tipis.
6. **Musuh self-despawn saat scroll keluar kiri** (`e.right < cam.scrollX − grace`) → anti-leak.

```js
// pola spawn relatif-kamera (di update())
this._next = this._next || 0;
var cam = this.cameras.main, edge = cam.scrollX + BW;
while (this._next < this.spawnList.length && edge >= this.spawnList[this._next].x) {
  var r = this.spawnList[this._next++];
  this.spawnEnemy(r.type, Math.max(r.x, edge), r.y);
}
```

## 5.4 Density floor (musuh selalu ADA)

- Zona tempur: **≥1–2 musuh aktif/layar** (easy 1 · normal 2 · hard 3). Divalidasi (APPENDIX E).
- Spawn **jangan murni `Math.random()`** — `spawnList` di-generate dengan jaminan minimum
  per-segmen (APPENDIX F). "Musuh kadang ada kadang nggak" = bug.
- **≤2 tipe per wave** tetap dipatuhi (plafon variasi hidup bersama lantai kepadatan).

## 5.5 Pooling (Group)

```js
this.enemies = this.physics.add.group({ removeCallback: e=>{/*…*/} });
this.fireballs = this.physics.add.group({ classType: Fireball, maxSize: 2, runChildUpdate: true });
this.shells = this.physics.add.group({ maxSize: 4, runChildUpdate: true });
```

> **Golden Rule §5:** *≥6 tipe musuh (≤2/wave), datang dari beberapa arah, ber-animasi; spawn
> RELATIF-KAMERA (off-screen = data, lahir di tepi kanan) → hati-api tak bisa membunuh musuh
> yang belum tampil; density floor ≥1–2 musuh/layar divalidasi.*

---

# §6 — INTERACTION & COLLISION MATRIX

| A ↓ \ B → | Player (small) | Player (super/fire) | Player (star/cheat) | Hati-api | Shell (meluncur) |
|---|---|---|---|---|---|
| **Goomba** | knockback+iframe (A) | knockback+iframe (A) | musuh mati | musuh mati | musuh mati |
| **Goomba (di-stomp dari atas)** | musuh SQUASH + player bounce | idem | idem | — | — |
| **Koopa** | knockback (A) | knockback (A) | mati | mati | mati |
| **Koopa (stomp)** | jadi shell (diam) | idem | mati | — | — |
| **Shell diam (player sentuh samping)** | tendang → meluncur | idem | mati | — | — |
| **Spiny/Piranha (stomp/sentuh)** | knockback (A) — **tak bisa distomp** | knockback (A) | mati | mati | mati |
| **`?`-block / bata (head-bump dari bawah)** | keluar koin/power (small: bata tak pecah) | super: bata pecah | idem | — | — |
| **Kotak Cinta (head-bump dari bawah)** | UNLOCK kepingan | idem | idem (cheat: sudah unlock) | — | — |
| **Koin / power-up / Star (overlap)** | collect | collect | collect | — | — |
| **Flagpole (overlap)** | stage clear | idem | idem | — | — |
| **Jurang (player.y > worldBottom)** | respawn aman (§8/§17) | idem | idem (cheat: kebal jatuh? tidak — tetap respawn) | despawn | despawn |

- **Collider vs overlap:** platform/tanah/pipa/blok = `collider` (separasi). Koin/power/kepingan/
  flagpole/musuh-vs-player = `overlap` (deteksi, damage/collect via callback).
- **Stomp detection:** valid stomp = `player.body.velocity.y > 0 && player.body.bottom ≤ enemy.body.top + 10`
  (jatuh mengenai kepala). Selain itu = knockback ke player.
- **i-frame:** `invulnMs` (default ~1200ms); saat aktif, overlap musuh diabaikan + player kedip alpha.
- **Peluru (hati-api) vs musuh di atas balok:** daftarkan overlap `fireballs×enemies` **SEBELUM**
  collider `fireballs×platforms` + `processCallback` tolak-kill saat nimpa musuh + `manualEnemyHits`
  sweep anti-tunnel (§22 layout / APPENDIX T). `hitEnemy` guard `active` (idempotent).

> **Golden Rule §6:** *Stomp dari atas = kill (kecuali berduri); samping = knockback+iframe;
> pukul-dari-bawah = koin/power/UNLOCK kepingan. i-frame melindungi; peluru selalu menang atas
> platform (overlap-first + sweep).*

---

# §7 — POWER-UP / ITEM SYSTEM (item gameplay ≠ kepingan undangan)

> **Powerup Relevance Rule:** powerup **ofensif** (Fire, Star) wajib punya **usage-window**
> (≥1 musuh/segmen berbahaya) sebelum flagpole. Kalau tidak ada musuh setelahnya → ganti reward
> pasif (koin/1-UP-skor). *Useful > Reachable.* **Kepingan undangan ≠ powerup** (murni koleksi,
> nol buff).

## 7.1 Magic Mushroom (Jamur)

- Muncul dari `?`-block; **bergerak** (memantul dinding) → geometri memaksa collect (metode Mario
  1-1: terkurung bata di atas → memantul balik). small→super. **super-first** bila player masih small.
- Spawn: 1 per dunia awal (dunia 1) + saat butuh (setelah HURT ke small di dunia sulit).

## 7.2 Fire Flower (Bunga Api → "Bunga Cinta")

- Dari `?`-block (hanya muncul bila player ≥super). super→fire. Beri lempar **hati-api**:
  proyektil memantul tanah, mati kena musuh/dinding, max 2 di layar.
- **Usage window wajib:** taruh Bunga **sebelum** gauntlet musuh, bukan sebelum flagpole kosong.

## 7.3 Star (Bintang Kebahagiaan)

- Kebal ~9s + tabrak-bunuh musuh + musik cepat (SFX game, bukan backsound). Melompat memantul.
- Taruh sebelum **gauntlet padat** (usage window), mis. deretan Goomba/pit — bukan sebelum goal.

## 7.4 1-UP (repurpose — tanpa nyawa)

- Tak ada nyawa (§1.7) → 1-UP Mushroom hijau = **bonus skor besar + toast "💚"** (kolektibel murni).
  Boleh disembunyikan (hidden-block) untuk penjelajah, tapi **tak wajib**.

## 7.5 Koin

- Filler skor + reward cadence. **Coin-trail mengisi gap** (busur di atas jurang menandai jalur
  lompat — §12 no blind jump). Koin di `?`-block, bata, & tersebar. Tak memengaruhi kepingan.

> **Golden Rule §7:** *Item gameplay (Jamur/Bunga/Star) menolong & punya usage-window sebelum
> goal; koin = filler+petunjuk; kepingan undangan terpisah total (nol buff).*

---

# §8 — DIFFICULTY SCALING

## 8.1 Undangan ramah — TANPA nyawa/game-over (default EASY)

- **HAPUS nyawa & game-over** (§1.7). Kena musuh = knockback + i-frame + turun tier power.
  Small kena = knockback saja (tetap main). **Tak pernah "ulang dari awal stage".**
- **Jatuh jurang** = satu-satunya relokasi → respawn ke titik **aman mundur ~200px** (§17):
  scan mundur cari x yang (a) bukan hazard, (b) tak ada musuh dalam ~220px, (c) ada tanah; gagal →
  checkpoint terakhir. **Freeze musuh ~1s** setelah respawn (anti spawn-kill).
- Cheat = kebal total (§ APPENDIX Y).

## 8.2 Knobs per difficulty (bukan wall)

| Knob | EASY (default) | NORMAL | HARD |
|---|---|---|---|
| `minEnemiesPerScreen` | 1 | 2 | 3 |
| enemy speed | ×0.85 | ×1.0 | ×1.2 |
| i-frame (`invulnMs`) | 1400 | 1200 | 900 |
| gap width max (% D_max) | 60% | 75% | 90% |
| Lakitu/Hammer Bro | jarang | normal | sering |
| power-up frequency | tinggi | sedang | rendah |
| respawn freeze musuh | 1.2s | 1.0s | 0.7s |

## 8.3 Kurva sawtooth (peak-and-valley, bukan ramp lurus)

- Tiap stage: 3–5 **puncak** (gauntlet musuh/gap sulit) diselang **lembah** (breather berisi
  koin/prop/kepingan). Tren naik antar-dunia; lembah tetap **terisi** (density floor).
- Antar-dunia: dunia 1 (ajar) → 2 (bawah tanah, gelap+Buzzy) → 3 (pantai, Cheep-Cheep opsional)
  → 4 (langit, Lakitu+platform bergerak) → 5 (es, licin) → 6 (kastil, Hammer Bro + boss).
- Difficulty dipilih di **cover** & **stage-select** (satu overlay, tombol OK — §Z/§14 layout).

> **Golden Rule §8:** *Undangan = ramah: tanpa nyawa/game-over; kena = knockback+iframe; jatuh
> = respawn aman mundur + freeze musuh. Difficulty = knob density/speed/iframe, kurva sawtooth.*

---

# §9 — CAMERA & READABILITY

**Aturan ber-angka (side-scroller maju-ke-kanan — bug metalslug dicegah):**
```js
const BW = this.scale.width, BH = this.scale.height;   // pakai W/H tetap dari boot (APPENDIX S)
this.cameras.main.startFollow(this.player, true, 0.14, 0.14);   // lerp 0.14
this.cameras.main.setDeadzone(20, 120);                          // kecil-responsif
this.cameras.main.setFollowOffset(-Math.round(BW * 0.40), -70);  // player ke KIRI ⅖ layar
this.cameras.main.setBounds(0, 0, this.worldW, BH);
```
- **Follow-offset −0.40·BW** → player di kiri ⅖ layar → pandangan depan ~60% (jurang/musuh
  terlihat sebelum lompat). Batas ~0.42 (lebih → player mepet tepi, musuh dari belakang tak
  terlihat). **Nilai teruji:** 0.22 sempit → 0.34 lebih baik → **0.40 nyaman**.
- **Deadzone 20×120** (BUKAN 120×200 lembam) → kamera cepat mengikuti.
- **Vertical:** offset −70 sedikit ke atas (lihat platform di atas). Bounds vertikal = BH (stage
  1-layar tinggi) atau lebih untuk dunia langit (vertical platforming) dengan `setBounds` lebih tinggi.
- **No blind jump:** pendaratan tiap lompat terlihat saat takeoff (dijamin oleh offset + lookahead).

```
  ┌───────────────────────────────────────┐
  │   [P]→    │   ← ~60% layar = depan     │  ✅ offset -40%·BW
  │           │      (jurang/musuh terlihat)│
  └───────────────────────────────────────┘
       40%
```

> **Golden Rule §9:** *Player di kiri ⅖ layar (`setFollowOffset(-0.40·BW,-70)` + deadzone kecil),
> jangan di tengah; pendaratan tiap lompat terlihat saat takeoff.*

---

# §10 — GAME FEEL / JUICE + GRAFIS

## 10.1 Transisi antar-stage SINEMATIK (bukan pause + tombol "Lanjut")

Saat flagpole disentuh:
- **JANGAN** `scene.pause()` + overlay tombol. Pakai state-machine `clearSeq = {phase, t}` di
  `update()`, early-return ke cabang outro (skip scroll/spawn/AI).
- **Fase `flag`:** player meluncur turun tiang (tween), skor bonus tinggi grab.
- **Fase `banner`:** banner in-canvas "STAGE CLEAR — DUNIA n" `setScrollFactor(0)`, pop-in
  `Back.out ~320ms`, tahan ~0.9s.
- **Fase `fly`:** kunci input (`player.autoFly=true`), player **lari sendiri keluar layar kanan**
  ke pintu kastil/pipa exit (ramp speed), debu di kaki. Dunia beku + player kebal selama outro.
  Safety-timeout `t>2500ms → done`.
- **`done`:** `loadStage(next)`; player masuk dari tepi kiri stage baru (tween `Cubic.out ~620ms`),
  `autoFly` sampai settle. `killTweensOf` dulu (anti-tumpuk saat reload cepat).
- **Dunia 6:** stage terakhir bukan via outro ini — pintu kastil → boss walk-in (APPENDIX D).

## 10.2 Juice stack (angka)

| Efek | Nilai | Kapan |
|---|---|---|
| **Freeze-frame** | 2–4 frame (33–67ms) hit ringan; 5–8 frame stomp/power | stomp musuh, unlock kepingan, hit boss |
| **Screen shake** | `camera.shake(120, 0.02)` (intensity float, trauma² decay ~300ms) | stomp berat, bata pecah, boss hit |
| **Screen flash** | `camera.flash(80, 255,240,180)` putih=impact, `camera.flash(120,255,60,60)` merah=hurt | impact, kena musuh |
| **Squash&stretch** | jump `setScale(0.92,1.1)`; land `setScale(1.2,0.8)` ease balik ~120ms | lompat/mendarat |
| **Partikel** | koin sparkle, hati (unlock kepingan), debu (dash), bata pecah (4 pecahan) | collect/unlock/impact |
| **SFX pitch-vary** | ±1–3 semitone (×1.06) pada koin/stomp berulang, 3–5 variasi | SFX berulang |

- **Stack semua efek di frame impact yang sama** (shake+freeze+flash+partikel+SFX). Juice
  **menghias**, tak mengubah hitbox/simulasi.

## 10.3 Partikel — API 3.60+ (JANGAN `createEmitter`)

```js
// ✅ 3.80.1
const em = this.add.particles(0, 0, 't_spark', {
  speed:{min:-160,max:160}, scale:{start:0.7,end:0}, lifespan:500, blendMode:'ADD', emitting:false });
em.explode(10, x, y);   // burst saat unlock/stomp
// em.destroy() saat shutdown (cleanup).
// ❌ this.add.particles('spark').createEmitter({...}) → THROW di 3.80.1
```

## 10.4 Grafis procedural WAJIB di-shade (bukan flat)

Tiap sprite `generateTexture` = base + **highlight** (top ~22%) + **shadow** (bottom ~22%) +
**outline gelap** (`lineStyle(2, 0x201808)`). Helper `box()`/`outline()` (APPENDIX T §5).
Siluet unik per entity (Goomba jamur-gepeng; Koopa cangkang-hijau; Kotak Cinta emas-berhati).
**Opsi grafis "game sungguhan": PNG sprite sheet** (APPENDIX P) menggantikan procedural;
procedural tetap **fallback** wajib.

## 10.5 Backdrop parallax (§ APPENDIX C untuk palet per-dunia)

- Sky gradient per-dunia `fillGradientStyle(...).setScrollFactor(0)`.
- **≥3 lapis parallax:** jauh `scrollFactor 0.2` (bukit/gunung), medium `0.45` (pohon/pipa dekor),
  dekat `0.7` (semak/pagar). Awan `0.1`. Rebuild per stage, `clear` group lama.

> **Golden Rule §10:** *Stack juice di frame impact (freeze+shake+flash+partikel+SFX); transisi
> antar-stage = mini-cutscene (banner→lari-keluar→masuk seberang), bukan tombol; sprite di-shade
> 3-tone; partikel API 3.60+.*

---

# §11 — AUDIO DESIGN

- **SFX game** via `this.sound` / Web Audio internal (bebas): jump (blip naik), stomp (thud),
  coin (ting, pitch-vary), power-up (rise), kepingan-unlock (chime hati), bata-pecah, hurt,
  flagpole (fanfare pendek), boss-hit, win (fanfare panjang).
- **Backsound undangan = MILIK HOST.** Tema **DILARANG** `audio.play()` backsound tenant.
  Tema hanya klik `#btn-toggle-music` + **mirror** ikon (idempotent — APPENDIX Z). Musik cepat
  saat Star = SFX game (bukan menimpa backsound host).
- SFX procedural (osilator Web Audio) lebih disukai (tanpa CORS); atau `this.sound.add` dari data
  base64 kecil. Selalu ada mute internal untuk SFX (terpisah dari toggle backsound host).

> **Golden Rule §11:** *SFX game bebas (Web Audio internal); backsound undangan hanya host —
> tema cuma klik `#btn-toggle-music` + mirror ikon idempotent.*

---

# §12 — ANTI-FRUSTRATION RULES

- **Coyote time** 90ms (~5 frame): lompat masih valid ~5 frame setelah lepas tepi platform.
- **Jump buffer** 90ms: pencet lompat ~5 frame sebelum mendarat → tetap lompat saat menyentuh tanah.
- **Corner-correction** ~4px: kepala kena sudut blok saat lompat → geser player ~4px agar lolos
  (Celeste). Wall/ceiling tolerance ~2–5px.
- **No spawn-kill:** setelah respawn/checkpoint, freeze musuh ~1s + hazard pertama telegraph.
- **No blind jump:** landing terlihat saat takeoff (kamera §9); gap diisi coin-trail sebagai jalur.
- **No mandatory-hidden:** kepingan di hidden-block wajib punya petunjuk (koin mengarah / retak
  visual); jangan sembunyikan section penting tanpa telegraph.
- **No instakill lookalike:** objek mirip = perilaku sama; Spiny (berduri, tak bisa distomp)
  **beda siluet jelas** dari Goomba.
- **First hazard after checkpoint = telegraph** (pelan, terlihat).

> **Golden Rule §12:** *Coyote+buffer 5 frame, corner-correct 4px, no spawn-kill/blind-jump/
> mandatory-hidden/instakill-lookalike; hazard pertama setelah checkpoint di-telegraph.*

---

# APPENDIX A — PATTERN LIBRARY (40 pola ber-ID)

> Katalog pola level ber-ID, spesifik platformer Mario. Tiap pola: nama+ID, layout ASCII,
> purpose, rules (ber-angka), chaining. **Generator (APPENDIX F) merangkai stage dari pola ini.**
> Legenda ASCII: `#`=tanah/hard-block · `=`=platform one-way · `?`=`?`-block · `B`=bata ·
> `$`=Kotak-Cinta(kepingan) · `o`=koin · `G`=Goomba · `K`=Koopa · `S`=Spiny · `P`=Piranha(pipa) ·
> `L`=Lakitu · `H`=Hammer-Bro · `▓`=pipa · `_`=jurang · `☆`=Star · `♪`=Jamur/Bunga · `⚑`=flagpole ·
> `M`=Mario/player-spawn.

## KATEGORI: TUTORIAL (T) — zona fail-proof, dunia-1 awal

### T001 — Intro Walk-Right
```
  M           o o o
  ###################
```
- **Purpose:** ajari "ke kanan" tanpa teks (ruang kosong kiri + koin kanan).
- **Rules:** ≥5 tile datar, tanpa musuh/jurang. Koin trail menandai arah. Wajib pola #1 tiap dunia-1.

### T002 — Intro Jump (Single Block)
```
        ?
  M    ###   o
  #############
```
- **Purpose:** lompat pertama (rendah, standing-jump ~4 tile aman).
- **Rules:** rintangan tinggi 1 tile; `?` di atas = koin (reward lompat pertama). No pit di bawah.

### T003 — Intro Goomba
```
  M      G→
  ##############
```
- **Purpose:** memaksa stomp/lompat pertama; Goomba jalan pelan (x0.85 speed) mendekat.
- **Rules:** tanah datar (no pit) agar mati murah = mengajari; Goomba spawn ~8 tile dari M.

### T004 — Intro Love-Box (kepingan pertama)
```
        $
  M    ###   G→
  ##############
```
- **Purpose:** ajari mekanik KEPINGAN segera (pukul dari bawah = unlock). `$` emas berdenyut,
  jelas beda dari `?`. Reward-first (onboarding).
- **Rules:** WAJIB muncul di dunia-1 zona awal (section `hero`). Reachable standing-jump. Unlock
  → toast + ikon menyala (APPENDIX X).

## KATEGORI: KOIN (C) — filler + petunjuk jalur

### C001 — Coin Arc Small
```
     o o o
    o     o
  ############
```
- **Purpose:** reward lompat kecil; busur = jalur.
- **Rules:** 5–7 koin busur setinggi standing-jump; di atas tanah aman.

### C002 — Coin Arc Over Gap (petunjuk lompat)
```
      o o o
     o  _  o
  ###_______###
```
- **Purpose:** **no blind jump** — koin menandai busur lompat di atas jurang.
- **Rules:** busur puncak = tinggi lompat lari; gap ≤ D_max sesuai difficulty. WAJIB dipakai untuk
  gap pertama tiap dunia.

### C003 — Coin Trail (mengisi dead-air)
```
  o o o o o o o o
  #################
```
- **Purpose:** isi bentang datar agar tak "dead air" (density §3.4).
- **Rules:** dipakai generator sebagai **filler** saat validator density menemukan gap kosong.

### C004 — Coin Cluster (reward puncak)
```
   o o o
   o o o
   =====
  #########
```
- **Purpose:** hadiah setelah gauntlet (lembah reward).
- **Rules:** di atas platform one-way; 6–9 koin.

### C005 — Ten-Coin Brick (SMB 1-1 #7)
```
       [B10]     <- pukul berulang = 10 koin
  M    ###
  #############
```
- **Purpose:** rahasia reward (pukul bata berulang). Nostalgia SMB.
- **Rules:** 1 bata khusus keluar 10 koin (timer ~2s). Telegraph opsional (kilau).

## KATEGORI: GAP / JURANG (G)

### G001 — First Gap (sempit, telegraph)
```
  M          o
  ######___######
```
- **Purpose:** jurang pertama; sempit (≤40% D_max = ~5 tile easy).
- **Rules:** gap pertama tiap dunia ≤40% D_max; landing terlihat; coin di seberang.

### G002 — Medium Gap
```
        o o o
  #####_______#####
```
- **Rules:** ~60–75% D_max (mid ~8 tile); coin-arc penanda (C002).

### G003 — Running Gap (test momentum)
```
              o
  ######___________######   <- butuh lari penuh (~12 tile <= D_max)
```
- **Rules:** ≤90% D_max; hanya di dunia lanjut/late-segment; ada run-up ≥6 tile sebelum gap.

### G004 — Pit + Piranha Pipe (SMB 1-1 #9/#10)
```
        ▓P            ▓P
  #####_##____________##_#####
```
- **Rules:** pipa dengan Piranha di kedua tepi gap; lompat harus menghindari mulut pipa (Piranha
  turun saat player dekat — telegraph).

## KATEGORI: MUSUH (E)

### E001 — Single Goomba (tanah datar)
```
       G→
  ############
```
- **Rules:** dunia awal; stompable; no pit dekat.

### E002 — Double Goomba
```
      G→  G→
  ##############
```
- **Rules:** jarak antar ~2 tile; stomp berturut = bounce-combo (skor).

### E003 — Goomba From Above (SMB 1-1 #6)
```
  B B B B B B     <- Goomba jatuh dari deret bata
       G↓  G↓
  M
  ##################
```
- **Rules:** ancaman dari atas; telegraph (Goomba terlihat di deret bata sebelum jatuh).

### E004 — Koopa + Shell Lane
```
      K→          o o o
  ########################
```
- **Rules:** stomp Koopa → shell; shell bisa ditendang menyapu koin/musuh (risk: mantul balik).

### E005 — Spiny Drop (Lakitu)
```
       L~~~~
        S↓
  M
  ################
```
- **Rules:** Lakitu melayang lempar Spiny (berduri, tak bisa distomp) → butuh hati-api/hindar.
  Dunia langit (4). ≤2 tipe/wave: Lakitu+Spiny saja.

### E006 — Piranha Corridor
```
   ▓P    ▓P    ▓P
  ####  ####  ####
```
- **Rules:** koridor 3 pipa; Piranha telegraph naik-turun 2s; timing lari.

### E007 — Hammer Bro Gate (dunia 6)
```
        H (lempar palu parabola)
  M   ====
  ###########
```
- **Rules:** dunia kastil; palu parabola telegraph; stomp saat jeda lempar. Powerup Fire disarankan
  sebelum ini (usage window §7).

## KATEGORI: BLOK / `?` (B)

### B001 — Question Row (koin/power)
```
   ? ? ?
  M
  ############
```
- **Rules:** `?` keluar koin; 1 dari row = power-up (Jamur bila small). Head-bump dari bawah.

### B002 — Six-Block Formation (SMB 1-1 #3)
```
   B ? B   B
   M   ?        <- blok tertentu = Mushroom (dipaksa geometri)
  ###############
```
- **Rules:** meniru formasi ikonik; Mushroom memantul balik ke player (tak terhindar).

### B003 — Hidden Block (rahasia)
```
   (?)           <- invisible; muncul saat head-bump
  M   o o o
  ###########
```
- **Rules:** hidden 1-UP/koin; **telegraph via koin sekitar** (no mandatory-hidden §12).

### B004 — Love-Box on Platform (kepingan vertikal)
```
       $
      ===
  M         G→
  ##############
```
- **Purpose:** kepingan butuh eksplorasi vertikal (lompat ke platform lalu pukul `$`).
- **Rules:** reachable; platform one-way; ada musuh di jalur (usage konteks) tapi kepingan sendiri
  nol-buff.

### B005 — Brick Staircase Up
```
              B
           B  #
        B  #  #
     B  #  #  #
  M  #  #  #  #
  ################
```
- **Rules:** tangga naik (akses area atas / flagpole). Elevasi (density §3.4).

## KATEGORI: PIPA / TERRAIN (P)

### P001 — Rising Pipes (SMB 1-1 #4, ajar variable jump)
```
              ▓
        ▓  ▓  ▓
  M  ▓  ▓  ▓  ▓
  ################
```
- **Rules:** pipa meninggi bertahap → butuh variable-jump makin tinggi sebelum men-gate.

### P002 — Warp Pipe (rahasia → area kepingan)
```
   ▓(masuk)              ▓(keluar)
  #########  [AREA KOIN + $]  #########
```
- **Purpose:** area rahasia berisi banyak koin + **1 Kotak Cinta** (meniru warp-zone SMB 1-1).
- **Rules:** masuk via lompat-ke-bawah di pipa hijau bertanda; area terisi (density); keluar dekat
  flagpole. Telegraph (panah/koin ke pipa).

### P003 — Elevated Platform Run
```
     ===   ===   ===
  M         G→
  ###################
```
- **Rules:** pijakan one-way tiap 6–10 tile (density elevasi); jalur atas alternatif.

### P004 — Moving Platform (dunia langit)
```
     ═══►            ◄═══
  M      _______________
  ###                  ###
```
- **Rules:** platform bergerak H/V di atas jurang; kecepatan ≤ setengah run-speed; telegraph jalur.

## KATEGORI: HAZARD (H) — dunia lanjut

### H001 — Ice Slick (dunia 5)
- **Rules:** tanah es → friction x0.3 (physics modifier biome); lompat presisi lebih sulit; gap
  dinaikkan 0 tier (kompensasi es). Telegraph (tekstur es mengkilap).

### H002 — Lava Gap (dunia 6)
```
  #####≈≈≈≈≈#####   <- ≈ = lava (jurang mematikan → respawn aman)
```
- **Rules:** jatuh lava = respawn aman (§17), bukan mati. Platform di atas lava.

### H003 — Firebar (kastil)
- **Rules:** batang api berputar (telegraph, kecepatan konstan); timing lewat. Dunia 6.

## KATEGORI: PUNCAK/GAUNTLET & GOAL

### X001 — Mini-Gauntlet (puncak)
```
   G→ K→   ? ☆      _   G→
  ####  ===  ####___####
```
- **Rules:** kombinasi 2 musuh + gap + Star (usage window) = puncak sawtooth; disusul lembah C004.

### X002 — Flag Staircase (goal)
```
              ⚑
           #  |
        #  #  |
     #  #  #  |
  M  #  #  #  |
  ################
```
- **Rules:** tangga → flagpole; grab tinggi = skor. Trigger transisi sinematik (§10.1). Dunia 1–5.

## PATTERN CHAIN RULES

- **Jangan >2 pola sama berturut** (mis. 3x E001 = monoton) — selingi kategori.
- **Tiap dunia:** buka dengan T-pola (dunia 1) / breather aman (dunia 2+), tutup dengan X002.
- **1 mekanik baru per segmen** (Kishotenketsu §1.2): perkenalkan di zona aman → practice → twist.
- **Gap pertama tiap dunia** = G001/C002 (≤40% D_max). Gap sulit (G003) hanya late-segment.
- **Kotak Cinta ($)** disebar via quota (APPENDIX X) — B004/P002/T004; **tak menumpuk** di 1 pola.
- **Usage window powerup:** Star/Bunga (☆/♪) selalu **sebelum** X001 gauntlet, bukan sebelum X002.

## LEVEL GENERATION FORMULA (% pola per difficulty)

| Kategori | EASY | NORMAL | HARD |
|---|---|---|---|
| Tutorial/breather (T, C) | 40% | 30% | 20% |
| Gap (G) | 10% | 18% | 25% |
| Musuh (E) | 20% | 28% | 35% |
| Blok/`?`/kepingan (B) | 20% | 15% | 12% |
| Pipa/terrain/hazard (P,H) | 10% | 9% | 8% |
| **elevasi wajib** | ≥1/layar semua difficulty (density floor) | | |

> **Golden Rule APPENDIX A:** *Rangkai stage dari pola ber-ID (≥40 pola dgn varian); jangan >2
> pola sama berturut; gap pertama ≤40% D_max; kepingan via quota (tak menumpuk); powerup ofensif
> punya usage-window sebelum goal; ≥1 elevasi/layar (density floor).*

---

# APPENDIX B — ENTITY ENCYCLOPEDIA

> Tiap entity: spec `yaml` (hp/speed/damage/behavior), state machine, kill condition, collision
> rules. Angka dalam px (tile=32) @ 60fps. Semua **hadap KANAN** (engine flip ke kiri).

## B.1 Player — Si-Groom

```yaml
id: player_groom
size_small: { w: 22, h: 30 }
size_super: { w: 22, h: 54 }
body_offset: { x: 2, y: 2 }
walk_speed: 150         # px/s
run_speed: 300          # tahan RUN
accel: 900              # px/s^2 (momentum)
friction: 1200
air_accel: 600
gravity: 2200           # world
jump_v_tap: -620        # ~3 tile
jump_cut: 0.45          # variable jump (lepas tombol & vy<0)
run_jump_boost: 0.08    # +8% jump_v saat |vx|>=0.8*run
max_fall: 700
coyote_ms: 90
jump_buffer_ms: 90
invuln_ms: 1200         # i-frame setelah hurt (easy 1400)
powers: [small, super, fire]   # tier
states: [idle, run, dash, jump_up, fall, land, prone, fire_cast, hurt]
death: none            # UNDANGAN RAMAH — tak ada DEAD state
```
- **State machine:** §4.3. **HURT:** knockback (vx = -facing*220, vy = -260) + i-frame + power−1
  tier. **Fall to pit:** respawn aman (§17), bukan death.
- **Collision:** collider vs platform/tanah/pipa/blok; overlap vs musuh/koin/power/kepingan/flag.
- **Stomp:** valid bila `vy>0 && body.bottom <= enemy.top+10` → bounce `vy=-360` + kill musuh.

## B.2 Goomba

```yaml
id: E-GOMB
size: { w: 28, h: 24 }
hp: 1
speed: 60               # x0.85 easy, x1.2 hard
behavior: patrol_straight   # jalan lurus, balik saat tepi/dinding
falls_off_ledge: true
states: [walk, squash, flip]
kill_by: [stomp, fireball, shell, star]
skor: 100
```
- **walk:** jalan; balik arah saat `blocked.left/right` atau tepi platform (raycast bawah-depan).
- **squash:** di-stomp → flat 8px, 0.4s → destroy + skor + freeze 2f.
- **flip:** hati-api/star → jungkir (`setAngle(180)`, vy=-300) jatuh → destroy.
- **damage ke player:** samping/bawah → knockback (kecuali i-frame).

## B.3 Koopa Troopa

```yaml
id: E-KOOP
size: { w: 28, h: 40 }
hp: 1                    # stomp -> shell (bukan mati)
speed: 55
behavior: patrol_straight
falls_off_ledge: false  # Koopa balik di tepi (klasik)
states: [walk, shell_idle, shell_slide]
kill_by: [stomp(2x), fireball, star]
skor: 100
```
- **stomp #1:** walk → shell_idle (diam, 5s lalu revive walk). **stomp #2 / sentuh samping:**
  shell_slide (meluncur `speed=420` arah tendang). **shell_slide** membunuh musuh lain + mantul
  dinding (risk: balik ke player). Star/fireball = mati langsung.

## B.4 Paratroopa

```yaml
id: E-PARA
size: { w: 28, h: 40 }
hp: 1
behavior: hop_sine       # melompat parabola / terbang pola sinus (amplitudo 96px)
states: [fly, walk]
kill_by: [stomp -> jadi Koopa walk, fireball, star]
skor: 200
```
- **stomp:** kehilangan sayap → jadi Koopa (walk). Stomp lagi → shell.

## B.5 Piranha Plant

```yaml
id: E-PIRA
size: { w: 28, h: 40 }
hp: infinite             # tak bisa distomp
behavior: pipe_bob        # naik-turun dari pipa; DIAM saat player dekat mulut pipa (radius 64px)
period_ms: 2000
states: [down, rising, up, lowering]
kill_by: [fireball, star]   # atau HINDARI
skor: 200
```
- **telegraph:** rising 400ms sebelum full-up. **damage:** sentuh saat up = knockback.

## B.6 Spiny

```yaml
id: E-SPIN
size: { w: 28, h: 26 }
hp: 1
behavior: patrol_straight
spiked: true             # STOMP = kena player (knockback)
states: [walk]
kill_by: [fireball, star]   # BUKAN stomp
skor: 100
```
- Siluet **jelas berduri** (beda dari Goomba) — no instakill lookalike (§12).

## B.7 Lakitu

```yaml
id: E-LAKI
size: { w: 32, h: 40 }
hp: 2
behavior: hover_follow    # melayang di atas, ikut x player (lerp 0.05), offset y=-260
throw_interval_ms: 2500
states: [hover, throw, retreat]
kill_by: [stomp saat turun, fireball(2x), star]
skor: 800
```
- **throw:** spawn Spiny jatuh (E-SPIN) ke posisi player. **retreat:** player lewat jauh → keluar
  layar (anti-leak). Dunia langit (4).

## B.8 Buzzy Beetle

```yaml
id: E-BUZZ
size: { w: 28, h: 26 }
hp: 1
behavior: patrol_straight
fireproof: true          # hati-api tak mempan (tank)
states: [walk, shell_idle, shell_slide]
kill_by: [stomp -> shell, shell, star]
skor: 100
```
- Dunia bawah tanah (2). Ajari "tidak semua bisa dibakar" (variasi).

## B.9 Hammer Bro

```yaml
id: E-HAMMER
size: { w: 30, h: 44 }
hp: 2
behavior: hop_and_throw   # lompat kecil di tempat + lempar palu parabola tiap 1.2s
states: [idle, hop, throw, hurt, dead]
kill_by: [stomp(saat jeda lempar), fireball(2x), star]
skor: 1000
```
- **throw:** palu parabola (telegraph wind-up 400ms, busur terbaca). Dunia 6 (kastil). Usage window
  Fire (§7).

## B.10 Fireball (proyektil player, power=fire)

```yaml
id: OBJ-FIRE
size: { w: 14, h: 14 }
speed: 360
gravity: 900            # memantul tanah (vy flip x0.7)
lifespan_ms: 1000
max_alive: 2
despawn: at_viewport_edge   # + lifetime (spawn relatif-kamera §5.3)
```
- Mati kena musuh (kill non-fireproof) / dinding (partikel). **Overlap enemies didaftar SEBELUM
  collider platform** (§22 layout). Sweep anti-tunnel.

## B.11 Kotak Cinta (Love-Box — item kepingan)

```yaml
id: OBJ-LOVEBOX
size: { w: 32, h: 32 }
appearance: gold `?`-block dengan HATI berdenyut (pulse scale 1.0-1.08, 1.2s)
hp: 1 (head-bump)
behavior: static (menempel world)
on_bump: unlockInfo(sectionKey)   # nol-buff gameplay
states: [active, opened(empty gold, dim)]
```
- **bump dari bawah** → hati emas melompat keluar (tween) → `unlockInfo(key)` → ikon menyala +
  toast + partikel hati + SFX chime. **JANGAN auto-open modal** (§X). Sudah dibuka = kotak redup.

## B.12 Power-ups (Jamur / Bunga / Star / 1-UP)

```yaml
Jamur:  { size: 28x28, speed: 80, behavior: bounce_wall, effect: small->super, spawn: from ?-block }
Bunga:  { size: 30x30, behavior: static (di ?-block), effect: super->fire, only_if: player>=super }
Star:   { size: 28x28, speed: 120, behavior: bounce_hop, effect: invuln 9s + touch-kill, music: fast-sfx }
1UP:    { size: 28x28, speed: 80, behavior: bounce_wall, effect: skor_bonus + toast (NO nyawa) }
```

## B.13 Boss — Bowser "Raja Kesepian" (ringkas; detail APPENDIX D)

```yaml
id: BOSS-BOWSER
size: { w: 96, h: 96 }   # sheet 2x, downscale (APPENDIX P)
hp: 30                    # TTK ~20-40s senjata menengah (hati-api) / 1 hit via kapak jembatan
phases: 3                 # threshold 66% / 33%
states: [idle, telegraph, fire_breath, hammer_toss, jump, enraged, hurt, defeated]
hit_detection: MANUAL per-frame (alpha bukan setActive false) + HP bar kecil di atas boss
attacks_aim_player: true  # fireball aim ke player + spread
```

> **Golden Rule APPENDIX B:** *Tiap entity punya spec yaml lengkap (hp/speed/behavior/states/
> kill_by) yang 1-lawan-1 dengan tekstur & AI di kode; Spiny/Piranha jelas "tak bisa distomp"
> (siluet berbeda); Kotak Cinta nol-buff.*

---

# APPENDIX C — BIOME / WORLD LIBRARY (6 dunia)

> Tiap dunia = tema-visual berbeda: palet, allowed tiles/objek, enemy pool, pattern priority,
> physics modifier, difficulty scaling. **Backdrop WAJIB ber-lapis & PADAT** (density §3.4):
> sky palet per-dunia + ≥3 lapis parallax + kuota prop per layar. Rebuild per dunia, `clear`
> group lama.

**Kuota prop per lebar-layar (semua dunia — anti "dekorasi sepi"):**
- **≥1 far-parallax** (`scrollFactor 0.2`) — gunung/siluet/kanopi.
- **1–2 landmark midground** (`0.45`) — pipa besar/pohon/kastil-jauh.
- **2–4 foreground destructible/dekor** (`0.7`) — semak/bata/pipa dekor/pagar.
- **≥1 ambient motion** — awan bergerak (`0.1`), bendera berkibar, Piranha bob, air.
- Slot tak terisi musuh/kepingan → **isi prop**, jangan kosong.

## C.1 Dunia 1 — Padang Rumput (Grassland) — "AWAL PERJALANAN"

```yaml
world: 1
palette: { sky_top: 0x5c94fc, sky_bot: 0x9ad0ff, ground: 0xc84c0c, ground_top: 0x00a800, brick: 0xe45c10 }
tiles: [ground, brick, qblock, lovebox, pipe, hardblock]
enemy_pool: [E-GOMB, E-KOOP, E-PIRA]      # <=2/wave
pattern_priority: { T: 35%, C: 25%, E: 20%, B: 15%, G/P: 5% }
physics_mod: none
props: [bukit hijau (far), pohon-bulat, semak, awan, pipa hijau, bendera-hati (ambient)]
difficulty: teach — gap kecil, Goomba pelan, 1 Jamur dijamin
sections_kepingan: [hero, schedule(part)]   # section inti awal
```
- Meniru SMB 1-1 (beat-sheet §3.5). Onboarding penuh (T001-T004 di awal). Warp-pipe rahasia (P002)
  opsional berisi kepingan.

## C.2 Dunia 2 — Bawah Tanah (Underground) — "GUA KENANGAN"

```yaml
world: 2
palette: { sky_top: 0x000000, sky_bot: 0x0a1a2a, ground: 0x0084d8, brick: 0x2038ec }
tiles: [ground, brick, qblock, lovebox, pipe, coin_ceiling]
enemy_pool: [E-GOMB, E-BUZZ, E-PIRA]      # Buzzy fireproof (variasi)
pattern_priority: { C: 30%, E: 25%, B: 20%, G: 15%, P: 10% }
physics_mod: none
props: [stalaktit (far), langit-langit bata, koin-di-plafon, tetes air (ambient)]
difficulty: +1 tier; ruang sempit vertikal; Buzzy ajari "tak semua bisa dibakar"
sections_kepingan: [rsvp, couple]
```

## C.3 Dunia 3 — Pantai Cinta (Beach) — "TEPIAN JANJI"

```yaml
world: 3
palette: { sky_top: 0xffb85c, sky_bot: 0xffe0a0, ground: 0xe8c060, water: 0x2a8cff }
tiles: [sand_ground, wood_plat, qblock, lovebox, palm]
enemy_pool: [E-GOMB, E-KOOP, E-PARA]
pattern_priority: { C: 25%, E: 28%, G: 20%, B: 15%, P: 12% }
physics_mod: none (opsi: gap air = jurang aman)
props: [laut+ombak (ambient), palem, matahari senja (far), perahu (mid), buket-bunga dekor]
difficulty: Paratroopa (flyer) diperkenalkan; gap air lebih lebar
sections_kepingan: [story, gallery]
```

## C.4 Dunia 4 — Langit Awan (Sky) — "MELAYANG BERSAMA"

```yaml
world: 4
palette: { sky_top: 0x3cbcfc, sky_bot: 0xbce0ff, cloud_plat: 0xffffff }
tiles: [cloud_ground, moving_plat, qblock, lovebox]
enemy_pool: [E-LAKI, E-SPIN, E-PARA]      # Lakitu+Spiny wave
pattern_priority: { P(platform): 30%, E: 25%, C: 20%, G: 15%, B: 10% }
physics_mod: none (banyak jurang = respawn aman)
props: [awan berlapis (parallax 0.2/0.45/0.7), pelangi (far), burung (ambient), balon-hati]
difficulty: vertical platforming; moving platform (P004); Lakitu ranged
sections_kepingan: [happiness, streaming]   # bila flag ada
```

## C.5 Dunia 5 — Kastil Es (Ice) — "UJIAN KESABARAN"

```yaml
world: 5
palette: { sky_top: 0x8090c8, sky_bot: 0xd0e0ff, ice: 0xa8e0ff, ground: 0x6078a8 }
tiles: [ice_ground(licin), brick, qblock, lovebox, spike]
enemy_pool: [E-KOOP, E-SPIN, E-GOMB]
pattern_priority: { E: 30%, G: 20%, C: 20%, B: 18%, H: 12% }
physics_mod: friction x0.3 (es licin) — gap tak dinaikkan (kompensasi)
props: [salju turun (ambient), stalaktit es, aurora (far), pohon-es]
difficulty: es licin (H001) ujian kontrol; Star disarankan sebelum gauntlet
sections_kepingan: [gift, wishes(part)]
```

## C.6 Dunia 6 — Kastil Terakhir (Castle) — "PENYELAMATAN"

```yaml
world: 6
palette: { sky_top: 0x1a0a1a, sky_bot: 0x3a1020, stone: 0x585858, lava: 0xff5000 }
tiles: [stone_ground, lava_gap, firebar, brick, hardblock, lovebox]
enemy_pool: [E-HAMMER, E-BUZZ, E-PIRA]
pattern_priority: { E: 30%, H(hazard): 25%, G: 20%, B: 15%, P: 10% }
physics_mod: none; lava = jurang aman (respawn)
props: [obor api (ambient), jendela kastil (mid), tengkorak dekor, lava bubbling (ambient)]
difficulty: puncak; Hammer Bro + Firebar (H003) + Lava Gap (H002) → walk-in ke BOSS
sections_kepingan: [closing, wishes(rest)]
climax: Bowser boss (APPENDIX D) → selamatkan Bride → CELEBRATION
```

## C.7 Distribusi kepingan antar-dunia (auto-scale — detail APPENDIX X)

Quota default (N section riil disebar; contoh 11 section penuh):
`[dunia1:2, dunia2:2, dunia3:2, dunia4:2, dunia5:2, dunia6:1]` (sum=11). Section inti (hero/
schedule/rsvp) di dunia 1–2. Saat flag mengurangi section → redistribusi proporsional ke shape
sama (APPENDIX X). **Jangan hardcode 11.**

> **Golden Rule APPENDIX C:** *6 dunia, tiap dunia = palet+tiles+enemy-pool+physics-mod sendiri;
> backdrop ≥3 lapis parallax + kuota prop/layar (≥1 far+1–2 mid+2–4 fore+1 ambient); rebuild &
> clear per dunia; kepingan disebar auto-scale (section inti di dunia awal).*

---

# APPENDIX D — BOSS / CLIMAX SYSTEM (Bowser "Raja Kesepian")

> Klimaks = **selamatkan mempelai (Si-Bride)**. Motif: raja naga yang kesepian menyandera Bride
> di sangkar di atas jembatan lava; dikalahkan oleh cinta (player). Referensi kanonik: Bowser SMB
> World 1-4/8-4 (jembatan + kapak, fireball, hammer, lompat-lewati-bawah). Riset: [Mario Wiki
> Bowser's Castle], [StrategyWiki NSMB Bowser].

## D.1 Arena — WAJIB WALK-IN (bug metalslug dicegah)

**JANGAN** lock kamera + spawn boss seketika (player off-screen). Aturan:
- Kastil dunia-6 punya **koridor walk-in** ≥ BW (mis. `len ≈ 3000px`). Player masuk dari kiri,
  kamera follow normal dulu. 2–3 Hammer Bro/Buzzy penjaga di koridor (approach tak kosong).
- **Arena** = ujung kanan: jembatan di atas lava, di seberang **sangkar Bride** + **tuas kapak**.
- Boss dibuat **INACTIVE** (`setActive... TIDAK` — pakai `setAlpha(0)` + flag `bossActive=false`,
  §16) + simpan `arenaX = len − 0.9·BW`.
- Di `update`, **saat `player.x >= arenaX`** → `activateBoss()`: fade-in boss (`alpha 0→1, 400ms`),
  **baru** kunci kamera `setBounds(len−BW,0,BW,BH)`, pasang dinding kiri arena, `flash` + SFX roar.
- Reset `arenaX=null; bossActive=false` di awal tiap `buildStage` (jangan bocor ke stage biasa).

```js
// build: boss inactive, simpan arenaX (JANGAN lock kamera di sini)
this.arenaX = len - Math.round(BW * 0.9);
this.boss.setAlpha(0); this.bossActive = false;      // alpha, BUKAN setActive(false)
// update(): trigger saat player masuk arena
if (this.boss && !this.bossActive && this.player.x >= this.arenaX) this.activateBoss();
// activateBoss(): fade-in + lock camera SEKARANG
this.bossActive = true;
this.tweens.add({ targets: this.boss, alpha: 1, duration: 400 });
this.cameras.main.setBounds(len - BW, 0, BW, BH);
this.cameras.main.flash(200, 255, 120, 40);
```

## D.2 HP bar + BISA KALAH (bug dibayar 2x)

- **HP bar KECIL di ATAS boss** (world-space, ikut posisi): update tiap `hitBoss`. **+** HP bar
  ringkas di garis-pandang atas arena (`setScrollFactor(0)`) untuk HP tinggi.
- **TTK ~20–40s** dengan hati-api (senjata menengah): `bossHP=30`, hati-api dmg=1, rate cukup →
  ~30s. Jalur cepat: **tuas kapak** (1 hit menang, ala SMB axe). Jangan > 60s.
- **Hit-detection MANUAL tiap frame** (jangan andalkan overlap fisika pada boss bobbing;
  **JANGAN `setActive(false)`** → matikan body → tak kena; pakai alpha):

```js
GameScene.prototype.manualBossHits = function () {
  var b = this.boss; if (!b || !b.active || !this.bossActive) return;
  this.fireballs.getChildren().forEach(function (bl) {
    if (bl.active && Math.abs(bl.x - b.x) < 58 && Math.abs(bl.y - b.y) < 66) {
      this.hitBoss(b); this.killFireball(bl);
    }
  }, this);
};
```
- Tiap hit: flash + freeze 5f + partikel + bar turun (feedback yakin "masuk").

## D.3 Phase system (3 fase, threshold HP, escalation moveset)

| Fase | HP | Moveset | Safe window | Telegraph |
|---|---|---|---|---|
| **1** (100–66%) | idle-bob + **fire_breath** (3 bola aim ke player, spread ±0.12rad) tiap 2.5s | lompat lewati saat jeda (recovery ~1s) | mulut membara 500ms sebelum tembak |
| **2** (66–33%) | + **hammer_toss** (2 palu parabola) + lompat besar (huge leap) → run-under | jeda lebih pendek (~0.8s); safe = lewati saat lompat | pose angkat tangan 400ms |
| **3** (33–0% / enraged) | fire lebih sering + tembok api sisi arena | window sempit; kejar tuas kapak | roar + flash merah saat masuk fase |

- **Escalation = evolusi moveset** (percepat/tambah elemen), bukan menempel mekanik asing (§8
  game-feel). Tandai transisi fase dengan beat (flash transform + SFX).
- **Peluru boss WAJIB aim ke player** + spread (dodgeable), **bukan** flat konstan (§16).

## D.4 Weakness / cara menang (dua jalur)

1. **Kapak jembatan (ala SMB axe):** lompat lewati Bowser → sentuh **tuas kapak** di seberang →
   jembatan runtuh → Bowser jatuh ke lava → menang instan. (Reward eksekusi platforming.)
2. **30 hit hati-api:** bila player Fire, tembak 30× (HP bar habis) → Bowser kalah. (Reward
   agresi.) Jalur ini **wajib ada** untuk player tanpa Fire? → sediakan Bunga di koridor walk-in
   (usage window), atau kapak selalu tersedia sebagai jalur non-Fire.

## D.5 Victory sequence → SELAMATKAN BRIDE → CELEBRATION

- Bowser kalah → **beat meriah ~5s SEBELUM dialog** (§6.6 skill): screen flash + fireworks
  (partikel) + **SFX kemenangan** (audio game, bukan backsound) + toast "💍".
- Sangkar terbuka → **Si-Bride** keluar → berjalan ke Si-Groom → hati melayang + banner
  "JUST MARRIED" → confetti.
- **`setTimeout ~4.5s` → dialog happy-ending**: sebut nama mempelai dinamis
  (`val('groom_nickname')` ♥ `val('bride_nickname')`) + rangkum skor/dunia + **CTA "💌 Buka
  Undangan"**. **Guard `completed=true`** (persist) → tak terulang saat reload/re-inject.
- **Pastikan SEMUA kepingan ter-unlock** saat menang (undangan tak pernah terkunci dari detail asli).

## D.6 Verifikasi di harness (WAJIB tahap 2)

- Taruh hati-api di posisi boss → `manualBossHits` → `hp` turun N× → `defeatBoss` di 0.
- Pastikan `bossActive` true (walk-in trigger) sebelum hit valid.
- Trigger kapak → jembatan runtuh → `defeatBoss` → victory sequence + `completed=true`.

> **Golden Rule APPENDIX D:** *Boss = walk-in (aktif saat `player.x≥arenaX`, alpha bukan
> setActive); HP bar kecil di atas boss + garis-pandang; TTK 20–40s (atau kapak 1-hit); hit
> MANUAL per-frame; peluru aim-ke-player+spread; 3 fase evolusi moveset; menang → selamatkan
> Bride → celebration 5s → dialog nama-dinamis + guard `completed`.*

---

# APPENDIX E — VALIDATOR ENGINE

> Dua gate keras yang di-RUN generator (bukan checklist manual): **(1) Playability** &
> **(2) Density "NO DEAD AIR"**. Segmen/stage yang gagal → **regenerate**, bukan diluluskan.

## E.1 Playability checklist (per stage)

```js
function validatePlayability(stage, D_max) {
  var fails = [];
  if (!goalReachable(stage))            fails.push('goalReachable');       // path spawn->flag
  if (!allPiecesReachable(stage, D_max))fails.push('allPiecesReachable');  // tiap $ terjangkau lompat
  if (hasImpossibleJump(stage, D_max))  fails.push('noImpossibleJump');    // gap <= D_max
  if (hasSoftlock(stage))               fails.push('noSoftlock');          // tak terjebak
  if (hasSpawnKill(stage))              fails.push('noSpawnKill');          // freeze musuh saat respawn
  if (hasBlindJump(stage))              fails.push('noBlindJump');         // landing terlihat saat takeoff
  if (hasMandatoryHidden(stage))        fails.push('noMandatoryHidden');   // $ tak boleh tanpa telegraph
  if (hasInstakillLookalike(stage))     fails.push('noInstakillLookalike');// Spiny != Goomba siluet
  if (!usageWindowOK(stage))            fails.push('powerupUsageWindow');  // Star/Fire ada musuh sesudahnya
  return fails;   // kosong = lolos
}
```
- **allPiecesReachable:** tiap Kotak Cinta punya jalur lompat (BFS pada graph platform, tiap edge
  ≤ D_max, naik ≤ tinggi lompat sesuai power-terendah yang dijamin di titik itu).
- **Section inti** (`hero`/`schedule`/`rsvp`) WAJIB di dunia 1–2 (cek pemetaan).

## E.2 Density "NO DEAD AIR" validator (gate keras)

```js
// SEG = 1 viewport (BW). Iterasi tiap SEG kontigu sepanjang stage.
function validateDensity(stage, BW, opts) {
  var fails = [];
  for (var x = stage.startX; x < stage.endX; x += BW) {
    var seg = stage.window(x, x + BW);
    var enemies    = seg.count('enemy');              // musuh (record triggerX di window)
    var elevated   = seg.count('platform_elevated');  // pijakan NAIK (bukan tanah dasar)
    var interactive= seg.count('coin|qblock|brick|lovebox|powerup|secret');
    var decorFar   = seg.count('parallax_far');
    var decorMid   = seg.count('landmark_mid');
    var decorFore  = seg.count('prop_fore');
    var ambient    = seg.count('ambient_motion');

    var combat = !seg.isSafeZone;
    if (combat && enemies < opts.minEnemiesPerScreen) fails.push([x,'enemies',enemies]);
    if (elevated   < opts.minElevatedPerScreen)       fails.push([x,'elevation',elevated]);
    if (interactive< 1)                               fails.push([x,'interactive']);
    if (decorFar   < 1)                               fails.push([x,'parallax_far']);
    if (decorMid   < 1)                               fails.push([x,'landmark_mid']);
    if (decorFore  < 2)                               fails.push([x,'prop_fore',decorFore]);
    if (ambient    < 1)                               fails.push([x,'ambient']);

    // MAX DEAD AIR: gap terpanjang tanpa interaktif/musuh/event
    var biggestGap = seg.largestEmptyRun('enemy|coin|qblock|brick|lovebox|powerup|pipe|event');
    if (biggestGap > opts.maxDeadPx)                  fails.push([x,'deadair',biggestGap]);
  }
  // REWARD CADENCE: jarak antar reward (koin/?/power/kepingan) <= rewardEveryPx
  if (stage.maxRewardGap() > opts.rewardEveryPx)      fails.push(['*','reward-gap']);
  return fails;   // kosong = lolos; tidak kosong = REGENERATE segmen itu
}

// Knob (platformer; skala per difficulty):
var DENSITY = {
  minEnemiesPerScreen:   1,                      // easy 1 · normal 2 · hard 3
  minElevatedPerScreen:  1,                      // >=1 pijakan naik/layar (tiap 6-10 tile)
  maxDeadPx:             Math.round(BW * 0.75),  // <= 0.75 layar kosong (~<=2s) -> isi coin-trail
  rewardEveryPx:         Math.round(BW * 2.5),   // reward tiap <= ~2.5 layar (~15-20s)
};
```

**Aturan validator (WAJIB):**
- Validator **bagian dari generation loop** (APPENDIX F), bukan manual.
- **Lantai, bukan plafon.** Boleh lebih padat; tak boleh lebih sepi dari knob.
- **Gap kosong → auto-fix isi coin-trail (C003)** dulu; bila masih gagal (musuh/elevasi kurang) →
  regenerate segmen.
- **Start safe zone** (~600px): dikecualikan dari kuota **musuh** saja; dekorasi + ≥1 elevasi +
  ≥1 interaktif (koin/Kotak-Cinta) tetap wajib (zona awal pun tak boleh kosong).
- **Jangan matikan validator demi cepat.** Lolos playability tapi GAGAL density = tetap gagal.

## E.3 Scoring (opsional, target lulus ≥80/100)

| Dimensi | Bobot | Kriteria |
|---|---|---|
| Playable | 25 | goal & semua kepingan reachable, no softlock |
| Fun | 20 | variasi pola (no >2 sama berturut), sawtooth pacing |
| Fair | 20 | no blind-jump/spawn-kill/instakill; telegraph |
| Rewarding | 20 | reward cadence ≤2.5 layar; usage window powerup |
| Discovery | 15 | ≥1 rahasia/kepingan tersembunyi ber-telegraph |

## E.4 Hard-won checklist (dari layout-camera §checklist — masuk validasi tahap 2)

- [ ] Kamera `setFollowOffset(-0.40·BW,-70)` + deadzone kecil.
- [ ] `GROUND_Y = BH−(isTouch?200:150)`.
- [ ] ICON-BUTTON kiri-atas · indikator kanan-atas · joystick kiri-bawah · JUMP/RUN kanan-bawah.
- [ ] Desktop frame kiri 480px + panel kanan pure undangan; 1 breakpoint 980px.
- [ ] Boss walk-in (aktif saat `player.x≥arenaX`; alpha bukan setActive; reset flag/stage).
- [ ] Sprite base+highlight+shadow+outline; siluet unik.
- [ ] Backdrop palet per-dunia + ≥3 parallax + kuota prop.
- [ ] Stage-select + difficulty satu overlay (tombol OK, ada Batal).
- [ ] Panel PC canvas couple (jas/gaun) + akad/resepsi + map; nol tombol game.
- [ ] Toast atas-tengah (~18–35%), 3–8s, warna+ikon.
- [ ] Boss HP bar + TTK 20–40s + feedback tiap hit (verifikasi harness).
- [ ] Animasi per-state player & musuh.
- [ ] Level: elevasi + pijakan tiap 6–10 tile + ≥1 encounter + ≥1 reward/layar.
- [ ] Dialog pilih pending→OK (jangan auto-apply).
- [ ] Boss hit MANUAL + aim-ke-player.
- [ ] Ramah: tanpa nyawa/game-over; kena=knockback+iframe; jatuh=respawn aman.
- [ ] Crouch resize on-state-change (anti-judder).
- [ ] UI game (nol link telanjang).
- [ ] Reset PENUH (wipe storage incl. diff + destroy + cover).
- [ ] Peluru vs musuh di atas balok: overlap-first + processCallback + sweep anti-tunnel.
- [ ] Spawn relatif-kamera (musuh off-screen = data, lahir di tepi; hati-api despawn di tepi).

> **Golden Rule APPENDIX E:** *Dua gate keras (playability + density) di-RUN generator; gap kosong
> auto-fix coin-trail lalu regen; semua kepingan reachable & ber-telegraph; validator tak pernah
> dimatikan demi cepat.*

---

# APPENDIX F — GENERATION ALGORITHM / PROMPT SYSTEM

> Langkah deterministik membangun 1 stage. Density loop = **bagian dari pipeline**, bukan checklist.

## F.1 Pipeline per stage

```
1. build spine        -> tanah dasar + panjang stage (190-260 tile) + start safe zone + goal
2. place elevation     -> >=1 pijakan naik tiap 6-10 tile (density floor elevasi)
3. fill patterns       -> pilih pola APPENDIX A per pattern_priority dunia+difficulty;
                          no >2 sama berturut; gap pertama <=40% D_max; 1 mekanik baru/segmen
4. place entities       -> spawnList musuh (record triggerX terurut); >=minEnemies/segmen;
                          <=2 tipe/wave; usage-window powerup (Star/Fire sebelum gauntlet)
5. validateDensity     -> FIX(coin-trail)/REGEN loop sampai lolos (APPENDIX E.2)
6. place pieces         -> Kotak Cinta via quota per-dunia (APPENDIX X); section inti dunia awal;
                          allPiecesReachable; ber-telegraph (no mandatory-hidden)
7. validatePlayability -> goal/pieces reachable, no softlock/blind/spawnkill; gagal -> fix/regen
8. decorate             -> backdrop palet dunia + >=3 parallax + kuota prop/layar (density)
```

## F.2 Contoh (pseudo)

```js
function generateStage(world, diff) {
  var s = new Stage(worldLen(world, diff));
  s.spine();                               // 1
  placeElevation(s);                       // 2
  fillPatterns(s, PATTERN_PRIORITY[world][diff]);   // 3
  placeEnemies(s, ENEMY_POOL[world], DENSITY[diff]);// 4
  var tries = 0;
  while (true) {                            // 5 density loop
    var d = validateDensity(s, BW, DENSITY[diff]);
    if (!d.length || tries++ > 8) break;
    d.forEach(f => f[1]==='deadair' ? fillCoinTrail(s, f[0]) : regenSegment(s, f[0]));
  }
  placePieces(s, world, PIECE_QUOTA[world]); // 6
  var p = validatePlayability(s, D_MAX);     // 7
  if (p.length) fixOrRegen(s, p);
  decorate(s, BIOME[world]);                 // 8
  return s;
}
```

## F.3 Master instruction (untuk generate stage baru)

> "Bangun stage dunia-N difficulty-D: spine 190–260 tile + start-safe 5 tile + flagpole. Taruh
> ≥1 pijakan naik tiap 6–10 tile. Isi dari pola APPENDIX A sesuai priority dunia-N (no >2 pola
> sama berturut; gap pertama ≤40% D_max; 1 mekanik baru per segmen, kemunculan pertama
> failure-proof). Susun `spawnList` musuh (record `triggerX` terurut) dari ENEMY_POOL dunia-N,
> ≥min musuh/segmen, ≤2 tipe/wave, dari beberapa arah. Jalankan `validateDensity` → isi coin-trail
> / regen sampai lolos. Tempatkan Kotak Cinta via quota dunia-N (section inti di dunia 1–2), semua
> reachable & ber-telegraph. Jalankan `validatePlayability`. Hias: palet dunia-N + ≥3 parallax +
> kuota prop/layar. Verifikasi di harness (loop asli, RAF stub)."

## F.4 Determinisme

- **Pemetaan stage→kepingan DETERMINISTIK dari nomor dunia** (slice kontigu `INFOS`), bukan
  counter berjalan → cheat stage-jump/replay tak menggandakan kepingan (§X).
- Seed opsional untuk reproduksibilitas (tapi `Math.random` di runtime engine boleh; generasi
  level bisa dilakukan sekali saat boot per dunia).

> **Golden Rule APPENDIX F:** *Pipeline: spine → elevation → patterns → entities → validateDensity
> (fix/regen) → pieces (quota, reachable) → validatePlayability → decorate. Density loop di dalam
> pipeline; pemetaan kepingan deterministik dari nomor dunia.*

---

# APPENDIX T — TECHNICAL FOUNDATION (PHASER 3.80.1)

> Fakta API diverifikasi ke docs resmi + tag `v3.80.1`. Landmine terbesar: **Particle API
> ditulis-ulang di 3.60** — `createEmitter()` DIHAPUS (throw di 3.80.1).

## T.1 Game config & boot aman (anti ukuran-0)

```js
function bootGame() {
  var stage = document.getElementById('gw-stage');
  var r = stage.getBoundingClientRect();
  var W = Math.max(320, Math.round(r.width));
  var H = Math.max(480, Math.round(r.height));   // ukuran TETAP dipakai menata world
  var game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'gw-stage',
    width: W, height: H,
    backgroundColor: '#5c94fc',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    physics: { default: 'arcade', arcade: { gravity: { y: 2200 }, debug: false } },
    render: { pixelArt: true, antialias: false, roundPixels: true },
    scene: [BootScene, GameScene],
  });
  disposers.push(function () { game.destroy(true); });   // cleanup
  window.__gwGame = game;
}
```
> **⚠️ Trap ukuran-0:** kalau parent belum ber-dimensi saat `new Phaser.Game()` (display:none /
> flex 0-height) → FIT hitung `0×0` → canvas collapse. **FIX:** ukur `getBoundingClientRect()` &
> pass W/H tetap; **JANGAN** baca `this.scale.width` di `create()` dengan `Scale.RESIZE`.

## T.2 Scene lifecycle

`init(data)` → `preload()` → `create(data)` → `update(time, delta)` (pakai `delta` ms →
frame-rate-independent). Transisi queued: `scene.start/launch/switch/pause/resume`. HUD via
`scene.launch` paralel atau overlay DOM (tema ini pakai DOM overlay untuk cover/dialog).

## T.3 Arcade physics — platformer (variable jump, blocked.down)

```js
update(time, delta) {
  var b = this.player.body, onGround = b.blocked.down;      // == onFloor()
  if (onGround) this.coyote = 90; else this.coyote = Math.max(0, this.coyote - delta);
  if (inp.jump && this.coyote > 0) { b.setVelocityY(JUMP_V); this.coyote = 0; }  // consume->no double
  if (!inp.jumpHeld && b.velocity.y < 0) b.setVelocityY(b.velocity.y * 0.45);     // variable jump
  // momentum horizontal
  var target = inp.right ? SPD : inp.left ? -SPD : 0;
  var a = onGround ? (target ? ACCEL : FRICTION) : AIR_ACCEL;
  b.velocity.x = Phaser.Math.Approach(b.velocity.x, target, a * delta / 1000);
}
```
- **Collider vs overlap:** platform/tanah = `collider` (separasi); koin/musuh = `overlap`.
- **One-way platform:** `collider(player, oneways, null, (p,plat)=> p.body.velocity.y >= 0 && p.body.bottom <= plat.body.top + 8)`.
- **blocked** (world/static/tilemap) vs **touching** (dynamic). `onFloor()`⇔`blocked.down`.
- `JustDown/JustUp` (edge), bukan `isDown`.

## T.4 Object pooling (Group)

```js
this.fireballs = this.add.group({ classType: Fireball, maxSize: 2, runChildUpdate: true });
var f = this.fireballs.get(); if (f) f.fire(x, y, dir);   // SELALU null-check (maxSize penuh -> null)
// killAndHide(child) = setActive(false).setVisible(false)
```
Untuk arcade body: `physics.add.group(...)`, reset `body.enable`/velocity saat reuse. Musuh =
spawn relatif-kamera (§5.3) bukan pre-create semua.

## T.5 Procedural texture + SHADING (jangan flat)

```js
function box(g,x,y,w,h,base,hi,sh){
  g.fillStyle(base,1); g.fillRect(x,y,w,h);
  if(hi!=null){ g.fillStyle(hi,1); g.fillRect(x,y,w,Math.max(1,h*0.22|0)); }
  if(sh!=null){ g.fillStyle(sh,1); g.fillRect(x,y+h-(h*0.22|0),w,Math.max(1,h*0.22|0)); }
}
function outline(g,x,y,w,h){ g.lineStyle(2,0x201808,1); g.strokeRect(x,y,w,h); }
function bake(scene,key,w,h,draw){
  if (scene.textures.exists(key)) return;          // guard re-inject
  var g = scene.make.graphics({x:0,y:0}, false);
  draw(g); g.generateTexture(key,w,h); g.destroy();
}
```
- Contoh Goomba: base coklat `0x8b4513` + hi `0xa0602a` + sh `0x5a2e0d` + outline + 2 mata marah
  + kaki. Kotak Cinta: base emas `0xf0c000` + hi + `?`/hati putih berdenyut.
- Siluet unik per entity (§1.4). Detail props scenery (bukit/awan/pipa/palem) → APPENDIX C.

## T.6 Input (keyboard + virtual joystick)

```js
var cursors = this.input.keyboard.createCursorKeys();  // {up,down,left,right,space,shift}
var keyJump = this.input.keyboard.addKey('Z');         // atau space
var keyFire = this.input.keyboard.addKey('X');
// touch: DOM buttons -> flags (joyLeft/joyRight/btnJumpEdge). OR dengan keyboard -> model {left..fire}.
```
Virtual joystick: DOM sendiri (kiri-bawah) → flags; atau rexVirtualJoystick (pin CDN). Abstraksi
`{left,right,down,run,jump,fire}` (§4.4).

## T.7 Animation, tween, camera juice, PARTICLES (API baru)

```js
this.anims.create({ key:'p_run', frames:['t_groom_run0','t_groom_run1','t_groom_run2','t_groom_run3'].map(k=>({key:k})), frameRate:12, repeat:-1 });
if (!this.anims.exists('p_run')) {/* guard re-create warn */}
sprite.play('p_run', true);
this.tweens.add({ targets: sprite, scaleX:1.2, scaleY:0.8, duration:120, yoyo:true, ease:'Quad' }); // squash-land
this.cameras.main.shake(120, 0.02);    // intensity float kecil, BUKAN piksel
this.cameras.main.flash(80, 255,240,180);
// ✅ Particles 3.80.1:
var em = this.add.particles(0,0,'t_spark',{ speed:{min:-160,max:160}, scale:{start:0.7,end:0}, lifespan:500, blendMode:'ADD', emitting:false });
em.explode(10, x, y);
// ❌ this.add.particles('spark').createEmitter({...}) -> THROW
```

## T.8 Tilemap (opsi untuk tanah/blok masif)

```js
var map = this.make.tilemap({ data: levelArray, tileWidth:32, tileHeight:32 });
var ts  = map.addTilesetImage('t_tiles');
var layer = map.createLayer(0, ts, 0, 0);
layer.setCollisionBetween(1, 3);          // solid tiles
this.physics.add.collider(this.player, layer);
```
Tilemap auto-cull; static-group berat di skala besar. Banyak tile → tilemap; sedikit solid kaya-
logika (Kotak Cinta/`?`) → sprite/static group terpisah.

## T.9 Performance (60fps mobile)

- Culling: tilemap auto; **sprite biasa TIDAK** → `setActive/Visible(false)` off-screen (spawn
  relatif-kamera §5.3 sudah menangani musuh).
- Partikel cap `maxAliveParticles`, prefer `explode()`, reuse 1 emitter. <~100 live.
- `render:{pixelArt:true, antialias:false, roundPixels:true}`. Target <150MB.

## T.10 Cleanup & destroy (KRITIKAL — re-inject host)

```js
(function () {
  if (typeof window.__gwCleanup === 'function') { try { window.__gwCleanup(); } catch(e){} }
  var disposers = [];
  function addGlobal(t,type,fn,opt){ t.addEventListener(type,fn,opt); disposers.push(()=>t.removeEventListener(type,fn,opt)); }
  // ... bootGame() push game.destroy(true); RAF/interval/listener push disposer-nya ...
  window.__gwCleanup = function () {
    disposers.forEach(function(d){ try{d();}catch(e){} }); disposers.length = 0;
    if (window.__gwGame) { window.__gwGame.destroy(true); window.__gwGame = null; }  // async next frame
    window.__gwCleanup = null;
  };
})();
```
- `game.destroy(true)` (removeCanvas) WAJIB → cegah canvas/WebGL numpuk (cap ~16 context).
  `destroy()` **async** (pendingDestroy next frame) → jangan `destroy()`+`new Game` di tick sama.
- Scene `SHUTDOWN`: `this.time.removeAllEvents(); this.tweens.killAll(); em.destroy()`.
- **Auto-resume cek cover** (§Z / host-contract): resume HANYA bila cover/reveal TIDAK tampil.

## T.11 Gotchas (kotak peringatan)

1. Particle = `add.particles(x,y,key,cfg)`; `createEmitter()` **throw**.
2. `camera.shake` intensity = float kecil (~0.02), bukan piksel.
3. Tilemap auto-cull; sprite biasa tidak.
4. `game.destroy(true)` wajib re-inject; `destroy()` async.
5. `onFloor()`⇔`blocked.down`; lompat pakai `JustDown/JustUp`.
6. Procedural texture bentrok saat restart → guard `textures.exists`.
7. Ukuran-0 saat container host belum ter-size.

> **Golden Rule APPENDIX T:** *Boot ukur parent (W/H tetap, anti ukuran-0); variable jump via
> JUMP_CUT + blocked.down; pooling + spawn relatif-kamera; texture di-shade + guard exists;
> partikel API 3.60+; `game.destroy(true)` + cleanup hook idempotent.*

---

# APPENDIX S — PROJECT / SINGLE-FILE ARCHITECTURE

## S.1 3 file, IIFE, lapisan logis

- `index.html` — shell 2-kolom (§Z), `#gw-stage`, HUD, ICON-BUTTON, indikator, kontrol sentuh,
  overlay (cover/briefing/clear/rescue/win/reset/stage-select), `#inv-source` (binding),
  `#gw-couple-canvas`, `<audio id="bg-music">`, `<img data-asset>` (APPENDIX P).
- `index.css` — layout, breakpoint 980px, arcade UI (§20 no link telanjang), toast (§10).
- `index.js` — IIFE: cleanup hook → `ensurePhaser` → boot → scenes. Lapisan (walau monolitik):
  `Player`, `StateMachine`, `EnemyManager`(spawn/pool/AI), `object pools`(fireball/particle/shell),
  `Boss`, `LevelGen`(APPENDIX F), `Pieces`(APPENDIX X), `Cheat`, `HostWiring`(APPENDIX Z), `CONFIG`
  terpusat (jangan hardcode tersebar).

## S.2 ensurePhaser fallback

```js
function ensurePhaser(cb){
  if (window.Phaser) return cb();
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
  s.onload = cb; s.onerror = function(){ showError('Gagal memuat Phaser'); };
  document.body.appendChild(s);
}
function showError(msg){
  var el = document.getElementById('gw-stage');
  if (el) el.insertAdjacentHTML('beforeend',
    '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#f66;font:14px monospace;background:#111">'+msg+'</div>');
}
```

## S.3 Ground vs controller (ber-angka)

```js
var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
CONFIG.GROUND_Y = BH - (isTouch ? 200 : 150);   // tanah >=180px dari bawah di touch
```
Karakter ~30px → clearance ke atas zona kontrol ≥80px. Hitung saat boot, **sebelum** menata world.

## S.4 Update order (stabil 60fps)

`Input → State → Movement → Aksi(fire/stomp) → Animation → Collision(+manualEnemyHits/manualBossHits) → Camera → UI/HUD`.

## S.5 Persistensi (localStorage, versioned, try/catch)

- Persist: `unlocked[]` (kepingan), `maxWorld`, `best` (skor), `diff`, guard `announcedAll`/`completed`.
- **Cheat: default JANGAN persist** (reload → mode jujur; kepingan tetap kebuka). Reset = tombol +
  overlay konfirmasi (bukan `confirm()` native).

> **Golden Rule APPENDIX S:** *3 file IIFE, cleanup-first, `ensurePhaser`+`showError`, ukur parent,
> `GROUND_Y=BH−(isTouch?200:150)`, update-order tetap, persist kepingan (bukan cheat).*

---

# APPENDIX P — ASET PNG (SPRITE SHEET) — grafis "game sungguhan"

> Opsi grafis "game sungguhan" via PNG sprite sheet menggantikan procedural, dengan **fallback
> procedural WAJIB** (jangan blank). Pola terbukti di `metalslug-wedding`. Mekanisme upload host
> **sudah ada** (sesuaikan). **GOLDEN RULE:** satu kelompok = satu sheet = satu slot upload;
> engine men-slice 1 gambar utuh via frame-map + downscale → key engine lama tetap jalan.

## P.0 Mekanisme host (fakta)

Upload per gambar di Theme Editor → `media_code` berurutan → `{{asset_image_N}}` (URL/base64).
**Urutan upload = sumber kebenaran slot.** Tema baca via `data-asset` di HTML → load → slice.
Kosong / masih `{{…}}` → fallback procedural.

## P.1 Kebutuhan sprite (diturunkan dari gameplay §4/§5/APPENDIX B)

- **Player:** idle×2, run×4, dash×2, jump_up, fall, prone, fire_cast×2, hurt — untuk small & super
  (bisa scale super dari small + varian). Fire = tint/aksesori.
- **Musuh:** Goomba(walk×2,squash), Koopa(walk×2,shell,slide), Paratroopa(fly×2), Piranha(bob×2),
  Spiny(walk×2), Lakitu(hover,throw), Buzzy(walk×2,shell), Hammer Bro(idle,throw,hurt,die), **Bowser**
  (idle×2,telegraph,fire,jump,enraged,hurt,defeated).
- **Environment:** ground (seamless), one-way platform, brick, hardblock, pipe, cloud-plat,
  ice-ground, stone, lava, spike, firebar; dekor: bukit, pohon, palem, semak, awan, gunung, obor.
- **Game-object:** koin×4(spin), fireball×2, hammer, spark, heart, ledakan-bata×4, banner.
- **Box-kepingan:** Kotak Cinta (active×2 pulse, opened), hati emas kepingan, sangkar Bride,
  Si-Bride (idle×2), flagpole.

## P.2 Kelompokkan jadi TEPAT 5 sheet

| # | Kelompok | Isi | Tekstur engine |
|---|----------|-----|----------------|
| 1 | **player** | semua frame Si-Groom (small+super, semua state) | `t_groom_*` |
| 2 | **enemy** | Goomba/Koopa/Paratroopa/Piranha/Spiny/Lakitu/Buzzy/HammerBro + **Bowser** | `t_e_*`, `t_boss` |
| 3 | **environment** | ground/platform/brick/pipe/ice/stone/lava/spike/firebar + dekor (bukit/pohon/palem/awan/gunung/obor) | `t_ground`, `t_plat`, `t_pipe`, … |
| 4 | **game-object** | koin/fireball/hammer/spark/heart/ledakan/banner | `t_coin`, `t_fire`, `t_spark`, `t_heart`, … |
| 5 | **box-kepingan** | Kotak Cinta/hati-kepingan/sangkar/Si-Bride/flagpole | `t_lovebox`, `t_bride`, `t_cage`, `t_flag` |

Tata-letak: 1 entity = 1 baris (frame horizontal kiri→kanan, frame 0 paling kiri); entity beda =
baris beda. Frame **boleh beda lebar** (fire_cast/defeated lebih lebar) → frame-map rect eksplisit.

## P.3 JSON generate per-kelompok (contoh entri)

```json
[
  {
    "kelompok": "player",
    "name": "groom_run.png",
    "deskripsi": "Pengantin pria mungil berjas hitam + topi, dasi merah, kulit sawo. 4 frame run: kaki bergantian (0 kaki kiri depan, 1 netral, 2 kaki kanan depan, 3 netral), badan condong ke kanan ~5deg, tangan mengayun. Hadap KANAN, kaki di baris bawah sel.",
    "orderNumber": 1,
    "frameWidth": 80,
    "frameHeight": 96
  },
  {
    "kelompok": "enemy",
    "name": "bowser.png",
    "deskripsi": "Naga besar hijau bertanduk, cangkang berduri, motif 'raja kesepian' (mahkota kecil retak). 7 frame: idle0/idle1 (napas), telegraph (mulut membara), fire (semburan api), jump (melompat), enraged (merah, uap), hurt (tersentak), defeated (jatuh terlentang). Hadap KANAN.",
    "orderNumber": 9,
    "frameWidth": 192,
    "frameHeight": 192
  }
]
```
Field wajib: `kelompok`, `name`, `deskripsi`(+rincian tiap frame+arah+pivot), `orderNumber`,
`frameWidth`(≥80), `frameHeight`(≥80). Susun terurut `orderNumber`.

## P.3.1 Spec file `ASSET.md` (WAJIB, tahap 2)

`src/sample-theme/retromario-wedding/ASSET.md` — brief manusiawi membungkus 5 JSON + aturan:
1. **Aturan umum:** PNG transparan, pixel-art tanpa anti-alias, hadap KANAN, pivot kaki baris
   bawah, sel ≥80×80 (~2× tekstur engine), semua frame satu entity ukuran sel sama, nama file persis.
2. **5 tabel kebutuhan** (per kelompok): `No | Nama file | frameW | frameH | Tekstur engine | Jumlah frame | Deskripsi tiap frame`.
3. **5 blok JSON** (P.3) inline + mirror sebagai `player-assets.json`, `enemy-assets.json`,
   `environment-assets.json`, `object-assets.json`, `piece-assets.json`.
4. **Tata-letak sheet** (urutan baris, mulai-x/y) + catatan frame boleh beda lebar → rect eksplisit.
5. **Cara pasang:** slot `{{asset_image_N}}` (P.5) + fallback procedural.

## P.4 Engine men-slice (frame-map eksplisit + downscale + anim + fallback)

```js
// per-ROW (entity multi-frame): rect tiap frame EKSPLISIT (frame boleh beda lebar)
{ key:'t_e_goomba', top:0, ch:96, dh:24, hb:{w:26,h:22}, anim:'e_goomba_walk', rate:6,
  frames:['walk0','walk1','squash'], rects:[[6,80],[92,80],[178,80]] }   // [x,w] pada baris ini
// per-FRAME [x,y,w,h] untuk object sheet campur:
{ key:'t_coin', ew:20, eh:28, anim:'o_coin', rate:8,
  frames:[[8,4,60,84],[74,4,60,84],[140,4,60,84],[206,4,60,84]] }
```
- `key` = tekstur engine yang digantikan (create/tile/scale lama tetap jalan).
- `dh`/`ew,eh` = ukuran tampil (= tekstur procedural lama) → **downscale** → angka dunia tak berubah.
- `hb` = hitbox dunia (samakan feel procedural). `anim`+`rate` → `anims.create` (guard `anims.exists`).
- **Key-out bg** bila PNG tak transparan (flood-fill dari tepi). PNG transparan asli lebih disukai.
- **Fallback WAJIB:** slot kosong/gagal → `buildTextures` procedural; flag `usingPlayerAssets` dst.
- **Anti-pattern:** ❌ grid seragam saat frame beda lebar (rect overrun "boss dobel") → rect
  eksplisit; ❌ lupa downscale (sprite raksasa); ❌ tanpa fallback (blank); ❌ tile tak seamless.

## P.5 Urutan upload baku (kritikal)

| Urutan | Kelompok | Variabel | `data-asset` |
|---|---|---|---|
| 1 | player | `{{asset_image_1}}` | `player_sheet` |
| 2 | enemy | `{{asset_image_2}}` | `enemy_sheet` |
| 3 | environment | `{{asset_image_3}}` | `environment_sheet` |
| 4 | game-object | `{{asset_image_4}}` | `object_sheet` |
| 5 | box-kepingan | `{{asset_image_5}}` | `piece_sheet` |

> Nomor 1–5 = default bila tema belum pakai `asset_image` lain. Bila sudah dipakai (mis. background)
> → geser nomor & **dokumentasikan offset** (metalslug pakai 15/16). Yang mutlak: nomor `image_N`
> di HTML = posisi sheet dalam urutan upload.

```html
<img id="aset-player" data-asset="player_sheet"      src="{{asset_image_1}}" hidden>
<img id="aset-enemy"  data-asset="enemy_sheet"       src="{{asset_image_2}}" hidden>
<img id="aset-env"    data-asset="environment_sheet" src="{{asset_image_3}}" hidden>
<img id="aset-obj"    data-asset="object_sheet"      src="{{asset_image_4}}" hidden>
<img id="aset-piece"  data-asset="piece_sheet"       src="{{asset_image_5}}" hidden>
```

**Petunjuk Upload (untuk user, WAJIB dicantumkan):** *"Upload sheet sesuai urutan: 1) player,
2) enemy, 3) environment, 4) game-object, 5) box-kepingan — agar `asset_image_N` cocok."*

## P.6 Panduan prompt image-gen

Wajib di prompt: *pixel-art sprite sheet, latar transparan, frame horizontal kiri→kanan, sel
`W×H` seragam, hadap kanan, tanpa anti-alias/blur, kaki di baris bawah, no text/watermark/UI.*
Sebut jumlah+makna tiap frame + hex palet dari APPENDIX C. Verifikasi ukuran sel; meleset →
update frame-map rect. Jelek → `usingXAssets=false` → procedural.

> **Golden Rule APPENDIX P:** *5 sheet (player/enemy/environment/game-object/box-kepingan) + 5 JSON
> + `ASSET.md` + frame-map rect eksplisit + downscale + urutan upload baku + fallback procedural.
> Satu gambar utuh di-slice engine ke key lama → kode tak berubah.*

---

# APPENDIX W — WEDDING INTEGRATION (pemetaan section → kepingan)

> Variabel **terverifikasi** ke `dynamic-variables.md` (tab "Variabel Tema"). **JANGAN mengarang
> nama variabel** — tak dikenal → string kosong (data hilang diam-diam).

## W.1 11 section + flag + variabel utama

| # | `data-info` | Isi & variabel utama | Flag pembungkus | Dunia (default) |
|---|---|---|---|---|
| 1 | `hero` | `{{groom_nickname}}`/`{{bride_nickname}}`, `{{wedding_date}}`, `{{quote}}`/`{{quote_by}}`, bg `{{photo_hero_cover}}` | selalu | 1 |
| 2 | `couple` | `{{groom_name}}`/`{{bride_name}}`, `{{photo_groom_photo}}`/`{{photo_bride_photo}}`, ortu `{{nama_bapak_laki_laki}}`… , sosmed `{{ig_laki_laki}}`/`{{ig_perempuan}}` | ortu: `flag_tampilkan_nama_orang_tua` · sosmed: `flag_tampilkan_sosial_media_mempelai` | 2 |
| 3 | `rsvp` | countdown `{{countdown_hari/jam/menit/detik}}`, form RSVP (ID host) | selalu | 2 |
| 4 | `schedule` | Akad `{{tanggal_akad}}`,`{{jam_akad}}`,`{{nama_lokasi_akad}}`,`{{keterangan_lokasi_akad}}`,`{{akad_map}}` + Resepsi `{{*_resepsi}}` | resepsi: `flag_lokasi_akad_dan_resepsi_berbeda` | 1 |
| 5 | `streaming` | `{{link_live_streaming}}` | `is_fitur_live_streaming` | 4 |
| 6 | `story` | `{{#each timeline_kisah}}`→`{{this.tanggal/judul/deskripsi}}` | `flag_pakai_timeline_kisah` | 3 |
| 7 | `gallery` | `{{#each galleries}}`→`{{this.url}}` | `has_gallery` | 3 |
| 8 | `happiness` | `{{sample_story_1..3}}` + `{{frame_balasan_instagram}}` + `{{link_balasan_instagram}}` | `flag_pakai_additional_feature_story_balasan_instagram` | 4 |
| 9 | `wishes` | form ucapan (ID host) + `{{#each wishes}}`→`{{this.guest_name/guest_message/guest_comment_time}}` | selalu | 5/6 |
| 10 | `gift` | `{{bank_1}}`/`{{rek_1}}`/`{{nama_rek_1}}` (+`_2`), QRIS `{{gambar_qris_rekening_1/2}}`, `{{alamat_lokasi_kirim_hadiah_offline}}` | `tampilkan_amplop_online`, `flag_pakai_2_rekening`, `flag_pakai_qris_rekening_1/2`, `flag_kirim_hadiah_offline` | 5 |
| 11 | `closing` | `{{kalimat_penutup}}`, branding `{{site_name}}`/`{{site_url}}` | selalu | 6 |

## W.2 Satu sumber binding (`#inv-source`)

- SEMUA section ditulis **sekali** di `#inv-source` (hidden), tiap `<section data-info="key">` +
  `{{vars}}`. **Satu-satunya** tempat binding hidup. Modal kepingan & reveal penuh **meng-clone**
  dari sini (jangan duplikasi `{{vars}}`).
- **`{{#if flag}}` WAJIB MEMBUNGKUS `<section>`, bukan isinya** (kalau di dalam → section kosong
  tetap ada → kepingan hantu → `allInfoUnlocked()` tak pernah true):
```html
{{#if has_gallery}}<section data-info="gallery"> … </section>{{/if}}   <!-- BENAR -->
<section data-info="gallery">{{#if has_gallery}} … {{/if}}</section>  <!-- SALAH -->
```

## W.3 Aturan penempatan kepingan

- **Section inti di dunia awal:** `hero`(D1), `schedule`(D1), `rsvp`(D2) — tamu berhenti di tengah
  tetap dapat info pokok (§6.5 skill).
- **Reachable & telegraph:** tiap Kotak Cinta terjangkau lompat (validator `allPiecesReachable`);
  no mandatory-hidden (koin/retak mengarah).
- **Kepingan ≠ powerup ofensif:** murni koleksi, nol buff (loop koleksi terpisah dari balancing).

## W.4 Baca variabel (helper `val()` — pola golden retromario)

```js
function val(k, fb){
  var el = document.querySelector('[data-var="'+k+'"]');
  var v = el ? (el.textContent||'').trim() : '';
  if (!v || v.indexOf('{{')===0) return fb||'';   // var tak ter-resolve -> fallback
  return v;
}
```
Tiap elemen yang dibaca JS diberi `data-var="key"` + teks `{{key}}` (parser isi). Contoh:
`<span data-var="groom_nickname">{{groom_nickname}}</span>` → `val('groom_nickname','Mempelai')`.

> **Golden Rule APPENDIX W:** *11 section (variabel terverifikasi, tak dikarang); satu sumber
> binding `#inv-source`; `{{#if}}` membungkus `<section>`; section inti di dunia awal; kepingan
> reachable+telegraph & nol-buff.*

---

# APPENDIX X — COLLECTION MECHANIC

## X.1 Scan section riil (dinamis, jangan hardcode 11)

```js
function scanInfos(){
  return Array.prototype.map.call(
    document.querySelectorAll('#inv-source > section[data-info]'),
    function(s){ return { key:s.getAttribute('data-info'), title: sectionTitle(s) }; });
}
var INFOS = scanInfos();     // section yang flag-nya false SUDAH absen (parser hapus)
var N = INFOS.length;         // jumlah kepingan & ikon indikator = N (dinamis)
```

## X.2 Quota per-dunia + auto-scale

- Quota default (contoh 11 section): `[2,2,2,2,2,1]` (dunia 1–6, sum=11). Section inti (hero/
  schedule/rsvp) di slot dunia 1–2.
- **Saat section dikurangi flag (N<11): redistribusi PROPORSIONAL ke shape yang sama** — jangan
  hardcode 11. Contoh N=7 → `[2,1,1,1,1,1]` (front-loaded, section inti tetap dunia awal).

```js
function pieceQuota(N){
  var shape = [2,2,2,2,2,1];                 // 6 dunia
  var base = shape.map(()=>0), i=0;
  while (i < N){ base[i % 6]++; i++; }         // sebar rata ke shape 6-dunia, front-load
  // pastikan section inti (hero/schedule di depan) — urutkan INFOS: inti dulu (W.3)
  return base;
}
```

## X.3 Pemetaan stage→kepingan DETERMINISTIK (bukan counter)

```js
// slice kontigu INFOS per dunia (deterministik dari nomor dunia) -> cheat stage-jump/replay aman
function infosForWorld(w){
  var q = pieceQuota(N), start = q.slice(0, w).reduce((a,b)=>a+b, 0);
  return INFOS.slice(start, start + q[w]);   // kepingan dunia-w
}
```
- **JANGAN** pakai counter global (`nextPiece++`) → stage-jump/replay menggandakan/desync.

## X.4 Bentuk kepingan & respons-ambil

- Bentuk = **Kotak Cinta** (`?`-block emas berhati, B.11). Bump dari bawah → `unlockInfo(key)`.
- `unlockInfo(key)`:
  1. `if (unlocked.has(key)) return;` (idempotent)
  2. `unlocked.add(key)`; persist `localStorage`.
  3. **Ikon indikator section-key MENYALA** + jadi clickable (§Z HUD).
  4. **Toast** atas-tengah "📅 {judul} ditemukan!" (3–8s, warna cyan + ikon — §Z).
  5. **SFX** chime hati + **partikel** hati emas (`em.explode`) + freeze 5f + hati terbang ke
     indikator (tween).
  6. **JANGAN auto-open modal** (§skill 4) — tamu klik ikon sendiri saat mau baca.
  7. Cek `allInfoUnlocked()` → bila lengkap → celebration "kepingan terakhir" (§Z.6 pemicu 1).

## X.5 Filler skor sisa quota

- Slot pola sisa (setelah Kotak Cinta ditempatkan) → **coin-trail / `?`-koin** (footprint sama),
  jangan kosong → level tetap padat walau kepingan sedikit (density §3.4).

> **Golden Rule APPENDIX X:** *N dinamis dari scan `#inv-source`; quota per-dunia auto-scale
> (redistribusi proporsional); pemetaan dunia→kepingan DETERMINISTIK (slice kontigu, bukan
> counter); ambil = nyala+toast+SFX+partikel (NO auto-open); sisa quota → filler skor.*

---

# APPENDIX Y — CHEAT SYSTEM

## Y.1 Satu flag, dua ranah

Tombol `★` (ICON-BUTTON kiri-atas). Toggle `cheat.on`:

**Ranah undangan (saat ON):**
- Semua kepingan **langsung ter-koleksi** (`INFOS.forEach(i=>unlockInfo(i.key))`) → semua ikon nyala.
- Tombol **Buka Undangan langsung aktif**.

**Ranah gameplay (saat ON):**
- Player **kebal** (invincible; overlap musuh/hazard diabaikan, jatuh jurang tetap respawn aman).
- **Stage-select terbuka** (akses semua dunia tanpa selesai sebelumnya).
- **Bebas pilih kesulitan** (via stage-select overlay).

## Y.2 Skor beku saat cheat

- Saat `cheat.on`, skor **dibekukan** (tak bertambah) — cheat ≠ high-score sah (pola retromario).

## Y.3 Persist = keputusan sadar (default JANGAN)

- **`cheat.on` default TIDAK di-persist** → reload = mode jujur; **`unlocked` tetap di-persist**
  (tamu yang buka via cheat tetap bisa lihat). Alasan: satu HP dipakai banyak tamu → jangan
  "selamanya mode mudah". (Kalau device pribadi & user minta → boleh persist, dokumentasikan.)

## Y.4 Audit cheat-bypass blind spot

- Satu flag `cheat.on` (jangan tersebar). Cek di: damage player, jatuh, HP boss (cheat = boss
  cepat? tidak — cheat kebal tapi boss tetap butuh hit/kapak, atau sediakan skip via cheat).
- **Waspada bocor ke mode normal** (kepingan/kebal bertahan setelah cheat off) — memory
  `retromario-debugging`. Verifikasi harness: toggle off → damage kembali aktif.

## Y.5 RESET = PENUH (bukan sebagian) + verifikasi harness

Tombol `⟲` (reset) → **overlay konfirmasi** (bukan `confirm()` native) → bila ya:
```js
function resetGame(){
  localStorage.removeItem(STORE_KEY);              // 1: wipe storage
  STORE = defaults();                               // diff->default, unlocked=[], maxWorld=0, best=0,
                                                    //   announcedAll=false, completed=false
  if (window.__gwGame){ window.__gwGame.destroy(true); window.__gwGame=null; }  // 2: tear down stage
  runState = freshRun(); cheat.on = false;          // reset run + cheat (matikan badge ★, sembunyikan stage-select)
  rebuildIndicators();                              // 3: semua kepingan terkunci lagi
  resetDiffPickerUI();
  showOverlay('cover');                             // 4: kembali COVER -> pilih kesulitan lagi -> PRESS START
}
```
- **WAJIB:** wipe storage **incl. diff→default**; `destroy(true)` (**stage reset**, bukan lanjut);
  kembali ke **cover** (pilih kesulitan lagi). Verifikasi harness: storage palsu → reset → assert
  wipe (diff→default, world→0) & cover tampil.

> **Golden Rule APPENDIX Y:** *Satu flag cheat (invincible + auto-unlock + stage-select + pilih
> kesulitan); skor beku saat cheat; persist `unlocked` (bukan cheat); RESET PENUH (wipe storage
> incl. diff + `destroy(true)` + kembali cover).*

---

# APPENDIX Z — HOST CONTRACT & WIRING

## Z.1 Cleanup hook (idempotent) + auto-resume cek cover

- JS di-inject ulang tiap `jsBase`/`isOpened`/`htmlBase` berubah (**termasuk tiap submit
  RSVP/ucapan/hadiah**). Baris pertama IIFE: panggil `window.__gwCleanup` lama, daftarkan baru
  (APPENDIX T.10). Tanpa ini → RAF/listener/Phaser numpuk.
- **Auto-resume HANYA bila cover/reveal TIDAK tampil** (bug "START gabisa dibuka"):
```js
function init(){
  wireUI(); INFOS = scanInfos(); rebuildIndicators();
  try {
    var coverUp  = hasShow('gw-cover'), revealUp = hasShow('gw-reveal');
    if (window.__gwStarted && !coverUp && !revealUp) {
      var rs = window.__gwStarted;
      setTimeout(function(){ try { startRun((rs&&rs.world)||0); } catch(e){} }, 60);
    }
  } catch(e){}
}
```
- `startRun()` saat game **sudah live** = HOT-LOAD dunia ke scene ada (bukan `destroy(true)` +
  `new Game` sinkron di `#gw-stage` sama — destroy DEFERRED → blank).

## Z.2 ID hardcoded host (verbatim, tanpa prefix)

| ID | Fungsi |
|---|---|
| `btn-show-qr` | popup QR (host intercept capture-phase) |
| `btn-show-menu` | menu navigasi |
| `btn-toggle-music` / `btn-music` | toggle musik (host swap ikon + dispatch) |
| `bg-music` | target mirror event play/pause (BUKAN player asli) |
| `play-icon` / `pause-icon` | host set display sesuai state |
| `btn-submit-ucapan` + `wish-name` + `wish-message` | submit ucapan |
| `btn-submit-kehadiran` + `rsvp-status` + `rsvp-guests` + `rsvp-code` | submit RSVP |
| `btn-submit-hadiah` + `gift-name` + `gift-amount` + `gift-bank` | konfirmasi hadiah (opsional) |
| `alert-submit-*` | container pesan hasil |

## Z.3 Musik — mirror idempotent (JANGAN putar backsound)

- Host memegang `Audio`/YouTube; play hanya `isPlaying && isOpened`. Tema **DILARANG**
  `audio.play()` backsound tenant.
- Toggle: klik `#btn-toggle-music` + **mirror** ikon `#play-icon`/`#pause-icon`. **Idempotent**
  (bug mahal): simpan **intent** `musicWanted` + generation guard; klik **hanya bila state host
  masih salah** + retry terjadwal (jangan klik 2× karena baca class lama → musik mati lagi). Lihat
  memory `retromario-host-music`.

## Z.4 RSVP / ucapan / hadiah — panggil global host + fallback

```js
// Ucapan (input ID host verbatim: wish-name, wish-message, btn-submit-ucapan)
if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
// else: render thank-you + sisip ke list lokal (optimistic)
// RSVP (btn-submit-kehadiran + rsvp-status/rsvp-guests/rsvp-code)
if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
```
- Ubah/prefix ID host = fitur backend mati diam-diam. Berlaku juga saat form di dalam modal
  kepingan/reveal.
- **Countdown** `{{countdown_hari/jam/menit/detik}}` di-render host (`#tm-countdown-*`), di-update
  host tiap detik → **jangan** timpa innerHTML container itu lewat RAF game.

## Z.5 Layout 2-kolom desktop + HUD map + toast + dialog OK

### Z.5.1 Desktop 2-kolom (frame KIRI 480px + panel kanan PURE undangan)
```css
.gw-shell { display:flex; justify-content:center; align-items:stretch; }
.gw-cover-side { display:none; }
@media (min-width:980px){
  .gw-shell { justify-content:flex-start; }               /* mentok kiri, JANGAN center */
  .gw-frame { order:1; flex:0 0 auto; width:480px; max-width:480px; height:100vh; }
  .gw-cover-side { display:block; order:2; flex:1; min-width:320px; overflow-y:auto; padding:40px 48px; }
  .gw-cover-side .inner { max-width:440px; margin:0 auto; }
}
@media (hover:hover) and (pointer:fine) and (min-width:980px){ .gw-touch { opacity:0; pointer-events:none; } }
```
- Panel kanan = **PURE undangan, NOL tombol game** (PRESS START/level/kontrol ada di cover overlay
  DALAM frame). Isi: `<canvas id="gw-couple-canvas">` (Canvas **2D**, bukan Phaser) — Si-Groom
  berjas+dasi & Si-Bride bergaun+buket di scene bertema Mario (langit biru, bukit, pipa, awan,
  hati, banner "JUST MARRIED") + nama mempelai + Akad/Resepsi (`{{#if}}`) + link MAP + **satu**
  `💌 BUKA UNDANGAN LENGKAP`.
```html
<aside class="gw-cover-side"><div class="inner">
  <canvas id="gw-couple-canvas" width="760" height="380"></canvas>
  <div class="names">{{groom_nickname}} ♥ {{bride_nickname}}</div>
  <div class="event">AKAD: {{tanggal_akad}} · {{jam_akad}} · {{nama_lokasi_akad}}
    {{#if akad_map}}<a href="{{akad_map}}" class="gw-btn">▶ MAP</a>{{/if}}</div>
  {{#if flag_lokasi_akad_dan_resepsi_berbeda}}<div class="event">RESEPSI: {{tanggal_resepsi}} · {{jam_resepsi}} · {{nama_lokasi_resepsi}}
    {{#if resepsi_map}}<a href="{{resepsi_map}}" class="gw-btn">▶ MAP</a>{{/if}}</div>{{/if}}
  <button id="gw-side-open" class="gw-btn primary">💌 BUKA UNDANGAN LENGKAP</button>
</div></aside>
```
- Canvas couple pakai helper Canvas 2D (`groom()`, `bride()`, `pipe()`, `hill()`, `heart()`).
  Opsi: foto asli `{{photo_groom_photo}}`/`{{photo_bride_photo}}` via `drawImage` ke kepala.

### Z.5.2 HUD map (mobile frame)
```
┌───────────────────────────────────────────┐
│ ♥→koin     SCORE 000200      DUNIA 1 [N]  │ ← HUD info (atas, tak di-tap)
│ [Pwr]                            3/11 💌   │ ← power kiri · progress kanan
│ ┌───┐                              ┌─┬─┬─┐ │
│ │★▦ │ ICON-BUTTON (KIRI-ATAS)      │💌♥✓│ │ ← indikator kepingan (KANAN-ATAS)
│ │💌 │ ★cheat ▦stage 💌buka         └─┴─┴─┘ │
│ │🎵⟲│ 🎵musik ⟲reset                       │
│ └───┘            (area main)               │
│         [Si-Groom di atas tanah]           │
│ ══════════════ tanah ══════════════════════│ ← GROUND_Y = BH-200 (touch)
│  ╭───╮                          ┌────┐┌──┐ │
│  │joy│ KIRI-BAWAH        KANAN→ │JUMP││RN│ │ ← joystick + JUMP/RUN(FIRE)
│  ╰───╯                          └────┘└──┘ │
└───────────────────────────────────────────┘
```
- ICON-BUTTON **kiri-atas** (★cheat, ▦stage-select, 💌buka-undangan, 🎵`btn-toggle-music`, ⟲reset).
- Indikator kepingan **kanan-atas** (N ikon dinamis; redup→nyala saat unlock; klik ikon aktif →
  modal section clone dari `#inv-source`).
- Joystick **kiri-bawah**; **JUMP** (besar ~82px) + **RUN/FIRE** **kanan-bawah**. Target ≥44px,
  spacing ≥8px, `env(safe-area-inset-*)`.

### Z.5.3 Toast (atas-tengah, JANGAN di dasar)
```css
.gw-toast{ position:absolute; top:18%; left:50%; transform:translate(-50%,-12px); z-index:30; opacity:0; transition:.2s; }
.gw-toast.show{ opacity:1; transform:translate(-50%,0); }
```
- `top:18–35%`, 3–8s auto-dismiss, warna+ikon (cyan/✓ kepingan, merah bahaya). Satu antrian.

### Z.5.4 Dialog pilih (stage/kesulitan) — tombol OK (jangan auto-apply)
```
┌─ PILIH DUNIA & KESULITAN ──┐
│ [EASY] [NORMAL*] [HARD]    │  ← klik = highlight (pendingDiff), belum apply
│ [1][2][3][4][5][6]         │  ← klik = highlight (pendingWorld)
│        [ OK ]  [Batal]     │  ← OK = commit & start; Batal = tutup
└────────────────────────────┘
```
- Klik opsi = tandai pending (highlight); **OK** = commit; **Batal** = tutup. Difficulty pakai
  class/handler sama dengan cover (`pickDiff()`) → konsisten. Stage-select memuat picker kesulitan
  sekaligus (pola retromario). Semua tombol = **tombol game** (mono/border/shadow, no link telanjang).

## Z.6 Celebration moment (2 pemicu, keduanya wajib)

**Pemicu 1 — kepingan TERAKHIR didapat** (`allInfoUnlocked()` true):
- Beat meriah ~5s (flash + partikel hati + SFX menang) → toast → `setTimeout ~4.5s` → dialog
  "Semua kepingan terkumpul — undangan {groom}♥{bride} siap dibuka!" + CTA "💌 Buka Undangan".
- Guard `announcedAll=true` (persist) → tak terulang.

**Pemicu 2 — game tamat** (boss kalah, dunia 6):
- Selamatkan Bride → beat meriah 5s → dialog happy-ending (rangkum skor/dunia + nama dinamis +
  CTA). Guard `completed=true` (persist). **Pastikan SEMUA kepingan ter-unlock** saat menang.

- Keduanya bisa terjadi urutan mana pun (kepingan dulu / bersamaan di dunia 6) — desain tahan
  kedua urutan. Nama mempelai **dinamis** (`val('groom_nickname')` dst.), jangan hardcode. SFX
  perayaan = audio game (bukan backsound tenant).

## Z.7 Cover / Open / Reveal

- Pola `id="theme-cover"`+`id="main-content"` (host handle visibility) **atau** kelola sendiri —
  konsisten. Cover overlay DALAM frame = PRESS START + pilih kesulitan + petunjuk kontrol.
- Reveal penuh (Buka Undangan) = clone semua section dari `#inv-source` → scroll vertikal di dalam
  frame. Tombol Buka Undangan terkunci sampai `allInfoUnlocked()` (atau cheat).
- **Lightbox** galeri sendiri → class BEDA (`.gw-gallery-item`) agar host tak membajak klik.

## Z.8 Kerangka HTML minimum
```html
<div class="gw-shell">
  <div class="gw-frame">
    <div class="gw-stage" id="gw-stage"></div>
    <!-- HUD, ICON-BUTTON kiri-atas, indikator kanan-atas, kontrol sentuh, overlays, toast -->
  </div>
  <aside class="gw-cover-side"><!-- canvas couple + akad/resepsi + BUKA UNDANGAN (no game btn) --></aside>
  <div class="gw-invitation" id="inv-source"><!-- SEMUA section sekali, {{vars}} di sini saja -->
    <section data-info="hero"> … {{groom_nickname}} … </section>
    <section data-info="couple"> … </section>
    <section data-info="rsvp"> … form RSVP (ID host) … </section>
    <section data-info="schedule"> … </section>
    {{#if is_fitur_live_streaming}}<section data-info="streaming"> … </section>{{/if}}
    {{#if flag_pakai_timeline_kisah}}<section data-info="story"> … </section>{{/if}}
    {{#if has_gallery}}<section data-info="gallery"> … </section>{{/if}}
    {{#if flag_pakai_additional_feature_story_balasan_instagram}}<section data-info="happiness"> … </section>{{/if}}
    <section data-info="wishes"> … form ucapan (ID host) + {{#each wishes}} … {{/each}} … </section>
    {{#if tampilkan_amplop_online}}<section data-info="gift"> … </section>{{/if}}
    <section data-info="closing"> … {{kalimat_penutup}} … </section>
  </div>
  <div class="gw-modal-root" id="gw-modal-root"></div>
  <audio id="bg-music"></audio>
  <!-- APPENDIX P: <img data-asset ...> 5 sheet -->
</div>
```

> **Golden Rule APPENDIX Z:** *Cleanup idempotent + auto-resume cek cover; ID host verbatim; musik
> mirror idempotent (jangan play backsound); RSVP/ucapan panggil global host + fallback; desktop
> frame-kiri-480 + panel-kanan-pure-undangan + canvas couple; HUD map (icon kiri-atas/indikator
> kanan-atas/joy kiri-bawah/JUMP kanan-bawah); toast atas-tengah; dialog pilih tombol OK;
> celebration 2-pemicu (guard persist, nama dinamis).*

---

# CATATAN VERIFIKASI (tahap 2)

- **Screenshot headless Chrome TIDAK bekerja di mesin ini** — selalu blank, jangan dipercaya.
- **Verifikasi benar:** paste 3 file ke **Theme Editor** (`ThemeEditorPage.tsx`) → preview, **atau**
  minta user.
- **Logika game/loop:** harness Node headless menjalankan loop asli dengan **RAF di-stub** (bukan
  memanggil fungsi step langsung). Verifikasi: variable-jump, stomp, unlock kepingan, spawn
  relatif-kamera (musuh off-screen tak bisa kena hati-api), boss `hitBoss`→`defeatBoss`, reset penuh.
- **`showError()` on-screen** wajib → "Phaser gagal load" beda dari "logic bug" (dua-duanya blank).
- **Waspada cheat-mode bypass** (kepingan/kebal bocor ke normal) — memory `retromario-debugging`.

---

# SELF-CHECK BIBLE (§9 checklist)

- [x] Ikuti `bible-template.md`: §0–§12 + APPENDIX A–F + T/S/P + W–Z ada.
- [x] Lebih detail & spesifik-arketipe: pattern library 40 pola, entity encyclopedia yaml lengkap,
      6 biome/world library, boss 3-fase.
- [x] Density "NO DEAD AIR": beat-sheet SMB 1-1 (13 cluster) + lantai ber-angka + `validateDensity`
      (regen segmen sepi).
- [x] Aturan ber-angka (fisika lompat, follow-offset, TTK, coyote/buffer, GROUND_Y…).
- [x] Kode Phaser 3.80.1 benar (partikel API 3.60+, `game.destroy(true)`, `blocked.down`, guard
      `textures/anims.exists`).
- [x] APPENDIX P: 5 sheet + 5 JSON + `ASSET.md` + frame-map rect eksplisit + downscale + urutan
      upload + fallback procedural.
- [x] Variabel undangan terverifikasi ke `dynamic-variables.md` (tak dikarang).
- [x] APPENDIX W–Z lengkap: kepingan reachable+dinamis, cheat bypass, celebration 2-pemicu, layout
      2-kolom, mirror musik idempotent, `{{#if}}` membungkus `<section>`, ID host verbatim.
- [x] Tiap bagian besar punya Golden Rule.
- [x] Disimpan di `src/sample-theme/retromario-wedding/RETROMARIO_WEDDING_BIBLE.md`.

---

# SUMBER RISET

- [Mario Wiki — World 1-1 (SMB)](https://www.mariowiki.com/World_1-1_(Super_Mario_Bros.))
- [Thonky — Super Mario Bros 1, World 1-1](https://www.thonky.com/super-mario-bros-1/world-1-1)
- [StrategyWiki — Super Mario Bros./World 1](https://strategywiki.org/wiki/Super_Mario_Bros./World_1)
- [The Physics Factbook — SMB Gravity](https://hypertextbook.com/facts/2007/mariogravity.shtml)
- [SMW Central — Quantifying player physics in vanilla SMW](https://www.smwcentral.net/?p=viewthread&t=97883)
- [Mario Wiki — Jump](https://www.mariowiki.com/Jump)
- [Mario Wiki — Bowser's Castle](https://www.mariowiki.com/Bowser's_Castle)
- [StrategyWiki — NSMB Bowser's Castle](https://strategywiki.org/wiki/New_Super_Mario_Bros./Bowser's_Castle)
- Reference internal: `MARIO_LEVEL_GENERATION_BIBLE.md` (kedalaman), `CONTRA-DEVELOPMENT-PHARSER-BIBLE.md`
  (struktur Phaser), skill reference (`density-engine.md`, `game-feel-and-level-design.md`,
  `phaser-technical-foundation.md`, `layout-camera-hardwon.md`, `sprite-sheet-assets.md`,
  `host-contract.md`, `dynamic-variables.md`).
