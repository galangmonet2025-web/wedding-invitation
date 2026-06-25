# Mario Classic Level Design Rules

Version: 1.0

Purpose:
Dokumen ini mendefinisikan aturan resmi untuk pembuatan level platformer 2D yang meniru filosofi desain game Super Mario Bros., Super Mario Bros. 3, dan Super Mario World.

Generator level WAJIB mematuhi seluruh aturan dalam dokumen ini.

---

# 1. Core Principles

## 1.1 Playability First

Level harus selalu dapat diselesaikan tanpa bug, exploit, atau glitch.

Dilarang membuat level yang:

* Mustahil diselesaikan.
* Membutuhkan pixel-perfect jump.
* Membutuhkan damage untuk melanjutkan.
* Membutuhkan item yang tidak tersedia.

---

## 1.2 Teach Before Test

Setiap mekanik baru harus diperkenalkan sebelum diuji.

Contoh:

Benar:

1. Pemain melihat Goomba.
2. Pemain belajar menginjak Goomba.
3. Pemain menghadapi beberapa Goomba.

Salah:

1. Pemain langsung menghadapi 5 Goomba di jurang.

---

## 1.3 Fair Challenge

Pemain harus mati karena kesalahan sendiri.

Pemain tidak boleh mati karena:

* Objek muncul tiba-tiba.
* Musuh spawn tepat di depan karakter.
* Kamera menyembunyikan bahaya.

---

# 2. World Structure

## 2.1 Level Length

Level pendek:

* 500 - 1000 pixel

Level normal:

* 1000 - 4000 pixel

Level panjang:

* 4000 - 8000 pixel

---

## 2.2 Starting Area

50% area awal harus aman.

Tidak boleh ada:

* Jurang
* Musuh
* Trap

Dalam 5 detik pertama permainan.

---

## 2.3 Goal Area

Setiap level harus memiliki:

* Goal Pole
  atau
* Castle Door

Goal harus terlihat jelas.

---

# 3. Player Physics

## 3.1 Jump Rules

Generator harus mengetahui:

* Tinggi lompatan normal
* Tinggi lompatan saat berlari
* Jarak lompatan maksimal

Tidak boleh membuat platform yang melampaui batas tersebut.

---

## 3.2 Running Space

Sebelum lompatan jauh:

Minimal tersedia:

* 3 sampai 5 tile area lari

---

## 3.3 Landing Space

Setelah lompatan:

Minimal tersedia:

* 2 tile untuk mendarat

Hard mode:

* 1 tile diperbolehkan

---

# 4. Coin Rules

## 4.1 Reachability

Semua coin harus dapat diambil.

Jika coin berada di udara:

Wajib tersedia:

* Platform
* Pipe
* Block
* Moving platform

Sebagai pijakan.

---

## 4.2 Coin Trails

Coin dapat digunakan untuk:

* Menunjukkan arah
* Menunjukkan jalur rahasia
* Menunjukkan posisi lompat

---

## 4.3 Hidden Coin

Coin tersembunyi tidak boleh diperlukan untuk menyelesaikan level.

---

# 5. Block Rules

## 5.1 Question Block

Question block dapat berisi:

* Coin
* Mushroom
* Fire Flower
* Star
* 1UP

---

## 5.2 Hidden Block

Hidden block hanya boleh:

* Memberi bonus
* Memberi shortcut

Tidak boleh:

* Wajib ditemukan untuk menyelesaikan level

---

## 5.3 Breakable Block

Hanya Mario besar yang boleh menghancurkan block.

---

# 6. Pipe Rules

## 6.1 Pipe Placement

Pipe harus:

* Menyentuh tanah
* Memiliki ukuran logis

---

## 6.2 Warp Pipe

Warp pipe boleh:

* Menuju bonus room
* Shortcut
* Secret area

Warp pipe tidak boleh:

* Mengunci pemain

---

# 7. Enemy Rules

## 7.1 Spawn Distance

Musuh pertama:

Minimal 5 tile dari titik spawn.

---

## 7.2 Enemy Density

Easy:

1 musuh setiap 10-20 tile

Medium:

1 musuh setiap 6-10 tile

Hard:

1 musuh setiap 3-6 tile

---

## 7.3 Enemy Near Pit

Musuh tidak boleh ditempatkan:

* Tepat di tepi jurang

Kecuali level hard.

---

## 7.4 Stompable Enemy

Contoh:

* Goomba
* Koopa

Harus bisa dibunuh dengan diinjak.

---

## 7.5 Dangerous Enemy

Contoh:

* Spiny

Tidak bisa diinjak.

Harus diperkenalkan terlebih dahulu sebelum digunakan dalam jumlah besar.

---

# 8. Pit Rules

## 8.1 Death Pit

Jika pemain jatuh:

Status = DEAD

---

## 8.2 Pit Width

Easy:

1-3 tile

Medium:

3-5 tile

Hard:

5-8 tile

Extreme:

8+ tile

---

## 8.3 First Pit

Jurang pertama:

Harus mudah dilompati.

---

# 9. Platform Rules

## 9.1 Reachability

Semua platform harus:

* Bisa dicapai
* Bisa ditinggalkan

---

## 9.2 Vertical Platforming

Ketinggian antar platform:

Maksimum 80% dari tinggi lompatan karakter.

---

## 9.3 Moving Platform

Moving platform harus:

* Terlihat sebelum digunakan
* Tidak bergerak terlalu cepat

---

# 10. Power-Up Rules

## 10.1 Mushroom

Small Mario + Mushroom

Result:

Big Mario

---

Big Mario terkena musuh

Result:

Small Mario

Invincibility Frame:
2 detik

---

## 10.2 Fire Flower

Big Mario + Fire Flower

Result:

Fire Mario

Kemampuan:

* Menembak fireball

---

## 10.3 Star

Mengambil star:

Status:

INVINCIBLE

Durasi:

10-15 detik

Efek:

* Kebal musuh
* Menabrak musuh = musuh mati

Tidak kebal terhadap:

* Jurang
* Lava
* Crush trap
* Timer habis

---

## 10.4 1UP

Memberi:

+1 Life

---

# 11. Secret Area Rules

## 11.1 Secret Area

Harus memberi:

* Coin
* Power-up
* Shortcut

---

## 11.2 Secret Exit

Opsional.

Dapat membuka level alternatif.

---

# 12. Checkpoint Rules

Level > 3000 pixel

Wajib memiliki checkpoint.

---

Checkpoint harus:

* Mudah terlihat
* Aman dicapai

---

# 13. Difficulty Scaling

## Easy

Fokus:

Belajar

Karakteristik:

* Banyak coin
* Banyak power-up
* Sedikit musuh

---

## Medium

Fokus:

Eksplorasi

Karakteristik:

* Kombinasi musuh
* Jurang sedang
* Platform bergerak

---

## Hard

Fokus:

Mastery

Karakteristik:

* Presisi
* Timing
* Banyak kombinasi bahaya

---

# 14. Camera Rules

Kamera harus:

* Mengikuti pemain
* Tidak bergerak terlalu cepat

---

Pemain harus dapat melihat:

* Platform berikutnya
* Musuh berikutnya
* Jurang berikutnya

Sebelum mencapainya.

---

# 15. Timer Rules

Default:

300 detik

Level panjang:

500 detik

---

Jika timer = 0

Player = DEAD

---

# 16. Anti-Frustration Rules

Dilarang membuat:

* Softlock
* Dead end
* Invisible death trap
* Blind jump
* Unavoidable damage

---

# 17. Procedural Generation Validation

Level dianggap valid jika:

START dapat mencapai GOAL.

Semua platform dapat dicapai.

Semua coin dapat diambil.

Semua power-up dapat diambil.

Tidak ada softlock.

Tidak ada jump melebihi kemampuan pemain.

Tidak ada musuh spawn di posisi tidak adil.

Tidak ada area wajib yang membutuhkan hidden block.

Tidak ada area wajib yang membutuhkan damage boost.

Tidak ada area wajib yang membutuhkan glitch.

---

# 18. Nintendo Design Philosophy

Saat membuat level, prioritaskan:

1. Fun
2. Readability
3. Fairness
4. Discovery
5. Mastery

Bukan:

1. Difficulty
2. Complexity
3. Surprise Death

Setiap tantangan harus:

TEACH → PRACTICE → TEST → MASTER

Urutan ini wajib diikuti dalam seluruh desain level.


# APPENDIX A - PATTERN LIBRARY

## PURPOSE

Pattern Library adalah kumpulan template desain level yang digunakan AI untuk membangun level yang terasa seperti Mario asli.

AI tidak boleh menempatkan objek secara acak.

AI harus memilih dan menggabungkan pattern dari library ini.

---

# PATTERN CATEGORY

Pattern dibagi menjadi:

* Tutorial Pattern
* Coin Pattern
* Enemy Pattern
* Gap Pattern
* Platform Pattern
* Pipe Pattern
* Secret Pattern
* Castle Pattern
* Water Pattern
* Sky Pattern
* Reward Pattern
* Transition Pattern

---

# TUTORIAL PATTERNS

## T001 - Intro Coin

Tujuan:
Mengajari pemain mengumpulkan coin.

Layout:

```text
      C

==================
```

Rules:

* Tidak ada musuh
* Tidak ada jurang

---

## T002 - Intro Jump

Tujuan:
Mengajari pemain melompat.

Layout:

```text
      ====

===========
```

Rules:

* Platform rendah
* Tidak ada hukuman jika gagal

---

## T003 - Intro Goomba

Tujuan:
Mengajari pemain menginjak musuh.

Layout:

```text
       G

==================
```

Rules:

* Hanya satu Goomba
* Area datar

---

## T004 - Intro Pipe

Layout:

```text
      ||

==================
```

Rules:

* Tidak ada Piranha Plant

---

# COIN PATTERNS

## C001 - Coin Arc Small

Layout:

```text
       C

     C   C

   C       C
```

Rules:

* Membentuk lintasan lompat

---

## C002 - Coin Arc Large

Layout:

```text
           C

       C       C

   C               C
```

Rules:

* Menunjukkan running jump

---

## C003 - Coin Trail

Layout:

```text
C C C C C C C C C
```

Rules:

* Menunjukkan arah level

---

## C004 - Coin Over Gap

Layout:

```text
      C

====      ====
```

Rules:

* Coin menjadi petunjuk jurang

---

## C005 - Reward Cluster

Layout:

```text
 C C C C C

 C C C C C
```

Rules:

* Diletakkan setelah tantangan

---

# GAP PATTERNS

## G001 - First Gap

Layout:

```text
=====   =====
```

Rules:

* 1-2 tile

---

## G002 - Medium Gap

Layout:

```text
=====      =====
```

Rules:

* 3-5 tile

---

## G003 - Running Gap

Layout:

```text
==========

             ==========
```

Rules:

* Membutuhkan running jump

---

## G004 - Coin Gap

Layout:

```text
      C

=====     =====
```

---

# ENEMY PATTERNS

## E001 - Single Goomba

Layout:

```text
      G

=================
```

---

## E002 - Double Goomba

Layout:

```text
      G     G

=================
```

---

## E003 - Triple Goomba

Layout:

```text
 G    G    G

=================
```

---

## E004 - Single Koopa

Layout:

```text
      K

=================
```

---

## E005 - Koopa + Goomba

Layout:

```text
      K      G

=================
```

---

## E006 - Elevated Enemy

Layout:

```text
       G

    ========
```

---

## E007 - Enemy After Jump

Layout:

```text
=====      =====

            G
```

Rules:

* Beri waktu reaksi

---

# PIPE PATTERNS

## P001 - Decorative Pipe

Layout:

```text
      ||

=================
```

---

## P002 - Warp Pipe

Layout:

```text
      ||
      ||
      ||
```

Properties:

destination:
bonus_room

---

## P003 - Piranha Pipe

Layout:

```text
      ||
      ||
      PP
```

Rules:

* Tidak boleh dekat jurang

---

## P004 - Pipe Sequence

Layout:

```text
 ||    ||    ||

================
```

---

# PLATFORM PATTERNS

## PL001 - Floating Platform

Layout:

```text
      =====

==================
```

---

## PL002 - Double Platform

Layout:

```text
     =====

              =====
```

---

## PL003 - Staircase

Layout:

```text
         ##

       ####

     ######
```

---

## PL004 - Descending Staircase

Layout:

```text
######

  ####

    ##
```

---

## PL005 - Platform Ladder

Layout:

```text
          =====

      =====

  =====
```

---

# MOVING PLATFORM PATTERNS

## MP001 - Horizontal

Layout:

```text
[====]
```

Movement:

horizontal

---

## MP002 - Vertical

Layout:

```text
[====]
  |
  |
  |
```

Movement:

vertical

---

## MP003 - Gap Crossing

Layout:

```text
=====

    [====]

               =====
```

---

# SECRET PATTERNS

## S001 - Hidden Block Reward

Layout:

```text
      ?

=================
```

Reward:

coin

---

## S002 - Hidden Vine

Layout:

```text
      ?

      V
      V
      V
```

Destination:

sky_area

---

## S003 - Secret Pipe

Layout:

```text
      ||

secret = true
```

---

## S004 - Hidden Coin Room

Reward:

20+ coins

---

## S005 - Hidden Star Room

Reward:

star

---

# SKY PATTERNS

## SKY001 - Cloud Platform

Layout:

```text
     =====

          =====

               =====
```

---

## SKY002 - Coin Heaven

Layout:

```text
CCCCCCCCCCCCCCCCCCC
```

Reward area.

---

# UNDERGROUND PATTERNS

## UG001 - Brick Tunnel

Layout:

```text
################

################
```

---

## UG002 - Coin Chamber

Layout:

```text
##############

CCCCCCCCCCCCCC
```

---

# CASTLE PATTERNS

## CA001 - Lava Gap

Layout:

```text
====      ====

~~~~~~~~~~~~~~
```

---

## CA002 - Fire Bar

Layout:

```text
     O

    /|\
```

---

## CA003 - Moving Platform Over Lava

Layout:

```text
=====

   [====]

             =====

~~~~~~~~~~~~~~
```

---

## CA004 - Hammer Bro Arena

Layout:

```text
     HB

===========
```

---

# REWARD PATTERNS

## R001 - Mushroom Reward

Layout:

```text
      ?

================
```

Reward:

mushroom

---

## R002 - Fire Flower Reward

Reward:

fire_flower

---

## R003 - Star Reward

Reward:

star

---

## R004 - 1UP Reward

Reward:

1up

---

# TRANSITION PATTERNS

## TR001 - Overworld To Underground

Pipe masuk.

---

## TR002 - Underground To Overworld

Pipe keluar.

---

## TR003 - Overworld To Castle

Castle gate.

---

# PATTERN CHAIN RULES

