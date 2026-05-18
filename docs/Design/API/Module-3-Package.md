# Module 3 — Package API

| Field | Value |
|---|---|
| Document ID | GMS-API-M3-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD |
| Last Updated | 2026-05-17 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-2-RBAC.md`](./Module-2-RBAC.md), [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md), [`Architecture.md`](../Architecture.md), [`Database.md`](../Database.md), [`SRS_VI.md UC03A/UC04A`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 3 đặc tả endpoint quản lý danh mục gói tập (`packages` table). Gói tập là **time-based v1.0** — chỉ `duration_days`, không có `session_limit` (xem Database.md §Packages note, SRS UC03 ghi chú).

In-scope: 5 endpoint CRUD package + 1 status toggle.

Out-of-scope:

- Subscription CRUD (member đăng ký gói) → [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md).
- Payment recording → Module 4.
- Upgrade/downgrade giữa kỳ — defer v1.1+ (SRS UC04A Ghi chú v1.0).
- Bundle / promo / discount — defer v1.1+.

## 2. Endpoint Inventory

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/packages` | UC03A/UC04A | JWT | `package.read` | NEW |
| 2 | GET | `/packages/:id` | UC03A/UC04A | JWT | `package.read` | NEW |
| 3 | POST | `/packages` | UC10 | JWT | `package.manage` | NEW |
| 4 | PATCH | `/packages/:id` | UC10 | JWT | `package.manage` | NEW |
| 5 | PATCH | `/packages/:id/status` | UC10 | JWT | `package.manage` | NEW |
| 6 | DELETE | `/packages/:id` | UC10 | JWT | `package.manage` | NEW |

Tổng: 6 endpoint, 0 implemented.

`package.read` per `seed.ts:40` — owner/staff/trainer/member ĐỀU có. `package.manage` per `seed.ts:41` — owner/staff only.

---

## 3. Data Model

`packages` (Database.md §packages):

| Field | Type | Constraint | Note |
|---|---|---|---|
| `packageId` | BigInt (string in JSON) | PK | Auto-increment. |
| `packageCode` | string(30) | UNIQUE | Format `PKG-XXXX` (4-digit), auto-gen nếu client không truyền. |
| `name` | string(100) | NOT NULL | Vd "Standard 3 tháng". |
| `durationDays` | int | > 0 | Số ngày gói có hiệu lực. |
| `price` | Decimal(12, 2) | > 0 | VND, integer logic v1.0 (`.00`). |
| `benefits` | string(255) | NULL | Mô tả benefit. |
| `status` | enum `active` / `inactive` | default `active` | `inactive` không hiển thị cho member khi list mua gói. |
| `deletedAt` | timestamp | NULL | Soft delete. |
| `createdAt` | timestamp | NOT NULL | Auto. |

Enum source: `schema.prisma:29-34` `PackageStatus { active, inactive }`.

---

## 4. Endpoints

### 4.1 GET /packages

**UC:** UC03A (Staff chọn gói khi đăng ký member), UC04A (Member browse gói gia hạn).
**Auth:** JWT
**RBAC:** `package.read`

**Description:** List package. Filter, pagination, sort. Auto-filter `status='active'` khi caller có role `member` (không hiển thị inactive cho member).

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `status` | enum | (auto-filter cho member) | `active` / `inactive`. Ignore nếu role member. |
| `minDuration` | int | — | Filter `durationDays >= minDuration`. |
| `maxDuration` | int | — | Filter `durationDays <= maxDuration`. |
| `minPrice` | decimal | — | Filter `price >= minPrice`. |
| `maxPrice` | decimal | — | Filter `price <= maxPrice`. |
| `search` | string | — | LIKE `name` hoặc `packageCode`. |
| `includeDeleted` | boolean | false | Bao gồm `deleted_at IS NOT NULL`. Chỉ owner/staff với `package.manage`. |
| `sort` | string | `created_at:desc` | `price:asc`/`duration_days:asc` thường dùng. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "packageId": "1",
      "packageCode": "PKG-0001",
      "name": "Standard 1 thang",
      "durationDays": 30,
      "price": "500000.00",
      "benefits": "Truy cap phong tap, locker, voucher do uong",
      "status": "active",
      "createdAt": "2026-01-01T08:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 5 }
}
```

**Errors:** `401`, `403` (thiếu `package.read`).

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN role caller = `member` → force `status='active'`, ignore `includeDeleted` param.
- WHEN role caller có `package.manage` → cho phép `status='inactive'` + `includeDeleted=true`.
- ELSE chỉ trả `active` + `deletedAt IS NULL`.

---

### 4.2 GET /packages/:id

**UC:** UC03A/UC04A
**Auth:** JWT
**RBAC:** `package.read`

**Description:** Detail 1 package + statistics tóm tắt (count subscription active dùng gói này — dùng cho UI admin khi xem có thể xóa hay không).

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "packageId": "1",
    "packageCode": "PKG-0001",
    "name": "Standard 1 thang",
    "durationDays": 30,
    "price": "500000.00",
    "benefits": "...",
    "status": "active",
    "stats": {
      "activeSubscriptions": 12,
      "pendingSubscriptions": 3,
      "totalSubscriptions": 87
    },
    "createdAt": "2026-01-01T08:00:00.000Z",
    "deletedAt": null
  }
}
```

