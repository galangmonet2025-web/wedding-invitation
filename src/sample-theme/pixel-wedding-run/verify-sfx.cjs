/* Uji TOMBOL EFEK SUARA.

   Yang diuji bukan "flag-nya berubah", tapi apakah OSILATOR benar-benar
   berhenti dibuat. Memeriksa flag saja akan lulus walaupun bunyinya
   tetap terdengar — persis keluhan "tombolnya tidak berfungsi".

   Juga diuji pemisahan tegas: tombol ini TIDAK boleh menyentuh backsound
   host (#btn-toggle-music) — itu milik host, tema cuma boleh mengkliknya
   lewat tombol musik yang terpisah. */
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

/* AudioContext tiruan yang MENGHITUNG osilator yang benar-benar dibuat */
let oscCount = 0;
function FakeCtx() {
  this.state = 'running';
  this.currentTime = 0;
  this.destination = {};
}
FakeCtx.prototype.resume = function () {};
FakeCtx.prototype.createOscillator = function () {
  oscCount++;
  return { type: '', frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){} },
           connect(){}, start(){}, stop(){} };
};
FakeCtx.prototype.createGain = function () {
  return { gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} },
           connect(){} };
};
w.AudioContext = FakeCtx;
w.webkitAudioContext = FakeCtx;
w.eval(js);

const d = w.document;
const fire = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const btn = d.getElementById('pwr-btn-sfx');

/* ---- 1. tombolnya ADA & terpisah dari tombol musik ---- */
ok(!!btn, 'tombol efek suara #pwr-btn-sfx ada di HTML');
ok(!!d.getElementById('pwr-btn-music'),
   'tombol musik (backsound host) tetap ada & terpisah');
ok(btn && btn.id !== 'pwr-btn-music',
   'keduanya tombol BERBEDA — backsound milik host, sfx milik tema');

/* ---- 2. bawaan: bunyi menyala ---- */
w.ensureBooted();
ok(w.STORE.sfxOn === true, 'bawaan: efek suara menyala');
oscCount = 0;
w.sfx('jump');
ok(oscCount > 0, 'saat nyala: sfx() benar-benar membuat osilator (' + oscCount + ')');

/* ---- 3. KLIK -> BISU, dan benar-benar tidak berbunyi ---- */
fire(btn);
ok(w.STORE.sfxOn === false, 'klik -> STORE.sfxOn = false');
oscCount = 0;
['jump','coin','stomp','hurt','bump','powerup','piece','fanfare','bosshit','land']
  .forEach(k => w.sfx(k));
ok(oscCount === 0,
   'saat bisu: TIDAK ADA osilator dibuat utk 10 jenis bunyi (dapat ' +
   oscCount + ') — inilah bukti tombolnya benar-benar bekerja');

/* Bunyi bertunda (setTimeout di powerup/piece/fanfare) juga harus bisu.
   Diperiksa di akhir berkas (butuh menunggu timer), lihat bagian 11. */
oscCount = 0;
w.sfx('fanfare');
const delayedProbeStart = oscCount;

/* ---- 4. klik lagi -> nyala kembali ---- */
fire(btn);
ok(w.STORE.sfxOn === true, 'klik lagi -> nyala kembali');
oscCount = 0;
w.sfx('stomp');
ok(oscCount > 0, 'berbunyi lagi sesudah dinyalakan (' + oscCount + ')');

/* ---- 5. ikon mencerminkan keadaan ---- */
ok(btn.textContent === '🔊' && btn.classList.contains('is-on'),
   'nyala -> ikon 🔊 + is-on');
fire(btn);
ok(btn.textContent === '🔇' && !btn.classList.contains('is-on'),
   'bisu -> ikon 🔇 tanpa is-on');
ok(btn.getAttribute('aria-pressed') === 'false', 'aria-pressed ikut berubah');

/* ---- 6. pilihan BERTAHAN sesudah muat ulang ---- */
const saved = JSON.parse(w.localStorage.getItem('pwr_progress_v1') || '{}');
ok(saved.sfxOn === false, 'pilihan bisu tersimpan ke localStorage');
w.STORE = w.loadStore();
ok(w.STORE.sfxOn === false, 'sesudah loadStore(), tetap bisu');
oscCount = 0; w.sfx('coin');
ok(oscCount === 0, 'sesudah "muat ulang", masih benar-benar bisu');

/* ---- 7. ikon disinkronkan saat re-inject host ----
   Host bisa menulis ulang innerHTML tema; tombol baru lahir dgn 🔊 dari
   HTML. Kalau tidak disinkronkan, pemain yang sudah membisukan melihat
   ikon "nyala" padahal bisu. */
