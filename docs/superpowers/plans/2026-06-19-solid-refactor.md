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

## Phase 1 — LSP Quick Fixes

Sửa logic sai không cần tái cấu trúc. Ưu tiên cao nhất vì đây là bug thực.

---

### Task 1: Fix LINE login multi-role check

**Files:**
- Modify: `server/src/auth/auth.service.ts` (tìm block LINE login, ~line 440-450)

**Interfaces:**
- Consumes: không có dependency mới
- Produces: `authService.lineLogin()` hoạt động đúng với user có nhiều role

**Skills:** `security-review` trước bước commit.

- [ ] **Bước 1: Đọc đoạn code hiện tại**

```bash
cd server
grep -n "LINE_LOGIN_MEMBER_ONLY\|roles.every\|roles.length" src/auth/auth.service.ts
```

Expected: tìm thấy block tương tự:
```typescript
if (user.roles.length === 0 || !user.roles.every((r) => r === 'member')) {
```

- [ ] **Bước 2: Sửa điều kiện**

Thay dòng đó bằng:
```typescript
if (!user.roles.includes('member')) {
```

Lý do: `every(r => r === 'member')` trả `false` khi user có `['member', 'trainer']` — từ chối user hợp lệ. `includes('member')` đúng semantic: LINE login chỉ cần user là member, không cần CHỈ là member.

- [ ] **Bước 3: Build và lint**

```bash
cd server
npm run build
npm run lint
```

Expected: cả hai pass, không có error.

- [ ] **Bước 4: Smoke test**

Start server, gọi `POST /api/v1/auth/line-login` với token hợp lệ của user `['member', 'trainer']`. Trước fix: 403. Sau fix: 200.

- [ ] **Bước 5: Commit**

```bash
git add server/src/auth/auth.service.ts
git commit -m "fix: LINE login accepts member with multiple roles"
```

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

Trong `members.service.ts`, tìm `subStatus` và đổi type annotation thành `SubscriptionStatusFilter | undefined` (nếu có explicit type). Enum value string không đổi nên logic `if (subStatus === 'active')` vẫn hoạt động.

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

`HttpExceptionFilter` đã xử lý Prisma errors toàn cục. Một số service catch `P2002`/`P2025` trùng, tạo inconsistent behavior.

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

Lý do: `HttpExceptionFilter` đã map `P2002 → 409`, `P2025 → 404` với cùng shape `{ success, code, message }`. Duplicate catch tạo risk message không nhất quán.

**Chú ý:** Chỉ xóa catch block nếu nó CHỈ handle P2002/P2025. Nếu catch block còn xử lý logic khác, giữ nguyên logic đó và chỉ xóa Prisma-error branches.

- [ ] **Bước 3: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 4: Smoke test**

Thử tạo resource bị duplicate (ví dụ: POST member với email đã tồn tại). Phải vẫn trả 409. Thử update resource không tồn tại — phải vẫn trả 404.

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

Sửa class để `permCache` và `pendingQueries` là private property, và TTL lấy từ config:

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

- [ ] **Bước 1: Xác định methods cần chuyển**

```bash
cd server
grep -n "async forgotPassword\|async resetPassword" src/auth/auth.service.ts
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

Mở `server/src/auth/auth.module.ts`, thêm vào `providers` array:

```typescript
import { PasswordResetService } from './password-reset.service'

@Module({
  providers: [
    UsersService,
    AuthService,
    PasswordResetService,  // THÊM
    // ...existing providers
  ],
  exports: [AuthService, PasswordResetService],  // export nếu cần
})
```

- [ ] **Bước 4: Cập nhật AuthService — inject và delegate**

Trong `auth.service.ts`:

1. Thêm `PasswordResetService` vào constructor.
2. Thay body `forgotPassword` và `resetPassword` bằng delegate 1 dòng.
3. Xóa các import không còn dùng (nếu `OtpStoreService` chỉ dùng trong 2 method đó).

```typescript
// Trong constructor:
private readonly passwordReset: PasswordResetService,

