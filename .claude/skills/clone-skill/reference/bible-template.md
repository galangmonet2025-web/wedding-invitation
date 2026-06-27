# Template Bible — kerangka dokumen "Game Design Bible" yang DIGENERATE skill ini

> **Output utama skill ini = file Bible ini**, disimpan di
> `src/sample-theme/<nama>/<NAMA>_BIBLE.md`. Bible inilah yang nanti dipakai (panggilan
> terpisah) untuk men-generate 3 file tema (`index.html`/`index.css`/`index.js`).
>
> **Target kualitas: LEBIH detail dari `MARIO_LEVEL_GENERATION_BIBLE.md` (6033 baris)**, tapi
> engine = **Phaser 3.80.1** (bukan canvas 2D). Artinya: pakai kedalaman Mario (pattern
> library, entity encyclopedia, biome library, boss system, validator engine, generation
> algorithm) **+** appendix teknis khusus Phaser 3 **+** appendix integrasi undangan.
>
> Bible **tidak boleh tipis**. Tiap bagian harus *actionable*: aturan imperatif (WAJIB/DILARANG)
> + angka konkret + contoh BENAR vs SALAH + alasan (WHY). Hindari kalimat normatif kosong.

---

## Prinsip penyusunan Bible (baca dulu)

1. **Spesifik ke arketipe terpilih.** Bible Mario penuh tile/biome/jump-arc Mario; Bible kamu
   harus sama spesifiknya ke arketipe yang diminta (Contra → wave/aim/pod; Zelda → room/lock-key;
   runner → chunk/budget; match-3 → board/cascade). **Jangan** menulis Bible generik yang bisa
   ditempel ke game apa pun — itu tanda Bible-nya kurang dalam.
2. **Angka, bukan kata sifat.** "musuh jangan terlalu rapat" ❌ → "jarak spawn musuh ≥ 1.5×
   lebar layar di depan player; maks 2 tipe musuh per wave" ✅. Ambil angka terukur dari
   [`game-feel-and-level-design.md`](game-feel-and-level-design.md).
3. **Format kaya:** tabel komparasi, blok `yaml`/`json` untuk spec entity & config, ASCII
   diagram untuk state machine & layout, pseudo-code untuk algoritma, checklist validasi,
   "Golden Rule" satu-baris di akhir tiap bagian besar (pola Mario bible).
4. **Engine = Phaser 3.** Semua contoh teknis pakai API Phaser 3.80.1 yang benar (lihat
   [`phaser-technical-foundation.md`](phaser-technical-foundation.md)). JANGAN tulis loop RAF
   manual / `getContext('2d')` — itu jalur canvas (retromario), bukan jalur kita.
5. **Integrasi undangan adalah inti, bukan tempelan.** APPENDIX integrasi (W–Z di bawah) wajib
   selengkap APPENDIX E–J Bible Mario: kepingan, cheat, celebration, layout/HUD, collection
   mechanic, host-wiring.

---

## KERANGKA WAJIB (urutan & isi)

Bible yang digenerate harus memuat **semua** bagian berikut. Angka bagian boleh disesuaikan,
tapi jangan ada yang hilang. Bagian bertanda 🎮 = sesuaikan isi ke arketipe; 🔧 = teknis Phaser
(boleh sebagian besar reuse dari reference); 💌 = integrasi undangan (wajib lengkap).

### BAGIAN INTI (game design)

- **§0 Meta & ringkasan** — judul game, arketipe + referensi klasik, mood pasangan, 1-paragraf
  "elevator pitch", daftar isi. Sebut versi Phaser (`3.80.1`) & arsitektur single-file.
- **§1 Core Principles** 🎮 — 5–8 filosofi: Playability First, Teach Before Test, Fair
  Challenge, Readability, Discovery/Reward, **Game Dulu Baru Undangan**, Inklusif (cheat).
  Tiap prinsip: aturan keras + contoh BENAR/SALAH + alasan.
