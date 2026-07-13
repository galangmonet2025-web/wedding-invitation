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
    var VERSION = 'v1.4.0';   // FIXES: stage-1 instant-clear guard (_sectorReady); boss approach
    // enemies spread across the whole climb (no ~20s empty gap); boss core auto-opens after
    // activation so HP actually drops (phase 1→2 was unreachable); capsule beacon 💌→★ (was
    // mistaken for the collectible); side-menu re-paint on host re-injection (MutationObserver).
    // ---
    // v1.3.0 ART OVERHAUL: render SMOOTH (pixelArt:false, antialias ON); all
    // procedural sprites rewritten semi-realistic via draw helpers (vgrad/glow/poly/metalBody) —
    // gradient metal bodies, soft glows, rim light. Distinct projectiles, detailed enemies/boss,
    // richer nebula/planet/wreck/station backdrop. Some sprites enlarged (SHEET_MAP ew/eh updated in
    // lockstep). Gameplay, hitboxes, host contract, tuner UNCHANGED. (See git history for v1.0–v1.2.)
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
            easy:   { scroll: 90,  minEnemies: 3, ebulletSpd: 180, invulnMs: 1100, tellAdd: 0.2, capFreq: 1.3, bossTTK: 11 },
            normal: { scroll: 110, minEnemies: 4, ebulletSpd: 220, invulnMs: 900,  tellAdd: 0.0, capFreq: 1.0, bossTTK: 15 },
            hard:   { scroll: 135, minEnemies: 6, ebulletSpd: 270, invulnMs: 700,  tellAdd: -0.1, capFreq: 0.7, bossTTK: 19 }
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

    /* =================================================================
       ASSET ADJUSTER — SHEET_MAP (single source of truth for BOTH the PNG
       exporter and the upload loader). One ordered list of the game's
       procedural texture keys; a deterministic packer computes each frame's
       [x,y,w,h] rect on the sheet. The EXPORTER draws the game's textures into
       these rects + a PURPLE border per cell (a guide the user replaces art
       inside). The LOADER slices the uploaded PNG at the SAME rects, KEYS OUT
       the purple border, and bakes each cell back into its texture key — so
       every existing create/scale/anim call uses the new art unchanged.
       COORDS MUST be identical on both sides → both call sheetLayout().
       ================================================================= */
    var SHEET_BORDER = 2;            // purple guide-border thickness (px)
    var SHEET_PAD = 10;             // outer margin + gap around each cell (px)
    var SHEET_LABEL = 14;           // label strip height above each row (px)
    var SHEET_MARK = { r: 160, g: 0, b: 255 };   // purple marker #a000ff (key-out target)
    // ORDER = engine texture keys to expose for replacement. ew/eh = native texture size
    // (1:1 → slice lands exactly on the procedural size). Grouped per category, one cell each.
    var SHEET_MAP = [
        // ship poses (multi-frame anim group)
        { key: 't_ship0', ew: 36, eh: 50 }, { key: 't_ship1', ew: 36, eh: 50 }, { key: 't_ship2', ew: 36, eh: 50 },
        { key: 't_ship', ew: 36, eh: 50 }, { key: 't_ship_hurt', ew: 36, eh: 50 },
        // enemies
        { key: 't_e_drone', ew: 26, eh: 34 }, { key: 't_e_turret', ew: 28, eh: 34 }, { key: 't_e_korvet', ew: 30, eh: 44 },
        { key: 't_e_flyer', ew: 22, eh: 30 }, { key: 't_e_carrier', ew: 44, eh: 64 }, { key: 't_e_mech', ew: 40, eh: 56 },
        { key: 't_e_mine', ew: 22, eh: 22 },
        // boss + reward couple
        { key: 't_boss', ew: 220, eh: 170 }, { key: 't_couple', ew: 60, eh: 80 },
        // hazards + items
        { key: 't_asteroid', ew: 40, eh: 38 }, { key: 't_asteroid_s', ew: 22, eh: 20 }, { key: 't_barel', ew: 26, eh: 30 },
        { key: 't_lasergate', ew: 200, eh: 16 }, { key: 't_capsule_blue', ew: 22, eh: 16 }, { key: 't_amplop', ew: 30, eh: 24 },
        // projectiles + fx
        { key: 't_pbullet', ew: 8, eh: 18 }, { key: 't_laser', ew: 7, eh: 30 }, { key: 't_pmissile', ew: 10, eh: 18 },
        { key: 't_ebullet', ew: 11, eh: 11 }, { key: 't_erocket', ew: 10, eh: 20 }, { key: 't_spark', ew: 8, eh: 8 }, { key: 't_heart', ew: 12, eh: 12 },
        // parallax structures
        { key: 't_planet', ew: 200, eh: 200 }, { key: 't_wreck', ew: 160, eh: 90 }, { key: 't_station', ew: 180, eh: 200 }
    ];
    var SHEET_W = 900;   // sheet width; packer wraps rows within this
    // Deterministic shelf-packer → fills `rect` ([x,y,w,h] of the ART area, inside the border)
    // on each SHEET_MAP entry, and returns total sheet {w,h}. Same call both sides.
    function sheetLayout() {
        var x = SHEET_PAD, y = SHEET_PAD + SHEET_LABEL, rowH = 0, maxX = 0;
        for (var i = 0; i < SHEET_MAP.length; i++) {
            var e = SHEET_MAP[i];
            var cellW = e.ew + SHEET_BORDER * 2, cellH = e.eh + SHEET_BORDER * 2;
            if (x + cellW + SHEET_PAD > SHEET_W && x > SHEET_PAD) {   // wrap row
                x = SHEET_PAD; y += rowH + SHEET_PAD + SHEET_LABEL; rowH = 0;
            }
            // ART rect = inside the purple border
            e.rect = [x + SHEET_BORDER, y + SHEET_BORDER, e.ew, e.eh];
            x += cellW + SHEET_PAD;
            if (cellH > rowH) rowH = cellH;
            if (x > maxX) maxX = x;
        }
        return { w: SHEET_W, h: y + rowH + SHEET_PAD };
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
       SPRITE TUNER (PC dev tool) — per-sprite-type vertical offset (px).
       Negative = naik (up), positive = turun (down). Read at every spawn
       anchor via tuneY(); slider changes apply LIVE to existing sprites and
       persist to localStorage so the user can read off final values + send
       them back to bake in. Game keeps running while the panel is open.
       Same access pattern as metalslug-wedding: hidden ✦ in the side badge.
       ================================================================= */
    var TUNE_KEY = 'sww_tune_v1';
    // BAKED DEFAULTS (start from these, then layer any per-device localStorage tweak on top).
    var TUNE_DEFAULTS = {
        ship: 0, capsule: 0, power: 0,
        drone: 0, turret: 0, korvet: 0, flyer: 0, carrier: 0, mech: 0, mine: 0, boss: 0,
        asteroid: 0, barel: 0, laser: 0,
        couple: 0, planet: 0, landmark: 0, star: 0, debris: 0
    };
    // display order + label + the engine tuneId whose LIVE sprites get nudged when the slider moves.
    var TUNE_SPECS = [
        // — Karakter / item —
        { id: 'ship',     label: 'Kapal (Player)' },
        { id: 'capsule',  label: 'Kapsul 💌 (Kepingan)' },
        { id: 'power',    label: 'Kapsul Power (Biru)' },
        // — Musuh —
        { id: 'drone',    label: 'Drone' },
        { id: 'turret',   label: 'Turret' },
        { id: 'korvet',   label: 'Korvet' },
        { id: 'flyer',    label: 'Flyer' },
        { id: 'carrier',  label: 'Carrier' },
        { id: 'mech',     label: 'Mech' },
        { id: 'mine',     label: 'Ranjau (Mine)' },
        { id: 'boss',     label: 'Boss (Stasiun)' },
        // — Hazard —
        { id: 'asteroid', label: 'Asteroid' },
        { id: 'barel',    label: 'Barel Peledak' },
        { id: 'laser',    label: 'Gerbang Laser' },
        // — Struktur / parallax —
        { id: 'couple',   label: 'Mempelai (Reward)' },
        { id: 'planet',   label: 'Planet' },
        { id: 'landmark', label: 'Landmark / Stasiun' },
        { id: 'star',     label: 'Bintang (bg)' },
        { id: 'debris',   label: 'Debris / Asteroid kecil' }
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
    // apply an offset to a spawn Y. `id` = TUNE_SPECS id.
    function tuneY(id, y) { return y + (TUNE[id] || 0); }

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
    // DUPLICATE-ID GUARD: the host reads submitted RSVP/wish values via
    // container.querySelector('#<id>') = FIRST match in DOM. #inv-source (hidden
    // source) precedes the reveal/modal clones, so WITHOUT this the host would read
    // the empty hidden inputs and reveal the wrong thank-you card. Keep host IDs on
    // the VISIBLE clone only: clone first (inherits IDs), then strip IDs from
    // #inv-source, and restore them when the view closes (so the next clone gets IDs).
    var HOST_IDS = ['btn-submit-kehadiran', 'rsvp-form', 'rsvp-status', 'rsvp-guests', 'rsvp-code', 'guest-name-input', 'alert-submit-kehadiran',
        'btn-submit-ucapan', 'wish-form', 'wish-name', 'wish-message', 'alert-submit-ucapan',
        'tm-countdown-days', 'tm-countdown-hours', 'tm-countdown-minutes', 'tm-countdown-seconds'];
    function setSourceHostIds(enabled) {
        var src = $('inv-source'); if (!src) return;
        HOST_IDS.forEach(function (id) {
            if (!enabled) {
                var els = src.querySelectorAll('#' + id);
                Array.prototype.forEach.call(els, function (el) { el.setAttribute('data-swid', id); el.removeAttribute('id'); });
            } else {
                var els2 = src.querySelectorAll('[data-swid="' + id + '"]');
                Array.prototype.forEach.call(els2, function (el) { el.setAttribute('id', id); el.removeAttribute('data-swid'); });
            }
        });
    }

    function openPieceModal(key) {
        // close the full reveal first so only ONE clone carrying host IDs exists at a time
        closeReveal();
        var src = document.querySelector('#inv-source > section[data-info="' + key + '"]');
        if (!src) return;
        var body = $('sw-modal-body'), title = $('sw-modal-title');
        title.textContent = (SECTION_TITLE[key] || key).toUpperCase();
        body.innerHTML = '';
        var clone = src.cloneNode(true);   // clone carries host IDs
        clone.style.display = '';
        hydrateImages(clone);
        body.appendChild(clone);
        setSourceHostIds(false);           // strip IDs from #inv-source → clone is sole match
        rewireHostFormsInside(body);
        rewireGalleryInside(body);
        $('sw-modal-root').classList.add('show');
    }
    function closeModal() {
        $('sw-modal-root').classList.remove('show');
        var body = $('sw-modal-body'); if (body) body.innerHTML = '';
        setSourceHostIds(true);            // restore IDs so a later clone gets them
    }

    function revealFullInvitation() {
        // close any open piece modal first so only ONE clone with host IDs exists
        closeModal();
        var scroll = $('sw-reveal-scroll');
        scroll.innerHTML = '';
        INFOS.forEach(function (info) {
            var clone = info.el.cloneNode(true);   // clone carries host IDs
            clone.style.display = '';
            hydrateImages(clone);
            scroll.appendChild(clone);
        });
        setSourceHostIds(false);           // strip IDs from #inv-source → visible clone is sole match
        rewireHostFormsInside(scroll);
        rewireGalleryInside(scroll);
        $('sw-reveal').classList.add('show');
        setMusic(true);   // mirror music intent ON when invitation opens
    }
    function closeReveal() {
        var wasShown = $('sw-reveal').classList.contains('show');
        $('sw-reveal').classList.remove('show');
        var scroll = $('sw-reveal-scroll'); if (scroll) scroll.innerHTML = '';
        if (wasShown) setSourceHostIds(true);   // restore IDs so a later clone gets them
        // REVIVE THE GAME on return. Opening the invitation calls setMusic(true) → clicks the
        // hidden #btn-toggle-music → the host flips isPlaying → host RE-INJECTS this whole theme
        // (DOM+JS), which runs __gwCleanup() → GAME.destroy(); but init()'s auto-resume is SKIPPED
        // while #sw-reveal is open. So after the reveal closes the canvas can be dead/blank. Here
        // we explicitly bring the game back: re-boot if it was torn down, else just resume.
        try {
            if (window.__swStarted) {
                var sc = scene();
                if (!GAME || !sc) {
                    var rs = window.__swStarted;
                    startRun((rs && rs.sector) || 0);
                } else if (sc.scene.isPaused()) {
                    sc.scene.resume();
                }
            }
        } catch (e) {}
    }

    function hydrateImages(root) {
        var bgs = root.querySelectorAll('.sw-hero-bg[data-src], .sw-closing-bg[data-src]');
        bgs.forEach(function (bg) {
            var u = bg.getAttribute('data-src');
            if (u && u.indexOf('{{') !== 0) bg.style.backgroundImage = "url('" + u + "')";
        });
    }

    /* RSVP + wishes are handled entirely by the HOST (ThemeWrapper): it intercepts
       #btn-submit-kehadiran / #btn-submit-ucapan (delegated on the theme container),
       calls the backend, hides the form, reveals the thank-you card, and prepends the
       new wish. We must NOT bind a local fallback here or the click is handled twice.
       Kept as a no-op so existing callers don't break. */
    function rewireHostFormsInside(root) { /* host-owned; no local handler */ }
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
        // ALWAYS play the celebration + show the #sw-win dialog after a beat — NEVER open the
        // invitation immediately. (Previously, once STORE.completed was true from a prior win,
        // this early-returned into revealFullInvitation() with no delay, so every replay skipped
        // straight to the invitation — "boss mati langsung buka undangan". The delayed dialog is
        // the ONLY path now; the guest still chooses buka/tutup.)
        STORE.completed = true; saveStore();
        var sc = scene(); if (sc && sc.celebrate) sc.celebrate('boss');
        setTimeout(function () {
            var t = $('sw-win-text');
            if (t) t.innerHTML = 'Selamat! Dua bintang telah disatukan — ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'kini berlayar bersama menembus galaksi. Terima kasih sudah menuntaskan misinya. ' +
                'Buka undangannya sekarang, atau tutup dialog ini dulu.';
            showOverlay('sw-win');
        }, 4000);   // jeda 4 detik: biar efek meriah (couple naik + confetti + banner) tampil dulu, baru dialog buka/tutup
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
       The sidebar SFX button toggles `sfxMuted` (persisted). When muted, blip()
       is a no-op so every game sound (shoot/explode/collect/…) is silenced — the
       tenant backsound is untouched (host owns that, separate hidden button).
       ================================================================= */
    var SFX_MUTE_KEY = 'sww_sfx_muted';
    var sfxMuted = (function () { try { return localStorage.getItem(SFX_MUTE_KEY) === '1'; } catch (e) { return false; } })();
    function reflectSfxIcon() {
        var on = $('sw-sfx-on'), off = $('sw-sfx-off');
        if (on) on.style.display = sfxMuted ? 'none' : '';
        if (off) off.style.display = sfxMuted ? '' : 'none';
        var btn = $('sw-sfx-btn'); if (btn) btn.classList.toggle('is-muted', sfxMuted);
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
        if (sfxMuted) return;                 // SFX muted → silence every game sound
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
    var usingSheetAsset = false;   // true once the uploaded adjuster sheet sliced successfully
    function startWhenReady() {
        ensurePhaser(function () {
            if (!window.Phaser) { showError('Phaser tidak termuat (timeout).'); return; }
            defineAndBoot();
        });
    }

    /* Re-paint the one-shot side-menu visuals (right-panel couple canvas, side
       background photo, invitation-chip badges, version, progress). These are drawn
       once at init() and are wiped whenever the HOST re-injects the theme HTML
       (every guest RSVP/wish submit, new wish appended to the list, language switch),
       because the host does NOT re-run theme JS on an htmlBase change. Idempotent —
       safe to call any number of times. */
    function repaintSideMenu() {
        try { buildIndicators(); } catch (e) {}
        try { drawCoupleCanvas(); } catch (e) {}
        try { paintSideBg(); } catch (e) {}
        try { var v = $('sw-version'); if (v) v.textContent = VERSION; } catch (e) {}
        try { updateProgress(); } catch (e) {}
        // restore toggle-button states wiped by the fresh HTML
        try {
            var sb = $('sw-star-btn'); if (sb) sb.classList.toggle('is-on', !!(cheat && cheat.on));
            var ss = $('sw-stagesel-btn'); if (ss) ss.style.display = (cheat && cheat.on) ? '' : 'none';
        } catch (e) {}
        try { if (typeof reflectSfxIcon === 'function') reflectSfxIcon(); } catch (e) {}
    }

    /* HOST RE-INJECTION RECOVERY (see memories retromario-reinject-toolbar /
       metalslug-reinject-detached-canvas). The host replaces the theme DOM in place
       on every htmlBase change but never re-runs this JS, so the freshly-injected
       side-menu comes back BLANK: an empty #sw-couple-canvas, an empty #sw-inv, a
       photo-less #sw-side-bg. That's the "sprites appear, blink once, then vanish"
       bug. We observe a stable host ancestor (the parent of .sw-shell, which persists
       while its children are swapped) and re-paint when our nodes are replaced. */
    function wireReinjectRecovery() {
        if (typeof MutationObserver !== 'function') return;
        var shell = document.querySelector('.sw-shell');
        // Observe the persistent host container ABOVE .sw-shell (that div stays; only
        // its innerHTML is replaced). Fall back to body if we can't find it.
        var host = (shell && shell.parentNode) || document.body;
        if (!host) return;
        // Guard against stacking observers across JS re-executions.
        if (window.__swReinjectObs) { try { window.__swReinjectObs.disconnect(); } catch (e) {} window.__swReinjectObs = null; }
        var pending = null;
        var obs = new MutationObserver(function (muts) {
            // Only react when a .sw-shell (or our side-menu nodes) was added/replaced.
            var relevant = false;
            for (var i = 0; i < muts.length; i++) {
                var added = muts[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType !== 1) continue;
                    if ((n.classList && n.classList.contains('sw-shell'))
                        || (n.querySelector && n.querySelector('#sw-couple-canvas, #sw-inv, .sw-shell'))) {
                        relevant = true; break;
                    }
                }
                if (relevant) break;
            }
            if (!relevant) return;
            // A blank re-injected canvas has no drawn pixels; #sw-inv comes back empty.
            // Debounce (the host may mutate in several batches) then re-paint once.
            if (pending) return;
            pending = setTimeout(function () {
                pending = null;
                repaintSideMenu();
            }, 80);
        });
        obs.observe(host, { childList: true, subtree: true });
        window.__swReinjectObs = obs;
        onCleanup(function () {
            if (pending) { clearTimeout(pending); pending = null; }
            try { obs.disconnect(); } catch (e) {}
            if (window.__swReinjectObs === obs) window.__swReinjectObs = null;
        });
    }

    /* ===== KICKOFF ===== */
    function init() {
        try { wireUI(); } catch (e) { try { console.error('[sww] wireUI', e); } catch (e2) {} }
        try { scanInfos(); QUOTA = buildQuota(N()); STORE.diff = STORE.diff || 'normal'; buildIndicators(); } catch (e) {}
        try { wireMusicMirror(); } catch (e) {}
        try { drawCoupleCanvas(); } catch (e) {}
        try { paintSideBg(); } catch (e) {}
        try { buildTuner(); } catch (e) {}
        try { var v = $('sw-version'); if (v) v.textContent = VERSION; } catch (e) {}
        try { updateProgress(); } catch (e) {}
        try { wireReinjectRecovery(); } catch (e) {}
        // AUTO-RESUME after a host RE-INJECTION.
        // FIX "START gabisa dibuka lagi": window.__swStarted survives a re-injection, and this
        // auto-resume used to fire UNCONDITIONALLY — even when the fresh HTML re-shows #sw-cover
        // (the PRESS START screen). It yanked the player off the cover into startRun() (loading
        // curtain), and if the engine was mid-teardown nothing came back → cover gone, START dead.
        // Only auto-resume when the cover is NOT showing (a genuine in-progress run): a re-injection
        // that re-shows the cover keeps it up with a working START; a real mid-game re-inject (RSVP/
        // wish submit, cover already hidden) still auto-resumes with no lost progress.
        try {
            var coverUp = (($('sw-cover') || {}).classList || { contains: function () { return false; } }).contains('show');
            var revealUp = (($('sw-reveal') || {}).classList || { contains: function () { return false; } }).contains('show');
            if (window.__swStarted && !coverUp && !revealUp) {
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

    /* =================================================================
       SPRITE TUNER UI — list + sliders. Toggling does NOT pause the game;
       slider moves apply LIVE via the scene's applyLiveTune() and persist.
       Built with pure DOM API (no innerHTML) so nothing can be stripped, and
       ALWAYS (re)built every time the panel opens (survives host re-injection).
       ================================================================= */
    function buildTuner() {
        var list = $('sw-tuner-list'); if (!list) return;
        while (list.firstChild) list.removeChild(list.firstChild);
        TUNE_SPECS.forEach(function (spec) {
            var v = TUNE[spec.id] || 0;
            var row = document.createElement('div'); row.className = 'sw-tuner-row';
            var top = document.createElement('div'); top.className = 'sw-tuner-row-top';
            var name = document.createElement('span'); name.className = 'sw-tuner-row-name'; name.textContent = spec.label;
            var valEl = document.createElement('span'); valEl.className = 'sw-tuner-row-val';
            valEl.id = 'sw-tval-' + spec.id; valEl.textContent = (v > 0 ? '+' : '') + v + 'px';
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
        var p = $('sw-tuner'); if (!p) return;
        var opening = !p.classList.contains('show');
        if (opening) buildTuner();   // ALWAYS rebuild on open (host re-injection can wipe the list)
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

    /* =================================================================
       EXPORTER — compose the game's CURRENT textures into ONE PNG sprite
       sheet (layout = SHEET_MAP via sheetLayout()), each cell wrapped in a
       PURPLE guide-border + a tiny key label. User replaces the art INSIDE
       each border, re-uploads to the theme asset slot → the loader slices at
       the identical rects + keys out the purple → art applies. Needs a LIVE
       scene (textures exist only after boot). No-op + toast otherwise.
       ================================================================= */
    function exportSpriteSheet() {
        var sc = scene();
        if (!sc || !sc.textures) { toast('Mulai game dulu (tekan START) agar sprite tersedia untuk diekspor.'); return; }
        var dim = sheetLayout();   // fills SHEET_MAP[i].rect
        try {
            var cv = document.createElement('canvas'); cv.width = dim.w; cv.height = dim.h;
            var ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
            // dark backdrop so transparent art + purple borders are visible
            ctx.fillStyle = '#101428'; ctx.fillRect(0, 0, dim.w, dim.h);
            var mark = 'rgb(' + SHEET_MARK.r + ',' + SHEET_MARK.g + ',' + SHEET_MARK.b + ')';
            SHEET_MAP.forEach(function (e) {
                var r = e.rect, ax = r[0], ay = r[1], aw = r[2], ah = r[3];
                // draw the game texture's source image into the ART rect
                try {
                    if (sc.textures.exists(e.key)) {
                        var src = sc.textures.get(e.key).getSourceImage();
                        if (src) ctx.drawImage(src, 0, 0, src.width, src.height, ax, ay, aw, ah);
                    }
                } catch (e2) {}
                // PURPLE guide-border around the cell (just outside the art rect)
                ctx.strokeStyle = mark; ctx.lineWidth = SHEET_BORDER;
                ctx.strokeRect(ax - SHEET_BORDER / 2, ay - SHEET_BORDER / 2, aw + SHEET_BORDER, ah + SHEET_BORDER);
                // key label above the cell (purple, OUTSIDE the art so it isn't sliced)
                ctx.fillStyle = mark; ctx.font = '9px monospace'; ctx.textAlign = 'left';
                ctx.fillText(e.key, ax - SHEET_BORDER, ay - SHEET_BORDER - 2);
            });
            var url = cv.toDataURL('image/png');
            var a = document.createElement('a');
            a.href = url; a.download = 'spacewar-wedding-sprite-sheet.png';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            toast('Sprite sheet diunduh. Ganti isi tiap kotak ungu, lalu upload ke asset tema (slot ke-1).', 4200);
        } catch (e) {
            toast('Gagal mengekspor sprite sheet (canvas ter-taint?).', 3500);
            try { console.error('[sww] exportSpriteSheet', e); } catch (e2) {}
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
            'sw-sfx-btn': toggleSfx,
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
            'sw-lightbox-close': function () { var lb = $('sw-lightbox'); if (lb) lb.classList.remove('show'); },
            // SPRITE TUNER (PC) — toggling does NOT pause the game (config applies live)
            'sw-tuner-btn': toggleTuner,
            'sw-tuner-close': function () { var p = $('sw-tuner'); if (p) p.classList.remove('show'); },
            'sw-tuner-reset': resetTuner,
            'sw-tuner-copy': copyTuner,
            'sw-tuner-export': exportSpriteSheet
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
        // Keep the HIDDEN host music button's icon mirrored to the real audio (purely internal —
        // the guest never sees this button now; it only exists so setMusic() can auto-play the
        // backsound when the invitation opens). The AUDIBLE guest control is the SFX button.
        var bg = $('bg-music');
        if (bg) {
            var onPlay = function () { reflectMusicIcon(true); };
            var onPause = function () { reflectMusicIcon(false); };
            bg.addEventListener('play', onPlay); bg.addEventListener('pause', onPause);
            onCleanup(function () { bg.removeEventListener('play', onPlay); bg.removeEventListener('pause', onPause); });
        }
        reflectMusicIcon(hostMusicPlaying());
        // paint the SFX-mute button to its persisted state on every (re)wire
        reflectSfxIcon();
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
        // BLANK-CANVAS / CRASH FIX ("pindah stage dari dialog → blank/crash"): if a Phaser game is
        // ALREADY live, DON'T destroy+recreate the whole P.Game. Phaser's GAME.destroy(true) is
        // DEFERRED (it runs on the game's next step), so calling it then synchronously building a
        // new P.Game on the SAME #gw-stage parent races: the old game's deferred teardown fires
        // AFTER the new canvas mounts and rips it out → blank #gw-stage. Instead, reuse the running
        // scene and just hot-load the new sector (same path nextSector() uses) — no canvas churn,
        // no race. Only do a fresh boot when there is genuinely no live game.
        var sc = scene();
        if (GAME && sc && sc.loadSector) {
            if (sector > STORE.maxSector) { STORE.maxSector = sector; saveStore(); }
            if (sc.scene.isPaused()) sc.scene.resume();   // dialog left it paused
            // sync the live scene's run mirrors before it rebuilds
            sc.score = runState.score;
            sc.sectorIdx = sector;
            sc.cheatOn = cheat.on;
            if (sc.ship) sc.ship.cheat = cheat.on;
            sc.showBriefing(sector);   // briefing → "MAJU" → loadSector() builds + reveals
            return;
        }
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
            /* ---- SMOOTH DRAW HELPERS (semi-realistic look; antialias is ON) ---- */
            // vertical gradient panel (top→bottom). Two-stop; rounded via poly fallback.
            function vgrad(g, x, y, w, h, top, bot) {
                g.fillStyle(top, 1); g.fillGradientStyle(top, top, bot, bot, 1); g.fillRect(x, y, w, h);
            }
            // radial-ish soft glow: stacked translucent circles (fake radial gradient, ADD-friendly)
            function glow(g, cx, cy, r, col, a) {
                a = a == null ? 0.5 : a;
                for (var i = 6; i >= 1; i--) { g.fillStyle(col, a * (i / 6) * 0.5); g.fillCircle(cx, cy, r * (i / 6)); }
            }
            // filled smooth polygon from [[x,y],...]
            function poly(g, pts, col, alpha) {
                g.fillStyle(col, alpha == null ? 1 : alpha);
                g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
                for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
                g.closePath(); g.fillPath();
            }
            function strokePoly(g, pts, wdt, col, alpha, close) {
                g.lineStyle(wdt, col, alpha == null ? 1 : alpha);
                g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
                for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
                if (close !== false) g.closePath();
                g.strokePath();
            }
            // metallic rounded body: gradient fill + top sheen + bottom shade + rim light
            function metalBody(g, x, y, w, h, r, top, mid, bot, rim) {
                g.fillStyle(mid, 1); g.fillGradientStyle(top, top, bot, bot, 1); g.fillRoundedRect(x, y, w, h, r);
                // vertical sheen streak (glass/metal reflection)
                g.fillStyle(0xffffff, 0.14); g.fillRoundedRect(x + w * 0.16, y + 2, Math.max(2, w * 0.16), h - 4, Math.min(r, 3));
                if (rim != null) { g.lineStyle(1.5, rim, 0.85); g.strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, r); }
            }
            function box(g, x, y, w, h, base, hi, sh) {   // kept for back-compat; now gradient-shaded
                vgrad(g, x, y, w, h, hi != null ? hi : base, sh != null ? sh : base);
            }
            function outline(g, x, y, w, h, col) { g.lineStyle(1.5, col != null ? col : 0x0a0e1a, 0.9); g.strokeRect(x, y, w, h); }

            // ---- PLAYER SHIP (faces UP) — sleek cyan interceptor, glass canopy, ion exhaust ----
            function drawShip(g, opt) {
                opt = opt || {}; var ex = opt.ex || 0;   // exhaust length 0..3 (below)
                var cx = 18;
                // ion exhaust plume (behind, bottom) — layered glow
                if (ex > 0) {
                    glow(g, cx, 40, 5 + ex * 2, 0x4fd6ff, 0.5);
                    poly(g, [[13, 34], [23, 34], [20, 40 + ex * 4], [cx, 44 + ex * 5], [16, 40 + ex * 4]], 0xff8a3d, 0.9);
                    poly(g, [[15, 33], [21, 33], [19, 38 + ex * 3], [cx, 41 + ex * 3.4], [17, 38 + ex * 3]], 0xffe08a, 0.95);
                    poly(g, [[16.5, 32], [19.5, 32], [cx, 38 + ex * 2.4]], 0xffffff, 0.9);
                }
                // engine nacelles (twin, dark) at the tail
                metalBody(g, 10, 30, 6, 10, 2, 0x3a4a6a, 0x24304a, 0x141a2a, 0x6a90e0);
                metalBody(g, 20, 30, 6, 10, 2, 0x3a4a6a, 0x24304a, 0x141a2a, 0x6a90e0);
                // swept wings (smooth polygons w/ gradient-ish two-tone)
                poly(g, [[12, 12], [1, 30], [6, 34], [14, 22]], 0x2a5cc0);
                poly(g, [[24, 12], [35, 30], [30, 34], [22, 22]], 0x2a5cc0);
                poly(g, [[12, 14], [6, 28], [10, 30], [14, 22]], 0x6a9af0, 0.9);
                poly(g, [[24, 14], [30, 28], [26, 30], [22, 22]], 0x6a9af0, 0.9);
                // wing-tip lights
                glow(g, 3, 31, 3, 0xff5a7a, 0.7); glow(g, 33, 31, 3, 0x5affa0, 0.7);
                // fuselage — smooth arrowhead with metallic gradient
                poly(g, [[cx, 0], [26, 14], [24, 36], [12, 36], [10, 14]], 0x2a5cc0);
                var fg = g;
                fg.fillStyle(0x3a7dff, 1); fg.fillGradientStyle(0x9bd0ff, 0x9bd0ff, 0x1c3c8a, 0x1c3c8a, 1);
                fg.beginPath(); fg.moveTo(cx, 2); fg.lineTo(24, 14); fg.lineTo(22, 34); fg.lineTo(14, 34); fg.lineTo(12, 14); fg.closePath(); fg.fillPath();
                // nose highlight
                poly(g, [[cx, 2], [21, 12], [15, 12]], 0xcfeaff, 0.9);
                // hull panel lines
                strokePoly(g, [[15, 12], [15, 34]], 1, 0x14306a, 0.6, false);
                strokePoly(g, [[21, 12], [21, 34]], 1, 0x14306a, 0.6, false);
                // glass canopy (teardrop) with specular
                poly(g, [[cx, 10], [22, 17], [cx, 26], [14, 17]], 0x0a2a5a);
                glow(g, cx, 18, 6, 0x4fd6ff, 0.6);
                g.fillStyle(0x8fe6ff, 1); g.fillCircle(cx, 18, 4.2);
                g.fillStyle(0xeaffff, 0.95); g.fillCircle(17, 16, 1.8);
                // outline for read
                strokePoly(g, [[cx, 0], [26, 14], [24, 36], [12, 36], [10, 14]], 1.4, 0x081226, 0.85);
            }
            tex(scene, 't_ship', 36, 50, function (g) { drawShip(g, { ex: 1 }); });
            tex(scene, 't_ship0', 36, 50, function (g) { drawShip(g, { ex: 1 }); });
            tex(scene, 't_ship1', 36, 50, function (g) { drawShip(g, { ex: 2 }); });
            tex(scene, 't_ship2', 36, 50, function (g) { drawShip(g, { ex: 3 }); });
            tex(scene, 't_ship_hurt', 36, 50, function (g) {
                // same silhouette, flashed red-white with damage sparks
                poly(g, [[18, 0], [26, 14], [24, 36], [12, 36], [10, 14]], 0xff4d4d);
                g.fillStyle(0xff8a8a, 1); g.fillGradientStyle(0xffd0d0, 0xffd0d0, 0xc02020, 0xc02020, 1);
                g.beginPath(); g.moveTo(18, 2); g.lineTo(24, 14); g.lineTo(22, 34); g.lineTo(14, 34); g.lineTo(12, 14); g.closePath(); g.fillPath();
                glow(g, 18, 18, 6, 0xffffff, 0.7);
                g.fillStyle(0xfff2a0, 1); g.fillCircle(14, 22, 1.4); g.fillCircle(23, 28, 1.2); g.fillCircle(19, 12, 1.1);
                strokePoly(g, [[18, 0], [26, 14], [24, 36], [12, 36], [10, 14]], 1.4, 0x3a0808, 0.9);
            });

            // ---- PROJECTILES (vertical) — each weapon reads DISTINCTLY ----
            // BLASTER: cyan plasma bolt, bright core + soft halo
            tex(scene, 't_pbullet', 8, 18, function (g) {
                glow(g, 4, 9, 4, 0x4fd6ff, 0.8);
                g.fillStyle(0x2aa0ff, 1); g.fillRoundedRect(2, 1, 4, 16, 2);
                g.fillStyle(0xbdf2ff, 1); g.fillRoundedRect(3, 1, 2, 13, 1);
                g.fillStyle(0xffffff, 1); g.fillCircle(4, 3, 1.4);
            });
            // LASER: continuous emerald beam, white-hot centre, flared cap
            tex(scene, 't_laser', 7, 30, function (g) {
                glow(g, 3.5, 15, 4, 0x5affb0, 0.7);
                g.fillStyle(0x2ad07a, 0.9); g.fillRoundedRect(1, 0, 5, 30, 2);
                g.fillStyle(0x9bffd0, 1); g.fillRoundedRect(2, 0, 3, 30, 1);
                g.fillStyle(0xffffff, 1); g.fillRect(3, 0, 1, 30);
                g.fillStyle(0xeaffff, 0.9); g.fillCircle(3.5, 2, 2.4);   // hot muzzle cap
            });
            // MISSILE: metal body, nose cone, fins, orange flame tail
            tex(scene, 't_pmissile', 10, 18, function (g) {
                poly(g, [[5, 0], [8, 5], [2, 5]], 0xdfe6ff);                 // nose cone
                metalBody(g, 3, 4, 4, 9, 1.5, 0xeef2ff, 0xb8c4e6, 0x6a78a8, 0x9bb0ff);
                poly(g, [[3, 9], [0, 13], [3, 13]], 0x8a96c0); poly(g, [[7, 9], [10, 13], [7, 13]], 0x8a96c0);  // fins
                glow(g, 5, 15, 3, 0xff8a3d, 0.8);
                poly(g, [[3.5, 13], [6.5, 13], [5, 18]], 0xffe08a);          // flame
            });
            // ENEMY BULLET: hostile red plasma orb
            tex(scene, 't_ebullet', 11, 11, function (g) {
                glow(g, 5.5, 5.5, 5, 0xff3a2a, 0.8);
                g.fillStyle(0xff6a4a, 1); g.fillCircle(5.5, 5.5, 3.6);
                g.fillStyle(0xffd08a, 1); g.fillCircle(5.5, 5.5, 2);
                g.fillStyle(0xffffff, 0.95); g.fillCircle(4.2, 4.2, 1);
            });
            // ENEMY ROCKET: dark warhead, red tip, exhaust
            tex(scene, 't_erocket', 10, 20, function (g) {
                poly(g, [[5, 0], [8, 5], [2, 5]], 0xff4d4d);                 // red warhead tip
                metalBody(g, 2, 4, 6, 12, 2, 0x9aa0ac, 0x6a707c, 0x3a3e48, 0xc0c6d2);
                poly(g, [[2, 12], [0, 17], [2, 16]], 0x4a4e58); poly(g, [[8, 12], [10, 17], [8, 16]], 0x4a4e58);
                glow(g, 5, 18, 3, 0xffb020, 0.85);
                poly(g, [[3.5, 16], [6.5, 16], [5, 20]], 0xffe36a);
            });
            tex(scene, 't_spark', 8, 8, function (g) {
                glow(g, 4, 4, 4, 0xffd447, 0.9);
                g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 2.4);
                g.fillStyle(0xffe98a, 1); g.fillCircle(4, 4, 1.2);
            });
            tex(scene, 't_heart', 12, 12, function (g) {
                glow(g, 6, 6, 5, 0xff8ab0, 0.5);
                g.fillStyle(0xff5a8a, 1); g.fillCircle(3.5, 4.4, 3.4); g.fillCircle(8.5, 4.4, 3.4); poly(g, [[0.6, 5.4], [11.4, 5.4], [6, 12]], 0xff5a8a);
                g.fillStyle(0xffb0cc, 0.9); g.fillCircle(4.4, 3.4, 1.2);
            });

            // ---- ENEMIES (face DOWN, toward player below) ----
            // DRONE: sleek crimson interceptor, glowing red sensor, twin thrusters
            tex(scene, 't_e_drone', 26, 34, function (g) {
                var cx = 13;
                poly(g, [[cx, 34], [21, 22], [19, 6], [7, 6], [5, 22]], 0x7a1e1e);            // dark underbody
                g.fillStyle(0xc04a4a, 1); g.fillGradientStyle(0xf07a6a, 0xf07a6a, 0x801e1e, 0x801e1e, 1);
                g.beginPath(); g.moveTo(cx, 32); g.lineTo(19, 22); g.lineTo(18, 8); g.lineTo(8, 8); g.lineTo(7, 22); g.closePath(); g.fillPath();
                poly(g, [[7, 8], [1, 16], [7, 18]], 0x9a2828); poly(g, [[19, 8], [25, 16], [19, 18]], 0x9a2828);  // wings
                glow(g, cx, 14, 4, 0xff5a4d, 0.8);
                g.fillStyle(0xffd0c0, 1); g.fillCircle(cx, 13, 2.4); g.fillStyle(0xff2a1a, 1); g.fillCircle(cx, 14, 1.3);  // sensor
                glow(g, 9, 6, 2.5, 0x4fd6ff, 0.7); glow(g, 17, 6, 2.5, 0x4fd6ff, 0.7);   // thrusters top
                strokePoly(g, [[cx, 32], [19, 22], [18, 8], [8, 8], [7, 22]], 1.2, 0x2a0808, 0.8);
            });
            // TURRET: armoured violet gun platform, ringed core, muzzle glow
            tex(scene, 't_e_turret', 28, 34, function (g) {
                metalBody(g, 6, 6, 16, 24, 4, 0xa77edc, 0x6a4a9c, 0x36225e, 0xb99ce0);
                g.fillStyle(0x241238, 1); g.fillRoundedRect(11, 0, 6, 9, 1);   // barrel (down toward player)
                glow(g, 14, 2, 2.5, 0xff4d4d, 0.8);
                g.lineStyle(1.5, 0xffd447, 0.7); g.strokeCircle(14, 19, 6);     // core ring
                glow(g, 14, 19, 4, 0xffd447, 0.7); g.fillStyle(0xfff2a0, 1); g.fillCircle(14, 19, 2.4);
                g.fillStyle(0x1a0e2e, 0.8); g.fillRect(8, 24, 12, 2);           // armour seam
            });
            // KORVET: orange armoured cruiser, side pods, engine glow, bridge window
            tex(scene, 't_e_korvet', 30, 44, function (g) {
                poly(g, [[15, 0], [24, 10], [22, 40], [15, 44], [8, 40], [6, 10]], 0x8a4418);   // hull silhouette
                g.fillStyle(0xd06a2a, 1); g.fillGradientStyle(0xf6a05a, 0xf6a05a, 0x8a4418, 0x8a4418, 1);
                g.beginPath(); g.moveTo(15, 2); g.lineTo(22, 11); g.lineTo(20, 38); g.lineTo(15, 42); g.lineTo(10, 38); g.lineTo(8, 11); g.closePath(); g.fillPath();
                metalBody(g, 2, 18, 5, 14, 2, 0x8a6adc, 0x4a2a6a, 0x281540, 0x9a7aec);          // side pods
                metalBody(g, 23, 18, 5, 14, 2, 0x8a6adc, 0x4a2a6a, 0x281540, 0x9a7aec);
                glow(g, 15, 26, 5, 0x4fd6ff, 0.6); g.fillStyle(0xbdf2ff, 1); g.fillCircle(15, 26, 3.4);  // bridge window
                strokePoly(g, [[15, 12], [15, 40]], 1, 0x5a2c10, 0.6, false);
                glow(g, 12, 6, 2, 0xff8a3d, 0.8); glow(g, 18, 6, 2, 0xff8a3d, 0.8);              // twin engines top
            });
            // FLYER: fast magenta dart with translucent swept wings
            tex(scene, 't_e_flyer', 22, 30, function (g) {
                poly(g, [[11, 30], [3, 6], [19, 6]], 0x7a1e5a);
                g.fillStyle(0xc44a9a, 1); g.fillGradientStyle(0xf07acc, 0xf07acc, 0x7a1e5a, 0x7a1e5a, 1);
                g.beginPath(); g.moveTo(11, 28); g.lineTo(4, 7); g.lineTo(18, 7); g.closePath(); g.fillPath();
                poly(g, [[4, 7], [0, 4], [8, 8]], 0xd05aaa, 0.5); poly(g, [[18, 7], [22, 4], [14, 8]], 0xd05aaa, 0.5);  // glass wings
                glow(g, 11, 10, 3, 0xff5a4d, 0.8); g.fillStyle(0xffd0c0, 1); g.fillCircle(11, 9, 1.8);
                glow(g, 11, 26, 3, 0xff8ad0, 0.7);   // engine trail
            });
            // CARRIER: heavy grey mothership, hull plating, hangar bay, running lights
            tex(scene, 't_e_carrier', 44, 64, function (g) {
                poly(g, [[8, 6], [36, 6], [34, 58], [22, 64], [10, 58]], 0x24243a);
                g.fillStyle(0x4a4a6a, 1); g.fillGradientStyle(0x7a7a9a, 0x7a7a9a, 0x2a2a4a, 0x2a2a4a, 1);
                g.beginPath(); g.moveTo(9, 8); g.lineTo(35, 8); g.lineTo(33, 56); g.lineTo(22, 61); g.lineTo(11, 56); g.closePath(); g.fillPath();
                // plating seams
                g.lineStyle(1, 0x1c1c30, 0.7); g.strokeRect(12, 14, 20, 12); g.strokeRect(12, 30, 20, 12);
                g.fillStyle(0x12121e, 1); g.fillRoundedRect(15, 46, 14, 9, 2);   // hangar bay (bottom)
                glow(g, 22, 51, 3, 0xff8a3d, 0.6);
                glow(g, 22, 22, 5, 0xff4d4d, 0.7); g.fillStyle(0xffd447, 1); g.fillCircle(22, 22, 2.4);  // command core
                // running lights
                for (var i = 0; i < 4; i++) { glow(g, 11, 16 + i * 11, 1.6, 0x5affa0, 0.8); glow(g, 33, 16 + i * 11, 1.6, 0x5affa0, 0.8); }
                strokePoly(g, [[9, 8], [35, 8], [33, 56], [22, 61], [11, 56]], 1.3, 0x0c0c16, 0.85);
            });
            // MECH: olive walker-gunship, shoulder cannon, twin rotors, optic
            tex(scene, 't_e_mech', 40, 56, function (g) {
                metalBody(g, 8, 6, 24, 44, 5, 0x8a9a5a, 0x5a6a3a, 0x323e1e, 0x9aaa6a);
                g.fillStyle(0x2a2a2a, 1); g.fillRoundedRect(15, 48, 8, 8, 1);    // chin cannon (down)
                glow(g, 19, 54, 2.5, 0xff4d4d, 0.85);
                // rotor housings (sides)
                g.fillStyle(0x14140e, 1); g.fillCircle(8, 18, 6); g.fillCircle(8, 40, 6); g.fillCircle(32, 18, 6); g.fillCircle(32, 40, 6);
                g.fillStyle(0x5a5a4a, 1); g.fillCircle(8, 18, 2.4); g.fillCircle(8, 40, 2.4); g.fillCircle(32, 18, 2.4); g.fillCircle(32, 40, 2.4);
                // optic visor
                glow(g, 20, 22, 5, 0x4fd6ff, 0.7); g.fillStyle(0xbdf2ff, 1); g.fillRoundedRect(14, 20, 12, 5, 2);
                g.fillStyle(0x2a3218, 0.8); g.fillRect(11, 34, 18, 2);           // armour seam
            });
            // MINE: spiked hazard orb, warning red pulse
            tex(scene, 't_e_mine', 22, 22, function (g) {
                for (var i = 0; i < 10; i++) { var a = i / 10 * 6.283; poly(g, [[11 + Math.cos(a) * 8, 11 + Math.sin(a) * 8], [11 + Math.cos(a + 0.16) * 11, 11 + Math.sin(a + 0.16) * 11], [11 + Math.cos(a - 0.16) * 11, 11 + Math.sin(a - 0.16) * 11]], 0x6a6a2a); }
                g.fillStyle(0x8a8a3a, 1); g.fillCircle(11, 11, 8);
                g.fillStyle(0xaaaa5a, 1); g.fillGradientStyle(0xd0d07a, 0xd0d07a, 0x5a5a2a, 0x5a5a2a, 1); g.fillCircle(11, 11, 8);
                g.fillStyle(0xcaca7a, 0.9); g.fillCircle(8, 8, 3);
                glow(g, 11, 11, 4, 0xff4d4d, 0.85); g.fillStyle(0xff2a2a, 1); g.fillCircle(11, 11, 2);
                g.lineStyle(1, 0x3a3a18, 0.8); g.strokeCircle(11, 11, 8);
            });

            // ---- HAZARDS ----
            // irregular cratered rock via jagged polygon + shaded facets
            function rock(g, cx, cy, r, seed) {
                var pts = [], n = 11;
                for (var i = 0; i < n; i++) { var a = i / n * 6.283; var rr = r * (0.78 + ((Math.sin(seed + i * 2.3) * 0.5 + 0.5)) * 0.28); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
                poly(g, pts, 0x4a3a2a);   // dark base
                g.fillStyle(0x6a5a4a, 1); g.fillGradientStyle(0x9a8a76, 0x9a8a76, 0x3a2c1e, 0x3a2c1e, 1);
                g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var j = 1; j < pts.length; j++) g.lineTo(pts[j][0], pts[j][1]); g.closePath(); g.fillPath();
                strokePoly(g, pts, 1.2, 0x241a10, 0.85);
                return pts;
            }
            tex(scene, 't_asteroid', 40, 38, function (g) {
                rock(g, 20, 19, 18, 1.3);
                g.fillStyle(0x8a7a6a, 0.9); g.fillCircle(14, 13, 5);   // sunlit facet
                g.fillStyle(0x2e2216, 1); g.fillCircle(26, 24, 4); g.fillCircle(12, 27, 2.6); g.fillCircle(24, 12, 2);  // craters
            });
            tex(scene, 't_asteroid_s', 22, 20, function (g) {
                rock(g, 11, 10, 9, 2.7);
                g.fillStyle(0x8a7a6a, 0.9); g.fillCircle(8, 7, 2.6);
                g.fillStyle(0x2e2216, 1); g.fillCircle(14, 13, 2);
            });
            // explosive barrel: teal canister, hazard stripe, warning light, seams
            tex(scene, 't_barel', 26, 30, function (g) {
                metalBody(g, 3, 2, 20, 26, 4, 0x7ad0d0, 0x4a8a8a, 0x244a4a, 0x8ae0e0);
                g.fillStyle(0x1a3838, 0.9); g.fillRect(3, 8, 20, 2.5); g.fillRect(3, 20, 20, 2.5);   // banding
                g.fillStyle(0xffd447, 0.9); for (var s = 0; s < 5; s++) g.fillRect(4 + s * 4, 12, 2, 6);  // hazard stripes
                glow(g, 13, 15, 4, 0xff4d4d, 0.85); g.fillStyle(0xffe08a, 1); g.fillCircle(13, 15, 2);
            });
            tex(scene, 't_lasergate', 200, 16, function (g) {   // HORIZONTAL energy beam (spans width)
                g.fillStyle(0xff4d4d, 0.35); g.fillRect(0, 1, 200, 14);   // outer haze
                g.fillStyle(0xff4d4d, 0.85); g.fillRect(0, 4, 200, 8);
                g.fillStyle(0xffcaca, 0.95); g.fillRect(0, 6, 200, 4);
                g.fillStyle(0xffffff, 1); g.fillRect(0, 7.5, 200, 1);      // white-hot core line
            });
            // BLUE POWER CAPSULE: glassy energy pod with '↑' spark
            tex(scene, 't_capsule_blue', 22, 16, function (g) {
                glow(g, 11, 8, 8, 0x4fa0ff, 0.6);
                metalBody(g, 1, 1, 20, 14, 6, 0x8ac0ff, 0x2a6aff, 0x143a8a, 0xbde0ff);
                g.fillStyle(0xeaffff, 1); poly(g, [[11, 4], [14, 8], [12, 8], [12, 12], [10, 12], [10, 8], [8, 8]], 0xeaffff);  // up-arrow
            });

            // ---- INVITATION CAPSULE (gold 💌) — glowing sealed love-letter ----
            tex(scene, 't_amplop', 30, 24, function (g) {
                glow(g, 15, 12, 12, 0xffd447, 0.5);
                metalBody(g, 0, 0, 30, 24, 3, 0xfff0a0, 0xffd447, 0xc79410, 0xfff4c0);
                g.lineStyle(2, 0xc79410, 0.9); g.beginPath(); g.moveTo(1, 2); g.lineTo(15, 13); g.lineTo(29, 2); g.strokePath();   // flap crease
                g.fillStyle(0xfff8d0, 0.5); poly(g, [[1, 2], [15, 13], [29, 2], [29, 1], [1, 1]], 0xfff8d0, 0.5);
                glow(g, 15, 13, 5, 0xff4d6a, 0.6);                              // heart wax seal
                g.fillStyle(0xff4d6a, 1); g.fillCircle(12.5, 13, 2.6); g.fillCircle(17.5, 13, 2.6); poly(g, [[9.5, 14], [20.5, 14], [15, 20]], 0xff4d6a);
                g.fillStyle(0xffb0c0, 0.9); g.fillCircle(13.5, 12, 1);
            });

            // ---- BOSS — Wedding Station fortress (faces DOWN; core weak-point at bottom) ----
            // BOSS — "Stasiun Pelaminan" dreadnought. Redesigned for a stronger, more
            // menacing silhouette: a symmetric arrowhead battleship with swept wings, twin
            // heavy cannon pods, a raised command bridge crowned by a gold wedding arch, and a
            // big glowing reactor CORE at the bottom-center (weak-point, coreDY:40). Faces DOWN
            // toward the player. Size 220×170 and the core anchor are UNCHANGED (hitbox/wiring).
            tex(scene, 't_boss', 220, 170, function (g) {
                var cx = 110;
                // outer menace halo
                glow(g, cx, 84, 96, 0x7a3aaa, 0.35);
                glow(g, cx, 120, 44, 0xff4d4d, 0.18);   // reddish underglow near the guns

                // ---- swept WINGS (dark, angular — read as a warship, not a box) ----
                poly(g, [[cx, 26], [8, 96], [30, 118], [64, 96], [58, 40]], 0x2a1a52);
                poly(g, [[cx, 26], [212, 96], [190, 118], [156, 96], [162, 40]], 0x2a1a52);
                poly(g, [[cx, 34], [26, 92], [42, 104], [66, 88], [62, 46]], 0x5a3a8a, 0.95);   // wing sheen L
                poly(g, [[cx, 34], [194, 92], [178, 104], [154, 88], [158, 46]], 0x5a3a8a, 0.95); // wing sheen R
                // wing-tip cannon glows
                glow(g, 24, 106, 4, 0xff4d4d, 0.85); glow(g, 196, 106, 4, 0xff4d4d, 0.85);

                // ---- main HULL: pointed arrowhead prow (down) + broad body ----
                poly(g, [[cx, 18], [176, 60], [166, 132], [54, 132], [44, 60]], 0x1e1040);      // silhouette
                // gradient plate body
                g.fillStyle(0x5a3a8a, 1); g.fillGradientStyle(0xb99ce0, 0xb99ce0, 0x2e1858, 0x2e1858, 1);
                g.beginPath(); g.moveTo(cx, 22); g.lineTo(170, 62); g.lineTo(160, 128); g.lineTo(60, 128); g.lineTo(50, 62); g.closePath(); g.fillPath();
                // prow spine highlight
                poly(g, [[cx, 22], [128, 60], [92, 60]], 0xcdb2f0, 0.9);
                // armour panel seams (follow the hull, not a flat grid)
                g.lineStyle(1.2, 0x1a0e3a, 0.6);
                g.strokeLineShape(new P.Geom.Line(72, 60, 78, 126));
                g.strokeLineShape(new P.Geom.Line(148, 60, 142, 126));
                g.strokeLineShape(new P.Geom.Line(54, 92, 166, 92));
                g.strokeLineShape(new P.Geom.Line(cx, 24, cx, 128));

                // ---- shoulder cannon PODS (heavy, angled) ----
                metalBody(g, 30, 54, 24, 52, 7, 0x8a6aca, 0x4a2a7a, 0x281550, 0x9a7ada);
                metalBody(g, 166, 54, 24, 52, 7, 0x8a6aca, 0x4a2a7a, 0x281550, 0x9a7ada);
                g.fillStyle(0x140828, 1); g.fillRoundedRect(38, 100, 8, 18, 2); g.fillRoundedRect(174, 100, 8, 18, 2);  // barrels down
                glow(g, 42, 116, 3, 0xff4d4d, 0.8); glow(g, 178, 116, 3, 0xff4d4d, 0.8);

                // ---- raised COMMAND BRIDGE with gold wedding arch (the "pelaminan" motif) ----
                metalBody(g, 82, 30, 56, 40, 8, 0x9a7ada, 0x6a4aaa, 0x3a2470, 0xc0a4ec);
                // gold arch over the bridge
                g.lineStyle(4, 0xffd447, 0.85); g.beginPath(); g.arc(cx, 52, 22, Math.PI, 2 * Math.PI); g.strokePath();
                g.lineStyle(2, 0xfff0a0, 0.5); g.beginPath(); g.arc(cx, 52, 27, Math.PI, 2 * Math.PI); g.strokePath();
                // lit bridge windows (cyan viewports)
                for (var w2 = 0; w2 < 4; w2++) { glow(g, 92 + w2 * 12, 46, 2.6, 0x8fe6ff, 0.8); g.fillStyle(0xbdf2ff, 1); g.fillCircle(92 + w2 * 12, 46, 1.6); }

                // ---- lower turret DECK (bridges into the core housing) ----
                metalBody(g, 60, 116, 100, 26, 8, 0x8a6aba, 0x6a4a9a, 0x3e2478, 0xa886d8);
                g.fillStyle(0x140828, 1); g.fillRoundedRect(74, 138, 9, 15, 2); g.fillRoundedRect(137, 138, 9, 15, 2);   // deck muzzles
                glow(g, 78, 152, 3, 0xff4d4d, 0.8); glow(g, 141, 152, 3, 0xff4d4d, 0.8);

                // ---- WEAK-POINT CORE (glowing reactor, bottom-center @ y=120 → coreDY 40) ----
                // housing collar so the core reads as a deliberate exposed reactor
                g.lineStyle(3, 0x2a1a52, 0.9); g.strokeCircle(cx, 120, 24);
                glow(g, cx, 120, 30, 0xffd447, 0.95);
                g.fillStyle(0xffd447, 1); g.fillGradientStyle(0xfff4c0, 0xfff4c0, 0xd89410, 0xd89410, 1); g.fillCircle(cx, 120, 21);
                g.fillStyle(0xfff8d0, 1); g.fillCircle(cx, 120, 12);
                g.fillStyle(0xffffff, 1); g.fillCircle(cx - 5, 115, 4);
                // energy filaments radiating from the core
                g.lineStyle(1.5, 0xffe98a, 0.5);
                for (var ci = 0; ci < 8; ci++) { var a = ci / 8 * 6.283; g.strokeLineShape(new P.Geom.Line(cx + Math.cos(a) * 21, 120 + Math.sin(a) * 21, cx + Math.cos(a) * 27, 120 + Math.sin(a) * 27)); }

                // crisp outline for read against the nebula
                strokePoly(g, [[cx, 18], [176, 60], [166, 132], [54, 132], [44, 60]], 2, 0x0c0620, 0.75);
            });
            // united couple (boss reward sprite) — softly rendered bride & groom
            tex(scene, 't_couple', 60, 80, function (g) {
                glow(g, 30, 40, 30, 0xff8ab0, 0.25);
                // GROOM (left): tux, shirt, tie, head
                metalBody(g, 6, 30, 17, 46, 4, 0x3a3e6a, 0x23264a, 0x14163a, 0x4a4e7a);
                g.fillStyle(0xffffff, 1); g.fillRoundedRect(11, 31, 7, 26, 1);
                g.fillStyle(0x4fd6ff, 1); poly(g, [[14.5, 31], [16, 34], [14.5, 44], [13, 34]], 0x4fd6ff);   // tie
                g.fillStyle(0xf3d2a0, 1); g.fillGradientStyle(0xffe6c0, 0xffe6c0, 0xd0a878, 0xd0a878, 1); g.fillCircle(14.5, 20, 6.5);
                g.fillStyle(0x2a2218, 1); g.fillEllipse ? g.fillEllipse(14.5, 14, 15, 7) : g.fillRect(7, 12, 15, 5);
                // BRIDE (right): gown, veil, bouquet, head
                poly(g, [[42, 30], [52, 76], [34, 76], [40, 30]], 0xd8caa8);
                g.fillStyle(0xf3ead2, 1); g.fillGradientStyle(0xfff8e4, 0xfff8e4, 0xd8caa8, 0xd8caa8, 1);
                g.beginPath(); g.moveTo(42, 31); g.lineTo(51, 75); g.lineTo(35, 75); g.lineTo(40, 31); g.closePath(); g.fillPath();
                g.fillStyle(0xffffff, 0.5); poly(g, [[35, 16], [51, 16], [55, 52], [31, 52]], 0xffffff, 0.45);   // veil
                g.fillStyle(0xf3d2a0, 1); g.fillGradientStyle(0xffe6c0, 0xffe6c0, 0xd0a878, 0xd0a878, 1); g.fillCircle(43, 20, 6.5);
                g.fillStyle(0x6a4a2a, 1); g.fillCircle(43, 14, 7);   // hair
                g.fillStyle(0xf3d2a0, 1); g.fillCircle(43, 20, 6);
                glow(g, 43, 44, 4, 0xff8ab0, 0.7); g.fillStyle(0xff8ab0, 1); g.fillCircle(43, 44, 3);   // bouquet
                // joining heart
                glow(g, 29, 38, 5, 0xff4d6a, 0.6); g.fillStyle(0xff4d6a, 1); g.fillCircle(27, 37, 2.4); g.fillCircle(31, 37, 2.4); poly(g, [[24, 38], [34, 38], [29, 44]], 0xff4d6a);
            });

            // ---- BACKDROP PROPS ----
            tex(scene, 't_star', 4, 4, function (g) { glow(g, 2, 2, 2, 0xffffff, 0.9); g.fillStyle(0xffffff, 1); g.fillCircle(2, 2, 1); });
            // gas giant: radial-shaded sphere, banded clouds, terminator shadow, ring
            tex(scene, 't_planet', 200, 200, function (g) {
                glow(g, 100, 100, 96, 0x5a4caa, 0.3);
                g.fillStyle(0x5a4caa, 1); g.fillGradientStyle(0x8a7ae0, 0x6a5aba, 0x2a1c5a, 0x1a1040, 1); g.fillCircle(100, 100, 90);
                // cloud bands (translucent ellipses)
                g.fillStyle(0x9a8af0, 0.28); g.fillEllipse(100, 76, 168, 22);
                g.fillStyle(0x3a2c7a, 0.30); g.fillEllipse(100, 108, 176, 26);
                g.fillStyle(0x9a8af0, 0.20); g.fillEllipse(100, 132, 150, 18);
                // sunlit highlight + terminator shadow
                g.fillStyle(0xbdb0ff, 0.4); g.fillCircle(72, 72, 34);
                g.fillStyle(0x120a30, 0.4); g.fillCircle(126, 122, 46);
                // ring
                g.lineStyle(7, 0xffd447, 0.35); g.beginPath(); g.arc(100, 100, 110, 0, 6.283); g.strokePath();
                g.lineStyle(3, 0xfff0a0, 0.25); g.strokeCircle(100, 100, 120);
            });
            // derelict wreck: broken hull, torn plating, ember glow
            tex(scene, 't_wreck', 160, 90, function (g) {
                poly(g, [[8, 30], [120, 26], [148, 46], [118, 68], [12, 64]], 0x1c2632);
                g.fillStyle(0x3a4a5a, 1); g.fillGradientStyle(0x6a7a8a, 0x6a7a8a, 0x222e3a, 0x222e3a, 1);
                g.beginPath(); g.moveTo(12, 32); g.lineTo(116, 28); g.lineTo(140, 46); g.lineTo(114, 64); g.lineTo(16, 60); g.closePath(); g.fillPath();
                // torn broken nose
                poly(g, [[140, 30], [160, 48], [138, 66], [132, 48]], 0x1a222c);
                // hull plating + dark gashes
                g.lineStyle(1.4, 0x0e141c, 0.7); g.strokeLineShape(new P.Geom.Line(40, 34, 44, 60)); g.strokeLineShape(new P.Geom.Line(74, 32, 70, 62)); g.strokeLineShape(new P.Geom.Line(100, 30, 104, 62));
                g.fillStyle(0x8a9aaa, 0.8); g.fillRect(30, 40, 70, 4);
                // smouldering embers
                glow(g, 52, 48, 9, 0xff8a3d, 0.55); glow(g, 96, 52, 6, 0xffb020, 0.4);
                strokePoly(g, [[12, 32], [116, 28], [140, 46], [114, 64], [16, 60]], 1.4, 0x0a0e14, 0.7);
            });
            // wedding station: ringed orbital with hub, spokes, dock lights
            tex(scene, 't_station', 180, 200, function (g) {
                glow(g, 90, 100, 60, 0x8a6ad0, 0.3);
                // outer torus ring
                g.lineStyle(12, 0x6a5a9a, 1); g.strokeCircle(90, 100, 78);
                g.lineStyle(4, 0x9a8ad0, 0.8); g.strokeCircle(90, 100, 84);
                g.lineStyle(2, 0x3a2c6a, 0.9); g.strokeCircle(90, 100, 72);
                // spokes
                g.lineStyle(4, 0x5a4a8a, 1);
                for (var i = 0; i < 6; i++) { var a = i / 6 * 6.283; g.strokeLineShape(new P.Geom.Line(90, 100, 90 + Math.cos(a) * 78, 100 + Math.sin(a) * 78)); }
                // central hub
                metalBody(g, 62, 72, 56, 56, 10, 0x7a6aba, 0x4a3a7a, 0x281a52, 0x9a8ad0);
                glow(g, 90, 100, 16, 0xffd447, 0.7); g.fillStyle(0xfff4c0, 1); g.fillCircle(90, 100, 10);
                // dock running lights around the ring
                for (var k = 0; k < 12; k++) { var a2 = k / 12 * 6.283; glow(g, 90 + Math.cos(a2) * 78, 100 + Math.sin(a2) * 78, 2.2, k % 2 ? 0x8fe6ff : 0xffd447, 0.85); }
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
            // SMOOTH/semi-realistic art: antialiasing ON, no pixel snapping, high-res textures.
            render: { pixelArt: false, antialias: true, antialiasGL: true, roundPixels: false, mipmapFilter: 'LINEAR' },
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

        var SHEET_KEY = 't_sprite_sheet';

        /* PRELOAD the uploaded adjuster sheet (if any) so create() can slice it before
           buildTextures(). Empty/unresolved slot → skipped → procedural fallback. */
        GameScene.prototype.preload = function () {
            var self = this;
            var url = assetUrl('sprite_sheet');
            if (url) {
                try { if (self.textures.exists(SHEET_KEY)) self.textures.remove(SHEET_KEY); } catch (e) {}
                this.load.image(SHEET_KEY, url);
            }
            this.load.on('loaderror', function (file) { try { self.textures.remove(file.key); } catch (e) {} });
        };

        /* Slice the uploaded sheet into the procedural texture keys at the SAME rects the
           exporter drew (sheetLayout()), KEY OUT the purple guide-border, and bake each cell
           back into its key via addCanvas → every existing create/scale/anim uses the new art
           unchanged. usingSheetAsset=false (procedural) if the slot is empty / load failed. */
        GameScene.prototype.sliceSpriteSheet = function () {
            usingSheetAsset = false;
            if (!this.textures.exists(SHEET_KEY)) return;
            var src = this.textures.get(SHEET_KEY).source[0];
            if (!src || !src.width) return;
            var img = src.image || src.source; if (!img) return;
            var dim = sheetLayout();   // fills SHEET_MAP[i].rect — identical coords to the exporter
            // sanity vs the expected sheet size; bail to procedural if wildly different.
            if (src.width < dim.w * 0.5 || src.height < dim.h * 0.5) { try { this.textures.remove(SHEET_KEY); } catch (e) {} return; }
            // scale factor if the user uploaded a larger/smaller sheet (keep proportional)
            var sxf = src.width / dim.w, syf = src.height / dim.h;
            var self = this, made = 0;
            SHEET_MAP.forEach(function (e) {
                var r = e.rect;
                var rx = Math.round(r[0] * sxf), ry = Math.round(r[1] * syf);
                var rw = Math.round(r[2] * sxf), rh = Math.round(r[3] * syf);
                try {
                    // 1) cut the cell at the uploaded scale
                    var cut = document.createElement('canvas'); cut.width = rw; cut.height = rh;
                    var cctx = cut.getContext('2d'); cctx.imageSmoothingEnabled = false;
                    cctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
                    // 2) KEY OUT purple guide-border pixels (R>120 && B>180 && G<80) → transparent
                    var id = cctx.getImageData(0, 0, rw, rh), d = id.data;
                    for (var p = 0; p < d.length; p += 4) {
                        if (d[p] > 120 && d[p + 2] > 180 && d[p + 1] < 80) { d[p + 3] = 0; }
                    }
                    cctx.putImageData(id, 0, 0);
                    // 3) downscale back to the native texture size (ew×eh) so all world numbers stay
                    var dest = document.createElement('canvas'); dest.width = e.ew; dest.height = e.eh;
                    var dctx = dest.getContext('2d'); dctx.imageSmoothingEnabled = false;
                    dctx.drawImage(cut, 0, 0, rw, rh, 0, 0, e.ew, e.eh);
                    // 4) bake into the engine texture key (replaces the procedural draw)
                    if (self.textures.exists(e.key)) self.textures.remove(e.key);
                    self.textures.addCanvas(e.key, dest);
                    made++;
                } catch (e2) { /* CORS-taint / no canvas → leave this key for procedural */ }
            });
            usingSheetAsset = made > 0;
        };

        GameScene.prototype.create = function () {
            var self = this;
            // Slice the uploaded adjuster sheet FIRST so buildTextures() auto-skips the procedural
            // draw for any key we replaced (tex() guards on textures.exists).
            this.sliceSpriteSheet();
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

            // soft NEBULA CLOUDS — stacked translucent blobs that DRIFT with the world (Y axis),
            // building the semi-realistic deep-space look. Accent hue derived from the sector palette.
            var accent = [0x4a6aff, 0x8a7a6a, 0xff4d8a, 0xffb020, 0xff6a2a, 0xffd447][idx] || 0x6a5aff;
            var neb = reg(this.add.graphics().setScrollFactor(0.25).setDepth(-58));
            for (var nb = 0; nb * 900 < worldH; nb++) {
                var ncx = 40 + ((nb * 197) % (BW - 80)), ncy = 120 + nb * 900 + ((nb * 71) % 300), nr = 90 + ((nb * 53) % 120);
                for (var ri = 5; ri >= 1; ri--) { neb.fillStyle(accent, 0.05 * (ri / 5)); neb.fillCircle(ncx, ncy, nr * (ri / 5)); }
                neb.fillStyle(0xffffff, 0.03); neb.fillCircle(ncx - nr * 0.2, ncy - nr * 0.2, nr * 0.4);
            }

            // far stars (scrollFactor 0.15) — spread along the TALL world (Y axis), varied colour/size
            var STAR_COLS = [0xffffff, 0xbdd6ff, 0xffe6c0, 0x9bffe0, 0xffc0e0];
            for (var s = 0; s < Math.ceil(worldH / 40); s++) {
                var sx = (s * 73) % BW, sy = s * 40 + (s * 37) % 40;
                var st = reg(this.add.image(sx, tuneY('star', sy), 't_star').setScrollFactor(0.15).setDepth(-55)
                    .setAlpha(0.35 + (s % 6) * 0.11).setScale(0.6 + (s % 4) * 0.55).setTint(STAR_COLS[s % STAR_COLS.length]));
                self.regTune(st, 'star');
                // occasional twinkle
                if (s % 9 === 0) self.tweens.add({ targets: st, alpha: 0.15, duration: 900 + (s % 5) * 220, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            }
            // mid: planet / wreck / station landmark per sector (scrollFactor 0.4), along Y
            var landmarkTex = idx === 5 ? 't_station' : idx === 4 ? 't_wreck' : 't_planet';
            var landmarkId = (landmarkTex === 't_planet') ? 'planet' : 'landmark';
            for (var m = 0; m * 1100 < worldH; m++) {
                var lx = 80 + (m % 2) * (BW - 240);
                self.regTune(reg(this.add.image(lx, tuneY(landmarkId, 300 + m * 1100), landmarkTex).setScrollFactor(0.4).setDepth(-45).setAlpha(0.55).setScale(0.7 + (m % 2) * 0.3)), landmarkId);
            }
            // near: drifting asteroid/debris silhouettes (scrollFactor 0.7) — ambient, along Y
            for (var p = 0; p * 520 < worldH; p++) {
                var px = this.PLAY_LEFT + 40 + (p * 90) % (this.PLAY_RIGHT - this.PLAY_LEFT - 80), py = 200 + p * 520;
                self.regTune(reg(this.add.image(px, tuneY('debris', py), 't_asteroid_s').setScrollFactor(0.7).setDepth(-30).setAlpha(0.5).setScale(0.8 + (p % 3) * 0.4).setAngle((p * 47) % 360)), 'debris');
            }
        };

        /* ---------- per-sector ---------- */
        GameScene.prototype.showBriefing = function (idx) {
            var self = this;
            // Pause is DEFERRED (delayedCall) because pausing synchronously inside create()
            // — where this is first called — is unreliable while the scene isn't fully
            // running yet. But that defer opens a race: if the player clicks "MAJU" before
            // this fires, loadSector() resumes a not-yet-paused scene (no-op), THEN this
            // pause fires and freezes the game with no dialog visible ("seperti ter-pause").
            // Keep a handle so loadSector() can cancel a still-pending pause.
            if (this._pausePending) { try { this._pausePending.remove(false); } catch (e) {} }
            this._pausePending = this.time.delayedCall(0, function () { self._pausePending = null; self.scene.pause(); });
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
            // Cancel a still-pending briefing pause (see showBriefing) so it can't fire AFTER
            // we resume and silently re-freeze the game. Then resume UNCONDITIONALLY — resume()
            // on an already-running scene is a harmless no-op, and this closes both race
            // directions (pause-fires-before vs after the resume check).
            if (this._pausePending) { try { this._pausePending.remove(false); } catch (e) {} this._pausePending = null; }
            this.scene.resume();
            try {
                window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { hideOverlays(); }); });
            } catch (e) { hideOverlays(); }
        };

        /* ---------- build sector: spine + patterns + spawn records (Bible APPENDIX F) ---------- */
        GameScene.prototype.buildSector = function (idx) {
            this._sectorReady = false;   // update() must not run until this sector is fully built
            this.enemies.clear(true, true); this.hazards.clear(true, true);
            this.capsules.clear(true, true); this.bullets.clear(true, true); this.ebullets.clear(true, true);
            if (this.boss) { try { this.boss.destroy(); } catch (e) {} this.boss = null; }
            if (this.bossHpSmall) { try { this.bossHpSmall.destroy(); } catch (e) {} this.bossHpSmall = null; }

            this.arenaY = null; this.bossActive = false; this.bossDead = false; this.bossPhase = 1;
            this.tunables = [];   // reset the sprite-tuner registry for this sector
            var isBoss = (idx === C.sectors - 1);
            // VERTICAL: world is TALL. Camera starts at the BOTTOM and rises toward Y=0 (the goal/boss).
            // Stage length trimmed ~25% (was 7200 / 4800) so runs feel tighter.
            var len = isBoss ? 3600 : 5400;
            this.worldH = len;
            this.physics.world.setBounds(0, 0, BW, len);
            this.cameras.main.setBounds(0, 0, BW, len);
            this.cameras.main.scrollY = len - BH;   // start at the bottom of the world
            this.cameras.main.scrollX = 0;

            this.buildBackdrop(idx);

            // ship reset — bottom-center. ENTRY ANIMATION: start just BELOW the bottom edge and
            // slide UP into the play area (arcade re-entry), so after the previous stage's fly-off
            // the new ship flies in from below. Player control is locked until it settles.
            var restY = this.cameras.main.scrollY + this.PLAY_BOTTOM - 40;
            this.ship.setPosition(BW / 2, this.cameras.main.scrollY + BH + 60);
            this.ship.body.setVelocity(0, 0);
            this.ship.autoFly = true;            // lock input during the fly-in
            this.ship.invuln = Math.max(this.ship.invuln || 0, 1200);
            var shp = this.ship;
            this.tweens.killTweensOf(shp);       // no stacked entry tweens across rapid reloads
            this.tweens.add({
                targets: shp, y: restY, duration: 620, ease: 'Cubic.out',
                onComplete: function () { shp.autoFly = false; if (shp.body) shp.body.setVelocity(0, 0); }
            });

            // camera-relative spawn list (records sorted by triggerY DESCENDING — born as the
            // rising camera's TOP edge reaches them, i.e. when cam.scrollY <= triggerY). §5.4
            this.spawnList = []; this._spawnNext = 0;
            this.scrollSpeed = this.diff.scroll;
            this.sectorCleared = false;

            if (isBoss) {
                this.exitY = -999999;   // boss sector never "clears" via camera exit — win is boss-death
                this.buildBossArena(len);
                this.updateHUD();
                this._sectorReady = true;
                return;
            }

            this.populateSector(idx, len);
            this.exitY = 260;   // camera reaching near the top (scrollY <= exitY) = sector clear
            this.updateHUD();
            this._sectorReady = true;
        };

        /* TUNABLE REGISTRY — every sprite the tuner can nudge registers here at creation, tagged
           with its `tuneId`. This is the single source the live-apply walks, so EVERY sprite type
           (ship, enemies, capsules, hazards, boss, couple, parallax bg) shifts instantly when its
           slider moves. Reset per sector in buildSector(). */
        GameScene.prototype.regTune = function (el, id) {
            if (!el) return el;
            if (!this.tunables) this.tunables = [];
            try { el.setData && el.setData('tuneId', id); } catch (e) {}
            this.tunables.push({ el: el, id: id });
            return el;
        };

        /* SPRITE TUNER live-apply: shift every registered sprite tagged with this id by the DELTA.
           The ship is a free-flight entity clamped each frame, so its tune is handled at spawn +
           a transient nudge here; everything else is a plain Y shift (instantly visible). The game
           keeps running while the panel is open. */
        GameScene.prototype.applyLiveTune = function (id, newVal) {
            var oldVal = (TUNE[id] || 0), delta = newVal - oldVal;
            TUNE[id] = newVal; saveTune();
            if (!delta) return;
            // ship: nudge it directly (clamp re-derives its band next frame, so this is transient
            // but enough to preview; the persisted value re-anchors its spawn each sector).
            if (id === 'ship') { if (this.ship && this.ship.active) this.ship.y += delta; return; }
            // EVERYTHING ELSE — plain Y shift via the registry. Prune dead refs as we go.
            if (this.tunables) {
                this.tunables = this.tunables.filter(function (rec) {
                    var s = rec.el;
                    if (!s || (s.active === false) || (s.scene == null)) return false;   // gone
                    if (rec.id !== id) return true;
                    s.y += delta;
                    if (s.getData && s.getData('baseY') != null) s.setData('baseY', s.getData('baseY') + delta);
                    if (s.getData && s.getData('worldY') != null) s.setData('worldY', s.getData('worldY') + delta);
                    if (s.body && s.refreshBody && s.body.immovable) { try { s.refreshBody(); } catch (e2) {} }
                    return true;
                });
            }
            // boss small-HP bar follows boss.y in updateBossHp(); nothing else to sync.
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
            var a = this.hazards.create(x, tuneY('asteroid', y), large ? 't_asteroid' : 't_asteroid_s');
            a.setData('type', 'asteroid'); a.setData('hp', large ? 4 : 2); a.setData('large', large);
            a.body.setAllowGravity(false); a.body.setVelocity((Math.random() - 0.5) * 30, this.diff.scroll * 0.4);
            a.body.setImmovable(false);
            a.setData('spin', (Math.random() - 0.5) * 0.6);
            a.body.setCircle((large ? 18 : 9));
            this.regTune(a, 'asteroid');
            return a;
        };
        GameScene.prototype.placeBarel = function (x, y) {
            var b = this.hazards.create(x, tuneY('barel', y), 't_barel');
            b.setData('type', 'barel'); b.setData('hp', 1); b.setData('explosive', true);
            b.body.setAllowGravity(false); b.body.setVelocity(0, this.diff.scroll * 0.5);
            this.regTune(b, 'barel');
            return b;
        };
        GameScene.prototype.placeMine = function (x, y) {
            var m = this.hazards.create(x, tuneY('mine', y), 't_e_mine');
            m.setData('type', 'mine'); m.setData('hp', 1);
            m.body.setAllowGravity(false); m.body.setVelocity(0, this.diff.scroll * 0.5);
            this.regTune(m, 'mine');
            return m;
        };
        GameScene.prototype.placeLaserGate = function (y) {
            var self = this, gy = tuneY('laser', y), g = this.hazards.create(BW / 2, gy, 't_lasergate');
            g.setData('type', 'laser'); g.setData('on', true); g.setData('static', true);
            g.body.setAllowGravity(false); g.body.setImmovable(true);
            g.body.setVelocity(0, 0);   // world-fixed at this Y (spans the width)
            g.setData('worldY', gy);
            g.setData('timer', this.time.addEvent({
                delay: 1200, loop: true, callback: function () {
                    var on = !g.getData('on'); g.setData('on', on);
                    g.setAlpha(on ? 1 : 0.12);
                }
            }));
            this.regTune(g, 'laser');
            return g;
        };
        GameScene.prototype.placeBlueCapsule = function (x, y) {
            var c = this.capsules.create(clamp(x, this.PLAY_LEFT + 16, this.PLAY_RIGHT - 16), tuneY('power', y), 't_capsule_blue');
            c.setData('kind', 'power');
            c.body.setAllowGravity(false); c.body.setVelocity(0, this.diff.scroll * 0.6);
            this.tweens.add({ targets: c, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            this.regTune(c, 'power');
            return c;
        };
        GameScene.prototype.placePieceCapsule = function (x, y, key) {
            x = clamp(x, this.PLAY_LEFT + 26, this.PLAY_RIGHT - 26);
            y = tuneY('capsule', y);
            var c = this.capsules.create(x, y, 't_amplop');
            c.setData('kind', 'piece'); c.setData('key', key); c.setData('hp', 1);
            c.body.setAllowGravity(false); c.body.setVelocity(0, this.diff.scroll * 0.5);
            this.tweens.add({ targets: c, scaleX: 1.15, scaleY: 1.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            // gold pulse + beacon ring + star marker so guests can't miss it.
            // NOTE: the marker glyph must NOT be an envelope — the capsule itself is the
            // envelope (t_amplop); a second 💌 here made players think the marker was the
            // collectible. A pulsing ★ reads as "location beacon", not "item".
            var ring = this.add.circle(x, y, 18, 0xffd447, 0).setStrokeStyle(2, 0xffd447, 0.9).setDepth(-1);
            this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.out', onRepeat: function () { ring.setScale(1); ring.alpha = 1; } });
            c.setData('ring', ring);
            var sos = this.add.text(x, y + 26, '★', { fontFamily: 'monospace', fontSize: '14px', color: '#ffd447', fontStyle: 'bold' }).setOrigin(0.5).setDepth(7);
            this.tweens.add({ targets: sos, alpha: 0.4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            c.setData('sos', sos);
            this.regTune(c, 'capsule');
            return c;
        };

        /* ================= SPAWN ENEMY (born at camera edge) ================= */
        GameScene.prototype.spawnEnemy = function (type, x, y, fmt) {
            if (type === 'mine') return this.placeMine(x, y);   // mine is a hazard entity
            var texKey = 't_e_' + type;
            var e = this.enemies.create(x, tuneY(type, y), texKey);
            e.setData('type', type); e.setData('fmt', fmt);
            e.body.setAllowGravity(false);
            e.setData('baseX', x); e.setData('seed', Math.random() * 6.28); e.setData('aimT', type === 'turret' ? 500 : 900);
            var hp = { drone: 1, flyer: 2, turret: 3, korvet: 4, mech: 8, carrier: 10 }[type] || 1;
            e.setData('hp', hp);
            // VERTICAL: drift DOWN relative to scroll so enemies sweep down past the player.
            var vy = this.diff.scroll + (type === 'flyer' ? 80 : type === 'mech' || type === 'carrier' ? -30 : 40);
            e.body.setVelocity(0, vy);
            e.setData('vy0', vy);
            this.regTune(e, type);
            return e;
        };

        /* ================= BOSS (Bible APPENDIX D) ================= */
        GameScene.prototype.buildBossArena = function (len) {
            var self = this, midX = BW / 2;
            this.bossActive = false; this.bossDead = false; this.bossPhase = 1;
            // clear any couple/platform left from a previous boss-arena build (hot-reload safety)
            ['couple', 'couplePad', 'couplePadTop'].forEach(function (k) { if (self[k]) { try { self[k].destroy(); } catch (e) {} self[k] = null; } });
            // VERTICAL: the boss sits near the TOP of the world. The camera rises; walk-in
            // triggers when cam.scrollY <= arenaY (camera's top reaches the arena).
            this.arenaY = Math.round(BH * 0.9);   // small Y near the top of the world
            this.exitY = -999999;

            // APPROACH WAVE — enemies must appear from the START of the climb, not only in
            // the last stretch before the boss. The camera starts at scrollY = len - BH and
            // rises (scrollY decreasing) to arenaY. Records spawn when cam.scrollY <= record.y,
            // so to fill the whole climb we spread trigger-Ys across [camStart-ish .. arenaY].
            // (Previously all 3 guards sat at arenaY+400..+800, ~2500px above the start, so the
            // camera climbed ~20s through empty space before the first one appeared.)
            var camStart = len - BH;                 // camera's initial scrollY (bottom of world)
            var top = this.arenaY + 200;             // last guard just before the boss arena
            var span = Math.max(1, camStart - 240 - top);
            var guards = [
                ['drone',  midX - 70],
                ['korvet', midX + 50],
                ['drone',  midX + 80],
                ['korvet', midX - 90],
                ['drone',  midX],
                ['korvet', midX + 30],
                ['drone',  midX - 40]
            ];
            for (var gi = 0; gi < guards.length; gi++) {
                // evenly spaced from near the camera start (spawns almost immediately) down to `top`
                var ty = Math.round(top + span * (1 - gi / (guards.length - 1)));
                this.recordEnemy(guards[gi][0], guards[gi][1], ty);
            }
            this.spawnList.sort(function (a, b) { return b.y - a.y; });   // descending y

            // the united-couple reward — hidden until the boss dies, then it rises onto a
            // "moon/station deck" platform (see defeatBoss). Base Y sits where the boss was so
            // it reads as taking the station's place. Start fully hidden (alpha 0, low).
            var coupleY = tuneY('couple', 200);
            // platform the couple stands on (so it doesn't look like it floats in the void).
            // fillAlpha stays 1; we hide via the GameObject alpha (0) and tween that on win.
            this.couplePad = this.add.ellipse(midX, coupleY + 44, 150, 34, 0x2a2c52, 1).setDepth(-5).setAlpha(0);
            this.couplePadTop = this.add.ellipse(midX, coupleY + 38, 128, 24, 0x3a3c6a, 1).setDepth(-5).setAlpha(0);
            this.couple = this.add.image(midX, coupleY, 't_couple').setScrollFactor(1).setDepth(-4).setAlpha(0).setScale(0.6);
            this.regTune(this.couple, 'couple');

            // boss: INACTIVE via alpha (NOT setActive(false) — Bible §16/D.4). Sits near top.
            var bx = midX, by = tuneY('boss', 240);
            var b = this.physics.add.sprite(bx, by, 't_boss');
            b.body.setAllowGravity(false); b.body.setImmovable(true);
            b.body.setSize(150, 110); b.body.setOffset(35, 10);
            var maxhp = Math.round(this.dps() * this.diff.bossTTK);
            b.setData('hp', maxhp); b.setData('maxhp', maxhp);
            b.setData('homeX', bx); b.setData('atkT', 2200); b.setData('coreDX', 0); b.setData('coreDY', 40);   // core at bottom-center
            b.setData('tuneId', 'boss');
            b.setAlpha(0);
            this.boss = b;
            this.physics.add.overlap(this.ship, b, function () { if (self.bossActive && !self.ship.cheat) self.shipHit(); });

            // HP bar — ONLY the small bar floating above the boss (the big top-center bar near
            // the SCORE was a confusing duplicate and has been removed). Bible D.3.
            this.bossHpSmallW = 90;
            this.bossHpSmall = this.add.rectangle(bx - 45, by - 70, this.bossHpSmallW, 5, 0xff4d4d).setOrigin(0, 0.5).setDepth(41).setVisible(false);

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
            this.bossHpSmall.setVisible(true);
            this.flash(0xffffff, 120); this.addTrauma(0.3); SFX.boss();
            toast('⚠ BOSS: Stasiun Pelaminan — satukan dua bintang!');
            // OPEN THE CORE. The weak-point is only damageable at bossPhase >= 2, but the only
            // place that advances the phase is hitBoss() — which itself needs the core already
            // open. That was an unreachable state (phase stuck at 1 → boss unkillable). There is
            // no separate shield-destruction mechanic, so after a short "shields up" telegraph
            // we expose the core so the fight is winnable. Phase 2/3 HP thresholds still fire in
            // hitBoss() as HP drops further.
            this.time.delayedCall(1400, function () {
                if (self.bossDead || !self.boss || !self.boss.active) return;
                if (self.bossPhase < 2) { self.bossPhase = 2; self.bossPhaseBeat(); }
            });
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
            // BLINK: hit-feedback flashes the BOSS SPRITE ONLY (no full-screen camera flash —
            // that lit up the whole play area on every bullet). Small trauma nudge + a spark
            // burst at the core keep the punch without the screen-wide strobe.
            this.addTrauma(0.08); this.burst(boss.x + boss.getData('coreDX'), boss.y + boss.getData('coreDY'), 0xffd447, 6);
            boss.setTintFill(0xffffff); var bb = boss;
            this.time.delayedCall(70, function () { if (bb.active) bb.clearTint(); });
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
            if (!this.bossHpSmall || !this.boss || !this.boss.active) return;
            var hp = Math.max(0, this.boss.getData('hp')), max = this.boss.getData('maxhp');
            this.bossHpSmall.setPosition(this.boss.x - 45, this.boss.y - 80);
            this.bossHpSmall.width = this.bossHpSmallW * (hp / max);
        };
        GameScene.prototype.defeatBoss = function (boss) {
            var self = this;
            this.bossDead = true; this.bossActive = false;
            this.bossHpSmall.setVisible(false);
            this.burst(boss.x, boss.y, 0xffd447, 30); this.addTrauma(0.5); this.flash(0xffffff, 150); this.freeze(120);
            var bx = boss.x, by = boss.y;
            for (var i = 0; i < 6; i++) (function (i) {
                self.time.delayedCall(120 + i * 130, function () { self.burst(bx + rnd(-60, 60), by + rnd(-50, 50), 0xff8a3d, 16); self.flash(0xffaa44, 60); });
            })(i);
            try { boss.destroy(); } catch (e) {}
            SFX.win();

            // --- REWARD REVEAL: the united couple rises onto its platform (not floating) ---
            // Fade in the moon/station deck first, then the couple rises from below the pad,
            // grows to full size, and settles into a gentle idle bob. Heart confetti + a soft
            // beacon ring frame the moment so it reads as a celebration, not a stray sprite.
            if (this.couplePad) this.tweens.add({ targets: [this.couplePad, this.couplePadTop], alpha: 1, duration: 700, delay: 500 });
            var cp = this.couple;
            if (cp) {
                var restY = cp.y;
                cp.setPosition(cp.x, restY + 40).setAlpha(0).setScale(0.6);
                this.tweens.add({
                    targets: cp, alpha: 1, scale: 1, y: restY, duration: 900, delay: 500, ease: 'Back.out',
                    onComplete: function () {
                        // gentle idle bob so the couple feels alive but grounded on the platform
                        self.tweens.add({ targets: cp, y: restY - 8, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
                    }
                });
                // heart confetti bursts around the couple
                for (var h = 0; h < 5; h++) (function (h) {
                    self.time.delayedCall(700 + h * 260, function () {
                        if (self.pHeart) self.pHeart.explode(8, cp.x + rnd(-50, 50), restY + rnd(-40, 30));
                    });
                })(h);
                // glowing beacon ring pulsing out from the couple
                var ring = this.add.circle(cp.x, restY, 30, 0xffd447, 0).setStrokeStyle(3, 0xffd447, 0.8).setDepth(-3);
                this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 1400, delay: 700, repeat: 2, ease: 'Sine.out', onRepeat: function () { ring.setScale(1); ring.alpha = 0.8; } });
            }

            // --- IN-CANVAS "MISSION COMPLETE" banner (same arcade style as STAGE CLEAR) ---
            this.showWinBanner();

            // HTML win dialog (#sw-win, buka undangan) still follows — bossFinale() shows it after
            // its own celebration beat, so the guest gets the instant in-canvas banner first, then
            // the actionable dialog.
            bossFinale();
        };

        /* in-canvas "MISI SELESAI" banner — the victory counterpart of showStageClearBanner().
           Pinned to the camera, pops in, and fades out on its own (the #sw-win dialog carries the
           actual "buka undangan" action afterwards). */
        GameScene.prototype.showWinBanner = function () {
            if (this.winBanner) { try { this.winBanner.destroy(true); } catch (e) {} }
            var g = this.add.container(BW / 2, BH * 0.34).setScrollFactor(0).setDepth(60);
            var title = this.add.text(0, 0, 'MISI SELESAI', {
                fontFamily: 'monospace', fontSize: '38px', color: '#ffd447', fontStyle: 'bold',
                stroke: '#0a0e1a', strokeThickness: 6
            }).setOrigin(0.5);
            var sub = this.add.text(0, 42, '★ DUA BINTANG BERSATU ★', {
                fontFamily: 'monospace', fontSize: '15px', color: '#ff8ab0', fontStyle: 'bold'
            }).setOrigin(0.5);
            var sc = this.add.text(0, 68, 'Undangan siap dibuka!', {
                fontFamily: 'monospace', fontSize: '13px', color: '#4fd6ff'
            }).setOrigin(0.5);
            g.add([title, sub, sc]);
            g.setScale(0.6).setAlpha(0);
            this.tweens.add({ targets: g, scale: 1, alpha: 1, duration: 360, ease: 'Back.out' });
            // fade the banner out after a beat so the couple + dialog take over
            this.tweens.add({
                targets: g, alpha: 0, duration: 600, delay: 3600,
                onComplete: function () { try { g.destroy(true); } catch (e) {} }
            });
            this.winBanner = g;
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
            // GUARD: on a fresh boot, create() shows the briefing and pauses the scene
            // via a delayedCall(0), so one update() tick can slip through BEFORE
            // buildSector() has initialized the sector. At that point cam.scrollY is
            // still 0 and this.exitY is undefined, which makes the safety stage-clear
            // check below misfire (undefined !== -999999 && 0 <= 4) → instant "STAGE
            // CLEAR" with an empty spawnList. buildSector() always sets _sectorReady
            // last; bail out until then so no scroll/spawn/clear logic runs unbuilt.
            if (!this._sectorReady) return;
            pollEdges();
            var dt = delta / 1000, cam = this.cameras.main;

            // STAGE-CLEAR OUTRO: while the cinematic clear sequence is active, drive ONLY the ship
            // fly-off (banner beat → blast up off-screen → load next). Skip scroll/spawn/enemy/boss
            // logic so nothing else moves or can hurt the player during the outro.
            if (this.clearSeq) {
                if (this.ship && this.ship.active) this.ship.step(time, delta);
                this.updateClearSeq(time, delta);
                this.cullBullets();
                this.trauma = Math.max(0, this.trauma - delta / 600);
                return;
            }

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

        /* CINEMATIC STAGE CLEAR (real-shmup feel): show a "STAGE CLEAR" banner, then the ship
           AUTO-FLIES straight up and off the top of the screen; only after it leaves does the next
           sector load (the new ship re-enters from the bottom in loadSector). The scene KEEPS
           RUNNING (no scene.pause()) so the fly-off animates — the sequence is driven each frame by
           updateClearSeq(). On the final sector we still just return (boss path handles the win). */
        GameScene.prototype.onSectorClear = function () {
            if (this.sectorIdx + 1 >= C.sectors) { this.scene.pause(); return; }
            runState.score = this.score;
            // stop the world: freeze scroll + spawns, clear incoming danger, lock the player.
            this.scrollSpeed = 0;
            this.spawnList = []; this._spawnNext = 0;
            this.clearIncomingDanger();
            if (this.ship) { this.ship.body.setVelocity(0, 0); this.ship.invuln = 999999; }  // invulnerable during the outro
            // camera-fixed "STAGE CLEAR" banner (in-canvas, like the arcade) — no button, no pause.
            this.showStageClearBanner();
            // sequence state machine driven in update(): banner beat → fly-off → load next.
            this.clearSeq = { phase: 'banner', t: 0, flySpeed: 0 };
            SFX.win();
        };

        /* remove anything that could still hit the ship during the victory outro */
        GameScene.prototype.clearIncomingDanger = function () {
            var self = this;
            this.ebullets.getChildren().forEach(function (b) { if (b.active) { self.ebullets.killAndHide(b); if (b.body) b.body.enable = false; } });
            this.enemies.getChildren().forEach(function (e) { if (e.active) { var m = e.getData && e.getData('mark'); if (m) m.destroy(); e.destroy(); } });
            this.hazards.getChildren().forEach(function (h) { if (h.active) self.clearHazard(h); });
        };

        /* in-canvas STAGE CLEAR text, pinned to the camera (scrollFactor 0), centred + a small
           score line. Animated in with a pop; torn down when the next sector loads. */
        GameScene.prototype.showStageClearBanner = function () {
            if (this.clearBanner) { try { this.clearBanner.destroy(true); } catch (e) {} }
            var g = this.add.container(BW / 2, BH * 0.40).setScrollFactor(0).setDepth(60);
            var title = this.add.text(0, 0, 'STAGE CLEAR', {
                fontFamily: 'monospace', fontSize: '40px', color: '#ffd447', fontStyle: 'bold',
                stroke: '#0a0e1a', strokeThickness: 6
            }).setOrigin(0.5);
            var sub = this.add.text(0, 44, 'SEKTOR ' + (this.sectorIdx + 1) + ' AMAN', {
                fontFamily: 'monospace', fontSize: '15px', color: '#4fd6ff', fontStyle: 'bold'
            }).setOrigin(0.5);
            var sc = this.add.text(0, 70, 'SKOR  ' + pad6(this.score), {
                fontFamily: 'monospace', fontSize: '13px', color: '#eaffff'
            }).setOrigin(0.5);
            g.add([title, sub, sc]);
            g.setScale(0.6); g.setAlpha(0);
            this.tweens.add({ targets: g, scale: 1, alpha: 1, duration: 320, ease: 'Back.out' });
            this.clearBanner = g;
        };

        /* STAGE-CLEAR sequence — runs every frame from update() while clearSeq is active.
           banner: hold a beat so the player reads it.
           fly:    ship accelerates straight UP until it leaves the top of the screen.
           done:   advance to the next sector (loadSector re-enters the ship from the bottom). */
        GameScene.prototype.updateClearSeq = function (time, delta) {
            var seq = this.clearSeq; if (!seq) return;
            seq.t += delta;
            var cam = this.cameras.main, sh = this.ship;
            if (seq.phase === 'banner') {
                if (seq.t >= 950) { seq.phase = 'fly'; seq.t = 0; if (sh) sh.autoFly = true; }
            } else if (seq.phase === 'fly') {
                // ease the ship into a fast ascent (arcade "blast off"): ramp speed up over ~0.5s.
                seq.flySpeed = Math.min(900, seq.flySpeed + delta * 2.2);
                if (sh && sh.body) {
                    sh.body.setVelocity(0, -seq.flySpeed);
                    // little exhaust sparks behind the ship as it climbs
                    if ((seq.t | 0) % 60 < delta) this.burst(sh.x, sh.y + 26, 0x4fd6ff, 3);
                    // gone once fully above the top edge of the current view
                    if (sh.y < cam.scrollY - 70) { seq.phase = 'done'; }
                }
                // safety timeout so we never get stuck mid-outro
                if (seq.t > 2500) seq.phase = 'done';
            } else if (seq.phase === 'done') {
                this.clearSeq = null;
                if (sh) { sh.autoFly = false; sh.invuln = 0; }
                if (this.clearBanner) { try { this.clearBanner.destroy(true); } catch (e) {} this.clearBanner = null; }
                // advance to the next sector via the normal hot-load path (shows briefing → builds
                // the sector → re-enters the ship from the bottom). nextSector() bumps the index,
                // saves maxSector, and calls loadSector().
                nextSector();
            }
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

            // STAGE-CLEAR FLY-OFF: the engine drives the ship straight up off the top (the scene's
            // clearSeq handles velocity + thrust frame). Player input is ignored, no firing, no
            // clamp — just keep the anim/exhaust ticking so it reads as a powered ascent.
            if (this.autoFly) {
                this.setAngle(0);
                if (this.play) this.play('ship_thrust', true);
                return;
            }

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
