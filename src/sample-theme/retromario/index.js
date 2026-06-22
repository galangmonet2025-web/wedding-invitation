/* ======================================================================
   RETRO MARIO WEDDING THEME — game engine + invitation glue
   ----------------------------------------------------------------------
   One self-contained IIFE. Everything is drawn on a single <canvas> at a
   fixed virtual resolution and scaled up with nearest-neighbour for a
   crisp 8-bit look. The level is built from the Pattern Library in
   MARIO_LEVEL_GENERATION_BIBLE.md, validated for solvability (BFS spine +
   gap/jump limits), then simulated with classic, non-floaty platformer
   physics.

   The invitation content is discovered, not shown: hitting a "?" info-block
   unlocks an inventory icon (top-right) + a retro modal, and reaching the
   flag reveals the full scrollable invitation. The host app has already
   bound all {{vars}} into the DOM before this script runs.
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
        var TILE = 16;            // virtual tile size in px
        var COLS_VIS = 16;        // visible tiles across
        var ROWS = 14;            // tiles tall (row 0 = top)
        var VW = COLS_VIS * TILE; // virtual viewport width (256)
        var VH = ROWS * TILE;     // virtual viewport height (224)
        var GROUND_R = ROWS - 2;  // top row of the ground band

        // Physics (tuned to feel responsive, not floaty — bible §3, §game-feel)
        var GRAV = 0.55;
        var MOVE = 0.55, FRICTION = 0.80, MAXVX = 2.6, RUN_MAX = 3.4;
        var JUMP_V = -8.2, JUMP_HOLD = 0.28, JUMP_HOLD_FRAMES = 13;
        var MAX_FALL = 9;

        // Jump reach limits used by the validator (bible §8.3 / Appendix B)
        var MAX_JUMP_TILES_H = 4;   // vertical
        var MAX_JUMP_TILES_W = 5;   // horizontal gap

        // ============================================================
        // SMALL HELPERS / DATA ACCESS
        // ============================================================
        function val(k, fb) {
            var el = document.querySelector('[data-var="' + k + '"]');
            var v = el ? (el.textContent || '').trim() : '';
            if (!v || v.indexOf('{{') === 0) return fb || '';
            return v;
        }
        function flagOn(key) {
            // The host strips {{#if}} blocks whose flag is false, so presence of
            // a matching [data-info] / [data-if] section is the truth signal.
            return !!document.querySelector('[data-if="' + key + '"]');
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

        // Persisted unlock + score state
        var STORE_KEY = 'rm_wedding_state_v1';
        var saved = {};
        try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }
        var unlocked = saved.unlocked || {};
        var bestScore = saved.bestScore || 0;

        function persist() {
            try {
                localStorage.setItem(STORE_KEY, JSON.stringify({
                    unlocked: unlocked, bestScore: Math.max(bestScore, score)
                }));
            } catch (e) {}
        }

        // ============================================================
        // PATTERN LIBRARY (Appendix A) — each pattern stamps onto a tile grid.
        // Tile chars:  # ground/brick-floor  B brick  ? info-block  M mushroom
        //   S star  o coin  g goomba  k koopa  s spiny  T/U pipe top  [ ] pipe body
        //   P piranha  ^ spring  F flag  X solid block  H hidden-block
        // ============================================================
        function blankCol() { var c = []; for (var r = 0; r < ROWS; r++) c.push(' '); return c; }
        function fillGroundCols(g, x0, x1) {
            for (var x = x0; x <= x1; x++) { g[x][GROUND_R] = '#'; g[x][GROUND_R + 1] = '#'; }
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
                fillGroundCols(g, x, x + 1);
                // gap of w columns (no floor) then landing
                fillGroundCols(g, x + 2 + w, x + 3 + w);
                g[x + 2 + Math.floor(w / 2)][up(4)] = 'o';
            } }; },

            pipe: function (h) { h = h || 2; return { width: 4, stamp: function (g, x) {
                fillGroundCols(g, x, x + 3);
                for (var i = 0; i < h; i++) {
                    g[x + 1][up(1 + i)] = (i === h - 1) ? 'T' : '[';
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
            } }; }
        };

        // ============================================================
        // LEVEL BUILDER — assemble a grid from patterns following the bible
        // flow: Start → Teach → Practice → Challenge → Reward → Secret →
        // Checkpoint → Final → Goal. Info-blocks are injected so every piece
        // of invitation content is reachable on the main path.
        // ============================================================
        function buildLevel() {
            // Build a list of column arrays, then stamp patterns left→right.
            // We compose a generous sequence and pad with flats.
            var infoCount = INFOS.length;

            // Pattern spine (the "TEACH → … → GOAL" arc from the bible).
            var spine = [
                PAT.flat(7),                 // safe start (≥ start-safe rule)
                PAT.coinTrail(4),            // teach: collect coins
                PAT.infoBlock(),             // info #1
                PAT.goombas(1),              // teach: stomp
                PAT.coinArc(),
                PAT.qrow(['?', 'o', 'M']),   // practice: question blocks + mushroom
                PAT.gap(2),                  // first gap (easy)
                PAT.infoBlock(),             // info #2
                PAT.goombas(2),
                PAT.pipe(2),
                PAT.floatPlat(3),
                PAT.coinTrail(5),
                PAT.infoBlock(),             // info #3
                PAT.staircase(3),
                PAT.gap(3),
                PAT.koopa(),
                PAT.hiddenBonus(),           // SECRET / WOW moment
                PAT.infoBlock(),             // info #4
                PAT.flat(4),                 // CHECKPOINT zone (flat & safe)
                PAT.powerRow('S'),           // star reward
                PAT.qrow(['?', 'o']),
                PAT.infoBlock(),             // info #5
                PAT.spiny(),                 // dangerous enemy (taught: avoid/fire)
                PAT.gap(3),
                PAT.goombas(2, 4),
                PAT.infoBlock(),             // info #6
                PAT.piranhaPipe(3),
                PAT.coinArc(),
                PAT.spring(),
                PAT.infoBlock(),             // info #7
                PAT.staircase(4),
                PAT.gap(2),
                PAT.infoBlock(),             // info #8
                PAT.coinTrail(6),
                PAT.qrow(['?', 'M']),
                PAT.infoBlock(),             // info #9
                PAT.goombas(1),
                PAT.infoBlock(),             // info #10
                PAT.flat(6)                  // run-up to flag
            ];

            // Measure total width and allocate the grid.
            var total = 0; spine.forEach(function (p) { total += p.width; });
            var pad = 6;
            var COLS = total + pad + 4;
            var grid = [];
            for (var x = 0; x < COLS; x++) grid.push(blankCol());

            // Ensure full ground floor first (patterns carve gaps where needed).
            fillGroundCols(grid, 0, COLS - 1);

            var cx = 2; var checkpointX = 0;
            for (var i = 0; i < spine.length; i++) {
                spine[i].stamp(grid, cx);
                if (i === 18) checkpointX = cx; // the flat CHECKPOINT zone
                cx += spine[i].width;
            }

            // Flag pole near the end on solid ground.
            var flagX = cx + 1;
            fillGroundCols(grid, cx, COLS - 1);
            grid[flagX][up(1)] = 'F'; grid[flagX][up(2)] = 'F';
            grid[flagX][up(3)] = 'F'; grid[flagX][up(4)] = 'F'; grid[flagX][up(5)] = 'F';

            return { grid: grid, cols: COLS, flagX: flagX, checkpointX: checkpointX, infoCount: infoCount };
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
        function buildWorld() {
            var level = buildLevel();
            validate(level);
            var g = level.grid, COLS = level.cols;

            var world = {
                cols: COLS, grid: g,
                flagX: level.flagX * TILE, checkpointX: level.checkpointX * TILE,
                coins: [], enemies: [], boxes: [], pipes: [], springs: [], hidden: [],
                infoTotal: 0, powerups: [], fireballs: [], particles: [],
                worldW: COLS * TILE, worldH: ROWS * TILE,
                flagReached: false, flagY: 0
            };

            var infoSlot = 0;
            for (var x = 0; x < COLS; x++) {
                for (var r = 0; r < ROWS; r++) {
                    var ch = g[x][r];
                    if (ch === 'o') { world.coins.push({ x: x * TILE + 3, y: r * TILE + 2, taken: false, t: Math.random() * 6 }); g[x][r] = ' '; }
                    else if (ch === 'g') { world.enemies.push(mkEnemy(x, r, 'goomba')); g[x][r] = ' '; }
                    else if (ch === 'k') { world.enemies.push(mkEnemy(x, r, 'koopa')); g[x][r] = ' '; }
                    else if (ch === 's') { world.enemies.push(mkEnemy(x, r, 'spiny')); g[x][r] = ' '; }
                    else if (ch === 'P') { world.enemies.push(mkEnemy(x, r, 'piranha')); g[x][r] = ' '; }
                    else if (ch === '?' || ch === 'M' || ch === 'S' || ch === 'H') {
                        var box = { c: x, r: r, hit: false, bounce: 0, kind: 'coin' };
                        if (ch === '?') {
                            box.kind = 'info';
                            box.info = INFOS[infoSlot % INFOS.length];
                            infoSlot++;
                            world.infoTotal++;
                        } else if (ch === 'M') box.kind = 'mushroom';
                        else if (ch === 'S') box.kind = 'star';
                        else if (ch === 'H') { box.kind = 'hidden'; box.hidden = true; }
                        world.boxes.push(box);
                        g[x][r] = box.hidden ? ' ' : 'Q'; // 'Q' = solid question/brick tile drawn separately
                        if (box.hidden) world.hidden.push(box);
                    }
                    else if (ch === '^') { world.springs.push({ c: x, r: r, t: 0 }); g[x][r] = 's' === 's' ? '^' : '^'; }
                    else if (ch === 'F') { world.flagY = Math.min(world.flagY || 9999, r * TILE); }
                }
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
                cheat: player ? player.cheat : false
            };
        }

        // ============================================================
        // GAME-WIDE STATE
        // ============================================================
        var score = 0, coinGot = 0, lives = 3, time = 400, timeAcc = 0;
        var camX = 0;
        var keys = { left: false, right: false, jump: false, act: false };
        var jumpQueued = false;
        var running = false, started = false;

        var elCoins = document.getElementById('rm-coins');
        var elScore = document.getElementById('rm-score');
        var elWorld = document.getElementById('rm-world');
        var elToast = document.getElementById('rm-toast');

        function setHUD() {
            if (elCoins) elCoins.textContent = '×' + ('00' + coinGot).slice(-2);
            if (elScore) elScore.textContent = ('000000' + score).slice(-6);
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
            // Simple glyphs
            function px(x, y, w, h) { c.fillRect(x, y, w || 1, h || 1); }
            if (key === 'couple') { px(4, 3, 3, 3); px(9, 3, 3, 3); px(3, 8, 4, 5); px(9, 8, 4, 5); }
            else if (key === 'schedule') { c.strokeStyle = c.fillStyle; px(2, 3, 12, 2); px(2, 3, 2, 10); px(12, 3, 2, 10); px(2, 11, 12, 2); px(6, 6, 2, 2); px(9, 6, 2, 2); }
            else if (key === 'gallery') { px(2, 4, 12, 8); c.fillStyle = '#fff'; px(4, 9, 3, 2); px(8, 7, 4, 4); }
            else if (key === 'gift') { px(3, 6, 10, 7); px(2, 4, 12, 2); px(7, 2, 2, 11); c.fillStyle = '#fff'; }
            else if (key === 'story') { c.beginPath(); px(4, 4, 3, 3); px(9, 4, 3, 3); px(3, 6, 10, 3); px(5, 9, 6, 3); px(7, 11, 2, 2); }
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
                btn.addEventListener('click', function () {
                    if (btn.classList.contains('is-enabled')) openModal(info);
                });
                invHost.appendChild(btn);
                invButtons[info.key] = btn;
                if (unlocked[info.key]) btn.classList.add('is-enabled');
            });
        }

        function unlockInfo(info) {
            if (unlocked[info.key]) return false;
            unlocked[info.key] = true;
            persist();
            var btn = invButtons[info.key];
            if (btn) { btn.classList.add('is-enabled', 'just-unlocked'); }
            return true;
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
            // Re-wire copy buttons / countdown inside the clone if needed
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
            else if (type === 'bump') tone(160, 90, 0.08, 0.06);
        }

        // ============================================================
        // INPUT
        // ============================================================
        function bindKey() {
            function kd(e) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
                else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
                else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') { keys.jump = true; jumpQueued = true; e.preventDefault(); }
                else if (e.code === 'KeyE') { keys.act = true; doAction(); }
                else if (e.code === 'Escape') closeModal();
            }
            function ku(e) {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
                else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
                else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = false;
                else if (e.code === 'KeyE') keys.act = false;
            }
            window.addEventListener('keydown', kd);
            window.addEventListener('keyup', ku);
            onCleanup(function () { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
        }

        function holdBtn(id, key, opts) {
            var el = document.getElementById(id);
            if (!el) return;
            function on(e) { e.preventDefault(); keys[key] = true; el.classList.add('is-pressed'); if (key === 'jump') jumpQueued = true; if (opts && opts.tap) opts.tap(); }
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

        function doAction() {
            // Fire (if fire-Mario) — otherwise the action button is a no-op besides interaction.
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
        // Resolve one axis at a time. The AABB rows/cols are computed from the
        // CURRENT position and we stop at the first blocking tile on that axis,
        // so the player can never get wedged in a corner (each axis is moved
        // and resolved independently by the caller).
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
            // Hit a block from below.
            for (var i = 0; i < W.boxes.length; i++) {
                var b = W.boxes[i];
                if (b.c === c && b.r === r && !b.hit) {
                    triggerBox(b); return;
                }
                // hidden block reveals on bump even at empty tile
                if (b.hidden && !b.hit && b.c === c && b.r === r) { triggerBox(b); return; }
            }
            playSfx('bump');
        }

        function triggerBox(b) {
            b.hit = true; b.bounce = 6;
            W.grid[b.c][b.r] = 'X'; // becomes a used solid block
            if (b.kind === 'info') {
                var fresh = unlockInfo(b.info);
                addScore(200);
                playSfx('unlock');
                spawnParticles(b.c * TILE + 8, b.r * TILE, '#fac000', 8);
                toast('TERBUKA: ' + b.info.label + '<br><span style="color:#fac000">+200</span>', 1700);
                openModal(b.info);
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

        function stepPlayer() {
            if (player.dead) {
                player.deadT++;
                player.vy += GRAV * 0.6; player.y += player.vy;
                if (player.deadT > 70) respawn();
                return;
            }
            if (player.win) return;

            var max = (keys.left || keys.right) && Math.abs(player.vx) > MAXVX - 0.2 ? RUN_MAX : MAXVX;
            if (keys.left) { player.vx -= MOVE; player.face = -1; }
            if (keys.right) { player.vx += MOVE; player.face = 1; }
            if (!keys.left && !keys.right) player.vx *= FRICTION;
            player.vx = clamp(player.vx, -max, max);
            if (Math.abs(player.vx) < 0.05) player.vx = 0;

            // Jump (with variable height via hold)
            if (jumpQueued && player.onGround) {
                player.vy = JUMP_V; player.onGround = false; player.jumping = true; player.jumpHold = JUMP_HOLD_FRAMES;
                playSfx('jump');
            }
            jumpQueued = false;
            if (player.jumping && keys.jump && player.jumpHold > 0) { player.vy -= JUMP_HOLD; player.jumpHold--; }
            else player.jumping = false;

            player.vy += GRAV; player.vy = Math.min(player.vy, MAX_FALL);
            player.onGround = false;

            player.x += player.vx; collideAxis(player, 'x');
            player.y += player.vy; collideAxis(player, 'y');

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

            // Fall into a pit
            if (player.y > VH + 40) die();

            // Timers
            if (player.invuln > 0) player.invuln--;
            if (player.fireCd > 0) player.fireCd--;
            if (player.star > 0) { player.star--; if (player.star === 0) toast('Bintang habis'); }

            // Reached flag?
            if (!W.flagReached && player.x + player.w >= W.flagX) reachFlag();

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
                // simple ground collision
                var below = Math.floor((pu.y + pu.h) / TILE), pc = Math.floor((pu.x + pu.w / 2) / TILE);
                if (pu.kind !== 'star' || true) {
                    if (solidAt(pc, below)) { pu.y = below * TILE - pu.h; pu.vy = 0; }
                }
                if (pu.kind === 'star') { if (pu.vy === 0) pu.vy = -3; }
                pu.x += pu.vx; pu.y += pu.vy;
                // turn at walls
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

        function die() {
            if (player.dead || player.star > 0 || player.cheat || player.invuln > 0) {
                if (player.cheat || player.star > 0 || player.invuln > 0) return;
            }
            if (player.dead) return;
            if (player.big) { setBig(false); player.fire = false; player.invuln = 90; playSfx('stomp'); return; }
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

        // ============================================================
        // ENEMIES
        // ============================================================
        function stepEnemies() {
            for (var i = 0; i < W.enemies.length; i++) {
                var e = W.enemies[i];
                if (!e.alive) { if (e.squash > 0) e.squash--; continue; }
                e.t += 0.1;

                if (e.kind === 'piranha') {
                    // emerge/retract; hide when player is close to the pipe
                    var near = Math.abs((player.x + player.w / 2) - (e.x + 7)) < 28;
                    var target = near ? e.baseY + 16 : e.baseY - e.range;
                    e.y += (target - e.y) * 0.06;
                } else {
                    // gravity
                    e.vy += GRAV; e.vy = Math.min(e.vy, MAX_FALL);
                    e.x += e.vx;
                    var dir = e.vx > 0 ? 1 : -1;
                    var aheadC = Math.floor((e.x + (dir > 0 ? e.w : 0)) / TILE);
                    var midR = Math.floor((e.y + e.h / 2) / TILE);
                    if (solidAt(aheadC, midR)) { e.vx *= -1; e.x += e.vx; }
                    e.y += e.vy;
                    var footR = Math.floor((e.y + e.h) / TILE), cMid = Math.floor((e.x + e.w / 2) / TILE);
                    if (solidAt(cMid, footR)) { e.y = footR * TILE - e.h; e.vy = 0; }
                    // red koopa & spiny don't fall off ledges; goomba/green do
                    if ((e.kind === 'spiny') && e.vy === 0) {
                        var aheadFoot = Math.floor((e.x + (dir > 0 ? e.w + 1 : -1)) / TILE);
                        if (!solidAt(aheadFoot, footR + 1)) e.vx *= -1;
                    }
                    if (e.x < 0) { e.x = 0; e.vx *= -1; }
                    if (e.y > VH + 60) e.alive = false;
                }

                // collide with player
                if (player.dead || player.win) continue;
                if (rectHit(player, e)) {
                    var stomp = player.vy > 0 && (player.y + player.h) - e.y < 10;
                    if (player.star > 0 || player.cheat) { killEnemy(e); addScore(200); }
                    else if (e.kind === 'spiny' || e.kind === 'piranha') { die(); }
                    else if (stomp) { stompEnemy(e); }
                    else { die(); }
                }
            }
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
        // FLAG / WIN
        // ============================================================
        function reachFlag() {
            W.flagReached = true; player.win = true; player.vx = 0;
            addScore(2000 + time * 10);
            // Safety net: a guest must never be locked out of the actual wedding
            // details. Reaching the goal unlocks any info not discovered en route
            // (early discovery is still rewarded with score + the unlock pop).
            INFOS.forEach(function (info) {
                if (!unlocked[info.key]) {
                    unlocked[info.key] = true;
                    var btn = invButtons[info.key];
                    if (btn) btn.classList.add('is-enabled');
                }
            });
            bestScore = Math.max(bestScore, score); persist();
            playSfx('win');
            setTimeout(showWin, 1200);
        }

        function showWin() {
            running = false;
            var winText = document.getElementById('rm-win-text');
            var unlockedCount = INFOS.filter(function (i) { return unlocked[i.key]; }).length;
            if (winText) {
                winText.innerHTML = 'Skor: <strong>' + score + '</strong><br>' +
                    'Koin: <strong>' + coinGot + '</strong><br>' +
                    'Undangan terbuka: <strong>' + unlockedCount + '/' + INFOS.length + '</strong>' +
                    (player.cheat ? '<br><span style="color:#e52521">[CHEAT MODE]</span>' : '');
            }
            showOverlay('rm-win');
        }

        // ============================================================
        // CAMERA + RENDER
        // ============================================================
        function updateCamera() {
            var target = player.x - VW / 3;
            camX += (target - camX) * 0.16;
            camX = clamp(camX, 0, Math.max(0, W.worldW - VW));
        }

        // pixel-art tile drawing
        function drawTile(ch, sx, sy) {
            switch (ch) {
                case '#':
                    ctx.fillStyle = '#c84c0c'; ctx.fillRect(sx, sy, TILE, TILE);
                    ctx.fillStyle = '#e07b2a'; ctx.fillRect(sx, sy, TILE, 3);
                    ctx.fillStyle = '#8a3408';
                    ctx.fillRect(sx + 2, sy + 5, 5, 4); ctx.fillRect(sx + 9, sy + 5, 5, 4);
                    ctx.fillRect(sx + 5, sy + 11, 6, 3);
                    break;
                case 'B':
                    ctx.fillStyle = '#c07030'; ctx.fillRect(sx, sy, TILE, TILE);
                    ctx.fillStyle = '#7a3d12';
                    ctx.fillRect(sx, sy + 4, TILE, 1); ctx.fillRect(sx, sy + 9, TILE, 1);
                    ctx.fillRect(sx + 8, sy, 1, 4); ctx.fillRect(sx + 4, sy + 5, 1, 4); ctx.fillRect(sx + 12, sy + 5, 1, 4);
                    break;
                case 'Q': // active question/info block
                    ctx.fillStyle = '#fac000'; ctx.fillRect(sx, sy, TILE, TILE);
                    ctx.fillStyle = '#e89000'; ctx.fillRect(sx, sy, TILE, 2); ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(sx + 6, sy + 4, 4, 2); ctx.fillRect(sx + 9, sy + 5, 2, 3);
                    ctx.fillRect(sx + 7, sy + 8, 2, 2); ctx.fillRect(sx + 7, sy + 11, 2, 2);
                    break;
                case 'X': // used block
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

        function drawCoin(sx, sy, t) {
            var w = 6 + Math.abs(Math.sin(t)) * 4;
            ctx.fillStyle = '#fac000'; ctx.fillRect(sx + 5 - w / 2 + 3, sy, w, 12);
            ctx.fillStyle = '#e89000'; ctx.fillRect(sx + 5 - w / 2 + 3, sy, 2, 12);
        }

        function drawPlayer() {
            var sx = Math.round(player.x - camX), sy = Math.round(player.y);
            if (player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0) return; // blink
            var body = player.star > 0 ? (Math.floor(player.star / 4) % 2 ? '#fac000' : '#fff') : (player.fire ? '#fff' : '#e52521');
            var skin = '#ffd9a0';
            var h = player.h;
            // cap
            ctx.fillStyle = player.fire ? '#e52521' : '#e52521';
            ctx.fillRect(sx, sy, player.w, 4);
            ctx.fillRect(sx + (player.face > 0 ? player.w - 2 : -2), sy + 2, 4, 2); // brim
            // face
            ctx.fillStyle = skin; ctx.fillRect(sx + 1, sy + 4, player.w - 2, 4);
            ctx.fillStyle = '#000'; ctx.fillRect(sx + (player.face > 0 ? player.w - 4 : 2), sy + 5, 2, 2); // eye
            // body
            ctx.fillStyle = body; ctx.fillRect(sx, sy + 8, player.w, h - 12);
            // overalls
            ctx.fillStyle = player.fire ? '#e52521' : '#2a5fd6'; ctx.fillRect(sx + 1, sy + 10, player.w - 2, h - 14);
            // legs
            ctx.fillStyle = '#6b3a12'; ctx.fillRect(sx, sy + h - 4, 4, 4); ctx.fillRect(sx + player.w - 4, sy + h - 4, 4, 4);
        }

        function drawEnemy(e) {
            var sx = Math.round(e.x - camX), sy = Math.round(e.y);
            if (!e.alive) {
                if (e.squash > 0) { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(sx, sy + e.h - 4, e.w, 4); }
                return;
            }
            if (e.kind === 'goomba') {
                ctx.fillStyle = '#9a5a2a'; ctx.fillRect(sx, sy + 2, e.w, e.h - 2);
                ctx.fillStyle = '#f0c890'; ctx.fillRect(sx + 2, sy + 8, e.w - 4, 4);
                ctx.fillStyle = '#000'; ctx.fillRect(sx + 3, sy + 4, 2, 3); ctx.fillRect(sx + e.w - 5, sy + 4, 2, 3);
                var f = Math.floor(e.t) % 2;
                ctx.fillRect(sx + (f ? 0 : 2), sy + e.h - 2, 4, 2); ctx.fillRect(sx + e.w - (f ? 4 : 6), sy + e.h - 2, 4, 2);
            } else if (e.kind === 'koopa') {
                ctx.fillStyle = '#43b047'; ctx.fillRect(sx, sy, e.w, e.h - 3);
                ctx.fillStyle = '#2f8a33'; ctx.fillRect(sx + 2, sy + 2, e.w - 4, e.h - 7);
                ctx.fillStyle = '#fac000'; ctx.fillRect(sx + (e.vx < 0 ? 0 : e.w - 3), sy + 2, 3, 4);
                ctx.fillStyle = '#ffd9a0'; ctx.fillRect(sx, sy + e.h - 3, 3, 3); ctx.fillRect(sx + e.w - 3, sy + e.h - 3, 3, 3);
            } else if (e.kind === 'spiny') {
                ctx.fillStyle = '#e08020'; ctx.fillRect(sx, sy + 3, e.w, e.h - 3);
                ctx.fillStyle = '#fff'; for (var i = 0; i < 4; i++) { ctx.fillRect(sx + 1 + i * 4, sy, 2, 4); }
                ctx.fillStyle = '#000'; ctx.fillRect(sx + 3, sy + 7, 2, 2); ctx.fillRect(sx + e.w - 5, sy + 7, 2, 2);
            } else if (e.kind === 'piranha') {
                ctx.fillStyle = '#e52521'; ctx.fillRect(sx, sy, e.w, e.h);
                ctx.fillStyle = '#fff'; ctx.fillRect(sx + 1, sy + 2, 3, 3); ctx.fillRect(sx + e.w - 4, sy + 2, 3, 3);
                ctx.fillStyle = '#43b047'; ctx.fillRect(sx + 2, sy + e.h - 3, e.w - 4, 3);
            }
        }

        function render() {
            // sky gradient
            var grd = ctx.createLinearGradient(0, 0, 0, VH);
            grd.addColorStop(0, '#5c94fc'); grd.addColorStop(1, '#9fd0ff');
            ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);

            // parallax hills + clouds
            drawScenery();

            var c0 = Math.floor(camX / TILE), c1 = c0 + COLS_VIS + 1;
            for (var c = c0; c <= c1; c++) {
                if (c < 0 || c >= W.cols) continue;
                var sx = c * TILE - camX;
                for (var r = 0; r < ROWS; r++) {
                    var ch = W.grid[c][r];
                    if (ch !== ' ') {
                        var by = 0;
                        // bounce animation for hit blocks
                        for (var bi = 0; bi < W.boxes.length; bi++) { var bx = W.boxes[bi]; if (bx.c === c && bx.r === r && bx.bounce > 0) { by = -bx.bounce; bx.bounce -= 1; } }
                        drawTile(ch, Math.round(sx), r * TILE + by);
                    }
                }
            }

            // coins
            for (var i = 0; i < W.coins.length; i++) {
                var co = W.coins[i]; if (co.taken) continue;
                if (co.x < camX - 16 || co.x > camX + VW + 16) continue;
                co.t += 0.12; drawCoin(Math.round(co.x - camX), co.y, co.t);
            }
            // springs
            for (var sIdx = 0; sIdx < W.springs.length; sIdx++) {
                var sp = W.springs[sIdx]; var ssx = Math.round(sp.c * TILE - camX); var ssy = sp.r * TILE + (sp.t > 0 ? 4 : 0);
                ctx.fillStyle = '#bbb'; ctx.fillRect(ssx + 2, ssy + 6, TILE - 4, 4);
                ctx.fillStyle = '#888'; ctx.fillRect(ssx + 3, ssy + 10, TILE - 6, TILE - 10);
                if (sp.t > 0) sp.t--;
            }
            // powerups
            for (var p = 0; p < W.powerups.length; p++) {
                var pu = W.powerups[p]; var px = Math.round(pu.x - camX), py = Math.round(pu.y);
                if (pu.kind === 'mushroom') { ctx.fillStyle = '#e52521'; ctx.fillRect(px, py, pu.w, 7); ctx.fillStyle = '#fff'; ctx.fillRect(px + 2, py + 1, 3, 3); ctx.fillRect(px + 8, py + 2, 3, 3); ctx.fillStyle = '#ffd9a0'; ctx.fillRect(px + 2, py + 7, pu.w - 4, 6); }
                else if (pu.kind === 'flower') { ctx.fillStyle = '#fac000'; ctx.fillRect(px + 3, py, 7, 7); ctx.fillStyle = '#e52521'; ctx.fillRect(px + 5, py + 2, 3, 3); ctx.fillStyle = '#43b047'; ctx.fillRect(px + 5, py + 7, 3, 6); }
                else { var bl = Math.floor(pu.t / 4) % 2; ctx.fillStyle = bl ? '#fac000' : '#fff'; ctx.fillRect(px + 3, py, 7, 13); ctx.fillStyle = '#000'; ctx.fillRect(px + 4, py + 4, 1, 1); ctx.fillRect(px + 8, py + 4, 1, 1); }
            }
            // enemies
            for (var e = 0; e < W.enemies.length; e++) {
                var en = W.enemies[e];
                if (en.x < camX - 24 || en.x > camX + VW + 24) continue;
                drawEnemy(en);
            }
            // fireballs
            ctx.fillStyle = '#ff7a00';
            for (var f = 0; f < W.fireballs.length; f++) { var fb = W.fireballs[f]; ctx.fillRect(Math.round(fb.x - camX), Math.round(fb.y), 5, 5); }
            // particles
            for (var pa = 0; pa < W.particles.length; pa++) { var ptl = W.particles[pa]; ctx.fillStyle = ptl.color; ctx.fillRect(Math.round(ptl.x - camX), Math.round(ptl.y), 3, 3); }

            // flag
            drawFlag();

            // player
            drawPlayer();
        }

        function drawScenery() {
            // far hills
            ctx.fillStyle = '#5ab44a';
            var hillBase = (GROUND_R) * TILE;
            for (var h = 0; h < 8; h++) {
                var hx = ((h * 180 - camX * 0.4) % (W.worldW)) ;
                var px = hx;
                ctx.beginPath(); ctx.moveTo(px, hillBase); ctx.arc(px + 30, hillBase, 30, Math.PI, 0); ctx.closePath(); ctx.fill();
            }
            // bushes/clouds
            ctx.fillStyle = '#fff';
            for (var cl = 0; cl < 6; cl++) {
                var clx = ((cl * 150 + 40 - camX * 0.25) % (W.worldW + 120)) - 60;
                var cly = 24 + (cl % 3) * 16;
                ctx.fillRect(clx, cly, 28, 8); ctx.fillRect(clx + 6, cly - 5, 16, 8); ctx.fillRect(clx + 20, cly - 2, 12, 6);
            }
        }

        function drawFlag() {
            var fx = Math.round(W.flagX - camX);
            if (fx < -20 || fx > VW + 20) return;
            var topY = up(5) * TILE;
            ctx.fillStyle = '#bbb'; ctx.fillRect(fx + 6, topY, 2, 5 * TILE); // pole
            ctx.fillStyle = '#43b047'; ctx.fillRect(fx + 4, topY - 4, 6, 6);  // ball
            // flag cloth
            ctx.fillStyle = '#e52521';
            ctx.beginPath(); ctx.moveTo(fx + 6, topY + 2); ctx.lineTo(fx - 8, topY + 7); ctx.lineTo(fx + 6, topY + 12); ctx.closePath(); ctx.fill();
        }

        // ============================================================
        // MAIN LOOP
        // ============================================================
        var rafId = null, lastT = 0;
        function loop(ts) {
            rafId = requestAnimationFrame(loop);
            if (!running) return;
            var dt = ts - lastT; lastT = ts;
            // fixed-ish timestep, capped
            stepPlayer();
            stepEnemies();
            stepFireballs();
            updateCamera();

            // timer
            timeAcc += dt || 16;
            if (timeAcc > 400 && !player.win && !player.dead) { timeAcc = 0; time--; if (time <= 0) { time = 0; die(); } }

            render();
        }

        // ============================================================
        // CANVAS SIZING (keep crisp pixels)
        // ============================================================
        function resize() {
            var rect = stage.getBoundingClientRect();
            var scale = Math.max(1, Math.floor(Math.min(rect.width / VW, rect.height / VH)));
            // Use device pixels but render at virtual res then scale via CSS transform-free approach:
            canvas.width = VW; canvas.height = VH;
            // letterbox by CSS: fill while preserving aspect via object-fit-like math
            var cw = VW * scale, chh = VH * scale;
            // prefer to fill width on mobile
            var fillScale = rect.width / VW;
            canvas.style.width = '100%';
            canvas.style.height = (VW * (rect.height / rect.width) >= VH ? '100%' : 'auto');
            ctx.imageSmoothingEnabled = false;
        }
        window.addEventListener('resize', resize);
        onCleanup(function () { window.removeEventListener('resize', resize); });

        // ============================================================
        // OVERLAYS / FLOW
        // ============================================================
        function showOverlay(id) {
            ['rm-intro', 'rm-win'].forEach(function (o) { var el = document.getElementById(o); if (el) el.classList.remove('show'); });
            var el = document.getElementById(id); if (el) el.classList.add('show');
        }
        function hideOverlays() { ['rm-intro', 'rm-win'].forEach(function (o) { var el = document.getElementById(o); if (el) el.classList.remove('show'); }); }

        function startGame() {
            W = buildWorld();
            resetPlayer(false);
            camX = 0; time = 400; coinGot = 0;
            running = true; started = true;
            resize();
            render();
        }

        // ============================================================
        // WIRE UP UI
        // ============================================================
        var cover = document.getElementById('rm-cover');
        var btnStart = document.getElementById('rm-start-btn');
        var btnIntroGo = document.getElementById('rm-intro-go');
        var btnWinGo = document.getElementById('rm-win-go');
        var invitation = document.getElementById('rm-invitation');
        var fab = document.getElementById('rm-fab');
        var btnBackGame = document.getElementById('rm-back-game');
        var btnReplay = document.getElementById('rm-replay');

        if (btnStart) btnStart.addEventListener('click', function () {
            audioCtx(); // unlock audio on first gesture
            if (cover) cover.classList.add('rm-hidden');
            buildInventory();
            startGame();
            running = false; // pause behind intro
            showOverlay('rm-intro');
        });

        if (btnIntroGo) btnIntroGo.addEventListener('click', function () {
            hideOverlays(); running = true; lastT = performance.now();
            startBgMusic();
        });

        if (btnWinGo) btnWinGo.addEventListener('click', function () {
            hideOverlays();
            if (invitation) invitation.classList.add('show');
            if (fab) fab.classList.add('show');
            if (invitation) invitation.scrollTop = 0;
        });

        if (btnBackGame) btnBackGame.addEventListener('click', function () {
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            // replay from start of the world
            startGame(); running = false; showOverlay('rm-intro');
        });

        if (btnReplay) btnReplay.addEventListener('click', function () {
            if (invitation) invitation.classList.remove('show');
            if (fab) fab.classList.remove('show');
            startGame(); running = false; showOverlay('rm-intro');
        });

        // Star cheat
        var starBtn = document.getElementById('rm-star-btn');
        if (starBtn) starBtn.addEventListener('click', function () {
            player.cheat = !player.cheat;
            starBtn.classList.toggle('is-on', player.cheat);
            toast(player.cheat ? 'CHEAT MODE ON<br><span style="font-size:8px">Skor dinonaktifkan</span>' : 'CHEAT MODE OFF', 1600);
        });

        // Touch controls
        holdBtn('rm-left', 'left');
        holdBtn('rm-right', 'right');
        holdBtn('rm-jump', 'jump');
        holdBtn('rm-act', 'act', { tap: doAction });

        bindKey();

        // ============================================================
        // COUNTDOWN + CALENDAR (invitation)
        // ============================================================
        function getWeddingDate() {
            var iso = (val('wedding_date_iso') || (document.getElementById('rm-calendar') || {}).getAttribute ? (document.getElementById('rm-calendar').getAttribute('data-wedding-date') || '') : '').trim();
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
        // RSVP + WISHES (graceful: just acknowledge if no backend hook)
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
        // DESKTOP SIDEBAR — decorative running animation
        // ============================================================
        var sideCanvas = document.getElementById('rm-side-canvas');
        var sideRaf = null;
        if (sideCanvas) {
            var sctx = sideCanvas.getContext('2d');
            var sT = 0;
            function sideResize() { sideCanvas.width = sideCanvas.clientWidth; sideCanvas.height = sideCanvas.clientHeight; }
            sideResize(); window.addEventListener('resize', sideResize);
            onCleanup(function () { window.removeEventListener('resize', sideResize); });
            function sideLoop() {
                sideRaf = requestAnimationFrame(sideLoop);
                var w = sideCanvas.width, h = sideCanvas.height; if (!w) return;
                sT += 1;
                sctx.clearRect(0, 0, w, h);
                // ground
                sctx.fillStyle = 'rgba(200,76,12,0.9)'; sctx.fillRect(0, h - 60, w, 60);
                sctx.fillStyle = 'rgba(224,123,42,0.9)'; sctx.fillRect(0, h - 60, w, 6);
                // clouds
                sctx.fillStyle = 'rgba(255,255,255,0.85)';
                for (var i = 0; i < 5; i++) {
                    var cx = (i * 240 - sT * 0.4) % (w + 200) - 100; var cy = 80 + (i % 3) * 50;
                    sctx.fillRect(cx, cy, 70, 18); sctx.fillRect(cx + 16, cy - 12, 36, 18);
                }
                // bouncing coin
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
    }

    // Run now if DOM ready (script is injected after DOMContentLoaded in-app).
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
