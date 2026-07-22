# ASSET.md — Brief Pembuat Aset · Forest RPG Wedding

> Dokumen ini adalah **satu-satunya sumber kebenaran** untuk membuat aset gambar tema
> `forest-rpg-wedding`. Isinya: aturan umum + 5 tabel kebutuhan + 5 blok JSON + tata-letak
> sheet + urutan upload. Tidak perlu membaca Bible untuk mengerjakan ini.
>
> Referensi teknis lengkap: `FOREST_RPG_BIBLE.md` APPENDIX P.

---

## MODE A vs MODE B — pilih salah satu

| | **Mode A (DISARANKAN)** | **Mode B** |
|---|---|---|
| Sumber | Pack **Tiny RPG Forest** oleh Ansimuz | Generate baru (image-gen / digambar) |
| Lisensi | **CC0** (public domain, komersial OK) | milik sendiri |
| Kerja | *Repack* frame pack ke tata-letak di bawah | Gambar sesuai `deskripsi` tiap JSON |
| Biaya | Gratis (name-your-own-price) | waktu/biaya generate |

**Mode A — langkah wajib:**
1. Download dari **https://ansimuz.itch.io/tiny-rpg-forest** (gratis, boleh bayar sukarela).
2. **Simpan `LICENSE.txt` dari dalam ZIP** ke `src/sample-theme/forest-rpg-wedding/assets/LICENSE-ansimuz.txt`.
   Ini bukti lisensi — wajib ada sebelum tema dipakai produksi.
3. **JANGAN** menyalin `atlas.png` dari repo GitHub ForestRPG — itu hasil repack pihak ketiga.
   Ambil aset mentah dari pack resmi.
4. Susun ulang frame ke tata-letak per-baris di bawah, lalu ekspor 5 PNG.

> ⚠️ **AUDIO: NOL FILE.** Jangan menyertakan musik/SFX apa pun. Backsound adalah milik host;
> SFX game dibuat sintetis lewat Web Audio di `index.js`. Musik `ancient_path` di repo ForestRPG
> **bukan** CC0 — jangan dipakai.

---

## ATURAN UMUM (berlaku untuk KELIMA sheet)

| Aturan | Nilai |
|---|---|
| Format | **PNG dengan alpha transparan** |
| Gaya | Pixel-art, **tanpa anti-alias / blur tepi** |
| Ukuran sel | **minimum 80x80 px** (≈2x tekstur engine — engine men-downscale) |
| Keseragaman | Semua frame **satu entity** = ukuran sel SAMA |
| Arah hadap | **KANAN** untuk sprite berarah-samping (engine `setFlipX` untuk kiri) |
| Pivot | Entity darat: **kaki di baris paling bawah sel**. Entity terbang: **tengah sel** |
| Tata-letak | Frame satu entity **horizontal kiri→kanan** (frame 0 paling kiri); **entity berbeda = baris berbeda** |
| Lebar frame | **Boleh berbeda** antar frame (pose serang lebih lebar) → dicatat rect eksplisit di frame-map |
| Penamaan | Persis seperti kolom "Nama file" di tabel |
| Larangan | **No text, no watermark, no UI** — HUD digambar engine |

**Palet acuan (hex, jaga konsisten agar animasi tidak "kedip"):**

| Elemen | Hex |
|---|---|
| Rumput terang / gelap | `#5a8f42` / `#3a5f30` |
| Kayu / tanah | `#8a6a4a` / `#6b4a2a` |
| Treant hijau gelap | `#3a5f30` |
| Mole cokelat | `#8a6a4a` |
| Emas (kepingan/gerbang) | `#e8c15a` |
| Merah (hati/karpet) | `#d05a5a` |
| Outline gelap | `#1a2416` |

---

## 1. SHEET `player` → slot upload **#1**

**File:** `player_groom.png`, `player_bride.png`

