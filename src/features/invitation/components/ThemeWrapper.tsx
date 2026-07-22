import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Query an element by selector, preferring a VISIBLE match when duplicates exist.
 *
 * Game themes keep a hidden `#inv-source` (display:none) copy of the whole
 * invitation and CLONE its sections into a visible reveal modal on demand. While
 * a clone is on screen there are TWO elements with the same host id (e.g. two
 * `#rsvp-form`) — the hidden source's and the visible clone's. A plain
 * `querySelector` returns the FIRST in DOM order (the hidden source), so the host
 * would read empty inputs and reveal the wrong (hidden) card. Preferring an
 * on-screen element (`offsetParent !== null`, which is null for display:none)
 * makes the host operate on the clone the guest actually sees. Falls back to the
 * first match when none is visible (normal single-copy themes).
 */
function pick<T extends HTMLElement>(
    container: HTMLElement | null | undefined,
    selector: string,
): T | null {
    if (!container) return null;
    const all = Array.from(container.querySelectorAll<T>(selector));
    if (all.length <= 1) return all[0] || null;
    return all.find((el) => el.offsetParent !== null) || all[0];
}

/**
 * Reveal a "thank you" card and hide its form after a successful submit,
 * WITHOUT triggering a full theme re-render.
 *
 * Themes gate these with the {{#hidden}}/{{^hidden}} template syntax, so both
 * the form and the card are already present in the DOM on first render — the
 * card just sits inside a `<div style="display:none" data-hidden-by="...">`
 * wrapper. Revealing it is a pure DOM flip: clear the wrapper's (and the card's)
 * display, and set the form's display to none.
 *
 * Returns the card element (if found) so callers can further tweak its content
 * (e.g. the RSVP hadir/tidak-hadir branch) before it becomes visible.
 */
function revealThankYou(
    container: HTMLElement | null | undefined,
    formSelector: string,
    cardSelector: string,
): HTMLElement | null {
    if (!container) return null;

    const formEl = pick<HTMLElement>(container, formSelector);
    if (formEl) {
        formEl.style.display = 'none';
        // Also neutralize the {{#hidden}} wrapper if the form happens to sit in
        // one (it normally does not, since the form is shown when the flag is false).
        const formWrap = formEl.closest<HTMLElement>('[data-hidden-by]');
        if (formWrap && formWrap !== container) formWrap.style.display = 'none';
    }

    const cardEl = pick<HTMLElement>(container, cardSelector);
    if (cardEl) {
        cardEl.style.display = '';
        cardEl.style.removeProperty('display');
        // Un-hide the {{^hidden}} wrapper that currently keeps the card collapsed.
        const cardWrap = cardEl.closest<HTMLElement>('[data-hidden-by]');
        if (cardWrap && cardWrap !== container) cardWrap.style.removeProperty('display');
        // Legacy class-based gating support (older themes).
        cardEl.classList.remove('hidden', 'uk-hidden');
    }

    return cardEl;
}

/**
 * Prepend a just-submitted wish to the top of the rendered wishes list WITHOUT
 * re-rendering the theme (which would look like a page refresh). The new item is
 * built from the FORM's own name+message so what the guest typed is exactly what
 * shows. Theme contract:
 *   - the list container is marked `data-loop="wishes"`,
 *   - each wish item marks its fields with `data-wish-field="name|message|time"`.
 * We clone the first existing item as a template (preserving each theme's markup)
 * and only swap the field text. If the list is empty and no `[data-wish-template]`
 * is provided, we build a minimal generic item so the wish still appears.
 */
function prependWish(
    container: HTMLElement | null | undefined,
    name: string,
    message: string,
): void {
    if (!container) return;
    const list = pick<HTMLElement>(container, '[data-loop="wishes"]');
    if (!list) return;

    // Prefer cloning an existing rendered item (or a hidden [data-wish-template]
    // the theme provides) so the new one matches the theme's markup exactly.
    const template = container.querySelector<HTMLElement>('[data-wish-template]')
        || list.querySelector<HTMLElement>(':scope > [data-wish-item]')
        || list.querySelector<HTMLElement>(':scope > *');

    let clone: HTMLElement;
    if (template) {
        clone = template.cloneNode(true) as HTMLElement;
        clone.removeAttribute('data-wish-template');
        clone.style.removeProperty('display');
        clone.setAttribute('data-wish-item', '');
        // Scroll-reveal themes style list items at opacity:0 until an
        // IntersectionObserver adds `.is-visible`. Our clone won't be observed, so
        // mark it visible up front (harmless on themes that don't use it).
        clone.classList.add('is-visible');
        const setField = (field: string, text: string) => {
            const el = clone.querySelector<HTMLElement>(`[data-wish-field="${field}"]`);
            if (el) el.textContent = text;
        };
        setField('name', name);
        setField('message', message);
        setField('time', 'Baru saja');
    } else {
        // No item and no template (empty list, no seed) → build a minimal generic
        // item so the guest's wish still appears. Neutral markup that inherits the
        // list's styling as best it can.
        clone = document.createElement('div');
        clone.setAttribute('data-wish-item', '');
        const nameEl = document.createElement('div');
        nameEl.setAttribute('data-wish-field', 'name');
        nameEl.style.fontWeight = '700';
        nameEl.textContent = name;
        const msgEl = document.createElement('div');
        msgEl.setAttribute('data-wish-field', 'message');
        msgEl.textContent = message;
        clone.appendChild(nameEl);
        clone.appendChild(msgEl);
    }

    list.insertBefore(clone, list.firstChild);
}

