# Session Log — Module 1 Auth API

> Ngày: 2026-05-21 | Model: Claude Sonnet 4.6

---

## 1. Đặc tả nghiệp vụ toàn dự án

### Tổng quan
- **Loại:** Hệ thống quản lý phòng gym toàn diện (MVP v1.0)
- **Kiến trúc:** Monorepo — NestJS backend + React frontend
- **Database:** PostgreSQL 16 qua Supabase
- **Vị trí:** `gym-management-system/`

### Công nghệ
| Layer | Technology |
|---|---|
| Backend | NestJS 10.4.5, TypeScript, Prisma 5.22.0 |
| Frontend | React 18.3.1, Vite 5.x, TypeScript 5.4.5 |
| State | Zustand (auth), TanStack Query (server state) |
| UI | TailwindCSS 3.4.3, React Hook Form 7.51.4, Recharts |
| Auth | JWT (HS256, 7 ngày), bcryptjs, Passport |
| Database | PostgreSQL 16, Supabase (Singapore region) |

### Database — 21 bảng
**Nhóm Tài khoản:** `users`, `members`, `staff`
**Nhóm RBAC:** `groups`, `permissions`, `user_groups`, `group_permissions`
**Nhóm Gói tập & Thanh toán:** `packages`, `subscriptions`, `payments`
**Nhóm Cơ sở vật chất:** `gym_rooms`, `equipment`, `maintenance_logs`
**Nhóm Tập luyện & Điểm danh:** `training_sessions`, `attendance_logs`, `member_progress`
**Nhóm Khác:** `feedback`, `staff_schedules`, `audit_logs`, `files`, `otp_codes`

### Nghiệp vụ chính
- **UC00-UC02:** Đăng nhập, đăng xuất, quên mật khẩu
- **UC03-UC04:** Đăng ký hội viên, mua/gia hạn gói tập
- **UC05:** Buổi tập PT — trainer tạo, member check-in
- **UC08-UC09:** Quản lý phòng tập, thiết bị, bảo trì
- **UC10:** Phản hồi & SLA (high:24h, medium:48h, low:7 ngày)
- **UC11, UC13:** Quản trị nhân viên, xác thực email
- **UC12:** Báo cáo doanh thu, điểm danh, hiệu suất

### 8 CRON jobs
| Giờ | Task |
|---|---|
| 00:05 | `subscription:expire` — active → expired |
| 00:10 | `subscription:activate-pending` — pending → active |
| 00:15 | `subscription:cancel-unpaid-pending` |
| Mỗi 15 phút | `training-session:auto-close` |
| Mỗi giờ | `otp:cleanup`, `feedback:sla-check` |
| CN 03:00 | `audit:cleanup` — xóa log > 1 năm |
| CN 03:30 | `files:cleanup` |

---

## 2. Phân tích Module 1 — Auth API

### Endpoint inventory
| # | Method | Path | Status |
|---|---|---|---|
| 1 | POST | `/auth/login` | Implemented (có gaps) |
| 2 | POST | `/auth/logout` | Implemented ✅ |
| 3 | GET | `/auth/me` | Implemented (có gaps) |
| 4 | POST | `/auth/forgot-password` | Implemented (có gaps) |
| 5 | POST | `/auth/reset-password` | Implemented (có gaps) |
| 6 | POST | `/auth/verify-email` | **NEW** |
| 7 | POST | `/auth/resend-verify` | **NEW** |

### Gaps được phát hiện trước khi implement

**EP1 login:**
- Thiếu check `status='pending_verification'`
- Sai thứ tự: code check `locked` trước password (spec yêu cầu ngược lại)
- Không có audit log

**EP3 me:**
- Khi user null trả 200 OK thay vì throw 404
- `findByIdWithRoles` không filter `deleted_at`

**EP4 forgot-password:**
- `deleteMany` xóa toàn bộ OTP (không filter `purpose`)
- Không có rate limit 3/giờ/email
- Không dùng `$transaction`
- Không có audit log

