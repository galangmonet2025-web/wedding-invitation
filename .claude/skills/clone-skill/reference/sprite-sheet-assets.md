# sprite-sheet-assets.md — APPENDIX P: Aset PNG (Sprite Sheet) untuk grafis "game sungguhan"

> **Kenapa appendix ini ada.** Grafis prosedural (Phaser `graphics.generateTexture`) reliabel &
> tanpa CORS, tapi terbatas: bentuknya "kotak-kotak shading". Untuk hasil yang terlihat seperti
> **game arcade sungguhan**, jauh lebih mudah memakai **file PNG sebagai sprite** karakter & objek.
> Appendix ini mengajari Bible **men-spec kebutuhan sprite, mengelompokkannya jadi 5 sprite sheet,
> membuat JSON generate per-kelompok, urutan upload, & cara `index.js` me-slice sheet** — dengan
> tetap menyediakan **fallback prosedural** (jangan pernah blank).
>
> **Pola ini SUDAH TERBUKTI** di `src/sample-theme/metalslug-wedding/` (player + enemy/boss +
> object sheet). Mekanisme upload-aset host **sudah ada** — kamu tinggal menyesuaikan, bukan
> membangun dari nol. Lihat contoh kerja: `assets/object-sprite-sheet.png` +
> `assets/object-frame-map.json` + tabel `OBJECT_SHEET`/`ENEMY_SHEET` di `index.js`.

> **GOLDEN RULE APPENDIX P:** *Satu kelompok = satu sprite sheet = satu slot upload.* PNG dibuat di
> luar engine; engine **men-slice satu gambar utuh** memakai frame-map terverifikasi, **men-downscale**
> tiap sel ke ukuran tekstur engine, lalu mem-bake ke key lama → **semua kode create/tile/scale/hitbox
> yang ada tetap jalan tanpa diubah**. Slot kosong / gambar gagal → **fallback prosedural**.

---

## P.0 — Mekanisme host (FAKTA, jangan dikarang)

Cara aset PNG masuk ke tema (terverifikasi di [`ThemeEditorPage.tsx`](src/features/admin/pages/ThemeEditorPage.tsx)):

1. **Upload per gambar** di Theme Editor → tiap gambar dapat `media_code` **berurutan per tipe**:
   `image_1`, `image_2`, `image_3`, … Nomor di-**derive dari URUTAN list** (upload order; drag-reorder
   me-renumber ulang). Jadi **urutan upload = sumber kebenaran** slot mana yang dipakai sheet mana.
2. Tiap aset jadi variabel template **`{{asset_image_<N>}}`** (mis. `{{asset_image_15}}`) yang
   di-resolve parser jadi **URL/base64 gambar** sebelum JS tema jalan (sama seperti `{{var}}` lain).
3. Tema membaca URL itu lewat elemen ber-atribut (mis. `data-asset="enemy_sheet"` berisi
   `{{asset_image_15}}`), lalu `index.js` me-**load** gambar itu (`scene.load.image` / `Image()` +
   `textures.addImage`) dan **men-slice** sendiri jadi banyak frame.

> **Konsekuensi penting (WAJIB ditulis di Bible):** karena slot dinomori dari urutan upload, Bible
> **WAJIB menetapkan urutan upload eksplisit** untuk ke-5 sheet (lihat P.5). Salah urut = sheet
> ke-slot yang salah = grafis kacau/blank. Slot mana yang dipakai harus **dibaca dari `data-asset`
> di HTML**, dan nomor `image_N` di HTML harus cocok dengan urutan upload yang Bible perintahkan.

---

## P.1 — LANGKAH 1: Tentukan kebutuhan sprite dari GAMEPLAY (jangan menebak)

Sebelum mengelompokkan, **turunkan daftar sprite dari mekanik yang sudah ditulis di §2–§8 + APPENDIX
A–D Bible**. Untuk tiap entity/objek yang muncul di gameplay, tanyakan: *state visual apa saja yang
benar-benar dirender engine?* Tiap state = ≥1 frame.

Sumber kebutuhan (telusuri Bible sendiri):
- **Player state machine** (§2 / APPENDIX B): idle, run, jump-up, fall/jump-side, jump-down,
  crouch, hurt, dead, + pose tembak per-arah bila run-and-gun. → tiap state 1+ frame.
