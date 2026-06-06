import { useEffect, useState, useCallback } from 'react';
import { couponApi, paymentApi } from '@/core/api/endpoints';
import type { Coupon, CouponDiscountType } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineRefresh,
    HiOutlineTicket, HiOutlineX, HiOutlineCheck, HiOutlineTag,
    HiOutlineCalendar, HiOutlineSwitchHorizontal,
} from 'react-icons/hi';
import { Modal } from '@/shared/components/Modal';
import { IconButton } from '@/shared/components/IconButton';

const EMPTY_FORM: Partial<Coupon> = {
    begin_date: '',
    end_date: '',
    plan_id: '',
    coupon_code: '',
    discount_type: 'percent',
    percent_discount: '',
    nominal_discount: '',
    catatan: '',
    active: true,
};

function CouponModal({
    mode,
    data,
    planTypes,
    onClose,
    onSaved,
}: {
    mode: 'add' | 'edit';
    data: Partial<Coupon> | null;
    planTypes: any[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<Partial<Coupon>>(data || EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const set = (key: keyof Coupon, val: any) => setForm(f => ({ ...f, [key]: val }));

    const handleDiscountTypeChange = (type: CouponDiscountType) => {
        setForm(f => ({ ...f, discount_type: type, percent_discount: '', nominal_discount: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.begin_date || !form.coupon_code || !form.discount_type) {
            toast.error('Harap isi semua field wajib');
            return;
        }
        if (form.discount_type === 'percent' && !form.percent_discount) {
            toast.error('Persen diskon harus diisi');
            return;
        }
        if (form.discount_type === 'nominal' && !form.nominal_discount) {
            toast.error('Nominal diskon harus diisi');
            return;
        }
        setSaving(true);
        try {
            if (mode === 'add') {
                const res = await couponApi.createCoupon(form);
                if (!res.success) { toast.error(res.message); return; }
                toast.success('Kupon berhasil dibuat!');
            } else {
                const res = await couponApi.updateCoupon({ ...form, id: form.id! });
                if (!res.success) { toast.error(res.message); return; }
                toast.success('Kupon berhasil diupdate!');
            }
            onSaved();
            onClose();
        } catch {
            toast.error('Terjadi kesalahan');
        } finally {
            setSaving(false);
        }
    };

    const isPercent = form.discount_type === 'percent';
    const isActiveFlag = form.active === true || form.active === 'TRUE' || form.active === 'true';

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={mode === 'add' ? 'Buat Kode Promosi' : 'Edit Kode Promosi'}
            size="md"
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="coupon-form"
                        disabled={saving}
                        className="px-6 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-gold-500/10 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <HiOutlineCheck className="w-4 h-4" />}
                        {mode === 'add' ? 'Buat Kupon' : 'Simpan Perubahan'}
                    </button>
                </>
            }
        >
            <form id="coupon-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Kode Kupon */}
                <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Kode Kupon <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.coupon_code || ''}
                        onChange={e => set('coupon_code', e.target.value.toUpperCase())}
                        disabled={mode === 'edit'}
                        placeholder="Contoh: PROMO50"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-gold-500 focus:border-transparent outline-none disabled:opacity-50"
                    />
                </div>

                {/* Tipe Diskon */}
                <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Tipe Diskon <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                        {(['percent', 'nominal'] as CouponDiscountType[]).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => handleDiscountTypeChange(type)}
                                className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${form.discount_type === type
                                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400'
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gold-300'
                                }`}
                            >
                                {type === 'percent' ? '% Persentase' : 'Rp Nominal'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Nilai Diskon */}
                {isPercent ? (
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Persen Diskon <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number" min={1} max={100} step={0.01}
                            value={form.percent_discount || ''}
                            onChange={e => set('percent_discount', e.target.value)}
                            placeholder="Contoh: 20"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                        />
                        <p className="mt-1.5 text-[11px] text-gray-400">Isi angka 1–100. Satuan persen (%).</p>
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Nominal Diskon <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number" min={1}
                            value={form.nominal_discount || ''}
                            onChange={e => set('nominal_discount', e.target.value)}
                            placeholder="Contoh: 50000"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                        />
                        <p className="mt-1.5 text-[11px] text-gray-400">Isi nominal potongan harga dalam Rupiah.</p>
                    </div>
                )}

                {/* Periode Berlaku */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Tanggal Mulai <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.begin_date || ''}
                            onChange={e => set('begin_date', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                            Tanggal Akhir
                        </label>
                        <input
                            type="date"
                            value={form.end_date || ''}
                            onChange={e => set('end_date', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                        />
                    </div>
                </div>
                <p className="-mt-3 text-[11px] text-gray-400">Kosongkan tanggal akhir jika kupon berlaku tanpa batas waktu.</p>

                {/* Berlaku untuk Paket */}
                <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Berlaku untuk Paket
                    </label>
                    <select
                        value={form.plan_id || ''}
                        onChange={e => set('plan_id', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                    >
                        <option value="">Semua Paket</option>
                        {planTypes.map(p => (
                            <option key={p.plan_type} value={p.plan_type}>{p.plan_type}</option>
                        ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-gray-400">Biarkan "Semua Paket" jika kupon berlaku untuk semua jenis paket.</p>
                </div>

                {/* Catatan */}
                <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Catatan
                    </label>
                    <textarea
                        value={form.catatan || ''}
                        onChange={e => set('catatan', e.target.value)}
                        rows={2}
                        placeholder="Keterangan internal untuk admin..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-gold-500 outline-none resize-none"
                    />
                </div>

                {/* Status Aktif — edit mode only */}
                {mode === 'edit' && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-white text-sm">Status Aktif</p>
                            <p className="text-xs text-gray-400 mt-0.5">Nonaktifkan untuk menangguhkan kupon ini</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={isActiveFlag}
                                onChange={e => set('active', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                        </label>
                    </div>
                )}
            </form>
        </Modal>
    );
}

export function CouponPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [planTypes, setPlanTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data: Partial<Coupon> | null } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, pRes] = await Promise.all([couponApi.getCoupons(), paymentApi.getPlanTypes()]);
            if (cRes.success) setCoupons(cRes.data || []);
            if (pRes.success) setPlanTypes(pRes.data || []);
        } catch {
            toast.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleDelete = async (id: string) => {
        if (!confirm('Yakin hapus kupon ini?')) return;
        setDeletingId(id);
        try {
            const res = await couponApi.deleteCoupon(id);
            if (res.success) {
                toast.success('Kupon dihapus');
                setCoupons(prev => prev.filter(c => c.id !== id));
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error('Gagal menghapus');
        } finally {
            setDeletingId(null);
        }
    };

    const formatCurrency = (v: number | string) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(v));

    const formatDate = (d: string) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return d; }
    };

    const isActive = (c: Coupon) => c.active === true || c.active === 'TRUE' || c.active === 'true';
    const isExpired = (c: Coupon) => !!c.end_date && new Date(c.end_date) < new Date();

    const filtered = coupons.filter(c =>
        c.coupon_code.toLowerCase().includes(search.toLowerCase()) ||
        (c.catatan || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-xs">
                    <HiOutlineTag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari kode kupon..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-gold-500 outline-none"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAll}
                        className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gold-400 text-gray-400 hover:text-gold-500 transition-all"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setModal({ mode: 'add', data: { ...EMPTY_FORM } })}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg"
                    >
                        <HiOutlinePlus className="w-4 h-4" />
                        Buat Kupon
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Kupon', value: coupons.length, color: 'from-gold-400 to-gold-600' },
                    { label: 'Aktif', value: coupons.filter(c => isActive(c) && !isExpired(c)).length, color: 'from-emerald-400 to-green-500' },
                    { label: 'Non-Aktif', value: coupons.filter(c => !isActive(c)).length, color: 'from-gray-400 to-gray-500' },
                    { label: 'Kadaluarsa', value: coupons.filter(c => isExpired(c)).length, color: 'from-red-400 to-rose-500' },
                ].map(card => (
                    <div key={card.label} className="card p-4">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
                        <p className={`text-3xl font-display font-bold bg-gradient-to-br ${card.color} bg-clip-text text-transparent mt-1`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-gold-200 border-t-gold-500 rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <HiOutlineTicket className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Belum ada kupon</p>
                        <p className="text-sm text-gray-400 mt-1">Buat kupon promosi pertama Anda</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    {['Kode Kupon', 'Diskon', 'Berlaku Untuk', 'Periode', 'Status', 'Aksi'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {filtered.map(c => {
                                    const active = isActive(c);
                                    const expired = isExpired(c);
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <span className="font-mono font-bold text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-900/20 px-2 py-0.5 rounded-lg text-xs">
                                                    {c.coupon_code}
                                                </span>
                                                {c.catatan && (
                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px]">{c.catatan}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.discount_type === 'percent'
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                    {c.discount_type === 'percent'
                                                        ? `${c.percent_discount}%`
                                                        : formatCurrency(c.nominal_discount)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium capitalize">
                                                    {c.plan_id || 'Semua Paket'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <HiOutlineCalendar className="w-3.5 h-3.5" />
                                                    <span>{formatDate(c.begin_date)}</span>
                                                    <HiOutlineSwitchHorizontal className="w-3 h-3" />
                                                    <span>{c.end_date ? formatDate(c.end_date) : '∞'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {expired ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Kadaluarsa</span>
                                                ) : active ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Aktif</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">Non-Aktif</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <IconButton
                                                        shape="ghost"
                                                        color="gold"
                                                        size="sm"
                                                        onClick={() => setModal({ mode: 'edit', data: c })}
                                                        title="Edit"
                                                        icon={<HiOutlinePencil className="w-4 h-4" />}
                                                    />
                                                    <button
                                                        onClick={() => handleDelete(c.id)}
                                                        disabled={deletingId === c.id}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                        title="Hapus"
                                                    >
                                                        {deletingId === c.id
                                                            ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                                                            : <HiOutlineTrash className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal rendered via portal */}
            {modal && (
                <CouponModal
                    mode={modal.mode}
                    data={modal.data}
                    planTypes={planTypes}
                    onClose={() => setModal(null)}
                    onSaved={fetchAll}
                />
            )}
        </div>
    );
}
