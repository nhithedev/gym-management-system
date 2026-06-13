# Test Suite — Kế hoạch hoàn thiện

## Trạng thái hiện tại

| Metric | Hiện tại | Yêu cầu |
|--------|----------|---------|
| Services có spec | 11 / 21 | 21 / 21 |
| Controllers có spec | 8 / 18 | 18 / 18 |
| DTO validation tests | 2 files | Có |
| E2E / integration tests | 0 | Có |
| auth.service coverage | ~90% | ≥ 90% |
| Overall coverage | ~20% | services ≥80%, controllers ≥70%, branches ≥75% |

Đã pass: 24 spec files, 423 tests, 0 failures. Scripts `npm run test`, `test:watch`, `test:cov` hoạt động.

### Phases đã hoàn thành
- Phase 1 (Auth coverage ≥90%): hoàn thành — auth.service.spec.ts đầy đủ
- Phase 2 (DTO validation): hoàn thành — auth-dto-validation.spec.ts, package-dto-validation.spec.ts
- Phase 3 (Services lõi nghiệp vụ): hoàn thành — members, staff, training, payments, rbac
- Phase 4 (Controllers chính): hoàn thành — packages (13), subscriptions (11), members (15), staff (12), training (8), payments (6), reports (6) = 79 tests

---

## Phase 1 — Auth coverage lên ≥90%

**File:** `server/src/auth/auth.service.spec.ts` (thêm vào file hiện có)

Các branch chưa được cover:

| Case | Method | Mô tả |
|------|--------|--------|
| User không tìm thấy | `resendVerify` | Trả MSG mà không throw |
| User đã verify | `resendVerify` | Trả MSG mà không gửi OTP |
| Rate limited | `resendVerify` | Trả MSG, ghi audit |
| Happy path devOtp | `resendVerify` | NODE_ENV != production → devOtp có trong response |
| LINE find by lineId | `lineLogin` | Không tạo mới |
| LINE link by email | `lineLogin` | User tồn tại, update lineId |
| LINE tạo mới member | `lineLogin` | Cả 3 lookup miss → createMemberFromLine |
| LINE non-member bị chặn | `lineLogin` | ForbiddenException |
| changePassword user not found | `changePassword` | NotFoundException |
| changePassword sai password | `changePassword` | UnauthorizedException |
| changePassword happy path | `changePassword` | Hash mới, update DB, audit |

**Ước tính:** ~12 tests thêm vào file hiện có.

---

## Phase 2 — DTO validation tests

**File mới:** `server/src/auth/dto/auth-dto-validation.spec.ts`  
Pattern: `plainToInstance(Dto, raw)` → `validate()` từ `class-validator`.

| DTO | Cases |
|-----|-------|
| `LoginDto` | email hợp lệ, email rỗng, email sai format, password rỗng |
| `ForgotPasswordDto` | email hợp lệ, email rỗng, sai format |
| `ResetPasswordDto` | happy path, thiếu email, thiếu otp, password quá ngắn |
| `VerifyEmailDto` | happy path, thiếu email, thiếu otp |
| `CreateSubscriptionDto` | happy path, thiếu packageId, trainerId không phải number |
| `CreatePackageDto` | happy path, thiếu name, price âm, durationDays = 0 |
| `UpdatePackageDto` | partial update hợp lệ, price âm bị reject |

**Ước tính:** ~30 tests, 1-2 file.

---

## Phase 3 — Services lõi nghiệp vụ

### 3a. `members.service.spec.ts`
- Owner/staff thấy toàn bộ; member chỉ thấy profile của mình
- Tạo member: User + Member trong transaction; duplicate email → ConflictException
- Member not found → NotFoundException
- Gán trainer: trainer không tồn tại → NotFoundException
- Serialization BigInt → string

**Ước tính:** ~25 tests

### 3b. `staff.service.spec.ts`
- Tạo staff: User + Staff trong transaction, role assignment
- Staff not found → NotFoundException
- List staff với pagination

**Ước tính:** ~20 tests

### 3c. `training.service.spec.ts`
- Tạo session: trainer và member phải tồn tại
- Không tạo được nếu subscription không active
- Hủy session; list sessions với filter

**Ước tính:** ~20 tests

### 3d. `payments.service.spec.ts`
- Tạo payment gắn với subscription
- Payment/subscription not found → NotFoundException
- Decimal serialization chính xác
- List payments với filter

**Ước tính:** ~20 tests

### 3e. `rbac.service.spec.ts`
- CRUD group, assign permission
- Duplicate group name → ConflictException
- Group not found → NotFoundException
- Assign/remove user from group
- Cache invalidation sau khi thay đổi quyền

**Ước tính:** ~20 tests

---

## Phase 4 — Controller tests cho modules chính

Mỗi controller spec test: delegation đến service, format response `{ success, data }`, propagation exception.  
Không test guard logic (đã có guard specs riêng).

| File | Methods | Ước tính |
|------|---------|----------|
| `packages.controller.spec.ts` | list, get, create, update, updateStatus, delete | 15 tests |
| `subscriptions.controller.spec.ts` | list, get, create, renew, cancel | 12 tests |
| `members.controller.spec.ts` | list, get, create, update, assignTrainer | 12 tests |
| `staff.controller.spec.ts` | list, get, create, update | 10 tests |
| `training.controller.spec.ts` | list, create, cancel | 8 tests |
| `payments.controller.spec.ts` | list, get, create | 8 tests |
| `reports.controller.spec.ts` | revenue, memberStats, attendance | 6 tests |

