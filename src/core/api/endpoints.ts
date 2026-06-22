import apiClient from './apiClient';
import type {
    ApiResponse,
    LoginRequest,
    LoginResponse,
    RegisterTenantRequest,
    CreateGuestRequest,
    UpdateGuestRequest,
    Guest,
    GuestFilters,
    PaginatedResponse,
    TenantDashboard,
    GlobalDashboard,
    Tenant,
    CreateTenantRequest,
    UpdateTenantRequest,
    Wish,
    Gift,
    ActivityLog,
    InvitationContent,
    Theme,
    CreateThemeRequest,
    UpdateThemeRequest,
    WebsiteConfig,
    MstAdditionalFeature,
    TenantActiveFeature,
    ReviewAndRating,
    Transaction,
    CreateTransactionRequest,
    MstPlanType,
    MstPlanFeature,
    Coupon,
    QuotesVariant,
    ArchiveRecord,
} from '@/types';

// =============================================
// AUTH API
// =============================================

export const authApi = {
    login: async (data: LoginRequest, config?: any): Promise<ApiResponse<LoginResponse>> => {
        const res = await apiClient.post('', { action: 'login', ...data }, config);
        return res.data;
    },

    registerTenant: async (data: RegisterTenantRequest, config?: any): Promise<ApiResponse<LoginResponse>> => {
        const res = await apiClient.post('', { action: 'registerTenant', ...data }, config);
        return res.data;
    },

    logout: async (): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'logout' });
        return res.data;
    },

    checkSlug: async (slug: string): Promise<ApiResponse<{ available: boolean }>> => {
        const res = await apiClient.post('', { action: 'checkSlug', slug }, { skipLoader: true } as any);
        return res.data;
    },

    changePassword: async (data: any): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'changePassword', ...data });
        return res.data;
    },
};

// =============================================
// DASHBOARD API
// =============================================

export const dashboardApi = {
    getTenantDashboard: async (): Promise<ApiResponse<TenantDashboard>> => {
        const res = await apiClient.post('', { action: 'getDashboard' }, { skipLoader: true } as any);
        return res.data;
    },

    getGlobalDashboard: async (): Promise<ApiResponse<GlobalDashboard>> => {
        const res = await apiClient.post('', { action: 'getGlobalDashboard' }, { skipLoader: true } as any);
        return res.data;
    },

    getPendingActions: async (): Promise<ApiResponse<{ incomplete_tenants: any[] }>> => {
        const res = await apiClient.post('', { action: 'getPendingActions' }, { skipLoader: true } as any);
        return res.data;
    },
};

// =============================================
// GUEST API
// =============================================

export const guestApi = {
    getGuests: async (filters: GuestFilters): Promise<ApiResponse<PaginatedResponse<Guest>>> => {
        const res = await apiClient.post('', { action: 'getGuests', ...filters });
        return res.data;
    },

    createGuest: async (data: CreateGuestRequest): Promise<ApiResponse<Guest>> => {
        const res = await apiClient.post('', { action: 'createGuest', ...data });
        return res.data;
    },

    updateGuest: async (data: UpdateGuestRequest, config: any = {}): Promise<ApiResponse<Guest>> => {
        const res = await apiClient.post('', { action: 'updateGuest', ...data }, config);
        return res.data;
    },

    deleteGuest: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteGuest', id });
        return res.data;
    },

    bulkDeleteGuests: async (ids: string[]): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'bulkDeleteGuest', ids });
        return res.data;
    },

    checkinGuest: async (invitation_code: string, config: any = {}): Promise<ApiResponse<Guest>> => {
        const res = await apiClient.post('', { action: 'checkinGuest', invitation_code }, config);
        return res.data;
    },

    importGuests: async (guests: CreateGuestRequest[], overwrite: boolean = false, config: any = {}): Promise<ApiResponse<{ imported: number }>> => {
        const res = await apiClient.post('', { action: 'importGuests', guests, overwrite }, config);
        return res.data;
    },

    exportGuests: async (): Promise<ApiResponse<Guest[]>> => {
        const res = await apiClient.post('', { action: 'exportGuests' });
        return res.data;
    },
    
    updateGuestBlastStatus: async (id: string, status: boolean): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updateGuestBlastStatus', id, sent: status });
        return res.data;
    },
};

