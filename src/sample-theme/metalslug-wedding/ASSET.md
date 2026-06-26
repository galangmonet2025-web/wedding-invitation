# ASSET.md — Karakter Pemain (PNG) · Metal Slug Wedding

Spesifikasi aset PNG untuk **mengganti karakter pemain** yang sekarang digambar
prosedural (Phaser Graphics) dengan gambar PNG buatan sendiri.

## Aturan umum (WAJIB dibaca dulu)

- **Format:** PNG, **transparan** (alpha), pixel-art (tanpa anti-alias / blur tepi).
- **Ukuran kanvas tiap frame:** **60 × 84 px** (samakan SEMUA frame — engine pakai
  ukuran tekstur tetap; beda ukuran bikin karakter "lompat" posisinya). _(Catatan:
  aset hasil potong sudah 60×84 — 2× dari rencana awal 30×42 — supaya detail tidak
  pecah saat ditampilkan.)_
- **Arah hadap:** semua digambar **menghadap KANAN**. Saat lari ke kiri, engine
  otomatis membalik horizontal (flip) — **jangan** bikin versi kiri.
- **Pivot / posisi kaki:** kaki menapak di **bagian bawah** kanvas. Hitbox karakter
  `22 × 38 px`, ditempel ke dasar sprite. Jadi: sisakan ruang kosong tipis di
  ATAS kepala (1–3 px) dan pastikan telapak kaki menyentuh **baris paling bawah**
  (y = 41). Kalau kaki "melayang" di tengah kanvas, karakter terlihat terbang.
- **Lebar badan efektif:** ±22 px di tengah kanvas (sisakan ±4 px kiri-kanan untuk
  senjata/ayunan tangan). Jangan menempel mepet ke tepi kiri/kanan.
- **Konsistensi:** kepala, warna, dan senjata harus konsisten antar frame supaya
  animasi tidak "kedip" berubah bentuk.
- **Penamaan file:** persis seperti kolom "nama file" (huruf kecil, `.png`).

## Tabel kebutuhan aset (SET LENGKAP — tanpa dikurangi)

> Ini set **lengkap** yang dipakai engine. Jumlahnya **14 frame**: 11 frame yang
> memang dibutuhkan engine + tambahan pose lompat-tembak terarah (atas/bawah),
> pose **berdiri-tembak-atas**, dan pose mati sesuai permintaan. **Tidak ada frame
> yang dipangkas / di-mapping ulang.**
> Tiap frame = 1 file PNG, dan tiap nama file langsung dipetakan ke 1 tekstur engine
> (kolom "tekstur engine") supaya pasang-langsung tanpa kompromi.

