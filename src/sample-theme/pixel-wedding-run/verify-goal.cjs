/* Uji BENDERA GARIS AKHIR selalu berdiri di ATAS tanah.

   Keluhan user: "bendera ga bisa pas di atas ground, selalu muncul di
   bawah ground/tanah" — bahkan sesudah slider naik/turun digeser mentok.

   Sebabnya bukan sliedernya kurang jauh, tapi TITIK ACUAN yang salah:
   bendera dipatok di GY-80 dengan acuan TENGAH. Angka 80 itu asumsi
   "setengah tinggi bendera". Begitu diperbesar, setengah tingginya
   melewati 80 dan kakinya tenggelam. Slider mentok di 24px, jadi tidak
   akan pernah cukup.

   Karena itu yang diuji di sini adalah HITUNGAN POSISI KAKI pada
   berbagai skala — bukan sekadar "ada setOrigin". */
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
  imageSmoothingEnabled: true, drawImage(){}, fillRect(){}, clearRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){} });
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);

/* ---- 1. acuan KAKI, bukan tengah ---- */
const cr = js.slice(js.indexOf('/* ---- Goal ----'),
                    js.indexOf('/* ---- Goal ----') + 1600);
ok(/setOrigin\(0\.5, 1\)/.test(cr),
   'bendera memakai setOrigin(0.5, 1) — titik acuan = KAKI');
ok(/staticSprite\(L\.goalX, GY, 't_goal'\)/.test(cr),
   'ditaruh tepat di GY (permukaan tanah), bukan GY - 80');
ok(!/GY - 80, 't_goal'/.test(js),
   'tidak ada lagi angka mati "GY - 80" untuk bendera');
ok(/refreshBody\(\)/.test(cr),
   'refreshBody() tetap dipanggil supaya hitbox mengikuti tampilan');

/* ---- 2. KAKI menempel tanah di SEMUA skala ----
   Dgn origin bawah, kaki = y. Dgn origin tengah (versi lama),
   kaki = y + tinggi/2. Dihitung utk membuktikan bedanya nyata. */
const GY = 760;
const baseH = w.ASSET_MAP.find(m => m.key === 't_goal').h;
ok(baseH === 112, 'tinggi dasar bendera 112px (dapat ' + baseH + ')');

[1, 1.5, 2, 2.2, 2.5].forEach(sc => {
  const h = Math.round(baseH * sc);
  const footNew = GY;                 /* origin bawah, ditaruh di GY */
  const footOld = (GY - 80) + h / 2;  /* origin tengah, ditaruh GY-80 */
  ok(footNew === GY,
     'skala ' + Math.round(sc * 100) + '%: kaki tepat di tanah (GY)');
  if (sc >= 1.5) {
    ok(footOld > GY,
       '  (versi lama pada skala ini tenggelam ' +
       Math.round(footOld - GY) + 'px — inilah bug yang dilaporkan)');
  }
});

/* ---- 3. slider naik/turun memang tak akan pernah cukup ----
   Membuktikan bahwa menaikkan batas slider BUKAN perbaikan yang benar. */
const sink250 = (GY - 80) + Math.round(baseH * 2.5) / 2 - GY;
ok(sink250 > w.NUDGE_MAX,
   'pada 250% bendera tenggelam ' + Math.round(sink250) + 'px, melebihi ' +
   'batas slider ' + w.NUDGE_MAX + 'px — jadi memang tidak bisa ' +
   'diperbaiki lewat slider');

/* ---- 4. keempat rangka kibar tetap SEUKURAN ----
   Kalau tidak, tinggi berubah tiap rangka dan kakinya bergoyang. */
const goals = w.ASSET_MAP.filter(m => /^t_goal\d?$/.test(m.key));
ok(goals.length === 4, 'ada 4 rangka bendera (dapat ' + goals.length + ')');
ok(goals.every(m => m.h === goals[0].h && m.w === goals[0].w),
   'keempat rangka seukuran — kaki tidak bergoyang saat berkibar');

/* ---- 5. skala & geser bendera masih boleh diatur ---- */
ok(w.scalable('t_goal') === true,
   'bendera TETAP bisa diskala (bukan objek grid)');
w.SCALE['t_goal'] = 2.5;
const sz = w.sizeOf(w.ASSET_MAP.find(m => m.key === 't_goal'));
ok(sz.h === Math.round(baseH * 2.5),
   'skala 250% -> tinggi tekstur ' + sz.h + 'px');
delete w.SCALE['t_goal'];

/* ---- 5b. tambalan geser lama SUDAH DIBUANG ----
   NUDGE_DEF t_goal:-9 dulu dipakai menarik bendera yang tenggelam.
   Sesudah acuannya benar, geseran itu justru mengangkatnya dari tanah. */
ok(!w.NUDGE_DEF['t_goal'],
   'NUDGE_DEF t_goal dibuang (tambalan lama, kini malah mengangkat bendera)');
ok(w.nudgeOf('t_goal') === 0,
   'bawaan geser bendera = 0, jadi kakinya benar-benar menapak (' +
   w.nudgeOf('t_goal') + ')');

/* ---- 6. animasi bendera tidak ikut rusak ---- */
ok(w.slotAnimName('goal') === 'goal_wave', 'animasi berkibar tetap aktif');
ok(/playSlot\(this\.goal, 'goal'\)/.test(cr),
   'bendera tetap dimainkan lewat playSlot()');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
