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
function norm(s: string | undefined): string {
    return (s || '').replace(/\r\n/g, '\n');
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
