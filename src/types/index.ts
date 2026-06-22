// =============================================
// TYPES - Wedding SaaS Platform
// =============================================

// Roles
export type Role = 'superadmin' | 'tenant_admin' | 'staff';

// Plan Types
export type PlanType = 'basic' | 'pro' | 'premium';

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
    bride_nickname?: string;
    groom_name: string;
    groom_nickname?: string;
    religion?: string;
    wedding_date: string;
    domain_slug: string;
    plan_type: PlanType;
    guest_limit: number;
    theme_id?: string;
    quotes_id?: string;
    created_at: string;
    status_account: TenantStatus;
    payment_deadline: string;
    status_payment: 'Menunggu pembayaran' | 'Sudah dibayar';
}

// Religion options shared across register, master quotes & content settings
export const RELIGION_OPTIONS = [
    'Islam',
    'Kristen Protestan',
    'Katolik',
    'Hindu',
    'Buddha',
    'Konghucu',
] as const;

export interface QuotesVariant {
    id: string;
    religion_enum: string;
    title: string;
    quote_1: string;
    quote_2: string;
    quote_3: string;
    quote_4: string;
    quote_5: string;
    quote_6: string;
    quote_7: string;
    quote_by_1: string;
    quote_by_2: string;
    quote_by_3: string;
    quote_by_4: string;
    quote_by_5: string;
    quote_by_6: string;
    quote_by_7: string;
    active: boolean | string;
    flag_default_quotes: boolean | string;
    tenant_id?: string;
    user_id?: string;
    created_at?: string;
    update_at?: string;
    // Enrichment from backend list endpoint
    creator_username?: string;
    tenant_slug?: string;
    tenant_username?: string;
}

export interface User {
    id: string;
    username: string;
    role: Role;
    tenant_id: string;
    plan_type?: PlanType;
    status_payment?: string;
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
    flag_sudah_kirim_undangan_via_whatsapp?: boolean | string;
    flag_sudah_isi_ucapan?: boolean | string;
    flag_sudah_kirim_hadiah?: boolean | string;
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
    username?: string;
    role?: string;
    action: string;
    created_at: string;
}

export interface ThemeAssetMedia {
    media_type: 'image' | 'video';
    media_cdn_url: string;
    media_name: string;
    media_size: string;       // size in KB as string ('' for youtube)
    media_extension: string;  // 'webp' | 'png' | 'mp4' | 'youtube' | ...
    media_id: string;         // Drive file id ('' for youtube)
    media_code: string;       // image_1, video_1, ...
}

export interface Theme {
    id: string;
    code?: string;
    name: string;
    html_template?: string;
    css_template?: string;
    js_template?: string;
    plan_type: 'basic' | 'pro' | 'premium';
    style_category?: string;
    preview_image?: string;
    flag_draft?: boolean | string;
    flag_use_system_action_button?: boolean | string;
    image_types?: string[];
    asset_media_list?: ThemeAssetMedia[];
    created_at: string;
}

export interface ImageRecord {
    id: string;
    tenant_id: string;
    image_type: string;
    file_name: string;
    drive_file_id: string;
    drive_url: string;
    cdn_url: string;
    width: number;
    height: number;
    size_kb: number;
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
    bride_nickname?: string;
    groom_name: string;
    groom_nickname?: string;
    religion?: string;
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
    tenant?: Tenant;
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
    bride_name?: string;
    groom_name?: string;
    wedding_date?: string;
    domain_slug?: string;
    plan_type?: PlanType;
    guest_limit?: number;
    theme_id?: string;
    status_account?: TenantStatus;
    payment_deadline?: string;
    status_payment?: 'Menunggu pembayaran' | 'Sudah dibayar';
}

// =============================================
// Theme Management
// =============================================

