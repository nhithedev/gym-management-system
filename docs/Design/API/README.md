# API Specification

| Field | Value |
|---|---|
| Document ID | GMS-API-README-001 |
| Version | 1.0.3 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD |
| Last Updated | 2026-05-29 |
| Related docs | [`Architecture.md`](../Architecture.md), [`Database.md`](../Database.md), [`SRS_VI.md`](../../VI/SRS_VI.md) |

---

## 1. Mục đích

Đặc tả contract REST API cho hệ thống Gym Management v1.0. Spec là design contract giữa backend + frontend + QA — build dựa theo, không tự nới scope.

Format kép:

- **Markdown per module** — human reference, business logic + side effects + audit + cron interaction (chính).
- **OpenAPI 3.0 YAML** — machine-readable contract cho codegen + mock server + linter (`openapi.yaml`).

## 2. Audience

Backend developer (NestJS impl), frontend developer (React fetch contract), QA (test case design), security reviewer (auth + RBAC + audit scope).

## 3. Module Status

10 module v1.0. Phase 17 (2026-05-24) detail thêm Module 5/7/8/9 — tổng cộng 10/10 module Detailed.

| Module | UC mapping | Endpoint count | Status | File |
|---|---|---|---|---|
| 1 Auth | UC00, UC01, UC02, UC13 | 9 | Detailed | [`Module-1-Auth.md`](./Module-1-Auth.md) |
| 2 RBAC + User Admin | UC10 (user/role); cross-cutting | 16 | Detailed | [`Module-2-RBAC.md`](./Module-2-RBAC.md) |
| 3 Package | UC03A, UC04A, UC10 | 6 | Detailed | [`Module-3-Package.md`](./Module-3-Package.md) |
| 4 Member/Subscription/Payment | UC03A/B, UC04A/B, UC06C, UC11 (partial) | 24 | Detailed | [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md) |
| 5 Staff | UC11 (staff subset) | 14 | Detailed | [`Module-5-Staff.md`](./Module-5-Staff.md) |
| 6 Facility | UC08, UC09 | 14 | Detailed | [`Module-6-Facility.md`](./Module-6-Facility.md) |
| 7 Training | UC05B, UC05C, UC06C (progress write) | 13 | Detailed | [`Module-7-Training.md`](./Module-7-Training.md) |
| 8 Feedback | UC07 | 6 | Detailed | [`Module-8-Feedback.md`](./Module-8-Feedback.md) |
| 9 Report | UC12 | 7 | Detailed | [`Module-9-Report.md`](./Module-9-Report.md) |
| 10 Workout Plan | UC05A, UC06A, UC06B | 25 | Detailed | [`Module-10-Workout.md`](./Module-10-Workout.md) |

**Total endpoints v1.0:** 134 (Module 1+2+3+4+5+6+7+8+9+10 = 134 endpoints).

## 4. Navigation

- [`conventions.md`](./conventions.md) — Quy ước chung cho mọi module (auth, pagination, error, audit, rate limit, RBAC notation, DTO naming, business rule format).
- [`Module-1-Auth.md`](./Module-1-Auth.md) — Auth endpoints chi tiết.
- [`Module-2-RBAC.md`](./Module-2-RBAC.md) — Permission catalog + Group/User-Group/User admin.
- [`Module-3-Package.md`](./Module-3-Package.md) — Package CRUD + status toggle.
- [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md) — Member + Subscription + Payment endpoints.
- [`Module-5-Staff.md`](./Module-5-Staff.md) — Staff CRUD + StaffSchedule bulk management.
- [`Module-6-Facility.md`](./Module-6-Facility.md) — Room + Equipment + Maintenance log endpoints.
- [`Module-7-Training.md`](./Module-7-Training.md) — TrainingSession CRUD + AttendanceLog (manual check-in) + MemberProgress endpoints.
- [`Module-8-Feedback.md`](./Module-8-Feedback.md) — Feedback submit + staff handle workflow (open → in_progress → resolved/rejected).
- [`Module-9-Report.md`](./Module-9-Report.md) — Aggregation báo cáo (revenue, members, renewals, staff-performance).
- [`Module-10-Workout.md`](./Module-10-Workout.md) — Exercise library + Workout plan (CRUD, days, exercises, assign) + Workout log endpoints.
- [`openapi.yaml`](./openapi.yaml) — OpenAPI 3.0 contract cho Module 1+2+3+4+6.

## 5. Traceability Matrix

UC → Module → Endpoint. Mandate `docs/CLAUDE.md §1.1`.

