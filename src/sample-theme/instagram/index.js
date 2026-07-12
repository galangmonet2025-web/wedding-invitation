/* =========================================================================
   INSTAGRAM — wedding theme JS
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

    // Does this invitation target a specific guest? Public/"umum" links have NO
    // ?guestid= param. HashRouter puts the query inside the hash (#/slug?guestid=xxx),
    // but some hosts also carry it in the real query string — check both.
    function hasGuestId() {
        try {
            var found = false;
            [window.location.search || '', (window.location.hash || '').replace(/^[^?]*/, '')].forEach(function (qs) {
                if (!qs) return;
                var sp = new URLSearchParams(qs.charAt(0) === '?' ? qs.slice(1) : qs);
                var g = sp.get('guestid') || sp.get('guestId') || sp.get('guest_id');
                if (g && g.trim()) found = true;
            });
            return found;
        } catch (e) { return true; } // fail-open: rather show RSVP than wrongly hide it
    }

    // Umum link (no guestid) → hide the RSVP action button in the right rail. Re-run on
    // every render pass so it survives host re-injection of the HUD subtree.
    function applyGuestGating() {
        var umum = !hasGuestId();
        var rsvpAct = document.getElementById('reels-act-rsvp');
        if (rsvpAct) rsvpAct.style.display = umum ? 'none' : '';
    }

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
        // On the "profile-feed" sections (Galeri, Mempelai) hide the story chrome
        // (top bar + bottom HUD/action rail) for a clean full-page Instagram look.
        // The host force-sets #theme-fab-container to display:block inline on open,
        // so we hide it with a JS-set important inline style (beats host inline).
        const story = list[S.current].getAttribute('data-story');
        const bareChrome = (story === 'gallery' || story === 'couples');
        // On comments (wishes), gift and RSVP sections, hide ONLY the bottom HUD +
        // right action rail (couple/music chip + Ucapan/Bagikan/RSVP/QR/Musik) so they
        // don't overlap the form/cards — but keep the top bar for navigation.
        const hideHud = bareChrome || story === 'wishes' || story === 'gift' || story === 'rsvp';
        document.body.classList.toggle('trl-bare-chrome', bareChrome);
        document.body.classList.toggle('trl-hide-hud', hideHud);
        const topbar = document.getElementById('reels-topbar');
        const hud = document.getElementById('theme-fab-container');
        if (topbar) topbar.style.setProperty('display', bareChrome ? 'none' : 'block', 'important');
        if (hud && S.opened) hud.style.setProperty('display', hideHud ? 'none' : 'block', 'important');
        // HUD caption always shows the reception date (fallback to akad date), not the
        // per-section label, so it reads like a fixed post caption.
        const caption = document.getElementById('reels-caption');
        if (caption) {
            const resepsi = (caption.getAttribute('data-tanggal-resepsi') || '').trim();
            const akad = (caption.getAttribute('data-tanggal-akad') || '').trim();
            const tgl = resepsi || akad;
            if (tgl && tgl.indexOf('{{') === -1) caption.textContent = tgl;
        }
    }

    function goTo(index) {
        const list = stories();
        if (!list.length) return;
        index = Math.max(0, Math.min(list.length - 1, index));
        if (index === S.current) { applyActive(); return; }
        S.current = index;
        applyActive();
    }
    // Step to the next/previous NAVIGABLE story, skipping the feed/comments pages
    // (Galeri, Mempelai, Ucapan) that have no story-nav dash. Story gestures (swipe,
    // tap-zone, arrows) use this so e.g. Hero → Hitung Mundur (not → Mempelai), and
    // never land on Galeri either. Explicit nav (segment/header/menu) still uses goTo.
    function stepNav(dir) {
        const list = stories();
        if (!list.length) return;
        let i = S.current + dir;
        while (i >= 0 && i < list.length && isNoNavStory(list[i].getAttribute('data-story'))) {
            i += dir;
        }
        // if we walked off either end (only no-nav sections beyond), stay put
        if (i < 0 || i >= list.length) return;
        goTo(i);
    }
    function next() { stepNav(1); }
    function prev() { stepNav(-1); }
    // The "profile-feed" sections (Galeri, Mempelai) are NOT story/reels screens —
    // they render as full Instagram-feed pages. On them we DISABLE the story-style
    // gesture navigation (swipe, tap-to-next/prev, scroll-down-to-advance, arrows) so
    // they behave like a normal scrollable page. Explicit nav (header icons, highlight
    // bubbles, segment dashes, menu) still works — that's how the guest leaves them.
    function isBareStory() {
        const list = stories();
        const s = list[S.current];
        const name = s && s.getAttribute('data-story');
        return name === 'gallery' || name === 'couples';
    }
    // Jump to a story by its data-story name (no-op if that section isn't present).
    function goToStory(name) {
        const idx = stories().findIndex(function (s) { return s.getAttribute('data-story') === name; });
        if (idx >= 0) goTo(idx);
    }

    // Sections that render as full Instagram-feed pages (Galeri, Mempelai) or the
    // comments page (Ucapan) are NOT story screens — the top segmented story bar must
    // NOT show a navigation dash for them. We still keep a segment element in the DOM
    // (so data-goto indices stay 1:1 with stories() and paging math is unaffected),
    // but mark it `is-nonav` and hide it via CSS.
    function isNoNavStory(name) {
        return name === 'gallery' || name === 'couples' || name === 'wishes';
    }

    // Build the segmented bar + jump menu to match the current story count.
    function buildChrome() {
        const list = stories();
        const host = progressHost();
        if (host && host.children.length !== list.length) {
            host.innerHTML = list.map(function (s, i) {
                const cls = isNoNavStory(s.getAttribute('data-story')) ? ' is-nonav' : '';
                return '<span class="reels-seg' + cls + '" data-goto="' + i + '"><span class="reels-seg-fill"></span></span>';
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

    // Resolved gallery image URLs, in order (used for highlight-bubble thumbnails).
    // Use the live .currentSrc/.src property (the actually-loaded URL after the host
    // swaps the proxy src), not the attribute — the attribute may still be a Drive
    // URL that renders as an <img> but not as a CSS background.
    function galleryUrls() {
        return Array.from(document.querySelectorAll('#gallery .gallery-img, .gallery-grid .gallery-img'))
            .map(function (img) { return img.currentSrc || img.src || img.getAttribute('src') || ''; })
            .filter(function (src) { return src && src.indexOf('{{') === -1 && !/^data:image\/svg/i.test(src); });
    }

    // ---- Hero photo montage (cinematic Ken-Burns cross-fade "video" from photos) ----
    // Pulls the hero cover, the two couple photos, and gallery images (in that order),
    // dedupes, and cross-fades them with a slow zoom so the Hero reads like a short
    // clip. Rebuilds only when the resolved URL set changes (gallery src resolves async
    // after host proxy-swap); the cycle timer is a guarded singleton on S so re-inject /
    // re-execution never stacks intervals.
    function bgUrlOf(el) {
        if (!el) return '';
        var m = (el.style.backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
        var u = m && m[1] ? m[1] : '';
        return (u && u.indexOf('{{') === -1 && !/^data:image\/svg/i.test(u)) ? u : '';
    }
    function imgUrlOf(sel) {
        var img = document.querySelector(sel);
        if (!img) return '';
        var u = img.currentSrc || img.src || img.getAttribute('src') || '';
        return (u && u.indexOf('{{') === -1 && !/^data:image\/svg/i.test(u)) ? u : '';
    }
    function heroMontageUrls() {
        var urls = [];
        urls.push(bgUrlOf(document.querySelector('.reels-story[data-story="hero"] .reels-hero-bg')));
        urls.push(imgUrlOf('img[data-img="photo_groom_photo"]'));
        urls.push(imgUrlOf('img[data-img="photo_bride_photo"]'));
        galleryUrls().forEach(function (u) { urls.push(u); });
        // dedupe + drop empties, cap to keep the loop tight
        var seen = {}, out = [];
        urls.forEach(function (u) { if (u && !seen[u]) { seen[u] = 1; out.push(u); } });
        return out.slice(0, 8);
    }
    function setupHeroMontage() {
        var host = document.getElementById('reels-hero-slides');
        if (!host) return;
        var urls = heroMontageUrls();
        // need at least 2 distinct photos for a montage; otherwise leave the static hero bg
        if (urls.length < 2) { S.heroSig = ''; if (S.heroTimer) { clearInterval(S.heroTimer); S.heroTimer = 0; } host.innerHTML = ''; return; }
        var sig = urls.join('|');
        if (S.heroSig === sig && host.querySelector('.reels-hero-slide')) return; // unchanged
        S.heroSig = sig;
        if (S.heroTimer) { clearInterval(S.heroTimer); S.heroTimer = 0; }
        // build slide layers (alternating zoom-in/zoom-out via a class for variety)
        host.innerHTML = urls.map(function (u, i) {
            return '<div class="reels-hero-slide' + (i % 2 ? ' kb-alt' : '') + '" style="background-image:url(&quot;' +
                u.replace(/"/g, '&quot;') + '&quot;)"></div>';
        }).join('');
        var slides = Array.prototype.slice.call(host.querySelectorAll('.reels-hero-slide'));
        var idx = 0;
        slides[0].classList.add('is-active');
        // once the montage is live, fade the base hero bg out (slides carry the imagery)
        host.classList.add('is-ready');
        S.heroTimer = setInterval(function () {
            // pause the cycle when the hero isn't the visible story (save work off-screen)
            var heroActive = document.querySelector('.reels-story[data-story="hero"].is-active');
            if (!heroActive || !S.opened) return;
            slides[idx].classList.remove('is-active');
            idx = (idx + 1) % slides.length;
            slides[idx].classList.add('is-active');
        }, 4200);
    }

    // Profile photo URL for the "Cerita Anda" bubble: the bride photo carried by the
    // top-bar avatar, else the couple post-avatar, else the first gallery image.
    function profilePhotoUrl() {
        const els = document.querySelectorAll('.reels-avatar-inner, .ig-post-avatar, .ig-profile-avatar');
        for (let i = 0; i < els.length; i++) {
            const m = (els[i].style.backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
            if (m && m[1] && m[1].indexOf('{{') === -1 && !/^data:image\/svg/i.test(m[1])) return m[1];
        }
        const gal = galleryUrls();
        return gal.length ? gal[0] : '';
    }

    // Per-section icon (white glyph on a dark bubble) — used by the Galeri
    // highlights row instead of photos.
    function sectionIcon(story) {
        const I = {
            hero: '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/>',
            countdown: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
            schedule: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
            streaming: '<polygon points="10 8 16 12 10 16 10 8"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
            story: '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/>',
            happiness: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>',
            rsvp: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
            wishes: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
            gift: '<rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M5 12v9h14v-9M12 8S9.5 3 7 4.5 8 8 12 8zM12 8s2.5-5 5-3.5S16 8 12 8z"/>',
            closing: '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/>',
            couples: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="10" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 7 0"/>'
        };
        const g = I[story] || '<circle cx="12" cy="12" r="8"/>';
        return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + g + '</svg>';
    }

    // One circular navigation bubble per section, EXCEPT `exclude`. If `firstName`
    // is given, that section's bubble is moved to the front (leftmost) and — when
    // `addStyle` is true — rendered as the Instagram "Cerita Anda" + bubble (still
    // navigates to that section). `iconMode` renders a white glyph on a dark bubble
    // instead of a photo thumbnail; otherwise thumbnails borrow GALLERY images in order.
    function buildHighlightsInto(hostId, exclude, firstName, addStyle, iconMode) {
        const host = document.getElementById(hostId);
        if (!host) return;
        const list = stories();
        let order = [];
        list.forEach(function (s, i) {
            if (s.getAttribute('data-story') === exclude) return;
            order.push(i);
        });
        let firstIdx = -1;
        if (firstName) {
            firstIdx = list.findIndex(function (s) { return s.getAttribute('data-story') === firstName; });
            if (firstIdx >= 0) { order = order.filter(function (i) { return i !== firstIdx; }); order.unshift(firstIdx); }
        }
        const gal = galleryUrls();
        const profileUrl = profilePhotoUrl();
        let sig = (addStyle ? 'A' : '') + '#';
        const items = order.map(function (i, pos) {
            const s = list[i];
            const isAdd = addStyle && i === firstIdx && pos === 0;
            const label = isAdd ? 'Cerita Anda' : (s.getAttribute('data-menu-label') || ('Bagian ' + (i + 1)));
            const bg = gal.length ? gal[pos % gal.length] : '';
            if (isAdd) {
                // "Cerita Anda" bubble: profile photo behind a blue + button.
                sig += i + ':' + (profileUrl ? '1' : '0') + 'a|';
                const pstyle = profileUrl ? ' style="background-image:url(&quot;' + profileUrl + '&quot;)"' : '';
                return '<button type="button" class="ig-highlight ig-highlight-add" data-goto="' + i + '">' +
                    '<span class="ig-highlight-ring"><span class="ig-highlight-thumb"' + pstyle + '>' +
                    '<span class="ig-highlight-plus"></span></span></span>' +
                    '<span class="ig-highlight-label">' + label + '</span>' +
                    '</button>';
            }
            if (iconMode) {
                // White icon on a dark bubble (no photo), section name underneath.
                sig += i + ':icon|';
                return '<button type="button" class="ig-highlight ig-highlight-icon" data-goto="' + i + '">' +
                    '<span class="ig-highlight-ring"><span class="ig-highlight-thumb">' +
                    sectionIcon(s.getAttribute('data-story')) + '</span></span>' +
                    '<span class="ig-highlight-label">' + label + '</span>' +
                    '</button>';
            }
            sig += i + ':' + (bg ? '1' : '0') + '|';
            const style = bg ? ' style="background-image:url(&quot;' + bg + '&quot;)"' : '';
            return '<button type="button" class="ig-highlight" data-goto="' + i + '">' +
                '<span class="ig-highlight-ring"><span class="ig-highlight-thumb"' + style + '></span></span>' +
                '<span class="ig-highlight-label">' + label + '</span>' +
                '</button>';
        }).join('');
        if (host.dataset.sig !== sig) {
            host.innerHTML = items;
            host.dataset.sig = sig;
        }
    }

    function buildHighlights() {
        // Galeri: bubbles for every section except the gallery itself — rendered as
        // white section icons on dark bubbles (iconMode), with the name underneath.
        buildHighlightsInto('ig-highlights', 'gallery', null, false, true);
        // Mempelai: bubbles for every section except couples; "Berbagi Kebahagiaan"
        // (happiness) forced to the leftmost slot as the "Cerita Anda" + bubble.
        buildHighlightsInto('ig-couple-nav', 'couples', 'happiness', true);
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
    //  EVENT MAPS (Waktu & Tempat) — a simple keyless Google Maps embed per
    //  venue. Day/night is purely a CSS concern (a dark filter under
    //  prefers-color-scheme: dark), so the SAME embed serves both — night map
    //  when the device theme is dark, day map when light. Built from the venue
    //  name + address; hidden when neither resolved. Idempotent across re-inject.
    // =====================================================================
    function setupEventMaps() {
        Array.from(document.querySelectorAll('.ig-event-mapbox')).forEach(function (box) {
            var name = (box.getAttribute('data-map-q') || '').trim();
            var addr = (box.getAttribute('data-map-addr') || '').trim();
            // drop unresolved templates
            if (name.indexOf('{{') === 0) name = '';
            if (addr.indexOf('{{') === 0) addr = '';
            var query = [name, addr].filter(Boolean).join(', ').trim();
            if (!query) { box.style.display = 'none'; box.dataset.mapQuery = ''; return; }
            box.style.display = '';
            // already built with this exact query → nothing to do (survives re-inject)
            if (box.dataset.mapQuery === query && box.querySelector('iframe')) return;
            box.dataset.mapQuery = query;
            box.innerHTML = '';
            var frame = document.createElement('iframe');
            frame.className = 'ig-event-map-frame';
            frame.setAttribute('loading', 'lazy');
            frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
            frame.setAttribute('title', 'Peta ' + query);
            frame.setAttribute('aria-hidden', 'true');
            // keyless embed endpoint (no API key / billing needed)
            frame.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(query) + '&z=15&hl=id&output=embed';
            box.appendChild(frame);
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

    // ---- Extract a YouTube video id from a URL, else '' ----
    function youtubeId(url) {
        if (!url || url.indexOf('{{') !== -1) return '';
        const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
        return m ? m[1] : '';
    }

    // ---- Write the song label into the HUD track and, if it overflows the fixed
    //  viewport, run it as a seamless marquee (duplicate text + .is-marquee, with a
    //  scroll duration proportional to length) so the full title · channel is
    //  readable. Short labels just sit still (ellipsis, no scroll). ----
    function setSongLabel(text) {
        const song = document.getElementById('reels-hud-song');
        const track = document.getElementById('reels-hud-track');
        if (!song || !track) return;
        const clean = String(text || '').trim();
        // reset to single-copy, non-scrolling state to measure natural width
        song.classList.remove('is-marquee');
        track.textContent = clean;
        // measure after layout settles
        requestAnimationFrame(function () {
            if (!track.isConnected) return;
            const overflow = track.scrollWidth - song.clientWidth;
            if (overflow > 6 && clean) {
                // duplicate with a spacer so the loop wraps seamlessly (-50% keyframe)
                const sep = '  •  ';
                track.textContent = clean + sep + clean + sep;
                // ~26px/sec feels like Instagram's now-playing crawl
                const dur = Math.max(8, Math.round(track.scrollWidth / 26));
                track.style.setProperty('--marquee-dur', dur + 's');
                song.classList.add('is-marquee');
            } else {
                track.style.removeProperty('--marquee-dur');
            }
        });
    }

    // ---- Music chip: label from the YouTube link's oEmbed (title · channel).
    //  If the backsound link is missing or not a valid YouTube URL, HIDE the whole
    //  music chip AND the #btn-toggle-music button (kondisional). ----
    function setupMusicChip() {
        const chip = document.getElementById('reels-music-chip');
        const btn = document.getElementById('btn-toggle-music');
        const link = chip ? (chip.getAttribute('data-music-link') || '').trim() : '';
        const id = youtubeId(link);

        // No valid YouTube link → hide music UI entirely.
        if (!id) {
            if (chip) chip.style.display = 'none';
            if (btn) btn.style.display = 'none';
            return;
        }
        if (chip) chip.style.display = '';
        if (btn) btn.style.display = '';

        const songEl = document.getElementById('reels-hud-song');
        if (!songEl) return;

        // Cache the resolved label on window so re-inject/re-exec doesn't refetch.
        if (S.musicLabel && S.musicId === id) { setSongLabel(S.musicLabel); return; }
        if (S.musicFetching === id) { setSongLabel('Audio asli · Wedding'); return; }
        S.musicId = id;
        S.musicFetching = id;
        setSongLabel('Audio asli · Wedding');  // sensible placeholder

        // YouTube oEmbed gives { title, author_name } with no API key / CORS-friendly.
        const oembed = 'https://www.youtube.com/oembed?format=json&url=' +
            encodeURIComponent('https://www.youtube.com/watch?v=' + id);
        try {
            fetch(oembed).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
                S.musicFetching = null;
                if (!data) return;
                const title = (data.title || '').trim();
                const chan = (data.author_name || '').trim();
                const label = title ? (chan ? title + ' · ' + chan : title) : (chan || '');
                if (label) {
                    S.musicLabel = label;
                    setSongLabel(label);
                }
            }).catch(function () { S.musicFetching = null; });
        } catch (e) { S.musicFetching = null; }
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
    //  OPEN
    // =====================================================================
    function revealInvitation() {
        S.opened = true;
        document.body.style.overflow = 'hidden';
        const gate = document.getElementById('reels-gate');
        const hud = document.getElementById('theme-fab-container');
        if (gate) gate.classList.add('is-hidden');
        if (hud) hud.style.display = 'block';
        S.current = 0;
        applyActive();
        // Some environments (e.g. the Theme Editor preview iframe) return a
        // non-Promise from audio.play(); guard so a throw here never aborts reveal.
        const bgMusic = document.getElementById('bg-music');
        if (bgMusic) {
            try { const pr = bgMusic.play(); if (pr && pr.catch) pr.catch(function () { }); } catch (e) { /* noop */ }
            updateMusicUI();
        }
        nudgeYouTubeMusic();
    }

    // No splash screen: opening the invitation reveals the feed immediately.
    function runIntro() {
        S.introStarted = true;
        revealInvitation();
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
            // Tapping the profile (avatar + handle) jumps to the Mempelai section.
            if (t.closest('.reels-topmeta-left')) { goToStory('couples'); return; }
            // IG app-header icons carry data-goto-story → jump to that section.
            const gotoStoryEl = t.closest('[data-goto-story]');
            if (gotoStoryEl) { e.preventDefault(); goToStory(gotoStoryEl.getAttribute('data-goto-story')); return; }
            if (t.closest('#reels-hero-next')) { next(); return; }
            // Tap-to-next/prev is a story gesture — disabled on the feed pages.
            if (t.closest('#reels-tap-prev')) { if (!isBareStory()) prev(); return; }
            if (t.closest('#reels-tap-next')) { if (!isBareStory()) next(); return; }

            // Segment dashes (in the top bar) and menu links (in #menu-modal) both
            // carry data-goto. Accept either, as long as it belongs to this theme.
            const gotoEl = t.closest('[data-goto]');
            if (gotoEl && (gotoEl.closest('#reels-progress') || gotoEl.closest('#reels-menu-list') || gotoEl.closest('.ig-highlights'))) {
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
            // Arrow-key paging is a story gesture — disabled on the feed pages.
            if (isBareStory()) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
        }, false);

        // --- Swipe (vertical primary, horizontal fallback) ---
        let sx = 0, sy = 0, swiping = false;
        document.addEventListener('touchstart', function (e) {
            if (!S.opened || e.touches.length !== 1) { swiping = false; return; }
            // Swipe/slide paging is a story gesture — disabled on the feed pages so
            // they scroll like a normal Instagram feed.
            if (isBareStory()) { swiping = false; return; }
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
                // Horizontal swipe inside a horizontal scroller (story carousel or the
                // highlights row) scrolls that, not the pager.
                if (e.target && e.target.closest && e.target.closest('.ig-story-carousel, .ig-highlights')) return;
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

    // ---- Instagram avatars: use the bride photo when the element carries a valid
    //  background-image; otherwise fall back to a single initial letter. The
    //  template injects the full nickname/guest name as text — collapse it to the
    //  first letter (idempotent — keeps the full value on data-full for re-runs). ----
    function hasValidBg(el) {
        const bg = el.style.backgroundImage || '';
        const m = bg.match(/url\(["']?(.*?)["']?\)/);
        return !!(m && m[1] && m[1].indexOf('{{') === -1 && !/^data:image\/svg/i.test(m[1]));
    }
    function applyAvatarInitials() {
        Array.from(document.querySelectorAll('.reels-avatar-inner, .reels-hud-avatar, .wish-avatar, .ig-composer-avatar'))
            .forEach(function (el) {
                // The composer avatar is a fixed generic icon — never collapse to initials.
                if (el.classList.contains('ig-composer-avatar-icon')) return;
                const full = el.dataset.full || (el.textContent || '').trim();
                if (full) el.dataset.full = full;
                if (hasValidBg(el)) {
                    // Photo present → show the image, hide the fallback letter.
                    el.classList.add('has-photo');
                    if (el.textContent.trim() !== '') el.textContent = '';
                    if (full) el.setAttribute('title', full);
                    return;
                }
                if (!full) return;
                const initial = full.charAt(0).toUpperCase();
                if (el.textContent.trim() !== initial) el.textContent = initial;
                el.setAttribute('title', full);
            });
    }

    // ---- Story Reply coverflow carousel: mark the centered slide as .is-focus
    //  (largest) and sync the dots. Wired once per live carousel element. ----
    function updateStoryFocus(carousel) {
        const slides = Array.from(carousel.querySelectorAll('.ig-story-slide'));
        if (!slides.length) return;
        const mid = carousel.scrollLeft + carousel.clientWidth / 2;
        let best = 0, bestDist = Infinity;
        slides.forEach(function (s, i) {
            const c = s.offsetLeft + s.offsetWidth / 2;
            const d = Math.abs(c - mid);
            if (d < bestDist) { bestDist = d; best = i; }
        });
        slides.forEach(function (s, i) { s.classList.toggle('is-focus', i === best); });
        const dots = document.getElementById('ig-story-dots');
        if (dots) Array.from(dots.children).forEach(function (dot, i) { dot.classList.toggle('is-active', i === best); });
    }

    function setupStoryCarousel() {
        const carousel = document.getElementById('ig-story-carousel');
        if (!carousel || carousel.dataset.wired) return;
        carousel.dataset.wired = '1';
        const slides = Array.from(carousel.querySelectorAll('.ig-story-slide'));
        // Build dots to match the slide count.
        const dots = document.getElementById('ig-story-dots');
        if (dots && dots.children.length !== slides.length) {
            dots.innerHTML = slides.map(function () { return '<span class="ig-story-dot"></span>'; }).join('');
        }
        let raf = 0;
        carousel.addEventListener('scroll', function () {
            if (raf) return;
            raf = requestAnimationFrame(function () { raf = 0; updateStoryFocus(carousel); });
        }, { passive: true });
        // Center on the middle slide so it opens already "in focus".
        const startIdx = Math.floor(slides.length / 2);
        if (slides[startIdx]) {
            carousel.scrollLeft = slides[startIdx].offsetLeft - (carousel.clientWidth - slides[startIdx].offsetWidth) / 2;
        }
        updateStoryFocus(carousel);
    }

    // =====================================================================
    //  RENDER PASS — (re)build everything against the live DOM
    // =====================================================================
    // Direct fallback binding on the open button. The primary path is the
    // document-delegated click handler, but in the standalone Theme Editor preview
    // iframe there is no host React handler; a stray stopImmediatePropagation from
    // another delegated listener could swallow the delegated click. A direct
    // per-element handler guarantees "Buka Undangan" always reveals the feed.
    function wireOpenButton() {
        const btn = document.getElementById('btn-open-invitation');
        if (!btn || btn.dataset.trlOpenWired) return;
        btn.dataset.trlOpenWired = '1';
        btn.addEventListener('click', function () {
            if (S.opened) return;
            btn.disabled = true;
            nudgeYouTubeMusic();
            runIntro();
        });
    }

    function renderVisuals() {
        if (!viewport()) return;
        wireOpenButton();
        buildChrome();
        assignGalleryBackgrounds();
        setupHeroMontage();
        buildHighlights();
        renderCalendar();
        spawnParticles();
        applyAvatarInitials();
        setupStoryCarousel();
        setupMusicChip();
        setupEventMaps();
        // Instagram profile "Kiriman" count = number of gallery images.
        const countEl = document.getElementById('ig-photo-count');
        if (countEl) {
            const n = document.querySelectorAll('#gallery .gallery-img').length;
            countEl.textContent = String(n);
        }
        // Instagram "Komentar" count = number of wishes shown.
        const cmCount = document.getElementById('ig-comments-count');
        if (cmCount) {
            const n = document.querySelectorAll('.ig-comments-list .wish-item').length;
            cmCount.textContent = n ? String(n) : '';
        }
        updateMusicUI();
        applyGuestGating();
        // If we've already opened but a re-inject reset the gate/HUD, restore them.
        // If NOT opened yet, make sure the cover gate is fully visible (never let a
        // stray is-hidden class or a host display toggle keep the cover hidden).
        const gate = document.getElementById('reels-gate');
        const hud = document.getElementById('theme-fab-container');
        if (S.opened) {
            if (gate) gate.classList.add('is-hidden');
            if (hud) hud.style.display = 'block';
            document.body.style.overflow = 'hidden';
        } else {
            if (gate) { gate.classList.remove('is-hidden'); gate.style.removeProperty('display'); }
            if (hud) hud.style.display = 'none';
        }
        // Re-apply active story LAST so the chrome-hide (bare sections) wins over the
        // HUD restore above, and stays correct after every re-inject/re-render.
        applyActive();
    }

    // =====================================================================
    //  BOOT
    // =====================================================================
    installGlobalListeners();
    startCountdown();
    renderVisuals();

    // Re-render after the host resolves gallery images asynchronously.
    [500, 1200, 2500].forEach(function (d) { setTimeout(function () { assignGalleryBackgrounds(); buildHighlights(); renderCalendar(); }, d); });

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
    // NOTE: match ONLY the host theme wrapper's opened class — a bare `.is-opened`
    // is too generic and can match unrelated app elements, which would reveal the
    // feed (hiding the cover gate) before the guest ever taps "Buka Undangan".
    const rootOpened = document.querySelector('.theme-wrapper.is-opened');
    if (S.opened) {
        revealInvitation();
    } else if (rootOpened && !S.introStarted) {
        runIntro();
    } else {
        // Not opened yet: keep the page locked behind the gate.
        document.body.style.overflow = 'hidden';
    }

})();
