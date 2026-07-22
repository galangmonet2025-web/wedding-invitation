# Aset sprite — pixel-wedding-run

## Sumber & lisensi

**Pixel Adventure 1** — Pixel Frog
https://pixelfrog-assets.itch.io/pixel-adventure-1

Lisensi, dikutip persis dari halaman aset:

> "These assets are released under a Creative Commons Zero (CC0) license.
> You can distribute, remix, adapt, and build upon the material in any medium
> or format, even for commercial purposes. Attribution is not required."

**CC0 = boleh dipakai komersial, boleh dimodifikasi, atribusi TIDAK wajib.**
Aman untuk SaaS berbayar multi-tenant ini. Atribusi tetap dicantumkan di sini
sebagai catatan asal-usul, bukan karena diwajibkan.

### Yang TIDAK boleh masuk ke sini

Sprite hasil rip dari game komersial (Super Mario Bros, Metal Slug, One Piece,
dsb.) **tidak boleh** ditaruh di folder ini walaupun ditemukan di repo
berlisensi MIT. Lisensi MIT sebuah repo hanya menutupi KODE yang ditulis
pemiliknya — bukan art milik pihak ketiga di dalamnya. Tema ini dijual ke
tenant berbayar, jadi pelanggarannya jatuh ke bisnis ini.

## CARA MEMASANG

Sekarang **hanya SATU berkas** yang perlu diunggah: `assets/sprite-sheet.png`.
Unggah lewat **Theme Editor → Asset Media** sebagai berkas **PERTAMA**, supaya
host mengisinya ke `{{asset_image_1}}`.

Peta koordinatnya (`assets/sprite-map.json`) **tidak perlu diunggah** — isinya
sudah ikut disuntikkan ke `index.js` sebagai `SHEET_MAP`. Ini perlu karena
ThemeWrapper host cuma menerima 3 string (html/css/js); tema tidak punya berkas
pendamping yang bisa di-`fetch()`.

### Bentuk sheet

- **2048×1475**, **773 kotak**, **175 kelompok**, ~143 kB
- tiap sprite berada di dalam kotak **berbingkai ungu #a020f0 setebal 1px**
- antar kotak diberi jarak 6px
- **nomor tercetak di bawah tiap kotak** = nilai `i` di sprite-map.json

Koordinat di peta menunjuk ke **ISI** kotak — bingkai ungu sudah dikecualikan
saat peta dibuat, jadi engine tidak perlu memangkas apa pun.

### Kalau sheet belum diunggah

`src` tetap berisi teks `{{asset_image_1}}`. Engine mendeteksinya dan
**seluruh** sprite memakai art prosedural, jadi undangan yang sudah live tidak
rusak.

### Mengubah gambarnya

Edit `assets/sprite-sheet.png` lalu unggah ulang — selama **ukuran dan posisi
kotaknya tidak berubah**, tidak ada langkah lain.

Kalau susunannya ikut berubah, bangun ulang peta:

```bash
node assets/build-sheet.cjs    # tulis ulang PNG + sprite-map.json
node assets/inline-map.cjs     # suntik peta ke index.js (SHEET_MAP)
```

Lupa menjalankan `inline-map.cjs` = koordinat inline jadi basi dan sprite
terpotong di tempat yang salah. Tes **T38h** menangkap ini.

## DIALOG "GANTI SPRITE"

Panel tuning (ikon bintang) → tombol **Ganti sprite…**

- **kiri** = daftar objek game yang bisa diganti
- **kanan** = pilihan sprite dari sheet, lengkap dengan nomornya
- pilihan disaring per jenis (karakter/musuh/tile/item); tombol
  **Tampilkan semua** melepas saringan
- **slider Ukuran** untuk memperbesar/memperkecil objek (40%–250%)
- pilihan disimpan di localStorage (`pwr_swap_v1`, `pwr_scale_v1`), jadi
  bertahan setelah muat ulang
- tekan **Terapkan** untuk membangun ulang stage dengan sprite baru

### Slider ukuran: hitbox IKUT berubah

Memperkecil sprite **juga memperkecil kotak tumbukannya**, jadi ruang yang
dipakai objek di dunia ikut menyusut. Ini disengaja: kalau hanya gambarnya
yang mengecil sementara hitbox tetap besar, bos kecil masih menabrak dari
jauh.

