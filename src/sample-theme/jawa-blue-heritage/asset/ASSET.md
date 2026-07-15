# Jawa Blue Heritage ("Blue Javanese") — Aset Gambar

Gambar dekorasi/latar tema ini **disalin dari tema sumber** (inviee, angkatan
**2025/07-08**) dan dipakai untuk membuat nuansa Jawa biru-abu (`#4E647A`) —
joglo, wayang gunungan, dan batik kawung.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `design-jawa-biru.webp` | Latar SELURUH halaman (`.jb-page-bg`, `position: fixed`) — joglo + pohon + bunga, versi **PEKAT**. Resep source: `background-position: 50% 75%`, `cover` |
| **Gambar 2** (`{{asset_image_2}}`) | `cover-jawa-biru.webp` | **Frame COVER** (`.jb-cover-art`) — versi **PUCAT**: wayang gunungan kiri/kanan + joglo. Resep source: `center center`, `no-repeat`, `cover` |
| **Gambar 3** (`{{asset_image_3}}`) | `batik-overlay3.webp` | Overlay **batik kawung** (`.jb-red-bg`) di atas panel flat `#4E647A` — section Waktu&Tempat + Live Streaming + Wedding Gift. Resep source: `repeat`, `background-size: 35% auto`, `opacity: 0.15`, **TANPA** `mix-blend-mode` |
| **Gambar 4** (`{{asset_image_4}}`) | `fallback-jawa-biru.webp` | **Poster/fallback video** motion (`<video poster>`) — lihat catatan di bawah |
| **Gambar 5** (`{{asset_image_5}}`) | `bunga-jawa-biru.webp` | Untaian bunga anggrek + bunga biru — aksen sudut frame cover, dipakai **2×** (`.jb-flower-tl` & `.jb-flower-br`) |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **Slot 5 dipakai DUA KALI — karena itu `.jb-flower-br` WAJIB `scaleX(-1)`.**
  Source jawa-blue cuma menyediakan **satu** untaian bunga (`bunga-jawa-biru.webp`),
  bukan pasangan cermin. Jadi HTML memasang gambar yang sama di sudut kiri-atas
  dan kanan-bawah frame cover, lalu **CSS yang mencerminkannya**
  (`transform: rotate(8deg) scaleX(-1)` di `.jb-flower-br`).
  Ini **kebalikan** dari `sunda-heritage`/`jawa-heritage`: di sana source memberi
  **dua artwork cermin asli**, jadi `scaleX(-1)` justru dilarang (kalau dipakai,
  artwork yang sudah benar malah terbalik). Aturannya: **1 gambar dipakai 2× →
  perlu `scaleX`; 2 artwork cermin asli → jangan `scaleX`.**

- **Slot 4 bukan dekorasi.** `fallback-jawa-biru.webp` adalah **poster/frame diam**
  untuk video motion
  (`https://assets.inviee.id/motion/Blue-Javanese-HD-1.mp4` — perhatikan
  path-nya **`/motion/`**, bukan `/heritage/` seperti tema saudaranya). Dipasang
  di atribut `poster` `<video>` supaya section opening tidak hitam sebelum klip
  termuat. Kalau slot 4 dikosongkan, poster-nya jatuh ke foto tenant.

- **Tema ini TIDAK punya motif band & TIDAK punya mahkota** — beda dari saudara
  heritage-nya (`minang`/`bali`/`jawa`/`sunda`/`banjar`/dst):
  - **Tak ada band motif atas/bawah** → tak ada `.jb-motif-*`, dan **tak ada
    padding `.has-motif` 165px** (padding itu gunanya menghindari band; tanpa
    band, sisanya cuma celah kosong menganga).
  - **Tak ada mahkota/siger/ICON** → tak ada `.jb-siger*`, dan sidebar desktop
    tak punya siluet mahkota.
  - **Tak ada aksen sudut section** (`.jb-spray-l/-r`).

  Source-nya memang tidak menyediakan asetnya sama sekali (angkatan 2025/07-08
  berskema beda). **Jangan** menambahkannya "supaya seragam dengan tema saudara".

- **Panel `#4E647A` FLAT, bukan radial.** Source ini **tidak** memakai
  `radial-gradient` sama sekali, dan overlay batiknya **tanpa** `mix-blend-mode:
  multiply` (`35% auto` / `opacity .15`). Resep `150-200px` + `multiply` milik
  Minang/Bali/Sunda **bukan** resep di sini — jangan diseragamkan.

- **`batik-overlay3.webp` memang pucat** (kawung abu-abu muda di atas putih).
  Itu normal: motifnya baru terbaca setelah ditumpuk `opacity: .15` di atas
  ground biru `#4E647A`. Jangan "diperbaiki"/dinaikkan kontrasnya.
