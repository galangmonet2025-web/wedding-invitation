# RetroContra Wedding Theme — Design Document

Version: 0.2 (design locked — decisions confirmed; no code yet)
Status: **READY TO IMPLEMENT** — decisions below are final per stakeholder review.

Genre: **Run-and-gun (Contra-style)** dengan **section vertikal** (memanjat
base/waterfall), seperti Contra stage 2 ("the base").

**Judul cover: "CONTRA: OPERATION LOVE".**

### Keputusan final (review v0.2)
1. **Nyawa**: model **bertingkat per-difficulty** (lihat §6). Bukan one-hit murni.
2. **Karakter**: **komando pria yang dimainkan; sang putri (mempelai wanita)
   diselamatkan di akhir** (alur ending ala RetroMario).
3. **Judul**: **CONTRA: OPERATION LOVE**.
4. **Segmen vertikal**: dibangun di **Fase 2**. Prototype Fase 1 = 1 stage
   **horizontal** playable end-to-end dulu.

---

## 1. Tujuan & Prinsip

Undangan pernikahan berbentuk game Contra yang **bisa dimainkan**. Pemain
(mempelai pria sebagai komando) menembus markas musuh, menembak,
mengumpulkan power-up, dan **menemukan kepingan undangan** dari **kapsul
power-up melayang** yang ditembak. Di ujung tiap stage ada **gerbang/boss**;
stage final menyelamatkan sang putri (mempelai wanita) — ending bahagia.

Urutan prioritas (mengikuti RetroMario):
**gameplay > playability > authenticity > mobile > invitation > visuals.**

Aturan keras yang diwarisi dari RetroMario:
- Satu IIFE self-contained, semua digambar di satu `<canvas>`.
- Cleanup global (`window.__rcCleanup`) dipanggil saat theme di-reinject.
- Binding `{{var}}` / `data-var` / `data-info` di-resolve host **sebelum** JS jalan.
- Section undangan = sumber data tunggal; modal meng-clone section (jadi
  `{{vars}}` cuma muncul sekali).
- Host yang memiliki audio musik tenant; game memanggil
  `pauseHostMusic()` / `playHostMusic()` — tidak menyentuh `#bg-music` langsung.
- localStorage menyimpan progress (`rc_wedding_state_v1`).

---

## 2. File & Penamaan

Folder baru: `src/sample-theme/retrocontra/`
- `index.html` — shell, HUD, cover, overlay, modal, invitation sections.
- `index.css` — styling shell (reuse banyak dari retromario, prefix `rc-`).
- `index.js` — engine game + invitation glue.
- `DESIGN.md` — dokumen ini.
- `CONTRA_LEVEL_BIBLE.md` — aturan desain level (dibuat di fase berikut).

**Prefix CSS/ID: `rc-`** (RetroMario pakai `rm-`). Mencegah bentrok bila dua
theme ter-load. ID yang DIWAJIBKAN host tetap sama persis:
`btn-show-qr`, `btn-toggle-music`, `bg-music`, `play-icon`, `pause-icon`,
`wish-name`, `wish-message`, `btn-submit-ucapan`, `rm-rsvp-name` → akan
diganti `rc-rsvp-name` tapi handler `window.submitRsvp`/`submitUcapan` sama.

> Catatan: cek apakah host mencari ID ber-prefix `rm-` secara hardcoded. Jika
> ya, kita pertahankan ID kontrak-host itu apa adanya dan hanya prefix `rc-`
> untuk elemen internal. (TODO verifikasi saat implementasi.)

---

## 3. Loop Gameplay Inti (Contra)

### 3.1 Kontrol
| Aksi | Keyboard | Touch |
|---|---|---|
| Gerak kiri/kanan | ←/→ , A/D | joystick |
| Lompat | ↑ / W / Space | tombol **A** |
| Tembak | **J / Z / Ctrl** | tombol **B (FIRE)** |
| Aim atas | ↑ (sambil tembak) | joystick atas |
| Aim bawah / tiarap | ↓ / S | joystick bawah |
| Aim diagonal | ↑+→ dst (8 arah) | joystick diagonal |

Contra klasik: **8-arah aim**. Saat diam + ↑ → tembak lurus atas. Saat lari +
↑ → diagonal atas. ↓ saat diam → tiarap (prone) & tembak datar rendah. ↓ saat
di udara → bisa drop ke platform tembus (opsional fase 2).

Perbedaan kunci dari Mario: **tidak menginjak musuh untuk membunuh** — semua
dibunuh dengan **peluru**. Sentuhan musuh/peluru musuh = mati (one-hit, klasik
Contra) ATAU pakai sistem nyawa + invuln singkat (lihat §6 difficulty).