| No | Nama file | frameW | frameH | Tekstur engine | Jml frame | Deskripsi tiap frame |
|---|---|---|---|---|---|---|
| 1 | `player_groom.png` | 80 | 80 | `t_p_walk_down/up/side_*`, `t_p_idle_*`, `t_p_shoot_*` | 4 baris x 11 | Mempelai **pria**: jas hitam, dasi, kemeja putih. Per baris arah: 2 idle (napas naik-turun 1px), 6 walk (langkah bergantian), 3 shoot (tarik busur / lepas / recoil) |
| 2 | `player_bride.png` | 80 | 80 | idem (varian karakter) | 4 baris x 11 | Mempelai **wanita**: gaun putih panjang, kerudung/veil, rambut gelap. **Struktur frame IDENTIK** dengan groom agar frame-map sama persis. Gaun berayun halus saat walk |

**Tata-letak baris:** `0 = down`, `1 = up`, `2 = side (hadap KANAN)`, `3 = hurt/extra`.
Urutan kolom tiap baris: `idle0, idle1, walk0..walk5, shoot0, shoot1, shoot2`.

Kedua karakter membawa **busur kayu kecil**. Pemain memilih karakter di layar cover.

---

## 2. SHEET `enemy` → slot upload **#2**

| No | Nama file | frameW | frameH | Tekstur engine | Jml frame | Deskripsi tiap frame |
|---|---|---|---|---|---|---|
| 1 | `enemy_mole.png` | 80 | 80 | `t_e_mole_*` | 3 baris x 6 + 3 | Tikus tanah cokelat `#8a6a4a`, badan bulat rendah, moncong pink, cakar krem. 3 baris arah (down/up/side) x 6 walk (badan bergoyang, cakar bergerak). Baris 4: 3 die (mengempis + puff debu) |
| 2 | `enemy_treant.png` | 96 | 96 | `t_e_treant_*` | 3 baris x 6 + 3 | Treant `#3a5f30`: pohon berjalan bertajuk kanopi, batang cokelat, dua kaki akar, mata kuning. Siluet **LEBAR & BERTAJUK** (harus beda jelas dari mole). Baris 4: 3 die (tumbang + daun berhamburan) |
| 3 | `enemy_mole_dig.png` | 80 | 80 | `t_e_mole_dig_*` | 11 | Mole penggali (helm daun). 1 buried (**hanya gundukan tanah, tanpa badan**), 3 emerge (retak → kepala → badan penuh), 4 chase (lari cepat + debu), 3 die |
| 4 | `enemy_treant_old.png` | 96 | 112 | `t_e_treant_old` | 10 | Treant Tua **STATIS** `#4a3f32`, lumut biru, mata merah. 2 idle (goyang pelan), 2 windup (badan mundur, ranting terangkat), 2 fire (melempar + biji lepas), 1 hurt (kilat putih), 3 die (retak → runtuh jadi tunggul) |
| 5 | `enemy_firefly.png` | 80 | 80 | `t_e_firefly_*` | 7 | Kunang Api: bola cahaya `#ffb84a` + sayap transparan + ekor cahaya. 4 fly (denyut terang-redup, sayap mengepak), 3 die (pecah jadi percikan). **Melayang di TENGAH sel**, glow lembut |
| 6 | `enemy_thorn.png` | 80 | 80 | `t_e_thorn_*` | 5 | Akar Duri hazard: 1 hidden (tanah rata, retak samar), 2 crack (retak melebar + partikel), 2 up (duri akar cokelat ujung tajam menyembul penuh). Pivot dasar sel |
| 7 | `boss_ent.png` | 160 | 192 | `t_boss` | 12 | **ENT PENJAGA GERBANG**: pohon purba raksasa berwajah, batang lebar berlumut, kanopi lebat, 2 lengan ranting panjang, mata hijau bersinar, akar besar. 2 idle, 2 windup (lengan terangkat, mata menyala), 2 attack_root (menghantam tanah), 2 attack_seed (melempar), 1 hurt, **3 defeated (MEMBUNGKUK hormat, mata melembut jadi kuning hangat, kelopak bunga muncul — BUKAN mati/hancur)**. Hadap **BAWAH** |