// =============================================
// TENANT API
// =============================================

export const tenantApi = {
    getTenants: async (): Promise<ApiResponse<Tenant[]>> => {
        const res = await apiClient.post('', { action: 'getTenants' });
        return res.data;
    },

    getTransactions: async (params?: any, config?: any): Promise<ApiResponse<Transaction[]>> => {
        const res = await apiClient.post('', { action: 'getTransactions', ...params }, config);
        return res.data;
    },

    createTenant: async (data: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
        const res = await apiClient.post('', { action: 'createTenant', ...data });
        return res.data;
    },

    updateTenant: async (data: UpdateTenantRequest, config: any = {}): Promise<ApiResponse<Tenant>> => {
        const res = await apiClient.post('', { action: 'updateTenant', ...data }, config);
        return res.data;
    },

    deleteTenant: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteTenant', id }, { skipLoader: true } as any);
        return res.data;
    },

    impersonateTenant: async (tenantId: string): Promise<ApiResponse<{ token: string; user: any; tenant: Tenant }>> => {
        const res = await apiClient.post('', { action: 'impersonateTenant', tenant_id: tenantId });
        return res.data;
    },
};

// =============================================
// STAFF API
// =============================================

export const staffApi = {
    getStaffs: async (): Promise<ApiResponse<any[]>> => {
        const res = await apiClient.post('', { action: 'getStaffs' });
        return res.data;
    },

    createStaff: async (data: any): Promise<ApiResponse<any>> => {
        const res = await apiClient.post('', { action: 'createStaffUser', ...data });
        return res.data;
    },

    deleteStaff: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteStaffUser', id });
        return res.data;
    },
};

// =============================================
// WISH API
// =============================================

export const wishApi = {
    getWishes: async (): Promise<ApiResponse<Wish[]>> => {
        const res = await apiClient.post('', { action: 'getWishes' });
        return res.data;
    },

    createWish: async (data: { guest_name: string; message: string }): Promise<ApiResponse<Wish>> => {
        const res = await apiClient.post('', { action: 'createWish', ...data });
        return res.data;
    },

    deleteWish: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteWish', id });
        return res.data;
    },
};

// =============================================
// GIFT API
// =============================================

export const giftApi = {
    getGifts: async (): Promise<ApiResponse<Gift[]>> => {
        const res = await apiClient.post('', { action: 'getGifts' });
        return res.data;
    },

    createGift: async (data: { guest_name: string; amount: number; bank_name: string }): Promise<ApiResponse<Gift>> => {
        const res = await apiClient.post('', { action: 'createGift', ...data });
        return res.data;
    },

    deleteGift: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteGift', id });
        return res.data;
    },
};

// =============================================
// ACTIVITY LOG API
// =============================================

export const activityApi = {
    getActivityLogs: async (): Promise<ApiResponse<ActivityLog[]>> => {
        const res = await apiClient.post('', { action: 'getActivityLogs' });
        return res.data;
    },
};

// =============================================
// THEME API
// =============================================

export const themeApi = {
    getThemes: async (): Promise<ApiResponse<Theme[]>> => {
        const res = await apiClient.post('', { action: 'getThemes' });
        return res.data;
    },

    createTheme: async (data: CreateThemeRequest, config: any = {}): Promise<ApiResponse<Theme>> => {
        // Large theme payloads (HTML+CSS+JS up to 300K chars) trigger a slow
        // multi-cell Google Sheets write on the backend; give it well past the
        // 30s default so we don't abort a write that is still in progress.
        const res = await apiClient.post('', { action: 'createTheme', ...data }, { timeout: 120000, ...config });
        return res.data;
    },

    updateTheme: async (data: UpdateThemeRequest, config: any = {}): Promise<ApiResponse<Theme>> => {
        const res = await apiClient.post('', { action: 'updateTheme', ...data }, { timeout: 120000, ...config });
        return res.data;
    },

    deleteTheme: async (id: string, config: any = {}): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteTheme', id }, config);
        return res.data;
    },
};

