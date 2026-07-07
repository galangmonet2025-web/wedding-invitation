import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
    HiOutlineArrowLeft,
    HiOutlineSave,
    HiOutlineChevronDown,
} from 'react-icons/hi';
import { PageLoader } from '@/shared/components/Loading';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { quotesApi } from '@/core/api/endpoints';
import { QuotesVariant, RELIGION_OPTIONS } from '@/types';
import { useMasterQuotesStore } from '../store/masterQuotesStore';
import { useTenantStore } from '../store/tenantStore';
import { useBasePath } from '@/shared/hooks/useBasePath';

const isTrue = (val: any) => val === true || val === 'TRUE' || val === 'true';

const QUOTE_INDEXES = [1, 2, 3, 4, 5, 6, 7] as const;

interface FormState {
    religion_enum: string;
    title: string;
    active: boolean;
    flag_default_quotes: boolean;
    tenant_id: string;
    quotes: Record<string, string>; // quote_1..7
    quoteBys: Record<string, string>; // quote_by_1..7
}

const emptyForm: FormState = {
    religion_enum: '',
    title: '',
    active: true,
    flag_default_quotes: false,
    tenant_id: '',
    quotes: {},
    quoteBys: {},
};

export function MasterQuotesFormPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const base = useBasePath();
    const { id } = useParams<{ id?: string }>();
    const isEdit = !!id;

    const { quotes: storeQuotes, fetchQuotes } = useMasterQuotesStore();
    // Cached tenant list (fetched once, reused across opens of this form).
    const { tenants: allTenants, fetchTenants } = useTenantStore();
    const tenants = useMemo(() => allTenants.filter((tn) => tn.domain_slug !== 'system-admin'), [allTenants]);

    const [form, setForm] = useState<FormState>(emptyForm);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    // Load tenant list for the tenant selector (cached: only hits the API the first time)
    useEffect(() => {
        fetchTenants();
    }, []);

    // Load the quote to edit (from store, else fetch)
    useEffect(() => {
        if (!isEdit) return;
        const hydrate = (q?: QuotesVariant) => {
            if (!q) return;
            const quotes: Record<string, string> = {};
            const quoteBys: Record<string, string> = {};
            QUOTE_INDEXES.forEach((i) => {
                quotes[`quote_${i}`] = (q as any)[`quote_${i}`] || '';
                quoteBys[`quote_by_${i}`] = (q as any)[`quote_by_${i}`] || '';
            });
            setForm({
                religion_enum: q.religion_enum || '',
                title: q.title || '',
                active: isTrue(q.active),
                flag_default_quotes: isTrue(q.flag_default_quotes),
                tenant_id: q.tenant_id || '',
                quotes,
                quoteBys,
            });
            setLoading(false);
        };

        const existing = storeQuotes.find((q) => q.id === id);
        if (existing) {
            hydrate(existing);
        } else {
            fetchQuotes(true).then(() => {
                const q = useMasterQuotesStore.getState().quotes.find((x) => x.id === id);
                hydrate(q);
                setLoading(false);
            });
        }
    }, [id]);

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const setQuote = (i: number, value: string) => {
        setForm((prev) => ({ ...prev, quotes: { ...prev.quotes, [`quote_${i}`]: value } }));
    };
    const setQuoteBy = (i: number, value: string) => {
        setForm((prev) => ({ ...prev, quoteBys: { ...prev.quoteBys, [`quote_by_${i}`]: value } }));
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            toast.error(t('master_quotes.validation_title', 'Title wajib diisi'));
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                religion_enum: form.religion_enum,
                title: form.title,
                active: form.active,
                flag_default_quotes: form.flag_default_quotes,
                // Sent as a distinct key: the apiClient interceptor overwrites a blank
                // `tenant_id` with the caller's own tenant ('system' for superadmin),
                // which would wrongly turn "Berlaku umum" into 'system'.
                quote_tenant_id: form.tenant_id,
                ...form.quotes,
                ...form.quoteBys,
            };
            const res = isEdit
                ? await quotesApi.updateQuote({ id: id as string, ...payload })
                : await quotesApi.createQuote(payload);

            if (res.success) {
                toast.success(isEdit
                    ? t('master_quotes.update_success', 'Quote berhasil diperbarui')
                    : t('master_quotes.create_success', 'Quote berhasil dibuat'));
                await fetchQuotes(true);
                navigate(`${base}/master-quotes`);
            } else {
                toast.error(res.message || t('master_quotes.save_error', 'Gagal menyimpan quote'));
            }
        } catch (e) {
            toast.error(t('master_quotes.save_error', 'Gagal menyimpan quote'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <IconButton
                        onClick={() => navigate(`${base}/master-quotes`)}
                        icon={<HiOutlineArrowLeft className="w-4 h-4" />}
                        title={t('master_quotes.back', 'Kembali') as string}
                    />
                    <h1 className="text-lg font-display font-bold text-gray-800 dark:text-white">
                        {isEdit ? t('master_quotes.edit_title', 'Edit Quote') : t('master_quotes.new_title', 'Tambah Quote')}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" className="text-sm" onClick={() => navigate(`${base}/master-quotes`)} disabled={saving}>
                        {t('master_quotes.cancel', 'Batal')}
                    </Button>
                    <Button className="text-sm" onClick={handleSave} loading={saving} icon={<HiOutlineSave className="w-4 h-4" />}>
                        {saving ? t('master_quotes.saving', 'Menyimpan...') : t('master_quotes.save', 'Simpan')}
                    </Button>
                </div>
            </div>

            {/* Top section: meta fields */}
            <div className="card p-6 border border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                        <label className="label-field">{t('master_quotes.field_religion', 'Agama')}</label>
                        <div className="relative">
                            <select
                                value={form.religion_enum}
                                onChange={(e) => setField('religion_enum', e.target.value)}
                                className="input-field pr-10 appearance-none cursor-pointer"
                            >
                                <option value="">{t('master_quotes.religion_all', 'Semua / Umum')}</option>
                                {RELIGION_OPTIONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <label className="label-field">{t('master_quotes.field_title', 'Judul')}</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setField('title', e.target.value)}
                            className="input-field"
                            placeholder={t('master_quotes.field_title_placeholder', 'Contoh: Quotes Islami 1') as string}
                        />
                    </div>
                    <div>
                        <label className="label-field">{t('master_quotes.field_tenant', 'Tenant (opsional)')}</label>
                        <div className="relative">
                            <select
                                value={form.tenant_id}
                                onChange={(e) => setField('tenant_id', e.target.value)}
                                className="input-field pr-10 appearance-none cursor-pointer"
                            >
                                <option value="">{t('master_quotes.general', 'Berlaku umum')}</option>
                                {tenants.map((tn) => (
                                    <option key={tn.id} value={tn.id}>{tn.domain_slug || tn.id}</option>
                                ))}
                            </select>
                            <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex items-end gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative inline-flex items-center">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={form.active}
                                    onChange={(e) => setField('active', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('master_quotes.field_active', 'Aktif')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative inline-flex items-center">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={form.flag_default_quotes}
                                    onChange={(e) => setField('flag_default_quotes', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-600"></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('master_quotes.field_default', 'Default Quotes')}</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Bottom section: 7 quotes */}
            <div className="card p-6 border border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{t('master_quotes.quotes_section', 'Isi Quotes')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('master_quotes.quotes_section_desc', 'Boleh diisi sebagian. Quote yang kosong tidak akan ditampilkan.')}</p>

                {/* Desktop: 7-column table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {QUOTE_INDEXES.map((i) => (
                                    <th key={i} className="px-2 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left min-w-[180px]">
                                        {t('master_quotes.quote_n', { n: i, defaultValue: `Quote ${i}` })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="align-top">
                                {QUOTE_INDEXES.map((i) => (
                                    <td key={i} className="px-2 pb-3">
                                        <textarea
                                            rows={8}
                                            value={form.quotes[`quote_${i}`] || ''}
                                            onChange={(e) => setQuote(i, e.target.value)}
                                            className="input-field resize-y text-sm min-h-[180px]"
                                            placeholder={t('master_quotes.quote_placeholder', 'Isi quote...') as string}
                                        />
                                    </td>
                                ))}
                            </tr>
                            <tr className="align-top">
                                {QUOTE_INDEXES.map((i) => (
                                    <td key={i} className="px-2">
                                        <input
                                            type="text"
                                            value={form.quoteBys[`quote_by_${i}`] || ''}
                                            onChange={(e) => setQuoteBy(i, e.target.value)}
                                            className="input-field text-sm"
                                            placeholder={t('master_quotes.quote_by_placeholder', 'Penulis / sumber...') as string}
                                        />
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Mobile: vertical cards */}
                <div className="lg:hidden space-y-4">
                    {QUOTE_INDEXES.map((i) => (
                        <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 bg-gray-50/50 dark:bg-gray-800/30">
                            <p className="text-xs font-semibold text-gold-600 uppercase tracking-wider mb-2">
                                {t('master_quotes.quote_n', { n: i, defaultValue: `Quote ${i}` })}
                            </p>
                            <textarea
                                rows={5}
                                value={form.quotes[`quote_${i}`] || ''}
                                onChange={(e) => setQuote(i, e.target.value)}
                                className="input-field resize-y text-sm mb-2 min-h-[120px]"
                                placeholder={t('master_quotes.quote_placeholder', 'Isi quote...') as string}
                            />
                            <input
                                type="text"
                                value={form.quoteBys[`quote_by_${i}`] || ''}
                                onChange={(e) => setQuoteBy(i, e.target.value)}
                                className="input-field text-sm"
                                placeholder={t('master_quotes.quote_by_placeholder', 'Penulis / sumber...') as string}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
