# Module 8 — Feedback API

| Field | Value |
|---|---|
| Document ID | GMS-API-M8-001 |
| Version | 1.0.1 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-24) |
| Reviewers | TBD |
| Last Updated | 2026-05-24 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-5-Staff.md`](./Module-5-Staff.md), [`Architecture.md`](../Architecture.md), [`Database.md`](../Database.md), [`SRS_VI.md UC07`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 8 đặc tả endpoint quản lý phản hồi (`feedback`) từ hội viên đến gym. Bao trùm UC07 (Tiếp nhận và xử lý phản hồi hội viên).

In-scope: 5 endpoint trên resource `feedback`.

Out-of-scope:

- SLA notification push (email/Zalo khi feedback quá hạn) — defer v1.1+. Cron `feedback:sla-check` (Architecture §5.2) chỉ tính badge hiển thị ở frontend, KHÔNG thay đổi `status` DB.
- Staff reply/comment thread — v1.0 chỉ có status transition. Comment thread defer v1.1+.
- Feedback analytics / aggregation report — thuộc Module 9 Report.
- File attachment cho feedback — defer khi Module 4 Files endpoint hoàn thành.

---

## 2. Endpoint Inventory

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/feedback` | UC07 | JWT | `feedback.read` | NEW |
| 2 | POST | `/feedback` | UC07 | JWT | `feedback.create` | NEW |
| 3 | GET | `/feedback/:id` | UC07 | JWT | `feedback.read` | NEW |
| 4 | PATCH | `/feedback/:id` | UC07 | JWT | `feedback.handle` | NEW |
| 5 | DELETE | `/feedback/:id` | UC07 | JWT | `feedback.handle` HOẶC Owner | NEW |

Tổng: 5 endpoint, 0 implemented.

### Permission Catalog (`seed.ts` lines 63-65, 128-154)

| Permission | Roles | Ghi chú |
|---|---|---|
| `feedback.read` | owner, staff, trainer | Trainer có `feedback.read` (seed.ts line 141). Member KHÔNG có permission này — member xem feedback của mình qua `Self` token trong ownership check, không qua `feedback.read` gate. |
| `feedback.create` | owner, staff, member | Trainer (pt) KHÔNG có `feedback.create` trong seed.ts (line 141 — chỉ `feedback.read`). |
| `feedback.handle` | owner, staff | Tiếp nhận / phân loại / xử lý (status transition). |

> Drift note: Task specification mô tả `feedback.create` cho `pt (trainer)`. Seed.ts (source of truth) KHÔNG assign `feedback.create` cho role `trainer`. Spec này theo seed.ts. Nếu business requirement thay đổi, cập nhật `ROLE_PERMISSIONS.trainer` trong `seed.ts` trước.

---

## 3. Data Model

### 3.1 `feedback` (schema.prisma lines 463-490)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `feedbackId` | BigInt (string in JSON) | PK, auto-increment | Map: `feedback_id`. |
| `memberId` | BigInt | FK → `members.member_id`, NOT NULL | Map: `member_id`. Server set từ JWT, client không truyền. |
| `feedbackType` | `FeedbackType` enum | NOT NULL | `staff` / `equipment` / `service`. |
| `content` | string (text) | NOT NULL | Nội dung phản hồi tự do. |
| `severity` | `FeedbackSeverity` enum | NOT NULL, default `low` | `low` / `medium` / `high`. |
| `status` | `FeedbackStatus` enum | NOT NULL, default `open` | `open` / `in_progress` / `resolved` / `rejected`. |
| `handledByStaffId` | BigInt? | FK → `staff.staff_id`, nullable | Map: `handled_by_staff_id`. Set khi status → `in_progress`. |
| `handledAt` | DateTime? | nullable, Timestamp(6) | Map: `handled_at`. Set khi status → `resolved` hoặc `rejected`. |
| `subjectStaffId` | BigInt? | FK → `staff.staff_id`, nullable | Map: `subject_staff_id`. Bắt buộc khi `feedbackType='staff'`. |
| `subjectEquipmentId` | BigInt? | FK → `equipment.equipment_id`, nullable | Map: `subject_equipment_id`. Bắt buộc khi `feedbackType='equipment'`. |
| `deletedAt` | DateTime? | nullable, Timestamp(6) | Map: `deleted_at`. Soft delete. |
| `createdAt` | DateTime | auto `now()`, Timestamp(6) | Map: `created_at`. |

