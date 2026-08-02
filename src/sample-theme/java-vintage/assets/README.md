# Aset tema `java-vintage`

Tema ini adalah replika visual dari tema WordPress/Elementor **"Java vintage 2026"**
(invitingart.id). Ornamennya adalah gambar asli yang diunduh dari sana, lalu
dikompres dan **ditanam sebagai data URI di dalam `index.css`**.

## Kenapa data URI, bukan file?

Host hanya menyimpan `index.html`, `index.css`, dan `index.js` ke database
(Google Sheets) — folder `assets/` **tidak ikut ter-inject**. Kalau CSS menunjuk
ke path file lokal, gambarnya tidak akan pernah muncul di undangan yang live.

Batas ukuran CSS di backend adalah **550.000 karakter** (`splitStringIntoFields`
di `backend/Code.gs`: `css_template` + `css_extra_1..10`, masing-masing 50.000).
Aset saat ini ~356 KB data URI + ~34 KB CSS = **~390 KB**, masih aman.
Kalau menambah aset, jaga total `index.css` tetap di bawah 550 KB.

## Alur build

```bash
# 1. Kompres gambar sumber -> inline-assets.json (data URI base64)
node src/sample-theme/java-vintage/assets/build-assets.cjs

# 2. Bakar data URI itu ke dalam index.css
node src/sample-theme/java-vintage/assets/bake-css.cjs
```

`build-assets.cjs` butuh `sharp` (`npm install --no-save sharp`).

`bake-css.cjs` bisa dijalankan berulang: kalau placeholder `__MURAL_COVER__` dst.
sudah tergantikan, ia mengenali nilai lama dan menimpanya.

## Daftar aset

| Kunci | Berkas sumber | Dipakai untuk |
|---|---|---|
| `mural_cover` | `Artboard-1_11zon-3-1.webp` | latar sampul & penutup (joglo, wayang emas, bunga) |
| `mural_side` | `Artboard-3_11zon-3.webp` | latar panel kiri desktop & menu nav (candi, palem) |
| `orn_arch` | `Date-1.webp` | gapura bunga di belakang countdown |
| `orn_damask` | `ornmen.webp` | border damask emas atas/bawah section |
| `orn_frame` | `ththt.webp` | bingkai ukir mengelilingi kutipan |
| `orn_gold_oval` | `sdef.webp` | bingkai potret mempelai (lubang **oval**) |
| `orn_gold_rect` | `Layer-0d-2.webp` | bingkai kartu rekening (lubang **persegi**) |

> **Perhatian:** nama berkas sumber tidak menunjukkan bentuknya. `sdef.webp`
> itu bingkai **oval**, `Layer-0d-2.webp` itu bingkai **persegi** — sudah
> diperiksa visual, jangan tertukar lagi saat mengubah `build-assets.cjs`.

## Dua jebakan saat menyetel bingkai

1. **Rasio kotak harus sama dengan rasio asetnya.** `background-size: 100% 100%`
   akan melar mengikuti tinggi isi dan merusak ukirannya. Karena itu
   `.jv-quote-frame`, `.jv-gift-card`, dan `.jv-portrait` semuanya mengunci
   `aspect-ratio` ke dimensi asetnya.
2. **Damask harus dipotong tepat satu periode.** Periodenya 180px (strip asli
   1080px = 6 motif), diukur lewat autokorelasi profil kolom. Meleset sedikit
   saja, sambungan `background-repeat: repeat-x` terlihat sebagai garis.
