/* Uji KELAYAKAN CELAH — "harus pixel perfect supaya bisa jatuh".

   Dilaporkan user (dgn tangkapan layar): "di space yg kecil itu kok
   kyknya susah banget buat nyelip / harusnya kalo jalan di atas plafon
   itu kan bisa jatuh / nah ini bisa tp kyk harus di ulang-ulang beberapa
   kali dulu / padahal saya udh coba kecilkan ukuran sprite karakter
   utamanya tp tetep harus pixel perfect".

   DUDUK PERKARANYA (dihitung, bukan dikira):
     celah lama              = 1 tile  = 32px
     hitbox pemain (0,9x)    = 27px
     sisa ruang              = 5px total -> 2,5px per sisi
     perpindahan per frame   = RUN_SPEED 300 / 60fps = 5px
   Perpindahan SATU FRAME lebih besar daripada seluruh sisa ruang. Jadi
   pemain hanya masuk kalau posisi framenya kebetulan pas — itulah
   "harus pixel perfect". Mengecilkan sprite tidak menolong: dari 30px
   ke 27px hanya menambah 1,5px per sisi, masih di bawah satu langkah.

   Perbaikannya BUKAN sprite yang lebih kecil, melainkan CELAH YANG LEBIH
   LEBAR (2 tile), sehingga sisa ruang jauh melebihi satu langkah frame.
*/
const fs = require('fs');
const { JSDOM } = require('jsdom');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

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
w.TUNE = w.loadTune();
w.recomputeDerived();

const TILE = w.TILE;
const bodyW = w.playerBodyW();
const step = Math.ceil(w.PHYS.RUN_SPEED / 60);

console.log('        hitbox pemain   : ' + bodyW + 'px');
console.log('        langkah / frame : ' + step + 'px (RUN_SPEED ' + w.PHYS.RUN_SPEED + ')');

/* =====================================================================
   1. HITBOX DITURUNKAN DARI TEKSTUR, bukan angka mati
   ===================================================================== */
ok(typeof w.playerBodyW === 'function' && typeof w.playerBodyH === 'function',
   'ukuran badan pemain punya fungsi turunan sendiri');
ok(bodyW === Math.round(w.sizeOf(w.ASSET_MAP.find(m => m.key === 't_groom_idle0')).w
                        * w.PLAYER_BODY_RATIO.dasar.w),
   'playerBodyW() mengikuti ukuran tekstur yang BERLAKU (' + bodyW + 'px)');
/* Kalau sprite dikecilkan lagi, angkanya harus ikut — bukan tetap 30. */
const before = w.playerBodyW();
w.SCALE['t_groom_idle0'] = 0.5;
const after = w.playerBodyW();
delete w.SCALE['t_groom_idle0'];
ok(after < before,
   'mengecilkan sprite pemain ikut mengecilkan angka yang dipakai ' +
   'generator (' + before + ' -> ' + after + '), bukan tetap 30px');

/* =====================================================================
   2. CELAH PLAFON HARUS LEBIH LEBAR DARIPADA SATU LANGKAH FRAME
   ===================================================================== */
const GAP_TILES = 2;
const gapPx = GAP_TILES * TILE;
const slackPerSide = (gapPx - bodyW) / 2;
console.log('        celah ' + GAP_TILES + ' tile      : ' + gapPx + 'px -> sisa ' +
            slackPerSide + 'px per sisi');

ok(gapPx > bodyW, 'celah lebih lebar daripada badan pemain');
ok(slackPerSide > step,
   'sisa ruang per sisi (' + slackPerSide + 'px) LEBIH BESAR daripada ' +
   'satu langkah frame (' + step + 'px) — masuk celah jadi bisa ' +
   'diandalkan, bukan undian');
/* pembanding: celah 1 tile yang lama memang gagal syarat ini */
const oldSlack = (TILE - bodyW) / 2;
ok(!(oldSlack > step),
   'celah 1 tile yang lama TIDAK memenuhi syarat (' + oldSlack + 'px <= ' +
   step + 'px) — membuktikan keluhan user benar, bukan perasaan');

