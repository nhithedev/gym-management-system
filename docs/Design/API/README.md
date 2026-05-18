# API Specification

| Field | Value |
|---|---|
| Document ID | GMS-API-README-001 |
| Version | 1.0.2 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD |
| Last Updated | 2026-05-18 |
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

9 module v1.0. Phase 11 (2026-05-18) detail thêm Module 6 — tổng cộng 5/9 module detailed; còn lại stub, defer phase sau theo thứ tự dependency.

| Module | UC mapping | Endpoint est. | Status | File |
|---|---|---|---|---|
| 1 Auth | UC00, UC01, UC02, UC13 | 7 | Detailed | [`Module-1-Auth.md`](./Module-1-Auth.md) |
| 2 RBAC + User Admin | UC10 (user/role); cross-cutting | 16 | Detailed | [`Module-2-RBAC.md`](./Module-2-RBAC.md) |
| 3 Package | UC03A, UC04A, UC10 | 6 | Detailed | [`Module-3-Package.md`](./Module-3-Package.md) |
| 4 Member/Subscription/Payment | UC03A/B, UC04A/B, UC06, UC11 (partial) | 14 | Detailed | [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md) |
| 5 Staff | UC11 (full) | 6-8 | Stub | TBD — depend Module 2 |
| 6 Facility | UC08, UC09 | 13 | Detailed | [`Module-6-Facility.md`](./Module-6-Facility.md) |
| 7 Training | UC05A, UC05B, UC06 (progress write) | 7-9 | Stub | TBD — UC05B cần Architecture §3.3 |
| 8 Feedback | UC07 | 4-5 | Stub | TBD |
| 9 Report | UC12 | 3-5 | Stub | TBD — cron + aggregation |

**Total endpoints v1.0:** 70-83 (Module 1+2+3+4+6 = 56 đã spec, 14-27 còn defer).

## 4. Navigation

- [`conventions.md`](./conventions.md) — Quy ước chung cho mọi module (auth, pagination, error, audit, rate limit, RBAC notation, DTO naming, business rule format).
- [`Module-1-Auth.md`](./Module-1-Auth.md) — Auth endpoints chi tiết.
- [`Module-2-RBAC.md`](./Module-2-RBAC.md) — Permission catalog + Group/User-Group/User admin.
- [`Module-3-Package.md`](./Module-3-Package.md) — Package CRUD + status toggle.
- [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md) — Member + Subscription + Payment endpoints.
- [`Module-6-Facility.md`](./Module-6-Facility.md) — Room + Equipment + Maintenance log endpoints.
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
| UC05A | Lập lịch tập | 7 Training | Stub |
| UC05B | Real-time check-in | 7 Training | Stub — Architecture §3.3 (`POST /devices/access-events`) |
| UC06 | Theo dõi tiến độ | 4 Member (read), 7 Training (write) | `GET /members/:id/progress` (read v1.0) |
| UC07 | Gửi phản hồi | 8 Feedback | Stub |
| UC08 | Quản lý phòng tập | 6 Facility | `GET/POST/PATCH/DELETE /rooms` |
| UC09 | Quản lý thiết bị | 6 Facility | `GET/POST/PATCH/DELETE /equipment`, `GET/POST /equipment/:id/maintenance-logs`, `PATCH /maintenance-logs/:id` |
| UC10 (user/role) | Quản lý user + RBAC | 2 RBAC | `GET/POST/PATCH/DELETE /groups`, `GET/POST/DELETE /groups/:id/permissions`, `GET/POST/PATCH/DELETE /users`, `GET/POST/DELETE /users/:id/groups`, `GET /permissions` |
| UC10 (package) | Quản lý gói tập | 3 Package | `GET/POST/PATCH/DELETE /packages`, `PATCH /packages/:id/status` |
| UC11 (member subset) | Quản lý hội viên | 4 Member | `GET/PATCH/DELETE /members`, `PATCH /members/:id/assign-trainer` |
| UC11 (staff subset) | Quản lý nhân sự | 5 Staff | Stub |
| UC12 | Xem báo cáo | 9 Report | Stub |
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


1. **`subscription.cancel` permission code gap (Module 4 §4.3).** RBAC retrofit phase 11 dùng `subscription.cancel` cho `PATCH /subscriptions/:id/cancel` nhưng code chưa có trong `server/prisma/seed.ts`. Khi impl Module 4 PR, thêm `{ code: 'subscription.cancel', name: 'Hủy gói đăng ký', description: '...' }` vào `PERMISSIONS` + map cho `owner`/`staff`/`member` (member needed cho UC04B self-cancel).
2. **5 audit code drift mới từ Module 6** — `room.create`/`room.update`/`room.delete`/`equipment.update`/`maintenance.update` chưa có trong Architecture §4.4.1. Sync vào v1.1.7 phase 12 (~10 phút).
3. **SMTP integration pending** (Architecture §8 R8). Endpoint shape `verify-email`, `resend-verify`, `forgot-password` không đổi sau integrate.
4. **`/doc-review` 4 vòng cho API doc** chưa chạy. Session sau khi spec stable. Anti-AI score risk cần edit pass thủ công trước.

## 10. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft — Module 1 + 4 detailed, 7 module stub. OpenAPI 3.0 contract cho 21 endpoint. |
| 1.0.1 | 2026-05-17 | Lê Thanh An | Phase 10 — Module 2 RBAC + Module 3 Package detailed (16 + 6 = 22 endpoint mới). OpenAPI bump 21 → 43 path. Module 2 derive permission catalog từ `seed.ts` (35 codes). Module 3 chốt rule block durationDays/price change khi có sub active. Xoá 3 drift cũ (Architecture v1.1.4 đã sync). Flag 6 audit code drift mới (group.revoke-permission, user.assign-group, user.revoke-group, package.create/update/delete) — pending Architecture v1.1.6. Module status table 4/9 module detailed. |
| 1.0.2 | 2026-05-18 | Lê Thanh An | Phase 11 — 6 audit code drift sync vào Architecture v1.1.6 (closed). RBAC retrofit Module 1 + 4 sang permission code notation thống nhất với Module 2/3 (`conventions.md §4` update). Module 6 Facility detailed (13 endpoint: Rooms 5 + Equipment 5 + Maintenance 3). OpenAPI bump 43 → 56 path. Open Items §9 giảm 5 → 3 items: bỏ Permission code retrofit (done) + 2 drift (Architecture đã sync). Phát hiện gap mới: `subscription.cancel` chưa có trong seed.ts — flag cho impl PR. Flag 5 audit code drift mới từ Module 6 (`room.create`/`room.update`/`room.delete`/`equipment.update`/`maintenance.update`) — pending Architecture v1.1.7. |
