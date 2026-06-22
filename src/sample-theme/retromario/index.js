/* ======================================================================
   RETRO MARIO WEDDING THEME — game engine + invitation glue
   ----------------------------------------------------------------------
   One self-contained IIFE. Everything is drawn on a single <canvas>. The
   world is authored at a fixed virtual resolution (256×224) but the canvas
   backing store is sized to the displayed CSS pixels × devicePixelRatio and
   the context is scaled, so the art is rendered crisp at high resolution
   (no blurry nearest-neighbour upscale of a tiny backing store). The level
   is built from the Pattern Library in MARIO_LEVEL_GENERATION_BIBLE.md,
   validated for solvability, then simulated with classic, non-floaty
   platformer physics.

   PROGRESSION: 8 worlds following the bible's biome ladder
   (Overworld → Underground → Water → Sky → Desert → Forest → Castle →
   Final Castle + Boss). Finishing a stage advances to the next for bonus
   points; clearing the boss completes the run and reveals the invitation.

   The invitation content is discovered, not shown: hitting a "?" info-block
   shows a toast and enables that piece's inventory icon (top-right) which
   the guest can then click to open a retro modal. Reaching the flag (or
   the boss) unlocks any remaining pieces. A persistent "view invitation"
   button appears once the run has been completed once (or cheat is on).
   The host app has already bound all {{vars}} into the DOM before this runs.
   ====================================================================== */
