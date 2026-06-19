# SOLID Refactor — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor backend `server/src/` để tuân thủ SOLID — tách 5 service monolithic, sửa logic sai (LSP), và loại bỏ hardcode coupling (OCP/DIP).

**Architecture:** Mỗi task là một commit độc lập, không thay đổi hành vi API bên ngoài (pure internal refactor). Service lớn được tách thành service nhỏ hơn; service cũ giữ nguyên API bằng cách delegate sang service mới. Controller không bị thay đổi trừ task sửa bug LSP.

**Tech Stack:** NestJS 10, Prisma 5, TypeScript 5, PostgreSQL.

## Global Constraints

- Không thay đổi bất kỳ route URL, response shape, hoặc HTTP status code nào.
- Mọi file mới: `kebab-case.ts` với suffix loại (`.service.ts`, `.module.ts`).
- Sau mỗi task: `cd server && npm run build` và `cd server && npm run lint` phải pass.
- Không có test framework — verification là build + lint + manual smoke test endpoint bị ảnh hưởng.
- Dùng `npm run dev` để start server khi cần smoke test.
- `PrismaService` không được instantiate trực tiếp — luôn inject.
- Seed owner: `owner@gym.local` / `Password123!`.

## Skills & Subagents (áp dụng cho toàn plan)

- `feature-dev:feature-dev` — trước mỗi task tạo/sửa NestJS service/module.
- `superpowers:verification-before-completion` — trước khi đánh dấu task done.
- `superpowers:requesting-code-review` — trước khi commit task quan trọng.
- `security-review` — các task Phase 3 (auth).

---

## File Map

### Tạo mới

```
server/src/auth/password-reset.service.ts
server/src/auth/email-verification.service.ts
server/src/auth/line-oauth.service.ts
server/src/facility/equipment.service.ts
server/src/facility/maintenance.service.ts
server/src/staff/staff-schedule.service.ts
server/src/staff/staff-attendance.service.ts
server/src/members/trainer-assignment.service.ts
server/src/members/member-progress.service.ts
server/src/training/attendance.service.ts
server/src/training/device-access.service.ts
server/src/training/filters/caller-query-filter.ts
server/src/common/interfaces/permission-cache.interface.ts
server/src/common/cache/in-memory-permission-cache.service.ts
```

### Sửa đổi

```
server/src/auth/auth.service.ts          — giữ API, delegate sang sub-services
server/src/auth/auth.module.ts           — đăng ký sub-services mới
server/src/facility/facility.service.ts  — delegate + xóa duplicate catch
server/src/facility/facility.module.ts   — đăng ký sub-services
server/src/staff/staff.service.ts        — delegate + xóa duplicate catch
server/src/staff/staff.module.ts         — đăng ký sub-services
server/src/members/members.service.ts    — delegate + xóa duplicate catch
server/src/members/members.module.ts     — đăng ký sub-services
server/src/training/training.service.ts  — delegate + strategy pattern
server/src/training/training.module.ts   — đăng ký sub-services
server/src/common/guards/permissions.guard.ts — inject cache provider
server/src/common/common.module.ts       — đăng ký cache provider
```

---

## Pre-Refactor Protocol

**Phải hoàn thành đầy đủ 7 bước này trước khi bắt đầu bất kỳ task tách service nào (Phase 3–7).**
Mục đích: đảm bảo không có API contract nào bị vỡ và không có circular dependency mới sau refactor.

Trong mỗi task split service đầu tiên của từng module, 7 bước này được nhúng trực tiếp với lệnh cụ thể.
Với task thứ hai trở đi của cùng module, chỉ cần re-verify Check 2 và Check 7.

### Check 1 — Xác định trách nhiệm

Đọc service file, liệt kê tất cả public method và ghi ngắn gọn nhiệm vụ từng method.
Xác định ranh giới: method nào sẽ ở lại service cũ, method nào sẽ chuyển sang service mới.

### Check 2 — Liệt kê toàn bộ API endpoint

```bash
# Thay <module> bằng tên module (auth, facility, staff, members, training)
grep -n "@Get\|@Post\|@Put\|@Patch\|@Delete" server/src/<module>/<module>.controller.ts
grep -n "@HttpCode\|@UseGuards\|@Roles\|@RequirePermission\|@Public" server/src/<module>/<module>.controller.ts
```

Với mỗi endpoint, ghi lại:
- HTTP method + URL đầy đủ (kể cả prefix `/api/v1/`)
- Request body (xem DTO tương ứng)
- Query params (xem ListDto nếu có)
- Response format (xem return type của service method)
- HTTP status codes (xem `@HttpCode`, default: GET/PUT/PATCH/DELETE=200, POST=201)
- Roles/permissions (`@Roles(...)`, `@RequirePermission(...)`)

### Check 3 — Kiểm tra API contract với frontend

```bash
# Tìm nơi frontend gọi endpoint này:
grep -rn "<url-fragment>" client/src/services/ client/src/hooks/
```

Xác nhận: data shape frontend đang expect có khớp với response service đang trả không.
Nếu có mismatch → ghi lại, không sửa trong task refactor này (ngoài scope).

### Check 4 — Kiểm tra dependency của module

```bash
# Xem module import gì từ module khác:
cat server/src/<module>/<module>.module.ts

# Xem service nhận inject gì:
grep -A 20 "constructor(" server/src/<module>/<module>.service.ts | head -25
```

Lập danh sách: service mới sẽ cần inject những gì? Tất cả phải có sẵn trong module hoặc
được import từ module khác (đã có trong `imports[]` của module).

### Check 5 — Kiểm tra circular dependency

```bash
# Module nào đang import <ModuleName>Module (tìm file .module.ts import nó):
grep -rn "<ModuleName>Module" server/src/ --include="*.module.ts"

# Module hiện tại import gì:
grep -n "imports:" server/src/<module>/<module>.module.ts -A 20 | head -25
```

Quy tắc: nếu Module A import Module B, Module B không được import Module A.
Nếu phát hiện risk → dùng `forwardRef()` hoặc tách phần dùng chung ra CommonModule.

### Check 6 — Kiểm tra logic database

