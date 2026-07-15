# Bali Heritage — Aset Gambar

Gambar dekorasi/latar khas Bali ini **disalin dari tema sumber** (inviee —
`hi.inviee.id/wp-content/uploads/2024/12/`) dan dipakai untuk membuat background
& elemen Bali jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `BALI-BACKGROUND.webp` | Latar damask utama (Pura Ulun Danu + candi bentar + anggrek) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `BALI-MOTIF-ATAS.webp` | Border damask emas ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `BALI-MOTIF-BAWAH.webp` | Border damask emas BAWAH (mirror) |
| **Gambar 4** (`{{asset_image_4}}`) | `BALI-COUPLE-1.webp` | Anggrek + pakis emas (aksen sudut section plum) |
| **Gambar 5** (`{{asset_image_5}}`) | `BALI-FALLBACK.webp` | Bingkai ornamen emas lengkap (cadangan — belum dipakai) |
| **Gambar 6** (`{{asset_image_6}}`) | `BALI-PATTERN.webp` | Pattern damask (overlay `multiply`) di atas **background plum** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `BALI-ICON.webp` | Menara **Meru / pura** (mahkota di cover/hero/closing/menu + siluet sidebar desktop) |
| **Gambar 8** (`{{asset_image_8}}`) | `BALI-COUPLE-2.webp` | Untaian anggrek ungu (aksen sudut frame cover) |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **`BALI-PATTERN.webp` terlihat PUTIH POLOS kalau dibuka sendiri.** Itu normal,
  bukan file rusak (sudah dicek: WebP VP8X 1000×1000, 93KB, isinya utuh).
  Motifnya sangat pucat dan baru muncul setelah di-`mix-blend-mode: multiply`
  di atas ground plum `#633750` — persis resep tema sumber. Jangan "diperbaiki".
- Video pembuka **bukan** aset slot: `https://assets.inviee.id/heritage/Bali-Motion-HD.mp4`
  dipasang langsung sebagai URL di `<source>` (sudah diverifikasi HTTP 200, 7.5MB).

## File lain (cadangan, belum dipakai)
- `BALI-COUPLE-3.webp`, `BALI-COUPLE-4.webp` — rangkaian anggrek varian lain
