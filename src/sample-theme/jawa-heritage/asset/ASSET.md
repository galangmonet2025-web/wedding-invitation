# Jawa Heritage — Aset Gambar

Gambar dekorasi/latar khas Jawa ini **disalin dari tema sumber** (inviee —
`hi.inviee.id/wp-content/uploads/2024/12/`) dan dipakai untuk membuat background
& elemen Jawa jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `JAWA-BACKGROUND.webp` | Latar utama (rumah Joglo + kanopi sogan + mawar) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `JAWA-MOTIF-ATAS.webp` | Border batik kawung ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `JAWA-MOTIF-BAWAH.webp` | Border batik kawung BAWAH (mirror) |
| **Gambar 4** (`{{asset_image_4}}`) | `JAWA-COUPLE-1.webp` | Gunungan aksen sudut **KIRI** (miring kiri) |
| **Gambar 5** (`{{asset_image_5}}`) | `JAWA-COUPLE-3.webp` | Gunungan aksen sudut **KANAN** (miring kanan) |
| **Gambar 6** (`{{asset_image_6}}`) | `JAWA-PATTERN.webp` | Pattern batik (overlay `multiply`) di atas **background sogan** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `JAWA-GUNUNGAN.webp` | **Gunungan wayang** tegak (mahkota di cover/hero/closing/menu + siluet sidebar desktop) |
| **Gambar 8** (`{{asset_image_8}}`) | `JAWA-COUPLE-2.webp` | Untaian bunga lili merah muda (aksen sudut frame cover) |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **Slot 4 & 5 adalah PASANGAN CERMIN ASLI, jangan ditukar.** Beda dari tema
  Minang/Bali yang cuma punya 1 gambar aksen lalu dicerminkan lewat CSS
  `scaleX(-1)`, source Jawa menyediakan dua artwork terpisah: `COUPLE-1` miring
  KIRI dan `COUPLE-3` miring KANAN. Karena itu CSS di tema ini **sengaja tidak**
  memakai `scaleX(-1)` — kalau ditukar/dibalik, arah gunungannya jadi salah.
- **`JAWA-PATTERN.webp` terlihat sangat PUCAT kalau dibuka sendiri.** Itu normal,
  bukan file rusak (sudah dicek: WebP VP8X 512×512, 82KB, isinya utuh). Motifnya
  baru muncul setelah di-`mix-blend-mode: multiply` di atas ground sogan
  `#5C4324` — persis resep tema sumber. Jangan "diperbaiki"/dinaikkan kontrasnya.
- **Tidak ada `JAWA-ICON.webp`** di source ini (beda dari Minang/Bali). Perannya
  digantikan `JAWA-GUNUNGAN.webp` → slot 7.
- Video pembuka **bukan** aset slot: `https://assets.inviee.id/heritage/Jawa-Motion-HD.mp4`
  dipasang langsung sebagai URL di `<source>` (sudah diverifikasi HTTP 200, 7.6MB).

## File lain (cadangan, belum dipakai)
- `JAWA-COUPLE-4.webp` — untaian lili varian lain (pasangan cermin dari COUPLE-2)
- `JAWA-FALLBACK.webp` — bingkai ornamen lengkap
