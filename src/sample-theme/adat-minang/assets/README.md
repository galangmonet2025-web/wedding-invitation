# Adat Minang — Panduan Asset

Tema ini memakai **fitur Asset Media Tema** (tab Setup di editor). Ornamen
TIDAK lagi dipanggil dari folder ini lewat path lokal — folder `assets/` di sini
hanya menyimpan **contoh file CC0 yang siap Anda upload**.

## Cara pakai (tinggal copy-paste tema, lalu upload ornamen)

1. Buat/edit tema, paste `index.html`, `index.css`, `index.js` adat-minang.
2. Buka tab **Setup → Asset Media Tema**, upload 4 ornamen dengan urutan ini
   (media_code dibuat otomatis berurut: image_1, image_2, …):

   | Upload ke slot | Dipakai di       | Variabel di tema     | File contoh di folder ini      |
   |----------------|------------------|----------------------|--------------------------------|
   | image_1        | header cover     | `{{asset_image_1}}`  | `ornament-tantadu-bungo.svg`   |
   | image_2        | divider Mempelai | `{{asset_image_2}}`  | `ornament-bada-mudiak.svg`     |
   | image_3        | divider Waktu    | `{{asset_image_3}}`  | `ornament-kudo.svg`            |
   | image_4        | band Wedding Gift| `{{asset_image_4}}`  | `songket-cloth.jpg`            |

   > Upload sesuai urutan agar kode-nya pas (image_1 dulu, lalu image_2, dst).
   > Disarankan ornamen berupa **PNG transparan berwarna emas** agar langsung
   > tampil bagus di latar gelap.

3. Simpan. Tema langsung jadi — tidak perlu penyesuaian manual lagi.

## Catatan
- **Foto mempelai/cover/background/closing** TETAP `{{photo_*}}` — diisi tiap
  pasangan lewat pengaturan konten, bukan asset tema.
- **Musik** pakai `{{link_backsound_music}}` (diisi tenant), bukan asset.
- Class `minang-ornament-gold` tidak me-recolor apa pun secara default; kalau
  Anda upload line-art hitam dan ingin di-tint emas via CSS, tambahkan filter
  di `.minang-ornament-gold` (lihat `index.css`).

## Asal file contoh (CC0 / Public Domain, Wikimedia Commons)
Ornamen seri "Ragam Hias Minangkabau" & foto kain songket — bebas dipakai
komersial. Boleh Anda ganti dengan ornamen milik sendiri.
