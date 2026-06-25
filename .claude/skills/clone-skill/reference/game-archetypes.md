# Arketipe Game Klasik — pilih & riset sebelum coding

Game tema ini **bukan genre baru**. Pilih satu arketipe klasik (referensi melimpah), riset
mekanik kanoniknya (WebSearch bila perlu), tulis Game Bible singkat di folder tema, lalu
bangun **serius** sesuai feel aslinya. Tabel di bawah = titik awal; perdalam sendiri.

Tiap arketipe harus menjawab: **bagaimana kepingan undangan dikoleksi?** (item khusus, bukan
sekadar menyelesaikan level).

---

## 1. Run-and-gun / platformer-shooter — *Contra, Metal Slug*
- **Feel:** energik, "berjuang menuju pelaminan". Side-scroll, selalu maju.
- **Mekanik inti:** lari, lompat, tiarap, tembak; one-hit death klasik (downgrade di EASY);
  power-up senjata (M/S/L/F); musuh (soldier/turret/drone/heavy); boss multi-fase + weak point.
- **Koleksi kepingan:** POD/amplop 💌 melayang yang **harus ditembak**; pieces = grup objek
  terpisah dari power-up. Klimaks: selamatkan mempelai di markas inti.
- **Catatan:** sudah ada implementasi referensi di `src/sample-theme/game-phaser/`.

## 2. Platformer eksplorasi — *Super Mario Bros*
- **Feel:** ceria, family-friendly, warna cerah.
- **Mekanik inti:** lari + lompat presisi (fisika lompat khas Mario: akselerasi, momentum,
  variable jump height), musuh ditindak dari atas, pipa/rahasia, power-up (jamur/bunga).
- **Koleksi kepingan:** koin/`?`-block/peti rahasia berisi kepingan; sebar di beberapa world.
  Tiap kepingan = blok spesial yang dipukul dari bawah / koin emas besar.
- **Catatan:** lihat `src/sample-theme/retromario/MARIO_LEVEL_GENERATION_BIBLE.md`.

## 3. Top-down adventure — *Zelda klasik, Pokémon*
- **Feel:** romantis, "petualangan berdua", peta dunia kecil.
- **Mekanik inti:** gerak 8-arah, ruang/dungeon, kunci-pintu, NPC dialog, item.
- **Koleksi kepingan:** buka peti harta / temui NPC yang memberi kepingan / selesaikan
  teka-teki ruangan. Cocok untuk cerita pasangan (tiap area = bab kisah).

## 4. Endless runner — *Temple Run, Subway Surfers*
- **Feel:** ringan, cepat, kasual, satu jari.
- **Mekanik inti:** auto-run, swipe lompat/geser/luncur, hindari rintangan, kecepatan naik.
- **Koleksi kepingan:** item kepingan muncul di jalur; pungut sambil lari. "Stage" = jarak/
  milestone; tiap milestone melepas satu kepingan. Cocok bila ingin sangat aksesibel.

## 5. Match-3 / puzzle — *Candy Crush, Bejeweled*
- **Feel:** manis, santai, non-reflex (bagus untuk tamu yang tak suka game aksi).
- **Mekanik inti:** tukar dua tetangga, cocokkan ≥3, kombo/cascade, special candy, target
  per-level (skor / kumpulkan warna tertentu / turunkan objek).
- **Koleksi kepingan:** tiap level punya "objek kepingan" yang harus diturunkan/dipecahkan;
  menyelesaikan papan = membuka satu kepingan undangan.

## 6. Maze / collector — *Pac-Man*
- **Feel:** retro, simpel, nostalgia, satu layar.
- **Mekanik inti:** labirin, makan semua titik, hindari hantu, power-pellet (berbalik
  memburu), buah bonus.
- **Koleksi kepingan:** "buah spesial" / pellet emas di tiap maze = kepingan. Bersihkan maze
  → kepingan stage itu terbuka.

## 7. Brick breaker — *Arkanoid / Breakout*
- **Feel:** retro, satu layar, ritmis.
- **Mekanik inti:** paddle, pantulkan bola, hancurkan blok, power-up (multi-ball, laser,
  paddle lebar), level pola blok.
- **Koleksi kepingan:** blok spesial (amplop) yang bila hancur menjatuhkan kepingan untuk
  ditangkap paddle. Tiap papan blok = satu/lebih kepingan.

---

## Aturan riset (berlaku untuk arketipe apa pun)

1. Verifikasi mekanik kanonik (mis. fisika lompat Mario, sudut spread-gun Contra, aturan
   cascade match-3). Jangan "kira-kira".
2. Dokumentasikan keputusan di Game Bible folder tema.
3. Game harus terasa **otentik** terhadap arketipe — bukan tiruan dangkal.
4. Kepingan undangan = objek game **khusus & terpisah**, didapat dengan benar-benar bermain;
   menyelesaikan stage saja tidak cukup.
5. Tetap patuh kontrak host + daftar variabel + cheat mode + layout 2-sisi (lihat SKILL.md).
