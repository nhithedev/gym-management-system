# Architecture & High-Level Design

| Field | Value |
|---|---|
| Document ID | GMS-ARCH-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | TBD — điền khi team formed |
| Reviewers | TBD — điền khi có team review (tối thiểu 1 backend lead + 1 DBA) |
| Last Updated | 2026-05-16 |
| Related docs | `docs/VI/SRS_VI.md`, `docs/Design/Database.md` |

---

## 1. Mục đích & Phạm vi

Tài liệu này đặc tả thiết kế kỹ thuật cấp cao của hệ thống Gym Management v1.0. Phạm vi bao gồm: technology stack, module boundaries, authentication, background jobs, API conventions, audit logging, backup & disaster recovery, SLA chính sách, và các quy ước cross-cutting (timezone, currency, error handling).

Tài liệu này KHÔNG đặc tả yêu cầu nghiệp vụ (xem `SRS_VI.md`) và KHÔNG mô tả chi tiết schema (xem `Database.md`). API spec cho từng endpoint sẽ ở tài liệu API spec riêng — được build SAU khi tài liệu này stable.

Audience: developer, architect, DevOps, QA.

## 2. Technology Stack & Module Boundaries

### 2.1 Stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | NestJS | 10.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 (Supabase) |
| Storage | Supabase Storage | — |
| Frontend | Vite + React | React 18, Vite 5 |
| State (client) | Zustand + TanStack Query | — |
| Auth | JWT + Passport | TTL 7 ngày |
| Validation | class-validator | global `ValidationPipe` |

### 2.2 Backend module list (NestJS)

```
src/
  auth/         JWT, OTP, login lockout, password reset, email verify
  users/        User CRUD + role resolution
  members/      Member profile, subscription view
  staff/        Staff profile, schedule, position
  groups/       RBAC groups + permissions assignment
  packages/     Package CRUD, time-based pricing
  subscriptions/ Subscription lifecycle, cron triggers
  payments/     Payment record, integration với cổng thanh toán (mock v1.0)
  sessions/     Training session (UC05A schedule + UC05B real-time)
  attendance/   attendance_logs, device callback endpoint
  rooms/        gym_rooms CRUD
  equipment/    Equipment + maintenance logs
  feedback/     Feedback intake + SLA tracking
  reports/      Aggregation queries cho UC12
  audit/        Audit interceptor + query endpoint
  files/        Signed URL cho Supabase Storage upload
  health/       /health endpoint (không qua /api/v1)
  common/       Filters, decorators, pipes shared
```

Mỗi module độc lập, import qua `app.module.ts`. `PrismaModule` là `@Global()`.

### 2.3 Frontend layers

```
src/
  pages/        Route components, role-aware
  components/   Reusable UI (Material Design 3 tokens)
  hooks/        Custom hooks (useAuth, useMembers, ...)
  services/     Axios instance + API client per module
  stores/       Zustand stores (authStore, ...)
  router/       React Router 6 + ProtectedRoute
```

Vite dev proxy `/api → http://localhost:3000` (loại CORS dev).

## 3. Authentication & Authorization

### 3.1 JWT

- Payload: `{ sub: string, email: string, roles: Role[] }`. `sub` là string (BigInt PK cast).
- TTL: 7 ngày. Không có refresh token v1.0 (defer v1.1).
- Algorithm: HS256 với `JWT_SECRET` env var.
- Header: `Authorization: Bearer <token>`.

### 3.2 RBAC

- 4 role chính: `owner`, `staff` (gồm position `manager`/`receptionist`/`technician`), `pt` (trainer), `member`.
- Quan hệ: `users ↔ groups` qua `user_groups`; `groups ↔ permissions` qua `group_permissions` (xem Database.md §3).
- Resolve at login: `UsersService.findByEmailWithRoles()` join `user_groups → groups → group_permissions`.
- Guards: `JwtAuthGuard` global; `RolesGuard` per-route; `@Public()` opt-out; `@Roles('owner', 'staff')` whitelist.
- `RolesGuard` dùng `roles.some()` — không thay `roles[0]` (giữ multi-role support).

### 3.3 Email Verification Flow

Áp dụng cho mọi user mới: hội viên qua UC03A/UC03B, nhân sự qua UC11.

Tiền điều kiện: `users.status='pending_verification'`, `users.email_verified_at IS NULL`.

