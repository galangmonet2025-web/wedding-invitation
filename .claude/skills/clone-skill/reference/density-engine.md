# Density Engine — "NO DEAD AIR" (kenapa game terasa hambar, & cara memaksanya padat)

> **Akar masalah yang file ini selesaikan:** game yang digenerate terasa **hambar** — pijakan
> untuk naik kurang, dekorasi environment minim, musuh "kadang ada kadang nggak". Penyebabnya
> Bible lama hanya mengatur **plafon** ("maks 3 tipe musuh/wave", "≥3 lapis parallax") tapi nyaris
> tak punya **LANTAI kepadatan yang terukur & wajib divalidasi**. Generator menghasilkan apa pun
> yang "cukup" → kosong.
>
> File ini = bahan baku untuk **§3 (World/Level)**, **§5 (Enemy)**, **APPENDIX A (Pattern)**,
> **APPENDIX C (Biome)**, **APPENDIX E (Validator)**, **APPENDIX F (Generation Algorithm)** di
> Bible. Bible **wajib** menuangkan semua angka di sini sebagai **rules ber-angka + validator yang
> di-RUN generator** (segmen gagal kuota = regenerate), bukan kalimat normatif.
>
> **⚠️ INI PRINSIP UNIVERSAL — BUKAN aturan khusus Metal Slug.** "No dead air" + lantai kepadatan
> + validator regen berlaku **untuk SETIAP arketipe** (platformer, top-down, runner, match-3, maze,
> brick-breaker, hybrid). Metal Slug di §1 hanyalah **satu ILUSTRASI** cara mengukur kepadatan dari
> game arcade asli — ia menunjukkan *metode*-nya (bikin beat-sheet → ekstrak angka lantai →
> validasi), bukan angka yang harus disalin mentah. **Mario, Zelda, Candy Crush, Pac-Man pun punya
> "kepadatan"-nya sendiri** (koin & rahasia tiap layar; objek/ancaman tiap ruang; valid-move tiap
> turn; dot tiap lorong). Tugas generator untuk arketipe apa pun: **ulangi metode §1 + §7 ke game
> referensinya sendiri**, lalu tegakkan validator §5 dengan entity yang dipetakan di §6.
>
> Jadi: §1 = *contoh metode* · §2–§3 = *prinsip & metrik universal* · §5 = *validator universal* ·
> §6 = *pemetaan ke tiap arketipe* · §7 = *langkah riset wajib untuk arketipe APA PUN*.

---

## 0. GOLDEN RULE (taruh di kepala §3 Bible)

> **Layar tidak boleh pernah "kosong". Pada setiap jendela selebar-layar (1× viewport) HARUS
> ada sesuatu yang hidup: musuh, item, ledakan, prop bergerak, elevasi, atau event. Lantai
> kepadatan ditegakkan oleh validator — bukan harapan.**

Ini bukan estetika; ini mekanik. Arcade densenya **disengaja**: musuh respawn dari tepi sebelum
yang lama habis, prop mengisi ruang mati, reward menjaga dopamin. Tiru itu.