(function () {
    'use strict';

    // The app re-injects this script on theme switch; clean up the old loop.
    if (typeof window.__rmCleanup === 'function') { try { window.__rmCleanup(); } catch (e) {} }

    var cleanupFns = [];
    function onCleanup(fn) { cleanupFns.push(fn); }
    window.__rmCleanup = function () { cleanupFns.forEach(function (f) { try { f(); } catch (e) {} }); cleanupFns = []; };

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
        var canvas = document.getElementById('rm-canvas');
        var stage = document.getElementById('rm-stage');
        if (!canvas || !stage) return;
        var ctx = canvas.getContext('2d');

        // ============================================================
        // CONSTANTS
        // ============================================================
        // The world is a tile grid. To fill the whole screen with NO black
        // bars (and without stretching or cropping hazards), the visible
        // viewport (VW × VH, in virtual px) is recomputed from the real stage
        // aspect ratio on every resize(): we lock the visible *height* to a
        // base tile count and widen/heighten the column/row count to match the
        // device. TILE and the ground row stay fixed so physics never change.
        var TILE = 16;            // virtual tile size in px (constant)
        var ROWS = 40;            // world rows tall — generous sky headroom so
                                  // even very tall/narrow frames fill with scenery,
                                  // never showing a bar below the ground band
        var GROUND_R = ROWS - 2;  // top row of the ground band (fixed, near bottom)
        var BASE_VIS_COLS = 13;   // horizontal framing (fewer cols = bigger, closer
                                  // characters; still shows ~13 tiles ahead so the
                                  // player can read upcoming platforms/enemies/pits —
                                  // bible §14 camera readability)
        // The *visible* viewport; resize() overwrites VW/VH/COLS_VIS so the game
        // fills the screen exactly (width-locked, height grows with the device).
        var COLS_VIS = BASE_VIS_COLS;
        var VW = COLS_VIS * TILE; // virtual viewport width  (recomputed)
        var VH = 14 * TILE;       // virtual viewport height (recomputed)
        var camY = 0;             // vertical camera offset (world taller than view)
        // Bottom safe-area (virtual px) reserved BELOW the ground top for the
        // on-screen touch controls, so the joystick/buttons never cover Mario.
        // Filled with thick "deep ground" so it reads as solid earth, not a bar.
        // 0 on desktop (controls hidden), ~6 tiles on touch devices (resize()).
        var BOTTOM_SAFE = 0;
        var BOTTOM_SAFE_TILES = 7; // ~7 tiles of deep ground under the surface on mobile

        // Physics (tuned to feel responsive, not floaty — bible §3, §game-feel)
        var GRAV = 0.55;
        var MOVE = 0.55, FRICTION = 0.80, MAXVX = 2.6, RUN_MAX = 3.4;
        var JUMP_V = -8.2, JUMP_HOLD = 0.28, JUMP_HOLD_FRAMES = 13;
        var MAX_FALL = 9;
        // Input forgiveness (frames). JUMP_BUFFER: a jump pressed just before
        // landing still fires on touchdown. COYOTE: a jump pressed just after
        // walking off a ledge still fires. Both make combined move+jump feel
        // crisp instead of "dropped" on desktop.
        var JUMP_BUFFER = 6, COYOTE = 6;

        // Jump reach limits used by the validator (bible §8.3 / Appendix B)
        var MAX_JUMP_TILES_H = 4;   // vertical
        var MAX_JUMP_TILES_W = 5;   // horizontal gap

        var TOTAL_STAGES = 8;       // worlds 1..8; world 8 is the boss castle

        // ============================================================
        // BIOME LADDER (bible Appendix D §12) — one per world.
        // Each entry tweaks visuals + difficulty knobs; gameplay rules and
        // the pattern grammar stay identical so everything remains solvable.
        // ============================================================
        var BIOMES = {
            overworld:  { sky: ['#5c94fc', '#9fd0ff'], ground: '#c84c0c', groundTop: '#e07b2a', groundDark: '#8a3408', hills: '#5ab44a', clouds: '#ffffff', underground: false },
            underground:{ sky: ['#0a0a18', '#101028'], ground: '#3a4a8a', groundTop: '#5a6ac0', groundDark: '#1a2050', hills: '#202a55', clouds: '#33406a', underground: true },
            water:      { sky: ['#1a6ca8', '#3aa0d0'], ground: '#1f7a6a', groundTop: '#37b09a', groundDark: '#0e4a40', hills: '#2a8a78', clouds: '#bfeefe', underground: false, gravMul: 0.7, swim: true },
            sky:        { sky: ['#7fb0ff', '#cfe6ff'], ground: '#dfe8ff', groundTop: '#ffffff', groundDark: '#a8b8e0', hills: '#cdddff', clouds: '#ffffff', underground: false },
            desert:     { sky: ['#f0c060', '#ffe8a8'], ground: '#d2a24a', groundTop: '#f0c878', groundDark: '#9a6a22', hills: '#e0b85a', clouds: '#fff4d8', underground: false },
            forest:     { sky: ['#2a7a4a', '#7ac070'], ground: '#5a3a1a', groundTop: '#7a5028', groundDark: '#3a2410', hills: '#1f6a3a', clouds: '#dfeede', underground: false },
            castle:     { sky: ['#2a1020', '#5a2030'], ground: '#555', groundTop: '#777', groundDark: '#333', hills: '#3a2030', clouds: '#7a4050', underground: false, lava: true },
            finalcastle:{ sky: ['#1a0818', '#3a1028'], ground: '#444', groundTop: '#666', groundDark: '#222', hills: '#2a1028', clouds: '#5a2040', underground: false, lava: true, boss: true }
        };
        // World index (1..8) → biome key + difficulty label + display name.
        var WORLDS = [
            { biome: 'overworld',  diff: 'easy',   name: '1-1' },
            { biome: 'underground',diff: 'easy',   name: '2-1' },
            { biome: 'water',      diff: 'medium', name: '3-1' },
            { biome: 'sky',        diff: 'medium', name: '4-1' },
            { biome: 'desert',     diff: 'medium', name: '5-1' },
            { biome: 'forest',     diff: 'hard',   name: '6-1' },
            { biome: 'castle',     diff: 'hard',   name: '7-1' },
            { biome: 'finalcastle',diff: 'hard',   name: '8-1' }
        ];

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
            return !!document.querySelector('.rm-sec[data-info="' + infoKey + '"]');
        }
        function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

        // ============================================================
        // INFO BLOCKS — the discoverable invitation pieces.
        // Only include the ones whose section actually rendered (feature flags).
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

        // Persisted unlock + score + progress state
        var STORE_KEY = 'rm_wedding_state_v1';
        var saved = {};
        try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }
        var unlocked = saved.unlocked || {};
        var bestScore = saved.bestScore || 0;
        var seenInfo = saved.seenInfo || {};      // info modals the guest already opened
        var bestStage = saved.bestStage || 1;     // furthest world reached (1..8)
        var completed = !!saved.completed;         // has the full run ever been finished?
        var announcedAll = !!saved.announcedAll;   // already shown the "all info collected" farewell?

        function persist() {
            try {
                localStorage.setItem(STORE_KEY, JSON.stringify({
                    unlocked: unlocked, bestScore: Math.max(bestScore, score),
                    seenInfo: seenInfo, bestStage: bestStage, completed: completed,
                    announcedAll: announcedAll
                }));
            } catch (e) {}
        }
        function resetSave() {
            try { localStorage.removeItem(STORE_KEY); } catch (e) {}
            unlocked = {}; seenInfo = {}; bestScore = 0; bestStage = 1; completed = false; announcedAll = false;
        }

        // True once EVERY invitation info-block has been collected (manually or
        // via the end-of-run unlock). Drives access to the "view invitation"
        // shortcut without needing to finish the whole 8-world run.
        function allInfoUnlocked() {
            for (var i = 0; i < INFOS.length; i++) { if (!unlocked[INFOS[i].key]) return false; }
            return INFOS.length > 0;
        }

        // ============================================================
        // PATTERN LIBRARY (Appendix A) — each pattern stamps onto a tile grid.
        // Tile chars:  # ground/brick-floor  B brick  ? info-block  M mushroom
        //   S star  o coin  g goomba  k koopa  s spiny  T/U pipe top  [ ] pipe body
        //   P piranha  ^ spring  F flag  X solid block  H hidden-block  W warp-pipe-top
        // ============================================================
        function blankCol() { var c = []; for (var r = 0; r < ROWS; r++) c.push(' '); return c; }
        function fillGroundCols(g, x0, x1) {
            for (var x = x0; x <= x1; x++) { g[x][GROUND_R] = '#'; g[x][GROUND_R + 1] = '#'; }
        }
        // Carve a real pit: clear the ground band the base floor laid down, so
        // the player must actually jump it (a true death pit, bible §8).
        function carveGap(g, x0, x1) {
            for (var x = x0; x <= x1; x++) { if (g[x]) { g[x][GROUND_R] = ' '; g[x][GROUND_R + 1] = ' '; } }
        }
        function up(n) { return GROUND_R - n; } // row n tiles above the ground top

        // A pattern returns { width, stamp(grid, x) }. Patterns always keep a
        // safe floor unless they intentionally create a gap.
        var PAT = {
            flat: function (w) { return { width: w, stamp: function (g, x) { fillGroundCols(g, x, x + w - 1); } }; },

            coinTrail: function (n) { return { width: n + 2, stamp: function (g, x) {
                fillGroundCols(g, x, x + n + 1);
                for (var i = 0; i < n; i++) g[x + 1 + i][up(3)] = 'o';
            } }; },

            coinArc: function () { return { width: 7, stamp: function (g, x) {
                fillGroundCols(g, x, x + 6);
                var ys = [3, 4, 5, 4, 3];
                for (var i = 0; i < 5; i++) g[x + 1 + i][up(ys[i])] = 'o';
            } }; },

            qrow: function (kinds) { return { width: kinds.length * 2 + 1, stamp: function (g, x) {
                fillGroundCols(g, x, x + kinds.length * 2);
                for (var i = 0; i < kinds.length; i++) g[x + 1 + i * 2][up(4)] = kinds[i];
            } }; },

            infoBlock: function () { return { width: 3, stamp: function (g, x) {
                fillGroundCols(g, x, x + 2); g[x + 1][up(4)] = '?';
            } }; },

            goombas: function (n, sp) { sp = sp || 3; return { width: n * sp + 3, stamp: function (g, x) {
                fillGroundCols(g, x, x + n * sp + 2);
                for (var i = 0; i < n; i++) g[x + 2 + i * sp][up(1)] = 'g';
            } }; },

            koopa: function () { return { width: 5, stamp: function (g, x) {
                fillGroundCols(g, x, x + 4); g[x + 2][up(1)] = 'k';
            } }; },

            spiny: function () { return { width: 6, stamp: function (g, x) {
                fillGroundCols(g, x, x + 5); g[x + 3][up(1)] = 's';
            } }; },

            staircase: function (h) { return { width: h + 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + h + 3);
                for (var s = 0; s < h; s++) for (var b = 0; b <= s; b++) g[x + 1 + s][up(1 + b)] = 'B';
                g[x + h + 1][up(3)] = 'o';
            } }; },

            floatPlat: function (len) { return { width: len + 2, stamp: function (g, x) {
                fillGroundCols(g, x, x + len + 1);
                for (var i = 0; i < len; i++) { g[x + 1 + i][up(4)] = 'B'; g[x + 1 + i][up(6)] = 'o'; }
            } }; },

            gap: function (w) { w = clamp(w, 1, MAX_JUMP_TILES_W); return { width: w + 4, stamp: function (g, x) {
                // run-up (2) + real pit (w cols, floor carved out) + landing (2)
                fillGroundCols(g, x, x + 1);
                carveGap(g, x + 2, x + 1 + w);
                fillGroundCols(g, x + 2 + w, x + 3 + w);
                g[x + 2 + Math.floor(w / 2)][up(4)] = 'o'; // coin hint over the pit
            } }; },

            pipe: function (h) { h = h || 2; return { width: 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + 3);
                for (var i = 0; i < h; i++) {
                    g[x + 1][up(1 + i)] = (i === h - 1) ? 'T' : '[';
                    g[x + 2][up(1 + i)] = (i === h - 1) ? 'U' : ']';
                }
            } }; },

            // A warp pipe: same shape as a normal pipe but the top is marked
            // 'W' so the engine lets the player press DOWN to dive into the
            // underground bonus coin room (bible §6.2 / Appendix A P002).
            warpPipe: function (h) { h = h || 2; return { width: 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + 3);
                for (var i = 0; i < h; i++) {
                    g[x + 1][up(1 + i)] = (i === h - 1) ? 'W' : '[';
                    g[x + 2][up(1 + i)] = (i === h - 1) ? 'U' : ']';
                }
            } }; },

            piranhaPipe: function (h) { h = h || 2; return { width: 5, stamp: function (g, x) {
                fillGroundCols(g, x, x + 4);
                for (var i = 0; i < h; i++) {
                    g[x + 1][up(1 + i)] = (i === h - 1) ? 'T' : '[';
                    g[x + 2][up(1 + i)] = (i === h - 1) ? 'U' : ']';
                }
                g[x + 1][up(h + 1)] = 'P'; // piranha emerges from the top
            } }; },

            powerRow: function (kind) { return { width: 3, stamp: function (g, x) {
                fillGroundCols(g, x, x + 2); g[x + 1][up(4)] = kind; // 'M' or 'S'
            } }; },

            // Secret: hidden block above a coin trail leading up (bible §11)
            hiddenBonus: function () { return { width: 6, stamp: function (g, x) {
                fillGroundCols(g, x, x + 5);
                g[x + 2][up(4)] = 'H';        // hidden block (bumpable)
                g[x + 2][up(7)] = 'o';        // reward hint above
                g[x + 3][up(8)] = 'o';
                g[x + 4][up(8)] = 'o';
            } }; },

            spring: function () { return { width: 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + 3); g[x + 1][up(1)] = '^';
                g[x + 2][up(7)] = 'o';
            } }; },

            // ---- Biome-flavoured patterns (per-stage variety) ----

            // UNDERGROUND: a low brick ceiling tunnel with a coin chamber under
            // it (bible UG002). Teaches tight vertical navigation.
            brickTunnel: function (len) { return { width: len + 2, stamp: function (g, x) {
                fillGroundCols(g, x, x + len + 1);
                for (var i = 0; i <= len + 1; i++) g[x + i][up(5)] = 'B'; // ceiling
                for (var j = 0; j < len; j++) g[x + 1 + j][up(2)] = 'o';  // coin row
            } }; },

            // WATER/SKY: a gap bridged by a single mid-air brick platform you
            // must hop across (two short gaps + island). Always within reach.
            islandHop: function () { return { width: 9, stamp: function (g, x) {
                fillGroundCols(g, x, x + 1);
                carveGap(g, x + 2, x + 6);           // real water gap
                g[x + 4][up(2)] = 'B'; g[x + 5][up(2)] = 'B'; // stepping island
                g[x + 4][up(5)] = 'o'; g[x + 5][up(5)] = 'o';
                fillGroundCols(g, x + 7, x + 8);
            } }; },

            // SKY: ascending floating platforms (PL005 ladder) ending high with
            // a coin reward — verticality without unfair blind jumps.
            skyLadder: function () { return { width: 11, stamp: function (g, x) {
                fillGroundCols(g, x, x + 10);
                var steps = [[2, 2], [5, 4], [8, 6]];
                for (var i = 0; i < steps.length; i++) {
                    var px = x + steps[i][0], h = steps[i][1];
                    g[px][up(h)] = 'B'; g[px + 1][up(h)] = 'B';
                    g[px][up(h + 2)] = 'o';
                }
            } }; },

            // DESERT: a long flat run with a small ground-level enemy cluster —
            // "quick reaction" pacing (bible desert §8.5).
            desertRun: function (hard) { return { width: 12, stamp: function (g, x) {
                fillGroundCols(g, x, x + 11);
                g[x + 4][up(1)] = 'g'; g[x + 7][up(1)] = 'g';
                if (hard) g[x + 9][up(1)] = 's';
                g[x + 2][up(4)] = 'o'; g[x + 3][up(4)] = 'o'; g[x + 10][up(4)] = 'o';
            } }; },

            // FOREST: stacked brick ledges (layered platforms) with a koopa up
            // top — exploration/verticality (bible forest §10.4).
            forestTiers: function () { return { width: 10, stamp: function (g, x) {
                fillGroundCols(g, x, x + 9);
                for (var i = 0; i < 4; i++) g[x + 2 + i][up(3)] = 'B';
                for (var j = 0; j < 3; j++) g[x + 5 + j][up(6)] = 'B';
                g[x + 6][up(7)] = 'k';
                g[x + 3][up(5)] = 'o'; g[x + 5][up(8)] = 'o';
            } }; },

            // CASTLE: a brick platform over a lava-style pit (drawn via biome
            // tint) flanked by solid blocks — timing jump (bible castle §4).
            castleGap: function (w) { w = clamp(w, 2, MAX_JUMP_TILES_W); return { width: w + 6, stamp: function (g, x) {
                fillGroundCols(g, x, x + 1);
                g[x + 1][up(3)] = 'B';
                carveGap(g, x + 2, x + 1 + w);       // real lava-style pit
                g[x + 2 + Math.floor(w / 2)][up(5)] = 'o';
                fillGroundCols(g, x + 2 + w, x + 5 + w);
                g[x + 3 + w][up(3)] = 'B';
            } }; }
        };

        // ============================================================
        // LEVEL BUILDER — assemble a grid from patterns following the bible
        // flow: Start → Teach → Practice → Challenge → Reward → Secret →
        // Checkpoint → Final → Goal. Info-blocks are injected so every piece
        // of invitation content is reachable on the main path.
        //
        // `stage` (1..8) scales difficulty: longer spine, denser enemies,
        // wider gaps, taller pipes. Info-blocks are only seeded on stage 1 so
        // the discovery arc plays once; later stages are pure score-runs.
        // ============================================================
        // Tag a pattern as the checkpoint zone (must be a flat, safe stretch).
        function cp(p) { p.checkpoint = true; return p; }

        // How many invitation info-blocks each stage seeds. Spread across the
        // first four worlds so guests discover the invitation gradually instead
        // of all at once on stage 1. Sum MUST equal INFOS.length (10) so every
        // piece is placed across a full playthrough. (If feature flags trim
        // INFOS below 10 the quotas are auto-scaled in buildSpine.)
        var STAGE_INFO_QUOTA = [3, 3, 2, 2, 0, 0, 0, 0];
        function stageInfoQuota(stage) {
            // Scale quotas to the actual INFOS count (some sections are flagged off).
            var total = INFOS.length;
            var base = STAGE_INFO_QUOTA.slice();
            var baseSum = base.reduce(function (a, b) { return a + b; }, 0); // 10
            if (total === baseSum) return base[stage - 1] || 0;
            // Re-distribute `total` across the same first-4 shape proportionally.
            var out = [0, 0, 0, 0, 0, 0, 0, 0], placed = 0;
            for (var i = 0; i < 4; i++) { out[i] = Math.round(base[i] / baseSum * total); placed += out[i]; }
            // fix rounding drift onto stage 1
            out[0] += (total - placed);
            if (out[0] < 0) out[0] = 0;
            return out[stage - 1] || 0;
        }
        // Global index offset of the first info-block on a given stage, so each
        // stage maps to a fixed, contiguous slice of INFOS (deterministic even
        // with cheat stage-jumps or replays — no running-counter desync).
        function stageInfoOffset(stage) {
            var off = 0;
            for (var s = 1; s < stage; s++) off += stageInfoQuota(s);
            return off;
        }

        function buildSpine(stage) {
            var world = WORLDS[stage - 1] || WORLDS[0];
            var diff = world.diff;
            var quota = stageInfoQuota(stage);   // how many "?" this stage seeds
            var hard = diff === 'hard', med = diff === 'medium';
            var gapBase = hard ? 4 : (med ? 3 : 2);
            var pipeH = hard ? 4 : (med ? 3 : 2);
            var nInfo = 0;
            // info() drops a real "?" block while the stage still has quota left,
            // else a coin trail of the same footprint (pure score filler).
            function info() { if (nInfo < quota) { nInfo++; return PAT.infoBlock(); } return PAT.coinTrail(3); }

            var spine;

            if (stage === 1) {
                // STAGE 1 — discovery run; teaches every core mechanic. The info()
                // helper now only realises the first `quota` "?" blocks.
                spine = [
                    PAT.flat(7), PAT.coinTrail(4), info(), PAT.goombas(1), PAT.coinArc(),
                    PAT.qrow(['C', 'o', 'M']), PAT.gap(1), info(), PAT.goombas(1), PAT.pipe(2),
                    PAT.floatPlat(3), PAT.coinTrail(5), info(), PAT.staircase(3), PAT.gap(2),
                    PAT.koopa(), PAT.warpPipe(2), PAT.hiddenBonus(), info(), cp(PAT.flat(4)),
                    PAT.powerRow('S'), PAT.qrow(['C', 'o']), info(), PAT.spiny(), PAT.gap(2),
                    PAT.goombas(2, 4), info(), PAT.piranhaPipe(2), PAT.coinArc(), PAT.spring(),
                    info(), PAT.staircase(3), PAT.gap(2), info(), PAT.coinTrail(6),
                    PAT.qrow(['C', 'M']), info(), PAT.goombas(1), info(), PAT.flat(6)
                ];
            } else {
                // STAGES 2-8 — distinct biome layout; info() seeds this stage's
                // quota (stages 2-4) and is inert filler afterwards.
                spine = biomeSpine(world.biome, hard, med, gapBase, pipeH, info);
            }

            return { spine: spine, infoCount: nInfo };
        }

        // Per-biome layout grammar — the heart of stage variety. Each returns a
        // full Start→…→Goal spine with a tagged checkpoint, distinct from the
        // others in structure, not just colour.
        function biomeSpine(biome, hard, med, gapBase, pipeH, info) {
            var start = [PAT.flat(7), PAT.coinTrail(4)]; // safe start (bible §2.2)
            // `info()` realises a "?" block only while this stage has quota left,
            // otherwise returns coin filler — so the SAME spine works whether the
            // stage seeds info (worlds 2-4) or is a pure score-run (worlds 5-8).
            var s;
            switch (biome) {
                case 'underground':
                    // Tight brick tunnels + coin chambers, low pipes, buzzy spiny.
                    s = [
                        PAT.goombas(1), PAT.brickTunnel(4), info(),
                        PAT.coinTrail(4), PAT.brickTunnel(5), PAT.gap(2),
                        PAT.koopa(), PAT.warpPipe(2), cp(PAT.flat(4)),
                        PAT.brickTunnel(4), PAT.spiny(), info(),
                        PAT.brickTunnel(6), PAT.goombas(2, 4), info(),
                        PAT.hiddenBonus(), PAT.brickTunnel(4)
                    ];
                    break;
                case 'water':
                    // Lots of island hops over "water" gaps, reduced gravity feel.
                    s = [
                        PAT.coinArc(), PAT.islandHop(), PAT.goombas(1),
                        PAT.islandHop(), PAT.piranhaPipe(2), info(),
                        PAT.islandHop(), cp(PAT.flat(4)), PAT.spring(),
                        PAT.islandHop(), info(), PAT.islandHop(),
                        PAT.koopa(), PAT.islandHop(), PAT.powerRow('S')
                    ];
                    break;
                case 'sky':
                    // Vertical sky ladders + floating platforms + springs.
                    s = [
                        PAT.skyLadder(), PAT.floatPlat(3), PAT.gap(gapBase),
                        PAT.skyLadder(), info(), PAT.spring(),
                        cp(PAT.flat(4)), PAT.skyLadder(), PAT.floatPlat(4),
                        PAT.gap(gapBase), PAT.koopa(), PAT.skyLadder(),
                        PAT.hiddenBonus(), PAT.spring(), info()
                    ];
                    break;
                case 'desert':
                    // Long horizontal runs, quick-reaction enemy clusters, pipes.
                    s = [
                        PAT.desertRun(false), PAT.pipe(pipeH), info(),
                        PAT.desertRun(med || hard), PAT.gap(gapBase), PAT.koopa(),
                        cp(PAT.flat(4)), PAT.desertRun(hard), PAT.piranhaPipe(pipeH),
                        info(), PAT.desertRun(hard), PAT.warpPipe(pipeH),
                        PAT.goombas(2, 3), PAT.desertRun(hard)
                    ];
                    break;
                case 'forest':
                    // Layered tiers + verticality + koopas/spiny up in the trees.
                    s = [
                        PAT.forestTiers(), PAT.goombas(2, 4), PAT.gap(gapBase),
                        PAT.forestTiers(), PAT.spiny(), PAT.coinArc(),
                        cp(PAT.flat(4)), PAT.forestTiers(), PAT.spring(),
                        PAT.gap(gapBase), PAT.forestTiers(), PAT.piranhaPipe(pipeH),
                        PAT.hiddenBonus(), PAT.koopa(), PAT.forestTiers()
                    ];
                    break;
                case 'castle':
                case 'finalcastle':
                    // Dense hazards: lava-style gaps, piranha pipes, spiny, timing.
                    s = [
                        PAT.castleGap(gapBase), PAT.spiny(), PAT.piranhaPipe(pipeH),
                        PAT.castleGap(gapBase), PAT.goombas(2, 3), PAT.coinArc(),
                        cp(PAT.flat(4)), PAT.castleGap(gapBase + 1), PAT.spiny(),
                        PAT.piranhaPipe(pipeH), PAT.castleGap(gapBase), PAT.koopa(),
                        PAT.powerRow('S'), PAT.castleGap(gapBase), PAT.spiny()
                    ];
                    break;
                default:
                    s = [PAT.goombas(1), PAT.coinArc(), PAT.pipe(pipeH), cp(PAT.flat(4)), PAT.gap(gapBase), PAT.coinTrail(5)];
            }
            // Shared finale: reward → final challenge → run-up to the flag.
            var tail = [PAT.powerRow(hard ? 'S' : 'M'), PAT.coinTrail(5), PAT.flat(6)];
            return start.concat(s, tail);
        }

        function buildLevel(stage) {
            var built = buildSpine(stage);
            var spine = built.spine;

            // Measure total width and allocate the grid.
            var total = 0; spine.forEach(function (p) { total += p.width; });
            var pad = 6;
            var COLS = total + pad + 6;
            var grid = [];
            for (var x = 0; x < COLS; x++) grid.push(blankCol());

            // Ensure full ground floor first (patterns carve gaps where needed).
            fillGroundCols(grid, 0, COLS - 1);

            var cx = 2; var checkpointX = 0;
            // The CHECKPOINT zone is whichever pattern was tagged with cp().
            for (var i = 0; i < spine.length; i++) {
                spine[i].stamp(grid, cx);
                if (spine[i].checkpoint) checkpointX = cx;
                cx += spine[i].width;
            }

            // Flag pole near the end on solid ground.
            var flagX = cx + 1;
            fillGroundCols(grid, cx, COLS - 1);
            grid[flagX][up(1)] = 'F'; grid[flagX][up(2)] = 'F';
            grid[flagX][up(3)] = 'F'; grid[flagX][up(4)] = 'F'; grid[flagX][up(5)] = 'F';

            return { grid: grid, cols: COLS, flagX: flagX, checkpointX: checkpointX, seedInfo: built.seedInfo };
        }

        // ============================================================
        // VALIDATOR (Appendix F, lightweight) — guarantees the player can
        // physically walk/jump from spawn to the flag. Reports issues to the
        // console rather than blocking (the spine is pre-vetted by design).
        // ============================================================
        function validate(level) {
            var g = level.grid, COLS = level.cols, issues = [];
            // 1) No gap wider than the jump limit.
            var run = 0;
            for (var x = 0; x < COLS; x++) {
                var hasFloor = g[x][GROUND_R] === '#' || g[x][GROUND_R + 1] === '#';
                if (!hasFloor) { run++; if (run > MAX_JUMP_TILES_W) issues.push('gap>' + MAX_JUMP_TILES_W + ' @col ' + x); }
                else run = 0;
            }
            // 2) Start-safe: no enemy in the first 5 tiles (bible §2.2 / §7.1).
            for (var c = 0; c < 5; c++) for (var r = 0; r < ROWS; r++) {
                var ch = g[c][r];
                if (ch === 'g' || ch === 'k' || ch === 's') issues.push('enemy in start-safe @col ' + c);
            }
            // 3) Goal exists.
            if (level.flagX <= 0) issues.push('no goal');
            if (issues.length) console.warn('[retromario] level issues:', issues);
            return issues.length === 0;
        }

        // ============================================================
        // WORLD STATE — parse the grid into solids + live entities.
        // ============================================================
        var W;
        var stageNum = 1;           // current world (1..8)
        function buildWorld(stage) {
            stageNum = stage;
            var biomeKey = (WORLDS[stage - 1] || WORLDS[0]).biome;
            var biome = BIOMES[biomeKey];
            var isBoss = !!biome.boss;

            var level = buildLevel(stage);
            validate(level);
            var g = level.grid, COLS = level.cols;
            // Each stage maps its "?" blocks to a FIXED slice of INFOS, so the
            // same wedding piece always appears in the same place regardless of
            // how the stage was reached (normal, replay, or cheat stage-jump).
            var infoBase = stageInfoOffset(stage), infoLocal = 0;

            var world = {
                cols: COLS, grid: g, biome: biome, biomeKey: biomeKey, isBoss: isBoss,
                flagX: level.flagX * TILE, checkpointX: level.checkpointX * TILE,
                coins: [], enemies: [], boxes: [], pipes: [], springs: [], hidden: [], warps: [],
                infoTotal: 0, powerups: [], fireballs: [], particles: [],
                worldW: COLS * TILE, worldH: ROWS * TILE,
                flagReached: false, flagY: 0, boss: null
            };

            for (var x = 0; x < COLS; x++) {
                for (var r = 0; r < ROWS; r++) {
                    var ch = g[x][r];
                    if (ch === 'o') { world.coins.push({ x: x * TILE + 3, y: r * TILE + 2, taken: false, t: Math.random() * 6 }); g[x][r] = ' '; }
                    else if (ch === 'g') { world.enemies.push(mkEnemy(x, r, 'goomba')); g[x][r] = ' '; }
                    else if (ch === 'k') { world.enemies.push(mkEnemy(x, r, 'koopa')); g[x][r] = ' '; }
                    else if (ch === 's') { world.enemies.push(mkEnemy(x, r, 'spiny')); g[x][r] = ' '; }
                    else if (ch === 'P') { world.enemies.push(mkEnemy(x, r, 'piranha')); g[x][r] = ' '; }
                    else if (ch === 'W') { world.warps.push({ c: x, r: r }); g[x][r] = 'T'; } // drawn as pipe top, but warpable
                    else if (ch === '?' || ch === 'M' || ch === 'S' || ch === 'H' || ch === 'C') {
                        var box = { c: x, r: r, hit: false, bounce: 0, kind: 'coin' };
                        if (ch === '?') {
                            box.kind = 'info';
                            box.info = INFOS[(infoBase + infoLocal) % INFOS.length];
                            infoLocal++;
                            world.infoTotal++;
                        } else if (ch === 'C') box.kind = 'coin'; // plain coin question-block (NOT info)
                        else if (ch === 'M') box.kind = 'mushroom';
                        else if (ch === 'S') box.kind = 'star';
                        else if (ch === 'H') { box.kind = 'hidden'; box.hidden = true; }
                        world.boxes.push(box);
                        g[x][r] = box.hidden ? ' ' : 'Q';
                        if (box.hidden) world.hidden.push(box);
                    }
                    else if (ch === '^') { world.springs.push({ c: x, r: r, t: 0 }); g[x][r] = '^'; }
                    else if (ch === 'F') { world.flagY = Math.min(world.flagY || 9999, r * TILE); }
                }
            }

            // Boss world: spawn Boom-Boom-style boss near the flag run-up, and a
            // captured princess waiting at the goal to be rescued after the fight.
            if (isBoss) {
                world.boss = mkBoss(world.flagX / TILE - 6);
                world.princess = { x: world.flagX + 8, y: (GROUND_R - 2) * TILE, w: 12, h: 16, t: 0, rescued: false };
            }
            return world;
        }

        function mkEnemy(c, r, kind) {
            var base = { x: c * TILE, y: (GROUND_R - 1) * TILE, w: 14, h: 14, vx: -0.55, vy: 0,
                alive: true, squash: 0, kind: kind, t: Math.random() * 6 };
            if (kind === 'piranha') {
                base.x = c * TILE + 1; base.y = (r) * TILE; base.baseY = (r) * TILE; base.vx = 0; base.range = 24; base.up = false;
            }
            return base;
        }

        // Boss (Boom-Boom style, bible Appendix E §12): 3 stomps per phase, 3
        // phases. Walks/charges on the ground; faster each phase; invulnerable
        // briefly after a hit. Fair: stompable, never spawns off-screen attacks.
        function mkBoss(c) {
            return { x: c * TILE, y: (GROUND_R - 2) * TILE, w: 26, h: 28,
                vx: 1.1, vy: 0, alive: true, hp: 9, phase: 1, hitFlash: 0,
                invuln: 0, t: 0, jumpCd: 90, kind: 'boss' };
        }

        // ============================================================
        // SOLID TILE QUERIES
        // ============================================================
        function tileAt(c, r) {
            if (c < 0 || c >= W.cols || r < 0 || r >= ROWS) return r >= ROWS ? ' ' : '#';
            return W.grid[c][r];
        }
        function isSolid(ch) {
            return ch === '#' || ch === 'B' || ch === 'Q' || ch === 'X' ||
                   ch === '[' || ch === ']' || ch === 'T' || ch === 'U';
        }
        function solidAt(c, r) { return isSolid(tileAt(c, r)); }

        // ============================================================
        // PLAYER
        // ============================================================
        var player;
        function resetPlayer(atCheckpoint) {
            var spawnX = atCheckpoint && W.checkpointX ? W.checkpointX : 2 * TILE;
            player = {
                x: spawnX, y: (GROUND_R - 2) * TILE, w: 11, h: 14,
                vx: 0, vy: 0, onGround: false, face: 1,
                big: false, fire: false, star: 0, dead: false, deadT: 0,
                jumpHold: 0, jumping: false, invuln: 0, fireCd: 0, win: false,
                warpCd: 0,
                cheat: player ? player.cheat : false
            };
            jumpQueued = 0; coyote = 0; // clear buffered input on (re)spawn
        }

        // ============================================================
        // GAME-WIDE STATE
        // ============================================================
        var score = 0, coinGot = 0, lives = 3, time = 400, timeAcc = 0;
        var camX = 0;
        var keys = { left: false, right: false, up: false, down: false, jump: false, act: false };
        var jumpQueued = 0;     // frames remaining in the jump-press buffer
        var coyote = 0;         // frames remaining of coyote-time after leaving ground
        var running = false, started = false;
        var animT = 0;          // global animation clock (frames) for sprite cycles
        var fireworks = [];     // celebratory firework bursts (final victory cutscene)
        var fwActive = 0;       // frames remaining of the firework celebration

        var elCoins = document.getElementById('rm-coins');
        var elScore = document.getElementById('rm-score');
        var elWorld = document.getElementById('rm-world');
        var elToast = document.getElementById('rm-toast');

        function setHUD() {
            if (elCoins) elCoins.textContent = '×' + ('00' + coinGot).slice(-2);
            if (elScore) elScore.textContent = ('000000' + score).slice(-6);
            if (elWorld) elWorld.textContent = (WORLDS[stageNum - 1] || WORLDS[0]).name;
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
        // INVENTORY (top-right) + MODALS (clone invitation sections)
        // ============================================================
        var invHost = document.getElementById('rm-inv');
        var invButtons = {};

        function pixIcon(canvasEl, key) {
            // Draw a tiny 16×16 pixel icon per info type.
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
            else if (key === 'gift') { px(3, 6, 10, 7); px(2, 4, 12, 2); px(7, 2, 2, 11); c.fillStyle = '#fff'; }
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
                btn.className = 'rm-inv-item';
                btn.type = 'button';
                btn.title = info.label;
                var cv = document.createElement('canvas');
                cv.width = 16; cv.height = 16;
                btn.appendChild(cv);
                pixIcon(cv, info.key);
                var badge = document.createElement('span');
                badge.className = 'rm-badge';
                btn.appendChild(badge);
                btn.addEventListener('click', function () {
                    if (btn.classList.contains('is-enabled')) {
                        btn.classList.remove('has-new');       // clear the "new" badge on first view
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

        // Unlock an info piece WITHOUT opening its modal — the guest gets a
        // toast + an enabled, badged quick-access icon to open at will.
        function unlockInfo(info) {
            var first = !unlocked[info.key];
            unlocked[info.key] = true;
            var btn = invButtons[info.key];
            if (btn) {
                btn.classList.add('is-enabled');
                if (!seenInfo[info.key]) btn.classList.add('has-new', 'just-unlocked');
                setTimeout(function () { if (btn) btn.classList.remove('just-unlocked'); }, 520);
            }
            // If this was the LAST piece, the invitation is now fully unlocked —
            // grant the "view invitation" shortcut and announce it once.
            if (allInfoUnlocked()) {
                updateViewBtn();
                if (!announcedAll) { announcedAll = true; setTimeout(announceAllCollected, 900); }
            }
            persist();
            return first;
        }

        // One-time celebratory farewell shown the moment the final info-block is
        // collected manually: tells the guest the whole invitation is now open.
        function announceAllCollected() {
            playSfx('win');
            toast('🎉 SEMUA INFO TERKUMPUL! 🎉<br>' +
                  '<span style="font-size:8px;color:#fac000">Undangan kini bisa dibuka — ketuk ikon 📑 di kiri</span>',
                  3200);
            if (viewBtn) viewBtn.classList.add('just-unlocked');
            setTimeout(function () { if (viewBtn) viewBtn.classList.remove('just-unlocked'); }, 700);
        }

        var modalRoot = document.getElementById('rm-modal-root');
        var modalBody = document.getElementById('rm-modal-body');
        var modalTitle = document.getElementById('rm-modal-title');
        var modalIco = document.getElementById('rm-modal-ico');

        function openModal(info) {
            var sec = document.querySelector('.rm-sec[data-info="' + info.key + '"]');
            if (!sec || !modalRoot) return;
            modalBody.innerHTML = '';
            var clone = sec.cloneNode(true);
            clone.classList.add('rm-modal-clone');
            modalBody.appendChild(clone);
            if (info.key === 'schedule') renderCalendar(clone.querySelector('.rm-cal'));
            modalTitle.textContent = info.label;
            if (modalIco) { modalIco.width = 14; modalIco.height = 14; pixIcon(modalIco, info.key); }
            modalRoot.classList.add('show');
            playSfx('modal');
        }
        function closeModal() { if (modalRoot) modalRoot.classList.remove('show'); }
        var mc = document.getElementById('rm-modal-close');
        if (mc) mc.addEventListener('click', closeModal);
        if (modalRoot) modalRoot.addEventListener('click', function (e) { if (e.target === modalRoot) closeModal(); });

        // ============================================================
        // LIGHTBOX — fullscreen gallery photo viewer with prev/next.
        // Delegated click on any .rm-gallery-item img (in the cloned modal OR
        // the full invitation). Collects the sibling gallery's images so the
        // guest can swipe/step through the whole set.
        // ============================================================
        var lb = document.getElementById('rm-lightbox');
        var lbImg = document.getElementById('rm-lightbox-img');
        var lbCount = document.getElementById('rm-lightbox-count');
        var lbList = [], lbIdx = 0;
        function lbShow(i) {
            if (!lbList.length) return;
            lbIdx = (i + lbList.length) % lbList.length;
            if (lbImg) lbImg.src = lbList[lbIdx];
            if (lbCount) lbCount.textContent = (lbIdx + 1) + ' / ' + lbList.length;
        }
        function openLightbox(imgEl) {
            // Gather all gallery images that share this grid (fallback: all on page).
            var grid = imgEl.closest ? imgEl.closest('.rm-gallery-grid') : null;
            var imgs = grid ? grid.querySelectorAll('img') : document.querySelectorAll('.rm-gallery-item img');
            lbList = []; var start = 0;
            for (var k = 0; k < imgs.length; k++) {
                var src = imgs[k].currentSrc || imgs[k].src;
                if (!src || src.indexOf('{{') >= 0) continue;
                if (imgs[k] === imgEl) start = lbList.length;
                lbList.push(src);
            }
            if (!lbList.length) return;
            lbShow(start);
            if (lb) lb.classList.add('show');
            playSfx('modal');
        }
        function closeLightbox() { if (lb) lb.classList.remove('show'); }
        if (lb) {
            // Delegated: catch clicks on any gallery image anywhere in the theme.
            var galleryClick = function (e) {
                var t = e.target;
                if (t && t.tagName === 'IMG' && t.closest && t.closest('.rm-gallery-item')) {
                    e.preventDefault(); openLightbox(t);
                }
            };
            document.addEventListener('click', galleryClick);
            onCleanup(function () { document.removeEventListener('click', galleryClick); });
            lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
            var lbC = document.getElementById('rm-lightbox-close');
            var lbP = document.getElementById('rm-lightbox-prev');
            var lbN = document.getElementById('rm-lightbox-next');
            if (lbC) lbC.addEventListener('click', closeLightbox);
            if (lbP) lbP.addEventListener('click', function () { lbShow(lbIdx - 1); });
            if (lbN) lbN.addEventListener('click', function () { lbShow(lbIdx + 1); });
            onCleanup(function () { closeLightbox(); });
        }

        // ============================================================
        // AUDIO — tiny WebAudio blips (no asset dependency)
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
            if (type === 'jump') tone(420, 760, 0.16, 0.06);
            else if (type === 'coin') { tone(988, 1319, 0.09, 0.06); }
            else if (type === 'stomp') tone(300, 120, 0.12, 0.07);
            else if (type === 'power') { tone(523, 1046, 0.18, 0.07); }
            else if (type === 'unlock') { tone(659, 988, 0.12, 0.08); setTimeout(function () { tone(988, 1319, 0.14, 0.08); }, 90); }
            else if (type === 'modal') tone(740, 1100, 0.1, 0.06);
            else if (type === 'die') { tone(330, 80, 0.5, 0.09, 'triangle'); }
            else if (type === 'win') { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, f, 0.16, 0.08); }, i * 130); }); }
            else if (type === 'warp') { tone(880, 220, 0.32, 0.08, 'sine'); }
            else if (type === 'bosshit') { tone(180, 60, 0.22, 0.1, 'sawtooth'); }
            else if (type === 'bump') tone(160, 90, 0.08, 0.06);
        }

        // ============================================================
        // INPUT
        // ============================================================
        function bindKey() {
            function kd(e) {
                // Ignore OS key-repeat: a held key must NOT re-trigger a jump
                // press every frame (that caused auto-bunny-hopping and made
                // "move + jump together" feel stuck). Movement keys can repeat
                // harmlessly since they only set a boolean.
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
                else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
                else if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
                else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
                    keys.jump = true; keys.up = true; e.preventDefault();
                    if (!e.repeat) jumpQueued = JUMP_BUFFER; // buffer a fresh press only
                }
                else if (e.code === 'KeyE') { if (!e.repeat) doAction(); keys.act = true; }
                else if (e.code === 'Escape') { closeLightbox(); closeModal(); }
            }
            function ku(e) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
                else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
                else if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
                else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') { keys.jump = false; keys.up = false; }
                else if (e.code === 'KeyE') keys.act = false;
            }
            // If focus is lost mid-press (alt-tab, devtools, OS shortcut), the
            // keyup never arrives and a key stays "stuck down" → the character
            // runs forever. Clear all input on blur to prevent that.
            function clearKeys() { keys.left = keys.right = keys.up = keys.down = keys.jump = keys.act = false; jumpQueued = 0; }
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

        // Analog joystick: a draggable nub that maps its offset to 4-way input
        // (left/right/up/down), so the guest can also press DOWN to enter a
        // warp pipe — just like a real Mario d-pad.
        function bindJoystick() {
            var joy = document.getElementById('rm-joy');
            var nub = document.getElementById('rm-joy-nub');
            if (!joy || !nub) return;
            var activeId = null, cx = 0, cy = 0, R = 0;
            var DEAD = 0.34;       // dead-zone fraction before a direction registers

            function setDir(dx, dy) {
                var mag = Math.sqrt(dx * dx + dy * dy) || 1;
                var nx = dx / Math.max(mag, R), ny = dy / Math.max(mag, R);
                // Clamp the visible nub to the ring.
                var clampMag = Math.min(mag, R);
                var ux = (dx / mag) * clampMag, uy = (dy / mag) * clampMag;
                nub.style.transform = 'translate(' + ux.toFixed(1) + 'px,' + uy.toFixed(1) + 'px)';
                var fx = dx / R, fy = dy / R;
                keys.left  = fx < -DEAD;
                keys.right = fx >  DEAD;
                keys.up    = fy < -DEAD;
                keys.down  = fy >  DEAD;
                // Up is a look-up/neutral direction here; jumping is the
                // dedicated A button. Down is used to dive into warp pipes.
                joy.classList.toggle('dir-left', keys.left);
                joy.classList.toggle('dir-right', keys.right);
                joy.classList.toggle('dir-up', keys.up);
                joy.classList.toggle('dir-down', keys.down);
            }
            function release() {
                activeId = null;
                nub.style.transform = 'translate(0,0)';
                keys.left = keys.right = keys.up = keys.down = keys.jump = false;
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
            function move(e) {
                if (activeId === null) return;
                e.preventDefault();
                var p = pos(e); setDir(p.x - cx, p.y - cy);
            }
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

        function doAction() {
            if (player.fire && player.fireCd <= 0 && W.fireballs.length < 2) {
                W.fireballs.push({ x: player.x + (player.face > 0 ? player.w : -4), y: player.y + 4,
                    vx: player.face * 4, vy: 2, alive: true, bounces: 0 });
                player.fireCd = 18;
                playSfx('jump');
            }
        }

        // ============================================================
        // PHYSICS STEP
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
                    for (var c2 = c0; c2 <= c1; c2++) if (solidAt(c2, rT)) { p.y = (rT + 1) * TILE; p.vy = 0; bumpBlock(c2, rT); break; }
                }
            }
        }

        function bumpBlock(c, r) {
            for (var i = 0; i < W.boxes.length; i++) {
                var b = W.boxes[i];
                if (b.c === c && b.r === r && !b.hit) { triggerBox(b); return; }
                if (b.hidden && !b.hit && b.c === c && b.r === r) { triggerBox(b); return; }
            }
            playSfx('bump');
        }

        function triggerBox(b) {
            b.hit = true; b.bounce = 6;
            W.grid[b.c][b.r] = 'X';
            if (b.kind === 'info') {
                var fresh = unlockInfo(b.info);
                addScore(200);
                playSfx('unlock');
                spawnParticles(b.c * TILE + 8, b.r * TILE, '#fac000', 8);
                // Notify only — DO NOT auto-open. The quick-access icon lights up.
                toast('INFO TERBUKA: ' + b.info.label + '<br><span style="font-size:8px;color:#fac000">Ketuk ikon ▶ untuk membaca</span>', 1900);
            } else if (b.kind === 'mushroom') {
                spawnPowerup(b, player.big ? 'flower' : 'mushroom');
                playSfx('power');
            } else if (b.kind === 'star') {
                spawnPowerup(b, 'star'); playSfx('power');
            } else if (b.kind === 'hidden') {
                coinGot++; addScore(100); playSfx('coin');
                spawnParticles(b.c * TILE + 8, b.r * TILE, '#fac000', 6);
                toast('RAHASIA! +100', 1200);
            } else {
                coinGot++; addScore(100); playSfx('coin');
            }
        }

        function spawnPowerup(b, kind) {
            W.powerups.push({ x: b.c * TILE, y: (b.r - 1) * TILE, w: 13, h: 13, vx: 0.8, vy: -2, kind: kind, alive: true, t: 0 });
        }

        function spawnParticles(x, y, color, n) {
            for (var i = 0; i < n; i++) {
                W.particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 2.4, vy: -1 - Math.random() * 2.2,
                    life: 24 + Math.random() * 14, color: color });
            }
        }

        // Underground bonus room reached via a warp pipe (down on 'W' pipe top).
        // The bible's warp pipe must never lock the player out (§6.2), so this
        // is a reward-in-place "bonus room": a coin-heaven arc bursts above the
        // pipe (immediately collectable) plus bonus score, then a short
        // cooldown so a single press doesn't fire repeatedly.
        function enterWarp(wp) {
            player.warpCd = 45;
            playSfx('warp');
            // Coins appear in a low arc just above the pipe — within one jump of
            // the pipe top, so they are always fairly collectable (no blind/
            // unreachable bonus). 8 coins centred on the pipe mouth.
            var mouthX = (wp.c + 1) * TILE - 4, topY = player.y - 6;
            for (var i = 0; i < 8; i++) {
                var ox = (i - 3.5) * 11;
                var oy = -Math.max(0, 14 - Math.abs(i - 3.5) * 4); // shallow arc
                W.coins.push({ x: mouthX + ox, y: topY + oy, taken: false, t: Math.random() * 6 });
            }
            addScore(300);
            toast('WARP! +300<br><span style="font-size:8px">Koin bonus muncul</span>', 1600);
            spawnParticles(player.x + player.w / 2, player.y, '#fac000', 10);
        }

        function stepPlayer() {
            // Pit handling has TWO cases, both keyed off the player dropping
            // below the ground band:
            //   • cheat ON  → no death (cheat = invincible), but a pit must not
            //     swallow Mario into the void forever. Rescue him: lift back to
            //     the surface and nudge forward past the gap. (This was the
            //     "Mario hilang tapi arrow jalan" bug — cheat skipped die().)
            //   • cheat OFF → force a normal death + respawn (like a monster).
            if (!player.dead && player.y > (GROUND_R + 2) * TILE) {
                if (player.cheat) {
                    rescueFromPit();
                } else {
                    player.dead = true; player.deadT = 0; player.vy = -7; playSfx('die');
                }
            }
            if (player.dead) {
                player.deadT++;
                // Brief in-place death hop, then respawn — same as a monster hit.
                player.vy += GRAV * 0.6; player.y += player.vy;
                if (player.deadT > 48) respawn();
                return;
            }
            if (player.win) return;

            var gravMul = W.biome.gravMul || 1;

            var max = (keys.left || keys.right) && Math.abs(player.vx) > MAXVX - 0.2 ? RUN_MAX : MAXVX;
            if (keys.left) { player.vx -= MOVE; player.face = -1; }
            if (keys.right) { player.vx += MOVE; player.face = 1; }
            if (!keys.left && !keys.right) player.vx *= FRICTION;
            player.vx = clamp(player.vx, -max, max);
            if (Math.abs(player.vx) < 0.05) player.vx = 0;

            // Jump (with variable height via hold). Buffered + coyote-timed so
            // a press slightly before landing OR just after leaving a ledge
            // still fires — makes simultaneous move+jump reliable.
            coyote = player.onGround ? COYOTE : Math.max(0, coyote - 1);
            if (jumpQueued > 0 && (player.onGround || coyote > 0)) {
                player.vy = JUMP_V; player.onGround = false; player.jumping = true; player.jumpHold = JUMP_HOLD_FRAMES;
                jumpQueued = 0; coyote = 0;
                playSfx('jump');
            } else if (jumpQueued > 0) {
                jumpQueued--;   // keep the buffer ticking until it fires or expires
            }
            // Variable height only while the jump key is still held.
            if (player.jumping && keys.jump && player.jumpHold > 0) { player.vy -= JUMP_HOLD; player.jumpHold--; }
            else player.jumping = false;

            player.vy += GRAV * gravMul; player.vy = Math.min(player.vy, MAX_FALL);
            player.onGround = false;

            player.x += player.vx; collideAxis(player, 'x');
            player.y += player.vy; collideAxis(player, 'y');

            // Warp pipes: press DOWN while standing on a 'W' pipe top.
            if (player.warpCd > 0) player.warpCd--;
            if (keys.down && player.onGround && player.warpCd <= 0) {
                for (var wi = 0; wi < W.warps.length; wi++) {
                    var wp = W.warps[wi];
                    var wpx = (wp.c + 1) * TILE; // pipe mouth centre (two-wide pipe: c..c+1)
                    if (Math.abs((player.x + player.w / 2) - wpx) < TILE) { enterWarp(wp); break; }
                }
            }

            // Springs
            for (var s = 0; s < W.springs.length; s++) {
                var sp = W.springs[s];
                var sx = sp.c * TILE, sy = (sp.r) * TILE;
                if (player.x + player.w > sx && player.x < sx + TILE &&
                    player.y + player.h >= sy - 2 && player.y + player.h <= sy + 8 && player.vy >= 0) {
                    player.vy = JUMP_V * 1.5; player.onGround = false; sp.t = 8; playSfx('jump');
                }
            }

            // World bounds
            if (player.x < 0) { player.x = 0; player.vx = 0; }
            if (player.x + player.w > W.worldW) player.x = W.worldW - player.w;

            // Fall into a pit: the moment the player drops below the bottom of
            // the ground band they've fallen through a gap → forced death (kills
            // even big/star/invuln Mario, bible §8.1), then respawn. Triggering
            // at the ground band (not the far world floor) guarantees it fires.
            if (player.y > (GROUND_R + 2) * TILE) die(true);

            // Timers
            if (player.invuln > 0) player.invuln--;
            if (player.fireCd > 0) player.fireCd--;
            if (player.star > 0) { player.star--; if (player.star === 0) toast('Bintang habis'); }

            // Reached flag? (boss worlds gate the flag behind the boss)
            if (!W.flagReached && player.x + player.w >= W.flagX) {
                if (W.isBoss && W.boss && W.boss.alive) {
                    // Push back: must defeat the boss first.
                    player.x = W.flagX - player.w - 2; player.vx = 0;
                } else {
                    reachFlag();
                }
            }

            collectCoins();
            collectPowerups();
        }

        function collectCoins() {
            for (var i = 0; i < W.coins.length; i++) {
                var co = W.coins[i];
                if (co.taken) continue;
                if (player.x + player.w > co.x - 2 && player.x < co.x + 12 &&
                    player.y + player.h > co.y - 2 && player.y < co.y + 14) {
                    co.taken = true; coinGot++; addScore(100); playSfx('coin');
                    if (coinGot % 100 === 0) { lives++; toast('1-UP!'); }
                }
            }
        }

        function collectPowerups() {
            for (var i = 0; i < W.powerups.length; i++) {
                var pu = W.powerups[i]; if (!pu.alive) continue;
                pu.t++; pu.vy += GRAV * 0.5; pu.vy = Math.min(pu.vy, 4);
                var below = Math.floor((pu.y + pu.h) / TILE), pc = Math.floor((pu.x + pu.w / 2) / TILE);
                if (solidAt(pc, below)) { pu.y = below * TILE - pu.h; pu.vy = 0; }
                if (pu.kind === 'star') { if (pu.vy === 0) pu.vy = -3; }
                pu.x += pu.vx; pu.y += pu.vy;
                var cAhead = Math.floor((pu.x + (pu.vx > 0 ? pu.w : 0)) / TILE), rMid = Math.floor((pu.y + pu.h / 2) / TILE);
                if (solidAt(cAhead, rMid)) pu.vx *= -1;
                if (pu.x < 0 || pu.x > W.worldW) pu.alive = false;

                if (player.x + player.w > pu.x && player.x < pu.x + pu.w &&
                    player.y + player.h > pu.y && player.y < pu.y + pu.h) {
                    pu.alive = false;
                    if (pu.kind === 'mushroom') { setBig(true); addScore(1000); toast('SUPER!'); }
                    else if (pu.kind === 'flower') { setBig(true); player.fire = true; addScore(1000); toast('FIRE POWER!'); }
                    else if (pu.kind === 'star') { player.star = 600; addScore(1000); toast('★ INVINCIBLE ★'); }
                    playSfx('power');
                }
            }
            W.powerups = W.powerups.filter(function (p) { return p.alive; });
        }

        function setBig(b) { player.big = b; player.h = b ? 22 : 14; }

        // `force` = an unavoidable death (pit / timer): kills regardless of
        // size, star, or invulnerability frames (bible §8.1, §10.3 — star does
        // NOT protect against pits). Cheat mode still bypasses everything.
        function die(force) {
            if (player.dead) return;
            if (player.cheat) return;
            if (!force) {
                if (player.star > 0 || player.invuln > 0) return;
                if (player.big) { setBig(false); player.fire = false; player.invuln = 90; playSfx('stomp'); return; }
            }
            player.dead = true; player.deadT = 0; player.vy = -7; playSfx('die');
        }

        function respawn() {
            lives--;
            if (lives <= 0) { lives = 3; score = 0; setHUD(); }
            var atCp = player.x > W.checkpointX && W.checkpointX > 0;
            resetPlayer(atCp);
            camX = clamp(player.x - VW / 3, 0, W.worldW - VW);
            time = 400;
        }

        // Cheat-mode pit rescue: never die, never fall into the void. Find the
        // nearest solid ground column at/after the player's x and set them on
        // top of it (scanning forward, then backward as a fallback).
        function rescueFromPit() {
            var col = Math.floor((player.x + player.w / 2) / TILE);
            function groundTopRow(c) {
                for (var r = 0; r < ROWS; r++) if (solidAt(c, r)) return r;
                return -1;
            }
            var found = -1, fc = col;
            for (var d = 0; d < W.cols; d++) {
                var cf = col + d, cb = col - d;
                if (cf < W.cols) { var rf = groundTopRow(cf); if (rf >= 0) { found = rf; fc = cf; break; } }
                if (cb >= 0)      { var rb = groundTopRow(cb); if (rb >= 0) { found = rb; fc = cb; break; } }
            }
            if (found < 0) { found = GROUND_R; fc = col; } // safety fallback
            player.x = fc * TILE;
            player.y = found * TILE - player.h;
            player.vx = 0; player.vy = 0; player.onGround = true;
        }

        // ============================================================
        // ENEMIES
        // ============================================================
        function stepEnemies() {
            for (var i = 0; i < W.enemies.length; i++) {
                var e = W.enemies[i];
                if (!e.alive) { if (e.squash > 0) e.squash--; continue; }
                e.t += 0.1;

                if (e.kind === 'piranha') {
                    var near = Math.abs((player.x + player.w / 2) - (e.x + 7)) < 28;
                    var target = near ? e.baseY + 16 : e.baseY - e.range;
                    e.y += (target - e.y) * 0.06;
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
                    if ((e.kind === 'spiny') && e.vy === 0) {
                        var aheadFoot = Math.floor((e.x + (dir > 0 ? e.w + 1 : -1)) / TILE);
                        if (!solidAt(aheadFoot, footR + 1)) e.vx *= -1;
                    }
                    if (e.x < 0) { e.x = 0; e.vx *= -1; }
                    if (e.y > ROWS * TILE + 60) e.alive = false;
                }

                if (player.dead || player.win) continue;
                if (rectHit(player, e)) {
                    var stomp = player.vy > 0 && (player.y + player.h) - e.y < 10;
                    if (player.star > 0 || player.cheat) { killEnemy(e); addScore(200); }
                    else if (e.kind === 'spiny' || e.kind === 'piranha') { die(); }
                    else if (stomp) { stompEnemy(e); }
                    else { die(); }
                }
            }
            stepBoss();
            // fireballs vs enemies
            for (var f = 0; f < W.fireballs.length; f++) {
                var fb = W.fireballs[f]; if (!fb.alive) continue;
                for (var j = 0; j < W.enemies.length; j++) {
                    var en = W.enemies[j];
                    if (en.alive && Math.abs(fb.x - en.x) < 12 && Math.abs(fb.y - en.y) < 12) {
                        if (en.kind !== 'piranha') { killEnemy(en); addScore(200); }
                        fb.alive = false;
                    }
                }
                // fireballs also hurt the boss
                if (W.boss && W.boss.alive && fb.alive && W.boss.invuln <= 0 &&
                    Math.abs(fb.x - (W.boss.x + W.boss.w / 2)) < 18 && Math.abs(fb.y - (W.boss.y + W.boss.h / 2)) < 18) {
                    hitBoss(); fb.alive = false;
                }
            }
        }

        // Boss step (boss world only). Boom-Boom-style: walk + charge, jump
        // occasionally, stompable, 3 phases (faster each), brief invuln on hit.
        function stepBoss() {
            var b = W.boss; if (!b || !b.alive) return;
            b.t += 1;
            if (b.invuln > 0) b.invuln--;
            if (b.hitFlash > 0) b.hitFlash--;

            // gravity + ground
            b.vy += GRAV; b.vy = Math.min(b.vy, MAX_FALL);
            b.x += b.vx; b.y += b.vy;
            var footR = Math.floor((b.y + b.h) / TILE), cMid = Math.floor((b.x + b.w / 2) / TILE);
            if (solidAt(cMid, footR)) { b.y = footR * TILE - b.h; b.vy = 0; }
            // turn on walls / patrol an arena band around the run-up
            var dir = b.vx > 0 ? 1 : -1;
            var aheadC = Math.floor((b.x + (dir > 0 ? b.w : 0)) / TILE);
            if (solidAt(aheadC, Math.floor((b.y + b.h / 2) / TILE))) b.vx *= -1;
            // keep the boss in front of the flag so the player can't slip past
            var arenaL = W.flagX - 9 * TILE, arenaR = W.flagX - TILE;
            if (b.x < arenaL) { b.x = arenaL; b.vx = Math.abs(b.vx); }
            if (b.x + b.w > arenaR) { b.x = arenaR - b.w; b.vx = -Math.abs(b.vx); }

            // occasional telegraphed jump (predictable, fair)
            b.jumpCd--;
            if (b.jumpCd <= 0 && b.vy === 0) { b.vy = JUMP_V * 0.9; b.jumpCd = 80 - b.phase * 14; }

            if (player.dead || player.win) return;
            if (rectHit(player, b)) {
                var stomp = player.vy > 0 && (player.y + player.h) - b.y < 12;
                if (player.star > 0 || player.cheat) { hitBoss(); player.vy = JUMP_V * 0.5; }
                else if (stomp && b.invuln <= 0) { hitBoss(); player.vy = JUMP_V * 0.6; }
                else if (!stomp) { die(); }
            }
        }
        function hitBoss() {
            var b = W.boss; if (!b || !b.alive || b.invuln > 0) return;
            b.hp--; b.invuln = 40; b.hitFlash = 12; playSfx('bosshit');
            spawnParticles(b.x + b.w / 2, b.y, '#fff', 8);
            addScore(500);
            var newPhase = b.hp > 6 ? 1 : (b.hp > 3 ? 2 : 3);
            if (newPhase !== b.phase) {
                b.phase = newPhase;
                b.vx = (b.vx > 0 ? 1 : -1) * (1.1 + b.phase * 0.5); // faster each phase
                toast('BOSS PHASE ' + b.phase + '!', 1100);
            }
            if (b.hp <= 0) {
                b.alive = false;
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#fac000', 20);
                addScore(3000);
                toast('BOSS KALAH! +3000<br><span style="font-size:8px;color:#ff7ab6">Selamatkan sang putri di ujung! ▶</span>', 2200);
            }
        }

        function rectHit(a, b) {
            return a.x + a.w > b.x + 1 && a.x < b.x + b.w - 1 &&
                   a.y + a.h > b.y + 1 && a.y < b.y + b.h - 1;
        }
        function stompEnemy(e) {
            e.alive = false; e.squash = 16; player.vy = JUMP_V * 0.55; addScore(100);
            playSfx('stomp'); spawnParticles(e.x + 7, e.y, '#fff', 4);
        }
        function killEnemy(e) { e.alive = false; e.squash = 16; spawnParticles(e.x + 7, e.y, '#fff', 5); playSfx('stomp'); }

        function stepFireballs() {
            for (var i = 0; i < W.fireballs.length; i++) {
                var f = W.fireballs[i]; if (!f.alive) continue;
                f.vy += GRAV * 0.6; f.x += f.vx; f.y += f.vy;
                var c = Math.floor(f.x / TILE), r = Math.floor((f.y + 4) / TILE);
                if (solidAt(c, r)) { f.vy = -3.2; f.bounces++; if (f.bounces > 4) f.alive = false; }
                if (f.x < camX - 20 || f.x > camX + VW + 20) f.alive = false;
            }
            W.fireballs = W.fireballs.filter(function (f) { return f.alive; });
            W.particles = W.particles.filter(function (p) { p.life--; p.x += p.vx; p.y += p.vy; p.vy += 0.15; return p.life > 0; });
        }

        // ============================================================
        // FLAG / WIN / STAGE PROGRESSION
        // ============================================================
        function reachFlag() {
            W.flagReached = true; player.win = true; player.vx = 0;
            addScore(2000 + time * 10);
            bestScore = Math.max(bestScore, score);
            bestStage = Math.max(bestStage, stageNum);
            persist();
            playSfx('win');
            if (stageNum >= TOTAL_STAGES) {
                // FINAL VICTORY — princess rescued. Play a fireworks celebration
                // cutscene, then reveal the happy-ending narration. Unlock all
                // invitation pieces so the guest is never locked out.
                completed = true;
                if (W.princess) W.princess.rescued = true;
                INFOS.forEach(function (info) {
                    if (!unlocked[info.key]) { unlocked[info.key] = true; var btn = invButtons[info.key]; if (btn) btn.classList.add('is-enabled'); }
                });
                updateViewBtn();
                persist();
                startFireworks();                       // celebration keeps the loop running
                toast('♥ SANG PUTRI SELAMAT! ♥', 2400);
                setTimeout(showWin, 3200);              // let the fireworks play first
            } else {
                setTimeout(showStageClear, 1100);
            }
        }

        // ---- Fireworks celebration (final victory cutscene) ----
        function startFireworks() { fwActive = 240; fireworks = []; }
        function spawnFirework(cx, cy) {
            var cols = ['#ff5a55', '#fac000', '#43b047', '#7aa8ff', '#ff7ab6', '#ffffff'];
            var col = cols[Math.floor((animT + fireworks.length) % cols.length)];
            var n = 16;
            for (var i = 0; i < n; i++) {
                var ang = (Math.PI * 2 * i) / n, spd = 1.4 + (i % 3) * 0.5;
                fireworks.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 36 + (i % 8), color: col });
            }
            playSfx('coin');
        }
        function stepFireworks() {
            if (fwActive > 0) {
                fwActive--;
                // launch a new burst roughly every ~22 frames at varied spots
                if (fwActive % 22 === 0) {
                    var bx = camX + 40 + (animT * 53 % (VW - 80));
                    var by = camY + 30 + (animT * 31 % 60);
                    spawnFirework(bx, by);
                }
            }
            for (var i = 0; i < fireworks.length; i++) {
                var p = fireworks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life--;
            }
            fireworks = fireworks.filter(function (p) { return p.life > 0; });
        }

        function showStageClear() {
            running = false;
            var titleEl = document.getElementById('rm-stage-title');
            var textEl = document.getElementById('rm-stage-text');
            var nextWorld = WORLDS[stageNum]; // next index
            if (titleEl) titleEl.textContent = 'WORLD ' + (WORLDS[stageNum - 1] || WORLDS[0]).name + ' CLEAR!';
            if (textEl) {
                textEl.innerHTML = 'Skor: <strong>' + score + '</strong><br>' +
                    'Lanjut ke <strong>WORLD ' + (nextWorld ? nextWorld.name : '?') + '</strong>' +
                    (nextWorld && nextWorld.biome === 'finalcastle' ? '<br><span style="color:#e52521">⚠ BOSS MENANTI!</span>' : '');
            }
            showOverlay('rm-stageclear');
        }

        function showWin() {
            running = false;
            var winText = document.getElementById('rm-win-text');
            var titleEl = document.querySelector('#rm-win .rm-overlay-pixtitle');
            var groom = val('groom_nickname', 'Mempelai Pria');
            var bride = val('bride_nickname', 'Mempelai Wanita');
            if (titleEl) titleEl.innerHTML = '♥ HAPPY ENDING ♥';
            if (winText) {
                // Happy-ending narration: the hero rescues the princess; the tale
                // becomes the couple's own. Personalised with the couple nicknames.
                winText.innerHTML =
                    '<div style="color:#ffd24a;font-size:11px;line-height:1.9;margin-bottom:10px">' +
                    'Setelah melewati 8 dunia penuh rintangan dan mengalahkan sang Boss, ' +
                    'akhirnya <strong>' + esc(groom) + '</strong> berhasil menyelamatkan ' +
                    'sang putri, <strong>' + esc(bride) + '</strong>! 🏰💖' +
                    '</div>' +
                    '<div style="font-size:11px;line-height:1.9;color:rgba(255,255,255,0.9)">' +
                    'Petualangan terhebat bukanlah mengalahkan musuh, melainkan menemukan ' +
                    'seseorang untuk menjalani semua level kehidupan bersama. ' +
                    'Dua hati kini bersatu menuju level terindah: <strong>pernikahan</strong>. ' +
                    '🎆 Selamat! Kamu telah menyelesaikan misi — kini bukalah undangan kami. 🎆' +
                    '</div>' +
                    '<div style="font-size:9px;margin-top:12px;color:rgba(255,255,255,0.6)">' +
                    'Skor ' + score + ' · Koin ' + coinGot + ' · Terbaik ' + bestScore +
                    (player.cheat ? ' · <span style="color:#e52521">CHEAT</span>' : '') + '</div>';
            }
            showOverlay('rm-win');
        }
        // Minimal HTML-escape for names injected into innerHTML.
        function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

        // ============================================================
        // CAMERA + RENDER
        // ============================================================
        function updateCamera() {
            var target = player.x - VW / 3;
            camX += (target - camX) * 0.16;
            camX = clamp(camX, 0, Math.max(0, W.worldW - VW));
        }

        function drawTile(ch, sx, sy) {
            var B = W.biome;
            switch (ch) {
                case '#':
                    ctx.fillStyle = B.ground; ctx.fillRect(sx, sy, TILE, TILE);
                    // grassy/biome top cap with a lighter sun edge
                    ctx.fillStyle = B.groundTop; ctx.fillRect(sx, sy, TILE, 4);
                    ctx.fillStyle = shade(B.groundTop, 0.3); ctx.fillRect(sx, sy, TILE, 1);
                    // speckled texture (two-tone) for depth
                    ctx.fillStyle = B.groundDark;
                    ctx.fillRect(sx + 2, sy + 6, 4, 3); ctx.fillRect(sx + 9, sy + 6, 4, 3);
                    ctx.fillRect(sx + 5, sy + 11, 5, 3);
                    ctx.fillStyle = shade(B.ground, 0.18);
                    ctx.fillRect(sx + 7, sy + 6, 1, 3); ctx.fillRect(sx + 1, sy + 12, 2, 1);
                    // subtle right/bottom shadow seam between tiles
                    ctx.fillStyle = shade(B.ground, -0.25);
                    ctx.fillRect(sx + TILE - 1, sy + 4, 1, TILE - 4); ctx.fillRect(sx, sy + TILE - 1, TILE, 1);
                    break;
                case 'B':
                    ctx.fillStyle = '#b86a2c'; ctx.fillRect(sx, sy, TILE, TILE);
                    ctx.fillStyle = '#d98a44'; ctx.fillRect(sx, sy, TILE, 1.5);            // top bevel light
                    ctx.fillStyle = '#7a3d12'; ctx.fillRect(sx, sy + TILE - 1.5, TILE, 1.5); // bottom shade
                    ctx.fillStyle = '#7a3d12';                                              // mortar lines
                    ctx.fillRect(sx, sy + 5, TILE, 1); ctx.fillRect(sx, sy + 10.5, TILE, 1);
                    ctx.fillRect(sx + 8, sy + 1, 1, 4); ctx.fillRect(sx + 4, sy + 6, 1, 4); ctx.fillRect(sx + 12, sy + 6, 1, 4);
                    ctx.fillRect(sx + 8, sy + 11.5, 1, 3.5);
                    break;
                case 'Q':
                    var qp = (Math.floor(animT / 18) % 3);        // 3-frame shimmer
                    ctx.fillStyle = qp === 0 ? '#f4b400' : (qp === 1 ? '#ffc21a' : '#ffce3a');
                    ctx.fillRect(sx, sy, TILE, TILE);
                    ctx.fillStyle = '#ffe48a'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, 2);   // inner highlight
                    ctx.fillStyle = '#c87f00'; ctx.fillRect(sx, sy, TILE, 1.5); ctx.fillRect(sx, sy + TILE - 1.5, TILE, 1.5);
                    ctx.fillStyle = '#7a4d00'; ctx.fillRect(sx, sy, 1.5, TILE); ctx.fillRect(sx + TILE - 1.5, sy, 1.5, TILE);
                    ctx.fillStyle = '#fff'; ctx.fillRect(sx + 3, sy + 3, 1, 1); ctx.fillRect(sx + TILE - 4, sy + 3, 1, 1); // rivets
                    ctx.fillStyle = '#000';                                                  // crisper "?" glyph
                    ctx.fillRect(sx + 5.5, sy + 4, 5, 2); ctx.fillRect(sx + 9, sy + 5, 2, 2.5);
                    ctx.fillRect(sx + 7, sy + 7.5, 2, 2); ctx.fillRect(sx + 7, sy + 11, 2, 2);
                    break;
                case 'X':
                    ctx.fillStyle = '#9a6a33'; ctx.fillRect(sx, sy, TILE, TILE);
                    ctx.fillStyle = '#6b4520'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
                    break;
                case 'T': case 'U': case '[': case ']':
                    ctx.fillStyle = '#43b047'; ctx.fillRect(sx, sy, TILE, TILE);
                    ctx.fillStyle = '#2f8a33'; ctx.fillRect(sx, sy, 3, TILE);
                    ctx.fillStyle = '#7bd47e'; ctx.fillRect(sx + TILE - 4, sy, 2, TILE);
                    if (ch === 'T' || ch === 'U') { ctx.fillStyle = '#43b047'; ctx.fillRect(sx - 1, sy, TILE + 2, 4); ctx.fillStyle = '#2f8a33'; ctx.fillRect(sx - 1, sy, 3, 4); }
                    break;
            }
        }

        // ------------------------------------------------------------
        // SPRITE RENDERING — higher-detail, clearer characters.
        // The world/collision stays at TILE=16 virtual px, but sprites are
        // authored on a 2× sub-grid (each "art pixel" = 0.5 virtual px) and
        // drawn with many small rects. Because the canvas backing store is
        // already device-resolution (dpr up to 3) the sub-pixel detail renders
        // crisp, giving rounder, more readable characters without changing
        // physics or hitboxes (bible §18 Readability, §22 Nintendo entity rules).
        // `sp(x,y,w,h)` = sprite-pixel rect in HALF-virtual-px units from (ox,oy).
        // ------------------------------------------------------------
        var _ox = 0, _oy = 0;
        function sp(x, y, w, h) { ctx.fillRect(_ox + x * 0.5, _oy + y * 0.5, w * 0.5, h * 0.5); }
        function spc(col) { ctx.fillStyle = col; }

        function drawCoin(sx, sy, t) {
            // spinning coin: width pulses; add rim + inner shine for clarity
            var phase = Math.abs(Math.sin(t));
            var w = 5 + phase * 6;            // 5..11 px
            var cx = sx + 7;                  // centre of the ~14px coin cell
            ctx.fillStyle = '#fde36a'; ctx.fillRect(cx - w / 2, sy + 1, w, 12);          // bright face
            ctx.fillStyle = '#fac000'; ctx.fillRect(cx - w / 2, sy + 1, w, 2);           // top sheen
            ctx.fillStyle = '#e89000'; ctx.fillRect(cx - w / 2, sy + 11, w, 2);          // bottom shade
            ctx.fillStyle = '#b56f00'; ctx.fillRect(cx - w / 2, sy + 1, Math.max(1, w * 0.18), 12); // left rim
            if (w > 7) { ctx.fillStyle = '#fff7c8'; ctx.fillRect(cx - 1, sy + 3, 1.5, 7); }          // glint
        }

        function drawPlayer() {
            if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) return;
            var face = player.face;
            var star = player.star > 0;
            // animation state
            var moving = Math.abs(player.vx) > 0.3 && player.onGround;
            var airborne = !player.onGround;
            var walkPhase = moving ? Math.floor(animT / 5) % 4 : 0;      // 4-frame walk
            var bob = moving ? (walkPhase === 1 || walkPhase === 3 ? -1 : 0) : 0; // body bob
            var idleBreath = (!moving && !airborne) ? (Math.floor(animT / 24) % 2) : 0;
            var sy = Math.round(player.y) + bob;
            var sx = Math.round(player.x - camX);

            var capCol = star ? (Math.floor(player.star / 4) % 2 ? '#fac000' : '#fff') : '#e52521';
            var capDark = star ? '#caa000' : '#b81b18';
            var shirt  = player.fire ? '#ffffff' : capCol;
            var shirtDk= player.fire ? '#d9d9d9' : capDark;
            var overall= player.fire ? '#e52521' : '#2452c8';
            var overHi = player.fire ? '#ff6a64' : '#3a72ee';
            var skin = '#ffce9e', skinHi = '#ffe4c4', hair = '#5a2d12', boot = '#6a3a14';
            var w = player.w, h = player.h;

            // running dust puffs behind the feet
            if (moving && walkPhase % 2 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                var dustX = sx + (face > 0 ? -2 : w - 1);
                ctx.fillRect(dustX, Math.round(player.y) + h - 3, 3, 2);
            }

            ctx.save();
            if (face < 0) { ctx.translate(sx + w, sy); ctx.scale(-1, 1); _ox = 0; _oy = 0; }
            else { _ox = sx; _oy = sy; }
            var W2 = w * 2, H2 = h * 2;

            // --- CAP ---
            spc(capCol);
            sp(3, 0, W2 - 6, 3); sp(2, 3, W2 - 2, 3); sp(W2 - 4, 4, 7, 3); // dome + base + brim
            spc(capDark); sp(3, 0, W2 - 6, 1); sp(W2 - 4, 6, 7, 1);
            // --- FACE ---
            spc(skin);  sp(4, 6, W2 - 6, 8);
            spc(skinHi);sp(5, 6, 3, 2);
            spc(hair);  sp(2, 7, 3, 5);                       // sideburn
            spc('#000');sp(W2 - 9, 8, 2, idleBreath ? 1 : 3); // eye (blinks on idle)
            spc(hair);  sp(W2 - 6, 9, 5, 2);                  // mustache
            spc(skin);  sp(W2 - 5, 6, 3, 3);                  // nose
            // --- TORSO ---
            spc(shirt); sp(1, 14, W2 - 2, 6);
            spc(shirtDk); sp(1, 18, W2 - 2, 1);
            spc(overall);
            sp(3, 18, W2 - 6, H2 - 24);
            sp(2, 16, 3, H2 - 22); sp(W2 - 5, 16, 3, H2 - 22); // straps
            spc(overHi); sp(3, 18, W2 - 6, 1);
            spc('#f7c800'); sp(W2 - 9, 20, 2, 2); sp(6, 20, 2, 2); // buttons
            // --- ARM (raises on jump / fire) ---
            spc(skin);
            if (airborne || player.fireCd > 14) { sp(W2 - 2, 9, 4, 5); spc(skinHi); sp(W2 - 2, 9, 4, 1); }
            else { sp(W2 - 3, 15, 4, 5); spc(skinHi); sp(W2 - 3, 15, 4, 1); }
            // --- LEGS / BOOTS (pose by state) ---
            spc(boot);
            if (airborne) {
                // tucked legs
                sp(2, H2 - 6, 7, 6); sp(W2 - 9, H2 - 8, 7, 6);
            } else if (moving) {
                // walk cycle: legs swing opposite
                if (walkPhase === 0) { sp(1, H2 - 7, 6, 7); sp(W2 - 8, H2 - 5, 6, 5); }
                else if (walkPhase === 1) { sp(3, H2 - 6, 6, 6); sp(W2 - 9, H2 - 6, 6, 6); }
                else if (walkPhase === 2) { sp(W2 - 8, H2 - 7, 6, 7); sp(1, H2 - 5, 6, 5); }
                else { sp(3, H2 - 6, 6, 6); sp(W2 - 9, H2 - 6, 6, 6); }
            } else {
                sp(1, H2 - 6, 6, 6); sp(W2 - 7, H2 - 6, 6, 6);
            }
            spc('#3a2010'); sp(1, H2 - 2, W2 - 2, 2); // soles
            ctx.restore();
            _ox = 0; _oy = 0;
        }

        function drawEnemy(e) {
            var sx = Math.round(e.x - camX), sy = Math.round(e.y);
            if (!e.alive) {
                if (e.squash > 0) { ctx.fillStyle = '#7a4a1f'; ctx.fillRect(sx, sy + e.h - 3, e.w, 3); ctx.fillStyle = '#9a5a2a'; ctx.fillRect(sx, sy + e.h - 4, e.w, 1); }
                return;
            }
            _ox = sx; _oy = sy;
            var W2 = e.w * 2, H2 = e.h * 2, walk = Math.floor(e.t) % 2;

            if (e.kind === 'goomba') {
                spc('#8a4f24'); sp(2, 2, W2 - 4, H2 - 6);            // head dome (rounded via insets)
                spc('#9a5a2a'); sp(0, 5, W2, H2 - 9);               // head mid
                spc('#a8642f'); sp(1, 3, W2 - 2, 2);                // top sheen
                spc('#f3d6a8'); sp(4, 14, W2 - 8, 5);               // muzzle
                var blink = Math.floor(animT / 40) % 8 === 0;       // occasional blink
                spc('#fff');    sp(5, 8, 4, 4); sp(W2 - 9, 8, 4, 4); // eye whites
                spc('#000');    sp(7, 9, 2, blink ? 1 : 3); sp(W2 - 9, 9, 2, blink ? 1 : 3); // pupils
                spc('#000');    sp(5, 7, 4, 2); sp(W2 - 9, 7, 4, 2); // angry brows
                spc('#5a3216'); sp(walk ? 0 : 3, H2 - 4, 7, 4); sp(W2 - (walk ? 7 : 10), H2 - 4, 7, 4); // feet
            } else if (e.kind === 'koopa') {
                // body + head poke out the front
                spc('#ffce9e'); sp(W2 - 7, 1, 6, 7);               // head
                spc('#000');    sp(W2 - 4, 3, 2, 2);               // eye
                spc('#f7b000'); sp(W2 - 8, 0, 3, 2);               // beak hint
                spc('#2f8a33'); sp(2, 6, W2 - 4, H2 - 12);         // shell back
                spc('#43b047'); sp(3, 7, W2 - 6, H2 - 14);         // shell mid
                spc('#7bd47e'); sp(5, 9, W2 - 10, 3);              // shell highlight
                spc('#175a1c'); sp(3, 7, W2 - 6, 1);               // shell rim
                spc('#ffce9e'); sp(walk ? 1 : 3, H2 - 5, 5, 5); sp(W2 - (walk ? 6 : 8), H2 - 5, 5, 5); // feet
            } else if (e.kind === 'spiny') {
                // shell
                spc('#e8861f'); sp(0, 6, W2, H2 - 6);
                spc('#ffae45'); sp(2, 8, W2 - 4, 4);               // shell highlight
                spc('#a8560c'); sp(0, H2 - 4, W2, 4);              // shell shade
                // spikes (triangles for clarity)
                spc('#f4f4fa');
                for (var s2 = 0; s2 < 4; s2++) {
                    var bx2 = _ox + (2 + s2 * 4) * 0.5, by2 = _oy + 6 * 0.5;
                    ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx2 + 2, by2 - 4); ctx.lineTo(bx2 + 4, by2); ctx.closePath(); ctx.fill();
                }
                spc('#fff'); sp(4, 12, 4, 3); sp(W2 - 8, 12, 4, 3); // eye whites
                spc('#000'); sp(6, 13, 2, 2); sp(W2 - 7, 13, 2, 2); // pupils
            } else if (e.kind === 'piranha') {
                var chomp = Math.floor(animT / 16) % 2; // mouth open/close
                spc('#1f7a2a'); sp(W2 / 2 - 3, H2 - 8, 6, 8);      // stem
                spc('#2a9a38'); sp(W2 / 2 - 3, H2 - 8, 2, 8);      // stem highlight
                spc('#e52521'); sp(1, 1, W2 - 2, H2 - 8);          // head
                spc('#ff5a55'); sp(2, 2, W2 - 4, 3);              // top sheen
                spc('#b81b18'); sp(1, H2 - 11 + (chomp ? 1 : 0), W2 - 2, 2); // lip
                spc('#fff');    sp(2, 4, W2 - 4, 3);              // teeth (upper)
                spc('#fff');    sp(2, 8 + (chomp ? 2 : 0), W2 - 4, 2); // teeth (lower; gap chomps)
                spc('#fff');    sp(3, 1, 3, 3); sp(W2 - 6, 1, 3, 3); // spots
            }
            _ox = 0; _oy = 0;
        }

        function drawBoss() {
            var b = W.boss; if (!b || !b.alive) return;
            var sx = Math.round(b.x - camX), sy = Math.round(b.y);
            var flash = b.hitFlash > 0;
            ctx.save();
            if (b.invuln > 0 && Math.floor(b.invuln / 3) % 2 === 0) ctx.globalAlpha = 0.55;
            // Face the player's side (head/horns on the travel direction).
            if (b.vx < 0) { ctx.translate(sx + b.w, sy); ctx.scale(-1, 1); _ox = 0; _oy = 0; }
            else { _ox = sx; _oy = sy; }
            var W2 = b.w * 2, H2 = b.h * 2;

            // body (green ogre)
            spc(flash ? '#fff' : '#3a8a3a'); sp(2, 12, W2 - 4, H2 - 12);
            spc(flash ? '#fff' : '#46a347'); sp(4, 14, W2 - 8, H2 - 18); // body highlight
            // shell on the back (rounded)
            spc(flash ? '#fff' : '#caa24a'); sp(6, 16, W2 - 12, H2 - 22);
            spc(flash ? '#fff' : '#e8c870'); sp(8, 18, W2 - 16, 4);
            // shell spikes (triangles)
            spc('#fdfdff');
            for (var i = 0; i < 4; i++) {
                var bx = _ox + (6 + i * (W2 - 12) / 4) * 0.5, by = _oy + 16 * 0.5;
                ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 2.4, by - 5); ctx.lineTo(bx + 4.8, by); ctx.closePath(); ctx.fill();
            }
            // head
            spc(flash ? '#fff' : '#e0a040'); sp(W2 - 22, 0, 20, 16);
            spc(flash ? '#fff' : '#f0b85a'); sp(W2 - 20, 2, 16, 5); // brow highlight
            // snout
            spc(flash ? '#fff' : '#caa24a'); sp(W2 - 8, 8, 8, 7);
            spc('#000'); sp(W2 - 6, 10, 2, 2); sp(W2 - 6, 13, 2, 2); // nostrils
            // eye (angry)
            spc('#fff'); sp(W2 - 16, 4, 6, 5);
            spc('#000'); sp(W2 - 13, 5, 3, 3);
            spc(flash ? '#fff' : '#b87a1f'); sp(W2 - 17, 2, 7, 2); // brow
            // horns (curved up)
            spc('#fdfdff');
            sp(W2 - 22, -6, 3, 7); sp(W2 - 23, -8, 4, 3);
            sp(W2 - 10, -6, 3, 7); sp(W2 - 9, -8, 4, 3);
            // feet
            spc(flash ? '#fff' : '#2a6a2a'); sp(2, H2 - 6, 9, 6); sp(W2 - 11, H2 - 6, 9, 6);
            ctx.restore();
            _ox = 0; _oy = 0;

            // HP pips above (screen-aligned, not mirrored)
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(sx - 1, sy - 13, b.w + 2, 7);
            for (var hp = 0; hp < b.hp; hp++) { ctx.fillStyle = hp < 3 ? '#e52521' : (hp < 6 ? '#fac000' : '#43b047'); ctx.fillRect(sx + 1 + hp * 3, sy - 12, 2, 5); }
        }

        function render() {
            var B = W.biome;
            // sky gradient (biome-tinted) — drawn in SCREEN space so it always
            // fills the whole viewport regardless of vertical camera offset.
            var grd = ctx.createLinearGradient(0, 0, 0, VH);
            grd.addColorStop(0, B.sky[0]); grd.addColorStop(1, B.sky[1]);
            ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);

            drawClouds();   // screen-space parallax clouds (fill the open sky)

            // From here on, draw the WORLD: shift everything up by camY so the
            // ground band sits at the bottom of the (possibly taller) viewport.
            ctx.save();
            ctx.translate(0, -camY);

            drawScenery();  // hills anchored to the ground (world space)
            drawDecor();    // biome-specific environment decorations (bushes, cacti, bubbles…)

            var c0 = Math.floor(camX / TILE), c1 = c0 + COLS_VIS + 1;
            // Deep-ground fill: below the surface band, fill solid earth down to
            // the bottom of the view so the area under the touch controls reads
            // as thick ground (not void). Skip carved-pit columns so pits stay
            // visible as real holes (bible §14 — hazards must be seen).
            var deepTop = (GROUND_R + 2) * TILE;
            var deepBottom = camY + VH + TILE; // a tile past the screen bottom
            var Bg = W.biome;
            for (var dc = c0; dc <= c1; dc++) {
                if (dc < 0 || dc >= W.cols) continue;
                var hasFloor = W.grid[dc][GROUND_R] === '#' || W.grid[dc][GROUND_R + 1] === '#';
                if (!hasFloor) continue; // leave pits open
                var dsx = Math.round(dc * TILE - camX);
                ctx.fillStyle = shade(Bg.ground, -0.32);
                ctx.fillRect(dsx, deepTop, TILE, deepBottom - deepTop);
                // faint earth striations for texture (cheap, 2 per tile depth)
                ctx.fillStyle = shade(Bg.ground, -0.45);
                for (var dy = deepTop + 5; dy < deepBottom; dy += 12) {
                    ctx.fillRect(dsx + ((dc % 2) ? 3 : 8), dy, 5, 2);
                }
            }
            for (var c = c0; c <= c1; c++) {
                if (c < 0 || c >= W.cols) continue;
                var sx = c * TILE - camX;
                for (var r = 0; r < ROWS; r++) {
                    var ch = W.grid[c][r];
                    if (ch !== ' ') {
                        var by = 0;
                        for (var bi = 0; bi < W.boxes.length; bi++) { var bx = W.boxes[bi]; if (bx.c === c && bx.r === r && bx.bounce > 0) { by = -bx.bounce; bx.bounce -= 1; } }
                        drawTile(ch, Math.round(sx), r * TILE + by);
                    }
                }
            }

            for (var i = 0; i < W.coins.length; i++) {
                var co = W.coins[i]; if (co.taken) continue;
                if (co.x < camX - 16 || co.x > camX + VW + 16) continue;
                co.t += 0.12; drawCoin(Math.round(co.x - camX), co.y, co.t);
            }
            for (var sIdx = 0; sIdx < W.springs.length; sIdx++) {
                var sp = W.springs[sIdx]; var ssx = Math.round(sp.c * TILE - camX); var ssy = sp.r * TILE + (sp.t > 0 ? 4 : 0);
                ctx.fillStyle = '#bbb'; ctx.fillRect(ssx + 2, ssy + 6, TILE - 4, 4);
                ctx.fillStyle = '#888'; ctx.fillRect(ssx + 3, ssy + 10, TILE - 6, TILE - 10);
                if (sp.t > 0) sp.t--;
            }
            // warp-pipe down hint arrow
            for (var wi = 0; wi < W.warps.length; wi++) {
                var wp = W.warps[wi];
                var wsx = Math.round((wp.c) * TILE - camX);
                if (wsx < -TILE || wsx > VW) continue;
                var blink = Math.floor(Date.now() / 300) % 2;
                if (blink) { ctx.fillStyle = '#fff'; ctx.fillRect(wsx + 13, wp.r * TILE - 10, 6, 2); ctx.fillRect(wsx + 15, wp.r * TILE - 8, 2, 4); }
            }
            for (var p = 0; p < W.powerups.length; p++) {
                var pu = W.powerups[p]; var px = Math.round(pu.x - camX), py = Math.round(pu.y);
                if (pu.kind === 'mushroom') { ctx.fillStyle = '#e52521'; ctx.fillRect(px, py, pu.w, 7); ctx.fillStyle = '#fff'; ctx.fillRect(px + 2, py + 1, 3, 3); ctx.fillRect(px + 8, py + 2, 3, 3); ctx.fillStyle = '#ffd9a0'; ctx.fillRect(px + 2, py + 7, pu.w - 4, 6); }
                else if (pu.kind === 'flower') { ctx.fillStyle = '#fac000'; ctx.fillRect(px + 3, py, 7, 7); ctx.fillStyle = '#e52521'; ctx.fillRect(px + 5, py + 2, 3, 3); ctx.fillStyle = '#43b047'; ctx.fillRect(px + 5, py + 7, 3, 6); }
                else { var bl = Math.floor(pu.t / 4) % 2; ctx.fillStyle = bl ? '#fac000' : '#fff'; ctx.fillRect(px + 3, py, 7, 13); ctx.fillStyle = '#000'; ctx.fillRect(px + 4, py + 4, 1, 1); ctx.fillRect(px + 8, py + 4, 1, 1); }
            }
            for (var e = 0; e < W.enemies.length; e++) {
                var en = W.enemies[e];
                if (en.x < camX - 24 || en.x > camX + VW + 24) continue;
                drawEnemy(en);
            }
            drawBoss();
            ctx.fillStyle = '#ff7a00';
            for (var f = 0; f < W.fireballs.length; f++) { var fb = W.fireballs[f]; ctx.fillRect(Math.round(fb.x - camX), Math.round(fb.y), 5, 5); }
            for (var pa = 0; pa < W.particles.length; pa++) { var ptl = W.particles[pa]; ctx.fillStyle = ptl.color; ctx.fillRect(Math.round(ptl.x - camX), Math.round(ptl.y), 3, 3); }

            drawFlag();
            drawPrincess();
            drawPlayer();

            // Firework celebration (world coords; under the camY translate).
            for (var fwI = 0; fwI < fireworks.length; fwI++) {
                var fp = fireworks[fwI];
                ctx.globalAlpha = Math.max(0, fp.life / 40);
                ctx.fillStyle = fp.color;
                ctx.fillRect(Math.round(fp.x - camX), Math.round(fp.y), 3, 3);
            }
            ctx.globalAlpha = 1;

            ctx.restore(); // end world translate
        }

        // Captured/rescued princess near the final goal. Waves once rescued.
        function drawPrincess() {
            var pr = W.princess; if (!pr) return;
            pr.t++;
            var sx = Math.round(pr.x - camX), sy = Math.round(pr.y);
            if (sx < -20 || sx > VW + 20) return;
            var bob = pr.rescued ? Math.round(Math.sin(pr.t * 0.18) * 2) : 0;
            sy += bob;
            // hair
            ctx.fillStyle = '#f4c84a'; ctx.fillRect(sx + 1, sy, 10, 5); ctx.fillRect(sx, sy + 3, 2, 8); ctx.fillRect(sx + 10, sy + 3, 2, 8);
            // crown
            ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx + 2, sy - 3, 8, 2); ctx.fillRect(sx + 2, sy - 5, 2, 2); ctx.fillRect(sx + 5, sy - 6, 2, 3); ctx.fillRect(sx + 8, sy - 5, 2, 2);
            ctx.fillStyle = '#ff5a55'; ctx.fillRect(sx + 5, sy - 5, 2, 2); // crown gem
            // face
            ctx.fillStyle = '#ffd9b8'; ctx.fillRect(sx + 2, sy + 4, 8, 5);
            ctx.fillStyle = '#000'; ctx.fillRect(sx + 4, sy + 6, 1, 2); ctx.fillRect(sx + 7, sy + 6, 1, 2);
            ctx.fillStyle = '#ff7ab6'; ctx.fillRect(sx + 4, sy + 8, 4, 1); // smile
            // pink gown (triangular)
            ctx.fillStyle = '#ff7ab6';
            ctx.beginPath(); ctx.moveTo(sx + 6, sy + 9); ctx.lineTo(sx - 1, sy + pr.h); ctx.lineTo(sx + 13, sy + pr.h); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffa6d0'; ctx.fillRect(sx + 4, sy + 10, 4, pr.h - 11); // gown highlight
            // waving arm when rescued
            if (pr.rescued && Math.floor(pr.t / 10) % 2) { ctx.fillStyle = '#ffd9b8'; ctx.fillRect(sx + 11, sy + 6, 4, 2); ctx.fillRect(sx + 13, sy + 3, 2, 3); }
            else { ctx.fillStyle = '#ffd9b8'; ctx.fillRect(sx + 10, sy + 10, 3, 2); }
        }

        // Hills sit on the ground (world space; drawn under the camY translate).
        // Layered for depth + a soft highlight so they read as more than flat blobs.
        function drawScenery() {
            var B = W.biome;
            var hillBase = (GROUND_R) * TILE;
            // back layer (darker, slower)
            ctx.fillStyle = shade(B.hills, -0.18);
            for (var h2 = 0; h2 < 10; h2++) {
                var bx = ((h2 * 150 - camX * 0.25) % (W.worldW + 200));
                ctx.beginPath(); ctx.moveTo(bx, hillBase); ctx.arc(bx + 42, hillBase, 42, Math.PI, 0); ctx.closePath(); ctx.fill();
            }
            // front layer
            ctx.fillStyle = B.hills;
            for (var h = 0; h < 8; h++) {
                var hx = ((h * 180 - camX * 0.4) % (W.worldW));
                ctx.beginPath(); ctx.moveTo(hx, hillBase); ctx.arc(hx + 30, hillBase, 30, Math.PI, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = shade(B.hills, 0.18); // tiny sun highlight
                ctx.beginPath(); ctx.arc(hx + 22, hillBase - 6, 8, Math.PI, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = B.hills;
            }
        }

        // Per-biome environment decorations, anchored to the ground and drawn
        // behind the play layer. Placed deterministically by world position so
        // they're stable (no flicker), with light parallax for depth. Purely
        // cosmetic — never overlaps gameplay collision (bible §18 readability).
        function drawDecor() {
            var B = W.biome, key = W.biomeKey;
            var gy = GROUND_R * TILE;                 // ground surface top (world y) — decor sits ON this line
            var step = 56;                            // decor spacing (world px)
            var first = Math.floor((camX - step) / step) * step;
            var last = camX + VW + step;

            // 1) Surface grass tufts on grassy biomes — drawn for EVERY column so
            //    the ground line never looks bare, always rooted exactly at gy.
            if (key === 'overworld' || key === 'forest') {
                ctx.fillStyle = shade(B.groundTop, 0.18);
                for (var tx = Math.floor(camX / 8) * 8; tx <= camX + VW; tx += 8) {
                    var tsx = Math.round(tx - camX);
                    var sway = Math.sin(animT * 0.05 + tx * 0.3) * 1;
                    ctx.fillRect(tsx + sway, gy - 3, 1, 3);
                    ctx.fillRect(tsx + 2 - sway, gy - 4, 1, 4);
                    ctx.fillRect(tsx + 4 + sway, gy - 2, 1, 2);
                }
            }

            for (var wx = first; wx <= last; wx += step) {
                var sxp = Math.round(wx - camX);
                var seed = (Math.floor(wx / step) * 2654435761) >>> 0; // stable pseudo-rng
                var v = (seed % 100) / 100, v2 = ((seed >> 8) % 100) / 100;

                if (key === 'overworld' || key === 'forest') {
                    if (v < 0.55) {
                        // TREE — trunk rooted at gy, layered round canopy
                        var th = key === 'forest' ? 30 + (v2 * 14) : 20 + (v2 * 8);
                        var cxp = sxp + 14;
                        ctx.fillStyle = '#6a4020'; ctx.fillRect(cxp - 2, gy - th, 4, th);     // trunk
                        ctx.fillStyle = '#7d5028'; ctx.fillRect(cxp - 2, gy - th, 1, th);     // trunk light
                        ctx.fillStyle = shade(B.hills, -0.12);                                // canopy shadow
                        ctx.beginPath(); ctx.arc(cxp, gy - th - 4, 13, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = B.hills;                                              // canopy
                        ctx.beginPath(); ctx.arc(cxp + 1, gy - th - 6, 11, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = shade(B.hills, 0.22);                                 // sun highlight
                        ctx.beginPath(); ctx.arc(cxp - 4, gy - th - 9, 5, 0, Math.PI * 2); ctx.fill();
                    } else {
                        // BUSH — flat base sits exactly on gy (no float)
                        ctx.fillStyle = shade(B.hills, -0.05);
                        ctx.beginPath(); ctx.arc(sxp + 9, gy, 8, Math.PI, 0); ctx.fill();
                        ctx.beginPath(); ctx.arc(sxp + 16, gy, 6, Math.PI, 0); ctx.fill();
                        ctx.fillStyle = shade(B.hills, 0.2);
                        ctx.beginPath(); ctx.arc(sxp + 7, gy - 2, 3, Math.PI, 0); ctx.fill();
                    }
                } else if (key === 'desert') {
                    if (v < 0.4) {
                        // CACTUS rooted at gy
                        ctx.fillStyle = '#3f8a4a'; ctx.fillRect(sxp + 12, gy - 26, 6, 26);
                        ctx.fillRect(sxp + 7, gy - 16, 5, 3); ctx.fillRect(sxp + 7, gy - 22, 3, 9);
                        ctx.fillRect(sxp + 18, gy - 13, 5, 3); ctx.fillRect(sxp + 20, gy - 20, 3, 10);
                        ctx.fillStyle = '#56a85e'; ctx.fillRect(sxp + 12, gy - 26, 2, 26);   // light edge
                        ctx.fillStyle = '#2f6a38'; ctx.fillRect(sxp + 16, gy - 26, 2, 26);   // shade edge
                    } else if (v < 0.7) {
                        ctx.fillStyle = shade(B.ground, 0.12);                                // dune (flat on gy)
                        ctx.beginPath(); ctx.arc(sxp + 16, gy, 18, Math.PI, 0); ctx.fill();
                        ctx.fillStyle = shade(B.ground, 0.22);
                        ctx.beginPath(); ctx.arc(sxp + 10, gy, 9, Math.PI, 0); ctx.fill();
                    } else {
                        ctx.fillStyle = '#caa24a'; ctx.fillRect(sxp + 8, gy - 4, 10, 4);      // rock
                        ctx.fillStyle = '#e0bb66'; ctx.fillRect(sxp + 8, gy - 4, 10, 1);
                    }
                } else if (key === 'underground') {
                    // ceiling stalactites (hang from screen top) + floor stalagmites
                    ctx.fillStyle = shade(B.ground, 0.12);
                    var stx = sxp + 8;
                    ctx.beginPath(); ctx.moveTo(stx, camY); ctx.lineTo(stx + 5, camY); ctx.lineTo(stx + 2, camY + 12 + (v * 12)); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = shade(B.ground, 0.2);                                     // stalagmite on floor
                    ctx.beginPath(); ctx.moveTo(sxp + 26, gy); ctx.lineTo(sxp + 32, gy); ctx.lineTo(sxp + 29, gy - 8 - v2 * 8); ctx.closePath(); ctx.fill();
                    if (v < 0.5) { ctx.fillStyle = 'rgba(120,200,255,' + (0.4 + 0.3 * Math.sin(animT * 0.1 + wx)) + ')'; ctx.fillRect(sxp + 18, gy - 5, 3, 5); }
                } else if (key === 'water') {
                    // seaweed rooted at gy (sways), + rising bubbles
                    var sway = Math.sin(animT * 0.06 + wx) * 2.5;
                    ctx.fillStyle = '#2a9a78';
                    ctx.fillRect(sxp + 9 + sway, gy - 20, 3, 20);
                    ctx.fillRect(sxp + 15 - sway, gy - 13, 3, 13);
                    ctx.fillStyle = '#3fc89a'; ctx.fillRect(sxp + 9 + sway, gy - 20, 1, 20);
                    ctx.fillStyle = '#caa24a'; ctx.beginPath(); ctx.arc(sxp + 24, gy, 6, Math.PI, 0); ctx.fill(); // shell/rock
                    var bubY = gy - ((animT * 0.6 + seed) % 90);
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.beginPath(); ctx.arc(sxp + 22, bubY, 1.5 + (v * 2), 0, Math.PI * 2); ctx.fill();
                } else if (key === 'sky') {
                    // distant fluffy cloud puffs drifting (behind play layer)
                    ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    var cyy = gy - 36 - (seed % 46);
                    ctx.beginPath(); ctx.arc(sxp + 10, cyy, 8, 0, Math.PI * 2); ctx.arc(sxp + 18, cyy + 1, 6, 0, Math.PI * 2); ctx.arc(sxp + 2, cyy + 2, 5, 0, Math.PI * 2); ctx.fill();
                } else if (key === 'castle' || key === 'finalcastle') {
                    // stone pillar + wall torch with flickering flame
                    ctx.fillStyle = shade(B.ground, -0.15); ctx.fillRect(sxp + 4, gy - 40, 8, 40);
                    ctx.fillStyle = shade(B.ground, 0.1); ctx.fillRect(sxp + 4, gy - 40, 2, 40);
                    ctx.fillStyle = '#2a2020'; ctx.fillRect(sxp + 22, gy - 22, 4, 12);
                    var fl = 1 + Math.sin(animT * 0.3 + wx) * 0.6;
                    ctx.fillStyle = '#ff8a1e'; ctx.beginPath(); ctx.arc(sxp + 24, gy - 24, 4 + fl, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(sxp + 24, gy - 25, 2 + fl * 0.5, 0, Math.PI * 2); ctx.fill();
                }
            }
            // Lava glow band at the very bottom for castle biomes. X is in
            // SCREEN space (the camY translate only shifts Y), so span 0..VW.
            if (B.lava) {
                var pulse = 0.25 + 0.12 * Math.sin(animT * 0.12);
                ctx.fillStyle = 'rgba(255,90,20,' + pulse + ')';
                ctx.fillRect(0, camY + VH - 6, VW, 6);
            }
        }

        // Clouds in screen space so they always float in the visible sky.
        function drawClouds() {
            var B = W.biome;
            ctx.fillStyle = B.clouds;
            for (var cl = 0; cl < 7; cl++) {
                var clx = ((cl * 150 + 40 - camX * 0.25) % (VW + 220)) - 80;
                var cly = 16 + (cl % 4) * 18;
                ctx.fillRect(clx, cly, 30, 9); ctx.fillRect(clx + 6, cly - 6, 18, 9); ctx.fillRect(clx + 22, cly - 2, 13, 7);
            }
        }

        // Lighten (>0) / darken (<0) a #rrggbb hex by a fraction. Used for cheap
        // shading so the world has depth without sprite assets.
        function shade(hex, f) {
            var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
            if (!m) return hex;
            var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
            function adj(v) { return clamp(Math.round(v + (f > 0 ? (255 - v) * f : v * f)), 0, 255); }
            return 'rgb(' + adj(r) + ',' + adj(g) + ',' + adj(b) + ')';
        }

        function drawFlag() {
            var fx = Math.round(W.flagX - camX);
            if (fx < -20 || fx > VW + 20) return;
            var topY = up(5) * TILE;
            // pole with metallic sheen
            ctx.fillStyle = '#9aa0ab'; ctx.fillRect(fx + 6, topY, 2, 5 * TILE);
            ctx.fillStyle = '#d6dae2'; ctx.fillRect(fx + 6, topY, 1, 5 * TILE);
            // golden ball finial
            ctx.fillStyle = '#fac000'; ctx.beginPath(); ctx.arc(fx + 7, topY - 3, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(fx + 6, topY - 4, 1.5, 0, Math.PI * 2); ctx.fill();
            // waving triangular flag (animated tip)
            var wave = Math.sin(animT * 0.18) * 3;
            ctx.fillStyle = '#e52521';
            ctx.beginPath();
            ctx.moveTo(fx + 6, topY + 2);
            ctx.lineTo(fx - 9 + wave, topY + 7 + wave * 0.4);
            ctx.lineTo(fx + 6, topY + 12);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ff7a76';
            ctx.beginPath(); ctx.moveTo(fx + 6, topY + 3); ctx.lineTo(fx - 2 + wave * 0.6, topY + 6); ctx.lineTo(fx + 6, topY + 8); ctx.closePath(); ctx.fill();
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
            stepEnemies();
            stepFireballs();
            if (fwActive > 0 || fireworks.length) stepFireworks();
            updateCamera();

            timeAcc += dt || 16;
            if (timeAcc > 400 && !player.win && !player.dead) { timeAcc = 0; time--; if (time <= 0) { time = 0; die(true); } }

            // The B/HIT (fireball) button only appears when Mario can shoot.
            var canFire = !!(player && player.fire);
            if (canFire !== _actShown) { _actShown = canFire; if (actBtn) actBtn.classList.toggle('is-available', canFire); }

            render();
        }
        var _actShown = false, actBtn = document.getElementById('rm-act');

        // ============================================================
        // CANVAS SIZING — crisp, high-resolution rendering.
        // ------------------------------------------------------------
        // The world is authored at a fixed virtual resolution (VW×VH). To
        // avoid the blur of stretching a 256×224 backing store, we size the
        // backing store to the displayed CSS pixels × devicePixelRatio, then
        // scale the context so all draw calls keep using virtual coordinates
        // (draws snap to whole virtual px → sharp edges, no extra shadow).
        // The camera math is unchanged (always VW tiles wide → no over-zoom).
        // ============================================================
        function resize() {
            var rect = stage.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            // Width-lock the framing: a fixed number of columns is always
            // visible across, so level pacing reads consistently. The vertical
            // span then grows to whatever the screen needs → the canvas fills
            // the entire stage with NO black bars and NO stretching/cropping.
            var s = rect.width / (BASE_VIS_COLS * TILE);   // device px per virtual px
            VW = BASE_VIS_COLS * TILE;
            VH = Math.ceil((rect.height / s) / TILE) * TILE; // round up to whole tiles
            COLS_VIS = BASE_VIS_COLS;

            // On touch devices the on-screen controls live at the bottom; reserve
            // a band of thick "deep ground" below the surface so they never cover
            // Mario. Desktop (fine pointer + room) hides controls → no reserve.
            var touch = !(window.matchMedia && window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches);
            BOTTOM_SAFE = touch ? BOTTOM_SAFE_TILES * TILE : TILE; // px below the ground TOP

            // Park the camera so the ground SURFACE sits BOTTOM_SAFE px above the
            // bottom edge; the reserved band below is filled with deep ground in
            // render() (carved pits stay open so hazards remain visible — bible §14).
            // No upper clamp: camY may exceed the world height so the safe band
            // shows; deep-ground fill covers it. Only guard the top (sky).
            camY = (GROUND_R + 1) * TILE - VH + BOTTOM_SAFE;
            if (camY < 0) camY = 0;

            var dpr = Math.min(window.devicePixelRatio || 1, 3); // cap fill-rate
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            // Map virtual coords → device pixels. Vertical scale matches
            // horizontal (square pixels, no distortion); any leftover sub-tile
            // height is covered because VH was rounded up past the screen.
            ctx.setTransform(canvas.width / VW, 0, 0, canvas.width / VW, 0, 0);
            ctx.imageSmoothingEnabled = false;
        }
        window.addEventListener('resize', resize);
        onCleanup(function () { window.removeEventListener('resize', resize); });

        // ============================================================
        // OVERLAYS / FLOW
        // ============================================================
        var OVERLAYS = ['rm-intro', 'rm-stageclear', 'rm-win'];
        function showOverlay(id) {
            OVERLAYS.forEach(function (o) { var el = document.getElementById(o); if (el) el.classList.remove('show'); });
            var el = document.getElementById(id); if (el) el.classList.add('show');
        }
        function hideOverlays() { OVERLAYS.forEach(function (o) { var el = document.getElementById(o); if (el) el.classList.remove('show'); }); }

        // Start (or restart) the run at a given stage (default 1).
        function startGame(stage) {
            stageNum = stage || 1;
            W = buildWorld(stageNum);
            resetPlayer(false);
            camX = 0; time = 400;
            running = true; started = true;
            setHUD();
            resize();
            render();
        }

        // Advance to the next stage carrying score/coins forward.
        function nextStage() {
            stageNum++;
            if (stageNum > TOTAL_STAGES) { showWin(); return; }
            W = buildWorld(stageNum);
            resetPlayer(false);
            camX = 0; time = 400;
            running = true;
            setHUD();
            hideOverlays();
            lastT = performance.now();
            render();
        }

        // Jump straight to a chosen stage (cheat stage-select). Keeps score.
        function goToStage(n) {
            stageNum = clamp(n, 1, TOTAL_STAGES);
            W = buildWorld(stageNum);
            resetPlayer(false);
            camX = 0; time = 400;
            running = true;
            setHUD();
            hideOverlays();
            closeModal();
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            lastT = performance.now();
            render();
        }

        // ============================================================
        // VIEW-INVITATION BUTTON — available once the run was completed
        // (or while cheat-star is on). Lets the guest jump straight to the
        // full scrollable invitation without finishing again.
        // ============================================================
        var invitation = document.getElementById('rm-invitation');
        var fab = document.getElementById('rm-fab');
        var viewBtn = document.getElementById('rm-view-btn');
        // The full invitation is accessible once: the run was completed, OR every
        // info-block was collected manually, OR cheat is on.
        function viewUnlocked() { return !!(completed || allInfoUnlocked() || (player && player.cheat)); }
        function updateViewBtn() {
            if (!viewBtn) return;
            if (viewUnlocked()) viewBtn.classList.remove('is-locked');
            else viewBtn.classList.add('is-locked');
        }
        function openInvitation() {
            // When opening via the shortcut, make sure every piece is unlocked
            // so the guest is never locked out of real wedding details.
            INFOS.forEach(function (info) {
                if (!unlocked[info.key]) { unlocked[info.key] = true; var btn = invButtons[info.key]; if (btn) btn.classList.add('is-enabled'); }
            });
            persist();
            running = false;
            hideOverlays();
            closeModal();
            if (invitation) { invitation.classList.add('show'); invitation.scrollTop = 0; }
            if (fab) fab.classList.add('show');
        }
        if (viewBtn) viewBtn.addEventListener('click', function () {
            if (!viewUnlocked()) { toast('Selesaikan permainan dulu<br><span style="font-size:8px">atau aktifkan ★ cheat</span>', 1800); return; }
            openInvitation();
        });

        // ============================================================
        // SETTINGS / RESET
        // ============================================================
        var settingsBtn = document.getElementById('rm-settings-btn');
        var confirmRoot = document.getElementById('rm-confirm-root');
        var confirmOk = document.getElementById('rm-confirm-ok');
        var confirmCancel = document.getElementById('rm-confirm-cancel');
        if (settingsBtn) settingsBtn.addEventListener('click', function () {
            if (confirmRoot) confirmRoot.classList.add('show');
        });
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
            score = 0; coinGot = 0; lives = 3;
            buildInventory();      // rebuild icons (all locked again)
            updateViewBtn();       // re-lock the view button
            startGame(1);          // back to World 1-1 (clears cheat on new player)
            updateStageSelBtn();   // hide stage-select (cheat off)
            running = false;
            showOverlay('rm-intro');
            toast('Game di-reset', 1400);
        });

        // ============================================================
        // WIRE UP UI
        // ============================================================
        var cover = document.getElementById('rm-cover');
        var btnStart = document.getElementById('rm-start-btn');
        var btnIntroGo = document.getElementById('rm-intro-go');
        var btnStageGo = document.getElementById('rm-stage-go');
        var btnWinGo = document.getElementById('rm-win-go');
        var btnBackGame = document.getElementById('rm-back-game');
        var btnCloseInv = document.getElementById('rm-close-inv');
        var btnReplay = document.getElementById('rm-replay');
        var starBtn = document.getElementById('rm-star-btn');
        var stageSelBtn = document.getElementById('rm-stagesel-btn');
        var stageSelRoot = document.getElementById('rm-stagesel-root');
        var stageSelGrid = document.getElementById('rm-stagesel-grid');
        var stageSelCancel = document.getElementById('rm-stagesel-cancel');

        if (btnStart) btnStart.addEventListener('click', function () {
            audioCtx();
            if (cover) cover.classList.add('rm-hidden');
            buildInventory();
            updateViewBtn();
            startGame(1);
            running = false;
            showOverlay('rm-intro');
        });

        if (btnIntroGo) btnIntroGo.addEventListener('click', function () {
            hideOverlays(); running = true; lastT = performance.now();
            startBgMusic();
        });

        if (btnStageGo) btnStageGo.addEventListener('click', function () { nextStage(); startBgMusic(); });

        if (btnWinGo) btnWinGo.addEventListener('click', function () {
            hideOverlays();
            openInvitation();
        });

        // Close: hide the invitation and RESUME the current game at the same
        // stage (no reset). If no run is in progress yet, fall back to intro.
        if (btnCloseInv) btnCloseInv.addEventListener('click', function () {
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            closeModal();
            if (started && W && player && !player.win) {
                running = true; lastT = performance.now();
            } else {
                running = false; showOverlay('rm-intro');
            }
        });

        // Back to game: restart the whole run from World 1-1.
        if (btnBackGame) btnBackGame.addEventListener('click', function () {
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            startGame(1); running = false; showOverlay('rm-intro');
        });

        if (btnReplay) btnReplay.addEventListener('click', function () {
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            startGame(1); running = false; showOverlay('rm-intro');
        });

        // Show/hide the cheat-only stage-select button to match cheat state.
        function updateStageSelBtn() {
            if (stageSelBtn) stageSelBtn.style.display = (player && player.cheat) ? 'flex' : 'none';
        }

        if (starBtn) starBtn.addEventListener('click', function () {
            if (!player) return;
            player.cheat = !player.cheat;
            starBtn.classList.toggle('is-on', player.cheat);
            updateViewBtn();      // cheat unlocks the view shortcut
            updateStageSelBtn();  // cheat reveals the stage-select shortcut
            toast(player.cheat ? 'CHEAT MODE ON<br><span style="font-size:8px">Skor dinonaktifkan · pilih stage aktif</span>' : 'CHEAT MODE OFF', 1700);
        });

        // ---- Stage select (cheat) ----
        function buildStageSelect() {
            if (!stageSelGrid) return;
            stageSelGrid.innerHTML = '';
            WORLDS.forEach(function (w, idx) {
                var n = idx + 1;
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'rm-stagesel-item' + (n === stageNum ? ' is-current' : '');
                b.innerHTML = '<span class="ss-world">WORLD ' + w.name + '</span><span class="ss-biome">' + w.biome + '</span>';
                b.addEventListener('click', function () {
                    if (stageSelRoot) stageSelRoot.classList.remove('show');
                    goToStage(n);
                });
                stageSelGrid.appendChild(b);
            });
        }
        if (stageSelBtn) stageSelBtn.addEventListener('click', function () {
            if (!player || !player.cheat) return;
            buildStageSelect();
            if (stageSelRoot) stageSelRoot.classList.add('show');
        });
        if (stageSelCancel) stageSelCancel.addEventListener('click', function () { if (stageSelRoot) stageSelRoot.classList.remove('show'); });
        if (stageSelRoot) stageSelRoot.addEventListener('click', function (e) { if (e.target === stageSelRoot) stageSelRoot.classList.remove('show'); });

        // Touch controls: analog joystick + action buttons
        bindJoystick();
        holdBtn('rm-jump', 'jump');
        holdBtn('rm-act', 'act', { tap: doAction });
        bindKey();

        // ============================================================
        // COUNTDOWN + CALENDAR (invitation)
        // ============================================================
        function getWeddingDate() {
            var calEl = document.getElementById('rm-calendar');
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
            set('rm-cd-days', d); set('rm-cd-hours', h); set('rm-cd-mins', mi); set('rm-cd-secs', s);
        }, 1000);
        onCleanup(function () { clearInterval(cdTimer); });

        function renderCalendar(el) {
            if (!el || el.dataset.rendered) return;
            var t = weddingDate;
            var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            var dows = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            var y = t.getFullYear(), m = t.getMonth(), wd = t.getDate();
            var first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
            var html = '<div class="rm-cal-title">' + months[m] + ' ' + y + '</div><div class="rm-cal-grid">';
            dows.forEach(function (dn) { html += '<span class="rm-cal-dow">' + dn + '</span>'; });
            html += '</div><div class="rm-cal-grid">';
            for (var i = 0; i < first; i++) html += '<span class="rm-cal-cell cal-empty"></span>';
            for (var dd = 1; dd <= dim; dd++) html += '<span class="rm-cal-cell' + (dd === wd ? ' cal-active' : '') + '">' + dd + '</span>';
            html += '</div>';
            el.innerHTML = html; el.dataset.rendered = 'true';
        }
        renderCalendar(document.getElementById('rm-calendar'));

        // ============================================================
        // RSVP + WISHES
        // ============================================================
        var btnRsvp = document.getElementById('rm-btn-rsvp');
        if (btnRsvp) btnRsvp.addEventListener('click', function () {
            var name = (document.getElementById('rm-rsvp-name') || {}).value || '';
            if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
            var form = document.getElementById('rm-rsvp-form');
            if (form) form.innerHTML = '<div class="rm-thanks">⭐ Terima kasih' + (name ? ' ' + name : '') + '!<br>Konfirmasimu sudah kami terima.</div>';
            toast('RSVP terkirim!');
        });

        var btnWish = document.getElementById('btn-submit-ucapan');
        if (btnWish) btnWish.addEventListener('click', function () {
            if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
            var nm = (document.getElementById('wish-name') || {}).value || '';
            var msg = (document.getElementById('wish-message') || {}).value || '';
            if (!msg.trim()) { toast('Tulis ucapanmu dulu'); return; }
            var form = document.getElementById('rm-wish-form');
            if (form) form.innerHTML = '<div class="rm-thanks">⭐ Terima kasih atas ucapan &amp; doanya!</div>';
            var list = document.querySelector('.rm-wish-list');
            if (list) {
                var item = document.createElement('div'); item.className = 'rm-wish-item';
                item.innerHTML = '<div class="rm-wish-head"><span class="rm-wish-author">' + (nm || 'Tamu') + '</span><span class="rm-wish-time">baru saja</span></div><div class="rm-wish-text"></div>';
                item.querySelector('.rm-wish-text').textContent = msg;
                list.insertBefore(item, list.firstChild);
            }
            toast('Ucapan terkirim!');
        });

        // ============================================================
        // MUSIC
        // ============================================================
        var bgMusic = document.getElementById('bg-music');
        var btnMusic = document.getElementById('btn-toggle-music');
        function updateMusicUI() {
            var pi = document.getElementById('play-icon'), pa = document.getElementById('pause-icon');
            if (!bgMusic || !pi || !pa) return;
            if (bgMusic.paused) { pi.style.display = 'block'; pa.style.display = 'none'; if (btnMusic) btnMusic.classList.remove('music-playing'); }
            else { pi.style.display = 'none'; pa.style.display = 'block'; if (btnMusic) btnMusic.classList.add('music-playing'); }
        }
        function startBgMusic() { if (bgMusic) { bgMusic.volume = 0.4; bgMusic.play().then(updateMusicUI).catch(function () {}); } }
        if (bgMusic) { bgMusic.addEventListener('play', updateMusicUI); bgMusic.addEventListener('pause', updateMusicUI); }
        if (btnMusic) btnMusic.addEventListener('click', function () {
            if (!bgMusic) return;
            if (bgMusic.paused) bgMusic.play().catch(function () {}); else bgMusic.pause();
        });

        // ============================================================
        // DESKTOP SIDEBAR — decorative running animation (high-DPI crisp)
        // ============================================================
        var sideCanvas = document.getElementById('rm-side-canvas');
        var sideRaf = null;
        if (sideCanvas) {
            var sctx = sideCanvas.getContext('2d');
            var sT = 0, sDpr = 1;
            function sideResize() {
                sDpr = Math.min(window.devicePixelRatio || 1, 3);
                sideCanvas.width = Math.max(1, Math.round(sideCanvas.clientWidth * sDpr));
                sideCanvas.height = Math.max(1, Math.round(sideCanvas.clientHeight * sDpr));
                sctx.setTransform(sDpr, 0, 0, sDpr, 0, 0);
            }
            sideResize(); window.addEventListener('resize', sideResize);
            onCleanup(function () { window.removeEventListener('resize', sideResize); });
            function sideLoop() {
                sideRaf = requestAnimationFrame(sideLoop);
                var w = sideCanvas.clientWidth, h = sideCanvas.clientHeight; if (!w) return;
                sT += 1;
                sctx.clearRect(0, 0, w, h);
                sctx.fillStyle = 'rgba(200,76,12,0.9)'; sctx.fillRect(0, h - 60, w, 60);
                sctx.fillStyle = 'rgba(224,123,42,0.9)'; sctx.fillRect(0, h - 60, w, 6);
                sctx.fillStyle = 'rgba(255,255,255,0.85)';
                for (var i = 0; i < 5; i++) {
                    var cx = (i * 240 - sT * 0.4) % (w + 200) - 100; var cy = 80 + (i % 3) * 50;
                    sctx.fillRect(cx, cy, 70, 18); sctx.fillRect(cx + 16, cy - 12, 36, 18);
                }
                var by = h - 110 + Math.sin(sT * 0.06) * 16;
                sctx.fillStyle = '#fac000'; sctx.fillRect(w / 2 - 8, by, 16, 24);
                sctx.fillStyle = '#e89000'; sctx.fillRect(w / 2 - 8, by, 4, 24);
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

        // Restore any previously-unlocked inventory (so revisits keep progress)
        buildInventory();
        updateViewBtn();
    }

    // Run now if DOM ready (script is injected after DOMContentLoaded in-app).
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
