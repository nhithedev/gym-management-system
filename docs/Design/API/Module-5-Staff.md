# Module 5 — Staff API (Staff / Staff Schedule)

| Field | Value |
|---|---|
| Document ID | GMS-API-M5-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-24) |
| Reviewers | TBD |
| Last Updated | 2026-05-24 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-2-RBAC.md`](./Module-2-RBAC.md), [`Architecture.md §4`](../Architecture.md), [`Database.md §staff, staff_schedules`](../Database.md), [`SRS_VI.md UC11`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 5 đặc tả endpoint quản lý nhân viên: thông tin staff (`staff`, `users`) và lịch làm việc (`staff_schedules`). Bao trùm UC11 (Quản lý nhân viên và lịch làm việc).

`staff` áp dụng **soft delete** (Database.md "Soft Delete Convention"). Khi xóa staff, đồng thời soft-delete bản ghi `users` tương ứng trong 1 transaction (BR-S02). `staff_schedules` cũng soft delete — rows được tạo (POST) và xóa mềm (DELETE).

In-scope: 8 endpoint chia 2 resource group (Staff CRUD 5 + Staff Schedule 3).

Out-of-scope:

- Phân quyền group cho staff (Module 2 RBAC xử lý).
- Trainer-specific features (assign member, training session) — thuộc Module 7 Training.
- Nghỉ phép / leave management — defer v1.1.
- Notification khi tạo tài khoản (email invite thực) — v1.0 dùng `console.log` placeholder.

## 2. Endpoint Inventory

### Staff (UC11 CRUD)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/staff` | UC11 | JWT | `staff.read` | NEW |
| 2 | POST | `/staff` | UC11 | JWT | `staff.create` | NEW |
| 3 | GET | `/staff/:id` | UC11 | JWT | `staff.read` | NEW |
| 4 | PATCH | `/staff/:id` | UC11 | JWT | `staff.update` | NEW |
| 5 | DELETE | `/staff/:id` | UC11 | JWT | `staff.delete` | NEW |

### Staff Schedule (UC11 Lịch làm việc)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 6 | GET | `/staff/:id/schedules` | UC11 | JWT | `schedule.read` | NEW |
| 7 | POST | `/staff/:id/schedules` | UC11 | JWT | `schedule.manage` | NEW |
| 8 | DELETE | `/staff/:id/schedules/:scheduleId` | UC11 | JWT | `schedule.manage` | NEW |

Tổng: 8 endpoint, 0 implemented.

Permission catalog (`seed.ts`):

- `staff.read`: owner, staff.
- `staff.create`: owner only.
- `staff.update`: owner, staff.
- `staff.delete`: owner only.
- `schedule.read`: owner, staff, pt.
- `schedule.manage`: owner, staff.

---

## 3. Data Model

### 3.1 `staff` (Database.md §staff)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `staffId` | BigInt (string in JSON) | PK | Auto-increment. |
| `userId` | BigInt | FK → `users.user_id` UNIQUE | 1:1 với User. |
| `staffCode` | string | UNIQUE | Format `STF-{YYYY}-{6 alnum}`, server-side auto-gen. Client không được truyền. |
| `position` | string | NOT NULL | Enum: `pt` / `manager` / `receptionist` / `technician`. |
| `deletedAt` | DateTime? | NULL | Soft delete. `deletedAt IS NULL` = active. |

`staffCode` format: `STF-{YYYY}-{6 digits}`, ví dụ `STF-2026-000045` (conventions.md §12). Server retry tối đa 5 lần nếu collision → 500 `STAFF_CODE_GENERATION_FAILED`.

### 3.2 `staff_schedules` (Database.md §staff_schedules)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `scheduleId` | BigInt (string in JSON) | PK | Auto-increment. |
| `staffId` | BigInt | FK → `staff.staff_id` | NOT NULL. |
| `shift` | StaffShift enum | NOT NULL | Xem §3.3. |
| `workDate` | Date | NOT NULL | Format `YYYY-MM-DD` (date-only, no time). |
| `deletedAt` | DateTime? | NULL | Soft delete. |