- **§2 Core Gameplay Loop** 🎮 — diagram loop inti (ASCII), 1 putaran = apa yang pemain lakukan
  berulang. Sebut "verb" utama (lompat/tembak/swap/dll).
- **§3 World / Level Structure** 🎮 — panjang level (angka px/tile/chunk per arketipe), start
  safe zone, goal/boss area, pacing template `Start→Teach→Practice→Test→Reward→Goal`. **Level
  WAJIB kaya & PADAT (bug "hambar" yang sudah dibayar):** tiap layar punya **elevation**
  (platform/tangga/parit), **cover**, **balok pijakan lompat tiap ~6–10 tile**,
  **explosive/destructible** (barel/peti), rintangan/hazard, musuh dari beberapa arah; pacing
  puncak-lembah (3–5 puncak + mini-boss). **Tegakkan LANTAI kepadatan "NO DEAD AIR"**: ≤2 detik /
  ≤0.75 layar tanpa entity/event; ≥3–4 musuh/layar; ≥1 far-parallax + 1–2 landmark + 2–4
  destructible + ≥1 ambient/layar; reward ≤15–20s. **WAJIB sertakan beat-sheet referensi** (tiru
  kepadatan arcade asli — pola Metal Slug Mission 1) + spec **validator no-dead-air**. Datar/kosong/
  "musuh kadang ada kadang nggak" = gagal validator. Sumber: [`density-engine.md`](density-engine.md)
  §1–§5, [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §13.
- **§4 Player System** 🎮🔧 — arsitektur (`class Player extends Phaser.Physics.Arcade.Sprite`),
  state machine lengkap (idle/run/jump/fall/hurt/dead + arketipe-specific), fisika (kecepatan,
  gravity, jump velocity, coyote time, variable jump — angka konkret), input abstraction.
  **ANIMASI per-state WAJIB** (idle napas / run / jump / fall / prone / shoot **mengikuti 8-arah** /
  hurt / dead) — pose & muzzle ikut arah, bukan sprite statis. Lihat
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §12.
- **§5 Enemy / Obstacle System** 🎮🔧 — **≥5–6 tipe musuh** dengan peran beda (rusher, ranged,
  turret, flyer, heavy/tank, mech/artileri) — pool besar lintas sektor, **≤2 tipe/wave**; AI state
  machine + spawn rule (jarak, density, wave shape) + difficulty knobs; pooling (Group). Musuh
  datang dari **beberapa arah** & **ber-animasi** (walk/aim/die). **Spawn WAJIB ada lantai, bukan
  murni `Math.random()`:** ≥3–4 musuh aktif/layar di zona tempur (easy 3·normal 4·hard 6); spawn
  probabilistik harus dijamin minimum per-segmen oleh validator (lihat
  [`density-engine.md`](density-engine.md) §2/§5 — "musuh kadang ada kadang nggak" = bug).
  **Spawn RELATIF-KAMERA WAJIB (bug "peluru bunuh musuh off-screen" yang sudah dibayar):** musuh
  off-screen = **data inert** (list `triggerX` terurut), di-instantiate jadi entity ber-hitbox
  **hanya saat `cam.scrollX+BW ≥ triggerX`, lahir DI TEPI kanan** — JANGAN spawn semua aktif saat
  level-load di world-X jauh. Peluru despawn di tepi viewport; hit hanya pada musuh aktif. Lihat
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §23 & §13.
- **§6 Interaction & Collision Matrix** 🎮 — tabel siapa-kena-siapa & hasilnya (damage/collect/
  block/kill). Collider vs overlap. Aturan damage & i-frames.
- **§7 Power-up / Item System** 🎮 — item gameplay (bukan kepingan undangan). **Powerup
  Relevance Rule**: powerup ofensif wajib punya usage-window sebelum goal.
- **§8 Difficulty Scaling** 🎮 — easy/medium/hard sebagai *knobs* (density, kecepatan, i-frame).
  Kurva sawtooth (peak+valley), bukan ramp lurus. **Ini undangan, bukan shooter hardcore:**
  default **ramah** — pertimbangkan **TANPA nyawa/game-over**; kena = knockback+i-frame; jatuh
  jurang = respawn ke titik **aman** (mundur, bukan awal stage / hazard / musuh). Lihat
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §17.
- **§9 Camera & Readability** 🔧 — follow/lerp, deadzone, lookahead, bounds; aturan keterbacaan
  (telegraph, silhouette, no blind jump). **Untuk side-scroller WAJIB ber-angka:**
  `setFollowOffset(-~0.40·BW, -70)` (player ke kiri ⅖ layar → pandangan depan luas; batas ~0.42) +
  `setDeadzone(20,120)` kecil-responsif. Jangan player di tengah. Sumber:
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §1 (bug yang sudah dibayar).
- **§10 Game Feel / Juice + GRAFIS** 🎮🔧 — daftar efek + angka: freeze-frame 2–8 frame,
  `camera.shake` (intensity float ~0.01–0.05), `camera.flash`, partikel (API 3.60+),
  squash&stretch, SFX pitch-vary. Stack semua efek di frame impact yang sama. **Grafis prosedural
  WAJIB di-shade:** tiap sprite = base + highlight (top ~22%) + shadow (bottom ~22%) + outline
  gelap (helper `box()`/`outline()`), siluet unik per entity. Sumber:
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §6 (flat single-color = belum selesai).
  **Opsi grafis "game sungguhan" (disukai): pakai PNG sprite sheet** menggantikan prosedural —
  spec lengkap (5 sheet + JSON + frame-map + urutan upload) ada di **APPENDIX P**
  ([`sprite-sheet-assets.md`](sprite-sheet-assets.md)); prosedural tetap jadi **fallback**.
- **§11 Audio Design** 🎮🔧 — SFX game via Web Audio/`this.sound` (kategori: hit, jump, collect,
  win). **Backsound undangan = milik host, JANGAN diputar tema** (lihat APPENDIX Z).
- **§12 Anti-Frustration Rules** 🎮 — coyote time, jump buffer, corner-correction, no
  spawn-kill, no mandatory-hidden, telegraph hazard pertama setelah checkpoint.

### APPENDIX game-design (kedalaman ala Mario) 🎮

- **APPENDIX A — PATTERN LIBRARY** — katalog pola ber-ID (mis. `T001`, `G001`, `E001` …)
  sesuai arketipe. Tiap pola: nama+ID, layout ASCII, purpose, rules, chaining. **Minimal
  20–40 pola.** Plus "Pattern Chain Rules" (jangan >3 pola sama berturut) & "Level Generation
  Formula" (% pola per difficulty).
- **APPENDIX B — ENTITY ENCYCLOPEDIA** — tiap entity (player, musuh, item, hazard, boss):
  spec `yaml` (hp/speed/damage/behavior), state machine, kill condition, collision rules.
  Lengkap seperti Mario APPENDIX C.
- **APPENDIX C — BIOME / STAGE LIBRARY** — tiap "dunia"/tema-visual: deskripsi, palet visual,
  allowed tiles/objek, enemy pool, pattern priority (%), physics modifier (mis. air/es),
  difficulty scaling antar-stage. **Backdrop WAJIB ber-lapis & PADAT (anti "dekorasi kurang"):**
  sky palet per-biome + ≥3 lapis parallax (`scrollFactor` 0.2/0.45/0.7), rebuild per sektor, **DAN
  kuota prop per lebar-layar: ≥1 far-parallax + 1–2 landmark midground + 2–4 destructible
  foreground + ≥1 ambient motion** (slot tak terisi musuh/kepingan → isi prop, jangan kosong).
  Sumber: [`density-engine.md`](density-engine.md) §4, [`layout-camera-hardwon.md`](layout-camera-hardwon.md)
  §7 (dunia jangan kosong/hitam).
- **APPENDIX D — BOSS / CLIMAX SYSTEM** — phase system (3 fase, threshold HP), arena rules,
  attack patterns + telegraph (wind-up ≥0.5s), weakness window (recovery ≥0.75–1s), escalation,
  victory sequence. Klimaks = "selamatkan mempelai". **WAJIB WALK-IN** (boss inactive + `arenaX`;
  kamera dikunci & boss aktif **saat `player.x ≥ arenaX`**, bukan saat build — §5 hardwon).
  **WAJIB HP BAR + bisa kalah (bug yang sudah dibayar):** **HP bar KECIL di ATAS boss** (world-space,
  ikut posisi) yang turun tiap hit; **TTK ~10–40s**; feedback tiap hit. **Hit-detection MANUAL tiap
  frame** (jangan andalkan overlap fisika pada boss bobbing/immovable; **jangan `setActive(false)`** —
  pakai alpha). **Peluru boss aim ke player** + spread (bukan flat konstan). **Verifikasi di harness**:
  taruh peluru di posisi boss → `manualBossHits` → hp turun; lalu `hitBoss`→`defeatBoss`. §11/§16 hardwon.
- **APPENDIX E — VALIDATOR ENGINE** — checklist playability (goalReachable, allPiecesReachable,
  noSoftlock, noImpossibleJump, noSpawnKill …) + **VALIDATOR DENSITY "NO DEAD AIR" (wajib, gate
  keras)**: pindai per-segmen (1 viewport) → cek lantai musuh/pijakan/dekorasi/destructible/ambient
  + max-dead-air ≤0.75 layar + reward cadence ≤2.5 layar; **segmen gagal = REGENERATE**, bukan
  diluluskan. + scoring (playable/fun/fair/rewarding/discovery → total 100, lulus ≥80) +
  regeneration loop. Spec `validateDensity()` lengkap di [`density-engine.md`](density-engine.md) §5.
  Pola Mario APPENDIX F.
- **APPENDIX F — GENERATION ALGORITHM / PROMPT SYSTEM** — langkah deterministik membangun
  stage: `build spine → fill patterns → place entities → **validateDensity → FIX/REGEN loop** →
  place pieces → validate playability`. Density loop **bagian dari pipeline**, bukan checklist
  manual ([`density-engine.md`](density-engine.md) §5). + "master instruction" untuk meng-generate
  stage baru. Pola Mario APPENDIX G.

### APPENDIX teknis (Phaser 3) 🔧

- **APPENDIX T — TECHNICAL FOUNDATION (PHASER 3.80.1)** — saring dari
  [`phaser-technical-foundation.md`](phaser-technical-foundation.md): game config & boot aman
  (ukuran-0 trap), scene lifecycle, arcade physics (platformer movement, blocked.down), object
  pooling (Group), procedural texture (`generateTexture` + guard `textures.exists`), input
  (keyboard+virtual joystick), animation/tween/particle (API 3.60+!), tilemap, performance,
  **cleanup `game.destroy(true)` + hook global** (kritikal: script di-re-inject host).
- **APPENDIX S — PROJECT / SINGLE-FILE ARCHITECTURE** — 3 file, IIFE, lapisan logis
  (Player/EnemyManager/pools/Boss/config) walau monolitik. Config terpusat, data-driven bila
  bisa. `ensurePhaser()` fallback. **Ground vs controller (ber-angka):**
  `GROUND_Y = BH − (isTouch ? 200 : 150)` agar karakter tak tertutup tombol sentuh — lihat
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §2.
- **APPENDIX P — ASET PNG (SPRITE SHEET)** — saring dari [`sprite-sheet-assets.md`](sprite-sheet-assets.md):
  cara memakai **file PNG sebagai sprite** karakter & objek (grafis "game sungguhan") menggantikan
  prosedural, dengan **fallback prosedural** wajib. Berisi: (1) turunkan kebutuhan sprite dari
  gameplay; (2) kelompokkan jadi **TEPAT 5 sheet** (player / enemy / environment / game-object /
  box-kepingan); (3) **5 JSON generate** (1 per kelompok: `kelompok, name, deskripsi, orderNumber,
  frameWidth≥80, frameHeight≥80`) **+ spec file `ASSET.md`** (brief pembuat aset = aturan umum + 5
  tabel kebutuhan + 5 blok JSON, mirror `*-assets.json` — pola `metalslug-wedding/ASSET.md`);
  (4) engine **men-slice satu gambar utuh** via **frame-map rect
  eksplisit** (bukan grid seragam — bug "boss dobel") + downscale ke key engine lama + anim
  multi-frame + key-out bg; (5) **URUTAN UPLOAD baku** (player→enemy→environment→game-object→
  box-kepingan) karena `{{asset_image_N}}` dinomori dari urutan upload — HTML `data-asset` per sheet.
  Sertakan juga panduan prompt image-gen dari `deskripsi`. Mekanisme upload host **sudah ada**
  (sesuaikan, jangan bangun ulang). Contoh kerja: `src/sample-theme/metalslug-wedding/`.

### APPENDIX integrasi undangan (wajib lengkap) 💌

- **APPENDIX W — WEDDING INTEGRATION (pemetaan section→kepingan)** — 11 section + flag +
  variabel (verifikasi ke [`dynamic-variables.md`](dynamic-variables.md)), aturan penempatan
  kepingan (reachable, section inti di stage awal, kepingan≠powerup ofensif), alur koleksi.
- **APPENDIX X — COLLECTION MECHANIC** — bentuk kepingan per arketipe, quota per-stage +
  auto-scale saat section dikurangi flag, pemetaan stage→kepingan deterministik, respons-ambil
  (unlock+skor+SFX+partikel+animasi+toast, **no auto-open**), filler skor sisa quota.
- **APPENDIX Y — CHEAT SYSTEM** — satu flag, dua ranah (gameplay invincible + undangan
  auto-unlock), skor beku saat cheat, persist = keputusan sadar (default jangan), audit
  cheat-bypass blind spot. **RESET = PENUH (bukan sebagian):** setelah konfirmasi overlay →
  wipe localStorage (incl. **kesulitan** kembali default), `GAME.destroy(true)` (**stage reset**),
  reset cheat & run, **kembali ke COVER untuk pilih kesulitan lagi**. Verifikasi di harness. Lihat
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §21.
- **APPENDIX Z — HOST CONTRACT & WIRING** — saring dari [`host-contract.md`](host-contract.md) +
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md): ID host verbatim, mirror musik idempotent,
  panggil `window.submitRsvp/submitUcapan`+fallback, `{{#if}}` membungkus `<section>`,
  **layout 2-kolom desktop: frame game MENTOK KIRI (480px) + panel info wedding mengisi KANAN**
  (`justify-content:flex-start`, `order`, bukan center, bukan 3 kolom — §4 file hardwon),
  **HUD map: icon-button kiri-atas · indikator kepingan kanan-atas · joystick kiri-bawah ·
  FIRE/JMP kanan-bawah** (§3 file hardwon, ada diagram ASCII),
  **toast/notifikasi di atas-tengah (~18–35% dari atas, 3–8s, warna+ikon — JANGAN di dasar)** (§10),
  **dialog pilih (stage/kesulitan) pakai tombol OK — klik opsi = tandai pending, OK = commit, ada
  Batal (jangan auto-apply on-click)** (§14),
  celebration moment (2 pemicu, beat ~5s, guard sekali-tampil).

