/* Uji PEMOTONGAN: apakah assetToTexture() benar-benar mengambil piksel
   yang benar dari sprite-sheet.png, dan apakah penggantian mengubahnya.

   Memakai sheet ASLI, dan mencatat argumen drawImage() yang dipanggil
   engine, lalu membandingkannya dengan koordinat di sprite-map.json. */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const P = require('./assets/png.cjs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('index.js', 'utf8');
const json = JSON.parse(fs.readFileSync('assets/sprite-map.json', 'utf8'));
const sheet = P.readPNG('assets/sprite-sheet.png');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;

let calls = [];
w.HTMLCanvasElement.prototype.getContext = function () {
  return {
    imageSmoothingEnabled: true,
    drawImage: (...a) => calls.push(a),
    getImageData: (x, y, ww, hh) => ({ data: new Uint8ClampedArray(ww * hh * 4) }),
    fillRect() {}, clearRect() {}, fillText() {}, save() {}, restore() {},
    translate() {}, scale() {}, beginPath() {}, closePath() {}, fill() {},
    stroke() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {}
  };
};
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {},
                        addEventListener() {}, removeEventListener() {} });
w.eval(js);

/* Palsukan "sheet sudah dimuat": objek mirip <img> dengan ukuran asli. */
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

/* Scene tiruan: cukup textures.exists/addCanvas. */
const added = {};
const scene = {
  textures: {
    exists: k => !!added[k],
    addCanvas: (k, cv) => { added[k] = cv; },
    remove: k => { delete added[k]; }
  }
};

const AM = w.ASSET_MAP;

/* ---- 1. tiap entri menghasilkan tekstur ---- */
let made = 0, failedKeys = [];
AM.forEach(m => {
  calls = [];
  if (w.assetToTexture(scene, m)) made++; else failedKeys.push(m.key);
});
ok(made === AM.length,
   'semua ' + AM.length + ' entri jadi tekstur (dapat ' + made + ')' +
   (failedKeys.length ? ' gagal: ' + failedKeys.join(',') : ''));

/* ---- 2. koordinat drawImage = koordinat di peta ---- */
let wrong = [];
AM.forEach(m => {
  if (m.stack) return;                 /* stack menggambar berkali-kali */
  delete added[m.key];
  calls = [];
  w.assetToTexture(scene, m);
  if (!calls.length) { wrong.push(m.key + ' (tidak menggambar)'); return; }
  const [, sx, sy, sw, sh] = calls[0];
  /* Bandingkan dgn sumber EFEKTIF, bukan bawaan ASSET_MAP: sebagian key
     sudah punya penggantian ter-bake di SWAP_DEF (mis. t_gr_s0 -> #615),
     dan itu memang yang seharusnya dipotong. */
  const eff = w.effectiveSrc(m);
  const gr = json.groups[eff.grp];
  const f = gr.frames[eff.f || 0];
  if (m.fill) {
    /* Tile ber-fill:true memakai drawCover(): sumber NON-PERSEGI sengaja
       DIPOTONG di tengah supaya tidak melar saat dipaksa ke petak 32x32
       (dulu 48x5 jadi coreng). Jadi yang benar di sini bukan "ambil
       seluruh rangka", melainkan: potongan berada DI DALAM rangka, dan
       rasionya sama dgn kotak tujuan. */
    const inside = sx >= f.x - 0.01 && sy >= f.y - 0.01 &&
                   sx + sw <= f.x + f.w + 0.01 && sy + sh <= f.y + f.h + 0.01;
    const sz = w.sizeOf(m);
    const ratioOk = Math.abs((sw / sh) - (sz.w / sz.h)) < 0.05;
    if (!inside || !ratioOk) {
      wrong.push(m.key + ' potongan (' + sx + ',' + sy + ',' + sw + ',' + sh +
                 ') di luar rangka / rasio melar');
    }
    return;
  }
  if (sx !== f.x || sy !== f.y || sw !== f.w || sh !== f.h) {
    wrong.push(m.key + ' ambil (' + sx + ',' + sy + ',' + sw + ',' + sh +
               ') seharusnya (' + f.x + ',' + f.y + ',' + f.w + ',' + f.h + ')');
  }
});
ok(wrong.length === 0, 'potongan sesuai peta' + (wrong.length ? ' -> ' + wrong.join('; ') : ''));

/* ---- 3. potongan berisi piksel NYATA (bukan area kosong sheet) ---- */
let blank = [];
AM.forEach(m => {
  const gr = json.groups[m.grp];
  const f = gr.frames[m.f || 0];
  let any = false;
  for (let y = 0; y < f.h && !any; y++)
    for (let x = 0; x < f.w; x++)
      if (sheet.data[((f.y + y) * sheet.w + (f.x + x)) * 4 + 3] > 8) { any = true; break; }
  if (!any) blank.push(m.key);
});
ok(blank.length === 0, 'tiap potongan berisi gambar' +
   (blank.length ? ' -> kosong: ' + blank.join(',') : ''));

