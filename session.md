# Session — Test Suite Completion

**Cập nhật lần cuối:** 2026-06-14

---

## Mục tiêu

Hoàn thành toàn bộ test suite cho server (NestJS) theo kế hoạch 10 phases trong `plan.md`.  
Target cuối: ~660 tests, ~48 spec files, coverage services ≥80% / controllers ≥70% / branches ≥75%.

---

## Vấn đề đã xử lý khi bắt đầu session

1. **Jest chưa được cài** — `node_modules` thiếu devDependencies (jest, ts-jest). Fix: chạy `npm install` trong `server/`.
2. **Prisma client lỗi thời** — generated client thiếu field `trainerId` (Subscription) và `height` (MemberProgress) dù `schema.prisma` đã có. Fix: chạy `prisma generate`. Sau đó 6 suites failing → pass hết.
3. **Trạng thái thực tế trước session:** 23/29 suites pass, 408 tests — do 6 suites bị TS errors từ stale Prisma client.

---

## Tiến độ hiện tại

### Kết quả test

```
Test Suites: 43 passed, 43 total
Tests:       674 passed, 674 total
```

### Phases đã hoàn thành

| Phase | Files | Tests | Trạng thái |
|-------|-------|-------|------------|
| 1 — Auth coverage | +0 | 12 | ✓ |
| 2 — DTO validation | +2 | 30 | ✓ |
| 3 — Services lõi | +5 | 105 | ✓ |
| 4 — Controllers chính | +7 | 79 | ✓ |
| 5 — Services phụ trợ | +5 | 106 | ✓ |
| 6 — Workout Services | +3 | ~50 | ✓ (verified session này) |
| 7 — Controllers còn lại | +10 | ~84 | ✓ (verified session này) |
| 8 — External failures | +0 (added to existing) | +8 | ✓ (verified session này) |
| 9 — E2E Integration | +1 | 13 | ✓ (verified session này) |

**Phase 6** — 3 workout service spec files (exercises, workout-plans, workout-logs).

**Phase 7** — 10 controller spec files đã viết và pass:
- `rbac/groups.controller.spec.ts` — 10 tests
- `rbac/permissions.controller.spec.ts` — 4 tests
- `rbac/users-admin.controller.spec.ts` — 9 tests (self-bypass, permission check)
- `facility/facility.controller.spec.ts` — 9 tests
- `feedback/feedback.controller.spec.ts` — 7 tests
- `payment-accounts/payment-accounts.controller.spec.ts` — 5 tests (assertAccess)
- `workout/exercises/exercises.controller.spec.ts` — 5 tests
- `workout/workout-plans/workout-plans.controller.spec.ts` — 9 tests
- `workout/workout-logs/workout-logs.controller.spec.ts` — 4 tests
- `health/health.controller.spec.ts` — 3 tests (ok/degraded/timestamp)

**Phase 8** — External dependency failures thêm vào spec hiện có:
- `auth.service.spec.ts` — bcrypt.hash throw, bcrypt.compare throw, prisma.findUnique throw
- `packages.service.spec.ts` — non-P2002 error rethrow từ prisma.package.create
- `subscriptions.service.spec.ts` — $transaction throw mid-flight

**Phase 9** — `auth/auth.e2e.spec.ts` (13 tests):
- POST /login: 200 valid creds, 401 wrong pass, 401 not found, 400 validation
- GET /me: 401 no token, 401 fake token, 200 valid token, 401 expired
- POST /forgot-password: 200 always (anti-enum), 200 valid email, 400 missing
- Protected guards: 401 no token, 200 valid token

---

## Coverage hiện tại (Phase 10 — đã verify)

### Services ≥ 80% (target đạt)

