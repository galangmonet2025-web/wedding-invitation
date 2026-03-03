// =============================================
// TYPES - Wedding SaaS Platform
// =============================================

// Roles
export type Role = 'superadmin' | 'tenant_admin' | 'staff';

// Plan Types
export type PlanType = 'free' | 'pro' | 'premium';

// Guest Status
export type GuestStatus = 'confirmed' | 'declined' | 'pending';

// Checkin Status
export type CheckinStatus = 'checked_in' | 'not_checked_in';

// Tenant Status
export type TenantStatus = 'active' | 'suspended';

// =============================================
// Entities
// =============================================

export interface Tenant {
    id: string;
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    domain_slug: string;
    plan_type: PlanType;
    guest_limit: number;
    created_at: string;
    status_account: TenantStatus;
    payment_deadline: string;
    status_payment: 'Menunggu pembayaran' | 'Sudah dibayar';
}

export interface User {
    id: string;
    username: string;
    role: Role;
    tenant_id: string;
    created_at: string;
}

export interface Guest {
    id: string;
    tenant_id: string;
    name: string;
    phone: string;
    category: string;
    invitation_code: string;
    status: GuestStatus;
    number_of_guests: number;
    checkin_status: CheckinStatus;
    created_at: string;
}

export interface Wish {
    id: string;
    tenant_id: string;
    guest_name: string;
    message: string;
    created_at: string;
}

export interface Gift {
    id: string;
    tenant_id: string;
    guest_name: string;
    amount: number;
    bank_name: string;
    created_at: string;
}

export interface ActivityLog {
    id: string;
    tenant_id: string;
    user_id: string;
    action: string;
    created_at: string;
}

// =============================================
// Auth
// =============================================

export interface TokenPayload {
    user_id: string;
    role: Role;
    tenant_id: string;
    expired_at: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterTenantRequest {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    domain_slug: string;
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
    tenant: Tenant;
}

// =============================================
// API Response
// =============================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    message: string;
}

// =============================================
// Dashboard
// =============================================

export interface TenantDashboard {
    total_guests: number;
    total_confirmed: number;
    total_declined: number;
    total_pending: number;
    total_wishes: number;
    total_gifts: number;
    total_nominal: number;
    guest_growth: { date: string; count: number }[];
    rsvp_breakdown: { name: string; value: number }[];
}

export interface GlobalDashboard {
    total_tenants: number;
    total_active_tenants: number;
    total_guests_system: number;
    revenue_estimation: number;
    plan_distribution: { name: string; value: number }[];
    tenant_growth: { date: string; count: number }[];
}

// =============================================
// Guest Management
// =============================================

export interface CreateGuestRequest {
    name: string;
    phone: string;
    category: string;
    status: GuestStatus;
    number_of_guests: number;
}

export interface UpdateGuestRequest extends CreateGuestRequest {
    id: string;
}

export interface GuestFilters {
    search: string;
    status: GuestStatus | '';
    category: string;
    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

// =============================================
// Tenant Management
// =============================================

export interface CreateTenantRequest {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    domain_slug: string;
    plan_type: PlanType;
    admin_username: string;
    admin_password: string;
}

export interface UpdateTenantRequest {
    id: string;
    plan_type?: PlanType;
    guest_limit?: number;
    status_account?: TenantStatus;
    status_payment?: 'Menunggu pembayaran' | 'Sudah dibayar';
}

// =============================================
// Invitation Content
// =============================================

export interface TimelineItem {
    tanggal: string;
    judul: string;
    deskripsi: string;
}

export interface InvitationContent {
    id: string;
    tenant_id: string;

    // Tenant info injected from Backend
    bride_name?: string;
    groom_name?: string;
    wedding_date?: string;
    tanggal_akad?: string;

    jam_awal_akad?: string;
    jam_akhir_akad?: string;
    jam_awal_resepsi?: string;
    jam_akhir_resepsi?: string;

    flag_lokasi_akad_dan_resepsi_berbeda: boolean | string;
    akad_map: string;
    nama_lokasi_akad: string;
    keterangan_lokasi_akad: string;
    resepsi_map: string;
    nama_lokasi_resepsi: string;
    keterangan_lokasi_resepsi: string;
    flag_tampilkan_nama_orang_tua: boolean | string;
    nama_bapak_laki_laki: string;
    nama_ibu_laki_laki: string;
    nama_bapak_perempuan: string;
    nama_ibu_perempuan: string;
    flag_tampilkan_sosial_media_mempelai: boolean | string;
    account_media_sosial_laki_laki: string;
    account_media_sosial_perempuan: string;
    flag_pakai_timeline_kisah: boolean | string;
    timeline_kisah: string;
    tampilkan_amplop_online: boolean | string;
    nama_bank_1: string;
    nama_rekening_bank_1: string;
    nomor_rekening_bank_1: string;
    nama_bank_2: string;
    nama_rekening_bank_2: string;
    nomor_rekening_bank_2: string;
    custom_kalimat_1: string;
    custom_kalimat_2: string;
    custom_kalimat_3: string;
    custom_kalimat_4: string;
    flag_pakai_kalimat_pembuka_custom: boolean | string;
    kalimat_pembuka_undangan: string;
    flag_pakai_kalimat_penutup_custom: boolean | string;
    kalimat_penutup_undangan: string;
    link_backsound_music: string;
}

