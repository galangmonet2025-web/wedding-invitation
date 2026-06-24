# CONTRA CLONE

## Game Development Bible

### Phaser 3 Edition

Version: 1.0

---

# 1. OVERVIEW

## 1.1 Tujuan Project

Membuat game side scrolling shooter bergaya Contra Classic menggunakan:

* HTML5
* CSS3
* JavaScript ES6+
* Phaser 3
* Tiled Map Editor
* Web Audio API
* Asset berbasis Sprite Sheet

Target:

* Desktop
* Mobile Browser
* PWA (opsional)

---

# 2. CORE GAMEPLAY

Player mengendalikan karakter tentara.

Misi utama:

* Berjalan
* Melompat
* Merunduk / tiarap
* Menembak
* Menghindari peluru musuh
* Mengalahkan boss
* Menyelesaikan stage

Gameplay Loop:

Spawn
↓
Berjalan
↓
Lawan Musuh
↓
Dapatkan Power Up
↓
Mini Boss
↓
Boss
↓
Stage Clear
↓
Next Stage

---

# 3. GAME FEATURES

## MVP (Minimal Viable Product)

### Player

* Idle
* Walk
* Walk
* Run
* Jump
* prone
* Shoot
* Die

### Weapon

* Normal Gun

### Enemy

* Soldier
* Turret

### Stage

* Stage 1 Jungle

### Boss

* Alien Core

### UI

* Score
* Lives
* Weapon
* Pause

---

# 4. PROJECT STRUCTURE

src/

```text
src
│
├── index.html
│
├── assets
│   ├── images
│   ├── sprites
│   ├── audio
│   ├── maps
│   └── ui
│
├── scenes
│   ├── BootScene.js
│   ├── PreloadScene.js
│   ├── MenuScene.js
│   ├── Stage1Scene.js
│   ├── UIScene.js
│   ├── PauseScene.js
│   └── GameOverScene.js
│
├── entities
│   ├── Player.js
│   ├── Enemy.js
│   ├── Bullet.js
│   ├── Turret.js
│   ├── Boss.js
│   └── Powerup.js
│
├── managers
│   ├── AudioManager.js
│   ├── EnemyManager.js
│   ├── BulletManager.js
│   ├── SaveManager.js
│   └── StageManager.js
│
├── systems
│   ├── CollisionSystem.js
│   ├── SpawnSystem.js
│   └── CameraSystem.js
│
├── config
│   └── gameConfig.js
│
└── main.js
```

---

# 5. GAME CONFIG

## Resolution

Internal Resolution

```javascript
960 x 540
```

Scale Mode

```javascript
FIT
CENTER_BOTH
```

---

# 6. PHASER CONFIG

main.js

```javascript
const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 1000
            },
            debug: false
        }
    },
    scene: [
        BootScene,
        PreloadScene,
        MenuScene,
        Stage1Scene
    ]
};
```

---

# 7. GAME STATES

## Global State

```javascript
{
    score: 0,
    lives: 3,
    stage: 1,
    weapon: "normal",
    ammo: Infinity,
    gameOver: false
}
```

---

# 8. SCENE FLOW

Boot
↓
Preload
↓
Main Menu
↓
Stage 1
↓
Boss
↓
Stage Clear
↓
Stage 2
↓
Boss
↓
Game Complete

---

# 9. CAMERA SYSTEM

Contra menggunakan kamera horizontal.

Rules:

* Kamera mengikuti player
* Tidak bergerak ke kiri
* Tidak keluar map
* Smooth Follow

```javascript
camera.startFollow(player);
```

Dead Zone

```javascript
300 px
```

---

# 10. WORLD SYSTEM

Stage dibangun menggunakan:

Tiled Map Editor

Layer:

* Background
* Decoration
* Ground
* Platform
* Enemy Spawn
* Item Spawn
* Collision

---

# 11. PLAYER CONTROLS

Desktop

Move Left

```text
A
←
```

Move Right

```text
D
→
```

Jump

```text
SPACE
W
↑
```

Shoot

```text
J
CTRL
```

---

# 12. MOBILE CONTROLS

Left Button

Move Left

Right Button

Move Right

Jump Button

Jump

Fire Button

Shoot

Gunakan virtual joystick atau fixed button.

---

# 13. PLAYER DATA MODEL

```javascript
{
    hp: 1,
    lives: 3,
    weapon: "normal",
    invincible: false,
    invincibleTime: 0
}
```

Karena Contra klasik menggunakan sistem one-hit death, HP default = 1.

```
```
# CONTRA CLONE

# BAGIAN 2

## PLAYER SYSTEM, WEAPON SYSTEM, ANIMATION SYSTEM, STATE MACHINE, PHYSICS ARCHITECTURE

---

# 14. PLAYER ARCHITECTURE

## Filosofi

Player jangan dibuat langsung di dalam Scene.

Salah:

```javascript
const player = this.physics.add.sprite(...)
```

untuk seluruh logic.

Benar:

```javascript
class Player extends Phaser.Physics.Arcade.Sprite
```

karena:

* reusable
* mudah maintenance
* mudah menambah weapon
* mudah menambah animation
* mudah menambah state

---

# 15. PLAYER CLASS STRUCTURE

```javascript
class Player extends Phaser.Physics.Arcade.Sprite
{
    constructor(scene,x,y)
    {
        super(scene,x,y,'player');

        this.hp = 1;
        this.lives = 3;

        this.direction = 1;

        this.state = 'idle';

        this.currentWeapon = null;

        this.isJumping = false;
        this.isDead = false;
        this.isInvincible = false;

        this.speed = 220;
        this.jumpForce = -500;
    }
}
```

---

# 16. PLAYER COMPONENTS

Player terdiri dari beberapa subsystem.

```text
Player
│
├── Movement
├── Animation
├── Weapon
├── Damage
├── State Machine
├── Input
└── Effects
```

---

# 17. PLAYER MOVEMENT SYSTEM

Contra memiliki movement sederhana.

## Horizontal

```javascript
velocityX
```

## Vertical

```javascript
velocityY
```

menggunakan gravity arcade physics.

---

# 18. MOVEMENT VALUES

Default

```javascript
speed = 220
```

Jump

```javascript
jumpForce = -500
```

Gravity

```javascript
1000
```

Maximum Fall Speed

```javascript
800
```

---

# 19. INPUT SYSTEM

Input tidak boleh langsung dibaca di Scene.

Buat InputManager.

```javascript
InputManager
```

Tugas:

* keyboard
* gamepad
* touch mobile

---

# 20. INPUT MODEL

```javascript
{
 left:false,
 right:false,
 jump:false,
 fire:false
}
```

Player hanya membaca model ini.

---

# 21. PLAYER DIRECTION

```javascript
1 = right

-1 = left
```

ketika menghadap kiri:

```javascript
setFlipX(true)
```

ketika kanan:

```javascript
setFlipX(false)
```

---

# 22. MOVEMENT UPDATE

```javascript
if(left)
{
    velocityX = -speed;
}

if(right)
{
    velocityX = speed;
}
```

---

# 23. JUMP SYSTEM

Hanya boleh jump jika menyentuh tanah.

```javascript
body.blocked.down
```

---

# 24. DOUBLE JUMP

Untuk Contra Classic

```javascript
TIDAK ADA
```

---

# 25. COYOTE TIME

Opsional.

Memberikan toleransi:

```text
100 ms
```

setelah meninggalkan platform.

Membuat game terasa lebih nyaman.

---

# 26. DAMAGE SYSTEM

Contra menggunakan:

```text
One Hit Death
```

Ketika terkena:

* peluru
* musuh
* ledakan

langsung mati.

---

# 27. INVINCIBILITY

Setelah respawn:

```text
2 detik
```

kebal.

Animasi:

```text
Blink
Blink
Blink
```

---

# 28. RESPAWN SYSTEM

Flow:

```text
Death
↓
Explosion
↓
Lose Life
↓
Respawn
↓
Invincible
```

---

# 29. PLAYER STATES

Gunakan finite state machine.

---

# 30. STATE LIST

```javascript
IDLE
RUN
JUMP
FALL
SHOOT
HURT
DEAD
```

---

# 31. STATE DIAGRAM

```text
IDLE
│
├── RUN
│
├── JUMP
│
└── SHOOT

JUMP
│
└── FALL

FALL
│
└── IDLE

ANY
│
└── DEAD
```

---

# 32. STATE MACHINE CLASS

```javascript
class StateMachine
{
    changeState(newState)
    {
    }

    update()
    {
    }
}
```

---

# 33. IDLE STATE

Masuk ketika:

```javascript
velocityX === 0
```

Animasi:

```javascript
player_idle
```

---

# 34. RUN STATE

Masuk ketika:

```javascript
velocityX !== 0
```

Animasi:

```javascript
player_run
```

---

# 35. JUMP STATE

Masuk ketika:

```javascript
velocityY < 0
```

Animasi:

```javascript
player_jump
```

---

# 36. FALL STATE

Masuk ketika:

```javascript
velocityY > 0
```

Animasi:

```javascript
player_fall
```

---

# 37. DEAD STATE

Semua input dimatikan.

```javascript
disableInput()
```

---

# 38. WEAPON SYSTEM OVERVIEW

Weapon harus modular.

Jangan:

```javascript
if weapon == machinegun
```

dimana-mana.

---

# 39. WEAPON BASE CLASS

```javascript
class Weapon
{
    fire()
    {
    }

    update()
    {
    }
}
```

---

# 40. WEAPON INHERITANCE