```
sequenceDiagram
    actor U as User
    participant API as NestJS API
    participant DB as PostgreSQL
    participant SMTP as SMTP Server

    Note over API,DB: Trigger từ UC03A/UC03B/UC11
    API->>API: crypto.randomInt → OTP 6 chữ số
    API->>API: bcrypt hash
    API->>DB: INSERT otp_codes (purpose='email_verify', TTL 10 phút)
    API->>SMTP: Send email với OTP plaintext + link

    U->>API: GET /verify-email?email=&otp=  hoặc nhập OTP
    API->>DB: SELECT otp_codes WHERE purpose='email_verify' AND user_id=...
    API->>API: bcrypt.compare(otp, hash)
    alt OTP đúng + còn hạn
        API->>DB: $transaction: UPDATE users SET email_verified_at=NOW(), status='active'; DELETE otp_codes; INSERT audit_logs
        API-->>U: 200 OK → redirect Login
    else OTP sai
        API-->>U: 400 "Mã không hợp lệ"
    else OTP hết hạn
        API-->>U: 410 "Mã đã hết hạn, yêu cầu gửi lại"
    end
```

Endpoints:

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/v1/auth/verify-email` | `{ email, otp }` | 200/400/410 |
| POST | `/api/v1/auth/resend-verify` | `{ email }` | 200 (rate-limit 1/60s/email) |

### 3.4 Password Reset Flow

Reference SRS UC02. Cơ chế giống UC13: OTP 6 chữ số, bcrypt hash, TTL 10 phút, `purpose='password_reset'`.

Rate limit: 3 yêu cầu / giờ / email. Login lockout (5 sai trong 15 phút) → 30 phút lockout, mở khóa bằng UC02 hoặc đợi cron (xem §4).

### 3.5 Device Authentication & Real-time Check-in (UC05B)

Access Control Device tại quầy (RFID reader, QR scanner) gọi backend mỗi lần member check-in. Authentication: header `X-Device-API-Key` so với env `DEVICE_API_KEY`.

```
sequenceDiagram
    actor M as Member
    participant D as Access Device
    participant API as NestJS API
    participant DB as PostgreSQL

    M->>D: Quẹt thẻ / scan QR
    D->>API: POST /api/v1/devices/access-events<br/>Header: X-Device-API-Key<br/>Body: {member_identifier, occurred_at, device_id}
    API->>API: Validate API key (env compare)
    alt API key sai
        API-->>D: 401 Unauthorized
        D->>D: Log + reject member
    else API key đúng
        API->>DB: SELECT member by identifier (member_code | card_id | qr_code)
        alt Member không tồn tại / deleted
            API-->>D: 404 Not Found
        else Member tồn tại
            API->>DB: SELECT subscriptions WHERE member_id=? AND status='active' AND start_date <= today <= end_date
            alt Không có subscription active
                API-->>D: 403 Forbidden "Gói tập hết hạn"
            else Có active subscription
                API->>DB: INSERT attendance_logs (member_id, subscription_id, start_time=occurred_at, method='realtime')
                API->>DB: INSERT audit_logs (action='attendance.realtime-checkin')
                API-->>D: 200 OK + member name/photo cho UI device
            end
        end
    end
    D->>M: LED xanh + mở cửa / LED đỏ + buzzer
```

**Endpoint:**

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/devices/access-events` | `X-Device-API-Key` | `{ member_identifier: string, occurred_at: ISO8601, device_id: string }` | 200/401/403/404 |

**Device API key rotation:**

- V1.0: Cố định trong env `DEVICE_API_KEY`. Rotation manual qua workflow: deploy env mới → restart server → cập nhật key vào device firmware → verify. Downtime: ~5 phút.
- Trade-off: 1 key dùng cho toàn bộ device → leak 1 device = compromise toàn bộ. Chấp nhận cho v1.0 vì chỉ 1-2 device per gym, deploy controlled.
- V1.1+: Thêm bảng `devices(device_id, api_key_hash, last_seen_at, rotated_at)`, per-device key, cron rotation hàng tháng. Roadmap docs khi feature được prioritize.

**Retry:** Device tự retry tối đa 3 lần với backoff (1s, 4s, 16s) nếu network fail. Sau retry vẫn fail → device store local queue, sync khi mạng OK (idempotency qua `occurred_at + device_id` deduplication ở server).

