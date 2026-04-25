import { useEffect, useState } from 'react';
import { additionalFeatureApi } from '@/core/api/endpoints';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { MstAdditionalFeature } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineRefresh } from 'react-icons/hi';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';

const DATA_TYPES = [
    { value: 'empty', label: 'Tidak Perlu Input' },
    { value: 'text', label: 'Teks' },
    { value: 'link', label: 'Tautan (Link)' },
    { value: 'gambar', label: 'Gambar' },
    { value: 'boolean', label: 'Pilihan (Selesai/Belum selesai)' },
];

export function AdditionalFeaturePage() {
    const [features, setFeatures] = useState<MstAdditionalFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const initialForm: Partial<MstAdditionalFeature> = {
        feature_name: '',
        is_required_tenant_input: false,
        input_data_type: 'empty',
        output_data_type: 'empty',
        active: true,
    };
    const [form, setForm] = useState<Partial<MstAdditionalFeature>>(initialForm);

    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        setLoading(true);
        try {
            const res = await additionalFeatureApi.getMstFeatures();
            if (res.success) {
                setFeatures(res.data || []);
            }
        } catch (error) {
            toast.error('Failed to load additional features');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.feature_name) {
            toast.error('Nama fitur wajib diisi');
            return;
        }

        try {
            if (isEditing && form.id) {
                const res = await additionalFeatureApi.updateMstFeature(form);
                if (res.success) {
                    toast.success('Fitur berhasil diupdate');
                } else {
                    toast.error(res.message);
                }
            } else {
                const res = await additionalFeatureApi.createMstFeature(form);
                if (res.success) {
                    toast.success('Fitur berhasil ditambahkan');
                } else {
                    toast.error(res.message);
                }
            }
            setShowModal(false);
            fetchFeatures();
        } catch {
            toast.error('Gagal menyimpan fitur');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Yakin ingin menghapus fitur ini? Semua data terkait di tenant akan ikut terhapus!')) {
            try {
                const res = await additionalFeatureApi.deleteMstFeature(id);
                if (res.success) {
                    toast.success('Fitur berhasil dihapus');
                    fetchFeatures();
                } else {
                    toast.error(res.message);
                }
            } catch {
                toast.error('Gagal menghapus fitur');
            }
        }
    };

    const getTypeLabel = (type?: string) => {
        return DATA_TYPES.find(d => d.value === type)?.label || '-';
    };

    const exportColumns = [
        { header: 'Nama Fitur', key: 'feature_name' },
        { header: 'Perlu Input Tenant?', key: 'is_required_tenant_input', render: (f: MstAdditionalFeature) => f.is_required_tenant_input ? 'Ya' : 'Tidak' },
        { header: 'Tipe Input', key: 'input_data_type', render: (f: MstAdditionalFeature) => getTypeLabel(f.input_data_type) },
        { header: 'Tipe Output', key: 'output_data_type', render: (f: MstAdditionalFeature) => getTypeLabel(f.output_data_type) },
        { header: 'Status', key: 'active', render: (f: MstAdditionalFeature) => f.active ? 'Aktif' : 'Nonaktif' },
    ];

    const handleExportExcel = () => {
        exportToExcel(features, exportColumns, 'Data_Fitur_Tambahan', 'Daftar Fitur Tambahan');
    };

    const handleExportPdf = () => {
        exportToPdf(features, exportColumns, 'Data_Fitur_Tambahan', 'Laporan Data Fitur Tambahan');
    };

    const columns: Column<MstAdditionalFeature>[] = [
        {
            key: 'feature_name',
            header: 'Nama Fitur',
            render: (f) => <span className="font-medium text-gray-800 dark:text-white">{f.feature_name}</span>,
        },
        {
            key: 'tenant_input',
            header: 'Perlu Input Tenant?',
            render: (f) => (
                <span className={f.is_required_tenant_input ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500'}>
                    {f.is_required_tenant_input ? 'Ya' : 'Tidak'}
                </span>
            ),
        },
        {
            key: 'input_data_type',
            header: 'Tipe Input',
            render: (f) => <span className="text-sm">{getTypeLabel(f.input_data_type)}</span>,
        },
        {
            key: 'output_data_type',
            header: 'Tipe Output',
            render: (f) => <span className="text-sm">{getTypeLabel(f.output_data_type)}</span>,
        },
        {
            key: 'active',
            header: 'Status',
            render: (f) => (
                <span className={f.active ? 'badge-success' : 'badge-danger'}>
                    {f.active ? 'Aktif' : 'Nonaktif'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (f) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { setForm(f); setIsEditing(true); setShowModal(true); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                        title="Edit"
                    >
                        <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(f.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                        title="Delete"
                    >
                        <HiOutlineTrash className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (loading && features.length === 0) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Additional Features</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage custom features for tenants</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 border border-gray-200 dark:border-gray-700">
                        <button onClick={handleExportExcel} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            Excel
                        </button>
                        <button onClick={handleExportPdf} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            PDF
                        </button>
                    </div>
                    <button 
                        onClick={() => fetchFeatures()} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => { setForm(initialForm); setIsEditing(false); setShowModal(true); }} 
                        className="btn-primary text-sm flex items-center gap-2"
                    >
                        <HiOutlinePlus className="w-4 h-4" />
                        Tambah Fitur
                    </button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={features}
                loading={loading}
                emptyMessage="Belum ada fitur tambahan"
            />

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={isEditing ? "Edit Fitur Tambahan" : "Tambah Fitur Baru"}
                size="md"
                footer={
                    <>
                        <button onClick={() => setShowModal(false)} className="btn-ghost">Batal</button>
                        <button onClick={handleSave} className="btn-primary">Simpan</button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-field">Nama Fitur *</label>
                        <input 
                            type="text" 
                            value={form.feature_name || ''} 
                            onChange={(e) => setForm({ ...form, feature_name: e.target.value })} 
                            className="input-field" 
                        />
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <input 
                            type="checkbox" 
                            id="tenant_input"
                            checked={form.is_required_tenant_input} 
                            onChange={(e) => {
                                const isChecked = e.target.checked;
                                setForm({ 
                                    ...form, 
                                    is_required_tenant_input: isChecked,
                                    input_data_type: isChecked ? form.input_data_type : 'empty'
                                });
                            }} 
                            className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500" 
                        />
                        <label htmlFor="tenant_input" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Perlu input data dari tenant
                        </label>
                    </div>

                    <div className={`grid ${form.is_required_tenant_input ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                        {form.is_required_tenant_input && (
                            <div>
                                <label className="label-field">Tipe Data Input (Tenant)</label>
                                <select 
                                    value={form.input_data_type || 'empty'} 
                                    onChange={(e) => setForm({ ...form, input_data_type: e.target.value as any })} 
                                    className="select-field"
                                >
                                    {DATA_TYPES.map(d => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="label-field">Tipe Data Output (Admin)</label>
                            <select 
                                value={form.output_data_type || 'empty'} 
                                onChange={(e) => setForm({ ...form, output_data_type: e.target.value as any })} 
                                className="select-field"
                            >
                                {DATA_TYPES.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <input 
                            type="checkbox" 
                            id="is_active"
                            checked={form.active} 
                            onChange={(e) => setForm({ ...form, active: e.target.checked })} 
                            className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500" 
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Fitur Aktif
                        </label>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
