# Bugis Heritage — Aset Gambar

Gambar dekorasi/latar khas Bugis ini **disalin dari tema sumber** (inviee —
angkatan upload `2024/12`, skema nama `BUGIS-*.webp`) dan dipakai untuk membuat
background & elemen Bugis jadi kental.

## Cara pakai (PENTING)

CSS tema **tidak** di-parse (variabel `{{...}}` hanya jalan di HTML), jadi semua
gambar aset direferensikan lewat variabel **`{{asset_image_N}}`** di dalam
`index.html` (inline style). Kamu tinggal **upload tiap file di bawah ke slot
gambar (image) sesuai nomornya** di Theme Editor.

| Slot (upload ke) | File | Fungsi di tema |
|---|---|---|
| **Gambar 1** (`{{asset_image_1}}`) | `BUGIS-BACKGROUND.webp` | Latar utama (rumah panggung **bola/saoraja** hijau + pepohonan & bunga) di belakang SELURUH undangan |
| **Gambar 2** (`{{asset_image_2}}`) | `BUGIS-MOTIF-ATAS.webp` | Border motif **tumpal** ATAS tiap section ber-motif |
| **Gambar 3** (`{{asset_image_3}}`) | `BUGIS-MOTIF-BAWAH.webp` | Border motif BAWAH (pasangan cermin vertikal) |
| **Gambar 4** (`{{asset_image_4}}`) | `BUGIS-COUPLE-1.webp` | Untaian bunga (mawar + pakis emas) aksen sudut **KIRI** (condong kiri, source: 25% 60%) |
| **Gambar 5** (`{{asset_image_5}}`) | `BUGIS-COUPLE-3.webp` | Untaian bunga aksen sudut **KANAN** (condong kanan, source: 75% 60%) |
| **Gambar 6** (`{{asset_image_6}}`) | `BUGIS-PATTERN.webp` | Pattern tenun **lipa' sabbe** (overlay `multiply`) di atas **background hijau** section Waktu&Tempat + Live Streaming + Wedding Gift |
| **Gambar 7** (`{{asset_image_7}}`) | `BUGIS-ICON.webp` | **Mahkota emas + songkok recca'** (mahkota pengantin Bugis) — mahkota di cover/hero/closing/menu + siluet sidebar desktop |
| **Gambar 8** (`{{asset_image_8}}`) | `BUGIS-COUPLE-2.webp` | Untaian bunga mawar besar — frame cover, dipakai **dua kali** (kiri-atas & kanan-bawah) |

> Nomor slot bebas diubah asal **konsisten** dengan yang tertulis di
> `index.html`. Kalau slot dikosongkan, elemen dekorasinya cuma tidak muncul —
> tema tetap jalan (tidak error), karena `{{var}}` yang kosong → string kosong.

## Catatan penting

- **Slot 4 & 5 = PASANGAN CERMIN ASLI — jangan ditukar & jangan di-flip lewat
  CSS.** Source Bugis menyediakan artwork kiri & kanan terpisah
  (`BUGIS-COUPLE-1` condong kiri, `BUGIS-COUPLE-3` condong kanan). Karena itu
  `.bu-spray-l` / `.bu-spray-r` **sengaja tidak** memakai `scaleX(-1)`. Kalau
  ditambahkan, artwork yang sudah benar malah terbalik.

- **⚠️ Slot 8 KEBALIKANNYA — WAJIB di-flip lewat CSS.** Untuk frame cover source
  cuma menyediakan **satu** rangkaian bunga (`BUGIS-COUPLE-2.webp`), dipakai di
  kedua sudut. Jadi `.bu-flower-br` **harus** memakai `transform: rotate(8deg)
  scaleX(-1)`. Jangan "diseragamkan" dengan aturan slot 4/5 di atas — dua peran
  ini memang beda perlakuan. (Beda dari Sunda, yang punya artwork cermin
  terpisah untuk frame cover sehingga slot-nya sampai 9.)

- **⚠️ AWAS TERTUKAR DENGAN BATAK.** `BUGIS-COUPLE-1.webp` **byte-identik**
  dengan `BATAK-COUPLE-3.webp` (83.228 bytes) — inviee memakai artwork yang sama
  dengan penomoran **berbeda**. Peta slot di source:
  - **Bugis**: COUPLE-**1** @25% (kiri), COUPLE-**3** @75% (kanan) ← tabel di atas
  - **Batak**: COUPLE-**3** @25% (kiri), COUPLE-**1** @75% (kanan)

  Menyalin peta slot Batak ke sini (atau sebaliknya) = untaian bunga terbalik
  arah. Sudah diverifikasi dari CSS source; **jangan disamakan**.

- **`BUGIS-PATTERN.webp` BUKAN pattern pucat.** Beda dari
  `MINANG-PATTERN`/`BALI-PATTERN`/`SUNDA-PATTERN-2` (yang terlihat putih polos
  dan sering dikira rusak), pattern Bugis ini **zigzag hitam-putih kontras
  tinggi** (motif tenun ikat lipa' sabbe, WebP VP8 1600×900, 128KB). Jadi
  catatan "kelihatan putih polos, jangan dinaikkan kontrasnya" milik tema
  saudaranya **tidak berlaku di sini** — memang begitu aslinya. Yang tetap
  berlaku: **jangan diubah/di-retouch**; resep `opacity: 0.3` +
  `mix-blend-mode: multiply` di atas ground hijau `#29421C` yang meredamnya jadi
  anyaman hijau-gelap. Persis source.

- **Angka pattern**: `background-size: 150px auto` + `opacity: 0.3` — sama
  dengan Minang/Bali/Jawa. **Sunda** (`200px` / `0.35`) justru pengecualian.
  Disalin apa adanya dari source Bugis; jangan diseragamkan dengan Sunda.

- **`BUGIS-FALLBACK-1.webp` tidak dipakai** sebagai slot aset. Di source itu
  poster/fallback untuk video motion
  (`https://assets.inviee.id/heritage/Bugis-Motion-HD.mp4`). Disimpan di folder
  ini untuk referensi saja.