// Thay toàn bộ body:
async forgotPassword(dto: ForgotPasswordDto, ip?: string): Promise<void> {
  return this.passwordReset.forgotPassword(dto, ip)
}

async resetPassword(dto: ResetPasswordDto, ip?: string): Promise<void> {
  return this.passwordReset.resetPassword(dto, ip)
}
```

- [ ] **Bước 5: Build và lint**

```bash
cd server && npm run build && npm run lint
```

Expected: pass. Nếu TypeScript báo import không tìm thấy, kiểm tra đường dẫn import trong file mới.

- [ ] **Bước 6: Smoke test**

```bash
# Gọi forgot-password:
curl -s -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.local"}' | jq .
```

Expected: 200 (hoặc response như trước).

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

Smoke test: `POST /api/v1/auth/verify-email` (nếu có endpoint này).

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

Sau Task 5-7, `auth.service.ts` chỉ còn: login, logout, changePassword + 3 delegate method.
Xóa các import không còn dùng (OtpStoreService nếu không còn dùng trực tiếp).

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

- [ ] **Bước 1: Xác định methods cần chuyển**

```bash
grep -n "async.*[Ee]quipment\|async.*equipment" server/src/facility/facility.service.ts
```

Liệt kê tất cả method liên quan đến equipment (createEquipment, listEquipment, getEquipment, updateEquipment, deleteEquipment, v.v.).

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
  // (createEquipment, listEquipment, getEquipment, updateEquipment, deleteEquipment)
}
```

- [ ] **Bước 3: Đăng ký trong facility.module.ts**

```typescript
import { EquipmentService } from './equipment.service'

@Module({
  providers: [FacilityService, EquipmentService],  // THÊM
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

// Thay toàn bộ body mỗi equipment method:
async createEquipment(dto, caller) {
  return this.equipment.createEquipment(dto, caller)
}
// ... tương tự cho các method khác
```

- [ ] **Bước 5: Build, lint, smoke test**

```bash
cd server && npm run build && npm run lint
```

Smoke test: `GET /api/v1/facility/equipment` — phải trả danh sách như cũ.

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

- [ ] **Bước 1: Xác định methods**

```bash
grep -n "async.*[Mm]aintenance\|MaintenanceLog" server/src/facility/facility.service.ts
```

- [ ] **Bước 2: Tạo file** (cùng pattern Task 8)

`server/src/facility/maintenance.service.ts` — paste các maintenance methods từ facility.service.ts.

- [ ] **Bước 3-6:** Giống Task 8 (đăng ký module, delegate, build, commit).

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

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Ss]chedule" server/src/staff/staff.service.ts
```

- [ ] **Bước 2: Tạo StaffScheduleService**

```typescript
// server/src/staff/staff-schedule.service.ts
@Injectable()
export class StaffScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}
  // paste schedule methods
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

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Aa]ttendance\|checkIn\|checkOut" server/src/staff/staff.service.ts
```

- [ ] **Bước 2-6:** Cùng pattern Task 10.

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

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Tt]rainer\|assignTrainer\|availableTrainer" server/src/members/members.service.ts
```

- [ ] **Bước 2: Tạo TrainerAssignmentService**

```typescript
// server/src/members/trainer-assignment.service.ts
@Injectable()
export class TrainerAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async assignTrainer(...): Promise<...> { }
  async selfAssignTrainer(...): Promise<...> { }
  async getAvailableTrainers(...): Promise<...> { }
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
- Produces: `recordSelfProgress()` và bất kỳ progress-related method nào khác

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Pp]rogress\|recordSelf" server/src/members/members.service.ts
```

- [ ] **Bước 2-6:** Cùng pattern Task 12.

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

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Aa]ttendance\|AttendanceLog\|dedup" server/src/training/training.service.ts
```

- [ ] **Bước 2: Tạo AttendanceService**

```typescript
// server/src/training/attendance.service.ts
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

- [ ] **Bước 1: Tìm methods**