- **Tiap tipe musuh + boss** (APPENDIX B/D): walk/idle, aim/telegraph, fire, hurt, die/wreck;
  boss tambah idle×2, telegraph, fire, enraged, defeated. → siklus animasi nyata.
- **Objek game** (APPENDIX C/X): peluru player/musuh, roket, granat, ledakan/efek, item spesial,
  power-up, partikel (spark/heart).
- **Environment** (APPENDIX C): tile tanah (seamless), platform melayang, plafon, hazard (duri/api),
  dekorasi parallax (pohon, semak, awan, gunung, bendera berkibar), struktur (sangkar, gapura).
- **Box kepingan undangan** (APPENDIX W/X): wujud item kepingan (amplop 💌 / peti / POW), penanda,
  dan bila perlu sprite "couple" yang diselamatkan.

> **Aturan:** kebutuhan sprite **harus 1-lawan-1 dengan tekstur engine yang sudah dirancang** di
> APPENDIX B–D. Kalau Bible menulis "musuh `range` punya state aim & fire", maka sheet `range`
> WAJIB punya frame `aim` & `fire`. Jangan menambah/mengurangi state yang tak ada di game logic.

---

## P.2 — LANGKAH 2: Kelompokkan jadi TEPAT 5 sprite sheet

Sprite dikelompokkan ke **5 kelompok** (= 5 file PNG = 5 slot upload). **Pengelompokan ini wajib**,
biar generator & urutan upload deterministik:

| # | Kelompok | Isi | Tekstur engine khas |
|---|----------|-----|---------------------|
| 1 | **player** | semua frame karakter pemain (idle, run×N, jump-up/side/down, crouch, hurt, dead, static) | `t_player_*` |
| 2 | **enemy** | semua karakter lawan: monster/rush, human enemy/range, turret, drone, tank, **boss** | `t_e_*`, `t_turret`, `t_drone`, `t_tank`, `t_boss` |
| 3 | **environment** | pijakan tanah (tileable), platform/plafon mengapung, hazard terrain, dekorasi (palm, bush, sandbag, flag, cloud, mountain, hill), struktur (cage, arch) | `t_ground`, `t_plat`, `t_spike`, `t_palm`, `t_arch`, … |
| 4 | **game-object** | efek ledakan, peluru (player/enemy), roket, granat, api, partikel (spark/heart), item spesial/power-up | `t_bullet`, `t_ebullet`, `t_rocket`, `t_nade`, `t_flame`, `t_spark`, `t_heart` |
| 5 | **box-kepingan** | wujud "kotak kepingan informasi undangan": amplop/peti/POW kepingan, penanda, sprite couple yang diselamatkan | `t_amplop`, `t_crate`, `t_pow`, `t_couple_caged` |

> **Tepat 5, tidak digabung.** (Brief user.) Walau contoh `metalslug-wedding` lama menggabung
> object+environment+kepingan jadi satu "object sheet", **Bible baru WAJIB memisah jadi 5** supaya
> tiap kelompok punya slot upload sendiri yang jelas. Boleh ada kelompok kosong bila arketipe tak
> memakainya (mis. brick-breaker tanpa enemy sheet) — tulis "(kosong / tetap prosedural)" eksplisit.

**Tata-letak DALAM tiap sheet:**
- Frame **satu entity** disusun **horizontal kiri→kanan** (frame 0 paling kiri).
- **Entity berbeda di baris berbeda** (per-ROW), seperti `enemy-sprite-sheet.png` metalslug
  (6 baris = 6 musuh). Untuk kelompok dengan banyak item kecil (game-object), boleh tiap item
  satu baris dengan frame-frame-nya horizontal.
- Boleh ada padding/margin tepi tipis (mis. mulai x=14, y per-baris) — yang penting **frame-map
  mencatat rect tiap frame EKSPLISIT** (lihat P.4). Frame **boleh beda lebar** (pose tembak/hancur
  lebih lebar); jangan asumsikan grid seragam — itu menabrak frame tetangga (bug "boss dobel").

---

## P.3 — LANGKAH 3: JSON generate per-kelompok (1 kelompok = 1 JSON)

Untuk **tiap** dari 5 kelompok, Bible men-spec **satu file JSON** sebagai brief untuk meng-generate
PNG sheet-nya. Skema tiap entri (samakan persis):