```bash
# Liệt kê các Prisma model được access trong service:
grep -oP "this\.prisma\.\K\w+" server/src/<module>/<module>.service.ts | sort -u

# Xem transaction blocks:
grep -n "\$transaction" server/src/<module>/<module>.service.ts
```

Xác định: service mới sau split có cần access model của service khác cùng module không?
Nếu có → service mới cần inject service kia, hoặc cần giữ cả hai method trong cùng service.

### Check 7 — Kiểm tra exception/error handling

```bash
# Liệt kê tất cả throw statements và try-catch:
grep -n "throw new\|} catch\|try {" server/src/<module>/<module>.service.ts
```

Đảm bảo: sau split, exception type và message không thay đổi. Không để exception bị nuốt
hoặc bị wrap lại thành type khác khi chuyển qua delegate layer.

---

## Phase 1 — LSP Quick Fixes

Sửa logic sai không cần tái cấu trúc. Ưu tiên cao nhất vì đây là bug thực.

---

### Task 2: Type-safe subscription status filter

**Files:**
- Modify: `server/src/members/dto/list-members.dto.ts` (hoặc file DTO list members)
- Modify: `server/src/members/members.service.ts` (update type reference)

**Interfaces:**
- Consumes: không có dependency mới
- Produces: `GET /api/v1/members?subStatus=invalid` trả 400 thay vì im lặng bỏ qua

- [ ] **Bước 1: Tìm DTO hiện tại**

```bash
cd server
grep -rn "subStatus\|SubscriptionStatus" src/members/dto/
```

- [ ] **Bước 2: Thêm enum vào DTO**

Mở file DTO list members, thêm:

```typescript
export enum SubscriptionStatusFilter {
  Active  = 'active',
  Expired = 'expired',
}

// Trong class ListMembersDto (hoặc tên tương đương):
@IsOptional()
@IsEnum(SubscriptionStatusFilter, {
  message: `subStatus phải là: ${Object.values(SubscriptionStatusFilter).join(', ')}`,
})
subStatus?: SubscriptionStatusFilter
```

- [ ] **Bước 3: Cập nhật service type**

Trong `members.service.ts`, tìm `subStatus` và đổi type annotation thành
`SubscriptionStatusFilter | undefined` (nếu có explicit type).
Enum value string không đổi nên logic `if (subStatus === 'active')` vẫn hoạt động.

- [ ] **Bước 4: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 5: Smoke test**

```bash
# Phải trả 400:
curl -s "http://localhost:3000/api/v1/members?subStatus=invalid" \
  -H "Authorization: Bearer <owner-token>" | jq .

# Phải trả list bình thường:
curl -s "http://localhost:3000/api/v1/members?subStatus=active" \
  -H "Authorization: Bearer <owner-token>" | jq .
```

- [ ] **Bước 6: Commit**

```bash
git add server/src/members/dto/ server/src/members/members.service.ts
git commit -m "fix: validate subStatus query param as enum"
```

---

## Phase 2 — OCP/DIP Quick Wins

---

### Task 3: Xóa duplicate P2002 catch blocks trong services

`HttpExceptionFilter` đã xử lý Prisma errors toàn cục. Một số service catch `P2002`/`P2025`
trùng, tạo inconsistent behavior.

**Files:**
- Modify: `server/src/facility/facility.service.ts`
- Modify: bất kỳ service nào khác có `err.code === 'P2002'` hoặc `P2025` (kiểm tra bước 1)

**Interfaces:**
- Consumes: `HttpExceptionFilter` (đã có sẵn, global)
- Produces: service không còn catch Prisma errors — để filter xử lý

- [ ] **Bước 1: Tìm tất cả duplicate catch**

```bash
cd server
grep -rn "P2002\|P2025" src/ --include="*.ts" | grep -v "filter\|spec"
```

Expected: thấy các dòng trong service files (không phải filter).

- [ ] **Bước 2: Với mỗi file tìm được**

Xóa block `try-catch` dạng:

```typescript
// XÓA block này:
} catch (error: unknown) {
  if ((error as { code?: string }).code === 'P2002') {
    throw new ConflictException({ success: false, code: 'DUPLICATE', message: '...' })
  }
  if ((error as { code?: string }).code === 'P2025') {
    throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: '...' })
  }
  throw error
}
```

Lý do: `HttpExceptionFilter` đã map `P2002 → 409`, `P2025 → 404` với cùng shape
`{ success, code, message }`. Duplicate catch tạo risk message không nhất quán.

**Chú ý:** Chỉ xóa catch block nếu nó CHỈ handle P2002/P2025. Nếu catch block còn xử lý
logic khác, giữ nguyên logic đó và chỉ xóa Prisma-error branches.

- [ ] **Bước 3: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 4: Smoke test**

Thử tạo resource bị duplicate (ví dụ: POST member với email đã tồn tại). Phải vẫn trả 409.
Thử update resource không tồn tại — phải vẫn trả 404.

- [ ] **Bước 5: Commit**

```bash
git add server/src/
git commit -m "refactor: remove duplicate P2002/P2025 catch blocks — delegate to HttpExceptionFilter"
```

---

### Task 4: ConfigService-driven cache TTL trong PermissionsGuard

**Files:**
- Modify: `server/src/common/guards/permissions.guard.ts`
- Modify: `server/src/config/configuration.ts` (thêm key `permissionCacheTtlMs` nếu chưa có)

**Interfaces:**
- Consumes: `ConfigService` (đã inject ở NestJS global)
- Produces: TTL đọc từ env var `PERMISSION_CACHE_TTL_MS` (default `60000`)

- [ ] **Bước 1: Đọc file hiện tại**

```bash
cd server
grep -n "CACHE_TTL_MS\|permCache\|pendingQueries\|constructor" src/common/guards/permissions.guard.ts | head -20
```

- [ ] **Bước 2: Đưa global vars vào class, inject ConfigService**

