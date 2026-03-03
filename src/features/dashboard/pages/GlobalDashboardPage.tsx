import { useEffect, useState } from 'react';
import { dashboardApi } from '@/core/api/endpoints';
import { StatCard } from '@/shared/components/StatCard';
import { PageLoader } from '@/shared/components/Loading';
import type { GlobalDashboard } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlineOfficeBuilding,
    HiOutlineUsers,
    HiOutlineCurrencyDollar,
    HiOutlineStatusOnline,
    HiOutlineChartBar
} from 'react-icons/hi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

const COLORS = ['#C6A769', '#10B981', '#6366F1'];

export function GlobalDashboardPage() {
    const [dashboard, setDashboard] = useState<GlobalDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await dashboardApi.getGlobalDashboard();
            if (response.success && response.data) {
                setDashboard(response.data);
            } else {
                setDashboard(null);
            }
        } catch {
            setDashboard(null);
            toast.error('Failed to load global dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <PageLoader />;

    // Helper for empty state detection
    const isEmpty = !dashboard || (dashboard.total_tenants === 0 && dashboard.total_guests_system === 0);

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-wedding-dark-card rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm animate-fade-in text-center h-[50vh]">
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
                    <HiOutlineChartBar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No Data Available</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    There is currently no tenant or guest data to display in the global dashboard. Data will appear here once tenants start registering and managing weddings.
                </p>
            </div>
        );
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Global Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform-wide statistics and insights</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Tenants"
                    value={dashboard.total_tenants}
                    icon={<HiOutlineOfficeBuilding className="w-6 h-6" />}
                    color="gold"
                />
                <StatCard
                    title="Active Tenants"
                    value={dashboard.total_active_tenants}
                    icon={<HiOutlineStatusOnline className="w-6 h-6" />}
                    color="emerald"
                />
                <StatCard
                    title="Total Guests (System)"
                    value={dashboard.total_guests_system.toLocaleString()}
                    icon={<HiOutlineUsers className="w-6 h-6" />}
                    color="blue"
                />
                <StatCard
                    title="Revenue Estimation"
                    value={formatCurrency(dashboard.revenue_estimation)}
                    icon={<HiOutlineCurrencyDollar className="w-6 h-6" />}
                    color="violet"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tenant Growth</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboard.tenant_growth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFF',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            />
                            <Bar dataKey="count" fill="#C6A769" radius={[6, 6, 0, 0]} name="Tenants" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Plan Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={dashboard.plan_distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {dashboard.plan_distribution.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
