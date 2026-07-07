import { useEffect, useState, useCallback } from 'react';
import { paymentApi, additionalFeatureApi, dashboardApi, couponApi } from '@/core/api/endpoints';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Transaction, TenantActiveFeature, Coupon } from '@/types';
import toast from 'react-hot-toast';
import { openSnapPayment, getStatusBadge } from '@/utils/midtrans';
import { useTranslation } from 'react-i18next';
import {
    HiOutlineRefresh,
    HiOutlineCreditCard,
    HiOutlineShoppingCart,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineExclamationCircle,
    HiOutlineInformationCircle,
    HiOutlineStar,
    HiOutlineTicket,
    HiOutlineX,
} from 'react-icons/hi';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';

export function PaymentPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    const isAdminLayout = useBasePath() === '/admin';
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingFeatures, setPendingFeatures] = useState<TenantActiveFeature[]>([]);
    const [planTypes, setPlanTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [couponValidating, setCouponValidating] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<Partial<Coupon> | null>(null);
    const [couponError, setCouponError] = useState('');
    const [checkoutPlan, setCheckoutPlan] = useState<any | null>(null);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [transactionToCancel, setTransactionToCancel] = useState<Transaction | null>(null);

    const openCheckout = (plan: any) => {
        const hasPendingPlan = transactions.some(tx => tx.item_type === 'plan' && tx.status === 'pending');
        if (hasPendingPlan) {
            toast.error('Ada transaksi pembelian paket yang masih tertunda. Silakan selesaikan atau batalkan transaksi tersebut terlebih dahulu.');
            return;
        }
        setCheckoutPlan(plan);
        setCouponCode('');
        setAppliedCoupon(null);
        setCouponError('');
    };

    const fetchAll = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        const config = isSilent ? { skipLoader: true } : undefined;
        try {
            const [txRes, featRes, planRes, dashRes] = await Promise.all([
                paymentApi.getTransactions(undefined, config),
                additionalFeatureApi.getTenantFeatures(undefined, config),
                paymentApi.getPlanTypes(config),
                dashboardApi.getTenantDashboard()
            ]);
            
            if (txRes.success) setTransactions(txRes.data || []);
            if (planRes.success) setPlanTypes(planRes.data || []);
            
            // Sync status_payment dari dashboard
            if (dashRes.success && dashRes.data?.tenant) {
                const tenant = dashRes.data.tenant;
                useAuthStore.getState().setUser({
                    ...useAuthStore.getState().user!,
                    status_payment: tenant.status_payment,
                    plan_type: tenant.plan_type
                });
            }
            
            if (featRes.success) {
                const txList = txRes.data || [];
                const pending = (featRes.data || []).filter(f => {
                    const isPurchased = !!f.id; 
                    const isPaymentPending = f.payment_status === 'Menunggu pembayaran';
                    const hasActiveTransaction = txList.some(tx => 
                        tx.item_id === f.additional_feature_id && 
                        (tx.status === 'pending' || tx.status === 'settlement')
                    );
                    return isPurchased && isPaymentPending && !hasActiveTransaction;
                });
                setPendingFeatures(pending);
            }
        } catch {
            toast.error('Gagal memuat data pembayaran');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Pada layout /admin, tombol refresh dipindah ke gold header (sebelah "Buka
    // Undangan"). Di /private lama tetap inline.
    useEffect(() => {
        if (!isAdminLayout) return;
        setHeaderAction(
            <button
                onClick={() => fetchAll(true)}
                disabled={loading}
                title={t('common.refresh', 'Refresh') as string}
                aria-label={t('common.refresh', 'Refresh') as string}
                className="admin-icon-btn"
            >
                <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
        );
        return () => setHeaderAction(null);
    }, [loading, isAdminLayout, fetchAll]);

    // Data Paket Tenant Saat Ini
    const currentPlanDetails = planTypes.find(p => String(p.plan_type).toLowerCase() === String(user?.plan_type).toLowerCase());
    const isPlanPaymentRequired = String(user?.status_payment || '').toLowerCase() === 'menunggu pembayaran' && 
                                 !transactions.some(tx => tx.item_type === 'plan' && tx.item_id === user?.plan_type && tx.status === 'pending');

    const handlePayFeature = async (feature: TenantActiveFeature) => {
        if (!feature.price || feature.price <= 0) {
            toast.error('Harga fitur tidak valid');
            return;
        }
        setPayingId(feature.additional_feature_id);
        try {
            const res = await paymentApi.createTransaction({
                item_type: 'feature',
                item_id: feature.additional_feature_id,
                item_name: feature.feature_name || 'Additional Feature',
                amount: feature.price,
            });
            if (!res.success || !res.data?.snap_token) {
                toast.error(res.message || 'Gagal membuat transaksi');
                return;
            }
            const result = await openSnapPayment(res.data.snap_token);
            if (result.status === 'success' || result.status === 'pending') {
                if (result.status === 'success') toast.success('Pembayaran berhasil!');
                setTimeout(() => fetchAll(true), 2000);
            }
        } catch {
            toast.error('Terjadi kesalahan saat memproses pembayaran');
        } finally {
            setPayingId(null);
        }
    };

    const handlePayPlan = async (plan: any) => {
        const statusStr = String(user?.status_payment || '').toLowerCase();
        const isPaid = statusStr === 'aktif' || statusStr === 'active' || statusStr === 'sudah dibayar';
        const currentPrice = Number(currentPlanDetails?.price || 0);
        
        // Jika sudah bayar (upgrade), gunakan selisih. Jika belum (pembelian baru/pindah), gunakan harga penuh.
        const baseAmount = isPaid ? (Number(plan.price) - currentPrice) : Number(plan.price);

        if (!baseAmount || baseAmount <= 0) { 
            toast.error(isPaid ? 'Anda sudah memiliki paket ini atau yang lebih tinggi' : 'Paket ini gratis atau tidak valid'); 
            return; 
        }
        
        setPayingId(`plan-${plan.plan_type}`);

        const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
        const fromPlan = capitalize(user?.plan_type || 'basic');
        const toPlan = capitalize(plan.plan_type);
        const itemName = isPaid 
            ? `Upgrade Paket dari ${fromPlan} ke ${toPlan}`
            : `Pembelian Paket ${toPlan}`;

        try {
            const res = await paymentApi.createTransaction({
                item_type: 'plan',
                item_id: plan.plan_type,
                item_name: itemName,
                amount: baseAmount,
                coupon_code: appliedCoupon ? couponCode : undefined,
            });
            if (!res.success || !res.data?.snap_token) {
                toast.error(res.message || 'Gagal membuat transaksi');
                return;
            }
            if (appliedCoupon && (res.data as any).discount_amount > 0) {
                toast.success(`Kupon ${couponCode} diterapkan! Diskon: ${formatCurrency((res.data as any).discount_amount)}`);
            }
            setCheckoutPlan(null);
            const result = await openSnapPayment(res.data.snap_token);
            if (result.status === 'success' || result.status === 'pending') {
                if (result.status === 'success') toast.success('Pembayaran paket berhasil!');
                setAppliedCoupon(null);
                setCouponCode('');
                setTimeout(() => fetchAll(true), 2000);
            }
        } catch {
            toast.error('Terjadi kesalahan');
        } finally {
            setPayingId(null);
        }
    };

    const handleValidateCoupon = async () => {
        const code = couponCode.trim();
        if (!code) { setCouponError('Masukkan kode kupon terlebih dahulu'); return; }
        setCouponValidating(true);
        setCouponError('');
        setAppliedCoupon(null);
        try {
            const res = await couponApi.validateCoupon({ 
                coupon_code: code, 
                item_type: 'plan',
                plan_id: checkoutPlan?.plan_type 
            });
            if (res.success) {
                const coupon = res.data;
                if (coupon.plan_id && coupon.plan_id.toLowerCase() !== checkoutPlan?.plan_type.toLowerCase()) {
                    setCouponError(`Kupon hanya berlaku untuk paket ${coupon.plan_id}`);
                } else {
                    setAppliedCoupon(coupon);
                    toast.success('Kode kupon valid!');
                }
            } else {
                setCouponError(res.message || 'Kode kupon tidak valid');
            }
        } catch {
            setCouponError('Gagal memvalidasi kupon');
        } finally {
            setCouponValidating(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
    };

    const handleRefreshStatus = async (orderId: string) => {
        setRefreshingId(orderId);
        try {
            const res = await paymentApi.getTransactionStatus(orderId);
            if (res.success) {
                setTransactions(prev => prev.map(t => t.id === orderId ? { ...t, ...res.data } : t));
                if (res.data?.status === 'settlement') {
                    toast.success('Pembayaran Berhasil! Data diperbarui.');
                    fetchAll(true);
                } else {
                    toast.success('Status diperbarui: ' + res.data?.status);
                }
            }
        } finally {
            setRefreshingId(null);
        }
    };

    const handleCancelTransaction = async () => {
        if (!transactionToCancel) return;
        setCancelingId(transactionToCancel.id);
        try {
            const res = await paymentApi.cancelTransaction(transactionToCancel.id);
            if (res.success) {
                toast.success('Transaksi berhasil dibatalkan');
                setTransactionToCancel(null);
                fetchAll(true);
            } else {
                toast.error(res.message || 'Gagal membatalkan transaksi');
            }
        } catch {
            toast.error('Terjadi kesalahan saat membatalkan transaksi');
        } finally {
            setCancelingId(null);
        }
    };

    const handleContinuePayment = async (tx: Transaction) => {
        if (!tx.snap_token) return;
        setPayingId(tx.id);
        try {
            const res = await paymentApi.getTransactionStatus(tx.id);
            if (res.success) {
                setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, ...res.data } : t));
                if (res.data?.status !== 'pending') {
                    if (res.data?.status === 'settlement') {
                        toast.success('Pembayaran Berhasil! Data diperbarui.');
                        fetchAll(true);
                    } else if (res.data?.status === 'expire' || res.data?.status === 'cancel' || res.data?.status === 'deny') {
                        const statusLabel = res.data?.status === 'expire' ? 'kadaluarsa' : 'dibatalkan/ditolak';
                        toast.error(`Transaksi ini sudah ${statusLabel} dan tidak dapat dilanjutkan.`);
                        fetchAll(true);
                    } else {
                        toast.error(`Status transaksi: ${res.data?.status}`);
                    }
                    setPayingId(null);
                    return;
                }
            }
            
            const result = await openSnapPayment(tx.snap_token);
            if (result.status === 'success' || result.status === 'pending') {
                if (result.status === 'success') {
                    toast.success('Pembayaran berhasil!');
                }
                setTimeout(() => fetchAll(true), 2000);
            } else {
                handleRefreshStatus(tx.id);
            }
        } catch {
            toast.error('Gagal memverifikasi status transaksi');
        } finally {
            setPayingId(null);
        }
    };


    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const formatDate = (dateStr: string) => {
        try { return new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
        catch { return dateStr; }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                        {t('payments.page_title', 'Pembayaran')}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t('payments.subtitle', 'Kelola transaksi dan tagihan Anda')}</p>
                </div>
                {/* Layout /admin: refresh dipindah ke gold header. Inline hanya untuk /private. */}
                {!isAdminLayout && (
                    <IconButton
                        onClick={() => fetchAll(false)}
                        title={t('common.refresh', 'Refresh')}
                        icon={<HiOutlineRefresh className="w-5 h-5" />}
                        spinning={loading}
                    />
                )}
            </div>

            {/* Pending Payments Alert */}
            {(pendingFeatures.length > 0 || isPlanPaymentRequired) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                        <HiOutlineExclamationCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-amber-800 dark:text-amber-400 mb-3">
                                {t('payments.pending_payment_items', { count: pendingFeatures.length + (isPlanPaymentRequired ? 1 : 0), defaultValue: '{{count}} Item Menunggu Pembayaran' })}
                            </p>
                            <div className="space-y-3">
                                {/* Plan Payment Alert */}
                                {isPlanPaymentRequired && currentPlanDetails && (
                                    <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-4 border-2 border-amber-500 shadow-md">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                                                <HiOutlineStar className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-white text-sm">{t('payments.plan_payment', { planType: user?.plan_type, defaultValue: 'Pembayaran Paket {{planType}}' })}</p>
                                                <p className="text-xs text-amber-600 font-semibold">{formatCurrency(currentPlanDetails.price)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openCheckout(currentPlanDetails)}
                                            disabled={!!payingId}
                                            className="flex items-center gap-2 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                                        >
                                            {payingId === `plan-${user?.plan_type}` ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <HiOutlineCreditCard className="w-4 h-4" />
                                            )}
                                            {t('payments.pay_plan', 'Bayar Paket')}
                                        </button>
                                    </div>
                                )}

                                {/* Additional Features Alerts */}
                                {pendingFeatures.map(f => (
                                    <div key={f.additional_feature_id}
                                        className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl p-4 border border-amber-100 dark:border-amber-900/50 shadow-sm">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm">{f.feature_name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(f.price || 0)}</p>
                                        </div>
                                        <button
                                            onClick={() => handlePayFeature(f)}
                                            disabled={!!payingId}
                                            className="flex items-center gap-2 py-2 px-4 bg-gold-500 hover:bg-gold-600 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 shadow-sm"
                                        >
                                            {payingId === f.additional_feature_id ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <HiOutlineCreditCard className="w-4 h-4" />
                                            )}
                                            {t('payments.pay_now', 'Bayar Sekarang')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade/Change Plan Section */}
            {(() => {
                const statusStr = String(user?.status_payment || '').toLowerCase();
                const isPaid = statusStr === 'aktif' || statusStr === 'active' || statusStr === 'sudah dibayar';
                const currentPrice = Number(currentPlanDetails?.price || 0);
                
                const availablePlans = planTypes.filter(p => {
                    if (p.plan_type === user?.plan_type) return false; 
                    if (p.price <= 0) return false; 
                    if (isPaid) return Number(p.price) > currentPrice;
                    return true;
                });

                if (isPaid && availablePlans.length === 0) return null;
                if (!isPaid && statusStr !== 'menunggu pembayaran') return null;

                return (
                    <div className="card">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-sm">
                                <HiOutlineShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 dark:text-white">
                                    {isPaid ? t('payments.upgrade_plan', 'Upgrade Paket') : t('payments.change_plan', 'Ubah Paket')}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isPaid ? t('payments.upgrade_desc', 'Tingkatkan paket untuk fitur lebih lengkap') : t('payments.change_desc', 'Pilih paket yang sesuai untuk undangan Anda')}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availablePlans.map((plan) => {
                                const displayPrice = isPaid ? (Number(plan.price) - currentPrice) : Number(plan.price);
                                
                                // Calculate discounted price if coupon applied
                                let discountedPrice: number | null = null;
                                if (appliedCoupon && (!appliedCoupon.plan_id || appliedCoupon.plan_id === plan.plan_type)) {
                                    if (appliedCoupon.discount_type === 'percent') {
                                        discountedPrice = Math.max(1, Math.round(displayPrice * (1 - Number(appliedCoupon.percent_discount) / 100)));
                                    } else {
                                        discountedPrice = Math.max(1, displayPrice - Number(appliedCoupon.nominal_discount));
                                    }
                                }

                                return (
                                    <div key={plan.id}
                                        className="relative p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-gold-300 dark:hover:border-gold-700 transition-all bg-gray-50/50 dark:bg-gray-800/30 group">
                                        {plan.plan_type === 'premium' && (
                                            <span className="absolute top-3 right-3 text-[10px] bg-gold-500 text-white px-2 py-0.5 rounded-full font-bold">{t('payments.recommended', 'REKOMENDASI')}</span>
                                        )}
                                        <div className="mb-4">
                                            <h3 className="font-bold text-gray-800 dark:text-white text-lg uppercase">{t('payments.plan_name', { planType: plan.plan_type, defaultValue: 'Paket {{planType}}' })}</h3>
                                            {discountedPrice !== null ? (
                                                <div className="mt-1">
                                                    <p className="text-lg font-bold text-gray-400 line-through">{formatCurrency(displayPrice)}</p>
                                                    <p className="text-3xl font-display font-bold text-violet-600">
                                                        {formatCurrency(discountedPrice)}
                                                        <span className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded ml-2 align-middle">{t('payments.coupon_badge', 'KUPON')}</span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-3xl font-display font-bold text-gold-600 mt-1">
                                                    {formatCurrency(displayPrice)}
                                                    {isPaid && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded ml-2 align-middle">{t('payments.difference_badge', 'SELISIH')}</span>}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-1">{t('payments.guest_limit', { limit: plan.guest_limit, defaultValue: 'Limit Tamu: {{limit}}' })}</p>
                                        </div>
                                        <button
                                            onClick={() => openCheckout(plan)}
                                            disabled={!!payingId}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gold-500 hover:border-gold-500 hover:text-white text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                                        >
                                            {payingId === `plan-${plan.plan_type}` ? (
                                                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                            ) : (
                                                <HiOutlineCreditCard className="w-4 h-4" />
                                            )}
                                            {isPaid ? t('payments.upgrade_to', { planType: plan.plan_type, defaultValue: 'Upgrade ke {{planType}}' }) : t('payments.switch_to', { planType: plan.plan_type, defaultValue: 'Pindah ke {{planType}}' })}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            <div className="card">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <HiOutlineInformationCircle className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 dark:text-white">{t('payments.transaction_history', 'Riwayat Transaksi')}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('payments.transaction_history_desc', 'Log semua transaksi pembayaran Anda')}</p>
                    </div>
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HiOutlineCreditCard className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-455 font-medium">{t('payments.no_transactions', 'Belum ada transaksi')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('payments.no_transactions_desc', 'Transaksi akan muncul setelah Anda melakukan pembelian')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map(tx => {
                            const badge = getStatusBadge(tx.status, t);
                            return (
                                <div key={tx.id}
                                    className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                                    {/* Top row: icon + title/meta + amount */}
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                            tx.status === 'settlement' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                                            tx.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                                            'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                            {tx.status === 'settlement' ? (
                                                <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
                                            ) : tx.status === 'pending' ? (
                                                <HiOutlineClock className="w-5 h-5 text-amber-500" />
                                            ) : (
                                                <HiOutlineExclamationCircle className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* Title clamped to 2 lines — never pushes width */}
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm leading-snug break-words line-clamp-2">{tx.item_description}</p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                                <span className="font-mono text-[11px] text-gray-400 truncate">{tx.id}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400 min-w-0">
                                                <span className="shrink-0">{formatDate(tx.created_at)}</span>
                                                {tx.payment_method && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="capitalize truncate">{tx.payment_method.replace(/_/g, ' ')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <p className="font-bold text-gray-800 dark:text-white text-sm shrink-0 whitespace-nowrap">{formatCurrency(Number(tx.amount))}</p>
                                    </div>

                                    {/* Action row: wraps, full-width buttons on mobile */}
                                    {tx.status === 'pending' && (
                                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                            <button
                                                onClick={() => handleRefreshStatus(tx.id)}
                                                disabled={refreshingId === tx.id}
                                                className="flex items-center justify-center gap-1 flex-1 min-w-[96px] px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors text-[11px] font-bold disabled:opacity-50"
                                            >
                                                <HiOutlineRefresh className={`w-3.5 h-3.5 ${refreshingId === tx.id ? 'animate-spin' : ''}`} />
                                                {t('payments.check_status', 'Cek Status')}
                                            </button>

                                            <button
                                                onClick={() => setTransactionToCancel(tx)}
                                                disabled={cancelingId === tx.id}
                                                className="flex items-center justify-center gap-1 flex-1 min-w-[96px] px-2 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-[11px] font-bold disabled:opacity-50"
                                            >
                                                {cancelingId === tx.id ? (
                                                    <div className="w-3.5 h-3.5 border border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                                                ) : (
                                                    <HiOutlineX className="w-3.5 h-3.5" />
                                                )}
                                                {t('payments.cancel_btn', 'Batalkan')}
                                            </button>

                                            {tx.snap_token && (
                                                <button
                                                    onClick={() => handleContinuePayment(tx)}
                                                    disabled={!!payingId}
                                                    className="flex items-center justify-center gap-1 flex-1 min-w-[96px] text-[11px] text-gold-600 hover:text-gold-700 font-bold bg-gold-50 dark:bg-gold-900/20 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {payingId === tx.id ? <div className="w-3.5 h-3.5 border border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /> : <HiOutlineCreditCard className="w-3.5 h-3.5" />}
                                                    {t('payments.continue_btn', 'Lanjutkan')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                isOpen={!!checkoutPlan}
                onClose={() => setCheckoutPlan(null)}
                title={t('payments.checkout_title', 'Checkout Pembayaran Paket')}
                size="md"
            >
                {checkoutPlan && (() => {
                    const statusStr = String(user?.status_payment || '').toLowerCase();
                    const isPaid = statusStr === 'aktif' || statusStr === 'active' || statusStr === 'sudah dibayar';
                    const currentPrice = Number(currentPlanDetails?.price || 0);
                    const baseAmount = isPaid ? (Number(checkoutPlan.price) - currentPrice) : Number(checkoutPlan.price);

                    let discountAmount = 0;
                    if (appliedCoupon && (!appliedCoupon.plan_id || appliedCoupon.plan_id.toLowerCase() === checkoutPlan.plan_type.toLowerCase())) {
                        if (appliedCoupon.discount_type === 'percent') {
                            discountAmount = Math.round(baseAmount * (Number(appliedCoupon.percent_discount) / 100));
                        } else {
                            discountAmount = Number(appliedCoupon.nominal_discount);
                        }
                    }
                    const finalAmount = Math.max(1, baseAmount - discountAmount);

                    return (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Rincian Paket */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl">
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{t('payments.plan_details', 'Rincian Paket')}</p>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-white uppercase text-base">
                                            {t('payments.plan_name', { planType: checkoutPlan.plan_type, defaultValue: 'Paket {{planType}}' })}
                                            {isPaid && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded ml-2 align-middle font-semibold">{t('payments.upgrade_tag', 'UPGRADE')}</span>}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">{t('payments.guest_limit_desc', { limit: checkoutPlan.guest_limit, defaultValue: 'Limit Tamu: {{limit}} undangan' })}</p>
                                    </div>
                                    <p className="font-bold text-gray-800 dark:text-white">{formatCurrency(baseAmount)}</p>
                                </div>
                            </div>

                            {/* Kode Promosi Input */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                                    {t('payments.coupon_question', 'Punya Kode Promo?')}
                                </label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-255 dark:border-emerald-800 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                                                <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-emerald-800 dark:text-emerald-300 font-mono text-sm">{couponCode.toUpperCase()}</p>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                    {t('payments.discount', 'Diskon')} {appliedCoupon.discount_type === 'percent'
                                                        ? `${appliedCoupon.percent_discount}%`
                                                        : formatCurrency(Number(appliedCoupon.nominal_discount))}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleRemoveCoupon} 
                                            className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 hover:text-red-500 transition-colors"
                                        >
                                            <HiOutlineX className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                                onKeyDown={e => e.key === 'Enter' && handleValidateCoupon()}
                                                placeholder={t('payments.coupon_placeholder', 'Masukkan kode promo (contoh: PROMO50)')}
                                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-850 dark:text-white font-mono text-xs focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                            />
                                            <button
                                                onClick={handleValidateCoupon}
                                                disabled={couponValidating || !couponCode.trim()}
                                                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 transition-all shadow-md active:scale-95"
                                            >
                                                {couponValidating ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <HiOutlineTicket className="w-3.5 h-3.5" />
                                                )}
                                                {t('payments.apply_coupon', 'Gunakan')}
                                            </button>
                                        </div>
                                        {couponError && (
                                            <p className="flex items-center gap-1 text-[11px] text-red-650 dark:text-red-405 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
                                                <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0" />
                                                {couponError}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Ringkasan Pembayaran */}
                            <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-150 dark:border-gray-700/50 rounded-2xl space-y-3">
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('payments.payment_summary', 'Ringkasan Pembayaran')}</p>
                                
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between text-gray-650 dark:text-gray-400">
                                        <span>{t('payments.plan_price', 'Harga Paket')}</span>
                                        <span>{formatCurrency(baseAmount)}</span>
                                    </div>
                                    
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-emerald-600 dark:text-emerald-450 font-medium">
                                            <span>{t('payments.promo_discount', 'Diskon Promo')}</span>
                                            <span>-{formatCurrency(discountAmount)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="pt-2 border-t border-gray-255 dark:border-gray-700 flex justify-between items-center text-gray-850 dark:text-white font-bold">
                                        <span>{t('payments.total_payment', 'Total Bayar')}</span>
                                        <span className="text-lg text-gold-600 dark:text-gold-500 font-display">{formatCurrency(finalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setCheckoutPlan(null)}
                                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                                    disabled={!!payingId}
                                >
                                    {t('common.cancel', 'Batal')}
                                </button>
                                <button
                                    onClick={() => handlePayPlan(checkoutPlan)}
                                    disabled={!!payingId}
                                    className="px-6 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-gold-500/10 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {payingId ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <HiOutlineCreditCard className="w-4 h-4" />
                                    )}
                                    {t('payments.pay_now', 'Bayar Sekarang')}
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            {/* Modal Konfirmasi Batal Pembayaran */}
            <Modal
                isOpen={!!transactionToCancel}
                onClose={() => setTransactionToCancel(null)}
                title={t('payments.cancel_modal_title', 'Batalkan Transaksi Pembelian')}
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineExclamationCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm space-y-2">
                                <p className="font-semibold text-base">{t('payments.cancel_confirm_title', 'Konfirmasi Pembatalan')}</p>
                                <p>{t('payments.cancel_confirm_desc', 'Anda akan membatalkan transaksi berikut:')}</p>
                                <ul className="list-disc pl-4 space-y-1 opacity-90 text-[11px]">
                                    <li>{t('payments.transaction_id', 'ID Transaksi')}: <span className="font-mono font-bold">{transactionToCancel?.id}</span></li>
                                    <li>{t('payments.item', 'Item')}: <b>{transactionToCancel?.item_description}</b></li>
                                    <li>{t('payments.amount', 'Jumlah')}: <b>{transactionToCancel ? formatCurrency(Number(transactionToCancel.amount)) : ''}</b></li>
                                    <li>{t('payments.date', 'Tanggal')}: <b>{transactionToCancel ? formatDate(transactionToCancel.created_at) : ''}</b></li>
                                </ul>
                                <p className="font-medium pt-2 text-xs">{t('payments.cancel_confirm_note', 'Setelah dibatalkan, status transaksi akan berubah menjadi permanen batal dan Anda dapat melakukan pembelian ulang.')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setTransactionToCancel(null)}
                            className="px-5 py-1.5 text-sm"
                            disabled={!!cancelingId}
                        >
                            {t('payments.back', 'Kembali')}
                        </Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleCancelTransaction}
                            loading={!!cancelingId}
                            className="px-6 py-1.5 text-sm"
                        >
                            {t('payments.yes_cancel', 'Ya, Batalkan Transaksi')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