---

## Panduan kedalaman per arketipe (apa yang bikin Bible "tebal & spesifik")

| Arketipe | Yang HARUS digali dalam (jangan dangkal) |
|---|---|
| **Platformer** (Mario) | jump-arc tile-math (standing ~4, run-up ~5–6 tile tinggi; jarak ~5/8/12 tile), gap %D_max, biome library, pipe/block/secret patterns |
| **Run-and-gun** (Contra) | 8-arah aim, wave shape (triangle→diamond ke boss), ≤2 tipe musuh/wave, bullet telegraph, weapon triangle (coverage/damage/rate), pod kepingan |
| **Top-down adventure** (Zelda) | lock-and-key graph DULU lalu ruang, gimmick item mid-dungeon, boss = ujian item, room/screen design |
| **Endless runner** | chunk prefab + connection contract, budget cost system, speed ramp + cap, min_lead = speed×(0.3s+lag+aksi), validasi di speed-cap |
| **Match-3** | board 8×8, match≥3, special ladder (4→line, 5→color-bomb, T/L→3×3), cascade multiplier, valid-move guarantee/reshuffle |
| **Maze/collector** (Pac-Man) | ghost AI personalities, dot/pellet layout, power-pellet windows, tunnel wrap |
| **Brick-breaker** | paddle physics & angle control, brick layouts, power drops, ball speed ramp |