**EP5 reset-password:**
- `@Length(6, 10)` lỏng — phải `@Length(6, 6)`
- OTP lookup không filter `purpose='password_reset'`
- `deleteMany` xóa toàn bộ OTP (không filter purpose)
- Không có audit log

**EP6 verify-email:** Chưa tồn tại — build từ đầu
**EP7 resend-verify:** Chưa tồn tại — build từ đầu

**Infrastructure thiếu:**
- `AuditService` — ghi vào `audit_logs`
- `RateLimitService` — in-memory Map<string, number[]>
- 3 custom exception classes: `OtpInvalidException`, `OtpExpiredException`, `EmailAlreadyVerifiedException`

---

## 3. Implement Module 1 — Danh sách file thay đổi

### Files tạo mới
```
server/src/common/audit/audit.service.ts
server/src/common/rate-limit/rate-limit.service.ts
server/src/auth/exceptions/otp-invalid.exception.ts
server/src/auth/exceptions/otp-expired.exception.ts
server/src/auth/exceptions/email-already-verified.exception.ts
server/src/auth/dto/verify-email.dto.ts
server/src/auth/dto/resend-verify.dto.ts
server/.env
```

### Files sửa đổi
```
server/src/users/users.service.ts          — filter deleted_at IS NULL
server/src/auth/dto/reset-password.dto.ts  — @Length(6,10) → @Length(6,6)
server/src/auth/auth.service.ts            — full rewrite
server/src/auth/auth.controller.ts         — thêm 2 endpoint + fix /me
server/src/auth/auth.module.ts             — đăng ký AuditService, RateLimitService
```

### Nội dung implement

#### AuditService (`common/audit/audit.service.ts`)
- Ghi vào bảng `audit_logs`
- Fire-and-forget: lỗi ghi log không ảnh hưởng luồng chính
- Fields: `actorUserId`, `action`, `resourceType`, `resourceId`, `beforeData`, `afterData`, `ipAddress`, `userAgent`

#### RateLimitService (`common/rate-limit/rate-limit.service.ts`)
- In-memory `Map<key, timestamp[]>` sliding window
- `isAllowed(key, limit, windowMs): boolean`
- Reset khi restart — chấp nhận v1.0 single-instance

#### OTP exceptions
- `OtpInvalidException` → HTTP 400, code=`OTP_INVALID`
- `OtpExpiredException` → HTTP 410, code=`OTP_EXPIRED`
- `EmailAlreadyVerifiedException` → HTTP 409, code=`EMAIL_ALREADY_VERIFIED`

#### auth.service.ts — Business logic đầy đủ

**`login(email, password, ctx)`**
```
email không match → 401 anti-enumeration (audit: reason=invalid_credentials)
password sai      → 401 cùng message (audit: reason=invalid_credentials)
status=locked     → 401 "Tài khoản đã bị khoá" (audit: reason=user_disabled)
status=pending    → 401 "Tài khoản chưa xác thực email" (audit: reason=email_not_verified)
ok                → issue JWT + audit(success=true)
```

**`forgotPassword(email, ctx)`**
```
email không match → 200 silently + audit
rate limit 3/h    → 200 silently + audit(rate_limited=true)
ok → $transaction(DELETE purpose='password_reset'; INSERT new OTP)
   → log OTP stdout + audit(step='request')
```

**`resetPassword(email, otp, newPassword, ctx)`**
```
email không match → 401
OTP không tồn tại (purpose='password_reset', chưa hết hạn) → 401
bcrypt fail       → 401 + audit(step='complete', success=false)
ok → $transaction(UPDATE password_hash; DELETE otp WHERE purpose='password_reset')
   → audit(step='complete', success=true)
```

**`verifyEmail(email, otp, ctx)` — NEW**
```
email_verified_at IS NOT NULL → 409 EMAIL_ALREADY_VERIFIED
otp_codes không tồn tại (purpose='email_verify') → 404
expires_at <= NOW() → 410 OTP_EXPIRED
attempt_count >= 5  → DELETE otp row, 410 OTP_EXPIRED (force resend)
bcrypt fail → UPDATE attempt_count += 1, 400 OTP_INVALID + audit
ok → $transaction(UPDATE status='active', email_verified_at=NOW(); DELETE otp) + audit(success=true)
```