| No | Nama file | Width | Height | Tekstur engine | Deskripsi |
|----|-----------|-------|--------|----------------|-----------|
| 1 | `player_idle_1.png` | 30 | 42 | `t_player_idle0` | Diam berdiri, pose netral (nafas turun). Frame dasar saat karakter berhenti. |
| 2 | `player_idle_2.png` | 30 | 42 | `t_player_idle1` | Diam berdiri, badan/kepala naik ±1 px (nafas naik). Engine bolak-balik idle_1 ↔ idle_2 saat diam (bernafas). Beda tipis dari frame 1. |
| 3 | `player_run_1.png` | 30 | 42 | `t_player_run0` | Lari frame 1 — kaki depan membuka lebar (langkah maju), badan condong maju. |
| 4 | `player_run_2.png` | 30 | 42 | `t_player_run1` | Lari frame 2 — kaki rapat (melewati tengah), badan naik sedikit. |
| 5 | `player_run_3.png` | 30 | 42 | `t_player_run2` | Lari frame 3 — kaki bertukar membuka lebar (kebalikan frame 1). |
| 6 | `player_run_4.png` | 30 | 42 | `t_player_run3` | Lari frame 4 — kaki rapat lagi (melewati tengah, kebalikan frame 2). Engine memutar 1→2→3→4 jadi siklus lari 4-frame yang halus. |
| 7 | `player_jump_shoot_up.png` | 30 | 42 | `t_player_jump` | Melompat NAIK (kaki menekuk terangkat) **sambil menembak ke ATAS** — lengan + laras lurus ke atas. Dipakai juga sebagai pose lompat default saat naik. |
| 8 | `player_jump_shoot_side.png` | 30 | 42 | `t_player_fall` | Melompat / melayang **sambil menembak ke SAMPING (depan)** — lengan + laras horizontal. Dipakai juga sebagai pose saat sedang turun/jatuh. |
| 9 | `player_jump_shoot_down.png` | 30 | 42 | `t_player_jumpdown` (baru) | Melompat **sambil menembak ke BAWAH** — lengan + laras serong/lurus ke bawah (nembak tanah saat melayang). |
| 10 | `player_aim_up.png` | 30 | 42 | `t_player_aimup` (baru) | **Berdiri di tanah sambil menembak ke ATAS** — kaki menapak di baris bawah (y = 41), lengan terangkat & laras **vertikal lurus ke atas** di samping kepala. Dipakai saat pemain DIAM + menahan tombol Atas/W. Beda dari frame 7 (frame 7 = melompat/kaki menekuk; frame ini = kaki berdiri menapak). |
| 11 | `player_crouch.png` | 30 | 42 | `t_player_prone` | Jongkok / merunduk — badan pendek & lebih lebar, kepala turun, senjata ke depan. Telapak kaki tetap di baris bawah (y = 41), tinggi efektif ±60% badan berdiri. |
| 12 | `player_hurt.png` | 30 | 42 | `t_player_hurt` | Kena tembak / terpental — pose tersentak ke belakang, ekspresi kesakitan (boleh sedikit merah). Tampil sesaat saat kena hit (kebal+kedip). |
| 13 | `player_dead.png` | 30 | 42 | `t_player_dead` (baru) | MATI / tumbang — tergeletak/terjengkang, kepala di bawah, senjata terlepas. Pose gaya Metal Slug saat tewas. |
| 14 | `player_static.png` | 30 | 42 | `t_player` | Pose diam tunggal (fallback). Boleh **sama persis** dengan `player_idle_1` — ini cadangan kalau animasi belum jalan. |

## Pemetaan ke state animasi (untuk referensi)

| State di game | Frame yang dipakai |
|---|---|
| Diam (idle / bernafas) | `player_idle_1` ↔ `player_idle_2` (loop pelan) |
| Lari | `player_run_1` → `_2` → `_3` → `_4` (loop cepat) |
| Lompat naik / nembak atas | `player_jump_shoot_up` |
| Berdiri + nembak atas (tahan Atas/W) | `player_aim_up` |
| Melayang-turun / nembak samping | `player_jump_shoot_side` |
| Lompat + nembak bawah | `player_jump_shoot_down` |
| Jongkok | `player_crouch` |
| Kena pukul (hurt) | `player_hurt` |
| Mati / tumbang | `player_dead` |
| Fallback statis | `player_static` |

> Frame **9** (`jump_shoot_down`) dan **12** (`player_dead`) butuh tekstur baru di engine
> (`t_player_jumpdown`, `t_player_dead`) — saat memasang PNG nanti, engine ditambah pose
> nembak-bawah saat melayang & beat tumbang ±0.6 detik sebelum respawn. Sisanya
> (frame 1–8, 10, 11, 13) menggantikan tekstur prosedural yang sudah ada **satu-lawan-satu**.
>
> Catatan "MATI": game ini undangan — **tidak ada game-over** (kena tembak = terpental
> + kebal; jatuh jurang = respawn aman). Pose `player_dead` dipakai untuk animasi tumbang
> sesaat sebelum muncul lagi, bukan layar game-over.

## JSON (daftar aset — bisa langsung dipakai)

