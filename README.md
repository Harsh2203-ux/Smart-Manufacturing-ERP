# ForgeFlow — Smart Manufacturing Management

> **Smart Manufacturing ERP** · Full-stack Enterprise Resource Planning system for digital manufacturing operations management.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)

---

## Overview

**ForgeFlow** is a full-stack Smart Manufacturing ERP built to manage every stage of a manufacturing operation from a single web interface. The system covers production, supply chain, inventory, quality control, HR, and business intelligence — all backed by a secure REST API and persisted in MongoDB.

The project demonstrates a complete modern ERP architecture: a React + TypeScript single-page application communicating with a Node.js / Express REST API, secured by JWT authentication with email OTP verification, and connected to MongoDB Atlas for persistent storage.

---

## Key Features

### Manufacturing
| Module | Description |
|---|---|
| **Manufacturing Orders** | Create, track, and manage production orders from planned to completed |
| **Work Orders** | Individual work order lifecycle — planned, in-progress, on-hold, completed |
| **Bill of Materials** | Multi-level BOM with component lists, quantities, and version management |
| **Production Planning** | Schedule production runs, assign shifts, and link work orders |
| **Machines** | Machine registry, status tracking, capacity and OEE target management |

### Inventory & Warehouse
| Module | Description |
|---|---|
| **Products** | Full product catalogue with SKU, pricing, categories, and reorder levels |
| **Inventory** | Real-time stock levels, adjustments, transfers, and transaction log |
| **Warehouse** | Multi-warehouse management with zone, capacity, and manager tracking |

### Supply Chain & Sales
| Module | Description |
|---|---|
| **Suppliers** | Supplier registry with ratings, payment terms, and lead times |
| **Purchase** | Purchase order creation, line items, status tracking, and delivery |
| **Orders** | Sales order management with customer linking and fulfilment status |
| **Customers** | Customer master with credit limits, payment terms, and contact info |

### Operations & Quality
| Module | Description |
|---|---|
| **Quality Control** | Batch inspections, defect rate tracking, pass/fail recording |
| **Maintenance** | Preventive and corrective maintenance scheduling with asset tracking |

### HR & Attendance
| Module | Description |
|---|---|
| **Employees** | Employee directory with department, position, shift, and status |
| **Attendance** | Daily attendance marking with shift, actual in/out, hours, and overtime |

### Intelligence & System
| Module | Description |
|---|---|
| **Dashboard** | Live KPI cards, machine utilisation, production trend, quick actions |
| **Analytics** | Month-to-date KPIs, QC by production line, order status distribution, CSV export |
| **Reports** | Generate and store production, financial, inventory, and HR reports |
| **Notifications** | System notification feed with mark-read and delete |
| **Settings** | Configurable system settings with role-based access |
| **User Management** | User accounts, role assignment, and active/inactive status |

### Authentication
| Feature | Implementation |
|---|---|
| Email OTP login | 6-digit OTP delivered via Nodemailer / Gmail SMTP, expires in 10 minutes |
| Password login | bcrypt-hashed passwords, configurable salt rounds |
| Registration | Self-registration with email verification |
| JWT sessions | Short-lived access token (8 h) + long-lived refresh token (30 d) |
| Password recovery | Secure reset link with 30-minute expiry |
| Two-factor auth | TOTP-based 2FA setup and verification |
| Remember me | Extended session via persistent refresh token |
| Rate limiting | Separate limits for auth and general API endpoints |

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI component framework |
| TypeScript | ~6.0 | Static typing |
| React Router DOM | 7.x | Client-side routing |
| Vite | 8.x | Build tool and dev server |
| Tailwind CSS | 4.x | Utility-first styling |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18.0.0 | Server runtime |
| Express | 4.x | HTTP framework |
| Mongoose | 8.x | MongoDB ODM |
| jsonwebtoken | 9.x | JWT generation and verification |
| bcryptjs | 2.x | Password hashing |
| Nodemailer | 6.x | Email / OTP delivery |
| Helmet | 7.x | HTTP security headers |
| express-rate-limit | 7.x | API rate limiting |
| express-validator | 7.x | Request validation |
| express-mongo-sanitize | 2.x | NoSQL injection protection |
| Winston | 3.x | Structured logging with daily rotation |
| morgan | 1.x | HTTP request logging |
| compression | 1.x | Gzip response compression |
| cookie-parser | 1.x | HTTP-only cookie support |
| multer | 1.x | File upload handling |
| dotenv | 16.x | Environment variable loading |