// =============================================
// INVITATION CONTENT API
// =============================================

export const invitationContentApi = {
    getContent: async (): Promise<ApiResponse<InvitationContent | null>> => {
        const res = await apiClient.post('', { action: 'getInvitationContent' });
        return res.data;
    },

    updateContent: async (data: Partial<InvitationContent>, config: any = {}): Promise<ApiResponse<InvitationContent>> => {
        const res = await apiClient.post('', { action: 'updateInvitationContent', ...data }, config);
        return res.data;
    },
};

// =============================================
// WEBSITE CONFIG API
// =============================================

export const websiteConfigApi = {
    getConfig: async (): Promise<ApiResponse<WebsiteConfig>> => {
        const res = await apiClient.post('', { action: 'getWebsiteConfig' });
        return res.data;
    },

    updateConfig: async (data: Partial<WebsiteConfig>, config: any = {}): Promise<ApiResponse<WebsiteConfig>> => {
        const res = await apiClient.post('', { action: 'updateWebsiteConfig', ...data }, config);
        return res.data;
    },
};

// =============================================
// PUBLIC INVITATION API (No auth required)
// Uses plain axios to avoid auth interceptor triggering CORS preflight
// =============================================

import axios from 'axios';

const publicClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'text/plain' },
});

export const publicApi = {
    getInvitation: async (slug: string, guestid?: string | null, themeCode?: string | null) => {
        const payload: any = { action: 'getPublicInvitation', slug };
        if (guestid) payload.guestid = guestid;
        // Theme preview: force a specific theme by its code (see backend getInvitation)
        if (themeCode) payload.theme_code = themeCode;
        const res = await publicClient.post('', JSON.stringify(payload));
        return res.data;
    },

    submitRSVP: async (data: { slug: string; invitation_code: string; status: string; number_of_guests?: number }) => {
        const res = await publicClient.post('', JSON.stringify({ action: 'submitPublicRSVP', ...data }));
        return res.data;
    },

    submitWish: async (data: { slug: string; guest_name: string; message: string; invitation_code?: string }) => {
        const res = await publicClient.post('', JSON.stringify({ action: 'submitPublicWish', ...data }));
        return res.data;
    },

    submitGift: async (data: { slug: string; guest_name: string; amount: number; bank_name: string; invitation_code?: string }) => {
        const res = await publicClient.post('', JSON.stringify({ action: 'submitPublicGift', ...data }));
        return res.data;
    },

    checkGuest: async (data: { slug: string; name: string }) => {
        const res = await publicClient.post('', JSON.stringify({ action: 'checkPublicGuest', ...data }));
        return res.data;
    },
    
    getPublicThemes: async () => {
        const res = await publicClient.post('', JSON.stringify({ action: 'getPublicThemes' }));
        return res.data;
    },
    
    getPublicPlanTypes: async () => {
        const res = await publicClient.post('', JSON.stringify({ action: 'getPublicPlanTypes' }));
        return res.data;
    },
    
    getPublicPlanFeatures: async () => {
        const res = await publicClient.post('', JSON.stringify({ action: 'getPublicPlanFeatures' }));
        return res.data;
    },

    getWebsiteConfig: async () => {
        const res = await publicClient.post('', JSON.stringify({ action: 'getWebsiteConfig' }));
        return res.data;
    },
};

// =============================================
// ADDITIONAL FEATURES API
// =============================================

