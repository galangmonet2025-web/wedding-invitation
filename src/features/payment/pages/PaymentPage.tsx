import { useEffect, useState, useCallback } from 'react';
import { paymentApi, additionalFeatureApi, dashboardApi } from '@/core/api/endpoints';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Transaction, TenantActiveFeature } from '@/types';
import toast from 'react-hot-toast';
import { openSnapPayment, getStatusBadge } from '@/utils/midtrans';
import {
    HiOutlineRefresh,
    HiOutlineCreditCard,
    HiOutlineShoppingCart,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineExclamationCircle,
    HiOutlineInformationCircle,
    HiOutlineStar,
} from 'react-icons/hi';

export function PaymentPage() {
    const { user } = useAuthStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingFeatures, setPendingFeatures] = useState<TenantActiveFeature[]>([]);
    const [planTypes, setPlanTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState<string | null>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    const fetchAll = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [txRes, featRes, planRes, dashRes] = await Promise.all([
                paymentApi.getTransactions(),
                additionalFeatureApi.getTenantFeatures(),
                paymentApi.getPlanTypes(),
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
        const amount = isPaid ? (Number(plan.price) - currentPrice) : Number(plan.price);

        if (!amount || amount <= 0) { 
            toast.error(isPaid ? 'Anda sudah memiliki paket ini atau yang lebih tinggi' : 'Paket ini gratis atau tidak valid'); 
            return; 
        }
        
        setPayingId(`plan-${plan.plan_type}`);
        try {
            const res = await paymentApi.createTransaction({
                item_type: 'plan',
                item_id: plan.plan_type,
                item_name: `Paket ${plan.plan_type}${isPaid ? ' (Upgrade)' : ''}`,
                amount: amount,
            });
            if (!res.success || !res.data?.snap_token) {
                toast.error(res.message || 'Gagal membuat transaksi');
                return;
            }
            const result = await openSnapPayment(res.data.snap_token);
            if (result.status === 'success' || result.status === 'pending') {
                if (result.status === 'success') toast.success('Pembayaran paket berhasil!');
                setTimeout(() => fetchAll(true), 2000);
            }
        } catch {
            toast.error('Terjadi kesalahan');
        } finally {
            setPayingId(null);
        }
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
        } catch {
            toast.error('Gagal memperbarui status');
        } finally {
            setRefreshingId(null);
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
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kelola transaksi dan tagihan Anda</p>
                </div>
                <button
                    onClick={() => fetchAll(false)}
                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                    title="Refresh"
                >
                    <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Pending Payments Alert */}
            {(pendingFeatures.length > 0 || isPlanPaymentRequired) && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                        <HiOutlineExclamationCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-amber-800 dark:text-amber-400 mb-3">
                                { (pendingFeatures.length + (isPlanPaymentRequired ? 1 : 0)) } Item Menunggu Pembayaran
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
                                                <p className="font-bold text-gray-800 dark:text-white text-sm">Pembayaran Paket {user?.plan_type}</p>
                                                <p className="text-xs text-amber-600 font-semibold">{formatCurrency(currentPlanDetails.price)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handlePayPlan(currentPlanDetails)}
                                            disabled={!!payingId}
                                            className="flex items-center gap-2 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                                        >
                                            {payingId === `plan-${user?.plan_type}` ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <HiOutlineCreditCard className="w-4 h-4" />
                                            )}
                                            Bayar Paket
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
                                            Bayar Sekarang
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
                                    {isPaid ? 'Upgrade Paket' : 'Ubah Paket'}
                                </h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isPaid ? 'Tingkatkan paket untuk fitur lebih lengkap' : 'Pilih paket yang sesuai untuk undangan Anda'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availablePlans.map((plan) => {
                                const displayPrice = isPaid ? (Number(plan.price) - currentPrice) : Number(plan.price);

                                return (
                                    <div key={plan.id}
                                        className="relative p-5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-gold-300 dark:hover:border-gold-700 transition-all bg-gray-50/50 dark:bg-gray-800/30 group">
                                        {plan.plan_type === 'premium' && (
                                            <span className="absolute top-3 right-3 text-[10px] bg-gold-500 text-white px-2 py-0.5 rounded-full font-bold">REKOMENDASI</span>
                                        )}
                                        <div className="mb-4">
                                            <h3 className="font-bold text-gray-800 dark:text-white text-lg uppercase">Paket {plan.plan_type}</h3>
                                            <p className="text-3xl font-display font-bold text-gold-600 mt-1">
                                                {formatCurrency(displayPrice)}
                                                {isPaid && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded ml-2 align-middle">SELISIH</span>}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">Limit Tamu: {plan.guest_limit}</p>
                                        </div>
                                        <button
                                            onClick={() => handlePayPlan(plan)}
                                            disabled={!!payingId}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gold-500 hover:border-gold-500 hover:text-white text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                                        >
                                            {payingId === `plan-${plan.plan_type}` ? (
                                                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                            ) : (
                                                <HiOutlineCreditCard className="w-4 h-4" />
                                            )}
                                            {isPaid ? `Upgrade ke ${plan.plan_type}` : `Pindah ke ${plan.plan_type}`}
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
                        <h2 className="font-bold text-gray-800 dark:text-white">Riwayat Transaksi</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Log semua transaksi pembayaran Anda</p>
                    </div>
                </div>

                {transactions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HiOutlineCreditCard className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada transaksi</p>
                        <p className="text-sm text-gray-400 mt-1">Transaksi akan muncul setelah Anda melakukan pembelian</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map(tx => {
                            const badge = getStatusBadge(tx.status);
                            return (
                                <div key={tx.id}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
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
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">{tx.item_description}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                                            <span className="font-mono">{tx.id}</span>
                                            <span>•</span>
                                            <span>{formatDate(tx.created_at)}</span>
                                            {tx.payment_method && (
                                                <>
                                                    <span>•</span>
                                                    <span className="capitalize">{tx.payment_method.replace(/_/g, ' ')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                                        <p className="font-bold text-gray-800 dark:text-white">{formatCurrency(Number(tx.amount))}</p>
                                        {tx.status === 'pending' && (
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleRefreshStatus(tx.id)}
                                                    disabled={refreshingId === tx.id}
                                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 transition-colors text-[10px] font-bold disabled:opacity-50"
                                                >
                                                    <HiOutlineRefresh className={`w-3 h-3 ${refreshingId === tx.id ? 'animate-spin' : ''}`} />
                                                    Cek Status
                                                </button>
                                                {tx.snap_token && (
                                                    <button
                                                        onClick={async () => {
                                                            setPayingId(tx.id);
                                                            const result = await openSnapPayment(tx.snap_token!);
                                                            if (result.status === 'success') { 
                                                                toast.success('Pembayaran berhasil!'); 
                                                                fetchAll(true); 
                                                            }
                                                            setPayingId(null);
                                                        }}
                                                        disabled={!!payingId}
                                                        className="text-[10px] text-gold-600 hover:text-gold-700 font-bold flex items-center gap-1 bg-gold-50 dark:bg-gold-900/20 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                                    >
                                                        {payingId === tx.id ? <div className="w-3 h-3 border border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /> : <HiOutlineCreditCard className="w-3 h-3" />}
                                                        Lanjutkan
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
