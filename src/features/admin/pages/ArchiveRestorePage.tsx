import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Tenant, ArchiveRecord } from '@/types';
import { DataTable } from '@/shared/components';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
    HiOutlineRefresh,
    HiOutlineSearch,
    HiOutlineArchive,
    HiOutlineReply,
    HiOutlineTrash,
    HiOutlineExternalLink,
} from 'react-icons/hi';
import { useArchiveStore } from '../store/archiveStore';

type TabKey = 'active' | 'archived';

// flag_show_review may arrive as boolean true or the strings 'true'/'TRUE'.
const isReviewShown = (t: any) =>
    t?.flag_show_review === true || t?.flag_show_review === 'true' || t?.flag_show_review === 'TRUE';

const couple = (t: { groom_name?: string; bride_name?: string }) =>
    `${t.groom_name || '-'} & ${t.bride_name || '-'}`;

const fmtDate = (v?: string) => {
    if (!v) return '-';
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtDateTime = (v?: string) => {
    if (!v) return '-';
    const d = new Date(v);
    return isNaN(d.getTime())
        ? v
        : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function PlanBadge({ plan }: { plan?: string }) {
    const p = (plan || '').toLowerCase();
    return (
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider
            ${p === 'basic' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                p === 'pro' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20' :
                    'bg-gold-50 dark:bg-gold-950/30 text-gold-700 dark:text-gold-400 border border-gold-100 dark:border-gold-900/20'}`}>
            {plan || '-'}
        </span>
    );
}

function PaymentBadge({ status }: { status?: string }) {
    const paid = (status || '').toLowerCase().includes('dibayar') || (status || '').toLowerCase().includes('lunas');
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border
            ${paid
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/20'}`}>
            {status || '-'}
        </span>
    );
}

const RowSpinner = ({ label }: { label: string }) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-600">
        <span className="w-3.5 h-3.5 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
        {label}
    </span>
);

