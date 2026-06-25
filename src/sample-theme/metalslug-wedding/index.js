/* ======================================================================
   METAL SLUG WEDDING — "OPERATION: PELAMINAN"
   Phaser 3.80.1 run-and-gun wedding-invitation theme. Built from the
   METALSLUG_WEDDING_BIBLE.md spec.

   The invitation is DISCOVERED by playing: RESCUE POW couriers (bearded
   hostages, Metal Slug style) — each hands over one invitation piece. Clear
   6 sectors + defeat the final boss to rescue the couple and reveal the full
   invitation. But it is a WEDDING INVITATION first — every guest reaches the
   invitation via the 💌 button + Cheat (★), or by collecting the last piece.

   Host contract (see Bible APPENDIX Z): cleanup hook, verbatim host IDs,
   global submit fns + fallback, idempotent music mirror, dynamic piece count
   from #inv-source, celebration with 2 triggers. Phaser is host-CDN-loaded;
   this theme self-loads it as a fallback (ensurePhaser).
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

    var BUILD = 'metalslug-wedding';
    var VERSION = 'v1.4.1';
    try { console.log('%c[' + BUILD + '] ' + VERSION, 'background:#e23b2e;color:#fff;padding:2px 6px;border-radius:3px'); } catch (e) {}

    /* =================================================================
       CENTRAL CONFIG (Bible APPENDIX S) — all numbers in one place.
       ================================================================= */
    var CONFIG = {
        W: 540, H: 960, TILE: 30, GROUND_Y: 0, /* GROUND_Y set after boot from H */
        player: {
            run: 230, accel: 1800, drag: 2400, jump: -560, jumpCut: 0.45,
            coyoteMs: 90, bufferMs: 100, gravity: 1500, maxFall: 980, invulnMs: 1200,
            w: 22, h: 38
        },
        diff: {
            easy:   { hits: 2, lives: 5, density: 0.7, bulletSpd: 0.8, tellAdd: 0.2, aimAssist: true },
            normal: { hits: 1, lives: 3, density: 1.0, bulletSpd: 1.0, tellAdd: 0.0, aimAssist: false },
            hard:   { hits: 1, lives: 2, density: 1.4, bulletSpd: 1.2, tellAdd: -0.1, aimAssist: false }
        },
        weapons: {
            P: { name: 'PISTOL',     ico: 'P', dmg: 1, rate: 260, ammo: Infinity, kind: 'single' },
            H: { name: 'HEAVY MG',   ico: 'H', dmg: 1, rate: 85,  ammo: 220, kind: 'mg' },
            S: { name: 'SHOTGUN',    ico: 'S', dmg: 3, rate: 540, ammo: 30,  kind: 'cone' },
            F: { name: 'FLAME SHOT', ico: 'F', dmg: 2, rate: 110, ammo: 220, kind: 'flame' },
            R: { name: 'ROCKET',     ico: 'R', dmg: 8, rate: 700, ammo: 12,  kind: 'rocket' }
        },
        quotaShape: [3, 3, 2, 2, 1, 0],  /* per-sector POW quota; sum scaled to N real sections */
        grenades: 10,
        sectors: 6,
        storeKey: 'msw_v1'
    };

    var SECTOR_NAMES = ['Markas Latih', 'Kota Tua', 'Jembatan Sungai', 'Gurun Konvoi', 'Pangkalan Musuh', 'Markas Pelaminan'];
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

    var toastTimer;
    function toast(msg, ms) {
        var t = $('msw-toast'); if (!t) return;
        t.innerHTML = msg; t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 1900);
    }
    function showError(msg) {
        var c = $('msw-cover');
        if (c) {
            c.classList.add('show');
            c.innerHTML = '<div class="msw-overlay-card"><div class="msw-overlay-pixtitle" style="color:#ff6a6a">GAGAL MEMUAT</div><div class="msw-overlay-text">' + esc(msg) + '</div></div>';
        }
        try { console.error('[metalslug-wedding] ' + msg); } catch (e) {}
    }

    /* copy-to-clipboard for gift buttons (inline onclick=mswCopy) */
    window.mswCopy = function (id, btn) {
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
       PERSISTENCE (Bible APPENDIX Y/architecture) — versioned + try/catch.
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
        // FULL reset — wipe localStorage entirely (incl. difficulty), back to defaults.
        try { localStorage.removeItem(CONFIG.storeKey); } catch (e) {}
        STORE = { unlocked: [], maxSector: 0, best: 0, diff: 'normal', announcedAll: false, completed: false };
        saveStore();
    }

    /* =================================================================
       WEDDING LAYER — scan #inv-source for REAL sections (Bible APPENDIX W.3)
       Piece count is DYNAMIC: never hardcode.
       ================================================================= */
    var INFOS = [];          // [{key,title,el}]  in DOM order
    var unlocked = {};       // key -> true
    function scanInfos() {
        INFOS = Array.prototype.slice.call(document.querySelectorAll('#inv-source > section[data-info]'))
            .map(function (s) {
                var k = s.dataset.info;
                return { key: k, title: SECTION_TITLE[k] || k, el: s };
            });
        // restore persisted unlocks (only those that still exist)
        unlocked = {};
        (STORE.unlocked || []).forEach(function (k) {
            if (INFOS.some(function (i) { return i.key === k; })) unlocked[k] = true;
        });
    }
    function N() { return INFOS.length; }
    function unlockedCount() { return INFOS.filter(function (i) { return unlocked[i.key]; }).length; }
    function allInfoUnlocked() { return N() > 0 && unlockedCount() >= N(); }
    function titleOf(key) { var f = INFOS.filter(function (i) { return i.key === key; })[0]; return f ? f.title : key; }

    /* per-sector POW quota with auto-scale (Bible APPENDIX X.2) */
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
    function buildIndicators() {
        var inv = $('msw-inv'); if (!inv) return;
        inv.innerHTML = '';
        INFOS.forEach(function (info) {
            var chip = document.createElement('div');
            chip.className = 'msw-inv-chip' + (unlocked[info.key] ? ' is-on' : '');
            chip.title = info.title;
            chip.textContent = pieceGlyph(info.key);
            chip.dataset.key = info.key;
            chip.addEventListener('click', function () { if (unlocked[info.key]) openPieceModal(info.key); });
            inv.appendChild(chip);
        });
        var pt = $('msw-progress-t'); if (pt) pt.textContent = String(N());
        updateProgress();
    }
    function pieceGlyph(key) {
        var g = { hero: '♥', couple: '👰', rsvp: '✓', schedule: '⌚', streaming: '📺', story: '📖',
            gallery: '🖼', happiness: '📸', wishes: '✉', gift: '🎁', closing: '★' };
        return g[key] || '💌';
    }
    function updateProgress() {
        var pn = $('msw-progress-n'); if (pn) pn.textContent = String(unlockedCount());
        var view = $('msw-view-btn');
        if (view) {
            if (allInfoUnlocked() || cheat.on) view.classList.remove('is-locked');
            else view.classList.add('is-locked');
        }
    }
    function lightIndicator(key) {
        var chip = document.querySelector('.msw-inv-chip[data-key="' + key + '"]');
        if (chip) chip.classList.add('is-on');
        updateProgress();
    }

    /* unlock a piece (Bible APPENDIX X.4 — NO auto-open) */
    function unlockInfo(key, silent) {
        if (unlocked[key]) return false;
        unlocked[key] = true;
        if (STORE.unlocked.indexOf(key) < 0) { STORE.unlocked.push(key); saveStore(); }
        lightIndicator(key);
        if (!silent) {
            toast('💌 Kepingan "<b>' + esc(titleOf(key)) + '</b>" diselamatkan!');
        }
        if (allInfoUnlocked() && !STORE.announcedAll) {
            announceAllCollected();
        }
        return true;
    }
    function unlockAll(silent) {
        INFOS.forEach(function (i) { unlockInfo(i.key, true); });
        buildIndicators();
        if (!silent) updateProgress();
    }

    /* =================================================================
       MODAL + FULL REVEAL — clone from #inv-source (Bible APPENDIX X.5)
       ================================================================= */
    function openPieceModal(key) {
        var src = document.querySelector('#inv-source > section[data-info="' + key + '"]');
        if (!src) return;
        var body = $('msw-modal-body'), title = $('msw-modal-title');
        title.textContent = (SECTION_TITLE[key] || key).toUpperCase();
        body.innerHTML = '';
        var clone = src.cloneNode(true);
        clone.style.display = '';
        hydrateImages(clone);
        body.appendChild(clone);
        rewireHostFormsInside(body);
        rewireGalleryInside(body);
        $('msw-modal-root').classList.add('show');
    }
    function closeModal() { $('msw-modal-root').classList.remove('show'); }

    function revealFullInvitation() {
        var scroll = $('msw-reveal-scroll');
        scroll.innerHTML = '';
        INFOS.forEach(function (info) {
            var clone = info.el.cloneNode(true);
            clone.style.display = '';
            hydrateImages(clone);
            scroll.appendChild(clone);
        });
        rewireHostFormsInside(scroll);
        rewireGalleryInside(scroll);
        $('msw-reveal').classList.add('show');
        // mirror music intent ON when invitation opens (host plays only when isOpened)
        setMusic(true);
    }
    function closeReveal() { $('msw-reveal').classList.remove('show'); }

    // hero bg uses data-src (so it doesn't load in the hidden source); apply on clone
    function hydrateImages(root) {
        var bg = root.querySelector('.msw-hero-bg[data-src]');
        if (bg) { var u = bg.getAttribute('data-src'); if (u && u.indexOf('{{') !== 0) bg.style.backgroundImage = "url('" + u + "')"; }
    }

    /* re-wire host form buttons inside a clone so backend still fires
       (Bible APPENDIX Z.2). IDs stay verbatim; we just (re)attach handlers. */
    function rewireHostFormsInside(root) {
        var rsvp = root.querySelector('#btn-submit-kehadiran');
        if (rsvp) bindOnce(rsvp, function () {
            if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
            var a = root.querySelector('#alert-submit-kehadiran'); if (a) { a.className = 'msw-alert ok'; a.textContent = 'Terima kasih! Konfirmasi tersimpan.'; }
        });
        var ucp = root.querySelector('#btn-submit-ucapan');
        if (ucp) bindOnce(ucp, function () {
            if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
            // optimistic fallback: prepend to the wish list locally
            var nm = (root.querySelector('#wish-name') || {}).value || 'Tamu';
            var msg = (root.querySelector('#wish-message') || {}).value || '';
            var a = root.querySelector('#alert-submit-ucapan'); if (a) { a.className = 'msw-alert ok'; a.textContent = 'Terima kasih atas ucapannya!'; }
            var list = root.querySelector('#msw-wish-list');
            if (list && msg) {
                var it = document.createElement('div'); it.className = 'msw-wish-item';
                it.innerHTML = '<div class="msw-wish-head"><span class="msw-wish-author">' + esc(nm) + '</span><span class="msw-wish-time">baru saja</span></div><div class="msw-wish-text">' + esc(msg) + '</div>';
                list.insertBefore(it, list.firstChild);
            }
        });
    }
    function bindOnce(el, fn) {
        if (el.__mswBound) return;
        el.__mswBound = true;
        el.addEventListener('click', fn);
    }
    function rewireGalleryInside(root) {
        var items = root.querySelectorAll('.msw-gallery-item img');
        items.forEach(function (img) {
            if (img.__mswBound) return; img.__mswBound = true;
            img.parentElement.style.cursor = 'pointer';
            img.parentElement.addEventListener('click', function () {
                var lb = $('msw-lightbox'); $('msw-lightbox-img').src = img.src; lb.classList.add('show');
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
        var btn = $('msw-star-btn'); if (btn) btn.classList.toggle('is-on', cheat.on);
        var ss = $('msw-stagesel-btn'); if (ss) ss.style.display = cheat.on ? '' : 'none';
        if (cheat.on) {
            unlockAll();
            toast('★ CHEAT ON — kebal + semua sektor + undangan terbuka');
        } else {
            toast('Cheat off — mode jujur kembali');
        }
        updateProgress();
        if (GAME && GAME.scene && GAME.scene.scenes[0]) {
            var sc = GAME.scene.getScene('Game');
            if (sc && sc.player) sc.player.setCheat(cheat.on);
        }
    }

    /* =================================================================
       CELEBRATION (Bible APPENDIX Z.6) — 2 triggers, beat ~4.5s, persisted
       guards so it never repeats on re-inject.
       ================================================================= */
    function announceAllCollected() {
        if (STORE.announcedAll) return;
        STORE.announcedAll = true; saveStore();
        var sc = GAME && GAME.scene && GAME.scene.getScene('Game');
        if (sc && sc.celebrate) sc.celebrate('pieces');
        setTimeout(function () {
            var t = $('msw-allpieces-text');
            if (t) t.innerHTML = 'Hebat! Semua kepingan undangan ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'sudah terkumpul. Undangan siap dibuka!';
            showOverlay('msw-allpieces');
        }, 4500);
    }
    function bossFinale() {
        unlockAll(true);                  // ensure invitation never locked on win
        if (STORE.completed) { revealFullInvitation(); return; }
        STORE.completed = true; saveStore();
        var sc = GAME && GAME.scene && GAME.scene.getScene('Game');
        if (sc && sc.celebrate) sc.celebrate('boss');
        setTimeout(function () {
            var t = $('msw-win-text');
            if (t) t.innerHTML = 'Markas Pelaminan ditaklukkan! ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'berhasil diselamatkan. Selamat menempuh hidup baru — buka undangannya!';
            showOverlay('msw-win');
        }, 4500);
    }

    /* =================================================================
       OVERLAY helpers
       ================================================================= */
    function showOverlay(id) { hideOverlays(); var o = $(id); if (o) o.classList.add('show'); }
    function hideOverlays() {
        ['msw-cover', 'msw-briefing', 'msw-clear', 'msw-gameover', 'msw-allpieces', 'msw-win', 'msw-stagesel', 'msw-resetconfirm']
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
            if (myGen !== musicGen) return;            // intent changed → abort
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
        shoot: function () { blip(620 + (Math.random() * 60 - 30), 0.05, 'square', 0.025); },
        mg:    function () { blip(740 + (Math.random() * 80 - 40), 0.035, 'square', 0.02); },
        shotgun: function () { blip(180, 0.12, 'sawtooth', 0.05, 80); },
        rocket: function () { blip(120, 0.2, 'sawtooth', 0.05, 60); },
        jump:  function () { blip(360, 0.1, 'sine', 0.04, 620); },
        hit:   function () { blip(220, 0.12, 'triangle', 0.05, 90); },
        die:   function () { blip(160, 0.3, 'sawtooth', 0.06, 60); },
        rescue: function () { blip(520, 0.12, 'sine', 0.05, 880); setTimeout(function () { blip(780, 0.14, 'sine', 0.05, 1180); }, 90); },
        pickup: function () { blip(660, 0.08, 'square', 0.04, 990); },
        grenade: function () { blip(90, 0.25, 'sawtooth', 0.06, 50); },
        boss:  function () { blip(110, 0.4, 'sawtooth', 0.07, 70); },
        win:   function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.18, 'square', 0.05); }, i * 130); }); }
    };

    /* =================================================================
       ensurePhaser — host CDN-loads Phaser; fallback self-load (Bible APPENDIX S)
       ================================================================= */
    function ensurePhaser(cb) {
        if (window.Phaser) return cb();
        if (window.__mswPhaserLoading) { window.__mswPhaserLoading.then(cb); return; }
        window.__mswPhaserLoading = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(); showError('Gagal memuat Phaser dari internet. Cek koneksi.'); };
            document.body.appendChild(s);
        });
        window.__mswPhaserLoading.then(cb).catch(function () {});
    }

    var GAME = null;

    /* =================================================================
       (Phaser scene + entities are defined after Phaser is guaranteed,
       inside startWhenReady.)
       ================================================================= */
    function startWhenReady() {
        ensurePhaser(function () {
            if (!window.Phaser) { showError('Phaser tidak termuat (timeout).'); return; }
            defineAndBoot();
        });
    }

    // forward decl; real definition appended below
    var defineAndBoot;

    /* ===== KICKOFF: wire UI, scan, then wait for PRESS START ===== */
    function init() {
        scanInfos();
        QUOTA = buildQuota(N());
        STORE.diff = STORE.diff || 'normal';
        buildIndicators();
        wireUI();
        wireMusicMirror();
        drawCoupleCanvas();
        var v = $('msw-version'); if (v) v.textContent = VERSION;
        // if everything already unlocked from a prior session, light the 💌
        updateProgress();
    }

    /* =================================================================
       DECORATIVE COUPLE CANVAS (desktop right panel) — Canvas 2D, game vibes:
       groom in a suit + bride in a gown standing on a game battlefield scene,
       hearts, "JUST MARRIED" banner. Pure decoration (no game logic).
       ================================================================= */
    function drawCoupleCanvas() {
        var cv = $('msw-couple-canvas'); if (!cv || !cv.getContext) return;
        var x = cv.getContext('2d'); if (!x) return;
        var W = cv.width, H = cv.height, gy = H - 70;
        x.imageSmoothingEnabled = false;
        x.clearRect(0, 0, W, H);

        // sky gradient (sunset, wedding-warm)
        var sky = x.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#6a2a4a'); sky.addColorStop(0.5, '#c06a4a'); sky.addColorStop(1, '#f0c070');
        x.fillStyle = sky; x.fillRect(0, 0, W, H);
        // sun
        x.fillStyle = 'rgba(255,240,180,0.85)'; circle(x, W * 0.5, H * 0.34, 54);
        // far mountains
        x.fillStyle = '#3a2a4a'; tri(x, 0, gy, 180, gy - 150, 360, gy); tri(x, 260, gy, 460, gy - 190, 660, gy); tri(x, 540, gy, 700, gy - 140, W, gy);
        // ground
        x.fillStyle = '#3a4a2a'; x.fillRect(0, gy, W, H - gy);
        x.fillStyle = '#6a8a4a'; x.fillRect(0, gy, W, 8);
        // scenery props: palms left, sandbags right, barrel
        palm(x, 70, gy); palm(x, W - 80, gy);
        sandbags(x, 150, gy); barrel(x, W - 170, gy - 36);
        // little flag
        x.strokeStyle = '#b7a36a'; x.lineWidth = 4; line(x, W * 0.5 - 120, gy, W * 0.5 - 120, gy - 70);
        x.fillStyle = '#e23b2e'; tri(x, W * 0.5 - 116, gy - 68, W * 0.5 - 80, gy - 58, W * 0.5 - 116, gy - 46);

        // hearts floating
        x.fillStyle = 'rgba(255,138,176,0.9)';
        heart(x, W * 0.30, 80, 14); heart(x, W * 0.66, 64, 18); heart(x, W * 0.5, 120, 12);

        // === COUPLE (center) ===
        var cx = W * 0.5;
        // groom (left) — suit
        groom(x, cx - 70, gy);
        // bride (right) — gown + veil
        bride(x, cx + 70, gy);
        // joining heart between them
        x.fillStyle = '#e23b2e'; heart(x, cx, gy - 120, 22);

        // "JUST MARRIED" banner
        x.fillStyle = '#f3ead2'; roundRect(x, cx - 150, 16, 300, 40, 8); x.fill();
        x.fillStyle = '#e23b2e'; x.font = 'bold 26px "Courier New", monospace'; x.textAlign = 'center';
        x.fillText('JUST MARRIED', cx, 45);
        x.fillStyle = '#b7a36a'; x.fillRect(cx - 150, 52, 300, 4);

        // helpers ----------------------------------------------------
        function circle(c, X, Y, r) { c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill(); }
        function tri(c, x1, y1, x2, y2, x3, y3) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill(); }
        function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
        function roundRect(c, X, Y, w, h, r) { c.beginPath(); c.moveTo(X + r, Y); c.arcTo(X + w, Y, X + w, Y + h, r); c.arcTo(X + w, Y + h, X, Y + h, r); c.arcTo(X, Y + h, X, Y, r); c.arcTo(X, Y, X + w, Y, r); c.closePath(); }
        function heart(c, X, Y, s) { c.save(); c.translate(X, Y); c.beginPath(); c.moveTo(0, s * 0.3); c.bezierCurveTo(s, -s * 0.6, s * 1.2, s * 0.5, 0, s); c.bezierCurveTo(-s * 1.2, s * 0.5, -s, -s * 0.6, 0, s * 0.3); c.fill(); c.restore(); }
        function palm(c, X, gy2) {
            c.fillStyle = '#5a3a1a'; c.fillRect(X - 5, gy2 - 80, 10, 80);
            c.fillStyle = '#2e6a3a';
            tri(c, X, gy2 - 80, X - 46, gy2 - 104, X - 4, gy2 - 74);
            tri(c, X, gy2 - 80, X + 46, gy2 - 104, X + 4, gy2 - 74);
            tri(c, X, gy2 - 82, X - 26, gy2 - 124, X - 2, gy2 - 78);
            tri(c, X, gy2 - 82, X + 26, gy2 - 124, X + 2, gy2 - 78);
            c.fillStyle = '#ffd447'; circle(c, X, gy2 - 80, 5);
        }
        function sandbags(c, X, gy2) {
            for (var r = 0; r < 2; r++) for (var k = 0; k < 3; k++) {
                var bx = X + k * 18 + (r % 2 ? 9 : 0), by = gy2 - 26 + r * 14;
                c.fillStyle = '#9a8a5a'; roundRect(c, bx, by, 16, 13, 4); c.fill();
                c.strokeStyle = '#5a4a2a'; c.lineWidth = 1.5; roundRect(c, bx, by, 16, 13, 4); c.stroke();
            }
        }
        function barrel(c, X, Y) {
            c.fillStyle = '#7a4a2a'; roundRect(c, X, Y, 26, 36, 4); c.fill();
            c.fillStyle = '#3a2414'; c.fillRect(X, Y + 8, 26, 3); c.fillRect(X, Y + 25, 26, 3);
            c.fillStyle = '#ffd447'; c.fillRect(X + 9, Y + 14, 8, 8);
        }
        function groom(c, X, gy2) {
            // legs (suit trousers)
            c.fillStyle = '#23262e'; c.fillRect(X - 14, gy2 - 46, 12, 46); c.fillRect(X + 2, gy2 - 46, 12, 46);
            c.fillStyle = '#14161c'; c.fillRect(X - 16, gy2 - 4, 16, 6); c.fillRect(X, gy2 - 4, 16, 6); // shoes
            // jacket
            c.fillStyle = '#2a2e38'; roundRect(c, X - 18, gy2 - 86, 36, 50, 6); c.fill();
            // shirt + tie
            c.fillStyle = '#fff'; c.fillRect(X - 6, gy2 - 86, 12, 40);
            c.fillStyle = '#e23b2e'; c.beginPath(); c.moveTo(X, gy2 - 84); c.lineTo(X - 5, gy2 - 70); c.lineTo(X, gy2 - 56); c.lineTo(X + 5, gy2 - 70); c.closePath(); c.fill();
            // lapels
            c.fillStyle = '#1a1d24'; tri(c, X - 18, gy2 - 86, X - 2, gy2 - 86, X - 10, gy2 - 60); tri(c, X + 18, gy2 - 86, X + 2, gy2 - 86, X + 10, gy2 - 60);
            // head
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#2a2218'; c.fillRect(X - 12, gy2 - 116, 24, 9); // hair
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
            c.strokeStyle = '#c08a5a'; c.lineWidth = 1; c.beginPath(); c.arc(X, gy2 - 94, 4, 0.1, 3.0); c.stroke(); // smile
        }
        function bride(c, X, gy2) {
            // gown (triangle skirt)
            c.fillStyle = '#f3ead2'; c.beginPath(); c.moveTo(X - 28, gy2); c.lineTo(X - 10, gy2 - 60); c.lineTo(X + 10, gy2 - 60); c.lineTo(X + 28, gy2); c.closePath(); c.fill();
            c.fillStyle = '#fff8e4'; roundRect(c, X - 11, gy2 - 86, 22, 30, 6); c.fill(); // bodice
            // veil
            c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(X - 16, gy2 - 104); c.lineTo(X + 16, gy2 - 104); c.lineTo(X + 22, gy2 - 50); c.lineTo(X - 22, gy2 - 50); c.closePath(); c.fill();
            // head
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#6a4a2a'; c.fillRect(X - 13, gy2 - 116, 26, 11); // hair
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
            c.fillStyle = '#ff8ab0'; circle(c, X - 3, gy2 - 95, 2); circle(c, X + 5, gy2 - 95, 2); // blush
            // bouquet
            c.fillStyle = '#3a7d4a'; c.fillRect(X - 4, gy2 - 58, 8, 14);
            c.fillStyle = '#ff8ab0'; circle(c, X - 4, gy2 - 58, 5); circle(c, X + 4, gy2 - 58, 5); circle(c, X, gy2 - 64, 5);
        }
    }

    init();

    /* =================================================================
       UI WIRING (overlays, buttons, difficulty, stage-select, reset)
       ================================================================= */
    var pendingStartSector = 0;
    function wireUI() {
        // difficulty pickers (both cover + side mirror each other)
        function pickDiff(d) {
            STORE.diff = d; saveStore();
            document.querySelectorAll('.msw-diff-opt, .msw-diffopt').forEach(function (b) {
                b.classList.toggle('is-sel', b.dataset.diff === d);
            });
            var badge = $('msw-diff-badge');
            if (badge) { badge.textContent = d.toUpperCase(); badge.dataset.lvl = d; }
        }
        document.querySelectorAll('.msw-diff-opt, .msw-diffopt').forEach(function (b) {
            b.addEventListener('click', function () { pickDiff(b.dataset.diff); });
        });
        pickDiff(STORE.diff);

        // PRESS START (cover + side)
        function start() { startRun(0); }
        bindClick('msw-start', start);
        bindClick('msw-side-start', start);

        // skip → open invitation directly
        bindClick('msw-cover-view', openInvitationDirect);
        bindClick('msw-side-open', openInvitationDirect);
        bindClick('msw-gameover-view', openInvitationDirect);
        bindClick('msw-allpieces-view', function () { hideOverlays(); revealFullInvitation(); });
        bindClick('msw-allpieces-keep', function () { hideOverlays(); resumeGame(); });
        bindClick('msw-win-view', function () { hideOverlays(); revealFullInvitation(); });

        // 💌 view button
        bindClick('msw-view-btn', function () {
            if (allInfoUnlocked() || cheat.on) { revealFullInvitation(); }
            else { toast('Selamatkan semua POW dulu — atau tekan ★ untuk buka langsung'); }
        });

        // cheat / stage-select / reset
        bindClick('msw-star-btn', toggleCheat);
        bindClick('msw-stagesel-btn', openStageSelect);
        bindClick('msw-stagesel-ok', function () { hideOverlays(); startRun(pendingStage); });
        bindClick('msw-stagesel-close', function () { hideOverlays(); resumeGame(); });
        bindClick('msw-reset-btn', function () { showOverlay('msw-resetconfirm'); pauseGame(); });
        bindClick('msw-reset-yes', function () { resetGame(); });
        bindClick('msw-reset-no', function () { hideOverlays(); resumeGame(); });

        // briefing / clear / retry
        bindClick('msw-briefing-go', function () { hideOverlays(); beginSector(); });
        bindClick('msw-clear-next', function () { hideOverlays(); nextSector(); });
        bindClick('msw-retry', function () { hideOverlays(); startRun(0); });

        // modal / reveal / lightbox
        bindClick('msw-modal-close', closeModal);
        $('msw-modal-root').addEventListener('click', function (e) { if (e.target === $('msw-modal-root')) closeModal(); });
        bindClick('msw-reveal-close', closeReveal);
        bindClick('msw-lightbox-close', function () { $('msw-lightbox').classList.remove('show'); });
        $('msw-lightbox').addEventListener('click', function (e) { if (e.target === $('msw-lightbox')) e.currentTarget.classList.remove('show'); });

        // host QR button is intercepted by host (capture phase) — leave verbatim, no handler needed.
    }
    function bindClick(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }

    function openInvitationDirect() {
        unlockAll(true); buildIndicators(); hideOverlays(); revealFullInvitation();
    }
    var pendingStage = 0;
    function openStageSelect() {
        // default selection = current/last sector
        pendingStage = Math.min(runState.sector || 0, STORE.maxSector);
        var grid = $('msw-stagesel-grid'); grid.innerHTML = '';
        function paintSel() {
            grid.querySelectorAll('.msw-stagesel-cell').forEach(function (c) {
                c.classList.toggle('is-sel', +c.dataset.idx === pendingStage);
            });
        }
        for (var i = 0; i < CONFIG.sectors; i++) {
            (function (idx) {
                var cell = document.createElement('button');
                var unlockedSector = cheat.on || idx <= STORE.maxSector;
                cell.className = 'msw-stagesel-cell' + (unlockedSector ? '' : ' is-locked');
                cell.dataset.idx = idx;
                cell.textContent = (idx + 1) + '\n' + SECTOR_NAMES[idx];
                cell.style.whiteSpace = 'pre-line';
                // click only MARKS the selection (pending) — does NOT start (2-step UX)
                if (unlockedSector) cell.addEventListener('click', function () { pendingStage = idx; paintSel(); });
                grid.appendChild(cell);
            })(i);
        }
        paintSel();
        showOverlay('msw-stagesel');
        pauseGame();
    }

    /* =================================================================
       INPUT MODEL (keyboard + touch → one abstraction) — Bible §4.4
       ================================================================= */
    var input = { left: false, right: false, up: false, down: false, jump: false, jumpEdge: false, fire: false, nade: false, nadeEdge: false, board: false, boardEdge: false };
    var _prevJump = false, _prevNade = false, _prevBoard = false;
    function pollEdges() {
        input.jumpEdge = input.jump && !_prevJump; _prevJump = input.jump;
        input.nadeEdge = input.nade && !_prevNade; _prevNade = input.nade;
        input.boardEdge = input.board && !_prevBoard; _prevBoard = input.board;
    }

    function wireInput() {
        // keyboard
        var down = function (e) {
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': input.left = true; break;
                case 'ArrowRight': case 'KeyD': input.right = true; break;
                case 'ArrowUp': case 'KeyW': input.up = true; break;
                case 'ArrowDown': case 'KeyS': input.down = true; break;
                case 'Space': input.jump = true; e.preventDefault(); break;
                case 'KeyX': case 'KeyJ': input.fire = true; break;
                case 'KeyC': case 'KeyK': input.nade = true; break;
                case 'KeyE': input.board = true; break;
            }
        };
        var up = function (e) {
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': input.left = false; break;
                case 'ArrowRight': case 'KeyD': input.right = false; break;
                case 'ArrowUp': case 'KeyW': input.up = false; break;
                case 'ArrowDown': case 'KeyS': input.down = false; break;
                case 'Space': input.jump = false; break;
                case 'KeyX': case 'KeyJ': input.fire = false; break;
                case 'KeyC': case 'KeyK': input.nade = false; break;
                case 'KeyE': input.board = false; break;
            }
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        onCleanup(function () { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });

        // touch buttons
        holdBtn('msw-fire', function (v) { input.fire = v; });
        tapBtn('msw-jump', function () { input.jump = true; setTimeout(function () { input.jump = false; }, 80); });
        tapBtn('msw-nade', function () { input.nade = true; setTimeout(function () { input.nade = false; }, 60); });

        wireJoystick();
    }
    function holdBtn(id, set) {
        var el = $(id); if (!el) return;
        var on = function (e) { e.preventDefault(); set(true); };
        var off = function (e) { e.preventDefault(); set(false); };
        el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off);
        el.addEventListener('touchcancel', off);
        el.addEventListener('mousedown', on); window.addEventListener('mouseup', off);
        onCleanup(function () { el.removeEventListener('touchstart', on); el.removeEventListener('touchend', off); el.removeEventListener('mousedown', on); window.removeEventListener('mouseup', off); });
    }
    function tapBtn(id, fn) {
        var el = $(id); if (!el) return;
        var h = function (e) { e.preventDefault(); fn(); };
        el.addEventListener('touchstart', h, { passive: false });
        el.addEventListener('mousedown', h);
        onCleanup(function () { el.removeEventListener('touchstart', h); el.removeEventListener('mousedown', h); });
    }
    function wireJoystick() {
        var joy = $('msw-joy'), nub = $('msw-joy-nub'); if (!joy || !nub) return;
        var active = false, cx = 0, cy = 0, R = 40;
        function center() { var r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2 - 8; }
        function setFrom(px, py) {
            var dx = px - cx, dy = py - cy;
            var dist = Math.hypot(dx, dy) || 1;
            var k = Math.min(1, dist / R);
            var nx = dx / dist * k * R, ny = dy / dist * k * R;
            nub.style.transform = 'translate(' + nx + 'px,' + ny + 'px)';
            input.left = dx < -R * 0.35; input.right = dx > R * 0.35;
            input.up = dy < -R * 0.4; input.down = dy > R * 0.4;
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
        // user toggling the music button directly should still feel responsive
        var btn = $('btn-toggle-music');
        if (btn) {
            var h = function () { musicWanted = !hostMusicPlaying(); /* let host flip; reflect on event */ };
            btn.addEventListener('click', h);
            onCleanup(function () { btn.removeEventListener('click', h); });
        }
    }

    /* =================================================================
       RUN CONTROL — bridges UI to the Phaser scene.
       ================================================================= */
    var runState = { sector: 0, lives: 0, score: 0 };
    function startRun(sector) {
        hideOverlays();
        runState.sector = sector;
        var d = CONFIG.diff[STORE.diff];
        runState.lives = d.lives;
        runState.score = STORE.best && sector > 0 ? runState.score : 0;
        if (sector === 0) runState.score = 0;
        wireInputOnce();
        startWhenReady();   // boots Phaser + Game scene (idempotent via cleanup)
        // briefing shown by scene create
    }
    var _inputWired = false;
    function wireInputOnce() { if (_inputWired) return; _inputWired = true; wireInput(); }

    // FULL game reset: wipe storage, tear down the running game (stage reset), reset cheat &
    // difficulty UI to default, and return to the COVER screen so the player re-picks difficulty
    // before pressing START again.
    function resetGame() {
        resetStore();                     // clears localStorage + diff → 'normal'
        // tear down the running Phaser game so the stage truly resets
        if (typeof GAME !== 'undefined' && GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__gwGame = null; }
        // reset in-memory run + cheat
        runState = { sector: 0, lives: 0, score: 0 };
        cheat.on = false;
        var sb = $('msw-star-btn'); if (sb) sb.classList.remove('is-on');
        var ss = $('msw-stagesel-btn'); if (ss) ss.style.display = 'none';
        // rescan invitation, rebuild indicators (all locked again)
        scanInfos(); QUOTA = buildQuota(N()); buildIndicators(); updateProgress();
        // reset difficulty pickers (cover + stage-select) to default NORMAL
        document.querySelectorAll('.msw-diff-opt, .msw-diffopt').forEach(function (b) {
            b.classList.toggle('is-sel', b.dataset.diff === 'normal');
        });
        var badge = $('msw-diff-badge'); if (badge) { badge.textContent = 'NORMAL'; badge.dataset.lvl = 'normal'; }
        // back to the COVER (difficulty pick + PRESS START)
        hideOverlays();
        showOverlay('msw-cover');
        toast('Game direset — pilih kesulitan & mulai lagi');
    }

    function pauseGame() { var sc = scene(); if (sc) sc.scene.pause(); }
    function resumeGame() { var sc = scene(); if (sc && sc.scene.isPaused()) sc.scene.resume(); }
    function scene() { return GAME && GAME.scene ? GAME.scene.getScene('Game') : null; }

    // sector lifecycle (driven by scene callbacks)
    function beginSector() { var sc = scene(); if (sc && sc.loadSector) sc.loadSector(runState.sector); }
    function nextSector() {
        runState.sector++;
        if (runState.sector >= CONFIG.sectors) { return; }
        if (runState.sector > STORE.maxSector) { STORE.maxSector = runState.sector; saveStore(); }
        var sc = scene(); if (sc && sc.loadSector) sc.loadSector(runState.sector);
    }

    /* =================================================================
       PART 2 — PHASER GAME (textures, Player, enemies, boss, level, juice)
       Defined now that helpers above exist; booted by startWhenReady().
       ================================================================= */
    defineAndBoot = function () {
        var P = window.Phaser;

        /* ---------- procedural textures (Bible APPENDIX T.5 — guard restart) ---------- */
        function tex(scene, key, w, h, draw) {
            if (scene.textures.exists(key)) return;
            var g = scene.make.graphics({ x: 0, y: 0 }, false);
            draw(g, w, h);
            g.generateTexture(key, w, h);
            g.destroy();
        }
        function buildTextures(scene) {
            // helper: pixel-art shading — base + top highlight + bottom shadow + dark outline
            function box(g, x, y, w, h, base, hi, sh) {
                g.fillStyle(base, 1); g.fillRect(x, y, w, h);
                if (hi != null) { g.fillStyle(hi, 1); g.fillRect(x, y, w, Math.max(1, h * 0.22 | 0)); }
                if (sh != null) { g.fillStyle(sh, 1); g.fillRect(x, y + h - Math.max(1, h * 0.22 | 0), w, Math.max(1, h * 0.22 | 0)); }
            }
            function outline(g, x, y, w, h, col) { g.lineStyle(2, col != null ? col : 0x10140d, 1); g.strokeRect(x, y, w, h); }

            // ---- PLAYER: commando in a smart cyan beret + olive uniform ----
            // ---- PLAYER as PROCEDURAL FRAME-BY-FRAME SPRITES ----
            // One drawer parameterized by pose → many frame textures → real Phaser anims.
            // legPhase: leg swing (run cycle), bob: vertical bounce, arm: rifle arm raise,
            // prone: low pose, hurt: tinted. Keeps everything procedural (no CDN/CORS).
            function drawCommando(g, opt) {
                opt = opt || {};
                var bob = opt.bob || 0, lp = opt.legPhase || 0, prone = !!opt.prone, hurt = !!opt.hurt;
                var skin = hurt ? 0xff9a9a : 0xf3d2a0, skinHi = hurt ? 0xffcaca : 0xffe6c0;
                if (prone) {
                    // lying-low pose: shorter, wider
                    box(g, 3, 28, 22, 10, 0x3a6b4a, 0x5a9b6a, 0x254a32);   // torso low
                    g.fillStyle(0x2e3a25, 1); g.fillRect(2, 36, 10, 4); g.fillRect(16, 36, 8, 4); // legs flat
                    box(g, 4, 22, 11, 9, skin, skinHi, 0xd0a878);          // head forward
                    g.fillStyle(0x10140d, 1); g.fillRect(7, 26, 2, 2);
                    box(g, 2, 19, 14, 4, 0x4fd6c8, 0x86eee2, 0x2c8a80);    // beret
                    box(g, 14, 30, 13, 4, 0x2a2a2a, 0x555, 0x111);         // rifle forward
                    outline(g, 3, 19, 22, 19);
                    return;
                }
                var y0 = 6 + bob;
                box(g, 5, 20 + bob, 16, 20, 0x3a6b4a, 0x5a9b6a, 0x254a32); // torso
                // legs swing by legPhase (-3..+3)
                var L = Math.round(lp), Rg = -L;
                box(g, 5 + L, 32 + bob, 7, 9 - Math.abs(L), 0x2e3a25, 0x4a5d3a, 0x1c2417);  // left leg
                box(g, 13 + Rg, 32 + bob, 7, 9 - Math.abs(Rg), 0x2e3a25, 0x4a5d3a, 0x1c2417); // right leg
                g.fillStyle(0x2a2218, 1); g.fillRect(4 + L, 39 + bob - Math.abs(L), 9, 3); g.fillRect(13 + Rg, 39 + bob - Math.abs(Rg), 9, 3); // boots
                box(g, 7, y0, 12, 13, skin, skinHi, 0xd0a878);            // head
                g.fillStyle(0x10140d, 1); g.fillRect(10, 5 + bob, 2, 2); g.fillRect(15, 5 + bob, 2, 2); // eyes
                box(g, 5, 2 + bob, 16, 6, 0x4fd6c8, 0x86eee2, 0x2c8a80);  // beret
                g.fillStyle(0xffd447, 1); g.fillRect(7, 3 + bob, 3, 3);   // badge
                box(g, 18, 22 + bob + (opt.armUp ? -2 : 0), 11, 4, 0x2a2a2a, 0x555, 0x111); // rifle
                outline(g, 5, y0, 16, 34 - bob);
            }
            tex(scene, 't_player', 30, 42, function (g) { drawCommando(g, { bob: 0 }); }); // fallback static
            tex(scene, 't_player_idle0', 30, 42, function (g) { drawCommando(g, { bob: 0 }); });
            tex(scene, 't_player_idle1', 30, 42, function (g) { drawCommando(g, { bob: 1 }); });
            tex(scene, 't_player_run0', 30, 42, function (g) { drawCommando(g, { bob: 0, legPhase: 3 }); });
            tex(scene, 't_player_run1', 30, 42, function (g) { drawCommando(g, { bob: -1, legPhase: 0 }); });
            tex(scene, 't_player_run2', 30, 42, function (g) { drawCommando(g, { bob: 0, legPhase: -3 }); });
            tex(scene, 't_player_run3', 30, 42, function (g) { drawCommando(g, { bob: -1, legPhase: 0 }); });
            tex(scene, 't_player_jump', 30, 42, function (g) { drawCommando(g, { bob: -1, legPhase: 2, armUp: true }); });
            tex(scene, 't_player_fall', 30, 42, function (g) { drawCommando(g, { bob: 1, legPhase: -1 }); });
            tex(scene, 't_player_prone', 30, 42, function (g) { drawCommando(g, { prone: true }); });
            tex(scene, 't_player_hurt', 30, 42, function (g) { drawCommando(g, { bob: 0, hurt: true }); });
            // ---- BULLETS / projectiles ----
            tex(scene, 't_bullet', 12, 5, function (g) { g.fillStyle(0xfff4b0, 1); g.fillRect(0, 0, 12, 5); g.fillStyle(0xffd447, 1); g.fillRect(0, 2, 12, 3); g.fillStyle(0xff8a3d, 1); g.fillRect(0, 1, 3, 3); });
            tex(scene, 't_ebullet', 9, 9, function (g) { g.fillStyle(0xff8a3d, 1); g.fillCircle(4.5, 4.5, 4.5); g.fillStyle(0xff5a4d, 1); g.fillCircle(4.5, 4.5, 3); g.fillStyle(0xfff, 0.8); g.fillCircle(3, 3, 1.2); });
            tex(scene, 't_rocket', 18, 9, function (g) { g.fillStyle(0xd0d0d0, 1); g.fillRect(0, 1, 14, 7); g.fillStyle(0xe23b2e, 1); g.fillRect(11, 0, 7, 9); g.fillStyle(0xffd447, 1); g.fillRect(0, 3, 4, 3); g.fillStyle(0x888, 1); g.fillRect(2, 2, 9, 1); });
            tex(scene, 't_flame', 16, 16, function (g) { g.fillStyle(0xff7b2e, 0.85); g.fillCircle(8, 8, 8); g.fillStyle(0xffb627, 0.9); g.fillCircle(8, 9, 5); g.fillStyle(0xfff4b0, 0.95); g.fillCircle(8, 10, 2.5); });
            tex(scene, 't_nade', 11, 12, function (g) { g.fillStyle(0x3a7d44, 1); g.fillCircle(5.5, 7, 5); g.fillStyle(0x4a9d54, 1); g.fillCircle(4, 5, 2); g.fillStyle(0x222, 1); g.fillRect(4, 0, 3, 3); });
            // ---- ENEMIES ----
            tex(scene, 't_e_rush', 24, 38, function (g) {            // red rebel rusher
                box(g, 4, 15, 16, 22, 0x9c3a3a, 0xc25a5a, 0x6a2424);
                box(g, 5, 32, 6, 6, 0x3a1a1a, null, null); box(g, 13, 32, 6, 6, 0x3a1a1a, null, null);
                box(g, 7, 5, 11, 11, 0xf3d2a0, 0xffe6c0, 0xd0a878);
                g.fillStyle(0x10140d, 1); g.fillRect(10, 9, 2, 2); g.fillRect(14, 9, 2, 2);
                box(g, 5, 1, 15, 5, 0x6a2424, 0x9c3a3a, 0x401414);  // helmet
                outline(g, 4, 5, 16, 32);
            });
            tex(scene, 't_e_range', 24, 38, function (g) {           // purple ranged
                box(g, 4, 15, 16, 22, 0x6a4a9c, 0x8a6abc, 0x402a6a);
                box(g, 5, 32, 6, 6, 0x281a3a, null, null); box(g, 13, 32, 6, 6, 0x281a3a, null, null);
                box(g, 7, 5, 11, 11, 0xf3d2a0, 0xffe6c0, 0xd0a878);
                g.fillStyle(0x10140d, 1); g.fillRect(10, 9, 2, 2); g.fillRect(14, 9, 2, 2);
                box(g, 5, 1, 15, 5, 0x402a6a, 0x6a4a9c, 0x281640);
                box(g, 18, 20, 12, 4, 0x333, 0x666, 0x111);         // gun
                outline(g, 4, 5, 16, 32);
            });
            tex(scene, 't_turret', 38, 28, function (g) {
                box(g, 2, 12, 34, 16, 0x4a4a52, 0x6a6a72, 0x2a2a32);
                box(g, 11, 2, 16, 12, 0x5a5a62, 0x7a7a82, 0x3a3a42);
                g.fillStyle(0xe23b2e, 1); g.fillRect(24, 5, 14, 5);  // barrel (red tip)
                g.fillStyle(0x111, 1); for (var i = 0; i < 5; i++) g.fillRect(4 + i * 7, 24, 4, 4);
                outline(g, 2, 2, 34, 26);
            });
            tex(scene, 't_drone', 32, 20, function (g) {
                box(g, 3, 6, 26, 9, 0x556, 0x778, 0x334);
                g.fillStyle(0xaab, 1); g.fillRect(0, 2, 9, 3); g.fillRect(23, 2, 9, 3);  // rotors
                g.fillStyle(0xff5a4d, 1); g.fillCircle(16, 11, 2.5);
                g.fillStyle(0xffd447, 0.8); g.fillCircle(8, 10, 1.5); g.fillCircle(24, 10, 1.5);
                outline(g, 3, 6, 26, 9);
            });
            tex(scene, 't_tank', 64, 40, function (g) {
                box(g, 2, 18, 60, 18, 0x3a4a2a, 0x5a6a4a, 0x222e16);
                box(g, 12, 5, 30, 15, 0x4a5d3a, 0x6a7d5a, 0x2e3a25);
                g.fillStyle(0x222, 1); g.fillRect(38, 8, 26, 6);    // cannon
                g.fillStyle(0xe23b2e, 1); g.fillRect(60, 9, 4, 4);  // muzzle
                g.fillStyle(0x111, 1); for (var i = 0; i < 6; i++) g.fillCircle(9 + i * 9, 36, 4.5);
                g.fillStyle(0x555, 1); for (var j = 0; j < 6; j++) g.fillCircle(9 + j * 9, 36, 1.5);
                outline(g, 2, 5, 60, 31);
            });
            tex(scene, 't_boss', 130, 140, function (g) {
                box(g, 8, 34, 114, 102, 0x5a2a2a, 0x7a3a3a, 0x3a1818);     // body armor
                box(g, 26, 8, 78, 42, 0x6a3a3a, 0x8a4a4a, 0x401c1c);      // head/cockpit
                g.fillStyle(0x222, 1); g.fillRect(104, 44, 26, 16);        // cannon arm
                g.fillStyle(0xe23b2e, 1); g.fillRect(124, 47, 6, 10);
                g.fillStyle(0x10140d, 1); g.fillRect(40, 22, 10, 9); g.fillRect(80, 22, 10, 9); // eyes
                g.fillStyle(0xff5a4d, 1); g.fillRect(42, 24, 4, 4); g.fillRect(82, 24, 4, 4);
                g.fillStyle(0xffd447, 1); g.fillCircle(65, 86, 14);        // weak point
                g.fillStyle(0xfff4b0, 1); g.fillCircle(65, 86, 7);
                g.lineStyle(3, 0x10140d, 1); g.strokeRect(8, 8, 114, 128);
            });
            // ---- POW courier (bearded hostage handing an invitation) ----
            tex(scene, 't_pow', 24, 40, function (g) {
                box(g, 4, 16, 15, 24, 0x9a8a5a, 0xbaaa7a, 0x6a5a32); // ragged tan body
                box(g, 7, 5, 11, 12, 0xf3d2a0, 0xffe6c0, 0xd0a878);
                g.fillStyle(0x10140d, 1); g.fillRect(10, 9, 2, 2); g.fillRect(14, 9, 2, 2);
                g.fillStyle(0xeee, 1); g.fillRect(6, 13, 13, 7);    // big white beard
                g.fillStyle(0xddd, 1); g.fillRect(7, 18, 11, 3);
                g.fillStyle(0x8a6a3a, 1); g.fillRect(7, 2, 11, 4);  // hair
                outline(g, 4, 5, 15, 35);
            });
            tex(scene, 't_amplop', 28, 20, function (g) {
                box(g, 0, 0, 28, 20, 0xf3ead2, 0xfff8e4, 0xd8caa8);
                g.lineStyle(2, 0xe23b2e, 1); g.beginPath(); g.moveTo(1, 1); g.lineTo(14, 11); g.lineTo(27, 1); g.strokePath();
                g.fillStyle(0xe23b2e, 1); g.fillCircle(14, 12, 3.5);  // heart seal
                g.fillStyle(0xe23b2e, 1); g.fillCircle(12, 11, 2); g.fillCircle(16, 11, 2);
                outline(g, 0, 0, 28, 20, 0xb89a48);
            });
            tex(scene, 't_crate', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0x7a5a2a, 0x9a7a4a, 0x4a3a18);
                g.lineStyle(3, 0x3a2a14, 1); g.strokeRect(2, 2, 28, 28);
                g.beginPath(); g.moveTo(2, 2); g.lineTo(30, 30); g.moveTo(30, 2); g.lineTo(2, 30); g.strokePath();
                g.fillStyle(0xffd447, 1); g.fillRect(12, 12, 8, 8);  // weapon star
            });
            tex(scene, 't_slug', 80, 46, function (g) {
                box(g, 2, 18, 76, 22, 0x3a5d4a, 0x5a7d6a, 0x223e2e);
                box(g, 16, 4, 36, 16, 0x4a7d5a, 0x6a9d7a, 0x2e5d3e);
                g.fillStyle(0x222, 1); g.fillRect(48, 8, 32, 6);
                g.fillStyle(0x111, 1); for (var i = 0; i < 7; i++) g.fillCircle(9 + i * 10, 41, 5.5);
                g.fillStyle(0x555, 1); for (var j = 0; j < 7; j++) g.fillCircle(9 + j * 10, 41, 2);
                outline(g, 2, 4, 76, 36);
            });

            // ---- GROUND & PLATFORMS (textured) ----
            tex(scene, 't_ground', 64, 64, function (g) {
                g.fillStyle(0x3a4a2a, 1); g.fillRect(0, 0, 64, 64);
                g.fillStyle(0x6a8a4a, 1); g.fillRect(0, 0, 64, 8);        // grassy top
                g.fillStyle(0x5a7a3a, 1); for (var i = 0; i < 64; i += 6) g.fillRect(i, 0, 3, 5);
                g.fillStyle(0x2e3a22, 1); for (var j = 0; j < 8; j++) g.fillRect((j * 17) % 60, 16 + (j * 11) % 40, 6, 6);
                g.fillStyle(0x23301c, 1); for (var k = 0; k < 6; k++) g.fillRect((k * 23) % 58, 30 + (k * 7) % 28, 4, 4);
            });
            tex(scene, 't_plat', 96, 20, function (g) {
                box(g, 0, 0, 96, 20, 0x4a5d3a, 0x6a8a4a, 0x2e3a25);
                g.fillStyle(0x6a8a4a, 1); g.fillRect(0, 0, 96, 4);
                g.fillStyle(0x2e3a25, 1); for (var i = 8; i < 96; i += 16) g.fillRect(i, 8, 2, 10);
            });
            tex(scene, 't_spike', 48, 18, function (g) {
                g.fillStyle(0x3a2a18, 1); g.fillRect(0, 12, 48, 6);
                g.fillStyle(0x8a8a92, 1);
                for (var i = 0; i < 6; i++) { g.fillTriangle(i * 8, 16, i * 8 + 4, 0, i * 8 + 8, 16); }
                g.fillStyle(0xc0c0c8, 1); for (var j = 0; j < 6; j++) g.fillTriangle(j * 8 + 2, 14, j * 8 + 4, 2, j * 8 + 4, 14);
            });
            tex(scene, 't_spark', 7, 7, function (g) { g.fillStyle(0xffffff, 1); g.fillCircle(3.5, 3.5, 3.5); g.fillStyle(0xffd447, 1); g.fillCircle(3.5, 3.5, 2); });
            tex(scene, 't_heart', 11, 11, function (g) { g.fillStyle(0x4fd6c8, 1); g.fillCircle(3.2, 4, 3.2); g.fillCircle(7.8, 4, 3.2); g.fillTriangle(0.5, 5, 10.5, 5, 5.5, 11); });
            tex(scene, 't_cage', 76, 96, function (g) {
                g.lineStyle(4, 0xc7b37a, 1);
                for (var i = 0; i <= 76; i += 13) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 96); g.strokePath(); }
                for (var j = 0; j <= 96; j += 24) { g.beginPath(); g.moveTo(0, j); g.lineTo(76, j); g.strokePath(); }
                g.lineStyle(5, 0x8a7a4a, 1); g.strokeRect(0, 0, 76, 96);
            });
            // caged couple silhouette (groom in suit + bride) behind the bars
            tex(scene, 't_couple_caged', 60, 80, function (g) {
                // groom (left, suit)
                box(g, 6, 28, 16, 48, 0x23262e, 0x3a3e48, 0x14161c);
                g.fillStyle(0xfff, 1); g.fillRect(11, 30, 6, 24);     // shirt
                g.fillStyle(0xe23b2e, 1); g.fillRect(13, 30, 2, 14);  // tie
                box(g, 9, 14, 10, 12, 0xf3d2a0, 0xffe6c0, 0xd0a878); g.fillStyle(0x2a2218,1); g.fillRect(9,12,10,5);
                // bride (right, gown + veil)
                box(g, 34, 30, 18, 46, 0xf3ead2, 0xfff8e4, 0xd8caa8);
                g.fillStyle(0xffffff, 0.7); g.fillRect(33, 16, 20, 20); // veil
                box(g, 38, 14, 10, 12, 0xf3d2a0, 0xffe6c0, 0xd0a878);
                g.fillStyle(0x6a4a2a,1); g.fillRect(37,12,12,5);
                g.fillStyle(0xff8ab0, 1); g.fillCircle(43, 40, 3);    // bouquet
            });

            // ===== SCENERY PROPS (parallax decoration) =====
            tex(scene, 't_palm', 70, 110, function (g) {           // palm tree
                g.fillStyle(0x5a3a1a, 1); g.fillRect(30, 40, 10, 70);
                g.fillStyle(0x6a4a24, 1); g.fillRect(30, 40, 4, 70);
                g.fillStyle(0x2e6a3a, 1);
                g.fillTriangle(35, 40, 2, 18, 30, 36); g.fillTriangle(35, 40, 68, 18, 40, 36);
                g.fillTriangle(35, 38, 14, 2, 32, 34); g.fillTriangle(35, 38, 56, 2, 38, 34);
                g.fillStyle(0x3a8a4a, 1); g.fillTriangle(35, 40, 10, 28, 33, 36); g.fillTriangle(35, 40, 60, 28, 37, 36);
                g.fillStyle(0xffd447, 1); g.fillCircle(35, 40, 4); g.fillCircle(40, 42, 3);  // coconuts
            });
            tex(scene, 't_bush', 54, 30, function (g) {
                g.fillStyle(0x2e5d3a, 1); g.fillCircle(14, 20, 14); g.fillCircle(30, 16, 16); g.fillCircle(44, 21, 12);
                g.fillStyle(0x3a7d4a, 1); g.fillCircle(20, 14, 7); g.fillCircle(36, 12, 6);
            });
            tex(scene, 't_sandbag', 46, 30, function (g) {
                for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) {
                    var x = 2 + c * 15 + (r % 2 ? 7 : 0), y = 2 + r * 13;
                    box(g, x, y, 14, 12, 0x9a8a5a, 0xbaaa7a, 0x6a5a32); outline(g, x, y, 14, 12, 0x5a4a2a);
                }
            });
            tex(scene, 't_barrel', 26, 36, function (g) {
                box(g, 2, 2, 22, 32, 0x7a4a2a, 0x9a6a4a, 0x4a2a14);
                g.fillStyle(0x3a2414, 1); g.fillRect(2, 8, 22, 3); g.fillRect(2, 24, 22, 3);
                g.fillStyle(0xffd447, 1); g.fillRect(9, 14, 8, 8); g.fillStyle(0x111,1); g.fillRect(11,16,4,4);
                outline(g, 2, 2, 22, 32, 0x3a2414);
            });
            tex(scene, 't_flag', 40, 60, function (g) {
                g.fillStyle(0xb7a36a, 1); g.fillRect(2, 0, 4, 60);
                g.fillStyle(0xe23b2e, 1); g.fillTriangle(6, 2, 38, 12, 6, 24);
                g.fillStyle(0xffd447, 1); g.fillCircle(16, 12, 4);   // ♥-ish emblem
            });
            tex(scene, 't_cloud', 90, 40, function (g) {
                g.fillStyle(0xffffff, 0.85); g.fillCircle(24, 26, 16); g.fillCircle(46, 20, 20); g.fillCircle(68, 26, 15); g.fillRect(20, 24, 50, 14);
            });
            tex(scene, 't_mountain', 260, 150, function (g) {
                g.fillStyle(0x2a3a4a, 1); g.fillTriangle(0, 150, 90, 20, 180, 150);
                g.fillStyle(0x34465a, 1); g.fillTriangle(120, 150, 200, 40, 260, 150);
                g.fillStyle(0xeef4ff, 0.6); g.fillTriangle(70, 50, 90, 20, 110, 50); g.fillTriangle(184, 62, 200, 40, 216, 62);
            });
            tex(scene, 't_hill', 280, 200, function (g) { g.fillStyle(0x2a3a1c, 1); g.fillEllipse(140, 130, 320, 220); });
            tex(scene, 't_arch', 120, 130, function (g) {        // wedding altar arch (boss bg)
                g.fillStyle(0xc7b37a, 1); g.fillRect(8, 20, 12, 110); g.fillRect(100, 20, 12, 110);
                g.fillStyle(0xd7c38a, 1); g.fillRect(8, 16, 104, 14);
                g.fillStyle(0xff8ab0, 1); for (var i = 0; i < 8; i++) g.fillCircle(14 + i * 13, 22, 5);
                g.fillStyle(0x6a8a4a, 1); for (var j = 0; j < 6; j++) g.fillCircle(10 + j * 2, 30 + j * 16, 6);
            });
        }

        /* boot params measured from real DOM size (Bible APPENDIX T.1) */
        var stageEl = $('gw-stage');
        if (!stageEl) { showError('Elemen #gw-stage tidak ditemukan.'); return; }
        var rect = stageEl.getBoundingClientRect();
        var BW = Math.max(320, Math.round(rect.width));
        var BH = Math.max(480, Math.round(rect.height));
        // ground line raised well above the touch controls (~120px tall + margin) so the
        // character never hides behind FIRE/JMP. On desktop (no touch) we still keep it high
        // for a consistent play area.
        var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        CONFIG.GROUND_Y = BH - (isTouch ? 200 : 150);

        var GameScene = makeGameScene(P, buildTextures, BW, BH);

        var config = {
            type: P.AUTO, parent: 'gw-stage', width: BW, height: BH,
            backgroundColor: '#16201a',
            render: { pixelArt: true, antialias: false, roundPixels: true },
            scale: { mode: P.Scale.FIT, autoCenter: P.Scale.CENTER_BOTH },
            physics: { default: 'arcade', arcade: { gravity: { y: CONFIG.player.gravity }, debug: false } },
            scene: [GameScene]
        };
        if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
        GAME = new P.Game(config);
        window.__gwGame = GAME;
        onCleanup(function () { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__gwGame = null; });
    };

    /* =================================================================
       PART 3 — GameScene factory. Returns a Phaser.Scene subclass.
       update order (Bible architecture): Input→State→Movement→Action→
       Animation→Collision→Camera→UI.
       ================================================================= */
    function makeGameScene(P, buildTextures, BW, BH) {
        var C = CONFIG;
        var GROUND_Y = C.GROUND_Y;

        function GameScene() { P.Scene.call(this, { key: 'Game' }); }
        GameScene.prototype = Object.create(P.Scene.prototype);
        GameScene.prototype.constructor = GameScene;

        GameScene.prototype.create = function () {
            var self = this;
            buildTextures(this);
            this.buildAnims();

            this.diff = C.diff[STORE.diff];
            this.score = runState.score || 0;
            this.lives = runState.lives || this.diff.lives;
            this.cheatOn = cheat.on;
            this.trauma = 0;
            this.freezeUntil = 0;
            this.sectorIdx = runState.sector || 0;

            // groups / pools (Bible APPENDIX T.4)
            this.platforms = this.physics.add.staticGroup();
            this.bullets = this.physics.add.group({ maxSize: 60, allowGravity: false });
            this.ebullets = this.physics.add.group({ maxSize: 60, allowGravity: false });
            this.enemies = this.physics.add.group();
            this.pows = this.physics.add.group({ allowGravity: false });
            this.crates = this.physics.add.group();
            this.pickups = this.physics.add.group({ allowGravity: false });
            this.hazards = this.physics.add.staticGroup();

            // particle emitters (API 3.60+)
            this.pSpark = this.add.particles(0, 0, 't_spark', { speed: { min: -180, max: 180 }, scale: { start: 0.8, end: 0 }, lifespan: 480, blendMode: 'ADD', emitting: false });
            this.pHeart = this.add.particles(0, 0, 't_heart', { speed: { min: -120, max: 120 }, scale: { start: 1, end: 0 }, lifespan: 700, gravityY: -40, emitting: false });

            // player
            this.player = new Player(this, 120, GROUND_Y - 60);
            this.add.existing(this.player); this.physics.add.existing(this.player);
            this.player.init();
            this.player.setCheat(this.cheatOn);

            // colliders
            this.physics.add.collider(this.player, this.platforms);
            this.physics.add.collider(this.enemies, this.platforms);
            this.physics.add.collider(this.crates, this.platforms);
            this.physics.add.collider(this.pickups, this.platforms);
            // Bullet vs enemy is registered BEFORE bullet vs platform so the enemy hit is
            // resolved first within a step. The platform collider also uses a processCallback
            // that REFUSES to kill a bullet while it is overlapping a live enemy — otherwise a
            // bullet aimed at an enemy standing ON a platform gets eaten by the platform corner
            // first and looks like it "passed through" the enemy ("peluru nembus musuh di atas balok").
            this.physics.add.overlap(this.bullets, this.enemies, function (b, e) { self.hitEnemy(b, e); });
            this.physics.add.collider(this.bullets, this.platforms,
                function (b) { self.killBullet(b); },
                function (b) { return !self.bulletOverEnemy(b); });
            this.physics.add.overlap(this.bullets, this.crates, function (b, c) { self.killBullet(b); self.breakCrate(c); });
            this.physics.add.overlap(this.bullets, this.pows, function (b, p) { self.killBullet(b); self.rescuePOW(p); });
            this.physics.add.overlap(this.player, this.pows, function (pl, p) { self.rescuePOW(p); });
            this.physics.add.overlap(this.player, this.pickups, function (pl, k) { self.takePickup(k); });
            this.physics.add.overlap(this.player, this.enemies, function (pl, e) { if (e.getData('type') !== 'barrel') self.playerHit(); });
            this.physics.add.overlap(this.player, this.ebullets, function (pl, b) { self.killEBullet(b); self.playerHit(); });

            // backdrop is (re)built per sector in buildSector (depends on worldW + biome)

            // camera
            this.cameras.main.setBackgroundColor('#16201a');
            // Push the player well into the LEFT of the screen so most of the view is the
            // forward direction (where enemies come from). Small deadzone keeps it snappy.
            this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
            this.cameras.main.setDeadzone(20, 120);
            this.cameras.main.setFollowOffset(-Math.round(BW * 0.40), -70);

            // shutdown cleanup (Bible APPENDIX T.9)
            this.events.once(P.Scenes.Events.SHUTDOWN, function () {
                self.time.removeAllEvents(); self.tweens.killAll();
                try { self.input.keyboard.removeAllKeys(true); } catch (e) {}
            });

            // boss state
            this.boss = null;

            // start with briefing
            this.showBriefing(this.sectorIdx);
            this.updateHUD();
        };

        /* frame-by-frame anims from procedural frame textures (guard re-create) */
        GameScene.prototype.buildAnims = function () {
            var mk = function (key, frames, rate, repeat) {
                if (this.anims.exists(key)) return;
                this.anims.create({ key: key, frames: frames.map(function (f) { return { key: f }; }), frameRate: rate, repeat: repeat == null ? -1 : repeat });
            }.bind(this);
            mk('p_idle', ['t_player_idle0', 't_player_idle1'], 3);
            mk('p_run', ['t_player_run0', 't_player_run1', 't_player_run2', 't_player_run3'], 12);
            mk('p_jump', ['t_player_jump'], 1, 0);
            mk('p_fall', ['t_player_fall'], 1, 0);
            mk('p_prone', ['t_player_prone'], 1, 0);
            mk('p_hurt', ['t_player_hurt'], 1, 0);
        };

        /* sector palettes (sky top, sky bottom, sun color/alpha) */
        GameScene.prototype.skyFor = function (idx) {
            var P_ = [
                { top: 0x2a5a8a, bot: 0x9ad0e0, sun: 0xfff4c0, sunA: 0.8 },   // 0 pagi jungle
                { top: 0x8a4a3a, bot: 0xe0a060, sun: 0xffd070, sunA: 0.7 },   // 1 senja kota
                { top: 0x2a6a8a, bot: 0x7ac0d0, sun: 0xffffff, sunA: 0.5 },   // 2 sungai
                { top: 0xd09040, bot: 0xf0d090, sun: 0xfff4c0, sunA: 0.9 },   // 3 gurun
                { top: 0x2a2a3a, bot: 0x4a4a5a, sun: 0xaaaadd, sunA: 0.4 },   // 4 pangkalan
                { top: 0x6a2a3a, bot: 0xd0a070, sun: 0xffd447, sunA: 0.8 }    // 5 pelaminan
            ];
            return P_[idx] || P_[0];
        };
        /* ---------- backdrop: per-sector sky + 3 parallax layers + props ---------- */
        GameScene.prototype.buildBackdrop = function (idx) {
            idx = idx || 0;
            if (!this.bgGroup) this.bgGroup = this.add.group();
            this.bgGroup.clear(true, true);
            var pal = this.skyFor(idx), self = this;
            function reg(obj) { self.bgGroup.add(obj); return obj; }

            // sky (fixed to camera)
            var sky = reg(this.add.graphics().setScrollFactor(0).setDepth(-60));
            sky.fillGradientStyle(pal.top, pal.top, pal.bot, pal.bot, 1);
            sky.fillRect(0, 0, BW, BH);
            // sun/moon
            reg(this.add.circle(BW * 0.74, BH * 0.18, 38, pal.sun, pal.sunA).setScrollFactor(0).setDepth(-59));
            // clouds (slow)
            for (var c = 0; c < 5; c++) {
                reg(this.add.image(80 + c * 280, 70 + (c % 2) * 50, 't_cloud').setScrollFactor(0.1).setDepth(-58).setAlpha(0.85).setScale(0.7 + (c % 3) * 0.2));
            }
            // far mountains (slow parallax) — tiled across the world
            var worldW = this.worldW || 4200;
            for (var m = 0; m * 240 < worldW + 480; m++) {
                reg(this.add.image(m * 240, GROUND_Y + 20, 't_mountain').setOrigin(0.5, 1).setScrollFactor(0.25).setDepth(-50).setAlpha(0.7));
            }
            // near hills (medium parallax)
            for (var h = 0; h * 220 < worldW + 440; h++) {
                reg(this.add.image(h * 220 + 60, GROUND_Y + 40, 't_hill').setOrigin(0.5, 1).setScrollFactor(0.45).setDepth(-40));
            }
            // mid-ground vegetation/props depending on biome (faster parallax, behind gameplay)
            var propTex = idx === 3 ? ['t_palm', 't_barrel'] : idx === 4 || idx === 5 ? ['t_barrel', 't_sandbag', 't_flag'] : ['t_palm', 't_bush', 't_flag'];
            for (var p = 0; p * 300 < worldW; p++) {
                var t = propTex[p % propTex.length];
                reg(this.add.image(160 + p * 300 + (p % 2) * 90, GROUND_Y + 2, t).setOrigin(0.5, 1).setScrollFactor(0.7).setDepth(-20).setAlpha(0.95));
            }
        };

        /* ---------- per-sector load ---------- */
        GameScene.prototype.showBriefing = function (idx) {
            var self = this;
            // defer pause to next tick — pausing inside create() is unreliable
            this.time.delayedCall(0, function () { self.scene.pause(); });
            $('msw-briefing-title').textContent = 'SEKTOR ' + (idx + 1) + ' — ' + (SECTOR_NAMES[idx] || '');
            var pieces = infosForSector(idx).filter(function (i) { return !unlocked[i.key]; });
            var txt = pieces.length
                ? 'Selamatkan ' + pieces.length + ' POW kurir untuk membuka: ' + pieces.map(function (p) { return p.title; }).join(', ') + '.'
                : 'Bersihkan sektor & maju menuju Markas Pelaminan.';
            if (idx === C.sectors - 1) txt = 'Markas terakhir! Taklukkan Jenderal Pembatal Nikah & selamatkan mempelai.';
            $('msw-briefing-text').textContent = txt;
            showOverlay('msw-briefing');
        };

        GameScene.prototype.loadSector = function (idx) {
            this.sectorIdx = idx; runState.sector = idx;
            this.buildSector(idx);
            hideOverlays();
            if (this.scene.isPaused()) this.scene.resume();
        };

        /* ---------- build a sector: spine + patterns + entities (Bible APPENDIX F) ---------- */
        GameScene.prototype.buildSector = function (idx) {
            var self = this;
            // clear previous
            this.platforms.clear(true, true); this.enemies.clear(true, true);
            this.pows.clear(true, true); this.crates.clear(true, true);
            this.hazards.clear(true, true); this.pickups.clear(true, true);
            this.bullets.clear(true, true); this.ebullets.clear(true, true);
            if (this.boss) { try { this.boss.destroy(); } catch (e) {} this.boss = null; }

            this.arenaX = null; this.bossActive = false; this.bossDead = false;
            var isBoss = (idx === C.sectors - 1);
            var len = isBoss ? 3000 : (4200 + idx * 600);   // px (boss sector now has walk-in)
            this.worldW = len;
            this.physics.world.setBounds(0, 0, len, BH);
            this.cameras.main.setBounds(0, 0, len, BH);

            // backdrop (sky + parallax + biome props) — depends on worldW + sector
            this.buildBackdrop(idx);

            // ground (static tiled, 64px texture)
            for (var x = 0; x < len + 64; x += 64) {
                var gnd = this.platforms.create(x + 32, GROUND_Y + 32, 't_ground');
                gnd.refreshBody();
            }
            this.groundTop = GROUND_Y;

            // foreground decor on the ground (non-collidable eye-candy)
            if (!this.decor) this.decor = this.add.group();
            this.decor.clear(true, true);
            var fgTex = idx === 3 ? ['t_barrel', 't_palm'] : idx >= 4 ? ['t_sandbag', 't_barrel'] : ['t_bush', 't_sandbag'];
            for (var d = 1; d * 520 < len - 300; d++) {
                if (Math.random() < 0.7) {
                    var t = fgTex[d % fgTex.length];
                    this.decor.add(this.add.image(300 + d * 520, GROUND_Y + 4, t).setOrigin(0.5, 1).setDepth(-2));
                }
            }

            // reset player
            this.player.setPosition(120, GROUND_Y - 60);
            this.player.body.setVelocity(0, 0);
            this.player.respawnX = 120;
            this.cameras.main.scrollX = 0;

            if (isBoss) { this.buildBossArena(len); this.updateHUD(); return; }

            // POW pieces for this sector (deterministic slice), only those not yet unlocked
            var pieces = infosForSector(idx).filter(function (i) { return !unlocked[i.key]; });

            // spine encounters: spread across the level after a 600px safe zone
            var density = this.diff.density;
            var slots = Math.floor((len - 1100) / 360);
            var powEvery = pieces.length ? Math.max(2, Math.floor(slots / pieces.length)) : 999;
            var pi = 0, enemyTypes = this.sectorEnemyPool(idx);

            // closer encounter spacing (denser action) — slot every 300px
            for (var s = 0; s < slots; s++) {
                var sx = 640 + s * 300 + (Math.sin(s * 1.3) * 40);
                // POW placement (gradual)
                if (pi < pieces.length && s % powEvery === 1) {
                    this.spawnPOW(sx, pieces[pi].key); pi++;
                    continue; // POW slot stays light (safe-ish)
                }

                // ELEVATION: jump-pad platforms at varied heights (every ~3 slots)
                if (s % 3 === 2) {
                    var ph = [150, 240, 110][s % 3];        // varied heights
                    var py = GROUND_Y - ph;
                    var pl = this.platforms.create(sx, py, 't_plat'); pl.refreshBody();
                    // turret or ranged perched on the ledge (cover-fire from above)
                    if (idx >= 1 && Math.random() < 0.5) this.spawnEnemy('turret', sx, py - 22);
                    else if (Math.random() < 0.5) this.spawnEnemy('range', sx, py - 28);
                    // a second lower platform sometimes → stepping path
                    if (Math.random() < 0.4) { var pl2 = this.platforms.create(sx + 120, GROUND_Y - 90, 't_plat'); pl2.refreshBody(); }
                }

                // EXPLOSIVE BARRELS as destructible cover (every ~5 slots)
                if (s % 5 === 3) this.spawnBarrel(sx + 40);

                // enemies (≤2 types/wave, ≥1 ranged sweet-spot) — denser via density
                var roll = Math.random();
                if (roll < 0.45 * density) this.spawnEnemy('rush', sx, GROUND_Y - 30);
                else if (roll < 0.78 * density) this.spawnEnemy('range', sx, GROUND_Y - 30);
                else if (roll < 0.9 * density && idx >= 1) this.spawnEnemy('drone', sx, GROUND_Y - 220);
                else if (roll < 1.0 * density && idx >= 3) this.spawnEnemy('tank', sx, GROUND_Y - 30);
                // occasional second rusher → small wave
                if (Math.random() < 0.25 * density) this.spawnEnemy('rush', sx + 80, GROUND_Y - 30);

                // hazards: flame jets (sector 2+) and pits (sector 1+)
                if (idx >= 2 && s % 5 === 4) this.spawnFlame(sx);
                if (idx >= 1 && s % 7 === 6) this.spawnPit(sx, 90);

                // weapon crate occasionally (Relevance Rule: enemies follow in later slots)
                if (s > 0 && s < slots - 2 && s % 4 === 3) this.spawnCrate(sx, GROUND_Y - 30, this.rollWeapon(idx));
            }

            // any remaining pieces (rounding) → place near the end on the main path
            for (; pi < pieces.length; pi++) this.spawnPOW(len - 700 - pi * 200, pieces[pi].key);

            // sector exit flag (reach right edge → clear)
            this.exitX = len - 160;
            this.sectorCleared = false;
            this.updateHUD();
        };

        GameScene.prototype.sectorEnemyPool = function (idx) {
            if (idx <= 1) return ['rush', 'range'];
            if (idx <= 3) return ['rush', 'range', 'drone', 'tank'];
            return ['rush', 'range', 'drone', 'tank'];
        };
        GameScene.prototype.rollWeapon = function (idx) {
            var pool = idx < 2 ? ['H', 'S'] : ['H', 'S', 'F', 'R'];
            return pool[Math.floor(Math.random() * pool.length)];
        };

        /* ================= SPAWNERS ================= */
        GameScene.prototype.spawnPOW = function (x, key) {
            var pow = this.pows.create(x, GROUND_Y - 19, 't_pow');
            pow.body.setAllowGravity(false);
            pow.setData('key', key); pow.setData('rescued', false);
            pow.body.setSize(22, 38);
            // gentle bob
            this.tweens.add({ targets: pow, y: pow.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            // floating amplop marker above
            var mark = this.add.image(x, GROUND_Y - 56, 't_amplop');
            pow.setData('mark', mark);
            this.tweens.add({ targets: mark, y: mark.y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            return pow;
        };

        GameScene.prototype.spawnEnemy = function (type, x, y) {
            var e;
            if (type === 'rush') e = this.enemies.create(x, y, 't_e_rush');
            else if (type === 'range') e = this.enemies.create(x, y, 't_e_range');
            else if (type === 'drone') { e = this.enemies.create(x, y, 't_drone'); e.body.setAllowGravity(false); }
            else if (type === 'tank') e = this.enemies.create(x, y, 't_tank');
            else if (type === 'turret') { e = this.enemies.create(x, y, 't_turret'); e.body.setAllowGravity(false); e.body.setImmovable(true); }
            else e = this.enemies.create(x, y, 't_e_rush');
            e.setData('type', type);
            e.setData('hp', type === 'tank' ? 8 : (type === 'turret' ? 3 : (type === 'drone' ? 2 : 1)));
            e.setData('aimT', type === 'turret' ? 400 : 0); e.setData('baseY', y); e.setData('seed', Math.random() * 6.28);
            e.body.setCollideWorldBounds(false);
            if (type === 'tank') e.body.setSize(56, 36);
            return e;
        };
        // explosive barrel: destructible, AoE on death (level juice + cover)
        GameScene.prototype.spawnBarrel = function (x) {
            var e = this.enemies.create(x, GROUND_Y - 18, 't_barrel');
            e.setData('type', 'barrel'); e.setData('hp', 2); e.setData('explosive', true);
            e.setData('aimT', 0); e.setData('seed', 0);
            e.body.setImmovable(true); e.body.setAllowGravity(false);
            return e;
        };

        // spikes hazard (ground-level danger you must jump over — "pit" without breaking floor)
        GameScene.prototype.spawnPit = function (x, w) {
            var self = this;
            var spike = this.hazards.create(x, GROUND_Y - 8, 't_spike');
            spike.setData('on', true); spike.refreshBody();
            this.physics.add.overlap(this.player, spike, function () { self.playerHit(); });
            return spike;
        };
        GameScene.prototype.spawnFlame = function (x) {
            var f = this.hazards.create(x, GROUND_Y - 14, 't_flame');
            f.setData('on', true); f.setScale(1.4); f.refreshBody();
            // periodic flame: physics overlap only when "on"
            var self = this;
            f.setData('timer', this.time.addEvent({
                delay: 1300, loop: true, callback: function () {
                    var on = !f.getData('on'); f.setData('on', on);
                    f.setAlpha(on ? 1 : 0.15);
                    f.body.enable = on;
                }
            }));
            this.physics.add.overlap(this.player, f, function () { if (f.getData('on')) self.playerHit(); });
            return f;
        };

        GameScene.prototype.spawnCrate = function (x, y, weapon) {
            var c = this.crates.create(x, y - 4, 't_crate');
            c.setData('weapon', weapon); c.body.setCollideWorldBounds(false);
            return c;
        };
        GameScene.prototype.breakCrate = function (c) {
            var w = c.getData('weapon');
            var x = c.x, y = c.y; c.destroy();
            this.burst(x, y, 0xffd447, 8);
            var p = this.pickups.create(x, y, 't_amplop'); // reuse small sprite; tint by weapon
            p.setData('weapon', w); p.body.setAllowGravity(true);
            p.setTint(w === 'H' ? 0xffd447 : w === 'S' ? 0xff8a3d : w === 'F' ? 0xff5a4d : 0x9bd6ff);
            // letter label
            var lbl = this.add.text(x, y, w, { fontFamily: 'monospace', fontSize: '14px', color: '#11160f', fontStyle: 'bold' }).setOrigin(0.5);
            p.setData('lbl', lbl);
        };
        GameScene.prototype.takePickup = function (k) {
            var w = k.getData('weapon');
            var lbl = k.getData('lbl'); if (lbl) lbl.destroy();
            k.destroy();
            this.player.setWeapon(w);
            SFX.pickup();
            toast('Senjata: <b>' + C.weapons[w].name + '</b>');
            this.updateHUD();
        };

        /* ================= BOSS (Bible APPENDIX D) ================= */
        GameScene.prototype.buildBossArena = function (len) {
            var self = this;
            // The boss sector has a WALK-IN approach: player spawns far left (x=120, set in
            // buildSector), walks right through a short corridor, then crosses arenaX which
            // LOCKS the camera and activates the boss. (Bug fix: previously the camera was
            // locked to the far-right immediately, so the player was off-screen & the boss
            // appeared instantly with no player visible.)
            this.bossActive = false;
            this.bossDead = false;
            this.arenaX = len - Math.round(BW * 0.9);   // where the fight begins
            this.exitX = 99999;                          // no walk-exit; win by boss defeat

            // approach corridor: a couple of guards so it isn't empty
            this.spawnEnemy('range', this.arenaX - 700, GROUND_Y - 30);
            this.spawnEnemy('rush', this.arenaX - 400, GROUND_Y - 30);
            this.spawnEnemy('rush', this.arenaX - 250, GROUND_Y - 30);

            // arena platforms (placed within the locked view)
            var p1 = this.platforms.create(len - BW * 0.62, GROUND_Y - 160, 't_plat'); p1.refreshBody();
            var p2 = this.platforms.create(len - BW * 0.30, GROUND_Y - 250, 't_plat'); p2.refreshBody();

            // wedding altar arch + caged couple in the background (visible goal)
            this.add.image(len - 90, GROUND_Y + 2, 't_arch').setOrigin(0.5, 1).setScrollFactor(1).setDepth(-8).setScale(1.3);
            this.caged = this.add.image(len - 90, GROUND_Y - 36, 't_couple_caged').setOrigin(0.5, 1).setScrollFactor(1).setDepth(-6);
            this.cage = this.add.image(len - 90, GROUND_Y - 30, 't_cage').setOrigin(0.5, 1).setScrollFactor(1).setAlpha(0.9).setDepth(-5);

            // boss created up-front but kept INACTIVE via the bossActive flag (NOT setActive(false)
            // — that disables the arcade body so bullets stop overlapping; the old "boss never
            // dies" bug). We keep the body enabled and just hide it with alpha until activation.
            var b = this.physics.add.sprite(len - 240, GROUND_Y - 90, 't_boss');
            b.body.setAllowGravity(false); b.body.setImmovable(true);
            b.setData('hp', 36); b.setData('maxhp', 36); b.setData('phase', 1);  // TTK ~9s pistol
            b.setData('atkT', 2200); b.setData('homeY', GROUND_Y - 90);
            b.setAlpha(0);                       // hidden until activation
            this.boss = b;
            // NOTE: bullet hits handled MANUALLY in updateBoss (manualBossHits) — physics overlap
            // on a bobbing, sized, immovable body proved unreliable ("boss can't be shot" bug).
            this.physics.add.overlap(this.player, b, function () { if (self.bossActive && !self.player.cheat) self.playerHit(); });

            // SMALL HP bar that floats ABOVE the boss (world-space, follows boss) — not a big banner
            this.bossHpW = 90;
            this.bossHpBg = this.add.rectangle(b.x, b.y - 80, this.bossHpW + 4, 9, 0x000000, 0.7).setDepth(40).setVisible(false).setStrokeStyle(1, 0xb7a36a);
            this.bossHpFill = this.add.rectangle(b.x - this.bossHpW / 2, b.y - 80, this.bossHpW, 5, 0xe23b2e).setOrigin(0, 0.5).setDepth(41).setVisible(false);

            toast('Tembus pertahanan menuju Markas Pelaminan →');
        };
        GameScene.prototype.updateBossHp = function () {
            if (!this.bossHpFill || !this.boss || !this.boss.active) return;
            var hp = Math.max(0, this.boss.getData('hp')), max = this.boss.getData('maxhp');
            var bx = this.boss.x, by = this.boss.y - 80;
            this.bossHpBg.setPosition(bx, by);
            this.bossHpFill.setPosition(bx - this.bossHpW / 2, by);
            this.bossHpFill.width = this.bossHpW * (hp / max);
        };
        // manual bullet→enemy hit test (robust; safety-net beside the physics overlap). Uses a
        // swept check (prev→current bullet x) so fast bullets can't tunnel through a thin enemy,
        // and AABB so enemies on platforms are always hit. Mirrors the boss manual-hit pattern.
        GameScene.prototype.manualEnemyHits = function () {
            var self = this, enemies = this.enemies.getChildren();
            this.bullets.getChildren().forEach(function (bl) {
                if (!bl.active || !bl.body) return;
                var bx = bl.x, by = bl.y, vx = bl.body.velocity.x;
                // sweep span along travel axis (covers the gap crossed since last frame)
                var x0 = vx < 0 ? bx : bx - Math.abs(vx) * 0.016;
                var x1 = vx < 0 ? bx + Math.abs(vx) * 0.016 : bx;
                for (var i = 0; i < enemies.length; i++) {
                    var e = enemies[i];
                    if (!e.active || !e.body) continue;
                    var eb = e.body;
                    var hitX = x1 > eb.left - 6 && x0 < eb.right + 6;
                    var hitY = by > eb.top - 6 && by < eb.bottom + 6;
                    if (hitX && hitY) { self.hitEnemy(bl, e); break; }
                }
            });
        };
        // manual bullet→boss hit test (robust; runs each frame while boss active)
        GameScene.prototype.manualBossHits = function () {
            var b = this.boss; if (!b || !b.active || !this.bossActive) return;
            var hw = 58, hh = 66, self = this;   // boss hit box (generous)
            this.bullets.getChildren().forEach(function (bl) {
                if (!bl.active) return;
                if (Math.abs(bl.x - b.x) < hw && Math.abs(bl.y - b.y) < hh) {
                    var nade = bl.getData('nade');
                    self.killBullet(bl);             // (grenade explodes via killBullet)
                    if (!nade) self.hitBoss(b);      // grenade already damages via AoE check
                }
            });
        };
        GameScene.prototype.activateBoss = function () {
            if (this.bossActive || !this.boss) return;
            var self = this, b = this.boss, len = this.worldW;
            this.bossActive = true;
            this.tweens.add({ targets: b, alpha: 1, duration: 400 });
            if (this.bossHpBg) this.bossHpBg.setVisible(true);
            if (this.bossHpFill) this.bossHpFill.setVisible(true);
            this.updateBossHp();
            // lock the camera to the arena (right side of the world)
            this.cameras.main.setBounds(len - BW, 0, BW, BH);
            // wall on the left of the arena so the player can't retreat out of view
            var wall = this.platforms.create(len - BW + 8, GROUND_Y - 200, 't_plat');
            wall.setScale(0.2, 24).refreshBody(); wall.setVisible(false);
            // player respawn point inside arena (so death respawns in-fight, not pit)
            this.player.respawnX = len - BW + 80;
            this.flash(0xffffff, 120); this.addTrauma(0.3);
            SFX.boss();
            toast('⚠ BOSS: Jenderal Pembatal Nikah — selamatkan mempelai!');
        };
        GameScene.prototype.hitBoss = function (boss) {
            if (this.bossDead) return;
            var hp = boss.getData('hp') - this.player.weaponDmg();
            boss.setData('hp', hp);
            // light feedback only — DON'T stack freeze (made the fight feel stalled/immortal)
            this.flash(0xffffff, 40); this.addTrauma(0.12);
            this.burst(boss.x, boss.y, 0xff8a3d, 6);
            boss.setTintFill(0xffffff); var bb = boss;
            this.time.delayedCall(50, function () { if (bb.active) bb.clearTint(); });
            this.updateBossHp();
            // phase transitions
            var max = boss.getData('maxhp'), ph = boss.getData('phase');
            if (ph === 1 && hp <= max * 0.66) { boss.setData('phase', 2); this.bossPhaseBeat(boss); }
            else if (ph === 2 && hp <= max * 0.33) { boss.setData('phase', 3); this.bossPhaseBeat(boss); }
            if (hp <= 0) { this.defeatBoss(boss); }
            this.updateHUD();
        };
        GameScene.prototype.bossPhaseBeat = function (boss) {
            this.flash(0xffffff, 120); this.addTrauma(0.3); this.freeze(100);
            SFX.boss();
            toast('Boss naik fase!');
            boss.setTint(0xff8888); var self = this;
            this.time.delayedCall(200, function () { boss.clearTint(); });
        };
        GameScene.prototype.defeatBoss = function (boss) {
            var self = this;
            this.bossDead = true; this.bossActive = false;
            if (this.bossHpBg) this.bossHpBg.setVisible(false);
            if (this.bossHpFill) this.bossHpFill.setVisible(false);
            this.burst(boss.x, boss.y, 0xffd447, 24); this.addTrauma(0.5); this.flash(0xffffff, 150); this.freeze(120);
            try { boss.destroy(); } catch (e) {}
            if (this.cage) this.tweens.add({ targets: this.cage, alpha: 0, scaleY: 0, duration: 600 });
            SFX.win();
            bossFinale();
        };

        /* ================= COMBAT / COLLISION ================= */
        GameScene.prototype.killBullet = function (b) {
            if (!b || !b.active) return;
            if (b.getData('nade')) { this.explodeGrenade(b.x, b.y); }
            this.bullets.killAndHide(b); if (b.body) b.body.enable = false;
        };
        GameScene.prototype.explodeGrenade = function (x, y) {
            this.burst(x, y, 0xff8a3d, 14); this.addTrauma(0.25); this.flash(0xffaa44, 80); SFX.grenade();
            var self = this, R = 70;
            this.enemies.getChildren().forEach(function (e) {
                if (e.active && Math.hypot(e.x - x, e.y - y) < R) {
                    e.setData('hp', e.getData('hp') - 5);
                    if (e.getData('hp') <= 0) { self.score += 100; var m = e.getData('mark'); if (m) m.destroy(); e.destroy(); }
                }
            });
            this.pows.getChildren().forEach(function (p) { if (p.active && Math.hypot(p.x - x, p.y - y) < R) self.rescuePOW(p); });
            if (this.boss && this.boss.active && Math.hypot(this.boss.x - x, this.boss.y - y) < R + 40) this.hitBoss(this.boss);
            this.updateHUD();
        };
        GameScene.prototype.killEBullet = function (b) { if (b && b.active) this.ebullets.killAndHide(b), b.body && (b.body.enable = false); };
        // True when bullet b's body currently overlaps any LIVE enemy body. Used as the
        // process-callback for the bullet↔platform collider so an enemy standing on a platform
        // is always hit instead of the bullet dying on the platform edge.
        GameScene.prototype.bulletOverEnemy = function (b) {
            if (!b || !b.body) return false;
            var bb = b.body, list = this.enemies.getChildren();
            for (var i = 0; i < list.length; i++) {
                var e = list[i];
                if (!e.active || !e.body) continue;
                var eb = e.body;
                if (bb.right > eb.left && bb.left < eb.right && bb.bottom > eb.top && bb.top < eb.bottom) return true;
            }
            return false;
        };
        GameScene.prototype.hitEnemy = function (b, e) {
            if (!b || !b.active || !e || !e.active) return;   // already consumed this step
            this.killBullet(b);
            var hp = e.getData('hp') - this.player.weaponDmg();
            e.setData('hp', hp);
            this.burst(e.x, e.y, 0xff8a3d, 5); this.freeze(2 * 16);
            if (hp <= 0) {
                var ty = e.getData('type');
                this.score += (ty === 'tank' ? 500 : ty === 'turret' ? 200 : ty === 'barrel' ? 50 : 100);
                this.burst(e.x, e.y, 0xffd447, 8); this.addTrauma(0.1);
                var m = e.getData('mark'); if (m) m.destroy();
                var ex = e.x, ey = e.y, expl = e.getData('explosive');
                e.destroy(); SFX.hit(); this.updateHUD();
                if (expl) this.explodeGrenade(ex, ey);   // barrel chain-explosion (cover + AoE)
            } else { e.setTintFill(0xffffff); var ee = e; this.time.delayedCall(60, function () { if (ee.active) ee.clearTint(); }); }
        };
        GameScene.prototype.rescuePOW = function (p) {
            if (!p || !p.active || p.getData('rescued')) return;
            p.setData('rescued', true);
            var key = p.getData('key');
            var mark = p.getData('mark');
            // amplop tween to HUD inventory (Bible APPENDIX X.4)
            if (mark) {
                this.tweens.add({ targets: mark, y: mark.y - 40, alpha: 0, scale: 1.4, duration: 500, onComplete: function () { mark.destroy(); } });
            }
            this.pHeart.explode(12, p.x, p.y - 20);
            this.flash(0x4fd6c8, 80); this.freeze(3 * 16);
            SFX.rescue();
            // happy POW runs off
            p.setData('hp', 0);
            this.tweens.add({ targets: p, x: p.x + 50, alpha: 0, duration: 600, onComplete: function () { p.destroy(); } });
            unlockInfo(key);          // lights indicator + toast + maybe celebration #1
            this.updateHUD();
        };
        // NO LIVES, NO GAME-OVER (this is an invitation, not a hardcore shooter). Getting hit
        // = brief knockback + invulnerability window; the player is never sent back to the
        // start or to a game-over screen. Only a pit-fall relocates the player — to a SAFE
        // backtrack spot (never a pit / enemy cluster).
        GameScene.prototype.playerHit = function () {
            if (this.player.cheat || this.player.invuln > 0 || this.player.dead) return;
            this.flash(0xff3b30, 80); this.addTrauma(0.3); this.freeze(3 * 16);
            SFX.hit();
            // knockback away from facing, small hop
            var kb = -this.player.facing * 160;
            this.player.body.setVelocity(kb, -220);
            this.player.invuln = C.player.invulnMs; this.player._hurtAnimT = 350; this.player.blink();
        };
        // pit fall → relocate to a safe backtrack point (a few meters back)
        GameScene.prototype.pitRespawn = function () {
            if (this.player.cheat) { /* cheat can't fall to death either */ }
            this.flash(0xff3b30, 80); this.addTrauma(0.3); SFX.hit();
            var safe = this.findSafeRespawn(this.player.x);
            this.player.setPosition(safe, GROUND_Y - 70);
            this.player.body.setVelocity(0, 0);
            this.player.invuln = C.player.invulnMs; this.player.blink();
            this.freezeNearbyEnemies(safe);
        };
        // scan backward ~200px from death x for a spot that (a) has ground, (b) isn't on a
        // hazard, (c) has no enemy within 220px. Falls back to the last checkpoint-ish x.
        GameScene.prototype.findSafeRespawn = function (fromX) {
            var self = this, back = Math.max(80, fromX - 200);
            for (var x = back; x > 60; x -= 40) {
                if (this.nearHazard(x, 60)) continue;
                if (this.nearEnemy(x, 220)) continue;
                return x;
            }
            return Math.max(80, this.player.respawnX || 120);
        };
        GameScene.prototype.nearEnemy = function (x, r) {
            return this.enemies.getChildren().some(function (e) { return e.active && e.getData('type') !== 'barrel' && Math.abs(e.x - x) < r; });
        };
        GameScene.prototype.nearHazard = function (x, r) {
            return this.hazards.getChildren().some(function (h) { return h.active && Math.abs(h.x - x) < r; });
        };
        GameScene.prototype.freezeNearbyEnemies = function (px) {
            px = (px == null) ? this.player.x : px;
            var self = this;
            this.enemies.getChildren().forEach(function (e) {
                if (Math.abs(e.x - px) < 300) { e.setData('frozenUntil', self.time.now + 1000); }
            });
        };

        /* ================= JUICE (Bible §10) ================= */
        GameScene.prototype.burst = function (x, y, color, n) { this.pSpark.explode(n || 8, x, y); };
        GameScene.prototype.flash = function (color, dur) { var c = P.Display.Color.IntegerToColor(color); this.cameras.main.flash(dur || 80, c.red, c.green, c.blue); };
        GameScene.prototype.addTrauma = function (t) { this.trauma = clamp(this.trauma + t, 0, 1); };
        GameScene.prototype.freeze = function (ms) { this.freezeUntil = Math.max(this.freezeUntil, this.time.now + Math.min(ms, 500)); };
        GameScene.prototype.celebrate = function (kind) {
            // ~4.5s celebratory beat before the dialog (called by announceAllCollected/bossFinale)
            var self = this, n = 0;
            this.flash(0xffffff, 150); this.addTrauma(0.5);
            var ev = this.time.addEvent({
                delay: 350, repeat: 11, callback: function () {
                    var x = Phaser_rand(self, 60, BW - 60) + self.cameras.main.scrollX;
                    var y = Phaser_rand(self, 80, GROUND_Y - 60);
                    self.pHeart.explode(10, x, y); self.burst(x, y, 0xffd447, 8);
                    if (n++ % 2 === 0) SFX.pickup();
                }
            });
        };

        /* ================= UPDATE LOOP ================= */
        GameScene.prototype.update = function (time, delta) {
            // freeze-frame
            if (time < this.freezeUntil) { return; }

            pollEdges();

            // player
            if (this.player && this.player.active) this.player.step(time, delta);

            // enemies AI
            this.updateEnemies(time, delta);

            // boss: activate when the player walks into the arena, then run boss AI
            if (this.boss && !this.bossActive && !this.bossDead && this.arenaX != null && this.player.x >= this.arenaX) {
                this.activateBoss();
            }
            if (this.boss && this.bossActive && this.boss.active) {
                this.updateBoss(time, delta);
                this.manualBossHits();
                this.updateBossHp();
            }

            // manual bullet→enemy sweep: safety-net for fast bullets that tunnel past a thin
            // enemy in one step, and for enemies standing on platforms where the physics overlap
            // can lose to the platform collider. hitEnemy() guards on active flags so running it
            // here in addition to the physics overlap never double-counts.
            this.manualEnemyHits();

            // bullets cull
            this.cullGroup(this.bullets); this.cullGroup(this.ebullets);

            // camera shake from trauma (Bible §10)
            this.trauma = Math.max(0, this.trauma - delta / 600);
            if (this.trauma > 0.01) { this.cameras.main.shake(40, (this.trauma * this.trauma) * 0.04, true); }

            // sector clear (reach exit)
            if (!this.boss && !this.sectorCleared && this.player.x >= this.exitX) {
                this.sectorCleared = true; this.onSectorClear();
            }
        };

        GameScene.prototype.cullGroup = function (grp) {
            var view = this.cameras.main.worldView;
            grp.getChildren().forEach(function (b) {
                if (!b.active) return;
                if (b.x < view.x - 80 || b.x > view.right + 80 || b.y < -40 || b.y > BH + 40) {
                    b.setActive(false).setVisible(false); if (b.body) b.body.enable = false;
                    grp.killAndHide(b);
                }
            });
        };

        GameScene.prototype.updateEnemies = function (time, delta) {
            var self = this, px = this.player.x, py = this.player.y;
            this.enemies.getChildren().forEach(function (e) {
                if (!e.active) return;
                var t = e.getData('type');
                if (e.getData('frozenUntil') && time < e.getData('frozenUntil')) { e.body.setVelocityX(0); return; }
                // only act when near camera
                if (Math.abs(e.x - px) > BW * 0.9) { e.body.setVelocityX(0); return; }
                if (t === 'rush') {
                    e.body.setVelocityX(px < e.x ? -90 : 90);
                    e.setFlipX(px < e.x);
                    // walk-cycle bob
                    e.setScale(1, 1 + Math.sin(time / 80 + e.getData('seed')) * 0.06);
                } else if (t === 'range') {
                    e.body.setVelocityX(0); e.setFlipX(px < e.x);
                    self.enemyAim(e, time, 600);
                } else if (t === 'drone') {
                    var seed = e.getData('seed');
                    e.y = e.getData('baseY') + Math.sin(time / 400 + seed) * 30;
                    e.body.setVelocityX(px < e.x ? -50 : 50);
                    if (Math.random() < 0.004 * self.diff.density) self.dropBomb(e);
                } else if (t === 'tank') {
                    e.body.setVelocityX(px < e.x ? -40 : 40); e.setFlipX(px < e.x);
                    self.enemyAim(e, time, 1000, true);
                } else if (t === 'turret') {
                    e.body.setVelocityX(0); e.setFlipX(px < e.x);
                    self.enemyAim(e, time, 700);
                }
                // barrels are static cover — no AI
            });
        };
        GameScene.prototype.enemyAim = function (e, time, tell, lob) {
            var aimT = e.getData('aimT') - 16;
            if (aimT <= 0) {
                e.setTintFill(0xff5a4d);
                var self = this, ee = e, isLob = lob;
                this.time.delayedCall(tell * (1 + this.diff.tellAdd), function () {
                    if (!ee.active) return; ee.clearTint();
                    self.enemyFire(ee, isLob);
                });
                e.setData('aimT', tell + 1200);
            } else e.setData('aimT', aimT);
        };
        GameScene.prototype.enemyFire = function (e, lob) {
            var b = this.ebullets.get(e.x, e.y - 6, 't_ebullet');
            if (!b) return;
            b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(!!lob);
            var dir = this.player.x < e.x ? -1 : 1;
            var spd = 260 * this.diff.bulletSpd;
            if (lob) { b.body.setVelocity(dir * 160, -300); } else { b.body.setVelocity(dir * spd, 0); }
            SFX.shoot();
        };
        GameScene.prototype.dropBomb = function (e) {
            var b = this.ebullets.get(e.x, e.y + 8, 't_ebullet');
            if (!b) return;
            b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(true);
            b.body.setVelocity(0, 120);
        };

        GameScene.prototype.updateBoss = function (time, delta) {
            var b = this.boss, self = this;
            var ph = b.getData('phase');
            var atk = b.getData('atkT') - delta;
            if (atk <= 0) {
                var tell = (ph === 3 ? 1100 : ph === 2 ? 700 : 800) * (1 + this.diff.tellAdd);
                b.setTint(0xff8888);
                this.time.delayedCall(tell, function () {
                    if (!b.active || !self.bossActive) return; b.clearTint();
                    // AIM AT THE PLAYER: aim vector from boss muzzle to player, with a small
                    // spread fan so it's dodgeable. (Bug fix: previously always fired flat-left.)
                    var count = ph === 1 ? 3 : (ph === 2 ? 5 : 4);
                    var spd = 300 * self.diff.bulletSpd;
                    var mx = b.x - 50, my = b.y - 6;
                    for (var i = 0; i < count; i++) {
                        (function (i) {
                            self.time.delayedCall(i * 100, function () {
                                if (!b.active || !self.player || !self.player.active) return;
                                var bl = self.ebullets.get(mx, my, 't_ebullet');
                                if (!bl) return;
                                bl.setActive(true).setVisible(true); bl.body.enable = true; bl.body.setAllowGravity(false);
                                var ax = self.player.x - mx, ay = self.player.y - my;
                                var len2 = Math.hypot(ax, ay) || 1;
                                var spread = (i - (count - 1) / 2) * 0.12;   // fan in radians
                                var ca = Math.cos(spread), sa = Math.sin(spread);
                                var vx = (ax / len2), vy = (ay / len2);
                                var rx = vx * ca - vy * sa, ry = vx * sa + vy * ca;
                                bl.body.setVelocity(rx * spd, ry * spd);
                            });
                        })(i);
                    }
                    if (ph === 3) { // rocket aimed straight at player
                        var r = self.ebullets.get(mx, my, 't_rocket');
                        if (r) {
                            r.setActive(true).setVisible(true); r.body.enable = true; r.body.setAllowGravity(false);
                            var dx = self.player.x - mx, dy = self.player.y - my, dl = Math.hypot(dx, dy) || 1;
                            r.body.setVelocity(dx / dl * 240, dy / dl * 240);
                        }
                    }
                    SFX.shoot();
                });
                b.setData('atkT', (ph === 3 ? 1600 : 2200));
            } else b.setData('atkT', atk);
            // bob (gentle, around home Y)
            b.y = b.getData('homeY') + Math.sin(time / 500) * 8;
        };

        GameScene.prototype.onSectorClear = function () {
            var self = this;
            this.scene.pause();
            if (this.sectorIdx + 1 >= C.sectors) { return; }
            runState.score = this.score;
            $('msw-clear-text').innerHTML = 'Sektor ' + (this.sectorIdx + 1) + ' aman! Skor: <b>' + pad6(this.score) + '</b>';
            showOverlay('msw-clear');
        };

        /* ================= HUD ================= */
        GameScene.prototype.updateHUD = function () {
            // no lives — show grenade count instead (a useful, non-punishing resource)
            var lv = $('msw-lives'); if (lv && this.player) lv.textContent = '×' + Math.max(0, this.player.grenades);
            var sc = $('msw-score'); if (sc) sc.textContent = pad6(this.score);
            if (this.score > (STORE.best || 0)) { STORE.best = this.score; saveStore(); }
            var ar = $('msw-area'); if (ar) ar.textContent = String(this.sectorIdx + 1);
            var wi = $('msw-weapon-ico'), wn = $('msw-weapon-name'), wa = $('msw-weapon-ammo');
            if (this.player && wi) {
                var w = C.weapons[this.player.weapon];
                wi.textContent = w.ico; wn.textContent = w.name;
                wa.textContent = (this.player.ammo === Infinity ? '' : '×' + this.player.ammo);
            }
        };

        function pad6(n) { n = Math.max(0, Math.floor(n)); var s = String(n); while (s.length < 6) s = '0' + s; return s; }
        function Phaser_rand(scene, a, b) { return a + Math.random() * (b - a); }
        function Phaser_clampNum(v, a, b) { return v < a ? a : (v > b ? b : v); }

        /* ===================================================================
           PLAYER (Bible §4) — extends Arcade.Sprite, state machine + physics
           =================================================================== */
        function Player(scene, x, y) { P.Physics.Arcade.Sprite.call(this, scene, x, y, 't_player'); this.scene = scene; }
        Player.prototype = Object.create(P.Physics.Arcade.Sprite.prototype);
        Player.prototype.constructor = Player;
        Player.prototype.init = function () {
            this.body.setSize(C.player.w, C.player.h);
            this.body.setOffset((this.width - C.player.w) / 2, this.height - C.player.h);  // center & floor-anchor
            this.body.setMaxVelocity(C.player.run, C.player.maxFall);
            this.body.setDragX(C.player.drag);
            this.setCollideWorldBounds(true);
            this.coyote = 0; this.buffer = 0; this.invuln = 0; this.hits = 0; this.dead = false;
            this._prone = false; this._hurtAnimT = 0;
            this.weapon = 'P'; this.ammo = Infinity; this.fireT = 0; this.cheat = false;
            this.facing = 1; this.respawnX = this.x;
            this.grenades = C.grenades;
            if (this.play) this.play('p_idle');
        };
        Player.prototype.setCheat = function (on) { this.cheat = on; this.clearTint(); if (on) this.setTint(0xffe066); else this.clearTint(); };
        Player.prototype.setWeapon = function (w) { this.weapon = w; this.ammo = C.weapons[w].ammo; };
        Player.prototype.weaponDmg = function () { return C.weapons[this.weapon].dmg; };
        Player.prototype.blink = function () {
            var self = this; this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 80, yoyo: true, repeat: 7, onComplete: function () { self.alpha = 1; } });
        };
        Player.prototype.respawn = function (x, y) {
            this.dead = false; this.hits = 0; this.invuln = C.player.invulnMs; this.alpha = 1;
            this.setPosition(x, y); this.body.setVelocity(0, 0); this.weapon = 'P'; this.ammo = Infinity; this.blink();
            this.scene.updateHUD();
        };
        Player.prototype.step = function (time, delta) {
            if (this.dead) return;
            var b = this.body, onGround = b.blocked.down;
            // i-frame countdown
            if (this.invuln > 0) this.invuln -= delta;

            // horizontal
            if (input.left) { b.setAccelerationX(-C.player.accel); this.facing = -1; }
            else if (input.right) { b.setAccelerationX(C.player.accel); this.facing = 1; }
            else b.setAccelerationX(0);

            // coyote + buffer (Bible §4.2 / §12)
            this.coyote = onGround ? C.player.coyoteMs : Math.max(0, this.coyote - delta);
            if (input.jumpEdge) this.buffer = C.player.bufferMs; else this.buffer = Math.max(0, this.buffer - delta);
            if (this.buffer > 0 && this.coyote > 0) {
                b.setVelocityY(C.player.jump); this.coyote = 0; this.buffer = 0; SFX.jump();
            }
            // variable-jump: cut velocity once, on the frame the button is released while rising
            if (this._wasJump && !input.jump && b.velocity.y < 0) b.setVelocityY(b.velocity.y * C.player.jumpCut);
            this._wasJump = input.jump;

            // prone — resize body ONLY on state change (resizing every frame near the floor
            // caused vertical judder when holding "down"). Keep body bottom-anchored via offset.
            var wantProne = input.down && onGround;
            if (wantProne !== this._prone) {
                this._prone = wantProne;
                if (wantProne) {
                    this.body.setSize(C.player.w, C.player.h * 0.6);
                    this.body.setOffset((this.width - C.player.w) / 2, this.height - C.player.h * 0.6);
                } else {
                    this.body.setSize(C.player.w, C.player.h);
                    this.body.setOffset((this.width - C.player.w) / 2, this.height - C.player.h);
                }
            }

            // fire
            this.fireT -= delta;
            if (input.fire && this.fireT <= 0) { this.shoot(); }

            // grenade
            if (input.nadeEdge && this.grenades > 0) { this.throwGrenade(); }

            // per-state POSE (procedural animation via transforms) — Bible/hardwon §12
            this.applyPose(onGround, delta);

            // fell into pit
            if (this.y > BH + 60) { this.scene.pitRespawn(); }
        };
        Player.prototype.applyPose = function (onGround, delta) {
            var b = this.body, vy = b.velocity.y, vx = b.velocity.x;
            var proneNow = this._prone;

            // pick frame-by-frame ANIM by state (real leg movement)
            var anim;
            if (this.invuln > 0 && this._hurtAnimT > 0) { anim = 'p_hurt'; this._hurtAnimT -= delta; }
            else if (proneNow) anim = 'p_prone';
            else if (!onGround) anim = vy < 0 ? 'p_jump' : 'p_fall';
            else if (Math.abs(vx) > 40) anim = 'p_run';
            else anim = 'p_idle';
            if (this.anims && this.anims.currentAnim && this.anims.currentAnim.key === anim) { /* keep */ }
            else if (this.play) this.play(anim, true);

            // landing squash juice (on top of anim)
            if (onGround && !this._wasGround && this._fellFast) { this._squash = 1; this._fellFast = false; }
            if (!onGround && vy > 300) this._fellFast = true;
            this._wasGround = onGround;
            this._squash = Math.max(0, (this._squash || 0) - delta / 140);

            var sx = 1, sy = 1, ang = 0;
            if (!onGround) ang = Phaser_clampNum(vx * 0.015, -6, 6);
            if (this._squash > 0) { sy *= (1 - 0.28 * this._squash); sx *= (1 + 0.28 * this._squash); }
            if (this._recoil > 0) { this._recoil -= delta; sx *= 0.97; }   // tiny recoil
            this.setScale(this.facing < 0 ? -sx : sx, sy);
            this.setAngle(ang);
        };
        Player.prototype.aimDir = function () {
            // returns {x,y} unit-ish for bullet velocity (Bible §4.4 — 5 dirs)
            var fx = this.facing, up = input.up, down = input.down && !this.body.blocked.down;
            if (up && (input.left || input.right)) return { x: fx * 0.7, y: -0.7 };
            if (up) return { x: 0, y: -1 };
            if (down) return { x: fx * 0.7, y: 0.7 };
            return { x: fx, y: 0 };
        };
        Player.prototype.shoot = function () {
            var w = C.weapons[this.weapon];
            if (this.ammo !== Infinity && this.ammo <= 0) { this.weapon = 'P'; this.ammo = Infinity; this.scene.updateHUD(); }
            w = C.weapons[this.weapon];
            this.fireT = w.rate;
            this._recoil = 80;
            var d = this.aimDir();
            var sx = this.x + d.x * 18, sy = this.y - 6 + d.y * 6;
            // muzzle flash following the 8-dir aim
            this.scene.pSpark.explode(3, sx + d.x * 8, sy + d.y * 8);
            var mz = this.scene.add.image(sx + d.x * 10, sy + d.y * 10, 't_flame').setScale(0.5).setDepth(5).setAlpha(0.9);
            this.scene.tweens.add({ targets: mz, alpha: 0, scale: 0.2, duration: 90, onComplete: function () { mz.destroy(); } });
            if (w.kind === 'cone') {
                for (var i = -1; i <= 1; i++) this.scene.spawnBullet(sx, sy, d.x, d.y + i * 0.25, 't_bullet', 560);
                SFX.shotgun();
            } else if (w.kind === 'rocket') {
                this.scene.spawnBullet(sx, sy, d.x, d.y, 't_rocket', 420); SFX.rocket();
            } else if (w.kind === 'flame') {
                this.scene.spawnBullet(sx, sy, d.x, d.y, 't_flame', 360); SFX.mg();
            } else if (w.kind === 'mg') {
                this.scene.spawnBullet(sx, sy, d.x, d.y, 't_bullet', 720); SFX.mg();
            } else {
                this.scene.spawnBullet(sx, sy, d.x, d.y, 't_bullet', 640); SFX.shoot();
            }
            if (this.ammo !== Infinity) { this.ammo--; this.scene.updateHUD(); }
            this.scene.pSpark.explode(2, sx + d.x * 6, sy + d.y * 6);
        };
        Player.prototype.throwGrenade = function () {
            this.grenades--;
            var n = this.scene.bullets.get(this.x + this.facing * 14, this.y - 10, 't_nade');
            if (!n) return;
            n.setActive(true).setVisible(true); n.body.enable = true; n.body.setAllowGravity(true);
            n.setData('nade', true); n.body.setVelocity(this.facing * 260, -260);
            n.setData('dmg', 5);
            SFX.grenade();
        };

        GameScene.prototype.spawnBullet = function (x, y, dx, dy, tex, spd) {
            var b = this.bullets.get(x, y, tex);
            if (!b) return;
            b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(false);
            var len = Math.hypot(dx, dy) || 1;
            b.body.setVelocity(dx / len * spd, dy / len * spd);
            b.setData('nade', false);
            if (tex === 't_rocket' || tex === 't_bullet') b.setRotation(Math.atan2(dy, dx));
            b.setData('dmg', this.player.weaponDmg());
            return b;
        };

        return GameScene;
    }

})();