**`resendVerify(email, ctx)` — NEW**
```
email không match → 200 silently
email_verified_at IS NOT NULL → 200 silently
rate limit 3/h    → 200 silently + audit(rate_limited=true)
ok → $transaction(DELETE old OTP purpose='email_verify'; INSERT new, attempt_count=0)
   → log OTP stdout + audit(step='resend')
```

#### auth.controller.ts
- Thêm `getCtx(req)` helper lấy IP + User-Agent
- Fix `/me`: throw `NotFoundException` thay vì return 200 khi user null
- Thêm `POST /auth/verify-email`
- Thêm `POST /auth/resend-verify`

#### users.service.ts
- `findByEmailWithRoles`: đổi `findUnique` → `findFirst` với `deletedAt: null`
- `findByIdWithRoles`: đổi `findUnique` → `findFirst` với `deletedAt: null`

---

## 4. Kết nối Supabase

### Thông tin kết nối
- **Project ref:** `mukwsuogqltqpjzjlcgp`
- **Region:** ap-southeast-1
- **DATABASE_URL:** Transaction pooler port 6543 (`?pgbouncer=true`)
- **DIRECT_URL:** Session pooler port 5432

### Lệnh chạy sau khi setup
```powershell
# Trong server/
npm install
npm run prisma:seed    # seed dữ liệu mẫu
npm run dev            # khởi động server
```

### Kết quả seed
```
users: 10 | staff: 4 | members: 6
groups: 4 | permissions: 37
user_groups: 10 | group_permissions: 87
```

---

## 5. Tài khoản test

> **Password chung:** `Password123!`

| Email | Role | Status | Ghi chú |
|---|---|---|---|
| `owner@gym.local` | owner | active | Toàn quyền |
| `staff.linh@gym.local` | staff | active | 26 permissions |
| `trainer.minh@gym.local` | trainer | active | PT |
| `trainer.huong@gym.local` | trainer | active | PT |
| `nguyen.van.a@email.com` | member | active | |
| `tran.thi.b@email.com` | member | active | |
| `le.van.c@email.com` | member | active | |
| `pham.thi.d@email.com` | member | active | |
| `hoang.van.e@email.com` | member | active | |
| `vu.thi.f@email.com` | member | **locked** | Test T01-04 |

---

## 6. Bộ Test Cases Module 1

> **Base URL:** `http://localhost:3000/api/v1`

### T01 — POST /auth/login

| ID | Scenario | Input | Expected |
|---|---|---|---|
| T01-01 | Đăng nhập thành công | email + password đúng, status=active | 200 · `{success:true, data:{accessToken, user}}` |
| T01-02 | Sai password | email đúng, password sai | 401 · "Email hoặc mật khẩu không đúng" |
| T01-03 | Email không tồn tại | email ngẫu nhiên | 401 · **cùng message T01-02** (anti-enumeration) |
| T01-04 | Tài khoản bị khoá | `vu.thi.f@email.com` | 401 · "Tài khoản đã bị khoá" |
| T01-05 | Chưa xác thực email | user status=pending_verification | 401 · "Tài khoản chưa xác thực email" |
| T01-06 | Thiếu field email | body không có email | 400 · `VALIDATION_ERROR` |
| T01-07 | Password < 8 ký tự | `"password":"1234"` | 400 · `VALIDATION_ERROR` |
| T01-08 | Audit log thành công | Login thành công → xem `audit_logs` | `action='auth.login'`, `afterData.success=true` |
| T01-09 | Audit log thất bại | Login sai password → xem `audit_logs` | `action='auth.login'`, `afterData.reason='invalid_credentials'` |

### T02 — POST /auth/logout

| ID | Scenario | Expected |
|---|---|---|
| T02-01 | Đăng xuất thành công | Bearer token hợp lệ → 200 |
| T02-02 | Không có token | 401 |
| T02-03 | Token sai/expired | 401 |

### T03 — GET /auth/me