File terpisah: [`player-assets.json`](./player-assets.json). Isinya sama dengan blok di bawah.

```json
[
  {
    "orderNumber": 1,
    "name": "player_idle_1.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Diam berdiri, pose netral (nafas turun). Frame dasar saat karakter berhenti."
  },
  {
    "orderNumber": 2,
    "name": "player_idle_2.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Diam berdiri, badan/kepala naik +-1 px (nafas naik). Engine bolak-balik idle_1 <-> idle_2 saat diam. Beda tipis dari frame 1."
  },
  {
    "orderNumber": 3,
    "name": "player_run_1.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Lari frame 1 - kaki depan membuka lebar (langkah maju), badan condong maju."
  },
  {
    "orderNumber": 4,
    "name": "player_run_2.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Lari frame 2 - kaki rapat (melewati tengah), badan naik sedikit."
  },
  {
    "orderNumber": 5,
    "name": "player_run_3.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Lari frame 3 - kaki bertukar membuka lebar (kebalikan frame 1)."
  },
  {
    "orderNumber": 6,
    "name": "player_run_4.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Lari frame 4 - kaki rapat lagi (kebalikan frame 2). Engine memutar 1->2->3->4 jadi siklus lari halus."
  },
  {
    "orderNumber": 7,
    "name": "player_jump_shoot_up.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Melompat NAIK (kaki menekuk terangkat) sambil menembak ke ATAS - lengan + laras lurus ke atas. Dipakai juga sebagai pose lompat default saat naik."
  },
  {
    "orderNumber": 8,
    "name": "player_jump_shoot_side.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Melompat / melayang sambil menembak ke SAMPING (depan) - lengan + laras horizontal. Dipakai juga sebagai pose saat sedang turun/jatuh."
  },
  {
    "orderNumber": 9,
    "name": "player_jump_shoot_down.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Melompat sambil menembak ke BAWAH - lengan + laras serong/lurus ke bawah (nembak tanah saat melayang)."
  },
  {
    "orderNumber": 10,
    "name": "player_aim_up.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Berdiri di tanah sambil menembak ke ATAS - kaki menapak di baris bawah (y=41 skala 30x42 / bawah kanvas), lengan terangkat & laras VERTIKAL lurus ke atas di samping kepala. Dipakai saat pemain DIAM + menahan tombol Atas/W. Beda dari frame 7 (frame 7 = melompat kaki menekuk; frame ini = berdiri menapak)."
  },
  {
    "orderNumber": 11,
    "name": "player_crouch.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Jongkok / merunduk - badan pendek & lebih lebar, kepala turun, senjata ke depan. Telapak kaki tetap di baris bawah (y=41), tinggi efektif +-60% badan berdiri."
  },
  {
    "orderNumber": 12,
    "name": "player_hurt.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Kena tembak / terpental - pose tersentak ke belakang, ekspresi kesakitan (boleh sedikit merah). Tampil sesaat saat kena hit (kebal+kedip)."
  },
  {
    "orderNumber": 13,
    "name": "player_dead.png",
    "width": 60,
    "height": 84,
    "deskripsi": "MATI / tumbang - tergeletak/terjengkang, kepala di bawah, senjata terlepas. Pose gaya Metal Slug saat tewas."
  },
  {
    "orderNumber": 14,
    "name": "player_static.png",
    "width": 60,
    "height": 84,
    "deskripsi": "Pose diam tunggal (fallback). Boleh sama persis dengan player_idle_1 - cadangan kalau animasi belum jalan."
  }
]
```

## Cara pakai (setelah PNG jadi)

> **Slot upload di Theme Editor:** frame 1–13 = slot gambar **1–13**. Frame baru
> `player_aim_up` (No. 10 di tabel) **diunggah ke slot gambar ke-17** (`{{asset_image_17}}`),
> bukan slot 10 — supaya nomor slot aset lama (1–13) yang sudah terlanjur diunggah tidak
> bergeser. Kalau slot 17 kosong, engine memakai gambar prosedural (laras vertikal) otomatis.

