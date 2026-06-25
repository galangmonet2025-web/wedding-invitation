# Dokumentasi Koordinat Sprite Sheet

Semua koordinat berformat `(X awal, Y awal, Lebar, Tinggi)`.
Sumbu X dan Y dimulai dari pojok kiri atas (0,0).

## 1. enemy_rush.png (Penyerbu Darat Merah Marun)
- **Dimensi Sel:** 48x76
- **Total Lebar:** 288px (6 Frame)
- **Koordinat:**
  - Frame 0 (walk_1): `(0, 0, 48, 76)`
  - Frame 1 (walk_2): `(48, 0, 48, 76)`
  - Frame 2 (walk_3): `(96, 0, 48, 76)`
  - Frame 3 (walk_4): `(144, 0, 48, 76)`
  - Frame 4 (hurt):   `(192, 0, 48, 76)`
  - Frame 5 (die):    `(240, 0, 48, 76)`

## 2. enemy_range.png (Penembak Ungu)
- **Dimensi Sel:** 48x76
- **Total Lebar:** 240px (5 Frame)
- **Koordinat:**
  - Frame 0 (idle): `(0, 0, 48, 76)`
  - Frame 1 (aim):  `(48, 0, 48, 76)`
  - Frame 2 (fire): `(96, 0, 48, 76)`
  - Frame 3 (hurt): `(144, 0, 48, 76)`
  - Frame 4 (die):  `(192, 0, 48, 76)`

## 3. enemy_turret.png (Meriam Statis)
- **Dimensi Sel:** 76x56
- **Total Lebar:** 380px (5 Frame)
- **Koordinat:**
  - Frame 0 (idle):  `(0, 0, 76, 56)`
  - Frame 1 (aim):   `(76, 0, 76, 56)`
  - Frame 2 (fire):  `(152, 0, 76, 56)`
  - Frame 3 (hurt):  `(228, 0, 76, 56)`
  - Frame 4 (wreck): `(304, 0, 76, 56)`

## 4. enemy_drone.png (Drone Terbang)
- **Dimensi Sel:** 64x40
- **Total Lebar:** 256px (4 Frame)
- **Koordinat:**
  - Frame 0 (hover_1): `(0, 0, 64, 40)`
  - Frame 1 (hover_2): `(64, 0, 64, 40)`
  - Frame 2 (drop):    `(128, 0, 64, 40)`
  - Frame 3 (wreck):   `(192, 0, 64, 40)`

## 5. enemy_tank.png (Tank Berat)
- **Dimensi Sel:** 128x80
- **Total Lebar:** 640px (5 Frame)
- **Koordinat:**
  - Frame 0 (roll_1): `(0, 0, 128, 80)`
  - Frame 1 (roll_2): `(128, 0, 128, 80)`
  - Frame 2 (aim):    `(256, 0, 128, 80)`
  - Frame 3 (fire):   `(384, 0, 128, 80)`
  - Frame 4 (wreck):  `(512, 0, 128, 80)`

## 6. enemy_boss.png (Jenderal Pembatal Nikah)
- **Dimensi Sel:** 260x280
- **Total Lebar:** 1560px (6 Frame)
- **Koordinat:**
  - Frame 0 (idle_1):    `(0, 0, 260, 280)`
  - Frame 1 (idle_2):    `(260, 0, 260, 280)`
  - Frame 2 (telegraph): `(520, 0, 260, 280)`
  - Frame 3 (fire):      `(780, 0, 260, 280)`
  - Frame 4 (enraged):   `(1040, 0, 260, 280)`
  - Frame 5 (defeated):  `(1300, 0, 260, 280)`