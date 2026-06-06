import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
    HiOutlineRefresh,
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlinePencilAlt,
    HiOutlineTrash,
    HiOutlineExternalLink,
    HiOutlineSparkles,
} from 'react-icons/hi';
import { PageLoader } from '@/shared/components/Loading';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { Badge } from '@/shared/components/Badge';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { useMasterQuotesStore } from '../store/masterQuotesStore';
import { quotesApi } from '@/core/api/endpoints';
import { QuotesVariant } from '@/types';

const isTrue = (val: any) => val === true || val === 'TRUE' || val === 'true';

type PendingChange =
    | { type: 'active'; quote: QuotesVariant; value: boolean }
    | { type: 'default'; quote: QuotesVariant; value: boolean };

export function MasterQuotesListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { quotes, loading, hasLoaded, fetchQuotes, deleteQuote } = useMasterQuotesStore();

    const [search, setSearch] = useState('');
    const [quoteToDelete, setQuoteToDelete] = useState<QuotesVariant | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
    // Row currently being saved (inline spinner) instead of a blocking dialog loader.
    const [savingRowId, setSavingRowId] = useState<string | null>(null);

    useEffect(() => {
        fetchQuotes();
    }, []);

    const filteredQuotes = useMemo(() => {
        const s = search.toLowerCase().trim();
        if (!s) return quotes;
        return quotes.filter((q) => {
            return (
                (q.title || '').toLowerCase().includes(s) ||
                (q.religion_enum || '').toLowerCase().includes(s) ||
                (q.creator_username || '').toLowerCase().includes(s) ||
                (q.tenant_slug || '').toLowerCase().includes(s) ||
                (q.tenant_username || '').toLowerCase().includes(s)
            );
        });
    }, [quotes, search]);

    const handleConfirmChange = async () => {
        if (!pendingChange) return;
        const { quote, type, value } = pendingChange;

        // Close the dialog immediately; show the loading on the edited row instead.
        setPendingChange(null);
        setSavingRowId(quote.id);
        try {
            const payload: any = { id: quote.id };
            if (type === 'active') payload.active = value;
            if (type === 'default') payload.flag_default_quotes = value;

            const res = await quotesApi.updateQuote(payload, { skipLoader: true } as any);
            if (res.success) {
                toast.success(t('master_quotes.update_success', 'Perubahan berhasil disimpan'));
                // backend may clear other defaults -> refresh silently (no block screen)
                await fetchQuotes(true, true);
            } else {
                toast.error(res.message || t('master_quotes.update_error', 'Gagal menyimpan perubahan'));
            }
        } catch (e) {
            toast.error(t('master_quotes.update_error', 'Gagal menyimpan perubahan'));
        } finally {
            setSavingRowId(null);
        }
    };

    const handleDelete = async () => {
        if (!quoteToDelete) return;
        setIsDeleting(true);
        try {
            const success = await deleteQuote(quoteToDelete.id);
            if (success) {
                toast.success(t('master_quotes.delete_success', 'Quote berhasil dihapus'));
                setQuoteToDelete(null);
                await fetchQuotes(true, true);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const isInitialLoading = !hasLoaded && loading;
    if (isInitialLoading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-wrap justify-end gap-2">
                <IconButton
                    onClick={() => fetchQuotes(true)}
                    icon={<HiOutlineRefresh className="w-4 h-4" />}
                    spinning={loading}
                    title={t('master_quotes.refresh', 'Refresh Data') as string}
                />
                <Button
                    onClick={() => navigate('/private/master-quotes/new')}
                    className="text-sm"
                    icon={<HiOutlinePlus className="w-4 h-4" />}
                >
                    {t('master_quotes.add', 'Tambah Quote')}
                </Button>
            </div>

            {/* Filter bar */}
            <div className="bg-white dark:bg-wedding-dark-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <HiOutlineSearch className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('master_quotes.search_placeholder', 'Cari judul, agama, user, atau tenant...') as string}
                        className="input-field pl-9 text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <th className="px-4 py-3">{t('master_quotes.col_title', 'Title')}</th>
                                <th className="px-4 py-3">{t('master_quotes.col_religion', 'Religion')}</th>
                                <th className="px-4 py-3 text-center">{t('master_quotes.col_active', 'Active')}</th>
                                <th className="px-4 py-3 text-center">{t('master_quotes.col_default', 'Default Quotes')}</th>
                                <th className="px-4 py-3">{t('master_quotes.col_tenant', 'Tenant')}</th>
                                <th className="px-4 py-3">{t('master_quotes.col_creator', 'Pembuat')}</th>
                                <th className="px-4 py-3">{t('master_quotes.col_updated', 'Pembaruan Terakhir')}</th>
                                <th className="px-4 py-3 text-center">{t('master_quotes.col_action', 'Aksi')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                        <HiOutlineSparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                        {t('master_quotes.empty', 'Belum ada data quotes')}
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotes.map((q) => {
                                    const active = isTrue(q.active);
                                    const isDefault = isTrue(q.flag_default_quotes);
                                    const isSaving = savingRowId === q.id;
                                    return (
                                        <tr key={q.id} className={`transition-colors ${isSaving ? 'bg-gray-100 dark:bg-gray-800/60 opacity-70 pointer-events-none' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/30'}`}>
                                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-white max-w-[220px] truncate">
                                                <span className="inline-flex items-center gap-2">
                                                    {isSaving && <span className="w-3.5 h-3.5 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />}
                                                    {q.title || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{q.religion_enum || '-'}</td>
                                            {/* Active toggle */}
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center">
                                                    <label className={`relative inline-flex items-center ${isSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={active}
                                                            disabled={isSaving}
                                                            onChange={(e) => setPendingChange({ type: 'active', quote: q, value: e.target.checked })}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-600"></div>
                                                    </label>
                                                </div>
                                            </td>
                                            {/* Default toggle */}
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center">
                                                    <label className={`relative inline-flex items-center ${isSaving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={isDefault}
                                                            disabled={isSaving}
                                                            onChange={(e) => setPendingChange({ type: 'default', quote: q, value: e.target.checked })}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-600"></div>
                                                    </label>
                                                </div>
                                            </td>
                                            {/* Tenant column (dynamic) */}
                                            <td className="px-4 py-3">
                                                {q.tenant_id ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-gray-700 dark:text-gray-200 font-medium">{q.tenant_username || q.tenant_id}</span>
                                                        {q.tenant_slug && (
                                                            <a
                                                                href={`#/${q.tenant_slug}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700"
                                                            >
                                                                {q.tenant_slug}
                                                                <HiOutlineExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Badge variant="info">{t('master_quotes.general', 'Berlaku umum')}</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{q.creator_username || '-'}</td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                                                {q.update_at ? new Date(q.update_at).toLocaleString('id-ID') : '-'}
                                            </td>
                                            {/* Action */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <IconButton
                                                        shape="ghost"
                                                        color="gold"
                                                        onClick={() => navigate(`/private/master-quotes/edit/${q.id}`)}
                                                        icon={<HiOutlinePencilAlt className="w-4 h-4" />}
                                                        title={t('master_quotes.edit', 'Edit') as string}
                                                    />
                                                    <IconButton
                                                        shape="ghost"
                                                        color="red"
                                                        onClick={() => !isDefault && setQuoteToDelete(q)}
                                                        disabled={isDefault}
                                                        icon={<HiOutlineTrash className="w-4 h-4" />}
                                                        title={(isDefault
                                                            ? t('master_quotes.cannot_delete_default', 'Quote default tidak dapat dihapus')
                                                            : t('master_quotes.delete', 'Hapus')) as string}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick-change confirmation */}
            <ConfirmDialog
                isOpen={!!pendingChange}
                onClose={() => setPendingChange(null)}
                onConfirm={handleConfirmChange}
                variant="primary"
                title={t('master_quotes.confirm_change_title', 'Konfirmasi Perubahan') as string}
                confirmLabel={t('master_quotes.confirm_save', 'Ya, Simpan') as string}
                cancelLabel={t('master_quotes.cancel', 'Batal') as string}
                message={
                    pendingChange?.type === 'active'
                        ? (pendingChange.value
                            ? t('master_quotes.confirm_activate', { title: pendingChange.quote.title, defaultValue: `Aktifkan quote "${pendingChange?.quote.title}"?` })
                            : t('master_quotes.confirm_deactivate', { title: pendingChange.quote.title, defaultValue: `Nonaktifkan quote "${pendingChange?.quote.title}"?` }))
                        : (pendingChange?.value
                            ? t('master_quotes.confirm_set_default', { title: pendingChange?.quote.title, defaultValue: `Jadikan "${pendingChange?.quote.title}" sebagai quote default? Quote default lainnya akan dinonaktifkan.` })
                            : t('master_quotes.confirm_unset_default', { title: pendingChange?.quote.title, defaultValue: `Batalkan "${pendingChange?.quote.title}" sebagai quote default?` }))
                }
            />

            {/* Delete confirmation */}
            <ConfirmDialog
                isOpen={!!quoteToDelete}
                onClose={() => setQuoteToDelete(null)}
                onConfirm={handleDelete}
                variant="danger"
                title={t('master_quotes.delete_title', 'Hapus Quote') as string}
                loading={isDeleting}
                warningTitle={t('master_quotes.delete_warning', 'Peringatan Penting!') as string}
                confirmLabel={t('master_quotes.delete_action', 'Ya, Hapus Permanen') as string}
                cancelLabel={t('master_quotes.cancel', 'Batal') as string}
                message={t('master_quotes.delete_confirm', { title: quoteToDelete?.title, defaultValue: `Apakah Anda yakin ingin menghapus quote "${quoteToDelete?.title}"?` })}
                description={t('master_quotes.delete_permanent', 'Data ini akan dihapus permanen dan tidak dapat dikembalikan.')}
            />
        </div>
    );
}
