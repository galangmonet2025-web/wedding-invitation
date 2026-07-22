/* Uji MUAT ULANG / ULANG STAGE berkali-kali.

   Gejala yang dikejar: "game jadi suka crash, sudah restart tapi masih
   stuck/diam". Penyebab semacam ini hampir selalu SISA dari ronde
   sebelumnya — animasi atau tekstur yang tidak ikut dibuang, lalu
   ditunjuk lagi di ronde berikutnya. Karena itu yang diuji di sini
   bukan sekali jalan, tapi SIKLUS purge -> bangun -> purge -> bangun. */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const P = require('./assets/png.cjs');

const js = fs.readFileSync('index.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sheet = P.readPNG('assets/sprite-sheet.png');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  OK  ' : 'GAGAL ') + m); if (!c) fail++; };

const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://example.test/' });
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = function () {
  return {
    imageSmoothingEnabled: true, drawImage(){}, clearRect(){}, fillRect(){},
    getImageData: (x, y, a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }),
    fillText(){}, save(){}, restore(){}, translate(){}, scale(){}, beginPath(){},
    closePath(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, arc(){}, rect(){}
  };
};
w.Phaser = undefined;
w.requestAnimationFrame = cb => setTimeout(() => cb(1), 0);
w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){},
                        addEventListener(){}, removeEventListener(){} });
w.eval(js);
w._assetImg.sheet = { width: sheet.w, height: sheet.h, nodeName: 'IMG' };

/* ---- scene tiruan dengan daftar tekstur & animasi yang bisa dilacak ---- */
const textures = {}, anims = {};
const scene = {
  sys: { isActive: () => true },
  textures: {
    exists: k => !!textures[k],
    addCanvas: (k, cv) => { textures[k] = cv || { width: 1, height: 1 }; },
    get: k => textures[k],
    remove: k => { delete textures[k]; },
    getTextureKeys: () => Object.keys(textures)
  },
  anims: {
    exists: n => !!anims[n],
    get: n => anims[n],
    create: cfg => { anims[cfg.key] = { key: cfg.key, frames: cfg.frames }; },
    remove: n => { delete anims[n]; }
  },
  make: {
    graphics: () => {
      const g = {
        fillStyle: () => g, fillRect: () => g, clear: () => g, lineStyle: () => g,
        strokeRect: () => g, beginPath: () => g, closePath: () => g,
        fillPath: () => g, strokePath: () => g, moveTo: () => g, lineTo: () => g,
        fillCircle: () => g, fillTriangle: () => g, destroy: () => g,
        generateTexture: (k) => { textures[k] = { width: 1, height: 1 }; return g; }
      };
      return g;
    }
  }
};

/* satu "ronde" = persis urutan di GameScene.create():
   purge -> applySheetTextures -> buildTextures */
function ronde() {
  w.purgeArtTextures(scene);
  w.applySheetTextures(scene);
  w.buildTextures(scene);
}

/* ---- 1. tiga ronde berturut-turut tanpa exception ---- */
let threw = null;
try { ronde(); ronde(); ronde(); } catch (e) { threw = e; }
ok(!threw, 'tiga kali muat ulang tanpa exception' +
   (threw ? ' -> ' + threw.message : ''));

/* ---- 2. TIDAK ADA animasi yang menunjuk tekstur yang sudah hilang ----
   Inilah bentuk "stuck/diam" yang sesungguhnya: Phaser gagal saat
   memutar animasi yang rangkanya sudah dihapus, update() berhenti,
   dan layar membeku. Restart tidak menolong kalau sisanya tidak
   ikut dibuang. */
function danglingAnims() {
  const bad = [];
  for (const n in anims) {
    const fr = anims[n].frames || [];
    fr.forEach(f => {
      const k = f.key || f;
      if (!textures[k]) bad.push(n + ' -> ' + k);
    });
  }
  return bad;
}
let dang = danglingAnims();
ok(dang.length === 0, 'tidak ada animasi menunjuk tekstur terhapus' +
   (dang.length ? ' -> ' + dang.slice(0, 6).join(', ') : ''));

/* ---- 3. purge benar-benar membuang animasi WUJUD power-up ----
   Tekstur wujud bernama "t_groom_*__pwX" ikut terhapus oleh purge
   (diawali "t_"), jadi animasinya WAJIB ikut dibuang juga. */
ronde();
const pwAnimsBefore = Object.keys(anims).filter(n => /__pw/.test(n));
ok(pwAnimsBefore.length > 0,
   'animasi wujud power-up memang terdaftar (' + pwAnimsBefore.length + ')');
w.purgeArtTextures(scene);
const pwAnimsAfter = Object.keys(anims).filter(n => /__pw/.test(n));
const pwTexAfter = Object.keys(textures).filter(k => /__pw/.test(k));
ok(pwTexAfter.length === 0,
   'purge membuang tekstur wujud (' + pwTexAfter.length + ' tersisa)');
ok(pwAnimsAfter.length === 0,
   'purge JUGA membuang animasi wujud — kalau tidak, ronde berikutnya ' +
   'memutar animasi yang rangkanya sudah hilang (' +
   pwAnimsAfter.length + ' tersisa: ' + pwAnimsAfter.slice(0, 3).join(', ') + ')');

