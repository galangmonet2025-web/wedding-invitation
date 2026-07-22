/* Uji PEMECAHAN SPRITE:
     1. Pijakan melayang = 3 potong (ujung kiri - tengah - ujung kanan),
        bukan satu sprite persegi yang DIREGANGKAN jadi persegi panjang.
     2. Tanah = 2 lapis: baris PERMUKAAN punya sprite sendiri, terpisah
        dari ISIAN di bawahnya.

   Yang diuji bukan "key-nya ada", tapi apa yang benar-benar DIGAMBAR:
   berapa potong, di koordinat mana, dan tekstur mana yang dipakai tiap
   lapis. Memeriksa nama key saja akan lulus walau gambarnya masih
   diregangkan seperti semula. */
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

const AM = w.ASSET_MAP;
const ent = k => AM.find(m => m.key === k);

/* ================= 1. ENTRI ASSET_MAP ================= */
['t_plat', 't_plat_l', 't_plat_r'].forEach(k => {
  ok(!!ent(k), 'entri ' + k + ' ada di ASSET_MAP');
});
ok(ent('t_plat') && ent('t_plat').w === 32,
   'potongan tengah 32px (bukan 64px yg diregangkan) — dapat ' +
   (ent('t_plat') ? ent('t_plat').w : '-'));
ok(['t_plat','t_plat_l','t_plat_r'].every(k => ent(k) && ent(k).w === 32 && ent(k).h === 32),
   'ketiga potongan seukuran 32x32 (rakitan tidak berjenjang)');
/* label harus membedakan ketiganya di dialog */
const labs = ['t_plat','t_plat_l','t_plat_r'].map(k => ent(k).label);
ok(new Set(labs).size === 3, 'ketiganya berlabel BEDA di dialog (' + labs.join(' | ') + ')');
ok(labs.some(l => /kiri/i.test(l)) && labs.some(l => /kanan/i.test(l)) &&
   labs.some(l => /tengah/i.test(l)),
   'label menyebut kiri / tengah / kanan');

/* tanah: 6 permukaan + 6 isian */
for (let i = 0; i < 6; i++) {
  ok(!!ent('t_gr_top_s' + i), 'entri permukaan tanah stage ' + (i + 1) + ' ada');
}
ok(AM.filter(m => /^t_gr_s\d$/.test(m.key)).length === 6, 'isian tanah tetap 6 stage');
const topLab = ent('t_gr_top_s0').label, fillLab = ent('t_gr_s0').label;
ok(/permukaan/i.test(topLab) && /isian/i.test(fillLab),
   'label membedakan permukaan vs isian ("' + topLab + '" / "' + fillLab + '")');

/* ================= 2. TERKUNCI dari slider ukuran ================= */
['t_plat', 't_plat_l', 't_plat_r', 't_gr_top_s0', 't_gr_s0'].forEach(k => {
  ok(w.scalable(k) === false,
     k + ' terkunci dari slider ukuran (posisinya dipatok grid level)');
});

/* ================= 3. drawPlatform: 3 POTONG, bukan diregangkan ==== */
const drawn = [];
function fakeObj(kind) {
  const o = {
    kind,
    setOrigin(){ return o; }, setDepth(){ return o; },
    setDisplaySize(ww, hh){ o.w = ww; o.h = hh; return o; },
    setVisible(v){ o.visible = v; return o; },
    setScale(sx, sy){ o.sx = sx; o.sy = sy; return o; },
    refreshBody(){ return o; }, setData(){ return o; }
  };
  return o;
}
const textures = { t_plat: 1, t_plat_l: 1, t_plat_r: 1 };
const scene = {
  textures: { exists: k => !!textures[k] },
  add: {
    image: (x, y, key) => { const o = fakeObj('image'); o.x = x; o.y = y; o.key = key;
                            drawn.push(o); return o; },
    tileSprite: (x, y, ww, hh, key) => { const o = fakeObj('tile'); o.x = x; o.y = y;
                            o.w = ww; o.h = hh; o.key = key; drawn.push(o); return o; }
  }
};