```text
Weapon
│
├── NormalGun
├── MachineGun
├── SpreadGun
├── Laser
└── FlameGun
```

---

# 41. CONTRA WEAPONS

## Default

Normal Gun

## Power Up

Machine Gun

## Power Up

Spread Gun

## Power Up

Laser

## Power Up

Flame

---

# 42. NORMAL GUN

Fire Rate

```text
250 ms
```

Damage

```text
1
```

Peluru:

```text
1
```

---

# 43. MACHINE GUN

Fire Rate

```text
75 ms
```

Damage

```text
1
```

---

# 44. SPREAD GUN

Jumlah Peluru

```text
5
```

Sudut

```text
-30
-15
0
15
30
```

Weapon paling kuat.

---

# 45. LASER

Peluru menembus musuh.

```text
Piercing
```

---

# 46. FLAME

Jarak pendek.

Damage tinggi.

---

# 47. BULLET ARCHITECTURE

```javascript
Bullet
```

memiliki:

```javascript
speed
damage
direction
lifespan
```

---

# 48. BULLET POOLING

WAJIB.

Jangan create destroy terus menerus.

Gunakan:

```javascript
physics.add.group()
```

---

# 49. OBJECT POOL

```javascript
BulletPool
```

fungsi:

```javascript
get()
release()
```

---

# 50. BULLET SETTINGS

Default

```javascript
speed = 700
```

Lifespan

```javascript
1000 ms
```

---

# 51. BULLET COLLISION

Bullet

VS

Enemy

↓

Damage

↓

Destroy Bullet

---

# 52. FIRE RATE SYSTEM

Gunakan cooldown.

```javascript
lastFireTime
```

```javascript
currentTime
```

---

# 53. FIRE CONTROL

```javascript
if(time > nextFire)
{
 fire();
}
```

---

# 54. ANIMATION SYSTEM

Semua animasi dibuat di AnimationManager.

Jangan di Player.

---

# 55. ANIMATION LIST

```text
player_idle
player_run
player_jump
player_fall
player_shoot
player_die
```

---

# 56. PLAYER SPRITESHEET

Ideal:

```text
Idle      4 frame
Run       8 frame
Jump      1 frame
Fall      1 frame
Shoot     2 frame
Death     6 frame
```

---

# 57. FPS ANIMATION

Idle

```text
8 fps
```

Run

```text
12 fps
```

Shoot

```text
15 fps
```

Death

```text
10 fps
```

---

# 58. PHYSICS ARCHITECTURE

Gunakan:

```javascript
Arcade Physics
```

Bukan MatterJS.

Karena:

* lebih ringan
* lebih cepat
* cocok untuk Contra

---

# 59. COLLISION GROUPS

```text
Player

Enemy

Bullet

EnemyBullet

Ground

PowerUp

Boss
```

---

# 60. COLLISION MATRIX

Player ↔ Ground

Player ↔ Enemy

Player ↔ EnemyBullet

Bullet ↔ Enemy

Bullet ↔ Boss

PowerUp ↔ Player

---

# 61. PERFORMANCE TARGET

Desktop

```text
60 FPS
```

Mobile

```text
60 FPS
```

Minimum

```text
30 FPS
```

---

# 62. UPDATE ORDER

Frame Loop

```text
Input
↓
State
↓
Movement
↓
Weapon
↓
Animation
↓
Collision
↓
Camera
↓
UI
```

Urutan ini wajib dijaga agar gameplay stabil.

END OF PART 2

```
```
# CONTRA CLONE

# BAGIAN 3

## ENEMY AI, SPAWN SYSTEM, BOSS SYSTEM, POWERUP SYSTEM, STAGE DESIGN

---

# 63. ENEMY SYSTEM OVERVIEW

Musuh tidak boleh dibuat secara hardcode di Scene.

Salah:

```javascript
this.physics.add.sprite(...)
```

untuk setiap musuh.

Benar:

```javascript
EnemyManager
```

yang bertugas:

* Spawn
* Update
* Destroy
* Pooling
* Difficulty Scaling

---

# 64. ENEMY CLASS HIERARCHY

```text
Enemy
│
├── Soldier
├── Turret
├── Sniper
├── FlyingDrone
├── HeavySoldier
└── Boss
```

---

# 65. BASE ENEMY CLASS

```javascript
class Enemy extends Phaser.Physics.Arcade.Sprite
{
    constructor()
    {
        super();

        this.hp = 1;
        this.damage = 1;
        this.score = 100;

        this.state = "idle";
    }
}
```

---

# 66. ENEMY STATES

```text
IDLE

PATROL

CHASE

ATTACK

HIT

DEAD
```

---

# 67. SOLDIER ENEMY

Contra paling sering memakai musuh jenis ini.

Kemampuan:

* Berjalan
* Menembak
* Melompat dari platform

HP:

```text
1
```

Damage:

```text
1
```

---

# 68. SOLDIER AI FLOW

```text
SPAWN
↓
RUN
↓
STOP
↓
SHOOT
↓
RUN
↓
DEAD
```

---

# 69. SOLDIER VALUES

```javascript
speed = 80

fireRate = 1500

hp = 1
```

---

# 70. TURRET ENEMY

Tidak bergerak.

Hanya menembak.

---

# 71. TURRET AI

```text
Detect Player
↓
Aim
↓
Shoot
↓
Cooldown
↓
Repeat
```

---

# 72. TURRET VALUES

```javascript
hp = 2

fireRate = 1200

rotationSpeed = 90
```

---

# 73. FLYING DRONE

Terbang.

Tidak terkena collision ground.

---

# 74. DRONE MOVEMENT

Gunakan:

```javascript
Phaser.Math.SinCosTable
```

atau

```javascript
Math.sin()
```

untuk pola terbang.

---

# 75. DRONE ATTACK

```text
Fly
↓
Dive
↓
Shoot
↓
Retreat
```

---

# 76. HEAVY SOLDIER

Mini tank berjalan.

---

# 77. HEAVY SOLDIER STATS

```javascript
hp = 10

speed = 40

damage = 1
```

---

# 78. ENEMY BULLET SYSTEM

Pisahkan dari Player Bullet.

```javascript
EnemyBulletPool
```

---

# 79. ENEMY BULLET DATA

```javascript
{
 speed: 250,
 damage: 1,
 lifespan: 3000
}
```

---

# 80. ENEMY MANAGER

Tugas:

```text
Spawn Enemy

Recycle Enemy

Destroy Enemy

Update Enemy
```

---

# 81. ENEMY POOLING

WAJIB.

```javascript
this.enemyGroup =
this.physics.add.group()
```

---

# 82. OBJECT POOLING TARGET

Pool:

```text
Enemy

Bullet

Explosion

Powerup

Particle
```

---

# 83. SPAWN SYSTEM

Contra tidak spawn seluruh musuh sekaligus.

Musuh muncul ketika kamera mencapai titik tertentu.

---

# 84. SPAWN TRIGGER

Gunakan:

```javascript
camera.scrollX
```

---

# 85. EXAMPLE SPAWN

```javascript
if(cameraX > 1000)
{
 spawnSoldier();
}
```

---

# 86. SPAWN ZONE

Pada Tiled:

```text
EnemySpawnLayer
```

---

# 87. ENEMY SPAWN DATA

```json
{
 "type":"soldier",
 "x":1200,
 "y":400
}
```

---

# 88. ENEMY WAVE

Contoh:

```text
Wave 1

3 Soldier

2 Turret

Wave 2

5 Soldier

1 Drone
```

---

# 89. DIFFICULTY CURVE

Awal:

```text
Sedikit musuh
```

Tengah:

```text
Lebih banyak peluru
```

Akhir:

```text
Mini Boss
```

---

# 90. BOSS SYSTEM OVERVIEW

Boss adalah gameplay climax.

Boss wajib memiliki:

* Multiple Phase
* Weak Point
* Pattern Attack

---

# 91. BOSS CLASS

```javascript
class Boss extends Enemy
{
}
```

---

# 92. BOSS STATES

```text
INTRO

PHASE1

PHASE2

PHASE3

DEAD
```

---

# 93. BOSS PHASE FLOW

```text
100% HP
↓
Phase 1

70% HP
↓
Phase 2

30% HP
↓
Phase 3
```

---

# 94. CONTRA STAGE 1 BOSS

Alien Heart

---

# 95. ALIEN HEART STATS

```javascript
hp = 100
```

---

# 96. ATTACK PATTERN A

```text
Shoot 3 Bullets
```

---

# 97. ATTACK PATTERN B

```text
Spawn Minions
```

---

# 98. ATTACK PATTERN C

```text
Laser Beam
```

---

# 99. BOSS INTRO

Sebelum bertarung:

```text
Lock Camera

Play Animation

Show Boss
```

---

# 100. BOSS ARENA

Saat boss muncul:

```javascript
camera.stopFollow()
```

---

# 101. POWERUP SYSTEM

Powerup adalah identitas Contra.

---

# 102. POWERUP TYPES

```text
M

Machine Gun

S

Spread Gun

L

Laser

F

Flame

R

Rapid Fire
```

---

# 103. POWERUP DROP

Drop Chance

```text
20%
```

---

# 104. POWERUP CLASS

```javascript
class Powerup
{
}
```

---

# 105. POWERUP FLOW

```text
Enemy Die
↓
Drop Powerup
↓
Player Collect
↓
Upgrade Weapon
```

---

# 106. STAGE DESIGN PHILOSOPHY

Contra bukan platformer eksplorasi.

Contra adalah:

```text
Action Forward
```

Player selalu maju.

---

# 107. STAGE STRUCTURE

