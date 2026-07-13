/* ======================================================================
   KICAU MANIA WEDDING — Flappy-Bird wedding-invitation theme.
   Phaser 3.80.1. Tap-to-flap; world scrolls LEFT; bird fixed at X≈30%.
   Built from KICAU_MANIA_WEDDING_BIBLE.md. Host-contract cloned from
   spacewar-wedding (cleanup, music mirror, cheat, celebration, tuner,
   asset-adjuster). Prefix km- ; global cleanup window.__gwCleanup.

   Engine notes (differ from spacewar shmup): gravity y:GRAV (bird falls),
   HORIZONTAL scroll, cages = pipes, pieces in Stage 1–3 only, NO boss —
   celebration #2 = finale gate at Stage 6. See Bible §3/§4/§5/§7/§X/§Z.
   ====================================================================== */
(function () {
    'use strict';

    /* ===== HOST CONTRACT — cleanup hook (teardown before boot) ===== */
    if (typeof window.__gwCleanup === 'function') { try { window.__gwCleanup(); } catch (e) {} }
    var cleanupFns = [];
    function onCleanup(fn) { cleanupFns.push(fn); }
    window.__gwCleanup = function () {
        cleanupFns.forEach(function (f) { try { f(); } catch (e) {} });
        cleanupFns = [];
        window.__gwCleanup = null;
    };

    var BUILD = 'kicau-mania-wedding';
    var VERSION = 'v1.0.0';
    try { console.log('%c[' + BUILD + '] ' + VERSION, 'background:#ff3d8b;color:#fff;padding:2px 6px;border-radius:3px'); } catch (e) {}

    /* ===== CENTRAL CONFIG (Bible §S) — all numbers here ===== */
    var CONFIG = {
        BW: 432, BH: 768, GROUND_Y: 0, CEIL_Y: 8, X_COLUMN: 0,   /* set after boot */
        bird: {
            grav: 1000, flap: -360, maxFall: 620,
            tiltUp: -22, tiltDown: 55, flapCooldown: 90,
            w: 20, h: 16,   /* small fair hitbox */
            invulnMs: { easy: 1400, normal: 1200, hard: 1000 }
        },
        diff: {
            easy:   { scroll: 150, gapH: 200, cageDX: 300, invulnMs: 1400, gacorNeed: 6, hazardRate: 0.6 },
            normal: { scroll: 180, gapH: 176, cageDX: 260, invulnMs: 1200, gacorNeed: 8, hazardRate: 1.0 },
            hard:   { scroll: 210, gapH: 152, cageDX: 220, invulnMs: 1000, gacorNeed: 8, hazardRate: 1.4 }
        },
        GAP_MARGIN: 70, GAP_DRIFT: 90,
        stages: 6,
        storeKey: 'kmw_v1',
        /* piece quota shape over 6 stages — pieces ONLY in stage 1–3 */
        quotaShape: [0.40, 0.35, 0.25, 0, 0, 0],
        gacorInvulnMs: 5000
    };

    var STAGE_NAMES = ['Mandi Pagi', 'Arena Lomba', 'Gantangan', 'Pasar Burung', 'Alam Liar', 'Panggung Juara'];
    var SECTION_TITLE = {
        hero: 'Pembuka', couple: 'Mempelai', rsvp: 'Konfirmasi', schedule: 'Acara',
        streaming: 'Live Streaming', story: 'Kisah', gallery: 'Galeri', happiness: 'Bagikan',
        wishes: 'Ucapan', gift: 'Amplop', closing: 'Penutup'
    };

    /* ===== DOM HELPERS + binding reads ===== */
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

    /* ===== SPRITE SHEET ASSET (optional PNG override) ===== */
    function assetUrl(name) {
        var el = document.querySelector('#km-assets img[data-asset="' + name + '"]');
        if (!el) return null;
        var v = (el.getAttribute('src') || '').trim();
        if (!v || v.indexOf('{{') > -1) return null;
        return v;
    }

    /* ===== ASSET ADJUSTER — SHEET_MAP (exporter + loader single source) ===== */
    var SHEET_BORDER = 2, SHEET_PAD = 10, SHEET_LABEL = 14;
    var SHEET_MARK = { r: 160, g: 0, b: 255 };
    var SHEET_MAP = [
        // bird poses
        { key: 't_bird0', ew: 40, eh: 34 }, { key: 't_bird1', ew: 40, eh: 34 }, { key: 't_bird2', ew: 40, eh: 34 },
        { key: 't_bird_hurt', ew: 40, eh: 34 }, { key: 't_bird_gacor', ew: 44, eh: 38 },
        // cages / obstacle
        { key: 't_cage_top', ew: 64, eh: 300 }, { key: 't_cage_bot', ew: 64, eh: 300 },
        // hazards
        { key: 't_kucing', ew: 40, eh: 36 }, { key: 't_lebah', ew: 26, eh: 24 }, { key: 't_ranting', ew: 90, eh: 20 },
        // items
        { key: 't_piece', ew: 34, eh: 34 }, { key: 't_notbalok', ew: 20, eh: 22 },
        { key: 't_voer', ew: 26, eh: 26 }, { key: 't_jangkrik', ew: 26, eh: 22 }, { key: 't_masteran', ew: 28, eh: 26 },
        // fx
        { key: 't_feather', ew: 10, eh: 10 }, { key: 't_confetti', ew: 8, eh: 8 }, { key: 't_heart', ew: 12, eh: 12 },
        // ambient
        { key: 't_bfly0', ew: 24, eh: 24 }, { key: 't_bfly1', ew: 24, eh: 24 }, { key: 't_note', ew: 18, eh: 22 }, { key: 't_cloud', ew: 120, eh: 60 },
        // parallax
        { key: 't_hill', ew: 240, eh: 150 }, { key: 't_landmark', ew: 150, eh: 170 }, { key: 't_bush', ew: 80, eh: 52 }
    ];
    var SHEET_W = 900;
    function sheetLayout() {
        var x = SHEET_PAD, y = SHEET_PAD + SHEET_LABEL, rowH = 0;
        for (var i = 0; i < SHEET_MAP.length; i++) {
            var e = SHEET_MAP[i];
            var cellW = e.ew + SHEET_BORDER * 2, cellH = e.eh + SHEET_BORDER * 2;
            if (x + cellW + SHEET_PAD > SHEET_W && x > SHEET_PAD) { x = SHEET_PAD; y += rowH + SHEET_PAD + SHEET_LABEL; rowH = 0; }
            e.rect = [x + SHEET_BORDER, y + SHEET_BORDER, e.ew, e.eh];
            x += cellW + SHEET_PAD;
            if (cellH > rowH) rowH = cellH;
        }
        return { w: SHEET_W, h: y + rowH + SHEET_PAD };
    }

    var toastTimer;
    function toast(msg, ms) {
        var t = $('km-toast'); if (!t) return;
        t.innerHTML = msg; t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2200);
    }
    function showError(msg) {
        var c = $('km-cover');
        if (c) { c.classList.add('show'); c.innerHTML = '<div class="km-overlay-card"><div class="km-overlay-pixtitle" style="color:#ff6a6a">GAGAL MEMUAT</div><div class="km-overlay-text">' + esc(msg) + '</div></div>'; }
        try { console.error('[kicau-mania-wedding] ' + msg); } catch (e) {}
    }

    /* copy-to-clipboard (inline onclick=swCopy — kept name for gift buttons) */
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

    /* ===== PERSISTENCE ===== */
    var STORE = loadStore();
    function loadStore() {
        var def = { unlocked: [], maxStage: 0, best: 0, diff: 'normal', announcedAll: false, completed: false };
        try { var raw = localStorage.getItem(CONFIG.storeKey); if (!raw) return def; return Object.assign(def, JSON.parse(raw) || {}); }
        catch (e) { return def; }
    }
    function saveStore() { try { localStorage.setItem(CONFIG.storeKey, JSON.stringify(STORE)); } catch (e) {} }
    function resetStore() {
        try { localStorage.removeItem(CONFIG.storeKey); } catch (e) {}
        STORE = { unlocked: [], maxStage: 0, best: 0, diff: 'normal', announcedAll: false, completed: false };
        saveStore();
    }

    /* ===== SPRITE TUNER (PC dev tool) ===== */
    var TUNE_KEY = 'kmw_tune_v1';
    var TUNE_DEFAULTS = {
        bird: 0, piece: 0, voer: 0, jangkrik: 0, masteran: 0,
        cage: 0, kucing: 0, lebah: 0, ranting: 0, notbalok: 0,
        hill: 0, landmark: 0, bush: 0
    };
    var TUNE_SPECS = [
        { id: 'bird', label: 'Burung (Player)' },
        { id: 'piece', label: 'Kepingan 💌' },
        { id: 'voer', label: 'Voer (shield)' },
        { id: 'jangkrik', label: 'Jangkrik (boost)' },
        { id: 'masteran', label: 'Masteran (auto)' },
        { id: 'cage', label: 'Sangkar (obstacle)' },
        { id: 'kucing', label: 'Kucing' },
        { id: 'lebah', label: 'Lebah' },
        { id: 'ranting', label: 'Ranting' },
        { id: 'notbalok', label: 'Not balok (skor)' },
        { id: 'hill', label: 'Bukit (bg)' },
        { id: 'landmark', label: 'Landmark' },
        { id: 'bush', label: 'Semak (prop)' }
    ];
    var TUNE_MIN = -60, TUNE_MAX = 60;
    var TUNE = loadTune();
    function loadTune() {
        var t = {};
        TUNE_SPECS.forEach(function (s) { t[s.id] = (typeof TUNE_DEFAULTS[s.id] === 'number') ? TUNE_DEFAULTS[s.id] : 0; });
        try { var raw = localStorage.getItem(TUNE_KEY); if (raw) { var p = JSON.parse(raw) || {}; TUNE_SPECS.forEach(function (s) { if (typeof p[s.id] === 'number') t[s.id] = p[s.id]; }); } } catch (e) {}
        return t;
    }
    function saveTune() { try { localStorage.setItem(TUNE_KEY, JSON.stringify(TUNE)); } catch (e) {} }
    function tuneY(id, y) { return y + (TUNE[id] || 0); }

    /* ===== WEDDING LAYER — scan #inv-source (dynamic piece count) ===== */
    var INFOS = [], unlocked = {};
    function scanInfos() {
        INFOS = Array.prototype.slice.call(document.querySelectorAll('#inv-source > section[data-info]'))
            .map(function (s) { var k = s.dataset.info; return { key: k, title: SECTION_TITLE[k] || k, el: s }; });
        unlocked = {};
        (STORE.unlocked || []).forEach(function (k) { if (INFOS.some(function (i) { return i.key === k; })) unlocked[k] = true; });
    }
    function N() { return INFOS.length; }
    function unlockedCount() { return INFOS.filter(function (i) { return unlocked[i.key]; }).length; }
    function allInfoUnlocked() { return N() > 0 && unlockedCount() >= N(); }
    function titleOf(key) { var f = INFOS.filter(function (i) { return i.key === key; })[0]; return f ? f.title : key; }

    /* quota over 6 stages (pieces only in 1–3) with auto-scale */
    function buildQuota(n) {
        var shape = CONFIG.quotaShape;
        var q = shape.map(function (s) { return Math.floor(s * n); });
        var diff = n - q.reduce(function (a, b) { return a + b; }, 0);
        // distribute remainder into stages 1..3 (indices 0..2) round-robin
        for (var i = 0; diff > 0; i = (i + 1) % 3) { q[i]++; diff--; }
        return q;
    }
    var QUOTA = [];
    function infosForStage(stageIdx) {
        var start = 0;
        for (var i = 0; i < stageIdx; i++) start += QUOTA[i];
        return INFOS.slice(start, start + (QUOTA[stageIdx] || 0));
    }

    /* ===== INDICATORS + INVENTORY UI ===== */
    function pieceGlyph(key) {
        var g = { hero: '♥', couple: '🕊', rsvp: '✓', schedule: '⌚', streaming: '📺', story: '📖',
            gallery: '🖼', happiness: '📸', wishes: '✉', gift: '🎁', closing: '🏆' };
        return g[key] || '💌';
    }
    function buildIndicators() {
        var inv = $('km-inv'); if (!inv) return;
        inv.innerHTML = '';
        INFOS.forEach(function (info) {
            var chip = document.createElement('div');
            chip.className = 'km-inv-chip' + (unlocked[info.key] ? ' is-on' : '');
            chip.title = info.title;
            chip.textContent = pieceGlyph(info.key);
            chip.dataset.key = info.key;
            chip.addEventListener('click', function () { if (unlocked[info.key]) openPieceModal(info.key); });
            inv.appendChild(chip);
        });
        var pt = $('km-progress-t'); if (pt) pt.textContent = String(N());
        updateProgress();
    }
    function updateProgress() {
        var pn = $('km-progress-n'); if (pn) pn.textContent = String(unlockedCount());
        var view = $('km-view-btn');
        if (view) { if (allInfoUnlocked() || cheat.on) view.classList.remove('is-locked'); else view.classList.add('is-locked'); }
    }
    function lightIndicator(key) {
        var chip = document.querySelector('.km-inv-chip[data-key="' + key + '"]');
        if (chip) chip.classList.add('is-on');
        updateProgress();
    }

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

    /* ===== MODAL + FULL REVEAL — clone from #inv-source ===== */
    function openPieceModal(key) {
        var src = document.querySelector('#inv-source > section[data-info="' + key + '"]');
        if (!src) return;
        var body = $('km-modal-body'), title = $('km-modal-title');
        title.textContent = (SECTION_TITLE[key] || key).toUpperCase();
        body.innerHTML = '';
        var clone = src.cloneNode(true); clone.style.display = '';
        hydrateImages(clone);
        body.appendChild(clone);
        rewireHostFormsInside(body);
        rewireGalleryInside(body);
        $('km-modal-root').classList.add('show');
    }
    function closeModal() { $('km-modal-root').classList.remove('show'); }

    function revealFullInvitation() {
        var scroll = $('km-reveal-scroll'); scroll.innerHTML = '';
        INFOS.forEach(function (info) { var clone = info.el.cloneNode(true); clone.style.display = ''; hydrateImages(clone); scroll.appendChild(clone); });
        rewireHostFormsInside(scroll);
        rewireGalleryInside(scroll);
        $('km-reveal').classList.add('show');
        setMusic(true);
    }
    function closeReveal() {
        $('km-reveal').classList.remove('show');
        // revive game on return (opening invitation re-injects theme via music toggle)
        try {
            if (window.__kmStarted) {
                var sc = scene();
                if (!GAME || !sc) { var rs = window.__kmStarted; startRun((rs && rs.stage) || 0); }
                else if (sc.scene.isPaused()) sc.scene.resume();
            }
        } catch (e) {}
    }

    function hydrateImages(root) {
        var bgs = root.querySelectorAll('.km-hero-bg[data-src], .km-closing-bg[data-src]');
        bgs.forEach(function (bg) { var u = bg.getAttribute('data-src'); if (u && u.indexOf('{{') !== 0) bg.style.backgroundImage = "url('" + u + "')"; });
    }

    /* RSVP + wishes are handled entirely by the HOST (ThemeWrapper): it intercepts
       #btn-submit-kehadiran / #btn-submit-ucapan (delegated on the theme container),
       calls the backend, hides the form, reveals the thank-you card, and prepends the
       new wish. We must NOT bind a local fallback here or the click is handled twice.
       Kept as a no-op so existing callers don't break. */
    function rewireHostFormsInside(root) { /* host-owned; no local handler */ }
    function bindOnce(el, fn) { if (el.__kmBound) return; el.__kmBound = true; el.addEventListener('click', fn); }
    function rewireGalleryInside(root) {
        var items = root.querySelectorAll('.km-gallery-item img');
        items.forEach(function (img) {
            if (img.__kmBound) return; img.__kmBound = true;
            img.parentElement.style.cursor = 'pointer';
            img.parentElement.addEventListener('click', function () { var lb = $('km-lightbox'); $('km-lightbox-img').src = img.src; lb.classList.add('show'); });
        });
    }

    /* ===== CHEAT SYSTEM ===== */
    var cheat = { on: false };
    function toggleCheat() {
        cheat.on = !cheat.on;
        var btn = $('km-star-btn'); if (btn) btn.classList.toggle('is-on', cheat.on);
        var ss = $('km-stagesel-btn'); if (ss) ss.style.display = cheat.on ? '' : 'none';
        if (cheat.on) { unlockAll(); toast('★ CHEAT ON — kebal + semua stage + undangan terbuka'); }
        else toast('Cheat off — mode jujur kembali');
        updateProgress();
        var sc = scene(); if (sc && sc.bird) sc.bird.cheat = cheat.on;
    }

    /* ===== CELEBRATION — 2 triggers, persisted guards ===== */
    function announceAllCollected() {
        if (STORE.announcedAll) return;
        STORE.announcedAll = true; saveStore();
        var sc = scene(); if (sc && sc.celebrate) sc.celebrate('pieces');
        setTimeout(function () {
            var t = $('km-allpieces-text');
            if (t) t.innerHTML = 'Hebat! Semua kepingan undangan ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'sudah terkumpul. Undangan siap dibuka!';
            showOverlay('km-allpieces');
        }, 4500);
    }
    function finaleReached() {
        unlockAll(true);
        if (STORE.completed) { revealFullInvitation(); return; }
        STORE.completed = true; saveStore();
        var sc = scene(); if (sc && sc.celebrate) sc.celebrate('finale');
        setTimeout(function () {
            var t = $('km-win-text');
            if (t) t.innerHTML = 'Selamat! ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'jadi juara Kicau Mania — kini terbang bersama selamanya. Buka undangannya sekarang, atau tutup dulu.';
            showOverlay('km-win');
        }, 4000);
    }

    /* ===== OVERLAY helpers ===== */
    function showOverlay(id) { hideOverlays(); var o = $(id); if (o) o.classList.add('show'); }
    function hideOverlays() {
        ['km-cover', 'km-loading', 'km-briefing', 'km-clear', 'km-allpieces', 'km-win', 'km-stagesel', 'km-resetconfirm']
            .forEach(function (id) { var o = $(id); if (o) o.classList.remove('show'); });
    }

    /* ===== MUSIC MIRROR — idempotent (never audio.play tenant) ===== */
    var musicWanted = false, musicGen = 0;
    function hostMusicPlaying() { var pause = $('pause-icon'); return !!(pause && pause.style.display !== 'none'); }
    function setMusic(want) {
        musicWanted = want; var myGen = ++musicGen;
        (function tryClick(tries) {
            if (myGen !== musicGen) return;
            if (hostMusicPlaying() !== musicWanted) { var b = $('btn-toggle-music'); if (b) b.click(); if (tries < 6) setTimeout(function () { tryClick(tries + 1); }, 260); }
        })(0);
    }
    function reflectMusicIcon(playing) {
        var p = $('play-icon'), q = $('pause-icon');
        if (p) p.style.display = playing ? 'none' : '';
        if (q) q.style.display = playing ? '' : 'none';
    }

    /* ===== SFX — Web Audio internal ===== */
    var SFX_MUTE_KEY = 'kmw_sfx_muted';
    var sfxMuted = (function () { try { return localStorage.getItem(SFX_MUTE_KEY) === '1'; } catch (e) { return false; } })();
    function reflectSfxIcon() {
        var on = $('km-sfx-on'), off = $('km-sfx-off');
        if (on) on.style.display = sfxMuted ? 'none' : '';
        if (off) off.style.display = sfxMuted ? '' : 'none';
        var btn = $('km-sfx-btn'); if (btn) btn.classList.toggle('is-muted', sfxMuted);
    }
    function toggleSfx() {
        sfxMuted = !sfxMuted;
        try { localStorage.setItem(SFX_MUTE_KEY, sfxMuted ? '1' : '0'); } catch (e) {}
        reflectSfxIcon();
        toast(sfxMuted ? '🔇 Suara efek game dimatikan' : '🔊 Suara efek game dinyalakan');
    }
    var AC = null;
    function audioCtx() { if (AC) return AC; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } return AC; }
    function blip(freq, dur, type, vol, slideTo) {
        if (sfxMuted) return;
        var ac = audioCtx(); if (!ac) return;
        try {
            var o = ac.createOscillator(), g = ac.createGain();
            o.type = type || 'square'; var t = ac.currentTime;
            o.frequency.setValueAtTime(freq, t);
            if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
            g.gain.setValueAtTime(vol || 0.04, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(ac.destination);
            o.start(t); o.stop(t + dur + 0.02);
        } catch (e) {}
    }
    var SFX = {
        flap:    function () { blip(520, 0.05, 'square', 0.03, 700); },
        score:   function () { blip(880, 0.06, 'sine', 0.04, 1180); },
        collect: function () { blip(660, 0.10, 'sine', 0.05, 990); setTimeout(function () { blip(1040, 0.12, 'sine', 0.05, 1400); }, 90); },
        power:   function () { blip(700, 0.10, 'triangle', 0.05, 1200); },
        gacor:   function () { [740, 880, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.12, 'square', 0.05); }, i * 90); }); },
        hit:     function () { blip(200, 0.18, 'sawtooth', 0.06, 70); },
        win:     function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { blip(f, 0.18, 'square', 0.05); }, i * 120); }); }
    };

    /* ===== ensurePhaser ===== */
    function ensurePhaser(cb) {
        if (window.Phaser) return cb();
        if (window.__kmPhaserLoading) { window.__kmPhaserLoading.then(cb); return; }
        window.__kmPhaserLoading = new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(); showError('Gagal memuat Phaser dari internet. Cek koneksi.'); };
            document.body.appendChild(s);
        });
        window.__kmPhaserLoading.then(cb).catch(function () {});
    }

    var GAME = null, defineAndBoot, usingSheetAsset = false;
    function startWhenReady() { ensurePhaser(function () { if (!window.Phaser) { showError('Phaser tidak termuat (timeout).'); return; } defineAndBoot(); }); }

    /* ===== side-menu repaint (host re-inject recovery) ===== */
    function repaintSideMenu() {
        try { buildIndicators(); } catch (e) {}
        try { drawCoupleCanvas(); } catch (e) {}
        try { paintSideBg(); } catch (e) {}
        try { var v = $('km-version'); if (v) v.textContent = VERSION; } catch (e) {}
        try { updateProgress(); } catch (e) {}
        try {
            var sb = $('km-star-btn'); if (sb) sb.classList.toggle('is-on', !!(cheat && cheat.on));
            var ss = $('km-stagesel-btn'); if (ss) ss.style.display = (cheat && cheat.on) ? '' : 'none';
        } catch (e) {}
        try { if (typeof reflectSfxIcon === 'function') reflectSfxIcon(); } catch (e) {}
    }
    function wireReinjectRecovery() {
        if (typeof MutationObserver !== 'function') return;
        var shell = document.querySelector('.km-shell');
        var host = (shell && shell.parentNode) || document.body; if (!host) return;
        if (window.__kmReinjectObs) { try { window.__kmReinjectObs.disconnect(); } catch (e) {} window.__kmReinjectObs = null; }
        var pending = null;
        var obs = new MutationObserver(function (muts) {
            var relevant = false;
            for (var i = 0; i < muts.length; i++) {
                var added = muts[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j]; if (n.nodeType !== 1) continue;
                    if ((n.classList && n.classList.contains('km-shell')) || (n.querySelector && n.querySelector('#km-couple-canvas, #km-inv, .km-shell'))) { relevant = true; break; }
                }
                if (relevant) break;
            }
            if (!relevant) return;
            if (pending) return;
            pending = setTimeout(function () { pending = null; repaintSideMenu(); }, 80);
        });
        obs.observe(host, { childList: true, subtree: true });
        window.__kmReinjectObs = obs;
        onCleanup(function () { if (pending) { clearTimeout(pending); pending = null; } try { obs.disconnect(); } catch (e) {} if (window.__kmReinjectObs === obs) window.__kmReinjectObs = null; });
    }

    /* ===== KICKOFF ===== */
    function init() {
        try { wireUI(); } catch (e) { try { console.error('[kmw] wireUI', e); } catch (e2) {} }
        try { scanInfos(); QUOTA = buildQuota(N()); STORE.diff = STORE.diff || 'normal'; buildIndicators(); } catch (e) {}
        try { wireMusicMirror(); } catch (e) {}
        try { drawCoupleCanvas(); } catch (e) {}
        try { paintSideBg(); } catch (e) {}
        try { buildTuner(); } catch (e) {}
        try { var v = $('km-version'); if (v) v.textContent = VERSION; } catch (e) {}
        try { updateProgress(); } catch (e) {}
        try { wireReinjectRecovery(); } catch (e) {}
        // AUTO-RESUME after re-inject — only when cover/reveal NOT showing.
        try {
            var coverUp = (($('km-cover') || {}).classList || { contains: function () { return false; } }).contains('show');
            var revealUp = (($('km-reveal') || {}).classList || { contains: function () { return false; } }).contains('show');
            if (window.__kmStarted && !coverUp && !revealUp) {
                var rs = window.__kmStarted;
                setTimeout(function () { try { startRun((rs && rs.stage) || 0); } catch (e) {} }, 60);
            }
        } catch (e) {}
    }

    /* ===== DECORATIVE COUPLE CANVAS (desktop right panel) — kicau themed ===== */
    function paintSideBg() {
        var bg = $('km-side-bg'); if (!bg) return;
        var url = srcVal('photo_hero_cover', '');
        if (url) { bg.style.backgroundImage = "url('" + url + "')"; bg.classList.add('has-photo'); }
    }
    function drawCoupleCanvas() {
        var cv = $('km-couple-canvas'); if (!cv || !cv.getContext) return;
        var x = cv.getContext('2d'); if (!x) return;
        var W = cv.width, H = cv.height, gy = H - 56;
        x.clearRect(0, 0, W, H);
        // warm sky
        var sky = x.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#cdeecb'); sky.addColorStop(0.55, '#8fd08a'); sky.addColorStop(1, '#5fb96a');
        x.fillStyle = sky; x.fillRect(0, 0, W, H);
        // sun
        x.fillStyle = 'rgba(255,208,71,0.9)'; circle(x, W * 0.8, H * 0.24, 46);
        x.fillStyle = 'rgba(255,246,208,0.7)'; circle(x, W * 0.8, H * 0.24, 30);
        // hills
        x.fillStyle = '#8fd08a'; x.beginPath(); x.ellipse(W * 0.25, gy + 30, 220, 70, 0, 0, 7); x.fill();
        x.fillStyle = '#6fb86a'; x.beginPath(); x.ellipse(W * 0.72, gy + 40, 240, 80, 0, 0, 7); x.fill();
        // ground
        x.fillStyle = '#e8c070'; x.fillRect(0, gy + 10, W, H);
        // hanging cage (gantangan) with little bird
        x.strokeStyle = '#8a5a2a'; x.lineWidth = 4; x.beginPath(); x.moveTo(W * 0.16, 40); x.lineTo(W * 0.16, 120); x.stroke();
        drawCage(x, W * 0.16, 150);
        // notes floating
        x.fillStyle = 'rgba(255,61,139,0.8)'; x.font = 'bold 22px sans-serif';
        x.fillText('♪', W * 0.34, 90); x.fillText('♫', W * 0.6, 70);
        // couple
        var cx = W * 0.5;
        groom(x, cx - 64, gy);
        bride(x, cx + 64, gy);
        // joining heart
        x.fillStyle = '#ff3d8b'; heart(x, cx, gy - 108, 20);
        // flying kicau bird
        drawBird(x, W * 0.68, H * 0.4);
        // banner
        x.fillStyle = '#ff3d8b'; roundRect(x, cx - 170, 12, 340, 44, 10); x.fill();
        x.strokeStyle = '#fff'; x.lineWidth = 3; roundRect(x, cx - 170, 12, 340, 44, 10); x.stroke();
        x.fillStyle = '#fff'; x.font = 'bold 22px "Trebuchet MS", sans-serif'; x.textAlign = 'center';
        x.fillText('JUARA KICAU MANIA', cx, 42); x.textAlign = 'left';

        function circle(c, X, Y, r) { c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill(); }
        function roundRect(c, X, Y, w, h, r) { c.beginPath(); c.moveTo(X + r, Y); c.arcTo(X + w, Y, X + w, Y + h, r); c.arcTo(X + w, Y + h, X, Y + h, r); c.arcTo(X, Y + h, X, Y, r); c.arcTo(X, Y, X + w, Y, r); c.closePath(); }
        function heart(c, X, Y, s) { c.save(); c.translate(X, Y); c.beginPath(); c.moveTo(0, s * 0.3); c.bezierCurveTo(s, -s * 0.6, s * 1.2, s * 0.5, 0, s); c.bezierCurveTo(-s * 1.2, s * 0.5, -s, -s * 0.6, 0, s * 0.3); c.fill(); c.restore(); }
        function drawCage(c, X, Y) {
            c.strokeStyle = '#d89410'; c.lineWidth = 2;
            c.beginPath(); c.arc(X, Y, 26, Math.PI, 2 * Math.PI); c.stroke();
            c.beginPath(); c.moveTo(X - 26, Y); c.lineTo(X - 26, Y + 30); c.arc(X, Y + 30, 26, Math.PI, 2 * Math.PI, true); c.lineTo(X + 26, Y); c.stroke();
            for (var i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(X + i * 12, Y - 20); c.lineTo(X + i * 12, Y + 30); c.stroke(); }
            c.fillStyle = '#2fa86a'; c.beginPath(); c.arc(X, Y + 10, 8, 0, 7); c.fill();
            c.fillStyle = '#ffb020'; c.beginPath(); c.moveTo(X + 8, Y + 8); c.lineTo(X + 14, Y + 10); c.lineTo(X + 8, Y + 12); c.fill();
        }
        function drawBird(c, X, Y) {
            c.fillStyle = '#2fa86a'; c.beginPath(); c.ellipse(X, Y, 20, 16, 0, 0, 7); c.fill();
            c.fillStyle = '#fff8ea'; c.beginPath(); c.ellipse(X - 3, Y + 4, 10, 8, 0, 0, 7); c.fill();
            c.fillStyle = '#ffb020'; c.beginPath(); c.moveTo(X + 16, Y - 2); c.lineTo(X + 26, Y + 2); c.lineTo(X + 16, Y + 6); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.arc(X + 8, Y - 4, 5, 0, 7); c.fill();
            c.fillStyle = '#000'; c.beginPath(); c.arc(X + 9, Y - 4, 2.4, 0, 7); c.fill();
            c.fillStyle = '#1c7d4c'; c.beginPath(); c.ellipse(X - 6, Y - 2, 10, 6, -0.4, 0, 7); c.fill();
        }
        function groom(c, X, gy2) {
            c.fillStyle = '#3a3e6a'; c.fillRect(X - 14, gy2 - 46, 12, 46); c.fillRect(X + 2, gy2 - 46, 12, 46);
            c.fillStyle = '#23264a'; roundRect(c, X - 18, gy2 - 86, 36, 50, 6); c.fill();
            c.fillStyle = '#fff'; c.fillRect(X - 6, gy2 - 86, 12, 40);
            c.fillStyle = '#ff3d8b'; c.beginPath(); c.moveTo(X, gy2 - 84); c.lineTo(X - 5, gy2 - 70); c.lineTo(X, gy2 - 56); c.lineTo(X + 5, gy2 - 70); c.closePath(); c.fill();
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#2a2218'; c.fillRect(X - 12, gy2 - 116, 24, 9);
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
        }
        function bride(c, X, gy2) {
            c.fillStyle = '#f3ead2'; c.beginPath(); c.moveTo(X - 28, gy2); c.lineTo(X - 10, gy2 - 60); c.lineTo(X + 10, gy2 - 60); c.lineTo(X + 28, gy2); c.closePath(); c.fill();
            c.fillStyle = '#fff8e4'; roundRect(c, X - 11, gy2 - 86, 22, 30, 6); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(X - 16, gy2 - 104); c.lineTo(X + 16, gy2 - 104); c.lineTo(X + 22, gy2 - 50); c.lineTo(X - 22, gy2 - 50); c.closePath(); c.fill();
            c.fillStyle = '#f3d2a0'; roundRect(c, X - 11, gy2 - 112, 22, 26, 6); c.fill();
            c.fillStyle = '#6a4a2a'; c.fillRect(X - 13, gy2 - 116, 26, 11);
            c.fillStyle = '#10140d'; c.fillRect(X - 6, gy2 - 102, 3, 3); c.fillRect(X + 3, gy2 - 102, 3, 3);
            c.fillStyle = '#2fa86a'; c.fillRect(X - 4, gy2 - 58, 8, 14);
            c.fillStyle = '#ff8ab0'; [[X - 4, gy2 - 58], [X + 4, gy2 - 58], [X, gy2 - 64]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 5, 0, 7); c.fill(); });
        }
    }

    /* ===== SPRITE TUNER UI ===== */
    function buildTuner() {
        var list = $('km-tuner-list'); if (!list) return;
        while (list.firstChild) list.removeChild(list.firstChild);
        TUNE_SPECS.forEach(function (spec) {
            var v = TUNE[spec.id] || 0;
            var row = document.createElement('div'); row.className = 'km-tuner-row';
            var top = document.createElement('div'); top.className = 'km-tuner-row-top';
            var name = document.createElement('span'); name.className = 'km-tuner-row-name'; name.textContent = spec.label;
            var valEl = document.createElement('span'); valEl.className = 'km-tuner-row-val'; valEl.id = 'km-tval-' + spec.id;
            valEl.textContent = (v > 0 ? '+' : '') + v + 'px';
            top.appendChild(name); top.appendChild(valEl);
            var slider = document.createElement('input');
            slider.type = 'range'; slider.min = TUNE_MIN; slider.max = TUNE_MAX; slider.step = 1; slider.value = v; slider.setAttribute('data-tune', spec.id);
            var apply = function () {
                var nv = parseInt(slider.value, 10) || 0;
                valEl.textContent = (nv > 0 ? '+' : '') + nv + 'px';
                var sc = scene();
                if (sc && sc.applyLiveTune) sc.applyLiveTune(spec.id, nv);
                else { TUNE[spec.id] = nv; saveTune(); }
            };
            slider.addEventListener('input', apply); slider.addEventListener('change', apply);
            row.appendChild(top); row.appendChild(slider);
            list.appendChild(row);
        });
    }
    function toggleTuner() { var p = $('km-tuner'); if (!p) return; if (!p.classList.contains('show')) buildTuner(); p.classList.toggle('show'); }
    function resetTuner() {
        var sc = scene();
        TUNE_SPECS.forEach(function (spec) {
            var def = (typeof TUNE_DEFAULTS[spec.id] === 'number') ? TUNE_DEFAULTS[spec.id] : 0;
            if (sc && sc.applyLiveTune) sc.applyLiveTune(spec.id, def); else TUNE[spec.id] = def;
        });
        saveTune(); buildTuner(); toast('Posisi sprite direset ke default');
    }
    function copyTuner() {
        var txt = JSON.stringify(TUNE, null, 2);
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).catch(function () {});
        else fallbackCopy(txt, function () {});
        toast('Nilai disalin: <b>' + esc(txt.replace(/\s+/g, ' ')) + '</b>', 4000);
    }

    /* ===== EXPORTER — sprite sheet ===== */
    function exportSpriteSheet() {
        var sc = scene();
        if (!sc || !sc.textures) { toast('Mulai game dulu (tekan START) agar sprite tersedia untuk diekspor.'); return; }
        var dim = sheetLayout();
        try {
            var cv = document.createElement('canvas'); cv.width = dim.w; cv.height = dim.h;
            var ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#2a1810'; ctx.fillRect(0, 0, dim.w, dim.h);
            var mark = 'rgb(' + SHEET_MARK.r + ',' + SHEET_MARK.g + ',' + SHEET_MARK.b + ')';
            SHEET_MAP.forEach(function (e) {
                var r = e.rect, ax = r[0], ay = r[1], aw = r[2], ah = r[3];
                try { if (sc.textures.exists(e.key)) { var src = sc.textures.get(e.key).getSourceImage(); if (src) ctx.drawImage(src, 0, 0, src.width, src.height, ax, ay, aw, ah); } } catch (e2) {}
                ctx.strokeStyle = mark; ctx.lineWidth = SHEET_BORDER;
                ctx.strokeRect(ax - SHEET_BORDER / 2, ay - SHEET_BORDER / 2, aw + SHEET_BORDER, ah + SHEET_BORDER);
                ctx.fillStyle = mark; ctx.font = '9px monospace'; ctx.textAlign = 'left';
                ctx.fillText(e.key, ax - SHEET_BORDER, ay - SHEET_BORDER - 2);
            });
            var url = cv.toDataURL('image/png');
            var a = document.createElement('a'); a.href = url; a.download = 'kicau-mania-wedding-sprite-sheet.png';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            toast('Sprite sheet diunduh. Ganti isi tiap kotak ungu, lalu upload ke asset tema (slot 1).', 4200);
        } catch (e) { toast('Gagal mengekspor sprite sheet (canvas ter-taint?).', 3500); }
    }

    init();

    /* ===== UI WIRING ===== */
    function wireUI() {
        function pickDiff(d) {
            STORE.diff = d; saveStore();
            document.querySelectorAll('.km-diff-opt').forEach(function (b) { b.classList.toggle('is-sel', b.dataset.diff === d); });
            var badge = $('km-diff-badge'); if (badge) { badge.textContent = d.toUpperCase(); badge.dataset.lvl = d; }
        }
        pickDiff(STORE.diff);
        function start() { startRun(0); }

        var ACTIONS = {
            'km-start': start,
            'km-side-open': openInvitationDirect,
            'km-cover-view': openInvitationDirect,
            'km-allpieces-view': function () { hideOverlays(); revealFullInvitation(); },
            'km-allpieces-keep': function () { hideOverlays(); resumeGame(); },
            'km-win-view': function () { hideOverlays(); revealFullInvitation(); },
            'km-win-close': function () { hideOverlays(); resumeGame(); },
            'km-view-btn': function () { if (allInfoUnlocked() || cheat.on) revealFullInvitation(); else toast('Kumpulkan semua kepingan 💌 dulu — atau tekan ★ untuk buka langsung'); },
            'km-star-btn': toggleCheat,
            'km-sfx-btn': toggleSfx,
            'km-stagesel-btn': openStageSelect,
            'km-stagesel-ok': function () { hideOverlays(); startRun(pendingStage); },
            'km-stagesel-close': function () { hideOverlays(); resumeGame(); },
            'km-reset-btn': function () { showOverlay('km-resetconfirm'); pauseGame(); },
            'km-reset-yes': function () { resetGame(); },
            'km-reset-no': function () { hideOverlays(); resumeGame(); },
            'km-briefing-go': function () { beginStage(); },
            'km-clear-next': function () { hideOverlays(); nextStage(); },
            'km-modal-close': closeModal,
            'km-reveal-close': closeReveal,
            'km-lightbox-close': function () { var lb = $('km-lightbox'); if (lb) lb.classList.remove('show'); },
            'km-tuner-btn': toggleTuner,
            'km-tuner-close': function () { var p = $('km-tuner'); if (p) p.classList.remove('show'); },
            'km-tuner-reset': resetTuner,
            'km-tuner-copy': copyTuner,
            'km-tuner-export': exportSpriteSheet
        };
        var delegated = function (e) {
            var t = e.target; if (!t || !t.closest) return;
            var diffBtn = t.closest('.km-diff-opt');
            if (diffBtn && diffBtn.dataset.diff) { pickDiff(diffBtn.dataset.diff); return; }
            for (var id in ACTIONS) { if (t.closest('#' + id)) { ACTIONS[id](); return; } }
            if (t.id === 'km-modal-root') { closeModal(); return; }
            if (t.id === 'km-lightbox') { t.classList.remove('show'); return; }
        };
        if (window.__kmDelegated) { try { document.removeEventListener('click', window.__kmDelegated, true); } catch (e) {} }
        window.__kmDelegated = delegated;
        document.addEventListener('click', delegated, true);
        onCleanup(function () { document.removeEventListener('click', delegated, true); if (window.__kmDelegated === delegated) window.__kmDelegated = null; });
        window.__kmStart = function () { try { startRun(0); } catch (e) {} };
    }

    function openInvitationDirect() { unlockAll(true); buildIndicators(); hideOverlays(); revealFullInvitation(); }

    var pendingStage = 0;
    function openStageSelect() {
        pendingStage = Math.min(runState.stage || 0, STORE.maxStage);
        var grid = $('km-stagesel-grid'); grid.innerHTML = '';
        function paintSel() { grid.querySelectorAll('.km-stagesel-cell').forEach(function (c) { c.classList.toggle('is-sel', +c.dataset.idx === pendingStage); }); }
        for (var i = 0; i < CONFIG.stages; i++) {
            (function (idx) {
                var cell = document.createElement('button');
                var unlockedStage = cheat.on || idx <= STORE.maxStage;
                var isFinale = idx === CONFIG.stages - 1;
                cell.className = 'km-stagesel-cell' + (unlockedStage ? '' : ' is-locked') + (isFinale ? ' is-boss' : '');
                cell.dataset.idx = idx; cell.type = 'button';
                var num = (idx + 1 < 10 ? '0' : '') + (idx + 1);
                cell.innerHTML = '<span class="km-stagesel-no">' + num + '</span>' +
                    '<span class="km-stagesel-name">' + esc(STAGE_NAMES[idx]) + '</span>' +
                    '<span class="km-stagesel-badge">' + (unlockedStage ? (isFinale ? '🏆 FINALE' : '▶ GO') : '🔒 TERKUNCI') + '</span>';
                if (unlockedStage) cell.addEventListener('click', function () { pendingStage = idx; paintSel(); });
                grid.appendChild(cell);
            })(i);
        }
        paintSel();
        showOverlay('km-stagesel'); pauseGame();
    }

    /* ===== INPUT — flap edge ===== */
    var input = { flap: false, flapEdge: false };
    var _prevFlap = false;
    function pollEdges() { input.flapEdge = input.flap && !_prevFlap; _prevFlap = input.flap; }
    var _inputWired = false;
    function wireInputOnce() { if (_inputWired) return; _inputWired = true; wireInput(); }
    function wireInput() {
        // keyboard
        var down = function (e) {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') { input.flap = true; if (e.code === 'Space') e.preventDefault(); }
        };
        var up = function (e) { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') input.flap = false; };
        window.addEventListener('keydown', down); window.addEventListener('keyup', up);
        onCleanup(function () { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); });

        // canvas tap / click anywhere in the stage → flap
        var stage = $('gw-stage');
        if (stage) {
            var pdown = function (e) {
                // ignore taps that hit HUD buttons (they have their own handlers)
                if (e.target && e.target.closest && (e.target.closest('.km-iconbtn') || e.target.closest('.km-overlay') || e.target.closest('.km-flapbtn') || e.target.closest('.km-hud') || e.target.closest('.km-leftbtns') || e.target.closest('.km-inv'))) return;
                input.flap = true; setTimeout(function () { input.flap = false; }, 60);
            };
            stage.addEventListener('pointerdown', pdown);
            onCleanup(function () { stage.removeEventListener('pointerdown', pdown); });
        }

        // big flap button (mobile)
        var fb = $('km-flap');
        if (fb) {
            var fon = function (e) { e.preventDefault(); input.flap = true; setTimeout(function () { input.flap = false; }, 60); };
            fb.addEventListener('touchstart', fon, { passive: false }); fb.addEventListener('mousedown', fon);
            onCleanup(function () { fb.removeEventListener('touchstart', fon); fb.removeEventListener('mousedown', fon); });
        }
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

    /* ===== RUN CONTROL ===== */
    var runState = { stage: 0, score: 0 };
    function startRun(stage) {
        showOverlay('km-loading');
        runState.stage = stage;
        if (stage === 0) runState.score = 0;
        try { window.__kmStarted = { stage: stage }; } catch (e) {}
        wireInputOnce();
        // hot-load if already live (avoid destroy+recreate race → blank)
        var sc = scene();
        if (GAME && sc && sc.loadStage) {
            if (stage > STORE.maxStage) { STORE.maxStage = stage; saveStore(); }
            if (sc.scene.isPaused()) sc.scene.resume();
            sc.score = runState.score; sc.stageIdx = stage; sc.cheatOn = cheat.on;
            if (sc.bird) sc.bird.cheat = cheat.on;
            sc.showBriefing(stage);
            return;
        }
        startWhenReady();
    }
    function resetGame() {
        resetStore();
        try { window.__kmStarted = null; } catch (e) {}
        if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__kmGame = null; }
        runState = { stage: 0, score: 0 };
        cheat.on = false;
        var sb = $('km-star-btn'); if (sb) sb.classList.remove('is-on');
        var ss = $('km-stagesel-btn'); if (ss) ss.style.display = 'none';
        scanInfos(); QUOTA = buildQuota(N()); buildIndicators(); updateProgress();
        document.querySelectorAll('.km-diff-opt').forEach(function (b) { b.classList.toggle('is-sel', b.dataset.diff === 'normal'); });
        var badge = $('km-diff-badge'); if (badge) { badge.textContent = 'NORMAL'; badge.dataset.lvl = 'normal'; }
        hideOverlays(); showOverlay('km-cover');
        toast('Game direset — pilih kesulitan & mulai lagi');
    }
    function pauseGame() { var sc = scene(); if (sc) sc.scene.pause(); }
    function resumeGame() { var sc = scene(); if (sc && sc.scene.isPaused()) sc.scene.resume(); }
    function scene() { return GAME && GAME.scene ? GAME.scene.getScene('Game') : null; }
    function beginStage() { var sc = scene(); if (sc && sc.loadStage) sc.loadStage(runState.stage); }
    function nextStage() {
        runState.stage++;
        if (runState.stage >= CONFIG.stages) return;
        if (runState.stage > STORE.maxStage) { STORE.maxStage = runState.stage; saveStore(); }
        var sc = scene(); if (sc && sc.loadStage) sc.loadStage(runState.stage);
    }

    /* ==================================================================
       PART 2 — PHASER GAME (Flappy engine). gravity ON, world scroll LEFT.
       ================================================================== */
    defineAndBoot = function () {
        var P = window.Phaser;

        function tex(scene, key, w, h, draw) {
            if (scene.textures.exists(key)) return;
            var g = scene.make.graphics({ x: 0, y: 0 }, false);
            draw(g, w, h);
            g.generateTexture(key, w, h);
            g.destroy();
        }

        function buildTextures(scene) {
            /* draw helpers — soft bubble-cartoon */
            function poly(g, pts, col, alpha) {
                g.fillStyle(col, alpha == null ? 1 : alpha);
                g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
                for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
                g.closePath(); g.fillPath();
            }
            function glow(g, cx, cy, r, col, a) {
                a = a == null ? 0.5 : a;
                for (var i = 5; i >= 1; i--) { g.fillStyle(col, a * (i / 5) * 0.5); g.fillCircle(cx, cy, r * (i / 5)); }
            }
            function outlineCircle(g, cx, cy, r, col, wdt) { g.lineStyle(wdt || 2, col, 1); g.strokeCircle(cx, cy, r); }

            /* ---- BIRD (faces RIGHT) — round kicau bird, jambul, orange beak ---- */
            function drawBird(g, wing) {
                // body
                g.fillStyle(0x1c7d4c, 1); g.fillEllipse(20, 18, 34, 28);      // dark base
                g.fillStyle(0x2fa86a, 1); g.fillEllipse(20, 16, 32, 26);      // body
                g.fillStyle(0xfff8ea, 1); g.fillEllipse(17, 20, 18, 14);      // belly
                // wing (2 poses)
                g.fillStyle(0x1c7d4c, 1);
                if (wing === 0) g.fillEllipse(14, 14, 16, 9);                 // up
                else if (wing === 1) g.fillEllipse(14, 18, 16, 10);           // mid
                else g.fillEllipse(14, 22, 15, 8);                            // down
                // head crest (jambul)
                poly(g, [[24, 4], [28, -2], [30, 6]], 0xffb020);
                // eye
                g.fillStyle(0xffffff, 1); g.fillCircle(27, 12, 5);
                g.fillStyle(0x201408, 1); g.fillCircle(28, 12, 2.6);
                g.fillStyle(0xffffff, 1); g.fillCircle(29, 11, 1);
                // beak
                poly(g, [[33, 12], [42, 15], [33, 19]], 0xffb020);
                poly(g, [[33, 16], [40, 17], [33, 20]], 0xe57a12);
                // cheek
                g.fillStyle(0xff9ec4, 0.7); g.fillCircle(24, 18, 3);
                // tail
                poly(g, [[4, 14], [-2, 10], [-2, 22], [4, 20]], 0x1c7d4c);
                // outline for read
                g.lineStyle(1.6, 0x0e3a24, 0.85); g.strokeEllipse(20, 16, 32, 26);
            }
            tex(scene, 't_bird0', 40, 34, function (g) { drawBird(g, 0); });
            tex(scene, 't_bird1', 40, 34, function (g) { drawBird(g, 1); });
            tex(scene, 't_bird2', 40, 34, function (g) { drawBird(g, 2); });
            tex(scene, 't_bird_hurt', 40, 34, function (g) {
                g.fillStyle(0xff6a6a, 1); g.fillEllipse(20, 16, 32, 26);
                g.fillStyle(0xffd0d0, 1); g.fillEllipse(17, 20, 18, 14);
                poly(g, [[33, 12], [42, 15], [33, 19]], 0xffb020);
                g.fillStyle(0xffffff, 1); g.fillCircle(27, 12, 5); g.fillStyle(0x201408, 1); g.fillCircle(28, 12, 2.6);
                // dizzy sparks
                g.fillStyle(0xfff2a0, 1); g.fillCircle(8, 4, 1.6); g.fillCircle(34, 4, 1.4); g.fillCircle(4, 26, 1.3);
                g.lineStyle(1.6, 0x8a2020, 0.9); g.strokeEllipse(20, 16, 32, 26);
            });
            tex(scene, 't_bird_gacor', 44, 38, function (g) {
                glow(g, 22, 19, 20, 0xffd447, 0.8);
                g.fillStyle(0x2fa86a, 1); g.fillEllipse(22, 19, 32, 26);
                g.fillStyle(0xfff8ea, 1); g.fillEllipse(19, 23, 18, 14);
                poly(g, [[26, 6], [30, 0], [32, 8]], 0xffd447);
                g.fillStyle(0xffffff, 1); g.fillCircle(29, 15, 5); g.fillStyle(0x201408, 1); g.fillCircle(30, 15, 2.6);
                poly(g, [[35, 15], [44, 18], [35, 22]], 0xffb020);
                // golden aura ring
                g.lineStyle(2, 0xffd447, 0.9); g.strokeEllipse(22, 19, 38, 32);
            });

            /* ---- CAGE (pipe) — golden bamboo bars, top & bottom halves ---- */
            function drawCage(g, w, h, isTop) {
                // wooden frame
                g.fillStyle(0xc79410, 1); g.fillRoundedRect(2, 0, w - 4, h, 6);
                g.fillStyle(0xffd873, 1); g.fillRoundedRect(4, 2, w - 12, h - 4, 5);
                g.fillStyle(0xe0a020, 1); g.fillRoundedRect(4, 2, 8, h - 4, 5);   // shade left
                // vertical bars
                g.lineStyle(2.5, 0xc79410, 1);
                for (var bx = 12; bx < w - 8; bx += 12) g.strokeLineShape(new P.Geom.Line(bx, 4, bx, h - 4));
                // rim ring at the gap end (dome cap)
                var capY = isTop ? h - 12 : 12;
                g.fillStyle(0x8a5a12, 1); g.fillRoundedRect(0, capY - 8, w, 16, 6);
                g.fillStyle(0xffe08a, 1); g.fillRoundedRect(2, capY - 6, w - 4, 12, 5);
                // gap-edge highlight line (readability)
                g.fillStyle(0xffffff, 0.6); g.fillRect(0, isTop ? h - 3 : 0, w, 3);
                g.lineStyle(1.6, 0x8a5a12, 0.8); g.strokeRoundedRect(2, 0, w - 4, h, 6);
            }
            tex(scene, 't_cage_top', 64, 300, function (g) { drawCage(g, 64, 300, true); });
            tex(scene, 't_cage_bot', 64, 300, function (g) { drawCage(g, 64, 300, false); });

            /* ---- HAZARDS ---- */
            tex(scene, 't_kucing', 40, 36, function (g) {
                // cat body
                g.fillStyle(0xb0824a, 1); g.fillEllipse(20, 24, 30, 20);
                g.fillStyle(0x8a5a2a, 1); g.fillEllipse(28, 14, 16, 15);       // head
                poly(g, [[22, 6], [24, -2], [28, 6]], 0x8a5a2a); poly(g, [[30, 6], [34, -2], [36, 6]], 0x8a5a2a);   // ears
                g.fillStyle(0x2fbf5a, 1); g.fillCircle(26, 13, 2.4); g.fillCircle(32, 13, 2.4);   // eyes
                g.fillStyle(0x201408, 1); g.fillCircle(26, 13, 1.1); g.fillCircle(32, 13, 1.1);
                poly(g, [[4, 22], [-4, 12], [2, 24]], 0xb0824a);              // tail
                g.lineStyle(1.4, 0x5a3a1a, 0.8); g.strokeEllipse(20, 24, 30, 20);
            });
            tex(scene, 't_lebah', 26, 24, function (g) {
                g.fillStyle(0x201408, 0.25); g.fillEllipse(6, 4, 16, 10);     // wings blur
                g.fillStyle(0xffffff, 0.55); g.fillEllipse(8, 6, 14, 8);
                g.fillStyle(0xffd447, 1); g.fillEllipse(16, 14, 18, 14);      // body
                g.fillStyle(0x201408, 1); g.fillRect(12, 8, 3, 12); g.fillRect(18, 8, 3, 12);   // stripes
                g.fillStyle(0x201408, 1); g.fillCircle(24, 12, 3);           // head
                g.fillStyle(0xffffff, 1); g.fillCircle(25, 11, 1);
                g.lineStyle(1.2, 0xc79410, 0.8); g.strokeEllipse(16, 14, 18, 14);
            });
            tex(scene, 't_ranting', 90, 20, function (g) {
                g.fillStyle(0x6a4a2a, 1); g.fillRoundedRect(0, 6, 90, 8, 4);
                g.fillStyle(0x8a5a2a, 1); g.fillRoundedRect(0, 6, 90, 4, 4);
                poly(g, [[20, 6], [14, -2], [24, 6]], 0x2fa86a); poly(g, [[60, 14], [66, 22], [56, 14]], 0x2fa86a);   // leaves
                g.lineStyle(1.2, 0x3a2410, 0.8); g.strokeRoundedRect(0, 6, 90, 8, 4);
            });

            /* ---- PIECE 💌 — mini golden cage with heart ribbon ---- */
            tex(scene, 't_piece', 34, 34, function (g) {
                glow(g, 17, 17, 16, 0xffd447, 0.6);
                g.fillStyle(0xffe08a, 1); g.fillRoundedRect(5, 8, 24, 22, 6);   // cage body
                g.lineStyle(2, 0xc79410, 1);
                for (var bx = 9; bx < 28; bx += 5) g.strokeLineShape(new P.Geom.Line(bx, 9, bx, 29));
                g.fillStyle(0xc79410, 1); g.fillRoundedRect(3, 6, 28, 5, 3);    // top bar
                // hanging hook
                g.lineStyle(2, 0xc79410, 1); g.strokeCircle(17, 4, 3);
                // heart wax seal
                g.fillStyle(0xff3d8b, 1); g.fillCircle(14, 19, 3); g.fillCircle(20, 19, 3); poly(g, [[10, 20], [24, 20], [17, 27]], 0xff3d8b);
                g.fillStyle(0xffffff, 0.8); g.fillCircle(15, 18, 1);
            });
            tex(scene, 't_notbalok', 20, 22, function (g) {
                glow(g, 10, 12, 8, 0xffd447, 0.5);
                g.fillStyle(0xff3d8b, 1); g.fillCircle(7, 17, 5);             // note head
                g.fillStyle(0xc41f66, 1); g.fillRect(11, 2, 3, 15);          // stem
                poly(g, [[14, 2], [18, 4], [14, 9]], 0xc41f66);              // flag
                g.fillStyle(0xffffff, 0.7); g.fillCircle(6, 15, 1.4);
            });

            /* ---- POWER-UPS ---- */
            tex(scene, 't_voer', 26, 26, function (g) {   // seed bowl (shield)
                glow(g, 13, 14, 12, 0x2fa86a, 0.5);
                g.fillStyle(0x8fd08a, 1); g.fillEllipse(13, 16, 22, 12);      // bowl
                g.fillStyle(0x2fa86a, 1); g.fillEllipse(13, 12, 20, 10);      // seeds
                g.fillStyle(0xffd447, 1); g.fillCircle(8, 11, 1.6); g.fillCircle(14, 10, 1.6); g.fillCircle(18, 12, 1.6); g.fillCircle(11, 13, 1.4);
                g.lineStyle(1.6, 0x1c7d4c, 0.9); g.strokeEllipse(13, 16, 22, 12);
            });
            tex(scene, 't_jangkrik', 26, 22, function (g) {   // cricket (boost)
                glow(g, 13, 11, 10, 0xffd447, 0.4);
                g.fillStyle(0x6a8a2a, 1); g.fillEllipse(14, 12, 20, 12);
                g.fillStyle(0x8aaa4a, 1); g.fillEllipse(12, 10, 16, 9);
                g.fillStyle(0x201408, 1); g.fillCircle(22, 9, 2);
                g.lineStyle(1.4, 0x3a4a10, 1); g.strokeLineShape(new P.Geom.Line(6, 12, 0, 4)); g.strokeLineShape(new P.Geom.Line(8, 14, 2, 20));   // legs
                g.lineStyle(1.4, 0x2fa86a, 0.9); g.strokeEllipse(14, 12, 20, 12);
            });
            tex(scene, 't_masteran', 28, 26, function (g) {   // speaker note (auto-flap)
                glow(g, 14, 13, 12, 0xff3d8b, 0.5);
                g.fillStyle(0x3a2410, 1); g.fillRoundedRect(4, 6, 16, 16, 4);  // speaker
                g.fillStyle(0x6a4a2a, 1); g.fillCircle(12, 14, 5);
                g.fillStyle(0xffd447, 1); g.fillCircle(12, 14, 2);
                g.fillStyle(0xff3d8b, 1); g.font = ''; // note glyphs drawn as shapes
                g.fillCircle(22, 8, 3); g.fillRect(24, -1, 2, 9);            // ♪
                g.lineStyle(1.4, 0x201408, 0.8); g.strokeRoundedRect(4, 6, 16, 16, 4);
            });

            /* ---- FX ---- */
            tex(scene, 't_feather', 10, 10, function (g) { g.fillStyle(0x2fa86a, 1); g.fillEllipse(5, 5, 8, 4); g.fillStyle(0xfff8ea, 0.8); g.fillEllipse(5, 5, 4, 2); });
            tex(scene, 't_confetti', 8, 8, function (g) { g.fillStyle(0xff3d8b, 1); g.fillRect(1, 1, 6, 6); });
            tex(scene, 't_heart', 12, 12, function (g) { glow(g, 6, 6, 5, 0xff8ab0, 0.5); g.fillStyle(0xff3d8b, 1); g.fillCircle(4, 4.4, 3.2); g.fillCircle(8, 4.4, 3.2); poly(g, [[0.8, 5.4], [11.2, 5.4], [6, 12]], 0xff3d8b); });

            /* ---- AMBIENT: butterflies (2 flap poses), notes, cloud ---- */
            function drawButterfly(g, open) {
                // body
                g.fillStyle(0x3a2410, 1); g.fillEllipse(12, 12, 3, 14);
                g.fillStyle(0x201408, 1); g.fillCircle(12, 5, 2.2);          // head
                // antennae
                g.lineStyle(1, 0x201408, 0.9);
                g.strokeLineShape(new P.Geom.Line(12, 4, 8, 0)); g.strokeLineShape(new P.Geom.Line(12, 4, 16, 0));
                var spread = open ? 1 : 0.42;                                // wing openness (flap)
                // upper wings
                g.fillStyle(0xff8ab0, 1);
                g.fillEllipse(12 - 7 * spread, 9, 12 * spread, 12);
                g.fillEllipse(12 + 7 * spread, 9, 12 * spread, 12);
                // lower wings
                g.fillStyle(0xff5c99, 1);
                g.fillEllipse(12 - 6 * spread, 17, 10 * spread, 9);
                g.fillEllipse(12 + 6 * spread, 17, 10 * spread, 9);
                // wing dots
                g.fillStyle(0xfff2c0, 0.9);
                g.fillCircle(12 - 7 * spread, 8, 1.6); g.fillCircle(12 + 7 * spread, 8, 1.6);
                g.lineStyle(1, 0xc41f66, 0.5);
                g.strokeEllipse(12 - 7 * spread, 9, 12 * spread, 12); g.strokeEllipse(12 + 7 * spread, 9, 12 * spread, 12);
            }
            tex(scene, 't_bfly0', 24, 24, function (g) { drawButterfly(g, true); });
            tex(scene, 't_bfly1', 24, 24, function (g) { drawButterfly(g, false); });
            tex(scene, 't_note', 18, 22, function (g) {
                g.fillStyle(0xff3d8b, 1); g.fillEllipse(6, 17, 9, 7);        // note head (tilted)
                g.fillStyle(0xc41f66, 1); g.fillRect(9, 3, 2.4, 13);        // stem
                poly(g, [[11, 3], [16, 6], [11, 11]], 0xff3d8b);            // flag
                g.fillStyle(0xffffff, 0.6); g.fillCircle(4, 15, 1.4);
            });
            tex(scene, 't_cloud', 120, 60, function (g) {
                g.fillStyle(0xffffff, 0.9);
                g.fillEllipse(40, 40, 56, 40); g.fillEllipse(72, 34, 60, 44); g.fillEllipse(96, 42, 44, 32);
                g.fillStyle(0xffffff, 1); g.fillEllipse(60, 46, 110, 26);
                g.fillStyle(0xd8f0e0, 0.5); g.fillEllipse(60, 52, 108, 16);  // soft under-shade
            });

            /* ---- PARALLAX (richer, layered & shaded) ---- */
            tex(scene, 't_hill', 240, 150, function (g) {
                g.fillStyle(0x5fa86a, 1); g.fillEllipse(120, 170, 270, 200);       // base hill
                g.fillStyle(0x7cc47a, 1); g.fillEllipse(120, 176, 250, 180);       // lit top
                g.fillStyle(0x8fd08a, 0.8); g.fillEllipse(96, 150, 150, 110);      // highlight
                g.fillStyle(0x4f9860, 0.5); g.fillEllipse(180, 190, 140, 130);     // shade right
                // little trees on the ridge
                for (var ti = 0; ti < 4; ti++) {
                    var tx = 46 + ti * 46;
                    g.fillStyle(0x6a4a2a, 1); g.fillRect(tx - 2, 96, 4, 20);
                    g.fillStyle(0x3fa06a, 1); g.fillCircle(tx, 92, 12);
                    g.fillStyle(0x5fc07a, 0.8); g.fillCircle(tx - 3, 88, 7);
                }
            });
            tex(scene, 't_landmark', 150, 170, function (g) {
                // gantangan: a shaded wooden pole + crossbar with hanging gold cages & birds
                g.fillStyle(0x6a4a2a, 1); g.fillRect(70, 22, 10, 146);            // pole
                g.fillStyle(0x8a6a3a, 1); g.fillRect(70, 22, 4, 146);             // pole highlight
                g.fillStyle(0x5a3a1a, 1); g.fillRoundedRect(16, 22, 118, 8, 3);   // crossbar
                g.fillStyle(0x7a5a2a, 1); g.fillRoundedRect(16, 22, 118, 3, 3);
                for (var i = 0; i < 4; i++) {
                    var lx = 30 + i * 30;
                    g.lineStyle(2, 0x5a3a1a, 1); g.strokeLineShape(new P.Geom.Line(lx, 30, lx, 50));
                    // cage body (dome top + gold body)
                    g.fillStyle(0x8a5a12, 1); g.fillRoundedRect(lx - 12, 48, 24, 6, 3);
                    g.fillStyle(0xffe08a, 1); g.fillRoundedRect(lx - 11, 52, 22, 26, 5);
                    g.fillStyle(0xffd447, 0.6); g.fillRoundedRect(lx - 11, 52, 6, 26, 5);   // sheen
                    g.lineStyle(1.4, 0xc79410, 1);
                    for (var b = -7; b <= 7; b += 4) g.strokeLineShape(new P.Geom.Line(lx + b, 54, lx + b, 76));
                    // little bird inside
                    g.fillStyle(0x2fa86a, 1); g.fillEllipse(lx, 66, 10, 8);
                    g.fillStyle(0xffb020, 1); poly(g, [[lx + 4, 65], [lx + 9, 67], [lx + 4, 69]], 0xffb020);
                    g.fillStyle(0x201408, 1); g.fillCircle(lx + 2, 64, 1.3);
                }
            });
            tex(scene, 't_bush', 80, 52, function (g) {
                // layered leafy shrub with flowers
                g.fillStyle(0x2f8a52, 1); g.fillEllipse(24, 38, 46, 30); g.fillEllipse(54, 36, 46, 32); g.fillEllipse(40, 26, 40, 30);
                g.fillStyle(0x3fa86a, 1); g.fillEllipse(24, 34, 40, 24); g.fillEllipse(54, 32, 40, 26); g.fillEllipse(40, 22, 34, 24);
                g.fillStyle(0x5fc47a, 0.85); g.fillEllipse(30, 26, 26, 16); g.fillEllipse(52, 28, 22, 14);   // top light
                // flowers
                function flower(cx, cy, col) {
                    g.fillStyle(col, 1);
                    for (var k = 0; k < 5; k++) { var a = k / 5 * 6.283; g.fillCircle(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, 2.2); }
                    g.fillStyle(0xffd447, 1); g.fillCircle(cx, cy, 1.8);
                }
                flower(18, 24, 0xff3d8b); flower(46, 20, 0xffffff); flower(62, 30, 0xff8ab0);
            });
        }

        /* boot params from real DOM size */
        var stageEl = $('gw-stage');
        if (!stageEl) { showError('Elemen #gw-stage tidak ditemukan.'); return; }
        var rect = stageEl.getBoundingClientRect();
        var BW = Math.max(320, Math.round(rect.width));
        var BH = Math.max(480, Math.round(rect.height));
        CONFIG.BW = BW; CONFIG.BH = BH;
        var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        /* death-floor at the very bottom edge (no visible "foot platform" strip) */
        CONFIG.GROUND_Y = BH - 6;
        CONFIG.CEIL_Y = 8;
        CONFIG.X_COLUMN = Math.round(BW * 0.30);

        var GameScene = makeGameScene(P, buildTextures, BW, BH);
        var config = {
            type: P.AUTO, parent: 'gw-stage', width: BW, height: BH,
            backgroundColor: '#cdeecb',
            render: { pixelArt: false, antialias: true, antialiasGL: true, roundPixels: false },
            /* ENVELOP fills the whole #gw-stage (no letterbox tan strip); slight edge
               crop is fine for a centered flappy game. FIT left a dead ground bar below. */
            scale: { mode: P.Scale.ENVELOP, autoCenter: P.Scale.CENTER_BOTH },
            physics: { default: 'arcade', arcade: { gravity: { y: CONFIG.bird.grav }, debug: false } },
            scene: [GameScene]
        };
        if (GAME) { try { GAME.destroy(true); } catch (e) {} GAME = null; }
        GAME = new P.Game(config);
        window.__kmGame = GAME;
        onCleanup(function () { try { GAME.destroy(true); } catch (e) {} GAME = null; window.__kmGame = null; });
    };

    /* ==================================================================
       PART 3 — GameScene factory (Flappy).
       ================================================================== */
    function makeGameScene(P, buildTextures, BW, BH) {
        var C = CONFIG;

        function GameScene() { P.Scene.call(this, { key: 'Game' }); }
        GameScene.prototype = Object.create(P.Scene.prototype);
        GameScene.prototype.constructor = GameScene;

        var SHEET_KEY = 't_sprite_sheet';

        GameScene.prototype.preload = function () {
            var self = this;
            var url = assetUrl('sprite_sheet');
            if (url) { try { if (self.textures.exists(SHEET_KEY)) self.textures.remove(SHEET_KEY); } catch (e) {} this.load.image(SHEET_KEY, url); }
            this.load.on('loaderror', function (file) { try { self.textures.remove(file.key); } catch (e) {} });
        };

        GameScene.prototype.sliceSpriteSheet = function () {
            usingSheetAsset = false;
            if (!this.textures.exists(SHEET_KEY)) return;
            var src = this.textures.get(SHEET_KEY).source[0];
            if (!src || !src.width) return;
            var img = src.image || src.source; if (!img) return;
            var dim = sheetLayout();
            if (src.width < dim.w * 0.5 || src.height < dim.h * 0.5) { try { this.textures.remove(SHEET_KEY); } catch (e) {} return; }
            var sxf = src.width / dim.w, syf = src.height / dim.h, self = this, made = 0;
            SHEET_MAP.forEach(function (e) {
                var r = e.rect, rx = Math.round(r[0] * sxf), ry = Math.round(r[1] * syf), rw = Math.round(r[2] * sxf), rh = Math.round(r[3] * syf);
                try {
                    var cut = document.createElement('canvas'); cut.width = rw; cut.height = rh;
                    var cctx = cut.getContext('2d'); cctx.imageSmoothingEnabled = false;
                    cctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
                    var id = cctx.getImageData(0, 0, rw, rh), d = id.data;
                    for (var p = 0; p < d.length; p += 4) { if (d[p] > 120 && d[p + 2] > 180 && d[p + 1] < 80) { d[p + 3] = 0; } }
                    cctx.putImageData(id, 0, 0);
                    var dest = document.createElement('canvas'); dest.width = e.ew; dest.height = e.eh;
                    var dctx = dest.getContext('2d'); dctx.imageSmoothingEnabled = false;
                    dctx.drawImage(cut, 0, 0, rw, rh, 0, 0, e.ew, e.eh);
                    if (self.textures.exists(e.key)) self.textures.remove(e.key);
                    self.textures.addCanvas(e.key, dest);
                    made++;
                } catch (e2) {}
            });
            usingSheetAsset = made > 0;
        };

        GameScene.prototype.create = function () {
            var self = this;
            this.sliceSpriteSheet();
            buildTextures(this);
            this.buildAnims();

            this.diff = C.diff[STORE.diff];
            this.score = runState.score || 0;
            this.cheatOn = cheat.on;
            this.freezeUntil = 0;
            this.stageIdx = runState.stage || 0;
            this.gacor = 0; this.gacorOn = false; this.gacorUntil = 0;
            this.scoreMul = 1;
            this.slowUntil = 0;         // jangkrik
            this.autoFlapUntil = 0;     // masteran
            this.GROUND_Y = C.GROUND_Y; this.CEIL_Y = C.CEIL_Y; this.X_COLUMN = C.X_COLUMN;
            this.GAP_MARGIN = C.GAP_MARGIN;

            // pools
            this.cages = this.physics.add.group({ allowGravity: false });
            this.hazards = this.physics.add.group({ allowGravity: false });
            this.pieces = this.physics.add.group({ allowGravity: false });
            this.items = this.physics.add.group({ allowGravity: false });
            this.scoregates = [];   // {x, scored} — plain data

            // particles
            this.pFeather = this.add.particles(0, 0, 't_feather', { speed: { min: 40, max: 160 }, scale: { start: 1, end: 0 }, lifespan: 600, gravityY: 200, emitting: false });
            this.pConfetti = this.add.particles(0, 0, 't_confetti', { speed: { min: -180, max: 180 }, scale: { start: 1, end: 0 }, lifespan: 900, gravityY: 120, emitting: false, tint: [0xff3d8b, 0xffd447, 0x2fa86a, 0x7cc6ff] });
            this.pHeart = this.add.particles(0, 0, 't_heart', { speed: { min: -100, max: 100 }, scale: { start: 1, end: 0 }, lifespan: 800, emitting: false });

            // (no visible ground/foot-platform strip — death-floor is the bottom edge)

            // bird
            this.bird = new Bird(this, C.X_COLUMN, BH * 0.4);
            this.add.existing(this.bird); this.physics.add.existing(this.bird);
            this.bird.init(); this.bird.cheat = this.cheatOn;

            // overlaps
            this.physics.add.overlap(this.bird, this.pieces, function (b, c) { self.collectPiece(c); });
            this.physics.add.overlap(this.bird, this.items, function (b, it) { self.collectItem(it); });
            // cages & hazards use manual sweep (fast horizontal scroll → tunnel-safe)

            this.cameras.main.setBackgroundColor('#cdeecb');

            this.events.once(P.Scenes.Events.SHUTDOWN, function () {
                self.time.removeAllEvents(); self.tweens.killAll();
                if (self.textGroup) { try { self.textGroup.destroy(true); } catch (e) {} }
            });

            this.showBriefing(this.stageIdx);
            this.updateHUD();
        };

        GameScene.prototype.buildAnims = function () {
            var mk = function (key, frames, rate) {
                if (this.anims.exists(key)) return;
                this.anims.create({ key: key, frames: frames.map(function (f) { return { key: f }; }), frameRate: rate, repeat: -1 });
            }.bind(this);
            mk('bird_flap', ['t_bird0', 't_bird1', 't_bird2', 't_bird1'], 12);
            mk('bird_glide', ['t_bird1'], 1);
            mk('bfly_flap', ['t_bfly0', 't_bfly1'], 9);   // butterfly wing flap
        };

        /* ---------- backdrop per-stage ---------- */
        GameScene.prototype.skyFor = function (idx) {
            // green-forward palettes (was yellow) — fresh sky-blue → leafy green
            var P_ = [
                { top: 0xd6f0dc, bot: 0x8fd08a },   // 1 mandi pagi (soft mint morning)
                { top: 0xbfe6ff, bot: 0x7cc47a },   // 2 arena lomba (sky → grass)
                { top: 0xcdeecb, bot: 0x5fb96a },   // 3 gantangan (fresh green)
                { top: 0xbfe0c0, bot: 0x4fa85e },   // 4 pasar (leafy)
                { top: 0xb8e6c8, bot: 0x3fa06a },   // 5 alam liar (deep green)
                { top: 0xd8f4dc, bot: 0x2fa86a }    // 6 panggung juara (vivid kicau green)
            ];
            return P_[idx] || P_[0];
        };
        GameScene.prototype.buildBackdrop = function (idx) {
            idx = idx || 0;
            if (!this.bgGroup) this.bgGroup = this.add.group();
            this.bgGroup.clear(true, true);
            var pal = this.skyFor(idx), self = this, worldW = this.worldW || 6400;
            function reg(o) { self.bgGroup.add(o); return o; }

            var sky = reg(this.add.graphics().setScrollFactor(0).setDepth(-60));
            sky.fillGradientStyle(pal.top, pal.top, pal.bot, pal.bot, 1);
            sky.fillRect(0, 0, BW, BH);

            // far hills (scrollFactor 0.2)
            for (var h = 0; h * 260 < worldW + BW; h++) {
                self.regTune(reg(this.add.image(h * 260, tuneY('hill', C.GROUND_Y - 30), 't_hill').setOrigin(0.5, 1).setScrollFactor(0.2).setDepth(-50).setAlpha(0.55).setScale(0.9 + (h % 2) * 0.3)), 'hill');
            }
            // mid landmarks (scrollFactor 0.45) — gantangan stands
            for (var m = 0; m * 900 < worldW + BW; m++) {
                self.regTune(reg(this.add.image(300 + m * 900, tuneY('landmark', C.GROUND_Y - 6), 't_landmark').setOrigin(0.5, 1).setScrollFactor(0.45).setDepth(-40).setAlpha(0.7)), 'landmark');
            }
            // near bushes (scrollFactor 0.7)
            for (var p = 0; p * 340 < worldW + BW; p++) {
                self.regTune(reg(this.add.image(120 + p * 340, tuneY('bush', C.GROUND_Y + 4), 't_bush').setOrigin(0.5, 1).setScrollFactor(0.7).setDepth(-20).setAlpha(0.9).setScale(0.8 + (p % 3) * 0.3)), 'bush');
            }
            // slow drifting clouds (screen-fixed, gentle horizontal parallax)
            this.clouds = [];
            for (var cl = 0; cl < 3; cl++) {
                var cy = 40 + cl * 46;
                var cloud = reg(this.add.image(cl * (BW / 2) + 40, cy, 't_cloud').setScrollFactor(0).setDepth(-52).setAlpha(0.7).setScale(0.7 + (cl % 2) * 0.4));
                cloud.setData('spd', 6 + cl * 3);   // px/sec
                this.clouds.push(cloud);
            }

            // ambient FLYING butterflies — flap wings + travel horizontally (real flight)
            this.flyers = [];
            for (var a = 0; a < 4; a++) {
                var fx = Math.random() * BW, fy = 70 + (a % 3) * 70;
                var bf = reg(this.add.sprite(fx, fy, 't_bfly0').setScrollFactor(0).setDepth(-8).setAlpha(0.92));
                if (bf.play) bf.play('bfly_flap');
                bf.setData('baseY', fy);
                bf.setData('spd', 26 + Math.random() * 22);      // horizontal px/sec
                bf.setData('amp', 10 + Math.random() * 14);      // bob amplitude
                bf.setData('seed', Math.random() * 6.28);
                bf.setData('dir', Math.random() < 0.5 ? 1 : -1); // fly left or right
                bf.setScale(0.75 + Math.random() * 0.4);
                this.flyers.push(bf);
            }
            // a few drifting music notes
            this.notes = [];
            for (var nn = 0; nn < 3; nn++) {
                var nt = reg(this.add.image(Math.random() * BW, 90 + nn * 80, 't_note').setScrollFactor(0).setDepth(-9).setAlpha(0.6).setScale(0.9));
                nt.setData('baseY', nt.y); nt.setData('spd', 14 + Math.random() * 12);
                nt.setData('seed', Math.random() * 6.28); nt.setData('dir', Math.random() < 0.5 ? 1 : -1);
                this.notes.push(nt);
            }
        };

        /* update ambient flyers/clouds/notes — called each frame from update() */
        GameScene.prototype.updateAmbient = function (time, delta) {
            var dt = delta / 1000, t = time / 1000;
            var flyers = this.flyers || [];
            for (var i = 0; i < flyers.length; i++) {
                var f = flyers[i]; if (!f || !f.active) continue;
                var dir = f.getData('dir');
                f.x += dir * f.getData('spd') * dt;
                f.y = f.getData('baseY') + Math.sin(t * 2 + f.getData('seed')) * f.getData('amp');
                f.setFlipX(dir < 0);
                // wrap around screen edges (screen-fixed coords)
                if (f.x > BW + 30) f.x = -30;
                else if (f.x < -30) f.x = BW + 30;
            }
            var notes = this.notes || [];
            for (var j = 0; j < notes.length; j++) {
                var n = notes[j]; if (!n || !n.active) continue;
                n.x += n.getData('dir') * n.getData('spd') * dt;
                n.y = n.getData('baseY') + Math.sin(t * 1.4 + n.getData('seed')) * 12;
                n.rotation = Math.sin(t + n.getData('seed')) * 0.25;
                if (n.x > BW + 24) n.x = -24; else if (n.x < -24) n.x = BW + 24;
            }
            var clouds = this.clouds || [];
            for (var k = 0; k < clouds.length; k++) {
                var c = clouds[k]; if (!c || !c.active) continue;
                c.x -= c.getData('spd') * dt;
                if (c.x < -c.displayWidth) c.x = BW + c.displayWidth * 0.5;
            }
        };

        /* ---------- per-stage ---------- */
        GameScene.prototype.showBriefing = function (idx) {
            var self = this;
            if (this._pausePending) { try { this._pausePending.remove(false); } catch (e) {} }
            this._pausePending = this.time.delayedCall(0, function () { self._pausePending = null; self.scene.pause(); });
            $('km-briefing-title').textContent = 'STAGE ' + (idx + 1) + ' — ' + (STAGE_NAMES[idx] || '');
            var pieces = infosForStage(idx).filter(function (i) { return !unlocked[i.key]; });
            var txt = pieces.length
                ? 'Kumpulkan ' + pieces.length + ' kepingan 💌 untuk membuka: ' + pieces.map(function (p) { return p.title; }).join(', ') + '.'
                : 'Stage bonus — kejar skor setinggi mungkin & terbang menuju garis finish!';
            if (idx === C.stages - 1) txt = 'Stage terakhir! Terbang ke Panggung Juara & jadilah juara Kicau Mania.';
            $('km-briefing-text').textContent = txt;
            // full "cara bermain" cards only on the first stage; compact brief afterwards
            var bf = $('km-briefing'); if (bf) bf.classList.toggle('is-brief', idx !== 0);
            showOverlay('km-briefing');
        };
        GameScene.prototype.loadStage = function (idx) {
            this.stageIdx = idx; runState.stage = idx;
            this.buildStage(idx);
            if (this._pausePending) { try { this._pausePending.remove(false); } catch (e) {} this._pausePending = null; }
            this.scene.resume();
            try { window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { hideOverlays(); }); }); } catch (e) { hideOverlays(); }
        };

        /* ---------- build stage: cages + hazards + pieces + finish ---------- */
        GameScene.prototype.buildStage = function (idx) {
            this._stageReady = false;
            this.cages.clear(true, true); this.hazards.clear(true, true);
            this.pieces.clear(true, true); this.items.clear(true, true);
            this.scoregates = [];
            this.tunables = [];
            this.clearSeq = null;
            this._flashRect = null;

            var hasPieces = (QUOTA[idx] || 0) > 0;
            var len = hasPieces ? 6400 : 5200;
            this.worldW = len;
            this.cameras.main.setBounds(0, 0, len, BH);
            this.cameras.main.scrollX = 0;
            this.physics.world.setBounds(0, -200, len, BH + 400);

            this.buildBackdrop(idx);

            // bird reset — at column, mid-height; small entry lock
            this.bird.setPosition(C.X_COLUMN, BH * 0.42);
            this.bird.body.setVelocity(0, 0);
            this.bird.autoFly = true;
            this.bird.invuln = 1200;
            var self = this, bd = this.bird;
            this.tweens.killTweensOf(bd);
            this.time.delayedCall(700, function () { bd.autoFly = false; });

            this.spawnList = []; this._spawnNext = 0;
            this.scrollSpeed = this.diff.scroll;
            this.stageCleared = false;
            this.lastCheckpointX = 0;   // safe respawn anchor

            this.populateStage(idx, len);
            this.finishX = len - 40;
            this.updateHUD();
            this._stageReady = true;
        };

        /* TUNABLE REGISTRY (X-scroll variant: shift Y) */
        GameScene.prototype.regTune = function (el, id) {
            if (!el) return el;
            if (!this.tunables) this.tunables = [];
            try { el.setData && el.setData('tuneId', id); } catch (e) {}
            this.tunables.push({ el: el, id: id });
            return el;
        };
        GameScene.prototype.applyLiveTune = function (id, newVal) {
            var oldVal = (TUNE[id] || 0), delta = newVal - oldVal;
            TUNE[id] = newVal; saveTune();
            if (!delta) return;
            if (id === 'bird') { if (this.bird && this.bird.active) this.bird.y += delta; return; }
            if (this.tunables) {
                this.tunables = this.tunables.filter(function (rec) {
                    var s = rec.el;
                    if (!s || (s.active === false) || (s.scene == null)) return false;
                    if (rec.id !== id) return true;
                    s.y += delta;
                    if (s.getData && s.getData('baseY') != null) s.setData('baseY', s.getData('baseY') + delta);
                    if (s.body && s.refreshBody && s.body.immovable) { try { s.refreshBody(); } catch (e2) {} }
                    return true;
                });
            }
        };

        /* record an inert spawn (born at right edge when cam reaches triggerX) */
        GameScene.prototype.recordSpawn = function (kind, x, opts) {
            this.spawnList.push({ kind: kind, x: Math.round(x), opts: opts || {} });
        };

        /* ===== GENERATOR — cages, hazards, pieces, density floor ===== */
        GameScene.prototype.populateStage = function (idx, len) {
            var self = this;
            var d = this.diff;
            var SAFE = Math.round(BW * 1.5);       // safe zone at start
            var startX = SAFE, endX = len - 400;
            var gapH = d.gapH, cageDX = d.cageDX;
            var midY = (this.CEIL_Y + this.GROUND_Y) / 2;
            var gapCenter = midY;

            // TEACH gap (super wide) just after safe zone
            this.placeCage(startX, gapCenter, gapH * 1.5);

            var pieces = infosForStage(idx).filter(function (i) { return !unlocked[i.key]; });
            var pieceXs = [];
            if (pieces.length) {
                var span = endX - startX - 600, gp = span / (pieces.length + 1);
                for (var pI = 0; pI < pieces.length; pI++) pieceXs.push(Math.round(startX + 500 + gp * (pI + 1)));
            }
            var pieceIdx = 0;

            // main cage run
            var x = startX + cageDX * 1.4;
            var minGap = this.CEIL_Y + this.GAP_MARGIN, maxGap = this.GROUND_Y - this.GAP_MARGIN;
            var z = 0;
            while (x < endX) {
                // drift gap center within band, clamp drift
                var target = gapCenter + rnd(-C.GAP_DRIFT, C.GAP_DRIFT);
                gapCenter = clamp(target, minGap + gapH / 2, maxGap - gapH / 2);
                var moving = (idx >= 2 && z % 6 === 5);   // occasional moving cage
                this.placeCage(x, gapCenter, gapH, moving);

                // piece placement: if a pieceX is near this cage, drop a piece in the NEXT gap (wide, safe)
                if (pieceIdx < pieceXs.length && x >= pieceXs[pieceIdx]) {
                    // widen this gap a touch & drop piece at its center
                    this.placePiece(x + cageDX * 0.5, gapCenter, pieces[pieceIdx].key);
                    // escort near it
                    if (idx >= 1) this.recordSpawn('kucing', x + cageDX * 0.5 + 40, {});
                    pieceIdx++;
                }

                // hazard cadence (stage >= 2): kucing / lebah / ranting between cages
                if (idx >= 1 && z % 3 === 1 && Math.random() < d.hazardRate * 0.7) {
                    var hzX = x + cageDX * 0.5;
                    var roll = Math.random();
                    if (roll < 0.45) this.recordSpawn('kucing', hzX, {});
                    else if (roll < 0.8) this.recordSpawn('lebah', hzX, { y: clamp(gapCenter + rnd(-40, 40), minGap, maxGap) });
                    else this.recordSpawn('ranting', hzX, { y: clamp(gapCenter + gapH * 0.5 + 30, minGap, maxGap) });
                }

                // reward cadence: power-up every ~4 cages, notbalok trail in gaps otherwise
                if (z % 4 === 2) {
                    var pu = ['voer', 'jangkrik', 'masteran'][z % 3];
                    this.placeItem(pu, x + cageDX * 0.5, gapCenter);
                } else if (z % 2 === 0) {
                    // notbalok trail through the gap (filler score)
                    for (var t = -1; t <= 1; t++) this.placeItem('notbalok', x + cageDX * 0.5 + t * 24, gapCenter + t * 8);
                }

                x += cageDX;
                z++;
            }

            // finish gate marker (visual) at endX
            this.finishGate = this.add.container(len - 30, this.GROUND_Y - 90);
            var pole = this.add.rectangle(0, 0, 10, 180, 0x8a5a2a).setOrigin(0.5, 1);
            var flag = this.add.triangle(6, -170, 0, 0, 44, 12, 0, 24, 0xff3d8b).setOrigin(0, 0.5);
            var cup = this.add.text(0, -178, '🏆', { fontSize: '30px' }).setOrigin(0.5);
            this.finishGate.add([pole, flag, cup]);
            this.finishGate.setDepth(-2);

            // sort spawns by x ascending
            this.spawnList.sort(function (a, b) { return a.x - b.x; });
        };

        function rnd(a, b) { return a + Math.random() * (b - a); }

        /* ===== PLACERS ===== */
        GameScene.prototype.placeCage = function (worldX, gapCenter, gapH, moving) {
            var self = this;
            var yOff = (TUNE.cage || 0);   // sprite-tuner vertical nudge
            var gc = gapCenter + yOff;
            var topBottom = gc - gapH / 2;   // y where the TOP cage ends (gap begins)
            var botTop = gc + gapH / 2;       // y where the BOTTOM cage begins
            var groundY = this.GROUND_Y + yOff;
            // top cage (image only; collision is manual via stored geom on the sprite)
            var top = this.cages.create(worldX, topBottom, 't_cage_top');
            top.setOrigin(0.5, 1); top.displayHeight = Math.max(30, topBottom); top.setDepth(1);
            top.body.setAllowGravity(false); top.body.enable = false;   // NO physics body — manual AABB
            top.setData('half', 'top');
            top.setData('cw', top.width * 0.62);   // hit half-width band
            // bottom cage (origin top)
            var bot = this.cages.create(worldX, botTop, 't_cage_bot');
            bot.setOrigin(0.5, 0); bot.displayHeight = Math.max(30, groundY - botTop); bot.setDepth(1);
            bot.body.setAllowGravity(false); bot.body.enable = false;
            bot.setData('half', 'bot');
            bot.setData('cw', bot.width * 0.62);
            this.regTune(top, 'cage'); this.regTune(bot, 'cage');

            // always link the pair + remember gap (autopilot / masteran reads this)
            top.setData('pair', bot); top.setData('gapH', gapH); top.setData('gapC', gapCenter);

            if (moving) {
                top.setData('move', true); bot.setData('move', true);
                top.setData('phase', Math.random() * 6.28);
            }
            // score gate at cage x (once)
            this.scoregates.push({ x: worldX, scored: false, cage: top });
            return top;
        };
        GameScene.prototype.placePiece = function (worldX, y, key) {
            y = clamp(y, this.CEIL_Y + 30, this.GROUND_Y - 30);
            var c = this.pieces.create(worldX, tuneY('piece', y), 't_piece');
            c.setData('kind', 'piece'); c.setData('key', key); c.setDepth(3);
            c.body.setAllowGravity(false);
            this.tweens.add({ targets: c, scaleX: 1.15, scaleY: 1.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            var ring = this.add.circle(worldX, y, 18, 0xffd447, 0).setStrokeStyle(2, 0xffd447, 0.9).setDepth(2);
            this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.out', onRepeat: function () { ring.setScale(1); ring.alpha = 1; } });
            c.setData('ring', ring);
            var sos = this.add.text(worldX, y + 26, '★', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd447', fontStyle: 'bold' }).setOrigin(0.5).setDepth(4);
            this.tweens.add({ targets: sos, alpha: 0.4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            c.setData('sos', sos);
            this.regTune(c, 'piece');
            return c;
        };
        GameScene.prototype.placeItem = function (kind, worldX, y) {
            y = clamp(y, this.CEIL_Y + 20, this.GROUND_Y - 20);
            var texKey = kind === 'notbalok' ? 't_notbalok' : ('t_' + kind);
            var tuneId = kind === 'notbalok' ? 'notbalok' : kind;
            var it = this.items.create(worldX, tuneY(tuneId, y), texKey);
            it.setData('kind', kind); it.setDepth(3);
            it.body.setAllowGravity(false);
            if (kind !== 'notbalok') this.tweens.add({ targets: it, y: y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            this.regTune(it, tuneId);
            return it;
        };

        /* spawn hazard at right edge (camera-relative) */
        GameScene.prototype.spawnHazard = function (kind, worldX, opts) {
            var edgeX = this.cameras.main.scrollX + BW + 30;
            var x = Math.max(worldX, edgeX);
            var y = opts.y;
            if (kind === 'kucing') {
                var m = this.hazards.create(x, tuneY('kucing', this.GROUND_Y - 18), 't_kucing');
                m.setOrigin(0.5, 1); m.setDepth(2);
                m.setData('type', 'kucing'); m.setData('jumped', false);
                m.body.setAllowGravity(false); m.body.setSize(28, 28);
                this.regTune(m, 'kucing');
                return m;
            } else if (kind === 'lebah') {
                if (y == null) y = BH * 0.4;
                var l = this.hazards.create(x, tuneY('lebah', y), 't_lebah');
                l.setDepth(2); l.setData('type', 'lebah'); l.setData('baseY', y); l.setData('seed', Math.random() * 6.28);
                l.body.setAllowGravity(false); l.body.setSize(18, 16);
                this.regTune(l, 'lebah');
                return l;
            } else if (kind === 'ranting') {
                if (y == null) y = BH * 0.5;
                var r = this.hazards.create(x, tuneY('ranting', y), 't_ranting');
                r.setDepth(2); r.setData('type', 'ranting');
                r.body.setAllowGravity(false); r.body.setSize(84, 10);
                this.regTune(r, 'ranting');
                return r;
            }
        };

        /* ===== PIECE / ITEM COLLECT ===== */
        GameScene.prototype.collectPiece = function (c) {
            if (!c || !c.active || c.getData('taken')) return;
            c.setData('taken', true);
            var key = c.getData('key');
            var ring = c.getData('ring'); if (ring) { this.tweens.killTweensOf(ring); ring.destroy(); }
            var sos = c.getData('sos'); if (sos) { this.tweens.killTweensOf(sos); sos.destroy(); }
            this.pHeart.explode(12, c.x, c.y); this.flash(0xffe08a, 90); this.freeze(3 * 16); SFX.collect();
            this.showKicauText();   // "KICAU KICAU KICAU MANIA" per-word + names
            var self = this;
            this.tweens.add({ targets: c, y: c.y - 40, alpha: 0, scale: 1.6, duration: 500, onComplete: function () { c.destroy(); } });
            unlockInfo(key);
            this.updateHUD();
        };
        GameScene.prototype.collectItem = function (it) {
            if (!it || !it.active) return;
            var kind = it.getData('kind');
            it.destroy(); SFX.power(); this.pConfetti.explode(6, it.x, it.y);
            if (kind === 'notbalok') { this.score += 5 * this.scoreMul; this.updateHUD(); return; }
            if (kind === 'voer') { this.bird.shield = true; toast('🥣 VOER — perisai 1× tabrakan'); }
            else if (kind === 'jangkrik') { this.slowUntil = this.time.now + 4000; this.scoreMul = 2; toast('🦗 JANGKRIK — melambat + skor ×1.5'); }
            else if (kind === 'masteran') { this.autoFlapUntil = this.time.now + 3500; toast('🎼 MASTERAN — auto-flap "gacor"!'); }
            this.updateHUD();
        };

        /* ===== "KICAU KICAU KICAU MANIA" per-word text =====
           Words STACK VERTICALLY (not on top of each other) & sit at screen
           center — clear of the top HUD + "kepingan terkumpul" toast. No names. */
        GameScene.prototype.showKicauText = function () {
            var self = this;
            if (this.textGroup) { try { this.textGroup.destroy(true); } catch (e) {} }
            var g = this.add.container(BW / 2, BH * 0.44).setScrollFactor(0).setDepth(70);
            this.textGroup = g;
            var words = ['KICAU', 'KICAU', 'KICAU', 'MANIA'];
            var rots = [-0.06, 0.05, -0.04, 0.03];
            var lineH = 40, top = -((words.length - 1) * lineH) / 2;
            words.forEach(function (w, i) {
                var big = (w === 'MANIA');
                var t = self.add.text(0, top + i * lineH, w, {
                    fontFamily: '"Arial Black","Trebuchet MS",sans-serif',
                    fontSize: (big ? 46 : 38) + 'px', fontStyle: 'bold',
                    color: big ? '#ffd447' : '#ff3d8b', stroke: '#201408', strokeThickness: 7
                }).setOrigin(0.5).setRotation(rots[i]).setScale(0.5).setAlpha(0);
                g.add(t);
                self.time.delayedCall(i * 300, function () {
                    self.tweens.add({ targets: t, scale: big ? 1.1 : 1, alpha: 1, duration: 260, ease: 'Back.out' });
                    SFX.score();
                    if (big) self.pConfetti.explode(14, BW / 2, BH * 0.44);
                });
            });
            // fade whole group out
            self.time.delayedCall(2400, function () { self.tweens.add({ targets: g, alpha: 0, duration: 600, onComplete: function () { try { g.destroy(true); } catch (e) {} if (self.textGroup === g) self.textGroup = null; } }); });
        };

        /* ===== GACOR METER ===== */
        GameScene.prototype.addGacor = function () {
            if (this.gacorOn) return;
            this.gacor++;
            var need = this.diff.gacorNeed;
            var fill = $('km-gacor-fill'); if (fill) fill.style.width = Math.min(100, this.gacor / need * 100) + '%';
            if (this.gacor >= need) this.startGacor();
        };
        GameScene.prototype.startGacor = function () {
            this.gacorOn = true; this.gacorUntil = this.time.now + C.gacorInvulnMs;
            this.scoreMul = 2; this.bird.invuln = Math.max(this.bird.invuln, C.gacorInvulnMs);
            var el = $('km-gacor'); if (el) el.classList.add('is-full');
            SFX.gacor(); toast('🔥 NGEPLONG! Kebal + skor ×2'); this.flash(0xffd447, 120);
        };
        GameScene.prototype.endGacor = function () {
            this.gacorOn = false; this.gacor = 0; this.scoreMul = (this.time.now < this.slowUntil) ? 2 : 1;
            var fill = $('km-gacor-fill'); if (fill) fill.style.width = '0%';
            var el = $('km-gacor'); if (el) el.classList.remove('is-full');
        };
        GameScene.prototype.resetGacor = function () {
            this.gacor = 0; var fill = $('km-gacor-fill'); if (fill) fill.style.width = '0%';
        };

        /* ===== JUICE ===== */
        GameScene.prototype.flash = function (color, dur) {
            var c = P.Display.Color.IntegerToColor(color);
            this.cameras.main.flash(dur || 80, c.red, c.green, c.blue);
        };
        GameScene.prototype.freeze = function (ms) { this.freezeUntil = Math.max(this.freezeUntil, this.time.now + Math.min(ms, 400)); };
        GameScene.prototype.shake = function (dur, amt) { this.cameras.main.shake(dur || 120, amt || 0.008); };
        GameScene.prototype.burstFeathers = function (x, y, n) { this.pFeather.explode(n || 6, x, y); };
        GameScene.prototype.celebrate = function (kind) {
            var self = this, reps = kind === 'finale' ? 16 : 12, n = 0;
            this.flash(0xffffff, 150);
            this.time.addEvent({ delay: 320, repeat: reps, callback: function () {
                var x = rnd(40, BW - 40), y = rnd(60, self.GROUND_Y - 60);
                self.pHeart.explode(8, x, y); self.pConfetti.explode(10, x, y);
                if (n++ % 2 === 0) SFX.score();
            } });
        };

        /* ===== bird hit (soft respawn — no game over) ===== */
        GameScene.prototype.birdHit = function () {
            var b = this.bird;
            if (b.cheat || b.invuln > 0 || this.gacorOn) return;
            if (b.shield) { b.shield = false; b.invuln = 800; this.flash(0x2fa86a, 80); SFX.power(); b.blink(); this.burstFeathers(b.x, b.y, 4); this.updateHUD(); return; }
            // soft respawn
            SFX.hit(); this.flash(0xff6a6a, 100); this.shake(140, 0.01); this.freeze(4 * 16);
            this.burstFeathers(b.x, b.y, 10);
            this.resetGacor();
            b.hurtT = 500; b.blink(); b.invuln = this.diff.invulnMs;
            // reposition to safe height at current column, zero velocity, brief world pause
            b.setPosition(this.X_COLUMN, BH * 0.42); b.body.setVelocity(0, 0);
            b.autoFly = true;
            var self = this;
            this._respawnUntil = this.time.now + 500;   // brief grace, world keeps scrolling slowly
            this.time.delayedCall(500, function () { if (b.active) b.autoFly = false; });
        };

        /* ================= UPDATE ================= */
        GameScene.prototype.update = function (time, delta) {
            // ambient life (butterflies/notes/clouds) — keep moving even while frozen/clearing
            this.updateAmbient(time, delta);
            if (time < this.freezeUntil) return;
            if (!this._stageReady) return;
            pollEdges();
            var dt = delta / 1000, cam = this.cameras.main;

            // STAGE-CLEAR OUTRO
            if (this.clearSeq) { this.updateClearSeq(time, delta); return; }

            // gacor expiry
            if (this.gacorOn && time >= this.gacorUntil) this.endGacor();
            // jangkrik slow expiry
            var slow = time < this.slowUntil;
            if (!slow && !this.gacorOn && this.scoreMul === 2) this.scoreMul = 1;

            // scroll speed (jangkrik slows world 25%)
            var spd = this.scrollSpeed * (slow ? 0.75 : 1);
            cam.scrollX = Math.min(this.worldW - BW, cam.scrollX + spd * dt);

            // camera-relative spawns (born at right edge)
            this.processSpawnPointer();

            // bird
            if (this.bird && this.bird.active) this.bird.step(time, delta);

            // moving cages
            this.updateMovingCages(time);

            // hazards
            this.updateHazards(time, delta);

            // manual cage + hazard hit-sweep (tunnel-safe)
            this.manualHits();

            // score gates
            this.updateScoreGates();

            // ground / ceiling
            this.checkBounds();

            // cull passed-left entities
            this.cullLeft();

            // finish reached?
            if (!this.stageCleared && cam.scrollX >= this.worldW - BW - 4) { this.stageCleared = true; this.onStageClear(); }
        };

        GameScene.prototype.processSpawnPointer = function () {
            if (!this.spawnList) return;
            var cam = this.cameras.main, edge = cam.scrollX + BW;
            while (this._spawnNext < this.spawnList.length && this.spawnList[this._spawnNext].x <= edge) {
                var r = this.spawnList[this._spawnNext++];
                this.spawnHazard(r.kind, r.x, r.opts);
            }
        };

        GameScene.prototype.updateMovingCages = function (time) {
            var self = this, yOff = (TUNE.cage || 0), groundY = this.GROUND_Y + yOff;
            this.cages.getChildren().forEach(function (c) {
                if (!c.active || !c.getData('move') || c.getData('half') !== 'top') return;
                var bot = c.getData('pair'); if (!bot || !bot.active) return;
                var gapH = c.getData('gapH'), phase = c.getData('phase');
                var center = clamp(c.getData('gapC') + yOff + Math.sin(time / 700 + phase) * 50, self.CEIL_Y + self.GAP_MARGIN + gapH / 2, groundY - self.GAP_MARGIN - gapH / 2);
                var topBottom = center - gapH / 2, botTop = center + gapH / 2;
                c.y = topBottom; c.displayHeight = Math.max(30, topBottom);
                bot.y = botTop; bot.displayHeight = Math.max(30, groundY - botTop);
            });
        };

        GameScene.prototype.updateHazards = function (time, delta) {
            var self = this, cam = this.cameras.main, bird = this.bird;
            this.hazards.getChildren().forEach(function (h) {
                if (!h.active) return;
                var t = h.getData('type');
                if (t === 'kucing') {
                    // telegraph: crouch, then jump when bird is near horizontally
                    if (!h.getData('jumped') && Math.abs(h.x - bird.x) < 160 && h.x > bird.x - 20) {
                        h.setData('jumped', true);
                        self.tweens.add({ targets: h, y: h.y - 120, duration: 420, yoyo: true, ease: 'Quad.out' });
                    }
                } else if (t === 'lebah') {
                    h.y = h.getData('baseY') + Math.sin(time / 400 + h.getData('seed')) * 30;
                }
            });
        };

        /* ===== AUTOPILOT (MASTERAN) — steer toward the next gap, dodge hazards =====
           Returns the Y the bird should aim for right now (gap center of the nearest
           cage ahead, biased away from any hazard close in front). */
        GameScene.prototype.autoTargetY = function () {
            var bird = this.bird, bx = bird.x;
            // 1) nearest cage pair ahead (top-half sprite, still to the right of bird)
            var best = null, bestDX = 1e9;
            var cs = this.cages.getChildren();
            for (var i = 0; i < cs.length; i++) {
                var c = cs[i];
                if (!c.active || c.getData('half') !== 'top') continue;
                var dx = c.x - bx;
                if (dx < -20 || dx > bestDX) continue;   // behind us, or farther than current best
                if (dx < bestDX) { best = c; bestDX = dx; }
            }
            var targetY;
            if (best) {
                var bot = best.getData('pair');
                // live gap center: between top-cage bottom (best.y) and bottom-cage top (bot.y)
                if (bot && bot.active) targetY = (best.y + bot.y) / 2;
                else targetY = best.getData('gapC') + (TUNE.cage || 0);
            } else {
                targetY = BH * 0.42;   // no cage in sight → cruise mid-height
            }
            // 2) dodge: if a hazard is close ahead & near our lane, bias away from it
            var hs = this.hazards.getChildren();
            for (var j = 0; j < hs.length; j++) {
                var h = hs[j]; if (!h.active) continue;
                var hdx = h.x - bx;
                if (hdx > -10 && hdx < 130 && Math.abs(h.y - bird.y) < 70) {
                    targetY += (bird.y <= h.y ? -46 : 46);   // steer to the side the bird is already on
                }
            }
            return clamp(targetY, this.CEIL_Y + 24, this.GROUND_Y - 28);
        };

        GameScene.prototype.manualHits = function () {
            var self = this, bird = this.bird;
            if (!bird || !bird.active) return;
            if (bird.cheat || bird.invuln > 0 || this.gacorOn) return;
            var bb = bird.body;
            var bL = bb.left, bR = bb.right, bT = bb.top, bB = bb.bottom;
            // cages — hit-rect from sprite geometry (origin-aware), not physics body
            var cs = this.cages.getChildren();
            for (var i = 0; i < cs.length; i++) {
                var c = cs[i]; if (!c.active) continue;
                var cw = c.getData('cw') || (c.width * 0.62);
                var cL = c.x - cw / 2, cR = c.x + cw / 2;
                var cT, cB;
                if (c.getData('half') === 'top') { cB = c.y; cT = c.y - c.displayHeight; }   // origin (0.5,1)
                else { cT = c.y; cB = c.y + c.displayHeight; }                                // origin (0.5,0)
                if (bR > cL + 3 && bL < cR - 3 && bB > cT + 3 && bT < cB - 3) { this.birdHit(); return; }
            }
            // hazards — physics bodies
            var hs = this.hazards.getChildren();
            for (var j = 0; j < hs.length; j++) {
                var h = hs[j]; if (!h.active || !h.body) continue;
                var hb = h.body;
                if (bR > hb.left + 2 && bL < hb.right - 2 && bB > hb.top + 2 && bT < hb.bottom - 2) { this.birdHit(); return; }
            }
        };

        GameScene.prototype.updateScoreGates = function () {
            var bx = this.bird.x, self = this;
            this.scoregates.forEach(function (g) {
                if (g.scored) return;
                if (bx > g.x) {
                    g.scored = true;
                    self.score += 1 * self.scoreMul; SFX.score();
                    self.addGacor();
                    self.lastCheckpointX = g.x;
                    self.updateHUD();
                }
            });
        };

        GameScene.prototype.checkBounds = function () {
            var b = this.bird; if (!b || !b.active || b.autoFly) return;
            // ceiling: soft bounce (no die)
            if (b.y < this.CEIL_Y + 8) { b.y = this.CEIL_Y + 8; if (b.body.velocity.y < 0) b.body.setVelocityY(40); }
            // ground: hit
            if (b.y > this.GROUND_Y - 6) { this.birdHit(); b.y = this.GROUND_Y - 20; }
        };

        GameScene.prototype.cullLeft = function () {
            var leftX = this.cameras.main.scrollX - 80, self = this;
            this.cages.getChildren().forEach(function (c) { if (c.active && c.x < leftX) c.destroy(); });
            this.hazards.getChildren().forEach(function (h) { if (h.active && h.x < leftX) h.destroy(); });
            this.pieces.getChildren().forEach(function (p) { if (p.active && p.x < leftX) { var ring = p.getData('ring'); if (ring) ring.destroy(); var sos = p.getData('sos'); if (sos) sos.destroy(); p.destroy(); } });
            this.items.getChildren().forEach(function (it) { if (it.active && it.x < leftX) it.destroy(); });
        };

        /* ===== STAGE CLEAR (cinematic) ===== */
        GameScene.prototype.onStageClear = function () {
            if (this.stageIdx + 1 >= C.stages) {
                // final stage → finale
                this.scene.pause();
                this.showWinBanner();
                finaleReached();
                return;
            }
            runState.score = this.score;
            this.scrollSpeed = 0;
            this.bird.invuln = 999999;
            this.showStageClearBanner();
            this.clearSeq = { phase: 'banner', t: 0 };
            SFX.win();
        };
        GameScene.prototype.showStageClearBanner = function () {
            if (this.clearBanner) { try { this.clearBanner.destroy(true); } catch (e) {} }
            var g = this.add.container(BW / 2, BH * 0.36).setScrollFactor(0).setDepth(60);
            var title = this.add.text(0, 0, 'STAGE CLEAR', { fontFamily: '"Arial Black",sans-serif', fontSize: '34px', color: '#ff3d8b', fontStyle: 'bold', stroke: '#fff', strokeThickness: 6 }).setOrigin(0.5);
            var sub = this.add.text(0, 40, 'STAGE ' + (this.stageIdx + 1) + ' — ' + (STAGE_NAMES[this.stageIdx] || ''), { fontFamily: 'monospace', fontSize: '14px', color: '#3a2410', fontStyle: 'bold' }).setOrigin(0.5);
            var sc = this.add.text(0, 64, 'SKOR ' + pad6(this.score), { fontFamily: 'monospace', fontSize: '13px', color: '#c41f66' }).setOrigin(0.5);
            g.add([title, sub, sc]); g.setScale(0.6).setAlpha(0);
            this.tweens.add({ targets: g, scale: 1, alpha: 1, duration: 320, ease: 'Back.out' });
            this.clearBanner = g;
        };
        GameScene.prototype.showWinBanner = function () {
            if (this.winBanner) { try { this.winBanner.destroy(true); } catch (e) {} }
            var g = this.add.container(BW / 2, BH * 0.32).setScrollFactor(0).setDepth(60);
            var title = this.add.text(0, 0, 'JUARA!', { fontFamily: '"Arial Black",sans-serif', fontSize: '46px', color: '#ffd447', fontStyle: 'bold', stroke: '#201408', strokeThickness: 7 }).setOrigin(0.5);
            var sub = this.add.text(0, 46, '★ JUARA KICAU MANIA ★', { fontFamily: 'monospace', fontSize: '15px', color: '#ff3d8b', fontStyle: 'bold' }).setOrigin(0.5);
            var sc = this.add.text(0, 70, 'Undangan siap dibuka!', { fontFamily: 'monospace', fontSize: '13px', color: '#3a2410' }).setOrigin(0.5);
            g.add([title, sub, sc]); g.setScale(0.6).setAlpha(0);
            this.tweens.add({ targets: g, scale: 1, alpha: 1, duration: 360, ease: 'Back.out' });
            this.pConfetti.explode(40, BW / 2, BH * 0.3);
            this.tweens.add({ targets: g, alpha: 0, duration: 600, delay: 3400, onComplete: function () { try { g.destroy(true); } catch (e) {} } });
            this.winBanner = g;
        };
        GameScene.prototype.updateClearSeq = function (time, delta) {
            var seq = this.clearSeq; if (!seq) return;
            seq.t += delta;
            var b = this.bird;
            if (seq.phase === 'banner') {
                // bird gently flaps up and flies off to the right
                if (b && b.body) { b.body.setVelocity(140, -40); b.setAngle(-10); if (b.play) b.play('bird_flap', true); }
                if (seq.t >= 1000) { seq.phase = 'fly'; }
            } else if (seq.phase === 'fly') {
                if (b && b.body) { b.body.setVelocity(360, -30); }
                if ((b && b.x > this.cameras.main.scrollX + BW + 60) || seq.t > 2600) { seq.phase = 'done'; }
            } else if (seq.phase === 'done') {
                this.clearSeq = null;
                if (this.clearBanner) { try { this.clearBanner.destroy(true); } catch (e) {} this.clearBanner = null; }
                if (b) { b.autoFly = false; b.invuln = 0; }
                nextStage();
            }
        };

        /* ================= HUD ================= */
        GameScene.prototype.updateHUD = function () {
            var sc = $('km-score'); if (sc) sc.textContent = pad6(this.score);
            if (this.score > (STORE.best || 0)) { STORE.best = this.score; saveStore(); }
            var ar = $('km-area'); if (ar) ar.textContent = String(this.stageIdx + 1);
            var pn = $('km-power-name'), pe = $('km-power-extra'), pi = $('km-power-ico');
            if (pn) {
                var nm = 'SIAP', ic = '🐦', ex = '';
                if (this.gacorOn) { nm = 'NGEPLONG'; ic = '🔥'; ex = '×2'; }
                else if (this.time.now < this.autoFlapUntil) { nm = 'MASTERAN'; ic = '🎼'; }
                else if (this.time.now < this.slowUntil) { nm = 'JANGKRIK'; ic = '🦗'; ex = '×2'; }
                else if (this.bird && this.bird.shield) { nm = 'VOER'; ic = '🥣'; ex = '🛡'; }
                pn.textContent = nm; if (pi) pi.textContent = ic; if (pe) pe.textContent = ex;
            }
        };

        function pad6(n) { n = Math.max(0, Math.floor(n)); var s = String(n); while (s.length < 6) s = '0' + s; return s; }

        /* ===================================================================
           BIRD — extends Arcade.Sprite, gravity ON, tap-to-flap.
           =================================================================== */
        function Bird(scene, x, y) { P.Physics.Arcade.Sprite.call(this, scene, x, y, 't_bird1'); this.scene = scene; }
        Bird.prototype = Object.create(P.Physics.Arcade.Sprite.prototype);
        Bird.prototype.constructor = Bird;
        Bird.prototype.init = function () {
            this.body.setAllowGravity(true);
            this.body.setSize(C.bird.w, C.bird.h);
            this.body.setOffset((this.width - C.bird.w) / 2, (this.height - C.bird.h) / 2);
            this.invuln = 0; this.hurtT = 0; this.cheat = false; this.shield = false;
            this.lastFlap = 0; this.autoFly = false;
            this.setDepth(5);
            if (this.play) this.play('bird_flap');
        };
        Bird.prototype.blink = function () {
            var self = this; this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 80, yoyo: true, repeat: 6, onComplete: function () { self.alpha = 1; } });
        };
        Bird.prototype.doFlap = function () {
            this.body.setVelocityY(C.bird.flap);
            this.lastFlap = this.scene.time.now;
            SFX.flap();
            this.scene.burstFeathers(this.x - 12, this.y + 6, 2);
            // squash-stretch
            this.setScale(1, 1); this.scene.tweens.add({ targets: this, scaleY: 1.16, scaleX: 0.92, duration: 90, yoyo: true });
        };
        Bird.prototype.step = function (time, delta) {
            var sc = this.scene;
            if (this.invuln > 0) this.invuln -= delta;
            if (this.hurtT > 0) this.hurtT -= delta;

            // world position: bird stays in the camera column
            this.x = sc.cameras.main.scrollX + sc.X_COLUMN;

            if (this.autoFly) {
                if (this.play) this.play('bird_flap', true);
                this.setAngle(-6);
                // keep sane Y band during entry
                this.y = clamp(this.y, sc.CEIL_Y + 20, sc.GROUND_Y - 30);
                return;
            }

            // MASTERAN auto-flap — smart autopilot: aim for the next gap & dodge hazards
            if (time < sc.autoFlapUntil) {
                var targetY = sc.autoTargetY ? sc.autoTargetY() : (sc.GROUND_Y + sc.CEIL_Y) / 2;
                var vy = this.body.velocity.y;
                // predict where we'll be shortly; flap only when we're at/below the target
                // and not already rising fast enough — avoids the "random tapping" look.
                var lead = this.y + vy * 0.18;               // ~180ms lookahead
                var canFlap = (time - this.lastFlap) >= C.bird.flapCooldown;
                if (canFlap && lead > targetY + 6 && vy > -120) this.doFlap();
            } else {
                // manual flap
                if (input.flapEdge && (time - this.lastFlap) >= C.bird.flapCooldown) this.doFlap();
            }

            // clamp fall speed
            if (this.body.velocity.y > C.bird.maxFall) this.body.setVelocityY(C.bird.maxFall);

            // tilt follows vy
            var vy = this.body.velocity.y;
            var targetAngle = vy < 0 ? C.bird.tiltUp : clamp(vy / C.bird.maxFall * C.bird.tiltDown, 0, C.bird.tiltDown);
            this.setAngle(this.angle + (targetAngle - this.angle) * 0.2);

            // texture: gacor / hurt / normal (anim runs on frames)
            if (sc.gacorOn) this.setTexture('t_bird_gacor');
            else if (this.hurtT > 0) this.setTexture('t_bird_hurt');
            else if (this.anims && !this.anims.isPlaying) this.play('bird_flap', true);
        };

        return GameScene;
    }

})();