### 3.2 Senjata (power-up khas Contra)
Tembak **kapsul melayang** (pod) atau **falcon** untuk drop senjata:
- **(default) Rifle** — peluru tunggal cepat.
- **S — Spread** ★ ikon undangan utama — 5 peluru menyebar (senjata ikonik Contra).
- **M — Machine gun** — tembak beruntun saat tombol ditahan.
- **L — Laser** — sinar tembus menembus.
- **F — Fire** — peluru api berputar.
- **R — Rapid** (modifier kecepatan), **B — Barrier** (perisai sesaat).

Mati → kembali ke Rifle (klasik). Cheat mode → senjata maksimal + invincible.

### 3.3 Musuh
- **Soldier** — lari/jongkok, menembak datar ke arah pemain.
- **Runner** — lari ke pemain tanpa nembak (pengganti goomba).
- **Turret/Cannon** — diam, menembak periodik (ditembak untuk buka info, opsi).
- **Sniper di atas** — di platform tinggi, menembak diagonal.
- **Flying pod (kapsul)** — melayang H/V; **isi power-up + kepingan undangan**.
- **Mortar/Grenadier** — lemparan parabola (hard).
- **Wall turret (vertical section)** — di dinding base, menembak horizontal.

Semua musuh "fair": telegraph sebelum nembak, tidak spawn tepat di depan
pemain, tidak di start-safe zone (mengikuti bible §1.3/§2.2 dari Mario).

### 3.4 Boss tiap stage
- Stage biasa: **gerbang/sensor** atau **wall-core** (inti yang ditembak).
- Stage final: **Boss komandan + penyelamatan sang putri** (reuse alur boss
  ending RetroMario: gate → approach → free → together → flag/finale →
  fireworks + fanfare + congrats dialog).

---

## 4. Struktur Level: Horizontal + Vertikal

Inovasi vs RetroMario: **dua mode kamera**.

### 4.1 Segmen horizontal (default)
Sama seperti Mario: kamera ikut pemain ke kanan, world grid berbasis tile,
pattern library menstempel layout. Pit/jurang tetap mematikan.

### 4.2 Segmen vertikal ("base climb")
Di tengah/akhir stage tertentu: kamera **naik ke atas**. Pemain memanjat
platform menanjak, menghindari turret dinding & jurang, menuju **inti di
puncak**. Implementasi:
- `world.mode = 'horizontal' | 'vertical'` per segmen.
- Vertikal: kamera mengunci X, target Y = posisi pemain; platform di-stamp
  menaik; "lantai bawah" = lava/void (jatuh = mati).
- Reuse fisika yang sama; cuma arah kamera & autoscroll opsional yang beda.

> Autoscroll opsional (Contra base naik otomatis) ditandai sebagai
> **fase 2** — fase 1 cukup kamera-follow vertikal manual.

### 4.3 World ladder (8 stage) — biome
Mengikuti pola RetroMario `WORLDS[]`:
1. **Jungle** (horizontal) — easy, perkenalan tembak.
2. **Jungle Bridge** (horizontal + 1 jembatan jurang) — easy.
3. **Base Exterior** (horizontal) — medium, turret pertama.
4. **Waterfall Climb** (VERTIKAL) — medium, perkenalan panjat.
5. **Snowfield** (horizontal) — medium, musuh padat.
6. **Energy Zone** (horizontal, lava) — hard.
7. **Inner Base Climb** (VERTIKAL) — hard, turret dinding.
8. **Alien Lair + Boss + rescue** (campur) — hard, ending.

Difficulty knobs (easy/med/hard × base world) **persis pola Mario**: enemy
speed, density, gap width, panjang stage, hazard extra. Mode dipilih di cover.

---

## 5. Integrasi Undangan

### 5.1 Kepingan info (sama set seperti Mario)
`couple, schedule, gallery, gift, story, streaming, happiness, rsvp, wishes,
closing` — hanya yang section-nya render (feature flag) yang dipakai.

### 5.2 Cara ditemukan: **Kapsul Power-up**
- Stage menaruh **flying pod** di jalur utama (kuota per stage, jumlah total =
  jumlah INFOS, persis mekanisme `STAGE_INFO_QUOTA` Mario).
- **Tembak pod** → meledak → keluar **power-up senjata** + **buka 1 kepingan
  undangan** (toast + ikon inventory menyala + badge "baru").
- Pod-info dipetakan ke slice INFOS yang FIXED per stage (deterministik,
  seperti `stageInfoOffset` Mario) — kepingan yang sama selalu di posisi sama.
- Pod biasa (tanpa info) hanya drop senjata (filler).
- Ikon inventory (kanan-atas) tetap: klik → buka modal clone section.
- Selesai run / semua pod-info ditembak → semua kepingan ke-unlock + tombol
  "lihat undangan" aktif (reuse `viewUnlocked`/`updateViewBtn`).

### 5.3 Reveal akhir
Mengalahkan boss final → semua kepingan unlock → **fireworks + fanfare +
dialog "happy ending"** → tombol "LIHAT UNDANGAN" → halaman invitation scroll
(reuse penuh dari RetroMario: countdown, kalender, galeri-lightbox, RSVP,
wishes, gift copy, host-music control).

