# TikTok / Reels — wedding theme

A full-screen **story pager** wedding invitation, styled like TikTok / Instagram
Reels. Navigation is the Instagram-Stories model: a **segmented progress bar** at
the top (one dash per section), and you move between sections instead of scrolling
one long page.

## Concept

- Each section is a full-screen "story". The **segmented bar** at the top shows one
  dash per active section; the current one glows pink→cyan, past ones fill white.
- **Move between stories** by:
  - Tapping the **right edge** of the screen (next) or **left edge** (previous).
  - **Swiping** up/next, down/previous (left/right also work).
  - Tapping a **segment** in the top bar to jump straight to that story.
  - The **≡ menu** (top-right or the action rail) → pick any section.
- **Hero** and **Closing** use their own uploaded photos as the section background
  (`photo_hero_cover`, `photo_closing`).
- Sections **without** a dedicated photo (countdown, couples, schedule, streaming,
  story, rsvp, wishes, gift) borrow images from the **gallery** as their background.
  If there is no gallery, they fall back to a dark neon gradient. This is wired in
  `index.js` (`assignGalleryBackgrounds`), which reads the rendered gallery `<img>`
  URLs and re-applies them after the host finishes resolving image sources.
- **Bottom-left HUD**: couple names, the current section caption, an animated
  "now playing" equalizer chip.
- **Bottom-right action rail** (TikTok style): QR (`#btn-show-qr`), music toggle
  (`#btn-toggle-music`, a spinning disc), and menu (`#btn-show-menu`).

## Files

- `index.html` — story panels + top bar + HUD + open gate + intro loader + menu modal.
- `index.css` — TikTok palette (black canvas, `--trl-pink #fe2c55`, `--trl-cyan #25f4ee`).
- `index.js` — the story-pager engine, countdown, calendar, music mirror, intro,
  particles, and re-injection recovery.

## Host contract (kept verbatim)

- **Cleanup hook**: `window.__trlCleanup` is called on re-entry so timers/listeners
  don't stack when the host re-executes the script.
- **Host-recognised IDs** are used as-is: `btn-show-qr`, `btn-show-menu`,
  `btn-toggle-music`, `bg-music`, `play-icon`/`pause-icon`, `btn-submit-ucapan` +
  `wish-name` + `wish-message`, `btn-submit-kehadiran` + `rsvp-status`/`rsvp-guests`/
  `rsvp-code`, and the FAB wrapper `theme-fab-container`.
- **Music is host-owned** — the theme only mirrors state; it never calls `play()`
  except the one-shot autoplay nudge on open.
- **Intro overlay** carries the host-recognised class `theme-intro-overlay` so the
  host defers its force-reveal until the intro finishes.
- **FAB wrapper**: the host force-sets `#theme-fab-container` to `display:block` on
  open, so the flex layout lives on an inner `.reels-hud`; the wrapper is inert.
- **Re-injection safe**: on RSVP/wish submit the host swaps the theme HTML without
  re-running the JS. The pager never caches section nodes in a closure — it
  re-queries them live and a `MutationObserver` restores the active story.

## Required theme setting

Set **`flag_use_system_action_button` = `false`** on this theme's record in the
Theme Editor.

The host's built-in action buttons (system menu + scroll-to-top) navigate by
`scrollIntoView`, which does nothing in a story-pager (sections are stacked and
toggled, not scrolled). Turning the system buttons **off** lets this theme's own
`#btn-show-menu` open its in-theme `#menu-modal` (which navigates the pager) and
prevents the gold scroll-to-top button from appearing.

## Verifying

Headless Chrome screenshots don't render on this machine. To verify, paste the 3
files into the host **Theme Editor** and open the preview, or ask the tenant to
check on their device.