`stats` chỉ trả khi caller có `package.manage` (owner/staff). Role member nhận `stats: null`.

**Errors:** `401`, `403`, `404`.

---

### 4.3 POST /packages

**UC:** UC10 — Owner quản lý gói (SRS phase 10+ note: UC10 cũ là user/role; phần package management defer dù logic tương tự — coi như sub-flow UC10 admin).
**Auth:** JWT
**RBAC:** `package.manage`

**Description:** Tạo package mới. Auto-gen `packageCode` nếu client không truyền.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `packageCode` | string | no | UNIQUE, `^PKG-[A-Z0-9]{4}$`. Server auto-gen nếu omit. |
| `name` | string | yes | 1-100 ký tự. |
| `durationDays` | int | yes | Range 1-3650 (1 ngày - 10 năm). |
| `price` | decimal | yes | > 0, ≤ 99,999,999.99. |
| `benefits` | string | no | ≤ 255 ký tự. |
| `status` | enum | no | Default `active`. |

```json
{
  "name": "Standard 3 thang",
  "durationDays": 90,
  "price": "1350000.00",
  "benefits": "Tat ca quyen Standard 1 thang + 2 buoi PT free"
}
```

**Response 201 Created:** Package detail (giống §4.2 không có `stats`).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | name length, durationDays out-of-range, price ≤ 0, packageCode format invalid. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `package.manage`. |
| 409 | `DUPLICATE_VALUE` | `packageCode` đã tồn tại (P2002). |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Server retry auto-gen `packageCode` 10 lần đều conflict (cực hiếm). Tên code reuse pattern Module 4. |

**Audit:** `package.create` với `after_data` = package object.

**WHEN-THEN-ELSE:**

- WHEN `packageCode` không truyền → server gen `PKG-XXXX` (4-char hex random). Retry tới 10 lần nếu UNIQUE conflict.
- WHEN `durationDays` ≤ 0 hoặc > 3650 → 400 `VALIDATION_ERROR`.
- WHEN `price` ≤ 0 → 400 `VALIDATION_ERROR`.
- ELSE INSERT + audit.

---

### 4.4 PATCH /packages/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `package.manage`

**Description:** Update package metadata. **Block `durationDays` và `price` change nếu có subscription active hoặc pending** referencing — tránh inconsistency với gói member đã purchase.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | no | 1-100. |
| `durationDays` | int | no | Range 1-3650. **Block nếu có sub active/pending.** |
| `price` | decimal | no | > 0. **Block nếu có sub active/pending.** |
| `benefits` | string | no | ≤ 255. |
| `packageCode` | string | no | UNIQUE. |

**Response 200 OK:** Package detail.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Format invalid. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Package không tồn tại / soft-deleted. |
| 409 | `DUPLICATE_VALUE` | `packageCode` collision. |
| 409 | `PACKAGE_HAS_ACTIVE_SUBSCRIPTION` | Cố thay `durationDays` hoặc `price` khi có sub `active`/`pending`. |

**Audit:** `package.update` với `before_data` + `after_data`.

**WHEN-THEN-ELSE:**

- WHEN body có `durationDays` HOẶC `price` AND `EXISTS subscriptions WHERE packageId=:id AND status IN ('active', 'pending') AND deletedAt IS NULL` → 409 `PACKAGE_HAS_ACTIVE_SUBSCRIPTION` với `details: { activeCount, pendingCount }`. Client phải tạo package mới + deactivate package cũ.
- WHEN chỉ thay `name`/`benefits`/`status`/`packageCode` → cho phép (metadata only, không ảnh hưởng sub existing).
- ELSE UPDATE + audit.

---

### 4.5 PATCH /packages/:id/status

**UC:** UC10
**Auth:** JWT
**RBAC:** `package.manage`

