# Minang Heritage — Panduan Asset

Tema ini adalah hasil clone visual dari undangan **"Minang Heritage"**
(maroon + songket gold). Tema memakai **fitur Asset Media Tema** (tab Setup di
editor). Folder `assets/` menyimpan file contoh yang siap di-upload.

## Cara pakai

1. Buat/edit tema, paste `index.html`, `index.css`, `index.js` minang-heritage.
2. Buka tab **Setup → Asset Media Tema**, upload 4 ornamen dengan urutan ini
   (media_code dibuat otomatis berurut: image_1, image_2, …):

   | Upload ke slot | Dipakai di               | Variabel di tema     | File contoh di folder ini   |
   |----------------|--------------------------|----------------------|-----------------------------|
   | image_1        | header cover / closing   | `{{asset_image_1}}`  | `MINANG-ICON.webp`          |
   | image_2        | divider Mempelai         | `{{asset_image_2}}`  | `MINANG-COUPLE-2.webp`      |
   | image_3        | divider Waktu & Tempat   | `{{asset_image_3}}`  | `MINANG-COUPLE-4.webp`      |
   | image_4        | divider Doa Untuk Pengantin | `{{asset_image_4}}` | `MINANG-ICON.webp`          |

   > `MINANG-ICON.webp` = siluet Rumah Gadang (gonjong) emas.
   > `MINANG-COUPLE-2/4.webp` = ilustrasi bunga botani merah marun.

3. **Foto cover/hero/background/closing** diisi tenant lewat pengaturan konten
   (`{{photo_*}}`). Foto contoh pasangan Minang: `Minang-14-fi.webp` — pakai
   sebagai `photo_cover` / `photo_hero_cover` saat uji coba.
4. **Musik** pakai `{{link_backsound_music}}` (diisi tenant), bukan asset.

## Catatan tentang bagian statis (disalin apa adanya)

Bagian berikut **belum ada di kontrak variabel dinamis**, jadi disalin apa
adanya dari undangan sumber. Edit manual di `index.html` bila perlu:

- **Ngunduh Mantu** (acara ketiga di section Waktu & Tempat)
- **Dress Code** (swatch warna)
- **Doa Untuk Pengantin** (teks Arab + latin + arti)
- **Turut Mengundang** (daftar nama tamu kehormatan)

## Asal file contoh
Ornamen & ilustrasi Minangkabau bawaan dari paket undangan sumber. Boleh
diganti dengan ornamen milik sendiri (disarankan PNG/WebP transparan emas).