/**
 * Within a revealed RSVP card, show only the branch matching the guest's actual
 * attendance. Both branches (`data-rsvp-branch="hadir"` / `"tidak"`) are always
 * in the DOM, each wrapped in a {{#hidden}} <div data-hidden-by>; we toggle the
 * wrapper that carries the display state.
 */
function syncRsvpBranch(cardEl: HTMLElement | null | undefined, hadir: boolean): void {
    if (!cardEl) return;
    cardEl.querySelectorAll<HTMLElement>('[data-rsvp-branch]').forEach((el) => {
        const show = (el.getAttribute('data-rsvp-branch') === 'hadir') === hadir;
        const wrap = el.closest<HTMLElement>('[data-hidden-by]');
        const toggleEl = (wrap && cardEl.contains(wrap)) ? wrap : el;
        toggleEl.style.display = show ? '' : 'none';
    });
}

interface ThemeWrapperProps {
    htmlBase: string;
    cssBase?: string;
    jsBase?: string;
    isOpened: boolean;
    isPlaying: boolean;
    setIsOpened: (val: boolean) => void;
    setIsPlaying: (val: boolean) => void;
    onShowQR: () => void;
    onShowMenu: () => void;
    onSubmitRSVP: (data: { status: string; guests: number; code: string }) => Promise<{ success: boolean; message: string; calendarUrl?: string }>;
    onSubmitWish: (data: { name: string; message: string }) => Promise<{ success: boolean; message: string }>;
    onSubmitGift?: (data: { name: string; amount: number; bank: string }) => Promise<{ success: boolean; message: string }>;
    onOpenLightbox: (index: number, images: string[]) => void;
    weddingDate?: string;
    flagUseSystemActionButton?: boolean;
    children?: React.ReactNode;
}