```text
Start
↓
Tutorial
↓
Combat
↓
Platform
↓
Combat
↓
Mini Boss
↓
Combat
↓
Boss
```

---

# 108. CHECKPOINT SYSTEM

Checkpoint setiap:

```text
30-45 detik gameplay
```

---

# 109. CHECKPOINT DATA

```javascript
{
 x:3200,
 y:500
}
```

---

# 110. STAGE LENGTH

Ideal:

```text
4 - 6 menit
```

---

# 111. PLAYER SCREEN RULE

Player tidak boleh terlalu jauh dari kamera.

---

# 112. CAMERA LIMIT

```javascript
leftLimit = 100

rightLimit = 400
```

---

# 113. CAMERA SHAKE

Dipakai ketika:

```text
Boss Hit

Explosion

Death
```

---

# 114. CAMERA SHAKE VALUES

```javascript
duration = 150

intensity = 0.01
```

---

# 115. CAMERA FLASH

Dipakai saat:

```text
Boss Dead
```

---

# 116. STAGE CLEAR FLOW

```text
Boss Dead
↓
Explosion
↓
Score Count
↓
Stage Clear
↓
Next Stage
```

---

# 117. SCORE SYSTEM

Soldier

```text
100
```

Turret

```text
200
```

Drone

```text
300
```

Boss

```text
5000
```

---

# 118. COMBO SYSTEM

Tidak perlu.

Contra klasik tidak memakai combo.

---

# 119. GAME OVER FLOW

```text
Lives = 0
↓
Game Over
↓
Continue?
```

---

# 120. CONTINUE SYSTEM

```text
YES
NO
```

Jika YES:

Respawn dari checkpoint terakhir.

END OF PART 3

```
```
# CONTRA CLONE

# BAGIAN 4

## TILEMAP, PARALLAX, UI, AUDIO, MOBILE, SAVE SYSTEM, OPTIMIZATION

---

# 121. TILEMAP ARCHITECTURE

## Tujuan

Memisahkan level design dari source code.

Designer cukup mengubah map.

Programmer tidak perlu mengubah kode.

---

# 122. TOOLS

Gunakan:

```text
Tiled Map Editor
```

Format:

```text
JSON
```

---

# 123. MAP STRUCTURE

```text
Map
│
├── Background
├── Decoration
├── Ground
├── Platform
├── Collision
├── EnemySpawn
├── ItemSpawn
├── Checkpoint
└── BossTrigger
```

---

# 124. TILE SIZE

Rekomendasi:

```text
32 x 32
```

atau

```text
16 x 16
```

untuk gaya Contra klasik.

---

# 125. WORLD SIZE

Stage 1:

```text
8000 px
```

sampai

```text
12000 px
```

panjang level.

---

# 126. TILESET RULES

Pisahkan tileset:

```text
terrain.png

objects.png

decorations.png
```

Jangan jadikan satu file raksasa.

---

# 127. COLLISION LAYER

Layer collision harus invisible.

```javascript
collisionLayer.visible = false;
```

---

# 128. COLLISION PROPERTY

Di Tiled:

```text
collides = true
```

---

# 129. TILEMAP LOADING

```javascript
const map =
this.make.tilemap({
 key:'stage1'
});
```

---

# 130. COLLISION SETUP

```javascript
collisionLayer
.setCollisionByProperty({
 collides:true
});
```

---

# 131. CHECKPOINT LAYER

Object Layer:

```text
Checkpoint
```

---

# 132. CHECKPOINT DATA

```json
{
 "name":"cp_01",
 "x":2500,
 "y":420
}
```

---

# 133. ENEMY SPAWN LAYER

Object Layer:

```text
EnemySpawn
```

---

# 134. ENEMY OBJECT DATA

```json
{
 "type":"soldier",
 "x":1000,
 "y":500
}
```

---

# 135. BOSS TRIGGER

Object Layer:

```text
BossTrigger
```

---

# 136. PARALLAX BACKGROUND

Contra sangat bergantung pada efek kedalaman.

Gunakan multi layer.

---

# 137. PARALLAX STRUCTURE

```text
Sky

Mountains

Trees

Bushes

Foreground
```

---

# 138. PARALLAX SPEED

```javascript
Sky        0.05

Mountain   0.15

Trees      0.30

Bushes     0.50
```

---

# 139. PARALLAX UPDATE

```javascript
layer.x =
camera.scrollX * factor;
```

---

# 140. BACKGROUND OPTIMIZATION

Gunakan:

```text
TileSprite
```

bukan sprite biasa.

---

# 141. INFINITE BACKGROUND

```javascript
this.add.tileSprite(...)
```

---

# 142. EXPLOSION SYSTEM

Explosion digunakan pada:

```text
Enemy Dead

Boss Dead

Barrel Explode

Player Dead
```

---

# 143. EXPLOSION POOL

WAJIB.

```javascript
ExplosionPool
```

---

# 144. EXPLOSION TYPES

```text
Small

Medium

Large

Boss
```

---

# 145. PARTICLE SYSTEM

Gunakan seperlunya.

---

# 146. PARTICLE EVENTS

```text
Gun Fire

Hit Effect

Explosion

Boss Attack
```

---

# 147. PARTICLE LIMIT

Maksimal:

```text
100
```

partikel aktif.

---

# 148. AUDIO ARCHITECTURE

Audio harus dipusatkan.

---

# 149. AUDIO MANAGER

```javascript
AudioManager
```

bertugas:

```text
Music

SFX

Volume

Mute

Pause
```

---

# 150. AUDIO CATEGORIES

```text
BGM

SFX

Voice
```

---

# 151. MUSIC LIST

```text
Menu Theme

Stage Theme

Boss Theme

Game Over
```

---

# 152. SFX LIST

```text
Shoot

Explosion

Jump

Hit

Powerup

Boss Attack
```

---

# 153. AUDIO FORMAT

Gunakan:

```text
ogg
```

utama.

Cadangan:

```text
mp3
```

---

# 154. AUDIO PRELOAD

Semua audio preload di awal.

---

# 155. AUDIO CHANNEL LIMIT

SFX simultan:

```text
16 channel
```

maksimal.

---

# 156. MOBILE CONTROL SYSTEM

Target utama:

```text
Android

iOS
```

---

# 157. MOBILE BUTTONS

```text
LEFT

RIGHT

JUMP

FIRE
```

---

# 158. MOBILE LAYOUT

```text
LEFT SIDE

← →

RIGHT SIDE

JUMP FIRE
```

---

# 159. TOUCH SIZE

Minimal:

```text
80 x 80
```

---

# 160. SAFE AREA

Jangan menempel ke tepi layar.

Margin:

```text
20 px
```

---

# 161. TOUCH INPUT MANAGER

Pisahkan dari keyboard.

---

# 162. INPUT ABSTRACTION

Player tidak tahu sumber input.

Bisa:

```text
Keyboard

Gamepad

Touch
```

semua menghasilkan object input yang sama.

---

# 163. UI ARCHITECTURE

UI berada di scene terpisah.

```text
UIScene
```

---

# 164. UI COMPONENTS

```text
Lives

Score

Weapon

Pause
```

---

# 165. UI UPDATE

Gunakan event.

Jangan polling setiap frame.

---

# 166. EVENT EXAMPLE

```javascript
events.emit(
 'scoreChanged'
);
```

---

# 167. SCORE UI

Format:

```text
00000000
```

8 digit.

---

# 168. LIVES UI

Format:

```text
x3
```

---

# 169. WEAPON UI

Format:

```text
M

S

L

F
```

---

# 170. PAUSE SYSTEM

Pause harus menghentikan:

```text
Enemy

Bullet

Physics

Animation
```

---

# 171. SAVE SYSTEM

Gunakan:

```javascript
localStorage
```

---

# 172. SAVE DATA

```javascript
{
 stage:1,
 score:2000,
 lives:3,
 weapon:'S'
}
```

---

# 173. SAVE MANAGER

```javascript
SaveManager
```

---

# 174. AUTO SAVE

Saat:

```text
Checkpoint

Stage Clear
```

---

# 175. PERFORMANCE TARGET

Desktop

```text
60 FPS
```

Mobile

```text
60 FPS
```

Minimum

```text
30 FPS
```

---

# 176. OPTIMIZATION RULES

Jangan:

```javascript
new Bullet()
```

setiap menembak.

Gunakan pool.

---

# 177. OBJECT POOL TARGET

```text
Bullet

Enemy

Explosion

Particle

Powerup
```

---

# 178. UPDATE CULLING

Enemy di luar layar:

```javascript
setActive(false)
```

---

# 179. RENDER CULLING

Objek jauh dari kamera:

```javascript
setVisible(false)
```

---

# 180. DISTANCE CHECK

```javascript
distance > 1500
```

matikan update.

---

# 181. TEXTURE LIMIT

Ideal:

```text
2048x2048
```

maksimum per atlas.

---

# 182. SPRITESHEET RULE

Pisahkan:

```text
Player

Enemy

Boss

Effects
```

---

# 183. MEMORY TARGET

Mobile:

```text
< 150 MB
```

---

# 184. BUILD STRUCTURE

```text
production

development
```

---

# 185. ENVIRONMENT

```text
DEV

STAGING

PRODUCTION
```

---

# 186. PWA SUPPORT

Tambahkan:

```text
manifest.json
```

---

# 187. SERVICE WORKER

Cache:

```text
JS

CSS

Sprites

Audio
```

---

# 188. OFFLINE PLAY

Game harus bisa dimainkan offline.

---

# 189. APK PACKAGING

Gunakan:

```text
Capacitor
```

atau

```text
Cordova
```

---

# 190. ANDROID SETTINGS

Landscape Only.

---

# 191. TARGET FPS

```text
60
```

---

# 192. TARGET DEVICES

```text
Android 10+

iOS 15+
```

---

# 193. RELEASE CHECKLIST

```text
✓ No Memory Leak

✓ No Duplicate Audio

✓ No Missing Asset

✓ 60 FPS

✓ Touch Tested

✓ Boss Tested

✓ Save Tested
```

---

# 194. QA CHECKLIST

```text
Player Movement

Jump

Shoot

Enemy Spawn

Boss Fight

Powerup

Checkpoint

Game Over

Continue
```

---

# 195. MVP DEFINITION

Versi 1.0 dianggap selesai jika:

```text
1 Stage

4 Enemy

1 Boss

4 Weapon

Save System

Mobile Control
```

sudah berjalan stabil.

END OF PART 4

```
```
# CONTRA CLONE

# BAGIAN 5

## PRODUCTION ARCHITECTURE

## DATA DRIVEN DESIGN

## SCALABLE PROJECT STRUCTURE

---

# 196. PHILOSOPHY

Target project:

```text
Bukan Demo

Bukan Tutorial

Bukan Prototype

Tetapi:

Production Ready Game
```

---

# 197. DESIGN PRINCIPLES

Gunakan prinsip:

```text
Low Coupling

High Cohesion

Data Driven

Reusable

Modular
```

---

# 198. PROJECT LAYERS

```text
Game
│
├── Scene Layer
├── Entity Layer
├── System Layer
├── Manager Layer
├── Config Layer
└── Data Layer
```

---

# 199. RESPONSIBILITY

## Scene

Mengatur level.

## Entity

Objek game.

## System

Logic global.

## Manager

Koordinator.

## Config

Konfigurasi.

## Data

JSON.

---

# 200. FINAL PROJECT STRUCTURE

```text
src
│
├── core
│
├── scenes
│
├── entities
│
├── systems
│
├── managers
│
├── data
│
├── config
│
├── ui
│
├── effects
│
├── audio
│
├── utils
│
└── assets
```

---

# 201. CORE LAYER

Berisi fondasi game.

```text
core
│
├── GameManager
├── EventBus
├── StateMachine
├── ConfigManager
└── SaveManager
```

---

# 202. EVENT BUS

Semua komunikasi global lewat EventBus.

Jangan:

```javascript
player.score++;
ui.update();
```

langsung.

---

# 203. EVENT FLOW

Benar:

```javascript
EventBus.emit(
 "score:add",
 100
);
```

---

# 204. EVENT EXAMPLES

```text
score:add

player:dead

player:respawn

boss:start

boss:dead

weapon:change

checkpoint:reached
```

---

# 205. EVENT BUS CLASS

```javascript
class EventBus
{
}
```

---

# 206. SCENE COMMUNICATION

Jangan:

```javascript
sceneA.sceneB.score
```

---

# 207. SCENE COMMUNICATION FLOW

```text
StageScene

↓

EventBus

↓

UIScene
```

---

# 208. CONFIG DRIVEN DESIGN

Jangan hardcode.

---

# 209. BAD EXAMPLE

```javascript
player.speed = 220;
```

---

# 210. GOOD EXAMPLE

```javascript
player.speed =
CONFIG.PLAYER.SPEED;
```

---

# 211. CONFIG FILES

```text
config
│
├── playerConfig.js
├── enemyConfig.js
├── weaponConfig.js
├── stageConfig.js
└── uiConfig.js
```

---

# 212. PLAYER CONFIG

```javascript
export default {

 speed:220,

 jumpForce:-500,

 lives:3

};
```

---

# 213. DATA DRIVEN GAME

Semua data gameplay berasal dari JSON.

---

# 214. DATA FOLDER

```text
data
│
├── enemies.json
├── weapons.json
├── stages.json
├── bosses.json
└── powerups.json
```

---

# 215. WHY DATA DRIVEN

Menambah enemy baru tanpa coding.

---

# 216. ENEMY DATA

```json
{
 "id":"soldier",

 "hp":1,

 "speed":80,

 "damage":1
}
```

---

# 217. WEAPON DATA

```json
{
 "id":"machinegun",

 "damage":1,

 "fireRate":75,

 "speed":700
}
```

---

# 218. POWERUP DATA

```json
{
 "id":"spread",

 "weapon":"spreadgun"
}
```

---

# 219. STAGE DATA

```json
{
 "id":"stage1",

 "boss":"alien_heart",

 "music":"stage1_theme"
}
```

---

# 220. ENTITY FACTORY

Gunakan Factory.

Jangan:

```javascript
new Soldier()
```

dimana-mana.

---

# 221. ENTITY FACTORY

```javascript
EntityFactory.create(
 "soldier"
);
```

---

# 222. ENTITY FACTORY FLOW

```text
JSON

↓

Factory

↓

Entity
```

---

# 223. BENEFITS

Tambah enemy baru:

```text
Tambah JSON

Tambah Sprite

Selesai
```

---

# 224. RESOURCE MANAGER

Semua asset lewat satu manager.

---

# 225. RESOURCE MANAGER TASK

```text
Load

Unload

Cache

Preload
```

---

# 226. ASSET MANIFEST

```json
{
 "player":"player.png",
 "boss":"boss.png"
}
```

---

# 227. PRELOAD SYSTEM

Scene tidak preload manual.

---

# 228. FLOW

```text
Manifest

↓

ResourceManager

↓

PreloadScene
```

---

# 229. DEPENDENCY INJECTION

Manager jangan saling create.

---

# 230. BAD

```javascript
new AudioManager()
```

di setiap class.

---

# 231. GOOD

```javascript
game.audioManager
```

---

# 232. SINGLETONS

Boleh digunakan untuk:

```text
EventBus

GameManager

AudioManager
```

---

# 233. ECS LITE

Tidak perlu ECS penuh.

Gunakan ECS ringan.

---

# 234. ENTITY

```text
Player

Enemy

Bullet

Boss
```

---

# 235. COMPONENT

```text
Health

Weapon

Movement

Animation
```

---

# 236. SYSTEM

```text
DamageSystem

CollisionSystem

WeaponSystem
```

---

# 237. EXAMPLE

```text
Enemy
│
├── HealthComponent
├── WeaponComponent
└── AIComponent
```

---

# 238. DAMAGE SYSTEM

Tugas:

```text
Hit Detection

Apply Damage

Death
```

---

# 239. WEAPON SYSTEM

Tugas:

```text
Fire

Cooldown

Ammo
```

---

# 240. COLLISION SYSTEM

Tugas:

```text
Register

Check

Resolve
```

---

# 241. DEBUG MODE

Wajib ada.

---

# 242. DEBUG HOTKEY

```text
F1
```

---

# 243. DEBUG OPTIONS

```text
FPS

Hitbox

Spawn Point

Enemy State

Camera
```

---

# 244. DEBUG PANEL

```text
FPS:60

Enemy:12

Bullet:24

Memory:55MB
```

---

# 245. HITBOX VISUALIZER

```javascript
debug=true
```

---

# 246. GOD MODE

```text
F2
```

---

# 247. INFINITE LIVES

Debug only.

---

# 248. STAGE SKIP

```text
F3
```

---

# 249. BOSS TEST

```text
F4
```

langsung ke boss.

---

# 250. PERFORMANCE PANEL

```text
Objects

Pools

Memory

FPS
```

---

# 251. LOGGER

Gunakan:

```javascript
Logger.info()

Logger.warn()

Logger.error()
```

---

# 252. REPLAY SYSTEM (OPTIONAL)

Menyimpan input player.

---

# 253. REPLAY DATA

```json
{
 frame:120,
 left:true,
 fire:true
}
```

---

# 254. BENEFIT REPLAY

```text
Debug

Ghost Run

Speedrun
```

---

# 255. STAGE EDITOR PIPELINE

Designer menggunakan:

```text
Tiled
```

---

# 256. WORKFLOW

```text
Designer

↓

Tiled

↓

JSON

↓

Game
```

---

# 257. ENEMY PLACEMENT

Tidak boleh hardcode.

Semua dari map.

---

# 258. POWERUP PLACEMENT

Tidak boleh hardcode.

Semua dari map.

---

# 259. CHECKPOINT PLACEMENT

Tidak boleh hardcode.

Semua dari map.

---

# 260. BOSS PLACEMENT

Tidak boleh hardcode.

Semua dari map.

---

# 261. VERSIONING

Gunakan:

```text
Git
```

---

# 262. BRANCHES

```text
main

develop

feature/*
```

---

# 263. COMMIT FORMAT

```text
feat:

fix:

refactor:

chore:
```

---

# 264. RELEASE STRATEGY

```text
Alpha

Beta

Release Candidate

Production
```

---

# 265. MVP ROADMAP

Sprint 1

```text
Movement
Jump
Shoot
```

Sprint 2

```text
Enemy
Collision
Death
```

Sprint 3

```text
Boss
Powerup
```

Sprint 4

```text
UI
Save
Audio
```

Sprint 5

```text
Optimization
Mobile
Release
```

---

# 266. SUCCESS CRITERIA

Game dianggap sukses jika:

```text
60 FPS

No Memory Leak

Playable Mobile

Save Working

Boss Working

All Weapons Working

Stage Clear Working
```

---

# 267. FUTURE EXPANSION

Arsitektur ini harus mampu mendukung:

```text
5+ Stage

20+ Enemy

10+ Boss

Online Leaderboard

Achievements

Cloud Save
```