**Description:** Toggle `status` giữa `active` ↔ `inactive`. `inactive` package ẩn khỏi list của member (UI mua gói) nhưng sub existing không bị ảnh hưởng — chạy tới hết `end_date` bình thường.

**Request body:**

```json
{ "status": "inactive" }
```

**Response 200 OK:** Package detail.

**Errors:** `401`, `403`, `404`, `400 VALIDATION_ERROR` (status không phải enum value).

**Audit:** `package.update` với `before_data.status` + `after_data.status`. Không tạo audit code mới — reuse `package.update`.

**Note:** Endpoint riêng cho status toggle vì UI thường có nút "Ngừng kinh doanh" / "Mở lại" — semantic rõ hơn PATCH chung. Backend có thể delegate logic tới same service method.

---

### 4.6 DELETE /packages/:id

**UC:** UC10
**Auth:** JWT
**RBAC:** `package.manage`

**Description:** Soft delete package (`deleted_at = NOW()`). **Block nếu có subscription active/pending.**

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Package không tồn tại / đã soft-deleted. |
| 409 | `PACKAGE_HAS_ACTIVE_SUBSCRIPTION` | Có sub `active`/`pending`. |

**Audit:** `package.delete`.

**WHEN-THEN-ELSE:**

- WHEN `EXISTS subscriptions WHERE packageId=:id AND status IN ('active', 'pending') AND deletedAt IS NULL` → 409 `PACKAGE_HAS_ACTIVE_SUBSCRIPTION` với `details: { activeCount, pendingCount }`. Client phải đợi hết hạn hoặc cancel sub trước. Lưu ý: sub `expired`/`cancelled` không block delete (history data).
- ELSE soft delete + audit. Subscription `expired`/`cancelled` referencing package vẫn giữ FK (read-only history).

---

## 5. Error Codes Appendix

Standard codes: xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 3:

| Code | HTTP | Trigger |
|---|---|---|
| `PACKAGE_HAS_ACTIVE_SUBSCRIPTION` | 409 | PATCH `durationDays`/`price` hoặc DELETE khi có sub active/pending. |
| `MEMBER_CODE_GENERATION_FAILED` | 500 | Server retry auto-gen `packageCode` 10 lần thất bại. Reuse error code name từ Module 4 (member_code generation share retry pattern). |

## 6. Audit Action Codes Used

| Code | Architecture status | Trigger |
|---|---|---|
| `package.create` | **DRIFT — chưa list §4.4.1** | §4.3 |
| `package.update` | **DRIFT — chưa list** | §4.4 + §4.5 |
| `package.delete` | **DRIFT — chưa list** | §4.6 |

3 audit code mới — flag để Architecture v1.1.6 thêm row "Package" vào §4.4.1 audit table.

## 7. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| All 6 | NOT IMPLEMENTED | PR scaffold sau Module 4 (Module 4 cung cấp Subscription model + ownership pattern). |

Required index khi implement:

- `packages.package_code` UNIQUE — đã có Prisma `@unique`.
- `subscriptions.package_id` — đã có Prisma `@@index([memberId, status])` nhưng KHÔNG có index riêng cho `packageId`. **Action item:** thêm `@@index([packageId, status])` vào Prisma schema cho query `EXISTS subscriptions WHERE packageId AND status IN (...)`. Defer khi implement Module 3 PR (atomic với schema migration).

## 8. Cross-module Dependencies

- **Module 4** Subscription: `POST /subscriptions` reference `packageId`. Subscription create check `packages.status='active' AND deletedAt IS NULL`.
- **Module 9** Report: report doanh thu theo gói, count subscriber per package — defer module 9 spec.
- **Module 1** Auth: `JwtAuthGuard` global. Member role có `package.read` qua `seed.ts:130`.

## 9. Sync với Module 4 POST /subscriptions

Module 4 `POST /subscriptions` (xem [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md) §4.x) reference `packageId`. Yêu cầu shape khớp:

- Module 4 phải check `package.status='active' AND deletedAt IS NULL` trước khi tạo subscription.
- Nếu Module 3 soft-delete package giữa lúc Module 4 đang validate → race condition, P2025 catch ở Module 4 service.

Verification cần khi implement: integration test "Owner soft-delete package trong khi staff đang `POST /subscriptions`" → expect 409 hoặc 404 từ Module 4, không leak inconsistent state.

## 10. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft phase 10 — 6 endpoint Package CRUD + status toggle. Block `durationDays`/`price` change + delete khi có active/pending subscription. Flag 3 audit code drift (package.create/update/delete chưa có trong Architecture §4.4.1). Required Prisma index `@@index([packageId, status])` trên `subscriptions` defer khi implement. |