Mekanismenya: ukuran tekstur dihitung dari `sizeOf()`, dan **semua** hitbox
diturunkan dari ukuran tekstur, bukan angka mati —

| Objek | Dulu | Sekarang |
|---|---|---|
| Pemain | `setSize(30,54).setOffset(9,14)` | `setPlayerBody()` → rasio 30/48 × 54/68 |
| Musuh | `ENEMY_BODY[type]` piksel mati | `enemyBodySize()` → rasio terhadap tekstur |
| E5 rusak | `setSize(32,16)` | diturunkan dari `e.width`/`e.height` |

### Susunan RANGKA (deret kotak di dialog)

Tiap objek game adalah satu **slot** (`ANIM_SLOTS` di index.js). Dialog
menampilkan **susunan rangkanya apa adanya**: satu kotak per rangka yang
benar-benar dipakai game, berurutan, dengan kotak **"+"** di akhir untuk
menambah rangka berikutnya. Tombol **×** di pojok kotak membuangnya.

Alurnya: **klik satu kotak rangka → pilih sprite di daftar bawah**. Sprite
itu masuk ke rangka yang sedang dipilih saja, jadi tiap rangka bebas diambil
dari **kelompok mana pun** — susunannya boleh campuran.

**Kenapa bentuknya begini.** Model lamanya `SWAP_ANIM[slot] = { grp, n }`,
artinya "pakai kelompok X sebanyak n rangka", dan rangkanya dihitung merata
sepanjang kelompok. Bentuk itu **tidak bisa menyatakan susunan yang
sesungguhnya dipakai game**. Contoh nyata: pengantin pria diam memakai rangka
**0 dan 5** dari kelompok `Idle` yang berisi **11** rangka — `{n:2}` akan
diartikan rangka 0 dan 10. Akibatnya dialog memperlihatkan 11 kotak untuk
objek yang sebenarnya cuma memakai 2, dan mencampur rangka dari dua kelompok
mustahil. Sekarang bentuknya daftar eksplisit:

```js
SWAP_ANIM['player_idle'] = [ {grp:'…/Idle', f:0}, {grp:'…/Idle', f:5} ];
```

Kalau slot tidak ada di `SWAP_ANIM`, susunannya dibaca langsung dari
`ASSET_MAP` (`slotDefaultFrames()`) — jadi yang ditampilkan **selalu** sama
dengan yang berjalan, termasuk untuk objek yang belum pernah diganti.

Yang jadi mungkin karenanya:

1. **Ganti variasi utuh** — tombol *"Pakai seluruh kelompok — N rangka"*
   mengambil rangka **berurutan** dari awal kelompok. Hasilnya langsung
   terlihat di deret kotak, jadi rangka yang tidak diinginkan bisa dibuang
   satu per satu setelahnya.
2. **Objek diam jadi bergerak** — pengantin wanita bawaannya 1 rangka.
   Tekan **"+"** beberapa kali, dan engine otomatis membuat key tambahan
   (`bride__a2`, `bride__a3`, …), mendaftarkan animasinya, lalu memainkannya.
   Hapus rangka sampai tersisa 1 untuk kembali diam.

Rangka baru **menyalin rangka terakhir**, bukan diisi gambar asing — supaya
objeknya tidak mendadak berkedip sebelum sempat dipilihkan sprite.

### Ukuran & geser: PER RANGKA

Slider **Ukuran** dan **Naik/turun** berlaku untuk **rangka yang sedang
dipilih**, bukan seluruh objek — jadi satu objek berangka dua boleh punya
ukuran dan posisi berbeda di tiap rangkanya. Nilainya disimpan memakai key
rangka itu sendiri (`t_e1_0`, `bride__a3`, …).

Rangka yang punya setelan sendiri ditandai **titik hijau** di kotaknya, dan
baris kiri meringkas "*N* rangka disetel" — kalau baris itu hanya membaca
rangka 1, penyetelan di rangka 2 tidak akan terlihat sama sekali.