> **Berlaku SEMUA baris di atas — "no dead air":** apa pun arketipenya, sertakan **beat-sheet
> referensi** dari game arcade aslinya (riset web) + **lantai kepadatan** + **validator density**
> yang memaksa regen segmen sepi. Pemetaan "dead air" per arketipe ada di
> [`density-engine.md`](density-engine.md) §6. Bible tanpa ini = berisiko hambar (bug yang dibayar).

Untuk arketipe lain / hybrid: cari prinsip terukur yang setara dan dokumentasikan — kalau perlu
**riset web** (WebSearch) untuk mekanik kanonik, lalu tulis sebagai rules ber-angka.

---

## Anti-pattern saat menulis Bible

- ❌ **Stage "hambar"** (musuh kadang ada kadang nggak, pijakan kurang, dekorasi sepi, ada bentang
  kosong) → tegakkan **lantai kepadatan + validator "no dead air"** ([`density-engine.md`](density-engine.md)):
  ≤2s/≤0.75 layar tanpa event; ≥3–4 musuh/layar; pijakan tiap 6–10 tile; ≥1 far+1–2 mid+2–4
  destructible/layar; reward ≤15–20s; segmen gagal kuota = **regenerate**.
- ❌ **Spawn musuh murni `Math.random()`** tanpa jaminan minimum per-segmen → musuh inkonsisten.
  Jamin lantai via validator.