export function ArchiveRestorePage() {
    const { t } = useTranslation();
    const { tenants, archives, loading, fetchTenants, fetchArchives, archiveTenant, restoreTenant, deleteArchivePermanent } =
        useArchiveStore();

    const [activeTab, setActiveTab] = useState<TabKey>('active');
    const [search, setSearch] = useState('');

    // dialog targets
    const [tenantToArchive, setTenantToArchive] = useState<Tenant | null>(null);
    const [archiveToRestore, setArchiveToRestore] = useState<ArchiveRecord | null>(null);
    const [archiveToDelete, setArchiveToDelete] = useState<ArchiveRecord | null>(null);

    // per-row busy markers (id of tenant currently being processed)
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [processingArchiveId, setProcessingArchiveId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchTenants();
        fetchArchives();
    }, []);

    const refresh = () => (activeTab === 'active' ? fetchTenants(true) : fetchArchives(true));

    // ---- handlers ----
    const handleArchive = async () => {
        if (!tenantToArchive) return;
        const t = tenantToArchive;
        setTenantToArchive(null);
        setArchivingId(t.id);
        try {
            await archiveTenant(t);
        } finally {
            setArchivingId(null);
        }
    };

    const handleRestore = async () => {
        if (!archiveToRestore) return;
        const a = archiveToRestore;
        setArchiveToRestore(null);
        setProcessingArchiveId(a.tenant_id);
        try {
            await restoreTenant(a);
        } finally {
            setProcessingArchiveId(null);
        }
    };

    const handlePermanentDelete = async () => {
        if (!archiveToDelete) return;
        const a = archiveToDelete;
        setIsDeleting(true);
        setProcessingArchiveId(a.tenant_id);
        try {
            const ok = await deleteArchivePermanent(a);
            if (ok) setArchiveToDelete(null);
        } finally {
            setIsDeleting(false);
            setProcessingArchiveId(null);
        }
    };

    // ---- filtering ----
    const q = search.trim().toLowerCase();
    const filteredTenants = tenants.filter((t) =>
        !q || couple(t).toLowerCase().includes(q) || (t.domain_slug || '').toLowerCase().includes(q));
    const filteredArchives = archives.filter((a) =>
        !q || couple(a).toLowerCase().includes(q) || (a.slug || '').toLowerCase().includes(q));

    // ---- columns: active tenants ----
    // Note: render callbacks use `row` (not `t`) for the data arg to avoid
    // shadowing the `t` translation function from useTranslation.
    const activeColumns = [
        { key: 'couple', header: t('archive.col_couple'), render: (row: Tenant) => <span className="font-semibold text-gray-800 dark:text-gray-200">{couple(row)}</span> },
        { key: 'slug', header: t('archive.col_slug'), render: (row: Tenant) => <span className="font-mono text-xs text-gray-500">{row.domain_slug || '-'}</span> },
        { key: 'wedding_date', header: t('archive.col_wedding_date'), render: (row: Tenant) => fmtDate(row.wedding_date) },
        { key: 'plan_type', header: t('archive.col_plan'), render: (row: Tenant) => <PlanBadge plan={row.plan_type} /> },
        { key: 'status_payment', header: t('archive.col_payment'), render: (row: Tenant) => <PaymentBadge status={row.status_payment} /> },
        {
            key: 'review', header: t('archive.col_review'), render: (row: Tenant) =>
                isReviewShown(row)
                    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">{t('archive.review_active')}</span>
                    : <span className="text-gray-400">—</span>,
        },
        {
            key: 'actions',
            header: t('archive.col_actions'),
            render: (row: Tenant) => {
                const reviewLocked = isReviewShown(row);
                const busy = archivingId === row.id;
                if (busy) return <div className="flex justify-start"><RowSpinner label={t('archive.archiving')} /></div>;
                return (
                    <div className="flex items-center justify-start gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className={`tooltip tooltip-bottom ${reviewLocked ? 'opacity-40' : ''}`}>
                            <button
                                onClick={() => setTenantToArchive(row)}
                                disabled={reviewLocked || !!archivingId}
                                className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:cursor-not-allowed"
                            >
                                <HiOutlineArchive className="w-4 h-4" />
                            </button>
                            <span className="tooltip-text">
                                {reviewLocked ? t('archive.tooltip_archive_locked') : t('archive.tooltip_archive')}
                            </span>
                        </div>
                    </div>
                );
            },
        },
    ];

    // ---- columns: archived ----
    const archivedColumns = [
        { key: 'couple', header: t('archive.col_couple'), render: (a: ArchiveRecord) => <span className="font-semibold text-gray-800 dark:text-gray-200">{couple(a)}</span> },
        { key: 'slug', header: t('archive.col_slug'), render: (a: ArchiveRecord) => <span className="font-mono text-xs text-gray-500">{a.slug || '-'}</span> },
        { key: 'wedding_date', header: t('archive.col_wedding_date'), render: (a: ArchiveRecord) => fmtDate(a.wedding_date) },
        { key: 'plan_type', header: t('archive.col_plan'), render: (a: ArchiveRecord) => <PlanBadge plan={a.plan_type} /> },
        { key: 'status_payment', header: t('archive.col_payment'), render: (a: ArchiveRecord) => <PaymentBadge status={a.status_payment} /> },
        { key: 'tanggal_archive', header: t('archive.col_archived_at'), render: (a: ArchiveRecord) => fmtDateTime(a.tanggal_archive) },
        {
            key: 'url_json', header: t('archive.col_backup'), render: (a: ArchiveRecord) =>
                a.url_json
                    ? <a href={a.url_json} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"><HiOutlineExternalLink className="w-3.5 h-3.5" /> JSON</a>
                    : <span className="text-gray-400">—</span>,
        },
        {
            key: 'actions',
            header: t('archive.col_actions'),
            render: (a: ArchiveRecord) => {
                const busy = processingArchiveId === a.tenant_id;
                if (busy) return <div className="flex justify-start"><RowSpinner label={t('archive.processing')} /></div>;
                return (
                    <div className="flex items-center justify-start gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="tooltip tooltip-bottom">
                            <button
                                onClick={() => setArchiveToRestore(a)}
                                disabled={!!processingArchiveId}
                                className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:cursor-not-allowed"
                            >
                                <HiOutlineReply className="w-4 h-4" />
                            </button>
                            <span className="tooltip-text">{t('archive.tooltip_restore')}</span>
                        </div>
                        <div className="tooltip tooltip-bottom">
                            <button
                                onClick={() => setArchiveToDelete(a)}
                                disabled={!!processingArchiveId}
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:cursor-not-allowed"
                            >
                                <HiOutlineTrash className="w-4 h-4" />
                            </button>
                            <span className="tooltip-text">{t('archive.tooltip_delete')}</span>
                        </div>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Tab switcher + refresh (page title/description are rendered by DashboardLayout) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full sm:w-auto">
                    {(['active', 'archived'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${activeTab === tab
                                ? 'bg-white dark:bg-gray-900 text-gold-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab === 'active'
                                ? t('archive.tab_active', { count: tenants.length })
                                : t('archive.tab_archived', { count: archives.length })}
                        </button>
                    ))}
                </div>
                <button
                    onClick={refresh}
                    className="p-2.5 bg-white dark:bg-wedding-dark-card border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm flex items-center justify-center self-end sm:self-auto"
                    title={t('archive.refresh')}
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Search bar */}
            <div className="bg-white dark:bg-wedding-dark-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <HiOutlineSearch className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={activeTab === 'active' ? t('archive.search_active_placeholder') : t('archive.search_archived_placeholder')}
                        className="input-field pl-9 text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-x-clip rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                {activeTab === 'active' ? (
                    <DataTable
                        columns={activeColumns}
                        data={filteredTenants}
                        loading={loading}
                        emptyMessage={t('archive.empty_active')}
                    />
                ) : (
                    <DataTable
                        columns={archivedColumns}
                        data={filteredArchives}
                        loading={loading}
                        emptyMessage={t('archive.empty_archived')}
                    />
                )}
            </div>

            {/* a) Archive confirm */}
            <ConfirmDialog
                isOpen={!!tenantToArchive}
                onClose={() => setTenantToArchive(null)}
                onConfirm={handleArchive}
                variant="danger"
                title={t('archive.archive_title')}
                confirmLabel={t('archive.archive_confirm')}
                cancelLabel={t('common.cancel')}
                message={<p><Trans i18nKey="archive.archive_message" values={{ couple: tenantToArchive ? couple(tenantToArchive) : '' }} components={{ b: <b /> }} /></p>}
                description={t('archive.archive_description')}
            />

            {/* b) Restore confirm */}
            <ConfirmDialog
                isOpen={!!archiveToRestore}
                onClose={() => setArchiveToRestore(null)}
                onConfirm={handleRestore}
                variant="primary"
                title={t('archive.restore_title')}
                confirmLabel={t('archive.restore_confirm')}
                cancelLabel={t('common.cancel')}
                message={<p><Trans i18nKey="archive.restore_message" values={{ couple: archiveToRestore ? couple(archiveToRestore) : '' }} components={{ b: <b /> }} /></p>}
                description={t('archive.restore_description')}
            />

            {/* c) Permanent delete confirm (requires typing the slug) */}
            <ConfirmDialog
                isOpen={!!archiveToDelete}
                onClose={() => setArchiveToDelete(null)}
                onConfirm={handlePermanentDelete}
                variant="danger"
                title={t('archive.delete_title')}
                confirmLabel={t('archive.delete_confirm')}
                cancelLabel={t('common.cancel')}
                message={<p><Trans i18nKey="archive.delete_message" values={{ couple: archiveToDelete ? couple(archiveToDelete) : '' }} components={{ b: <b /> }} /></p>}
                description={t('archive.delete_description')}
                requireText={archiveToDelete?.slug}
                loading={isDeleting}
            />
        </div>
    );
}