tanpa refactor besar.

END OF PART 5

```
```
# CONTRA CLONE

# BAGIAN 6

## IMPLEMENTASI PHASER 3 SINGLE FILE ARCHITECTURE

## HTML + CSS + JS PRODUCTION BASE

---

# 268. ARSITEKTUR FINAL (SINGLE FILE SYSTEM)

Karena constraint project:

```text id="a91k2x"
1 HTML
1 CSS
1 JS
CDN asset only
```

Maka arsitektur berubah menjadi:

```text id="p0m7qz"
MONOLITHIC GAME ARCHITECTURE
```

---

# 269. FILE STRUCTURE

```text id="k2x8nb"
index.html
style.css
game.js
```

---

# 270. ENGINE BASE

Menggunakan:

```text id="v9c3ld"
Phaser 3 (CDN)
```

Tanpa bundler:

* no webpack
* no vite
* no rollup

---

# 271. GAME INITIALIZATION FLOW

```text id="q7m1sz"
HTML Load
↓
Phaser Load
↓
BootScene
↓
GameScene
↓
Gameplay Loop
```

---

# 272. INDEX.HTML

```html id="x8p2da"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Contra Phaser 3</title>

  <link rel="stylesheet" href="style.css"/>

  <!-- Phaser CDN -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
</head>

<body>
  <div id="game-container"></div>
  <script src="game.js"></script>
</body>
</html>
```

---

# 273. STYLE.CSS (BASE LAYOUT)

```css id="c1m9qv"
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: black;
  height: 100%;
}

#game-container {
  width: 100vw;
  height: 100vh;
}
```

---

# 274. CDN ASSET STRATEGY

Semua asset di-load dari URL eksternal:

Contoh:

```text id="z3k8ld"
Phaser Labs CDN
GitHub Raw
Cloud Storage
```

---

# 275. ASSET LOADING RULE

```javascript id="t4n7xq"
this.load.image('player', 'URL');
this.load.image('enemy', 'URL');
this.load.image('bullet', 'URL');
```

---

# 276. BOOT SCENE

Tugas:

```text id="m8p2cv"
Load Asset
↓
Pindah ke GameScene
```

---

# 277. BOOTSCENE IMPLEMENTATION

```javascript id="w6k1pz"
class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('player',
      'https://labs.phaser.io/assets/sprites/phaser-dude.png'
    );

    this.load.image('bullet',
      'https://labs.phaser.io/assets/sprites/bullets/bullet7.png'
    );

    this.load.image('enemy',
      'https://labs.phaser.io/assets/sprites/enemy-bullet.png'
    );

    this.load.image('bg',
      'https://labs.phaser.io/assets/skies/space3.png'
    );
  }

  create() {
    this.scene.start('GameScene');
  }
}
```

---

# 278. GAME SCENE OVERVIEW

GameScene adalah:

```text id="b2x9ld"
CORE GAME LOOP
```

---

# 279. GAME OBJECTS

```text id="n7q3mk"
Player
Enemies
Bullets
Background
Input System
```

---

# 280. GAME CONFIG

```javascript id="h4k9cz"
const CONFIG = {
  width: 960,
  height: 540,
  gravity: 1000
};

const gameState = {
  score: 0,
  lives: 3,
  weapon: 'normal'
};
```

---

# 281. PHASER INIT CONFIG

```javascript id="d9m2xq"
const config = {
  type: Phaser.AUTO,
  width: CONFIG.width,
  height: CONFIG.height,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: CONFIG.gravity },
      debug: false
    }
  },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
```

---

# 282. PLAYER SYSTEM (BASE)

```javascript id="p3x8mc"
this.player = this.physics.add.sprite(100, 400, 'player');

this.player.setCollideWorldBounds(true);
this.player.speed = 220;
```

---

# 283. MOVEMENT SYSTEM

```javascript id="k8v1zd"
this.player.setVelocityX(0);

if (this.cursors.left.isDown) {
  this.player.setVelocityX(-this.player.speed);
}

if (this.cursors.right.isDown) {
  this.player.setVelocityX(this.player.speed);
}
```

---

# 284. JUMP SYSTEM

```javascript id="x1m7qp"
if (this.cursors.up.isDown &&
    this.player.body.blocked.down) {
  this.player.setVelocityY(-500);
}
```

---

# 285. SHOOT SYSTEM

```javascript id="q9n2xd"
if (Phaser.Input.Keyboard.JustDown(this.keys.shoot)) {
  this.shootBullet();
}
```

---

# 286. BULLET SYSTEM

```javascript id="z5k8lm"
shootBullet() {
  const bullet = this.physics.add.sprite(
    this.player.x + 20,
    this.player.y,
    'bullet'
  );

  bullet.setVelocityX(500);

  this.time.delayedCall(1000, () => {
    bullet.destroy();
  });
}
```

---

# 287. ENEMY SPAWN SYSTEM

```javascript id="v2c9qn"
spawnEnemy() {
  const enemy = this.physics.add.sprite(
    900,
    Phaser.Math.Between(200, 450),
    'enemy'
  );

  enemy.setVelocityX(-150);
}
```

---

# 288. SPAWN LOOP

```javascript id="l6x1zp"
this.time.addEvent({
  delay: 2000,
  loop: true,
  callback: this.spawnEnemy,
  callbackScope: this
});
```

---

# 289. COLLISION SYSTEM

```javascript id="m9q3zd"
this.physics.add.overlap(
  this.bullets,
  this.enemies,
  this.hitEnemy,
  null,
  this
);
```

---

# 290. ENEMY HIT LOGIC

```javascript id="c8k1xm"
hitEnemy(bullet, enemy) {
  bullet.destroy();
  enemy.destroy();

  gameState.score += 100;
}
```

---

# 291. PLAYER HIT LOGIC

```javascript id="r3p7ql"
hitPlayer(player, enemy) {
  enemy.destroy();

  gameState.lives--;

  if (gameState.lives <= 0) {
    this.scene.restart();
  }
}
```

---

# 292. BACKGROUND PARALLAX

```javascript id="t7x2mc"
this.bg = this.add.tileSprite(
  480, 270, 960, 540, 'bg'
);
```

---

# 293. BACKGROUND UPDATE

```javascript id="y1k9qp"
this.bg.tilePositionX += 2;
```

---

# 294. INPUT SYSTEM

```javascript id="n8m3zd"
this.cursors = this.input.keyboard.createCursorKeys();

this.keys = this.input.keyboard.addKeys({
  shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
});
```

---

# 295. GAME LOOP FLOW

```text id="k4q1lx"
Input
↓
Movement
↓
Physics
↓
Collision
↓
Render
```

---

# 296. CORE GAME LOOP RESULT

Game sudah memiliki:

```text id="v6m2zc"
Player movement

Jump

Shoot

Enemy spawn

Collision

Score

Lives

Restart system
```

---

# 297. LIMITASI ARSITEKTUR

Karena single file:

```text id="p8x7mq"
Tidak scalable untuk 10+ scene besar
```

---

# 298. KEUNTUNGAN ARSITEKTUR INI

```text id="d2k9xc"
Simple deploy

No build step

Cepat testing

Cocok prototyping

Cocok game jam
```

---

# 299. NEXT EVOLUTION PATH

Jika ingin upgrade:

```text id="x9c1lm"
Split Scene System

Factory Pattern

Data Driven Enemy

Weapon Upgrade System

Boss Phase System
```

---

# 300. STATUS PROJECT

Pada titik ini:

```text id="z7m4qp"
Playable Contra Prototype (MVP)
```

END OF PART 6

```
```
# CONTRA CLONE

# BAGIAN 7

## WEAPON SYSTEM ADVANCED (CONTRA AUTHENTIC ARSENAL)

## POWER-UP, FIRE RATE, PROJECTILE VARIANTS

---

# 301. WEAPON SYSTEM PHILOSOPHY

Weapon di Contra bukan sekadar “shoot”.

Tapi:

```text id="w1q9za"
Gameplay Identity System
```

Setiap weapon mengubah:

* fire rate
* projectile pattern
* damage behavior
* gameplay rhythm

---

# 302. WEAPON TYPES

```text id="k8m2xd"
NORMAL

MACHINE GUN

SPREAD GUN

LASER

FLAME
```

---

# 303. WEAPON STATE

```javascript id="p9x1mc"
gameState.weapon = "normal";
```

---

# 304. WEAPON CONFIG TABLE

```javascript id="c3m8qp"
const WEAPONS = {
  normal: {
    fireRate: 250,
    speed: 500,
    damage: 1,
    type: "single"
  },

  machinegun: {
    fireRate: 80,
    speed: 600,
    damage: 1,
    type: "rapid"
  },

  spread: {
    fireRate: 300,
    speed: 550,
    damage: 1,
    type: "multi"
  },

  laser: {
    fireRate: 400,
    speed: 900,
    damage: 2,
    type: "pierce"
  }
};
```

---

# 305. FIRE CONTROL CORE

```javascript id="v2k9zx"
this.lastFireTime = 0;
```

---

# 306. FIRE RATE SYSTEM

```javascript id="m7x3qp"
canFire(time) {
  return time > this.lastFireTime;
}
```

---

# 307. SHOOT ENTRY POINT

```javascript id="z9k2mc"
shoot(time) {
  const weapon = WEAPONS[gameState.weapon];

  if (time < this.lastFireTime + weapon.fireRate) return;

  this.lastFireTime = time;

  this.fireWeapon(weapon);
}
```

---

# 308. NORMAL SHOT

