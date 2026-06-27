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
    var VERSION = 'v2.4.1';   // FIX Simpan: (1) now works from the PUBLISHED INVITATION too (not only the Theme Editor) — ThemeWrapper exposes window.__MSW_API_URL/__MSW_THEME_ID/__MSW_THEME_JS on the live page, so the ★ tuner's 💾 Simpan can authenticate+save from a guest's invitation. (2) FIX "Invalid username or password" despite correct creds: Apps Script answers a cross-origin POST with a 302→GET redirect that DROPS the body, so login/password never reached the backend; mswApiPost now ALSO sends action/username/password/token/id in the QUERY STRING (backend reads e.parameter on the redirected GET), mirroring apiClient.ts. PREV (v2.4.0) NEW Sprite-Tuner "💾 Simpan" button: opens a superadmin username/password dialog; on valid superadmin login it BAKES the current tuner values into this theme's own TUNE_DEFAULTS line and saves the JS source to the DB via the SAME API as the Theme Editor (login → updateTheme, __chunked). Needs the host bridge globals (window.__MSW_API_URL/__MSW_THEME_ID/__MSW_THEME_JS) injected by ThemeEditorPage's preview iframe; outside the editor the button just toasts that save is editor-only. PREV (v2.3.3) Baked tuner defaults updated: caged +6, tank +9, boss -31 (mech naik 31px), crate -9 (peti naik 9px). PREV (v2.3.2) FIX "peluru musuh belum naik": asset-mode enemies use origin-BOTTOM (e.y = feet), so the old flat e.y-6 spawned enemy bullets at ground level. New enemyMuzzleY() lifts the spawn to gun height (~60% of display height above the feet) in asset mode; procedural stays e.y-6. PREV (v2.3.1) Baked tuner defaults updated: ground +4 (tanah turun 4px) & bush -3 (rumput/semak naik 3px). Musuh Range stays at +6 (3px lebih ke atas dari sebelumnya, sudah dibaked). PREV (v2.3.0) Sprite Tuner now lists EVERY sprite (25 types incl. rumput/bush, palm, sandbag, flag, ground, ledge, arch, clouds/mountains/hills) in a 2-COLUMN panel, and every slider shifts its sprites LIVE via a per-sector tunable REGISTRY (this.tunables) — not just the few hard-coded groups. Open the tuner WHILE IN-GAME (a scene must exist) for live changes; on the cover screen it only saves. PREV (v2.2.1) FIX: tuner panel was hard-gated to desktop-landscape with display:none!important → inside the narrower Theme-Editor preview the ★ looked dead (panel never showed). Now the panel shows whenever toggled (.show); its ★ trigger still lives in the desktop-only side badge. PRESS START unchanged (delegated capture listener). PREV (v2.2.0) Sprite Tuner access MOVED out of the game frame: trigger is now a HIDDEN ★ inline in the left side badge ("UNDANGAN PERNIKAHAN"); the panel opens (PC only) as a fixed overlay at the TOP-LEFT of the RIGHT panel (right of the 480px frame). Baked tuner defaults updated (boss 16, spike 7) → TUNE_KEY v3. PREV (v2.1.1) FIX: Sprite Tuner sliders were not rendering (empty list) — rows now built with pure DOM API + listeners bound per-slider, and the list is ALWAYS (re)built every time the panel opens (survives host re-injection wiping it back to empty). Panel bg made fully opaque. PREV (v2.1.0) PC-only Sprite Tuner panel (bottom-right ⇅ button) — per-sprite vertical offset sliders, live-apply (no pause), persisted + "Salin nilai" so the user can dial-in feet-on-ground positions and send the values back. PREV (v2.0.3) crate/enemy anchoring: switched to ORIGIN-BOTTOM at the surface for the crate (center−4 was sinking it 12px into the plank) and for asset-mode enemies (body now bottom-aligned to the feet → no ngambang). Verified by compositing the real crate/turret/rush/range on ground+ledge (all flush). Ledge stays center-origin (its top is already correct).
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
        storeKey: 'msw_v1',
        /* DENSITY ENGINE "NO DEAD AIR" (MS2 Bible §3.3 / APPENDIX E.2). Per-screen FLOORS
           (one screen = BW). minEnemies scales by difficulty; the rest are hard floors.
           maxDeadPx = ≤0.75×BW empty run; rewardEveryPx = item/POW cadence. */
        density: {
            minEnemies:     { easy: 3, normal: 4, hard: 6 },
            minPlatforms:   1,     // elevated platforms per screen
            minDestructible: 2,    // barrels/crates per screen
            maxDeadPx:      0.75,  // × BW — longest allowed empty run
            rewardEveryPx:  2.5    // × BW — reward (POW/crate) cadence
        },
        /* REACHABILITY (level-gen). MEASURED apex (semi-implicit Euler @60fps, jump=-560,
           gravity=1500) = ~99.9px — the analytic 104 is optimistic, so the body actually
           rises only ~100px. Every elevated platform MUST be climbable: rise from a lower
           foothold ≤ stepUp, with a HEALTHY margin under the real apex so a slightly-late
           or edge jump still lands. stepUp/tierGap were 86/78 → only ~14px margin → "plafon
           tidak bisa dinaiki". Now 70/64: ~30px margin, and tierGap ≤ stepUp so every stacked
           step is reachable from the one below it. */
        reach: {
            jumpApex: 100,   // real measured apex (px) — never place a lone ledge higher than this
            stepUp:   70,    // max rise per hop between footholds (apex − ~30px safety)
            stepRun:  150,   // comfortable horizontal gap to the next foothold while rising
            tierGap:  64     // vertical spacing when stacking a staircase (MUST be ≤ stepUp)
        }
    };

    var SECTOR_NAMES = ['Markas Latih', 'Kota Tua', 'Jembatan Sungai', 'Gurun Konvoi', 'Pangkalan Musuh', 'Markas BOSS'];
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
       PLAYER PNG ASSETS (ASSET.md / player-assets.json) — read URL from the
       hidden #msw-assets <img data-asset>. Empty/unresolved → null (fallback
       to procedural). Each asset maps 1:1 to an engine texture key; PNGs that
       load REPLACE the procedural draw (tex() guard skips existing keys).
       Sprites are 60x84 (2x); the player is rendered at scale 0.5 so every
       world-space number (hitbox, GROUND_Y, camera) stays identical.
       ================================================================= */
    function assetUrl(name) {
        var el = document.querySelector('#msw-assets img[data-asset="' + name + '"]');
        if (!el) return null;
        var v = (el.getAttribute('src') || '').trim();
        if (!v || v.indexOf('{{') > -1) return null;
        return v;
    }
    // data-asset name -> engine texture key
    var PLAYER_ASSETS = [
        { name: 'player_idle_1',          key: 't_player_idle0' },
        { name: 'player_idle_2',          key: 't_player_idle1' },
        { name: 'player_run_1',           key: 't_player_run0' },
        { name: 'player_run_2',           key: 't_player_run1' },
        { name: 'player_run_3',           key: 't_player_run2' },
        { name: 'player_run_4',           key: 't_player_run3' },
        { name: 'player_jump_shoot_up',   key: 't_player_jump' },
        { name: 'player_jump_shoot_side', key: 't_player_fall' },
        { name: 'player_jump_shoot_down', key: 't_player_jumpdown' },
        { name: 'player_aim_up',          key: 't_player_aimup' },   // STANDING shoot-up (feet on ground)
        { name: 'player_crouch',          key: 't_player_prone' },
        { name: 'player_hurt',            key: 't_player_hurt' },
        { name: 'player_dead',            key: 't_player_dead' },
        { name: 'player_static',          key: 't_player' }
    ];
    var ASSET_FRAME = { w: 60, h: 84 };   // native PNG size
    // becomes true in create() once at least the idle frames loaded
    var usingPlayerAssets = false;

    /* =================================================================
       ENEMY + BOSS sprite sheet (assets/enemy-sprite-sheet.png, 1408x768).
       ONE whole image uploaded as {{asset_image_15}} (data-asset="enemy_sheet");
       the engine SLICES it itself into the existing procedural texture keys.
       Layout is per-ROW, frames are PACKED with no separators and VARY in width
       (muzzle-flash / wreck poses are wider). Each frame therefore needs its OWN
       explicit rect — a uniform pitch/cell overruns into the neighbour and made the
       boss show a 2nd mech ("ada 2 boss" bug). Rects are measured & verified
       (assets/frame-map.json). Per row: `top`/`ch` = row band (constant height),
       `rects` = [[x, w], …] per frame (same top/ch). `dh` = display height (old
       procedural texture height) → scale = dh/ch, applied UNIFORMLY so wider frames
       just render wider (no distortion, feet/height stay constant). `hb` = world
       hitbox (matches the old procedural feel). `grav:false` = floats (drone/turret).
       ================================================================= */
    var ENEMY_SHEET_KEY = 't_enemy_sheet';
    var ENEMY_SHEET = [
        {
            key: 't_e_rush', top: 9, ch: 111, dh: 38, hb: { w: 18, h: 34 },
            frames: ['walk_1', 'walk_2', 'walk_3', 'walk_4', 'hurt', 'die'],
            rects: [[5, 63], [96, 63], [180, 74], [295, 51], [364, 86], [470, 109]]
        },
        {
            key: 't_e_range', top: 135, ch: 110, dh: 38, hb: { w: 18, h: 34 },
            frames: ['idle', 'aim', 'fire', 'hurt', 'die'],
            rects: [[6, 82], [102, 89], [199, 118], [323, 71], [421, 95]]
        },
        {
            key: 't_turret', top: 260, ch: 80, dh: 28, grav: false, hb: { w: 34, h: 24 },
            frames: ['idle', 'aim', 'fire', 'hurt', 'wreck'],
            rects: [[5, 112], [135, 113], [268, 132], [400, 132], [532, 132]]
        },
        {
            key: 't_drone', top: 353, ch: 78, dh: 20, grav: false, hb: { w: 30, h: 18 },
            frames: ['hover_1', 'hover_2', 'drop', 'wreck'],
            rects: [[5, 121], [149, 119], [291, 125], [446, 103]]
        },
        {
            key: 't_tank', top: 434, ch: 118, dh: 40, hb: { w: 56, h: 36 },
            frames: ['roll_1', 'roll_2', 'aim', 'fire', 'wreck'],
            rects: [[3, 179], [201, 179], [398, 197], [609, 197], [806, 197]]
        },
        {
            key: 't_boss', top: 555, ch: 195, dh: 140, grav: false, hb: { w: 116, h: 128 },
            frames: ['idle_1', 'idle_2', 'telegraph', 'fire', 'enraged', 'defeated'],
            rects: [[6, 181], [210, 180], [413, 202], [633, 256], [902, 187], [1152, 229]]
        }
    ];
    // becomes true in create() once the sheet sliced successfully
    var usingEnemyAssets = false;
    // per texKey -> { scaleX, scaleY } to render the big cell at the engine display size
    var ENEMY_DISP = {};

    /* =================================================================
       OBJECT atlas (assets/object-sprite-sheet.png) — ONE whole image uploaded as
       {{asset_image_16}} (data-asset="object_sheet"); the engine slices it into the
       existing procedural texture keys. Each object's atlas cell is 2× the engine
       texture size (crisp); the slice DOWNSCALES each frame to the native 1× size
       (`ew×eh`) and bakes it into its own standalone key so every existing create/
       tile/scale call works unchanged. Multi-frame entries (amplop/barrel/flame/flag)
       also build a Phaser anim. Coords mirror assets/object-frame-map.json.
       Big parallax bg (t_mountain/t_hill/t_cloud) + unused t_slug stay procedural.
       ================================================================= */
    var OBJECT_SHEET_KEY = 't_object_sheet';
    var OBJECT_SHEET = [
        // key,             ew, eh,  anim,        frames: [[x,y,w,h]...]  (atlas cells, 2×)
        { key: 't_pow', ew: 24, eh: 40, frames: [[14, 36, 48, 80]] },
        { key: 't_amplop', ew: 28, eh: 20, anim: 'o_amplop', rate: 3, frames: [[14, 156, 56, 40], [80, 156, 56, 40]] },
        { key: 't_crate', ew: 32, eh: 32, frames: [[14, 236, 64, 64]] },
        { key: 't_barrel', ew: 26, eh: 36, anim: 'o_barrel', rate: 2, frames: [[14, 340, 52, 72], [76, 340, 52, 72]] },
        { key: 't_bullet', ew: 12, eh: 5, frames: [[14, 452, 24, 10]] },
        { key: 't_ebullet', ew: 9, eh: 9, frames: [[14, 502, 18, 18]] },
        { key: 't_rocket', ew: 18, eh: 9, frames: [[14, 560, 36, 18]] },
        { key: 't_nade', ew: 11, eh: 12, frames: [[14, 618, 22, 24]] },
        { key: 't_flame', ew: 16, eh: 16, anim: 'o_flame', rate: 10, frames: [[14, 682, 32, 32], [56, 682, 32, 32], [98, 682, 32, 32]] },
        { key: 't_spark', ew: 7, eh: 7, frames: [[14, 754, 14, 14]] },
        { key: 't_heart', ew: 11, eh: 11, frames: [[14, 808, 22, 22]] },
        { key: 't_ground', ew: 64, eh: 64, frames: [[14, 870, 128, 128]] },
        { key: 't_plat', ew: 96, eh: 20, frames: [[14, 1038, 192, 40]] },
        { key: 't_spike', ew: 48, eh: 18, frames: [[14, 1118, 96, 36]] },
        { key: 't_cage', ew: 76, eh: 96, frames: [[14, 1194, 152, 192]] },
        { key: 't_couple_caged', ew: 60, eh: 80, frames: [[14, 1426, 120, 160]] },
        { key: 't_arch', ew: 120, eh: 130, frames: [[14, 1626, 240, 260]] },
        { key: 't_palm', ew: 70, eh: 110, frames: [[14, 1926, 140, 220]] },
        { key: 't_bush', ew: 54, eh: 30, frames: [[14, 2186, 108, 60]] },
        { key: 't_sandbag', ew: 46, eh: 30, frames: [[14, 2286, 92, 60]] },
        { key: 't_flag', ew: 40, eh: 60, anim: 'o_flag', rate: 6, frames: [[14, 2386, 80, 120], [104, 2386, 80, 120], [194, 2386, 80, 120]] }
    ];
    var usingObjectAssets = false;

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
       SPRITE TUNER (PC dev tool) — per-sprite-type vertical offset (px).
       Negative = naik (up), positive = turun (down). Read at every spawn
       anchor via tuneY(); slider changes apply LIVE to existing sprites and
       persist to localStorage so the user can read off final values + send a
       screenshot for me to bake in. Game keeps running while the panel is open.
       ================================================================= */
    // v2: baked-in per-sprite offsets (dialed-in via the Sprite Tuner & sent back). The key is
    // bumped v1→v2 so a device that saved the old all-zero v1 does NOT override these new
    // defaults; the tuner still lets anyone re-adjust on top (and re-persists under v2).
    var TUNE_KEY = 'msw_tune_v3';
    // BAKED DEFAULTS (user-approved feet-on-ground positions). loadTune() starts from these,
    // then layers any per-device localStorage tweak on top.
    var TUNE_DEFAULTS = {
        player: 12, pow: 6, rush: 12, range: 6, turret: 0, drone: 0, tank: 9, boss: -31,
        barrel: 10, crate: -9, spike: 7, flame: 0, cage: 0, caged: 6,
        amplop: 0, arch: 0, ground: 4, plat: 0, bush: -3, palm: 0, sandbag: 0, flag: 0,
        cloud: 0, mountain: 0, hill: 0
    };
    // display order + label + the engine texture keys whose LIVE sprites get
    // nudged when the slider moves (so the change is visible without a respawn).
    // EVERY sprite type the engine draws gets its own slider. The tuner shifts every LIVE sprite
    // tagged with `tuneId === id` by the delta (via the scene's tunable registry), so all of these
    // move instantly. Grouped per category for the 2-column panel.
    var TUNE_SPECS = [
        // — Karakter —
        { id: 'player',  label: 'Player' },
        { id: 'pow',     label: 'POW Kurir' },
        { id: 'caged',   label: 'Mempelai (Sangkar)' },
        // — Musuh —
        { id: 'rush',    label: 'Musuh Rush' },
        { id: 'range',   label: 'Musuh Range' },
        { id: 'turret',  label: 'Turret' },
        { id: 'drone',   label: 'Drone' },
        { id: 'tank',    label: 'Tank' },
        { id: 'boss',    label: 'Boss' },
        // — Objek / item —
        { id: 'barrel',  label: 'Barrel' },
        { id: 'crate',   label: 'Crate Senjata' },
        { id: 'amplop',  label: 'Amplop (penanda)' },
        // — Hazard —
        { id: 'spike',   label: 'Duri (Spike)' },
        { id: 'flame',   label: 'Api (Flame)' },
        // — Struktur —
        { id: 'cage',    label: 'Sangkar' },
        { id: 'arch',    label: 'Gapura (Altar)' },
        // — Terrain / dekorasi —
        { id: 'ground',  label: 'Tanah (Ground)' },
        { id: 'plat',    label: 'Pijakan (Ledge)' },
        { id: 'bush',    label: 'Rumput / Semak' },
        { id: 'palm',    label: 'Pohon Palem' },
        { id: 'sandbag', label: 'Karung Pasir' },
        { id: 'flag',    label: 'Bendera' },
        // — Parallax bg —
        { id: 'cloud',    label: 'Awan' },
        { id: 'mountain', label: 'Gunung' },
        { id: 'hill',     label: 'Bukit' }
    ];
    var TUNE_MIN = -60, TUNE_MAX = 60;
    var TUNE = loadTune();
    function loadTune() {
        var t = {};
        // start from the baked, user-approved defaults (not 0)
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

    // hero/closing bg uses data-src (so it doesn't load in the hidden source); apply on clone
    function hydrateImages(root) {
        var bgs = root.querySelectorAll('.msw-hero-bg[data-src], .msw-closing-bg[data-src]');
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
        // VICTORY VISUAL first (confetti/hearts beat), THEN the congratulations dialog after 5s.
        // The dialog offers "Buka Undangan" or "Tutup" — it does NOT auto-open the invitation.
        if (sc && sc.celebrate) sc.celebrate('boss');
        setTimeout(function () {
            var t = $('msw-win-text');
            if (t) t.innerHTML = 'Selamat! Misi penyelamatan berhasil — ' +
                '<b>' + esc(val('groom_nickname', 'Mempelai')) + '</b> &amp; <b>' + esc(val('bride_nickname', 'Mempelai')) + '</b> ' +
                'telah dibebaskan dari Markas Boss. Terima kasih sudah menuntaskan misinya. ' +
                'Buka undangannya sekarang, atau tutup dialog ini dulu.';
            showOverlay('msw-win');
        }, 5000);
    }

    /* =================================================================
       OVERLAY helpers
       ================================================================= */
    function showOverlay(id) { hideOverlays(); var o = $(id); if (o) o.classList.add('show'); }
    function hideOverlays() {
        ['msw-cover', 'msw-loading', 'msw-briefing', 'msw-clear', 'msw-gameover', 'msw-allpieces', 'msw-win', 'msw-stagesel', 'msw-resetconfirm']
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

    /* ===== KICKOFF: wire UI, scan, then wait for PRESS START =====
       wireUI() is FIRST and standalone so the delegated click listener (PRESS
       START etc.) is attached even if any later step throws on the live page
       (e.g. a missing element during a host re-injection). Each step is guarded
       so one failure can never leave the game un-clickable. */
    function init() {
        try { wireUI(); } catch (e) { try { console.error('[msw] wireUI', e); } catch (e2) {} }
        try { scanInfos(); QUOTA = buildQuota(N()); STORE.diff = STORE.diff || 'normal'; buildIndicators(); } catch (e) {}
        try { wireMusicMirror(); } catch (e) {}
        try { drawCoupleCanvas(); } catch (e) {}
        try { paintSideBg(); } catch (e) {}
        try { buildTuner(); } catch (e) {}
        try { var v = $('msw-version'); if (v) v.textContent = VERSION; } catch (e) {}
        // if everything already unlocked from a prior session, light the 💌
        try { updateProgress(); } catch (e) {}
        // AUTO-RESUME after a host RE-INJECTION: if a run was live before the theme was
        // re-injected (window.__mswStarted survives), boot straight back into the game instead
        // of showing PRESS START again. Skip if the full-invitation reveal is currently open.
        try {
            if (window.__mswStarted && !(($('msw-reveal') || {}).classList || { contains: function () { return false; } }).contains('show')) {
                var rs = window.__mswStarted;
                setTimeout(function () { try { startRun((rs && rs.sector) || 0); } catch (e) {} }, 60);
            }
        } catch (e) {}
    }

    /* =================================================================
       DECORATIVE COUPLE CANVAS (desktop right panel) — Canvas 2D, game vibes:
       groom in a suit + bride in a gown standing on a game battlefield scene,
       hearts, "JUST MARRIED" banner. Pure decoration (no game logic).
       ================================================================= */
    /* Desktop right-panel background = the tenant's cover photo (photo_hero_cover),
       dimmed by a military veil in CSS. Silent no-op if no photo uploaded. */
    function paintSideBg() {
        var bg = $('msw-side-bg'); if (!bg) return;
        var url = srcVal('photo_hero_cover', '');
        if (url) { bg.style.backgroundImage = "url('" + url + "')"; bg.classList.add('has-photo'); }
    }

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

    /* =================================================================
       SPRITE TUNER UI — list + sliders. Toggling does NOT pause the game;
       slider moves apply LIVE via the scene's applyLiveTune() and persist.
       ================================================================= */
    var _tunerBuilt = false;
    // build each row with pure DOM API (no innerHTML) so nothing can be stripped/escaped,
    // and wire each slider's listener directly on the input (robust against host re-inject).
    function buildTuner() {
        var list = $('msw-tuner-list'); if (!list) return;
        while (list.firstChild) list.removeChild(list.firstChild);
        TUNE_SPECS.forEach(function (spec) {
            var v = TUNE[spec.id] || 0;
            var row = document.createElement('div'); row.className = 'msw-tuner-row';
            var top = document.createElement('div'); top.className = 'msw-tuner-row-top';
            var name = document.createElement('span'); name.className = 'msw-tuner-row-name'; name.textContent = spec.label;
            var valEl = document.createElement('span'); valEl.className = 'msw-tuner-row-val';
            valEl.id = 'msw-tval-' + spec.id; valEl.textContent = (v > 0 ? '+' : '') + v + 'px';
            top.appendChild(name); top.appendChild(valEl);
            var slider = document.createElement('input');
            slider.type = 'range'; slider.min = TUNE_MIN; slider.max = TUNE_MAX; slider.step = 1;
            slider.value = v; slider.setAttribute('data-tune', spec.id);
            var apply = function () {
                var nv = parseInt(slider.value, 10) || 0;
                valEl.textContent = (nv > 0 ? '+' : '') + nv + 'px';
                var sc = (GAME && GAME.scene) ? GAME.scene.getScene('Game') : null;
                if (sc && sc.applyLiveTune) sc.applyLiveTune(spec.id, nv);
                else { TUNE[spec.id] = nv; saveTune(); }
            };
            slider.addEventListener('input', apply);
            slider.addEventListener('change', apply);
            row.appendChild(top); row.appendChild(slider);
            list.appendChild(row);
        });
        _tunerBuilt = true;
    }
    function toggleTuner() {
        var p = $('msw-tuner'); if (!p) return;
        var opening = !p.classList.contains('show');
        // ALWAYS (re)build on open — a host re-injection can wipe the list back to the empty
        // static markup, so never trust a prior build. Cheap (≈15 rows).
        if (opening) buildTuner();
        p.classList.toggle('show');
    }
    function resetTuner() {
        // reset back to the BAKED defaults (not 0) — those are the verified feet-on-ground
        // positions; zeroing them would re-introduce the floating/sinking the bake fixed.
        var sc = (GAME && GAME.scene) ? GAME.scene.getScene('Game') : null;
        TUNE_SPECS.forEach(function (spec) {
            var def = (typeof TUNE_DEFAULTS[spec.id] === 'number') ? TUNE_DEFAULTS[spec.id] : 0;
            if (sc && sc.applyLiveTune) sc.applyLiveTune(spec.id, def);
            else TUNE[spec.id] = def;
        });
        saveTune();
        buildTuner();   // repaint sliders to defaults
        toast('Posisi sprite direset ke default');
    }
    function copyTuner() {
        var txt = JSON.stringify(TUNE, null, 2);
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).catch(function () {});
        else fallbackCopy(txt, function () {});
        toast('Nilai disalin: <b>' + esc(txt.replace(/\s+/g, ' ')) + '</b>', 4000);
    }

    /* =================================================================
       SAVE TO THEME (superadmin) — bake the current tuner values straight
       into this theme's js_template in the DB, using the SAME API the Theme
       Editor uses (login → updateTheme, chunked). The host (ThemeEditorPage)
       exposes window.__MSW_API_URL / __MSW_THEME_ID / __MSW_THEME_JS into the
       preview iframe; we rewrite our own TUNE_DEFAULTS line in that source and
       POST it back. Clicking "Simpan" first asks for superadmin credentials.
       ================================================================= */
    function mswApiUrl() { return (window.__MSW_API_URL || '').toString(); }
    function mswThemeId() { return (window.__MSW_THEME_ID || '').toString(); }
    function mswThemeJs() { return (window.__MSW_THEME_JS || '').toString(); }

    // Build the one-line TUNE_DEFAULTS object literal from the live TUNE values,
    // preserving the SAME key order/grouping as the source for a clean diff.
    function buildDefaultsLiteral() {
        var t = TUNE;
        function n(id) { return (typeof t[id] === 'number') ? t[id] : 0; }
        return 'var TUNE_DEFAULTS = {\n' +
            '        player: ' + n('player') + ', pow: ' + n('pow') + ', rush: ' + n('rush') + ', range: ' + n('range') + ', turret: ' + n('turret') + ', drone: ' + n('drone') + ', tank: ' + n('tank') + ', boss: ' + n('boss') + ',\n' +
            '        barrel: ' + n('barrel') + ', crate: ' + n('crate') + ', spike: ' + n('spike') + ', flame: ' + n('flame') + ', cage: ' + n('cage') + ', caged: ' + n('caged') + ',\n' +
            '        amplop: ' + n('amplop') + ', arch: ' + n('arch') + ', ground: ' + n('ground') + ', plat: ' + n('plat') + ', bush: ' + n('bush') + ', palm: ' + n('palm') + ', sandbag: ' + n('sandbag') + ', flag: ' + n('flag') + ',\n' +
            '        cloud: ' + n('cloud') + ', mountain: ' + n('mountain') + ', hill: ' + n('hill') + '\n' +
            '    };';
    }

    // Replace the existing `var TUNE_DEFAULTS = { ... };` block in the JS source
    // with the freshly-baked one. Returns null if the marker isn't found.
    function patchJsSource(src) {
        // match from "var TUNE_DEFAULTS = {" up to the first "};" (non-greedy across newlines)
        var re = /var\s+TUNE_DEFAULTS\s*=\s*\{[\s\S]*?\};/;
        if (!re.test(src)) return null;
        return src.replace(re, buildDefaultsLiteral());
    }

    // API POST to the Apps Script Web App. text/plain → no CORS preflight (same as apiClient.ts).
    // IMPORTANT (the Apps Script gotcha): /exec answers a cross-origin POST with a 302 redirect to
    // script.googleusercontent.com; the browser's fetch FOLLOWS it as a GET and DROPS the POST body,
    // so the backend would see no username/password → "Invalid username or password". To survive the
    // redirect we ALSO put the same fields in the QUERY STRING (backend reads e.parameter on GET),
    // mirroring apiClient.ts which injects into BOTH params and body. We send the small auth/meta
    // fields as query params; large fields (the js_* columns) stay body-only (too big for a URL, and
    // they aren't needed to authenticate — the token in the query keeps the redirected GET authorized).
    function mswApiPost(body) {
        var url = mswApiUrl();
        var qsKeys = ['action', 'username', 'password', 'token', 'tenant_id', 'id', '__chunked'];
        var qs = [];
        qsKeys.forEach(function (k) {
            if (body[k] !== undefined && body[k] !== null) {
                qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(body[k])));
            }
        });
        if (qs.length) url += (url.indexOf('?') >= 0 ? '&' : '?') + qs.join('&');
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(body),
            redirect: 'follow'
        }).then(function (r) { return r.json(); });
    }

    // Split a string into the backend's 11 columns (≤50k each): js_template + js_extra_1..10.
    function splitJsColumns(s) {
        s = s || '';
        var cols = { js_template: s.substring(0, 50000) };
        for (var i = 1; i <= 10; i++) cols['js_extra_' + i] = s.substring(i * 50000, (i + 1) * 50000);
        return cols;
    }

    function setAuthMsg(msg, ok) {
        var m = $('msw-tuner-auth-msg'); if (!m) return;
        m.textContent = msg || ''; m.className = 'msw-tuner-auth-msg' + (ok ? ' ok' : '');
    }
    function openSaveAuth() {
        // Available from BOTH the Theme Editor preview AND the published invitation: the host
        // (ThemeWrapper / ThemeEditorPage) sets __MSW_API_URL/__MSW_THEME_ID/__MSW_THEME_JS on
        // window. If the API URL/id is missing (e.g. an isolated standalone test page) we can't save.
        if (!mswApiUrl()) { toast('Simpan butuh konteks aplikasi (API tidak tersedia di sini).'); return; }
        if (!mswThemeId()) { toast('Tema belum punya ID — simpan tema dulu sekali di Editor Tema.'); return; }
        var a = $('msw-tuner-auth'); if (!a) return;
        setAuthMsg('');
        var u = $('msw-tuner-auth-user'); var p = $('msw-tuner-auth-pass');
        if (p) p.value = '';
        a.classList.add('show');
        if (u) setTimeout(function () { u.focus(); }, 30);
    }
    function closeSaveAuth() { var a = $('msw-tuner-auth'); if (a) a.classList.remove('show'); }

    var _saving = false;
    function doSaveTune() {
        if (_saving) return;
        var u = ($('msw-tuner-auth-user') || {}).value || '';
        var p = ($('msw-tuner-auth-pass') || {}).value || '';
        if (!u || !p) { setAuthMsg('Username & password wajib diisi.'); return; }

        var src = mswThemeJs();
        var patched = patchJsSource(src);
        if (!patched) { setAuthMsg('Gagal menemukan TUNE_DEFAULTS di source JS tema.'); return; }

        _saving = true;
        var okBtn = $('msw-tuner-auth-ok'); if (okBtn) okBtn.disabled = true;
        var saveBtn = $('msw-tuner-save'); if (saveBtn) saveBtn.disabled = true;
        setAuthMsg('Memvalidasi otorisasi…', true);

        // 1) LOGIN → token (must be superadmin)
        mswApiPost({ action: 'login', username: u, password: p }).then(function (res) {
            if (!res || !res.success || !res.data || !res.data.token) {
                throw new Error((res && res.message) || 'Login gagal.');
            }
            if (!res.data.user || res.data.user.role !== 'superadmin') {
                throw new Error('Hanya superadmin yang boleh menyimpan tema.');
            }
            var token = res.data.token;
            setAuthMsg('Otorisasi OK. Menyimpan ke tema…', true);

            // 2) CHUNKED updateTheme — js columns sent verbatim (≤50k each), __chunked flag set.
            var cols = splitJsColumns(patched);
            var id = mswThemeId();
            // send all columns in ONE updateTheme call (each ≤50k; whole body well under the limit)
            var body = { action: 'updateTheme', id: id, __chunked: true, token: token, tenant_id: 'system' };
            for (var k in cols) body[k] = cols[k];
            return mswApiPost(body);
        }).then(function (res) {
            if (!res || !res.success) throw new Error((res && res.message) || 'Gagal menyimpan tema.');
            // keep the in-iframe copy in sync so a second save re-patches the NEW source
            try { window.__MSW_THEME_JS = patched; } catch (e) {}
            setAuthMsg('Tersimpan! Posisi sprite kini jadi default tema.', true);
            toast('💾 Tersimpan ke tema — nilai ini kini default permanen.', 3500);
            setTimeout(closeSaveAuth, 900);
        }).catch(function (err) {
            setAuthMsg((err && err.message) ? err.message : 'Terjadi kesalahan saat menyimpan.');
        }).then(function () {
            _saving = false;
            if (okBtn) okBtn.disabled = false;
            if (saveBtn) saveBtn.disabled = false;
        });
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
        // (difficulty clicks handled by the delegated listener below — no per-button bind)
        pickDiff(STORE.diff);

        // PRESS START (cover + side)
        function start() { startRun(0); }

        // ----------------------------------------------------------------
        // DELEGATED CLICK (robust on the LIVE invitation). In the Theme
        // Editor the theme runs in an isolated <iframe> so direct per-element
        // binding is stable. On the real invitation the host injects this
        // theme via dangerouslySetInnerHTML and RE-INJECTS the DOM + JS when
        // htmlBase/isOpened change (image resolve, RSVP submit, etc.). Direct
        // listeners bound in a previous pass die with the replaced nodes, so
        // PRESS START "stops working". A single delegated listener on
        // `document` (matched by id via closest) survives every re-injection.
        // ----------------------------------------------------------------
        var ACTIONS = {
            'msw-start': start,
            'msw-side-start': start,
            'msw-cover-view': openInvitationDirect,
            'msw-side-open': openInvitationDirect,
            'msw-gameover-view': openInvitationDirect,
            'msw-allpieces-view': function () { hideOverlays(); revealFullInvitation(); },
            'msw-allpieces-keep': function () { hideOverlays(); resumeGame(); },
            'msw-win-view': function () { hideOverlays(); revealFullInvitation(); },
            'msw-win-close': function () { hideOverlays(); resumeGame(); },
            'msw-view-btn': function () {
                if (allInfoUnlocked() || cheat.on) { revealFullInvitation(); }
                else { toast('Selamatkan semua POW dulu — atau tekan ★ untuk buka langsung'); }
            },
            'msw-star-btn': toggleCheat,
            'msw-stagesel-btn': openStageSelect,
            'msw-stagesel-ok': function () { hideOverlays(); startRun(pendingStage); },
            'msw-stagesel-close': function () { hideOverlays(); resumeGame(); },
            'msw-reset-btn': function () { showOverlay('msw-resetconfirm'); pauseGame(); },
            'msw-reset-yes': function () { resetGame(); },
            'msw-reset-no': function () { hideOverlays(); resumeGame(); },
            'msw-briefing-go': function () { beginSector(); },   /* loadSector() hides the overlay AFTER the sector is built + a frame rendered → no black flash */
            'msw-clear-next': function () { hideOverlays(); nextSector(); },
            'msw-retry': function () { hideOverlays(); startRun(0); },
            'msw-modal-close': closeModal,
            'msw-reveal-close': closeReveal,
            'msw-lightbox-close': function () { var lb = $('msw-lightbox'); if (lb) lb.classList.remove('show'); },
            // SPRITE TUNER (PC) — toggling does NOT pause the game (config applies live)
            'msw-tuner-btn': toggleTuner,
            'msw-tuner-close': function () { var p = $('msw-tuner'); if (p) p.classList.remove('show'); },
            'msw-tuner-reset': resetTuner,
            'msw-tuner-copy': copyTuner,
            // SAVE flow (superadmin auth dialog → bake into theme JS via the save API)
            'msw-tuner-save': openSaveAuth,
            'msw-tuner-auth-cancel': closeSaveAuth,
            'msw-tuner-auth-ok': doSaveTune
        };
        // difficulty buttons handled here too (data-diff), plus backdrop dismiss for modal/lightbox.
        var delegated = function (e) {
            var t = e.target;
            if (!t || !t.closest) return;
            // difficulty pick (cover + side)
            var diffBtn = t.closest('.msw-diff-opt, .msw-diffopt');
            if (diffBtn && diffBtn.dataset.diff) { pickDiff(diffBtn.dataset.diff); return; }
            // id-mapped actions
            for (var id in ACTIONS) {
                if (t.closest('#' + id)) { ACTIONS[id](); return; }
            }
            // backdrop dismiss (click the dim area, not the card)
            if (t.id === 'msw-modal-root') { closeModal(); return; }
            if (t.id === 'msw-lightbox') { t.classList.remove('show'); return; }
        };
        // CAPTURE PHASE on the live invitation: the host (ThemeWrapper) intercepts
        // some clicks in capture phase and may stopImmediatePropagation() before a
        // bubble-phase listener ever runs. Capture-phase here guarantees PRESS START
        // and the other game buttons fire first. Also bind on BOTH document and the
        // stage element (defense-in-depth) and de-dupe via a global guard so a stale
        // listener from a half-cleaned prior injection can never double-fire or block.
        if (window.__mswDelegated) { try { document.removeEventListener('click', window.__mswDelegated, true); } catch (e) {} }
        window.__mswDelegated = delegated;
        document.addEventListener('click', delegated, true);
        onCleanup(function () {
            document.removeEventListener('click', delegated, true);
            if (window.__mswDelegated === delegated) window.__mswDelegated = null;
        });

        // GLOBAL FALLBACK: lets the game be started even if event delegation is
        // somehow blocked in an exotic host wrapper — callable from console/onclick.
        window.__mswStart = function () { try { startRun(0); } catch (e) {} };

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
                var isBoss = idx === CONFIG.sectors - 1;
                cell.className = 'msw-stagesel-cell' + (unlockedSector ? '' : ' is-locked') + (isBoss ? ' is-boss' : '');
                cell.dataset.idx = idx;
                cell.type = 'button';
                // structured mission card: STAGE NN badge + sector name + (lock/boss tag)
                var num = (idx + 1 < 10 ? '0' : '') + (idx + 1);
                cell.innerHTML =
                    '<span class="msw-stagesel-no">' + num + '</span>' +
                    '<span class="msw-stagesel-name">' + esc(SECTOR_NAMES[idx]) + '</span>' +
                    '<span class="msw-stagesel-badge">' +
                        (unlockedSector ? (isBoss ? '☠ BOSS' : '▶ GO') : '🔒 TERKUNCI') +
                    '</span>';
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
        // Show the LOADING curtain (not a bare hideOverlays) so the blank black frame
        // while Phaser boots + the scene builds the sector is hidden. showBriefing()
        // (called from scene create) swaps it out via showOverlay() → no black flash.
        showOverlay('msw-loading');
        runState.sector = sector;
        var d = CONFIG.diff[STORE.diff];
        runState.lives = d.lives;
        runState.score = STORE.best && sector > 0 ? runState.score : 0;
        if (sector === 0) runState.score = 0;
        // REMEMBER that the run is live so a host RE-INJECTION (which tears the game down
        // and re-shows the default cover) can auto-resume instead of dumping the player back
        // to PRESS START. window survives re-injection; this is the fix for "START muncul lagi".
        try { window.__mswStarted = { sector: sector }; } catch (e) {}
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
        try { window.__mswStarted = null; } catch (e) {}   // forget the live-run flag → cover shows again
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
                if (opt.aimUp) {
                    // STANDING aim-up: rifle held VERTICAL beside the head, raised arm
                    box(g, 17, 14 + bob, 4, 11, 0xf3d2a0, 0xffe6c0, 0xd0a878);   // raised arm
                    box(g, 19, -6 + bob, 4, 22, 0x2a2a2a, 0x555, 0x111);          // vertical rifle
                } else {
                    box(g, 18, 22 + bob + (opt.armUp ? -2 : 0), 11, 4, 0x2a2a2a, 0x555, 0x111); // rifle (side)
                }
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
            tex(scene, 't_player_aimup', 30, 42, function (g) { drawCommando(g, { bob: 0, aimUp: true }); }); // standing shoot-up
            tex(scene, 't_player_fall', 30, 42, function (g) { drawCommando(g, { bob: 1, legPhase: -1 }); });
            tex(scene, 't_player_prone', 30, 42, function (g) { drawCommando(g, { prone: true }); });
            tex(scene, 't_player_hurt', 30, 42, function (g) { drawCommando(g, { bob: 0, hurt: true }); });
            // new pose keys (PNG override these when present): jump+shoot-down & dead.
            // Procedural fallbacks so the game never shows a blank sprite if PNG missing.
            tex(scene, 't_player_jumpdown', 30, 42, function (g) { drawCommando(g, { bob: 1, legPhase: -2 }); }); // falling-ish pose
            tex(scene, 't_player_dead', 30, 42, function (g) {
                // lying down: low wide body + head to the side (hurt tint)
                g.fillStyle(0x3a6b4a, 1); g.fillRect(3, 33, 22, 7);
                g.fillStyle(0x2e3a25, 1); g.fillRect(2, 38, 26, 3);
                g.fillStyle(0xff9a9a, 1); g.fillRect(22, 28, 8, 8);        // head fallen
                g.fillStyle(0x10140d, 1); g.fillRect(25, 31, 2, 2);
                g.fillStyle(0x4fd6c8, 1); g.fillRect(20, 26, 9, 3);         // beret off
                g.fillStyle(0x2a2a2a, 1); g.fillRect(4, 30, 12, 3);         // dropped rifle
                g.lineStyle(2, 0x10140d, 1); g.strokeRect(2, 26, 28, 14);
            });
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

        /* PRELOAD player PNGs into their engine texture keys (ASSET.md). Phaser runs
           this before create(); any frame that loads will then SKIP its procedural
           draw (tex() guards on textures.exists). loaderror → remove key → fallback. */
        GameScene.prototype.preload = function () {
            var self = this;
            PLAYER_ASSETS.forEach(function (a) {
                var url = assetUrl(a.name);
                if (!url) return;
                // if a stale texture exists from a prior boot, drop it so load wins
                try { if (self.textures.exists(a.key)) self.textures.remove(a.key); } catch (e) {}
                self.load.image(a.key, url);
            });
            // EXPLOSION spritesheet (like metalslug-2): 10x5 grid, 100x100 frames (50 total).
            var explUrl = assetUrl('explosion');
            if (explUrl) {
                try { if (self.textures.exists('t_explosion')) self.textures.remove('t_explosion'); } catch (e) {}
                self.load.spritesheet('t_explosion', explUrl, { frameWidth: 100, frameHeight: 100 });
            }
            // ENEMY + BOSS sheet (one whole image; sliced per-row in create() → sliceEnemySheet).
            var enemyUrl = assetUrl('enemy_sheet');
            if (enemyUrl) {
                try { if (self.textures.exists(ENEMY_SHEET_KEY)) self.textures.remove(ENEMY_SHEET_KEY); } catch (e) {}
                self.load.image(ENEMY_SHEET_KEY, enemyUrl);
            }
            // OBJECT atlas (one whole image; sliced in create() → sliceObjectSheet).
            var objUrl = assetUrl('object_sheet');
            if (objUrl) {
                try { if (self.textures.exists(OBJECT_SHEET_KEY)) self.textures.remove(OBJECT_SHEET_KEY); } catch (e) {}
                self.load.image(OBJECT_SHEET_KEY, objUrl);
            }
            this.load.on('loaderror', function (file) { try { self.textures.remove(file.key); } catch (e) {} });
        };

        GameScene.prototype.create = function () {
            var self = this;
            // Slice the enemy/boss sheet FIRST: registers per-frame regions on ENEMY_SHEET_KEY
            // and records display scales. buildTextures() then auto-skips the procedural draw for
            // any enemy key we successfully sliced (its tex() guard sees nothing to remove — we
            // never created the standalone keys, so the spawn code reads ENEMY_SHEET frames).
            this.sliceEnemySheet();
            this.sliceObjectSheet();
            buildTextures(this);
            // HUD: paint the real grenade sprite (t_nade) onto the top-left bomb indicator
            // instead of the 💣 emoji (works in both asset + procedural mode).
            this.paintHudBombIcon();
            // PNG assets win when present; flag asset-mode if the core idle frame loaded.
            usingPlayerAssets = this.textures.exists('t_player_idle0') &&
                                this.textures.get('t_player_idle0').source[0] &&
                                this.textures.get('t_player_idle0').source[0].width === ASSET_FRAME.w;
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
            // Bullets DIE on the solid ground, but PASS THROUGH floating ledges (t_plat) so the
            // player can shoot enemies perched above without the ledge eating the shot (issue #2).
            // processCallback returns false → no collision → bullet keeps flying.
            this.physics.add.collider(this.bullets, this.platforms,
                function (b) { self.killBullet(b); },
                function (b, plat) {
                    if (plat && plat.texture && plat.texture.key === 't_plat') return false; // ledge = bullet-transparent
                    return !self.bulletOverEnemy(b);
                });
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

        /* HUD bomb icon — export the grenade texture (t_nade) to a data-URL and set it as the
           top-left indicator's image, replacing the 💣 emoji. Works whether t_nade came from the
           object atlas (asset mode) or the procedural draw. Silent no-op if anything fails. */
        GameScene.prototype.paintHudBombIcon = function () {
            try {
                var ico = $('msw-life-ico') || document.querySelector('.msw-life-ico');
                if (!ico || !this.textures.exists('t_nade')) return;
                var src = this.textures.get('t_nade').getSourceImage();
                if (!src) return;
                var cv = document.createElement('canvas');
                cv.width = src.width; cv.height = src.height;
                var cx = cv.getContext('2d'); if (!cx) return;
                cx.imageSmoothingEnabled = false;
                cx.drawImage(src, 0, 0);
                var url = cv.toDataURL('image/png');
                ico.textContent = '';
                ico.classList.add('msw-life-ico-img');
                ico.style.backgroundImage = "url('" + url + "')";
            } catch (e) { /* keep the emoji fallback */ }
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
            mk('p_aimup', ['t_player_aimup'], 1, 0);          // standing shoot-up pose
            mk('p_fall', ['t_player_fall'], 1, 0);
            mk('p_prone', ['t_player_prone'], 1, 0);
            mk('p_hurt', ['t_player_hurt'], 1, 0);
            mk('p_jumpdown', ['t_player_jumpdown'], 1, 0);   // airborne + shoot-down pose
            mk('p_dead', ['t_player_dead'], 1, 0);           // tumbang (brief, before respawn)
            // EXPLOSION sprite anim (metalslug-2 style): 50 frames @ 40fps, play once.
            this.useExplosion = this.textures.exists('t_explosion');
            if (this.useExplosion && !this.anims.exists('expl_anim')) {
                this.anims.create({
                    key: 'expl_anim',
                    frames: this.anims.generateFrameNumbers('t_explosion', { start: 0, end: 49 }),
                    frameRate: 40, repeat: 0
                });
            }
            this.buildEnemyAnims();
        };

        /* Slice the one uploaded enemy sheet into per-frame regions on ENEMY_SHEET_KEY.
           Each frame becomes a named texture-frame "<texKey>__<frameName>" (e.g.
           "t_e_rush__walk_1"). Records ENEMY_DISP[texKey] = {sx,sy} = scale to render
           the big cell at the engine display size (dw×dh). Sets usingEnemyAssets. No-op
           (procedural fallback) if the sheet didn't load. */
        /* The uploaded sheet may be FULLY OPAQUE with a painted gray checkerboard "transparency"
           background (as exported by some pixel editors). Key it out: flood-fill from the image
           borders, clearing only low-saturation light-gray pixels CONNECTED to the edge. Interior
           grays (gun metal, white highlights) are surrounded by sprite pixels → never reached →
           preserved. Returns a NEW canvas texture (transparent) under ENEMY_SHEET_KEY, or leaves
           the original untouched if it already has real transparency / keying fails. */
        GameScene.prototype.keyOutCheckerboard = function () {
            var tex = this.textures.get(ENEMY_SHEET_KEY);
            var srcObj = tex.source[0]; if (!srcObj) return;
            var img = srcObj.image || srcObj.source; if (!img) return;
            var W = srcObj.width, H = srcObj.height;
            try {
                var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
                var ctx = cv.getContext('2d');
                ctx.drawImage(img, 0, 0, W, H);
                var id = ctx.getImageData(0, 0, W, H), d = id.data;
                // already transparent? (sample a chunk for any alpha<250) → keep original.
                var hasAlpha = false;
                for (var s = 3; s < d.length; s += 4 * 97) { if (d[s] < 250) { hasAlpha = true; break; } }
                if (hasAlpha) return;
                function isBg(p) {
                    var r = d[p], g = d[p + 1], b = d[p + 2];
                    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
                    return (mx - mn) <= 22 && mn >= 150;   // neutral & light → checkerboard
                }
                var seen = new Uint8Array(W * H);
                var stack = [];
                for (var x = 0; x < W; x++) { stack.push(x); stack.push((H - 1) * W + x); }
                for (var y = 0; y < H; y++) { stack.push(y * W); stack.push(y * W + W - 1); }
                while (stack.length) {
                    var idx = stack.pop(); if (seen[idx]) continue;
                    if (!isBg(idx * 4)) continue; seen[idx] = 1;
                    var cx = idx % W, cy = (idx / W) | 0;
                    if (cx > 0) stack.push(idx - 1); if (cx < W - 1) stack.push(idx + 1);
                    if (cy > 0) stack.push(idx - W); if (cy < H - 1) stack.push(idx + W);
                }
                for (var i = 0; i < W * H; i++) if (seen[i]) d[i * 4 + 3] = 0;
                ctx.putImageData(id, 0, 0);
                this.textures.remove(ENEMY_SHEET_KEY);
                this.textures.addCanvas(ENEMY_SHEET_KEY, cv);
            } catch (e) { /* CORS-tainted or no canvas → leave original (will show bg, but works) */ }
        };

        GameScene.prototype.sliceEnemySheet = function () {
            usingEnemyAssets = false; ENEMY_DISP = {};
            if (!this.textures.exists(ENEMY_SHEET_KEY)) return;
            var src0 = this.textures.get(ENEMY_SHEET_KEY).source[0];
            if (!src0 || !src0.width) return;
            // sanity: the art is 1408x768; if a very different image was uploaded, bail to
            // procedural rather than slice garbage.
            if (src0.width < 600 || src0.height < 400) { try { this.textures.remove(ENEMY_SHEET_KEY); } catch (e) {} return; }
            // strip the painted checkerboard "transparency" if the PNG is fully opaque
            this.keyOutCheckerboard();
            var tex = this.textures.get(ENEMY_SHEET_KEY);
            var src = tex.source[0];
            if (!src || !src.width) return;
            var ok = 0;
            ENEMY_SHEET.forEach(function (row) {
                var fh = row.ch, fy = row.top;
                if (fy + fh > src.height) fh = src.height - fy;
                for (var i = 0; i < row.frames.length; i++) {
                    var fx = row.rects[i][0], fw = row.rects[i][1];   // explicit per-frame rect
                    if (fx + fw > src.width) fw = src.width - fx;
                    if (fw <= 0 || fh <= 0) continue;
                    var fname = row.key + '__' + row.frames[i];
                    try { if (tex.has(fname)) tex.remove(fname); } catch (e) {}
                    tex.add(fname, 0, fx, fy, fw, fh);
                    ok++;
                }
                // UNIFORM scale = dh/ch (height-driven). Display height is constant across frames;
                // width follows the frame's own source width (wider flash frames look wider, no
                // distortion). cw0 = frame-0 source width (used to floor-anchor the body).
                var scale = row.dh / fh;
                ENEMY_DISP[row.key] = {
                    scale: scale, dh: row.dh, ch: fh, cw0: row.rects[0][1],
                    hb: row.hb, grav: row.grav !== false
                };
            });
            usingEnemyAssets = ok > 0;
        };

        /* Enemy/boss anims built on the sliced sheet frames (guard re-create). Only created
           when usingEnemyAssets; the spawn/update code checks usingEnemyAssets before play(). */
        GameScene.prototype.buildEnemyAnims = function () {
            if (!usingEnemyAssets) return;
            var self = this;
            function frames(texKey, names) {
                return names.map(function (n) { return { key: ENEMY_SHEET_KEY, frame: texKey + '__' + n }; });
            }
            function mk(animKey, texKey, names, rate, repeat) {
                if (self.anims.exists(animKey)) return;
                self.anims.create({ key: animKey, frames: frames(texKey, names), frameRate: rate, repeat: repeat == null ? -1 : repeat });
            }
            // rush: 4-frame walk loop + one-shot hurt/die
            mk('e_rush_walk', 't_e_rush', ['walk_1', 'walk_2', 'walk_3', 'walk_4'], 10);
            mk('e_rush_hurt', 't_e_rush', ['hurt'], 1, 0);
            mk('e_rush_die', 't_e_rush', ['die'], 1, 0);
            // range: idle / aim / fire / hurt / die
            mk('e_range_idle', 't_e_range', ['idle'], 1, 0);
            mk('e_range_aim', 't_e_range', ['aim'], 1, 0);
            mk('e_range_fire', 't_e_range', ['fire'], 1, 0);
            mk('e_range_hurt', 't_e_range', ['hurt'], 1, 0);
            mk('e_range_die', 't_e_range', ['die'], 1, 0);
            // turret: idle / aim / fire / hurt / wreck
            mk('e_turret_idle', 't_turret', ['idle'], 1, 0);
            mk('e_turret_aim', 't_turret', ['aim'], 1, 0);
            mk('e_turret_fire', 't_turret', ['fire'], 1, 0);
            mk('e_turret_hurt', 't_turret', ['hurt'], 1, 0);
            mk('e_turret_wreck', 't_turret', ['wreck'], 1, 0);
            // drone: hover loop / drop / wreck
            mk('e_drone_hover', 't_drone', ['hover_1', 'hover_2'], 12);
            mk('e_drone_drop', 't_drone', ['drop'], 1, 0);
            mk('e_drone_wreck', 't_drone', ['wreck'], 1, 0);
            // tank: roll loop / aim / fire / wreck
            mk('e_tank_roll', 't_tank', ['roll_1', 'roll_2'], 6);
            mk('e_tank_aim', 't_tank', ['aim'], 1, 0);
            mk('e_tank_fire', 't_tank', ['fire'], 1, 0);
            mk('e_tank_wreck', 't_tank', ['wreck'], 1, 0);
            // boss: idle loop / telegraph / fire / enraged / defeated
            mk('e_boss_idle', 't_boss', ['idle_1', 'idle_2'], 3);
            mk('e_boss_tell', 't_boss', ['telegraph'], 1, 0);
            mk('e_boss_fire', 't_boss', ['fire'], 1, 0);
            mk('e_boss_enraged', 't_boss', ['enraged', 'idle_2'], 4);
            mk('e_boss_dead', 't_boss', ['defeated'], 1, 0);
        };

        /* helper: configure a freshly-created enemy sprite to use the sliced sheet (uniform
           height-driven scale + idle/walk anim) instead of the procedural texture. Safe no-op
           if !assets. UNIFORM setScale (not setDisplaySize) keeps each frame's natural aspect, so
           a wider muzzle-flash frame renders wider without squashing — and the constant scale
           keeps height + feet position identical across frames. */
        GameScene.prototype.applyEnemyAsset = function (e, texKey, idleAnim) {
            if (!usingEnemyAssets) return;
            var d = ENEMY_DISP[texKey]; if (!d) return;
            var row = ENEMY_SHEET.filter(function (r) { return r.key === texKey; })[0];
            e.setTexture(ENEMY_SHEET_KEY, texKey + '__' + row.frames[0]);
            e.setScale(d.scale);
            // body is sized/anchored in spawnEnemy (or boss builder) AFTER this.
            if (idleAnim && this.anims.exists(idleAnim)) e.play(idleAnim);
        };

        /* Slice the OBJECT atlas into the native procedural texture keys. Each atlas cell is 2×;
           we DOWNSCALE each frame to its engine size (ew×eh) and bake it into a standalone canvas
           texture under the real key (`t_pow`, `t_ground`, …) so every existing create/tile/scale
           call keeps working with NO size change. Multi-frame objects get `<key>_0/_1/…` textures
           + a Phaser anim (o_amplop/o_barrel/o_flame/o_flag). No-op (procedural) if the atlas is
           absent or canvas is unavailable. The generated PNG is already transparent → key-out is
           skipped automatically. */
        GameScene.prototype.sliceObjectSheet = function () {
            usingObjectAssets = false;
            if (!this.textures.exists(OBJECT_SHEET_KEY)) return;
            var src = this.textures.get(OBJECT_SHEET_KEY).source[0];
            if (!src || !src.width) return;
            var img = src.image || src.source; if (!img) return;
            // sanity vs the known atlas (288×2520); bail to procedural if wildly different.
            if (src.width < 200 || src.height < 1500) { try { this.textures.remove(OBJECT_SHEET_KEY); } catch (e) {} return; }
            var self = this, made = 0;
            // ORIGINAL bake: straight 1:1 cell→texture downscale, NO trimming. Verified against the
            // uploaded object-sprite-sheet.png (288×2520, real alpha): every object cell already has
            // its art flush at the BOTTOM (measured bottom padding = 0–1px), so the spawn code's
            // tuned center-origin offsets plant each object on the ground correctly. The earlier
            // "trim bottom/top padding + origin-bottom" rewrite fixed a non-existent padding problem
            // and DESINCED the textures from those offsets → that was the floating regression.
            function bake(destKey, sx, sy, sw, sh, dw, dh) {
                try {
                    var cv = document.createElement('canvas'); cv.width = dw; cv.height = dh;
                    var ctx = cv.getContext('2d');
                    ctx.imageSmoothingEnabled = false;   // crisp pixel-art downscale
                    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
                    if (self.textures.exists(destKey)) self.textures.remove(destKey);
                    self.textures.addCanvas(destKey, cv);
                    return true;
                } catch (e) { return false; }
            }
            OBJECT_SHEET.forEach(function (o) {
                var fr = o.frames;
                if (fr.length === 1) {
                    if (bake(o.key, fr[0][0], fr[0][1], fr[0][2], fr[0][3], o.ew, o.eh)) made++;
                } else {
                    // base key = frame 0 (so non-anim create() calls still get a valid texture),
                    // plus per-frame keys for the anim.
                    var frameKeys = [];
                    for (var i = 0; i < fr.length; i++) {
                        var fk = o.key + '_' + i;
                        if (bake(fk, fr[i][0], fr[i][1], fr[i][2], fr[i][3], o.ew, o.eh)) { frameKeys.push(fk); made++; }
                    }
                    // base key mirrors frame 0
                    bake(o.key, fr[0][0], fr[0][1], fr[0][2], fr[0][3], o.ew, o.eh);
                    o._frameKeys = frameKeys;
                }
            });
            usingObjectAssets = made > 0;
            // build object anims (guard re-create)
            if (usingObjectAssets) {
                OBJECT_SHEET.forEach(function (o) {
                    if (!o.anim || !o._frameKeys || o._frameKeys.length < 2) return;
                    if (self.anims.exists(o.anim)) return;
                    self.anims.create({
                        key: o.anim,
                        frames: o._frameKeys.map(function (k) { return { key: k }; }),
                        frameRate: o.rate || 4, repeat: -1
                    });
                });
            }
        };

        /* anim key for an object texture, only when object assets are active (else null) */
        GameScene.prototype.objAnim = function (texKey) {
            if (!usingObjectAssets) return null;
            var o = OBJECT_SHEET.filter(function (r) { return r.key === texKey; })[0];
            return (o && o.anim && this.anims.exists(o.anim)) ? o.anim : null;
        };
        /* add.image OR an anim-playing sprite (for t_flag/t_amplop in asset mode). Same defaults. */
        GameScene.prototype.objImage = function (x, y, texKey) {
            var anim = this.objAnim(texKey);
            if (anim) { var sp = this.add.sprite(x, y, texKey); sp.play(anim); return sp; }
            return this.add.image(x, y, texKey);
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
                self.regTune(reg(this.add.image(80 + c * 280, 70 + (c % 2) * 50, 't_cloud').setScrollFactor(0.1).setDepth(-58).setAlpha(0.85).setScale(0.7 + (c % 3) * 0.2)), 'cloud');
            }
            // far mountains (slow parallax) — tiled across the world
            var worldW = this.worldW || 4200;
            for (var m = 0; m * 240 < worldW + 480; m++) {
                self.regTune(reg(this.add.image(m * 240, GROUND_Y + 20, 't_mountain').setOrigin(0.5, 1).setScrollFactor(0.25).setDepth(-50).setAlpha(0.7)), 'mountain');
            }
            // near hills (medium parallax)
            for (var h = 0; h * 220 < worldW + 440; h++) {
                self.regTune(reg(this.add.image(h * 220 + 60, GROUND_Y + 40, 't_hill').setOrigin(0.5, 1).setScrollFactor(0.45).setDepth(-40)), 'hill');
            }
            // mid-ground vegetation/props depending on biome (faster parallax, behind gameplay)
            var propTex = idx === 3 ? ['t_palm', 't_barrel'] : idx === 4 || idx === 5 ? ['t_barrel', 't_sandbag', 't_flag'] : ['t_palm', 't_bush', 't_flag'];
            var TPROP = { 't_palm': 'palm', 't_barrel': 'barrel', 't_sandbag': 'sandbag', 't_flag': 'flag', 't_bush': 'bush' };
            for (var p = 0; p * 300 < worldW; p++) {
                var t = propTex[p % propTex.length];
                self.regTune(reg(this.objImage(160 + p * 300 + (p % 2) * 90, GROUND_Y + 2, t).setOrigin(0.5, 1).setScrollFactor(0.7).setDepth(-20).setAlpha(0.95)), TPROP[t] || 'bush');
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
                : 'Bersihkan sektor & maju menuju Markas Boss.';
            if (idx === C.sectors - 1) txt = 'Markas terakhir! Taklukkan Jenderal Pembatal Nikah & selamatkan mempelai.';
            $('msw-briefing-text').textContent = txt;
            showOverlay('msw-briefing');
        };

        GameScene.prototype.loadSector = function (idx) {
            this.sectorIdx = idx; runState.sector = idx;
            // Build the whole sector while the briefing overlay is STILL covering the
            // frame, then resume the scene so Phaser paints it. Only AFTER the engine
            // has rendered a real frame do we drop the overlay → the player never sees
            // a blank black frame between the briefing and the game.
            this.buildSector(idx);
            if (this.scene.isPaused()) this.scene.resume();
            // wait for one painted frame (Phaser renders on the rAF tick) before reveal
            try {
                window.requestAnimationFrame(function () {
                    window.requestAnimationFrame(function () { hideOverlays(); });
                });
            } catch (e) { hideOverlays(); }
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
            this.tunables = [];   // reset the sprite-tuner registry for this sector
            var isBoss = (idx === C.sectors - 1);
            // LONGER stages (per request). Non-boss sectors grow with index; boss keeps a
            // shorter walk-in corridor before the arena.
            var len = isBoss ? 3200 : (5400 + idx * 900);   // px

            this.worldW = len;
            this.physics.world.setBounds(0, 0, len, BH);
            this.cameras.main.setBounds(0, 0, len, BH);

            // backdrop (sky + parallax + biome props) — depends on worldW + sector
            this.buildBackdrop(idx);

            // ground (static tiled, 64px texture) — the collidable top row sits at GROUND_Y.
            // depth -2 so grass tufts (depth -1) sit ON the soil while the player (depth 0+)
            // still walks IN FRONT of the grass.
            for (var x = 0; x < len + 64; x += 64) {
                var gnd = this.platforms.create(x + 32, GROUND_Y + 32, 't_ground');
                gnd.setDepth(-2); gnd.refreshBody();
                this.regTune(gnd, 'ground');
            }
            this.groundTop = GROUND_Y;

            // DIRT FILL below the collidable row → no blank band between grass and the
            // touch controls (issue #3). Visual only (non-colliding); matches the ground
            // body so the green/brown earth runs all the way to the bottom of the play area.
            if (!this.groundFill) this.groundFill = this.add.group();
            this.groundFill.clear(true, true);
            var fillTop = GROUND_Y + 64;            // just under the tile row
            if (fillTop < BH + 64) {
                var fill = this.add.graphics().setDepth(-3);
                fill.fillStyle(0x3a4a2a, 1);        // same earth tone as t_ground base
                fill.fillRect(0, fillTop, len, (BH + 80) - fillTop);
                // subtle darker striations so it isn't a flat slab
                fill.fillStyle(0x2e3a22, 1);
                for (var fx = 0; fx < len; fx += 96) { fill.fillRect(fx + 18, fillTop + 10, 8, 8); fill.fillRect(fx + 60, fillTop + 34, 6, 6); }
                this.groundFill.add(fill);
            }

            // foreground decor on the ground (non-collidable eye-candy)
            if (!this.decor) this.decor = this.add.group();
            this.decor.clear(true, true);
            // bigger ground props (bush handled separately by the dense grass scatter below)
            var fgTex = idx === 3 ? ['t_barrel', 't_palm'] : idx >= 4 ? ['t_sandbag', 't_barrel'] : ['t_palm', 't_sandbag'];
            var FGID = { 't_barrel': 'barrel', 't_palm': 'palm', 't_sandbag': 'sandbag' };
            for (var d = 1; d * 520 < len - 300; d++) {
                if (Math.random() < 0.7) {
                    var t = fgTex[d % fgTex.length];
                    var dImg = this.add.image(300 + d * 520, GROUND_Y + 4, t).setOrigin(0.5, 1).setDepth(-2);
                    this.decor.add(dImg); this.regTune(dImg, FGID[t] || 'bush');
                }
            }

            // GRASS BUSHES (the t_bush ASSET — "semak/rumput") scattered densely along the
            // ground surface so the floor reads as grassy ("dekorasi rumput"). Uses objImage so
            // the uploaded object-atlas sprite is used (procedural fallback if no atlas). Lush on
            // green sectors (0–2), sparse on the enemy base (4–5), skipped on the desert (3).
            if (idx !== 3) {
                var grassStep = (idx >= 4) ? 130 : 78;     // smaller step = denser grass
                for (var gx = 40; gx < len - 30; gx += grassStep) {
                    if (Math.random() < 0.8) {
                        var gjit = gx + Math.round((Math.random() - 0.5) * 40);
                        var gscale = 0.55 + Math.random() * 0.5;   // small tufts (bush is 54px wide)
                        var gBush = this.objImage(gjit, tuneY('bush', GROUND_Y + 8), 't_bush')
                            .setOrigin(0.5, 1).setDepth(-1).setScale(gscale)
                            .setFlipX(Math.random() < 0.5);
                        this.decor.add(gBush); this.regTune(gBush, 'bush');
                    }
                }
            }

            // reset player
            this.player.setPosition(120, GROUND_Y - 60);
            this.player.body.setVelocity(0, 0);
            this.player.respawnX = 120;
            this.cameras.main.scrollX = 0;

            // reset the camera-relative spawn pointer + record list (MS2 Bible §5.2 / T.7)
            this.spawnList = [];      // inert enemy records {x:triggerX, type, y} sorted ↑ x
            this._spawnNext = 0;

            if (isBoss) { this.buildBossArena(len); this.updateHUD(); return; }

            this.populateSector(idx, len);

            // sector exit flag (reach right edge → clear)
            this.exitX = len - 160;
            this.sectorCleared = false;
            this.updateHUD();
        };

        /* =================================================================
           DENSITY ENGINE "NO DEAD AIR" (MS2 Bible §3.3 / APPENDIX A / E.2).
           Combat slots are filled to a per-screen FLOOR (never "kadang ada
           kadang nggak"): every screen gets ≥minEnemies, ≥1 elevation, and
           ≥2 destructibles; reward (POW/crate) cadence ≤2.5×BW; the longest
           empty run is bounded by maxDeadPx. Enemies are emitted as INERT
           SPAWN RECORDS (no hitbox until born at the camera edge, §5.2).
           ================================================================= */
        GameScene.prototype.recordEnemy = function (type, x, y) {
            // off-screen enemy = DATA, not entity. Born at the right edge in update().
            this.spawnList.push({ type: type, x: Math.round(x), y: y });
        };

        /* Create a platform ledge and RECORD its top surface for reachability bookkeeping.
           Returns the ledge's top-Y so callers can perch enemies/crates on it. The platform
           texture t_plat is 96px wide (drawn at origin-center), top ≈ y - 10. We store the
           foothold (x, topY, halfW) so the staircase builder can guarantee each higher ledge
           is reachable from a lower foothold. */
        GameScene.prototype.addLedge = function (x, topY, scaleX) {
            // Center-origin plank (proven correct by compositing the real asset): t_plat is 20px tall
            // and art-flush, so a CENTER at topY+10 puts its TOP standable surface exactly on topY.
            // This is the surface every perched object (crate/enemy) references. (Static body assumes
            // center origin, so we keep center here and anchor the OBJECTS to topY instead.)
            var pl = this.platforms.create(x, topY + 10, 't_plat');
            if (scaleX) { pl.setScale(scaleX, 1); }
            pl.refreshBody();
            pl.setData('tuneId', 'plat'); this.regTune(pl, 'plat');
            if (!this._footholds) this._footholds = [];
            var halfW = ((pl.displayWidth || 96)) / 2;
            this._footholds.push({ x: x, y: topY, halfW: halfW });
            return topY;   // surface the player + perched objects stand on
        };

        /* REBUILT LEVEL GENERATOR — reachable geometry + sensible object/enemy placement.
           Design goals (per request): longer stages, platforms the player can ACTUALLY jump
           onto (staircase rule: each ledge ≤ reach.stepUp above a lower foothold, within
           reach.stepRun horizontally), and clearly findable POW couriers.

           Layout is a sequence of ENCOUNTER ZONES. Each zone is one of a few hand-designed
           patterns chosen by sector + index, so placement reads intentionally instead of
           random soup. Enemies are emitted as camera-relative spawn RECORDS (born at the
           screen edge); platforms/hazards/crates/POW are real entities placed now. */
        GameScene.prototype.populateSector = function (idx, len) {
            var self = this, density = this.diff.density, R = CONFIG.reach;
            var pool = this.sectorEnemyPool(idx);
            this._footholds = [{ x: 0, y: GROUND_Y, halfW: len }];   // the ground is foothold #0

            var SAFE = 560;                  // onboarding (no enemies) — teaches movement first
            var combatStart = SAFE, combatEnd = len - 420;

            // ---- helpers --------------------------------------------------------
            function emit(type, x, y) { self.recordEnemy(type, x, y); }
            function groundType(roll) {
                if (roll < 0.5) return 'rush';
                if (roll < 0.82) return 'range';
                if (pool.indexOf('tank') >= 0 && roll < 0.92) return 'tank';
                if (pool.indexOf('drone') >= 0) return 'drone';
                return 'rush';
            }
            // a reachable 2-step staircase up to a high ledge, with a reward/enemy on top.
            // step1 sits stepUp above ground; step2 sits stepUp above step1 → both jumpable.
            function staircase(baseX, topPayload) {
                var s1y = GROUND_Y - R.stepUp;                 // ~70 above ground (reachable)
                var s2y = GROUND_Y - R.stepUp - R.tierGap;     // ~134 total, reached via s1 (+64)
                // WIDER steps (1.0 / 1.1) so landing the jump isn't fiddly — the narrow 0.7/0.9
                // ledges + tight margin were a big part of "tidak bisa naik ke plafon".
                self.addLedge(baseX, s1y, 1.0);
                self.addLedge(baseX + R.stepRun, s2y, 1.1);
                if (topPayload) topPayload(baseX + R.stepRun, s2y);
                return { stepX: baseX, topX: baseX + R.stepRun, topY: s2y };
            }

            // ---- POW couriers: place FIRST, prominently, on the main ground path ----
            // Only spawn pieces not yet unlocked. Spread evenly across the combat zone so each
            // is easy to spot, each flanked by a small guard squad (so it's earned, not free).
            var pieces = infosForSector(idx).filter(function (i) { return !unlocked[i.key]; });
            var powXs = [];
            if (pieces.length) {
                var span = combatEnd - combatStart - 300;
                var gap = span / (pieces.length + 1);
                for (var pIdx = 0; pIdx < pieces.length; pIdx++) {
                    var powX = Math.round(combatStart + 200 + gap * (pIdx + 1));
                    this.spawnPOW(powX, pieces[pIdx].key);
                    powXs.push(powX);
                    // guard squad around the POW (born as the player approaches)
                    emit('rush', powX - 120, GROUND_Y - 30);
                    emit(idx >= 1 ? 'range' : 'rush', powX + 130, GROUND_Y - 30);
                    if (idx >= 2) emit('rush', powX + 240, GROUND_Y - 30);
                }
            }

            // ---- ENCOUNTER ZONES across the combat stretch ----------------------
            // zone width scales the stage length; ~6–10 zones per sector → longer & varied.
            var ZONE = 560;                  // a zone ≈ one screen of designed content
            var zoneCount = Math.max(4, Math.floor((combatEnd - combatStart) / ZONE));
            var minE = (CONFIG.density.minEnemies[STORE.diff] || CONFIG.density.minEnemies.normal);

            for (var z = 0; z < zoneCount; z++) {
                var zx = combatStart + z * ZONE;
                var nearPow = powXs.some(function (px) { return Math.abs(px - (zx + ZONE / 2)) < ZONE * 0.6; });
                var pattern = z % 4;          // rotate 4 hand-designed patterns

                // --- always: a baseline ground squad (meets the per-zone enemy floor) ---
                var squad = Math.max(2, minE - 1);
                for (var q = 0; q < squad; q++) {
                    emit(groundType(((z * 7 + q * 3) % 10) / 10), zx + 120 + q * 150, GROUND_Y - 30);
                }
                if (density >= 1) emit('rush', zx + 90, GROUND_Y - 30);

                if (pattern === 0) {
                    // OPEN GROUND FIREFIGHT — cover barrels + a ranged shooter behind them.
                    this.spawnBarrel(zx + 200, GROUND_Y - 18);
                    this.spawnBarrel(zx + 250, GROUND_Y - 18);
                    emit('range', zx + 360, GROUND_Y - 30);
                    if (idx >= 2) this.spawnFlame(zx + 430);

                } else if (pattern === 1) {
                    // HIGH GROUND — reachable staircase; turret/range perched up top guarding a crate.
                    staircase(zx + 200, function (tx, ty) {
                        self.spawnCrate(tx, ty, self.rollWeapon(idx));
                        // perched enemy sits ON the ledge surface (ty). turret: y=surface (feet
                        // anchored in spawnEnemy); range has gravity and will settle, so spawn it
                        // slightly above so it drops onto the ledge.
                        emit(idx >= 1 ? 'turret' : 'range', tx + 70, idx >= 1 ? ty : ty - 30);
                    });
                    this.spawnBarrel(zx + 140, GROUND_Y - 18);

                } else if (pattern === 2) {
                    // PIT GAUNTLET — spikes you jump over, with a single mid-air ledge stepping
                    // stone (reachable) + an enemy on the far side.
                    if (idx >= 1) this.spawnPit(zx + 260, 90);
                    this.addLedge(zx + 260, GROUND_Y - R.stepUp, 0.85);  // safe stepping stone over the pit (wider = easier landing)
                    emit('rush', zx + 380, GROUND_Y - 30);
                    if (idx >= 2 && density >= 1) emit('drone', zx + 300, GROUND_Y - 200);

                } else {
                    // CONVOY / ARMOR — a heavy (tank if available) + supporting rush, plus cover.
                    this.spawnBarrel(zx + 160, GROUND_Y - 18);
                    if (pool.indexOf('tank') >= 0) emit('tank', zx + 320, GROUND_Y - 30);
                    else emit('range', zx + 320, GROUND_Y - 30);
                    emit('rush', zx + 220, GROUND_Y - 30);
                    if (idx >= 3 && density >= 1) emit('drone', zx + 380, GROUND_Y - 210);
                }

                // weapon crate cadence: every other zone (that didn't already place one)
                if (pattern !== 1 && z % 2 === 1 && !nearPow) {
                    this.spawnCrate(zx + ZONE * 0.55, GROUND_Y, this.rollWeapon(idx));
                }
            }

            // ---- a final scenic approach to the exit: a couple of low reachable ledges +
            //      one last guard so the run ends on action, not dead air ----
            this.addLedge(combatEnd + 60, GROUND_Y - R.stepUp, 0.85);
            emit('rush', combatEnd + 140, GROUND_Y - 30);

            // camera-relative pointer needs the records sorted ↑x
            this.spawnList.sort(function (a, b) { return a.x - b.x; });
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
            // ORIGINAL working geometry: default origin (0.5,0.5) at GROUND_Y-19 (the courier art
            // fills the cell to the bottom, so center−19 plants its feet on the floor). The
            // measured t_pow cell has 0 bottom padding, so no trim/origin-bottom is needed.
            var pow = this.pows.create(x, tuneY('pow', GROUND_Y - 19), 't_pow');
            pow.body.setAllowGravity(false);
            pow.setData('key', key); pow.setData('rescued', false);
            pow.setData('tuneId', 'pow'); this.regTune(pow, 'pow');
            pow.body.setSize(22, 38);
            // gentle bob
            this.tweens.add({ targets: pow, y: pow.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

            // ---- HARD-TO-MISS BEACON so guests always find the courier ----
            // pulsing cyan ring on the ground under the POW
            var ring = this.add.circle(x, GROUND_Y - 2, 16, 0x4fd6c8, 0).setStrokeStyle(2, 0x4fd6c8, 0.9).setDepth(-1);
            this.tweens.add({ targets: ring, radius: 30, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.out',
                onRepeat: function () { ring.radius = 16; ring.alpha = 1; } });
            pow.setData('ring', ring);
            // floating amplop marker above (animated sparkle in asset mode)
            var mark = this.objImage(x, tuneY('amplop', GROUND_Y - 56), 't_amplop');
            pow.setData('mark', mark); this.regTune(mark, 'amplop');
            this.tweens.add({ targets: mark, y: mark.y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            // bobbing "SOS ↓" label so it reads as a rescue target, not décor
            var sos = this.add.text(x, GROUND_Y - 78, '▼ SOS', { fontFamily: 'monospace', fontSize: '11px', color: '#4fd6c8', fontStyle: 'bold' }).setOrigin(0.5).setDepth(7);
            this.tweens.add({ targets: sos, y: sos.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
            pow.setData('sos', sos);
            return pow;
        };

        GameScene.prototype.spawnEnemy = function (type, x, y) {
            // barrel is an enemy-group entity too (destructible cover) — born via the same path
            if (type === 'barrel') return this.spawnBarrel(x, y);
            // texKey + idle anim per type (idle anim only used in asset mode)
            var texKey = type === 'range' ? 't_e_range'
                : type === 'drone' ? 't_drone'
                    : type === 'tank' ? 't_tank'
                        : type === 'turret' ? 't_turret'
                            : 't_e_rush';
            var idleAnim = type === 'range' ? 'e_range_idle'
                : type === 'drone' ? 'e_drone_hover'
                    : type === 'tank' ? 'e_tank_roll'
                        : type === 'turret' ? 'e_turret_idle'
                            : 'e_rush_walk';
            var e = this.enemies.create(x, y, texKey);
            e.setData('tuneId', type); this.regTune(e, type);
            if (type === 'drone') e.body.setAllowGravity(false);
            else if (type === 'turret') { e.body.setAllowGravity(false); e.body.setImmovable(true); }
            // ASSET MODE: re-texture to the sliced sheet cell at the engine display size, play
            // the idle/locomotion anim. Body is set below in SOURCE-frame px so it matches the
            // world hitbox after the cell's scale is applied (mirrors the player asset path).
            this.applyEnemyAsset(e, texKey, idleAnim);
            e.setData('type', type);
            e.setData('hp', type === 'tank' ? 8 : (type === 'turret' ? 3 : (type === 'drone' ? 2 : 1)));
            e.setData('aimT', type === 'turret' ? 400 : 0); e.setData('baseY', e.y); e.setData('seed', Math.random() * 6.28);
            e.setData('animState', ''); e.setData('texKey', texKey);
            e.body.setCollideWorldBounds(false);
            // body sizing.
            //  PROCEDURAL: texture == display, so the default body already matches → only tank
            //  needs its classic tighter 56×36 box.
            //  ASSET MODE: the arcade body is in SOURCE px and is NOT scaled by setDisplaySize, so
            //  the default body would be the whole giant cell (e.g. 96×111) — that's why enemies
            //  sank / floated. Size the body in SOURCE px to the world hitbox (÷ the uniform scale)
            //  and FLOOR-ANCHOR it to the cell bottom, where the character's feet are (padBot≈0–1).
            var d = usingEnemyAssets ? ENEMY_DISP[texKey] : null;
            if (d) {
                // ORIGIN-BOTTOM model (verified by compositing the real enemy sheet): the character
                // art is bottom-flush in its cell, so origin (0.5,1) makes the sprite's visual feet =
                // its world y. We then size the body to the world hitbox (in SOURCE px) and bottom-
                // align it (offsetY = ch − bh) so the COLLISION bottom coincides with the feet. With
                // this, a ground/ledge enemy's feet rest exactly on the surface — no ngambang, no sink.
                e.setOrigin(0.5, 1);
                var bw = d.hb.w / d.scale, bh = d.hb.h / d.scale;   // source px (uniform scale)
                e.body.setSize(bw, bh);
                var offY = d.grav ? (d.ch - bh) : (d.ch - bh) / 2;   // grav: feet-aligned; floaters: centered
                e.body.setOffset((d.cw0 - bw) / 2, Math.max(0, offY));
                // re-seat baseY on the now origin-bottom sprite (drone/turret bob around this)
                e.setData('baseY', e.y);
            } else if (type === 'tank') {
                e.body.setSize(56, 36);
            }
            // record the clean (untuned) body offset / Y so the tuner can compose from a known base,
            // then apply the persisted tune. ASSET enemies (origin-bottom) tune via body.offset.y so
            // feet-collision stays grounded while the visual shifts; PROCEDURAL (origin-center) shifts Y.
            e.setData('baseOffY', e.body.offset.y);
            this.applyEnemyTune(e, type);
            return e;
        };
        // apply (or re-apply) a tuned vertical nudge to one enemy. + = turun (down), − = naik (up).
        GameScene.prototype.applyEnemyTune = function (e, type) {
            var off = TUNE[type] || 0;
            var d = usingEnemyAssets ? ENEMY_DISP[type === 'range' ? 't_e_range' : type === 'drone' ? 't_drone' : type === 'tank' ? 't_tank' : type === 'turret' ? 't_turret' : 't_e_rush'] : null;
            if (d && e.getData('baseOffY') != null) {
                // body in SOURCE px; tune is DISPLAY px → ÷scale. − offY raises body within cell → render DOWN.
                e.body.setOffset(e.body.offset.x, Math.max(0, e.getData('baseOffY') - off / d.scale));
            } else {
                // procedural: shift the sprite (+ baseY for bobbers) by the display-px tune.
                var cur = e.getData('_tuneApplied') || 0, delta = off - cur;
                e.y += delta;
                if (e.getData('baseY') != null) e.setData('baseY', e.getData('baseY') + delta);
                e.setData('_tuneApplied', off);
            }
        };
        // explosive barrel: destructible, AoE on death (level juice + cover)
        GameScene.prototype.spawnBarrel = function (x, y) {
            // ORIGINAL working geometry: default origin (0.5,0.5) at y (caller passes GROUND_Y-18).
            // The barrel art fills the cell to the bottom (0 padding), so center placement plants it
            // on the floor. The origin-bottom rewrite was the floating regression — reverted.
            var e = this.enemies.create(x, tuneY('barrel', y != null ? y : GROUND_Y - 18), 't_barrel');
            e.setData('type', 'barrel'); e.setData('tuneId', 'barrel'); this.regTune(e, 'barrel'); e.setData('hp', 2); e.setData('explosive', true);
            e.setData('aimT', 0); e.setData('seed', 0);
            e.body.setImmovable(true); e.body.setAllowGravity(false);
            var ba = this.objAnim('t_barrel'); if (ba) e.play(ba);   // warning-light loop
            return e;
        };

        // spikes hazard (ground-level danger you must jump over — "pit" without breaking floor)
        GameScene.prototype.spawnPit = function (x, w) {
            var self = this;
            // ORIGINAL working geometry: default origin at GROUND_Y-8 (spikes sit on the floor).
            var spike = this.hazards.create(x, tuneY('spike', GROUND_Y - 8), 't_spike');
            spike.setData('on', true); spike.setData('tuneId', 'spike'); this.regTune(spike, 'spike'); spike.refreshBody();
            this.physics.add.overlap(this.player, spike, function () { self.playerHit(); });
            return spike;
        };
        GameScene.prototype.spawnFlame = function (x) {
            // ORIGINAL working geometry: default origin at GROUND_Y-14 (scaled flame on the floor).
            var f = this.hazards.create(x, tuneY('flame', GROUND_Y - 14), 't_flame');
            f.setData('on', true); f.setData('tuneId', 'flame'); this.regTune(f, 'flame'); f.setScale(1.4); f.refreshBody();
            var fa = this.objAnim('t_flame'); if (fa) f.play(fa);   // flickering fire loop
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
            // ORIGIN-BOTTOM at the surface y (verified by compositing the real crate): the crate art
            // is bottom-flush in its 32px texture, so origin (0.5,1) at y plants its bottom exactly on
            // the ground/ledge top — no sinking (center−4 sank it 12px into the plank), no floating.
            // Body matches the full texture so collision lines up with the visible box.
            var c = this.crates.create(x, tuneY('crate', y), 't_crate');
            c.setOrigin(0.5, 1);
            c.body.setSize(c.width, c.height); c.body.setOffset(0, 0);
            c.body.setAllowGravity(false); c.body.setImmovable(true);
            c.setData('weapon', weapon); c.setData('tuneId', 'crate'); this.regTune(c, 'crate'); c.body.setCollideWorldBounds(false);
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
            // WIDER arena than one screen so the player has real attack distance and the
            // caged couple sits FAR to the right of the boss (was cramped: boss jammed
            // against the cage with no room). Camera pans within [arenaLeft, len] (clamped).
            this.arenaW = Math.min(len, Math.round(BW * 1.6));
            this.arenaLeft = len - this.arenaW;
            // Activate the boss as soon as the player steps INTO the arena (near its left edge),
            // so the camera locks early and the whole wide arena is visible — player on the left,
            // boss to the right, cage far right. (Was: activate ~on top of the boss → cramped.)
            this.arenaX = this.arenaLeft + Math.round(BW * 0.25);
            this.exitX = 99999;                          // no walk-exit; win by boss defeat

            // approach corridor: guards as camera-relative spawn records (born at the edge as
            // the player walks in) — not eager far-X entities (anti off-screen-kill, §5.2).
            this.recordEnemy('range', this.arenaX - 700, GROUND_Y - 30);
            this.recordEnemy('rush', this.arenaX - 400, GROUND_Y - 30);
            this.recordEnemy('rush', this.arenaX - 250, GROUND_Y - 30);
            this.recordEnemy('barrel', this.arenaX - 520, GROUND_Y - 18);
            this.spawnList.sort(function (a, b) { return a.x - b.x; });

            // arena platforms — REACHABLE cover so the player can climb for an angle on the
            // boss weak point. Low ledge (jumpable from ground) + a second one a hop above it.
            var rR = CONFIG.reach;
            var p1 = this.platforms.create(this.arenaLeft + BW * 0.30, GROUND_Y - rR.stepUp + 10, 't_plat'); p1.refreshBody();
            var p2 = this.platforms.create(this.arenaLeft + BW * 0.62, GROUND_Y - rR.stepUp - rR.tierGap + 10, 't_plat'); p2.refreshBody();

            // wedding altar arch + caged couple — pinned to the FAR RIGHT edge (the goal),
            // well clear of the boss so they don't crowd the fight.
            var cageX = len - 70;
            var archImg = this.add.image(cageX, tuneY('arch', GROUND_Y + 2), 't_arch').setOrigin(0.5, 1).setScrollFactor(1).setDepth(-8).setScale(1.3);
            archImg.setData('tuneId', 'arch'); this.regTune(archImg, 'arch');
            // CAGE bottom planted on the ground (origin bottom → y = GROUND_Y). The couple sits a
            // few px higher so their feet read as INSIDE the bars, not below them. (Bug fix: both
            // were anchored 30–36px above GROUND_Y → cage + couple floated off the ground.)
            this.cage = this.add.image(cageX, tuneY('cage', GROUND_Y + 2), 't_cage').setOrigin(0.5, 1).setScrollFactor(1).setAlpha(0.9).setDepth(-5);
            this.cage.setData('tuneId', 'cage'); this.regTune(this.cage, 'cage');
            this.caged = this.add.image(cageX, tuneY('caged', GROUND_Y - 4), 't_couple_caged').setOrigin(0.5, 1).setScrollFactor(1).setDepth(-6);
            this.caged.setData('tuneId', 'caged'); this.regTune(this.caged, 'caged');

            // boss sits in the LEFT-CENTER of the wide arena → big gap to the cage on the right,
            // and the player (spawns at the left wall) has a proper attack corridor.
            // INACTIVE via the bossActive flag (NOT setActive(false) — disabling the body stops
            // bullet overlap; the old "boss never dies" bug). Hidden with alpha until activation.
            var bossX = this.arenaLeft + Math.round(this.arenaW * 0.62);
            // ASSET MODE: the PNG mech fills its cell (feet at the very bottom), so its feet sit at
            // center + dh/2. Plant them on the ground by homing at GROUND_Y - dh/2 (procedural boss
            // had bottom padding, hence its old GROUND_Y - 90). Otherwise it floats.
            var bdPre = usingEnemyAssets ? ENEMY_DISP['t_boss'] : null;
            // ORIGINAL working anchor: center origin, homeY = GROUND_Y − dh/2 plants the mech's feet
            // (which fill the cell bottom) on the floor. The padBot variant was part of the reverted
            // floating-fix rewrite.
            var bossHomeY = tuneY('boss', bdPre ? (GROUND_Y - Math.round(bdPre.dh / 2)) : (GROUND_Y - 90));
            var b = this.physics.add.sprite(bossX, bossHomeY, 't_boss');
            b.body.setAllowGravity(false); b.body.setImmovable(true);
            // re-texture to the sliced boss cell (uniform scale) + play idle. The art faces RIGHT;
            // initial face-left toward the player (who spawns far left). updateBoss() then flips it
            // toward the player every frame, and the muzzle follows the facing.
            this.applyEnemyAsset(b, 't_boss', 'e_boss_idle');
            if (usingEnemyAssets) b.setFlipX(true);
            // size the contact body in SOURCE px to the visible mech (not the giant cell), centered
            // & floor-anchored, so the player only takes touch damage near the actual body.
            var bd = bdPre;
            if (bd) {
                var bbw = bd.hb.w / bd.scale, bbh = bd.hb.h / bd.scale;
                b.body.setSize(bbw, bbh);
                b.body.setOffset((bd.cw0 - bbw) / 2, (bd.ch - bbh) - 1);
            }
            b.setData('hp', 36); b.setData('maxhp', 36); b.setData('phase', 1);  // TTK ~9s pistol
            b.setData('atkT', 2200); b.setData('homeY', bossHomeY);
            b.setData('tuneId', 'boss');
            b.setData('animState', usingEnemyAssets ? 'e_boss_idle' : '');
            b.setAlpha(0);                       // hidden until activation
            this.boss = b;
            // NOTE: bullet hits handled MANUALLY in updateBoss (manualBossHits) — physics overlap
            // on a bobbing, sized, immovable body proved unreliable ("boss can't be shot" bug).
            this.physics.add.overlap(this.player, b, function () { if (self.bossActive && !self.player.cheat) self.playerHit(); });

            // SMALL HP bar that floats ABOVE the boss (world-space, follows boss) — not a big banner
            this.bossHpW = 90;
            this.bossHpBg = this.add.rectangle(b.x, b.y - 80, this.bossHpW + 4, 9, 0x000000, 0.7).setDepth(40).setVisible(false).setStrokeStyle(1, 0xb7a36a);
            this.bossHpFill = this.add.rectangle(b.x - this.bossHpW / 2, b.y - 80, this.bossHpW, 5, 0xe23b2e).setOrigin(0, 0.5).setDepth(41).setVisible(false);

            toast('Tembus pertahanan menuju Markas Boss →');
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
            // lock the camera to the WIDE arena [arenaLeft, len]; it keeps following the player
            // (clamped to these bounds) so there's real room to move during the fight.
            var aLeft = (this.arenaLeft != null) ? this.arenaLeft : (len - BW);
            var aW = (this.arenaW != null) ? this.arenaW : BW;
            this.cameras.main.setBounds(aLeft, 0, aW, BH);
            // wall on the left of the arena so the player can't retreat out of view
            var wall = this.platforms.create(aLeft + 8, GROUND_Y - 200, 't_plat');
            wall.setScale(0.2, 24).refreshBody(); wall.setVisible(false);
            // player respawn point inside arena (so death respawns in-fight, not pit)
            this.player.respawnX = aLeft + 80;
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
            var self = this;
            // ASSET MODE: switch to the enraged loop on phase-up; procedural uses a red tint pulse.
            if (usingEnemyAssets) {
                this.enemyAnim(boss, 'e_boss_enraged', true);
            } else {
                boss.setTint(0xff8888);
                this.time.delayedCall(200, function () { boss.clearTint(); });
            }
        };
        GameScene.prototype.defeatBoss = function (boss) {
            var self = this;
            this.bossDead = true; this.bossActive = false;
            if (this.bossHpBg) this.bossHpBg.setVisible(false);
            if (this.bossHpFill) this.bossHpFill.setVisible(false);
            this.burst(boss.x, boss.y, 0xffd447, 24); this.addTrauma(0.5); this.flash(0xffffff, 150); this.freeze(120);
            // multi-blast boss death: a chain of sprite explosions across the big body
            var bx = boss.x, by = boss.y;
            this.playExplosion(bx, by, 1.4);
            for (var i = 0; i < 5; i++) (function (i) {
                self.time.delayedCall(120 + i * 130, function () {
                    self.playExplosion(bx + Phaser_rand(self, -50, 50), by + Phaser_rand(self, -40, 40), 1.0 + Math.random() * 0.5);
                });
            })(i);
            if (this.cage) this.tweens.add({ targets: this.cage, alpha: 0, scaleY: 0, duration: 600 });
            SFX.win();
            // ASSET MODE: hold the defeated frame under the explosion chain (~0.8s) before removing
            // the body, so the dedicated death pose is seen; procedural removes it immediately.
            if (usingEnemyAssets) {
                boss.clearTint(); boss.body.enable = false;
                this.enemyAnim(boss, 'e_boss_dead', true);
                this.time.delayedCall(820, function () { try { boss.destroy(); } catch (e) {} });
            } else {
                try { boss.destroy(); } catch (e) {}
            }
            bossFinale();
        };

        /* ================= COMBAT / COLLISION ================= */
        GameScene.prototype.killBullet = function (b) {
            if (!b || !b.active) return;
            if (b.getData('nade')) { this.explodeGrenade(b.x, b.y); }
            this.bullets.killAndHide(b); if (b.body) b.body.enable = false;
        };
        GameScene.prototype.explodeGrenade = function (x, y) {
            this.playExplosion(x, y, 0.8);   // sprite-sheet boom (ms2 style) sized to the ~70px AoE
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
                // armored kills get a sprite explosion (mooks stay as a spark pop)
                if (ty === 'tank') this.playExplosion(e.x, e.y, 0.9);
                else if (ty === 'turret') this.playExplosion(e.x, e.y, 0.6);
                var m = e.getData('mark'); if (m) m.destroy();
                var ex = e.x, ey = e.y, expl = e.getData('explosive');
                SFX.hit(); this.updateHUD();
                // ASSET MODE: hold the die/wreck pose for a short beat before removing the
                // sprite, so the dedicated death frame is actually seen (mirrors player tumbang).
                var dieAnim = ty === 'rush' ? 'e_rush_die' : ty === 'range' ? 'e_range_die'
                    : ty === 'turret' ? 'e_turret_wreck' : ty === 'tank' ? 'e_tank_wreck'
                        : ty === 'drone' ? 'e_drone_wreck' : null;
                if (usingEnemyAssets && dieAnim && ty !== 'barrel') {
                    var dd = e; dd.clearTint(); dd.body.enable = false;
                    this.enemyAnim(dd, dieAnim, true);
                    this.time.delayedCall(220, function () { try { dd.destroy(); } catch (e2) {} });
                } else {
                    e.destroy();
                }
                if (expl) this.explodeGrenade(ex, ey);   // barrel chain-explosion (cover + AoE)
            } else {
                e.setTintFill(0xffffff); var ee = e; this.time.delayedCall(60, function () { if (ee.active) ee.clearTint(); });
                if (usingEnemyAssets) {
                    var ht = e.getData('type');
                    var hurtAnim = ht === 'rush' ? 'e_rush_hurt' : ht === 'range' ? 'e_range_hurt' : ht === 'turret' ? 'e_turret_hurt' : null;
                    if (hurtAnim) { this.enemyAnim(e, hurtAnim, true); e.setData('animState', ''); } // clear so loco anim resumes next frame
                }
            }
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
            // tear down the beacon (ring + SOS label) on rescue
            var ring = p.getData('ring'); if (ring) { this.tweens.killTweensOf(ring); ring.destroy(); }
            var sos = p.getData('sos'); if (sos) { this.tweens.killTweensOf(sos); sos.destroy(); }
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
        // pit fall → brief "tumbang" beat (dead pose), then relocate to a safe backtrack point.
        // Still NO game-over (invitation): the dead frame is a short ~0.55s flourish, then respawn.
        GameScene.prototype.pitRespawn = function () {
            var self = this, pl = this.player;
            if (pl._respawning) return;            // guard: one beat at a time
            pl._respawning = true;
            this.flash(0xff3b30, 80); this.addTrauma(0.3); SFX.die();
            var safe = this.findSafeRespawn(pl.x);
            // show the tumbang pose at a visible spot (top of the safe column) for the beat
            pl.dead = true;
            pl.setPosition(safe, GROUND_Y - 70);
            pl.body.setVelocity(0, 0); pl.body.setAllowGravity(false);
            // step() early-returns while dead, so drive the tumbang frame directly here
            if (pl.play) pl.play('p_dead', true);
            pl.setScale((pl.assetMode ? 0.5 : 1) * (pl.facing < 0 ? -1 : 1), pl.assetMode ? 0.5 : 1);
            pl.setAngle(0);
            this.freezeNearbyEnemies(safe);
            this.time.delayedCall(550, function () {
                pl.dead = false; pl._respawning = false;
                pl.body.setAllowGravity(true);
                pl.invuln = C.player.invulnMs; pl.blink();
            });
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
        // Sprite-sheet EXPLOSION (metalslug-2 style). Plays t_explosion anim once at (x,y),
        // self-destructs on complete. Always pairs with a spark burst so it still reads even
        // if the asset is missing (fallback). scale defaults to ~boom size.
        GameScene.prototype.playExplosion = function (x, y, scale) {
            if (this.useExplosion && this.anims.exists('expl_anim')) {
                var sp = this.add.sprite(x, y, 't_explosion').setDepth(6).setScale(scale || 1);
                sp.play('expl_anim');
                sp.once('animationcomplete', function () { sp.destroy(); });
            }
        };
        GameScene.prototype.flash = function (color, dur) { var c = P.Display.Color.IntegerToColor(color); this.cameras.main.flash(dur || 80, c.red, c.green, c.blue); };
        GameScene.prototype.addTrauma = function (t) { this.trauma = clamp(this.trauma + t, 0, 1); };
        GameScene.prototype.freeze = function (ms) { this.freezeUntil = Math.max(this.freezeUntil, this.time.now + Math.min(ms, 500)); };
        GameScene.prototype.celebrate = function (kind) {
            // celebratory beat shown BEFORE the dialog. For the boss win the dialog appears at 5s
            // (bossFinale), so keep the confetti/hearts going ~the full 5s (≈14×350ms) — no dead air.
            var self = this, n = 0;
            var reps = kind === 'boss' ? 13 : 11;   // pieces beat stays ~4.5s
            this.flash(0xffffff, 150); this.addTrauma(0.5);
            var ev = this.time.addEvent({
                delay: 350, repeat: reps, callback: function () {
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

            // CAMERA-RELATIVE SPAWN (MS2 Bible §5.2 / T.7) — off-screen enemies are inert
            // records with NO hitbox; they are BORN at the right screen edge as the camera
            // reaches their triggerX. This makes off-screen-kill structurally impossible:
            // a bullet can never hit an enemy that does not yet exist as an entity.
            this.processSpawnPointer();

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

        // Cull bullets at the VIEWPORT EDGE (MS2 Bible §6 / E.3): a player bullet leaving the
        // screen is disabled within ≤1 frame, so it can never travel into far off-screen space
        // and strike something the player can't see. 16px margin per the bible.
        GameScene.prototype.cullGroup = function (grp) {
            var cam = this.cameras.main, left = cam.scrollX - 16, right = cam.scrollX + BW + 16;
            grp.getChildren().forEach(function (b) {
                if (!b.active) return;
                if (b.x < left || b.x > right || b.y < -40 || b.y > BH + 40) {
                    b.setActive(false).setVisible(false); if (b.body) b.body.enable = false;
                    grp.killAndHide(b);
                }
            });
        };

        // CAMERA-RELATIVE SPAWN POINTER (MS2 Bible §5.2 / T.7). spawnList is sorted ↑x; we
        // birth every record whose triggerX has reached the right edge, AT the edge (not at a
        // far world-X). Also self-despawns enemies that scroll far off the LEFT (anti-leak).
        GameScene.prototype.processSpawnPointer = function () {
            if (!this.spawnList) return;
            var cam = this.cameras.main, edge = cam.scrollX + BW;
            while (this._spawnNext < this.spawnList.length && edge >= this.spawnList[this._spawnNext].x) {
                var r = this.spawnList[this._spawnNext++];
                // born at/just inside the right edge so wide sprites slide in cleanly
                var bx = Math.max(r.x, edge - 8);
                this.spawnEnemy(r.type, bx, r.y);
            }
            // despawn enemies that have scrolled well off the left (return to pool)
            var leftCull = cam.scrollX - 80;
            this.enemies.getChildren().forEach(function (e) {
                if (!e.active || !e.body) return;
                // never cull barrels you walked past (they're cover the player may still shoot
                // from afar is fine — they're on-screen-bounded by the spawn too); cull only
                // when truly behind the camera so populations stay near-screen.
                if (e.body.right < leftCull) {
                    var m = e.getData('mark'); if (m) m.destroy();
                    e.destroy();
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
                    if (usingEnemyAssets) self.enemyAnim(e, 'e_rush_walk');
                    else e.setScale(1, 1 + Math.sin(time / 80 + e.getData('seed')) * 0.06); // procedural walk-bob
                } else if (t === 'range') {
                    e.body.setVelocityX(0); e.setFlipX(px < e.x);
                    self.enemyAim(e, time, 600);
                } else if (t === 'drone') {
                    var seed = e.getData('seed');
                    e.y = e.getData('baseY') + Math.sin(time / 400 + seed) * 30;
                    e.body.setVelocityX(px < e.x ? -50 : 50);
                    if (usingEnemyAssets) self.enemyAnim(e, 'e_drone_hover');
                    if (Math.random() < 0.004 * self.diff.density) self.dropBomb(e);
                } else if (t === 'tank') {
                    e.body.setVelocityX(px < e.x ? -40 : 40); e.setFlipX(px < e.x);
                    if (usingEnemyAssets) self.enemyAnim(e, 'e_tank_roll');
                    self.enemyAim(e, time, 1000, true);
                } else if (t === 'turret') {
                    e.body.setVelocityX(0); e.setFlipX(px < e.x);
                    self.enemyAim(e, time, 700);
                }
                // barrels are static cover — no AI
            });
        };
        // play an enemy anim only when the requested anim differs from the current state
        // (avoids restarting a loop every frame). Skips one-shot states while they run.
        GameScene.prototype.enemyAnim = function (e, animKey, forceRestart) {
            if (!usingEnemyAssets || !e || !e.active) return;
            if (!this.anims.exists(animKey)) return;
            if (!forceRestart && e.getData('animState') === animKey) return;
            e.setData('animState', animKey);
            e.play(animKey, true);
        };
        GameScene.prototype.enemyAim = function (e, time, tell, lob) {
            var aimT = e.getData('aimT') - 16;
            if (aimT <= 0) {
                var self = this, ee = e, isLob = lob, t = e.getData('type');
                // telegraph: ASSET MODE plays the 'aim' frame; procedural uses the red tint.
                if (usingEnemyAssets) {
                    var aimAnim = t === 'tank' ? 'e_tank_aim' : t === 'turret' ? 'e_turret_aim' : 'e_range_aim';
                    this.enemyAnim(e, aimAnim, true);
                } else {
                    e.setTintFill(0xff5a4d);
                }
                this.time.delayedCall(tell * (1 + this.diff.tellAdd), function () {
                    if (!ee.active) return;
                    if (usingEnemyAssets) {
                        var fireAnim = t === 'tank' ? 'e_tank_fire' : t === 'turret' ? 'e_turret_fire' : 'e_range_fire';
                        self.enemyAnim(ee, fireAnim, true);
                        // brief muzzle pose then back to idle/roll locomotion
                        self.time.delayedCall(140, function () {
                            if (!ee.active) return;
                            var back = t === 'tank' ? 'e_tank_roll' : t === 'turret' ? 'e_turret_idle' : 'e_range_idle';
                            self.enemyAnim(ee, back, true);
                        });
                    } else ee.clearTint();
                    self.enemyFire(ee, isLob);
                });
                e.setData('aimT', tell + 1200);
            } else e.setData('aimT', aimT);
        };
        /* Y of an enemy's gun muzzle. ASSET MODE enemies use origin-BOTTOM, so e.y is at the
           FEET — a flat e.y-6 spawns the shot at ground level ("peluru belum naik"). Lift it to
           gun height (≈60% of the display height above the feet). Procedural enemies are
           origin-center, so the classic small -6 from the body center is correct. */
        GameScene.prototype.enemyMuzzleY = function (e) {
            if (usingEnemyAssets) {
                var d = ENEMY_DISP[e.getData('texKey')];
                if (d && d.dh) return e.y - Math.round(d.dh * 0.6);
            }
            return e.y - 6;
        };
        GameScene.prototype.enemyFire = function (e, lob) {
            var b = this.ebullets.get(e.x, this.enemyMuzzleY(e), 't_ebullet');
            if (!b) return;
            // ebullets pool also holds the boss rocket (t_rocket); reset texture only on a real change
            if (b.texture && b.texture.key !== 't_ebullet') { b.setTexture('t_ebullet'); b.setRotation(0); }
            b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(!!lob);
            var dir = this.player.x < e.x ? -1 : 1;
            var spd = 260 * this.diff.bulletSpd;
            if (lob) { b.body.setVelocity(dir * 160, -300); } else { b.body.setVelocity(dir * spd, 0); }
            SFX.shoot();
        };
        GameScene.prototype.dropBomb = function (e) {
            var b = this.ebullets.get(e.x, e.y + 8, 't_ebullet');
            if (!b) return;
            if (b.texture && b.texture.key !== 't_ebullet') { b.setTexture('t_ebullet'); b.setRotation(0); }
            b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(true);
            b.body.setVelocity(0, 120);
        };

        GameScene.prototype.updateBoss = function (time, delta) {
            var b = this.boss, self = this;
            var ph = b.getData('phase');
            // FACE THE PLAYER: art faces right, so flipX when the player is to the LEFT. Mirror the
            // muzzle to whichever side the boss now faces so shots leave from the cannon, not its back.
            if (usingEnemyAssets) b.setFlipX(self.player && self.player.x < b.x);
            var atk = b.getData('atkT') - delta;
            if (atk <= 0) {
                var tell = (ph === 3 ? 1100 : ph === 2 ? 700 : 800) * (1 + this.diff.tellAdd);
                // telegraph: ASSET MODE plays the telegraph frame; procedural keeps the red tint.
                if (usingEnemyAssets) this.enemyAnim(b, 'e_boss_tell', true);
                else b.setTint(0xff8888);
                this.time.delayedCall(tell, function () {
                    if (!b.active || !self.bossActive) return;
                    if (usingEnemyAssets) {
                        self.enemyAnim(b, 'e_boss_fire', true);
                        // after the volley, settle back to idle (ph1) or enraged loop (ph2+)
                        self.time.delayedCall(260, function () {
                            if (!b.active || !self.bossActive) return;
                            self.enemyAnim(b, b.getData('phase') >= 2 ? 'e_boss_enraged' : 'e_boss_idle', true);
                        });
                    } else b.clearTint();
                    // AIM AT THE PLAYER: aim vector from boss muzzle to player, with a small
                    // spread fan so it's dodgeable. (Bug fix: previously always fired flat-left.)
                    var count = ph === 1 ? 3 : (ph === 2 ? 5 : 4);
                    var spd = 300 * self.diff.bulletSpd;
                    // muzzle on the side the boss faces (toward the player), not hardcoded left.
                    var faceLeft = self.player ? (self.player.x < b.x) : true;
                    var mx = b.x + (faceLeft ? -50 : 50), my = b.y - 6;
                    for (var i = 0; i < count; i++) {
                        (function (i) {
                            self.time.delayedCall(i * 100, function () {
                                if (!b.active || !self.player || !self.player.active) return;
                                var bl = self.ebullets.get(mx, my, 't_ebullet');
                                if (!bl) return;
                                if (bl.texture && bl.texture.key !== 't_ebullet') { bl.setTexture('t_ebullet'); bl.setRotation(0); }
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
                            if (r.texture && r.texture.key !== 't_rocket') { r.setTexture('t_rocket'); }
                            r.setActive(true).setVisible(true); r.body.enable = true; r.body.setAllowGravity(false);
                            var dx = self.player.x - mx, dy = self.player.y - my, dl = Math.hypot(dx, dy) || 1;
                            r.setRotation(Math.atan2(dy, dx));
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

        /* TUNABLE REGISTRY — every sprite the tuner can nudge registers here at creation, tagged
           with its `tuneId`. This is the single source the live-apply walks, so EVERY sprite type
           (player, enemies, items, hazards, terrain, decor, parallax bg, structures) shifts
           instantly when its slider moves — including the many grass/bush + backdrop props that
           live outside the physics groups. Reset per sector in buildSector(). */
        GameScene.prototype.regTune = function (el, id) {
            if (!el) return el;
            if (!this.tunables) this.tunables = [];
            try { el.setData && el.setData('tuneId', id); } catch (e) {}
            this.tunables.push({ el: el, id: id });
            return el;
        };

        /* SPRITE TUNER live-apply: shift every registered sprite tagged with this id by the DELTA.
           Player + boss + asset-enemies keep their special feet-anchoring; everything else is a
           plain Y shift (and baseY shift for bobbers) so the move is instantly visible. Game runs. */
        GameScene.prototype.applyLiveTune = function (id, newVal) {
            var oldVal = (TUNE[id] || 0), delta = newVal - oldVal;
            TUNE[id] = newVal; saveTune();
            var self = this;
            // player: re-derive its body offset (re-anchors the texture vs feet)
            if (id === 'player') { if (this.player && this.player.applyTuneOffset) this.player.applyTuneOffset(); return; }
            // boss: shift its home Y so the bob recomputes around the new anchor
            if (id === 'boss' && this.boss && this.boss.active) {
                this.boss.setData('homeY', this.boss.getData('homeY') + delta);
                this.boss.y += delta; if (this.bossHpBg) this.updateBossHp();
                return;
            }
            // ENEMY types (rush/range/turret/drone/tank): re-apply via the asset body-offset /
            // procedural Y model so feet-collision stays grounded while the visual shifts.
            var ENEMY_IDS = ['rush', 'range', 'turret', 'drone', 'tank'];
            if (ENEMY_IDS.indexOf(id) >= 0) {
                if (this.enemies) this.enemies.getChildren().forEach(function (e) {
                    if (e.active && e.getData('tuneId') === id) self.applyEnemyTune(e, id);
                });
                return;
            }
            if (!delta) return;
            // EVERYTHING ELSE — plain Y shift via the registry (covers terrain/decor/parallax/etc).
            // Prune dead refs as we go. baseY-bobbers get their anchor shifted too.
            if (this.tunables) {
                this.tunables = this.tunables.filter(function (rec) {
                    var s = rec.el;
                    if (!s || (s.active === false) || (s.scene == null)) return false;   // gone
                    if (rec.id !== id) return true;
                    s.y += delta;
                    if (s.getData && s.getData('baseY') != null) s.setData('baseY', s.getData('baseY') + delta);
                    if (s.body && s.refreshBody && s.body.immovable) { try { s.refreshBody(); } catch (e2) {} }
                    return true;
                });
            }
            // standalone structure images (also registered, but keep direct refs in sync)
            if (id === 'cage' && this.cage) { /* shifted via registry */ }
            if (id === 'caged' && this.caged) { /* shifted via registry */ }
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
            // PNG assets are 60x84 (2x). Render at 0.5 so the player looks the same size as
            // the 30x42 procedural sprite — every world number (hitbox/GROUND_Y/camera) stays
            // valid. body.setSize/offset are in TEXTURE px, so they scale with the sprite.
            this.assetMode = usingPlayerAssets;
            if (this.assetMode) {
                this.setScale(0.5);
                // body in texture-space: 2x the world hitbox, centered & floor-anchored
                this.body.setSize(C.player.w * 2, C.player.h * 2);
                this.body.setOffset((this.width - C.player.w * 2) / 2, this.height - C.player.h * 2);
            } else {
                this.body.setSize(C.player.w, C.player.h);
                this.body.setOffset((this.width - C.player.w) / 2, this.height - C.player.h);  // center & floor-anchor
            }
            this.body.setMaxVelocity(C.player.run, C.player.maxFall);
            this.body.setDragX(C.player.drag);
            this.setCollideWorldBounds(true);
            this.coyote = 0; this.buffer = 0; this.invuln = 0; this.hits = 0; this.dead = false;
            this._prone = false; this._hurtAnimT = 0;
            this.weapon = 'P'; this.ammo = Infinity; this.fireT = 0; this.cheat = false;
            this.facing = 1; this.respawnX = this.x;
            this.grenades = C.grenades;
            this.applyTuneOffset();
            if (this.play) this.play('p_idle');
        };
        // SPRITE TUNER: nudge the player TEXTURE up/down relative to its feet-collision body.
        // + (turun) lowers the texture, − (naik) raises it. Re-derives the floor-anchored
        // offset (so it composes with prone/asset modes) then adds the tune delta.
        Player.prototype.applyTuneOffset = function () {
            var k = this.assetMode ? 2 : 1;
            var baseH = this._prone ? C.player.h * 0.6 * k : C.player.h * k;
            var off = TUNE.player || 0;   // + down, − up
            // increasing offset.y lifts the texture; so subtract `off` to make + = turun
            this.body.setOffset((this.width - C.player.w * k) / 2, (this.height - baseH) - off);
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
                var k = this.assetMode ? 2 : 1;   // body is in TEXTURE px (2x in asset mode)
                this.body.setSize(C.player.w * k, (wantProne ? C.player.h * 0.6 : C.player.h) * k);
                this.applyTuneOffset();   // floor-anchor + tuner delta (composes with prone)
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
            var aimingDown = input.down && !this.body.blocked.down;   // shoot-down while airborne
            var aimingUp = input.up && onGround && !proneNow;          // standing shoot-up
            if (this.dead) { anim = 'p_dead'; }
            else if (this.invuln > 0 && this._hurtAnimT > 0) { anim = 'p_hurt'; this._hurtAnimT -= delta; }
            else if (proneNow) anim = 'p_prone';
            else if (!onGround) anim = (input.fire && aimingDown) ? 'p_jumpdown' : (vy < 0 ? 'p_jump' : 'p_fall');
            else if (aimingUp && Math.abs(vx) <= 40) anim = 'p_aimup';   // hold Up while standing → aim up
            else if (Math.abs(vx) > 40) anim = 'p_run';
            else anim = 'p_idle';
            if (this.anims && this.anims.currentAnim && this.anims.currentAnim.key === anim) { /* keep */ }
            else if (this.play) this.play(anim, true);

            // landing squash juice (on top of anim)
            if (onGround && !this._wasGround && this._fellFast) { this._squash = 1; this._fellFast = false; }
            if (!onGround && vy > 300) this._fellFast = true;
            this._wasGround = onGround;
            this._squash = Math.max(0, (this._squash || 0) - delta / 140);

            // base scale: 0.5 in asset mode (60x84 PNG -> 30x42 on screen), 1 procedural
            var base = this.assetMode ? 0.5 : 1;
            var sx = base, sy = base, ang = 0;
            if (!onGround) ang = Phaser_clampNum(vx * 0.015, -6, 6);
            if (this._squash > 0) { sy *= (1 - 0.28 * this._squash); sx *= (1 + 0.28 * this._squash); }
            if (this._recoil > 0) { this._recoil -= delta; sx *= 0.97; }   // tiny recoil
            this.setScale(this.facing < 0 ? -sx : sx, sy);
            this.setAngle(ang);
        };
        Player.prototype.aimDir = function () {
            // returns {x,y} unit-ish for bullet velocity (Bible §4.4 — 5 dirs)
            var fx = this.facing, up = input.up, down = input.down && !this.body.blocked.down;
            // PRONE (crouch on ground): always shoot LOW & HORIZONTAL — never up/diagonal.
            // (Holding Down on the ground = crouch; the gun must point forward at ground level,
            //  not up. Without this, a stray Up read or the default mid-body spawn made crouch
            //  shots look like they fired upward.)
            if (this._prone) return { x: fx, y: 0 };
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
            // muzzle Y: standing = -6 above center; PRONE = lower (crouched gun height) so the
            // shot leaves from the ducked body, not above it.
            var muzzleY = this._prone ? 8 : -6;
            var sx = this.x + d.x * 18, sy = this.y + muzzleY + d.y * 6;
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
            // bullets is a RECYCLING pool — .get() reuses a dead object and KEEPS its old
            // texture, so a thrown grenade was rendering as the last bullet/rocket. Re-seat the
            // grenade texture (+ clear leftover bullet rotation) only when it's actually wrong.
            if (n.texture && n.texture.key !== 't_nade') { n.setTexture('t_nade'); }
            n.setRotation(0);
            n.setActive(true).setVisible(true); n.body.enable = true; n.body.setAllowGravity(true);
            n.setData('nade', true); n.body.setVelocity(this.facing * 260, -260);
            n.setData('dmg', 5);
            SFX.grenade();
        };

        GameScene.prototype.spawnBullet = function (x, y, dx, dy, tex, spd) {
            var b = this.bullets.get(x, y, tex);
            if (!b) return;
            // force the requested texture ONLY when the recycled pool object carries a different
            // one (a thrown grenade shares this pool, so a recycled bullet could keep the grenade
            // texture, and vice-versa). Guard on a real change so we don't re-seat the arcade body
            // every shot.
            if (b.texture && b.texture.key !== tex) { b.setTexture(tex); }
            b.setActive(true).setVisible(true); b.body.enable = true; b.body.setAllowGravity(false);
            var len = Math.hypot(dx, dy) || 1;
            b.body.setVelocity(dx / len * spd, dy / len * spd);
            b.setData('nade', false);
            if (tex === 't_rocket' || tex === 't_bullet') b.setRotation(Math.atan2(dy, dx));
            else b.setRotation(0);
            b.setData('dmg', this.player.weaponDmg());
            return b;
        };

        return GameScene;
    }

})();