| UC ID | UC Name | Module | Endpoint(s) |
|---|---|---|---|
| UC00 | Đăng nhập | 1 Auth | `POST /auth/login`, `GET /auth/me` |
| UC01 | Đăng xuất | 1 Auth | `POST /auth/logout` |
| UC02 | Quên mật khẩu | 1 Auth | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| UC03A | Đăng ký tại quầy | 4 Member | `POST /members`, `POST /subscriptions`, `POST /payments` |
| UC03B | Đăng ký online | 4 Member | `POST /members/self-register`, `POST /payments` (sau verify) |
| UC04A | Gia hạn gói | 4 Member | `POST /subscriptions` (renewal flow), `POST /payments` |
| UC04B | Hủy gói | 4 Member | `PATCH /subscriptions/:id/cancel` |
| UC05A | PT lập kế hoạch + giao workout plan | 10 Workout Plan | `POST /workout-plans`, `POST /workout-plans/:id/days`, `POST /workout-plans/:id/days/:dayId/exercises`, `PATCH /workout-plans/:id`, `POST /workout-plans/members/:memberId/assign` |
| UC05B | Lập lịch tập | 7 Training | `GET/POST /training-sessions`, `GET/PATCH/DELETE /training-sessions/:id` |
| UC05C | Real-time check-in | 7 Training | `POST /attendance-logs` (manual/qr fallback) — realtime device flow: Architecture §3.3 |
| UC06A | Member ghi workout log | 10 Workout Plan | `POST /workout-logs`, `GET /workout-logs`, `PATCH /workout-logs/:id` |
| UC06B | Member tự tạo workout plan | 10 Workout Plan | `POST /workout-plans` (creatorType=member) |
| UC06C | Theo dõi tiến độ (chỉ số cơ thể) | 4 Member (read), 7 Training (write) | `GET /members/:id/progress`, `POST /members/:id/progress` |
| UC07 | Gửi phản hồi | 8 Feedback | `GET /feedback`, `POST /feedback`, `GET /feedback/:id`, `PATCH /feedback/:id`, `DELETE /feedback/:id` |
| UC08 | Quản lý phòng tập | 6 Facility | `GET/POST/PATCH/DELETE /rooms` |
| UC09 | Quản lý thiết bị | 6 Facility | `GET/POST/PATCH/DELETE /equipment`, `GET/POST /equipment/:id/maintenance-logs`, `PATCH /maintenance-logs/:id` |
| UC10 (user/role) | Quản lý user + RBAC | 2 RBAC | `GET/POST/PATCH/DELETE /groups`, `GET/POST/DELETE /groups/:id/permissions`, `GET/POST/PATCH/DELETE /users`, `GET/POST/DELETE /users/:id/groups`, `GET /permissions` |
| UC10 (package) | Quản lý gói tập | 3 Package | `GET/POST/PATCH/DELETE /packages`, `PATCH /packages/:id/status` |
| UC11 (member subset) | Quản lý hội viên | 4 Member | `GET/PATCH/DELETE /members`, `PATCH /members/:id/assign-trainer` |
| UC11 (staff subset) | Quản lý nhân sự | 5 Staff | `GET/POST /staff`, `GET/PATCH/DELETE /staff/:id`, `GET/POST /staff/:id/schedules`, `DELETE /staff/:id/schedules/:scheduleId` |
| UC12 | Xem báo cáo | 9 Report | `GET /reports/revenue`, `GET /reports/members`, `GET /reports/renewals`, `GET /reports/staff-performance` |
| UC13 | Verify email | 1 Auth | `POST /auth/verify-email`, `POST /auth/resend-verify` |

Trigger background sang endpoint thay vì UC trực tiếp (đặc tả Architecture §5.2 cron):

| Cron | Trigger | Resource bị tác động |
|---|---|---|
| `subscription:expire` (daily 00:05) | `end_date < today_vn` | UPDATE subscriptions SET status='expired' |
| `subscription:activate-pending` (daily 00:10) | `start_date <= today_vn` AND EXISTS payments status='success' | UPDATE subscriptions SET status='active' |
| `subscription:cancel-unpaid-pending` (daily 00:15) | created_at > 24h AND NOT EXISTS payments status='success' | UPDATE subscriptions SET status='cancelled' |

## 6. Versioning

- Spec version độc lập với code version, bump khi spec thay đổi.
- Path-based versioning `/api/v1` ↔ `/api/v2` cho breaking change ở wire (xem `conventions.md §2`).
- Mỗi Markdown spec có Changelog section ở cuối, bump theo SemVer:
  - PATCH (1.0.x): typo, clarify wording, add example.
  - MINOR (1.x.0): thêm endpoint mới, thêm field optional, thêm error code.
  - MAJOR (x.0.0): thay đổi shape, đổi field bắt buộc, xóa endpoint.

## 7. Validation

OpenAPI lint:

```bash
npx -y @redocly/cli@latest lint docs/Design/API/openapi.yaml
```

Markdown lint qua VSCode markdownlint extension. Warning MD060 (table-pipe-compact) consistent style toàn project — chấp nhận.

## 8. Glossary

