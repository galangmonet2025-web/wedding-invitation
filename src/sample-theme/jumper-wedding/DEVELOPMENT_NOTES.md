# Catatan Development — Tema Game Undangan (Jumper Wedding)

> Rangkuman permintaan user + hasil pengerjaan sesi ini, ditulis sebagai **catatan
> development yang bisa diterapkan ulang di tema game lain** (retromario, metalslug,
> spacewar, kicau-mania, dll — semua tema `src/sample-theme/<nama>/`).
>
> **Konteks:** tema game = 3 file (`index.html` + `index.css` + `index.js`) yang di-inject
> host (`ThemeWrapper`) ke undangan. Semua art **prosedural** (Phaser 3
> `graphics.generateTexture`, tanpa PNG/spritesheet). Domain bahasa Indonesia.
>
> Versi tema saat catatan ini dibuat: **v2.3.2**. Setiap batch perbaikan menaikkan
> chip `#jw-version` (lihat aturan "versi sinkron" di bawah).

---

## Daftar isi

1. [Ringkasan permintaan → hasil](#1-ringkasan-permintaan--hasil)
2. [Aturan reusable (WAJIB dicek di tema game lain)](#2-aturan-reusable-wajib-dicek-di-tema-game-lain)
3. [Detail teknis per perbaikan](#3-detail-teknis-per-perbaikan)
4. [Cara verifikasi (headless, karena screenshot blank)](#4-cara-verifikasi-headless-karena-screenshot-blank)
5. [Checklist saat membuat/mereview tema game baru](#5-checklist-saat-membuatmereview-tema-game-baru)

---

## 1. Ringkasan permintaan → hasil

| # | Permintaan user (verbatim/inti) | Akar masalah | Hasil |
|---|---|---|---|
| 1 | "Versi tema di preview `2.1.0`, di undangan `1.0.0`" | HTML hardcode versi lama; host **re-inject HTML SETELAH** JS `init()` timpa → string statis balik | Samakan literal versi di **HTML statis DAN JS** |
| 2 | "Di HP loncatannya seperti ketiup angin geser ke kanan; di PC aman" | **Tilt (deviceorientation) auto-aktif** di Android; HP tak pernah dipegang rata → `gamma≠0` mendorong tiap frame | Tilt **opt-in saja** + kalibrasi netral + dead-zone |
| 3 | "Versi game ditaruh bawah tengah aja" | Badge versi di `top:6px` | CSS `.jw-version` → `bottom` (celah joystick–HIT) |
| 4 | "Background kurang oke — riset ulang, buat indah, bikin tamu WAH" | Backdrop flat 3-stop, datar | Riset + rebuild: sky 6-band, dither, **god rays**, aurora, bokeh, **focal landmark** |
| 5 | "Gunung tiba-tiba muncul menutupi matahari" | **Ridge (landmass full-height) pakai tiling parallax** → wrap muncul dari atas menutupi matahari | Ridge `noTile` (clamp, hanya tenggelam ke bawah, tak pernah menutupi langit) |
| 6 | "Kalo mau tembak di PC gimana? Panel kanan ga ada keterangan kontrol" | Desktop **sembunyikan** joystick+HIT, tak ada petunjuk keyboard | Blok keterangan kontrol keyboard (`←→`/`A`/`D`, `SPACE`) di panel kanan |
| 7 | "Upgrade object² (platform, monster, karakter) biar lebih bagus" | Art sudah OK tapi bisa lebih premium | Riset + upgrade: **SS 2×→3×**, helper shading global, rim/specular/contact-shadow |
| 8 | "Game selesai, platform ilang, tetap loncat + pesan terpelanting" | Win Stage-5: zona **tak di-rebuild**, couple jatuh tanpa platform → respawn "terpelanting" loop | State terminal `RUN.finished` (matikan fisika + finale pose) |
| 9 | "Undangan dibuka → game di-PAUSE; ditutup → play lagi + halangan hilang dulu" | Game jalan terus di belakang overlay undangan | `scene.pause()/resume()` via state `_invView` + **clean resume** (buang musuh dekat + grace) |
| 10 | "Kepingan disebar asal? Baru Stage 1 udah kekumpul semua" | Ambang `(i+1)*6` → kepingan terakhir cuma 66 coin, padahal 1 stage ~90 coin | Model budget per-grup, scale ke coin-per-stage (core Stage 1–3, bonus Stage 4–5) |
| 11 | "Ada string base64 di section hero" | `background-image:url('{{...}}')` single-quote + `data-var`/`data-src` redundan → nilai foto bocor jadi teks | Pola aman `url(&quot;{{...}}&quot;)` (contek tema netflix/lake-como), buang `data-var`/`data-src` |
| 12 | "Closing harus munculkan list sosial media, kondisional (muncul jika datanya ada)" | Section closing belum punya blok sosmed | Blok `{{#if flag_use_*_webconfig}}` (IG/TikTok/YouTube/WhatsApp), contek tema lain |
| 13 | "Button KEMBALI ke game dibuat sticky di bawah, full-width" | Tombol di `position:absolute top/right` (pojok) | CSS → sticky bar bawah full-width + `padding-bottom` scroll biar section terakhir tak ketutup |

---

## 2. Aturan reusable (WAJIB dicek di tema game lain)

Ini inti dokumen — pola yang **berlaku umum** untuk semua tema game di project ini.

### R1 — Versi badge harus identik di HTML statis & JS
Host me-**re-inject HTML** setelah JS jalan. Kalau versi hanya di-set via JS (`init()`),
maka pada undangan live string **statis di HTML** akan muncul kembali → beda dengan preview.
**Solusi:** tulis versi yang sama di dua tempat: elemen statis HTML **dan** literal JS yang
menimpanya. Naikkan keduanya bersamaan tiap batch.
> Berlaku umum untuk **teks/atribut apa pun yang di-set JS lalu bisa "kembali" saat re-inject.**

### R2 — `deviceorientation` (tilt) TAK BOLEH auto-apply
HP tak pernah dipegang rata → `gamma`/`beta` selalu ≠ 0 → input konstan (drift "ketiup angin").
**Solusi:** tilt **opt-in** (di belakang tombol), + **kalibrasi netral** (bacaan pertama = 0-referensi)
+ **dead-zone** (±4°) → steer dari **delta** terhadap netral, bukan nilai absolut.
> Berlaku umum untuk **semua kontrol berbasis sensor** (tilt/gyro).

### R3 — Kalau kontrol on-screen disembunyikan di suatu mode, WAJIB ada petunjuk pengganti
Desktop sering menyembunyikan joystick/tombol touch (`.jw-touch{display:none}`) karena main
pakai keyboard — tapi kalau tak ada hint keyboard, user bingung (mis. cara menembak).
**Solusi:** tampilkan **keyboard hint** (kbd caps) di UI mode itu.
> Berlaku umum: **setiap mode input harus punya petunjuknya sendiri.**

### R4 — Elemen background full-height (langit/landmass) JANGAN pakai tiling parallax
Tiling vertikal (wrap `[-BH, BH]`) benar untuk **objek kecil** (awan, petal, bokeh).
Tapi **landmass yang digambar dari puncak turun ke `BH`** kalau di-tile akan **wrap muncul
dari atas** menutupi matahari/langit. **Solusi:** landmass horizon = **clamp non-wrap**
(mulai di posisi tergambar, hanya **tenggelam ke bawah** saat kamera naik, `y = max(0, climbed*factor)`).
> Berlaku umum: **objek layar-penuh screen-fixed harus clamp, bukan tile.**

### R5 — Begitu game TAMAT, masuk **state terminal** yang mematikan fisika player
Kalau `update()` tetap jalan sementara zona kosong (platform sudah hilang), player jatuh →
respawn "terpelanting" loop tanpa henti. **Solusi:** flag `RUN.finished` (di state awal `freshRun`);
`update()` early-return saat finished → velocity 0 + gravity off + skip fall/respawn (cukup
`stepCamera`+`stepAnims` biar backdrop tetap hidup). Set flag di fungsi menang + panggil
"finale settle" (bawa player ke tengah view, pose merayakan, hover).
> Berlaku umum: **setiap game harus punya terminal state; jangan biarkan loop main jalan di dunia kosong.**

### R6 — Pause/Resume scene saat overlay undangan menutupi layar
User mengharapkan game **membeku** saat baca undangan. **Solusi:** `SCENE.scene.pause()`/`.resume()`
(halt update+fisika+tween+timer). Drive dari **state tunggal** `_invView` ('reveal'|'piece'|null)
biar hand-off antar-view **tak flicker** (open-function claim view DULU sebelum close sibling).
Guard resume: jangan resume kalau `RUN.finished` atau masih ada view terbuka.
**Clean resume:** buang musuh dalam radius dekat player + **grace invuln** singkat, biar tak
resume langsung kena hit.
> **AMAN**: `scene.pause()` tak mematikan UI karena semua listener kita **document-level (delegated)**,
> bukan Phaser input. (Lihat R8.)
> Berlaku umum: **overlay konten (undangan/menu) yang menutupi layar → pause scene.**

### R7 — Ekonomi kepingan harus di-scale ke **coin-per-stage**, bukan konstanta kecil
Kalau ambang `(i+1)*k` dengan `k` kecil, semua kepingan bisa kebuka di 1 stage.
Hitung **yield koin realistis per stage** (di jumper: ~90/stage easy) lalu sebar ambang:
core pieces across Stage 1–3, bonus pieces across Stage 4–5. **Skala ke `PIECE_COUNT`**
(jumlah section tiap tenant beda). Pastikan ambang **monoton naik** (unlock in-order aman).
> Berlaku umum: **gate progresif (kepingan/level/unlock) harus dikalibrasi ke laju perolehan
> resource nyata, bukan angka ajaib; dan harus scale ke jumlah konten variabel.**

### R8 — Semua listener UI di `document` (delegated), bukan node langsung
(Aturan lama, ditegaskan ulang karena jadi fondasi R6.) Host **swap semua node** saat re-inject
→ listener yang di-bind ke node hilang. Bind **satu handler delegated di `document`** keyed by id.
Ini juga yang membuat pause scene aman (UI tetap jalan).

### R9 — Canvas game full-frame WAJIB `pointer-events:none` kecuali saat main
(Aturan lama, tetap relevan.) Canvas Phaser mengisi frame → menelan tap overlay walau z-index benar.
Toggle `is-playing` (`pointer-events:auto`) hanya saat benar-benar gameplay.

### R10 — Foto background pakai `url(&quot;{{var}}&quot;)`, JANGAN single-quote, jangan `data-var`/`data-src` di elemen bg
Nilai foto tenant (data-URL base64 / imageProxy) bisa panjang/berkarakter aneh. `url('{{var}}')`
(single-quote) atau `data-src="{{var}}"` bisa bikin nilai **bocor jadi teks** di halaman. **Solusi:**
pola yang dipakai tema yang sudah jalan (netflix/lake-como): `style="background-image:url(&quot;{{var}}&quot;)"`
(double-quote di-escape HTML). Elemen background TIDAK perlu `data-var`/`data-src` (inert, cuma sumber bug).
> Berlaku umum: **semua elemen `background-image` dari variabel foto** pakai pola `&quot;` ini.

### R11 — Blok sosial media & elemen opsional pakai `{{#if flag}}` (kondisional), contek tema lain
Section (terutama **closing/footer**) sebaiknya menampilkan sosmed **hanya jika datanya ada**.
Variabel standar project: `flag_use_instagram_webconfig`/`url_instagram_webconfig`,
`flag_use_tiktok_webconfig`, `flag_use_youtube_webconfig`, `flag_use_whatsapp_webconfig`.
Bungkus tiap ikon dengan `{{#if flag_use_..._webconfig}}...{{/if}}` (templateParser menghormati `{{#if}}`;
`'TRUE'`/`'FALSE'`/`'0'` string dari Google Sheets sudah ditangani). Wrapper row diberi
`:empty{display:none}` + tak ada background/border sendiri, jadi kalau semua flag off = kolaps rapi.
> Berlaku umum: **fitur/section opsional (sosmed, streaming, gift, gallery) harus kondisional
> `{{#if}}`, bukan selalu tampil.**

### R12 — Tombol "kembali ke game" (atau CTA utama di reveal) = sticky bar bawah full-width
Tombol pojok kecil mudah kelewat. Untuk aksi utama pada overlay panjang yang bisa di-scroll,
pakai **sticky bar full-width di bawah** (`position:absolute; left/right:0; bottom:0; width:100%`)
+ hormati `env(safe-area-inset-bottom)` + beri **`padding-bottom` pada container scroll** agar
konten terakhir tidak tertutup bar.
> Berlaku umum: **CTA utama pada overlay panjang = sticky bottom bar, bukan tombol pojok.**

---

## 3. Detail teknis per perbaikan

### v2.2.0 — Backdrop "WOW" (riset)
Prinsip riset: **menang di CAHAYA & KEDALAMAN, bukan detail** (medium prosedural, no PNG).
- **Sky 6-band** warm-horizon→cool-crown (blush di sepertiga bawah) — asimetris = atmosfer nyata.
- **Anti-banding dither**: ~320 dot 1–2px deterministik (`hash`) bias mid-zone → hilangkan Mach-band.
- **God rays**: 8 segitiga tipis dari matahari, **ADD blend** (`setBlendMode(1)`), breathe (alpha+spread sin) di `stepCamera`.
- **Halo** sun/moon (stacked circle ADD). **Aurora** malam (3 pita ADD gradient shifting).
- **Bokeh** orb (stacked-circle ADD; jauh=besar/pudar, dekat=kecil/terang).
- **Focal landmark** = "chapel isle" melayang, warna **atmospheric-perspective** (plum tint haze, BUKAN hitam),
  jendela hangat emissive ADD, **rim-light** tepi hadap-matahari; parallax factor kecil + **bob** lambat.

### v2.2.1 — Fix ridge menutupi matahari (lihat R4)
Ridge diberi `noTile:true`; handler di `stepCamera`: `p.obj.y = max(0, (_camY0 - camScrollY)*factor*0.5)`.
`_camY0` = baseline camScrollY per-zona. God rays dikecilkan (len `BH*0.9`, alpha .06).

### v2.2.2 — Keterangan kontrol keyboard PC (lihat R3)
Blok `.jw-side-keys` di panel kanan (dalam `@media (min-width:980px)`, dekat `.jw-touch{display:none}`).
Binding aktual: `←→`/`A`/`D` = geser, `SPACE` = tembak. Howto in-game juga sebut HP=HIT, PC=SPASI.

### v2.3.0 — Upgrade visual object (riset)
Prinsip riset "beautiful procedural 2D objects":
- **Supersample 3× (dulu 2×)** — jump kualitas termurah; tiap kurva di-AA saat downscale.
  Body fisika `*SS` & couple `BASE_SCALE=1/SS` ikut otomatis (asalkan konsisten pakai `_SS`).
- **Satu arah cahaya global TOP-LEFT** di semua objek.
- **Shadow COOL (blend ke indigo) / light WARM (ke cream)** — bukan sekadar gelapin base (muddy).
- **Contact shadow** di bawah objek (anti "floating sticker").
- **Rim-light crescent** di sisi shadow + **specular hot-spot** 2-part di curved/glossy.
- **Mata dual-catchlight** (bikin "hidup").

Helper baru di `buildTextures`: `warm()/cool()/contactShadow()/formShade()/rimArc()/specular()/eye()`.
Diterapkan ke groom, slime, bee, ring (metallic gloss), heart (candy). **INVARIAN**: setiap
scale-tween pada objek ber-tekstur-SS× harus relatif ke base-scale-nya (capture `obj.scaleX` dulu).

### v2.3.1 — Pause/resume saat undangan dibuka (lihat R6)
State `_invView` + `setInvView(v)` → `pauseGame()/resumeGame()`. Fungsi open **claim view dulu**
lalu close sibling (anti-flicker). `clearThreatsAndGrace()`: buang musuh radius 130px (poof) +
invuln 1200ms + kalau jatuh vy→`BOUNCE*0.5`.

### v2.3.2 — Fix ekonomi kepingan (lihat R7)
`COINS_PER_STAGE=90, CORE_STAGES=3, BONUS_STAGES=2`. CORE spread ~0.5→2.6 stage; BONUS mulai
setelah budget core (270) spread ke 2 stage. Hasil 8core+3bonus: 69…234 (core), 330/390/450 (bonus).
Monoton naik, ≤2 kepingan reachable di Stage 1 (dulu 11). Reunion Stage 3 tetap force-reveal sisa core.
localStorage lama TIDAK di-migrate (jangan cabut yang sudah didapat).

---

## 4. Cara verifikasi (headless, karena screenshot blank)

Screenshot headless **blank** di mesin ini → verifikasi visual harus lewat **Theme Editor**
(paste 3 file, buka preview) atau tanya user. Tapi logika bisa diverifikasi headless:

```bash
# 1. Syntax
node --check src/sample-theme/<nama>/index.js

# 2. Bake tekstur isolated (stub graphics recorder): cek 0 non-finite arg + semua key-tex ada
#    (ekstrak fungsi buildTextures via new Function, jalankan dgn Proxy graphics)

# 3. Wiring assertion via regex pada source (mis. openReveal panggil pauseGame, dst)

# 4. Balance/logic harness (mis. threshold monoton + ≤2 kepingan di Stage 1 utk semua bentuk core×bonus)
```
Pola harness di atas dipakai di sesi ini dan semuanya PASS sebelum diserahkan.
**User menolak `npm run build`/`tsc` untuk verifikasi** (lambat) — cukup `node --check` + harness.

---

## 5. Checklist saat membuat/mereview tema game baru

Cek ini terhadap **setiap tema game** (aturan reusable di §2):

- [ ] **R1** Versi badge sama di HTML statis & JS.
- [ ] **R2** Tilt/gyro opt-in + kalibrasi netral + dead-zone (tak auto-apply).
- [ ] **R3** Tiap mode input (touch/keyboard) punya petunjuk kontrolnya sendiri.
- [ ] **R4** Background full-height (langit/landmass) clamp non-wrap; tiling hanya utk objek kecil.
- [ ] **R5** Ada terminal state (`finished`) yang mematikan fisika saat game tamat.
- [ ] **R6** Overlay konten menutupi layar → `scene.pause()`; resume bersih + guard finished.
- [ ] **R7** Ekonomi unlock di-scale ke yield resource per-stage + scale ke jumlah konten variabel + monoton.
- [ ] **R8** Semua listener UI delegated di `document` (survive re-inject).
- [ ] **R9** Canvas full-frame `pointer-events:none` kecuali saat main.
- [ ] **R10** Foto background pakai `url(&quot;{{var}}&quot;)` (bukan single-quote / `data-src`).
- [ ] **R11** Sosmed & fitur opsional kondisional `{{#if flag_use_*_webconfig}}`.
- [ ] **R12** CTA utama pada reveal = sticky bottom bar full-width (bukan tombol pojok).
- [ ] **Host contract** (lihat `theme-host-contract`): cleanup `window.__<x>Cleanup`, ID host verbatim,
      music mirror (jangan putar backsound tenant sendiri), `{{#if}}` bungkus `<section>`, de-ID
      `#inv-source` saat clone (hindari duplicate host ID → submit RSVP/ucapan kosong).
- [ ] Verifikasi headless (§4) PASS sebelum serah ke user untuk cek visual di Theme Editor.

---

*Referensi memory terkait: `jumper-wedding-theme`, `theme-host-contract`,
`game-theme-clone-invsource-duplicate-id`, `game-theme-bible-vs-reality`,
`rsvp-status-value-casing-bug`, `theme-intro-reexec-bug`.*