export interface CreateThemeRequest {
    name: string;
    html_template?: string;
    css_template?: string;
    js_template?: string;
    plan_type: 'basic' | 'pro' | 'premium';
    style_category?: string;
    preview_image?: string;
    flag_draft?: boolean | string;
    flag_use_system_action_button?: boolean | string;
    image_types?: string[];
    asset_media_list?: ThemeAssetMedia[];
}

export interface UpdateThemeRequest {
    id: string;
    name: string;
    html_template?: string;
    css_template?: string;
    js_template?: string;
    plan_type: 'basic' | 'pro' | 'premium';
    style_category?: string;
    preview_image?: string;
    flag_draft?: boolean | string;
    flag_use_system_action_button?: boolean | string;
    image_types?: string[];
    asset_media_list?: ThemeAssetMedia[];
}

// =============================================
// Image Management
// =============================================

export interface UploadImageRequest {
    tenant_id: string;
    image_type: string;
    file_name: string;
    base64_data: string;
    mime_type: string;
    width?: number;
    height?: number;
    size_kb?: number;
}

export interface UploadImageResponse {
    id: string;
    file_name: string;
    drive_file_id: string;
    drive_url: string;
    cdn_url: string;
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
    bride_nickname?: string;
    groom_name?: string;
    groom_nickname?: string;
    religion?: string;
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
    is_fitur_tamu_spesial: string; // boolean string

    // Live Streaming
    flag_pakai_live_streaming: string; // boolean string
    link_live_streaming: string;
    platform_live_streaming: string;

    // Timeline
    flag_pakai_timeline_kisah: string; // boolean string;
    timeline_kisah: string;
    tampilkan_amplop_online: boolean | string;
    nama_bank_1: string;
    nama_rekening_bank_1: string;
    nomor_rekening_bank_1: string;
    flag_pakai_qris_rekening_1?: boolean | string;
    gambar_qris_rekening_1?: string;
    
    flag_pakai_2_rekening?: boolean | string;
    nama_bank_2: string;
    nama_rekening_bank_2: string;
    nomor_rekening_bank_2: string;
    flag_pakai_qris_rekening_2?: boolean | string;
    gambar_qris_rekening_2?: string;
    custom_kalimat_1: string;
    custom_kalimat_2: string;
    custom_kalimat_3: string;
    custom_kalimat_4: string;
    flag_pakai_kalimat_pembuka_custom: boolean | string;
    kalimat_pembuka_undangan: string;
    flag_pakai_kalimat_penutup_custom: boolean | string;
    kalimat_penutup_undangan: string;
    link_backsound_music: string;

    // Gift Delivery Offline
    flag_kirim_hadiah_offline?: boolean | string;
    map_kirim_hadiah_offline?: string;
    nama_lokasi_kirim_hadiah_offline?: string;
    alamat_lokasi_kirim_hadiah_offline?: string;

    // Advanced Features
    is_fitur_gallery?: boolean | string;
    galleries?: { url: string; caption?: string }[];
    is_fitur_cerita?: boolean | string;
    love_stories?: { title: string; date: string; content: string }[];
    wa_blast_template?: string;

    // Instagram Story Reply Feature (ADD_FTR_STORY_IG)
    flag_pakai_additional_feature_story_balasan_instagram?: boolean | string;
    frame_balasan_instagram?: string;
    link_balasan_instagram?: string;
    sample_story_1?: string;
    sample_story_2?: string;
    sample_story_3?: string;

    // Social Media configurations from WebsiteConfig
    flag_use_tiktok_webconfig?: boolean | string;
    flag_use_youtube_webconfig?: boolean | string;
    flag_use_instagram_webconfig?: boolean | string;
    flag_use_whatsapp_webconfig?: boolean | string;
    url_tiktok_webconfig?: string;
    url_youtube_webconfig?: string;
    url_instagram_webconfig?: string;
    url_whatsapp_webconfig?: string;
}

// =============================================
// Additional Features
// =============================================