| Term | Definition |
|---|---|
| API base URL | Prefix `/api/v1` chung cho mọi endpoint (trừ `/health`). |
| Audit action | Mã `resource.verb` ghi `audit_logs.action` khi mutation xảy ra. |
| Cron interaction | Background job (Architecture §5.2) đọc/write resource cùng tập với endpoint — phải document trong Notes endpoint. |
| Error envelope | Shape JSON `{success: false, code, message, details?}` chuẩn hoá. |
| Idempotency v1.0 | KHÔNG có `Idempotency-Key` header. Mitigation: UNIQUE constraint + client disable button. |
| JWT | JSON Web Token, HS256, TTL 7 ngày. |
| OpenAPI 3.0 | Spec format machine-readable cho REST API contract. |
| RBAC | Role-Based Access Control. V1.0: 4 role `owner`, `staff`, `pt`, `member`. |
| Soft delete | Set `deleted_at = NOW()` thay vì DELETE row. |
| Stub | Module được liệt kê + UC mapping + endpoint count estimate, CHƯA có file Markdown chi tiết. |
| `today_vn` | Helper named convention ngày hiện tại theo timezone `Asia/Ho_Chi_Minh`. |
| Traceability matrix | Bảng map UC → Module → Endpoint cho audit + impact analysis. |

Thuật ngữ domain (member_code, subscription state machine, package): xem [`Database.md`](../Database.md) Glossary.

## 9. Open Items


1. **SMTP integration pending** (Architecture §8 R8). Endpoint shape `verify-email`, `resend-verify`, `forgot-password` không đổi sau integrate.
2. **~~`subscription.cancel` permission code gap~~ — CLOSED (phase 12 verify).** `seed.ts:44` có code, `seed.ts:108` map cho staff. CLAUDE.md phase 12 ghi "gap" là sai lệch — đã verify 2026-05-22.
3. **~~5 audit code drift mới từ Module 6~~ — CLOSED (Architecture v1.1.7 phase 12).** `room.create`/`room.update`/`room.delete` + `equipment.update`/`maintenance.update` đã sync vào §4.4.1.

## 10. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft — Module 1 + 4 detailed, 7 module stub. OpenAPI 3.0 contract cho 21 endpoint. |
| 1.0.1 | 2026-05-17 | Lê Thanh An | Phase 10 — Module 2 RBAC + Module 3 Package detailed (16 + 6 = 22 endpoint mới). OpenAPI bump 21 → 43 path. Module 2 derive permission catalog từ `seed.ts` (38 codes). Module 3 chốt rule block durationDays/price change khi có sub active. Xoá 3 drift cũ (Architecture v1.1.4 đã sync). Flag 6 audit code drift mới (group.revoke-permission, user.assign-group, user.revoke-group, package.create/update/delete) — pending Architecture v1.1.6. Module status table 4/9 module detailed. |
| 1.0.2 | 2026-05-18 | Lê Thanh An | Phase 11 — 6 audit code drift sync vào Architecture v1.1.6 (closed). RBAC retrofit Module 1 + 4 sang permission code notation thống nhất với Module 2/3 (`conventions.md §4` update). Module 6 Facility detailed (13 endpoint: Rooms 5 + Equipment 5 + Maintenance 3). OpenAPI bump 43 → 56 path. Open Items §9 giảm 5 → 3 items: bỏ Permission code retrofit (done) + 2 drift (Architecture đã sync). Flag 5 audit code drift mới từ Module 6 (`room.create`/`room.update`/`room.delete`/`equipment.update`/`maintenance.update`) — pending Architecture v1.1.7. Note sai lệch: `subscription.cancel` không phải gap mới — code đã có trong seed.ts từ trước. |
| 1.0.3 | 2026-05-22 | Lê Thanh An | Phase 12 doc-review fixes — permission count 35 → 38 (Module-2); pagination meta `total` → `totalItems`/`totalPages` thống nhất với conventions.md (Module-2/3/6); drift status update Module-2/3/6 (Architecture v1.1.6/v1.1.7 đã sync); close Open Items: `subscription.cancel` verified present + Architecture v1.1.7 closed 5 drift. |
| 1.0.4 | 2026-05-23 | Lê Thanh An | Phase 16 — thêm Module 10 Workout Plan (25 endpoint: Exercises 6 + WorkoutPlans 16 + WorkoutLogs 3). Tổng module tăng 9 → 10; tổng endpoint 100 → 134 detailed. Traceability Matrix: UC05A cập nhật sang Workout Plan; thêm UC05B/C (tách từ UC05A/B cũ), UC06A/B/C (tách từ UC06 cũ + thêm mới). Module 4 UC mapping update UC06 → UC06C. Module 7 Training UC mapping update sang UC05B/C/UC06C. |
| 1.0.5 | 2026-05-24 | Lê Thanh An | Phase 17 — thêm Module 5 Staff (14 endpoint), Module 7 Training (13 endpoint), Module 8 Feedback (6 endpoint), Module 9 Report (7 endpoint). Tổng 10/10 module Detailed; tổng endpoint 134 finalized. Traceability Matrix: UC05B/C, UC07, UC11 (staff subset), UC12 cập nhật từ Stub sang endpoints chi tiết. Navigation thêm 4 link mới. |
| 1.0.6 | 2026-06-19 | Lê Thanh An | Task 11 — sync README endpoint counts: Module 1 (7→9, added verify-email/resend-verify); Module 4 (14→24, paid account endpoints); Module 5 (8→14, staff attendance); Module 6 (13→14, added rooms/lookup); Module 7 (8→13, attendance/progress redesign); Module 8 (5→6, added delete endpoint); Module 9 (4→7, added employee-performance detail); Module 10 (19→25, exercises expanded). Total 100→134 endpoints. |