1. Taruh ke-14 PNG di folder ini (`src/sample-theme/metalslug-wedding/`) atau host
   gambarnya & siapkan URL-nya.
2. Beri tahu Claude "asetnya sudah siap" — engine akan diubah dari menggambar
   prosedural (`drawCommando`) menjadi **memuat PNG** ini ke tekstur
   `t_player_idle0/1`, `t_player_run0/1`, dst, dan menyesuaikan animasi
   `p_idle` / `p_run` / pose lompat-tembak.

---

# ASSET (Monster & Boss) — Sprite Sheet PNG · Metal Slug Wedding

Spesifikasi aset PNG untuk **mengganti semua musuh + boss** ("object2" pada game)
yang sekarang digambar prosedural (Phaser Graphics, fungsi `buildTextures` →
`t_e_rush`, `t_e_range`, `t_turret`, `t_drone`, `t_tank`, `t_boss`) dengan
**character sprite sheet** buatan sendiri.

Saat ini tiap musuh hanya **1 frame statis** dan animasinya "dipalsukan" dengan
trik engine (scale bob untuk lari, tint merah saat mau menembak, flip saat
membalik arah). Dengan sprite sheet, tiap musuh dapat **frame animasi nyata**
(jalan / bidik / tembak / kena pukul / mati) sehingga gerakannya hidup seperti
Metal Slug asli.

> ## ✅ STATUS: SUDAH TERPASANG (satu gambar utuh, engine memotong sendiri)
>
> Aset dikirim sebagai **SATU file utuh** [`assets/enemy-sprite-sheet.png`](./assets/enemy-sprite-sheet.png)
> (1408×768, 6 baris = 6 musuh). **Engine `index.js` yang memotongnya sendiri**
> per-baris memakai peta koordinat terverifikasi di
> [`assets/frame-map.json`](./assets/frame-map.json) — kamu **tidak perlu** memotong
> gambar jadi banyak file.
>
> - **Upload:** taruh gambar utuh di slot gambar **ke-15** (`{{asset_image_15}}`,
>   `data-asset="enemy_sheet"`). Itu saja.
> - **Latar checkerboard:** PNG ini **tidak transparan** (latar kotak-kotak abu/putih
>   ikut tergambar). Engine otomatis **meng-_key-out_** latar itu saat memuat
>   (flood-fill dari tepi → hanya abu-terang yang menyambung ke pinggir yang
>   dihapus; metal/abu di DALAM sprite aman). Jadi tidak wajib bikin versi
>   transparan — tapi kalau ada PNG transparan asli, itu lebih bagus & langsung dipakai.
> - **Peta potong (sumber kebenaran):** frame **TIDAK seukuran** (pose tembak/hancur
>   lebih lebar) & **rapat tanpa pemisah**, jadi tiap frame punya **rect eksplisit
>   sendiri** `[x, w]` (grid seragam dulu menabrak frame tetangga → boss tampil
>   dobel). Tiap baris = `{top, ch, rects:[[x,w]…]}`. Koordinat pasti ada di
>   `frame-map.json` & tabel `ENEMY_SHEET` dalam `index.js`.
>
> | Baris | Musuh | Top Y | Tinggi (ch) | Frames (x,w) |
> |---|---|---|---|---|
> | 0 | rush   | 9   | 111 | walk_1‑4, hurt, die — `[5,63][96,63][180,74][295,51][364,86][470,109]` |
> | 1 | range  | 135 | 110 | idle, aim, fire, hurt, die — `[6,82][102,89][199,118][323,71][421,95]` |
> | 2 | turret | 260 | 80  | idle, aim, fire, hurt, wreck — `[5,112][135,113][268,132][400,132][532,132]` |
> | 3 | drone  | 353 | 78  | hover_1‑2, drop, wreck — `[5,121][149,119][291,125][446,103]` |
> | 4 | tank   | 434 | 118 | roll_1‑2, aim, fire, wreck — `[3,179][201,179][398,197][609,197][806,197]` |
> | 5 | boss   | 555 | 195 | idle_1‑2, telegraph, fire, enraged, defeated — `[6,181][210,180][413,202][633,256][902,187][1152,229]` |
>
> Engine memberi **skala seragam** = `dh/ch` (tinggi tampil tetap), jadi frame yang
> lebih lebar (kilatan moncong) tampil lebih lebar tanpa gepeng & kaki tetap di
> garis yang sama. Tabel "set lengkap" di bawah = **referensi makna tiap frame**.

