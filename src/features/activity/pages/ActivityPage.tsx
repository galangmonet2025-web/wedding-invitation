import { useEffect, useState } from 'react';
import { PageLoader } from '@/shared/components/Loading';
import { IconButton } from '@/shared/components/IconButton';
import type { ActivityLog } from '@/types';
import { useActivityStore } from '../store/activityStore';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';
import {
    HiOutlineLogin,
    HiOutlineUserAdd,
    HiOutlineTrash,
    HiOutlinePencil,
    HiOutlineOfficeBuilding,
    HiOutlineClock,
    HiOutlineRefresh,
} from 'react-icons/hi';

const actionIcons: Record<string, typeof HiOutlineLogin> = {
    login: HiOutlineLogin,
    create_guest: HiOutlineUserAdd,
    delete_guest: HiOutlineTrash,
    update_guest: HiOutlinePencil,
    create_tenant: HiOutlineOfficeBuilding,
};

const actionColors: Record<string, string> = {
    login: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    create_guest: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    delete_guest: 'bg-red-100 dark:bg-red-900/30 text-red-600',
    update_guest: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    create_tenant: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600',
};

export function ActivityPage() {
    const { logs, fetchLogs: fetchStoreLogs } = useActivityStore();
    const [loading, setLoading] = useState(logs.length === 0);
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    const isAdminLayout = useBasePath() === '/admin';

    useEffect(() => {
        const load = async () => {
            if (logs.length === 0) setLoading(true);
            await fetchStoreLogs();
            setLoading(false);
        };
        load();
    }, []);

    const fetchLogs = async (force = true) => {
        if (force) setLoading(true);
        await fetchStoreLogs(force);
        setLoading(false);
    };

    // Pada layout /admin, tombol refresh dipindah ke gold header (sebelah "Buka
    // Undangan") — konsisten dengan Ucapan, Daftar Tamu, dll. Di /private lama
    // tetap inline pada sub-header di bawah.
    useEffect(() => {
        if (!isAdminLayout) return;
        setHeaderAction(
            <button
                onClick={() => fetchLogs()}
                disabled={loading}
                title="Refresh Data"
                aria-label="Refresh Data"
                className="admin-icon-btn"
            >
                <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        );
        return () => setHeaderAction(null);
    }, [loading, isAdminLayout]);

    const formatAction = (action: string) => {
        return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('id-ID');
    };

    if (loading) return <PageLoader />;

    // Group by date
    const grouped = logs.reduce<Record<string, ActivityLog[]>>((acc, log) => {
        const date = new Date(log.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(log);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Track all actions performed in the system</p>
                </div>
                {/* Layout /admin: refresh dipindah ke gold header. Inline hanya untuk /private. */}
                {!isAdminLayout && (
                    <IconButton
                        onClick={() => fetchLogs()}
                        icon={<HiOutlineRefresh className="w-5 h-5" />}
                        spinning={loading}
                        title="Refresh Data"
                    />
                )}
            </div>

            <div className="space-y-8">
                {Object.entries(grouped).map(([date, dayLogs]) => (
                    <div key={date}>
                        <div className="flex items-center gap-3 mb-4">
                            <HiOutlineClock className="w-4 h-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">{date}</h3>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <div className="space-y-2 ml-2">
                            {dayLogs.map((log, index) => {
                                const Icon = actionIcons[log.action] || HiOutlineClock;
                                const colorClass = actionColors[log.action] || 'bg-gray-100 dark:bg-gray-800 text-gray-600';

                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors animate-fade-in"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className={`p-2.5 rounded-xl ${colorClass}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-white">
                                                {formatAction(log.action)}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                                    {log.username || 'System'}
                                                </span>
                                                {log.role && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                        log.role === 'superadmin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                                                        log.role === 'tenant_admin' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                                                        'bg-gray-100 text-gray-600 dark:bg-gray-700'
                                                    }`}>
                                                        {log.role}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(log.created_at)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {logs.length === 0 && (
                <div className="card text-center py-16">
                    <HiOutlineClock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No activity logs yet</p>
                </div>
            )}
        </div>
    );
}