Sửa class để `permCache` và `pendingQueries` là private property, TTL lấy từ config:

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly cacheTtlMs: number
  private readonly permCache = new Map<string, { codes: Set<string>; exp: number }>()
  private readonly pendingQueries = new Map<string, Promise<Set<string>>>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.cacheTtlMs = this.config.get<number>('PERMISSION_CACHE_TTL_MS') ?? 60_000
  }

  // ... thay CACHE_TTL_MS bằng this.cacheTtlMs trong toàn class
}
```

- [ ] **Bước 3: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 4: Commit**

```bash
git add server/src/common/guards/permissions.guard.ts
git commit -m "refactor: permissions guard cache TTL via ConfigService"
```

---

## Phase 3 — SRP: Split AuthService

AuthService hiện có ~634 dòng, 7 trách nhiệm. Tách thành 3 sub-service.
AuthService giữ nguyên public API (delegate sang sub-service) để AuthController không đổi.

---

### Task 5: Extract PasswordResetService

**Files:**
- Create: `server/src/auth/password-reset.service.ts`
- Modify: `server/src/auth/auth.service.ts` (xóa methods, thêm dependency)
- Modify: `server/src/auth/auth.module.ts` (đăng ký provider mới)

**Interfaces:**
- Consumes: `PrismaService`, `RateLimitService`, `ConfigService`, `OtpStoreService`, `AuditService`
- Produces: `PasswordResetService` với 2 public methods

**Skills:** `feature-dev:feature-dev`, `security-review`.

#### Pre-Refactor Checklist — Auth Module

Chạy một lần cho cả Phase 3 (Tasks 5-7). Lưu kết quả vào comment hoặc note tạm.

- [ ] **Check 1: Xác định trách nhiệm hiện tại của AuthService**

```bash
grep -n "^  async " server/src/auth/auth.service.ts
```

Liệt kê từng public method và ghi ngắn: `login` → xác thực + JWT, `forgotPassword` → OTP flow, v.v.
Xác định rõ: method nào sẽ ở lại `AuthService`, method nào sẽ chuyển sang service mới.

- [ ] **Check 2: Liệt kê toàn bộ API endpoint của Auth module**

```bash
grep -n "@Get\|@Post\|@Put\|@Patch\|@Delete" server/src/auth/auth.controller.ts
grep -n "@HttpCode\|@UseGuards\|@Roles\|@RequirePermission\|@Public" server/src/auth/auth.controller.ts
```

Ghi ra bảng: method/URL | body DTO | response | status | roles.

- [ ] **Check 3: Kiểm tra frontend gọi auth endpoint nào**

```bash
grep -rn "auth\|login\|logout\|forgot\|reset\|verify" client/src/services/ | grep -i "api\|axios\|fetch"
```

Xác nhận shape request/response frontend đang dùng khớp với service hiện tại.

- [ ] **Check 4: Kiểm tra dependency của AuthModule**

```bash
cat server/src/auth/auth.module.ts
grep -A 25 "constructor(" server/src/auth/auth.service.ts | head -30
```

Liệt kê: service mới (`PasswordResetService`) sẽ cần những inject nào?
Tất cả phải đã có trong `providers[]` hoặc `imports[]` của `AuthModule`.

- [ ] **Check 5: Kiểm tra circular dependency**

```bash
grep -rn "AuthModule" server/src/ --include="*.module.ts"
grep -n "imports:" server/src/auth/auth.module.ts -A 20 | head -25
```

Đảm bảo không có module nào trong `imports[]` của `AuthModule` lại import `AuthModule` ngược lại.

- [ ] **Check 6: Kiểm tra logic database**

```bash
grep -oP "this\.prisma\.\K\w+" server/src/auth/auth.service.ts | sort -u
grep -n "\$transaction" server/src/auth/auth.service.ts
```

Xác định `forgotPassword` và `resetPassword` access những Prisma model nào.
Service mới phải tự truy cập được những model đó (chỉ cần inject `PrismaService`).

- [ ] **Check 7: Kiểm tra exception/error handling**

```bash
grep -n "throw new\|} catch\|try {" server/src/auth/auth.service.ts
```

Ghi lại các exception type và HTTP code của từng method sẽ bị chuyển.
Sau khi chuyển, smoke test phải trả đúng các code đó.

---

#### Thực hiện Task 5

- [ ] **Bước 1: Xác định methods cần chuyển**

```bash
grep -n "async forgotPassword\|async resetPassword" server/src/auth/auth.service.ts
```

- [ ] **Bước 2: Tạo file mới với skeleton**

`server/src/auth/password-reset.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditService } from '../common/audit/audit.service'
import { OtpStoreService } from '../common/otp-store/otp-store.service'
import { RateLimitService } from '../common/rate-limit/rate-limit.service'
import { PrismaService } from '../prisma/prisma.service'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly config: ConfigService,
    private readonly otpStore: OtpStoreService,
    private readonly audit: AuditService,
  ) {}

  // CUT từ auth.service.ts — giữ nguyên toàn bộ implementation
  async forgotPassword(dto: ForgotPasswordDto, ip?: string): Promise<void> {
    // paste toàn bộ body từ auth.service.ts
  }

  async resetPassword(dto: ResetPasswordDto, ip?: string): Promise<void> {
    // paste toàn bộ body từ auth.service.ts
  }
}
```

- [ ] **Bước 3: Đăng ký trong auth.module.ts**

```typescript
import { PasswordResetService } from './password-reset.service'

@Module({
  providers: [
    UsersService,
    AuthService,
    PasswordResetService,  // THÊM
    // ...existing providers
  ],
  exports: [AuthService, PasswordResetService],
})
```

- [ ] **Bước 4: Cập nhật AuthService — inject và delegate**

```typescript
// Thêm vào constructor:
private readonly passwordReset: PasswordResetService,

// Thay toàn bộ body của 2 method:
async forgotPassword(dto: ForgotPasswordDto, ip?: string): Promise<void> {
  return this.passwordReset.forgotPassword(dto, ip)
}

async resetPassword(dto: ResetPasswordDto, ip?: string): Promise<void> {
  return this.passwordReset.resetPassword(dto, ip)
}
```

Xóa các import không còn dùng trong `auth.service.ts` sau khi chuyển method.

- [ ] **Bước 5: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 6: Smoke test**

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.local"}' | jq .
```

Expected: response shape không đổi so với trước refactor.

- [ ] **Bước 7: Commit**

```bash
git add server/src/auth/password-reset.service.ts \
        server/src/auth/auth.service.ts \
        server/src/auth/auth.module.ts
git commit -m "refactor(auth): extract PasswordResetService"
```

---

### Task 6: Extract EmailVerificationService

