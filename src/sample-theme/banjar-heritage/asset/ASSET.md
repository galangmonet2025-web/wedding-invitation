# Banjar Heritage — Aset Gambar

Gambar dekorasi/latar khas Banjar ini **disalin dari tema sumber** (inviee —
angkatan upload `2025/02`) dan dipakai untuk membuat nuansa Banjar jadi kental:
mahkota **gajah gamuling**, motif **sasirangan**, dan ground **maroon**.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `Banjar-Background.webp` | Latar utama di belakang SELURUH undangan (`.bj-page-bg`, `position: fixed`) |
| **Gambar 2** (`{{asset_image_2}}`) | `Banjar-Motif-Atas.webp` | Border motif ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `Banjar-Motif-Bawah.webp` | Border motif BAWAH (pasangan vertikal dari Motif-Atas) |
| **Gambar 4** (`{{asset_image_4}}`) | `Banjar-Couple-Belakang-2.webp` | Untaian bunga aksen sudut **KIRI** (source: 25%) **+** bunga frame cover **KIRI-ATAS** |
| **Gambar 5** (`{{asset_image_5}}`) | `Banjar-Couple-Belakang-1.webp` | Untaian bunga aksen sudut **KANAN** (source: 75%) **+** bunga frame cover **KANAN-BAWAH** |
| **Gambar 6** (`{{asset_image_6}}`) | `Banjar-Seamless-Pattern.webp` | Pattern motif (overlay `multiply`) di atas **ground maroon** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `Banjar-Icon.webp` | **Mahkota gajah gamuling** — mahkota di cover/hero/closing/menu + siluet sidebar desktop |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **Pasangan cermin asli — jangan ditukar & jangan di-flip lewat CSS.**
  Slot **4 & 5** (`…-Belakang-2` / `…-Belakang-1`) adalah artwork kiri & kanan
  yang **sudah saling cermin** dari source. Karena itu CSS tema ini **sengaja
  tidak** memakai `scaleX(-1)` di `.bj-spray-*` maupun `.bj-flower-*`. Kalau
  ditukar atau di-flip lagi, arah untaian bunganya jadi salah.
  - `Belakang-2` = **KIRI** (source memasangnya di 25%)
  - `Belakang-1` = **KANAN** (source memasangnya di 75%)

  > Awas: penomorannya terasa terbalik (2 di kiri, 1 di kanan) — itu **memang**
  > begitu di source. Jangan "dirapikan".

- **Cuma 7 slot — angkatan aset ini TIDAK punya bunga terpisah untuk frame
  cover.** Beda dari angkatan 2024/12 (Batak/Bugis) yang punya `COUPLE-2`
  khusus untuk peran itu. Jadi frame cover **memakai ULANG** slot 4 & 5
  (`tl` = slot 4, `br` = slot 5). Tema ini **tidak** mereferensikan
  `{{asset_image_8}}`/`{{asset_image_9}}` sama sekali.

- **`Banjar-Seamless-Pattern.webp` bisa terlihat pucat/nyaris polos kalau dibuka
  sendiri.** Itu **normal, bukan file rusak**. Motifnya baru muncul setelah
  di-`mix-blend-mode: multiply` di atas ground maroon `#361111` — persis resep
  tema sumber. **Jangan "diperbaiki"/dinaikkan kontrasnya** — itu justru merusak
  resep source.

- **Angka pattern tema ini: `background-size: 150px auto` + `opacity: 0.3`**
  (+ `mix-blend-mode: multiply`). Sunda **berbeda sendiri** (200px / 0.35) —
  kerangka tema ini di-clone dari Sunda, jadi angka itu **wajib dikembalikan**
  ke 150/0.3. Jangan menyalin angka dari tema saudara tanpa cek source.

- **`Banjar-Fallback.webp` tidak dipakai** sebagai slot aset. Di source itu
  poster/fallback untuk video motion
  (`https://assets.inviee.id/heritage/Banjar-Motion-HD.mp4`). Disimpan di folder
  ini untuk referensi saja.
