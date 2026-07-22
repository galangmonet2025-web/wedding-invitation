/* Uji POWER-UP MENEMBAK (buket) + model bertarung bos ala retromario.

   Permintaan user:
     - "power up yang punya skill menembak di tempatnya di beberapa
        stage TERMASUK STAGE TERAKHIR (untuk melawan boss)"
     - "power up dibuat selama 16 detik semua"
     - "pelajari mekanisme boss di retromario, saya mau seperti itu
        model bertarung nya"

   Yang ditiru dari retromario (terverifikasi dari kodenya):
     - batas peluru serentak di layar + jeda tembak
     - peluru mati saat keluar layar (bukan hidup selamanya)
     - peluru lenyap saat mengenai sasaran (tidak menembus)
     - bos BERGERAK/berpatroli dalam arena, bukan diam
     - kemampuan menembak TIDAK ikut berpindah stage
*/
const fs = require('fs');
const { JSDOM } = require('jsdom');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('index.css', 'utf8');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = () => ({
  imageSmoothingEnabled: true, drawImage(){}, clearRect(){}, fillRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){}
});
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);

/* =====================================================================
   1. DURASI 16 DETIK UNTUK SEMUA
   ===================================================================== */
ok(w.PW_MS === 16000, 'PW_MS = 16000 ms (16 detik)');
ok(w.PW_SEC === 16, 'PW_SEC = 16');

/* Tidak boleh ada lagi durasi lama yang ditulis manual di jalur power-up. */
const takeFn = js.slice(js.indexOf('GameScene.prototype.takePowerup'),
                        js.indexOf('GameScene.prototype.addScore'));
const literal = takeFn.match(/powerupUntil\s*=\s*[^;]+;/g) || [];
ok(literal.length >= 3, 'ada ' + literal.length + ' power-up berdurasi');
/* BUKET dikecualikan: ia berlaku sampai stage selesai, bukan berjam. */
const timed = literal.filter(s => !/Infinity/.test(s));
const notPW = timed.filter(s => !/PW_MS/.test(s));
ok(notPW.length === 0,
   'SEMUA power-up BERJAM memakai PW_MS — tidak ada angka yang ditulis sendiri' +
   (notPW.length ? ' -> ' + notPW.join(' | ') : ''));
ok(!/\+\s*8000|\+\s*10000/.test(takeFn),
   'durasi lama (8000/10000) sudah tidak ada');

/* Keterangan yang dilihat pemain ikut memakai angka yang sama — kalau
   ditulis manual, teks bisa bilang "8 detik" padahal efeknya 16. */
ok(/KEBAL 16 DETIK/.test(w.POWERUP_INFO.cincin.effect),
   'teks cincin ikut 16 detik -> "' + w.POWERUP_INFO.cincin.effect + '"');
ok(/16 DETIK/.test(w.POWERUP_INFO.payung.effect),
   'teks payung ikut 16 detik -> "' + w.POWERUP_INFO.payung.effect + '"');

/* =====================================================================
   1b. BUKET: BERLAKU SAMPAI STAGE SELESAI, BUKAN 16 DETIK
   ===================================================================== */
const buketAssign = literal.filter(s => /Infinity/.test(s));
ok(buketAssign.length === 1,
   'tepat satu power-up tanpa batas waktu (buket) -> ' + buketAssign.join(''));
/* Pastikan yang tanpa batas itu memang BUKET, bukan kebetulan yang lain. */
const buketBranch = takeFn.slice(takeFn.indexOf("kind === 'buket'"),
                                 takeFn.indexOf("} else {"));
ok(/powerupUntil = Infinity/.test(buketBranch),
   'cabang buket-lah yang memakai Infinity');
ok(!/PW_MS/.test(buketBranch),
   'cabang buket TIDAK lagi memakai PW_MS (16 detik)');

/* Infinity, bukan angka besar: angka besar hanya menunda masalah. */
ok(!/powerupUntil = 9{4,}/.test(takeFn),
   'memakai Infinity, bukan angka besar yang tetap bisa terlewati');

