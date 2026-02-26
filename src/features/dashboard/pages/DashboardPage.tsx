import { useEffect, useState } from 'react';
import { dashboardApi } from '@/core/api/endpoints';
import { useAuthStore } from '@/features/auth/store/authStore';
import { StatCard } from '@/shared/components/StatCard';
import { PageLoader } from '@/shared/components/Loading';
import type { TenantDashboard } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlineUsers,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineHeart,
    HiOutlineGift,
    HiOutlineCurrencyDollar,
} from 'react-icons/hi';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

const PIE_COLORS = ['#10B981', '#EF4444', '#F59E0B'];

export function DashboardPage() {
    const [dashboard, setDashboard] = useState<TenantDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const { tenant } = useAuthStore();

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await dashboardApi.getTenantDashboard();
            if (response.success) {
                setDashboard(response.data);
            } else {
                toast.error(response.message);
            }
        } catch {
            toast.error('Failed to load dashboard');
            setDashboard({
                total_guests: 0,
                total_confirmed: 0,
                total_declined: 0,
                total_pending: 0,
                total_wishes: 0,
                total_gifts: 0,
                total_nominal: 0,
                guest_growth: [],
                rsvp_breakdown: [
                    { name: 'Confirmed', value: 0 },
                    { name: 'Declined', value: 0 },
                    { name: 'Pending', value: 0 },
                ],
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <PageLoader />;
    if (!dashboard) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">
                        {tenant ? `${tenant.bride_name} & ${tenant.groom_name}` : 'Dashboard'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {tenant ? `Wedding Date: ${new Date(tenant.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : 'Overview of your wedding event'}
                    </p>
                </div>
                {tenant?.domain_slug && (
                    <a
                        href={`${window.location.origin}${window.location.pathname}#/invitation/${tenant.domain_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm flex items-center gap-2"
                    >
                        💌 Lihat Undangan
                    </a>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    title="Total Guests"
                    value={dashboard.total_guests}
                    icon={<HiOutlineUsers className="w-6 h-6" />}
                    color="gold"
                />
                <StatCard
                    title="Confirmed"
                    value={dashboard.total_confirmed}
                    icon={<HiOutlineCheckCircle className="w-6 h-6" />}
                    color="emerald"
                />
                <StatCard
                    title="Declined"
                    value={dashboard.total_declined}
                    icon={<HiOutlineXCircle className="w-6 h-6" />}
                    color="rose"
                />
                <StatCard
                    title="Wishes"
                    value={dashboard.total_wishes}
                    icon={<HiOutlineHeart className="w-6 h-6" />}
                    color="violet"
                />
                <StatCard
                    title="Gifts"
                    value={dashboard.total_gifts}
                    icon={<HiOutlineGift className="w-6 h-6" />}
                    color="blue"
                />
                <StatCard
                    title="Total Amount"
                    value={formatCurrency(dashboard.total_nominal)}
                    icon={<HiOutlineCurrencyDollar className="w-6 h-6" />}
                    color="gold"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Guest Growth Chart */}
                <div className="lg:col-span-2 card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Guest Growth</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={dashboard.guest_growth}>
                            <defs>
                                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#C6A769" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#C6A769" stopOpacity={0} />
                                </linearGradient>
                            </defs>
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
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#C6A769"
                                strokeWidth={3}
                                fill="url(#goldGradient)"
                                name="Guests"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* RSVP Pie Chart */}
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">RSVP Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={dashboard.rsvp_breakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {dashboard.rsvp_breakdown.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Info */}
            {tenant && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Wedding Info</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Plan</p>
                            <span className="badge-gold text-sm capitalize">{tenant.plan_type}</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Guest Limit</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white">
                                {tenant.guest_limit === -1 ? 'Unlimited' : tenant.guest_limit}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Domain</p>
                            <p className="text-sm font-medium text-gold-600">{tenant.domain_slug}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                            <span className={`badge ${tenant.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                {tenant.status}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