## 4. Background Jobs (Cron / Scheduled Tasks)

V1.0 implement bằng NestJS `@Cron` decorator (cùng tiến trình server). 9 job:

| Job ID | Tần suất | Hành động | Module |
|---|---|---|---|
| `auth:unlock-expired-lockout` | Mỗi 5 phút | Tìm `users` có `locked_until < NOW()` → set `status='active'`, `locked_until=NULL`. | Auth |
| `subscription:expire` | Daily 00:05 | Tìm `subscriptions` có `status='active'` và `end_date < CURRENT_DATE` → set `status='expired'`, ghi audit log. | Membership |
| `subscription:activate-pending` | Daily 00:10 | Tìm `subscriptions` có `status='pending'` và `start_date <= CURRENT_DATE` đã payment success → set `status='active'`. | Membership |
| `subscription:cancel-unpaid-pending` | Daily 00:15 | Tìm `subscriptions` có `status='pending'` và `created_at < NOW() - INTERVAL '24 hours'` và KHÔNG có payment success → set `status='cancelled'`, ghi audit log. | Membership |
| `training-session:auto-close` | Mỗi 15 phút | Tìm `training_sessions` có `status IN ('scheduled','in_progress')` và `end_time < NOW() - INTERVAL '15 minutes'` → set `status='completed'`. Nếu tại quầy có cron biết check-in info (đối chiếu `attendance_logs`), session không có attendance → giữ `completed` nhưng mark `attendance_logs` missing. | Training |
| `otp:cleanup` | Hourly | Xóa `otp_codes` có `expires_at < NOW()`. | Auth |
| `feedback:sla-check` | Hourly | Tìm feedback `status IN ('open','in_progress')` quá hạn theo SLA (xem §7). Đánh dấu badge "Quá hạn" ở UI list view. V1.0 không auto-escalate. | Engagement |
| `audit:cleanup` | Weekly | Xóa `audit_logs` có `created_at < NOW() - INTERVAL '1 year'`. | Audit |
| `files:cleanup` | Weekly | Tìm `files` có `deleted_at < NOW() - INTERVAL '30 days'` → xóa object trên Supabase Storage rồi hard delete metadata. Đồng thời orphan check: file thuộc resource đã hard delete (equipment) → soft delete và xóa theo cùng chu kỳ. | Files |

### 4.1 Yêu cầu chung

- Idempotent: chạy nhiều lần không tạo side effect kép. VD: `subscription:expire` dùng `WHERE status='active'` → lần 2 không match.
- Log đầy đủ vào application log; nếu modify data thì insert `audit_logs`.
- Timeout per job: 5 phút. Quá → alert qua application log + retry lần sau.

### 4.2 Daily window ordering (chốt thứ tự để tránh race)

3 job chạy trong cửa sổ 00:05-00:15 có dependency, phải chạy đúng thứ tự:

1. `00:05 subscription:expire` — chuyển `active → expired` theo `end_date`. Chạy trước để pending sau đó mới được activate.
2. `00:10 subscription:activate-pending` — chuyển `pending → active` cho subscription có `start_date <= today` và đã payment. Chạy sau expire để member kết thúc gói cũ và start gói mới đúng ngày.
3. `00:15 subscription:cancel-unpaid-pending` — cancel pending quá 24h không payment. Chạy cuối vì không xung đột với 2 job trên (lọc theo `created_at < NOW() - 24h`).

Window 10 phút giữa các job dư cho job timeout 5 phút. Khi scale (v1.1+), nếu chuyển sang external scheduler (vd: Supabase pg_cron), giữ nguyên offset.

### 4.3 Multi-instance

V1.0 single-instance NestJS — không issue. Khi scale horizontal (v1.1+), chốt một trong:

(a) Designated cron instance — chỉ 1 pod có env `RUN_CRON=true`.
(b) Postgres advisory lock — mỗi job acquire `pg_try_advisory_lock(job_id_hash)` trước khi run.

Option (a) đơn giản hơn, recommend cho v1.1.

## 5. API Conventions

