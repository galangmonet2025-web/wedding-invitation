// Non-blocking "Inject Premium Theme" engine.
//
// For each selected folder under src/sample-theme/<folder>/ it:
//   1. Looks for an existing theme whose `code` === folder name.
//        - FOUND  -> EDIT: overwrite only html/css/js (chunked). Metadata untouched.
//        - ABSENT -> INSERT: create a lightweight DRAFT premium row (code+name = folder),
//                    then stream html/css/js into it (chunked).
//   2. Streams the (possibly huge) templates via chunkedSaveTheme so every request
//      stays under the Apps Script POST size limit — this IS the existing split
//      mechanism (html/css/js -> *_template + *_extra_1..10, packed into batches).
//
// The whole run is ONE backgroundTask (like the Google Contacts import / bulk gallery
// upload queue), so the UI never block-screens: progress + per-folder phase show in the
// header BackgroundTaskIndicator. Folders are processed sequentially; a failure on one
// folder is recorded and the queue moves on to the next.

import { themeApi, chunkedSaveTheme } from '@/core/api/endpoints';
import { Theme } from '@/types';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';
import { getSampleThemeBundles, SampleThemeBundle } from './sampleThemes';
import { convertHtmlToHandlebars, cleanThemeJs } from './themeTransform';

export interface InjectResult {
    successCount: number;
    failCount: number;
    inserted: string[];
    edited: string[];
    failed: { folder: string; error: string }[];
}

// Mirror of chunkedSaveTheme's batching so we can size the progress bar accurately
// BEFORE sending anything. Must stay in sync with PER_REQUEST_BUDGET in endpoints.ts.
const PER_REQUEST_BUDGET = 120000;

function estimateChunkCount(html: string, css: string, js: string): number {
    // Every non-empty template contributes 11 columns (main + extra_1..10), but only
    // the columns that actually hold characters occupy budget. We approximate the batch
    // count the same way chunkedSaveTheme packs columns: sum sizes / budget, min 1.
    const sizes: number[] = [];
    const pushCols = (s: string) => {
        // main col (0..50k) then extra_1..10; empty tail cols are size 0 but still sent.
        for (let i = 0; i <= 10; i++) {
            sizes.push(s.substring(i * 50000, (i + 1) * 50000).length);
        }
    };
    pushCols(html);
    pushCols(css);
    pushCols(js);

    let batches = 0;
    let currentSize = 0;
    let currentCount = 0;
    for (const size of sizes) {
        if (currentCount > 0 && currentSize + size > PER_REQUEST_BUDGET) {
            batches++;
            currentSize = 0;
            currentCount = 0;
        }
        currentCount++;
        currentSize += size;
    }
    if (currentCount > 0) batches++;
    return Math.max(1, batches);
}

// Transform a folder's raw authoring source into stored templates, identical to the
// theme editor's paste-raw flow (data-var -> {{}}, strip <script> from JS, CSS verbatim).
function toTemplates(bundle: SampleThemeBundle): { html: string; css: string; js: string } {
    return {
        html: convertHtmlToHandlebars(bundle.html),
        css: bundle.css || '',
        js: cleanThemeJs(bundle.js),
    };
}

/**
 * Inject/edit the given folders as a single non-blocking background task.
 *
 * @param folders  folder names to process (must exist under src/sample-theme/)
 * @param existingThemes  currently-loaded themes (to match by `code`); the injector
 *                        re-checks by code so ordering is deterministic.
 * @param onDone  called after the whole run finishes (e.g. to refresh the theme list)
 */