## Aturan umum (WAJIB dibaca dulu — sama seperti aset pemain)

- **Format:** PNG, **transparan** (alpha), pixel-art (tanpa anti-alias / blur tepi).
- **Sprite sheet:** semua frame 1 entitas disusun **horizontal dalam SATU file**
  (kiri→kanan, frame 0 paling kiri). Tiap sel **ukuran sama** = kolom "frame W × H".
  Lebar total file = `frame_W × jumlah_frame`. Tanpa spasi/padding antar frame.
- **Arah hadap:** semua digambar **menghadap KANAN**. Engine otomatis **flip
  horizontal** saat musuh menghadap pemain di sisi kiri — **jangan** bikin versi kiri.
- **Pivot / kaki:** untuk musuh **darat** (rush, range, tank, turret) kaki/roda
  menapak di **baris paling bawah** sel. Untuk **drone** (terbang) badan di
  tengah sel (boleh ada ruang atas-bawah, drone melayang). Boss kaki di bawah sel.
- **Hitbox** (jangan diisi melebihi ini, sisakan tepi tipis): rush/range ±`22×36`,
  tank ±`56×36`, turret ±`36×26`, drone ±`30×18`, boss ±`116×128`. Badan utama
  isi area itu; senjata/laras boleh menjorok sedikit ke tepi sel.
- **Konsistensi:** warna & siluet sama antar frame supaya animasi tidak "kedip".
- **Skala 2×:** ukuran sel = **2×** ukuran tekstur engine sekarang (biar detail
  tidak pecah). Engine menampilkan di ukuran logis lama (di-`setScale(0.5)` /
  pakai display size), jadi proporsi tetap.
- **Penamaan file:** persis kolom "nama file" (huruf kecil, `.png`).

## Palet warna acuan (pertahankan identitas tiap musuh)

| Entitas | Warna utama | Ciri khas |
|---|---|---|
| `rush` (penyerbu) | merah marun `#9c3a3a` | helm merah, lari nekat ke arah pemain, tak menembak |
| `range` (penembak) | ungu `#6a4a9c` | senapan, diam membidik lalu menembak lurus |
| `turret` (turret) | abu logam `#4a4a52` | dudukan statis + laras ujung merah, menembak |
| `drone` (drone) | abu-biru `#556` + rotor `#aab` | terbang naik-turun, menjatuhkan bom |
| `tank` (tank) | hijau militer `#3a4a2a` | berantai/roda, lambat, menembak melambung (lob) |
| `boss` (Jenderal Pembatal Nikah) | merah tua `#5a2a2a` | besar, **titik lemah kuning** `#ffd447`, 3 fase |

---

## 1) RUSH — penyerbu darat (`t_e_rush`)

Sel **48 × 76 px**. Lari ke arah pemain, **tidak menembak**, mati 1 tembakan.
Butuh siklus jalan + pose kena pukul + mati.

| Frame | Nama (di sheet) | Deskripsi |
|---|---|---|
| 0 | walk_1 | Langkah — kaki depan membuka, badan condong maju. |
| 1 | walk_2 | Kaki rapat (lewat tengah), badan naik tipis. |
| 2 | walk_3 | Kaki bertukar membuka (kebalikan frame 0). |
| 3 | walk_4 | Kaki rapat lagi (kebalikan frame 1). Engine loop 0→1→2→3 = lari. |
| 4 | hurt | Tersentak ke belakang, sedikit merah — sesaat saat kena tembak. |
| 5 | die | Tumbang/terjengkang — dipakai sekejap sebelum hilang (+ledakan). |

