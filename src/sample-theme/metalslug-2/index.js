/* METAL SLUG 2 — WEDDING THEME · index.js  (Phaser 3.80.1, single-file)
   Mengikuti METALSLUG2_BIBLE.md. Dua perbaikan inti vs versi lama:
   (1) DENSITY "NO DEAD AIR" — generator ber-kuota + validator regen (no layar kosong).
   (2) SPAWN RELATIF-KAMERA — musuh off-screen = data inert tanpa hitbox; lahir di tepi kanan
       saat scroll mencapainya; peluru despawn di tepi → MUSTAHIL membunuh musuh off-screen.
   Host contract: cleanup idempotent, ID host verbatim, musik mirror, binding 1 sumber. */
(function () {
  'use strict';
  // ===== CLEANUP IDEMPOTEN (host re-inject tiap submit ucapan/RSVP) =====
  if (typeof window.__gwCleanup === 'function') { try { window.__gwCleanup(); } catch (e) {} }
  var offs = [];
  function addGlobal(t, type, fn, opt) { t.addEventListener(type, fn, opt); offs.push(function () { try { t.removeEventListener(type, fn, opt); } catch (e) {} }); }
  function $(id) { return document.getElementById(id); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  // ===== KONSTANTA & CONFIG =====
  var TILE = 36;
  var STORE_KEY = 'ms2_wedding_v1';
  var DIFF = {
    easy:   { minEnemies: 3, eBullet: 180, eInterval: 1600, iframe: 1200, heavyFrom: 3 },
    normal: { minEnemies: 4, eBullet: 230, eInterval: 1200, iframe: 1000, heavyFrom: 2 },
    hard:   { minEnemies: 6, eBullet: 290, eInterval: 900,  iframe: 800,  heavyFrom: 1 }
  };
  var SECTOR_BIOMES = [
    { name:'JUNGLE',  sky:0x1d3a1f, far:0x244a26, mid:0x2f5e30, ground:0x3b2a18, accent:0x7bd64a },
    { name:'SUNGAI',  sky:0x1a3344, far:0x244a5a, mid:0x2f6e7e, ground:0x3a3324, accent:0x4ad6c8 },
    { name:'PESISIR', sky:0x4a3320, far:0x6a4a2a, mid:0x8a6a3a, ground:0x5a4528, accent:0xe0a93a },
    { name:'GURUN',   sky:0x5a4528, far:0x7a5a30, mid:0x9a7a40, ground:0x6a5530, accent:0xe0c060 },
    { name:'PABRIK',  sky:0x33363a, far:0x44474a, mid:0x55585a, ground:0x3a3a3a, accent:0xb7d64a },
    { name:'MARKAS',  sky:0x3a1820, far:0x4a2030, mid:0x5a2535, ground:0x2a2020, accent:0xe0563a }
  ];
  var SECTOR_COUNT = 6;

  // campur dua warna hex int (t=0..1 menuju c2)
  function blend(c1, c2, t) {
    var r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
    var r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
    var r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  // ===== STATE PERSISTEN =====
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveStore(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} }
  var STORE = loadStore();
  STORE.unlocked = STORE.unlocked || {};
  STORE.maxSector = STORE.maxSector || 0;
  STORE.difficulty = STORE.difficulty || 'normal';
  STORE.announcedAll = STORE.announcedAll || false;
  STORE.completed = STORE.completed || false;

  // ===== BINDING: baca section riil dari #inv-source =====
  function val(k, fb) {
    var el = document.querySelector('[data-var="' + k + '"]');
    var v = el ? (el.textContent || '').trim() : '';
    if (!v || v.indexOf('{{') === 0) return fb || '';
    return v;
  }
  function scanSections() {
    var secs = qa('#inv-source > section[data-info]');
    return secs.map(function (s) {
      return { key: s.getAttribute('data-info'), title: s.getAttribute('data-title') || s.getAttribute('data-info'), el: s };
    });
  }
  var INFOS = scanSections();                 // daftar section riil (dinamis!)
  var INFO_COUNT = INFOS.length || 1;

  // ===== QUOTA kepingan per sektor (auto-scale ke jumlah section riil) =====
  function buildQuota(total) {
    // shape default 6 sektor: berbobot ke awal (info pokok di awal). sum dinormalisasi ke total.
    var shape = [3, 3, 2, 2, 1, 0];
    var sum = shape.reduce(function (a, b) { return a + b; }, 0);
    var q = shape.map(function (w) { return Math.round(w / sum * total); });
    // koreksi pembulatan
    var diff = total - q.reduce(function (a, b) { return a + b; }, 0);
    var i = 0;
    while (diff !== 0) { var idx = i % SECTOR_COUNT; q[idx] += diff > 0 ? 1 : (q[idx] > 0 ? -1 : 0); if (q[idx] >= 0) diff += diff > 0 ? -1 : 1; i++; if (i > 99) break; }
    return q;
  }
  var QUOTA = buildQuota(INFO_COUNT);
  // pemetaan deterministik sektor -> slice INFOS (kontigu)
  function sectorInfoSlice(sectorIdx) {
    var start = 0; for (var i = 0; i < sectorIdx; i++) start += QUOTA[i];
    return INFOS.slice(start, start + QUOTA[sectorIdx]);
  }

  // ===== ASET SPRITE (URL dari Theme Editor; null bila belum diupload → fallback prosedural) =====
  function assetUrl(name) {
    var el = document.querySelector('#ms2-assets img[data-asset="' + name + '"]');
    if (!el) return null;
    var src = (el.getAttribute('src') || '').trim();
    // belum di-resolve parser ({{...}}) ATAU kosong → anggap tidak ada (fallback prosedural)
    if (!src || src.indexOf('{{') > -1) return null;
    return src;
  }
  // daftar aset → {key Phaser, nama data-asset, tipe}
  var ASSET_LIST = [
    { key: 'a_player_idle', name: 'player_idle' },
    { key: 'a_player_run1', name: 'player_run1' },
    { key: 'a_player_run2', name: 'player_run2' },
    { key: 'a_player_shoot', name: 'player_shoot' },
    { key: 'a_enemy_idle', name: 'enemy_idle' },
    { key: 'a_enemy_run1', name: 'enemy_run1' },
    { key: 'a_enemy_run2', name: 'enemy_run2' },
    { key: 'a_muzzle', name: 'muzzle' },
    { key: 'a_dirt', name: 'dirt' },
    { key: 'a_grass', name: 'grass' },
    { key: 'a_explosion', name: 'explosion', sheet: { frameWidth: 100, frameHeight: 100 } }
  ];
  function hasAsset(scene, key) { return scene.textures.exists(key); }

  // ===== ELEMEN DOM =====
  var stageEl = $('gw-stage');
  if (!stageEl) return;

  // ===== HELPER UI overlay/toast =====
  var OVERLAYS = ['gw-cover-ov', 'gw-briefing', 'gw-clear', 'gw-allpieces', 'gw-win', 'gw-stagesel', 'gw-resetconfirm'];
  function hideOverlays() { OVERLAYS.forEach(function (id) { var e = $(id); if (e) e.style.display = 'none'; }); }
  function showOverlay(id) { hideOverlays(); var e = $(id); if (e) e.style.display = 'grid'; }
  function toast(msg, ms) {
    var t = document.createElement('div'); t.className = 'gw-toast'; t.textContent = msg;
    stageEl.parentNode.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 2600);
  }
  function showError(msg) {
    stageEl.insertAdjacentHTML('beforeend',
      '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#f66;font:13px monospace;background:#111;text-align:center;padding:20px;z-index:50">' + msg + '</div>');
  }

  // ===== INDIKATOR KEPINGAN (dinamis dari INFOS) =====
  var ICONS = { hero:'🏠', couple:'💑', rsvp:'✓', schedule:'📅', streaming:'▶', story:'📖', gallery:'🖼️', happiness:'📸', wishes:'✉️', gift:'🎁', closing:'🕊️' };
  function buildIndicators() {
    var wrap = $('gw-pieces'); if (!wrap) return; wrap.innerHTML = '';
    INFOS.forEach(function (info) {
      var b = document.createElement('button');
      b.className = 'gw-piece' + (STORE.unlocked[info.key] ? ' is-on' : '');
      b.setAttribute('data-key', info.key);
      b.textContent = ICONS[info.key] || '💌';
      b.title = info.title;
      b.addEventListener('click', function () { if (STORE.unlocked[info.key]) openPieceModal(info.key); });
      wrap.appendChild(b);
    });
    $('gw-progress-t').textContent = INFO_COUNT;
    refreshProgress();
  }
  function refreshProgress() {
    var n = INFOS.filter(function (i) { return STORE.unlocked[i.key]; }).length;
    $('gw-progress-n').textContent = n;
    var openBtn = $('gw-open-btn'); var sideOpen = $('gw-side-open');
    var all = n >= INFO_COUNT;
    if (openBtn) openBtn.disabled = !(all || cheat.on);
    return n;
  }
  function unlockInfo(key) {
    if (STORE.unlocked[key]) return false;
    STORE.unlocked[key] = true; saveStore(STORE);
    var b = document.querySelector('.gw-piece[data-key="' + key + '"]');
    if (b) { b.classList.add('is-on', 'pop'); setTimeout(function () { b.classList.remove('pop'); }, 420); }
    var info = INFOS.filter(function (i) { return i.key === key; })[0];
    toast('💌 Kepingan: ' + (info ? info.title : key));
    var n = refreshProgress();
    if (n >= INFO_COUNT) announceAllCollected();
    return true;
  }

  // ===== MODAL kepingan & REVEAL penuh (clone dari #inv-source) =====
  function sectionHTML(key) {
    var s = document.querySelector('#inv-source > section[data-info="' + key + '"]');
    return s ? s.innerHTML : '';
  }
  function openPieceModal(key) {
    var body = $('gw-modal-body'); if (!body) return;
    body.innerHTML = '<section>' + sectionHTML(key) + '</section>';
    $('gw-modal-root').style.display = 'grid';
    wireFormsIn(body);
  }
  function closePieceModal() { $('gw-modal-root').style.display = 'none'; }
  function openFullReveal() {
    var body = $('gw-reveal-body'); if (!body) return;
    body.innerHTML = INFOS.map(function (i) { return '<section>' + sectionHTML(i.key) + '</section>'; }).join('');
    $('gw-reveal').style.display = 'block';
    wireFormsIn(body);
    hideOverlays();
  }
  function closeReveal() { $('gw-reveal').style.display = 'none'; }

  // ===== WIRING form (RSVP/ucapan) di dalam modal/reveal: panggil global host + fallback =====
  function wireFormsIn(root) {
    var rsvp = root.querySelector('#btn-submit-kehadiran');
    if (rsvp) rsvp.addEventListener('click', function () {
      if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
      var a = root.querySelector('#alert-submit-kehadiran'); if (a) a.textContent = 'Terima kasih atas konfirmasinya! 🎉';
    });
    var ucap = root.querySelector('#btn-submit-ucapan');
    if (ucap) ucap.addEventListener('click', function () {
      if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
      var nm = root.querySelector('#wish-name'), msg = root.querySelector('#wish-message');
      var list = root.querySelector('#gw-wishes-list'), a = root.querySelector('#alert-submit-ucapan');
      if (nm && msg && list && nm.value && msg.value) {
        var d = document.createElement('div'); d.className = 'gw-wish';
        d.innerHTML = '<b>' + nm.value + '</b><p>' + msg.value + '</p>';
        list.insertBefore(d, list.firstChild); msg.value = '';
        if (a) a.textContent = 'Ucapan terkirim! 💌';
      }
    });
  }

  // ===== MUSIK (host yang memutar — tema TIDAK audio.play() backsound tenant) =====
  // #btn-toggle-music & #play-icon/#pause-icon di-handle HOST (InvitationPage). Tema tidak
  // menambah listener sendiri ke tombol ini agar tak double-toggle (bug mahal di retromario).
  // Cukup biarkan host memutar saat isPlaying && isOpened.
  function syncMusicIcon() { /* host mengelola ikon; no-op di tema */ }

  // ===== CHEAT =====
  var cheat = { on: false };
  function toggleCheat() {
    cheat.on = !cheat.on;
    $('gw-cheat').classList.toggle('is-on', cheat.on);
    $('gw-stagesel-btn').style.display = cheat.on ? '' : '';   // stage-select selalu ada; cheat membuka semua
    if (cheat.on) {
      INFOS.forEach(function (i) { unlockInfo(i.key); });
      toast('★ CHEAT ON — kebal, semua stage & kepingan terbuka');
    } else {
      toast('★ CHEAT OFF — mode jujur');
    }
    refreshProgress();
    if (window.__ms2 && window.__ms2.onCheat) window.__ms2.onCheat(cheat.on);
  }

  // ===== CELEBRATION (2 pemicu) =====
  function announceAllCollected() {
    if (STORE.announcedAll) { refreshProgress(); return; }
    STORE.announcedAll = true; saveStore(STORE);
    if (window.__ms2 && window.__ms2.celebrate) window.__ms2.celebrate();
    setTimeout(function () {
      $('gw-allpieces-text').innerHTML = 'Selamat ' + (val('groom_nickname', 'Mempelai')) + ' &amp; ' + (val('bride_nickname', '')) + '!<br>Semua kepingan terkumpul — undangan siap dibuka.';
      showOverlay('gw-allpieces');
    }, 4500);
  }
  function announceWin() {
    if (window.__ms2 && window.__ms2.celebrate) window.__ms2.celebrate();
    // pastikan semua kepingan terbuka saat menang
    INFOS.forEach(function (i) { if (!STORE.unlocked[i.key]) { STORE.unlocked[i.key] = true; } });
    saveStore(STORE); buildIndicators();
    STORE.completed = true; saveStore(STORE);
    setTimeout(function () {
      $('gw-win-text').innerHTML = val('groom_nickname', 'Mempelai') + ' &amp; ' + val('bride_nickname', '') + ' — happily ever after! 🎉<br>Undangan kini lengkap.';
      showOverlay('gw-win');
    }, 4500);
  }

  // ================= PHASER GAME =================
  function ensurePhaser(cb) {
    if (window.Phaser) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
    s.onload = cb; s.onerror = function () { showError('Gagal memuat Phaser'); };
    document.body.appendChild(s);
  }

  var GAME = null, pendingStart = { sector: 0, difficulty: STORE.difficulty };

  function startGame(sector, difficulty) {
    hideOverlays();
    pendingStart = { sector: sector || 0, difficulty: difficulty || STORE.difficulty };
    STORE.difficulty = pendingStart.difficulty; saveStore(STORE);
    if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
    bootGame();
  }

  function bootGame() {
    var r = stageEl.getBoundingClientRect();
    var W = Math.max(320, Math.round(r.width));
    var H = Math.max(480, Math.round(r.height));
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    GAME = new Phaser.Game({
      type: Phaser.AUTO, parent: 'gw-stage', width: W, height: H,
      backgroundColor: '#10160e',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      physics: { default: 'arcade', arcade: { gravity: { y: 1000 }, debug: false } },
      render: { pixelArt: true, antialias: false, roundPixels: true },
      scene: [makeScene(W, H, isTouch)]
    });
    window.__gwGame = GAME;
  }

  // ===== TEXTURE prosedural (shaded) =====
  function box(g, x, y, w, h, base, hi, sh) {
    g.fillStyle(base, 1); g.fillRect(x, y, w, h);
    if (hi != null) { g.fillStyle(hi, 1); g.fillRect(x, y, w, Math.max(1, h * 0.22 | 0)); }
    if (sh != null) { g.fillStyle(sh, 1); g.fillRect(x, y + h - (h * 0.22 | 0), w, Math.max(1, h * 0.22 | 0)); }
  }
  function outline(g, x, y, w, h) { g.lineStyle(2, 0x10140d, 1); g.strokeRect(x, y, w, h); }

  function buildTextures(scene) {
    function bake(key, w, h, draw) {
      if (scene.textures.exists(key)) return;
      var g = scene.make.graphics({ x: 0, y: 0 }, false);
      draw(g); g.generateTexture(key, w, h); g.destroy();
    }
    // player frames (idle/run/jump/prone) — siluet helm + senjata
    function drawSoldier(g, run, prone) {
      var H = prone ? 22 : 40, yo = prone ? 18 : 0;
      box(g, 10, 4 + yo, 16, prone ? 12 : 20, 0x6a8a3a, 0x9bbf5a, 0x4a6a26); // badan
      box(g, 12, 0 + yo, 12, 8, 0xe0c28a, 0xf2dab0, 0xb89a62);              // kepala
      box(g, 11, 0 + yo, 14, 4, 0x4a5a2a, 0x6a7a3a, 0x2a3a18);              // helm
      g.fillStyle(0x222, 1); g.fillRect(24, 8 + yo, 12, 3);                  // senjata
      if (run) { box(g, 8, 22 + yo, 8, prone ? 0 : 12, 0x3a4a22, null, null); }
      outline(g, 8, yo, 24, H);
    }
    bake('p_idle', 40, 44, function (g) { drawSoldier(g, false, false); });
    bake('p_run',  40, 44, function (g) { drawSoldier(g, true, false); });
    bake('p_jump', 40, 44, function (g) { drawSoldier(g, false, false); });
    bake('p_prone', 40, 44, function (g) { drawSoldier(g, false, true); });

    // enemies
    bake('e_rush', 34, 40, function (g) {
      box(g, 8, 4, 16, 22, 0xa0432a, 0xc0633a, 0x70220e); box(g, 10, 0, 12, 8, 0xe0a070, 0xf0c090, 0xa07040);
      outline(g, 6, 0, 22, 38);
    });
    bake('e_range', 34, 40, function (g) {
      box(g, 8, 4, 16, 22, 0x4a4a8a, 0x6a6aaa, 0x2a2a5a); box(g, 10, 0, 12, 8, 0xe0a070, 0xf0c090, 0xa07040);
      g.fillStyle(0x111, 1); g.fillRect(22, 10, 14, 3); outline(g, 6, 0, 22, 38);
    });
    bake('e_turret', 40, 30, function (g) {
      box(g, 4, 12, 32, 16, 0x55585a, 0x75787a, 0x35383a); g.fillStyle(0x111, 1); g.fillRect(30, 16, 14, 5);
      outline(g, 4, 12, 32, 16);
    });
    bake('e_drone', 40, 22, function (g) {
      box(g, 8, 6, 24, 12, 0x707080, 0x9090a0, 0x505060); g.fillStyle(0x222, 1); g.fillRect(0, 2, 40, 3);
      g.fillStyle(0xe0563a, 1); g.fillRect(18, 16, 4, 4); outline(g, 8, 6, 24, 12);
    });
    bake('e_tank', 72, 44, function (g) {
      box(g, 4, 18, 64, 22, 0x4a5a2a, 0x6a7a3a, 0x2a3a18); box(g, 18, 6, 30, 16, 0x3a4a22, 0x5a6a32, 0x1a2a10);
      g.fillStyle(0x111, 1); g.fillRect(44, 10, 28, 5); g.fillStyle(0x000, 1);
      g.fillCircle(16, 42, 6); g.fillCircle(36, 42, 6); g.fillCircle(56, 42, 6); outline(g, 4, 6, 64, 36);
    });
    bake('e_mortar', 40, 34, function (g) {
      box(g, 6, 14, 28, 18, 0x6a5a2a, 0x8a7a3a, 0x4a3a18); g.fillStyle(0x111, 1); g.fillRect(16, 2, 6, 16);
      outline(g, 6, 14, 28, 18);
    });

    // boss
    bake('boss', 160, 130, function (g) {
      box(g, 10, 20, 140, 90, 0x5a2535, 0x7a3545, 0x3a1525);
      box(g, 30, 4, 100, 30, 0x4a2030, 0x6a3040, 0x2a1020);
      g.fillStyle(0x111, 1); g.fillRect(120, 40, 40, 12);                 // laras
      g.fillStyle(0xe0563a, 1); g.fillCircle(80, 70, 14);                 // weak point bersinar
      g.fillStyle(0xffcc66, 1); g.fillCircle(80, 70, 7);
      outline(g, 10, 4, 140, 106);
    });

    // bullets & item & props
    bake('bullet',  10, 4, function (g) { g.fillStyle(0xffe066, 1); g.fillRect(0, 0, 10, 4); g.fillStyle(0xfff2b0, 1); g.fillRect(0, 0, 4, 4); });
    bake('ebullet', 8, 8, function (g) { g.fillStyle(0xe0563a, 1); g.fillCircle(4, 4, 4); g.fillStyle(0xffaa88, 1); g.fillCircle(4, 4, 2); });
    bake('amplop',  30, 22, function (g) { box(g, 2, 2, 26, 18, 0xf2e6c0, 0xfff6e0, 0xcab98a); g.lineStyle(2, 0xb7d64a, 1); g.beginPath(); g.moveTo(2, 2); g.lineTo(15, 12); g.lineTo(28, 2); g.strokePath(); g.fillStyle(0xe0563a, 1); g.fillCircle(15, 13, 3); outline(g, 2, 2, 26, 18); });
    bake('crate',   30, 30, function (g) { box(g, 0, 0, 30, 30, 0x8a6a3a, 0xaa8a4a, 0x5a4520); g.lineStyle(2, 0x5a4520, 1); g.strokeRect(6, 6, 18, 18); outline(g, 0, 0, 30, 30); });
    bake('barrel',  26, 32, function (g) { box(g, 0, 0, 26, 32, 0xd0b020, 0xf0d040, 0x907010); g.fillStyle(0x111, 1); g.fillRect(2, 12, 22, 3); g.fillStyle(0xe0563a, 1); g.fillRect(8, 6, 10, 6); outline(g, 0, 0, 26, 32); });
    bake('pow',     28, 38, function (g) { box(g, 8, 6, 14, 20, 0x4a6a8a, 0x6a8aaa, 0x2a4a6a); box(g, 9, 0, 12, 8, 0xe0c28a, 0xf2dab0, 0xb89a62); g.fillStyle(0xb7d64a, 1); g.fillRect(6, 2, 18, 2); outline(g, 6, 0, 18, 36); });
    bake('bride',   30, 44, function (g) { box(g, 8, 10, 16, 30, 0xf0e8f0, 0xfff8ff, 0xc8c0d0); box(g, 10, 0, 12, 10, 0xe0c28a, 0xf2dab0, 0xb89a62); g.fillStyle(0x8a5a2a, 1); g.fillRect(8, 0, 16, 4); g.fillStyle(0xe0563a, 1); g.fillCircle(16, 22, 4); outline(g, 6, 0, 20, 42); });
    bake('plat',    TILE * 3, TILE, function (g) { box(g, 0, 0, TILE * 3, TILE, 0x5a4a2a, 0x7a6a3a, 0x3a2a18); outline(g, 0, 0, TILE * 3, TILE); });
    bake('ground',  TILE, TILE, function (g) { box(g, 0, 0, TILE, TILE, 0x3b2a18, 0x5a4528, 0x241608); });
    bake('spark',   8, 8, function (g) { g.fillStyle(0xffe066, 1); g.fillCircle(4, 4, 4); });
    // props parallax (prosedural diperkaya)
    bake('tree', 60, 90, function (g) { g.fillStyle(0x2f5e30, 1); g.fillCircle(30, 30, 28); g.fillStyle(0x244a26, 1); g.fillRect(26, 40, 8, 50); });
    bake('landmark', 80, 80, function (g) { box(g, 10, 20, 60, 60, 0x6a6a5a, 0x8a8a7a, 0x4a4a3a); g.fillStyle(0x222, 1); g.fillRect(28, 36, 10, 10); g.fillRect(48, 36, 10, 10); outline(g, 10, 20, 60, 60); });
    // gunung berlapis (siluet segitiga, dipakai untuk parallax jauh) — di-tint per biome
    bake('mtn', 320, 180, function (g) {
      g.fillStyle(0xffffff, 1);
      g.beginPath(); g.moveTo(0, 180); g.lineTo(80, 50); g.lineTo(150, 130); g.lineTo(230, 20); g.lineTo(320, 150); g.lineTo(320, 180); g.closePath(); g.fillPath();
    });
    bake('mtn2', 320, 120, function (g) {
      g.fillStyle(0xffffff, 1);
      g.beginPath(); g.moveTo(0, 120); g.lineTo(60, 60); g.lineTo(130, 100); g.lineTo(200, 40); g.lineTo(280, 90); g.lineTo(320, 70); g.lineTo(320, 120); g.closePath(); g.fillPath();
    });
    // awan (gumpalan lembut)
    bake('cloud', 120, 50, function (g) {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(35, 32, 22); g.fillCircle(65, 26, 28); g.fillCircle(95, 34, 20); g.fillRect(35, 32, 60, 18);
    });
    // hutan/semak depan (silhouette)
    bake('bush', 90, 44, function (g) {
      g.fillStyle(0xffffff, 1); g.fillCircle(22, 30, 18); g.fillCircle(48, 22, 22); g.fillCircle(72, 30, 16); g.fillRect(8, 30, 76, 14);
    });
  }

  // ===== SCENE FACTORY =====
  function makeScene(BW, BH, isTouch) {
    var GROUND_Y = BH - (isTouch ? 200 : 150);

    function Scene() { Phaser.Scene.call(this, { key: 'main' }); }
    Scene.prototype = Object.create(Phaser.Scene.prototype);
    Scene.prototype.constructor = Scene;

    Scene.prototype.preload = function () {
      // load aset yang tersedia (URL dari Theme Editor). Yang tidak ada → fallback prosedural.
      ASSET_LIST.forEach(function (a) {
        var url = assetUrl(a.name);
        if (!url) return;
        if (a.sheet) this.load.spritesheet(a.key, url, a.sheet);
        else this.load.image(a.key, url);
      }, this);
      // kalau ada error load (CORS/404) → diam-diam fallback prosedural (jangan blank)
      this.load.on('loaderror', function (file) { try { this.textures.remove(file.key); } catch (e) {} }, this);
    };

    Scene.prototype.create = function () {
      var self = this;
      this.BW = BW; this.BH = BH; this.GROUND_Y = GROUND_Y;
      this.cfg = DIFF[pendingStart.difficulty] || DIFF.normal;
      this.sector = pendingStart.sector | 0;
      buildTextures(this);
      this.useAsset = {};   // flag per-aset: true bila tekstur asli berhasil di-load
      ASSET_LIST.forEach(function (a) { this.useAsset[a.name] = hasAsset(this, a.key); }, this);
      this.setupAssetAnims();

      // groups
      this.platforms = this.physics.add.staticGroup();
      this.bullets   = this.physics.add.group({ maxSize: 60 });
      this.ebullets  = this.physics.add.group({ maxSize: 60 });
      this.enemies   = this.physics.add.group();
      this.items     = this.physics.add.group();          // amplop, crate, pow, barrel
      this.decorFar  = this.add.group();
      this.decorMid  = this.add.group();

      // SFX (Web Audio sederhana via this.sound oscillator tak ada → pakai beep noop fallback)
      this.sfx = makeSfx(this);

      // PLAYER — pakai aset bila ada, else prosedural
      var pkey = this.useAsset.player_idle ? 'a_player_idle' : 'p_idle';
      this.player = this.physics.add.sprite(80, GROUND_Y - 60, pkey);
      this.player.setCollideWorldBounds(false);
      if (this.useAsset.player_idle) {
        this.fitSprite(this.player, 58);
        // body proporsional terhadap frame asli (skala sudah diterapkan; body pakai ukuran asli sprite)
        var pw = this.player.width, ph = this.player.height;
        this.player.body.setSize(pw * 0.42, ph * 0.92).setOffset(pw * 0.29, ph * 0.06);
      } else {
        this.player.body.setSize(22, 40).setOffset(8, 2);
      }
      this.player.facing = 1; this.player.aimY = 0; this.player.iframe = 0;
      this.player.weapon = 'default'; this.player.prone = false; this.player.nades = 3;
      this.player.lastSafeX = 80;

      // input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys('W,A,S,D,Z,X,SPACE');
      this.touchState = { left:false, right:false, up:false, down:false, fire:false };
      this._fireCD = 0;

      // generate sektor (density-validated)
      this.buildSector(this.sector);

      // colliders — overlap enemies DIDAFTAR SEBELUM collider platform (anti peluru-tembus)
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.enemies, this.platforms);
      this.physics.add.collider(this.items, this.platforms);
      this.physics.add.overlap(this.bullets, this.enemies, function (b, e) { self.hitEnemy(b, e); });
      this.physics.add.collider(this.bullets, this.platforms,
        function (b) { b.disableBody(true, true); },
        function (b) { return !self.bulletOverEnemy(b); });   // jangan kill peluru saat nimpa musuh
      this.physics.add.overlap(this.bullets, this.items, function (b, it) { self.hitItem(b, it); });
      this.physics.add.overlap(this.player, this.items, function (p, it) { self.touchItem(it); });
      this.physics.add.overlap(this.player, this.enemies, function (p, e) { if (e.getData('type') !== 'barrel') self.playerHit(); });
      this.physics.add.overlap(this.player, this.ebullets, function (p, b) { b.disableBody(true, true); self.playerHit(); });

      // camera (player ke kiri ⅖)
      this.cameras.main.setBounds(0, 0, this.sectorWidth, BH);
      this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
      this.cameras.main.setFollowOffset(-Math.round(BW * 0.40), -70);
      this.cameras.main.setDeadzone(20, 120);

      // expose untuk celebration/cheat dari luar
      window.__ms2 = {
        celebrate: function () { self.celebrate(); },
        onCheat: function (on) { if (on) self.player.iframe = 1e9; else self.player.iframe = 0; }
      };
      if (cheat.on) this.player.iframe = 1e9;

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, function () {
        self.time.removeAllEvents(); self.tweens.killAll();
      });

      // briefing
      showBriefing(this.sector);
    };

    // ---------- GENERATOR SEKTOR (density-validated) ----------
    Scene.prototype.buildSector = function (idx) {
      var biome = SECTOR_BIOMES[idx % SECTOR_BIOMES.length];
      this.cameras.main.setBackgroundColor(biome.sky);
      var screens = 10 + Math.min(3, idx);                  // panjang sektor (10–13 layar)
      this.sectorWidth = screens * this.BW;
      var GY = this.GROUND_Y;

      // ground kontinu — pakai tile aset (grass+dirt) bila ada, else prosedural
      var useGrass = this.useAsset.grass, useDirt = this.useAsset.dirt;
      for (var gx = 0; gx < this.sectorWidth + this.BW; gx += TILE) {
        var gnd = this.platforms.create(gx + TILE / 2, GY + TILE / 2, useDirt ? 'a_dirt' : 'ground');
        if (useDirt) { gnd.setDisplaySize(TILE, TILE); gnd.refreshBody(); }
        else gnd.refreshBody();
        // lapisan rumput dekoratif di atas (non-collidable)
        if (useGrass) this.add.image(gx + TILE / 2, GY, 'a_grass').setDisplaySize(TILE, TILE * 0.6).setOrigin(0.5, 1).setDepth(0);
      }

      // ===== BACKDROP PARALLAX KAYA (4 lapis: langit→gunung jauh→gunung dekat+awan→semak depan) =====
      // lapis 0: langit gradien per-biome (fixed, scrollFactor 0)
      var skyTop = this.add.rectangle(0, 0, this.BW, this.BH, biome.sky).setOrigin(0).setScrollFactor(0).setDepth(-9);
      var skyBot = this.add.rectangle(0, this.BH * 0.45, this.BW, this.BH * 0.55, blend(biome.sky, 0x000000, 0.35)).setOrigin(0).setScrollFactor(0).setDepth(-9);
      this.decorFar.add(skyTop); this.decorFar.add(skyBot);
      // matahari/bulan (fixed)
      var sun = this.add.circle(this.BW * 0.7, this.BH * 0.22, 30, blend(biome.accent, 0xffffff, 0.4)).setScrollFactor(0).setDepth(-9).setAlpha(0.85);
      this.decorFar.add(sun);
      for (var s = 0; s < screens; s++) {
        var bx = s * this.BW;
        // lapis 1: gunung jauh (scrollFactor 0.15, tint gelap biome)
        var m1 = this.add.image(bx + 160, GY + 20, 'mtn').setOrigin(0.5, 1).setScrollFactor(0.15).setDepth(-7).setTint(blend(biome.far, 0x000000, 0.25)).setDisplaySize(380, 200);
        this.decorFar.add(m1);
        // lapis 2: gunung dekat (scrollFactor 0.35) + awan (scrollFactor 0.2)
        var m2 = this.add.image(bx + 360, GY + 30, 'mtn2').setOrigin(0.5, 1).setScrollFactor(0.35).setDepth(-6).setTint(biome.far).setDisplaySize(360, 150);
        this.decorFar.add(m2);
        var cl = this.add.image(bx + 120 + (s % 2) * 240, GY - 230 - (s % 3) * 30, 'cloud').setScrollFactor(0.2).setDepth(-8).setTint(0xffffff).setAlpha(0.8).setScale(1.1);
        this.decorFar.add(cl);
        // lapis 3: midground props (landmark/pohon, scrollFactor 0.55, tint mid)
        var lm = this.add.image(bx + 220, GY - 8, 'tree').setOrigin(0.5, 1).setScrollFactor(0.55).setDepth(-4).setTint(biome.mid).setDisplaySize(70, 110);
        this.decorMid.add(lm);
        var lm2 = this.add.image(bx + 440, GY - 8, 'landmark').setOrigin(0.5, 1).setScrollFactor(0.55).setDepth(-4).setTint(blend(biome.mid, 0x000000, 0.15));
        this.decorMid.add(lm2);
        // lapis 4: semak depan (scrollFactor 0.8, di depan tanah, tint mid gelap)
        var bush = this.add.image(bx + 300, GY + 18, 'bush').setOrigin(0.5, 1).setScrollFactor(0.8).setDepth(2).setTint(blend(biome.mid, 0x000000, 0.4)).setDisplaySize(110, 54);
        this.decorMid.add(bush);
      }

      // spawnList musuh (RECORD INERT — bukan entity!) + items + platforms
      this.spawnList = [];
      this._next = 0;
      var pieceInfos = sectorInfoSlice(idx);
      var pieceIdx = 0;
      var rewardLastX = 0;

      // safe zone 600px (tanpa musuh) tapi tetap berisi prop + 1 musuh telegraph di ujung
      var x = 640;
      // generator per-segmen sampai dekat AREA CLEAR
      var lastGate = this.sectorWidth - this.BW;
      var elevateCounter = 0;
      while (x < lastGate) {
        // --- ELEVASI: pijakan naik tiap 6–10 tile ---
        elevateCounter++;
        if (elevateCounter % 2 === 0) {
          var py = GY - (90 + (elevateCounter % 3) * 36);
          var pl = this.platforms.create(x, py, 'plat'); pl.refreshBody();
          // turret/range di atas pijakan (ancaman vertikal)
          if (idx >= 1 && Math.random() < 0.6) this.spawnList.push({ x: x, type: 'turret', y: py - 26 });
          else this.spawnList.push({ x: x, type: 'range', y: py - 30 });
        }

        // --- MUSUH darat (LANTAI density: jamin minimum per layar) ---
        var perScreen = this.cfg.minEnemies;
        for (var k = 0; k < perScreen; k++) {
          var ex = x + 80 + k * 120 + (Math.random() * 40 - 20);
          var roll = Math.random();
          var type;
          if (roll < 0.50) type = 'rush';
          else if (roll < 0.78) type = 'range';
          else if (roll < 0.90 && idx >= 1) type = 'drone';
          else if (idx + 1 >= this.cfg.heavyFrom) type = (Math.random() < 0.5 ? 'tank' : 'mortar');
          else type = 'rush';
          var ey = type === 'drone' ? GY - 220 : GY - 30;
          this.spawnList.push({ x: ex, type: type, y: ey });
        }

        // --- DESTRUCTIBLE (≥2/layar): barel/crate ---
        this.queueItem(x + 200, GY - 16, 'barrel');
        this.queueItem(x + 360, GY - 16, 'barrel');

        // --- crate senjata kadang (Relevance: musuh menyusul di slot berikut) ---
        if (elevateCounter % 4 === 1) this.queueItem(x + 300, GY - 16, 'crate');

        // --- REWARD cadence (POW) tiap ≤2.5 layar ---
        if (x - rewardLastX >= this.BW * 2.2) { this.queueItem(x + 420, GY - 20, 'pow'); rewardLastX = x; }

        // --- KEPINGAN (deterministik dari quota; diapit musuh = usage window) ---
        if (pieceIdx < pieceInfos.length && elevateCounter % 3 === 2) {
          var info = pieceInfos[pieceIdx++];
          this.queueItem(x + 250, GY - 90, 'amplop', info.key);
        }

        x += this.BW;   // maju 1 layar
      }

      // sisa kepingan (kalau belum tersebar semua) → taruh di layar-layar awal yang aman
      while (pieceIdx < pieceInfos.length) {
        var info2 = pieceInfos[pieceIdx++];
        this.queueItem(700 + pieceIdx * 300, GY - 90, 'amplop', info2.key);
      }

      // 1 musuh telegraph pelan di ujung safe zone
      this.spawnList.unshift({ x: 560, type: 'rush', y: GY - 30, opts: { slow: true } });

      // VALIDATOR DENSITY (regen ringan: kalau ada layar tanpa musuh → sisipkan)
      this.validateDensity(idx, GY);

      // urutkan spawnList by triggerX (WAJIB untuk pointer)
      this.spawnList.sort(function (a, b) { return a.x - b.x; });

      // AREA CLEAR gate / BOSS
      this.areaClearX = this.sectorWidth - this.BW * 0.6;
      this.cleared = false;
      this.isBossSector = (idx === SECTOR_COUNT - 1);
      if (this.isBossSector) { this.arenaX = this.sectorWidth - this.BW * 1.3; this.bossSpawned = false; }
    };

    // ---------- ASET: anims & helper ----------
    Scene.prototype.setupAssetAnims = function () {
      var self = this;
      function mk(key, frames, rate, repeat) {
        if (self.anims.exists(key)) return;
        self.anims.create({ key: key, frames: frames, frameRate: rate, repeat: repeat == null ? -1 : repeat });
      }
      // player run (2 frame) dari aset
      if (this.useAsset.player_run1 && this.useAsset.player_run2)
        mk('p_run_anim', [{ key: 'a_player_run1' }, { key: 'a_player_run2' }], 10);
      // enemy run
      if (this.useAsset.enemy_run1 && this.useAsset.enemy_run2)
        mk('e_run_anim', [{ key: 'a_enemy_idle' }, { key: 'a_enemy_run1' }, { key: 'a_enemy_run2' }], 8);
      // explosion (spritesheet 50 frame)
      if (this.useAsset.explosion)
        mk('expl_anim', this.anims.generateFrameNumbers('a_explosion', { start: 0, end: 49 }), 40, 0);
    };
    // target tinggi sprite player/enemy di dunia ~ 56px (skala sprite besar Kenney/soldier)
    Scene.prototype.fitSprite = function (spr, targetH) {
      if (!spr || !spr.height) return;
      var s = targetH / spr.height; spr.setScale(s);
    };

    Scene.prototype.queueItem = function (x, y, type, key) {
      // items di-spawn langsung (statis, sedikit) — TAPI hanya yang dekat kamera yang aktif via cull.
      var spr = this.items.create(x, y, type === 'amplop' ? 'amplop' : type === 'crate' ? 'crate' : type === 'pow' ? 'pow' : 'barrel');
      spr.setData('type', type); if (key) spr.setData('key', key);
      if (type === 'amplop') { spr.body.setAllowGravity(false); this.tweens.add({ targets: spr, y: y - 10, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); }
      else if (type === 'pow') { spr.body.setAllowGravity(false); }
      else { spr.setData('hp', 1); }
      spr.refreshBody && spr.refreshBody();
      return spr;
    };

    Scene.prototype.validateDensity = function (idx, GY) {
      // pindai per layar; layar tempur tanpa musuh → sisip rush (jamin lantai)
      var perScreen = {};
      this.spawnList.forEach(function (r) { var s = Math.floor(r.x / BW); perScreen[s] = (perScreen[s] || 0) + 1; });
      var screens = Math.floor(this.sectorWidth / BW);
      for (var s = 1; s < screens - 1; s++) {                 // lewati safe zone (0) & gate akhir
        var have = perScreen[s] || 0;
        var need = this.cfg.minEnemies;
        for (var i = have; i < need; i++) {
          this.spawnList.push({ x: s * BW + 100 + i * 110, type: 'rush', y: GY - 30 });
        }
      }
    };

    // ---------- SPAWN RELATIF-KAMERA ----------
    Scene.prototype.spawnEnemy = function (type, x, y, opts) {
      opts = opts || {};
      // infanteri (rush/range) pakai aset tentara bila ada; lainnya prosedural
      var useInf = (type === 'rush' || type === 'range') && this.useAsset.enemy_idle;
      var key = useInf ? 'a_enemy_idle' : ('e_' + type);
      var e = this.enemies.create(x, y, key);
      e.setData('type', type);
      e.setData('hp', type === 'tank' ? 6 : (type === 'turret' || type === 'mortar' ? 2 : 1));
      e.setData('fireT', this.time.now + 400 + Math.random() * this.cfg.eInterval);
      e.setData('slow', !!opts.slow);
      if (useInf) {
        this.fitSprite(e, 54);
        var ew = e.width, eh = e.height;
        e.body.setSize(ew * 0.42, eh * 0.92).setOffset(ew * 0.29, eh * 0.06);
        e.setData('asset', true);
      }
      if (type === 'drone') { e.body.setAllowGravity(false); }
      if (type === 'turret') { e.body.setAllowGravity(false); e.body.setImmovable(true); }
      e.setDepth(1);
      return e;
    };

    Scene.prototype.bulletOverEnemy = function (b) {
      var over = false, list = this.enemies.getChildren();
      for (var i = 0; i < list.length; i++) { var e = list[i]; if (!e.active || !e.body) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(b.getBounds(), e.getBounds())) { over = true; break; } }
      return over;
    };

    Scene.prototype.hitEnemy = function (b, e) {
      if (!b.active || !e.active) return;            // idempotent guard
      b.disableBody(true, true);
      var hp = e.getData('hp') - 1; e.setData('hp', hp);
      this.spawnSpark(e.x, e.y);
      if (hp <= 0) {
        this.addScore(100);
        this.explode(e.x, e.y);
        e.disableBody(true, true);
      } else {
        this.cameras.main.flash(40, 255, 220, 120);
      }
    };

    Scene.prototype.manualEnemyHits = function () {
      // sweep anti-tunnel (peluru cepat) — span 1 frame
      var list = this.enemies.getChildren(), self = this;
      this.bullets.getChildren().forEach(function (b) {
        if (!b.active || !b.body) return;
        var vx = b.body.velocity.x, by = b.y;
        var x0 = vx < 0 ? b.x : b.x - Math.abs(vx) * 0.016;
        var x1 = vx < 0 ? b.x + Math.abs(vx) * 0.016 : b.x;
        for (var i = 0; i < list.length; i++) { var e = list[i], eb = e.body; if (!e.active || !eb) continue;
          if (x1 > eb.left - 6 && x0 < eb.right + 6 && by > eb.top - 6 && by < eb.bottom + 6) { self.hitEnemy(b, e); break; } }
      });
    };

    Scene.prototype.hitItem = function (b, it) {
      if (!b.active || !it.active) return;
      var type = it.getData('type');
      if (type === 'amplop') {
        b.disableBody(true, true);
        unlockInfo(it.getData('key'));
        this.spawnSpark(it.x, it.y); this.addScore(50);
        it.disableBody(true, true);
      } else if (type === 'barrel') {
        b.disableBody(true, true);
        this.explode(it.x, it.y); this.cameras.main.shake(120, 0.02);
        this.addScore(30);
        // chain: barel/musuh terdekat
        this.damageNearby(it.x, it.y, 70);
        it.disableBody(true, true);
      } else if (type === 'crate') {
        b.disableBody(true, true);
        this.dropWeapon(it.x, it.y);
        this.spawnSpark(it.x, it.y);
        it.disableBody(true, true);
      }
    };

    Scene.prototype.touchItem = function (it) {
      var type = it.getData('type');
      if (type === 'pow') { it.disableBody(true, true); this.addScore(150); toast('☺ POW diselamatkan! +150'); if (Math.random() < 0.5) this.dropWeapon(this.player.x, this.player.y - 40, true); }
    };

    Scene.prototype.damageNearby = function (x, y, r) {
      var self = this;
      this.enemies.getChildren().forEach(function (e) { if (!e.active) return;
        if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < r) { var hp = e.getData('hp') - 3; e.setData('hp', hp); if (hp <= 0) { self.explode(e.x, e.y); e.disableBody(true, true); self.addScore(100); } } });
      this.items.getChildren().forEach(function (it) { if (!it.active || it.getData('type') !== 'barrel') return;
        if (Phaser.Math.Distance.Between(x, y, it.x, it.y) < r) { self.explode(it.x, it.y); it.disableBody(true, true); } });
    };

    Scene.prototype.dropWeapon = function (x, y, instant) {
      var w = ['M', 'S', 'L', 'F'][Math.floor(Math.random() * 4)];
      this.player.weapon = ({ M: 'machinegun', S: 'spread', L: 'laser', F: 'flame' })[w];
      $('gw-weapon').textContent = this.player.weapon.toUpperCase();
      toast('🔫 Senjata: ' + this.player.weapon);
      void x; void y; void instant;
    };

    // ---------- COMBAT player ----------
    Scene.prototype.fire = function () {
      if (this.time.now < this._fireCD) return;
      var p = this.player, dir = p.facing, aimUp = (this.cursors.up.isDown || this.keys.W.isDown || this.touchState.up);
      var weapon = p.weapon, cd = 220, speed = 620;
      if (weapon === 'machinegun') cd = 90;
      else if (weapon === 'laser') { cd = 360; speed = 900; }
      else if (weapon === 'flame') { cd = 120; speed = 360; }
      this._fireCD = this.time.now + cd;

      function shoot(self, vx, vy) {
        var b = self.bullets.get(p.x + dir * 20, p.y - (p.prone ? 6 : 8), 'bullet');
        if (!b) return;
        b.setActive(true).setVisible(true); b.enableBody(true, p.x + dir * 20, p.y - (p.prone ? 6 : 8), true, true);
        b.body.setAllowGravity(false); b.setVelocity(vx, vy); b.setFlipX(dir < 0);
      }
      if (weapon === 'spread') { shoot(this, dir * speed, 0); shoot(this, dir * speed * 0.9, -160); shoot(this, dir * speed * 0.9, 160); }
      else if (aimUp) shoot(this, 0, -speed);
      else shoot(this, dir * speed, 0);
      // muzzle flash (aset) di ujung senjata
      if (this.useAsset.muzzle && !aimUp) {
        var mf = this.add.image(p.x + dir * 28, p.y - (p.prone ? 4 : 6), 'a_muzzle').setDepth(3).setScale(2).setFlipX(dir < 0);
        this.time.delayedCall(60, function () { mf.destroy(); });
      }
      this.sfx.shoot();
    };

    Scene.prototype.throwNade = function () {
      if (this.player.nades <= 0) return; this.player.nades--;
      var n = this.bullets.get(this.player.x, this.player.y - 10, 'spark');
      if (!n) return;
      n.setActive(true).setVisible(true); n.enableBody(true, this.player.x, this.player.y - 10, true, true);
      n.body.setAllowGravity(true); n.setVelocity(this.player.facing * 280, -360); n.setData('nade', true);
      var self = this;
      this.time.delayedCall(900, function () { if (n.active) { self.explode(n.x, n.y); self.damageNearby(n.x, n.y, 90); self.cameras.main.shake(150, 0.025); n.disableBody(true, true); } });
    };

    // ---------- player hit / respawn ----------
    Scene.prototype.playerHit = function () {
      if (cheat.on || this.time.now < this.player.iframe) return;
      this.player.iframe = this.time.now + this.cfg.iframe;
      this.player.setVelocity(-this.player.facing * 160, -260);
      this.cameras.main.shake(160, 0.02); this.cameras.main.flash(80, 255, 80, 80);
      this.player.setTint(0xff8888);
      var self = this; this.time.delayedCall(this.cfg.iframe, function () { self.player.clearTint(); });
    };

    // ---------- FX ----------
    Scene.prototype.spawnSpark = function (x, y) {
      var em = this.add.particles(x, y, 'spark', { speed: { min: -150, max: 150 }, scale: { start: 0.6, end: 0 }, lifespan: 300, quantity: 6, emitting: false });
      em.explode(6, x, y); this.time.delayedCall(360, function () { em.destroy(); });
    };
    Scene.prototype.explode = function (x, y) {
      // sprite explosion aset (bila ada) + partikel
      if (this.useAsset.explosion && this.anims.exists('expl_anim')) {
        var sp = this.add.sprite(x, y, 'a_explosion').setDepth(5).setScale(0.7);
        sp.play('expl_anim'); sp.once('animationcomplete', function () { sp.destroy(); });
      }
      var em = this.add.particles(x, y, 'spark', { speed: { min: -260, max: 260 }, scale: { start: 1.0, end: 0 }, lifespan: 500, tint: [0xffe066, 0xe0563a], emitting: false });
      em.explode(18, x, y); this.time.delayedCall(560, function () { em.destroy(); });
      this.sfx.boom();
    };
    Scene.prototype.addScore = function (n) {
      if (cheat.on) return;                          // skor beku saat cheat
      this.score = (this.score || 0) + n;
      $('gw-score').textContent = ('000000' + this.score).slice(-6);
    };

    // ---------- BOSS ----------
    Scene.prototype.spawnBoss = function () {
      var GY = this.GROUND_Y;
      this.boss = this.physics.add.sprite(this.sectorWidth - 120, GY - 70, 'boss');
      this.boss.body.setAllowGravity(false); this.boss.body.setImmovable(true);
      this.boss.setData('hp', 60); this.boss.setData('maxhp', 60); this.boss.setData('phase', 1);
      this.boss.fireT = this.time.now + 1000;
      this.bossHpBg = this.add.rectangle(this.boss.x, this.boss.y - 80, 120, 8, 0x000000).setDepth(10);
      this.bossHp = this.add.rectangle(this.boss.x - 58, this.boss.y - 80, 116, 5, 0xe0563a).setOrigin(0, 0.5).setDepth(11);
      // mempelai tawanan
      this.brideSprite = this.physics.add.sprite(this.sectorWidth - 60, GY - 60, 'bride');
      this.brideSprite.body.setAllowGravity(false);
      this.cameras.main.setBounds(this.arenaX - 40, 0, this.sectorWidth - this.arenaX + 80, BH);
    };
    Scene.prototype.manualBossHits = function () {
      if (!this.boss || !this.boss.active) return;
      var self = this, bb = this.boss.getBounds();
      this.bullets.getChildren().forEach(function (b) {
        if (!b.active || !b.body) return;
        if (Phaser.Geom.Intersects.RectangleToRectangle(b.getBounds(), bb)) {
          b.disableBody(true, true);
          var hp = self.boss.getData('hp') - 1; self.boss.setData('hp', hp);
          self.boss.setAlpha(0.6); self.time.delayedCall(60, function () { if (self.boss) self.boss.setAlpha(1); });
          self.spawnSpark(b.x, b.y);
          var w = 116 * Math.max(0, hp / self.boss.getData('maxhp')); self.bossHp.width = w;
          // fase
          var ph = hp > 40 ? 1 : hp > 20 ? 2 : 3; self.boss.setData('phase', ph);
          if (hp <= 0) self.defeatBoss();
        }
      });
    };
    Scene.prototype.bossFire = function () {
      if (!this.boss || this.time.now < this.boss.fireT) return;
      var ph = this.boss.getData('phase');
      this.boss.fireT = this.time.now + (ph === 3 ? 700 : 1100);
      var p = this.player, bx = this.boss.x - 70, by = this.boss.y;
      var ang = Phaser.Math.Angle.Between(bx, by, p.x, p.y);
      var spread = [-0.18, 0, 0.18];
      for (var i = 0; i < spread.length; i++) {
        var eb = this.ebullets.get(bx, by, 'ebullet'); if (!eb) continue;
        eb.setActive(true).setVisible(true); eb.enableBody(true, bx, by, true, true); eb.body.setAllowGravity(false);
        var a = ang + spread[i]; eb.setVelocity(Math.cos(a) * this.cfg.eBullet, Math.sin(a) * this.cfg.eBullet);
      }
    };
    Scene.prototype.defeatBoss = function () {
      this.explode(this.boss.x, this.boss.y); this.cameras.main.shake(400, 0.04); this.cameras.main.flash(300, 255, 255, 200);
      this.boss.destroy(); if (this.bossHp) this.bossHp.destroy(); if (this.bossHpBg) this.bossHpBg.destroy();
      var self = this;
      this.time.delayedCall(600, function () { self.celebrate(); announceWin(); });
    };
    Scene.prototype.celebrate = function () {
      var cam = this.cameras.main; cam.flash(300, 255, 240, 180);
      var self = this;
      for (var k = 0; k < 6; k++) this.time.delayedCall(k * 280, function () {
        var sx = cam.scrollX + 80 + Math.random() * (BW - 160), sy = 80 + Math.random() * 220;
        var em = self.add.particles(sx, sy, 'spark', { speed: { min: -200, max: 200 }, scale: { start: 1, end: 0 }, lifespan: 700, tint: [0xffe066, 0xb7d64a, 0xe0563a], emitting: false });
        em.explode(20, sx, sy); self.time.delayedCall(760, function () { em.destroy(); });
      });
      this.sfx.win();
    };

    // ---------- UPDATE ----------
    Scene.prototype.update = function (time, delta) {
      var p = this.player, cam = this.cameras.main, GY = this.GROUND_Y;
      if (!p || !p.body) return;
      var edge = cam.scrollX + this.BW;

      // === SPAWN RELATIF-KAMERA: proses spawnList saat scroll mencapai trigger ===
      while (this._next < this.spawnList.length && edge >= this.spawnList[this._next].x) {
        var r = this.spawnList[this._next++];
        this.spawnEnemy(r.type, Math.max(r.x, edge), r.y, r.opts);
      }
      // despawn musuh keluar kiri
      this.enemies.getChildren().forEach(function (e) {
        if (e.active && e.body && e.getBounds().right < cam.scrollX - 64) e.disableBody(true, true);
      });
      // despawn peluru di tepi viewport (anti off-screen-kill)
      this.bullets.getChildren().forEach(function (b) {
        if (b.active && (b.x > edge + 20 || b.x < cam.scrollX - 20)) b.disableBody(true, true);
      });
      this.ebullets.getChildren().forEach(function (b) {
        if (b.active && (b.x > edge + 40 || b.x < cam.scrollX - 60 || b.y > GY + 40 || b.y < -40)) b.disableBody(true, true);
      });

      // === INPUT ===
      var left = this.cursors.left.isDown || this.keys.A.isDown || this.touchState.left;
      var right = this.cursors.right.isDown || this.keys.D.isDown || this.touchState.right;
      var down = this.cursors.down.isDown || this.keys.S.isDown || this.touchState.down;
      var jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W) || this._touchJump;
      this._touchJump = false;
      var onGround = p.body.blocked.down;

      // crouch resize on-state-change saja
      if (down && onGround && !p.prone) { p.prone = true; p.body.setSize(22, 22).setOffset(8, 20); p.setTexture('p_prone'); }
      else if ((!down || !onGround) && p.prone) { p.prone = false; p.body.setSize(22, 40).setOffset(8, 2); }

      if (left) { p.setVelocityX(p.prone ? 0 : -220); p.facing = -1; p.setFlipX(true); }
      else if (right) { p.setVelocityX(p.prone ? 0 : 220); p.facing = 1; p.setFlipX(false); }
      else p.setVelocityX(0);

      if (onGround) this._coyote = 100; else this._coyote = Math.max(0, (this._coyote || 0) - delta);
      if (jumpPressed && this._coyote > 0 && !p.prone) { p.setVelocityY(-470); this._coyote = 0; this.sfx.jump(); }
      if ((Phaser.Input.Keyboard.JustUp(this.cursors.up) || Phaser.Input.Keyboard.JustUp(this.keys.W)) && p.body.velocity.y < 0) p.setVelocityY(p.body.velocity.y * 0.5);

      // animasi state — pakai aset bila ada, else texture swap prosedural
      if (!p.prone) {
        if (this.useAsset.player_idle) {
          var firing = (this.cursors.space.isDown || this.keys.Z.isDown || this.keys.SPACE.isDown || this.touchState.fire);
          if (!onGround) { p.anims.stop(); p.setTexture('a_player_idle'); }
          else if (left || right) { if (this.anims.exists('p_run_anim')) p.anims.play('p_run_anim', true); else p.setTexture('a_player_run1'); }
          else if (firing && this.useAsset.player_shoot) { p.anims.stop(); p.setTexture('a_player_shoot'); }
          else { p.anims.stop(); p.setTexture('a_player_idle'); }
        } else {
          if (!onGround) p.setTexture('p_jump');
          else if (left || right) p.setTexture('p_run');
          else p.setTexture('p_idle');
        }
      }

      // fire
      if (this.cursors.space.isDown || this.keys.Z.isDown || this.keys.SPACE.isDown || this.touchState.fire) this.fire();

      // safe respawn point (mundur, aman) — update saat di tanah & tak ada musuh dekat
      if (onGround && p.x > p.lastSafeX) p.lastSafeX = Math.max(p.lastSafeX, p.x - 40);
      // jatuh jurang? (di sini tak ada jurang aktual; tapi guard kalau jatuh di bawah layar)
      if (p.y > GY + 200) { p.setPosition(Math.max(80, p.lastSafeX), GY - 80); p.setVelocity(0, 0); this.playerHit(); }

      // === MUSUH AI ===
      var self = this;
      this.enemies.getChildren().forEach(function (e) {
        if (!e.active) return;
        var type = e.getData('type');
        if (type === 'rush') { var sp = e.getData('slow') ? 50 : 130; e.setVelocityX(p.x < e.x ? -sp : sp); e.setFlipX(p.x < e.x);
          if (e.getData('asset') && self.anims.exists('e_run_anim')) e.anims.play('e_run_anim', true); }
        else if (type === 'range' || type === 'turret' || type === 'tank' || type === 'mortar') {
          if (type === 'tank') e.setVelocityX(-40);
          if (time > e.getData('fireT')) {
            e.setData('fireT', time + self.cfg.eInterval);
            var eb = self.ebullets.get(e.x, e.y - 6, 'ebullet');
            if (eb) { eb.setActive(true).setVisible(true); eb.enableBody(true, e.x, e.y - 6, true, true); eb.body.setAllowGravity(type === 'mortar');
              var ang = Phaser.Math.Angle.Between(e.x, e.y, p.x, p.y);
              if (type === 'mortar') eb.setVelocity(p.x < e.x ? -160 : 160, -300);
              else eb.setVelocity(Math.cos(ang) * self.cfg.eBullet, Math.sin(ang) * self.cfg.eBullet); }
          }
        } else if (type === 'drone') {
          e.y += Math.sin(time / 300 + e.x) * 0.5;
          if (time > e.getData('fireT')) { e.setData('fireT', time + self.cfg.eInterval * 1.3);
            var db = self.ebullets.get(e.x, e.y + 6, 'ebullet'); if (db) { db.setActive(true).setVisible(true); db.enableBody(true, e.x, e.y + 6, true, true); db.body.setAllowGravity(false); db.setVelocity(0, self.cfg.eBullet); } }
        }
      });

      // sweep anti-tunnel
      this.manualEnemyHits();

      // === BOSS walk-in ===
      if (this.isBossSector && !this.bossSpawned && p.x >= this.arenaX) { this.bossSpawned = true; this.spawnBoss(); }
      if (this.boss && this.boss.active) {
        this.boss.y = this.GROUND_Y - 70 + Math.sin(time / 400) * 8;        // bobbing
        if (this.bossHpBg) { this.bossHpBg.x = this.boss.x; this.bossHpBg.y = this.boss.y - 80; }
        if (this.bossHp) { this.bossHp.x = this.boss.x - 58; this.bossHp.y = this.boss.y - 80; }
        this.bossFire(); this.manualBossHits();
      }

      // === AREA CLEAR (non-boss) ===
      if (!this.isBossSector && !this.cleared && p.x >= this.areaClearX) {
        this.cleared = true; this.onAreaClear();
      }

      // HUD HP
      var hearts = cheat.on ? '∞' : (this.time.now < this.player.iframe ? '♥♥' : '♥♥♥');
      $('gw-hp').textContent = hearts;
      $('gw-sector').textContent = (this.sector + 1);
    };

    Scene.prototype.onAreaClear = function () {
      if (this.sector + 1 > STORE.maxSector) { STORE.maxSector = this.sector + 1; saveStore(STORE); }
      this.scene.pause();
      $('gw-clear-text').textContent = SECTOR_BIOMES[this.sector].name + ' selesai! Lanjut ke sektor ' + (this.sector + 2) + '.';
      showOverlay('gw-clear');
    };

    return Scene;
  }

  // ===== SFX sederhana (Web Audio) =====
  function makeSfx(scene) {
    var ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    function beep(freq, dur, type, vol) {
      if (!ctx) return;
      try { var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'square'; o.frequency.value = freq * (0.97 + Math.random() * 0.06);
        g.gain.value = vol || 0.04; o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + dur); } catch (e) {}
    }
    offs.push(function () { try { ctx && ctx.close(); } catch (e) {} });
    return {
      shoot: function () { beep(680, 0.05, 'square', 0.03); },
      boom: function () { beep(120, 0.18, 'sawtooth', 0.05); },
      jump: function () { beep(420, 0.08, 'square', 0.03); },
      win: function () { beep(660, 0.12); setTimeout(function () { beep(880, 0.18); }, 120); }
    };
  }

  // ===== BRIEFING & flow =====
  function showBriefing(idx) {
    $('gw-brief-title').textContent = 'SEKTOR ' + (idx + 1) + ' — ' + SECTOR_BIOMES[idx % SECTOR_BIOMES.length].name;
    $('gw-brief-text').textContent = idx === SECTOR_COUNT - 1 ? 'Markas musuh! Kalahkan benteng & selamatkan mempelai.' : 'Tembus medan, tembak amplop 💌 untuk kepingan undangan.';
    showOverlay('gw-briefing');
  }

  // ================= UI WIRING (di luar Phaser) =================
  function bindClick(id, fn) { var e = $(id); if (e) e.addEventListener('click', fn); }

  // cover difficulty pickers
  function wireDiff(containerId) {
    qa('#' + containerId + ' .gw-diff-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        qa('#' + containerId + ' .gw-diff-opt').forEach(function (x) { x.classList.remove('is-sel'); });
        b.classList.add('is-sel');
        STORE.difficulty = b.getAttribute('data-diff'); saveStore(STORE);
        // sinkronkan picker lain
        qa('.gw-diff-opt').forEach(function (x) { x.classList.toggle('is-sel', x.getAttribute('data-diff') === STORE.difficulty); });
      });
    });
  }
  wireDiff('gw-diff-cover'); wireDiff('gw-diff-stagesel');
  qa('.gw-diff-opt').forEach(function (x) { x.classList.toggle('is-sel', x.getAttribute('data-diff') === STORE.difficulty); });

  bindClick('gw-press-start', function () { startGame(0, STORE.difficulty); });
  bindClick('gw-brief-go', function () { hideOverlays(); if (GAME) { var sc = GAME.scene.getScene('main'); if (sc) sc.scene.resume(); } });
  bindClick('gw-clear-next', function () {
    hideOverlays();
    var sc = GAME && GAME.scene.getScene('main'); var next = (sc ? sc.sector : 0) + 1;
    if (next >= SECTOR_COUNT) { /* sudah ditangani boss */ startGame(SECTOR_COUNT - 1, STORE.difficulty); }
    else startGame(next, STORE.difficulty);
  });
  bindClick('gw-allpieces-open', function () { openFullReveal(); });
  bindClick('gw-allpieces-cont', function () { hideOverlays(); var sc = GAME && GAME.scene.getScene('main'); if (sc) sc.scene.resume(); });
  bindClick('gw-win-open', function () { openFullReveal(); });
  bindClick('gw-side-open', function () { if (refreshProgress() >= INFO_COUNT || cheat.on) openFullReveal(); else toast('Kumpulkan semua kepingan dulu, atau aktifkan ★ cheat.'); });
  bindClick('gw-open-btn', function () { if (!$('gw-open-btn').disabled) openFullReveal(); });
  bindClick('gw-reveal-close', closeReveal);
  bindClick('gw-modal-close', closePieceModal);
  bindClick('gw-modal-back', closePieceModal);

  bindClick('gw-cheat', toggleCheat);
  // #btn-toggle-music DIBIARKAN ke host (jangan tambah listener → anti double-toggle).

  // stage-select
  bindClick('gw-stagesel-btn', function () { openStageSelect(); });
  bindClick('gw-stagesel-close', function () { hideOverlays(); var sc = GAME && GAME.scene.getScene('main'); if (sc) sc.scene.resume(); });
  bindClick('gw-stagesel-ok', function () { hideOverlays(); startGame(pendingSel, STORE.difficulty); });
  var pendingSel = 0;
  function openStageSelect() {
    pendingSel = Math.min((GAME && GAME.scene.getScene('main') ? GAME.scene.getScene('main').sector : 0), STORE.maxSector);
    var grid = $('gw-stagegrid'); grid.innerHTML = '';
    function paint() { qa('.gw-stagecell').forEach(function (c) { c.classList.toggle('is-sel', +c.getAttribute('data-idx') === pendingSel); }); }
    for (var i = 0; i < SECTOR_COUNT; i++) (function (idx) {
      var unlocked = cheat.on || idx <= STORE.maxSector;
      var cell = document.createElement('div');
      cell.className = 'gw-stagecell' + (unlocked ? '' : ' is-locked');
      cell.setAttribute('data-idx', idx); cell.textContent = unlocked ? (idx + 1) : '🔒';
      if (unlocked) cell.addEventListener('click', function () { pendingSel = idx; paint(); });
      grid.appendChild(cell);
    })(i);
    paint();
    if (GAME) { var sc = GAME.scene.getScene('main'); if (sc) sc.scene.pause(); }
    showOverlay('gw-stagesel');
  }

  // reset
  bindClick('gw-reset', function () { showOverlay('gw-resetconfirm'); if (GAME) { var sc = GAME.scene.getScene('main'); if (sc) sc.scene.pause(); } });
  bindClick('gw-reset-no', function () { hideOverlays(); var sc = GAME && GAME.scene.getScene('main'); if (sc) sc.scene.resume(); });
  bindClick('gw-reset-yes', function () {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    STORE = { unlocked: {}, maxSector: 0, difficulty: 'normal', announcedAll: false, completed: false };
    cheat.on = false; $('gw-cheat').classList.remove('is-on');
    if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
    buildIndicators();
    qa('.gw-diff-opt').forEach(function (x) { x.classList.toggle('is-sel', x.getAttribute('data-diff') === 'normal'); });
    hideOverlays(); showOverlay('gw-cover-ov');
  });

  // ===== TOUCH controls =====
  function wireTouch() {
    var joy = $('gw-joy'), nub = $('gw-joy-nub');
    function setJoy(dx, dy) {
      var ts = GAME && GAME.scene.getScene('main') ? GAME.scene.getScene('main').touchState : null;
      if (!ts) return;
      ts.left = dx < -0.3; ts.right = dx > 0.3; ts.up = dy < -0.4; ts.down = dy > 0.4;
      nub.style.transform = 'translate(' + (dx * 24) + 'px,' + (dy * 24) + 'px)';
    }
    function joyMove(e) {
      var t = e.touches ? e.touches[0] : e; var r = joy.getBoundingClientRect();
      var dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
      dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy)); setJoy(dx, dy); e.preventDefault();
    }
    function joyEnd(e) { setJoy(0, 0); nub.style.transform = ''; e && e.preventDefault && e.preventDefault(); }
    if (joy) { joy.addEventListener('touchstart', joyMove, { passive: false }); joy.addEventListener('touchmove', joyMove, { passive: false }); joy.addEventListener('touchend', joyEnd); offs.push(function () { joy.removeEventListener('touchstart', joyMove); joy.removeEventListener('touchmove', joyMove); joy.removeEventListener('touchend', joyEnd); }); }
    function hold(id, prop) {
      var b = $(id); if (!b) return;
      function on(e) { var ts = GAME && GAME.scene.getScene('main') ? GAME.scene.getScene('main').touchState : null; if (ts) ts[prop] = true; if (prop === 'fire') {} e.preventDefault(); }
      function off(e) { var ts = GAME && GAME.scene.getScene('main') ? GAME.scene.getScene('main').touchState : null; if (ts) ts[prop] = false; e && e.preventDefault && e.preventDefault(); }
      b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off);
      offs.push(function () { b.removeEventListener('touchstart', on); b.removeEventListener('touchend', off); });
    }
    hold('gw-fire', 'fire');
    var jb = $('gw-jump'); if (jb) { var jf = function (e) { var sc = GAME && GAME.scene.getScene('main'); if (sc) sc._touchJump = true; e.preventDefault(); }; jb.addEventListener('touchstart', jf, { passive: false }); offs.push(function () { jb.removeEventListener('touchstart', jf); }); }
    var nb = $('gw-nade'); if (nb) { var nf = function (e) { var sc = GAME && GAME.scene.getScene('main'); if (sc) sc.throwNade(); e.preventDefault(); }; nb.addEventListener('touchstart', nf, { passive: false }); offs.push(function () { nb.removeEventListener('touchstart', nf); }); }
  }
  wireTouch();

  // X = granat (keyboard)
  addGlobal(window, 'keydown', function (e) {
    if (e.key === 'x' || e.key === 'X') { var sc = GAME && GAME.scene.getScene('main'); if (sc) sc.throwNade(); }
  });

  // ===== COUPLE CANVAS (panel kanan, Canvas 2D — bukan Phaser) =====
  function drawCouple() {
    var c = $('gw-couple-canvas'); if (!c || !c.getContext) return;
    var ctx = c.getContext('2d'), W = c.width, H = c.height;
    // sky sunset
    var grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#3a2a4a'); grad.addColorStop(0.6, '#e0a93a'); grad.addColorStop(1, '#6a4a2a');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // matahari
    ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.55, 30, 0, 7); ctx.fill();
    // gunung
    ctx.fillStyle = '#3a4a28'; ctx.beginPath(); ctx.moveTo(0, H * 0.7); ctx.lineTo(W * 0.3, H * 0.4); ctx.lineTo(W * 0.6, H * 0.72); ctx.lineTo(W, H * 0.45); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // palem
    ctx.fillStyle = '#1a2a10'; ctx.fillRect(W * 0.12, H * 0.5, 6, H * 0.4); ctx.beginPath(); ctx.arc(W * 0.13, H * 0.5, 22, 0, 7); ctx.fill();
    // sandbag
    ctx.fillStyle = '#6a5a3a'; for (var i = 0; i < 5; i++) ctx.fillRect(10 + i * 22, H - 30, 20, 14);
    // couple
    function person(x, suit) {
      ctx.fillStyle = suit ? '#2a2a3a' : '#f0e8f0'; ctx.fillRect(x - 9, H - 70, 18, 40);   // badan
      ctx.fillStyle = '#e0c28a'; ctx.fillRect(x - 6, H - 84, 12, 14);                        // kepala
      if (suit) { ctx.fillStyle = '#111'; ctx.fillRect(x - 2, H - 70, 4, 30); }              // dasi
      else { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - 7, H - 86, 14, 5); }                // rambut
    }
    person(W * 0.42, true); person(W * 0.58, false);
    // hati
    ctx.fillStyle = '#e0563a'; ctx.font = '20px serif'; ctx.fillText('♥', W * 0.5 - 8, H - 76);
    // banner
    ctx.fillStyle = '#b7d64a'; ctx.fillRect(W * 0.2, 12, W * 0.6, 24); ctx.fillStyle = '#0c120a';
    ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center'; ctx.fillText('JUST MARRIED', W * 0.5, 29);
    ctx.textAlign = 'left';
  }

  // ===== BOOT =====
  buildIndicators();
  drawCouple();
  syncMusicIcon();
  if (cheat.on) $('gw-cheat').classList.add('is-on');

  ensurePhaser(function () {
    // tampilkan cover; game boot saat PRESS START
    showOverlay('gw-cover-ov');
  });

  // ===== CLEANUP global =====
  window.__gwCleanup = function () {
    offs.forEach(function (o) { try { o(); } catch (e) {} }); offs.length = 0;
    if (window.__gwGame) { try { window.__gwGame.destroy(true); } catch (e) {} }
    window.__gwGame = null; window.__ms2 = null; window.__gwCleanup = null;
  };
})();