Jangan gunakan pattern yang sama lebih dari 3 kali berturut-turut.

SALAH:

E001
E001
E001
E001

BENAR:

E001
C001
G001
P001
E001

---

# LEVEL GENERATION FORMULA

Easy

70% Basic Pattern

20% Intermediate Pattern

10% Reward Pattern

---

Medium

40% Basic Pattern

40% Intermediate Pattern

20% Advanced Pattern

---

Hard

20% Basic Pattern

40% Intermediate Pattern

40% Advanced Pattern

---

# LEVEL PACING

Setiap 15-20 detik gameplay wajib terdapat:

* Reward
  atau
* Secret
  atau
* Visual Change
  atau
* Power-up

---

# WOW MOMENT RULE

Setiap level wajib memiliki minimal satu:

* Secret Area
* Coin Heaven
* Giant Pipe
* Hidden Vine
* Alternate Route
* Shortcut
* Bonus Room

Tujuan:

Memberikan momen yang diingat pemain setelah menyelesaikan level.

---

# AI GENERATION ALGORITHM

STEP 1

Generate Start Area

STEP 2

Generate Safe Tutorial Area

STEP 3

Generate Teach Pattern

STEP 4

Generate Practice Pattern

STEP 5

Generate Test Pattern

STEP 6

Generate Reward Pattern

STEP 7

Generate Secret Pattern

STEP 8

Generate Checkpoint

STEP 9

Generate Final Challenge

STEP 10

Generate Goal Area

STEP 11

Run Validator

STEP 12

Jika gagal:

Regenerate

STEP 13

Jika level tidak fun:

Regenerate

---

# FINAL GOLDEN RULE

Jika AI harus memilih antara:

LEVEL YANG LEBIH SULIT

atau

LEVEL YANG LEBIH MENYENANGKAN

Maka selalu pilih:

LEVEL YANG LEBIH MENYENANGKAN

Karena filosofi inti Mario adalah:

Easy To Learn
Hard To Master
Always Fun


# APPENDIX B - JSON SCHEMA & PROCEDURAL GENERATION RULES

Version: 1.0

Purpose:

Dokumen ini mendefinisikan format data level, struktur entity, aturan procedural generation, biome generation, validasi level, dan kontrak data yang wajib diikuti AI Generator.

---

# 1. LEVEL FILE STRUCTURE

Semua level harus menggunakan format JSON.

Contoh:

```json
{
  "id": "world_1_1",
  "name": "World 1-1",
  "theme": "overworld",
  "difficulty": "easy",
  "width": 500,
  "height": 15,
  "timeLimit": 300,

  "playerSpawn": {
    "x": 2,
    "y": 10
  },

  "goal": {
    "x": 490,
    "y": 10
  },

  "tiles": [],
  "entities": [],
  "secrets": [],
  "checkpoints": []
}
```

---

# 2. LEVEL METADATA

## Required Fields

```json
{
  "id": "",
  "name": "",
  "theme": "",
  "difficulty": "",
  "width": 0,
  "height": 0
}
```

---

## Theme Types

```json
[
  "overworld",
  "underground",
  "castle",
  "water",
  "sky",
  "fortress",
  "ghost_house",
  "ice",
  "desert",
  "forest"
]
```

---

## Difficulty Types

```json
[
  "easy",
  "medium",
  "hard"
]
```

---

# 3. TILE SCHEMA

## Tile Object

```json
{
  "type": "ground",
  "x": 10,
  "y": 12
}
```

---

## Supported Tiles

```json
[
  "ground",
  "brick",
  "question_block",
  "hidden_block",
  "pipe",
  "platform",
  "moving_platform",
  "lava",
  "water",
  "checkpoint",
  "goal",
  "coin"
]
```

---

# 4. ENTITY SCHEMA

## Base Entity

```json
{
  "id": "goomba_001",
  "type": "goomba",
  "x": 30,
  "y": 10
}
```

---

## Supported Entities

```json
[
  "goomba",
  "koopa_green",
  "koopa_red",
  "spiny",
  "piranha",
  "bullet_bill",
  "hammer_bro",
  "mushroom",
  "fire_flower",
  "star",
  "one_up"
]
```

---

# 5. PLAYER SPAWN RULES

Player spawn area harus:

* Aman
* Datar
* Tidak memiliki musuh

Minimal:

```json
{
  "safeZone": 10
}
```

Artinya:

10 tile pertama bebas bahaya.

---

# 6. GOAL RULES

Goal harus:

* Terlihat jelas
* Dapat dicapai

Contoh:

```json
{
  "type": "goal",
  "x": 490,
  "y": 10
}
```

---

# 7. COIN GENERATION RULES

Coin tidak boleh random.

Generator harus memilih pattern:

* Coin Arc
* Coin Trail
* Reward Cluster
* Secret Coin Room

---

## Coin Arc Example

```json
[
  {"x":100,"y":8},
  {"x":101,"y":7},
  {"x":102,"y":6},
  {"x":103,"y":7},
  {"x":104,"y":8}
]
```

---

# 8. GAP GENERATION RULES

## Easy

```json
{
  "minGap":1,
  "maxGap":3
}
```

---

## Medium

```json
{
  "minGap":3,
  "maxGap":5
}
```

---

## Hard

```json
{
  "minGap":5,
  "maxGap":8
}
```

---

## Validation

```json
{
  "maxJumpDistance":8
}
```

Gap tidak boleh melebihi batas ini.

---

# 9. PLATFORM GENERATION RULES

Platform harus memenuhi:

```json
{
  "reachable": true
}
```

---

## Height Validation

```json
{
  "maxJumpHeight":5
}
```

Jika lebih tinggi:

INVALID

---

# 10. ENEMY GENERATION RULES

Enemy tidak boleh ditempatkan secara acak.

Harus menggunakan pattern.

---

## Easy

```json
{
  "enemyDensity": 0.05
}
```

---

## Medium

```json
{
  "enemyDensity": 0.10
}
```

---

## Hard

```json
{
  "enemyDensity": 0.15
}
```

---

# 11. POWER-UP RULES

Power-up wajib muncul secara berkala.

---

Easy

```json
{
  "powerupInterval": 30
}
```

detik

---

Medium

```json
{
  "powerupInterval": 60
}
```

---

Hard

```json
{
  "powerupInterval": 90
}
```

---

# 12. SECRET GENERATION RULES

Setiap level minimal:

```json
{
  "secretCount": 1
}
```

---

Secret dapat berupa:

* Hidden Block
* Secret Pipe
* Coin Heaven
* Hidden Room
* Shortcut

---

# 13. CHECKPOINT RULES

Level panjang:

```json
{
  "checkpointRequired": true
}
```

Jika:

```json
{
  "width": ">300"
}
```

---

# 14. BIOME GENERATOR

## OVERWORLD

Komposisi:

```json
{
  "ground": 60,
  "platform": 20,
  "enemy": 10,
  "reward": 10
}
```

---

## UNDERGROUND

Komposisi:

```json
{
  "brick": 40,
  "coin": 30,
  "enemy": 20,
  "secret": 10
}
```

---

## CASTLE

Komposisi:

```json
{
  "lava": 20,
  "trap": 40,
  "enemy": 30,
  "reward": 10
}
```

---

## WATER

Komposisi:

```json
{
  "waterEnemy": 40,
  "coin": 30,
  "platform": 20,
  "reward": 10
}
```

---

# 15. LEVEL FLOW GENERATOR

Generator wajib mengikuti urutan:

```text
Start

↓

Teach

↓

Practice

↓

Challenge

↓

Reward

↓

Checkpoint

↓

Challenge

↓

Reward

↓

Final Challenge

↓

Goal
```

---

# 16. PATTERN SELECTION ALGORITHM

## Easy

```json
{
  "tutorial":40,
  "basic":40,
  "advanced":10,
  "reward":10
}
```

---

## Medium

```json
{
  "tutorial":20,
  "basic":40,
  "advanced":30,
  "reward":10
}
```

---

## Hard

```json
{
  "tutorial":10,
  "basic":30,
  "advanced":50,
  "reward":10
}
```

---

# 17. VALIDATOR ENGINE

Validator wajib dijalankan setelah level selesai dibuat.

---

Validator Checklist

```json
{
  "goalReachable": true,
  "allCoinsReachable": true,
  "allPowerupsReachable": true,
  "allPlatformsReachable": true,
  "noSoftlock": true,
  "noImpossibleJump": true,
  "noSpawnKill": true,
  "noMandatoryHiddenBlock": true,
  "noMandatoryDamageBoost": true
}
```

---

# 18. PATHFINDING VALIDATION

Generator wajib melakukan simulasi.

Minimal menggunakan:

* BFS
  atau
* A*

---

Harus terbukti:

```text
Player Spawn
↓
Goal
```

dapat dicapai.

---

# 19. LEVEL SCORE SYSTEM

Validator memberi skor.

```json
{
  "playable":40,
  "fun":20,
  "fair":15,
  "rewarding":15,
  "discovery":10
}
```

---

Total:

100

---

Level dianggap valid jika:

```json
{
  "score": 80
}
```

atau lebih.

---

# 20. REGENERATION RULES

Jika:

```json
{
  "score": "<80"
}
```

maka:

```json
{
  "action":"regenerate"
}
```

---

# 21. FUN DETECTOR

Generator harus menghindari:

* Jurang berulang
* Musuh berulang
* Platform berulang

Lebih dari:

3 kali berturut-turut.

---

# 22. NINTENDO PRINCIPLE

Setiap 20-30 detik gameplay harus terjadi salah satu:

* Reward
* Secret
* Discovery
* Power-Up
* Visual Change

Jika tidak:

Level dianggap membosankan.

---

# 23. FINAL GENERATION CONTRACT

AI wajib:

1. Membuat level yang dapat diselesaikan.
2. Membuat level yang menyenangkan.
3. Menggunakan Pattern Library.
4. Menambahkan reward secara berkala.
5. Menambahkan secret area.
6. Menjalankan validator.
7. Meregenerate jika validator gagal.
8. Mengutamakan kesenangan dibanding kesulitan.

Golden Rule:

FUN > DIFFICULTY
PLAYABLE > EVERYTHING

```
```
# APPENDIX C - ENTITY ENCYCLOPEDIA

Version: 1.0

Purpose:

Dokumen ini mendefinisikan seluruh entity yang dapat muncul dalam game, perilaku AI, state machine, collision rules, damage rules, interaction matrix, dan gameplay contract.

Seluruh entity wajib mengikuti aturan berikut.

---

# 1. ENTITY CATEGORIES

Entity dibagi menjadi:

* Player
* Enemy
* Boss
* PowerUp
* Collectible
* Projectile
* Environment
* Hazard
* Interactive Object
* Secret Object

---

# 2. PLAYER ENTITY

Entity:

Mario

---

## State Machine

```text
SmallMario
    ↓
BigMario
    ↓
FireMario

StarMario
(overrides all states temporarily)
```

---

## Small Mario

Properties

```yaml
health: 1
canBreakBrick: false
canShootFireball: false
```

Hit by enemy:

```yaml
result: dead
```

---

## Big Mario

Properties

```yaml
health: 2
canBreakBrick: true
canShootFireball: false
```

Hit by enemy:

```yaml
result: become_small
```

---

## Fire Mario

Properties

```yaml
health: 2
canBreakBrick: true
canShootFireball: true
```

Hit by enemy:

```yaml
result: become_small
```

---

## Star Mario

Properties

```yaml
invincible: true
duration: 12
```

Touch enemy:

```yaml
enemy: dead
```

---

# 3. COLLECTIBLES

---

## Coin

Value

```yaml
coins: 1
```

100 coin:

```yaml
reward: 1up
```

---

## Red Coin

Optional challenge collectible.

---

## Dragon Coin (SMW Style)

Reward after collecting all:

```yaml
bonus_score: true
```

---

# 4. POWERUPS

---

## Mushroom

Spawn:

```yaml
source:
  - question_block
  - hidden_block
```

Behavior:

```yaml
move: horizontal
bounce: true
```

Collect:

```yaml
SmallMario -> BigMario
```

---

## Fire Flower

Collect:

```yaml
BigMario -> FireMario
```

If SmallMario:

```yaml
replace_with: Mushroom
```

---

## Star

Behavior:

```yaml
bounce: true
move: horizontal
```

Collect:

```yaml
state: StarMario
```

Duration:

```yaml
12 seconds
```

---

## 1UP Mushroom

Collect:

```yaml
life += 1
```

---

# 5. BASIC ENEMIES

---

## Goomba

Behavior:

```yaml
walk: true
turnOnWall: true
fallOffCliff: true
```

Killed by:

```yaml
stomp
fireball
shell
star
```

---

## Green Koopa

Behavior:

```yaml
walk: true
fallOffCliff: true
```

First stomp:

```yaml
become_shell
```

---

## Red Koopa

Behavior:

```yaml
walk: true
fallOffCliff: false
```

Detect cliff:

```yaml
true
```

---

## Buzzy Beetle

Immune to:

```yaml
fireball
```

Killed by:

```yaml
shell
star
```

---

## Spiny

Cannot be stomped.

Killed by:

```yaml
fireball
shell
star
```

---

# 6. PIPE ENEMIES

---

## Piranha Plant

Behavior:

```yaml
emerge_from_pipe
```

If player near pipe:

```yaml
stay_hidden
```

---

## Fire Piranha

Can shoot:

```yaml
fireball
```

---

# 7. AIR ENEMIES

---

## Paratroopa

Behavior:

```yaml
jump
fly
```

First stomp:

```yaml
become_koopa
```

---

## Lakitu

Behavior:

```yaml
follow_player
```

Attack:

```yaml
throw_spiny
```

---

# 8. PROJECTILE ENEMIES

---

## Bullet Bill

Behavior:

```yaml
straight_flight
```

Direction:

```yaml
left
```

Killed by:

```yaml
stomp
star
```

---

## Banzai Bill

Large Bullet Bill.

Properties:

```yaml
size: giant
```

---

# 9. ADVANCED ENEMIES

---

## Hammer Bro

Attack:

```yaml
throw_hammer
```

Movement:

```yaml
jump_platform
```

Difficulty:

```yaml
high
```

---

## Boomerang Bro

Attack:

```yaml
boomerang
```

---

## Fire Bro

Attack:

```yaml
fireball
```

---

# 10. WATER ENEMIES

---

## Cheep Cheep

Behavior:

```yaml
swim
```

---

## Flying Cheep Cheep

Behavior:

```yaml
jump_out_of_water
```

---

## Blooper

Behavior:

```yaml
follow_player
```

Water only.

---

# 11. CASTLE ENEMIES

---

## Dry Bones

Behavior:

```yaml
reassemble
```

Cannot die permanently.

---