File: **`enemy_rush.png`** — 6 frame → **288 × 76 px**.

## 2) RANGE — penembak diam (`t_e_range`)

Sel **48 × 76 px**. Diam membidik (telegraph), lalu menembak lurus. Mati 1 tembakan.

| Frame | Nama | Deskripsi |
|---|---|---|
| 0 | idle | Berdiri siaga, senapan turun ±45°. |
| 1 | aim | Membidik — senapan terangkat horizontal, badan menegang (ganti tint merah lama). |
| 2 | fire | Recoil saat menembak — kilatan moncong, badan tersentak ke belakang. |
| 3 | hurt | Kena pukul. |
| 4 | die | Tumbang. |

File: **`enemy_range.png`** — 5 frame → **240 × 76 px**.

## 3) TURRET — meriam statis (`t_turret`)

Sel **76 × 56 px**. Tidak bergerak, hanya membidik & menembak. HP 3.

| Frame | Nama | Deskripsi |
|---|---|---|
| 0 | idle | Laras netral. |
| 1 | aim | Laras mengarah ke pemain, lampu merah menyala (telegraph). |
| 2 | fire | Recoil + kilatan moncong. |
| 3 | hurt | Berkedip kena pukul (boleh sama bentuk, tint diatur engine). |
| 4 | wreck | Hancur/asap — sesaat saat HP habis. |

File: **`enemy_turret.png`** — 5 frame → **380 × 56 px**.

## 4) DRONE — drone terbang (`t_drone`)

Sel **64 × 40 px**. Terbang naik-turun (sine), menjatuhkan bom. HP 2. **Badan di
tengah sel** (melayang, tak menapak).

| Frame | Nama | Deskripsi |
|---|---|---|
| 0 | hover_1 | Rotor blur posisi A, lampu sensor merah menyala. |
| 1 | hover_2 | Rotor blur posisi B (engine loop 0↔1 = baling-baling berputar). |
| 2 | drop | Palka bawah terbuka menjatuhkan bom. |
| 3 | wreck | Pecah/jatuh — sesaat saat hancur. |

File: **`enemy_drone.png`** — 4 frame → **256 × 40 px**.

## 5) TANK — tank berat (`t_tank`)

Sel **128 × 80 px**. Lambat maju, menembak **melambung (lob)**. HP 8. Roda/rantai
menapak baris bawah; laras menjorok ke depan.

| Frame | Nama | Deskripsi |
|---|---|---|
| 0 | roll_1 | Rantai/roda fase A (gerigi geser). |
| 1 | roll_2 | Rantai/roda fase B (engine loop 0↔1 saat bergerak). |
| 2 | aim | Meriam terangkat sedikit ke atas (telegraph lob), moncong menyala. |
| 3 | fire | Recoil meriam + kilatan moncong. |
| 4 | wreck | Terbakar/hancur — sesaat saat HP habis. |

File: **`enemy_tank.png`** — 5 frame → **640 × 80 px**.

## 6) BOSS — Jenderal Pembatal Nikah (`t_boss`)

Sel **260 × 280 px** (2× dari 130×140). Boss bertarung **3 fase** (HP makin
sedikit → makin agresif), punya **titik lemah kuning** yang harus tetap terlihat
(pemain menembaknya). Bar HP kecil melayang di atas boss (digambar engine, bukan
bagian sprite).

