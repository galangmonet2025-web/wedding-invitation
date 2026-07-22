// Compares a src/sample-theme/<folder> bundle against the theme currently stored in
// the DB, so the inject dialog can tell the admin whether a folder is already up to
// date, needs re-injecting, or doesn't exist in the DB yet.
//
// The comparison is APPLE-TO-APPLE: the folder's raw authoring source is first run
// through the SAME transforms the injector applies before saving (HTML data-var -> {{}},
// strip <script> from JS, CSS verbatim), then compared to the DB's reassembled templates.

import { Theme } from '@/types';
import { SampleThemeBundle } from './sampleThemes';
import { convertHtmlToHandlebars, cleanThemeJs } from './themeTransform';

// UI status of one folder relative to the DB.
export type ThemeDiffStatus =
    | 'unchecked' // not compared yet (default)
    | 'identical' // DB source === folder source (transformed)
    | 'different' // exists in DB but source differs -> re-inject would update it
    | 'new'; // no theme with this code in the DB yet

export interface ThemeDiffResult {
    status: ThemeDiffStatus;
    // Per-file equality (only meaningful when the theme exists in the DB).
    htmlSame: boolean;
    cssSame: boolean;
    jsSame: boolean;
}

// Normalize line endings so a pure CRLF/LF difference (e.g. from git checkout on
// Windows) is NOT reported as a real source change.
//
// Also neutralizes the newline guards that splitTemplateColumns() inserts when a
// 50K chunk would otherwise start with '=', '+', '-' or '@' (Google Sheets would
// store such a cell as "#ERROR!"). Those guards live INSIDE the stored template —
// the backend reassembles chunks by plain concatenation and never strips them — so
// a freshly-injected theme legitimately differs from its folder source by exactly
// those characters. Without this, the affected folders (lake-como, netflix,
// retromario, …) would report "Perlu update" forever no matter how often they are
// injected, which is the very bug the guard was added to fix.
//
// A guard sits at the very START of a chunk, so trimming leading/trailing
// whitespace is what actually neutralizes it (collapsing runs alone would miss the
// one at index 0). Runs are collapsed too, for a guard landing at an interior chunk
// boundary. Both are safe for a SOURCE-EQUALITY check: leading/trailing blank space
// and blank-line count carry no meaning in HTML, CSS or JS, so two templates
// differing only in those are the same source. Neither can hide a real edit — any
// non-whitespace change still shows up.
function norm(s: string | undefined): string {
    return (s || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n+/g, '\n')
        .trim();
}

/**
 * Compute the diff status of a folder bundle vs the DB theme matched by code.
 * @param bundle  the folder's raw files
 * @param dbTheme the theme whose `code` === folder name, or undefined if none exists
 */
export function diffThemeBundle(bundle: SampleThemeBundle, dbTheme: Theme | undefined): ThemeDiffResult {
    if (!dbTheme) {
        return { status: 'new', htmlSame: false, cssSame: false, jsSame: false };
    }

    // Transform folder source exactly as the injector would before saving.
    const folderHtml = norm(convertHtmlToHandlebars(bundle.html));
    const folderCss = norm(bundle.css);
    const folderJs = norm(cleanThemeJs(bundle.js));

    const dbHtml = norm(dbTheme.html_template);
    const dbCss = norm(dbTheme.css_template);
    const dbJs = norm(dbTheme.js_template);

    const htmlSame = folderHtml === dbHtml;
    const cssSame = folderCss === dbCss;
    const jsSame = folderJs === dbJs;

    const allSame = htmlSame && cssSame && jsSame;
    return {
        status: allSame ? 'identical' : 'different',
        htmlSame,
        cssSame,
        jsSame,
    };
}