export function ThemeWrapper({
    htmlBase,
    cssBase,
    jsBase,
    isOpened,
    isPlaying,
    setIsOpened,
    setIsPlaying,
    onShowQR,
    onShowMenu,
    onSubmitRSVP,
    onSubmitWish,
    onSubmitGift,
    onOpenLightbox,
    weddingDate,
    flagUseSystemActionButton = true,
    children
}: ThemeWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showScrollUp, setShowScrollUp] = useState(false);

    // Once the guest submits a wish/RSVP in this session, the thank-you card must
    // STAY revealed (and the form hidden) even if htmlBase re-injects for an
    // unrelated reason — e.g. a new wish is appended to {{#each wishes}}, or the
    // language changes. We do not flip the guest flag in templateData (that would
    // itself re-inject on every submit), so the re-parsed HTML would otherwise show
    // the form again. These refs let us re-assert the reveal after each injection.
    const submittedWishRef = useRef(false);
    const submittedRSVPRef = useRef<{ hadir: boolean } | null>(null);

    // Remember the last scroll position of whatever element actually scrolls
    // (the phone container on desktop, the window on mobile). When htmlBase
    // changes (e.g. after submitting RSVP/wish, the template re-renders to show
    // the thank-you state), React re-injects the theme DOM and the scroll
    // resets to top — which feels like a full page refresh. We capture the
    // position on scroll and restore it right after the DOM is replaced.
    const lastScroll = useRef<{ el: HTMLElement | Window; top: number }>({ el: window, top: 0 });

    // Tracks the htmlBase from the previous render so we can tell an initial
    // theme injection (keep the scroll-in animation) from a re-injection caused
    // by a template re-parse after submitting RSVP/wish (force content visible).
    const prevHtmlRef = useRef<string | null>(null);

    // Snapshot playback state of theme <video> elements (keyed by id) so a host
    // HTML re-injection doesn't RESTART a video that was already playing.
    //
    // Kenapa perlu: host mengganti seluruh innerHTML tema tiap `htmlBase` berubah
    // (mis. gambar tenant yang tiba belakangan ter-merge ke template, atau setelah
    // RSVP/ucapan). Penggantian itu membuang <video> lama dan membuat yang baru
    // dari template — video "seakan refresh lalu berhenti", karena JS tema TIDAK
    // di-run ulang (di-guard) sehingga .play() tak dipanggil lagi pada elemen baru.
    // Kita rekam currentTime/paused/ended secara berkala, lalu setelah re-inject
    // pulihkan posisi + lanjutkan main pada <video> baru dengan id yang sama.
    const videoStateRef = useRef<Record<string, { time: number; paused: boolean; ended: boolean }>>({});

    useEffect(() => {
        const handleScroll = (e: any) => {
            const tgt = e.target;
            const scrollTop = (tgt && typeof tgt.scrollTop === 'number' ? tgt.scrollTop : 0)
                || window.scrollY || document.documentElement.scrollTop;
            setShowScrollUp(scrollTop > 200);

            // Track the active scroller + position for restoration
            if (tgt instanceof HTMLElement && tgt.scrollTop > 0) {
                lastScroll.current = { el: tgt, top: tgt.scrollTop };
            } else {
                lastScroll.current = { el: window, top: window.scrollY || document.documentElement.scrollTop };
            }
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, []);

    // Restore scroll position synchronously after the theme DOM is re-injected
    // due to an htmlBase change, so submitting a form doesn't jump to the top.
    useLayoutEffect(() => {
        const { el, top } = lastScroll.current;
        if (!top) return;
        // restore on the next frame too, in case layout settles late
        const restore = () => {
            try {
                if (el === window) window.scrollTo(0, top);
                else (el as HTMLElement).scrollTop = top;
            } catch { /* ignore */ }
        };
        restore();
        const raf = requestAnimationFrame(restore);
        return () => cancelAnimationFrame(raf);
    }, [htmlBase]);

    // SKELETON GAMBAR: undangan tampil segera (tanpa layar loading full); gambar
    // tenant/tema yang masih lambat di-resolve diberi shimmer sebagai placeholder,
    // bukan ikon broken atau area kosong. Berlaku umum untuk SEMUA tema tanpa
    // mengubah markup tema-nya.
    //
    // Cara kerja: setiap kali HTML tema di-(re)inject (htmlBase berubah — termasuk
    // saat base64 gambar baru ter-merge ke template), scan semua <img>. Yang BELUM
    // selesai load (belum `complete` atau naturalWidth 0, mis. src masih kosong)
    // diberi class `inv-img-loading`; class itu dilepas saat gambar berhasil/gagal
    // load. Gambar yang sudah cached (complete) tak pernah diberi skeleton.
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const imgs = Array.from(container.querySelectorAll('img'));
        const cleanups: Array<() => void> = [];

        imgs.forEach((img) => {
            // Sudah termuat (cache hit / src langsung valid) -> tak perlu skeleton.
            const hasSrc = !!(img.getAttribute('src') || '').trim();
            if (hasSrc && img.complete && img.naturalWidth > 0) {
                img.classList.remove('inv-img-loading');
                return;
            }

            img.classList.add('inv-img-loading');
            const done = () => img.classList.remove('inv-img-loading');
            // `load` juga menyala saat src kosong diganti src valid nanti; `error`
            // melepas skeleton agar area tak berkedip selamanya kalau gambar gagal.
            img.addEventListener('load', done);
            img.addEventListener('error', done);
            cleanups.push(() => {
                img.removeEventListener('load', done);
                img.removeEventListener('error', done);
            });
        });

        return () => { cleanups.forEach((fn) => fn()); };
    }, [htmlBase]);

    // PRESERVE VIDEO ACROSS RE-INJECTION. Runs after every htmlBase (re)inject.
    // Step 1: restore any video we snapshotted before this re-inject into the
    //         freshly-created element with the same id (seek to where it was;
    //         resume if it was playing). This kills the "video restarts then
    //         stops" bug when tenant images arrive a few seconds after opening.
    // Step 2: (re)attach lightweight listeners that keep videoStateRef current,
    //         so the NEXT re-inject can restore correctly too.
    // Only <video> with an id is handled — an id is required to match old→new.
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const videos = Array.from(container.querySelectorAll<HTMLVideoElement>('video[id]'));
        const cleanups: Array<() => void> = [];

        videos.forEach((video) => {
            const id = video.id;
            const snap = videoStateRef.current[id];

            // Step 1 — restore prior playback state onto the new element.
            if (snap) {
                const applySnapshot = () => {
                    try {
                        if (isFinite(snap.time) && snap.time > 0) {
                            // Clamp to just under duration so a near-finished clip
                            // doesn't loop back to the very start.
                            var dur = video.duration;
                            video.currentTime = (isFinite(dur) && dur > 0)
                                ? Math.min(snap.time, Math.max(0, dur - 0.05))
                                : snap.time;
                        }
                    } catch (e) { /* seeking before metadata is ready — ignore */ }
                    // Resume only if it was actively playing (not paused, not ended).
                    if (!snap.paused && !snap.ended) {
                        var p = video.play();
                        if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay blocked */ });
                    }
                };
                // If metadata is ready we can seek now; else wait for it once.
                if (video.readyState >= 1 /* HAVE_METADATA */) {
                    applySnapshot();
                } else {
                    var onMeta = function () { video.removeEventListener('loadedmetadata', onMeta); applySnapshot(); };
                    video.addEventListener('loadedmetadata', onMeta);
                    cleanups.push(function () { video.removeEventListener('loadedmetadata', onMeta); });
                }
            }

            // Step 2 — keep the snapshot fresh for the next re-inject.
            const capture = () => {
                videoStateRef.current[id] = {
                    time: video.currentTime || 0,
                    paused: video.paused,
                    ended: video.ended,
                };
            };
            // Seed a snapshot ONLY if we don't already have one. When `snap` exists
            // we're mid-restore: the new element still reads time:0/paused:true, so
            // capturing now would clobber the good snapshot before applySnapshot()
            // (which may be async via loadedmetadata) runs. The listeners below take
            // over once real playback/seek events fire on the restored element.
            if (!snap) capture();
            video.addEventListener('timeupdate', capture);
            video.addEventListener('play', capture);
            video.addEventListener('pause', capture);
            video.addEventListener('ended', capture);
            cleanups.push(function () {
                video.removeEventListener('timeupdate', capture);
                video.removeEventListener('play', capture);
                video.removeEventListener('pause', capture);
                video.removeEventListener('ended', capture);
            });
        });

        return function () { cleanups.forEach(function (fn) { fn(); }); };
    }, [htmlBase]);

    // Sync open/envelope state when isOpened is true OR htmlBase changes (re-renders fresh HTML)
    useEffect(() => {
        if (!isOpened) return;

        const container = containerRef.current;
        if (!container) return;

        // 1. Instantly reveal the mock app screen content if open.
        // EXCEPTION: while a cinematic intro overlay is still playing (Netflix
        // "TUDUM", Spotify Wrapped), the theme's own handler controls when the
        // content is revealed — forcing it here would skip the intro. Once the
        // overlay finishes (class 'is-ending' or removed), this becomes a safe
        // fallback reveal so the content can never get stuck hidden.
        const introOverlay = container.querySelector('#nflx-intro, #spwr-intro, .theme-intro-overlay');
        const introPlaying = !!introOverlay
            && introOverlay.classList.contains('is-playing')
            && !introOverlay.classList.contains('is-ending');

        const appScreen = container.querySelector('.mock-app-screen');
        if (appScreen && !appScreen.classList.contains('reveal-content') && !introPlaying) {
            appScreen.classList.add('reveal-content');
        }

        // 2. Make sure document body / phone container allows scrolling
        document.body.style.overflow = 'auto';
        const phoneContainer = container.closest('.phone-container') as HTMLElement;
        if (phoneContainer) {
            phoneContainer.style.overflowY = 'auto';
        }

        // 3. Make sure floating UI/FAB container is visible
        const floatingUI = container.querySelector('#theme-fab-container') || container.querySelector('#floating-ui') as HTMLElement;
        if (floatingUI) {
            (floatingUI as HTMLElement).style.display = 'block';
        }

        // 4. Force update UIkit just in case
        if ((window as any).UIkit) {
            try {
                (window as any).UIkit.update(container, 'update');
            } catch (err) { }
        }

        // 5. Re-reveal scroll-animated content after a *re-injection*.
        //    Scroll-reveal themes (spotify, netflix, lake-como, black-gold,
        //    deep-forest, glassmorphism) style `.reveal-item` at opacity:0 and
        //    add `.is-visible` from an IntersectionObserver in their theme JS.
        //    When htmlBase changes (submitting RSVP/wish re-parses the template
        //    to show the thank-you state), React swaps in FRESH HTML — every
        //    `.reveal-item` is back at opacity:0 — but the host does NOT re-run
        //    theme JS on htmlBase change (see the JS-injection effect below), so
        //    nothing re-adds `.is-visible`. Result: previously-visible sections
        //    go blank. Only the initial injection should keep the animation, so
        //    guard on a real htmlBase change via prevHtmlRef.
        const isReinjection = prevHtmlRef.current !== null && prevHtmlRef.current !== htmlBase;
        prevHtmlRef.current = htmlBase;
        if (isReinjection) {
            container.querySelectorAll('.reveal-item:not(.is-visible)')
                .forEach((el) => el.classList.add('is-visible'));
        }

        // 6. Re-assert the thank-you reveal after a re-injection.
        //    We deliberately don't flip the guest flag in templateData on submit
        //    (that would re-inject the whole theme every time). So if htmlBase
        //    re-parses for ANY other reason afterwards — a new wish appended to
        //    {{#each wishes}}, a language switch — the fresh HTML shows the FORM
        //    again. Re-apply the DOM toggle so the card the guest already earned
        //    stays visible.
        if (submittedWishRef.current) {
            revealThankYou(container, '#wish-form', '#alert-submit-ucapan');
        }
        if (submittedRSVPRef.current) {
            const cardEl = revealThankYou(container, '#rsvp-form', '#alert-submit-kehadiran');
            syncRsvpBranch(cardEl, submittedRSVPRef.current.hadir);
        }
    }, [isOpened, htmlBase]);

    useEffect(() => {
        const loadScript = (id: string, src: string) => {
            // Guard clause to prevent reloading libraries that are already initialized in memory.
            // Overwriting window.UIkit causes registered components and plugins (like icons) to be lost.
            if (id === 'uikit-js' && (window as any).UIkit) return;
            if (id === 'uikit-icons' && (window as any).UIkit && (window as any).UIkit.icon) return;
            if (id === 'bootstrap-js' && (window as any).bootstrap) return;

            if (!document.getElementById(id)) {
                const script = document.createElement('script');
                script.id = id;
                script.src = src;
                script.async = true;
                document.body.appendChild(script);
            }
        };
        const loadCSS = (id: string, href: string) => {
            if (!document.getElementById(id)) {
                const link = document.createElement('link');
                link.id = id;
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            }
        };

        // Load CSS Frameworks (Locked Versions)
        loadCSS('uikit-css', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/css/uikit.min.css');
        loadCSS('bootstrap-css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css');
        loadCSS('remix-icon', 'https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css');

        // Load JS Frameworks Sequentially (uikit-icons depends on uikit-js being ready)
        loadScript('uikit-js', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit.min.js');
        loadScript('uikit-icons', 'https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit-icons.min.js');
        loadScript('bootstrap-js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js');
        // Phaser 3 — HTML5 game framework for canvas-based game themes (UMD global
        // `window.Phaser`). Game themes wait for it via window.__phaserReady (set in
        // the onload below) so their IIFE can `new Phaser.Game(...)`. Locked version.
        loadScript('phaser-js', 'https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js');

        return () => {
            // Remove CSS to prevent bleeding into the admin dashboard or other react components
            ['uikit-css', 'bootstrap-css', 'remix-icon'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        };
    }, []);

    // Execute Custom JS Theme Template
    useEffect(() => {
        if (!jsBase) return;
        const scriptId = 'theme-custom-js';
        const existing = document.getElementById(scriptId);
        if (existing) existing.remove();

        const script = document.createElement('script');
        script.id = scriptId;
        script.innerHTML = `
            try {
                (function() {
                    ${jsBase}
                })();
            } catch(e) {
                console.error("Theme JS error:", e);
            }
        `;
        document.body.appendChild(script);

        return () => {
            const el = document.getElementById(scriptId);
            if (el) el.remove();
        };
        // Re-run ONLY when the theme JS itself changes or the invitation is
        // opened/closed — NOT on every htmlBase change.
        //
        // Why: htmlBase (the parsed template) is recomputed whenever guest state
        // changes — e.g. after a guest submits RSVP / a wish, setData() updates
        // data.guest, which flows into dataContext -> finalHtml. Previously
        // htmlBase was in this dep array, so every submit RE-EXECUTED the whole
        // theme JS. For plain themes that re-ran all listener wiring (flicker +
        // lost state); for game themes it tore down and re-booted the entire
        // game (__gwCleanup -> new Phaser.Game), wiping the player's progress —
        // the "page refreshes after submitting" complaint.
        //
        // Theme JS reads the DOM when it first runs (the initial htmlBase is
        // already injected via dangerouslySetInnerHTML in the same render) and
        // uses document-delegated listeners that survive HTML re-injection, so
        // it does not need re-execution when only guest state changes.
    }, [jsBase, isOpened]);

    // Sync music icon state for themes injected via dangerouslySetInnerHTML
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const musicBtn = container.querySelector('#btn-toggle-music, #btn-music');
        if (musicBtn) {
            // Toggle music-playing class on the button
            if (isPlaying) {
                musicBtn.classList.add('music-playing');
            } else {
                musicBtn.classList.remove('music-playing');
            }

            // 1. Check for child with uk-icon attribute
            const ukIconEl = musicBtn.querySelector('[uk-icon], #music-icon');
            if (ukIconEl) {
                const ratio = ukIconEl.getAttribute('uk-icon')?.includes('ratio: 1.2') ? '; ratio: 1.2' : '';
                ukIconEl.setAttribute('uk-icon', isPlaying ? `icon: pause${ratio}` : `icon: play${ratio}`);
                if ((window as any).UIkit) {
                    try { (window as any).UIkit.icon(ukIconEl); } catch (e) { }
                }
            }

            // 2. Check for child with remix icon or font awesome classes
            const musicBtnIcon = musicBtn.querySelector('i, span:not([uk-icon])');
            if (musicBtnIcon) {
                if (isPlaying) {
                    if (musicBtnIcon.className.includes('ri-')) {
                        musicBtnIcon.className = 'ri-pause-circle-line';
                    } else if (musicBtnIcon.className.includes('fa-')) {
                        musicBtnIcon.className = 'fa fa-pause';
                    }
                } else {
                    if (musicBtnIcon.className.includes('ri-')) {
                        musicBtnIcon.className = 'ri-music-2-line';
                    } else if (musicBtnIcon.className.includes('fa-')) {
                        musicBtnIcon.className = 'fa fa-play';
                    }
                }
            }

            // 3. Check for specific play/pause icons (like SVGs with play-icon/pause-icon)
            const playIcon = musicBtn.querySelector('#play-icon') as HTMLElement;
            const pauseIcon = musicBtn.querySelector('#pause-icon') as HTMLElement;
            if (playIcon && pauseIcon) {
                playIcon.style.display = isPlaying ? 'none' : 'block';
                pauseIcon.style.display = isPlaying ? 'block' : 'none';
            }
        }

        // 4. Dispatch native play/pause events on the local audio element to trigger theme-level listeners
        const bgMusicEl = container.querySelector('#bg-music');
        if (bgMusicEl) {
            try {
                const eventName = isPlaying ? 'play' : 'pause';
                bgMusicEl.dispatchEvent(new Event(eventName));
            } catch (e) {
                console.error("Failed to dispatch event on theme bg-music element:", e);
            }
        }
    }, [isPlaying, htmlBase]); // Re-run when playing state OR html content changes

    // --- SYSTEM COUNTDOWN HELPER ---
    useEffect(() => {
        if (!weddingDate) return;

        const updateCountdown = () => {
            const target = new Date(weddingDate).getTime();
            const now = Date.now();
            const diff = Math.max(0, target - now);

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            const container = containerRef.current;
            if (!container) return;

            // Target elements by ID (which are auto-wrapped in InvitationPage)
            const els = {
                days: container.querySelector('#tm-countdown-days'),
                hours: container.querySelector('#tm-countdown-hours'),
                minutes: container.querySelector('#tm-countdown-minutes'),
                seconds: container.querySelector('#tm-countdown-seconds')
            };

            if (els.days) els.days.textContent = String(d).padStart(2, '0');
            if (els.hours) els.hours.textContent = String(h).padStart(2, '0');
            if (els.minutes) els.minutes.textContent = String(m).padStart(2, '0');
            if (els.seconds) els.seconds.textContent = String(s).padStart(2, '0');
        };

        updateCountdown(); // Initial run
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [weddingDate, htmlBase]); // Restart if wedding date or HTML structure changes

    // --- INTERCEPT LINKS & BUTTONS IN CAPTURE PHASE ---
    // This intercepts click events before any child element listeners (UIkit, standard browser navigation, etc.)
    // can capture them, ensuring the URL is absolutely protected from hash mutations, and preventing
    // UIkit's uk-toggle from hijacking/hiding crucial floating icons.
    useEffect(() => {
        const handleCaptureClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // A. Prevent UIkit's uk-toggle from hijacking/hiding the QR button
            const qrBtn = target.closest('#btn-show-qr');
            if (qrBtn) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                onShowQR();
                return;
            }

            // B. Prevent UIkit's uk-toggle from hijacking/hiding the Menu button
            const menuBtn = target.closest('#btn-show-menu');
            if (menuBtn && flagUseSystemActionButton) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                onShowMenu();
                return;
            }

            const anchor = target.closest('a');
            if (anchor) {
                const href = anchor.getAttribute('href');
                if (href && (href.startsWith('#') || href.includes('#'))) {
                    const hashIndex = href.indexOf('#');
                    const hash = href.substring(hashIndex);

                    // Only intercept if it's a theme layout hash link, NOT a React Router route (which starts with #/)
                    if (hash === '#' || (!hash.startsWith('#/') && hash !== '#/')) {
                        // 1. Instantly kill the event so no other listener (native or UIkit) ever receives it!
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        // 2. Safely trigger target modal hiding to close any open UIkit nav menus
                        const toggleAttr = anchor.getAttribute('uk-toggle');
                        if (toggleAttr && (window as any).UIkit) {
                            const match = toggleAttr.match(/target:\s*(#[a-zA-Z0-9_-]+)/);
                            if (match && match[1]) {
                                try {
                                    (window as any).UIkit.modal(match[1]).hide();
                                } catch (err) { }
                            }
                        } else if ((window as any).UIkit) {
                            // Default fallback to close #menu-modal if present
                            try {
                                (window as any).UIkit.modal('#menu-modal').hide();
                            } catch (err) { }
                            // Also close any offcanvas drawers
                            try {
                                (window as any).UIkit.offcanvas('.uk-offcanvas').hide();
                            } catch (err) { }
                        }

                        // 3. Smooth scroll to the target section element globally
                        if (hash.length > 1) {
                            const targetId = hash.substring(1);
                            const targetEl = document.querySelector(`#${targetId}`);
                            if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    }
                }
            }
        };

        // Attach listener globally to document in capture phase
        document.addEventListener('click', handleCaptureClick, true);

        return () => {
            document.removeEventListener('click', handleCaptureClick, true);
        };
    }, [htmlBase, onShowQR, onShowMenu, flagUseSystemActionButton]);

    const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;

        // --- INTERCEPT HASH LINKS FOR SMOOTH SCROLLING ---
        const anchor = target.closest('a') as HTMLAnchorElement;
        if (anchor) {
            const href = anchor.getAttribute('href');
            if (href && (href.startsWith('#') || href.includes('#'))) {
                const hashIndex = href.indexOf('#');
                const hash = href.substring(hashIndex);

                // 1. Prevent default and stop propagation immediately so UIkit or native browser navigation
                // doesn't hijack the hash URL and break React Router's HashRouter!
                e.preventDefault();
                e.stopPropagation();
                if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation();
                }

                // 2. Safely trigger target modal hiding to close any open UIkit nav menus
                const toggleAttr = anchor.getAttribute('uk-toggle');
                if (toggleAttr && (window as any).UIkit) {
                    const match = toggleAttr.match(/target:\s*(#[a-zA-Z0-9_-]+)/);
                    if (match && match[1]) {
                        try {
                            (window as any).UIkit.modal(match[1]).hide();
                        } catch (err) { }
                    }
                } else if ((window as any).UIkit) {
                    // Default fallback to close #menu-modal if present
                    try {
                        (window as any).UIkit.modal('#menu-modal').hide();
                    } catch (err) { }
                }

                // 3. Smooth scroll to the target section element globally
                if (hash.length > 1) {
                    const targetId = hash.substring(1);
                    const targetEl = document.querySelector(`#${targetId}`);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                return;
            }
        }

        // --- SUBMIT RSVP (Kehadiran) ---
        if (target.closest('#btn-submit-kehadiran')) {
            e.preventDefault();
            const btn = target.closest('#btn-submit-kehadiran') as HTMLButtonElement;
            if (btn.disabled) return;

            const container = containerRef.current;
            // Prefer the VISIBLE copy (game themes clone a hidden #inv-source, creating
            // duplicate ids while a reveal is open — read the on-screen clone, not the
            // hidden source). #rsvp-code is a hidden input (same value in both), so a
            // plain query is fine for it.
            const alertEl = pick(container, '#alert-submit-kehadiran');
            const status = (pick<HTMLSelectElement | HTMLInputElement>(container, '#rsvp-status'))?.value || 'confirmed';
            const guests = parseInt((pick<HTMLInputElement>(container, '#rsvp-guests'))?.value || '1');
            const code = (container?.querySelector('#rsvp-code') as HTMLInputElement)?.value || '';

            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';

            // #alert-submit-kehadiran is the theme's thank-you CARD (holds hadir/tidak
            // [data-rsvp-branch] sub-cards), NOT a bare alert line. Never clear or write
            // a status string into it — that would wipe the pretty card. Feedback about
            // success/failure is a toast (fired in onSubmitRSVP).
            const rsvpIsCard = !!alertEl?.querySelector('[data-rsvp-branch]');
            if (alertEl && !rsvpIsCard) alertEl.innerHTML = '';

            const res = await onSubmitRSVP({ status, guests, code });

            btn.innerHTML = originalText;

            const hadir = String(status).toLowerCase() === 'confirmed'
                || String(status).toLowerCase() === 'hadir';

            if (res.success) {
                btn.disabled = true;
                submittedRSVPRef.current = { hadir };
                // Hide the form + reveal the thank-you card, then show only the branch
                // matching the answer (Hadir / Tidak Hadir) — no re-render/refresh.
                const cardEl = revealThankYou(container, '#rsvp-form', '#alert-submit-kehadiran');
                syncRsvpBranch(cardEl, hadir);
                // Legacy alert-line themes (no branches) still get an inline status line.
                if (alertEl && !rsvpIsCard) {
                    alertEl.className = 'uk-margin-small-top uk-text-small uk-text-success';
                    alertEl.innerHTML = '<i class="ri-checkbox-circle-line"></i> ' + res.message;
                }
            } else {
                btn.disabled = false;
                if (alertEl && !rsvpIsCard) {
                    alertEl.className = 'uk-margin-small-top uk-text-small uk-text-danger';
                    alertEl.innerHTML = '<i class="ri-error-warning-line"></i> ' + res.message;
                }
            }
        }

        // --- SUBMIT WISH (Ucapan) ---
        if (target.closest('#btn-submit-ucapan')) {
            e.preventDefault();
            const btn = target.closest('#btn-submit-ucapan') as HTMLButtonElement;
            if (btn.disabled) return;

            const container = containerRef.current;
            // Prefer the VISIBLE copy (see note in the RSVP handler above).
            const name = (pick<HTMLInputElement>(container, '#wish-name'))?.value || '';
            const message = (pick<HTMLTextAreaElement>(container, '#wish-message'))?.value || '';

            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';

            // #alert-submit-ucapan is the theme's thank-you CARD (not a bare alert line):
            // don't clear or overwrite it, or we'd wipe the card. Feedback = toast.
            const res = await onSubmitWish({ name, message });

            btn.innerHTML = originalText;

            if (res.success) {
                btn.disabled = true; // stay disabled on success

                // Prepend the just-typed wish to the top of the list from the FORM's own
                // values, so what the guest typed == what appears — no re-render/refresh.
                prependWish(container, name, message);

                // Clear inputs (the visible copy)
                const activeName = pick<HTMLInputElement>(container, '#wish-name');
                const activeMsg = pick<HTMLTextAreaElement>(container, '#wish-message');
                if (activeName) activeName.value = '';
                if (activeMsg) activeMsg.value = '';

                // Reveal the "thank you" card and hide the form WITHOUT re-rendering the
                // theme. Both the form and the card are already in the DOM (gated via
                // {{#hidden}}/{{^hidden}}); we just flip display.
                submittedWishRef.current = true;
                revealThankYou(container, '#wish-form', '#alert-submit-ucapan');
            } else {
                btn.disabled = false;
            }
        }

        // --- SUBMIT GIFT (Hadiah) ---
        if (target.closest('#btn-submit-hadiah') && onSubmitGift) {
            e.preventDefault();
            const btn = target.closest('#btn-submit-hadiah') as HTMLButtonElement;
            if (btn.disabled) return;

            const container = containerRef.current;
            const alertEl = container?.querySelector('#alert-submit-hadiah');
            const name = (container?.querySelector('#gift-name') as HTMLInputElement)?.value || '';
            const amountStr = (container?.querySelector('#gift-amount') as HTMLInputElement)?.value || '0';
            const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
            const bank = (container?.querySelector('#gift-bank') as HTMLInputElement)?.value || '';

            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line uk-animation-spin"></i> Mengirim...';

            if (alertEl) alertEl.innerHTML = '';

            const res = await onSubmitGift({ name, amount, bank });

            btn.innerHTML = originalText;

            if (alertEl) {
                alertEl.className = `uk-margin-small-top uk-text-small ${res.success ? 'uk-text-success' : 'uk-text-danger'}`;
                alertEl.innerHTML = (res.success ? '<i class="ri-checkbox-circle-line"></i> ' : '<i class="ri-error-warning-line"></i> ') + res.message;
            }

            if (res.success) {
                btn.disabled = true;
                const activeName = container?.querySelector('#gift-name') as HTMLInputElement;
                const activeAmount = container?.querySelector('#gift-amount') as HTMLInputElement;
                const activeBank = container?.querySelector('#gift-bank') as HTMLInputElement;
                if (activeName) activeName.value = '';
                if (activeAmount) activeAmount.value = '';
                if (activeBank) activeBank.value = '';
            } else {
                btn.disabled = false;
            }
        }

        if (target.closest('#btn-open-invitation')) {
            setIsOpened(true);
            setIsPlaying(true);

            // Some themes play a cinematic intro overlay (e.g. Netflix "TUDUM",
            // Spotify Wrapped) that must run BEFORE the invitation is revealed.
            // If such an overlay exists, let the theme's own open handler control
            // the reveal timing — do NOT force reveal-content here, or the intro
            // gets skipped (the content shows instantly behind/over it).
            const container = containerRef.current;
            const hasIntroOverlay = !!container?.querySelector('#nflx-intro, #spwr-intro, .theme-intro-overlay');

            if (!hasIntroOverlay) {
                const appScreen = document.querySelector('.mock-app-screen');
                if (appScreen) appScreen.classList.add('reveal-content');
            }

            setTimeout(() => {
                document.body.style.overflow = 'auto';
                const phoneContainer = document.querySelector('.phone-container') as HTMLElement;
                if (phoneContainer) phoneContainer.style.overflowY = 'auto';

                if ((window as any).UIkit) {
                    (window as any).UIkit.update(document.body, 'update');
                }
            }, 1000);
        }
        if (target.closest('#btn-show-qr')) {
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent) {
                e.nativeEvent.stopImmediatePropagation();
            }
            onShowQR();
            return;
        }
        if (target.closest('#btn-show-menu') && flagUseSystemActionButton) {
            e.preventDefault();
            onShowMenu();
        }
        if (target.closest('#btn-toggle-music') || target.closest('#btn-music')) {
            e.preventDefault();
            setIsPlaying(!isPlaying);
        }
        if (target.closest('#btn-scoll-up') || target.closest('#btn-scroll-up')) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const phoneContainer = document.querySelector('.phone-container');
            if (phoneContainer) {
                phoneContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
            const scrollableMain = document.querySelector('.mock-app-screen');
            if (scrollableMain) {
                scrollableMain.scrollTo({ top: 0, behavior: 'smooth' });
            }
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }

        // --- UNIVERSAL LIGHTBOX ---
        const galleryItem = target.closest('.gallery-item, .lightbox-injection') as HTMLElement;
        if (galleryItem) {
            const imgEl = (galleryItem.tagName === 'IMG'
                ? galleryItem
                : galleryItem.querySelector('.lightbox-injection, img')) as HTMLImageElement;

            if (imgEl) {
                // Prevent default and stop propagation immediately to override UIkit's or theme's built-in lightboxes!
                e.preventDefault();
                e.stopPropagation();
                if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation();
                }

                const galleryContainer = target.closest('#sec-gallery, #gallery, .gallery-container, .section-gallery');
                if (galleryContainer) {
                    const allLbImages = Array.from(galleryContainer.querySelectorAll('.lightbox-injection, img')) as HTMLImageElement[];
                    const imageUrls = allLbImages.map(img => img.src || img.getAttribute('src') || '');
                    const currentIndex = allLbImages.indexOf(imgEl);
                    onOpenLightbox(currentIndex >= 0 ? currentIndex : 0, imageUrls);
                } else {
                    onOpenLightbox(0, [imgEl.src]);
                }
                return;
            }
        }
    };

    return (
        <div className={`w-full min-h-screen theme-wrapper relative bg-white ${isOpened ? 'is-opened' : 'is-closed'}`}>
            {cssBase && (
                <style dangerouslySetInnerHTML={{ __html: cssBase }} />
            )}

            {/* Persistent Visibility State Overrides using Static CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .is-closed #theme-fab-container { display: none !important; }
                .is-closed #main-content { display: none !important; }
                .is-opened #theme-cover { display: none !important; }
                .is-opened #main-content { display: block !important; }
                
                /* Override/hide theme FAB container if system action button is requested */
                ${flagUseSystemActionButton ? `
                    #theme-fab-container { display: none !important; }
                ` : `
                    .is-opened #theme-fab-container { display: block !important; }
                `}

                .system-fab-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 999;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    pointer-events: auto;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Hide the vertical scrollbar (white track) across every theme
                   while keeping the content fully scrollable. Applies to the
                   host scrollers: window (html/body) and the theme phone-container. */
                html, body, .theme-wrapper, .phone-container, .mock-app-screen {
                    scrollbar-width: none;      /* Firefox */
                    -ms-overflow-style: none;   /* IE/Edge legacy */
                }
                html::-webkit-scrollbar,
                body::-webkit-scrollbar,
                .theme-wrapper::-webkit-scrollbar,
                .phone-container::-webkit-scrollbar,
                .mock-app-screen::-webkit-scrollbar {
                    display: none;              /* Chrome/Safari/Edge */
                    width: 0;
                    height: 0;
                }

                @media (max-width: 640px) {
                    .system-fab-container {
                        bottom: 16px;
                        right: 16px;
                        gap: 8px;
                    }
                    .system-fab-container button {
                        width: 42px !important;
                        height: 42px !important;
                    }
                    .system-fab-container button i {
                        font-size: 16px !important;
                    }
                }
            ` }} />

            <div
                ref={containerRef}
                className="w-full min-h-screen"
                dangerouslySetInnerHTML={{ __html: htmlBase }}
                onClick={handleClick}
                onInput={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.id === 'rsvp-status' || target.closest('#rsvp-status')) {
                        const statusEl = (target.id === 'rsvp-status' ? target : target.closest('#rsvp-status')) as HTMLSelectElement | HTMLInputElement;
                        const container = containerRef.current;
                        const guestsEl = container?.querySelector('#rsvp-guests') as HTMLInputElement;
                        if (guestsEl) {
                            if (statusEl.value === 'declined') {
                                guestsEl.value = '0';
                                guestsEl.disabled = true;
                            } else {
                                guestsEl.disabled = false;
                                if (guestsEl.value === '0') guestsEl.value = '1';
                            }
                        }
                    }
                }}
                onSubmit={(e) => e.preventDefault()}
            />

            {/* System Floating Action Buttons */}
            {flagUseSystemActionButton && isOpened && (
                <div className="system-fab-container">
                    {/* Scroll up */}
                    {showScrollUp && (
                        <button
                            id="btn-scoll-up"
                            className="w-12 h-12 rounded-full bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-gold-500 hover:text-white"
                            title="Scroll ke Atas"
                        >
                            <i className="ri-arrow-up-line text-lg"></i>
                        </button>
                    )}

                    {/* Play/Pause Music */}
                    <button
                        id="btn-toggle-music"
                        className={`w-12 h-12 rounded-full backdrop-blur-md shadow-lg border flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isPlaying
                            ? 'bg-gold-500 border-gold-400/50 text-white'
                            : 'bg-white/85 dark:bg-gray-800/85 border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200'
                            }`}
                        title={isPlaying ? "Jeda Musik" : "Putar Musik"}
                    >
                        <i className={`text-lg ${isPlaying ? 'ri-music-2-fill' : 'ri-music-2-line'}`} style={{ animation: isPlaying ? 'spin 3s linear infinite' : 'none' }}></i>
                    </button>

                    {/* Show QR code */}
                    <button
                        id="btn-show-qr"
                        className="w-12 h-12 rounded-full bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-gold-500 hover:text-white"
                        title="QR Code"
                    >
                        <i className="ri-qr-code-line text-lg"></i>
                    </button>

                    {/* Show list menu */}
                    <button
                        id="btn-show-menu"
                        className="w-12 h-12 rounded-full bg-white/85 dark:bg-gray-800/85 backdrop-blur-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 hover:bg-gold-500 hover:text-white"
                        title="Daftar Menu"
                    >
                        <i className="ri-menu-line text-lg"></i>
                    </button>
                </div>
            )}

            {/* Render any React floating elements / Modals on top */}
            {children}
        </div>
    );
}