/* pijakan 6 tile = 192px */
w.GameScene.prototype.drawPlatform.call(scene, 100, 200, 192);
ok(drawn.length === 3, 'pijakan panjang digambar 3 potong (dapat ' + drawn.length + ')');
ok(drawn[0].key === 't_plat_l', 'potong pertama = ujung KIRI (' + drawn[0].key + ')');
ok(drawn[1].key === 't_plat' && drawn[1].kind === 'tile',
   'bagian tengah = tileSprite berulang (' + drawn[1].key + '/' + drawn[1].kind + ')');
ok(drawn[2].key === 't_plat_r', 'potong terakhir = ujung KANAN (' + drawn[2].key + ')');
/* ujung digambar SEUKURAN ASLI, tidak melar */
ok(drawn[0].w === 32 && drawn[2].w === 32,
   'kedua ujung berukuran 32px (tidak diregangkan) — ' +
   drawn[0].w + ' & ' + drawn[2].w);
/* potongan menutup PERSIS selebar pijakan, tanpa celah & tanpa lewat */
ok(drawn[1].x === 132 && drawn[1].w === 128,
   'tengah mengisi sisa persis (x=' + drawn[1].x + ', w=' + drawn[1].w + ')');
ok(drawn[2].x + drawn[2].w === 100 + 192,
   'ujung kanan berakhir tepat di tepi pijakan (' +
   (drawn[2].x + drawn[2].w) + ' vs ' + (100 + 192) + ')');

/* pijakan PENDEK (1 tile) tidak boleh dipaksa 3 potong */
drawn.length = 0;
w.GameScene.prototype.drawPlatform.call(scene, 0, 0, 32);
ok(drawn.length === 1, 'pijakan 1 tile: cukup 1 potong (dapat ' + drawn.length + ')');

/* tanpa tekstur ujung -> pakai tengah, JANGAN bolong */
drawn.length = 0;
delete textures.t_plat_l; delete textures.t_plat_r;
w.GameScene.prototype.drawPlatform.call(scene, 0, 0, 192);
ok(drawn.length === 3 && drawn.every(o => o.key === 't_plat'),
   'tanpa sprite ujung: ketiganya pakai tengah (tidak bolong)');
textures.t_plat_l = 1; textures.t_plat_r = 1;

/* tanpa tekstur tengah -> tidak menggambar apa pun (bukan exception) */
drawn.length = 0;
delete textures.t_plat;
let threw = false;
try { w.GameScene.prototype.drawPlatform.call(scene, 0, 0, 192); } catch (e) { threw = true; }
ok(!threw && drawn.length === 0,
   'tanpa tekstur sama sekali: diam, bukan exception');
textures.t_plat = 1;

/* ================= 4. create(): lapis tanah memakai kunci BEDA ===== */
const cr = js.slice(js.indexOf('GameScene.prototype.create = function'),
                    js.indexOf('GameScene.prototype.create = function') + 14000);
ok(/var gTop = scene_texKey\(this, 't_gr_top_s'/.test(cr),
   'create() mengambil tekstur PERMUKAAN terpisah');
ok(/platforms\.create\([^)]*gTop\)/.test(cr),
   'baris permukaan (yang dipijak) memakai gTop');
ok(/tileSprite\(seg\.x, GY \+ TILE, segW2, fillH, gTex\)/.test(cr),
   'isian di bawahnya tetap memakai gTex — jadi dua lapis benar-benar beda');
ok(/if \(!this\.textures\.exists\(gTop\)\) gTop = gTex;/.test(cr),
   'kalau tekstur permukaan tak ada -> jatuh ke isian (tanah tak bolong)');

/* pijakan: badan fisik disembunyikan supaya tidak menimpa rakitan */
ok(/obj\.setVisible\(false\);\s*\n\s*this\.drawPlatform\(/.test(cr),
   'sprite fisik pijakan disembunyikan, digantikan rakitan 3 potong');
ok(/setScale\(s\.w \/ TILE, 1\)\.refreshBody\(\)/.test(cr),
   'HITBOX pijakan tidak berubah (masih selebar pijakan penuh)');

/* ================= 5. tekstur prosedural cadangan dibuat ========== */
ok(/makeArtTexture\(scene, 't_plat_l'/.test(js) &&
   /makeArtTexture\(scene, 't_plat_r'/.test(js),
   'ada tekstur prosedural cadangan utk kedua ujung');
ok(/makeArtTexture\(scene, 't_gr_top_s' \+ sIdx/.test(js),
   'ada tekstur prosedural cadangan utk permukaan tanah tiap stage');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
