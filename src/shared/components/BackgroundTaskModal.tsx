import { Fragment, useState } from 'react';
import { Modal } from './Modal';
import { useBackgroundTaskStore, BackgroundTask, BackgroundTaskStep } from '../store/backgroundTaskStore';
import {
    HiOutlineTrash,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlineClock,
    HiOutlineChevronRight,
} from 'react-icons/hi';

interface BackgroundTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Ikon status untuk satu LANGKAH (item/API) di dalam task.
function StepIcon({ status }: { status: BackgroundTaskStep['status'] }) {
    switch (status) {
        case 'running':
            return <div className="w-3 h-3 shrink-0 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />;
        case 'success':
            return <HiOutlineCheck className="w-3.5 h-3.5 shrink-0 text-green-500" />;
        case 'error':
            return <HiOutlineX className="w-3.5 h-3.5 shrink-0 text-red-500" />;
        case 'pending':
        default:
            return <span className="w-2 h-2 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />;
    }
}

export function BackgroundTaskModal({ isOpen, onClose }: BackgroundTaskModalProps) {
    const { tasks, removeTask, clearCompleted } = useBackgroundTaskStore();
    // Baris yang sedang dibuka. Default tertutup: tabel tetap jadi REKAP,
    // detail per item/API baru muncul kalau di-expand.
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

    const toggleExpanded = (id: string) =>
        setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const getStatusIcon = (status: BackgroundTask['status']) => {
        switch (status) {
            case 'running': return <div className="w-3.5 h-3.5 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />;
            case 'success': return <HiOutlineCheck className="w-4 h-4 text-green-500" />;
            case 'error': return <HiOutlineX className="w-4 h-4 text-red-500" />;
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Proses Latar Belakang"
            size="lg"
            footer={
                <div className="flex justify-between items-center w-full">
                    <p className="text-xs text-gray-500">
                        {tasks.length} total proses tersimpan
                    </p>
                    <button
                        onClick={clearCompleted}
                        className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1.5 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                        <HiOutlineTrash className="w-4 h-4" />
                        Bersihkan Selesai
                    </button>
                </div>
            }
        >
            <div className="py-1">
                {tasks.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                            <HiOutlineClock className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Belum ada proses yang berjalan.</p>
                    </div>
                ) : (
                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-xs table-fixed">
                            <colgroup>
                                {/* Kolom chevron sempit — indentasi baris detail berasal dari sini. */}
                                <col className="w-7" />
                                <col />
                                <col className="w-[38%]" />
                                <col className="w-8" />
                            </colgroup>
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="py-2" />
                                    <th className="pr-3 py-2 font-bold text-[10px] text-gray-500 uppercase tracking-wider">Nama Tugas</th>
                                    <th className="px-3 py-2 font-bold text-[10px] text-gray-500 uppercase tracking-wider">Status & Progress</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => {
                                    const steps = task.steps || [];
                                    const isExpanded = expandedIds.includes(task.id);
                                    const errorSteps = steps.filter((s) => s.status === 'error').length;
                                    // Fallback untuk task lama/produser yang belum melapor per-langkah.
                                    const legacyFailed = !steps.length && task.failedFiles?.length ? task.failedFiles : [];

                                    return (
                                        // Fragment ber-key: satu task = beberapa <tr> (induk + anak),
                                        // dan <tbody> tidak boleh disisipi wrapper selain <tr>.
                                        <Fragment key={task.id}>
                                            {/* ---- BARIS INDUK (rekap) ---- */}
                                            <tr
                                                onClick={() => steps.length && toggleExpanded(task.id)}
                                                className={`border-t border-gray-50 dark:border-gray-800 transition-colors ${steps.length ? 'cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/30' : ''}`}
                                            >
                                                <td className="pl-1.5 pr-0 py-2 align-middle">
                                                    {steps.length > 0 && (
                                                        <HiOutlineChevronRight
                                                            className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                                        />
                                                    )}
                                                </td>
                                                <td className="pr-3 py-2 align-middle">
                                                    <div className="font-semibold text-gray-800 dark:text-white truncate" title={task.name}>
                                                        {task.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                                        <span>{formatTime(task.timestamp)}</span>
                                                        <span className="text-green-600 dark:text-green-500 font-medium">{task.successCount} ok</span>
                                                        <span className={task.failCount ? 'text-red-500 font-medium' : ''}>{task.failCount} gagal</span>
                                                        {steps.length > 0 && (
                                                            <span className="text-gray-400">
                                                                · {steps.length} item{errorSteps ? ` (${errorSteps} error)` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(task.status)}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1 mb-1 overflow-hidden">
                                                                <div
                                                                    className={`h-full transition-all duration-500 ${task.status === 'error' ? 'bg-red-500' : 'bg-gold-500'}`}
                                                                    style={{ width: `${task.progress}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-[10px] text-gray-500 font-medium truncate">
                                                                {task.status === 'running' ? `Memproses... ${task.progress}%` : task.status.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2 align-middle">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                                                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                                        title="Hapus riwayat"
                                                    >
                                                        <HiOutlineTrash className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* ---- BARIS DETAIL (anak, menjorok ke kanan) ---- */}
                                            {isExpanded && steps.map((step) => (
                                                <tr
                                                    key={`${task.id}-${step.id}`}
                                                    className={step.status === 'error' ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-gray-50/40 dark:bg-gray-800/20'}
                                                >
                                                    {/* Sel kosong di kolom chevron = indentasi anak. */}
                                                    <td />
                                                    <td className="pr-3 py-1.5 align-middle">
                                                        {/* Garis vertikal + ikon: menegaskan hubungan induk-anak. */}
                                                        <div className="flex items-center gap-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                                            <StepIcon status={step.status} />
                                                            <span
                                                                className={`truncate ${step.status === 'error'
                                                                    ? 'text-red-600 dark:text-red-400 font-medium'
                                                                    : step.status === 'pending'
                                                                        ? 'text-gray-400'
                                                                        : 'text-gray-700 dark:text-gray-300'
                                                                    }`}
                                                                title={step.label}
                                                            >
                                                                {step.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 align-middle" colSpan={2}>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            {step.api && (
                                                                <code className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono">
                                                                    {step.api}
                                                                </code>
                                                            )}
                                                            {/* Saat gagal: pesan error. Saat jalan: fase terkini. */}
                                                            {step.status === 'error' && step.error ? (
                                                                <span className="text-[10px] text-red-500 dark:text-red-400 truncate" title={step.error}>
                                                                    {step.error}
                                                                </span>
                                                            ) : step.phase ? (
                                                                <span className="text-[10px] text-gray-400 italic truncate" title={step.phase}>
                                                                    {step.phase}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}

                                            {/* Produser lama: hanya punya failedFiles, tampil sebagai anak juga. */}
                                            {legacyFailed.map((f, idx) => (
                                                <tr key={`${task.id}-legacy-${idx}`} className="bg-red-50/50 dark:bg-red-900/10">
                                                    <td />
                                                    <td className="pr-3 py-1.5 align-middle" colSpan={3}>
                                                        <div className="flex items-center gap-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                                                            <HiOutlineX className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                                            <span className="text-[10px] text-red-500 truncate" title={f}>{f}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Modal>
    );
}
