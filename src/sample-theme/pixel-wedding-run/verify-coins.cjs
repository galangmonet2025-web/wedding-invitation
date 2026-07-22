/* AUDIT: bangun banyak level sungguhan, lalu cari koin/kepingan yang
   TIDAK BISA DIAMBIL.

   Tidak boot Phaser — hanya menjalankan generator level, yang murni
   perhitungan. Aturan yang diperiksa:

     1. koin lebih tinggi dari batas jangkauan lompat DARI TANAH, dan
        tidak ada pijakan/blok tepat di bawahnya untuk berpijak;
     2. koin BERTABRAKAN dengan blok padat (tenggelam di dalam bata);
     3. koin persis di atas blok tapi jaraknya < tinggi pemain, sehingga
        kepala membentur blok sebelum menyentuh koin.
*/
const fs = require('fs');
const { JSDOM } = require('jsdom');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

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

const TILE = 32;
const PLAYER_H = 54;          /* tinggi body pemain */
const PICK_R = 22;            /* radius ambil koin (longgar) */

let total = 0, bad = [];
const kinds = {};

const NSTAGE = w.STAGES ? w.STAGES.length : 6;
for (let s = 0; s < NSTAGE; s++) {
  for (let seed = 0; seed < 40; seed++) {
    let L;
    try { L = w.buildLevel(s, 'normal', seed); } catch (e) {
      console.log('buildLevel gagal:', e.message); process.exit(1);
    }
    const GY = w.CONFIG_GROUND_Y();
    const H_REACH = w.H_REACH;

    /* kumpulkan permukaan yang bisa dipijak: tanah + blok + platform */
    /* Kotak WAJIB sama dengan yang dipakai engine & fixCoinReachability:
       pipa 64 x ph (bukan 32x32 — kesalahan ini membuat audit menandai
       koin di atas pipa sebagai "tidak terjangkau" padahal pipa itulah
       pijakannya). */
    const solids = (L.solids || []).map(o => {
      if (o.kind === 'pipe') return { l: o.x, r: o.x + 64, t: o.y, b: o.y + o.ph, kind: o.kind };
      if (o.kind === 'plat') return { l: o.x, r: o.x + o.w, t: o.y, b: o.y + 14, kind: o.kind };
      return { l: o.x, r: o.x + TILE, t: o.y, b: o.y + TILE, kind: o.kind };
    });

    for (const c of (L.coins || [])) {
      total++;
      const heightAboveGround = GY - c.y;

      /* pijakan tertinggi tepat DI BAWAH koin */
      let standY = GY;
      for (const s2 of solids) {
        if (c.x >= s2.l && c.x <= s2.r && s2.t >= c.y) {
          if (s2.t < standY) standY = s2.t;
        }
      }
      const reachFromStand = (standY - c.y);

      /* 1. terlalu tinggi dari pijakan mana pun */
      if (reachFromStand > H_REACH) {
        bad.push({ s, seed, why: 'terlalu tinggi', x: Math.round(c.x),
                   need: Math.round(reachFromStand), max: Math.round(H_REACH) });
        kinds['terlalu tinggi'] = (kinds['terlalu tinggi'] || 0) + 1;
        continue;
      }
      /* 2. tenggelam di dalam / menempel pada blok padat.

         Batasnya dilonggarkan sebesar COIN_R ke SEMUA arah, bukan
         perbandingan ketat > dan <. Versi lama memakai c.y > s2.t, jadi
         koin yang jatuh PERSIS di permukaan papan (c.y === s2.t) lolos
         tanpa ditandai — padahal itulah kasus nyata yang terlihat di
         layar: koin tertanam di dalam papan pijakan karena H_PLAT dan
         H_PLAT2 sama-sama ter-clamp ke H_REACH. Uji yang tidak
         menangkap bug yang kelihatan mata jelas terlalu longgar. */
      const COIN_R = 10;            /* separuh badan koin */
      let inside = false, hitKind = '';
      for (const s2 of solids) {
        if (c.x + COIN_R > s2.l && c.x - COIN_R < s2.r &&
            c.y + COIN_R > s2.t && c.y - COIN_R < s2.b) {
          inside = true; hitKind = s2.kind; break;
        }
      }
      if (inside) {
        bad.push({ s, seed, why: 'di dalam blok (' + hitKind + ')', x: Math.round(c.x),
                   y: Math.round(c.y) });
        kinds['di dalam blok'] = (kinds['di dalam blok'] || 0) + 1;
        continue;
      }
      /* 2b. TERJEPIT MENDATAR: koin berada di lorong yang lebih sempit
         daripada badan pemain.

         Ini yang lolos dari audit sebelumnya (dilaporkan dgn screenshot:
         "koin tidak bisa diambil dari atas maupun dari bawah"). Uji lama
         hanya memeriksa tumpang tindih TEGAK dengan blok — koin di celah
         1-tile antara dua bata lolos, padahal celah 32px itu cuma
         menyisakan 1px per sisi untuk badan pemain selebar 30px. Blok di
         kiri-kanan pada ketinggian yang sama = tidak terjangkau dari
         arah mana pun. */
      const PLAYER_W = 30, PLAYER_H = 54;
      const cTop = c.y - PLAYER_H / 2, cBot = c.y + PLAYER_H / 2;
      let lEdge = -1e9, rEdge = 1e9;
      for (const s2 of solids) {
        if (s2.b <= cTop || s2.t >= cBot) continue;   /* tidak sejajar */
        if (s2.r <= c.x && s2.r > lEdge) lEdge = s2.r;
        if (s2.l >= c.x && s2.l < rEdge) rEdge = s2.l;
      }
      const corridor = rEdge - lEdge;
      if (corridor < PLAYER_W) {
        bad.push({ s, seed, why: 'terjepit mendatar', x: Math.round(c.x),
                   y: Math.round(c.y), gap: Math.round(corridor) });
        kinds['terjepit mendatar'] = (kinds['terjepit mendatar'] || 0) + 1;
        continue;
      }

      /* 3. ada blok tepat DI ATAS koin, terlalu rapat untuk kepala masuk */
      let ceil = -1e9;
      for (const s2 of solids) {
        if (c.x > s2.l && c.x < s2.r && s2.b <= c.y) {
          if (s2.b > ceil) ceil = s2.b;
        }
      }
      if (ceil > -1e8 && (c.y - ceil) < PICK_R) {
        bad.push({ s, seed, why: 'terhimpit blok di atas', x: Math.round(c.x),
                   gap: Math.round(c.y - ceil) });
        kinds['terhimpit blok di atas'] = (kinds['terhimpit blok di atas'] || 0) + 1;
      }
    }
  }
}

const pct = total ? (bad.length / total * 100).toFixed(2) : '0.00';
console.log((bad.length === 0 ? '  OK  ' : 'GAGAL ') +
            'semua koin bisa diambil — ' + total + ' koin diperiksa, ' +
            bad.length + ' gagal (' + pct + '%)');
for (const k in kinds) console.log('        ' + k + ': ' + kinds[k]);
if (bad.length) {
  console.log('\ncontoh:');
  bad.slice(0, 8).forEach(b => console.log('  stage', b.s, 'seed', b.seed,
    '| x=' + b.x, '|', b.why,
    b.need ? '(butuh ' + b.need + ' > ' + b.max + ')' : '',
    b.gap !== undefined ? '(celah ' + b.gap + 'px)' : ''));
}
process.exit(bad.length ? 1 : 0);