| ID | Scenario | Expected |
|---|---|---|
| T03-01 | Lấy thông tin thành công | 200 · data có `userId, email, phone, fullName, status, roles` |
| T03-02 | Không có token | 401 |
| T03-03 | User bị soft-delete | **404** · code=`NOT_FOUND` (không được 200) |
| T03-04 | Roles đúng | owner login → `roles` chứa `"owner"` |

### T04 — POST /auth/forgot-password

| ID | Scenario | Expected |
|---|---|---|
| T04-01 | Email tồn tại | 200 · OTP in console server |
| T04-02 | Email không tồn tại | **200** (anti-enumeration, không 404) |
| T04-03 | Email sai format | 400 · `VALIDATION_ERROR` |
| T04-04 | Rate limit 3/giờ | Gọi 4 lần → lần 4 vẫn 200, không in OTP console |
| T04-05 | OTP đúng format | DB: `purpose='password_reset'`, `expires_at` ≈ +10 phút |
| T04-06 | Single-active OTP | Gọi 2 lần → DB chỉ còn 1 row OTP |

### T05 — POST /auth/reset-password

| ID | Scenario | Expected |
|---|---|---|
| T05-01 | Reset thành công | OTP 6 số từ console → 200 |
| T05-02 | Đăng nhập với password mới | 200 với token mới |
| T05-03 | OTP sai | 401 |
| T05-04 | OTP đã dùng rồi | 401 (đã bị xóa) |
| T05-05 | OTP < 6 ký tự | 400 · `VALIDATION_ERROR` |
| T05-06 | OTP > 6 ký tự | 400 · `VALIDATION_ERROR` |
| T05-07 | Email không tồn tại | 401 |
| T05-08 | Dùng OTP email_verify để reset | 401 (filter theo purpose) |
| T05-09 | Audit log | `action='auth.password-reset'`, `step='complete'`, `success=true` |

### T06 — POST /auth/verify-email

| ID | Scenario | Expected |
|---|---|---|
| T06-01 | Xác thực thành công | OTP đúng từ resend-verify → 200 |
| T06-02 | User active sau verify | DB: `status='active'`, `email_verified_at` có giá trị |
| T06-03 | OTP sai | 400 · `OTP_INVALID` |
| T06-04 | OTP < 6 ký tự | 400 · `VALIDATION_ERROR` |
| T06-05 | OTP > 6 ký tự | 400 · `VALIDATION_ERROR` |
| T06-06 | Email không tồn tại | 404 · `NOT_FOUND` |
| T06-07 | Đã verify rồi | 409 · `EMAIL_ALREADY_VERIFIED` |
| T06-08 | OTP hết hạn (>10 phút) | 410 · `OTP_EXPIRED` |
| T06-09 | Sai 5 lần liên tiếp | Lần 5 → `OTP_EXPIRED` (row bị xóa, phải resend) |
| T06-10 | Đăng nhập sau verify | 200 (không còn bị 401 email_not_verified) |
| T06-11 | Audit log | `action='auth.email-verify'`, `afterData.success=true` |

### T07 — POST /auth/resend-verify

| ID | Scenario | Expected |
|---|---|---|
| T07-01 | Gửi lại thành công | 200 · OTP mới in console |
| T07-02 | Email không tồn tại | **200** (anti-enumeration) |
| T07-03 | Email đã verify | **200** (silent, không sinh OTP) |
| T07-04 | Rate limit 4 lần | Lần 4 vẫn 200, không có OTP mới trong console |
| T07-05 | OTP cũ bị invalidate | resend 2 lần → verify OTP lần đầu → 400 OTP_INVALID |
| T07-06 | Email sai format | 400 · `VALIDATION_ERROR` |

### T08 — Bảo mật tổng thể

| ID | Scenario | Expected |
|---|---|---|
| T08-01 | Route protected không có token | 401 |
| T08-02 | Token expired | 401 |
| T08-03 | Token giả mạo | 401 |
| T08-04 | IP address trong audit | `audit_logs.ip_address` có giá trị |

---

## 7. Happy Path — Luồng test từ đầu đến cuối