```javascript id="q1m8zd"
fireWeapon(weapon) {
  if (weapon.type === "single") {
    this.spawnBullet(0);
  }
}
```

---

# 309. BULLET SPAWN CORE

```javascript id="t6x9qp"
spawnBullet(angleOffset = 0) {
  const bullet = this.physics.add.sprite(
    this.player.x + 20,
    this.player.y,
    'bullet'
  );

  this.physics.velocityFromAngle(
    angleOffset,
    500,
    bullet.body.velocity
  );

  this.bullets.add(bullet);
}
```

---

# 310. MACHINE GUN BEHAVIOR

```text id="x4c9lm"
Rapid fire continuous
No recoil
Same projectile
```

Implementasi:

```javascript id="n8q2xp"
if (weapon.type === "rapid") {
  this.spawnBullet(0);
}
```

---

# 311. SPREAD GUN CORE

Spread Gun adalah signature Contra.

```text id="k2z8mc"
5 direction bullets
```

---

# 312. SPREAD PATTERN

```javascript id="p7m1xd"
const angles = [-30, -15, 0, 15, 30];

angles.forEach(a => this.spawnBullet(a));
```

---

# 313. LASER BEHAVIOR

```text id="c9x3qp"
Piercing
High damage
Low fire rate
```

---

# 314. LASER IMPLEMENTATION

```javascript id="v8m2zc"
spawnLaser() {
  const laser = this.physics.add.sprite(
    this.player.x + 20,
    this.player.y,
    'bullet'
  );

  laser.setVelocityX(900);
  laser.damage = 2;
  laser.piercing = true;

  this.bullets.add(laser);
}
```

---

# 315. FLAME WEAPON (ADVANCED)

```text id="m1x8qp"
Short range
Cone damage
Continuous hit
```

---

# 316. FLAME LOGIC

```javascript id="z2k9mc"
spawnFlame() {
  for (let i = 0; i < 3; i++) {
    this.spawnBullet(Phaser.Math.Between(-10, 10));
  }
}
```

---

# 317. WEAPON SWITCH SYSTEM

```javascript id="q8m3zd"
setWeapon(type) {
  gameState.weapon = type;
}
```

---

# 318. POWER-UP FLOW

```text id="x9c1qp"
Enemy Drop
↓
Player Collect
↓
Weapon Change
↓
UI Update
```

---

# 319. POWER-UP TYPES

```text id="k7m2xd"
MACHINE GUN

SPREAD

LASER

FLAME
```

---

# 320. POWER-UP DROP SYSTEM

```javascript id="p4x8mc"
dropPowerUp(x, y) {
  const types = ["machinegun", "spread", "laser"];

  const random = Phaser.Utils.Array.GetRandom(types);

  const item = this.physics.add.sprite(x, y, 'powerup');

  item.weaponType = random;
}
```

---

# 321. POWER-UP COLLISION

```javascript id="t8m1qp"
this.physics.add.overlap(
  this.player,
  this.powerups,
  this.collectPowerUp,
  null,
  this
);
```

---

# 322. COLLECT POWER-UP LOGIC

```javascript id="z6c9xd"
collectPowerUp(player, item) {
  gameState.weapon = item.weaponType;

  item.destroy();
}
```

---

# 323. WEAPON UI UPDATE EVENT

```javascript id="m9x2qp"
EventBus.emit("weapon:change", gameState.weapon);
```

---

# 324. UI WEAPON DISPLAY

```text id="c1k8zd"
M = Machine Gun
S = Spread
L = Laser
F = Flame
```

---

# 325. FIRE RATE BALANCING

```text id="x3m9qp"
Normal: balanced

Machine Gun: spam

Spread: high burst

Laser: slow but strong
```

---

# 326. GAME FEEL RULE

```text id="k9x1mc"
Weapon must feel different instantly
```

---

# 327. BULLET LIFETIME RULE

```javascript id="p7c2zd"
this.time.delayedCall(1200, () => {
  bullet.destroy();
});
```

---

# 328. PERFORMANCE RULE

```text id="v8m1qp"
Max bullets active: 30–50
```

---

# 329. OBJECT POOLING (IMPORTANT)

```javascript id="x2k9mc"
this.bulletPool = this.physics.add.group({
  defaultKey: 'bullet',
  maxSize: 50
});
```

---

# 330. POOL USAGE

```javascript id="m4x8zd"
const bullet = this.bulletPool.get();

if (!bullet) return;

bullet.setActive(true);
bullet.setVisible(true);
```

---

# 331. BULLET RECYCLE

```javascript id="c8m1qp"
bullet.disableBody(true, true);
```

---

# 332. COMBAT FEEL PRINCIPLE

```text id="z9x2mc"
Responsiveness > Realism
```

---

# 333. INPUT + SHOOT SYNCH

```text id="k3m8qp"
Press → Instant Shoot → No Delay
```

---

# 334. INPUT BUFFER (OPTIONAL)

```javascript id="p9c1zd"
storeInput(50ms)
```

---

# 335. HIT FEEDBACK

```text id="x7m2qp"
Screen shake
Flash
Sound
```

---

# 336. WEAPON IDENTITY SUMMARY

```text id="c2k9mc"
Normal   = baseline

Machine  = spam control

Spread   = crowd control

Laser    = precision

Flame    = close combat
```

---

# 337. SYSTEM STATUS

Sekarang game sudah punya:

```text id="m8x1qp"
4 Weapon system fully functional

Power-up system

Fire rate system

Bullet pooling

Weapon switching

Combat identity system
```

---

# 338. NEXT EVOLUTION PATH

Setelah ini, sistem paling logis:

```text id="z1c8mc"
Enemy AI System Upgrade

Boss Phase System

Hit Reaction System

Juice (screen shake, flash, slowmo)
```

---

END OF PART 7

```
```
# CONTRA CLONE

# BAGIAN 8

## ENEMY AI ADVANCED + BOSS PHASE SYSTEM + COMBAT JUICE

## (CORE “CONTRA FEEL” SYSTEM)

---

# 339. FOCUS BAGIAN INI

Di tahap ini kita naik level dari:

```text id="a1m8qp"
Shooter prototype
```

menjadi:

```text id="k9x2mc"
Arcade action system (Contra feel)
```

---

# 340. ENEMY AI PRINCIPLE

Musuh Contra tidak “pintar”.

Tapi:

```text id="p3x8zd"
Predictable + Aggressive + Pattern-based
```

---

# 341. AI STATE SYSTEM

```text id="x7m2qp"
IDLE

PATROL

ATTACK

RETREAT

DEAD
```

---

# 342. BASE ENEMY CLASS (ENHANCED)

```javascript id="c9m1zd"
class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = 1;
    this.speed = 80;
    this.state = "patrol";
  }

  update(player) {
    this.ai(player);
  }
}
```

---

# 343. ENEMY AI CORE LOOP

```javascript id="m8x2qp"
ai(player) {
  switch(this.state) {
    case "patrol":
      this.patrol();
      break;

    case "attack":
      this.attack(player);
      break;

    case "dead":
      this.destroy();
      break;
  }
}
```

---

# 344. PATROL BEHAVIOR

```javascript id="k2c9zd"
patrol() {
  this.setVelocityX(-this.speed);

  if (Phaser.Math.Between(0, 100) > 98) {
    this.state = "attack";
  }
}
```

---

# 345. ATTACK BEHAVIOR (SOLDIER)

```javascript id="x9m1qp"
attack(player) {
  this.setVelocityX(0);

  if (this.canShoot()) {
    this.shoot(player);
  }

  if (Phaser.Math.Between(0, 100) > 95) {
    this.state = "patrol";
  }
}
```

---

# 346. ENEMY SHOOT SYSTEM

```javascript id="c1m8zd"
shoot(player) {
  const bullet = this.scene.physics.add.sprite(
    this.x,
    this.y,
    'enemyBullet'
  );

  this.scene.physics.moveToObject(bullet, player, 200);
}
```

---

# 347. COOLDOWN SYSTEM

```javascript id="p7x2qp"
canShoot() {
  const now = Date.now();

  if (!this.lastShot) this.lastShot = 0;

  if (now - this.lastShot > 1200) {
    this.lastShot = now;
    return true;
  }

  return false;
}
```

---

# 348. ENEMY HIT SYSTEM

```javascript id="k8m1zd"
takeDamage(dmg) {
  this.hp -= dmg;

  if (this.hp <= 0) {
    this.state = "dead";
    this.die();
  }
}
```

---

# 349. DEATH FEEDBACK

```javascript id="x3c9qp"
die() {
  this.setActive(false);
  this.setVisible(false);

  this.scene.spawnExplosion(this.x, this.y);
}
```

---

# 350. ENEMY TYPES EXPANSION

```text id="m9x2zd"
Soldier

Turret

Drone

Heavy Unit
```

---

# 351. TURRET AI

```text id="c2m8qp"
Static
Aim Player
Shoot Burst
Cooldown
```

---

# 352. TURRET IMPLEMENTATION

```javascript id="k7x1zd"
attack(player) {
  this.scene.physics.moveToObject(this, player, 0);

  if (this.canShoot()) {
    this.shoot(player);
  }
}
```

---

# 353. DRONE AI (FLYING PATTERN)

```text id="x8m2qp"
Sine Wave Movement
+
Shoot While Moving
```

---

# 354. DRONE MOVEMENT

```javascript id="c9x1zd"
update() {
  this.x -= 2;
  this.y += Math.sin(this.x * 0.05) * 2;
}
```

---

# 355. HEAVY UNIT AI

