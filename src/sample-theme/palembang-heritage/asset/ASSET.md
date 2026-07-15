# Palembang Heritage — Aset Gambar

Gambar dekorasi/latar khas Palembang ini **disalin dari tema sumber** (inviee —
angkatan upload `2025/02`) dan dipakai untuk membuat nuansa Palembang (songket
merah–emas) jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `Palembang-Background.webp` | Latar utama (rumah limas + jembatan + rangkaian bunga) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `Palembang-Motif-Atas.webp` | Border motif songket **ATAS** tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `Palembang-Motif-Bawah-1.webp` | Border motif songket **BAWAH** (pasangan cermin vertikal) |
| **Gambar 4** (`{{asset_image_4}}`) | `Palembang-Couple-Belakang-2.webp` | Untaian bunga merah aksen sudut **KIRI** (condong kiri) + sudut **KIRI-ATAS** frame cover |
| **Gambar 5** (`{{asset_image_5}}`) | `Palembang-Couple-Belakang-1.webp` | Untaian bunga merah aksen sudut **KANAN** (condong kanan) + sudut **KANAN-BAWAH** frame cover |
| **Gambar 6** (`{{asset_image_6}}`) | `Palembang-Pattern-Seamless.webp` | Pattern motif (overlay `multiply`) di atas **background merah** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `Palembang-Icon.webp` | **Aesan gede** (mahkota pengantin Palembang) — mahkota di cover/hero/closing/menu + siluet sidebar desktop |

> Tema ini memakai **7 slot** saja. `{{asset_image_8}}` & `{{asset_image_9}}`
> **tidak dirujuk sama sekali** — jangan upload apa pun ke sana.
>
> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **Pasangan cermin — jangan ditukar & jangan di-flip lewat CSS.**
  Source Palembang menyediakan artwork kiri & kanan terpisah:
  - slot **4** = `…-Couple-Belakang-2.webp` → **KIRI** (source memasangnya di `25% 60%`)
  - slot **5** = `…-Couple-Belakang-1.webp` → **KANAN** (`75% 60%`)

  **Penomorannya terbalik dari intuisi** (angka **2** = kiri, angka **1** =
  kanan). Ini sudah diverifikasi dari source — jangan "dirapikan". Karena kedua
  artwork sudah saling cermin, CSS tema ini **sengaja tidak** memakai
  `scaleX(-1)` di `.pl-spray-*` maupun `.pl-flower-*`. Kalau ditukar/dibalik,
  arah untaian bunganya jadi salah.

- **Frame cover memakai ULANG slot 4 & 5.** Angkatan Palembang (`2025/02`)
  **tidak punya** aset bunga terpisah untuk frame cover — tidak ada padanan
  `COUPLE-2` (seperti Minang/Bali/Jawa) maupun pasangan `Depan` (seperti Sunda).
  Jadi `.pl-flower-tl` memakai slot **4** dan `.pl-flower-br` memakai slot **5**,
  tanpa `scaleX(-1)`.

- **`Palembang-Pattern-Seamless.webp` terlihat PUTIH POLOS kalau dibuka
  sendiri.** Itu **normal, bukan file rusak** (sudah dicek header-nya: WebP VP8X
  1000×1000, 86KB, isinya utuh). Motifnya memang sangat pucat dan baru muncul
  setelah di-`mix-blend-mode: multiply` di atas ground merah `#4C030A` — persis
  resep tema sumber. **Jangan "diperbaiki"/dinaikkan kontrasnya** — itu justru
  merusak resep source.

- **Nama file angkatan ini menyimpang dari polanya sendiri** (jangan tebak dari
  tema saudara):
  - pattern-nya `Palembang-Pattern-Seamless.webp`, **bukan**
    `Palembang-Seamless-Pattern.webp` (urutan katanya dibalik);
  - band bawahnya `Palembang-Motif-Bawah-**1**.webp`, pakai akhiran `-1`.

- **Angka resep pattern BEDA dari tema saudaranya**: Palembang memakai
  `background-size: 150px auto` + `opacity: 0.3`. Tema `sunda-heritage` pakai
  `200px` / `0.35` — itu khusus Sunda. Jangan "diseragamkan" ke arah mana pun;
  angka resep wajib diverifikasi per source.

- **`Palembang-Fallback.webp` tidak dipakai** sebagai slot aset. Di source itu
  poster/fallback untuk video motion
  (`https://assets.inviee.id/heritage/Palembang-Motion-HD.mp4`, dipasang sebagai
  URL langsung di `<source>` — video bukan `{{asset_image_N}}`). Disimpan di
  folder ini untuk referensi saja.
