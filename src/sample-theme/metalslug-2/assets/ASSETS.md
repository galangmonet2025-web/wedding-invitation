# METAL SLUG 2 — Aset Sprite (untuk diupload manual via Theme Editor)

> **Cara pakai:** Buka **Theme Editor** tema ini → bagian **Asset Media / Upload** → upload
> file-file di folder [`upload/`](upload/) **SATU PER SATU, URUT sesuai tabel di bawah**. Tiap
> upload otomatis dapat kode `image_1`, `image_2`, … (urutan = urutan upload). Tema membaca tiap
> aset lewat variabel `{{asset_image_N}}` yang sudah di-hardcode sesuai tabel ini.
>
> **PENTING — URUTAN UPLOAD HARUS PERSIS** seperti tabel, karena kode tema mengandalkan nomor itu.
> Kalau urutan beda, mapping meleset (player jadi musuh, dst).
>
> **Aman kalau belum diupload:** game punya **fallback prosedural** untuk tiap aset — kalau
> `{{asset_image_N}}` kosong, game menggambar sprite kotak prosedural (tidak blank). Jadi tema
> tetap jalan walau aset belum lengkap; makin banyak diupload, makin bagus grafiknya.

## Urutan upload (folder `upload/`)

| Urut | File | Kode aset | Variabel di tema | Isi | Catatan teknis |
|------|------|-----------|------------------|-----|----------------|
| 1 | `player_idle.png` | `image_1` | `{{asset_image_1}}` | Komando hijau berdiri | ~96×102 |
| 2 | `player_run1.png` | `image_2` | `{{asset_image_2}}` | Komando hijau lari (frame A) | ~126×103 |
| 3 | `player_run2.png` | `image_3` | `{{asset_image_3}}` | Komando hijau lari (frame B) | ~124×103 |
| 4 | `player_shoot.png` | `image_4` | `{{asset_image_4}}` | Komando hijau menembak | ~113×102 |
| 5 | `enemy_idle.png` | `image_5` | `{{asset_image_5}}` | Tentara musuh (hitam) berdiri | ~96×102 |
| 6 | `enemy_run1.png` | `image_6` | `{{asset_image_6}}` | Tentara musuh lari (frame A) | ~126×103 |
| 7 | `enemy_run2.png` | `image_7` | `{{asset_image_7}}` | Tentara musuh lari (frame B) | ~123×103 |
| 8 | `muzzle.png` | `image_8` | `{{asset_image_8}}` | Muzzle flash kecil | ~13×8 |
| 9 | `dirt.png` | `image_9` | `{{asset_image_9}}` | Tile tanah (ground) | 128×128 |
| 10 | `grass.png` | `image_10` | `{{asset_image_10}}` | Tile rumput (top ground) | ~59×68 |
| 11 | `explosion.png` | `image_11` | `{{asset_image_11}}` | Ledakan — **spritesheet 10×5, 100px/frame (50 frame)** | 1000×500 |

> Catatan: **explosion** adalah spritesheet (bukan 1 gambar). Tema memuatnya sebagai spritesheet
> Phaser dengan `frameWidth:100, frameHeight:100` lalu memutar animasi ledakan.

## Yang TETAP prosedural (tidak perlu upload)

- **Backdrop parallax** (langit per-biome, gunung berlapis, awan) — digambar kode, lebih ringan & terkontrol.
- **Boss** — digambar prosedural (tank/benteng besar) agar megah & terskala.
- **Peluru player, partikel spark, amplop 💌, crate, barel, POW, mempelai, couple-canvas** — prosedural.

## Lisensi (semua bebas pakai komersial, AMAN)

| Aset | Sumber | Lisensi | Atribusi |
|------|--------|---------|----------|
| player_*, enemy_*, muzzle | "Sput's Soldier Pack" (OpenGameArt, author SPUTS) | **CC0** | tidak wajib |
| dirt, grass | Kenney "Platformer Pack Redux" | **CC0** | tidak wajib |
| explosion | OpenGameArt "Explosion 7" | **CC0** | tidak wajib |
| (background props sumber `bg_elements.png`) | Kenney "Background Elements" | **CC0** | tidak dipakai (prosedural) |

> Semua **CC0** (public domain) — tidak perlu kredit, bebas dipakai komersial. Tidak ada rip
> sprite Metal Slug asli (hak cipta SNK) — gaya "terinspirasi", legal.

## File mentah (arsip, TIDAK untuk diupload)

Folder `assets/` berisi sheet asli (`soldier_pack.png`, `players.png`, `ground.png`, dll) + XML
atlas + folder `sliced/`. Hanya folder [`upload/`](upload/) yang perlu kamu upload.