Kalau antar rangka nilainya **berbeda**, muncul tombol **"Samakan ke semua
rangka"** yang menyalin ukuran & posisi rangka yang sedang dipilih ke
seluruh rangka objek itu. Tombolnya **hanya muncul saat memang ada beda**
(`slotSettingsDiffer()`) dan hilang sendiri setelah seragam — tombol yang
selalu ada tapi sering tidak berefek justru menyesatkan, dan user tidak
punya cara tahu objeknya sudah seragam atau belum tanpa mengklik satu-satu.
Kalau yang disalin adalah nilai bawaan (100%, 0px), entrinya **dihapus**
bukan ditulis `1`/`0`, supaya hasil *Salin nilai* tidak memuat baris yang
sebenarnya sama dengan bawaan.

**Hitbox tetap satu ukuran**, diambil dari rangka pertama
(`slotBodyKey()`): body Phaser hanya disetel saat spawn/ganti state, tidak
tiap rangka animasi. Kalau hitbox ikut mengecil di rangka tertentu, pemain
bisa tiba-tiba tembus lantai di rangka itu.

### Wujud pemain per POWER-UP

Tiap power-up memberi pemain **set sprite tokoh berbeda**, jadi efeknya
terlihat di layar dan bukan cuma di HUD:

| Power-up | Efek | Tokoh |
|---|---|---|
| Melati | badan membesar | Pink Man |
| Cincin | kebal 8 detik | Ninja Frog |
| Payung | lompat ringan 10 detik | Virtual Guy |

Yang diganti hanya **nama tokoh** di jalur kelompoknya
(`Main Characters/Mask Dude/Run` → `Main Characters/Ninja Frog/Run`).
Keempat tokoh punya struktur identik (Idle 11, Run 12, Jump 1, Fall 1,
Hit 7), jadi nomor rangka yang sudah dipilih user tetap sah dan tidak perlu
36 entri `ASSET_MAP` tambahan. Teksturnya dibuat sebagai key bayangan
`t_groom_run1__pwNinjaFrog`, dan `settingKey()` memetakannya kembali ke key
asli supaya **ukurannya tidak berubah** saat power-up menyala.

Power-up berdurasi **menang** atas mode besar: efek yang akan berakhir harus
terlihat, kalau tidak pemain tidak tahu kapan waktunya habis. Kalau sprite
pemain diganti ke kelompok di luar `Main Characters/`, tokoh alternatifnya
tidak ada dan wujud power-up dilewati — lebih baik tokoh biasa daripada
pemain tanpa gambar.

Bentuk lama `{grp,n}` masih **diterima dan dimigrasi** otomatis
(`normalizeAnimList`), karena nilainya bisa sudah tersimpan di localStorage
pengguna atau ter-bake di `SWAP_ANIM_DEF`.

`slotIsCustom()` membedakan "diganti" dari "bawaan"; hanya slot yang
**berbeda dari bawaan** yang ditulis ke `SWAP_ANIM_DEF` oleh *Salin nilai*,
supaya susunan bawaan tidak ikut membeku ke dalam kode.

### Objek yang dulu prosedural

Semuanya kini punya slot dan bisa diganti dari dialog: kepingan puzzle,
pengantin wanita, bos 3 fase, musuh E2 (jalan + cangkang), dekorasi depan
(semak, batu, bunga, rumput), dan latar (awan, pohon, rumpun bunga, pagar).

Dekorasi & latar memakai `stages: true`. Alasannya: `scene_texKey()` mencari
kunci per-stage (`t_bush_s3`) lebih dulu dan hanya jatuh ke kunci dasar kalau
yang itu tidak ada — dan kunci per-stage **selalu** dibuat `buildTextures()`.
Tanpa mendaftarkan versi sprite untuk tiap stage, sprite-nya tidak akan pernah
terpakai, tertimpa diam-diam oleh yang prosedural.

### Objek yang TIDAK bisa diskala

Bata, blok `?`, pijakan melayang, tiang/pipa, dan tanah **dikunci di 100%**
(`scalable()` di index.js). Generator level menaruhnya di **grid tetap 32px**
(`s.x + 16`) dan tiang di `y = GY - ph` dengan tinggi 64/96/128. Kalau
teksturnya diskala, gambar tidak lagi sejajar petak — muncul celah atau
tumpang-tindih, dan rute lompat yang sudah dihitung bisa jadi tak terlewati.

Dialog menampilkan keterangan alasannya, bukan slider mati.