export interface MstAdditionalFeature {
    id: string;
    feature_code: string;
    feature_name: string;
    description?: string;
    is_required_tenant_input: boolean;
    input_data_type: 'gambar' | 'text' | 'link' | 'boolean' | 'empty' | '';
    output_data_type: 'gambar' | 'text' | 'link' | 'boolean' | 'empty' | '';
    active: boolean;
    price: number;
    created_at: string;
}

export interface TenantActiveFeature {
    id: string | null;
    tenant_id: string;
    additional_feature_id: string;
    
    // MstData Joined
    feature_name?: string;
    description?: string;
    is_required_tenant_input?: boolean;
    input_data_type?: 'gambar' | 'text' | 'link' | 'boolean' | 'empty' | '';
    output_data_type?: 'gambar' | 'text' | 'link' | 'boolean' | 'empty' | '';
    mst_active?: boolean;
    price?: number;

    input_tenant_data: string;
    output_data: string;
    active: boolean;
    payment_status: 'Menunggu pembayaran' | 'Sudah dibayar';
}

// =============================================
// Website Configuration
// =============================================

export interface WebsiteConfig {
    id?: string;
    site_name: string;
    site_url: string;
    site_logo: string;
    site_instagram: string;
    site_tiktok: string;
    site_youtube: string;
    contact_email: string;
    contact_whatsapp: string;
    tagline: string;
    site_description: string;
    site_code_html: string;
    site_code_css: string;
    site_code_js: string;
    primary_color: string;
    accent_color: string;
    plans?: MstPlanType[];
    plan_features?: MstPlanFeature[];
    additional_features?: MstAdditionalFeature[];
    features?: MstAdditionalFeature[];
    reviews?: ReviewAndRating[];
}

// =============================================
// Review and Rating
// =============================================

export interface ReviewAndRating {
    id: string;
    tenant_id: string;
    comment: string;
    rate_star: number;
    wedding_date: string;
    bride_name: string;
    groom_name: string;
    domain_slug: string;
    plan_type: string;
    theme_id: string;
    alamat: string;
    flag_show_review: boolean | string;
    created_at: string;
}

// =============================================
// Archive & Restore
// =============================================

// One row of the ArchiveAndRestore sheet (a tenant whose data has been archived).
export interface ArchiveRecord {
    id: string;
    tenant_id: string;
    slug: string;
    wedding_date: string;
    groom_name: string;
    bride_name: string;
    plan_type: string;
    status_payment: string;
    tanggal_archive: string;
    url_json: string;
}

// =============================================
// Payment / Transaction
// =============================================

export type TransactionStatus = 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny' | 'refund';
export type TransactionItemType = 'feature' | 'plan';

export interface Transaction {
    id: string;             // Order ID (INV-xxx)
    tenant_id: string;
    tenant_name?: string;   
    item_type: TransactionItemType;
    item_id: string;        
    item_description: string; // KOLOM BARU
    amount: number;
    status: TransactionStatus;
    snap_token?: string;
    payment_method?: string;
    domain_slug?: string; // KOLOM BARU
    created_at: string;
    updated_at?: string;
}

export interface CreateTransactionRequest {
    item_type: TransactionItemType;
    item_id: string;
    item_name: string;
    amount: number;
    coupon_code?: string;
}

// =============================================
// Coupon
// =============================================

export type CouponDiscountType = 'percent' | 'nominal';

export interface Coupon {
    id: string;
    begin_date: string;
    end_date: string;
    plan_id: string;
    coupon_code: string;
    discount_type: CouponDiscountType;
    percent_discount: number | string;
    nominal_discount: number | string;
    catatan: string;
    user_id: string;
    active: boolean | string;
    created_at: string;
    updated_at: string;
}

export interface MstPlanType {
    plan_type: PlanType;
    guest_limit: number;
    price: number;
}

export interface MstPlanFeature {
    id: string;
    plan_id: PlanType;
    feature: string;
    order_number: number;
    active: boolean | string;
}
