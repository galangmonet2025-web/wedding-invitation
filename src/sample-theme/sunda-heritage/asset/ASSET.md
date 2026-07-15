# Sunda Heritage — Aset Gambar

Gambar dekorasi/latar khas Sunda ini **disalin dari tema sumber** (inviee —
`hi.inviee.id/wp-content/uploads/2025/08/`) dan dipakai untuk membuat background
& elemen Sunda jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `MOTION-SUNDA-1-FIXED-BG.webp` | Latar utama (imah panggung + kanopi bambu + bunga) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `Sunda-Heritage-Top-6.webp` | Border motif ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `Sunda-Heritage-Bottom-6.webp` | Border motif BAWAH (pasangan cermin vertikal) |
| **Gambar 4** (`{{asset_image_4}}`) | `Sunda-1-Couple-Belakang-Flip.webp` | Untaian bunga aksen sudut **KIRI** (condong kiri) |
| **Gambar 5** (`{{asset_image_5}}`) | `Sunda-1-Couple-Belakang.webp` | Untaian bunga aksen sudut **KANAN** (condong kanan) |
| **Gambar 6** (`{{asset_image_6}}`) | `SUNDA-PATTERN-2.webp` | Pattern motif bunga (overlay `multiply`) di atas **background emas** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `SUNDA-ICON.webp` | **Siger + bendo** (mahkota pengantin Sunda) — mahkota di cover/hero/closing/menu + siluet sidebar desktop |
| **Gambar 8** (`{{asset_image_8}}`) | `Sunda-1-Couple-Depan-Flip.webp` | Untaian bunga besar — aksen sudut **KIRI-ATAS** frame cover |
| **Gambar 9** (`{{asset_image_9}}`) | `Sunda-1-Couple-Depan.webp` | Untaian bunga besar — aksen sudut **KANAN-BAWAH** frame cover |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **DUA pasangan cermin asli — jangan ditukar & jangan di-flip lewat CSS.**
  Source Sunda menyediakan artwork kiri & kanan terpisah untuk **dua** peran
  sekaligus (beda dari Minang/Bali yang cuma punya 1 gambar lalu dicerminkan
  `scaleX(-1)`, dan lebih banyak dari Jawa yang cuma 1 pasang):
  - slot **4 & 5** = `…-Belakang-Flip` / `…-Belakang` (aksen sudut section)
  - slot **8 & 9** = `…-Depan-Flip` / `…-Depan` (frame cover)

  Karena itu CSS tema ini **sengaja tidak** memakai `scaleX(-1)` di
  `.sn-spray-*` maupun `.sn-flower-*`. Kalau ditukar/dibalik, arah untaian
  bunganya jadi salah. (`Depan` dan `Belakang` adalah dua rangkaian bunga yang
  **berbeda** — `Depan` lebih besar & rapat — bukan duplikat.)
- **`SUNDA-PATTERN-2.webp` terlihat PUTIH POLOS kalau dibuka sendiri.** Itu
  normal, bukan file rusak (sudah dicek: WebP VP8X 499×499, 131KB, isinya utuh).
  Motifnya baru muncul setelah di-`mix-blend-mode: multiply` di atas ground emas
  `#997949` — persis resep tema sumber. Jangan "diperbaiki"/dinaikkan
  kontrasnya.
- **Angka pattern BEDA dari tema saudaranya**: source Sunda memakai
  `background-size: 200px auto` + `opacity: 0.35` (Minang & Bali: `150px` /
  `0.3`). Disalin apa adanya dari `post-62575.css` — jangan "diseragamkan".
- **Tidak ada `SUNDA-BACKGROUND.webp`/`MOTIF-ATAS`/`MOTIF-BAWAH`** di source ini
  (beda skema nama dari Minang/Bali/Jawa). Perannya dipegang
  `MOTION-SUNDA-1-FIXED-BG.webp` dan pasangan `Sunda-Heritage-Top-6` /
  `Bottom-6.webp`.
- **`MOTION-SUNDA-1-FALLBACK.webp` tidak dipakai** sebagai slot. Di source itu
  poster/fallback untuk video motion
  (`https://assets.inviee.id/heritage/Sunda-Motion-HD.mp4`). Disimpan di folder
  ini untuk referensi saja.
