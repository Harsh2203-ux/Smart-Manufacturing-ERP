# Smart Manufacturing ERP — Backend

Node.js + Express + MongoDB REST API.

## Prerequisites

- Node.js ≥ 18
- MongoDB Atlas account (or local MongoDB ≥ 6)

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in your Atlas URI + secrets
npm run dev
```

## Environment Variables

See [`.env.example`](./.env.example) for all required variables.
Copy the file to `.env` and replace every placeholder value.

## Base URL

```
http://localhost:5000/api/v1
```

## Health Check

```
GET /health
```

---

## API Reference

### Authentication   `/api/v1/auth`

| Method | Path                        | Auth | Description                  |
|--------|-----------------------------|------|------------------------------|
| POST   | `/register`                 | —    | Register new user            |
| POST   | `/login`                    | —    | Login (returns JWT + cookie) |
| POST   | `/logout`                   | ✓    | Invalidate session           |
| POST   | `/refresh`                  | —    | Rotate access token          |
| GET    | `/me`                       | ✓    | Get current user profile     |
| POST   | `/forgot-password`          | —    | Send password reset link     |
| PUT    | `/reset-password/:token`    | —    | Reset password               |
| GET    | `/verify-email/:token`      | —    | Verify email address         |
| POST   | `/resend-verification`      | —    | Resend verification email    |
| POST   | `/send-otp`                 | —    | Send OTP to email            |
| POST   | `/verify-otp`               | —    | Verify OTP code              |
| POST   | `/verify-2fa`               | —    | Verify TOTP 2FA code         |
| PUT    | `/update-password`          | ✓    | Change password              |

### Users   `/api/v1/users`   🔒 Admin

| Method | Path          | Description           |
|--------|---------------|-----------------------|
| GET    | `/`           | List all users        |
| GET    | `/:id`        | Get user              |
| PUT    | `/:id`        | Update user           |
| DELETE | `/:id`        | Delete user           |
| PUT    | `/me/profile` | Update own profile    |

### Products   `/api/v1/products`   🔒 Authenticated

| Method | Path            | Auth          | Description        |
|--------|-----------------|---------------|--------------------|
| GET    | `/`             | Any           | List products      |
| GET    | `/categories`   | Any           | List categories    |
| GET    | `/:id`          | Any           | Get product        |
| POST   | `/`             | Admin/Manager | Create product     |
| PUT    | `/:id`          | Admin/Manager | Update product     |
| DELETE | `/:id`          | Admin         | Delete product     |

### Inventory   `/api/v1/inventory`   🔒 Authenticated

| Method | Path             | Description              |
|--------|------------------|--------------------------|
| GET    | `/`              | List all stock items     |
| GET    | `/low-stock`     | Items below reorder pt   |
| GET    | `/transactions`  | Transaction history      |
| GET    | `/:id`           | Get stock item           |
| POST   | `/adjust`        | Adjust stock quantity    |

### Orders   `/api/v1/orders`   🔒 Authenticated

| Method | Path              | Description          |
|--------|-------------------|----------------------|
| GET    | `/`               | List orders          |
| GET    | `/stats`          | Order statistics     |
| GET    | `/:id`            | Get order            |
| POST   | `/`               | Create order         |
| PUT    | `/:id`            | Update order         |
| PATCH  | `/:id/status`     | Update order status  |
| DELETE | `/:id`            | Delete order         |

### Production (Work Orders)   `/api/v1/production`

| Method | Path           | Description            |
|--------|----------------|------------------------|
| GET    | `/`            | List work orders       |
| GET    | `/stats`       | Production stats       |
| GET    | `/:id`         | Get work order         |
| POST   | `/`            | Create work order      |
| PUT    | `/:id`         | Update work order      |
| PATCH  | `/:id/status`  | Update WO status       |
| DELETE | `/:id`         | Delete work order      |

### Suppliers   `/api/v1/suppliers`
### Customers   `/api/v1/customers`
### Machines    `/api/v1/machines`
### Employees   `/api/v1/employees`
### Notifications `/api/v1/notifications`
### Reports     `/api/v1/reports`
### Settings    `/api/v1/settings`

All follow standard CRUD patterns. See route files for full details.

---

## Roles & Access

| Role     | Access Level                                              |
|----------|-----------------------------------------------------------|
| admin    | Full access — all CRUD operations                         |
| manager  | Read + create + update most resources. No delete.         |
| operator | Read + limited write (e.g. adjust stock, update WO status)|

---

## Architecture

```
backend/
├── src/
│   ├── app.js             Express app (middleware + routes)
│   ├── server.js          Entry point (DB connect + listen)
│   ├── config/
│   │   ├── index.js       Validated env config
│   │   └── database.js    Mongoose connection
│   ├── models/            Mongoose models (12)
│   ├── controllers/       Business logic (12)
│   ├── routes/            Express routers (12)
│   ├── middleware/
│   │   ├── auth.js        JWT protect + authorize
│   │   ├── error.js       Global error handler
│   │   ├── validate.js    express-validator runner
│   │   ├── upload.js      Multer file upload
│   │   └── rateLimit.js   Rate limiting
│   ├── services/
│   │   ├── authService.js JWT token helpers
│   │   ├── emailService.js Nodemailer + templates
│   │   └── notificationService.js In-app notifications
│   └── utils/
│       ├── apiResponse.js ApiResponse, ApiError, asyncHandler
│       ├── helpers.js     Utility functions
│       └── logger.js      Winston logger
└── uploads/               File upload storage
```
