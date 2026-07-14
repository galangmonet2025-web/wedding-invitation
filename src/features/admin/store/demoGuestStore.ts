import { create } from 'zustand';
import { guestApi, tenantApi } from '@/core/api/endpoints';
import { Guest } from '@/types';

// Store daftar tamu tenant DEMO (dipakai fitur "Buka Link Tamu" di Manage Tema).
// Di-cache dengan pola yang SAMA seperti themeStore: in-memory + flag hasLoaded
// + stale-while-revalidate. Data hidup selama sesi tab (hilang saat refresh),
// tidak menyentuh localStorage/sessionStorage.
//
// Slug tenant demo di-resolve ke tenant_id lewat getTenants, lalu getGuests
// dipanggil dengan tenant_id (jalur superadmin yang didukung Code.gs getGuests).

// Slug tenant demo yang undangannya dipakai untuk preview tema. Harus sama
// dengan PREVIEW_DEMO_SLUG di ManageThemesPage.tsx.
const PREVIEW_DEMO_SLUG = 'dini-galang';

interface DemoGuestState {
    guests: Guest[];
    loading: boolean;
    hasLoaded: boolean;
    error: string | null;

    fetchDemoGuests: (force?: boolean) => Promise<void>;
}

export const useDemoGuestStore = create<DemoGuestState>((set, get) => ({
    guests: [],
    loading: false,
    hasLoaded: false,
    error: null,

    fetchDemoGuests: async (force = false) => {
        // Sudah pernah load & tidak dipaksa refresh -> pakai cache.
        if (get().hasLoaded && !force) return;
        // Hindari fetch ganda bila sedang berjalan.
        if (get().loading) return;

        set({ loading: true, error: null });
        try {
            // Resolve slug demo -> tenant_id.
            const tenantsRes = await tenantApi.getTenants();
            const tenants = (tenantsRes.data || []) as any[];
            const demoTenant = tenants.find(
                (t) => (t.domain_slug || '').trim().toLowerCase() === PREVIEW_DEMO_SLUG
            );
            if (!demoTenant) {
                set({ error: `Tenant demo "${PREVIEW_DEMO_SLUG}" tidak ditemukan.` });
                return;
            }

            const res = await guestApi.getGuests({
                search: '',
                status: '',
                category: '',
                page: 1,
                limit: 1000,
                tenant_id: demoTenant.id,
            } as any);

            if (res.success && res.data) {
                set({ guests: res.data.items || [], hasLoaded: true });
            } else {
                set({ error: res.message || 'Gagal memuat daftar tamu.' });
            }
        } catch (err: any) {
            set({ error: err?.message || 'Gagal memuat daftar tamu.' });
        } finally {
            set({ loading: false });
        }
    },
}));