**Files:**
- Create: `server/src/auth/email-verification.service.ts`
- Modify: `server/src/auth/auth.service.ts`
- Modify: `server/src/auth/auth.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `OtpStoreService`, `AuditService`, `ConfigService`
- Produces: `EmailVerificationService` với 2 public methods

> Pre-Refactor Checklist đã chạy ở Task 5. Trước bước thực hiện, re-verify:
> Check 2: xác nhận endpoint verify-email/resend-verify vẫn map đúng method.
> Check 7: xác nhận exception type của `verifyEmail` và `resendVerify`.

- [ ] **Bước 1: Xác định methods cần chuyển**

```bash
grep -n "async verifyEmail\|async resendVerify" server/src/auth/auth.service.ts
```

- [ ] **Bước 2: Tạo file**

`server/src/auth/email-verification.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuditService } from '../common/audit/audit.service'
import { OtpStoreService } from '../common/otp-store/otp-store.service'
import { PrismaService } from '../prisma/prisma.service'
import { ResendVerifyDto } from './dto/resend-verify.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpStore: OtpStoreService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async verifyEmail(dto: VerifyEmailDto, ip?: string): Promise<void> {
    // paste từ auth.service.ts
  }

  async resendVerify(dto: ResendVerifyDto, ip?: string): Promise<void> {
    // paste từ auth.service.ts
  }
}
```

- [ ] **Bước 3: Đăng ký và delegate** (giống pattern Task 5)

Thêm `EmailVerificationService` vào `auth.module.ts` providers/exports.
Trong `auth.service.ts`: inject + delegate `verifyEmail` và `resendVerify`.

- [ ] **Bước 4: Build, lint, smoke test**

```bash
cd server && npm run build && npm run lint
```

Smoke test: `POST /api/v1/auth/verify-email` — response không đổi.

- [ ] **Bước 5: Commit**

```bash
git add server/src/auth/email-verification.service.ts \
        server/src/auth/auth.service.ts \
        server/src/auth/auth.module.ts
git commit -m "refactor(auth): extract EmailVerificationService"
```

---

### Task 7: Extract LineOAuthService

**Files:**
- Create: `server/src/auth/line-oauth.service.ts`
- Modify: `server/src/auth/auth.service.ts`
- Modify: `server/src/auth/auth.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtService`, `ConfigService`, `AuditService`, `UsersService`
- Produces: `LineOAuthService.lineLogin()` — xử lý toàn bộ LINE OAuth flow

> Pre-Refactor Checklist đã chạy ở Task 5. Re-verify Check 7 cho `lineLogin`:
> xác nhận exception codes (LINE_LOGIN_MEMBER_ONLY, USER_INACTIVE, v.v.) không đổi.

- [ ] **Bước 1: Xác định method**

```bash
grep -n "async lineLogin" server/src/auth/auth.service.ts
```

- [ ] **Bước 2: Tạo file**

`server/src/auth/line-oauth.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { UsersService } from './users.service'
import { LineLoginDto } from './dto/line-login.dto'

@Injectable()
export class LineOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async lineLogin(dto: LineLoginDto, ip?: string) {
    // paste toàn bộ body lineLogin từ auth.service.ts
  }
}
```

- [ ] **Bước 3: Đăng ký và delegate** (giống pattern Task 5)

- [ ] **Bước 4: Kiểm tra imports còn lại trong AuthService**

Sau Task 5-7, `auth.service.ts` chỉ còn: `login`, `logout`, `changePassword` + 3 delegate method.
Xóa các import không còn dùng trực tiếp (nếu `OtpStoreService` đã chuyển hết sang sub-services).

```bash
grep -n "^import " server/src/auth/auth.service.ts
```

Với mỗi import, kiểm tra xem còn được dùng trong phần code còn lại của `AuthService` không.

- [ ] **Bước 5: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 6: Commit**

```bash
git add server/src/auth/line-oauth.service.ts \
        server/src/auth/auth.service.ts \
        server/src/auth/auth.module.ts
git commit -m "refactor(auth): extract LineOAuthService"
```

---

## Phase 4 — SRP: Split FacilityService

---

### Task 8: Extract EquipmentService

FacilityService hiện quản lý cả Room lẫn Equipment. Equipment có CRUD riêng biệt.

**Files:**
- Create: `server/src/facility/equipment.service.ts`
- Modify: `server/src/facility/facility.service.ts`
- Modify: `server/src/facility/facility.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: `EquipmentService` với các method CRUD equipment

#### Pre-Refactor Checklist — Facility Module

Chạy một lần cho cả Phase 4 (Tasks 8-9).

- [ ] **Check 1: Xác định trách nhiệm hiện tại**

```bash
grep -n "^  async " server/src/facility/facility.service.ts
```

Phân loại từng method: Room CRUD | Equipment CRUD | Maintenance CRUD | Code generation | Serialization.

- [ ] **Check 2: Liệt kê toàn bộ API endpoint**

```bash
grep -n "@Get\|@Post\|@Put\|@Patch\|@Delete" server/src/facility/facility.controller.ts
grep -n "@HttpCode\|@UseGuards\|@Roles\|@RequirePermission\|@Public" server/src/facility/facility.controller.ts
```

Ghi ra: method/URL | body DTO | response | status | roles.

- [ ] **Check 3: Kiểm tra frontend**

```bash
grep -rn "facility\|equipment\|maintenance\|room" client/src/services/ | grep -i "api\|axios\|fetch"
```

- [ ] **Check 4: Kiểm tra dependency**

```bash
cat server/src/facility/facility.module.ts
grep -A 20 "constructor(" server/src/facility/facility.service.ts | head -25
```

`EquipmentService` cần: `PrismaService`, `AuditService`. Cả hai đã có trong module chưa?

- [ ] **Check 5: Kiểm tra circular dependency**

```bash
grep -rn "FacilityModule" server/src/ --include="*.module.ts"
```

- [ ] **Check 6: Kiểm tra Prisma models**

```bash
grep -oP "this\.prisma\.\K\w+" server/src/facility/facility.service.ts | sort -u
grep -n "\$transaction" server/src/facility/facility.service.ts
```

