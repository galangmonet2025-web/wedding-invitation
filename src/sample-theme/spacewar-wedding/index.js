/* ======================================================================
   SPACE WAR WEDDING — "BIDUK BINTANG"
   Phaser 3.80.1 horizontal shoot-'em-up wedding-invitation theme.
   Built from SPACEWAR_WEDDING_BIBLE.md.

   The invitation is DISCOVERED by playing: collect the gold INVITATION
   CAPSULES (💌) scattered through 6 galaxy sectors — each gives one
   invitation piece. Punch through the Wedding Station boss to unite the
   two stars and reveal the full invitation. But it is a WEDDING INVITATION
   first — every guest reaches it via the 💌 button + Cheat (★), or by
   collecting the last capsule.

   SHMUP engine notes (differ from a platformer): gravity y:0, the ship
   flies free; there is NO ground — PLAY_TOP/PLAY_BOTTOM bound the play
   field so entities never hide behind the touch controls. The view
   auto-scrolls right; enemies are spawned camera-relative (off-screen =
   inert data). See Bible §4/§5/§9/§S/§Z.

   Host contract (Bible APPENDIX Z): cleanup hook, verbatim host IDs,
   global submit fns + fallback, idempotent music mirror, dynamic piece
   count from #inv-source, celebration with 2 triggers. Phaser is
   host-CDN-loaded; this theme self-loads it as a fallback (ensurePhaser).
   ====================================================================== */
