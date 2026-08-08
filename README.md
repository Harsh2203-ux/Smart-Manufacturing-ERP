# Smart Manufacturing ERP

Full-stack enterprise ERP system built with React + Node.js + MongoDB Atlas.

---

## Architecture

```
Smart Manufacturing ERP/
├── app/                    ← React 19 + Vite + TypeScript frontend
│   ├── src/
│   │   ├── api/            ← HTTP client + per-endpoint request functions
│   │   ├── components/     ← Sidebar, TopBar, UI primitives, auth forms
│   │   ├── context/        ← AuthContext (session state machine)
│   │   ├── demo/           ← Dev-only demo session (dead-code-eliminated in prod)
│   │   ├── hooks/          ← useAuth, usePermissions
│   │   ├── layouts/        ← DashboardLayout
│   │   ├── pages/          ← 30+ ERP module pages + all auth pages
│   │   ├── routes/         ← AppRoutes, ProtectedRoute
│   │   ├── services/       ← authService (token lifecycle, session storage)
│   │   └── types/          ← TypeScript interfaces (auth, dashboard)
│   └── .env.local          ← Frontend environment (VITE_API_URL, VITE_DEMO_MODE)
│
└── backend/                ← Express + MongoDB REST API
    ├── src/
    │   ├── config/         ← index.js (all env vars), database.js
    │   ├── controllers/    ← authController + 12 ERP controllers
    │   ├── middleware/      ← auth (JWT), error, rateLimit, upload, validate
    │   ├── models/         ← User, Product, Order, Production, Inventory,
    │   │                     Machine, Employee, Customer, Supplier,
    │   │                     Notification, Report, Settings
    │   ├── routes/         ← auth + 12 ERP route files
    │   ├── services/       ← authService (JWT helpers), emailService (Nodemailer)
    │   ├── utils/          ← apiResponse, helpers, logger (Winston)
    │   ├── validators/     ← auth.js (express-validator rule sets)
    │   ├── app.js          ← Express app (security, CORS, routes)
    │   └── server.js       ← Bootstrap (DB connect, listen, graceful shutdown)
    ├── generate-env.js     ← One-time script to create .env with strong secrets
    └── .env.example        ← Template for all environment variables
```

---

## Quick Start

### Step 1 — MongoDB Atlas

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and create a free account
2. Create a free **M0 cluster** (any region)
3. **Database Access** → Add a new database user with `readWrite` role
4. **Network Access** → Add IP Address → Allow access from anywhere (`0.0.0.0/0`)
5. **Connect** → Drivers → Node.js → copy the connection string

### Step 2 — Backend environment

```bash
cd backend

# Generate .env with strong auto-generated secrets
node generate-env.js

# Edit .env and paste your MongoDB connection string:
# MONGO_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/smart_mfg_erp?retryWrites=true&w=majority
```

> **Email in development:** Leave `SMTP_USER` empty — the server runs in **Dev Email Mode**.
> OTPs and verification links are printed to the terminal instead of being emailed.
> No SMTP setup is required to test the full auth flow.

### Step 3 — Install dependencies

```bash
# Terminal 1 — Backend
cd backend
npm install

# Terminal 2 — Frontend
cd app
npm install
```

### Step 4 — Run both servers

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd app
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | | `development` or `production` |
| `PORT` | | HTTP port (default: `5000`) |
| `API_VERSION` | | Route prefix (default: `v1`) |
| `MONGO_URI` | ★ | MongoDB Atlas connection string |
| `JWT_SECRET` | ★ | 64+ char random secret for access tokens |
| `JWT_EXPIRES_IN` | | Access token lifetime (default: `8h`) |
| `JWT_REFRESH_SECRET` | ★ | 64+ char random secret for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | | Refresh token lifetime (default: `30d`) |
| `BCRYPT_SALT_ROUNDS` | | Password hash rounds (default: `12`) |
| `CORS_ORIGINS` | | Comma-separated allowed origins |
| `COOKIE_SECRET` | | Cookie signing secret |
| `COOKIE_SECURE` | | `true` in production (HTTPS only) |
| `SMTP_HOST` | | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | | SMTP port (e.g. `587`) |
| `SMTP_USER` | | Email address — **leave empty for Dev Email Mode** |
| `SMTP_PASS` | | Gmail App Password or SMTP password |
| `EMAIL_FROM_NAME` | | Sender display name |
| `EMAIL_FROM_ADDRESS` | | Sender email address |
| `FRONTEND_URL` | | Frontend origin for email links |

