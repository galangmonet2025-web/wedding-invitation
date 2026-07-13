import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
    HiOutlineQuestionMarkCircle,
    HiOutlinePlusCircle,
} from 'react-icons/hi';
import { Theme } from '@/types';
import { getSampleThemeBundles, SampleThemeBundle } from '../utils/sampleThemes';
import { diffThemeBundle, ThemeDiffResult, ThemeDiffStatus } from '../utils/themeDiff';

interface ThemeInjectModalProps {
    /** Currently-loaded themes (carry full html/css/js), used to match & diff by code. */
    existingThemes: Theme[];
    onClose: () => void;
    /** Called with the selected folder names when the admin confirms. */
    onConfirm: (folders: string[]) => void;
}

function formatChars(n: number): string {
    if (n >= 1000) return `${Math.round(n / 1000)}K`;
    return String(n);
}

// Visual config per status. 'new' = theme belum ada di DB; the rest describe how the
// folder source compares to what's stored.
const STATUS_META: Record<
    ThemeDiffStatus,
    { label: string; className: string; Icon: typeof HiOutlineCheckCircle }
> = {
    new: {
        label: 'Baru',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        Icon: HiOutlinePlusCircle,
    },
    identical: {
        label: 'Identik',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        Icon: HiOutlineCheckCircle,
    },
    different: {
        label: 'Perlu update',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        Icon: HiOutlineExclamationCircle,
    },
    unchecked: {
        label: 'Belum dicek',
        className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
        Icon: HiOutlineQuestionMarkCircle,
    },
};

interface Row extends SampleThemeBundle {
    /** DB theme matched by code, or undefined if none. */
    dbTheme: Theme | undefined;
    /** True if a theme with this code already exists (folder will EDIT vs INSERT). */
    existsInDb: boolean;
}