```
# Bước 1: Gửi OTP xác thực email (cần user status=pending_verification)
POST /api/v1/auth/resend-verify
{"email": "newuser@example.com"}
→ Xem OTP trong console server

# Bước 2: Xác thực email
POST /api/v1/auth/verify-email
{"email": "newuser@example.com", "otp": "123456"}
→ 200 "Xác thực email thành công"

# Bước 3: Đăng nhập
POST /api/v1/auth/login
{"email": "owner@gym.local", "password": "Password123!"}
→ Lấy accessToken

# Bước 4: Lấy thông tin user
GET /api/v1/auth/me
Header: Authorization: Bearer <accessToken>
→ Thấy userId, email, roles

# Bước 5: Quên mật khẩu
POST /api/v1/auth/forgot-password
{"email": "owner@gym.local"}
→ OTP in console server

# Bước 6: Đặt lại mật khẩu
POST /api/v1/auth/reset-password
{"email": "owner@gym.local", "otp": "654321", "newPassword": "NewPass123!"}
→ 200

# Bước 7: Đăng nhập với password mới
POST /api/v1/auth/login
{"email": "owner@gym.local", "password": "NewPass123!"}
→ 200 với token mới

# Bước 8: Đăng xuất
POST /api/v1/auth/logout
Header: Authorization: Bearer <accessToken>
→ 200
```

---

## 8. Cấu trúc file sau khi implement

```
server/src/
├── common/
│   ├── audit/
│   │   └── audit.service.ts          ← NEW
│   ├── rate-limit/
│   │   └── rate-limit.service.ts     ← NEW
│   └── filters/
│       └── http-exception.filter.ts  (giữ nguyên)
├── auth/
│   ├── decorators/
│   ├── dto/
│   │   ├── login.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   ├── reset-password.dto.ts     ← SỬA: @Length(6,6)
│   │   ├── verify-email.dto.ts       ← NEW
│   │   └── resend-verify.dto.ts      ← NEW
│   ├── exceptions/
│   │   ├── otp-invalid.exception.ts      ← NEW
│   │   ├── otp-expired.exception.ts      ← NEW
│   │   └── email-already-verified.exception.ts ← NEW
│   ├── guards/
│   ├── strategies/
│   ├── types/
│   ├── auth.controller.ts            ← SỬA
│   ├── auth.module.ts                ← SỬA
│   └── auth.service.ts               ← SỬA (full rewrite)
└── users/
    └── users.service.ts              ← SỬA: filter deleted_at
```

---

## 9. Constants trong auth.service.ts

```typescript
const OTP_TTL_MS = 10 * 60 * 1000       // 10 phút
const OTP_RATE_LIMIT = 3                // 3 lần/giờ
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000  // 1 giờ
const OTP_MAX_ATTEMPTS = 5              // tối đa 5 lần nhập sai
```

---

## 10. Audit action codes (Module 1)

| Action | Trigger | afterData |
|---|---|---|
| `auth.login` | Mọi lần login (thành công + thất bại) | `{success, reason?}` |
| `auth.password-reset` | forgot-password + reset-password | `{step: 'request'\|'complete', success?}` |
| `auth.email-verify` | verify-email + resend-verify | `{success?\|step: 'resend', attempt_count?}` |

---

## 11. Trạng thái sau session này — 2026-05-21

### ✅ Backend Module 1 — HOÀN THÀNH

Tất cả 7 endpoint đã implement và verify đủ file:

| File | Trạng thái |
|---|---|
| `common/audit/audit.service.ts` | ✅ Tồn tại |
| `common/rate-limit/rate-limit.service.ts` | ✅ Tồn tại |
| `auth/exceptions/otp-invalid.exception.ts` | ✅ Tồn tại |
| `auth/exceptions/otp-expired.exception.ts` | ✅ Tồn tại |
| `auth/exceptions/email-already-verified.exception.ts` | ✅ Tồn tại |
| `auth/dto/verify-email.dto.ts` | ✅ Tồn tại |
| `auth/dto/resend-verify.dto.ts` | ✅ Tồn tại |
| `auth/auth.service.ts` | ✅ Full rewrite, 5 method đầy đủ |
| `auth/auth.controller.ts` | ✅ 7 endpoints |
| `auth/auth.module.ts` | ✅ Đăng ký AuditService + RateLimitService |
| `users/users.service.ts` | ✅ Filter deleted_at |
| `server/.env` | ✅ DATABASE_URL, DIRECT_URL, JWT_SECRET |