Enums (schema.prisma lines 69-92):

- `FeedbackType`: `staff` / `equipment` / `service`
- `FeedbackSeverity`: `low` / `medium` / `high`
- `FeedbackStatus`: `open` / `in_progress` / `resolved` / `rejected`

Existing indexes (schema.prisma line 487-488):

- `@@index([status, severity, createdAt(sort: Desc)])` — filter dashboard.
- `@@index([memberId, createdAt(sort: Desc)])` — member visibility filter.

### 3.2 Constraint `chk_feedback_subject`

DB-level check constraint (schema.prisma comment lines 477-480). Server validate trước khi INSERT (BR-F01):

| `feedbackType` | `subjectStaffId` | `subjectEquipmentId` |
|---|---|---|
| `staff` | NOT NULL | NULL |
| `equipment` | NULL | NOT NULL |
| `service` | NULL | NULL |

Prisma không tự enforce check constraint — server phải validate trước INSERT. Nếu DB enforcement tồn tại và bị vi phạm, Prisma trả error (không phải P2002/P2003 chuẩn — catch generic và map sang 422 `FEEDBACK_SUBJECT_MISMATCH`).

### 3.3 State Machine

```text
open ──(staff nhận xử lý)──> in_progress
open ──(staff từ chối)──> rejected
in_progress ──(xử lý xong)──> resolved
in_progress ──(từ chối sau khi nhận)──> rejected
```

Terminal states: `resolved`, `rejected` — không thể transition ra khỏi.

Cron `feedback:sla-check` (Architecture §5.2): badge logic, KHÔNG thay đổi `status` DB.

---

## 4. Feedback Endpoints

### 4.1 GET /feedback

**UC:** UC07 (staff/owner xem danh sách phản hồi; member xem phản hồi của mình)
**Auth:** JWT
**RBAC:** `feedback.read` (owner, staff, trainer) HOẶC `Self` (member — xem phần Visibility Rule)

**Description:** List feedback có pagination + filter. Visibility tự động phân cấp theo role: member chỉ thấy feedback của chính mình; staff/owner/trainer thấy tất cả (trừ soft-deleted).

**Visibility Rule (BR-F04):**

- Caller có `feedback.read` (owner, staff, trainer): query không filter thêm `memberId`.
- Caller là member (không có `feedback.read`, nhưng có JWT hợp lệ): server auto-inject `WHERE memberId = self.memberId` vào query. Member không cần truyền `memberId` param. Member truyền `memberId` khác mình → server ignore và override.

> Implementation note: Member không có permission `feedback.read` trong seed. Endpoint vẫn accessible cho member qua ownership route — guard stack cần xử lý: nếu thiếu `feedback.read` thì check member identity từ JWT và inject filter thay vì 403. Đây là pattern `Self` (conventions.md §4.2).

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `status` | enum | — | `open` / `in_progress` / `resolved` / `rejected`. |
| `severity` | enum | — | `low` / `medium` / `high`. |
| `feedbackType` | enum | — | `staff` / `equipment` / `service`. |
| `from` | date | — | Filter `createdAt >= from` (ISO date `YYYY-MM-DD`). |
| `to` | date | — | Filter `createdAt <= to + 1 day` (inclusive date range). |

Default sort: `createdAt DESC`.

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "feedbackId": "42",
      "memberId": "7",
      "feedbackType": "equipment",
      "content": "May chay bo so 3 bi het pin, khong hien thi so buoc",
      "severity": "medium",
      "status": "open",
      "handledByStaffId": null,
      "handledAt": null,
      "subjectStaffId": null,
      "subjectEquipmentId": "15",
      "createdAt": "2026-05-20T08:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 5, "totalPages": 1 }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | Thiếu / sai / expired JWT. |
| 403 | `FORBIDDEN` | Caller không có `feedback.read` VÀ không phải member (không thể xác định ownership). |
| 400 | `VALIDATION_ERROR` | `status`/`severity`/`feedbackType` không phải enum value hợp lệ; `pageSize > 100`; `from > to`. |

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN caller có `feedback.read` (staff/owner/trainer) → query tất cả feedback với `deletedAt IS NULL`. Apply filter params nếu có.
- WHEN caller là member (không có `feedback.read`) → server inject `WHERE memberId = self.memberId AND deletedAt IS NULL`. Caller-provided `memberId` param bị override.
- WHEN `from > to` (cả hai truyền) → 400 `VALIDATION_ERROR`.
- WHEN `pageSize > 100` → 400 `VALIDATION_ERROR`.
- ELSE trả list + pagination meta.