### Database
- **MongoDB Atlas** — cloud-hosted MongoDB with TLS, connection pooling, and retry logic

### Development Tools
| Tool | Purpose |
|---|---|
| nodemon | Auto-restart backend on file change |
| ESLint | Linting (frontend and backend) |
| TypeScript ESLint | TypeScript-specific lint rules |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
│              React 19 + TypeScript + Vite (port 5173)           │
│                                                                 │
│   Pages → API layer (fetch + JWT Bearer token) → React state   │
└─────────────────────────────┬───────────────────────────────────┘
                              │  HTTPS / REST  (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js / Express API                        │
│                       (port 5001 / 5000)                        │
│                                                                 │
│   Helmet · CORS · Rate Limiter · Body Parser · Sanitiser        │
│   ↓                                                             │
│   Routes → Middleware (protect · authorize) → Controllers       │
│   ↓                                                             │
│   Mongoose Models → MongoDB Atlas                               │
│   ↓                                                             │
│   Nodemailer → Gmail SMTP (OTP · password reset · welcome)      │
└─────────────────────────────────────────────────────────────────┘
                              │  Mongoose + TLS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MongoDB Atlas                             │
│         18 collections — users, orders, production,             │
│         inventory, quality, maintenance, attendance, …          │
└─────────────────────────────────────────────────────────────────┘
```

**Frontend layer** — A single-page application that manages routing, authentication state, and API communication. All data requests go through typed API helper functions that attach the JWT Bearer token automatically.

**Backend layer** — A RESTful Express API with route-level JWT protection and role-based authorization. Controllers handle business logic and delegate persistence to Mongoose models. Structured logs are written by Winston.

**Database layer** — MongoDB Atlas provides cloud persistence with a TLS-secured connection pool. Mongoose schemas enforce data structure, compute derived fields (e.g. defect rate, order totals), and auto-generate sequential document identifiers.

---

## Project Structure

```
Smart Manufacturing ERP/
├── app/                    # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── api/            # API helper functions and type definitions
│   │   ├── components/     # Shared UI components (Modal, DataTable, etc.)
│   │   ├── context/        # React context (AuthContext)
│   │   ├── data/           # Static dashboard display data
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # DashboardLayout, AuthLayout
│   │   ├── pages/          # One file per ERP module
│   │   ├── routes/         # AppRoutes, ProtectedRoute
│   │   ├── services/       # Auth service layer
│   │   └── types/          # TypeScript type definitions
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                # Node.js + Express REST API
│   ├── src/
│   │   ├── config/         # Environment config and MongoDB connection
│   │   ├── controllers/    # Route handler logic (one per module)
│   │   ├── middleware/      # auth, error, rateLimit, validate, upload
│   │   ├── models/         # Mongoose schemas (18 models)
│   │   ├── routes/         # Express routers (one per module)
│   │   ├── services/       # emailService, notificationService
│   │   └── utils/          # apiResponse, logger
│   ├── package.json
│   └── .env                # ⚠ Never committed — see Environment Variables
│
├── Assets/                 # Project assets
├── Database/               # Database reference files
├── Docs/                   # Project documentation and roadmap
├── Prompts/                # Development prompts
├── References/             # Reference materials
└── README.md
```

---

## Local Setup

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 9.x
- A **MongoDB Atlas** cluster (or local MongoDB instance)
- A **Gmail account** with an App Password for SMTP (or use dev-mode without SMTP)

### 1 — Clone the repository

```bash
git clone <repository-url>
cd "Smart Manufacturing ERP"
```

### 2 — Install backend dependencies

```bash
cd backend
npm install
```

### 3 — Configure backend environment variables

Create `backend/.env` (see [Environment Variables](#environment-variables) below).

### 4 — Start the backend

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

The API will start on `http://localhost:5001/api/v1` (or the port set in `.env`).

### 5 — Install frontend dependencies

Open a new terminal:

```bash
cd app
npm install
```

### 6 — Configure frontend environment variables

Create `app/.env.local`:

```env
VITE_API_URL=http://localhost:5001/api/v1
```

### 7 — Start the frontend

```bash
npm run dev
```

The application will open at `http://localhost:5173`.

### 8 — Build for production

```bash
# Frontend production build
cd app
npm run build
```

---

## Environment Variables

Sensitive configuration is stored in `.env` files and **must never be committed to version control**. Both `.env` files are listed in `.gitignore`.

### `backend/.env` — required variables

```env
# Server
NODE_ENV=development
PORT=5001
API_VERSION=v1

# MongoDB (required)
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# JWT (required — use strong random secrets)
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGINS=http://localhost:5173

# Email / SMTP (optional in development — OTPs print to console if not set)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM_NAME=Smart Manufacturing ERP
EMAIL_FROM_ADDRESS=your-gmail@gmail.com

# Cookie
COOKIE_SECRET=<strong-random-secret>
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Frontend URL (used in reset-password / verify-email links)
FRONTEND_URL=http://localhost:5173
```

### `app/.env.local` — frontend

```env
VITE_API_URL=http://localhost:5001/api/v1
```

> **Security note:** Replace all placeholder values with strong, randomly generated secrets before deploying. Never log or expose `.env` file contents.

---

## Database

The application uses **MongoDB Atlas** as its database. Connection options include TLS enforcement, a configurable connection pool (default: 2–10 connections), and automatic retry on transient network errors.

Mongoose auto-generates sequential human-readable identifiers for records (e.g. `WO-000001`, `ATT-0001`, `QC-7201`) using pre-save hooks. Derived fields such as order totals and defect rates are computed on save.

The backend seeds a default settings document on first startup using an upsert — this is safe to run on every restart.

---

## Email / OTP Delivery

Email delivery is handled by **Nodemailer** configured to use **Gmail SMTP** (port 587, STARTTLS).

The following transactional emails are sent:

| Trigger | Template |
|---|---|
| New account registration | Welcome + email verification link |
| Login (OTP flow) | 6-digit OTP code, expires in 10 minutes |
| Forgot password | Password reset link, expires in 30 minutes |
| Password changed | Security confirmation email |

**Development mode:** If `SMTP_USER` is not set in `.env`, the email service runs in dev-mode — no emails are sent, and all OTP codes and verification links are printed directly to the backend console. This allows the full authentication flow to be tested without an SMTP server.

---

## Current Project Status

The following is fully implemented:

- ✅ Complete email OTP authentication flow (register, login, verify, reset)
- ✅ JWT access + refresh token session management
- ✅ Role-based route protection (12 distinct roles)
- ✅ All 20+ ERP module pages connected to real MongoDB backend
- ✅ Full CRUD operations for all major modules
- ✅ Form validation, error handling, and loading states throughout
- ✅ Analytics dashboard with real database aggregations
- ✅ CSV export for analytics reports
- ✅ Structured API rate limiting (separate limits for auth and general endpoints)
- ✅ Graceful shutdown, structured logging, and upload handling

The application is a project/academic implementation. It has not been hardened for public production deployment.

---

## Future Improvements

- [ ] Production deployment configuration (Docker, Nginx reverse proxy, HTTPS)
- [ ] Automated test suite (unit tests for controllers, integration tests for API routes)
- [ ] CI/CD pipeline (GitHub Actions or similar)
- [ ] Advanced analytics with date-range filtering and trend comparisons
- [ ] PDF report generation (in addition to CSV)
- [ ] Granular permission enforcement at UI level (currently enforced at API level)
- [ ] Real-time notifications via WebSocket
- [ ] Pagination controls in frontend tables
- [ ] File attachment support for orders and maintenance records
- [ ] Multi-language / i18n support
- [ ] Performance optimisation — API response caching, index tuning

---

## Developer

**Hemangkumar Hemantkumar Dave**

B.E. Computer Engineering
Sardar Patel College of Engineering, Bakrol, Anand, Gujarat
Affiliated with Gujarat Technological University (GTU)

---

## Disclaimer

This is an academic / project implementation of a Smart Manufacturing ERP system. While the application implements security fundamentals (JWT authentication, bcrypt password hashing, rate limiting, HTTP security headers, NoSQL injection protection, and input validation), it has not undergone a professional security audit, penetration test, or load test.

Before using this system in a production or commercial environment, the following steps are recommended:

- Professional security review and penetration testing
- Infrastructure hardening (HTTPS, secrets management, firewall rules)
- Comprehensive automated test coverage
- Monitoring, alerting, and backup strategy
- Compliance review appropriate to the deployment jurisdiction

---

*ForgeFlow — Smart Manufacturing Management · Built with Node.js, React, and MongoDB*
