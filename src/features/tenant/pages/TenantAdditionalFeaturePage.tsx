import { useEffect, useState, useMemo } from 'react';
import { additionalFeatureApi, paymentApi } from '@/core/api/endpoints';
import { imageApi } from '@/core/api/imageApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { openSnapPayment } from '@/utils/midtrans';
import { PageLoader } from '@/shared/components/Loading';
import type { TenantActiveFeature } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlineRefresh,
    HiOutlineSave,
    HiOutlinePlus,
    HiOutlineInformationCircle,
    HiOutlineShoppingCart,
    HiOutlineTrash,
    HiOutlinePuzzle,
    HiOutlineCheckCircle,
    HiOutlineClock,
} from 'react-icons/hi';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { Lightbox } from '@/shared/components/Lightbox';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useAdminHeaderActionStore } from '@/shared/store/adminHeaderActionStore';
import { useBasePath } from '@/shared/hooks/useBasePath';

import { useTenantFeatureStore } from '../store/tenantFeatureStore';

export function TenantAdditionalFeaturePage() {
    const { features, availableFeatures, loading, fetchFeatures, updateLocalFeature, purchaseFeature } = useTenantFeatureStore();
    const [savingId, setSavingId] = useState<string | null>(null);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [purchaseConfirm, setPurchaseConfirm] = useState<{ id: string, name: string, price: number, description?: string } | null>(null);
    const [cancelConfirm, setCancelConfirm] = useState<TenantActiveFeature | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, featureId: string, type: 'input' } | null>(null);
    const [isDeletingImg, setIsDeletingImg] = useState<string | null>(null);
    const { tasks } = useBackgroundTaskStore();
    const setHeaderAction = useAdminHeaderActionStore(s => s.setAction);
    const isAdminLayout = useBasePath() === '/admin';

    useEffect(() => {
        fetchFeatures();
    }, []);

    // Pada layout /admin, tombol refresh dipindah ke gold header (sebelah "Buka
    // Undangan"). Di /private lama tetap inline.
    useEffect(() => {
        if (!isAdminLayout) return;
        setHeaderAction(
            <button
                onClick={() => fetchFeatures(true)}
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

    // Ringkasan: total fitur, yang aktif, yang menunggu pembayaran.
    const stats = useMemo(() => {
        return features.reduce(
            (acc, f) => {
                acc.total += 1;
                if (f.active) acc.active += 1;
                if (f.payment_status === 'Menunggu pembayaran') acc.pending += 1;
                return acc;
            },
            { total: 0, active: 0, pending: 0 }
        );
    }, [features]);

    const handleSaveInput = (featureId: string, value: string) => {
        updateLocalFeature(featureId, value);
    };

    const handleSaveSingleFeature = async (feature: TenantActiveFeature) => {
        setSavingId(feature.additional_feature_id);
        try {
            // Validate link
            if (feature.input_data_type === 'link' && feature.input_tenant_data && !isValidUrl(feature.input_tenant_data)) {
                toast.error(`Format link tidak valid`);
                return;
            }

            await additionalFeatureApi.updateTenantFeature({
                additional_feature_id: feature.additional_feature_id,
                input_tenant_data: feature.input_tenant_data
            });

            toast.success('Pengaturan berhasil disimpan');
        } catch {
            toast.error('Gagal menyimpan pengaturan');
        } finally {
            setSavingId(null);
        }
    };

    const handleCancelPurchase = async () => {
        if (!cancelConfirm) return;
        setIsCancelling(true);
        try {
            await additionalFeatureApi.deleteTenantFeature(cancelConfirm.tenant_id, cancelConfirm.additional_feature_id);
            toast.success('Pemesanan fitur berhasil dibatalkan');
            setCancelConfirm(null);
            fetchFeatures(true);
        } catch (error) {
            toast.error('Gagal membatalkan pemesanan');
        } finally {
            setIsCancelling(false);
        }
    };

    const isUploading = (featureId: string) => {
        return tasks.some(t => t.status === 'running' && t.id.startsWith(`upload-feature-${featureId}`));
    };

    const isValidUrl = (urlString: string) => {
        try {
            return Boolean(new URL(urlString));
        } catch (e) {
            return false;
        }
    };

    const parseImageUrl = (data: string | null | undefined) => {
        if (!data) return '';
        const parts = data.split('|');
        const url = parts.length > 1 ? parts[1] : parts[0];
        
        // If it's just an ID (doesn't start with http), it's probably a Drive ID
        if (url && !url.startsWith('http')) {
            return `${import.meta.env.VITE_API_URL}?action=imageProxy&id=${url}`;
        }
        return url || '';
    };

    const renderInput = (feature: TenantActiveFeature) => {
        if (!feature.is_required_tenant_input) {
            return <p className="text-sm text-gray-500 italic">Tidak perlu input</p>;
        }

        switch (feature.input_data_type) {
            case 'gambar':
                return (
                    <div className="w-full">
                        {feature.input_tenant_data ? (
                            <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                                <ProxyImage 
                                    src={parseImageUrl(feature.input_tenant_data)} 
                                    alt={feature.feature_name}
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => setLightboxUrl(parseImageUrl(feature.input_tenant_data))}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const [id] = feature.input_tenant_data!.split('|');
                                        setDeleteConfirm({ id, featureId: feature.additional_feature_id, type: 'input' });
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                >
                                    <HiOutlineTrash className="w-4 h-4" />
                                </button>
                                {isDeletingImg === feature.additional_feature_id && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-[1px] rounded-lg">
                                        <div className="w-6 h-6 border-[3px] border-white/20 border-t-red-500 rounded-full animate-spin mb-1" />
                                        <span className="text-[10px] text-white font-medium">Menghapus...</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full sm:max-w-[200px]">
                                <ImageUpload
                                    imageType={`feature-${feature.additional_feature_id}`}
                                    title="Upload"
                                    onUploadSuccess={async (img) => {
                                        const newVal = `${img.id}|${img.cdn_url || img.drive_url}`;
                                        handleSaveInput(feature.additional_feature_id, newVal);
                                        await additionalFeatureApi.updateTenantFeature({
                                            additional_feature_id: feature.additional_feature_id,
                                            input_tenant_data: newVal
                                        }, { skipLoader: true } as any);
                                    }}
                                    onDeleteSuccess={() => {}}
                                    aspectRatio="auto"
                                    className="!p-3 !text-sm min-h-[96px]"
                                />
                            </div>
                        )}
                    </div>
                );
            case 'link':
                return (
                    <div className="w-full">
                        <input
                            type="url"
                            value={feature.input_tenant_data || ''}
                            onChange={(e) => handleSaveInput(feature.additional_feature_id, e.target.value)}
                            placeholder="https://..."
                            className={`input-field text-sm flex-1 w-full max-w-sm ${feature.input_tenant_data && !isValidUrl(feature.input_tenant_data) ? 'border-red-500' : ''}`}
                        />
                    </div>
                );
            case 'text':
                return (
                    <div className="w-full">
                        <textarea
                            value={feature.input_tenant_data || ''}
                            onChange={(e) => handleSaveInput(feature.additional_feature_id, e.target.value)}
                            placeholder="Teks..."
                            className="input-field text-sm min-h-[64px] flex-1 w-full max-w-sm"
                            rows={2}
                        />
                    </div>
                );
            case 'boolean':
                return (
                    <div className="flex items-center gap-3 w-full">
                        <input
                            type="checkbox"
                            checked={feature.input_tenant_data === 'true' || feature.input_tenant_data === 'TRUE'}
                            onChange={(e) => handleSaveInput(feature.additional_feature_id, e.target.checked ? 'TRUE' : 'FALSE')}
                            className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {feature.input_tenant_data === 'true' || feature.input_tenant_data === 'TRUE' ? 'Selesai' : 'Belum Selesai'}
                        </span>
                    </div>
                );
            default:
                return <p className="text-sm text-gray-500 italic">Tidak perlu input</p>;
        }
    };

    const renderOutput = (feature: TenantActiveFeature) => {
        if (!feature.output_data) return <span className="text-sm text-gray-500 italic">Belum ada hasil dari admin</span>;

        switch (feature.output_data_type) {
            case 'gambar':
                return (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                        <ProxyImage 
                            src={parseImageUrl(feature.output_data)} 
                            alt={feature.feature_name}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setLightboxUrl(parseImageUrl(feature.output_data))}
                        />
                    </div>
                );
            case 'link':
                return (
                    <a href={feature.output_data} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline break-all">
                        {feature.output_data}
                    </a>
                );
            case 'boolean':
                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${feature.output_data === 'true' || feature.output_data === 'TRUE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {feature.output_data === 'true' || feature.output_data === 'TRUE' ? 'Aktif' : 'Nonaktif'}
                    </span>
                );
            case 'text':
                return <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{feature.output_data}</p>;
            default:
                return null;
        }
    };

    if (loading && features.length === 0) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ===== Header: action row + stat strip (samakan dgn Daftar Tamu) ===== */}
            <div className="space-y-4">
                {/* Action row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                            Fitur Tambahan
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Fitur tambahan kustom untuk undangan Anda</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Layout /admin: refresh dipindah ke gold header. Inline hanya untuk /private. */}
                        {!isAdminLayout && (
                            <IconButton
                                onClick={() => fetchFeatures(true)}
                                title="Refresh Data"
                                icon={<HiOutlineRefresh className="w-4 h-4" />}
                                spinning={loading}
                            />
                        )}
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="text-sm shrink-0"
                            icon={<HiOutlinePlus className="w-4 h-4" />}
                        >
                            <span className="hidden sm:inline">Tambah Fitur</span>
                            <span className="sm:hidden">Tambah</span>
                        </Button>
                    </div>
                </div>

                {/* Stat strip — hanya tampil bila sudah ada fitur */}
                {features.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <FeatureStatPill
                            icon={<HiOutlinePuzzle className="w-4 h-4" />}
                            value={stats.total}
                            label="Total Fitur"
                            tone="gold"
                        />
                        <FeatureStatPill
                            icon={<HiOutlineCheckCircle className="w-4 h-4" />}
                            value={stats.active}
                            label="Aktif"
                            tone="emerald"
                        />
                        <FeatureStatPill
                            icon={<HiOutlineClock className="w-4 h-4" />}
                            value={stats.pending}
                            label="Menunggu Bayar"
                            tone="amber"
                        />
                    </div>
                )}
            </div>

            {features.length === 0 ? (
                <div className="card p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">🧩</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Belum Ada Fitur Tambahan</h3>
                    <p className="text-gray-500 max-w-md">Saat ini belum ada fitur tambahan yang diaktifkan untuk akun Anda. Silakan hubungi admin jika Anda membutuhkan fitur khusus.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {features.map((feature) => (
                        <div key={feature.additional_feature_id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                            <div className="p-6 flex flex-col lg:flex-row gap-8">
                                {/* Left Side: Feature Info */}
                                <div className="lg:w-1/3 shrink-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{feature.feature_name}</h3>
                                        </div>
                                        {feature.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{feature.description}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${feature.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                            {feature.active ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${feature.payment_status === 'Sudah dibayar' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {feature.payment_status}
                                        </span>
                                        {feature.payment_status === 'Menunggu pembayaran' && (
                                            <button 
                                                onClick={() => setCancelConfirm(feature)}
                                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
                                                title="Batalkan Pesanan"
                                            >
                                                <HiOutlineTrash className="w-3 h-3" />
                                                Batalkan
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Input & Output Panels */}
                                <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Input Panel */}
                                    <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <span className="text-xs font-bold">1</span>
                                            </div>
                                            <p className="text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 font-bold">Data Anda</p>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            {renderInput(feature)}
                                            
                                            {feature.is_required_tenant_input && ['link', 'text', 'boolean'].includes(feature.input_data_type || '') && (
                                                <div className="mt-6 flex justify-end">
                                                    <button
                                                        onClick={() => handleSaveSingleFeature(feature)}
                                                        disabled={savingId === feature.additional_feature_id}
                                                        className="flex items-center gap-2 py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                                                    >
                                                        {savingId === feature.additional_feature_id ? (
                                                            <HiOutlineRefresh className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <HiOutlineSave className="w-3.5 h-3.5" />
                                                        )}
                                                        Simpan
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Output Panel */}
                                    <div className="bg-gold-50/50 dark:bg-gold-900/10 rounded-xl p-5 border border-gold-100 dark:border-gold-900/30 flex flex-col">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-6 h-6 rounded bg-gold-100 dark:bg-gold-900/50 flex items-center justify-center text-gold-600 dark:text-gold-400">
                                                <span className="text-xs font-bold">2</span>
                                            </div>
                                            <p className="text-xs uppercase tracking-wider text-gold-700 dark:text-gold-400 font-bold">Hasil Admin</p>
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            {renderOutput(feature)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {lightboxUrl && (
                <Lightbox
                    images={[{ url: lightboxUrl }]}
                    initialIndex={0}
                    onClose={() => setLightboxUrl(null)}
                />
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Beli Fitur Tambahan"
                size="lg"
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3">
                        <HiOutlineInformationCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-semibold mb-1">Informasi Pembelian</p>
                            <p>Silakan pilih fitur tambahan yang ingin Anda aktifkan. Setelah melakukan pemesanan, fitur akan muncul di halaman ini dengan status <strong>"Menunggu pembayaran"</strong>. Silakan hubungi admin untuk konfirmasi pembayaran agar fitur dapat diaktifkan.</p>
                        </div>
                    </div>

                    {availableFeatures.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">✨</span>
                            </div>
                            <h3 className="text-lg font-semibold">Semua Fitur Sudah Dimiliki</h3>
                            <p className="text-sm text-gray-500 mt-2">Anda telah memiliki semua fitur tambahan yang tersedia saat ini.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {availableFeatures.map(feature => {
                                const isFree = (feature.price || 0) <= 0;
                                return (
                                    <div
                                        key={feature.additional_feature_id}
                                        className="group relative flex flex-col rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:border-gold-400 hover:shadow-md transition-all"
                                    >
                                        {/* Header: icon badge + nama + harga (pill terpisah, tidak wrap ke judul) */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <HiOutlinePuzzle className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-[15px] text-gray-900 dark:text-white leading-snug group-hover:text-gold-600 transition-colors">
                                                    {feature.feature_name}
                                                </h4>
                                                <span
                                                    className={`inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        isFree
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                            : 'bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400'
                                                    }`}
                                                >
                                                    {isFree ? 'Gratis' : `Rp ${(feature.price || 0).toLocaleString('id-ID')}`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Deskripsi */}
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3 flex-1">
                                            {feature.description || 'Tidak ada deskripsi'}
                                        </p>

                                        {/* CTA */}
                                        <button
                                            onClick={() => {
                                                setPurchaseConfirm({
                                                    id: feature.additional_feature_id,
                                                    name: feature.feature_name || '',
                                                    price: feature.price || 0,
                                                    description: feature.description
                                                });
                                            }}
                                            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 group-hover:bg-gold-500 group-hover:text-white transition-all active:scale-95"
                                        >
                                            <HiOutlineShoppingCart className="w-4 h-4" />
                                            Beli Fitur
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>
            <Modal
                isOpen={!!purchaseConfirm}
                onClose={() => setPurchaseConfirm(null)}
                title="Konfirmasi Pembelian"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                        <div className="flex gap-3 text-blue-800 dark:text-blue-400">
                            <HiOutlineShoppingCart className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm w-full">
                                <p className="font-semibold text-base mb-1">Konfirmasi {purchaseConfirm?.name}</p>
                                <p>Anda akan menambahkan fitur ini ke dalam daftar fitur aktif Anda.</p>
                                <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-blue-100 dark:border-blue-800/50 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Total Biaya:</span>
                                        <span className="text-xl font-bold text-gold-600">
                                            {purchaseConfirm?.price === 0 ? 'Gratis' : `Rp ${(purchaseConfirm?.price || 0).toLocaleString('id-ID')}`}
                                        </span>
                                    </div>
                                </div>
                                {purchaseConfirm?.price && purchaseConfirm.price > 0 ? (
                                    <p className="mt-4 text-xs text-blue-700 dark:text-blue-300 italic">* Anda akan diarahkan ke pembayaran Midtrans setelah mengklik Konfirmasi.</p>
                                ) : (
                                    <p className="mt-4 text-xs text-blue-700 dark:text-blue-300">Fitur ini gratis dan akan langsung aktif setelah Anda melakukan konfirmasi.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <Button variant="ghost" onClick={() => setPurchaseConfirm(null)}>Batal</Button>
                        <Button
                            onClick={async () => {
                                if (!purchaseConfirm) return;
                                
                                // Step 1: Daftarkan fitur ke tenant (Backend)
                                const success = await purchaseFeature(purchaseConfirm.id);
                                if (!success) return;

                                // Step 2: Jika berbayar, langsung buka Midtrans
                                if (purchaseConfirm.price > 0) {
                                    try {
                                        const payRes = await paymentApi.createTransaction({
                                            item_type: 'feature',
                                            item_id: purchaseConfirm.id,
                                            item_name: purchaseConfirm.name,
                                            amount: purchaseConfirm.price,
                                        });

                                        if (payRes.success && payRes.data?.snap_token) {
                                            const result = await openSnapPayment(payRes.data.snap_token);
                                            if (result.status === 'success') {
                                                toast.success('Pembayaran berhasil!');
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Payment error:', err);
                                        toast.error('Gagal membuka pembayaran, silakan cek menu Pembayaran');
                                    }
                                }

                                setPurchaseConfirm(null);
                                setShowAddModal(false);
                                
                                // Step 3: Refresh data dengan delay agar GAS selesai memproses
                                setTimeout(() => fetchFeatures(), 2000);
                            }}
                        >
                            Konfirmasi & Beli
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!cancelConfirm}
                onClose={() => setCancelConfirm(null)}
                onConfirm={handleCancelPurchase}
                title="Batalkan Pemesanan"
                variant="danger"
                warningTitle={`Batalkan Pesanan ${cancelConfirm?.feature_name}?`}
                message="Apakah Anda yakin ingin membatalkan pemesanan fitur ini? Tindakan ini akan menghapus fitur dari daftar aktif Anda."
                confirmLabel="Ya, Batalkan Pesanan"
                cancelLabel="Tutup"
                loading={isCancelling}
            />

            <ConfirmDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={async () => {
                    if (!deleteConfirm) return;
                    const { id, featureId } = deleteConfirm;
                    setDeleteConfirm(null);
                    setIsDeletingImg(featureId);

                    try {
                        await additionalFeatureApi.updateTenantFeature({
                            additional_feature_id: featureId,
                            input_tenant_data: ''
                        }, { skipLoader: true } as any);

                        if (id) {
                            await imageApi.deleteImage(id).catch(() => {});
                        }

                        handleSaveInput(featureId, '');
                        toast.success('Gambar berhasil dihapus!');
                    } catch (error) {
                        toast.error('Gagal menghapus gambar');
                    } finally {
                        setIsDeletingImg(null);
                    }
                }}
                title="Hapus Gambar"
                variant="danger"
                warningTitle="Konfirmasi Hapus"
                message="Apakah Anda yakin ingin menghapus gambar ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Ya, Hapus"
                loading={!!isDeletingImg}
            />
        </div>
    );
}

// Kartu statistik ringkas untuk header — samakan gaya dengan StatPill di Daftar Tamu.
const FEATURE_STAT_TONE: Record<string, { icon: string; value: string }> = {
    gold: {
        icon: 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
        value: 'text-gray-900 dark:text-white',
    },
    emerald: {
        icon: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
        value: 'text-emerald-600 dark:text-emerald-400',
    },
    amber: {
        icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        value: 'text-amber-600 dark:text-amber-400',
    },
};

function FeatureStatPill({ icon, value, label, tone }: {
    icon: React.ReactNode;
    value: number;
    label: string;
    tone: keyof typeof FEATURE_STAT_TONE;
}) {
    const c = FEATURE_STAT_TONE[tone] || FEATURE_STAT_TONE.gold;
    return (
        <div className="card !p-3 flex items-center gap-2.5 min-w-0">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className={`text-xl font-black leading-none ${c.value}`}>{value}</p>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 truncate mt-1">{label}</p>
            </div>
        </div>
    );
}