Xác nhận: equipment methods chỉ access `equipment` model (và có thể `gymRoom` để validate FK).
Nếu có transaction bao gồm cả room và equipment → không tách method đó.

- [ ] **Check 7: Kiểm tra exception/error handling**

```bash
grep -n "throw new\|} catch\|try {" server/src/facility/facility.service.ts
```

---

#### Thực hiện Task 8

- [ ] **Bước 1: Xác định methods cần chuyển**

```bash
grep -n "async.*[Ee]quipment\|async.*equipment" server/src/facility/facility.service.ts
```

- [ ] **Bước 2: Tạo EquipmentService**

`server/src/facility/equipment.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // CUT từ facility.service.ts — paste toàn bộ equipment methods
}
```

- [ ] **Bước 3: Đăng ký trong facility.module.ts**

```typescript
import { EquipmentService } from './equipment.service'

@Module({
  providers: [FacilityService, EquipmentService],
  exports:   [FacilityService, EquipmentService],
})
```

- [ ] **Bước 4: Delegate trong FacilityService**

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly audit: AuditService,
  private readonly equipment: EquipmentService,  // THÊM
) {}

async createEquipment(dto, caller) {
  return this.equipment.createEquipment(dto, caller)
}
// ... tương tự cho các equipment method khác
```

- [ ] **Bước 5: Build, lint, smoke test**

```bash
cd server && npm run build && npm run lint
```

Smoke test: `GET /api/v1/facility/equipment` — trả danh sách như cũ.

- [ ] **Bước 6: Commit**

```bash
git add server/src/facility/equipment.service.ts \
        server/src/facility/facility.service.ts \
        server/src/facility/facility.module.ts
git commit -m "refactor(facility): extract EquipmentService"
```

---

### Task 9: Extract MaintenanceService

**Files:**
- Create: `server/src/facility/maintenance.service.ts`
- Modify: `server/src/facility/facility.service.ts`
- Modify: `server/src/facility/facility.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: `MaintenanceService` với CRUD maintenance logs

> Pre-Refactor Checklist đã chạy ở Task 8. Re-verify Check 6 cho maintenance:
> xác nhận `maintenanceLog` methods không dùng transaction chung với room/equipment.
> Re-verify Check 7 cho exception handling của maintenance methods.

- [ ] **Bước 1: Xác định methods**

```bash
grep -n "async.*[Mm]aintenance\|[Mm]aintenanceLog" server/src/facility/facility.service.ts
```

- [ ] **Bước 2: Tạo file**

`server/src/facility/maintenance.service.ts` — paste các maintenance methods từ `facility.service.ts`.

```typescript
import { Injectable } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // CUT từ facility.service.ts
}
```

- [ ] **Bước 3-6:** Giống Task 8 (đăng ký module, delegate, build, lint, commit).

```bash
git commit -m "refactor(facility): extract MaintenanceService"
```

---

## Phase 5 — SRP: Split StaffService

---

### Task 10: Extract StaffScheduleService

**Files:**
- Create: `server/src/staff/staff-schedule.service.ts`
- Modify: `server/src/staff/staff.service.ts`
- Modify: `server/src/staff/staff.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: CRUD staff schedules

#### Pre-Refactor Checklist — Staff Module

Chạy một lần cho cả Phase 5 (Tasks 10-11).

- [ ] **Check 1: Xác định trách nhiệm hiện tại**

```bash
grep -n "^  async " server/src/staff/staff.service.ts
```

Phân loại: Staff CRUD | Schedule CRUD | Attendance check-in/out | Cascading deletion | Code generation.

- [ ] **Check 2: Liệt kê toàn bộ API endpoint**

```bash
grep -n "@Get\|@Post\|@Put\|@Patch\|@Delete" server/src/staff/staff.controller.ts
grep -n "@HttpCode\|@UseGuards\|@Roles\|@RequirePermission\|@Public" server/src/staff/staff.controller.ts
```

- [ ] **Check 3: Kiểm tra frontend**

```bash
grep -rn "staff\|schedule\|attendance" client/src/services/ | grep -i "api\|axios\|fetch"
```

- [ ] **Check 4: Kiểm tra dependency**

```bash
cat server/src/staff/staff.module.ts
grep -A 20 "constructor(" server/src/staff/staff.service.ts | head -25
```

- [ ] **Check 5: Kiểm tra circular dependency**

```bash
grep -rn "StaffModule" server/src/ --include="*.module.ts"
```

- [ ] **Check 6: Kiểm tra Prisma models và transactions**

```bash
grep -oP "this\.prisma\.\K\w+" server/src/staff/staff.service.ts | sort -u
grep -n "\$transaction" server/src/staff/staff.service.ts
```

Chú ý: `deleteStaff` có thể nullify FK qua nhiều table trong transaction. Nếu vậy,
method đó phải ở lại `StaffService`, không chuyển sang sub-service.

- [ ] **Check 7: Kiểm tra exception/error handling**

```bash
grep -n "throw new\|} catch\|try {" server/src/staff/staff.service.ts
```

---

#### Thực hiện Task 10

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Ss]chedule" server/src/staff/staff.service.ts
```

- [ ] **Bước 2: Tạo StaffScheduleService**

```typescript
// server/src/staff/staff-schedule.service.ts
import { Injectable } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class StaffScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  // paste schedule methods từ staff.service.ts
}
```

- [ ] **Bước 3-6:** Đăng ký module, delegate từ StaffService, build, lint, commit.

```bash
git commit -m "refactor(staff): extract StaffScheduleService"
```

---

### Task 11: Extract StaffAttendanceService

**Files:**
- Create: `server/src/staff/staff-attendance.service.ts`
- Modify: `server/src/staff/staff.service.ts`
- Modify: `server/src/staff/staff.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: check-in / check-out / list attendance

> Pre-Refactor Checklist đã chạy ở Task 10. Re-verify:
> Check 6: attendance methods có dùng chung transaction với staff CRUD không?
> Check 7: exception codes của check-in/check-out không bị thay đổi.

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Aa]ttendance\|checkIn\|checkOut" server/src/staff/staff.service.ts
```

- [ ] **Bước 2: Tạo file** (cùng pattern Task 10, thay tên class)

- [ ] **Bước 3-6:** Đăng ký, delegate, build, lint, commit.