/* ---- 4. sesudah purge+bangun lagi, semuanya utuh kembali ---- */
w.applySheetTextures(scene); w.buildTextures(scene);
dang = danglingAnims();
ok(dang.length === 0, 'sesudah dibangun ulang, tidak ada rangka yang menggantung' +
   (dang.length ? ' -> ' + dang.slice(0, 6).join(', ') : ''));

/* ---- 5. jumlah tekstur tidak MEMBENGKAK tiap ronde (kebocoran) ---- */
const n1 = Object.keys(textures).length;
ronde();
const n2 = Object.keys(textures).length;
ronde();
const n3 = Object.keys(textures).length;
ok(n2 === n3 && n1 === n2,
   'jumlah tekstur stabil tiap ronde (' + n1 + ' / ' + n2 + ' / ' + n3 + ')');

/* ---- 6. animasi pemain ADA sesudah muat ulang ---- */
['groom_idle', 'groom_run'].forEach(n => {
  ok(!!anims[n], 'animasi "' + n + '" ada sesudah muat ulang');
});

/* ---- 7. playSlot tidak melempar walau wujud belum siap ----
   Sprite tiruan yang scene-nya belum punya animasi wujud sama sekali. */
const bare = { scene: scene, anims: {}, texture: { key: 't_groom_idle0' },
  play(){}, setTexture(){},
  body: { velocity:{x:0,y:0}, blocked:{down:true}, touching:{down:true} } };
w.runState = w.freshRun();
w.runState.powerup = 'cincin';
let threw2 = null;
try { w.playSlot(bare, 'player_idle'); w.playSlot(bare, 'player_jump'); }
catch (e) { threw2 = e; }
ok(!threw2, 'playSlot aman saat wujud power-up belum terdaftar' +
   (threw2 ? ' -> ' + threw2.message : ''));
w.runState.powerup = null;

/* ---- 8. hurtPlayer TIDAK menimpa rangka "kena" ----
   p.setTexture('t_groom_hurt') lalu refreshPlayerSkin() akan langsung
   menggantinya dengan idle/lari — rangka kena jadi tak pernah terlihat. */
const hurtIdx = js.indexOf("setTexture('t_groom_hurt')");
const seg = js.slice(hurtIdx, hurtIdx + 400);
ok(!/refreshPlayerSkin\(p\)/.test(seg) ||
   /player_hurt/.test(seg),
   'rangka "kena" tidak langsung ditimpa idle/lari oleh refreshPlayerSkin');

/* ---- 9. playSlot BENAR-BENAR memasang rangka statis ----
   hurtPlayer() sekarang memakai playSlot(p,'player_hurt') alih-alih
   setTexture() langsung. Kalau playSlot tidak memasang tekstur apa pun
   untuk slot statis, rangka "kena" hilang diam-diam — tidak ada error,
   cuma pemain yang tidak pernah terlihat terluka. */
function fakeSprite(startKey) {
  const s = {
    scene: scene, anims: {}, texture: { key: startKey },
    played: [], texSet: [],
    play(n) { s.played.push(n); },
    setTexture(k) { s.texSet.push(k); s.texture = { key: k }; },
    body: { velocity:{x:0,y:0}, blocked:{down:true}, touching:{down:true} }
  };
  return s;
}
w.runState = w.freshRun();
const sp1 = fakeSprite('t_groom_idle0');
w.playSlot(sp1, 'player_hurt', false);
ok(sp1.texSet.length === 1 && sp1.texSet[0] === 't_groom_hurt',
   'tokoh dasar: playSlot("player_hurt") memasang t_groom_hurt (dapat ' +
   (sp1.texSet[0] || 'TIDAK ADA') + ')');

/* dengan power-up aktif, yang dipasang versi tokohnya */
w.runState.powerup = 'cincin';
const sp2 = fakeSprite('t_groom_idle0');
w.playSlot(sp2, 'player_hurt', false);
ok(sp2.texSet.length === 1 && /^t_groom_hurt__pw/.test(sp2.texSet[0] || ''),
   'dengan power-up: rangka kena memakai wujud tokohnya (' +
   (sp2.texSet[0] || 'TIDAK ADA') + ')');
w.runState.powerup = null;

/* slot statis lain juga: lompat & jatuh */
['player_jump', 'player_fall'].forEach(id => {
  const sp = fakeSprite('t_groom_idle0');
  w.playSlot(sp, id, false);
  ok(sp.texSet.length === 1,
     'slot statis "' + id + '" memasang teksturnya (' +
     (sp.texSet[0] || 'TIDAK ADA') + ')');
});

/* slot BERANIMASI tetap lewat play(), bukan setTexture */
const sp3 = fakeSprite('t_groom_idle0');
w.playSlot(sp3, 'player_run', false);
ok(sp3.played.length === 1 && sp3.texSet.length === 0,
   'slot beranimasi tetap memakai play(), bukan setTexture');

console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
process.exit(fail ? 1 : 0);