**Ước tính tổng Phase 4:** ~71 tests

---

## Phase 5 — Services phụ trợ

| Service | Key cases | Ước tính |
|---------|-----------|----------|
| `facility.service.spec.ts` | CRUD phòng tập, thêm thiết bị, maintenance log | 20 tests |
| `feedback.service.spec.ts` | Tạo feedback, list theo member/trainer | 15 tests |
| `payment-accounts.service.spec.ts` | CRUD tài khoản, không trùng số tài khoản | 15 tests |
| `reports.service.spec.ts` | Revenue query, date range filter, member stats | 15 tests |
| `subscription-schedule.service.spec.ts` | Cron expire subscriptions, batch update, idempotent | 10 tests |

**Ước tính tổng Phase 5:** ~75 tests

---

## Phase 6 — Workout module services

| Service | Key cases | Ước tính |
|---------|-----------|----------|
| `exercises.service.spec.ts` | List, filter category, get by id, create/update | 15 tests |
| `workout-plans.service.spec.ts` | Tạo plan, thêm exercise vào plan, not found | 15 tests |
| `workout-logs.service.spec.ts` | Log workout, member chỉ log của mình, list theo ngày | 15 tests |

**Ước tính tổng Phase 6:** ~45 tests

---

## Phase 7 — Controllers còn lại

| File | Ước tính |
|------|----------|
| `rbac/groups.controller.spec.ts` | 8 tests |
| `rbac/permissions.controller.spec.ts` | 6 tests |
| `rbac/users-admin.controller.spec.ts` | 6 tests |
| `facility.controller.spec.ts` | 8 tests |
| `feedback.controller.spec.ts` | 6 tests |
| `payment-accounts.controller.spec.ts` | 6 tests |
| `workout/exercises.controller.spec.ts` | 6 tests |
| `workout/workout-logs.controller.spec.ts` | 6 tests |
| `workout/workout-plans.controller.spec.ts` | 6 tests |
| `health.controller.spec.ts` | 3 tests |

**Ước tính tổng Phase 7:** ~61 tests

---

## Phase 8 — External dependency failures

Thêm vào các spec file hiện có:

| Case | File |
|------|------|
| `bcrypt.hash` throw → InternalServerError | `auth.service.spec.ts` |
| `bcrypt.compare` throw → InternalServerError | `auth.service.spec.ts` |
| `prisma.user.findUnique` throw network error | `auth.service.spec.ts` |
| `prisma.$transaction` throw mid-transaction | `subscriptions.service.spec.ts` |
| `prisma.package.create` throw generic (non-P2002) | `packages.service.spec.ts` |

**Ước tính:** ~10 tests phân bổ vào file hiện có.

---

## Phase 9 — E2E / Integration tests

**File mới:** `server/src/auth/auth.e2e.spec.ts`  
Dùng `supertest` + `@nestjs/testing` bootstrap AppModule.

> **Chú ý:** E2E cần PostgreSQL. Nếu không có DB test, mock PrismaService ở module level thay thế.  
> Approach cần xác nhận trước khi viết (xem câu hỏi bên dưới).

| Flow | Cases |
|------|-------|
| `POST /api/v1/auth/login` | 200 đúng credentials, 401 sai password, 401 email không tồn tại |
| `GET /api/v1/auth/me` | 401 không có token, 401 token giả, 200 token hợp lệ |
| `POST /api/v1/auth/forgot-password` | 200 luôn (anti-enumeration) |
| Role guard | 403 khi member gọi endpoint owner |
| JWT expired | 401 token hết hạn |

**Ước tính:** ~15 tests

---

## Phase 10 — Final coverage report

Chạy `npm run test:cov`, verify ngưỡng:

| Target | Ngưỡng |
|--------|--------|
| auth.service | ≥ 90% statements, ≥ 85% branches |
| Tất cả services | ≥ 80% statements |
| Tất cả controllers | ≥ 70% statements |
| Overall branches | ≥ 75% |

Viết báo cáo cuối: coverage table, danh sách risks còn lại, gaps nếu có.

---

## Tổng kết ước tính

| Phase | Tests mới | Files mới |
|-------|-----------|-----------|
| 1 — Auth coverage | ~12 | 0 |
| 2 — DTO validation | ~30 | 2 |
| 3 — Services lõi | ~105 | 5 |
| 4 — Controllers chính | ~71 | 7 |
| 5 — Services phụ | ~75 | 5 |
| 6 — Workout services | ~45 | 3 |
| 7 — Controllers còn lại | ~61 | 10 |
| 8 — Dependency failures | ~10 | 0 |
| 9 — E2E | ~15 | 1 |
| **Tổng** | **~424** | **~33** |

Tổng sau khi hoàn thành: ~611 tests, ~43 spec files.

---

## Câu hỏi cần xác nhận trước khi bắt đầu

**Q1 — E2E approach (Phase 9):**  
Dùng DB PostgreSQL thật (đúng tinh thần integration, cần setup thêm)  
hay mock PrismaService ở module level (nhanh hơn, ít giá trị hơn)?

**Q2 — Scope:**  
Triển khai toàn bộ 10 phases hay ưu tiên theo thứ tự Phase 1 → 2 → 3 → 4 → 8 → 9 trước?  
Chi phí token cho toàn bộ plan rất cao.

**Q3 — audit.service và prisma.service:**  
Hai service đơn giản (logging wrapper và PrismaClient lifecycle).  
Bỏ qua hoặc chỉ viết 3-5 smoke tests?
