# 💍 Wedding SaaS Platform

A complete **multi-tenant SaaS platform** for digital wedding invitation management. Built with React + Vite + TypeScript on the frontend and Google Apps Script + Google Spreadsheet on the backend.

![Platform Overview](https://img.shields.io/badge/Platform-Wedding%20SaaS-gold)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Multi-Tenant Flow](#multi-tenant-flow)
3. [Folder Structure](#folder-structure)
4. [Tech Stack](#tech-stack)
5. [Features](#features)
6. [Database Structure](#database-structure)
7. [API Documentation](#api-documentation)
8. [Setup Guide](#setup-guide)
9. [Deployment Guide](#deployment-guide)
10. [Security](#security)
11. [Scalability Notes](#scalability-notes)

---

## 🏗️ Architecture Overview

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌──────────────────┐
│  Frontend (React)   │────▶│  Google Apps Script API   │────▶│ Google Sheets DB │
│  Deployed: Vercel   │◀────│  Deployed: Web App        │◀────│                  │
└─────────────────────┘     └──────────────────────────┘     └──────────────────┘
         │                              │
    ┌────┴────┐                  ┌──────┴──────┐
    │ Zustand │                  │   Services  │
    │ Stores  │                  ├─────────────┤
    ├─────────┤                  │ AuthService │
    │ authStore│                 │ TenantSvc   │
    │ guestStore│                │ GuestSvc    │
    │ themeStore│                │ DashSvc     │
    └─────────┘                  │ WishSvc     │
                                 │ GiftSvc     │
                                 │ PermissionSvc│
                                 │ ActivitySvc  │
                                 └─────────────┘
```

### Key Architectural Principles:
- **Multi-tenant strict isolation** — every data query filtered by `tenant_id`
- **RBAC (Role-Based Access Control)** — superadmin, tenant_admin, staff
- **Layered backend** — separated services even in Google Apps Script
- **Feature-based frontend** — modular, scalable folder structure
- **Token-based auth** — custom JWT-like tokens with SHA256 signatures

---

## 🔄 Multi-Tenant Flow

```
1. Superadmin creates Tenant ──▶ Auto-creates tenant_admin user
2. Tenant Admin logs in ──▶ Token contains { user_id, role, tenant_id }
3. Every API call:
   ├── Extract tenant_id from TOKEN (never from frontend)
   ├── Validate role permissions
   ├── Filter data by tenant_id
   └── Return only tenant-scoped data
4. Superadmin can:
   ├── View ALL tenants
   ├── Switch tenant context
   └── See global analytics
```

### Tenant Isolation Rules:
- Backend **NEVER** trusts `tenant_id` from frontend
- All queries filter by `tenant_id` extracted from token
- Superadmin is the ONLY role that can access cross-tenant data
- Token validation happens on EVERY request

---

## 📁 Folder Structure

```
wedding-saas-platform/
├── index.html                  # Entry HTML
├── package.json                # Dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind with wedding theme
├── tsconfig.json               # TypeScript strict mode
├── .env                        # Environment variables
├── .env.example                # Env template
│
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component
│   ├── index.css               # Global styles + design system
│   ├── vite-env.d.ts           # Vite type declarations
│   │
│   ├── types/
│   │   └── index.ts            # All TypeScript interfaces
│   │
│   ├── core/
│   │   ├── api/
│   │   │   ├── apiClient.ts    # Axios instance + interceptors
│   │   │   └── endpoints.ts    # All API endpoints
│   │   ├── router/
│   │   │   └── index.tsx       # React Router config
│   │   ├── guards/
│   │   │   └── ProtectedRoute.tsx  # Route guard with RBAC
│   │   └── layout/
│   │       └── DashboardLayout.tsx # Sidebar + topbar layout
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── DataTable.tsx   # Reusable data table
│   │   │   ├── Modal.tsx       # Reusable modal
│   │   │   ├── Loading.tsx     # Loading states
│   │   │   ├── ErrorBoundary.tsx   # Error boundary
│   │   │   ├── Pagination.tsx  # Pagination component
│   │   │   └── StatCard.tsx    # Dashboard stat card
│   │   └── hooks/
│   │       └── useThemeStore.ts # Dark mode store
│   │
│   └── features/
│       ├── auth/
│       │   ├── pages/
│       │   │   ├── LoginPage.tsx
│       │   │   └── RegisterPage.tsx
│       │   └── store/
│       │       └── authStore.ts
│       ├── dashboard/
│       │   └── pages/
│       │       ├── DashboardPage.tsx
│       │       └── GlobalDashboardPage.tsx
│       ├── guest/
│       │   ├── pages/
│       │   │   └── GuestPage.tsx
│       │   └── store/
│       │       └── guestStore.ts
│       ├── tenant/
│       │   └── pages/
│       │       └── TenantPage.tsx
│       ├── wishes/
│       │   └── pages/
│       │       └── WishesPage.tsx
│       ├── gifts/
│       │   └── pages/
│       │       └── GiftsPage.tsx
│       └── activity/
│           └── pages/
│               └── ActivityPage.tsx
│
└── backend/
    └── Code.gs                 # Full Google Apps Script backend
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI Library |
| Vite 5 | Build tool & dev server |
| TypeScript | Type safety (strict mode) |
| TailwindCSS 3 | Utility-first CSS |
| Zustand | State management |
| React Router 6 | Client-side routing |
| Axios | HTTP client |
| Recharts | Charts (Pie, Area, Bar) |
| react-hot-toast | Toast notifications |
| react-icons | Icon library |
| qrcode.react | QR code generation |

### Backend
| Technology | Purpose |
|-----------|---------|
| Google Apps Script | REST API server |
| Google Spreadsheet | NoSQL-like database |
| SHA-256 | Password hashing |
| Custom Token | JWT-like authentication |

---

## ✨ Features

### Authentication
- ✅ Login / Register
- ✅ Password hashing (SHA-256)
- ✅ Token generation & validation
- ✅ Token expiration (24h)
- ✅ Auto-logout on token expiry

### Multi-Tenant
- ✅ Strict tenant isolation
- ✅ Tenant CRUD (superadmin)
- ✅ Plan limitations (Free/Pro/Premium)
- ✅ Suspend / reactivate tenants
- ✅ Plan upgrades

### Dashboard
- ✅ Tenant dashboard with stats
- ✅ RSVP pie chart
- ✅ Guest growth area chart
- ✅ Global dashboard (superadmin)
- ✅ Revenue estimation (superadmin)

### Guest Management
- ✅ Full CRUD operations
- ✅ Search & filter
- ✅ Pagination
- ✅ Bulk delete
- ✅ CSV import / export
- ✅ Auto invitation code
- ✅ QR code display
- ✅ Check-in system

### Wishes & Gifts
- ✅ Wish wall with card layout
- ✅ Gift tracking with amounts
- ✅ Total gift amount summary

### Activity Log
- ✅ All actions logged
- ✅ Timeline view grouped by date
- ✅ Action icons & colors

### UI/UX
- ✅ Elegant wedding theme (gold accent)
- ✅ Dark mode toggle
- ✅ Responsive design
- ✅ Sidebar navigation
- ✅ Glassmorphism effects
- ✅ Micro-animations
- ✅ Toast notifications
- ✅ Loading states & skeletons
- ✅ Error boundaries

### Security
- ✅ Password hashing
- ✅ Token-based authentication
- ✅ RBAC on every endpoint
- ✅ Tenant isolation on every query
- ✅ Input sanitization
- ✅ Rate limiting
- ✅ No sensitive data in responses

---

## 🗄️ Database Structure (Google Spreadsheet)

### Sheet: Tenants
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bride_name | String | Bride's name |
| groom_name | String | Groom's name |
| wedding_date | Date | Wedding date |
| domain_slug | String | URL slug |
| plan_type | Enum | free / pro / premium |
| guest_limit | Number | Max guests (-1 = unlimited) |
| created_at | DateTime | Creation timestamp |
| status | Enum | active / suspended |

### Sheet: Users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| username | String | Login username |
| password_hash | String | SHA-256 hashed password |
| role | Enum | superadmin / tenant_admin / staff |
| tenant_id | UUID | FK to Tenants |
| created_at | DateTime | Creation timestamp |

### Sheet: Guests
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to Tenants |
| name | String | Guest full name |
| phone | String | Phone number |
| category | String | Family / Friends / Work / VIP |
| invitation_code | String | Auto-generated code |
| status | Enum | confirmed / declined / pending |
| number_of_guests | Number | Pax count |
| checkin_status | Enum | checked_in / not_checked_in |
| created_at | DateTime | Creation timestamp |

### Sheet: Wishes
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to Tenants |
| guest_name | String | Guest name |
| message | String | Wish message |
| created_at | DateTime | Creation timestamp |

### Sheet: Gifts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to Tenants |
| guest_name | String | Guest name |
| amount | Number | Gift amount (IDR) |
| bank_name | String | Bank name |
| created_at | DateTime | Creation timestamp |

### Sheet: ActivityLogs
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | FK to Tenants |
| user_id | UUID | FK to Users |
| action | String | Action type |
| created_at | DateTime | Creation timestamp |

---

## 📡 API Documentation

### Base URL
```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

### Authentication
All authenticated endpoints require a `token` parameter.

- **GET requests**: Pass token as query parameter `?token=...`
- **POST requests**: Include token in JSON body `{ "token": "..." }`

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### Endpoints

#### Auth (Public)
| Method | Action | Description | Body |
|--------|--------|-------------|------|
| POST | `login` | User login | `{ username, password }` |
| POST | `registerTenant` | Register new wedding | `{ bride_name, groom_name, wedding_date, domain_slug, username, password }` |

#### Dashboard (Auth Required)
| Method | Action | Roles | Description |
|--------|--------|-------|-------------|
| GET | `getDashboard` | All | Tenant dashboard stats |
| GET | `getGlobalDashboard` | superadmin | System-wide stats |

#### Guests (Auth Required)
| Method | Action | Roles | Body/Params |
|--------|--------|-------|-------------|
| GET | `getGuests` | All | `?search=&status=&category=&page=1&limit=10` |
| POST | `createGuest` | admin+ | `{ name, phone, category, status, number_of_guests }` |
| POST | `updateGuest` | admin+ | `{ id, name, phone, category, status, number_of_guests }` |
| POST | `deleteGuest` | admin+ | `{ id }` |
| POST | `bulkDeleteGuest` | admin+ | `{ ids: [...] }` |
| POST | `checkinGuest` | All | `{ invitation_code }` |
| POST | `importGuests` | admin+ | `{ guests: [...] }` |
| GET | `exportGuests` | All | Returns all guest data |

#### Tenants (Superadmin Only)
| Method | Action | Body |
|--------|--------|------|
| GET | `getTenants` | - |
| POST | `createTenant` | `{ bride_name, groom_name, wedding_date, domain_slug, plan_type, admin_username, admin_password }` |
| POST | `updateTenant` | `{ id, plan_type?, status?, guest_limit? }` |

#### Wishes (Auth Required)
| Method | Action | Roles | Body |
|--------|--------|-------|------|
| GET | `getWishes` | All | - |
| POST | `createWish` | All | `{ guest_name, message }` |
| POST | `deleteWish` | admin+ | `{ id }` |

#### Gifts (Auth Required)
| Method | Action | Roles | Body |
|--------|--------|-------|------|
| GET | `getGifts` | All | - |
| POST | `createGift` | admin+ | `{ guest_name, amount, bank_name }` |
| POST | `deleteGift` | admin+ | `{ id }` |

#### Activity Logs (Auth Required)
| Method | Action | Roles |
|--------|--------|-------|
| GET | `getActivityLogs` | admin+ |

---

## 🚀 Setup Guide

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Account
- Git

### Frontend Setup

```bash
# 1. Clone repository
git clone https://github.com/your-repo/wedding-saas-platform.git
cd wedding-saas-platform

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Edit .env with your Google Apps Script URL
# VITE_API_URL=https://script.google.com/macros/s/YOUR_ID/exec

# 5. Start development server
npm run dev
```

### Backend Setup (Google Apps Script)

1. **Create Google Spreadsheet**
   - Go to [Google Sheets](https://sheets.google.com)
   - Create a new spreadsheet
   - Copy the Spreadsheet ID from the URL

2. **Create Apps Script Project**
   - Go to [script.google.com](https://script.google.com)
   - Create new project
   - Copy the content of `backend/Code.gs` into the editor
   - Replace `YOUR_SPREADSHEET_ID_HERE` with your Spreadsheet ID

3. **Initialize Database**
   - In Apps Script editor, select `setupSpreadsheet` function
   - Click Run ▶️
   - Grant permissions when prompted
   - This creates all sheets with headers and a default superadmin

4. **Seed Sample Data (Optional)**
   - Select `seedSampleData` function
   - Click Run ▶️

5. **Deploy as Web App**
   - Click Deploy > New Deployment
   - Type: Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click Deploy
   - Copy the Web App URL

6. **Update Frontend .env**
   - Paste the Web App URL as `VITE_API_URL`

### Default Credentials
```
Username: admin
Password: admin123
Role: superadmin
```

---

## 🌐 Deployment Guide

### Frontend → Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod

# 4. Set environment variable
vercel env add VITE_API_URL
# Enter your Google Apps Script Web App URL
```

Or connect your GitHub repo to Vercel for auto-deployments.

### Backend → Google Apps Script

1. Deploy as Web App (instructions above)
2. For updates: Deploy > Manage Deployments > Edit > New Version

**Important:** Every time you update the Apps Script code, create a **new version** in the deployment.

---

## 🔒 Security

### Password Security
- Passwords are hashed using **SHA-256** with a server-side salt
- Raw passwords are NEVER stored
- Hash comparison for authentication

### Token Security
- Custom token with `Base64(payload) + SHA256(signature)`
- Token payload: `{ user_id, role, tenant_id, expired_at }`
- 24-hour expiration
- Signature verified on every request

### Tenant Isolation
- `tenant_id` is **ALWAYS** extracted from the token, never from the frontend
- All database queries filter by `tenant_id`
- Cross-tenant access only for `superadmin` role

### Input Validation
- Required field validation
- HTML tag stripping (XSS prevention)
- Input sanitization on all user inputs

### Rate Limiting
- Maximum 30 requests per minute per user
- CacheService-based tracking

### RBAC Enforcement
- Every endpoint validates user role
- Permission checks happen before business logic

---

## 📈 Scalability Notes

### Current Limitations (Google Sheets)
- **10 million cells** per spreadsheet
- **40,000 rows max** per sheet (practical)
- **Concurrent users**: ~30 simultaneous
- **Execution time**: 6 minutes max per request

### Scaling Strategies

1. **Horizontal Spreadsheet Sharding**
   - Separate spreadsheet per tenant (for premium plans)
   - Archive old data to secondary sheets

2. **Caching**
   - Use `CacheService` for frequently accessed data
   - Cache dashboard calculations (TTL: 5 minutes)

3. **Migration Path**
   When outgrowing Google Sheets:
   - **Phase 1**: Move to Firebase Firestore (easy migration)
   - **Phase 2**: Move to PostgreSQL + Node.js/Express
   - **Phase 3**: Full cloud with AWS/GCP

4. **Performance Optimization**
   - Batch operations for bulk inserts
   - Index simulation with sorted data
   - Pagination on all list endpoints

### Recommended Limits per Plan
| Plan | Max Guests | Max Wishes | Max Gifts |
|------|-----------|------------|-----------|
| Free | 100 | 50 | 20 |
| Pro | 500 | 200 | 100 |
| Premium | Unlimited | Unlimited | Unlimited |

---

## 📄 License

MIT License — Feel free to use for commercial and personal projects.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

Built with ❤️ for the wedding industry.