```bash
git commit -m "refactor(staff): extract StaffAttendanceService"
```

---

## Phase 6 — SRP: Split MembersService

---

### Task 12: Extract TrainerAssignmentService

**Files:**
- Create: `server/src/members/trainer-assignment.service.ts`
- Modify: `server/src/members/members.service.ts`
- Modify: `server/src/members/members.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: `assignTrainer()`, `selfAssignTrainer()`, `getAvailableTrainers()`

#### Pre-Refactor Checklist — Members Module

Chạy một lần cho cả Phase 6 (Tasks 12-13).

- [ ] **Check 1: Xác định trách nhiệm hiện tại**

```bash
grep -n "^  async " server/src/members/members.service.ts
```

Phân loại: Member CRUD | Subscription activation | Trainer assignment | Progress tracking | Self-registration | Access control.

- [ ] **Check 2: Liệt kê toàn bộ API endpoint**

```bash
grep -n "@Get\|@Post\|@Put\|@Patch\|@Delete" server/src/members/members.controller.ts
grep -n "@HttpCode\|@UseGuards\|@Roles\|@RequirePermission\|@Public" server/src/members/members.controller.ts
```

Lưu ý: Members module có thể có nhiều controller (member self-service vs admin).
```bash
ls server/src/members/
```

- [ ] **Check 3: Kiểm tra frontend**

```bash
grep -rn "member\|trainer.*assign\|progress" client/src/services/ | grep -i "api\|axios\|fetch"
```

- [ ] **Check 4: Kiểm tra dependency**

```bash
cat server/src/members/members.module.ts
grep -A 20 "constructor(" server/src/members/members.service.ts | head -25
```

- [ ] **Check 5: Kiểm tra circular dependency**

```bash
grep -rn "MembersModule" server/src/ --include="*.module.ts"
```

`TrainingModule` hoặc `PaymentsModule` có import `MembersModule` không? Nếu `MembersModule`
định import lại → circular. Phải dùng `forwardRef()` hoặc tách shared logic ra `CommonModule`.

- [ ] **Check 6: Kiểm tra Prisma models và transactions**

```bash
grep -oP "this\.prisma\.\K\w+" server/src/members/members.service.ts | sort -u
grep -n "\$transaction" server/src/members/members.service.ts
```

Trainer assignment methods có access model `staff` hoặc `member` không? Nếu có → cần đảm bảo
`TrainerAssignmentService` inject đủ `PrismaService`.

- [ ] **Check 7: Kiểm tra exception/error handling**

```bash
grep -n "throw new\|} catch\|try {" server/src/members/members.service.ts
```

---

#### Thực hiện Task 12

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Tt]rainer\|assignTrainer\|availableTrainer\|selfAssign" server/src/members/members.service.ts
```

- [ ] **Bước 2: Tạo TrainerAssignmentService**

```typescript
// server/src/members/trainer-assignment.service.ts
import { Injectable } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TrainerAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // paste từ members.service.ts:
  // assignTrainer, selfAssignTrainer, getAvailableTrainers
}
```

- [ ] **Bước 3-6:** Đăng ký, delegate, build, lint, commit.

```bash
git commit -m "refactor(members): extract TrainerAssignmentService"
```

---

### Task 13: Extract MemberProgressService

**Files:**
- Create: `server/src/members/member-progress.service.ts`
- Modify: `server/src/members/members.service.ts`
- Modify: `server/src/members/members.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: `recordSelfProgress()` và các progress-related methods

> Pre-Refactor Checklist đã chạy ở Task 12. Re-verify:
> Check 6: progress methods chỉ access `memberProgress` model, không dùng transaction chung với subscription.
> Check 7: exception codes của progress methods không đổi.

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Pp]rogress\|recordSelf" server/src/members/members.service.ts
```

- [ ] **Bước 2: Tạo file** (cùng pattern Task 12)

- [ ] **Bước 3-6:** Đăng ký, delegate, build, lint, commit.

```bash
git commit -m "refactor(members): extract MemberProgressService"
```

---

## Phase 7 — SRP: Split TrainingService

TrainingService là file lớn nhất (~1402 dòng). Tách theo concern độc lập nhất.

---

### Task 14: Extract AttendanceService

**Files:**
- Create: `server/src/training/attendance.service.ts`
- Modify: `server/src/training/training.service.ts`
- Modify: `server/src/training/training.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: CRUD attendance logs, deduplication logic

#### Pre-Refactor Checklist — Training Module

Chạy một lần cho cả Phase 7 (Tasks 14-15).

- [ ] **Check 1: Xác định trách nhiệm hiện tại**

```bash
grep -n "^  async \|^  private async " server/src/training/training.service.ts
```

Phân loại: Session CRUD + state transitions | Overlap checking | Attendance CRUD + dedup
| Device check-in QR | Progress recording | Role resolution helpers | Serialization helpers.

- [ ] **Check 2: Liệt kê toàn bộ API endpoint**

```bash
grep -n "@Get\|@Post\|@Put\|@Patch\|@Delete" server/src/training/training.controller.ts
grep -n "@HttpCode\|@UseGuards\|@Roles\|@RequirePermission\|@Public" server/src/training/training.controller.ts
```

Lưu ý đặc biệt: endpoint nào cần `DeviceApiKeyGuard` (device check-in) — phải còn hoạt động sau refactor.

- [ ] **Check 3: Kiểm tra frontend**

```bash
grep -rn "training\|session\|attendance" client/src/services/ | grep -i "api\|axios\|fetch"
```

- [ ] **Check 4: Kiểm tra dependency**

```bash
cat server/src/training/training.module.ts
grep -A 20 "constructor(" server/src/training/training.service.ts | head -25
```

- [ ] **Check 5: Kiểm tra circular dependency**

```bash
grep -rn "TrainingModule" server/src/ --include="*.module.ts"
```

- [ ] **Check 6: Kiểm tra Prisma models và transactions**

```bash
grep -oP "this\.prisma\.\K\w+" server/src/training/training.service.ts | sort -u
grep -n "\$transaction" server/src/training/training.service.ts
```

Chú ý: `createSession` hoặc state transition methods có thể update nhiều model trong transaction.
Nếu attendance và session cùng một transaction → giữ cả hai method trong `TrainingService`,
chỉ tách các method read/list độc lập.

- [ ] **Check 7: Kiểm tra exception/error handling**

```bash
grep -n "throw new\|} catch\|try {" server/src/training/training.service.ts
```

Đặc biệt kiểm tra: exception nào được throw từ attendance methods (overlap, duplicate check-in, v.v.).

---

#### Thực hiện Task 14

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Aa]ttendance\|AttendanceLog\|dedup" server/src/training/training.service.ts
```

