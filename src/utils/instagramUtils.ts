/**
 * Instagram handle normalization for wedding themes.
 *
 * Tenants may fill the mempelai Instagram field in any of these shapes:
 *   1. "@galang_syn"
 *   2. "galang_syn"
 *   3. "https://www.instagram.com/galang_syn/"
 *   4. "instagram.com/galang_syn?igsh=..."
 *
 * Themes consume the value as `{{ig_laki_laki}}` / `{{ig_perempuan}}` in BOTH
 * a display context (`@{{ig_laki_laki}}`) and a URL context
 * (`href="https://instagram.com/{{ig_laki_laki}}"`). So the value handed to the
 * theme must ALWAYS be the bare username — no leading '@', no URL — otherwise the
 * link breaks (e.g. instagram.com/@galang_syn or instagram.com/https://...).
 */

/**
 * Extract the bare Instagram username from any of the supported input shapes.
 * Returns '' when the input is empty or yields no username.
 * The username itself is NOT prefixed with '@' — themes add the '@' themselves.
 */
export function normalizeInstagramUsername(raw: string | null | undefined): string {
    if (!raw) return '';
    let s = String(raw).trim();
    if (!s) return '';

    // If it looks like a URL (or a bare instagram.com/... reference), pull out the
    // first path segment after the instagram host — that's the username.
    const urlMatch = s.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)/i);
    if (urlMatch && urlMatch[1]) {
        s = urlMatch[1];
    }

    // Strip a leading '@', surrounding slashes/whitespace, and any query/hash tail
    // that survived (e.g. "galang_syn?igsh=..." → "galang_syn").
    s = s.replace(/^@+/, '').replace(/^\/+|\/+$/g, '').split(/[?#]/)[0].trim();

    return s;
}

/**
 * Build the public instagram.com profile URL for a raw handle, or '' if empty.
 */
export function instagramProfileUrl(raw: string | null | undefined): string {
    const user = normalizeInstagramUsername(raw);
    return user ? `https://instagram.com/${user}` : '';
}