export async function injectSampleThemes(
    folders: string[],
    existingThemes: Theme[],
    onDone?: (result: InjectResult) => void
): Promise<InjectResult> {
    const { addTask, updateTask } = (useBackgroundTaskStore as any).getState();

    const allBundles = getSampleThemeBundles();
    const bundleByFolder = new Map(allBundles.map((b) => [b.folder, b]));

    // Resolve selected folders to bundles + prepared templates + per-folder work weight.
    const jobs = folders
        .map((folder) => bundleByFolder.get(folder))
        .filter((b): b is SampleThemeBundle => !!b)
        .map((bundle) => {
            const templates = toTemplates(bundle);
            // +1 unit for the create request when inserting (resolved per-folder below).
            const chunkUnits = estimateChunkCount(templates.html, templates.css, templates.js);
            return { bundle, templates, chunkUnits };
        });

    // Match existing themes by code (case-insensitive, trimmed) — same rule the backend
    // uses in isThemeCodeTaken, so our edit-vs-insert decision agrees with the server.
    const byCode = new Map<string, Theme>();
    for (const t of existingThemes) {
        const c = (t.code || '').toString().trim().toLowerCase();
        if (c) byCode.set(c, t);
    }

    // Total progress units: create(1 if insert) + chunk batches, summed over all folders.
    const totalUnits = jobs.reduce((sum, j) => {
        const isInsert = !byCode.has(j.bundle.folder.trim().toLowerCase());
        return sum + j.chunkUnits + (isInsert ? 1 : 0);
    }, 0);

    const taskId = `inject-theme-${folders.join(',').length}-${folders.length}-${totalUnits}`;
    addTask({
        id: taskId,
        name: `Inject ${jobs.length} Tema Premium`,
        total: totalUnits,
    });

    const result: InjectResult = {
        successCount: 0,
        failCount: 0,
        inserted: [],
        edited: [],
        failed: [],
    };

    let doneUnits = 0;
    const bump = (folder: string, phase: string) => {
        const progress = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 0;
        updateTask(taskId, {
            successCount: result.successCount,
            failCount: result.failCount,
            progress,
            status: 'running',
            details: `${folder}: ${phase}`,
        });
    };

    for (const job of jobs) {
        const folder = job.bundle.folder;
        const existing = byCode.get(folder.trim().toLowerCase());
        // This folder's total progress budget (create unit + chunk units when inserting).
        const jobBudget = job.chunkUnits + (existing ? 0 : 1);
        let jobDone = 0; // units already counted for THIS folder, so failure can top up exactly.
        try {
            let themeId: string;

            if (existing) {
                // EDIT: overwrite only templates; leave name/plan/preview/draft as-is.
                themeId = existing.id;
                bump(folder, 'menyiapkan edit');
            } else {
                // INSERT: create a lightweight DRAFT premium row first (empty templates),
                // then chunked-fill it. code + name = folder name.
                bump(folder, 'membuat tema baru');
                const createRes = await themeApi.createTheme(
                    {
                        name: folder,
                        code: folder,
                        plan_type: 'premium',
                        flag_draft: true,
                    } as any,
                    { skipLoader: true } as any
                );
                if (!createRes.success || !createRes.data?.id) {
                    throw new Error(createRes.message || 'Gagal membuat tema baru');
                }
                themeId = createRes.data.id;
                doneUnits += 1; // create step done
                jobDone += 1;
                bump(folder, 'tema dibuat, mengirim kode');
            }

            // Stream html/css/js in chunks. onProgress fires per batch -> advance the bar.
            await chunkedSaveTheme(
                themeId,
                {}, // no metadata change on inject (name/plan already set on create)
                { html: job.templates.html, css: job.templates.css, js: job.templates.js },
                (chunkDone, chunkTotal) => {
                    // Convert this folder's chunk progress into global units, one unit per
                    // completed chunk, capped at the folder's estimated chunkUnits so an
                    // estimate-vs-actual mismatch can never overshoot the total.
                    const advance = Math.min(job.chunkUnits, chunkDone) -
                        Math.min(job.chunkUnits, chunkDone - 1);
                    doneUnits += advance;
                    jobDone += advance;
                    bump(folder, `mengirim potongan ${chunkDone}/${chunkTotal}`);
                },
                { skipLoader: true } // background queue: never trigger the global loader
            );

            result.successCount += 1;
            if (existing) result.edited.push(folder);
            else result.inserted.push(folder);
        } catch (err: any) {
            result.failCount += 1;
            result.failed.push({ folder, error: err?.message || String(err) });
            // Top up exactly this folder's remaining budget so the bar still reaches 100%
            // without double-counting units already added above.
            doneUnits += Math.max(0, jobBudget - jobDone);
        }
    }

    const finalProgress = 100;
    const summaryParts: string[] = [];
    if (result.inserted.length) summaryParts.push(`${result.inserted.length} baru`);
    if (result.edited.length) summaryParts.push(`${result.edited.length} diperbarui`);
    if (result.failCount) summaryParts.push(`${result.failCount} gagal`);
    updateTask(taskId, {
        successCount: result.successCount,
        failCount: result.failCount,
        progress: finalProgress,
        status: result.failCount === 0 ? 'success' : 'error',
        details: `Selesai: ${summaryParts.join(', ') || 'tidak ada perubahan'}`,
        failedFiles: result.failed.map((f) => `${f.folder}: ${f.error}`),
    });

    if (onDone) onDone(result);
    return result;
}
