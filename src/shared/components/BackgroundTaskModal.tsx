import { Modal } from './Modal';
import { useBackgroundTaskStore, BackgroundTask } from '../store/backgroundTaskStore';
import { HiOutlineTrash, HiOutlineCheck, HiOutlineX, HiOutlineClock } from 'react-icons/hi';

interface BackgroundTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BackgroundTaskModal({ isOpen, onClose }: BackgroundTaskModalProps) {
    const { tasks, removeTask, clearCompleted } = useBackgroundTaskStore();

    const getStatusIcon = (status: BackgroundTask['status']) => {
        switch (status) {
            case 'running': return <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />;
            case 'success': return <HiOutlineCheck className="w-5 h-5 text-green-500" />;
            case 'error': return <HiOutlineX className="w-5 h-5 text-red-500" />;
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
            <div className="space-y-4 py-2">
                {tasks.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                            <HiOutlineClock className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Belum ada proses yang berjalan.</p>
                    </div>
                ) : (
                    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider">Nama Tugas</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider">Status & Progress</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider">Ringkasan</th>
                                    <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {tasks.map((task) => (
                                    <tr key={task.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-gray-800 dark:text-white">{task.name}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">{formatTime(task.timestamp)}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                {getStatusIcon(task.status)}
                                                <div className="flex-1 min-w-[100px]">
                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${task.status === 'error' ? 'bg-red-500' : 'bg-gold-500'}`}
                                                            style={{ width: `${task.progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-medium">
                                                        {task.status === 'running' ? `Memproses... ${task.progress}%` : task.status.toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                                    <span className="text-gray-600 dark:text-gray-400 font-medium">{task.successCount} Berhasil</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                                    <span className="text-gray-600 dark:text-gray-400 font-medium">{task.failCount} Gagal</span>
                                                </div>
                                                {task.details && (
                                                    <p className="text-[10px] text-gray-400 italic mt-1">{task.details}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button 
                                                onClick={() => removeTask(task.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Hapus riwayat"
                                            >
                                                <HiOutlineTrash className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Modal>
    );
}
