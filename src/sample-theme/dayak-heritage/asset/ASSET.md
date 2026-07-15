# Dayak Heritage — Aset Gambar

Gambar dekorasi/latar khas Dayak ini **disalin dari tema sumber** (inviee —
upload angkatan `2025/02`) dan dipakai untuk membuat background & elemen Dayak
jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `Dayak-Background.webp` | Latar utama (rumah betang + bulu enggang + band ukir emas) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `Dayak-Motif-Atas.webp` | Border motif ukir ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `Dayak-Motif-Bawah.webp` | Border motif ukir BAWAH (pasangan cermin vertikal) |
| **Gambar 4** (`{{asset_image_4}}`) | `Dayak-Couple-Belakang-2.webp` | Untaian bunga lili aksen sudut **KIRI** (condong kiri, dipasang di 25%) — **plus** sudut **KIRI-ATAS** frame cover |
| **Gambar 5** (`{{asset_image_5}}`) | `Dayak-Couple-Belakang-1.webp` | Untaian bunga lili aksen sudut **KANAN** (condong kanan, dipasang di 75%) — **plus** sudut **KANAN-BAWAH** frame cover |
| **Gambar 6** (`{{asset_image_6}}`) | `Dayak-Seamless-Pattern.webp` | Pattern motif (overlay `multiply`) di atas **ground charcoal** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `Dayak-Icon.webp` | **Mahkota bulu enggang** (headdress pengantin Dayak) — mahkota di cover/hero/closing/menu + siluet sidebar desktop |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **HANYA 7 SLOT — jangan menambah `{{asset_image_8}}`/`{{asset_image_9}}`.**
  Angkatan aset ini (2025/02) **tidak punya** bunga terpisah untuk frame cover
  (tidak ada padanan `…-Couple-2` seperti angkatan 2024/12, dan tidak ada
  pasangan `Depan`/`Belakang` seperti Sunda). Karena itu frame cover **memakai
  ulang** pasangan cermin slot **4 & 5** — beda ukuran/rotasi saja. Menambah
  referensi slot 8/9 = dekorasi kosong (tak ada filenya).
- **Pasangan cermin asli — jangan ditukar & jangan di-flip lewat CSS.**
  Source Dayak menyediakan artwork kiri & kanan terpisah:
  - slot **4** = `Dayak-Couple-Belakang-2.webp` → condong **KIRI** (25%)
  - slot **5** = `Dayak-Couple-Belakang-1.webp` → condong **KANAN** (75%)

  Perhatikan penomorannya **terbalik dari intuisi** (`-2` = kiri, `-1` = kanan);
  ini sudah diverifikasi dengan melihat gambarnya, bukan menebak dari namanya.
  Karena itu CSS tema ini **sengaja tidak** memakai `scaleX(-1)` di
  `.dy-spray-*` maupun `.dy-flower-*`. Kalau ditukar/dibalik, arah untaian
  bunganya jadi salah.
- **`Dayak-Seamless-Pattern.webp` terlihat PUTIH POLOS kalau dibuka sendiri.**
  Itu normal, bukan file rusak (sudah dicek: WebP VP8X 1000×681, 77KB, isinya
  utuh). Motifnya baru muncul setelah di-`mix-blend-mode: multiply` di atas
  ground charcoal `#1B1B1B` — persis resep tema sumber. **Jangan
  "diperbaiki"/dinaikkan kontrasnya** — itu justru merusak resep source.
- **Angka pattern: `background-size: 150px auto` + `opacity: 0.3`** (+
  `mix-blend-mode: multiply`). Sunda memakai `200px`/`0.35` — itu pengecualian
  milik Sunda; jangan "diseragamkan" ke tema ini.
- **`Dayak-Fallback.webp` tidak dipakai** sebagai slot. Di source itu
  poster/fallback untuk video motion
  (`https://assets.inviee.id/heritage/Dayak-Motion-HD.mp4`). Disimpan di folder
  ini untuk referensi saja.
