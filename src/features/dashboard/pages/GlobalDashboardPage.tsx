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
            if (response.success) {
                setDashboard(response.data);
            }
        } catch {
            toast.error('Failed to load global dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <PageLoader />;
    if (!dashboard) return null;

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