### Frontend — `app/.env.local`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:5000/api/v1`) |
| `VITE_DEMO_MODE` | `true` to enable Demo Mode button on login page |

---

## API Reference

All endpoints are prefixed with `/api/v1`

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Sign in |
| `POST` | `/auth/logout` | JWT | Sign out |
| `POST` | `/auth/refresh` | Cookie | Refresh access token |
| `GET` | `/auth/profile` | JWT | Get current user |
| `PUT` | `/auth/profile` | JWT | Update profile |
| `PUT` | `/auth/change-password` | JWT | Change password |
| `POST` | `/auth/forgot-password` | No | Send reset link |
| `PUT` | `/auth/reset-password/:token` | No | Reset password |
| `GET` | `/auth/verify-email/:token` | No | Verify email |
| `POST` | `/auth/resend-verification` | No | Resend verification email |
| `POST` | `/auth/send-otp` | No | Send OTP email |
| `POST` | `/auth/verify-otp` | No | Verify OTP → get tokens |
| `POST` | `/auth/2fa/setup` | JWT | Generate 2FA secret |
| `POST` | `/auth/2fa/enable` | JWT | Enable 2FA |
| `POST` | `/auth/2fa/disable` | JWT | Disable 2FA |
| `DELETE` | `/auth/account` | JWT | Delete account |

### Users (admin only)

| Method | Path | Description |
|---|---|---|
| `GET` | `/users` | List all users (paginated) |
| `GET` | `/users/:id` | Get user by ID |
| `PUT` | `/users/:id` | Update user |
| `DELETE` | `/users/:id` | Delete user |

### ERP Modules

All ERP routes follow the same RESTful pattern:

| Base Path | Module |
|---|---|
| `/products` | Product catalogue |
| `/inventory` | Inventory & transactions |
| `/orders` | Sales & purchase orders |
| `/production` | Work orders & manufacturing |
| `/suppliers` | Supplier directory |
| `/customers` | Customer accounts |
| `/machines` | Machine register |
| `/employees` | Employee HR records |
| `/notifications` | System notifications |
| `/reports` | Report generation |
| `/settings` | System configuration |

---

## Security Implementation

| Feature | Implementation |
|---|---|
| Password hashing | bcrypt (12 rounds) |
| Access tokens | JWT (8h expiry, Authorization header + HTTP-only cookie) |
| Refresh tokens | JWT (30d), hashed SHA-256 in DB, rotated on every use |
| Route protection | `protect` middleware verifies JWT + checks `isActive` |
| Role authorization | `authorize(...roles)` middleware |
| Rate limiting | 10 req/15min on auth, 100 req/15min globally |
| Security headers | Helmet (CSP, HSTS, XSS filter, etc.) |
| CORS | Origin whitelist, credentials: true |
| Input sanitization | `express-mongo-sanitize` (NoSQL injection prevention) |
| Input validation | `express-validator` rule sets in `src/validators/` |
| Account lockout | 5 failed attempts → 30min lockout |

---

## Email / Dev Mode

When `SMTP_USER` is empty in `.env`, the server enters **Dev Email Mode**:

- No actual emails are sent
- OTP codes, verification URLs, and reset links are **printed to the backend terminal**
- Newly registered accounts are **auto-verified** (no email step needed)
- A clear `DEV EMAIL MODE` banner appears in the terminal

This lets you test the full registration → OTP → login flow without any SMTP setup.

---

## Demo Mode (Frontend Dev)

With `VITE_DEMO_MODE=true` in `app/.env.local`:

- A **🚀 Enter Demo Mode** button appears on the login page
- Clicking it instantly authenticates as **Demo Super Admin** (no backend call)
- A yellow **DEMO MODE** badge appears in the top navbar
- All ERP modules are accessible
- **Zero effect in production builds** — Vite's static replacement of `import.meta.env.MODE` eliminates all demo code at bundle time

---

## Production Deployment Notes

1. Set `NODE_ENV=production` in backend `.env`
2. Set `COOKIE_SECURE=true` (HTTPS required)
3. Set `COOKIE_SAME_SITE=none` if frontend and backend are on different domains
4. Set real `SMTP_USER` / `SMTP_PASS` for email delivery
5. Set `CORS_ORIGINS` to your production frontend URL only
6. Set `VITE_API_URL` in frontend to your production backend URL
7. Remove `VITE_DEMO_MODE=true` from frontend production environment