## Thwomp

Behavior:

```yaml
drop_when_player_below
```

Damage:

```yaml
instant
```

---

## Podoboo

Behavior:

```yaml
jump_from_lava
```

---

# 12. BOSSES

---

## Bowser

Health:

```yaml
8
```

Attack:

```yaml
fire
jump
charge
```

Defeat:

```yaml
bridge_switch
```

atau

```yaml
fireball_count
```

---

## Boom Boom

Health:

```yaml
3
```

Defeat:

```yaml
stomp
```

---

# 13. PROJECTILES

---

## Fireball

Owner:

Mario

Behavior:

```yaml
bounce
```

Maximum:

```yaml
2 active
```

---

## Hammer

Owner:

Hammer Bro

Behavior:

```yaml
arc
```

---

## Boomerang

Owner:

Boomerang Bro

Behavior:

```yaml
return
```

---

# 14. HAZARDS

---

## Pit

Collision:

```yaml
instant_death
```

---

## Lava

Collision:

```yaml
instant_death
```

---

## Crushing Block

Collision:

```yaml
instant_death
```

---

## Spike

Collision:

```yaml
damage
```

---

# 15. INTERACTIVE OBJECTS

---

## Question Block

Contains:

```yaml
coin
mushroom
flower
star
1up
```

---

## Brick Block

Breakable:

```yaml
BigMario
FireMario
```

---

## Hidden Block

Optional reward only.

---

## Spring

Behavior:

```yaml
increase_jump_height
```

---

## Vine

Behavior:

```yaml
climb
```

Destination:

```yaml
sky_area
```

---

# 16. MOVING OBJECTS

---

## Horizontal Platform

Movement:

```yaml
left_right
```

---

## Vertical Platform

Movement:

```yaml
up_down
```

---

## Falling Platform

Behavior:

```yaml
fall_after_contact
```

---

# 17. COLLISION MATRIX

Legend

```yaml
K = Kill
D = Damage
N = No Effect
```

---

Mario vs Goomba

```yaml
top_collision: K
side_collision: D
```

---

Mario vs Spiny

```yaml
top_collision: D
side_collision: D
```

---

Mario vs Coin

```yaml
result: collect
```

---

Mario vs Mushroom

```yaml
result: powerup
```

---

Mario vs Star

```yaml
result: invincible
```

---

# 18. AI BEHAVIOR TREE RULES

Enemy AI harus sederhana.

Priority:

```text
Move
↓
Detect Obstacle
↓
Turn
↓
Continue
```

---

Tidak boleh menggunakan AI kompleks modern.

Tujuan:

Meniru Mario Classic.

---

# 19. ENTITY SPAWN RULES

Enemy pertama:

Minimal 5 tile dari spawn.

---

PowerUp pertama:

Maksimal 30 detik gameplay.

---

Secret pertama:

Maksimal 60 detik gameplay.

---

# 20. ENTITY DENSITY RULES

Easy

```yaml
enemy_density: low
```

---

Medium

```yaml
enemy_density: medium
```

---

Hard

```yaml
enemy_density: high
```

---

# 21. VALIDATION RULES

Validator wajib memeriksa:

```yaml
all_entities_reachable: true
all_collectibles_reachable: true
all_powerups_reachable: true
all_enemies_valid: true
no_spawn_overlap: true
```

---

# 22. NINTENDO ENTITY DESIGN RULE

Setiap enemy harus:

1. Mudah dikenali
2. Mudah dipahami
3. Memiliki perilaku konsisten
4. Dapat dipelajari pemain
5. Dapat dikombinasikan dengan enemy lain

---

# 23. GOLDEN RULE

Jika entity menyebabkan:

* Kematian tidak adil
* Damage tidak dapat dihindari
* Kebingungan pemain

Maka entity placement dianggap INVALID.

Fun > Complexity

Readability > Realism

Gameplay > Simulation

---

# 24. POWERUP RELEVANCE RULE

Setiap powerup harus ditempatkan di lokasi di mana kemampuannya **masih akan terpakai**, bukan hanya bisa diambil.

Reachable saja TIDAK cukup. Validator harus memastikan powerup itu **berguna secara kontekstual**.

---

## 24.1 Offensive Powerup Placement

Powerup ofensif:

* Fire Flower (menembak)
* Star (invincible / menabrak musuh)

Tidak boleh ditempatkan di:

* Segmen terakhir level yang sudah tidak memiliki musuh / tantangan setelahnya
* Tepat sebelum Goal tanpa ada musuh di antaranya

Alasan:

Kemampuan yang diberikan menjadi sia-sia karena tidak ada kesempatan menggunakannya.

---

## 24.2 Minimum Utility Window

Setiap powerup ofensif harus memiliki minimal **1 kesempatan pakai** sebelum Goal.

Contoh kesempatan pakai:

* Minimal 1 musuh di depan setelah powerup diambil
* Segmen platforming berbahaya (untuk Star)

Jika tidak ada kesempatan pakai:

Ganti dengan reward pasif:

* Coin
* 1UP

---

## 24.3 Validation

```yaml
powerup_relevance_check:
  offensive_powerup_has_usage_window: true
  no_offensive_powerup_in_final_dead_zone: true
```

Jika `offensive_powerup_has_usage_window: false`:

Maka powerup placement dianggap INVALID.

---

Useful > Reachable

# APPENDIX D - BIOME LIBRARY

Version: 1.0

Purpose:

Dokumen ini mendefinisikan seluruh biome (dunia/tema level) beserta aturan visual, gameplay rules, pattern yang diizinkan, musuh yang muncul, serta pacing desain level.

Biome menentukan “rasa” level, bukan hanya tampilan.

---

# 1. BIOME SYSTEM OVERVIEW

Setiap level wajib memiliki satu biome utama:

```json id="b1o2k9"
{
  "biome": "overworld"
}
```

Biome mempengaruhi:

* Tileset
* Enemy pool
* Gravity modifier (opsional)
* Music mood
* Pattern selection
* Difficulty scaling
* Visual readability rules

---

# 2. OVERWORLD BIOME

## 2.1 Deskripsi

Biome paling dasar.

Tujuan:

Mengajarkan core gameplay Mario.

---

## 2.2 Visual Style

* Rumput hijau
* Langit biru
* Platform sederhana
* Awan dekoratif

---

## 2.3 Allowed Tiles

* Ground
* Brick
* Question Block
* Pipe
* Platform

---

## 2.4 Enemy Pool

* Goomba
* Green Koopa
* Red Koopa

---

## 2.5 Pattern Priority

```yaml id="o8x1n2"
tutorial: 40%
basic: 40%
advanced: 10%
reward: 10%
```

---

## 2.6 Rules

* Tidak boleh terlalu padat musuh
* Harus banyak ruang aman
* Coin sebagai panduan arah

---

# 3. UNDERGROUND BIOME

## 3.1 Deskripsi

Area bawah tanah.

Fokus:

* Platform sempit
* Navigasi ruang kecil

---

## 3.2 Visual Style

* Background gelap
* Brick dominan
* Lighting terbatas

---

## 3.3 Allowed Tiles

* Brick
* Ground
* Lava (opsional)
* Hidden Block

---

## 3.4 Enemy Pool

* Goomba
* Koopa
* Buzzy Beetle
* Spiny

---

## 3.5 Pattern Priority

```yaml id="u2k9m1"
basic: 30%
coin: 30%
advanced: 30%
reward: 10%
```

---

## 3.6 Rules

* Lebih banyak horizontal tunnel
* Secret room lebih sering
* Visibility terbatas (no blind trap)

---

# 4. CASTLE BIOME

## 4.1 Deskripsi

Level akhir / tantangan tinggi.

---

## 4.2 Visual Style

* Batu gelap
* Lava dominan
* Platform sempit
* Trap intensif

---

## 4.3 Allowed Tiles

* Castle Block
* Lava
* Moving Platform
* Fire Bar
* Spike

---

## 4.4 Enemy Pool

* Dry Bones
* Hammer Bro
* Podoboo
* Thwomp

---

## 4.5 Pattern Priority

```yaml id="c7l9q2"
advanced: 50%
trap: 30%
reward: 10%
basic: 10%
```

---

## 4.6 Rules

* Timing-based gameplay
* Banyak hazard
* Reward tetap harus ada

---

# 5. WATER BIOME

## 5.1 Deskripsi

Level berbasis air.

---

## 5.2 Visual Style

* Biru dominan
* Floating movement
* Reduced gravity feel

---

## 5.3 Physics Modifier

```json id="w1a9x3"
{
  "gravity": 0.6,
  "movementSpeed": 0.8
}
```

---

## 5.4 Enemy Pool

* Cheep Cheep
* Blooper
* Flying Cheep Cheep

---

## 5.5 Pattern Priority

```yaml id="w9k2n0"
swim_flow: 40%
coin_flow: 30%
enemy: 20%
reward: 10%
```

---

## 5.6 Rules

* Tidak boleh terlalu padat musuh
* Movement harus fluid
* Hindari precision jump berlebihan

---

# 6. SKY BIOME

## 6.1 Deskripsi

Level di udara / awan.

---

## 6.2 Visual Style

* Awan putih
* Platform kecil
* Background terbuka

---

## 6.3 Allowed Tiles

* Cloud Platform
* Moving Platform
* Vine

---

## 6.4 Enemy Pool

* Paratroopa
* Lakitu

---

## 6.5 Pattern Priority

```yaml id="s8m1q4"
platform: 50%
coin: 20%
enemy: 10%
reward: 20%
```

---

## 6.6 Rules

* Banyak gap
* Risiko jatuh tinggi
* Tapi selalu fair (visible jump)

---

# 7. GHOST HOUSE BIOME

## 7.1 Deskripsi

Level puzzle.

---

## 7.2 Visual Style

* Gelap
* Flickering lights
* Maze structure

---

## 7.3 Allowed Tiles

* Fake Door
* Hidden Block
* Moving Wall

---

## 7.4 Enemy Pool

* Boo
* Dry Bones

---

## 7.5 Pattern Priority

```yaml id="g4q7m2"
puzzle: 50%
secret: 30%
enemy: 10%
reward: 10%
```

---

## 7.6 Rules

* Banyak puzzle
* Tidak boleh softlock
* Clue harus selalu ada

---

# 8. DESERT BIOME

## 8.1 Deskripsi

Level pasir dan panas.

---

## 8.2 Visual Style

* Sand ground
* Pyramid structures
* Heat distortion

---

## 8.3 Enemy Pool

* Pokey
* Fire Bro
* Bullet Bill (rare)

---

## 8.4 Pattern Priority

```yaml id="d6n2p8"
platform: 30%
hazard: 30%
enemy: 20%
coin: 20%
```

---

## 8.5 Rules

* Long horizontal sections
* Quick reaction hazards
* Minimal blind traps

---

# 9. SNOW BIOME

## 9.1 Deskripsi

Level licin dan dingin.

---

## 9.2 Physics Modifier

```json id="s2k9q1"
{
  "friction": 0.7
}
```

---

## 9.3 Enemy Pool

* Ice Goomba
* Sliding Koopa

---

## 9.4 Pattern Priority

```yaml id="sn8m0q"
sliding: 40%
platform: 30%
enemy: 20%
reward: 10%
```

---

## 9.5 Rules

* Momentum penting
* Jump timing lebih sulit
* Tapi tetap readable

---

# 10. FOREST BIOME

## 10.1 Deskripsi

Level natural dengan verticality.

---

## 10.2 Visual Style

* Trees
* Vine
* Layered platforms

---

## 10.3 Enemy Pool

* Paratroopa
* Koopa
* Spiny (rare)

---

## 10.4 Pattern Priority

```yaml id="f9k2m7"
vertical: 40%
exploration: 30%
enemy: 20%
reward: 10%
```

---

## 11. BIOME TRANSITION RULES

Biome tidak boleh berubah tiba-tiba.

Harus menggunakan:

* Pipe transition
* Door transition
* Visual fade change

---

## 12. BIOME DIFFICULTY SCALING

World progression:

```text id="wpr1d0"
World 1 → Overworld (Easy)
World 2 → Underground
World 3 → Water
World 4 → Sky
World 5 → Desert
World 6 → Forest
World 7 → Castle Heavy
World 8 → Final Castle
```

---

## 13. BIOME VALIDATION RULES

Setiap biome harus:

* Konsisten secara visual
* Tidak mencampur tile random
* Memiliki enemy pool yang sesuai
* Memiliki pattern yang sesuai
* Tetap playable

---

## 14. FINAL BIOME GOLDEN RULE

Biome tidak hanya visual.

Biome adalah:

* Gameplay identity
* Player experience
* Challenge style

Jika biome tidak mempengaruhi gameplay → biome dianggap gagal.

---

FUN > VISUAL
CLARITY > COMPLEXITY
GAMEPLAY > AESTHETIC

# APPENDIX E - BOSS SYSTEM

Version: 1.0

Purpose:

Dokumen ini mendefinisikan sistem boss fight, khususnya Bowser-style encounter, termasuk phase system, arena design, attack patterns, damage rules, dan victory conditions.

Boss fight harus terasa seperti klimaks level, bukan sekadar musuh besar.

---

# 1. BOSS SYSTEM OVERVIEW

Boss memiliki sistem:

* Phase-based behavior
* Arena constraint
* Patterned attack cycles
* Conditional vulnerability
* Scripted escalation

---

# 2. GENERIC BOSS STRUCTURE

```json id="bss1q0"
{
  "id": "bowser",
  "phases": 3,
  "health": 8,
  "arena": "castle_final",
  "invulnerableStates": [],
  "attackPattern": []
}
```

---

# 3. BOSS STATE MACHINE

## Standard Flow

```text id="stb9x2"
Phase 1 → Phase 2 → Phase 3 → Defeated
```

---

## Phase Rules

* Phase change terjadi saat HP threshold tercapai
* Setiap phase mengubah attack pattern
* Arena dapat berubah secara minor

---

# 4. BOSS ARENA RULES

## 4.1 Layout Requirements

Arena harus:

* Memiliki ruang pergerakan cukup
* Tidak boleh terlalu sempit
* Memiliki hazard terkontrol
* Memiliki escape space untuk player

---

## 4.2 Arena Example

```text id="arn8k4"
========================
        BOSS

   []      []      []

~~~~~~~~ LAVA ~~~~~~~~
```

---

## 4.3 Arena Constraints

Tidak boleh:

* Instant death tanpa warning
* Tidak ada ruang untuk dodge
* Kamera tidak bisa melihat boss

---

# 5. BOSS PHASE SYSTEM

## Phase 1 - Introduction

Tujuan:

Mengajarkan pola boss

Behavior:

* Slow attack
* Predictable movement

---

## Phase 2 - Pressure

Tujuan:

Meningkatkan kesulitan

Behavior:

* Faster attack
* Added projectiles
* Reduced safe zones

---

## Phase 3 - Final Pressure

Tujuan:

Climax fight

Behavior:

* Full attack set
* Arena hazard aktif
* High movement pressure

---

# 6. BOWSER SPECIFICATION

## 6.1 Base Stats

```json id="bws3k9"
{
  "health": 8,
  "size": "large",
  "damageOnTouch": true
}
```

---

## 6.2 Attack Set

### Fire Breath

```yaml id="fbx2m1"
type: projectile
pattern: horizontal sweep
damage: high
```

---

### Jump Smash

```yaml id="jmp8q4"
type: movement
effect: ground shock
```

---

### Charge Attack

```yaml id="chg7p0"
type: movement
behavior: forward rush
```

---

### Hammer Throw (optional variant)

```yaml id="hmr9z2"
type: projectile
arc: true
```

---

# 7. WEAKNESS SYSTEM

Boss hanya bisa diserang saat:

```text id="wk1lq8"
condition: vulnerable_state == true
```

---

## 7.1 Vulnerability Trigger

Contoh Bowser:

* Saat jatuh
* Saat stun
* Saat phase transition

---

## 7.2 Invulnerability Rule

Saat attack aktif:

```yaml id="inv4p3"
damage_taken: false
```

---

# 8. DAMAGE SYSTEM

## Player Damage

```text id="dm1qz7"
Touch boss → damage player
Projectile hit → damage player
```

---

## Boss Damage

Boss hanya menerima damage dari:

* Fireball (tertentu)
* Environmental trap
* Scripted mechanic
* Phase trigger interaction

---

# 9. BOSS INTERACTION MECHANICS

## 9.1 Platform Drop Mechanic

Contoh Mario-style Bowser:

```text id="plt5x2"
Bowser stands on bridge
Player triggers switch
Bridge collapses
Boss falls into lava
```

---

## 9.2 Trap Mechanic

```text id="trp9k1"
Player lures boss
Boss hits trigger
Ceiling crushes boss
```

---

## 9.3 Projectile Bounce Mechanic

Fireball interaction:

* Bisa memantul
* Bisa diarahkan
* Bisa memicu phase change

---

# 10. CAMERA RULES (BOSS FIGHT)

Camera harus:

* Selalu memperlihatkan boss
* Tidak terlalu zoomed in
* Memberi ruang prediksi attack

---

Tidak boleh:

* Off-screen attack
* Sudden spawn projectile dari luar layar

---

# 11. DIFFICULTY SCALING

## Easy Boss

* 2 phase
* Slow attack
* Banyak safe zone

---

## Medium Boss

* 3 phase
* Mixed attack
* Limited safe zone

---

## Hard Boss

* 3–4 phase
* Fast attack
* Moving hazards
* Reduced reaction time

---

# 12. ADDITIONAL BOSSES

## Boom Boom

Health:

```yaml id="bbm2q8"
3 hits per phase
```

Behavior:

* Shell spin
* Jump attack

---

## Koopa King (variant)

Behavior:

* Heavy stomp
* Shield phase

---

## Ghost Boss (optional)

Behavior:

* Teleport
* Fake attacks

---

# 13. BOSS ESCALATION RULES

Setiap phase harus:

* Lebih cepat
* Lebih kompleks
* Lebih sempit safe zone

TAPI:

Tidak boleh:

* Tidak bisa dihindari
* Random unfair damage
* Spawn kill

---

# 14. VICTORY CONDITIONS

Boss dianggap kalah jika:

```text id="vc1m9k"
health <= 0
OR
scripted defeat triggered
```

---

## Victory Sequence

```text id="vic7q3"
Boss defeated
↓
Animation
↓
Reward spawn
↓
Exit opens
```

---

# 15. REWARD SYSTEM

Setelah boss:

Wajib memberikan:

* Star coin / special coin
* Power-up full restore
* Exit unlock

---

# 16. BOSS LEVEL STRUCTURE

```text id="lvl9x1"
Approach Phase
↓
Mini Challenge
↓
Boss Arena Entry
↓
Boss Phase 1
↓
Boss Phase 2
↓
Boss Phase 3
↓
Victory Sequence
↓
Exit
```

---

# 17. ANTI FRUSTRATION RULES

Dilarang:

* Boss off-screen attack
* Instant unavoidable kill
* Random unfair RNG damage
* Softlock setelah boss spawn

---

# 18. FINAL BOSS DESIGN RULE

Boss harus:

1. Bisa dipelajari
2. Bisa diprediksi
3. Bisa dikalahkan dengan skill
4. Tidak bergantung pada keberuntungan
5. Selalu memberikan rasa “fair challenge”

---

# 19. NINTENDO PRINCIPLE (BOSS)

Boss fight adalah:

* Puzzle + Timing + Execution
  bukan
* RNG + Damage Spam

---

# 20. GOLDEN RULE

Jika boss terasa:

* Tidak adil
* Tidak terbaca
* Tidak bisa dipelajari

Maka:

REJECT DESIGN

Fun > Difficulty
Fairness > Complexity
Player Skill > Randomness

# APPENDIX F - LEVEL VALIDATOR ENGINE

Version: 1.0

Purpose:

Dokumen ini mendefinisikan sistem validasi otomatis untuk memastikan semua level yang dihasilkan:

* Bisa diselesaikan
* Adil
* Tidak memiliki softlock
* Sesuai aturan Mario Classic
* Menyenangkan untuk dimainkan

Validator ini adalah “AI Quality Control System”.

---

# 1. VALIDATION PIPELINE OVERVIEW

Setiap level wajib melewati pipeline berikut:

```text id="vp1a9k"
1. Parse Level Data
2. Build Tile Graph
3. Run Pathfinding (BFS / A*)
4. Simulate Player Physics
5. Validate Entities
6. Check Softlock
7. Score Fun Index
8. Score Difficulty Index
9. Final Approval
```

---

# 2. LEVEL REPRESENTATION MODEL

Level direpresentasikan sebagai graph:

* Node = tile position
* Edge = movement kemungkinan player

---

## Node Definition

```json id="nd9x2k"
{
  "x": 10,
  "y": 5,
  "type": "ground"
}
```

---

## Edge Definition

```json id="ed4q1m"
{
  "from": [10, 5],
  "to": [11, 5],
  "cost": 1
}
```

---

# 3. PATHFINDING ENGINE

## 3.1 Algorithm

Validator wajib menggunakan:

* BFS (Breadth First Search)
  atau
* A* (preferred)

---

## 3.2 Goal Check

```text id="gc1m9q"
Start Node → Goal Node
```

Jika tidak ada path:

LEVEL INVALID

---

## 3.3 Jump Simulation

Jump rules:

```yaml id="jp7k2a"
maxJumpHeight: 5
maxJumpDistance: 8
```

Jika gap > limit:

Node tidak terkoneksi

---

# 4. PHYSICS SIMULATION ENGINE

## 4.1 Gravity Simulation

Validator mensimulasikan:

* Falling
* Landing
* Platform movement

---

## 4.2 Collision Rules

```text id="cl8p2x"
Player + Enemy → Damage
Player + Coin → Collect
Player + PowerUp → Transform
Player + Pit → Death
```

---

## 4.3 Moving Platform Simulation

Platform harus:

* Reachable during cycle
* Tidak menyebabkan softlock

---

# 5. SOFTLOCK DETECTION

Softlock adalah kondisi:

```text id="sl0k9p"
Player cannot reach goal OR cannot return OR cannot progress
```

---

## Detection Rules

Validator memeriksa:

* Dead end path
* One-way trap
* Required item missing
* Blocked checkpoint

---

## Softlock Example

```text id="ex9q1m"
Player falls into pit
No way to return
No exit path
```

→ INVALID

---

# 6. ENTITY VALIDATION

## 6.1 Reachability Check

Semua entity harus:

```yaml id="rv3m1k"
reachable: true
```

---

## 6.2 Invalid Entity Rules

Dilarang:

* Coin di udara tanpa platform
* Power-up tanpa akses
* Enemy spawn di inside block
* Hidden block mandatory untuk progress

---

## 6.3 Spawn Safety Check

```text id="sp8q2v"
Enemy spawn distance from player >= 5 tiles
```

---

# 7. DIFFICULTY ANALYZER

## 7.1 Metrics

Validator menghitung:

```json id="df7k1m"
{
  "jumpDifficulty": 0-100,
  "enemyDensity": 0-100,
  "hazardFrequency": 0-100,
  "reactionTimeRequired": 0-100
}
```

---

## 7.2 Difficulty Classification

```text id="dc1q8k"
0-30   = Easy
31-60  = Medium
61-80  = Hard
81-100 = Extreme (reject unless boss level)
```

---

# 8. FUN SCORE ENGINE

## 8.1 Fun Metrics

```json id="fn9k2x"
{
  "rewardFrequency": 0-100,
  "exploration": 0-100,
  "variety": 0-100,
  "fairness": 0-100
}
```

---

## 8.2 Fun Score Formula

```text id="fs3k9q"
Fun Score =
(Reward + Exploration + Variety + Fairness) / 4
```

---

## Threshold

```text id="th9q1m"
Fun Score >= 70 → PASS
Fun Score < 70 → REGENERATE
```

---

# 9. LEVEL SCORING SYSTEM

Final score:

```text id="ls8k2q"
Final Score =
(Playable * 0.4) +
(Fun * 0.3) +
(Fairness * 0.2) +
(Difficulty Balance * 0.1)
```

---

## Pass Condition

```text id="pc1m8q"
Final Score >= 80
```

---

# 10. AUTOMATIC REGENERATION ENGINE

Jika level gagal:

```text id="re7k9m"
1. Identify failure reason
2. Modify pattern selection
3. Adjust enemy placement
4. Adjust gaps/platforms
5. Re-run validation
```

---

## Retry Limit

```yaml id="rl3k8q"
maxRetries: 5
```

Jika gagal 5x:

→ fallback to safe procedural template

---

# 11. LEVEL CORRECTION RULES

Validator boleh memperbaiki otomatis:

* Gap terlalu jauh → tambah platform
* Coin unreachable → tambah block
* Enemy unfair → geser posisi
* Softlock → tambah return path

---

# 12. SIMULATION MODE

Validator wajib menjalankan “ghost player simulation”:

```text id="sm1k9q"
Start at spawn
Follow optimal path
Check:
- survival
- reach goal
```

---

# 13. PERFORMANCE RULES

Validator harus:

* O(n log n) max complexity
* Tidak boleh brute-force full world tanpa pruning

---

# 14. EDGE CASE HANDLING

## Case 1: Floating Coin

→ invalid unless reachable

---

## Case 2: Hidden Block Required

→ ALWAYS invalid

---

## Case 3: Infinite Loop Path

→ reject level

---

## Case 4: Moving Platform Desync

→ simulate cycle timing

---

# 15. VALIDATION OUTPUT FORMAT

```json id="vo9k1m"
{
  "valid": true,
  "score": 87,
  "funScore": 82,
  "difficulty": 55,
  "issues": [],
  "pathExists": true
}
```

---

# 16. DEBUGGING MODE

Jika invalid:

```json id="db1k9q"
{
  "error": "softlock_detected",
  "location": [x, y],
  "reason": "no_return_path"
}
```

---

# 17. GENERATION LOOP

```text id="gl8k2m"
Generate Level
↓
Validate
↓
If FAIL → Fix OR Regenerate
↓
If PASS → Publish
```

---

# 18. NINTENDO QUALITY RULE

Validator harus meniru filosofi Nintendo:

* Level harus bisa diselesaikan oleh player baru
* Tapi tetap menantang untuk master
* Tidak ada momen “ini tidak mungkin tanpa tahu trik”

---

# 19. FINAL GOLDEN RULE

Jika validator ragu antara:

* "ini sulit tapi mungkin"
* "ini mungkin tapi tidak menyenangkan"

Maka pilih:

"MUST BE FUN AND FAIR"

Fun > Precision
Fairness > Complexity
Playability > Everything

# APPENDIX G - LEVEL GENERATION PROMPT SYSTEM

Version: 1.0

Purpose:

Dokumen ini adalah “master prompt system” untuk AI level generator.

Fungsinya:

* Menghasilkan level Mario lengkap secara otomatis
* Menggabungkan semua appendix sebelumnya (A–F)
* Menghasilkan output siap pakai (JSON + pattern map)
* Menjamin konsistensi, fun, dan solvability

---

# 1. SYSTEM OVERVIEW

AI Level Generator bekerja sebagai pipeline:

```text id="sys1k9"
User Request
↓
Prompt Compiler
↓
Pattern Selector
↓
Level Builder
↓
Validator Engine (Appendix F)
↓
Fix Loop (if needed)
↓
Final Output
```

---

# 2. MASTER SYSTEM PROMPT (CORE INSTRUCTION)

Gunakan ini sebagai SYSTEM PROMPT utama AI:

---

```text id="sp9k2m"
You are a Mario-style Level Generator AI.

Your job is to create playable, fun, fair 2D platformer levels inspired by classic Mario design.

You MUST follow all rules from:

- Appendix A: Pattern Library
- Appendix B: JSON Schema
- Appendix C: Entity Encyclopedia
- Appendix D: Biome Library
- Appendix E: Boss System
- Appendix F: Validator Engine

---

CRITICAL RULES:

1. Level must ALWAYS be solvable.
2. Level must NEVER contain softlocks.
3. Level must be fun before it is difficult.
4. All coins, enemies, and powerups must be reachable.
5. Player must always have at least one valid forward path.
6. Use pattern-based design ONLY (no random placement).
7. Every level must follow Teach → Practice → Test structure.
8. Every level must include at least one reward moment.
9. Every level must include at least one discovery moment.
10. Validation must pass before output.

---

OUTPUT FORMAT:

Return ONLY valid JSON:

{
  "level": {},
  "preview": "",
  "validation": {},
  "score": {}
}

---

NO EXPLANATION.
NO EXTRA TEXT.
ONLY JSON OUTPUT.
```

---

# 3. LEVEL REQUEST TEMPLATE

User input format:

```json id="req1k9"
{
  "world": 1,
  "level": 1,
  "biome": "overworld",
  "difficulty": "easy",
  "length": 300,
  "hasSecret": true,
  "hasBoss": false,
  "themeFocus": "jump tutorial"
}
```

---

# 4. GENERATION STRATEGY

## Step 1 - Interpret Request

AI must extract:

* biome
* difficulty
* level length
* special rules

---

## Step 2 - Select Pattern Set

Based on difficulty:

```yaml id="ps1k8m"
easy:
  tutorial: 40%
  basic: 40%
  reward: 20%

medium:
  basic: 40%
  advanced: 40%
  reward: 20%

hard:
  advanced: 60%
  trap: 30%
  reward: 10%
```

