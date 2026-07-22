/* Uji: pemain PASTI bisa mendapat senjata (buket) di tiap stage.

   Laporan user: "berkali2 saya main ga ketemu tembakan di stage 1 dan
   stage 6" — padahal verify-shoot lulus. Sebabnya verify-shoot cuma
   menguji buket ada di DAFTAR undian, bukan bahwa kotaknya benar-benar
   ada di level. Dua hal yang sangat berbeda:

     daftar undian  -> "kalau ada kotak, buket mungkin keluar"
     kotak di level -> "ada kotak untuk dipukul"

   spawnPowerup() HANYA dipanggil dari kotak-? ber-item 'power'. Sebelum
   perbaikan, kotak semacam itu cuma lahir di satu cabang placeBlocks,
   pada posisi ke-2, dgn undian 50% — stage bos rata-rata 0.35 kotak dan
   70.5% permainan sama sekali tidak punya.
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
  imageSmoothingEnabled: true, drawImage(){}, fillRect(){}, clearRect(){},
  getImageData: (x,y,a,b) => ({ data: new Uint8ClampedArray(a*b*4) }),
  fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
  closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){} });
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w.ensureBooted();

const DIFFS = ['santai', 'normal', 'sulit'];
const TRIALS = 120;

/* =====================================================================
   1. SETIAP STAGE PUNYA KOTAK POWER-UP — TANPA KECUALI
   ===================================================================== */
console.log('--- jumlah kotak power-up per stage ---');
for (let i = 0; i < w.STAGES.length; i++) {
  let min = 1e9, zero = 0, n = 0, tot = 0;
  for (let t = 0; t < TRIALS; t++) {
    for (const d of DIFFS) {
      const L = w.buildLevel(i, d, 5000 + t * 91);
      const c = L.solids.filter(s => s.item === 'power').length;
      if (c < min) min = c;
      if (c === 0) zero++;
      tot += c; n++;
    }
  }
  const need = w.powerQuotaFor(i);
  ok(zero === 0,
     'STAGE ' + (i + 1) + ' (' + w.STAGES[i].short + '): TIDAK PERNAH nol kotak ' +
     '(' + n + ' percobaan, min ' + min + ', rata2 ' + (tot / n).toFixed(2) + ')');
  ok(min >= need,
     'STAGE ' + (i + 1) + ': jatah minimum ' + need + ' terpenuhi (min ' + min + ')');
}

/* Stage bos dapat jatah lebih besar — di sanalah senjata paling perlu. */
const bossIdx = w.STAGES.findIndex(s => s.boss);
ok(w.powerQuotaFor(bossIdx) > w.powerQuotaFor(0),
   'stage bos dapat jatah LEBIH banyak (' + w.powerQuotaFor(bossIdx) +
   ' vs ' + w.powerQuotaFor(0) + ')');

/* =====================================================================
   2. KOTAK ITU BISA DIPUKUL (bukan tenggelam / di atas jurang)
   ===================================================================== */
console.log('\n--- kotak power-up bisa dijangkau ---');
let badGround = 0, badOverlap = 0, checked = 0;
for (let i = 0; i < w.STAGES.length; i++) {
  for (let t = 0; t < 40; t++) {
    const L = w.buildLevel(i, 'normal', 7000 + t * 53);
    const boxes = L.solids.filter(s => s.item === 'power');
    boxes.forEach(b => {
      checked++;
      /* ada tanah di bawahnya? */
      const onGround = L.ground.some(g => b.x >= g.x && b.x <= g.x + g.w);
      if (!onGround) badGround++;
      /* tidak tenggelam di dalam solid lain? */
      const overlap = L.solids.some(o =>
        o !== b && Math.abs(o.x - b.x) < 8 && Math.abs(o.y - b.y) < 8);
      if (overlap) badOverlap++;
    });
  }
}
ok(checked > 100, 'diperiksa ' + checked + ' kotak power-up');
ok(badGround === 0,
   'semua kotak berdiri di atas tanah, bukan jurang (' + badGround + ' gagal)');
ok(badOverlap === 0,
   'tidak ada kotak yang tenggelam di dalam solid lain (' + badOverlap + ' gagal)');

/* =====================================================================
   3. KOTAK PERTAMA DIJAMIN BUKET
   ===================================================================== */
console.log('\n--- isi kotak: yang pertama dijamin buket ---');

/* Jalankan penentu 'kind' yang ASLI dari spawnPowerup. */
const src = js.slice(js.indexOf('GameScene.prototype.spawnPowerup'),
                     js.indexOf('GameScene.prototype.takeCoin'));
const m = /var kind;([\s\S]*?)var pu = /.exec(src);
ok(!!m, 'blok penentu jenis power-up ditemukan');
function kindFor(scene) {
  const fn = new Function('stageHasBuket', 'self',
    'var kind;' + m[1].replace(/this\./g, 'self.') + 'return kind;');
  return fn(w.stageHasBuket, scene);
}

for (let i = 0; i < w.STAGES.length; i++) {
  const scene = { stageIdx: i, _buketGiven: false };
  const first = kindFor(scene);
  ok(first === 'buket',
     'STAGE ' + (i + 1) + ': kotak PERTAMA memberi buket (bukan undian) -> ' + first);
  ok(scene._buketGiven === true,
     'STAGE ' + (i + 1) + ': penanda _buketGiven tercatat sesudah diberikan');
}

/* Sesudah yang pertama, kembali diundi — variasi tidak hilang. */
const scene2 = { stageIdx: 0, _buketGiven: true };
const seen = new Set();
for (let t = 0; t < 400; t++) seen.add(kindFor(scene2));
ok(seen.size > 1,
   'kotak berikutnya tetap beragam -> ' + JSON.stringify([...seen]));
ok(seen.has('melati'),
   'melati masih bisa keluar (tidak dihapus dari permainan)');

/* =====================================================================
   4. JAMINAN DISETEL ULANG TIAP STAGE
   ===================================================================== */
console.log('\n--- jaminan berlaku per stage ---');
const createSrc = js.slice(js.indexOf('GameScene.prototype.create = function'),
                           js.indexOf('GameScene.prototype.mkLayer'));
ok(/this\._buketGiven = false;/.test(createSrc),
   'create() menyetel ulang _buketGiven — kalau tidak, hanya stage pertama ' +
   'yang dapat jaminan dan sisanya kembali untung-untungan');

/* =====================================================================
   5. PELUANG GAGAL MENDAPAT SENJATA = NOL
   ===================================================================== */
console.log('\n--- hasil akhir ---');
for (let i = 0; i < w.STAGES.length; i++) {
  let noWeapon = 0, n = 0;
  for (let t = 0; t < TRIALS; t++) {
    for (const d of DIFFS) {
      const L = w.buildLevel(i, d, 9000 + t * 71);
      const boxes = L.solids.filter(s => s.item === 'power').length;
      /* pemain memukul kotak-kotak itu berurutan */
      const scene = { stageIdx: i, _buketGiven: false };
      let got = false;
      for (let b = 0; b < boxes; b++) if (kindFor(scene) === 'buket') got = true;
      if (!got) noWeapon++;
      n++;
    }
  }
  ok(noWeapon === 0,
     'STAGE ' + (i + 1) + ' (' + w.STAGES[i].short + '): 0% permainan tanpa senjata ' +
     '(' + noWeapon + '/' + n + ')');
}

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