### ✅ Build fixes — Backend

| Vấn đề | Fix |
|---|---|
| `dist/main` not found sau mỗi lần chạy | Thêm `"incremental": false` vào `tsconfig.build.json` — fix xung đột giữa `deleteOutDir: true` (nest-cli.json) và incremental cache |

### ✅ Frontend fixes — FE (không cần API mới)

| Vấn đề | File sửa | Fix |
|---|---|---|
| Login sai → 1s sau tự nhảy về dashboard cũ | `client/src/services/api.ts` | Interceptor 401 chỉ redirect khi URL không phải `/auth/*` |
| Login sai → browser autofill đổi email field | `client/src/pages/auth/LoginPage.tsx` | Sau catch, dùng `setValue` reset lại giá trị user đã gõ |
| User đã login vào `/login` thấy form, rồi bị redirect | `client/src/layouts/AuthLayout.tsx` | Thêm guard: `if (isAuthenticated && user)` redirect về dashboard role |
| Dashboard "không chuyển" — click không scroll | `client/src/components/common/RoleDashboardPage.tsx` | Thêm `id="overview"` vào section đầu tiên |
| Owner ấn "Hồ sơ" → về dashboard (không có trang riêng) | `client/src/components/common/Sidebar.tsx` + `App.tsx` | Tạo `/owner/profile`, sửa `profilePathByRole.owner` |
| Từ `/owner/profile` không navigate được sidebar | `client/src/components/common/Sidebar.tsx` | Đổi `#hash` → `/owner#hash`, thêm `navigateTo()`, sửa `isActive()` |
| `AuthUser` thiếu `status`, `phone` | `client/src/stores/authStore.ts` | Thêm `status?` và `phone?` vào interface |

### Files tạo mới (FE)

```
client/src/pages/owner/ProfilePage.tsx   ← NEW: trang hồ sơ owner, gọi GET /auth/me
```

### Tài khoản test (seed sẵn)

| Email | Role | Password | Status |
|---|---|---|---|
| `owner@gym.local` | owner | `Password123!` | active |
| `staff.linh@gym.local` | staff | `Password123!` | active |
| `trainer.minh@gym.local` | trainer | `Password123!` | active |
| `vu.thi.f@email.com` | member | `Password123!` | **locked** |

### Cách chạy

```powershell
# Terminal 1 — Backend
cd gym-management-system/server
npm run dev
# → http://localhost:3000

# Terminal 2 — Frontend
cd gym-management-system/client
npm run dev
# → http://localhost:5173
```

### Trạng thái tổng thể

| Module | Backend | Frontend |
|---|---|---|
| Module 1 Auth (7 ep) | ✅ Hoàn thành | ✅ Login/Logout/ForgotPassword page có |
| Module 2 RBAC+User (16 ep) | ❌ Chưa implement | ❌ Chưa có page |
| Module 3 Package (6 ep) | ❌ Chưa implement | ⚠️ Placeholder có |
| Module 4 Member/Sub/Payment (14 ep) | ❌ Chưa implement | ⚠️ Placeholder có |
| Module 6 Facility (13 ep) | ❌ Chưa implement | ❌ Chưa có page |
| Dashboard Owner/Staff | N/A | ⚠️ Static hardcode, chưa gọi API |

### Việc cần làm tiếp theo

1. Implement Module 2 — RBAC + User (16 endpoint) + `PermissionsGuard`
2. Implement Module 3 — Package (6 endpoint)
3. Implement Module 4 — Member / Subscription / Payment (14 endpoint)
4. Implement Module 6 — Facility / Rooms / Equipment (13 endpoint)
5. 8 CRON jobs (subscription expire/activate, OTP cleanup, audit cleanup...)
6. Kết nối FE gọi API thật thay hardcode
7. Thêm trang profile cho `staff` (hiện `profilePathByRole.staff = '/staff'` vẫn về dashboard)