> **Catatan boss:** ini undangan pernikahan — Ent tidak dibunuh, ia **merestui**. Frame
> `defeated` harus terbaca sebagai *membungkuk hormat*, bukan hancur.

---

## 3. SHEET `environment` → slot upload **#3**

| No | Nama file | frameW | frameH | Tekstur engine | Jml frame | Deskripsi |
|---|---|---|---|---|---|---|
| 1 | `env_tileset.png` | 80 | 80 | `t_floor`, `t_wall`, `t_water` | grid | Tileset hutan top-down **16x16 per tile** (sel sheet 80x80): rumput 4 varian, jalur cokelat 4 varian, 8 tile transisi rumput↔jalur, air dangkal 2 frame riak, tepi air 4, batu lantai 4, lumut 2. **SEAMLESS WAJIB** — tile bersebelahan tak boleh menampakkan garis jahitan |
| 2 | `env_props.png` | 80 | 96 | `t_tree`, `t_bush`, `t_rock`, `t_mushroom`, `t_grass`, `t_stump` | 1 sel/item | Props hutan, tiap item satu sel: pohon besar, pohon kecil, **semak destructible (2 frame: utuh, bergetar)**, pot tanah liat, batu besar, batu kecil, tunggul, jamur merah, jamur biru, bunga putih/kuning/merah/ungu/biru, rumput tinggi, pakis, teratai, kayu lapuk, akar menonjol, tengkorak hewan, pagar kayu, gerobak, jerami, papan petunjuk, obor (2 frame api berkedip), pilar batu, bendera. Bayangan lembut di bawah, pivot dasar sel |
| 3 | `env_gate.png` | 192 | 160 | `t_gate_closed`, `t_gate_open` | 3 | **Gerbang Gunung**: gapura batu raksasa berukir motif daun & hati, 2 pilar + lengkung atas. 3 frame: closed (pintu batu rapat, gelap), opening (celah bercahaya emas melebar + partikel), open (terbuka penuh, cahaya emas menyembur, karpet merah terlihat di baliknya). Hadap **BAWAH** |

---

## 4. SHEET `game-object` → slot upload **#4**

| No | Nama file | frameW | frameH | Tekstur engine | Jml frame | Deskripsi |
|---|---|---|---|---|---|---|
| 1 | `obj_arrows.png` | 80 | 80 | `t_arrow_h`, `t_arrow_v`, `t_seed` | 3 baris | Baris 1: panah kayu 4 arah (batang cokelat, bulu putih, mata panah abu). Baris 2: **panah api** 4 arah (menyala oranye + jejak api). Baris 3: biji musuh (bola cokelat berduri, 2 frame berputar), muzzle spark 2 frame. Tampil kecil di engine (panah ~12x4 px) tapi sel tetap besar agar tajam |
| 2 | `obj_items.png` | 80 | 80 | `t_heart`, `t_flower` | 1 sel/item | Hati merah kecil (2 frame denyut), bunga skor kuning (2 frame kilau), **Panah Api** pickup (busur menyala di atas alas batu), **Sepatu Cepat** (sepatu kulit bersayap), **Jimat Daun** (liontin daun hijau bersinar), **Kunci** kuningan (2 frame kilau). Semua melayang sedikit + bayangan bulat di bawah |
| 3 | `obj_fx.png` | 80 | 80 | `t_spark` | 1 sel/item | Partikel & efek: spark putih-kuning, daun hijau jatuh (3 rotasi), kelopak bunga pink (3 rotasi), gumpalan tanah, puff debu (3 frame mengembang), percikan air, kunang-kunang glow (2 frame), ledakan daun (4 frame). Latar transparan, tepi tegas |

---