---

## Step 3 - Build Level Spine

Always build:

```text id="spn9k2"
Start → Teach → Practice → Test → Reward → Goal
```

---

## Step 4 - Fill With Patterns

Use only Appendix A patterns.

NO RANDOM PLACEMENT.

---

## Step 5 - Insert Entities

From Appendix C:

* enemies based on biome
* powerups based on pacing
* hazards based on difficulty

---

## Step 6 - Validate Level

Run Appendix F engine:

* BFS path check
* softlock detection
* fun score
* difficulty score

---

## Step 7 - Fix Loop

If invalid:

```text id="fix9k1"
modify → revalidate → repeat
```

Max iterations: 5

---

# 5. OUTPUT SPECIFICATION

Final output MUST be:

```json id="out9k1"
{
  "level": {
    "id": "world-1-1",
    "biome": "overworld",
    "tiles": [],
    "entities": [],
    "goal": {},
    "spawn": {}
  },
  "preview": "ASCII or simplified map",
  "validation": {
    "valid": true,
    "score": 87,
    "funScore": 82
  },
  "score": {
    "difficulty": 35,
    "fun": 88
  }
}
```

---

# 6. PREVIEW FORMAT RULES

Preview harus berupa:

* ASCII map sederhana
* atau tile visualization

Contoh:

```text id="pv1k9m"
S → G → C → E → P → G
```

Legend:

* S = Start
* G = Ground
* C = Coin
* E = Enemy
* P = Platform

---

# 7. BIOME SELECTION RULES

Jika user tidak menentukan biome:

Auto-select:

```text id="bio1k9"
World 1–2: Overworld
World 3: Underground
World 4: Water
World 5: Sky
World 6: Desert
World 7: Castle
World 8: Final Castle
```

---

# 8. DIFFICULTY CONTROL SYSTEM

Difficulty tidak boleh random.

Controlled via:

* gap size
* enemy density
* platform timing
* hazard frequency

---

# 9. FUN ENFORCEMENT RULE

Jika level:

* terlalu sulit
* tidak ada reward
* tidak ada discovery

→ INVALID

---

# 10. SECRET SYSTEM RULE

Jika hasSecret = true:

Wajib ada:

* hidden path
* optional reward
* alternate route

---

# 11. BOSS INTEGRATION RULE

Jika hasBoss = true:

Level harus memiliki:

```text id="boss1k9"
Approach → Arena → Phase Fight → Reward → Exit
```

---

# 12. GENERATION PRIORITY ORDER

AI harus selalu memprioritaskan:

1. Playability
2. Fairness
3. Fun
4. Difficulty
5. Complexity
6. Aesthetics

---

# 13. ANTI-RANDOM RULE

DILARANG:

* random coin placement
* random enemy spawn
* unreachable platform generation

SEMUA HARUS PATTERN-BASED

---

# 14. FINAL GENERATION CONTRACT

AI wajib:

* Menghasilkan level yang bisa dimainkan
* Tidak membuat softlock
* Menggunakan pattern library
* Memastikan fun score tinggi
* Menjalankan validator sebelum output
* Mengembalikan JSON saja

---

# 15. GOLDEN RULE

Jika ragu antara:

* Realisme
* Kesulitan
* Kompleksitas

PILIH:

FUN + FAIR + PLAYABLE

---

# APPENDIX E - WEDDING INVITATION INTEGRATION

> **Inti dari keberadaan game ini.** Game Mario di sini BUKAN sekadar game. Ia adalah
> **media penyampaian undangan pernikahan**. Tujuan akhir setiap level adalah membuat tamu
> **menemukan** informasi undangan dengan bermain — bukan sekadar tamat level.
>
> **Urutan prioritas tetap: GAME DULU, BARU UNDANGAN.** Game wajib enak dimainkan (60fps,
> kontrol responsif, ada tantangan). Undangan adalah **hadiah yang ditemukan**, bukan
> halaman yang ditempel di atas game. Tapi level design TIDAK dianggap selesai sampai tiap
> kepingan undangan punya tempat yang logis di dalamnya.

---

## E.1 PRINSIP DASAR

1. **Section undangan = collectible item di dalam level.** Tiap potongan informasi undangan
   (hero, mempelai, jadwal akad, RSVP, dst.) disembunyikan dalam **item kepingan khusus**
   yang tersebar di stage. Item kepingan **berbeda** dari power-up/coin biasa — secara visual
   harus jelas "ini istimewa" (mis. amplop 💌 / hati 💝 melayang).
2. **Menamatkan stage TIDAK otomatis memberi kepingan.** Tamu harus benar-benar **menemukan
   & mengambil** item itu. Reach Goal tanpa mengambil kepingan = informasi tidak terbuka.
3. **Jumlah kepingan DINAMIS.** Tidak semua undangan punya semua section (banyak dibungkus
   flag). Jumlah kepingan & indikator HUD harus mengikuti **section yang benar-benar ada**,
   bukan angka hardcoded.
4. **Satu sumber data: section undangan asli.** SEMUA binding `{{var}}` hidup **sekali** di
   dalam section undangan yang sesungguhnya — di retromario ini `<section class="rm-sec"
   data-info="<key>">` di dalam container scroll undangan (`#rm-invitation`). Modal kepingan &
   reveal penuh **membaca/meng-clone** dari section itu. **Jangan duplikasi binding.**
   (Catatan: golden example **tidak** memakai container terpisah bernama `#inv-source`; itu
   pola alternatif. Yang nyata dipakai = section `.rm-sec[data-info]` yang sekaligus jadi isi
   undangan saat di-reveal. Lihat APPENDIX J.2 untuk mekanisme deteksi & binding-nya.)

---

## E.2 PEMETAAN SECTION UNDANGAN → KEPINGAN STAGE

Undangan punya **hingga 11 section**. Tiap section ditandai `data-info="<key>"` (di
retromario: `<section class="rm-sec" data-info="<key>">`). Petakan tiap section ke satu
kepingan di stage:

| # | key (`data-info`) | Isi & variabel utama | Flag pembungkus |
|---|---|---|---|
| 1 | `hero` | `{{groom_nickname}}` & `{{bride_nickname}}`, `{{wedding_date}}`, `{{quote}}`/`{{quote_by}}`, bg `{{photo_hero_cover}}` | selalu ada |
| 2 | `couple` | `{{groom_name}}`/`{{bride_name}}`, foto `{{photo_groom_photo}}`/`{{photo_bride_photo}}`, ortu `{{nama_bapak_*}}`/`{{nama_ibu_*}}`, sosmed `{{ig_*}}` | ortu: `flag_tampilkan_nama_orang_tua` · sosmed: `flag_tampilkan_sosial_media_mempelai` |
| 3 | `rsvp` | Countdown (`{{countdown_hari/jam/menit/detik}}`) + form RSVP | selalu ada |
| 4 | `schedule` | Akad (`{{tanggal_akad}}`,`{{jam_akad}}`,`{{nama_lokasi_akad}}`,`{{akad_map}}`) + Resepsi (`*_resepsi`) | resepsi terpisah: `flag_lokasi_akad_dan_resepsi_berbeda` |
| 5 | `streaming` | `{{link_live_streaming}}` | `is_fitur_live_streaming` |
| 6 | `story` | `{{#each timeline_kisah}}` → `{{this.tanggal/judul/deskripsi}}` | `flag_pakai_timeline_kisah` |
| 7 | `gallery` | `{{#each galleries}}` → `{{this.url}}` | `has_gallery` |
| 8 | `happiness` | Ajakan IG: `{{sample_story_1..3}}` + frame `{{frame_balasan_instagram}}`, CTA `{{link_balasan_instagram}}` | `flag_pakai_additional_feature_story_balasan_instagram` |
| 9 | `wishes` | Form ucapan + `{{#each wishes}}` → `{{this.guest_name/guest_message/guest_comment_time}}` | selalu ada |
| 10 | `gift` | `{{bank_1}}`/`{{rek_1}}`/`{{nama_rek_1}}` (+`_2`), QRIS `{{gambar_qris_rekening_1/2}}`, alamat offline | `tampilkan_amplop_online`, `flag_pakai_2_rekening`, `flag_pakai_qris_rekening_1/2`, `flag_kirim_hadiah_offline` |
| 11 | `closing` | `{{kalimat_penutup}}`, branding `{{site_name}}`/`{{site_url}}` | selalu ada |

> **WAJIB:** verifikasi tiap nama variabel terhadap daftar resmi
> (`.claude/skills/game-invitation-theme/reference/dynamic-variables.md` → sumbernya
> `ThemeGuideModal.tsx` tab "Variabel Tema"). **Jangan mengarang nama variabel** — variabel
> tak dikenal diganti string kosong oleh parser, jadi salah ketik = data hilang diam-diam.

---

## E.3 ATURAN PENEMPATAN KEPINGAN DI LEVEL

Penempatan kepingan harus **logis dan adil** — selevel ketat dengan reachability rule biasa.

### E.3.1 Reachability (WAJIB)

Setiap kepingan undangan **HARUS dapat dicapai** dengan bermain normal (tanpa cheat).

```yaml
all_invitation_pieces_reachable: true
```

Jika satu kepingan tidak reachable → level **INVALID**. Ini lebih keras daripada coin biasa:
coin boleh "bonus opsional", **kepingan undangan tidak boleh hilang permanen**.

### E.3.2 Distribusi antar stage

* Tiap stage memegang **≥ 1 kepingan** (kalau jumlah stage ≤ jumlah section).
* Boleh tidak merata (mis. 10 section disebar di stage 1–4 dari 8 stage), tapi **tidak boleh
  ada stage tanpa tujuan informasi** kecuali stage itu murni klimaks/boss.
* **Section penting tidak boleh ditumpuk di akhir.** `hero`, `schedule`, `rsvp` (info inti
  acara) sebaiknya muncul di **stage-stage awal** supaya tamu yang berhenti di tengah tetap
  dapat info terpenting.

### E.3.3 Tidak boleh berada di balik dead-zone

* Kepingan **tidak boleh** ditempatkan di area yang hanya bisa dicapai lewat secret yang
  tidak terpetakan, atau di balik jurang yang butuh power-up yang belum tentu dimiliki tamu.
* Jika kepingan ada di secret area → **wajib ada minimal satu jalur lain** atau petunjuk
  jelas (coin trail / arrow) menuju secret itu.

### E.3.4 Kepingan ≠ power-up ofensif

Item kepingan **tidak memberi buff gameplay** (bukan Fire Flower/Star). Ia murni
naratif/koleksi. Ini menjaga aturan **Powerup Relevance Rule** (§24) tetap terpisah dari
loop koleksi undangan — keduanya tidak boleh saling mengganggu.

### E.3.5 Validation

```yaml
invitation_integration_check:
  all_invitation_pieces_reachable: true
  every_real_section_has_one_piece: true
  no_piece_behind_unmarked_secret: true
  core_sections_in_early_stages: true   # hero, schedule, rsvp
  piece_is_not_offensive_powerup: true
```

Jika salah satu `false` → integrasi undangan dianggap **INVALID**.

---

## E.4 ALUR KOLEKSI (THE CORE LOOP)

1. **Boot:** JS tema men-scan section undangan (`.rm-sec[data-info]`) untuk section mana yang **benar-benar ada**
   (yang flag-nya false sudah dihapus parser). Daftar ini menentukan jumlah kepingan & ikon
   indikator — **bukan angka hardcoded**.
2. **Sebar item kepingan** di stage sesuai aturan E.3.
3. **Mengambil item → `unlockInfo(key)`**: kepingan tercatat, ikon indikator section itu
   menyala, muncul toast, progress disimpan ke `localStorage`.
4. **Indikator HUD** = N ikon (N = jumlah section riil). Default redup/disabled. Saat
   kepingan-i diambil → ikon-i menyala & clickable → klik membuka modal berisi section itu
   (clone dari `.rm-sec[data-info=key]`).
5. **Tombol "Buka Undangan"** terkunci sampai **semua** kepingan terkumpul (atau cheat aktif).
   Saat terbuka → tampilkan **seluruh** section berurutan (full reveal) di container scroll.
6. **Saat semua kepingan lengkap** → tawarkan klimaks (mis. selamatkan mempelai di akhir
   level) lalu reveal undangan penuh.

---

## E.5 PACING: KEPINGAN MENGIKUTI KURVA LEVEL

Kepingan undangan diletakkan mengikuti pacing template level (§ Pattern Library):

```
Start → Teach → Practice → Test → REWARD(kepingan) → Goal
```

* Letakkan kepingan di **titik reward** setelah tamu melewati tantangan kecil — supaya
  "menemukan info" terasa seperti hadiah, bukan dibagikan gratis di garis start.
* **Jangan** letakkan kepingan tepat di spawn (terlalu mudah, tanpa rasa "menemukan").
* **Jangan** letakkan kepingan setelah Goal/di luar jalur tamat.
* Kepingan boleh ditempatkan di lokasi yang sedikit "tersembunyi tapi terpetakan" (di atas
  pipe, ujung platform melayang, dalam question block khusus) untuk memberi rasa eksplorasi —
  selama reachability E.3.1 terpenuhi.

---

## E.6 CHEAT MODE & INKLUSIVITAS

Tamu yang tidak mau / tidak bisa bermain **tetap harus bisa membuka undangan penuh**. Cheat
Mode (toggle `★`) saat ON:

* Semua kepingan **langsung ter-koleksi** → semua ikon indikator menyala.
* Tombol **Buka Undangan langsung aktif**.
* Karakter kebal, semua stage terbuka, kesulitan bebas.

Cheat harus bisa di-toggle balik & state-nya di `localStorage`. **Undangan tidak boleh
tersandera oleh skill bermain** — game adalah cara yang menyenangkan, bukan syarat wajib.

---

## E.7 KONTRAK HOST (jangan dilanggar saat integrasi)

Detail penuh ada di skill (`reference/host-contract.md`). Yang relevan untuk integrasi:

* **ID host verbatim** untuk fitur fungsional undangan: `btn-show-qr`, `btn-show-menu`,
  `btn-toggle-music`/`btn-music`, `bg-music`, `play-icon`/`pause-icon`,
  ucapan `btn-submit-ucapan`+`wish-name`+`wish-message`, RSVP `btn-submit-kehadiran`+
  `rsvp-status`/`rsvp-guests`/`rsvp-code`. Jangan diberi prefix, jangan diganti.
* **Musik:** tema **tidak boleh** `audio.play()` backsound tenant. Host yang memutar (hanya
  saat `isPlaying && isOpened`). Tema cuma boleh klik `#btn-toggle-music` & mirror ikon.
  SFX game (Web Audio internal) bebas.
