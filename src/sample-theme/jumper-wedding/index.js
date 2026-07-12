/* ======================================================================
   JUMPER WEDDING — index.js  (Phaser 3.80.1 vertical jumper)
   Built from JUMPER_WEDDING_BIBLE.md (Tahap 2).

   Core: the GROOM auto-bounces UP a tower of one-way platforms, SEARCHING
   for his bride. Guest steers LEFT/RIGHT (keyboard / drag / tilt), h-wrap.
   Rings 💍 & hearts ❤️ = currency; thresholds unlock invitation pieces
   (dynamic to the real #inv-source sections).
   FINALE = Stage 3 altar where the bride waits (reunion → core invitation
   reveals). Stage 4-5 are OPTIONAL bonus (gallery/story/higher score).

   Host contract: window.__gwCleanup (idempotent), re-inject safe,
   music mirror only (never plays tenant backsound), submitRsvp/Ucapan
   with local fallback, ID host verbatim, {{#if}} wraps <section>.
   ====================================================================== */
(function () {
  'use strict';

  /* ---- 0. CLEANUP PREVIOUS RUN (host re-injects this script) ---- */
  if (typeof window.__gwCleanup === 'function') { try { window.__gwCleanup(); } catch (e) {} }
  var disposers = [];
  function addGlobal(t, type, fn, opt) { t.addEventListener(type, fn, opt); disposers.push(function () { try { t.removeEventListener(type, fn, opt); } catch (e) {} }); }

  /* ---- small DOM helpers ---- */
  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function on(el, ev, fn) { if (!el) return; el.addEventListener(ev, fn); disposers.push(function () { try { el.removeEventListener(ev, fn); } catch (e) {} }); }
  function show(el, yes) { if (el) el.style.display = yes ? '' : 'none'; }

  // read a rendered {{var}} via data-var (Bible §host binding). fallback if unresolved.
  function val(k, fb) {
    var el = document.querySelector('[data-var="' + k + '"]');
    var v = el ? (el.textContent || '').trim() : '';
    if (!v || v.indexOf('{{') === 0) return fb || '';
    return v;
  }

  /* ---- global copy helper for gift section (referenced by inline onclick) ---- */
  window.jwCopy = function (id, btn) {
    var el = $(id); if (!el) return;
    var txt = (el.textContent || '').trim();
    try {
      navigator.clipboard.writeText(txt);
    } catch (e) {
      var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) {} document.body.removeChild(ta);
    }
    if (btn) { var o = btn.textContent; btn.textContent = '✓ TERSALIN'; setTimeout(function () { btn.textContent = o; }, 1400); }
  };

  /* ====================================================================
     1. CONFIG & CONSTANTS
     ==================================================================== */
  var BW = 540, BH = 960;
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  var CFG = {
    GRAVITY_Y: 1400,
    BOUNCE: -820,
    SPRING: -1500,
    TRAMP: -1750,
    PROPELLER: -620, PROPELLER_MS: 2200,
    JETPACK: -900, JETPACK_MS: 2600,
    MOVE_X: 480,
    AIR_DRAG: 0.86,
    CONTROL_Y: BH - (isTouch ? 170 : 120),
    ZONE_BANDS: 12,           // 12 viewport-tall bands per zone
    ZONES: 5,
    CLIMAX_ZONE: 2,           // Stage 3 (0-based) = the bride is found here (main finale)
    CAM_ANCHOR: 0.62          // couple held at 62% of screen height
  };
  // apex reach of a normal bounce = v^2 / (2g)
  CFG.JUMP_REACH = (CFG.BOUNCE * CFG.BOUNCE) / (2 * CFG.GRAVITY_Y); // ~240

  var DIFF = {
    easy:   { gapMul: 0.72, minEnemies: 0, breakRatio: 0.12, moveRatio: 0.14, invulnMs: 1100, springFreq: 0.24 },
    normal: { gapMul: 0.82, minEnemies: 1, breakRatio: 0.24, moveRatio: 0.20, invulnMs: 900,  springFreq: 0.16 },
    hard:   { gapMul: 0.90, minEnemies: 2, breakRatio: 0.36, moveRatio: 0.28, invulnMs: 700,  springFreq: 0.10 }
  };

  var ZONE_META = [
    // Stage 1-3 = the search for the bride (climax at Stage 3). Stage 4-5 = optional bonus.
    { name: 'Taman Perkenalan', skyTop: 0x8fd3f0, skyBot: 0xd7f3e0, plat: 0x6bbf59, accent: 0xffd36b, bonus: false },
    { name: 'Langit Senja',      skyTop: 0xff9e6d, skyBot: 0xffd9a0, plat: 0xcf7a3a, accent: 0xffe08a, bonus: false },
    { name: 'Menara Pelaminan',  skyTop: 0xffcaa0, skyBot: 0xffe9c8, plat: 0xe6b84d, accent: 0xff8fb0, bonus: false },
    { name: 'Bonus · Awan Impian',  skyTop: 0x9ec9ff, skyBot: 0xe6f0ff, plat: 0xbfa8e6, accent: 0xfff0a0, bonus: true, hills: 0xbcd6ff },
    { name: 'Bonus · Malam Bintang', skyTop: 0x0e1636, skyBot: 0x2a2c5a, plat: 0x5a6bb0, accent: 0xffe066, bonus: true, night: true, hills: 0x232a52 }
  ];
  // per-zone extra atmosphere hints (day zones get a sun + rolling hills)
  ZONE_META[0].hills = 0x5fae54; ZONE_META[1].hills = 0xd98f52; ZONE_META[2].hills = 0xe0b060;

  var STORE_KEY = 'jw_wedding_v1';

  /* ====================================================================
     2. PERSISTENT STORE
     ==================================================================== */
  function defaults() {
    return { diff: 'easy', unlocked: [], maxZone: 0, best: 0, announcedAll: false, reunited: false, completed: false };
  }
  var STORE = loadStore();
  function loadStore() {
    try { var raw = localStorage.getItem(STORE_KEY); if (raw) { var o = JSON.parse(raw); var d = defaults(); for (var k in d) if (!(k in o)) o[k] = d[k]; return o; } } catch (e) {}
    return defaults();
  }
  function saveStore() { try { localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); } catch (e) {} }

  /* ====================================================================
     3. INVITATION SECTIONS — scan real #inv-source (dynamic pieces)
     ==================================================================== */
  var SECTION_TITLE = {
    hero: 'Pembuka', couple: 'Kedua Mempelai', rsvp: 'Konfirmasi Kehadiran',
    schedule: 'Waktu & Tempat', streaming: 'Live Streaming', story: 'Kisah Kami',
    gallery: 'Galeri', happiness: 'Berbagi Kebahagiaan', wishes: 'Ucapan & Doa',
    gift: 'Kado', closing: 'Penutup'
  };
  var SECTION_ICON = {
    hero: '💐', couple: '💑', rsvp: '✉️', schedule: '📅', streaming: '📺', story: '📖',
    gallery: '🖼️', happiness: '📸', wishes: '💬', gift: '🎁', closing: '🙏'
  };
  // core sections placed in early zones (Bible §6.5 / APPENDIX W)
  var CORE_FIRST = ['hero', 'schedule', 'rsvp'];
  // "nice-to-have" sections held back as BONUS — unlocked only if the guest keeps playing
  // the optional Stage 4-5 (they sort LAST, so their cumulative coin threshold is highest).
  // The core invitation (everything else) fully reveals at the Stage 3 reunion.
  var BONUS_LAST = ['gallery', 'story', 'happiness'];

  function scanSections() {
    var src = $('inv-source');
    var out = [];
    if (src) {
      qsa('section[data-info]', src).forEach(function (s) {
        var key = s.getAttribute('data-info');
        if (key) out.push(key);
      });
    }
    if (!out.length) out = ['hero', 'schedule', 'rsvp', 'wishes', 'closing']; // safety
    // order: core-first (early zones), then remaining core in DOM order, then BONUS sections last
    var core = [], mid = [], bonus = [];
    out.forEach(function (k) {
      if (CORE_FIRST.indexOf(k) >= 0) core.push(k);
      else if (BONUS_LAST.indexOf(k) >= 0) bonus.push(k);
      else mid.push(k);
    });
    core.sort(function (a, b) { return CORE_FIRST.indexOf(a) - CORE_FIRST.indexOf(b); });
    bonus.sort(function (a, b) { return BONUS_LAST.indexOf(a) - BONUS_LAST.indexOf(b); });
    return core.concat(mid).concat(bonus);
  }
  var SECTIONS = scanSections();        // e.g. ['hero','schedule','rsvp','couple',...,'gallery','story']
  var PIECE_COUNT = SECTIONS.length;
  // sections that make up the CORE invitation (revealed at the Stage 3 reunion); bonus excluded
  var CORE_SECTIONS = SECTIONS.filter(function (k) { return BONUS_LAST.indexOf(k) < 0; });
  var BONUS_SECTIONS = SECTIONS.filter(function (k) { return BONUS_LAST.indexOf(k) >= 0; });

  // cumulative currency threshold per piece i (Bible §X.2): piece i needs ~ (i+1)*base
  var BASE_PER_PIECE = 6;               // rings to open one piece (hearts worth 3 each)
  function thresholdFor(i) { return (i + 1) * BASE_PER_PIECE; }

  /* ====================================================================
     4. RUNTIME STATE
     ==================================================================== */
  var RUN = null;
  function freshRun() {
    return {
      coins: 0, score: 0, zone: 0, started: false, cheat: false,
      autoFly: false, climaxActive: false, highestY: 0, respawnY: 0
    };
  }
  RUN = freshRun();
  var cheat = { on: false };
  var pendingDiff = STORE.diff, pendingZone = 0;
  var GAME = null, SCENE = null;
  var sfxOn = true;

  /* ====================================================================
     5. HOST BRIDGE — music mirror (idempotent), rsvp/ucapan fallback
     ==================================================================== */
  var musicWanted = false, musicGen = 0;
  function hostMusicPlaying() {
    var pi = $('pause-icon');
    return !!(pi && pi.style.display !== 'none');
  }
  function syncMusic() {
    // click host toggle only if host state != our intent (avoid double-click bug)
    var btn = $('btn-toggle-music'); if (!btn) return;
    var gen = ++musicGen;
    function attempt(tries) {
      if (gen !== musicGen) return;
      if (hostMusicPlaying() !== musicWanted) {
        try { btn.click(); } catch (e) {}
        if (tries > 0) setTimeout(function () { attempt(tries - 1); }, 260);
      }
    }
    attempt(3);
  }
  function wantMusic(yes) { musicWanted = yes; syncMusic(); }

  function wireHostForms() {
    // RSVP + Ucapan buttons live in #inv-source; when cloned into reveal/modal, IDs stay verbatim.
    // We attach listeners on the LIVE reveal container after cloning (see openReveal()).
  }

  /* ====================================================================
     6. UI — overlays, HUD, indicators, toast
     ==================================================================== */
  function overlay(id, yes) {
    var el = $(id); if (!el) return;
    if (yes) el.classList.add('show'); else el.classList.remove('show');
    if (id === 'jw-toast') return;
    // any full-frame overlay coming up must let its own buttons receive taps, never the game
    // canvas beneath — disable stage pointers while a blocking overlay is shown. When the last
    // blocking overlay closes mid-run, hand pointers back to the canvas for drag-steer.
    if (yes) setStagePlayable(false);
    else if (RUN && RUN.started && !RUN.autoFly && !anyBlockingOverlayShown()) setStagePlayable(true);
  }
  function anyBlockingOverlayShown() {
    var ids = ['jw-cover', 'jw-loading', 'jw-briefing', 'jw-clear', 'jw-allpieces', 'jw-win', 'jw-zonesel', 'jw-resetconfirm'];
    for (var i = 0; i < ids.length; i++) { var e = $(ids[i]); if (e && e.classList.contains('show')) return true; }
    var rev = $('jw-reveal'); if (rev && rev.classList.contains('show')) return true;
    return false;
  }
  // toggle whether the Phaser canvas receives pointer events (drag-steer). Off unless actively
  // playing, so cover/briefing/overlay buttons are always tappable (fixes dead cover on live).
  function setStagePlayable(yes) {
    var st = $('gw-stage'); if (st) st.classList.toggle('is-playing', !!yes);
  }
  function hideAllOverlays() {
    ['jw-cover', 'jw-loading', 'jw-briefing', 'jw-clear', 'jw-allpieces', 'jw-win', 'jw-zonesel', 'jw-resetconfirm'].forEach(function (id) { overlay(id, false); });
  }
  var toastTimer = null;
  function toast(msg, danger, ms) {
    var el = $('jw-toast'); if (!el) return;
    el.innerHTML = msg;
    el.classList.toggle('danger', !!danger);
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 3500);
  }

  function fmtScore(n) { n = Math.max(0, Math.floor(n)); var s = '' + n; while (s.length < 6) s = '0' + s; return s; }
  // blend two 0xRRGGBB colors (used by backdrop)
  function mixHex(a, b, t) {
    var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
  }
  function updateHUD() {
    var s = $('jw-score'); if (s) s.textContent = fmtScore(RUN.score);
    var h = $('jw-height'); if (h) h.textContent = Math.floor(RUN.highestY / 20) + 'm';
    var z = $('jw-zone'); if (z) { var zm = ZONE_META[Math.min(RUN.zone, ZONE_META.length - 1)]; z.textContent = (zm && zm.bonus) ? 'B' + (RUN.zone - CFG.CLIMAX_ZONE) : (RUN.zone + 1); }
    var c = $('jw-coins'); if (c) c.textContent = RUN.coins;
    var pn = $('jw-progress-n'); if (pn) pn.textContent = STORE.unlocked.length;
    var pt = $('jw-progress-t'); if (pt) pt.textContent = PIECE_COUNT;
    var db = $('jw-diff-badge'); if (db) { db.textContent = STORE.diff.toUpperCase(); db.setAttribute('data-lvl', STORE.diff); }
  }

  function buildIndicators() {
    var inv = $('jw-inv'); if (!inv) return;
    inv.innerHTML = '';
    SECTIONS.forEach(function (key) {
      var b = document.createElement('div');
      b.className = 'jw-inv-item' + (STORE.unlocked.indexOf(key) >= 0 || cheat.on ? ' is-on' : '');
      b.setAttribute('data-key', key);
      b.title = SECTION_TITLE[key] || key;
      b.textContent = SECTION_ICON[key] || '💌';
      b.addEventListener('click', function () {
        if (STORE.unlocked.indexOf(key) >= 0 || cheat.on) openPieceModal(key);
      });
      inv.appendChild(b);
    });
    refreshIndicators();
  }
  function refreshIndicators() {
    qsa('#jw-inv .jw-inv-item').forEach(function (b) {
      var key = b.getAttribute('data-key');
      b.classList.toggle('is-on', STORE.unlocked.indexOf(key) >= 0 || cheat.on);
    });
    // the invitation opens once the CORE is collected (at the Stage 3 reunion) — bonus sections
    // may still be locked and simply appear dim in the reveal until earned in Stage 4-5.
    var viewBtn = $('jw-view-btn');
    if (viewBtn) viewBtn.classList.toggle('is-locked', !(coreUnlocked() || cheat.on));
  }
  function coreUnlocked() {
    for (var i = 0; i < CORE_SECTIONS.length; i++) if (STORE.unlocked.indexOf(CORE_SECTIONS[i]) < 0) return false;
    return CORE_SECTIONS.length > 0;
  }
  function allUnlocked() {
    for (var i = 0; i < SECTIONS.length; i++) if (STORE.unlocked.indexOf(SECTIONS[i]) < 0) return false;
    return SECTIONS.length > 0;
  }

  /* ---- piece unlock (currency threshold) ---- */
  function checkUnlocks() {
    // unlock sections in order as cumulative coins cross thresholds
    for (var i = 0; i < SECTIONS.length; i++) {
      var key = SECTIONS[i];
      if (STORE.unlocked.indexOf(key) < 0 && RUN.coins >= thresholdFor(i)) {
        unlockPiece(key, i);
      }
    }
  }
  function unlockPiece(key, i) {
    if (STORE.unlocked.indexOf(key) >= 0) return;
    STORE.unlocked.push(key);
    saveStore();
    refreshIndicators();
    updateHUD();
    var isBonus = BONUS_LAST.indexOf(key) >= 0;
    toast((isBonus ? '🎁 Bonus dibuka: <b>' : '💌 Kepingan dibuka: <b>') + (SECTION_TITLE[key] || key) + '</b>');
    if (SCENE) SCENE.juicePieceUnlock();
    // core complete → invitation is ready (the Stage 3 reunion drives the big celebration)
    if (coreUnlocked() && !STORE.announcedAll) announceAllPieces();
  }
  function unlockAll(silent) {
    SECTIONS.forEach(function (k) { if (STORE.unlocked.indexOf(k) < 0) STORE.unlocked.push(k); });
    saveStore(); refreshIndicators(); updateHUD();
    if (!silent && !STORE.announcedAll) announceAllPieces();
  }

  /* ====================================================================
     7. PIECE MODAL & FULL REVEAL (clone from #inv-source)
     ==================================================================== */
  function cloneSection(key) {
    var src = $('inv-source');
    if (!src) return null;
    var s = src.querySelector('section[data-info="' + key + '"]');
    return s ? s.cloneNode(true) : null;
  }
  // Host reads submitted values via container.querySelector('#<id>') = FIRST match in DOM.
  // #inv-source (hidden source) precedes the reveal/modal clones, so WITHOUT this the host
  // would read the empty hidden inputs. We keep host IDs on the VISIBLE clone only:
  //  - clone the sections (they inherit the IDs),
  //  - then strip host IDs from #inv-source so the clone is the sole match,
  //  - restore them when the invitation view is closed (so the next clone gets IDs again).
  var HOST_IDS = ['btn-submit-kehadiran', 'rsvp-status', 'rsvp-guests', 'rsvp-code', 'alert-submit-kehadiran',
    'btn-submit-ucapan', 'wish-name', 'wish-message', 'alert-submit-ucapan',
    'tm-countdown-days', 'tm-countdown-hours', 'tm-countdown-minutes', 'tm-countdown-seconds'];
  function setSourceHostIds(enabled) {
    var src = $('inv-source'); if (!src) return;
    HOST_IDS.forEach(function (id) {
      if (!enabled) {
        // strip id from ALL matches in the source (loop, not just the first)
        var els = src.querySelectorAll('#' + id);
        Array.prototype.forEach.call(els, function (el) { el.setAttribute('data-jwid', id); el.removeAttribute('id'); });
      } else {
        var els2 = src.querySelectorAll('[data-jwid="' + id + '"]');
        Array.prototype.forEach.call(els2, function (el) { el.setAttribute('id', id); el.removeAttribute('data-jwid'); });
      }
    });
  }

  function openPieceModal(key) {
    // close reveal first so only ONE clone with host IDs exists at a time
    closeReveal();
    var node = cloneSection(key); if (!node) return;   // clone carries host IDs
    setSourceHostIds(false);                            // strip IDs from #inv-source → clone is sole match
    var body = $('jw-modal-body'), title = $('jw-modal-title');
    if (title) title.textContent = '💌 ' + (SECTION_TITLE[key] || key);
    if (body) { body.innerHTML = ''; body.appendChild(node); wireClonedGallery(body); }
    overlay2('jw-modal-root', true);
  }
  function overlay2(id, yes) { var el = $(id); if (el) el.classList.toggle('show', yes); }
  function closePieceModal() { overlay2('jw-modal-root', false); clearClone($('jw-modal-body')); }

  function openReveal() {
    closePieceModal();
    var scroll = $('jw-reveal-scroll'), src = $('inv-source');
    if (!scroll || !src) return;
    scroll.innerHTML = '';
    // append all sections in DOM order (invitation reading order) — clones carry host IDs
    qsa('section[data-info]', src).forEach(function (s) { scroll.appendChild(s.cloneNode(true)); });
    setSourceHostIds(false);   // strip IDs from #inv-source so host reads the visible clone
    wireClonedGallery(scroll);
    var rev = $('jw-reveal'); if (rev) rev.classList.add('show');
    setStagePlayable(false);   // reveal covers the frame → game canvas must not eat taps
    wantMusic(true);   // opening invitation → intend music on
  }
  function closeReveal() {
    var rev = $('jw-reveal'); if (rev) rev.classList.remove('show');
    clearClone($('jw-reveal-scroll'));
    if (RUN && RUN.started && !RUN.autoFly) setStagePlayable(true);   // back to gameplay
  }
  // empty a clone container and restore host IDs to #inv-source (so a later clone gets them)
  function clearClone(container) {
    if (container) container.innerHTML = '';
    setSourceHostIds(true);
  }

  // (host wires submits via a document-level capture listener on #btn-submit-*; no per-clone
  //  listener needed. The theme relies on host globals being absent → host listener handles it.)
  function wireClonedForms() { /* no-op: host delegated listener reads the de-duplicated IDs */ }
  function wireClonedGallery(root) {
    qsa('.jw-gallery-item', root).forEach(function (item) {
      item.addEventListener('click', function () {
        var img = item.querySelector('img'); if (!img) return;
        var lb = $('jw-lightbox'), lbi = $('jw-lightbox-img');
        if (lbi) lbi.src = img.src; if (lb) lb.classList.add('show');
      });
    });
  }

  /* ====================================================================
     8. CELEBRATION (2 triggers, Bible APPENDIX D)
     ==================================================================== */
  function announceAllPieces() {
    STORE.announcedAll = true; saveStore();
    if (SCENE) SCENE.juiceCelebrate();
    setTimeout(function () {
      var t = $('jw-allpieces-text');
      if (t) t.innerHTML = 'Kepingan inti undangan <b>' + val('groom_nickname', 'Mempelai') + ' ♥ ' + val('bride_nickname', '') + '</b> telah terkumpul.<br>Undangan siap dibuka 💌';
      overlay('jw-allpieces', true);
    }, 3800);
  }
  // MAIN FINALE — the groom reaches the altar in Stage 3 and finds his bride.
  // The core invitation reveals here; Stage 4-5 remain as optional bonus.
  function announceReunion() {
    var wasReunited = STORE.reunited;
    STORE.reunited = true;
    // reveal the CORE invitation now (bonus sections stay locked until earned in Stage 4-5)
    CORE_SECTIONS.forEach(function (k) { if (STORE.unlocked.indexOf(k) < 0) STORE.unlocked.push(k); });
    STORE.announcedAll = true;
    saveStore(); refreshIndicators(); updateHUD();
    if (SCENE) SCENE.juiceCelebrate();
    setTimeout(function () {
      var t = $('jw-win-text');
      var hasBonus = BONUS_SECTIONS.length > 0;
      if (t) t.innerHTML = '<b>' + val('groom_nickname', 'Mempelai') + '</b> menemukan <b>' + val('bride_nickname', 'sang mempelai') + '</b> di pelaminan! 💍<br>Skor: ' + fmtScore(RUN.score) + ' · Tinggi: ' + Math.floor(RUN.highestY / 20) + 'm<br>Undangan kami sudah terbuka — silakan dibaca 💌' + (hasBonus ? '<br><small>Lanjut ke Stage bonus untuk membuka galeri & kisah kami ✨</small>' : '');
      // show a "continue bonus?" affordance only when bonus stages exist
      show($('jw-win-bonus'), hasBonus && RUN.zone < CFG.ZONES - 1);
      overlay('jw-win', true);
    }, wasReunited ? 800 : 4500);
  }
  // BONUS FINALE — guest completed the optional Stage 5 (all bonus pieces earned too).
  function announceWin() {
    STORE.completed = true; unlockAll(true); saveStore();
    refreshIndicators();
    if (SCENE) SCENE.juiceCelebrate();
    setTimeout(function () {
      var t = $('jw-win-text');
      if (t) t.innerHTML = '<b>' + val('groom_nickname', 'Mempelai') + ' ♥ ' + val('bride_nickname', '') + '</b> — semua bonus tuntas! 🎉<br>Skor: ' + fmtScore(RUN.score) + ' · Tinggi: ' + Math.floor(RUN.highestY / 20) + 'm<br>Happily ever after 💌';
      show($('jw-win-bonus'), false);
      overlay('jw-win', true);
    }, 4500);
  }

  /* ====================================================================
     9. PHASER SCENE
     ==================================================================== */
  function defineScene(P) {
    function GameScene() { P.Scene.call(this, { key: 'Game' }); }
    GameScene.prototype = Object.create(P.Scene.prototype);
    GameScene.prototype.constructor = GameScene;

    GameScene.prototype.create = function () {
      SCENE = this;
      var self = this;
      this.diffKey = STORE.diff;
      this.D = DIFF[this.diffKey] || DIFF.easy;
      buildTextures(this);

      // groups
      this.platforms = this.physics.add.group({ allowGravity: false, immovable: true });
      this.rings = this.physics.add.group({ allowGravity: false });
      this.hearts = this.physics.add.group({ allowGravity: false });
      this.powerups = this.physics.add.group({ allowGravity: false });
      this.enemies = this.physics.add.group({ allowGravity: false });
      this.bullets = this.physics.add.group({ allowGravity: false });

      // backdrop container (rebuilt per zone)
      this.bg = this.add.container(0, 0).setDepth(-50).setScrollFactor(0);
      this.parallax = [];

      // player (couple)
      this.couple = this.physics.add.sprite(BW / 2, CFG.CONTROL_Y - 40, 't_couple_fall');
      this.couple.body.setSize(46, 52);
      this.couple.setDepth(10);
      this.couple.body.velocity.y = CFG.BOUNCE;

      // one-way collider: bounce only when falling onto platform top
      this.physics.add.collider(this.couple, this.platforms, this.onLand, function (couple, plat) {
        return couple.body.velocity.y > 0 && couple.body.bottom <= plat.body.top + 12;
      }, this);

      // overlaps
      this.physics.add.overlap(this.couple, this.rings, this.grabRing, null, this);
      this.physics.add.overlap(this.couple, this.hearts, this.grabHeart, null, this);
      this.physics.add.overlap(this.couple, this.powerups, this.grabPowerup, null, this);
      this.physics.add.overlap(this.couple, this.enemies, this.touchEnemy, null, this);
      this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy, null, this);

      // camera one-way (manual)
      this.cameras.main.setBackgroundColor(0x8fd3f0);
      this.camScrollY = this.couple.y - BH * CFG.CAM_ANCHOR;
      this.cameras.main.scrollY = this.camScrollY;

      // input
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey('A');
      this.keyD = this.input.keyboard.addKey('D');
      this.keyFire = this.input.keyboard.addKey('SPACE');
      this.moveX = 0; this.firePressed = false;
      this.tilt = 0;
      this.setupInput();

      // state
      this.invulnUntil = 0;
      this.autoRiseUntil = 0; this.autoRiseVy = 0;
      this.shoesLeft = 0;
      this.shieldOn = false;
      this.autoFlyDist = 0;
      this.spawnList = [];      // sorted by triggerY (ascending world y going UP = decreasing)
      this._next = 0;
      this.zoneTopY = 0;        // y of current zone gate
      this.gateY = null; this.gate = null;
      this.climaxY = null; this.climaxActive = false; this.altar = null;
      this.altarY = null; this.brideSprite = null;

      this.buildZone(RUN.zone);

      // cleanup on shutdown
      this.events.once(P.Scenes.Events.SHUTDOWN, function () {
        try { self.time.removeAllEvents(); self.tweens.killAll(); self.input.keyboard.removeAllKeys(true); } catch (e) {}
      });

      // hide loading, show briefing (unless resuming mid-run)
      overlay('jw-loading', false);
      if (!RUN.started) { showBriefing(RUN.zone); }
      // fire the boot callback now that the scene is fully created (reliable across builds)
      if (typeof window.__jwBootCb === 'function') { var cb = window.__jwBootCb; window.__jwBootCb = null; try { cb(); } catch (e) {} }
    };

    GameScene.prototype.setupInput = function () {
      var self = this;
      // pointer drag steer (in stage area, above control zone)
      this.dragX = null;
      this.input.on('pointerdown', function (p) { self.dragX = p.x; });
      this.input.on('pointermove', function (p) {
        if (self.dragX == null) return;
        var dx = p.x - self.dragX;
        self.pointerMove = Math.max(-1, Math.min(1, dx / 60));
      });
      this.input.on('pointerup', function () { self.dragX = null; self.pointerMove = 0; });
      this.pointerMove = 0;
    };

    /* ---- procedural loop (frame-rate independent) ---- */
    GameScene.prototype.update = function (time, delta) {
      var dt = Math.min(delta, 40) / 1000;
      if (RUN.autoFly) { this.updateAutoFly(dt); return; }
      if (!RUN.started) { // hold couple gently while briefing shown
        this.couple.body.velocity.y = 0; this.couple.body.velocity.x = 0;
        return;
      }
      this.stepInput();
      // during the reunion, tweens own the couple — skip physics-driven player step
      if (!this._climaxLock) this.stepPlayer(dt);
      else this.updateShieldFx();
      this.stepCamera();
      this.stepSpawns();
      this.stepEnemies(dt);
      this.stepAnims(dt);
      this.stepBullets();
      this.stepCull();
      this.checkClimax();
      this.checkFall();
      updateHUD();
    };

    // frame-cycle + hover-bob for collectibles/powerups/enemies (no Phaser AnimationManager)
    GameScene.prototype.stepAnims = function (dt) {
      this._animClock = (this._animClock || 0) + dt;
      var clock = this._animClock;
      function drive(o) {
        if (!o.active) return;
        var an = o.getData('anim');
        if (an) { an.t += dt; var idx = Math.floor(an.t * an.fps) % an.frames.length; var key = an.frames[idx]; if (o.texture && o.texture.key !== key) o.setTexture(key); }
        var bob = o.getData('bob');
        if (bob) o.y = bob.base + Math.sin(clock * bob.w + bob.ph) * bob.amp;
      }
      this.rings.getChildren().forEach(drive);
      this.hearts.getChildren().forEach(drive);
      this.powerups.getChildren().forEach(drive);
      this.enemies.getChildren().forEach(function (e) { drive(e); });
    };

    GameScene.prototype.stepInput = function () {
      var mv = 0;
      if (this.cursors.left.isDown || this.keyA.isDown) mv -= 1;
      if (this.cursors.right.isDown || this.keyD.isDown) mv += 1;
      if (this.pointerMove) mv += this.pointerMove;
      if (this.tilt) mv += this.tilt;
      if (this.steerHold) mv += this.steerHold;
      this.moveX = Math.max(-1, Math.min(1, mv));
      // fire (keyboard)
      if (P.Input.Keyboard.JustDown(this.keyFire)) this.fire();
    };

    GameScene.prototype.stepPlayer = function (dt) {
      var b = this.couple.body;
      // horizontal
      if (this.moveX !== 0) b.velocity.x = this.moveX * CFG.MOVE_X;
      else b.velocity.x *= CFG.AIR_DRAG;
      // auto-rise powerup overrides vertical
      if (this.time.now < this.autoRiseUntil) {
        b.velocity.y = this.autoRiseVy;
        if (this._thrustEm) { this._thrustEm.setPosition(this.couple.x, this.couple.body.bottom - 4); this._thrustEm.emitting = true; }
      } else if (this._thrustEm) { this.stopThrustFx(); }
      // wrap horizontal
      var w = 30;
      if (this.couple.x < -w) this.couple.x = BW + w;
      else if (this.couple.x > BW + w) this.couple.x = -w;
      // pose by vertical velocity
      var vy = b.velocity.y;
      if (this.time.now < this.autoRiseUntil) this.setPose('launch');
      else if (vy < -60) this.setPose('rise');
      else if (vy > 60) this.setPose('fall');
      else this.setPose('apex');
      if (this.moveX < -0.05) this.couple.setFlipX(true); else if (this.moveX > 0.05) this.couple.setFlipX(false);
      // eased bank (lean smoothly toward steer, spring back) — banking up to ±14°
      // (skipped while a hurt-tumble tween owns the angle)
      if (!this._tumbling) {
        var targetAngle = this.moveX * 14;
        this._leanAngle = (this._leanAngle || 0) + (targetAngle - (this._leanAngle || 0)) * 0.2;
        this.couple.setAngle(this._leanAngle);
      }
      // velocity-based squash/stretch during flight (skip while a land-squash tween owns the scale)
      if (!this._squashing) {
        var stretch = Math.max(-1, Math.min(1, vy / 900));   // −1 fast up … +1 fast down
        var sy = 1 + Math.abs(stretch) * 0.16 * (vy < 0 ? 1 : 0.7);
        var sx = 1 - Math.abs(stretch) * 0.10;
        this.couple.setScale(sx, sy);
      }
      // shield bubble follows the couple
      this.updateShieldFx();
      // track highest
      var climbed = (this.startY0 || 0) - this.couple.y;
      if (climbed > RUN.highestY) { RUN.highestY = climbed; RUN.score = Math.max(RUN.score, Math.floor(climbed / 4)); }
    };

    // worn-shield bubble sprite that trails the couple while shield is active
    GameScene.prototype.updateShieldFx = function () {
      if (this.shieldOn) {
        if (!this._shieldFx) { this._shieldFx = this.add.image(this.couple.x, this.couple.y, 't_shieldbubble').setDepth(9).setAlpha(0.9); this.tweens.add({ targets: this._shieldFx, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); }
        this._shieldFx.x = this.couple.x; this._shieldFx.y = this.couple.y; this._shieldFx.setVisible(true);
      } else if (this._shieldFx) {
        this._shieldFx.setVisible(false);
      }
    };

    GameScene.prototype.setPose = function (st) {
      if (this._pose === st) return;
      this._pose = st;
      var key = 't_couple_' + st;
      if (this.textures.exists(key)) this.couple.setTexture(key);
    };

    GameScene.prototype.onLand = function (couple, plat) {
      var pk = plat.getData('kind');
      // already-spent platform (mid vanish/break tween) → no second bounce
      if (pk === 'broken' || pk === 'vanishing') return;
      var vy = CFG.BOUNCE;
      if (pk === 'break') this.breakPlatform(plat);        // brown: bounce then break
      else if (pk === 'white') this.vanishPlatform(plat);  // white: bounce then vanish
      // mounted powerup?
      var mounted = plat.getData('mount');
      if (mounted === 'spring') vy = CFG.SPRING;
      else if (mounted === 'tramp') vy = CFG.TRAMP;
      // spring-shoes: next few bounces are boosted
      if (this.shoesLeft > 0) { vy = Math.min(vy, CFG.SPRING); this.shoesLeft--; }
      couple.body.velocity.y = vy;
      var boosted = (vy <= CFG.SPRING);
      this.squashLand(boosted);
      this.dustPuff(couple.x, couple.body.bottom);            // dust kick at the feet
      this.platformDip(plat);                                 // platform reacts (dip + wobble)
      if (plat.getData('mount')) this.mountRecoil(plat);      // spring/tramp compresses
      this.playSfx(boosted ? 'spring' : 'bounce');
      // checkpoint: ONLY on solid platforms (green/blue) — white/brown vanish, so a checkpoint
      // there would respawn the couple into empty space.
      if (pk !== 'white' && pk !== 'break') RUN.respawnY = plat.y - 40;
      if (mounted === 'spring' || mounted === 'tramp') this.emitSpark(plat.x, plat.y, plat.getData('accent') || 0xffd36b);
    };

    // kill any active couple tween and clear transform-gate flags (so stepPlayer regains control
    // of scale/angle — otherwise killed tweens skip their onComplete and leave a flag stuck true)
    GameScene.prototype.resetCoupleTransforms = function () {
      this.tweens.killTweensOf(this.couple);
      this._squashing = false; this._tumbling = false; this._leanAngle = 0;
      this.couple.setScale(1, 1); this.couple.setAngle(0); this.couple.setAlpha(1);
    };
    GameScene.prototype.squashLand = function (boosted) {
      var c = this.couple, self = this;
      this._squashing = true;
      c.setScale(boosted ? 1.35 : 1.22, boosted ? 0.62 : 0.76);
      this.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: boosted ? 200 : 140, ease: 'Back.easeOut', onComplete: function () { self._squashing = false; } });
      this.cameras.main.shake(boosted ? 90 : 50, boosted ? 0.008 : 0.004);
    };
    GameScene.prototype.dustPuff = function (x, y) {
      if (!this.textures.exists('t_dust')) return;
      var em = this.add.particles(x, y, 't_dust', { speedX: { min: -70, max: 70 }, speedY: { min: -20, max: 10 }, scale: { start: 0.6, end: 0 }, alpha: { start: 0.7, end: 0 }, lifespan: 380, quantity: 5, emitting: false });
      em.explode(5, x, y); this.time.delayedCall(440, function () { em.destroy(); });
    };
    GameScene.prototype.platformDip = function (plat) {
      if (plat.getData('dipping') || !plat.active) return;
      plat.setData('dipping', true);
      var oy = plat.y;
      this.tweens.add({ targets: plat, y: oy + 4, duration: 70, yoyo: true, ease: 'Quad.easeOut', onComplete: function () { if (plat.active) plat.y = oy; plat.setData('dipping', false); } });
    };
    GameScene.prototype.mountRecoil = function (plat) {
      var badge = plat.getData('badge'); if (!badge) return;
      badge.setScale(1, 0.5);
      this.tweens.add({ targets: badge, scaleY: 1, duration: 220, ease: 'Back.easeOut' });
    };

    GameScene.prototype.breakPlatform = function (plat) {
      plat.setData('kind', 'broken');
      if (plat.body) plat.body.checkCollision.none = true;   // stop further landings immediately
      this.emitSpark(plat.x, plat.y, 0x9a6b3a);
      this.tweens.add({ targets: plat, alpha: 0, y: plat.y + 30, duration: 260, onComplete: function () { plat.disableBody(true, true); } });
    };
    GameScene.prototype.vanishPlatform = function (plat) {
      plat.setData('kind', 'vanishing');
      if (plat.body) plat.body.checkCollision.none = true;
      this.tweens.add({ targets: plat, alpha: 0, duration: 200, onComplete: function () { plat.disableBody(true, true); } });
    };

    /* ---- collectibles ---- */
    // detached decorative pop: sprite scales up + fades + drifts up where the item was grabbed
    GameScene.prototype.collectPop = function (x, y, texKey, tint) {
      if (!this.textures.exists(texKey)) return;
      var img = this.add.image(x, y, texKey).setDepth(11); if (tint != null) img.setTint(tint);
      this.tweens.add({ targets: img, scale: 1.9, alpha: 0, y: y - 34, duration: 340, ease: 'Cubic.easeOut', onComplete: function () { img.destroy(); } });
    };
    // rising "+N" score popup near the couple
    GameScene.prototype.floatScore = function (x, y, txt, color) {
      var t = this.add.text(x, y, txt, { fontFamily: '"Courier New",monospace', fontSize: '16px', fontStyle: 'bold', color: color || '#ffd36b', stroke: '#3a1a2a', strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: function () { t.destroy(); } });
    };
    GameScene.prototype.grabRing = function (couple, ring) {
      if (!ring.active) return;
      var x = ring.x, y = ring.y;
      ring.disableBody(true, true);
      RUN.coins += 1; RUN.score += 10;
      this.playSfx('ring'); this.emitSpark(x, y, 0xffd36b);
      this.collectPop(x, y, 't_ring'); this.floatScore(x, y - 8, '+1💍', '#ffd36b');
      checkUnlocks();
    };
    GameScene.prototype.grabHeart = function (couple, heart) {
      if (!heart.active) return;
      var x = heart.x, y = heart.y;
      heart.disableBody(true, true);
      RUN.coins += 3; RUN.score += 30;
      this.playSfx('heart'); this.emitSpark(x, y, 0xff6f9c);
      this.collectPop(x, y, 't_heart'); this.floatScore(x, y - 8, '+3❤️', '#ff9ac0');
      checkUnlocks();
    };
    GameScene.prototype.grabPowerup = function (couple, pu) {
      if (!pu.active) return;
      var kind = pu.getData('kind'), x = pu.x, y = pu.y;
      this.tweens.killTweensOf(pu);           // stop the idle spin tween before pooling
      pu.disableBody(true, true);
      this.playSfx('powerup');
      // pickup flash + pop on the couple
      this.cameras.main.flash(90, 255, 245, 210);
      this.emitSpark(couple.x, couple.y, 0xfff0a0);
      this.collectPop(x, y, 't_pu_' + kind);
      if (kind === 'spring') { couple.body.velocity.y = CFG.SPRING; }
      else if (kind === 'tramp') { couple.body.velocity.y = CFG.TRAMP; }
      else if (kind === 'springshoes') { this.shoesLeft = 5; toast('👟 Sepatu pegas!'); }
      else if (kind === 'propeller') { this.startAutoRise(CFG.PROPELLER, CFG.PROPELLER_MS); toast('🚁 Baling-baling!'); this.startThrustFx('propeller'); }
      else if (kind === 'jetpack') { this.startAutoRise(CFG.JETPACK, CFG.JETPACK_MS); toast('🚀 Jetpack!'); this.startThrustFx('jetpack'); }
      else if (kind === 'shield') { this.shieldOn = true; toast('🛡️ Perisai!'); }
    };
    // continuous thrust particles below the couple during propeller/jetpack auto-rise
    GameScene.prototype.startThrustFx = function (kind) {
      this.stopThrustFx();
      var col = kind === 'jetpack' ? 0xffb04d : 0xbfe8ff;
      var em = this.add.particles(0, 0, 't_dust', { speedY: { min: 120, max: 260 }, speedX: { min: -40, max: 40 }, scale: { start: kind === 'jetpack' ? 0.7 : 0.5, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: col, lifespan: 360, frequency: 30, blendMode: 'ADD' });
      em.setDepth(9);
      this._thrustEm = em; this._thrustKind = kind;
    };
    GameScene.prototype.stopThrustFx = function () { if (this._thrustEm) { this._thrustEm.destroy(); this._thrustEm = null; } };

    // auto-rise (propeller/jetpack): guarantee a catch platform at the apex so the couple
    // never drops into a dead zone when it ends (Bible §7 "always a safe platform at the end")
    GameScene.prototype.startAutoRise = function (vy, ms) {
      this.autoRiseUntil = this.time.now + ms;
      this.autoRiseVy = vy;
      var rise = Math.abs(vy) * (ms / 1000);           // distance travelled up
      var catchY = this.couple.y - rise + 30;          // just past the apex
      this.makePlatform({ kind: 'platform', type: 'green', x: BW / 2, y: catchY });
      // a couple of flanking platforms so a slight drift still lands safely
      this.makePlatform({ kind: 'platform', type: 'green', x: BW / 2 - 130, y: catchY - 40 });
      this.makePlatform({ kind: 'platform', type: 'green', x: BW / 2 + 130, y: catchY - 40 });
    };

    /* ---- enemies ---- */
    // detached spinning corpse that arcs away + fades (enemy already disabled)
    GameScene.prototype.enemyDefeat = function (x, y, texKey, dir) {
      var img = this.add.image(x, y, texKey).setDepth(8);
      this.tweens.add({ targets: img, angle: 360 * (dir || 1), y: y + 90, x: x + 40 * (dir || 1), alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 520, ease: 'Cubic.easeIn', onComplete: function () { img.destroy(); } });
      this.emitSpark(x, y, 0xffe066); this.emitSpark(x, y, 0xff9ac0);
    };
    GameScene.prototype.enemyHitFlash = function (enemy) {
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(70, function () { if (enemy.active) enemy.clearTint(); });
      // brief squash flinch (no permanent bob drift)
      this.tweens.add({ targets: enemy, scaleX: 1.15, scaleY: 0.9, duration: 80, yoyo: true });
    };
    GameScene.prototype.touchEnemy = function (couple, enemy) {
      if (!enemy.active) return;
      var stompable = enemy.getData('stompable');
      // stomp from above
      if (stompable && couple.body.velocity.y > 0 && couple.body.bottom <= enemy.body.top + 18) {
        var ex = enemy.x, ey = enemy.y, tk = enemy.texture.key;
        enemy.disableBody(true, true);
        couple.body.velocity.y = CFG.BOUNCE;
        RUN.score += 50; this.playSfx('pop');
        this.enemyDefeat(ex, ey, tk, couple.x < ex ? 1 : -1);
        this.floatScore(ex, ey - 10, '+50', '#ffe066');
        this.squashLand(false);                 // bounce squash off the enemy's head
        this.cameras.main.shake(60, 0.006);
        return;
      }
      // else hurt
      if (this.time.now < this.invulnUntil || cheat.on) return;
      if (this.shieldOn) { this.shieldOn = false; this.invulnUntil = this.time.now + 700; toast('🛡️ Perisai menahan!'); this.emitSpark(couple.x, couple.y, 0x8fd3f0); this.updateShieldFx(); return; }
      this.invulnUntil = this.time.now + this.D.invulnMs;
      couple.body.velocity.y = CFG.BOUNCE * 0.6;
      couple.body.velocity.x = (couple.x < enemy.x ? -1 : 1) * 260;
      this.cameras.main.shake(140, 0.014);
      this.cameras.main.flash(120, 255, 90, 90);   // red hit flash
      this.hurtBlink();
      this.playSfx('hurt');
    };
    GameScene.prototype.hurtBlink = function () {
      var c = this.couple, self = this; this.setPose('hurt');
      // spin-tumble knockback + blink
      this._tumbling = true; this._leanAngle = 0;
      this.tweens.add({ targets: c, angle: (c.flipX ? 1 : -1) * 340, duration: 520, ease: 'Cubic.easeOut', onComplete: function () { c.setAngle(0); self._tumbling = false; } });
      this.tweens.add({ targets: c, alpha: 0.3, duration: 90, yoyo: true, repeat: 4, onComplete: function () { c.alpha = 1; } });
    };

    GameScene.prototype.bulletHitEnemy = function (bullet, enemy) {
      if (!bullet.active || !enemy.active) return;
      var bx = bullet.x, by = bullet.y;
      bullet.disableBody(true, true);
      this.emitSpark(bx, by, 0xff9ac0);            // impact spark
      var hp = (enemy.getData('hp') || 1) - 1;
      enemy.setData('hp', hp);
      if (hp <= 0) {
        var ex = enemy.x, ey = enemy.y, tk = enemy.texture.key;
        enemy.disableBody(true, true); RUN.score += 40; this.playSfx('pop');
        this.enemyDefeat(ex, ey, tk, 1); this.floatScore(ex, ey - 10, '+40', '#ffe066');
      } else {
        this.enemyHitFlash(enemy);                 // non-lethal flinch/flash
      }
    };

    GameScene.prototype.fire = function () {
      var b = this.bullets.get(this.couple.x, this.couple.y - 20, 't_bullet');
      if (!b) return;
      b.setActive(true).setVisible(true);
      if (b.body) { b.body.enable = true; b.body.setVelocity(0, -640); b.body.setAllowGravity(false); }
      b.setData('born', this.time.now);
      this.emitSpark(this.couple.x, this.couple.y - 18, 0xff9ac0);   // muzzle flash
      this.playSfx('shoot');
    };

    GameScene.prototype.stepBullets = function () {
      var cam = this.cameras.main, self = this;
      this.bullets.getChildren().forEach(function (b) {
        if (!b.active) return;
        if (b.y < cam.scrollY - 16 || (self.time.now - (b.getData('born') || 0)) > 1000) b.disableBody(true, true);
      });
    };

    /* ---- camera one-way to top ---- */
    GameScene.prototype.stepCamera = function () {
      var target = this.couple.y - BH * CFG.CAM_ANCHOR;
      if (target < this.camScrollY) this.camScrollY += (target - this.camScrollY) * 0.16;
      this.cameras.main.scrollY = this.camScrollY;
      // parallax follow (+ horizontal drift, wrap, gentle sway)
      var t = this._animClock || 0;
      for (var i = 0; i < this.parallax.length; i++) {
        var p = this.parallax[i];
        // vertical: tile within [−BH, BH] so a few objects cover the whole climb
        var yy = (p.baseY - this.camScrollY * p.factor);
        yy = ((yy % (BH * 2)) + (BH * 2)) % (BH * 2) - BH * 0.5;
        p.obj.y = yy;
        if (p.drift) {
          var xx = (p.baseX + t * p.drift);
          xx = ((xx % (BW + 120)) + (BW + 120)) % (BW + 120) - 60;
          p.obj.x = xx + Math.sin(t * 0.6 + (p.ph || 0)) * 3;
        }
      }
      // star twinkle
      if (this._stars) this._stars.setAlpha(0.7 + Math.sin(t * 2) * 0.25);
    };

    /* ---- spawn relative to camera-Y (Bible §5.2) ---- */
    GameScene.prototype.stepSpawns = function () {
      var topEdge = this.camScrollY;    // top of viewport (world-y)
      while (this._next < this.spawnList.length && topEdge <= this.spawnList[this._next].triggerY) {
        this.spawnRecord(this.spawnList[this._next++]);
      }
    };

    GameScene.prototype.spawnRecord = function (r) {
      if (r.kind === 'platform') this.makePlatform(r);
      else if (r.kind === 'ring') this.makeRing(r.x, r.y);
      else if (r.kind === 'heart') this.makeHeart(r.x, r.y);
      else if (r.kind === 'powerup') this.makePowerup(r.x, r.y, r.type);
      else if (r.kind === 'enemy') this.makeEnemy(r.x, r.y, r.type);
    };

    GameScene.prototype.makePlatform = function (r) {
      var tex = 't_plat_' + (r.type || 'green');
      var p = this.platforms.create(r.x, r.y, tex);
      p.body.setImmovable(true); p.body.setAllowGravity(false);
      p.setData('kind', r.type === 'brown' ? 'break' : (r.type === 'white' ? 'white' : 'solid'));
      p.setData('accent', 0xffd36b);
      p.body.setSize(84, 18); p.body.setOffset(0, 2);
      if (r.type === 'blue') {
        // horizontal mover
        var spd = (this.diffKey === 'hard' ? 130 : this.diffKey === 'normal' ? 100 : 70);
        p.setData('vx', (r.dir || 1) * spd);
      }
      if (r.mount) { p.setData('mount', r.mount); this.mountBadge(p, r.mount); }
      return p;
    };
    GameScene.prototype.mountBadge = function (p, kind) {
      var tex = kind === 'spring' ? 't_spring' : 't_tramp';
      var badge = this.add.image(p.x, p.y - 14, tex).setDepth(9);
      p.setData('badge', badge);
    };

    GameScene.prototype.makeRing = function (x, y) {
      var r = this.rings.create(x, y, 't_ring'); r.body.setAllowGravity(false);
      r.setData('anim', { frames: ['t_ring', 't_ring1', 't_ring2', 't_ring3'], fps: 8, t: Math.random() });  // spin
      r.setData('bob', { base: y, amp: 5, w: 2.4, ph: Math.random() * 6 });
      return r;
    };
    GameScene.prototype.makeHeart = function (x, y) {
      var h = this.hearts.create(x, y, 't_heart'); h.body.setAllowGravity(false);
      h.setData('anim', { frames: ['t_heart', 't_heart1', 't_heart', 't_heart2'], fps: 6, t: Math.random() }); // pulse
      h.setData('bob', { base: y, amp: 6, w: 2.0, ph: Math.random() * 6 });
      return h;
    };
    GameScene.prototype.makePowerup = function (x, y, type) {
      var pu = this.powerups.create(x, y, 't_pu_' + type); pu.body.setAllowGravity(false); pu.setData('kind', type);
      pu.setData('bob', { base: y, amp: 5, w: 2.6, ph: Math.random() * 6 });
      this.tweens.add({ targets: pu, angle: type === 'propeller' ? 0 : 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return pu;
    };
    GameScene.prototype.makeEnemy = function (x, y, type) {
      var e = this.enemies.create(x, y, 't_enemy_' + type);
      e.body.setAllowGravity(false);
      e.setData('type', type);
      e.setData('stompable', type === 'bee' || type === 'bird');
      e.setData('hp', type === 'ufo' ? 3 : 1);
      if (type === 'bee') { e.setData('vx', (Math.random() < 0.5 ? -1 : 1) * 60); e.setData('x0', x); e.setData('range', 90); }
      // idle animations + hover bob
      if (type === 'bee') e.setData('anim', { frames: ['t_enemy_bee', 't_enemy_bee1'], fps: 14, t: 0 });
      else if (type === 'bird') e.setData('anim', { frames: ['t_enemy_bird', 't_enemy_bird1'], fps: 7, t: 0 });
      else if (type === 'stormcloud') e.setData('anim', { frames: ['t_enemy_stormcloud', 't_enemy_stormcloud', 't_enemy_stormcloud1'], fps: 2.5, t: 0 });
      else if (type === 'ufo') e.setData('anim', { frames: ['t_enemy_ufo', 't_enemy_ufo1'], fps: 4, t: 0 });
      if (type !== 'bee') e.setData('bob', { base: y, amp: type === 'ufo' ? 10 : 7, w: type === 'ufo' ? 1.6 : 2.8, ph: Math.random() * 6 });
      return e;
    };

    GameScene.prototype.stepEnemies = function (dt) {
      this.platforms.getChildren().forEach(function (p) {
        var vx = p.getData('vx'); if (!vx) return;
        p.x += vx * dt;
        if (p.x < 60 || p.x > BW - 60) { p.setData('vx', -vx); }
        var badge = p.getData('badge'); if (badge) badge.x = p.x;
      });
      this.enemies.getChildren().forEach(function (e) {
        if (!e.active) return;
        var vx = e.getData('vx');
        if (vx) {
          e.x += vx * dt;
          var x0 = e.getData('x0'), range = e.getData('range');
          if (Math.abs(e.x - x0) > range) e.setData('vx', -vx);
        }
      });
    };

    GameScene.prototype.stepCull = function () {
      // cull well BELOW the fall-out line (camScrollY+BH+40) + past the respawn point, so the
      // checkpoint platform is never disabled out from under a respawn while the camera is frozen.
      var cam = this.cameras.main, botEdge = cam.scrollY + BH + 400;
      var keepY = (RUN.respawnY || 0) + 120;   // don't cull near the current checkpoint
      function cull(group) {
        group.getChildren().forEach(function (o) {
          if (o.active && o.y > botEdge && o.y > keepY) {
            var badge = o.getData && o.getData('badge'); if (badge) badge.destroy();
            o.disableBody(true, true);
          }
        });
      }
      cull(this.platforms); cull(this.rings); cull(this.hearts); cull(this.powerups); cull(this.enemies);
    };

    GameScene.prototype.checkFall = function () {
      if (cheat.on) { // never fall while cheat
        if (this.couple.y > this.camScrollY + BH) { this.couple.y = RUN.respawnY || (this.camScrollY + BH * 0.5); this.couple.body.velocity.y = CFG.BOUNCE; }
        return;
      }
      if (this.couple.y > this.camScrollY + BH + 40) {
        // fall out bottom → respawn to last safe checkpoint (Bible §8/§12)
        var ry = RUN.respawnY || (this.camScrollY + BH * 0.4);
        this.couple.y = Math.min(ry, this.camScrollY + BH * 0.5);
        this.couple.x = BW / 2;
        this.couple.body.velocity.y = CFG.BOUNCE;
        this.invulnUntil = this.time.now + 1000;   // brief invuln after respawn
        toast('Ups! Terpelanting — coba lagi 💪', true, 2200);
      }
    };

    /* ---- climax (Stage 3 altar: groom finds the bride) ---- */
    GameScene.prototype.checkClimax = function () {
      if (this.climaxY == null || this.climaxActive) return;
      if (this.couple.y <= this.climaxY) this.activateClimax();
    };
    GameScene.prototype.activateClimax = function () {
      this.climaxActive = true;
      var self = this, ax = BW / 2, ay = this.altarY != null ? this.altarY : (this.climaxY - 40);
      // altar fades + scales in with a bloom
      if (this.altar) { this.altar.setScale(0.8); this.tweens.add({ targets: this.altar, alpha: 1, scaleX: 1, scaleY: 1, duration: 600, ease: 'Back.Out' }); }
      // groom celebrate: settle near the altar, arms-up pose, gentle hop
      this._climaxLock = true; this.setPose('celebrate');
      this.couple.body.velocity.set(0, 0); this.couple.body.setAllowGravity(false);
      this.tweens.add({ targets: this.couple, x: ax + 22, y: ay + 4, angle: 0, scaleX: 1, scaleY: 1, duration: 500, ease: 'Sine.easeInOut', onComplete: function () {
        self.tweens.add({ targets: self.couple, y: ay - 6, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });   // joyful bob
      } });
      this.showBrideAtAltar();
      // ring of petals + confetti around the couple
      this.petalBurst(ax, ay);
      this.juiceCelebrate();
      // slow zoom-in punch on the altar
      var cam = this.cameras.main;
      this.tweens.add({ targets: cam, zoom: 1.12, duration: 700, yoyo: true, hold: 600, ease: 'Sine.easeInOut' });
      announceReunion();
      // Stage 3 is not a dead end: a gate above the altar lets the guest fly on to the bonus.
    };
    GameScene.prototype.showBrideAtAltar = function () {
      if (this.brideSprite || this.climaxY == null) return;
      var self = this, ax = BW / 2, ay = this.altarY != null ? this.altarY : (this.climaxY - 40);
      // bride walks in from the left of the altar and rises with a bounce
      var b = this.add.image(ax - 80, ay + 4, 't_bride').setDepth(11).setAlpha(0);
      this.brideSprite = b;
      this.tweens.add({ targets: b, x: ax - 26, alpha: 1, duration: 600, ease: 'Sine.easeOut', onComplete: function () {
        self.tweens.add({ targets: b, y: ay - 4, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });   // sway
      } });
      // hearts float up between the two
      this.emitSpark(ax, ay - 20, 0xff6f9c);
      for (var i = 0; i < 4; i++) (function (i) { self.time.delayedCall(300 + i * 220, function () { self.floatScore(ax + (i % 2 ? 10 : -10), ay - 10, '❤', '#ff9ac0'); }); })(i);
    };
    // burst of petals + sparkles radiating from a point (used at reunion)
    GameScene.prototype.petalBurst = function (x, y) {
      if (this.textures.exists('t_petal')) { var pe = this.add.particles(x, y, 't_petal', { speed: { min: 60, max: 220 }, angle: { min: 200, max: 340 }, gravityY: 260, scale: { start: 1, end: 0.4 }, rotate: { min: 0, max: 360 }, alpha: { start: 1, end: 0 }, lifespan: 1400, quantity: 24, emitting: false }); pe.explode(24, x, y); this.time.delayedCall(1600, function () { pe.destroy(); }); }
      if (this.textures.exists('t_star4')) { var se = this.add.particles(x, y - 20, 't_star4', { speed: { min: 40, max: 160 }, scale: { start: 1, end: 0 }, lifespan: 900, quantity: 16, emitting: false, blendMode: 'ADD' }); se.explode(16, x, y - 20); this.time.delayedCall(1000, function () { se.destroy(); }); }
    };

    /* ---- zone build ---- */
    GameScene.prototype.buildZone = function (zoneIdx) {
      RUN.zone = zoneIdx;
      var meta = ZONE_META[Math.min(zoneIdx, ZONE_META.length - 1)];
      this.buildBackdrop(meta);
      // clear world
      [this.platforms, this.rings, this.hearts, this.powerups, this.enemies, this.bullets].forEach(function (g) { g.clear(true, true); });
      this.spawnList = []; this._next = 0;
      // reset per-zone transition state + destroy leftover gate/altar/bride images (else stale
      // gateY fires reachGate in the final zone, or images leak/overlap across zones)
      this.gateY = null; this.climaxY = null; this.climaxActive = false; this.altarY = null;
      if (this.gate) { try { this.gate.destroy(); } catch (e) {} this.gate = null; }
      if (this.altar) { try { this.altar.destroy(); } catch (e) {} this.altar = null; }
      if (this.brideSprite) { try { this.brideSprite.destroy(); } catch (e) {} this.brideSprite = null; }
      // release any reunion lock + restore couple physics/transform flags (replay into fresh zone)
      this.resetCoupleTransforms();
      if (this.couple.body) this.couple.body.setAllowGravity(true);
      this._climaxLock = false;
      this.stopThrustFx();
      // powerup states start fresh each stage (no carry-over of shield/shoes/auto-rise)
      this.shieldOn = false; this.shoesLeft = 0; this.autoRiseUntil = 0;
      if (this._shieldFx) this._shieldFx.setVisible(false);
      RUN.autoFly = false; this.autoFlyDist = 0;

      // couple start
      var startY = this.couple.y;
      this.startY0 = startY;
      RUN.respawnY = startY - 40;
      this.camScrollY = startY - BH * CFG.CAM_ANCHOR;
      this.cameras.main.scrollY = this.camScrollY;

      // generate spawn records upward
      this.generateZone(zoneIdx, startY, meta);

      // spawn the first band immediately (so couple has ground under it)
      this.stepSpawns();
      // ensure an immediate platform under couple
      this.makePlatform({ kind: 'platform', type: 'green', x: BW / 2, y: startY + 60 });
    };

    GameScene.prototype.generateZone = function (zoneIdx, startY, meta) {
      var D = this.D;
      var reach = CFG.JUMP_REACH * D.gapMul;
      var y = startY - 30;
      var endY = startY - CFG.ZONE_BANDS * BH;   // top of zone
      var records = [];
      var bandCount = 0, lastX = BW / 2;
      var isClimaxZone = (zoneIdx === CFG.CLIMAX_ZONE);   // Stage 3 = groom finds the bride
      var safeBands = 1;

      var chainSame = 0, lastType = 'green';
      while (y > endY) {
        // choose platform type by ratios (Bible §3.3)
        var type = 'green';
        var isSafe = (bandCount < safeBands);
        if (!isSafe) {
          var rnd = Math.random();
          if (rnd < D.moveRatio) type = 'blue';
          else if (rnd < D.moveRatio + D.breakRatio * 0.6) type = 'brown';
          else if (rnd < D.moveRatio + D.breakRatio) type = 'white';
          else type = 'green';
        }
        // chain rule: no >3 hard-ish in a row
        if ((type === 'brown' || type === 'white' || type === 'blue') && type === lastType) {
          chainSame++; if (chainSame >= 3) { type = 'green'; chainSame = 0; }
        } else chainSame = 0;
        lastType = type;

        // horizontal position: keep within reach, vary
        var nx = 60 + Math.random() * (BW - 120);
        lastX = nx;
        var rec = { kind: 'platform', type: type, x: nx, y: y, triggerY: y, dir: (Math.random() < 0.5 ? -1 : 1) };

        // mount spring/tramp occasionally (relevance: before wider gap)
        if (!isSafe && Math.random() < D.springFreq) rec.mount = (Math.random() < 0.6 ? 'spring' : 'tramp');
        records.push(rec);

        // rings trail on/around platform (reward cadence)
        if (Math.random() < 0.7) records.push({ kind: 'ring', x: nx, y: y - 26, triggerY: y - 26 });
        if (Math.random() < 0.28) records.push({ kind: 'ring', x: nx + (Math.random() < 0.5 ? -50 : 50), y: y - 50, triggerY: y - 50 });
        // heart on a branch occasionally
        if (!isSafe && Math.random() < 0.14) records.push({ kind: 'heart', x: (nx < BW / 2 ? nx + 120 : nx - 120), y: y - 40, triggerY: y - 40 });

        // powerup occasionally (relevance: standalone floating)
        if (!isSafe && Math.random() < 0.05) {
          var pk = ['springshoes', 'propeller', 'jetpack', 'shield'][Math.floor(Math.random() * 4)];
          records.push({ kind: 'powerup', x: nx, y: y - 46, triggerY: y - 46, type: pk });
        }

        // enemy (zone tempur) — minEnemies floor via probability + guarantee
        if (!isSafe && zoneIdx >= 1) {
          var etypes = ['bee', 'bird'];
          if (zoneIdx >= 2) etypes.push('stormcloud');
          if (zoneIdx >= 3) etypes.push('ufo');
          var eProb = (D.minEnemies === 0 ? 0.06 : D.minEnemies === 1 ? 0.14 : 0.22);
          if (Math.random() < eProb) {
            var et = etypes[Math.floor(Math.random() * etypes.length)];
            records.push({ kind: 'enemy', x: 60 + Math.random() * (BW - 120), y: y - 80, triggerY: y - 80, type: et });
          }
        }

        // next band step (vertical gap ≤ reach)
        var gap = reach * (0.6 + Math.random() * 0.4);
        y -= gap;
        bandCount = Math.floor((startY - y) / BH);
      }

      // gate / altar at top
      this.zoneTopY = endY;
      if (isClimaxZone) {
        // Stage 3 climax: altar platform where the bride waits (groom reaches it = reunion).
        var altarPlatY = endY + BH * 0.35;
        this.climaxY = endY + BH * 0.5;   // reunion fires just before the altar platform
        this.altarY = altarPlatY - 30;    // bride/altar image sits on the platform
        records.push({ kind: 'platform', type: 'green', x: BW / 2, y: altarPlatY, triggerY: endY + BH * 0.6 });
        var altar = this.add.image(BW / 2, this.altarY, 't_altar').setDepth(5).setAlpha(0);
        this.altar = altar;
        // NOT a dead end: a gate higher up lets the guest OPTIONALLY continue to the bonus.
        this.gateY = endY + BH * 0.12;
        var cgate = this.add.image(BW / 2, this.gateY, 't_gate').setDepth(5).setAlpha(0.85);
        this.gate = cgate;
        // a couple of catch platforms between altar and bonus gate (keep it reachable)
        records.push({ kind: 'platform', type: 'green', x: BW * 0.32, y: endY + BH * 0.24, triggerY: endY + BH * 0.3 });
        records.push({ kind: 'platform', type: 'green', x: BW * 0.68, y: endY + BH * 0.18, triggerY: endY + BH * 0.24 });
      } else {
        // gate marker (visual); crossing top → transition
        this.gateY = endY + BH * 0.5;
        var gate = this.add.image(BW / 2, this.gateY, 't_gate').setDepth(5);
        this.gate = gate;
      }

      // sort spawn records by triggerY descending (world y going up = decreasing → spawn as camera reaches)
      records.sort(function (a, b) { return b.triggerY - a.triggerY; });
      this.spawnList = records;
      this._next = 0;
    };

    GameScene.prototype.updateAutoFly = function (dt) {
      // cinematic zone transition: couple flies up off-screen (camera STAYS put so
      // the couple actually leaves the top of the view). Track distance flown, not
      // couple.y vs camScrollY (which would move together and never satisfy the exit).
      this.couple.y -= 780 * dt;
      this.autoFlyDist += 780 * dt;
      this.setPose('launch');
      this.couple.setAngle(Math.sin(this.autoFlyDist * 0.02) * 8);    // playful wobble
      // sparkle trail behind the launching couple
      this._trailT = (this._trailT || 0) + dt;
      if (this._trailT > 0.05) { this._trailT = 0; this.emitSpark(this.couple.x, this.couple.body.bottom, [0xffd36b, 0xff9ac0, 0x8fd3f0][(this.autoFlyDist / 40 | 0) % 3]); }
      if (this.autoFlyDist >= BH * 0.75) {   // couple has cleared the top of the screen
        RUN.autoFly = false;
        this.couple.setAngle(0);
        this.nextZone();
      }
    };

    GameScene.prototype.reachGate = function () {
      if (RUN.autoFly) return;
      // release the reunion lock if we're flying on from the Stage 3 altar
      if (this._climaxLock) {
        this._climaxLock = false;
        this.resetCoupleTransforms();
        if (this.couple.body) this.couple.body.setAllowGravity(true);
      }
      // gate "opens": bloom + pop before the launch
      if (this.gate) { var gt = this.gate; this.tweens.add({ targets: gt, scaleX: 1.15, scaleY: 1.15, alpha: 1, duration: 260, yoyo: true }); this.emitSpark(gt.x, gt.y, 0xfff0c0); }
      RUN.autoFly = true;
      this.autoFlyDist = 0;
      this.stopThrustFx();
      toast('✨ ZONA CLEAR! ✨');
    };
    GameScene.prototype.nextZone = function () {
      var nz = RUN.zone + 1;
      if (nz >= CFG.ZONES) { announceWin(); return; }   // no zone past the altar
      if (nz > STORE.maxZone) { STORE.maxZone = nz; saveStore(); }
      window.__jwStarted = { zone: nz };                // resume lands on this zone
      // reset couple to center for new zone
      this.couple.x = BW / 2;
      this.couple.y = CFG.CONTROL_Y - 40;
      this.couple.body.velocity.set(0, CFG.BOUNCE);
      this.buildZone(nz);
      showClear(nz);
    };

    /* ---- juice ---- */
    GameScene.prototype.emitSpark = function (x, y, color) {
      if (!this.textures.exists('t_spark')) return;
      var em = this.add.particles(x, y, 't_spark', { speed: { min: -160, max: 160 }, scale: { start: 0.7, end: 0 }, lifespan: 500, quantity: 8, tint: color, emitting: false, blendMode: 'ADD' });
      em.explode(8, x, y);
      this.time.delayedCall(600, function () { em.destroy(); });
    };
    GameScene.prototype.juicePieceUnlock = function () { this.cameras.main.flash(120, 255, 240, 200); this.emitSpark(this.couple.x, this.couple.y, 0xffd36b); };
    GameScene.prototype.juiceCelebrate = function () {
      this.cameras.main.flash(160, 255, 240, 200);
      var self = this;
      for (var i = 0; i < 5; i++) (function (i) { self.time.delayedCall(i * 220, function () { self.emitSpark(80 + Math.random() * (BW - 160), self.camScrollY + 120 + Math.random() * 300, [0xffd36b, 0xff6f9c, 0x8fd3f0][i % 3]); }); })(i);
      this.playSfx('win');
    };

    /* ---- SFX (simple Web Audio beeps; never tenant backsound) ---- */
    GameScene.prototype.playSfx = function (kind) {
      if (!sfxOn) return;
      try {
        var ac = this._ac || (this._ac = new (window.AudioContext || window.webkitAudioContext)());
        var o = ac.createOscillator(), g = ac.createGain();
        var f = { bounce: 520, spring: 720, ring: 880, heart: 990, powerup: 660, pop: 300, hurt: 160, shoot: 440, win: 784 }[kind] || 440;
        o.frequency.value = f; o.type = (kind === 'hurt' ? 'sawtooth' : 'square');
        g.gain.value = 0.05; o.connect(g); g.connect(ac.destination);
        o.start(); o.frequency.exponentialRampToValueAtTime(f * (kind === 'bounce' ? 1.4 : 1.1), ac.currentTime + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.14); o.stop(ac.currentTime + 0.15);
      } catch (e) {}
    };

    return GameScene;
  }

  /* ====================================================================
     10. PROCEDURAL TEXTURES (shaded — Bible §10.2)
     ==================================================================== */
  function buildTextures(scene) {
    function box(g, x, y, w, h, base, hi, sh) {
      g.fillStyle(base, 1); g.fillRect(x, y, w, h);
      if (hi != null) { g.fillStyle(hi, 1); g.fillRect(x, y, w, Math.max(1, (h * 0.22) | 0)); }
      if (sh != null) { g.fillStyle(sh, 1); g.fillRect(x, y + h - ((h * 0.22) | 0), w, Math.max(1, (h * 0.22) | 0)); }
    }
    function tex(key, w, h, draw) {
      if (scene.textures.exists(key)) return;
      var g = scene.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, w, h); g.destroy();
    }
    /* ---- rich draw helpers (fake gradients / glow / sparkle via banded fills) ---- */
    function lerpC(a, b, t) {
      var ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
      var br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
    }
    // vertical multi-band gradient rect (top→bottom), n bands for smoothness
    function vgrad(g, x, y, w, h, top, bot, n) {
      n = n || 8; var bh = h / n;
      for (var i = 0; i < n; i++) { g.fillStyle(lerpC(top, bot, i / (n - 1)), 1); g.fillRect(x, y + i * bh, w, Math.ceil(bh) + 1); }
    }
    // soft radial-ish orb: concentric circles core→edge (edge can be same color w/ lower alpha handled by caller)
    function orb(g, cx, cy, r, core, edge, n) {
      n = n || 6;
      for (var i = n - 1; i >= 0; i--) { var t = i / (n - 1); g.fillStyle(lerpC(core, edge, t), 1); g.fillCircle(cx, cy, r * (0.4 + 0.6 * t)); }
    }
    // glow ring (additive-looking halo drawn as translucent rings)
    function glow(g, cx, cy, r, color, a) {
      a = a || 0.16;
      for (var i = 0; i < 4; i++) { g.fillStyle(color, a * (1 - i * 0.22)); g.fillCircle(cx, cy, r + i * 3); }
    }
    // tiny 4-point sparkle
    function sparkle(g, cx, cy, s, color) {
      g.fillStyle(color, 1);
      g.fillTriangle(cx - s, cy, cx, cy - s * 1.8, cx + s, cy); g.fillTriangle(cx - s, cy, cx, cy + s * 1.8, cx + s, cy);
      g.fillTriangle(cx, cy - s, cx - s * 1.8, cy, cx, cy + s); g.fillTriangle(cx, cy - s, cx + s * 1.8, cy, cx, cy + s);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(cx, cy, s * 0.5);
    }
    // PLAYER = the GROOM alone (jumping to find his bride). Bride is drawn only at the Stage 3
    // altar (t_bride), never as the player sprite. Canvas 48x56; body footprint kept ~x15..33.
    // Each pose is a genuinely distinct drawing (arms, legs, coat-tails, torso squash).
    function drawGroomSprite(g, o) {
      var SUIT_HI = 0x3d4a66, SUIT = 0x2a2f40, SUIT_SH = 0x191d2c;   // navy tux, top-lit
      var SKIN = 0xf1c9a5, SKIN_SH = 0xd8a97f, HAIR = 0x35281a, HAIR_HI = 0x574230;
      var torsoY = o.torsoY || 0, sx = o.sx || 1, sy = o.sy || 1;   // per-pose torso offset/squash

      // ---- soft ground shadow (only for grounded/land pose) ----
      if (o.shadow) { g.fillStyle(0x000000, 0.18); g.fillEllipse(24, 52, 26, 6); }

      // ---- coat tails (behind body) flowing based on motion ----
      g.fillStyle(SUIT_SH, 1);
      var tail = o.tail || 0;   // -1 up(rising), +1 down(falling)
      if (tail < 0) { g.fillTriangle(17, 34, 12, 46, 21, 40); g.fillTriangle(31, 34, 36, 46, 27, 40); }
      else if (tail > 0) { g.fillTriangle(18, 36, 14, 50, 22, 42); g.fillTriangle(30, 36, 34, 50, 26, 42); }
      else { g.fillTriangle(18, 36, 16, 48, 22, 42); g.fillTriangle(30, 36, 32, 48, 26, 42); }

      // ---- legs ----
      g.fillStyle(SUIT, 1);
      if (o.legs === 'tuck') { g.fillRect(19, 40, 5, 7); g.fillRect(24, 40, 5, 7); }        // tucked (apex)
      else if (o.legs === 'split') { g.fillRect(15, 42, 5, 9); g.fillRect(28, 42, 5, 9); }  // split (fall)
      else if (o.legs === 'crouch') { g.fillRect(18, 44, 6, 5); g.fillRect(24, 44, 6, 5); } // deep crouch (land)
      else { g.fillRect(19, 42, 5, 9); g.fillRect(24, 42, 5, 9); }                          // stand
      // shoes
      g.fillStyle(0x14100c, 1);
      if (o.legs === 'split') { g.fillRect(14, 50, 7, 3); g.fillRect(27, 50, 7, 3); }
      else if (o.legs === 'crouch') { g.fillRect(17, 48, 7, 3); g.fillRect(24, 48, 7, 3); }
      else { g.fillRect(18, 50, 6, 3); g.fillRect(24, 50, 6, 3); }

      // ---- torso (shaded tux jacket) ----
      var bx = 16, bw = 16, by = 18 + torsoY, bh = 22;
      vgrad(g, bx, by, bw, bh, SUIT_HI, SUIT_SH, 6);
      // lapels (V) + shirt + tie
      g.fillStyle(0xf3f4f8, 1); g.fillTriangle(20, by + 1, 28, by + 1, 24, by + 14);   // shirt V
      g.fillStyle(0xffffff, 1); g.fillRect(22, by + 1, 4, 9);
      g.fillStyle(SUIT_HI, 1); g.fillTriangle(16, by, 24, by + 2, 20, by + 12);        // left lapel
      g.fillTriangle(32, by, 24, by + 2, 28, by + 12);                                 // right lapel
      g.fillStyle(0xd84d7c, 1); g.fillTriangle(23, by + 2, 25, by + 2, 24, by + 11);   // tie
      g.fillStyle(0xffd36b, 1); g.fillCircle(24, by + 4, 1);                            // tie knot glint
      g.fillStyle(0xff6f9c, 1); g.fillCircle(19, by + 4, 1.4);                          // boutonniere

      // ---- arms (skin hands) by pose ----
      g.fillStyle(SUIT, 1); var ay = by + 2;
      if (o.arms === 'up') { g.fillRect(12, ay - 6, 4, 10); g.fillRect(32, ay - 6, 4, 10); g.fillStyle(SKIN, 1); g.fillCircle(14, ay - 7, 2.4); g.fillCircle(34, ay - 7, 2.4); }
      else if (o.arms === 'out') { g.fillRect(9, ay + 2, 8, 4); g.fillRect(31, ay + 2, 8, 4); g.fillStyle(SKIN, 1); g.fillCircle(9, ay + 4, 2.4); g.fillCircle(39, ay + 4, 2.4); }
      else if (o.arms === 'flail') { g.fillRect(11, ay - 4, 4, 9); g.fillRect(33, ay + 3, 4, 9); g.fillStyle(SKIN, 1); g.fillCircle(13, ay - 5, 2.4); g.fillCircle(35, ay + 12, 2.4); }
      else { g.fillRect(13, ay + 2, 4, 10); g.fillRect(31, ay + 2, 4, 10); g.fillStyle(SKIN, 1); g.fillCircle(15, ay + 12, 2.4); g.fillCircle(33, ay + 12, 2.4); } // down

      // ---- head ----
      var hy = 11 + torsoY;
      g.fillStyle(SKIN_SH, 1); g.fillCircle(24, hy, 8);            // skin base (shadow ring)
      g.fillStyle(SKIN, 1); g.fillCircle(24, hy - 1, 7);           // lit face
      g.fillStyle(HAIR, 1); g.fillEllipse(24, hy - 5, 15, 9);      // hair mass
      g.fillStyle(HAIR_HI, 1); g.fillEllipse(21, hy - 6, 6, 3);    // hair sheen
      g.fillStyle(SKIN, 1); g.fillRect(18, hy - 2, 12, 6);         // forehead/face reveal
      // eyes + brows + smile + cheeks
      g.fillStyle(0x23324a, 1); g.fillRect(20, hy, 2, 2); g.fillRect(26, hy, 2, 2);
      g.fillStyle(0xffffff, 0.8); g.fillRect(20, hy, 1, 1); g.fillRect(26, hy, 1, 1);
      g.fillStyle(0x7a4a3a, 1); g.fillRect(19, hy - 2, 3, 1); g.fillRect(26, hy - 2, 3, 1);
      g.fillStyle(0xc65b6b, 1); if (o.mouth === 'O') g.fillCircle(24, hy + 4, 1.6); else g.fillRect(22, hy + 4, 5, 1);
      g.fillStyle(0xff9aa8, 0.7); g.fillCircle(19, hy + 2, 1.6); g.fillCircle(29, hy + 2, 1.6);

      // ---- effects ----
      if (o.hurt) { g.fillStyle(0xff4d4d, 0.35); g.fillCircle(24, 26, 22); }
      if (o.celebrate) { g.fillStyle(0xffe066, 1); sparkle(g, 8, 10, 3, 0xffe066); sparkle(g, 40, 14, 2.6, 0xff6f9c); }
    }
    // pose recipes — each visually distinct
    var poses = {
      idle:      { arms: 'down', legs: 'stand', tail: 0, torsoY: 1, mouth: '-', shadow: 1 },
      rise:      { arms: 'up',   legs: 'tuck',  tail: -1, mouth: 'O' },
      launch:    { arms: 'up',   legs: 'tuck',  tail: -1, mouth: 'O' },
      apex:      { arms: 'out',  legs: 'tuck',  tail: 0,  mouth: '-' },
      fall:      { arms: 'flail',legs: 'split', tail: 1,  mouth: 'O' },
      land:      { arms: 'out',  legs: 'crouch',tail: 1,  torsoY: 3, mouth: '-', shadow: 1 },
      hurt:      { arms: 'flail',legs: 'split', tail: 1,  hurt: 1, mouth: 'O' },
      celebrate: { arms: 'up',   legs: 'stand', tail: 0,  celebrate: 1, mouth: 'O', shadow: 1 }
    };
    Object.keys(poses).forEach(function (p) { tex('t_couple_' + p, 48, 56, function (g) { drawGroomSprite(g, poses[p]); }); });

    // BRIDE standing at the altar (Stage 3 reunion only) — shaded gown + veil + bouquet
    tex('t_bride', 44, 56, function (g) {
      var SKIN = 0xf1c9a5, SKIN_SH = 0xd8a97f;
      g.fillStyle(0x000000, 0.15); g.fillEllipse(22, 53, 26, 5);                     // ground shadow
      // gown (gradient white→soft blue, layered flare)
      for (var i = 0; i < 6; i++) { g.fillStyle(lerpC(0xffffff, 0xdfe7f5, i / 5), 1); var wy = 20 + i * 5, hw = 4 + i * 3; g.fillTriangle(22, 18, 22 - hw, wy + 5, 22 + hw, wy + 5); }
      g.fillStyle(0xffffff, 1); g.fillTriangle(22, 18, 8, 50, 36, 50); g.fillRect(8, 48, 28, 4);
      g.fillStyle(0xdfe7f5, 0.7); g.fillTriangle(22, 24, 15, 50, 22, 50);            // fold shadow
      g.fillStyle(0xffffff, 0.9); g.fillTriangle(22, 22, 26, 40, 22, 40);           // fold highlight
      // torso bodice
      g.fillStyle(0xf4f6fb, 1); g.fillRect(17, 18, 10, 8);
      // head + hair + veil
      g.fillStyle(SKIN_SH, 1); g.fillCircle(22, 11, 8); g.fillStyle(SKIN, 1); g.fillCircle(22, 10, 7);
      g.fillStyle(0x6a4a2e, 1); g.fillEllipse(22, 6, 15, 8);                          // hair
      g.fillStyle(0xf3f3f3, 0.55); g.fillTriangle(22, 2, 8, 40, 14, 40);             // veil left
      g.fillStyle(0xf3f3f3, 0.55); g.fillTriangle(22, 2, 36, 40, 30, 40);            // veil right
      g.fillStyle(0xffffff, 0.9); g.fillEllipse(22, 3, 16, 4);                        // veil crown
      g.fillStyle(0xffd36b, 1); for (var f = 14; f <= 30; f += 4) g.fillCircle(f, 3, 1); // tiara
      // face
      g.fillStyle(0x23324a, 1); g.fillRect(19, 11, 2, 2); g.fillRect(24, 11, 2, 2);
      g.fillStyle(0xff9aa8, 0.7); g.fillCircle(18, 13, 1.6); g.fillCircle(27, 13, 1.6);
      g.fillStyle(0xc65b6b, 1); g.fillRect(21, 14, 3, 1);
      // bouquet
      g.fillStyle(0x5aa03a, 1); g.fillRect(28, 30, 3, 12);
      orb(g, 31, 30, 6, 0xff6f9c, 0xd83f6c, 4);
      g.fillStyle(0xffd36b, 1); g.fillCircle(31, 30, 1.4); g.fillCircle(29, 32, 1.2); g.fillCircle(33, 31, 1.2);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(29, 28, 1);
    });

    // platforms — gradient body + top rim-light + detail per type
    tex('t_plat_green', 84, 20, function (g) {
      vgrad(g, 0, 0, 84, 20, 0x8fd97a, 0x3f8f38, 6);
      g.fillStyle(0xb6f09a, 0.9); g.fillRect(2, 1, 80, 3);                              // rim light
      g.fillStyle(0x2e5a24, 1); for (var i = 6; i < 84; i += 11) { g.fillTriangle(i, 4, i + 3, -2, i + 6, 4); } // grass tufts
      g.fillStyle(0x6bbf59, 1); for (var j = 6; j < 84; j += 11) { g.fillTriangle(j, 4, j + 3, 0, j + 6, 4); }
      g.lineStyle(2, 0x27521f, 1); g.strokeRect(1, 1, 82, 18);
    });
    tex('t_plat_blue', 84, 20, function (g) {
      vgrad(g, 0, 0, 84, 20, 0x9cd2f7, 0x2f78b8, 6);
      g.fillStyle(0xd6f0ff, 0.9); g.fillRect(2, 1, 80, 3);
      g.fillStyle(0xffffff, 0.5); g.fillEllipse(20, 12, 22, 5); g.fillEllipse(60, 13, 18, 4); // sheen (cloud-like)
      g.fillStyle(0xffd36b, 1); g.fillTriangle(6, 10, 12, 10, 9, 4); g.fillTriangle(72, 10, 78, 10, 75, 4); // arrows (mover hint)
      g.lineStyle(2, 0x225a86, 1); g.strokeRect(1, 1, 82, 18);
    });
    tex('t_plat_brown', 84, 20, function (g) {
      vgrad(g, 0, 0, 84, 20, 0xd0a060, 0x6a4518, 6);
      g.fillStyle(0xe6c088, 0.8); g.fillRect(2, 1, 80, 2);
      g.lineStyle(1, 0x4a2e0e, 0.8); for (var i = 14; i < 84; i += 18) g.lineBetween(i, 2, i - 2, 18); // planks
      g.fillStyle(0x3a2408, 1); g.fillCircle(10, 6, 1.2); g.fillCircle(74, 14, 1.2);                    // knots/nails
      g.fillStyle(0x8a5a26, 1); g.fillRect(6, 14, 72, 2);                                                // crack line (fragile hint)
      g.lineStyle(2, 0x3d2408, 1); g.strokeRect(1, 1, 82, 18);
    });
    tex('t_plat_white', 84, 18, function (g) {
      vgrad(g, 0, 0, 84, 18, 0xffffff, 0xcdd8ee, 5);
      g.fillStyle(0xffffff, 0.9); g.fillRect(2, 1, 80, 3);
      g.fillStyle(0xeaf1ff, 0.6); for (var i = 8; i < 84; i += 14) g.fillCircle(i, 9, 3);   // frosty motes (about-to-vanish)
      g.lineStyle(2, 0x9aa8c0, 0.8); g.strokeRect(1, 1, 82, 15);
    });

    // collectibles — ring (spinning gem band, 4 frames) + heart (glossy, 3 pulse frames)
    // ring frame: sw = perspective width of the band (1=face-on … 0.25=edge)
    function drawRing(g, sw) {
      glow(g, 13, 13, 9, 0xffe27a, 0.14);
      g.lineStyle(4, 0xffcf4d, 1); g.strokeEllipse(13, 13, 16 * sw, 16);
      g.lineStyle(2, 0xfff0b0, 1); g.strokeEllipse(13, 13, 16 * sw, 16);
      // diamond
      var dx = 13, dy = 13 - 8;
      orb(g, dx, dy, 3.4, 0xeaffff, 0x8fd3f0, 4);
      g.fillStyle(0xffffff, 0.95); g.fillTriangle(dx, dy - 3, dx - 2, dy, dx + 2, dy);
      sparkle(g, dx + 2, dy - 2, 1.6, 0xffffff);
    }
    var ringFrames = [1, 0.62, 0.28, 0.62];
    ringFrames.forEach(function (sw, i) { tex('t_ring' + (i || ''), 26, 26, function (g) { drawRing(g, sw); }); });
    function drawHeart(g, s, cx, cy) {
      glow(g, cx, cy + 1, 8 * s, 0xff8fb0, 0.13);
      g.fillStyle(0xd83f6c, 1); g.fillCircle(cx - 5 * s, cy - 1, 6 * s); g.fillCircle(cx + 5 * s, cy - 1, 6 * s); g.fillTriangle(cx - 10 * s, cy + 2, cx + 10 * s, cy + 2, cx, cy + 12 * s);
      g.fillStyle(0xff6f9c, 1); g.fillCircle(cx - 5 * s, cy - 2, 4.6 * s); g.fillCircle(cx + 5 * s, cy - 2, 4.6 * s); g.fillTriangle(cx - 8 * s, cy + 1, cx + 8 * s, cy + 1, cx, cy + 10 * s);
      g.fillStyle(0xffc0d4, 0.95); g.fillEllipse(cx - 4 * s, cy - 3, 4 * s, 2.4 * s);   // gloss
    }
    [1, 1.12, 0.94].forEach(function (s, i) { tex('t_heart' + (i || ''), 30, 28, function (g) { drawHeart(g, s, 15, 12); }); });

    // powerups — shaded
    tex('t_spring', 26, 20, function (g) { vgrad(g, 4, 2, 18, 5, 0xff7fa8, 0xc23e6a, 3); g.lineStyle(3, 0xcfcfcf, 1); g.lineBetween(6, 9, 20, 9); g.lineBetween(6, 13, 20, 13); g.lineBetween(6, 17, 20, 17); g.fillStyle(0xffffff, 0.5); g.fillRect(6, 2, 6, 1); });
    tex('t_tramp', 30, 16, function (g) { vgrad(g, 2, 2, 26, 6, 0x3a4056, 0x1c2030, 3); g.fillStyle(0x5aa9e6, 1); g.fillRect(4, 4, 22, 2); g.fillStyle(0x86c9f5, 0.8); g.fillRect(4, 4, 22, 1); g.fillStyle(0x777, 1); g.fillRect(4, 10, 3, 5); g.fillRect(23, 10, 3, 5); });
    tex('t_pu_springshoes', 26, 22, function (g) { glow(g, 13, 12, 11, 0xff8fb0, 0.12); vgrad(g, 4, 4, 18, 10, 0xff8fb0, 0xd83f6c, 4); g.fillStyle(0xffffff, 1); g.fillRect(4, 14, 18, 4); g.lineStyle(2, 0xcfcfcf, 1); g.lineBetween(6, 18, 20, 18); g.fillStyle(0xffffff, 0.6); g.fillRect(6, 5, 5, 1); });
    tex('t_pu_propeller', 28, 24, function (g) { glow(g, 14, 12, 12, 0xffe27a, 0.12); g.fillStyle(0xffd36b, 1); g.fillEllipse(14, 10, 26, 4); g.fillStyle(0xfff0b0, 0.8); g.fillEllipse(14, 9, 24, 2); vgrad(g, 11, 12, 6, 11, 0xff7fa8, 0xc23e6a, 3); orb(g, 14, 10, 3, 0xbfe8ff, 0x5aa9e6, 3); });
    tex('t_pu_jetpack', 24, 26, function (g) { glow(g, 12, 20, 9, 0xffb04d, 0.14); vgrad(g, 6, 2, 12, 16, 0xbfc4cc, 0x5a5f68, 4); g.fillStyle(0xd84d7c, 1); g.fillRect(6, 2, 4, 16); g.fillStyle(0xffffff, 0.5); g.fillRect(15, 3, 2, 12); orb(g, 12, 22, 5, 0xfff0a0, 0xff6a2a, 4); g.fillStyle(0xffffff, 0.8); g.fillTriangle(10, 18, 14, 18, 12, 24); });
    tex('t_pu_shield', 26, 28, function (g) { glow(g, 13, 14, 12, 0x8fd3f0, 0.16); vgrad(g, 4, 2, 18, 20, 0xbfeaff, 0x4a9fd0, 4); g.fillTriangle(4, 22, 22, 22, 13, 28); g.lineStyle(2, 0x2f78b8, 1); g.strokeRect(4, 2, 18, 20); g.fillStyle(0xffd36b, 1); g.fillTriangle(13, 6, 10, 14, 16, 14); g.fillTriangle(9, 11, 17, 11, 13, 18); g.fillStyle(0xffffff, 0.7); g.fillEllipse(9, 7, 4, 8); });

    // worn-shield bubble (drawn around the couple while shield active) — see stepPlayer shieldFx
    tex('t_shieldbubble', 72, 72, function (g) { for (var i = 0; i < 4; i++) { g.fillStyle(0x8fd3f0, 0.10 - i * 0.02); g.fillCircle(36, 36, 34 - i * 3); } g.lineStyle(2, 0xbfeaff, 0.7); g.strokeCircle(36, 36, 33); g.fillStyle(0xffffff, 0.5); g.fillEllipse(24, 22, 8, 14); });

    // enemies — bee (2 wing frames), bird (2 flap frames), stormcloud (2 flash), ufo (2 glow)
    function drawBee(g, wingUp) {
      glow(g, 15, 14, 12, 0xffe27a, 0.10);
      g.fillStyle(0xffffff, wingUp ? 0.75 : 0.5); g.fillEllipse(8, wingUp ? 5 : 8, 10, wingUp ? 8 : 5); g.fillEllipse(22, wingUp ? 5 : 8, 10, wingUp ? 8 : 5);
      orb(g, 15, 14, 8, 0xffe066, 0xd9a318, 4);                                  // body
      g.fillStyle(0x2a2a2a, 1); g.fillRect(11, 8, 3, 12); g.fillRect(17, 8, 3, 12); // stripes
      g.fillStyle(0xffffff, 1); g.fillCircle(20, 12, 2.4); g.fillStyle(0x000, 1); g.fillCircle(21, 12, 1.2); // eye
      g.fillStyle(0x000, 1); g.fillTriangle(23, 18, 27, 20, 23, 21);              // stinger
    }
    [false, true].forEach(function (up, i) { tex('t_enemy_bee' + (i || ''), 30, 24, function (g) { drawBee(g, up); }); });
    function drawBird(g, wing) { // wing: -1 down, +1 up
      g.fillStyle(0xb83560, 1); g.fillEllipse(15, 15, 20, 13);                    // body base
      g.fillStyle(0xe85f8a, 1); g.fillEllipse(15, 13, 18, 11);                    // lit body
      g.fillStyle(0xffb0c8, 0.8); g.fillEllipse(12, 11, 8, 4);                    // back sheen
      g.fillStyle(0xd84d7c, 1); if (wing > 0) { g.fillTriangle(6, 14, 16, 6, 16, 15); } else { g.fillTriangle(6, 16, 16, 22, 16, 14); } // wing
      g.fillStyle(0xffd36b, 1); g.fillTriangle(25, 13, 30, 15, 25, 17);           // beak
      g.fillStyle(0xffffff, 1); g.fillCircle(20, 11, 3); g.fillStyle(0x000, 1); g.fillCircle(21, 11, 1.5);
    }
    [-1, 1].forEach(function (w, i) { tex('t_enemy_bird' + (i || ''), 32, 26, function (g) { drawBird(g, w); }); });
    function drawCloud(g, flash) {
      g.fillStyle(0x3a4556, 1); g.fillEllipse(20, 15, 38, 20); g.fillEllipse(11, 17, 18, 13); g.fillEllipse(30, 17, 16, 12);
      g.fillStyle(0x556277, 1); g.fillEllipse(20, 12, 30, 12); g.fillStyle(0x2a3340, 0.9); g.fillEllipse(20, 20, 32, 8);
      g.fillStyle(flash ? 0xfff29a : 0xffe066, 1); g.fillTriangle(18, 19, 24, 19, 14, 30); g.fillTriangle(14, 28, 20, 26, 17, 34);
      if (flash) { glow(g, 20, 15, 20, 0xfff0a0, 0.12); }
    }
    [false, true].forEach(function (f, i) { tex('t_enemy_stormcloud' + (i || ''), 44, 30, function (g) { drawCloud(g, f); }); });
    function drawUfo(g, lit) {
      glow(g, 20, 14, 16, lit ? 0x9be7ff : 0x6fc0e0, lit ? 0.16 : 0.08);
      g.fillStyle(0x9be7ff, 0.35); g.fillTriangle(10, 16, 30, 16, 20, 26);        // beam
      vgrad(g, 3, 12, 34, 6, 0xcfd6de, 0x6a7280, 3); g.fillEllipse(20, 14, 34, 9); // saucer body
      g.fillStyle(0x8a929e, 1); g.fillEllipse(20, 16, 30, 6);
      orb(g, 20, 8, 9, 0xd6f4ff, 0x4a9fd0, 4);                                    // dome
      g.fillStyle(0xffffff, 0.6); g.fillEllipse(16, 6, 5, 3);
      var lc = lit ? 0xfff0a0 : 0xffe066; g.fillStyle(lc, 1); g.fillCircle(8, 15, 2.2); g.fillCircle(20, 17, 2.2); g.fillCircle(32, 15, 2.2);
    }
    [false, true].forEach(function (l, i) { tex('t_enemy_ufo' + (i || ''), 40, 28, function (g) { drawUfo(g, l); }); });

    // objects / particles
    tex('t_bullet', 14, 16, function (g) { glow(g, 6, 8, 6, 0xff8fb0, 0.2); g.fillStyle(0xd83f6c, 1); g.fillCircle(4, 8, 4); g.fillCircle(9, 8, 4); g.fillTriangle(0, 9, 13, 9, 6, 15); g.fillStyle(0xffc0d4, 0.9); g.fillCircle(4, 6, 1.6); });
    tex('t_spark', 8, 8, function (g) { g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 3); g.fillStyle(0xffffff, 0.4); g.fillCircle(4, 4, 4); });
    tex('t_star4', 12, 12, function (g) { sparkle(g, 6, 6, 3, 0xffffff); });
    tex('t_petal', 12, 10, function (g) { g.fillStyle(0xff8fb0, 1); g.fillEllipse(6, 5, 10, 6); g.fillStyle(0xffc0d4, 0.9); g.fillEllipse(5, 4, 5, 3); });
    tex('t_dust', 14, 14, function (g) { g.fillStyle(0xffffff, 0.85); g.fillCircle(7, 7, 5); g.fillStyle(0xe8e0d0, 0.6); g.fillCircle(7, 8, 6); });

    // gate — floral archway with a soft light through it
    tex('t_gate', 220, 96, function (g) {
      glow(g, 110, 40, 46, 0xfff0c0, 0.10);
      vgrad(g, 20, 20, 18, 72, 0x8fd97a, 0x3f8f38, 5); vgrad(g, 182, 20, 18, 72, 0x8fd97a, 0x3f8f38, 5); // posts
      // arch band
      g.lineStyle(14, 0x5aa03a, 1); g.beginPath(); g.arc(110, 46, 76, Math.PI, 0, false); g.strokePath();
      // flowers on arch
      for (var a = 0; a <= 12; a++) { var an = Math.PI - a * (Math.PI / 12); var fx = 110 + Math.cos(an) * 76, fy = 46 + Math.sin(an) * -76; orb(g, fx, fy, 7, [0xff9ac0, 0xffd36b, 0xffffff][a % 3], [0xd83f6c, 0xd9a318, 0xdfe7f5][a % 3], 3); g.fillStyle(0xffe066, 1); g.fillCircle(fx, fy, 1.5); }
      // ribbon
      g.fillStyle(0xffd36b, 1); g.fillTriangle(104, 20, 116, 20, 110, 30);
    });
    // altar — pillared floral canopy with white cloth
    tex('t_altar', 260, 140, function (g) {
      glow(g, 130, 60, 60, 0xfff0c0, 0.10);
      vgrad(g, 34, 34, 22, 100, 0xf0cd6a, 0xb98a2c, 6); vgrad(g, 204, 34, 22, 100, 0xf0cd6a, 0xb98a2c, 6); // pillars
      g.fillStyle(0xfff0b0, 0.8); g.fillRect(36, 34, 4, 100); g.fillRect(206, 34, 4, 100);
      vgrad(g, 30, 18, 200, 18, 0xf0cd6a, 0xb98a2c, 4);                          // beam
      // arch of flowers over the beam
      g.lineStyle(12, 0x5aa03a, 1); g.beginPath(); g.arc(130, 30, 96, Math.PI, 0, false); g.strokePath();
      for (var a = 0; a <= 14; a++) { var an = Math.PI - a * (Math.PI / 14); var fx = 130 + Math.cos(an) * 96, fy = 30 + Math.sin(an) * -96 + 30; orb(g, fx, fy, 8, [0xff9ac0, 0xffffff, 0xffd36b][a % 3], [0xd83f6c, 0xdfe7f5, 0xd9a318][a % 3], 3); }
      // white cloth panel
      vgrad(g, 66, 66, 128, 68, 0xffffff, 0xe6ecf7, 5); g.fillStyle(0xffd36b, 1); g.fillRect(66, 60, 128, 8);
      g.fillStyle(0xff9ac0, 1); g.fillCircle(130, 100, 6); g.fillStyle(0xffe066, 1); g.fillCircle(130, 100, 2); // centerpiece
    });
  }

  /* ---- backdrop (sky + parallax) ---- */
  var GameSceneProtoBackdrop = function () {};
  // attached to prototype after class def below via patch
  function attachBackdrop(GameScene) {
    GameScene.prototype.buildBackdrop = function (meta) {
      var self = this;
      var rnd = function () { return Math.random(); };
      // --- SKY (screen-fixed 3-stop gradient) ---
      if (this._sky) this._sky.destroy();
      var g = this.add.graphics().setScrollFactor(0).setDepth(-60);
      var mid = mixHex(meta.skyTop, meta.skyBot, 0.5);
      g.fillGradientStyle(meta.skyTop, meta.skyTop, mid, mid, 1); g.fillRect(0, 0, BW, BH * 0.5);
      g.fillGradientStyle(mid, mid, meta.skyBot, meta.skyBot, 1); g.fillRect(0, BH * 0.5 - 1, BW, BH * 0.5 + 1);
      this._sky = g;
      this.cameras.main.setBackgroundColor(meta.skyBot);

      // --- CELESTIAL body (sun or moon), screen-fixed, soft glow ---
      if (this._cel) this._cel.destroy();
      var cel = this.add.graphics().setScrollFactor(0).setDepth(-59);
      var cx = BW * 0.76, cy = BH * 0.2;
      if (meta.night) {
        for (var gi = 0; gi < 5; gi++) { cel.fillStyle(0xdfe6ff, 0.05 * (5 - gi)); cel.fillCircle(cx, cy, 42 + gi * 10); }
        cel.fillStyle(0xf4f7ff, 1); cel.fillCircle(cx, cy, 34);
        cel.fillStyle(0xdfe4f2, 1); cel.fillCircle(cx + 10, cy - 6, 6); cel.fillCircle(cx - 8, cy + 8, 4); cel.fillCircle(cx + 4, cy + 12, 3); // craters
        cel.fillStyle(meta.skyTop, 1); cel.fillCircle(cx + 16, cy - 10, 30); // crescent bite
      } else {
        for (var gj = 0; gj < 6; gj++) { cel.fillStyle(0xfff3c0, 0.06 * (6 - gj)); cel.fillCircle(cx, cy, 46 + gj * 12); }
        cel.fillStyle(0xfff0a0, 1); cel.fillCircle(cx, cy, 40);
        cel.fillStyle(0xffffff, 0.5); cel.fillCircle(cx - 10, cy - 10, 16);
      }
      this._cel = cel;

      // --- STARS (night only), screen-fixed twinkle handled in stepCamera ---
      if (this._stars) { this._stars.destroy(); this._stars = null; }
      if (meta.night) {
        var st = this.add.graphics().setScrollFactor(0).setDepth(-58);
        st.fillStyle(0xffffff, 1);
        for (var s = 0; s < 60; s++) { st.fillCircle(rnd() * BW, rnd() * BH * 0.8, rnd() < 0.2 ? 1.6 : 0.9); }
        this._stars = st;
      }

      // clear old parallax
      this.parallax.forEach(function (p) { p.obj.destroy(); });
      this.parallax = [];

      // --- HILLS (far silhouette, subtle parallax) ---
      var hillC = meta.hills || mixHex(meta.skyBot, 0x000000, 0.15);
      var hills = this.add.graphics().setScrollFactor(0).setDepth(-56);
      hills.fillStyle(hillC, meta.night ? 0.85 : 0.5);
      hills.beginPath(); hills.moveTo(0, BH);
      for (var hx = 0; hx <= BW; hx += 60) { hills.lineTo(hx, BH * 0.62 + Math.sin(hx * 0.02) * 40 + (hx % 120 ? 0 : 20)); }
      hills.lineTo(BW, BH); hills.closePath(); hills.fillPath();
      this.parallax.push({ obj: hills, baseY: 0, factor: 0.12 });

      // --- CLOUDS / BALLOONS / PETALS / DISTANT BIRDS (drifting) ---
      function cloud(obj, w) {
        obj.fillStyle(0xffffff, meta.night ? 0.22 : 0.85);
        obj.fillEllipse(0, 0, w, w * 0.42); obj.fillEllipse(-w * 0.32, w * 0.06, w * 0.5, w * 0.34); obj.fillEllipse(w * 0.32, w * 0.05, w * 0.55, w * 0.36);
        obj.fillStyle(0xffffff, meta.night ? 0.1 : 0.5); obj.fillEllipse(-w * 0.1, -w * 0.14, w * 0.5, w * 0.2);
      }
      function balloon(obj, col) { obj.fillStyle(col, 0.9); obj.fillEllipse(0, 0, 26, 32); obj.fillStyle(0xffffff, 0.4); obj.fillEllipse(-6, -8, 6, 10); obj.fillStyle(col, 1); obj.fillTriangle(-3, 15, 3, 15, 0, 20); obj.lineStyle(1, 0xffffff, 0.4); obj.lineBetween(0, 20, 0, 40); }
      function petal(obj, col) { obj.fillStyle(col, 0.9); obj.fillEllipse(0, 0, 12, 7); obj.fillStyle(0xffffff, 0.5); obj.fillEllipse(-2, -1, 5, 3); }
      function birdV(obj) { obj.lineStyle(2, meta.night ? 0x9aa8d0 : 0x556, 0.5); obj.beginPath(); obj.moveTo(-8, 4); obj.lineTo(0, 0); obj.lineTo(8, 4); obj.strokePath(); }

      var specs = [
        { factor: 0.18, n: 4, make: function (o) { cloud(o, 120); }, drift: 8 },
        { factor: 0.30, n: 3, make: function (o) { cloud(o, 80); }, drift: 14 },
        { factor: 0.30, n: 2, make: birdV, drift: 26 },
        { factor: 0.5, n: 3, make: function (o) { balloon(o, [0xff6f9c, 0xffd36b, 0x8fd3f0][(rnd() * 3) | 0]); }, drift: 4 },
        { factor: 0.72, n: 6, make: function (o) { petal(o, [0xff9ac0, 0xffd36b, 0xffffff][(rnd() * 3) | 0]); }, drift: 20 }
      ];
      specs.forEach(function (L) {
        for (var i = 0; i < L.n; i++) {
          var obj = self.add.graphics().setDepth(-55 + Math.floor(L.factor * 8)).setScrollFactor(0);
          L.make(obj);
          obj.x = 20 + rnd() * (BW - 40); obj.y = rnd() * BH;
          self.parallax.push({ obj: obj, baseX: obj.x, baseY: obj.y, factor: L.factor, drift: (rnd() < 0.5 ? -1 : 1) * (L.drift || 0), ph: rnd() * 100 });
        }
      });
    };

    // gate crossing check within camera step (patched into stepCamera via checkFall's sibling)
    var origCheckClimax = GameScene.prototype.checkClimax;
    GameScene.prototype.checkClimax = function () {
      // gate transition for non-last zones
      if (this.gateY != null && !RUN.autoFly && this.couple.y <= this.gateY) {
        this.gateY = null;
        this.reachGate();
      }
      origCheckClimax.call(this);
    };
  }

  /* ====================================================================
     11. COUPLE CANVAS (desktop right panel — Canvas 2D, not Phaser)
     ==================================================================== */
  // animated "just married" scene on the desktop side panel
  var _canvasRAF = null, _floatHearts = null;
  function drawCoupleCanvas() {
    var cv = $('jw-couple-canvas'); if (!cv || !cv.getContext) return;
    // The canvas lives ONLY in the desktop side panel (.jw-side { display:none } on mobile).
    // On the live mobile invitation it is not visible — do NOT start a RAF there (wasted work
    // + avoids any chance of the loop interfering with taps). offsetParent === null ⇒ hidden.
    if (cv.offsetParent === null && !(window.matchMedia && window.matchMedia('(min-width: 900px)').matches)) return;
    // init floating hearts once
    if (!_floatHearts) { _floatHearts = []; for (var k = 0; k < 7; k++) _floatHearts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, s: 6 + Math.random() * 8, sp: 12 + Math.random() * 22, ph: Math.random() * 6 }); }
    if (_canvasRAF != null) return;   // already looping
    var stopped = false;
    function frame(ts) {
      if (stopped) return;
      var t = ts / 1000;
      try { drawCoupleFrame(cv, t); } catch (e) {}
      _canvasRAF = window.requestAnimationFrame(frame);
    }
    _canvasRAF = window.requestAnimationFrame(frame);
    disposers.push(function () { stopped = true; if (_canvasRAF != null) { try { window.cancelAnimationFrame(_canvasRAF); } catch (e) {} _canvasRAF = null; } });
  }
  function drawCoupleFrame(cv, t) {
    var ctx = cv.getContext('2d'); if (!ctx) return; var W = cv.width, H = cv.height;
    // sky (sunset gradient)
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#ff9e6d'); grd.addColorStop(0.55, '#ffc48a'); grd.addColorStop(1, '#ffe6c2');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    // glowing sun
    var sx = W * 0.78, sy = H * 0.26;
    var sg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 120);
    sg.addColorStop(0, 'rgba(255,246,200,.95)'); sg.addColorStop(0.4, 'rgba(255,224,150,.5)'); sg.addColorStop(1, 'rgba(255,224,150,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, 120, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,190,.95)'; ctx.beginPath(); ctx.arc(sx, sy, 44, 0, 7); ctx.fill();
    // drifting clouds
    [[120, 80, 42, 10], [560, 120, 34, 16], [300, 60, 28, 7]].forEach(function (c, i) {
      var cx = (c[0] + t * c[3]) % (W + 200) - 100;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 - i * 0.08) + ')';
      ctx.beginPath(); ctx.ellipse(cx, c[1], c[2] * 1.7, c[2], 0, 0, 7); ctx.ellipse(cx - c[2], c[1] + 6, c[2], c[2] * 0.7, 0, 0, 7); ctx.ellipse(cx + c[2], c[1] + 5, c[2] * 1.1, c[2] * 0.75, 0, 0, 7); ctx.fill();
    });
    // rolling hills
    ctx.fillStyle = 'rgba(120,180,110,.55)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (var hx = 0; hx <= W; hx += 40) ctx.lineTo(hx, H * 0.72 + Math.sin(hx * 0.012) * 26); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // platform base
    ctx.fillStyle = '#6bbf59'; ctx.fillRect(W * 0.5 - 160, H - 66, 320, 24);
    ctx.fillStyle = '#8fd97a'; ctx.fillRect(W * 0.5 - 160, H - 66, 320, 5);
    ctx.fillStyle = '#4a8f3c'; ctx.fillRect(W * 0.5 - 160, H - 48, 320, 6);
    // altar floral arch
    ctx.strokeStyle = '#5aa03a'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(W * 0.5, H - 66, 132, Math.PI, 0); ctx.stroke();
    for (var i = 0; i <= 12; i++) { var an = Math.PI - i * (Math.PI / 12); var fx = W * 0.5 + Math.cos(an) * 132, fy = (H - 66) + Math.sin(an) * -132; var cols = ['#ff9ac0', '#ffd36b', '#ffffff']; ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.arc(fx, fy, 10, 0, 7); ctx.fill(); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(fx, fy, 3, 0, 7); ctx.fill(); }
    // couple (gentle sway/bob)
    var sway = Math.sin(t * 1.4) * 4, bob = Math.sin(t * 2.0) * 3;
    var cx0 = W * 0.5, gy = H - 92;
    drawGroom(ctx, cx0 - 52 + sway * 0.5, gy + bob);
    drawBride(ctx, cx0 + 4 - sway * 0.5, gy + bob);
    // banner (ribbon)
    ctx.fillStyle = '#d84d7c'; ctx.fillRect(W * 0.5 - 130, 22, 260, 36);
    ctx.fillStyle = '#b83560'; ctx.fillRect(W * 0.5 - 130, 52, 260, 6);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('JUST MARRIED', W * 0.5, 40);
    // floating hearts (rise + fade + wrap)
    _floatHearts.forEach(function (hh) {
      var y = hh.y - (t * hh.sp % (H + 40)); if (y < -20) y += H + 40;
      var a = 0.35 + Math.sin(t * 1.5 + hh.ph) * 0.25;
      ctx.fillStyle = 'rgba(255,120,160,' + a + ')';
      heart(ctx, hh.x + Math.sin(t + hh.ph) * 12, y, hh.s);
    });
    ctx.textBaseline = 'alphabetic';
  }
  function drawGroom(ctx, x, y) {
    // legs
    ctx.fillStyle = '#20242f'; ctx.fillRect(x + 8, y + 44, 8, 18); ctx.fillRect(x + 20, y + 44, 8, 18);
    ctx.fillStyle = '#12100c'; ctx.fillRect(x + 6, y + 60, 12, 5); ctx.fillRect(x + 18, y + 60, 12, 5);
    // suit (gradient)
    var sg = ctx.createLinearGradient(x, y, x + 36, y + 50); sg.addColorStop(0, '#3d4a66'); sg.addColorStop(1, '#20242f');
    ctx.fillStyle = sg; ctx.fillRect(x, y, 36, 50);
    // shirt V + tie
    ctx.fillStyle = '#f3f4f8'; ctx.beginPath(); ctx.moveTo(x + 12, y + 2); ctx.lineTo(x + 24, y + 2); ctx.lineTo(x + 18, y + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 15, y + 2, 6, 16);
    ctx.fillStyle = '#d84d7c'; ctx.beginPath(); ctx.moveTo(x + 16, y + 4); ctx.lineTo(x + 20, y + 4); ctx.lineTo(x + 18, y + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6f9c'; ctx.beginPath(); ctx.arc(x + 6, y + 8, 3, 0, 7); ctx.fill(); // boutonniere
    // head
    ctx.fillStyle = '#e7bd96'; ctx.beginPath(); ctx.arc(x + 18, y - 11, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(x + 18, y - 12, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#35281a'; ctx.beginPath(); ctx.ellipse(x + 18, y - 20, 17, 11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f1c9a5'; ctx.fillRect(x + 5, y - 14, 26, 8);
    ctx.fillStyle = '#574230'; ctx.beginPath(); ctx.ellipse(x + 11, y - 21, 6, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#23324a'; ctx.fillRect(x + 11, y - 13, 3, 3); ctx.fillRect(x + 22, y - 13, 3, 3);
    ctx.fillStyle = '#c65b6b'; ctx.fillRect(x + 14, y - 6, 8, 2);
    ctx.fillStyle = 'rgba(255,154,168,.7)'; ctx.beginPath(); ctx.arc(x + 9, y - 8, 3, 0, 7); ctx.arc(x + 27, y - 8, 3, 0, 7); ctx.fill();
  }
  function drawBride(ctx, x, y) {
    // gown (gradient)
    var gg = ctx.createLinearGradient(x, y, x + 36, y + 62); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, '#dfe7f5');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 28, y); ctx.lineTo(x + 42, y + 62); ctx.lineTo(x - 6, y + 62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(190,205,235,.6)'; ctx.beginPath(); ctx.moveTo(x + 18, y + 8); ctx.lineTo(x + 10, y + 62); ctx.lineTo(x + 18, y + 62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(x + 18, y + 6); ctx.lineTo(x + 24, y + 50); ctx.lineTo(x + 18, y + 50); ctx.closePath(); ctx.fill();
    // head + hair + veil
    ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(x + 18, y - 12, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a4a2e'; ctx.beginPath(); ctx.ellipse(x + 18, y - 20, 16, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(245,245,245,.6)'; ctx.beginPath(); ctx.moveTo(x + 18, y - 30); ctx.lineTo(x - 6, y + 30); ctx.lineTo(x + 8, y + 30); ctx.closePath(); ctx.moveTo(x + 18, y - 30); ctx.lineTo(x + 42, y + 30); ctx.lineTo(x + 28, y + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd36b'; for (var f = 0; f < 5; f++) { ctx.beginPath(); ctx.arc(x + 8 + f * 5, y - 28, 2, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#23324a'; ctx.fillRect(x + 11, y - 13, 3, 3); ctx.fillRect(x + 22, y - 13, 3, 3);
    ctx.fillStyle = 'rgba(255,154,168,.7)'; ctx.beginPath(); ctx.arc(x + 9, y - 8, 3, 0, 7); ctx.arc(x + 27, y - 8, 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#c65b6b'; ctx.fillRect(x + 14, y - 6, 7, 2);
    // bouquet
    ctx.fillStyle = '#5aa03a'; ctx.fillRect(x + 28, y + 34, 4, 18);
    var bg = ctx.createRadialGradient(x + 32, y + 32, 2, x + 32, y + 32, 12); bg.addColorStop(0, '#ff9ac0'); bg.addColorStop(1, '#d83f6c');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x + 32, y + 32, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x + 32, y + 32, 2, 0, 7); ctx.arc(x + 28, y + 34, 1.5, 0, 7); ctx.arc(x + 35, y + 30, 1.5, 0, 7); ctx.fill();
  }
  function heart(ctx, x, y, s) { ctx.beginPath(); ctx.arc(x - s / 2, y, s / 2, 0, 7); ctx.arc(x + s / 2, y, s / 2, 0, 7); ctx.moveTo(x - s, y); ctx.lineTo(x, y + s * 1.3); ctx.lineTo(x + s, y); ctx.fill(); }

  /* ====================================================================
     12. OVERLAY FLOW (cover, briefing, clear, zone-select, reset)
     ==================================================================== */
  function showBriefing(zoneIdx) {
    var meta = ZONE_META[Math.min(zoneIdx, ZONE_META.length - 1)];
    var isBonus = !!meta.bonus, isClimax = (zoneIdx === CFG.CLIMAX_ZONE);
    var t = $('jw-briefing-title'); if (t) t.textContent = (isBonus ? 'BONUS · ' : 'STAGE ' + (zoneIdx + 1) + ' · ') + meta.name.replace(/^Bonus · /, '').toUpperCase();
    var txt = $('jw-briefing-text');
    if (txt) {
      if (isClimax) txt.innerHTML = 'Calon istrimu menunggu di pelaminan puncak <b>' + meta.name + '</b>! Naik dan temukan dia 💍';
      else if (isBonus) txt.innerHTML = 'STAGE BONUS 🎁 — Undangan kalian sudah terbuka. Main terus untuk membuka <b>galeri & kisah</b> serta kejar skor tertinggi.';
      else txt.innerHTML = 'Naiki ' + meta.name + ' mencari calon istrimu. Kumpulkan 💍 & ❤️ di perjalanan.';
    }
    show($('jw-howto'), zoneIdx === 0);
    overlay('jw-briefing', true);
  }
  function showClear(zoneIdx) {
    var meta = ZONE_META[Math.min(zoneIdx, ZONE_META.length - 1)];
    var t = $('jw-clear-text');
    if (t) t.innerHTML = (meta.bonus ? 'Lanjut ke <b>STAGE BONUS</b>: ' : 'Kamu naik ke <b>STAGE ' + (zoneIdx + 1) + '</b>: ') + meta.name.replace(/^Bonus · /, '') + '!';
    overlay('jw-clear', true);
  }

  function selectDiff(diff, groupSel) {
    pendingDiff = diff;
    qsa(groupSel + ' .jw-diff-opt').forEach(function (b) { b.classList.toggle('is-sel', b.getAttribute('data-diff') === diff); });
  }

  function startGame() {
    STORE.diff = pendingDiff; saveStore();
    RUN = freshRun(); RUN.started = false;   // create() shows briefing; play begins on "MULAI"
    RUN.zone = 0;
    window.__jwStarted = { zone: 0 };        // mark run for host re-inject auto-resume (Bible §Z.1)
    hideAllOverlays();
    overlay('jw-loading', true);
    // create() builds the zone (RUN.zone) + shows briefing; callback just clears the curtain
    bootGame(function () { overlay('jw-loading', false); updateHUD(); });
  }

  function buildZoneSelGrid() {
    var grid = $('jw-zonesel-grid'); if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < CFG.ZONES; i++) (function (i) {
      var cell = document.createElement('div');
      var locked = (i > STORE.maxZone && !cheat.on);
      cell.className = 'jw-zonesel-cell' + (i === pendingZone ? ' is-sel' : '') + (locked ? ' is-locked' : '');
      cell.innerHTML = '<span class="num">' + (i + 1) + '</span><span class="lbl">' + (ZONE_META[i].name.split(' ')[0]) + '</span>';
      cell.addEventListener('click', function () {
        if (locked) return;
        pendingZone = i;
        qsa('#jw-zonesel-grid .jw-zonesel-cell').forEach(function (c) { c.classList.remove('is-sel'); });
        cell.classList.add('is-sel');
      });
      grid.appendChild(cell);
    })(i);
  }

  function resetGame() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    STORE = defaults();
    if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; SCENE = null; }
    RUN = freshRun(); cheat.on = false; pendingDiff = 'easy'; pendingZone = 0;
    window.__jwStarted = null;   // reset → no auto-resume; back to cover (Bible §Y.2)
    var star = $('jw-star-btn'); if (star) star.classList.remove('is-on');
    show($('jw-zonesel-btn'), false);
    buildIndicators(); updateHUD();
    selectDiff('easy', '#jw-diff'); selectDiff('easy', '#jw-zonesel-diff');
    hideAllOverlays(); closeReveal();
    overlay('jw-cover', true);
  }

  /* ====================================================================
     13. BOOT PHASER (ensurePhaser + safe sizing)
     ==================================================================== */
  var GameSceneClass = null;
  function bootGame(cb) {
    ensurePhaser(function (P) {
      if (!P) { showError('Gagal memuat mesin game (Phaser).'); return; }
      if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
      GameSceneClass = defineScene(P);
      attachBackdrop(GameSceneClass);
      var config = {
        type: P.AUTO, width: BW, height: BH, parent: 'gw-stage',
        backgroundColor: '#8fd3f0',
        physics: { default: 'arcade', arcade: { gravity: { y: CFG.GRAVITY_Y }, debug: false } },
        scale: { mode: P.Scale.FIT, autoCenter: P.Scale.CENTER_BOTH, width: BW, height: BH },
        render: { pixelArt: true, antialias: false, roundPixels: true },
        scene: [GameSceneClass]
      };
      window.__jwBootCb = cb || null;      // create() invokes this after the scene is ready
      GAME = new P.Game(config);
      window.__jwGame = GAME;
    });
  }

  function ensurePhaser(cb) {
    if (window.Phaser) { cb(window.Phaser); return; }
    var existing = document.getElementById('jw-phaser-cdn');
    if (existing) { existing.addEventListener('load', function () { cb(window.Phaser); }); return; }
    var s = document.createElement('script');
    s.id = 'jw-phaser-cdn';
    s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
    s.onload = function () { cb(window.Phaser); };
    s.onerror = function () { cb(null); };
    document.head.appendChild(s);
    disposers.push(function () { try { s.remove(); } catch (e) {} });
  }

  function showError(msg) {
    var stage = $('gw-stage'); if (!stage) return;
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:monospace;padding:20px;text-align:center;z-index:40;background:rgba(8,18,32,.9)';
    d.textContent = '⚠️ ' + msg;
    stage.appendChild(d);
    overlay('jw-loading', false);
  }

  /* ====================================================================
     14. WIRE UI EVENTS
     ==================================================================== */
  function wireUI() {
    // difficulty pickers (pending → commit on start)
    qsa('#jw-diff .jw-diff-opt').forEach(function (b) { on(b, 'click', function () { selectDiff(b.getAttribute('data-diff'), '#jw-diff'); }); });
    qsa('#jw-zonesel-diff .jw-diff-opt').forEach(function (b) { on(b, 'click', function () { selectDiff(b.getAttribute('data-diff'), '#jw-zonesel-diff'); }); });

    var _sb = $('jw-start'); if (_sb) _sb._jwWired = true;
    on(_sb, 'click', function () { startGame(); });
    on($('jw-cover-view'), 'click', function () { unlockAll(true); STORE.announcedAll = true; saveStore(); openReveal(); });
    on($('jw-side-open'), 'click', function () { unlockAll(true); STORE.announcedAll = true; saveStore(); openReveal(); });
    on($('jw-briefing-go'), 'click', function () { overlay('jw-briefing', false); RUN.started = true; setStagePlayable(true); });
    on($('jw-clear-next'), 'click', function () { overlay('jw-clear', false); });
    on($('jw-allpieces-view'), 'click', function () { overlay('jw-allpieces', false); openReveal(); });
    on($('jw-allpieces-keep'), 'click', function () { overlay('jw-allpieces', false); });
    on($('jw-win-view'), 'click', function () { overlay('jw-win', false); openReveal(); });
    // continue from the Stage 3 reunion into the optional bonus stages
    on($('jw-win-bonus'), 'click', function () {
      overlay('jw-win', false);
      if (SCENE && !RUN.autoFly && RUN.zone < CFG.ZONES - 1) SCENE.reachGate();
    });
    on($('jw-win-close'), 'click', function () { overlay('jw-win', false); });
    on($('jw-view-btn'), 'click', function () { if (coreUnlocked() || cheat.on) openReveal(); else toast('Temukan calon istrimu dulu 💍 (atau tekan ★)', true); });
    on($('jw-reveal-close'), 'click', function () { closeReveal(); });

    // tilt permission (iOS)
    var tiltBtn = $('jw-tilt');
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      show(tiltBtn, true);
      on(tiltBtn, 'click', function () {
        DeviceOrientationEvent.requestPermission().then(function (res) {
          if (res === 'granted') { enableTilt(); toast('📱 Kontrol miring aktif!'); show(tiltBtn, false); }
        }).catch(function () {});
      });
    } else if (isTouch && window.DeviceOrientationEvent) {
      enableTilt();
    }

    // cheat
    on($('jw-star-btn'), 'click', function () {
      cheat.on = !cheat.on;
      var star = $('jw-star-btn'); if (star) star.classList.toggle('is-on', cheat.on);
      show($('jw-zonesel-btn'), cheat.on);
      if (cheat.on) { unlockAll(true); toast('★ CHEAT: kebal + semua kepingan'); }
      else { toast('Cheat dimatikan'); }
      refreshIndicators(); updateHUD();
    });

    // zone select
    on($('jw-zonesel-btn'), 'click', function () { pendingZone = RUN.zone; buildZoneSelGrid(); selectDiff(STORE.diff, '#jw-zonesel-diff'); overlay('jw-zonesel', true); });
    on($('jw-zonesel-ok'), 'click', function () {
      STORE.diff = pendingDiff; saveStore();
      overlay('jw-zonesel', false);
      window.__jwStarted = { zone: pendingZone };
      if (SCENE) { SCENE.diffKey = STORE.diff; SCENE.D = DIFF[STORE.diff]; SCENE.couple.x = BW / 2; SCENE.couple.y = CFG.CONTROL_Y - 40; SCENE.couple.body.velocity.set(0, CFG.BOUNCE); SCENE.buildZone(pendingZone); RUN.started = true; setStagePlayable(true); }
    });
    on($('jw-zonesel-close'), 'click', function () { overlay('jw-zonesel', false); });

    // reset
    on($('jw-reset-btn'), 'click', function () { overlay('jw-resetconfirm', true); });
    on($('jw-reset-yes'), 'click', function () { overlay('jw-resetconfirm', false); resetGame(); });
    on($('jw-reset-no'), 'click', function () { overlay('jw-resetconfirm', false); });

    // sfx
    on($('jw-sfx-btn'), 'click', function () {
      sfxOn = !sfxOn;
      show($('jw-sfx-on'), sfxOn); show($('jw-sfx-off'), !sfxOn);
    });

    // modal + lightbox close (closePieceModal restores host IDs to #inv-source)
    on($('jw-modal-close'), 'click', function () { closePieceModal(); });
    on($('jw-modal-root'), 'click', function (e) { if (e.target === $('jw-modal-root')) closePieceModal(); });
    on($('jw-lightbox-close'), 'click', function () { var lb = $('jw-lightbox'); if (lb) lb.classList.remove('show'); });
    on($('jw-lightbox'), 'click', function (e) { if (e.target === $('jw-lightbox')) e.currentTarget.classList.remove('show'); });

    // touch steer + fire (hold)
    var sl = $('jw-steer-left'), sr = $('jw-steer-right'), fb = $('jw-fire');
    function holdSteer(btn, dir) {
      if (!btn) return;
      var set = function (e) { if (e) e.preventDefault(); if (SCENE) SCENE.steerHold = dir; };
      var clr = function () { if (SCENE) SCENE.steerHold = 0; };
      on(btn, 'touchstart', set); on(btn, 'mousedown', set);
      on(btn, 'touchend', clr); on(btn, 'mouseup', clr); on(btn, 'mouseleave', clr); on(btn, 'touchcancel', clr);
    }
    holdSteer(sl, -1); holdSteer(sr, 1);
    if (fb) on(fb, 'click', function () { if (SCENE) SCENE.fire(); });

    // host music mirror (button hidden, but we also mirror events on #bg-music)
    var bg = $('bg-music');
    if (bg) { on(bg, 'play', function () { musicWanted = true; }); on(bg, 'pause', function () { musicWanted = false; }); }
  }

  var tiltHandler = null;
  function enableTilt() {
    if (tiltHandler) return;
    tiltHandler = function (e) {
      var gamma = e.gamma || 0;
      if (SCENE) SCENE.tilt = Math.max(-1, Math.min(1, gamma / 22));
    };
    addGlobal(window, 'deviceorientation', tiltHandler);
  }

  /* ====================================================================
     15. INIT (+ auto-resume guard, Bible §Z.1)
     ==================================================================== */
  // TEMP diagnostic (always on this build): shows init status + which element catches each tap.
  var _jwDbgBox = null;
  function jwDbg(msg) {
    if (!_jwDbgBox) {
      _jwDbgBox = document.createElement('div');
      _jwDbgBox.style.cssText = 'position:fixed;left:6px;right:6px;bottom:6px;z-index:2147483647;background:rgba(0,0,0,.88);color:#0f0;font:11px/1.4 monospace;padding:8px;border-radius:8px;pointer-events:none;white-space:pre-wrap;max-height:40vh;overflow:auto';
      (document.body || document.documentElement).appendChild(_jwDbgBox);
    }
    _jwDbgBox.textContent = 'JW DEBUG\n' + msg;
  }
  function installTapProbe() {
    jwDbg('init ran. tap PRESS START…');
    function report(x, y, phase) {
      var el = document.elementFromPoint(x, y);
      var startNode = $('jw-start');
      var wiredNow = startNode ? (startNode._jwWired ? 'WIRED' : 'NOT-wired(node swapped!)') : 'no #jw-start';
      var nStarts = document.querySelectorAll('#jw-start').length;
      jwDbg('(' + phase + ') @' + (x | 0) + ',' + (y | 0) + '\nTOP=' + (el ? (el.id || el.tagName) : 'null') +
        '\n#jw-start: ' + wiredNow + ' | count=' + nStarts +
        '\nclickedIsWired=' + (el && el.closest && el.closest('#jw-start') ? (el.closest('#jw-start')._jwWired ? 'yes' : 'NO') : '?'));
    }
    ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
        if (t && t.clientX != null) report(t.clientX, t.clientY, ev);
      }, true);
    });
    // prove the start button has our listener by wrapping a marker
    var sb = $('jw-start'); if (sb) sb.addEventListener('click', function () { jwDbg('✅ #jw-start CLICK handler fired! startGame should run.'); }, true);
  }
  function init() {
    wireUI();
    installTapProbe();
    buildIndicators();
    selectDiff(STORE.diff, '#jw-diff');
    updateHUD();
    try { drawCoupleCanvas(); } catch (e) {}   // decorative canvas must never break init
    // version
    var v = $('jw-version'); if (v) v.textContent = 'v1.0.0 · ' + STORE.diff;

    // auto-resume ONLY if cover & reveal not shown (Bible §Z.1)
    var coverUp = (($('jw-cover') || {}).classList || { contains: function () { return false; } }).contains('show');
    var revealUp = (($('jw-reveal') || {}).classList || { contains: function () { return false; } }).contains('show');
    if (window.__jwStarted && !coverUp && !revealUp) {
      var rs = window.__jwStarted;
      RUN = freshRun(); RUN.zone = (rs && rs.zone) || 0; RUN.started = true; setStagePlayable(true);  // resume mid-run (skip briefing)
      setTimeout(function () {
        overlay('jw-cover', false); overlay('jw-loading', true);
        bootGame(function () { overlay('jw-loading', false); updateHUD(); });
      }, 60);
    }
  }

  /* ---- register cleanup ---- */
  window.__gwCleanup = function () {
    disposers.forEach(function (d) { try { d(); } catch (e) {} }); disposers.length = 0;
    if (window.__jwGame) { try { window.__jwGame.destroy(true); } catch (e) {} window.__jwGame = null; }
    GAME = null; SCENE = null;
    if (toastTimer) clearTimeout(toastTimer);
    window.__gwCleanup = null;
  };

  /* ---- expose for headless harness (Bible §verify) ---- */
  window.__JW = {
    CFG: CFG, DIFF: DIFF, get RUN() { return RUN; }, get STORE() { return STORE; },
    SECTIONS: SECTIONS, CORE_SECTIONS: CORE_SECTIONS, BONUS_SECTIONS: BONUS_SECTIONS,
    thresholdFor: thresholdFor, scanSections: scanSections,
    checkUnlocks: checkUnlocks, unlockPiece: unlockPiece,
    allUnlocked: allUnlocked, coreUnlocked: coreUnlocked,
    announceReunion: announceReunion,
    resetGame: resetGame, defaults: defaults, cheat: cheat,
    get SCENE() { return SCENE; }
  };

  /* ---- go ---- */
  if (document.readyState === 'loading') addGlobal(document, 'DOMContentLoaded', init);
  else init();

})();