---

### 4.2 POST /feedback

**UC:** UC07 (hội viên / staff gửi phản hồi)
**Auth:** JWT
**RBAC:** `feedback.create` (owner, staff, member)

**Description:** Tạo feedback mới. Khi caller là member, `memberId` server tự set từ JWT (`self.memberId`) — client không truyền. Khi caller là staff/owner (không có `memberId` trong JWT), phải truyền `memberId` trong body để chỉ định member liên quan đến feedback. Validate subject constraint (BR-F01) trước INSERT.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | conditional | Bắt buộc khi caller là staff/owner. Server-set từ JWT khi caller là member. |
| `feedbackType` | enum | yes | `staff` / `equipment` / `service`. |
| `content` | string | yes | 10-2000 ký tự. |
| `severity` | enum | no | `low` / `medium` / `high`. Default `low` nếu omit. |
| `subjectStaffId` | string | conditional | Bắt buộc khi `feedbackType='staff'`. Phải là staffId tồn tại. Phải NULL khi `feedbackType != 'staff'`. |
| `subjectEquipmentId` | string | conditional | Bắt buộc khi `feedbackType='equipment'`. Phải là equipmentId tồn tại. Phải NULL khi `feedbackType != 'equipment'`. |

```json
{
  "feedbackType": "equipment",
  "content": "May chay bo so 3 bi het pin, khong hien thi so buoc chay",
  "severity": "medium",
  "subjectEquipmentId": "15"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "feedbackId": "42",
    "memberId": "7",
    "feedbackType": "equipment",
    "content": "May chay bo so 3 bi het pin, khong hien thi so buoc chay",
    "severity": "medium",
    "status": "open",
    "handledByStaffId": null,
    "handledAt": null,
    "subjectStaffId": null,
    "subjectEquipmentId": "15",
    "createdAt": "2026-05-24T09:15:00.000Z"
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `content` < 10 ký tự; `feedbackType` không hợp lệ; `severity` không hợp lệ. |
| 400 | `FK_CONSTRAINT` | `subjectStaffId` không tồn tại trong `staff`; `subjectEquipmentId` không tồn tại trong `equipment`. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `feedback.create`. |
| 422 | `FEEDBACK_SUBJECT_MISMATCH` | BR-F01: `feedbackType` / `subject*` không khớp constraint `chk_feedback_subject`. |

**Audit:** `feedback.create` với `after_data` = feedback object.

**WHEN-THEN-ELSE:**

- WHEN caller là staff/owner AND `memberId` không truyền trong body → 400 `VALIDATION_ERROR`.
- WHEN caller là staff/owner AND `memberId` truyền nhưng không tồn tại trong `members` → 400 `FK_CONSTRAINT`.
- WHEN `feedbackType='staff'` AND `subjectStaffId` NULL → 422 `FEEDBACK_SUBJECT_MISMATCH`.
- WHEN `feedbackType='staff'` AND `subjectEquipmentId` NOT NULL → 422 `FEEDBACK_SUBJECT_MISMATCH`.
- WHEN `feedbackType='equipment'` AND `subjectEquipmentId` NULL → 422 `FEEDBACK_SUBJECT_MISMATCH`.
- WHEN `feedbackType='equipment'` AND `subjectStaffId` NOT NULL → 422 `FEEDBACK_SUBJECT_MISMATCH`.
- WHEN `feedbackType='service'` AND (`subjectStaffId` NOT NULL OR `subjectEquipmentId` NOT NULL) → 422 `FEEDBACK_SUBJECT_MISMATCH`.
- WHEN `subjectStaffId` truyền AND không tồn tại trong `staff` → 400 `FK_CONSTRAINT`.
- WHEN `subjectEquipmentId` truyền AND không tồn tại trong `equipment` → 400 `FK_CONSTRAINT`.
- WHEN `content` < 10 ký tự → 400 `VALIDATION_ERROR`.
- ELSE INSERT với `memberId` (từ JWT nếu caller là member; từ body nếu caller là staff/owner), `status = 'open'`, `severity = 'low'` nếu omit. Audit `feedback.create`.

---

### 4.3 GET /feedback/:id

**UC:** UC07 (xem chi tiết 1 feedback)
**Auth:** JWT
**RBAC:** `feedback.read` (owner, staff, trainer) HOẶC `Self` (member — chỉ xem feedback của chính mình)

**Description:** Detail 1 feedback. Áp dụng anti-enumeration: member chỉ thấy feedback của chính mình — nếu `feedback.memberId != self.memberId` thì trả 404 `FEEDBACK_NOT_FOUND` (không phân biệt "không tồn tại" vs "không có quyền xem").

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "feedbackId": "42",
    "memberId": "7",
    "feedbackType": "equipment",
    "content": "May chay bo so 3 bi het pin, khong hien thi so buoc chay",
    "severity": "medium",
    "status": "in_progress",
    "handledByStaffId": "3",
    "handledAt": null,
    "subjectStaffId": null,
    "subjectEquipmentId": "15",
    "createdAt": "2026-05-24T09:15:00.000Z"
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Caller không có `feedback.read` VÀ không phải member. |
| 404 | `FEEDBACK_NOT_FOUND` | feedbackId không tồn tại, hoặc `deletedAt IS NOT NULL`, hoặc caller là member và `feedback.memberId != self.memberId` (anti-enumeration). |

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN `deletedAt IS NOT NULL` → 404 `FEEDBACK_NOT_FOUND`.
- WHEN feedbackId không tồn tại trong DB → 404 `FEEDBACK_NOT_FOUND`.
- WHEN caller là member (không có `feedback.read`) AND `feedback.memberId != self.memberId` → 404 `FEEDBACK_NOT_FOUND` (anti-enumeration — không trả 403 để tránh leak existence).
- WHEN caller có `feedback.read` (staff/owner/trainer) → trả resource nếu tồn tại và chưa soft-deleted.
- ELSE trả feedback detail.

---

### 4.4 PATCH /feedback/:id

**UC:** UC07 (staff / owner xử lý phản hồi — thay đổi trạng thái)
**Auth:** JWT
**RBAC:** `feedback.handle` (owner, staff)

**Description:** Cập nhật `status` feedback theo state machine §3.3. Không cho phép update `content`, `feedbackType`, `severity`, hay `subject*` — chỉ thay đổi `status`. Tự động set `handledByStaffId` và `handledAt` theo business rules BR-F02, BR-F03.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `status` | enum | yes | `in_progress` / `resolved` / `rejected`. Không thể set `open` (không thể revert). |

```json
{ "status": "in_progress" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "feedbackId": "42",
    "memberId": "7",
    "feedbackType": "equipment",
    "content": "May chay bo so 3 bi het pin, khong hien thi so buoc chay",
    "severity": "medium",
    "status": "in_progress",
    "handledByStaffId": "3",
    "handledAt": null,
    "subjectStaffId": null,
    "subjectEquipmentId": "15",
    "createdAt": "2026-05-24T09:15:00.000Z"
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `status` không phải enum value hợp lệ; body thiếu `status`. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `feedback.handle`. |
| 404 | `FEEDBACK_NOT_FOUND` | feedbackId không tồn tại hoặc `deletedAt IS NOT NULL`. |
| 409 | `FEEDBACK_ALREADY_CLOSED` | BR-F06: feedback đang ở terminal state `resolved` hoặc `rejected`. |
| 422 | `FEEDBACK_INVALID_TRANSITION` | Chuyển state không hợp lệ theo state machine (vd `open → resolved` không qua `in_progress`; body `status='open'`). |

**Audit:** `feedback.handle` với `before_data = {status: oldStatus}` + `after_data = {status: newStatus, handledByStaffId, handledAt}`.

**WHEN-THEN-ELSE:**

- WHEN feedbackId không tồn tại HOẶC `deletedAt IS NOT NULL` → 404 `FEEDBACK_NOT_FOUND`.
- WHEN current `status IN ('resolved', 'rejected')` → 409 `FEEDBACK_ALREADY_CLOSED`. Terminal state — không thể transition ra.
- WHEN body `status = 'open'` → 422 `FEEDBACK_INVALID_TRANSITION` ("Không thể revert về open").
- WHEN body `status = 'in_progress'` AND current `status != 'open'` → 422 `FEEDBACK_INVALID_TRANSITION`.
- WHEN body `status = 'resolved'` AND current `status != 'in_progress'` → 422 `FEEDBACK_INVALID_TRANSITION` ("resolved yêu cầu qua in_progress trước").
- WHEN body `status = 'rejected'` AND current `status NOT IN ('open', 'in_progress')` → 422 `FEEDBACK_INVALID_TRANSITION`.
- WHEN transition hợp lệ → `$transaction`:
  1. WHEN `status = 'in_progress'` → lookup `staffId` bằng `staff.findUnique({ where: { userId: BigInt(jwt.sub), deletedAt: null } })`. UPDATE `status`, set `handledByStaffId = staffId` (null nếu caller là owner không có staff record — không throw error, BR-F02 intent). `handledAt` giữ NULL.
  2. WHEN `status IN ('resolved', 'rejected')` → UPDATE `status`, set `handledAt = NOW()` (BR-F03). `handledByStaffId` giữ nguyên nếu đã set ở bước `in_progress`; với `open → rejected` (direct rejection), `handledByStaffId` giữ NULL.
  3. Audit `feedback.handle`.
- ELSE 400.

> Note — `self.staffId` resolution: `handledByStaffId` là FK → `staff.staff_id`. Từ JWT `sub` (userId), server lookup `staff.findUnique({ where: { userId: jwt.sub } })` để lấy `staffId`. Nếu caller là owner nhưng không có record trong `staff` table → `handledByStaffId` giữ NULL (owner không nhất thiết có staff record).

---

### 4.5 DELETE /feedback/:id

**UC:** UC07 (xóa phản hồi — soft delete)
**Auth:** JWT
**RBAC:** `feedback.handle` (owner, staff) với điều kiện khác nhau theo role; xem WHEN-THEN-ELSE

**Description:** Soft delete feedback (`deletedAt = NOW()`). Owner có thể xóa feedback ở mọi trạng thái. Staff chỉ được xóa khi `status = 'open'`; feedback đang xử lý hoặc đã đóng — chỉ owner mới xóa được.

**Response 204 No Content.**

> Drift note: conventions.md §20 quy định soft-delete resource trả 200 OK. Spec này dùng 204 No Content theo de facto pattern của project. Cần đồng bộ conventions.md §20 khi có session review.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `feedback.handle`. |
| 404 | `FEEDBACK_NOT_FOUND` | feedbackId không tồn tại hoặc đã `deletedAt IS NOT NULL`. |
| 422 | `FEEDBACK_INVALID_TRANSITION` | Caller là staff (không phải owner) và `feedback.status != 'open'`. |

**Audit:** `feedback.delete` với `before_data = {feedbackId, status, memberId}`.

**WHEN-THEN-ELSE:**

- WHEN feedbackId không tồn tại HOẶC `deletedAt IS NOT NULL` → 404 `FEEDBACK_NOT_FOUND`.
- WHEN caller có role `owner` → cho phép soft delete bất kể `status`. Set `deletedAt = NOW()`. Audit `feedback.delete`.
- WHEN caller là staff (có `feedback.handle` nhưng không phải owner) AND `feedback.status != 'open'` → 422 `FEEDBACK_INVALID_TRANSITION` ("Staff chỉ được xóa feedback chưa xử lý. Chỉ owner mới xóa mọi trạng thái.").
- WHEN caller là staff AND `feedback.status = 'open'` → soft delete. Set `deletedAt = NOW()`. Audit `feedback.delete`.

> Note — phân biệt owner vs staff: dùng `jwt.roles.includes('owner')` từ JWT payload `{ sub, email, roles[] }`. Group lookup không cần thiết — roles đã có sẵn trong token. Không dựa vào `user_metadata` (security.md).

---

## 5. Error Codes Appendix

Standard codes: xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 8:

| Code | HTTP | Trigger |
|---|---|---|
| `FEEDBACK_NOT_FOUND` | 404 | feedbackId không tồn tại, hoặc `deletedAt IS NOT NULL`, hoặc member xem feedback của người khác (anti-enumeration). |
| `FEEDBACK_SUBJECT_MISMATCH` | 422 | BR-F01: `feedbackType` và `subject*` fields không khớp constraint `chk_feedback_subject`. |
| `FEEDBACK_INVALID_TRANSITION` | 422 | Chuyển state không hợp lệ (vd `open → resolved`; body `status='open'`); hoặc staff cố xóa feedback không ở `status='open'`. |
| `FEEDBACK_ALREADY_CLOSED` | 409 | BR-F06: thao tác PATCH trên feedback đang ở terminal state `resolved` hoặc `rejected`. |

---

## 6. Audit Action Codes Used

Cross-ref với `conventions.md §18`:

| Code | conventions.md §18 status | Trigger |
|---|---|---|
| `feedback.create` | NOT LISTED — drift mới | §4.2 POST /feedback |
| `feedback.handle` | NOT LISTED — drift mới | §4.4 PATCH /feedback/:id |
| `feedback.delete` | NOT LISTED — drift mới | §4.5 DELETE /feedback/:id |

Ba codes `feedback.create`, `feedback.handle`, `feedback.delete` chưa có trong `conventions.md §18` audit inventory (phần Module không có row Feedback). Cần thêm row Feedback vào `conventions.md §18` khi implement Module 8 PR.

---

## 7. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| GET /feedback | NOT IMPLEMENTED | — |
| POST /feedback | NOT IMPLEMENTED | — |
| GET /feedback/:id | NOT IMPLEMENTED | — |
| PATCH /feedback/:id | NOT IMPLEMENTED | — |
| DELETE /feedback/:id | NOT IMPLEMENTED | — |

### Required Prisma Index

Indexes đã có trong `schema.prisma` (lines 487-488):

- `@@index([status, severity, createdAt(sort: Desc)])` — filter dashboard §4.1.
- `@@index([memberId, createdAt(sort: Desc)])` — member visibility check §4.1, §4.3.

Không cần thêm index mới. Kiểm tra lại khi implement nếu query pattern thay đổi.

### DB Constraint

`chk_feedback_subject` là check constraint ở DB level (schema.prisma comment lines 477-480). Prisma không tự tạo check constraint qua `schema.prisma` — constraint phải được thêm bằng raw SQL migration riêng (theo comment trong schema). Server-side validate (§4.2 WHEN-THEN-ELSE) là primary guard; DB constraint là secondary defense.

Khi Prisma catch violation từ DB check constraint (không phải P2002/P2003), service phải catch error generic và map sang 422 `FEEDBACK_SUBJECT_MISMATCH`.

### Cron `feedback:sla-check`

Badge logic frontend — đọc `createdAt` + `status` để tính overdue theo threshold SLA (Architecture §5.2). KHÔNG update `status` hoặc bất kỳ field nào trong DB. Implement ở client-side hoặc read-only cron endpoint.

### `self.staffId` Resolution

Endpoint PATCH §4.4 cần lookup `staffId` từ `userId` (JWT `sub`) để set `handledByStaffId`. Pattern: `staff.findUnique({ where: { userId: BigInt(jwt.sub) } })`. Nếu không tìm thấy (owner không có staff record) → `handledByStaffId = null`. Không throw error trong trường hợp này.

### Cross-module Dependencies

- **Module 6 Facility:** `feedback.subjectEquipmentId` FK → `equipment.equipment_id`. Hard delete equipment (Module 6 §5.5) không cascade feedback (FK `ON DELETE NO ACTION` per Database.md cross-module note §10). Khi implement DELETE equipment, phải xử lý feedback có `subjectEquipmentId` trước, hoặc set `subjectEquipmentId = NULL`.
- **Module 5 Staff:** `feedback.subjectStaffId` FK → `staff.staff_id`. Staff soft-delete — feedback giữ FK (orphan reference acceptable, history preserved).
- **Module 4 Member:** `feedback.memberId` FK → `members.member_id`. Member soft-delete — feedback giữ FK.

---

## 8. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-24 | Lê Thanh An | Initial draft — 5 endpoint UC07. State machine `open/in_progress/resolved/rejected`. BR-F01..BR-F06. Soft delete với phân biệt staff vs owner. Anti-enumeration tại GET /feedback/:id. Drift note: `feedback.create` không có cho trainer (seed.ts source of truth); 3 audit codes chưa listed trong conventions.md §18; DELETE 204 vs conventions.md §20 (200). |
| 1.0.1 | 2026-05-24 | Lê Thanh An | Quality review fixes: C2 tách `resolved`/`rejected` transition condition để cho phép `open → rejected` trực tiếp; C1 thêm staffId null lookup vào WHEN-THEN-ELSE §4.4 step 1; C3 thêm `memberId` conditional field tại §4.2 POST cho staff/owner callers; I1 chốt dùng `jwt.roles.includes('owner')` để phân biệt owner vs staff tại §4.5. |
