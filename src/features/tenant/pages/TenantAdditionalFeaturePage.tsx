import { useEffect, useState } from 'react';
import { additionalFeatureApi } from '@/core/api/endpoints';
import { imageApi } from '@/core/api/imageApi';
import { PageLoader } from '@/shared/components/Loading';
import type { TenantActiveFeature } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlineRefresh, HiOutlineSave } from 'react-icons/hi';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { Lightbox } from '@/shared/components/Lightbox';

export function TenantAdditionalFeaturePage() {
    const [features, setFeatures] = useState<TenantActiveFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const { tasks } = useBackgroundTaskStore();

    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        setLoading(true);
        try {
            const res = await additionalFeatureApi.getTenantFeatures();
            if (res.success) {
                // For tenant, we only show features that are active
                const activeFeatures = res.data?.filter(f => f.active && f.mst_active) || [];
                setFeatures(activeFeatures);
            }
        } catch (error) {
            toast.error('Failed to load additional features');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInput = (featureId: string, value: string) => {
        setFeatures(prev => prev.map(f => f.additional_feature_id === featureId ? { ...f, input_tenant_data: value } : f));
    };

    const handleSaveAll = async () => {
        setSavingId('all');
        try {
            // Validate links
            const invalidLink = features.find(f => f.input_data_type === 'link' && f.input_tenant_data && !isValidUrl(f.input_tenant_data));
            if (invalidLink) {
                toast.error(`Format link pada fitur "${invalidLink.feature_name}" tidak valid`);
                return;
            }

            if (features.length > 0) {
                await Promise.all(features.map(f => 
                    additionalFeatureApi.updateTenantFeature({
                        additional_feature_id: f.additional_feature_id,
                        input_tenant_data: f.input_tenant_data
                    })
                ));

                if (imagesToDelete.length > 0) {
                    await Promise.all(imagesToDelete.map(id => imageApi.deleteImage(id).catch(() => {})));
                }
            }
            toast.success('Pengaturan fitur berhasil disimpan');
            setImagesToDelete([]);
        } catch {
            toast.error('Gagal menyimpan pengaturan fitur');
        } finally {
            setSavingId(null);
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

    const renderInput = (feature: TenantActiveFeature) => {
        if (!feature.is_required_tenant_input) {
            return <p className="text-sm text-gray-500 italic">Tidak perlu input</p>;
        }

        switch (feature.input_data_type) {
            case 'gambar':
                return (
                    <div className="w-full max-w-sm">
                        {feature.input_tenant_data ? (
                            <div className="relative group w-32 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                <ProxyImage 
                                    src={feature.input_tenant_data.includes('|') ? feature.input_tenant_data.split('|')[1] : feature.input_tenant_data} 
                                    alt={feature.feature_name}
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => setLightboxUrl(feature.input_tenant_data?.includes('|') ? feature.input_tenant_data.split('|')[1] : feature.input_tenant_data)}
                                />
                                <button
                                    onClick={() => {
                                        const [id] = feature.input_tenant_data!.split('|');
                                        if (id && feature.input_tenant_data?.includes('|')) {
                                            setImagesToDelete(prev => [...prev, id]);
                                        }
                                        handleSaveInput(feature.additional_feature_id, '');
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                >
                                    Hapus
                                </button>
                            </div>
                        ) : (
                            <ImageUpload
                                imageType={`feature-${feature.additional_feature_id}`}
                                title="Upload Gambar"
                                onUploadSuccess={(img) => handleSaveInput(feature.additional_feature_id, `${img.id}|${img.cdn_url || img.drive_url}`)}
                                onDeleteSuccess={() => {}}
                                aspectRatio="auto"
                            />
                        )}
                    </div>
                );
            case 'link':
                return (
                    <div className="flex gap-2 w-full max-w-md">
                        <input
                            type="url"
                            value={feature.input_tenant_data || ''}
                            onChange={(e) => handleSaveInput(feature.additional_feature_id, e.target.value)}
                            placeholder="https://..."
                            className={`input-field flex-1 ${feature.input_tenant_data && !isValidUrl(feature.input_tenant_data) ? 'border-red-500' : ''}`}
                        />
                    </div>
                );
            case 'text':
                return (
                    <div className="flex gap-2 w-full max-w-md">
                        <textarea
                            value={feature.input_tenant_data || ''}
                            onChange={(e) => handleSaveInput(feature.additional_feature_id, e.target.value)}
                            placeholder="Teks..."
                            className="input-field flex-1 min-h-[42px]"
                            rows={1}
                        />
                    </div>
                );
            case 'boolean':
                return (
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={feature.input_tenant_data === 'true' || feature.input_tenant_data === 'TRUE'}
                            onChange={(e) => handleSaveInput(feature.additional_feature_id, e.target.checked ? 'TRUE' : 'FALSE')}
                            className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500"
                        />
                        <span className="text-sm">{feature.input_tenant_data === 'true' || feature.input_tenant_data === 'TRUE' ? 'Ya' : 'Tidak'}</span>
                    </div>
                );
            default:
                return <p className="text-sm text-gray-500 italic">Tidak perlu input</p>;
        }
    };

    const renderOutput = (feature: TenantActiveFeature) => {
        if (!feature.output_data) return <span className="text-gray-400 italic text-sm">Belum ada hasil</span>;

        switch (feature.output_data_type) {
            case 'gambar':
                return (
                    <div className="w-32 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <ProxyImage 
                            src={feature.output_data.includes('|') ? feature.output_data.split('|')[1] : feature.output_data} 
                            alt={feature.feature_name}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setLightboxUrl(feature.output_data?.includes('|') ? feature.output_data.split('|')[1] : feature.output_data)}
                        />
                    </div>
                );
            case 'link':
                return (
                    <a href={feature.output_data} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all text-sm">
                        {feature.output_data}
                    </a>
                );
            case 'boolean':
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${feature.output_data === 'true' || feature.output_data === 'TRUE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Additional Features</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fitur tambahan kustom untuk undangan Anda</p>
                </div>
                <button 
                    onClick={() => fetchFeatures()} 
                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                    title="Refresh Data"
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
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
                        <div key={feature.id} className="card p-6 border border-gray-100 dark:border-gray-800">
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{feature.feature_name}</h3>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">
                                <div className="space-y-2 lg:pr-8">
                                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Input Anda</p>
                                    {renderInput(feature)}
                                    {isUploading(feature.additional_feature_id) && (
                                        <p className="text-xs text-blue-500 animate-pulse mt-2">Sedang mengunggah gambar...</p>
                                    )}
                                </div>
                                <div className="space-y-2 pt-6 lg:pt-0 lg:pl-8">
                                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Hasil / Keterangan</p>
                                    {renderOutput(feature)}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end mt-8">
                        <button
                            onClick={handleSaveAll}
                            disabled={savingId === 'all'}
                            className="btn-primary px-8 py-3 text-sm flex items-center gap-2"
                        >
                            {savingId === 'all' ? (
                                <HiOutlineRefresh className="w-5 h-5 animate-spin" />
                            ) : (
                                <HiOutlineSave className="w-5 h-5" />
                            )}
                            Simpan Pengaturan
                        </button>
                    </div>
                </div>
            )}

            {lightboxUrl && (
                <Lightbox
                    images={[{ url: lightboxUrl }]}
                    initialIndex={0}
                    onClose={() => setLightboxUrl(null)}
                />
            )}
        </div>
    );
}