/* ---- 4. tile 'fill' TIDAK rata-bawah (harus penuhi kanvas) ---- */
const tile = AM.find(m => m.fill);
delete added[tile.key]; calls = [];
w.assetToTexture(scene, tile);
const [, , , , , dx, dy, dw2, dh2] = calls[0];
ok(dx === 0 && dy === 0 && dw2 === tile.w && dh2 === tile.h,
   'tile "' + tile.key + '" digambar penuh 0,0 ' + tile.w + 'x' + tile.h +
   ' (dapat ' + dx + ',' + dy + ' ' + dw2 + 'x' + dh2 + ')');

/* ---- 5. sprite biasa RATA BAWAH (kaki menyentuh dasar) ---- */
const ch = AM.find(m => m.key === 't_groom_idle0');
delete added[ch.key]; calls = [];
w.assetToTexture(scene, ch);
const c5 = calls[0];
/* Tingginya diambil dari sizeOf(), BUKAN dari ch.h. ch.h itu tinggi pada
   skala 1,0; pemain kini dikecilkan 0,9x lewat SCALE_DEF, jadi kanvas
   teksturnya memang lebih pendek. Yang harus dijaga adalah "kaki sprite
   menyentuh dasar kanvas" — berapa pun tinggi kanvasnya. */
const chH = w.sizeOf(ch).h;
ok(c5[6] + c5[8] === chH,
   'sprite pemain rata bawah (y+tinggi = ' + (c5[6] + c5[8]) + ' = ' + chH + ')');

/* ---- 6. skala seragam: tidak gepeng ---- */
const kx = c5[7] / c5[3], ky = c5[8] / c5[4];
ok(Math.abs(kx - ky) < 0.001, 'skala seragam (kx=' + kx.toFixed(3) + ' ky=' + ky.toFixed(3) + ')');

/* ---- 7. PENGGANTIAN benar-benar mengubah potongan ---- */
const key = 't_groom_idle0';
const ent = AM.find(m => m.key === key);
delete added[key]; calls = [];
w.assetToTexture(scene, ent);
const asli = calls[0].slice(1, 5).join(',');

w.SWAP[key] = { grp: 'Main Characters/Virtual Guy/Idle', f: 0 };
delete added[key]; calls = [];
w.assetToTexture(scene, ent);
const baru = calls[0].slice(1, 5).join(',');
const vg = json.groups['Main Characters/Virtual Guy/Idle'].frames[0];
ok(asli !== baru, 'penggantian mengubah potongan (' + asli + ' -> ' + baru + ')');
ok(baru === [vg.x, vg.y, vg.w, vg.h].join(','),
   'potongan baru = koordinat Virtual Guy/Idle #' + vg.i);
delete w.SWAP[key];

/* ---- 8. penggantian ke kelompok tak dikenal -> jatuh ke bawaan ---- */
w.SWAP[key] = { grp: 'Kelompok/Tidak/Ada', f: 0 };
const effBad = w.effectiveSrc(ent);
ok(effBad.grp === ent.grp, 'penggantian ke kelompok tak dikenal jatuh ke bawaan');
delete w.SWAP[key];

/* ---- 9. frame di luar jangkauan dijepit, bukan crash ---- */
const clamped = w.sheetFrame('Main Characters/Ninja Frog/Idle', 9999);
ok(clamped && clamped.w > 0, 'frame di luar jangkauan dijepit ke frame terakhir');

/* ---- 10. tanpa sheet -> false, bukan exception ---- */
const savedImg = w._assetImg.sheet;
w._assetImg.sheet = null;
delete added[key];
let threw = false, r;
try { r = w.assetToTexture(scene, ent); } catch (e) { threw = true; }
ok(!threw && r === false, 'tanpa sheet: kembalikan false tanpa exception');
w._assetImg.sheet = savedImg;

/* ---- 11. stack (tiang) menggambar berulang & dasar padat ---- */
const pipe = AM.find(m => m.key === 't_pipe128');
delete added[pipe.key]; calls = [];
w.assetToTexture(scene, pipe);
ok(calls.length >= 2, 'tiang tinggi ditumpuk (' + calls.length + ' gambar)');
const bottom = calls[0];
ok(bottom[6] + bottom[8] === pipe.h,
   'blok pertama menyentuh dasar tiang (' + (bottom[6] + bottom[8]) + '=' + pipe.h + ')');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
