/* ============================================================================
   FOREST RPG WEDDING — index.js
   Bible: FOREST_RPG_BIBLE.md
   Engine: Phaser 3.80.1 (single-file IIFE)
   Art: Ansimuz "Tiny RPG Forest" (CC0) — ansimuz.itch.io/tiny-rpg-forest
   Design ref: github.com/ikraamg/ForestRPG (MIT)
   ============================================================================ */
(function () {
  'use strict';

  /* ======================================================================
     0. CLEANUP (BARIS PALING AWAL — host me-re-inject JS berkali-kali)
     ====================================================================== */
  if (typeof window.__frpgCleanup === 'function') {
    try { window.__frpgCleanup(); } catch (e) {}
  }

  var disposers = [];
  var GAME = null;
  var phaserReady = false;      // true setelah Phaser benar-benar termuat
  var phaserFailed = false;     // true bila CDN gagal -> game mati, undangan tetap jalan
  var pendingStart = false;     // user menekan START sebelum Phaser siap

  function addGlobal(target, type, fn, opt) {
    target.addEventListener(type, fn, opt);
    disposers.push(function () { try { target.removeEventListener(type, fn, opt); } catch (e) {} });
  }
  function addTimer(id) { disposers.push(function () { clearTimeout(id); }); return id; }
  function addInterval(id) { disposers.push(function () { clearInterval(id); }); return id; }

  window.__frpgCleanup = function () {
    for (var i = 0; i < disposers.length; i++) { try { disposers[i](); } catch (e) {} }
    disposers.length = 0;
    if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
    window.__frpgCleanup = null;
  };

  /* ======================================================================
     1. CONFIG terpusat (semua angka dari Bible — jangan magic number)
     ====================================================================== */
  var CFG = {
    /* --------------------------------------------------------------------
       GEOMETRI — dipilih agar DUA syarat terpenuhi sekaligus:
         (1) sprite memakai PIKSEL ASLI (hero 32x32, tanpa downscale)
         (2) peta mengisi hampir SELURUH layar

       Kuncinya menurunkan resolusi internal. Zoom WAJIB bilangan bulat
       (pecahan bikin pixel-art buram), jadi BW/BH dipilih supaya
       ruang x zoom pas menutupi viewport:

         BW 384 x BH 683, ctrlH 142 -> viewH 541
         ruang 6x8 tile @ TILE 32   -> 192x256 px
         zoom = min(384/192, 541/256) = min(2.00, 2.11) -> 2
         terisi: 384/384 = 100% lebar, 512/541 = 95% tinggi
         hero 32px dunia -> ~74px di layar HP (dulu 39px dari sprite 16px)
       -------------------------------------------------------------------- */
    // Resolusi internal = TEPAT 1 ruang + zona kontrol di bawahnya.
    //   ruang  = 6x8 tile @ TILE 32 = 192x256
    //   ctrl   = 20% -> tinggi total = 256 / 0.8 = 320
    //   BW x BH = 192 x 320  (rasio 0.60)
    // Dengan Scale.FIT + zoom 1, ruang mengisi 100% x 100% di SEMUA ukuran HP,
    // karena rasio kanvas terkunci -- CSS hanya meregangkan, tak mengubah rasio.
    // Ini menggantikan pendekatan 384x683 yang membuat kanvas ter-fit sebagian
    // (pita gelap) dan zoom bulat tak pernah pas di layar HP nyata.
    BW: 192, BH: 320,
    TILE: 32,                               // sprite dipakai NATIVE (tanpa downscale)
    CTRL_FRAC: 0.20,                        // porsi bawah utk zona kontrol sentuh
    ROOM_W: 6, ROOM_H: 8,                   // tile
    get ROOM_PX_W() { return this.ROOM_W * this.TILE; },   // 192
    get ROOM_PX_H() { return this.ROOM_H * this.TILE; },   // 256

    PLAYER_SPEED: 184,          // x2: TILE 16->32
    PLAYER_SPEED_BOOTS: 256,    // x2
    ARROW_SPEED: 600,           // x2
    SHOOT_CD_MS: 250,
    SHOOT_LOCK_MS: 250,
    INVULN_MS: 1200,
    INVULN_MS_EASY: 1500,
    KNOCKBACK: 150,
    KNOCKBACK_MS: 350,
    ARROW_LIFETIME_MS: 900,

    ROOM_TWEEN_MS: 350,
    SPAWN_GRACE_MS: 800,                    // anti spawn-kill
    DOOR_INSET: 48,             // x2 (TILE 32) = 1.5 tile dari tepi

    AREAS: [
      { key: 'A1', name: 'TEPI HUTAN',    cols: 3, rows: 3, sky: 0x8fbf6a, ground: 0x5a8f42, pool: ['mole', 'treant'] },
      { key: 'A2', name: 'HUTAN DALAM',   cols: 3, rows: 3, sky: 0x4a7a3c, ground: 0x3a5f30, pool: ['mole', 'treant', 'mole_dig'] },
      { key: 'A3', name: 'RAWA BERKABUT', cols: 3, rows: 3, sky: 0x5a7a72, ground: 0x3f5a52, pool: ['treant_old', 'mole_dig', 'firefly'] },
      { key: 'A4', name: 'LADANG BUNGA',  cols: 3, rows: 2, sky: 0xa8d878, ground: 0x7ab54a, pool: ['mole', 'firefly'] },
      { key: 'A5', name: 'KAKI GUNUNG',   cols: 3, rows: 3, sky: 0x8a7a6a, ground: 0x6a5a4a, pool: ['treant', 'treant_old', 'thorn'] },
      { key: 'A6', name: 'GERBANG GUNUNG', cols: 1, rows: 2, sky: 0xc8a860, ground: 0x8a7a5a, pool: ['treant'] }
    ],

    QUOTA_SHAPE: [3, 2, 2, 2, 2, 0],        // sum 11 (auto-scale bila N < 11)

    // Kepadatan diskalakan ke luas ruang 6x8 = 24 tile dalam (dulu 117).
    // Ruang jadi jauh lebih kecil demi sprite besar, jadi jumlah objek HARUS
    // turun -- kalau tidak, 46% tile terisi dan tak ada ruang gerak sama sekali.
    // Angka ini menahan <=21% terisi di hard.
    DENSITY: {
      easy:   { enemies: 1, destruct: 1, obstacles: 0, decor: 2, rewardEvery: 2 },
      normal: { enemies: 2, destruct: 1, obstacles: 0, decor: 2, rewardEvery: 2 },
      hard:   { enemies: 2, destruct: 1, obstacles: 1, decor: 1, rewardEvery: 3 }
    },

    DIFF: {
      easy:   { speedMul: 0.82, invuln: 1500, bossHp: 24, bossFire: 2400, fireflyMax: 0, oldFire: 2800, thornActive: 600 },
      normal: { speedMul: 1.00, invuln: 1200, bossHp: 32, bossFire: 1800, fireflyMax: 1, oldFire: 2200, thornActive: 800 },
      hard:   { speedMul: 1.18, invuln: 1000, bossHp: 44, bossFire: 1300, fireflyMax: 2, oldFire: 1600, thornActive: 1000 }
    },

    ENEMY: {
      // Semua angka px DIKALI 2 karena TILE 16 -> 32 (dunia jadi 2x besar).
      // Tanpa ini musuh terasa berjalan setengah kecepatan & hitbox terlalu kecil.
      mole:       { hp: 1, speed: 120, axis: 'y', dmg: 1, w: 20, h: 20 },
      treant:     { hp: 2, speed: 68,  axis: 'x', dmg: 1, w: 24, h: 24 },
      mole_dig:   { hp: 1, speed: 156, dmg: 1, w: 20, h: 20, trigger: 128, telegraph: 500, chase: 900 },
      treant_old: { hp: 3, speed: 0,   dmg: 1, w: 28, h: 32, windup: 600, seedSpeed: 260 },
      firefly:    { hp: 1, speed: 172, dmg: 1, w: 16, h: 16 },
      thorn:      { hp: 0, speed: 0,   dmg: 1, w: 24, h: 24, hidden: 800, telegraph: 200 }
    }
  };

  var STORE_KEY = 'frpg_wedding_v1';
  var DEFAULTS = {
    unlocked: [], diff: 'easy', character: 'groom',
    maxArea: 0, announcedAll: false, completed: false, sfxOn: true
  };
  var STORE = loadStore();

  function loadStore() {
    var d = JSON.parse(JSON.stringify(DEFAULTS));
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return d;
      var p = JSON.parse(raw);
      for (var k in d) if (Object.prototype.hasOwnProperty.call(p, k)) d[k] = p[k];
      if (!Array.isArray(d.unlocked)) d.unlocked = [];
      if (!CFG.DIFF[d.diff]) d.diff = 'easy';
    } catch (e) {}
    return d;
  }
  function saveStore() { try { localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); } catch (e) {} }

  var cheat = { on: false };                 // TIDAK di-persist (Y.3)
  var runState = freshRun();
  function freshRun() { return { area: 0, room: 0, hasFireArrow: false, hasBoots: false, hasCharm: false }; }

  /* ======================================================================
     2. DOM helpers
     ====================================================================== */
  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Baca binding yang SUDAH di-render parser (Z.2)
  function val(k, fb) {
    var el = document.querySelector('[data-var="' + k + '"]');
    var v = el ? (el.textContent || '').trim() : '';
    if (!v || v.indexOf('{{') === 0) return fb || '';
    return v;
  }

  function showError(msg) {
    var el = $('frpg-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  var overlayIds = ['frpg-cover', 'frpg-areaselect', 'frpg-modal', 'frpg-reveal',
                    'frpg-allcollected', 'frpg-win', 'frpg-resetconfirm'];
  function showOverlay(id) {
    for (var i = 0; i < overlayIds.length; i++) {
      var el = $(overlayIds[i]);
      if (el) el.classList.toggle('show', overlayIds[i] === id);
    }
    freezeGame(!!id);
  }
  function overlayUp(id) { var el = $(id); return !!(el && el.classList.contains('show')); }
  function anyOverlayUp() {
    for (var i = 0; i < overlayIds.length; i++) if (overlayUp(overlayIds[i])) return true;
    return false;
  }

  var toastTimer = null;
  function toast(msg, kind) {
    var el = $('frpg-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'frpg-toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = addTimer(setTimeout(function () { el.classList.remove('show'); }, 3600));
  }

  function banner(text, ms) {
    var el = $('frpg-banner');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    addTimer(setTimeout(function () { el.classList.remove('show'); }, ms || 1400));
  }

  /* ======================================================================
     3. SFX — Web Audio sintetis (NOL file audio, §11)
     ====================================================================== */
  var AC = null;
  function initAC() {
    if (AC) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) AC = new Ctx();
      if (AC && AC.state === 'suspended') AC.resume();
      disposers.push(function () { try { if (AC) AC.close(); } catch (e) {} AC = null; });
    } catch (e) {}
  }
  addGlobal(document, 'pointerdown', initAC, { once: true });
  addGlobal(document, 'keydown', initAC, { once: true });

  function sfx(type, freq, dur, vol, vary) {
    if (!AC || !STORE.sfxOn) return;
    try {
      var f = freq * (vary ? (1 + (Math.random() - 0.5) * vary) : 1);
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(); o.stop(AC.currentTime + dur);
    } catch (e) {}
  }
  function sfxSweep(type, f0, f1, dur, vol) {
    if (!AC || !STORE.sfxOn) return;
    try {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, AC.currentTime);
      o.frequency.exponentialRampToValueAtTime(f1, AC.currentTime + dur);
      g.gain.setValueAtTime(vol, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
      o.connect(g); g.connect(AC.destination);
      o.start(); o.stop(AC.currentTime + dur);
    } catch (e) {}
  }
  function sfxArp(notes, step, vol) {
    if (!AC || !STORE.sfxOn) return;
    notes.forEach(function (n, i) {
      addTimer(setTimeout(function () { sfx('sine', n, 0.12, vol || 0.06); }, i * (step || 90)));
    });
  }

  var SFX = {
    shoot:   function () { sfx('square', 620, 0.07, 0.05, 0.16); },
    hit:     function () { sfx('square', 320, 0.06, 0.06, 0.12); },
    kill:    function () { sfxSweep('sawtooth', 180, 80, 0.18, 0.07); },
    breakit: function () { sfx('square', 240, 0.09, 0.05, 0.24); },
    hurt:    function () { sfx('sawtooth', 140, 0.22, 0.08); },
    item:    function () { sfxSweep('sine', 700, 1050, 0.14, 0.06); },
    piece:   function () { sfxArp([660, 880, 1180], 80, 0.07); },
    gate:    function () { sfxSweep('sine', 300, 900, 0.7, 0.08); },
    win:     function () { sfxArp([523, 659, 784, 1046, 1318], 120, 0.09); }
  };

  /* ======================================================================
     4. HOST WIRING (APPENDIX Z) — paling tidak boleh salah
     ====================================================================== */

  // ---- 4a. MUSIK: mirror IDEMPOTEN, tema TIDAK memutar backsound tenant ----
  var musicGen = 0;
  function hostMusicIsPlaying() {
    var pi = $('pause-icon');
    if (pi) return pi.style.display !== 'none';
    var bg = $('bg-music');
    return !!(bg && !bg.paused);
  }
  function setMusicIntent(want) {
    var gen = ++musicGen;
    (function attempt(tries) {
      if (gen !== musicGen) return;                    // intent lebih baru menang
      if (hostMusicIsPlaying() === want) return;       // state host SUDAH benar -> JANGAN klik
      var btn = $('btn-toggle-music') || $('btn-music');
      if (btn) btn.click();
      if (tries > 0) addTimer(setTimeout(function () { attempt(tries - 1); }, 350));
    })(3);
  }
  // Tema TIDAK menulis ikon musik — host satu-satunya penulis ikon.

  // ---- 4b. ID host & de-ID saat clone (X.6) ----
  var HOST_IDS = ['btn-show-qr', 'btn-show-menu', 'btn-toggle-music', 'btn-music', 'bg-music',
    'play-icon', 'pause-icon', 'btn-submit-ucapan', 'wish-name', 'wish-message',
    'btn-submit-kehadiran', 'rsvp-status', 'rsvp-guests', 'rsvp-code',
    'btn-submit-hadiah', 'gift-name', 'gift-amount', 'gift-bank',
    'alert-submit-kehadiran', 'alert-submit-ucapan', 'alert-submit-hadiah',
    'tm-countdown-days', 'tm-countdown-hours', 'tm-countdown-minutes', 'tm-countdown-seconds'];

  function escId(id) {
    if (window.CSS && CSS.escape) return CSS.escape(id);
    return id.replace(/([^\w-])/g, '\\$1');
  }

  // Lucuti ID host dari SUMBER selama clone hidup -> tepat satu ID di DOM
  function deIdSource(on) {
    var root = $('inv-source');
    if (!root) return;
    HOST_IDS.forEach(function (id) {
      var el;
      if (on) {
        el = root.querySelector('#' + escId(id));
        if (el) { el.setAttribute('data-was-id', id); el.removeAttribute('id'); }
      } else {
        el = root.querySelector('[data-was-id="' + id + '"]');
        if (el) { el.setAttribute('id', id); el.removeAttribute('data-was-id'); }
      }
    });
  }
  // Clone lahir tanpa ID (karena sumber sudah di-de-ID) -> kembalikan di CLONE
  function restoreHostIds(root) {
    qsa('[data-was-id]', root).forEach(function (el) {
      el.setAttribute('id', el.getAttribute('data-was-id'));
      el.removeAttribute('data-was-id');
    });
  }

  // ---- 4c. RSVP / ucapan: panggil fungsi global host + fallback ----
  function writeAlert(id, msg, root) {
    var el = (root || document).querySelector('#' + escId(id));
    if (!el) return;
    if (el.querySelector('[data-rsvp-branch]')) return;   // ini CARD -> JANGAN ditimpa
    el.textContent = msg;
  }

  function wireHostForms(root) {
    var bu = root.querySelector('#btn-submit-ucapan');
    if (bu && !bu.__frpgWired) {
      bu.__frpgWired = true;
      bu.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
        var n = root.querySelector('#wish-name'), m = root.querySelector('#wish-message');
        if (!n || !m || !m.value.trim()) { writeAlert('alert-submit-ucapan', 'Ucapan belum diisi.', root); return; }
        var list = root.querySelector('#frpg-wish-list');
        if (list) {
          var d = document.createElement('div');
          d.className = 'frpg-wish';
          d.innerHTML = '<b></b><span class="sm">Baru saja</span><p></p>';
          d.querySelector('b').textContent = n.value || 'Tamu';
          d.querySelector('p').textContent = m.value;
          list.insertBefore(d, list.firstChild);
        }
        m.value = '';
        writeAlert('alert-submit-ucapan', 'Terima kasih atas ucapannya!', root);
      });
    }

    var bk = root.querySelector('#btn-submit-kehadiran');
    if (bk && !bk.__frpgWired) {
      bk.__frpgWired = true;
      bk.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
        writeAlert('alert-submit-kehadiran', 'Konfirmasi kehadiran tersimpan. Terima kasih!', root);
      });
    }

    var bh = root.querySelector('#btn-submit-hadiah');
    if (bh && !bh.__frpgWired) {
      bh.__frpgWired = true;
      bh.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.submitHadiah === 'function') { window.submitHadiah(); return; }
        writeAlert('alert-submit-hadiah', 'Terima kasih!', root);
      });
    }

    // Lightbox galeri: ditangani delegasi document (kebal re-render host)
  }

  function openLightbox(src) {
    var lb = $('frpg-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'frpg-lightbox';
      lb.id = 'frpg-lightbox';
      lb.innerHTML = '<img alt="">';
      lb.addEventListener('click', function () { lb.classList.remove('show'); });
      document.body.appendChild(lb);
      disposers.push(function () { try { lb.remove(); } catch (e) {} });
    }
    lb.querySelector('img').setAttribute('src', src);
    lb.classList.add('show');
  }

  /* ======================================================================
     5. SECTION SCAN + KEPINGAN (APPENDIX W/X)
     ====================================================================== */
  var ICON_OF = {
    hero: '💌', couple: '💑', rsvp: '✅', schedule: '📅',
    streaming: '📺', story: '📖', gallery: '🖼️',
    happiness: '📸', wishes: '💬', gift: '🎁', closing: '🌿'
  };

  var INFOS = [];
  function scanSections() {
    var nodes = qsa('#inv-source > section[data-info]');
    return nodes.map(function (el) {
      var t = el.querySelector('[data-sec-title]');
      return {
        key: el.getAttribute('data-info'),
        title: (t ? t.textContent : el.getAttribute('data-info')).trim(),
        el: el
      };
    });
  }

  // Quota per area + AUTO-SCALE saat section dikurangi flag (X.2)
  function computeQuota(n) {
    var shape = CFG.QUOTA_SHAPE;
    var total = shape.reduce(function (a, b) { return a + b; }, 0);
    if (n === total) return shape.slice();
    if (n <= 0) return shape.map(function () { return 0; });
    var raw = shape.map(function (v) { return v * n / total; });
    var out = raw.map(Math.floor);
    var rem = n - out.reduce(function (a, b) { return a + b; }, 0);
    var order = raw.map(function (v, i) { return [i, v - Math.floor(v)]; })
                   .sort(function (a, b) { return (b[1] - a[1]) || (a[0] - b[0]); });
    for (var k = 0; rem > 0; k = (k + 1) % order.length, rem--) out[order[k][0]]++;
    return out;
  }

  // Pemetaan area -> kepingan DETERMINISTIK dari nomor area (X.3)
  function piecesForArea(areaIdx) {
    var q = computeQuota(INFOS.length);
    var start = 0;
    for (var i = 0; i < areaIdx; i++) start += q[i];
    return INFOS.slice(start, start + (q[areaIdx] || 0));
  }

  function isUnlocked(key) { return STORE.unlocked.indexOf(key) >= 0; }
  function allPiecesCollected() {
    if (!INFOS.length) return false;
    for (var i = 0; i < INFOS.length; i++) if (!isUnlocked(INFOS[i].key)) return false;
    return true;
  }

  function buildIndicators() {
    var wrap = $('frpg-pieces');
    if (!wrap) return;
    wrap.innerHTML = '';
    INFOS.forEach(function (info) {
      var b = document.createElement('button');
      b.className = 'frpg-piece-ico';
      b.type = 'button';
      b.setAttribute('data-piece', info.key);
      b.title = info.title;
      b.textContent = ICON_OF[info.key] || '❓';
      b.disabled = true;
      // klik ditangani delegasi document (lihat wireUI) -> kebal re-render host
      wrap.appendChild(b);
    });
    STORE.unlocked.forEach(lightIndicator);
    updateProgressChip();
    updateOpenButton();
  }

  function lightIndicator(key, animate) {
    var b = qs('[data-piece="' + key + '"]');
    if (!b) return;
    b.classList.add('is-on');
    b.disabled = false;
    if (animate) {
      b.classList.add('just-lit');
      addTimer(setTimeout(function () { b.classList.remove('just-lit'); }, 520));
    }
  }

  function updateProgressChip() {
    var el = $('frpg-progress');
    if (el) el.innerHTML = STORE.unlocked.length + '/' + INFOS.length + ' 💌';
  }

  function updateOpenButton() {
    var ok = allPiecesCollected() || cheat.on;
    [$('frpg-open-invitation'), $('frpg-side-open')].forEach(function (btn) {
      if (!btn) return;
      btn.disabled = !ok;
      if (btn.id === 'frpg-side-open') {
        btn.textContent = ok ? '💌 BUKA UNDANGAN LENGKAP'
          : '🔒 ' + STORE.unlocked.length + '/' + INFOS.length + ' KEPINGAN';
      }
    });
  }

  // Sprite kepingan terbang ke ikon indikator
  function flyPieceTo(key, fromX, fromY) {
    var target = qs('[data-piece="' + key + '"]');
    var frame = qs('.frpg-frame');
    if (!target || !frame) return;
    var fr = frame.getBoundingClientRect(), tr = target.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'frpg-fly';
    el.textContent = '💌';
    el.style.left = (fromX != null ? fromX : fr.width / 2) + 'px';
    el.style.top = (fromY != null ? fromY : fr.height / 2) + 'px';
    frame.appendChild(el);
    var dx = (tr.left - fr.left) - parseFloat(el.style.left) + tr.width / 2;
    var dy = (tr.top - fr.top) - parseFloat(el.style.top) + tr.height / 2;
    requestAnimationFrame(function () {
      el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.5)';
      el.style.opacity = '0.2';
    });
    addTimer(setTimeout(function () { try { el.remove(); } catch (e) {} }, 700));
  }

  // Respons saat kepingan diambil — TIDAK auto-open modal (X.4)
  function unlockInfo(key, opts) {
    if (isUnlocked(key)) return;
    STORE.unlocked.push(key);
    saveStore();

    lightIndicator(key, true);
    if (!opts || !opts.silent) {
      flyPieceTo(key, opts && opts.x, opts && opts.y);
      toast('Kepingan didapat: ' + titleOf(key), 'success');
      SFX.piece();
    }
    updateProgressChip();
    updateOpenButton();

    if (allPiecesCollected()) announceAllCollected();
  }

  function unlockAllInfo() {
    INFOS.forEach(function (i) {
      if (!isUnlocked(i.key)) { STORE.unlocked.push(i.key); lightIndicator(i.key, false); }
    });
    saveStore(); updateProgressChip(); updateOpenButton();
  }

  function titleOf(key) {
    for (var i = 0; i < INFOS.length; i++) if (INFOS[i].key === key) return INFOS[i].title;
    return key;
  }

  /* ---- Modal kepingan & reveal (CLONE dengan de-ID) ---- */
  function openPieceModal(key) {
    var info = null;
    for (var i = 0; i < INFOS.length; i++) if (INFOS[i].key === key) info = INFOS[i];
    if (!info) return;
    deIdSource(true);
    var clone = info.el.cloneNode(true);
    restoreHostIds(clone);
    var body = $('frpg-modal-body');
    body.innerHTML = '';
    body.appendChild(clone);
    wireHostForms(body);
    showOverlay('frpg-modal');
  }
  function closePieceModal() {
    $('frpg-modal-body').innerHTML = '';
    deIdSource(false);
    showOverlay(null);
  }

  function revealFullInvitation() {
    deIdSource(true);
    var wrap = $('frpg-reveal-body');
    wrap.innerHTML = '';
    INFOS.forEach(function (info) {
      var c = info.el.cloneNode(true);
      restoreHostIds(c);
      wrap.appendChild(c);
    });
    wireHostForms(wrap);
    showOverlay('frpg-reveal');
    window.__frpgRevealed = true;
  }
  function closeReveal() {
    $('frpg-reveal-body').innerHTML = '';
    deIdSource(false);
    showOverlay(null);
    window.__frpgRevealed = false;
  }

  /* ---- Celebration pemicu #1: kepingan terakhir (Z.13) ---- */
  function announceAllCollected() {
    if (STORE.announcedAll) return;
    STORE.announcedAll = true; saveStore();

    // beat meriah ~5 detik SEBELUM dialog
    flashScreen(400, 'rgba(255,230,170,.55)');
    SFX.win();
    toast('Semua kepingan terkumpul!', 'success');
    if (GAME) { var sc = getScene(); if (sc) sc.celebrate(); }

    addTimer(setTimeout(function () {
      var t = $('frpg-allcollected-text');
      if (t) {
        t.textContent = val('groom_nickname', 'Mempelai') + ' & ' + val('bride_nickname', 'Mempelai') +
          ' — semua ' + INFOS.length + ' kepingan undangan telah terkumpul. Undangan siap dibuka.';
      }
      showOverlay('frpg-allcollected');
    }, 4500));
  }

  function flashScreen(ms, color) {
    var frame = qs('.frpg-frame');
    if (!frame) return;
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;inset:0;z-index:45;pointer-events:none;background:' +
      (color || 'rgba(255,255,255,.6)') + ';transition:opacity ' + ms + 'ms;';
    frame.appendChild(d);
    requestAnimationFrame(function () { d.style.opacity = '0'; });
    addTimer(setTimeout(function () { try { d.remove(); } catch (e) {} }, ms + 60));
  }

  /* ======================================================================
     6. FREEZE game saat dialog terbuka (Z.8)
     ====================================================================== */
  function getScene() {
    if (!GAME) return null;
    try { return GAME.scene.getScene('GameScene'); } catch (e) { return null; }
  }
  function freezeGame(on) {
    var sc = getScene();
    if (!sc || !sc.scene) return;
    try {
      if (on) { if (!sc.scene.isPaused()) sc.scene.pause(); }
      else    { if (sc.scene.isPaused()) sc.scene.resume(); }
    } catch (e) {}
  }

  /* ======================================================================
     7. LEVEL GENERATION (APPENDIX F) + VALIDATOR DENSITY (APPENDIX E)
     ====================================================================== */

  // RNG deterministik (mulberry32) — level bisa direproduksi & di-reseed
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
  function ri(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }

  var TT = { FLOOR: 0, WALL: 1, ROCK: 2, WATER: 3 };

  function makeRoom(areaIdx, col, row, cols, rows) {
    var W = CFG.ROOM_W, H = CFG.ROOM_H;
    var tiles = [];
    for (var y = 0; y < H; y++) {
      tiles[y] = [];
      for (var x = 0; x < W; x++) {
        var edge = (x === 0 || y === 0 || x === W - 1 || y === H - 1);
        tiles[y][x] = edge ? TT.WALL : TT.FLOOR;
      }
    }
    // pintu (lebar 2 tile di tengah tiap sisi yang punya tetangga)
    var doors = {};
    var mx = Math.floor(W / 2), my = Math.floor(H / 2);
    if (row > 0)        { doors.up    = true; tiles[0][mx] = TT.FLOOR; tiles[0][mx - 1] = TT.FLOOR; }
    if (row < rows - 1) { doors.down  = true; tiles[H - 1][mx] = TT.FLOOR; tiles[H - 1][mx - 1] = TT.FLOOR; }
    if (col > 0)        { doors.left  = true; tiles[my][0] = TT.FLOOR; tiles[my - 1][0] = TT.FLOOR; }
    if (col < cols - 1) { doors.right = true; tiles[my][W - 1] = TT.FLOOR; tiles[my - 1][W - 1] = TT.FLOOR; }

    return {
      id: CFG.AREAS[areaIdx].key + '-R' + (row * cols + col + 1),
      areaIdx: areaIdx, col: col, row: row, index: row * cols + col,
      tiles: tiles, doors: doors,
      enemies: [], decor: [], destruct: [], obstacles: [], rewards: [],
      pieceKey: null, isSafe: false, tag: 'combat'
    };
  }

  function doorTiles(room) {
    var W = CFG.ROOM_W, H = CFG.ROOM_H;
    var mx = Math.floor(W / 2), my = Math.floor(H / 2);
    var out = [];
    if (room.doors.up)    out.push({ x: mx, y: 1 });
    if (room.doors.down)  out.push({ x: mx, y: H - 2 });
    if (room.doors.left)  out.push({ x: 1, y: my });
    if (room.doors.right) out.push({ x: W - 2, y: my });
    return out;
  }

  function freeTiles(room) {
    var out = [];
    for (var y = 1; y < CFG.ROOM_H - 1; y++)
      for (var x = 1; x < CFG.ROOM_W - 1; x++)
        if (room.tiles[y][x] === TT.FLOOR && !occupied(room, x, y)) out.push({ x: x, y: y });
    return out;
  }
  function occupied(room, x, y) {
    var lists = [room.enemies, room.decor, room.destruct, room.obstacles, room.rewards];
    for (var i = 0; i < lists.length; i++)
      for (var j = 0; j < lists[i].length; j++)
        if (lists[i][j].tx === x && lists[i][j].ty === y) return true;
    return (room.pieceKey && room.pieceAt && room.pieceAt.tx === x && room.pieceAt.ty === y);
  }

  // jarak minimal dari pintu (anti spawn-kill) — radius 40px ~ 2.5 tile
  function nearDoor(room, x, y, tiles) {
    var d = doorTiles(room);
    for (var i = 0; i < d.length; i++) {
      var dist = Math.abs(d[i].x - x) + Math.abs(d[i].y - y);
      if (dist <= (tiles || 3)) return true;
    }
    return false;
  }

  function connectedFloorCount(room) {
    var W = CFG.ROOM_W, H = CFG.ROOM_H;
    var blocked = {};
    room.obstacles.forEach(function (o) { blocked[o.tx + ',' + o.ty] = 1; });
    var start = null;
    for (var y = 1; y < H - 1 && !start; y++)
      for (var x = 1; x < W - 1 && !start; x++)
        if (room.tiles[y][x] === TT.FLOOR && !blocked[x + ',' + y]) start = { x: x, y: y };
    if (!start) return 0;
    var seen = {}, stack = [start], n = 0;
    while (stack.length) {
      var c = stack.pop(), k = c.x + ',' + c.y;
      if (seen[k]) continue;
      if (c.x < 0 || c.y < 0 || c.x >= W || c.y >= H) continue;
      if (room.tiles[c.y][c.x] !== TT.FLOOR) continue;
      if (blocked[k]) continue;
      seen[k] = 1; n++;
      stack.push({ x: c.x + 1, y: c.y }, { x: c.x - 1, y: c.y },
                 { x: c.x, y: c.y + 1 }, { x: c.x, y: c.y - 1 });
    }
    return n;
  }

  function totalFloor(room) {
    var n = 0;
    for (var y = 1; y < CFG.ROOM_H - 1; y++)
      for (var x = 1; x < CFG.ROOM_W - 1; x++)
        if (room.tiles[y][x] === TT.FLOOR) n++;
    return n;
  }

  function placeInto(room, list, kind, count, rng, opts) {
    opts = opts || {};
    var placed = 0, guard = 0;
    while (placed < count && guard++ < 300) {
      var free = freeTiles(room);
      if (!free.length) break;
      var t = pick(rng, free);
      if (opts.awayFromDoor && nearDoor(room, t.x, t.y, opts.awayFromDoor)) continue;
      var entry = { tx: t.x, ty: t.y, kind: kind };
      if (opts.type) entry.type = opts.type;
      list.push(entry);
      // rintangan tidak boleh memutus konektivitas
      if (kind === 'obstacle' && connectedFloorCount(room) < totalFloor(room) - room.obstacles.length) {
        list.pop(); continue;
      }
      placed++;
    }
    return placed;
  }

  // ---------- VALIDATOR DENSITY "NO DEAD AIR" (E.1) ----------
  function validateDensity(level, opts) {
    var fails = [];
    level.rooms.forEach(function (room) {
      var e = room.enemies.length, d = room.destruct.length,
          o = room.obstacles.length, dec = room.decor.length,
          rw = room.rewards.length + (room.pieceKey ? 1 : 0);

      if (!room.isSafe && e < opts.enemies) fails.push([room.id, 'enemies', e]);
      if (d < opts.destruct)                fails.push([room.id, 'destructible', d]);
      if (o < opts.obstacles)               fails.push([room.id, 'obstacles', o]);
      if (dec < opts.decor)                 fails.push([room.id, 'decor', dec]);
      if (!room.ambient)                    fails.push([room.id, 'ambient', 0]);
      if (e + d + rw === 0)                 fails.push([room.id, 'DEAD_AIR', 0]);
    });
    // reward cadence
    var gap = 0;
    level.rooms.forEach(function (room) {
      gap = (room.rewards.length + (room.pieceKey ? 1 : 0)) > 0 ? 0 : gap + 1;
      if (gap > opts.rewardEvery) fails.push([room.id, 'reward-gap', gap]);
    });
    return fails;
  }

  // Radius aman di sekitar pintu, diskalakan ke ruang terkecil.
  // Ruang 8x11: radius 2 menyisakan 14 tile valid (26%) -- cukup untuk 4 musuh
  // sekaligus tetap mencegah spawn-kill tepat di depan pintu.
  var DOOR_SAFE_R = Math.max(1, Math.min(3, Math.floor(Math.min(CFG.ROOM_W, CFG.ROOM_H) / 4)));

  function fixDensity(level, opts, rng) {
    var sinceReward = 0;               // jarak ruang sejak reward terakhir
    level.rooms.forEach(function (room) {
      if (!room.ambient) room.ambient = true;
      var need;
      need = opts.decor - room.decor.length;
      if (need > 0) placeInto(room, room.decor, 'decor', need, rng);
      need = opts.destruct - room.destruct.length;
      if (need > 0) placeInto(room, room.destruct, 'destruct', need, rng);
      need = opts.obstacles - room.obstacles.length;
      if (need > 0) placeInto(room, room.obstacles, 'obstacle', need, rng, { awayFromDoor: Math.max(1, DOOR_SAFE_R - 1) });
      if (!room.isSafe) {
        need = opts.enemies - room.enemies.length;
        if (need > 0) {
          var pool = CFG.AREAS[room.areaIdx].pool;
          // <=2 tipe per ruang
          var types = {};
          room.enemies.forEach(function (x) { types[x.type] = 1; });
          for (var i = 0; i < need; i++) {
            var tks = Object.keys(types);
            var t = tks.length >= 2 ? pick(rng, tks) : pick(rng, pool);
            types[t] = 1;
            // Radius aman-pintu HARUS ikut ukuran ruang. Nilai tetap 3 di ruang
            // 8x11 menyisakan NOL tile valid (4 pintu x radius 3 menutupi seluruh
            // interior) -> musuh gagal ditempatkan -> ruang kosong "dead air".
            placeInto(room, room.enemies, 'enemy', 1, rng, { awayFromDoor: DOOR_SAFE_R, type: t });
          }
        }
      }
      // Reward filler: DETERMINISTIK berdasarkan jarak sejak reward terakhir.
      // Versi lama memakai rng() < 0.5 -> celah antar-reward bisa melebihi
      // opts.rewardEvery dan validator melaporkan 'reward-gap'. Di ruang kecil
      // (6x8) reward makin jarang, jadi kebetulan acak tak lagi cukup.
      if (room.rewards.length === 0 && !room.pieceKey) {
        if (sinceReward >= opts.rewardEvery) {
          placeInto(room, room.rewards, 'reward', 1, rng, { type: rng() < 0.5 ? 'heart' : 'flower' });
          sinceReward = 0;
        } else {
          sinceReward++;
        }
      } else {
        sinceReward = 0;
      }
    });
  }

  // ---------- VALIDATOR PLAYABILITY (E.2, subset yang relevan runtime) ----------
  function validatePlayability(level) {
    var fails = [];
    level.rooms.forEach(function (room) {
      // no spawn-kill: musuh/hazard dalam radius pintu.
      // Radius HARUS sama dengan DOOR_SAFE_R yang dipakai penempat. Nilai tetap 2
      // mustahil dipenuhi di ruang 6x8 (4 pintu x radius 2 = NOL tile bebas),
      // sehingga setiap ruang dilaporkan spawn-kill padahal penempatannya sudah
      // seaman mungkin. Musuh juga sudah dibekukan SPAWN_GRACE_MS saat masuk ruang.
      room.enemies.forEach(function (en) {
        if (nearDoor(room, en.tx, en.ty, DOOR_SAFE_R)) fails.push([room.id, 'spawn-kill']);
      });
      // konektivitas: seluruh lantai bisa dicapai (rintangan tak memutus ruang)
      if (connectedFloorCount(room) < totalFloor(room) - room.obstacles.length)
        fails.push([room.id, 'disconnected']);
      // kepingan tak boleh tersembunyi di bawah destructible
      if (room.pieceKey && room.pieceAt) {
        var p = room.pieceAt;
        room.destruct.forEach(function (b) {
          if (b.tx === p.tx && b.ty === p.ty) fails.push([room.id, 'piece-hidden']);
        });
      }
    });
    return fails;
  }

  // ---------- Pipeline F.1 ----------
  function buildArea(areaIdx, diff, seed) {
    var area = CFG.AREAS[areaIdx];
    var opts = CFG.DENSITY[diff];

    for (var attempt = 0; attempt < 8; attempt++) {
      var rng = makeRng((seed || 12345) + attempt * 7919 + areaIdx * 104729);
      var level = { areaIdx: areaIdx, rooms: [] };

      // 1-3. graph + pola + rintangan
      for (var r = 0; r < area.rows; r++) {
        for (var c = 0; c < area.cols; c++) {
          var room = makeRoom(areaIdx, c, r, area.cols, area.rows);
          room.isSafe = (areaIdx === 0 && r === 0 && c === 0);
          room.ambient = true;
          level.rooms.push(room);
        }
      }
      level.rooms.sort(function (a, b) { return a.index - b.index; });

      // 4-5. entity + dekorasi (isi ke lantai kuota, validator akan menambal sisanya)
      level.rooms.forEach(function (room) {
        placeInto(room, room.obstacles, 'obstacle', ri(rng, opts.obstacles, opts.obstacles + 2), rng, { awayFromDoor: 2 });
        placeInto(room, room.destruct, 'destruct', ri(rng, opts.destruct, opts.destruct + 2), rng);
        placeInto(room, room.decor, 'decor', ri(rng, opts.decor, opts.decor + 4), rng);
        if (!room.isSafe) {
          var pool = area.pool;
          var t1 = pick(rng, pool);
          var t2 = pool.length > 1 ? pick(rng, pool) : t1;    // <=2 tipe/ruang
          var n = ri(rng, opts.enemies, opts.enemies + 1);
          for (var i = 0; i < n; i++)
            placeInto(room, room.enemies, 'enemy', 1, rng, { awayFromDoor: 3, type: i % 2 ? t2 : t1 });
        }
        if (rng() < 0.45)
          placeInto(room, room.rewards, 'reward', 1, rng, { type: rng() < 0.5 ? 'heart' : 'flower' });
      });

      // 6. VALIDATE DENSITY -> FIX -> ukur ulang (SEBELUM kepingan)
      var dfails = validateDensity(level, opts);
      if (dfails.length) {
        fixDensity(level, opts, rng);
        dfails = validateDensity(level, opts);
      }
      if (dfails.length) continue;      // regen dengan seed berbeda

      // 7. PLACE PIECES (deterministik dari nomor area)
      var pieces = piecesForArea(areaIdx);
      var slots = level.rooms.filter(function (rm) { return !rm.isSafe; });
      // sebar merata, jarak >=2 ruang
      var step = pieces.length ? Math.max(2, Math.floor(slots.length / pieces.length)) : 0;
      pieces.forEach(function (p, i) {
        var rm = slots[Math.min(slots.length - 1, i * step)];
        if (!rm) return;
        rm.pieceKey = p.key;
        var free = freeTiles(rm).filter(function (t) { return !nearDoor(rm, t.x, t.y, 2); });
        var t = free.length ? free[Math.floor(free.length / 2)] : { x: Math.floor(CFG.ROOM_W / 2), y: Math.floor(CFG.ROOM_H / 2) };
        rm.pieceAt = { tx: t.x, ty: t.y };
      });

      // 8. POWERUP (Powerup Relevance Rule — hanya di area yang masih punya sisa)
      if (areaIdx === 2) tagPowerup(level, 'fire_arrow');
      if (areaIdx === 3) tagPowerup(level, 'boots');
      if (areaIdx === 4) tagPowerup(level, 'charm');

      // 9. VALIDATE PLAYABILITY
      var pfails = validatePlayability(level);
      if (pfails.length) {
        // fix ringan: geser musuh yang terlalu dekat pintu
        level.rooms.forEach(function (room) {
          room.enemies = room.enemies.filter(function (en) { return !nearDoor(room, en.tx, en.ty, 2); });
        });
        fixDensity(level, opts, rng);
        pfails = validatePlayability(level);
      }
      if (pfails.length) continue;

      return level;
    }

    // FALLBACK: level minimal yang dijamin lolos (jangan pernah blank)
    return fallbackArea(areaIdx, diff);
  }

  function tagPowerup(level, kind) {
    var rm = level.rooms[Math.floor(level.rooms.length / 2)];
    if (rm) { rm.powerup = kind; }
  }

  function fallbackArea(areaIdx, diff) {
    var area = CFG.AREAS[areaIdx];
    var opts = CFG.DENSITY[diff];
    var rng = makeRng(999 + areaIdx);
    var level = { areaIdx: areaIdx, rooms: [] };
    for (var r = 0; r < area.rows; r++)
      for (var c = 0; c < area.cols; c++) {
        var room = makeRoom(areaIdx, c, r, area.cols, area.rows);
        room.isSafe = (areaIdx === 0 && r === 0 && c === 0);
        room.ambient = true;
        level.rooms.push(room);
      }
    level.rooms.sort(function (a, b) { return a.index - b.index; });
    fixDensity(level, opts, rng);
    var pieces = piecesForArea(areaIdx);
    var slots = level.rooms.filter(function (rm2) { return !rm2.isSafe; });
    pieces.forEach(function (p, i) {
      var rm2 = slots[i % slots.length];
      if (!rm2 || rm2.pieceKey) return;
      rm2.pieceKey = p.key;
      var free = freeTiles(rm2);
      var t = free.length ? free[Math.floor(free.length / 2)] : { x: Math.floor(CFG.ROOM_W / 2), y: Math.floor(CFG.ROOM_H / 2) };
      rm2.pieceAt = { tx: t.x, ty: t.y };
    });
    return level;
  }

  /* ======================================================================
     8. TEXTURES — sheet PNG (APPENDIX P) + FALLBACK prosedural ber-shading
     ====================================================================== */
  function sheetUrl(name) {
    var el = qs('[data-asset="' + name + '"]');
    var src = el && el.getAttribute('src');
    if (!src || src.indexOf('{{') === 0 || !src.trim()) return null;
    return src;
  }

  // helper shading (base + highlight top 22% + shadow bottom 22% + outline)
  function box(g, x, y, w, h, base, hi, sh) {
    g.fillStyle(base, 1); g.fillRect(x, y, w, h);
    var band = Math.max(1, (h * 0.22) | 0);
    if (hi != null) { g.fillStyle(hi, 1); g.fillRect(x, y, w, band); }
    if (sh != null) { g.fillStyle(sh, 1); g.fillRect(x, y + h - band, w, band); }
  }
  function outline(g, x, y, w, h) { g.lineStyle(1, 0x1a2416, 1); g.strokeRect(x, y, w, h); }

  function tex(scene, key, w, h, draw) {
    if (sheetApplied[key]) return;              // sudah diganti PNG asli -> JANGAN timpa
    if (scene.textures.exists(key)) return;
    var g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  function buildFallbackTextures(scene) {
    var T = CFG.TILE;

    // --- tiles ---
    tex(scene, 't_floor', T, T, function (g) {
      box(g, 0, 0, T, T, 0x5a8f42, 0x6ea854, 0x47773a);
      g.fillStyle(0x4d8038, 1);
      g.fillRect(3, 5, 2, 1); g.fillRect(10, 11, 2, 1); g.fillRect(7, 2, 1, 1);
    });
    tex(scene, 't_wall', T, T, function (g) {
      box(g, 0, 0, T, T, 0x2c4a24, 0x3a5f30, 0x1e3418);
      g.fillStyle(0x24401e, 1); g.fillCircle(5, 5, 3); g.fillCircle(11, 9, 3.5);
      outline(g, 0, 0, T, T);
    });
    tex(scene, 't_water', T, T, function (g) {
      box(g, 0, 0, T, T, 0x3f6a8a, 0x5386a8, 0x2f5270);
      g.fillStyle(0x6fa0bd, 1); g.fillRect(2, 6, 5, 1); g.fillRect(9, 11, 4, 1);
    });

    // --- player (4 arah x state, prosedural sederhana tapi ber-shading) ---
    var SKIN = 0xe8c39a, SUIT = 0x1e2430, DRESS = 0xf0f0e8, HAIR = 0x3a2a1e;
    function drawPerson(g, dir, phase, isBride, shooting) {
      var body = isBride ? DRESS : SUIT;
      var bw = isBride ? 9 : 8;
      var bx = (16 - bw) / 2;
      // bayangan
      g.fillStyle(0x000000, 0.22); g.fillEllipse(8, 15, 10, 3);
      // kaki (langkah bergantian)
      var off = phase % 2 === 0 ? 1 : -1;
      g.fillStyle(0x2a2a2a, 1);
      g.fillRect(6, 12 + (off > 0 ? 0 : 1), 2, 3);
      g.fillRect(9, 12 + (off > 0 ? 1 : 0), 2, 3);
      // badan
      box(g, bx, 6, bw, 7, body, lighten(body), darken(body));
      // kepala
      box(g, 5, 1, 6, 5, SKIN, lighten(SKIN), darken(SKIN));
      // rambut / kerudung
      if (isBride) { g.fillStyle(0xffffff, 1); g.fillRect(4, 0, 8, 3); g.fillRect(3, 2, 2, 5); g.fillRect(11, 2, 2, 5); }
      else { g.fillStyle(HAIR, 1); g.fillRect(5, 0, 6, 2); }
      // mata (hanya arah bawah/samping)
      if (dir !== 'up') {
        g.fillStyle(0x141414, 1);
        if (dir === 'down') { g.fillRect(6, 3, 1, 1); g.fillRect(9, 3, 1, 1); }
        else { g.fillRect(9, 3, 1, 1); }
      }
      // busur
      g.lineStyle(1, 0x8a6a3a, 1);
      if (shooting) { g.beginPath(); g.arc(13, 8, 4, -1.2, 1.2); g.strokePath(); }
      else { g.beginPath(); g.arc(12, 9, 3, -1.0, 1.0); g.strokePath(); }
      outline(g, bx, 6, bw, 7);
    }
    ['down', 'up', 'side'].forEach(function (dir) {
      [0, 1].forEach(function (i) {
        tex(scene, 't_p_idle_' + dir + '_' + i, 16, 16, function (g) { drawPerson(g, dir, i, STORE.character === 'bride', false); });
      });
      [0, 1, 2, 3, 4, 5].forEach(function (i) {
        tex(scene, 't_p_walk_' + dir + '_' + i, 16, 16, function (g) { drawPerson(g, dir, i, STORE.character === 'bride', false); });
      });
      [0, 1, 2].forEach(function (i) {
        tex(scene, 't_p_shoot_' + dir + '_' + i, 16, 16, function (g) { drawPerson(g, dir, i, STORE.character === 'bride', true); });
      });
    });

    // --- musuh ---
    function moleFrame(g, phase) {
      g.fillStyle(0x000000, 0.22); g.fillEllipse(8, 14, 10, 3);
      box(g, 3, 6, 10, 7, 0x8a6a4a, 0xa78560, 0x6b5138);
      g.fillStyle(0xd89a9a, 1); g.fillRect(11 + (phase % 2), 8, 3, 3);   // moncong
      g.fillStyle(0x141414, 1); g.fillRect(6, 8, 1, 1); g.fillRect(9, 8, 1, 1);
      g.fillStyle(0xe0d0b8, 1); g.fillRect(2, 11 + (phase % 2), 2, 2);   // cakar
      outline(g, 3, 6, 10, 7);
    }
    function treantFrame(g, phase) {
      g.fillStyle(0x000000, 0.22); g.fillEllipse(8, 15, 12, 3);
      box(g, 5, 7, 6, 7, 0x6b4a2a, 0x86603a, 0x503820);          // batang
      box(g, 1, 1, 14, 7, 0x3a5f30, 0x4e7a40, 0x2a4522);         // kanopi
      g.fillStyle(0xe8d05a, 1);
      g.fillRect(5, 4 + (phase % 2), 2, 2); g.fillRect(9, 4 + (phase % 2), 2, 2);  // mata
      g.fillStyle(0x503820, 1); g.fillRect(4, 13, 3, 2); g.fillRect(9, 13, 3, 2);  // akar
      outline(g, 1, 1, 14, 7);
    }
    [0, 1, 2, 3, 4, 5].forEach(function (i) {
      tex(scene, 't_e_mole_' + i, 16, 16, function (g) { moleFrame(g, i); });
      tex(scene, 't_e_treant_' + i, 16, 18, function (g) { treantFrame(g, i); });
      tex(scene, 't_e_mole_dig_' + i, 16, 16, function (g) { moleFrame(g, i); });
    });
    tex(scene, 't_e_mole_dig_buried', 16, 16, function (g) {
      g.fillStyle(0x6b5138, 1); g.fillEllipse(8, 12, 12, 5);
      g.fillStyle(0x8a6a4a, 1); g.fillEllipse(8, 11, 8, 3);
    });
    tex(scene, 't_e_treant_old', 18, 20, function (g) {
      g.fillStyle(0x000000, 0.22); g.fillEllipse(9, 18, 14, 3);
      box(g, 4, 5, 10, 13, 0x4a3f32, 0x5e5142, 0x342c22);
      box(g, 2, 0, 14, 6, 0x3f4a30, 0x53603e, 0x2c3522);
      g.fillStyle(0x5a8ad0, 1); g.fillRect(5, 10, 2, 2); g.fillRect(11, 13, 2, 2);  // lumut
      g.fillStyle(0xd05a5a, 1); g.fillRect(6, 3, 2, 2); g.fillRect(10, 3, 2, 2);    // mata
      outline(g, 2, 0, 14, 6);
    });
    [0, 1, 2, 3].forEach(function (i) {
      tex(scene, 't_e_firefly_' + i, 12, 12, function (g) {
        var a = 0.4 + (i % 2) * 0.35;
        g.fillStyle(0xffb84a, a); g.fillCircle(6, 6, 5.5);
        g.fillStyle(0xffe08a, 1); g.fillCircle(6, 6, 3);
        g.fillStyle(0xfff8d0, 1); g.fillCircle(6, 5, 1.5);
      });
    });
    tex(scene, 't_e_thorn_up', 16, 16, function (g) {
      g.fillStyle(0x4a3524, 1);
      g.fillTriangle(3, 16, 6, 4, 9, 16);
      g.fillTriangle(8, 16, 11, 6, 14, 16);
      g.fillStyle(0x6b5138, 1); g.fillTriangle(4, 16, 6, 7, 8, 16);
    });
    tex(scene, 't_e_thorn_crack', 16, 16, function (g) {
      g.lineStyle(1, 0x3a2a1c, 1);
      g.beginPath(); g.moveTo(4, 12); g.lineTo(8, 9); g.lineTo(12, 13); g.strokePath();
    });

    // --- boss ---
    tex(scene, 't_boss', 64, 80, function (g) {
      g.fillStyle(0x000000, 0.25); g.fillEllipse(32, 76, 44, 8);
      box(g, 22, 34, 20, 42, 0x4a3826, 0x63503a, 0x33261a);          // batang
      box(g, 4, 4, 56, 34, 0x2f5a28, 0x3f7436, 0x21401c);            // kanopi
      g.fillStyle(0x6ad06a, 1); g.fillCircle(24, 46, 4); g.fillCircle(40, 46, 4);
      g.fillStyle(0xffffff, 1); g.fillCircle(24, 45, 1.6); g.fillCircle(40, 45, 1.6);
      g.fillStyle(0x33261a, 1);
      g.fillRect(6, 40, 14, 5); g.fillRect(44, 40, 14, 5);           // lengan ranting
      g.fillRect(16, 72, 12, 6); g.fillRect(36, 72, 12, 6);          // akar
      outline(g, 4, 4, 56, 34);
    });

    // --- objek ---
    tex(scene, 't_arrow_h', 12, 4, function (g) {
      g.fillStyle(0x8a6a3a, 1); g.fillRect(0, 1, 9, 2);
      g.fillStyle(0xc8c8c8, 1); g.fillTriangle(9, 0, 12, 2, 9, 4);
      g.fillStyle(0xf0f0f0, 1); g.fillRect(0, 0, 2, 1); g.fillRect(0, 3, 2, 1);
    });
    tex(scene, 't_arrow_v', 4, 12, function (g) {
      g.fillStyle(0x8a6a3a, 1); g.fillRect(1, 3, 2, 9);
      g.fillStyle(0xc8c8c8, 1); g.fillTriangle(0, 3, 2, 0, 4, 3);
      g.fillStyle(0xf0f0f0, 1); g.fillRect(0, 10, 1, 2); g.fillRect(3, 10, 1, 2);
    });
    tex(scene, 't_seed', 6, 6, function (g) {
      g.fillStyle(0x6b4a2a, 1); g.fillCircle(3, 3, 3);
      g.fillStyle(0x8a6440, 1); g.fillCircle(3, 2, 1.4);
    });
    tex(scene, 't_bush', 16, 16, function (g) {
      g.fillStyle(0x000000, 0.18); g.fillEllipse(8, 14, 11, 3);
      box(g, 2, 4, 12, 10, 0x3f7a34, 0x54993f, 0x2c5726);
      g.fillStyle(0x2c5726, 1); g.fillCircle(5, 8, 2); g.fillCircle(11, 10, 2);
      outline(g, 2, 4, 12, 10);
    });
    tex(scene, 't_rock', 16, 16, function (g) {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(8, 14, 12, 3);
      box(g, 2, 5, 12, 9, 0x8a8578, 0xa8a294, 0x656055);
      g.fillStyle(0x656055, 1); g.fillRect(5, 9, 3, 2);
      outline(g, 2, 5, 12, 9);
    });
    tex(scene, 't_spark', 6, 6, function (g) {
      g.fillStyle(0xfff2c0, 1); g.fillCircle(3, 3, 3);
      g.fillStyle(0xffffff, 1); g.fillCircle(3, 3, 1.4);
    });
    tex(scene, 't_heart', 10, 10, function (g) {
      g.fillStyle(0xd05a5a, 1); g.fillCircle(3.2, 3.5, 2.6); g.fillCircle(6.8, 3.5, 2.6);
      g.fillTriangle(0.6, 4.4, 9.4, 4.4, 5, 9.6);
      g.fillStyle(0xf09a9a, 1); g.fillCircle(2.6, 2.8, 1);
    });
    tex(scene, 't_flower', 10, 10, function (g) {
      g.fillStyle(0xe8c15a, 1);
      g.fillCircle(5, 2.4, 2.2); g.fillCircle(5, 7.6, 2.2);
      g.fillCircle(2.4, 5, 2.2); g.fillCircle(7.6, 5, 2.2);
      g.fillStyle(0xd05a5a, 1); g.fillCircle(5, 5, 2);
    });
    // dekorasi
    tex(scene, 't_tree', 20, 24, function (g) {
      g.fillStyle(0x000000, 0.2); g.fillEllipse(10, 22, 14, 4);
      box(g, 8, 13, 5, 10, 0x6b4a2a, 0x86603a, 0x503820);
      box(g, 1, 1, 18, 14, 0x35682c, 0x478038, 0x254c1e);
      outline(g, 1, 1, 18, 14);
    });
    tex(scene, 't_mushroom', 10, 10, function (g) {
      g.fillStyle(0xf0e8d8, 1); g.fillRect(4, 5, 3, 5);
      g.fillStyle(0xc0403a, 1); g.fillEllipse(5, 4, 10, 6);
      g.fillStyle(0xf0f0f0, 1); g.fillCircle(3, 3, 1.2); g.fillCircle(7, 4, 1);
    });
    tex(scene, 't_grass', 10, 8, function (g) {
      g.fillStyle(0x4d8038, 1);
      g.fillTriangle(1, 8, 3, 1, 4, 8);
      g.fillTriangle(4, 8, 6, 0, 8, 8);
    });
    tex(scene, 't_stump', 12, 10, function (g) {
      g.fillStyle(0x000000, 0.18); g.fillEllipse(6, 9, 10, 3);
      box(g, 1, 3, 10, 6, 0x6b4a2a, 0x86603a, 0x503820);
      g.fillStyle(0x8a6440, 1); g.fillEllipse(6, 3.5, 9, 4);
    });

    // --- peti kepingan ---
    [0, 1, 2, 3, 4].forEach(function (i) {
      tex(scene, 't_chest_' + i, 16, 16, function (g) {
        g.fillStyle(0x000000, 0.2); g.fillEllipse(8, 15, 12, 3);
        var lid = i * 1.6;
        box(g, 2, 7, 12, 7, 0x8a6a3a, 0xa8854a, 0x6b5128);          // badan
        box(g, 2, 4 - lid, 12, 4, 0x9a7a44, 0xb89658, 0x7a5e30);    // tutup
        g.fillStyle(0xe8c15a, 1);
        g.fillRect(2, 6 - lid, 12, 1); g.fillRect(7, 8, 2, 3);
        if (i >= 2) { g.fillStyle(0xfff0c0, 0.25 + i * 0.12); g.fillRect(3, 5, 10, 5); }
        if (i === 4) { g.fillStyle(0xffffff, 1); g.fillRect(5, 1, 6, 4);
                       g.fillStyle(0xd05a5a, 1); g.fillCircle(8, 3, 1.2); }
        outline(g, 2, 7, 12, 7);
      });
    });
    tex(scene, 't_gate_closed', 48, 40, function (g) {
      box(g, 0, 4, 10, 36, 0x7a7268, 0x968d80, 0x5c554d);
      box(g, 38, 4, 10, 36, 0x7a7268, 0x968d80, 0x5c554d);
      box(g, 0, 0, 48, 8, 0x8a8278, 0xa89e90, 0x6c655d);
      box(g, 10, 8, 28, 32, 0x3a352e, 0x4a443b, 0x282420);
      g.fillStyle(0xe8c15a, 1); g.fillCircle(24, 22, 3);
    });
    tex(scene, 't_gate_open', 48, 40, function (g) {
      box(g, 0, 4, 10, 36, 0x7a7268, 0x968d80, 0x5c554d);
      box(g, 38, 4, 10, 36, 0x7a7268, 0x968d80, 0x5c554d);
      box(g, 0, 0, 48, 8, 0x8a8278, 0xa89e90, 0x6c655d);
      g.fillStyle(0xffe9a8, 1); g.fillRect(10, 8, 28, 32);
      g.fillStyle(0xfff8e0, 1); g.fillRect(16, 8, 16, 32);
    });
    tex(scene, 't_couple', 40, 36, function (g) {
      g.fillStyle(0xd05a5a, 0.9); g.fillRect(2, 30, 36, 6);          // karpet
      // pria
      box(g, 8, 14, 8, 14, 0x1e2430, 0x39414f, 0x141922);
      box(g, 9, 8, 6, 6, 0xe8c39a, 0xf5d6b4, 0xc9a077);
      g.fillStyle(0x3a2a1e, 1); g.fillRect(9, 7, 6, 2);
      // wanita
      box(g, 24, 14, 9, 14, 0xf0f0e8, 0xffffff, 0xcfcfc4);
      box(g, 25, 8, 6, 6, 0xe8c39a, 0xf5d6b4, 0xc9a077);
      g.fillStyle(0xffffff, 1); g.fillRect(24, 6, 8, 3);
      g.fillStyle(0xd05a5a, 1); g.fillCircle(22, 18, 2.2);           // buket/hati
    });
  }

  function lighten(c) {
    var r = Math.min(255, ((c >> 16) & 255) + 34), g2 = Math.min(255, ((c >> 8) & 255) + 34), b = Math.min(255, (c & 255) + 34);
    return (r << 16) | (g2 << 8) | b;
  }
  function darken(c) {
    var r = Math.max(0, ((c >> 16) & 255) - 34), g2 = Math.max(0, ((c >> 8) & 255) - 34), b = Math.max(0, (c & 255) - 34);
    return (r << 16) | (g2 << 8) | b;
  }

  function buildAnims(scene) {
    function mk(key, keys, rate, repeat) {
      if (scene.anims.exists(key)) return;
      // Hanya pakai frame yang benar-benar ada (sheet asli bisa punya jumlah frame beda)
      var frames = keys.filter(function (k) { return scene.textures.exists(k); })
                       .map(function (k) { return { key: k }; });
      if (!frames.length) return;
      scene.anims.create({
        key: key, frames: frames,
        frameRate: rate, repeat: repeat == null ? -1 : repeat
      });
    }
    ['down', 'up', 'side'].forEach(function (d) {
      mk('p_idle_' + d, ['t_p_idle_' + d + '_0', 't_p_idle_' + d + '_1'], 3);
      mk('p_walk_' + d, [0, 1, 2, 3, 4, 5].map(function (i) { return 't_p_walk_' + d + '_' + i; }), 8);
      mk('p_shoot_' + d, [0, 1, 2].map(function (i) { return 't_p_shoot_' + d + '_' + i; }), 12, 0);
    });
    // Jumlah frame mengikuti aset NYATA (paket hanya punya mole & treant, 4 frame).
    // mk() sudah menyaring ke tekstur yang benar-benar ada, jadi daftar longgar
    // aman -- tapi tetap ditulis sesuai kenyataan agar tak menyesatkan.
    mk('e_mole', [0, 1, 2, 3].map(function (i) { return 't_e_mole_' + i; }), 8);
    mk('e_treant', [0, 1, 2, 3].map(function (i) { return 't_e_treant_' + i; }), 6);
    mk('e_death', [0, 1, 2, 3, 4, 5].map(function (i) { return 't_e_death_' + i; }), 14, 0);
    mk('o_coin', [0, 1, 2, 3].map(function (i) { return 't_coin_' + i; }), 8);
    mk('o_gem', [0, 1, 2, 3].map(function (i) { return 't_gem_' + i; }), 8);
    mk('o_chest', [0, 1, 2, 3, 4].map(function (i) { return 't_chest_' + i; }), 10, 0);
    // e_mole_dig / e_firefly: tak ada bahannya di paket -> sengaja tidak dibuat.
  }

  /* ======================================================================
     9. SCENES
     ====================================================================== */
  var P = null;   // window.Phaser (di-set saat boot)

  function defineScenes() {

    /* ---------------- GameScene ---------------- */
    function GameScene() { P.Scene.call(this, { key: 'GameScene' }); }
    GameScene.prototype = Object.create(P.Scene.prototype);
    GameScene.prototype.constructor = GameScene;

    GameScene.prototype.init = function (data) {
      this.areaIdx = (data && data.area) || 0;
      this.diffKey = STORE.diff;
      this.D = CFG.DIFF[this.diffKey];
      this.roomIdx = 0;
      this.transitioning = false;
      this.inputLocked = false;
      this.bossActive = false;
      this.bossDefeated = false;
      this.arenaY = null;
      this.freezeUntil = 0;
    };

    GameScene.prototype.create = function () {
      var self = this;
      buildFallbackTextures(this);
      loadSheetsIfAny(this);
      buildAnims(this);

      this.level = buildArea(this.areaIdx, this.diffKey, 1337);
      runState.area = this.areaIdx;
      if (this.areaIdx > STORE.maxArea) { STORE.maxArea = this.areaIdx; saveStore(); }

      // groups
      this.walls    = this.physics.add.staticGroup();
      this.rocks    = this.physics.add.staticGroup();
      this.bushes   = this.physics.add.staticGroup();
      this.decor    = this.add.group();
      this.enemies  = this.physics.add.group();
      this.arrows   = this.physics.add.group({ maxSize: 12 });
      this.eBullets = this.physics.add.group({ maxSize: 20 });
      this.pickups  = this.physics.add.group();
      this.chests   = this.physics.add.staticGroup();
      this.doors    = this.physics.add.staticGroup();
      this.depthSorted = [];

      // player
      // Titik spawn dihitung dari ukuran ruang, JANGAN hardcode.
      // Nilai lama {x:7,y:5} cocok untuk ruang 11x15; di ruang 8x11 itu
      // menempel dinding kanan (x=7 dari lebar 8).
      var startTile = { x: Math.floor(CFG.ROOM_W / 2), y: Math.floor(CFG.ROOM_H / 2) };
      this.player = this.physics.add.sprite(startTile.x * CFG.TILE + CFG.TILE / 2, startTile.y * CFG.TILE + CFG.TILE / 2, 't_p_idle_down_0');
      this.player.body.setSize(20, 24).setOffset(6, 8);   // x2 (TILE 32)
      this.player.pState = 'idle';
      this.player.facing = 'down';
      this.player.invulnUntil = 0;
      this.player.shootCdUntil = 0;
      // Depth player HARUS memakai skema yang sama dengan dekorasi (berbasis Y),
      // bukan angka tetap. Dekorasi memakai setDepth(ty * TILE) -> nilainya
      // 0..224, jadi setDepth(10) membuat player TERTIMBUN hampir semua objek
      // (bug "karakter tidak muncul"). Nilai di-update tiap frame di update().
      this.player.setDepth(this.player.y);
      this.depthSorted.push(this.player);

      // partikel (API 3.60+)
      this.fx = this.add.particles(0, 0, 't_spark', {
        speed: { min: -140, max: 140 }, scale: { start: 0.9, end: 0 },
        lifespan: 500, blendMode: 'ADD', emitting: false, maxAliveParticles: 120
      });
      this.fx.setDepth(60);

      // input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keySpace = this.input.keyboard.addKey(P.Input.Keyboard.KeyCodes.SPACE);

      // colliders — URUTAN PENTING: overlap arrows x enemies SEBELUM collider walls (§5.4)
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(this.player, this.rocks);
      this.physics.add.collider(this.player, this.bushes);
      this.physics.add.collider(this.enemies, this.walls);
      this.physics.add.collider(this.enemies, this.rocks);

      this.physics.add.overlap(this.arrows, this.enemies, this.hitEnemy, null, this);
      this.physics.add.overlap(this.arrows, this.bushes, this.hitBush, null, this);
      this.physics.add.collider(this.arrows, this.walls,
        function (a) { self.killArrow(a); },
        function (a) { return !self.arrowOverEnemy(a); }, this);
      this.physics.add.collider(this.arrows, this.rocks,
        function (a) { self.killArrow(a); },
        function (a) { return !self.arrowOverEnemy(a); }, this);

      this.physics.add.overlap(this.player, this.enemies, this.hurtPlayer, null, this);
      this.physics.add.overlap(this.player, this.eBullets, this.hurtByBullet, null, this);
      this.physics.add.overlap(this.player, this.pickups, this.collectPickup, null, this);
      this.physics.add.overlap(this.player, this.chests, this.openChest, null, this);
      this.physics.add.overlap(this.player, this.doors, this.touchDoor, null, this);

      // Kamera dihitung dari ukuran kanvas NYATA (Scale.RESIZE), bukan konstanta.
      this.cameras.main.setBackgroundColor(CFG.AREAS[this.areaIdx].sky);
      this.cameras.main.setRoundPixels(true);
      this.applyCameraFit();

      // Kanvas ikut ukuran frame -> resize saat orientasi/URL-bar berubah.
      var self0 = this;
      this.scale.on('resize', function () { self0.applyCameraFit(); });

      this.enterRoom(0, null);
      banner(CFG.AREAS[this.areaIdx].name, 1600);

      this.events.once(P.Scenes.Events.SHUTDOWN, function () {
        try { self.time.removeAllEvents(); self.tweens.killAll(); } catch (e) {}
        try { if (self.fx) self.fx.destroy(); } catch (e) {}
      });
    };

    /* ---------------------------------------------------------------------
       applyCameraFit — SATU-SATUNYA sumber kebenaran ukuran kamera.
       Dibaca dari ukuran kanvas NYATA (this.scale.gameSize), bukan CFG.BW/BH,
       karena Scale.RESIZE membuat kanvas seukuran #frpg-stage yang berubah-ubah.

       - viewport = SELURUH kanvas (tak ada zona kosong -> tak ada pita gelap)
       - zoom = bilangan bulat terbesar yang membuat 1 ruang memenuhi layar
       - centerOn tengah ruang; bounds = ruang, jadi hanya 1 ruang tampil
       --------------------------------------------------------------------- */
    GameScene.prototype.applyCameraFit = function () {
      var cam = this.cameras.main;
      // Koordinat internal TETAP (Scale.FIT mengurus penskalaan ke layar), jadi
      // viewport = area main di atas zona kontrol, zoom = 1 (1 px dunia = 1 px kanvas).
      // Ruang 192x256 PAS mengisi 192x256 -> 100% x 100%, sama di semua HP.
      var viewH = CFG.BH - Math.round(CFG.BH * CFG.CTRL_FRAC);   // 320 - 64 = 256
      cam.setViewport(0, 0, CFG.BW, viewH);
      cam.setZoom(1);
      cam.setBounds(0, 0, CFG.ROOM_PX_W, CFG.ROOM_PX_H);
      cam.centerOn(CFG.ROOM_PX_W / 2, CFG.ROOM_PX_H / 2);
    };

    /* ---------- ROOM: spawn PER-RUANG (musuh ruang lain tak ber-hitbox, §5.3) ---------- */
    GameScene.prototype.rectOfRoom = function () {
      return new P.Geom.Rectangle(0, 0, CFG.ROOM_PX_W, CFG.ROOM_PX_H);
    };

    GameScene.prototype.enterRoom = function (idx, fromDir) {
      var self = this;
      var room = this.level.rooms[idx];
      if (!room) return;
      this.roomIdx = idx;
      runState.room = idx;

      // bongkar ruang lama — musuh & panah TIDAK menyeberang ruang
      this.enemies.clear(true, true);
      this.arrows.clear(true, true);
      this.eBullets.clear(true, true);
      this.pickups.clear(true, true);
      this.walls.clear(true, true);
      this.rocks.clear(true, true);
      this.bushes.clear(true, true);
      this.chests.clear(true, true);
      this.doors.clear(true, true);
      this.decor.clear(true, true);
      this.depthSorted = [this.player];

      var T = CFG.TILE, A = CFG.AREAS[this.areaIdx];

      // lantai + dinding
      for (var y = 0; y < CFG.ROOM_H; y++) {
        for (var x = 0; x < CFG.ROOM_W; x++) {
          var t = room.tiles[y][x];
          var px = x * T + T / 2, py = y * T + T / 2;
          if (t === TT.WALL) {
            var w = this.walls.create(px, py, 't_wall'); w.setDepth(-5);
          } else {
            var f = this.add.image(px, py, 't_floor'); f.setDepth(-20);
            f.setTint(A.ground);
          }
        }
      }

      // rintangan / destructible / dekorasi
      room.obstacles.forEach(function (o) {
        var r = self.rocks.create(o.tx * T + T / 2, o.ty * T + T / 2, 't_rock');
        r.setDepth(o.ty * T);
      });
      room.destruct.forEach(function (b) {
        var s = self.bushes.create(b.tx * T + T / 2, b.ty * T + T / 2, 't_bush');
        s.setDepth(b.ty * T);
      });
      room.decor.forEach(function (d, i) {
        var keys = ['t_tree', 't_mushroom', 't_grass', 't_stump', 't_flower'];
        var k = keys[i % keys.length];
        var im = self.add.image(d.tx * T + T / 2, d.ty * T + T / 2, k);
        im.setDepth(k === 't_tree' ? d.ty * T : -10);
        if (k === 't_tree') self.depthSorted.push(im);
      });

      // reward
      room.rewards.forEach(function (rw) {
        var p = self.pickups.create(rw.tx * T + T / 2, rw.ty * T + T / 2,
          rw.type === 'heart' ? 't_heart' : 't_flower');
        p.itemType = rw.type;
        p.body.setAllowGravity(false);
        self.tweens.add({ targets: p, y: p.y - 3, duration: 700, yoyo: true, repeat: -1 });
      });

      // powerup
      if (room.powerup && !runState[powerFlag(room.powerup)]) {
        var pu = this.pickups.create(Math.floor(CFG.ROOM_W / 2) * T, Math.floor(CFG.ROOM_H / 2) * T, 't_flower');
        pu.itemType = room.powerup;
        pu.setTint(0xffd070).setScale(1.4);
        pu.body.setAllowGravity(false);
        this.tweens.add({ targets: pu, scale: 1.6, duration: 600, yoyo: true, repeat: -1 });
      }

      // peti kepingan (hanya bila belum diambil)
      if (room.pieceKey && room.pieceAt && !isUnlocked(room.pieceKey)) {
        var ch = this.chests.create(room.pieceAt.tx * T + T / 2, room.pieceAt.ty * T + T / 2, 't_chest_0');
        ch.pieceKey = room.pieceKey;
        ch.opened = false;
        ch.setDepth(room.pieceAt.ty * T);
        this.tweens.add({ targets: ch, alpha: 0.82, duration: 800, yoyo: true, repeat: -1 });
      }

      // musuh — di-instantiate SAAT masuk ruang (bukan saat load area)
      room.enemies.forEach(function (rec) { self.spawnEnemy(rec.type, rec.tx, rec.ty); });

      // pintu
      var mx = Math.floor(CFG.ROOM_W / 2), my = Math.floor(CFG.ROOM_H / 2);
      if (room.doors.up)    this.mkDoor(mx * T, 2, 'up');
      if (room.doors.down)  this.mkDoor(mx * T, (CFG.ROOM_H - 1) * T - 2, 'down');
      if (room.doors.left)  this.mkDoor(2, my * T, 'left');
      if (room.doors.right) this.mkDoor((CFG.ROOM_W - 1) * T - 2, my * T, 'right');

      // gerbang di ruang terakhir area 6
      if (this.areaIdx === CFG.AREAS.length - 1 && idx === this.level.rooms.length - 1) {
        this.buildBossArena();
      }

      // posisi player: masuk dari sisi berlawanan, offset ke DALAM
      if (fromDir) {
        var ins = CFG.DOOR_INSET;
        if (fromDir === 'up')    this.player.setPosition(mx * T, CFG.ROOM_PX_H - ins);
        if (fromDir === 'down')  this.player.setPosition(mx * T, ins);
        if (fromDir === 'left')  this.player.setPosition(CFG.ROOM_PX_W - ins, my * T);
        if (fromDir === 'right') this.player.setPosition(ins, my * T);
      }

      // kamera: viewport + zoom + bounds dari ukuran kanvas nyata (satu sumber)
      this.applyCameraFit();

      // anti spawn-kill: bekukan musuh sejenak
      this.enemyFreezeUntil = this.time.now + CFG.SPAWN_GRACE_MS;
      this.updateHudArea();
    };

    GameScene.prototype.mkDoor = function (x, y, dir) {
      var d = this.doors.create(x, y, 't_floor');
      d.setAlpha(0.001);
      d.dir = dir;
      d.body.setSize(CFG.TILE, CFG.TILE);
      return d;
    };

    GameScene.prototype.updateHudArea = function () {
      var el = $('frpg-area-name');
      if (el) el.textContent = CFG.AREAS[this.areaIdx].name;
    };

    /* ---------- ENEMY ---------- */
    GameScene.prototype.spawnEnemy = function (type, tx, ty) {
      var spec = CFG.ENEMY[type];
      if (!spec) return null;
      if (type === 'firefly' && this.D.fireflyMax <= 0) return null;

      var T = CFG.TILE;
      var texKey = ({
        mole: 't_e_mole_0', treant: 't_e_treant_0', mole_dig: 't_e_mole_dig_buried',
        treant_old: 't_e_treant_old', firefly: 't_e_firefly_0', thorn: 't_e_thorn_crack'
      })[type];

      var e = this.enemies.create(tx * T + T / 2, ty * T + T / 2, texKey);
      e.eType = type;
      e.hp = spec.hp;
      e.dmg = spec.dmg;
      e.body.setSize(spec.w, spec.h);
      e.setDepth(ty * T);
      this.depthSorted.push(e);

      var sp = spec.speed * this.D.speedMul;

      if (type === 'mole' || type === 'treant') {
        e.setImmovable(true);
        e.body.bounce.set(1);
        e.setCollideWorldBounds(true);
        if (spec.axis === 'y') e.body.velocity.y = (Math.random() < 0.5 ? -1 : 1) * sp;
        else                   e.body.velocity.x = (Math.random() < 0.5 ? -1 : 1) * sp;
        e.play(type === 'mole' ? 'e_mole' : 'e_treant', true);
      } else if (type === 'mole_dig') {
        e.state2 = 'BURIED';
        e.body.enable = false;                 // terkubur = TAK BISA kena panah
        e.setAlpha(0.55);
      } else if (type === 'treant_old') {
        e.setImmovable(true);
        e.nextFire = this.time.now + this.D.oldFire;
      } else if (type === 'firefly') {
        e.body.setAllowGravity(false);
        e.play('e_firefly', true);
      } else if (type === 'thorn') {
        e.state2 = 'HIDDEN';
        e.body.enable = false;
        e.setAlpha(0.35);
        e.cycleAt = this.time.now + spec.hidden;
      }
      return e;
    };

    GameScene.prototype.updateEnemies = function (time, delta) {
      var self = this;
      if (time < this.enemyFreezeUntil) return;
      var px = this.player.x, py = this.player.y;

      this.enemies.getChildren().forEach(function (e) {
        if (!e.active) return;
        var spec = CFG.ENEMY[e.eType];
        var sp = spec.speed * self.D.speedMul;

        if (e.eType === 'mole_dig') {
          var dist = P.Math.Distance.Between(e.x, e.y, px, py);
          if (e.state2 === 'BURIED') {
            if (dist <= spec.trigger) {
              e.state2 = 'TELEGRAPH';
              e.tAt = time + spec.telegraph;
              e.setAlpha(0.8);
              self.fx.explode(6, e.x, e.y);      // partikel tanah = telegraph
            }
          } else if (e.state2 === 'TELEGRAPH') {
            if (time >= e.tAt) {
              e.state2 = 'CHASE';
              e.body.enable = true;              // baru sekarang punya hitbox
              e.setAlpha(1);
              e.setTexture('t_e_mole_dig_0');
              e.play('e_mole_dig', true);
              e.chaseUntil = time + spec.chase;
            }
          } else if (e.state2 === 'CHASE') {
            var ang = P.Math.Angle.Between(e.x, e.y, px, py);
            e.body.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
            if (time >= e.chaseUntil) {
              e.state2 = 'BURIED';
              e.body.enable = false;
              e.body.setVelocity(0, 0);
              e.setAlpha(0.55);
              e.setTexture('t_e_mole_dig_buried');
            }
          }
        } else if (e.eType === 'treant_old') {
          if (time >= e.nextFire) {
            e.nextFire = time + self.D.oldFire;
            e.setTint(0xffcccc);                                  // wind-up telegraph
            self.time.delayedCall(spec.windup, function () {
              if (!e.active) return;
              e.clearTint();
              self.fireSeed(e);
            });
          }
        } else if (e.eType === 'firefly') {
          var a2 = P.Math.Angle.Between(e.x, e.y, px, py);
          e.body.setVelocity(Math.cos(a2) * sp, Math.sin(a2) * sp);
        } else if (e.eType === 'thorn') {
          if (time >= e.cycleAt) {
            if (e.state2 === 'HIDDEN') {
              e.state2 = 'CRACK'; e.cycleAt = time + spec.telegraph;
              e.setAlpha(0.6); e.setTexture('t_e_thorn_crack');
            } else if (e.state2 === 'CRACK') {
              e.state2 = 'ACTIVE'; e.cycleAt = time + self.D.thornActive;
              e.setAlpha(1); e.setTexture('t_e_thorn_up'); e.body.enable = true;
            } else {
              e.state2 = 'HIDDEN'; e.cycleAt = time + spec.hidden;
              e.setAlpha(0.35); e.setTexture('t_e_thorn_crack'); e.body.enable = false;
            }
          }
        } else {
          // mole / treant: flip mengikuti arah
          if (e.body.velocity.x !== 0) e.setFlipX(e.body.velocity.x < 0);
        }
      });
    };

    GameScene.prototype.fireSeed = function (e) {
      var b = this.eBullets.get(e.x, e.y, 't_seed');
      if (!b) return;
      b.setActive(true).setVisible(true).setDepth(20);
      b.body.enable = true;
      b.body.setAllowGravity(false);
      var ang = P.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      var sp = CFG.ENEMY.treant_old.seedSpeed;
      b.body.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp);
      b.bornAt = this.time.now;
      SFX.shoot();
    };

    /* ---------- PLAYER ---------- */
    GameScene.prototype.readInput = function () {
      var k = this.cursors, j = window.__frpgJoy || {};
      return {
        left:  k.left.isDown  || !!j.left,
        right: k.right.isDown || !!j.right,
        up:    k.up.isDown    || !!j.up,
        down:  k.down.isDown  || !!j.down,
        fire:  P.Input.Keyboard.JustDown(this.keySpace) || !!window.__frpgFirePressed
      };
    };

    GameScene.prototype.handlePlayer = function (time) {
      var p = this.player;
      if (this.inputLocked || this.transitioning) { p.body.setVelocity(0, 0); return; }
      if (p.pState === 'hurt') return;

      var inp = this.readInput();
      window.__frpgFirePressed = false;

      // SHOOT mengunci gerak
      if (p.pState === 'shoot') {
        p.body.setVelocity(0, 0);
        if (time >= p.shootLockUntil) p.pState = 'idle';
        return;
      }

      if (inp.fire && time >= p.shootCdUntil) {
        p.shootCdUntil = time + CFG.SHOOT_CD_MS;
        p.shootLockUntil = time + CFG.SHOOT_LOCK_MS;
        p.pState = 'shoot';
        p.body.setVelocity(0, 0);
        this.shootArrow();
        p.play('p_shoot_' + animDir(p.facing), true);
        p.setFlipX(p.facing === 'left');
        return;
      }

      // gerak 4-arah (satu sumbu, prioritas horizontal — pola ForestRPG)
      var sp = runState.hasBoots ? CFG.PLAYER_SPEED_BOOTS : CFG.PLAYER_SPEED;
      var vx = 0, vy = 0;
      if (inp.right)     { vx = sp;  p.facing = 'right'; }
      else if (inp.left) { vx = -sp; p.facing = 'left'; }
      else if (inp.up)   { vy = -sp; p.facing = 'up'; }
      else if (inp.down) { vy = sp;  p.facing = 'down'; }

      p.body.setVelocity(vx, vy);
      var moving = (vx !== 0 || vy !== 0);
      p.pState = moving ? 'walk' : 'idle';
      p.play('p_' + (moving ? 'walk' : 'idle') + '_' + animDir(p.facing), true);
      p.setFlipX(p.facing === 'left');
    };

    function animDir(f) { return (f === 'left' || f === 'right') ? 'side' : f; }

    GameScene.prototype.shootArrow = function () {
      var p = this.player;
      var vert = (p.facing === 'up' || p.facing === 'down');
      var a = this.arrows.get(p.x, p.y, vert ? 't_arrow_v' : 't_arrow_h');
      if (!a) return;                              // pool penuh -> null-check WAJIB
      a.setActive(true).setVisible(true).setDepth(20);
      a.body.enable = true;
      a.body.setAllowGravity(false);
      a.body.setSize(vert ? 8 : 24, vert ? 24 : 8);   // x2 (TILE 32)
      var s = CFG.ARROW_SPEED;
      a.body.setVelocity(
        p.facing === 'left' ? -s : p.facing === 'right' ? s : 0,
        p.facing === 'up' ? -s : p.facing === 'down' ? s : 0
      );
      a.setFlipX(p.facing === 'left');
      a.setFlipY(p.facing === 'up');
      a.bornAt = this.time.now;
      a.prevX = a.x; a.prevY = a.y;
      if (runState.hasFireArrow) a.setTint(0xff9040);
      SFX.shoot();
      this.fx.explode(3, p.x, p.y);
    };

    GameScene.prototype.killArrow = function (a) {
      if (!a || !a.active) return;
      a.body.setVelocity(0, 0);
      this.arrows.killAndHide(a);
      if (a.body) a.body.enable = false;
    };

    GameScene.prototype.arrowOverEnemy = function (a) {
      if (!a || !a.body) return false;
      var list = this.enemies.getChildren();
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        if (!e.active || !e.body || !e.body.enable) continue;
        if (P.Geom.Intersects.RectangleToRectangle(a.body, e.body)) return true;
      }
      return false;
    };

    // sweep manual anti-tunnel (§5.4) — idempoten karena hitEnemy di-guard
    GameScene.prototype.manualArrowHits = function () {
      var self = this, list = this.enemies.getChildren();
      this.arrows.getChildren().forEach(function (a) {
        if (!a.active || !a.body) return;
        var x0 = a.prevX != null ? a.prevX : a.x, y0 = a.prevY != null ? a.prevY : a.y;
        var minX = Math.min(x0, a.x) - 4, maxX = Math.max(x0, a.x) + 4;
        var minY = Math.min(y0, a.y) - 4, maxY = Math.max(y0, a.y) + 4;
        for (var i = 0; i < list.length; i++) {
          var e = list[i];
          if (!e.active || !e.body || !e.body.enable) continue;
          var b = e.body;
          if (maxX > b.left && minX < b.right && maxY > b.top && minY < b.bottom) {
            self.hitEnemy(a, e); break;
          }
        }
      });
    };

    GameScene.prototype.hitEnemy = function (a, e) {
      if (!a || !a.active || !e || !e.active) return;      // guard idempoten
      if (!e.body || !e.body.enable) return;               // terkubur/tersembunyi = kebal
      if (e.eType === 'thorn') return;                     // hazard tak bisa dibunuh
      this.killArrow(a);
      e.hp -= (runState.hasFireArrow ? 2 : 1);
      SFX.hit();
      this.fx.explode(6, e.x, e.y);
      this.freezeFrames(3);
      this.cameras.main.shake(60, 0.008);
      if (e.hp > 0) {
        e.setTint(0xffffff);
        this.time.delayedCall(80, function () { if (e.active) e.clearTint(); });
        return;
      }
      this.killEnemy(e);
    };

    GameScene.prototype.killEnemy = function (e) {
      var self = this;
      this.cameras.main.shake(90, 0.012);
      this.fx.explode(12, e.x, e.y);
      SFX.kill();
      // drop
      var r = Math.random();
      if (r < 0.10) this.dropItem(e.x, e.y, 'heart');
      else if (r < 0.35) this.dropItem(e.x, e.y, 'flower');
      this.tweens.add({
        targets: e, scale: 1.3, alpha: 0, duration: 180,
        onComplete: function () { e.destroy(); }
      });
    };

    GameScene.prototype.dropItem = function (x, y, type) {
      var p = this.pickups.create(x, y, type === 'heart' ? 't_heart' : 't_flower');
      p.itemType = type;
      p.body.setAllowGravity(false);
      this.tweens.add({ targets: p, y: y - 3, duration: 700, yoyo: true, repeat: -1 });
    };

    GameScene.prototype.hitBush = function (a, b) {
      if (!a.active || !b.active) return;
      this.killArrow(a);
      this.fx.explode(8, b.x, b.y);
      SFX.breakit();
      var r = Math.random();
      if (r < 0.20) this.dropItem(b.x, b.y, 'heart');
      else if (r < 0.45) this.dropItem(b.x, b.y, 'flower');
      b.destroy();
    };

    /* ---------- DAMAGE: knockback + i-frame, TANPA nyawa (§4.6) ---------- */
    GameScene.prototype.hurtPlayer = function (player, enemy) {
      var time = this.time.now;
      if (time < player.invulnUntil) return;
      if (cheat.on) return;                                  // cheat = kebal total
      if (enemy && enemy.body && !enemy.body.enable) return; // hazard tersembunyi

      var invuln = runState.hasCharm ? this.D.invuln + 600 : this.D.invuln;
      player.invulnUntil = time + invuln;
      player.pState = 'hurt';

      var ang = P.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
      player.body.setVelocity(Math.cos(ang) * CFG.KNOCKBACK, Math.sin(ang) * CFG.KNOCKBACK);

      this.cameras.main.shake(90, 0.012);
      this.cameras.main.flash(60, 255, 80, 80);
      player.setTint(0xff6666);
      SFX.hurt();

      var self = this;
      this.time.delayedCall(CFG.KNOCKBACK_MS, function () {
        if (!player.active) return;
        player.body.setVelocity(0, 0);
        if (player.pState === 'hurt') player.pState = 'idle';
      });
      this.time.delayedCall(invuln, function () { if (player.active) player.clearTint(); });
    };

    GameScene.prototype.hurtByBullet = function (player, b) {
      if (!b.active) return;
      this.hurtPlayer(player, b);
      this.eBullets.killAndHide(b);
      if (b.body) b.body.enable = false;
    };

    /* ---------- PICKUP / CHEST / DOOR ---------- */
    GameScene.prototype.collectPickup = function (player, item) {
      if (!item.active) return;
      var t = item.itemType;
      if (t === 'heart') { player.invulnUntil = this.time.now + 2000; toast('Kebal sejenak!', 'success'); }
      else if (t === 'fire_arrow') { runState.hasFireArrow = true; toast('Panah Api didapat!', 'success'); }
      else if (t === 'boots') { runState.hasBoots = true; toast('Sepatu Cepat didapat!', 'success'); }
      else if (t === 'charm') { runState.hasCharm = true; toast('Jimat Daun didapat!', 'success'); }
      SFX.item();
      this.fx.explode(5, item.x, item.y);
      item.destroy();
    };

    GameScene.prototype.openChest = function (player, chest) {
      if (chest.opened) return;
      chest.opened = true;
      chest.play('o_chest', true);
      this.freezeFrames(5);
      this.cameras.main.flash(120, 255, 220, 140);
      this.fx.explode(20, chest.x, chest.y);
      // konversi world -> layar untuk animasi terbang
      var cam = this.cameras.main;
      var sx = (chest.x - cam.worldView.x) * cam.zoom;
      var sy = (chest.y - cam.worldView.y) * cam.zoom;
      unlockInfo(chest.pieceKey, { x: sx, y: sy });
      var self = this;
      this.time.delayedCall(600, function () { if (chest.active) chest.destroy(); });
    };

    GameScene.prototype.touchDoor = function (player, door) {
      if (this.transitioning) return;
      var A = CFG.AREAS[this.areaIdx];
      var room = this.level.rooms[this.roomIdx];
      var nc = room.col, nr = room.row;
      if (door.dir === 'up') nr--;
      if (door.dir === 'down') nr++;
      if (door.dir === 'left') nc--;
      if (door.dir === 'right') nc++;
      if (nc < 0 || nr < 0 || nc >= A.cols || nr >= A.rows) return;

      var nextIdx = nr * A.cols + nc;
      this.transitioning = true;
      var self = this;
      this.cameras.main.fadeOut(160);
      this.cameras.main.once('camerafadeoutcomplete', function () {
        self.enterRoom(nextIdx, door.dir);
        self.cameras.main.fadeIn(160);
        self.transitioning = false;
      });
    };

    /* ---------- BOSS (APPENDIX D) ---------- */
    GameScene.prototype.buildBossArena = function () {
      var T = CFG.TILE;
      this.arenaY = CFG.ROOM_PX_H * 0.45;
      this.bossHpMax = this.D.bossHp;
      this.bossHp = this.bossHpMax;
      this.bossActive = false;
      this.bossInvuln = false;

      this.gate = this.add.image(CFG.ROOM_PX_W / 2, 26, 't_gate_closed').setDepth(-2);

      this.boss = this.physics.add.sprite(CFG.ROOM_PX_W / 2, 52, 't_boss');
      this.boss.setAlpha(0);                     // SEMBUNYI VIA ALPHA (bukan setActive false)
      this.boss.body.setSize(104, 128);              // x2 (TILE 32)
      this.boss.body.setAllowGravity(false);
      this.boss.setImmovable(true);
      this.boss.setDepth(40);
      this.boss.setScale(0.7);

      this.bossHpBg = this.add.rectangle(0, 0, 90, 6, 0x1a1008).setDepth(900).setVisible(false);
      this.bossHpFill = this.add.rectangle(0, 0, 86, 4, 0x6ad06a).setOrigin(0, 0.5).setDepth(901).setVisible(false);

      this.physics.add.overlap(this.player, this.boss, this.hurtPlayer, null, this);
    };

    GameScene.prototype.activateBoss = function () {
      if (this.bossActive) return;
      this.bossActive = true;
      this.tweens.add({ targets: this.boss, alpha: 1, duration: 500 });
      this.bossHpBg.setVisible(true); this.bossHpFill.setVisible(true);
      this.cameras.main.flash(300, 200, 255, 180);
      this.tweens.add({ targets: this.boss, y: this.boss.y + 8, duration: 1600, yoyo: true, repeat: -1 });
      this.bossNextAttack = this.time.now + 1200;
      sfx('sawtooth', 90, 0.6, 0.09);
      banner('ENT PENJAGA GERBANG', 1800);
    };

    GameScene.prototype.updateBoss = function (time) {
      if (!this.boss || !this.boss.active) return;
      if (!this.bossActive) {
        if (this.arenaY != null && this.player.y <= this.arenaY) this.activateBoss();
        return;
      }
      // HP bar KECIL di ATAS boss (world-space)
      var bx = this.boss.x, by = this.boss.y - 42;
      this.bossHpBg.setPosition(bx, by);
      this.bossHpFill.setPosition(bx - 43, by);
      this.bossHpFill.width = 86 * Math.max(0, this.bossHp / this.bossHpMax);
      var r = this.bossHp / this.bossHpMax;
      this.bossHpFill.fillColor = r > 0.66 ? 0x6ad06a : (r > 0.33 ? 0xd0c05a : 0xd05a5a);

      if (time >= this.bossNextAttack && !this.bossDefeated) {
        this.bossNextAttack = time + this.D.bossFire;
        this.bossAttack(r);
      }
      this.manualBossHits();
    };

    GameScene.prototype.bossAttack = function (ratio) {
      var self = this;
      this.bossInvuln = true;                              // invuln saat telegraph
      this.boss.setTint(0xffffff);
      this.time.delayedCall(600, function () {
        if (!self.boss || !self.boss.active) return;
        self.boss.clearTint();
        self.bossInvuln = false;
        // fase 1: akar; fase 2+: + volley biji
        self.rootAttack();
        if (ratio <= 0.66) self.seedVolley();
      });
    };

    GameScene.prototype.rootAttack = function () {
      var self = this;
      var tx = this.player.x, ty = this.player.y;          // snapshot -> bisa dihindari
      var crack = this.add.image(tx, ty, 't_e_thorn_crack').setDepth(5).setAlpha(0.8);
      this.time.delayedCall(800, function () {
        try { crack.destroy(); } catch (e) {}
        if (!self.scene || !self.boss || !self.boss.active) return;
        var root = self.enemies.create(tx, ty, 't_e_thorn_up');
        root.eType = 'thorn'; root.hp = 0; root.dmg = 1;
        root.body.setSize(24, 24);                     // x2 (TILE 32)
        root.state2 = 'ACTIVE';
        root.cycleAt = self.time.now + 700;
        self.time.delayedCall(700, function () { if (root.active) root.destroy(); });
      });
    };

    GameScene.prototype.seedVolley = function () {
      var base = P.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
      for (var i = -2; i <= 2; i++) {
        var b = this.eBullets.get(this.boss.x, this.boss.y + 16, 't_seed');
        if (!b) continue;
        b.setActive(true).setVisible(true).setDepth(20);
        b.body.enable = true; b.body.setAllowGravity(false);
        var a = base + i * 0.14;
        b.body.setVelocity(Math.cos(a) * 150, Math.sin(a) * 150);
        b.bornAt = this.time.now;
      }
      SFX.shoot();
    };

    // Hit MANUAL tiap frame (§D.5) — jangan andalkan overlap fisika
    GameScene.prototype.manualBossHits = function () {
      var b = this.boss, self = this;
      if (!b || !b.active || !this.bossActive || this.bossInvuln || this.bossDefeated) return;
      this.arrows.getChildren().forEach(function (a) {
        if (!a.active) return;
        if (Math.abs(a.x - b.x) < 30 && Math.abs(a.y - b.y) < 36) {
          self.hitBoss();
          self.killArrow(a);
        }
      });
    };

    GameScene.prototype.hitBoss = function () {
      if (this.bossDefeated) return;
      this.bossHp -= (runState.hasFireArrow ? 2 : 1);
      this.boss.setTint(0xffffff);
      var self = this;
      this.time.delayedCall(70, function () { if (self.boss && self.boss.active) self.boss.clearTint(); });
      this.cameras.main.shake(70, 0.015);
      this.freezeFrames(4);
      this.fx.explode(8, this.boss.x, this.boss.y);
      SFX.hit();
      if (this.bossHp <= 0) this.defeatBoss();
    };

    GameScene.prototype.defeatBoss = function () {
      if (this.bossDefeated) return;
      this.bossDefeated = true;
      this.bossActive = false;
      this.inputLocked = true;
      STORE.completed = true; saveStore();
      unlockAllInfo();

      var self = this;
      this.time.timeScale = 0.4;
      this.cameras.main.shake(600, 0.03);
      this.fx.explode(40, this.boss.x, this.boss.y);
      this.bossHpBg.setVisible(false); this.bossHpFill.setVisible(false);

      this.time.delayedCall(320, function () { self.time.timeScale = 1; });
      // Ent MEMBUNGKUK (bukan mati)
      this.tweens.add({ targets: this.boss, angle: 18, y: this.boss.y + 6, duration: 900, delay: 400 });
      this.time.delayedCall(1500, function () { self.cameras.main.flash(500, 255, 230, 170); });
      this.time.delayedCall(2200, function () {
        if (self.gate) self.gate.setTexture('t_gate_open');
        SFX.gate();
        self.fx.explode(30, CFG.ROOM_PX_W / 2, 40);
      });
      this.time.delayedCall(3000, function () {
        var c = self.add.image(CFG.ROOM_PX_W / 2, CFG.ROOM_PX_H * 0.5, 't_couple').setDepth(50);
        c.setAlpha(0);
        self.tweens.add({ targets: c, alpha: 1, duration: 600 });
        banner(val('groom_nickname', '') + ' & ' + val('bride_nickname', ''), 2600);
      });
      this.time.delayedCall(4500, function () {
        var t = $('frpg-win-text');
        if (t) {
          t.textContent = val('groom_nickname', 'Mempelai') + ' & ' + val('bride_nickname', 'Mempelai') +
            ' — kamu melewati ' + CFG.AREAS.length + ' area hutan dan mengumpulkan ' +
            INFOS.length + ' kepingan undangan.';
        }
        SFX.win();
        showOverlay('frpg-win');
      });
    };

    GameScene.prototype.celebrate = function () {
      this.cameras.main.flash(400, 255, 230, 170);
      this.fx.explode(40, this.player.x, this.player.y);
    };

    GameScene.prototype.freezeFrames = function (n) {
      this.freezeUntil = this.time.now + n * 16.7;
    };

    /* ---------- UPDATE ---------- */
    GameScene.prototype.update = function (time, delta) {
      if (time < this.freezeUntil) return;

      this.handlePlayer(time);
      this.updateEnemies(time, delta);
      if (this.boss) this.updateBoss(time);
      this.manualArrowHits();

      // panah: lifetime + despawn di batas RUANG (bukan batas dunia)
      var self = this;
      this.arrows.getChildren().forEach(function (a) {
        if (!a.active) return;
        a.prevX = a.x; a.prevY = a.y;
        if (time - a.bornAt > CFG.ARROW_LIFETIME_MS) { self.killArrow(a); return; }
        if (a.x < 0 || a.y < 0 || a.x > CFG.ROOM_PX_W || a.y > CFG.ROOM_PX_H) self.killArrow(a);
      });
      this.eBullets.getChildren().forEach(function (b) {
        if (!b.active) return;
        if (time - b.bornAt > 2500 || b.x < 0 || b.y < 0 || b.x > CFG.ROOM_PX_W || b.y > CFG.ROOM_PX_H) {
          self.eBullets.killAndHide(b);
          if (b.body) b.body.enable = false;
        }
      });

      // depth sort top-down (hanya entity bergerak)
      for (var i = 0; i < this.depthSorted.length; i++) {
        var o = this.depthSorted[i];
        if (o && o.active) o.setDepth(o.y);
      }

      // area selesai -> lanjut area berikutnya
      if (!this.bossDefeated && this.areaIdx < CFG.AREAS.length - 1) {
        var room = this.level.rooms[this.roomIdx];
        var last = this.level.rooms[this.level.rooms.length - 1];
        if (room === last && this.roomCleared(room) && !this.areaDone) {
          this.areaDone = true;
          this.nextArea();
        }
      }
    };

    GameScene.prototype.roomCleared = function (room) {
      var alive = this.enemies.getChildren().filter(function (e) {
        return e.active && e.eType !== 'thorn';
      });
      return alive.length === 0;
    };

    GameScene.prototype.nextArea = function () {
      var self = this;
      this.inputLocked = true;
      banner('AREA SELESAI', 1400);
      this.time.delayedCall(1500, function () {
        var nxt = self.areaIdx + 1;
        window.__frpgStarted = { area: nxt };
        self.scene.restart({ area: nxt });
      });
    };

    return { GameScene: GameScene };
  }

  function powerFlag(kind) {
    return kind === 'fire_arrow' ? 'hasFireArrow' : kind === 'boots' ? 'hasBoots' : 'hasCharm';
  }

  /* ======================================================================
     10. SHEET LOADER (APPENDIX P.4) — slice + downscale + fallback
     ====================================================================== */
  /* FRAME-MAP untuk KELIMA sheet.
     Bentuk baris:
       key    : tekstur engine yang DIGANTIKAN (key prosedural lama)
       top,ch : posisi Y & tinggi sel di sheet
       x0,fw  : posisi X awal & lebar sel
       frames : jumlah frame horizontal (1 = tekstur tunggal, tanpa suffix _0)
       dh     : tinggi TAMPIL di engine (downscale) -> angka dunia tak berubah
       anim   : nama anim Phaser (opsional, hanya bila frames > 1)
       grid   : true -> potong sebagai grid tile (khusus tileset)
     Tata letak MENGIKUTI ASSET.md. Bila hasil aset beda ukuran, ubah angka DI SINI saja. */
  var SHEETS = {
    /* ====================================================================
       FRAME-MAP v2 — PIKSEL ASLI, TANPA DOWNSCALE.

       BUG YANG DIPERBAIKI: v1 mengecilkan hero 32x32 -> 16x16 (dh:16, ch:32)
       = MEMBUANG 75% piksel, lalu Phaser membesarkannya lagi 4x. Yang terlihat
       adalah gambar 16px yang di-blow-up, bukan detail aslinya. Semak lebih
       parah: 112x112 -> 14x14 = buang 98%.

       ATURAN v2: dh SELALU sama dengan ch (skala 1.00). Sprite dipakai apa
       adanya; pembesaran diserahkan ke zoom kamera (integer) supaya tetap tajam.
       ==================================================================== */

    // ---- 1. PLAYER — sel 32x32 NATIVE (352x96) --------------------------
    player_sheet: [
      { key: 't_p_idle_down',  top: 0,  ch: 32, x0: 0,   fw: 32, frames: 2, dh: 32, anim: 'p_idle_down',  rate: 3 },
      { key: 't_p_walk_down',  top: 0,  ch: 32, x0: 64,  fw: 32, frames: 6, dh: 32, anim: 'p_walk_down',  rate: 8 },
      { key: 't_p_shoot_down', top: 0,  ch: 32, x0: 256, fw: 32, frames: 3, dh: 32, anim: 'p_shoot_down', rate: 12, repeat: 0 },
      { key: 't_p_idle_up',    top: 32, ch: 32, x0: 0,   fw: 32, frames: 2, dh: 32, anim: 'p_idle_up',    rate: 3 },
      { key: 't_p_walk_up',    top: 32, ch: 32, x0: 64,  fw: 32, frames: 6, dh: 32, anim: 'p_walk_up',    rate: 8 },
      { key: 't_p_shoot_up',   top: 32, ch: 32, x0: 256, fw: 32, frames: 3, dh: 32, anim: 'p_shoot_up',   rate: 12, repeat: 0 },
      { key: 't_p_idle_side',  top: 64, ch: 32, x0: 0,   fw: 32, frames: 2, dh: 32, anim: 'p_idle_side',  rate: 3 },
      { key: 't_p_walk_side',  top: 64, ch: 32, x0: 64,  fw: 32, frames: 6, dh: 32, anim: 'p_walk_side',  rate: 8 },
      { key: 't_p_shoot_side', top: 64, ch: 32, x0: 256, fw: 32, frames: 3, dh: 32, anim: 'p_shoot_side', rate: 12, repeat: 0 }
    ],

    // ---- 2. ENEMY — sel 40x40, boss 64x72 (240x232) ---------------------
    enemy_sheet: [
      { key: 't_e_mole',   top: 0,   ch: 40, x0: 0, fw: 40, frames: 4, dh: 40, anim: 'e_mole',   rate: 8 },
      { key: 't_e_treant', top: 40,  ch: 40, x0: 0, fw: 40, frames: 4, dh: 40, anim: 'e_treant', rate: 6 },
      { key: 't_e_mole_dig_buried', top: 80, ch: 40, x0: 0,  fw: 40, frames: 1, dh: 40 },
      { key: 't_e_treant_old',      top: 80, ch: 40, x0: 80, fw: 40, frames: 1, dh: 40 },
      { key: 't_e_death',  top: 120, ch: 40, x0: 0, fw: 40, frames: 6, dh: 40, anim: 'e_death',  rate: 14, repeat: 0 },
      { key: 't_boss',     top: 160, ch: 72, x0: 0, fw: 64, frames: 1, dh: 72 }
    ],

    // ---- 3. ENVIRONMENT — terrain 32x32, props 112x112 (672x144) --------
    environment_sheet: [
      { key: 't_floor', top: 0, ch: 32, x0: 0,  fw: 32, frames: 1, dh: 32 },
      { key: 't_wall',  top: 0, ch: 32, x0: 32, fw: 32, frames: 1, dh: 32 },
      { key: 't_water', top: 0, ch: 32, x0: 64, fw: 32, frames: 1, dh: 32 },
      { key: 't_path',  top: 0, ch: 32, x0: 96, fw: 32, frames: 1, dh: 32 },
      { key: 't_tree',     top: 32, ch: 112, x0: 0,   fw: 112, frames: 1, dh: 112 },
      { key: 't_tree2',    top: 32, ch: 112, x0: 112, fw: 112, frames: 1, dh: 112 },
      { key: 't_stump',    top: 32, ch: 112, x0: 224, fw: 112, frames: 1, dh: 112 },
      { key: 't_rock_big', top: 32, ch: 112, x0: 336, fw: 112, frames: 1, dh: 112 },
      { key: 't_bush',     top: 32, ch: 112, x0: 448, fw: 112, frames: 1, dh: 112 },
      { key: 't_rock',     top: 32, ch: 112, x0: 560, fw: 112, frames: 1, dh: 112 }
    ],

    // ---- 4. GAME-OBJECT — sel 32x32 (256x64) ----------------------------
    object_sheet: [
      { key: 't_coin',    top: 0,  ch: 32, x0: 0,   fw: 32, frames: 4, dh: 32, anim: 'o_coin', rate: 8 },
      { key: 't_gem',     top: 0,  ch: 32, x0: 128, fw: 32, frames: 4, dh: 32, anim: 'o_gem',  rate: 8 },
      { key: 't_heart',       top: 32, ch: 32, x0: 0,   fw: 32, frames: 1, dh: 32 },
      { key: 't_heart_empty', top: 32, ch: 32, x0: 32,  fw: 32, frames: 1, dh: 32 },
      { key: 't_arrow_v', top: 32, ch: 32, x0: 64,  fw: 32, frames: 1, dh: 32 },
      { key: 't_arrow_h', top: 32, ch: 32, x0: 96,  fw: 32, frames: 1, dh: 32 },
      { key: 't_sign',    top: 32, ch: 32, x0: 128, fw: 32, frames: 1, dh: 32 }
    ],

    // ---- 5. BOX-KEPINGAN — peti 48x56, gerbang 101x90 (288x136) ---------
    piece_sheet: [
      { key: 't_chest',       top: 0,  ch: 56, x0: 0,   fw: 48,  frames: 5, dh: 56, anim: 'o_chest', rate: 10, repeat: 0 },
      { key: 't_gate_closed', top: 56, ch: 80, x0: 0,   fw: 101, frames: 1, dh: 80 },
      { key: 't_gate_open',   top: 56, ch: 80, x0: 101, fw: 101, frames: 1, dh: 80 },
      { key: 't_couple',      top: 56, ch: 80, x0: 202, fw: 80,  frames: 1, dh: 80 }
    ]
  };

  // Tekstur yang BERHASIL di-slice dari PNG (dipakai untuk re-apply ke sprite hidup)
  var sheetApplied = {};

  function sliceSheet(scene, imgKey, table) {
    var srcTex = scene.textures.get(imgKey);
    if (!srcTex) return false;
    var src = srcTex.getSourceImage();
    if (!src || !src.width) return false;
    var W = src.width, H = src.height;

    table.forEach(function (row) {
      var scale = row.dh / row.ch;
      var made = 0;
      for (var i = 0; i < row.frames; i++) {
        var sx = row.x0 + i * row.fw;
        if (sx + row.fw > W || row.top + row.ch > H) break;    // sheet lebih kecil -> berhenti
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(row.fw * scale));
        cv.height = Math.max(1, row.dh);
        var ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;                    // pixel-art: JANGAN smooth
        ctx.drawImage(src, sx, row.top, row.fw, row.ch, 0, 0, cv.width, cv.height);
        // frames === 1 -> key TANPA suffix (menggantikan tekstur prosedural tunggal)
        var key = row.frames > 1 ? row.key + '_' + i : row.key;
        if (scene.textures.exists(key)) scene.textures.remove(key);
        scene.textures.addCanvas(key, cv);
        sheetApplied[key] = true;
        made++;
      }
      if (made && row.anim && row.frames > 1) {
        if (scene.anims.exists(row.anim)) scene.anims.remove(row.anim);
        var frames = [];
        for (var j = 0; j < made; j++) {
          if (scene.textures.exists(row.key + '_' + j)) frames.push({ key: row.key + '_' + j });
        }
        if (frames.length) {
          scene.anims.create({
            key: row.anim, frames: frames, frameRate: row.rate,
            repeat: (row.repeat === 0 ? 0 : -1)
          });
        }
      }
    });
    return true;
  }

  // Setelah sheet ter-slice, sprite yang SUDAH dibuat masih memakai tekstur lama.
  // Muat ulang ruang agar semua sprite memakai tekstur baru.
  function refreshAfterSheet(scene) {
    if (scene._sheetRefreshQueued) return;
    scene._sheetRefreshQueued = true;
    scene.time.delayedCall(60, function () {
      scene._sheetRefreshQueued = false;
      try { if (scene.enterRoom) scene.enterRoom(scene.roomIdx || 0, null); } catch (e) {}
    });
  }

  // Slot kosong / gagal load -> tetap prosedural (game TAK PERNAH blank)
  // SINKRON: memakai gambar yang sudah di-decode oleh preloadSheets().
  // Dipanggil di create() SEBELUM buildAnims(), jadi anim langsung memakai
  // frame PNG asli -- tidak ada lagi jendela waktu tempat prosedural menang.
  function loadSheetsIfAny(scene) {
    Object.keys(SHEETS).forEach(function (name) {
      var img = sheetImgs[name];
      if (!img) return;                       // tak ada PNG -> prosedural (normal)
      var texKey = '__sheet_' + name;
      try {
        if (!scene.textures.exists(texKey)) scene.textures.addImage(texKey, img);
        sliceSheet(scene, texKey, SHEETS[name]);
      } catch (e) {
        // Slice gagal (sheet rusak/ukuran aneh) -> biarkan prosedural, tapi JANGAN diam.
        if (window.console && console.warn) console.warn('[frpg] slice gagal: ' + name, e);
      }
    });
  }

  /* ======================================================================
     11. UI WIRING
     ====================================================================== */
  /* ---------------------------------------------------------------------
     WIRING = DELEGASI DI document (BUKAN listener per-elemen).

     KENAPA (bug nyata yang sudah dibayar):
     Host me-render container tema dengan `dangerouslySetInnerHTML={{__html: htmlBase}}`.
     Tiap kali `htmlBase` berubah (tamu submit RSVP/ucapan, gambar ter-resolve, dll)
     React MENGGANTI SELURUH DOM tema -> semua elemen lama dibuang berikut
     listener-nya. Padahal JS tema hanya di-re-inject saat [jsBase, isOpened] berubah,
     BUKAN saat htmlBase berubah. Akibatnya: tombol jadi DOM baru tanpa listener =
     "semua tombol tidak berfungsi".

     Delegasi di `document` kebal terhadap itu: node boleh diganti berkali-kali,
     handler tetap hidup karena terpasang di document, bukan di node.
     (Pola sama: memory `netflix-theme-reinject-scroll` & `retromario-reinject-toolbar`.)
     --------------------------------------------------------------------- */
  var ACTIONS = {
    'frpg-start-btn': function () { initAC(); startRun(0); },
    'frpg-skip-btn': function () {
      unlockAllInfo();
      toast('Semua kepingan dibuka', 'success');
      revealFullInvitation();
    },
    'frpg-cheat-btn': toggleCheat,
    'frpg-open-invitation': openInvitationOrHint,
    'frpg-side-open': openInvitationOrHint,
    'frpg-sfx-btn': function () {
      STORE.sfxOn = !STORE.sfxOn; saveStore();
      syncSfxBtn();
      toast(STORE.sfxOn ? 'Efek suara aktif' : 'Efek suara mati', 'info');
    },
    'frpg-reset-btn': function () { showOverlay('frpg-resetconfirm'); },
    'frpg-reset-yes': resetGame,
    'frpg-reset-no': function () { showOverlay(null); },
    'frpg-areaselect-btn': openAreaSelect,
    'frpg-area-cancel': function () { showOverlay(null); },
    'frpg-area-ok': function () {
      var sel = qs('#frpg-area-grid .frpg-cell.is-sel');
      var idx = sel ? parseInt(sel.getAttribute('data-area'), 10) : 0;
      showOverlay(null);
      startRun(idx);
    },
    'frpg-modal-close': closePieceModal,
    'frpg-reveal-close': closeReveal,
    'frpg-allcollected-open': function () { revealFullInvitation(); },
    'frpg-allcollected-cont': function () { showOverlay(null); },
    'frpg-win-open': function () { revealFullInvitation(); },
    'frpg-win-again': function () { showOverlay(null); startRun(0); }
  };

  function openInvitationOrHint() {
    if (allPiecesCollected() || cheat.on) revealFullInvitation();
    else toast('Masih ada ' + (INFOS.length - STORE.unlocked.length) + ' kepingan lagi', 'info');
  }
  function syncSfxBtn() {
    var b = $('frpg-sfx-btn');
    if (b) { b.textContent = STORE.sfxOn ? '🔊' : '🔇'; b.classList.toggle('is-on', STORE.sfxOn); }
  }
  // Host mengganti DOM -> class visual hilang padahal state JS masih hidup.
  // Tanpa ini, cheat.on=true tapi tombol tampak mati -> klik berikutnya "tidak terasa".
  function syncCheatBtn() {
    var b = $('frpg-cheat-btn');
    if (b) b.classList.toggle('is-on', cheat.on);
    var as = $('frpg-areaselect-btn');
    if (as) as.hidden = !cheat.on;
  }

  var delegated = false;
  function wireUI() {
    syncSel('.diff-opt', 'data-diff', STORE.diff);
    syncSfxBtn();
    syncCheatBtn();
    wireTouch();
    wireHostForms(document);

    if (delegated) return;          // pasang SEKALI saja (idempoten)
    delegated = true;

    addGlobal(document, 'click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      // 1) tombol ber-ID
      var hit = t.closest('[id]');
      while (hit) {
        if (ACTIONS[hit.id]) { ACTIONS[hit.id](); return; }
        hit = hit.parentElement ? hit.parentElement.closest('[id]') : null;
      }

      // 2) pilih kesulitan (cover & area-select memakai class sama)
      var df = t.closest('.diff-opt');
      if (df) {
        var d = df.getAttribute('data-diff');
        qsa('.diff-opt').forEach(function (o) {
          o.classList.toggle('is-sel', o.getAttribute('data-diff') === d);
        });
        STORE.diff = d; saveStore();
        return;
      }

      // 4) grid area: klik = tandai (pending), commit lewat tombol OK
      var cell = t.closest('#frpg-area-grid .frpg-cell');
      if (cell && !cell.classList.contains('is-locked')) {
        qsa('#frpg-area-grid .frpg-cell').forEach(function (x) { x.classList.remove('is-sel'); });
        cell.classList.add('is-sel');
        return;
      }

      // 5) indikator kepingan (dibangun ulang tiap re-render)
      var pc = t.closest('.frpg-piece-ico');
      if (pc && !pc.disabled && pc.classList.contains('is-on')) {
        openPieceModal(pc.getAttribute('data-piece'));
        return;
      }

      // 6) lightbox galeri milik tema
      var gi = t.closest('.frpg-gallery-item img');
      if (gi) { openLightbox(gi.getAttribute('src')); return; }
    }, true);   // capture: jalan sebelum handler React host

    // Host mengganti DOM tema -> bangun ulang bagian yang di-render JS.
    // PENTING: observer HANYA memantau HILANGNYA node tema, dan di-PAUSE saat kita
    // sendiri menulis DOM -> kalau tidak, buildIndicators() memicu observer yang
    // memanggil buildIndicators() lagi = loop tak berhenti (browser hang).
    var mo = new MutationObserver(function () {
      if (selfMutating || rebuildQueued) return;
      // murah: cek apakah indikator masih sesuai; kalau ya, tak ada yang perlu dikerjakan
      var wrap = document.getElementById('frpg-pieces');
      if (wrap && wrap.children.length === INFOS.length) return;
      rebuildQueued = true;
      setTimeout(function () {
        rebuildQueued = false;
        selfMutating = true;
        try { onDomReplaced(); } catch (e) {}
        selfMutating = false;
      }, 50);
    });
    try {
      mo.observe(document.body, { childList: true, subtree: true });
      disposers.push(function () { mo.disconnect(); });
    } catch (e) {}
  }

  var rebuildQueued = false;
  var selfMutating = false;
  // Dipanggil setelah host mengganti HTML tema: pulihkan state visual yang
  // dihasilkan JS (indikator, seleksi, canvas panel). Listener TIDAK perlu
  // dipasang ulang karena sudah didelegasikan ke document.
  function onDomReplaced() {
    if (!document.getElementById('frpg-pieces')) return;   // tema tak ada di DOM
    if (document.querySelectorAll('#frpg-pieces .frpg-piece-ico').length === INFOS.length) {
      // indikator masih utuh -> cukup sinkronkan state
      syncSel('.diff-opt', 'data-diff', STORE.diff);
      syncSfxBtn();
      syncCheatBtn();
      updateOpenButton();
      updateProgressChip();
      return;
    }
    // DOM diganti -> bangun ulang
    INFOS = scanSections();
    buildIndicators();
    syncSel('.diff-opt', 'data-diff', STORE.diff);
    syncSfxBtn();
    syncCheatBtn();
    wireTouch();
    wireHostForms(document);
    try { drawCoupleCanvas(); } catch (e) {}
  }
  function syncSel(sel, attr, v) {
    qsa(sel).forEach(function (o) { o.classList.toggle('is-sel', o.getAttribute(attr) === v); });
  }

  function openAreaSelect() {
    var grid = $('frpg-area-grid');
    if (!grid) return;
    grid.innerHTML = '';
    CFG.AREAS.forEach(function (a, i) {
      var locked = !cheat.on && i > STORE.maxArea;
      var c = document.createElement('div');
      c.className = 'frpg-cell' + (locked ? ' is-locked' : '') + (i === runState.area ? ' is-sel' : '');
      c.setAttribute('data-area', i);
      c.innerHTML = '<b>' + (i + 1) + '</b><span>' + a.name + '</span>';
      // klik ditangani delegasi document (klik = tandai pending, OK = commit)
      grid.appendChild(c);
    });
    syncSel('#frpg-areaselect .diff-opt', 'data-diff', STORE.diff);
    showOverlay('frpg-areaselect');
  }

  function toggleCheat() {
    cheat.on = !cheat.on;
    var b = $('frpg-cheat-btn');
    if (b) b.classList.toggle('is-on', cheat.on);
    var as = $('frpg-areaselect-btn');
    if (as) as.hidden = !cheat.on;
    if (cheat.on) {
      unlockAllInfo();
      toast('Mode bebas: semua kepingan terbuka & kebal', 'success');
    } else {
      toast('Mode bebas nonaktif', 'info');
    }
    updateOpenButton();
  }

  /* ---- RESET PENUH (Y.4) ---- */
  function resetGame() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    STORE = JSON.parse(JSON.stringify(DEFAULTS));

    if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
    runState = freshRun();
    cheat.on = false;
    window.__frpgStarted = null;

    var cb = $('frpg-cheat-btn'); if (cb) cb.classList.remove('is-on');
    var as = $('frpg-areaselect-btn'); if (as) as.hidden = true;

    buildIndicators();
    syncSel('.diff-opt', 'data-diff', STORE.diff);
    updateOpenButton();
    updateProgressChip();

    showOverlay('frpg-cover');
    toast('Progres dihapus', 'info');
  }

  /* ---- kontrol sentuh: joystick + tombol panah ---- */
  function wireTouch() {
    window.__frpgJoy = { left: false, right: false, up: false, down: false };
    window.__frpgFirePressed = false;

    var joy = $('frpg-joy'), knob = $('frpg-joy-knob');
    if (joy && knob) {
      var active = false, cx = 0, cy = 0, R = 40;
      function start(e) {
        active = true;
        var r = joy.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        move(e);
      }
      function move(e) {
        if (!active) return;
        var t = e.touches ? e.touches[0] : e;
        var dx = t.clientX - cx, dy = t.clientY - cy;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var k = Math.min(1, d / R);
        knob.style.transform = 'translate(' + (dx / d * R * k) + 'px,' + (dy / d * R * k) + 'px)';
        // hysteresis: aktif 0.35, lepas 0.22
        var nx = dx / d, ny = dy / d;
        var on = k > 0.35, off = k < 0.22;
        var j = window.__frpgJoy;
        if (off) { j.left = j.right = j.up = j.down = false; return; }
        if (!on) return;
        if (Math.abs(nx) > Math.abs(ny)) {
          j.left = nx < 0; j.right = nx > 0; j.up = j.down = false;
        } else {
          j.up = ny < 0; j.down = ny > 0; j.left = j.right = false;
        }
        if (e.cancelable) e.preventDefault();
      }
      function end() {
        active = false;
        knob.style.transform = '';
        var j = window.__frpgJoy;
        j.left = j.right = j.up = j.down = false;
      }
      addGlobal(joy, 'touchstart', start, { passive: false });
      addGlobal(joy, 'touchmove', move, { passive: false });
      addGlobal(joy, 'touchend', end);
      addGlobal(joy, 'touchcancel', end);
      addGlobal(joy, 'mousedown', start);
      addGlobal(window, 'mousemove', move);
      addGlobal(window, 'mouseup', end);
      disposers.push(end);
    }

    var fire = $('frpg-fire');
    if (fire) {
      function fireDown(e) {
        window.__frpgFirePressed = true;
        if (e.cancelable) e.preventDefault();
      }
      addGlobal(fire, 'touchstart', fireDown, { passive: false });
      addGlobal(fire, 'mousedown', fireDown);
    }
  }

  /* ======================================================================
     12. PANEL KANAN — canvas couple (Canvas 2D, BUKAN Phaser)
     ====================================================================== */
  function drawCoupleCanvas() {
    var cv = $('frpg-couple-canvas');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    // langit senja hutan
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#3d5a7a');
    sky.addColorStop(0.5, '#c88a5a');
    sky.addColorStop(1, '#e8b878');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // matahari
    ctx.fillStyle = 'rgba(255,230,170,.85)';
    ctx.beginPath(); ctx.arc(W * 0.76, H * 0.34, 42, 0, Math.PI * 2); ctx.fill();

    // gunung
    ctx.fillStyle = '#2e4a38';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.62); ctx.lineTo(W * 0.22, H * 0.34);
    ctx.lineTo(W * 0.44, H * 0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#25402f';
    ctx.beginPath();
    ctx.moveTo(W * 0.36, H * 0.62); ctx.lineTo(W * 0.62, H * 0.3);
    ctx.lineTo(W * 0.9, H * 0.62); ctx.closePath(); ctx.fill();

    // tanah
    ctx.fillStyle = '#3f6a34'; ctx.fillRect(0, H * 0.62, W, H * 0.38);
    ctx.fillStyle = '#356028'; ctx.fillRect(0, H * 0.72, W, H * 0.28);

    // pohon kiri-kanan
    function tree(x, y, s) {
      ctx.fillStyle = '#4a3524';
      ctx.fillRect(x - 6 * s, y - 34 * s, 12 * s, 40 * s);
      ctx.fillStyle = '#2f5a28';
      ctx.beginPath(); ctx.arc(x, y - 46 * s, 30 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f7436';
      ctx.beginPath(); ctx.arc(x - 8 * s, y - 54 * s, 18 * s, 0, Math.PI * 2); ctx.fill();
    }
    tree(60, H * 0.78, 1.1); tree(W - 66, H * 0.78, 1.2);
    tree(140, H * 0.7, 0.7); tree(W - 150, H * 0.7, 0.65);

    // karpet
    ctx.fillStyle = '#a83a3a';
    ctx.fillRect(W * 0.3, H * 0.8, W * 0.4, H * 0.2);
    ctx.fillStyle = '#c04a4a';
    ctx.fillRect(W * 0.32, H * 0.8, W * 0.36, H * 0.2);

    // mempelai
    var gx = W * 0.44, bx = W * 0.56, by = H * 0.82;
    // pria: jas + dasi
    ctx.fillStyle = '#1e2430'; ctx.fillRect(gx - 15, by - 62, 30, 52);
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(gx - 5, by - 60, 10, 26);
    ctx.fillStyle = '#a83a3a'; ctx.fillRect(gx - 2.5, by - 58, 5, 18);
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(gx, by - 74, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a1e';
    ctx.beginPath(); ctx.arc(gx, by - 80, 14, Math.PI, 0); ctx.fill();

    // wanita: gaun + kerudung + buket
    ctx.fillStyle = '#f4f4ee';
    ctx.beginPath();
    ctx.moveTo(bx - 12, by - 60); ctx.lineTo(bx + 12, by - 60);
    ctx.lineTo(bx + 24, by - 8); ctx.lineTo(bx - 24, by - 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(bx, by - 74, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(bx, by - 78, 16, Math.PI, 0); ctx.fill();
    ctx.fillRect(bx - 16, by - 78, 5, 40); ctx.fillRect(bx + 11, by - 78, 5, 40);
    // buket
    ctx.fillStyle = '#d05a5a';
    [[-2, -4], [3, -6], [0, 0], [5, -1]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(bx - 24 + p[0], by - 34 + p[1], 4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#3f7436';
    ctx.fillRect(bx - 25, by - 32, 2, 10);

    // hati melayang
    ctx.fillStyle = 'rgba(208,90,90,.85)';
    [[W * 0.5, H * 0.44, 9], [W * 0.4, H * 0.5, 6], [W * 0.6, H * 0.48, 7]].forEach(function (h) {
      var x = h[0], y = h[1], s = h[2];
      ctx.beginPath();
      ctx.arc(x - s * 0.35, y, s * 0.42, 0, Math.PI * 2);
      ctx.arc(x + s * 0.35, y, s * 0.42, 0, Math.PI * 2);
      ctx.moveTo(x - s * 0.78, y + s * 0.15);
      ctx.lineTo(x, y + s); ctx.lineTo(x + s * 0.78, y + s * 0.15);
      ctx.closePath(); ctx.fill();
    });

    // kunang-kunang
    ctx.fillStyle = 'rgba(255,220,120,.8)';
    [[90, 150], [W - 120, 190], [200, 120], [W - 210, 140]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill();
    });

    // banner
    ctx.fillStyle = '#2c3a22';
    ctx.fillRect(W * 0.26, 20, W * 0.48, 34);
    ctx.strokeStyle = '#e8c15a'; ctx.lineWidth = 2;
    ctx.strokeRect(W * 0.26, 20, W * 0.48, 34);
    ctx.fillStyle = '#e8c15a';
    ctx.font = 'bold 19px "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('JUST MARRIED', W * 0.5, 38);
  }

  /* ======================================================================
     13. BOOT
     ====================================================================== */
  function ensurePhaser(cb) {
    if (window.Phaser && window.Phaser.VERSION) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
    s.onload = function () {
      if (!window.Phaser || !window.Phaser.VERSION) { onPhaserFail(); return; }
      cb();
    };
    s.onerror = onPhaserFail;
    document.head.appendChild(s);
    disposers.push(function () { try { s.remove(); } catch (e) {} });
  }

  // Game mati, TAPI undangan tetap harus bisa dibuka (§1.7).
  function onPhaserFail() {
    phaserFailed = true;
    unlockAllInfo();                       // jangan kunci tamu dari undangan
    var b = $('frpg-start-btn');
    if (b) b.textContent = 'BUKA UNDANGAN';
    var h = qs('.frpg-lede small');
    if (h) h.textContent = 'Game tidak dapat dimuat di perangkat ini — undangan tetap bisa dibuka.';
    toast('Game gagal dimuat. Undangan tetap bisa dibuka.', 'info');
  }

  function gameStageAttached() {
    if (!GAME || !GAME.canvas) return false;
    return document.body.contains(GAME.canvas);
  }

  /* ---------------------------------------------------------------------
     PRA-MUAT SHEET PNG — WAJIB sebelum Phaser dibuat.

     BUG YANG DIPERBAIKI (grafik prosedural terus walau PNG sudah diupload):
     create() berjalan SINKRON, tapi PNG dimuat ASINKRON lewat new Image().
     Urutan lama:
       buildFallbackTextures()  <- instan, tekstur prosedural jadi
       loadSheetsIfAny()        <- baru MULAI download (~100ms)
       buildAnims()             <- instan, anim pakai frame prosedural
     Saat onload akhirnya jalan, refreshAfterSheet() memanggil enterRoom()
     ulang di tengah scene -- dibungkus catch{} kosong, jadi kalau gagal
     TIDAK ADA SUARA dan sprite selamanya prosedural.

     Solusi: tunggu semua <img data-asset> benar-benar decoded LEBIH DULU,
     baru buat Phaser. create() jadi sepenuhnya sinkron -> tak perlu refresh.
     --------------------------------------------------------------------- */
  var sheetImgs = {};        // name -> HTMLImageElement yang SUDAH decoded
  var sheetsPreloaded = false;

  function preloadSheets(done) {
    if (sheetsPreloaded) { done(); return; }
    sheetsPreloaded = true;
    var names = Object.keys(SHEETS);
    var pending = 0, finished = false;
    // Jaring pengaman: jaringan lambat/mati tak boleh menahan game selamanya.
    var guard = setTimeout(function () { if (!finished) { finished = true; done(); } }, 4000);
    addTimer(guard);
    function one() {
      if (finished) return;
      if (--pending <= 0) { finished = true; clearTimeout(guard); done(); }
    }
    names.forEach(function (name) {
      var url = sheetUrl(name);
      if (!url) return;                       // slot kosong -> prosedural, itu normal
      pending++;
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        // naturalWidth 0 = file rusak / proxy mengembalikan teks, bukan gambar
        if (img.naturalWidth > 0) sheetImgs[name] = img;
        one();
      };
      img.onerror = function () { one(); };   // diam -> fallback prosedural dipakai
      img.src = url;
    });
    if (pending === 0) { finished = true; clearTimeout(guard); done(); }
  }

  var bootRetries = 0;
  function bootGame(after) {
    var parent = $('frpg-stage');
    if (!parent) { showError('Container game tidak ditemukan.'); return; }
    var rect = parent.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) {           // trap ukuran-0
      // JANGAN loop selamanya: kalau setelah ~40 frame (~0.7 dtk) stage tetap
      // 0px (CSS gagal memberi ukuran), paksa boot pakai ukuran internal supaya
      // tombol PLAY tidak tampak mati total. Undangan tetap bisa dibuka.
      if (bootRetries++ < 40) {
        requestAnimationFrame(function () { bootGame(after); });
        return;
      }
      // fallthrough: paksa boot walau ukuran belum terbaca
    }
    bootRetries = 0;
    // PNG dulu, baru Phaser. Tanpa ini create() menang cepat dan grafiknya
    // terkunci di fallback prosedural (bug "aset sudah upload tapi tak masuk").
    if (!sheetsPreloaded) {
      preloadSheets(function () { bootGame(after); });
      return;
    }

    P = window.Phaser;
    var S = defineScenes();
    try {
      GAME = new P.Game({
        type: P.AUTO,
        parent: parent,
        width: CFG.BW, height: CFG.BH,
        backgroundColor: '#1a2416',
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        render: { pixelArt: true, antialias: false, roundPixels: true },
        // FIT: kanvas 192x320 diskala mempertahankan rasio. Karena rasio kanvas
        // = rasio frame CSS (lihat .frpg-frame aspect-ratio), TAK ADA pita kosong.
        scale: { mode: P.Scale.FIT, autoCenter: P.Scale.CENTER_BOTH, width: CFG.BW, height: CFG.BH },
        scene: [S.GameScene]
      });
      disposers.push(function () { if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; } });
      if (after) addTimer(setTimeout(after, 60));
    } catch (e) {
      showError('Gagal memulai game: ' + (e && e.message ? e.message : e));
    }
  }

  function startRun(areaIdx) {
    // Guard terpusat: semua pemanggil aman walau Phaser gagal / belum siap.
    if (phaserFailed) { revealFullInvitation(); return; }
    if (!phaserReady || !window.Phaser) { pendingStart = true; toast('Memuat game...', 'info'); return; }
    window.__frpgStarted = { area: areaIdx };
    showOverlay(null);
    if (GAME && !gameStageAttached()) {
      // canvas yatim setelah host re-inject -> bongkar & boot ulang
      GAME.events.once('destroy', function () { GAME = null; bootGame(function () { startRun(areaIdx); }); });
      try { GAME.destroy(true); } catch (e) { GAME = null; }
      return;
    }
    if (!GAME) { bootGame(function () { startRun(areaIdx); }); return; }
    var sc = getScene();
    if (sc) { sc.scene.restart({ area: areaIdx }); }     // hot-load, JANGAN destroy+new sinkron
    else { try { GAME.scene.start('GameScene', { area: areaIdx }); } catch (e) {} }
  }

  // UI di-wire LEBIH DULU & TANPA bergantung Phaser.
  // Undangan wajib tetap bisa dibuka walau engine game gagal dimuat (§1.7 Inklusif).
  function initUI() {
    INFOS = scanSections();
    if (!INFOS.length) {
      showError('Konten undangan tidak ditemukan (#inv-source kosong).');
      return false;
    }
    wireUI();
    buildIndicators();
    try { drawCoupleCanvas(); } catch (e) {}
    return true;
  }

  // Hanya bagian yang BENAR-BENAR butuh Phaser.
  function initGame() {
    phaserReady = true;
    if (pendingStart) {                    // user sudah menekan START saat Phaser masih dimuat
      pendingStart = false;
      addTimer(setTimeout(function () { try { startRun(0); } catch (e) {} }, 30));
      return;
    }
    // Auto-resume HANYA bila cover & reveal TIDAK tampil (Z.7)
    try {
      var coverUp = overlayUp('frpg-cover');
      var revealUp = overlayUp('frpg-reveal');
      if (window.__frpgStarted && !coverUp && !revealUp) {
        var rs = window.__frpgStarted;
        addTimer(setTimeout(function () {
          try { startRun((rs && rs.area) || 0); } catch (e) {}
        }, 60));
      }
    } catch (e) {}
  }

  function boot() {
    // 1) UI dulu — sinkron, tanpa jaringan. Tombol hidup seketika.
    var ok;
    try { ok = initUI(); }
    catch (e) { showError('Terjadi kesalahan: ' + (e && e.message ? e.message : e)); return; }
    if (!ok) return;

    // 2) Baru muat Phaser. Gagal = game mati, TAPI undangan tetap jalan.
    ensurePhaser(function () {
      try { initGame(); } catch (e) {
        showError('Game gagal dimuat. Undangan tetap bisa dibuka lewat tombol di bawah.');
      }
    });
  }

  // JANGAN menunggu DOMContentLoaded: host menyuntik tema ke halaman yang SUDAH loaded,
  // jadi event itu sudah lewat dan callback tak akan pernah jalan (tombol mati total).
  // HTML tema selalu sudah ada di DOM sebelum <script> tema dieksekusi.
  boot();

})();
