# Batak Heritage — Aset Gambar

Gambar dekorasi/latar khas Batak ini **disalin dari tema sumber** (inviee —
`hi.inviee.id/wp-content/uploads/2024/12/`) dan dipakai untuk membuat background
& elemen Batak jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `BATAK-BACKGROUND.webp` | Latar utama (rumah bolon di tepi danau + pepohonan) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `BATAK-MOTIF-ATAS.webp` | Border tenun ulos ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `BATAK-MOTIF-BAWAH.webp` | Border tenun ulos BAWAH (pasangan cermin vertikal) |
| **Gambar 4** (`{{asset_image_4}}`) | `BATAK-COUPLE-3.webp` | Untaian mawar + pakis emas, aksen sudut **KIRI** (25%) |
| **Gambar 5** (`{{asset_image_5}}`) | `BATAK-COUPLE-1.webp` | Untaian mawar + pakis emas, aksen sudut **KANAN** (75%) |
| **Gambar 6** (`{{asset_image_6}}`) | `BATAK-PATTERN.webp` | Pattern tenun ulos (overlay `multiply`) di atas **ground merah** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `BATAK-ICON.webp` | **Gable rumah bolon** (emas) — mahkota di cover/hero/closing/menu + siluet sidebar desktop |
| **Gambar 8** (`{{asset_image_8}}`) | `BATAK-COUPLE-2.webp` | Rangkaian mawar — aksen sudut frame cover (**dipakai 2×**: kiri-atas & kanan-bawah) |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **Slot 4 & 5 = pasangan cermin ASLI — jangan ditukar & jangan di-flip lewat
  CSS.** `BATAK-COUPLE-3` (pakis menyapu ke kanan) dan `BATAK-COUPLE-1` (pakis
  menyapu ke kiri) adalah dua artwork terpisah yang memang sudah saling cermin.
  Karena itu `.bt-spray-l` / `.bt-spray-r` di CSS **sengaja tidak** memakai
  `scaleX(-1)` — kalau ditambahkan, artwork yang sudah benar malah terbalik.

- **AWAS — penomoran 4/5 TERBALIK dibanding tema `bugis-heritage`.** Batak:
  `COUPLE-3` di kiri (25%), `COUPLE-1` di kanan (75%). Bugis: kebalikannya.
  inviee memakai artwork yang sama persis (`BUGIS-COUPLE-1` byte-identik dengan
  `BATAK-COUPLE-3`, 83.228 bytes) tapi dengan penomoran berbeda. Sudah
  diverifikasi dari CSS source — **jangan menyalin peta slot tema saudara**.

- **Slot 8 dipakai DUA KALI, dan di sini `scaleX(-1)` justru WAJIB.** Source
  Batak cuma menyediakan **satu** bunga terpisah (`BATAK-COUPLE-2`), jadi sudut
  kanan-bawah frame cover memakai gambar yang sama lalu dicerminkan lewat CSS
  (`.bt-flower-br { transform: rotate(8deg) scaleX(-1) }`). Ini **kebalikan**
  aturan slot 4/5 di atas — cuma pasangan 4/5 yang cermin asli. Kalau `scaleX`
  di `.bt-flower-br` dihapus, dua rangkaian mawar menghadap arah yang sama dan
  frame cover terlihat pincang.

- **`BATAK-PATTERN.webp` BUKAN gambar pucat.** Beda dari `SUNDA-PATTERN-2` /
  `BALI-PATTERN` / `MINANG-PATTERN` (yang terlihat putih polos dan memang
  sengaja begitu), pattern Batak adalah **strip tenun ulos merah pekat**
  berukuran **300×68** (bukan tile persegi). Di-`repeat` dengan
  `background-size: 150px auto` → tiap ubin ~150×34 px, membentuk garis-garis
  ulos horizontal. Sudah dicek: WebP VP8X 300×68, 6.148 bytes — utuh, cuma
  memang file kecil karena strip-nya sempit.

- **Angka pattern = `150px auto` + `opacity: 0.3` + `mix-blend-mode: multiply`**
  di atas ground `#98121C`, dengan radial `#B3534F → #98121C`. Disalin apa
  adanya dari source. Tema `sunda-heritage` (200px / 0.35) adalah
  **pengecualian**, bukan patokan — jangan "diseragamkan" ke tema saudara.

- **`BATAK-ICON.webp` PORTRAIT (684×827)**, beda dari mahkota tema saudara yang
  landscape. Semua kotak `.bt-gable-*` di CSS memakai rasio ~0.83:1 mengikuti
  itu. Kalau memakai kotak landscape warisan tema lain, `background-size:
  contain` akan menyusutkan gable-nya jadi kecil sekali.

- **`BATAK-FALLBACK-1.webp` tidak dipakai** sebagai slot. Di source itu
  poster/fallback untuk video motion
  (`https://assets.inviee.id/heritage/Batak-Motion-HD.mp4`). Disimpan di folder
  ini untuk referensi saja.