```text id="m1x9qp"
Slow
Tank HP
High Damage
Advance slowly
```

---

# 356. HEAVY UNIT LOGIC

```javascript id="k8c2zd"
patrol() {
  this.setVelocityX(-30);
}
```

---

# 357. BOSS SYSTEM INTRO

Boss = multi phase AI system.

```text id="x2m8qp"
HP-based state machine
```

---

# 358. BOSS CLASS

```javascript id="c8x1zd"
class Boss extends Enemy {
  constructor(scene,x,y) {
    super(scene,x,y,'boss');

    this.hp = 100;
    this.phase = 1;
  }
}
```

---

# 359. BOSS PHASE SYSTEM

```text id="m9c2qp"
Phase 1: Basic attack

Phase 2: Faster + minions

Phase 3: Rage mode
```

---

# 360. PHASE TRANSITION LOGIC

```javascript id="k1x8zd"
update() {
  if (this.hp < 70) this.phase = 2;
  if (this.hp < 30) this.phase = 3;

  this.behave();
}
```

---

# 361. PHASE BEHAVIOR SWITCH

```javascript id="x7c2qp"
behave() {
  if (this.phase === 1) this.phaseOne();
  if (this.phase === 2) this.phaseTwo();
  if (this.phase === 3) this.phaseThree();
}
```

---

# 362. PHASE 1 ATTACK

```javascript id="c3x9zd"
phaseOne() {
  this.shootSpread();
}
```

---

# 363. PHASE 2 ATTACK

```javascript id="m8x1qp"
phaseTwo() {
  this.shootSpread();
  this.spawnMinions();
}
```

---

# 364. PHASE 3 RAGE MODE

```javascript id="k9c2zd"
phaseThree() {
  this.shootRapid();
  this.screenShake();
}
```

---

# 365. MINION SPAWN SYSTEM

```javascript id="x2c8qp"
spawnMinions() {
  for (let i = 0; i < 3; i++) {
    this.scene.spawnEnemy(this.x + i * 20, this.y);
  }
}
```

---

# 366. BOSS WEAK POINT SYSTEM

```text id="c9m2zd"
Specific hit area deals double damage
```

---

# 367. WEAK POINT LOGIC

```javascript id="m7x1qp"
if (hit.weakSpot) {
  damage *= 2;
}
```

---

# 368. COMBAT JUICE SYSTEM

Ini yang bikin game “terasa hidup”.

---

# 369. SCREEN SHAKE

```javascript id="k8c9zd"
shake(intensity = 0.01) {
  this.cameras.main.shake(100, intensity);
}
```

---

# 370. FLASH EFFECT

```javascript id="x1m2qp"
flash() {
  this.cameras.main.flash(100, 255, 255, 255);
}
```

---

# 371. SLOW MOTION (HIT IMPACT)

```javascript id="c8x2zd"
slowmo() {
  this.time.timeScale = 0.5;

  this.time.delayedCall(200, () => {
    this.time.timeScale = 1;
  });
}
```

---

# 372. EXPLOSION SYSTEM

```javascript id="m9x8qp"
spawnExplosion(x,y) {
  const fx = this.add.sprite(x,y,'explosion');
  fx.play('explode');
}
```

---

# 373. HIT FEEDBACK FLOW

```text id="k2m9zd"
Hit
↓
Damage
↓
Shake
↓
Flash
↓
Sound
↓
Explosion
```

---

# 374. ENEMY DENSITY RULE

```text id="x8c1qp"
Too few = boring
Too many = chaos
Ideal = controlled pressure
```

---

# 375. SPAWN BALANCING

```javascript id="c1x9zd"
spawnRate = 1500ms → 800ms → 500ms
```

---

# 376. DIFFICULTY CURVE

```text id="m8c2qp"
Early: learning

Mid: pressure

Late: chaos control

Boss: pattern mastery
```

---

# 377. CONTRA FEEL PRINCIPLE

```text id="k7x9zd"
Player should always feel slightly overwhelmed
```

---

# 378. SYSTEM STATUS

Sekarang game sudah memiliki:

```text id="x9m2qp"
Advanced Enemy AI

Boss Phase System

Minion system

Weak point system

Combat juice (shake, flash, slowmo)

Pattern-based combat
```

---

# 379. NEXT EVOLUTION PATH

Tahap berikutnya:

```text id="c8m9zd"
Mobile control system (joystick)

Animation system (sprite sheet)

Level design system (Tiled integration)

Audio design (Contra style soundscape)
```

---

END OF PART 8

```
```
# CONTRA CLONE

# BAGIAN 9

## MOBILE CONTROL SYSTEM + ANIMATION SYSTEM

## (ARCADE FEEL FINAL TOUCH LAYER)

---

# 380. FOCUS BAGIAN INI

Mengubah game dari:

```text id="a2m8qp"
Playable PC prototype
```

menjadi:

```text id="k9x1zd"
True arcade mobile experience
```

---

# 381. DUAL INPUT SYSTEM

Game harus support:

```text id="x8c2qp"
Keyboard (PC)

Touch (Mobile)
```

tanpa perubahan logic player.

---

# 382. INPUT ABSTRACTION LAYER

```javascript id="m7x9zd"
const Input = {
  left: false,
  right: false,
  jump: false,
  shoot: false
};
```

---

# 383. KEYBOARD MAPPING

```javascript id="c1x8qp"
this.cursors = this.input.keyboard.createCursorKeys();

this.keys = this.input.keyboard.addKeys({
  shoot: Phaser.Input.Keyboard.KeyCodes.SPACE
});
```

---

# 384. UPDATE INPUT STATE

```javascript id="k8m2zd"
Input.left = this.cursors.left.isDown;
Input.right = this.cursors.right.isDown;
Input.jump = this.cursors.up.isDown;
Input.shoot = Phaser.Input.Keyboard.JustDown(this.keys.shoot);
```

---

# 385. PLAYER USES INPUT ONLY

```javascript id="x9c1qp"
if (Input.left) this.player.setVelocityX(-220);
if (Input.right) this.player.setVelocityX(220);
```

---

# 386. MOBILE UI OVERLAY

HTML overlay di atas canvas:

```text id="m2x8zd"
LEFT BUTTON
RIGHT BUTTON
JUMP BUTTON
SHOOT BUTTON
```

---

# 387. MOBILE BUTTON HTML

```html id="c9m1qp"
<div id="mobile-ui">

  <div id="left" class="btn"></div>
  <div id="right" class="btn"></div>

  <div id="jump" class="btn"></div>
  <div id="shoot" class="btn"></div>

</div>
```

---

# 388. MOBILE BUTTON STYLE

```css id="k7c2zd"
#mobile-ui {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 40%;
}

.btn {
  width: 80px;
  height: 80px;
  background: rgba(255,255,255,0.2);
  border: 2px solid white;
  border-radius: 10px;
  position: absolute;
}
```

---

# 389. TOUCH EVENT SYSTEM

```javascript id="x1m8qp"
document.getElementById('left')
.addEventListener('touchstart', () => Input.left = true);

document.getElementById('left')
.addEventListener('touchend', () => Input.left = false);
```

---

# 390. MOBILE CONTROL FLOW

```text id="c8x9zd"
Touch Input
↓
Input Object
↓
Player System
↓
Movement Update
```

---

# 391. JOYSTICK (OPTIONAL UPGRADE)

```text id="m9c1qp"
Virtual Stick = Movement Control
```

---

# 392. JOYSTICK LOGIC

```javascript id="k1x8zd"
let startX = 0;

joystick.addEventListener('touchstart', e => {
  startX = e.touches[0].clientX;
});
```

---

# 393. MOBILE SHOOT BUTTON

```javascript id="x7c2qp"
shoot.addEventListener('touchstart', () => {
  Input.shoot = true;
});
```

---

# 394. INPUT CLEANUP

```javascript id="c3m9zd"
shoot.addEventListener('touchend', () => {
  Input.shoot = false;
});
```

---

# 395. RESPONSIVE RULE

```text id="m8x1qp"
Mobile = touch UI visible

Desktop = touch UI hidden
```

---

# 396. CSS RESPONSIVE CONTROL

```css id="k9c2zd"
@media (min-width: 768px) {
  #mobile-ui {
    display: none;
  }
}
```

---

# 397. ANIMATION SYSTEM OVERVIEW

Contra feel sangat bergantung pada:

```text id="x2c8qp"
Animation responsiveness
```

---

# 398. SPRITE SHEET STRUCTURE

```text id="c9m2zd"
Idle

Run

Jump

Shoot

Die
```

---

# 399. SPRITE EXAMPLE ASSET

Gunakan CDN sprite sheet:

```text id="m7x1qp"
https://labs.phaser.io/assets/sprites/dude.png
```

---

# 400. ANIMATION CREATION

```javascript id="k8x9zd"
this.anims.create({
  key: 'run',
  frames: this.anims.generateFrameNumbers('player', {
    start: 1,
    end: 4
  }),
  frameRate: 10,
  repeat: -1
});
```

---

# 401. IDLE ANIMATION

```javascript id="x1m2qp"
this.anims.create({
  key: 'idle',
  frames: [{ key: 'player', frame: 0 }],
  frameRate: 1
});
```

---

# 402. SHOOT ANIMATION

```javascript id="c8m2zd"
this.anims.create({
  key: 'shoot',
  frames: this.anims.generateFrameNumbers('player', {
    start: 5,
    end: 7
  }),
  frameRate: 15
});
```

---

# 403. ANIMATION SWITCH LOGIC

```javascript id="m9x8qp"
if (Input.left || Input.right) {
  this.player.anims.play('run', true);
} else {
  this.player.anims.play('idle', true);
}
```

