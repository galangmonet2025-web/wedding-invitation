---
name: asset-adjust-skill
description: >
  Pasang "alat penyesuaian aset" ke tema GAME undangan yang SUDAH jadi (3 file index.html +
  index.css + index.js, sprite-nya masih digambar prosedural via code). Gunakan setiap kali user
  minta menambah/mengatur aset gambar tema game yang baru di-generate (mis. "tambahkan adjustment
  asset image", "buatkan sprite sheet dari game ini + slider posisi sprite", "asset adjuster"). DUA
  output yang LANGSUNG dimodif ke 3 file tema: (1) EXPORTER — tombol yang meng-generate satu PNG
  sprite sheet dari tekstur prosedural game saat ini, tiap frame diberi BORDER UNGU sebagai penanda
  batas yang dibaca index.js, sehingga user bisa me-replace isi tiap kotak lalu upload balik ke
  asset tema → langsung ter-apply (engine meng-key-out border ungu). (2) SPRITE TUNER ("ATUR POSISI
  SPRITE") — POSISI & TOMBOL AKSESNYA DISAMAKAN PERSIS dengan tema `metalslug-wedding`: pemicu = ★
  TERSEMBUNYI inline di side-badge panel-kanan (PC only), panel = overlay fixed di kiri-atas panel
  kanan (left:480px, list 2-kolom). Klik → pop-up berisi LIST sprite + SLIDER
  naik/turun + ANGKA indikator; pop-up TIDAK mem-pause game & config LANGSUNG ter-apply (live). User
  yang menentukan nilainya; nilai final di-"Salin" lalu diserahkan untuk kamu BAKE ke kode.
  Patuh kontrak host (ThemeWrapper) — cleanup hook, ID host verbatim, jangan putar backsound tenant.
---

# Skill: Pemasang "Asset Adjuster" untuk Tema Game Undangan yang Sudah Jadi

Kamu adalah **Tools/Engine Engineer**. Tema game (Phaser 3, hasil `clone-skill` lalu di-generate
jadi 3 file) sudah berjalan dengan **sprite prosedural** (digambar via `graphics.generateTexture`).
Karena sudah jalan, **semua sprite & frame-map sudah ADA di dalam `index.js`**. Tugas skill ini:
**memodifikasi 3 file tema itu** untuk menambahkan dua alat penyesuaian aset, **tanpa mengubah
gameplay**.

> ## 🎯 OUTPUT SKILL INI (LANGSUNG ke 3 file tema, bukan dokumen)
>
> Skill ini **mengedit** `src/sample-theme/<nama>/index.html`, `index.css`, `index.js` milik tema
> target. Dua fitur yang ditambahkan:
>
> 1. **EXPORTER sprite sheet PNG** — tombol yang, dari **tekstur prosedural yang sudah dibuat
>    game**, menggambar SATU PNG sprite sheet (semua frame, layout = frame-map yang dibaca
>    `index.js`), tiap frame dibingkai **border UNGU** sebagai penanda batas. User download PNG itu,
>    **mengganti isi tiap kotak** dengan art buatannya (mempertahankan posisi/ukuran kotak), lalu
>    **upload ke asset tema** → engine memuat & **meng-slice di koordinat yang sama** → langsung
>    ter-apply. Border ungu **di-key-out** engine saat load (lihat §4).
> 2. **SPRITE TUNER ("ATUR POSISI SPRITE")** — **POSISI & TOMBOL AKSESNYA WAJIB DISAMAKAN PERSIS**
>    dengan `metalslug-wedding` (lihat §2.0): tombol pemicu = **★ tersembunyi inline di dalam
>    side-badge panel-kanan** (mis. `class="<prefix>-tuner-btn"` di `.<prefix>-side-badge`), bukan
>    tombol melayang di pojok; **muncul hanya di PC** karena panel-kanan-nya sendiri PC-only. Panel =
>    **overlay `position:fixed; top:0; left:480px`** (kiri-atas panel kanan, tepat di kanan frame
>    game 480px), `width:~440px`, **list 2-kolom**. Klik → pop-up berisi **list tiap sprite + slider
>    naik/turun (−/+) + angka px**. Pop-up **tidak mem-pause** game; menggeser slider **langsung
>    menggeser** sprite hidup di layar (live-apply) **dan** disimpan ke `localStorage`. Tombol
>    **"Salin nilai"** menyalin hasil (JSON `{id: offsetPx}`) agar user kirim balik → kamu **bake**
>    ke kode sebagai offset permanen.

> **GOLDEN REFERENCE (WAJIB dipelajari, JANGAN disalin buta):**
> `src/sample-theme/metalslug-wedding/` **sudah** memiliki Sprite Tuner lengkap yang persis sesuai
> brief ini — pelajari implementasinya & tiru polanya untuk tema target:
> - `index.js`: `TUNE_KEY`, `TUNE_SPECS`, `TUNE_MIN/MAX`, `loadTune/saveTune/tuneY`, `buildTuner`,
>   `toggleTuner`, `resetTuner`, `copyTuner`, dan `GameScene.prototype.applyLiveTune` (live-apply
>   tanpa pause), serta pemanggilan `tuneY('<id>', y)` di tiap spawner.
> - `index.html`: tombol pemicu `#msw-tuner-btn` = **★ inline DI DALAM** `.msw-side-badge`
>   (`<div class="msw-side-badge"><button class="msw-tuner-btn" id="msw-tuner-btn" …>★</button>
>   UNDANGAN PERNIKAHAN ★</div>`) — **bukan** tombol melayang di pojok; + panel `#msw-tuner`
>   (head judul+✕, hint, `#msw-tuner-list`, foot Reset/Salin).
> - `index.css`: `.msw-tuner-btn` (`display:inline; background:none; border:none; font:inherit;
>   color:inherit` — menyatu jadi ★ di badge), `.msw-tuner`
>   (`position:fixed; top:0; left:480px; width:440px; z-index:80; display:none`; `.msw-tuner.show{
>   display:flex }`), `.msw-tuner-list` (`display:grid; grid-template-columns:1fr 1fr` — 2-kolom).
>   **PC-only**-nya datang dari panel-kanan (`.msw-cover-side`) yang hanya muncul di
>   `@media (min-width:1024px) and (orientation:landscape) and (min-aspect-ratio:1/1)` — di situlah
>   side-badge + ★ ikut tampil. **JANGAN** hard-gate `.msw-tuner` dengan `display:none !important`
>   (itu menyembunyikannya di preview Theme-Editor yang lebih sempit → tombol terlihat "mati").
> Tuner di metalslug = **bukti pola bekerja**. Untuk tema lain kamu menyesuaikan daftar sprite-nya.
> EXPORTER PNG **belum** ada di metalslug — itu bagian BARU yang kamu tambahkan (§3–§4).

---

## 0. SEBELUM MENGEDIT — pahami tema target dulu

1. **Tentukan tema target.** Dari prompt user / file yang sedang dibuka. Path:
   `src/sample-theme/<nama>/{index.html,index.css,index.js}`. Bila ambigu, tanyakan tema mana.
2. **BACA `index.js` tema itu** dan **inventarisasi sprite** (ini sumber kebenaran exporter+tuner):
   - **Daftar tekstur prosedural**: cari semua `tex(scene, '<key>', w, h, …)` /
     `generateTexture('<key>', …)` → kumpulkan `{ key, w, h }`.
   - **Anim & multi-frame**: cari `anims.create({key,…frames})` untuk tahu key mana yang punya
     beberapa frame (mis. `t_player_run0..3`, `t_flame` 3-frame) → kelompokkan jadi satu baris
     sprite-sheet (frame horizontal).
   - **Origin & hitbox**: catat `setOrigin`, `body.setSize/Offset`, dan `setScale` per sprite —
     dipakai exporter agar kotak sheet mewakili ukuran tampil yang benar, dan dipakai tuner agar
     `applyLiveTune` menggeser dengan benar.
   - **Pemetaan ID host & cleanup**: pastikan ada `window.__<prefix>Cleanup` (re-inject hook),
     prefix elemen tema (mis. `msw-`), dan cara delegated-click di-wire. **Pakai prefix yang sama**.
3. **Patuh kontrak host (JANGAN langgar).** ID host verbatim (`btn-toggle-music`, dst.), JS tema
   di-re-inject → semua listener/elemen baru harus didaftarkan ke **cleanup hook** yang sudah ada;
   jangan `audio.play()` backsound tenant. (Rujukan lengkap di `clone-skill/reference/host-contract.md`.)
4. **Game WAJIB tetap jalan** sebelum & sesudah modif, **dengan atau tanpa** PNG terupload — fitur
   ini **aditif**, bukan mengganti baseline prosedural. Tuner & exporter tidak boleh menyentuh
   logika gameplay.

---

## 1. LANGKAH KERJA (ringkas)

1. **Inventaris sprite** dari `index.js` (§0.2) → bangun **`TUNE_SPECS`** (list id+label+keys) &
   **`SHEET_MAP`** (frame-map untuk exporter: key → kotak [x,y,w,h] di sheet).
2. **Pasang SPRITE TUNER** (§2): HTML tombol+panel, CSS (PC-only, kanan), JS (slider live-apply
   tanpa pause + persist + Salin). Tiru pola `metalslug-wedding`.
3. **Pasang EXPORTER PNG** (§3): tombol "Export Sprite Sheet (PNG)" di panel tuner → fungsi yang
   meng-compose tekstur game → 1 canvas + **border ungu** per kotak → `download`.
4. **Pasang LOADER + KEY-OUT** (§4): saat tema memuat asset gambar dari slot `{{asset_image_N}}`,
   slice di `SHEET_MAP` yang sama, **buang piksel border ungu**, bake ke key tekstur game →
   langsung ter-apply. Sediakan **fallback prosedural** (tanpa upload tetap jalan).
5. **Verifikasi** (§6) lewat Theme Editor / minta user (screenshot headless tak bisa di mesin ini).
6. **Bake adjustment** (§5): saat user mengirim hasil "Salin nilai", terapkan sebagai offset
   permanen di kode (atau biarkan dibaca dari `localStorage` — sesuai pilihan §5).

---

## 2. SPRITE TUNER ("ATUR POSISI SPRITE") — tiru `metalslug-wedding`

### 2.0 POSISI & TOMBOL AKSES — WAJIB SAMA PERSIS dengan `metalslug-wedding`

Brief user eksplisit: **"POSISI & BUTTON AKSESNYA DISAMAIN"** dengan fitur Sprite Tuner yang sudah
ada di metalslug. Jadi salin **layout & titik akses** ini apa adanya (hanya prefix `msw-` → prefix
tema target yang berbeda):

- **TOMBOL AKSES = ★ tersembunyi INLINE di dalam side-badge panel kanan** (judul poster, mis.
  "UNDANGAN PERNIKAHAN ★"). **BUKAN** tombol melayang di pojok kanan-bawah. Markup persis:
  ```html
  <div class="<prefix>-side-badge">
    <button class="<prefix>-tuner-btn" id="<prefix>-tuner-btn" type="button"
            title="Atur posisi sprite" aria-label="Atur posisi sprite">★</button> UNDANGAN PERNIKAHAN ★
  </div>
  ```
  CSS tombol: `display:inline; padding:0; margin:0; border:none; background:none; font:inherit;
  color:inherit; cursor:pointer;` → menyatu jadi ★ pertama pada badge (terlihat seperti dekorasi,
  tapi bisa diklik).
- **PANEL = overlay `position:fixed; top:0; left:480px`** (kiri-atas panel kanan, tepat di sebelah
  kanan frame game 480px), `z-index:80; width:440px; max-width:calc(100vw - 480px); max-height:100vh;
  display:none; flex-direction:column;`. Saat dibuka tambahkan kelas `.show` → `display:flex`.
  Daftar slider memakai **grid 2-kolom**: `.<prefix>-tuner-list{ display:grid;
  grid-template-columns:1fr 1fr; gap:6px 12px; overflow-y:auto; }`.
- **PC-only datang dari panel kanan**, bukan dari tombolnya. Side-badge + ★ hanya ada di dalam
  `.<prefix>-cover-side` yang di-show oleh `@media (min-width:1024px) and (orientation:landscape)
  and (min-aspect-ratio:1/1)`. **JANGAN** menambah `display:none !important` pada `.<prefix>-tuner`
  (menyembunyikannya di preview Theme-Editor yang lebih sempit → ★ terlihat "mati"); cukup base
  `display:none` + `.show`.
- **Isi panel sama persis**: head `ATUR POSISI SPRITE` + ✕ (`#<prefix>-tuner-close`), hint
  *"Geser slider untuk naik/turunkan sprite (− naik, + turun). Langsung ter-apply."*, list
  `#<prefix>-tuner-list`, foot **"Reset semua"** (`#<prefix>-tuner-reset`) + **"Salin nilai"**
  (`#<prefix>-tuner-copy`).

> Jika tema target **tidak punya** panel-kanan/side-badge ala metalslug (mis. layout 1-kolom),
> **konfirmasikan ke user**: replikasi titik-akses yang setara (★ inline pada badge/header tema yang
> hanya tampil di PC) dan panel overlay kanan yang sama — tujuannya posisi & cara akses identik
> secara fungsional, bukan memaksa elemen yang tak ada.

### 2.1 Perilaku WAJIB (sesuai brief user)
- Tombol akses & panel sesuai **§2.0** (titik akses ★ di side-badge, panel fixed kiri-atas panel
  kanan). **Hanya tampil di PC** (gate dari panel kanan). Di mobile/touch tidak muncul.
- Klik tombol → **toggle pop-up** (`.show`). **JANGAN `scene.pause()`** — game terus jalan.
- Pop-up berisi **list tiap sprite** (satu baris per id di `TUNE_SPECS`): **nama** + **angka
  indikator** (mis. `+12px` / `−8px`) + **slider** `range` (`min=-60 max=60 step=1`).
- Menggeser slider → panggil `applyLiveTune(id, nilai)` yang **langsung menggeser** sprite hidup
  bertanda id itu di layar **dan** `saveTune()` ke `localStorage`. Tidak ada tombol "Apply".
- Foot panel: **"Reset semua"** (set semua ke 0, live) + **"Salin nilai"** (copy JSON
  `{id: px, …}` ke clipboard + toast) → user kirim balik untuk di-bake.

**Implementasi (pola terbukti — sesuaikan prefix & daftar sprite ke tema target):**

- **`TUNE_SPECS`** = array `{ id, label, keys:[<texKey>…] }`. `id` = nama sprite logis
  (player/musuhX/item…); `keys` = semua tekstur engine yang ikut tergeser saat slider id itu
  digerakkan (mis. player punya banyak pose → semua key pose-nya). Turunkan dari inventaris §0.2.
- **State**: `TUNE_KEY='<prefix>_tune_v1'`, `TUNE = loadTune()` (default semua 0, try/catch),
  `saveTune()`, `tuneY(id, y){ return y + (TUNE[id]||0); }`.
- **Pakai `tuneY('<id>', y)` di SETIAP spawn anchor** sprite tersebut (agar nilai tuner ikut saat
  sprite dibuat). Tandai tiap sprite dengan `setData('tuneId','<id>')` + simpan `baseY` bila ia
  ber-bob, supaya `applyLiveTune` bisa menggesernya saat hidup.
- **`buildTuner()`**: render baris+slider; pasang **satu** delegated `input` listener pada list
  (guard `__bound`) → baca `data-tune` → update angka indikator → `applyLiveTune` (atau persist saja
  bila scene belum hidup).
- **`applyLiveTune(id, newVal)`** (method scene): hitung `delta = newVal - old`, `TUNE[id]=newVal;
  saveTune()`. Untuk **player/boss** (anchor khusus via body-offset/homeY) → re-derive offsetnya.
  Untuk sprite lain → loop grup, geser `s.y += delta` untuk yang `getData('tuneId')===id` (dan
  update `baseY` bila ada). Tanpa pause; berlaku seketika.
- **Wiring tombol** lewat delegated-click yang sudah dipakai tema (daftarkan id tombol tuner di
  peta ACTIONS) **dan** daftarkan listener apa pun ke **cleanup hook**.
- **HTML & CSS**: ikuti **§2.0** persis — tombol `#<prefix>-tuner-btn` = ★ inline di side-badge,
  panel `#<prefix>-tuner` (head judul+✕, hint, list `#<prefix>-tuner-list` grid 2-kolom, foot
  Reset+Salin), overlay `position:fixed; top:0; left:480px; width:440px`. PC-only diwariskan dari
  panel kanan (`.<prefix>-cover-side`), **bukan** dari `@media (hover/pointer)` pada tombolnya.

> **Golden Rule §2:** *Tuner murni KOSMETIK posisi — tidak menyentuh hitbox/gameplay.* Live-apply,
> tanpa pause, persist, **PC-only**, **akses & posisi SAMA PERSIS metalslug** (★ inline di
> side-badge → panel fixed kiri-atas panel kanan, §2.0). Nilai final = milik user; kamu hanya
> menyediakan alat + kelak mem-bake angkanya.

---

## 3. EXPORTER SPRITE SHEET PNG (border ungu) — fitur BARU

**Tujuan:** dari tekstur prosedural yang **sudah dibuat game**, hasilkan **satu file PNG** yang =
peta sprite sheet siap-isi. User mengganti isi tiap kotak dengan art-nya (tanpa menggeser kotak),
upload balik → engine slice di koordinat sama → ter-apply.

**`SHEET_MAP` (sumber kebenaran tunggal exporter & loader).** Bangun dari inventaris §0.2:
satu array entri `{ key, w, h, frames:[[x,y]…] | layout }`. Susun layout deterministik:
- **Per-ROW**: satu entity/anim = satu baris; frame-frame-nya horizontal kiri→kanan.
- Catat **koordinat absolut tiap frame** `[x, y, w, h]` di kanvas sheet (inilah yang dipakai
  loader §4 untuk slice — **harus identik**). Sisakan margin tepi + **tebal border ungu**
  (mis. 2px) di sekeliling tiap frame.
- Ukuran kotak = ukuran tekstur game (boleh di-scale **≥80px** bila kamu juga menaikkan resolusi
  saat slice — opsional; default 1:1 dengan tekstur game agar pasti cocok).

**Fungsi `exportSpriteSheet()` (dipanggil dari tombol di panel tuner):**
1. Buat `<canvas>` seukuran sheet (lebar/tinggi dari `SHEET_MAP`).
2. Untuk tiap frame: ambil **source image tekstur game** via
   `scene.textures.get(key).getSourceImage()` (atau `getFrame(key).cut*`/`canvasData`), `drawImage`
   ke posisi `[x,y]` kotak itu.
3. Gambar **border UNGU** (`#a000ff` / `rgb(160,0,255)`, garis 2px) tepat **mengelilingi tiap
   kotak frame** sebagai penanda batas.
4. (Opsional) tulis label kecil nama key di atas baris (warna ungu) untuk memudahkan user — boleh,
   asal **di luar area frame** (jangan menimpa piksel art).
5. `canvas.toDataURL('image/png')` → trigger download (`<a download="<nama>-sprite-sheet.png">`).
   Sediakan fallback: bila canvas ter-taint/gagal, `showError`/toast yang jelas.

**Letak tombol:** tambahkan di **panel tuner** (foot), mis. **"Export Sprite Sheet (PNG)"** —
sehingga seluruh alat aset ada di satu tempat PC-only. (Boleh juga tombol terpisah, tapi default:
di dalam tuner.)

> **Golden Rule §3:** *Kotak yang digambar exporter = kotak yang dibaca loader.* Keduanya membaca
> `SHEET_MAP` yang SAMA. Kalau koordinat exporter dan loader beda, art user akan ter-slice meleset.

---

## 4. LOADER + KEY-OUT BORDER UNGU (upload balik → ter-apply)

Agar PNG yang sudah user isi **langsung ter-apply** saat di-upload ke asset tema:

1. **Baca slot asset.** Host menyediakan `{{asset_image_N}}` (URL/base64) yang dinomori dari
   **urutan upload** (lihat `clone-skill/reference/sprite-sheet-assets.md` P.0/P.5). Beri elemen
   tersembunyi `data-asset="sprite_sheet"` berisi `{{asset_image_N}}`; tema membaca `src`-nya.
   Bila kosong / masih literal `{{…}}` → **fallback prosedural** (jangan blank).
2. **Load gambar** ke tekstur (`scene.load.image` di `preload`, atau `Image()`+`textures.addImage`),
   lalu **slice di `SHEET_MAP`** (koordinat IDENTIK dengan exporter §3) → untuk tiap frame:
   potong kotak, **key-out border ungu**, downscale bila perlu, lalu **bake ke key tekstur game**
   (`textures.addCanvas(key, …)` / `texture.add(frameName,…)`) sehingga semua `create/tile/scale/anim`
   yang ada memakai art baru **tanpa diubah**. Bangun ulang anim multi-frame (guard `anims.exists`).
3. **KEY-OUT border ungu (WAJIB).** Border ungu = **penanda visual saja**, tidak boleh ikut
   ter-render. Saat slice, **buang piksel ungu**: untuk tiap piksel frame, jika warnanya dekat ungu
   penanda (mis. `R>120 && B>180 && G<80`, toleransi ~40) → set `alpha=0`. Karena border ada **di
   tepi** kotak, ini cukup; tidak akan memakan art di tengah. (Bila tema memakai ungu sebagai warna
   art, pakai ungu penanda yang **tidak dipakai** game + dokumentasikan di tombol/hint.)
4. **Fallback wajib**: flag `usingSheetAsset` → `false` saat slot kosong/gagal → game pakai tekstur
   prosedural lama. **Tanpa upload, game tetap fully playable.**

> **Golden Rule §4:** *Replace isi kotak, jangan geser kotak.* User cukup menimpa gambar di dalam
> tiap bingkai ungu; engine slice di koordinat tetap + key-out ungu → art langsung muncul.

---

## 5. BAKE HASIL ADJUSTMENT (saat user mengirim nilai "Salin")

Alur: user main → buka tuner → atur slider sampai pas → klik **"Salin nilai"** → kirim JSON
`{ "<id>": <px>, … }` kepadamu. Lalu:

- **Default (disukai): bake ke kode.** Jadikan nilai itu **default** di `TUNE` (atau konstanta
  offset per-sprite di config), sehingga tampil benar untuk **semua tamu** tanpa bergantung
  `localStorage`. Pastikan `tuneY()`/anchor memakai nilai baru. Sisakan tuner tetap ada (bisa
  di-`display:none` via flag dev) atau biarkan untuk penyesuaian lanjutan.
- **Alternatif**: biarkan nilai hanya di `localStorage` per-device (kurang disukai untuk produksi —
  device lain tak dapat). Pilih ini hanya bila user eksplisit minta.

Konfirmasikan ke user pilihan bake sebelum menghapus tombol tuner dari UI publik.

---

## 6. VERIFIKASI (jebakan mesin ini)

- **Screenshot headless Chrome TIDAK bekerja** di mesin ini (selalu blank) — jangan dipercaya.
- **Cara benar:** paste 3 file ke **Theme Editor** host
  ([`ThemeEditorPage.tsx`](src/features/admin/pages/ThemeEditorPage.tsx)) → buka preview, **atau**
  minta user mencoba. Cek: (a) **akses & posisi SAMA seperti metalslug** — ★ pemicu di side-badge
  panel kanan (muncul **hanya di PC**), panel overlay fixed di kiri-atas panel kanan (`left:480px`,
  list 2-kolom), game **tak pause**, slider **menggeser sprite live** + angka update; (b) tombol
  Export menghasilkan PNG
  dengan **kotak ber-border ungu** per frame; (c) upload PNG (isi diganti) → art ter-apply & border
  ungu **tidak terlihat** (ter-key-out); (d) **tanpa** upload, game tetap jalan (prosedural).
- Logika game boleh diuji via **harness Node** (RAF di-stub) bila perlu, tapi tuner/exporter bersifat
  UI/DOM → paling andal lewat Theme Editor.

---

## 7. ANTI-PATTERN (jangan lakukan)

- ❌ Tombol tuner muncul di **mobile** → harus PC-only (gate dari panel kanan `.<prefix>-cover-side`,
  bukan dari `@media (hover/pointer)` pada tombol; lihat §2.0).
- ❌ Pop-up **mem-pause** game / butuh tombol "Apply" → harus live-apply tanpa pause, persist otomatis.
- ❌ **Posisi/akses BEDA dari metalslug** → WAJIB sama persis: pemicu = ★ inline di **side-badge**
  (bukan tombol melayang di pojok), panel = **overlay fixed kiri-atas panel kanan** (`top:0;left:480px`),
  bukan di tengah/kiri. (§2.0)
- ❌ Hard-gate `.<prefix>-tuner` dengan `display:none !important` → tersembunyi di preview Theme-Editor
  yang sempit, ★ terlihat "mati". Cukup base `display:none` + `.show`.
- ❌ Koordinat **exporter ≠ loader** → art ter-slice meleset. Keduanya baca `SHEET_MAP` yang sama.
- ❌ **Lupa key-out border ungu** → garis ungu ikut ter-render di game.
- ❌ Tidak ada **fallback prosedural** → slot kosong = blank canvas (harus tetap jalan tanpa upload).
- ❌ Tuner/exporter **mengubah hitbox/gameplay** → murni kosmetik posisi + tooling.
- ❌ Listener baru **tidak** didaftarkan ke cleanup hook → menumpuk tiap re-inject host.
- ❌ Melanggar kontrak host (ID verbatim, `audio.play()` backsound tenant).
- ❌ Mengarang prefix/elemen baru yang bentrok — **pakai prefix tema target** (mis. `msw-`).

---

## Rujukan

- **Golden reference Tuner:** `src/sample-theme/metalslug-wedding/{index.js,index.html,index.css}`
  (`TUNE_SPECS`, `buildTuner`, `applyLiveTune`, `#msw-tuner*`, media-query PC-only). Tiru polanya.
- **Mekanisme asset & urutan upload + key-out + frame-map + fallback:**
  [`clone-skill/reference/sprite-sheet-assets.md`](../clone-skill/reference/sprite-sheet-assets.md)
  (APPENDIX P): P.0 slot `{{asset_image_N}}` dari urutan upload, P.4 slice+key-out+downscale+fallback.
- **Kontrak host:** [`clone-skill/reference/host-contract.md`](../clone-skill/reference/host-contract.md).
- **Verifikasi:** [`ThemeEditorPage.tsx`](src/features/admin/pages/ThemeEditorPage.tsx) (Theme Editor).
