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

        // Theme/game version — shown bottom-center of the stage (like metalslug-wedding).
        var RM_VERSION = 'v1.3.8';   // v1.3.8: FREEZE the RAF game loop while ANY dialog is open (piece modal, gallery
                                     //         lightbox, reset-confirm, stage-select, invitation reveal) via a new
                                     //         anyDialogOpen() gate — Mario no longer dies / the timer no longer drains
                                     //         behind a popup. PREV v1.3.7: fix desktop sidebar showing ONLY the sky (no Mario+bride tableau) on the
                                     //         LIVE invitation. The side canvas was captured ONCE and never healed, so after
                                     //         host re-injection it kept painting the detached node while the on-screen
                                     //         canvas stayed blank (CSS sky gradient showed through). Added sideReacquire()
                                     //         self-heal to sideLoop(), mirroring the game-canvas reacquire().
        // var RM_VERSION = 'v1.3.6'; // v1.3.6: CONSOLIDATE all button wiring onto the ONE delegated document listener and
                                     //         DELETE the fragile MutationObserver/rewireToolbar/data-rm-wired machinery that
                                     //         v1.3.3–v1.3.5 added. That machinery mixed per-element + delegated + observer
                                     //         wiring and broke buttons that used to work (VIEW INVITATION, stage-select OK/
                                     //         TUTUP): the observer fired on the theme's OWN DOM writes and rebuilt state, and
                                     //         the data-rm-wired guard either blocked a needed re-bind or double-bound. Now
                                     //         EVERY control (toolbar ★/🔇/stage-select/view/settings, stage-select OK/TUTUP,
                                     //         reset OK/BATAL, close/back/replay, modal ✕, dialog backdrops) is a single entry
                                     //         in RM_DELEGATED_BTNS / rmDelegated — delegation survives host re-injection for
                                     //         free. Handlers re-query their node live. Only the JS-populated inventory rail
                                     //         still needs healing after re-inject; that's done cheaply from loop() (like the
                                     //         canvas self-heal), not a broad subtree observer.
        // ---- older ----
        // var RM_VERSION = 'v1.3.5'; // v1.3.5: fix RESET GAME dialog buttons (YA RESET / BATAL / tap-backdrop) doing nothing
                                     //         on the LIVE invitation / after fullscreen — per-element listeners died on re-inject.
        // ---- older ----
        // var RM_VERSION = 'v1.3.4'; // v1.3.4: ★ CHEAT now instantly OPENS (enables) every top-right inventory icon the
                                     //         moment it's turned on — previously toggling cheat only unlocked the view/
                                     //         stage-select shortcuts, leaving the icon boxes locked until you hit "?" blocks.
                                     //         The cheat unlock is a temporary VIEW override (not persisted), so turning cheat
                                     //         OFF re-locks the pieces you never actually collected. Also re-applied after a
                                     //         fullscreen/host re-inject rebuild so the icons don't silently re-lock.
        // ---- older ----
        // var RM_VERSION = 'v1.3.3'; // v1.3.3: fix top-RIGHT inventory rail going EMPTY + top-LEFT toolbar buttons (★ cheat,
                                     //         🔇 sound, stage-select, view-invitation, settings) going DEAD on the LIVE
                                     //         invitation. Host re-injects the theme HTML on guest-state change without
                                     //         re-running this JS, so JS-populated #rm-inv reverts to empty markup and the
                                     //         toolbar's per-element listeners die (only QR survived, host re-wires it).
                                     //         Fix: a MutationObserver on the host's persistent container re-queries those
                                     //         nodes, re-binds named handlers, and rebuilds the inventory after re-injection.
        // ---- older ----
        // var RM_VERSION = 'v1.3.2'; // v1.3.2: fix BLACK game area on the LIVE invitation (esp. after LANJUTKAN/MULAI BARU)
                                     //         — the host re-injects the theme HTML and REPLACES the <canvas> node, but our
                                     //         JS isn't re-run, so we kept drawing into the OLD detached canvas while the new
                                     //         one stayed blank (HUD/buttons are separate DOM, so they still showed). Now the
                                     //         loop self-heals: reacquire() detects a detached canvas, re-grabs the live
                                     //         canvas/ctx/stage, re-attaches the ResizeObserver, and re-sizes+repaints. Also
                                     //         (v1.3.1) resize() reports success + the loop retries until the stage measures a
                                     //         real size, covering the 0×0-at-startup black-screen race;
                                     // v1.3.0: fix overlay buttons dead on the LIVE invitation (LANJUTKAN/MULAI BARU/
                                     //         intro/stage/win/rescue "stuck di screen") — they were bound directly to
                                     //         host-re-injected nodes; now routed through the delegated document listener
                                     //         (RM_DELEGATED_BTNS), like the cover buttons. Plus a glass toolbar/inventory
                                     //         redesign (CSS only): frosted panes + black icons;
                                     // v1.2.1: REAL idle/crouch judder fix — a standing Mario never actually settled
                                     //         (GRAV re-applied each frame + the block collider tests feet at (y+h-1),
                                     //         which stays in the empty row above → never snapped → player.y & onGround
                                     //         oscillated 594.0/594.55 forever, so sy rounded 590/591 = 1px buzz/frame).
                                     //         Two-layer fix: (a) collideAxis GROUNDED SETTLE snaps feet flush when
                                     //         falling slow onto a solid directly underfoot (stabilises y+onGround at the
                                     //         source); (b) drawPlayer anchors sy to the probed tile SURFACE, not the live
                                     //         y or the flickering onGround flag — verified rock-steady via Node harness;
                                     // v1.2.0: richer SMB-style animation — 4-frame WALK + 4-frame RUN (bigger stride,
                                     //         pumping arms, faster cadence past walk-max), fire THROW pose (in air & on
                                     //         ground), idle "breath" (idle/idle2 alt), climb/pole-grab poses, and a
                                     //         transform FLICKER on grow/shrink/fire pickup;
                                     // v1.1.1: fix idle/crouch vertical judder — anchor feet on player.onGround, not the vy window;
                                     // v1.1.0: version badge + lower mobile brick band (2 rows less);
                                     // v1.0.x: delegated cover buttons (PRESS START/difficulty survive host re-injection)
        try { console.log('%c[retromario] ' + RM_VERSION, 'background:#e52521;color:#fff;padding:2px 6px;border-radius:3px'); } catch (e) {}

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
            // 0 on desktop (controls hidden), ~5 tiles on touch devices (resize()).
            var BOTTOM_SAFE = 0;
            var BOTTOM_SAFE_TILES = 5; // deep-ground rows under the surface on mobile.
                                       // Lowered 7→5 (−2 rows) so the mobile brick/ground
                                       // band isn't too tall below the touch controls.

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
                castle:     { sky: ['#2a1020', '#fbdfe7'], ground: '#555', groundTop: '#777', groundDark: '#333', hills: '#3a2030', clouds: '#7a4050', underground: false, lava: true },
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
                        announcedAll: announcedAll, gameDiff: gameDiff, muted: muted
                    }));
                } catch (e) {}
            }
            function resetSave() {
                try { localStorage.removeItem(STORE_KEY); } catch (e) {}
                unlocked = {}; seenInfo = {}; bestScore = 0; bestStage = 1; completed = false; announcedAll = false; gameDiff = 'medium';
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
                } }; },

                // ---- Harder-difficulty patterns (new enemies/hazards/challenges) ----

                // ENEMY GAUNTLET: a dense run of mixed enemies (goomba+koopa+spiny)
                // — the higher-difficulty "reaction" set. Solvable (still flat floor).
                gauntlet: function (kinds) { return { width: kinds.length * 3 + 3, stamp: function (g, x) {
                    fillGroundCols(g, x, x + kinds.length * 3 + 2);
                    for (var i = 0; i < kinds.length; i++) g[x + 2 + i * 3][up(1)] = kinds[i];
                } }; },

                // ELEVATED ENEMY: a goomba/koopa standing on a brick ledge over a
                // coin, so it can drop on you — vertical threat (bible §7 variety).
                ledgeEnemy: function (kind) { return { width: 6, stamp: function (g, x) {
                    fillGroundCols(g, x, x + 5);
                    g[x + 2][up(3)] = 'B'; g[x + 3][up(3)] = 'B';
                    g[x + 2][up(4)] = kind;           // enemy perched on the ledge
                    g[x + 4][up(1)] = 'o';
                } }; },

                // SPIKE GAP: two short pits split by a thin one-tile pillar — a
                // tight double-hop. Harder timing than a single gap. Always clearable
                // (each sub-gap ≤ 3, pillar in the middle gives footing).
                doubleGap: function (w) { w = clamp(w, 2, 3); return { width: w * 2 + 5, stamp: function (g, x) {
                    fillGroundCols(g, x, x + 1);
                    carveGap(g, x + 2, x + 1 + w);
                    fillGroundCols(g, x + 2 + w, x + 2 + w);   // 1-tile foothold pillar
                    carveGap(g, x + 3 + w, x + 2 + w * 2);
                    fillGroundCols(g, x + 3 + w * 2, x + 4 + w * 2);
                    g[x + 2 + w][up(4)] = 'o';
                } }; },

                // PIRANHA CORRIDOR: two piranha pipes close together — must time
                // passage through both. Hard-mode hazard density.
                piranhaCorridor: function (h) { h = h || 3; return { width: 11, stamp: function (g, x) {
                    fillGroundCols(g, x, x + 10);
                    for (var s = 0; s < 2; s++) {
                        var px0 = x + 1 + s * 6;
                        for (var i = 0; i < h; i++) {
                            g[px0][up(1 + i)] = (i === h - 1) ? 'T' : '[';
                            g[px0 + 1][up(1 + i)] = (i === h - 1) ? 'U' : ']';
                        }
                        g[px0][up(h + 1)] = 'P';
                    }
                    g[x + 5][up(5)] = 'o';
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

            // Combine the world's BASE difficulty with the player-chosen gameDiff.
            // gameDiff shifts the world's diff one step easier/harder, clamped.
            // Returns {hard, med, gapBase, pipeH, lenMul, extra} knobs.
            function diffKnobs(stage) {
                var world = WORLDS[stage - 1] || WORLDS[0];
                var baseIdx = world.diff === 'hard' ? 2 : (world.diff === 'medium' ? 1 : 0);
                var modeIdx = gameDiff === 'hard' ? 1 : (gameDiff === 'medium' ? 0 : -1);
                var lvl = clamp(baseIdx + modeIdx, 0, 2);     // 0 easy · 1 med · 2 hard
                return {
                    lvl: lvl,
                    hard: lvl === 2, med: lvl === 1,
                    gapBase: lvl === 2 ? 4 : (lvl === 1 ? 3 : 2),
                    pipeH:   lvl === 2 ? 4 : (lvl === 1 ? 3 : 2),
                    // Hard stages are LONGER: the biome's middle section repeats once
                    // more (item 5 "stage lebih panjang"); easy is shortest.
                    lenMul:  lvl === 2 ? 2 : 1,
                    // Higher difficulty unlocks the new enemy/hazard patterns.
                    extra:   lvl >= 1,
                    // DIFFICULTY RE-TUNE (felt too easy on every mode). Enemies now
                    // move noticeably faster as the level rises — still far below the
                    // player's run speed (RUN_MAX 3.4) so every threat stays readable
                    // and reactable (bible §1.3 Fair Challenge, §14 Camera).
                    //   easy 0.65 · med 0.95 · hard 1.3  (was a flat 0.55 everywhere)
                    enemySpeed: lvl === 2 ? 1.3 : (lvl === 1 ? 0.95 : 0.65),
                    // Enemy DENSITY multiplier applied to walker clusters (goombas).
                    // Honours bible §7.2 (1/10-20 tiles easy → 1/3-6 hard) without
                    // ever spawning inside the §2.2 start-safe zone.
                    //   easy ×1 · med ×1.5 · hard ×2  (rounded per pattern)
                    enemyMul: lvl === 2 ? 2 : (lvl === 1 ? 1.5 : 1),
                    // Tighter spacing between clustered walkers at higher levels.
                    goombaSpace: lvl === 2 ? 3 : (lvl === 1 ? 4 : 5)
                };
            }

            function buildSpine(stage) {
                var world = WORLDS[stage - 1] || WORLDS[0];
                var k = diffKnobs(stage);
                var quota = stageInfoQuota(stage);   // how many "?" this stage seeds
                var hard = k.hard, med = k.med, gapBase = k.gapBase, pipeH = k.pipeH;
                var nInfo = 0;
                // info() drops a real "?" block while the stage still has quota left,
                // else a coin trail of the same footprint (pure score filler).
                function info() { if (nInfo < quota) { nInfo++; return PAT.infoBlock(); } return PAT.coinTrail(3); }

                var spine;

                if (stage === 1) {
                    // STAGE 1 — discovery run; teaches every core mechanic.
                    // POWER-UP PLACEMENT FIX (item 6): the mushroom/star sit EARLY,
                    // BEFORE the enemy clusters & gaps, so the buff is actually usable
                    // through the challenge (bible flow: Reward → Challenge), never
                    // stranded in the empty tail.
                    var s1 = [
                        PAT.flat(6), PAT.coinTrail(4), info(), PAT.powerRow('M'),   // early mushroom
                        PAT.goombas(1), PAT.coinArc(), PAT.qrow(['C', 'o', 'M']),
                        PAT.gap(1), info(), PAT.goombas(1), PAT.pipe(2),
                        PAT.floatPlat(3), PAT.coinTrail(5), info(), PAT.powerRow('S'), // star before the gauntlet
                        PAT.staircase(3), PAT.gap(2), PAT.koopa(), PAT.warpPipe(2),
                        PAT.hiddenBonus(), info(), cp(PAT.flat(4)),
                        PAT.qrow(['C', 'o']), info(), PAT.spiny(), PAT.gap(2),
                        PAT.goombas(Math.max(2, Math.round(2 * k.enemyMul)), k.goombaSpace),
                        info(), PAT.piranhaPipe(2), PAT.coinArc(), PAT.spring(),
                        info(), PAT.staircase(3), PAT.gap(2), info(), PAT.coinTrail(6),
                        PAT.qrow(['C', 'M']), info(), PAT.goombas(1), info()
                    ];
                    // hard adds an extra enemy gauntlet + gap before the run-up
                    if (k.extra) s1 = s1.concat([PAT.gauntlet(['g', 'k', 's']), PAT.gap(gapBase)]);
                    if (k.hard)  s1 = s1.concat([PAT.ledgeEnemy('k'), PAT.doubleGap(3)]);
                    spine = s1.concat([PAT.flat(6)]);
                } else {
                    // STAGES 2-8 — distinct biome layout; info() seeds this stage's
                    // quota (stages 2-4) and is inert filler afterwards.
                    spine = biomeSpine(world.biome, k, info);
                }

                return { spine: spine, infoCount: nInfo };
            }

            // Per-biome layout grammar — the heart of stage variety. Each returns a
            // full Start→…→Goal spine with a tagged checkpoint, distinct from the
            // others in structure, not just colour. `k` = difficulty knobs.
            function biomeSpine(biome, k, info) {
                var hard = k.hard, med = k.med, gapBase = k.gapBase, pipeH = k.pipeH;
                // Density-scaled goomba cluster: count grows with diffKnobs.enemyMul
                // and spacing tightens with goombaSpace (bible §7.2). Always ≥ the
                // authored count, never placed in the start-safe zone (spine tail).
                function gob(n) {
                    var cnt = Math.max(n, Math.round(n * k.enemyMul));
                    return PAT.goombas(cnt, k.goombaSpace);
                }
                // POWER-UP FIX: every biome opens with an EARLY power-up (mushroom on
                // easy/med, star on hard) right after the safe start, so the buff is
                // usable across the whole stage — never dumped in the empty tail.
                var start = [PAT.flat(7), PAT.coinTrail(4), PAT.powerRow(hard ? 'S' : 'M')];
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
                            PAT.brickTunnel(6), gob(2), info(),
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
                            gob(2), PAT.desertRun(hard)
                        ];
                        break;
                    case 'forest':
                        // Layered tiers + verticality + koopas/spiny up in the trees.
                        s = [
                            PAT.forestTiers(), gob(2), PAT.gap(gapBase),
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
                            PAT.castleGap(gapBase), gob(2), PAT.coinArc(),
                            cp(PAT.flat(4)), PAT.castleGap(gapBase + 1), PAT.spiny(),
                            PAT.piranhaPipe(pipeH), PAT.castleGap(gapBase), PAT.koopa(),
                            PAT.castleGap(gapBase), PAT.spiny()
                        ];
                        break;
                    default:
                        s = [PAT.goombas(1), PAT.coinArc(), PAT.pipe(pipeH), cp(PAT.flat(4)), PAT.gap(gapBase), PAT.coinTrail(5)];
                }

                // DIFFICULTY EXTRAS (item 5): on medium/hard, splice the NEW
                // enemy/hazard patterns into the challenge section so higher levels
                // genuinely have new threats, not just recolours.
                if (k.extra) {
                    var ex = (biome === 'water' || biome === 'sky')
                        ? [PAT.ledgeEnemy('k'), gob(2), PAT.gap(gapBase)]        // air biomes: perched enemy + cluster + gap
                        : [PAT.gauntlet(['g', 'k', 'g']), PAT.piranhaCorridor(pipeH)]; // ground: denser gauntlet + piranha corridor
                    if (k.hard) ex = ex.concat([PAT.gauntlet(['s', 'g', 'k', 'g']), gob(2), PAT.doubleGap(gapBase - 1)]);
                    s = s.concat(ex);
                }
                // LONGER STAGES on hard (item 5 "stage lebih panjang"): repeat the
                // biome's challenge body once more (a fresh, harder second leg).
                if (k.lenMul > 1) {
                    s = s.concat(s.slice(2));   // skip the duplicated checkpoint tag region
                }

                // Shared finale: a mid power-up sits BEFORE the final challenge run
                // (usable), then coins + the run-up to the flag (no power-up stranded
                // at the very end — item 6).
                var tail = [PAT.powerRow(hard ? 'S' : 'M'), PAT.coinTrail(4), PAT.goombas(1), PAT.coinTrail(5), PAT.flat(6)];
                return start.concat(s, tail);
            }

            function buildLevel(stage) {
                var built = buildSpine(stage);
                var spine = built.spine;

                var isBoss = !!(BIOMES[(WORLDS[stage - 1] || WORLDS[0]).biome] || {}).boss;

                // Measure total width and allocate the grid. Boss stages reserve a
                // LONG ending runway (item: ending lebih dramatis) so Mario can: beat
                // the boss → walk on → reach the caged princess → free her → walk
                // TOGETHER to a flag pole at the very end.
                var total = 0; spine.forEach(function (p) { total += p.width; });
                var pad = 6;
                var BOSS_RUNWAY = 40;          // boss-gate → prison → flag pole
                var COLS = total + pad + 6 + (isBoss ? BOSS_RUNWAY : 0);
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

                fillGroundCols(grid, cx, COLS - 1);
                var flagX, prisonX = 0, bossX = 0;
                if (isBoss) {
                    // BOSS STAGE ending (dramatic re-staging):
                    //   bossX  — arena gate; the boss must be defeated here before
                    //            Mario can move on (he is held back while it lives).
                    //   prisonX— a CAVE-PRISON cell a good walk further on; the
                    //            princess waits behind bars until Mario frees her.
                    //   flagX  — a real FLAG POLE at the very end; after the rescue
                    //            the couple walk TOGETHER to it for the "wah" finale.
                    bossX   = cx + 3;
                    prisonX = bossX + 16;       // walk a while before reaching her
                    flagX   = prisonX + 16;     // then stroll together to the pole
                    // Flag pole tiles (same as normal stages) at the very end.
                    grid[flagX][up(1)] = 'F'; grid[flagX][up(2)] = 'F';
                    grid[flagX][up(3)] = 'F'; grid[flagX][up(4)] = 'F'; grid[flagX][up(5)] = 'F';
                } else {
                    // Flag pole near the end on solid ground (stages 1-7).
                    flagX = cx + 1;
                    grid[flagX][up(1)] = 'F'; grid[flagX][up(2)] = 'F';
                    grid[flagX][up(3)] = 'F'; grid[flagX][up(4)] = 'F'; grid[flagX][up(5)] = 'F';
                }

                return { grid: grid, cols: COLS, flagX: flagX, checkpointX: checkpointX, prisonX: prisonX, bossX: bossX, isBoss: isBoss, seedInfo: built.seedInfo };
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
                var dk = diffKnobs(stage);          // difficulty knobs for THIS stage

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
                    prisonX: (level.prisonX || 0) * TILE,
                    bossX: (level.bossX || 0) * TILE,
                    coins: [], enemies: [], boxes: [], pipes: [], springs: [], hidden: [], warps: [],
                    infoTotal: 0, powerups: [], fireballs: [], particles: [],
                    worldW: COLS * TILE, worldH: ROWS * TILE,
                    flagReached: false, flagY: 0, boss: null,
                    enemySpeed: dk.enemySpeed, diffLvl: dk.lvl
                };

                for (var x = 0; x < COLS; x++) {
                    for (var r = 0; r < ROWS; r++) {
                        var ch = g[x][r];
                        if (ch === 'o') { world.coins.push({ x: x * TILE + 3, y: r * TILE + 2, taken: false, t: Math.random() * 6 }); g[x][r] = ' '; }
                        else if (ch === 'g') { world.enemies.push(mkEnemy(x, r, 'goomba', dk.enemySpeed)); g[x][r] = ' '; }
                        else if (ch === 'k') { world.enemies.push(mkEnemy(x, r, 'koopa', dk.enemySpeed)); g[x][r] = ' '; }
                        else if (ch === 's') { world.enemies.push(mkEnemy(x, r, 'spiny', dk.enemySpeed)); g[x][r] = ' '; }
                        else if (ch === 'P') { world.enemies.push(mkEnemy(x, r, 'piranha', dk.enemySpeed)); g[x][r] = ' '; }
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

                // Boss world: spawn the boss near the run-up, and a captured princess
                // INSIDE A CAVE PRISON cell at the goal (item 4). She stands behind
                // bars until rescued, then steps out. The prison is drawn in render()
                // (cosmetic) — it never blocks Mario, so reaching prisonX is the goal.
                if (isBoss) {
                    world.boss = mkBoss(world.bossX / TILE - 6, dk.lvl);
                    // Princess feet rest ON the ground surface (GROUND_R top), so she
                    // stands level with Mario (his feet line is also GROUND_R*TILE) —
                    // no more "floating" once rescued/escorting (item 5). h=16 → y is
                    // one tile-bottom above the surface.
                    world.princess = { x: world.prisonX + 2, y: GROUND_R * TILE - 16, w: 12, h: 16, t: 0, rescued: false, freed: false };
                }
                return world;
            }

            function mkEnemy(c, r, kind, spd) {
                // Walk speed scales with difficulty (diffKnobs.enemySpeed); falls back
                // to the old flat value if unspecified. Direction stays leftward.
                var v = -(spd || 0.55);
                var base = { x: c * TILE, y: (GROUND_R - 1) * TILE, w: 14, h: 14, vx: v, vy: 0,
                    alive: true, squash: 0, kind: kind, t: Math.random() * 6 };
                if (kind === 'piranha') {
                    base.x = c * TILE + 1; base.y = (r) * TILE; base.baseY = (r) * TILE; base.vx = 0; base.range = 24; base.up = false;
                }
                return base;
            }

            // Boss (Boom-Boom style, bible Appendix E §12): 3 stomps per phase, 3
            // phases. Walks/charges on the ground; faster each phase; invulnerable
            // briefly after a hit. Fair: stompable, never spawns off-screen attacks.
            function mkBoss(c, lvl) {
                lvl = lvl || 0;     // 0 easy · 1 med · 2 hard
                // Boss scales with difficulty (item: semua mode di-adjust). Faster
                // patrol/charge and a snappier jump cadence on higher levels, while
                // staying fair (telegraphed, stompable, never an off-screen attack —
                // bible Appendix E §13/§17). HP unchanged (9 = 3 stomps × 3 phases).
                var spd = lvl === 2 ? 1.9 : (lvl === 1 ? 1.45 : 1.1);
                return { x: c * TILE, y: (GROUND_R - 2) * TILE, w: 26, h: 28,
                    vx: spd, vy: 0, alive: true, hp: 9, phase: 1, hitFlash: 0,
                    invuln: 0, t: 0, jumpCd: 90 - lvl * 16, kind: 'boss',
                    lvl: lvl, baseSpd: spd };
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
                    warpCd: 0, throwT: 0, morphT: 0,
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
            // Chosen difficulty mode (cover selector; cheat can re-cycle it). It
            // BOOSTS the per-world base difficulty: easy=−1 step, medium=0, hard=+1.
            // Used by buildSpine to scale length, enemy density, gaps, hazards.
            var gameDiff = (saved.gameDiff === 'easy' || saved.gameDiff === 'hard') ? saved.gameDiff : 'medium';
            var DIFF_ORDER = ['easy', 'medium', 'hard'];
            var animT = 0;          // global animation clock (frames) for sprite cycles
            var fireworks = [];     // celebratory firework bursts (final victory cutscene)
            var fwActive = 0;       // frames remaining of the firework celebration
            // Full-screen celebration flash: a white→colour burst + radiating shock
            // ring drawn over everything on a big moment (princess rescued, all-info
            // collected). flash.t counts down; flash.col tints it.
            var flash = { t: 0, max: 1, col: '#fff' };
            function triggerFlash(frames, col) { flash.t = frames; flash.max = frames; flash.col = col || '#fff'; }

            var elCoins = document.getElementById('rm-coins');
            var elScore = document.getElementById('rm-score');
            var elWorld = document.getElementById('rm-world');
            var elToast = document.getElementById('rm-toast');
            var elDiffBadge = document.getElementById('rm-diff-badge');
            var DIFF_LVL_NAME = ['EASY', 'MEDIUM', 'HARD'];

            function setHUD() {
                if (elCoins) elCoins.textContent = '×' + ('00' + coinGot).slice(-2);
                if (elScore) elScore.textContent = ('000000' + score).slice(-6);
                if (elWorld) elWorld.textContent = (WORLDS[stageNum - 1] || WORLDS[0]).name;
                // Difficulty badge (item 4): show the EFFECTIVE level of the current
                // stage — the world's base difficulty combined with the chosen mode.
                if (elDiffBadge) {
                    var lvl = diffKnobs(stageNum).lvl;            // 0 easy · 1 med · 2 hard
                    var key = ['easy', 'medium', 'hard'][lvl];
                    elDiffBadge.textContent = DIFF_LVL_NAME[lvl];
                    elDiffBadge.setAttribute('data-lvl', key);
                }
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
                // BIG "WAH": gold screen-flash + an erupting fireworks burst + the
                // victory fanfare, then the congratulations dialog opens by itself.
                playSfx('fanfare');
                triggerFlash(46, '#fff3b0');
                startFireworks();
                for (var bxr = 0; bxr < 5; bxr++) {
                    spawnFirework(camX + 30 + bxr * (VW - 60) / 4, camY + 30 + (bxr % 2) * 24);
                }
                toast('🎉 SEMUA INFO TERKUMPUL! 🎉<br>' +
                    '<span style="font-size:8px;color:#fac000">Undangan terbuka — selamat! ✨</span>', 2200);
                if (viewBtn) viewBtn.classList.add('just-unlocked');
                setTimeout(function () { if (viewBtn) viewBtn.classList.remove('just-unlocked'); }, 700);
                setTimeout(function () { triggerFlash(30, '#ffd84a'); }, 700);
                // All info collected → the invitation can already be opened. But the
                // princess is still caged by the boss: offer the OPTIONAL bonus-stage
                // rescue (item 3) instead of jumping straight to the congrats dialog.
                setTimeout(function () { showRescueOffer(); }, 1700);
            }

            // BONUS RESCUE OFFER (item 3) — shown once every invitation piece is
            // collected. Tells the guest the undangan is ready BUT the princess is
            // still held by the monster, and frames the remaining boss run as an
            // OPTIONAL bonus stage (extra coins + rescuing the princess). Two routes:
            //   • "YA, SELAMATKAN" → resume play toward the boss stage.
            //   • "Buka Undangan"  → open the full invitation right now.
            function showRescueOffer() {
                running = false;
                var groom = val('groom_nickname', 'Mempelai Pria');
                var bride = val('bride_nickname', 'Mempelai Wanita');
                var el = document.getElementById('rm-rescue-text');
                if (el) {
                    el.innerHTML =
                        '<div style="color:#ffd24a;font-size:12px;line-height:1.85;margin-bottom:10px">' +
                        'Kamu sudah mengumpulkan <strong>SEMUA</strong> kepingan undangan — ' +
                        'halaman undangan kami siap dibuka! 💌' +
                        '</div>' +
                        '<div style="font-size:12.5px;line-height:1.8;color:rgba(255,255,255,0.92)">' +
                        'Tapi tunggu… sang putri <strong>' + esc(bride) + '</strong> ' +
                        'masih <strong>ditawan oleh monster</strong>! 👹🏰<br>' +
                        'Maukah kamu membantu <strong>' + esc(groom) + '</strong> ' +
                        'menyelamatkannya?' +
                        '</div>';
                }
                showOverlay('rm-rescue');
            }

            var modalRoot = document.getElementById('rm-modal-root');
            var modalBody = document.getElementById('rm-modal-body');
            var modalTitle = document.getElementById('rm-modal-title');
            var modalIco = document.getElementById('rm-modal-ico');

            // DUPLICATE-ID GUARD: the RSVP/wishes info-block modals clone a whole
            // `.rm-sec` (which carries host IDs like #rsvp-form/#wish-message) into
            // #rm-modal-body. The full invitation source (#rm-invitation) already holds
            // those same IDs, so a naive clone yields two copies. The host reads submit
            // values via container.querySelector('#<id>') = FIRST match in DOM, and
            // #rm-invitation precedes #rm-modal-root — so it would read the wrong (source)
            // copy and reveal the wrong thank-you card. While a modal is open we strip the
            // host IDs from the source (#rm-invitation) so the visible modal clone the guest
            // clicks is the sole match, and restore them on close.
            var RM_HOST_IDS = ['btn-submit-kehadiran', 'rsvp-form', 'rsvp-status', 'rsvp-guests', 'rsvp-code', 'guest-name-input', 'alert-submit-kehadiran',
                'btn-submit-ucapan', 'wish-form', 'wish-name', 'wish-message', 'alert-submit-ucapan'];
            function rmSetSourceHostIds(enabled) {
                var src = document.getElementById('rm-invitation'); if (!src) return;
                RM_HOST_IDS.forEach(function (id) {
                    if (!enabled) {
                        var els = src.querySelectorAll('#' + id);
                        Array.prototype.forEach.call(els, function (el) { el.setAttribute('data-rmid', id); el.removeAttribute('id'); });
                    } else {
                        var els2 = src.querySelectorAll('[data-rmid="' + id + '"]');
                        Array.prototype.forEach.call(els2, function (el) { el.setAttribute('id', id); el.removeAttribute('data-rmid'); });
                    }
                });
            }

            function openModal(info) {
                var sec = document.querySelector('.rm-sec[data-info="' + info.key + '"]');
                if (!sec || !modalRoot) return;
                modalBody.innerHTML = '';
                var clone = sec.cloneNode(true);   // clone carries host IDs
                clone.classList.add('rm-modal-clone');
                modalBody.appendChild(clone);
                rmSetSourceHostIds(false);         // strip IDs from #rm-invitation → clone is sole match
                if (info.key === 'schedule') renderCalendar(clone.querySelector('.rm-cal'));
                modalTitle.textContent = info.label;
                if (modalIco) { modalIco.width = 14; modalIco.height = 14; pixIcon(modalIco, info.key); }
                modalRoot.classList.add('show');
                playSfx('modal');
            }
            function closeModal() {
                var m = document.getElementById('rm-modal-root'); if (m) m.classList.remove('show');
                var mb = document.getElementById('rm-modal-body'); if (mb) mb.innerHTML = '';
                rmSetSourceHostIds(true);          // restore IDs so the full invitation forms work
            }
            // rm-modal-close (✕) and the rm-modal-root backdrop are routed through the
            // delegated document listener below, so they survive host re-injection.

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
            // Sound on/off (item 5): mutes the game SFX + the 8-bit chiptune. Persisted
            // so the guest's choice survives reloads. The tenant invitation song is
            // NOT affected (it's controlled by the FAB music button on the invitation).
            var muted = !!saved.muted;
            // SFX REBUILT to track the real SMB sound design as closely as a tiny
            // WebAudio synth allows (item 4). Key fidelity points modelled on the
            // originals:
            //   • jump   — a fast UP-glide on a square (the "spin/boing" launch)
            //   • coin   — two crisp notes B5→E6 (the unmistakable ka-ching)
            //   • bump   — a short low square knock
            //   • stomp  — a quick down-chirp ("squish")
            //   • powerup (sprout) — the rising 6-note appear run
            //   • powerup (grab)   — the fast ascending grab run
            //   • 1up    — E5 G5 E6 C6 D6 G6 jingle shape
            //   • pipe/warp — a descending glide
            //   • die    — the two-phase falling death tune
            //   • flag/stageclear — the descending pole slide + clear fanfare
            // Each voice gets a tiny attack so square waves don't click.
            function playSfx(type) {
                if (muted) return;
                var c = audioCtx(); if (!c) return;
                if (c.state === 'suspended') c.resume();
                var t0 = c.currentTime;
                // A single voice with optional pitch glide. `slide` ramps f0→f1
                // linearly (SMB-style portamento); attack/decay shaped per call.
                function voice(f0, f1, start, dur, vol, wave, slide) {
                    var o = c.createOscillator(), g = c.createGain();
                    o.type = wave || 'square';
                    var ts = t0 + start;
                    o.frequency.setValueAtTime(f0, ts);
                    if (f1 && f1 !== f0) {
                        if (slide) o.frequency.linearRampToValueAtTime(f1, ts + dur);
                        else o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), ts + dur);
                    }
                    g.gain.setValueAtTime(0.0001, ts);
                    g.gain.exponentialRampToValueAtTime(vol || 0.08, ts + 0.006);   // fast attack (no click)
                    g.gain.exponentialRampToValueAtTime(0.0001, ts + dur);
                    o.connect(g).connect(c.destination); o.start(ts); o.stop(ts + dur + 0.02);
                }
                function tone(f0, f1, dur, vol, wave) { voice(f0, f1, 0, dur, vol, wave, false); }
                // sequence of discrete notes (a melody/run), scheduled on the clock
                function seq(notes, step, dur, vol, wave) {
                    for (var i = 0; i < notes.length; i++) voice(notes[i], notes[i], i * step, dur, vol, wave, false);
                }
                // a tiny percussive noise burst (detuned squares) for thuds/squishes
                function noise(f, start, dur, vol) {
                    voice(f, f * 0.4, start, dur, vol, 'square', true);
                    voice(f * 1.5, f * 0.5, start, dur, (vol || 0.06) * 0.6, 'sawtooth', true);
                }

                if (type === 'jump') { voice(380, 880, 0, 0.18, 0.07, 'square', true); }          // SMB launch glide UP
                else if (type === 'bigjump') { voice(320, 760, 0, 0.24, 0.08, 'square', true); }
                else if (type === 'coin') { voice(988, 988, 0, 0.07, 0.07, 'square'); voice(1319, 1319, 0.07, 0.42, 0.07, 'square'); } // B5 → E6 hold
                else if (type === 'stomp') { voice(420, 90, 0, 0.13, 0.07, 'square', true); }      // squish down-chirp
                else if (type === 'power') { tone(523, 1046, 0.18, 0.07); }
                else if (type === 'powerup') { seq([392, 523, 659, 784, 1046, 1319], 45, 0.11, 0.07, 'square'); } // grab — fast rising run
                else if (type === 'sprout') { seq([330, 392, 494, 659, 784], 60, 0.13, 0.06, 'square'); }        // item emerges (rising)
                else if (type === 'unlock') { seq([659, 988, 1319], 70, 0.13, 0.08, 'square'); }   // info revealed flourish
                else if (type === 'modal') { voice(740, 1110, 0, 0.10, 0.06, 'square', true); }
                else if (type === 'die') {                                                          // SMB death: descending notes then a long fall
                    voice(523, 523, 0, 0.12, 0.09, 'square');
                    voice(392, 392, 0.12, 0.12, 0.09, 'square');
                    voice(330, 330, 0.24, 0.14, 0.09, 'square');
                    voice(262, 110, 0.40, 0.5, 0.09, 'triangle', true);                            // long fall
                }
                else if (type === 'fireball') { voice(900, 320, 0, 0.12, 0.05, 'sawtooth', true); }
                else if (type === 'spring') { voice(280, 1200, 0, 0.26, 0.07, 'square', true); }   // boing UP
                else if (type === 'flag') { seq([1319, 1175, 1047, 880, 784, 659, 523, 440], 36, 0.10, 0.08, 'square'); } // pole slide DOWN
                else if (type === 'stageclear') { seq([523, 659, 784, 1047, 1319, 1568], 95, 0.16, 0.08, 'square'); }     // clear fanfare UP
                else if (type === '1up') { seq([659, 784, 1319, 1047, 1175, 1568], 60, 0.12, 0.08, 'square'); }           // 1-UP jingle
                else if (type === 'win') { seq([523, 659, 784, 1047, 1319, 1047, 1568], 120, 0.18, 0.08, 'square'); }
                else if (type === 'fanfare') {                                                      // BIG victory — princess rescued
                    seq([523, 659, 784, 1047, 1319, 1568], 95, 0.18, 0.09, 'square');
                    seq([1047, 1319, 1568, 2093], 80, 0.22, 0.085, 'square');   // (overlap → layered)
                    voice(1568, 1568, 1.1, 0.5, 0.08, 'square'); voice(2093, 2093, 1.1, 0.5, 0.06, 'square');
                }
                else if (type === 'warp') { voice(740, 130, 0, 0.36, 0.08, 'square', true); }      // descend into pipe
                else if (type === 'bosshit') { noise(200, 0, 0.20, 0.1); }
                else if (type === 'bossdie') { voice(240, 60, 0, 0.5, 0.1, 'sawtooth', true); seq([392, 523, 659, 784], 70, 0.16, 0.08, 'square'); }
                else if (type === 'bump') { voice(196, 130, 0, 0.09, 0.06, 'square', true); }       // block knock
                // ---- Extra gameplay SFX ----
                else if (type === 'skid') { voice(560, 200, 0, 0.12, 0.05, 'sawtooth', true); }     // brake screech
                else if (type === 'land') { noise(150, 0, 0.06, 0.05); }                            // soft touchdown thud
                else if (type === 'pipe') { voice(420, 120, 0, 0.28, 0.07, 'square', true); }
                else if (type === 'duck') { voice(300, 220, 0, 0.05, 0.04, 'square', true); }
                else if (type === 'bosswarn') { voice(160, 130, 0, 0.10, 0.07, 'sawtooth', true); voice(160, 130, 0.12, 0.10, 0.07, 'sawtooth', true); }
                else if (type === 'kick') { voice(380, 760, 0, 0.10, 0.06, 'square', true); }       // kick shell
                else if (type === 'itemget') { seq([784, 988, 1319], 45, 0.10, 0.07, 'square'); }
            }

            // ============================================================
            // IN-GAME 8-BIT BACKGROUND MUSIC (item: "sfx lebih banyak" → ada musik
            // latar di dalam game). This is the GAME's own procedural chiptune —
            // entirely separate from the tenant's invitation song (which plays only
            // on the invitation page via the host). A tiny lookahead scheduler lays
            // down a looping lead + bass using the same WebAudio context as the SFX.
            // Driven from the game loop so it only advances while actually playing,
            // and it never plays on overlays / the invitation (gated by bgmEnabled).
            // ============================================================
            var bgmEnabled = false;     // turned on when gameplay is live
            var bgmNext = 0;            // AudioContext time of the next note to schedule
            var bgmStep = 0;            // index into the pattern
            // A cheerful 16-step loop (lead semitones over a base, 0 = rest) + a
            // simple root-fifth bass. Tempo ~ 150bpm sixteenths.
            var BGM_LEAD = [ 0, 4, 7, 12, 7, 4, 0, 4,  5, 9, 12, 9, 5, 0, 7, 0 ];
            var BGM_BASS = [ 0, 0, 7, 7, 0, 0, 5, 5,  0, 0, 7, 7, 0, 0, 9, 7 ];
            var BGM_REST = [ 1, 0, 1, 1, 1, 0, 1, 0,  1, 0, 1, 1, 1, 0, 1, 0 ]; // 1 = play lead
            var BGM_ROOT = 261.63;      // C4 reference
            function midiToHz(semi) { return BGM_ROOT * Math.pow(2, semi / 12); }
            function bgmVoice(c, freq, t, dur, vol, wave) {
                var o = c.createOscillator(), g = c.createGain();
                o.type = wave; o.frequency.setValueAtTime(freq, t);
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
                o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
            }
            // Schedule any notes that fall within the lookahead window. Called every
            // frame from loop(); cheap (schedules at most a couple of steps ahead).
            function stepBgm() {
                if (!bgmEnabled || muted) return;
                var c = audioCtx(); if (!c) return;
                if (c.state === 'suspended') c.resume();
                var STEP = 0.10;                    // seconds per 16th note (~150bpm)
                var AHEAD = 0.18;                   // schedule this far in advance
                if (bgmNext < c.currentTime) bgmNext = c.currentTime + 0.05;
                while (bgmNext < c.currentTime + AHEAD) {
                    var i = bgmStep % 16;
                    if (BGM_REST[i]) bgmVoice(c, midiToHz(BGM_LEAD[i] + 12), bgmNext, STEP * 0.9, 0.035, 'square'); // lead (octave up)
                    bgmVoice(c, midiToHz(BGM_BASS[i] - 12), bgmNext, STEP * 1.4, 0.045, 'triangle');               // bass (octave down)
                    bgmStep++;
                    bgmNext += STEP;
                }
            }
            function startBgm() {
                if (bgmEnabled) return;
                bgmEnabled = true; bgmStep = 0; bgmNext = 0;
            }
            function stopBgm() { bgmEnabled = false; }

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
                    player.throwT = 10;   // hold the shoot pose ~10 frames (drawPlayer reads this)
                    playSfx('fireball');
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
                        // GROUNDED SETTLE (judder root fix): when moving DOWN slowly
                        // and a solid sits right under the feet (the very next row),
                        // snap the feet flush to that surface and mark grounded. Without
                        // this, a standing Mario re-applies GRAV every frame and drifts
                        // ~0.55px because the block-collision row above uses (y+h-1),
                        // which stays in the EMPTY row and never snaps → player.y and
                        // onGround oscillate forever → 1px sprite buzz. Settling here
                        // pins y to a whole surface so the body is truly at rest.
                        if (!p.onGround && p.vy <= GRAV * 1.5) {
                            var rFoot = Math.floor((p.y + p.h) / TILE);
                            for (var cf = c0; cf <= c1; cf++) {
                                if (solidAt(cf, rFoot)) { p.y = rFoot * TILE - p.h; p.vy = 0; p.onGround = true; break; }
                            }
                        }
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
                    // Animate the discovered item flying from the block up into its
                    // matching inventory slot (item 2). The icon's "just-unlocked"
                    // pulse is deferred until the token lands so the two read as one
                    // motion (pop happens in flyItemToInventory's onArrive).
                    flyItemToInventory(b.info, b.c, b.r);
                    // Notify only — DO NOT auto-open. The quick-access icon lights up.
                    toast('INFO TERBUKA: ' + b.info.label + '<br><span style="font-size:8px;color:#fac000">Ketuk ikon ▶ untuk membaca</span>', 1900);
                } else if (b.kind === 'mushroom') {
                    spawnPowerup(b, player.big ? 'flower' : 'mushroom');
                    playSfx('sprout');
                } else if (b.kind === 'star') {
                    spawnPowerup(b, 'star'); playSfx('sprout');
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

            // Fly a discovered info-item from the "?" block up to its inventory slot
            // (item 2). A DOM token (the same pixel icon) is animated from the block's
            // on-screen position to the icon's position, then the icon pops. Pure
            // cosmetic, DOM-based so it can travel from the canvas to the HUD rail.
            function flyItemToInventory(info, blockC, blockR) {
                try {
                    var btn = invButtons[info.key];
                    var stageRect = stage.getBoundingClientRect();
                    if (!stageRect.width) return;
                    // virtual→CSS scale (canvas fills the stage width at VW virtual px)
                    var scale = stageRect.width / VW;
                    // block centre in virtual coords → screen (viewport) coords.
                    // Y is world-space shifted up by camY (same transform render uses).
                    var vx = (blockC * TILE + TILE / 2) - camX;
                    var vy = (blockR * TILE) - camY;
                    var startX = stageRect.left + vx * scale;
                    var startY = stageRect.top + vy * scale;
                    // destination = inventory icon centre (fallback: top-right area)
                    var endX, endY;
                    if (btn) { var br = btn.getBoundingClientRect(); endX = br.left + br.width / 2; endY = br.top + br.height / 2; }
                    else { endX = stageRect.right - 30; endY = stageRect.top + 60; }

                    // build the flying token (a mini canvas with the info's pixel icon)
                    var tok = document.createElement('canvas');
                    tok.width = 16; tok.height = 16;
                    pixIcon(tok, info.key);
                    tok.className = 'rm-fly-token';
                    tok.style.left = Math.round(startX - 14) + 'px';
                    tok.style.top = Math.round(startY - 14) + 'px';
                    document.body.appendChild(tok);
                    // force a reflow so the transition takes effect, then move it
                    // along a slight arc (scale up at launch, shrink into the slot).
                    /* eslint-disable no-unused-expressions */
                    tok.getBoundingClientRect();
                    tok.style.transform = 'translate(' + Math.round(endX - startX) + 'px,' + Math.round(endY - startY) + 'px) scale(0.7)';
                    tok.style.opacity = '0.85';
                    var cleaned = false;
                    function done() {
                        if (cleaned) return; cleaned = true;
                        if (tok.parentNode) tok.parentNode.removeChild(tok);
                        // land → pop the inventory icon + a little sparkle
                        if (btn) {
                            btn.classList.add('just-unlocked');
                            setTimeout(function () { btn.classList.remove('just-unlocked'); }, 520);
                        }
                        playSfx('itemget');
                    }
                    tok.addEventListener('transitionend', done);
                    setTimeout(done, 900);   // fallback if transitionend doesn't fire
                } catch (e) {}
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

                // During the boss-ending cutscene Mario walks himself (player.auto).
                // We synthesise gentle directional input so the normal physics still
                // apply (gravity, collision) — he simply isn't controlled by the guest.
                var inLeft = keys.left, inRight = keys.right;
                if (player.auto === 'right') { inLeft = false; inRight = true; }
                else if (player.auto === 'stop') { inLeft = false; inRight = false; }

                var max = (inLeft || inRight) && Math.abs(player.vx) > MAXVX - 0.2 ? RUN_MAX : MAXVX;
                // auto-walk at a calm stroll, not a sprint
                if (player.auto) max = Math.min(max, 1.6);
                if (inLeft) { player.vx -= MOVE; player.face = -1; }
                if (inRight) { player.vx += MOVE; player.face = 1; }
                if (!inLeft && !inRight) player.vx *= FRICTION;
                player.vx = clamp(player.vx, -max, max);
                if (Math.abs(player.vx) < 0.05) player.vx = 0;

                // Jump (with variable height via hold). Buffered + coyote-timed so
                // a press slightly before landing OR just after leaving a ledge
                // still fires — makes simultaneous move+jump reliable.
                coyote = player.onGround ? COYOTE : Math.max(0, coyote - 1);
                if (player.auto) jumpQueued = 0;     // ignore jumps during the cutscene
                if (jumpQueued > 0 && (player.onGround || coyote > 0)) {
                    player.vy = JUMP_V; player.onGround = false; player.jumping = true; player.jumpHold = JUMP_HOLD_FRAMES;
                    jumpQueued = 0; coyote = 0;
                    playSfx(player.big ? 'bigjump' : 'jump');
                } else if (jumpQueued > 0) {
                    jumpQueued--;   // keep the buffer ticking until it fires or expires
                }
                // Variable height only while the jump key is still held.
                if (player.jumping && keys.jump && player.jumpHold > 0) { player.vy -= JUMP_HOLD; player.jumpHold--; }
                else player.jumping = false;

                player.vy += GRAV * gravMul; player.vy = Math.min(player.vy, MAX_FALL);
                var wasOnGround = player.onGround;          // for the landing SFX
                var fallVy = player.vy;                     // speed just before landing
                player.onGround = false;

                player.x += player.vx; collideAxis(player, 'x');
                player.y += player.vy; collideAxis(player, 'y');

                // LANDING thud: only when we actually touch down from a real fall
                // (not micro-settling on a slope/step), and not during the cutscene.
                if (!wasOnGround && player.onGround && fallVy > 2.4 && !player.auto) playSfx('land');

                // SKID screech: a one-shot when the guest first reverses against the
                // current run (turn-around). Latched so it fires once per skid, not
                // every frame. (Matches the skid pose drawn in drawPlayer.)
                var skidNow = player.onGround && Math.abs(player.vx) > 1.1 &&
                              ((inLeft && player.vx > 0) || (inRight && player.vx < 0));
                if (skidNow && !player.skidLatch && !player.auto) { playSfx('skid'); player.skidLatch = true; }
                if (!skidNow) player.skidLatch = false;

                // CROUCH blip: a tiny one-shot when the guest starts ducking.
                var crouchNow = player.onGround && keys.down && !player.auto && Math.abs(player.vx) < 1.2;
                if (crouchNow && !player.crouchLatch) { playSfx('duck'); player.crouchLatch = true; }
                if (!crouchNow) player.crouchLatch = false;

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
                        player.vy = JUMP_V * 1.5; player.onGround = false; sp.t = 8; playSfx('spring');
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
                if (player.throwT > 0) player.throwT--;    // fire shoot-pose hold
                if (player.morphT > 0) player.morphT--;    // grow/shrink transform flicker
                if (player.star > 0) { player.star--; if (player.star === 0) toast('Bintang habis'); }

                if (W.isBoss) {
                    stepBossEnding();
                } else if (!W.flagReached && player.x + player.w >= W.flagX) {
                    reachFlag();
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
                        if (coinGot % 100 === 0) { lives++; toast('1-UP!'); playSfx('1up'); }
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
                        else if (pu.kind === 'flower') { var wasFire = player.fire; setBig(true); player.fire = true; if (!wasFire) player.morphT = 34; addScore(1000); toast('FIRE POWER!'); }
                        else if (pu.kind === 'star') { player.star = 600; addScore(1000); toast('★ INVINCIBLE ★'); }
                        playSfx('powerup');
                    }
                }
                W.powerups = W.powerups.filter(function (p) { return p.alive; });
            }

            // Grow/shrink. Flag a short TRANSFORM FLICKER (morphT) so drawPlayer can
            // strobe the sprite the way SMB does the moment Mario changes size/costume
            // (mushroom → super, damage → small, flower → fire). Skip the flicker if
            // the size didn't actually change (e.g. flower while already big).
            function setBig(b) {
                if (player.big !== b) player.morphT = 34;
                player.big = b; player.h = b ? 22 : 14;
            }

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
                // keep the boss in front of the arena gate so the player can't slip
                // past it (and reach the prison/flag) before it is defeated.
                var gate = W.bossX || W.flagX;
                var arenaL = gate - 9 * TILE, arenaR = gate - TILE;
                if (b.x < arenaL) { b.x = arenaL; b.vx = Math.abs(b.vx); }
                if (b.x + b.w > arenaR) { b.x = arenaR - b.w; b.vx = -Math.abs(b.vx); }

                // occasional telegraphed jump (predictable, fair). Higher difficulty
                // jumps more often (lvl shortens the cooldown floor).
                b.jumpCd--;
                // Telegraph the jump audibly a few frames before it fires (fair —
                // bible Appendix E: boss attacks must be readable/telegraphed).
                if (b.jumpCd === 10 && b.vy === 0) playSfx('bosswarn');
                if (b.jumpCd <= 0 && b.vy === 0) { b.vy = JUMP_V * 0.9; b.jumpCd = (80 - (b.lvl || 0) * 14) - b.phase * 14; }

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
                    // faster each phase, on top of the difficulty-scaled base speed
                    b.vx = (b.vx > 0 ? 1 : -1) * ((b.baseSpd || 1.1) + b.phase * 0.5);
                    toast('BOSS PHASE ' + b.phase + '!', 1100);
                }
                if (b.hp <= 0) {
                    b.alive = false;
                    spawnParticles(b.x + b.w / 2, b.y + b.h / 2, '#fac000', 20);
                    addScore(3000);
                    playSfx('bossdie');
                    toast('BOSS KALAH! +3000<br><span style="font-size:8px;color:#ff7ab6">Selamatkan sang putri di ujung! ▶</span>', 2200);
                }
            }

            function rectHit(a, b) {
                return a.x + a.w > b.x + 1 && a.x < b.x + b.w - 1 &&
                    a.y + a.h > b.y + 1 && a.y < b.y + b.h - 1;
            }
            function stompEnemy(e) {
                e.alive = false; e.squash = 16; player.vy = JUMP_V * 0.55; addScore(100);
                playSfx(e.kind === 'koopa' ? 'kick' : 'stomp'); spawnParticles(e.x + 7, e.y, '#fff', 4);
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
            // Stages 1-7: touching the flag pole clears the world (boss stage 8 has
            // its own scripted ending — see stepBossEnding/bossFinale).
            function reachFlag() {
                W.flagReached = true; player.win = true; player.vx = 0;
                addScore(2000 + time * 10);
                bestScore = Math.max(bestScore, score);
                bestStage = Math.max(bestStage, stageNum);
                persist();
                playSfx('win');
                playSfx('flag');
                setTimeout(function () { playSfx('stageclear'); }, 400);
                setTimeout(showStageClear, 1100);
            }

            // ============================================================
            // BOSS-STAGE ENDING (item: ending lebih dramatis)
            // ------------------------------------------------------------
            // A multi-beat cutscene replacing the old instant rescue+dialog:
            //   1) GATE     — Mario must defeat the boss before he can pass bossX.
            //   2) APPROACH — (player-controlled) he walks on to the prison; a
            //                 "rescue the princess" prompt guides him.
            //   3) FREE     — at the cage the bars swing open; the princess is freed.
            //   4) TOGETHER — Mario + princess auto-walk side by side to the pole.
            //   5) FLAG     — flag descends → big "WAH" (flash + fireworks + fanfare).
            //   6) DIALOG   — after a ~4.5s celebration beat, the congrats opens.
            // `W.ending` holds {phase, t}. Driven once per frame from stepPlayer.
            // ============================================================
            function stepBossEnding() {
                if (player.win) return;
                var b = W.boss;
                if (!W.ending) W.ending = { phase: 'gate', t: 0 };
                var E = W.ending;

                // 1) GATE: hold Mario behind the arena while the boss still lives.
                if (E.phase === 'gate') {
                    if (b && b.alive) {
                        if (player.x + player.w >= W.bossX) { player.x = W.bossX - player.w - 2; player.vx = 0; }
                        return;
                    }
                    // boss defeated → open the approach to the prison
                    E.phase = 'approach';
                }

                // 2) APPROACH: guest walks Mario on toward the cell. Reaching it
                //    (or a tile short, so he stops just outside) starts the rescue.
                if (E.phase === 'approach') {
                    if (player.x + player.w >= W.prisonX - TILE) {
                        player.x = W.prisonX - TILE - player.w; player.vx = 0;
                        E.phase = 'free'; E.t = 0;
                        freePrincess();
                    }
                    return;
                }

                // 3) FREE: a short beat at the cage — bars open, she steps out.
                if (E.phase === 'free') {
                    player.auto = 'stop';
                    E.t++;
                    if (E.t > 90) { E.phase = 'together'; E.t = 0; toast('Jalan bareng ke bendera... ♥', 1600); }
                    return;
                }

                // 4) TOGETHER: Mario auto-walks to the pole; the princess follows
                //    just behind (drawPrincess trails him while pr.escort is set).
                if (E.phase === 'together') {
                    player.auto = 'right';
                    if (W.princess) W.princess.escort = true;
                    if (player.x + player.w >= W.flagX) {
                        player.x = W.flagX - player.w; player.vx = 0; player.auto = 'stop';
                        E.phase = 'flag'; E.t = 0;
                        bossFinale();
                    }
                    return;
                }
            }

            // Open the cell and free the princess (bars swing, then she steps out).
            function freePrincess() {
                playSfx('powerup');
                triggerFlash(20, '#ffe6f0');
                toast('♥ SANG PUTRI BEBAS! ♥', 1800);
                if (W.princess) {
                    W.princess.rescued = true;
                    setTimeout(function () { if (W.princess) W.princess.freed = true; }, 500);
                }
            }

            // 5+6) The pole is reached together → the big "WAH" celebration, then
            //      (after a generous ~4.5s beat) the happy-ending dialog opens.
            function bossFinale() {
                W.flagReached = true; player.win = true; player.vx = 0;
                completed = true;
                addScore(2000 + time * 10);
                bestScore = Math.max(bestScore, score);
                bestStage = Math.max(bestStage, stageNum);
                // Unlock every invitation piece so the guest is never locked out.
                INFOS.forEach(function (info) {
                    if (!unlocked[info.key]) { unlocked[info.key] = true; var btn = invButtons[info.key]; if (btn) btn.classList.add('is-enabled'); }
                });
                updateViewBtn();
                persist();
                playSfx('win');

                // BIG "WAH": gold flash + shock ring + an erupting fireworks barrage
                // + the victory fanfare. The dialog is deliberately delayed so the
                // celebratory moment can breathe before the congrats appears.
                triggerFlash(46, '#fff3b0');
                startFireworks();
                fwActive = 320;     // longer barrage for the finale
                for (var bxr = 0; bxr < 6; bxr++) {
                    spawnFirework(camX + 26 + bxr * (VW - 52) / 5, camY + 28 + (bxr % 2) * 26);
                }
                playSfx('fanfare');
                toast('♥ HAPPILY EVER AFTER ♥', 2400);
                // staggered secondary pops so the screen keeps celebrating
                setTimeout(function () { triggerFlash(28, '#ffd84a'); for (var i = 0; i < 4; i++) spawnFirework(camX + 40 + i * (VW - 80) / 3, camY + 36); }, 900);
                setTimeout(function () { triggerFlash(24, '#ffe6f0'); for (var i = 0; i < 4; i++) spawnFirework(camX + 30 + i * (VW - 60) / 3, camY + 30); }, 2000);
                // open the congrats dialog only after the ~4.5s celebration beat
                setTimeout(showWin, 4500);
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
                        // ? block (item: adjust grafik) — a beveled gold cube with an
                        // animated shimmer sweep, rounded-looking corner notches, four
                        // rivets and a crisp white-outlined "?" glyph so it reads as a
                        // classic Mario question block.
                        var qp = (Math.floor(animT / 14) % 4);        // 4-frame shimmer
                        var qBase = qp === 0 ? '#e8a200' : (qp === 1 ? '#f4b400' : (qp === 2 ? '#ffc21a' : '#ffce3a'));
                        ctx.fillStyle = qBase; ctx.fillRect(sx, sy, TILE, TILE);
                        // darkened clipped corners → a beveled cube look (not a hard box)
                        ctx.fillStyle = '#7a4d00';
                        ctx.fillRect(sx, sy, 2, 2); ctx.fillRect(sx + TILE - 2, sy, 2, 2);
                        ctx.fillRect(sx, sy + TILE - 2, 2, 2); ctx.fillRect(sx + TILE - 2, sy + TILE - 2, 2, 2);
                        // bevel: bright top/left, dark bottom/right
                        ctx.fillStyle = '#ffe48a'; ctx.fillRect(sx + 2, sy + 1, TILE - 4, 1.5); ctx.fillRect(sx + 1, sy + 2, 1.5, TILE - 4);
                        ctx.fillStyle = '#b87a00'; ctx.fillRect(sx + 2, sy + TILE - 2.5, TILE - 4, 1.5); ctx.fillRect(sx + TILE - 2.5, sy + 2, 1.5, TILE - 4);
                        // moving shimmer streak across the face
                        var qsh = (animT % 40) / 40 * TILE;
                        ctx.fillStyle = 'rgba(255,255,255,0.35)';
                        ctx.fillRect(sx + qsh - 2, sy + 2, 2, TILE - 4);
                        // rivets in the four corners
                        ctx.fillStyle = '#5a3a00';
                        ctx.fillRect(sx + 3, sy + 3, 1, 1); ctx.fillRect(sx + TILE - 4, sy + 3, 1, 1);
                        ctx.fillRect(sx + 3, sy + TILE - 4, 1, 1); ctx.fillRect(sx + TILE - 4, sy + TILE - 4, 1, 1);
                        // "?" glyph — white outline behind a black mark for punch
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(sx + 5, sy + 4, 6, 2.5); ctx.fillRect(sx + 8.5, sy + 5, 2.5, 3);
                        ctx.fillRect(sx + 6.5, sy + 7.5, 3, 2.5); ctx.fillRect(sx + 6.5, sy + 11, 3, 2.5);
                        ctx.fillStyle = '#000';
                        ctx.fillRect(sx + 6, sy + 4.5, 4, 1.5); ctx.fillRect(sx + 9, sy + 5.5, 1.5, 2);
                        ctx.fillRect(sx + 7, sy + 8, 2, 1.5); ctx.fillRect(sx + 7, sy + 11.5, 2, 1.5);
                        break;
                    case 'X':
                        ctx.fillStyle = '#9a6a33'; ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = '#6b4520'; ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
                        break;
                    case 'T': case 'U': case '[': case ']':
                        // Pipe body: a green tube with a left shadow, a bright vertical
                        // specular stripe, a darker right shade and faint seam lines so
                        // it reads as a glossy metal/plastic pipe (object detail).
                        ctx.fillStyle = '#43b047'; ctx.fillRect(sx, sy, TILE, TILE);
                        ctx.fillStyle = '#2f8a33'; ctx.fillRect(sx, sy, 3, TILE);            // left shade
                        ctx.fillStyle = '#1f6a24'; ctx.fillRect(sx, sy, 1, TILE);            // hard left edge
                        ctx.fillStyle = '#7bd47e'; ctx.fillRect(sx + 4, sy, 2, TILE);        // specular highlight
                        ctx.fillStyle = '#a8e6aa'; ctx.fillRect(sx + 4, sy, 1, TILE);        // hot sheen line
                        ctx.fillStyle = '#2f8a33'; ctx.fillRect(sx + TILE - 3, sy, 3, TILE); // right shade
                        ctx.fillStyle = '#7bd47e'; ctx.fillRect(sx + TILE - 4, sy, 1, TILE); // right rim light
                        if (ch === 'T' || ch === 'U') {
                            // pipe LIP: a wider capped rim with its own gloss + underside
                            ctx.fillStyle = '#43b047'; ctx.fillRect(sx - 1, sy, TILE + 2, 5);
                            ctx.fillStyle = '#7bd47e'; ctx.fillRect(sx - 1, sy, TILE + 2, 1);     // rim top sheen
                            ctx.fillStyle = '#a8e6aa'; ctx.fillRect(sx + 3, sy + 1, 3, 1);        // rim glint
                            ctx.fillStyle = '#1f6a24'; ctx.fillRect(sx - 1, sy + 4, TILE + 2, 1); // rim underside shadow
                            ctx.fillStyle = '#2f8a33'; ctx.fillRect(sx - 1, sy, 2, 5);            // rim left shade
                        }
                        break;
                }
            }

            // ------------------------------------------------------------
            // SPRITE RENDERING — crisp, high-resolution, NO blur.
            // ------------------------------------------------------------
            // WHY THE OLD WAY BLURRED: drawing sprites directly with fillRect on a
            // 0.5-virtual-px sub-grid, then scaling the whole context by a *fractional*
            // device factor, anti-aliased every rect edge (fillRect ignores
            // imageSmoothingEnabled). Hundreds of fractional-edge rects = mud.
            //
            // THE FIX: each sprite/pose is drawn ONCE into an offscreen canvas at its
            // own native pixel grid (every fillRect is a WHOLE pixel — no fractions,
            // no internal AA), cached, then blitted with drawImage(). drawImage DOES
            // honour imageSmoothingEnabled=false, so the high-res art is sampled
            // nearest-neighbour onto the screen → sharp pixels even through the
            // fractional device transform. Detail can be far higher (native grids are
            // ~2× the old sub-grid → ~4-10× the pixel count) without any blur.
            // Hitboxes/physics are untouched (only the visual blit size changes).
            //
            // `px(x,y,w,h)` paints WHOLE-pixel rects into the current offscreen ctx
            // `octx` at native sprite resolution. `pc(col)` sets the colour.
            // ------------------------------------------------------------
            var SPR_SS = 3;                 // sprite supersample: native px per virtual px
                                            // (3× gives a fine native grid for smooth
                                            // shapes; buffers stay small since the on-
                                            // screen blit size is what bounds memory)
            var spriteCache = {};           // key → { cv, vw, vh } cached offscreen sprites
            var octx = null;                // current offscreen 2d ctx while painting
            function px(x, y, w, h) { octx.fillRect(x, y, (w || 1), (h || 1)); }
            function pc(col) { octx.fillStyle = col; }
            // Get (or build) a cached sprite. `vw,vh` = on-screen virtual size; the
            // offscreen buffer is (vw*SS)×(vh*SS) native px. `paint(W,H)` draws the
            // art in native px (W=vw*SS, H=vh*SS). Returns the buffer record.
            function getSprite(key, vw, vh, paint) {
                var rec = spriteCache[key];
                if (rec) return rec;
                var W2 = Math.round(vw * SPR_SS), H2 = Math.round(vh * SPR_SS);
                var cv = document.createElement('canvas'); cv.width = W2; cv.height = H2;
                var prev = octx; octx = cv.getContext('2d');
                octx.imageSmoothingEnabled = false;
                paint(W2, H2);
                octx = prev;
                rec = { cv: cv, vw: vw, vh: vh };
                spriteCache[key] = rec;
                return rec;
            }
            // Blit a cached sprite centred over a hitbox-anchored origin. (ax,ay) is
            // the on-screen virtual top-left where the sprite's box should sit; the
            // dest size is the sprite's virtual size. `flip` mirrors horizontally.
            function blit(rec, ax, ay, flip) {
                var dw = rec.vw, dh = rec.vh;
                var dx = Math.round(ax), dy = Math.round(ay);
                ctx.imageSmoothingEnabled = false;
                if (flip) {
                    ctx.save(); ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
                    ctx.drawImage(rec.cv, 0, 0, dw, dh); ctx.restore();
                } else {
                    ctx.drawImage(rec.cv, dx, dy, dw, dh);
                }
            }

            // Legacy sub-grid helpers kept for enemies/boss (still fillRect-based;
            // they read fine at their size). _ox/_oy = origin, sp = half-px rect.
            var _ox = 0, _oy = 0;
            function sp(x, y, w, h) { ctx.fillRect(_ox + x * 0.5, _oy + y * 0.5, w * 0.5, h * 0.5); }
            function spc(col) { ctx.fillStyle = col; }

            function drawCoin(sx, sy, t) {
                // ROUND spinning coin (item: koin jangan kotak). Drawn with ellipses
                // so the silhouette is circular, not a box. The horizontal radius
                // pulses (12→edge-on) to fake the classic 3D spin; the disc is a
                // gold ellipse with a darker rim ring, a top sheen, an embossed inner
                // ring and a travelling specular highlight.
                var phase = Math.abs(Math.sin(t));
                var rx = 1.6 + phase * 5.4;       // horizontal radius 1.6..7 (edge-on→full)
                var ry = 7;                        // vertical radius (constant — round)
                var cx = sx + 7, cy = sy + 7;      // centre of the ~14px cell
                // dark rim ring
                ctx.fillStyle = '#9a5e00';
                ctx.beginPath(); ctx.ellipse(cx, cy, rx + 0.8, ry, 0, 0, Math.PI * 2); ctx.fill();
                // bright gold face
                ctx.fillStyle = '#fde36a';
                ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.6, rx), ry - 1, 0, 0, Math.PI * 2); ctx.fill();
                if (rx > 2.4) {
                    // embossed inner ring (only when the face is wide enough to read)
                    ctx.fillStyle = '#e0a400';
                    ctx.beginPath(); ctx.ellipse(cx, cy, rx - 1.2, ry - 2.4, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffe88a';
                    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.5, rx - 2.4), ry - 3.6, 0, 0, Math.PI * 2); ctx.fill();
                    // centre value-bar
                    ctx.fillStyle = '#caa000'; ctx.fillRect(cx - 0.8, cy - 3.2, 1.6, 6.4);
                    // travelling specular glint sliding down the face
                    ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    var gly = cy - 4 + ((Math.floor(t * 3)) % 8);
                    ctx.fillRect(cx - rx * 0.4, gly, 1.4, 1.6);
                }
                // top sheen + bottom shade arcs for roundness
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.beginPath(); ctx.ellipse(cx, cy - ry * 0.55, Math.max(0.5, rx * 0.7), 1.1, 0, 0, Math.PI * 2); ctx.fill();
            }

            // Visual sprite footprint (virtual px). The hitbox is 11 wide; the
            // sprite box is wider so the art has margin, but Mario himself is drawn
            // SLIM and centred inside it so he never looks blocky/fat.
            var P_VW = 18;

            // ============================================================
            // PRE-BAKED SPRITE-SHEET (zero-judder, high-detail).
            // ------------------------------------------------------------
            // Instead of repainting Mario every frame with shifting offsets (which
            // caused the vertical shimmer/judder), we paint a HIGH-DETAIL Mario into
            // a set of FROZEN frames ONCE at boot, on a large native grid. Animation
            // then ONLY swaps which baked frame is shown — Mario's body sits at the
            // exact same pixels every frame, so there is no per-frame motion of the
            // torso/head/arms at all. Only the legs differ between frames, and they
            // are authored INSIDE the frame (not by moving the whole sprite). This
            // makes "no judder" structural, not something to tune.
            //
            // The sheet is keyed by (size, capCol, shirt, overall) so star-flash /
            // fire-flower recolours each get their own baked set (built lazily,
            // bounded: ~handful of colour combos over a whole run).
            // ============================================================
            // Richer SMB-style animation set (research: SMB1/SMB3 pose library):
            //   idle           — standing (a subtle blink is layered on top live)
            //   idle2          — idle "breath" (chest/arms settle 1px) → alt idle frame
            //   walk0..walk3   — a full 4-frame WALK cycle (was 3)
            //   run0..run3     — a 4-frame RUN cycle: bigger stride + pumping arms,
            //                    shown only at high speed (arms swing, leaning body)
            //   jump           — ascending (arms up, legs tucked)
            //   fall           — descending (arms out, legs splayed)
            //   skid           — braking / turn-around
            //   crouch         — ducking (whole body lowers)
            //   throw          — fire-flower shoot pose (lead arm thrust forward)
            //   climb0/climb1  — ladder/flag-pole grab (2-frame shimmy) [flag slide]
            var MARIO_FRAMES = ['idle', 'idle2', 'walk0', 'walk1', 'walk2', 'walk3',
                                'run0', 'run1', 'run2', 'run3',
                                'jump', 'fall', 'skid', 'crouch', 'throw', 'climb0', 'climb1'];
            var marioSheets = {};   // key → { idle:rec, walk0:rec, ... } baked frames

            // Paint ONE Mario frame at native resolution into the current octx.
            // `frame` selects the leg/arm configuration; the head/torso are IDENTICAL
            // across frames so nothing above the hips ever moves. Higher detail than
            // before: rounded cap, shaded face, defined overalls, gloves, big boots.
            function paintMarioFrame(W, H, c, frame) {
                var capCol = c.cap, capDk = shade(capCol, -0.28), capHi = shade(capCol, 0.34);
                var shirt = c.shirt, shirtHi = shade(shirt, 0.24), shirtDk = shade(shirt, -0.24);
                var ov = c.overall, ovHi = shade(ov, 0.26), ovDk = shade(ov, -0.26);
                var skin = '#ffce9e', skinHi = '#ffe6c8', skinDk = '#e3a06f';
                var hair = '#3a1d0c', boot = '#5a3010', bootHi = '#7a4418', bootDk = '#2a1404';
                var glove = '#ffffff', gloveDk = '#cdd4e4';
                var cx = Math.round(W / 2);

                // Pose classification (drives arms + legs only; head/torso are baked
                // identically so the body never judders between walk frames — item 1
                // adds skid/crouch/fall/turn poses on top of idle/walk/jump).
                var isJumpUp = frame === 'jump' || frame === 'jumpUp'; // ascending
                var isFall   = frame === 'fall';                       // descending
                var isSkid   = frame === 'skid';                       // braking / turn-around
                var isCrouch = frame === 'crouch';                     // ducking
                var isThrow  = frame === 'throw';                      // fire shoot pose
                var isIdle2  = frame === 'idle2';                      // idle breath (alt)
                var isRun    = frame.indexOf('run') === 0;             // fast run cycle
                var isClimb  = frame.indexOf('climb') === 0;           // ladder/pole grab
                var airborne = isJumpUp || isFall;

                // CROUCH is the one pose that lowers the WHOLE body (a real duck),
                // so it gets its own compact paint and returns early. Everything else
                // shares the upright head/torso below.
                if (isCrouch) { paintMarioCrouch(W, H, { cap: capCol, capDk: capDk, capHi: capHi, shirt: shirt, shirtHi: shirtHi, shirtDk: shirtDk, ov: ov, ovHi: ovHi, ovDk: ovDk, skin: skin, skinHi: skinHi, skinDk: skinDk, hair: hair, boot: boot, bootHi: bootHi, bootDk: bootDk, glove: glove, gloveDk: gloveDk }, cx); return; }

                // ---------------- HEAD (identical every frame) ----------------
                var headTop = 4, headW = 24, hx = cx - headW / 2;
                // hair back behind the cap brim
                pc(hair); px(hx, headTop + 9, headW, 4);
                // CAP — domed, with side curve via insets
                pc(capCol);
                px(cx - 10, headTop, 20, 4);              // dome top
                px(cx - 12, headTop + 2, 24, 3);          // dome mid (wider)
                px(hx, headTop + 4, headW, 4);            // band
                px(hx + 1, headTop + 8, headW - 2, 3);    // brim ledge
                pc(capHi); px(cx - 8, headTop, 12, 1); px(cx - 11, headTop + 2, 5, 1);   // sun sheen
                pc(capDk); px(hx, headTop + 7, headW, 1); px(hx + 1, headTop + 10, headW - 2, 1); // under-shade
                // emblem disc + M
                pc('#fff'); px(cx - 4, headTop + 1, 8, 6);
                pc(capCol); px(cx - 3, headTop + 2, 6, 4);
                pc('#fff'); px(cx - 2, headTop + 2, 1, 3); px(cx, headTop + 3, 1, 2); px(cx + 1, headTop + 2, 1, 3);
                // FACE
                var faceTop = headTop + 11, faceH = 12;
                pc(skin); px(hx + 2, faceTop, headW - 4, faceH);
                pc(skinHi); px(hx + 3, faceTop, 5, 2);                 // forehead light
                pc(skinDk); px(hx + 2, faceTop + faceH - 2, headW - 4, 2); // jaw shade
                // sideburns both sides
                pc(hair); px(hx, faceTop, 3, faceH - 1); px(hx + headW - 3, faceTop, 3, faceH - 1);
                // big nose, centred + rounded
                pc(skin); px(cx - 3, faceTop + 4, 6, 5); pc(skinHi); px(cx - 2, faceTop + 4, 2, 1); pc(skinDk); px(cx - 3, faceTop + 8, 6, 1);
                // EYES — two, symmetric (whites + blue pupils + brows)
                var eyeY = faceTop + 2, eL = cx - 7, eR = cx + 3;
                pc('#fff'); px(eL, eyeY, 4, 5); px(eR, eyeY, 4, 5);
                pc('#2a4ba0'); px(eL + 2, eyeY + 1, 2, 3); px(eR, eyeY + 1, 2, 3);
                pc('#000'); px(eL + 2, eyeY + 2, 1, 1); px(eR + 1, eyeY + 2, 1, 1);
                pc(hair); px(eL - 1, eyeY - 2, 5, 1); px(eR, eyeY - 2, 5, 1);
                // mustache — symmetric, under the nose
                pc(hair); px(cx - 9, faceTop + 9, 19, 3); px(cx - 10, faceTop + 10, 2, 2); px(cx + 9, faceTop + 10, 2, 2);

                // ---------------- TORSO (identical every frame) ----------------
                var shoulder = faceTop + faceH;
                var hipY = H - 18;                         // where legs begin (constant)
                var bx = cx - 12, bw = 24;                 // torso box
                // shirt across shoulders
                pc(shirt); px(bx, shoulder, bw, 6);
                pc(shirtHi); px(bx + 1, shoulder, 10, 2);
                pc(shirtDk); px(bx, shoulder + 5, bw, 1);
                // overall bib + body
                pc(ov); px(bx + 3, shoulder + 5, bw - 6, hipY - (shoulder + 5));
                pc(ovHi); px(bx + 3, shoulder + 5, bw - 6, 1); px(bx + 3, shoulder + 5, 1, hipY - (shoulder + 5));
                pc(ovDk); px(bx + bw - 4, shoulder + 7, 1, hipY - (shoulder + 7));
                // straps over the shoulders
                pc(ov); px(bx + 2, shoulder + 2, 3, hipY - (shoulder + 2)); px(bx + bw - 5, shoulder + 2, 3, hipY - (shoulder + 2));
                pc(ovHi); px(bx + 2, shoulder + 2, 1, 6); px(bx + bw - 5, shoulder + 2, 1, 6);
                // gold buttons (symmetric)
                pc('#f7c800'); px(bx + 5, shoulder + 8, 3, 3); px(bx + bw - 8, shoulder + 8, 3, 3);
                pc('#fff7c0'); px(bx + 5, shoulder + 8, 1, 1); px(bx + bw - 8, shoulder + 8, 1, 1);

                // ---------------- ARMS + GLOVES ----------------
                // Pose-dependent arm placement (the silhouette ABOVE the hips is the
                // same box; only the limbs move, which is allowed — they're authored
                // inside the frame, not by shifting the whole sprite). The sprite is
                // mirrored by facing, so the +x side is always Mario's FRONT.
                if (isThrow) {
                    // FIRE THROW (SMB fire pose): FRONT arm thrust straight forward at
                    // shoulder height (the hand that lobbed the fireball), back arm
                    // tucked/braced. Reads as an active "shoot" the instant a fireball
                    // leaves. Head stays put (no judder); only the limbs change.
                    pc(shirt); px(bx + bw - 2, shoulder + 1, 8, 5);        // front upper arm out
                    pc(glove); px(bx + bw + 6, shoulder, 8, 6);            // front gloved fist forward
                    pc(gloveDk); px(bx + bw + 6, shoulder + 4, 8, 2);
                    pc(shirt); px(bx - 4, shoulder + 4, 6, 7);             // back arm braced low
                    pc(glove); px(bx - 6, shoulder + 10, 8, 6);
                    pc(gloveDk); px(bx - 6, shoulder + 14, 8, 2);
                } else if (isJumpUp) {
                    // both arms thrown UP (classic ascending jump)
                    pc(shirt); px(bx - 4, shoulder - 3, 6, 9); px(bx + bw - 2, shoulder - 3, 6, 9);
                    pc(glove); px(bx - 6, shoulder - 9, 8, 7); px(bx + bw - 2, shoulder - 9, 8, 7);
                    pc(gloveDk); px(bx - 6, shoulder - 3, 8, 2); px(bx + bw - 2, shoulder - 3, 8, 2);
                } else if (isFall) {
                    // arms out to the sides (windmilling) on the way DOWN
                    pc(shirt); px(bx - 6, shoulder + 1, 7, 6); px(bx + bw - 1, shoulder + 1, 7, 6);
                    pc(glove); px(bx - 10, shoulder - 1, 8, 7); px(bx + bw + 2, shoulder - 1, 8, 7);
                    pc(gloveDk); px(bx - 10, shoulder + 4, 8, 2); px(bx + bw + 2, shoulder + 4, 8, 2);
                } else if (isClimb) {
                    // CLIMB / pole-grab: both arms reach UP the pole, hands stacked;
                    // climb1 swaps which hand is higher for a 2-frame shimmy.
                    var hi = frame === 'climb1';
                    pc(shirt); px(bx - 2, shoulder - 4, 6, 10); px(bx + bw - 4, shoulder - 4, 6, 10);
                    pc(glove); px(bx - 3, shoulder - (hi ? 12 : 8), 7, 6); px(bx + bw - 4, shoulder - (hi ? 8 : 12), 7, 6);
                    pc(gloveDk); px(bx - 3, shoulder - (hi ? 7 : 3), 7, 2); px(bx + bw - 4, shoulder - (hi ? 3 : 7), 7, 2);
                } else if (isSkid) {
                    // SKID / turn-around: lead arm flung BACK (away from facing), trail
                    // arm braced low — reads as "digging the heels in" when changing
                    // direction.
                    pc(shirt); px(bx - 5, shoulder - 1, 7, 7); px(bx + bw - 1, shoulder + 4, 6, 7);
                    pc(glove); px(bx - 9, shoulder - 5, 8, 7); px(bx + bw - 1, shoulder + 10, 8, 6);
                    pc(gloveDk); px(bx - 9, shoulder, 8, 2); px(bx + bw - 1, shoulder + 14, 8, 2);
                } else if (isRun) {
                    // RUN: arms PUMP in counter-swing with the legs. run0/run2 swing the
                    // front arm forward+up (elbow bent), run1/run3 swing it back+down.
                    // Bigger amplitude than a walk → reads as a sprint (SMB3 dash).
                    var fwd = (frame === 'run0' || frame === 'run2');
                    if (fwd) {
                        pc(shirt); px(bx + bw - 2, shoulder - 1, 6, 6);   // front arm up/fwd
                        pc(glove); px(bx + bw + 2, shoulder - 4, 8, 6);
                        pc(gloveDk); px(bx + bw + 2, shoulder, 8, 2);
                        pc(shirt); px(bx - 4, shoulder + 5, 6, 7);        // back arm down/behind
                        pc(glove); px(bx - 8, shoulder + 11, 8, 6);
                        pc(gloveDk); px(bx - 8, shoulder + 15, 8, 2);
                    } else {
                        pc(shirt); px(bx - 2, shoulder - 1, 6, 6);        // (mirror) back-swing
                        pc(glove); px(bx - 6, shoulder - 4, 8, 6);
                        pc(gloveDk); px(bx - 6, shoulder, 8, 2);
                        pc(shirt); px(bx + bw - 2, shoulder + 5, 6, 7);
                        pc(glove); px(bx + bw, shoulder + 11, 8, 6);
                        pc(gloveDk); px(bx + bw, shoulder + 15, 8, 2);
                    }
                } else {
                    // WALK / IDLE: arms rest at the sides. idle2 raises them 1px for a
                    // subtle "breath" so a standing Mario isn't a dead statue.
                    var dy = isIdle2 ? -1 : 0;
                    pc(shirt); px(bx - 4, shoulder + 3 + dy, 6, 8); px(bx + bw - 2, shoulder + 3 + dy, 6, 8);
                    pc(glove); px(bx - 6, shoulder + 10 + dy, 8, 7); px(bx + bw - 2, shoulder + 10 + dy, 8, 7);
                    pc(gloveDk); px(bx - 6, shoulder + 15 + dy, 8, 2); px(bx + bw - 2, shoulder + 15 + dy, 8, 2);
                }

                // ---------------- LEGS / BOOTS (the ONLY per-frame difference) ----
                // Feet bottom is ALWAYS at H-1 — legs never change the silhouette's
                // vertical extent. Frames differ only by horizontal stride + a tiny
                // boot-sole angle, so walking reads without any vertical bounce.
                var legTopY = hipY;
                var legW = 10, legH = H - legTopY;
                // stride offsets per frame (native px, horizontal only)
                var lDx = 0, rDx = 0, lToe = 0, rToe = 0;
                // WALK: a 4-frame cycle (contact → passing → contact → passing) — the
                // extra walk3 doubles the smoothness vs the old 3-frame loop.
                if (frame === 'walk0') { lDx = -4; rDx = 1; lToe = 3; }
                else if (frame === 'walk1') { lDx = -2; rDx = 2; }
                else if (frame === 'walk2') { lDx = -1; rDx = 4; rToe = 3; }
                else if (frame === 'walk3') { lDx = -3; rDx = 3; lToe = 1; rToe = 1; }
                // RUN: exaggerated stride (feet reach further, one toe kicked out) so a
                // sprint reads distinctly faster/looser than a walk (SMB3 dash feel).
                else if (frame === 'run0') { lDx = -6; rDx = 2; lToe = 5; }
                else if (frame === 'run1') { lDx = -3; rDx = 3; }
                else if (frame === 'run2') { lDx = -1; rDx = 6; rToe = 5; }
                else if (frame === 'run3') { lDx = -4; rDx = 4; lToe = 2; rToe = 2; }
                else if (isThrow)  { lDx = -3; rDx = 2; rToe = 2; } // braced throwing stance
                else if (isClimb)  { lDx = -1; rDx = 1; }           // legs together on the pole
                else if (isJumpUp) { lDx = -3; rDx = 3; }            // tucked-apart in air (rising)
                else if (isFall)   { lDx = -5; rDx = 5; rToe = 3; }  // legs splayed wide (falling)
                else if (isSkid)   { lDx = -6; rDx = 2; lToe = 5; }  // front foot braced forward (braking)
                // left leg
                pc(ov); px(cx - 11 + lDx, legTopY, legW, 4);                 // upper (overall) leg
                pc(boot); px(cx - 11 + lDx, legTopY + 4, legW, legH - 4);    // boot
                pc(bootHi); px(cx - 11 + lDx, legTopY + 4, legW, 1);
                pc(bootDk); px(cx - 13 + lDx - lToe, H - 4, legW + 3 + lToe, 4); // sole/toe (points fwd on stride)
                // right leg
                pc(ov); px(cx + 1 + rDx, legTopY, legW, 4);
                pc(boot); px(cx + 1 + rDx, legTopY + 4, legW, legH - 4);
                pc(bootHi); px(cx + 1 + rDx, legTopY + 4, legW, 1);
                pc(bootDk); px(cx + rDx, H - 4, legW + 3 + rToe, 4);
            }

            // CROUCH pose (item 1): a real duck — the head/cap drop low and the body
            // compresses toward the boots so Mario reads as ducking. Painted into the
            // SAME box (feet still at H-1) but everything is squashed into the lower
            // portion; bowed legs tuck under. Cosmetic only (no crouch physics).
            function paintMarioCrouch(W, H, c, cx) {
                var crouchTop = Math.round(H * 0.34);   // push the whole figure down
                // ---- low cap + head ----
                var headTop = crouchTop, headW = 24, hx = cx - headW / 2;
                pc(c.hair); px(hx, headTop + 9, headW, 4);
                pc(c.cap);
                px(cx - 10, headTop, 20, 4); px(cx - 12, headTop + 2, 24, 3);
                px(hx, headTop + 4, headW, 4); px(hx + 1, headTop + 8, headW - 2, 3);
                pc(c.capHi); px(cx - 8, headTop, 12, 1);
                pc(c.capDk); px(hx, headTop + 7, headW, 1);
                pc('#fff'); px(cx - 4, headTop + 1, 8, 6); pc(c.cap); px(cx - 3, headTop + 2, 6, 4);
                pc('#fff'); px(cx - 2, headTop + 2, 1, 3); px(cx, headTop + 3, 1, 2); px(cx + 1, headTop + 2, 1, 3);
                // face (shorter)
                var faceTop = headTop + 11, faceH = 9;
                pc(c.skin); px(hx + 2, faceTop, headW - 4, faceH);
                pc(c.skinDk); px(hx + 2, faceTop + faceH - 2, headW - 4, 2);
                pc(c.hair); px(hx, faceTop, 3, faceH - 1); px(hx + headW - 3, faceTop, 3, faceH - 1);
                pc(c.skin); px(cx - 3, faceTop + 3, 6, 4);
                var eyeY = faceTop + 2;
                pc('#fff'); px(cx - 7, eyeY, 4, 4); px(cx + 3, eyeY, 4, 4);
                pc('#2a4ba0'); px(cx - 5, eyeY + 1, 2, 2); px(cx + 3, eyeY + 1, 2, 2);
                pc(c.hair); px(cx - 9, faceTop + 7, 19, 2);          // squashed mustache
                // ---- compressed torso/overalls hugging the knees ----
                var shoulder = faceTop + faceH;
                var hipY = H - 8;
                var bx = cx - 12, bw = 24;
                pc(c.shirt); px(bx, shoulder, bw, 5);
                pc(c.shirtDk); px(bx, shoulder + 4, bw, 1);
                pc(c.ov); px(bx + 2, shoulder + 4, bw - 4, hipY - (shoulder + 4));
                pc(c.ovHi); px(bx + 2, shoulder + 4, bw - 4, 1);
                pc('#f7c800'); px(bx + 5, shoulder + 6, 3, 3); px(bx + bw - 8, shoulder + 6, 3, 3);
                // arms tucked low against the knees
                pc(c.shirt); px(bx - 3, shoulder + 2, 6, 6); px(bx + bw - 3, shoulder + 2, 6, 6);
                pc(c.glove); px(bx - 5, shoulder + 7, 7, 5); px(bx + bw - 2, shoulder + 7, 7, 5);
                pc(c.gloveDk); px(bx - 5, shoulder + 11, 7, 1); px(bx + bw - 2, shoulder + 11, 7, 1);
                // ---- stubby bent legs / wide boots ----
                pc(c.boot); px(cx - 12, hipY, 11, H - hipY); px(cx + 1, hipY, 11, H - hipY);
                pc(c.bootHi); px(cx - 12, hipY, 11, 1); px(cx + 1, hipY, 11, 1);
                pc(c.bootDk); px(cx - 14, H - 4, 13, 4); px(cx + 1, H - 4, 13, 4);
            }

            // Build (or fetch) the frozen frame-set for a colour combo. Each frame is
            // its own cached offscreen rec keyed in spriteCache, so blit() reuses the
            // crisp drawImage path. Big Mario uses a taller box (more torso), small a
            // shorter one — the head is the same either way.
            function getMarioSheet(big, capCol, shirt, overall) {
                var key = 'M|' + (big ? 'B' : 's') + '|' + capCol + '|' + shirt + '|' + overall;
                var sheet = marioSheets[key];
                if (sheet) return sheet;
                sheet = {};
                var vh = (big ? 26 : 18);               // on-screen virtual height of the sprite
                for (var i = 0; i < MARIO_FRAMES.length; i++) {
                    (function (frame) {
                        sheet[frame] = getSprite(key + '|' + frame, P_VW, vh, function (Wn, Hn) {
                            paintMarioFrame(Wn, Hn, { cap: capCol, shirt: shirt, overall: overall }, frame);
                        });
                    })(MARIO_FRAMES[i]);
                }
                marioSheets[key] = sheet;
                return sheet;
            }

            function drawPlayer() {
                if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) return;
                // TRANSFORM FLICKER: the moment Mario grows/shrinks/gets fire, strobe
                // the sprite for a few frames (SMB power-up blink). Faster strobe than
                // the invuln blink so the two read differently.
                if (player.morphT > 0 && Math.floor(player.morphT / 2) % 2 === 0) return;
                var face = player.face;
                var star = player.star > 0;
                var moving = Math.abs(player.vx) > 0.3 && player.onGround;
                var airborne = !player.onGround;
                var big = player.h > 14;
                // Live intent (so skid/crouch read off the guest's actual input, not
                // just velocity). During the auto-walk cutscene there is no crouch and
                // facing follows player.auto.
                var inL = keys.left && !player.auto, inR = keys.right && !player.auto;
                var inDown = keys.down && !player.auto;
                // SKID / turn-around ("lari ke belakang"): on the ground, still
                // carrying speed one way while the guest pushes the OTHER way — Mario
                // brakes and faces his new heading. CROUCH: holding down while grounded.
                var skidding = player.onGround && Math.abs(player.vx) > 1.1 &&
                               ((inL && player.vx > 0) || (inR && player.vx < 0));
                var crouching = player.onGround && inDown && Math.abs(player.vx) < 1.2;

                // Pick a FROZEN frame name (animation = frame swap only, no geometry
                // change). Richer selection (research: SMB pose set):
                //   • THROW wins briefly after shooting a fireball (throwT), in air OR
                //     on the ground — the classic fire-Mario shoot pose.
                //   • RUN vs WALK: past a speed threshold Mario breaks into a 4-frame
                //     RUN cycle (bigger stride + pumping arms) at a FASTER cadence;
                //     below it, the calmer 4-frame WALK. Both cadences scale a touch
                //     with speed so the feet don't slide.
                //   • IDLE alternates idle/idle2 for a subtle breath, with an
                //     occasional blink (handled after, by overpainting eyelids).
                var spd = Math.abs(player.vx);
                var running = spd > MAXVX + 0.2;                 // above walk-max ⇒ sprinting
                var throwing = player.throwT > 0 && !crouching;  // shoot pose (fire only)
                var frameName;
                if (throwing) frameName = 'throw';
                else if (airborne) frameName = (player.vy > 1.2 ? 'fall' : 'jump');
                else if (crouching) frameName = 'crouch';
                else if (skidding) frameName = 'skid';
                else if (moving) {
                    if (running) {
                        // fast cadence (every ~4 frames) through the 4-frame run cycle
                        var rc = Math.floor(animT / 4) % 4;
                        frameName = 'run' + rc;
                    } else {
                        // walk cadence scales gently with speed (slower step when slow)
                        var wStep = spd > 1.8 ? 6 : 8;
                        var wc = Math.floor(animT / wStep) % 4;
                        frameName = 'walk' + wc;
                    }
                }
                else frameName = (Math.floor(animT / 42) % 2 ? 'idle2' : 'idle'); // breath

                // on-screen anchor: feet locked to the ground tile so the body never
                // jitters vertically. The baked frame's feet sit at its own bottom
                // edge, so we anchor by the sprite-box bottom = feet line.
                var vh = (big ? 26 : 18);                      // matches getMarioSheet
                var P_VH = vh;

                // Y anchor: while standing on solid ground, PIN the feet to the tile
                // surface underfoot (constant every frame → zero shimmer). Airborne
                // uses the live y for a smooth arc. (Physics/hitboxes untouched.)
                //
                // JUDDER — REAL ROOT CAUSE (why the two earlier fixes failed):
                // A standing Mario NEVER settles to a fixed y. Every frame stepPlayer
                // does: vy += GRAV (→0.55), onGround = false, y += 0.55, then the
                // collider. But the collider tests the feet row as floor((y+h-1)/TILE)
                // — with the +0.55 that row is still the EMPTY row above the ground,
                // so it does NOT snap and does NOT set onGround. So at render time
                // Mario permanently floats ~0.55px, `onGround` flickers false, and
                // `player.y` alternates 594.0 / 594.55. BOTH prior anchors were tied
                // to that oscillating state (vy-window, then player.onGround), so sy
                // rounded to 590/591 on alternating frames — a 1px buzz every frame.
                //
                // FIX: don't trust vy / onGround / the live y at all. Probe for solid
                // ground within ~2px BELOW the feet (covers the 0.55px float + a step)
                // by scanning tile rows from the feet downward. If found, lock the
                // sprite bottom to that tile's SURFACE (a whole, unchanging number).
                // Only when there is genuinely no ground within reach (a real jump/
                // fall) do we fall back to the live feet line for the airborne arc.
                var feetCol = Math.floor((player.x + player.w / 2) / TILE);
                var feetBottom = player.y + player.h;          // live feet line
                var groundedNear = false, groundTopY = 0;
                if (player.vy >= -0.01) {                       // not moving UP (jump)
                    // nearest solid tile top at/just under the feet (≤ ~2px gap)
                    var probeRow = Math.floor((feetBottom - 0.5) / TILE);
                    for (var pr = probeRow; pr <= probeRow + 2; pr++) {
                        if (solidAt(feetCol, pr)) {
                            var surf = pr * TILE;
                            if (surf >= feetBottom - 2 && surf <= feetBottom + 2.5) {
                                groundTopY = surf; groundedNear = true;
                            }
                            break;
                        }
                    }
                }
                var feetWorldY = groundedNear ? groundTopY : feetBottom;
                // sprite box top so its BOTTOM aligns with the feet line
                var sx = Math.round(player.x - camX - (P_VW - player.w) / 2);
                var sy = Math.round(feetWorldY - P_VH);

                // colours for this frame (recolour → its own baked sheet)
                var capCol = star ? (Math.floor(player.star / 4) % 2 ? '#fac000' : '#fff') : '#e52521';
                var shirt = player.fire ? '#ffffff' : capCol;
                var overall = player.fire ? '#e52521' : '#2452c8';

                var sheet = getMarioSheet(big, capCol, shirt, overall);
                var rec = sheet[frameName] || sheet.idle;

                // contact shadow + running dust — keyed to the same locked feet line.
                var footScreenY = sy + P_VH;
                if (skidding) {
                    // a puff of skid dust kicks up BEHIND the heels (opposite to the
                    // new facing) — reads the brake/turn clearly.
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    var skX = Math.round(player.x - camX) + (face > 0 ? -3 : player.w);
                    ctx.fillRect(skX, footScreenY - 4, 4, 3);
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.fillRect(skX + (face > 0 ? -3 : 3), footScreenY - 6, 3, 2);
                } else if (moving && Math.floor(animT / 7) % 2 === 0) {
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    var dustX = Math.round(player.x - camX) + (face > 0 ? -2 : player.w - 1);
                    ctx.fillRect(dustX, footScreenY - 3, 3, 2);
                }
                if (!airborne) {
                    ctx.fillStyle = 'rgba(0,0,0,0.22)';
                    ctx.beginPath(); ctx.ellipse(Math.round(player.x - camX) + player.w / 2, footScreenY - 1, player.w * 0.62, 2.2, 0, 0, Math.PI * 2); ctx.fill();
                }
                blit(rec, sx, sy, face < 0);
            }

            function drawEnemy(e) {
                var sx = Math.round(e.x - camX), sy = Math.round(e.y);
                if (!e.alive) {
                    if (e.squash > 0) { ctx.fillStyle = '#7a4a1f'; ctx.fillRect(sx, sy + e.h - 3, e.w, 3); ctx.fillStyle = '#9a5a2a'; ctx.fillRect(sx, sy + e.h - 4, e.w, 1); }
                    return;
                }
                // soft contact shadow grounds walkers (skip piranha — it's mid-pipe)
                if (e.kind !== 'piranha') {
                    ctx.fillStyle = 'rgba(0,0,0,0.20)';
                    ctx.beginPath(); ctx.ellipse(sx + e.w / 2, sy + e.h - 1, e.w * 0.55, 2.1, 0, 0, Math.PI * 2); ctx.fill();
                }
                _ox = sx; _oy = sy;
                var W2 = e.w * 2, H2 = e.h * 2, walk = Math.floor(e.t) % 2;

                if (e.kind === 'goomba') {
                    // rounder mushroom head with rim shading, brows, fangs, shuffling feet
                    spc('#6f3d18'); sp(1, 1, W2 - 2, H2 - 5);            // dark rim
                    spc('#8a4f24'); sp(2, 2, W2 - 4, H2 - 7);            // head dome
                    spc('#9a5a2a'); sp(0, 6, W2, H2 - 10);              // head mid band
                    spc('#ad6a32'); sp(2, 3, W2 - 6, 2);                // top sheen
                    var blink = Math.floor(animT / 40) % 8 === 0;       // occasional blink
                    spc('#f3d6a8'); sp(4, 13, W2 - 8, 6);               // pale muzzle
                    spc('#e8c089'); sp(4, 17, W2 - 8, 2);              // muzzle shade
                    spc('#000');    sp(5, 7, 5, 2); sp(W2 - 10, 7, 5, 2); // angry brows (slanted via offset)
                    spc('#fff');    sp(5, 9, 4, 4); sp(W2 - 9, 9, 4, 4); // eye whites
                    spc('#000');    sp(6, 10, 2, blink ? 1 : 3); sp(W2 - 8, 10, 2, blink ? 1 : 3); // pupils
                    if (!blink) { spc('#fff'); sp(6, 10, 1, 1); sp(W2 - 8, 10, 1, 1); } // eye glints (alive look)
                    spc('#fff');    sp(6, 15, 2, 2); sp(W2 - 8, 15, 2, 2); // little fangs
                    spc('#4a2a10'); sp(walk ? 0 : 3, H2 - 4, 8, 4); sp(W2 - (walk ? 8 : 11), H2 - 4, 8, 4); // feet
                    spc('#5a3216'); sp(walk ? 0 : 3, H2 - 4, 8, 1); sp(W2 - (walk ? 8 : 11), H2 - 4, 8, 1); // feet top edge
                } else if (e.kind === 'koopa') {
                    // upright koopa: head pokes forward, domed turtle shell + scutes, feet shuffle
                    spc('#ffce9e'); sp(W2 - 9, 0, 8, 9);               // head
                    spc('#e8a877'); sp(W2 - 9, 7, 8, 2);              // jaw shade
                    spc('#fff');    sp(W2 - 6, 2, 3, 3); spc('#000'); sp(W2 - 5, 3, 2, 2); // eye
                    spc('#fff');    sp(W2 - 5, 3, 1, 1);             // eye glint
                    spc('#f7b000'); sp(W2 - 10, 4, 3, 3);             // beak
                    spc('#d99000'); sp(W2 - 10, 6, 3, 1);
                    spc('#175a1c'); sp(1, 5, W2 - 3, H2 - 10);        // shell dark rim
                    spc('#2f8a33'); sp(2, 6, W2 - 5, H2 - 12);        // shell back
                    spc('#43b047'); sp(3, 7, W2 - 7, H2 - 14);        // shell mid
                    spc('#7bd47e'); sp(5, 8, W2 - 11, 3);             // shell top highlight
                    spc('#175a1c');                                    // scute seams (hexagon hint)
                    sp(W2 / 2 - 1, 7, 1, H2 - 14); sp(4, H2 / 2, W2 - 8, 1);
                    spc('#fff7d0'); sp(2, 6, W2 - 5, 1);              // rim lip
                    spc('#ffce9e'); sp(walk ? 1 : 3, H2 - 5, 5, 5); sp(W2 - (walk ? 6 : 8), H2 - 5, 5, 5); // feet
                    spc('#e8a877'); sp(walk ? 1 : 3, H2 - 2, 5, 2); sp(W2 - (walk ? 6 : 8), H2 - 2, 5, 2); // foot shade
                } else if (e.kind === 'spiny') {
                    // red domed shell with bone-white spikes, beady eyes, little feet
                    spc('#a8560c'); sp(0, 7, W2, H2 - 7);              // shell base/shade
                    spc('#e8861f'); sp(1, 6, W2 - 2, H2 - 8);          // shell body
                    spc('#ffae45'); sp(2, 7, W2 - 4, 4);               // shell highlight
                    spc('#ffd089'); sp(3, 8, W2 - 8, 1);              // sheen line
                    spc('#7a3c06'); sp(2, 11, 2, 2); sp(W2 - 4, 11, 2, 2); sp(W2 / 2 - 1, 12, 2, 2); // shell spots
                    // spikes (bone-white triangles with a grey base)
                    spc('#cfcfe0');
                    for (var s2 = 0; s2 < 5; s2++) {
                        var bx2 = _ox + (1 + s2 * 3.6) * 0.5, by2 = _oy + 7 * 0.5;
                        ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx2 + 1.8, by2 - 5); ctx.lineTo(bx2 + 3.6, by2); ctx.closePath(); ctx.fill();
                    }
                    spc('#fff'); sp(4, 13, 4, 3); sp(W2 - 8, 13, 4, 3); // eye whites
                    spc('#000'); sp(6, 14, 2, 2); sp(W2 - 7, 14, 2, 2); // pupils
                    spc('#000'); sp(4, 12, 4, 1); sp(W2 - 8, 12, 4, 1); // angry brow
                    spc('#c86a14'); sp(2, H2 - 3, 4, 3); sp(W2 - 6, H2 - 3, 4, 3); // feet
                } else if (e.kind === 'piranha') {
                    var chomp = Math.floor(animT / 16) % 2; // mouth open/close
                    // green stem with leaves
                    spc('#1f7a2a'); sp(W2 / 2 - 3, H2 - 9, 6, 9);      // stem
                    spc('#2a9a38'); sp(W2 / 2 - 3, H2 - 9, 2, 9);      // stem highlight
                    spc('#43b047'); sp(W2 / 2 - 7, H2 - 6, 4, 2); sp(W2 / 2 + 3, H2 - 5, 4, 2); // leaves
                    // red bulb head with spots
                    spc('#b81b18'); sp(1, 1, W2 - 2, H2 - 9);          // head dark
                    spc('#e52521'); sp(2, 1, W2 - 4, H2 - 10);         // head
                    spc('#ff6a55'); sp(2, 2, W2 - 6, 3);              // top sheen
                    spc('#fff'); sp(3, 1, 3, 3); sp(W2 - 6, 4, 3, 3); sp(5, 7, 2, 2); // white spots
                    // gaping mouth with lips + teeth (gap widens on chomp)
                    var mY = H2 - 11 + (chomp ? 2 : 0);
                    spc('#7a0e0c'); sp(2, mY, W2 - 4, 3 + (chomp ? 2 : 0)); // mouth interior
                    spc('#fff'); sp(2, mY - 1, W2 - 4, 2);            // upper teeth
                    spc('#fff'); sp(2, mY + 2 + (chomp ? 2 : 0), W2 - 4, 2); // lower teeth
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
                // snout + fanged mouth (chomps with the walk cycle)
                spc(flash ? '#fff' : '#caa24a'); sp(W2 - 8, 8, 8, 7);
                spc('#000'); sp(W2 - 6, 9, 2, 2); sp(W2 - 6, 12, 2, 2); // nostrils
                var chomp = Math.floor(b.t / 14) % 2;
                spc('#5a0a08'); sp(W2 - 9, 14 + (chomp ? 1 : 0), 9, 3);  // mouth
                spc('#fff'); sp(W2 - 9, 14 + (chomp ? 1 : 0), 9, 1);     // teeth
                // eye (angry) + heavy brow
                spc('#fff'); sp(W2 - 16, 4, 6, 5);
                spc('#000'); sp(W2 - 13, 5, 3, 3);
                spc('#fff'); sp(W2 - 13, 5, 1, 1);                       // eye glint
                spc(flash ? '#fff' : '#7a4e12'); sp(W2 - 18, 2, 9, 2);  // brow ridge
                // horns (curved up, with dark base)
                spc(flash ? '#fff' : '#9a9a9a'); sp(W2 - 22, -4, 3, 4); sp(W2 - 10, -4, 3, 4); // horn bases
                spc('#fdfdff');
                sp(W2 - 22, -6, 3, 7); sp(W2 - 23, -8, 4, 3);
                sp(W2 - 10, -6, 3, 7); sp(W2 - 9, -8, 4, 3);
                // clawed feet
                spc(flash ? '#fff' : '#2a6a2a'); sp(2, H2 - 6, 9, 6); sp(W2 - 11, H2 - 6, 9, 6);
                spc('#fdfdff'); sp(3, H2 - 2, 1, 2); sp(6, H2 - 2, 1, 2); sp(9, H2 - 2, 1, 2);   // toe claws L
                sp(W2 - 10, H2 - 2, 1, 2); sp(W2 - 7, H2 - 2, 1, 2); sp(W2 - 4, H2 - 2, 1, 2);    // toe claws R
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

                drawBackdrop(); // far parallax layer: mountains/atmosphere (world space)
                drawScenery();  // mid hills anchored to the ground (world space)
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
                    // a soft pulsing glow halo behind every power-up so it reads as a
                    // precious, collectable item (object detail). Colour-matched.
                    var glowA = 0.18 + Math.abs(Math.sin(pu.t * 0.18)) * 0.18;
                    var glowC = pu.kind === 'mushroom' ? '255,90,60' : (pu.kind === 'flower' ? '255,180,40' : '255,240,120');
                    ctx.fillStyle = 'rgba(' + glowC + ',' + glowA.toFixed(2) + ')';
                    ctx.beginPath(); ctx.arc(px + pu.w / 2, py + pu.h / 2, pu.w * 0.85, 0, Math.PI * 2); ctx.fill();
                    if (pu.kind === 'mushroom') {
                        // domed red cap with white spots, shaded stem + eyes
                        ctx.fillStyle = '#c81818'; ctx.fillRect(px + 1, py, pu.w - 2, 7);              // cap base
                        ctx.fillStyle = '#e52521'; ctx.fillRect(px + 1, py + 1, pu.w - 2, 5);          // cap mid
                        ctx.fillStyle = '#ff6a55'; ctx.fillRect(px + 2, py + 1, 4, 1);                 // cap sheen
                        ctx.fillStyle = '#fff'; ctx.fillRect(px + 2, py + 2, 3, 3); ctx.fillRect(px + 8, py + 3, 3, 3); ctx.fillRect(px + 6, py + 1, 2, 2); // spots
                        ctx.fillStyle = '#ffd9a0'; ctx.fillRect(px + 2, py + 7, pu.w - 4, 6);          // stem
                        ctx.fillStyle = '#e0b079'; ctx.fillRect(px + pu.w - 4, py + 7, 2, 6);          // stem shade
                        ctx.fillStyle = '#000'; ctx.fillRect(px + 4, py + 9, 1, 2); ctx.fillRect(px + 8, py + 9, 1, 2); // eyes
                    } else if (pu.kind === 'flower') {
                        // fire-flower: 4 petals + glowing centre + green stem/leaf
                        var fp = Math.floor(pu.t / 6) % 2;
                        ctx.fillStyle = '#43b047'; ctx.fillRect(px + 6, py + 6, 2, 7);                 // stem
                        ctx.fillStyle = '#2f8a33'; ctx.fillRect(px + 3, py + 9, 4, 2);                 // leaf
                        ctx.fillStyle = fp ? '#ff8a1e' : '#ffd84a'; ctx.fillRect(px + 4, py, 6, 2); ctx.fillRect(px + 2, py + 2, 10, 4); ctx.fillRect(px + 4, py + 6, 6, 1); // petals
                        ctx.fillStyle = '#fff'; ctx.fillRect(px + 6, py + 3, 2, 2);                    // hot centre
                        ctx.fillStyle = '#e52521'; ctx.fillRect(px + 6, py + 3, 1, 1);
                    } else {
                        // STAR: a 5-point sprite (drawn via rays) that flashes + 2 eyes
                        var bl = Math.floor(pu.t / 4) % 2;
                        var col = bl ? '#ffe24a' : '#fff7a8';
                        ctx.fillStyle = col;
                        ctx.fillRect(px + 5, py, 3, 13);             // vertical
                        ctx.fillRect(px, py + 5, 13, 3);             // horizontal
                        ctx.fillRect(px + 2, py + 2, 9, 9);          // body
                        ctx.fillStyle = bl ? '#ffb800' : '#ffd84a'; // point shading
                        ctx.fillRect(px + 3, py + 10, 3, 3); ctx.fillRect(px + 7, py + 10, 3, 3); // legs
                        ctx.fillStyle = '#000'; ctx.fillRect(px + 4, py + 5, 1, 2); ctx.fillRect(px + 8, py + 5, 1, 2); // eyes
                    }
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

                // Boss stage shows BOTH the cave-prison (mid-runway) and a flag pole
                // at the very end (the couple walk to it together); other stages just
                // have the flag pole.
                if (W.isBoss) drawPrison();
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

                // FULL-SCREEN CELEBRATION FLASH (screen space, over everything).
                // A bright wash that fades out + an expanding shock ring → the "wah"
                // moment when the princess is saved / all info collected.
                if (flash.t > 0) {
                    var fr = flash.t / flash.max;             // 1 → 0
                    ctx.fillStyle = flash.col;
                    ctx.globalAlpha = Math.min(0.85, fr * 0.9);
                    ctx.fillRect(0, 0, VW, VH);
                    // expanding white ring from centre
                    ctx.globalAlpha = Math.min(0.6, fr);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    var rad = (1 - fr) * (VW * 0.7);
                    ctx.beginPath(); ctx.arc(VW / 2, VH / 2, rad, 0, Math.PI * 2); ctx.stroke();
                    ctx.globalAlpha = 1; ctx.lineWidth = 1;
                    flash.t--;
                }
            }

            // Paint a detailed princess (Peach) into the offscreen ctx at native res.
            // Native grid is W wide; crown occupies the top rows, gown flares to the
            // bottom. Whole-pixel rects only → crisp when blitted.
            var PR_VW = 16, PR_VH = 22;   // visual sprite size (crown + flared gown)
            function paintPrincess(W, H, o) {
                var cx = W / 2;
                var hairC = '#f4cf5a', hairHi = '#ffe79a', hairDk = '#caa030';
                // WHITE wedding gown (item 6): pure-white dress with soft cool-grey
                // shadow + a bright sheen, so the trapezoid still reads as 3D fabric
                // without looking flat. Crown stays gold (drawn below).
                var skin = '#ffd9b8', skinDk = '#e8b48f', gown = '#ffffff', gownHi = '#ffffff', gownDk = '#d4d8e6';
                var headTop = 8;           // native y where the head starts (room for crown)
                // crown
                pc('#ffd84a'); px(cx - 8, headTop - 5, 16, 4);
                px(cx - 8, headTop - 9, 4, 4); px(cx - 2, headTop - 11, 4, 5); px(cx + 4, headTop - 9, 4, 4);
                pc('#fff3b0'); px(cx - 8, headTop - 5, 16, 1);
                pc('#ff5a55'); px(cx - 1, headTop - 8, 3, 3);                 // ruby
                pc('#5ab4ff'); px(cx - 7, headTop - 4, 2, 2); px(cx + 5, headTop - 4, 2, 2); // sapphires
                // hair (behind + sides)
                pc(hairDk); px(cx - 11, headTop, 4, 22); px(cx + 7, headTop, 4, 22);
                pc(hairC); px(cx - 9, headTop - 1, 18, 9); px(cx - 11, headTop + 2, 3, 18); px(cx + 8, headTop + 2, 3, 18);
                pc(hairHi); px(cx - 7, headTop, 7, 2);
                // face
                pc(skin); px(cx - 7, headTop + 6, 14, 9);
                pc(skinDk); px(cx - 7, headTop + 13, 14, 2);
                pc('#3a6ad6'); px(cx - 4, headTop + 9, 2, 3); px(cx + 3, headTop + 9, 2, 3); // eyes
                pc('#fff'); px(cx - 4, headTop + 9, 1, 1); px(cx + 3, headTop + 9, 1, 1);
                pc('#ff9ec4'); px(cx - 6, headTop + 11, 2, 2); px(cx + 5, headTop + 11, 2, 2); // blush
                pc('#e0508f'); px(cx - 2, headTop + 13, 5, 1);               // lips
                // gown (flared trapezoid) with side shading + jewel collar + hem
                var gTop = headTop + 16, gBot = H - 2;
                pc(gown);
                for (var yy = gTop; yy < gBot; yy++) {
                    var t = (yy - gTop) / (gBot - gTop);
                    var halfw = 5 + t * 11;     // flares from 10px to 32px wide
                    px(cx - halfw, yy, halfw * 2, 1);
                }
                // soft cool sheen down the left fold, deeper grey shadow down the right
                pc('#eef1fb'); for (var y2 = gTop; y2 < gBot; y2++) { var t2 = (y2 - gTop) / (gBot - gTop); px(cx - (5 + t2 * 11), y2, 3, 1); }
                pc(gownDk); for (var y3 = gTop; y3 < gBot; y3++) { var t3 = (y3 - gTop) / (gBot - gTop); px(cx + (5 + t3 * 11) - 3, y3, 3, 1); }
                // a faint vertical pleat seam down the centre so the white reads as fabric
                pc('#e7eaf4'); for (var y4 = gTop + 3; y4 < gBot - 2; y4 += 2) px(cx, y4, 1, 1);
                pc('#ffd84a'); px(cx - 6, gTop, 12, 2);                      // gold jewel collar
                pc('#5ab4ff'); px(cx - 1, gTop, 2, 2);
                pc('#ffd84a'); px(cx - (5 + 11), gBot - 2, (5 + 11) * 2, 2); // gold hem trim (defines the white skirt)
                // gloved arms (pose) — soft ivory gloves with a thin grey edge so
                // they stand apart from the pure-white gown.
                pc('#f3eede');
                if (o.wave) { px(cx + 7, gTop - 4, 5, 4); px(cx + 10, gTop - 9, 4, 6); }
                else { px(cx + 7, gTop + 2, 5, 6); }
                px(cx - 12, gTop + 2, 5, 6);                                 // resting hand
                pc('#cdd2e0');                                              // glove shadow edge
                if (o.wave) { px(cx + 10, gTop - 4, 4, 1); } else { px(cx + 7, gTop + 7, 5, 1); }
                px(cx - 12, gTop + 7, 5, 1);
            }

            // Cave-prison cell at the boss-stage goal (item 4). A stone alcove with
            // vertical iron bars; the bars swing OPEN once the princess is rescued.
            // Purely cosmetic (no collision) — reaching prisonX is the goal.
            function drawPrison() {
                if (!W.prisonX) return;
                var pr = W.princess;
                var px0 = Math.round(W.prisonX - camX);
                if (px0 < -80 || px0 > VW + 60) return;
                var floorY = GROUND_R * TILE;
                var cellW = 52, cellH = 56, cellTop = floorY - cellH;
                // dark cave recess behind the cell
                ctx.fillStyle = '#1a1322'; ctx.fillRect(px0 - 6, cellTop - 6, cellW + 12, cellH + 6);
                ctx.fillStyle = '#0d0a14'; ctx.fillRect(px0, cellTop, cellW, cellH);
                // stone frame
                ctx.fillStyle = '#6a6a78'; ctx.fillRect(px0 - 6, cellTop - 6, cellW + 12, 6);          // lintel
                ctx.fillStyle = '#4a4a58'; ctx.fillRect(px0 - 6, cellTop - 6, 6, cellH + 6); ctx.fillRect(px0 + cellW, cellTop - 6, 6, cellH + 6); // posts
                ctx.fillStyle = '#7a7a88';
                for (var by = cellTop - 6; by < floorY; by += 8) { ctx.fillRect(px0 - 6, by, 6, 2); ctx.fillRect(px0 + cellW, by, 6, 2); } // brick seams on posts
                // iron bars — vertical, swing apart when rescued
                var swing = (pr && pr.rescued) ? 18 : 0;   // bars hinged outward when freed
                ctx.fillStyle = '#9aa0ab';
                for (var i = 0; i < 5; i++) {
                    var bx = px0 + 6 + i * 10;
                    // left half swings left, right half swings right when open
                    if (swing && i < 2) bx -= swing;
                    else if (swing && i > 2) bx += swing;
                    else if (swing && i === 2) continue;   // centre bar removed (door gap)
                    ctx.fillRect(bx, cellTop, 3, cellH);
                    ctx.fillStyle = '#c4c8d0'; ctx.fillRect(bx, cellTop, 1, cellH); ctx.fillStyle = '#9aa0ab';
                }
                // horizontal bar bands
                ctx.fillStyle = '#7a808b';
                ctx.fillRect(px0 + 4, cellTop + 8, cellW - 8, 3); ctx.fillRect(px0 + 4, cellTop + cellH - 14, cellW - 8, 3);
                // a torch on each side of the cell for cave mood
                var fl = 1 + Math.sin(animT * 0.3) * 0.6;
                [px0 - 14, px0 + cellW + 8].forEach(function (tx) {
                    ctx.fillStyle = '#2a2020'; ctx.fillRect(tx, cellTop + 10, 4, 12);
                    ctx.fillStyle = '#ff8a1e'; ctx.beginPath(); ctx.arc(tx + 2, cellTop + 8, 4 + fl, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(tx + 2, cellTop + 7, 2 + fl * 0.5, 0, Math.PI * 2); ctx.fill();
                });
            }

            function drawPrincess() {
                var pr = W.princess; if (!pr) return;
                pr.t++;
                if (pr.escort) {
                    // ESCORT: walk side by side with Mario toward the flag pole,
                    // trailing just behind him (a couple of tiles to his left).
                    var follow = player.x - TILE * 1.6;
                    if (pr.x < follow) pr.x += Math.min(1.6, follow - pr.x);
                    else if (pr.x > follow + 2) pr.x -= Math.min(1.6, pr.x - follow);
                    pr.face = 1;
                } else if (pr.freed && pr.x > W.prisonX - TILE * 2) {
                    // Just freed: step LEFT out of the cell toward Mario.
                    pr.x -= 0.6; pr.face = -1;
                }
                var bob = pr.rescued ? Math.round(Math.sin(pr.t * 0.18) * 2) : 0;
                // anchor: centre sprite on hitbox, bottom-aligned; crown overhangs up
                var sx = Math.round(pr.x - camX - (PR_VW - pr.w) / 2);
                var sy = Math.round(pr.y - (PR_VH - pr.h)) + bob;
                if (sx < -24 || sx > VW + 24) return;
                // She waves while freed & standing still, but not while walking.
                var wave = pr.rescued && !pr.escort && (Math.floor(pr.t / 10) % 2 === 0);
                var key = 'princess|' + (wave ? 'w' : 'r');
                var rec = getSprite(key, PR_VW, PR_VH, function (Wn, Hn) { paintPrincess(Wn, Hn, { wave: wave }); });
                // contact shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath(); ctx.ellipse(Math.round(pr.x - camX) + pr.w / 2, Math.round(pr.y) + pr.h - 1, 9, 2.4, 0, 0, Math.PI * 2); ctx.fill();
                // mirror when facing right (escort walk toward the pole)
                blit(rec, sx, sy, pr.face === 1);
            }

            // ------------------------------------------------------------
            // FAR BACKDROP — the deepest parallax layer (slowest scroll). Gives
            // each biome a sense of vast distance: mountain ranges, dunes, sea
            // horizon, cavern depth, castle skyline. Drawn first (behind hills) so
            // everything else overlaps it. Cosmetic only; uses world coords under
            // the camY translate. Wrapped modulo a wide span so it tiles forever.
            // ------------------------------------------------------------
            function drawBackdrop() {
                var B = W.biome, key = W.biomeKey;
                var horizon = GROUND_R * TILE;
                // a soft atmospheric haze band just above the horizon (depth cue)
                var haze = shade(B.hills, key === 'underground' || key === 'castle' || key === 'finalcastle' ? -0.35 : 0.42);
                ctx.fillStyle = haze;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(0, horizon - 70, VW, 70);
                ctx.globalAlpha = 1;

                // Distant mountain range (two sub-layers) for outdoor biomes; for
                // water it's a far sea/island silhouette; sky gets towering cloud
                // banks; underground/castle get a jagged far wall.
                function range(spanColor, n, span, baseDrop, peak, par, jag) {
                    ctx.fillStyle = spanColor;
                    var wrap = W.worldW + span;
                    for (var i = 0; i < n; i++) {
                        var mx = ((i * span - camX * par) % wrap); if (mx < -span) mx += wrap;
                        var b = horizon - baseDrop;
                        if (jag) {
                            // jagged triangular peaks (mountains / cave wall / skyline)
                            ctx.beginPath();
                            ctx.moveTo(mx, b);
                            ctx.lineTo(mx + span * 0.5, b - peak);
                            ctx.lineTo(mx + span, b);
                            ctx.closePath(); ctx.fill();
                        } else {
                            // rounded distant hills/dunes
                            ctx.beginPath(); ctx.moveTo(mx, b); ctx.arc(mx + span / 2, b, span / 2, Math.PI, 0); ctx.closePath(); ctx.fill();
                        }
                    }
                }

                if (key === 'overworld' || key === 'forest' || key === 'desert') {
                    // two mountain ridges, far (pale) behind near (darker)
                    var farC = shade(B.hills, key === 'desert' ? 0.3 : 0.46);
                    var nearC = shade(B.hills, key === 'desert' ? 0.12 : 0.28);
                    range(farC, 8, 220, 4, 96, 0.10, true);
                    // snow/sun caps on the far ridge
                    ctx.fillStyle = shade(farC, 0.4);
                    for (var s = 0; s < 8; s++) {
                        var cxp = ((s * 220 - camX * 0.10) % (W.worldW + 220)); if (cxp < -220) cxp += (W.worldW + 220);
                        var px2 = cxp + 110, py2 = horizon - 4 - 96;
                        ctx.beginPath(); ctx.moveTo(px2 - 10, py2 + 18); ctx.lineTo(px2, py2); ctx.lineTo(px2 + 10, py2 + 18); ctx.closePath(); ctx.fill();
                    }
                    range(nearC, 9, 180, 2, 70, 0.16, true);
                } else if (key === 'water') {
                    // far sea horizon + distant islands + sun glints
                    ctx.fillStyle = shade(B.sky[1], -0.08);
                    ctx.fillRect(0, horizon - 26, VW, 26);                 // sea band
                    var isl = shade(B.hills, 0.18);
                    range(isl, 7, 200, 0, 26, 0.12, false);                // distant islands
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    for (var g = 0; g < 14; g++) {                          // sun glints on water
                        var gx = ((g * 60 - camX * 0.2) % VW + VW) % VW;
                        ctx.fillRect(gx, horizon - 20 + (g % 3) * 6, 8 + (g % 4) * 4, 1);
                    }
                } else if (key === 'sky') {
                    // towering distant cloud banks (very pale, slow)
                    ctx.fillStyle = 'rgba(255,255,255,0.55)';
                    for (var cbk = 0; cbk < 7; cbk++) {
                        var bxp = ((cbk * 200 - camX * 0.08) % (W.worldW + 200)); if (bxp < -200) bxp += (W.worldW + 200);
                        var byp = horizon - 30 - (cbk % 3) * 26;
                        ctx.beginPath();
                        ctx.arc(bxp + 30, byp, 26, 0, Math.PI * 2); ctx.arc(bxp + 64, byp + 8, 32, 0, Math.PI * 2);
                        ctx.arc(bxp + 100, byp, 24, 0, Math.PI * 2); ctx.fill();
                    }
                } else if (key === 'underground') {
                    // far cavern wall + dim glow pockets
                    range(shade(B.ground, 0.06), 10, 150, -10, 60, 0.12, true);
                    ctx.fillStyle = 'rgba(90,150,255,0.10)';
                    for (var gp = 0; gp < 6; gp++) {
                        var px3 = ((gp * 240 - camX * 0.12) % VW + VW) % VW;
                        ctx.beginPath(); ctx.arc(px3, horizon - 50, 30, 0, Math.PI * 2); ctx.fill();
                    }
                } else if (key === 'castle' || key === 'finalcastle') {
                    // far castle skyline: battlemented wall + towers in silhouette
                    var wallC = shade(B.ground, -0.05);
                    ctx.fillStyle = wallC;
                    ctx.fillRect(0, horizon - 56, VW, 56);
                    // crenellations
                    for (var cr = 0; cr < VW; cr += 16) ctx.fillRect(cr + ((Math.floor(camX*0.1))%16) * 0 , horizon - 62, 8, 8);
                    // a couple of distant towers
                    ctx.fillStyle = shade(B.ground, -0.12);
                    for (var tw = 0; tw < 6; tw++) {
                        var txp = ((tw * 200 - camX * 0.12) % (W.worldW + 200)); if (txp < -200) txp += (W.worldW + 200);
                        ctx.fillRect(txp + 60, horizon - 96, 26, 96);
                        ctx.fillRect(txp + 56, horizon - 102, 34, 8);       // tower cap
                        ctx.fillStyle = 'rgba(255,150,40,0.5)'; ctx.fillRect(txp + 70, horizon - 80, 6, 8); // lit window
                        ctx.fillStyle = shade(B.ground, -0.12);
                    }
                }
            }

            // Hills sit on the ground (world space; drawn under the camY translate).
            // Now THREE layers (far/mid/near) with sun highlights + scattered detail
            // for a much richer, deeper landscape. Cosmetic only.
            function drawScenery() {
                var B = W.biome;
                var hillBase = (GROUND_R) * TILE;
                // deep layer (palest, slowest)
                ctx.fillStyle = shade(B.hills, 0.06);
                for (var h3 = 0; h3 < 12; h3++) {
                    var dx = ((h3 * 130 - camX * 0.20) % (W.worldW + 260)); if (dx < -260) dx += (W.worldW + 260);
                    ctx.beginPath(); ctx.moveTo(dx, hillBase); ctx.arc(dx + 54, hillBase, 54, Math.PI, 0); ctx.closePath(); ctx.fill();
                }
                // back layer (darker, medium)
                ctx.fillStyle = shade(B.hills, -0.18);
                for (var h2 = 0; h2 < 12; h2++) {
                    var bx = ((h2 * 150 - camX * 0.32) % (W.worldW + 200)); if (bx < -200) bx += (W.worldW + 200);
                    ctx.beginPath(); ctx.moveTo(bx, hillBase); ctx.arc(bx + 42, hillBase, 42, Math.PI, 0); ctx.closePath(); ctx.fill();
                }
                // front layer (full colour, fastest) + sun caps + base shade line
                for (var h = 0; h < 10; h++) {
                    var hx = ((h * 180 - camX * 0.42) % (W.worldW + 180)); if (hx < -180) hx += (W.worldW + 180);
                    ctx.fillStyle = B.hills;
                    ctx.beginPath(); ctx.moveTo(hx, hillBase); ctx.arc(hx + 30, hillBase, 30, Math.PI, 0); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = shade(B.hills, 0.2);   // sun highlight
                    ctx.beginPath(); ctx.arc(hx + 22, hillBase - 6, 9, Math.PI, 0); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = shade(B.hills, -0.16);  // shaded right flank
                    ctx.beginPath(); ctx.arc(hx + 40, hillBase - 3, 6, Math.PI, 0); ctx.closePath(); ctx.fill();
                }
            }

            // Per-biome environment decorations, anchored to the ground and drawn
            // behind the play layer. Placed deterministically by world position so
            // they're stable (no flicker), with light parallax for depth. Purely
            // cosmetic — never overlaps gameplay collision (bible §18 readability).
            function drawDecor() {
                var B = W.biome, key = W.biomeKey;
                var gy = GROUND_R * TILE;                 // ground surface top (world y) — decor sits ON this line
                // DENSER decor: half the old spacing → ~2× as many anchored objects,
                // and each anchor now stamps several sub-objects (flowers, rocks,
                // mushrooms, birds…) → the "100× richer" feel without harming perf
                // (still only the on-screen slice is iterated). Two pseudo-random
                // values per anchor pick variant + sub-detail deterministically.
                var step = 30;
                var first = Math.floor((camX - step) / step) * step;
                var last = camX + VW + step;

                // small deterministic rng from a seed → [0,1)
                function rnd(seed, salt) { return (((seed ^ (salt * 374761393)) >>> 0) % 1000) / 1000; }

                // 1) Dense surface ground-cover: grass blades + tiny flowers/pebbles
                //    on grassy biomes, ripples on water, sand flecks on desert — for
                //    EVERY few px so the ground line is lush, never bare.
                if (key === 'overworld' || key === 'forest') {
                    for (var tx = Math.floor(camX / 6) * 6; tx <= camX + VW; tx += 6) {
                        var tsx = Math.round(tx - camX);
                        var sway = Math.sin(animT * 0.05 + tx * 0.3);
                        ctx.fillStyle = shade(B.groundTop, 0.2);
                        ctx.fillRect(tsx + sway, gy - 3, 1, 3);
                        ctx.fillRect(tsx + 2 - sway, gy - 5, 1, 5);
                        ctx.fillStyle = shade(B.hills, 0.1);
                        ctx.fillRect(tsx + 4 + sway, gy - 2, 1, 2);
                        // sprinkle tiny flowers deterministically
                        var fr = rnd((tx | 0), 7);
                        if (fr < 0.10) {
                            var fc = ['#ff5a8a', '#ffd84a', '#ff9ec4', '#7aa8ff'][(tx >> 1) & 3];
                            ctx.fillStyle = fc; ctx.fillRect(tsx + 3, gy - 6, 2, 2);
                            ctx.fillStyle = '#fff'; ctx.fillRect(tsx + 3 + (sway > 0 ? 1 : 0), gy - 6, 1, 1);
                            ctx.fillStyle = '#2f8a33'; ctx.fillRect(tsx + 3, gy - 4, 1, 4);
                        }
                    }
                } else if (key === 'desert') {
                    ctx.fillStyle = shade(B.groundTop, 0.16);
                    for (var sx2 = Math.floor(camX / 10) * 10; sx2 <= camX + VW; sx2 += 10) {
                        var ds = Math.round(sx2 - camX);
                        ctx.fillRect(ds, gy - 1, 3, 1); ctx.fillRect(ds + 5, gy - 2, 2, 1);
                    }
                }

                for (var wx = first; wx <= last; wx += step) {
                    var sxp = Math.round(wx - camX);
                    var seed = (Math.floor(wx / step) * 2654435761) >>> 0; // stable pseudo-rng
                    var v = (seed % 100) / 100, v2 = ((seed >> 8) % 100) / 100, v3 = ((seed >> 16) % 100) / 100;

                    if (key === 'overworld' || key === 'forest') {
                        if (v < 0.42) {
                            // TREE — layered round canopy, varied height + a fruit dot
                            var th = key === 'forest' ? 32 + (v2 * 18) : 20 + (v2 * 12);
                            var cxp = sxp + 14;
                            ctx.fillStyle = '#5a3414'; ctx.fillRect(cxp - 3, gy - th, 6, th);     // trunk
                            ctx.fillStyle = '#744521'; ctx.fillRect(cxp - 3, gy - th, 2, th);     // trunk light
                            ctx.fillStyle = '#3a2410'; ctx.fillRect(cxp + 1, gy - th, 1, th);     // trunk shade
                            ctx.fillStyle = shade(B.hills, -0.16);                                // canopy shadow
                            ctx.beginPath(); ctx.arc(cxp, gy - th - 5, 15, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.arc(cxp - 9, gy - th + 2, 9, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.arc(cxp + 9, gy - th + 2, 9, 0, Math.PI * 2); ctx.fill();
                            ctx.fillStyle = B.hills;                                              // canopy mid
                            ctx.beginPath(); ctx.arc(cxp + 1, gy - th - 7, 12, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.arc(cxp - 8, gy - th, 7, 0, Math.PI * 2); ctx.fill();
                            ctx.beginPath(); ctx.arc(cxp + 9, gy - th, 7, 0, Math.PI * 2); ctx.fill();
                            ctx.fillStyle = shade(B.hills, 0.24);                                 // sun highlight
                            ctx.beginPath(); ctx.arc(cxp - 5, gy - th - 10, 6, 0, Math.PI * 2); ctx.fill();
                            if (v3 < 0.5) { ctx.fillStyle = key === 'forest' ? '#ff5a55' : '#ffd84a'; ctx.fillRect(cxp + 4, gy - th - 4, 2, 2); ctx.fillRect(cxp - 6, gy - th + 1, 2, 2); }
                        } else if (v < 0.70) {
                            // BUSH cluster (3 lobes) + a flower
                            ctx.fillStyle = shade(B.hills, -0.05);
                            ctx.beginPath(); ctx.arc(sxp + 8, gy, 9, Math.PI, 0); ctx.fill();
                            ctx.beginPath(); ctx.arc(sxp + 17, gy, 7, Math.PI, 0); ctx.fill();
                            ctx.beginPath(); ctx.arc(sxp + 24, gy, 5, Math.PI, 0); ctx.fill();
                            ctx.fillStyle = shade(B.hills, 0.22);
                            ctx.beginPath(); ctx.arc(sxp + 6, gy - 2, 3, Math.PI, 0); ctx.fill();
                            if (v2 < 0.6) { ctx.fillStyle = '#ff5a8a'; ctx.fillRect(sxp + 14, gy - 9, 2, 2); ctx.fillStyle = '#ffd84a'; ctx.fillRect(sxp + 15, gy - 8, 1, 1); }
                        } else if (v < 0.82) {
                            // MUSHROOM toadstools (forest flavour)
                            ctx.fillStyle = '#e9e2d0'; ctx.fillRect(sxp + 8, gy - 5, 3, 5);
                            ctx.fillStyle = '#d23b3b'; ctx.beginPath(); ctx.arc(sxp + 9, gy - 5, 5, Math.PI, 0); ctx.fill();
                            ctx.fillStyle = '#fff'; ctx.fillRect(sxp + 7, gy - 6, 1, 1); ctx.fillRect(sxp + 11, gy - 7, 1, 1);
                        } else {
                            // small ROCK + grass tuft
                            ctx.fillStyle = '#9a9088'; ctx.beginPath(); ctx.arc(sxp + 10, gy, 5, Math.PI, 0); ctx.fill();
                            ctx.fillStyle = '#b8aea4'; ctx.beginPath(); ctx.arc(sxp + 8, gy - 1, 2, Math.PI, 0); ctx.fill();
                        }
                        // occasional fluttering butterfly / bird above (animated)
                        if (v3 < 0.16) {
                            var by1 = gy - 40 - (seed % 30) + Math.sin(animT * 0.12 + seed) * 4;
                            var fl1 = Math.floor(animT / 6 + seed) % 2;
                            ctx.fillStyle = v2 < 0.5 ? '#ff8ad0' : '#3a3a3a';
                            if (v2 < 0.5) { // butterfly
                                ctx.fillRect(sxp + 10, by1, fl1 ? 4 : 2, 3); ctx.fillRect(sxp + 10 - (fl1 ? 4 : 2), by1, fl1 ? 4 : 2, 3);
                            } else {        // bird (V wings)
                                ctx.fillRect(sxp + 8, by1 + (fl1 ? 0 : 2), 3, 1); ctx.fillRect(sxp + 12, by1 + (fl1 ? 0 : 2), 3, 1);
                            }
                        }
                    } else if (key === 'desert') {
                        if (v < 0.3) {
                            // tall CACTUS (saguaro) with two arms + flower
                            ctx.fillStyle = '#3f8a4a'; ctx.fillRect(sxp + 12, gy - 30, 6, 30);
                            ctx.fillRect(sxp + 7, gy - 18, 5, 3); ctx.fillRect(sxp + 7, gy - 24, 3, 9);
                            ctx.fillRect(sxp + 18, gy - 14, 5, 3); ctx.fillRect(sxp + 20, gy - 22, 3, 11);
                            ctx.fillStyle = '#56a85e'; ctx.fillRect(sxp + 12, gy - 30, 2, 30);
                            ctx.fillStyle = '#2f6a38'; ctx.fillRect(sxp + 16, gy - 30, 2, 30);
                            if (v2 < 0.5) { ctx.fillStyle = '#ff5a8a'; ctx.fillRect(sxp + 13, gy - 32, 4, 3); }
                        } else if (v < 0.5) {
                            // small barrel cactus + pebbles
                            ctx.fillStyle = '#3f8a4a'; ctx.beginPath(); ctx.arc(sxp + 12, gy, 6, Math.PI, 0); ctx.fill();
                            ctx.fillStyle = '#56a85e'; ctx.fillRect(sxp + 9, gy - 6, 1, 6); ctx.fillRect(sxp + 14, gy - 6, 1, 6);
                            ctx.fillStyle = '#caa24a'; ctx.fillRect(sxp + 20, gy - 2, 4, 2);
                        } else if (v < 0.74) {
                            // layered DUNE
                            ctx.fillStyle = shade(B.ground, 0.14); ctx.beginPath(); ctx.arc(sxp + 16, gy, 18, Math.PI, 0); ctx.fill();
                            ctx.fillStyle = shade(B.ground, 0.24); ctx.beginPath(); ctx.arc(sxp + 9, gy, 9, Math.PI, 0); ctx.fill();
                            ctx.fillStyle = shade(B.ground, 0.06); ctx.fillRect(sxp + 2, gy - 1, 28, 1);
                        } else if (v < 0.9) {
                            // bleached animal SKULL / rock pile
                            ctx.fillStyle = '#e6ddcb'; ctx.beginPath(); ctx.arc(sxp + 10, gy - 2, 4, 0, Math.PI * 2); ctx.fill();
                            ctx.fillStyle = '#000'; ctx.fillRect(sxp + 8, gy - 3, 1, 1); ctx.fillRect(sxp + 11, gy - 3, 1, 1);
                            ctx.fillStyle = '#caa24a'; ctx.fillRect(sxp + 16, gy - 3, 8, 3);
                        } else {
                            // dry tumbleweed (rolls slowly)
                            var roll = (animT * 0.4 + seed) % (W.worldW);
                            ctx.strokeStyle = '#9a7a3a'; ctx.fillStyle = '#9a7a3a';
                            ctx.beginPath(); ctx.arc(sxp + 12, gy - 6, 6, 0, Math.PI * 2); ctx.fill();
                            ctx.fillStyle = shade(B.ground, -0.1); ctx.fillRect(sxp + 9, gy - 8, 6, 1); ctx.fillRect(sxp + 11, gy - 10, 2, 6);
                        }
                    } else if (key === 'underground') {
                        // dense stalactites/stalagmites + crystals + glow + drips
                        ctx.fillStyle = shade(B.ground, 0.12);
                        var stx = sxp + 8;
                        ctx.beginPath(); ctx.moveTo(stx, camY); ctx.lineTo(stx + 6, camY); ctx.lineTo(stx + 3, camY + 14 + (v * 16)); ctx.closePath(); ctx.fill();
                        if (v2 < 0.5) { ctx.beginPath(); ctx.moveTo(stx + 14, camY); ctx.lineTo(stx + 19, camY); ctx.lineTo(stx + 16, camY + 9 + v2 * 10); ctx.closePath(); ctx.fill(); }
                        ctx.fillStyle = shade(B.ground, 0.2);                                     // stalagmite on floor
                        ctx.beginPath(); ctx.moveTo(sxp + 22, gy); ctx.lineTo(sxp + 30, gy); ctx.lineTo(sxp + 26, gy - 10 - v2 * 12); ctx.closePath(); ctx.fill();
                        // glowing crystal cluster
                        if (v3 < 0.4) {
                            var glow = 0.4 + 0.35 * Math.sin(animT * 0.09 + seed);
                            ctx.fillStyle = 'rgba(120,200,255,' + glow + ')';
                            ctx.beginPath(); ctx.moveTo(sxp + 14, gy); ctx.lineTo(sxp + 17, gy - 9); ctx.lineTo(sxp + 20, gy); ctx.closePath(); ctx.fill();
                            ctx.fillStyle = 'rgba(180,230,255,' + glow + ')'; ctx.fillRect(sxp + 16, gy - 6, 1, 4);
                        }
                        // dripping water glint from a stalactite
                        if (v < 0.3) { var dy2 = camY + 16 + ((animT * 1.4 + seed) % 80); ctx.fillStyle = 'rgba(150,210,255,0.7)'; ctx.fillRect(stx + 3, dy2, 1, 3); }
                    } else if (key === 'water') {
                        // tall swaying kelp forest + coral + shell + bubble streams + fish
                        var sway = Math.sin(animT * 0.06 + wx) * 3;
                        ctx.fillStyle = '#2a9a78';
                        ctx.fillRect(sxp + 8 + sway, gy - 26, 3, 26);
                        ctx.fillRect(sxp + 14 - sway, gy - 18, 3, 18);
                        ctx.fillRect(sxp + 20 + sway * 0.6, gy - 22, 3, 22);
                        ctx.fillStyle = '#3fc89a'; ctx.fillRect(sxp + 8 + sway, gy - 26, 1, 26);
                        // coral fan
                        ctx.fillStyle = v2 < 0.5 ? '#ff7ab6' : '#ff9a4a';
                        ctx.fillRect(sxp + 26, gy - 8, 2, 8); ctx.fillRect(sxp + 23, gy - 6, 2, 6); ctx.fillRect(sxp + 29, gy - 5, 2, 5);
                        // shell on the seabed
                        ctx.fillStyle = '#f0d8b0'; ctx.beginPath(); ctx.arc(sxp + 4, gy, 4, Math.PI, 0); ctx.fill();
                        // bubble stream
                        var bubY = gy - ((animT * 0.7 + seed) % 110);
                        ctx.fillStyle = 'rgba(255,255,255,0.5)';
                        ctx.beginPath(); ctx.arc(sxp + 18, bubY, 1.5 + (v * 2), 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(sxp + 20, bubY + 20, 1 + v2, 0, Math.PI * 2); ctx.fill();
                        // a little drifting fish
                        if (v3 < 0.3) {
                            var fishX = sxp + ((animT * 0.6 + seed) % 60) - 10, fishY = gy - 30 - (seed % 24);
                            ctx.fillStyle = v < 0.5 ? '#ffae45' : '#7aa8ff';
                            ctx.fillRect(fishX, fishY, 5, 3); ctx.fillRect(fishX - 2, fishY, 2, 3); // body+tail
                            ctx.fillStyle = '#000'; ctx.fillRect(fishX + 3, fishY + 1, 1, 1);
                        }
                    } else if (key === 'sky') {
                        // layered fluffy cloud platforms + drifting birds + sparkles
                        ctx.fillStyle = 'rgba(255,255,255,0.9)';
                        var cyy = gy - 30 - (seed % 60);
                        ctx.beginPath();
                        ctx.arc(sxp + 10, cyy, 9, 0, Math.PI * 2); ctx.arc(sxp + 20, cyy + 2, 7, 0, Math.PI * 2);
                        ctx.arc(sxp + 2, cyy + 3, 6, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = 'rgba(210,230,255,0.9)'; ctx.fillRect(sxp + 2, cyy + 6, 22, 2);   // cloud underside
                        if (v2 < 0.4) {  // twinkle
                            var tw2 = 0.4 + 0.5 * Math.sin(animT * 0.2 + seed);
                            ctx.fillStyle = 'rgba(255,255,210,' + tw2 + ')'; ctx.fillRect(sxp + 14, cyy - 12, 2, 2); ctx.fillRect(sxp + 13, cyy - 11, 1, 1); ctx.fillRect(sxp + 16, cyy - 11, 1, 1);
                        }
                        if (v3 < 0.25) { // bird
                            var bx3 = sxp + ((animT * 0.5 + seed) % 80), by3 = gy - 60 - (seed % 30), fl3 = Math.floor(animT / 6 + seed) % 2;
                            ctx.fillStyle = '#4a4a5a'; ctx.fillRect(bx3, by3 + (fl3 ? 0 : 2), 3, 1); ctx.fillRect(bx3 + 4, by3 + (fl3 ? 0 : 2), 3, 1);
                        }
                    } else if (key === 'castle' || key === 'finalcastle') {
                        // stone pillars + wall torches + hanging banners + chains + cobwebs
                        ctx.fillStyle = shade(B.ground, -0.15); ctx.fillRect(sxp + 4, gy - 44, 9, 44);
                        ctx.fillStyle = shade(B.ground, 0.1); ctx.fillRect(sxp + 4, gy - 44, 2, 44);
                        ctx.fillStyle = shade(B.ground, -0.3); ctx.fillRect(sxp + 4, gy - 44, 9, 2); // brick seam
                        ctx.fillRect(sxp + 4, gy - 30, 9, 1); ctx.fillRect(sxp + 4, gy - 16, 9, 1);
                        // torch + animated flame
                        if (v < 0.6) {
                            ctx.fillStyle = '#2a2020'; ctx.fillRect(sxp + 20, gy - 26, 4, 12);
                            var fl = 1 + Math.sin(animT * 0.3 + wx) * 0.7;
                            ctx.fillStyle = '#ff8a1e'; ctx.beginPath(); ctx.arc(sxp + 22, gy - 28, 4 + fl, 0, Math.PI * 2); ctx.fill();
                            ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(sxp + 22, gy - 29, 2 + fl * 0.5, 0, Math.PI * 2); ctx.fill();
                            ctx.fillStyle = 'rgba(255,150,40,0.18)'; ctx.beginPath(); ctx.arc(sxp + 22, gy - 28, 12 + fl, 0, Math.PI * 2); ctx.fill();
                        } else {
                            // hanging banner with the couple's accent colour
                            ctx.fillStyle = '#7a1020'; ctx.fillRect(sxp + 18, gy - 42, 8, 18);
                            ctx.fillStyle = '#a01828'; ctx.fillRect(sxp + 19, gy - 41, 6, 14);
                            ctx.fillStyle = '#ffd84a'; ctx.fillRect(sxp + 21, gy - 36, 2, 2);   // emblem
                            ctx.fillStyle = '#7a1020'; ctx.beginPath(); ctx.moveTo(sxp + 18, gy - 24); ctx.lineTo(sxp + 22, gy - 20); ctx.lineTo(sxp + 26, gy - 24); ctx.closePath(); ctx.fill();
                        }
                        // cobweb in a top corner sometimes
                        if (v3 < 0.3) { ctx.strokeStyle = 'rgba(220,220,230,0.4)'; ctx.fillStyle = 'rgba(220,220,230,0.3)'; ctx.beginPath(); ctx.moveTo(sxp, camY); ctx.lineTo(sxp + 12, camY + 12); ctx.lineTo(sxp, camY + 12); ctx.closePath(); ctx.fill(); }
                    }
                }
                // Lava glow band at the very bottom for castle biomes, now with
                // bubbling pops. X is in SCREEN space (camY translate only shifts Y).
                if (B.lava) {
                    var pulse = 0.28 + 0.14 * Math.sin(animT * 0.12);
                    ctx.fillStyle = 'rgba(255,90,20,' + pulse + ')';
                    ctx.fillRect(0, camY + VH - 8, VW, 8);
                    ctx.fillStyle = 'rgba(255,180,60,' + (pulse + 0.1) + ')';
                    for (var lb2 = 0; lb2 < 10; lb2++) {
                        var lx = ((lb2 * 47 + animT * 0.6) % VW);
                        var pop = Math.abs(Math.sin(animT * 0.1 + lb2));
                        ctx.fillRect(lx, camY + VH - 8 - pop * 4, 3, 2 + pop * 3);
                    }
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
            // Any non-gameplay dialog/popup that should freeze the run while it's open. Queried live
            // (host may re-inject the DOM) so a stale cached ref never keeps the game running.
            var _DIALOG_IDS = ['rm-modal-root', 'rm-lightbox', 'rm-stagesel-root', 'rm-confirm-root', 'rm-invitation'];
            function anyDialogOpen() {
                for (var i = 0; i < _DIALOG_IDS.length; i++) {
                    var el = document.getElementById(_DIALOG_IDS[i]);
                    if (el && el.classList.contains('show')) return true;
                }
                return false;
            }
            function loop(ts) {
                rafId = requestAnimationFrame(loop);
                // Heal a host-swapped canvas EVERY frame (even while an overlay is up),
                // so the moment the live invitation re-injects the DOM we re-grab the
                // new canvas and re-size it — no more permanent black game area.
                if (!isLive(canvas)) { if (reacquire()) resize(); }
                // Heal the JS-populated inventory rail if the host swapped in the
                // empty source markup (cheap: early-returns unless actually stale).
                if (window.__rmHealInventory) { try { window.__rmHealInventory(); } catch (e) {} }
                if (!running) return;
                // FREEZE gameplay whenever ANY dialog/popup is open — piece modal, gallery lightbox,
                // reset-confirm, stage-select, or the full invitation reveal. These open straight from
                // `classList.add('show')` without touching `running`, so without this gate Mario would
                // keep dying / the timer keep counting down behind the popup while the guest reads. The
                // 5 game-flow OVERLAYS already set running=false; this covers the remaining dialogs.
                // Keep lastT current so the first frame AFTER the dialog closes doesn't see a huge dt
                // (which would instantly drain the `time` countdown via timeAcc += dt).
                if (anyDialogOpen()) { lastT = ts; render(); return; }
                // If the stage wasn't laid out when we started (0×0 → black screen),
                // keep retrying every frame until it measures a real size, then do
                // one clean render. Until then, don't advance physics against a bad
                // viewport — just wait.
                if (!sized) { if (!resize()) return; render(); lastT = ts; return; }
                var dt = ts - lastT; lastT = ts;
                animT++;
                stepPlayer();
                stepEnemies();
                stepFireballs();
                if (fwActive > 0 || fireworks.length) stepFireworks();
                stepBgm();          // keep the in-game chiptune scheduled
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
            // `sized` = has resize() ever run against a REAL (non-zero) stage rect?
            // When the theme mounts, the stage can briefly be 0×0 (host still
            // laying out / mobile frame not measured yet). If startGame() calls
            // resize() during that window it bails early — the canvas keeps its
            // default 300×150 backing store with an identity transform, so render()
            // paints into the wrong space and the guest sees a BLACK screen while
            // the HUD/buttons (separate DOM overlays) show fine. The loop then
            // re-renders that same black frame forever because resize() only re-runs
            // on window 'resize' events. `sized` lets the loop retry until layout
            // is ready (see loop()).
            var sized = false;

            // STALE-CANVAS SELF-HEAL (the real "black screen on the live invitation"
            // cause). `canvas`/`ctx`/`stage` are captured ONCE when start() runs.
            // On the LIVE invitation the host re-injects the theme HTML (guest fetch
            // resolving, etc.) which REPLACES the <canvas> node with a fresh one —
            // but our JS is NOT re-run, so we keep drawing into the OLD, now-detached
            // canvas. The new canvas in the DOM never gets painted → the game area is
            // BLACK while the HUD/buttons (separate DOM) still show. Clicking
            // LANJUTKAN/MULAI BARU is exactly when that re-injection tends to land.
            //
            // reacquire() detects a detached canvas and re-grabs the live nodes +
            // re-attaches the ResizeObserver, so the running loop heals itself.
            function isLive(el) {
                if (!el) return false;
                if ('isConnected' in el) return el.isConnected;
                return document.documentElement.contains(el);     // older-engine fallback
            }
            function reacquire() {
                if (isLive(canvas)) return false;                 // still live → nothing to do
                var c = document.getElementById('rm-canvas');
                var s = document.getElementById('rm-stage');
                if (!c || !s) return false;                       // new DOM not ready yet
                canvas = c; stage = s; ctx = canvas.getContext('2d');
                sized = false;                                    // force a fresh resize on the new canvas
                if (stageRO) { try { stageRO.disconnect(); stageRO.observe(stage); } catch (e) {} }
                return true;
            }

            function resize() {
                reacquire();                                      // heal a stale canvas first
                var rect = stage.getBoundingClientRect();
                if (!rect.width || !rect.height) return false;   // stage not laid out yet

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
                sized = true;
                return true;
            }
            window.addEventListener('resize', resize);
            onCleanup(function () { window.removeEventListener('resize', resize); });
            // Belt-and-suspenders: a ResizeObserver on the stage fires the instant it
            // FIRST gets a real size (and on any later container resize the window
            // 'resize' event misses — host toggling the mobile frame, orientation,
            // sidebar). It also detects the host swapping the stage/canvas. Re-render
            // on each change so the canvas is never left stale/black. Guarded for
            // older engines. Declared here (var, hoisted) so reacquire() can re-bind it.
            var stageRO = null;
            if (typeof ResizeObserver === 'function') {
                stageRO = new ResizeObserver(function () {
                    if (!isLive(canvas)) reacquire();
                    if (resize() && running) render();
                });
                try { stageRO.observe(stage); } catch (e) {}
                onCleanup(function () { try { stageRO.disconnect(); } catch (e) {} });
            }

            // ============================================================
            // OVERLAYS / FLOW
            // ============================================================
            var OVERLAYS = ['rm-intro', 'rm-stageclear', 'rm-win', 'rm-continue', 'rm-rescue'];
            // Per-level characteristics shown to the guest (bible §13 scaling).
            var DIFF_LVL_DESC = [
                'Banyak power-up, musuh sedikit, jurang sempit — santai untuk belajar.',
                'Kombinasi musuh, jurang sedang, hadir platform & hazard baru.',
                'Presisi & timing, musuh padat, jurang lebar, stage lebih panjang.'
            ];
            function refreshIntroDiff() {
                var el = document.getElementById('rm-intro-diff');
                if (!el) return;
                var lvl = diffKnobs(stageNum).lvl;
                var key = ['easy', 'medium', 'hard'][lvl];
                el.innerHTML =
                    '<span class="rm-diff-info-badge" data-lvl="' + key + '">TINGKAT: ' + DIFF_LVL_NAME[lvl] + '</span>' +
                    '<span class="rm-diff-info-desc">' + DIFF_LVL_DESC[lvl] + '</span>';
            }
            function showOverlay(id) {
                stopBgm();   // any overlay = gameplay paused → silence the in-game chiptune
                OVERLAYS.forEach(function (o) { var el = document.getElementById(o); if (el) el.classList.remove('show'); });
                var el = document.getElementById(id); if (el) el.classList.add('show');
                if (id === 'rm-intro') refreshIntroDiff();
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
                // Size first; only paint if the stage is actually laid out. If not,
                // the loop's `!sized` retry takes over and renders once it is — so we
                // never leave a black canvas on screen (fixes "sering blank hitam").
                if (resize()) render();
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
                if (sized) render(); else resize();
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
                if (sized) render(); else resize();
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
                var vb = document.getElementById('rm-view-btn');
                if (!vb) return;
                if (viewUnlocked()) vb.classList.remove('is-locked');
                else vb.classList.add('is-locked');
            }
            function openInvitation() {
                // When opening via the shortcut, make sure every piece is unlocked
                // so the guest is never locked out of real wedding details.
                INFOS.forEach(function (info) {
                    if (!unlocked[info.key]) { unlocked[info.key] = true; var btn = invButtons[info.key]; if (btn) btn.classList.add('is-enabled'); }
                });
                persist();
                running = false;
                stopBgm();          // silence the in-game chiptune on the invitation page
                hideOverlays();
                closeModal();
                if (invitation) { invitation.classList.add('show'); invitation.scrollTop = 0; }
                if (fab) fab.classList.add('show');
                // MUSIC REMOVED (item 4): no tenant song on the invitation either.
                // Force the host's auto-started track to stay paused so the page is
                // silent (the music play/pause button was deleted too).
                pauseHostMusic();
            }

            // ---- Host music control (tenant song plays ONLY on the invitation) ----
            // The host owns the audio: clicking #btn-toggle-music flips its
            // isPlaying, and the host reflects that by toggling the .music-playing
            // class on the button (ThemeWrapper). We keep our OWN desired state
            // (musicWanted) and reconcile toward it: if the host's actual state
            // differs, click the toggle. Reconciliation re-runs on a short delay
            // too, so it self-heals against React render-timing races (the host's
            // class/icon sync may land a tick after our click). We never touch
            // #bg-music directly — only the host's button drives real playback.
            var musicWanted = false;       // true only while the invitation page is open
            function hostMusicPlaying() {
                var b = document.getElementById('btn-toggle-music');
                if (b && b.classList.contains('music-playing')) return true;
                // Fallback to the icon the host swaps (#pause-icon visible ⇒ playing).
                var pa = document.getElementById('pause-icon');
                if (pa && pa.style.display === 'block') return true;
                // Last resort: the raw <audio> element's own state (some host
                // builds drive #bg-music directly rather than a separate Audio).
                if (bgMusic && !bgMusic.paused && !bgMusic.ended) return true;
                return false;
            }
            // Reconciliation MUST be idempotent against the host's render lag. The
            // old code re-checked + re-clicked on a fixed 0/60/260ms schedule, but
            // if the host hadn't yet flipped its .music-playing class on the second
            // tick we'd read the OLD state, think our click hadn't landed, and click
            // AGAIN — toggling the music straight back off (the "music tidak jalan"
            // bug). Now: we click at most ONCE per intent, then only re-click on a
            // later tick if the host's settled state still disagrees AND we haven't
            // already issued a click for this exact intent generation.
            var musicGen = 0;              // bumps each time the desired state changes
            function reconcileMusic(gen, allowClick) {
                try {
                    if (gen !== musicGen) return;            // a newer intent superseded us
                    if (hostMusicPlaying() === musicWanted) return; // already correct → done
                    if (!allowClick) return;                 // settle tick: observe only
                    var b = document.getElementById('btn-toggle-music');
                    if (b) b.click();
                } catch (e) {}
            }
            function setMusicWanted(on) {
                var next = !!on;
                musicWanted = next;
                var gen = ++musicGen;
                // One decisive click NOW (synchronous → still inside the user gesture
                // when this came from a click, so the host's deferred .play() keeps
                // its autoplay activation).
                reconcileMusic(gen, true);
                // Turning music ON is the fragile direction (the host plays inside a
                // React effect AFTER our click, and the browser may eat the first
                // autoplay attempt). Retry on a longer ramp — each retry only clicks
                // if the host STILL isn't playing, so we never toggle a working song
                // back off. Turning OFF needs just one settle check.
                var sched = next ? [250, 600, 1200, 2000] : [320, 900];
                sched.forEach(function (ms) { setTimeout(function () { reconcileMusic(gen, true); }, ms); });
                // When asking to PLAY, also nudge any host YouTube-music iframe to
                // play directly (plain-<audio> tenant songs are owned by the host's
                // private Audio object and can't be reached from the theme).
                if (next) nudgeYouTubeMusic();
            }
            // If the tenant's backsound is a YouTube video, the host renders an
            // <iframe> for it. Post the YT IFrame-API "playVideo" command straight to
            // every candidate iframe so the song starts even if the host's state
            // round-trip lags. Harmless for non-YT iframes (they ignore the message).
            function nudgeYouTubeMusic() {
                try {
                    var frames = document.querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]');
                    for (var i = 0; i < frames.length; i++) {
                        var cw = frames[i].contentWindow; if (!cw) continue;
                        cw.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
                    }
                } catch (e) {}
            }
            // MUSIC REMOVED (item 4): the host's background-music playback kept
            // misbehaving on the invitation, so the theme no longer plays the
            // tenant song anywhere — not in the game, not on the invitation. The
            // user-facing music button was deleted too. We only ever PAUSE (to
            // silence the host's auto-started track); we never resume it.
            //
            // playHostMusic is now a deliberate NO-OP — keeping the name so every
            // existing call site (openInvitation, etc.) stays valid without forcing
            // music back on.
            function playHostMusic() { /* intentionally silent — music disabled */ }
            // Pause the host's auto-started tenant music (keeps everything silent).
            function pauseHostMusic() { setMusicWanted(false); }

            // Routed via the delegated document listener only (survives re-inject).
            function onViewClick() {
                if (!viewUnlocked()) { toast('Selesaikan permainan dulu<br><span style="font-size:8px">atau aktifkan ★ cheat</span>', 1800); return; }
                openInvitation();
            }

            // ============================================================
            // SETTINGS / RESET
            // ============================================================
            var settingsBtn = document.getElementById('rm-settings-btn');
            var confirmRoot = document.getElementById('rm-confirm-root');
            var confirmOk = document.getElementById('rm-confirm-ok');
            var confirmCancel = document.getElementById('rm-confirm-cancel');
            function onSettingsClick() {
                // Re-query live: the cached ref may point at a host-replaced node.
                var root = document.getElementById('rm-confirm-root');
                if (root) root.classList.add('show');
            }
            // Reset dialog handlers are NAMED so the delegated document listener can
            // route to them. Direct per-element listeners on rm-confirm-ok/-cancel die
            // when the host re-injects the DOM (e.g. after fullscreen on the preview
            // route) — that was the "tombol RESET diklik tapi tidak terjadi apa-apa"
            // bug. Delegation on `document` survives every re-injection.
            function doResetCancel() {
                var root = document.getElementById('rm-confirm-root');
                if (root) root.classList.remove('show');
            }
            function doResetConfirm() {
                resetSave();
                var root = document.getElementById('rm-confirm-root');
                if (root) root.classList.remove('show');
                if (invitation) invitation.classList.remove('show');
                if (fab) fab.classList.remove('show');
                closeModal();
                if (player) player.cheat = false;
                if (starBtn) starBtn.classList.remove('is-on');
                score = 0; coinGot = 0; lives = 3;
                buildInventory();      // rebuild icons (all locked again)
                applyCheatInventory(); // cheat is now off → re-lock uncollected icons
                updateViewBtn();       // re-lock the view button
                startGame(1);          // back to World 1-1 (clears cheat on new player)
                updateStageSelBtn();   // hide stage-select (cheat off)
                running = false;
                showOverlay('rm-intro');
                toast('Game di-reset', 1400);
            }
            // (Settings/reset buttons + backdrops are all routed through the delegated
            // document listener below — no per-element listeners.)

            // ============================================================
            // WIRE UP UI
            // ============================================================
            var cover = document.getElementById('rm-cover');
            var btnStart = document.getElementById('rm-start-btn'); // PRESS START — begins the GAME only (does NOT start music)
            var btnIntroGo = document.getElementById('rm-intro-go');
            var btnStageGo = document.getElementById('rm-stage-go');
            var btnWinGo = document.getElementById('rm-win-go');
            var btnBackGame = document.getElementById('rm-back-game');
            var btnCloseInv = document.getElementById('rm-close-inv');
            var btnReplay = document.getElementById('rm-replay');
            var starBtn = document.getElementById('rm-star-btn');
            var soundBtn = document.getElementById('rm-sound-btn');
            var stageSelBtn = document.getElementById('rm-stagesel-btn');
            var stageSelRoot = document.getElementById('rm-stagesel-root');
            var stageSelGrid = document.getElementById('rm-stagesel-grid');
            var stageSelCancel = document.getElementById('rm-stagesel-cancel');
            var stageSelOk = document.getElementById('rm-stagesel-ok');
            var stageSelHint = document.getElementById('rm-stagesel-hint');

            // ---- Difficulty selector (cover): pick easy/medium/hard once at start ----
            // NOTE: the actual click is handled by the DELEGATED document listener
            // below (see "DELEGATED CLICK"), NOT by a per-element listener. On the
            // live invitation the host re-injects the theme DOM (dangerouslySetInnerHTML)
            // whenever htmlBase changes — e.g. once the async guest fetch resolves —
            // WITHOUT re-running this JS, so any listener bound directly to the cover
            // buttons dies with the replaced nodes and the buttons go dead. A single
            // delegated listener on `document` survives every re-injection.
            var diffWrap = document.getElementById('rm-diff');
            function syncDiffUI() {
                // Query the whole document, not a cached diffWrap ref, so the sync
                // still hits the CURRENT (possibly re-injected) buttons.
                var opts = document.querySelectorAll('#rm-diff .rm-diff-opt');
                for (var i = 0; i < opts.length; i++) {
                    opts[i].classList.toggle('is-sel', opts[i].getAttribute('data-diff') === gameDiff);
                }
            }
            function pickDiff(d) {
                if (d === 'easy' || d === 'medium' || d === 'hard') { gameDiff = d; persist(); syncDiffUI(); playSfx('coin'); }
            }
            syncDiffUI();

            // Does a meaningful saved game exist? (item 3) — true if the guest has
            // reached past World 1, finished a run, banked a score, or collected any
            // invitation piece. A brand-new player has none of these.
            function hasSave() {
                if (bestStage > 1 || completed || bestScore > 0) return true;
                for (var i = 0; i < INFOS.length; i++) if (unlocked[INFOS[i].key]) return true;
                return false;
            }
            // Count how many invitation pieces are already collected.
            function countUnlocked() { var n = 0; for (var i = 0; i < INFOS.length; i++) if (unlocked[INFOS[i].key]) n++; return n; }

            // Build the saved-progress summary + show the Continue/New overlay.
            function showContinue() {
                var sum = document.getElementById('rm-continue-summary');
                if (sum) {
                    var w = WORLDS[clamp(bestStage, 1, TOTAL_STAGES) - 1] || WORLDS[0];
                    var modeName = DIFF_LVL_NAME[gameDiff === 'hard' ? 2 : (gameDiff === 'easy' ? 0 : 1)];
                    sum.innerHTML =
                        '<div class="cs-row"><span class="cs-key">STAGE</span><span class="cs-val">WORLD ' + w.name + '</span></div>' +
                        '<div class="cs-row"><span class="cs-key">MODE</span><span class="cs-val">' + modeName + '</span></div>' +
                        '<div class="cs-row"><span class="cs-key">INFO TERKUMPUL</span><span class="cs-val">' + countUnlocked() + ' / ' + INFOS.length + '</span></div>' +
                        '<div class="cs-row"><span class="cs-key">SKOR TERBAIK</span><span class="cs-val">' + bestScore + '</span></div>';
                }
                running = false;
                showOverlay('rm-continue');
            }

            // PRESS START — begins the GAME. Called by the delegated document
            // listener below (survives host DOM re-injection); do NOT bind it
            // directly to btnStart, whose node is replaced on the live invitation.
            function pressStart() {
                audioCtx();
                // The host auto-starts the tenant's music when its own cover is
                // dismissed; the GAME must be silent, so pause it the moment the
                // guest starts playing. Music resumes only on the invitation page.
                pauseHostMusic();
                // Re-query the cover live: the cached `cover` ref may point at a
                // node the host already replaced, so hiding it would be a no-op.
                var coverEl = document.getElementById('rm-cover');
                if (coverEl) coverEl.classList.add('rm-hidden');
                buildInventory();
                updateViewBtn();
                // If saved progress exists, ask whether to continue or start fresh
                // (item 3); otherwise drop straight into World 1-1's intro.
                if (hasSave()) {
                    startGame(1);          // build a default world so the canvas isn't blank behind the overlay
                    running = false;
                    showContinue();
                } else {
                    startGame(1);
                    running = false;
                    showOverlay('rm-intro');
                }
            }

            // LANJUTKAN — resume at the furthest world reached, keeping the saved
            // difficulty mode + already-collected invitation pieces (all still loaded
            // in `unlocked`/`gameDiff`). Jumps straight into play.
            // OVERLAY BUTTON HANDLERS — defined as NAMED functions so the delegated
            // document listener (below) can route to them. On the LIVE invitation the
            // host re-injects the theme DOM, replacing these overlay nodes and killing
            // any listener bound directly to them — which is exactly the "LANJUTKAN /
            // MULAI BARU tidak masuk ke game, stuck di screen" bug. Delegation on
            // `document` survives every re-injection. We still keep direct listeners
            // as a harmless fallback (iframe preview, exotic hosts).
            var btnContinueLoad = document.getElementById('rm-continue-load');
            var btnContinueNew = document.getElementById('rm-continue-new');
            // LANJUTKAN — resume at the furthest reached world.
            function doContinueLoad() {
                hideOverlays();
                startGame(clamp(bestStage, 1, TOTAL_STAGES));
                running = true; lastT = performance.now();
                startBgm();
                toast('Lanjut WORLD ' + (WORLDS[stageNum - 1] || WORLDS[0]).name + ' ▶', 1400);
            }
            // MULAI BARU — wipe the save and start a clean run from World 1-1.
            function doContinueNew() {
                resetSave();
                if (player) player.cheat = false;
                if (starBtn) starBtn.classList.remove('is-on');
                score = 0; coinGot = 0; lives = 3;
                buildInventory();
                updateViewBtn();
                updateStageSelBtn();
                startGame(1);
                running = false;
                showOverlay('rm-intro');
            }
            // NOTE: these buttons are driven ONLY by the delegated document listener
            // (see RM_DELEGATED_BTNS below). We intentionally do NOT also bind a
            // direct listener here — that would double-fire (capture on document +
            // bubble on the node) and could e.g. reset the save twice.

            function doIntroGo() {
                hideOverlays(); running = true; lastT = performance.now();
                startBgMusic();
                startBgm();         // begin the in-game chiptune
            }
            function doStageGo() { nextStage(); startBgMusic(); startBgm(); }
            function doWinGo() { hideOverlays(); openInvitation(); }
            // (routed via the delegated document listener only — no direct binding,
            // see RM_DELEGATED_BTNS below.)

            // ---- Bonus rescue offer (item 3) ----
            // "YA, SELAMATKAN" → resume the live game so the guest can play on
            // toward the boss stage and free the princess. The run was paused
            // (running=false) when the offer appeared; restart the loop where it
            // left off (same stage, same world) without rebuilding anything.
            var btnRescueGo = document.getElementById('rm-rescue-go');
            var btnRescueSkip = document.getElementById('rm-rescue-skip');
            function doRescueGo() {
                hideOverlays();
                if (started && W && player && !player.win) {
                    running = true; lastT = performance.now();
                    startBgm();
                    toast('Selamatkan sang putri! ⚔ Lanjut ke ujung petualangan ▶', 2000);
                } else {
                    // No live run to return to (e.g. unlocked via cheat) — just start.
                    startGame(stageNum || 1); running = true; lastT = performance.now(); startBgm();
                }
            }
            // "Buka Undangan" → open the full invitation right away (skip the bonus).
            function doRescueSkip() { hideOverlays(); openInvitation(); }
            // (routed via the delegated document listener only — no direct binding.)

            // Close: hide the invitation and RESUME the current game at the same
            // stage (no reset). If no run is in progress yet, fall back to intro.
            // (All three are routed via the delegated document listener below.)
            function hideInvitationUI() {
                var inv = document.getElementById('rm-invitation');
                var f = document.getElementById('rm-fab');
                if (inv) inv.classList.remove('show');
                if (f) f.classList.remove('show');
            }
            function doCloseInv() {
                hideInvitationUI();
                closeModal();
                // Leaving the invitation back to the game → silence the tenant song.
                pauseHostMusic();
                if (started && W && player && !player.win) {
                    running = true; lastT = performance.now();
                    startBgm();     // resume the in-game chiptune on the live game
                } else {
                    running = false; showOverlay('rm-intro');
                }
            }
            // Back to game: restart the whole run from World 1-1.
            function doBackGame() {
                hideInvitationUI();
                pauseHostMusic();   // back to the game → silence the music
                startGame(1); running = false; showOverlay('rm-intro');
            }
            function doReplay() {
                hideInvitationUI();
                pauseHostMusic();   // replaying the game → silence the music
                startGame(1); running = false; showOverlay('rm-intro');
            }

            // Show/hide the cheat-only stage-select button to match cheat state.
            function updateStageSelBtn() {
                var b = document.getElementById('rm-stagesel-btn');
                if (b) b.style.display = (player && player.cheat) ? 'flex' : 'none';
            }

            // CHEAT ⇒ light up ALL inventory icons immediately (item: "button
            // bintang ketika aktif ga langsung buka kotak2 icon di kanan atas").
            // Enabling cheat should instantly enable every top-right icon so the
            // guest can open any invitation piece without hunting "?" blocks. We do
            // NOT persist unlocked=true here — cheat is a temporary view override —
            // so turning cheat OFF restores only the genuinely-collected pieces.
            function applyCheatInventory() {
                var on = !!(player && player.cheat);
                INFOS.forEach(function (info) {
                    var btn = invButtons[info.key];
                    if (!btn) return;
                    var reallyUnlocked = !!unlocked[info.key];
                    if (on || reallyUnlocked) {
                        var wasEnabled = btn.classList.contains('is-enabled');
                        btn.classList.add('is-enabled');
                        // pop the newly-lit icons so the guest sees them open up
                        if (on && !wasEnabled) {
                            btn.classList.add('just-unlocked');
                            (function (b) { setTimeout(function () { b.classList.remove('just-unlocked'); }, 520); })(btn);
                        }
                    } else {
                        // cheat OFF and never collected → re-lock (and clear badge)
                        btn.classList.remove('is-enabled', 'has-new', 'just-unlocked');
                    }
                });
            }

            // Toolbar handlers are named + re-query their node live, so the single
            // delegated document listener (below) drives them and they survive the
            // host re-injecting the DOM. NO per-element addEventListener here.
            function onStarClick() {
                if (!player) return;
                player.cheat = !player.cheat;
                var sb = document.getElementById('rm-star-btn');
                if (sb) sb.classList.toggle('is-on', player.cheat);
                updateViewBtn();      // cheat unlocks the view shortcut
                updateStageSelBtn();  // cheat reveals the stage-select shortcut
                applyCheatInventory(); // cheat instantly lights up ALL top-right icons
                if (player.cheat) playSfx('unlock');
                toast(player.cheat ? 'CHEAT MODE ON<br><span style="font-size:8px">Semua ikon undangan terbuka · skor nonaktif</span>' : 'CHEAT MODE OFF', 1700);
            }

            // ---- Sound on/off (item 5) — mutes game SFX + chiptune ----
            function syncSoundBtn() {
                var sb = document.getElementById('rm-sound-btn');
                if (!sb) return;
                var on = sb.querySelector('.rm-snd-on'), off = sb.querySelector('.rm-snd-off');
                if (on) on.style.display = muted ? 'none' : 'block';
                if (off) off.style.display = muted ? 'block' : 'none';
                sb.classList.toggle('is-muted', muted);
            }
            function onSoundClick() {
                muted = !muted;
                if (muted) { stopBgm(); }                  // silence the chiptune immediately
                else { audioCtx(); if (running && started && player && !player.win) startBgm(); playSfx('coin'); }
                persist();
                syncSoundBtn();
                toast(muted ? '🔇 Suara dimatikan' : '🔊 Suara dinyalakan', 1200);
            }
            syncSoundBtn();

            // ---- Stage select (cheat) ----
            // The dialog now STAGES the player's choices instead of applying them on
            // every tap (item 3): picking a mode or a stage only updates the pending
            // selection + UI highlight. Nothing changes in the live game until OK is
            // pressed; TUTUP discards the pending choice and leaves the game as-is.
            var selDiff = gameDiff;     // pending difficulty mode (applied on OK)
            var selStage = stageNum;    // pending stage number  (applied on OK)

            // Short human-readable summary of what a difficulty mode does, derived
            // from the bible's difficulty scaling (item 4): mode shifts each world's
            // base difficulty one step and tunes gaps/enemies/length/hazards.
            var DIFF_INFO = {
                easy:   { name: 'EASY',   desc: 'Banyak power-up · musuh sedikit · jurang sempit · stage pendek' },
                medium: { name: 'MEDIUM', desc: 'Kombinasi musuh · jurang sedang · platform & hazard baru' },
                hard:   { name: 'HARD',   desc: 'Presisi & timing · musuh padat · jurang lebar · stage lebih panjang' }
            };

            function renderStageSelHint() {
                if (!stageSelHint) return;
                var w = WORLDS[selStage - 1] || WORLDS[0];
                var di = DIFF_INFO[selDiff] || DIFF_INFO.medium;
                stageSelHint.innerHTML =
                    '<div class="ss-hint-row"><span class="ss-hint-key">PILIHAN</span>' +
                    '<span class="ss-hint-val">WORLD ' + w.name + ' · ' + di.name + '</span></div>' +
                    '<div class="ss-hint-desc">' + di.desc + '</div>';
            }

            function buildStageSelect() {
                // Re-point at the live grid (the host may have replaced the node).
                stageSelGrid = document.getElementById('rm-stagesel-grid');
                if (!stageSelGrid) return;
                // Start each open from the live state so re-opening reflects reality.
                selDiff = gameDiff; selStage = stageNum;
                stageSelGrid.innerHTML = '';

                // DIFFICULTY (mode) chooser: a cycle button that only updates the
                // PENDING mode + UI. The actual rebuild happens on OK.
                var dbtn = document.createElement('button');
                dbtn.type = 'button';
                dbtn.className = 'rm-stagesel-item rm-stagesel-diff';
                dbtn.style.gridColumn = '1 / -1';
                function dlabel() {
                    var di = DIFF_INFO[selDiff] || DIFF_INFO.medium;
                    return '<span class="ss-world">MODE: ' + di.name + '</span>' +
                        '<span class="ss-biome">ketuk untuk ganti tingkat kesulitan</span>';
                }
                dbtn.innerHTML = dlabel();
                dbtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var i = DIFF_ORDER.indexOf(selDiff);
                    selDiff = DIFF_ORDER[(i + 1) % DIFF_ORDER.length];
                    dbtn.innerHTML = dlabel();
                    renderStageSelHint();
                    playSfx('coin');
                });
                stageSelGrid.appendChild(dbtn);

                // STAGE chooser: tapping a world only marks it as the pending stage
                // (highlight), it no longer jumps immediately.
                WORLDS.forEach(function (w, idx) {
                    var n = idx + 1;
                    var b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'rm-stagesel-item' +
                        (n === stageNum ? ' is-current' : '') +
                        (n === selStage ? ' is-selected' : '');
                    b.innerHTML = '<span class="ss-world">WORLD ' + w.name + '</span><span class="ss-biome">' + w.biome + '</span>';
                    b.addEventListener('click', function (e) {
                        e.stopPropagation();
                        selStage = n;
                        // Refresh selection highlight across all world buttons.
                        var items = stageSelGrid.querySelectorAll('.rm-stagesel-item');
                        for (var k = 0; k < items.length; k++) items[k].classList.remove('is-selected');
                        b.classList.add('is-selected');
                        renderStageSelHint();
                        playSfx('coin');
                    });
                    stageSelGrid.appendChild(b);
                });

                renderStageSelHint();
            }
            function onStageSelClick() {
                if (!player || !player.cheat) return;
                buildStageSelect();
                var root = document.getElementById('rm-stagesel-root');
                if (root) root.classList.add('show');
            }
            // TUTUP: close the stage-select dialog without changing anything.
            function doStageSelCancel() {
                var root = document.getElementById('rm-stagesel-root');
                if (root) root.classList.remove('show');
            }
            // OK: apply the pending mode + stage to the live game.
            function doStageSelOk() {
                if (selDiff !== gameDiff) { gameDiff = selDiff; persist(); syncDiffUI(); }
                var root = document.getElementById('rm-stagesel-root');
                if (root) root.classList.remove('show');
                playSfx('stageclear');
                goToStage(selStage);                 // rebuild at chosen stage + difficulty
            }
            // (All stage-select buttons + backdrop are routed through the delegated
            // document listener below — no per-element listeners, so they survive
            // the host re-injecting the DOM on the live invitation.)

            // Touch controls: analog joystick + action buttons
            bindJoystick();
            holdBtn('rm-jump', 'jump');
            holdBtn('rm-act', 'act', { tap: doAction });
            bindKey();

            // ================================================================
            // DELEGATED CLICK (robust on the LIVE invitation)
            // ----------------------------------------------------------------
            // In the Theme Editor the theme runs in an isolated <iframe>, so the
            // per-element listeners above are stable. On the REAL invitation the
            // host injects this theme via dangerouslySetInnerHTML and RE-INJECTS
            // the DOM when htmlBase changes (the async guest fetch resolving,
            // image resolve, RSVP submit, …) WITHOUT re-running this JS. Any
            // listener bound directly to a node that gets replaced then dies —
            // which is why the COVER buttons (PRESS START + difficulty) worked in
            // preview but went dead when opened from the invitation link.
            //
            // A single delegated listener on `document` (matched by id / class via
            // closest) survives every re-injection. It is registered in CAPTURE
            // phase because the host (ThemeWrapper) also intercepts some clicks in
            // capture phase and may stopImmediatePropagation() before a bubble
            // listener runs — capture here guarantees the cover buttons fire.
            // De-duped via a global guard so a stale listener from a half-cleaned
            // prior injection can never double-fire.
            // ================================================================
            // Map of overlay button id → handler. Any button whose node the host
            // may replace on re-injection MUST be routed here (not just via its own
            // addEventListener), or it goes dead on the live invitation. This was the
            // "LANJUTKAN / MULAI BARU tidak masuk ke game" bug: those handlers were
            // bound directly to the re-injected nodes and never fired.
            var RM_DELEGATED_BTNS = {
                'rm-continue-load': function () { doContinueLoad(); },
                'rm-continue-new':  function () { doContinueNew(); },
                'rm-intro-go':      function () { doIntroGo(); },
                'rm-stage-go':      function () { doStageGo(); },
                'rm-win-go':        function () { doWinGo(); },
                'rm-rescue-go':     function () { doRescueGo(); },
                'rm-rescue-skip':   function () { doRescueSkip(); },
                // RESET dialog (settings) — must survive host re-injection too.
                'rm-confirm-ok':     function () { doResetConfirm(); },
                'rm-confirm-cancel': function () { doResetCancel(); },
                // LEFT TOOLBAR — ★ cheat / 🔇 sound / stage-select / view / settings.
                'rm-star-btn':       function () { onStarClick(); },
                'rm-sound-btn':      function () { onSoundClick(); },
                'rm-stagesel-btn':   function () { onStageSelClick(); },
                'rm-view-btn':       function () { onViewClick(); },
                'rm-settings-btn':   function () { onSettingsClick(); },
                // STAGE-SELECT dialog OK / TUTUP.
                'rm-stagesel-ok':     function () { doStageSelOk(); },
                'rm-stagesel-cancel': function () { doStageSelCancel(); },
                // Inside-invitation nav (close / back-to-game / replay) + info modal ✕.
                'rm-close-inv':      function () { doCloseInv(); },
                'rm-back-game':      function () { doBackGame(); },
                'rm-replay':         function () { doReplay(); },
                'rm-modal-close':    function () { closeModal(); }
            };
            var rmDelegated = function (e) {
                var t = e.target;
                if (!t || !t.closest) return;
                // Difficulty pick (cover): data-diff on .rm-diff-opt.
                var diffBtn = t.closest('#rm-diff .rm-diff-opt');
                if (diffBtn) { pickDiff(diffBtn.getAttribute('data-diff')); return; }
                // PRESS START (cover).
                if (t.closest('#rm-start-btn')) { pressStart(); return; }
                // Overlay buttons (continue / intro / stage-clear / win / rescue /
                // reset) — survive host DOM re-injection because this listener lives
                // on document.
                for (var id in RM_DELEGATED_BTNS) {
                    if (t.closest('#' + id)) { RM_DELEGATED_BTNS[id](); return; }
                }
                // Tap the dark backdrop (not the dialog) to dismiss a dialog. Compare
                // the exact target so a click INSIDE the dialog panel is ignored.
                if (t === document.getElementById('rm-confirm-root'))  { doResetCancel();    return; }
                if (t === document.getElementById('rm-stagesel-root')) { doStageSelCancel(); return; }
                if (t === document.getElementById('rm-modal-root'))    { closeModal();       return; }
            };
            if (window.__rmDelegated) { try { document.removeEventListener('click', window.__rmDelegated, true); } catch (e) {} }
            window.__rmDelegated = rmDelegated;
            document.addEventListener('click', rmDelegated, true);
            onCleanup(function () {
                document.removeEventListener('click', rmDelegated, true);
                if (window.__rmDelegated === rmDelegated) window.__rmDelegated = null;
            });
            // Global fallback so the game can be started even if delegation is
            // somehow blocked by an exotic host wrapper (callable from console).
            window.__rmStart = function () { try { pressStart(); } catch (e) {} };

            // ================================================================
            // INVENTORY RAIL SELF-HEAL (host re-injection)
            // ----------------------------------------------------------------
            // EVERY button now runs through the ONE delegated `document` listener
            // above, so no button needs re-binding after the host re-injects the
            // theme DOM — delegation survives it for free (no MutationObserver, no
            // per-element listeners, no double-bind hazard).
            //
            // The ONLY thing that still breaks on re-injection is the top-right
            // INVENTORY RAIL (#rm-inv): it is populated by JS (buildInventory), so
            // when the host swaps in the empty source markup it goes blank. We heal
            // it the same cheap way the canvas is healed — a check driven from the
            // render loop() — instead of a broad subtree observer that fired on our
            // own DOM writes and rebuilt state at the wrong moments.
            function healInventory() {
                var fresh = document.getElementById('rm-inv');
                if (fresh && (fresh !== invHost || !fresh.children.length)) {
                    invHost = fresh;
                    buildInventory();      // re-applies unlocked/badge state
                    applyCheatInventory(); // re-apply the cheat override if cheat is on
                    updateViewBtn();
                    updateStageSelBtn();
                    syncSoundBtn();
                }
            }
            window.__rmHealInventory = healInventory;   // called from loop()

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
            // RSVP + WISHES are handled entirely by the HOST (ThemeWrapper):
            // it intercepts #btn-submit-kehadiran / #btn-submit-ucapan, calls the
            // backend, then hides the form + reveals the thank-you card (and, for
            // wishes, prepends the new item to the list) — no local handler needed.
            // (Older builds had a cosmetic local fallback here; removed so the host
            // is the single owner and we don't double-handle the same click.)

            // ============================================================
            // MUSIC — host-driven (plays the TENANT's chosen song).
            // ------------------------------------------------------------
            // The host app (ThemeWrapper/InvitationPage) is the single owner of
            // audio playback: it plays the tenant's link_backsound_music from its
            // own Audio object (YouTube supported too), flips play/pause when the
            // guest clicks #btn-toggle-music (a delegated handler on the theme
            // container), then dispatches native 'play'/'pause' events on our
            // #bg-music element. So here we ONLY mirror that state onto the button
            // icon — we must NOT call play()/pause() ourselves or attach our own
            // click toggle, or we'd play the wrong (baked-in) track and fight the
            // tenant's music. (Standalone preview with no host = no music, by
            // design: the song is tenant-provided, not part of the theme.)
            // ============================================================
            var bgMusic = document.getElementById('bg-music');
            var btnMusic = document.getElementById('btn-toggle-music');
            function updateMusicUI() {
                var pi = document.getElementById('play-icon'), pa = document.getElementById('pause-icon');
                if (!bgMusic || !pi || !pa) return;
                // The host dispatches a real 'play'/'pause' event on #bg-music,
                // which flips bgMusic.paused — mirror it onto the icon + button.
                if (bgMusic.paused) { pi.style.display = 'block'; pa.style.display = 'none'; if (btnMusic) btnMusic.classList.remove('music-playing'); }
                else { pi.style.display = 'none'; pa.style.display = 'block'; if (btnMusic) btnMusic.classList.add('music-playing'); }
            }
            // No-op hook kept for the in-game flow; the host owns playback and
            // starts the tenant's music itself when the button is toggled.
            function startBgMusic() {}
            if (bgMusic) {
                bgMusic.addEventListener('play', updateMusicUI);
                bgMusic.addEventListener('playing', updateMusicUI);
                bgMusic.addEventListener('pause', updateMusicUI);
            }

            // ============================================================
            // DESKTOP SIDEBAR — MARIO WEDDING SCENE (high-DPI pixel art).
            // ------------------------------------------------------------
            // The right-hand panel on desktop is redesigned into a full Mario-
            // flavoured wedding tableau: groom Mario (tux + bow tie + top hat) and
            // bride Princess Peach (white gown + veil + crown) standing together
            // under a flowered wedding arch on a classic overworld (sky, clouds,
            // hills, ground), with floating hearts, twinkling coins, ? blocks and
            // a "JUST MARRIED" banner. Everything is drawn with whole-pixel rects
            // at an integer art scale `U` so it stays crisp at any DPI.
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

                // STALE-CANVAS SELF-HEAL (same bug as the game canvas — see
                // reacquire() above). On the LIVE invitation the host re-injects the
                // theme HTML and REPLACES <canvas id="rm-side-canvas"> with a fresh
                // node, but our JS is NOT re-run — so sideLoop keeps painting the OLD,
                // now-detached canvas while the on-screen one stays blank and only the
                // CSS sky gradient shows through ("kok sidebar-nya langit doang").
                // Re-grab the live node + context + re-size when that happens.
                function sideReacquire() {
                    var live = ('isConnected' in sideCanvas) ? sideCanvas.isConnected
                             : document.documentElement.contains(sideCanvas);
                    if (live) return;                               // still attached → nothing to do
                    var c = document.getElementById('rm-side-canvas');
                    if (!c || c === sideCanvas) return;             // new DOM not ready yet
                    sideCanvas = c; sctx = sideCanvas.getContext('2d');
                    sideResize();                                   // fresh backing store + DPR transform
                }

                // pixel-rect helper (art units) — `U` is set per-frame from canvas size
                var sU = 4;
                function spx(ox, oy, x, y, w, h, col) {
                    sctx.fillStyle = col;
                    sctx.fillRect(Math.round(ox + x * sU), Math.round(oy + y * sU), Math.ceil((w || 1) * sU), Math.ceil((h || 1) * sU));
                }

                // ---- GROOM MARIO (tux + bow tie + top hat). ox,oy = top-left of a
                //      24×34 art-unit sprite box; feet at the box bottom. ----
                function drawGroom(ox, oy, bobY) {
                    oy += bobY;
                    var cx = 12;                         // sprite centre (art units)
                    var skin = '#ffce9e', skinDk = '#e3a06f', hair = '#3a1d0c';
                    var tux = '#161616', tuxHi = '#2c2c2c', shirt = '#ffffff', tie = '#e52521';
                    // top hat
                    spx(ox, oy, cx - 7, 0, 14, 2, '#0c0c0c');     // brim
                    spx(ox, oy, cx - 5, -5, 10, 5, '#161616');    // crown of hat
                    spx(ox, oy, cx - 5, -5, 10, 1, '#2c2c2c');    // hat sheen
                    spx(ox, oy, cx - 5, -2, 10, 1, '#e52521');    // red hat band
                    // head
                    spx(ox, oy, cx - 6, 2, 12, 8, skin);
                    spx(ox, oy, cx - 6, 9, 12, 1, skinDk);        // jaw shade
                    spx(ox, oy, cx - 7, 3, 2, 6, hair); spx(ox, oy, cx + 5, 3, 2, 6, hair); // sideburns
                    // eyes
                    spx(ox, oy, cx - 4, 4, 2, 2, '#fff'); spx(ox, oy, cx + 2, 4, 2, 2, '#fff');
                    spx(ox, oy, cx - 3, 4, 1, 2, '#2a4ba0'); spx(ox, oy, cx + 2, 4, 1, 2, '#2a4ba0');
                    // big nose + mustache
                    spx(ox, oy, cx - 2, 6, 4, 2, skin);
                    spx(ox, oy, cx - 5, 8, 10, 2, hair);
                    // tuxedo torso
                    spx(ox, oy, cx - 7, 11, 14, 12, tux);
                    spx(ox, oy, cx - 7, 11, 14, 1, tuxHi);
                    // white shirt front + bow tie + buttons
                    spx(ox, oy, cx - 2, 11, 4, 11, shirt);
                    spx(ox, oy, cx - 2, 11, 4, 2, tie);           // bow tie
                    spx(ox, oy, cx - 1, 11, 2, 1, '#a01818');
                    spx(ox, oy, cx, 15, 1, 1, '#161616'); spx(ox, oy, cx, 18, 1, 1, '#161616'); // shirt buttons
                    // lapels
                    spx(ox, oy, cx - 4, 13, 2, 5, tuxHi); spx(ox, oy, cx + 2, 13, 2, 5, tuxHi);
                    // arms (inner arm reaches toward the bride — drawn on the +x side)
                    spx(ox, oy, cx - 10, 13, 3, 8, tux);          // outer arm
                    spx(ox, oy, cx + 7, 14, 4, 6, tux);           // inner arm (toward bride)
                    spx(ox, oy, cx - 11, 20, 4, 3, '#fff');       // outer white glove
                    spx(ox, oy, cx + 10, 19, 4, 3, '#fff');       // inner glove (held hands)
                    // legs / dress shoes
                    spx(ox, oy, cx - 6, 23, 5, 9, tux); spx(ox, oy, cx + 1, 23, 5, 9, tux);
                    spx(ox, oy, cx - 7, 31, 7, 3, '#0a0a0a'); spx(ox, oy, cx + 1, 31, 7, 3, '#0a0a0a'); // shoes
                    spx(ox, oy, cx - 7, 31, 7, 1, '#333');
                }

                // ---- BRIDE PRINCESS (white gown + veil + crown). 24×34 box. ----
                function drawBride(ox, oy, bobY) {
                    oy += bobY;
                    var cx = 12;
                    var skin = '#ffd9b8', skinDk = '#e8b48f', hair = '#f4cf5a', hairHi = '#ffe79a';
                    var gown = '#ffffff', gownDk = '#d4d8e6', veil = 'rgba(255,255,255,0.55)';
                    // crown
                    spx(ox, oy, cx - 5, -1, 10, 2, '#ffd84a');
                    spx(ox, oy, cx - 5, -3, 2, 2, '#ffd84a'); spx(ox, oy, cx - 1, -4, 2, 3, '#ffd84a'); spx(ox, oy, cx + 3, -3, 2, 2, '#ffd84a');
                    spx(ox, oy, cx - 1, -3, 2, 2, '#ff5a55'); // ruby
                    // veil behind the head/shoulders
                    spx(ox, oy, cx - 9, 1, 18, 18, veil);
                    // hair framing the face
                    spx(ox, oy, cx - 7, 1, 14, 8, hair);
                    spx(ox, oy, cx - 8, 3, 2, 12, hair); spx(ox, oy, cx + 6, 3, 2, 12, hair);
                    spx(ox, oy, cx - 5, 1, 6, 2, hairHi);
                    // face
                    spx(ox, oy, cx - 5, 4, 10, 7, skin);
                    spx(ox, oy, cx - 5, 10, 10, 1, skinDk);
                    spx(ox, oy, cx - 3, 6, 2, 2, '#3a6ad6'); spx(ox, oy, cx + 1, 6, 2, 2, '#3a6ad6'); // eyes
                    spx(ox, oy, cx - 4, 8, 2, 1, '#ff9ec4'); spx(ox, oy, cx + 3, 8, 2, 1, '#ff9ec4'); // blush
                    spx(ox, oy, cx - 1, 9, 3, 1, '#e0508f');   // lips
                    // gloved arms (inner arm toward the groom on the -x side)
                    spx(ox, oy, cx - 9, 13, 4, 6, '#f3eede');  // outer arm
                    spx(ox, oy, cx + 6, 12, 3, 8, '#f3eede');  // inner arm
                    spx(ox, oy, cx - 12, 18, 4, 3, '#fff');    // inner glove (held hands, toward groom)
                    // bodice
                    spx(ox, oy, cx - 6, 11, 12, 6, gown);
                    spx(ox, oy, cx - 6, 11, 12, 1, gownDk);
                    spx(ox, oy, cx - 4, 11, 8, 1, '#ffd84a');  // gold neckline
                    // flared gown (trapezoid, widens to the floor)
                    for (var gy = 17; gy < 34; gy++) {
                        var t = (gy - 17) / 16;
                        var halfw = 4 + t * 8;
                        spx(ox, oy, cx - halfw, gy, halfw * 2, 1, gown);
                        spx(ox, oy, cx + halfw - 1.5, gy, 1.5, 1, gownDk);   // right shade
                    }
                    spx(ox, oy, cx - 12, 32, 24, 2, '#ffd84a'); // gold hem
                    // little bouquet in her hands
                    spx(ox, oy, cx - 13, 16, 4, 3, '#43b047');
                    spx(ox, oy, cx - 13, 14, 2, 2, '#ff5a8a'); spx(ox, oy, cx - 11, 15, 2, 2, '#ffd84a'); spx(ox, oy, cx - 14, 15, 2, 2, '#7aa8ff');
                }

                // ---- a floating heart ----
                function drawHeart(cxp, cyp, s, col) {
                    sctx.fillStyle = col;
                    sctx.fillRect(cxp - 3 * s, cyp - 2 * s, 2 * s, 3 * s);
                    sctx.fillRect(cxp + 1 * s, cyp - 2 * s, 2 * s, 3 * s);
                    sctx.fillRect(cxp - 2 * s, cyp + s, 4 * s, 1 * s);
                    sctx.fillRect(cxp - 1 * s, cyp + 2 * s, 2 * s, 1 * s);
                }

                function sideLoop() {
                    sideRaf = requestAnimationFrame(sideLoop);
                    sideReacquire();                               // heal a stale/detached canvas first
                    var w = sideCanvas.clientWidth, h = sideCanvas.clientHeight; if (!w) return;
                    sT += 1;

                    // sky gradient
                    var sky = sctx.createLinearGradient(0, 0, 0, h);
                    sky.addColorStop(0, '#5c94fc'); sky.addColorStop(0.55, '#9fd0ff'); sky.addColorStop(1, '#cde6ff');
                    sctx.fillStyle = sky; sctx.fillRect(0, 0, w, h);

                    // drifting clouds
                    sctx.fillStyle = 'rgba(255,255,255,0.92)';
                    for (var i = 0; i < 5; i++) {
                        var cx = (i * 230 - sT * 0.35) % (w + 220) - 110; var cy = 60 + (i % 3) * 64;
                        sctx.fillRect(cx, cy, 66, 16); sctx.fillRect(cx + 14, cy - 11, 34, 16); sctx.fillRect(cx + 40, cy - 5, 22, 12);
                    }

                    // rolling hills
                    sctx.fillStyle = '#3fa83a';
                    for (var hi = 0; hi < 4; hi++) {
                        var hx = (hi * 260 - sT * 0.12) % (w + 280) - 140;
                        sctx.beginPath(); sctx.arc(hx + 90, h - 70, 90, Math.PI, 0); sctx.closePath(); sctx.fill();
                    }

                    // ground band (overworld brown with grass cap)
                    var groundY = h - 70;
                    sctx.fillStyle = '#c84c0c'; sctx.fillRect(0, groundY, w, h - groundY);
                    sctx.fillStyle = '#e07b2a'; sctx.fillRect(0, groundY, w, 8);
                    sctx.fillStyle = '#5ab44a'; sctx.fillRect(0, groundY, w, 3);
                    sctx.fillStyle = '#8a3408';
                    for (var gx = 0; gx < w; gx += 28) { sctx.fillRect(gx + 6, groundY + 18, 8, 6); sctx.fillRect(gx + 20, groundY + 30, 8, 6); }

                    // ============================================================
                    // MARIO ENVIRONMENT (item 1: "perbanyak object & environment")
                    // A busy little overworld scene around the couple — bushes,
                    // pipes (one with a peeking goomba), a brick + ? block row, a
                    // coin arc, and a goal flag at the far right. Drawn in device px
                    // at scale eU so it reads as a real Mario stage, not just decor.
                    // ============================================================
                    var eU = clamp(Math.round(w / 130), 3, 6);   // env pixel unit

                    // --- pixel-brick ground texture across the whole band ---
                    sctx.fillStyle = 'rgba(0,0,0,0.10)';
                    for (var bx = 0; bx < w; bx += eU * 8) {
                        sctx.fillRect(bx, groundY + eU * 2, eU * 8 - 2, 1);
                        sctx.fillRect(bx + eU * 4, groundY + eU * 4, 1, eU * 2);
                        sctx.fillRect(bx, groundY + eU * 6, eU * 8 - 2, 1);
                    }

                    // --- bushes (rounded green clumps sitting on the grass) ---
                    function bush(bxc, scale) {
                        sctx.fillStyle = '#3fa83a';
                        var r = eU * 2.4 * scale;
                        sctx.beginPath();
                        sctx.arc(bxc - r, groundY, r, Math.PI, 0);
                        sctx.arc(bxc, groundY, r * 1.25, Math.PI, 0);
                        sctx.arc(bxc + r, groundY, r, Math.PI, 0);
                        sctx.closePath(); sctx.fill();
                        sctx.fillStyle = '#5ec85a';
                        sctx.fillRect(bxc - r * 1.8, groundY - 2, r * 3.6, 2);
                    }
                    bush(w * 0.10, 1.1); bush(w * 0.62, 0.9); bush(w * 0.88, 1.15);

                    // --- a green pipe with a goomba peeking out beside it ---
                    function pipe(px, ph) {
                        var pw = eU * 9, py0 = groundY - ph;
                        sctx.fillStyle = '#1f9e3a'; sctx.fillRect(px, py0, pw, ph);
                        sctx.fillStyle = '#3fd860'; sctx.fillRect(px + 2, py0, eU * 2, ph);     // left sheen
                        sctx.fillStyle = '#0d6b22'; sctx.fillRect(px + pw - eU * 1.5, py0, eU * 1.5, ph); // right shade
                        // lip (wider rim)
                        sctx.fillStyle = '#1f9e3a'; sctx.fillRect(px - eU, py0 - eU * 2.5, pw + eU * 2, eU * 2.5);
                        sctx.fillStyle = '#3fd860'; sctx.fillRect(px - eU + 2, py0 - eU * 2.5, eU * 2, eU * 2.5);
                        sctx.fillStyle = '#0d6b22'; sctx.fillRect(px + pw, py0 - eU * 2.5, eU - 2, eU * 2.5);
                    }
                    // walking goomba helper (little brown mushroom-foe)
                    function goomba(gx, gy, gs) {
                        var step = Math.floor(sT / 16) % 2;            // 2-frame waddle
                        sctx.fillStyle = '#8a4b1d'; sctx.fillRect(gx - gs * 4, gy - gs * 5, gs * 8, gs * 5);     // cap
                        sctx.fillStyle = '#b96a2a'; sctx.fillRect(gx - gs * 4, gy - gs * 5, gs * 8, gs * 1.4);
                        sctx.fillStyle = '#f2d2a0'; sctx.fillRect(gx - gs * 3, gy - gs * 2, gs * 6, gs * 2);     // face band
                        sctx.fillStyle = '#000';
                        sctx.fillRect(gx - gs * 2.4, gy - gs * 2, gs * 1.2, gs * 1.6);                          // eyes
                        sctx.fillRect(gx + gs * 1.2, gy - gs * 2, gs * 1.2, gs * 1.6);
                        sctx.fillStyle = '#3a1d0c';                                                             // feet (waddle)
                        sctx.fillRect(gx - gs * 3.6, gy, gs * 3, gs * 1.4 + (step ? gs : 0));
                        sctx.fillRect(gx + gs * 0.6, gy, gs * 3, gs * 1.4 + (step ? 0 : gs));
                    }
                    var pipeX = w * 0.13;
                    pipe(pipeX, eU * 12);
                    goomba(pipeX + eU * 16, groundY, eU * 0.9);
                    pipe(w * 0.70, eU * 9);
                    goomba(w * 0.45, groundY, eU * 0.9);

                    // --- floating brick + ? block row (left of the arch) ---
                    function qmark(qx, qy, qS2) {
                        var f2 = Math.floor(sT / 18) % 3;
                        sctx.fillStyle = f2 === 0 ? '#f4b400' : (f2 === 1 ? '#ffc21a' : '#ffce3a');
                        sctx.fillRect(qx, qy, qS2, qS2);
                        sctx.fillStyle = '#c87f00'; sctx.fillRect(qx, qy, qS2, eU); sctx.fillRect(qx, qy + qS2 - eU, qS2, eU);
                        sctx.fillStyle = '#7a4d00'; sctx.fillRect(qx, qy, eU, qS2); sctx.fillRect(qx + qS2 - eU, qy, eU, qS2);
                        sctx.fillStyle = '#000'; var mm = qS2 / 8;
                        sctx.fillRect(qx + 3 * mm, qy + 2 * mm, 3 * mm, mm); sctx.fillRect(qx + 5 * mm, qy + 3 * mm, mm, mm);
                        sctx.fillRect(qx + 4 * mm, qy + 4 * mm, mm, mm); sctx.fillRect(qx + 4 * mm, qy + 6 * mm, mm, mm);
                    }
                    function brick(bxp, byp, bS) {
                        sctx.fillStyle = '#c1521f'; sctx.fillRect(bxp, byp, bS, bS);
                        sctx.fillStyle = '#7a2f10';
                        sctx.fillRect(bxp, byp + bS / 2, bS, 1); sctx.fillRect(bxp + bS / 2, byp, 1, bS / 2);
                        sctx.fillRect(bxp, byp, bS, 1); sctx.fillRect(bxp + bS / 4, byp + bS / 2, 1, bS / 2); sctx.fillRect(bxp + 3 * bS / 4, byp + bS / 2, 1, bS / 2);
                    }
                    var rowS = eU * 7, rowY = groundY - eU * 24;
                    var rowX0 = w * 0.06;
                    brick(rowX0, rowY, rowS);
                    qmark(rowX0 + rowS, rowY, rowS);
                    brick(rowX0 + rowS * 2, rowY, rowS);
                    // a coin arc hopping over the block row
                    for (var ca = 0; ca < 5; ca++) {
                        var caX = rowX0 + rowS * 0.5 + ca * rowS * 0.7;
                        var caY = rowY - eU * 6 - Math.sin(ca / 4 * Math.PI) * eU * 8;
                        var caW = (2 + Math.abs(Math.sin(sT * 0.1 + ca)) * 2) * eU;
                        sctx.fillStyle = '#9a5e00'; sctx.fillRect(caX - caW / 2, caY, caW, eU * 3);
                        sctx.fillStyle = '#fde36a'; sctx.fillRect(caX - caW / 2 + 1, caY + 1, Math.max(1, caW - 2), eU * 3 - 2);
                    }

                    // --- goal flag at the far right (Mario level-end pole) ---
                    var flgX = w - eU * 10, flgTop = groundY - eU * 30;
                    sctx.fillStyle = '#cfe8cf'; sctx.fillRect(flgX, flgTop, 2, groundY - flgTop);   // pole
                    sctx.fillStyle = '#2f8a33'; sctx.fillRect(flgX - eU * 1.2, flgTop - eU * 1.2, eU * 2.4, eU * 2.4); // ball
                    var fw2 = Math.sin(sT * 0.12) * eU;                                              // gentle wave
                    sctx.fillStyle = '#43b047';
                    sctx.beginPath();
                    sctx.moveTo(flgX + 2, flgTop + eU * 2);
                    sctx.lineTo(flgX + 2 - eU * 8 + fw2, flgTop + eU * 4);
                    sctx.lineTo(flgX + 2, flgTop + eU * 6);
                    sctx.closePath(); sctx.fill();

                    // ============================================================
                    // WEDDING TABLEAU (shrunk per item 1) — the couple + arch now
                    // sit smaller and slightly right-of-centre so the Mario world
                    // around them reads as a real stage, not just a backdrop.
                    // ============================================================
                    // art scale: SMALLER than before (was 3-9) so the couple no
                    // longer dominates the panel.
                    sU = clamp(Math.round(Math.min(w, h * 0.9) / 120), 3, 6);
                    var coupleBob = Math.sin(sT * 0.05) * (sU * 0.6);

                    // wedding arch behind the couple (flowered trellis)
                    var archCx = w * 0.5, archTopY = groundY - sU * 44;
                    var archW = sU * 40, archH = sU * 40;
                    sctx.lineWidth = Math.max(4, sU * 1.4);
                    sctx.strokeStyle = '#43b047';
                    sctx.beginPath();
                    sctx.moveTo(archCx - archW / 2, groundY);
                    sctx.lineTo(archCx - archW / 2, archTopY + archH * 0.4);
                    sctx.quadraticCurveTo(archCx, archTopY - sU * 4, archCx + archW / 2, archTopY + archH * 0.4);
                    sctx.lineTo(archCx + archW / 2, groundY);
                    sctx.stroke();
                    // flowers dotted along the arch — placed on the SAME path the
                    // trellis was stroked along (two posts + a quadratic top), so the
                    // blooms hug the green arch instead of floating off it.
                    var fcols = ['#ff5a8a', '#ffd84a', '#ff9ec4', '#fff', '#7aa8ff'];
                    var archMidY = archTopY + archH * 0.4;          // where posts meet the curve
                    function flower(fx, fy, idx) {
                        sctx.fillStyle = fcols[idx % fcols.length];
                        sctx.fillRect(fx - sU, fy - sU, sU * 2, sU * 2);
                        sctx.fillStyle = '#ffe88a'; sctx.fillRect(fx - sU * 0.4, fy - sU * 0.4, sU * 0.8, sU * 0.8);
                    }
                    var fIdx = 0;
                    // left & right posts
                    for (var py = groundY; py > archMidY; py -= sU * 6) {
                        flower(archCx - archW / 2, py, fIdx++);
                        flower(archCx + archW / 2, py, fIdx++);
                    }
                    // quadratic top: B(t) = (1-t)^2 P0 + 2(1-t)t C + t^2 P2
                    var P0x = archCx - archW / 2, P2x = archCx + archW / 2;
                    var Py = archMidY, Cx = archCx, Cy = archTopY - sU * 4;
                    for (var ft = 0; ft <= 1.0001; ft += 1 / 9) {
                        var omt = 1 - ft;
                        var bx2 = omt * omt * P0x + 2 * omt * ft * Cx + ft * ft * P2x;
                        var by2 = omt * omt * Py + 2 * omt * ft * Cy + ft * ft * Py;
                        flower(bx2, by2, fIdx++);
                    }

                    // couple — groom on the left, bride on the right, hands meeting
                    var boxW = 24 * sU, boxH = 34 * sU;
                    var feetY = groundY + 2;
                    var groomX = archCx - boxW + sU * 3;
                    var brideX = archCx - sU * 3;
                    drawGroom(groomX, feetY - boxH, coupleBob);
                    drawBride(brideX, feetY - boxH, coupleBob);
                    // a big shared heart rising between them
                    var hpY = (feetY - boxH) - sU * 6 + Math.sin(sT * 0.08) * sU;
                    drawHeart(archCx, hpY, sU * 0.9, '#ff5a8a');
                    drawHeart(archCx, hpY, sU * 0.55, '#ff9ec4');

                    // floating hearts + sparkles rising around the couple
                    for (var hh = 0; hh < 7; hh++) {
                        var phase = (sT * 0.9 + hh * 60) % 240;
                        var hxp = archCx + Math.sin((sT * 0.03) + hh * 1.7) * (sU * 22) + (hh - 3) * sU * 5;
                        var hyp = groundY - sU * 4 - phase * (h / 320);
                        var hs = (hh % 2 ? 0.5 : 0.34) * sU;
                        sctx.globalAlpha = clamp(1 - phase / 240, 0, 1) * 0.9;
                        drawHeart(hxp, hyp, hs, hh % 3 ? '#ff7ab6' : '#ffd84a');
                        sctx.globalAlpha = 1;
                    }

                    // (The floating ? block + coin arc now live in the Mario-world
                    // layer to the left of the arch — see the environment section
                    // above — so we no longer flank the arch with duplicate blocks.)

                    // twinkling coins arcing above the arch
                    for (var cc = 0; cc < 5; cc++) {
                        var cxp2 = archCx + (cc - 2) * sU * 9;
                        var cyp2 = archTopY - sU * 2 + Math.sin(sT * 0.1 + cc) * sU;
                        var cw = (3 + Math.abs(Math.sin(sT * 0.08 + cc)) * 4) * sU * 0.5;
                        sctx.fillStyle = '#9a5e00'; sctx.fillRect(cxp2 - cw / 2, cyp2, cw, sU * 3);
                        sctx.fillStyle = '#fde36a'; sctx.fillRect(cxp2 - cw / 2 + 1, cyp2 + 1, Math.max(1, cw - 2), sU * 3 - 2);
                        sctx.fillStyle = 'rgba(255,255,255,0.8)'; sctx.fillRect(cxp2 - 1, cyp2 + sU, 1, sU);
                    }

                    // JUST MARRIED pixel banner across the top of the arch
                    var banW = boxW * 1.7, banX = archCx - banW / 2, banY = archTopY - sU * 8;
                    sctx.fillStyle = '#e52521'; sctx.fillRect(banX, banY, banW, sU * 6);
                    sctx.fillStyle = '#a01818'; sctx.fillRect(banX, banY + sU * 5, banW, sU);
                    sctx.fillStyle = '#ffd84a'; sctx.fillRect(banX, banY, banW, sU * 0.7);
                    // banner ribbon tails
                    sctx.fillStyle = '#e52521';
                    sctx.beginPath(); sctx.moveTo(banX, banY); sctx.lineTo(banX - sU * 4, banY - sU * 3); sctx.lineTo(banX - sU * 4, banY + sU * 6); sctx.closePath(); sctx.fill();
                    sctx.beginPath(); sctx.moveTo(banX + banW, banY); sctx.lineTo(banX + banW + sU * 4, banY - sU * 3); sctx.lineTo(banX + banW + sU * 4, banY + sU * 6); sctx.closePath(); sctx.fill();
                    sctx.fillStyle = '#fff';
                    sctx.font = 'bold ' + Math.round(sU * 3) + "px 'Press Start 2P', monospace";
                    sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
                    sctx.fillText('JUST MARRIED', archCx, banY + sU * 3);
                    sctx.textAlign = 'left'; sctx.textBaseline = 'alphabetic';
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

            // Stamp the theme/game version into the bottom-center badge.
            try { var verEl = document.getElementById('rm-version'); if (verEl) verEl.textContent = RM_VERSION; } catch (e) {}

            // Restore any previously-unlocked inventory (so revisits keep progress)
            buildInventory();
            updateViewBtn();

            // The host auto-starts the tenant's music when its own "Buka Undangan"
            // cover is dismissed — but RetroMario opens onto the GAME (title/cover
            // + gameplay), which must be silent. Pause it on boot so music waits
            // for the invitation page. Deferred a tick so the host has finished
            // wiring its play state before we read/flip it.
            setTimeout(function () { try { pauseHostMusic(); } catch (e) {} }, 0);
        }

        // Run now if DOM ready (script is injected after DOMContentLoaded in-app).
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
        else start();
    })();