- [ ] **Bước 2: Tạo AttendanceService**

```typescript
// server/src/training/attendance.service.ts
import { Injectable } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  // paste attendance methods + deduplication logic
}
```

- [ ] **Bước 3-6:** Đăng ký module, delegate từ TrainingService, build, lint, commit.

```bash
git commit -m "refactor(training): extract AttendanceService"
```

---

### Task 15: Extract DeviceAccessService

**Files:**
- Create: `server/src/training/device-access.service.ts`
- Modify: `server/src/training/training.service.ts`
- Modify: `server/src/training/training.module.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`
- Produces: device check-in via QR/API key, `DeviceAccessEvent` handling

> Pre-Refactor Checklist đã chạy ở Task 14. Re-verify:
> Check 2: endpoint device check-in dùng `DeviceApiKeyGuard` — guard phải vẫn apply đúng sau refactor.
> Check 6: device access methods có dùng chung transaction với attendance không?
> Check 7: exception của device check-in (invalid key, session not found, v.v.) không đổi.

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Dd]evice\|DeviceAccess\|checkIn" server/src/training/training.service.ts
```

- [ ] **Bước 2: Tạo DeviceAccessService**

```typescript
// server/src/training/device-access.service.ts
import { Injectable } from '@nestjs/common'
import { AuditService } from '../common/audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DeviceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  // paste device access methods
}
```

- [ ] **Bước 3-6:** Đăng ký, delegate, build, lint, commit.

```bash
git commit -m "refactor(training): extract DeviceAccessService"
```

---

## Phase 8 — OCP: Strategy Pattern cho Caller Query Filter

Loại bỏ role-branching lặp lại trong TrainingService.

---

### Task 16: ICallerQueryFilter strategy

**Files:**
- Create: `server/src/training/filters/caller-query-filter.ts`
- Modify: `server/src/training/training.service.ts`

**Interfaces:**
- Produces:
```typescript
interface ICallerQueryFilter {
  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void
}
```

> Trước khi thực hiện, re-verify:
> Check 2 (Task 14): xác nhận lại tất cả endpoint training và role của từng endpoint.
> Check 7 (Task 14): xác nhận role-branching không throw exception nào cần giữ lại.

- [ ] **Bước 1: Tạo file strategy**

`server/src/training/filters/caller-query-filter.ts`:

```typescript
import type { Prisma } from '@prisma/client'

type Caller = {
  userId: bigint
  roles: string[]
  staffId?: bigint
  memberId?: bigint
}

export interface ICallerQueryFilter {
  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void
}

export class MemberCallerQueryFilter implements ICallerQueryFilter {
  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void {
    if (caller.memberId) {
      where.memberId = caller.memberId
    }
  }
}

export class TrainerCallerQueryFilter implements ICallerQueryFilter {
  constructor(private readonly requestedMemberId?: bigint) {}

  apply(where: Prisma.TrainingSessionWhereInput, caller: Caller): void {
    if (caller.staffId) {
      where.trainerStaffId = caller.staffId
    }
    if (this.requestedMemberId) {
      where.memberId = this.requestedMemberId
    }
  }
}

export class AdminCallerQueryFilter implements ICallerQueryFilter {
  constructor(
    private readonly requestedMemberId?: bigint,
    private readonly requestedStaffId?: bigint,
  ) {}

  apply(where: Prisma.TrainingSessionWhereInput, _caller: Caller): void {
    if (this.requestedMemberId) where.memberId = this.requestedMemberId
    if (this.requestedStaffId) where.trainerStaffId = this.requestedStaffId
  }
}

export function resolveCallerFilter(
  caller: Caller,
  memberId?: string,
  trainerStaffId?: string,
): ICallerQueryFilter {
  const memberIdBig = memberId ? BigInt(memberId) : undefined
  const staffIdBig = trainerStaffId ? BigInt(trainerStaffId) : undefined

  const isMemberOnly =
    caller.roles.includes('member') &&
    !caller.roles.some((r) => ['owner', 'staff', 'trainer'].includes(r))
  const isTrainerOnly =
    caller.roles.includes('trainer') &&
    !caller.roles.some((r) => ['owner', 'staff'].includes(r))

  if (isMemberOnly) return new MemberCallerQueryFilter()
  if (isTrainerOnly) return new TrainerCallerQueryFilter(memberIdBig)
  return new AdminCallerQueryFilter(memberIdBig, staffIdBig)
}
```

- [ ] **Bước 2: Xác định tất cả block role-branching cần thay**

```bash
grep -n "isMemberOnly\|isTrainerOnly\|resolveCallerMemberId\|resolveCallerStaffId" \
  server/src/training/training.service.ts
```

Đếm số lần xuất hiện — mỗi lần sẽ được thay bằng 2 dòng:

```typescript
const filter = resolveCallerFilter(caller, memberId, trainerStaffId)
filter.apply(where, caller)
```

- [ ] **Bước 3: Thay thế từng block**

Với mỗi block role-branching:

```typescript
// TRƯỚC:
if (this.isMemberOnly(caller)) {
  where.memberId = selfMemberId
} else if (this.isTrainerOnly(caller)) {
  // ...
} else {
  // ...
}

// SAU:
const filter = resolveCallerFilter(caller, memberId, trainerStaffId)
filter.apply(where, caller)
```

Sau khi thay tất cả, nếu `isMemberOnly`/`isTrainerOnly` không còn dùng ở đâu khác → xóa method đó.

- [ ] **Bước 4: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 5: Smoke test**

```bash
# Member chỉ thấy session của mình:
curl -s "http://localhost:3000/api/v1/training/sessions" \
  -H "Authorization: Bearer <member-token>" | jq '.data | length'