* **RSVP, ucapan, QR, menu** tetap berfungsi via ID host — termasuk saat dipanggil dari
  dalam modal kepingan/reveal.

---

## E.8 GOLDEN RULE — INTEGRASI

Sebuah level dianggap **belum selesai** jika:

* Ada section undangan riil yang **tidak punya kepingan** di level.
* Ada kepingan yang **tidak reachable** dengan main normal.
* Undangan **tidak bisa dibuka** tanpa bermain (cheat rusak/tidak ada).
* Binding `{{var}}` **diduplikasi** di banyak tempat, bukan satu sumber.

> **Game tanpa undangan = level kosong tanpa tujuan.**
> **Undangan tanpa game = halaman scroll biasa, bukan tema ini.**
> Keduanya harus menyatu: bermain ADALAH cara membaca undangan.

Information Delivered > Level Completed

---

# APPENDIX F - CHEAT SYSTEM (GOLDEN EXAMPLE)

> **Kenapa cheat itu WAJIB, bukan opsional.** Tema ini adalah **undangan pernikahan**, bukan
> game kompetitif. Sebagian tamu tidak bisa / tidak mau bermain (orang tua, tamu di HP
> kentang, tamu yang buru-buru). Undangan **tidak boleh tersandera oleh skill bermain**.
> Cheat Mode adalah **jalan keluar inklusif**: satu tombol untuk melewati game dan langsung
> membuka undangan penuh — sambil tetap boleh bermain dengan bebas.
>
> Bagian ini mendokumentasikan implementasi cheat retromario di
> [`index.js`](src/sample-theme/retromario/index.js) sebagai **acuan baku** untuk tema game
> lain. Pola di bawah sudah terbukti & sudah membayar mahal lewat bug (lihat §F.6).

---

## F.1 SATU FLAG, SATU TOGGLE

Cheat = **satu boolean** pada objek player: `player.cheat`. Di-toggle oleh **satu tombol**
(`★` / `starBtn`). Saat di-klik:

```
player.cheat = !player.cheat;
starBtn.classList.toggle('is-on', player.cheat);   // visual state tombol
updateViewBtn();        // cheat membuka shortcut "Buka Undangan"
updateStageSelBtn();    // cheat memunculkan tombol stage-select
toast(player.cheat ? 'CHEAT MODE ON …' : 'CHEAT MODE OFF');
```

**Prinsip:** seluruh efek cheat diturunkan dari **satu sumber kebenaran** (`player.cheat`).
Jangan menyebar banyak flag cheat terpisah — itu bikin state desync.

---

## F.2 EFEK CHEAT — DUA RANAH TERPISAH

Cheat memengaruhi **gameplay** DAN **akses undangan**. Pisahkan keduanya secara mental:

### Ranah GAMEPLAY (biar tetap bisa main, lebih bebas)
| Efek | Implementasi |
|---|---|
| Kebal musuh / peluru / boss | `if (player.star > 0 \|\| player.cheat) { killEnemy(e); … }` — cheat diperlakukan seperti star permanen |
| Tidak mati oleh hazard biasa | `die()` **early-return** saat `player.cheat` (`if (player.cheat) return;`) |
| Tidak jatuh ke void | pit/lava → `rescueFromPit()` (angkat ke ground terdekat), **bukan** `die()` |
| Pilih stage bebas | tombol stage-select muncul hanya saat cheat (`updateStageSelBtn`) |
| Pilih difficulty bebas | dialog stage-select bisa cycle mode |

### Ranah UNDANGAN (akses penuh tanpa main)
| Efek | Implementasi |
|---|---|
| Shortcut "Buka Undangan" terbuka | `viewUnlocked() = completed \|\| allInfoUnlocked() \|\| (player && player.cheat)` |
| Saat undangan dibuka, semua kepingan dipastikan ter-unlock | `openInvitation()` me-loop `INFOS` & set `unlocked[key]=true` |

---

## F.3 ATURAN EMAS: SKOR DIMATIKAN SAAT CHEAT

Cheat **tidak boleh** mengotori leaderboard/`bestScore`. Karena itu penambahan skor
di-gate:

```
function addScore(n) { if (!player.cheat) { score += n; setHUD(); } }
```

> **Pola wajib tema lain:** setiap progres yang "dibanggakan" (skor, best-time, ranking)
> harus **dibekukan saat cheat ON**. Cheat untuk *akses*, bukan untuk *prestasi palsu*.

---

## F.4 PERSISTENSI — INI YANG SERING SALAH DIPAHAMI

Di retromario, **`player.cheat` SENGAJA TIDAK di-persist** ke `localStorage`:

- `persist()` hanya menyimpan: `unlocked`, `bestScore`, `seenInfo`, `bestStage`,
  `completed`, `announcedAll`, `gameDiff`, `muted`. **Tidak ada `cheat`.**
- Player baru selalu lahir dengan `cheat: player ? player.cheat : false` → **reload =
  cheat mati**.

**Kenapa begini (penting untuk multi-tamu di 1 device):**
Yang di-persist adalah **hasil koleksi** (`unlocked`), BUKAN mode cheat-nya. Jadi:

- Tamu A nyalakan cheat → buka undangan → `openInvitation()` menulis `unlocked[*]=true` →
  ini **memang tersimpan** (tamu A sudah lihat undangan, wajar).
- Tapi **mode cheat** itu sendiri tidak menempel; reload mengembalikan game ke mode jujur.

> **Keputusan desain untuk tema lain:** boleh memilih untuk mem-persist cheat ATAU tidak,
> tapi **sadari konsekuensinya**. Mem-persist cheat = device itu selamanya "mode mudah".
> Tidak mem-persist (seperti retromario) = tiap sesi mulai jujur, tapi kepingan yang sudah
> dibuka tetap kebuka. Pilih sesuai apakah device dipakai banyak tamu.

---

## F.5 RESET — JALAN KELUAR DARI CHEAT

Harus ada **reset progress** dengan **konfirmasi** (overlay sendiri, **bukan** `confirm()`
native). Reset retromario (`confirmOk`):

```
resetSave();              // hapus localStorage + nolkan unlocked/seenInfo/best…
player.cheat = false;     // matikan cheat
starBtn.classList.remove('is-on');
buildInventory();         // semua ikon kepingan terkunci lagi
updateViewBtn();          // kunci ulang tombol Buka Undangan
startGame(1);             // kembali ke World 1-1 (player baru → cheat false)
updateStageSelBtn();      // sembunyikan stage-select
```

Cheat juga bisa **di-toggle balik** kapan saja (klik `★` lagi) untuk mengembalikan tantangan.

---

## F.6 BAHAYA UTAMA: CHEAT-BYPASS BLIND SPOT (bug berulang)

Pola `if (player.cheat) return;` adalah **sumber bug paling sering** di tema ini. Saat sebuah
fungsi di-skip oleh cheat, **efek samping yang seharusnya tetap terjadi ikut hilang**.

**Kasus nyata ("Mario hilang tapi arrow jalan"):**
`die()` early-return saat cheat. Saat jatuh ke pit dengan cheat ON, `die()` di-skip → 
`player.dead` tidak pernah `true` → Mario terus jatuh ke void selamanya, tapi input arrow
masih menggerakkannya. **Pit/void harus ditangani untuk DUA mode:**

```
if (!player.dead && player.y > (GROUND_R + 2) * TILE) {
    if (player.cheat) rescueFromPit();          // cheat: angkat balik, JANGAN mati
    else { player.dead = true; … }              // normal: mati + respawn
}
```

> **Aturan untuk tema lain — wajib audit tiap titik cheat:**
> 1. Daftar **semua** `if (player.cheat) …` / `if (cheat) return;`. Buat satu inventaris.
> 2. Untuk tiap titik, tanya: *"kalau fungsi ini di-skip, ada efek samping yang hilang?"*
>    (kematian → posisi tak ter-reset, collision → objek tak ter-handle, dsb.)
> 3. Skenario "tidak bisa direproduksi" → **pertama tanyakan: ini di mode cheat atau normal?**
>    Cheat & normal adalah **dua jalur kode berbeda** dan harus dites terpisah.
> 4. Pasang **safety net** di titik fatal (retromario: cek `player.y > (GROUND_R+2)*TILE`
>    di awal `stepPlayer`, jadi cheat tetap aman dari void).
>
> Lihat memory `retromario-debugging` untuk konteks penuh. Verifikasi pakai harness Node
> headless yang menjalankan `loop()` ASLI (bukan memanggil step-function langsung) —
> screenshot headless di mesin ini selalu blank.

---

## F.7 CHECKLIST CHEAT (untuk tema game baru)

- [ ] Satu flag (`player.cheat`) + satu tombol toggle, semua efek diturunkan dari sana.
- [ ] Cheat ON → kebal semua hazard/musuh/boss; void/pit di-*rescue*, bukan dibiarkan jatuh.
- [ ] Cheat ON → semua kepingan undangan terbuka + tombol Buka Undangan aktif.
- [ ] Skor / best-time **dibekukan** saat cheat ON.
- [ ] Stage-select & difficulty bebas hanya muncul saat cheat.
- [ ] Cheat bisa di-toggle balik; ada Reset progress berkonfirmasi (overlay, bukan `confirm()`).
- [ ] Keputusan persist cheat diambil sadar (default retromario: TIDAK di-persist).
- [ ] Setiap `if (cheat) return;` sudah diaudit untuk efek samping yang hilang.
- [ ] Diverifikasi via harness `loop()` asli, untuk mode cheat DAN normal.

Inclusive Access > Game Mastery

---

# APPENDIX G - CELEBRATION & ACHIEVEMENT MOMENT (GOLDEN EXAMPLE)

> **Momen klimaks adalah puncak emosional undangan.** Saat tamu mencapai tujuan, game harus
> "meledak meriah" lalu memberi tahu **apa yang baru saja mereka raih**. Tanpa ini,
> menyelesaikan game terasa hambar dan undangan kehilangan momen "wah"-nya.
>
> Acuan implementasi: `retromario` (`announceAllCollected()` & `bossFinale()` di
> [`index.js`](src/sample-theme/retromario/index.js)).

---

## G.1 DUA KONDISI PEMICU (keduanya WAJIB ditangani)

Efek kemeriahan + dialog pencapaian dipicu oleh **dua kondisi terpisah**. Keduanya adalah
"kemenangan", tapi maknanya berbeda — jadi **dialognya pun berbeda**:

| # | Pemicu | Arti bagi tamu | Fungsi acuan retromario |
|---|---|---|---|
| 1 | **Kepingan informasi TERAKHIR didapat** | Undangan kini **lengkap & bisa dibuka** (tanpa harus tamat game) | `unlockInfo()` → `if (allInfoUnlocked())` → `announceAllCollected()` |
| 2 | **Game selesai sampai stage TERAKHIR** (boss/flag akhir) | Cerita game **tamat** — "happily ever after" | `bossFinale()` (set `completed = true`) |

> **Penting:** keduanya **bisa terjadi di urutan mana pun**. Tamu bisa mengumpulkan semua
> kepingan SEBELUM tamat (pemicu 1 dulu), atau menamatkan game sambil kepingan terakhir baru
> didapat di stage akhir (keduanya bersamaan). Desain harus tahan terhadap kedua urutan, dan
> **tidak menampilkan perayaan duplikat** untuk hal yang sama (lihat G.4 — guard sekali tampil).

---

## G.2 ANATOMI EFEK MERIAH (~5 detik)

Saat salah satu pemicu terjadi, jalankan **celebration beat** lalu **baru** buka dialog —
dialog tidak boleh muncul seketika, beri momen meriah "bernapas" dulu.

Lapisan efek (dari `announceAllCollected`/`bossFinale`):

1. **Screen flash** — `triggerFlash(46, '#fff3b0')` (kilatan emas).
2. **Fireworks barrage** — `startFireworks()` + beberapa `spawnFirework(...)`; finale game
   pakai barrage lebih panjang (`fwActive = 320`).
3. **Audio kemenangan** — `playSfx('fanfare')` / `playSfx('win')` (SFX game, **bukan**
   backsound tenant — lihat kontrak host).
4. **Toast** — mis. `'♥ HAPPILY EVER AFTER ♥'` atau `'🎉 SEMUA INFO TERKUMPUL! 🎉'`.
5. **Secondary pops** — `setTimeout` berlapis (≈900ms, ≈2000ms) supaya layar terus berpesta.
6. **Dialog pencapaian dibuka SETELAH jeda** — `setTimeout(showWin, 4500)` (finale) /
   `setTimeout(showRescueOffer, 1700)` (kepingan lengkap).

**Patokan durasi:** beat perayaan **±4.5–5 detik** sebelum dialog. Cukup lama untuk terasa
spesial, cukup singkat agar tidak menghalangi tamu yang ingin segera membuka undangan.

> Catatan: di mesin ini **`Date.now()`/`Math.random()` tidak dipakai** untuk timing — gunakan
> `setTimeout` + clock frame (`animT`) seperti retromario; jangan menambah RNG timing.

---

## G.3 DIALOG PENCAPAIAN — ISI

Dialog yang muncul setelah beat harus **menyebut apa yang diraih**, bukan sekadar "Selamat":

- **Pemicu 1 (kepingan lengkap):** sampaikan **"semua kepingan undangan terkumpul → undangan
  siap dibuka"**. Retromario membingkainya naratif: undangan siap, tapi "sang putri masih
  ditawan" → tawarkan **bonus opsional** menyelamatkan mempelai ATAU langsung **Buka
  Undangan**. (Dialog `rm-rescue` memakai `groom_nickname`/`bride_nickname` via `val()` dari section undangan.)
- **Pemicu 2 (game tamat):** dialog **happy-ending / kemenangan akhir** (`showWin`) — rangkum
  pencapaian: skor akhir, stage tertinggi, semua kepingan terbuka, ajakan buka undangan penuh.
- **Wajib:** dialog harus menampilkan **CTA "Buka Undangan"** — perayaan tanpa jalan ke
  undangan = momen yang sia-sia.
- Gunakan **nama mempelai dinamis** via `val('groom_nickname')` dst. (baca dari section undangan), jangan
  hardcode.

---

## G.4 GUARD: SEKALI TAMPIL, TIDAK DUPLIKAT

Perayaan pemicu-1 **hanya boleh sekali**. Retromario memakai flag `announcedAll`:

```
if (allInfoUnlocked()) {
    updateViewBtn();
    if (!announcedAll) { announcedAll = true; setTimeout(announceAllCollected, 900); }
}
```

`announcedAll` **di-persist** ke `localStorage` (beda dari `player.cheat` yang tidak — lihat
APPENDIX F), sehingga perayaan "semua kepingan" tidak terulang tiap reload.

