import { useEffect, useMemo, useRef, useState } from 'react';
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
import { themeApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { getSampleThemeBundles, SampleThemeBundle } from '../utils/sampleThemes';
import { diffThemeBundle, ThemeDiffResult, ThemeDiffStatus } from '../utils/themeDiff';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';

interface ThemeInjectModalProps {
    /** Currently-loaded themes (carry full html/css/js), used to match & diff by code. */
    existingThemes: Theme[];
    onClose: () => void;
    /**
     * Called with the selected folder names when the admin confirms.
     * `asDraft` = true → simpan hasil inject sebagai DRAFT (belum tampil ke tenant);
     * false → langsung RELEASE (flag_draft = false).
     */
    onConfirm: (folders: string[], asDraft: boolean) => void;
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

    // `existingThemes` berasal dari themeStore yang sengaja dimuat TANPA kolom
    // html/css/js (biar Kelola Tema cepat). Untuk MENCOCOKKAN kode tema itu sudah
    // cukup, tapi untuk DIFF kita butuh isi template asli — jadi ambil versi
    // lengkap dari server dan pakai itu kalau sudah tersedia.
    const [fullThemes, setFullThemes] = useState<Theme[] | null>(null);
    // Naik tiap kali snapshot DB perlu ditarik ULANG (mis. sesudah inject selesai).
    const [sourceEpoch, setSourceEpoch] = useState(0);
    // True selagi snapshot sedang diambil — dipakai menonaktifkan tombol Cek supaya
    // admin tidak membandingkan dengan data yang sedang diganti.
    const [loadingSource, setLoadingSource] = useState(true);

    // Tarik snapshot template dari server. Dijalankan saat modal dibuka DAN tiap kali
    // `sourceEpoch` naik.
    //
    // BUG YANG DIPERBAIKI: dulu efek ini `[]` — snapshot diambil sekali lalu dipakai
    // selamanya. Sesudah inject/simpan dari editor, DB sudah berubah tapi diff masih
    // membandingkan folder dengan snapshot LAMA, sehingga status "Perlu update" (mis.
    // "beda: JS") menempel terus padahal Sheet sudah berisi versi baru. Yang basi
    // adalah pembandingnya, bukan datanya.
    useEffect(() => {
        let active = true;
        setLoadingSource(true);
        (async () => {
            try {
                const res = await themeApi.getThemes({ skipLoader: true } as any);
                if (active && res?.success) setFullThemes(res.data || []);
            } catch { /* diamkan: tombol Cek akan memberi tahu bila belum siap */ }
            finally { if (active) setLoadingSource(false); }
        })();
        return () => { active = false; };
    }, [sourceEpoch]);

    // code (lowercased) -> DB theme, so we can match folders & diff their source.
    const themeByCode = useMemo(() => {
        const map = new Map<string, Theme>();
        for (const t of (fullThemes || existingThemes)) {
            const c = (t.code || '').toString().trim().toLowerCase();
            if (c) map.set(c, t);
        }
        return map;
    }, [existingThemes, fullThemes]);

    const rows: Row[] = useMemo(
        () =>
            bundles.map((b) => {
                const dbTheme = themeByCode.get(b.folder.trim().toLowerCase());
                return { ...b, dbTheme, existsInDb: !!dbTheme };
            }),
        [bundles, themeByCode]
    );

    const [selected, setSelected] = useState<Set<string>>(() => new Set(rows.map((r) => r.folder)));

    // Konfirmasi Draft/Publish ditampilkan sebagai dialog SAAT klik Inject (bukan
    // radio permanen). `pendingFolders` = folder yang menunggu dikonfirmasi; null =
    // dialog tertutup. Dipakai bersama oleh Inject per-baris maupun Inject massal.
    const [pendingFolders, setPendingFolders] = useState<string[] | null>(null);

    // Per-folder check result. Absent => belum dicek (status 'unchecked' shown).
    // A folder that is 'new' (not in DB) is always known without a diff, so we seed it.
    //
    // Dideklarasikan DI ATAS confirmInject/reloadSource yang memakainya: `const` berada
    // di temporal dead zone sampai barisnya dieksekusi, jadi menaruhnya di bawah membuat
    // kedua fungsi itu melempar ReferenceError saat dipanggil.
    const [checked, setChecked] = useState<Record<string, ThemeDiffResult>>(() => {
        const seed: Record<string, ThemeDiffResult> = {};
        for (const r of rows) {
            if (!r.existsInDb) {
                seed[r.folder] = { status: 'new', htmlSame: false, cssSame: false, jsSame: false };
            }
        }
        return seed;
    });

    // Buka dialog konfirmasi untuk sekumpulan folder (abaikan bila kosong).
    const askConfirm = (folders: string[]) => {
        if (folders.length === 0) return;
        setPendingFolders(folders);
    };

    // Pilih Draft/Publish di dialog -> teruskan ke onConfirm lalu tutup dialog.
    // asDraft=true => flag_draft:true (belum tampil ke tenant); false => publish.
    //
    // Hasil "Cek" untuk folder yang baru saja diinject SENGAJA dibuang: begitu inject
    // jalan, badge lamanya ("Perlu update") tidak lagi menggambarkan keadaan DB, dan
    // membiarkannya justru yang membuat dialog terlihat "tidak pernah update".
    // Statusnya kembali ke "Belum dicek" sampai admin menekan Cek lagi terhadap
    // snapshot baru.
    const confirmInject = (asDraft: boolean) => {
        if (!pendingFolders) return;
        const folders = pendingFolders;
        onConfirm(folders, asDraft);
        setPendingFolders(null);
        setChecked((prev) => {
            const next = { ...prev };
            for (const folder of folders) {
                const row = rows.find((r) => r.folder === folder);
                if (row && row.existsInDb) delete next[folder];
            }
            return next;
        });
    };

    // Ambil ulang snapshot DB + kosongkan hasil cek, supaya perbandingan berikutnya
    // memakai isi Sheet yang TERBARU. Dipakai tombol "Muat ulang sumber".
    //
    // Inject berjalan di LATAR BELAKANG (lihat injectSampleThemes) dan tidak memberi
    // tahu dialog saat selesai, jadi tombol ini yang dipakai admin setelah panel tugas
    // menunjukkan inject-nya rampung.
    const reloadSource = () => {
        setChecked((prev) => {
            const next: Record<string, ThemeDiffResult> = {};
            // 'new' itu intrinsik (tema belum ada di DB), bukan hasil diff — pertahankan.
            for (const r of rows) {
                if (!r.existsInDb) next[r.folder] = prev[r.folder] || { status: 'new', htmlSame: false, cssSame: false, jsSame: false };
            }
            return next;
        });
        setSourceEpoch((n) => n + 1);
    };

    // AUTO-REFRESH saat inject latar belakang selesai.
    //
    // injectSampleThemes() menulis progresnya ke backgroundTaskStore dengan id
    // berawalan 'inject-theme-'. Dialog ikut memantau: begitu jumlah task inject yang
    // SUDAH selesai bertambah, snapshot ditarik ulang sendiri — jadi admin tidak perlu
    // ingat menekan "Muat ulang sumber", dan status tidak pernah lagi menampilkan hasil
    // diff terhadap DB sebelum inject.
    const finishedInjects = useBackgroundTaskStore((s) =>
        s.tasks.filter((t) => t.id.startsWith('inject-theme-') && t.status !== 'running').length
    );
    const seenFinished = useRef(finishedInjects);
    useEffect(() => {
        if (finishedInjects === seenFinished.current) return;
        seenFinished.current = finishedInjects;
        reloadSource();
        // reloadSource sengaja tidak masuk deps: ia dibuat ulang tiap render, dan
        // memasukkannya akan menjadikan efek ini berjalan terus-menerus.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finishedInjects]);

    const statusOf = (r: Row): ThemeDiffResult =>
        checked[r.folder] || { status: 'unchecked', htmlSame: false, cssSame: false, jsSame: false };

    // Run the diff for one folder and store the result (instant — DB source is in memory).
    // Selama template lengkap belum tiba, diff akan membandingkan dengan string kosong
    // dan SELALU bilang "different" — jadi tahan dulu daripada memberi hasil palsu.
    const checkOne = (folder: string) => {
        if (!fullThemes) { toast('Memuat sumber tema dari server, coba lagi sebentar…'); return; }
        setChecked((prev) => {
            const row = rows.find((r) => r.folder === folder);
            if (!row) return prev;
            return { ...prev, [folder]: diffThemeBundle(row, row.dbTheme) };
        });
    };

    const checkMany = (folders: string[]) => {
        if (!fullThemes) { toast('Memuat sumber tema dari server, coba lagi sebentar…'); return; }
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
                        onClick={reloadSource}
                        disabled={loadingSource}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-40 flex items-center gap-1.5"
                        title="Ambil ulang source tema dari server. Tekan ini setelah inject selesai supaya perbandingan memakai data terbaru."
                    >
                        <HiOutlineRefresh className={`w-3.5 h-3.5 ${loadingSource ? 'animate-spin' : ''}`} />
                        {loadingSource ? 'Memuat…' : 'Muat ulang sumber'}
                    </button>
                    <button
                        onClick={() => checkMany(selectedFolders)}
                        disabled={selectedFolders.length === 0 || loadingSource}
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
                                            disabled={loadingSource}
                                            className="shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-40 flex items-center gap-1"
                                            title="Bandingkan source DB vs folder"
                                        >
                                            <HiOutlineRefresh className="w-3.5 h-3.5" /> Cek
                                        </button>
                                    )}
                                    <button
                                        onClick={() => askConfirm([r.folder])}
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
                            onClick={() => askConfirm(selectedFolders)}
                            disabled={selected.size === 0}
                            className="px-5 py-2 text-xs font-medium rounded-xl text-white bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            <i className="ri-flashlight-fill"></i>
                            Inject {selected.size > 0 ? `(${selected.size})` : ''}
                        </button>
                    </div>
                </div>
            </div>

            {/* Dialog konfirmasi Draft/Publish — muncul saat klik Inject (per-baris/massal).
                3 aksi: Batal (tutup dialog), Draft (flag_draft:true), Publish (langsung tampil). */}
            {pendingFolders && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setPendingFolders(null)}
                    />
                    <div className="relative z-10 w-full max-w-sm bg-white dark:bg-wedding-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <div className="px-6 pt-6 pb-4">
                            <h4 className="text-base font-semibold text-gray-800 dark:text-white">
                                Inject {pendingFolders.length} tema?
                            </h4>
                            <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                Pilih cara menyimpan hasil inject:
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                <li>
                                    <span className="font-semibold">Draft</span>
                                    <span className="text-gray-400 dark:text-gray-500"> — belum tampil ke tenant</span>
                                </li>
                                <li>
                                    <span className="font-semibold">Publish</span>
                                    <span className="text-gray-400 dark:text-gray-500"> — langsung tampil ke tenant</span>
                                </li>
                            </ul>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                            <button
                                onClick={() => setPendingFolders(null)}
                                className="px-4 py-2 text-xs font-medium rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => confirmInject(true)}
                                className="px-4 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition"
                            >
                                Draft
                            </button>
                            <button
                                onClick={() => confirmInject(false)}
                                className="px-4 py-2 text-xs font-medium rounded-xl text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-md transition"
                            >
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
