import { useEffect, useState, useCallback } from 'react';
import { paymentApi } from '@/core/api/endpoints';
import type { Transaction } from '@/types';
import toast from 'react-hot-toast';
import { getStatusBadge } from '@/utils/midtrans';
import {
    HiOutlineRefresh,
    HiOutlineCreditCard,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineExclamationCircle,
    HiOutlineSearch,
    HiOutlineChartBar,
    HiOutlineCurrencyDollar,
    HiOutlineX,
} from 'react-icons/hi';

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'Semua Status' },
    { value: 'settlement', label: 'Berhasil' },
    { value: 'pending', label: 'Menunggu' },
    { value: 'expire', label: 'Kadaluarsa' },
    { value: 'cancel', label: 'Dibatalkan' },
];

const TYPE_FILTER_OPTIONS = [
    { value: '', label: 'Semua Jenis' },
    { value: 'feature', label: 'Fitur Tambahan' },
    { value: 'plan', label: 'Paket Undangan' },
];

export function TransactionMonitoringPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await paymentApi.getTransactions();
            if (res.success) setTransactions(res.data || []);
        } catch {
            toast.error('Gagal memuat data transaksi');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = transactions.filter(tx => {
        const matchSearch = !search ||
            tx.id.toLowerCase().includes(search.toLowerCase()) ||
            (tx.tenant_name || '').toLowerCase().includes(search.toLowerCase()) ||
            tx.item_description.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || tx.status === statusFilter;
        const matchType = !typeFilter || tx.item_type === typeFilter;
        return matchSearch && matchStatus && matchType;
    });

    const totalRevenue = transactions
        .filter(t => t.status === 'settlement')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const pendingCount = transactions.filter(t => t.status === 'pending').length;
    const settledCount = transactions.filter(t => t.status === 'settlement').length;

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const formatDate = (dateStr: string) => {
        try { return new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
        catch { return dateStr; }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Monitoring Transaksi</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Semua transaksi pembayaran di platform</p>
                </div>
                <button
                    onClick={fetchAll}
                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                    title="Refresh"
                >
                    <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <HiOutlineCurrencyDollar className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Total Revenue</p>
                        <p className="text-xl font-bold font-display text-gray-800 dark:text-white">{formatCurrency(totalRevenue)}</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <HiOutlineCheckCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Berhasil</p>
                        <p className="text-xl font-bold font-display text-gray-800 dark:text-white">{settledCount} Transaksi</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <HiOutlineClock className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Menunggu</p>
                        <p className="text-xl font-bold font-display text-gray-800 dark:text-white">{pendingCount} Transaksi</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cari Order ID, nama tenant, nama item..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input-field pl-9 text-sm"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <HiOutlineX className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="select-field text-sm md:w-48"
                    >
                        {STATUS_FILTER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="select-field text-sm md:w-48"
                    >
                        {TYPE_FILTER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Transaction List */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <HiOutlineChartBar className="w-5 h-5 text-gold-500" />
                        <h2 className="font-bold text-gray-800 dark:text-white">Daftar Transaksi</h2>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full font-medium">
                        {filtered.length} transaksi
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-3 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HiOutlineCreditCard className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Tidak ada transaksi</p>
                        {(search || statusFilter || typeFilter) && (
                            <button
                                onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
                                className="mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium"
                            >
                                Reset Filter
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenant</th>
                                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jenis</th>
                                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nominal</th>
                                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {filtered.map(tx => {
                                    const badge = getStatusBadge(tx.status);
                                    return (
                                        <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="py-3 pr-4">
                                                <span className="font-mono text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{tx.id}</span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <p className="font-medium text-gray-800 dark:text-white text-xs truncate max-w-[140px]">
                                                    {tx.tenant_name || tx.tenant_id}
                                                </p>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <p className="text-gray-700 dark:text-gray-300 text-xs truncate max-w-[180px]">{tx.item_description}</p>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tx.item_type === 'feature' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                                                    {tx.item_type === 'feature' ? 'Fitur' : 'Paket'}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-right">
                                                <span className="font-bold text-gray-800 dark:text-white text-xs">{formatCurrency(Number(tx.amount))}</span>
                                            </td>
                                            <td className="py-3">
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(tx.created_at)}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