> **Aturan tema lain:**
> - Beri **flag sekali-tampil** untuk tiap perayaan (mis. `announcedAll`, `completed`).
> - **Jangan** picu ulang celebration saat reload / re-render / re-inject JS tema.
> - Saat **cheat** meng-auto-collect semua kepingan, putuskan sadar apakah perayaan
>   pemicu-1 ikut tampil — biasanya **boleh tampil sekali** (tamu memang "menyelesaikan"
>   koleksi), tapi jangan sampai membombardir.

---

## G.5 INTEGRASI DENGAN GAMEPLAY (jangan auto-lock undangan)

Saat kedua pemicu terjadi, **pastikan semua kepingan ter-unlock** supaya tamu tidak pernah
terkunci dari detail asli pernikahan:

```
INFOS.forEach(function (info) {
    if (!unlocked[info.key]) { unlocked[info.key] = true; /* enable ikon */ }
});
updateViewBtn(); persist();
```

`bossFinale()` melakukan ini (tamat game = buka semua), begitu pula `openInvitation()`.
Tujuannya satu: **menang di game = undangan PASTI bisa dibuka.**

---

## G.6 CHECKLIST CELEBRATION (untuk tema game baru)

- [ ] Dua pemicu ditangani terpisah: **kepingan terakhir** & **game tamat**.
- [ ] Beat meriah **±5 detik** (flash + fireworks/partikel + SFX kemenangan + toast) SEBELUM dialog.
- [ ] SFX perayaan = audio game, **bukan** backsound tenant (kontrak host).
- [ ] Dialog menyebut **pencapaian konkret** + CTA "Buka Undangan", pakai nama mempelai dinamis.
- [ ] **Flag sekali-tampil** (di-persist) → tidak duplikat saat reload/re-inject.
- [ ] Saat menang, **semua kepingan dipastikan ter-unlock** (undangan tak pernah terkunci).
- [ ] Tahan terhadap urutan pemicu mana pun (kepingan dulu / tamat dulu / bersamaan).

Celebrate the Moment, Then Open the Invitation

---

# APPENDIX H - LAYOUT, HUD & SCORE (GOLDEN EXAMPLE)

> Acuan implementasi: `retromario` HUD di
> [`index.html`](src/sample-theme/retromario/index.html) (`#rm-hud`, `#rm-leftbtns`,
> `#rm-inv`, `#rm-sidebar`) + responsif di [`index.css`](src/sample-theme/retromario/index.css)
> (`@media (min-width: 900px)`). Semua angka & ID di bawah diambil dari kode nyata.

---

## H.1 LAYOUT HALAMAN — MOBILE-FIRST, DESKTOP 2-SISI

**Target utama = mobile.** Game & undangan didesain untuk frame potret smartphone. Di
desktop/PC, **JANGAN melebarkan game** — pertahankan frame mobile, lalu isi ruang kosong
dengan panel kedua. Hasilnya **2 sisi**:

```
┌─────────────────────────────┬───────────────────────┐
│  SISI KIRI                  │  SISI KANAN           │
│  (pertahankan frame mobile) │  (welcome screen)     │
│                             │                       │
│  • Game / undangan jalan    │  • Nama mempelai +    │
│    persis seperti di HP     │    tanggal (info      │
│  • HUD, tombol, kontrol     │    undangan)          │
│    sentuh ADA di dalam      │  • Dekorasi game      │
│    frame ini                │    (canvas tableau)   │
│                             │  • Panduan kontrol PC │
└─────────────────────────────┴───────────────────────┘
        .rm-game (frame HP)        .rm-sidebar
```

**Aturan baku:**
- **Sisi kiri** = frame mobile yang **tidak berubah** dari tampilan HP (game, HUD, kontrol,
  undangan — semua di sini). Ini satu-satunya area interaktif.
- **Sisi kanan** = **welcome screen** non-interaktif (atau semi): nama mempelai
  (`{{groom_nickname}}`/`{{bride_nickname}}`), `{{wedding_date}}`, badge judul, dekorasi
  bertema game (di retromario: `<canvas id="rm-side-canvas">` tableau procedural), dan
  **petunjuk kontrol keyboard** untuk pemain PC.
- **Breakpoint:** sisi kanan **disembunyikan di mobile**, muncul via `@media (min-width: 900px)`
  (retromario: `.rm-sidebar { display:none }` → `display:block` di ≥900px). Pilih breakpoint
  yang konsisten untuk satu tema; jangan campur 900/980 dalam satu tema.
- **Kontrol input:** mobile = joystick + tombol sentuh **di dalam frame kiri**; desktop =
  keyboard (panah/WASD + tombol aksi) dengan **petunjuk on-screen di sisi kanan**.

> Jangan menjadikan desktop sebagai layout "lebar" baru. Desktop = mobile + 1 panel hiasan.
> Ini menjaga satu basis layout (mobile) sehingga game tak perlu di-relayout dua kali.

---

## H.2 SUSUNAN TOMBOL HUD (posisi & isi sudah baku)

HUD dibagi tiga: **info game di atas**, lalu **dua gugus tombol** di bawahnya (kiri & kanan),
plus kontrol sentuh di bawah. Patuhi penempatan ini agar tema konsisten:

### H.2.1 Bar info game (atas, full width) — `#rm-hud`
Tiga kolom: **koin** (`#rm-coins`) · **SCORE** (`#rm-score`) · **WORLD + difficulty badge**
(`#rm-world` + `#rm-diff-badge`). Ini status game, bukan tombol.

### H.2.2 Sisi KANAN-atas (di bawah info game) — IKON UNDANGAN, **2 KOLOM** — `#rm-inv`
- Grid **2 kolom** (`grid-template-columns: repeat(2, …)`), satu ikon per **section undangan
  riil** (jumlah dinamis dari hasil scan `.rm-sec[data-info]`, lihat APPENDIX E & J.2).
- Default **redup/terkunci**; menyala saat kepingannya didapat; klik → modal section.
- **Jangan hardcode jumlah** — grid mengikuti banyaknya section yang benar-benar ada.

### H.2.3 Sisi KIRI-atas (di bawah info game) — TOMBOL FUNGSI, **1 KOLOM** — `#rm-leftbtns`
Stack vertikal **1 kolom**, **urutan baku** dari atas ke bawah:

| Urutan | Tombol | ID | Catatan |
|---|---|---|---|
| 1 | **Mute game** (SFX + chiptune) | `#rm-sound-btn` | mute audio GAME saja, bukan backsound tenant |
| 2 | **Cheat mode** (★) | `#rm-star-btn` | toggle `player.cheat` (APPENDIX F) |
| 3 | **Pilih stage** | `#rm-stagesel-btn` | `display:none` → **muncul hanya saat cheat aktif** |
| 4 | **Lihat undangan** | `#rm-view-btn` | `is-locked` sampai semua kepingan / tamat / cheat |
| 5 | **QR code** kehadiran | `#btn-show-qr` | **ID host verbatim** — host yang wire ke scanner |
| 6 | **Reset** progress | `#rm-settings-btn` | buka konfirmasi (overlay, bukan `confirm()`) |

> **Wajib:** tombol **Pilih stage** hanya tampil saat cheat ON (`updateStageSelBtn()`), dan
> **QR** harus pakai ID host `btn-show-qr` tanpa prefix (kontrak host) — kalau diganti, fitur
> QR kehadiran mati.

---

## H.3 SISTEM POINT/SCORE — SELALU ADA, MATI SAAT CHEAT

Game ini **selalu** punya sistem pengumpulan point; point **didapat dari dalam game** (koin,
musuh diinjak, bonus waktu saat menang, dst.). Ditampilkan live di `#rm-score`/`#rm-coins`.

**Aturan inti (mengikat dengan APPENDIX F.3):**

```
function addScore(n) { if (!player.cheat) { score += n; setHUD(); } }
```

- Saat **cheat OFF** → mekanisme point **aktif** (skor & koin bertambah normal).
- Saat **cheat ON** → mekanisme pengumpulan point **dinonaktifkan** (skor beku). Cheat
  untuk *akses undangan*, bukan untuk *skor palsu*.
- `bestScore` di-persist (lihat `persist()`), `player.cheat` tidak — jadi skor jujur tidak
  pernah tercemar oleh sesi cheat.

> **Untuk tema lain:** apa pun arketipe game-nya (platformer, runner, match-3), **wajib** ada
> sistem point yang earned in-game **dan** dibekukan saat cheat. Ini konsisten dengan
> filosofi: cheat = inklusivitas akses, bukan kompetisi.

---

## H.4 CHECKLIST LAYOUT, HUD & SCORE (untuk tema game baru)

- [ ] Mobile-first; desktop **mempertahankan frame mobile** + 1 panel welcome di sisi kanan.
- [ ] Sisi kanan (welcome) muncul via `@media (min-width: …)`, **disembunyikan di mobile**.
- [ ] Sisi kanan berisi: nama mempelai + tanggal + dekorasi game + petunjuk kontrol PC.
- [ ] Ikon **undangan** di **kanan-atas, 2 kolom**, jumlah **dinamis** per section riil.
- [ ] Tombol **fungsi** di **kiri-atas, 1 kolom**, urutan: mute · cheat · stage-select ·
      lihat undangan · QR · reset.
- [ ] **Stage-select** hanya tampil saat cheat ON; **QR** pakai ID host `btn-show-qr`.
- [ ] Sistem **point** selalu ada, earned in-game, dan **dibekukan saat cheat ON**.

Keep the Phone, Decorate the Desktop

---

# APPENDIX I - INVITATION PIECE COLLECTION MECHANIC (GOLDEN EXAMPLE)

> APPENDIX E menjelaskan **konsep** loop koleksi. Appendix ini mendokumentasikan **mekanisme
> konkret** cara kepingan didapat di `retromario`
> ([`index.js`](src/sample-theme/retromario/index.js)) sebagai pola implementasi baku.
> Arketipe game lain boleh memakai item berbeda (peti, POD ditembak, makan dot), tapi
> **aturan distribusi, determinisme, dan respons-ambil di bawah tetap berlaku.**

---

## I.1 BENTUK KEPINGAN: `?` INFO-BLOCK

Di retromario, kepingan **bukan** item melayang — ia adalah **question-block `?` khusus**
(`kind: 'info'`) yang diaktifkan dengan **memukul dari bawah** (mekanik Mario klasik). Ini
membuat koleksi terasa native terhadap arketipe.

- Tile `?` di grid → `box.kind = 'info'` saat build (`buildSpine`/stamp `PAT.infoBlock`).
- Info-block **dibedakan** dari question-block biasa: `'C'` = coin-block (skor saja), `'?'` =
  info-block (kepingan undangan). Jangan campur.

> **Untuk arketipe lain:** ganti bentuknya sesuai game (Contra → POD 💌 ditembak; top-down →
> peti dibuka; Pac-Man → dot spesial), tapi **harus jelas-beda secara visual** dari
> collectible biasa, dan **bukan** power-up ofensif (APPENDIX E.3.4).

---

## I.2 DISTRIBUSI: QUOTA PER-STAGE + AUTO-SCALE

Kepingan **disebar bertahap**, tidak ditumpuk di satu stage. Retromario memakai quota tetap:

```
var STAGE_INFO_QUOTA = [3, 3, 2, 2, 0, 0, 0, 0];   // jumlah '?' per world
// Sum MUST == INFOS.length (10 default) → tiap kepingan pasti tersebar dalam 1 playthrough
```

- Disebar di **4 world pertama** supaya tamu menemukan undangan **gradual** (bukan sekaligus
  di stage 1, bukan menumpuk di akhir — selaras APPENDIX E.3.2 & E.5).
- **Auto-scale saat section dikurangi flag:** kalau `INFOS.length < 10` (beberapa section
  off), `stageInfoQuota()` mendistribusi ulang `total` secara proporsional ke shape 4-world
  yang sama, dengan koreksi pembulatan jatuh ke stage 1. **Jangan hardcode 10.**

---

## I.3 DETERMINISME: SLICE KONTIGU PER STAGE

Tiap stage memetakan ke **potongan `INFOS` yang tetap & berurutan** — penting agar cheat
stage-jump / replay tidak bikin kepingan ganda atau desync:

```
stageInfoOffset(stage) = Σ quota(1..stage-1)         // index awal slice stage ini
box.info = INFOS[(infoBase + infoLocal) % INFOS.length]   // pemetaan deterministik
```

> **Aturan baku:** pemetaan "stage → kepingan mana" harus **deterministik dari nomor stage**,
> bukan dari counter berjalan. Tema yang memakai counter global akan rusak begitu pemain
> loncat stage (via cheat) atau mengulang stage.

---

## I.4 SAAT DIAMBIL — RESPONS LENGKAP (`triggerBox` → `unlockInfo`)

Begitu info-block dipukul, jalankan **rangkaian feedback** ini (semua dari `triggerBox`):

1. `unlockInfo(b.info)` — catat `unlocked[key]=true`, nyalakan ikon indikator, `persist()`.
2. `addScore(200)` — beri skor (otomatis beku saat cheat, APPENDIX F.3/H.3).
3. `playSfx('unlock')` + `spawnParticles(...)` — audio & partikel "juice".
4. `flyItemToInventory(b.info, b.c, b.r)` — **animasi token terbang** dari block ke slot
   inventory yang cocok; pulse "just-unlocked" ikon ditunda sampai token mendarat (satu gerak).
5. `toast('INFO TERBUKA: ' + b.info.label + …)` — **NOTIFIKASI saja, JANGAN auto-open** modal.

> **Aturan emas — JANGAN auto-open:** mengambil kepingan **tidak** langsung membuka dialog
> section. Ia hanya **menyalakan ikon**; tamu memilih sendiri kapan membaca (klik ikon →
> modal). Auto-open memutus gameplay & terasa memaksa.

---

## I.5 SISA QUOTA → FILLER SKOR

Slot pola yang tidak terpakai untuk kepingan **tidak dibiarkan kosong** — diisi konten skor:

```
function info() { if (nInfo < quota) { nInfo++; return PAT.infoBlock(); }
                  return PAT.coinTrail(3); }   // sisa → coin trail, footprint sama
```

Jadi level tetap padat & reward-ful walau kepingannya sedikit. Bentuk filler menyesuaikan
arketipe (coin, poin, dsb.).

---

## I.6 CHECKLIST COLLECTION MECHANIC (untuk tema game baru)