## PENSKALAAN — jangan diubah tanpa membaca ini

Sprite pack ini **32×32**, sedangkan art prosedural pemain **48×68**.

Kalau frame 32×32 dipasang apa adanya, body 54px jadi lebih tinggi dari
sprite-nya sendiri. Phaser menempelkan **kaki BODY** ke tanah, dan karena body
berakhir 36px di bawah dasar sprite, **karakter tampak melayang** — bug ini
pernah terjadi dan dilaporkan.

Perbaikannya di `drawFit()`:

1. skala **seragam** (`Math.min(w/sw, h/sh)`) — bukan regang per-sumbu,
   karena 32×32 → 48×68 membuat karakter gepeng;
2. ditempel **rata bawah–tengah** (`h - dh`) supaya kaki menyentuh dasar
   kanvas, yaitu titik yang dipakai body sebagai pijakan.

Pengecualian: entri ber-`fill: true` (tanah, bata, blok `?`) diregangkan
penuh, karena tile harus menyambung tanpa celah.

Ukuran tujuan tiap musuh **wajib sama** dengan sprite prosedural yang
digantikan (lihat `ENEMY_BODY`), kalau tidak musuh ikut melayang.

**Tinggi tiang wajib 64/96/128.** `refreshBody()` mengambil hitbox dari ukuran
tekstur, sedangkan level menaruh pipa di `y = GY - ph`.

### Riwayat keputusan (jangan diputar balik tanpa alasan)

Semua objek kini **sudah** memakai sprite dan bisa diganti dari dialog —
termasuk yang dulu sengaja dikecualikan:

- **E2** (musuh bercangkang) dulu dilewati karena pack tak punya padanan
  frame cangkangnya. Sekarang **kedua wujudnya** dipetakan dan dijaga
  **seukuran** oleh tes `T39e1b` — kalau ukurannya beda, musuh melompat
  posisinya saat diinjak.
- **Latar** (awan, pohon, rumpun bunga, pagar) dulu dikecualikan karena
  permintaan "semua pakai sprite **kecuali background**". Diikutkan atas
  permintaan berikutnya. Ukurannya besar (awan 192×112), jadi sprite kecil
  akan tampak diperbesar — ganti dengan sadar.

Koin dan blok `?` **sekarang memakai sprite** (buah & peti) atas keputusan
user. Kalau hasilnya tidak cocok, ganti lewat dialog — tidak perlu edit kode.

## Menambah sprite baru

Semua sprite di `../Free/` **sudah** masuk sheet dan bernomor, butuh atau
tidak. Jadi biasanya tidak perlu menambah apa pun — tinggal panggil.

Untuk memakai sprite yang sudah ada di sheet:

1. Tambah entri `ASSET_MAP` di index.js: `key`, `grp` (nama kelompok),
   `f` (nomor frame di dalam kelompok), `w`/`h`, `label`, `pick`.
2. `w`/`h` **wajib** sama dengan sprite prosedural yang digantikan.
3. Jalankan keempat harness.

Pakai **nama kelompok**, bukan nomor global: nomor bergeser tiap kali sheet
dibangun ulang, sedangkan nama kelompok + offset frame tetap stabil.

## Verifikasi

```bash
node verify-harness.cjs   # 154 tes: fisika, level, aset, hitbox
node verify-swap.cjs      # dialog ganti sprite (jsdom, klik sungguhan)
node verify-slice.cjs     # potongan sheet vs sprite-map.json, piksel nyata
node verify-scale.cjs     # slider ukuran + hitbox ikut mengecil
node verify-nudge.cjs     # slider naik/turun, bendera berkibar, Mask Dude
node verify-bake.cjs      # SWAP_DEF/SCALE_DEF/NUDGE_DEF yang di-bake
node verify-coins.cjs     # 10.630 koin di 240 level: semua bisa diambil
node verify-variant.cjs   # ganti variasi + objek diam jadi bergerak
```

Screenshot headless **tidak bekerja** di mesin ini (selalu kosong). Verifikasi
visual lewat Theme Editor: tempel 3 berkas, unggah sheet, buka pratinjau.

`assets/png.cjs` (baca/tulis PNG minimal) dipakai oleh build-sheet.cjs dan
harness verifikasi.