```json
[
  {
    "kelompok": "enemy",
    "name": "enemy_range.png",
    "deskripsi": "Penembak ungu (#6a4a9c) bersenapan. Diam membidik lalu menembak lurus. 5 frame: idle (senapan turun ~45°), aim (senapan horizontal, badan menegang), fire (recoil + kilatan moncong), hurt (tersentak merah), die (tumbang). Hadap KANAN, kaki di baris bawah sel.",
    "orderNumber": 2,
    "frameWidth": 96,
    "frameHeight": 152
  }
]
```

Field WAJIB tiap entri:
- **`kelompok`** — salah satu dari 5 (`player`/`enemy`/`environment`/`game-object`/`box-kepingan`).
- **`name`** — nama file PNG (huruf kecil, `.png`), mis. `enemy_range.png`.
- **`deskripsi`** — deskripsi visual + **rincian tiap frame** (apa beda frame 0/1/2…) + arah hadap
  + posisi pivot/kaki. Cukup jelas agar bisa dipakai sebagai prompt image-gen (lihat P.6).
- **`orderNumber`** — nomor urut sprite/baris **di dalam sheet** (0/1/2… atau 1-based konsisten).
- **`frameWidth`** (px, **min 80**) — lebar tiap frame (sel) di sheet.
- **`frameHeight`** (px, **min 80**) — tinggi tiap frame (sel) di sheet.

> **Aturan ukuran ber-angka (WAJIB):**
> - **Minimum 80×80 px per sel** (brief user) — biar detail tidak pecah. Untuk objek yang
>   tampil kecil di engine (peluru 12×5, spark 7×7), sel sheet tetap **≥80×80** lalu engine
>   **men-downscale** ke ukuran tampil. Sel besar → tajam saat di-scale.
> - **Skala ~2× ukuran tekstur engine** sebagai panduan default (mis. tekstur engine 30×42 →
>   sel sheet 60×84; tapi naikkan ke ≥80 bila <80). Engine `setDisplaySize`/`setScale` balik ke
>   ukuran logis lama → **semua angka dunia (hitbox, spawn-y, kamera) tidak berubah**.
> - **Semua frame satu entity = ukuran sel SAMA** (kecuali memang sengaja beda-lebar; lalu tiap
>   frame punya rect sendiri di frame-map). Beda ukuran tak tercatat = sprite "lompat" posisinya.
> - **Hadap KANAN** untuk semua; engine flip horizontal saat ke kiri (jangan bikin versi kiri).
> - **Pivot/kaki** entity darat di baris paling bawah sel; entity terbang (drone) di tengah sel.

Susun JSON terurut `orderNumber`. Sertakan ke-5 JSON di Bible (atau sebagai file `*-assets.json`
terpisah di folder tema saat tahap 2).

---

## P.4 — LANGKAH 4: Engine men-slice sheet (1 gambar utuh → banyak tekstur)

PNG **tidak dipotong jadi banyak file**. Diupload **utuh**; `index.js` me-slice memakai **frame-map**.
Pola terbukti (dari `OBJECT_SHEET`/`ENEMY_SHEET` di metalslug `index.js`):

1. **Frame-map** = koordinat rect tiap frame, EKSPLISIT (karena frame bisa beda lebar). Simpan
   sebagai tabel data-driven di `index.js` (+ opsional file `assets/<kelompok>-frame-map.json`).
   Bentuk per-ROW yang sudah terbukti:
   ```js
   // satu baris = satu entity; rect tiap frame eksplisit (x,w) pada top/ch baris itu
   { key: 't_e_range', top: 135, ch: 110, dh: 38, hb: { w: 18, h: 34 },
     frames: ['idle','aim','fire','hurt','die'],
     rects: [[6,82],[102,89],[199,118],[323,71],[421,95]] }
   ```
   atau bentuk per-frame [x,y,w,h] (untuk object sheet bercampur):
   ```js
   { key: 't_amplop', ew: 28, eh: 20, anim: 'o_amplop', rate: 3,
     frames: [[14,156,56,40],[80,156,56,40]] }   // [x,y,w,h] cell di atlas
   ```
   - `key` = **tekstur engine yang digantikan** (key lama yang sudah dipakai create/tile/scale).
   - `ew`/`eh` atau `dh` = **ukuran tampil** (= ukuran tekstur prosedural lama) → engine downscale
     ke sini → **angka dunia tak berubah**.
   - `hb` = hitbox dunia (samakan dengan feel prosedural lama).
   - `anim`+`rate` = bangun anim Phaser untuk entity multi-frame (amplop/barrel/flame/flag/walk).