export const additionalFeatureApi = {
    getMstFeatures: async (): Promise<ApiResponse<MstAdditionalFeature[]>> => {
        const res = await apiClient.post('', { action: 'getMstAdditionalFeatures' });
        return res.data;
    },
    
    createMstFeature: async (data: Partial<MstAdditionalFeature>): Promise<ApiResponse<MstAdditionalFeature>> => {
        const res = await apiClient.post('', { action: 'createMstAdditionalFeature', ...data });
        return res.data;
    },
    
    updateMstFeature: async (data: Partial<MstAdditionalFeature>): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updateMstAdditionalFeature', ...data });
        return res.data;
    },
    
    deleteMstFeature: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteMstAdditionalFeature', id });
        return res.data;
    },

    getTenantFeatures: async (tenantId?: string, config?: any): Promise<ApiResponse<TenantActiveFeature[]>> => {
        const payload: any = { action: 'getTenantActiveFeatures' };
        if (tenantId) payload.tenant_id = tenantId;
        const res = await apiClient.post('', payload, config);
        return res.data;
    },
    
    updateTenantFeature: async (data: Partial<TenantActiveFeature>, config: any = {}): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updateTenantActiveFeature', ...data }, config);
        return res.data;
    },

    deleteTenantFeature: async (tenantId: string, featureId: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { 
            action: 'deleteTenantActiveFeature', 
            tenant_id: tenantId,
            additional_feature_id: featureId 
        });
        return res.data;
    }
};

// =============================================
// REVIEW API
// =============================================

export const reviewApi = {
    getReviews: async (): Promise<ApiResponse<ReviewAndRating[]>> => {
        const res = await apiClient.post('', { action: 'getReviews' });
        return res.data;
    },

    submitReview: async (data: Partial<ReviewAndRating>): Promise<ApiResponse<ReviewAndRating>> => {
        const res = await apiClient.post('', { action: 'submitReview', ...data });
        return res.data;
    },

    updateReviewStatus: async (id: string, data: Partial<ReviewAndRating>, config: any = {}): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updateReviewStatus', id, ...data }, config);
        return res.data;
    },

    getTenantReview: async (): Promise<ApiResponse<ReviewAndRating | null>> => {
        const res = await apiClient.post('', { action: 'getReviewByTenant' }, { skipLoader: true } as any);
        return res.data;
    },
    deleteReview: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteReview', id });
        return res.data;
    },
};

// =============================================
// PAYMENT API (Midtrans)
// =============================================

export const paymentApi = {
    createTransaction: async (data: CreateTransactionRequest): Promise<ApiResponse<{ snap_token: string; order_id: string }>> => {
        const res = await apiClient.post('', { action: 'createTransaction', ...data });
        return res.data;
    },

    getTransactions: async (params?: any, config?: any): Promise<ApiResponse<Transaction[]>> => {
        const res = await apiClient.post('', { action: 'getTransactions', ...params }, config);
        return res.data;
    },

    getTransactionStatus: async (orderId: string): Promise<ApiResponse<Transaction>> => {
        const res = await apiClient.post('', { action: 'getTransactionStatus', order_id: orderId }, { skipLoader: true } as any);
        return res.data;
    },

    cancelTransaction: async (orderId: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'cancelTransaction', order_id: orderId });
        return res.data;
    },

    getPlanTypes: async (config?: any): Promise<ApiResponse<any[]>> => {
        const res = await apiClient.post('', { action: 'getPlanTypes' }, config);
        return res.data;
    },

    updatePlanType: async (data: any, config?: any): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updatePlanType', ...data }, config);
        return res.data;
    },

    getPlanFeatures: async (params?: { plan_id?: string }, config?: any): Promise<ApiResponse<MstPlanFeature[]>> => {
        const res = await apiClient.post('', { action: 'getPlanFeatures', ...params }, config);
        return res.data;
    },

    createPlanFeature: async (data: Partial<MstPlanFeature>, config?: any): Promise<ApiResponse<MstPlanFeature>> => {
        const res = await apiClient.post('', { action: 'createPlanFeature', ...data }, config);
        return res.data;
    },

    updatePlanFeature: async (data: Partial<MstPlanFeature>, config?: any): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updatePlanFeature', ...data }, config);
        return res.data;
    },

    deletePlanFeature: async (id: string, config?: any): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deletePlanFeature', id }, config);
        return res.data;
    },

    bulkUpdatePlanFeatures: async (updates: { id: string, order_number: number }[], config?: any): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'bulkUpdatePlanFeatures', updates }, config);
        return res.data;
    },
};