| Service | Stmt | Branch |
|---------|------|--------|
| auth.service.ts | 93.7% | 85.9% ✓ |
| packages.service.ts | 95.8% | 77.3% |
| reports.service.ts | 97.8% | 90.3% ✓ |
| staff.service.ts | 96.4% | 82% ✓ |
| subscriptions.service.ts | 89.2% | 75.6% |
| feedback.service.ts | 87.5% | 75.2% |
| payments.service.ts | 83.5% | 73.8% |
| workout-logs.service.ts | 98.2% | 80.6% ✓ |
| users.service.ts | 100% | 100% ✓ |
| payment-accounts.service.ts | 100% | 100% ✓ |
| rate-limit.service.ts | 100% | 100% ✓ |
| otp-store.service.ts | 100% | 100% ✓ |

### Services < 80% (cần cải thiện)

| Service | Stmt | Lý do |
|---------|------|-------|
| facility.service.ts | 66.7% | Nhiều path DB branches chưa test (equipment soft/hard delete, maintenance state machine edge) |
| members.service.ts | 67.5% | Counter registration transaction, self-register edge cases, pagination |
| rbac.service.ts | 57.0% | Nhiều CRUD methods chưa có test (listUsers, updateUser, deleteUser logic) |
| exercises.service.ts | 57.7% | ExerciseDB API integration paths chưa test |
| workout-plans.service.ts | 59.5% | Plan CRUD complex methods (addDay, addExercise, assign, lock logic) |
| training.service.ts | 39.4% | Service rất lớn (~991 lines), chỉ test basic paths |

---

## Công việc cần làm tiếp

### Ưu tiên: Nâng coverage các service < 80%

1. **`rbac.service.spec.ts`** — Thêm tests cho: `listUsers` (filter/pagination), `updateUser` (self vs admin, soft-delete guard), `deleteUser`, `getUserGroups`, CRUD groups với edge cases, permission assignment errors. Estimate: +20 tests.

2. **`members.service.spec.ts`** — Thêm tests cho: counter-registration với transaction success path, `updateMember` (trainer assignment, status change), `deleteMember`, pagination meta. Estimate: +15 tests.

3. **`facility.service.spec.ts`** — Thêm tests cho: `deleteEquipment` force vs non-force, `createEquipment` với `roomId` null vs specified, maintenance log transitions. Estimate: +10 tests.

4. **`exercises.service.spec.ts`** — Thêm tests cho: `findFromExerciseDb` khi API key set vs không set, `importFromExerciseDb` success/fail paths. Estimate: +8 tests.

5. **`workout-plans.service.spec.ts`** — Thêm tests cho: `addDay`, `deleteDay`, `addExercise`, `removePlanExercise`, `assignPlan`, write-block assertion. Estimate: +12 tests.

6. **`training.service.spec.ts`** — Service lớn nhất (~991 lines). Cần test các method chưa cover: `cancelSession`, `checkInAttendance`, `createProgress`, `listProgress`. Estimate: +15 tests.

### Sau khi coverage đạt target

7. **Cập nhật plan.md** với số thực tế khi toàn bộ phases xong.

---

## Context kỹ thuật quan trọng

- **Jest binary:** `.\node_modules\.bin\jest.cmd` (không dùng `npm test`)
- **Prisma generate:** `.\node_modules\.bin\dotenv.cmd -e .env -- .\node_modules\.bin\prisma.cmd generate`
- **supertest import:** Dùng `const request = require('supertest') as ...` (không dùng `import * as request`)
- **Pattern mock service trong controller spec:**
  ```ts
  const mockService = { methodA: jest.fn(), methodB: jest.fn() }
  const controller = new MyController(mockService as any)
  ```
- **Pattern BigInt:** các ID trong Prisma là `BigInt` — `ParseIntPipe` parse xong cần `BigInt(id)` trong controller.
- **Response format:** tất cả controller trả `{ success: true, ...result }`.
- **E2E module setup:** Cần mock ConfigService với `get` + `getOrThrow`, JwtModule.register với secret cứng, và mock PrismaService + UsersService ở provider level.