---

## 6. Nyawa, Mati, Difficulty

Contra klasik = one-hit death + stok nyawa. Untuk undangan (harus ramah tamu),
usul:
- **Easy**: 5 nyawa, invuln 1.5s setelah hit, hit pertama hanya lepas senjata
  (turun ke Rifle) bukan langsung mati.
- **Medium**: 3 nyawa, hit = mati & respawn di checkpoint.
- **Hard**: 3 nyawa, one-hit murni (autentik), musuh padat.
- **Cheat**: invincible, semua senjata, pilih stage (reuse `rc-star-btn` /
  stage-select). Skor dinonaktifkan saat cheat (sama Mario).

Pit/void/lava = mati paksa (kill walau invuln), reuse logika `die(force)`.
Checkpoint per stage (reuse `cp()` tag pattern).

---

## 7. Audio

Reuse penuh sistem WebAudio Mario + **SFX baru Contra**:
- `shoot` (pew rifle), `spread` (tembakan menyebar), `laser`, `machinegun`,
  `explosion` (musuh/pod meledak), `powerget` (ambil senjata), `hit` (pemain
  kena), `bosshit`, `turretfire`, `alarm` (boss muncul).
- BGM chiptune in-game (reuse scheduler `stepBgm`, pola lebih "militer/tegang").

---

## 8. Sprite (digambar via fillRect, cache offscreen — reuse `getSprite`/`blit`)

- **Komando (groom)**: pita kepala merah, rompi, senapan; pose: idle, run(×3),
  jump, fall, prone(tiarap), aim-up, aim-diag, climb (untuk segmen vertikal),
  shoot-flash.
- **Sang putri**: reuse `paintPrincess` Mario (gaun putih + mahkota), untuk
  ending rescue.
- Musuh: soldier, runner, turret, sniper, flying-pod, boss-core.
- Peluru, ledakan (partikel), kapsul, ikon senjata S/M/L/F.
- Sidebar desktop: tableau pernikahan bertema militer/Contra (opsional, bisa
  reuse arch + couple dari Mario dengan recolor).

---

## 9. Apa yang Di-reuse vs Baru

**Reuse hampir apa adanya (ganti prefix `rm-`→`rc-`):**
shell layout, HUD, inventory, modal, lightbox, overlay flow, audio engine &
BGM scheduler, joystick & tombol, host-music reconcile, countdown, kalender,
RSVP/wishes, sprite cache (`getSprite/blit/shade`), particle system, fireworks,
boss-ending cutscene, localStorage persist, cheat & stage-select, resize/camera
hi-res, princess sprite.

**Tulis baru:**
- Sistem **menembak** (peluru pemain 8-arah, cooldown, jenis senjata).
- **Aim** dari input (8 arah) + pose aim.
- Musuh yang **menembak balik** + peluru musuh.
- **Flying pod** sebagai pembawa info (ganti "?" block).
- **Segmen vertikal** (mode kamera + climb).
- **Power-up senjata** (S/M/L/F/R/B) menggantikan mushroom/star/flower.
- Pattern library bertema Contra (trench, turret nest, bridge, climb wall).
- Boss "core/gate" (selain reuse boss-ending Mario untuk final).
- Sprite komando + musuh Contra.

---

## 10. Rencana Bertahap (saat sudah disetujui)

**Fase 1 — Prototype playable (1 stage horizontal):**
shell+CSS, komando bergerak+lompat, tembak rifle, 1-2 musuh, flying-pod→info,
1 boss-core sederhana, integrasi modal+invitation, audio dasar. → bisa dimainkan
end-to-end & membuka undangan.

**Fase 2 — Senjata + vertikal:**
spread/machine/laser/fire, segmen vertikal (waterfall climb), musuh menembak,
turret, difficulty knobs.

**Fase 3 — 8 stage + boss final + polish:**
world ladder lengkap, boss final + rescue ending, fireworks, sidebar desktop,
SFX/BGM lengkap, cheat/stage-select, balancing.

---

## 11. Status Keputusan

Semua pertanyaan desain utama **sudah final** (lihat blok "Keputusan final"
di atas): nyawa bertingkat, komando pria + rescue putri, judul "CONTRA:
OPERATION LOVE", vertikal di Fase 2.

Satu hal yang **diverifikasi saat implementasi** (bukan blocker desain):
- **ID kontrak-host**: konfirmasi di kode host apakah ID seperti `btn-show-qr`,
  `btn-toggle-music`, `bg-music`, `play-icon`, `pause-icon`,
  `btn-submit-ucapan`, `wish-name`, `wish-message` dicari secara hardcoded.
  ID kontrak-host itu **dipertahankan apa adanya**; hanya elemen internal yang
  diberi prefix `rc-`.
```
