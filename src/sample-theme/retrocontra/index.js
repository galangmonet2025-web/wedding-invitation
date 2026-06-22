/* ======================================================================
CONTRA: OPERATION LOVE — run-and-gun engine + invitation glue
----------------------------------------------------------------------
One self-contained IIFE. Everything is drawn on a single <canvas>. The
world is authored on a fixed virtual tile grid; the canvas backing store
is sized to displayed CSS px × devicePixelRatio and the context scaled so
art renders crisp at high resolution (no blurry upscale).

The guest plays a Contra-style commando (the groom). The invitation is
DISCOVERED, not shown: shooting a floating POD drops a weapon power-up and
unlocks one invitation piece (top-right inventory icon → retro modal).
Destroying the gate-core at the end clears the area; clearing the final
area rescues the princess (the bride) and reveals the full invitation.

Phase 1 scope: horizontal run-and-gun, 8 selectable areas (gate-core each;
final area adds the rescue ending). Vertical-climb segments are Phase 2.

The host app has already bound all {{vars}} into the DOM before this runs.
====================================================================== */
(function () {
    'use strict';

    // The app re-injects this script on theme switch; clean up the old loop.
    if (typeof window.__rcCleanup === 'function') { try { window.__rcCleanup(); } catch (e) {} }

    var cleanupFns = [];
    function onCleanup(fn) { cleanupFns.push(fn); }
    window.__rcCleanup = function () { cleanupFns.forEach(function (f) { try { f(); } catch (e) {} }); cleanupFns = []; };

    // ---- copyToClipboard (used by gift buttons; global like other themes) ----
    window.copyToClipboard = function (id, btn) {
        var el = document.getElementById(id);
        if (!el) return;
        var text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : (el.innerText || el.textContent);
        var done = function () {
            var orig = btn.innerHTML;
            btn.innerHTML = '✔ TERSALIN';
            setTimeout(function () { btn.innerHTML = orig; }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
        } else { fallbackCopy(text, done); }
    };
    function fallbackCopy(text, cb) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { document.execCommand('copy'); cb(); } catch (e) {}
        document.body.removeChild(ta);
    }

    function start() {
        var canvas = document.getElementById('rc-canvas');
        var stage = document.getElementById('rc-stage');
        if (!canvas || !stage) return;
        var ctx = canvas.getContext('2d');

        // ============================================================
        // CONSTANTS
        // ============================================================
        var TILE = 16;
        var ROWS = 40;
        var GROUND_R = ROWS - 2;
        var BASE_VIS_COLS = 15;     // a bit wider than Mario — gunfights need read room
        var COLS_VIS = BASE_VIS_COLS;
        var VW = COLS_VIS * TILE;
        var VH = 14 * TILE;
        var camY = 0;
        var BOTTOM_SAFE = 0;
        var BOTTOM_SAFE_TILES = 7;

        // Physics (responsive, not floaty)
        var GRAV = 0.55;
        var MOVE = 0.6, FRICTION = 0.80, MAXVX = 2.8, RUN_MAX = 3.4;
        var JUMP_V = -8.4, JUMP_HOLD = 0.28, JUMP_HOLD_FRAMES = 13;
        var MAX_FALL = 9;
        var JUMP_BUFFER = 6, COYOTE = 6;
        var MAX_JUMP_TILES_W = 5;

        var TOTAL_STAGES = 8;

        // ============================================================
        // BIOME LADDER (Contra flavour). Phase 1: all horizontal.
        // ============================================================
        var BIOMES = {
            jungle:   { sky: ['#2c4a6a', '#5a86a8'], ground: '#3a6a30', groundTop: '#5aa048', groundDark: '#244a1e', hills: '#2f7a3e', clouds: '#dfeede' },
            bridge:   { sky: ['#244064', '#48708e'], ground: '#3a6a30', groundTop: '#5aa048', groundDark: '#244a1e', hills: '#2a6a38', clouds: '#cfe0ee' },
            baseext:  { sky: ['#2a2030', '#544050'], ground: '#555', groundTop: '#777', groundDark: '#333', hills: '#3a3040', clouds: '#7a6070' },
            waterfall:{ sky: ['#1a6ca8', '#3aa0d0'], ground: '#1f7a6a', groundTop: '#37b09a', groundDark: '#0e4a40', hills: '#2a8a78', clouds: '#bfeefe' },
            snow:     { sky: ['#7fa8d0', '#cfe0f0'], ground: '#cfd8e8', groundTop: '#ffffff', groundDark: '#9aa8c0', hills: '#bcd0e8', clouds: '#ffffff' },
            energy:   { sky: ['#2a1020', '#5a2030'], ground: '#555', groundTop: '#777', groundDark: '#333', hills: '#3a2030', clouds: '#7a4050', lava: true },
            innerbase:{ sky: ['#181024', '#3a2040'], ground: '#4a4458', groundTop: '#6a6488', groundDark: '#2a2438', hills: '#2a2040', clouds: '#5a4a70' },
            lair:     { sky: ['#1a0818', '#3a1028'], ground: '#444', groundTop: '#666', groundDark: '#222', hills: '#2a1028', clouds: '#5a2040', lava: true, boss: true }
        };
        var WORLDS = [
            { biome: 'jungle',    diff: 'easy',   name: '1' },
            { biome: 'bridge',    diff: 'easy',   name: '2' },
            { biome: 'baseext',   diff: 'medium', name: '3' },
            { biome: 'waterfall', diff: 'medium', name: '4' },
            { biome: 'snow',      diff: 'medium', name: '5' },
            { biome: 'energy',    diff: 'hard',   name: '6' },
            { biome: 'innerbase', diff: 'hard',   name: '7' },
            { biome: 'lair',      diff: 'hard',   name: '8' }
        ];

        // ============================================================
        // WEAPONS
        // ============================================================
        // cd = frames between shots; spd = bullet speed; spread = extra angles.
        var WEAPONS = {
            R: { name: 'RIFLE',   cd: 12, spd: 6.2, big: false, pierce: false, spread: 0 },
            S: { name: 'SPREAD',  cd: 16, spd: 5.6, big: false, pierce: false, spread: 2 }, // 5-way
            M: { name: 'MACHINE', cd: 6,  spd: 6.6, big: false, pierce: false, spread: 0 },
            L: { name: 'LASER',   cd: 18, spd: 8.4, big: true,  pierce: true,  spread: 0 },
            F: { name: 'FIRE',    cd: 14, spd: 5.0, big: true,  pierce: false, spread: 0, fire: true }
        };
        var POD_WEAPONS = ['S', 'M', 'L', 'F']; // what a (non-info) pod can drop

        // ============================================================
        // SMALL HELPERS / DATA ACCESS
        // ============================================================
        function val(k, fb) {
            var el = document.querySelector('[data-var="' + k + '"]');
            var v = el ? (el.textContent || '').trim() : '';
            if (!v || v.indexOf('{{') === 0) return fb || '';
            return v;
        }
        function sectionExists(infoKey) {
            return !!document.querySelector('.rc-sec[data-info="' + infoKey + '"]');
        }
        function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

        // ============================================================
        // INFO PIECES — the discoverable invitation parts (same set as RetroMario).
        // ============================================================
        var INFO_DEFS = [
            { key: 'couple',    label: 'MEMPELAI',  always: true },
            { key: 'schedule',  label: 'ACARA',     always: true },
            { key: 'gallery',   label: 'GALERI' },
            { key: 'gift',      label: 'HADIAH' },
            { key: 'story',     label: 'KISAH' },
            { key: 'streaming', label: 'STREAMING' },
            { key: 'happiness', label: 'BERBAGI' },
            { key: 'rsvp',      label: 'RSVP' },
            { key: 'wishes',    label: 'UCAPAN' },
            { key: 'closing',   label: 'PENUTUP',   always: true }
        ];
        var INFOS = INFO_DEFS.filter(function (d) { return d.always || sectionExists(d.key); });

        // Persisted state
        var STORE_KEY = 'rc_wedding_state_v1';
        var saved = {};
        try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }
        var unlocked = saved.unlocked || {};
        var bestScore = saved.bestScore || 0;
        var seenInfo = saved.seenInfo || {};
        var bestStage = saved.bestStage || 1;
        var completed = !!saved.completed;
        var announcedAll = !!saved.announcedAll;

        function persist() {
            try {
                localStorage.setItem(STORE_KEY, JSON.stringify({
                    unlocked: unlocked, bestScore: Math.max(bestScore, score),
                    seenInfo: seenInfo, bestStage: bestStage, completed: completed,
                    announcedAll: announcedAll, gameDiff: gameDiff
                }));
            } catch (e) {}
        }
        function resetSave() {
            try { localStorage.removeItem(STORE_KEY); } catch (e) {}
            unlocked = {}; seenInfo = {}; bestScore = 0; bestStage = 1; completed = false; announcedAll = false; gameDiff = 'medium';
        }

        function allInfoUnlocked() {
            for (var i = 0; i < INFOS.length; i++) { if (!unlocked[INFOS[i].key]) return false; }
            return INFOS.length > 0;
        }

        // ============================================================
        // PATTERN LIBRARY — stamps onto a tile grid.
        // Tile chars:  # ground  B brick/crate  X solid block  ^ no (unused)
        //   o (n/a)  P pod-info  Q pod-weapon  g soldier  r runner  t turret
        //   n sniper  / gap-marker  C checkpoint(flat)
        // ============================================================
        function blankCol() { var c = []; for (var r = 0; r < ROWS; r++) c.push(' '); return c; }
        function fillGroundCols(g, x0, x1) {
            for (var x = x0; x <= x1; x++) { g[x][GROUND_R] = '#'; g[x][GROUND_R + 1] = '#'; }
        }
        function carveGap(g, x0, x1) {
            for (var x = x0; x <= x1; x++) { if (g[x]) { g[x][GROUND_R] = ' '; g[x][GROUND_R + 1] = ' '; } }
        }
        function up(n) { return GROUND_R - n; }

        var PAT = {
            flat: function (w) { return { width: w, stamp: function (g, x) { fillGroundCols(g, x, x + w - 1); } }; },

            crateWall: function (h) { h = h || 2; return { width: 3, stamp: function (g, x) {
                fillGroundCols(g, x, x + 2);
                for (var i = 0; i < h; i++) g[x + 1][up(1 + i)] = 'B';
            } }; },

            podInfo: function () { return { width: 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + 3); g[x + 2][up(5)] = 'P';
            } }; },

            podWeapon: function () { return { width: 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + 3); g[x + 2][up(5)] = 'Q';
            } }; },

            soldiers: function (n, sp) { sp = sp || 4; return { width: n * sp + 3, stamp: function (g, x) {
                fillGroundCols(g, x, x + n * sp + 2);
                for (var i = 0; i < n; i++) g[x + 2 + i * sp][up(1)] = 'g';
            } }; },

            runners: function (n, sp) { sp = sp || 3; return { width: n * sp + 3, stamp: function (g, x) {
                fillGroundCols(g, x, x + n * sp + 2);
                for (var i = 0; i < n; i++) g[x + 2 + i * sp][up(1)] = 'r';
            } }; },

            turret: function () { return { width: 5, stamp: function (g, x) {
                fillGroundCols(g, x, x + 4);
                g[x + 2][up(1)] = 'B'; g[x + 2][up(2)] = 't';   // turret on a crate
            } }; },

            sniperLedge: function () { return { width: 6, stamp: function (g, x) {
                fillGroundCols(g, x, x + 5);
                g[x + 2][up(3)] = 'B'; g[x + 3][up(3)] = 'B';
                g[x + 2][up(4)] = 'n';
            } }; },

            ledge: function (len, h) { len = len || 3; h = h || 3; return { width: len + 2, stamp: function (g, x) {
                fillGroundCols(g, x, x + len + 1);
                for (var i = 0; i < len; i++) g[x + 1 + i][up(h)] = 'B';
            } }; },

            gap: function (w) { w = clamp(w, 1, MAX_JUMP_TILES_W); return { width: w + 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + 1);
                carveGap(g, x + 2, x + 1 + w);
                fillGroundCols(g, x + 2 + w, x + 3 + w);
            } }; },

            bunker: function () { return { width: 7, stamp: function (g, x) {
                fillGroundCols(g, x, x + 6);
                g[x + 1][up(1)] = 'B'; g[x + 1][up(2)] = 'B';
                g[x + 5][up(1)] = 'B'; g[x + 5][up(2)] = 'B';
                g[x + 3][up(1)] = 'g';
            } }; }
        };

        function cp(p) { p.checkpoint = true; return p; }

        // Info quota distribution (sum = INFOS.length over first areas)
        var STAGE_INFO_QUOTA = [3, 3, 2, 2, 0, 0, 0, 0];
        function stageInfoQuota(stage) {
            var total = INFOS.length;
            var base = STAGE_INFO_QUOTA.slice();
            var baseSum = base.reduce(function (a, b) { return a + b; }, 0); // 10
            if (total === baseSum) return base[stage - 1] || 0;
            var out = [0, 0, 0, 0, 0, 0, 0, 0], placed = 0;
            for (var i = 0; i < 4; i++) { out[i] = Math.round(base[i] / baseSum * total); placed += out[i]; }
            out[0] += (total - placed);
            if (out[0] < 0) out[0] = 0;
            return out[stage - 1] || 0;
        }
        function stageInfoOffset(stage) {
            var off = 0;
            for (var s = 1; s < stage; s++) off += stageInfoQuota(s);
            return off;
        }

        // Difficulty knobs (world base + chosen mode), pattern from RetroMario.
        function diffKnobs(stage) {
            var world = WORLDS[stage - 1] || WORLDS[0];
            var baseIdx = world.diff === 'hard' ? 2 : (world.diff === 'medium' ? 1 : 0);
            var modeIdx = gameDiff === 'hard' ? 1 : (gameDiff === 'medium' ? 0 : -1);
            var lvl = clamp(baseIdx + modeIdx, 0, 2);
            return {
                lvl: lvl, hard: lvl === 2, med: lvl === 1,
                gapBase: lvl === 2 ? 4 : (lvl === 1 ? 3 : 2),
                lenMul: lvl === 2 ? 2 : 1,
                extra: lvl >= 1,
                enemySpeed: lvl === 2 ? 1.1 : (lvl === 1 ? 0.85 : 0.6),
                enemyMul: lvl === 2 ? 2 : (lvl === 1 ? 1.5 : 1),
                soldierSpace: lvl === 2 ? 3 : (lvl === 1 ? 4 : 5),
                fireRate: lvl === 2 ? 70 : (lvl === 1 ? 100 : 150), // frames between enemy shots
                bulletSpd: lvl === 2 ? 2.2 : (lvl === 1 ? 1.9 : 1.6)
            };
        }

        function buildSpine(stage) {
            var world = WORLDS[stage - 1] || WORLDS[0];
            var k = diffKnobs(stage);
            var quota = stageInfoQuota(stage);
            var nInfo = 0;
            function info() { if (nInfo < quota) { nInfo++; return PAT.podInfo(); } return PAT.podWeapon(); }
            function sol(n) { return PAT.soldiers(Math.max(n, Math.round(n * k.enemyMul)), k.soldierSpace); }

            var start = [PAT.flat(7), PAT.podWeapon()];
            var s;
            switch (world.biome) {
                case 'bridge':
                    s = [sol(1), PAT.gap(k.gapBase), info(), PAT.runners(1),
                        PAT.turret(), cp(PAT.flat(4)), PAT.gap(k.gapBase),
                        info(), sol(2), PAT.ledge(3, 3), PAT.gap(k.gapBase)];
                    break;
                case 'baseext':
                    s = [PAT.turret(), sol(1), PAT.crateWall(2), info(),
                        PAT.bunker(), cp(PAT.flat(4)), PAT.turret(),
                        info(), sol(2), PAT.sniperLedge()];
                    break;
                case 'waterfall':
                    s = [PAT.gap(k.gapBase), sol(1), PAT.ledge(3, 4), info(),
                        PAT.gap(k.gapBase), cp(PAT.flat(4)), PAT.runners(2),
                        info(), PAT.ledge(3, 3), PAT.gap(k.gapBase)];
                    break;
                case 'snow':
                    s = [sol(2), PAT.bunker(), info(), PAT.turret(),
                        cp(PAT.flat(4)), PAT.runners(2), PAT.gap(k.gapBase),
                        info(), sol(2), PAT.sniperLedge()];
                    break;
                case 'energy':
                    s = [PAT.turret(), PAT.gap(k.gapBase), sol(2), PAT.crateWall(3),
                        cp(PAT.flat(4)), PAT.bunker(), PAT.turret(),
                        PAT.gap(k.gapBase + 1), sol(2), PAT.sniperLedge()];
                    break;
                case 'innerbase':
                    s = [PAT.turret(), PAT.crateWall(2), sol(2), PAT.turret(),
                        cp(PAT.flat(4)), PAT.bunker(), PAT.sniperLedge(),
                        sol(2), PAT.turret(), PAT.crateWall(3)];
                    break;
                case 'lair':
                    s = [PAT.turret(), sol(2), PAT.gap(k.gapBase), PAT.bunker(),
                        cp(PAT.flat(4)), PAT.turret(), sol(2),
                        PAT.sniperLedge(), PAT.gap(k.gapBase), sol(2)];
                    break;
                default: // jungle (area 1) — teaches shooting
                    s = [sol(1), PAT.flat(3), info(), PAT.runners(1),
                        PAT.crateWall(2), sol(1), info(),
                        cp(PAT.flat(4)), PAT.gap(k.gapBase), info(),
                        PAT.bunker(), PAT.turret(), info(), sol(1)];
            }

            if (k.extra) {
                s = s.concat([PAT.sniperLedge(), sol(2)]);
                if (k.hard) s = s.concat([PAT.turret(), PAT.gap(k.gapBase), sol(2)]);
            }
            if (k.lenMul > 1) s = s.concat(s.slice(2));

            var tail = [PAT.podWeapon(), PAT.flat(4), sol(1), PAT.flat(6)];
            return { spine: start.concat(s, tail), infoCount: nInfo };
        }

        function buildLevel(stage) {
            var built = buildSpine(stage);
            var spine = built.spine;
            var isBoss = !!(BIOMES[(WORLDS[stage - 1] || WORLDS[0]).biome] || {}).boss;

            var total = 0; spine.forEach(function (p) { total += p.width; });
            var pad = 6;
            var BOSS_RUNWAY = 40;
            var COLS = total + pad + 8 + (isBoss ? BOSS_RUNWAY : 0);
            var grid = [];
            for (var x = 0; x < COLS; x++) grid.push(blankCol());
            fillGroundCols(grid, 0, COLS - 1);

            var cx = 2, checkpointX = 0;
            for (var i = 0; i < spine.length; i++) {
                spine[i].stamp(grid, cx);
                if (spine[i].checkpoint) checkpointX = cx;
                cx += spine[i].width;
            }
            fillGroundCols(grid, cx, COLS - 1);

            var gateX, prisonX = 0, bossX = 0;
            if (isBoss) {
                bossX = cx + 3;
                prisonX = bossX + 16;
                gateX = prisonX + 16;
            } else {
                gateX = cx + 2;
            }
            return { grid: grid, cols: COLS, gateX: gateX, checkpointX: checkpointX, prisonX: prisonX, bossX: bossX, isBoss: isBoss };
        }

        function validate(level) {
            var g = level.grid, COLS = level.cols, issues = [];
            var run = 0;
            for (var x = 0; x < COLS; x++) {
                var hasFloor = g[x][GROUND_R] === '#' || g[x][GROUND_R + 1] === '#';
                if (!hasFloor) { run++; if (run > MAX_JUMP_TILES_W) issues.push('gap>' + MAX_JUMP_TILES_W + ' @col ' + x); }
                else run = 0;
            }
            for (var c = 0; c < 5; c++) for (var r = 0; r < ROWS; r++) {
                var ch = g[c][r];
                if (ch === 'g' || ch === 'r' || ch === 't' || ch === 'n') issues.push('enemy in start-safe @col ' + c);
            }
            if (level.gateX <= 0) issues.push('no goal');
            if (issues.length) console.warn('[retrocontra] level issues:', issues);
            return issues.length === 0;
        }

        // ============================================================
        // WORLD STATE
        // ============================================================
        var W;
        var stageNum = 1;
        function buildWorld(stage) {
            stageNum = stage;
            var biomeKey = (WORLDS[stage - 1] || WORLDS[0]).biome;
            var biome = BIOMES[biomeKey];
            var isBoss = !!biome.boss;
            var dk = diffKnobs(stage);

            var level = buildLevel(stage);
            validate(level);
            var g = level.grid, COLS = level.cols;
            var infoBase = stageInfoOffset(stage), infoLocal = 0;

            var world = {
                cols: COLS, grid: g, biome: biome, biomeKey: biomeKey, isBoss: isBoss,
                gateX: level.gateX * TILE, checkpointX: level.checkpointX * TILE,
                prisonX: (level.prisonX || 0) * TILE, bossX: (level.bossX || 0) * TILE,
                enemies: [], pods: [], powerups: [], bullets: [], ebullets: [], particles: [],
                worldW: COLS * TILE, worldH: ROWS * TILE,
                gate: null, boss: null, cleared: false,
                enemySpeed: dk.enemySpeed, fireRate: dk.fireRate, bulletSpd: dk.bulletSpd, diffLvl: dk.lvl
            };

            for (var x = 0; x < COLS; x++) {
                for (var r = 0; r < ROWS; r++) {
                    var ch = g[x][r];
                    if (ch === 'g') { world.enemies.push(mkEnemy(x, r, 'soldier', dk)); g[x][r] = ' '; }
                    else if (ch === 'r') { world.enemies.push(mkEnemy(x, r, 'runner', dk)); g[x][r] = ' '; }
                    else if (ch === 't') { world.enemies.push(mkEnemy(x, r, 'turret', dk)); g[x][r] = ' '; }
                    else if (ch === 'n') { world.enemies.push(mkEnemy(x, r, 'sniper', dk)); g[x][r] = ' '; }
                    else if (ch === 'P') {
                        var pod = mkPod(x, r);
                        pod.info = INFOS[(infoBase + infoLocal) % INFOS.length];
                        infoLocal++;
                        world.pods.push(pod); g[x][r] = ' ';
                    }
                    else if (ch === 'Q') { world.pods.push(mkPod(x, r)); g[x][r] = ' '; }
                }
            }

            // Gate-core at the goal (the "boss" of a normal area).
            if (!isBoss) {
                world.gate = mkGate(level.gateX, dk);
            } else {
                world.boss = mkBoss(world.bossX / TILE - 6, dk.lvl);
                world.princess = { x: world.prisonX + 2, y: GROUND_R * TILE - 16, w: 12, h: 16, t: 0, rescued: false, freed: false, face: -1 };
                world.gate = mkGate(level.gateX, dk); // final flag still a gate visual at very end
            }
            return world;
        }

        function mkEnemy(c, r, kind, dk) {
            var spd = dk.enemySpeed;
            var base = { x: c * TILE, y: (GROUND_R - 1) * TILE, w: 14, h: 14, vx: -spd, vy: 0,
                alive: true, hp: 1, squash: 0, kind: kind, t: Math.random() * 6, fireCd: 60 + Math.floor(Math.random() * dk.fireRate) };
            if (kind === 'runner') { base.vx = -(spd + 0.5); base.hp = 1; }
            if (kind === 'turret') { base.x = c * TILE; base.y = (r) * TILE; base.w = 16; base.h = 16; base.vx = 0; base.hp = 3; }
            if (kind === 'sniper') { base.x = c * TILE; base.y = (r) * TILE; base.vx = 0; base.hp = 2; base.diag = true; }
            return base;
        }
        function mkPod(c, r) {
            return { x: c * TILE, y: (r) * TILE, baseY: (r) * TILE, w: 16, h: 16, t: Math.random() * 6,
                alive: true, vy: 0.6, info: null };
        }
        function mkGate(c, dk) {
            return { x: c * TILE, y: up(5) * TILE, w: 18, h: 5 * TILE, hp: 6 + dk.lvl * 2, maxhp: 6 + dk.lvl * 2,
                alive: true, hitFlash: 0, t: 0, fireCd: 80, broken: false };
        }
        function mkBoss(c, lvl) {
            lvl = lvl || 0;
            var spd = lvl === 2 ? 1.4 : (lvl === 1 ? 1.1 : 0.9);
            return { x: c * TILE, y: (GROUND_R - 3) * TILE, w: 30, h: 36,
                vx: spd, vy: 0, alive: true, hp: 12, maxhp: 12, phase: 1, hitFlash: 0,
                invuln: 0, t: 0, fireCd: 70, kind: 'boss', lvl: lvl, baseSpd: spd };
        }

        // ============================================================
        // SOLID TILE QUERIES
        // ============================================================
        function tileAt(c, r) {
            if (c < 0 || c >= W.cols || r < 0 || r >= ROWS) return r >= ROWS ? ' ' : '#';
            return W.grid[c][r];
        }
        function isSolid(ch) { return ch === '#' || ch === 'B' || ch === 'X'; }
        function solidAt(c, r) { return isSolid(tileAt(c, r)); }

        // ============================================================
        // PLAYER
        // ============================================================
        var player;
        function resetPlayer(atCheckpoint) {
            var spawnX = atCheckpoint && W.checkpointX ? W.checkpointX : 2 * TILE;
            var keepWeapon = player ? player.weapon : 'R';
            player = {
                x: spawnX, y: (GROUND_R - 2) * TILE, w: 11, h: 14,
                vx: 0, vy: 0, onGround: false, face: 1,
                dead: false, deadT: 0, invuln: 0, win: false,
                jumpHold: 0, jumping: false, fireCd: 0,
                weapon: keepWeapon || 'R', prone: false,
                cheat: player ? player.cheat : false, auto: null
            };
            jumpQueued = 0; coyote = 0;
        }

        // ============================================================
        // GAME-WIDE STATE
        // ============================================================
        var score = 0, lives = 3;
        var camX = 0;
        var keys = { left: false, right: false, up: false, down: false, jump: false, fire: false };
        var jumpQueued = 0, coyote = 0;
        var running = false, started = false;
        var gameDiff = (saved.gameDiff === 'easy' || saved.gameDiff === 'hard') ? saved.gameDiff : 'medium';
        var DIFF_ORDER = ['easy', 'medium', 'hard'];
        var animT = 0;
        var fireworks = [], fwActive = 0;
        var flash = { t: 0, max: 1, col: '#fff' };
        function triggerFlash(frames, col) { flash.t = frames; flash.max = frames; flash.col = col || '#fff'; }

        // Lives per difficulty (per design §6)
        function startLives() { return gameDiff === 'easy' ? 5 : 3; }

        var elLives = document.getElementById('rc-lives');
        var elScore = document.getElementById('rc-score');
        var elWorld = document.getElementById('rc-world');
        var elToast = document.getElementById('rc-toast');
        var elDiffBadge = document.getElementById('rc-diff-badge');
        var elWeaponName = document.getElementById('rc-weapon-name');
        var elWeaponIco = document.getElementById('rc-weapon-ico');
        var DIFF_LVL_NAME = ['EASY', 'MEDIUM', 'HARD'];

        function setHUD() {
            if (elLives) elLives.textContent = '×' + lives;
            if (elScore) elScore.textContent = ('000000' + score).slice(-6);
            if (elWorld) elWorld.textContent = (WORLDS[stageNum - 1] || WORLDS[0]).name;
            if (elDiffBadge) {
                var lvl = diffKnobs(stageNum).lvl;
                var key = ['easy', 'medium', 'hard'][lvl];
                elDiffBadge.textContent = DIFF_LVL_NAME[lvl];
                elDiffBadge.setAttribute('data-lvl', key);
            }
            setWeaponHUD();
        }
        function setWeaponHUD() {
            if (!player) return;
            var w = WEAPONS[player.weapon] || WEAPONS.R;
            if (elWeaponName) elWeaponName.textContent = w.name;
            if (elWeaponIco) elWeaponIco.textContent = player.weapon;
        }
        function addScore(n) { if (!player.cheat) { score += n; setHUD(); } }
        var toastTimer;
        function toast(msg, ms) {
            if (!elToast) return;
            elToast.innerHTML = msg; elToast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { elToast.classList.remove('show'); }, ms || 1600);
        }

        // ============================================================
        // INVENTORY + MODALS
        // ============================================================
        var invHost = document.getElementById('rc-inv');
        var invButtons = {};

        function pixIcon(canvasEl, key) {
            var c = canvasEl.getContext('2d');
            c.clearRect(0, 0, 16, 16);
            var P = { couple: '#e52521', schedule: '#43b047', gallery: '#fac000', gift: '#7a5cff',
                story: '#ff7ab6', streaming: '#e52521', happiness: '#fac000', rsvp: '#43b047',
                wishes: '#7aa8ff', closing: '#fac000' };
            c.fillStyle = P[key] || '#fac000';
            function px(x, y, w, h) { c.fillRect(x, y, w || 1, h || 1); }
            if (key === 'couple') { px(4, 3, 3, 3); px(9, 3, 3, 3); px(3, 8, 4, 5); px(9, 8, 4, 5); }
            else if (key === 'schedule') { px(2, 3, 12, 2); px(2, 3, 2, 10); px(12, 3, 2, 10); px(2, 11, 12, 2); px(6, 6, 2, 2); px(9, 6, 2, 2); }
            else if (key === 'gallery') { px(2, 4, 12, 8); c.fillStyle = '#fff'; px(4, 9, 3, 2); px(8, 7, 4, 4); }
            else if (key === 'gift') { px(3, 6, 10, 7); px(2, 4, 12, 2); px(7, 2, 2, 11); }
            else if (key === 'story') { px(4, 4, 3, 3); px(9, 4, 3, 3); px(3, 6, 10, 3); px(5, 9, 6, 3); px(7, 11, 2, 2); }
            else if (key === 'streaming') { px(2, 4, 9, 8); px(11, 6, 3, 4); }
            else if (key === 'happiness') { px(7, 2, 2, 12); px(2, 7, 12, 2); }
            else if (key === 'rsvp') { px(3, 7, 4, 4); c.fillStyle = '#fff'; px(5, 9, 2, 2); c.fillStyle = P.rsvp; px(8, 5, 5, 2); px(8, 9, 5, 2); }
            else if (key === 'wishes') { px(2, 4, 12, 6); px(5, 10, 4, 2); }
            else { px(3, 3, 10, 2); px(3, 3, 2, 8); px(11, 3, 2, 8); px(3, 11, 10, 2); px(6, 6, 4, 4); }
        }

        function buildInventory() {
            if (!invHost) return;
            invHost.innerHTML = '';
            invButtons = {};
            INFOS.forEach(function (info) {
                var btn = document.createElement('button');
                btn.className = 'rc-inv-item';
                btn.type = 'button';
                btn.title = info.label;
                var cv = document.createElement('canvas');
                cv.width = 16; cv.height = 16;
                btn.appendChild(cv);
                pixIcon(cv, info.key);
                var badge = document.createElement('span');
                badge.className = 'rc-badge';
                btn.appendChild(badge);
                btn.addEventListener('click', function () {
                    if (btn.classList.contains('is-enabled')) {
                        btn.classList.remove('has-new');
                        seenInfo[info.key] = true; persist();
                        openModal(info);
                    }
                });
                invHost.appendChild(btn);
                invButtons[info.key] = btn;
                if (unlocked[info.key]) {
                    btn.classList.add('is-enabled');
                    if (!seenInfo[info.key]) btn.classList.add('has-new');
                }
            });
        }

        function unlockInfo(info) {
            var first = !unlocked[info.key];
            unlocked[info.key] = true;
            var btn = invButtons[info.key];
            if (btn) {
                btn.classList.add('is-enabled');
                if (!seenInfo[info.key]) btn.classList.add('has-new', 'just-unlocked');
                setTimeout(function () { if (btn) btn.classList.remove('just-unlocked'); }, 520);
            }
            if (allInfoUnlocked()) {
                updateViewBtn();
                if (!announcedAll) { announcedAll = true; setTimeout(announceAllCollected, 900); }
            }
            persist();
            return first;
        }

        function announceAllCollected() {
            playSfx('fanfare');
            triggerFlash(46, '#fff3b0');
            startFireworks();
            for (var i = 0; i < 5; i++) spawnFirework(camX + 30 + i * (VW - 60) / 4, camY + 30 + (i % 2) * 24);
            toast('🎉 SEMUA INFO TERKUMPUL! 🎉<br><span style="font-size:8px;color:#fac000">Undangan terbuka — selamat! ✨</span>', 2200);
            if (viewBtn) viewBtn.classList.add('just-unlocked');
            setTimeout(function () { if (viewBtn) viewBtn.classList.remove('just-unlocked'); }, 700);
            setTimeout(function () { showCongrats(); }, 1700);
        }

        function showCongrats() {
            running = false;
            var winText = document.getElementById('rc-win-text');
            var titleEl = document.querySelector('#rc-win .rc-overlay-pixtitle');
            var groom = val('groom_nickname', 'Mempelai Pria');
            var bride = val('bride_nickname', 'Mempelai Wanita');
            if (titleEl) titleEl.innerHTML = '🎉 SELAMAT! 🎉';
            if (winText) {
                winText.innerHTML =
                    '<div style="color:#ffd24a;font-size:11px;line-height:1.9;margin-bottom:10px">' +
                    'Kamu sudah mengumpulkan SEMUA kepingan undangan ' +
                    '<strong>' + esc(groom) + '</strong> &amp; <strong>' + esc(bride) + '</strong>! 💌✨</div>' +
                    '<div style="font-size:11px;line-height:1.9;color:rgba(255,255,255,0.9)">' +
                    'Undangan kini terbuka penuh. Tekan tombol di bawah untuk membaca undangan lengkap kami. 🎆</div>';
            }
            showOverlay('rc-win');
        }

        var modalRoot = document.getElementById('rc-modal-root');
        var modalBody = document.getElementById('rc-modal-body');
        var modalTitle = document.getElementById('rc-modal-title');
        var modalIco = document.getElementById('rc-modal-ico');

        function openModal(info) {
            var sec = document.querySelector('.rc-sec[data-info="' + info.key + '"]');
            if (!sec || !modalRoot) return;
            modalBody.innerHTML = '';
            var clone = sec.cloneNode(true);
            clone.classList.add('rc-modal-clone');
            modalBody.appendChild(clone);
            if (info.key === 'schedule') renderCalendar(clone.querySelector('.rc-cal'));
            modalTitle.textContent = info.label;
            if (modalIco) { modalIco.width = 14; modalIco.height = 14; pixIcon(modalIco, info.key); }
            modalRoot.classList.add('show');
            playSfx('modal');
        }
        function closeModal() { if (modalRoot) modalRoot.classList.remove('show'); }
        var mc = document.getElementById('rc-modal-close');
        if (mc) mc.addEventListener('click', closeModal);
        if (modalRoot) modalRoot.addEventListener('click', function (e) { if (e.target === modalRoot) closeModal(); });

        // ============================================================
        // LIGHTBOX
        // ============================================================
        var lb = document.getElementById('rc-lightbox');
        var lbImg = document.getElementById('rc-lightbox-img');
        var lbCount = document.getElementById('rc-lightbox-count');
        var lbList = [], lbIdx = 0;
        function lbShow(i) {
            if (!lbList.length) return;
            lbIdx = (i + lbList.length) % lbList.length;
            if (lbImg) lbImg.src = lbList[lbIdx];
            if (lbCount) lbCount.textContent = (lbIdx + 1) + ' / ' + lbList.length;
        }
        function openLightbox(imgEl) {
            var grid = imgEl.closest ? imgEl.closest('.rc-gallery-grid') : null;
            var imgs = grid ? grid.querySelectorAll('img') : document.querySelectorAll('.rc-gallery-item img');
            lbList = []; var startI = 0;
            for (var k = 0; k < imgs.length; k++) {
                var src = imgs[k].currentSrc || imgs[k].src;
                if (!src || src.indexOf('{{') >= 0) continue;
                if (imgs[k] === imgEl) startI = lbList.length;
                lbList.push(src);
            }
            if (!lbList.length) return;
            lbShow(startI);
            if (lb) lb.classList.add('show');
            playSfx('modal');
        }
        function closeLightbox() { if (lb) lb.classList.remove('show'); }
        if (lb) {
            var galleryClick = function (e) {
                var t = e.target;
                if (t && t.tagName === 'IMG' && t.closest && t.closest('.rc-gallery-item')) {
                    e.preventDefault(); openLightbox(t);
                }
            };
            document.addEventListener('click', galleryClick);
            onCleanup(function () { document.removeEventListener('click', galleryClick); });
            lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
            var lbC = document.getElementById('rc-lightbox-close');
            var lbP = document.getElementById('rc-lightbox-prev');
            var lbN = document.getElementById('rc-lightbox-next');
            if (lbC) lbC.addEventListener('click', closeLightbox);
            if (lbP) lbP.addEventListener('click', function () { lbShow(lbIdx - 1); });
            if (lbN) lbN.addEventListener('click', function () { lbShow(lbIdx + 1); });
            onCleanup(function () { closeLightbox(); });
        }

        // ============================================================
        // AUDIO
        // ============================================================
        var actx = null;
        function audioCtx() {
            if (actx) return actx;
            try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
            return actx;
        }
        var muted = false;
        function playSfx(type) {
            if (muted) return;
            var c = audioCtx(); if (!c) return;
            if (c.state === 'suspended') c.resume();
            var t = c.currentTime;
            function tone(f0, f1, dur, vol, wave) {
                var o = c.createOscillator(), g = c.createGain();
                o.type = wave || 'square'; o.frequency.setValueAtTime(f0, t);
                if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
                g.gain.setValueAtTime(vol || 0.08, t);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
            }
            function arp(notes, step, dur, vol, wave) {
                notes.forEach(function (f, i) { setTimeout(function () { tone(f, f, dur || 0.12, vol || 0.08, wave); }, i * (step || 70)); });
            }
            if (type === 'shoot') tone(760, 420, 0.06, 0.04, 'square');
            else if (type === 'spread') { tone(700, 380, 0.07, 0.04, 'square'); tone(900, 500, 0.05, 0.03, 'square'); }
            else if (type === 'machine') tone(820, 600, 0.04, 0.03, 'square');
            else if (type === 'laser') tone(1200, 500, 0.12, 0.05, 'sawtooth');
            else if (type === 'fire') tone(520, 240, 0.10, 0.045, 'sawtooth');
            else if (type === 'jump') tone(420, 760, 0.16, 0.06);
            else if (type === 'explosion') { tone(220, 60, 0.22, 0.08, 'sawtooth'); setTimeout(function () { tone(140, 50, 0.18, 0.06, 'sawtooth'); }, 60); }
            else if (type === 'enemyhit') tone(300, 120, 0.10, 0.06);
            else if (type === 'powerup') { arp([392, 523, 659, 784, 1046], 55, 0.12, 0.07); }
            else if (type === 'unlock') { tone(659, 988, 0.12, 0.08); setTimeout(function () { tone(988, 1319, 0.14, 0.08); }, 90); }
            else if (type === 'modal') tone(740, 1100, 0.1, 0.06);
            else if (type === 'hit') { tone(330, 80, 0.3, 0.08, 'triangle'); }
            else if (type === 'die') { tone(330, 80, 0.5, 0.09, 'triangle'); setTimeout(function () { tone(196, 60, 0.5, 0.08, 'triangle'); }, 240); }
            else if (type === 'turretfire') tone(240, 120, 0.08, 0.05, 'sawtooth');
            else if (type === 'gatehit') tone(180, 90, 0.10, 0.07, 'square');
            else if (type === 'stageclear') { arp([523, 659, 784, 1046, 784, 1046, 1318], 110, 0.16, 0.08); }
            else if (type === 'win') { arp([523, 659, 784, 1046, 1318, 1046, 1568], 130, 0.18, 0.08); }
            else if (type === 'fanfare') {
                arp([523, 659, 784, 1046, 1318, 1568], 95, 0.18, 0.09);
                setTimeout(function () { arp([1046, 1318, 1568, 2093], 80, 0.22, 0.09); }, 620);
            }
            else if (type === '1up') { arp([659, 784, 1046, 1318], 60, 0.12, 0.08); }
            else if (type === 'alarm') { tone(880, 440, 0.18, 0.07, 'sawtooth'); setTimeout(function () { tone(880, 440, 0.18, 0.07, 'sawtooth'); }, 220); }
        }

        // ---- In-game chiptune BGM (tense/military) ----
        var bgmEnabled = false, bgmNext = 0, bgmStep = 0;
        var BGM_LEAD = [ 0, 0, 7, 0, 5, 0, 3, 0,  0, 0, 8, 7, 5, 3, 5, 0 ];
        var BGM_BASS = [ 0, 0, 0, 0, 5, 5, 5, 5,  3, 3, 3, 3, 7, 7, 7, 7 ];
        var BGM_REST = [ 1, 0, 1, 0, 1, 0, 1, 0,  1, 0, 1, 1, 1, 1, 1, 0 ];
        var BGM_ROOT = 220.0;
        function midiToHz(semi) { return BGM_ROOT * Math.pow(2, semi / 12); }
        function bgmVoice(c, freq, t, dur, vol, wave) {
            var o = c.createOscillator(), g = c.createGain();
            o.type = wave; o.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
        }
        function stepBgm() {
            if (!bgmEnabled || muted) return;
            var c = audioCtx(); if (!c) return;
            if (c.state === 'suspended') c.resume();
            var STEP = 0.11, AHEAD = 0.2;
            if (bgmNext < c.currentTime) bgmNext = c.currentTime + 0.05;
            while (bgmNext < c.currentTime + AHEAD) {
                var i = bgmStep % 16;
                if (BGM_REST[i]) bgmVoice(c, midiToHz(BGM_LEAD[i] + 12), bgmNext, STEP * 0.9, 0.03, 'square');
                bgmVoice(c, midiToHz(BGM_BASS[i] - 12), bgmNext, STEP * 1.4, 0.04, 'triangle');
                bgmStep++; bgmNext += STEP;
            }
        }
        function startBgm() { if (bgmEnabled) return; bgmEnabled = true; bgmStep = 0; bgmNext = 0; }
        function stopBgm() { bgmEnabled = false; }

        // ============================================================
        // INPUT
        // ============================================================
        function bindKey() {
            function kd(e) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
                else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
                else if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
                else if (e.code === 'ArrowUp' || e.code === 'KeyW') { keys.up = true; }
                else if (e.code === 'Space') { keys.jump = true; e.preventDefault(); if (!e.repeat) jumpQueued = JUMP_BUFFER; }
                else if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'ControlLeft' || e.code === 'KeyK') { keys.fire = true; e.preventDefault(); }
                else if (e.code === 'KeyL' || e.code === 'KeyX') { keys.jump = true; if (!e.repeat) jumpQueued = JUMP_BUFFER; }
                else if (e.code === 'Escape') { closeLightbox(); closeModal(); }
            }
            function ku(e) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
                else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
                else if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
                else if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
                else if (e.code === 'Space') keys.jump = false;
                else if (e.code === 'KeyJ' || e.code === 'KeyZ' || e.code === 'ControlLeft' || e.code === 'KeyK') keys.fire = false;
                else if (e.code === 'KeyL' || e.code === 'KeyX') keys.jump = false;
            }
            function clearKeys() { keys.left = keys.right = keys.up = keys.down = keys.jump = keys.fire = false; jumpQueued = 0; }
            window.addEventListener('keydown', kd);
            window.addEventListener('keyup', ku);
            window.addEventListener('blur', clearKeys);
            onCleanup(function () {
                window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
                window.removeEventListener('blur', clearKeys);
            });
        }

        function holdBtn(id, key, opts) {
            var el = document.getElementById(id);
            if (!el) return;
            function on(e) { e.preventDefault(); keys[key] = true; el.classList.add('is-pressed'); if (key === 'jump') jumpQueued = JUMP_BUFFER; if (opts && opts.tap) opts.tap(); }
            function off(e) { if (e) e.preventDefault(); keys[key] = false; el.classList.remove('is-pressed'); }
            el.addEventListener('touchstart', on, { passive: false });
            el.addEventListener('touchend', off, { passive: false });
            el.addEventListener('touchcancel', off, { passive: false });
            el.addEventListener('mousedown', on);
            el.addEventListener('mouseup', off);
            el.addEventListener('mouseleave', off);
            onCleanup(function () {
                el.removeEventListener('touchstart', on); el.removeEventListener('touchend', off);
                el.removeEventListener('mousedown', on); el.removeEventListener('mouseup', off);
            });
        }

        function bindJoystick() {
            var joy = document.getElementById('rc-joy');
            var nub = document.getElementById('rc-joy-nub');
            if (!joy || !nub) return;
            var activeId = null, cx = 0, cy = 0, R = 0;
            var DEAD = 0.34;
            function setDir(dx, dy) {
                var mag = Math.sqrt(dx * dx + dy * dy) || 1;
                var clampMag = Math.min(mag, R);
                var ux = (dx / mag) * clampMag, uy = (dy / mag) * clampMag;
                nub.style.transform = 'translate(' + ux.toFixed(1) + 'px,' + uy.toFixed(1) + 'px)';
                var fx = dx / R, fy = dy / R;
                keys.left = fx < -DEAD; keys.right = fx > DEAD;
                keys.up = fy < -DEAD; keys.down = fy > DEAD;
                joy.classList.toggle('dir-left', keys.left);
                joy.classList.toggle('dir-right', keys.right);
                joy.classList.toggle('dir-up', keys.up);
                joy.classList.toggle('dir-down', keys.down);
            }
            function release() {
                activeId = null; nub.style.transform = 'translate(0,0)';
                keys.left = keys.right = keys.up = keys.down = false;
                joy.classList.remove('dir-left', 'dir-right', 'dir-up', 'dir-down');
            }
            function center() {
                var rect = joy.getBoundingClientRect();
                cx = rect.left + rect.width / 2; cy = rect.top + rect.height / 2;
                R = rect.width / 2 - 8;
            }
            function pos(e) {
                var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
                return { x: t.clientX, y: t.clientY };
            }
            function down(e) { e.preventDefault(); center(); activeId = (e.touches && e.touches[0]) ? e.touches[0].identifier : 'mouse'; var p = pos(e); setDir(p.x - cx, p.y - cy); }
            function move(e) { if (activeId === null) return; e.preventDefault(); var p = pos(e); setDir(p.x - cx, p.y - cy); }
            function upE(e) { if (activeId === null) return; e.preventDefault(); release(); }
            joy.addEventListener('touchstart', down, { passive: false });
            joy.addEventListener('touchmove', move, { passive: false });
            joy.addEventListener('touchend', upE, { passive: false });
            joy.addEventListener('touchcancel', upE, { passive: false });
            joy.addEventListener('mousedown', function (e) { down(e); window.addEventListener('mousemove', move); window.addEventListener('mouseup', mu); });
            function mu(e) { upE(e); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', mu); }
            onCleanup(function () {
                joy.removeEventListener('touchstart', down); joy.removeEventListener('touchmove', move);
                joy.removeEventListener('touchend', upE); joy.removeEventListener('touchcancel', upE);
                window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', mu);
            });
        }

        // ============================================================
        // SHOOTING — 8-direction aim from current input.
        // ============================================================
        function aimVector() {
            // Returns {ax, ay} unit-ish direction based on keys + facing.
            var ux = 0, uy = 0;
            if (keys.up) uy = -1;
            if (keys.down && !player.onGround) uy = 1;     // aim down only mid-air
            if (keys.left) ux = -1;
            else if (keys.right) ux = 1;
            // prone (down on ground) shoots flat in facing dir
            if (uy === 0 && ux === 0) ux = player.face;     // straight ahead
            if (uy !== 0 && ux === 0) ux = 0;               // straight up/down
            // normalize diagonal
            if (ux !== 0 && uy !== 0) { var m = Math.SQRT1_2; return { ax: ux * m, ay: uy * m }; }
            return { ax: ux, ay: uy };
        }

        function fire() {
            if (player.dead || player.win || player.auto) return;
            if (player.fireCd > 0) return;
            var wdef = WEAPONS[player.weapon] || WEAPONS.R;
            // limit on-screen bullets for non-machine
            if (W.bullets.length > 24) return;
            var aim = aimVector();
            var muzzleX = player.x + player.w / 2 + aim.ax * 8;
            var muzzleY = player.y + (player.prone ? player.h - 5 : 5) + aim.ay * 6;
            var spd = wdef.spd;

            function spawn(ax, ay) {
                W.bullets.push({ x: muzzleX, y: muzzleY, vx: ax * spd, vy: ay * spd,
                    alive: true, big: wdef.big, pierce: wdef.pierce, fire: !!wdef.fire, hit: {} });
            }
            if (wdef.spread >= 2) {
                // 5-way fan around aim
                var base = Math.atan2(aim.ay, aim.ax);
                for (var a = -2; a <= 2; a++) {
                    var ang = base + a * 0.18;
                    spawn(Math.cos(ang), Math.sin(ang));
                }
                playSfx('spread');
            } else {
                spawn(aim.ax, aim.ay);
                playSfx(player.weapon === 'M' ? 'machine' : (player.weapon === 'L' ? 'laser' : (player.weapon === 'F' ? 'fire' : 'shoot')));
            }
            player.fireCd = wdef.cd;
        }

        // ============================================================
        // PHYSICS STEP — player
        // ============================================================
        function collideAxis(p, ax) {
            var r0 = Math.floor(p.y / TILE), r1 = Math.floor((p.y + p.h - 1) / TILE);
            var c0 = Math.floor(p.x / TILE), c1 = Math.floor((p.x + p.w - 1) / TILE);
            if (ax === 'x') {
                if (p.vx > 0) {
                    var cR = Math.floor((p.x + p.w - 1) / TILE);
                    for (var r = r0; r <= r1; r++) if (solidAt(cR, r)) { p.x = cR * TILE - p.w; p.vx = 0; break; }
                } else if (p.vx < 0) {
                    var cL = Math.floor(p.x / TILE);
                    for (var r2 = r0; r2 <= r1; r2++) if (solidAt(cL, r2)) { p.x = (cL + 1) * TILE; p.vx = 0; break; }
                }
            } else {
                if (p.vy > 0) {
                    var rB = Math.floor((p.y + p.h - 1) / TILE);
                    for (var c = c0; c <= c1; c++) if (solidAt(c, rB)) { p.y = rB * TILE - p.h; p.vy = 0; p.onGround = true; break; }
                } else if (p.vy < 0) {
                    var rT = Math.floor(p.y / TILE);
                    for (var c2 = c0; c2 <= c1; c2++) if (solidAt(c2, rT)) { p.y = (rT + 1) * TILE; p.vy = 0; break; }
                }
            }
        }

        function stepPlayer() {
            if (!player.dead && player.y > (GROUND_R + 2) * TILE) {
                if (player.cheat) { rescueFromPit(); }
                else { player.dead = true; player.deadT = 0; player.vy = -7; playSfx('die'); }
            }
            if (player.dead) {
                player.deadT++;
                player.vy += GRAV * 0.6; player.y += player.vy;
                if (player.deadT > 48) respawn();
                return;
            }
            if (player.win) {
                // during win, keep simple gravity (for cutscene auto-walk)
            }

            var inLeft = keys.left, inRight = keys.right;
            if (player.auto === 'right') { inLeft = false; inRight = true; }
            else if (player.auto === 'stop') { inLeft = false; inRight = false; }

            player.prone = !!(keys.down && player.onGround && !player.auto && Math.abs(player.vx) < 1.2);

            var max = (inLeft || inRight) && Math.abs(player.vx) > MAXVX - 0.2 ? RUN_MAX : MAXVX;
            if (player.auto) max = Math.min(max, 1.6);
            if (player.prone) { inLeft = false; inRight = false; }    // can't run while prone
            if (inLeft) { player.vx -= MOVE; player.face = -1; }
            if (inRight) { player.vx += MOVE; player.face = 1; }
            if (!inLeft && !inRight) player.vx *= FRICTION;
            player.vx = clamp(player.vx, -max, max);
            if (Math.abs(player.vx) < 0.05) player.vx = 0;

            coyote = player.onGround ? COYOTE : Math.max(0, coyote - 1);
            if (player.auto) jumpQueued = 0;
            if (jumpQueued > 0 && (player.onGround || coyote > 0) && !player.prone) {
                player.vy = JUMP_V; player.onGround = false; player.jumping = true; player.jumpHold = JUMP_HOLD_FRAMES;
                jumpQueued = 0; coyote = 0; playSfx('jump');
            } else if (jumpQueued > 0) { jumpQueued--; }
            if (player.jumping && keys.jump && player.jumpHold > 0) { player.vy -= JUMP_HOLD; player.jumpHold--; }
            else player.jumping = false;

            player.vy += GRAV; player.vy = Math.min(player.vy, MAX_FALL);
            player.onGround = false;
            player.x += player.vx; collideAxis(player, 'x');
            player.y += player.vy; collideAxis(player, 'y');

            if (player.x < 0) { player.x = 0; player.vx = 0; }
            if (player.x + player.w > W.worldW) player.x = W.worldW - player.w;

            // Shooting
            if (player.fireCd > 0) player.fireCd--;
            if (keys.fire && !player.auto) fire();

            if (player.invuln > 0) player.invuln--;

            // Goal handling
            if (W.isBoss) {
                stepBossEnding();
            } else if (W.cleared && !player.win && player.x + player.w >= W.gateX) {
                // reaching the broken gate after clearing finishes the area
                reachGate();
            }

            collectPowerups();
        }

        function collectPowerups() {
            for (var i = 0; i < W.powerups.length; i++) {
                var pu = W.powerups[i]; if (!pu.alive) continue;
                pu.t++; pu.vy += GRAV * 0.5; pu.vy = Math.min(pu.vy, 4);
                var below = Math.floor((pu.y + pu.h) / TILE), pc = Math.floor((pu.x + pu.w / 2) / TILE);
                if (solidAt(pc, below)) { pu.y = below * TILE - pu.h; pu.vy = 0; }
                pu.x += pu.vx || 0; pu.y += pu.vy;
                if (rectHit(player, pu)) {
                    pu.alive = false;
                    player.weapon = pu.weapon;
                    setWeaponHUD();
                    addScore(500);
                    toast('SENJATA: ' + (WEAPONS[pu.weapon] || WEAPONS.R).name + '!');
                    playSfx('powerup');
                }
            }
            W.powerups = W.powerups.filter(function (p) { return p.alive; });
        }

        function die(force) {
            if (player.dead) return;
            if (player.cheat) return;
            if (!force) {
                if (player.invuln > 0) return;
                // Easy mode: first hit just downgrades the weapon to Rifle.
                if (gameDiff === 'easy' && player.weapon !== 'R') {
                    player.weapon = 'R'; setWeaponHUD(); player.invuln = 90; playSfx('hit');
                    toast('SENJATA HILANG!'); return;
                }
            }
            player.dead = true; player.deadT = 0; player.vy = -7; playSfx('die');
        }

        function respawn() {
            lives--;
            if (lives <= 0) { lives = startLives(); score = 0; }
            if (player) player.weapon = 'R';
            var atCp = player.x > W.checkpointX && W.checkpointX > 0;
            resetPlayer(atCp);
            player.weapon = 'R'; setWeaponHUD();
            camX = clamp(player.x - VW / 3, 0, W.worldW - VW);
            setHUD();
        }

        function rescueFromPit() {
            var col = Math.floor((player.x + player.w / 2) / TILE);
            function groundTopRow(c) { for (var r = 0; r < ROWS; r++) if (solidAt(c, r)) return r; return -1; }
            var found = -1, fc = col;
            for (var d = 0; d < W.cols; d++) {
                var cf = col + d, cb = col - d;
                if (cf < W.cols) { var rf = groundTopRow(cf); if (rf >= 0) { found = rf; fc = cf; break; } }
                if (cb >= 0) { var rb = groundTopRow(cb); if (rb >= 0) { found = rb; fc = cb; break; } }
            }
            if (found < 0) { found = GROUND_R; fc = col; }
            player.x = fc * TILE; player.y = found * TILE - player.h;
            player.vx = 0; player.vy = 0; player.onGround = true;
        }

        // ============================================================
        // ENEMIES
        // ============================================================
        function enemyFireAt(e, ax, ay) {
            var spd = W.bulletSpd;
            W.ebullets.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: ax * spd, vy: ay * spd, alive: true });
            playSfx(e.kind === 'turret' ? 'turretfire' : 'shoot');
        }
        function tryEnemyShoot(e) {
            if (player.dead || player.win) return;
            var dx = (player.x + player.w / 2) - (e.x + e.w / 2);
            var dy = (player.y + player.h / 2) - (e.y + e.h / 2);
            // only shoot when roughly on screen & facing the player
            if (Math.abs(dx) > VW * 0.7) return;
            e.fireCd--;
            if (e.fireCd > 0) return;
            e.fireCd = W.fireRate + Math.floor(Math.random() * 40);
            if (e.kind === 'sniper') {
                // diagonal-down toward player
                var m = Math.sqrt(dx * dx + dy * dy) || 1;
                enemyFireAt(e, dx / m, Math.max(0.3, dy / m));
            } else if (e.kind === 'turret') {
                var m2 = Math.sqrt(dx * dx + dy * dy) || 1;
                enemyFireAt(e, dx / m2, dy / m2);
            } else {
                enemyFireAt(e, dx < 0 ? -1 : 1, 0); // flat
            }
        }

        function stepEnemies() {
            for (var i = 0; i < W.enemies.length; i++) {
                var e = W.enemies[i];
                if (!e.alive) { if (e.squash > 0) e.squash--; continue; }
                e.t += 0.1;

                if (e.kind === 'turret' || e.kind === 'sniper') {
                    // stationary; just shoot
                    tryEnemyShoot(e);
                } else {
                    e.vy += GRAV; e.vy = Math.min(e.vy, MAX_FALL);
                    e.x += e.vx;
                    var dir = e.vx > 0 ? 1 : -1;
                    var aheadC = Math.floor((e.x + (dir > 0 ? e.w : 0)) / TILE);
                    var midR = Math.floor((e.y + e.h / 2) / TILE);
                    if (solidAt(aheadC, midR)) { e.vx *= -1; e.x += e.vx; }
                    e.y += e.vy;
                    var footR = Math.floor((e.y + e.h) / TILE), cMid = Math.floor((e.x + e.w / 2) / TILE);
                    if (solidAt(cMid, footR)) { e.y = footR * TILE - e.h; e.vy = 0; }
                    // turn at edges (don't walk off ledges) for soldiers
                    if (e.kind === 'soldier' && e.vy === 0) {
                        var aheadFoot = Math.floor((e.x + (dir > 0 ? e.w + 1 : -1)) / TILE);
                        if (!solidAt(aheadFoot, footR + 1)) e.vx *= -1;
                    }
                    if (e.x < 0) { e.x = 0; e.vx *= -1; }
                    if (e.y > ROWS * TILE + 60) e.alive = false;
                    if (e.kind === 'soldier') tryEnemyShoot(e);
                }

                if (player.dead || player.win) continue;
                if (rectHit(player, e)) {
                    if (player.cheat) { killEnemy(e); addScore(100); }
                    else { die(); }
                }
            }

            // player bullets vs enemies / pods / gate / boss
            for (var b = 0; b < W.bullets.length; b++) {
                var bl = W.bullets[b]; if (!bl.alive) continue;
                for (var j = 0; j < W.enemies.length; j++) {
                    var en = W.enemies[j];
                    if (en.alive && !bl.hit[j] && Math.abs(bl.x - (en.x + en.w / 2)) < (en.w / 2 + 4) && Math.abs(bl.y - (en.y + en.h / 2)) < (en.h / 2 + 4)) {
                        en.hp--; bl.hit[j] = true;
                        spawnParticles(bl.x, bl.y, '#ffd24a', 3);
                        if (en.hp <= 0) { killEnemy(en); addScore(150); }
                        else playSfx('enemyhit');
                        if (!bl.pierce) { bl.alive = false; break; }
                    }
                }
                // pods
                for (var p = 0; p < W.pods.length; p++) {
                    var pod = W.pods[p];
                    if (pod.alive && bl.alive && Math.abs(bl.x - (pod.x + pod.w / 2)) < (pod.w / 2 + 4) && Math.abs(bl.y - (pod.y + pod.h / 2)) < (pod.h / 2 + 4)) {
                        breakPod(pod);
                        if (!bl.pierce) { bl.alive = false; }
                    }
                }
                // gate-core
                if (W.gate && W.gate.alive && !W.gate.broken && bl.alive &&
                    bl.x > W.gate.x - 4 && bl.x < W.gate.x + W.gate.w + 4 &&
                    bl.y > W.gate.y && bl.y < W.gate.y + W.gate.h) {
                    hitGate();
                    if (!bl.pierce) bl.alive = false;
                }
                // boss
                if (W.boss && W.boss.alive && bl.alive && W.boss.invuln <= 0 &&
                    Math.abs(bl.x - (W.boss.x + W.boss.w / 2)) < 18 && Math.abs(bl.y - (W.boss.y + W.boss.h / 2)) < 20) {
                    hitBoss(); if (!bl.pierce) bl.alive = false;
                }
            }

            stepBoss();
        }

        function killEnemy(e) {
            e.alive = false; e.squash = 16;
            spawnParticles(e.x + e.w / 2, e.y + e.h / 2, '#ff8a3a', 8);
            playSfx('explosion');
        }

        function rectHit(a, b) {
            return a.x + a.w > b.x + 1 && a.x < b.x + b.w - 1 &&
                a.y + a.h > b.y + 1 && a.y < b.y + b.h - 1;
        }

        function breakPod(pod) {
            pod.alive = false;
            spawnParticles(pod.x + pod.w / 2, pod.y + pod.h / 2, '#9ecbff', 10);
            // always drop a weapon
            var wk = pod.info ? 'S' : POD_WEAPONS[Math.floor(Math.abs(pod.x) / TILE) % POD_WEAPONS.length];
            W.powerups.push({ x: pod.x, y: pod.y, w: 14, h: 14, vx: 0, vy: -1.5, weapon: wk, alive: true, t: 0 });
            if (pod.info) {
                var fresh = unlockInfo(pod.info);
                addScore(300); playSfx('unlock');
                toast('INFO TERBUKA: ' + pod.info.label + '<br><span style="font-size:8px;color:#fac000">Ketuk ikon ▶ untuk membaca</span>', 1900);
            } else {
                addScore(100); playSfx('powerup');
            }
        }

        function stepPods() {
            for (var i = 0; i < W.pods.length; i++) {
                var pod = W.pods[i]; if (!pod.alive) continue;
                pod.t += 0.08;
                // gentle floating bob around baseY
                pod.y = pod.baseY + Math.sin(pod.t) * 6;
            }
        }

        // ---- Gate-core (area boss) ----
        function hitGate() {
            var g = W.gate; if (!g || !g.alive || g.broken) return;
            g.hp--; g.hitFlash = 8; playSfx('gatehit');
            spawnParticles(g.x + g.w / 2, player.y, '#ff8a3a', 4);
            addScore(100);
            if (g.hp <= 0) {
                g.broken = true; W.cleared = true;
                spawnParticles(g.x + g.w / 2, g.y + g.h / 2, '#ffd24a', 24);
                addScore(1000); playSfx('explosion');
                toast('GERBANG HANCUR!<br><span style="font-size:8px;color:#7bd47e">Maju ke ujung ▶</span>', 2000);
            }
        }
        function stepGate() {
            var g = W.gate; if (!g || !g.alive) return;
            g.t++; if (g.hitFlash > 0) g.hitFlash--;
            if (g.broken) return;
            // gate periodically fires a slow aimed shot
            if (player.dead || player.win) return;
            g.fireCd--;
            if (g.fireCd <= 0 && Math.abs((player.x) - g.x) < VW) {
                g.fireCd = Math.max(50, W.fireRate);
                var dx = (player.x + player.w / 2) - (g.x);
                var dy = (player.y + player.h / 2) - (g.y + g.h / 2);
                var m = Math.sqrt(dx * dx + dy * dy) || 1;
                W.ebullets.push({ x: g.x, y: g.y + g.h / 2, vx: dx / m * W.bulletSpd, vy: dy / m * W.bulletSpd, alive: true });
                playSfx('turretfire');
            }
        }

        // ---- Boss ----
        function stepBoss() {
            var b = W.boss; if (!b || !b.alive) return;
            b.t += 1; if (b.invuln > 0) b.invuln--; if (b.hitFlash > 0) b.hitFlash--;
            b.vy += GRAV; b.vy = Math.min(b.vy, MAX_FALL);
            b.x += b.vx; b.y += b.vy;
            var footR = Math.floor((b.y + b.h) / TILE), cMid = Math.floor((b.x + b.w / 2) / TILE);
            if (solidAt(cMid, footR)) { b.y = footR * TILE - b.h; b.vy = 0; }
            // patrol arena before the gate
            var gate = W.bossX || W.gateX;
            var arenaL = gate - 10 * TILE, arenaR = gate - TILE;
            if (b.x < arenaL) { b.x = arenaL; b.vx = Math.abs(b.vx); }
            if (b.x + b.w > arenaR) { b.x = arenaR - b.w; b.vx = -Math.abs(b.vx); }
            // periodic aimed volley
            if (!player.dead && !player.win) {
                b.fireCd--;
                if (b.fireCd <= 0) {
                    b.fireCd = Math.max(40, 90 - b.phase * 16 - (b.lvl || 0) * 10);
                    var dx = (player.x + player.w / 2) - (b.x + b.w / 2);
                    var dy = (player.y + player.h / 2) - (b.y + b.h / 2);
                    var m = Math.sqrt(dx * dx + dy * dy) || 1;
                    for (var s = -1; s <= 1; s++) {
                        var ang = Math.atan2(dy, dx) + s * 0.25;
                        W.ebullets.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: Math.cos(ang) * W.bulletSpd, vy: Math.sin(ang) * W.bulletSpd, alive: true });
                    }
                    playSfx('turretfire');
                }
                if (rectHit(player, b)) { if (player.cheat) { hitBoss(); } else die(); }
            }
        }
        function hitBoss() {
            var b = W.boss; if (!b || !b.alive || b.invuln > 0) return;
            b.hp--; b.invuln = 18; b.hitFlash = 10; playSfx('gatehit');
            spawnParticles(b.x + b.w / 2, b.y, '#fff', 6); addScore(300);
            var newPhase = b.hp > 8 ? 1 : (b.hp > 4 ? 2 : 3);
            if (newPhase !== b.phase) {
                b.phase = newPhase;
                b.vx = (b.vx > 0 ? 1 : -1) * ((b.baseSpd || 0.9) + b.phase * 0.4);
                toast('BOSS PHASE ' + b.phase + '!', 1100);
            }
            if (b.hp <= 0) {
                b.alive = false;
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#ffd24a', 24);
                addScore(3000); playSfx('explosion');
                toast('BOSS KALAH! +3000<br><span style="font-size:8px;color:#ff7ab6">Selamatkan sang putri! ▶</span>', 2200);
            }
        }

        // ============================================================
        // ENEMY BULLETS + PLAYER BULLETS + PARTICLES
        // ============================================================
        function spawnParticles(x, y, color, n) {
            for (var i = 0; i < n; i++) {
                W.particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 2.6, vy: -1 - Math.random() * 2.2,
                    life: 22 + Math.random() * 14, color: color });
            }
        }
        function stepBullets() {
            for (var i = 0; i < W.bullets.length; i++) {
                var b = W.bullets[i]; if (!b.alive) continue;
                b.x += b.vx; b.y += b.vy;
                var c = Math.floor(b.x / TILE), r = Math.floor(b.y / TILE);
                if (!b.pierce && solidAt(c, r)) { b.alive = false; spawnParticles(b.x, b.y, '#ffd24a', 2); }
                if (b.x < camX - 30 || b.x > camX + VW + 60 || b.y < camY - 30 || b.y > camY + VH + 60) b.alive = false;
            }
            W.bullets = W.bullets.filter(function (b) { return b.alive; });

            for (var e = 0; e < W.ebullets.length; e++) {
                var eb = W.ebullets[e]; if (!eb.alive) continue;
                eb.x += eb.vx; eb.y += eb.vy;
                var c2 = Math.floor(eb.x / TILE), r2 = Math.floor(eb.y / TILE);
                if (solidAt(c2, r2)) { eb.alive = false; }
                if (eb.x < camX - 30 || eb.x > camX + VW + 30 || eb.y < camY - 30 || eb.y > camY + VH + 30) eb.alive = false;
                if (eb.alive && !player.dead && !player.win && !player.auto) {
                    if (eb.x > player.x && eb.x < player.x + player.w && eb.y > player.y && eb.y < player.y + player.h) {
                        eb.alive = false; die();
                    }
                }
            }
            W.ebullets = W.ebullets.filter(function (b) { return b.alive; });

            W.particles = W.particles.filter(function (p) { p.life--; p.x += p.vx; p.y += p.vy; p.vy += 0.15; return p.life > 0; });
        }

        // ============================================================
        // AREA CLEAR / WIN / PROGRESSION
        // ============================================================
        function reachGate() {
            player.win = true; player.vx = 0;
            addScore(2000);
            bestScore = Math.max(bestScore, score);
            bestStage = Math.max(bestStage, stageNum);
            persist();
            playSfx('win'); setTimeout(function () { playSfx('stageclear'); }, 400);
            setTimeout(showStageClear, 1100);
        }

        // ---- Boss-stage ending cutscene (rescue the princess) ----
        function stepBossEnding() {
            if (player.win) return;
            var b = W.boss;
            if (!W.ending) W.ending = { phase: 'gate', t: 0 };
            var E = W.ending;
            if (E.phase === 'gate') {
                if (b && b.alive) {
                    if (player.x + player.w >= W.bossX) { player.x = W.bossX - player.w - 2; player.vx = 0; }
                    return;
                }
                E.phase = 'approach';
            }
            if (E.phase === 'approach') {
                if (player.x + player.w >= W.prisonX - TILE) {
                    player.x = W.prisonX - TILE - player.w; player.vx = 0;
                    E.phase = 'free'; E.t = 0; freePrincess();
                }
                return;
            }
            if (E.phase === 'free') {
                player.auto = 'stop'; E.t++;
                if (E.t > 90) { E.phase = 'together'; E.t = 0; toast('Jalan bareng ke titik evakuasi... ♥', 1600); }
                return;
            }
            if (E.phase === 'together') {
                player.auto = 'right';
                if (W.princess) W.princess.escort = true;
                if (player.x + player.w >= W.gateX) {
                    player.x = W.gateX - player.w; player.vx = 0; player.auto = 'stop';
                    E.phase = 'flag'; E.t = 0; bossFinale();
                }
                return;
            }
        }
        function freePrincess() {
            playSfx('powerup'); triggerFlash(20, '#ffe6f0');
            toast('♥ SANG PUTRI BEBAS! ♥', 1800);
            if (W.princess) { W.princess.rescued = true; setTimeout(function () { if (W.princess) W.princess.freed = true; }, 500); }
        }
        function bossFinale() {
            player.win = true; player.vx = 0; completed = true;
            addScore(3000);
            bestScore = Math.max(bestScore, score);
            bestStage = Math.max(bestStage, stageNum);
            INFOS.forEach(function (info) {
                if (!unlocked[info.key]) { unlocked[info.key] = true; var btn = invButtons[info.key]; if (btn) btn.classList.add('is-enabled'); }
            });
            updateViewBtn(); persist(); playSfx('win');
            triggerFlash(46, '#fff3b0'); startFireworks(); fwActive = 320;
            for (var i = 0; i < 6; i++) spawnFirework(camX + 26 + i * (VW - 52) / 5, camY + 28 + (i % 2) * 26);
            playSfx('fanfare'); toast('♥ HAPPILY EVER AFTER ♥', 2400);
            setTimeout(function () { triggerFlash(28, '#ffd84a'); }, 900);
            setTimeout(showWin, 4500);
        }

        // ---- Fireworks ----
        function startFireworks() { fwActive = 240; fireworks = []; }
        function spawnFirework(cx, cy) {
            var cols = ['#ff5a55', '#fac000', '#43b047', '#7aa8ff', '#ff7ab6', '#ffffff'];
            var col = cols[Math.floor((animT + fireworks.length) % cols.length)];
            var n = 16;
            for (var i = 0; i < n; i++) {
                var ang = (Math.PI * 2 * i) / n, spd = 1.4 + (i % 3) * 0.5;
                fireworks.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 36 + (i % 8), color: col });
            }
            playSfx('powerup');
        }
        function stepFireworks() {
            if (fwActive > 0) {
                fwActive--;
                if (fwActive % 22 === 0) spawnFirework(camX + 40 + (animT * 53 % (VW - 80)), camY + 30 + (animT * 31 % 60));
            }
            for (var i = 0; i < fireworks.length; i++) { var p = fireworks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life--; }
            fireworks = fireworks.filter(function (p) { return p.life > 0; });
        }

        function showStageClear() {
            running = false;
            var titleEl = document.getElementById('rc-stage-title');
            var textEl = document.getElementById('rc-stage-text');
            var nextWorld = WORLDS[stageNum];
            if (titleEl) titleEl.textContent = 'AREA ' + (WORLDS[stageNum - 1] || WORLDS[0]).name + ' CLEAR!';
            if (textEl) {
                textEl.innerHTML = 'Skor: <strong>' + score + '</strong><br>' +
                    'Lanjut ke <strong>AREA ' + (nextWorld ? nextWorld.name : '?') + '</strong>' +
                    (nextWorld && nextWorld.biome === 'lair' ? '<br><span style="color:#e52521">⚠ BOSS MENANTI!</span>' : '');
            }
            showOverlay('rc-stageclear');
        }

        function showWin() {
            running = false;
            var winText = document.getElementById('rc-win-text');
            var titleEl = document.querySelector('#rc-win .rc-overlay-pixtitle');
            var groom = val('groom_nickname', 'Mempelai Pria');
            var bride = val('bride_nickname', 'Mempelai Wanita');
            if (titleEl) titleEl.innerHTML = '♥ HAPPY ENDING ♥';
            if (winText) {
                winText.innerHTML =
                    '<div style="color:#ffd24a;font-size:11px;line-height:1.9;margin-bottom:10px">' +
                    'Setelah menembus 8 area penuh bahaya dan mengalahkan sang Boss, ' +
                    'akhirnya <strong>' + esc(groom) + '</strong> berhasil menyelamatkan ' +
                    'sang putri, <strong>' + esc(bride) + '</strong>! 🏰💖</div>' +
                    '<div style="font-size:11px;line-height:1.9;color:rgba(255,255,255,0.9)">' +
                    'Misi terhebat bukanlah mengalahkan musuh, melainkan menemukan ' +
                    'seseorang untuk menjalani semua level kehidupan bersama. 🎆 ' +
                    'Selamat — kini bukalah undangan kami. 🎆</div>' +
                    '<div style="font-size:9px;margin-top:12px;color:rgba(255,255,255,0.6)">' +
                    'Skor ' + score + ' · Terbaik ' + bestScore +
                    (player.cheat ? ' · <span style="color:#e52521">CHEAT</span>' : '') + '</div>';
            }
            showOverlay('rc-win');
        }
        function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

        // ============================================================
        // CAMERA + RENDER
        // ============================================================
        function updateCamera() {
            var target = player.x - VW / 3;
            camX += (target - camX) * 0.16;
            camX = clamp(camX, 0, Math.max(0, W.worldW - VW));
        }

        function shade(hex, f) {
            var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
            if (!m) return hex;
            var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
            function adj(v) { return clamp(Math.round(v + (f > 0 ? (255 - v) * f : v * f)), 0, 255); }
            return 'rgb(' + adj(r) + ',' + adj(g) + ',' + adj(b) + ')';
        }

        // Whether THIS tile is the top of the ground band (surface) — drives the
        // grass/snow cap + cliff face below. (c,r) are tile coords.
        function isSurfaceTile(c, r) {
            return r === GROUND_R && !solidAt(c, r - 1);
        }
        function drawTile(ch, sx, sy, c, r) {
            var B = W.biome, key = W.biomeKey;
            if (ch === '#') {
                var surface = (c !== undefined) ? isSurfaceTile(c, r) : true;
                // base earth body with a subtle vertical shade gradient
                ctx.fillStyle = B.ground; ctx.fillRect(sx, sy, TILE, TILE);
                ctx.fillStyle = shade(B.ground, -0.12); ctx.fillRect(sx, sy + 8, TILE, TILE - 8);
                ctx.fillStyle = shade(B.ground, -0.28); ctx.fillRect(sx, sy + 13, TILE, 3);
                // speckle texture (deterministic by column so it never shimmers)
                ctx.fillStyle = B.groundDark;
                var sp = (c || 0) & 3;
                ctx.fillRect(sx + 2 + sp, sy + 6, 3, 2); ctx.fillRect(sx + 9 - sp, sy + 9, 3, 2);
                ctx.fillRect(sx + 5, sy + 12, 4, 2);
                ctx.fillStyle = shade(B.ground, 0.14);
                ctx.fillRect(sx + 11, sy + 6, 2, 1); ctx.fillRect(sx + 3, sy + 10, 2, 1);

                if (surface) {
                    // biome-specific surface cap
                    if (key === 'snow') {
                        ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, TILE, 5);
                        ctx.fillStyle = '#dfe8f5'; ctx.fillRect(sx, sy + 5, TILE, 2);
                        ctx.fillStyle = '#bfd0e6'; ctx.fillRect(sx + ((c||0)&1?3:9), sy + 5, 3, 1);
                        // little snow lump overhang
                        ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 2, sy - 1, 5, 1); ctx.fillRect(sx + 9, sy - 1, 4, 1);
                    } else if (key === 'baseext' || key === 'innerbase' || key === 'energy' || key === 'lair') {
                        // metal deck plate
                        ctx.fillStyle = shade(B.groundTop, 0.2); ctx.fillRect(sx, sy, TILE, 4);
                        ctx.fillStyle = shade(B.groundTop, 0.5); ctx.fillRect(sx, sy, TILE, 1);
                        ctx.fillStyle = shade(B.groundDark, -0.1); ctx.fillRect(sx, sy + 4, TILE, 1);
                        // rivets
                        ctx.fillStyle = shade(B.groundTop, 0.35);
                        ctx.fillRect(sx + 2, sy + 1, 1, 1); ctx.fillRect(sx + TILE - 3, sy + 1, 1, 1);
                    } else {
                        // grassy/biome cap with sunlit edge + dangling blades
                        ctx.fillStyle = B.groundTop; ctx.fillRect(sx, sy, TILE, 4);
                        ctx.fillStyle = shade(B.groundTop, 0.34); ctx.fillRect(sx, sy, TILE, 1);
                        ctx.fillStyle = shade(B.groundTop, -0.18); ctx.fillRect(sx, sy + 3, TILE, 1);
                        // tufts hanging into the dirt
                        ctx.fillStyle = shade(B.groundTop, -0.05);
                        ctx.fillRect(sx + 2, sy + 4, 1, 2); ctx.fillRect(sx + 7, sy + 4, 1, 3); ctx.fillRect(sx + 12, sy + 4, 1, 2);
                    }
                }
                // tile seams for depth
                ctx.fillStyle = shade(B.ground, -0.32);
                ctx.fillRect(sx + TILE - 1, sy + (surface ? 4 : 0), 1, TILE - (surface ? 4 : 0));
                ctx.fillStyle = shade(B.ground, -0.4); ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
            } else if (ch === 'B') {
                // ammo crate: bevelled wood/metal box with rivets + cross strap
                ctx.fillStyle = '#6f5f2c'; ctx.fillRect(sx, sy, TILE, TILE);                 // body
                ctx.fillStyle = '#8a7838'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);  // inner panel
                ctx.fillStyle = '#a8964a'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, 2);          // top light
                ctx.fillStyle = '#4a3e18'; ctx.fillRect(sx + 1, sy + TILE - 3, TILE - 2, 2);   // bottom shade
                ctx.fillStyle = '#5a4e22';                                                     // diagonal-ish straps
                ctx.fillRect(sx + 1, sy + 7, TILE - 2, 2); ctx.fillRect(sx + 7, sy + 1, 2, TILE - 2);
                ctx.fillStyle = '#3a3020'; ctx.fillRect(sx, sy, TILE, 1); ctx.fillRect(sx, sy, 1, TILE); // hard edges
                ctx.fillStyle = '#caa24a';                                                     // corner rivets
                ctx.fillRect(sx + 2, sy + 2, 1, 1); ctx.fillRect(sx + TILE - 3, sy + 2, 1, 1);
                ctx.fillRect(sx + 2, sy + TILE - 3, 1, 1); ctx.fillRect(sx + TILE - 3, sy + TILE - 3, 1, 1);
                ctx.fillStyle = '#ffd24a'; ctx.fillRect(sx + TILE / 2 - 1, sy + TILE / 2 - 1, 2, 1); // stencil mark
            } else if (ch === 'X') {
                // riveted steel block
                ctx.fillStyle = '#4a4a52'; ctx.fillRect(sx, sy, TILE, TILE);
                ctx.fillStyle = '#6a6a74'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, 2);
                ctx.fillStyle = '#2a2a30'; ctx.fillRect(sx + 1, sy + TILE - 2, TILE - 2, 1);
                ctx.fillStyle = '#5a5a64'; ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
                ctx.fillStyle = '#80808a'; ctx.fillRect(sx + 3, sy + 3, 1, 1); ctx.fillRect(sx + TILE - 4, sy + 3, 1, 1);
                ctx.fillStyle = '#2a2a30'; ctx.fillRect(sx + 3, sy + TILE - 4, 1, 1); ctx.fillRect(sx + TILE - 4, sy + TILE - 4, 1, 1);
            }
        }

        // ---- sprite cache (offscreen, crisp) ----
        var SPR_SS = 3;
        var spriteCache = {}, octx = null;
        function px(x, y, w, h) { octx.fillRect(x, y, (w || 1), (h || 1)); }
        function pc(col) { octx.fillStyle = col; }
        // `pw,ph` = paint-grid size the art is authored in (the offscreen buffer
        // is pw*SPR_SS × ph*SPR_SS, drawn nearest-neighbour). `dispW,dispH`
        // (optional) = the on-screen size to blit at; defaults to the paint size.
        // This lets a sprite be MAGNIFIED on screen (e.g. ×3 commando) while its
        // art is still authored on a small grid — crisp, no art rewrite.
        function getSprite(key, pw, ph, paint, dispW, dispH) {
            var rec = spriteCache[key]; if (rec) return rec;
            var W2 = Math.round(pw * SPR_SS), H2 = Math.round(ph * SPR_SS);
            var cv = document.createElement('canvas'); cv.width = W2; cv.height = H2;
            var prev = octx; octx = cv.getContext('2d'); octx.imageSmoothingEnabled = false;
            paint(W2, H2); octx = prev;
            rec = { cv: cv, vw: dispW || pw, vh: dispH || ph }; spriteCache[key] = rec; return rec;
        }
        function blit(rec, ax, ay, flip) {
            var dw = rec.vw, dh = rec.vh, dx = Math.round(ax), dy = Math.round(ay);
            ctx.imageSmoothingEnabled = false;
            if (flip) { ctx.save(); ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(rec.cv, 0, 0, dw, dh); ctx.restore(); }
            else ctx.drawImage(rec.cv, dx, dy, dw, dh);
        }

        // ---- Commando sprite ----
        // The art is authored on an 18×18 paint grid (P_PW×P_PH). The on-screen
        // sprite is drawn LARGER (×P_SCALE) so the commando reads big without
        // changing the physics hitbox (player.w/h stay 11×14). Only the blit
        // destination size and the anchor offsets scale — the art grid does not.
        var P_PW = 18, P_PH = 18;           // paint grid (art coordinates)
        var P_SCALE = 3;                    // visual magnification of the sprite
        var P_VW = P_PW * P_SCALE, P_VH = P_PH * P_SCALE; // on-screen sprite size
        function paintCommando(Wn, Hn, frame, aimUp) {
            var cx = Math.round(Wn / 2);
            var band = '#e52521', bandDk = '#a81b18';
            var skin = '#ffce9e', skinDk = '#e3a06f';
            var vest = '#2f6a3a', vestHi = '#3f8a4a', vestDk = '#1f4a28';
            var pants = '#3a4a2a', boot = '#2a2014';
            var hair = '#3a2410', gun = '#3a3a44', gunHi = '#6a6a78';

            var isJump = frame === 'jump', isFall = frame === 'fall', isProne = frame === 'prone';
            var hipY = Hn - 18;

            if (isProne) {
                // lying flat, gun forward
                var py = Hn - 16;
                pc(skin); px(cx - 2, py - 2, 6, 5);                 // head
                pc(hair); px(cx - 2, py - 2, 6, 2);
                pc(vest); px(cx - 12, py + 2, 18, 6);               // body horizontal
                pc(vestHi); px(cx - 12, py + 2, 18, 1);
                pc(pants); px(cx - 18, py + 4, 8, 4);               // legs
                pc(boot); px(cx - 20, py + 4, 3, 4);
                pc(gun); px(cx + 4, py + 1, 12, 3);                 // gun forward
                pc(gunHi); px(cx + 4, py + 1, 12, 1);
                return;
            }

            // HEAD with red bandana
            var headTop = 3, hx = cx - 5;
            pc(skin); px(hx, headTop + 3, 10, 8);
            pc(skinDk); px(hx, headTop + 10, 10, 1);
            pc(hair); px(hx, headTop + 3, 2, 7); px(hx + 8, headTop + 3, 2, 7);
            pc(band); px(hx - 1, headTop + 1, 12, 3);              // bandana
            pc(bandDk); px(hx - 1, headTop + 3, 12, 1);
            pc(band); px(hx - 3, headTop + 2, 3, 2);               // bandana tail
            pc('#000'); px(cx + 1, headTop + 5, 2, 2);            // eye
            // TORSO vest
            var shoulder = headTop + 11;
            pc(vest); px(cx - 6, shoulder, 12, hipY - shoulder);
            pc(vestHi); px(cx - 6, shoulder, 2, hipY - shoulder);
            pc(vestDk); px(cx + 4, shoulder, 2, hipY - shoulder);
            pc('#caa24a'); px(cx - 4, shoulder + 2, 8, 1);        // ammo strap
            pc('#caa24a'); px(cx - 5, shoulder + 4, 2, 2); px(cx + 1, shoulder + 5, 2, 2);
            // ARMS + GUN (aim direction)
            pc(skin);
            if (aimUp) {
                px(cx + 3, shoulder - 6, 3, 8);                  // arm up
                pc(gun); px(cx + 2, shoulder - 14, 4, 10);       // gun up
                pc(gunHi); px(cx + 2, shoulder - 14, 1, 10);
            } else {
                px(cx + 4, shoulder + 2, 6, 3);                  // arm forward
                pc(gun); px(cx + 8, shoulder + 1, 12, 4);        // gun forward
                pc(gunHi); px(cx + 8, shoulder + 1, 12, 1);
                pc('#222'); px(cx + 18, shoulder + 1, 2, 4);     // muzzle
            }
            // LEGS
            var legTopY = hipY, legH = Hn - legTopY;
            var lDx = 0, rDx = 0;
            if (frame === 'walk0') { lDx = -3; rDx = 2; }
            else if (frame === 'walk1') { lDx = 2; rDx = -3; }
            else if (isJump) { lDx = -2; rDx = 3; }
            else if (isFall) { lDx = -4; rDx = 4; }
            pc(pants); px(cx - 5 + lDx, legTopY, 5, legH - 3);
            pc(boot); px(cx - 6 + lDx, Hn - 4, 6, 4);
            pc(pants); px(cx + 1 + rDx, legTopY, 5, legH - 3);
            pc(boot); px(cx + rDx, Hn - 4, 6, 4);
        }

        function drawPlayer() {
            if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) return;
            var face = player.face;
            var moving = Math.abs(player.vx) > 0.3 && player.onGround;
            var airborne = !player.onGround;
            var aimUp = keys.up && !player.auto;

            var frameName;
            if (player.prone) frameName = 'prone';
            else if (airborne) frameName = (player.vy > 1.2 ? 'fall' : 'jump');
            else if (moving) frameName = (Math.floor(animT / 7) % 2 ? 'walk1' : 'walk0');
            else frameName = 'idle';

            var key = 'cmd|' + frameName + '|' + (aimUp ? 'u' : 'f');
            var rec = getSprite(key, P_PW, P_PH, function (Wn, Hn) { paintCommando(Wn, Hn, frameName, aimUp); }, P_VW, P_VH);

            var feetWorldY = player.y + player.h;
            var sx = Math.round(player.x - camX - (P_VW - player.w) / 2);
            var sy = Math.round(feetWorldY - P_VH);

            if (!airborne) {
                ctx.fillStyle = 'rgba(0,0,0,0.22)';
                ctx.beginPath(); ctx.ellipse(Math.round(player.x - camX) + player.w / 2, feetWorldY - 1, player.w * 0.62, 2.2, 0, 0, Math.PI * 2); ctx.fill();
            }
            blit(rec, sx, sy, face < 0);
            // muzzle flash — offsets scale with the (now larger) sprite so the
            // flash sits at the gun barrel tip, not inside the body.
            if (player.fireCd > (WEAPONS[player.weapon].cd - 3) && !player.auto) {
                ctx.fillStyle = '#ffe24a';
                var aim = aimVector();
                var mx = Math.round(player.x + player.w / 2 - camX + aim.ax * 22);
                var my = Math.round(player.y + (player.prone ? player.h - 5 : 5) + aim.ay * 18);
                ctx.fillRect(mx - 3, my - 3, 7, 7);
            }
        }

        var _ox = 0, _oy = 0;
        function sp(x, y, w, h) { ctx.fillRect(_ox + x, _oy + y, w, h); }
        function spc(col) { ctx.fillStyle = col; }

        function drawEnemy(e) {
            var sx = Math.round(e.x - camX), sy = Math.round(e.y);
            if (!e.alive) {
                // death puff (fades as squash counts down)
                if (e.squash > 0) {
                    var a = e.squash / 16;
                    ctx.fillStyle = 'rgba(120,110,100,' + (a * 0.6).toFixed(2) + ')';
                    ctx.beginPath(); ctx.arc(sx + e.w / 2, sy + e.h - 2, (16 - e.squash) * 0.6 + 2, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#5a4a2a'; ctx.fillRect(sx + 1, sy + e.h - 2, e.w - 2, 2);
                }
                return;
            }
            // soft contact shadow (skip turret — wall-mounted feel still fine)
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath(); ctx.ellipse(sx + e.w / 2, sy + e.h - 1, e.w * 0.5, 2, 0, 0, Math.PI * 2); ctx.fill();
            _ox = sx; _oy = sy;
            var walk = Math.floor(e.t) % 2;
            if (e.kind === 'soldier' || e.kind === 'runner') {
                var faceR = (e.vx >= 0);                          // facing right?
                var body = e.kind === 'runner' ? '#b83838' : '#6a5a8a';
                var bodyHi = shade(body, 0.22), bodyDk = shade(body, -0.22);
                var helm = e.kind === 'runner' ? '#7a2222' : '#4a4458';
                // torso (uniform) with shaded sides
                spc(bodyDk); sp(2, 4, e.w - 4, e.h - 4);
                spc(body); sp(3, 4, e.w - 6, e.h - 5);
                spc(bodyHi); sp(3, 4, 2, e.h - 5);
                spc('#caa24a'); sp(4, 7, e.w - 8, 1);            // ammo belt
                // head + helmet
                spc('#ffce9e'); sp(4, 1, e.w - 8, 5);            // face
                spc(shade('#ffce9e', -0.2)); sp(4, 5, e.w - 8, 1);
                spc(helm); sp(3, 0, e.w - 6, 3);                 // helmet
                spc(shade(helm, 0.3)); sp(3, 0, e.w - 6, 1);
                spc('#000'); sp(faceR ? e.w - 7 : 4, 2, 2, 2);   // eye toward facing
                // gun on the facing side
                spc('#2a2a32');
                if (faceR) sp(e.w - 4, 6, 6, 2); else sp(-2, 6, 6, 2);
                spc('#5a5a66'); if (faceR) sp(e.w - 4, 6, 6, 1); else sp(-2, 6, 6, 1);
                // marching feet
                spc('#1f1810'); sp(walk ? 2 : 4, e.h - 3, 4, 3); sp(e.w - (walk ? 8 : 6), e.h - 3, 4, 3);
            } else if (e.kind === 'turret') {
                // armoured pillbox + rotating barrel toward player
                spc('#2a2a32'); sp(0, 5, e.w, e.h - 5);          // base block
                spc('#4a4a54'); sp(1, 6, e.w - 2, e.h - 7);
                spc('#6a6a74'); sp(1, 6, e.w - 2, 1);
                spc('#2a2a32'); sp(1, e.h - 3, e.w - 2, 1);      // bolt row
                spc('#3a3a44'); sp(3, 0, e.w - 6, 6);            // dome
                spc('#5a5a66'); sp(3, 0, e.w - 6, 1);
                var aimR = (player && player.x > e.x);
                spc('#7aa8ff'); sp(aimR ? e.w - 9 : 4, 2, 3, 2); // sensor lens toward player
                spc('#fff'); sp(aimR ? e.w - 8 : 5, 2, 1, 1);
                spc('#2a2a32'); if (aimR) sp(e.w - 2, 2, 6, 3); else sp(-4, 2, 6, 3); // barrel
                spc('#1a1a20'); if (aimR) sp(e.w + 2, 3, 2, 1); else sp(-4, 3, 2, 1);  // muzzle
            } else if (e.kind === 'sniper') {
                var aimR2 = (player && player.x > e.x);
                spc('#1f2a36'); sp(2, 2, e.w - 4, e.h - 2);       // ghillie torso
                spc('#2a3a4a'); sp(3, 3, e.w - 6, e.h - 4);
                spc('#3a4e5e'); sp(3, 3, 2, e.h - 4);
                spc('#4a6a3a'); sp(3, e.h - 4, e.w - 6, 2);       // camo flecks
                spc('#ffce9e'); sp(4, 0, e.w - 8, 4);            // face
                spc('#2a3a2a'); sp(3, 0, e.w - 6, 2);            // hood
                spc('#000'); sp(aimR2 ? e.w - 7 : 4, 1, 2, 2);
                spc('#2a2a32'); if (aimR2) sp(e.w - 5, 5, 9, 2); else sp(-4, 5, 9, 2); // long rifle
                spc('#7aa8ff'); if (aimR2) sp(e.w - 1, 4, 2, 1); else sp(-1, 4, 2, 1);  // scope glint
            }
            _ox = 0; _oy = 0;
        }

        function drawPod(pod) {
            if (!pod.alive) return;
            var sx = Math.round(pod.x - camX), sy = Math.round(pod.y);
            var cxp = sx + pod.w / 2, cyp = sy + pod.h / 2;
            // pulsing outer glow halo
            var glow = 0.3 + Math.abs(Math.sin(pod.t)) * 0.3;
            var halo = pod.info ? '255,210,74' : '150,200,255';
            ctx.fillStyle = 'rgba(' + halo + ',' + glow.toFixed(2) + ')';
            ctx.beginPath(); ctx.arc(cxp, cyp, pod.w * 0.95, 0, Math.PI * 2); ctx.fill();
            // metal capsule shell (rounded) with rim + bolts
            ctx.fillStyle = '#0a1a2a'; ctx.fillRect(sx, sy, pod.w, pod.h);
            ctx.fillStyle = '#243a52'; ctx.fillRect(sx, sy, pod.w, 3);                 // top rim light
            ctx.fillStyle = '#06121e'; ctx.fillRect(sx, sy + pod.h - 3, pod.w, 3);     // bottom shade
            // glowing core window
            var core = pod.info ? '#ffd24a' : '#9ecbff';
            ctx.fillStyle = core; ctx.fillRect(sx + 3, sy + 3, pod.w - 6, pod.h - 6);
            ctx.fillStyle = shade(core, 0.4); ctx.fillRect(sx + 4, sy + 4, 4, 2);      // specular
            ctx.fillStyle = shade(core, -0.25); ctx.fillRect(sx + 3, sy + pod.h - 5, pod.w - 6, 2);
            // corner bolts
            ctx.fillStyle = '#5a7088';
            ctx.fillRect(sx + 1, sy + 1, 1, 1); ctx.fillRect(sx + pod.w - 2, sy + 1, 1, 1);
            ctx.fillRect(sx + 1, sy + pod.h - 2, 1, 1); ctx.fillRect(sx + pod.w - 2, sy + pod.h - 2, 1, 1);
            // glyph
            ctx.fillStyle = '#1a1a1a';
            ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(pod.info ? '?' : '!', cxp, cyp + 1);
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }

        function drawPowerup(pu) {
            var sx = Math.round(pu.x - camX), sy = Math.round(pu.y);
            var cxp = sx + pu.w / 2, cyp = sy + pu.h / 2;
            // colour-matched glow per weapon letter
            var gc = { S: '255,90,60', M: '120,200,120', L: '120,180,255', F: '255,150,40' }[pu.weapon] || '255,210,74';
            var glowA = 0.25 + Math.abs(Math.sin(pu.t * 0.18)) * 0.25;
            ctx.fillStyle = 'rgba(' + gc + ',' + glowA.toFixed(2) + ')';
            ctx.beginPath(); ctx.arc(cxp, cyp, pu.w * 1.0, 0, Math.PI * 2); ctx.fill();
            // capsule body (red Contra power-up) with bevel + white window
            ctx.fillStyle = '#a81b18'; ctx.fillRect(sx, sy, pu.w, pu.h);
            ctx.fillStyle = '#e52521'; ctx.fillRect(sx, sy, pu.w, pu.h - 2);
            ctx.fillStyle = '#ff7a76'; ctx.fillRect(sx + 1, sy + 1, pu.w - 2, 2);      // top sheen
            ctx.fillStyle = '#fff'; ctx.fillRect(sx + 2, sy + 3, pu.w - 4, pu.h - 6);  // letter window
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(pu.weapon, cxp, cyp + 1);
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }

        function drawGate() {
            var g = W.gate; if (!g || !g.alive) return;
            var sx = Math.round(g.x - camX);
            if (sx < -40 || sx > VW + 40) return;
            var flash = g.hitFlash > 0;
            // armoured pillar: panelled metal with rivet rows + bevel edges
            ctx.fillStyle = flash ? '#fff' : (g.broken ? '#2e2230' : '#5a4a5a');
            ctx.fillRect(sx, g.y, g.w, g.h);
            ctx.fillStyle = flash ? '#fff' : shade(g.broken ? '#2e2230' : '#5a4a5a', 0.3);
            ctx.fillRect(sx, g.y, 3, g.h);                                             // left highlight
            ctx.fillStyle = flash ? '#fff' : shade(g.broken ? '#2e2230' : '#5a4a5a', -0.3);
            ctx.fillRect(sx + g.w - 3, g.y, 3, g.h);                                   // right shade
            // horizontal panel seams + rivets
            if (!flash) {
                ctx.fillStyle = shade('#5a4a5a', -0.35);
                for (var py = g.y + 8; py < g.y + g.h - 4; py += 14) {
                    ctx.fillRect(sx + 1, py, g.w - 2, 1);
                    ctx.fillStyle = '#7a6a7a'; ctx.fillRect(sx + 2, py + 1, 1, 1); ctx.fillRect(sx + g.w - 3, py + 1, 1, 1);
                    ctx.fillStyle = shade('#5a4a5a', -0.35);
                }
            }
            // core orb
            var cy = g.y + g.h * 0.4;
            if (!g.broken) {
                var pulse = 0.5 + 0.4 * Math.sin(g.t * 0.2);
                ctx.fillStyle = 'rgba(255,140,40,0.4)'; ctx.beginPath(); ctx.arc(sx + g.w / 2, cy, 13, 0, Math.PI * 2); ctx.fill(); // outer glow
                ctx.fillStyle = 'rgba(255,90,40,' + pulse.toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(sx + g.w / 2, cy, 9, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(sx + g.w / 2, cy, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx + g.w / 2 - 1, cy - 1, 1.5, 0, Math.PI * 2); ctx.fill();
                // socket ring
                ctx.strokeStyle = '#3a2a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + g.w / 2, cy, 11, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
                // HP pips
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 2, g.y - 8, g.w + 4, 5);
                for (var i = 0; i < g.hp; i++) { ctx.fillStyle = '#e52521'; ctx.fillRect(sx + 1 + i * 3, g.y - 7, 2, 3); }
            } else {
                ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(sx + g.w / 2, cy, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(120,40,20,0.5)'; ctx.beginPath(); ctx.arc(sx + g.w / 2, cy, 9, 0, Math.PI * 2); ctx.fill();
            }
        }

        function drawBoss() {
            var b = W.boss; if (!b || !b.alive) return;
            var sx = Math.round(b.x - camX), sy = Math.round(b.y);
            var flash = b.hitFlash > 0;
            ctx.save();
            if (b.invuln > 0 && Math.floor(b.invuln / 3) % 2 === 0) ctx.globalAlpha = 0.6;
            var body = flash ? '#fff' : '#5a4a6a', bodyDk = flash ? '#fff' : '#3a2a4a';
            // shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath(); ctx.ellipse(sx + b.w / 2, sy + b.h - 1, b.w * 0.55, 3, 0, 0, Math.PI * 2); ctx.fill();
            // mech torso with bevel + panel lines
            ctx.fillStyle = body; ctx.fillRect(sx, sy + 8, b.w, b.h - 8);
            ctx.fillStyle = flash ? '#fff' : shade('#5a4a6a', 0.22); ctx.fillRect(sx, sy + 8, 3, b.h - 8);
            ctx.fillStyle = bodyDk; ctx.fillRect(sx + 2, sy + 10, b.w - 4, b.h - 12);
            ctx.fillStyle = flash ? '#fff' : shade('#3a2a4a', 0.3);
            ctx.fillRect(sx + 4, sy + 14, b.w - 8, 1); ctx.fillRect(sx + 4, sy + 22, b.w - 8, 1); // panel seams
            // chest reactor light
            if (!flash) { var rp = 0.5 + 0.4 * Math.sin(b.t * 0.18); ctx.fillStyle = 'rgba(255,120,40,' + rp.toFixed(2) + ')'; ctx.fillRect(sx + b.w / 2 - 3, sy + 16, 6, 6); ctx.fillStyle = '#ffd24a'; ctx.fillRect(sx + b.w / 2 - 1, sy + 18, 2, 2); }
            // head/cockpit
            ctx.fillStyle = flash ? '#fff' : '#6a5a7a'; ctx.fillRect(sx + 6, sy, b.w - 12, 12);
            ctx.fillStyle = flash ? '#fff' : shade('#6a5a7a', 0.3); ctx.fillRect(sx + 6, sy, b.w - 12, 2);
            // angry eye visor (pulses)
            var ep = 0.6 + 0.4 * Math.sin(b.t * 0.25);
            ctx.fillStyle = 'rgba(255,90,85,' + ep.toFixed(2) + ')'; ctx.fillRect(sx + 9, sy + 3, b.w - 18, 4);
            ctx.fillStyle = '#fff'; ctx.fillRect(sx + 10, sy + 4, 2, 2);
            // horns
            ctx.fillStyle = flash ? '#fff' : '#2a2034'; ctx.fillRect(sx + 5, sy - 3, 3, 4); ctx.fillRect(sx + b.w - 8, sy - 3, 3, 4);
            // arm cannons with muzzle
            ctx.fillStyle = flash ? '#fff' : '#2a2034'; ctx.fillRect(sx - 5, sy + 14, 7, 9); ctx.fillRect(sx + b.w - 2, sy + 14, 7, 9);
            ctx.fillStyle = '#1a1420'; ctx.fillRect(sx - 5, sy + 18, 3, 3); ctx.fillRect(sx + b.w + 2, sy + 18, 3, 3);
            // legs/feet
            ctx.fillStyle = flash ? '#fff' : '#2a2034'; ctx.fillRect(sx + 2, sy + b.h - 5, 9, 5); ctx.fillRect(sx + b.w - 11, sy + b.h - 5, 9, 5);
            ctx.fillStyle = flash ? '#fff' : shade('#2a2034', 0.4); ctx.fillRect(sx + 2, sy + b.h - 5, 9, 1); ctx.fillRect(sx + b.w - 11, sy + b.h - 5, 9, 1);
            ctx.restore();
            // HP bar (framed)
            ctx.fillStyle = '#000'; ctx.fillRect(sx - 2, sy - 11, b.w + 4, 7);
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(sx - 1, sy - 10, b.w + 2, 5);
            var frac = b.hp / b.maxhp;
            ctx.fillStyle = frac > 0.5 ? '#43b047' : (frac > 0.25 ? '#fac000' : '#e52521');
            ctx.fillRect(sx, sy - 9, Math.round(b.w * frac), 4);
        }

        // ---- Princess (reuse simplified) ----
        var PR_VW = 16, PR_VH = 22;
        function paintPrincess(Wn, Hn) {
            var cx = Wn / 2;
            var hairC = '#f4cf5a', skin = '#ffd9b8', gown = '#ffffff', gownDk = '#d4d8e6';
            var headTop = 8;
            pc('#ffd84a'); px(cx - 8, headTop - 5, 16, 4); px(cx - 2, headTop - 9, 4, 5);
            pc('#ff5a55'); px(cx - 1, headTop - 7, 3, 3);
            pc(hairC); px(cx - 9, headTop - 1, 18, 9); px(cx - 11, headTop + 2, 3, 16); px(cx + 8, headTop + 2, 3, 16);
            pc(skin); px(cx - 7, headTop + 6, 14, 9);
            pc('#3a6ad6'); px(cx - 4, headTop + 9, 2, 3); px(cx + 3, headTop + 9, 2, 3);
            pc('#e0508f'); px(cx - 2, headTop + 13, 5, 1);
            var gTop = headTop + 16, gBot = Hn - 2;
            pc(gown);
            for (var yy = gTop; yy < gBot; yy++) { var t = (yy - gTop) / (gBot - gTop); var halfw = 5 + t * 11; px(cx - halfw, yy, halfw * 2, 1); }
            pc(gownDk); for (var y3 = gTop; y3 < gBot; y3++) { var t3 = (y3 - gTop) / (gBot - gTop); px(cx + (5 + t3 * 11) - 3, y3, 3, 1); }
            pc('#ffd84a'); px(cx - 6, gTop, 12, 2);
        }
        function drawPrincess() {
            var pr = W.princess; if (!pr) return;
            pr.t++;
            if (pr.escort) {
                var follow = player.x - TILE * 1.6;
                if (pr.x < follow) pr.x += Math.min(1.6, follow - pr.x);
                else if (pr.x > follow + 2) pr.x -= Math.min(1.6, pr.x - follow);
                pr.face = 1;
            } else if (pr.freed && pr.x > W.prisonX - TILE * 2) { pr.x -= 0.6; pr.face = -1; }
            var bob = pr.rescued ? Math.round(Math.sin(pr.t * 0.18) * 2) : 0;
            var sx = Math.round(pr.x - camX - (PR_VW - pr.w) / 2);
            var sy = Math.round(pr.y - (PR_VH - pr.h)) + bob;
            if (sx < -24 || sx > VW + 24) return;
            var rec = getSprite('princess', PR_VW, PR_VH, function (Wn, Hn) { paintPrincess(Wn, Hn); });
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.ellipse(Math.round(pr.x - camX) + pr.w / 2, Math.round(pr.y) + pr.h - 1, 9, 2.4, 0, 0, Math.PI * 2); ctx.fill();
            blit(rec, sx, sy, pr.face === 1);
        }

        function drawPrison() {
            if (!W.prisonX) return;
            var pr = W.princess;
            var px0 = Math.round(W.prisonX - camX);
            if (px0 < -80 || px0 > VW + 60) return;
            var floorY = GROUND_R * TILE;
            var cellW = 52, cellH = 56, cellTop = floorY - cellH;
            ctx.fillStyle = '#1a1322'; ctx.fillRect(px0 - 6, cellTop - 6, cellW + 12, cellH + 6);
            ctx.fillStyle = '#0d0a14'; ctx.fillRect(px0, cellTop, cellW, cellH);
            ctx.fillStyle = '#6a6a78'; ctx.fillRect(px0 - 6, cellTop - 6, cellW + 12, 6);
            ctx.fillStyle = '#4a4a58'; ctx.fillRect(px0 - 6, cellTop - 6, 6, cellH + 6); ctx.fillRect(px0 + cellW, cellTop - 6, 6, cellH + 6);
            var swing = (pr && pr.rescued) ? 18 : 0;
            ctx.fillStyle = '#9aa0ab';
            for (var i = 0; i < 5; i++) {
                var bx = px0 + 6 + i * 10;
                if (swing && i < 2) bx -= swing; else if (swing && i > 2) bx += swing; else if (swing && i === 2) continue;
                ctx.fillRect(bx, cellTop, 3, cellH);
            }
        }

        function render() {
            var B = W.biome;
            var grd = ctx.createLinearGradient(0, 0, 0, VH);
            grd.addColorStop(0, B.sky[0]); grd.addColorStop(1, B.sky[1]);
            ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);

            drawClouds();

            ctx.save();
            ctx.translate(0, -camY);

            drawBackdrop();
            drawScenery();

            var c0 = Math.floor(camX / TILE), c1 = c0 + COLS_VIS + 2;
            // deep ground fill (with faint earth striations for texture)
            var deepTop = (GROUND_R + 2) * TILE, deepBottom = camY + VH + TILE;
            for (var dc = c0; dc <= c1; dc++) {
                if (dc < 0 || dc >= W.cols) continue;
                var hasFloor = W.grid[dc][GROUND_R] === '#' || W.grid[dc][GROUND_R + 1] === '#';
                if (!hasFloor) continue;
                var dsx = Math.round(dc * TILE - camX);
                ctx.fillStyle = shade(B.ground, -0.32);
                ctx.fillRect(dsx, deepTop, TILE, deepBottom - deepTop);
                ctx.fillStyle = shade(B.ground, -0.45);
                for (var dy = deepTop + 6; dy < deepBottom; dy += 13) ctx.fillRect(dsx + ((dc % 2) ? 3 : 8), dy, 5, 2);
            }
            for (var c = c0; c <= c1; c++) {
                if (c < 0 || c >= W.cols) continue;
                var sx = c * TILE - camX;
                for (var r = 0; r < ROWS; r++) {
                    var ch = W.grid[c][r];
                    if (ch !== ' ') drawTile(ch, Math.round(sx), r * TILE, c, r);
                }
            }

            drawDecor();   // ground-level props (grass/trees/snow/crystals)

            // lava glow band with bubbling pops (energy/lair biomes)
            if (B.lava) {
                var lavaTop = camY + VH - 10;
                var pulse = 0.5 + 0.18 * Math.sin(animT * 0.12);
                ctx.fillStyle = 'rgba(180,40,10,0.9)'; ctx.fillRect(0, lavaTop, VW, 10);
                ctx.fillStyle = 'rgba(255,90,20,' + pulse.toFixed(2) + ')'; ctx.fillRect(0, lavaTop, VW, 5);
                ctx.fillStyle = 'rgba(255,180,60,' + (pulse + 0.1).toFixed(2) + ')';
                for (var lb = 0; lb < 12; lb++) {
                    var lx = ((lb * 41 + animT * 0.6) % VW);
                    var pop = Math.abs(Math.sin(animT * 0.1 + lb));
                    ctx.fillRect(lx, lavaTop - pop * 4, 3, 2 + pop * 3);
                }
                ctx.fillStyle = 'rgba(255,230,140,0.7)';
                for (var lg = 0; lg < 6; lg++) { var gx = ((lg * 70 - animT * 0.4) % VW + VW) % VW; ctx.fillRect(gx, lavaTop + 1, 6, 1); }
            }

            for (var pi = 0; pi < W.pods.length; pi++) { var pod = W.pods[pi]; if (pod.x > camX - 24 && pod.x < camX + VW + 24) drawPod(pod); }
            for (var pu = 0; pu < W.powerups.length; pu++) drawPowerup(W.powerups[pu]);
            for (var e = 0; e < W.enemies.length; e++) { var en = W.enemies[e]; if (en.x > camX - 24 && en.x < camX + VW + 24) drawEnemy(en); }

            drawGate();
            if (W.isBoss) { drawPrison(); drawBoss(); drawPrincess(); }

            // player bullets — glowing core + short motion trail
            for (var b = 0; b < W.bullets.length; b++) {
                var bl = W.bullets[b];
                var bx = Math.round(bl.x - camX), by = Math.round(bl.y);
                var core = bl.fire ? '#ff8a1e' : (bl.big ? '#bfe0ff' : '#ffe24a');
                var halo = bl.fire ? '255,138,30' : (bl.big ? '150,200,255' : '255,210,74');
                // trail behind the travel direction
                ctx.fillStyle = 'rgba(' + halo + ',0.35)';
                ctx.fillRect(bx - Math.sign(bl.vx) * 4 - 1, by - 1, 3, 3);
                // glow
                ctx.fillStyle = 'rgba(' + halo + ',0.4)';
                ctx.beginPath(); ctx.arc(bx, by, (bl.big ? 5 : 4), 0, Math.PI * 2); ctx.fill();
                // core
                var s = bl.big ? 5 : 3;
                ctx.fillStyle = core; ctx.fillRect(bx - s / 2, by - s / 2, s, s);
                ctx.fillStyle = '#fff'; ctx.fillRect(bx - 1, by - 1, 1, 1);
            }
            // enemy bullets — red plasma with a hot centre
            for (var eb = 0; eb < W.ebullets.length; eb++) {
                var e2 = W.ebullets[eb];
                var ex = Math.round(e2.x - camX), ey = Math.round(e2.y);
                ctx.fillStyle = 'rgba(255,90,85,0.4)'; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ff5a55'; ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffd0a0'; ctx.fillRect(ex - 1, ey - 1, 1, 1);
            }
            for (var pa = 0; pa < W.particles.length; pa++) { var ptl = W.particles[pa]; ctx.fillStyle = ptl.color; ctx.fillRect(Math.round(ptl.x - camX), Math.round(ptl.y), 3, 3); }

            drawPlayer();

            for (var fwI = 0; fwI < fireworks.length; fwI++) {
                var fp = fireworks[fwI];
                ctx.globalAlpha = Math.max(0, fp.life / 40);
                ctx.fillStyle = fp.color;
                ctx.fillRect(Math.round(fp.x - camX), Math.round(fp.y), 3, 3);
            }
            ctx.globalAlpha = 1;

            ctx.restore();

            if (flash.t > 0) {
                var fr = flash.t / flash.max;
                ctx.fillStyle = flash.col; ctx.globalAlpha = Math.min(0.85, fr * 0.9);
                ctx.fillRect(0, 0, VW, VH);
                ctx.globalAlpha = Math.min(0.6, fr); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
                var rad = (1 - fr) * (VW * 0.7);
                ctx.beginPath(); ctx.arc(VW / 2, VH / 2, rad, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 1; ctx.lineWidth = 1; flash.t--;
            }
        }

        // FAR BACKDROP — deepest, slowest parallax: an atmospheric haze band +
        // a biome silhouette (mountains / base skyline / cavern wall) so each
        // area feels like it has distance behind it. Drawn first.
        function drawBackdrop() {
            var B = W.biome, key = W.biomeKey;
            var horizon = GROUND_R * TILE;
            var dark = (key === 'innerbase' || key === 'energy' || key === 'lair');
            // haze band above the horizon for depth
            ctx.fillStyle = shade(B.hills, dark ? -0.3 : 0.4);
            ctx.globalAlpha = 0.3; ctx.fillRect(0, horizon - 64, VW, 64); ctx.globalAlpha = 1;

            function wrapX(i, span, par) {
                var wrap = W.worldW + span;
                var x = ((i * span - camX * par) % wrap); if (x < -span) x += wrap; return x;
            }
            if (key === 'jungle' || key === 'bridge' || key === 'snow') {
                // distant mountain range (pale) + caps
                var far = shade(B.hills, key === 'snow' ? 0.5 : 0.46);
                ctx.fillStyle = far;
                for (var i = 0; i < 8; i++) {
                    var mx = wrapX(i, 200, 0.1), b = horizon - 4;
                    ctx.beginPath(); ctx.moveTo(mx, b); ctx.lineTo(mx + 100, b - 78); ctx.lineTo(mx + 200, b); ctx.closePath(); ctx.fill();
                }
                ctx.fillStyle = '#ffffff';   // snow/light caps
                for (var s2 = 0; s2 < 8; s2++) {
                    var cx2 = wrapX(s2, 200, 0.1) + 100, cy2 = horizon - 4 - 78;
                    ctx.beginPath(); ctx.moveTo(cx2 - 9, cy2 + 16); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2 + 9, cy2 + 16); ctx.closePath(); ctx.fill();
                }
            } else if (key === 'baseext' || key === 'innerbase') {
                // far military base skyline: wall + towers + lit windows
                ctx.fillStyle = shade(B.ground, -0.06); ctx.fillRect(0, horizon - 56, VW, 56);
                for (var cr = 0; cr < VW; cr += 18) { ctx.fillStyle = shade(B.ground, -0.06); ctx.fillRect(cr, horizon - 62, 9, 8); }
                for (var tw = 0; tw < 6; tw++) {
                    var tx = wrapX(tw, 200, 0.12) + 60;
                    ctx.fillStyle = shade(B.ground, -0.14); ctx.fillRect(tx, horizon - 92, 26, 92); ctx.fillRect(tx - 4, horizon - 98, 34, 8);
                    ctx.fillStyle = 'rgba(255,170,60,0.5)'; ctx.fillRect(tx + 10, horizon - 76, 6, 8);
                }
            } else {
                // energy/lair: jagged dark cavern wall + glow pockets
                ctx.fillStyle = shade(B.ground, 0.06);
                for (var j = 0; j < 10; j++) {
                    var jx = wrapX(j, 150, 0.12), jb = horizon + 6;
                    ctx.beginPath(); ctx.moveTo(jx, jb); ctx.lineTo(jx + 75, jb - 60); ctx.lineTo(jx + 150, jb); ctx.closePath(); ctx.fill();
                }
                ctx.fillStyle = 'rgba(255,120,40,0.10)';
                for (var gp = 0; gp < 5; gp++) { var px3 = ((gp * 240 - camX * 0.12) % VW + VW) % VW; ctx.beginPath(); ctx.arc(px3, horizon - 50, 28, 0, Math.PI * 2); ctx.fill(); }
            }
        }

        function drawScenery() {
            var B = W.biome, key = W.biomeKey;
            var hillBase = GROUND_R * TILE;
            // back layer (darker, medium parallax)
            ctx.fillStyle = shade(B.hills, -0.16);
            for (var h2 = 0; h2 < 12; h2++) {
                var bx = ((h2 * 150 - camX * 0.3) % (W.worldW + 200)); if (bx < -200) bx += (W.worldW + 200);
                ctx.beginPath(); ctx.moveTo(bx, hillBase); ctx.arc(bx + 42, hillBase, 42, Math.PI, 0); ctx.closePath(); ctx.fill();
            }
            // front hills (full colour) with sun highlight + shaded flank + flavour
            for (var h = 0; h < 10; h++) {
                var hx = ((h * 180 - camX * 0.42) % (W.worldW + 180)); if (hx < -180) hx += (W.worldW + 180);
                ctx.fillStyle = B.hills;
                ctx.beginPath(); ctx.moveTo(hx, hillBase); ctx.arc(hx + 30, hillBase, 30, Math.PI, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = shade(B.hills, 0.22);
                ctx.beginPath(); ctx.arc(hx + 22, hillBase - 6, 9, Math.PI, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = shade(B.hills, -0.18);
                ctx.beginPath(); ctx.arc(hx + 40, hillBase - 3, 6, Math.PI, 0); ctx.closePath(); ctx.fill();
                if (key === 'jungle' || key === 'bridge') {
                    // layered palm: trunk + 3 fronds
                    var px = hx + 28, ph = 44;
                    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(px - 1, hillBase - ph, 4, ph);
                    ctx.fillStyle = shade(B.hills, 0.16);
                    ctx.beginPath(); ctx.ellipse(px - 8, hillBase - ph, 10, 4, -0.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(px + 9, hillBase - ph, 10, 4, 0.5, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(px, hillBase - ph - 4, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#caa24a'; ctx.fillRect(px - 1, hillBase - ph - 2, 3, 2); // coconuts
                } else if (key === 'snow') {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath(); ctx.arc(hx + 30, hillBase - 26, 8, Math.PI, 0); ctx.closePath(); ctx.fill(); // snowy crown
                }
            }
        }

        function drawClouds() {
            var B = W.biome, key = W.biomeKey;
            // soft layered clouds with a lit top edge
            for (var cl = 0; cl < 7; cl++) {
                var clx = ((cl * 150 + 40 - camX * 0.22) % (VW + 240)) - 90;
                var cly = 14 + (cl % 4) * 16;
                ctx.fillStyle = B.clouds;
                ctx.beginPath();
                ctx.arc(clx + 12, cly + 4, 9, 0, Math.PI * 2); ctx.arc(clx + 24, cly + 6, 7, 0, Math.PI * 2);
                ctx.arc(clx + 4, cly + 7, 6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = shade((/^#/.test(B.clouds) ? B.clouds : '#ffffff'), 0.3);
                ctx.fillRect(clx + 6, cly - 1, 16, 1);
                ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(clx + 2, cly + 12, 24, 2);
            }
            if (key === 'snow') {
                // falling snow flecks (screen space)
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                for (var sf = 0; sf < 26; sf++) {
                    var fx = (sf * 53 + animT * 0.6) % VW;
                    var fy = (sf * 37 + animT * (0.8 + (sf % 3) * 0.3)) % VH;
                    ctx.fillRect(fx, fy, 1 + (sf % 2), 1 + (sf % 2));
                }
            }
        }

        // GROUND-LEVEL DECOR — small per-biome props anchored to the surface,
        // placed deterministically by world column so they never flicker. Drawn
        // in world space (under the camY translate). Cosmetic only.
        function drawDecor() {
            var B = W.biome, key = W.biomeKey;
            var gy = GROUND_R * TILE;
            var step = 28;
            var first = Math.floor((camX - step) / step) * step;
            var last = camX + VW + step;
            for (var wx = first; wx <= last; wx += step) {
                var sxp = Math.round(wx - camX);
                var col = Math.floor(wx / TILE);
                // only place on solid surface columns (not over pits)
                if (col < 0 || col >= W.cols || !(W.grid[col] && (W.grid[col][GROUND_R] === '#'))) continue;
                if (solidAt(col, GROUND_R - 1)) continue; // skip under crates/walls
                var seed = (Math.floor(wx / step) * 2654435761) >>> 0;
                var v = (seed % 100) / 100, v2 = ((seed >> 8) % 100) / 100;

                if (key === 'jungle' || key === 'bridge') {
                    if (v < 0.4) { // grass blades + flower
                        var sway = Math.sin(animT * 0.05 + wx * 0.3);
                        ctx.fillStyle = shade(B.groundTop, 0.2);
                        ctx.fillRect(sxp + 2 + sway, gy - 5, 1, 5); ctx.fillRect(sxp + 5 - sway, gy - 3, 1, 3); ctx.fillRect(sxp + 8 + sway, gy - 6, 1, 6);
                        if (v2 < 0.4) { ctx.fillStyle = ['#ff5a8a','#ffd84a','#ff9ec4'][(seed >> 3) % 3]; ctx.fillRect(sxp + 4, gy - 7, 2, 2); ctx.fillStyle = '#2f8a33'; ctx.fillRect(sxp + 4, gy - 5, 1, 3); }
                    } else if (v < 0.6) { // bush
                        ctx.fillStyle = shade(B.hills, -0.05);
                        ctx.beginPath(); ctx.arc(sxp + 8, gy, 7, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(sxp + 16, gy, 5, Math.PI, 0); ctx.fill();
                        ctx.fillStyle = shade(B.hills, 0.2); ctx.beginPath(); ctx.arc(sxp + 6, gy - 2, 2, Math.PI, 0); ctx.fill();
                    } else if (v < 0.72) { // rock
                        ctx.fillStyle = '#7a7068'; ctx.beginPath(); ctx.arc(sxp + 9, gy, 4, Math.PI, 0); ctx.fill();
                        ctx.fillStyle = '#9a9088'; ctx.beginPath(); ctx.arc(sxp + 7, gy - 1, 2, Math.PI, 0); ctx.fill();
                    }
                } else if (key === 'snow') {
                    if (v < 0.3) { // pine
                        var ph = 20 + (seed % 10);
                        ctx.fillStyle = '#3a2a16'; ctx.fillRect(sxp + 8, gy - 4, 2, 4);
                        ctx.fillStyle = '#1f5e33';
                        ctx.beginPath(); ctx.moveTo(sxp + 9, gy - ph); ctx.lineTo(sxp + 2, gy - 4); ctx.lineTo(sxp + 16, gy - 4); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = '#ffffff'; ctx.fillRect(sxp + 6, gy - ph * 0.5, 6, 1);
                    } else if (v < 0.55) { // snow mound
                        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sxp + 9, gy, 6, Math.PI, 0); ctx.fill();
                        ctx.fillStyle = '#dfe8f5'; ctx.beginPath(); ctx.arc(sxp + 12, gy, 3, Math.PI, 0); ctx.fill();
                    }
                } else if (key === 'baseext' || key === 'innerbase') {
                    if (v < 0.3) { // barrel
                        ctx.fillStyle = '#3a5a2a'; ctx.fillRect(sxp + 5, gy - 12, 8, 12);
                        ctx.fillStyle = '#4a7a36'; ctx.fillRect(sxp + 5, gy - 12, 2, 12);
                        ctx.fillStyle = '#2a3a18'; ctx.fillRect(sxp + 5, gy - 9, 8, 1); ctx.fillRect(sxp + 5, gy - 4, 8, 1);
                        ctx.fillStyle = '#ffd24a'; ctx.fillRect(sxp + 8, gy - 8, 2, 2);
                    } else if (v < 0.5) { // pipe/vent
                        ctx.fillStyle = '#4a4a52'; ctx.fillRect(sxp + 4, gy - 6, 14, 6);
                        ctx.fillStyle = '#6a6a74'; ctx.fillRect(sxp + 4, gy - 6, 14, 1);
                        ctx.fillStyle = '#2a2a30'; ctx.fillRect(sxp + 6, gy - 4, 2, 4); ctx.fillRect(sxp + 12, gy - 4, 2, 4);
                    }
                } else if (key === 'energy' || key === 'lair') {
                    if (v < 0.4) { // glowing crystal
                        var glow = 0.4 + 0.3 * Math.sin(animT * 0.1 + seed);
                        ctx.fillStyle = 'rgba(255,120,50,' + glow.toFixed(2) + ')';
                        ctx.beginPath(); ctx.moveTo(sxp + 6, gy); ctx.lineTo(sxp + 9, gy - 9); ctx.lineTo(sxp + 12, gy); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = 'rgba(255,210,140,' + glow.toFixed(2) + ')'; ctx.fillRect(sxp + 8, gy - 6, 1, 4);
                    } else if (v < 0.6) { // skull/rubble
                        ctx.fillStyle = '#6a6068'; ctx.beginPath(); ctx.arc(sxp + 9, gy, 4, Math.PI, 0); ctx.fill();
                    }
                }
            }
        }

        // ============================================================
        // MAIN LOOP
        // ============================================================
        var rafId = null, lastT = 0;
        function loop(ts) {
            rafId = requestAnimationFrame(loop);
            if (!running) return;
            var dt = ts - lastT; lastT = ts;
            animT++;
            stepPlayer();
            stepPods();
            stepEnemies();
            stepGate();
            stepBullets();
            if (fwActive > 0 || fireworks.length) stepFireworks();
            stepBgm();
            updateCamera();
            render();
        }

        // ============================================================
        // CANVAS SIZING
        // ============================================================
        function resize() {
            var rect = stage.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            var s = rect.width / (BASE_VIS_COLS * TILE);
            VW = BASE_VIS_COLS * TILE;
            VH = Math.ceil((rect.height / s) / TILE) * TILE;
            COLS_VIS = BASE_VIS_COLS;

            var touch = !(window.matchMedia && window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches);
            BOTTOM_SAFE = touch ? BOTTOM_SAFE_TILES * TILE : TILE;
            camY = (GROUND_R + 1) * TILE - VH + BOTTOM_SAFE;
            if (camY < 0) camY = 0;

            var dpr = Math.min(window.devicePixelRatio || 1, 3);
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            canvas.style.width = '100%'; canvas.style.height = '100%';
            ctx.setTransform(canvas.width / VW, 0, 0, canvas.width / VW, 0, 0);
            ctx.imageSmoothingEnabled = false;
        }
        window.addEventListener('resize', resize);
        onCleanup(function () { window.removeEventListener('resize', resize); });

        // ============================================================
        // OVERLAYS / FLOW
        // ============================================================
        var OVERLAYS = ['rc-intro', 'rc-stageclear', 'rc-win'];
        var DIFF_LVL_DESC = [
            'Banyak power-up, musuh sedikit, peluru lambat — santai untuk belajar.',
            'Musuh menembak balik lebih sering, jurang sedang, hadir turret & sniper.',
            'Tembakan padat, musuh cepat, jurang lebar, area lebih panjang.'
        ];
        function refreshIntroDiff() {
            var el = document.getElementById('rc-intro-diff');
            if (!el) return;
            var lvl = diffKnobs(stageNum).lvl;
            var key = ['easy', 'medium', 'hard'][lvl];
            el.innerHTML =
                '<span class="rc-diff-info-badge" data-lvl="' + key + '">TINGKAT: ' + DIFF_LVL_NAME[lvl] + '</span>' +
                '<span class="rc-diff-info-desc">' + DIFF_LVL_DESC[lvl] + '</span>';
        }
        function showOverlay(id) {
            stopBgm();
            OVERLAYS.forEach(function (o) { var el = document.getElementById(o); if (el) el.classList.remove('show'); });
            var el = document.getElementById(id); if (el) el.classList.add('show');
            if (id === 'rc-intro') refreshIntroDiff();
        }
        function hideOverlays() { OVERLAYS.forEach(function (o) { var el = document.getElementById(o); if (el) el.classList.remove('show'); }); }

        function startGame(stage) {
            stageNum = stage || 1;
            lives = startLives();
            W = buildWorld(stageNum);
            resetPlayer(false);
            camX = 0;
            running = true; started = true;
            setHUD(); resize(); render();
        }
        function nextStage() {
            stageNum++;
            if (stageNum > TOTAL_STAGES) { showWin(); return; }
            W = buildWorld(stageNum);
            resetPlayer(false);
            camX = 0; running = true;
            setHUD(); hideOverlays(); lastT = performance.now(); render();
        }
        function goToStage(n) {
            stageNum = clamp(n, 1, TOTAL_STAGES);
            W = buildWorld(stageNum);
            resetPlayer(false);
            camX = 0; running = true;
            setHUD(); hideOverlays(); closeModal();
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            lastT = performance.now(); render();
        }

        // ============================================================
        // VIEW-INVITATION BUTTON
        // ============================================================
        var invitation = document.getElementById('rc-invitation');
        var fab = document.getElementById('rc-fab');
        var viewBtn = document.getElementById('rc-view-btn');
        function viewUnlocked() { return !!(completed || allInfoUnlocked() || (player && player.cheat)); }
        function updateViewBtn() {
            if (!viewBtn) return;
            if (viewUnlocked()) viewBtn.classList.remove('is-locked');
            else viewBtn.classList.add('is-locked');
        }
        function openInvitation() {
            INFOS.forEach(function (info) {
                if (!unlocked[info.key]) { unlocked[info.key] = true; var btn = invButtons[info.key]; if (btn) btn.classList.add('is-enabled'); }
            });
            persist(); running = false; stopBgm(); hideOverlays(); closeModal();
            if (invitation) { invitation.classList.add('show'); invitation.scrollTop = 0; }
            if (fab) fab.classList.add('show');
            playHostMusic();
        }

        // ---- Host music control ----
        var musicWanted = false, musicGen = 0;
        var bgMusic = document.getElementById('bg-music');
        var btnMusic = document.getElementById('btn-toggle-music');
        function hostMusicPlaying() {
            var b = document.getElementById('btn-toggle-music');
            if (b && b.classList.contains('music-playing')) return true;
            var pa = document.getElementById('pause-icon');
            if (pa && pa.style.display === 'block') return true;
            if (bgMusic && !bgMusic.paused && !bgMusic.ended) return true;
            return false;
        }
        function reconcileMusic(gen, allowClick) {
            try {
                if (gen !== musicGen) return;
                if (hostMusicPlaying() === musicWanted) return;
                if (!allowClick) return;
                var b = document.getElementById('btn-toggle-music');
                if (b) b.click();
            } catch (e) {}
        }
        function setMusicWanted(on) {
            var next = !!on;
            if (next === musicWanted && musicGen > 0) {
                var g0 = musicGen;
                setTimeout(function () { reconcileMusic(g0, true); }, 220);
                return;
            }
            musicWanted = next; var gen = ++musicGen;
            reconcileMusic(gen, true);
            setTimeout(function () { reconcileMusic(gen, true); }, 320);
            setTimeout(function () { reconcileMusic(gen, true); }, 900);
        }
        function playHostMusic() { setMusicWanted(true); }
        function pauseHostMusic() { setMusicWanted(false); }

        if (viewBtn) viewBtn.addEventListener('click', function () {
            if (!viewUnlocked()) { toast('Selesaikan misi dulu<br><span style="font-size:8px">atau aktifkan ★ cheat</span>', 1800); return; }
            openInvitation();
        });

        // ============================================================
        // SETTINGS / RESET
        // ============================================================
        var settingsBtn = document.getElementById('rc-settings-btn');
        var confirmRoot = document.getElementById('rc-confirm-root');
        var confirmOk = document.getElementById('rc-confirm-ok');
        var confirmCancel = document.getElementById('rc-confirm-cancel');
        if (settingsBtn) settingsBtn.addEventListener('click', function () { if (confirmRoot) confirmRoot.classList.add('show'); });
        if (confirmCancel) confirmCancel.addEventListener('click', function () { if (confirmRoot) confirmRoot.classList.remove('show'); });
        if (confirmRoot) confirmRoot.addEventListener('click', function (e) { if (e.target === confirmRoot) confirmRoot.classList.remove('show'); });
        if (confirmOk) confirmOk.addEventListener('click', function () {
            resetSave();
            if (confirmRoot) confirmRoot.classList.remove('show');
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            closeModal();
            if (player) player.cheat = false;
            if (starBtn) starBtn.classList.remove('is-on');
            score = 0; lives = startLives();
            buildInventory(); updateViewBtn();
            startGame(1); updateStageSelBtn();
            running = false; showOverlay('rc-intro');
            toast('Game di-reset', 1400);
        });

        // ============================================================
        // WIRE UP UI
        // ============================================================
        var cover = document.getElementById('rc-cover');
        var btnStart = document.getElementById('rc-start-btn');
        var btnIntroGo = document.getElementById('rc-intro-go');
        var btnStageGo = document.getElementById('rc-stage-go');
        var btnWinGo = document.getElementById('rc-win-go');
        var btnReplay = document.getElementById('rc-replay');
        var starBtn = document.getElementById('rc-star-btn');
        var stageSelBtn = document.getElementById('rc-stagesel-btn');
        var stageSelRoot = document.getElementById('rc-stagesel-root');
        var stageSelGrid = document.getElementById('rc-stagesel-grid');
        var stageSelCancel = document.getElementById('rc-stagesel-cancel');
        var stageSelOk = document.getElementById('rc-stagesel-ok');
        var stageSelHint = document.getElementById('rc-stagesel-hint');

        var diffWrap = document.getElementById('rc-diff');
        function syncDiffUI() {
            if (!diffWrap) return;
            var opts = diffWrap.querySelectorAll('.rc-diff-opt');
            for (var i = 0; i < opts.length; i++) opts[i].classList.toggle('is-sel', opts[i].getAttribute('data-diff') === gameDiff);
        }
        if (diffWrap) {
            diffWrap.addEventListener('click', function (e) {
                var b = e.target.closest ? e.target.closest('.rc-diff-opt') : null;
                if (!b) return;
                var d = b.getAttribute('data-diff');
                if (d === 'easy' || d === 'medium' || d === 'hard') { gameDiff = d; persist(); syncDiffUI(); playSfx('powerup'); }
            });
            syncDiffUI();
        }

        if (btnStart) btnStart.addEventListener('click', function () {
            audioCtx();
            pauseHostMusic();
            if (cover) cover.classList.add('rc-hidden');
            buildInventory(); updateViewBtn();
            startGame(1); running = false; showOverlay('rc-intro');
        });
        if (btnIntroGo) btnIntroGo.addEventListener('click', function () {
            hideOverlays(); running = true; lastT = performance.now(); startBgm();
        });
        if (btnStageGo) btnStageGo.addEventListener('click', function () { nextStage(); startBgm(); });
        if (btnWinGo) btnWinGo.addEventListener('click', function () { hideOverlays(); openInvitation(); });
        if (btnReplay) btnReplay.addEventListener('click', function () {
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            pauseHostMusic(); startGame(1); running = false; showOverlay('rc-intro');
        });
        if (fab) fab.addEventListener('click', function () {
            if (invitation) invitation.classList.remove('show');
            fab.classList.remove('show'); closeModal(); pauseHostMusic();
            if (started && W && player && !player.win) { running = true; lastT = performance.now(); startBgm(); }
            else { running = false; showOverlay('rc-intro'); }
        });

        function updateStageSelBtn() {
            if (stageSelBtn) stageSelBtn.style.display = (player && player.cheat) ? 'flex' : 'none';
        }
        if (starBtn) starBtn.addEventListener('click', function () {
            if (!player) return;
            player.cheat = !player.cheat;
            starBtn.classList.toggle('is-on', player.cheat);
            if (player.cheat) { player.weapon = 'S'; setWeaponHUD(); }
            updateViewBtn(); updateStageSelBtn();
            toast(player.cheat ? 'CHEAT MODE ON<br><span style="font-size:8px">Kebal · skor mati · pilih area</span>' : 'CHEAT MODE OFF', 1700);
        });

        // ---- Stage select (cheat) ----
        var selDiff = gameDiff, selStage = stageNum;
        var DIFF_INFO = {
            easy:   { name: 'EASY',   desc: '5 nyawa · hit pertama hanya turun senjata · musuh sedikit' },
            medium: { name: 'MEDIUM', desc: 'Musuh menembak balik · turret & sniper · jurang sedang' },
            hard:   { name: 'HARD',   desc: 'One-hit · tembakan padat · musuh cepat · area panjang' }
        };
        function renderStageSelHint() {
            if (!stageSelHint) return;
            var w = WORLDS[selStage - 1] || WORLDS[0];
            var di = DIFF_INFO[selDiff] || DIFF_INFO.medium;
            stageSelHint.innerHTML =
                '<div class="ss-hint-row"><span class="ss-hint-key">PILIHAN</span>' +
                '<span class="ss-hint-val">AREA ' + w.name + ' · ' + di.name + '</span></div>' +
                '<div class="ss-hint-desc">' + di.desc + '</div>';
        }
        function buildStageSelect() {
            if (!stageSelGrid) return;
            selDiff = gameDiff; selStage = stageNum;
            stageSelGrid.innerHTML = '';
            var dbtn = document.createElement('button');
            dbtn.type = 'button'; dbtn.className = 'rc-stagesel-item rc-stagesel-diff'; dbtn.style.gridColumn = '1 / -1';
            function dlabel() {
                var di = DIFF_INFO[selDiff] || DIFF_INFO.medium;
                return '<span class="ss-world">MODE: ' + di.name + '</span><span class="ss-biome">ketuk untuk ganti tingkat</span>';
            }
            dbtn.innerHTML = dlabel();
            dbtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var i = DIFF_ORDER.indexOf(selDiff);
                selDiff = DIFF_ORDER[(i + 1) % DIFF_ORDER.length];
                dbtn.innerHTML = dlabel(); renderStageSelHint(); playSfx('powerup');
            });
            stageSelGrid.appendChild(dbtn);
            WORLDS.forEach(function (w, idx) {
                var n = idx + 1;
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'rc-stagesel-item' + (n === stageNum ? ' is-current' : '') + (n === selStage ? ' is-selected' : '');
                b.innerHTML = '<span class="ss-world">AREA ' + w.name + '</span><span class="ss-biome">' + w.biome + '</span>';
                b.addEventListener('click', function (e) {
                    e.stopPropagation();
                    selStage = n;
                    var items = stageSelGrid.querySelectorAll('.rc-stagesel-item');
                    for (var k = 0; k < items.length; k++) items[k].classList.remove('is-selected');
                    b.classList.add('is-selected'); renderStageSelHint(); playSfx('powerup');
                });
                stageSelGrid.appendChild(b);
            });
            renderStageSelHint();
        }
        if (stageSelBtn) stageSelBtn.addEventListener('click', function () {
            if (!player || !player.cheat) return;
            buildStageSelect();
            if (stageSelRoot) stageSelRoot.classList.add('show');
        });
        if (stageSelCancel) stageSelCancel.addEventListener('click', function () { if (stageSelRoot) stageSelRoot.classList.remove('show'); });
        if (stageSelOk) stageSelOk.addEventListener('click', function () {
            if (selDiff !== gameDiff) { gameDiff = selDiff; persist(); syncDiffUI(); }
            if (stageSelRoot) stageSelRoot.classList.remove('show');
            playSfx('stageclear'); goToStage(selStage);
        });
        if (stageSelRoot) stageSelRoot.addEventListener('click', function (e) { if (e.target === stageSelRoot) stageSelRoot.classList.remove('show'); });

        // Touch controls
        bindJoystick();
        holdBtn('rc-jump', 'jump');
        holdBtn('rc-fire', 'fire');
        bindKey();

        // ============================================================
        // COUNTDOWN + CALENDAR
        // ============================================================
        function getWeddingDate() {
            var calEl = document.getElementById('rc-calendar');
            var iso = (val('wedding_date_iso') || (calEl && calEl.getAttribute ? (calEl.getAttribute('data-wedding-date') || '') : '')).trim();
            if (iso && iso.indexOf('{{') !== 0) {
                var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
                var d = new Date(iso); if (!isNaN(d.getTime())) return d;
            }
            return new Date(new Date().getFullYear() + 1, 11, 31);
        }
        var weddingDate = getWeddingDate();
        var cdTimer = setInterval(function () {
            var dist = weddingDate.getTime() - Date.now();
            if (dist < 0) dist = 0;
            var d = Math.floor(dist / 864e5), h = Math.floor(dist % 864e5 / 36e5),
                mi = Math.floor(dist % 36e5 / 6e4), s = Math.floor(dist % 6e4 / 1e3);
            function set(id, v) { var el = document.getElementById(id); if (el) el.textContent = ('0' + v).slice(-2); }
            set('rc-cd-days', d); set('rc-cd-hours', h); set('rc-cd-mins', mi); set('rc-cd-secs', s);
        }, 1000);
        onCleanup(function () { clearInterval(cdTimer); });

        function renderCalendar(el) {
            if (!el || el.dataset.rendered) return;
            var t = weddingDate;
            var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            var dows = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            var y = t.getFullYear(), m = t.getMonth(), wd = t.getDate();
            var first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
            var html = '<div class="rc-cal-title">' + months[m] + ' ' + y + '</div><div class="rc-cal-grid">';
            dows.forEach(function (dn) { html += '<span class="rc-cal-dow">' + dn + '</span>'; });
            html += '</div><div class="rc-cal-grid">';
            for (var i = 0; i < first; i++) html += '<span class="rc-cal-cell cal-empty"></span>';
            for (var dd = 1; dd <= dim; dd++) html += '<span class="rc-cal-cell' + (dd === wd ? ' cal-active' : '') + '">' + dd + '</span>';
            html += '</div>';
            el.innerHTML = html; el.dataset.rendered = 'true';
        }
        renderCalendar(document.getElementById('rc-calendar'));

        // ============================================================
        // RSVP + WISHES (theme self-handlers; host also intercepts)
        // ============================================================
        var btnRsvp = document.getElementById('rc-btn-rsvp');
        if (btnRsvp) btnRsvp.addEventListener('click', function () {
            var name = (document.getElementById('rc-rsvp-name') || {}).value || '';
            if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
            var form = document.getElementById('rc-rsvp-form');
            if (form) form.innerHTML = '<div class="rc-thanks">⭐ Terima kasih' + (name ? ' ' + name : '') + '!<br>Konfirmasimu sudah kami terima.</div>';
            toast('RSVP terkirim!');
        });
        var btnWish = document.getElementById('btn-submit-ucapan');
        if (btnWish) btnWish.addEventListener('click', function () {
            if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
            var nm = (document.getElementById('wish-name') || {}).value || '';
            var msg = (document.getElementById('wish-message') || {}).value || '';
            if (!msg.trim()) { toast('Tulis ucapanmu dulu'); return; }
            var form = document.getElementById('rc-wish-form');
            if (form) form.innerHTML = '<div class="rc-thanks">⭐ Terima kasih atas ucapan &amp; doanya!</div>';
            var list = document.querySelector('.rc-wish-list');
            if (list) {
                var item = document.createElement('div'); item.className = 'rc-wish-item';
                item.innerHTML = '<div class="rc-wish-head"><span class="rc-wish-author">' + (nm || 'Tamu') + '</span><span class="rc-wish-time">baru saja</span></div><div class="rc-wish-text"></div>';
                item.querySelector('.rc-wish-text').textContent = msg;
                list.insertBefore(item, list.firstChild);
            }
            toast('Ucapan terkirim!');
        });

        // ============================================================
        // MUSIC — host-driven mirror
        // ============================================================
        function updateMusicUI() {
            var pi = document.getElementById('play-icon'), pa = document.getElementById('pause-icon');
            if (!bgMusic || !pi || !pa) return;
            if (bgMusic.paused) { pi.style.display = 'block'; pa.style.display = 'none'; if (btnMusic) btnMusic.classList.remove('music-playing'); }
            else { pi.style.display = 'none'; pa.style.display = 'block'; if (btnMusic) btnMusic.classList.add('music-playing'); }
        }
        if (bgMusic) {
            bgMusic.addEventListener('play', updateMusicUI);
            bgMusic.addEventListener('playing', updateMusicUI);
            bgMusic.addEventListener('pause', updateMusicUI);
        }

        // ============================================================
        // DESKTOP SIDEBAR — Contra wedding tableau
        // ============================================================
        var sideCanvas = document.getElementById('rc-side-canvas');
        var sideRaf = null;
        if (sideCanvas) {
            var sctx = sideCanvas.getContext('2d');
            var sT = 0, sDpr = 1, sU = 4;
            function sideResize() {
                sDpr = Math.min(window.devicePixelRatio || 1, 3);
                sideCanvas.width = Math.max(1, Math.round(sideCanvas.clientWidth * sDpr));
                sideCanvas.height = Math.max(1, Math.round(sideCanvas.clientHeight * sDpr));
                sctx.setTransform(sDpr, 0, 0, sDpr, 0, 0);
            }
            sideResize(); window.addEventListener('resize', sideResize);
            onCleanup(function () { window.removeEventListener('resize', sideResize); });
            function spx(ox, oy, x, y, w, h, col) { sctx.fillStyle = col; sctx.fillRect(Math.round(ox + x * sU), Math.round(oy + y * sU), Math.ceil((w || 1) * sU), Math.ceil((h || 1) * sU)); }

            function sideLoop() {
                sideRaf = requestAnimationFrame(sideLoop);
                var w = sideCanvas.clientWidth, h = sideCanvas.clientHeight; if (!w) return;
                sT += 1;
                var sky = sctx.createLinearGradient(0, 0, 0, h);
                sky.addColorStop(0, '#16283a'); sky.addColorStop(0.55, '#2c4a6a'); sky.addColorStop(1, '#1f5e33');
                sctx.fillStyle = sky; sctx.fillRect(0, 0, w, h);
                // clouds
                sctx.fillStyle = 'rgba(255,255,255,0.7)';
                for (var i = 0; i < 4; i++) { var cx = (i * 240 - sT * 0.3) % (w + 220) - 110; var cy = 50 + (i % 3) * 60; sctx.fillRect(cx, cy, 66, 16); sctx.fillRect(cx + 14, cy - 11, 34, 16); }
                // jungle hills
                sctx.fillStyle = '#1f6a34';
                for (var hi = 0; hi < 4; hi++) { var hx = (hi * 260 - sT * 0.12) % (w + 280) - 140; sctx.beginPath(); sctx.arc(hx + 90, h - 70, 90, Math.PI, 0); sctx.closePath(); sctx.fill(); }
                var groundY = h - 70;
                sctx.fillStyle = '#3a6a30'; sctx.fillRect(0, groundY, w, h - groundY);
                sctx.fillStyle = '#5aa048'; sctx.fillRect(0, groundY, w, 8);

                sU = clamp(Math.round(Math.min(w, h * 0.9) / 70), 3, 9);
                var bob = Math.sin(sT * 0.05) * (sU * 0.6);
                var cxc = w / 2, feetY = groundY + 2, boxH = 34 * sU, boxW = 24 * sU;

                // commando groom (left) + princess (right) under a heart
                var groomX = cxc - boxW + sU * 3, brideX = cxc - sU * 3;
                drawSideCommando(groomX, feetY - boxH, bob);
                drawSideBride(brideX, feetY - boxH, bob);
                var hpY = (feetY - boxH) - sU * 6 + Math.sin(sT * 0.08) * sU;
                drawSideHeart(cxc, hpY, sU * 0.9, '#ff5a8a');

                // floating hearts
                for (var hh = 0; hh < 6; hh++) {
                    var phase = (sT * 0.9 + hh * 60) % 240;
                    var hxp = cxc + Math.sin((sT * 0.03) + hh * 1.7) * (sU * 20) + (hh - 3) * sU * 5;
                    var hyp = groundY - sU * 4 - phase * (h / 320);
                    sctx.globalAlpha = clamp(1 - phase / 240, 0, 1) * 0.9;
                    drawSideHeart(hxp, hyp, (hh % 2 ? 0.5 : 0.34) * sU, hh % 3 ? '#ff7ab6' : '#ffd84a');
                    sctx.globalAlpha = 1;
                }

                // banner
                var banW = boxW * 1.7, banX = cxc - banW / 2, banY = (feetY - boxH) - sU * 14;
                sctx.fillStyle = '#e52521'; sctx.fillRect(banX, banY, banW, sU * 6);
                sctx.fillStyle = '#ffd84a'; sctx.fillRect(banX, banY, banW, sU * 0.7);
                sctx.fillStyle = '#fff'; sctx.font = 'bold ' + Math.round(sU * 2.6) + "px 'Press Start 2P', monospace";
                sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
                sctx.fillText('JUST MARRIED', cxc, banY + sU * 3);
                sctx.textAlign = 'left'; sctx.textBaseline = 'alphabetic';
            }
            function drawSideCommando(ox, oy, bobY) {
                oy += bobY; var cx = 12;
                spx(ox, oy, cx - 6, 1, 12, 3, '#e52521');      // bandana
                spx(ox, oy, cx - 5, 3, 10, 8, '#ffce9e');      // head
                spx(ox, oy, cx - 7, 11, 14, 12, '#2f6a3a');    // vest
                spx(ox, oy, cx - 4, 13, 8, 1, '#caa24a');      // ammo strap
                spx(ox, oy, cx + 6, 14, 12, 4, '#3a3a44');     // gun toward bride
                spx(ox, oy, cx - 6, 23, 5, 9, '#3a4a2a'); spx(ox, oy, cx + 1, 23, 5, 9, '#3a4a2a');
                spx(ox, oy, cx - 7, 31, 7, 3, '#2a2014'); spx(ox, oy, cx + 1, 31, 7, 3, '#2a2014');
            }
            function drawSideBride(ox, oy, bobY) {
                oy += bobY; var cx = 12;
                spx(ox, oy, cx - 5, -1, 10, 2, '#ffd84a'); spx(ox, oy, cx - 1, -3, 2, 2, '#ff5a55');
                spx(ox, oy, cx - 7, 1, 14, 8, '#f4cf5a');     // hair
                spx(ox, oy, cx - 5, 4, 10, 7, '#ffd9b8');     // face
                spx(ox, oy, cx - 6, 11, 12, 6, '#ffffff');    // bodice
                for (var gy = 17; gy < 34; gy++) { var t = (gy - 17) / 16; var halfw = 4 + t * 8; spx(ox, oy, cx - halfw, gy, halfw * 2, 1, '#ffffff'); }
                spx(ox, oy, cx - 12, 32, 24, 2, '#ffd84a');
            }
            function drawSideHeart(cxp, cyp, s, col) {
                sctx.fillStyle = col;
                sctx.fillRect(cxp - 3 * s, cyp - 2 * s, 2 * s, 3 * s);
                sctx.fillRect(cxp + 1 * s, cyp - 2 * s, 2 * s, 3 * s);
                sctx.fillRect(cxp - 2 * s, cyp + s, 4 * s, 1 * s);
                sctx.fillRect(cxp - 1 * s, cyp + 2 * s, 2 * s, 1 * s);
            }
            sideLoop();
            onCleanup(function () { if (sideRaf) cancelAnimationFrame(sideRaf); });
        }

        // ============================================================
        // BOOT
        // ============================================================
        resize();
        rafId = requestAnimationFrame(loop);
        onCleanup(function () { if (rafId) cancelAnimationFrame(rafId); running = false; });

        buildInventory();
        updateViewBtn();

        setTimeout(function () { try { pauseHostMusic(); } catch (e) {} }, 0);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