/* Perbandingan kedaluwarsanya harus benar-benar tak pernah benar. */
ok((1e12 > Infinity) === false,
   'time > Infinity selalu false — buket tak bisa kedaluwarsa oleh jam');

/* Yang MENGAKHIRI buket = pergantian stage, di create(). Kalau baris ini
   hilang, buket akan terbawa ke stage berikutnya SELAMANYA (karena
   jamnya tak pernah menghabiskannya). Jadi ini penjaga yang kritis. */
const createSrc = js.slice(js.indexOf('GameScene.prototype.create = function'),
                           js.indexOf('GameScene.prototype.mkLayer'));
ok(/runState\.powerup = null;/.test(createSrc),
   'create() membersihkan power-up tiap stage baru — INI yang mengakhiri buket');
ok(/runState\.powerupUntil = 0;/.test(createSrc),
   'powerupUntil ikut disetel ulang (Infinity tidak boleh tertinggal)');

/* Teks yang dilihat pemain harus jujur: jangan menjanjikan detik. */
ok(!/DETIK/.test(w.POWERUP_INFO.buket.effect),
   'teks buket tidak menyebut detik -> "' + w.POWERUP_INFO.buket.effect + '"');
ok(/STAGE/.test(w.POWERUP_INFO.buket.effect),
   'teks buket menyebut sampai stage selesai -> "' + w.POWERUP_INFO.buket.effect + '"');

/* Pesan "BUKET HABIS" hanya masuk akal untuk power-up berjam. Kalau masih
   ada, ia mustahil tampil dan menyesatkan pembaca kode berikutnya. */
ok(!/BUKET HABIS/.test(js),
   'pesan kedaluwarsa "BUKET HABIS" dibuang (mustahil terjadi lagi)');

/* runState TIDAK boleh ikut disimpan ke localStorage: JSON.stringify
   mengubah Infinity menjadi null, dan null > perbandingan jadi kacau.
   Saat ini hanya STORE yang disimpan — jaga supaya tetap begitu. */
ok(JSON.parse(JSON.stringify({ v: Infinity })).v === null,
   'catatan: JSON mengubah Infinity -> null (sebab runState tak boleh disimpan)');
