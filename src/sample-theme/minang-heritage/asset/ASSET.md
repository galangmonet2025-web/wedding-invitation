# Minang Heritage — Aset Gambar

Gambar-gambar dekorasi/latar khas Minang ini **disalin dari tema sumber**
(inviee) dan dipakai untuk membuat background & elemen Minang jadi lebih kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style / `<img>`). Kamu tinggal **upload tiap file di bawah
ke slot gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `MINANG-BACKGROUND.webp` | Latar damask utama (palem + Rumah Gadang + bunga) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `MINANG-MOTIF-ATAS.webp` | Border songket ATAS (segitiga pucuak rabuang + rosette) tiap section |
| **Gambar 3** (`{{asset_image_3}}`) | `MINANG-MOTIF-BAWAH.webp` | Border songket BAWAH (mirror) tiap section |
| **Gambar 4** (`{{asset_image_4}}`) | `MINANG-COUPLE-1.webp` | Payung emas + rangkaian bunga saga (aksen sudut) |
| **Gambar 5** (`{{asset_image_5}}`) | `MINANG-FALLBACK.webp` | Bingkai ornamen emas lengkap (aksen di layar video pembuka) |
| **Gambar 6** (`{{asset_image_6}}`) | `MINANG-PATTERN.webp` | Pattern songket (overlay) di atas **background merah** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `MINANG-ICON.webp` | Rumah Gadang (mahkota di cover/hero/closing/menu + siluet sidebar desktop) |
| **Gambar 8** (`{{asset_image_8}}`) | `MINANG-COUPLE-2.webp` | Rangkaian bunga saga (aksen sudut frame cover) |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## File lain (cadangan, belum dipakai)
- `MINANG-COUPLE-3.webp` — rangkaian bunga varian lain
- `Background-atm1.webp` — chip kartu (dari bagian amplop)