| Frame | Nama | Deskripsi |
|---|---|---|
| 0 | idle_1 | Pose siaga, dada naik (nafas/idle A). **Titik lemah kuning jelas di dada.** |
| 1 | idle_2 | Idle B (nafas turun) — engine loop 0↔1 saat menganggur. |
| 2 | telegraph | Bersiap menembak — moncong/lengan-meriam menyala, badan sedikit mundur (ganti tint merah lama). Dipakai semua fase saat "tell". |
| 3 | fire | Menembak kipas peluru — recoil, kilatan moncong besar. |
| 4 | enraged | Pose fase lanjut (fase 2–3) — lebih merah/rusak, mata menyala, asap. Dipakai saat naik fase & saat HP rendah. |
| 5 | defeated | Tumbang/meledak — sesaat sebelum hancur & sangkar mempelai terbuka. |

File: **`enemy_boss.png`** — 6 frame → **1560 × 280 px**.

> **Wajib:** titik lemah kuning (`#ffd447` + inti `#fff4b0`) harus tetap ada &
> kontras di frame 0–4 (target tembak). Frame 5 (defeated) boleh tanpa titik lemah.

---

## Pemetaan engine (1 gambar utuh → banyak tekstur)

Engine memotong **satu** `assets/enemy-sprite-sheet.png` (1408×768) menjadi tekstur
per-frame `<texKey>__<frame>` lalu membangun anim Phaser. Lihat `frame-map.json`
untuk rect tiap frame. Baris → tekstur engine yang digantikan:

| Baris sheet | Frame | Sel asli (W×H) | Ditampilkan (W×H) | Tekstur engine |
|---|---|---|---|---|
| rush   | 6 | 96×111  | 24×38  | `t_e_rush` |
| range  | 5 | 100×110 | 24×38  | `t_e_range` |
| turret | 5 | 132×80  | 38×28  | `t_turret` |
| drone  | 4 | 143×78  | 32×20  | `t_drone` |
| tank   | 5 | 202×118 | 64×40  | `t_tank` |
| boss   | 6 | 234×195 | 130×140 | `t_boss` |

> Sel asli besar (≈2–3×) lalu di-`setDisplaySize` ke ukuran tekstur prosedural lama,
> jadi **semua angka dunia (hitbox, spawn-y, kamera, kotak-hit boss) tetap sama**.
> **Catatan "MATI":** ini undangan — mati = animasi sekejap lalu hilang/ledakan,
> bukan layar game-over. `barrel` (tong peledak) **bukan monster** (properti
> destruktif), jadi tetap prosedural & tidak termasuk sheet ini.

## Cara pakai

1. Upload **gambar utuh** `assets/enemy-sprite-sheet.png` ke slot gambar **ke-15**
   (`{{asset_image_15}}`) di Theme Editor. **Tidak perlu memotong** jadi banyak file.
2. Selesai — saat tema dimuat, engine otomatis: meng-_key-out_ latar checkerboard,
   memotong per-baris (peta di `frame-map.json` / tabel `ENEMY_SHEET` di `index.js`),
   membuat anim (`e_rush_walk`, `e_range_aim`, `e_boss_tell`, dst), lalu memutarnya di
   `updateEnemies` / `updateBoss` (mengganti trik scale-bob & tint telegraph dengan
   frame nyata). Jika slot 15 kosong / gambar gagal → **fallback** ke gambar
   prosedural lama, game tetap jalan.

> **Mengganti art:** susunan baris/pitch terbaca dari tabel `ENEMY_SHEET` di
> `index.js`. Kalau kamu meng-ekspor ulang sheet dengan tata letak berbeda, sesuaikan
> `x0/top/cw/ch/pitch` di tabel itu (atau `frame-map.json`) — bukan memecah file.

---

# ASSET (Sisa Objek & Karakter) — yang BELUM diganti PNG

Daftar **semua tekstur prosedural yang tersisa** di `buildTextures` (`index.js`) —
selain pemain (sudah PNG) & musuh/boss (sudah sprite sheet). Spesifikasi lengkap +
`engineTexture` ada di file **[`remaining-assets.json`](./remaining-assets.json)**
(25 entri, format sama: `orderNumber, name, width, height, deskripsi` + `engineTexture`
& `kategori`). Ukuran width/height = **2×** tekstur prosedural sekarang (biar tajam).