// =============================================
// COUPON API
// =============================================

export const couponApi = {
    getCoupons: async (): Promise<ApiResponse<Coupon[]>> => {
        const res = await apiClient.post('', { action: 'getCoupons' });
        return res.data;
    },

    createCoupon: async (data: Partial<Coupon>): Promise<ApiResponse<Coupon>> => {
        const res = await apiClient.post('', { action: 'createCoupon', ...data });
        return res.data;
    },

    updateCoupon: async (data: Partial<Coupon> & { id: string }): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updateCoupon', ...data });
        return res.data;
    },

    deleteCoupon: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteCoupon', id });
        return res.data;
    },

    validateCoupon: async (data: { coupon_code: string; plan_id?: string; item_type?: string }): Promise<ApiResponse<Partial<Coupon>>> => {
        const res = await apiClient.post('', { action: 'validateCoupon', ...data }, { skipLoader: true } as any);
        return res.data;
    },
};

// =============================================
// MASTER QUOTES API (QuotesVariant)
// =============================================

export const quotesApi = {
    getQuotes: async (config: any = {}): Promise<ApiResponse<QuotesVariant[]>> => {
        const res = await apiClient.post('', { action: 'getQuotesVariants' }, config);
        return res.data;
    },

    createQuote: async (data: Partial<QuotesVariant>): Promise<ApiResponse<QuotesVariant>> => {
        const res = await apiClient.post('', { action: 'createQuotesVariant', ...data });
        return res.data;
    },

    updateQuote: async (data: Partial<QuotesVariant> & { id: string }, config: any = {}): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updateQuotesVariant', ...data }, config);
        return res.data;
    },

    deleteQuote: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteQuotesVariant', id });
        return res.data;
    },

    // Active quotes available to the current tenant (public + own)
    getActiveQuotes: async (config: any = {}): Promise<ApiResponse<QuotesVariant[]>> => {
        const res = await apiClient.post('', { action: 'getActiveQuotesVariants' }, config);
        return res.data;
    },

    // Tenant saves quote selection (custom=true upserts a tenant-owned row)
    saveTenantQuotes: async (data: Partial<QuotesVariant> & { custom?: boolean; quotes_id?: string }, config: any = {}): Promise<ApiResponse<{ quotes_id: string }>> => {
        const res = await apiClient.post('', { action: 'saveTenantQuotes', ...data }, config);
        return res.data;
    },
};

// =============================================
// ARCHIVE & RESTORE API
// All long-running actions are called with skipLoader: true so the page is not
// blocked — progress is surfaced via the global background-task indicator.
// =============================================

export const archiveApi = {
    // List of already-archived tenants (rows of the ArchiveAndRestore sheet)
    getArchives: async (config: any = {}): Promise<ApiResponse<ArchiveRecord[]>> => {
        const res = await apiClient.post('', { action: 'getArchives' }, config);
        return res.data;
    },

    // Collect all tenant data -> store JSON in Drive -> write ArchiveAndRestore -> delete rows from every sheet.
    // Rejected by backend if ReviewAndRating.flag_show_review === true.
    archiveTenant: async (tenantId: string, config: any = {}): Promise<ApiResponse<ArchiveRecord>> => {
        const res = await apiClient.post('', { action: 'archiveTenant', tenant_id: tenantId }, config);
        return res.data;
    },

    // Read JSON -> write rows back to every sheet -> delete JSON file + ArchiveAndRestore row (does NOT touch ReviewAndRating).
    restoreTenant: async (tenantId: string, config: any = {}): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'restoreTenant', tenant_id: tenantId }, config);
        return res.data;
    },

    // Permanently delete: ArchiveAndRestore row + physical Drive folder + JSON backup. Restore impossible after this.
    deleteArchivePermanent: async (tenantId: string, config: any = {}): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteArchivePermanent', tenant_id: tenantId }, config);
        return res.data;
    },
};