- ❌ **Spawn semua musuh aktif saat level-load di world-X jauh-kanan** → peluru bisa membunuh musuh
  yang **belum masuk layar** (bug nyata). Musuh off-screen = data inert; spawn DI TEPI saat
  `cam.scrollX+BW ≥ triggerX`; hitbox hanya saat aktif; peluru despawn di tepi.
  [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §23.
- ❌ **Tak ada beat-sheet referensi** → generator menebak kepadatan. Sertakan beat-sheet arcade asli (§3/APPENDIX C).
- ❌ Bible tipis / generik (bisa ditempel ke game apa pun) → kurang dalam, tidak lolos.
- ❌ Aturan tanpa angka ("secukupnya", "jangan terlalu") → ganti dengan bilangan terukur.
- ❌ Contoh kode pakai canvas/RAF manual → harus Phaser 3.
- ❌ API Phaser usang (mis. `particles().createEmitter()` yang dihapus di 3.60) → pakai API 3.80.1.
- ❌ Mengarang nama variabel undangan / fitur yang tak ada di daftar resmi.
- ❌ Melewatkan salah satu APPENDIX integrasi undangan (W–Z) → integrasi dianggap tak lengkap.
- ❌ **Kamera side-scroll menaruh player di tengah** (pandangan depan sempit) → pakai
  `setFollowOffset(-~0.40·BW)` (player ke kiri ⅖, batas ~0.42). [`layout-camera-hardwon.md`](layout-camera-hardwon.md) §1.
- ❌ **Tanah terlalu rendah** → karakter tertutup tombol sentuh. Pakai `GROUND_Y = BH−(isTouch?200:150)`. §2.
- ❌ **Posisi HUD acak / terbalik** → icon-button kiri-atas, indikator kanan-atas, joystick
  kiri-bawah, FIRE/JMP kanan-bawah. §3.
- ❌ **Layout PC center / 3 kolom / tombol game di kanan** → frame game mentok KIRI, panel kanan
  **pure undangan** (canvas couple + akad/resepsi + map, no tombol game), TEPAT 2 kolom. §4/§9.
- ❌ **Boss arena lock kamera + spawn boss seketika** → boss off-screen tanpa pemain. WAJIB
  **walk-in**: aktivasi saat `player.x ≥ arenaX`. §5.
- ❌ **Sprite flat single-color** (terlihat "testing") → shade base+highlight+shadow+outline. §6.
- ❌ **Backdrop kosong/sama tiap sektor** → sky palet per-biome + ≥3 lapis parallax + props. §7.
- ❌ **Stage-select tak bisa pilih kesulitan** → gabung picker kesulitan + grid sektor (pola retromario). §8.
- ❌ **Toast/notifikasi di dasar layar** (ketutupan kontrol, sulit dibaca) → atas-tengah ~18–35% dari atas, 3–8s, warna+ikon. §10.
- ❌ **Boss tanpa HP bar / tak bisa kalah** (terasa immortal) → HP bar garis-pandang + TTK 20–40s + feedback tiap hit; verifikasi `hitBoss`→`defeatBoss` di harness. §11.
- ❌ **Sprite statis untuk semua keadaan** → animasi per-state (idle/run/jump/fall/prone/shoot-8-arah/hurt/dead) untuk player & musuh. §12.
- ❌ **Level datar/kosong** (rintang minim, sedikit pijakan, musuh seragam) → elevation+cover+pijakan tiap 6–10 tile+explosive+≥5 tipe musuh. §13.
- ❌ **Dialog pilih auto-apply on-click** → klik = tandai pending, tombol OK = commit, ada Batal. §14.
- ❌ **Spec environment/UX "kira-kira"** → riset arketipe + UX (ber-angka, spesifik-stage). §15.
- ❌ **Boss andalkan overlap fisika saja** (bobbing/immovable/`setActive(false)` → tak kena tembak) →
  sembunyi via alpha + **cek hit MANUAL tiap frame**; HP bar kecil di atas boss; peluru boss **aim ke player**. §16.
- ❌ **Sistem nyawa + game-over + balik ke awal stage** (terlalu sulit utk undangan) → tanpa nyawa;
  kena = knockback+i-frame; jatuh jurang = respawn ke titik **aman** (bukan hazard/musuh/awal). §17.
- ❌ **Resize body crouch tiap frame** (judder) → resize on-state-change saja, anchor bawah. §18.
- ❌ **Reset hanya sebagian** (hapus kepingan tapi pertahankan kesulitan/sektor/lanjut main) → reset
  **PENUH**: wipe storage (incl. kesulitan) + `GAME.destroy(true)` (stage reset) + kembali ke cover (pilih kesulitan lagi). §21.
- ❌ **Peluru nembus musuh yang berdiri di atas balok/platform** (collider platform makan peluru duluan /
  tunneling peluru cepat) → overlap `bullets×enemies` didaftar **sebelum** collider platform +
  `processCallback` tolak-kill saat peluru nimpa musuh + `manualEnemyHits` (sweep anti-tunnel) tiap frame;
  `hitEnemy` di-guard active (idempotent, dua jalur tak double-count). §22.
- ❌ **Tombol sekunder = link underline** / UI tak terasa game → tiap tombol = tombol game (mono/border/shadow), dialog arcade. §20.
- 💡 Mau grafis "kaya"? animasi **frame-by-frame procedural** (banyak frame texture + `anims.create`/`play`), guard `anims.exists`. §19.
- 💡 Mau grafis **"game sungguhan"**? pakai **PNG sprite sheet** (APPENDIX P / [`sprite-sheet-assets.md`](sprite-sheet-assets.md)):
  TEPAT 5 sheet (player/enemy/environment/game-object/box-kepingan) + JSON per-kelompok (sel ≥80×80) +
  frame-map rect eksplisit + downscale ke key engine + **urutan upload baku** (slot `{{asset_image_N}}`
  dari urutan upload) + **fallback prosedural** wajib. Mekanisme upload host sudah ada.