| Mục | Quy ước |
|---|---|
| Versioning | Path-based `/api/v1`. Breaking change → bump `/v2`, không header-based. |
| Pagination | Query `?page=1&pageSize=20`. Default `pageSize=20`, max `100`. Cursor variant `?cursor=<id>` cho list lớn (v1.1). |
| Sort | Default `created_at DESC`. Param `?sort=field:asc` hoặc `?sort=field:desc`. |
| Filter | Flat query string: `?status=active&from=2026-01-01&to=2026-12-31`. |
| Response (list) | `{ data: [...], meta: { page, pageSize, total } }` |
| Response (single) | Resource object trực tiếp |
| Error response | NestJS default: `{ statusCode, message, error }`. Validation → `message: string[]`. |
| HTTP status mapping | P2002 (UNIQUE) → 409; P2025 (not found) → 404; ValidationError → 400; JwtAuthGuard fail → 401; RolesGuard fail → 403. |
| Datetime format | ISO 8601 UTC, ví dụ `2026-04-28T10:30:00.000Z`. Client display Asia/Ho_Chi_Minh. |
| ID serialization | BigInt PK → string (`BigInt.prototype.toJSON` patched ở `main.ts`). |
| Auth | `Authorization: Bearer <JWT>`. |
| Real-time | HTTP polling 30s cho UC05B view. WebSocket defer v1.1. |
| Idempotency | Mutation có side effect (vd: create payment) support header `Idempotency-Key`. V1.0 chấp nhận nhưng chưa enforce mọi endpoint. |

### 5.1 Error envelope chi tiết

```json
{
  "statusCode": 409,
  "message": "Email đã tồn tại",
  "error": "Conflict"
}
```

Validation:

```json
{
  "statusCode": 400,
  "message": ["email phải hợp lệ", "password tối thiểu 8 ký tự"],
  "error": "Bad Request"
}
```

Prisma P2002 phải được catch trong service layer (qua `HttpExceptionFilter` trong `common/filters/`) và map sang business message — KHÔNG để error raw lọt ra client.

## 6. Audit Logging

### 6.1 Scope (v1.0)

| Module | Action codes |
|---|---|
| Auth | `auth.login`, `auth.lockout`, `auth.password-reset`, `auth.email-verify` |
| Member | `member.create`, `member.update`, `member.delete`, `member.assign-trainer` |
| Subscription | `subscription.create`, `subscription.renew`, `subscription.cancel`, `subscription.expire` |
| Payment | `payment.success`, `payment.fail` |
| Staff | `staff.create`, `staff.update`, `staff.delete`, `staff.assign-group` |
| Equipment | `equipment.create`, `equipment.delete`, `maintenance.create`, `maintenance.resolve` |
| Permission | `group.create`, `group.update`, `group.delete`, `group.assign-permission` |

### 6.2 Implementation

- NestJS interceptor capture mutation requests (POST/PUT/PATCH/DELETE) trên controller nhạy cảm.
- Lưu `before_data` (NULL với create), `after_data` (NULL với delete), `ip_address`, `user_agent`, `actor_user_id`.
- Không log GET (tránh storage explosion).
- Retention 1 năm; cron `audit:cleanup` xóa records cũ hơn.
- Bảng `audit_logs` append-only — không cho phép UPDATE/DELETE qua API.

### 6.3 Truy vấn

- Owner có dashboard riêng xem audit log.
- Filter: `actor_user_id`, `action`, `resource_type`, `resource_id`, time range.
- Endpoint `GET /api/v1/audit-logs` (chỉ role `owner`).

## 7. Feedback SLA

Tính từ `feedback.created_at` (calendar days, không phải business days):

| Severity | Thời hạn | Action khi quá hạn (v1.0) |
|---|---|---|
| `high` | 24 giờ | UI badge đỏ "Quá hạn" |
| `medium` | 48 giờ | UI badge cam "Quá hạn" |
| `low` | 7 ngày | UI badge vàng "Quá hạn" |

Cron `feedback:sla-check` hàng giờ đánh dấu badge. Không auto-escalate / không gửi alert email cho manager v1.0 (defer v1.1).

Feedback `status='resolved'` hoặc `status='rejected'` không tính SLA.

## 8. Backup & Disaster Recovery

### 8.1 Mục tiêu

- RTO: ≤ 4 giờ (downtime tối đa).
- RPO: ≤ 1 giờ (mất dữ liệu tối đa).

### 8.2 Chiến lược

- Full backup hàng ngày 1 lần, giữ 30 ngày (Supabase quản lý).
- Incremental backup mỗi 4 giờ, giữ 7 ngày (Supabase WAL).
- Offsite snapshot hàng tuần ra storage độc lập, giữ 90 ngày.