ok(!/setItem\(STORE_KEY, JSON\.stringify\(runState\)/.test(js),
   'runState tidak ditulis ke localStorage, jadi Infinity aman');

/* =====================================================================
   2. MUNCUL DI BEBERAPA STAGE, TERMASUK STAGE TERAKHIR (BOS)
   ===================================================================== */
/* Daftarnya ditulis sebagai NOMOR STAGE (seperti di HUD), bukan indeks.
   Versi lama tes ini menurunkan "stage mana" DARI daftar itu sendiri, jadi
   apa pun isinya selalu cocok — tautologi. Akibatnya daftar [1,3,5] yang
   sebenarnya berarti stage 2/4/6 lolos tanpa keberatan, dan stage 1 tidak
   pernah punya buket. Sekarang harapannya ditulis sebagai angka harfiah. */
ok(Array.isArray(w.BUKET_STAGE_NOS) && w.BUKET_STAGE_NOS.length >= 2,
   'buket muncul di beberapa stage: nomor ' + JSON.stringify(w.BUKET_STAGE_NOS));
const bossIdx = w.STAGES.findIndex(s => s.boss);
ok(bossIdx >= 0, 'ada stage bos (indeks ' + bossIdx + ')');
ok(bossIdx === 5 && w.STAGES.length === 6,
   'bos = indeks 5 dari 6 stage, artinya STAGE 6 di layar');
ok(w.BUKET_STAGE_NOS.indexOf(bossIdx + 1) > -1,
   'STAGE BOS (nomor ' + (bossIdx + 1) + ') menjatuhkan buket — syarat utama permintaan');
ok(w.BUKET_STAGE_NOS.indexOf(1) > -1,
   'STAGE 1 menjatuhkan buket (user melaporkan tidak menemukannya di sana)');
/* Permintaan user: senjata jangan langka -> SEMUA stage. */
ok(w.BUKET_STAGE_NOS.length === w.STAGES.length,
   'SEMUA stage menjatuhkan buket (' +
   w.BUKET_STAGE_NOS.length + '/' + w.STAGES.length + ')');
const missing = w.STAGES.map((s, i) => i + 1)
                        .filter(n => w.BUKET_STAGE_NOS.indexOf(n) < 0);
ok(missing.length === 0,
   'tidak ada stage yang terlewat' +
   (missing.length ? ' -> stage ' + missing.join(',') : ''));
const outOfRange = w.BUKET_STAGE_NOS.filter(n => n < 1 || n > w.STAGES.length);
ok(outOfRange.length === 0,
   'tidak ada nomor stage di luar 1..' + w.STAGES.length +
   (outOfRange.length ? ' -> ' + outOfRange.join(',') : ''));

/* stageHasBuket() memetakan nomor -> indeks dengan benar */
for (let i = 0; i < w.STAGES.length; i++) {
  ok(w.stageHasBuket(i) === true,
     'stageHasBuket(idx ' + i + ') = STAGE ' + (i + 1) + ' -> true');
}
/* Batasnya tetap dijaga: indeks di luar daftar stage harus false, supaya
   fungsinya benar-benar memetakan nomor dan bukan selalu mengiyakan. */
ok(w.stageHasBuket(w.STAGES.length) === false,
   'stageHasBuket(idx ' + w.STAGES.length + ') di luar batas -> false ' +
   '(bukan sekadar selalu true)');
ok(w.stageHasBuket(-1) === false, 'stageHasBuket(-1) -> false');

/* spawnPowerup benar-benar menambahkan buket HANYA di stage itu.
   Memakai stageHasBuket() ASLI dari window, bukan menyalin daftarnya. */
/* Menjalankan blok penentu jenis yang ASLI. _buketGiven disetel true
   supaya yang diuji adalah jalur UNDIAN (kotak ke-2 dst) — kotak pertama
   selalu buket tanpa mengundi, jadi memakainya tidak menguji daftar. */
function kindsFor(stageIdx) {
  const src = js.slice(js.indexOf('GameScene.prototype.spawnPowerup'),
                       js.indexOf('GameScene.prototype.takeCoin'));
  const m = /var kinds = (\[[^\]]*\]);([\s\S]*?)kind = kinds\[/.exec(src);
  if (!m) return null;
  const fn = new Function('stageHasBuket', 'self',
    'var kinds = ' + m[1] + ';' +
    m[2].replace(/this\./g, 'self.') + 'return kinds;');
  return fn(w.stageHasBuket, { stageIdx: stageIdx, _buketGiven: true });
}
/* Diperiksa untuk SETIAP stage, bukan cuma satu contoh: begitulah
   "stage 1 kosong" bisa lolos dulu. */
w.STAGES.forEach((s, i) => {
  const k = kindsFor(i);
  const want = w.BUKET_STAGE_NOS.indexOf(i + 1) > -1;
  const got = !!(k && k.indexOf('buket') > -1);
  ok(got === want,
     'STAGE ' + (i + 1) + ' (' + s.short + '): buket ' +
     (want ? 'ADA' : 'tidak ada') + ' -> ' + JSON.stringify(k));
});

/* =====================================================================
   3. TEKSTUR & SLOT DIALOG
   ===================================================================== */
['t_pw_buket', 't_shot'].forEach(k => {
  const m = w.ASSET_MAP.find(e => e.key === k);
  ok(!!m, 'ASSET_MAP memuat ' + k);
  if (m) ok(!!w.SHEET_MAP[m.grp],
            k + ' menunjuk kelompok sheet yang ADA (' + m.grp + ')');
});
ok(/makeArtTexture\(scene, 't_pw_buket'/.test(js), 'tekstur buket dibuat');
ok(/makeArtTexture\(scene, 't_shot'/.test(js), 'tekstur peluru dibuat');
ok(typeof w.shotArt === 'function' && w.shotArt().length > 0,
   'shotArt() menghasilkan gambar peluru');
ok(w.powerupArt('buket').length === 9,
   'buket digambar 9x9 sama seperti power-up lain (konsisten)');
/* buket harus BEDA dari power-up lain, kalau sama pemain tak bisa membedakan */
ok(JSON.stringify(w.powerupArt('buket')) !== JSON.stringify(w.powerupArt('cincin')),
   'gambar buket berbeda dari cincin');
ok(JSON.stringify(w.powerupArt('buket')) !== JSON.stringify(w.powerupArt('melati')),
   'gambar buket berbeda dari melati');
['pw_buket', 'shot'].forEach(id => {
  ok(!!w.slotById(id), 'slot dialog "' + id + '" terdaftar (sprite bisa diganti user)');
});

/* =====================================================================
   4. BATAS PELURU — pola retromario
   ===================================================================== */
ok(w.SHOT_MAX >= 1 && w.SHOT_MAX <= 6,
   'batas peluru serentak masuk akal (' + w.SHOT_MAX + ')');
ok(w.SHOT_CD >= 120,
   'ada jeda antar tembakan ' + w.SHOT_CD + 'ms (bukan semburan tanpa batas)');
ok(w.SHOT_SPEED > 0, 'peluru punya kecepatan (' + w.SHOT_SPEED + ' px/s)');
ok(w.SHOT_LIFE > 0, 'peluru punya umur maksimum (' + w.SHOT_LIFE + 'ms)');

const fire = js.slice(js.indexOf('GameScene.prototype.fireShot'),
                      js.indexOf('GameScene.prototype.updateShots'));
ok(/countActive\(true\)/.test(fire) && /live >= SHOT_MAX/.test(fire),
   'menolak menembak saat kolam penuh (bukan memaksa membuat objek baru)');
ok(/time < this\.shotCdUntil/.test(fire), 'jeda tembak ditegakkan');
ok(/setAllowGravity\(false\)/.test(fire),
   'peluru LURUS tanpa gravitasi — bos di tema ini melayang, peluru ' +
   'melengkung ala retromario akan selalu jatuh di bawahnya');
ok(/canShoot\(\)/.test(fire), 'menembak hanya saat power-up aktif');
ok(/p\.direction/.test(fire), 'arah peluru mengikuti arah hadap pemain');

const upd = js.slice(js.indexOf('GameScene.prototype.updateShots'),
                     js.indexOf('GameScene.prototype.shotHitsEnemy'));
ok(/disableBody\(true, true\)/.test(upd), 'peluru dikembalikan ke kolam, bukan dibuang');
ok(/cam\.scrollX/.test(upd), 'peluru mati saat keluar layar (anti-bocor)');
ok(/diesAt/.test(upd), 'umur maksimum diperiksa');

/* =====================================================================
   5. KENA MUSUH & KENA BOS
   ===================================================================== */
const hitE = js.slice(js.indexOf('GameScene.prototype.shotHitsEnemy'),
                      js.indexOf('GameScene.prototype.shotHitsBoss'));
ok(/killEnemy/.test(hitE), 'peluru membunuh musuh biasa');
ok(/s\.disableBody/.test(hitE), 'peluru lenyap saat kena (tidak menembus)');

const hitB = js.slice(js.indexOf('GameScene.prototype.shotHitsBoss'),
                      js.indexOf('GameScene.prototype.showBlockedHit'));
ok(/this\.bossVulnerable/.test(hitB),
   'peluru menghormati jendela rentan yang SAMA dengan injakan — ' +
   'kalau tidak, bos jadi karung tinju dan rancangannya runtuh');
ok(/showBlockedHit/.test(hitB),
   'ada umpan balik saat tembakan tertahan (pemain tahu "belum waktunya", ' +
   'bukan mengira tembakannya rusak)');
ok(/hitBoss\(\)/.test(hitB), 'peluru melukai bos saat jendelanya terbuka');
ok(/overlap\(this\.shots, this\.boss/.test(js),
   'tabrakan peluru-vs-bos benar-benar dipasang');
ok(/overlap\(this\.shots, this\.enemies/.test(js),
   'tabrakan peluru-vs-musuh dipasang');

/* =====================================================================
   6. BOS BERGERAK — model retromario
   ===================================================================== */
const ub = js.slice(js.indexOf('GameScene.prototype.updateBoss'),
                    js.indexOf('GameScene.prototype.setBossVulnerable'));
ok(/b\.dirX/.test(ub) && /arenaL/.test(ub) && /arenaR/.test(ub),
   'bos BERPATROLI & memantul di batas arena (retromario: berjalan, ' +
   'bukan diam di satu titik)');
ok(w.BOSS_ARENA_W > 0, 'lebar arena bos ditentukan (' + w.BOSS_ARENA_W + 'px)');
ok(/this\.bossPhase \* /.test(ub),
   'kecepatan bos NAIK tiap fase (retromario: baseSpd + phase*0.5)');
ok(/b\.lunging/.test(ub),
   'bos berhenti mendatar saat memberi aba-aba (supaya telegraph terbaca)');
const atk = js.slice(js.indexOf('GameScene.prototype.bossAttack'),
                     js.indexOf('GameScene.prototype.manualBossHit'));
ok(/b\.lunging = true/.test(atk), 'aba-aba mengunci gerak');
ok(/b\.lunging = false/.test(atk), 'gerak dilepas lagi saat jendela rentan dibuka');

/* =====================================================================
   7. TIDAK MELINTASI STAGE (bug jam scene)
   ===================================================================== */
const create = js.slice(js.indexOf('this.shots = this.physics.add.group'),
                        js.indexOf('/* ---- Player ---- */'));
ok(/runState\.powerup = null/.test(create),
   'power-up berdurasi DIBERSIHKAN saat stage dibangun ulang — ' +
   'this.time.now kembali 0 tiap restart, jadi tanpa ini power-up ' +
   'yang terbawa akan berlaku SELAMANYA');
ok(/gravity\.y = PHYS\.GRAVITY_Y/.test(create),
   'gravitasi ikut dipulihkan (payung tidak menyangkut)');

/* =====================================================================
   8. TOMBOL & MASUKAN
   ===================================================================== */
ok(html.indexOf('id="pwr-btn-shoot"') > -1, 'tombol tembak ada di HTML');
ok(/\.pwr-btn-shoot\s*\{[^}]*display:\s*none/.test(css),
   'tombol tembak TERSEMBUNYI saat power-up tidak aktif (bukan tombol mati)');
ok(/\.pwr-btn-shoot\.is-available\s*\{[^}]*display:\s*block/.test(css),
   'muncul saat is-available');
ok(typeof w.syncShootBtn === 'function', 'syncShootBtn() tersedia');
ok(/_shootBtnOn/.test(js),
   'kelas hanya ditulis saat BERUBAH (tidak menyentuh DOM 60x/detik)');
ok(/keys\.x/.test(js) && /keys\.e/.test(js), 'tombol papan ketik X & E terdaftar');
ok(/touch\.shoot/.test(js), 'tombol sentuh terhubung');
ok(/p\.wasShootDown/.test(js),
   'satu tekan = satu peluru (menahan tombol tidak memuntahkan peluru)');
/* pendengar tombol tembak ikut dibuang saat host menyuntik ulang JS */
ok(/shootBtn\.removeEventListener/.test(js),
   'pendengar tombol tembak dibuang di cleanup (host menyuntik ulang JS)');

/* =====================================================================
   9. HUD & SUARA
   ===================================================================== */
ok(/TEMBAK/.test(js) && /pu === 'buket'/.test(js), 'HUD menampilkan status TEMBAK');
ok(/case 'shoot':/.test(js), 'ada bunyi tembakan');
ok(/case 'block':/.test(js), 'ada bunyi tertahan (beda dari bunyi kena)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
