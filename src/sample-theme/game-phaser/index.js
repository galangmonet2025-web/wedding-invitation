/* ======================================================================
   CONTRA WEDDING — "OPERATION: I DO"
   Phaser 3 run-and-gun wedding-invitation theme. Built from scratch.
   ----------------------------------------------------------------------
   The invitation is DISCOVERED by playing: shoot floating PODs to unlock
   each invitation piece; clear 8 areas and rescue the bride to reveal the
   full invitation. But it is a WEDDING INVITATION first — every guest can
   reach the invitation without playing well (LIHAT UNDANGAN button + cheat
   mode + auto-unlock on finishing).

   Phaser is loaded by the host (ThemeWrapper) from a CDN; this theme also
   self-loads it as a fallback so it works standalone.
   ====================================================================== */
(function () {
    'use strict';

    /* =================================================================
       HOST CONTRACT — cleanup hook (theme is re-injected on theme switch)
       ================================================================= */
    if (typeof window.__cwCleanup === 'function') { try { window.__cwCleanup(); } catch (e) {} }
    var cleanupFns = [];
    function onCleanup(fn) { cleanupFns.push(fn); }
    window.__cwCleanup = function () {
        cleanupFns.forEach(function (f) { try { f(); } catch (e) {} });
        cleanupFns = [];
    };

    var BUILD = 'cw-contra-v5-gfx';
    var VERSION = 'v0.6.0';        // shown in the bottom-right version badge (item 6)
    try { console.log('%c[contra-wedding] ' + BUILD + ' (' + VERSION + ')', 'background:#e52521;color:#fff;padding:2px 6px;border-radius:3px'); } catch (e) {}

    /* =================================================================
       EXTERNAL HERO SPRITE (item 1). Point this at a Contra-style commando
       SPRITESHEET URL (must allow hotlink + CORS). It is loaded in the scene's
       preload(); if it fails OR isn't a real ≥4-frame sheet, the game falls back
       to the built-in procedural commando so it NEVER renders blank.
       frameW/frameH must match the sheet's cell size.
       ⚠ Ripped Contra art is Konami-copyrighted — use at your own risk; swap in
       a CC0/own sprite (e.g. Kenney, OpenGameArt) for a safe public invitation.
       To DISABLE external sprites entirely, set CW_HERO_SPRITE.url = ''.
       ================================================================= */
    // The DEFAULT hero is now a richly-detailed PROCEDURAL commando (drawn below
    // in buildTextures) — it's reliable (no CDN), reads clearly as a Contra-style
    // soldier, and matches the procedural art used for every enemy & scenery prop
    // so the whole game looks cohesive ("matang", not "testing"). External sprites
    // remain an OPT-IN: set CW_HERO_SPRITE.url to a CORS-enabled run-and-gun sheet.
    //   • mode:'sheet'  → uniform grid spritesheet  (give frameW/frameH)
    //   • mode:'atlas'  → texture-packer atlas       (give atlasUrl + runPrefix)
    // A VERIFIED atlas you can switch on (real soldier, CORS-ok, HTTP 200):
    //   url:'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples@master/public/assets/animations/soldier.png',
    //   atlasUrl:'https://cdn.jsdelivr.net/gh/photonstorm/phaser3-examples@master/public/assets/animations/soldier.json',
    //   mode:'atlas', runPrefix:'soldier_1_run'
    // Set url:'' to force procedural. Ripped Contra art is Konami-copyrighted.
    var CW_HERO_SPRITE = {
        url: '',                 // '' = use the (recommended) procedural commando
        mode: 'sheet',
        frameW: 37, frameH: 45,
        atlasUrl: '', runPrefix: ''
    };

    /* ---- copy-to-clipboard (gift buttons use inline onclick=cwCopy) ---- */
    window.cwCopy = function (id, btn) {
        var el = document.getElementById(id); if (!el) return;
        var text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : (el.innerText || el.textContent);
        var done = function () { var o = btn.innerHTML; btn.innerHTML = '✔ TERSALIN'; setTimeout(function () { btn.innerHTML = o; }, 1500); };
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
       DOM HELPERS
       ================================================================= */
    function $(id) { return document.getElementById(id); }
    // The host resolves {{var}} into PLAIN TEXT (no data-var attributes). So we
    // read the couple names from where they were rendered. Only a few names are
    // needed in JS (toasts/cutscene); everything else lives in the cloned HTML.
    function readText(sel) { var el = document.querySelector(sel); var v = el ? (el.textContent || '').trim() : ''; return (!v || v.indexOf('{{') === 0) ? '' : v; }
    function val(key, fb) {
        var v = '';
        // closing line is rendered as "{{groom_nickname}} & {{bride_nickname}}"
        var couple = readText('.cw-closing-couple');
        if (couple && couple.indexOf('&') >= 0) {
            var parts = couple.split('&');
            if (key === 'groom_nickname') v = parts[0].trim();
            else if (key === 'bride_nickname') v = (parts[1] || '').trim();
        }
        return v || fb || '';
    }
    function sectionExists(key) { return !!document.querySelector('.cw-sec[data-info="' + key + '"]'); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    var toastTimer;
    function toast(msg, ms) {
        var t = $('cw-toast'); if (!t) return;
        t.innerHTML = msg; t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
    }
    function showError(msg) {
        var c = $('cw-cover');
        if (c) { c.classList.add('show'); c.innerHTML = '<div class="cw-overlay-card"><div class="cw-overlay-pixtitle" style="color:#ff6a6a">GAGAL MEMUAT</div><div class="cw-overlay-text">' + msg + '</div></div>'; }
    }

    /* =================================================================
       INVITATION PIECES — 10 conventional sections, mapped to game PODs
       ================================================================= */
    var INFO_DEFS = [
        { key: 'hero',      label: 'PEMBUKA',  emoji: '🎆', always: true },
        { key: 'couple',    label: 'MEMPELAI', emoji: '💑', always: true },
        { key: 'rsvp',      label: 'RSVP',     emoji: '✉' },
        { key: 'schedule',  label: 'ACARA',    emoji: '📅', always: true },
        { key: 'streaming', label: 'STREAM',   emoji: '📺' },
        { key: 'story',     label: 'KISAH',    emoji: '📖' },
        { key: 'gallery',   label: 'GALERI',   emoji: '🖼' },
        { key: 'happiness', label: 'BERBAGI',  emoji: '📸' },
        { key: 'wishes',    label: 'UCAPAN',   emoji: '💬' },
        { key: 'gift',      label: 'AMPLOP',   emoji: '🎁' },
        { key: 'closing',   label: 'PENUTUP',  emoji: '🙏', always: true }
    ];
    var INFOS = INFO_DEFS.filter(function (d) { return d.always || sectionExists(d.key); });

    /* =================================================================
       PERSISTED STATE
       ================================================================= */
    var STORE_KEY = 'cw_contra_state_v1';
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { saved = {}; }
    var unlocked = saved.unlocked || {};
    var seenInfo = saved.seenInfo || {};
    var bestScore = saved.bestScore || 0;
    var bestArea = saved.bestArea || 1;
    var completed = !!saved.completed;
    var announcedAll = !!saved.announcedAll;
    var gameDiff = (saved.gameDiff === 'easy' || saved.gameDiff === 'hard') ? saved.gameDiff : 'medium';

    function persist() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({
                unlocked: unlocked, seenInfo: seenInfo, bestScore: Math.max(bestScore, score),
                bestArea: bestArea, completed: completed, announcedAll: announcedAll, gameDiff: gameDiff
            }));
        } catch (e) {}
    }
    function resetSave() {
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        unlocked = {}; seenInfo = {}; bestScore = 0; bestArea = 1; completed = false; announcedAll = false; gameDiff = 'medium';
    }
    function allUnlocked() { return INFOS.length > 0 && INFOS.every(function (i) { return unlocked[i.key]; }); }
    function unlockedCount() { var n = 0; INFOS.forEach(function (i) { if (unlocked[i.key]) n++; }); return n; }

    /* =================================================================
       GLOBAL GAME-WIDE STATE
       ================================================================= */
    var TOTAL_AREAS = 8;
    var score = 0, lives = 3, areaNum = 1;
    var started = false;
    var DIFF_ORDER = ['easy', 'medium', 'hard'];
    var DIFF_NAME = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' };
    var DIFF_DESC = {
        easy:   'Banyak nyawa, musuh sedikit & lambat — santai untuk menikmati cerita.',
        medium: 'Musuh menembak balik, ada turret & jurang sedang.',
        hard:   'Tembakan padat, musuh cepat, area lebih panjang.'
    };

    /* 8 areas — Contra biome ladder. Pieces live in areas 1-4 (quota), areas
       5-7 are score runs, area 8 is the boss + rescue. */
    var AREAS = [
        { name: '1', biome: 'jungle',    label: 'HUTAN',        diff: 'easy',   tint: 0x355a86, ground: 0x2f6a3a, grass: 0x5aa048, infoQuota: 3 },
        { name: '2', biome: 'bridge',    label: 'JEMBATAN',     diff: 'easy',   tint: 0x2e4a6a, ground: 0x2f6a3a, grass: 0x5aa048, infoQuota: 3 },
        { name: '3', biome: 'base',      label: 'MARKAS LUAR',  diff: 'medium', tint: 0x3a3040, ground: 0x555560, grass: 0x777788, infoQuota: 2 },
        { name: '4', biome: 'waterfall', label: 'AIR TERJUN',   diff: 'medium', tint: 0x1f6a8a, ground: 0x1f7a6a, grass: 0x37b09a, infoQuota: 2 },
        { name: '5', biome: 'snow',      label: 'SALJU',        diff: 'medium', tint: 0x7fa8d0, ground: 0xb8c4d8, grass: 0xffffff, infoQuota: 0 },
        { name: '6', biome: 'energy',    label: 'ZONA ENERGI',  diff: 'hard',   tint: 0x4a1020, ground: 0x555560, grass: 0x884422, infoQuota: 0 },
        { name: '7', biome: 'inner',     label: 'MARKAS INTI',  diff: 'hard',   tint: 0x2a2040, ground: 0x4a4458, grass: 0x6a6488, infoQuota: 0 },
        { name: '8', biome: 'lair',      label: 'SARANG BOSS',  diff: 'hard',   tint: 0x2a0818, ground: 0x444450, grass: 0x884422, infoQuota: 0, boss: true }
    ];

    /* Weapon NAME lookup for the HUD chip. Full weapon BEHAVIOUR lives in the
       engine's WCONF (Bible §304); this only maps letter → display name. */
    var WEAPONS = {
        R: { name: 'RIFLE' }, M: { name: 'MACHINE' }, S: { name: 'SPREAD' },
        L: { name: 'LASER' }, F: { name: 'FLAME' }
    };

    /* Distribute the ACTUAL number of invitation pieces across areas 1-4 so the
       quota always sums to INFOS.length (sections can be toggled off by the
       host, shrinking INFOS). Areas 5-8 carry no pieces (score + boss). */
    function infoDistribution() {
        var total = INFOS.length, slots = [0, 0, 0, 0];
        for (var i = 0; i < total; i++) slots[i % 4]++;  // round-robin into areas 1-4
        return slots;
    }
    function infoQuotaFor(area) { if (area < 1 || area > 4) return 0; return infoDistribution()[area - 1]; }
    function areaInfoOffset(area) { var o = 0; for (var a = 1; a < area; a++) o += infoQuotaFor(a); return o; }
    function startLives() { return gameDiff === 'easy' ? 5 : 3; }
    // The difficulty the player PICKED is the single source of truth for what they
    // see AND feel: easy=0, medium=1, hard=2. (Previously this blended the area's
    // own diff with the chosen mode, so picking MEDIUM in an "easy" area showed/
    // played EASY — confusing. The area's `diff` field is now only a tiny internal
    // spawn nudge in spawnEnemies, never the displayed level.)
    function diffIdx() { return DIFF_ORDER.indexOf(gameDiff) < 0 ? 1 : DIFF_ORDER.indexOf(gameDiff); }
    function effDiffLvl(area) { return diffIdx(); }

    /* =================================================================
       HUD
       ================================================================= */
    var elLives = $('cw-lives'), elScore = $('cw-score'), elArea = $('cw-area'),
        elDiff = $('cw-diff-badge'), elWeaponName = $('cw-weapon-name'), elWeaponIco = $('cw-weapon-ico'),
        elProgN = $('cw-progress-n'), elProgT = $('cw-progress-t');
    function setHUD() {
        if (elLives) elLives.textContent = '×' + lives;
        if (elScore) elScore.textContent = ('000000' + score).slice(-6);
        if (elArea) elArea.textContent = (AREAS[areaNum - 1] || AREAS[0]).name;
        if (elDiff) { var lvl = effDiffLvl(areaNum); var key = DIFF_ORDER[lvl]; elDiff.textContent = DIFF_NAME[key]; elDiff.setAttribute('data-lvl', key); }
        if (elProgN) elProgN.textContent = unlockedCount();
        if (elProgT) elProgT.textContent = INFOS.length;
    }
    function setWeaponHUD(w) {
        var def = WEAPONS[w] || WEAPONS.R;
        if (elWeaponName) elWeaponName.textContent = def.name;
        if (elWeaponIco) elWeaponIco.textContent = w || 'R';
    }
    function addScore(n) { if (!cheat) { score += n; setHUD(); } }

    /* =================================================================
       INVENTORY + PIECE MODAL
       ================================================================= */
    var invButtons = {};
    function buildInventory() {
        var host = $('cw-inv'); if (!host) return;
        host.innerHTML = ''; invButtons = {};
        INFOS.forEach(function (info) {
            var btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'cw-inv-item'; btn.title = info.label;
            btn.innerHTML = '<span class="cw-inv-emoji">' + info.emoji + '</span><span>' + info.label + '</span>';
            btn.addEventListener('click', function () {
                if (btn.classList.contains('is-enabled')) { btn.classList.remove('has-new'); seenInfo[info.key] = true; persist(); openModal(info); }
            });
            host.appendChild(btn); invButtons[info.key] = btn;
            if (unlocked[info.key]) { btn.classList.add('is-enabled'); if (!seenInfo[info.key]) btn.classList.add('has-new'); }
        });
        setHUD();
    }
    function unlockInfo(info) {
        var first = !unlocked[info.key];
        unlocked[info.key] = true;
        var btn = invButtons[info.key];
        if (btn) { btn.classList.add('is-enabled'); if (!seenInfo[info.key]) btn.classList.add('has-new'); }
        setHUD();
        if (allUnlocked()) { updateViewBtn(); if (!announcedAll) { announcedAll = true; setTimeout(announceAll, 700); } }
        persist();
        return first;
    }
    function openModal(info) {
        var sec = document.querySelector('.cw-sec[data-info="' + info.key + '"]');
        var root = $('cw-modal-root'); if (!sec || !root) return;
        var body = $('cw-modal-body'); body.innerHTML = '';
        var clone = sec.cloneNode(true);
        body.appendChild(clone);
        $('cw-modal-title').textContent = info.label;
        // re-wire interactive bits inside the clone
        if (info.key === 'gallery') wireGallery(clone);
        root.classList.add('show');
    }
    function closeModal() { var r = $('cw-modal-root'); if (r) r.classList.remove('show'); }

    function announceAll() {
        toast('🎉 SEMUA KEPINGAN TERBUKA!<br><span style="font-size:7px;color:#ffce4a">Undangan siap dibuka ✨</span>', 2400);
        updateViewBtn();
        setTimeout(showRescueOffer, 1600);
    }
    function showRescueOffer() {
        pauseGame();
        var groom = val('groom_nickname', 'Mempelai Pria'), bride = val('bride_nickname', 'Mempelai Wanita');
        var el = $('cw-rescue-text');
        if (el) el.innerHTML =
            'Kamu sudah mengumpulkan <strong>SEMUA</strong> kepingan — undangan kami siap dibuka! 💌<br><br>' +
            'Tapi sang putri <strong>' + esc(bride) + '</strong> masih ditawan boss di sarang inti! 👹<br>' +
            'Bantu <strong>' + esc(groom) + '</strong> menyelamatkannya?';
        showOverlay('cw-rescue');
    }

    /* =================================================================
       VIEW INVITATION / REVEAL
       ================================================================= */
    var viewBtn = $('cw-view-btn');
    function viewUnlocked() { return !!(completed || allUnlocked() || cheat); }
    function updateViewBtn() { if (viewBtn) viewBtn.classList.toggle('is-locked', !viewUnlocked()); }
    function openInvitation() {
        // reveal everything (any guest opening the invitation gets all sections)
        INFOS.forEach(function (info) { unlocked[info.key] = true; var b = invButtons[info.key]; if (b) b.classList.add('is-enabled'); });
        persist(); pauseGame(); hideOverlays(); closeModal();
        var inv = $('cw-invitation'); if (inv) { inv.classList.add('show'); inv.scrollTop = 0; }
        pauseHostMusic();
    }
    function closeInvitation() {
        var inv = $('cw-invitation'); if (inv) inv.classList.remove('show');
        // resume the paused game ONLY if a level is actually in progress (an
        // overlay like cover/win is not showing). Otherwise leave it paused.
        var anyOverlay = OVERLAYS.some(function (o) { var el = $(o); return el && el.classList.contains('show'); });
        if (!anyOverlay && started) resumeGame();
    }

    /* =================================================================
       HOST MUSIC — theme only mirrors/pauses; host owns playback
       ================================================================= */
    function pauseHostMusic() {
        try { var b = $('btn-toggle-music'); if (b && b.classList.contains('music-playing')) b.click(); } catch (e) {}
    }

    /* =================================================================
       LIGHTBOX (gallery)
       ================================================================= */
    var lbList = [], lbIdx = 0;
    function lbShow(i) {
        if (!lbList.length) return;
        lbIdx = (i + lbList.length) % lbList.length;
        var img = $('cw-lightbox-img'); if (img) img.src = lbList[lbIdx];
        var c = $('cw-lightbox-count'); if (c) c.textContent = (lbIdx + 1) + ' / ' + lbList.length;
    }
    function openLightbox(imgEl, scope) {
        var imgs = (scope || document).querySelectorAll('.cw-gallery-item img');
        lbList = []; var startI = 0;
        for (var k = 0; k < imgs.length; k++) {
            var src = imgs[k].currentSrc || imgs[k].src;
            if (!src || src.indexOf('{{') >= 0) continue;
            if (imgs[k] === imgEl) startI = lbList.length;
            lbList.push(src);
        }
        if (!lbList.length) return;
        lbShow(startI);
        var lb = $('cw-lightbox'); if (lb) lb.classList.add('show');
    }
    function closeLightbox() { var lb = $('cw-lightbox'); if (lb) lb.classList.remove('show'); }
    function wireGallery(scope) {
        var items = scope.querySelectorAll('.cw-gallery-item img');
        items.forEach(function (img) { img.addEventListener('click', function () { openLightbox(img, scope); }); });
    }

    /* =================================================================
       COUNTDOWN + RSVP + WISHES (self-handled; host may also intercept)
       ================================================================= */
    function getWeddingDate() {
        var cd = $('cw-countdown');
        var iso = (val('wedding_date_iso') || (cd ? cd.getAttribute('data-wedding-date') || '' : '')).trim();
        if (iso && iso.indexOf('{{') !== 0) {
            var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
            var d = new Date(iso); if (!isNaN(d.getTime())) return d;
        }
        return new Date(new Date().getFullYear() + 1, 11, 31);
    }
    function startCountdown() {
        // Only run a live tick if we actually have a real wedding date. Otherwise
        // keep the server-rendered {{countdown_*}} numbers as-is (don't overwrite
        // them with a guessed default date).
        var cd = $('cw-countdown');
        var iso = (val('wedding_date_iso') || (cd ? cd.getAttribute('data-wedding-date') || '' : '')).trim();
        if (!iso || iso.indexOf('{{') === 0) return;
        var wd = getWeddingDate();
        function tick() {
            var dist = wd.getTime() - Date.now(); if (dist < 0) dist = 0;
            var d = Math.floor(dist / 864e5), h = Math.floor(dist % 864e5 / 36e5), mi = Math.floor(dist % 36e5 / 6e4), s = Math.floor(dist % 6e4 / 1e3);
            function set(id, v) { var el = $(id); if (el) el.textContent = ('0' + v).slice(-2); }
            set('cw-cd-days', d); set('cw-cd-hours', h); set('cw-cd-mins', mi); set('cw-cd-secs', s);
        }
        tick();
        var t = setInterval(tick, 1000);
        onCleanup(function () { clearInterval(t); });
    }
    function wireForms() {
        // The host intercepts #btn-submit-kehadiran natively (capture-phase) using
        // #rsvp-code/#rsvp-status/#rsvp-guests. We only add a visual fallback for
        // standalone use; if the host handles it, our handler still shows thanks.
        var rsvp = $('btn-submit-kehadiran');
        if (rsvp) rsvp.addEventListener('click', function () {
            if (typeof window.submitRsvp === 'function') { window.submitRsvp(); }
            var name = ($('cw-rsvp-name') || {}).value || '';
            var form = $('cw-rsvp-form'); if (form) form.innerHTML = '<div class="cw-thanks">✔ Terima kasih' + (name ? ' ' + esc(name) : '') + '! Konfirmasimu sudah kami terima.</div>';
            toast('RSVP terkirim!');
        });
        var wish = $('btn-submit-ucapan');
        if (wish) wish.addEventListener('click', function () {
            if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
            var nm = ($('wish-name') || {}).value || '', msg = ($('wish-message') || {}).value || '';
            if (!msg.trim()) { toast('Tulis ucapanmu dulu'); return; }
            var list = $('cw-wish-list');
            if (list) {
                var item = document.createElement('div'); item.className = 'cw-wish-item';
                item.innerHTML = '<div class="cw-wish-head"><span class="cw-wish-author"></span><span class="cw-wish-time">baru saja</span></div><div class="cw-wish-text"></div>';
                item.querySelector('.cw-wish-author').textContent = nm || 'Tamu';
                item.querySelector('.cw-wish-text').textContent = msg;
                list.insertBefore(item, list.firstChild);
            }
            var form = $('cw-wish-form'); if (form) form.innerHTML = '<div class="cw-thanks">✔ Terima kasih atas ucapan & doanya!</div>';
            toast('Ucapan terkirim!');
        });
    }

    /* =================================================================
       OVERLAYS / FLOW
       ================================================================= */
    var OVERLAYS = ['cw-cover', 'cw-intro', 'cw-areaclear', 'cw-rescue', 'cw-win', 'cw-stagesel', 'cw-reset-confirm'];
    function showOverlay(id) {
        OVERLAYS.forEach(function (o) { var el = $(o); if (el) el.classList.remove('show'); });
        var el = $(id); if (el) el.classList.add('show');
        if (id === 'cw-intro') refreshIntroDiff();
        // any blocking overlay should freeze the game underneath it
        pauseGame();
    }
    function hideOverlays() { OVERLAYS.forEach(function (o) { var el = $(o); if (el) el.classList.remove('show'); }); }
    function refreshIntroDiff() {
        var el = $('cw-intro-diff'); if (!el) return;
        var lvl = effDiffLvl(areaNum), key = DIFF_ORDER[lvl];
        el.innerHTML = '<span class="cw-diff-info-badge" data-lvl="' + key + '">TINGKAT: ' + DIFF_NAME[key] + '</span>' +
            '<span class="cw-diff-info-desc">' + DIFF_DESC[key] + '</span>';
    }

    /* =================================================================
       CHEAT
       ================================================================= */
    var cheat = false;
    function setCheat(on) {
        cheat = on;
        var b = $('cw-star-btn'); if (b) b.classList.toggle('is-on', cheat);
        var ss = $('cw-stagesel-btn'); if (ss) ss.style.display = cheat ? 'flex' : 'none';
        updateViewBtn();
        if (G && G.scene) G.scene.cheat = cheat;
        toast(cheat ? 'CHEAT: kebal · pilih area · skor mati' : 'CHEAT OFF', 1700);
    }

    /* =================================================================
       PHASER — ensure available, then the game engine
       ================================================================= */
    var PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js';
    var phaserRequested = false;
    function ensurePhaser() {
        if (window.Phaser || phaserRequested) return;
        if (document.getElementById('phaser-js')) return;
        phaserRequested = true;
        var s = document.createElement('script'); s.id = 'phaser-js-theme'; s.src = PHASER_CDN; s.async = true;
        s.onerror = function () { showError('Gagal memuat Phaser dari internet. Cek koneksi.'); };
        document.head.appendChild(s);
    }
    var waitTries = 0;
    function whenPhaserReady(cb) {
        if (window.Phaser) { cb(); return; }
        ensurePhaser();
        if (waitTries++ > 200) { showError('Phaser tidak termuat (timeout). Cek koneksi internet.'); return; }
        var id = setTimeout(function () { whenPhaserReady(cb); }, 50);
        onCleanup(function () { clearTimeout(id); });
    }

    /* === Audio (tiny chiptune SFX via WebAudio; independent of host music) === */
    var actx = null;
    function audio() { if (actx) return actx; try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } return actx; }
    function sfx(type) {
        var c = audio(); if (!c) return; if (c.state === 'suspended') c.resume();
        var t = c.currentTime;
        function tone(f0, f1, dur, vol, wave) {
            var o = c.createOscillator(), g = c.createGain();
            o.type = wave || 'square'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
            g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
        }
        if (type === 'shoot') tone(760, 420, 0.06, 0.03);
        else if (type === 'spread') { tone(700, 380, 0.07, 0.03); tone(900, 500, 0.05, 0.02); }
        else if (type === 'machine') tone(820, 600, 0.04, 0.025);
        else if (type === 'laser') tone(1200, 500, 0.12, 0.04, 'sawtooth');
        else if (type === 'fire') tone(520, 240, 0.10, 0.04, 'sawtooth');
        else if (type === 'alarm') { tone(880, 440, 0.16, 0.06, 'sawtooth'); setTimeout(function () { tone(880, 440, 0.16, 0.06, 'sawtooth'); }, 200); }
        else if (type === 'jump') tone(420, 760, 0.14, 0.05);
        else if (type === 'hit') tone(300, 120, 0.10, 0.05);
        else if (type === 'explode') tone(220, 60, 0.22, 0.06, 'sawtooth');
        else if (type === 'die') { tone(330, 80, 0.4, 0.07, 'triangle'); }
        else if (type === 'unlock') { tone(659, 988, 0.12, 0.06); setTimeout(function () { tone(988, 1319, 0.14, 0.06); }, 90); }
        else if (type === 'power') { [392, 523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { tone(f, f, 0.1, 0.05); }, i * 55); }); }
        else if (type === 'clear') { [523, 659, 784, 1046, 1318].forEach(function (f, i) { setTimeout(function () { tone(f, f, 0.14, 0.06); }, i * 100); }); }
        else if (type === 'win') { [523, 659, 784, 1046, 1318, 1568].forEach(function (f, i) { setTimeout(function () { tone(f, f, 0.18, 0.07); }, i * 110); }); }
    }

    /* === The Phaser game wrapper === */
    var G = null;            // { game, scene }
    function pauseGame() { if (G && G.scene && G.scene.scene.isActive()) G.scene.scene.pause(); }
    function resumeGame() { if (G && G.scene) { if (G.scene.scene.isPaused()) G.scene.scene.resume(); } }

    /* ----------------------------------------------------------------
       The whole Phaser scene lives in buildScene(); it is created once
       and we re-init the level on area change via scene.restart(data).
       ---------------------------------------------------------------- */
    /* =================================================================
       PHASER GAME ENGINE — rebuilt following CONTRA-DEVELOPMENT-PHARSER-BIBLE.
       Single-file architecture (Bible §268): all systems live inside bootGame
       because the host injects this theme as ONE script string. Systems map to
       the bible: InputManager (§19-20,§382), Player + StateMachine (§14-37),
       Weapon classes (§38-53,§301-337), EnemyManager + AI states (§63-89,
       §339-356), bullet pooling (§48-50,§329), Boss 3-phase + weak point
       (§90-100,§357-367), combat juice (§368-373,§442-446), one-hit death +
       invincibility (§26-28). Sprites are procedural textures; SFX is WebAudio.

       Public interface kept stable for the outer (non-engine) code:
         G = { game, scene } · bootGame(area) · pauseGame() · resumeGame()
       ================================================================= */
    var G = null;
    function pauseGame() { if (G && G.scene && G.scene.scene.isActive()) G.scene.scene.pause(); }
    function resumeGame() { if (G && G.scene && G.scene.scene.isPaused()) G.scene.scene.resume(); }

    /* ---- shared tiny helpers used by the scene ---- */
    function darken(hex, f) {
        var r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
        r = Math.round(r * (1 - f)); g = Math.round(g * (1 - f)); b = Math.round(b * (1 - f));
        return (r << 16) | (g << 8) | b;
    }

    /* =================================================================
       WEAPON CONFIG (Bible §304) — data-driven; classes select behaviour by
       `type`. cd = cooldown ms, spd = bullet px/s.
       ================================================================= */
    var WCONF = {
        R: { id: 'R', name: 'RIFLE',   type: 'single', cd: 250, spd: 560, dmg: 1, big: false, pierce: false },
        M: { id: 'M', name: 'MACHINE', type: 'rapid',  cd: 90,  spd: 620, dmg: 1, big: false, pierce: false },
        S: { id: 'S', name: 'SPREAD',  type: 'multi',  cd: 320, spd: 540, dmg: 1, big: false, pierce: false },
        L: { id: 'L', name: 'LASER',   type: 'pierce', cd: 420, spd: 820, dmg: 2, big: true,  pierce: true  },
        F: { id: 'F', name: 'FLAME',   type: 'cone',   cd: 130, spd: 360, dmg: 1, big: true,  pierce: false }
    };
    var POD_DROPS = ['M', 'S', 'L', 'F'];

    function bootGame(startArea) {
        var Phaser = window.Phaser;
        var stageEl = $('cw-stage'); if (!stageEl) { showError('Elemen #cw-stage tidak ditemukan.'); return; }
        if (G && G.game) {                         // already booted → jump area
            var sc = G.scene || G.game.scene.getScene('main');
            if (sc) sc.scene.restart({ area: startArea || 1 });
            return;
        }
        var rect = stageEl.getBoundingClientRect();
        var GW = Math.max(260, Math.round(rect.width));
        var GH = Math.max(360, Math.round(rect.height));
        var TILE = 32;

        /* =============================================================
           INPUT MANAGER (Bible §19-20, §382-385) — single abstraction the
           Player reads; fed by BOTH keyboard and touch so the Player never
           knows the source. Touch flags live here; keyboard polled in update.
           ============================================================= */
        var touch = { left: false, right: false, up: false, down: false, jump: false, fire: false };

        var Scene = new Phaser.Class({
            Extends: Phaser.Scene,
            initialize: function () { Phaser.Scene.call(this, { key: 'main' }); },

            init: function (data) { this.areaIndex = (data && data.area) ? data.area : 1; },

            /* ---- EXTERNAL SPRITES (item 1, Bible §274-277 PreloadScene) ----
               Try to load a Contra-style commando spritesheet from a CDN. If ANY
               external asset fails (CDN down / CORS / blocked), we fall back to
               the procedural textures so the game NEVER renders blank. The flag
               cwExtOK records success; buildTextures() skips player textures only
               when external ones loaded. */
            preload: function () {
                var self = this;
                this.cwExtOK = false; this.cwExtMode = CW_HERO_SPRITE.mode || 'sheet';
                if (!CW_HERO_SPRITE.url) return;                 // external disabled → procedural
                if (this.textures.exists('ext_commando')) { this.cwExtOK = true; return; }
                if (this.cwExtMode === 'atlas' && CW_HERO_SPRITE.atlasUrl) {
                    this.load.atlas('ext_commando', CW_HERO_SPRITE.url, CW_HERO_SPRITE.atlasUrl);
                } else {
                    this.load.spritesheet('ext_commando', CW_HERO_SPRITE.url, { frameWidth: CW_HERO_SPRITE.frameW, frameHeight: CW_HERO_SPRITE.frameH });
                }
                this.load.once('loaderror', function () { self.cwExtOK = false; });
                this.load.once('complete', function () { self.cwExtOK = self.textures.exists('ext_commando'); });
            },

            /* ---- TEXTURES (procedural; per-key guarded so external sprites that
               loaded in preload are not overwritten). Bible animation §54-57. ---- */
            buildTextures: function () {
                var g = this.make.graphics({ x: 0, y: 0, add: false });
                // 8x8 white square for pooled bullets (always procedural).
                if (!this.textures.exists('__white')) { g.fillStyle(0xffffff); g.fillRect(0, 0, 8, 8); g.generateTexture('__white', 8, 8); g.clear(); }
                // If procedural commando already built once, only ensure bullets.
                if (this.textures.exists('cmd_idle')) { g.destroy(); return; }
                function dk(c) { var r = ((c >> 16) & 255) * 0.6, gg = ((c >> 8) & 255) * 0.6, b = (c & 255) * 0.6; return (r << 16) | (gg << 8) | b; }

                // COMMANDO (groom) faces RIGHT; 32x34 cell; legPose+aim variants.
                // Detailed Contra-style soldier: red bandana + tails, shaded skin,
                // muscle/vest highlights, ammo belt, cargo pants, combat boots, a
                // proper rifle with muzzle + magazine. Reads clearly as a "soldier".
                function commando(key, legPose, aim) {
                    g.clear();
                    var skin = 0xf0a868, skinDk = 0xb87434, skinHi = 0xffd29a,
                        band = 0xe52521, bandDk = 0x9c1c10,
                        torso = 0xe8a85a, torsoDk = 0xc07a34,         // bare-chest action hero
                        pants = 0x2f6a3a, pantsDk = 0x1d4a26, pantsHi = 0x4a9a52,  // military green
                        boot = 0x14110a, bootHi = 0x33291a, gun = 0x2b2c34, gunHi = 0x9aa0b0, gunDk = 0x141519;
                    // hair + bandana with trailing tails
                    g.fillStyle(0x3a2618); g.fillRect(8, 3, 11, 3);              // hair
                    g.fillStyle(band); g.fillRect(7, 1, 13, 4);                  // bandana
                    g.fillStyle(bandDk); g.fillRect(4, 2, 4, 2); g.fillRect(2, 4, 3, 2); // tails fluttering back (left)
                    // head + face shading
                    g.fillStyle(skin); g.fillRect(8, 5, 11, 8);
                    g.fillStyle(skinHi); g.fillRect(15, 6, 3, 4);
                    g.fillStyle(skinDk); g.fillRect(8, 11, 11, 2);
                    g.fillStyle(0x101010); g.fillRect(15, 7, 2, 2);             // eye
                    g.fillStyle(0x8a5a30); g.fillRect(9, 10, 4, 1);            // jaw line
                    // torso (muscled), with diagonal ammo bandolier
                    g.fillStyle(torso); g.fillRect(6, 13, 14, 10);
                    g.fillStyle(torsoDk); g.fillRect(6, 13, 3, 10);            // shaded left
                    g.fillStyle(skinHi); g.fillRect(15, 14, 3, 6);            // chest highlight
                    g.fillStyle(0x6a4a22); for (var bb = 0; bb < 4; bb++) g.fillRect(8 + bb * 3, 14 + bb, 2, 2); // bandolier
                    g.fillStyle(0xffd24a); for (var sb = 0; sb < 4; sb++) g.fillRect(8 + sb * 3, 14 + sb, 1, 1); // bullets
                    // belt
                    g.fillStyle(0x4a3416); g.fillRect(6, 21, 14, 2);
                    g.fillStyle(0xcaa24a); g.fillRect(11, 21, 3, 2);          // buckle
                    // legs (cargo pants) with pose
                    g.fillStyle(pants);
                    if (legPose === 1) { g.fillRect(6, 23, 6, 9); g.fillRect(14, 23, 6, 7); }
                    else if (legPose === 2) { g.fillRect(8, 23, 6, 7); g.fillRect(13, 23, 6, 9); }
                    else { g.fillRect(7, 23, 5, 9); g.fillRect(14, 23, 5, 9); }
                    g.fillStyle(pantsDk); g.fillRect(7, 23, 2, 8);
                    g.fillStyle(pantsHi); g.fillRect(16, 24, 2, 5);
                    g.fillStyle(0x2a4a2e); g.fillRect(15, 26, 4, 2);          // knee pocket
                    // boots
                    g.fillStyle(boot);
                    if (legPose === 1) { g.fillRect(5, 31, 7, 3); g.fillRect(14, 29, 7, 3); g.fillStyle(bootHi); g.fillRect(5, 31, 7, 1); }
                    else if (legPose === 2) { g.fillRect(8, 29, 7, 3); g.fillRect(13, 31, 7, 3); g.fillStyle(bootHi); g.fillRect(13, 31, 7, 1); }
                    else { g.fillRect(6, 31, 6, 3); g.fillRect(14, 31, 6, 3); g.fillStyle(bootHi); g.fillRect(6, 31, 6, 1); g.fillRect(14, 31, 6, 1); }
                    // rifle (with body, magazine, muzzle) — direction per aim
                    if (aim === 'up') {
                        g.fillStyle(gun); g.fillRect(16, 0, 4, 15); g.fillStyle(gunHi); g.fillRect(16, 0, 1, 15);
                        g.fillStyle(gunDk); g.fillRect(15, 6, 6, 2); g.fillStyle(0x6a6a74); g.fillRect(16, -1, 4, 1); // muzzle tip
                    } else if (aim === 'down') {
                        g.fillStyle(gun); g.fillRect(16, 18, 4, 15); g.fillStyle(gunHi); g.fillRect(16, 18, 1, 15);
                        g.fillStyle(gunDk); g.fillRect(15, 24, 6, 2);
                    } else {
                        g.fillStyle(gun); g.fillRect(17, 14, 13, 4);             // barrel/body
                        g.fillStyle(gunHi); g.fillRect(17, 14, 13, 1);
                        g.fillStyle(gunDk); g.fillRect(20, 18, 4, 3);            // magazine
                        g.fillStyle(0x6a6a74); g.fillRect(29, 13, 2, 5);        // muzzle
                        g.fillStyle(skin); g.fillRect(16, 15, 4, 3);            // gripping hand
                    }
                    g.generateTexture(key, 32, 34);
                }
                commando('cmd_idle', 0, 'fwd');
                commando('cmd_run1', 1, 'fwd');
                commando('cmd_run2', 2, 'fwd');
                commando('cmd_up', 0, 'up');
                commando('cmd_down', 0, 'down');
                // PRONE (item 4) — lying down, low flat rifle (classic Contra duck)
                g.clear();
                g.fillStyle(0x2848c8); g.fillRect(2, 24, 16, 8);                 // legs flat
                g.fillStyle(0x141018); g.fillRect(0, 30, 6, 3);                  // boots
                g.fillStyle(0xf0a868); g.fillRect(14, 22, 12, 8);               // torso flat
                g.fillStyle(0xe52521); g.fillRect(24, 20, 6, 4);               // head/bandana
                g.fillStyle(0x33343c); g.fillRect(26, 24, 14, 3);             // rifle forward low
                g.fillStyle(0x8a8c98); g.fillRect(26, 24, 14, 1);
                g.generateTexture('cmd_prone', 42, 34);
                // death frame (fallen)
                g.clear(); g.fillStyle(0xe52521); g.fillRect(2, 20, 28, 10); g.fillStyle(0xf0a868); g.fillRect(24, 16, 8, 8); g.generateTexture('cmd_dead', 32, 34);

                // ENEMY SOLDIERS (face left by default) — helmet w/ visor, shaded
                // uniform, ammo belt, rifle pointing left, combat boots. Distinct
                // palettes per kind so the player can read threat at a glance.
                function soldier(key, col, helm) {
                    g.clear();
                    // helmet + visor
                    g.fillStyle(helm); g.fillRect(3, 0, 14, 5);
                    g.fillStyle(dk(helm)); g.fillRect(3, 4, 14, 1); g.fillRect(2, 1, 2, 4);
                    g.fillStyle(0x2a2a32); g.fillRect(2, 5, 6, 2);            // visor
                    // face
                    g.fillStyle(0xffce9e); g.fillRect(4, 5, 12, 6);
                    g.fillStyle(0xd99a6a); g.fillRect(4, 9, 12, 2);
                    g.fillStyle(0x101010); g.fillRect(5, 7, 2, 2);           // eye
                    // torso uniform + shading + bandolier
                    g.fillStyle(col); g.fillRect(3, 11, 14, 11);
                    g.fillStyle(dk(col)); g.fillRect(3, 11, 3, 11);
                    g.fillStyle(0x6a4a22); for (var i2 = 0; i2 < 3; i2++) g.fillRect(5 + i2 * 3, 12 + i2, 2, 2);
                    g.fillStyle(0xcaa24a); g.fillRect(4, 16, 12, 2);         // belt
                    // rifle (points left)
                    g.fillStyle(0x2b2c34); g.fillRect(-5, 13, 9, 3);
                    g.fillStyle(0x6a6a74); g.fillRect(-6, 13, 1, 3);         // muzzle
                    // boots
                    g.fillStyle(0x1f1810); g.fillRect(4, 22, 5, 6); g.fillRect(10, 22, 5, 6);
                    g.fillStyle(0x3a2f1c); g.fillRect(4, 27, 5, 1); g.fillRect(10, 27, 5, 1);
                    g.generateTexture(key, 20, 28);
                }
                soldier('en_soldier', 0x6a5a8a, 0x4a4458);
                soldier('en_runner', 0xb83838, 0x7a2222);
                soldier('en_heavy', 0x4a6a3a, 0x2a3a22);

                g.clear();                                  // TURRET
                g.fillStyle(0x2a2a32); g.fillRect(0, 8, 30, 18);
                g.fillStyle(0x4a4a54); g.fillRect(2, 10, 26, 14);
                g.fillStyle(0x6a6a74); g.fillRect(2, 10, 26, 2);
                g.fillStyle(0x3a3a44); g.fillRect(5, 2, 20, 8);
                g.fillStyle(0x7aa8ff); g.fillRect(7, 4, 5, 3);
                g.fillStyle(0x2a2a32); g.fillRect(-6, 12, 8, 4);
                g.generateTexture('en_turret', 30, 26);

                g.clear();                                  // SNIPER (ghillie)
                g.fillStyle(0x1f2a36); g.fillRect(2, 2, 16, 22);
                g.fillStyle(0x2a3a4a); g.fillRect(3, 3, 14, 20);
                g.fillStyle(0x4a6a3a); g.fillRect(3, 18, 14, 3);
                g.fillStyle(0xffce9e); g.fillRect(4, 0, 12, 4);
                g.fillStyle(0x101010); g.fillRect(5, 1, 2, 2);
                g.fillStyle(0x2a2a32); g.fillRect(-6, 7, 10, 2);
                g.fillStyle(0x7aa8ff); g.fillRect(-7, 6, 2, 1);
                g.generateTexture('en_sniper', 20, 26);

                g.clear();                                  // DRONE (flying)
                g.fillStyle(0x3a3a4a); g.fillRect(2, 4, 18, 8);
                g.fillStyle(0x5a5a6a); g.fillRect(3, 5, 16, 4);
                g.fillStyle(0xff5a55); g.fillRect(8, 6, 6, 2);
                g.fillStyle(0x2a2a32); g.fillRect(0, 2, 4, 2); g.fillRect(18, 2, 4, 2);
                g.generateTexture('en_drone', 22, 16);

                /* GROUND TILE (item 1) — a 32x32 dirt/rock tile, near-WHITE base so
                   it TINTS cleanly to each biome's ground colour. Tiled across the
                   floor via TileSprite in addGround(). Speckles + seams give it the
                   "finished tileset" look instead of a flat rectangle. */
                g.clear();
                g.fillStyle(0xffffff); g.fillRect(0, 0, 32, 32);
                g.fillStyle(0xe0e0e0); g.fillRect(0, 0, 32, 4);                  // top lip
                g.fillStyle(0xcccccc); g.fillRect(0, 4, 32, 2);
                g.fillStyle(0xbdbdbd); g.fillRect(0, 0, 2, 32); g.fillRect(30, 0, 2, 32); // side seams
                g.fillStyle(0xb0b0b0); g.fillRect(0, 30, 32, 2);                 // bottom seam
                g.fillStyle(0xd2d2d2); g.fillRect(6, 12, 3, 3); g.fillRect(20, 9, 4, 4); g.fillRect(13, 22, 3, 3); g.fillRect(24, 20, 3, 3); // speckle
                g.fillStyle(0xc4c4c4); g.fillRect(10, 17, 2, 2); g.fillRect(26, 14, 2, 2);
                g.generateTexture('tile_ground', 32, 32);

                /* GRASS/EDGE STRIP (top surface) — near-white, tints to A.grass. */
                g.clear();
                g.fillStyle(0xffffff); g.fillRect(0, 0, 32, 10);
                g.fillStyle(0xdfdfdf); g.fillRect(0, 6, 32, 4);
                for (var bx2 = 0; bx2 < 32; bx2 += 6) { g.fillStyle(0xf0f0f0); g.fillRect(bx2, 0, 3, 5); }  // blades
                g.generateTexture('tile_grass', 32, 10);

                /* FLOATING PLATFORM (item 1) — a self-contained 96x16 metal slab with
                   plated top, rivets and shaded underside. Near-white → tints to biome. */
                g.clear();
                g.fillStyle(0xffffff); g.fillRect(0, 0, 96, 16);
                g.fillStyle(0xe6e6e6); g.fillRect(0, 0, 96, 4);                  // top plate
                g.fillStyle(0xb4b4b4); g.fillRect(0, 12, 96, 4);                 // shaded underside
                g.fillStyle(0x9a9a9a); g.fillRect(0, 0, 3, 16); g.fillRect(93, 0, 3, 16); // riveted ends
                for (var rv = 6; rv < 96; rv += 16) { g.fillStyle(0xcfcfcf); g.fillRect(rv, 6, 3, 3); } // rivets
                g.generateTexture('tile_plat', 96, 16);

                /* FINISH TOWER / STAGE-EXIT GATE (item 1) — a fortified beacon tower
                   sprite the player runs to at the end of non-boss areas. 56x150. */
                g.clear();
                g.fillStyle(0x4a4450); g.fillRect(8, 18, 40, 132);              // tower body
                g.fillStyle(0x5e5868); g.fillRect(12, 22, 32, 128);
                g.fillStyle(0x3a3540); g.fillRect(8, 18, 40, 4);
                for (var wy = 30; wy < 140; wy += 22) { g.fillStyle(0x2e2a36); g.fillRect(14, wy, 28, 3); } // banding
                g.fillStyle(0x2a2632); g.fillRect(20, 60, 16, 30);             // doorway
                g.fillStyle(0x1c1a22); g.fillRect(23, 64, 10, 26);
                g.fillStyle(0x6a6478); g.fillRect(4, 10, 48, 12);              // battlement top
                for (var cz = 4; cz < 52; cz += 12) { g.fillStyle(0x6a6478); g.fillRect(cz, 2, 7, 9); }     // crenellations
                g.fillStyle(0xff5a28); g.fillCircle(28, 14, 5);               // beacon
                g.fillStyle(0xffd24a); g.fillCircle(28, 14, 2);
                g.generateTexture('tower_finish', 56, 152);

                // POD textures
                function pod(key, core) {
                    g.clear();
                    g.fillStyle(0x0a1a2a); g.fillRect(0, 0, 26, 26);
                    g.fillStyle(0x243a52); g.fillRect(0, 0, 26, 4);
                    g.fillStyle(core); g.fillRect(4, 4, 18, 18);
                    g.fillStyle(0xffffff); g.fillRect(6, 6, 5, 3);
                    g.generateTexture(key, 26, 26);
                }
                pod('pod_info', 0xffce4a);
                pod('pod_weapon', 0x7aa8ff);

                // INVITATION PIECE collectible (item 1/2) — a clearly-different,
                // BIG glowing ENVELOPE so guests instantly read it as "wedding info",
                // not a weapon. Drawn at full size (48x42) so the sprite is NOT scaled
                // at runtime — the physics body then matches the visual 1:1 and bullets
                // reliably hit it. Sits inside a depth-sorted gold frame.
                g.clear();
                g.fillStyle(0xffce4a); g.fillRect(0, 0, 48, 42);                  // gold outer frame
                g.fillStyle(0xfff3cf); g.fillRect(3, 3, 42, 36);                  // cream inner
                g.fillStyle(0xffffff); g.fillRect(6, 12, 36, 24);                 // envelope body
                g.fillStyle(0xffe9b0); g.fillRect(6, 12, 36, 4);
                g.fillStyle(0xe52521);                                            // red flap (V)
                g.fillTriangle(6, 12, 42, 12, 24, 30);
                g.fillStyle(0x9c1c10); g.fillTriangle(6, 12, 24, 30, 14, 12);
                // heart seal (centre)
                g.fillStyle(0xe52521); g.fillRect(20, 19, 3, 3); g.fillRect(25, 19, 3, 3); g.fillRect(20, 22, 8, 2); g.fillRect(22, 24, 4, 2); g.fillRect(23, 26, 2, 1);
                g.generateTexture('piece', 48, 42);

                g.clear();                                  // BOSS mech (Bible §94)
                g.fillStyle(0x3a2a4a); g.fillRect(0, 12, 64, 56);
                g.fillStyle(0x5a4a6a); g.fillRect(4, 16, 56, 44);
                g.fillStyle(0x6a5a7a); g.fillRect(14, 2, 36, 16);
                g.fillStyle(0xff5a55); g.fillRect(18, 6, 28, 7);
                g.fillStyle(0xffffff); g.fillRect(20, 8, 3, 3);
                g.fillStyle(0x2a2034); g.fillRect(-8, 24, 12, 16); g.fillRect(60, 24, 12, 16);
                g.generateTexture('boss', 72, 68);
                g.clear();                                  // boss weak point (reactor)
                g.fillStyle(0xff8a28); g.fillRect(0, 0, 16, 16);
                g.fillStyle(0xffe24a); g.fillRect(4, 4, 8, 8);
                g.generateTexture('boss_core', 16, 16);

                /* ===== SCENERY / DECOR PROPS (item 2/3) — drawn as proper pixel-art
                   TEXTURES instead of flat rectangles, so every prop looks like a
                   sprite in a finished game. Placed by drawDecor() per biome. ===== */
                // jungle palm tree (origin bottom-centre at 24,72)
                g.clear();
                g.fillStyle(0x5a3a1a); g.fillRect(20, 24, 8, 48);            // trunk
                g.fillStyle(0x6e4a24); g.fillRect(20, 24, 3, 48);
                g.fillStyle(0x3a2812); for (var ry = 30; ry < 70; ry += 10) g.fillRect(20, ry, 8, 2); // bark rings
                g.fillStyle(0x2f7a3e);                                       // fronds
                g.fillTriangle(24, 26, 0, 14, 18, 22); g.fillTriangle(24, 26, 48, 14, 30, 22);
                g.fillTriangle(24, 22, 6, 0, 22, 16); g.fillTriangle(24, 22, 42, 0, 26, 16);
                g.fillStyle(0x39943f); g.fillTriangle(24, 24, 14, 4, 24, 14); g.fillTriangle(24, 24, 34, 4, 24, 14);
                g.fillStyle(0xffce4a); g.fillCircle(24, 26, 3);             // coconut cluster
                g.generateTexture('dec_tree', 48, 72);

                // jungle bush
                g.clear();
                g.fillStyle(0x256a30); g.fillEllipse(16, 18, 32, 22);
                g.fillStyle(0x2f8a3e); g.fillEllipse(10, 14, 18, 16); g.fillEllipse(22, 15, 18, 15);
                g.fillStyle(0x46a84e); g.fillEllipse(13, 11, 9, 8);
                g.generateTexture('dec_bush', 32, 28);

                // rock / boulder
                g.clear();
                g.fillStyle(0x5a5560); g.fillEllipse(15, 18, 30, 22);
                g.fillStyle(0x6e6878); g.fillEllipse(12, 13, 16, 12);
                g.fillStyle(0x3e3a48); g.fillRect(2, 22, 26, 4);
                g.generateTexture('dec_rock', 30, 28);

                // military crate (base/inner biomes)
                g.clear();
                g.fillStyle(0x7a5a2a); g.fillRect(0, 0, 28, 28);
                g.fillStyle(0x9a7a3a); g.fillRect(2, 2, 24, 24);
                g.fillStyle(0x5a4420); g.fillRect(2, 2, 24, 3); g.fillRect(2, 23, 24, 3);
                g.fillStyle(0x5a4420); g.fillRect(2, 13, 24, 2);
                g.fillStyle(0x2a2a32); g.fillRect(11, 11, 6, 6);            // stencil mark
                g.fillStyle(0xe52521); g.fillRect(12, 12, 4, 1); g.fillRect(12, 15, 4, 1);
                g.generateTexture('dec_crate', 28, 28);

                // sandbag stack (cover)
                g.clear();
                for (var sr = 0; sr < 3; sr++) for (var sc = 0; sc < 3 - sr; sc++) {
                    var bx0 = 2 + sc * 12 + sr * 6, by0 = 30 - (sr + 1) * 10;
                    g.fillStyle(0x9a8a5a); g.fillRoundedRect(bx0, by0, 12, 10, 3);
                    g.fillStyle(0x7a6a40); g.fillRect(bx0 + 5, by0, 2, 10);
                }
                g.generateTexture('dec_sandbag', 36, 32);

                // watchtower / energy pylon (tall)
                g.clear();
                g.fillStyle(0x3a3a46); g.fillRect(6, 8, 8, 56);             // mast
                g.fillStyle(0x52525e); g.fillRect(6, 8, 3, 56);
                g.fillStyle(0x2a2a34); for (var ty = 14; ty < 60; ty += 8) { g.fillTriangle(2, ty, 18, ty, 10, ty + 6); }
                g.fillStyle(0x6a6a78); g.fillRect(0, 4, 20, 6);            // platform top
                g.fillStyle(0xff5a55); g.fillCircle(10, 4, 3);            // warning light
                g.generateTexture('dec_pylon', 20, 64);

                // snow pine
                g.clear();
                g.fillStyle(0x4a3320); g.fillRect(12, 44, 6, 14);
                g.fillStyle(0x1f5e33); g.fillTriangle(15, 4, 2, 30, 28, 30);
                g.fillTriangle(15, 16, 4, 40, 26, 40); g.fillTriangle(15, 26, 6, 48, 24, 48);
                g.fillStyle(0xffffff); g.fillTriangle(15, 4, 9, 16, 21, 16);   // snow cap
                g.fillTriangle(15, 16, 9, 26, 21, 26);
                g.generateTexture('dec_pine', 30, 58);

                // energy spike crystal
                g.clear();
                g.fillStyle(0xff6a32); g.fillTriangle(10, 0, 0, 30, 20, 30);
                g.fillStyle(0xffb04a); g.fillTriangle(10, 4, 5, 28, 15, 28);
                g.fillStyle(0xffe24a); g.fillRect(9, 8, 2, 14);
                g.generateTexture('dec_spike', 20, 30);

                g.destroy();
            },

            create: function () {
                var self = this;
                this.buildTextures();
                areaNum = this.areaIndex;
                var A = AREAS[areaNum - 1] || AREAS[0]; this.A = A;
                var lvl = effDiffLvl(areaNum); this.lvl = lvl;     // = the mode the player PICKED
                // tiny per-area enemy-density nudge so later biomes feel tougher,
                // WITHOUT changing the displayed difficulty label (purely internal).
                this.areaPush = A.diff === 'hard' ? 0.5 : (A.diff === 'medium' ? 0.25 : 0);
                setHUD();

                // item 3: on touch devices reserve a tall ground band so the
                // surface (and the commando standing on it) sits ABOVE the bottom
                // joystick/buttons zone (~160px) instead of being covered by it.
                var isTouch = !(window.matchMedia && window.matchMedia('(min-width: 980px) and (hover: hover) and (pointer: fine)').matches);
                var GROUND_H = isTouch ? 200 : 80, groundTopY = GH - GROUND_H;
                this.groundTopY = groundTopY;
                // item 4: longer, more challenging stages. Now 7–10.5 screens of
                // run-and-gun per area (+ boss arena). Enemy/pod/piece/platform counts
                // all scale to worldW, so longer = proportionally more action.
                var worldW = GW * (7 + lvl * 1.8) + (A.boss ? GW * 1.4 : 0);
                this.worldW = worldW;
                this.cameras.main.setBackgroundColor(A.tint);

                this.drawBackdrop(A, worldW, groundTopY);

                /* ---- ground + pits (Bible §10 world, §106 forward action) ---- */
                this.solids = this.physics.add.staticGroup();
                var pits = [];
                if (!A.boss) {
                    var gapCols = lvl >= 1 ? (lvl === 2 ? [0.40, 0.62, 0.80] : [0.5, 0.74]) : [0.62];
                    var GAP = (lvl === 2 ? 2.4 : (lvl === 1 ? 2.0 : 1.6)) * TILE;
                    gapCols.forEach(function (f) { pits.push([worldW * f, worldW * f + GAP]); });
                }
                this.pits = pits;
                var segStart = 0;
                while (segStart < worldW) {
                    var nextPit = null;
                    pits.forEach(function (p) { if (p[0] >= segStart && (!nextPit || p[0] < nextPit[0])) nextPit = p; });
                    var segEnd = nextPit ? nextPit[0] : worldW;
                    if (segEnd > segStart) self.addGround(segStart, segEnd, groundTopY, GROUND_H);
                    segStart = nextPit ? nextPit[1] : worldW;
                }
                // platforms spread across the FULL (now longer) world (item 4)
                var platCount = Math.max(4, Math.round((worldW / GW) * (1.4 + lvl * 0.3)));
                for (var pc = 0; pc < platCount; pc++) {
                    var px = GW * 0.7 + (worldW - GW * 1.4) * (pc / Math.max(1, platCount - 1));
                    if (this.inPit(px)) continue;
                    this.addPlatform(px, groundTopY - (60 + (pc % 3) * 46), TILE * 3);
                }
                this.drawDecor(A, worldW, groundTopY);

                /* ---- POOLS (Bible §48-50, §82, §329) ---- */
                this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 64, runChildUpdate: false });
                this.ebullets = this.physics.add.group({ maxSize: 120 });
                this.enemies = this.physics.add.group();
                this.pods = this.physics.add.group();          // weapon pods
                this.pieces = this.physics.add.group();        // invitation pieces (item 2)
                this.powerups = this.physics.add.group();
                this.physics.add.collider(this.enemies, this.solids);
                this.physics.add.collider(this.powerups, this.solids);

                /* ---- PLAYER (Bible §14-15) ---- */
                this.createPlayer(TILE, groundTopY);

                /* ---- enemies + pods + pieces + goal ---- */
                this.spawnEnemies(worldW, groundTopY, TILE);
                this.spawnPods(worldW, groundTopY);
                this.spawnPieces(worldW, groundTopY);
                this.cleared = false; this.won = false; this.auto = null; this.ending = null;
                if (A.boss) { this.spawnBoss(worldW, groundTopY); this.spawnBride(worldW, groundTopY); }
                else this.spawnGate(worldW, groundTopY);

                /* ---- COLLISION MATRIX (Bible §60) ---- */
                this.physics.add.overlap(this.bullets, this.enemies, function (en, bl) { self.bulletHitEnemy(en, bl); });
                this.physics.add.overlap(this.bullets, this.pods, function (pod, bl) { self.bulletHitPod(pod, bl); });
                this.physics.add.overlap(this.bullets, this.pieces, function (pc, bl) { self.bulletHitPiece(pc, bl); });
                this.physics.add.overlap(this.player, this.powerups, function (pl, pu) { self.collectPower(pu); });
                this.physics.add.overlap(this.player, this.enemies, function (pl, en) { self.touchEnemy(en); });
                this.physics.add.overlap(this.player, this.ebullets, function (pl, eb) { self.playerHit(eb); });

                /* ---- keyboard (Bible §383) ---- */
                this.cursors = this.input.keyboard.createCursorKeys();
                this.kFire = this.input.keyboard.addKeys({ a: Phaser.Input.Keyboard.KeyCodes.X, b: Phaser.Input.Keyboard.KeyCodes.Z, c: Phaser.Input.Keyboard.KeyCodes.J });
                this.kWASD = this.input.keyboard.addKeys({ l: Phaser.Input.Keyboard.KeyCodes.A, r: Phaser.Input.Keyboard.KeyCodes.D, u: Phaser.Input.Keyboard.KeyCodes.W, d: Phaser.Input.Keyboard.KeyCodes.S });

                /* ---- camera (Bible §9, §111-112 dead-zone) ---- */
                this.physics.world.setBounds(0, 0, worldW, GH + 240);
                this.cameras.main.setBounds(0, 0, worldW, GH);
                this.cameras.main.startFollow(this.player, true, 0.15, 0.15, -GW * 0.18, 0);
                this.cameras.main.setDeadzone(120, GH);
            },

            /* ---------- builders (item 1: SPRITE-based ground/platforms) ---------- */
            addGround: function (x0, x1, topY, h) {
                var w = x1 - x0, cx = x0 + w / 2;
                // invisible static collider (keeps physics exact)
                var body = this.add.rectangle(cx, topY + h / 2, w, h, 0x000000).setVisible(false); this.solids.add(body);
                // visible TILED sprite floor, tinted to the biome's ground colour
                var floor = this.add.tileSprite(x0, topY + 6, w, h - 6, 'tile_ground').setOrigin(0, 0).setDepth(0);
                floor.setTint(this.A.ground);
                // grass/edge strip tiled along the top, tinted to grass colour
                var top = this.add.tileSprite(x0, topY, w, 10, 'tile_grass').setOrigin(0, 0).setDepth(0);
                top.setTint(this.A.grass);
            },
            addPlatform: function (cx, cy, w) {
                // invisible collider + a single platform sprite stretched to width
                var p = this.add.rectangle(cx, cy, w, 14, 0x000000).setVisible(false).setDepth(1); this.solids.add(p);
                var slab = this.add.image(cx, cy - 1, 'tile_plat').setDepth(1);
                slab.setDisplaySize(w, 16); slab.setTint(this.A.ground);
            },
            drawBackdrop: function (A, worldW, groundTopY) {
                // item 3: layered PARALLAX backdrop (Bible §136-139) — sky glow,
                // celestial body, far silhouette ridge, mid hills, near foothills.
                var biome = A.biome, self = this, i;
                var skyTop = { jungle: 0x3a6a9a, bridge: 0x355a86, base: 0x4a3a52, waterfall: 0x2f7a9a,
                               snow: 0x9fc0e0, energy: 0x6a1424, inner: 0x3a2a55, lair: 0x4a0a1c }[biome] || 0x355a86;
                // LAYER 0 (farthest): sky band that fills above the horizon
                this.add.rectangle(GW / 2, groundTopY * 0.5, GW * 1.2, groundTopY + 40, skyTop).setScrollFactor(0).setDepth(-9).setAlpha(0.9);
                // sun / moon / reactor orb
                var orbCol = (biome === 'energy' || biome === 'lair') ? 0xff5a3c : (biome === 'snow' ? 0xeaf2ff : 0xffe6a0);
                this.add.circle(GW * 0.74, groundTopY * 0.34, biome === 'snow' ? 24 : 30, orbCol).setScrollFactor(0.08).setDepth(-8).setAlpha(0.85);
                // soft clouds / haze (a few drifting blobs, very slow parallax)
                if (biome !== 'energy' && biome !== 'lair' && biome !== 'inner') {
                    for (i = 0; i * 360 < worldW + 360; i++) {
                        var cy = groundTopY * (0.22 + ((i * 7) % 5) * 0.06);
                        this.add.ellipse(i * 380 + 60, cy, 120, 36, 0xffffff).setScrollFactor(0.12).setDepth(-8).setAlpha(0.18);
                    }
                }
                // LAYER 1: far silhouette ridge / city skyline
                if (biome === 'base' || biome === 'inner' || biome === 'energy' || biome === 'lair') {
                    for (i = 0; i * 170 < worldW + 170; i++) {
                        var bh = 70 + (i % 3) * 40;
                        this.add.rectangle(i * 190, groundTopY - bh / 2, 60, bh, darken(A.ground, 0.42)).setScrollFactor(0.22).setDepth(-6);
                        this.add.rectangle(i * 190 + 10, groundTopY - bh + 14, 8, 10, 0xffaa3c).setScrollFactor(0.22).setDepth(-5).setAlpha(0.6);
                    }
                } else {
                    for (i = 0; i * 300 < worldW + 300; i++) {
                        this.add.triangle(i * 320, groundTopY, 0, 0, 150, -140, 300, 0, darken(A.ground, biome === 'snow' ? -0.42 : 0.34)).setScrollFactor(0.2).setDepth(-6);
                        if (biome === 'snow') this.add.triangle(i * 320, groundTopY - 110, 0, 0, 34, -34, 68, 0, 0xffffff).setScrollFactor(0.2).setDepth(-5);
                    }
                }
                // LAYER 2: mid hills/towers
                if (biome === 'base' || biome === 'inner' || biome === 'energy' || biome === 'lair') {
                    for (i = 0; i * 150 < worldW + 150; i++) {
                        var mh = 60 + ((i * 5) % 4) * 30;
                        this.add.rectangle(i * 160 + 40, groundTopY - mh / 2, 46, mh, darken(A.ground, 0.26)).setScrollFactor(0.38).setDepth(-4);
                    }
                } else {
                    for (i = 0; i * 220 < worldW + 220; i++) {
                        this.add.triangle(i * 240, groundTopY, 0, 0, 110, -90, 220, 0, darken(A.ground, biome === 'snow' ? -0.3 : 0.22)).setScrollFactor(0.36).setDepth(-4);
                        if (biome === 'snow') this.add.triangle(i * 240, groundTopY - 70, 0, 0, 26, -22, 52, 0, 0xffffff).setScrollFactor(0.36).setDepth(-3);
                    }
                }
                // LAYER 3 (nearest): foothill mounds just behind the action
                for (i = 0; i * (GW * 0.5) < worldW; i++) this.add.ellipse(i * GW * 0.5, groundTopY + 14, GW * 0.5, GW * 0.34, darken(A.ground, biome === 'snow' ? -0.1 : 0.12)).setScrollFactor(0.6).setDepth(-2);
            },
            drawDecor: function (A, worldW, groundTopY) {
                // item 2/3: lay down TEXTURED scenery props (sprites) so foregrounds
                // look like a finished game. Deterministic placement (hash by x) so
                // it doesn't shimmer between restarts. Props sit ON the ground line.
                var biome = A.biome, self = this, step = 120;
                function place(tex, x, footY, depth, scale) {
                    var s = self.add.image(x, footY, tex).setOrigin(0.5, 1).setDepth(depth == null ? 0 : depth);
                    if (scale) s.setScale(scale);
                    return s;
                }
                var idx = 0;
                for (var x = GW * 0.45; x < worldW - GW * 0.3; x += step, idx++) {
                    if (this.inPit(x)) continue;
                    var v = (Math.sin(x * 12.9898) * 43758.5453) % 1; v = v < 0 ? v + 1 : v;
                    if (biome === 'jungle' || biome === 'bridge') {
                        if (v < 0.45) place('dec_tree', x, groundTopY + 4, 0, 0.9 + v);
                        else if (v < 0.75) place('dec_bush', x, groundTopY + 4, 0);
                        else place('dec_rock', x, groundTopY + 4, 0);
                    } else if (biome === 'waterfall') {
                        if (v < 0.5) place('dec_rock', x, groundTopY + 4, 0, 1 + v * 0.4);
                        else { var f = self.add.rectangle(x, groundTopY - 34, 12, 68, 0x9fe8ff).setDepth(-1).setAlpha(0.45); }
                        if (v > 0.7) place('dec_bush', x, groundTopY + 4, 0);
                    } else if (biome === 'snow') {
                        if (v < 0.6) place('dec_pine', x, groundTopY + 4, 0, 0.9 + v * 0.5);
                        else place('dec_rock', x, groundTopY + 4, 0);
                    } else if (biome === 'base' || biome === 'inner') {
                        if (v < 0.4) place('dec_crate', x, groundTopY + 4, 0);
                        else if (v < 0.7) place('dec_sandbag', x, groundTopY + 4, 0);
                        else place('dec_pylon', x, groundTopY + 4, -1, 0.9 + v * 0.4);
                    } else { // energy / lair
                        if (v < 0.5) place('dec_spike', x, groundTopY + 4, 0, 0.9 + v);
                        else place('dec_pylon', x, groundTopY + 4, -1);
                    }
                }
                // glowing lava/energy lip along the ground for hot biomes
                if (biome === 'energy' || biome === 'lair') this.add.rectangle(worldW / 2, groundTopY + 6, worldW, 8, 0xff5a14).setDepth(2).setAlpha(0.8);
            },
            inPit: function (x) { return (this.pits || []).some(function (p) { return x > p[0] - 4 && x < p[1] + 4; }); },

            /* =========================================================
               PLAYER (Bible §14-37) — sprite + finite state machine.
               State drives the displayed texture each frame.
               ========================================================= */
            createPlayer: function (TILE, groundTopY) {
                // Use the external Contra sprite ONLY if it loaded AND looks like a
                // real multi-frame sheet (≥4 frames). Otherwise procedural (always
                // valid). This guarantees we never render a blank/garbled hero.
                var useExt = false;
                if (this.cwExtOK && this.textures.exists('ext_commando')) {
                    try { useExt = this.textures.get('ext_commando').frameTotal >= 4; } catch (e) { useExt = false; }
                }
                this.useExt = useExt;
                if (useExt && !this.anims.exists('ext_run')) {
                    var tot = this.textures.get('ext_commando').frameTotal - 1;
                    this.anims.create({ key: 'ext_idle', frames: [{ key: 'ext_commando', frame: 0 }], frameRate: 1 });
                    this.anims.create({ key: 'ext_run', frames: this.anims.generateFrameNumbers('ext_commando', { start: 0, end: Math.min(5, tot) }), frameRate: 12, repeat: -1 });
                }
                var p = this.physics.add.sprite(TILE, groundTopY - 40, useExt ? 'ext_commando' : 'cmd_idle').setDepth(5);
                if (useExt) {
                    var fw = this.textures.get('ext_commando').get(0).width || 37;
                    var fh = this.textures.get('ext_commando').get(0).height || 45;
                    p.body.setSize(Math.round(fw * 0.5), Math.round(fh * 0.8)).setOffset(Math.round(fw * 0.25), Math.round(fh * 0.18));
                } else {
                    p.body.setSize(20, 32).setOffset(6, 2);
                }
                p.body.setCollideWorldBounds(true);
                p.face = 1; p.pstate = 'idle'; p.dead = false; p.invincibleUntil = 0;
                p.nextFire = 0; p.weapon = cheat ? 'S' : 'R'; setWeaponHUD(p.weapon);
                p.coyoteUntil = 0;                          // Bible §25 coyote time
                this.player = p;
                this.physics.add.collider(p, this.solids);
            },
            setPlayerState: function (s) {
                var p = this.player; if (p.pstate === s) return; p.pstate = s;
            },

            /* =========================================================
               WEAPON SYSTEM (Bible §38-53, §301-337) — one fire() switches on
               weapon type; bullets come from the pool.
               ========================================================= */
            fire: function (time) {
                var p = this.player; if (p.dead) return;
                var w = WCONF[p.weapon] || WCONF.R;
                if (time < p.nextFire) return;
                p.nextFire = time + w.cd;
                // aim vector from input (8-direction-ish)
                var up = this.inUp(), down = this.inDown() && !p.body.blocked.down;
                var ax = p.face, ay = 0;
                if (up) { ay = -1; ax = this.inLeft() ? -1 : (this.inRight() ? 1 : 0); }
                else if (down) { ay = 1; ax = this.inLeft() ? -1 : (this.inRight() ? 1 : (p.body.blocked.down ? p.face : 0)); }
                if (ax === 0 && ay === 0) ax = p.face;
                var m = Math.sqrt(ax * ax + ay * ay) || 1; ax /= m; ay /= m;
                var proneY = p.pstate === 'prone' ? 12 : -2;     // item 4: low muzzle when ducking
                var mx = p.x + ax * 16, my = p.y + proneY + ay * 10;
                var base = Math.atan2(ay, ax);
                if (w.type === 'multi') { for (var s = -2; s <= 2; s++) this.spawnBullet(mx, my, base + s * 0.22, w); sfx('spread'); }
                else if (w.type === 'cone') { for (var k = 0; k < 3; k++) this.spawnBullet(mx, my, base + (Math.random() - 0.5) * 0.5, w); sfx('fire'); }
                else { this.spawnBullet(mx, my, base, w); sfx(w.type === 'rapid' ? 'machine' : (w.type === 'pierce' ? 'laser' : 'shoot')); }
            },
            spawnBullet: function (x, y, ang, w) {
                var b = this.bullets.get(x, y, '__white');
                if (!b) return;
                b.setActive(true).setVisible(true).setDepth(5);
                b.body.setAllowGravity(false);
                b.setDisplaySize(w.big ? 13 : 9, w.big ? 6 : 4);
                b.setTint(w.id === 'F' ? 0xff8a1e : (w.big ? 0xbfe0ff : 0xffe24a));
                b.body.setVelocity(Math.cos(ang) * w.spd, Math.sin(ang) * w.spd);
                b.rotation = ang;
                b.dmg = w.dmg; b.pierce = w.pierce; b.hitset = null;
                b.dieAt = this.time.now + 1200;
            },
            recycle: function (b) { b.setActive(false).setVisible(false); if (b.body) b.body.stop(); },

            /* =========================================================
               ENEMY SYSTEM (Bible §63-89, §339-356) — manager spawns by area;
               each enemy carries an AI state updated per frame.
               ========================================================= */
            spawnEnemies: function (worldW, groundTopY, TILE) {
                var lvl = this.lvl, self = this;
                var n = Math.round((4 + lvl * 3 + (this.areaPush || 0) * 4) * (worldW / (GW * 3)));
                this.enemySpd = lvl === 2 ? 80 : (lvl === 1 ? 60 : 45);
                this.fireRate = lvl === 2 ? 1100 : (lvl === 1 ? 1600 : 2400);
                var kinds = lvl === 0 ? ['soldier', 'runner', 'soldier'] : (lvl === 1 ? ['soldier', 'runner', 'turret', 'sniper'] : ['soldier', 'runner', 'turret', 'sniper', 'heavy', 'drone']);
                for (var i = 0; i < n; i++) {
                    var x = GW * 0.9 + (worldW - GW * 1.6) * (i / Math.max(1, n));
                    if (this.inPit(x)) x += TILE * 3;
                    this.makeEnemy(x, groundTopY, kinds[i % kinds.length]);
                }
            },
            makeEnemy: function (x, groundTopY, kind) {
                var tex = { soldier: 'en_soldier', runner: 'en_runner', heavy: 'en_heavy', turret: 'en_turret', sniper: 'en_sniper', drone: 'en_drone' }[kind] || 'en_soldier';
                var e = this.physics.add.sprite(x, groundTopY - 18, tex).setDepth(4);
                e.kind = kind; e.estate = 'patrol'; e.fireT = 600 + Math.random() * this.fireRate;
                e.hp = kind === 'turret' ? 3 : (kind === 'heavy' ? 8 : 1);
                e.score = kind === 'turret' ? 200 : (kind === 'drone' ? 300 : (kind === 'heavy' ? 400 : 100));
                if (kind === 'turret' || kind === 'sniper') { e.body.setImmovable(true); e.body.setAllowGravity(false); e.y = groundTopY - 13; }
                else if (kind === 'drone') { e.body.setAllowGravity(false); e.y = groundTopY - 150; e.baseY = e.y; e.driftT = Math.random() * 6; e.body.setVelocityX(-this.enemySpd); }
                else { var sp = this.enemySpd * (kind === 'runner' ? 1.5 : (kind === 'heavy' ? 0.45 : 1)); e.body.setVelocityX(-sp); e.dir = -1; }
                this.enemies.add(e);
            },
            enemyAI: function (e, delta) {
                var p = this.player, self = this, dist = Math.abs(e.x - p.x);
                // movement per kind
                if (e.kind === 'drone') {
                    e.driftT += delta * 0.004; e.y = e.baseY + Math.sin(e.driftT) * 36;     // Bible §74 sine
                } else if (e.kind !== 'turret' && e.kind !== 'sniper') {
                    if (e.body.blocked.left) { e.body.setVelocityX(Math.abs(e.body.velocity.x)); e.dir = 1; }
                    else if (e.body.blocked.right) { e.body.setVelocityX(-Math.abs(e.body.velocity.x)); e.dir = -1; }
                    if (e.setFlipX) e.setFlipX(e.dir > 0);
                }
                // attack (Bible §345-347) — only engage when the enemy is ACTUALLY
                // on-screen (item 3). Previously gated on distance-to-player, so an
                // enemy still off the right edge of the camera could shoot at you
                // (unfair "bullets from nowhere"). Now we require the enemy to be
                // inside the camera's world view (tiny inward margin so it must be
                // genuinely visible before it opens fire).
                var view = this.cameras.main.worldView;
                var onScreen = e.x > view.x + 8 && e.x < view.right - 8 && e.y > view.y - 40 && e.y < view.bottom + 40;
                if (this.lvl >= 1 && onScreen && dist < GW * 0.72 && !p.dead && !this.won) {
                    e.fireT -= delta;
                    if (e.fireT <= 0) {
                        e.fireT = this.fireRate + Math.random() * 600;
                        var dx = p.x - e.x, dy = p.y - e.y, mm = Math.sqrt(dx * dx + dy * dy) || 1;
                        if (e.kind === 'turret' || e.kind === 'sniper' || e.kind === 'drone') this.enemyShoot(e, dx / mm, dy / mm);
                        else this.enemyShoot(e, e.dir || -1, 0);
                    }
                }
            },
            enemyShoot: function (e, ax, ay) {
                var spd = 210 + this.lvl * 45;
                var b = this.ebullets.get(e.x, e.y, '__white');
                if (!b) return;
                b.setActive(true).setVisible(true).setDepth(4).setDisplaySize(8, 8).setTint(0xff5a55);
                b.body.setAllowGravity(false); b.body.setVelocity(ax * spd, ay * spd);
                b.dieAt = this.time.now + 2600;
            },

            /* ---------- weapon pods (shoot → drop weapon power-up) ---------- */
            spawnPods: function (worldW, groundTopY) {
                // item 4: scale weapon pods to the longer world (was a flat 3)
                var self = this, slots = Math.max(3, Math.round((worldW / GW) * 0.8));
                for (var i = 0; i < slots; i++) {
                    var x = GW * 1.2 + (worldW - GW * 2.0) * (i / Math.max(1, slots - 1));
                    if (this.inPit(x)) x += TILE * 2;
                    var y = groundTopY - (96 + (i % 2) * 40);
                    var pod = self.physics.add.sprite(x, y, 'pod_weapon').setDepth(3);
                    pod.body.setAllowGravity(false); pod.alive = true; pod.baseY = y; pod.bobT = Math.random() * 6;
                    pod.label = self.add.text(x, y - 24, '!', { fontFamily: 'monospace', fontSize: '18px', color: '#9ecbff' }).setOrigin(0.5).setDepth(3);
                    self.pods.add(pod);
                }
            },
            /* ---------- invitation pieces (item 2) — dedicated collectible ----------
               Big glowing envelope, clearly different from weapon pods. Shooting
               one unlocks an invitation section. Quota per area from INFOS. */
            spawnPieces: function (worldW, groundTopY) {
                var self = this, quota = infoQuotaFor(areaNum), base = areaInfoOffset(areaNum);
                for (var i = 0; i < quota; i++) {
                    // spread the pieces evenly through the (longer) world so the player
                    // discovers them across the whole run, not all at the start (item 4).
                    var x = GW * 0.9 + (worldW - GW * 1.8) * ((i + 0.5) / Math.max(1, quota));
                    if (this.inPit(x)) x += TILE * 2;
                    // reachable height: ~ jump-arc height above the surface (not so high
                    // the player can never shoot it while running past).
                    var y = groundTopY - (96 + (i % 2) * 36);
                    var pc = self.physics.add.sprite(x, y, 'piece').setDepth(5);   // above ground/decor, NOT scaled
                    pc.body.setAllowGravity(false);                                 // default 48x42 body = generous hit area
                    pc.alive = true; pc.baseY = y; pc.bobT = Math.random() * 6;
                    pc.info = INFOS[(base + i) % INFOS.length];
                    // pulsing halo ring BEHIND the envelope + a label pinned just below
                    // it (both tracked every frame in update so they never drift apart).
                    pc.halo = self.add.circle(x, y, 34, 0xffce4a, 0.20).setDepth(4);
                    pc.label = self.add.text(x, y + 30, pc.info.label, { fontFamily: 'monospace', fontSize: '10px', color: '#ffce4a', backgroundColor: 'rgba(8,12,20,.7)', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(6);
                    self.pieces.add(pc);
                }
            },
            dropPower: function (x, y, wk) {                  // Bible §103 drop chance via caller
                var col = { M: 0x78c878, S: 0xff5a3c, L: 0x78b4ff, F: 0xff8a28 }[wk] || 0xffce4a;
                var pu = this.add.rectangle(x, y, 18, 18, col).setDepth(4);
                this.physics.add.existing(pu); pu.weapon = wk; pu.body.setVelocityY(-140);
                pu.letter = this.add.text(x, y, wk, { fontFamily: 'monospace', fontSize: '12px', color: '#000' }).setOrigin(0.5).setDepth(5);
                this.powerups.add(pu);
            },
            collectPower: function (pu) {
                this.player.weapon = pu.weapon; setWeaponHUD(pu.weapon); addScore(200); sfx('power');
                toast('SENJATA: ' + (WCONF[pu.weapon] || WCONF.R).name + '!');
                if (pu.letter) pu.letter.destroy(); pu.destroy();
            },

            /* ---------- gate / boss (Bible §90-100) ---------- */
            spawnGate: function (worldW, groundTopY) {
                var gx = worldW - GW * 0.5;
                // item 1: finish-stage TOWER as a sprite (foot on the ground line)
                this.gateTower = this.add.image(gx, groundTopY + 4, 'tower_finish').setOrigin(0.5, 1).setDepth(2);
                // invisible hit body over the tower's lower core
                var g = this.add.rectangle(gx, groundTopY - 70, 40, 140, 0x000000).setVisible(false);
                this.physics.add.existing(g, true);
                g.hp = 6 + this.lvl * 2; g.maxhp = g.hp; g.broken = false;
                this.gate = g;
                this.gateCore = this.add.circle(gx, groundTopY - 90, 11, 0xff5a28).setDepth(4);
                this.gateHpText = this.add.text(gx, groundTopY - 160, 'CORE ' + g.hp + '/' + g.maxhp, { fontFamily: 'monospace', fontSize: '11px', color: '#ff8a3a' }).setOrigin(0.5).setDepth(4);
                this.physics.add.overlap(this.bullets, g, function (gg, bl) { this.bulletHitGate(bl); }, null, this);
            },
            spawnBoss: function (worldW, groundTopY) {
                var bx = worldW - GW * 0.9;
                var b = this.physics.add.sprite(bx, groundTopY - 46, 'boss').setDepth(4);
                b.body.setAllowGravity(false);
                b.alive = true; b.hp = 16 + this.lvl * 3; b.maxhp = b.hp; b.phase = 1; b.dir = -1; b.fireT = 1200; b.invuln = 0;
                b.body.setVelocityX(-(40 + this.lvl * 14));
                this.boss = b; this.bossL = bx - GW * 0.5; this.bossR = worldW - GW * 0.2;
                // weak point (Bible §366-367) — double damage zone
                this.bossCore = this.physics.add.sprite(bx, groundTopY - 30, 'boss_core').setDepth(5);
                this.bossCore.body.setAllowGravity(false);
                this.bossHpBg = this.add.rectangle(bx, groundTopY - 100, 64, 7, 0x000000).setDepth(6);
                this.bossHp = this.add.rectangle(bx - 32, groundTopY - 100, 64, 5, 0x43b047).setOrigin(0, 0.5).setDepth(7);
                this.physics.add.overlap(this.bullets, b, function (bb, bl) { this.bulletHitBoss(bl, false); }, null, this);
                this.physics.add.overlap(this.bullets, this.bossCore, function (cc, bl) { this.bulletHitBoss(bl, true); }, null, this);
                this.physics.add.overlap(this.player, b, function () { if (cheat) this.bulletHitBoss(null, false); else this.playerHit(null); }, null, this);
                sfx('alarm');
            },
            spawnBride: function (worldW, groundTopY) {
                var bx = worldW - GW * 0.32; this.prisonX = bx;
                this.add.rectangle(bx, groundTopY - 40, 44, 70, 0x0d0a14).setDepth(2);
                for (var i = 0; i < 4; i++) this.add.rectangle(bx - 16 + i * 11, groundTopY - 40, 3, 70, 0x9aa0ab).setDepth(3);
                var pr = this.add.rectangle(bx, groundTopY - 24, 16, 26, 0xffffff).setDepth(2);
                pr.head = this.add.circle(bx, groundTopY - 42, 7, 0xffd9b8).setDepth(2);
                pr.crown = this.add.rectangle(bx, groundTopY - 50, 12, 4, 0xffd84a).setDepth(2);
                pr.rescued = false; this.bride = pr;
            },

            /* ---------- combat resolution ---------- */
            bulletHitEnemy: function (en, bl) {
                if (!en.active || !bl.active) return;
                en.hp -= (bl.dmg || 1); this.juiceSmall(bl.x, bl.y);
                if (!bl.pierce) this.recycle(bl);
                if (en.hp <= 0) { addScore(en.score || 100); this.killEnemy(en); }
                else sfx('hit');
            },
            killEnemy: function (en) {
                this.explode(en.x, en.y, 'small');
                // drop chance (Bible §103) ~22%
                if (Math.random() < 0.22) this.dropPower(en.x, en.y, POD_DROPS[Math.floor(Math.random() * POD_DROPS.length)]);
                en.destroy();
            },
            bulletHitPod: function (pod, bl) {                 // weapon pod
                if (!pod.alive || !bl.active) return;
                pod.alive = false; if (!bl.pierce) this.recycle(bl);
                this.explode(pod.x, pod.y, 'small');
                this.dropPower(pod.x, pod.y, POD_DROPS[Math.floor(Math.abs(pod.x)) % POD_DROPS.length]);
                if (pod.label) pod.label.destroy();
                addScore(100); sfx('power');
                pod.destroy();
            },
            bulletHitPiece: function (pc, bl) {                // invitation piece (item 2)
                if (!pc.alive || !bl.active) return;
                pc.alive = false; if (!bl.pierce) this.recycle(bl);
                this.explode(pc.x, pc.y, 'medium'); this.cameras.main.flash(90, 255, 220, 120);
                if (pc.label) pc.label.destroy(); if (pc.halo) pc.halo.destroy();
                if (pc.info) { unlockInfo(pc.info); addScore(300); sfx('unlock'); toast('💌 KEPINGAN TERBUKA: ' + pc.info.label + '<br><span style="font-size:7px;color:#ffce4a">Ketuk ikon kanan ▶ untuk membaca</span>', 2200); }
                pc.destroy();
            },
            bulletHitGate: function (bl) {
                var g = this.gate; if (!g || g.broken || !bl.active) return;
                if (!bl.pierce) this.recycle(bl);
                g.hp -= (bl.dmg || 1); sfx('hit'); this.juiceSmall(g.x, this.player.y); addScore(100);
                this.gateHpText.setText('CORE ' + Math.max(0, g.hp) + '/' + g.maxhp);
                this.gateCore.setScale(1 + Math.random() * 0.3);
                if (g.hp <= 0) {
                    g.broken = true; this.cleared = true; this.gateCore.setFillStyle(0x331111);
                    if (this.gateTower) this.gateTower.setTint(0x9fe8a0);   // tower lights up = path open
                    this.explode(g.x, g.y, 'big'); addScore(1000); this.gateHpText.setText('TERBUKA!');
                    this.cameras.main.shake(160, 0.012);
                    toast('GERBANG TERBUKA!<br><span style="font-size:7px;color:#7bd47e">Maju ke ujung ▶</span>', 2000);
                }
            },
            bulletHitBoss: function (bl, weak) {
                var b = this.boss; if (!b || !b.alive || this.time.now < b.invuln) return;
                if (bl) { if (!bl.pierce) this.recycle(bl); }
                var dmg = (bl ? bl.dmg : 1) * (weak ? 2 : 1);   // weak point ×2 (Bible §367)
                b.hp -= dmg; b.invuln = this.time.now + 160; sfx('hit'); this.juiceSmall(b.x, b.y); addScore(weak ? 400 : 200);
                this.bossHp.width = 64 * Math.max(0, b.hp / b.maxhp);
                this.bossHp.setFillStyle(b.hp / b.maxhp > 0.5 ? 0x43b047 : (b.hp / b.maxhp > 0.25 ? 0xfac000 : 0xe52521));
                var ph = b.hp > b.maxhp * 0.66 ? 1 : (b.hp > b.maxhp * 0.33 ? 2 : 3);
                if (ph !== b.phase) { b.phase = ph; b.body.setVelocityX(b.dir * (40 + ph * 24)); this.cameras.main.flash(80, 255, 120, 80); toast('BOSS PHASE ' + ph + '!', 1000); sfx('alarm'); }
                if (b.hp <= 0) {
                    b.alive = false; this.explode(b.x, b.y, 'boss'); addScore(3000);
                    this.bossHp.setVisible(false); this.bossHpBg.setVisible(false); this.bossCore.destroy(); b.setTint(0x444444);
                    this.cameras.main.shake(260, 0.02); this.cameras.main.flash(180, 255, 255, 255);
                    toast('BOSS KALAH! Selamatkan sang putri ▶', 2200);
                }
            },
            touchEnemy: function (en) { if (!en.active) return; if (cheat) { addScore(100); this.killEnemy(en); } else this.playerHit(null); },

            /* =========================================================
               DAMAGE (Bible §26-28) — one-hit death + invincibility window.
               EASY mode: first hit only downgrades weapon (theme-friendly).
               ========================================================= */
            playerHit: function (eb) {
                if (eb && eb.recycleMark !== true) { this.recycle(eb); }
                var p = this.player; if (p.dead || cheat) return;
                // immune during the boss-rescue cutscene (item 2) — a stray bullet
                // must NOT kill & restart the area mid-rescue, which looked like a freeze.
                if (this.won || (this.ending && this.ending.phase && this.ending.phase !== 'fight')) return;
                if (this.time.now < p.invincibleUntil) return;
                if (gameDiff === 'easy' && p.weapon !== 'R') { p.weapon = 'R'; setWeaponHUD('R'); p.invincibleUntil = this.time.now + 1400; sfx('hit'); toast('SENJATA HILANG!'); return; }
                this.killPlayer();
            },
            killPlayer: function () {
                var p = this.player; if (p.dead) return;
                p.dead = true; this.setPlayerState('dead'); p.setTexture('cmd_dead');
                sfx('die'); this.explode(p.x, p.y, 'medium'); this.cameras.main.shake(180, 0.014);
                p.body.setVelocity(0, -260); p.body.setCollideWorldBounds(false);
                var self = this; this.time.delayedCall(950, function () { self.respawn(); });
            },
            respawn: function () {
                lives--; if (lives <= 0) { lives = startLives(); score = 0; }
                setHUD(); this.scene.restart({ area: this.areaIndex });
            },

            /* =========================================================
               COMBAT JUICE (Bible §368-373, §442-446)
               ========================================================= */
            juiceSmall: function (x, y) { spawnBurst(this, x, y, 0xffd24a, 3); },
            explode: function (x, y, size) {
                var n = size === 'boss' ? 30 : (size === 'big' ? 22 : (size === 'medium' ? 12 : 8));
                spawnBurst(this, x, y, size === 'small' ? 0xff8a3a : 0xffd24a, n);
                sfx('explode');
                if (size === 'small') return;
                this.cameras.main.shake(size === 'boss' ? 260 : 120, size === 'boss' ? 0.02 : 0.01);
            },

            /* ---------- input abstraction reads ---------- */
            inLeft: function () { return this.cursors.left.isDown || this.kWASD.l.isDown || touch.left; },
            inRight: function () { return this.cursors.right.isDown || this.kWASD.r.isDown || touch.right; },
            inUp: function () { return this.cursors.up.isDown || this.kWASD.u.isDown || touch.up; },
            inDown: function () { return this.cursors.down.isDown || this.kWASD.d.isDown || touch.down; },
            inJump: function () { return this.cursors.up.isDown || this.kWASD.u.isDown || touch.jump; },
            inFire: function () { return this.kFire.a.isDown || this.kFire.b.isDown || this.kFire.c.isDown || touch.fire; },

            /* =========================================================
               UPDATE LOOP (Bible §62 order: input→state→move→weapon→anim→…)
               ========================================================= */
            update: function (time, delta) {
                var p = this.player; if (!p || !p.body) return;
                var A = this.A, self = this;

                // pods bob
                this.pods.getChildren().forEach(function (pod) { if (!pod.alive) return; pod.bobT += delta * 0.004; var ny = pod.baseY + Math.sin(pod.bobT) * 8; pod.y = ny; if (pod.label) pod.label.y = ny - 24; });
                this.pieces.getChildren().forEach(function (pc) { if (!pc.alive) return; pc.bobT += delta * 0.004; var ny = pc.baseY + Math.sin(pc.bobT) * 10; pc.y = ny; if (pc.label) { pc.label.x = pc.x; pc.label.y = ny + 30; } if (pc.halo) { pc.halo.x = pc.x; pc.halo.y = ny; pc.halo.setScale(1 + Math.sin(pc.bobT * 2) * 0.12); } });
                this.powerups.getChildren().forEach(function (pu) { if (pu.letter) { pu.letter.x = pu.x; pu.letter.y = pu.y; } });
                // bullet lifetime/cull (Bible §50, §178)
                this.bullets.getChildren().forEach(function (b) { if (b.active && time > b.dieAt) self.recycle(b); });
                this.ebullets.getChildren().forEach(function (b) { if (b.active && time > b.dieAt) self.recycle(b); });

                // pit death
                if (!p.dead && p.y > GH + 90) { if (cheat) p.body.reset(this.cameras.main.scrollX + 40, this.groundTopY - 60); else this.killPlayer(); }
                if (p.dead) return;

                // boss cutscene takes over (Bible §99-100 boss arena)
                if (A.boss && this.bossEnding(time)) { this.animatePlayer(); return; }

                // ---- INPUT ----
                var left = this.inLeft(), right = this.inRight(), jump = this.inJump(), fire = this.inFire(), down = this.inDown();
                if (this.auto === 'right') { left = false; right = true; jump = false; fire = false; }
                else if (this.auto === 'stop') { left = right = jump = fire = false; }
                var onGround = p.body.blocked.down;
                if (onGround) p.coyoteUntil = time + 100;        // Bible §25
                var prone = down && onGround && !this.auto;

                // ---- MOVEMENT (Bible §17-22) ----
                var SPD = this.auto ? 95 : 200;
                if (!prone && left) { p.body.setVelocityX(-SPD); p.face = -1; }
                else if (!prone && right) { p.body.setVelocityX(SPD); p.face = 1; }
                else p.body.setVelocityX(0);
                // ---- JUMP (Bible §23, coyote §25) ----
                if (jump && !prone && (onGround || time < p.coyoteUntil) && !p._jumpHeld) { p.body.setVelocityY(-500); p.coyoteUntil = 0; sfx('jump'); }
                p._jumpHeld = jump;
                // ---- WEAPON ----
                if (fire) this.fire(time);

                // ---- ENEMIES ----
                this.enemies.getChildren().forEach(function (e) { if (e.active) self.enemyAI(e, delta); });

                // ---- GATE CLEAR → reach end ----
                if (!A.boss && this.cleared && !this.won && p.x > this.worldW - GW * 0.34) this.finishArea();

                // ---- STATE MACHINE → ANIMATION (Bible §29-37, §403-407) ----
                this.updatePlayerState(prone, onGround, down);
                this.animatePlayer();
            },
            updatePlayerState: function (prone, onGround, down) {
                var p = this.player;
                if (p.dead) { this.setPlayerState('dead'); return; }
                if (!onGround) this.setPlayerState(p.body.velocity.y < 0 ? 'jump' : 'fall');
                else if (prone) this.setPlayerState('prone');
                else if (Math.abs(p.body.velocity.x) > 5) this.setPlayerState('run');
                else this.setPlayerState('idle');
            },
            animatePlayer: function () {
                var p = this.player;
                if (this.useExt) {
                    // external Contra sheet: simple run/idle anim (no aim frames)
                    if (p.pstate === 'run' && !p.dead) { if (p.anims.getName() !== 'ext_run') p.anims.play('ext_run', true); }
                    else { p.anims.stop(); p.setFrame(0); }
                } else {
                    var key = 'cmd_idle';
                    if (p.dead) key = 'cmd_dead';
                    else if (p.pstate === 'prone') key = 'cmd_prone';                 // item 4
                    else if (this.inUp() && this.auto !== 'right') key = 'cmd_up';
                    else if (this.inDown() && !p.body.blocked.down) key = 'cmd_down';  // aerial down-shot
                    else if (p.pstate === 'run') key = (Math.floor(this.time.now / 110) % 2 ? 'cmd_run1' : 'cmd_run2');
                    if (p.texture && p.texture.key !== key) p.setTexture(key);
                }
                // prone shrinks the hitbox so the player ducks under bullets
                // (procedural sprite only; external sheet keeps its body)
                if (!this.useExt) {
                    var wantProne = p.pstate === 'prone';
                    if (wantProne && !p._proneBody) { p.body.setSize(28, 16).setOffset(2, 18); p._proneBody = true; }
                    else if (!wantProne && p._proneBody) { p.body.setSize(20, 32).setOffset(6, 2); p._proneBody = false; }
                }
                p.setFlipX(p.face < 0);
                p.setAlpha(this.time.now < p.invincibleUntil && Math.floor(this.time.now / 80) % 2 ? 0.4 : 1);
                // keep boss UI glued
                var b = this.boss;
                if (b && b.alive) { this.bossCore.x = b.x; this.bossCore.y = b.y + 14; this.bossHpBg.x = b.x; this.bossHpBg.y = b.y - 56; this.bossHp.x = b.x - 32; this.bossHp.y = b.y - 56; }
            },

            /* ---------- area finish (Bible §116) ---------- */
            finishArea: function () {
                this.won = true; this.auto = 'stop'; addScore(2000);
                bestScore = Math.max(bestScore, score); bestArea = Math.max(bestArea, areaNum); persist();
                sfx('clear'); this.cameras.main.flash(120, 255, 255, 200);
                this.time.delayedCall(700, function () { showAreaClear(); });
            },

            /* ---------- boss ending cutscene (Bible §99-100,§116 rescue) ----------
               IMPORTANT: when this returns true, update() early-returns and SKIPS the
               normal movement block — so the cutscene MUST drive the player's own
               velocity here, otherwise the player freezes after the boss dies (the
               auto-walk-to-prison never moves). cutsceneMove() does that. */
            cutsceneMove: function () {
                var p = this.player; if (!p || !p.body) return;
                if (this.auto === 'right') { p.body.setVelocityX(95); p.face = 1; p.pstate = 'run'; }
                else if (this.auto === 'left') { p.body.setVelocityX(-95); p.face = -1; p.pstate = 'run'; }
                else { p.body.setVelocityX(0); p.pstate = 'idle'; }   // 'stop' or null
            },
            bossEnding: function (time) {
                var b = this.boss, p = this.player; if (this.won) { this.cutsceneMove(); return true; }
                if (!this.ending) this.ending = { phase: 'fight' };
                var E = this.ending, self = this;
                if (E.phase === 'fight') {
                    if (b && b.alive) {
                        if (b.x < this.bossL) b.body.setVelocityX(Math.abs(b.body.velocity.x) || 50);
                        if (b.x > this.bossR) b.body.setVelocityX(-(Math.abs(b.body.velocity.x) || 50));
                        b.dir = b.body.velocity.x < 0 ? -1 : 1;
                        b.fireT -= this.game.loop.delta;
                        if (b.fireT <= 0 && !p.dead) {
                            b.fireT = Math.max(480, 1200 - b.phase * 230);
                            var dx = p.x - b.x, dy = p.y - b.y, ang = Math.atan2(dy, dx);
                            for (var s = -1; s <= 1; s++) this.enemyShoot(b, Math.cos(ang + s * 0.25), Math.sin(ang + s * 0.25));
                            if (b.phase >= 2 && Math.random() < 0.5) this.spawnMinion();   // Bible §365
                        }
                        if (p.x > b.x - 44) p.x = b.x - 44;
                        return false;   // normal input → player fights
                    }
                    // boss is dead → begin rescue march (death toast already shown
                    // in bulletHitBoss; just start walking).
                    E.phase = 'approach'; this.auto = 'right';
                }
                if (E.phase === 'approach') {
                    this.auto = 'right'; this.cutsceneMove();
                    if (p.x >= this.prisonX - 60) { p.body.setVelocityX(0); p.x = this.prisonX - 60; this.auto = 'stop'; E.phase = 'free'; E.t = time; this.freeBride(); }
                    return true;
                }
                if (E.phase === 'free') { this.auto = 'stop'; this.cutsceneMove(); if (time - E.t > 1100) { E.phase = 'together'; toast('Jalan bareng ke titik aman... ♥', 1500); } return true; }
                if (E.phase === 'together') {
                    this.auto = 'right'; this.cutsceneMove();
                    if (this.bride) { var b2 = this.bride; b2.x = p.x - 24; b2.head.x = p.x - 24; b2.crown.x = p.x - 24; b2.y = p.y + 4; b2.head.y = p.y - 14; b2.crown.y = p.y - 22; }
                    if (p.x > this.worldW - GW * 0.16) { p.body.setVelocityX(0); this.auto = 'stop'; E.phase = 'done'; this.bossFinale(); }
                    return true;
                }
                // phase 'done' — hold still until showWin()
                this.cutsceneMove();
                return true;
            },
            spawnMinion: function () {
                if (this.enemies.countActive(true) > 10) return;
                this.makeEnemy(this.boss.x - 30, this.groundTopY, 'runner');
            },
            freeBride: function () { sfx('power'); toast('♥ SANG PUTRI BEBAS! ♥', 1700); if (this.bride) this.bride.rescued = true; this.cameras.main.flash(120, 255, 230, 240); },
            bossFinale: function () {
                this.won = true; completed = true; addScore(3000);
                bestScore = Math.max(bestScore, score); bestArea = Math.max(bestArea, areaNum);
                INFOS.forEach(function (info) { unlocked[info.key] = true; });
                updateViewBtn(); persist(); sfx('win'); setHUD();
                this.cameras.main.flash(200, 255, 255, 200);
                this.time.delayedCall(1400, function () { showWin(); });
            }
        });

        var game = new Phaser.Game({
            type: Phaser.AUTO, parent: 'cw-stage', width: GW, height: GH,
            physics: { default: 'arcade', arcade: { gravity: { y: 1000 }, debug: false } },
            scene: Scene
        });
        G = { game: game, scene: null };
        game.events.once('ready', function () { G.scene = game.scene.getScene('main'); });
        setTimeout(function () { if (!G.scene) G.scene = game.scene.getScene('main'); }, 200);

        onCleanup(function () { try { game.destroy(true); } catch (e) {} G = null; });

        // action buttons → InputManager flags (Bible §386-394)
        function hold(id, key) {
            var el = $(id); if (!el) return;
            function on(e) { e.preventDefault(); touch[key] = true; el.classList.add('is-pressed'); audio(); }
            function off(e) { if (e) e.preventDefault(); touch[key] = false; el.classList.remove('is-pressed'); }
            el.addEventListener('touchstart', on, { passive: false });
            el.addEventListener('touchend', off, { passive: false });
            el.addEventListener('touchcancel', off, { passive: false });
            el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
            onCleanup(function () { el.removeEventListener('touchstart', on); el.removeEventListener('touchend', off); el.removeEventListener('mousedown', on); el.removeEventListener('mouseup', off); });
        }
        hold('cw-jump', 'jump'); hold('cw-fire', 'fire');

        // ANALOG JOYSTICK (item 3, Bible §391-392) → drag direction sets
        // left/right/up/down flags. Dead-zone avoids accidental input; the nub
        // follows the finger within the ring.
        bindJoystick(touch);

        var goId = setTimeout(function () { if (G && G.scene && startArea && startArea !== 1) G.scene.scene.restart({ area: startArea }); }, 140);
        onCleanup(function () { clearTimeout(goId); });
    }

    /* small particle burst shared by the scene (Bible §145-147 particle) */
    function spawnBurst(scene, x, y, color, n) {
        for (var i = 0; i < n; i++) {
            var ang = (Math.PI * 2 * i) / n, spd = 40 + Math.random() * 70;
            var c = scene.add.circle(x, y, 3, color).setDepth(7);
            scene.tweens.add({ targets: c, x: x + Math.cos(ang) * spd, y: y + Math.sin(ang) * spd, alpha: 0, duration: 420, onComplete: function () { c.destroy(); } });
        }
    }

    /* =================================================================
       ANALOG JOYSTICK (item 3) — drag the nub; direction → touch flags. The
       Player reads the same flags as keyboard (input abstraction, Bible §382).
       ================================================================= */
    function bindJoystick(touch) {
        var joy = $('cw-joy'), nub = $('cw-joy-nub'); if (!joy || !nub) return;
        var activeId = null, cx = 0, cy = 0, R = 0, DEAD = 0.30;
        function center() { var r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width / 2 - 6; }
        function setDir(dx, dy) {
            var mag = Math.sqrt(dx * dx + dy * dy) || 1, cm = Math.min(mag, R);
            var ux = (dx / mag) * cm, uy = (dy / mag) * cm;
            nub.style.transform = 'translate(' + ux.toFixed(1) + 'px,' + uy.toFixed(1) + 'px)';
            var fx = dx / R, fy = dy / R;
            touch.left = fx < -DEAD; touch.right = fx > DEAD;
            touch.up = fy < -DEAD; touch.down = fy > DEAD;
        }
        function release() { activeId = null; nub.style.transform = 'translate(0,0)'; touch.left = touch.right = touch.up = touch.down = false; }
        function pos(e) { var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e; return { x: t.clientX, y: t.clientY }; }
        function down(e) { e.preventDefault(); audio(); center(); activeId = (e.touches && e.touches[0]) ? e.touches[0].identifier : 'mouse'; var p = pos(e); setDir(p.x - cx, p.y - cy); }
        function move(e) { if (activeId === null) return; e.preventDefault(); var p = pos(e); setDir(p.x - cx, p.y - cy); }
        function up(e) { if (activeId === null) return; e.preventDefault(); release(); }
        joy.addEventListener('touchstart', down, { passive: false });
        joy.addEventListener('touchmove', move, { passive: false });
        joy.addEventListener('touchend', up, { passive: false });
        joy.addEventListener('touchcancel', up, { passive: false });
        joy.addEventListener('mousedown', function (e) { down(e); window.addEventListener('mousemove', move); window.addEventListener('mouseup', mu); });
        function mu(e) { up(e); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', mu); }
        onCleanup(function () {
            joy.removeEventListener('touchstart', down); joy.removeEventListener('touchmove', move);
            joy.removeEventListener('touchend', up); joy.removeEventListener('touchcancel', up);
            window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', mu);
        });
    }

    /* =================================================================
       AREA CLEAR / WIN screens
       ================================================================= */
    function showAreaClear() {
        pauseGame();
        var A = AREAS[areaNum - 1] || AREAS[0];
        var next = AREAS[areaNum];
        var tEl = $('cw-area-title'), xEl = $('cw-area-text');
        if (tEl) tEl.textContent = 'AREA ' + A.name + ' (' + A.label + ') CLEAR!';
        if (xEl) xEl.innerHTML = 'Skor: <strong>' + score + '</strong><br>Lanjut ke <strong>AREA ' + (next ? next.name + ' · ' + next.label : '?') + '</strong>' +
            (next && next.boss ? '<br><span style="color:#e52521">⚠ BOSS MENANTI!</span>' : '');
        showOverlay('cw-areaclear');
    }
    function showWin() {
        pauseGame();
        var groom = val('groom_nickname', 'Mempelai Pria'), bride = val('bride_nickname', 'Mempelai Wanita');
        var el = $('cw-win-text');
        if (el) el.innerHTML =
            '<div style="margin-bottom:10px">Setelah menembus 8 area & mengalahkan boss, <strong>' + esc(groom) + '</strong> berhasil menyelamatkan sang putri <strong>' + esc(bride) + '</strong>! 🏰💖</div>' +
            'Misi terhebat bukan mengalahkan musuh, tapi menemukan seseorang untuk menjalani semua level kehidupan bersama. 🎆<br><br>' +
            '<span style="font-size:8px;color:rgba(255,255,255,.6)">Skor ' + score + ' · Terbaik ' + Math.max(bestScore, score) + (cheat ? ' · CHEAT' : '') + '</span>';
        showOverlay('cw-win');
    }

    function nextArea() {
        areaNum++;
        if (areaNum > TOTAL_AREAS) { showWin(); return; }
        hideOverlays();
        if (G && G.scene) { G.scene.scene.resume(); G.scene.scene.restart({ area: areaNum }); }
    }
    function goToArea(n) {
        areaNum = clamp(n, 1, TOTAL_AREAS);
        hideOverlays(); closeModal(); closeInvitation();
        if (G && G.scene) { if (G.scene.scene.isPaused()) G.scene.scene.resume(); G.scene.scene.restart({ area: areaNum }); }
        else whenPhaserReady(function () { bootGame(areaNum); });
    }

    /* =================================================================
       STAGE SELECT (cheat)
       ================================================================= */
    var selArea = 1, selDiff = gameDiff;
    function buildStageSelect() {
        var grid = $('cw-stagesel-grid'); if (!grid) return;
        selArea = areaNum; selDiff = gameDiff; grid.innerHTML = '';
        var dbtn = document.createElement('button');
        dbtn.type = 'button'; dbtn.className = 'cw-stagesel-item cw-stagesel-diff'; dbtn.style.gridColumn = '1 / -1';
        function dlabel() { return '<span class="ss-area">MODE: ' + DIFF_NAME[selDiff] + '</span><span class="ss-biome">ketuk untuk ganti</span>'; }
        dbtn.innerHTML = dlabel();
        dbtn.addEventListener('click', function () { selDiff = DIFF_ORDER[(DIFF_ORDER.indexOf(selDiff) + 1) % 3]; dbtn.innerHTML = dlabel(); renderSelHint(); });
        grid.appendChild(dbtn);
        AREAS.forEach(function (a, idx) {
            var n = idx + 1;
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'cw-stagesel-item' + (n === areaNum ? ' is-current' : '') + (n === selArea ? ' is-selected' : '');
            b.innerHTML = '<span class="ss-area">AREA ' + a.name + '</span><span class="ss-biome">' + a.label + (a.boss ? ' · BOSS' : '') + '</span>';
            b.addEventListener('click', function () {
                selArea = n;
                grid.querySelectorAll('.cw-stagesel-item').forEach(function (x) { x.classList.remove('is-selected'); });
                b.classList.add('is-selected'); renderSelHint();
            });
            grid.appendChild(b);
        });
        renderSelHint();
    }
    function renderSelHint() {
        var el = $('cw-stagesel-hint'); if (!el) return;
        var a = AREAS[selArea - 1] || AREAS[0];
        el.innerHTML = 'PILIHAN: AREA ' + a.name + ' · ' + a.label + ' · ' + DIFF_NAME[selDiff] + '<br><span style="opacity:.7">' + DIFF_DESC[selDiff] + '</span>';
    }

    /* =================================================================
       FLOW: start / cover / intro
       ================================================================= */
    function startGame(area) {
        areaNum = area || 1; lives = startLives(); score = 0; setHUD();
        started = true;
        whenPhaserReady(function () { bootGame(areaNum); });
    }

    function syncDiffUI() {
        var wrap = $('cw-diff'); if (!wrap) return;
        wrap.querySelectorAll('.cw-diff-opt').forEach(function (o) { o.classList.toggle('is-sel', o.getAttribute('data-diff') === gameDiff); });
    }

    /* =================================================================
       WIRE UP UI
       ================================================================= */
    function wireUI() {
        // difficulty picker (cover) — item 8: bind each button directly (no event
        // delegation / closest()) so the clicked option is ALWAYS the one selected.
        var diffWrap = $('cw-diff');
        if (diffWrap) {
            var opts = diffWrap.querySelectorAll('.cw-diff-opt');
            opts.forEach(function (b) {
                b.addEventListener('click', function () {
                    var d = b.getAttribute('data-diff');
                    if (d !== 'easy' && d !== 'medium' && d !== 'hard') return;
                    gameDiff = d; persist(); syncDiffUI(); sfx('power');
                });
            });
        }
        syncDiffUI();

        var startBtn = $('cw-start-btn');
        if (startBtn) startBtn.addEventListener('click', function () { audio(); pauseHostMusic(); startGame(1); showOverlay('cw-intro'); });

        var introGo = $('cw-intro-go');
        if (introGo) introGo.addEventListener('click', function () { hideOverlays(); resumeGame(); });

        var areaGo = $('cw-area-go');
        if (areaGo) areaGo.addEventListener('click', function () { nextArea(); });

        var winGo = $('cw-win-go');
        if (winGo) winGo.addEventListener('click', function () { hideOverlays(); openInvitation(); });

        // rescue offer
        var rescueGo = $('cw-rescue-go');
        if (rescueGo) rescueGo.addEventListener('click', function () { hideOverlays(); resumeGame(); toast('Lanjut ke sarang boss! ⚔', 1800); });
        var rescueSkip = $('cw-rescue-skip');
        if (rescueSkip) rescueSkip.addEventListener('click', function () { hideOverlays(); openInvitation(); });

        // view invitation
        if (viewBtn) viewBtn.addEventListener('click', function () {
            if (!viewUnlocked()) { toast('Kumpulkan semua kepingan dulu<br><span style="font-size:7px">atau aktifkan ★ cheat</span>', 1900); return; }
            openInvitation();
        });
        var invClose = $('cw-inv-close'); if (invClose) invClose.addEventListener('click', closeInvitation);
        var replay = $('cw-replay'); if (replay) replay.addEventListener('click', function () { closeInvitation(); startGame(1); showOverlay('cw-cover'); });

        // modal
        var mClose = $('cw-modal-close'); if (mClose) mClose.addEventListener('click', closeModal);
        var mRoot = $('cw-modal-root'); if (mRoot) mRoot.addEventListener('click', function (e) { if (e.target === mRoot) closeModal(); });

        // lightbox (invitation page galleries)
        document.addEventListener('click', function (e) {
            var t = e.target;
            if (t && t.tagName === 'IMG' && t.closest && t.closest('.cw-invitation') && t.closest('.cw-gallery-item')) { e.preventDefault(); openLightbox(t, $('cw-invitation')); }
        });
        onCleanup(function () { closeLightbox(); });
        var lb = $('cw-lightbox');
        if (lb) {
            lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
            var c = $('cw-lightbox-close'); if (c) c.addEventListener('click', closeLightbox);
            var pv = $('cw-lightbox-prev'); if (pv) pv.addEventListener('click', function () { lbShow(lbIdx - 1); });
            var nx = $('cw-lightbox-next'); if (nx) nx.addEventListener('click', function () { lbShow(lbIdx + 1); });
        }

        // cheat star
        var star = $('cw-star-btn'); if (star) star.addEventListener('click', function () { setCheat(!cheat); });
        // stage select
        var ssBtn = $('cw-stagesel-btn');
        if (ssBtn) ssBtn.addEventListener('click', function () { if (!cheat) return; buildStageSelect(); pauseGame(); showOverlay('cw-stagesel'); });
        var ssCancel = $('cw-stagesel-cancel'); if (ssCancel) ssCancel.addEventListener('click', function () { hideOverlays(); resumeGame(); });
        var ssOk = $('cw-stagesel-ok'); if (ssOk) ssOk.addEventListener('click', function () { if (selDiff !== gameDiff) { gameDiff = selDiff; persist(); syncDiffUI(); } hideOverlays(); goToArea(selArea); });
        var ssRoot = $('cw-stagesel'); if (ssRoot) ssRoot.addEventListener('click', function (e) { if (e.target === ssRoot) { hideOverlays(); resumeGame(); } });

        // reset — proper in-game confirm dialog (item 5), not native confirm()
        var resetBtn = $('cw-reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', function () { pauseGame(); showOverlay('cw-reset-confirm'); });
        var resetCancel = $('cw-reset-cancel');
        if (resetCancel) resetCancel.addEventListener('click', function () {
            hideOverlays();
            // resume only if a level was actually running underneath
            if (started) resumeGame(); else showOverlay('cw-cover');
        });
        var resetOk = $('cw-reset-ok');
        if (resetOk) resetOk.addEventListener('click', function () {
            resetSave(); cheat = false; setCheat(false); buildInventory(); updateViewBtn(); syncDiffUI();
            closeInvitation(); closeModal(); started = false; startGame(1); showOverlay('cw-cover'); toast('Game di-reset', 1400);
        });
        var resetRoot = $('cw-reset-confirm');
        if (resetRoot) resetRoot.addEventListener('click', function (e) { if (e.target === resetRoot) { hideOverlays(); if (started) resumeGame(); else showOverlay('cw-cover'); } });

        // keyboard escape closes overlays/lightbox
        function onKey(e) { if (e.code === 'Escape') { closeLightbox(); closeModal(); } }
        window.addEventListener('keydown', onKey);
        onCleanup(function () { window.removeEventListener('keydown', onKey); });
    }

    /* =================================================================
       BOOT
       ================================================================= */
    /* =================================================================
       DESKTOP SIDE TABLEAU (item 6) — a small Contra-style pixel scene of the
       commando groom + bride under a heart, drawn on the two side canvases so
       the desktop black space is filled. Pure canvas (no Phaser); cheap RAF.
       ================================================================= */
    function bindSideTableau() {
        var ids = ['cw-side-canvas-l', 'cw-side-canvas-r'];
        var canvases = ids.map($).filter(Boolean);
        if (!canvases.length) return;
        var raf = null, t = 0;
        function px(ctx, ox, oy, x, y, w, h, col, u) { ctx.fillStyle = col; ctx.fillRect(Math.round(ox + x * u), Math.round(oy + y * u), Math.ceil((w || 1) * u), Math.ceil((h || 1) * u)); }
        function heart(ctx, cx, cy, s, col) { ctx.fillStyle = col; ctx.fillRect(cx - 3 * s, cy - 2 * s, 2 * s, 3 * s); ctx.fillRect(cx + 1 * s, cy - 2 * s, 2 * s, 3 * s); ctx.fillRect(cx - 2 * s, cy + s, 4 * s, s); ctx.fillRect(cx - s, cy + 2 * s, 2 * s, s); }
        function groom(ctx, ox, oy, u) {
            px(ctx, ox, oy, 6, 1, 12, 3, '#e52521', u);   // bandana
            px(ctx, ox, oy, 7, 3, 10, 8, '#f0a868', u);   // head
            px(ctx, ox, oy, 5, 11, 14, 12, '#2f6a3a', u); // torso (vest)
            px(ctx, ox, oy, 6, 13, 12, 1, '#caa24a', u);  // belt
            px(ctx, ox, oy, 17, 14, 12, 3, '#33343c', u); // rifle toward bride
            px(ctx, ox, oy, 6, 23, 5, 9, '#2848c8', u); px(ctx, ox, oy, 13, 23, 5, 9, '#2848c8', u);
            px(ctx, ox, oy, 6, 31, 6, 3, '#141018', u); px(ctx, ox, oy, 13, 31, 6, 3, '#141018', u);
        }
        function bride(ctx, ox, oy, u) {
            px(ctx, ox, oy, 6, 0, 12, 2, '#ffd84a', u);   // tiara
            px(ctx, ox, oy, 5, 2, 14, 8, '#f4cf5a', u);   // hair
            px(ctx, ox, oy, 7, 4, 10, 7, '#ffd9b8', u);   // face
            px(ctx, ox, oy, 6, 11, 12, 6, '#ffffff', u);  // bodice
            for (var gy = 17; gy < 32; gy++) { var w = 4 + (gy - 17) * 0.7; px(ctx, ox, oy, 12 - w, gy, w * 2, 1, '#ffffff', u); }
        }
        function draw() {
            raf = requestAnimationFrame(draw); t += 1;
            canvases.forEach(function (cv) {
                var w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
                if (cv.width !== w * 2) { cv.width = w * 2; cv.height = h * 2; }
                var ctx = cv.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, w, h);
                // ground
                var gy = h - 36; ctx.fillStyle = '#2f6a3a'; ctx.fillRect(0, gy, w, h - gy); ctx.fillStyle = '#5aa048'; ctx.fillRect(0, gy, w, 5);
                var u = Math.max(3, Math.round(w / 90)), bob = Math.sin(t * 0.05) * u * 0.5;
                var cx = w / 2, feetY = gy - 34 * u + bob;
                groom(ctx, cx - 34 * u, feetY, u);
                bride(ctx, cx + 4 * u, feetY, u);
                heart(ctx, cx, feetY - 6 * u + Math.sin(t * 0.08) * u, u * 0.9, '#ff5a8a');
                // floating hearts
                for (var i = 0; i < 5; i++) {
                    var ph = (t * 0.8 + i * 60) % 200;
                    var hx = cx + Math.sin(t * 0.03 + i * 1.7) * (u * 18) + (i - 2) * u * 6;
                    var hy = gy - u * 2 - ph * (h / 260);
                    ctx.globalAlpha = Math.max(0, 1 - ph / 200) * 0.9;
                    heart(ctx, hx, hy, (i % 2 ? 0.5 : 0.34) * u, i % 3 ? '#ff7ab6' : '#ffd84a');
                    ctx.globalAlpha = 1;
                }
            });
        }
        draw();
        onCleanup(function () { if (raf) cancelAnimationFrame(raf); });
    }

    function start() {
        var ver = $('cw-version'); if (ver) ver.textContent = VERSION;   // item 6
        buildInventory();
        updateViewBtn();
        wireUI();
        wireForms();
        startCountdown();
        bindSideTableau();
        // mark already-unlocked badges
        setTimeout(function () { pauseHostMusic(); }, 0);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