- [ ] Kepingan = item **khusus, beda visual** dari collectible biasa, sesuai arketipe.
- [ ] Kepingan **bukan** power-up ofensif (APPENDIX E.3.4).
- [ ] Distribusi **bertahap** via quota per-stage; **auto-scale** saat section dikurangi flag.
- [ ] Pemetaan stage→kepingan **deterministik** (tahan cheat stage-jump & replay).
- [ ] Saat diambil: unlock + skor + SFX + partikel + animasi ke inventory + toast.
- [ ] **Tidak auto-open** modal — hanya nyalakan ikon; tamu yang memilih membaca.
- [ ] Slot pola sisa diisi **filler skor**, bukan dibiarkan kosong.
- [ ] Tetap patuh reachability & penempatan APPENDIX E.3 (semua kepingan bisa didapat normal).

Discovered, Not Handed Over

---

# APPENDIX J - TECHNICAL FOUNDATION & HOST WIRING (GOLDEN EXAMPLE)

> **APPENDIX A–I memberi tahu APA yang dibuat. APPENDIX J memberi tahu bagaimana agar tema
> tidak BUG saat berjalan di host.** Setiap poin di sini sudah pernah jadi bug nyata dan
> diverifikasi langsung ke [`index.js`](src/sample-theme/retromario/index.js) /
> [`index.html`](src/sample-theme/retromario/index.html). Jika satu poin di sini dilewatkan,
> tema bisa **blank canvas**, **loop dobel**, **fitur undangan mati diam-diam**, atau
> **kepingan salah hitung** — bukan sekadar kurang rapi.
>
> Kontrak host lengkap ada di `.claude/skills/game-invitation-theme/reference/host-contract.md`.
> Appendix ini merangkum yang **paling sering** jadi bug.

---

## J.1 LIFECYCLE: JS TEMA DI-RE-INJECT — CLEANUP HOOK WAJIB (penyebab bug #1)

Host (`ThemeWrapper`) **menghapus & menjalankan ULANG** seluruh `<script>` tema setiap kali
inputnya berubah — dan ini terjadi **bukan cuma saat ganti tema**, tapi juga **setiap tamu
submit ucapan / RSVP / hadiah** (host me-recompute HTML undangan → re-inject). Tanpa cleanup,
RAF loop, listener, interval, dan audio lama **menumpuk** → game jalan dobel, input ganda,
frame drop, memory leak.

**Pola wajib (retromario `index.js:28-33`):**

```js
(function () {
  'use strict';
  // Panggil cleanup versi LAMA sebelum apa pun, lalu daftarkan yang baru.
  if (typeof window.__rmCleanup === 'function') { try { window.__rmCleanup(); } catch (e) {} }
  var cleanupFns = [];
  function onCleanup(fn) { cleanupFns.push(fn); }
  window.__rmCleanup = function () { cleanupFns.forEach(function (f){ try{f();}catch(e){} }); cleanupFns = []; };
  // … seluruh game …
})();
```

**Daftarkan `onCleanup(...)` untuk SETIAP sumber berikut:** RAF loop utama, RAF sidebar/canvas
dekorasi, semua `addEventListener` (resize, joystick, klik global, lightbox), `setInterval`
(countdown), dan — jika pakai engine ber-state — `game.destroy()`. retromario membersihkan
RAF, resize listener, sidebar RAF, countdown interval, joystick, dan lightbox lewat hook ini.

> Nama hook bebas (`__rmCleanup`, `__gwCleanup`, …) tapi **harus global & idempotent**. Ini
> aturan paling fatal di seluruh bible — lupakan ini = tema rusak setelah interaksi pertama.

---

## J.2 ENGINE & BINDING — BAGAIMANA DATA UNDANGAN DIBACA

### J.2.1 Dua jalur engine — pilih sesuai konteks

| Konteks | Engine | Acuan |
|---|---|---|
| **Tema game BARU** (Contra, Zelda, dll.) | **Phaser 3** | Skill `game-invitation-theme` (memang dirancang untuk Phaser 3) |
| **Tema Mario `retromario`** (golden example bible ini) | **Canvas 2D murni** | `index.js` — `<canvas>` + `getContext('2d')` (`index.js:61`), RAF loop & fisika ditulis sendiri |

Keduanya **sama-sama sah** — hanya beda alat. retromario sengaja canvas murni; tema baru
sengaja Phaser 3.

> **Yang BERLAKU di kedua jalur (prinsip universal, bukan spesifik canvas):** cleanup hook
> (J.1), cara baca binding (J.2.2–J.2.4), kontrak musik (J.3), wiring RSVP/ucapan (J.4), dan
> aturan anti-bentrok host (J.6). Yang **spesifik canvas** hanya detail di **J.5**
> (DPR/`imageSmoothingEnabled`/`getBoundingClientRect`) — di Phaser, padanannya ditangani
> engine, dan cleanup-nya jadi `game.destroy()` di dalam hook J.1.

### J.2.2 Binding dibaca via `data-var`, BUKAN `#inv-source`
Parser host mengganti `{{var}}` jadi **teks ter-render** sebelum JS tema jalan. retromario
membaca teks itu lewat helper (`index.js:141-145`):

```js
function val(k, fb) {
  var el = document.querySelector('[data-var="' + k + '"]');
  var v = el ? (el.textContent || '').trim() : '';
  if (!v || v.indexOf('{{') === 0) return fb || '';   // var tak ter-resolve → fallback
  return v;
}
```

Jadi tiap elemen yang perlu dibaca JS membawa **DUA hal**: atribut `data-var="groom_name"`
(kunci pencarian) **dan** teks `{{groom_name}}` (yang diisi parser). Contoh:
`<span data-var="wedding_date">{{wedding_date}}</span>`.

> **Jebakan:** `data-var`/`data-if`/`data-img` **TIDAK diproses parser** (tidak ada substitusi
> atribut runtime) — itu murni konvensi internal tema. Baca **teks rendered**, bukan atribut.
> Var typo → parser mengganti dengan **string kosong tanpa error** → data hilang diam-diam.
> Selalu verifikasi nama var ke `reference/dynamic-variables.md`.

### J.2.3 Deteksi section riil: `{{#if flag}}` harus MEMBUNGKUS `<section data-info>`
Jumlah kepingan dinamis bergantung pada `sectionExists()` (`index.js:147-149`):

```js
function sectionExists(infoKey) {
  return !!document.querySelector('.rm-sec[data-info="' + infoKey + '"]');
}
var INFOS = INFO_DEFS.filter(function (d) { return d.always || sectionExists(d.key); });
```

Agar ini bekerja, flag fitur (`{{#if has_gallery}}` dst.) **harus membungkus seluruh
`<section class="rm-sec" data-info="gallery">…</section>`**. Saat flag false, parser
**menghapus section** → `sectionExists('gallery')` false → `INFOS` mengecil otomatis.

> **Jebakan fatal:** kalau `{{#if}}` ditaruh **di dalam** section (bukan membungkusnya),
> section tetap ada di DOM walau kosong → `sectionExists` true → muncul **kepingan hantu**
> untuk section tanpa isi, dan `allInfoUnlocked()` menunggu kepingan yang isinya blank →
> undangan tak pernah bisa "lengkap". **Bungkus section, jangan isinya.**

### J.2.4 Parser caveat (templateParser.ts)
- `{{#each list}}` hanya merender bila `list` benar-benar **array**; kalau bukan → blok hilang.
- `{{else}}` hanya bekerja di dalam `{{#if}}` — **tidak** di `{{#each}}`/`{{#unless}}`.
- Tidak ada warning untuk var/flag salah ketik. Diam-diam kosong.

---

## J.3 MUSIK — HOST YANG MEMUTAR; TEMA HANYA MIRROR (idempotent!)

Host memegang `Audio`/YouTube asli dan **hanya** memutar saat `isPlaying && isOpened`. Tema
**TIDAK boleh** `audio.play()` backsound tenant. Tema hanya:
- menaruh `<audio id="bg-music">` sebagai **target mirror** (host men-dispatch `Event('play')`/
  `Event('pause')` ke elemen ini sebagai sinyal — bukan untuk memutar audio),
- meng-klik `#btn-toggle-music` untuk **mengubah** state, dan mirror ikon `play-icon`/`pause-icon`.

> **Bug mahal yang sudah dibayar:** mirror musik **harus idempotent**. Mengklik
> `#btn-toggle-music` dua kali (karena membaca class lama sebelum React flip state) justru
> mematikan musik lagi → "musik tidak jalan". Pola aman: simpan **intent** (`musicWanted`) +
> generation guard, dan hanya klik bila state host **masih** salah, dengan retry terjadwal.
> SFX game (Web Audio internal) bebas. Lihat memory `retromario-host-music`.

---

## J.4 WIRING RSVP / UCAPAN / HADIAH — PANGGIL FUNGSI GLOBAL HOST

Memasang ID host saja **tidak cukup** — tema harus memanggil fungsi global host bila tersedia,
dengan **fallback lokal** (optimistic UI) bila tidak. retromario (`index.js:4101-4125`):

```js
// Ucapan — input WAJIB pakai ID host verbatim: wish-name, wish-message, btn-submit-ucapan
if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
// … else: render thank-you + sisipkan ke list secara lokal …

// RSVP — btn-submit-kehadiran + rsvp-status/rsvp-guests/rsvp-code
if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
```

**ID host verbatim (tanpa prefix) yang harus dipakai apa adanya:**
`btn-show-qr`, `btn-show-menu`, `btn-toggle-music`/`btn-music`, `bg-music`,
`play-icon`/`pause-icon`, ucapan `btn-submit-ucapan`+`wish-name`+`wish-message`,
RSVP `btn-submit-kehadiran`+`rsvp-status`/`rsvp-guests`/`rsvp-code`, hadiah `btn-submit-hadiah`
+ `gift-*`. Mengubah/prefix ID = fitur backend-nya **mati diam-diam**.

> Countdown: var `{{countdown_hari/jam/menit/detik}}` di-render host menjadi `<span>` ber-ID
> (`#tm-countdown-days` dst.) yang **di-update host tiap detik**. Jangan menimpa innerHTML
> container itu lewat RAF game, dan jangan parse var countdown sebagai angka mentah.

---

## J.5 CANVAS RESIZE / DPR / SCALE — anti blur & anti black-bar (jalur CANVAS)

> Bagian ini spesifik untuk tema **canvas murni** seperti retromario. Tema **Phaser 3**
> menangani DPR/scale lewat `Phaser.Scale` & config-nya — ikuti skill `game-invitation-theme`,
> tapi tetap waspadai jebakan ukuran-0 (lihat memory `game-phaser-theme`).

APPENDIX H mengatur layout makro; ini detail kanvasnya (retromario `resize()` `index.js`):
- **Lebar dikunci** ke kolom virtual (`BASE_VIS_COLS*TILE`); **tinggi tumbuh** mengikuti device
  → tidak ada black-bar.
- **DPR di-cap** (`Math.min(devicePixelRatio, 3)`) → backing store = CSS px × dpr; lebih dari 3
  membakar fill-rate tanpa manfaat visual.
- `ctx.setTransform(...)` agar kode draw tetap pakai koordinat **virtual** (tak peduli dpr).
- `imageSmoothingEnabled = false` → pixel-art tajam (tanpa ini, upscale jadi blur).
- **`BOTTOM_SAFE`** (~7 tile) hanya pada **touch device** (dideteksi via
  `matchMedia('(min-width:900px) and (hover:hover) and (pointer:fine)')`, **bukan** lebar saja)
  → permukaan tanah dinaikkan agar joystick/tombol sentuh tak menutupi karakter.

> Pakai `getBoundingClientRect()` untuk mengukur parent; **jangan** baca `scale.width/height`
> saat init (bisa `0` → objek off-screen → blank canvas). Daftarkan resize listener via
> `onCleanup` (J.1).

---

## J.6 HOST-FEATURE YANG BISA MEMBAJAK KLIK GAME (hindari bentrok)

- **Lightbox galeri:** host meng-intercept klik pada `.gallery-item`, `.lightbox-injection`,
  dan **semua `<img>`** di dalam `#gallery`/`#sec-gallery`/`.gallery-container`. Jangan pakai
  class/ID itu untuk elemen game; pakai class berbeda (mis. `rm-…`) untuk lightbox sendiri.
- **Anchor hash:** host meng-intercept `<a href="#…">` global (smooth-scroll). Jangan bungkus
  tombol game dengan `<a href="#…">` — kliknya bisa ditelan host.
- **Menu:** `#btn-show-menu` hanya aktif bila host meng-enable-nya, dan isinya di-scan dari
  `<section data-menu-label>` **sekali** setelah undangan dibuka. Kalau mau pakai menu host,
  pastikan section sudah ada saat reveal.

---

## J.7 PERSIST / STORAGE

- Satu key versioned (retromario: `STORE_KEY = 'rm_wedding_state_v1'`). Bump versi bila skema
  berubah agar save lama tidak merusak.
- Di-persist: `unlocked`, `bestScore`, `seenInfo`, `bestStage`, `completed`, `announcedAll`,
  `gameDiff`, `muted`. **TIDAK** di-persist: `player.cheat` (APPENDIX F.4).
- Bungkus akses `localStorage` dengan `try/catch` (mode privat bisa melempar).
- Catatan multi-tamu: state menempel di **device**, tidak ter-namespace per-guest — sadari ini
  saat satu HP dipakai banyak tamu (reset progress = jalan keluar, APPENDIX F.5).

---

## J.8 CHECKLIST FONDASI TEKNIS (lewati satu pun → kemungkinan besar BUG)

- [ ] **Cleanup hook global** dipanggil di awal IIFE + `onCleanup` untuk SEMUA RAF/listener/
      interval/audio (J.1). Diuji: submit ucapan saat main **tidak** menggandakan loop.
- [ ] Data dibaca via `val()`/`data-var` dari **teks rendered**, bukan atribut; nama var
      diverifikasi ke `dynamic-variables.md` (J.2.2).
- [ ] `{{#if flag}}` **membungkus** `<section data-info>` — bukan isinya (J.2.3).
- [ ] Musik: tidak `audio.play()` backsound; mirror **idempotent** via `#btn-toggle-music` +
      `#bg-music` (J.3).
- [ ] RSVP/ucapan/hadiah: panggil `window.submitRsvp/submitUcapan` + fallback; ID host
      **verbatim** (J.4).
- [ ] Canvas: DPR di-cap, `imageSmoothingEnabled=false`, ukur via `getBoundingClientRect`,
      `BOTTOM_SAFE` pada touch (J.5).
- [ ] Tidak memakai class/ID host yang dibajak (`.gallery-item`, `#gallery`, `<a href="#">`) (J.6).
- [ ] `localStorage` versioned + `try/catch`; `player.cheat` tidak di-persist (J.7).
- [ ] `showError()` on-screen agar "engine gagal load" bisa dibedakan dari "bug logic".
- [ ] Diverifikasi via paste ke Theme Editor host / harness `loop()` asli — **bukan** screenshot
      headless (selalu blank di mesin ini).

It Runs in the Host, Not in a Vacuum

---

# END OF SYSTEM