## 5. SHEET `box-kepingan` → slot upload **#5**

| No | Nama file | frameW | frameH | Tekstur engine | Jml frame | Deskripsi |
|---|---|---|---|---|---|---|
| 1 | `piece_chest.png` | 80 | 80 | `t_chest_*` | 6 | **Peti kepingan undangan**: peti kayu dengan pengikat **emas** dan ukiran **hati** di tutup, bersinar lembut. 5 frame: closed (tutup rapat, kilau emas berdenyut), opening x3 (tutup terangkat bertahap, cahaya emas makin terang), open (terbuka penuh, **surat undangan putih ber-segel lilin merah melayang keluar**). Frame ke-6: varian **terkunci** (gembok kecil di depan). Pivot dasar sel |
| 2 | `piece_envelope.png` | 80 | 80 | (animasi terbang di DOM) | 4 | Ikon kepingan: **amplop putih ber-segel lilin merah bermotif hati**. 4 frame: idle (melayang naik-turun + kilau), terkumpul (kilau emas terang), terkunci (abu-abu, alpha rendah), pecah-jadi-cahaya |
| 3 | `piece_couple.png` | 160 | 160 | `t_couple` | 3 | **Mempelai berdua di PELAMINAN** (muncul setelah boss kalah): pria berjas hitam + dasi, wanita bergaun putih + kerudung + buket, bergandengan tangan di atas karpet merah, latar gapura bunga. 3 frame: idle (napas lembut), melambai, hati muncul (partikel hati kecil di atas kepala). Tiga-perempat/top-down, hadap **BAWAH** |

---

## 📐 TATA-LETAK PERSIS YANG DIBACA ENGINE (frame-map)

> Ini **koordinat sebenarnya** yang dipakai `index.js` (tabel `SHEETS`). Susun PNG **persis**
> seperti ini. Kalau hasil aset beda ukuran, **jangan paksakan** — beri tahu saya, angka di
> `index.js` yang saya sesuaikan (bukan gambarnya yang dipaksa).
>
> Sel dibaca **kiri→kanan** per baris. `x0` = kolom mulai (px), `top` = baris mulai (px).

### Sheet 1 `player` — ukuran minimal **880 × 240 px**
| Baris (`top`) | Arah | Isi kolom (`x0`) |
|---|---|---|
| `0` | **down** | `0`: idle ×2 · `160`: walk ×6 · `640`: shoot ×3 |
| `80` | **up** | idem (kolom sama) |
| `160` | **side** (hadap KANAN) | idem (kolom sama) |

Sel `80×80`. Jadi tiap baris: `[idle0][idle1][walk0..walk5][shoot0..shoot2]` = 11 sel = 880px.

### Sheet 2 `enemy` — ukuran minimal **640 × 1072 px**
| `top` | Entity | Sel | Isi |
|---|---|---|---|
| `0` | mole | `80×80` | walk ×6 |
| `240` | treant | `96×96` | walk ×6 |
| `528` | mole penggali | `80×80` | `x0=0`: buried ×1 · `x0=320`: chase ×4 |
| `608` | treant tua | `96×112` | idle ×1 |
| `720` | kunang api | `80×80` | fly ×4 |
| `800` | akar duri | `80×80` | `x0=80`: crack · `x0=240`: up |
| `880` | **boss ent** | `160×192` | idle ×1 |

### Sheet 3 `environment` — ukuran minimal **800 × 336 px**
| `top` | Isi | Sel |
|---|---|---|
| `0` | `x0=0`: tanah · `x0=320`: dinding pohon · `x0=640`: air | `80×80` |
| `80` | `0`: pohon · `160`: semak · `320`: batu · `400`: tunggul · `480`: jamur · `640`: rumput · `720`: bunga | `80×96` |
| `176` | `0`: gerbang tertutup · `384`: gerbang terbuka | `192×160` |