Ringkasan per kategori:

| Kategori | Item (engineTexture) |
|---|---|
| Karakter | `t_pow` (sandera/kurir), `t_couple_caged` (mempelai di sangkar) |
| Item | `t_amplop` (amplop/pickup — **dibuat netral**, di-tint engine), `t_crate` (peti senjata), `t_barrel` (tong peledak) |
| Proyektil | `t_bullet`, `t_ebullet`, `t_rocket`, `t_nade` |
| Hazard | `t_flame` (api), `t_spike` (duri) |
| Efek (partikel) | `t_spark`, `t_heart` |
| Terrain | `t_ground` (tile, **seamless**), `t_plat` (platform) |
| Struktur | `t_cage` (sangkar), `t_arch` (gapura pelaminan) |
| Scenery (parallax) | `t_palm`, `t_bush`, `t_sandbag`, `t_flag`, `t_cloud`, `t_mountain`, `t_hill` |
| Kendaraan (NONAKTIF) | `t_slug` — digambar tapi **belum dipakai** engine |

Catatan penting:
- `t_amplop` & `t_spark`/`t_heart` punya perlakuan khusus (tint / partikel) — baca
  `deskripsi`-nya di JSON sebelum menggambar.
- `t_ground`/`t_plat`/`t_spike` di-**tile horizontal** → harus seamless kiri-kanan.
- `t_slug` opsional (fitur kendaraan belum aktif).
- Total tekstur game = **44**: 13 pemain ✓ + 6 musuh/boss ✓ + **25 sisa ini**.

> ## ✅ STATUS: ATLAS OBJEK SUDAH DIGENERATE & TERPASANG
>
> Sprite untuk **21 objek** (semua di atas KECUALI `t_mountain`/`t_hill`/`t_cloud`
> yang tetap prosedural — siluet besar bikin atlas berat, lawan dari kecepatan load —
> dan `t_slug` yang tak terpakai) sudah **digenerate** sebagai SATU atlas transparan:
> **[`assets/object-sprite-sheet.png`](./assets/object-sprite-sheet.png)** (288×2520, ~14KB).
>
> - **Upload:** taruh atlas itu di slot gambar **ke-16** (`{{asset_image_16}}`,
>   `data-asset="object_sheet"`). Engine slice sendiri per `assets/object-frame-map.json`.
> - **Slice + downscale:** tiap sel atlas 2×; engine MENGECILKAN ke ukuran prosedural
>   asli (1×) lalu bake ke key aslinya (`t_pow`, `t_ground`, …) → semua kode
>   create/tile/scale tetap jalan tanpa ubah ukuran. Tileable (`t_ground`/`t_plat`/
>   `t_spike`) tetap akurat.
> - **Beranimasi:** `t_amplop` (kilau segel), `t_barrel` (lampu siaga), `t_flame`
>   (api berkobar), `t_flag` (berkibar) → anim `o_amplop`/`o_barrel`/`o_flame`/`o_flag`,
>   diputar di prop backdrop / penanda POW / hazard / barrel.
> - **Fallback:** slot 16 kosong / gagal → balik ke gambar prosedural, game tetap jalan.
> - **Spec & makna frame:** [`object-assets.json`](./object-assets.json). Mau regenerate
>   art-nya? jalankan generator: `node assets/gen-objects.cjs` (menggambar ulang atlas
>   dari koordinat `object-frame-map.json`), atau gambar ulang manual pakai template
>   `assets/object-template.png`.

Tabel di atas = referensi makna; angka width/height di `remaining-assets.json` adalah
ukuran 2× (sel atlas). Total tekstur game = **44**: 13 pemain ✓ + 6 musuh/boss ✓ +
21 objek (atlas ✓) + 4 tetap prosedural (mountain/hill/cloud/slug).