```bash
grep -n "async.*[Dd]evice\|DeviceAccess\|qr\|checkIn" server/src/training/training.service.ts
```

- [ ] **Bước 2: Tạo DeviceAccessService**

```typescript
// server/src/training/device-access.service.ts
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

  const isMemberOnly = caller.roles.includes('member') && !caller.roles.some(r => ['owner', 'staff', 'trainer'].includes(r))
  const isTrainerOnly = caller.roles.includes('trainer') && !caller.roles.some(r => ['owner', 'staff'].includes(r))

  if (isMemberOnly) return new MemberCallerQueryFilter()
  if (isTrainerOnly) return new TrainerCallerQueryFilter(memberIdBig)
  return new AdminCallerQueryFilter(memberIdBig, staffIdBig)
}
```

- [ ] **Bước 2: Cập nhật TrainingService**

Tìm tất cả block role-branching trong training.service.ts:

```bash
grep -n "isMemberOnly\|isTrainerOnly\|resolveCallerMemberId\|resolveCallerStaffId" \
  server/src/training/training.service.ts
```

Với mỗi block, thay bằng:

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

- [ ] **Bước 3: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 4: Smoke test**

```bash
# Member chỉ thấy session của mình:
curl -s "http://localhost:3000/api/v1/training/sessions" \
  -H "Authorization: Bearer <member-token>" | jq '.data | length'

# Owner thấy tất cả:
curl -s "http://localhost:3000/api/v1/training/sessions" \
  -H "Authorization: Bearer <owner-token>" | jq '.data | length'
```

- [ ] **Bước 5: Commit**

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
import { ConfigService } from '@nestjs/config'
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

  // Single-flight helper (optional — keep trong implementation, bỏ khỏi interface)
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
import { PERMISSION_CACHE_PROVIDER, IPermissionCacheProvider } from '../interfaces/permission-cache.interface'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PERMISSION_CACHE_PROVIDER) private readonly cache: IPermissionCacheProvider,
  ) {}

  // Thay permCache.get/set bằng await this.cache.get/set
}
```

- [ ] **Bước 4: Đăng ký provider trong module**

Tìm module nào provide `PermissionsGuard` (thường là `CommonModule` hoặc `AppModule`):

```bash
grep -rn "PermissionsGuard" server/src/ --include="*.module.ts"
```

Trong module đó, thêm:

```typescript
import { PERMISSION_CACHE_PROVIDER } from './interfaces/permission-cache.interface'
import { InMemoryPermissionCacheService } from './cache/in-memory-permission-cache.service'

providers: [
  {
    provide: PERMISSION_CACHE_PROVIDER,
    useClass: InMemoryPermissionCacheService,
  },
  PermissionsGuard,
  // ...
]
```

- [ ] **Bước 5: Build và lint**

```bash
cd server && npm run build && npm run lint
```

- [ ] **Bước 6: Smoke test**

Gọi endpoint cần permission (`@RequirePermission`). Kiểm tra response không đổi.

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
| 1 | LSP | Thấp | 10 phút |
| 2 | LSP | Thấp | 15 phút |
| 3 | OCP/DIP | Thấp | 15 phút |
| 4 | OCP | Thấp | 10 phút |
| 5 | SRP/Auth | Trung bình | 20 phút |
| 6 | SRP/Auth | Trung bình | 15 phút |
| 7 | SRP/Auth | Trung bình | 15 phút |
| 8 | SRP/Facility | Trung bình | 20 phút |
| 9 | SRP/Facility | Trung bình | 15 phút |
| 10 | SRP/Staff | Trung bình | 20 phút |
| 11 | SRP/Staff | Trung bình | 15 phút |
| 12 | SRP/Members | Trung bình | 20 phút |
| 13 | SRP/Members | Trung bình | 15 phút |
| 14 | SRP/Training | Cao | 30 phút |
| 15 | SRP/Training | Cao | 25 phút |
| 16 | OCP/Strategy | Cao | 30 phút |
| 17 | ISP/DIP | Cao | 30 phút |
