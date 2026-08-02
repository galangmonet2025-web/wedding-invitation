# Java Vintage — Aset Gambar Jawa

Ornamen Jawa di section **Konfirmasi Kehadiran** (`#rsvp`) dan **Ucapan & Doa**
(`#wishes`) memakai artwork asli yang **dipinjam dari tema `jawa-heritage`**
(sumbernya inviee — `hi.inviee.id/wp-content/uploads/2024/12/`).

## Kenapa lewat slot, bukan ditanam di CSS

`index.css` tema ini **sudah memuat 7 aset data-URI** (mural sampul, mural panel,
5 ornamen ukir) dan besarnya ±420 KB. Batas simpan backend adalah **550.000
huruf per kolom** (`splitStringIntoFields` di `Code.gs`). Menanam 6 gambar batik
lagi sebagai data-URI akan menembus batas itu.

Karena itu dipakai variabel **`{{asset_image_N}}`**: gambar diunggah ke slot
**Media Aset** milik tema, lalu host yang menyisipkan URL-nya saat render.

> **PENTING:** URL-nya **tidak bisa** ditulis di `index.css` — `templateParser`
> hanya memproses `{{var}}` di **HTML**. Karena itu tiap ornamen memakai
> atribut `style="background-image: url(...)"` inline di `index.html`, sedangkan
> CSS hanya mengatur ukuran/posisinya.

## Peta slot (unggah ke Theme Editor → Media Aset)

| Slot | File | Fungsi |
|---|---|---|
| **Gambar 2** (`{{asset_image_2}}`) | `JAWA-MOTIF-ATAS.webp` | Pita batik kawung **ATAS** — dipakai di `#rsvp` & `#wishes` |
| **Gambar 3** (`{{asset_image_3}}`) | `JAWA-MOTIF-BAWAH.webp` | Pita batik kawung **BAWAH** (cermin) — dipakai di `#rsvp` & `#wishes` |
| **Gambar 4** (`{{asset_image_4}}`) | `JAWA-COUPLE-1.webp` | Untaian gunungan sudut **KIRI** (miring kiri) — `#rsvp` |
| **Gambar 5** (`{{asset_image_5}}`) | `JAWA-COUPLE-3.webp` | Untaian gunungan sudut **KANAN** (miring kanan) — `#rsvp` |
| **Gambar 7** (`{{asset_image_7}}`) | `JAWA-GUNUNGAN.webp` | Gunungan wayang tegak — mahkota judul `#wishes` |

Nomor slot mengikuti penomoran `jawa-heritage` supaya konsisten kalau kelak
kedua tema dipakai bergantian. Slot 1, 6, 8 sengaja dilewati (belum dipakai di
tema ini).

**Kalau slot dikosongkan**, `{{var}}` jadi string kosong → ornamennya sekadar
tidak muncul. Tema tetap jalan, tidak error.

## Catatan penting

- **Slot 4 & 5 adalah PASANGAN CERMIN ASLI — jangan ditukar.** Sumber Jawa
  menyediakan dua artwork terpisah (`COUPLE-1` miring KIRI, `COUPLE-3` miring
  KANAN), jadi CSS di sini **sengaja tidak** memakai `scaleX(-1)`. Kalau
  ditukar atau dibalik, arah miring gunungannya jadi salah.
- **Batik di-filter, bukan dipakai apa adanya.** Aset aslinya berwarna
  merah-muda/sage yang kuat — cocok di `jawa-heritage` yang berlatar sogan
  gelap, tapi terlalu ramai di atas latar krem tema ini. `.jv-motif` memakai
  `opacity: .38` + `sepia(.7) saturate(1.25) hue-rotate(-12deg)` untuk
  menariknya ke rona emas. Jangan dihapus filternya kalau tak ingin motifnya
  bentrok dengan palet emas-maroon.
- `JAWA-PATTERN.webp` ikut disalin sebagai cadangan tapi **belum dipakai** —
  ia butuh `mix-blend-mode: multiply` di atas ground sogan gelap; tema ini
  tidak punya section sogan.

## Berkas di folder ini

| File | Dipakai? |
|---|---|
| `JAWA-MOTIF-ATAS.webp` | ya — slot 2 |
| `JAWA-MOTIF-BAWAH.webp` | ya — slot 3 |
| `JAWA-COUPLE-1.webp` | ya — slot 4 |
| `JAWA-COUPLE-3.webp` | ya — slot 5 |
| `JAWA-GUNUNGAN.webp` | ya — slot 7 |
| `JAWA-PATTERN.webp` | belum (cadangan) |
