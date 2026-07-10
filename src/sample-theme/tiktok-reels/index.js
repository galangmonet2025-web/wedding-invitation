/* =========================================================================
   TIKTOK / REELS — wedding theme JS
   Navigation is an Instagram-Stories style pager: a segmented bar at the top,
   tap the right edge → next story, left edge → previous; swipe and the menu
   also navigate.

   RE-INJECTION MODEL (important): the host injects the theme HTML via
   dangerouslySetInnerHTML and REPLACES the whole subtree whenever htmlBase
   changes (language switch, a new wish appended, guest-state re-parse) WITHOUT
   re-running this script. So we must NOT cache DOM nodes in long-lived closures
   for navigation — every handler is DOCUMENT-DELEGATED and re-queries the live
   DOM. Persistent state (current story index, intro flags, timers) lives on
   window.__trl so it survives both re-injections and the host's own re-EXECUTION
   of this script (which happens on isOpened / jsBase change).

   Music is owned by the HOST — we only mirror state via #btn-toggle-music /
   #play-icon / #pause-icon, never call audio.play() (except the one-shot
   autoplay nudge on open).
   ========================================================================= */

// ---- Copy to clipboard (gift cards) ----
window.copyToClipboard = function (elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : (el.innerText || el.textContent);
    const original = btn.innerHTML;
    function ok() {
        if (typeof UIkit !== 'undefined') {
            UIkit.notification({ message: '<span uk-icon="icon: check"></span> Tersalin!', status: 'success', pos: 'top-center', timeout: 1800 });
        } else {
            btn.innerHTML = '✓ Tersalin';
            setTimeout(() => { btn.innerHTML = original; }, 1800);
        }
    }
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(ok).catch(() => fallbackCopy(text, ok));
    } else {
        fallbackCopy(text, ok);
    }
};
function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
}