(function () {
    'use strict';

    /* =================================================================
       HOST CONTRACT — cleanup hook (theme re-injected on every change /
       on every guest RSVP/wish submit). Teardown-before-boot guarantees
       ONE game, ONE RAF, ONE canvas.
       ================================================================= */
    if (typeof window.__gwCleanup === 'function') { try { window.__gwCleanup(); } catch (e) {} }
    var cleanupFns = [];
    function onCleanup(fn) { cleanupFns.push(fn); }
    window.__gwCleanup = function () {
        cleanupFns.forEach(function (f) { try { f(); } catch (e) {} });
        cleanupFns = [];
        window.__gwCleanup = null;
    };

    var BUILD = 'spacewar-wedding';
    var VERSION = 'v1.0.0';
    try { console.log('%c[' + BUILD + '] ' + VERSION, 'background:#4fd6ff;color:#0a0c1a;padding:2px 6px;border-radius:3px'); } catch (e) {}

    /* =================================================================
       CENTRAL CONFIG (Bible APPENDIX S) — all numbers in one place.
       ================================================================= */
    var CONFIG = {
        /* VERTICAL shmup (Raiden-style): ship at bottom-center shoots UP; world scrolls
           DOWN (cam.scrollY grows). PLAY_TOP/BOTTOM bound the vertical field; PLAY_LEFT/RIGHT
           bound the horizontal column so the ship & enemies never hide behind controls/HUD. */
        BW: 540, BH: 960, PLAY_TOP: 70, PLAY_BOTTOM: 0, PLAY_LEFT: 20, PLAY_RIGHT: 520, /* set after boot */
        ship: {
            speed: { easy: 300, normal: 330, hard: 360 },
            fireRate: { easy: 150, normal: 140, hard: 130 },
            bulletSpd: 720,
            maxBullets: 14,
            chargeT: [350, 800, 1400],
            invulnMs: { easy: 1100, normal: 900, hard: 700 },
            knockback: 70,
            w: 16, h: 12              /* small, fair hitbox */
        },
        diff: {
            easy:   { scroll: 90,  minEnemies: 3, ebulletSpd: 180, invulnMs: 1100, tellAdd: 0.2, capFreq: 1.3, bossTTK: 22 },
            normal: { scroll: 110, minEnemies: 4, ebulletSpd: 220, invulnMs: 900,  tellAdd: 0.0, capFreq: 1.0, bossTTK: 30 },
            hard:   { scroll: 135, minEnemies: 6, ebulletSpd: 270, invulnMs: 700,  tellAdd: -0.1, capFreq: 0.7, bossTTK: 38 }
        },
        /* Power Meter ladder (Gradius) — highlight shifts per blue capsule, Z = apply.
           dmg/rate/kind drive the weapon; OPTION/SHIELD are non-weapon states. */
        weapons: {
            BLASTER: { name: 'BLASTER', ico: '»', dmg: 1, rate: 1.0, kind: 'single' },
            SPREAD:  { name: 'SPREAD',  ico: 'W', dmg: 1, rate: 1.0, kind: 'spread' },
            MISSILE: { name: 'MISSILE', ico: 'M', dmg: 2, rate: 1.4, kind: 'missile' },
            LASER:   { name: 'LASER',   ico: 'L', dmg: 3, rate: 1.2, kind: 'laser' }
        },
        powerLadder: ['SPEED', 'MISSILE', 'SPREAD', 'LASER', 'OPTION', 'SHIELD'],
        bombs: 3,
        sectors: 6,
        storeKey: 'sww_v1',
        density: {
            minEnemies:      { easy: 3, normal: 4, hard: 6 },
            minStruct:       1,
            minDestructible: 2,
            maxDeadPx:       0.75,
            rewardEveryPx:   2.5
        },
        quotaShape: [3, 3, 2, 2, 1, 0]   /* per-sector capsule quota; sum scaled to N real sections */
    };

    var SECTOR_NAMES = ['Orbit Bumi', 'Sabuk Asteroid', 'Nebula Merah', 'Pangkalan Musuh', 'Medan Perang', 'Stasiun Pelaminan'];
    var SECTION_TITLE = {
        hero: 'Pembuka', couple: 'Mempelai', rsvp: 'Konfirmasi', schedule: 'Acara',
        streaming: 'Live Streaming', story: 'Kisah', gallery: 'Galeri', happiness: 'Bagikan',
        wishes: 'Ucapan', gift: 'Amplop', closing: 'Penutup'
    };

    /* =================================================================
       DOM HELPERS + binding reads (Bible APPENDIX W.2 — val())
       ================================================================= */
    function $(id) { return document.getElementById(id); }
    function val(key, fb) {
        var el = document.querySelector('[data-var="' + key + '"]');
        var v = el ? (el.textContent || '').trim() : '';
        if (!v || v.indexOf('{{') === 0) return fb || '';
        return v;
    }
    function srcVal(key, fb) {
        var el = document.querySelector('[data-var="' + key + '"]');
        if (!el) return fb || '';
        var v = (el.getAttribute('data-src') || el.getAttribute('src') || '').trim();
        if (!v || v.indexOf('{{') === 0) return fb || '';
        return v;
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    /* =================================================================
       SPRITE SHEET ASSETS (Bible APPENDIX P) — optional PNG override of the
       procedural graphics. Read URL from the hidden #sw-assets <img data-asset>.
       Empty/unresolved → null → procedural fallback. (Default build is fully
       procedural; the slicing hooks are stubbed for a later asset pass.)
       ================================================================= */
    function assetUrl(name) {
        var el = document.querySelector('#sw-assets img[data-asset="' + name + '"]');
        if (!el) return null;
        var v = (el.getAttribute('src') || '').trim();
        if (!v || v.indexOf('{{') > -1) return null;
        return v;
    }

    var toastTimer;
    function toast(msg, ms) {
        var t = $('sw-toast'); if (!t) return;
        t.innerHTML = msg; t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2200);
    }
    function showError(msg) {
        var c = $('sw-cover');
        if (c) {
            c.classList.add('show');
            c.innerHTML = '<div class="sw-overlay-card"><div class="sw-overlay-pixtitle" style="color:#ff6a6a">GAGAL MEMUAT</div><div class="sw-overlay-text">' + esc(msg) + '</div></div>';
        }
        try { console.error('[spacewar-wedding] ' + msg); } catch (e) {}
    }

    /* copy-to-clipboard for gift buttons (inline onclick=swCopy) */
    window.swCopy = function (id, btn) {
        var el = $(id); if (!el) return;
        var text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : (el.innerText || el.textContent);
        var done = function () { var o = btn.innerHTML; btn.innerHTML = '✔ TERSALIN'; setTimeout(function () { btn.innerHTML = o; }, 1400); };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
        else fallbackCopy(text, done);
    };
    function fallbackCopy(text, cb) {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); cb(); } catch (e) {}
        document.body.removeChild(ta);
    }

    /* =================================================================
       PERSISTENCE (Bible APPENDIX Y / architecture) — versioned + try/catch.
       Persist: unlocked pieces, highest sector, best score, difficulty,
       celebration guards. DO NOT persist cheat (default).
       ================================================================= */
    var STORE = loadStore();
    function loadStore() {
        var def = { unlocked: [], maxSector: 0, best: 0, diff: 'normal', announcedAll: false, completed: false };
        try {
            var raw = localStorage.getItem(CONFIG.storeKey);
            if (!raw) return def;
            var p = JSON.parse(raw);
            return Object.assign(def, p || {});
        } catch (e) { return def; }
    }
    function saveStore() { try { localStorage.setItem(CONFIG.storeKey, JSON.stringify(STORE)); } catch (e) {} }
    function resetStore() {
        try { localStorage.removeItem(CONFIG.storeKey); } catch (e) {}
        STORE = { unlocked: [], maxSector: 0, best: 0, diff: 'normal', announcedAll: false, completed: false };
        saveStore();
    }

    /* =================================================================
       WEDDING LAYER — scan #inv-source for REAL sections (Bible APPENDIX W.3)
       Capsule count is DYNAMIC: never hardcode.
       ================================================================= */
    var INFOS = [];          // [{key,title,el}] in DOM order
    var unlocked = {};       // key -> true
    function scanInfos() {
        INFOS = Array.prototype.slice.call(document.querySelectorAll('#inv-source > section[data-info]'))
            .map(function (s) {
                var k = s.dataset.info;
                return { key: k, title: SECTION_TITLE[k] || k, el: s };
            });
        unlocked = {};
        (STORE.unlocked || []).forEach(function (k) {
            if (INFOS.some(function (i) { return i.key === k; })) unlocked[k] = true;
        });
    }
    function N() { return INFOS.length; }
    function unlockedCount() { return INFOS.filter(function (i) { return unlocked[i.key]; }).length; }
    function allInfoUnlocked() { return N() > 0 && unlockedCount() >= N(); }
    function titleOf(key) { var f = INFOS.filter(function (i) { return i.key === key; })[0]; return f ? f.title : key; }

    /* per-sector capsule quota with auto-scale (Bible APPENDIX X.2) */
    function buildQuota(n) {
        var shape = CONFIG.quotaShape, base = shape.reduce(function (a, b) { return a + b; }, 0);
        var q = shape.map(function (s) { return Math.round(s * n / base); });
        var diff = n - q.reduce(function (a, b) { return a + b; }, 0);
        for (var i = 0; diff !== 0; i = (i + 1) % q.length) {
            if (diff > 0) { q[i]++; diff--; }
            else if (q[i] > 0) { q[i]--; diff++; }
        }
        return q;
    }
    var QUOTA = [];
    function infosForSector(sectorIdx) {
        // deterministic contiguous slice (Bible APPENDIX X.3) — not a running counter
        var start = 0;
        for (var i = 0; i < sectorIdx; i++) start += QUOTA[i];
        return INFOS.slice(start, start + (QUOTA[sectorIdx] || 0));
    }

    /* =================================================================
       INDICATORS + INVENTORY UI (Bible §5)
       ================================================================= */
    function pieceGlyph(key) {
        var g = { hero: '♥', couple: '👰', rsvp: '✓', schedule: '⌚', streaming: '📺', story: '📖',
            gallery: '🖼', happiness: '📸', wishes: '✉', gift: '🎁', closing: '★' };
        return g[key] || '💌';
    }
    function buildIndicators() {
        var inv = $('sw-inv'); if (!inv) return;
        inv.innerHTML = '';
        INFOS.forEach(function (info) {
            var chip = document.createElement('div');
            chip.className = 'sw-inv-chip' + (unlocked[info.key] ? ' is-on' : '');
            chip.title = info.title;
            chip.textContent = pieceGlyph(info.key);
            chip.dataset.key = info.key;
            chip.addEventListener('click', function () { if (unlocked[info.key]) openPieceModal(info.key); });
            inv.appendChild(chip);
        });
        var pt = $('sw-progress-t'); if (pt) pt.textContent = String(N());
        updateProgress();
    }
    function updateProgress() {
        var pn = $('sw-progress-n'); if (pn) pn.textContent = String(unlockedCount());
        var view = $('sw-view-btn');
        if (view) {
            if (allInfoUnlocked() || cheat.on) view.classList.remove('is-locked');
            else view.classList.add('is-locked');
        }
    }
    function lightIndicator(key) {
        var chip = document.querySelector('.sw-inv-chip[data-key="' + key + '"]');
        if (chip) chip.classList.add('is-on');
        updateProgress();
    }

    /* unlock a piece (Bible APPENDIX X.3 — NO auto-open) */
    function unlockInfo(key, silent) {
        if (unlocked[key]) return false;
        unlocked[key] = true;
        if (STORE.unlocked.indexOf(key) < 0) { STORE.unlocked.push(key); saveStore(); }
        lightIndicator(key);
        if (!silent) toast('💌 Kepingan "<b>' + esc(titleOf(key)) + '</b>" terkumpul!');
        if (allInfoUnlocked() && !STORE.announcedAll) announceAllCollected();
        return true;
    }
    function unlockAll(silent) {
        INFOS.forEach(function (i) { unlockInfo(i.key, true); });
        buildIndicators();
        if (!silent) updateProgress();
    }

    /* =================================================================
       MODAL + FULL REVEAL — clone from #inv-source (Bible APPENDIX Z.8)
       ================================================================= */
    function openPieceModal(key) {
        var src = document.querySelector('#inv-source > section[data-info="' + key + '"]');
        if (!src) return;
        var body = $('sw-modal-body'), title = $('sw-modal-title');
        title.textContent = (SECTION_TITLE[key] || key).toUpperCase();
        body.innerHTML = '';
        var clone = src.cloneNode(true);
        clone.style.display = '';
        hydrateImages(clone);
        body.appendChild(clone);
        rewireHostFormsInside(body);
        rewireGalleryInside(body);
        $('sw-modal-root').classList.add('show');
    }
    function closeModal() { $('sw-modal-root').classList.remove('show'); }

    function revealFullInvitation() {
        var scroll = $('sw-reveal-scroll');
        scroll.innerHTML = '';
        INFOS.forEach(function (info) {
            var clone = info.el.cloneNode(true);
            clone.style.display = '';
            hydrateImages(clone);
            scroll.appendChild(clone);
        });
        rewireHostFormsInside(scroll);
        rewireGalleryInside(scroll);
        $('sw-reveal').classList.add('show');
        setMusic(true);   // mirror music intent ON when invitation opens
    }
    function closeReveal() { $('sw-reveal').classList.remove('show'); }

    function hydrateImages(root) {
        var bgs = root.querySelectorAll('.sw-hero-bg[data-src], .sw-closing-bg[data-src]');
        bgs.forEach(function (bg) {
            var u = bg.getAttribute('data-src');
            if (u && u.indexOf('{{') !== 0) bg.style.backgroundImage = "url('" + u + "')";
        });
    }

    /* re-wire host form buttons inside a clone so backend still fires
       (Bible APPENDIX Z.2). IDs stay verbatim; we just (re)attach handlers. */
    function rewireHostFormsInside(root) {
        var rsvp = root.querySelector('#btn-submit-kehadiran');
        if (rsvp) bindOnce(rsvp, function () {
            if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
            var a = root.querySelector('#alert-submit-kehadiran'); if (a) { a.className = 'sw-alert ok'; a.textContent = 'Terima kasih! Konfirmasi tersimpan.'; }
        });
        var ucp = root.querySelector('#btn-submit-ucapan');
        if (ucp) bindOnce(ucp, function () {
            if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
            var nm = (root.querySelector('#wish-name') || {}).value || 'Tamu';
            var msg = (root.querySelector('#wish-message') || {}).value || '';
            var a = root.querySelector('#alert-submit-ucapan'); if (a) { a.className = 'sw-alert ok'; a.textContent = 'Terima kasih atas ucapannya!'; }
            var list = root.querySelector('#sw-wish-list');
            if (list && msg) {
                var it = document.createElement('div'); it.className = 'sw-wish-item';
                it.innerHTML = '<div class="sw-wish-head"><span class="sw-wish-author">' + esc(nm) + '</span><span class="sw-wish-time">baru saja</span></div><div class="sw-wish-text">' + esc(msg) + '</div>';
                list.insertBefore(it, list.firstChild);
            }
        });
    }
    function bindOnce(el, fn) { if (el.__swBound) return; el.__swBound = true; el.addEventListener('click', fn); }
    function rewireGalleryInside(root) {
        var items = root.querySelectorAll('.sw-gallery-item img');
        items.forEach(function (img) {
            if (img.__swBound) return; img.__swBound = true;
            img.parentElement.style.cursor = 'pointer';
            img.parentElement.addEventListener('click', function () {
                var lb = $('sw-lightbox'); $('sw-lightbox-img').src = img.src; lb.classList.add('show');
            });
        });
    }

    /* =================================================================
       CHEAT SYSTEM (Bible APPENDIX Y) — one flag, two realms.
       cheat NOT persisted (default). unlocked + guards ARE persisted.
       ================================================================= */
    var cheat = { on: false };
    function toggleCheat() {
        cheat.on = !cheat.on;
        var btn = $('sw-star-btn'); if (btn) btn.classList.toggle('is-on', cheat.on);
        var ss = $('sw-stagesel-btn'); if (ss) ss.style.display = cheat.on ? '' : 'none';
        if (cheat.on) { unlockAll(); toast('★ CHEAT ON — kebal + semua sektor + undangan terbuka'); }
        else toast('Cheat off — mode jujur kembali');
        updateProgress();
        var sc = scene(); if (sc && sc.ship) sc.ship.cheat = cheat.on;
    }

    /* =================================================================
       CELEBRATION (Bible APPENDIX Z.10) — 2 triggers, beat ~4.5s, persisted
       guards so it never repeats on re-inject.
       ================================================================= */
    function announceAllCollected() {
        if (STORE.announcedAll) return;
        STORE.announcedAll = true; saveStore();
        var sc = scene(); if (sc && sc.celebrate) sc.celebrate('pieces');
        setTimeout(function () {
            var t = $('sw-allpieces-text');
            if (t) t.innerHTML = 'Hebat! Semua kepingan undangan ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'sudah terkumpul. Undangan siap dibuka!';
            showOverlay('sw-allpieces');
        }, 4500);
    }
    function bossFinale() {
        unlockAll(true);
        if (STORE.completed) { revealFullInvitation(); return; }
        STORE.completed = true; saveStore();
        var sc = scene(); if (sc && sc.celebrate) sc.celebrate('boss');
        setTimeout(function () {
            var t = $('sw-win-text');
            if (t) t.innerHTML = 'Selamat! Dua bintang telah disatukan — ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'kini berlayar bersama menembus galaksi. Terima kasih sudah menuntaskan misinya. ' +
                'Buka undangannya sekarang, atau tutup dialog ini dulu.';
            showOverlay('sw-win');
        }, 5000);
    }

    /* =================================================================
       OVERLAY helpers
       ================================================================= */
    function showOverlay(id) { hideOverlays(); var o = $(id); if (o) o.classList.add('show'); }
    function hideOverlays() {
        ['sw-cover', 'sw-loading', 'sw-briefing', 'sw-clear', 'sw-allpieces', 'sw-win', 'sw-stagesel', 'sw-resetconfirm']
            .forEach(function (id) { var o = $(id); if (o) o.classList.remove('show'); });
    }

    /* =================================================================
       MUSIC MIRROR — idempotent (Bible APPENDIX Z.3). NEVER audio.play()
       the tenant backsound. Click #btn-toggle-music only when host state is
       still wrong; intent + generation guard + scheduled retry.
       ================================================================= */
    var musicWanted = false, musicGen = 0;
    function hostMusicPlaying() {
        var pause = $('pause-icon');
        return !!(pause && pause.style.display !== 'none');
    }
    function setMusic(want) {
        musicWanted = want;
        var myGen = ++musicGen;
        (function tryClick(tries) {
            if (myGen !== musicGen) return;
            if (hostMusicPlaying() !== musicWanted) {
                var b = $('btn-toggle-music'); if (b) b.click();
                if (tries < 6) setTimeout(function () { tryClick(tries + 1); }, 260);
            }
        })(0);
    }
    function reflectMusicIcon(playing) {
        var p = $('play-icon'), q = $('pause-icon');
        if (p) p.style.display = playing ? 'none' : '';
        if (q) q.style.display = playing ? '' : 'none';
    }

    /* =================================================================
       SFX — Web Audio internal (Bible §11). Game SFX only; never tenant music.
       ================================================================= */
    var AC = null;
    function audioCtx() {
        if (AC) return AC;
        try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
        return AC;
    }
    function blip(freq, dur, type, vol, slideTo) {
        var ac = audioCtx(); if (!ac) return;
        try {
            var o = ac.createOscillator(), g = ac.createGain();
            o.type = type || 'square';
            var t = ac.currentTime;
            o.frequency.setValueAtTime(freq, t);
            if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
            g.gain.setValueAtTime(vol || 0.04, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(ac.destination);
            o.start(t); o.stop(t + dur + 0.02);
        } catch (e) {}
    }
    var SFX = {
        shoot: function () { blip(680 + (Math.random() * 60 - 30), 0.05, 'square', 0.022, 480); },
        laser: function () { blip(900, 0.08, 'sawtooth', 0.03, 500); },
        missile: function () { blip(300, 0.12, 'sawtooth', 0.04, 120); },
        charge: function () { blip(200, 0.3, 'sine', 0.04, 900); },
        hit:   function () { blip(220, 0.12, 'triangle', 0.05, 90); },
        explode: function () { blip(150, 0.3, 'sawtooth', 0.06, 50); },
        collectP: function () { blip(660, 0.08, 'square', 0.04, 990); },
        collectC: function () { blip(520, 0.12, 'sine', 0.05, 880); setTimeout(function () { blip(820, 0.14, 'sine', 0.05, 1220); }, 90); },
        shield: function () { blip(400, 0.18, 'sine', 0.05, 700); },
        bomb:  function () { blip(80, 0.35, 'sawtooth', 0.07, 40); },
        boss:  function () { blip(110, 0.4, 'sawtooth', 0.07, 70); },
        win:   function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.18, 'square', 0.05); }, i * 130); }); }
    };

    /* =================================================================
       ensurePhaser — host CDN-loads Phaser; fallback self-load (Bible APPENDIX S)
       ================================================================= */
    function ensurePhaser(cb) {
        if (window.Phaser) return cb();
        if (window.__swPhaserLoading) { window.__swPhaserLoading.then(cb); return; }
        window.__swPhaserLoading = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(); showError('Gagal memuat Phaser dari internet. Cek koneksi.'); };
            document.body.appendChild(s);
        });
        window.__swPhaserLoading.then(cb).catch(function () {});
    }

    var GAME = null;
    var defineAndBoot;   // forward decl (real definition appended below)
    function startWhenReady() {
        ensurePhaser(function () {
            if (!window.Phaser) { showError('Phaser tidak termuat (timeout).'); return; }
            defineAndBoot();
        });
    }

    /* ===== KICKOFF ===== */
    function init() {
        try { wireUI(); } catch (e) { try { console.error('[sww] wireUI', e); } catch (e2) {} }
        try { scanInfos(); QUOTA = buildQuota(N()); STORE.diff = STORE.diff || 'normal'; buildIndicators(); } catch (e) {}
        try { wireMusicMirror(); } catch (e) {}
        try { drawCoupleCanvas(); } catch (e) {}
        try { paintSideBg(); } catch (e) {}
        try { var v = $('sw-version'); if (v) v.textContent = VERSION; } catch (e) {}
        try { updateProgress(); } catch (e) {}
        // AUTO-RESUME after a host RE-INJECTION
        try {
            if (window.__swStarted && !(($('sw-reveal') || {}).classList || { contains: function () { return false; } }).contains('show')) {
                var rs = window.__swStarted;
                setTimeout(function () { try { startRun((rs && rs.sector) || 0); } catch (e) {} }, 60);
            }
        } catch (e) {}
    }

    /* =================================================================
       DECORATIVE COUPLE CANVAS (desktop right panel) — Canvas 2D, space vibes:
       captain (suit + tie) + navigator (gown + veil + bouquet) on a space scene,
       nebula, planet, stars, hearts, "JUST MARRIED IN SPACE" banner. (Bible §Z.4)
       ================================================================= */
    function paintSideBg() {
        var bg = $('sw-side-bg'); if (!bg) return;
        var url = srcVal('photo_hero_cover', '');
        if (url) { bg.style.backgroundImage = "url('" + url + "')"; bg.classList.add('has-photo'); }
    }
    function drawCoupleCanvas() {
        var cv = $('sw-couple-canvas'); if (!cv || !cv.getContext) return;
        var x = cv.getContext('2d'); if (!x) return;
        var W = cv.width, H = cv.height, gy = H - 56;
        x.imageSmoothingEnabled = false;
        x.clearRect(0, 0, W, H);

        // deep space gradient
        var sky = x.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0a0c26'); sky.addColorStop(0.5, '#2a1c4a'); sky.addColorStop(1, '#3a2c6a');
        x.fillStyle = sky; x.fillRect(0, 0, W, H);
        // stars
        for (var i = 0; i < 90; i++) {
            var sxp = (i * 73) % W, syp = (i * 137) % (H - 60);
            x.fillStyle = i % 7 === 0 ? '#4fd6ff' : 'rgba(255,255,255,' + (0.3 + (i % 5) * 0.13) + ')';
            x.fillRect(sxp, syp, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
        }
        // big planet
        var pg = x.createRadialGradient(W * 0.78, H * 0.3, 8, W * 0.78, H * 0.3, 70);
        pg.addColorStop(0, '#9a8aff'); pg.addColorStop(0.5, '#5a3c9a'); pg.addColorStop(1, '#241846');
        x.fillStyle = pg; circle(x, W * 0.78, H * 0.3, 60);
        x.strokeStyle = 'rgba(255,212,71,0.4)'; x.lineWidth = 3;
        x.beginPath(); x.ellipse(W * 0.78, H * 0.3, 84, 22, -0.4, 0, 7); x.stroke();
        // moon platform (couple stands on)
        x.fillStyle = '#2a2c52'; x.beginPath(); x.ellipse(W * 0.5, gy + 30, 220, 50, 0, 0, 7); x.fill();
        x.fillStyle = '#3a3c6a'; x.beginPath(); x.ellipse(W * 0.5, gy + 18, 200, 38, 0, Math.PI, 2 * Math.PI); x.fill();

        // hearts floating
        x.fillStyle = 'rgba(255,138,176,0.9)';
        heart(x, W * 0.30, 80, 14); heart(x, W * 0.66, 64, 18); heart(x, W * 0.5, 120, 12);

        var cx = W * 0.5;
        groom(x, cx - 66, gy);    // captain (left, suit)
        bride(x, cx + 66, gy);    // navigator (right, gown + veil)
        x.fillStyle = '#ff4d6a'; heart(x, cx, gy - 116, 22);  // joining heart

        // banner
        x.fillStyle = '#0a0c20'; roundRect(x, cx - 168, 14, 336, 42, 8); x.fill();
        x.strokeStyle = '#4fd6ff'; x.lineWidth = 2; roundRect(x, cx - 168, 14, 336, 42, 8); x.stroke();
        x.fillStyle = '#ffd447'; x.font = 'bold 22px "Courier New", monospace'; x.textAlign = 'center';
        x.fillText('JUST MARRIED IN SPACE', cx, 43);

        function circle(c, X, Y, r) { c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill(); }
        function tri(c, x1, y1, x2, y2, x3, y3) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill(); }
        function roundRect(c, X, Y, w, h, r) { c.beginPath(); c.moveTo(X + r, Y); c.arcTo(X + w, Y, X + w, Y + h, r); c.arcTo(X + w, Y + h, X, Y + h, r); c.arcTo(X, Y + h, X, Y, r); c.arcTo(X, Y, X + w, Y, r); c.closePath(); }
        function heart(c, X, Y, s) { c.save(); c.translate(X, Y); c.beginPath(); c.moveTo(0, s * 0.3); c.bezierCurveTo(s, -s * 0.6, s * 1.2, s * 0.5, 0, s); c.bezierCurveTo(-s * 1.2, s * 0.5, -s, -s * 0.6, 0, s * 0.3); c.fill(); c.restore(); }
        function groom(c, X, gy2) {
            c.fillStyle = '#1a1d3a'; c.fillRect(X - 14, gy2 - 46, 12, 46); c.fillRect(X + 2, gy2 - 46, 12, 46);
            c.fillStyle = '#0c0e1c'; c.fillRect(X - 16, gy2 - 4, 16, 6); c.fillRect(X, gy2 - 4, 16, 6);
            c.fillStyle = '#23264a'; roundRect(c, X - 18, gy2 - 86, 36, 50, 6); c.fill();
            c.fillStyle = '#fff'; c.fillRect(X - 6, gy2 - 86, 12, 40);
            c.fillStyle = '#4fd6ff'; c.beginPath(); c.moveTo(X, gy2 - 84); c.lineTo(X - 5, gy2 - 70); c.lineTo(X, gy2 - 56); c.lineTo(X + 5, gy2 - 70); c.closePath(); c.fill();
            c.fillStyle = '#14163a'; tri(c, X - 18, gy2 - 86, X - 2, gy2 - 86, X - 10, gy2 - 60); tri(c, X + 18, gy2 - 86, X + 2, gy2 - 86, X + 10, gy2 - 60);
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#2a2218'; c.fillRect(X - 12, gy2 - 116, 24, 9);
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
            // helmet ring glint
            c.strokeStyle = 'rgba(79,214,255,0.5)'; c.lineWidth = 2; c.beginPath(); c.arc(X, gy2 - 100, 15, 0, 7); c.stroke();
        }
        function bride(c, X, gy2) {
            c.fillStyle = '#f3ead2'; c.beginPath(); c.moveTo(X - 28, gy2); c.lineTo(X - 10, gy2 - 60); c.lineTo(X + 10, gy2 - 60); c.lineTo(X + 28, gy2); c.closePath(); c.fill();
            c.fillStyle = '#fff8e4'; roundRect(c, X - 11, gy2 - 86, 22, 30, 6); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(X - 16, gy2 - 104); c.lineTo(X + 16, gy2 - 104); c.lineTo(X + 22, gy2 - 50); c.lineTo(X - 22, gy2 - 50); c.closePath(); c.fill();
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#6a4a2a'; c.fillRect(X - 13, gy2 - 116, 26, 11);
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
            c.fillStyle = '#ff8ab0'; c.beginPath(); c.arc(X - 3, gy2 - 95, 2, 0, 7); c.fill(); c.beginPath(); c.arc(X + 5, gy2 - 95, 2, 0, 7); c.fill();
            c.fillStyle = '#3a7d4a'; c.fillRect(X - 4, gy2 - 58, 8, 14);
            c.fillStyle = '#ff8ab0'; [[X - 4, gy2 - 58], [X + 4, gy2 - 58], [X, gy2 - 64]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 5, 0, 7); c.fill(); });
        }
    }

    init();

    /* =================================================================
       UI WIRING (overlays, buttons, difficulty, stage-select, reset)
       ================================================================= */
    function wireUI() {
        function pickDiff(d) {
            STORE.diff = d; saveStore();
            document.querySelectorAll('.sw-diff-opt').forEach(function (b) { b.classList.toggle('is-sel', b.dataset.diff === d); });
            var badge = $('sw-diff-badge');
            if (badge) { badge.textContent = d.toUpperCase(); badge.dataset.lvl = d; }
        }
        pickDiff(STORE.diff);

        function start() { startRun(0); }

        var ACTIONS = {
            'sw-start': start,
            'sw-side-open': openInvitationDirect,
            'sw-cover-view': openInvitationDirect,
            'sw-allpieces-view': function () { hideOverlays(); revealFullInvitation(); },
            'sw-allpieces-keep': function () { hideOverlays(); resumeGame(); },
            'sw-win-view': function () { hideOverlays(); revealFullInvitation(); },
            'sw-win-close': function () { hideOverlays(); resumeGame(); },
            'sw-view-btn': function () {
                if (allInfoUnlocked() || cheat.on) revealFullInvitation();
                else toast('Kumpulkan semua kapsul 💌 dulu — atau tekan ★ untuk buka langsung');
            },
            'sw-star-btn': toggleCheat,
            'sw-stagesel-btn': openStageSelect,
            'sw-stagesel-ok': function () { hideOverlays(); startRun(pendingStage); },
            'sw-stagesel-close': function () { hideOverlays(); resumeGame(); },
            'sw-reset-btn': function () { showOverlay('sw-resetconfirm'); pauseGame(); },
            'sw-reset-yes': function () { resetGame(); },
            'sw-reset-no': function () { hideOverlays(); resumeGame(); },
            'sw-briefing-go': function () { beginSector(); },
            'sw-clear-next': function () { hideOverlays(); nextSector(); },
            'sw-modal-close': closeModal,
            'sw-reveal-close': closeReveal,
            'sw-lightbox-close': function () { var lb = $('sw-lightbox'); if (lb) lb.classList.remove('show'); }
        };
        var delegated = function (e) {
            var t = e.target;
            if (!t || !t.closest) return;
            var diffBtn = t.closest('.sw-diff-opt');
            if (diffBtn && diffBtn.dataset.diff) { pickDiff(diffBtn.dataset.diff); return; }
            for (var id in ACTIONS) { if (t.closest('#' + id)) { ACTIONS[id](); return; } }
            if (t.id === 'sw-modal-root') { closeModal(); return; }
            if (t.id === 'sw-lightbox') { t.classList.remove('show'); return; }
        };
        // CAPTURE PHASE (host intercepts some clicks in capture phase). De-dupe via global guard.
        if (window.__swDelegated) { try { document.removeEventListener('click', window.__swDelegated, true); } catch (e) {} }
        window.__swDelegated = delegated;
        document.addEventListener('click', delegated, true);
        onCleanup(function () {
            document.removeEventListener('click', delegated, true);
            if (window.__swDelegated === delegated) window.__swDelegated = null;
        });
        window.__swStart = function () { try { startRun(0); } catch (e) {} };
    }

    function openInvitationDirect() { unlockAll(true); buildIndicators(); hideOverlays(); revealFullInvitation(); }

    var pendingStage = 0;
    function openStageSelect() {
        pendingStage = Math.min(runState.sector || 0, STORE.maxSector);
        var grid = $('sw-stagesel-grid'); grid.innerHTML = '';
        function paintSel() {
            grid.querySelectorAll('.sw-stagesel-cell').forEach(function (c) { c.classList.toggle('is-sel', +c.dataset.idx === pendingStage); });
        }
        for (var i = 0; i < CONFIG.sectors; i++) {
            (function (idx) {
                var cell = document.createElement('button');
                var unlockedSector = cheat.on || idx <= STORE.maxSector;
                var isBoss = idx === CONFIG.sectors - 1;
                cell.className = 'sw-stagesel-cell' + (unlockedSector ? '' : ' is-locked') + (isBoss ? ' is-boss' : '');
                cell.dataset.idx = idx; cell.type = 'button';
                var num = (idx + 1 < 10 ? '0' : '') + (idx + 1);
                cell.innerHTML =
                    '<span class="sw-stagesel-no">' + num + '</span>' +
                    '<span class="sw-stagesel-name">' + esc(SECTOR_NAMES[idx]) + '</span>' +
                    '<span class="sw-stagesel-badge">' + (unlockedSector ? (isBoss ? '☠ BOSS' : '▶ GO') : '🔒 TERKUNCI') + '</span>';
                if (unlockedSector) cell.addEventListener('click', function () { pendingStage = idx; paintSel(); });
                grid.appendChild(cell);
            })(i);
        }
        paintSel();
        showOverlay('sw-stagesel'); pauseGame();
    }

    /* =================================================================
       INPUT MODEL (keyboard + touch → one abstraction) — Bible §4.5
       ================================================================= */
    var input = { left: false, right: false, up: false, down: false, fire: false, charge: false, bomb: false, bombEdge: false, swap: false, swapEdge: false };
    var _prevBomb = false, _prevSwap = false;
    function pollEdges() {
        input.bombEdge = input.bomb && !_prevBomb; _prevBomb = input.bomb;
        input.swapEdge = input.swap && !_prevSwap; _prevSwap = input.swap;
    }
    var _inputWired = false;
    function wireInputOnce() { if (_inputWired) return; _inputWired = true; wireInput(); }
    function wireInput() {
        var down = function (e) {
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': input.left = true; break;
                case 'ArrowRight': case 'KeyD': input.right = true; break;
                case 'ArrowUp': case 'KeyW': input.up = true; break;
                case 'ArrowDown': case 'KeyS': input.down = true; break;
                case 'KeyX': case 'Space': input.fire = true; if (e.code === 'Space') e.preventDefault(); break;
                case 'ShiftLeft': case 'ShiftRight': input.charge = true; break;
                case 'KeyC': case 'KeyB': input.bomb = true; break;
                case 'KeyZ': input.swap = true; break;
            }
        };
        var up = function (e) {
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': input.left = false; break;
                case 'ArrowRight': case 'KeyD': input.right = false; break;
                case 'ArrowUp': case 'KeyW': input.up = false; break;
                case 'ArrowDown': case 'KeyS': input.down = false; break;
                case 'KeyX': case 'Space': input.fire = false; break;
                case 'ShiftLeft': case 'ShiftRight': input.charge = false; break;
                case 'KeyC': case 'KeyB': input.bomb = false; break;
                case 'KeyZ': input.swap = false; break;
            }
        };
        window.addEventListener('keydown', down); window.addEventListener('keyup', up);
        onCleanup(function () { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });

        holdBtn('sw-fire', function (v) { input.fire = v; });
        holdBtn('sw-charge', function (v) { input.charge = v; });
        tapBtn('sw-nade', function () { input.bomb = true; setTimeout(function () { input.bomb = false; }, 80); });
        wireJoystick();
    }
    function holdBtn(id, set) {
        var el = $(id); if (!el) return;
        var on = function (e) { e.preventDefault(); set(true); };
        var off = function (e) { e.preventDefault(); set(false); };
        el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off);
        el.addEventListener('touchcancel', off); el.addEventListener('mousedown', on); window.addEventListener('mouseup', off);
        onCleanup(function () { el.removeEventListener('touchstart', on); el.removeEventListener('touchend', off); el.removeEventListener('mousedown', on); window.removeEventListener('mouseup', off); });
    }
    function tapBtn(id, fn) {
        var el = $(id); if (!el) return;
        var h = function (e) { e.preventDefault(); fn(); };
        el.addEventListener('touchstart', h, { passive: false }); el.addEventListener('mousedown', h);
        onCleanup(function () { el.removeEventListener('touchstart', h); el.removeEventListener('mousedown', h); });
    }
    function wireJoystick() {
        var joy = $('sw-joy'), nub = $('sw-joy-nub'); if (!joy || !nub) return;
        var active = false, cx = 0, cy = 0, R = 40;
        function center() { var r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2 - 8; }
        function setFrom(px, py) {
            var dx = px - cx, dy = py - cy, dist = Math.hypot(dx, dy) || 1, k = Math.min(1, dist / R);
            var nx = dx / dist * k * R, ny = dy / dist * k * R;
            nub.style.transform = 'translate(' + nx + 'px,' + ny + 'px)';
            input.left = dx < -R * 0.3; input.right = dx > R * 0.3;
            input.up = dy < -R * 0.3; input.down = dy > R * 0.3;
        }
        function reset() { nub.style.transform = 'translate(0,0)'; input.left = input.right = input.up = input.down = false; }
        var start = function (e) { e.preventDefault(); active = true; center(); var t = e.touches ? e.touches[0] : e; setFrom(t.clientX, t.clientY); };
        var move = function (e) { if (!active) return; e.preventDefault(); var t = e.touches ? e.touches[0] : e; setFrom(t.clientX, t.clientY); };
        var end = function () { active = false; reset(); };
        joy.addEventListener('touchstart', start, { passive: false }); joy.addEventListener('touchmove', move, { passive: false });
        joy.addEventListener('touchend', end); joy.addEventListener('touchcancel', end);
        joy.addEventListener('mousedown', start); window.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
        onCleanup(function () {
            joy.removeEventListener('touchstart', start); joy.removeEventListener('touchmove', move); joy.removeEventListener('touchend', end);
            joy.removeEventListener('mousedown', start); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', end);
        });
    }

    function wireMusicMirror() {
        var bg = $('bg-music');
        if (bg) {
            var onPlay = function () { reflectMusicIcon(true); };
            var onPause = function () { reflectMusicIcon(false); };
            bg.addEventListener('play', onPlay); bg.addEventListener('pause', onPause);
            onCleanup(function () { bg.removeEventListener('play', onPlay); bg.removeEventListener('pause', onPause); });
        }
        var btn = $('btn-toggle-music');
        if (btn) {
            var h = function () { musicWanted = !hostMusicPlaying(); };
            btn.addEventListener('click', h);
            onCleanup(function () { btn.removeEventListener('click', h); });
        }
    }

    /* =================================================================
       RUN CONTROL — bridges UI to the Phaser scene.
       ================================================================= */
    var runState = { sector: 0, score: 0 };
    function startRun(sector) {
        showOverlay('sw-loading');
        runState.sector = sector;
        if (sector === 0) runState.score = 0;
        try { window.__swStarted = { sector: sector }; } catch (e) {}
        wireInputOnce();
        startWhenReady();
    }
    function resetGame() {
        resetStore();
        try { window.__swStarted = null; } catch (e) {}
        if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__gwGame = null; }
        runState = { sector: 0, score: 0 };
        cheat.on = false;
        var sb = $('sw-star-btn'); if (sb) sb.classList.remove('is-on');
        var ss = $('sw-stagesel-btn'); if (ss) ss.style.display = 'none';
        scanInfos(); QUOTA = buildQuota(N()); buildIndicators(); updateProgress();
        document.querySelectorAll('.sw-diff-opt').forEach(function (b) { b.classList.toggle('is-sel', b.dataset.diff === 'normal'); });
        var badge = $('sw-diff-badge'); if (badge) { badge.textContent = 'NORMAL'; badge.dataset.lvl = 'normal'; }
        hideOverlays(); showOverlay('sw-cover');
        toast('Game direset — pilih kesulitan & mulai lagi');
    }
    function pauseGame() { var sc = scene(); if (sc) sc.scene.pause(); }
    function resumeGame() { var sc = scene(); if (sc && sc.scene.isPaused()) sc.scene.resume(); }
    function scene() { return GAME && GAME.scene ? GAME.scene.getScene('Game') : null; }
    function beginSector() { var sc = scene(); if (sc && sc.loadSector) sc.loadSector(runState.sector); }
    function nextSector() {
        runState.sector++;
        if (runState.sector >= CONFIG.sectors) return;
        if (runState.sector > STORE.maxSector) { STORE.maxSector = runState.sector; saveStore(); }
        var sc = scene(); if (sc && sc.loadSector) sc.loadSector(runState.sector);
    }

    /* =================================================================
       PART 2 — PHASER GAME. Defined now that helpers exist; booted by
       startWhenReady(). SHMUP: gravity y:0, free-flight ship, auto-scroll.
       ================================================================= */
    defineAndBoot = function () {
        var P = window.Phaser;

        /* ---------- procedural textures (Bible APPENDIX T.5 — shaded, guard restart) ---------- */
        function tex(scene, key, w, h, draw) {
            if (scene.textures.exists(key)) return;
            var g = scene.make.graphics({ x: 0, y: 0 }, false);
            draw(g, w, h);
            g.generateTexture(key, w, h);
            g.destroy();
        }
        function buildTextures(scene) {
            function box(g, x, y, w, h, base, hi, sh) {
                g.fillStyle(base, 1); g.fillRect(x, y, w, h);
                if (hi != null) { g.fillStyle(hi, 1); g.fillRect(x, y, w, Math.max(1, h * 0.22 | 0)); }
                if (sh != null) { g.fillStyle(sh, 1); g.fillRect(x, y + h - Math.max(1, h * 0.22 | 0), w, Math.max(1, h * 0.22 | 0)); }
            }
            function outline(g, x, y, w, h, col) { g.lineStyle(2, col != null ? col : 0x0a0e1a, 1); g.strokeRect(x, y, w, h); }

            // ---- PLAYER SHIP (faces UP) — cyan hull, glass cockpit, exhaust below ----
            function drawShip(g, opt) {
                opt = opt || {}; var ex = opt.ex || 0;   // exhaust length 0..3 (below)
                // exhaust flame (behind, bottom)
                if (ex > 0) {
                    g.fillStyle(0xff8a3d, 0.9); g.fillTriangle(12, 34, 24, 34, 18, 34 + ex * 4);
                    g.fillStyle(0xffd447, 0.95); g.fillTriangle(13, 32, 23, 32, 18, 32 + ex * 3);
                }
                // hull (vertical body)
                box(g, 12, 6, 12, 30, 0x3a7dff, 0x7fb0ff, 0x1c3c8a);
                g.fillStyle(0x9bd0ff, 1); g.fillTriangle(12, 6, 24, 6, 18, -6 + 6);   // nose up
                g.fillStyle(0x9bd0ff, 1); g.fillTriangle(12, 6, 24, 6, 18, 0);
                // wings (left/right)
                g.fillStyle(0x2a5cc0, 1); g.fillTriangle(12, 8, 2, 18, 12, 24); g.fillTriangle(24, 8, 34, 18, 24, 24);
                g.fillStyle(0x6a90e0, 1); g.fillTriangle(12, 10, 5, 17, 12, 21); g.fillTriangle(24, 10, 31, 17, 24, 21);
                // cockpit glass
                g.fillStyle(0x4fd6ff, 1); g.fillCircle(18, 16, 5);
                g.fillStyle(0xeaffff, 1); g.fillCircle(16, 14, 2);
                outline(g, 12, 6, 12, 30);
            }
            tex(scene, 't_ship', 36, 50, function (g) { drawShip(g, { ex: 1 }); });
            tex(scene, 't_ship0', 36, 50, function (g) { drawShip(g, { ex: 1 }); });
            tex(scene, 't_ship1', 36, 50, function (g) { drawShip(g, { ex: 2 }); });
            tex(scene, 't_ship2', 36, 50, function (g) { drawShip(g, { ex: 3 }); });
            tex(scene, 't_ship_hurt', 36, 50, function (g) {
                g.fillStyle(0xff6a6a, 1); g.fillRect(12, 6, 12, 30);
                g.fillStyle(0xffcaca, 1); g.fillTriangle(12, 6, 24, 6, 18, 0);
                g.lineStyle(2, 0x0a0e1a, 1); g.strokeRect(12, 6, 12, 30);
            });

            // ---- PROJECTILES (vertical) ----
            tex(scene, 't_pbullet', 6, 14, function (g) { g.fillStyle(0xeaffff, 1); g.fillRect(0, 0, 6, 14); g.fillStyle(0x4fd6ff, 1); g.fillRect(1, 0, 4, 14); g.fillStyle(0xffffff, 1); g.fillRect(1, 0, 4, 5); });
            tex(scene, 't_laser', 5, 26, function (g) { g.fillStyle(0xeaffff, 1); g.fillRect(0, 0, 5, 26); g.fillStyle(0x9bffd0, 1); g.fillRect(1, 0, 3, 26); });
            tex(scene, 't_pmissile', 8, 14, function (g) { g.fillStyle(0xd0d8ff, 1); g.fillRect(1, 3, 6, 11); g.fillStyle(0x4fd6ff, 1); g.fillTriangle(0, 3, 4, 0, 8, 3); g.fillStyle(0xff8a3d, 1); g.fillRect(3, 11, 2, 3); });
            tex(scene, 't_ebullet', 9, 9, function (g) { g.fillStyle(0xffb627, 1); g.fillCircle(4.5, 4.5, 4.5); g.fillStyle(0xff5a4d, 1); g.fillCircle(4.5, 4.5, 3); g.fillStyle(0xfff, 0.85); g.fillCircle(3, 3, 1.3); });
            tex(scene, 't_erocket', 9, 18, function (g) { g.fillStyle(0xc0c0c8, 1); g.fillRect(1, 4, 7, 14); g.fillStyle(0xff4d4d, 1); g.fillTriangle(0, 4, 4, 0, 9, 4); g.fillStyle(0xffd447, 1); g.fillRect(3, 14, 3, 4); });
            tex(scene, 't_spark', 7, 7, function (g) { g.fillStyle(0xffffff, 1); g.fillCircle(3.5, 3.5, 3.5); g.fillStyle(0xffd447, 1); g.fillCircle(3.5, 3.5, 2); });
            tex(scene, 't_heart', 11, 11, function (g) { g.fillStyle(0xff8ab0, 1); g.fillCircle(3.2, 4, 3.2); g.fillCircle(7.8, 4, 3.2); g.fillTriangle(0.5, 5, 10.5, 5, 5.5, 11); });

            // ---- ENEMIES (face DOWN, toward player below) ----
            tex(scene, 't_e_drone', 24, 30, function (g) {
                box(g, 6, 4, 12, 22, 0xc04a4a, 0xe06a6a, 0x802424);
                g.fillStyle(0x9bd0ff, 1); g.fillCircle(12, 10, 3);       // sensor eye (cyan)
                g.fillStyle(0xff5a4d, 1); g.fillCircle(12, 10, 1.5);
                g.fillStyle(0x802424, 1); g.fillTriangle(6, 26, 18, 26, 12, 30);   // point down
                g.fillStyle(0xff8a3d, 0.8); g.fillCircle(12, 4, 2);      // thruster (top)
                outline(g, 6, 4, 12, 22);
            });
            tex(scene, 't_e_turret', 28, 34, function (g) {
                box(g, 8, 4, 18, 26, 0x6a4a9c, 0x8a6abc, 0x402a6a);
                g.fillStyle(0x2a1a4a, 1); g.fillRect(12, 0, 6, 8);       // barrel (faces down)
                g.fillStyle(0xff4d4d, 1); g.fillRect(14, 0, 2, 4);
                g.fillStyle(0xffd447, 1); g.fillCircle(16, 20, 3);       // core light
                outline(g, 8, 4, 18, 26);
            });
            tex(scene, 't_e_korvet', 30, 44, function (g) {
                box(g, 8, 8, 16, 32, 0xd06a2a, 0xf08a4a, 0x8a4418);
                g.fillStyle(0x8a4418, 1); g.fillTriangle(8, 8, 22, 8, 15, 0);   // nose-down? draw point down
                g.fillStyle(0x8a4418, 1); g.fillTriangle(8, 40, 22, 40, 15, 44);
                g.fillStyle(0x4a2a6a, 1); g.fillRect(4, 20, 5, 12);
                g.fillStyle(0x9bd0ff, 1); g.fillCircle(16, 26, 4);
                g.fillStyle(0xff8a3d, 0.8); g.fillCircle(16, 8, 2);
                outline(g, 8, 8, 16, 32);
            });
            tex(scene, 't_e_flyer', 22, 30, function (g) {
                g.fillStyle(0xb03a8a, 1); g.fillTriangle(11, 30, 2, 4, 20, 4);   // point DOWN
                g.fillStyle(0xd05aaa, 1); g.fillTriangle(11, 22, 5, 6, 17, 6);
                g.fillStyle(0xff5a4d, 1); g.fillCircle(11, 8, 2);
                outline(g, 2, 4, 18, 26);
            });
            tex(scene, 't_e_carrier', 44, 64, function (g) {
                box(g, 8, 6, 28, 54, 0x4a4a6a, 0x6a6a8a, 0x2a2a4a);
                g.fillStyle(0x2a2a4a, 1); g.fillTriangle(8, 60, 36, 60, 22, 64);   // bow down
                g.fillStyle(0x1a1a2a, 1); g.fillRect(14, 44, 16, 8);     // drone bay (bottom)
                g.fillStyle(0xff4d4d, 1); g.fillCircle(22, 24, 4);
                g.fillStyle(0xffd447, 1); g.fillCircle(22, 24, 2);
                outline(g, 8, 6, 28, 54);
            });
            tex(scene, 't_e_mech', 40, 56, function (g) {
                box(g, 8, 6, 24, 44, 0x5a6a3a, 0x7a8a5a, 0x3a4a22);
                g.fillStyle(0x2a2a2a, 1); g.fillRect(16, 50, 6, 6);      // cannon-down
                g.fillStyle(0xff4d4d, 1); g.fillRect(18, 52, 2, 4);
                g.fillStyle(0x9bd0ff, 1); g.fillCircle(20, 22, 4);
                g.fillStyle(0x111, 1); g.fillCircle(8, 18, 5); g.fillCircle(8, 40, 5);
                g.fillStyle(0x555, 1); g.fillCircle(8, 18, 2); g.fillCircle(8, 40, 2);
                outline(g, 8, 6, 24, 44);
            });
            tex(scene, 't_e_mine', 22, 22, function (g) {
                g.fillStyle(0x8a8a3a, 1); g.fillCircle(11, 11, 9);
                g.fillStyle(0xaaaa5a, 1); g.fillCircle(9, 9, 4);
                for (var i = 0; i < 8; i++) { var a = i / 8 * 6.28; g.fillStyle(0x5a5a2a, 1); g.fillRect(11 + Math.cos(a) * 9 - 1, 11 + Math.sin(a) * 9 - 1, 3, 3); }
                g.fillStyle(0xff4d4d, 1); g.fillCircle(11, 11, 2);
            });

            // ---- HAZARDS ----
            tex(scene, 't_asteroid', 40, 38, function (g) {
                g.fillStyle(0x6a5a4a, 1); g.fillCircle(20, 19, 18);
                g.fillStyle(0x8a7a6a, 1); g.fillCircle(14, 13, 7);
                g.fillStyle(0x4a3a2a, 1); g.fillCircle(26, 24, 5); g.fillCircle(12, 26, 3);
                g.lineStyle(2, 0x2a1e14, 1); g.strokeCircle(20, 19, 18);
            });
            tex(scene, 't_asteroid_s', 22, 20, function (g) {
                g.fillStyle(0x6a5a4a, 1); g.fillCircle(11, 10, 9);
                g.fillStyle(0x8a7a6a, 1); g.fillCircle(8, 7, 3);
                g.lineStyle(1, 0x2a1e14, 1); g.strokeCircle(11, 10, 9);
            });
            tex(scene, 't_barel', 26, 30, function (g) {
                box(g, 3, 2, 20, 26, 0x4a8a8a, 0x6aaaaa, 0x2a5a5a);
                g.fillStyle(0x2a4a4a, 1); g.fillRect(3, 8, 20, 3); g.fillRect(3, 20, 20, 3);
                g.fillStyle(0xff4d4d, 1); g.fillCircle(13, 15, 4); g.fillStyle(0xffd447, 1); g.fillCircle(13, 15, 2);
                outline(g, 3, 2, 20, 26, 0x1a3a3a);
            });
            tex(scene, 't_lasergate', 200, 16, function (g) {   // HORIZONTAL beam (spans width)
                g.fillStyle(0xff4d4d, 0.9); g.fillRect(0, 4, 200, 8);
                g.fillStyle(0xffcaca, 0.9); g.fillRect(0, 6, 200, 4);
            });
            tex(scene, 't_capsule_blue', 22, 16, function (g) {
                box(g, 0, 0, 22, 16, 0x2a6aff, 0x6a9aff, 0x1a3a8a);
                g.fillStyle(0xeaffff, 1); g.fillRect(8, 4, 6, 8);
                outline(g, 0, 0, 22, 16, 0x102a6a);
            });

            // ---- INVITATION CAPSULE (gold 💌) ----
            tex(scene, 't_amplop', 30, 24, function (g) {
                box(g, 0, 0, 30, 24, 0xffd447, 0xfff0a0, 0xc79410);
                g.lineStyle(2, 0xc04a2a, 1); g.beginPath(); g.moveTo(1, 1); g.lineTo(15, 13); g.lineTo(29, 1); g.strokePath();
                g.fillStyle(0xff4d6a, 1); g.fillCircle(15, 14, 4);
                g.fillStyle(0xff4d6a, 1); g.fillCircle(13, 13, 2.2); g.fillCircle(17, 13, 2.2);
                outline(g, 0, 0, 30, 24, 0xa07410);
            });

            // ---- BOSS — Wedding Station fortress (faces DOWN; core weak-point at bottom) ----
            tex(scene, 't_boss', 220, 170, function (g) {
                box(g, 35, 10, 150, 110, 0x5a3a8a, 0x7a5aaa, 0x3a1a6a);     // body (wide, top)
                box(g, 55, 120, 110, 30, 0x6a4a9a, 0x8a6aba, 0x4a2a7a);     // lower turret deck
                g.fillStyle(0x1a0a3a, 1); g.fillRect(70, 150, 8, 14); g.fillRect(142, 150, 8, 14);   // muzzles (down)
                g.fillStyle(0xff4d4d, 1); g.fillRect(72, 158, 4, 6); g.fillRect(144, 158, 4, 6);
                // ring decoration (station)
                g.lineStyle(4, 0xffd447, 0.7); g.strokeCircle(110, 80, 70);
                g.fillStyle(0x10140d, 1); g.fillRect(55, 50, 12, 14); g.fillRect(153, 50, 12, 14);  // ports
                // weak-point core (glowing, bottom-center toward player)
                g.fillStyle(0xffd447, 1); g.fillCircle(110, 120, 22);
                g.fillStyle(0xfff4b0, 1); g.fillCircle(110, 120, 12);
                g.fillStyle(0xffffff, 1); g.fillCircle(106, 116, 4);
                g.lineStyle(3, 0x0a0e1a, 1); g.strokeRect(35, 10, 150, 110);
            });
            // united couple (boss reward sprite)
            tex(scene, 't_couple', 60, 80, function (g) {
                box(g, 6, 28, 16, 48, 0x23264a, 0x3a3e6a, 0x14163a);   // groom suit
                g.fillStyle(0xfff, 1); g.fillRect(11, 30, 6, 24);
                g.fillStyle(0x4fd6ff, 1); g.fillRect(13, 30, 2, 14);
                box(g, 9, 14, 10, 12, 0xf3d2a0, 0xffe6c0, 0xd0a878); g.fillStyle(0x2a2218, 1); g.fillRect(9, 12, 10, 5);
                box(g, 34, 30, 18, 46, 0xf3ead2, 0xfff8e4, 0xd8caa8);   // bride gown
                g.fillStyle(0xffffff, 0.7); g.fillRect(33, 16, 20, 20);
                box(g, 38, 14, 10, 12, 0xf3d2a0, 0xffe6c0, 0xd0a878); g.fillStyle(0x6a4a2a, 1); g.fillRect(37, 12, 12, 5);
                g.fillStyle(0xff8ab0, 1); g.fillCircle(43, 40, 3);
            });

            // ---- BACKDROP PROPS ----
            tex(scene, 't_star', 3, 3, function (g) { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 3, 3); });
            tex(scene, 't_planet', 200, 200, function (g) {
                g.fillStyle(0x3a2c7a, 1); g.fillCircle(100, 100, 90);
                g.fillStyle(0x5a4caa, 1); g.fillCircle(78, 78, 40);
                g.fillStyle(0x2a1c5a, 1); g.fillCircle(130, 120, 28);
                g.lineStyle(6, 0xffd447, 0.4); g.strokeCircle(100, 100, 90);
            });
            tex(scene, 't_wreck', 160, 90, function (g) {
                box(g, 10, 30, 130, 36, 0x3a4a5a, 0x5a6a7a, 0x222e3a);
                g.fillStyle(0x222e3a, 1); g.fillTriangle(140, 30, 160, 48, 140, 66);
                g.fillStyle(0x6a7a8a, 1); g.fillRect(30, 36, 80, 6);
                g.fillStyle(0xff8a3d, 0.5); g.fillCircle(50, 48, 8);   // smouldering
                g.lineStyle(2, 0x10140d, 1); g.strokeRect(10, 30, 130, 36);
            });
            tex(scene, 't_station', 180, 200, function (g) {
                g.lineStyle(8, 0x6a5a9a, 1); g.strokeCircle(90, 100, 80);
                g.fillStyle(0x4a3a7a, 1); g.fillRect(60, 70, 60, 60);
                g.fillStyle(0xffd447, 0.6); g.fillCircle(90, 100, 16);
                for (var i = 0; i < 8; i++) { var a = i / 8 * 6.28; g.fillStyle(0x9bd0ff, 0.7); g.fillCircle(90 + Math.cos(a) * 80, 100 + Math.sin(a) * 80, 4); }
            });
        }

        /* boot params measured from real DOM size (Bible APPENDIX T.1) */
        var stageEl = $('gw-stage');
        if (!stageEl) { showError('Elemen #gw-stage tidak ditemukan.'); return; }
        var rect = stageEl.getBoundingClientRect();
        var BW = Math.max(320, Math.round(rect.width));
        var BH = Math.max(480, Math.round(rect.height));
        CONFIG.BW = BW; CONFIG.BH = BH;
        var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        // VERTICAL: field spans almost the whole frame. Top margin clears the HUD; bottom
        // margin clears the touch controls so the bottom-center ship stays visible & tappable.
        CONFIG.PLAY_TOP = 70;
        CONFIG.PLAY_BOTTOM = BH - (isTouch ? 180 : 120);   // ship sits just above the controls
        CONFIG.PLAY_LEFT = 24;
        CONFIG.PLAY_RIGHT = BW - 24;

        var GameScene = makeGameScene(P, buildTextures, BW, BH);
        var config = {
            type: P.AUTO, parent: 'gw-stage', width: BW, height: BH,
            backgroundColor: '#05060f',
            render: { pixelArt: true, antialias: false, roundPixels: true },
            scale: { mode: P.Scale.FIT, autoCenter: P.Scale.CENTER_BOTH },
            physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },   // SHMUP: no gravity
            scene: [GameScene]
        };
        if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
        GAME = new P.Game(config);
        window.__gwGame = GAME;
        onCleanup(function () { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__gwGame = null; });
    };

    /* =================================================================
       PART 3 — GameScene factory.
       update order: Input→State→Movement→Action→Animation→Collision→Camera→UI
       ================================================================= */
    function makeGameScene(P, buildTextures, BW, BH) {
        var C = CONFIG;

        function GameScene() { P.Scene.call(this, { key: 'Game' }); }
        GameScene.prototype = Object.create(P.Scene.prototype);
        GameScene.prototype.constructor = GameScene;

        GameScene.prototype.create = function () {
            var self = this;
            buildTextures(this);
            this.buildAnims();

            this.diff = C.diff[STORE.diff];
            this.score = runState.score || 0;
            this.cheatOn = cheat.on;
            this.trauma = 0;
            this.freezeUntil = 0;
            this.sectorIdx = runState.sector || 0;
            this.PLAY_TOP = C.PLAY_TOP; this.PLAY_BOTTOM = C.PLAY_BOTTOM;
            this.PLAY_LEFT = C.PLAY_LEFT; this.PLAY_RIGHT = C.PLAY_RIGHT;

            // pools (Bible APPENDIX T.4)
            this.bullets = this.physics.add.group({ maxSize: 80, allowGravity: false });
            this.ebullets = this.physics.add.group({ maxSize: 80, allowGravity: false });
            this.enemies = this.physics.add.group({ allowGravity: false });
            this.hazards = this.physics.add.group({ allowGravity: false });
            this.capsules = this.physics.add.group({ allowGravity: false });   // gold 💌 + blue power
            this.pickFx = this.add.group();

            // particles (API 3.60+)
            this.pSpark = this.add.particles(0, 0, 't_spark', { speed: { min: -200, max: 200 }, scale: { start: 0.8, end: 0 }, lifespan: 480, blendMode: 'ADD', emitting: false });
            this.pHeart = this.add.particles(0, 0, 't_heart', { speed: { min: -120, max: 120 }, scale: { start: 1, end: 0 }, lifespan: 700, emitting: false });

            // ship — VERTICAL: bottom-center of the play field
            this.ship = new Ship(this, BW / 2, this.PLAY_BOTTOM - 40);
            this.add.existing(this.ship); this.physics.add.existing(this.ship);
            this.ship.init(); this.ship.cheat = this.cheatOn;

            // collisions — all overlap (no solids in a shmup)
            this.physics.add.overlap(this.bullets, this.enemies, function (b, e) { self.hitEnemy(b, e); });
            this.physics.add.overlap(this.bullets, this.hazards, function (b, h) { self.hitHazard(b, h); });
            this.physics.add.overlap(this.bullets, this.capsules, function (b, c) { if (c.getData('kind') === 'piece') self.collectCapsule(c); self.killBullet(b); });
            this.physics.add.overlap(this.ship, this.capsules, function (sh, c) { self.collectCapsule(c); });
            this.physics.add.overlap(this.ship, this.enemies, function (sh, e) { if (e.getData('type') !== 'barel') self.shipHit(); });
            this.physics.add.overlap(this.ship, this.ebullets, function (sh, b) { self.killEBullet(b); self.shipHit(); });
            this.physics.add.overlap(this.ship, this.hazards, function (sh, h) { if (self.hazardActive(h)) self.shipHit(); });

            // camera — auto-scroll (we move scrollX manually); no follow
            this.cameras.main.setBackgroundColor('#05060f');

            this.events.once(P.Scenes.Events.SHUTDOWN, function () {
                self.time.removeAllEvents(); self.tweens.killAll();
                try { self.input.keyboard.removeAllKeys(true); } catch (e) {}
            });

            this.boss = null;
            this.showBriefing(this.sectorIdx);
            this.updateHUD();
            this.buildPowerMeter();
        };

        GameScene.prototype.buildAnims = function () {
            var mk = function (key, frames, rate, repeat) {
                if (this.anims.exists(key)) return;
                this.anims.create({ key: key, frames: frames.map(function (f) { return { key: f }; }), frameRate: rate, repeat: repeat == null ? -1 : repeat });
            }.bind(this);
            mk('ship_idle', ['t_ship0', 't_ship1'], 6);
            mk('ship_thrust', ['t_ship1', 't_ship2'], 12);
        };

        /* ---------- backdrop: per-sector nebula + 3 parallax layers + props ---------- */
        GameScene.prototype.skyFor = function (idx) {
            var P_ = [
                { top: 0x0a1030, bot: 0x182048 },   // 0 orbit bumi (blue-black)
                { top: 0x2a2640, bot: 0x4a3a50 },   // 1 asteroid (dusty)
                { top: 0x3a0a2a, bot: 0x6a1a3a },   // 2 nebula merah
                { top: 0x2a2410, bot: 0x4a3a18 },   // 3 pangkalan (industrial)
                { top: 0x3a1808, bot: 0x6a2a10 },   // 4 medan perang (orange smoke)
                { top: 0x3a1c5a, bot: 0x6a3a2a }    // 5 stasiun pelaminan (gold-violet)
            ];
            return P_[idx] || P_[0];
        };
        GameScene.prototype.buildBackdrop = function (idx) {
            idx = idx || 0;
            if (!this.bgGroup) this.bgGroup = this.add.group();
            this.bgGroup.clear(true, true);
            var pal = this.skyFor(idx), self = this, worldH = this.worldH || 7200;
            function reg(o) { self.bgGroup.add(o); return o; }

            // nebula gradient (fixed to camera; darker at top toward the goal/boss)
            var sky = reg(this.add.graphics().setScrollFactor(0).setDepth(-60));
            sky.fillGradientStyle(pal.top, pal.top, pal.bot, pal.bot, 1);
            sky.fillRect(0, 0, BW, BH);

            // far stars (scrollFactor 0.15) — spread along the TALL world (Y axis)
            for (var s = 0; s < Math.ceil(worldH / 60); s++) {
                var sx = (s * 73) % BW, sy = s * 60 + (s * 37) % 60;
                reg(this.add.image(sx, sy, 't_star').setScrollFactor(0.15).setDepth(-55).setAlpha(0.4 + (s % 5) * 0.12).setScale(1 + (s % 3)));
            }
            // mid: planet / wreck / station landmark per sector (scrollFactor 0.4), along Y
            var landmarkTex = idx === 5 ? 't_station' : idx === 4 ? 't_wreck' : 't_planet';
            for (var m = 0; m * 1100 < worldH; m++) {
                var lx = 80 + (m % 2) * (BW - 240);
                reg(this.add.image(lx, 300 + m * 1100, landmarkTex).setScrollFactor(0.4).setDepth(-45).setAlpha(0.55).setScale(0.7 + (m % 2) * 0.3));
            }
            // near: drifting asteroid/debris silhouettes (scrollFactor 0.7) — ambient, along Y
            for (var p = 0; p * 520 < worldH; p++) {
                var px = this.PLAY_LEFT + 40 + (p * 90) % (this.PLAY_RIGHT - this.PLAY_LEFT - 80), py = 200 + p * 520;
                reg(this.add.image(px, py, 't_asteroid_s').setScrollFactor(0.7).setDepth(-30).setAlpha(0.5).setScale(0.8 + (p % 3) * 0.4).setAngle((p * 47) % 360));
            }
        };

        /* ---------- per-sector ---------- */
        GameScene.prototype.showBriefing = function (idx) {
            var self = this;
            this.time.delayedCall(0, function () { self.scene.pause(); });
            $('sw-briefing-title').textContent = 'SEKTOR ' + (idx + 1) + ' — ' + (SECTOR_NAMES[idx] || '');
            var pieces = infosForSector(idx).filter(function (i) { return !unlocked[i.key]; });
            var txt = pieces.length
                ? 'Kumpulkan ' + pieces.length + ' kapsul 💌 untuk membuka: ' + pieces.map(function (p) { return p.title; }).join(', ') + '.'
                : 'Bersihkan sektor & maju menuju Stasiun Pelaminan.';
            if (idx === C.sectors - 1) txt = 'Sektor terakhir! Tembus Stasiun Pelaminan & satukan dua bintang.';
            $('sw-briefing-text').textContent = txt;
            showOverlay('sw-briefing');
        };
        GameScene.prototype.loadSector = function (idx) {
            this.sectorIdx = idx; runState.sector = idx;
            this.buildSector(idx);
            if (this.scene.isPaused()) this.scene.resume();
            try {
                window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { hideOverlays(); }); });
            } catch (e) { hideOverlays(); }
        };

        /* ---------- build sector: spine + patterns + spawn records (Bible APPENDIX F) ---------- */
        GameScene.prototype.buildSector = function (idx) {
            this.enemies.clear(true, true); this.hazards.clear(true, true);
            this.capsules.clear(true, true); this.bullets.clear(true, true); this.ebullets.clear(true, true);
            if (this.boss) { try { this.boss.destroy(); } catch (e) {} this.boss = null; }
            if (this.bossHpBg) { try { this.bossHpBg.destroy(); this.bossHpFill.destroy(); this.bossHpSmall.destroy(); } catch (e) {} this.bossHpBg = null; }

            this.arenaY = null; this.bossActive = false; this.bossDead = false; this.bossPhase = 1;
            var isBoss = (idx === C.sectors - 1);
            // VERTICAL: world is TALL. Camera starts at the BOTTOM and rises toward Y=0 (the goal/boss).
            var len = isBoss ? 4800 : 7200;
            this.worldH = len;
            this.physics.world.setBounds(0, 0, BW, len);
            this.cameras.main.setBounds(0, 0, BW, len);
            this.cameras.main.scrollY = len - BH;   // start at the bottom of the world
            this.cameras.main.scrollX = 0;

            this.buildBackdrop(idx);

            // ship reset — bottom-center
            this.ship.setPosition(BW / 2, this.cameras.main.scrollY + this.PLAY_BOTTOM - 40);
            this.ship.body.setVelocity(0, 0);

            // camera-relative spawn list (records sorted by triggerY DESCENDING — born as the
            // rising camera's TOP edge reaches them, i.e. when cam.scrollY <= triggerY). §5.4
            this.spawnList = []; this._spawnNext = 0;
            this.scrollSpeed = this.diff.scroll;
            this.sectorCleared = false;

            if (isBoss) { this.buildBossArena(len); this.updateHUD(); return; }

            this.populateSector(idx, len);
            this.exitY = 260;   // camera reaching near the top (scrollY <= exitY) = sector clear
            this.updateHUD();
        };

        /* record an inert enemy (born at the camera's TOP edge in update) — Bible §5.4.
           VERTICAL: x = screen column (clamped); y = world-Y trigger (smaller y = higher = later,
           reached as the camera RISES and cam.scrollY drops to it). */
        GameScene.prototype.recordEnemy = function (type, x, y, fmt) {
            this.spawnList.push({ type: type, x: Math.round(clamp(x, this.PLAY_LEFT + 20, this.PLAY_RIGHT - 20)), y: Math.round(y), fmt: fmt || null });
        };

        /* ===== GENERATOR — encounter zones along Y, density floor, capsules ===== */
        GameScene.prototype.populateSector = function (idx, len) {
            // VERTICAL: cross-axis is X. Zones run UP the world (large Y near bottom = early,
            // small Y near top = late). colL/colR = playable horizontal column; midX = its centre.
            var self = this, colL = this.PLAY_LEFT + 20, colR = this.PLAY_RIGHT - 20, midX = BW / 2;
            var colW = colR - colL;
            var pool = this.sectorEnemyPool(idx);
            function emit(type, x, y, fmt) { self.recordEnemy(type, x, y, fmt); }
            function pick(roll) {
                if (roll < 0.5) return 'drone';
                if (roll < 0.78 && pool.indexOf('korvet') >= 0) return 'korvet';
                if (roll < 0.9 && pool.indexOf('flyer') >= 0) return 'flyer';
                if (pool.indexOf('mech') >= 0 && roll < 0.96) return 'mech';
                return 'drone';
            }

            // bottomY = just above the start (safe zone); topY = near the goal at the top
            var SAFE = 600, bottomY = len - SAFE, topY = 600;

            // free power-up capsule near spawn (Bible beat #2)
            this.placeBlueCapsule(midX - 40, bottomY - 120);

            // ---- INVITATION CAPSULES (💌): place first, spread along Y, escorted ----
            var pieces = infosForSector(idx).filter(function (i) { return !unlocked[i.key]; });
            var capYs = [];
            if (pieces.length) {
                var span = bottomY - topY - 400, gap = span / (pieces.length + 1);
                for (var pIdx = 0; pIdx < pieces.length; pIdx++) {
                    var cyp = Math.round(bottomY - 300 - gap * (pIdx + 1));
                    var cxp = midX + ((pIdx % 2) ? -1 : 1) * (colW * 0.22);
                    this.placePieceCapsule(cxp, cyp, pieces[pIdx].key);
                    capYs.push(cyp);
                    // escort squad (born as camera approaches from below)
                    emit('drone', cxp - 30, cyp + 140);
                    emit(idx >= 1 ? 'korvet' : 'drone', cxp + 20, cyp - 150);
                    if (idx >= 2) emit('drone', cxp - 40, cyp - 260);
                }
            }

            // ---- ENCOUNTER ZONES (≈1 screen each), density floor enforced ----
            var ZONE = BH;
            var zoneCount = Math.max(5, Math.floor((bottomY - topY) / ZONE));
            var minE = (C.density.minEnemies[STORE.diff] || C.density.minEnemies.normal);

            for (var z = 0; z < zoneCount; z++) {
                var zy = bottomY - z * ZONE, pattern = z % 4;   // climb upward

                // baseline squad meeting the per-zone enemy floor
                var squad = Math.max(2, minE - 1);
                for (var q = 0; q < squad; q++) {
                    var ex = colL + 30 + ((z * 90 + q * 130) % (colW - 60));
                    emit(pick(((z * 7 + q * 3) % 10) / 10), ex, zy - 100 - q * 140);
                }

                if (pattern === 0) {
                    // FORMATION SINE — wave of drones (sweep across X) + cover asteroid + ranged
                    for (var f = 0; f < 4; f++) emit('drone', midX, zy - 120 - f * 90, { fmt: 'sine', phase: f });
                    this.placeAsteroid(midX + colW * 0.2, zy - 360, false);
                    emit('korvet', midX - colW * 0.2, zy - 420);

                } else if (pattern === 1) {
                    // TURRET WALL — turrets left+right (2-plane horizontal) + barel cover
                    emit('turret', colL + 30, zy - 220);
                    emit('turret', colR - 30, zy - 220);
                    this.placeBarel(midX, zy - 150);
                    this.placeBarel(midX + 40, zy - 320);

                } else if (pattern === 2) {
                    // ASTEROID FIELD — navigation hazard (gap) + flyer swoop
                    this.placeAsteroid(colL + 60, zy - 200, false);
                    this.placeAsteroid(colR - 70, zy - 300, false);
                    this.placeAsteroid(midX, zy - 380, idx >= 1);
                    if (idx >= 2) emit('flyer', colL + 30, zy - 260, { fmt: 'swoop' });

                } else {
                    // HEAVY CONVOY — carrier/mech (gated) + escorts + barel
                    this.placeBarel(midX - 40, zy - 160);
                    if (pool.indexOf('mech') >= 0) emit('mech', colR - 40, zy - 320);
                    else if (pool.indexOf('carrier') >= 0) emit('carrier', midX, zy - 320);
                    else emit('korvet', midX, zy - 320);
                    emit('drone', midX + 30, zy - 240);
                    if (idx >= 3) emit('mine', midX - colW * 0.18, zy - 400);
                }

                // laser gate hazard on some sectors (Bible C: sectors 2,4 → idx 1,3)
                if ((idx === 1 || idx === 3) && z % 3 === 2) this.placeLaserGate(zy - ZONE * 0.6);

                // blue capsule cadence (power-up reward) every other zone
                if (z % 2 === 1 && !capYs.some(function (cy) { return Math.abs(cy - (zy - ZONE / 2)) < ZONE * 0.6; })) {
                    this.placeBlueCapsule(colL + 60 + ((z * 70) % (colW - 120)), zy - ZONE * 0.55);
                }
            }

            // final guard before the goal so the run ends on action
            this.recordEnemy('korvet', midX, topY - 120);
            this.recordEnemy('drone', midX - 60, topY - 200);

            // sort DESCENDING by y: the camera rises (scrollY drops), so spawn the largest-y
            // (lowest, earliest) records first.
            this.spawnList.sort(function (a, b) { return b.y - a.y; });
        };

        GameScene.prototype.sectorEnemyPool = function (idx) {
            if (idx === 0) return ['drone', 'turret'];
            if (idx === 1) return ['drone', 'turret', 'korvet'];
            if (idx === 2) return ['drone', 'korvet', 'flyer', 'carrier'];
            if (idx === 3) return ['turret', 'mech', 'mine', 'korvet'];
            return ['mech', 'korvet', 'flyer', 'carrier'];
        };

        /* ================= PLACERS (entities placed now; drift DOWN relative to scroll) =================
           VERTICAL: items live at world-Y. They are placed up the tall world and drift DOWNWARD a
           touch faster than the scroll so they sweep past the player. Clamp uses the X column. */
        GameScene.prototype.placeAsteroid = function (x, y, large) {
            var a = this.hazards.create(x, y, large ? 't_asteroid' : 't_asteroid_s');
            a.setData('type', 'asteroid'); a.setData('hp', large ? 4 : 2); a.setData('large', large);
            a.body.setAllowGravity(false); a.body.setVelocity((Math.random() - 0.5) * 30, this.diff.scroll * 0.4);
            a.body.setImmovable(false);
            a.setData('spin', (Math.random() - 0.5) * 0.6);
            a.body.setCircle((large ? 18 : 9));
            return a;
        };
        GameScene.prototype.placeBarel = function (x, y) {
            var b = this.hazards.create(x, y, 't_barel');
            b.setData('type', 'barel'); b.setData('hp', 1); b.setData('explosive', true);
            b.body.setAllowGravity(false); b.body.setVelocity(0, this.diff.scroll * 0.5);
            return b;
        };
        GameScene.prototype.placeMine = function (x, y) {
            var m = this.hazards.create(x, y, 't_e_mine');
            m.setData('type', 'mine'); m.setData('hp', 1);
            m.body.setAllowGravity(false); m.body.setVelocity(0, this.diff.scroll * 0.5);
            return m;
        };
        GameScene.prototype.placeLaserGate = function (y) {
            var self = this, g = this.hazards.create(BW / 2, y, 't_lasergate');
            g.setData('type', 'laser'); g.setData('on', true); g.setData('static', true);
            g.body.setAllowGravity(false); g.body.setImmovable(true);
            g.body.setVelocity(0, 0);   // world-fixed at this Y (spans the width)
            g.setData('worldY', y);
            g.setData('timer', this.time.addEvent({
                delay: 1200, loop: true, callback: function () {
                    var on = !g.getData('on'); g.setData('on', on);
                    g.setAlpha(on ? 1 : 0.12);
                }
            }));
            return g;
        };
        GameScene.prototype.placeBlueCapsule = function (x, y) {
            var c = this.capsules.create(clamp(x, this.PLAY_LEFT + 16, this.PLAY_RIGHT - 16), y, 't_capsule_blue');
            c.setData('kind', 'power');
            c.body.setAllowGravity(false); c.body.setVelocity(0, this.diff.scroll * 0.6);
            this.tweens.add({ targets: c, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            return c;
        };
        GameScene.prototype.placePieceCapsule = function (x, y, key) {
            x = clamp(x, this.PLAY_LEFT + 26, this.PLAY_RIGHT - 26);
            var c = this.capsules.create(x, y, 't_amplop');
            c.setData('kind', 'piece'); c.setData('key', key); c.setData('hp', 1);
            c.body.setAllowGravity(false); c.body.setVelocity(0, this.diff.scroll * 0.5);
            this.tweens.add({ targets: c, scaleX: 1.15, scaleY: 1.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            // gold pulse + beacon ring + SOS so guests can't miss it (▲ points up toward it)
            var ring = this.add.circle(x, y, 18, 0xffd447, 0).setStrokeStyle(2, 0xffd447, 0.9).setDepth(-1);
            this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.out', onRepeat: function () { ring.setScale(1); ring.alpha = 1; } });
            c.setData('ring', ring);
            var sos = this.add.text(x, y + 26, '💌', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd447', fontStyle: 'bold' }).setOrigin(0.5).setDepth(7);
            this.tweens.add({ targets: sos, alpha: 0.4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            c.setData('sos', sos);
            return c;
        };

        /* ================= SPAWN ENEMY (born at camera edge) ================= */
        GameScene.prototype.spawnEnemy = function (type, x, y, fmt) {
            if (type === 'mine') return this.placeMine(x, y);   // mine is a hazard entity
            var texKey = 't_e_' + type;
            var e = this.enemies.create(x, y, texKey);
            e.setData('type', type); e.setData('fmt', fmt);
            e.body.setAllowGravity(false);
            e.setData('baseX', x); e.setData('seed', Math.random() * 6.28); e.setData('aimT', type === 'turret' ? 500 : 900);
            var hp = { drone: 1, flyer: 2, turret: 3, korvet: 4, mech: 8, carrier: 10 }[type] || 1;
            e.setData('hp', hp);
            // VERTICAL: drift DOWN relative to scroll so enemies sweep down past the player.
            var vy = this.diff.scroll + (type === 'flyer' ? 80 : type === 'mech' || type === 'carrier' ? -30 : 40);
            e.body.setVelocity(0, vy);
            e.setData('vy0', vy);
            return e;
        };

        /* ================= BOSS (Bible APPENDIX D) ================= */
        GameScene.prototype.buildBossArena = function (len) {
            var self = this, midX = BW / 2;
            this.bossActive = false; this.bossDead = false; this.bossPhase = 1;
            // VERTICAL: the boss sits near the TOP of the world. The camera rises; walk-in
            // triggers when cam.scrollY <= arenaY (camera's top reaches the arena).
            this.arenaY = Math.round(BH * 0.9);   // small Y near the top of the world
            this.exitY = -999999;

            // approach guards (camera-relative records, born as the camera rises)
            this.recordEnemy('drone', midX - 60, this.arenaY + 800);
            this.recordEnemy('korvet', midX + 40, this.arenaY + 600);
            this.recordEnemy('drone', midX, this.arenaY + 400);
            this.spawnList.sort(function (a, b) { return b.y - a.y; });   // descending y

            // the united-couple reward, pinned at the very TOP (revealed on win)
            this.couple = this.add.image(midX, 90, 't_couple').setScrollFactor(1).setDepth(-4).setAlpha(0.35);

            // boss: INACTIVE via alpha (NOT setActive(false) — Bible §16/D.4). Sits near top.
            var bx = midX, by = 200;
            var b = this.physics.add.sprite(bx, by, 't_boss');
            b.body.setAllowGravity(false); b.body.setImmovable(true);
            b.body.setSize(150, 110); b.body.setOffset(35, 10);
            var maxhp = Math.round(this.dps() * this.diff.bossTTK);
            b.setData('hp', maxhp); b.setData('maxhp', maxhp);
            b.setData('homeX', bx); b.setData('atkT', 2200); b.setData('coreDX', 0); b.setData('coreDY', 40);   // core at bottom-center
            b.setAlpha(0);
            this.boss = b;
            this.physics.add.overlap(this.ship, b, function () { if (self.bossActive && !self.ship.cheat) self.shipHit(); });

            // HP bar (big, top-center fixed) + small bar above boss (Bible D.3)
            this.bossHpW = 240;
            this.bossHpBg = this.add.rectangle(BW / 2, 36, this.bossHpW + 6, 12, 0x000000, 0.7).setScrollFactor(0).setDepth(40).setVisible(false).setStrokeStyle(1, 0xffd447);
            this.bossHpFill = this.add.rectangle(BW / 2 - this.bossHpW / 2, 36, this.bossHpW, 8, 0xff4d4d).setOrigin(0, 0.5).setScrollFactor(0).setDepth(41).setVisible(false);
            this.bossHpSmall = this.add.rectangle(bx - 45, by - 70, 90, 5, 0xff4d4d).setOrigin(0, 0.5).setDepth(41).setVisible(false);

            toast('Tembus pertahanan menuju Stasiun Pelaminan ↑');
        };
        GameScene.prototype.dps = function () {
            // rough mid-weapon dps for TTK balance (blaster baseline ~7/s)
            return 7;
        };
        GameScene.prototype.activateBoss = function () {
            if (this.bossActive || !this.boss) return;
            var self = this, b = this.boss;
            this.bossActive = true;
            this.scrollSpeed = 0;                      // lock scroll (arena)
            // lock the camera to the TOP screen of the world (scrollY clamps to 0)
            this.cameras.main.setBounds(0, 0, BW, BH);
            this.cameras.main.scrollY = 0;
            this.tweens.add({ targets: b, alpha: 1, duration: 400 });
            this.bossHpBg.setVisible(true); this.bossHpFill.setVisible(true); this.bossHpSmall.setVisible(true);
            this.flash(0xffffff, 120); this.addTrauma(0.3); SFX.boss();
            toast('⚠ BOSS: Stasiun Pelaminan — satukan dua bintang!');
        };
        GameScene.prototype.manualBossHits = function () {
            var b = this.boss; if (!b || !b.active || !this.bossActive) return;
            var coreOpen = this.bossPhase >= 2, self = this;
            var cx = b.x + b.getData('coreDX'), cy = b.y + b.getData('coreDY');
            this.bullets.getChildren().forEach(function (bl) {
                if (!bl.active) return;
                if (Math.abs(bl.x - cx) < 58 && Math.abs(bl.y - cy) < 60) {
                    var dmg = bl.getData('charge') ? bl.getData('chargeDmg') : self.ship.weaponDmg();
                    self.killBullet(bl);
                    if (coreOpen) self.hitBoss(b, dmg);   // weak-point only damageable when open
                }
            });
        };
        GameScene.prototype.hitBoss = function (boss, dmg) {
            if (this.bossDead) return;
            if (dmg == null) dmg = this.ship.weaponDmg();
            var hp = boss.getData('hp') - dmg;
            boss.setData('hp', hp);
            this.flash(0xffffff, 40); this.addTrauma(0.12); this.burst(boss.x + boss.getData('coreDX'), boss.y + boss.getData('coreDY'), 0xffd447, 6);
            boss.setTintFill(0xffffff); var bb = boss;
            this.time.delayedCall(50, function () { if (bb.active) bb.clearTint(); });
            this.updateBossHp();
            var max = boss.getData('maxhp');
            if (this.bossPhase === 1 && hp <= max * 0.66) { this.bossPhase = 2; this.bossPhaseBeat(); }
            else if (this.bossPhase === 2 && hp <= max * 0.33) { this.bossPhase = 3; this.bossPhaseBeat(); }
            if (hp <= 0) this.defeatBoss(boss);
        };
        GameScene.prototype.bossPhaseBeat = function () {
            this.flash(0xffffff, 120); this.addTrauma(0.3); this.freeze(100); SFX.boss();
            toast(this.bossPhase === 2 ? 'Inti terbuka! Tembak intinya!' : 'Stasiun mengamuk!');
        };
        GameScene.prototype.updateBossHp = function () {
            if (!this.bossHpFill || !this.boss || !this.boss.active) return;
            var hp = Math.max(0, this.boss.getData('hp')), max = this.boss.getData('maxhp');
            this.bossHpFill.width = this.bossHpW * (hp / max);
            this.bossHpSmall.setPosition(this.boss.x - 45, this.boss.y - 80);
            this.bossHpSmall.width = 90 * (hp / max);
        };
        GameScene.prototype.defeatBoss = function (boss) {
            var self = this;
            this.bossDead = true; this.bossActive = false;
            this.bossHpBg.setVisible(false); this.bossHpFill.setVisible(false); this.bossHpSmall.setVisible(false);
            this.burst(boss.x, boss.y, 0xffd447, 30); this.addTrauma(0.5); this.flash(0xffffff, 150); this.freeze(120);
            var bx = boss.x, by = boss.y;
            for (var i = 0; i < 6; i++) (function (i) {
                self.time.delayedCall(120 + i * 130, function () { self.burst(bx + rnd(-60, 60), by + rnd(-50, 50), 0xff8a3d, 16); self.flash(0xffaa44, 60); });
            })(i);
            if (this.couple) this.tweens.add({ targets: this.couple, alpha: 1, scale: 1.2, duration: 800 });
            try { boss.destroy(); } catch (e) {}
            SFX.win();
            bossFinale();
        };

        /* ================= COMBAT ================= */
        GameScene.prototype.killBullet = function (b) {
            if (!b || !b.active) return;
            this.bullets.killAndHide(b); if (b.body) b.body.enable = false;
        };
        GameScene.prototype.killEBullet = function (b) { if (b && b.active) { this.ebullets.killAndHide(b); if (b.body) b.body.enable = false; } };
        GameScene.prototype.hitEnemy = function (b, e) {
            if (!b || !b.active || !e || !e.active) return;
            var dmg = b.getData('charge') ? b.getData('chargeDmg') : this.ship.weaponDmg();
            // PIERCE: laser/charge passes through up to `pierce` enemies before dying.
            var pierce = b.getData('pierce') || 0;
            if (pierce > 0) {
                // de-dup: don't hit the same enemy twice in a frame
                if (b.getData('lastHit') === e) return;
                b.setData('lastHit', e);
                b.setData('pierce', pierce - 1);
            } else {
                this.killBullet(b);
            }
            this.dealEnemyDamage(e, dmg);
        };
        GameScene.prototype.dealEnemyDamage = function (e, dmg) {
            var hp = e.getData('hp') - dmg; e.setData('hp', hp);
            this.burst(e.x, e.y, 0xff8a3d, 4); this.freeze(2 * 16);
            if (hp <= 0) {
                var ty = e.getData('type');
                this.score += { drone: 100, flyer: 200, turret: 250, korvet: 350, mech: 600, carrier: 800 }[ty] || 100;
                this.burst(e.x, e.y, 0xffd447, 10); this.addTrauma(0.1); SFX.explode();
                // chance to drop a blue capsule from heavier kills
                if ((ty === 'korvet' || ty === 'carrier' || ty === 'mech') && Math.random() < 0.5) this.placeBlueCapsule(e.x, e.y);
                e.destroy(); this.updateHUD();
            } else {
                e.setTintFill(0xffffff); var ee = e; this.time.delayedCall(50, function () { if (ee.active) ee.clearTint(); });
                SFX.hit();
            }
        };
        GameScene.prototype.hitHazard = function (b, h) {
            if (!b || !b.active || !h || !h.active) return;
            var ty = h.getData('type');
            if (ty === 'laser') { return; }   // laser gate is indestructible; bullets pass
            var dmg = b.getData('charge') ? b.getData('chargeDmg') : this.ship.weaponDmg();
            var pierce = b.getData('pierce') || 0;
            if (pierce > 0) { if (b.getData('lastHit') === h) return; b.setData('lastHit', h); b.setData('pierce', pierce - 1); }
            else this.killBullet(b);
            var hp = h.getData('hp') - dmg; h.setData('hp', hp);
            this.burst(h.x, h.y, 0x8aaaaa, 4);
            if (hp <= 0) {
                if (ty === 'asteroid' && h.getData('large')) {
                    // split into 2 smalls
                    this.placeAsteroid(h.x - 8, h.y - 10, false);
                    this.placeAsteroid(h.x + 8, h.y + 10, false);
                }
                this.score += 50; this.burst(h.x, h.y, 0xffd447, 8); SFX.explode();
                if (h.getData('explosive')) this.explodeAt(h.x, h.y, 80);
                this.clearHazard(h);
            } else SFX.hit();
        };
        GameScene.prototype.clearHazard = function (h) {
            var tm = h.getData('timer'); if (tm) tm.remove();
            h.destroy();
        };
        GameScene.prototype.explodeAt = function (x, y, r) {
            this.burst(x, y, 0xff8a3d, 16); this.addTrauma(0.25); this.flash(0xffaa44, 80); SFX.explode();
            var self = this;
            this.enemies.getChildren().forEach(function (e) { if (e.active && Math.hypot(e.x - x, e.y - y) < r) self.dealEnemyDamage(e, 5); });
            this.hazards.getChildren().forEach(function (h) { if (h.active && h.getData('type') !== 'laser' && Math.hypot(h.x - x, h.y - y) < r) { h.setData('hp', 0); if (h.getData('explosive')) {} self.clearHazard(h); } });
            if (this.boss && this.boss.active && this.bossActive && this.bossPhase >= 2 && Math.hypot((this.boss.x + this.boss.getData('coreDX')) - x, (this.boss.y + this.boss.getData('coreDY')) - y) < r + 30) this.hitBoss(this.boss);
        };

        GameScene.prototype.hazardActive = function (h) {
            if (h.getData('type') === 'laser') return h.getData('on');
            return true;
        };

        /* ===== capsule collect ===== */
        GameScene.prototype.collectCapsule = function (c) {
            if (!c || !c.active) return;
            var kind = c.getData('kind');
            if (kind === 'power') {
                c.destroy(); SFX.collectP(); this.burst(c.x, c.y, 0x4fd6ff, 8);
                this.advancePowerMeter();
                return;
            }
            // piece capsule (💌)
            if (c.getData('taken')) return; c.setData('taken', true);
            var key = c.getData('key');
            var ring = c.getData('ring'); if (ring) { this.tweens.killTweensOf(ring); ring.destroy(); }
            var sos = c.getData('sos'); if (sos) { this.tweens.killTweensOf(sos); sos.destroy(); }
            this.pHeart.explode(12, c.x, c.y); this.flash(0xffd447, 90); this.freeze(3 * 16); SFX.collectC();
            this.tweens.add({ targets: c, y: c.y - 40, alpha: 0, scale: 1.5, duration: 500, onComplete: function () { c.destroy(); } });
            unlockInfo(key);
            this.updateHUD();
        };

        /* ===== Power Meter (Gradius) ===== */
        GameScene.prototype.buildPowerMeter = function () {
            this.powerIdx = -1;      // highlighted slot (-1 = none)
            this.ownedWeapon = 'BLASTER';
            this.hasOption = false; this.shieldHits = 0;
            var el = $('sw-power'); if (!el) return;
            el.innerHTML = '';
            CONFIG.powerLadder.forEach(function (label, i) {
                var cell = document.createElement('div'); cell.className = 'sw-power-cell'; cell.dataset.idx = i;
                cell.textContent = label.slice(0, 3); el.appendChild(cell);
            });
            this.paintPowerMeter();
        };
        GameScene.prototype.paintPowerMeter = function () {
            var el = $('sw-power'); if (!el) return;
            var self = this;
            el.querySelectorAll('.sw-power-cell').forEach(function (c, i) {
                c.classList.toggle('is-hi', i === self.powerIdx);
            });
        };
        GameScene.prototype.advancePowerMeter = function () {
            this.powerIdx = (this.powerIdx + 1) % CONFIG.powerLadder.length;
            this.paintPowerMeter();
            // auto-apply convenience for non-gamers after a couple of capsules: if they never
            // press Z, still grant something useful at SPREAD/LASER. (Kept simple.)
        };
        GameScene.prototype.applyPower = function () {
            if (this.powerIdx < 0) return;
            var sel = CONFIG.powerLadder[this.powerIdx];
            if (sel === 'SPEED') { this.ship.speedBoost = Math.min(1.6, (this.ship.speedBoost || 1) + 0.15); toast('SPEED UP'); }
            else if (sel === 'MISSILE') { this.ownedWeapon = 'MISSILE'; this.ship.weapon = 'MISSILE'; toast('Senjata: MISSILE'); }
            else if (sel === 'SPREAD') { this.ownedWeapon = 'SPREAD'; this.ship.weapon = 'SPREAD'; toast('Senjata: SPREAD'); }
            else if (sel === 'LASER') { this.ownedWeapon = 'LASER'; this.ship.weapon = 'LASER'; toast('Senjata: LASER'); }
            else if (sel === 'OPTION') { this.hasOption = true; this.spawnOption(); toast('OPTION POD aktif'); }
            else if (sel === 'SHIELD') { this.shieldHits = (STORE.diff === 'easy' ? 3 : 2); this.ship.shieldHits = this.shieldHits; toast('SHIELD aktif'); SFX.shield(); }
            this.powerIdx = -1; this.paintPowerMeter(); this.updateHUD();
        };
        GameScene.prototype.spawnOption = function () {
            if (this.option) return;
            this.option = this.add.image(this.ship.x - 30, this.ship.y, 't_ship0').setScale(0.6).setAlpha(0.85).setTint(0x9bffd0).setDepth(4);
        };

        /* ================= JUICE ================= */
        GameScene.prototype.burst = function (x, y, color, n) { this.pSpark.explode(n || 8, x, y); };
        GameScene.prototype.flash = function (color, dur) { var c = P.Display.Color.IntegerToColor(color); this.cameras.main.flash(dur || 80, c.red, c.green, c.blue); };
        GameScene.prototype.addTrauma = function (t) { this.trauma = clamp(this.trauma + t, 0, 1); };
        GameScene.prototype.freeze = function (ms) { this.freezeUntil = Math.max(this.freezeUntil, this.time.now + Math.min(ms, 500)); };
        GameScene.prototype.celebrate = function (kind) {
            var self = this, n = 0, reps = kind === 'boss' ? 13 : 11;
            this.flash(0xffffff, 150); this.addTrauma(0.5);
            this.time.addEvent({
                delay: 350, repeat: reps, callback: function () {
                    var x = rnd(60, BW - 60), y = rnd(self.PLAY_TOP + 40, self.PLAY_BOTTOM - 60) + self.cameras.main.scrollY;
                    self.pHeart.explode(10, x, y); self.burst(x, y, 0xffd447, 8);
                    if (n++ % 2 === 0) SFX.collectP();
                }
            });
        };

        /* ===== ship damage (no lives — Bible §8/§17) ===== */
        GameScene.prototype.shipHit = function () {
            var s = this.ship;
            if (s.cheat || s.invuln > 0) return;
            if (this.shieldHits > 0) { this.shieldHits--; s.shieldHits = this.shieldHits; s.invuln = 500; this.flash(0x4fd6ff, 80); SFX.shield(); s.blink(); this.updateHUD(); return; }
            this.flash(0xff3b30, 80); this.addTrauma(0.3); this.freeze(3 * 16); SFX.hit();
            // VERTICAL: knockback DOWN + small horizontal nudge
            s.body.setVelocity((Math.random() - 0.5) * 160, C.ship.knockback * 2);
            s.invuln = this.diff.invulnMs; s.hurtT = 300; s.blink();
        };

        /* ================= UPDATE ================= */
        GameScene.prototype.update = function (time, delta) {
            if (time < this.freezeUntil) return;
            pollEdges();
            var dt = delta / 1000, cam = this.cameras.main;

            // AUTO-SCROLL UP (Bible §9). Camera rises: scrollY decreases toward 0 (the goal/boss
            // at the top). Boss arena locks scroll (scrollSpeed=0).
            if (!this.bossActive && this.scrollSpeed > 0) {
                cam.scrollY = Math.max(0, cam.scrollY - this.scrollSpeed * dt);
            }

            // camera-relative spawn (Bible §5.4)
            this.processSpawnPointer();

            // ship
            if (this.ship && this.ship.active) this.ship.step(time, delta);
            // option pod trails BELOW the ship (vertical)
            if (this.option) { this.option.x += (this.ship.x - this.option.x) * 0.2; this.option.y += (this.ship.y + 34 - this.option.y) * 0.2; }
            // swap power (Z)
            if (input.swapEdge) this.applyPower();

            this.updateEnemies(time, delta);
            this.updateHazards(time, delta);

            // boss: walk-in when the camera rises to the arena (cam.scrollY <= arenaY)
            if (this.boss && !this.bossActive && !this.bossDead && this.arenaY != null && cam.scrollY <= this.arenaY) this.activateBoss();
            if (this.boss && this.bossActive && this.boss.active) { this.updateBoss(time, delta); this.manualBossHits(); this.updateBossHp(); }

            // anti-tunnel sweep + viewport-edge bullet cull
            this.manualEnemyHits();
            this.cullBullets();

            // capsules drift down; cull once below the view
            this.cullGroupBelow(this.capsules, 60);

            // trauma shake
            this.trauma = Math.max(0, this.trauma - delta / 600);
            if (this.trauma > 0.01) cam.shake(40, this.trauma * this.trauma * 0.04, true);

            // sector clear (camera reached the TOP exit)
            if (!this.bossActive && !this.boss && !this.sectorCleared && cam.scrollY <= this.exitY) { this.sectorCleared = true; this.onSectorClear(); }
            if (!this.bossActive && !this.sectorCleared && this.exitY !== -999999 && cam.scrollY <= 4 && this.sectorIdx < C.sectors - 1) {
                // safety: reached world top without flag
                this.sectorCleared = true; this.onSectorClear();
            }
        };

        GameScene.prototype.processSpawnPointer = function () {
            if (!this.spawnList) return;
            // VERTICAL: born at the TOP edge as the rising camera reaches their triggerY.
            // spawnList is sorted DESCENDING y; spawn while edge (cam.scrollY) <= record.y.
            var cam = this.cameras.main, edge = cam.scrollY;
            while (this._spawnNext < this.spawnList.length && edge <= this.spawnList[this._spawnNext].y) {
                var r = this.spawnList[this._spawnNext++];
                var by = Math.min(r.y, edge + 8);   // born at/just inside the top edge
                this.spawnEnemy(r.type, r.x, by, r.fmt);
            }
            // despawn enemies scrolled off the BOTTOM
            var botCull = cam.scrollY + BH + 100, self = this;
            this.enemies.getChildren().forEach(function (e) {
                if (!e.active || !e.body) return;
                if (e.body.top > botCull) e.destroy();
            });
        };

        GameScene.prototype.cullBullets = function () {
            var cam = this.cameras.main, top = cam.scrollY - 16, bot = cam.scrollY + BH + 16, self = this;
            this.bullets.getChildren().forEach(function (b) {
                if (!b.active) return;
                if (b.y < top || b.y > bot || b.x < -40 || b.x > BW + 40) { self.bullets.killAndHide(b); if (b.body) b.body.enable = false; }
            });
            this.ebullets.getChildren().forEach(function (b) {
                if (!b.active) return;
                if (b.y < top - 40 || b.y > bot + 40 || b.x < -60 || b.x > BW + 60) { self.ebullets.killAndHide(b); if (b.body) b.body.enable = false; }
            });
        };
        GameScene.prototype.cullGroupBelow = function (grp, margin) {
            var cam = this.cameras.main, botCull = cam.scrollY + BH + margin;
            grp.getChildren().forEach(function (o) { if (o.active && o.body && o.y > botCull) o.destroy(); });
        };

        GameScene.prototype.updateEnemies = function (time, delta) {
            // VERTICAL: cross-axis sway is on X; everything drifts DOWN. baseX = spawn column.
            var self = this, sx = this.ship.x, colW = this.PLAY_RIGHT - this.PLAY_LEFT;
            this.enemies.getChildren().forEach(function (e) {
                if (!e.active) return;
                var t = e.getData('type'), fmt = e.getData('fmt'), seed = e.getData('seed'), baseX = e.getData('baseX');
                if (t === 'drone') {
                    if (fmt && fmt.fmt === 'sine') e.x = clamp(baseX + Math.sin(time / 300 + seed) * colW * 0.30, self.PLAY_LEFT + 10, self.PLAY_RIGHT - 10);
                    else e.x += Math.sin(time / 400 + seed) * 0.6;
                } else if (t === 'flyer') {
                    // swoop toward ship horizontally while diving
                    e.body.setVelocityX((sx - e.x) * 0.9);
                } else if (t === 'turret') {
                    e.body.setVelocityY(self.scrollSpeed);   // turrets ride the structure (scroll down)
                    self.enemyAim(e, 'aimed', 1);
                } else if (t === 'korvet') {
                    e.x += Math.sin(time / 350 + seed) * 0.4;
                    self.enemyAim(e, 'spread', 3);
                } else if (t === 'mech') {
                    self.enemyAim(e, 'rocket', 1);
                } else if (t === 'carrier') {
                    e.x = clamp(baseX + Math.sin(time / 600 + seed) * 20, self.PLAY_LEFT + 24, self.PLAY_RIGHT - 24);
                    var st = e.getData('spawnT') || 0; st -= delta;
                    if (st <= 0) { self.carrierSpawn(e); e.setData('spawnT', 1500); } else e.setData('spawnT', st);
                }
            });
        };
        GameScene.prototype.carrierSpawn = function (carrier) {
            var d = this.enemies.create(carrier.x, carrier.y + 20, 't_e_drone');
            d.setData('type', 'drone'); d.setData('hp', 1); d.setData('seed', Math.random() * 6.28); d.setData('baseX', d.x);
            d.body.setAllowGravity(false); d.body.setVelocity(0, this.diff.scroll + 40);
        };
        GameScene.prototype.enemyAim = function (e, mode, count) {
            var aimT = e.getData('aimT') - 16;
            if (aimT <= 0) {
                var self = this, ee = e, tell = (mode === 'rocket' ? 700 : 550) * (1 + this.diff.tellAdd);
                e.setTintFill(0xff5a4d);
                this.time.delayedCall(Math.max(120, tell), function () {
                    if (!ee.active) return; ee.clearTint();
                    self.enemyFire(ee, mode, count);
                });
                e.setData('aimT', (mode === 'rocket' ? 1900 : 1500));
            } else e.setData('aimT', aimT);
        };
        GameScene.prototype.enemyFire = function (e, mode, count) {
            var self = this, sx = this.ship.x, sy = this.ship.y;
            var n = count || 1, spd = this.diff.ebulletSpd;
            for (var i = 0; i < n; i++) {
                (function (i) {
                    self.time.delayedCall(i * 90, function () {
                        if (!e.active || !self.ship.active) return;
                        var tex = mode === 'rocket' ? 't_erocket' : 't_ebullet';
                        var b = self.ebullets.get(e.x, e.y + 8, tex);   // muzzle below enemy, firing down
                        if (!b) return;
                        if (b.texture && b.texture.key !== tex) { b.setTexture(tex); }
                        b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(false);
                        var ax = self.ship.x - e.x, ay = self.ship.y - e.y, len = Math.hypot(ax, ay) || 1;
                        var spread = (i - (n - 1) / 2) * 0.16;
                        var vx = ax / len, vy = ay / len;
                        var ca = Math.cos(spread), sa = Math.sin(spread);
                        var rx = vx * ca - vy * sa, ry = vx * sa + vy * ca;
                        b.body.setVelocity(rx * spd, ry * spd);
                        if (tex === 't_erocket') b.setRotation(Math.atan2(ry, rx) + Math.PI / 2);
                    });
                })(i);
            }
            SFX.shoot();
        };

        GameScene.prototype.updateHazards = function (time, delta) {
            var self = this, cam = this.cameras.main;
            this.hazards.getChildren().forEach(function (h) {
                if (!h.active) return;
                var t = h.getData('type');
                if (t === 'laser') {
                    // world-fixed gate (spans width); stays at its world-Y as the camera passes
                    h.y = h.getData('worldY');
                } else if (t === 'asteroid') {
                    h.angle += (h.getData('spin') || 0);
                }
                // cull once scrolled off the BOTTOM (below the camera view)
                if (h.body && h.y > cam.scrollY + BH + 80) self.clearHazard(h);
            });
        };

        GameScene.prototype.updateBoss = function (time, delta) {
            var b = this.boss, self = this;
            var atk = b.getData('atkT') - delta;
            // VERTICAL: bob side-to-side on X around homeX
            b.x = b.getData('homeX') + Math.sin(time / 500) * 40;
            if (atk <= 0) {
                var ph = this.bossPhase, tell = (ph === 3 ? 1100 : ph === 2 ? 700 : 800) * (1 + this.diff.tellAdd);
                b.setTint(0xff8888);
                this.time.delayedCall(tell, function () {
                    if (!b.active || !self.bossActive) return; b.clearTint();
                    var count = ph === 1 ? 3 : (ph === 2 ? 5 : 4), spd = 300 * (1 + (self.diff.tellAdd < 0 ? 0.2 : 0));
                    var mx = b.x, my = b.y + 60;   // muzzle BELOW boss, firing down at the ship
                    for (var i = 0; i < count; i++) (function (i) {
                        self.time.delayedCall(i * 100, function () {
                            if (!b.active || !self.ship.active) return;
                            var bl = self.ebullets.get(mx, my, 't_ebullet');
                            if (!bl) return;
                            if (bl.texture && bl.texture.key !== 't_ebullet') { bl.setTexture('t_ebullet'); bl.setRotation(0); }
                            bl.setActive(true).setVisible(true); bl.body.enable = true; bl.body.setAllowGravity(false);
                            var ax = self.ship.x - mx, ay = self.ship.y - my, len = Math.hypot(ax, ay) || 1;
                            var spread = (i - (count - 1) / 2) * 0.12, vx = ax / len, vy = ay / len;
                            var ca = Math.cos(spread), sa = Math.sin(spread);
                            bl.body.setVelocity((vx * ca - vy * sa) * spd, (vx * sa + vy * ca) * spd);
                        });
                    })(i);
                    if (ph === 3) {
                        var r = self.ebullets.get(mx, my, 't_erocket');
                        if (r) { if (r.texture && r.texture.key !== 't_erocket') r.setTexture('t_erocket'); r.setActive(true).setVisible(true); r.body.enable = true; r.body.setAllowGravity(false);
                            var dx = self.ship.x - mx, dy = self.ship.y - my, dl = Math.hypot(dx, dy) || 1; r.setRotation(Math.atan2(dy, dx) + Math.PI / 2); r.body.setVelocity(dx / dl * 240, dy / dl * 240); }
                    }
                    SFX.shoot();
                });
                b.setData('atkT', ph === 3 ? 1600 : 2200);
            } else b.setData('atkT', atk);
            // phase-2+ also spawns a drone occasionally (drifts down)
            if (this.bossPhase >= 2) {
                var st = b.getData('drT') || 0; st -= delta;
                if (st <= 0) { var d = this.enemies.create(b.x + rnd(-40, 40), b.y + 50, 't_e_drone'); d.setData('type', 'drone'); d.setData('hp', 1); d.setData('seed', Math.random() * 6.28); d.setData('baseX', d.x); d.body.setAllowGravity(false); d.body.setVelocity(0, this.diff.scroll + 30); b.setData('drT', 2600); }
                else b.setData('drT', st);
            }
        };

        // anti-tunnel sweep (Bible §6 — no platforms, so this is the sole safety-net).
        // VERTICAL: player bullets travel UP, so sweep the span along the Y axis (prev→now).
        GameScene.prototype.manualEnemyHits = function () {
            var self = this, enemies = this.enemies.getChildren(), haz = this.hazards.getChildren();
            this.bullets.getChildren().forEach(function (bl) {
                if (!bl.active || !bl.body) return;
                var bx = bl.x, vy = bl.body.velocity.y, ay = Math.abs(vy) * 0.016;
                var y0 = bl.y - ay, y1 = bl.y + ay;
                var i, e, eb;
                for (i = 0; i < enemies.length; i++) {
                    e = enemies[i]; if (!e.active || !e.body) continue; eb = e.body;
                    if (y1 > eb.top - 6 && y0 < eb.bottom + 6 && bx > eb.left - 6 && bx < eb.right + 6) { self.hitEnemy(bl, e); return; }
                }
                for (i = 0; i < haz.length; i++) {
                    e = haz[i]; if (!e.active || !e.body || e.getData('type') === 'laser') continue; eb = e.body;
                    if (y1 > eb.top - 6 && y0 < eb.bottom + 6 && bx > eb.left - 6 && bx < eb.right + 6) { self.hitHazard(bl, e); return; }
                }
            });
        };

        GameScene.prototype.onSectorClear = function () {
            this.scene.pause();
            if (this.sectorIdx + 1 >= C.sectors) return;
            runState.score = this.score;
            $('sw-clear-text').innerHTML = 'Sektor ' + (this.sectorIdx + 1) + ' aman! Skor: <b>' + pad6(this.score) + '</b>';
            showOverlay('sw-clear');
        };

        /* ================= HUD ================= */
        GameScene.prototype.updateHUD = function () {
            var lv = $('sw-lives'); if (lv && this.ship) lv.textContent = '×' + Math.max(0, this.ship.bombs);
            var sc = $('sw-score'); if (sc) sc.textContent = pad6(this.score);
            if (this.score > (STORE.best || 0)) { STORE.best = this.score; saveStore(); }
            var ar = $('sw-area'); if (ar) ar.textContent = String(this.sectorIdx + 1);
            var wi = $('sw-weapon-ico'), wn = $('sw-weapon-name'), wa = $('sw-weapon-ammo');
            if (this.ship && wi) {
                var w = C.weapons[this.ship.weapon] || C.weapons.BLASTER;
                wi.textContent = w.ico; wn.textContent = w.name;
                wa.textContent = this.shieldHits > 0 ? '🛡' + this.shieldHits : '';
            }
        };

        function pad6(n) { n = Math.max(0, Math.floor(n)); var s = String(n); while (s.length < 6) s = '0' + s; return s; }
        function rnd(a, b) { return a + Math.random() * (b - a); }

        /* ===================================================================
           SHIP (Bible §4) — extends Arcade.Sprite, free flight, no gravity.
           =================================================================== */
        function Ship(scene, x, y) { P.Physics.Arcade.Sprite.call(this, scene, x, y, 't_ship'); this.scene = scene; }
        Ship.prototype = Object.create(P.Physics.Arcade.Sprite.prototype);
        Ship.prototype.constructor = Ship;
        Ship.prototype.init = function () {
            this.body.setAllowGravity(false);
            this.body.setSize(C.ship.w, C.ship.h);
            this.body.setOffset((this.width - C.ship.w) / 2, (this.height - C.ship.h) / 2);
            this.invuln = 0; this.hurtT = 0; this.cheat = false;
            this.weapon = 'BLASTER'; this.fireT = 0; this.speedBoost = 1; this.shieldHits = 0;
            this.bombs = C.bombs;
            this.chargeT = 0; this.charging = false;
            this.setDepth(5);
            if (this.play) this.play('ship_idle');
        };
        Ship.prototype.weaponDmg = function () { return (C.weapons[this.weapon] || C.weapons.BLASTER).dmg; };
        Ship.prototype.blink = function () {
            var self = this; this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 80, yoyo: true, repeat: 6, onComplete: function () { self.alpha = 1; } });
        };
        Ship.prototype.step = function (time, delta) {
            var sc = this.scene, cam = sc.cameras.main;
            if (this.invuln > 0) this.invuln -= delta;
            if (this.hurtT > 0) this.hurtT -= delta;

            // movement (velocity-driven, no gravity). Diagonal normalized.
            var spd = (C.ship.speed[STORE.diff] || 330) * (this.speedBoost || 1);
            var vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
            var vy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
            var l = Math.hypot(vx, vy) || 1;
            this.body.setVelocity(vx / l * spd, vy / l * spd);

            // VERTICAL clamp: free across the column (PLAY_LEFT..PLAY_RIGHT) and within the
            // bottom region of the camera window — ship sits low so the view UP is wide.
            // Camera scrolls DOWN; screen-Y is world-Y minus cam.scrollY.
            var topY = cam.scrollY + sc.PLAY_TOP + 12;
            var botY = cam.scrollY + sc.PLAY_BOTTOM - 12;
            // keep the ship in the lower ~⅗ of the field (can rise to ~38% from top of field)
            var riseY = cam.scrollY + sc.PLAY_TOP + (sc.PLAY_BOTTOM - sc.PLAY_TOP) * 0.30;
            this.x = clamp(this.x, sc.PLAY_LEFT + 8, sc.PLAY_RIGHT - 8);
            this.y = clamp(this.y, riseY, botY);

            // bank tilt L/R (juice)
            this.setAngle(vx < 0 ? -12 : vx > 0 ? 12 : 0);

            // anim — thrust when moving up
            if (this.play) this.play((vy < 0) ? 'ship_thrust' : 'ship_idle', true);
            this.setTexture(this.hurtT > 0 ? 't_ship_hurt' : this.texture.key);   // keep current anim frame unless hurt

            // FIRE / CHARGE
            this.fireT -= delta;
            if (input.charge) {
                this.charging = true; this.chargeT += delta;
                if (this.chargeT === delta) SFX.charge();
                // visual charge glow (above the nose)
                if (!this._chargeFx) { this._chargeFx = sc.add.circle(this.x, this.y, 6, 0x9bffd0, 0.5).setDepth(4); }
                var lvl = this.chargeLevel(); this._chargeFx.setRadius(6 + lvl * 5); this._chargeFx.setPosition(this.x, this.y - 24);
            } else {
                if (this.charging && this.chargeT > C.ship.chargeT[0]) { this.fireCharge(); }
                this.charging = false; this.chargeT = 0;
                if (this._chargeFx) { this._chargeFx.destroy(); this._chargeFx = null; }
                if (input.fire && this.fireT <= 0) this.shoot();
            }

            // BOMB (screen-clear)
            if (input.bombEdge && this.bombs > 0) this.bomb();

            // hurt tint frame
            if (this.hurtT > 0) this.setTexture('t_ship_hurt');
        };
        Ship.prototype.chargeLevel = function () {
            var t = this.chargeT;
            if (t >= C.ship.chargeT[2]) return 3;
            if (t >= C.ship.chargeT[1]) return 2;
            if (t >= C.ship.chargeT[0]) return 1;
            return 0;
        };
        Ship.prototype.shoot = function () {
            var sc = this.scene, w = C.weapons[this.weapon] || C.weapons.BLASTER;
            this.fireT = (C.ship.fireRate[STORE.diff] || 140) * w.rate;
            var mx = this.x, my = this.y - 24;   // muzzle above the nose; fire UP (dy negative)
            sc.pSpark.explode(2, mx, my);
            if (w.kind === 'spread') {
                // fan upward: ±0.18 rad around straight-up
                [-0.18, 0, 0.18].forEach(function (a) { sc.spawnBullet(mx, my, Math.sin(a), -Math.cos(a), 't_pbullet', C.ship.bulletSpd); });
                SFX.shoot();
                if (sc.hasOption && sc.option) sc.spawnBullet(sc.option.x, sc.option.y - 12, 0, -1, 't_pbullet', C.ship.bulletSpd);
            } else if (w.kind === 'laser') {
                sc.spawnBullet(mx, my, 0, -1, 't_laser', C.ship.bulletSpd + 120).setData('pierce', 3);
                SFX.laser();
            } else if (w.kind === 'missile') {
                sc.spawnBullet(mx, my, 0, -1, 't_pbullet', C.ship.bulletSpd);
                // a second missile angled out (covers an off-column enemy)
                sc.spawnBullet(mx - 4, my, -0.38, -0.92, 't_pmissile', C.ship.bulletSpd - 120);
                SFX.missile();
            } else {
                sc.spawnBullet(mx, my, 0, -1, 't_pbullet', C.ship.bulletSpd);
                if (sc.hasOption && sc.option) sc.spawnBullet(sc.option.x, sc.option.y - 12, 0, -1, 't_pbullet', C.ship.bulletSpd);
                SFX.shoot();
            }
        };
        Ship.prototype.fireCharge = function () {
            var sc = this.scene, lvl = this.chargeLevel(), mx = this.x, my = this.y - 26;
            var dmg = lvl === 3 ? 12 : lvl === 2 ? 6 : 3;
            var b = sc.spawnBullet(mx, my, 0, -1, 't_laser', C.ship.bulletSpd + 200);
            b.setData('pierce', lvl >= 2 ? 99 : 3); b.setData('chargeDmg', dmg);
            b.setScale(1 + lvl * 0.8, 1); b.setData('charge', true);   // widen the vertical beam
            sc.flash(0x9bffd0, 60); sc.burst(mx, my, 0x9bffd0, 10); SFX.laser();
        };
        Ship.prototype.bomb = function () {
            this.bombs--; var sc = this.scene;
            sc.flash(0xffffff, 160); sc.addTrauma(0.5); SFX.bomb();
            // clear all enemy bullets + damage all on-screen enemies
            sc.ebullets.getChildren().forEach(function (b) { if (b.active) { sc.ebullets.killAndHide(b); if (b.body) b.body.enable = false; } });
            var cam = sc.cameras.main;
            sc.enemies.getChildren().forEach(function (e) { if (e.active && e.y > cam.scrollY && e.y < cam.scrollY + BH) sc.dealEnemyDamage(e, 6); });
            sc.hazards.getChildren().forEach(function (h) { if (h.active && h.getData('type') !== 'laser' && h.y > cam.scrollY && h.y < cam.scrollY + BH) { h.setData('hp', 0); sc.clearHazard(h); } });
            if (sc.boss && sc.bossActive && sc.bossPhase >= 2) sc.hitBoss(sc.boss);
            sc.updateHUD();
        };

        /* spawn a player bullet with explicit direction; pierce handled in hitEnemy via data */
        GameScene.prototype.spawnBullet = function (x, y, dx, dy, tex, spd) {
            var b = this.bullets.get(x, y, tex);
            if (!b) return { setData: function () { return this; }, setScale: function () { return this; } };
            if (b.texture && b.texture.key !== tex) { b.setTexture(tex); }
            b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(false);
            b.setScale(1, 1);
            var len = Math.hypot(dx, dy) || 1;
            b.body.setVelocity(dx / len * spd, dy / len * spd);
            // vertical sprites point UP by default; rotate a missile to its travel dir (+90° offset)
            b.setRotation((tex === 't_pmissile') ? (Math.atan2(dy, dx) + Math.PI / 2) : 0);
            b.setData('pierce', 0); b.setData('charge', false); b.setData('chargeDmg', 0);
            return b;
        };

        return GameScene;
    }

})();
