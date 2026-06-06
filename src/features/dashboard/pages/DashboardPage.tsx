import { useEffect, useState } from 'react';
import { dashboardApi, reviewApi } from '@/core/api/endpoints';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTranslation } from 'react-i18next';
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
    HiOutlineStar,
    HiStar,
    HiOutlineChatAlt2,
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

import { useDashboardStore } from '../store/dashboardStore';
import { HiOutlineRefresh } from 'react-icons/hi';

export function DashboardPage() {
    const { 
        tenantDashboard: dashboard, 
        loading, 
        fetchTenantDashboard, 
        hasLoadedTenant 
    } = useDashboardStore();
    
    const { tenant } = useAuthStore();
    const { t } = useTranslation();

    // Review State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rate_star: 5, comment: '' });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isHPlusOnePassed, setIsHPlusOnePassed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchDashboard();
        checkReviewStatus();
    }, [tenant?.id]);

    const fetchDashboard = async (force = false) => {
        if (force) {
            toast.loading('Refreshing dashboard...', { id: 'refresh-dashboard' });
        }
        const success = await fetchTenantDashboard(force);
        if (force) {
            if (success) toast.success('Dashboard updated!', { id: 'refresh-dashboard' });
            else toast.error('Failed to refresh dashboard', { id: 'refresh-dashboard' });
        }
    };

    const checkReviewStatus = async () => {
        if (!tenant?.wedding_date) return;

        const dateParts = tenant.wedding_date.split('-');
        if (dateParts.length !== 3) return;
        
        const weddingDate = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
        );

        const dayAfterWedding = new Date(weddingDate);
        dayAfterWedding.setDate(dayAfterWedding.getDate() + 1);
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const passed = today >= dayAfterWedding;
        setIsHPlusOnePassed(passed);

        // Only check API once per session for the auto-modal
        const hasChecked = sessionStorage.getItem('review_checked_this_session');
        
        if (passed) {
            try {
                // If we haven't checked the API this session, do it now
                if (!hasChecked) {
                    const res = await reviewApi.getTenantReview();
                    sessionStorage.setItem('review_checked_this_session', 'true');
                    
                    if (res.success) {
                        if (res.data) {
                            setHasSubmittedReview(true);
                        } else {
                            const fillLater = sessionStorage.getItem('review_fill_later');
                            if (!fillLater) {
                                setShowReviewModal(true);
                            }
                        }
                    }
                }
            } catch {
                console.error('Failed to check review status');
            }
        }
    };

    const handleSubmitReview = async () => {
        if (!reviewForm.comment.trim()) {
            toast.error('Mohon isi komentar Anda');
            return;
        }

        setIsSubmittingReview(true);
        try {
            const res = await reviewApi.submitReview(reviewForm);
            if (res.success) {
                toast.success('Terima kasih atas review Anda!');
                setHasSubmittedReview(true);
                setShowReviewModal(false);
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error('Gagal mengirim review');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleFillLater = () => {
        sessionStorage.setItem('review_fill_later', 'true');
        setShowReviewModal(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4">
                <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        {tenant ? `${t('dashboard.wedding_date')}: ${new Date(tenant.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : t('dashboard.overview')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <IconButton
                        onClick={() => fetchDashboard(true)}
                        icon={<HiOutlineRefresh className="w-5 h-5" />}
                        spinning={loading}
                        title="Refresh Data"
                    />
                </div>
            </div>

            {!dashboard && loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                </div>
            ) : !dashboard ? (
                <div className="card text-center py-12">
                    <p className="text-gray-500">No dashboard data available.</p>
                </div>
            ) : (
                <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                    title={t('dashboard.total_guests')}
                    value={dashboard.total_guests}
                    icon={<HiOutlineUsers className="w-6 h-6" />}
                    color="gold"
                />
                <StatCard
                    title={t('dashboard.wishes')}
                    value={dashboard.total_wishes}
                    icon={<HiOutlineHeart className="w-6 h-6" />}
                    color="violet"
                />
                <StatCard
                    title={t('dashboard.gifts')}
                    value={dashboard.total_gifts}
                    icon={<HiOutlineGift className="w-6 h-6" />}
                    color="blue"
                />
                <StatCard
                    title={t('dashboard.total_amount')}
                    value={formatCurrency(dashboard.total_nominal)}
                    icon={<HiOutlineCurrencyDollar className="w-6 h-6" />}
                    color="emerald"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Guest Growth Chart - Sparkline Style */}
                <div className="lg:col-span-2 card !p-4 md:!p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm md:text-lg font-semibold text-gray-800 dark:text-white">{t('dashboard.guest_growth')}</h3>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest">{t('dashboard.last_7_days', '7 Hari Terakhir')}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={isMobile ? 140 : 200}>
                        <AreaChart data={dashboard.guest_growth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#C6A769" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#C6A769" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="date" 
                                hide={isMobile} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            />
                            <YAxis hide axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFF',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    fontSize: '11px'
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#C6A769"
                                strokeWidth={2.5}
                                fill="url(#goldGradient)"
                                name="Guests"
                                dot={!isMobile}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* RSVP Breakdown - Compact Bar Style */}
                <div className="card !p-4 md:!p-6 flex flex-col justify-center">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-800 dark:text-white mb-4">{t('dashboard.rsvp_breakdown')}</h3>
                    
                    <div className="space-y-4">
                        {/* Compact Stacked Bar */}
                        <div className="flex h-3 md:h-4 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                            {dashboard.rsvp_breakdown.map((item, idx) => {
                                const total = dashboard.rsvp_breakdown.reduce((acc, curr) => acc + curr.value, 0);
                                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                                return (
                                    <div 
                                        key={idx} 
                                        style={{ width: `${percentage}%`, backgroundColor: PIE_COLORS[idx] }}
                                        className="h-full transition-all duration-500 hover:opacity-80"
                                        title={`${item.name}: ${item.value}`}
                                    />
                                );
                            })}
                        </div>

                        {/* Legend Grid */}
                        <div className="grid grid-cols-1 gap-2.5">
                            {dashboard.rsvp_breakdown.map((item, idx) => {
                                const total = dashboard.rsvp_breakdown.reduce((acc, curr) => acc + curr.value, 0);
                                const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                                return (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }} />
                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-800 dark:text-white">{item.value}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">({percentage}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Review Widget */}
            {!hasSubmittedReview && isHPlusOnePassed && (
                <div className="card bg-gold-50 dark:bg-gold-900/10 border-gold-200 dark:border-gold-900/30 p-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 text-center md:text-left">
                            <div className="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center shrink-0">
                                <HiOutlineStar className="w-6 h-6 text-gold-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gold-800 dark:text-gold-400">{t('dashboard.experience_question')}</h3>
                                <p className="text-sm text-gold-700/70 dark:text-gold-500/70">{t('dashboard.experience_description')}</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowReviewModal(true)}
                            className="whitespace-nowrap"
                        >
                            {t('dashboard.write_review')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Quick Info */}
            {tenant && (
                <div className="card !p-4 md:!p-6">
                    <h3 className="text-sm md:text-lg font-semibold text-gray-800 dark:text-white mb-3 md:mb-4">{t('dashboard.wedding_info')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('dashboard.plan')}</p>
                            {tenant.plan_type === 'basic' && <span className="badge-gray text-sm capitalize">{tenant.plan_type}</span>}
                            {tenant.plan_type === 'pro' && <span className="badge-blue text-sm capitalize">{tenant.plan_type}</span>}
                            {tenant.plan_type === 'premium' && <span className="badge-gold text-sm capitalize">{tenant.plan_type}</span>}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('dashboard.guest_limit')}</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white">
                                {tenant.guest_limit === -1 ? t('dashboard.unlimited') : tenant.guest_limit}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('dashboard.domain')}</p>
                            <p className="text-sm font-medium text-gold-600">{tenant.domain_slug}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('dashboard.status')}</p>
                            <span className={`badge ${tenant.status_account === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                {tenant.status_account}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            <Modal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                title="Bagaimana Pengalaman Anda?"
                size="md"
            >
                <div className="space-y-6 py-2">
                    <div className="text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-4 px-4">Pernikahan Anda telah selesai. Kami ingin mendengar pendapat Anda mengenai layanan kami.</p>
                        
                        {/* Star Rating */}
                        <div className="flex justify-center gap-2 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setReviewForm(prev => ({ ...prev, rate_star: star }))}
                                    className="p-1 transition-transform hover:scale-110 active:scale-95"
                                >
                                    {star <= reviewForm.rate_star ? (
                                        <HiStar className="w-10 h-10 text-amber-400" />
                                    ) : (
                                        <HiOutlineStar className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-sm font-medium text-amber-600">
                            {reviewForm.rate_star === 5 && 'Luar Biasa!'}
                            {reviewForm.rate_star === 4 && 'Sangat Baik'}
                            {reviewForm.rate_star === 3 && 'Cukup Baik'}
                            {reviewForm.rate_star === 2 && 'Kurang Memuaskan'}
                            {reviewForm.rate_star === 1 && 'Sangat Kurang'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="label-field">Komentar / Feedback</label>
                        <textarea
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                            className="input-field min-h-[120px] resize-none"
                            placeholder="Ceritakan pengalaman Anda menggunakan Wedding SaaS..."
                        />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={handleSubmitReview}
                            disabled={isSubmittingReview}
                            className="btn-primary w-full py-3"
                        >
                            {isSubmittingReview ? 'Mengirim...' : 'Kirim Review'}
                        </button>
                        <button
                            onClick={handleFillLater}
                            className="btn-ghost w-full py-2 text-gray-400"
                        >
                            Isi Nanti
                        </button>
                    </div>
                </div>
            </Modal>
                </>
            )}
        </div>
    );
}