export function ThemeInjectModal({ existingThemes, onClose, onConfirm }: ThemeInjectModalProps) {
    const bundles = useMemo(() => getSampleThemeBundles(), []);

    // code (lowercased) -> DB theme, so we can match folders & diff their source.
    const themeByCode = useMemo(() => {
        const map = new Map<string, Theme>();
        for (const t of existingThemes) {
            const c = (t.code || '').toString().trim().toLowerCase();
            if (c) map.set(c, t);
        }
        return map;
    }, [existingThemes]);

    const rows: Row[] = useMemo(
        () =>
            bundles.map((b) => {
                const dbTheme = themeByCode.get(b.folder.trim().toLowerCase());
                return { ...b, dbTheme, existsInDb: !!dbTheme };
            }),
        [bundles, themeByCode]
    );

    const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.map((r) => r.folder)));

    // Per-folder check result. Absent => belum dicek (status 'unchecked' shown).
    // A folder that is 'new' (not in DB) is always known without a diff, so we seed it.
    const [checked, setChecked] = useState<Record<string, ThemeDiffResult>>(() => {
        const seed: Record<string, ThemeDiffResult> = {};
        for (const r of rows) {
            if (!r.existsInDb) {
                seed[r.folder] = { status: 'new', htmlSame: false, cssSame: false, jsSame: false };
            }
        }
        return seed;
    });

    const statusOf = (r: Row): ThemeDiffResult =>
        checked[r.folder] || { status: 'unchecked', htmlSame: false, cssSame: false, jsSame: false };

    // Run the diff for one folder and store the result (instant — DB source is in memory).
    const checkOne = (folder: string) => {
        setChecked((prev) => {
            const row = rows.find((r) => r.folder === folder);
            if (!row) return prev;
            return { ...prev, [folder]: diffThemeBundle(row, row.dbTheme) };
        });
    };

    const checkMany = (folders: string[]) => {
        setChecked((prev) => {
            const next = { ...prev };
            for (const folder of folders) {
                const row = rows.find((r) => r.folder === folder);
                if (row) next[folder] = diffThemeBundle(row, row.dbTheme);
            }
            return next;
        });
    };

    // Reset checks back to "belum dicek" (except 'new', which is intrinsic).
    const resetChecks = (folders: string[]) => {
        setChecked((prev) => {
            const next = { ...prev };
            for (const folder of folders) {
                const row = rows.find((r) => r.folder === folder);
                if (row && row.existsInDb) delete next[folder]; // 'new' stays known
            }
            return next;
        });
    };

    const toggle = (folder: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(folder)) next.delete(folder);
            else next.add(folder);
            return next;
        });
    };

    const allSelected = selected.size === rows.length && rows.length > 0;
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.folder)));

    const selectedFolders = Array.from(selected);
    const selectedRows = rows.filter((r) => selected.has(r.folder));

    // Helper: select only folders that would actually change something (new or different).
    const selectChangedOnly = () => {
        const next = new Set<string>();
        for (const r of rows) {
            const st = statusOf(r).status;
            if (st === 'new' || st === 'different') next.add(r.folder);
        }
        setSelected(next);
    };

    // Footer summary counts across the SELECTED rows.
    const summary = useMemo(() => {
        let baru = 0,
            update = 0,
            identik = 0,
            belum = 0;
        for (const r of selectedRows) {
            switch (statusOf(r).status) {
                case 'new':
                    baru++;
                    break;
                case 'different':
                    update++;
                    break;
                case 'identical':
                    identik++;
                    break;
                default:
                    belum++;
            }
        }
        return { baru, update, identik, belum };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRows, checked]);

    // Overall counts across ALL folders (for the header stat strip).
    const overall = useMemo(() => {
        let baru = 0,
            update = 0,
            identik = 0,
            belum = 0;
        for (const r of rows) {
            switch (statusOf(r).status) {
                case 'new':
                    baru++;
                    break;
                case 'different':
                    update++;
                    break;
                case 'identical':
                    identik++;
                    break;
                default:
                    belum++;
            }
        }
        return { baru, update, identik, belum, total: rows.length };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, checked]);

    const statCards: { key: string; label: string; value: number; className: string }[] = [
        { key: 'baru', label: 'Baru', value: overall.baru, className: 'text-blue-600 dark:text-blue-400' },
        { key: 'update', label: 'Perlu update', value: overall.update, className: 'text-orange-600 dark:text-orange-400' },
        { key: 'identik', label: 'Identik', value: overall.identik, className: 'text-green-600 dark:text-green-400' },
        { key: 'belum', label: 'Belum dicek', value: overall.belum, className: 'text-gray-500 dark:text-gray-400' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-wedding-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-md">
                                <i className="ri-flashlight-fill text-lg"></i>
                            </span>
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-white text-base">
                                    Inject Premium Theme
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Bandingkan source di DB dengan folder <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px]">src/sample-theme</code>, lalu inject yang perlu.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            aria-label="Tutup"
                        >
                            <HiOutlineX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stat strip (overall, across all folders) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                        {statCards.map((s) => (
                            <div
                                key={s.key}
                                className="rounded-xl bg-white/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 px-3 py-2"
                            >
                                <div className={`text-lg font-bold leading-none ${s.className}`}>{s.value}</div>
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar: select-all + batch actions */}
                <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                    <label className="flex items-center gap-2 cursor-pointer select-none mr-auto">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Pilih semua ({rows.length})
                        </span>
                    </label>

                    <button
                        onClick={() => checkMany(selectedFolders)}
                        disabled={selectedFolders.length === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-40 flex items-center gap-1.5"
                        title="Bandingkan source DB vs folder untuk item terpilih"
                    >
                        <HiOutlineRefresh className="w-3.5 h-3.5" /> Cek terpilih
                    </button>
                    <button
                        onClick={() => resetChecks(selectedFolders)}
                        disabled={selectedFolders.length === 0}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-40"
                        title="Kembalikan status ke belum dicek"
                    >
                        Reset cek
                    </button>
                    <button
                        onClick={selectChangedOnly}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                        title="Pilih hanya yang Baru / Perlu update"
                    >
                        Pilih yang perlu
                    </button>
                </div>

                {/* Column header */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_140px_168px] items-center gap-3 px-6 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <span className="w-4" />
                    <span>Tema / Folder</span>
                    <span>Status</span>
                    <span className="text-right">Aksi</span>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                    {rows.length === 0 && (
                        <p className="text-center text-xs text-gray-500 py-8">
                            Tidak ada folder tema di src/sample-theme/.
                        </p>
                    )}
                    {rows.map((r) => {
                        const isChecked = selected.has(r.folder);
                        const diff = statusOf(r);
                        const meta = STATUS_META[diff.status];
                        const StatusIcon = meta.Icon;
                        // Which files differ (only shown for 'different').
                        const diffParts: string[] = [];
                        if (diff.status === 'different') {
                            if (!diff.htmlSame) diffParts.push('HTML');
                            if (!diff.cssSame) diffParts.push('CSS');
                            if (!diff.jsSame) diffParts.push('JS');
                        }
                        return (
                            <div
                                key={r.folder}
                                className={`grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_140px_168px] items-center gap-3 px-3 py-2.5 rounded-xl transition border ${
                                    isChecked
                                        ? 'bg-yellow-50/70 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/40'
                                        : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggle(r.folder)}
                                    className="w-4 h-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                                />

                                {/* Folder + size */}
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                        {r.folder}
                                    </div>
                                    <div className="text-[11px] text-gray-400">
                                        {formatChars(r.totalChars)} karakter · {r.existsInDb ? 'ada di DB' : 'belum di DB'}
                                    </div>
                                </div>

                                {/* Status (inline on mobile, own column on sm+) */}
                                <div className="flex flex-col items-end sm:items-start gap-0.5">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${meta.className}`}
                                    >
                                        <StatusIcon className="w-3 h-3" /> {meta.label}
                                    </span>
                                    {diffParts.length > 0 && (
                                        <span className="text-[10px] text-orange-500 dark:text-orange-400">
                                            beda: {diffParts.join(', ')}
                                        </span>
                                    )}
                                </div>

                                {/* Per-item actions (own column on sm+): Cek (compare, only
                                    when it exists in DB) + Inject (this one folder only). */}
                                <div className="hidden sm:flex justify-end items-center gap-1.5">
                                    {r.existsInDb && (
                                        <button
                                            onClick={() => checkOne(r.folder)}
                                            className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition flex items-center gap-1"
                                            title="Bandingkan source DB vs folder"
                                        >
                                            <HiOutlineRefresh className="w-3.5 h-3.5" /> Cek
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onConfirm([r.folder])}
                                        className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg text-white bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-sm transition flex items-center gap-1"
                                        title={r.existsInDb ? 'Update tema ini sekarang' : 'Inject tema ini sekarang'}
                                    >
                                        <i className="ri-flashlight-fill text-[11px]"></i> Inject
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{selected.size} dipilih</span>
                        {summary.baru > 0 && <span className="text-blue-600 dark:text-blue-400">· {summary.baru} baru</span>}
                        {summary.update > 0 && (
                            <span className="text-orange-600 dark:text-orange-400">· {summary.update} perlu update</span>
                        )}
                        {summary.identik > 0 && (
                            <span className="text-green-600 dark:text-green-400">· {summary.identik} identik</span>
                        )}
                        {summary.belum > 0 && <span>· {summary.belum} belum dicek</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => onConfirm(selectedFolders)}
                            disabled={selected.size === 0}
                            className="px-5 py-2 text-xs font-medium rounded-xl text-white bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            <i className="ri-flashlight-fill"></i>
                            Inject {selected.size > 0 ? `(${selected.size})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