Partial unique constraint: `(staffId, shift, workDate) WHERE deletedAt IS NULL`. Prisma không support partial unique index native — enforce bằng SELECT-then-INSERT guard trong service (BR-S03). Partial unique index raw SQL có thể thêm ngoài Prisma khi có migration runner.

### 3.3 Enum `StaffShift`

| Value | Ý nghĩa |
|---|---|
| `morning` | Ca sáng |
| `afternoon` | Ca chiều |
| `evening` | Ca tối |

### 3.4 `users` fields liên quan

Khi tạo staff, đồng thời tạo `users` với `status='pending_verification'`. Các field user trả về trong response staff:

| Field | Source | Note |
|---|---|---|
| `fullName` | `users.full_name` | Hiển thị tên. |
| `email` | `users.email` | UNIQUE, dùng để đăng nhập. |
| `phone` | `users.phone` | Nullable. |
| `status` | `users.status` | `pending_verification` / `active` / `locked`. |

---

## 4. Endpoints — Staff

### 4.1 GET /staff

**UC:** UC11 (Owner/Staff xem danh sách nhân viên)
**Auth:** JWT
**RBAC:** `staff.read`

**Description:** List staff có pagination + filter. Mặc định chỉ trả active records (`deletedAt IS NULL`). Caller có `staff.read` (owner + staff) đều thấy toàn bộ danh sách — không có ownership filter.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `sort` | string | `staffCode:asc` | Whitelist: `staffCode:asc`, `staffCode:desc`, `fullName:asc`, `fullName:desc`. |
| `position` | string | — | Filter theo vị trí: `pt` / `manager` / `receptionist` / `technician`. |
| `status` | string | `active` | `active` = chỉ `deletedAt IS NULL`; `deleted` = chỉ `deletedAt IS NOT NULL`. Xem note WHEN-THEN-ELSE về permission. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1",
      "userId": "5",
      "staffCode": "STF-2026-000001",
      "position": "pt",
      "fullName": "Nguyen Van A",
      "email": "nva@gym.local",
      "phone": "0901234567",
      "status": "active",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 12, "totalPages": 1 }
}
```

**Errors:** `401`, `403` (thiếu `staff.read`).

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN `status` không truyền → default `active` (chỉ trả `deletedAt IS NULL`).
- WHEN `status=deleted` AND caller không có `staff.delete` permission → 403 `FORBIDDEN`. (Chỉ owner mới được xem deleted staff để tránh info leak. Note: permission check thứ hai này không hiển thị trong §2 inventory — implementer cần xử lý runtime.)
- WHEN `sort` truyền giá trị ngoài whitelist → 400 `VALIDATION_ERROR`.
- ELSE query với filter đã apply + pagination.

---

### 4.2 POST /staff

**UC:** UC11 (Owner tạo tài khoản nhân viên mới)
**Auth:** JWT
**RBAC:** `staff.create`

**Description:** Tạo nhân viên mới. Server tạo `users` (status=`pending_verification`) + `staff` trong 1 transaction (BR-S01). `staffCode` tự gen server-side — client không được truyền. Email invite gửi placeholder (v1.0: `console.log`).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | Format email, UNIQUE. |
| `phone` | string | no | ≤ 20 ký tự. |
| `fullName` | string | yes | 1-100 ký tự. |
| `position` | string | yes | Enum: `pt` / `manager` / `receptionist` / `technician`. |
| `groupIds` | string[] | no | Mảng `groupId` (BigInt string). Gán vào group ngay khi tạo. Mỗi groupId phải tồn tại trong `groups`. |

```json
{
  "email": "nva@gym.local",
  "phone": "0901234567",
  "fullName": "Nguyen Van A",
  "position": "pt",
  "groupIds": ["3"]
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "pt",
    "fullName": "Nguyen Van A",
    "email": "nva@gym.local",
    "phone": "0901234567",
    "status": "pending_verification"
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid (email sai format, position không đúng enum, fullName rỗng). |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.create`. |
| 409 | `DUPLICATE_VALUE` | `email` đã tồn tại trong `users` (Prisma P2002). |
| 404 | `NOT_FOUND` | Một hoặc nhiều `groupIds` không tồn tại. |
| 500 | `STAFF_CODE_GENERATION_FAILED` | Server retry auto-gen `staffCode` 5 lần đều conflict (cực hiếm). |

**Audit:** `staff.create` với `after_data` = staff + user object.

**WHEN-THEN-ELSE:**

- WHEN `email` đã tồn tại trong `users` (kể cả soft-deleted) → 409 `DUPLICATE_VALUE`. Email là identity — không tái sử dụng email của user đã xóa.
- WHEN `groupIds` truyền AND một hoặc nhiều groupId không tồn tại → 404 `NOT_FOUND` với `details: { invalidGroupIds }`. Rollback toàn bộ transaction.
- WHEN auto-gen `staffCode` collision sau 5 retry → 500 `STAFF_CODE_GENERATION_FAILED`. (Trong thực tế cực hiếm với không gian `{YYYY}{6-alnum}`.)
- ELSE `$transaction`:
  1. INSERT `users` với `status='pending_verification'`, `passwordHash` sẽ được set khi user complete verification.
  2. INSERT `staff` với `staffCode` auto-gen, `userId` từ bước 1.
  3. Nếu `groupIds` truyền: INSERT `user_groups` rows tương ứng.
  4. Gọi email invite placeholder (console.log OTP v1.0).
  5. Audit `staff.create`.

---

### 4.3 GET /staff/:id

**UC:** UC11 (Xem chi tiết 1 nhân viên)
**Auth:** JWT
**RBAC:** `staff.read`

**Description:** Detail 1 staff bao gồm join `users` (fullName, email, phone, status). Trả cả staff đã deleted (owner cần xem history) — `deletedAt` field phân biệt.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "pt",
    "fullName": "Nguyen Van A",
    "email": "nva@gym.local",
    "phone": "0901234567",
    "status": "active",
    "deletedAt": null
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.read`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN `staffId` không tồn tại → 404 `STAFF_NOT_FOUND`.
- ELSE trả full detail (join `users`), bao gồm cả staff đã soft-deleted (`deletedAt IS NOT NULL`) — owner cần xem history.

---

### 4.4 PATCH /staff/:id

**UC:** UC11 (Cập nhật thông tin nhân viên)
**Auth:** JWT
**RBAC:** `staff.update`

**Description:** Update thông tin staff. Cho phép thay đổi `fullName`, `phone`, `position`. `staffCode` và `userId` không được phép update — nếu client gửi, server ignore (không trả error). Chỉ áp dụng cho active staff (`deletedAt IS NULL`).

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Request body:** Tất cả field optional, ít nhất 1 field phải có.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `fullName` | string | no | 1-100 ký tự. |
| `phone` | string | no | ≤ 20 ký tự. Gửi `null` để xóa. |
| `position` | string | no | Enum: `pt` / `manager` / `receptionist` / `technician`. |

```json
{
  "position": "manager",
  "phone": "0909876543"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "manager",
    "fullName": "Nguyen Van A",
    "email": "nva@gym.local",
    "phone": "0909876543",
    "status": "active",
    "deletedAt": null
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid (position không đúng enum, fullName rỗng, body rỗng). |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.update`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |
| 409 | `STAFF_ALREADY_DELETED` | Staff đã soft-deleted — không update. |

**Audit:** `staff.update` với `before_data` + `after_data` (chỉ các field thay đổi).

**WHEN-THEN-ELSE:**

- WHEN `staffId` không tồn tại → 404 `STAFF_NOT_FOUND`.
- WHEN staff đã `deletedAt IS NOT NULL` → 409 `STAFF_ALREADY_DELETED`.
- WHEN body rỗng hoặc không có field hợp lệ → 400 `VALIDATION_ERROR`.
- WHEN `position` truyền giá trị ngoài enum → 400 `VALIDATION_ERROR`.
- ELSE UPDATE `users.full_name` + `users.phone` (nếu thay đổi) VÀ UPDATE `staff.position` (nếu thay đổi) + audit.

---

### 4.5 DELETE /staff/:id

**UC:** UC11 (Xóa nhân viên)
**Auth:** JWT
**RBAC:** `staff.delete`

**Description:** Soft-delete nhân viên. Server soft-delete cả `staff.deletedAt` VÀ `users.deletedAt` trong 1 transaction (BR-S02). Response 204 No Content. Không khôi phục qua API v1.0. (Note: conventions.md §20 ghi "200 OK" cho soft-delete, nhưng Module-2/6 đã dùng 204 — spec này theo de facto 204.)

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `staff.delete`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |
| 409 | `STAFF_ALREADY_DELETED` | Staff đã soft-deleted — idempotent delete không áp dụng v1.0; trả 409 để client biết state. |

**Audit:** `staff.delete` với `before_data` = staff + user object.

**WHEN-THEN-ELSE:**

- WHEN `staffId` không tồn tại → 404 `STAFF_NOT_FOUND`.
- WHEN staff đã `deletedAt IS NOT NULL` → 409 `STAFF_ALREADY_DELETED`.
- ELSE `$transaction`:
  1. UPDATE `staff.deletedAt = NOW()` WHERE `staffId=:id`.
  2. UPDATE `users.deletedAt = NOW()` WHERE `userId = staff.userId`.
  3. Audit `staff.delete` với `before_data`.

**Note — Dependent resources:** Staff soft-delete không cascade `staff_schedules` (lịch cũ vẫn giữ cho history). `maintenance_logs.reported_by_staff_id` giữ FK tham chiếu (orphan acceptable — log immutable). `training_sessions.trainer_staff_id` giữ FK — staff bị delete nhưng session đã schedule vẫn tồn tại; Module 7 cần xử lý khi query.

---

## 5. Endpoints — Staff Schedule

### 5.1 GET /staff/:id/schedules

**UC:** UC11 (Xem lịch làm việc của nhân viên)
**Auth:** JWT
**RBAC:** `schedule.read`

**Description:** List lịch làm việc của 1 staff cụ thể. Mặc định chỉ trả active rows (`deletedAt IS NULL`). Kết quả sắp xếp `workDate ASC`, sau đó `shift ASC`.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `workDateFrom` | date | — | Filter `workDate >= workDateFrom`. Format `YYYY-MM-DD`. |
| `workDateTo` | date | — | Filter `workDate <= workDateTo`. Format `YYYY-MM-DD`. |
| `shift` | string | — | Filter theo ca: `morning` / `afternoon` / `evening`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "scheduleId": "10",
      "staffId": "1",
      "shift": "morning",
      "workDate": "2026-06-01",
      "deletedAt": null
    },
    {
      "scheduleId": "11",
      "staffId": "1",
      "shift": "afternoon",
      "workDate": "2026-06-01",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 2, "totalPages": 1 }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `workDateFrom` / `workDateTo` sai format, `shift` không đúng enum. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.read`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN `staffId` không tồn tại (kể cả đã soft-deleted) → 404 `STAFF_NOT_FOUND`. Xem schedule của deleted staff không được phép — dữ liệu lịch thuộc về tài khoản đã bị vô hiệu hóa.
- WHEN `workDateFrom` > `workDateTo` → 400 `VALIDATION_ERROR` ("workDateFrom phải nhỏ hơn hoặc bằng workDateTo").
- ELSE query `staff_schedules WHERE staffId=:id AND deletedAt IS NULL` + filter đã apply + sort `workDate ASC, shift ASC`.

---

### 5.2 POST /staff/:id/schedules

**UC:** UC11 (Gán lịch làm việc cho nhân viên)
**Auth:** JWT
**RBAC:** `schedule.manage`

**Description:** Bulk insert lịch làm việc cho 1 staff. Nhận mảng `{shift, workDate}[]`. All-or-nothing: nếu 1 record conflict thì rollback toàn bộ batch (BR-S03). Guard: không tạo schedule cho staff đã soft-deleted (BR-S04).

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `schedules` | array | yes | Mảng ≥ 1 phần tử, tối đa 100 phần tử mỗi request. |
| `schedules[].shift` | string | yes | Enum: `morning` / `afternoon` / `evening`. |
| `schedules[].workDate` | date | yes | Format `YYYY-MM-DD`. Không được là ngày trong quá khứ (< today_vn). |

```json
{
  "schedules": [
    { "shift": "morning", "workDate": "2026-06-01" },
    { "shift": "afternoon", "workDate": "2026-06-01" },
    { "shift": "morning", "workDate": "2026-06-02" }
  ]
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "created": 3
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `schedules` rỗng, vượt 100 phần tử, shift không đúng enum, workDate sai format hoặc trong quá khứ. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.manage`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại hoặc đã soft-deleted (BR-S04). |
| 409 | `SCHEDULE_CONFLICT` | Tồn tại record active với cùng `(staffId, shift, workDate)`. Response body kèm `details: { conflicts: [{shift, workDate}] }`. |

**Audit:** `schedule.assign` với `after_data = { staffId, created: N, schedules: [...] }`.

**WHEN-THEN-ELSE:**

- WHEN `staffId` không tồn tại → 404 `STAFF_NOT_FOUND`.
- WHEN staff có `deletedAt IS NOT NULL` → 404 `STAFF_NOT_FOUND` (cùng code, không phân biệt để tránh info leak về deleted staff với caller có `schedule.manage` nhưng không có `staff.read`).
- WHEN `schedules` array rỗng → 400 `VALIDATION_ERROR`.
- WHEN `schedules` có phần tử trùng nhau trong cùng batch (same `shift` + `workDate`) → 400 `VALIDATION_ERROR` ("Batch chứa entry trùng lặp").
- WHEN bất kỳ `workDate` < today_vn → 400 `VALIDATION_ERROR` ("Không được tạo lịch cho ngày đã qua").
- WHEN tồn tại active row `(staffId, shift, workDate)` trong DB cho ít nhất 1 entry trong batch → rollback toàn bộ, trả 409 `SCHEDULE_CONFLICT` với danh sách conflict.
- ELSE `$transaction`:
  1. SELECT existing active rows khớp `(staffId, shift, workDate)` từ batch — nếu tìm thấy → ROLLBACK + 409.
  2. INSERT tất cả rows trong batch.
  3. Audit `schedule.assign`.

**Note — Conflict detection:** Không có partial unique index native trong Prisma. Service dùng SELECT-then-INSERT trong transaction. Nếu 2 request concurrent cùng insert overlapping batch: race condition vẫn có thể xảy ra dưới READ COMMITTED (vì SELECT và INSERT là 2 statement riêng biệt). Mitigation thực sự là partial unique index (xem §8) — chỉ index này mới ngăn được race hoàn toàn ở DB level. Trước khi có index, document behavior: concurrent conflict có thể bypass SELECT guard và gây duplicate insert.

---

### 5.3 DELETE /staff/:id/schedules/:scheduleId

**UC:** UC11 (Xóa 1 lịch làm việc)
**Auth:** JWT
**RBAC:** `schedule.manage`

**Description:** Soft-delete 1 schedule row cụ thể. Response 204 No Content.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | `staffId` (BigInt string). |
| `scheduleId` | string | `scheduleId` (BigInt string). |

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.manage`. |
| 404 | `STAFF_NOT_FOUND` | `staffId` không tồn tại. |
| 404 | `SCHEDULE_NOT_FOUND` | `scheduleId` không tồn tại, đã soft-deleted, hoặc không thuộc `staffId` trong path. |

**Audit:** `schedule.remove` với `before_data` = schedule object.

**WHEN-THEN-ELSE:**

- WHEN `staffId` không tồn tại → 404 `STAFF_NOT_FOUND`.
- WHEN `scheduleId` không tồn tại OR `scheduleId.staffId != path.staffId` OR `scheduleId.deletedAt IS NOT NULL` → 404 `SCHEDULE_NOT_FOUND`.
- ELSE UPDATE `staff_schedules.deletedAt = NOW()` WHERE `scheduleId=:scheduleId` + audit.

---

## 6. Error Codes Appendix

Standard codes: xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 5:

| Code | HTTP | Trigger |
|---|---|---|
| `STAFF_NOT_FOUND` | 404 | `staffId` không tồn tại trong DB. Lưu ý: GET /staff/:id trả về cả staff đã soft-deleted (owner history) — `STAFF_NOT_FOUND` chỉ fire khi row hoàn toàn không tồn tại trong bảng. Các endpoint mutation (PATCH, DELETE) và schedule endpoints dùng code này khi staff tồn tại nhưng đã soft-deleted (context không cho phép thao tác). |
| `STAFF_ALREADY_DELETED` | 409 | Thao tác PATCH hoặc DELETE lên staff đã soft-deleted. |
| `SCHEDULE_CONFLICT` | 409 | POST /staff/:id/schedules có ít nhất 1 entry `(staffId, shift, workDate)` trùng với row active trong DB. |
| `SCHEDULE_NOT_FOUND` | 404 | `scheduleId` không tồn tại, đã soft-deleted, hoặc không thuộc staffId trong path. |
| `STAFF_CODE_GENERATION_FAILED` | 500 | Server retry auto-gen `staffCode` 5 lần thất bại. Reuse pattern `MEMBER_CODE_GENERATION_FAILED` (conventions.md §12). |

---

## 7. Audit Action Codes Used

Cross-ref với Architecture §4.4.1 và conventions.md §18:

| Code | Architecture status | Trigger |
|---|---|---|
| `staff.create` | Listed (conventions.md §18) | §4.2 POST /staff |
| `staff.update` | Listed (conventions.md §18) | §4.4 PATCH /staff/:id |
| `staff.delete` | Listed (conventions.md §18) | §4.5 DELETE /staff/:id |
| `schedule.assign` | New — chưa có trong conventions.md §18, cần thêm khi implement | §5.2 POST /staff/:id/schedules |
| `schedule.remove` | New — chưa có trong conventions.md §18, cần thêm khi implement | §5.3 DELETE /staff/:id/schedules/:scheduleId |

Lưu ý: `staff.assign-group` (khi POST /staff kèm `groupIds`) dùng code audit từ Module 2 (`group.assign-permission` pattern — xem Architecture §4.4.1). Nếu team quyết định tách riêng, thêm `staff.assign-group` vào Architecture §4.4.1 khi implement.

---

## 8. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| All 8 | NOT IMPLEMENTED | Module 5 scaffold sau khi Module 4 cung cấp transaction patterns + audit interceptor. |

Required Prisma index khi implement (kiểm tra `schema.prisma` trước khi thêm — có thể một số đã có):

- `@@index([staffId])` trên `staff_schedules` — FK side, dùng cho GET /staff/:id/schedules và conflict check. Prisma không tự tạo index cho FK trừ `@unique`.
- `@@index([workDate, shift])` trên `staff_schedules` — composite filter: GET schedule theo date range + shift filter.
- `@@index([userId])` trên `staff` — JOIN `staff → users` khi fetch fullName/email/phone (dùng trong GET /staff list).

Partial unique index (không làm bằng Prisma native — cần raw SQL ngoài `schema.prisma`):

```sql
CREATE UNIQUE INDEX idx_staff_schedule_active
  ON staff_schedules(staff_id, shift, work_date)
  WHERE deleted_at IS NULL;
```

Thêm index này khi có migration runner. Hiện tại service dùng SELECT-then-INSERT guard trong transaction như fallback.

---

## 9. Cross-module Dependencies

- **Module 2 RBAC:** `POST /staff` kèm `groupIds` gọi `UsersAdminController.assignGroup` pattern từ Module 2. Group `pt` là prerequisite để staff có trainer permissions.
- **Module 4 Member-Subscription:** `Member.primaryTrainerId` FK → `Staff`. PT-if-primary ownership check trong Module 4 depend `staff.staffId`. Trainer dashboard hiển thị danh sách member được assign.
- **Module 6 Facility:** `maintenance_logs.reported_by_staff_id` FK → `Staff`. Staff soft-delete không xóa maintenance log (orphan acceptable — log immutable per Module 6 spec).
- **Module 7 Training:** `TrainingSession.trainerStaffId` FK → `Staff`. Session đã tạo không bị cascade delete khi staff bị soft-delete. Module 7 cần handle `trainerStaffId` tham chiếu deleted staff khi query.

---

## 10. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-24 | Lê Thanh An | Initial draft — 8 endpoint chia 2 resource group (Staff CRUD 5 + Staff Schedule 3). UC11 coverage. Soft delete cho cả staff + user trong 1 transaction (BR-S02). Bulk insert schedule all-or-nothing (BR-S03). SELECT-then-INSERT guard cho schedule conflict. Required Prisma index + partial unique SQL index defer khi implement. |