(function initTiktokReels() {
    'use strict';

    // ---------- persistent cross-execution state ----------
    const S = window.__trl = window.__trl || {
        current: 0,
        opened: false,
        introStarted: false,
        introTimersLive: false,
        wired: false        // document-level listeners installed once
    };

    // =====================================================================
    //  LIVE DOM QUERIES (never cached across re-injection)
    // =====================================================================
    function viewport() { return document.getElementById('reels-viewport'); }
    function phone() { return document.getElementById('trl-phone'); }
    function stories() { const v = viewport(); return v ? Array.from(v.querySelectorAll('.reels-story')) : []; }
    function progressHost() { return document.getElementById('reels-progress'); }
    function menuListHost() { return document.getElementById('reels-menu-list'); }

    // =====================================================================
    //  NAVIGATION (index-based; applied to whatever DOM is live right now)
    // =====================================================================
    function updateProgress() {
        const host = progressHost();
        if (!host) return;
        Array.from(host.querySelectorAll('.reels-seg')).forEach(function (seg, i) {
            seg.classList.toggle('is-done', i < S.current);
            seg.classList.toggle('is-current', i === S.current);
        });
    }

    function applyActive() {
        const list = stories();
        if (!list.length) return;
        if (S.current < 0) S.current = 0;
        if (S.current >= list.length) S.current = list.length - 1;
        list.forEach(function (s, i) { s.classList.toggle('is-active', i === S.current); });
        const content = list[S.current].querySelector('.reels-content');
        if (content) content.scrollTop = 0;
        updateProgress();
        const caption = document.getElementById('reels-caption');
        if (caption) caption.textContent = list[S.current].getAttribute('data-menu-label') || '';
    }

    function goTo(index) {
        const list = stories();
        if (!list.length) return;
        index = Math.max(0, Math.min(list.length - 1, index));
        if (index === S.current) { applyActive(); return; }
        S.current = index;
        applyActive();
    }
    function next() { goTo(S.current + 1); }
    function prev() { goTo(S.current - 1); }

    // Build the segmented bar + jump menu to match the current story count.
    function buildChrome() {
        const list = stories();
        const host = progressHost();
        if (host && host.children.length !== list.length) {
            host.innerHTML = list.map(function (_, i) {
                return '<span class="reels-seg" data-goto="' + i + '"><span class="reels-seg-fill"></span></span>';
            }).join('');
        }
        const mh = menuListHost();
        if (mh && mh.children.length !== list.length) {
            // Use <button> (no href) so the host's anchor-hash interceptor in
            // ThemeWrapper ignores these — we navigate the pager ourselves.
            mh.innerHTML = list.map(function (s, i) {
                const label = s.getAttribute('data-menu-label') || ('Bagian ' + (i + 1));
                return '<li><button type="button" class="reels-menu-btn" data-goto="' + i + '">' + label + '</button></li>';
            }).join('');
        }
    }

    // =====================================================================
    //  BACKGROUND ASSIGNMENT
    //  Hero + closing keep their own photo (inline). Sections carrying
    //  .reels-bg-gallery[data-gallery-bg="N"] borrow the Nth gallery image
    //  (else the hero photo, else the gradient base). Re-run on a short ramp
    //  because the host resolves gallery <img> src asynchronously.
    // =====================================================================
    function assignGalleryBackgrounds() {
        const galleryImgs = Array.from(document.querySelectorAll('.gallery-grid .gallery-img'))
            .map(img => img.getAttribute('src'))
            .filter(src => src && src.indexOf('{{') === -1 && !/^data:image\/svg/i.test(src));

        let heroUrl = '';
        const heroBg = document.querySelector('.reels-story[data-story="hero"] .reels-bg');
        if (heroBg) {
            const m = (heroBg.style.backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
            if (m && m[1] && m[1].indexOf('{{') === -1) heroUrl = m[1];
        }

        Array.from(document.querySelectorAll('.reels-bg-gallery')).forEach(function (slot) {
            const idx = parseInt(slot.getAttribute('data-gallery-bg') || '0', 10);
            let url = '';
            if (galleryImgs.length) url = galleryImgs[idx % galleryImgs.length];
            else if (heroUrl) url = heroUrl;
            if (url && slot.dataset.bgUrl !== url) {
                slot.dataset.bgUrl = url;
                slot.style.backgroundImage = 'url("' + url + '")';
                slot.classList.add('has-photo');
                slot.style.filter = 'brightness(0.82)';
            }
        });
    }

    // =====================================================================
    //  WEDDING DATE (shared by countdown + calendar)
    // =====================================================================
    function resolveWeddingDay() {
        const cal = document.getElementById('wedding-calendar');
        const raw = cal ? (cal.getAttribute('data-wedding-date') || '').trim() : '';
        const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0);
        if (raw) { const d = new Date(raw); if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
        return null;
    }
    function receptionEnd(day) {
        const holder = document.getElementById('ws-jam-resepsi');
        const txt = holder ? (holder.textContent || '') : '';
        const times = txt.match(/(\d{1,2}):(\d{2})/g) || [];
        let endH = 23, endM = 59;
        if (times.length >= 2) { const p = times[times.length - 1].split(':'); endH = +p[0]; endM = +p[1]; }
        else if (times.length === 1) { const p = times[0].split(':'); endH = +p[0] + 3; endM = +p[1]; }
        const end = new Date(day.getTime());
        end.setHours(Math.min(23, endH), endM, 0, 0);
        return end;
    }

    // ---- Countdown: single persistent 1 Hz interval, queries live nodes ----
    function startCountdown() {
        if (S.countdownTimer) return; // one global interval only
        function tick() {
            const day = resolveWeddingDay();
            if (!day || isNaN(day.getTime())) return;
            const now = Date.now();
            const dist = day.getTime() - now;
            const daysEl = document.getElementById('days');
            const hoursEl = document.getElementById('hours');
            const minutesEl = document.getElementById('minutes');
            const secondsEl = document.getElementById('seconds');
            const wrap = document.getElementById('countdown');
            const statusEl = document.getElementById('countdown-status');
            if (dist > 0) {
                const d = Math.floor(dist / 864e5);
                const h = Math.floor((dist % 864e5) / 36e5);
                const m = Math.floor((dist % 36e5) / 6e4);
                const s = Math.floor((dist % 6e4) / 1000);
                if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
                if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
                if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
                if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');
            } else {
                const recEnd = receptionEnd(day);
                const msg = now <= recEnd.getTime()
                    ? 'Hari yang kami nantikan telah tiba — acara sedang berlangsung 🎉'
                    : 'Acara kami sudah selesai. Terima kasih atas doa & dukungannya 🙏';
                if (wrap) wrap.style.display = 'none';
                if (statusEl) { statusEl.textContent = msg; statusEl.style.display = 'block'; }
            }
        }
        tick();
        S.countdownTimer = setInterval(tick, 1000);
    }

    // ---- Calendar: render into whatever #wedding-calendar is live ----
    function renderCalendar() {
        const cal = document.getElementById('wedding-calendar');
        if (!cal || cal.dataset.rendered) return;
        const day = resolveWeddingDay();
        if (!day || isNaN(day.getTime())) return;
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const year = day.getFullYear(), month = day.getMonth(), wDay = day.getDate();
        const firstDow = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let html = '<div class="cal-title">' + monthNames[month] + ' ' + year + '</div>';
        html += '<div class="cal-grid cal-head">';
        dayNames.forEach(d => html += '<span class="cal-dow">' + d + '</span>');
        html += '</div><div class="cal-grid cal-body">';
        for (let i = 0; i < firstDow; i++) html += '<span class="cal-cell cal-empty"></span>';
        for (let d = 1; d <= daysInMonth; d++) {
            const isW = d === wDay;
            html += '<span class="cal-cell' + (isW ? ' cal-active' : '') + '">'
                + (isW ? '<span class="cal-heart"></span>' : '')
                + '<span class="cal-num">' + d + '</span></span>';
        }
        html += '</div>';
        cal.innerHTML = html;
        cal.dataset.rendered = 'true';
    }

    // ---- Ambient particles (scoped to the live viewport) ----
    function spawnParticles() {
        const v = viewport();
        if (!v || v.querySelector('.floating-particle')) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const w = (phone() ? phone().clientWidth : window.innerWidth) || 400;
        for (let i = 0; i < 14; i++) {
            const p = document.createElement('div');
            p.className = 'floating-particle';
            const size = 2 + Math.random() * 4;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = (Math.random() * w) + 'px';
            p.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
            p.style.animationDuration = (11 + Math.random() * 12) + 's';
            p.style.animationDelay = (Math.random() * 12) + 's';
            v.appendChild(p);
        }
    }

    // ---- Music UI mirror ----
    function updateMusicUI() {
        const bgMusic = document.getElementById('bg-music');
        if (!bgMusic) return;
        const playing = !bgMusic.paused;
        const btnMusic = document.getElementById('btn-toggle-music');
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (btnMusic) btnMusic.classList.toggle('music-playing', playing);
        if (playIcon) playIcon.style.display = playing ? 'block' : 'none';
        if (pauseIcon) pauseIcon.style.display = playing ? 'none' : 'block';
        document.body.classList.toggle('trl-music-paused', !playing);
    }

    // ---- YouTube autoplay nudge (desktop autoplay-policy workaround) ----
    function nudgeYouTubeMusic() {
        function play() {
            const frame = document.querySelector('iframe[title="YouTube Background Music"], iframe[src*="youtube.com/embed"]');
            if (!frame || !frame.contentWindow) return;
            try { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*'); } catch (e) { /* noop */ }
        }
        play();
        [150, 400, 800, 1500, 2500].forEach(function (d) { setTimeout(play, d); });
    }

    // =====================================================================
    //  OPEN / INTRO
    // =====================================================================
    function playChime() {
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
            const t0 = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = f;
                const at = t0 + i * 0.1;
                g.gain.setValueAtTime(0.0001, at);
                g.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
                osc.connect(g).connect(ctx.destination);
                osc.start(at); osc.stop(at + 0.5);
            });
        } catch (e) { /* noop */ }
    }

    function revealInvitation() {
        S.opened = true;
        document.body.style.overflow = 'hidden';
        const gate = document.getElementById('reels-gate');
        const hud = document.getElementById('theme-fab-container');
        if (gate) gate.classList.add('is-hidden');
        if (hud) hud.style.display = 'block';
        S.current = 0;
        applyActive();
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) { bgMusic.play().catch(() => { }); updateMusicUI(); }
        nudgeYouTubeMusic();
    }

    const INTRO_HOLD_MS = 2200, INTRO_FADE_MS = 2500, INTRO_DONE_MS = 3300;

    function finishIntro() {
        const intro = document.getElementById('reels-intro');
        if (!intro) return;
        intro.classList.remove('is-playing', 'is-ending');
        intro.style.display = 'none';
    }

    function runIntro() {
        const intro = document.getElementById('reels-intro');
        if (S.introStarted) {
            // Re-exec/re-inject landed mid-intro: adopt the in-flight overlay.
            if (intro && intro.classList.contains('is-playing') && !S.introTimersLive) {
                revealInvitation();
                intro.classList.add('is-ending');
                setTimeout(finishIntro, 600);
            } else if (S.opened) {
                // Intro already done in a previous execution — just ensure revealed.
                revealInvitation();
            }
            return;
        }
        S.introStarted = true;
        S.introTimersLive = true;
        if (!intro) { revealInvitation(); return; }
        intro.classList.add('is-playing');
        playChime();
        // Plain timers (persist across re-exec — not tied to any cleanup list).
        setTimeout(revealInvitation, INTRO_HOLD_MS);
        setTimeout(function () { const i = document.getElementById('reels-intro'); if (i) i.classList.add('is-ending'); }, INTRO_FADE_MS);
        setTimeout(function () { finishIntro(); S.introTimersLive = false; }, INTRO_DONE_MS);
    }

    // =====================================================================
    //  DOCUMENT-DELEGATED WIRING (installed ONCE; survives re-injection)
    // =====================================================================
    function installGlobalListeners() {
        if (S.wired) return;
        S.wired = true;

        // --- Click delegation: open, replay, tap zones, segments, menu items ---
        document.addEventListener('click', function (e) {
            const t = e.target;
            if (!t || !t.closest) return;

            if (t.closest('#btn-open-invitation')) {
                const btn = t.closest('#btn-open-invitation');
                if (btn) btn.disabled = true;
                nudgeYouTubeMusic();   // request play from the real gesture (desktop)
                runIntro();
                return;
            }
            if (t.closest('#reels-replay')) { goTo(0); return; }
            if (t.closest('#reels-tap-prev')) { prev(); return; }
            if (t.closest('#reels-tap-next')) { next(); return; }

            // Segment dashes (in the top bar) and menu links (in #menu-modal) both
            // carry data-goto. Accept either, as long as it belongs to this theme.
            const gotoEl = t.closest('[data-goto]');
            if (gotoEl && (gotoEl.closest('#reels-progress') || gotoEl.closest('#reels-menu-list'))) {
                e.preventDefault();
                goTo(parseInt(gotoEl.getAttribute('data-goto'), 10));
                if (gotoEl.closest('#reels-menu-list') && typeof UIkit !== 'undefined') {
                    try { UIkit.modal('#menu-modal').hide(); } catch (err) { /* noop */ }
                }
                return;
            }

            // Music toggle mirror (host owns real playback; we only reflect state).
            if (t.closest('#btn-toggle-music')) {
                const bgMusic = document.getElementById('bg-music');
                if (bgMusic) { if (bgMusic.paused) bgMusic.play().catch(() => { }); else bgMusic.pause(); }
                // let the host's own handler run too; just refresh our icons shortly after
                setTimeout(updateMusicUI, 0);
                return;
            }
        }, false);

        // --- Keyboard arrows (skip while typing / modal open) ---
        document.addEventListener('keydown', function (e) {
            if (!S.opened) return;
            const ae = document.activeElement;
            if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
            if (document.querySelector('.uk-modal.uk-open')) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
        }, false);

        // --- Swipe (vertical primary, horizontal fallback) ---
        let sx = 0, sy = 0, swiping = false;
        document.addEventListener('touchstart', function (e) {
            if (!S.opened || e.touches.length !== 1) { swiping = false; return; }
            const v = viewport();
            if (!v || !v.contains(e.target)) { swiping = false; return; }
            sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
        }, { passive: true });
        document.addEventListener('touchend', function (e) {
            if (!swiping) return;
            swiping = false;
            const t = e.changedTouches[0];
            const dx = t.clientX - sx, dy = t.clientY - sy;
            const absX = Math.abs(dx), absY = Math.abs(dy);
            const scrollable = e.target && e.target.closest ? e.target.closest('.reels-content, .wishes-scroll') : null;
            if (absY > absX && absY > 60) {
                if (scrollable) {
                    const atTop = scrollable.scrollTop <= 2;
                    const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 2;
                    if (dy < 0 && !atBottom) return;
                    if (dy > 0 && !atTop) return;
                }
                if (dy < 0) next(); else prev();
            } else if (absX > absY && absX > 70) {
                if (dx < 0) next(); else prev();
            }
        }, { passive: true });

        // --- Mirror music when the host dispatches play/pause on #bg-music ---
        // (Listener on document via capture so it catches the bubbled media events.)
        document.addEventListener('play', function (e) {
            if (e.target && e.target.id === 'bg-music') updateMusicUI();
        }, true);
        document.addEventListener('pause', function (e) {
            if (e.target && e.target.id === 'bg-music') updateMusicUI();
        }, true);
    }

    // =====================================================================
    //  RENDER PASS — (re)build everything against the live DOM
    // =====================================================================
    function renderVisuals() {
        if (!viewport()) return;
        buildChrome();
        assignGalleryBackgrounds();
        renderCalendar();
        spawnParticles();
        updateMusicUI();
        // Keep the active story consistent with our persisted index.
        const list = stories();
        const okActive = list[S.current] && list[S.current].classList.contains('is-active');
        if (!okActive) applyActive();
        // If we've already opened but a re-inject reset the gate/HUD, restore them.
        if (S.opened) {
            const gate = document.getElementById('reels-gate');
            const hud = document.getElementById('theme-fab-container');
            if (gate) gate.classList.add('is-hidden');
            if (hud) hud.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    // =====================================================================
    //  BOOT
    // =====================================================================
    installGlobalListeners();
    startCountdown();
    renderVisuals();

    // Re-render after the host resolves gallery images asynchronously.
    [500, 1200, 2500].forEach(function (d) { setTimeout(function () { assignGalleryBackgrounds(); renderCalendar(); }, d); });

    // Watch for the host REPLACING the theme subtree (htmlBase re-inject). When a
    // fresh #reels-viewport appears, re-run the render pass against it. Debounced
    // to the next frame so we act on the settled DOM. A single body-level observer
    // is kept on window so repeated executions don't stack observers.
    if (S.domObserver) { try { S.domObserver.disconnect(); } catch (e) { /* noop */ } }
    let pending = false;
    S.domObserver = new MutationObserver(function (mutations) {
        // Only care when reels nodes were added/removed (ignore text ticks).
        let relevant = false;
        for (let i = 0; i < mutations.length && !relevant; i++) {
            const m = mutations[i];
            [m.addedNodes, m.removedNodes].forEach(function (list) {
                for (let j = 0; j < list.length; j++) {
                    const n = list[j];
                    if (n.nodeType === 1 && ((n.matches && (n.matches('#reels-viewport') || n.matches('.reels-story'))) ||
                        (n.querySelector && n.querySelector('#reels-viewport, .reels-story')))) { relevant = true; break; }
                }
            });
        }
        if (!relevant || pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; renderVisuals(); });
    });
    S.domObserver.observe(document.body, { childList: true, subtree: true });

    // If the host already flipped to "opened" (this execution is the re-exec from
    // the open click, or a re-inject after open), resume the intro/reveal.
    const rootOpened = document.querySelector('.theme-wrapper.is-opened, .is-opened');
    if (S.opened) {
        revealInvitation();
    } else if (rootOpened && !S.introStarted) {
        runIntro();
    } else {
        // Not opened yet: keep the page locked behind the gate.
        document.body.style.overflow = 'hidden';
    }

})();
