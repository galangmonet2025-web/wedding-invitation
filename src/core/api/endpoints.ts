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
} from '@/types';

// =============================================
// AUTH API
// =============================================

export const authApi = {
    login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
        const res = await apiClient.post('', { action: 'login', ...data });
        return res.data;
    },

    registerTenant: async (data: RegisterTenantRequest): Promise<ApiResponse<LoginResponse>> => {
        const res = await apiClient.post('', { action: 'registerTenant', ...data });
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
        const res = await apiClient.post('', { action: 'getDashboard' });
        return res.data;
    },

    getGlobalDashboard: async (): Promise<ApiResponse<GlobalDashboard>> => {
        const res = await apiClient.post('', { action: 'getGlobalDashboard' });
        return res.data;
    },

    getPendingActions: async (): Promise<ApiResponse<{ incomplete_tenants: any[] }>> => {
        const res = await apiClient.post('', { action: 'getPendingActions' });
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

    updateGuest: async (data: UpdateGuestRequest): Promise<ApiResponse<Guest>> => {
        const res = await apiClient.post('', { action: 'updateGuest', ...data });
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

    createTenant: async (data: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
        const res = await apiClient.post('', { action: 'createTenant', ...data });
        return res.data;
    },

    updateTenant: async (data: UpdateTenantRequest): Promise<ApiResponse<Tenant>> => {
        const res = await apiClient.post('', { action: 'updateTenant', ...data });
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

    createTheme: async (data: CreateThemeRequest): Promise<ApiResponse<Theme>> => {
        const res = await apiClient.post('', { action: 'createTheme', ...data });
        return res.data;
    },

    updateTheme: async (data: UpdateThemeRequest): Promise<ApiResponse<Theme>> => {
        const res = await apiClient.post('', { action: 'updateTheme', ...data });
        return res.data;
    },

    deleteTheme: async (id: string): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'deleteTheme', id });
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

    updateContent: async (data: Partial<InvitationContent>): Promise<ApiResponse<InvitationContent>> => {
        const res = await apiClient.post('', { action: 'updateInvitationContent', ...data });
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

    updateConfig: async (data: Partial<WebsiteConfig>): Promise<ApiResponse<WebsiteConfig>> => {
        const res = await apiClient.post('', { action: 'updateWebsiteConfig', ...data });
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
    getInvitation: async (slug: string, guestid?: string | null) => {
        const payload: any = { action: 'getPublicInvitation', slug };
        if (guestid) payload.guestid = guestid;
        const res = await publicClient.post('', JSON.stringify(payload));
        return res.data;
    },

    submitRSVP: async (data: { slug: string; invitation_code: string; status: string; number_of_guests?: number }) => {
        const res = await publicClient.post('', JSON.stringify({ action: 'submitPublicRSVP', ...data }));
        return res.data;
    },

    submitWish: async (data: { slug: string; guest_name: string; message: string }) => {
        const res = await publicClient.post('', JSON.stringify({ action: 'submitPublicWish', ...data }));
        return res.data;
    },

    checkGuest: async (data: { slug: string; name: string }) => {
        const res = await publicClient.post('', JSON.stringify({ action: 'checkPublicGuest', ...data }));
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

    getTenantFeatures: async (tenantId?: string): Promise<ApiResponse<TenantActiveFeature[]>> => {
        const payload: any = { action: 'getTenantActiveFeatures' };
        if (tenantId) payload.tenant_id = tenantId;
        const res = await apiClient.post('', payload);
        return res.data;
    },
    
    updateTenantFeature: async (data: Partial<TenantActiveFeature>): Promise<ApiResponse<null>> => {
        const res = await apiClient.post('', { action: 'updateTenantActiveFeature', ...data });
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
        const res = await apiClient.post('', { action: 'getReviewByTenant' });
        return res.data;
    },
};
