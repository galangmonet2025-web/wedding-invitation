# Betawi Heritage — Aset Gambar

Gambar dekorasi/latar khas Betawi ini **disalin dari tema sumber** (inviee —
angkatan upload `2025/02`) dan dipakai untuk membuat background & elemen Betawi
jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `Betawi-Backgroud.webp` | Latar utama (rumah kebaya + band tumpal emas) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `Betawi-Motif-Atas.webp` | Border motif **tumpal/pucuk rebung** ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `Betawi-Motif-Bawah.webp` | Border motif BAWAH (pasangan cermin vertikal) |
| **Gambar 4** (`{{asset_image_4}}`) | `Betawi-Couple-Belakang-2.webp` | Untaian bunga kuning aksen sudut **KIRI** (condong kiri, source: 25%) + sudut **KIRI-ATAS** frame cover |
| **Gambar 5** (`{{asset_image_5}}`) | `Betawi-Couple-Belakang-1.webp` | Untaian bunga kuning aksen sudut **KANAN** (condong kanan, source: 75%) + sudut **KANAN-BAWAH** frame cover |
| **Gambar 6** (`{{asset_image_6}}`) | `Betawi-Seamless-Pattern.webp` | Pattern motif (overlay `multiply`) di atas **background hijau** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `Betawi-Icon.webp` | **Siangko** (mahkota pengantin Betawi) + tutup kepala mempelai pria — mahkota di cover/hero/closing/menu + siluet sidebar desktop |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **PASANGAN CERMIN ASLI — jangan ditukar & jangan di-flip lewat CSS.**
  Source menyediakan artwork kiri & kanan terpisah (beda dari Minang/Bali yang
  cuma punya 1 gambar lalu dicerminkan `scaleX(-1)`):
  - slot **4** = `…-Belakang-2.webp` → condong **KIRI**
  - slot **5** = `…-Belakang-1.webp` → condong **KANAN**

  Perhatikan penomorannya **berlawanan dengan intuisi**: `-2` yang KIRI, `-1`
  yang KANAN (sudah diverifikasi dengan melihat gambarnya, bukan menebak dari
  nama file). Karena itu CSS tema ini **sengaja tidak** memakai `scaleX(-1)` di
  `.bw-spray-*` maupun `.bw-flower-*`. Kalau ditukar/dibalik, arah untaian
  bunganya jadi salah.
- **Hanya 7 slot — tidak ada aset bunga terpisah untuk frame cover.** Angkatan
  2025/02 tidak punya padanan "COUPLE-2" (yang di angkatan 2024/12 jadi bunga
  frame cover) dan tidak punya pasangan "Depan/Belakang" seperti Sunda (9 slot).
  Jadi frame cover **memakai ulang** slot 4 & 5 (tl=4, br=5), dengan ukuran yang
  dibedakan lewat CSS. Tema ini **tidak** mereferensikan `{{asset_image_8}}`
  maupun `{{asset_image_9}}`.
- **`Betawi-Seamless-Pattern.webp` terlihat PUTIH POLOS kalau dibuka sendiri.**
  Itu normal, bukan file rusak (sudah dicek: WebP VP8X 1000×1000, 35KB, isinya
  utuh). Motifnya baru muncul setelah di-`mix-blend-mode: multiply` di atas
  ground hijau `#2A623A` — persis resep tema sumber. **Jangan
  "diperbaiki"/dinaikkan kontrasnya** — itu justru merusak resep source.
- **Angka pattern**: `background-size: 150px auto` + `opacity: 0.3` +
  `mix-blend-mode: multiply`. Sunda yang memakai `200px` / `0.35` justru
  pengecualian — jangan menyalin angka dari tema saudaranya.
- **Nama file `Betawi-Backgroud.webp` memang typo** (kurang huruf `n`). Itu nama
  **ASLI** di source — jangan "dibetulkan", nanti tidak cocok lagi dengan
  catatan ini.
- **`Betawi-Fallback.webp` tidak dipakai** sebagai slot. Di source itu
  poster/fallback untuk video motion
  (`https://assets.inviee.id/heritage/Betawi-Motion-HD.mp4` — sudah dicek 200
  video/mp4). Disimpan di folder ini untuk referensi saja.
