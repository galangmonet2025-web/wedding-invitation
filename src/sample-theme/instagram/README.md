# Instagram — wedding theme

A full-screen **story pager** wedding invitation, styled after **Instagram**
(Stories + Reels). Navigation is the Instagram-Stories model: a **segmented
progress bar** at the top (one dash per section), and you move between sections
instead of scrolling one long page.

> The source folder is still named `tiktok-reels` (its original theme code). The
> visual identity is now Instagram; the display name / `theme_code` shown to
> tenants is managed server-side in the Theme Editor.

## Concept

- Each section is a full-screen "story". The **segmented bar** at the top shows one
  dash per active section; past ones fill white, the current one is highlighted.
- **Move between stories** by:
  - Tapping the **right edge** of the screen (next) or **left edge** (previous).
  - **Swiping** up/next, down/previous (left/right also work).
  - Tapping a **segment** in the top bar to jump straight to that story.
  - The **⋯ / ≡ menu** (top-right or the action rail) → pick any section.
- **No splash screen** — tapping *Buka Undangan* reveals the first story immediately.
- **Hero** and **Closing** use their own uploaded photos as the section background
  (`photo_hero_cover`, `photo_closing`). The hero shows only couple + date + quote;
  the "Kepada Yth." guest line lives on the open gate (cover), not the hero.
- The **Mempelai** section renders the groom and bride as **Instagram post cards**
  (avatar + handle + verified tick, photo, like/comment/share row, caption).
- Sections **without** a dedicated photo (countdown, schedule, streaming, story,
  rsvp, wishes, gift) borrow images from the **gallery** as their background. If
  there is no gallery, they fall back to a dark IG-gradient. This is wired in
  `index.js` (`assignGalleryBackgrounds`).
- **Gallery** is wrapped in `#gallery` so the host's universal lightbox collects all
  images and its next/prev arrows work.
- **Gift**: when two rekening are enabled they render **side by side**.
- **Bottom-right action rail** (Reels style): QR (`#btn-show-qr`), music toggle
  (`#btn-toggle-music`, a spinning disc), and menu (`#btn-show-menu`).

## Layout

- **Mobile**: full-screen story pager.
- **Desktop**: an ambient photo panel fills the left; the story column sits on the
  **right** of the screen. There is **no phone frame** (no bezel / device shadow) —
  just a clean vertical panel.

## Files

- `index.html` — story panels + top bar + HUD + open gate + menu modal.
- `index.css` — Instagram palette (dark story media, IG blue `--ig-blue #3897f0`,
  purple→pink→orange gradient `--ig-grad` for avatars/buttons/highlights).
- `index.js` — the story-pager engine, countdown, calendar, music mirror,
  avatar-initials, particles, and re-injection recovery.

## Host contract (kept verbatim)

- **Idempotent re-exec**: persistent state lives on `window.__trl` so the host
  re-executing the script (on `isOpened` / `jsBase` change) is safe — timers and
  document-level listeners are installed once and guarded by state flags.
- **Host-recognised IDs** are used as-is: `btn-show-qr`, `btn-show-menu`,
  `btn-toggle-music`, `bg-music`, `play-icon`/`pause-icon`, `btn-submit-ucapan` +
  `wish-name` + `wish-message`, `btn-submit-kehadiran` + `rsvp-status`/`rsvp-guests`/
  `rsvp-code`, and the FAB wrapper `theme-fab-container`.
- **Music is host-owned** — the theme only mirrors state; it never calls `play()`
  except the one-shot autoplay nudge on open.
- **FAB wrapper**: the host force-sets `#theme-fab-container` to `display:block` on
  open, so the flex layout lives on an inner `.reels-hud`; the wrapper is inert.
- **Re-injection safe**: on RSVP/wish submit the host swaps the theme HTML without
  re-running the JS. The pager never caches section nodes in a closure — it
  re-queries them live and a `MutationObserver` restores the active story.

## Required theme setting

Set **`flag_use_system_action_button` = `false`** on this theme's record in the
Theme Editor. The host's built-in action buttons navigate by `scrollIntoView`,
which does nothing in a story-pager (sections are stacked and toggled, not
scrolled). Turning the system buttons **off** lets this theme's own
`#btn-show-menu` open its in-theme `#menu-modal` and prevents the gold
scroll-to-top button from appearing.

## Verifying

Headless Chrome screenshots don't render on this machine. To verify, paste the 3
files into the host **Theme Editor** and open the preview, or ask the tenant to
check on their device.
