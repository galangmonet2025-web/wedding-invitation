

Saya ingin Anda bertindak sebagai Enterprise SaaS Architect & Senior Fullstack Engineer.

Saya ingin membangun PLATFORM SaaS bernama:

wedding-saas-platform

Stack WAJIB:

Frontend:

* React
* Vite
* TypeScript (strict mode true)
* TailwindCSS
* Zustand
* React Router
* Axios
* Recharts
* Feature-based architecture

Backend:

* Google Apps Script sebagai REST API
* Google Spreadsheet sebagai database
* JSON-only API
* Multi-tenant strict isolation

Deployment:

* Frontend: Vercel
* Backend: Google Apps Script Web App

====================================================================
GOAL
====

Bangun sistem SaaS multi-tenant di mana banyak wedding dapat menggunakan platform yang sama tanpa bisa saling melihat data.

Ini adalah PLATFORM, bukan aplikasi single wedding.

Semua data harus terisolasi per tenant (wedding_id).

====================================================================
MANDATORY ARCHITECTURE RULES
============================

1. MULTI TENANT STRICT ISOLATION

Semua tabel WAJIB memiliki:

tenant_id (wedding_id)

Semua query backend WAJIB:

* Mengambil tenant_id dari token
* Tidak pernah percaya tenant_id dari frontend
* Menolak request jika tenant_id tidak sesuai

Tidak boleh ada endpoint tanpa validasi tenant.

2. ROLE BASED ACCESS CONTROL (RBAC)

Roles:

* superadmin
* tenant_admin
* staff

Permission rules:

superadmin:

* akses semua tenant
* create tenant
* assign admin
* view all dashboard global

tenant_admin:

* hanya akses tenant miliknya
* CRUD guest
* lihat dashboard tenant

staff:

* read-only guest
* check-in tamu

Semua endpoint wajib validasi role.

3. TOKEN STRUCTURE

Token harus menyimpan:

{
user_id,
role,
tenant_id,
expired_at
}

Backend wajib validasi:

* token valid
* role sesuai
* tenant_id valid

4. LAYERED BACKEND STRUCTURE (walau Apps Script)

Pisahkan logic:

AuthService
TenantService
GuestService
DashboardService
WishService
GiftService
PermissionService
ResponseHelper
Validator

Tidak boleh semua logic dalam satu fungsi besar.

====================================================================
DATABASE STRUCTURE (SPREADSHEET)
================================

Sheet: Tenants

* id
* bride_name
* groom_name
* wedding_date
* domain_slug
* plan_type (basic/pro/premium)
* guest_limit
* created_at
* status

Sheet: Users

* id
* username
* password_hash
* role
* tenant_id
* created_at

Sheet: Guests

* id
* tenant_id
* name
* phone
* category
* invitation_code
* status
* number_of_guests
* checkin_status
* created_at

Sheet: Wishes

* id
* tenant_id
* guest_name
* message
* created_at

Sheet: Gifts

* id
* tenant_id
* guest_name
* amount
* bank_name
* created_at

Sheet: ActivityLogs

* id
* tenant_id
* user_id
* action
* created_at

====================================================================
SaaS FEATURES WAJIB
===================

AUTH

* Register tenant (create new wedding)
* Login
* Hash password
* Token generation
* Token expiration
* Logout

TENANT MANAGEMENT (Superadmin only)

* Create tenant
* Suspend tenant
* Upgrade plan
* Set guest limit
* View global stats

PLAN LIMITATION

* Free: max 100 guests
* Pro: max 500 guests
* Premium: unlimited

Backend wajib menolak createGuest jika melebihi limit.

DASHBOARD TENANT

* Total guest
* Total confirmed
* Total declined
* Total wish
* Total gift
* Total nominal
* Pie chart RSVP
* Guest growth chart

GLOBAL DASHBOARD (Superadmin)

* Total tenant
* Total active tenant
* Total guest across system
* Revenue estimation (based on plan)

GUEST MANAGEMENT

* CRUD
* Bulk delete
* Search
* Filter
* Pagination
* Import CSV
* Export CSV
* Auto invitation_code
* QR check-in

ACTIVITY LOG

* Log setiap:

  * login
  * create guest
  * delete guest
  * update guest
  * create tenant

====================================================================
API STRUCTURE
=============

Semua endpoint menggunakan parameter:

?action=

Contoh:

POST ?action=login
POST ?action=registerTenant
GET ?action=getDashboard
GET ?action=getGuests
POST ?action=createGuest
POST ?action=updateGuest
POST ?action=deleteGuest
POST ?action=bulkDeleteGuest
GET ?action=getTenants
POST ?action=createTenant
POST ?action=updateTenant

Semua response format:

{
success: boolean,
data: any,
message: string
}

====================================================================
FRONTEND ARCHITECTURE WAJIB
===========================

Gunakan Feature-Based Structure:

src/
core/
api/
router/
guards/
layout/
shared/
components/
hooks/
utils/
features/
auth/
tenant/
dashboard/
guest/
wishes/
gifts/
activity/

WAJIB:

* Axios instance centralized
* Interceptor inject token
* ProtectedRoute dengan role check
* Zustand modular store per feature
* Reusable DataTable
* Reusable Modal
* Reusable Form
* ErrorBoundary
* Toast notification
* Loading overlay

====================================================================
SECURITY HARDENING
==================

* Hash password
* Token expiration
* Validate role every request
* Validate tenant isolation
* Sanitize input
* Reject unauthorized access
* Centralized error handler
* Basic rate limit
* No sensitive data in response

====================================================================
UI REQUIREMENTS
===============

* Elegant wedding SaaS theme
* Soft gold accent (#C6A769)
* Clean white card
* Sidebar layout
* Topbar with tenant switch (superadmin only)
* Responsive
* Dark mode toggle

====================================================================
OUTPUT WAJIB
============

Berikan output dalam urutan:

1. Architecture Overview
2. Multi-Tenant Flow Explanation
3. Folder Structure
4. Full Frontend Code
5. Full Backend Google Apps Script Code
6. Spreadsheet Setup + Example Data
7. .env Example
8. API Documentation
9. Setup Guide
10. Deployment Guide
11. Security Explanation
12. SaaS Scalability Notes
13. README.md lengkap

TIDAK BOLEH:

* Placeholder
* Pseudo code
* TODO
* Potongan kode tidak lengkap
* Bagian kosong

Jika output terlalu panjang:
Lanjutkan sampai selesai.

====================================================================

Tujuan akhir:
Platform SaaS wedding digital yang siap dijual ke banyak client dan scalable.

dsdsdsd

Saya ingin Anda bertindak sebagai Enterprise SaaS Architect & Senior Fullstack Engineer.

Saya ingin membangun PLATFORM SaaS bernama:

wedding-saas-platform

Stack WAJIB:

Frontend:

* React
* Vite
* TypeScript (strict mode true)
* TailwindCSS
* Zustand
* React Router
* Axios
* Recharts
* Feature-based architecture

Backend:

* Google Apps Script sebagai REST API
* Google Spreadsheet sebagai database
* JSON-only API
* Multi-tenant strict isolation

Deployment:

* Frontend: Vercel
* Backend: Google Apps Script Web App

====================================================================
GOAL
====

Bangun sistem SaaS multi-tenant di mana banyak wedding dapat menggunakan platform yang sama tanpa bisa saling melihat data.

Ini adalah PLATFORM, bukan aplikasi single wedding.

Semua data harus terisolasi per tenant (wedding_id).

====================================================================
MANDATORY ARCHITECTURE RULES
============================

1. MULTI TENANT STRICT ISOLATION

Semua tabel WAJIB memiliki:

tenant_id (wedding_id)

Semua query backend WAJIB:

* Mengambil tenant_id dari token
* Tidak pernah percaya tenant_id dari frontend
* Menolak request jika tenant_id tidak sesuai

Tidak boleh ada endpoint tanpa validasi tenant.

2. ROLE BASED ACCESS CONTROL (RBAC)

Roles:

* superadmin
* tenant_admin
* staff

Permission rules:

superadmin:

* akses semua tenant
* create tenant
* assign admin
* view all dashboard global

tenant_admin:

* hanya akses tenant miliknya
* CRUD guest
* lihat dashboard tenant

staff:

* read-only guest
* check-in tamu

Semua endpoint wajib validasi role.

3. TOKEN STRUCTURE

Token harus menyimpan:

{
user_id,
role,
tenant_id,
expired_at
}

Backend wajib validasi:

* token valid
* role sesuai
* tenant_id valid

4. LAYERED BACKEND STRUCTURE (walau Apps Script)

Pisahkan logic:

AuthService
TenantService
GuestService
DashboardService
WishService
GiftService
PermissionService
ResponseHelper
Validator

Tidak boleh semua logic dalam satu fungsi besar.

====================================================================
DATABASE STRUCTURE (SPREADSHEET)
================================

Sheet: Tenants

* id
* bride_name
* groom_name
* wedding_date
* domain_slug
* plan_type (basic/pro/premium)
* guest_limit
* created_at
* status

Sheet: Users

* id
* username
* password_hash
* role
* tenant_id
* created_at

Sheet: Guests

* id
* tenant_id
* name
* phone
* category
* invitation_code
* status
* number_of_guests
* checkin_status
* created_at

Sheet: Wishes

* id
* tenant_id
* guest_name
* message
* created_at

Sheet: Gifts

* id
* tenant_id
* guest_name
* amount
* bank_name
* created_at

Sheet: ActivityLogs

* id
* tenant_id
* user_id
* action
* created_at

====================================================================
SaaS FEATURES WAJIB
===================

AUTH

* Register tenant (create new wedding)
* Login
* Hash password
* Token generation
* Token expiration
* Logout

TENANT MANAGEMENT (Superadmin only)

* Create tenant
* Suspend tenant
* Upgrade plan
* Set guest limit
* View global stats

PLAN LIMITATION

* Free: max 100 guests
* Pro: max 500 guests
* Premium: unlimited

Backend wajib menolak createGuest jika melebihi limit.

DASHBOARD TENANT

* Total guest
* Total confirmed
* Total declined
* Total wish
* Total gift
* Total nominal
* Pie chart RSVP
* Guest growth chart

GLOBAL DASHBOARD (Superadmin)

* Total tenant
* Total active tenant
* Total guest across system
* Revenue estimation (based on plan)

GUEST MANAGEMENT

* CRUD
* Bulk delete
* Search
* Filter
* Pagination
* Import CSV
* Export CSV
* Auto invitation_code
* QR check-in

ACTIVITY LOG

* Log setiap:

  * login
  * create guest
  * delete guest
  * update guest
  * create tenant

====================================================================
API STRUCTURE
=============

Semua endpoint menggunakan parameter:

?action=

Contoh:

POST ?action=login
POST ?action=registerTenant
GET ?action=getDashboard
GET ?action=getGuests
POST ?action=createGuest
POST ?action=updateGuest
POST ?action=deleteGuest
POST ?action=bulkDeleteGuest
GET ?action=getTenants
POST ?action=createTenant
POST ?action=updateTenant

Semua response format:

{
success: boolean,
data: any,
message: string
}

====================================================================
FRONTEND ARCHITECTURE WAJIB
===========================

Gunakan Feature-Based Structure:

src/
core/
api/
router/
guards/
layout/
shared/
components/
hooks/
utils/
features/
auth/
tenant/
dashboard/
guest/
wishes/
gifts/
activity/

WAJIB:

* Axios instance centralized
* Interceptor inject token
* ProtectedRoute dengan role check
* Zustand modular store per feature
* Reusable DataTable
* Reusable Modal
* Reusable Form
* ErrorBoundary
* Toast notification
* Loading overlay

====================================================================
SECURITY HARDENING
==================

* Hash password
* Token expiration
* Validate role every request
* Validate tenant isolation
* Sanitize input
* Reject unauthorized access
* Centralized error handler
* Basic rate limit
* No sensitive data in response

====================================================================
UI REQUIREMENTS
===============

* Elegant wedding SaaS theme
* Soft gold accent (#C6A769)
* Clean white card
* Sidebar layout
* Topbar with tenant switch (superadmin only)
* Responsive
* Dark mode toggle

====================================================================
OUTPUT WAJIB
============

Berikan output dalam urutan:

1. Architecture Overview
2. Multi-Tenant Flow Explanation
3. Folder Structure
4. Full Frontend Code
5. Full Backend Google Apps Script Code
6. Spreadsheet Setup + Example Data
7. .env Example
8. API Documentation
9. Setup Guide
10. Deployment Guide
11. Security Explanation
12. SaaS Scalability Notes
13. README.md lengkap

TIDAK BOLEH:

* Placeholder
* Pseudo code
* TODO
* Potongan kode tidak lengkap
* Bagian kosong

Jika output terlalu panjang:
Lanjutkan sampai selesai.

====================================================================

Tujuan akhir:
Platform SaaS wedding digital yang siap dijual ke banyak client dan scalable.

