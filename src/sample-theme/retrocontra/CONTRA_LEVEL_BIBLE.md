# Contra Run-and-Gun Level Design Rules

Version: 1.0

Purpose:
Aturan resmi pembuatan level run-and-gun 2D yang meniru filosofi desain
Contra / Super C / Contra III. Generator level WAJIB mematuhi dokumen ini.
Turunan dari MARIO_LEVEL_GENERATION_BIBLE.md (RetroMario) dengan penyesuaian
untuk menembak, aim 8-arah, dan musuh yang menembak balik.

---

# 1. Core Principles

## 1.1 Playability First
Level selalu dapat diselesaikan tanpa bug/glitch. Dilarang:
- Mustahil diselesaikan.
- Butuh pixel-perfect jump.
- Butuh menerima damage untuk maju.
- Butuh senjata yang tidak tersedia (Rifle default harus cukup menamatkan).

## 1.2 Teach Before Test
Mekanik baru diperkenalkan sebelum diuji:
1. Pemain lihat 1 soldier yang menembak pelan dari jauh.
2. Pemain belajar menembaknya / berlindung.
3. Baru hadapi beberapa soldier sekaligus.

Untuk Contra spesifik:
- Tembak dulu (target diam) → tembak target bergerak → tembak sambil dikejar.
- Pod power-up pertama muncul di tempat aman supaya pemain belajar "tembak pod".

## 1.3 Fair Challenge
Pemain mati karena kesalahan sendiri, BUKAN karena:
- Musuh/peluru muncul tiba-tiba dari layar.
- Musuh spawn tepat di depan pemain.
- Peluru musuh lebih cepat dari yang bisa dihindari.
- Kamera menyembunyikan bahaya.

Aturan tembak adil:
- Setiap musuh penembak punya **telegraph** (jeda + animasi) sebelum menembak.
- Peluru musuh lebih lambat dari peluru pemain & dari lari pemain (bisa dihindari).
- Tidak ada musuh menembak di **start-safe zone** (5 tile pertama).

---

# 2. World Structure

## 2.1 Level Length
- Horizontal: 120–220 tile (skala difficulty). Hard = terpanjang.
- Vertikal (Fase 2): tinggi 30–60 tile panjat.

## 2.2 Start Safe Zone
5 tile pertama: tanpa musuh, tanpa jurang, tanpa turret. Pemain orientasi dulu.

## 2.3 Pacing (Start → Goal)
Start → Teach(tembak) → Practice → Challenge → Reward(pod) → Secret →
Checkpoint → Final push → Gate/Boss. Pod-info diletakkan di jalur utama agar
semua kepingan undangan pasti terlewati.

---

# 3. Player Mechanics

## 3.1 Gerak
Lari kiri/kanan, lompat (variable height seperti Mario), jatuh. Gravitasi &
friksi diwarisi dari RetroMario (responsif, tidak floaty).

## 3.2 Tembak & Aim (8 arah)
- Diam + tahan tembak: peluru datar ke arah hadap.
- Tekan ↑: aim atas (diam=lurus atas, lari=diagonal atas).
- Tekan ↓ saat diam di tanah: **tiarap (prone)**, peluru datar rendah.
- Tekan ↓ di udara: aim bawah (tembak ke bawah).
- 8 arah total: →, ↗, ↑, ↖, ←, ↙, ↓, ↘ (↙/↓/↘ hanya relevan di udara/tiarap).
- Cooldown per senjata; spread/machine punya cadence sendiri.

## 3.3 Senjata
Rifle(default) · S=Spread · M=Machine · L=Laser · F=Fire · R=Rapid(mod) ·
B=Barrier(mod). Mati → reset ke Rifle (klasik). Cheat → maksimal + invincible.

---

# 4. Enemies

## 4.1 Tipe
- Soldier: lari/jongkok, menembak datar (telegraph), bisa di-headshot.
- Runner: lari ke pemain, tidak menembak (kontak = damage).
- Turret/Cannon: diam, menembak periodik dengan telegraph.
- Sniper: di platform tinggi, menembak diagonal turun.
- Flying Pod: melayang (H/V), isi power-up; sebagian membawa kepingan undangan.
- Grenadier (hard): lemparan parabola.
- Wall Turret (vertikal, Fase 2): menempel dinding, menembak horizontal.

## 4.2 Density (per §1.3)
- easy: 1 musuh / 12–20 tile.
- medium: 1 / 7–12.
- hard: 1 / 4–7.
Tidak pernah di start-safe zone. Cluster harus punya celah berlindung.

## 4.3 Peluru Musuh
Kecepatan < kecepatan lari pemain. Maksimal kepadatan peluru di layar dibatasi
agar selalu ada jalan menghindar (bullet-hell terlarang).

---

# 5. Hazards
- Pit/void: jatuh = mati paksa (kill walau invuln/barrier), seperti Mario §8.
- Lava/energy: sama dengan pit.
- Spike/laser-gate berkala: harus ditelegraph (nyala-mati berirama).

---

# 6. Power-up Pods (pembawa undangan)
- Pod melayang di jalur utama; **ditembak** untuk pecah.
- Pod-info → drop senjata + buka 1 kepingan undangan (toast + ikon inventory).
- Pod biasa → hanya senjata.
- Kuota pod-info per stage = deterministik; total = jumlah INFOS (semua kepingan
  terdistribusi sepanjang playthrough). Slice INFOS per stage tetap (idempoten
  terhadap replay / stage-jump cheat).
- Pod selalu dalam jangkauan tembak yang adil (tidak butuh senjata khusus).

---

# 7. Goal / Boss
- Stage biasa: **Gate-core** — inti yang ditembak sampai hancur → stage clear.
- Stage final: Boss komandan → setelah kalah, **selamatkan sang putri**
  (gate → approach → free → together → flag/finale → fireworks + congrats),
  alur diwarisi dari RetroMario boss-ending.

---

# 8. Difficulty Scaling
Mengikuti pola RetroMario `diffKnobs`: gabungkan base-difficulty world dengan
mode pilihan pemain (easy −1 step, medium 0, hard +1, clamp 0..2). Knobs:
panjang stage, kecepatan musuh, kecepatan/kepadatan peluru musuh, lebar jurang,
kepadatan musuh, jumlah turret, hazard extra.

Nyawa (khusus undangan, ramah tamu):
- easy: 5 nyawa, invuln 1.5s sesudah hit, hit pertama hanya menurunkan senjata.
- medium: 3 nyawa, hit = mati → respawn checkpoint.
- hard: 3 nyawa, one-hit autentik.
Cheat: invincible + semua senjata + stage select; skor dinonaktifkan.

---

# 9. Camera & Readability
- Horizontal: ikut pemain, ~13 tile terlihat ke depan (baca bahaya lebih awal).
- Vertikal (Fase 2): kunci X, ikut Y; tidak menyembunyikan turret dinding.
- Bahaya selalu terlihat sebelum aktif (peluru, pit, gate).

---

# 10. Checkpoints
Satu zona checkpoint per stage (tag `cp()`), pada stretch datar & aman. Respawn
medium/hard ke checkpoint bila sudah dilewati.
