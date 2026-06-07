import { create } from 'zustand';
import { archiveApi, tenantApi } from '@/core/api/endpoints';
import { Tenant, ArchiveRecord } from '@/types';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';
import toast from 'react-hot-toast';
import i18n from '@/core/i18n/config';

// Store runs outside React, so use the i18n instance directly (not the hook).
const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);

interface ArchiveState {
    tenants: Tenant[];          // active tenants (candidates for archiving)
    archives: ArchiveRecord[];  // already-archived tenants
    loading: boolean;
    hasLoaded: boolean;

    fetchTenants: (force?: boolean) => Promise<void>;
    fetchArchives: (force?: boolean) => Promise<void>;

    archiveTenant: (tenant: Tenant) => Promise<boolean>;
    restoreTenant: (rec: ArchiveRecord) => Promise<boolean>;
    deleteArchivePermanent: (rec: ArchiveRecord) => Promise<boolean>;
}

// Helper: a tenant whose review is still publicly shown cannot be archived.
// flag_show_review may arrive as boolean true or the strings 'true'/'TRUE'.
function coupleLabel(t: { groom_name?: string; bride_name?: string }) {
    return `${t.groom_name || '-'} & ${t.bride_name || '-'}`;
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
    tenants: [],
    archives: [],
    loading: false,
    hasLoaded: false,

    fetchTenants: async (force = false) => {
        if (get().hasLoaded && !force) return;
        set({ loading: true });
        try {
            const res = await tenantApi.getTenants();
            if (res.success) {
                set({ tenants: res.data || [], hasLoaded: true });
            } else {
                toast.error(res.message || t('archive.toast_load_tenants_failed'));
            }
        } catch {
            toast.error(t('archive.toast_load_tenants_failed'));
        } finally {
            set({ loading: false });
        }
    },

    fetchArchives: async (force = false) => {
        set({ loading: true });
        try {
            const res = await archiveApi.getArchives({ skipLoader: true } as any);
            if (res.success) {
                set({ archives: res.data || [] });
            } else {
                toast.error(res.message || t('archive.toast_load_archives_failed'));
            }
        } catch {
            toast.error(t('archive.toast_load_archives_failed'));
        } finally {
            set({ loading: false });
            // Avoid hammering the force flag from this list since it shares hasLoaded with tenants.
            void force;
        }
    },

    archiveTenant: async (tenant: Tenant) => {
        const { addTask, updateTask } = useBackgroundTaskStore.getState();
        const taskId = `archive-${tenant.id}`;
        addTask({ id: taskId, name: t('archive.task_archive', { name: tenant.domain_slug || coupleLabel(tenant) }), total: 1 });
        try {
            const res = await archiveApi.archiveTenant(tenant.id, { skipLoader: true } as any);
            if (res.success) {
                // Move tenant out of the active list; add returned record to archives list.
                set((state) => ({
                    tenants: state.tenants.filter((tn) => tn.id !== tenant.id),
                    archives: res.data ? [res.data, ...state.archives] : state.archives,
                }));
                updateTask(taskId, { progress: 100, successCount: 1, status: 'success', details: t('archive.task_archive_done') });
                toast.success(t('archive.toast_archive_success', { couple: coupleLabel(tenant) }));
                return true;
            }
            updateTask(taskId, { progress: 100, failCount: 1, status: 'error', details: res.message || t('archive.task_failed') });
            toast.error(res.message || t('archive.toast_archive_failed'));
            return false;
        } catch {
            updateTask(taskId, { progress: 100, failCount: 1, status: 'error', details: t('archive.task_failed') });
            toast.error(t('archive.toast_archive_failed'));
            return false;
        }
    },

    restoreTenant: async (rec: ArchiveRecord) => {
        const { addTask, updateTask } = useBackgroundTaskStore.getState();
        const taskId = `restore-${rec.tenant_id}`;
        addTask({ id: taskId, name: t('archive.task_restore', { name: rec.slug || coupleLabel(rec) }), total: 1 });
        try {
            const res = await archiveApi.restoreTenant(rec.tenant_id, { skipLoader: true } as any);
            if (res.success) {
                set((state) => ({ archives: state.archives.filter((a) => a.tenant_id !== rec.tenant_id) }));
                updateTask(taskId, { progress: 100, successCount: 1, status: 'success', details: t('archive.task_restore_done') });
                toast.success(t('archive.toast_restore_success', { couple: coupleLabel(rec) }));
                return true;
            }
            updateTask(taskId, { progress: 100, failCount: 1, status: 'error', details: res.message || t('archive.task_failed') });
            toast.error(res.message || t('archive.toast_restore_failed'));
            return false;
        } catch {
            updateTask(taskId, { progress: 100, failCount: 1, status: 'error', details: t('archive.task_failed') });
            toast.error(t('archive.toast_restore_failed'));
            return false;
        }
    },

    deleteArchivePermanent: async (rec: ArchiveRecord) => {
        const { addTask, updateTask } = useBackgroundTaskStore.getState();
        const taskId = `delete-archive-${rec.tenant_id}`;
        addTask({ id: taskId, name: t('archive.task_delete', { name: rec.slug || coupleLabel(rec) }), total: 1 });
        try {
            const res = await archiveApi.deleteArchivePermanent(rec.tenant_id, { skipLoader: true } as any);
            if (res.success) {
                set((state) => ({ archives: state.archives.filter((a) => a.tenant_id !== rec.tenant_id) }));
                updateTask(taskId, { progress: 100, successCount: 1, status: 'success', details: t('archive.task_delete_done') });
                toast.success(t('archive.toast_delete_success', { couple: coupleLabel(rec) }));
                return true;
            }
            updateTask(taskId, { progress: 100, failCount: 1, status: 'error', details: res.message || t('archive.task_failed') });
            toast.error(res.message || t('archive.toast_delete_failed'));
            return false;
        } catch {
            updateTask(taskId, { progress: 100, failCount: 1, status: 'error', details: t('archive.task_failed') });
            toast.error(t('archive.toast_delete_failed'));
            return false;
        }
    },
}));
