// Reads the self-contained theme bundles that live under src/sample-theme/<folder>/
// (index.html + index.css + index.js) at BUILD time via Vite's import.meta.glob, and
// exposes them keyed by folder name. The folder name is used as the theme `code`
// (the backend de-dups themes on `code`), so "inject" can decide edit-vs-insert.
//
// NOTE: only index.{html,css,js} are read. Any *_BIBLE.md / asset files in a theme
// folder are intentionally ignored — they are design docs, not runtime templates.

// Vite 5 glob API: eager raw-string import of every matching file.
const htmlModules = import.meta.glob('/src/sample-theme/*/index.html', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

const cssModules = import.meta.glob('/src/sample-theme/*/index.css', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

const jsModules = import.meta.glob('/src/sample-theme/*/index.js', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

export interface SampleThemeBundle {
    /** Folder name, e.g. "netflix" — used as the theme `code`. */
    folder: string;
    html: string;
    css: string;
    js: string;
    /** Total char count of html+css+js — shown in the picker so admins can gauge size. */
    totalChars: number;
}

// Extract the folder name from a matched path like "/src/sample-theme/netflix/index.html".
function folderOf(path: string): string {
    const m = path.match(/\/sample-theme\/([^/]+)\//);
    return m ? m[1] : '';
}

// Build a { folder -> raw string } map from one of the glob results.
function byFolder(modules: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const path in modules) {
        const folder = folderOf(path);
        if (folder) out[folder] = modules[path] || '';
    }
    return out;
}

/**
 * All theme folders under src/sample-theme/, sorted by folder name. Each bundle
 * always carries html/css/js (empty string if that file is missing in the folder).
 */
export function getSampleThemeBundles(): SampleThemeBundle[] {
    const htmlByFolder = byFolder(htmlModules);
    const cssByFolder = byFolder(cssModules);
    const jsByFolder = byFolder(jsModules);

    // A folder counts if it has ANY of the three files (normally all three).
    const folders = new Set<string>([
        ...Object.keys(htmlByFolder),
        ...Object.keys(cssByFolder),
        ...Object.keys(jsByFolder),
    ]);

    return Array.from(folders)
        .sort((a, b) => a.localeCompare(b))
        .map((folder) => {
            const html = htmlByFolder[folder] || '';
            const css = cssByFolder[folder] || '';
            const js = jsByFolder[folder] || '';
            return { folder, html, css, js, totalChars: html.length + css.length + js.length };
        });
}