### 8.3 Quy trình khôi phục

1. Phát hiện: monitoring tự động cảnh báo (Sentry / Grafana).
2. Triage: lỗi nhẹ (restart) → trung bình (restore backup) → nặng (failover DR).
3. Restore: từ backup gần nhất, verify data integrity, restart application.
4. Verify: smoke test, switch traffic về primary, thông báo user.
5. Postmortem: ghi nguyên nhân, cập nhật runbook, review backup strategy.

### 8.4 Kiểm tra

- Restore drill hàng tuần (sandbox env).
- Full DR drill hàng quý.
- Cập nhật runbook khi pipeline thay đổi.

## 9. Currency & Timezone Conventions

### 9.1 Currency

- Lưu DB: `DECIMAL(12,2)`. V1.0 chỉ VND, giá trị luôn integer (phần thập phân `.00`).
- Validate API: từ chối input có phần thập phân khác 0.
- Không có discount/coupon trong v1.0 → không cần rounding rule. Khi thêm v1.1, dùng `ROUND(x, 0)` (banker's rounding) trước khi lưu.
- Đa tiền tệ defer v1.1 — sẽ cần thêm `currency_code` column và conversion table; KHÔNG chỉ là đổi data type.

### 9.2 Timezone

- DB session: `SET timezone = 'UTC';` (default Supabase).
- V1.0 DDL dùng `TIMESTAMP WITHOUT TIME ZONE` — quy ước giá trị lưu LUÔN là UTC. Application chịu trách nhiệm convert.
- TIMESTAMPTZ defer v1.1+ (xem Database.md "Timezone Convention" — tránh re-migrate trong v1.0 single-timezone).
- Application đọc datetime từ DB (UTC) → convert sang `Asia/Ho_Chi_Minh` khi display. Ghi vào DB → convert ngược về UTC.
- Tính ngày bản địa: dùng `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date` trong query, KHÔNG dùng `CURRENT_DATE` trực tiếp (sẽ là UTC date, sai 1 ngày quanh nửa đêm VN). Áp dụng cho: subscription `start_date`, staff_schedules `work_date`, cron `subscription:expire` so sánh `end_date`.

## 10. Error Handling Standards

### 10.1 Prisma error map

| Prisma code | HTTP | Message convention |
|---|---|---|
| P2002 | 409 | "X đã tồn tại" (X = tên field unique) |
| P2025 | 404 | "Không tìm thấy resource" |
| P2003 | 400 | "FK constraint vi phạm" |
| P1001 | 503 | "Không kết nối được DB" |

Implementation: `common/filters/HttpExceptionFilter` catch Prisma errors và map.

### 10.2 Race condition handling

- UC03B email UNIQUE: validate check ở step 2 là best-effort. Step 3 INSERT có thể fail P2002 → filter catch và trả 409 "Email đã tồn tại" thay vì raw error.
- UC05A schedule overlap: check trong cùng transaction với INSERT để đảm bảo atomic.
- Subscription expire vs cancel concurrent: dùng row-level lock `SELECT ... FOR UPDATE` khi cancel.

## 11. Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| JWT | JSON Web Token — chuỗi mã hóa chứa user identity + roles |
| OTP | One-Time Password — mã 6 chữ số dùng 1 lần cho verify/reset |
| RBAC | Role-Based Access Control — phân quyền theo nhóm/role |
| RTO | Recovery Time Objective — thời gian tối đa downtime sau sự cố |
| RPO | Recovery Point Objective — lượng dữ liệu tối đa có thể mất |
| SLA | Service Level Agreement — cam kết thời gian xử lý |
| TTL | Time-To-Live — thời hạn hiệu lực |
| FK | Foreign Key |
| PK | Primary Key |
| DDL | Data Definition Language (CREATE/ALTER/DROP) |
| WAL | Write-Ahead Log (Postgres replication mechanism) |

## 12. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-16 | TBD | Initial — extract từ SRS_VI.md §2.5/§4.8/§4.9/§4.10/§4.11/UC13, bổ sung 3 cron jobs (auth:unlock-expired-lockout, subscription:cancel-unpaid-pending, training-session:auto-close), thêm Timezone convention (UTC + Asia/Ho_Chi_Minh), thêm Error handling section. |
