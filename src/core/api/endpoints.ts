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
};

// =============================================
// DASHBOARD API
// =============================================

export const dashboardApi = {
    getTenantDashboard: async (): Promise<ApiResponse<TenantDashboard>> => {
        const res = await apiClient.get('', { params: { action: 'getDashboard' } });
        return res.data;
    },

    getGlobalDashboard: async (): Promise<ApiResponse<GlobalDashboard>> => {
        const res = await apiClient.get('', { params: { action: 'getGlobalDashboard' } });
        return res.data;
    },
};

// =============================================
// GUEST API
// =============================================

export const guestApi = {
    getGuests: async (filters: GuestFilters): Promise<ApiResponse<PaginatedResponse<Guest>>> => {
        const res = await apiClient.get('', {
            params: { action: 'getGuests', ...filters },
        });
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

    checkinGuest: async (invitation_code: string): Promise<ApiResponse<Guest>> => {
        const res = await apiClient.post('', { action: 'checkinGuest', invitation_code });
        return res.data;
    },

    importGuests: async (guests: CreateGuestRequest[]): Promise<ApiResponse<{ imported: number }>> => {
        const res = await apiClient.post('', { action: 'importGuests', guests });
        return res.data;
    },

    exportGuests: async (): Promise<ApiResponse<Guest[]>> => {
        const res = await apiClient.get('', { params: { action: 'exportGuests' } });
        return res.data;
    },
};

// =============================================
// TENANT API
// =============================================

export const tenantApi = {
    getTenants: async (): Promise<ApiResponse<Tenant[]>> => {
        const res = await apiClient.get('', { params: { action: 'getTenants' } });
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
};

// =============================================
// WISH API
// =============================================

export const wishApi = {
    getWishes: async (): Promise<ApiResponse<Wish[]>> => {
        const res = await apiClient.get('', { params: { action: 'getWishes' } });
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
        const res = await apiClient.get('', { params: { action: 'getGifts' } });
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
        const res = await apiClient.get('', { params: { action: 'getActivityLogs' } });
        return res.data;
    },
};

// =============================================
// INVITATION CONTENT API
// =============================================

export const invitationContentApi = {
    getContent: async (): Promise<ApiResponse<InvitationContent | null>> => {
        const res = await apiClient.get('', { params: { action: 'getInvitationContent' } });
        return res.data;
    },

    updateContent: async (data: Partial<InvitationContent>): Promise<ApiResponse<InvitationContent>> => {
        const res = await apiClient.post('', { action: 'updateInvitationContent', ...data });
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
    getInvitation: async (slug: string) => {
        const res = await publicClient.get('', { params: { action: 'getPublicInvitation', slug } });
        return res.data;
    },

    submitRSVP: async (data: { slug: string; invitation_code: string; status: string; number_of_guests?: number }) => {
        const res = await publicClient.post('', { action: 'submitPublicRSVP', ...data });
        return res.data;
    },

    submitWish: async (data: { slug: string; guest_name: string; message: string }) => {
        const res = await publicClient.post('', { action: 'submitPublicWish', ...data });
        return res.data;
    },
};