### Sheet 4 `game-object` — ukuran minimal **240 × 240 px**
| `top` | Isi | Sel |
|---|---|---|
| `0` | `0`: panah vertikal · `160`: panah horizontal | `80×80` |
| `80` | `0`: hati | `80×80` |
| `160` | `0`: biji musuh · `160`: spark | `80×80` |

### Sheet 5 `box-kepingan` — ukuran minimal **400 × 320 px**
| `top` | Isi | Sel |
|---|---|---|
| `0` | peti: closed → opening×3 → open (**5 sel berurutan**) | `80×80` |
| `160` | mempelai di pelaminan | `160×160` |

> **Sheet boleh LEBIH BESAR** dari ukuran minimal (sel sisa diabaikan). Kalau **lebih kecil**,
> engine berhenti di frame yang tidak muat dan sisanya **tetap prosedural** — tidak crash,
> tapi grafiknya campur. Pastikan minimal terpenuhi.

---

## URUTAN UPLOAD (KRITIKAL — jangan tertukar)

Slot `{{asset_image_N}}` **dinomori dari urutan upload** di Theme Editor. Upload **persis** urutan ini:

| Urutan | Kelompok | Variabel | `data-asset` di `index.html` |
|---|---|---|---|
| **1** | player | `{{asset_image_1}}` | `player_sheet` |
| **2** | enemy | `{{asset_image_2}}` | `enemy_sheet` |
| **3** | environment | `{{asset_image_3}}` | `environment_sheet` |
| **4** | game-object | `{{asset_image_4}}` | `object_sheet` |
| **5** | box-kepingan | `{{asset_image_5}}` | `piece_sheet` |

> Bila tema sudah memakai slot aset untuk hal lain, **geser nomornya** dan sesuaikan `src`
> di `index.html`. Yang mutlak: **nomor `image_N` di HTML = posisi sheet dalam urutan upload.**

**FALLBACK:** slot kosong / gambar gagal load → `index.js` otomatis memakai **tekstur prosedural**
ber-shading. Game **tidak pernah blank**. Jadi tema sudah bisa dipakai/diuji **sebelum** aset siap.

---

## PANDUAN PROMPT IMAGE-GEN (Mode B)

Sertakan **semua** ini di prompt:

```
pixel-art sprite sheet, latar transparan (alpha channel),
frame disusun horizontal kiri ke kanan, ukuran sel <frameWidth>x<frameHeight> px seragam,
hadap kanan, tanpa anti-alias / blur tepi, kaki menapak baris bawah sel,
no text, no watermark, no UI.
<lalu tempel isi "deskripsi" dari JSON, sebutkan jumlah & makna TIAP frame>
<lalu sebut palet hex dari tabel Palet Acuan di atas>
```

**Verifikasi hasil:** tiap sel harus benar `frameWidth x frameHeight`. Bila meleset,
**update rect di frame-map** (`index.js` tabel `SHEETS`) — jangan paksa engine memakai grid salah.

---

## FILE JSON PENDAMPING

Isi JSON tiap kelompok di-mirror sebagai file terpisah agar bisa langsung dipakai tool:

- `player-assets.json`
- `enemy-assets.json`
- `environment-assets.json`
- `object-assets.json`
- `piece-assets.json`

---

## CHECKLIST SEBELUM UPLOAD

- [ ] PNG transparan, pixel-art, tanpa anti-alias
- [ ] Sel ≥80x80; semua frame satu entity ukuran sama
- [ ] Hadap KANAN; pivot kaki di baris bawah (terbang = tengah)
- [ ] Tileset **seamless** (uji dengan menempel 2 tile bersebelahan)
- [ ] Boss frame `defeated` = **membungkuk hormat**, bukan hancur
- [ ] Nama file persis sesuai tabel
- [ ] Upload **urut**: player → enemy → environment → game-object → box-kepingan
- [ ] **Mode A:** `assets/LICENSE-ansimuz.txt` sudah disimpan
- [ ] **Nol file audio** disertakan
