---
name: clone-skill
description: >
  Generate "Game Design Bible" untuk tema undangan pernikahan berbasis GAME (Phaser 3) di
  platform ini. Gunakan setiap kali user minta membuat tema undangan yang dibungkus game
  (mis. "/clone-skill buatkan tema undangan berdasarkan game mario", "buatkan tema
  game …", "undangan berbasis game"). OUTPUT skill ini = satu file Bible super-detail
  (lebih detail dari MARIO_LEVEL_GENERATION_BIBLE.md, tapi engine Phaser 3) di
  src/sample-theme/<nama>/<NAMA>_BIBLE.md. Bible itulah yang DIPAKAI TERPISAH nanti untuk
  men-generate 3 file tema (index.html + index.css + index.js). Bible memuat: desain game per
  arketipe (pattern library, entity encyclopedia, biome, boss, validator, generation algorithm)
  + appendix teknis Phaser 3 + appendix integrasi undangan (kepingan, cheat, celebration,
  layout 2-kolom, host-wiring), patuh kontrak host (ThemeWrapper) & daftar variabel dinamis.
---

# Skill: Generator "Game Design Bible" untuk Tema Undangan Berbasis Game (Phaser 3)

Kamu adalah **Lead Game Developer + Technical Director** untuk fitur "Game Wedding Theme"
di SaaS undangan digital ini.

> ## 🎯 APA OUTPUT SKILL INI?
>
> **Skill ini MENGHASILKAN sebuah FILE BIBLE**, bukan langsung 3 file tema. Alurnya 2 tahap:
>
> ```
> /clone-skill "buatkan tema undangan berdasarkan game mario"
>          │
>          ▼  ◀── TAHAP 1 (skill ini): generate Game Design Bible super-detail
>   src/sample-theme/<nama>/<NAMA>_BIBLE.md
>          │
>          ▼  ◀── TAHAP 2 (panggilan terpisah nanti): Bible dipakai untuk generate
>   index.html + index.css + index.js
> ```
>
> **Skill ini berhenti di TAHAP 1.** Tugasmu: riset arketipe game yang diminta, lalu **tulis
> Bible** yang lengkap & actionable. Bible itu yang jadi sumber kebenaran saat 3 file tema
> dibuat nanti. Jangan menulis `index.html`/`css`/`js` di skill ini kecuali user eksplisit
> minta lanjut ke tahap 2.

> **PRINSIP NOMOR SATU (yang harus tercermin di Bible) — GAME DULU, BARU UNDANGAN.**
> Game harus benar-benar enak dimainkan: 60fps, kontrol responsif, ada tujuan, ada
> tantangan, ada musuh/rintangan, ada feedback (juice). Undangan adalah **hadiah yang
> ditemukan** dengan bermain. Bible tidak dianggap selesai sampai tiap kepingan undangan punya
> tempat logis di dalam game.

> **PRINSIP "NO DEAD AIR" — game tidak boleh HAMBAR.** Game arcade asli (Metal Slug dll) sangat
> **padat**: event tiap 2–4 detik, layar tak pernah kosong > ~2 detik, ≥3–4 musuh/layar, pijakan
> & dekorasi & reward terus mengalir. Bible **WAJIB** menegakkan **lantai kepadatan terukur +
> validator "no dead air"** (segmen sepi = regenerate), berlaku semua arketipe. Gejala gagal yang
> harus dicegah: *"musuh kadang ada kadang nggak", "pijakan untuk naik kurang", "dekorasi
> environment sepi", "ada area kosong"*. Sumber lengkap (beat-sheet + angka + validator):
> [`reference/density-engine.md`](reference/density-engine.md).

> **TARGET KUALITAS BIBLE — LEBIH DETAIL dari `MARIO_LEVEL_GENERATION_BIBLE.md` (6033 baris),
> tapi engine Phaser 3.** Kerangka, target kedalaman, & daftar appendix wajib ada di
> [`reference/bible-template.md`](reference/bible-template.md). Aturannya harus **ber-angka**
> (ambil dari [`reference/game-feel-and-level-design.md`](reference/game-feel-and-level-design.md))
> dan teknisnya **Phaser 3.80.1 yang benar** (ambil dari
> [`reference/phaser-technical-foundation.md`](reference/phaser-technical-foundation.md)).

---

## 0. SEBELUM MENULIS BIBLE — baca & siapkan ini dulu

> Catatan: poin-poin di bawah (variabel, kontrak host, binding) adalah **fakta domain yang
> harus MASUK ke dalam Bible** (terutama APPENDIX W–Z). Kamu menulisnya ke Bible, bukan
> langsung ke kode.

1. **Daftar variabel dinamis (WAJIB akurat).** Sumber kebenaran satu-satunya adalah tab
   **"Variabel Tema"** di [`ThemeGuideModal.tsx`](src/features/admin/components/ThemeGuideModal.tsx).
   Ringkasannya ada di [`reference/dynamic-variables.md`](reference/dynamic-variables.md) skill ini.
   **Jangan mengarang nama variabel.** Variabel yang tidak dikenal → diganti string kosong
   oleh parser, jadi salah ketik = data hilang diam-diam.
2. **Kontrak host (WAJIB dipatuhi).** Bagaimana tema disuntik & di-intercept oleh host ada di
   [`reference/host-contract.md`](reference/host-contract.md). ID-ID hardcoded (mis.
   `btn-show-qr`, `btn-toggle-music`, `bg-music`, `btn-submit-ucapan`, `wish-name`,
   `wish-message`, RSVP ids) **harus verbatim**.
3. **Cara binding bekerja.** Host menjalankan [`templateParser.ts`](src/utils/templateParser.ts)
   **SEBELUM** JS tema jalan. `{{var}}` sudah jadi teks/URL biasa di DOM. **Tidak ada
   substitusi `data-var` saat runtime** — JS tema harus membaca **teks yang sudah ter-render**,
   bukan atribut. `{{#if}}`/`{{#unless}}`/`{{#each}}` juga sudah di-resolve.
   - **Cara baca yang teruji (golden example retromario):** beri tiap elemen yang perlu dibaca
     JS **dua hal** — atribut `data-var="<key>"` (kunci pencarian, konvensi internal tema, BUKAN
     diproses parser) **dan** teks `{{<key>}}` (diisi parser). Lalu helper:
     ```js
     function val(k, fb) {
       var el = document.querySelector('[data-var="' + k + '"]');
       var v = el ? (el.textContent || '').trim() : '';
       if (!v || v.indexOf('{{') === 0) return fb || '';   // var tak ter-resolve → fallback
       return v;
     }
     ```
     Contoh: `<span data-var="wedding_date">{{wedding_date}}</span>` → `val('wedding_date')`.
   - **`#inv-source` adalah pola alternatif, bukan keharusan.** Golden example **tidak** memakai
     container terpisah `#inv-source`; ia membaca langsung dari section undangan asli
     (`<section data-info="<key>">`) yang sekaligus jadi isi saat di-reveal. Untuk tema Phaser
     baru kamu boleh memilih pola `#inv-source` (lebih bersih dipisah) **atau** pola section-asli
     — yang penting **binding hidup hanya sekali** dan **undangan benar-benar tampil** saat
     di-reveal. Apa pun polanya, baca via `val()`/teks rendered.
4. **Kerangka Bible (WAJIB diikuti).** Struktur, target kedalaman, & daftar appendix wajib ada
   di [`reference/bible-template.md`](reference/bible-template.md). Bible harus **lebih detail
   dari Bible Mario** & **spesifik ke arketipe** — bukan generik.
5. **Bahan baku Bible:** angka game-design dari
   [`reference/game-feel-and-level-design.md`](reference/game-feel-and-level-design.md), teknis
   Phaser 3 dari [`reference/phaser-technical-foundation.md`](reference/phaser-technical-foundation.md),
   arketipe dari [`reference/game-archetypes.md`](reference/game-archetypes.md), kontrak host dari
   [`reference/host-contract.md`](reference/host-contract.md).
6. **Bible existing sebagai contoh kedalaman** (BUKAN untuk disalin):
   `src/sample-theme/retromario/MARIO_LEVEL_GENERATION_BIBLE.md` (paling lengkap, canvas),
   `src/sample-theme/game-phaser/CONTRA-DEVELOPMENT-PHARSER-BIBLE.md` (Phaser 3 — paling relevan
   sebagai contoh struktur engine), `src/sample-theme/retrocontra/CONTRA_LEVEL_BIBLE.md`. Pelajari
   *seberapa dalam* mereka, lalu lampaui — dengan konten arketipe yang diminta user.

---

## 0.5 LANGKAH MENG-GENERATE BIBLE (alur kerja skill ini)

1. **Tentukan arketipe & nama.** Dari prompt user (mis. "berdasarkan game mario" → platformer).
   Tetapkan `<nama>` folder (kebab-case, mis. `retromario-wedding`) & `<NAMA>_BIBLE.md`.
2. **RISET arketipe + BEAT-SHEET kepadatan (jangan skip).** Pakai WebSearch bila perlu untuk
   memverifikasi mekanik kanonik (fisika lompat Mario, wave Contra, lock-key Zelda, dst.). **WAJIB
   juga**: susun **beat-sheet** game arcade aslinya (posisi → event: musuh/item/kendaraan/POW/
   terrain/boss) untuk meng-ekstrak **lantai kepadatan** — ini yang mencegah game "hambar" (musuh
   kadang ada kadang nggak, pijakan/dekorasi kurang). Contoh beat-sheet + angka lantai + validator
   "no dead air" ada di [`reference/density-engine.md`](reference/density-engine.md). Tujuannya
   Bible terasa **otentik & PADAT**, bukan "kira-kira". Lihat panduan kedalaman per-arketipe di
   [`reference/bible-template.md`](reference/bible-template.md).
3. **Tulis Bible** mengikuti kerangka `bible-template.md`: §0–§12 (inti game design) + APPENDIX
   A–F (kedalaman ala Mario) + APPENDIX T/S/**P** (teknis Phaser 3 + aset PNG sprite sheet) +
   APPENDIX W–Z (integrasi undangan). Semua aturan **ber-angka**, contoh kode **Phaser 3**, ada
   Golden Rule per bagian. **APPENDIX P** (grafis "game sungguhan" via PNG sprite sheet — 5 sheet +
   JSON per-kelompok + frame-map + urutan upload) WAJIB ada bila game punya karakter/objek visual;
   sumber: [`reference/sprite-sheet-assets.md`](reference/sprite-sheet-assets.md).
4. **Self-check** dengan checklist di §9 sebelum menyatakan selesai.
5. **Berhenti & laporkan.** Sampaikan ringkasan isi Bible + path-nya. **Jangan lanjut** generate
   3 file tema kecuali user eksplisit minta tahap 2.

---

> **§1–§8 di bawah = materi domain & aturan inti** yang harus kamu **tuangkan ke dalam Bible**
> (tersebar di §0–§12 + APPENDIX W–Z sesuai `bible-template.md`). Baca sebagai bahan, lalu
> tulis ulang & perdalam di Bible dengan angka + contoh Phaser 3 + konteks arketipe terpilih.

## 1. TUJUAN PEMBUATAN GAME (the "why")

Undangan online konvensional = scroll pasif. Tema ini mengubahnya menjadi **pengalaman
interaktif**: tamu *memainkan* undangan dan *menemukan* isinya.

Tujuan terukur:

- **Interaksi nyata.** Tamu mengendalikan karakter, punya quest jelas: **kumpulkan semua
  kepingan informasi undangan**.
- **Informasi bertahap, bukan sekaligus.** Tiap section undangan disembunyikan dalam **item
  khusus** yang tersebar di stage. Menyelesaikan stage **tidak otomatis** memberi kepingan —
  tamu harus **menemukan & mengambil** item itu.
- **Inklusif.** Tamu yang tidak mau main tetap bisa membuka undangan lengkap lewat **Cheat
  Mode** (lihat §6).
- **Mobile-first.** Target utama smartphone; di PC = **2 kolom**: cover/welcome di kiri
  (sempit) + frame mobile interaktif di kanan (lebih lebar) — bukan 3 kolom (§7).
- **Tetap undangan fungsional.** RSVP, ucapan, amplop, QR, musik — semua tetap jalan via
  kontrak host.

---

## 2. LIBRARY & FONDASI TEKNIS

- **Game engine: Phaser 3** (versi terkunci `3.80.1`). Host sudah meng-CDN-load Phaser
  (`window.Phaser`). Tema **tetap wajib** menyediakan fallback `ensurePhaser()` yang
  meng-load Phaser sendiri bila `window.Phaser` belum ada, lalu boot setelah siap.
- **Single-file architecture.** Tema = 3 file: `index.html`, `index.css`, `index.js`.
  Tidak ada bundler, tidak ada import module. Semua JS tema dibungkus host dalam IIFE.
  Pola "monolithic game" mengikuti `CONTRA-DEVELOPMENT-PHARSER-BIBLE.md` §268 (single file,
  CDN asset only) — lihat [`reference/phaser-architecture.md`](reference/phaser-architecture.md).
- **Resolusi internal & scale.** Pilih resolusi tetap (mis. 540×960 untuk potret mobile,
  atau 960×540 landscape) dan **JANGAN** baca `this.scale.width/height` di `create()` saat
  pakai `Phaser.Scale.RESIZE` — bisa `0`. Ukur parent via `getBoundingClientRect()` dan
  pass `width`/`height` tetap ke config (bug yang sudah pernah terjadi — lihat memory
  `game-phaser-theme`).
- **Aset:** procedural (digambar via `graphics.generateTexture`) lebih disukai karena
  reliabel & tanpa CORS. Sprite eksternal hanya dari CDN yang terbukti CORS-ok; selalu
  fallback ke procedural bila gagal — **jangan pernah blank**.
- **Audio game (SFX) boleh** dimainkan tema. **Backsound undangan TIDAK** — itu milik host
  (lihat §8).

---

## 3. JENIS GAME — pakai game klasik yang sudah ada (riset dulu)

Game yang dibuat **bukan genre baru**. Pilih satu **arketipe game klasik** yang sudah puluhan
tahun ada, sehingga referensi gameplay-nya melimpah dan well-understood. Sebelum coding,
**lakukan riset** ke arketipe terpilih: mekanik inti, level design, feel, kontrol, musuh,
progression. Tulis ringkasannya sebagai "Game Bible" di folder tema (lihat contoh
`MARIO_LEVEL_GENERATION_BIBLE.md`, `CONTRA_LEVEL_BIBLE.md`, `CONTRA-DEVELOPMENT-PHARSER-BIBLE.md`).

Kandidat arketipe (pilih sesuai mood pasangan / brief) — detail tiap arketipe ada di
[`reference/game-archetypes.md`](reference/game-archetypes.md):

| Arketipe | Referensi klasik | Cocok untuk | Mekanik koleksi |
|---|---|---|---|
| **Run-and-gun / platformer-shooter** | Contra, Metal Slug | energik, "perjuangan menuju pelaminan" | tembak POD 💌 / sentuh item |
| **Platformer eksplorasi** | Super Mario Bros | ceria, family-friendly | ambil koin/peti berisi kepingan |
| **Top-down adventure** | Zelda klasik, Pokémon | romantis, "petualangan berdua" | buka peti / temui NPC |
| **Endless runner** | Temple Run, Subway Surfers | ringan, cepat, kasual | pungut item saat lari |
| **Match-3 / puzzle** | Candy Crush, Bejeweled | manis, santai, non-reflex | selesaikan papan → kepingan |
| **Maze / collector** | Pac-Man | retro, simpel, nostalgia | makan semua → kepingan stage |
| **Brick breaker** | Arkanoid / Breakout | retro, satu layar | hancurkan blok spesial |

**Aturan riset:** untuk arketipe terpilih, gunakan WebSearch bila perlu untuk memverifikasi
mekanik kanonik (mis. fisika lompat Mario, sistem senjata Contra, aturan match Candy Crush),
lalu **dokumentasikan** keputusan desain. Jangan berhenti di "kira-kira begini" — game harus
terasa **otentik** terhadap arketipe-nya.

---

## 4. PEMETAAN: SECTION UNDANGAN → KEPINGAN GAME

Undangan punya **hingga 11 section** (urutan & isi persis seperti brief user). **Tidak semua
undangan punya semua section** — banyak yang dibungkus flag. Indikator & jumlah kepingan harus
**dinamis mengikuti section yang benar-benar ada**.

| # | Section (data-info) | Isi & variabel utama | Flag pembungkus (kalau ada) |
|---|---|---|---|
| 1 | `hero` | Nama (`groom_nickname`/`bride_nickname`), `wedding_date`, `quote`/`quote_by`, bg `photo_hero_cover` | selalu ada |
| 2 | `couple` | `groom_name`/`bride_name`, foto `photo_groom_photo`/`photo_bride_photo`, ortu `nama_bapak_*`/`nama_ibu_*`, sosmed `ig_*` | ortu: `flag_tampilkan_nama_orang_tua` · sosmed: `flag_tampilkan_sosial_media_mempelai` |
| 3 | `rsvp` | Countdown (`countdown_hari/jam/menit/detik`), form RSVP | selalu ada |
| 4 | `schedule` | Akad (`tanggal_akad`,`jam_akad`,`nama_lokasi_akad`,`keterangan_lokasi_akad`,`akad_map`) + Resepsi (`*_resepsi`) | resepsi terpisah: `flag_lokasi_akad_dan_resepsi_berbeda` |
| 5 | `streaming` | `link_live_streaming` | `is_fitur_live_streaming` |
| 6 | `story` | `{{#each timeline_kisah}}` → `this.tanggal/judul/deskripsi` | `flag_pakai_timeline_kisah` |
| 7 | `gallery` | `{{#each galleries}}` → `this.url` | `has_gallery` |
| 8 | `happiness` | Ajakan IG: `sample_story_1..3` + overlay `frame_balasan_instagram`, CTA `link_balasan_instagram` | `flag_pakai_additional_feature_story_balasan_instagram` |
| 9 | `wishes` | Form ucapan + list `{{#each wishes}}` → `this.guest_name/guest_message/guest_comment_time` | selalu ada |
| 10 | `gift` | `bank_1`/`rek_1`/`nama_rek_1` (+`_2`), QRIS `gambar_qris_rekening_1/2`, alamat `alamat_lokasi_kirim_hadiah_offline` | `tampilkan_amplop_online`, `flag_pakai_2_rekening`, `flag_pakai_qris_rekening_1/2`, `flag_kirim_hadiah_offline` |
| 11 | `closing` | `kalimat_penutup`, branding `site_name`/`site_url` | selalu ada |

**Mekanisme kepingan (the core loop):**

1. **Satu sumber data tersembunyi.** Tulis SEMUA section sekali saja di satu container
   tersembunyi (mis. `#inv-source`), pakai `{{vars}}` dan `data-info="<key>"` per `<section>`.
   Ini satu-satunya tempat binding hidup.
2. **Saat boot**, JS tema men-scan `#inv-source` untuk **section mana yang benar-benar ada**
   (yang dibungkus flag false akan absen karena parser sudah menghapusnya). Daftar inilah yang
   menentukan **jumlah kepingan & jumlah ikon indikator** — bukan angka hardcoded.
3. **Sebar item kepingan** di stage. Tiap stage memegang ≥1 kepingan. Boleh tidak merata
   (mis. 10 section disebar di stage 1–4 dari 8 stage). Item kepingan = **objek game khusus
   yang berbeda dari power-up biasa** (mis. amplop 💌 melayang yang harus ditembak/diambil).
4. **Mengambil item → `unlockInfo(key)`**: kepingan tercatat, ikon indikator section itu
   **menyala**, muncul toast, simpan progress ke `localStorage`.
5. **Indikator section** (§5) & **tombol Buka Undangan** (§5) update tiap unlock.
6. **Saat semua kepingan terkumpul** → tawarkan "Buka Undangan" / klimaks (mis. selamatkan
   mempelai) → reveal section penuh.

> **PENTING:** modal kepingan & reveal penuh **meng-clone** dari `#inv-source` (atau
> menampilkannya), supaya `{{vars}}` cukup ada **satu kali**. Jangan duplikasi binding.

**Aturan mekanik koleksi yang teruji (APPENDIX I Bible — berlaku semua arketipe):**

- **Distribusi bertahap via quota per-stage + auto-scale.** Sebar kepingan lewat quota tetap
  per stage (mis. `[3,3,2,2,0,0,0,0]`, sum = jumlah section) supaya tamu menemukan undangan
  **gradual** (bukan semua di stage 1, bukan menumpuk di akhir). Saat section dikurangi flag,
  **redistribusi proporsional** ke shape yang sama — **jangan hardcode** total 10.
- **Pemetaan stage→kepingan DETERMINISTIK dari nomor stage** (slice kontigu `INFOS`), bukan
  dari counter berjalan. Kalau pakai counter global, cheat stage-jump / replay → kepingan
  ganda atau desync.
- **JANGAN auto-open modal saat kepingan diambil.** Mengambil kepingan hanya **menyalakan
  ikon** + toast + SFX + partikel (+ animasi terbang ke inventory). Tamu memilih sendiri kapan
  klik ikon untuk membaca. Auto-open memutus gameplay & terasa memaksa.
- **Slot pola sisa → filler skor**, jangan dibiarkan kosong (mis. coin trail dengan footprint
  sama), agar level tetap padat walau kepingannya sedikit.

---

## 5. INDIKATOR KEPINGAN & TOMBOL BUKA UNDANGAN

- **Indikator = N ikon/tombol** di HUD, N = jumlah section riil. Default tampak *disabled*
  (redup, tidak bisa diklik) karena kepingan belum diambil.
- **Saat kepingan section-i diambil**, ikon-i menyala & jadi clickable. Klik → buka
  **dialog/pop-up** berisi konten section itu (clone dari `#inv-source[data-info=key]`).
- **Tombol "Buka Undangan" (`#cw-view-btn` / sejenis)**: terkunci sampai **semua** kepingan
  terkumpul (atau cheat aktif). Saat terbuka & diklik → tampilkan **seluruh** section berurutan
  (full reveal) di container scroll mobile.
- Pemetaan ikon → section harus **dinamis** dari hasil scan §4.2 (urutan & label dari
  `data-info` + judul section). Jangan hardcode 10/11.

---

## 6. CHEAT MODE (bypass + buff)

Satu tombol toggle (mis. `★`). Saat **ON**:

**Efek ke undangan:**
- Semua kepingan **langsung ter-koleksi penuh** → semua ikon indikator menyala.
- Tombol **Buka Undangan langsung aktif**.

**Efek ke game (tetap bisa main, lebih bebas):**
- Karakter **kebal** terhadap semua rintangan/peluru/musuh (invincible).
- **Bebas pilih tingkat kesulitan**.
- **Akses semua stage** tanpa harus menyelesaikan stage sebelumnya (stage-select terbuka).

Cheat harus bisa **di-toggle balik** (mengembalikan tantangan). Yang **wajib** di-persist
adalah **hasil koleksi kepingan** (`unlocked`), bukan mode cheat-nya — jadi tamu yang sudah
membuka undangan via cheat tetap bisa melihatnya.

**Persist flag cheat = keputusan sadar (default: JANGAN).** Mem-persist `cheat` berarti device
itu **selamanya "mode mudah"** — buruk untuk satu HP yang dipakai banyak tamu. Tidak
mem-persist (default & pola retromario) berarti reload mengembalikan game ke **mode jujur**,
tapi kepingan yang sudah dibuka tetap kebuka. Pilih sadar sesuai apakah device dipakai banyak
tamu; kalau ragu, **jangan persist**. Sediakan reset progress sebagai tombol terpisah dengan
konfirmasi (overlay sendiri, bukan `confirm()` native). **Reset WAJIB PENUH** (bug yang sudah
dibayar): wipe localStorage (incl. **kesulitan** kembali default) + `GAME.destroy(true)` (**stage
reset**) + reset cheat/run + **kembali ke COVER untuk pilih kesulitan lagi** — bukan sekadar hapus
kepingan lalu lanjut main. Lihat [`reference/layout-camera-hardwon.md`](reference/layout-camera-hardwon.md) §21.

> Implementasi acuan: `retromario` — lihat **APPENDIX F (CHEAT SYSTEM)** di
> `src/sample-theme/retromario/MARIO_LEVEL_GENERATION_BIBLE.md` untuk pola lengkap (satu flag
> `player.cheat`, skor dibekukan saat cheat, audit cheat-bypass blind spot).

---

## 6.5 ATURAN DESAIN LEVEL (game design — berlaku untuk semua arketipe)

Selain "game harus enak", ada aturan keadilan penempatan yang sudah terbukti di Bible Mario
(§24, APPENDIX E.3) dan berlaku universal:

- **Powerup ofensif harus punya "usage window".** Powerup yang memberi kemampuan menyerang
  (mis. tembak/invincible) **tidak boleh** ditaruh di segmen terakhir yang sudah tak ada
  musuh, atau tepat sebelum Goal tanpa tantangan di antaranya — kemampuannya jadi sia-sia.
  Aturan: tiap powerup ofensif **wajib ada ≥1 kesempatan pakai** (≥1 musuh/segmen berbahaya)
  sebelum Goal. Kalau tidak ada → ganti dengan **reward pasif** (poin/nyawa). *Useful > Reachable.*
- **Kepingan undangan ≠ powerup ofensif.** Item kepingan murni naratif/koleksi, **tidak**
  memberi buff gameplay. Ini menjaga loop koleksi terpisah dari balancing powerup.
- **Section inti di stage awal.** `hero`, `schedule`, `rsvp` (info acara terpenting) sebaiknya
  muncul di **stage-stage awal**, supaya tamu yang berhenti di tengah tetap dapat info pokok.
  Jangan tumpuk section penting di akhir.

---

## 6.6 MOMEN KLIMAKS & PERAYAAN (celebration — puncak emosional undangan)

Saat tamu mencapai tujuan, game harus "meledak meriah" lalu memberi tahu **apa yang baru saja
diraih**. Tanpa ini, menamatkan game terasa hambar (acuan: APPENDIX G Bible —
`announceAllCollected()` / `bossFinale()`).

- **DUA pemicu terpisah, keduanya wajib ditangani:**
  1. **Kepingan informasi TERAKHIR didapat** → undangan kini **lengkap & bisa dibuka** (tanpa
     harus tamat game). Dialog: "semua kepingan terkumpul → undangan siap dibuka".
  2. **Game selesai sampai stage terakhir** (boss/flag akhir) → cerita game **tamat**
     ("happily ever after"). Dialog happy-ending: rangkum skor/stage + ajakan buka undangan.
  > Keduanya bisa terjadi di **urutan mana pun** (kepingan dulu, atau bersamaan di stage akhir).
  > Desain harus tahan kedua urutan.
- **Beat meriah ±5 detik SEBELUM dialog** — beri momen "bernapas": screen flash + fireworks/
  partikel + **SFX kemenangan** (audio game, **bukan** backsound tenant) + toast. Baru dialog
  muncul (`setTimeout` ~4.5s). Jangan munculkan dialog seketika.
- **Dialog wajib menyebut pencapaian konkret + CTA "Buka Undangan"**, pakai **nama mempelai
  dinamis** (`val('groom_nickname')` dst.), jangan hardcode. Perayaan tanpa jalan ke undangan
  = momen sia-sia.
- **Guard sekali-tampil (di-persist).** Beri flag (mis. `announcedAll`, `completed`) supaya
  perayaan **tidak terulang** saat reload / re-inject JS tema. (Catatan: flag guard ini
  **di-persist**, beda dari `player.cheat` yang default tidak — lihat §6.)
- **Saat menang, pastikan SEMUA kepingan ter-unlock** → undangan tak pernah terkunci dari
  detail asli pernikahan.
- **⚠️ Boss arena WAJIB WALK-IN (bug yang sudah dibayar).** Stage boss JANGAN langsung lock kamera
  ke arena + spawn boss aktif (player jadi off-screen, boss muncul tanpa pemain). Sediakan koridor
  approach; boss dibuat **inactive** + simpan `arenaX`; kamera dikunci & boss di-aktifkan **saat
  `player.x ≥ arenaX`**, bukan saat arena dibangun. Reset flag boss tiap sektor.
  ([`reference/layout-camera-hardwon.md`](reference/layout-camera-hardwon.md) §5.)
- **⚠️ Boss WAJIB punya HP BAR & benar-benar BISA KALAH (bug yang sudah dibayar 2×).** Tampilkan
  **HP bar KECIL di ATAS boss** (world-space, ikut posisi) yang turun tiap hit; **TTK ~10–40s**;
  feedback tiap hit. **Hit-detection MANUAL tiap frame** (jangan andalkan overlap fisika pada boss
  bobbing/immovable; **jangan `setActive(false)`** → matikan body → tak kena tembak; pakai alpha).
  **Peluru boss aim ke player** + spread (bukan flat konstan — pemain bingung lawannya). **Verifikasi
  di harness**: peluru di posisi boss → `manualBossHits` → hp turun; `hitBoss`→`defeatBoss`. (§11/§16.)
- **⚠️ Undangan = GAME RAMAH (bug yang sudah dibayar).** Default **tanpa nyawa/game-over**; kena =
  knockback+i-frame; jatuh jurang = respawn ke titik **aman** (mundur, bukan awal stage/hazard/musuh).
  Crouch: resize body **on-state-change** saja (anti-judder). UI: tiap tombol **terasa game** (no
  link underline). Grafis kaya: **animasi frame-by-frame procedural**. (§17/§18/§19/§20.)

---

## 7. LAYOUT, KAMERA & KONTROL — mobile-first + desktop 2-kolom (TEPAT 2, bukan 3)

> **Empat aturan ber-angka di bawah lahir dari bug nyata `metalslug-wedding`.** Detail lengkap +
> diagram ASCII + snippet CSS/JS ada di
> [`reference/layout-camera-hardwon.md`](reference/layout-camera-hardwon.md). Bible **wajib**
> menuangkan keempatnya (§7/§9 + APPENDIX S/T/Z) sebagai rules ber-angka, bukan kalimat normatif.

**(a) Mobile (target utama):** container rasio potret. Saat undangan dibuka, section scroll
vertikal di dalam frame.

**(b) GROUND vs controller (ber-angka):** tombol sentuh menutupi karakter bila tanah terlalu
rendah. **`GROUND_Y = BH − (isTouch ? 200 : 150)`** (zona kontrol ±120px → tanah ≥180px dari bawah
pada touch; clearance karakter ≥80px). `isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0`.

**(c) KAMERA side-scroller (ber-angka):** game maju-ke-kanan → **dorong player ke kiri ~40% layar**
agar pandangan depan luas: `setFollowOffset(-Math.round(BW*0.40), -70)` + `setDeadzone(20,120)` +
`startFollow(p,true,0.14,0.14)`. **JANGAN** player di tengah (pandangan depan menyempit). Batas ~0.42
(lebih dari itu player mepet tepi kiri & musuh dari belakang tak terlihat).

**(d) HUD MAP (posisi icon-button & controller — sudah terbukti enak):**

```
  Frame mobile:
  ┌───────────────────────────────────────────┐
  │ ♥×3        SCORE 000200      SEKTOR 1 [N]  │ ← HUD info (atas, dilihat tak di-tap)
  │ [Wpn]                            3/11 💌   │ ← weapon kiri · progress kanan
  │ ┌───┐                              ┌─┬─┬─┐ │
  │ │★▦ │ ICON-BUTTON (KIRI-ATAS)      │💌♥✓│ │ ← indikator kepingan (KANAN-ATAS)
  │ │💌 │ ★cheat ▦stage 💌buka         └─┴─┴─┘ │
  │ │🎵⟲│ 🎵musik ⟲reset                       │
  │ └───┘            (area main)               │
  │         [karakter di atas tanah]           │
  │ ══════════════ tanah ══════════════════════│ ← GROUND_Y = BH-200 (touch)
  │  ╭───╮                          ┌────┐┌──┐ │
  │  │joy│ KIRI-BAWAH        KANAN→ │FIRE││JM│ │ ← kontrol sentuh (green zone)
  │  ╰───╯                          └────┘│P✦│ │
  └───────────────────────────────────────────┘
```
ICON-BUTTON **kiri-atas** · indikator kepingan **kanan-atas** · joystick **kiri-bawah** ·
FIRE/JMP/GRENADE **kanan-bawah**. Target sentuh ≥44px, spacing ≥8px, hormati `safe-area-inset`.

**(e) DESKTOP — TEPAT 2 kolom, frame game MENTOK KIRI + panel kanan = PURE undangan:**

```
  ┌──────────────┬────────────────────────────────┐
  │ FRAME GAME   │ PANEL UNDANGAN (kanan, PURE)    │
  │ (KIRI, 480px,│ • <canvas> couple bertema game  │
  │  dipatok)    │   (pria berjas + wanita bergaun)│
  │  = game +    │ • nama mempelai + tanggal       │
  │  undangan    │ • Akad / Resepsi + link MAP     │
  │  scroll —    │ • 💌 BUKA UNDANGAN LENGKAP       │
  │  SATU-SATUNYA│   (NO tombol game di kanan;      │
  │  interaktif  │    PRESS START/level/kontrol ada │
  │              │    di cover overlay DALAM frame) │
  └──────────────┴────────────────────────────────┘
   BENAR: frame mentok kiri · panel kanan PURE undangan · 2 kolom (bukan center, bukan 3)
```
CSS inti: `.gw-shell{justify-content:flex-start}` · `.gw-frame{order:1;flex:0 0 auto;width:480px}`
(mentok kiri) · `.gw-cover-side{order:2;flex:1}` (mengisi kanan). Satu breakpoint (`980px`); di
mobile **hanya frame** tampil; di desktop **kontrol sentuh disembunyikan** (pakai keyboard).

**Panel kanan = PURE undangan (tanpa tombol game):** sebuah **`<canvas>` (Canvas 2D, bukan Phaser)**
menggambar mempelai pria **berjas+dasi** & wanita **bergaun+kerudung+buket** di **scene bertema
game** (sky sunset, gunung, palem, sandbag, hati, banner "JUST MARRIED"); lalu nama mempelai +
tanggal, **Akad & Resepsi (waktu/tanggal/tempat/alamat + link map)** dibungkus `{{#if}}`, dan
**satu** tombol `💌 BUKA UNDANGAN LENGKAP`. PRESS START / pilih-kesulitan / petunjuk keyboard
**pindah ke cover overlay di dalam frame game**. Detail + kode canvas:
[`reference/layout-camera-hardwon.md`](reference/layout-camera-hardwon.md) §9.

> **⚠️ JANGAN:** (1) frame **tengah** (`justify-content:center`) → boros ruang; (2) **3 kolom**
> dekorasi identik; (3) panel kanan ada **tombol game** (PRESS START/level/kontrol) — itu milik
> cover overlay dalam frame; (4) canvas couple pakai Phaser (pakai Canvas 2D biasa).
>
> **Revisi arah:** versi lama SKILL menulis "cover kiri / frame kanan". **Yang BENAR sekarang =
> FRAME KIRI / PANEL UNDANGAN KANAN (pure, + canvas couple).** Yang **mutlak**: 2 kolom & satu
> area interaktif. (Golden example `retromario` menaruh frame kiri — sejalan.)

---

## 8. KONTRAK HOST — yang TIDAK boleh kamu langgar

Detail lengkap: [`reference/host-contract.md`](reference/host-contract.md). Inti:

- **JS tema di-inject ulang** tiap `jsBase`/`isOpened`/`htmlBase` berubah. Karena itu **WAJIB**
  daftarkan cleanup global (mis. `window.__gwCleanup`) dan panggil di awal IIFE untuk
  membongkar RAF loop / listener / `Phaser.Game` lama — kalau tidak, game menumpuk & bocor.
- **ID hardcoded host** (pakai verbatim, tanpa prefix): `btn-show-qr`, `btn-show-menu`,
  `btn-toggle-music`/`btn-music`, `bg-music`, `play-icon`/`pause-icon`,
  `btn-submit-ucapan`+`wish-name`+`wish-message`, RSVP `btn-submit-kehadiran`+
  `rsvp-status`/`rsvp-guests`/`rsvp-code`.
- **Musik:** tema **tidak boleh** `audio.play()` backsound tenant. Host yang memutar (hanya
  saat `isPlaying && isOpened`). Tema cuma boleh **klik `#btn-toggle-music`** dan **mirror**
  ikon. SFX game (Web Audio internal) bebas.
- **Lightbox:** kalau mau lightbox galeri sendiri, pakai class BERBEDA dari `.gallery-item`/
  `.lightbox-injection` supaya host tidak membajak klik.
- **Cover/Open:** boleh pakai pola `id="theme-cover"` + `id="main-content"` (host meng-handle
  visibility) **atau** kelola sendiri di dalam game — tapi tombol buka undangan / reveal harus
  konsisten dengan state host bila memakai ID host.

---

## 9. APA YANG HARUS TERDOKUMENTASI DI BIBLE (peta sprint → bagian Bible)

Bible harus mendokumentasikan **rencana build dari 0 sampai jadi**, sehingga tahap-2 (generate
3 file) tinggal mengikuti. Tiap "sprint" di bawah = materi yang ditulis ke bagian Bible yang
sesuai (lihat [`reference/bible-template.md`](reference/bible-template.md)). **Bible mendeskripsikan
& men-spec; ia tidak meng-implementasi** — kode jadi dibuat di tahap 2.

| Sprint (rencana build) | Ditulis ke bagian Bible |
|---|---|
| **0 — Setup & boot** Phaser aman (`ensurePhaser`, ukur parent, `showError`, anti ukuran-0) | §0, APPENDIX S/T |
| **1 — Core gameplay** player+state machine, fisika ber-angka, input abstraction, satu stage enak, loop order | §2, §4, §9, APPENDIX T |
| **2 — Tantangan** musuh+AI+pooling, nyawa/respawn/checkpoint, damage, juice (angka) | §5, §6, §10, §12, APPENDIX B |
| **3 — Progression** multi-stage, kesulitan sawtooth, power-up (relevance rule), klimaks/boss (selamatkan mempelai) | §3, §7, §8, APPENDIX C/D |
| **4 — Integrasi kepingan** pemetaan section→kepingan, scan section riil, quota+auto-scale, unlock+modal+reveal | APPENDIX W/X |
| **5 — Cheat & host** cheat penuh, wiring RSVP/ucapan/QR/musik, countdown, reset berkonfirmasi | APPENDIX Y/Z |
| **6 — Layout & polish** mobile + desktop 2-kolom (cover kiri/frame kanan), cleanup hook, optimasi | §9, APPENDIX S/T/Z |
| **6.5 — Aset PNG (opsi grafis "game sungguhan")** 5 sprite sheet + JSON per-kelompok + frame-map slice + urutan upload + fallback prosedural | §10, **APPENDIX P** |
| **7 — Validasi** validator engine + generation algorithm + checklist | APPENDIX E/F |

**Checklist Bible "selesai" (self-check sebelum melapor):**

- [ ] Mengikuti kerangka `bible-template.md` — semua §0–§12 + APPENDIX A–F + T/S + W–Z ada.
- [ ] **Lebih detail & lebih spesifik-arketipe** dari sekadar aturan umum (pattern library ≥20
      pola, entity encyclopedia lengkap, biome/stage library, boss phase system).
- [ ] **Density "NO DEAD AIR" ditegakkan** — ada beat-sheet referensi arcade asli + lantai
      kepadatan ber-angka (musuh/layar, pijakan/segmen, prop/layar, max-dead-air, reward cadence) +
      **validator density yang memaksa regen segmen sepi** (`density-engine.md`). Bukan sekadar
      "musuh secukupnya".
- [ ] Aturan **ber-angka** (ambil dari `game-feel-and-level-design.md`), bukan kata sifat.
- [ ] Contoh kode **Phaser 3.80.1 yang benar** (cek API ke `phaser-technical-foundation.md` —
      mis. partikel API 3.60+, `game.destroy(true)`, `blocked.down`).
- [ ] **APPENDIX P (aset PNG)** ada bila game punya karakter/objek visual: **TEPAT 5 sprite sheet**
      (player/enemy/environment/game-object/box-kepingan) + **5 JSON generate** (sel ≥80×80) +
      **spec file `ASSET.md`** (brief pembuat aset: aturan umum + 5 tabel kebutuhan + 5 blok JSON,
      mirror `*-assets.json`) + **frame-map rect eksplisit** (bukan grid seragam) + downscale ke key
      engine lama + **urutan upload baku** (`{{asset_image_N}}` dari urutan upload) + **fallback
      prosedural** (`sprite-sheet-assets.md`).
- [ ] Nama variabel undangan **terverifikasi** ke `dynamic-variables.md` (tak ada karangan).
- [ ] APPENDIX W–Z lengkap: kepingan reachable & dinamis, cheat bypass, celebration 2-pemicu,
      layout 2-kolom, mirror musik idempotent, `{{#if}}` membungkus `<section>`, ID host verbatim.
- [ ] Tiap bagian besar punya **Golden Rule** satu-baris.
- [ ] Disimpan di `src/sample-theme/<nama>/<NAMA>_BIBLE.md`.

---

## 10. CATATAN VERIFIKASI (untuk tahap 2 nanti — dokumentasikan di Bible)

Bible harus mencantumkan cara verifikasi 3 file di tahap 2, karena ada jebakan di mesin ini:

- **Screenshot headless Chrome TIDAK bekerja di mesin ini** — selalu blank, jangan dipercaya.
- **Cara verifikasi yang benar:** paste 3 file ke **Theme Editor** host
  ([`ThemeEditorPage.tsx`](src/features/admin/components/ThemeEditorPage.tsx)) lalu buka
  preview, **atau** minta user mencobanya.
- **Logika game/loop** boleh diuji via **harness Node headless** yang menjalankan loop asli
  dengan RAF di-stub (bukan memanggil fungsi step langsung).
- Selalu sediakan `showError()` on-screen supaya "Phaser gagal load" bisa dibedakan dari
  "game ada bug logic" (keduanya sama-sama blank canvas).
- Waspada **cheat-mode bypass** sebagai sumber bug berulang (kepingan/kebal bocor ke mode
  normal) — lihat memory `retromario-debugging`.

---

## 11. ANTI-PATTERN (jangan lakukan)

**Saat menulis Bible:**
- ❌ **Game "hambar"** (musuh kadang ada kadang nggak · pijakan/elevasi kurang · dekorasi sepi ·
  ada area kosong) → tegakkan **lantai kepadatan + validator "NO DEAD AIR"** + beat-sheet referensi
  ([`reference/density-engine.md`](reference/density-engine.md)). Spawn musuh **jangan murni
  `Math.random()`** tanpa jaminan minimum per-segmen.
- ❌ Bible tipis / generik (bisa ditempel ke game apa pun) → harus dalam & spesifik-arketipe.
- ❌ Aturan tanpa angka ("secukupnya", "jangan terlalu") → ganti dengan bilangan terukur.
- ❌ Contoh teknis pakai canvas/RAF manual / `getContext('2d')` → harus Phaser 3.
- ❌ API Phaser usang (mis. `particles().createEmitter()` yang dihapus 3.60) → pakai API 3.80.1.
- ❌ Melewatkan salah satu APPENDIX integrasi undangan (W–Z).
- ❌ Langsung menulis `index.html`/`css`/`js` di skill ini (itu tahap 2, bukan output skill ini).

**Aturan domain yang harus DITEGAKKAN Bible (jadi rules di dalamnya):**
- ❌ Mengarang nama variabel atau fitur undangan yang tidak ada di daftar resmi.
- ❌ Menyalin `data-info`/binding ke banyak tempat (duplikasi `{{vars}}`). Satu sumber saja.
- ❌ `audio.play()` backsound tenant dari tema. Itu milik host.
- ❌ Hardcode jumlah section/kepingan (mis. selalu 10). Harus dinamis dari section riil.
- ❌ Lupa cleanup hook → RAF/listener/Phaser menumpuk tiap re-inject.
- ❌ Baca `this.scale.width/height` di `create()` dengan `Scale.RESIZE` (bisa 0 → objek
  off-screen → blank).
- ❌ Memangkas fitur game demi cepat. Game dulu, baru undangan.
- ❌ Percaya screenshot headless di mesin ini.

**Layout/kamera/kontrol/grafis/boss (bug `metalslug-wedding` — jangan diulang; §6.6/§7 + [`reference/layout-camera-hardwon.md`](reference/layout-camera-hardwon.md)):**
- ❌ Kamera side-scroll menaruh player di **tengah** → `setFollowOffset(-~0.40·BW, -70)` (player ke kiri ⅖, batas ~0.42). §1
- ❌ Tanah terlalu rendah → karakter tertutup tombol sentuh → `GROUND_Y = BH−(isTouch?200:150)`. §2
- ❌ Icon-button & indikator salah/terbalik → icon-button **kiri-atas**, indikator **kanan-atas**,
  joystick **kiri-bawah**, FIRE/JMP **kanan-bawah**. §3
- ❌ Layout PC **center / 3 kolom / ada tombol game di kanan** → frame **mentok KIRI** (480px) +
  panel kanan **pure undangan** (canvas couple jas/gaun + akad/resepsi + map, no tombol game). §4/§9
- ❌ **Boss arena lock kamera + spawn boss seketika** (player off-screen) → WAJIB **walk-in**:
  aktivasi saat `player.x ≥ arenaX`, reset flag tiap sektor. §5
- ❌ **Sprite flat single-color** ("testing") → shade base+highlight+shadow+outline; siluet unik. §6
- ❌ **Backdrop kosong/sama tiap sektor** → sky palet per-biome + ≥3 lapis parallax + props. §7
- ❌ **Stage-select tak bisa set kesulitan** → gabung picker kesulitan + grid sektor (pola retromario). §8
- ❌ **Toast/notifikasi di dasar layar** (ketutupan kontrol) → atas-tengah ~18–35% dari atas, 3–8s, warna+ikon. §10
- ❌ **Boss tanpa HP bar / tak bisa kalah** (terasa immortal) → HP bar + TTK 20–40s + feedback tiap hit; verifikasi damage di harness. §11
- ❌ **Sprite statis** semua keadaan → animasi per-state (idle/run/jump/fall/prone/shoot-8-arah/hurt/dead), player & musuh. §12
- ❌ **Level datar/kosong** → elevation+cover+pijakan tiap 6–10 tile+explosive+≥5 tipe musuh; pacing puncak-lembah. §13
- ❌ **Dialog pilih auto-apply on-click** → klik=tandai pending, tombol **OK**=commit, ada Batal. §14
- ❌ **Spec environment/UX "kira-kira"** → riset arketipe + UX, ber-angka & spesifik-stage. §15
- ❌ **Boss andalkan overlap fisika** (bobbing/`setActive(false)` → tak kena tembak) → sembunyi via alpha + **cek hit MANUAL**; HP bar kecil di atas boss; peluru boss **aim ke player**. §16
- ❌ **Sistem nyawa/game-over/balik awal stage** (terlalu sulit utk undangan) → tanpa nyawa; kena=knockback+i-frame; jatuh=respawn ke titik **aman** (bukan hazard/musuh/awal). §17
- ❌ **Resize body crouch tiap frame** (judder) → resize on-state-change saja, anchor bawah. §18
- ❌ **Reset sebagian** (hapus kepingan tapi pertahankan kesulitan/sektor) → reset **PENUH**: wipe storage (incl. kesulitan) + `GAME.destroy(true)` (stage reset) + kembali ke cover. §21
- ❌ **Peluru nembus musuh di atas balok/platform** (collider platform makan peluru dulu / tunneling) → overlap enemies didaftar **sebelum** collider platform + `processCallback` tolak-kill saat nimpa musuh + `manualEnemyHits` sweep anti-tunnel; `hitEnemy` guard active (idempotent). §22
- ❌ **Peluru membunuh musuh yang BELUM masuk layar** (musuh di-spawn aktif saat level-load di world-X jauh) → spawn **relatif-kamera**: musuh off-screen = data inert (list `triggerX`), di-instantiate DI TEPI saat `cam.scrollX+BW ≥ triggerX`; hitbox hanya saat aktif; peluru despawn di tepi viewport; hit hanya pada musuh aktif. §23
- ❌ **Tombol sekunder = link underline / UI tak terasa game** → tiap tombol = tombol game (mono/border/shadow), dialog arcade. §20
- 💡 Grafis "kaya": animasi **frame-by-frame procedural** (banyak frame texture + `anims.create`/`play`, guard `anims.exists`). §19

---

## File pendukung skill ini

**Untuk menulis Bible:**
- [`reference/bible-template.md`](reference/bible-template.md) — **kerangka Bible yang digenerate**
  + target kedalaman + daftar appendix wajib + panduan per-arketipe. **Mulai dari sini.**
- [`reference/game-feel-and-level-design.md`](reference/game-feel-and-level-design.md) — prinsip
  game-design **terukur** (juice, pacing, boss, mobile, onboarding) per arketipe.
- [`reference/density-engine.md`](reference/density-engine.md) — **"NO DEAD AIR" (anti-hambar)**:
  beat-sheet reverse-engineer Metal Slug Mission 1, lantai kepadatan ber-angka (musuh/pijakan/
  dekorasi/reward per layar, max-dead-air), **validator density wajib** (regen segmen sepi),
  pemetaan ke semua arketipe. **Baca ini setiap kali bikin game agar tidak hambar.**
- [`reference/phaser-technical-foundation.md`](reference/phaser-technical-foundation.md) — fakta
  **Phaser 3.80.1** terverifikasi (boot, physics, pooling, partikel API baru, cleanup).
- [`reference/sprite-sheet-assets.md`](reference/sprite-sheet-assets.md) — **APPENDIX P: aset PNG
  (sprite sheet)** untuk grafis "game sungguhan": turunkan kebutuhan sprite dari gameplay → **5
  kelompok/sheet** (player/enemy/environment/game-object/box-kepingan) → **JSON generate per-kelompok**
  (sel ≥80×80) → engine **men-slice 1 gambar utuh** via frame-map + downscale + anim + fallback
  prosedural → **urutan upload baku** (slot `{{asset_image_N}}` dari urutan upload) + panduan prompt
  image-gen. Mekanisme upload host **sudah ada** (sesuaikan). Contoh kerja: `metalslug-wedding`.

**Fakta domain (masuk ke APPENDIX W–Z Bible):**
- [`reference/dynamic-variables.md`](reference/dynamic-variables.md) — daftar lengkap variabel & flag.
- [`reference/host-contract.md`](reference/host-contract.md) — kontrak host, ID wajib, kerangka HTML, wiring.
- [`reference/game-archetypes.md`](reference/game-archetypes.md) — detail tiap arketipe game klasik + cara koleksi.
- [`reference/phaser-architecture.md`](reference/phaser-architecture.md) — pola single-file Phaser 3 + boot aman.
- [`reference/layout-camera-hardwon.md`](reference/layout-camera-hardwon.md) — **23 aturan ber-angka +
  diagram ASCII + kode Phaser**: §1 kamera follow-offset · §2 ground vs controller · §3 HUD map ·
  §4 layout PC frame-kiri/panel-kanan · §5 boss walk-in · §6 grafis shading · §7 backdrop per-biome
  parallax · §8 stage-select+kesulitan · §9 panel PC pure-undangan+canvas couple · §10 toast atas-tengah ·
  §11 boss HP bar + bisa kalah · §12 animasi per-state · §13 level design kaya · §14 dialog pilih
  tombol OK · §15 riset UX+environment · §16 boss hit manual + aim-ke-player · §17 undangan ramah
  (tanpa nyawa, respawn aman) · §18 crouch resize on-state-change · §19 animasi frame-by-frame
  procedural · §20 semua UI terasa game · §21 reset penuh · §22 peluru vs musuh di atas balok
  (anti-tembus + sweep anti-tunnel) · §23 spawn musuh relatif-kamera (musuh off-screen tak bisa
  kena tembak). Bug nyata yang sudah dibayar (6 putaran `metalslug-wedding`);
  masuk ke §3/§4/§5/§6.6/§7/§8/§9/§10 + APPENDIX A/C/D/S/T/Z Bible.