2. **Slice + bake:** untuk tiap frame, potong dari sheet (`ctx.drawImage` ke canvas kecil atau
   `texture.add(frameName, ...)`), downscale ke `ew×eh`, lalu `textures.addCanvas/addImage` ke key
   standalone (`t_<key>` atau `t_<key>__<frameIdx>`). Untuk multi-frame, daftarkan `anims.create`
   (guard `anims.exists`). Setelah ini **semua `create('t_e_range')` / `tileSprite('t_ground')` /
   `setScale` lama jalan tanpa diubah**.

3. **Key-out background bila perlu:** kalau PNG dikirim **tidak transparan** (latar checkerboard /
   solid), engine flood-fill dari tepi untuk meng-key-out warna latar yang menyambung ke pinggir
   (warna sama di DALAM sprite aman). Tapi **PNG transparan asli lebih disukai** (langsung dipakai).

4. **Fallback WAJIB:** bila slot kosong / gambar gagal load → pakai `buildTextures` prosedural lama.
   Pegang flag `using<Kelompok>Assets` (mis. `usingEnemyAssets`) → game **tak pernah blank**.

> **Anti-pattern yang sudah dibayar (tulis di Bible):**
> - ❌ Asumsi **grid seragam** (pitch tetap) saat frame beda lebar → rect overrun ke tetangga
>   ("boss tampil dobel"). Pakai **rect eksplisit per frame**.
> - ❌ Lupa downscale → sprite raksasa, hitbox/kamera meleset.
> - ❌ Tak ada fallback prosedural → slot 1 kosong = blank canvas.
> - ❌ Tile `t_ground`/`t_plat` dari sel yang **tidak seamless** → garis sambungan kelihatan.

---

## P.5 — LANGKAH 5: URUTAN UPLOAD (kritikal — slot dinomori dari urutan)

Karena `{{asset_image_N}}` dinomori dari **urutan upload** (P.0), Bible **WAJIB** menetapkan urutan
baku ke-5 sheet + slot `image_N` yang dipakai tiap sheet, dan HTML tema **WAJIB** memakai nomor itu.

**Urutan upload baku (default Bible) — 5 sheet, berurutan:**

| Urutan upload | Kelompok | Variabel host | `data-asset` (di HTML) |
|---|---|---|---|
| 1 | **player** | `{{asset_image_1}}` | `data-asset="player_sheet"` |
| 2 | **enemy** | `{{asset_image_2}}` | `data-asset="enemy_sheet"` |
| 3 | **environment** | `{{asset_image_3}}` | `data-asset="environment_sheet"` |
| 4 | **game-object** | `{{asset_image_4}}` | `data-asset="object_sheet"` |
| 5 | **box-kepingan** | `{{asset_image_5}}` | `data-asset="piece_sheet"` |

> Nomor `1..5` di atas = **default bila theme belum punya aset gambar lain**. Bila tema sudah
> memakai `asset_image` untuk hal lain (mis. background), geser nomornya & **dokumentasikan offset
> di Bible** (contoh metalslug memakai slot 15/16 karena 14 slot dipakai lebih dulu). Yang mutlak:
> **nomor `image_N` di HTML = posisi sheet itu dalam urutan upload.**

HTML (satu elemen tersembunyi per sheet, dibaca JS via `data-asset`):
```html
<img id="aset-player"  data-asset="player_sheet"      src="{{asset_image_1}}" hidden>
<img id="aset-enemy"   data-asset="enemy_sheet"       src="{{asset_image_2}}" hidden>
<img id="aset-env"     data-asset="environment_sheet" src="{{asset_image_3}}" hidden>
<img id="aset-object"  data-asset="object_sheet"      src="{{asset_image_4}}" hidden>
<img id="aset-piece"   data-asset="piece_sheet"       src="{{asset_image_5}}" hidden>
```
JS membaca `document.querySelector('[data-asset="enemy_sheet"]').getAttribute('src')`; bila kosong
atau masih literal `{{…}}` → kelompok itu **fallback prosedural**.