# Trainer chỉ thấy session của mình:
curl -s "http://localhost:3000/api/v1/training/sessions" \
  -H "Authorization: Bearer <trainer-token>" | jq '.data | length'

# Owner thấy tất cả:
curl -s "http://localhost:3000/api/v1/training/sessions" \
  -H "Authorization: Bearer <owner-token>" | jq '.data | length'
```

- [ ] **Bước 6: Commit**

```bash
git add server/src/training/filters/ server/src/training/training.service.ts
git commit -m "refactor(training): strategy pattern for caller query filter — remove role branching duplication"
```

---

## Phase 9 — ISP/DIP: Cache Abstraction cho PermissionsGuard

---

### Task 17: IPermissionCacheProvider abstraction

**Files:**
- Create: `server/src/common/interfaces/permission-cache.interface.ts`
- Create: `server/src/common/cache/in-memory-permission-cache.service.ts`
- Modify: `server/src/common/guards/permissions.guard.ts`
- Modify: `server/src/common/common.module.ts` (hoặc module quản lý guard)

**Interfaces:**
- Produces:
```typescript
interface IPermissionCacheProvider {
  get(userId: string): Promise<Set<string> | null>
  set(userId: string, codes: Set<string>, ttlMs: number): Promise<void>
  delete(userId: string): Promise<void>
}
```

- [ ] **Bước 1: Tạo interface**

`server/src/common/interfaces/permission-cache.interface.ts`:

```typescript
export const PERMISSION_CACHE_PROVIDER = Symbol('PERMISSION_CACHE_PROVIDER')

export interface IPermissionCacheProvider {
  get(userId: string): Promise<Set<string> | null>
  set(userId: string, codes: Set<string>, ttlMs: number): Promise<void>
  delete(userId: string): Promise<void>
}
```

- [ ] **Bước 2: Tạo in-memory implementation**

`server/src/common/cache/in-memory-permission-cache.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import type { IPermissionCacheProvider } from '../interfaces/permission-cache.interface'

@Injectable()
export class InMemoryPermissionCacheService implements IPermissionCacheProvider {
  private readonly store = new Map<string, { codes: Set<string>; exp: number }>()
  private readonly pendingQueries = new Map<string, Promise<Set<string>>>()

  async get(userId: string): Promise<Set<string> | null> {
    const entry = this.store.get(userId)
    if (!entry || Date.now() > entry.exp) {
      this.store.delete(userId)
      return null
    }
    return entry.codes
  }

  async set(userId: string, codes: Set<string>, ttlMs: number): Promise<void> {
    this.store.set(userId, { codes, exp: Date.now() + ttlMs })
  }

  async delete(userId: string): Promise<void> {
    this.store.delete(userId)
  }

  getPending(userId: string): Promise<Set<string>> | undefined {
    return this.pendingQueries.get(userId)
  }

  setPending(userId: string, promise: Promise<Set<string>>): void {
    this.pendingQueries.set(userId, promise)
    void promise.finally(() => this.pendingQueries.delete(userId))
  }
}
```

- [ ] **Bước 3: Cập nhật PermissionsGuard để inject**

```typescript
import {
  PERMISSION_CACHE_PROVIDER,
  IPermissionCacheProvider,
} from '../interfaces/permission-cache.interface'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PERMISSION_CACHE_PROVIDER) private readonly cache: IPermissionCacheProvider,
  ) {}

  // Thay tất cả permCache.get/set/delete bằng await this.cache.get/set/delete
}
```

- [ ] **Bước 4: Tìm module đăng ký guard và thêm provider**

```bash
grep -rn "PermissionsGuard" server/src/ --include="*.module.ts"
```

Trong module tìm được:

```typescript
import { PERMISSION_CACHE_PROVIDER } from './interfaces/permission-cache.interface'
import { InMemoryPermissionCacheService } from './cache/in-memory-permission-cache.service'

providers: [
  {
    provide: PERMISSION_CACHE_PROVIDER,
    useClass: InMemoryPermissionCacheService,
  },
  PermissionsGuard,
  // ...existing
]
```

- [ ] **Bước 5: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 6: Smoke test**

Gọi một endpoint có `@RequirePermission(...)`. Kiểm tra response không đổi.

- [ ] **Bước 7: Commit**

```bash
git add server/src/common/interfaces/ \
        server/src/common/cache/ \
        server/src/common/guards/permissions.guard.ts \
        server/src/common/common.module.ts
git commit -m "refactor(common): abstract permission cache behind IPermissionCacheProvider"
```

---

## Checklist cuối

Sau khi hoàn thành tất cả task:

- [ ] `cd server && npm run build` — pass
- [ ] `cd server && npm run lint` — pass
- [ ] Start server: `npm run dev` — không có startup error
- [ ] Đăng nhập owner, staff, trainer, member — tất cả trả token hợp lệ
- [ ] CRUD một resource cho mỗi module bị tách (facility, staff, members, training) — hoạt động
- [ ] `GET /health` trả 200
- [ ] Không có file `*.ts` có >600 dòng (trừ file migration Prisma)

---

## Phụ lục: Thứ tự tham chiếu

| Task | Phase | Mức độ khó | Thời gian ước tính |
|---|---|---|---|
| 2 | LSP | Thấp | 15 phút |
| 3 | OCP/DIP | Thấp | 15 phút |
| 4 | OCP | Thấp | 10 phút |
| 5 | SRP/Auth | Trung bình | 30 phút (bao gồm checklist) |
| 6 | SRP/Auth | Trung bình | 15 phút |
| 7 | SRP/Auth | Trung bình | 15 phút |
| 8 | SRP/Facility | Trung bình | 30 phút (bao gồm checklist) |
| 9 | SRP/Facility | Trung bình | 15 phút |
| 10 | SRP/Staff | Trung bình | 30 phút (bao gồm checklist) |
| 11 | SRP/Staff | Trung bình | 15 phút |
| 12 | SRP/Members | Trung bình | 30 phút (bao gồm checklist) |
| 13 | SRP/Members | Trung bình | 15 phút |
| 14 | SRP/Training | Cao | 40 phút (bao gồm checklist) |
| 15 | SRP/Training | Cao | 25 phút |
| 16 | OCP/Strategy | Cao | 30 phút |
| 17 | ISP/DIP | Cao | 30 phút |
