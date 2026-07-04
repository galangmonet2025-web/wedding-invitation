/* ======================================================================
   RETROMARIO WEDDING — "PETUALANGAN MENUJU PELAMINAN"
   Phaser 3.80.1 classic Super Mario Bros platformer wedding-invitation theme.
   Built from RETROMARIO_WEDDING_BIBLE.md.

   The invitation is DISCOVERED by playing: run & jump through 6 worlds and
   PUNCH each "Kotak Cinta" (gold ?-block with a pulsing heart) from below to
   UNLOCK one invitation piece. Reach World 6, beat Bowser "Raja Kesepian",
   rescue Si-Bride → the full invitation opens with a party. WEDDING first: any
   guest reaches the invitation via the 💌 button + Cheat (★), or by collecting
   the last piece / beating the boss.

   Host contract (Bible APPENDIX Z): cleanup hook (window.__gwCleanup), verbatim
   host IDs, global submit fns + fallback, idempotent music mirror, dynamic
   piece count from #inv-source, celebration with 2 triggers. Phaser is
   host-CDN-loaded; this theme self-loads it as fallback (ensurePhaser).
   Procedural textures are the working baseline (PNG sheets optional, APPENDIX P).
   ====================================================================== */
(function () {
    'use strict';

    /* =================================================================
       HOST CONTRACT — cleanup hook (theme re-injected on every change /
       on every guest RSVP/wish submit). Teardown-before-boot guarantees
       ONE game, ONE RAF, ONE canvas. (name MUST stay window.__gwCleanup)
       ================================================================= */
    if (typeof window.__gwCleanup === 'function') { try { window.__gwCleanup(); } catch (e) {} }
    var cleanupFns = [];
    function onCleanup(fn) { cleanupFns.push(fn); }
    window.__gwCleanup = function () {
        cleanupFns.forEach(function (f) { try { f(); } catch (e) {} });
        cleanupFns = [];
        if (window.__gwGame) { try { window.__gwGame.destroy(true); } catch (e) {} window.__gwGame = null; }
        window.__gwCleanup = null;
    };

    var BUILD = 'retromario-wedding';
    var VERSION = 'v1.0.0';
    try { console.log('%c[' + BUILD + '] ' + VERSION, 'background:#e45c10;color:#fff;padding:2px 6px;border-radius:3px'); } catch (e) {}

    /* =================================================================
       CENTRAL CONFIG (Bible APPENDIX S / §4.2) — all numbers in one place.
       Physics are the canonical SMB numbers scaled to tile=32 @ 60fps.
       ================================================================= */
    var CONFIG = {
        W: 540, H: 960, TILE: 32, GROUND_Y: 0, /* GROUND_Y set after boot from H */
        player: {
            walk: 150, run: 300, accel: 900, friction: 1200, airAccel: 600,
            gravity: 2200, jump: -620, jumpCut: 0.45, runJumpBoost: 0.08,
            maxFall: 700, coyoteMs: 90, bufferMs: 90, invulnMs: 1200,
            w: 22, h: 30, hSuper: 54
        },
        diff: {
            easy:   { minEnemies: 1, espeed: 0.85, invulnMs: 1400, respawnFreeze: 1200, powerFreq: 1.0 },
            normal: { minEnemies: 2, espeed: 1.0,  invulnMs: 1200, respawnFreeze: 1000, powerFreq: 0.7 },
            hard:   { minEnemies: 3, espeed: 1.2,  invulnMs: 900,  respawnFreeze: 700,  powerFreq: 0.5 }
        },
        quotaShape: [2, 2, 2, 2, 2, 1],  /* per-world piece quota; scaled to N real sections */
        worlds: 6,
        storeKey: 'rmw_v1',
        /* jump-arc reach (Bible §4.2): standing ~4 tiles, run ~6 tiles up; D_max=12 tiles horiz */
        reach: { jumpApex: 128, stepUp: 96, stepRun: 200, tierGap: 96 }
    };

    var WORLD_NAMES = ['Padang Rumput', 'Gua Kenangan', 'Pantai Cinta', 'Langit Awan', 'Kastil Es', 'Kastil Terakhir'];
    var SECTION_TITLE = {
        hero: 'Pembuka', couple: 'Mempelai', rsvp: 'Konfirmasi', schedule: 'Acara',
        streaming: 'Live Streaming', story: 'Kisah', gallery: 'Galeri', happiness: 'Bagikan',
        wishes: 'Ucapan', gift: 'Kado', closing: 'Penutup'
    };

    /* =================================================================
       DOM HELPERS + binding reads (Bible APPENDIX W.4 — val())
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
       SPRITE SHEET ASSETS (APPENDIX P) — OPTIONAL. Procedural is baseline.
       assetUrl() reads the hidden #rmw-assets <img data-asset>. Empty /
       unresolved → null → procedural fallback (usingXAssets stays false).
       This build ships procedural only; the scaffold is here for future PNGs.
       ================================================================= */
    function assetUrl(name) {
        var el = document.querySelector('#rmw-assets img[data-asset="' + name + '"]');
        if (!el) return null;
        var v = (el.getAttribute('src') || '').trim();
        if (!v || v.indexOf('{{') > -1) return null;
        return v;
    }

    /* =================================================================
       TOAST + error
       ================================================================= */
    var toastTimer;
    function toast(msg, ms) {
        var t = $('rmw-toast'); if (!t) return;
        t.innerHTML = msg; t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
    }
    function showError(msg) {
        var c = $('rmw-cover');
        if (c) {
            c.classList.add('show');
            c.innerHTML = '<div class="rmw-overlay-card"><div class="rmw-overlay-pixtitle" style="color:#ff6a6a">GAGAL MEMUAT</div><div class="rmw-overlay-text">' + esc(msg) + '</div></div>';
        }
        try { console.error('[retromario-wedding] ' + msg); } catch (e) {}
    }

    /* copy-to-clipboard for gift buttons (inline onclick=rmwCopy) */
    window.rmwCopy = function (id, btn) {
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
       PERSISTENCE (Bible APPENDIX Y / S.5) — versioned + try/catch.
       Persist: unlocked pieces, highest world, best score, difficulty,
       celebration guards. DO NOT persist cheat (default).
       ================================================================= */
    var STORE = loadStore();
    function loadStore() {
        var def = { unlocked: [], maxWorld: 0, best: 0, diff: 'easy', announcedAll: false, completed: false };
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
        STORE = { unlocked: [], maxWorld: 0, best: 0, diff: 'easy', announcedAll: false, completed: false };
        saveStore();
    }

    /* =================================================================
       SPRITE TUNER (PC dev tool) — per-sprite-type vertical offset (px).
       Negative = up, positive = down. Read at every spawn anchor via tuneY();
       slider changes apply LIVE to existing sprites + persist.
       ================================================================= */
    var TUNE_KEY = 'rmw_tune_v1';
    var TUNE_DEFAULTS = {
        player: 0, goomba: 0, koopa: 0, paratroopa: 0, piranha: 0, spiny: 0, lakitu: 0,
        buzzy: 0, hammer: 0, boss: 0, lovebox: 0, coin: 0, mushroom: 0, flower: 0, star: 0,
        ground: 0, brick: 0, qblock: 0, pipe: 0, plat: 0, hill: 0, cloud: 0, bush: 0, flag: 0, bride: 0
    };
    var TUNE_SPECS = [
        { id: 'player',   label: 'Player' },
        { id: 'bride',    label: 'Mempelai (Sangkar)' },
        { id: 'goomba',   label: 'Goomba' },
        { id: 'koopa',    label: 'Koopa' },
        { id: 'paratroopa', label: 'Paratroopa' },
        { id: 'piranha',  label: 'Piranha' },
        { id: 'spiny',    label: 'Spiny' },
        { id: 'lakitu',   label: 'Lakitu' },
        { id: 'buzzy',    label: 'Buzzy' },
        { id: 'hammer',   label: 'Hammer Bro' },
        { id: 'boss',     label: 'Bowser' },
        { id: 'lovebox',  label: 'Kotak Cinta' },
        { id: 'coin',     label: 'Koin' },
        { id: 'mushroom', label: 'Jamur' },
        { id: 'flower',   label: 'Bunga' },
        { id: 'star',     label: 'Bintang' },
        { id: 'ground',   label: 'Tanah' },
        { id: 'brick',    label: 'Bata' },
        { id: 'qblock',   label: '?-Block' },
        { id: 'pipe',     label: 'Pipa' },
        { id: 'plat',     label: 'Pijakan' },
        { id: 'hill',     label: 'Bukit' },
        { id: 'cloud',    label: 'Awan' },
        { id: 'bush',     label: 'Semak' },
        { id: 'flag',     label: 'Flagpole' }
    ];
    var TUNE_MIN = -60, TUNE_MAX = 60;
    var TUNE = loadTune();
    function loadTune() {
        var t = {};
        TUNE_SPECS.forEach(function (s) { t[s.id] = (typeof TUNE_DEFAULTS[s.id] === 'number') ? TUNE_DEFAULTS[s.id] : 0; });
        try {
            var raw = localStorage.getItem(TUNE_KEY);
            if (raw) { var p = JSON.parse(raw) || {}; TUNE_SPECS.forEach(function (s) { if (typeof p[s.id] === 'number') t[s.id] = p[s.id]; }); }
        } catch (e) {}
        return t;
    }
    function saveTune() { try { localStorage.setItem(TUNE_KEY, JSON.stringify(TUNE)); } catch (e) {} }
    function tuneY(id, y) { return y + (TUNE[id] || 0); }

    /* =================================================================
       WEDDING LAYER — scan #inv-source for REAL sections (Bible APPENDIX W/X)
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
        unlocked = {};
        (STORE.unlocked || []).forEach(function (k) {
            if (INFOS.some(function (i) { return i.key === k; })) unlocked[k] = true;
        });
    }
    function N() { return INFOS.length; }
    function unlockedCount() { return INFOS.filter(function (i) { return unlocked[i.key]; }).length; }
    function allInfoUnlocked() { return N() > 0 && unlockedCount() >= N(); }
    function titleOf(key) { var f = INFOS.filter(function (i) { return i.key === key; })[0]; return f ? f.title : key; }

    /* per-world piece quota with auto-scale (Bible APPENDIX X.2) */
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
    function infosForWorld(worldIdx) {
        // deterministic contiguous slice (Bible APPENDIX X.3) — not a running counter
        var start = 0;
        for (var i = 0; i < worldIdx; i++) start += QUOTA[i];
        return INFOS.slice(start, start + (QUOTA[worldIdx] || 0));
    }

    /* =================================================================
       INDICATORS + INVENTORY UI (Bible §Z.5.2)
       ================================================================= */
    function buildIndicators() {
        var inv = $('rmw-inv'); if (!inv) return;
        inv.innerHTML = '';
        INFOS.forEach(function (info) {
            var chip = document.createElement('div');
            chip.className = 'rmw-inv-chip' + (unlocked[info.key] ? ' is-on' : '');
            chip.title = info.title;
            chip.textContent = pieceGlyph(info.key);
            chip.dataset.key = info.key;
            chip.addEventListener('click', function () { if (unlocked[info.key]) openPieceModal(info.key); });
            inv.appendChild(chip);
        });
        var pt = $('rmw-progress-t'); if (pt) pt.textContent = String(N());
        updateProgress();
    }
    function pieceGlyph(key) {
        var g = { hero: '♥', couple: '👰', rsvp: '✓', schedule: '⌚', streaming: '📺', story: '📖',
            gallery: '🖼', happiness: '📸', wishes: '✉', gift: '🎁', closing: '★' };
        return g[key] || '💌';
    }
    function updateProgress() {
        var pn = $('rmw-progress-n'); if (pn) pn.textContent = String(unlockedCount());
        var view = $('rmw-view-btn');
        if (view) {
            if (allInfoUnlocked() || cheat.on) view.classList.remove('is-locked');
            else view.classList.add('is-locked');
        }
    }
    function lightIndicator(key) {
        var chip = document.querySelector('.rmw-inv-chip[data-key="' + key + '"]');
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
            toast('💌 Kepingan "<b>' + esc(titleOf(key)) + '</b>" ditemukan!');
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
       MODAL + FULL REVEAL — clone from #inv-source (Bible APPENDIX Z.7)
       ================================================================= */
    function openPieceModal(key) {
        var src = document.querySelector('#inv-source > section[data-info="' + key + '"]');
        if (!src) return;
        var body = $('rmw-modal-body'), title = $('rmw-modal-title');
        title.textContent = (SECTION_TITLE[key] || key).toUpperCase();
        body.innerHTML = '';
        var clone = src.cloneNode(true);
        clone.style.display = '';
        hydrateImages(clone);
        body.appendChild(clone);
        rewireHostFormsInside(body);
        rewireGalleryInside(body);
        $('rmw-modal-root').classList.add('show');
    }
    function closeModal() { $('rmw-modal-root').classList.remove('show'); }

    function revealFullInvitation() {
        var scroll = $('rmw-reveal-scroll');
        scroll.innerHTML = '';
        INFOS.forEach(function (info) {
            var clone = info.el.cloneNode(true);
            clone.style.display = '';
            hydrateImages(clone);
            scroll.appendChild(clone);
        });
        rewireHostFormsInside(scroll);
        rewireGalleryInside(scroll);
        $('rmw-reveal').classList.add('show');
        setMusic(true);
    }
    function closeReveal() {
        $('rmw-reveal').classList.remove('show');
        // REVIVE THE GAME on return: opening the invitation calls setMusic(true) → clicks
        // #btn-toggle-music → host flips isPlaying → host RE-INJECTS the theme → __gwCleanup()
        // destroys GAME, but init()'s auto-resume is skipped while the reveal is open. So on
        // close, re-boot if the game was torn down, else resume a paused scene.
        try {
            if (window.__rmwStarted) {
                var sc = scene();
                if (!GAME || !sc) {
                    var rs = window.__rmwStarted;
                    startRun((rs && rs.world) || 0);
                } else if (sc.scene.isPaused()) {
                    sc.scene.resume();
                }
            }
        } catch (e) {}
    }

    function hydrateImages(root) {
        var bgs = root.querySelectorAll('.rmw-hero-bg[data-src], .rmw-closing-bg[data-src]');
        bgs.forEach(function (bg) {
            var u = bg.getAttribute('data-src');
            if (u && u.indexOf('{{') !== 0) bg.style.backgroundImage = "url('" + u + "')";
        });
    }

    /* re-wire host form buttons inside a clone so backend still fires
       (Bible APPENDIX Z.4). IDs stay verbatim; we just (re)attach handlers. */
    function rewireHostFormsInside(root) {
        var rsvp = root.querySelector('#btn-submit-kehadiran');
        if (rsvp) bindOnce(rsvp, function () {
            if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
            var a = root.querySelector('#alert-submit-kehadiran'); if (a) { a.className = 'rmw-alert ok'; a.textContent = 'Terima kasih! Konfirmasi tersimpan.'; }
        });
        var ucp = root.querySelector('#btn-submit-ucapan');
        if (ucp) bindOnce(ucp, function () {
            if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
            var nm = (root.querySelector('#wish-name') || {}).value || 'Tamu';
            var msg = (root.querySelector('#wish-message') || {}).value || '';
            var a = root.querySelector('#alert-submit-ucapan'); if (a) { a.className = 'rmw-alert ok'; a.textContent = 'Terima kasih atas ucapannya!'; }
            var list = root.querySelector('#rmw-wish-list');
            if (list && msg) {
                var it = document.createElement('div'); it.className = 'rmw-wish-item';
                it.innerHTML = '<div class="rmw-wish-head"><span class="rmw-wish-author">' + esc(nm) + '</span><span class="rmw-wish-time">baru saja</span></div><div class="rmw-wish-text">' + esc(msg) + '</div>';
                list.insertBefore(it, list.firstChild);
            }
        });
    }
    function bindOnce(el, fn) {
        if (el.__rmwBound) return;
        el.__rmwBound = true;
        el.addEventListener('click', fn);
    }
    function rewireGalleryInside(root) {
        var items = root.querySelectorAll('.rmw-gallery-item img');
        items.forEach(function (img) {
            if (img.__rmwBound) return; img.__rmwBound = true;
            img.parentElement.style.cursor = 'pointer';
            img.parentElement.addEventListener('click', function () {
                var lb = $('rmw-lightbox'); $('rmw-lightbox-img').src = img.src; lb.classList.add('show');
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
        var btn = $('rmw-star-btn'); if (btn) btn.classList.toggle('is-on', cheat.on);
        var ss = $('rmw-stagesel-btn'); if (ss) ss.style.display = cheat.on ? '' : 'none';
        if (cheat.on) {
            unlockAll();
            toast('★ CHEAT ON — kebal + semua dunia + undangan terbuka');
        } else {
            toast('Cheat off — mode jujur kembali');
        }
        updateProgress();
        var sc = scene();
        if (sc && sc.player) sc.cheatOn = cheat.on;
    }

    /* =================================================================
       CELEBRATION (Bible APPENDIX Z.6) — 2 triggers, persisted guards.
       ================================================================= */
    function announceAllCollected() {
        if (STORE.announcedAll) return;
        STORE.announcedAll = true; saveStore();
        var sc = scene();
        if (sc && sc.celebrate) sc.celebrate('pieces');
        setTimeout(function () {
            var t = $('rmw-allpieces-text');
            if (t) t.innerHTML = 'Hebat! Semua kepingan undangan ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'sudah terkumpul. Undangan siap dibuka!';
            showOverlay('rmw-allpieces');
        }, 4500);
    }
    function bossFinale() {
        unlockAll(true);
        if (STORE.completed) { revealFullInvitation(); return; }
        STORE.completed = true; saveStore();
        var sc = scene();
        if (sc && sc.celebrate) sc.celebrate('boss');
        setTimeout(function () {
            var t = $('rmw-win-text');
            if (t) t.innerHTML = 'Selamat! Bowser "Raja Kesepian" dikalahkan oleh cinta — ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'bersatu di pelaminan. Terima kasih sudah menuntaskan petualangannya. ' +
                'Buka undangannya sekarang, atau tutup dialog ini dulu.';
            showOverlay('rmw-win');
        }, 4500);
    }

    /* =================================================================
       OVERLAY helpers
       ================================================================= */
    function showOverlay(id) { hideOverlays(); var o = $(id); if (o) o.classList.add('show'); }
    function hideOverlays() {
        ['rmw-cover', 'rmw-loading', 'rmw-briefing', 'rmw-clear', 'rmw-allpieces', 'rmw-win', 'rmw-stagesel', 'rmw-resetconfirm']
            .forEach(function (id) { var o = $(id); if (o) o.classList.remove('show'); });
    }
    function hasShow(id) {
        var o = $(id);
        return !!(o && o.classList && o.classList.contains('show'));
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
    var SFX_MUTE_KEY = 'rmw_sfx_muted';
    var sfxMuted = (function () { try { return localStorage.getItem(SFX_MUTE_KEY) === '1'; } catch (e) { return false; } })();
    function reflectSfxIcon() {
        var on = $('rmw-sfx-on'), off = $('rmw-sfx-off');
        if (on) on.style.display = sfxMuted ? 'none' : '';
        if (off) off.style.display = sfxMuted ? '' : 'none';
        var btn = $('rmw-sfx-btn'); if (btn) btn.classList.toggle('is-muted', sfxMuted);
    }
    function toggleSfx() {
        sfxMuted = !sfxMuted;
        try { localStorage.setItem(SFX_MUTE_KEY, sfxMuted ? '1' : '0'); } catch (e) {}
        reflectSfxIcon();
        toast(sfxMuted ? '🔇 Suara efek game dimatikan' : '🔊 Suara efek game dinyalakan');
    }
    var AC = null;
    function audioCtx() {
        if (AC) return AC;
        try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
        return AC;
    }
    function blip(freq, dur, type, vol, slideTo) {
        if (sfxMuted) return;
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
        jump:  function () { blip(360, 0.11, 'square', 0.035, 640); },
        stomp: function () { blip(200, 0.09, 'triangle', 0.05, 90); },
        coin:  function () { blip(880 + (Math.random() * 80 - 40), 0.07, 'square', 0.035, 1320); },
        bump:  function () { blip(150, 0.06, 'square', 0.04, 90); },
        brick: function () { blip(120, 0.14, 'sawtooth', 0.05, 60); },
        power: function () { [523, 659, 784].forEach(function (f, i) { setTimeout(function () { blip(f, 0.09, 'square', 0.04); }, i * 70); }); },
        piece: function () { blip(660, 0.1, 'sine', 0.05, 990); setTimeout(function () { blip(990, 0.14, 'sine', 0.05, 1320); }, 80); },
        fire:  function () { blip(520, 0.06, 'sawtooth', 0.03, 260); },
        hurt:  function () { blip(320, 0.22, 'sawtooth', 0.05, 90); },
        flag:  function () { [392, 523, 659, 784].forEach(function (f, i) { setTimeout(function () { blip(f, 0.12, 'square', 0.045); }, i * 90); }); },
        boss:  function () { blip(90, 0.4, 'sawtooth', 0.07, 60); },
        bosshit: function () { blip(160, 0.12, 'square', 0.05, 70); },
        win:   function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { setTimeout(function () { blip(f, 0.16, 'square', 0.05); }, i * 120); }); }
    };

    /* =================================================================
       ensurePhaser — host CDN-loads Phaser; fallback self-load (Bible APPENDIX S)
       ================================================================= */
    function ensurePhaser(cb) {
        if (window.Phaser) return cb();
        if (window.__rmwPhaserLoading) { window.__rmwPhaserLoading.then(cb); return; }
        window.__rmwPhaserLoading = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(); showError('Gagal memuat Phaser dari internet. Cek koneksi.'); };
            document.body.appendChild(s);
        });
        window.__rmwPhaserLoading.then(cb).catch(function () {});
    }

    var GAME = null;
    function startWhenReady() {
        ensurePhaser(function () {
            if (!window.Phaser) { showError('Phaser tidak termuat (timeout).'); return; }
            defineAndBoot();
        });
    }
    var defineAndBoot;   // real definition appended below

    /* ===== KICKOFF ===== */
    function init() {
        try { wireUI(); } catch (e) { try { console.error('[rmw] wireUI', e); } catch (e2) {} }
        try { scanInfos(); QUOTA = buildQuota(N()); STORE.diff = STORE.diff || 'easy'; buildIndicators(); } catch (e) {}
        try { wireMusicMirror(); } catch (e) {}
        try { drawCoupleCanvas(); } catch (e) {}
        try { paintSideBg(); } catch (e) {}
        try { buildTuner(); } catch (e) {}
        try { var v = $('rmw-version'); if (v) v.textContent = VERSION; } catch (e) {}
        try { updateProgress(); } catch (e) {}
        // AUTO-RESUME after a host RE-INJECTION — only when the cover is NOT showing.
        try {
            if (window.__rmwStarted && !hasShow('rmw-cover') && !hasShow('rmw-reveal')) {
                var rs = window.__rmwStarted;
                setTimeout(function () { try { startRun((rs && rs.world) || 0); } catch (e) {} }, 60);
            }
        } catch (e) {}
    }

    /* =================================================================
       DECORATIVE COUPLE CANVAS (desktop right panel) — Canvas 2D, Mario scene:
       Si-Groom (suit+tie) + Si-Bride (gown+bouquet) on a Mario battlefield
       (blue sky, hills, pipes, clouds, hearts, "JUST MARRIED" banner).
       Pure decoration (no game logic). Bible §Z.5.1.
       ================================================================= */
    function paintSideBg() {
        var bg = $('rmw-side-bg'); if (!bg) return;
        var url = srcVal('photo_hero_cover', '');
        if (url) { bg.style.backgroundImage = "url('" + url + "')"; bg.classList.add('has-photo'); }
    }

    function drawCoupleCanvas() {
        var cv = $('rmw-couple-canvas'); if (!cv || !cv.getContext) return;
        var x = cv.getContext('2d'); if (!x) return;
        var W = cv.width, H = cv.height, gy = H - 60;
        x.imageSmoothingEnabled = false;
        x.clearRect(0, 0, W, H);

        // sky gradient (SMB blue)
        var sky = x.createLinearGradient(0, 0, 0, gy);
        sky.addColorStop(0, '#5c94fc'); sky.addColorStop(1, '#9ad0ff');
        x.fillStyle = sky; x.fillRect(0, 0, W, gy);
        // sun
        x.fillStyle = 'rgba(255,240,180,0.9)'; circle(x, W * 0.82, H * 0.24, 40);
        // clouds
        x.fillStyle = '#ffffff'; cloud(x, W * 0.16, 70); cloud(x, W * 0.55, 46);
        // far hills
        x.fillStyle = '#3a9a3a'; hill(x, 90, gy, 150); hill(x, 380, gy, 200); hill(x, 640, gy, 160);
        // ground (grass top + soil)
        x.fillStyle = '#c84c0c'; x.fillRect(0, gy, W, H - gy);
        x.fillStyle = '#00a800'; x.fillRect(0, gy, W, 12);
        // brick pattern
        x.fillStyle = 'rgba(0,0,0,0.12)';
        for (var bx = 0; bx < W; bx += 32) { for (var by = gy + 14; by < H; by += 16) { x.fillRect(bx + ((by / 16 | 0) % 2 ? 16 : 0), by, 30, 1); } }
        // pipes
        pipe(x, 60, gy, 64); pipe(x, W - 110, gy, 90);
        // flagpole
        x.strokeStyle = '#d0d0d0'; x.lineWidth = 4; line(x, W * 0.5 - 150, gy, W * 0.5 - 150, gy - 110);
        x.fillStyle = '#e23b2e'; tri(x, W * 0.5 - 146, gy - 108, W * 0.5 - 110, gy - 96, W * 0.5 - 146, gy - 84);

        // hearts floating
        x.fillStyle = 'rgba(255,138,176,0.9)';
        heart(x, W * 0.30, 90, 14); heart(x, W * 0.68, 74, 18); heart(x, W * 0.5, 130, 12);

        // === COUPLE (center) ===
        var cx = W * 0.5;
        groom(x, cx - 66, gy);
        bride(x, cx + 66, gy);
        x.fillStyle = '#e23b2e'; heart(x, cx, gy - 116, 22);

        // "JUST MARRIED" banner
        x.fillStyle = '#fff4e0'; roundRect(x, cx - 150, 14, 300, 40, 8); x.fill();
        x.strokeStyle = '#e45c10'; x.lineWidth = 3; roundRect(x, cx - 150, 14, 300, 40, 8); x.stroke();
        x.fillStyle = '#e23b2e'; x.font = 'bold 26px "Courier New", monospace'; x.textAlign = 'center';
        x.fillText('JUST MARRIED', cx, 43);
        x.fillStyle = '#ffd447'; x.fillRect(cx - 150, 50, 300, 4);

        function circle(c, X, Y, r) { c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill(); }
        function tri(c, x1, y1, x2, y2, x3, y3) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill(); }
        function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
        function roundRect(c, X, Y, w, h, r) { c.beginPath(); c.moveTo(X + r, Y); c.arcTo(X + w, Y, X + w, Y + h, r); c.arcTo(X + w, Y + h, X, Y + h, r); c.arcTo(X, Y + h, X, Y, r); c.arcTo(X, Y, X + w, Y, r); c.closePath(); }
        function heart(c, X, Y, s) { c.save(); c.translate(X, Y); c.beginPath(); c.moveTo(0, s * 0.3); c.bezierCurveTo(s, -s * 0.6, s * 1.2, s * 0.5, 0, s); c.bezierCurveTo(-s * 1.2, s * 0.5, -s, -s * 0.6, 0, s * 0.3); c.fill(); c.restore(); }
        function cloud(c, X, Y) { c.beginPath(); c.arc(X, Y, 18, 0, 7); c.arc(X + 20, Y + 4, 22, 0, 7); c.arc(X + 44, Y, 16, 0, 7); c.arc(X + 22, Y - 8, 16, 0, 7); c.fill(); }
        function hill(c, X, gy2, w) { c.beginPath(); c.arc(X, gy2, w / 2, Math.PI, 0); c.fill(); }
        function pipe(c, X, gy2, h) {
            c.fillStyle = '#00a800'; c.fillRect(X, gy2 - h, 52, h);
            c.fillStyle = '#00c800'; c.fillRect(X + 4, gy2 - h, 10, h);
            c.fillStyle = '#007000'; c.fillRect(X + 40, gy2 - h, 8, h);
            c.fillStyle = '#00a800'; c.fillRect(X - 6, gy2 - h, 64, 18);
            c.fillStyle = '#00c800'; c.fillRect(X - 2, gy2 - h + 3, 12, 5);
            c.strokeStyle = '#003800'; c.lineWidth = 2; c.strokeRect(X - 6, gy2 - h, 64, 18); c.strokeRect(X, gy2 - h + 18, 52, h - 18);
        }
        function groom(c, X, gy2) {
            c.fillStyle = '#23262e'; c.fillRect(X - 14, gy2 - 46, 12, 46); c.fillRect(X + 2, gy2 - 46, 12, 46);
            c.fillStyle = '#14161c'; c.fillRect(X - 16, gy2 - 4, 16, 6); c.fillRect(X, gy2 - 4, 16, 6);
            c.fillStyle = '#2a2e38'; roundRect(c, X - 18, gy2 - 86, 36, 50, 6); c.fill();
            c.fillStyle = '#fff'; c.fillRect(X - 6, gy2 - 86, 12, 40);
            c.fillStyle = '#e23b2e'; c.beginPath(); c.moveTo(X, gy2 - 84); c.lineTo(X - 5, gy2 - 70); c.lineTo(X, gy2 - 56); c.lineTo(X + 5, gy2 - 70); c.closePath(); c.fill();
            c.fillStyle = '#1a1d24'; tri(c, X - 18, gy2 - 86, X - 2, gy2 - 86, X - 10, gy2 - 60); tri(c, X + 18, gy2 - 86, X + 2, gy2 - 86, X + 10, gy2 - 60);
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#8a1a0a'; c.fillRect(X - 13, gy2 - 118, 26, 10); c.fillRect(X - 15, gy2 - 112, 8, 4);
            c.fillStyle = '#c00'; c.fillRect(X - 13, gy2 - 118, 26, 4);   // red cap band
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
        }
        function bride(c, X, gy2) {
            c.fillStyle = '#fff4e0'; c.beginPath(); c.moveTo(X - 28, gy2); c.lineTo(X - 10, gy2 - 60); c.lineTo(X + 10, gy2 - 60); c.lineTo(X + 28, gy2); c.closePath(); c.fill();
            c.fillStyle = '#fff8ee'; roundRect(c, X - 11, gy2 - 86, 22, 30, 6); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(X - 16, gy2 - 104); c.lineTo(X + 16, gy2 - 104); c.lineTo(X + 22, gy2 - 50); c.lineTo(X - 22, gy2 - 50); c.closePath(); c.fill();
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#6a4a2a'; c.fillRect(X - 13, gy2 - 116, 26, 11);
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
            c.fillStyle = '#ff8ab0'; circle(c, X - 3, gy2 - 95, 2); circle(c, X + 5, gy2 - 95, 2);
            c.fillStyle = '#3a7d4a'; c.fillRect(X - 4, gy2 - 58, 8, 14);
            c.fillStyle = '#ff8ab0'; circle(c, X - 4, gy2 - 58, 5); circle(c, X + 4, gy2 - 58, 5); circle(c, X, gy2 - 64, 5);
        }
    }

    /* =================================================================
       SPRITE TUNER UI — list + sliders.
       ================================================================= */
    function buildTuner() {
        var list = $('rmw-tuner-list'); if (!list) return;
        while (list.firstChild) list.removeChild(list.firstChild);
        TUNE_SPECS.forEach(function (spec) {
            var v = TUNE[spec.id] || 0;
            var row = document.createElement('div'); row.className = 'rmw-tuner-row';
            var top = document.createElement('div'); top.className = 'rmw-tuner-row-top';
            var name = document.createElement('span'); name.className = 'rmw-tuner-row-name'; name.textContent = spec.label;
            var valEl = document.createElement('span'); valEl.className = 'rmw-tuner-row-val';
            valEl.id = 'rmw-tval-' + spec.id; valEl.textContent = (v > 0 ? '+' : '') + v + 'px';
            top.appendChild(name); top.appendChild(valEl);
            var slider = document.createElement('input');
            slider.type = 'range'; slider.min = TUNE_MIN; slider.max = TUNE_MAX; slider.step = 1;
            slider.value = v; slider.setAttribute('data-tune', spec.id);
            var apply = function () {
                var nv = parseInt(slider.value, 10) || 0;
                valEl.textContent = (nv > 0 ? '+' : '') + nv + 'px';
                var sc = scene();
                if (sc && sc.applyLiveTune) sc.applyLiveTune(spec.id, nv);
                else { TUNE[spec.id] = nv; saveTune(); }
            };
            slider.addEventListener('input', apply);
            slider.addEventListener('change', apply);
            row.appendChild(top); row.appendChild(slider);
            list.appendChild(row);
        });
    }
    function toggleTuner() {
        var p = $('rmw-tuner'); if (!p) return;
        var opening = !p.classList.contains('show');
        if (opening) buildTuner();
        p.classList.toggle('show');
    }
    function resetTuner() {
        var sc = scene();
        TUNE_SPECS.forEach(function (spec) {
            var def = (typeof TUNE_DEFAULTS[spec.id] === 'number') ? TUNE_DEFAULTS[spec.id] : 0;
            if (sc && sc.applyLiveTune) sc.applyLiveTune(spec.id, def);
            else TUNE[spec.id] = def;
        });
        saveTune();
        buildTuner();
        toast('Posisi sprite direset ke default');
    }
    function copyTuner() {
        var txt = JSON.stringify(TUNE, null, 2);
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).catch(function () {});
        else fallbackCopy(txt, function () {});
        toast('Nilai disalin: <b>' + esc(txt.replace(/\s+/g, ' ')) + '</b>', 4000);
    }

    init();

    /* =================================================================
       UI WIRING (overlays, buttons, difficulty, stage-select, reset)
       ================================================================= */
    var pendingStage = 0;
    function wireUI() {
        function pickDiff(d) {
            STORE.diff = d; saveStore();
            document.querySelectorAll('.rmw-diff-opt').forEach(function (b) {
                b.classList.toggle('is-sel', b.dataset.diff === d);
            });
            var badge = $('rmw-diff-badge');
            if (badge) { badge.textContent = d.toUpperCase(); badge.dataset.lvl = d; }
        }
        pickDiff(STORE.diff);

        function start() { startRun(0); }

        var ACTIONS = {
            'rmw-start': start,
            'rmw-side-start': start,
            'rmw-cover-view': openInvitationDirect,
            'rmw-side-open': openInvitationDirect,
            'rmw-allpieces-view': function () { hideOverlays(); revealFullInvitation(); },
            'rmw-allpieces-keep': function () { hideOverlays(); resumeGame(); },
            'rmw-win-view': function () { hideOverlays(); revealFullInvitation(); },
            'rmw-win-close': function () { hideOverlays(); resumeGame(); },
            'rmw-view-btn': function () {
                if (allInfoUnlocked() || cheat.on) { revealFullInvitation(); }
                else { toast('Temukan semua Kotak Cinta dulu — atau tekan ★ untuk buka langsung'); }
            },
            'rmw-star-btn': toggleCheat,
            'rmw-sfx-btn': toggleSfx,
            'rmw-stagesel-btn': openStageSelect,
            'rmw-stagesel-ok': function () { hideOverlays(); startRun(pendingStage); },
            'rmw-stagesel-close': function () { hideOverlays(); resumeGame(); },
            'rmw-reset-btn': function () { showOverlay('rmw-resetconfirm'); pauseGame(); },
            'rmw-reset-yes': function () { resetGame(); },
            'rmw-reset-no': function () { hideOverlays(); resumeGame(); },
            'rmw-briefing-go': function () { beginWorld(); },
            'rmw-clear-next': function () { hideOverlays(); nextWorld(); },
            'rmw-modal-close': closeModal,
            'rmw-reveal-close': closeReveal,
            'rmw-lightbox-close': function () { var lb = $('rmw-lightbox'); if (lb) lb.classList.remove('show'); },
            'rmw-tuner-btn': toggleTuner,
            'rmw-tuner-close': function () { var p = $('rmw-tuner'); if (p) p.classList.remove('show'); },
            'rmw-tuner-reset': resetTuner,
            'rmw-tuner-copy': copyTuner
        };
        var delegated = function (e) {
            var t = e.target;
            if (!t || !t.closest) return;
            var diffBtn = t.closest('.rmw-diff-opt');
            if (diffBtn && diffBtn.dataset.diff) { pickDiff(diffBtn.dataset.diff); return; }
            for (var id in ACTIONS) {
                if (t.closest('#' + id)) { ACTIONS[id](); return; }
            }
            if (t.id === 'rmw-modal-root') { closeModal(); return; }
            if (t.id === 'rmw-lightbox') { t.classList.remove('show'); return; }
        };
        if (window.__rmwDelegated) { try { document.removeEventListener('click', window.__rmwDelegated, true); } catch (e) {} }
        window.__rmwDelegated = delegated;
        document.addEventListener('click', delegated, true);
        onCleanup(function () {
            document.removeEventListener('click', delegated, true);
            if (window.__rmwDelegated === delegated) window.__rmwDelegated = null;
        });
        window.__rmwStart = function () { try { startRun(0); } catch (e) {} };
    }

    function openInvitationDirect() {
        unlockAll(true); buildIndicators(); hideOverlays(); revealFullInvitation();
    }
    function openStageSelect() {
        pendingStage = Math.min(runState.world || 0, STORE.maxWorld);
        var grid = $('rmw-stagesel-grid'); grid.innerHTML = '';
        function paintSel() {
            grid.querySelectorAll('.rmw-stagesel-cell').forEach(function (c) {
                c.classList.toggle('is-sel', +c.dataset.idx === pendingStage);
            });
        }
        for (var i = 0; i < CONFIG.worlds; i++) {
            (function (idx) {
                var cell = document.createElement('button');
                var unlockedWorld = cheat.on || idx <= STORE.maxWorld;
                var isBoss = idx === CONFIG.worlds - 1;
                cell.className = 'rmw-stagesel-cell' + (unlockedWorld ? '' : ' is-locked') + (isBoss ? ' is-boss' : '');
                cell.dataset.idx = idx;
                cell.type = 'button';
                var num = (idx + 1 < 10 ? '0' : '') + (idx + 1);
                cell.innerHTML =
                    '<span class="rmw-stagesel-no">' + num + '</span>' +
                    '<span class="rmw-stagesel-name">' + esc(WORLD_NAMES[idx]) + '</span>' +
                    '<span class="rmw-stagesel-badge">' +
                        (unlockedWorld ? (isBoss ? '☠ BOSS' : '▶ GO') : '🔒 TERKUNCI') +
                    '</span>';
                if (unlockedWorld) cell.addEventListener('click', function () { pendingStage = idx; paintSel(); });
                grid.appendChild(cell);
            })(i);
        }
        paintSel();
        showOverlay('rmw-stagesel');
        pauseGame();
    }

    /* =================================================================
       INPUT MODEL (keyboard + touch → one abstraction) — Bible §4.4
       ================================================================= */
    var input = { left: false, right: false, up: false, down: false, run: false, jump: false, jumpEdge: false, fire: false, fireEdge: false };
    var _prevJump = false, _prevFire = false;
    function pollEdges() {
        input.jumpEdge = input.jump && !_prevJump; _prevJump = input.jump;
        input.fireEdge = input.fire && !_prevFire; _prevFire = input.fire;
    }

    function wireInput() {
        var down = function (e) {
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': input.left = true; break;
                case 'ArrowRight': case 'KeyD': input.right = true; break;
                case 'ArrowUp': input.jump = true; e.preventDefault(); break;
                case 'ArrowDown': case 'KeyS': input.down = true; break;
                case 'Space': input.jump = true; e.preventDefault(); break;
                case 'ShiftLeft': case 'ShiftRight': input.run = true; break;
                case 'KeyX': case 'KeyZ': case 'KeyJ': input.fire = true; break;
                case 'KeyW': input.jump = true; break;
            }
        };
        var up = function (e) {
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': input.left = false; break;
                case 'ArrowRight': case 'KeyD': input.right = false; break;
                case 'ArrowUp': input.jump = false; break;
                case 'ArrowDown': case 'KeyS': input.down = false; break;
                case 'Space': input.jump = false; break;
                case 'ShiftLeft': case 'ShiftRight': input.run = false; break;
                case 'KeyX': case 'KeyZ': case 'KeyJ': input.fire = false; break;
                case 'KeyW': input.jump = false; break;
            }
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        onCleanup(function () { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });

        // touch: JUMP (big) + RUN/FIRE
        tapBtn('rmw-jump', function () { input.jump = true; setTimeout(function () { input.jump = false; }, 90); });
        holdBtn('rmw-run', function (v) { input.run = v; input.fire = v; });
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
        var joy = $('rmw-joy'), nub = $('rmw-joy-nub'); if (!joy || !nub) return;
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
            // pushing the stick far = run
            input.run = input.run || (Math.abs(dx) > R * 0.75);
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
        reflectMusicIcon(hostMusicPlaying());
        reflectSfxIcon();
    }

    /* =================================================================
       RUN CONTROL — bridges UI to the Phaser scene.
       ================================================================= */
    var runState = { world: 0, score: 0, coins: 0 };
    function startRun(world) {
        showOverlay('rmw-loading');
        runState.world = world;
        if (world === 0) { runState.score = 0; runState.coins = 0; }
        try { window.__rmwStarted = { world: world }; } catch (e) {}
        wireInputOnce();
        var sc = scene();
        if (GAME && sc && sc.loadWorld) {
            if (world > STORE.maxWorld) { STORE.maxWorld = world; saveStore(); }
            if (sc.scene.isPaused()) sc.scene.resume();
            sc.score = runState.score; sc.coins = runState.coins;
            sc.worldIdx = world;
            sc.cheatOn = cheat.on;
            sc.showBriefing(world);
            return;
        }
        startWhenReady();
    }
    var _inputWired = false;
    function wireInputOnce() { if (_inputWired) return; _inputWired = true; wireInput(); }

    function resetGame() {
        resetStore();
        try { window.__rmwStarted = null; } catch (e) {}
        if (typeof GAME !== 'undefined' && GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__gwGame = null; }
        runState = { world: 0, score: 0, coins: 0 };
        cheat.on = false;
        var sb = $('rmw-star-btn'); if (sb) sb.classList.remove('is-on');
        var ss = $('rmw-stagesel-btn'); if (ss) ss.style.display = 'none';
        scanInfos(); QUOTA = buildQuota(N()); buildIndicators(); updateProgress();
        document.querySelectorAll('.rmw-diff-opt').forEach(function (b) {
            b.classList.toggle('is-sel', b.dataset.diff === 'easy');
        });
        var badge = $('rmw-diff-badge'); if (badge) { badge.textContent = 'EASY'; badge.dataset.lvl = 'easy'; }
        hideOverlays();
        showOverlay('rmw-cover');
        toast('Game direset — pilih kesulitan & mulai lagi');
    }

    function pauseGame() { var sc = scene(); if (sc) sc.scene.pause(); }
    function resumeGame() { var sc = scene(); if (sc && sc.scene.isPaused()) sc.scene.resume(); }
    function scene() { return GAME && GAME.scene ? GAME.scene.getScene('Game') : null; }

    function beginWorld() { var sc = scene(); if (sc && sc.loadWorld) sc.loadWorld(runState.world); }
    function nextWorld() {
        runState.world++;
        if (runState.world >= CONFIG.worlds) { return; }
        if (runState.world > STORE.maxWorld) { STORE.maxWorld = runState.world; saveStore(); }
        var sc = scene(); if (sc && sc.loadWorld) sc.loadWorld(runState.world);
    }

    /* =================================================================
       PART 2 — PHASER GAME (textures, Player, enemies, boss, level, juice)
       Defined now that helpers above exist; booted by startWhenReady().
       ================================================================= */
    defineAndBoot = function () {
        var P = window.Phaser;

        /* ---------- procedural texture helpers (Bible APPENDIX T.5) ---------- */
        function tex(scene, key, w, h, draw) {
            if (scene.textures.exists(key)) return;
            var g = scene.make.graphics({ x: 0, y: 0 }, false);
            draw(g, w, h);
            g.generateTexture(key, w, h);
            g.destroy();
        }
        function box(g, x, y, w, h, base, hi, sh) {
            g.fillStyle(base, 1); g.fillRect(x, y, w, h);
            if (hi != null) { g.fillStyle(hi, 1); g.fillRect(x, y, w, Math.max(1, h * 0.22 | 0)); }
            if (sh != null) { g.fillStyle(sh, 1); g.fillRect(x, y + h - (h * 0.22 | 0), w, Math.max(1, h * 0.22 | 0)); }
        }
        function outline(g, x, y, w, h, col) { g.lineStyle(2, col == null ? 0x201808 : col, 1); g.strokeRect(x, y, w, h); }

        /* ---------- build ALL procedural textures for a scene ---------- */
        function buildTextures(scene) {
            /* ===== PLAYER (Si-Groom) — small (26x30) & super (26x54) ===== */
            function drawGroomSmall(g, frame) {
                var bx = 3;
                g.fillStyle(0x3a2a18, 1);
                if (frame === 'run1') { g.fillRect(bx, 26, 9, 4); g.fillRect(bx + 12, 24, 9, 4); }
                else if (frame === 'run3') { g.fillRect(bx, 24, 9, 4); g.fillRect(bx + 12, 26, 9, 4); }
                else { g.fillRect(bx + 1, 26, 8, 4); g.fillRect(bx + 11, 26, 8, 4); }
                box(g, bx + 2, 15, 16, 12, 0x23262e, 0x3a3d48, 0x14161c);
                g.fillStyle(0xfff4e0, 1); g.fillRect(bx + 8, 15, 4, 10);
                g.fillStyle(0xe23b2e, 1); g.fillRect(bx + 9, 16, 2, 8);
                box(g, bx + 4, 4, 12, 12, 0xf3d2a0, 0xffe6c0, 0xc8a878);
                g.fillStyle(0xc00808, 1); g.fillRect(bx + 3, 2, 14, 5); g.fillRect(bx + 1, 5, 7, 3);
                g.fillStyle(0xff3020, 1); g.fillRect(bx + 3, 2, 14, 2);
                g.fillStyle(0x10140d, 1); g.fillRect(bx + 11, 8, 2, 3);
                g.fillStyle(0x2a1a0a, 1); g.fillRect(bx + 8, 12, 6, 2);
                outline(g, bx, 1, 20, 29);
            }
            ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'prone', 'cast', 'hurt'].forEach(function (fr) {
                tex(scene, 't_groom_' + fr, 26, 30, function (g) { drawGroomSmall(g, fr); });
            });
            ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'prone', 'cast', 'hurt'].forEach(function (fr) {
                tex(scene, 't_groomS_' + fr, 26, 54, function (g) {
                    var bx = 3;
                    g.fillStyle(0x3a2a18, 1);
                    if (fr === 'run1') { g.fillRect(bx, 50, 9, 4); g.fillRect(bx + 12, 48, 9, 4); }
                    else if (fr === 'run3') { g.fillRect(bx, 48, 9, 4); g.fillRect(bx + 12, 50, 9, 4); }
                    else { g.fillRect(bx + 1, 50, 8, 4); g.fillRect(bx + 11, 50, 8, 4); }
                    box(g, bx + 1, 26, 18, 24, 0x23262e, 0x3a3d48, 0x14161c);
                    g.fillStyle(0xfff4e0, 1); g.fillRect(bx + 8, 26, 4, 20);
                    g.fillStyle(0xe23b2e, 1); g.fillRect(bx + 9, 27, 2, 16);
                    box(g, bx + 3, 8, 14, 16, 0xf3d2a0, 0xffe6c0, 0xc8a878);
                    g.fillStyle(0xc00808, 1); g.fillRect(bx + 2, 4, 16, 6); g.fillRect(bx, 8, 8, 4);
                    g.fillStyle(0xff3020, 1); g.fillRect(bx + 2, 4, 16, 2);
                    g.fillStyle(0x10140d, 1); g.fillRect(bx + 12, 13, 2, 3);
                    g.fillStyle(0x2a1a0a, 1); g.fillRect(bx + 8, 18, 7, 2);
                    outline(g, bx, 3, 20, 51);
                });
            });

            /* ===== ENEMIES ===== */
            ['walk0', 'walk1', 'squash'].forEach(function (fr) {
                tex(scene, 't_goomba_' + fr, 28, 24, function (g) {
                    if (fr === 'squash') { box(g, 1, 16, 26, 8, 0x8b4513, 0xa0602a, 0x5a2e0d); outline(g, 1, 16, 26, 8); return; }
                    box(g, 1, 2, 26, 14, 0x8b4513, 0xa0602a, 0x5a2e0d);
                    g.fillStyle(0x3a2010, 1);
                    if (fr === 'walk1') { g.fillRect(3, 20, 8, 4); g.fillRect(17, 20, 8, 4); }
                    else { g.fillRect(5, 20, 8, 4); g.fillRect(15, 20, 8, 4); }
                    g.fillStyle(0xffffff, 1); g.fillRect(7, 8, 5, 6); g.fillRect(16, 8, 5, 6);
                    g.fillStyle(0x10140d, 1); g.fillRect(9, 10, 2, 3); g.fillRect(18, 10, 2, 3);
                    g.fillStyle(0x2a1408, 1); g.fillTriangle(6, 6, 12, 9, 6, 9); g.fillTriangle(22, 6, 16, 9, 22, 9);
                    outline(g, 1, 2, 26, 20);
                });
            });
            ['walk0', 'walk1'].forEach(function (fr) {
                tex(scene, 't_koopa_' + fr, 28, 40, function (g) {
                    box(g, 3, 14, 22, 20, 0x00a800, 0x30d030, 0x006800);
                    g.fillStyle(0xf0e000, 1); g.fillRect(3, 14, 22, 4);
                    g.fillStyle(0x006800, 1); g.fillRect(13, 16, 2, 16); g.fillRect(6, 22, 16, 2);
                    box(g, 16, 2, 11, 12, 0xf0d000, 0xfff060, 0xb89000);
                    g.fillStyle(0x10140d, 1); g.fillRect(23, 6, 2, 3);
                    g.fillStyle(0xf0a000, 1);
                    if (fr === 'walk1') { g.fillRect(4, 34, 8, 5); g.fillRect(16, 34, 8, 5); }
                    else { g.fillRect(5, 34, 8, 5); g.fillRect(15, 34, 8, 5); }
                    outline(g, 3, 2, 24, 37);
                });
            });
            tex(scene, 't_koopa_shell', 28, 22, function (g) {
                box(g, 1, 2, 26, 18, 0x00a800, 0x30d030, 0x006800);
                g.fillStyle(0xf0e000, 1); g.fillRect(1, 2, 26, 4);
                g.fillStyle(0x006800, 1); g.fillRect(13, 4, 2, 14); g.fillRect(5, 10, 18, 2);
                outline(g, 1, 2, 26, 18);
            });
            ['fly0', 'fly1'].forEach(function (fr) {
                tex(scene, 't_para_' + fr, 34, 40, function (g) {
                    g.fillStyle(0xffffff, 1);
                    if (fr === 'fly1') { g.fillTriangle(2, 8, 10, 16, 2, 24); g.fillTriangle(32, 8, 24, 16, 32, 24); }
                    else { g.fillTriangle(2, 2, 10, 16, 4, 20); g.fillTriangle(32, 2, 24, 16, 30, 20); }
                    box(g, 6, 14, 22, 20, 0xd04020, 0xf07050, 0x902810);
                    g.fillStyle(0xf0e000, 1); g.fillRect(6, 14, 22, 4);
                    box(g, 19, 2, 11, 12, 0xf0d000, 0xfff060, 0xb89000);
                    g.fillStyle(0x10140d, 1); g.fillRect(26, 6, 2, 3);
                    g.fillStyle(0xf0a000, 1); g.fillRect(8, 34, 8, 5); g.fillRect(18, 34, 8, 5);
                    outline(g, 6, 2, 24, 37);
                });
            });
            ['bob0', 'bob1'].forEach(function (fr) {
                tex(scene, 't_piranha_' + fr, 28, 40, function (g) {
                    box(g, 11, 20, 6, 20, 0x2e8a2e, 0x50c050, 0x1a5a1a);
                    box(g, 3, 2, 22, 20, 0xe23b2e, 0xf07060, 0xa01810);
                    g.fillStyle(0xffffff, 1);
                    if (fr === 'bob1') {
                        g.fillTriangle(6, 12, 9, 8, 12, 12); g.fillTriangle(16, 12, 19, 8, 22, 12);
                        g.fillTriangle(6, 12, 9, 16, 12, 12); g.fillTriangle(16, 12, 19, 16, 22, 12);
                    } else { for (var i = 0; i < 4; i++) g.fillRect(5 + i * 5, 11, 3, 2); }
                    g.fillStyle(0xffffff, 0.9); g.fillCircle(8, 6, 2); g.fillCircle(18, 8, 2); g.fillCircle(14, 16, 2);
                    outline(g, 3, 2, 22, 20);
                });
            });
            ['walk0', 'walk1'].forEach(function (fr) {
                tex(scene, 't_spiny_' + fr, 28, 26, function (g) {
                    box(g, 3, 8, 22, 14, 0xd02020, 0xf05040, 0x901010);
                    g.fillStyle(0xfff4e0, 1);
                    for (var i = 0; i < 5; i++) g.fillTriangle(4 + i * 5, 8, 6 + i * 5, 1, 8 + i * 5, 8);
                    g.fillStyle(0xffffff, 1); g.fillRect(7, 14, 5, 5); g.fillRect(16, 14, 5, 5);
                    g.fillStyle(0x10140d, 1); g.fillRect(9, 16, 2, 3); g.fillRect(18, 16, 2, 3);
                    g.fillStyle(0xf0a000, 1);
                    if (fr === 'walk1') { g.fillRect(4, 21, 7, 5); g.fillRect(17, 21, 7, 5); }
                    else { g.fillRect(6, 21, 7, 5); g.fillRect(15, 21, 7, 5); }
                    outline(g, 3, 8, 22, 14);
                });
            });
            ['hover', 'throw'].forEach(function (fr) {
                tex(scene, 't_lakitu_' + fr, 34, 40, function (g) {
                    g.fillStyle(0xffffff, 1); g.fillEllipse(17, 30, 34, 18);
                    g.fillStyle(0xd0e0ff, 1); g.fillEllipse(17, 34, 30, 12);
                    box(g, 8, 14, 18, 14, 0x309030, 0x50c050, 0x1a5a1a);
                    box(g, 12, 4, 12, 12, 0xf0d000, 0xfff060, 0xb89000);
                    g.fillStyle(0x10140d, 1); g.fillRect(13, 8, 4, 3); g.fillRect(19, 8, 4, 3);
                    if (fr === 'throw') { g.fillStyle(0xd02020, 1); g.fillCircle(28, 12, 5); }
                    outline(g, 8, 4, 18, 24);
                });
            });
            ['walk0', 'walk1'].forEach(function (fr) {
                tex(scene, 't_buzzy_' + fr, 28, 24, function (g) {
                    box(g, 3, 6, 22, 14, 0x303048, 0x505070, 0x181828);
                    g.fillStyle(0x6060a0, 1); g.fillEllipse(14, 12, 20, 10);
                    g.fillStyle(0x8080c0, 1); g.fillRect(6, 8, 16, 2);
                    box(g, 18, 12, 8, 8, 0x505070, 0x707090, 0x303048);
                    g.fillStyle(0xff4040, 1); g.fillRect(22, 15, 2, 2);
                    g.fillStyle(0xc0a020, 1);
                    if (fr === 'walk1') { g.fillRect(4, 20, 7, 4); g.fillRect(17, 20, 7, 4); }
                    else { g.fillRect(6, 20, 7, 4); g.fillRect(15, 20, 7, 4); }
                    outline(g, 3, 6, 22, 14);
                });
            });
            tex(scene, 't_buzzy_shell', 28, 18, function (g) {
                box(g, 1, 2, 26, 14, 0x303048, 0x505070, 0x181828);
                g.fillStyle(0x6060a0, 1); g.fillEllipse(14, 9, 22, 8);
                outline(g, 1, 2, 26, 14);
            });
            ['idle', 'throw'].forEach(function (fr) {
                tex(scene, 't_hammer_' + fr, 30, 44, function (g) {
                    box(g, 4, 16, 22, 22, 0x309030, 0x50c050, 0x1a5a1a);
                    g.fillStyle(0xf0e000, 1); g.fillRect(4, 16, 22, 4);
                    box(g, 9, 2, 14, 14, 0x30b030, 0x50d050, 0x1a6a1a);
                    g.fillStyle(0x303048, 1); g.fillRect(8, 2, 16, 6);
                    g.fillStyle(0x10140d, 1); g.fillRect(18, 9, 2, 3);
                    g.fillStyle(0x30b030, 1);
                    if (fr === 'throw') { g.fillRect(20, 8, 8, 4); g.fillStyle(0x808088, 1); g.fillRect(26, 2, 4, 8); }
                    else { g.fillRect(2, 16, 6, 4); g.fillStyle(0x808088, 1); g.fillRect(0, 10, 6, 8); }
                    g.fillStyle(0xf0a000, 1); g.fillRect(6, 38, 8, 5); g.fillRect(16, 38, 8, 5);
                    outline(g, 4, 2, 22, 41);
                });
            });
            tex(scene, 't_hammer_proj', 16, 16, function (g) {
                g.fillStyle(0x8a6a2a, 1); g.fillRect(6, 4, 4, 12);
                box(g, 2, 0, 12, 6, 0x909098, 0xc0c0c8, 0x505058);
                outline(g, 2, 0, 12, 6);
            });

            /* ===== BOSS — Bowser (96x96 cell in 100x100) ===== */
            ['idle0', 'idle1', 'telegraph', 'fire', 'enraged', 'hurt', 'defeated'].forEach(function (fr) {
                tex(scene, 't_boss_' + fr, 100, 100, function (g) {
                    var body = fr === 'enraged' ? 0xd04010 : 0x309030;
                    var bodyHi = fr === 'enraged' ? 0xf07040 : 0x50c050;
                    var bodySh = fr === 'enraged' ? 0x902808 : 0x1a5a1a;
                    if (fr === 'defeated') { body = 0x505030; bodyHi = 0x707050; bodySh = 0x303018; }
                    var oy = fr === 'defeated' ? 30 : 0;
                    box(g, 30, 40 + oy, 50, 44, 0xf0c000, 0xffe040, 0xa08000);
                    g.fillStyle(bodySh, 1);
                    for (var i = 0; i < 4; i++) g.fillTriangle(34 + i * 12, 40 + oy, 40 + i * 12, 28 + oy, 46 + i * 12, 40 + oy);
                    box(g, 20, 30 + oy, 40, 40, body, bodyHi, bodySh);
                    g.fillStyle(body, 1); g.fillRect(10, 44 + oy, 14, 16); g.fillRect(60, 44 + oy, 14, 16);
                    g.fillStyle(0xfff4e0, 1);
                    g.fillTriangle(8, 44 + oy, 12, 40 + oy, 12, 48 + oy); g.fillTriangle(74, 44 + oy, 70, 40 + oy, 70, 48 + oy);
                    box(g, 24, 6 + oy, 34, 30, body, bodyHi, bodySh);
                    g.fillStyle(0xfff4e0, 1);
                    g.fillTriangle(22, 12 + oy, 30, 2 + oy, 32, 14 + oy); g.fillTriangle(60, 12 + oy, 52, 2 + oy, 50, 14 + oy);
                    g.fillStyle(0xf0c000, 1); g.fillRect(30, 0 + oy, 22, 6);
                    g.fillStyle(0xa08000, 1); g.fillRect(40, 0 + oy, 2, 6);
                    g.fillStyle(bodyHi, 1); g.fillRect(28, 26 + oy, 26, 10);
                    if (fr === 'telegraph' || fr === 'fire') { g.fillStyle(0xff5000, 1); g.fillRect(30, 30 + oy, 22, 6); }
                    if (fr === 'fire') { g.fillStyle(0xffb000, 1); g.fillTriangle(52, 28 + oy, 96, 24 + oy, 96, 40 + oy); g.fillTriangle(52, 34 + oy, 96, 30 + oy, 96, 46 + oy); }
                    g.fillStyle(0xffffff, 1); g.fillRect(30, 16 + oy, 6, 6); g.fillRect(44, 16 + oy, 6, 6);
                    g.fillStyle(fr === 'hurt' ? 0xff0000 : 0x10140d, 1); g.fillRect(32, 18 + oy, 3, 4); g.fillRect(46, 18 + oy, 3, 4);
                    outline(g, 20, 6 + oy, 40, 78 - oy, 0x1a0808);
                });
            });

            /* ===== PROJECTILES ===== */
            tex(scene, 't_fireball', 14, 14, function (g) {
                g.fillStyle(0xff5000, 1); g.fillCircle(7, 7, 7);
                g.fillStyle(0xffb000, 1); g.fillCircle(7, 7, 4);
                g.fillStyle(0xffff80, 1); g.fillCircle(6, 6, 2);
            });
            tex(scene, 't_bfire', 18, 18, function (g) {
                g.fillStyle(0xff3000, 1); g.fillCircle(9, 9, 9);
                g.fillStyle(0xffa000, 1); g.fillCircle(9, 9, 5);
                g.fillStyle(0xffff80, 1); g.fillCircle(8, 8, 2);
            });

            /* ===== ITEMS ===== */
            tex(scene, 't_coin', 20, 24, function (g) {
                box(g, 4, 1, 12, 22, 0xf0c000, 0xffe040, 0xa08000);
                g.fillStyle(0xfff080, 1); g.fillRect(8, 4, 4, 16);
                g.fillStyle(0xa08000, 1); g.fillRect(9, 4, 2, 16);
                outline(g, 4, 1, 12, 22, 0x806000);
            });
            tex(scene, 't_mushroom', 28, 28, function (g) {
                box(g, 4, 2, 20, 14, 0xe23b2e, 0xf06050, 0xa01810);
                g.fillStyle(0xfff4e0, 1); g.fillCircle(10, 8, 3); g.fillCircle(18, 9, 3); g.fillCircle(14, 5, 2);
                box(g, 7, 15, 14, 12, 0xfff4e0, 0xffffff, 0xd0c0a0);
                g.fillStyle(0x10140d, 1); g.fillRect(10, 19, 2, 3); g.fillRect(16, 19, 2, 3);
                outline(g, 4, 2, 20, 25);
            });
            tex(scene, 't_flower', 30, 30, function (g) {
                g.fillStyle(0xff8ab0, 1);
                g.fillCircle(15, 8, 6); g.fillCircle(8, 14, 6); g.fillCircle(22, 14, 6); g.fillCircle(15, 20, 6);
                g.fillStyle(0xffd447, 1); g.fillCircle(15, 14, 5);
                g.fillStyle(0xff5000, 1); g.fillCircle(15, 14, 2);
                g.fillStyle(0x2e8a2e, 1); g.fillRect(13, 20, 4, 8);
                outline(g, 4, 2, 22, 26, 0xa04060);
            });
            tex(scene, 't_star', 28, 28, function (g) {
                g.fillStyle(0xffd447, 1);
                var cx = 14, cy = 14, r1 = 13, r2 = 5, pts = [];
                for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5; var r = i % 2 ? r2 : r1; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
                g.beginPath(); g.moveTo(pts[0], pts[1]); for (var k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.closePath(); g.fillPath();
                g.fillStyle(0x10140d, 1); g.fillRect(10, 12, 2, 3); g.fillRect(16, 12, 2, 3);
            });

            /* ===== KOTAK CINTA (Love-Box) ===== */
            tex(scene, 't_lovebox', 32, 32, function (g) {
                box(g, 1, 1, 30, 30, 0xf0c000, 0xffe040, 0xa08000);
                g.fillStyle(0x806000, 1);
                g.fillCircle(4, 4, 2); g.fillCircle(28, 4, 2); g.fillCircle(4, 28, 2); g.fillCircle(28, 28, 2);
                g.fillStyle(0xe23b2e, 1);
                g.fillCircle(12, 13, 5); g.fillCircle(20, 13, 5); g.fillTriangle(7, 15, 25, 15, 16, 26);
                g.fillStyle(0xff8ab0, 1); g.fillCircle(11, 12, 2);
                outline(g, 1, 1, 30, 30, 0x604800);
            });
            tex(scene, 't_lovebox_open', 32, 32, function (g) {
                box(g, 1, 1, 30, 30, 0x8a7020, 0xa08838, 0x604810);
                g.fillStyle(0x604810, 1); g.fillCircle(4, 4, 2); g.fillCircle(28, 4, 2); g.fillCircle(4, 28, 2); g.fillCircle(28, 28, 2);
                outline(g, 1, 1, 30, 30, 0x403008);
            });
            tex(scene, 't_pieceheart', 20, 20, function (g) {
                g.fillStyle(0xf0c000, 1); g.fillCircle(6, 7, 5); g.fillCircle(14, 7, 5); g.fillTriangle(1, 9, 19, 9, 10, 19);
                g.fillStyle(0xffe040, 1); g.fillCircle(5, 6, 2);
            });

            /* ===== BLOCKS + PIPE + GROUND ===== */
            tex(scene, 't_qblock', 32, 32, function (g) {
                box(g, 1, 1, 30, 30, 0xf0a020, 0xffc850, 0xa06810);
                g.fillStyle(0x604010, 1); g.fillCircle(4, 4, 2); g.fillCircle(28, 4, 2); g.fillCircle(4, 28, 2); g.fillCircle(28, 28, 2);
                g.fillStyle(0xfff4e0, 1);
                g.fillRect(11, 8, 8, 4); g.fillRect(17, 10, 4, 6); g.fillRect(13, 16, 6, 4); g.fillRect(13, 22, 6, 4);
                outline(g, 1, 1, 30, 30, 0x604010);
            });
            tex(scene, 't_qblock_used', 32, 32, function (g) {
                box(g, 1, 1, 30, 30, 0x9a6a2a, 0xb08040, 0x6a4818);
                g.fillStyle(0x4a3010, 1); g.fillCircle(4, 4, 2); g.fillCircle(28, 4, 2); g.fillCircle(4, 28, 2); g.fillCircle(28, 28, 2);
                outline(g, 1, 1, 30, 30, 0x402c08);
            });
            tex(scene, 't_brick', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0xe45c10, 0xf07828, 0xa53a08);
                g.lineStyle(2, 0x8a2e04, 1);
                g.strokeRect(0, 0, 32, 16); g.strokeRect(0, 16, 32, 16);
                g.beginPath(); g.moveTo(16, 0); g.lineTo(16, 16); g.moveTo(8, 16); g.lineTo(8, 32); g.moveTo(24, 16); g.lineTo(24, 32); g.strokePath();
            });
            tex(scene, 't_hard', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0xb87838, 0xd0985a, 0x8a5420);
                g.fillStyle(0x6a3e14, 1); g.fillCircle(4, 4, 2); g.fillCircle(28, 4, 2); g.fillCircle(4, 28, 2); g.fillCircle(28, 28, 2);
                outline(g, 0, 0, 32, 32, 0x5a3410);
            });
            tex(scene, 't_ground', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0xc84c0c, 0xe06820, 0x8a3006);
                g.fillStyle(0x00a800, 1); g.fillRect(0, 0, 32, 8);
                g.fillStyle(0x30d030, 1); g.fillRect(0, 0, 32, 3);
                g.fillStyle(0x8a3006, 1); g.fillRect(6, 14, 4, 4); g.fillRect(20, 22, 4, 4);
            });
            tex(scene, 't_ground_cave', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0x0060a8, 0x2080d0, 0x003868);
                g.fillStyle(0x2038ec, 1); g.fillRect(0, 0, 32, 6);
                g.fillStyle(0x003868, 1); g.fillRect(6, 14, 4, 4); g.fillRect(20, 22, 4, 4);
            });
            tex(scene, 't_ground_sand', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0xe8c060, 0xf5d888, 0xc09838);
                g.fillStyle(0xf0d090, 1); g.fillRect(0, 0, 32, 6);
                g.fillStyle(0xc09838, 1); g.fillRect(6, 14, 4, 4); g.fillRect(20, 22, 4, 4);
            });
            tex(scene, 't_ground_cloud', 32, 32, function (g) {
                g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 32, 32, 8);
                g.fillStyle(0xd0e0ff, 1); g.fillRect(0, 22, 32, 10);
                g.fillStyle(0xa0c0f0, 1); g.fillCircle(6, 28, 4); g.fillCircle(26, 28, 4);
            });
            tex(scene, 't_ground_ice', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0x6078a8, 0x88a0d0, 0x405878);
                g.fillStyle(0xa8e0ff, 1); g.fillRect(0, 0, 32, 8);
                g.fillStyle(0xd8f0ff, 1); g.fillRect(0, 0, 32, 3);
                g.fillStyle(0xc0e8ff, 0.5); g.fillTriangle(8, 8, 14, 20, 4, 20);
            });
            tex(scene, 't_ground_stone', 32, 32, function (g) {
                box(g, 0, 0, 32, 32, 0x585858, 0x787878, 0x383838);
                g.lineStyle(2, 0x303030, 1); g.strokeRect(0, 0, 16, 16); g.strokeRect(16, 0, 16, 16); g.strokeRect(0, 16, 16, 16); g.strokeRect(16, 16, 16, 16);
            });
            tex(scene, 't_plat', 96, 18, function (g) {
                box(g, 0, 0, 96, 18, 0xc8862c, 0xe0a850, 0x9a6018);
                g.fillStyle(0x30d030, 1); g.fillRect(0, 0, 96, 4);
                g.lineStyle(1, 0x7a4810, 1); for (var i = 0; i < 96; i += 16) g.strokeRect(i, 4, 16, 14);
            });
            tex(scene, 't_plat_cloud', 96, 20, function (g) {
                g.fillStyle(0xffffff, 1); g.fillRoundedRect(0, 0, 96, 20, 10);
                g.fillStyle(0xd0e0ff, 1); g.fillRect(0, 12, 96, 8);
            });
            tex(scene, 't_pipe', 48, 64, function (g) {
                box(g, 4, 14, 40, 50, 0x00a800, 0x40d040, 0x006800);
                g.fillStyle(0x40e040, 1); g.fillRect(8, 14, 8, 50);
                g.fillStyle(0x005000, 1); g.fillRect(36, 14, 6, 50);
                box(g, 0, 0, 48, 16, 0x00a800, 0x40d040, 0x006800);
                g.fillStyle(0x40e040, 1); g.fillRect(4, 2, 10, 4);
                outline(g, 0, 0, 48, 16, 0x004000); outline(g, 4, 14, 40, 50, 0x004000);
            });
            tex(scene, 't_lava', 32, 20, function (g) {
                g.fillStyle(0xff5000, 1); g.fillRect(0, 0, 32, 20);
                g.fillStyle(0xffa000, 1); g.fillRect(0, 0, 32, 5);
                g.fillStyle(0xffd040, 1); g.fillCircle(8, 4, 2); g.fillCircle(22, 6, 2);
            });
            tex(scene, 't_spike', 32, 16, function (g) {
                g.fillStyle(0xd0d0d0, 1);
                for (var i = 0; i < 4; i++) g.fillTriangle(i * 8, 16, i * 8 + 4, 0, i * 8 + 8, 16);
                g.fillStyle(0x808080, 1);
                for (var j = 0; j < 4; j++) g.fillTriangle(j * 8 + 4, 16, j * 8 + 4, 4, j * 8 + 6, 16);
            });
            tex(scene, 't_flag', 24, 260, function (g) {
                g.fillStyle(0x00a800, 1); g.fillRect(9, 4, 6, 256);
                g.fillStyle(0x40d040, 1); g.fillRect(10, 4, 2, 256);
                g.fillStyle(0xffd447, 1); g.fillCircle(12, 4, 6);
                g.fillStyle(0xe23b2e, 1); g.fillTriangle(15, 8, 24, 16, 15, 24);
            });

            /* ===== BRIDE + CAGE ===== */
            tex(scene, 't_bride', 26, 44, function (g) {
                g.fillStyle(0xfff4e0, 1); g.fillTriangle(2, 44, 13, 14, 24, 44);
                box(g, 8, 14, 10, 14, 0xfff8ee, 0xffffff, 0xd8c8a8);
                g.fillStyle(0xffffff, 0.6); g.fillTriangle(6, 2, 20, 2, 22, 20); g.fillTriangle(6, 2, 22, 20, 4, 20);
                box(g, 7, 2, 12, 12, 0xf3d2a0, 0xffe6c0, 0xc8a878);
                g.fillStyle(0x6a4a2a, 1); g.fillRect(6, 0, 14, 5);
                g.fillStyle(0x10140d, 1); g.fillRect(9, 6, 2, 2); g.fillRect(15, 6, 2, 2);
                g.fillStyle(0xff8ab0, 1); g.fillCircle(9, 10, 1); g.fillCircle(17, 10, 1);
                outline(g, 2, 0, 22, 44, 0xa88858);
            });
            tex(scene, 't_cage', 60, 70, function (g) {
                g.lineStyle(3, 0xc0c0c8, 1);
                g.strokeRect(2, 2, 56, 66);
                for (var i = 12; i < 58; i += 12) { g.beginPath(); g.moveTo(i, 2); g.lineTo(i, 68); g.strokePath(); }
                g.fillStyle(0xf0c000, 1); g.fillRect(0, 0, 60, 6);
            });

            /* ===== PROPS / SCENERY ===== */
            tex(scene, 't_hill', 260, 130, function (g) {
                g.fillStyle(0x00a800, 1); g.fillEllipse(130, 130, 250, 200);
                g.fillStyle(0x008800, 1); g.fillEllipse(80, 120, 40, 30); g.fillEllipse(180, 120, 40, 30);
            });
            tex(scene, 't_hill_snow', 260, 130, function (g) {
                g.fillStyle(0xc0d0e0, 1); g.fillEllipse(130, 130, 250, 200);
                g.fillStyle(0xffffff, 1); g.fillEllipse(130, 100, 120, 60);
            });
            tex(scene, 't_hill_dune', 260, 120, function (g) {
                g.fillStyle(0xd8b060, 1); g.fillEllipse(130, 120, 260, 180);
                g.fillStyle(0xc09838, 1); g.fillEllipse(80, 118, 60, 30);
            });
            tex(scene, 't_cloud', 120, 50, function (g) {
                g.fillStyle(0xffffff, 1); g.fillCircle(30, 30, 20); g.fillCircle(55, 24, 26); g.fillCircle(85, 30, 20); g.fillCircle(58, 40, 18);
                g.fillStyle(0xe0eeff, 1); g.fillRect(15, 40, 90, 10);
            });
            tex(scene, 't_bush', 90, 40, function (g) {
                g.fillStyle(0x00a800, 1); g.fillCircle(22, 34, 18); g.fillCircle(45, 28, 22); g.fillCircle(68, 34, 18);
                g.fillStyle(0x008800, 1); g.fillRect(4, 34, 82, 6);
            });
            tex(scene, 't_bush_snow', 90, 40, function (g) {
                g.fillStyle(0x88a0c0, 1); g.fillCircle(22, 34, 18); g.fillCircle(45, 28, 22); g.fillCircle(68, 34, 18);
                g.fillStyle(0xffffff, 1); g.fillCircle(45, 22, 14);
            });
            tex(scene, 't_tree', 70, 110, function (g) {
                g.fillStyle(0x6a3a1a, 1); g.fillRect(30, 60, 12, 50);
                g.fillStyle(0x00a800, 1); g.fillCircle(35, 40, 30); g.fillCircle(18, 55, 20); g.fillCircle(52, 55, 20);
                g.fillStyle(0x30c030, 1); g.fillCircle(28, 32, 12);
            });
            tex(scene, 't_stalactite', 40, 90, function (g) {
                g.fillStyle(0x0060a8, 1); g.fillTriangle(0, 0, 40, 0, 20, 90);
                g.fillStyle(0x2080d0, 1); g.fillTriangle(6, 0, 20, 0, 16, 50);
            });
            tex(scene, 't_torch', 20, 50, function (g) {
                g.fillStyle(0x4a3018, 1); g.fillRect(7, 16, 6, 34);
                g.fillStyle(0xff8000, 1); g.fillCircle(10, 12, 8);
                g.fillStyle(0xffd040, 1); g.fillCircle(10, 10, 4);
            });
            tex(scene, 't_castle', 200, 220, function (g) {
                g.fillStyle(0x585858, 1); g.fillRect(20, 40, 160, 180);
                g.fillStyle(0x484848, 1); g.fillRect(20, 40, 160, 12);
                for (var i = 0; i < 6; i++) g.fillRect(20 + i * 28, 26, 18, 16);
                g.fillStyle(0x686868, 1); g.fillRect(0, 20, 30, 200); g.fillRect(170, 20, 30, 200);
                g.fillStyle(0x101020, 1); g.fillRect(80, 150, 40, 70);
                g.fillStyle(0x101020, 1); g.fillRect(60, 80, 16, 24); g.fillRect(124, 80, 16, 24);
            });

            /* ===== PARTICLES ===== */
            tex(scene, 't_spark', 8, 8, function (g) { g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 4); });
            tex(scene, 't_pheart', 12, 12, function (g) { g.fillStyle(0xff8ab0, 1); g.fillCircle(4, 4, 4); g.fillCircle(8, 4, 4); g.fillTriangle(1, 5, 11, 5, 6, 11); });
            tex(scene, 't_brickbit', 12, 12, function (g) { box(g, 0, 0, 12, 12, 0xe45c10, 0xf07828, 0xa53a08); });
            tex(scene, 't_confetti', 8, 8, function (g) { g.fillStyle(0xffd447, 1); g.fillRect(0, 0, 8, 8); });
        }

        /* boot params measured from real DOM size (Bible APPENDIX T.1) */
        var stageEl = $('gw-stage');
        if (!stageEl) { showError('Elemen #gw-stage tidak ditemukan.'); return; }
        var rect = stageEl.getBoundingClientRect();
        var BW = Math.max(320, Math.round(rect.width));
        var BH = Math.max(480, Math.round(rect.height));
        var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        CONFIG.GROUND_Y = BH - (isTouch ? 200 : 150);

        var GameScene = makeGameScene(P, buildTextures, BW, BH);

        var config = {
            type: P.AUTO, parent: 'gw-stage', width: BW, height: BH,
            backgroundColor: '#5c94fc',
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
       update order: Input→State→Movement→Action→Animation→Collision→Camera→UI
       ================================================================= */
    function makeGameScene(P, buildTextures, BW, BH) {
        var C = CONFIG;
        var T = C.TILE;                 // 32
        var GROUND_Y = C.GROUND_Y;

        /* ---- biome palettes per world (Bible APPENDIX C) ---- */
        var BIOME = [
            { name: 'grassland', skyTop: 0x5c94fc, skyBot: 0x9ad0ff, ground: 't_ground', hill: 't_hill', bush: 't_bush', tree: 't_tree', pool: ['goomba', 'koopa', 'piranha'] },
            { name: 'underground', skyTop: 0x000000, skyBot: 0x0a1a2a, ground: 't_ground_cave', hill: null, bush: null, tree: 't_stalactite', pool: ['goomba', 'buzzy', 'piranha'] },
            { name: 'beach', skyTop: 0xffb85c, skyBot: 0xffe0a0, ground: 't_ground_sand', hill: 't_hill_dune', bush: 't_bush', tree: 't_tree', pool: ['goomba', 'koopa', 'paratroopa'] },
            { name: 'sky', skyTop: 0x3cbcfc, skyBot: 0xbce0ff, ground: 't_ground_cloud', hill: null, bush: null, tree: null, pool: ['lakitu', 'spiny', 'paratroopa'] },
            { name: 'ice', skyTop: 0x8090c8, skyBot: 0xd0e0ff, ground: 't_ground_ice', hill: 't_hill_snow', bush: 't_bush_snow', tree: 't_tree', pool: ['koopa', 'spiny', 'goomba'] },
            { name: 'castle', skyTop: 0x1a0a1a, skyBot: 0x3a1020, ground: 't_ground_stone', hill: null, bush: null, tree: 't_torch', pool: ['hammer', 'buzzy', 'piranha'] }
        ];

        function GameScene() { P.Scene.call(this, { key: 'Game' }); }
        GameScene.prototype = Object.create(P.Scene.prototype);
        GameScene.prototype.constructor = GameScene;

        /* preload — OPTIONAL PNG sheets. Procedural is baseline (this build). */
        GameScene.prototype.preload = function () {
            // asset sheets are optional; procedural fallback always used here.
        };

        GameScene.prototype.create = function () {
            var self = this;
            buildTextures(this);
            this.buildAnims();

            this.diff = C.diff[STORE.diff];
            this.score = runState.score || 0;
            this.coins = runState.coins || 0;
            this.cheatOn = cheat.on;
            this.trauma = 0;
            this.freezeUntil = 0;
            this.worldIdx = runState.world || 0;
            this.tunables = [];

            // groups / pools (Bible APPENDIX T.4)
            this.solids = this.physics.add.staticGroup();     // ground/hard/pipe (full collide)
            this.blocks = this.physics.add.staticGroup();     // ?/brick/lovebox (head-bump)
            this.oneways = this.physics.add.staticGroup();     // one-way platforms
            this.enemies = this.physics.add.group();
            this.fireballs = this.physics.add.group({ maxSize: 4, allowGravity: true });
            this.ebullets = this.physics.add.group({ maxSize: 40, allowGravity: false });
            this.shells = this.physics.add.group();
            this.coinsG = this.physics.add.group({ allowGravity: false });
            this.powerups = this.physics.add.group();
            this.hazards = this.physics.add.staticGroup();
            this.decor = this.add.group();
            this.parallax = this.add.group();

            // player
            this.player = this.makePlayer(120, GROUND_Y - 60);
            this.player.setCheat(cheat.on);

            // colliders (registered once; groups get repopulated per world)
            this.physics.add.collider(this.player, this.solids);
            this.physics.add.collider(this.enemies, this.solids);
            this.physics.add.collider(this.shells, this.solids);
            this.physics.add.collider(this.powerups, this.solids);
            this.physics.add.collider(this.enemies, this.blocks);
            this.physics.add.collider(this.shells, this.blocks);
            this.physics.add.collider(this.powerups, this.blocks);
            // one-way platforms (only collide when falling onto them)
            var onewayProc = function (obj, plat) {
                return obj.body.velocity.y >= 0 && obj.body.bottom <= plat.body.top + 10;
            };
            this.physics.add.collider(this.player, this.oneways, null, onewayProc);
            this.physics.add.collider(this.enemies, this.oneways, null, onewayProc);
            this.physics.add.collider(this.powerups, this.oneways, null, onewayProc);
            // player head-bump on blocks
            this.physics.add.collider(this.player, this.blocks, this.onBlockHit, null, this);
            // player vs enemy (overlap → stomp / hurt)
            this.physics.add.overlap(this.player, this.enemies, this.onPlayerEnemy, null, this);
            this.physics.add.overlap(this.player, this.shells, this.onPlayerShell, null, this);
            this.physics.add.overlap(this.player, this.ebullets, this.onPlayerEBullet, null, this);
            // fireball vs enemy MUST be registered before fireball vs platform (overlap-first)
            this.physics.add.overlap(this.fireballs, this.enemies, this.onFireballEnemy, null, this);
            this.physics.add.collider(this.fireballs, this.solids, this.onFireballGround, null, this);
            this.physics.add.collider(this.fireballs, this.blocks, this.onFireballGround, null, this);
            // shell vs enemy (kill), shell vs player handled above
            this.physics.add.overlap(this.shells, this.enemies, this.onShellEnemy, null, this);
            // collectibles
            this.physics.add.overlap(this.player, this.coinsG, this.onCoin, null, this);
            this.physics.add.overlap(this.player, this.powerups, this.onPowerup, null, this);

            // camera (Bible §9)
            this.cameras.main.setBackgroundColor('#5c94fc');
            this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
            this.cameras.main.setDeadzone(20, 120);
            this.cameras.main.setFollowOffset(-Math.round(BW * 0.40), -70);

            // clear-sequence state machine (Bible §10.1)
            this.clearSeq = null;

            // build the current world & show briefing
            this.showBriefing(this.worldIdx);
            this.buildWorld(this.worldIdx);

            // HUD initial
            this.syncHud();

            this.events.on('shutdown', function () {
                self.time.removeAllEvents();
                self.tweens.killAll();
                if (self.pieceEm) { try { self.pieceEm.destroy(); } catch (e) {} }
            });
        };

        /* ---------- animations (guard exists — Bible T.7) ---------- */
        GameScene.prototype.buildAnims = function () {
            var mk = function (self, key, frames, rate, rep) {
                if (self.anims.exists(key)) return;
                self.anims.create({ key: key, frames: frames.map(function (k) { return { key: k }; }), frameRate: rate, repeat: rep == null ? -1 : rep });
            };
            mk(this, 'p_idle', ['t_groom_idle0', 't_groom_idle1'], 4);
            mk(this, 'p_run', ['t_groom_run0', 't_groom_run1', 't_groom_run2', 't_groom_run3'], 12);
            mk(this, 'pS_idle', ['t_groomS_idle0', 't_groomS_idle1'], 4);
            mk(this, 'pS_run', ['t_groomS_run0', 't_groomS_run1', 't_groomS_run2', 't_groomS_run3'], 12);
            mk(this, 'e_goomba', ['t_goomba_walk0', 't_goomba_walk1'], 6);
            mk(this, 'e_koopa', ['t_koopa_walk0', 't_koopa_walk1'], 6);
            mk(this, 'e_para', ['t_para_fly0', 't_para_fly1'], 8);
            mk(this, 'e_piranha', ['t_piranha_bob0', 't_piranha_bob1'], 4);
            mk(this, 'e_spiny', ['t_spiny_walk0', 't_spiny_walk1'], 6);
            mk(this, 'e_buzzy', ['t_buzzy_walk0', 't_buzzy_walk1'], 6);
            mk(this, 'e_lakitu', ['t_lakitu_hover'], 2);
            mk(this, 'boss_idle', ['t_boss_idle0', 't_boss_idle1'], 3);
            mk(this, 'o_coin', ['t_coin'], 8);
        };

        /* ---------- sprite-tuner registry ---------- */
        GameScene.prototype.regTune = function (obj, id) {
            if (!obj) return obj;
            obj.__tuneId = id; obj.__tuneBaseY = obj.y - (TUNE[id] || 0);
            this.tunables.push(obj);
            return obj;
        };
        GameScene.prototype.applyLiveTune = function (id, newVal) {
            TUNE[id] = newVal; saveTune();
            (this.tunables || []).forEach(function (o) {
                if (o && o.active && o.__tuneId === id) {
                    o.y = o.__tuneBaseY + newVal;
                    if (o.body && o.body.updateFromGameObject) o.body.updateFromGameObject();
                    else if (o.refreshBody) o.refreshBody();
                }
            });
        };

        /* =================================================================
           PLAYER — momentum + variable jump (Bible §4)
           ================================================================= */
        GameScene.prototype.makePlayer = function (x, y) {
            var pl = this.physics.add.sprite(x, y, 't_groom_idle0');
            pl.setOrigin(0.5, 1);
            pl.body.setSize(C.player.w, C.player.h).setOffset((26 - C.player.w) / 2, 0);
            pl.setCollideWorldBounds(false);
            pl.pstate = 'idle'; pl.facing = 1; pl.power = 'small';
            pl.coyote = 0; pl.jumpBuf = 0; pl.invulnMs = 0; pl.cheat = false;
            pl.starMs = 0; pl.proneNow = false; pl.castMs = 0; pl.respawnX = x;
            var self = this;
            pl.setCheat = function (on) { pl.cheat = on; };
            pl.resizeBody = function () {
                var big = pl.power !== 'small';
                var bh = big ? C.player.hSuper : C.player.h;
                var useH = pl.proneNow ? Math.round(bh * 0.6) : bh;
                pl.body.setSize(C.player.w, useH).setOffset((26 - C.player.w) / 2, (big ? 54 : 30) - useH);
            };
            return pl;
        };

        GameScene.prototype.setPower = function (tier) {
            var pl = this.player, prev = pl.power;
            pl.power = tier;
            pl.resizeBody();
            if (tier !== 'small' && prev === 'small') { this.freeze(6); this.flash(255, 255, 200); }
            this.updatePowerHud();
        };

        /* =================================================================
           WORLD BUILD (Bible APPENDIX F pipeline)
           ================================================================= */
        GameScene.prototype.showBriefing = function (idx) {
            var self = this;
            this.time.delayedCall(0, function () { self.scene.pause(); });
            $('rmw-briefing-title').textContent = 'DUNIA ' + (idx + 1) + ' — ' + (WORLD_NAMES[idx] || '');
            var pieces = infosForWorld(idx).filter(function (i) { return !unlocked[i.key]; });
            var txt = pieces.length
                ? 'Temukan ' + pieces.length + ' Kotak Cinta untuk membuka: ' + pieces.map(function (p) { return p.title; }).join(', ') + '.'
                : 'Lewati dunia ini & maju ke Kastil Terakhir.';
            if (idx === C.worlds - 1) txt = 'Kastil terakhir! Kalahkan Bowser "Raja Kesepian" & selamatkan mempelai.';
            $('rmw-briefing-text').textContent = txt;
            showOverlay('rmw-briefing');
        };

        GameScene.prototype.loadWorld = function (idx) {
            this.worldIdx = idx; runState.world = idx;
            this.buildWorld(idx);
            if (this.scene.isPaused()) this.scene.resume();
            try {
                window.requestAnimationFrame(function () {
                    window.requestAnimationFrame(function () { hideOverlays(); });
                });
            } catch (e) { hideOverlays(); }
        };

        /* ---- tile/block spawn helpers ---- */
        GameScene.prototype.addSolid = function (x, y, key, id) {
            var s = this.solids.create(x, y, key || 'ground_tile');
            s.setOrigin(0, 0); s.refreshBody();
            if (id) this.regTune(s, id);
            return s;
        };
        // ground tile column: place a tile at grid (world col cx, row from GROUND_Y)
        GameScene.prototype.groundTile = function (px, py, texKey) {
            var s = this.solids.create(px + T / 2, py + T / 2, texKey);
            s.setDepth(-2); s.refreshBody();
            return s;
        };
        GameScene.prototype.hardBlock = function (px, py) {
            var s = this.solids.create(px + T / 2, py + T / 2, 't_hard'); s.refreshBody(); return s;
        };
        GameScene.prototype.pipe = function (px, floorY, h) {
            // pipe = solid; height h in px (multiple of T). draw stacked pipe texture (48 wide)
            var img = this.add.image(px, floorY, 't_pipe').setOrigin(0, 1);
            img.displayHeight = h; img.setDepth(-1);
            this.regTune(img, 'pipe');
            // solid static body spanning the pipe (centered at px+24, mid-height)
            var s = this.solids.create(px + 24, floorY - h / 2, 't_pipe');
            s.setVisible(false); s.setOrigin(0.5, 0.5);
            s.body.setSize(44, h);
            s.body.position.set(px + 2, floorY - h);
            s.body.updateCenter && s.body.updateCenter();
            return { img: img, floorY: floorY, x: px };
        };
        GameScene.prototype.oneway = function (px, py, wtiles) {
            var w = (wtiles || 3) * T;
            var texKey = this.worldIdx === 3 ? 't_plat_cloud' : 't_plat';
            var img = this.add.tileSprite(px, py, w, 18, texKey).setOrigin(0, 0.5);
            img.setDepth(-1); this.regTune(img, 'plat');
            var s = this.oneways.create(px + w / 2, py, texKey);
            s.setVisible(false); s.setOrigin(0.5, 0.5);
            s.body.setSize(w, 12);
            s.body.position.set(px, py - 6);
            s.body.updateCenter && s.body.updateCenter();
            return s;
        };

        // ?-block / brick / lovebox — head-bump interactive (in this.blocks)
        GameScene.prototype.qBlock = function (px, py, contents) {
            var b = this.blocks.create(px + T / 2, py + T / 2, 't_qblock');
            b.refreshBody(); b.kind = 'q'; b.used = false; b.contents = contents || 'coin';
            this.regTune(b, 'qblock');
            this.tweens.add({ targets: b, y: b.y - 1, duration: 500, yoyo: true, repeat: -1, ease: 'Sine' });
            return b;
        };
        GameScene.prototype.brick = function (px, py, contents) {
            var b = this.blocks.create(px + T / 2, py + T / 2, 't_brick');
            b.refreshBody(); b.kind = 'brick'; b.contents = contents || null; b.hits = contents === 'coins10' ? 10 : 0;
            this.regTune(b, 'brick');
            return b;
        };
        GameScene.prototype.loveBox = function (px, py, key) {
            var b = this.blocks.create(px + T / 2, py + T / 2, 't_lovebox');
            b.refreshBody(); b.kind = 'love'; b.pieceKey = key; b.opened = false;
            this.regTune(b, 'lovebox');
            this.tweens.add({ targets: b, scaleX: 1.06, scaleY: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine' });
            return b;
        };

        /* ---- world backdrop (sky gradient + parallax + props) ---- */
        GameScene.prototype.buildBackdrop = function (idx) {
            var bio = BIOME[idx];
            // sky gradient rect (scrollFactor 0)
            if (this.skyRect) this.skyRect.destroy();
            var g = this.add.graphics().setScrollFactor(0).setDepth(-40);
            g.fillGradientStyle(bio.skyTop, bio.skyTop, bio.skyBot, bio.skyBot, 1);
            g.fillRect(0, 0, BW, BH);
            this.skyRect = g;
            this.cameras.main.setBackgroundColor(bio.skyBot);

            this.parallax.clear(true, true);
            var len = this.worldW;
            // clouds (0.1) — everywhere
            for (var cx = 0; cx < len; cx += 360 + Math.random() * 220) {
                var cl = this.add.image(cx, 60 + Math.random() * 120, 't_cloud').setScrollFactor(0.1).setDepth(-38).setAlpha(0.9);
                this.parallax.add(cl); this.regTune(cl, 'cloud');
                this.tweens.add({ targets: cl, x: cl.x + 40, duration: 8000 + Math.random() * 4000, yoyo: true, repeat: -1, ease: 'Sine' });
            }
            // far hills (0.2)
            if (bio.hill) {
                for (var hx = 0; hx < len; hx += 480 + Math.random() * 200) {
                    var hl = this.add.image(hx, GROUND_Y + 8, bio.hill).setOrigin(0.5, 1).setScrollFactor(0.2).setDepth(-36);
                    this.parallax.add(hl); this.regTune(hl, 'hill');
                }
            }
            // mid landmark trees / stalactites / torches (0.45)
            if (bio.tree) {
                for (var tx = 220; tx < len - 200; tx += 400 + Math.random() * 240) {
                    var origin = (bio.tree === 't_stalactite') ? [0.5, 0] : [0.5, 1];
                    var ty = (bio.tree === 't_stalactite') ? 40 : GROUND_Y + 6;
                    var tr = this.add.image(tx, ty, bio.tree).setOrigin(origin[0], origin[1]).setScrollFactor(0.45).setDepth(-30);
                    this.parallax.add(tr);
                }
            }
            // castle landmark for world 6
            if (idx === C.worlds - 1) {
                var cst = this.add.image(len - 300, GROUND_Y + 8, 't_castle').setOrigin(0.5, 1).setScrollFactor(0.45).setDepth(-30);
                this.parallax.add(cst);
            }
            // near bushes (0.7)
            if (bio.bush) {
                for (var bx = 120; bx < len - 100; bx += 240 + Math.random() * 160) {
                    var bu = this.add.image(bx, GROUND_Y + 4, bio.bush).setOrigin(0.5, 1).setScrollFactor(0.7).setDepth(-3).setScale(0.7 + Math.random() * 0.4);
                    this.parallax.add(bu); this.regTune(bu, 'bush');
                }
            }
            // ambient snow for ice world
            if (idx === 4) {
                this.snowEm = this.add.particles(0, 0, 't_spark', {
                    x: { min: 0, max: BW }, y: -10, lifespan: 4000, speedY: { min: 30, max: 70 },
                    speedX: { min: -20, max: 20 }, scale: { start: 0.5, end: 0.2 }, quantity: 1, frequency: 200, scrollFactor: 0
                });
                this.snowEm.setScrollFactor(0).setDepth(-20);
                this.parallax.add(this.snowEm);
            } else if (this.snowEm) { try { this.snowEm.destroy(); } catch (e) {} this.snowEm = null; }
        };

        /* =================================================================
           LEVEL GENERATION (Bible APPENDIX F) — spine + patterns + entities +
           pieces. Deterministic-ish; density floors respected via pattern loop.
           ================================================================= */
        GameScene.prototype.buildWorld = function (idx) {
            var self = this;
            var bio = BIOME[idx];
            var isBoss = (idx === C.worlds - 1);

            // clear previous
            this.solids.clear(true, true); this.blocks.clear(true, true); this.oneways.clear(true, true);
            this.enemies.clear(true, true); this.shells.clear(true, true);
            this.coinsG.clear(true, true); this.powerups.clear(true, true);
            this.fireballs.clear(true, true); this.ebullets.clear(true, true);
            this.hazards.clear(true, true); this.decor.clear(true, true);
            if (this.boss) { try { this.boss.destroy(); } catch (e) {} this.boss = null; }
            if (this.cage) { try { this.cage.destroy(); } catch (e) {} this.cage = null; }
            if (this.bride) { try { this.bride.destroy(); } catch (e) {} this.bride = null; }
            if (this.flagObj) { try { this.flagObj.destroy(); } catch (e) {} this.flagObj = null; }
            this.tunables = [];
            this.arenaX = null; this.bossActive = false; this.bossDead = false;
            this.clearSeq = null; this.pits = [];

            // length (Bible §3.1): worlds 1-5 = 190-260 tiles; boss = 90-120 tiles corridor
            var lenTiles = isBoss ? 100 : (190 + idx * 14);
            var len = lenTiles * T;
            this.worldW = len;
            this.groundTex = bio.ground;
            this.physics.world.setBounds(0, 0, len, BH + 200);
            this.cameras.main.setBounds(0, 0, len, BH);

            this.buildBackdrop(idx);

            // spawnList for camera-relative enemies (Bible §5.3)
            this.spawnList = [];
            this._nextSpawn = 0;

            // pieces to place this world (deterministic slice)
            this.worldPieces = infosForWorld(idx).filter(function (i) { return !unlocked[i.key]; });

            if (isBoss) { this.buildBossWorld(len); }
            else { this.buildPlatformWorld(idx, len, lenTiles); }

            // reset player
            this.player.setPosition(120, GROUND_Y - 60);
            this.player.body.setVelocity(0, 0);
            this.player.respawnX = 120;
            this.player.invulnMs = 800;
            this.checkpointX = 120;

            this.cameras.main.centerOn(120, GROUND_Y);
            this.syncHud();
        };

        /* ---- normal platform world (Bible APPENDIX A pattern library) ---- */
        GameScene.prototype.buildPlatformWorld = function (idx, len, lenTiles) {
            var self = this, bio = BIOME[idx];
            var gy = GROUND_Y;
            var diff = this.diff;

            // 1) build ground spine with pits. Track solid columns.
            // Represent ground as contiguous fill with occasional gaps (pits).
            var col = 0;
            var startSafe = 6;   // safe zone tiles
            var pits = [];
            // decide pit positions (skip start safe + last 8 tiles)
            var pitChance = idx >= 2 ? 0.05 : 0.03;
            var forbidPit = {};
            // fill ground; small pit clusters
            var x = 0;
            while (col < lenTiles) {
                var isPit = false;
                if (col > startSafe && col < lenTiles - 10) {
                    if (Math.random() < pitChance) {
                        var pw = 3 + Math.floor(Math.random() * (idx >= 3 ? 4 : 2)); // pit width (<= D_max)
                        pits.push({ from: col, to: col + pw });
                        col += pw; continue;
                    }
                }
                // ground tile (2 rows deep for depth)
                this.groundTile(col * T, gy, bio.ground);
                this.groundTile(col * T, gy + T, bio.ground);
                col++;
            }
            this.pits = pits;
            // dirt fill below (visual)
            var fill = this.add.graphics().setDepth(-4);
            var fillCol = idx === 1 ? 0x003868 : idx === 3 ? 0x88a0c0 : idx === 4 ? 0x405878 : idx === 5 ? 0x383838 : 0x8a3006;
            fill.fillStyle(fillCol, 1);
            fill.fillRect(0, gy + 2 * T, len, (BH + 120) - (gy + 2 * T));
            this.decor.add(fill);
            // lava/water at bottom of pits for beach/castle
            if (idx === 5) {
                pits.forEach(function (p) {
                    var lw = (p.to - p.from) * T;
                    var lv = self.add.tileSprite(p.from * T, gy + T, lw, 20, 't_lava').setOrigin(0, 0).setDepth(-2);
                    self.decor.add(lv);
                });
            }

            // 2) elevation + patterns across the stage (every ~7 tiles a feature)
            var seg = startSafe;
            var lastKind = '';
            var powerPlaced = false;
            var enemyTypes = bio.pool;
            // first love-box (hero piece) in world 1 early zone (Bible T004)
            var pieceQueue = this.worldPieces.slice();
            // place first piece early for world 0
            if (idx === 0 && pieceQueue.length) {
                this.placeLoveBoxAt((startSafe + 4) * T, gy - 4 * T, pieceQueue.shift().key);
            }

            while (seg < lenTiles - 12) {
                var featTiles = 5 + Math.floor(Math.random() * 4);
                var pattern = this.pickPattern(idx, seg, lastKind);
                this.emitPattern(pattern, seg, gy, idx, enemyTypes);
                lastKind = pattern;

                // periodically place a love-box piece (spread, not stacked)
                if (pieceQueue.length && seg > startSafe + 20 && Math.random() < 0.35) {
                    var elevated = Math.random() < 0.6;
                    var py = elevated ? gy - (4 + Math.floor(Math.random() * 2)) * T : gy - 4 * T;
                    this.placeLoveBoxAt((seg + 2) * T, py, pieceQueue.shift().key);
                    if (elevated) this.oneway((seg + 1) * T, py + T + 10, 3);
                }

                // power-up (usage window: before mid) — mushroom in world early, flower later
                if (!powerPlaced && seg > startSafe + 8 && seg < lenTiles * 0.4) {
                    this.qBlock((seg + 1) * T, gy - 4 * T, this.player.power === 'small' ? 'mushroom' : 'flower');
                    powerPlaced = true;
                }
                // star before a gauntlet occasionally
                if (idx >= 3 && Math.random() < 0.12 && seg < lenTiles - 30) {
                    this.qBlock((seg + 3) * T, gy - 4 * T, 'star');
                }

                seg += featTiles;
            }

            // any leftover pieces → place before goal
            var gp = lenTiles - 16;
            while (pieceQueue.length) {
                this.placeLoveBoxAt(gp * T, gy - 4 * T, pieceQueue.shift().key);
                gp -= 3;
            }

            // 3) enemies via spawnList (camera-relative). ensure density floor.
            this.buildSpawnList(idx, lenTiles, gy, enemyTypes, diff);

            // 4) coin trails filling gaps + over pits (Bible C002/C003)
            this.buildCoinTrails(idx, lenTiles, gy, pits);

            // 5) goal: staircase + flagpole (Bible X002)
            this.buildGoal(lenTiles, gy);

            this.syncHud();
        };

        /* pick a pattern id per priority (Bible APPENDIX A formula), avoid >2 same */
        GameScene.prototype.pickPattern = function (idx, seg, lastKind) {
            var r = Math.random();
            var kinds;
            if (idx === 0) kinds = ['coin', 'blocks', 'pipe', 'enemy', 'stairs', 'coin', 'blocks'];
            else if (idx === 1) kinds = ['blocks', 'pipe', 'enemy', 'coin', 'gap', 'blocks'];
            else if (idx === 3) kinds = ['plat', 'plat', 'enemy', 'gap', 'coin', 'blocks'];
            else kinds = ['enemy', 'blocks', 'gap', 'coin', 'pipe', 'plat', 'stairs'];
            var k = kinds[Math.floor(Math.random() * kinds.length)];
            if (k === lastKind && Math.random() < 0.6) k = kinds[(kinds.indexOf(k) + 1) % kinds.length];
            return k;
        };

        /* emit a pattern's blocks/pipes/platforms (enemies handled by spawnList) */
        GameScene.prototype.emitPattern = function (kind, seg, gy, idx, pool) {
            var x = seg * T;
            if (kind === 'blocks') {
                // row of ? + brick
                var n = 3 + Math.floor(Math.random() * 2);
                for (var i = 0; i < n; i++) {
                    var bx = (seg + i) * T;
                    if (i === 1) this.qBlock(bx, gy - 4 * T, Math.random() < 0.3 ? 'coin' : 'coin');
                    else this.brick(bx, gy - 4 * T, Math.random() < 0.2 ? 'coins10' : null);
                }
            } else if (kind === 'pipe') {
                var ph = (2 + Math.floor(Math.random() * 2)) * T;
                var pobj = this.pipe(x, gy, ph);
                // chance of piranha (added to spawnList as pipe hazard)
                if (Math.random() < 0.6) this.spawnList.push({ x: x - 40, type: 'piranha', y: gy - ph, pipeTop: gy - ph });
            } else if (kind === 'stairs') {
                var h = 3 + Math.floor(Math.random() * 3);
                for (var s = 0; s < h; s++) {
                    for (var yy = 0; yy <= s; yy++) this.hardBlock((seg + s) * T, gy - (yy + 1) * T);
                }
            } else if (kind === 'plat') {
                // elevated one-way platforms
                var py = gy - (3 + Math.floor(Math.random() * 2)) * T;
                this.oneway(x, py, 3);
                if (Math.random() < 0.5) this.oneway(x + 5 * T, py - T, 3);
            } else if (kind === 'coin') {
                // handled in buildCoinTrails, but add a small arc + a floating brick
                if (Math.random() < 0.4) this.brick((seg + 1) * T, gy - 4 * T, null);
            } else if (kind === 'gap') {
                // gaps come from spine pits; add coin arc marker + a platform in middle for hard
                if (idx >= 3) this.oneway((seg + 1) * T, gy - 2 * T, 2);
            } else if (kind === 'enemy') {
                // enemies via spawnList (buildSpawnList handles density); optional block above
                if (Math.random() < 0.3) this.qBlock((seg + 1) * T, gy - 5 * T, 'coin');
            }
        };

        GameScene.prototype.placeLoveBoxAt = function (px, py, key) {
            this.loveBox(px, py, key);
        };

        /* ---- spawnList: camera-relative enemy records (Bible §5.3) ---- */
        GameScene.prototype.buildSpawnList = function (idx, lenTiles, gy, pool, diff) {
            var self = this;
            // target density: >= minEnemies per screen. screen ~= 17 tiles.
            var screens = Math.ceil((lenTiles * T) / BW);
            var minPer = diff.minEnemies;
            var startSafeTiles = 8;
            // land-based pool (exclude piranha which is pipe-based, added in emitPattern)
            var landPool = pool.filter(function (p) { return p !== 'piranha'; });
            for (var s = 0; s < screens; s++) {
                var screenStartTile = Math.max(startSafeTiles, Math.floor(s * BW / T));
                var screenEndTile = Math.min(lenTiles - 12, Math.floor((s + 1) * BW / T));
                if (screenEndTile <= screenStartTile) continue;
                var count = minPer + (Math.random() < 0.4 ? 1 : 0);
                // <=2 types per wave
                var typeA = landPool[Math.floor(Math.random() * landPool.length)];
                var typeB = landPool[Math.floor(Math.random() * landPool.length)];
                for (var e = 0; e < count; e++) {
                    var t = Math.floor(screenStartTile + Math.random() * (screenEndTile - screenStartTile));
                    if (this.inPit(t)) t = this.nearestSolidTile(t, lenTiles);
                    var type = e % 2 === 0 ? typeA : typeB;
                    var y = gy - 40;
                    // lakitu hovers high
                    if (type === 'lakitu') y = gy - 220;
                    this.spawnList.push({ x: t * T, type: type, y: y });
                }
            }
            // sort by trigger x ascending
            this.spawnList.sort(function (a, b) { return a.x - b.x; });
        };
        GameScene.prototype.inPit = function (tile) {
            for (var i = 0; i < this.pits.length; i++) { if (tile >= this.pits[i].from && tile < this.pits[i].to) return true; }
            return false;
        };
        GameScene.prototype.nearestSolidTile = function (tile, lenTiles) {
            for (var d = 1; d < 8; d++) {
                if (!this.inPit(tile + d) && tile + d < lenTiles - 12) return tile + d;
                if (!this.inPit(tile - d) && tile - d > 8) return tile - d;
            }
            return tile;
        };

        /* ---- coin trails filling gaps + over pits ---- */
        GameScene.prototype.buildCoinTrails = function (idx, lenTiles, gy, pits) {
            var self = this;
            // arcs over pits (no blind jump)
            pits.forEach(function (p) {
                var mid = (p.from + p.to) / 2;
                var w = p.to - p.from;
                for (var i = 0; i <= w; i++) {
                    var t = p.from + i;
                    var arc = Math.sin((i / w) * Math.PI) * 2.5;
                    self.spawnCoin(t * T + T / 2, gy - (2 + arc) * T);
                }
            });
            // scattered coin clusters to keep reward cadence
            for (var s = 10; s < lenTiles - 14; s += 12 + Math.floor(Math.random() * 8)) {
                if (this.inPit(s)) continue;
                for (var c = 0; c < 3; c++) this.spawnCoin((s + c) * T + T / 2, gy - 3 * T);
            }
        };
        GameScene.prototype.spawnCoin = function (x, y) {
            var c = this.coinsG.create(x, y, 't_coin');
            c.play('o_coin'); c.setDepth(1); this.regTune(c, 'coin');
            this.tweens.add({ targets: c, y: y - 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine' });
            return c;
        };

        /* ---- goal: staircase + flagpole ---- */
        GameScene.prototype.buildGoal = function (lenTiles, gy) {
            var base = lenTiles - 12;
            var h = 6;
            for (var s = 0; s < h; s++) {
                for (var yy = 0; yy <= s; yy++) this.hardBlock((base + s) * T, gy - (yy + 1) * T);
            }
            // flagpole
            var fx = (base + h + 2) * T;
            var flag = this.add.image(fx, gy, 't_flag').setOrigin(0.5, 1).setDepth(1);
            this.regTune(flag, 'flag');
            this.flagObj = flag; this.flagX = fx;
            // flag base block
            this.hardBlock(fx - T / 2, gy - T);
        };

        /* =================================================================
           ENEMY SPAWN (camera-relative) + AI (Bible §5)
           ================================================================= */
        GameScene.prototype.processSpawns = function () {
            var cam = this.cameras.main, edge = cam.scrollX + BW + 20;
            while (this._nextSpawn < this.spawnList.length && edge >= this.spawnList[this._nextSpawn].x) {
                var r = this.spawnList[this._nextSpawn++];
                var sx = r.type === 'piranha' ? r.x : Math.max(r.x, cam.scrollX + BW);
                this.spawnEnemy(r.type, sx, r.y, r);
            }
        };
        GameScene.prototype.spawnEnemy = function (type, x, y, rec) {
            var e = this.enemies.create(x, y, 't_goomba_walk0');
            e.setOrigin(0.5, 1);
            e.etype = type; e.dead = false; e.stompable = true; e.hp = 1;
            var spd = 60 * this.diff.espeed;
            if (type === 'goomba') {
                e.setTexture('t_goomba_walk0'); e.body.setSize(24, 20).setOffset(2, 4);
                e.play('e_goomba'); e.dir = -1; e.setVelocityX(-spd); e.speed = spd;
                this.regTune(e, 'goomba');
            } else if (type === 'koopa') {
                e.setTexture('t_koopa_walk0'); e.body.setSize(24, 34).setOffset(2, 6);
                e.play('e_koopa'); e.dir = -1; e.setVelocityX(-spd); e.speed = spd; e.ledgeStop = true;
                e.hp = 1; e.becomesShell = true;
                this.regTune(e, 'koopa');
            } else if (type === 'paratroopa') {
                e.setTexture('t_para_fly0'); e.body.setSize(24, 34).setOffset(4, 4);
                e.play('e_para'); e.body.setAllowGravity(false); e.baseY = y; e.hopT = 0; e.dir = -1;
                e.speed = spd; e.stompable = true; e.becomesKoopa = true;
                this.regTune(e, 'paratroopa');
            } else if (type === 'piranha') {
                e.setTexture('t_piranha_bob0'); e.body.setSize(24, 34).setOffset(2, 4);
                e.play('e_piranha'); e.body.setAllowGravity(false); e.body.setImmovable(true);
                e.stompable = false; e.hp = Infinity; e.pipeTop = rec.pipeTop || y;
                e.baseY = e.pipeTop; e.upY = e.pipeTop - 40; e.downY = e.pipeTop + 40; e.bobT = Math.random() * 2000;
                e.y = e.downY; e.setOrigin(0.5, 1);
                this.regTune(e, 'piranha');
            } else if (type === 'spiny') {
                e.setTexture('t_spiny_walk0'); e.body.setSize(24, 22).setOffset(2, 4);
                e.play('e_spiny'); e.dir = -1; e.setVelocityX(-spd); e.speed = spd; e.stompable = false;
                this.regTune(e, 'spiny');
            } else if (type === 'buzzy') {
                e.setTexture('t_buzzy_walk0'); e.body.setSize(24, 18).setOffset(2, 6);
                e.play('e_buzzy'); e.dir = -1; e.setVelocityX(-spd); e.speed = spd; e.fireproof = true; e.becomesShell = true;
                this.regTune(e, 'buzzy');
            } else if (type === 'lakitu') {
                e.setTexture('t_lakitu_hover'); e.body.setSize(18, 24).setOffset(8, 8);
                e.play('e_lakitu'); e.body.setAllowGravity(false); e.hp = 2; e.stompable = true;
                e.throwT = 2500; e.hoverY = y;
                this.regTune(e, 'lakitu');
            } else if (type === 'hammer') {
                e.setTexture('t_hammer_idle'); e.body.setSize(22, 40).setOffset(4, 4);
                e.hp = 2; e.dir = -1; e.hopT = 0; e.throwT = 1200; e.stompable = true;
                this.regTune(e, 'hammer');
            }
            e.setDepth(2);
            return e;
        };

        /* per-enemy AI (called each frame for active enemies) */
        GameScene.prototype.updateEnemy = function (e, dt) {
            if (!e.active || e.dead) return;
            var cam = this.cameras.main;
            // despawn off left
            if (e.x < cam.scrollX - 80) { e.destroy(); return; }
            var t = e.etype;
            if (t === 'goomba' || t === 'koopa' || t === 'spiny' || t === 'buzzy') {
                // patrol: flip at wall; koopa/buzzy stop at ledge
                if (e.body.blocked.left) { e.dir = 1; e.setVelocityX(e.speed); e.setFlipX(true); }
                else if (e.body.blocked.right) { e.dir = -1; e.setVelocityX(-e.speed); e.setFlipX(false); }
                else if (e.body.velocity.x === 0) { e.setVelocityX(e.dir * e.speed); }
                // ledge detection for koopa
                if (e.ledgeStop && e.body.blocked.down) {
                    var aheadX = e.x + e.dir * 18;
                    if (!this.hasGroundBelow(aheadX, e.y + 6)) { e.dir *= -1; e.setVelocityX(e.dir * e.speed); e.setFlipX(e.dir > 0); }
                }
            } else if (t === 'paratroopa') {
                e.hopT += dt;
                e.x += e.dir * e.speed * 0.5 * dt / 1000;
                e.y = e.baseY + Math.sin(e.hopT / 300) * 40;
                if (e.x < cam.scrollX - 60) e.destroy();
            } else if (t === 'piranha') {
                e.bobT += dt;
                var phase = (e.bobT % 2000) / 2000;
                var pdist = Phaser.Math.Distance.Between(this.player.x, 0, e.x, 0);
                var hide = pdist < 64;   // stay down when player near mouth
                var target = hide ? e.downY : (phase < 0.5 ? e.upY : e.downY);
                e.y += (target - e.y) * 0.12;
            } else if (t === 'lakitu') {
                e.x += (this.player.x - e.x) * 0.02;
                e.y = e.hoverY;
                e.throwT -= dt;
                if (e.throwT <= 0) {
                    e.throwT = 2500;
                    e.setTexture('t_lakitu_throw');
                    this.time.delayedCall(300, function () { if (e.active) e.setTexture('t_lakitu_hover'); });
                    // drop a spiny at player x
                    var sp = this.spawnEnemy('spiny', e.x, e.y + 20);
                    sp.setVelocityY(60);
                }
            } else if (t === 'hammer') {
                e.hopT += dt;
                if (e.body.blocked.down && (e.hopT % 1400) < 20) e.setVelocityY(-300);
                // face player
                e.dir = this.player.x < e.x ? -1 : 1; e.setFlipX(e.dir > 0);
                e.throwT -= dt;
                if (e.throwT <= 0) {
                    e.throwT = 1400;
                    e.setTexture('t_hammer_throw');
                    this.time.delayedCall(200, (function (en) { return function () { if (en.active) en.setTexture('t_hammer_idle'); }; })(e));
                    this.throwHammer(e);
                }
            }
        };
        GameScene.prototype.hasGroundBelow = function (x, y) {
            var found = false;
            this.solids.children.iterate(function (s) {
                if (!s || !s.body) return;
                if (x >= s.body.left && x <= s.body.right && y <= s.body.top + 4 && y >= s.body.top - 40) found = true;
            });
            return found;
        };
        GameScene.prototype.throwHammer = function (e) {
            var h = this.ebullets.create(e.x, e.y - 30, 't_hammer_proj');
            if (!h) return;
            h.body.setAllowGravity(true); h.setVelocity(e.dir * 160, -320); h.etype = 'hammer'; h.setDepth(3);
            h.setAngularVelocity(400);
            this.time.delayedCall(3000, function () { if (h.active) h.destroy(); });
        };

        /* =================================================================
           COLLISION HANDLERS (Bible §6 matrix)
           ================================================================= */
        // head-bump on ? / brick / lovebox from below
        GameScene.prototype.onBlockHit = function (player, block) {
            // only trigger on an upward bump (head touches block bottom)
            if (!(player.body.blocked.up || (player.body.velocity.y < 0 && player.body.top <= block.body.bottom + 8))) return;
            if (player.body.top > block.body.bottom + 10) return;
            if (block.kind === 'love') { this.bumpLoveBox(block); return; }
            if (block.kind === 'q') { this.bumpQBlock(block); return; }
            if (block.kind === 'brick') { this.bumpBrick(block, player); return; }
        };
        GameScene.prototype.bumpBlockAnim = function (block) {
            this.tweens.add({ targets: block, y: block.y - 8, duration: 80, yoyo: true, ease: 'Quad' });
            SFX.bump();
        };
        GameScene.prototype.bumpQBlock = function (block) {
            if (block.used) { SFX.bump(); return; }
            block.used = true; block.setTexture('t_qblock_used');
            this.bumpBlockAnim(block);
            var above = { x: block.x, y: block.body.top - 8 };
            if (block.contents === 'mushroom') { this.spawnPowerup('mushroom', above.x, above.y); }
            else if (block.contents === 'flower') { this.spawnPowerup(this.player.power === 'small' ? 'mushroom' : 'flower', above.x, above.y); }
            else if (block.contents === 'star') { this.spawnPowerup('star', above.x, above.y); }
            else { this.popCoin(above.x, above.y); this.addCoins(1); }
        };
        GameScene.prototype.bumpBrick = function (block, player) {
            if (block.hits > 0) {
                // 10-coin brick
                block.hits--; this.bumpBlockAnim(block);
                this.popCoin(block.x, block.body.top - 8); this.addCoins(1);
                if (block.hits === 0) block.setTexture('t_qblock_used');
                return;
            }
            if (player.power !== 'small') {
                // shatter
                SFX.brick(); this.brickParticles(block.x, block.y); this.addScore(50);
                block.destroy();
            } else { this.bumpBlockAnim(block); }
        };
        GameScene.prototype.bumpLoveBox = function (block) {
            if (block.opened) { SFX.bump(); return; }
            block.opened = true; block.setTexture('t_lovebox_open');
            this.bumpBlockAnim(block);
            this.freeze(5); this.flash(255, 220, 120);
            // heart pops out
            var h = this.add.image(block.x, block.body.top - 4, 't_pieceheart').setDepth(6);
            this.tweens.add({ targets: h, y: h.y - 40, alpha: 0, scale: 1.6, duration: 700, ease: 'Quad', onComplete: function () { h.destroy(); } });
            this.pieceBurst(block.x, block.body.top);
            SFX.piece();
            unlockInfo(block.pieceKey);
            this.addScore(200);
        };

        // player vs enemy: stomp (top) = kill; else hurt
        GameScene.prototype.onPlayerEnemy = function (player, e) {
            if (e.dead || !e.active) return;
            if (player.invulnMs > 0 && !player.cheat) { /* still can stomp */ }
            var stomp = player.body.velocity.y > 0 && player.body.bottom <= e.body.top + 12;
            if (player.cheat || player.starMs > 0) { this.killEnemy(e, 'star'); this.bounce(player); return; }
            if (stomp && e.stompable) { this.stompEnemy(e); this.bounce(player); return; }
            if (stomp && !e.stompable) { this.hurtPlayer(player); return; }   // spiny/spike stomp = hurt
            // side/below contact
            this.hurtPlayer(player);
        };
        GameScene.prototype.bounce = function (player) { player.body.setVelocityY(-360); };
        GameScene.prototype.stompEnemy = function (e) {
            SFX.stomp(); this.freeze(4); this.addScore(100);
            if (e.etype === 'koopa' || e.etype === 'buzzy') { this.toShell(e); return; }
            if (e.etype === 'paratroopa') { this.paraToKoopa(e); return; }
            if (e.etype === 'lakitu') { e.hp--; if (e.hp <= 0) this.killEnemy(e, 'stomp'); else e.setTint(0xff8080); return; }
            // goomba squash
            e.dead = true; e.setVelocity(0, 0); e.body.enable = false;
            e.setTexture('t_goomba_squash'); e.setOrigin(0.5, 1);
            var self = this;
            this.time.delayedCall(400, function () { if (e.active) e.destroy(); });
        };
        GameScene.prototype.toShell = function (e) {
            e.etype = 'shell'; e.stompable = true; e.dead = false;
            var shellTex = e.__tuneId === 'buzzy' ? 't_buzzy_shell' : 't_koopa_shell';
            // move to shells group
            this.enemies.remove(e);
            this.shells.add(e);
            e.setTexture(shellTex); e.body.setSize(24, 16).setOffset(2, 2);
            e.setVelocityX(0); e.shellState = 'idle'; e.reviveT = 5000;
        };
        GameScene.prototype.paraToKoopa = function (e) {
            e.etype = 'koopa'; e.body.setAllowGravity(true); e.setTexture('t_koopa_walk0');
            e.play('e_koopa'); e.body.setSize(24, 34).setOffset(2, 6); e.dir = -1; e.setVelocityX(-e.speed);
            e.becomesShell = true; e.ledgeStop = true; e.__tuneId = 'koopa';
        };
        GameScene.prototype.killEnemy = function (e, cause) {
            if (e.dead) return; e.dead = true;
            e.setVelocity((Math.random() - 0.5) * 100, -300); e.body.enable = false;
            e.setAngle(180); e.setDepth(5);
            this.addScore(cause === 'star' ? 200 : 100);
            var self = this;
            this.tweens.add({ targets: e, alpha: 0, y: e.y + 200, duration: 900, onComplete: function () { if (e.active) e.destroy(); } });
        };

        // shell interactions
        GameScene.prototype.onPlayerShell = function (player, sh) {
            if (!sh.active) return;
            if (sh.shellState === 'idle') {
                // kick it
                var dir = player.x < sh.x ? 1 : -1;
                sh.shellState = 'slide'; sh.setVelocityX(dir * 420); SFX.stomp();
            } else if (sh.shellState === 'slide') {
                // stomp to stop, or get hurt if hit from side
                var stomp = player.body.velocity.y > 0 && player.body.bottom <= sh.body.top + 12;
                if (stomp) { sh.shellState = 'idle'; sh.setVelocityX(0); this.bounce(player); }
                else if (!player.cheat && player.starMs <= 0) this.hurtPlayer(player);
            }
        };
        GameScene.prototype.onShellEnemy = function (sh, e) {
            if (sh.shellState !== 'slide' || e.dead || !e.active) return;
            this.killEnemy(e, 'shell');
        };
        GameScene.prototype.updateShell = function (sh, dt) {
            if (!sh.active) return;
            var cam = this.cameras.main;
            if (sh.x < cam.scrollX - 80 || sh.x > cam.scrollX + BW + 200) { if (sh.shellState === 'slide') sh.destroy(); }
            if (sh.shellState === 'slide') {
                if (sh.body.blocked.left) sh.setVelocityX(420);
                else if (sh.body.blocked.right) sh.setVelocityX(-420);
            } else if (sh.shellState === 'idle') {
                sh.reviveT -= dt;
                if (sh.reviveT <= 0 && sh.etype === 'shell') {
                    // revive to koopa
                    this.shells.remove(sh); this.enemies.add(sh);
                    sh.etype = 'koopa'; sh.setTexture('t_koopa_walk0'); sh.play('e_koopa');
                    sh.body.setSize(24, 34).setOffset(2, 6); sh.dir = -1; sh.setVelocityX(-(sh.speed || 60)); sh.ledgeStop = true;
                }
            }
        };

        // fireball vs enemy (overlap-first). processCallback: skip fireproof? still consume.
        GameScene.prototype.onFireballEnemy = function (fb, e) {
            if (!fb.active || e.dead || !e.active) return;
            if (e.fireproof) { this.killFireball(fb); return; }   // buzzy tanks fire but fireball dies
            if (e.etype === 'piranha') { this.killEnemy(e, 'fire'); this.killFireball(fb); return; }
            this.killEnemy(e, 'fire'); this.killFireball(fb);
        };
        GameScene.prototype.onFireballGround = function (fb, g) {
            // bounce on ground, die on wall
            if (fb.body.blocked.down) { fb.setVelocityY(-300); }
            else { this.killFireball(fb); }
        };
        GameScene.prototype.killFireball = function (fb) {
            if (!fb.active) return;
            this.sparkBurst(fb.x, fb.y, 0xff8000);
            fb.destroy();
        };

        // player vs enemy bullet (hammer / boss fire)
        GameScene.prototype.onPlayerEBullet = function (player, b) {
            if (!b.active) return;
            b.destroy();
            if (!player.cheat && player.starMs <= 0) this.hurtPlayer(player);
        };

        // coins & powerups
        GameScene.prototype.onCoin = function (player, c) {
            if (!c.active) return; c.destroy(); this.addCoins(1); SFX.coin(); this.addScore(50);
        };
        GameScene.prototype.onPowerup = function (player, p) {
            if (!p.active) return;
            var k = p.ptype; p.destroy();
            SFX.power();
            if (k === 'mushroom') { if (this.player.power === 'small') this.setPower('super'); this.addScore(1000); toast('🍄 Super!'); }
            else if (k === 'flower') { this.setPower('fire'); this.addScore(1000); toast('🌸 Bunga Cinta — lempar hati-api!'); }
            else if (k === 'star') { this.player.starMs = 9000; this.addScore(1000); toast('⭐ Kebal!'); }
        };

        /* =================================================================
           PLAYER ACTIONS — fire, hurt, respawn (Bible §4/§8)
           ================================================================= */
        GameScene.prototype.fireBall = function () {
            if (this.player.power !== 'fire') return;
            if (this.fireballs.countActive(true) >= 2) return;
            var fb = this.fireballs.get(this.player.x + this.player.facing * 14, this.player.y - (this.player.power === 'small' ? 16 : 32), 't_fireball');
            if (!fb) return;
            fb.setActive(true).setVisible(true); fb.body.reset(this.player.x + this.player.facing * 14, this.player.y - (this.player.power === 'small' ? 16 : 32));
            fb.body.setAllowGravity(true); fb.setVelocity(this.player.facing * 360, 120); fb.setDepth(4);
            fb.body.setSize(12, 12);
            this.player.castMs = 160; SFX.fire();
            var self = this;
            this.time.delayedCall(1000, function () { if (fb.active) self.killFireball(fb); });
        };
        GameScene.prototype.hurtPlayer = function (player) {
            if (player.cheat || player.starMs > 0 || player.invulnMs > 0) return;
            SFX.hurt(); this.flash(255, 60, 60); this.shake(0.02);
            player.invulnMs = this.diff.invulnMs;
            player.body.setVelocity(-player.facing * 200, -260);
            // power down 1 tier
            if (player.power === 'fire') this.setPower('super');
            else if (player.power === 'super') this.setPower('small');
            // small stays small (just knockback + iframe) — no death (Bible §1.7)
        };
        GameScene.prototype.respawnSafe = function () {
            var player = this.player;
            // scan backward from checkpoint for a safe x with ground
            var tx = Math.floor(this.checkpointX / T);
            var safeX = this.checkpointX;
            player.setPosition(safeX, GROUND_Y - 80);
            player.body.setVelocity(0, 0);
            player.invulnMs = 1000;
            // freeze nearby enemies briefly
            var self = this;
            this.freezeEnemiesUntil = this.time.now + this.diff.respawnFreeze;
            this.flash(120, 120, 255);
            toast('Coba lagi! 💪');
        };

        /* =================================================================
           SPAWN helpers for items + JUICE (Bible §10)
           ================================================================= */
        GameScene.prototype.spawnPowerup = function (kind, x, y) {
            var texKey = kind === 'mushroom' ? 't_mushroom' : kind === 'flower' ? 't_flower' : 't_star';
            var p = this.powerups.create(x, y, texKey);
            p.setOrigin(0.5, 1); p.ptype = kind; p.setDepth(3);
            this.regTune(p, kind);
            if (kind === 'mushroom') { p.setVelocityX(80); p.body.setSize(24, 24).setOffset(2, 4); }
            else if (kind === 'star') { p.setVelocityX(120); p.body.setSize(24, 24).setOffset(2, 4); p.starBounce = true; }
            else { p.body.setAllowGravity(false); p.setVelocityX(0); p.body.setSize(24, 26).setOffset(3, 4); }
            // rise out of block
            p.y += 8;
            this.tweens.add({ targets: p, y: p.y - 24, duration: 300, ease: 'Quad' });
            return p;
        };
        GameScene.prototype.popCoin = function (x, y) {
            var c = this.add.image(x, y, 't_coin').setDepth(6);
            this.tweens.add({ targets: c, y: y - 40, alpha: 0, duration: 500, ease: 'Quad', onComplete: function () { c.destroy(); } });
            SFX.coin();
        };
        GameScene.prototype.pieceBurst = function (x, y) {
            var em = this.add.particles(0, 0, 't_pheart', { speed: { min: -160, max: 160 }, angle: { min: 200, max: 340 }, scale: { start: 1, end: 0 }, lifespan: 700, gravityY: 300, emitting: false, quantity: 12 });
            em.explode(12, x, y);
            this.time.delayedCall(900, function () { try { em.destroy(); } catch (e) {} });
        };
        GameScene.prototype.sparkBurst = function (x, y, col) {
            var em = this.add.particles(0, 0, 't_spark', { speed: { min: -120, max: 120 }, scale: { start: 0.8, end: 0 }, lifespan: 400, blendMode: 'ADD', tint: col || 0xffffff, emitting: false });
            em.explode(8, x, y);
            this.time.delayedCall(500, function () { try { em.destroy(); } catch (e) {} });
        };
        GameScene.prototype.brickParticles = function (x, y) {
            var em = this.add.particles(0, 0, 't_brickbit', { speed: { min: -180, max: 180 }, angle: { min: 200, max: 340 }, scale: { start: 1, end: 0.4 }, lifespan: 600, gravityY: 600, emitting: false });
            em.explode(4, x, y);
            this.time.delayedCall(700, function () { try { em.destroy(); } catch (e) {} });
        };
        GameScene.prototype.freeze = function (frames) { this.freezeUntil = this.time.now + frames * (1000 / 60); };
        GameScene.prototype.shake = function (intensity) { this.cameras.main.shake(120, intensity || 0.02); };
        GameScene.prototype.flash = function (r, g, b) { this.cameras.main.flash(90, r, g, b); };

        /* =================================================================
           HUD sync
           ================================================================= */
        GameScene.prototype.syncHud = function () {
            runState.score = this.score; runState.coins = this.coins;
            var sc = $('rmw-score'); if (sc) sc.textContent = ('000000' + this.score).slice(-6);
            var co = $('rmw-coins'); if (co) co.textContent = '×' + ('00' + this.coins).slice(-2);
            var ar = $('rmw-area'); if (ar) ar.textContent = String(this.worldIdx + 1);
            this.updatePowerHud();
        };
        GameScene.prototype.updatePowerHud = function () {
            var ico = $('rmw-power-ico'), nm = $('rmw-power-name');
            var map = { small: ['S', 'KECIL'], super: ['M', 'SUPER'], fire: ['F', 'API'] };
            var m = map[this.player ? this.player.power : 'small'] || map.small;
            if (this.player && this.player.starMs > 0) { m = ['★', 'BINTANG']; }
            if (ico) ico.textContent = m[0]; if (nm) nm.textContent = m[1];
        };
        GameScene.prototype.addScore = function (n) { if (this.cheatOn) return; this.score += n; if (this.score > STORE.best) { STORE.best = this.score; saveStore(); } this.syncHud(); };
        GameScene.prototype.addCoins = function (n) { this.coins += n; if (this.coins >= 100) { this.coins -= 100; } this.addScore(0); this.syncHud(); };

        /* =================================================================
           GOAL / STAGE CLEAR (cinematic — Bible §10.1)
           ================================================================= */
        GameScene.prototype.reachFlag = function () {
            if (this.clearSeq) return;
            SFX.flag(); this.addScore(1000);
            this.clearSeq = { phase: 'flag', t: 0 };
            this.player.autoFly = true; this.player.body.setVelocity(0, 0);
        };
        GameScene.prototype.updateClearSeq = function (dt) {
            var cs = this.clearSeq; cs.t += dt;
            var pl = this.player;
            if (cs.phase === 'flag') {
                // slide down pole
                pl.body.setAllowGravity(false);
                pl.x = this.flagX - 10;
                pl.y = Math.min(GROUND_Y, pl.y + 300 * dt / 1000);
                if (pl.y >= GROUND_Y || cs.t > 900) { cs.phase = 'banner'; cs.t = 0; this.showClearBanner(); }
            } else if (cs.phase === 'banner') {
                if (cs.t > 900) { cs.phase = 'fly'; cs.t = 0; pl.body.setAllowGravity(true); }
            } else if (cs.phase === 'fly') {
                pl.setVelocityX(240); pl.play(pl.power === 'small' ? 'p_run' : 'pS_run', true); pl.setFlipX(false);
                if (pl.x > this.worldW - 40 || cs.t > 2500) { cs.phase = 'done'; this.finishWorld(); }
            }
        };
        GameScene.prototype.showClearBanner = function () {
            var t = this.add.text(BW / 2, BH * 0.35, 'DUNIA ' + (this.worldIdx + 1) + ' BERES!', { fontFamily: 'monospace', fontSize: '26px', color: '#ffd447', stroke: '#e23b2e', strokeThickness: 4 }).setScrollFactor(0).setOrigin(0.5).setDepth(50);
            t.setScale(0);
            this.tweens.add({ targets: t, scale: 1, duration: 320, ease: 'Back.out' });
            this.time.delayedCall(1400, function () { try { t.destroy(); } catch (e) {} });
        };
        GameScene.prototype.finishWorld = function () {
            this.player.autoFly = false;
            if (this.worldIdx + 1 > STORE.maxWorld) { STORE.maxWorld = this.worldIdx + 1; saveStore(); }
            var t = $('rmw-clear-text');
            if (t) t.textContent = 'Dunia ' + (this.worldIdx + 1) + ' — ' + WORLD_NAMES[this.worldIdx] + ' selesai! Lanjut ke ' + (WORLD_NAMES[this.worldIdx + 1] || 'Kastil') + '.';
            this.scene.pause();
            showOverlay('rmw-clear');
        };

        /* =================================================================
           BOSS WORLD (Bible APPENDIX D) — walk-in corridor + arena
           ================================================================= */
        GameScene.prototype.buildBossWorld = function (len) {
            var self = this, gy = GROUND_Y, bio = BIOME[5];
            var lenTiles = Math.floor(len / T);
            // solid stone floor with lava gaps in the corridor
            for (var col = 0; col < lenTiles; col++) {
                // arena floor is solid; corridor has a couple lava gaps
                var inGap = (col > 20 && col < 23) || (col > 40 && col < 43);
                if (!inGap) { this.groundTile(col * T, gy, bio.ground); this.groundTile(col * T, gy + T, bio.ground); }
                else { this.pits.push({ from: col, to: col + 1 }); var lv = this.add.tileSprite(col * T, gy, T, 20, 't_lava').setOrigin(0, 0).setDepth(-2); this.decor.add(lv); }
            }
            var fill = this.add.graphics().setDepth(-4); fill.fillStyle(0x383838, 1); fill.fillRect(0, gy + 2 * T, len, (BH + 120) - (gy + 2 * T)); this.decor.add(fill);

            // corridor guards (2-3 hammer/buzzy via spawnList)
            this.spawnList.push({ x: 12 * T, type: 'hammer', y: gy - 44 });
            this.spawnList.push({ x: 28 * T, type: 'buzzy', y: gy - 20 });
            this.spawnList.push({ x: 46 * T, type: 'hammer', y: gy - 44 });
            this.spawnList.sort(function (a, b) { return a.x - b.x; });

            // Bunga (flower) in corridor for non-fire players (usage window for boss)
            this.qBlock(16 * T, gy - 4 * T, this.player.power === 'small' ? 'mushroom' : 'flower');
            this.qBlock(34 * T, gy - 4 * T, 'flower');
            // a few bricks + coins
            for (var b = 8; b < 50; b += 6) { this.brick(b * T, gy - 4 * T, null); this.spawnCoin(b * T + T / 2, gy - 3 * T); }

            // arena (last ~BW): bridge over lava + cage with bride + axe lever
            this.arenaX = len - Math.round(BW * 0.9);
            // lava under the bridge (arena)
            var arenaStart = lenTiles - 24;
            var bridgeTop = gy;
            // put lava tiles under the whole arena beneath ground row (visual under floor gaps at edges)
            // cage + bride at the far right on a raised platform
            var cageX = len - 120;
            this.cage = this.add.image(cageX, gy - T, 't_cage').setOrigin(0.5, 1).setDepth(3);
            this.bride = this.add.image(cageX, gy - T - 10, 't_bride').setOrigin(0.5, 1).setDepth(4);
            this.regTune(this.cage, 'bride'); this.regTune(this.bride, 'bride');
            // axe lever (touch = win) on a block near the cage
            this.axeX = len - 200;
            this.axe = this.add.image(this.axeX, gy - 3 * T, 't_star').setDepth(4).setTint(0xff4040).setScale(0.8);
            this.tweens.add({ targets: this.axe, angle: 360, duration: 1400, repeat: -1 });
            this.hardBlock(this.axeX - T / 2, gy - 2 * T);

            // BOSS — inactive (alpha 0) until walk-in (Bible D.1)
            this.boss = this.physics.add.sprite(len - 400, gy - 10, 't_boss_idle0');
            this.boss.setOrigin(0.5, 1); this.boss.body.setSize(80, 88).setOffset(10, 12);
            this.boss.body.setAllowGravity(false); this.boss.body.setImmovable(true);
            this.boss.play('boss_idle'); this.boss.setDepth(5); this.boss.setAlpha(0);
            this.boss.hp = 30; this.boss.maxHp = 30; this.boss.phase = 1; this.boss.atkT = 2500; this.boss.moveT = 0; this.boss.dir = -1;
            this.regTune(this.boss, 'boss');
            this.bossActive = false; this.bossDead = false;

            // boss HP bar (top-center, scrollFactor 0)
            if (this.bossBarBg) { try { this.bossBarBg.destroy(); this.bossBar.destroy(); } catch (e) {} }
            this.bossBarBg = this.add.rectangle(BW / 2, 90, 220, 14, 0x000000, 0.6).setScrollFactor(0).setDepth(48).setVisible(false);
            this.bossBar = this.add.rectangle(BW / 2 - 108, 90, 216, 10, 0xe23b2e).setScrollFactor(0).setDepth(49).setOrigin(0, 0.5).setVisible(false);
            this.bossBarLabel = this.add.text(BW / 2, 74, 'BOWSER — RAJA KESEPIAN', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd447' }).setScrollFactor(0).setOrigin(0.5).setDepth(49).setVisible(false);

            this.syncHud();
        };

        GameScene.prototype.activateBoss = function () {
            if (this.bossActive || !this.boss) return;
            this.bossActive = true;
            this.tweens.add({ targets: this.boss, alpha: 1, duration: 400 });
            this.cameras.main.setBounds(this.worldW - BW, 0, BW, BH);
            this.flash(255, 120, 40); this.shake(0.03); SFX.boss();
            this.bossBarBg.setVisible(true); this.bossBar.setVisible(true); this.bossBarLabel.setVisible(true);
            toast('⚔ Bowser "Raja Kesepian" menghadang! Kalahkan dengan hati-api atau tuas kapak.');
        };

        GameScene.prototype.updateBoss = function (dt) {
            var b = this.boss; if (!b || !b.active || !this.bossActive || this.bossDead) return;
            var pl = this.player;
            // phase thresholds
            var ratio = b.hp / b.maxHp;
            var newPhase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
            if (newPhase !== b.phase) { b.phase = newPhase; this.flash(255, 60, 60); SFX.boss(); if (b.phase === 3) b.play('boss_idle'); }
            // bob / slow move toward center
            b.moveT += dt;
            b.y = (GROUND_Y - 10) + Math.sin(b.moveT / 500) * 8;
            // face player
            b.setFlipX(pl.x > b.x);
            b.dir = pl.x > b.x ? 1 : -1;
            // attack timer
            var atkRate = b.phase === 1 ? 2500 : b.phase === 2 ? 1800 : 1200;
            b.atkT -= dt;
            if (b.atkT <= 0) {
                b.atkT = atkRate;
                this.bossAttack(b);
            }
            // phase 2+: occasional big leap toward player (run-under window)
            if (b.phase >= 2 && (b.moveT % 4000) < 20) {
                this.tweens.add({ targets: b, x: b.x + b.dir * 120, duration: 700, yoyo: true, ease: 'Quad' });
            }
            // manual hit detection (Bible D.2) — fireballs
            this.manualBossHits();
            // HP bar
            this.bossBar.width = 216 * Math.max(0, ratio);
            // axe lever check
            if (this.axe && Phaser.Math.Distance.Between(pl.x, pl.y, this.axeX, GROUND_Y - 3 * T) < 40) {
                this.axeWin();
            }
        };
        GameScene.prototype.bossAttack = function (b) {
            var pl = this.player;
            b.setTexture('t_boss_telegraph');
            var self = this;
            this.time.delayedCall(500, function () {
                if (!b.active || self.bossDead) return;
                b.setTexture('t_boss_fire'); SFX.boss();
                // 3 fireballs aimed at player + spread
                var ang = Math.atan2(pl.y - b.y, pl.x - b.x);
                var n = b.phase >= 3 ? 4 : 3;
                for (var i = 0; i < n; i++) {
                    var a = ang + (i - (n - 1) / 2) * 0.14;
                    var bl = self.ebullets.create(b.x + b.dir * 30, b.y - 40, 't_bfire');
                    if (!bl) continue;
                    bl.body.setAllowGravity(false); bl.etype = 'bfire'; bl.setDepth(6);
                    var spd = 200;
                    bl.setVelocity(Math.cos(a) * spd, Math.sin(a) * spd);
                    self.time.delayedCall(3500, function () { if (bl.active) bl.destroy(); });
                }
                self.time.delayedCall(400, function () { if (b.active && !self.bossDead) b.setTexture(b.phase === 3 ? 't_boss_enraged' : 't_boss_idle0'); });
            });
        };
        GameScene.prototype.manualBossHits = function () {
            var b = this.boss, self = this;
            if (!b || !b.active || !this.bossActive) return;
            this.fireballs.getChildren().forEach(function (fb) {
                if (fb.active && Math.abs(fb.x - b.x) < 58 && Math.abs(fb.y - (b.y - 40)) < 66) {
                    self.hitBoss(b, 1); self.killFireball(fb);
                }
            });
        };
        GameScene.prototype.hitBoss = function (b, dmg) {
            if (this.bossDead) return;
            b.hp -= dmg; SFX.bosshit(); this.freeze(5); this.flash(255, 255, 200);
            b.setTexture('t_boss_hurt');
            this.sparkBurst(b.x, b.y - 40, 0xffd040);
            var self = this;
            this.time.delayedCall(150, function () { if (b.active && !self.bossDead) b.setTexture(b.phase === 3 ? 't_boss_enraged' : 't_boss_idle0'); });
            if (b.hp <= 0) this.defeatBoss('fire');
        };
        GameScene.prototype.axeWin = function () {
            if (this.bossDead) return;
            this.defeatBoss('axe');
        };
        GameScene.prototype.defeatBoss = function (how) {
            if (this.bossDead) return; this.bossDead = true;
            var b = this.boss, self = this;
            this.bossBar.width = 0;
            b.setTexture('t_boss_defeated');
            // bowser falls into lava
            this.tweens.add({ targets: b, y: BH + 100, angle: 90, alpha: 0.6, duration: 1200, ease: 'Quad' });
            SFX.boss();
            this.flash(255, 200, 120); this.shake(0.04);
            // rescue bride
            this.time.delayedCall(1000, function () {
                if (self.cage) self.tweens.add({ targets: self.cage, alpha: 0, duration: 400 });
                if (self.bride) self.tweens.add({ targets: self.bride, x: self.player.x + 30, duration: 1400, ease: 'Quad' });
            });
            // victory beat then finale
            this.bossFinaleBeat();
            this.time.delayedCall(200, function () { bossFinale(); });
        };
        GameScene.prototype.bossFinaleBeat = function () {
            SFX.win();
            var em = this.add.particles(0, 0, 't_confetti', {
                x: { min: 0, max: BW }, y: -10, lifespan: 3000, speedY: { min: 100, max: 240 },
                speedX: { min: -60, max: 60 }, scale: { start: 1, end: 0.3 },
                tint: [0xffd447, 0xe23b2e, 0x4fd6c8, 0xff8ab0], scrollFactor: 0, quantity: 3, frequency: 60
            });
            em.setScrollFactor(0).setDepth(45);
            this.time.delayedCall(4500, function () { try { em.destroy(); } catch (e) {} });
        };

        /* =================================================================
           CELEBRATION (called from host layer for both triggers)
           ================================================================= */
        GameScene.prototype.celebrate = function (kind) {
            SFX.win();
            var em = this.add.particles(0, 0, 't_pheart', {
                x: { min: 0, max: BW }, y: BH + 10, lifespan: 2500, speedY: { min: -260, max: -140 },
                speedX: { min: -60, max: 60 }, scale: { start: 1.2, end: 0.2 }, scrollFactor: 0, quantity: 2, frequency: 80
            });
            em.setScrollFactor(0).setDepth(45);
            this.flash(255, 220, 180);
            this.time.delayedCall(4000, function () { try { em.destroy(); } catch (e) {} });
        };

        /* =================================================================
           MAIN UPDATE LOOP
           ================================================================= */
        GameScene.prototype.update = function (time, delta) {
            var dt = delta;
            // freeze-frame (juice) — skip simulation but keep rendering
            if (this.freezeUntil && time < this.freezeUntil) { return; }

            var pl = this.player;
            if (!pl || !pl.body) return;

            pollEdges();

            // --- clear sequence (cinematic outro) short-circuits normal play ---
            if (this.clearSeq && this.clearSeq.phase !== 'done') {
                this.updateClearSeq(dt);
                this.cameras.main.centerOn(this.cameras.main.scrollX + BW / 2, GROUND_Y - 100);
                this.processSpawns();
                return;
            }

            // --- boss walk-in trigger ---
            if (this.boss && !this.bossActive && !this.bossDead && pl.x >= this.arenaX) this.activateBoss();
            if (this.bossActive) this.updateBoss(dt);

            // --- flag reach ---
            if (this.flagObj && !this.clearSeq && Math.abs(pl.x - this.flagX) < 20 && pl.y < GROUND_Y + 10) this.reachFlag();

            // --- INPUT → MOVEMENT (momentum + variable jump) ---
            var onGround = pl.body.blocked.down;
            var C2 = C.player;
            var runHeld = input.run;
            var maxSpd = runHeld ? C2.run : C2.walk;
            var target = input.right ? maxSpd : input.left ? -maxSpd : 0;
            if (input.right) pl.facing = 1; else if (input.left) pl.facing = -1;
            var accel = onGround ? (target ? C2.accel : C2.friction) : C2.airAccel;
            var vx = Phaser.Math.Approach(pl.body.velocity.x, target, accel * dt / 1000);
            pl.body.setVelocityX(vx);

            // coyote + jump buffer
            if (onGround) pl.coyote = C2.coyoteMs; else pl.coyote = Math.max(0, pl.coyote - dt);
            if (input.jumpEdge) pl.jumpBuf = C2.bufferMs; else pl.jumpBuf = Math.max(0, pl.jumpBuf - dt);
            if (pl.jumpBuf > 0 && pl.coyote > 0) {
                var jv = C2.jump;
                if (Math.abs(vx) >= 0.8 * C2.run) jv *= (1 + C2.runJumpBoost);
                pl.body.setVelocityY(jv); pl.coyote = 0; pl.jumpBuf = 0; SFX.jump();
                this.tweens.add({ targets: pl, scaleX: 0.92, scaleY: 1.1, duration: 100, yoyo: true });
            }
            // variable jump cut
            if (!input.jump && pl.body.velocity.y < 0) pl.body.setVelocityY(pl.body.velocity.y * C2.jumpCut);
            // max fall
            if (pl.body.velocity.y > C2.maxFall) pl.body.setVelocityY(C2.maxFall);

            // prone (crouch) — resize on state-change only
            var wantProne = input.down && onGround && pl.power !== 'small';
            if (wantProne !== pl.proneNow) { pl.proneNow = wantProne; pl.resizeBody(); }

            // fire (hati-api)
            if (input.fireEdge && pl.power === 'fire' && !pl.proneNow) this.fireBall();
            if (pl.castMs > 0) pl.castMs -= dt;

            // star timer
            if (pl.starMs > 0) { pl.starMs -= dt; pl.setTint((Math.floor(time / 80) % 2) ? 0xffff80 : 0xffffff); if (pl.starMs <= 0) pl.clearTint(); }
            // invuln blink
            if (pl.invulnMs > 0) { pl.invulnMs -= dt; pl.setAlpha((Math.floor(time / 60) % 2) ? 0.4 : 1); } else pl.setAlpha(1);

            // --- pit / fall = respawn safe (Bible §8/§17) ---
            if (pl.y > BH + 80) this.respawnSafe();

            // --- ANIMATION / state ---
            this.animatePlayer(onGround);

            // --- ENEMIES: spawn + AI ---
            this.processSpawns();
            var self = this;
            var frozen = this.freezeEnemiesUntil && time < this.freezeEnemiesUntil;
            if (!frozen) {
                this.enemies.getChildren().forEach(function (e) { self.updateEnemy(e, dt); });
                this.shells.getChildren().forEach(function (sh) { self.updateShell(sh, dt); });
            }
            // powerup star bounce
            this.powerups.getChildren().forEach(function (p) {
                if (p.active && p.starBounce && p.body.blocked.down) p.body.setVelocityY(-260);
                if (p.active && (p.body.blocked.left || p.body.blocked.right)) p.body.setVelocityX(-p.body.velocity.x);
            });
            // ebullet despawn off-screen
            var cam = this.cameras.main;
            this.ebullets.getChildren().forEach(function (b) {
                if (b.active && (b.x < cam.scrollX - 40 || b.x > cam.scrollX + BW + 40 || b.y > BH + 40)) b.destroy();
            });
            this.fireballs.getChildren().forEach(function (fb) {
                if (fb.active && (fb.x < cam.scrollX - 20 || fb.x > cam.scrollX + BW + 20)) self.killFireball(fb);
            });

            // trauma decay for shake handled by Phaser; UI sync occasionally
            if (!this._hudT || time - this._hudT > 150) { this._hudT = time; this.syncHud(); }

            // update checkpoint (furthest safe ground x reached)
            if (onGround && pl.x > this.checkpointX && !this.inPit(Math.floor(pl.x / T))) this.checkpointX = pl.x;
        };

        GameScene.prototype.animatePlayer = function (onGround) {
            var pl = this.player;
            var big = pl.power !== 'small';
            var pfx = big ? 'pS_' : 'p_';
            var tfx = big ? 't_groomS_' : 't_groom_';
            pl.setFlipX(pl.facing < 0);
            if (pl.castMs > 0) { pl.anims.stop(); pl.setTexture(tfx + 'cast'); return; }
            if (pl.proneNow) { pl.anims.stop(); pl.setTexture(tfx + 'prone'); return; }
            if (!onGround) {
                pl.anims.stop();
                pl.setTexture(pl.body.velocity.y < 0 ? tfx + 'jump' : tfx + 'fall');
                return;
            }
            if (Math.abs(pl.body.velocity.x) > 20) { pl.play(pfx + 'run', true); pl.setAngle(pl.facing * 0); }
            else { pl.play(pfx + 'idle', true); }
        };

        return GameScene;
    }

    /* =================================================================
       KICKOFF — wait for Phaser then boot when the player presses START.
       (Everything above defined defineAndBoot + host wiring; init() already
       ran to wire UI. startRun() from the host layer calls startWhenReady().)
       ================================================================= */
    // nothing else to do here — startRun() (host layer) drives startWhenReady().

})();