> **⚠️ Padat ≠ spawn semua di awal.** "Musuh respawn dari tepi" berarti musuh off-screen adalah
> **data inert** yang baru jadi entity ber-hitbox **saat tepi layar mencapainya** — BUKAN
> di-spawn aktif di world-X jauh-kanan sejak load (itu bikin bug "peluru bunuh musuh yang belum
> masuk layar"). Kepadatan dicapai lewat **kerapatan `triggerX` di list spawn**, bukan lewat
> menaruh banyak musuh hidup off-screen. Mekanik spawn relatif-kamera lengkap:
> [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §23.

---

## 1. REVERSE-ENGINEER: beat-sheet Metal Slug Mission 1 — *CONTOH METODE (run-and-gun)*

> Ini **satu ilustrasi** cara mereverse-engineer kepadatan dari game arcade asli. Untuk arketipe
> lain, **buat tabel serupa** dari game referensinya (lihat §7). Yang ditiru bukan angkanya, tapi
> **metodenya**: pecah 1 level jadi cluster event → hitung jaraknya → ekstrak angka lantai (§2).

Hasil riset (arcadequartermaster, gamesurge walkthrough, Wikipedia, GameFAQs). Stage ini
**~60–90 detik** main, tapi memuat **13 cluster event** — itulah kepadatannya. Urut kiri→kanan:

| # | Posisi | Event (musuh / item / kendaraan / POW / terrain / boss) |
|---|--------|---------------------------------------------------------|
| 1 | spawn | parachute drop; **stone-head landmark**; rebel **melee-rush** (pistol/pisau) langsung menyerbu |
| 2 | +detik | **peti senjata di samping batu → Heavy MG (senjata pertama, dalam hitungan detik)** |
| 3 | layar sama | 2 prajurit berebut **babi** (set-piece komedik + skor) — "layar memberi reward keingintahuan" |
| 4 | atas | **POW #1** terikat di tiang lvl-atas → bebaskan → **medali/reward acak** (reward-cadence pertama) |
| 5 | kapal selam | **POW #2** → drop amunisi; **peti FlameShot**; kapal selam terdampar = prop midground |
| 6 | sesudah sub | **ancaman udara pertama: heli pengebom**, jatuhkan **4 bom** → rhythm ground+air |
| 7 | mendekat sungai | infanteri + **rocket-diver/sersan ranged** → eskalasi melee→melee+ranged |
| 8 | **sungai dangkal** | TERRAIN berubah: air; **penyelam muncul dari air** + **penembak di atas struktur kayu** (layer vertikal) + **barel kuning** (chain-explode) → 3 bidang ancaman sekaligus |
| 9 | rumah tepi sungai | **rumah kayu + 2 prajurit pelempar granat** |
| 10 | **gerbang kendaraan** | **Metal Slug (tank SV-001)** tersedia → power-spike mid-mission |
| 11 | rapids→air terjun | **tank musuh pertama: 2× Girida-O**, datang **satu per satu** (gated di balik dapat Slug) |
| 12 | dasar air terjun | gunship jatuh + prajurit di scaffold; **bebaskan 2 POW di badan pesawat → Rocket Launcher** |
| 13 | **BOSS — Tetsuyuki** | gunboat darat: laser cannon, volley 3 bolt melengkung (telegraph charge), fase-2 bola laser high/low; scaffold destructible |

**Yang harus generator pelajari dari tabel ini:**
- Senjata pertama datang **dalam detik** (#2), bukan menit. Reward di muka.
- **POW/reward tiap ~15–20 detik** (#2,4,5,12) menjaga dopamin.
- Eskalasi tipe ancaman **monoton naik**: melee → +ranged → +udara → +hazard lingkungan → +armor → boss.
- Setiap kendaraan/armor **digated di balik counter** (Slug diberikan tepat sebelum tank).
- TERRAIN berubah (#8 sungai, elevasi naik ke air terjun) — bukan datar lurus.
- Tiap "napas" tetap **terisi** (babi #3, POW #4) — breather ≠ kosong.

---

## 2. DENSITY METRICS (angka LANTAI — ini yang divalidasi)

> Sumber tertulis menyebut "grup", bukan hitungan frame-akurat; angka di bawah = **target desain
> terkalibrasi** dari beat-sheet, dibulatkan jadi aturan generator. Ini **lantai (minimum)**, bukan
> plafon. Plafon lama ("≤2 tipe/wave") tetap berlaku untuk *variasi per-wave* — keduanya hidup
> bersama: **sedikit tipe per wave, tapi selalu ADA wave**.

| Metrik | Lantai (minimum wajib) | Catatan |
|---|---|---|
| **Max "dead air"** | **≤ 2 detik** atau **≤ 0.75× lebar-layar** tanpa entity/event aktif | aturan paling keras; divalidasi per-segmen |
| **Musuh aktif / layar** (zona tempur) | **≥ 3–4**, target 4–8 di zona padat | "kadang ada kadang nggak" = pelanggaran |
| **Pijakan/elevasi / lebar-layar** | **≥ 1 platform naik** tiap **6–10 tile** (≈ tiap ~0.6–1.0 layar) | langsung jawab "pijakan untuk naik kurang" |
| **Prop dekorasi / lebar-layar** | **≥ 1 far-parallax + 1–2 landmark midground + 2–4 destructible foreground** | jawab "dekorasi kurang" |
| **Ambient motion / layar** | **≥ 1** sumber gerak (air/asap/dedaunan/idle-prop) | layar tak boleh "beku" |
| **Reward cadence** | item/POW/kepingan/skor-pickup tiap **≤ 15–20 detik** main | dopamin |
| **Power-spike** | 1 reward besar per **pivot eskalasi** | senjata baru / kendaraan |
| **Destructible / layar** | **≥ 2** (barel/peti/struktur) | ledakan = noise visual konstan |
| **Bidang ancaman di zona eskalasi** | **≥ 2 simultan** (darat+udara, atau darat+ranged-vertikal) | template sungai #8 |

**Rasio tipe musuh (kalibrasi Mission 1, geser per-biome):** melee-rush ~55% / ranged ~30% /
vehicle-air ~15%. Stage awal lebih melee; armor/heavy hanya muncul **setelah** pemain diberi counter.

---

## 3. PRINSIP PACING (DNA SNK — tuangkan sebagai rules)

1. **No dead air (≤2 detik / ≤0.75 layar).** Selalu ada yang masuk: musuh dari tepi, bom, barel
   meledak, POW muncul, terrain berubah. Generator **TIDAK** boleh menjadwalkan jendela > 2s tanpa
   entity/event aktif di viewport. → divalidasi (§5).
2. **Telegraph sebelum ancaman.** Tiap serangan high-damage diberi wind-up ~0.5–1s (charge boss,
   heli hover sebelum drop, tank masuk satu-satu). Padat ≠ tak adil.
3. **Layer ancaman simultan.** Di zona eskalasi tumpuk ≥2 bidang: darat (rusher) + vertikal
   (penembak di platform) + lingkungan (barel) — persis river #8.
4. **Reward cadence.** Reward nyata (senjata/POW/kepingan/skor) tiap ≤15–20s; power-up besar di tiap
   pivot eskalasi. Kepingan undangan **menambah** cadence ini, bukan menggantikannya.
5. **Gate via kendaraan/miniboss.** Kelas musuh berat hanya muncul **setelah** pemain diberi counter,
   lalu langsung diuji (Slug → tank).
6. **Kurva sawtooth, tapi LANTAI tetap sibuk.** Tinggi (gauntlet) → rendah (breather) → lebih tinggi.
   Tapi lembah **tetap terisi** (POW/prop/joke), bukan kosong.
7. **Ledakan = noise visual konstan.** Sebar destructible agar tembakan pemain memicu ledakan
   sekunder hampir terus-menerus.
8. **Eskalasi tipe baru tiap segmen.** melee → +ranged → +udara → +hazard → +armor → boss.

---

## 4. ENVIRONMENT DENSITY (jawaban langsung "dekorasi kurang")

Layar Metal Slug tak pernah barren karena **3 lapis terisi + ambient motion**. Generator wajib
mengisi tiap lebar-layar dengan:

- **Far parallax (`scrollFactor ~0.2`):** kanopi jungle / siluet gunung / langit per-biome +
  **air terjun beranimasi** di akhir stage.
- **Midground landmark (`~0.45`):** ≥1–2 prop besar pengarah — stone-head, kapal selam terdampar,
  rumah kayu, scaffold, gunship jatuh (yang lalu jadi boss). Landmark = "rasa tempat".
- **Foreground destructible (`~0.7–1.0`):** 2–4 per layar — peti, **barel kuning explosive**,
  struktur kayu (runtuh saat ditembak), pagar/rubble, tiang POW.
- **Ambient motion ≥1/layar:** sungai/rapids/percikan air terjun, bom & shell jatuh, ledakan barel
  berantai, babi & prajurit-berdebat (set-piece idle), tali POW, muzzle flash bertumpuk.

> **Aturan generator:** tiap lebar-layar = **1 far + 1–2 midground landmark + 2–4 foreground
> destructible + ≥1 ambient motion**. Slot yang tak terisi musuh/kepingan → **isi prop**, jangan
> biarkan kosong. (Ini memperketat APPENDIX C lama yang cuma minta "≥3 parallax".)

---

## 5. VALIDATOR "NO DEAD AIR" (WAJIB di-RUN generator — APPENDIX E/F Bible)

Bible **wajib** men-spec validator ini sebagai gate keras: tiap stage dipindai per **segmen**
(lebar 1 viewport, sliding atau kontigu). Segmen yang **gagal** → **regenerate segmen itu** (atau
sisipkan filler/prop/musuh sampai lolos), bukan diluluskan.

```js
// Pseudocode — letakkan di APPENDIX F Bible, sesuaikan tipe per arketipe.
// SEG = lebar 1 viewport (BW). Iterasi tiap SEG kontigu di sepanjang stage.
function validateDensity(stage, BW, opts) {
  var fails = [];
  for (var x = stage.startX; x < stage.endX; x += BW) {
    var seg = stage.window(x, x + BW);            // entitas yang overlap jendela ini
    var enemies   = seg.count('enemy');
    var platforms = seg.count('platform_elevated'); // pijakan NAIK (bukan tanah dasar)
    var decorFar  = seg.count('parallax_far');
    var decorMid  = seg.count('landmark_mid');
    var destruct  = seg.count('destructible');      // peti/barel/struktur
    var ambient   = seg.count('ambient_motion');

    // --- LANTAI (§2). Zona aman awal (start safe zone) dikecualikan dari kuota musuh. ---
    var combat = !seg.isSafeZone;
    if (combat && enemies < opts.minEnemiesPerScreen)        fails.push([x,'enemies',enemies]);
    if (platforms < opts.minPlatformsPerScreen)              fails.push([x,'platforms',platforms]);
    if (decorFar < 1)                                        fails.push([x,'parallax_far']);
    if (decorMid < 1)                                        fails.push([x,'landmark_mid']);
    if (destruct < opts.minDestructiblePerScreen)            fails.push([x,'destructible',destruct]);
    if (ambient < 1)                                         fails.push([x,'ambient']);

    // --- MAX DEAD AIR: tak ada gap > maxDeadPx tanpa entity/event aktif ---
    var biggestGap = seg.largestEmptyRun('enemy|item|destructible|event');
    if (biggestGap > opts.maxDeadPx)                         fails.push([x,'deadair',biggestGap]);
  }
  // --- REWARD CADENCE: jarak antar reward (item/POW/kepingan) ≤ rewardEveryPx ---
  if (stage.maxRewardGap() > opts.rewardEveryPx)             fails.push(['*','reward-gap']);
  return fails; // kosong = lolos; tidak kosong = REGENERATE segmen-segmen itu
}

// Knob default (skala per difficulty & per arketipe):
var DENSITY = {
  minEnemiesPerScreen:    3,      // easy 3 · normal 4 · hard 6
  minPlatformsPerScreen:  1,      // ≥1 pijakan naik tiap layar (tiap 6–10 tile)
  minDestructiblePerScreen: 2,
  maxDeadPx:              Math.round(BW * 0.75), // ≤ 0.75 layar kosong (≈ ≤2s @ scroll normal)
  rewardEveryPx:         Math.round(BW * 2.5),   // reward tiap ≤ ~2.5 layar (~15–20s)
};
```

**Aturan validator:**
- Validator **bagian dari generation loop**, bukan checklist manual. `build spine → fill patterns →
  place entities → validateDensity → FIX/REGEN loop → place pieces → validate playability`.
- **Lantai, bukan plafon.** Boleh lebih padat; tak boleh lebih sepi dari knob.
- **Jangan matikan validator demi "cepat".** Output yang lolos validator playability tapi GAGAL
  density = tetap gagal (itu sumber "hambar").
- **Start safe zone** (~600px pertama, onboarding) dikecualikan dari kuota *musuh* saja — dekorasi &
  pijakan tetap wajib (zona awal pun tak boleh kosong; isi prop/landmark + 1 musuh telegraph pelan).

---

## 6. PEMETAAN KE TIAP ARKETIPE (no dead air bukan cuma run-and-gun)

| Arketipe | "Dead air" = | Lantai kepadatan setara |
|---|---|---|
| **Run-and-gun** (Metal Slug) | layar tanpa musuh/ledakan/prop | §2 apa adanya: ≥3–4 musuh, pijakan/6–10 tile, 2–4 destructible |
| **Platformer** (Mario) | bentang datar tanpa platform/musuh/koin/rahasia | ≥1 elevasi & ≥1 interaktif (musuh/koin/blok/?) tiap layar; gap diisi koin-trail; prop biome tiap layar |
| **Top-down** (Zelda) | ruang kosong tanpa musuh/objek/rahasia | tiap ruang ≥1 ancaman/puzzle/reward + dekorasi (rumput/pot/obor); koridor pun ada prop |
| **Endless runner** | jendela chunk tanpa rintangan/koin | tiap window ada obstacle+coin-line (budget cost minimum/window); bg props selalu scroll |
| **Match-3** | papan/turn tanpa peluang match/cascade | board penuh, ≥1 valid-move dijamin, juice tiap aksi (tak ada turn "sepi") |
| **Maze** (Pac-Man) | lorong tanpa dot/hantu/buah | dot mengisi semua jalur; hantu selalu berkeliaran; buah bonus periodik |
| **Brick-breaker** | layar dengan terlalu sedikit brick/efek | pola brick padat per board, power-drop periodik, partikel tiap pantul |

Generator memilih baris yang sesuai arketipe, lalu pakai validator §5 dengan `count()` yang
dipetakan ke entity arketipe itu (platform→chunk/room/brick; enemy→ghost/obstacle; dst).

**Knob density per arketipe (ganti makna unit, bukan matikan validator):**

| Arketipe | Unit "segmen" | `minEnemiesPerScreen` jadi… | `minPlatformsPerScreen` jadi… | `maxDeadPx`/cadence jadi… |
|---|---|---|---|---|
| Run-and-gun | 1 viewport | ≥3–4 musuh aktif | ≥1 pijakan naik/6–10 tile | ≤0.75 layar kosong |
| Platformer | 1 viewport | ≥1 musuh/hazard | ≥1 elevasi + koin-trail isi gap | ≤0.75 layar tanpa interaktif |
| Top-down | 1 ruang/screen | ≥1 ancaman/puzzle/ruang | ≥1 objek interaktif + dekorasi | tak ada ruang/koridor kosong |
| Endless runner | 1 chunk-window | ≥1 obstacle/window | ≥1 coin-line/window (budget min) | ≤1 window tanpa event |
| Match-3 | 1 board/turn | n/a → ≥1 valid-move dijamin | board terisi penuh, no pre-match | tak ada turn tanpa peluang cascade |
| Maze | 1 region maze | hantu selalu aktif berkeliaran | dot mengisi **semua** jalur | tak ada lorong tanpa dot |
| Brick-breaker | 1 board | n/a | pola brick padat/board | power-drop periodik, partikel tiap pantul |

> **Inti:** validator **tidak pernah dimatikan** untuk arketipe non-action — yang berubah hanya
> *unit* dan *nama entity*-nya. "Turn match-3 tanpa peluang" = dead air, sama seriusnya dengan
> "layar Metal Slug tanpa musuh".

---

## 7. RISET WAJIB SEBELUM MENULIS BIBLE — checklist beat-sheet (arketipe APA PUN, jangan "kira-kira")

Apa pun arketipenya, **ulangi metode §1** ke game referensinya sendiri. Ini WAJIB, bukan opsional
khusus run-and-gun. Langkahnya identik untuk semua arketipe:

1. **Pilih game referensi kanonik** untuk arketipe terpilih (lihat tabel di bawah).
2. **WebSearch** ke wiki/walkthrough/speedrun-notes/design-analysis game itu (jangan nonton video —
   andalkan dokumentasi tertulis).
3. **Susun beat-sheet** seperti §1: pecah **1 level/board/run** jadi cluster event terurut
   (posisi/turn → apa yang terjadi: ancaman/item/reward/terrain/event). Granular — idealnya 1 event
   tiap beberapa detik / tiap turn.
4. **Ekstrak angka lantai** seperti §2: berapa event/satuan, gap terkosong terpanjang, reward
   cadence, berapa entity per segmen.
5. **Petakan ke knob §6** (unit + nama entity arketipe itu).
6. **Tulis beat-sheet + angka itu ke Bible** (§3 / APPENDIX C) sebagai bukti kepadatan yang ditiru.

**Game referensi per arketipe (titik awal — perdalam sendiri):**

| Arketipe | Game referensi untuk beat-sheet | Yang dicatat |
|---|---|---|
| Run-and-gun | Metal Slug M1 (§1), Contra stage 1 | wave musuh, weapon-crate, POW, kendaraan, boss |
| Platformer | Super Mario Bros 1-1 / SMW | musuh/?-block/koin/pipa/rahasia per layar, jump-arc |
| Top-down | Zelda LttP dungeon, Pokémon route | musuh/objek/puzzle/dekorasi per ruang, lock-key |
| Endless runner | Temple Run, Subway Surfers | obstacle/coin-line/event per window, ramp speed |
| Match-3 | Candy Crush level, Bejeweled | objektif/blocker/cascade-juice per turn, special candy |
| Maze | Pac-Man | dot layout, ghost AI, power-pellet & buah timing |
| Brick-breaker | Arkanoid | pola brick/board, power-drop cadence, ball ramp |

> **Tanpa beat-sheet referensi, Bible dianggap belum selesai** — generator akan menebak kepadatan
> dan hasilnya hambar (untuk arketipe non-action pun). Riset ini murah; hambar mahal.

> **Golden Rule density:** *Kalau sebuah segmen bisa dilewati tanpa pemain berinteraksi dengan
> apa pun — musuh, item, lompatan, ledakan, atau prop bergerak — segmen itu GAGAL dan harus
> di-generate ulang. Padat itu fitur, bukan bug.*
