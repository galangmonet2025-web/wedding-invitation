# SPACEWAR WEDDING — ASSET ADJUSTER (Sprite Sheet) — `ASSET.md`

Dokumen ini menjelaskan **satu sprite sheet PNG** yang dipakai untuk mengganti grafik
prosedural game dengan art buatanmu. Tema **default-nya fully procedural** — sheet ini
**opsional**: tanpa upload, game tetap jalan penuh.

- **Exporter** (tombol **"⬇ Export Sprite Sheet (PNG)"** di panel *Atur Posisi Sprite*) menggambar
  semua tekstur game saat ini ke 1 PNG, tiap frame dibungkus **border UNGU**.
- **Loader** (`sliceSpriteSheet()` di `index.js`) memotong PNG yang kamu upload **di koordinat yang
  PERSIS sama**, **membuang piksel ungu**, lalu menanam tiap sel ke key tekstur game.
- Sumber kebenaran tunggal koordinat = fungsi `sheetLayout()` + array `SHEET_MAP` di `index.js`.
  **Exporter & loader memanggil fungsi yang sama** → kotak yang digambar = kotak yang dibaca.

> **Aturan emas:** *Ganti ISI tiap kotak, JANGAN geser kotaknya.* Timpa art di dalam bingkai
> ungu; pertahankan posisi & ukuran kotak. Engine slice di koordinat tetap + key-out ungu.

---

## 1. Ringkasan teknis

| Item | Nilai |
|---|---|
| Ukuran sheet | **900 × 664 px** (`SHEET_W = 900`, tinggi dihitung otomatis) |
| Jumlah sel / frame | **30** |
| Tebal border ungu | **2 px** (`SHEET_BORDER`) — penanda, **tidak** ikut ter-render |
| Warna border (key-out) | **`#a000ff`** = `rgb(160, 0, 255)` (`SHEET_MARK`) |
| Aturan key-out | piksel dengan `R>120 && B>180 && G<80` → `alpha = 0` |
| Margin/gap antar sel | **10 px** (`SHEET_PAD`) |
| Strip label di atas baris | **14 px** (`SHEET_LABEL`) — teks key ungu, di LUAR area art |
| Slot upload | **`{{asset_image_6}}`** → `<img data-asset="sprite_sheet">` di `#sw-assets` |
| Fallback | slot kosong / gagal slice → grafik prosedural (`usingSheetAsset = false`) |
| Skala upload | boleh lebih besar/kecil; loader menskalakan proporsional (`src / sheet`) lalu downscale ke ukuran native |

**Koordinat rect = `[x, y, w, h]` AREA ART** (di dalam border, bukan termasuk border).
`x,y` = pojok kiri-atas art di kanvas sheet. `w×h` = ukuran native tekstur game.

---

## 2. Peta sel (frame-map) — koordinat PERSIS

Urutan & koordinat di bawah identik dengan `SHEET_MAP` + `sheetLayout()` di `index.js`.
Sheet tersusun jadi **3 baris**:

### Baris 1 (y = 26) — kapal, musuh, boss, mempelai

| # | Key tekstur | Rect `[x, y, w, h]` | Ukuran | Keterangan |
|---|---|---|---|---|
| 1 | `t_ship0` | `12, 26, 36, 50` | 36×50 | Kapal — frame thrust 1 (anim `ship_idle`/`ship_thrust`) |
| 2 | `t_ship1` | `62, 26, 36, 50` | 36×50 | Kapal — frame thrust 2 |
| 3 | `t_ship2` | `112, 26, 36, 50` | 36×50 | Kapal — frame thrust 3 |
| 4 | `t_ship` | `162, 26, 36, 50` | 36×50 | Kapal — statik (fallback) |
| 5 | `t_ship_hurt` | `212, 26, 36, 50` | 36×50 | Kapal — pose kena hit (merah) |
| 6 | `t_e_drone` | `262, 26, 24, 30` | 24×30 | Musuh — drone |
| 7 | `t_e_turret` | `300, 26, 28, 34` | 28×34 | Musuh — turret |
| 8 | `t_e_korvet` | `342, 26, 30, 44` | 30×44 | Musuh — korvet |
| 9 | `t_e_flyer` | `386, 26, 22, 30` | 22×30 | Musuh — flyer |
| 10 | `t_e_carrier` | `422, 26, 44, 64` | 44×64 | Musuh — carrier (induk drone) |
| 11 | `t_e_mech` | `480, 26, 40, 56` | 40×56 | Musuh — mech |
| 12 | `t_e_mine` | `534, 26, 22, 22` | 22×22 | Musuh — ranjau |
| 13 | `t_boss` | `570, 26, 220, 170` | 220×170 | **Boss** — Stasiun Pelaminan (inti weak-point bawah-tengah) |
| 14 | `t_couple` | `804, 26, 60, 80` | 60×80 | Mempelai (reward saat boss kalah) |