> **Bible WAJIB mencantumkan "Petunjuk Upload" eksplisit** untuk user: *"Upload sheet sesuai
> urutan ini — 1) player, 2) enemy, 3) environment, 4) game-object, 5) box-kepingan — agar
> `asset_image_N` cocok."* Tanpa urutan ini, mekanisme inject salah sasaran.

---

## P.6 — Panduan generate PNG (dari `deskripsi` JSON → gambar)

`deskripsi` tiap entri JSON (P.3) dirancang agar **langsung bisa jadi prompt image-gen**. Aturan
prompt agar hasilnya kompatibel engine:

- **Wajib di prompt:** *pixel-art sprite sheet, latar transparan (alpha), frame disusun horizontal
  kiri→kanan, ukuran sel `frameWidth × frameHeight` px seragam, hadap kanan, tanpa anti-alias/blur
  tepi, kaki menapak baris bawah sel.* Sebut **jumlah & makna tiap frame** dari `deskripsi`.
- **Palet konsisten** per entity (sebut hex utama dari APPENDIX C Bible) agar animasi tak "kedip".
- **Satu entity per generate**, lalu susun jadi sheet (atau minta sheet langsung bila tool sanggup
  menjaga sel seragam). Bila tool menghasilkan latar non-transparan → andalkan key-out engine (P.4.3),
  tapi catat warna latar agar flood-fill aman.
- **Verifikasi ukuran** hasil: tiap sel = `frameWidth×frameHeight`; bila meleset, **update frame-map
  rect** (P.4) — jangan paksa engine pakai grid yang salah.
- **Sebut "no text, no watermark, no UI"** — HUD/teks digambar engine, bukan bagian sprite.

> Hasil generate boleh tidak sempurna; yang menjamin tampil benar adalah **frame-map terverifikasi +
> downscale + fallback**. Bila satu sheet jelek, set saja `using<Kelompok>Assets=false` → prosedural.

---

## P.7 — Checklist APPENDIX P (self-check)

- [ ] Kebutuhan sprite **diturunkan dari gameplay** (state machine player + state tiap musuh/boss +
      objek + environment + kepingan), 1-lawan-1 dengan tekstur engine APPENDIX B–D.
- [ ] Dikelompokkan **TEPAT 5 sheet** (player/enemy/environment/game-object/box-kepingan); kelompok
      kosong ditandai eksplisit.
- [ ] **5 JSON generate** (1 per kelompok), tiap entri: `kelompok, name, deskripsi, orderNumber,
      frameWidth(≥80), frameHeight(≥80)`.
- [ ] **Frame-map eksplisit per frame** (rect, bukan grid seragam) + `key` ke tekstur engine lama +
      `ew/eh/dh` downscale + `hb` hitbox + `anim/rate` untuk multi-frame.
- [ ] **Urutan upload baku ditetapkan** (player→enemy→environment→game-object→box-kepingan) & nomor
      `{{asset_image_N}}` di HTML cocok dengan urutan itu; `data-asset` per sheet.
- [ ] **Fallback prosedural** per kelompok (`using<Kelompok>Assets`) → tak pernah blank.
- [ ] Tileable (`t_ground`/`t_plat`) **seamless**; hadap **kanan**; pivot kaki di baris bawah.
- [ ] **Petunjuk Upload** untuk user + panduan prompt image-gen tercantum.

---

## Rujukan contoh kerja (BUKAN untuk disalin — pelajari polanya)

- `src/sample-theme/metalslug-wedding/index.js` — tabel `OBJECT_SHEET` & `ENEMY_SHEET` (slice + bake
  + anim + downscale + fallback), `usingObjectAssets`/`usingEnemyAssets`.
- `src/sample-theme/metalslug-wedding/assets/object-frame-map.json` — bentuk frame-map per-frame.
- `src/sample-theme/metalslug-wedding/ASSET.md` — spec sheet enemy/boss (per-row rects, key-out
  checkerboard, downscale, slot `{{asset_image_15}}`).
- `src/sample-theme/metalslug-wedding/object-assets.json` — bentuk JSON kebutuhan objek.
- Host: [`ThemeEditorPage.tsx`](src/features/admin/pages/ThemeEditorPage.tsx) — `media_code` per-tipe
  dari urutan, `{{asset_<media_code>}}` inject.
