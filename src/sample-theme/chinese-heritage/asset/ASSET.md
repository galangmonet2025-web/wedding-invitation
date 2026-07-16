# Chinese Heritage — Aset Gambar

Gambar dekorasi/latar tema ini **disalin dari tema sumber** (inviee, angkatan
**2025/07-08** — seangkatan `jawa-blue-heritage`) dan dipakai untuk membuat
nuansa Tionghoa merah-emas (`#741C1B` + `#D8C278`) — lampion, burung bangau,
peony, dan gelombang seigaiha.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `chinese-bg-all.webp` | Latar SELURUH halaman (`.cn-page-bg`, `position: fixed`) — pemandangan: burung bangau, peony, lampion, matahari merah. Resep source: `background-position: 50% 75%`, `background-size: cover`, `background-color: #000000` |
| **Gambar 2** (`{{asset_image_2}}`) | `chinese-bg-cover.webp` | **Frame COVER** (`.cn-cover-art`) — bingkai arch/lengkung merah; lampion, peony & bangau di tepinya, **tengahnya PUCAT** supaya teks terbaca. Resep source: `center center`, `no-repeat`, `cover` |
| **Gambar 3** (`{{asset_image_3}}`) | `chinese-overlay.webp` | Overlay **seigaiha** (gelombang) (`.cn-red-bg`) di atas panel flat merah `#741C1B` — section Waktu&Tempat + Live Streaming + Wedding Gift. Resep source: `repeat`, `background-size: 150% auto`, `opacity: 0.6`, **TANPA** `mix-blend-mode` |
| **Gambar 4** (`{{asset_image_4}}`) | `chinese-fallback.webp` | **Poster/fallback video** motion (`<video poster>`) — lihat catatan di bawah |

> Tema ini memakai **4 slot saja** (`{{asset_image_1}}`..`{{asset_image_4}}`).
> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **Slot 4 bukan dekorasi.** `chinese-fallback.webp` adalah **poster/frame diam**
  untuk video motion
  (`https://assets.inviee.id/motion/Chinese-Heritage-HD-1.mp4` — perhatikan
  path-nya **`/motion/`**, bukan `/heritage/` seperti tema saudara heritage-nya).
  Dipasang di atribut `poster` `<video>` supaya section opening tidak hitam
  sebelum klip termuat. Kalau slot 4 dikosongkan, poster-nya jatuh ke foto
  tenant. **Jangan** dipakai sebagai gambar hiasan biasa.

- **`chinese-overlay.webp` memang terlihat abu-abu pucat — itu BENAR, jangan
  dinaikkan kontrasnya.** Dibuka sendiri, file ini cuma gelombang seigaiha
  abu-abu muda di atas putih dan terlihat seperti aset "rusak"/pudar. Itu
  normal: motifnya baru terbaca setelah ditumpuk `opacity: .6` di atas ground
  merah `#741C1B`. Menaikkan kontras/menggantinya justru **merusak** resep
  source. (Bandingkan: `batik-overlay3.webp` milik jawa-blue juga pucat.)

- **`opacity: .6` itu memang tinggi** (jawa-blue cuma `.15`). Sengaja — asetnya
  jauh lebih pucat dan skalanya `150% auto` (bukan `35% auto`), jadi angka
  jawa-blue akan bikin gelombangnya hilang sama sekali. Angka ini diverifikasi
  dari `post-57022.css`; jangan diselaraskan dengan tema saudara.

- **Tema ini TIDAK punya motif band, TIDAK punya mahkota, dan TIDAK punya bunga
  sudut** — beda dari saudara heritage-nya (`minang`/`bali`/`jawa`/`sunda`/
  `banjar`/dst) **dan** beda dari `jawa-blue`:
  - **Tak ada band motif atas/bawah** → tak ada `.cn-motif-*`, dan **tak ada
    padding `.has-motif` 165px** (padding itu gunanya menghindari band; tanpa
    band, sisanya cuma celah kosong menganga).
  - **Tak ada mahkota/siger/ICON** → tak ada `.cn-siger*`, dan sidebar desktop
    tak punya siluet mahkota.
  - **Tak ada aksen sudut section** (`.cn-spray-l/-r`).
  - **Tak ada untaian bunga sudut frame cover** (`.cn-flower-tl/-br`) — ini
    yang membedakannya dari `jawa-blue`, yang punya 1 aset bunga dipakai 2×
    dengan `scaleX(-1)`. Source chinese **tidak menyediakan aset bunga sama
    sekali**, jadi div + CSS-nya dibuang seluruhnya. **Bingkai cover dikerjakan
    slot 2 sendirian.**

  Source-nya memang tidak menyediakan aset-aset itu. **Jangan** menambahkannya
  "supaya seragam dengan tema saudara".

- **Panel `#741C1B` FLAT, bukan radial.** Source ini **tidak** memakai
  `radial-gradient` sama sekali, dan overlay seigaiha-nya **tanpa**
  `mix-blend-mode: multiply`. Resep `150-200px` + `multiply` milik
  Minang/Bali/Sunda **bukan** resep di sini — jangan diseragamkan.

- **Dekorasinya saja yang Tionghoa.** Copy source-nya adalah undangan
  **Kristen** (`Holy Matrimony`, `~ 1 Corinthians 13:4-8 ~`) dan **tidak**
  memakai istilah adat Tionghoa (sangjit, tea pai, cheng). Yang "Tionghoa"
  cukup lampion, bangau, peony, seigaiha, dan palet merah-emas. Jangan
  menambahkan istilah budaya yang tidak ada di source.