### Baris 2 (y = 224) — hazard, item, peluru, fx

| # | Key tekstur | Rect `[x, y, w, h]` | Ukuran | Keterangan |
|---|---|---|---|---|
| 15 | `t_asteroid` | `12, 224, 40, 38` | 40×38 | Asteroid besar |
| 16 | `t_asteroid_s` | `66, 224, 22, 20` | 22×20 | Asteroid kecil (juga dipakai debris parallax) |
| 17 | `t_barel` | `102, 224, 26, 30` | 26×30 | Barel peledak |
| 18 | `t_lasergate` | `142, 224, 200, 16` | 200×16 | Gerbang laser (membentang horizontal) |
| 19 | `t_capsule_blue` | `356, 224, 22, 16` | 22×16 | Kapsul biru (Power Meter) |
| 20 | `t_amplop` | `392, 224, 30, 24` | 30×24 | **Kapsul undangan 💌** (kepingan) |
| 21 | `t_pbullet` | `436, 224, 6, 14` | 6×14 | Peluru player (blaster/spread) |
| 22 | `t_laser` | `456, 224, 5, 26` | 5×26 | Laser player (pierce) |
| 23 | `t_pmissile` | `475, 224, 8, 14` | 8×14 | Misil player |
| 24 | `t_ebullet` | `497, 224, 9, 9` | 9×9 | Peluru musuh |
| 25 | `t_erocket` | `520, 224, 9, 18` | 9×18 | Roket musuh/boss |
| 26 | `t_spark` | `543, 224, 7, 7` | 7×7 | Partikel percikan |
| 27 | `t_heart` | `564, 224, 11, 11` | 11×11 | Partikel hati (rescue/celebrate) |
| 28 | `t_planet` | `589, 224, 200, 200` | 200×200 | Parallax — planet |

### Baris 3 (y = 452) — struktur parallax besar

| # | Key tekstur | Rect `[x, y, w, h]` | Ukuran | Keterangan |
|---|---|---|---|---|
| 29 | `t_wreck` | `12, 452, 160, 90` | 160×90 | Parallax — bangkai kapal (sektor Medan Perang) |
| 30 | `t_station` | `186, 452, 180, 200` | 180×200 | Parallax — stasiun (sektor Stasiun Pelaminan) |

> Catatan multi-frame: `t_ship0/1/2` adalah frame anim kapal (`ship_idle = [0,1]`,
> `ship_thrust = [1,2]`). Anim dibangun **setelah** loader menanam tekstur, jadi mengganti
> ketiga frame langsung mengubah animasi tanpa perubahan kode.

---

## 3. Alur pakai (Theme Editor)

1. **Mulai game** (PRESS START) — tekstur baru ada setelah scene boot.
2. Buka panel **Atur Posisi Sprite** (✦ tersembunyi di badge "✦ UNDANGAN PERNIKAHAN ✦", **PC only**).
3. Klik **"⬇ Export Sprite Sheet (PNG)"** → file `spacewar-wedding-sprite-sheet.png` terunduh.
4. Di editor gambar: **timpa isi tiap kotak ungu** dengan art-mu (jaga posisi & ukuran kotak).
   - Boleh menaikkan resolusi seluruh sheet secara **proporsional** (loader menskalakan otomatis).
   - **Jangan** menghapus/menggeser border ungu — itu penanda batas; ter-key-out saat load.
5. Upload PNG hasil ke **asset tema slot ke-6** (`{{asset_image_6}}`).
6. Reload preview → art langsung ter-apply, border ungu tak terlihat. Tanpa upload → tetap prosedural.

---

## 4. Key-out & fallback (ringkas implementasi)

- Loader memotong tiap sel di `[x,y,w,h]` (diskalakan bila sheet di-upload beda ukuran),
  lalu **menghapus piksel ungu** (`R>120 && B>180 && G<80 → alpha 0`). Karena border ada di
  **tepi** sel, art di tengah aman.
- Hasil di-`downscale` ke ukuran native (`ew×eh`) dan di-`addCanvas` ke key tekstur → semua
  `create/scale/anim` yang ada memakai art baru **tanpa diubah**.
- `usingSheetAsset = false` bila slot kosong / sheet < 50% ukuran ekspektasi / canvas ter-taint →
  game memakai tekstur prosedural. **Tanpa upload, game tetap fully playable.**

> Jangan memakai **ungu `#a000ff`** sebagai warna art di dalam frame — akan ikut terhapus.
> Untuk efek keunguan, pakai ungu lain (mis. lebih gelap/terang) di luar rentang key-out.