btn.textContent = '🔊';
btn.classList.add('is-on');
w.syncSfxIcon();
ok(btn.textContent === '🔇' && !btn.classList.contains('is-on'),
   'syncSfxIcon() mengembalikan ikon sesuai STORE (anti re-inject)');
ok(/syncSfxIcon\(\)/.test(js.slice(js.indexOf('function startWhenReady'))),
   'startWhenReady() memanggil syncSfxIcon() (dipanggil ulang tiap re-inject)');

/* ---- 8. TIDAK menyentuh backsound host ----
   Tema tidak boleh memutar/menghentikan audio host; satu-satunya cara
   sah adalah mengklik #btn-toggle-music, dan itu urusan tombol musik. */
const tgl = js.slice(js.indexOf('function toggleSfx'), js.indexOf('function toggleSfx') + 700);
ok(!/btn-toggle-music|bg-music|\.play\(\)|\.pause\(\)/.test(tgl),
   'toggleSfx() tidak menyentuh backsound host sama sekali');
ok(/STORE\.sfxOn/.test(tgl) && /saveStore\(\)/.test(tgl),
   'toggleSfx() hanya mengubah & menyimpan STORE.sfxOn');

/* ---- 9. gerbang bisu ada di SATU tempat (sfx), bukan tiap pemanggil ---- */
const sfxBody = js.slice(js.indexOf('function sfx(kind)'),
                         js.indexOf('function sfx(kind)') + 400);
ok(/sfxMuted\(\)/.test(sfxBody),
   'penjaga bisu berada di dalam sfx() — gerbang untuk nada langsung');
ok(/function toneLater/.test(js) && /if \(sfxMuted\(\)\) return;/.test(
     js.slice(js.indexOf('function toneLater'), js.indexOf('function toneLater') + 400)),
   'nada BERTUNDA lewat toneLater() yang memeriksa ULANG keadaan bisu');
ok(!/setTimeout\(function \(\) \{ tone\(/.test(js),
   'tidak ada lagi setTimeout(tone) langsung yang melewati penjaga');

/* ---- 10. bunyi konfirmasi hanya saat MENYALAKAN ---- */
ok(/if \(STORE\.sfxOn\) sfx\(/.test(tgl),
   'bunyi konfirmasi hanya saat menyalakan (kalau saat membisukan, ' +
   'tombolnya terasa tidak menurut)');

ok(delayedProbeStart === 0,
   'fanfare saat bisu: tidak ada bunyi langsung');

/* ---- 11. bunyi BERTUNDA ikut bisu ----
   powerup/piece/fanfare memakai setTimeout. Kalau penjaga bisu dipasang
   di tone() alih-alih sfx(), nada susulan ini tetap lolos — jadi harus
   ditunggu betulan, bukan diperiksa serentak. */
w.STORE.sfxOn = false;
oscCount = 0;
w.sfx('fanfare'); w.sfx('powerup'); w.sfx('piece');
setTimeout(function () {
  ok(oscCount === 0,
     'nada susulan (setTimeout) ikut bisu — dapat ' + oscCount);
  /* sebaliknya: saat nyala, nada susulan MEMANG berbunyi */
  w.STORE.sfxOn = true;
  oscCount = 0;
  w.sfx('fanfare');
  setTimeout(function () {
    ok(oscCount > 1,
       'saat nyala, nada susulan tetap berbunyi (' + oscCount + ') — ' +
       'penjaga tidak mematikan bunyi yang seharusnya ada');

    /* ---- 12. MEMBISUKAN DI TENGAH bunyi bertunda ----
       Kasus nyata: pemain mengambil power-up lalu langsung menekan
       bisu. Nada susulan sudah terjadwal; kalau keadaan tidak diperiksa
       ULANG saat nada dibunyikan, bunyi tetap keluar sesudah dibisukan. */
    w.STORE.sfxOn = true;
    oscCount = 0;
    w.sfx('fanfare');              /* 6 nada, jarak 150ms */
    setTimeout(function () {
      const before = oscCount;
      w.STORE.sfxOn = false;       /* bisukan DI TENGAH rangkaian */
      setTimeout(function () {
        ok(oscCount === before,
           'membisukan di tengah rangkaian langsung menghentikan nada ' +
           'berikutnya (' + before + ' -> ' + oscCount + ')');
        console.log(fail ? '\n' + fail + ' GAGAL' : '\nSEMUA LULUS');
        process.exit(fail ? 1 : 0);
      }, 900);
    }, 200);
  }, 1200);
}, 1200);