---

# 404. JUMP ANIMATION

```javascript id="k2c9zd"
if (!this.player.body.blocked.down) {
  this.player.anims.play('jump', true);
}
```

---

# 405. SHOOT + RUN COMBINATION

```text id="x8m1qp"
Run + Shoot = hybrid animation state
```

---

# 406. STATE PRIORITY SYSTEM

```text id="c1x9zd"
Dead > Jump > Shoot > Run > Idle
```

---

# 407. ANIMATION LOCK RULE

```javascript id="m8c2qp"
if (state === "dead") {
  return;
}
```

---

# 408. FEEL IMPROVEMENT RULE

```text id="k7x9zd"
Animation must respond instantly (< 100ms delay)
```

---

# 409. SCREEN SCALE FIX

```javascript id="x9m2qp"
this.scale.scaleMode = Phaser.Scale.FIT;
```

---

# 410. FULLSCREEN MOBILE FIX

```javascript id="c8m9zd"
this.scale.startFullscreen();
```

---

# 411. TOUCH + ANIMATION SYNC

```text id="m2c8qp"
Touch → Input → Movement → Animation
```

---

# 412. INPUT + ANIMATION COUPLING RULE

Jangan:

```text id="k9x2zd"
animation independent
```

Harus:

```text id="x1c8qp"
animation reflects input state
```

---

# 413. PERFORMANCE RULE

```text id="c9m1zd"
Max animation switching per frame: 1
```

---

# 414. FINAL GAME FEEL STACK

```text id="m7x8qp"
Input

Movement

Physics

Animation

Combat

Juice
```

---

# 415. SYSTEM STATUS

Sekarang game sudah punya:

```text id="k8c1zd"
Mobile control system

Keyboard + touch abstraction

Full animation system

State-based animation priority

Responsive arcade feel
```

---

# 416. NEXT EVOLUTION PATH

Tahap terakhir sebelum “game siap rilis”:

```text id="x2m9qp"
Audio system (Contra feel sound)

Level design pipeline (Tiled full integration)

UI/HUD final polish

Game polish (juice + effects)

Build deployment
```

---

END OF PART 9

```
```
# CONTRA CLONE

# BAGIAN 10

## AUDIO SYSTEM + LEVEL DESIGN PIPELINE + FINAL POLISH + DEPLOYMENT

---

# 417. FOCUS BAGIAN INI

Tahap ini mengubah game dari:

```text id="a9m1qp"
Playable Prototype
```

menjadi:

```text id="k8c2zd"
Release-ready arcade game
```

---

# 418. AUDIO PHILOSOPHY (CONTRA FEEL)

Audio bukan pelengkap.

Audio adalah:

```text id="x1m8qp"
Feedback system + emotional pacing + combat intensity
```

---

# 419. AUDIO LAYER STRUCTURE

```text id="c9x2zd"
BGM (Background Music)

SFX (Sound Effects)

UI Sounds

Explosion Layer

Hit Feedback Layer
```

---

# 420. AUDIO FORMAT RULE

Gunakan:

```text id="m7c9qp"
OGG (primary)

MP3 (fallback)
```

---

# 421. AUDIO LOADING SYSTEM

```javascript id="k8m1zd"
this.load.audio('bgm_stage1',
  'https://cdn.example.com/stage1.ogg'
);
```

---

# 422. AUDIO MANAGER (SIMPLE)

```javascript id="x9c8qp"
class AudioManager {
  constructor(scene) {
    this.scene = scene;
  }

  play(key, config = {}) {
    this.scene.sound.play(key, config);
  }
}
```

---

# 423. BGM CONTROL

```javascript id="c1m8zd"
this.music = this.sound.add('bgm_stage1', {
  loop: true,
  volume: 0.5
});

this.music.play();
```

---

# 424. SFX LIST (CONTRA STYLE)

```text id="m8x2qp"
shoot

hit

explosion_small

explosion_big

powerup

player_death

boss_warning
```

---

# 425. SHOOT SOUND

```javascript id="k9c1zd"
this.sound.play('shoot', { volume: 0.3 });
```

---

# 426. EXPLOSION SOUND

```javascript id="x2m8qp"
this.sound.play('explosion_small', { volume: 0.6 });
```

---

# 427. BOSS AUDIO TRIGGER

```text id="c8x1zd"
Phase change = audio cue
```

---

# 428. BOSS WARNING SOUND

```javascript id="m9x2qp"
this.sound.play('boss_warning');
```

---

# 429. AUDIO FEEDBACK RULE

```text id="k7c9zd"
Every action MUST have sound feedback
```

---

# 430. LEVEL DESIGN PIPELINE

Level tidak dibuat di code.

Gunakan:

```text id="x8m1qp"
Tiled Map Editor
```

---

# 431. LEVEL DATA FLOW

```text id="c1x9zd"
Tiled Map
↓
JSON Export
↓
Phaser Load
↓
Spawn System
```

---

# 432. LAYER STRUCTURE (FINAL)

```text id="m8c2qp"
Background

Decor

Collision

EnemySpawn

ItemSpawn

Checkpoint

BossTrigger
```

---

# 433. TILEMAP LOADING

```javascript id="k9m1zd"
const map = this.make.tilemap({ key: 'stage1' });

const tiles = map.addTilesetImage('tiles', 'tileset');

const ground = map.createLayer('Ground', tiles);
```

---

# 434. COLLISION LAYER

```javascript id="x1c8qp"
ground.setCollisionByProperty({
  collides: true
});
```

---

# 435. ENEMY SPAWN FROM MAP

```javascript id="c9m2zd"
map.getObjectLayer('EnemySpawn').objects.forEach(obj => {
  this.spawnEnemy(obj.x, obj.y);
});
```

---

# 436. ITEM SPAWN SYSTEM

```text id="m7x1qp"
Powerup spawn defined in map
```

---

# 437. CHECKPOINT SYSTEM

```javascript id="k8c9zd"
map.getObjectLayer('Checkpoint').objects.forEach(cp => {
  this.checkpoints.push(cp);
});
```

---

# 438. BOSS TRIGGER SYSTEM

```javascript id="x2m9qp"
map.getObjectLayer('BossTrigger').objects.forEach(b => {
  this.bossTrigger = b.x;
});
```

---

# 439. CAMERA CONTROL

```javascript id="c8m1zd"
this.cameras.main.startFollow(this.player);
```

---

# 440. CAMERA LIMIT RULE

```text id="m9c8qp"
Camera must NEVER go backward
```

---

# 441. PARALLAX FINAL POLISH

```javascript id="k1x9zd"
this.bg.tilePositionX += 1.5;
```

---

# 442. JUICE SYSTEM (FINAL POLISH)

```text id="x8c2qp"
Screen shake

Flash

Slow motion

Particles

Sound sync
```

---

# 443. HIT JUICE FLOW

```text id="c1m9zd"
Hit
↓
Shake
↓
Flash
↓
Sound
↓
Knockback
```

---

# 444. SCREEN SHAKE FINAL

```javascript id="m8x1qp"
this.cameras.main.shake(120, 0.01);
```

---

# 445. FLASH FINAL

```javascript id="k9c2zd"
this.cameras.main.flash(80, 255, 255, 255);
```

---

# 446. SLOW MOTION IMPACT

```javascript id="x1m9qp"
this.time.timeScale = 0.6;

this.time.delayedCall(150, () => {
  this.time.timeScale = 1;
});
```

---

# 447. PARTICLE SYSTEM RULE

```text id="c8m2zd"
Use only for impact moments
Not continuous spam
```

---

# 448. PERFORMANCE FINAL RULE

```text id="m7c1qp"
Max:

Enemies: 20–30
Bullets: 40–60
Particles: 100
```

---

# 449. MEMORY RULE

```text id="k8x9zd"
Avoid memory leak from:
- bullets
- enemies
- sounds
```

---

# 450. GAME LOOP OPTIMIZATION

```text id="x2c9qp"
Disable off-screen update
Recycle objects (pooling)
```

---

# 451. DEPLOYMENT TARGETS

```text id="c9m1zd"
Web (itch.io)

PWA installable

Android wrapper (Capacitor)

iOS web build
```

---

# 452. PWA SETUP

```text id="m8x2qp"
manifest.json

service worker

cache assets
```

---

# 453. OFFLINE MODE

Game harus bisa:

```text id="k9c1zd"
Play tanpa internet 
(abaikan karna game harus online untuk mengakses undangan)
```

---

# 454. BUILD STRATEGY

```text id="x1m8qp"
No build tool required

Just upload 3 files
```

---

# 455. FINAL QUALITY CHECKLIST

```text id="c8x2zd"
✔ Movement smooth

✔ Shooting responsive

✔ Enemy AI working

✔ Boss phase working

✔ Audio synced

✔ Mobile controls working

✔ No lag

✔ No memory leak
```

---

# 456. RELEASE CRITERIA

Game dianggap siap rilis jika:

```text id="m9c1qp"
Playable 5–10 minutes

Stable FPS 60

No crash

Clear progression

Boss defeat possible
```

---

# 457. FINAL SYSTEM STATUS

Sekarang project sudah memiliki:

```text id="k8c2zd"
Full gameplay loop

Level pipeline

Audio system

Boss system

Juice system

Mobile + desktop support

Deployment ready architecture
```

---

# 458. FINAL FORM OF GAME

Dari sini game sudah berubah menjadi:

```text id="x9m1qp"
Mini Contra Engine (Browser-based)
```

---

END OF PART 10

```
```