/* =====================================================================
   3. GENERATOR benar-benar membuat celah 2 tile
   ===================================================================== */
const b003 = js.slice(js.indexOf('B003 Floating row'),
                      js.indexOf('B003 Floating row') + 3000);
ok(/gapEnd = gapAt \+ 1/.test(b003), 'generator menandai celah 2 kolom');
ok(/j === gapAt \|\| j === gapEnd/.test(b003),
   'KEDUA kolom celah benar-benar dilewati saat menaruh blok');
ok(/var n = 5 \+/.test(b003),
   'jumlah blok dinaikkan supaya baris tidak jadi terlalu pendek');
/* blok "?" tidak boleh jatuh di kolom celah (akan menutup celahnya lagi) */
ok(/j !== gapAt && j !== gapEnd/.test(b003),
   'blok ? tidak pernah ditaruh di kolom celah (kalau iya, celahnya tertutup lagi)');

/* =====================================================================
   4. SIMULASI: bangun level sungguhan, ukur SEMUA celah plafon
   ===================================================================== */
let rows = 0, tooTight = [], gapsSeen = [];
for (let s = 0; s < w.STAGES.length; s++) {
  const L = w.buildLevel(s);
  /* kelompokkan solid per baris-y untuk menemukan baris melayang */
  const byY = {};
  L.solids.forEach(b => {
    if (b.kind !== 'brick' && b.kind !== 'q') return;
    (byY[b.y] = byY[b.y] || []).push(b);
  });
  Object.keys(byY).forEach(yk => {
    const row = byY[yk].sort((a, b) => a.x - b.x);
    if (row.length < 2) return;
    rows++;
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].x - (row[i - 1].x + row[i - 1].w);
      if (gap <= 0) continue;                 /* menempel: bukan celah */
      gapsSeen.push(gap);
      /* Celah yang ADA harus benar-benar bisa dimasuki. Celah yang
         lebih sempit daripada badan tidak apa-apa KALAU memang tidak
         dimaksudkan sebagai jalan — tapi celah selebar 1 tile persis
         adalah jebakan "hampir muat" yang kita hapus. */
      if (gap > bodyW && (gap - bodyW) / 2 <= step) {
        tooTight.push('stage ' + s + ' y=' + yk + ' celah ' + gap + 'px');
      }
    }
  });
}
console.log('        baris melayang diperiksa: ' + rows +
            ', celah ditemukan: ' + gapsSeen.length);
ok(rows > 0, 'ada baris melayang untuk diuji (' + rows + ' baris)');
ok(tooTight.length === 0,
   'tidak ada celah "hampir muat" yang menuntut ketepatan piksel' +
   (tooTight.length ? ' -> ' + tooTight.slice(0, 5).join('; ') +
    (tooTight.length > 5 ? ' (+' + (tooTight.length - 5) + ' lagi)' : '') : ''));

/* dan celah yang dibuat generator memang selebar 2 tile */
const twoTile = gapsSeen.filter(g => g >= 2 * TILE).length;
ok(twoTile > 0,
   'ada celah selebar >=2 tile di level sungguhan (' + twoTile + ' dari ' +
   gapsSeen.length + ')');

/* =====================================================================
   5. AMBANG PLAYER_FIT dipakai pemeriksa koin
   ===================================================================== */
ok(/PLAYER_FIT = PLAYER_W \+ STEP_PX \* 2/.test(js),
   'ambang kelayakan lorong = badan + satu langkah frame di tiap sisi');
ok(/corridorAt\(y\) < PLAYER_FIT/.test(js),
   'pemeriksa koin memakai PLAYER_FIT, bukan PLAYER_W mentah');
ok(!/corridorAt\([^)]*\) [<>]=? PLAYER_W\b/.test(js),
   'tidak ada lagi perbandingan lorong yang memakai PLAYER_W telanjang');
ok(/STEP_PX = Math\.ceil\(PHYS\.RUN_SPEED \/ 60\)/.test(js),
   'langkah frame diturunkan dari RUN_SPEED (ikut berubah kalau ' +
   'kecepatan lari disetel ulang lewat slider)');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
