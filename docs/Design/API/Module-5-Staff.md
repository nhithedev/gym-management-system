# Module 5 — Staff API (Staff / Staff Schedule / Staff Attendance)

| Field | Value |
|---|---|
| Document ID | GMS-API-M5-001 |
| Version | 1.1.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-24) |
| Reviewers | TBD |
| Last Updated | 2026-06-19 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-2-RBAC.md`](./Module-2-RBAC.md), [`Architecture.md §4`](../Architecture.md), [`Database.md §staff, staff_schedules`](../Database.md), [`SRS_VI.md UC11`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 5 đặc tả endpoint quản lý nhân viên: thông tin staff (`staff`, `users`), lịch làm việc (`staff_schedules`), và chấm công (`staff_attendance_logs`). Bao trùm UC11 (Quản lý nhân viên và lịch làm việc).

`staff` áp dụng **soft delete** (Database.md "Soft Delete Convention"). Khi xóa staff, đồng thời soft-delete bản ghi `users` tương ứng trong 1 transaction (BR-S02). `staff_schedules` cũng soft delete — rows được tạo (POST) và xóa mềm (DELETE).

In-scope: 14 endpoint chia 3 resource group (Staff Management 7 + Staff Schedule 4 + Staff Attendance 3).

Out-of-scope:

- Phân quyền group cho staff (Module 2 RBAC xử lý).
- Trainer-specific features (assign member, training session) — thuộc Module 7 Training.
- Nghỉ phép / leave management — defer v1.1.
- Notification khi tạo tài khoản (email invite thực) — v1.0 dùng `console.log` placeholder.

## 2. Endpoint Inventory

### Staff Management

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/staff/me` | UC11 | JWT | — (self-service) | NEW |
| 2 | GET | `/staff` | UC11 | JWT | `staff.read` | NEW |
| 3 | POST | `/staff` | UC11 | JWT | `staff.create` | NEW |
| 4 | GET | `/staff/trainers` | UC11 | JWT | — (no extra permission) | NEW |
| 5 | GET | `/staff/:id` | UC11 | JWT | `staff.read` | NEW |
| 6 | PATCH | `/staff/:id` | UC11 | JWT | `staff.update` | NEW |
| 7 | DELETE | `/staff/:id` | UC11 | JWT | `staff.delete` | NEW |

### Staff Schedule

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 8 | GET | `/staff/schedules/range` | UC11 | JWT | `schedule.read` | NEW |
| 9 | GET | `/staff/:id/schedules` | UC11 | JWT | `schedule.read` | NEW |
| 10 | POST | `/staff/:id/schedules` | UC11 | JWT | `schedule.manage` | NEW |
| 11 | DELETE | `/staff/:id/schedules/:scheduleId` | UC11 | JWT | `schedule.manage` | NEW |

### Staff Attendance

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 12 | POST | `/staff/me/attendance/check-in` | UC11 | JWT | — (self-service) | NEW |
| 13 | POST | `/staff/me/attendance/check-out` | UC11 | JWT | — (self-service) | NEW |
| 14 | GET | `/staff/me/attendance` | UC11 | JWT | — (self-service) | NEW |

Tổng: 14 endpoint.

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
| `position` | string | NOT NULL | Enum: `owner` / `staff` / `trainer` / `member`. |
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

### 3.5 `staff_attendance_logs`

| Field | Type | Constraint | Note |
|---|---|---|---|
| `logId` | BigInt (string in JSON) | PK | Auto-increment. |
| `staffId` | BigInt | FK → `staff.staff_id` | NOT NULL. |
| `checkIn` | DateTime | NOT NULL | UTC ISO 8601. |
| `checkOut` | DateTime? | NULL | NULL = phiên đang mở. |
| `durationMinutes` | int? | Computed | Tính trong service: `(checkOut - checkIn) / 60000`. NULL nếu chưa check-out. |

---

## 4. Endpoints — Staff Management

### 4.1 GET /staff/me

**UC:** UC11 (Staff xem profile của chính mình)
**Auth:** JWT
**RBAC:** Không cần thêm permission — `staffId` lấy từ JWT payload.

**Description:** Trả thông tin staff của user hiện tại. Dùng `user.staffId` từ JWT; không nhận path param. Nếu user không có staff profile (không phải staff account) → 400 `STAFF_PROFILE_MISSING`.

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "staffId": "1",
    "userId": "5",
    "staffCode": "STF-2026-000001",
    "position": "staff",
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
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId` (không phải staff account). |
| 401 | `UNAUTHORIZED` | — |

**WHEN-THEN-ELSE:**

- WHEN `user.staffId` null hoặc undefined trong JWT payload → 400 `STAFF_PROFILE_MISSING`.
- ELSE gọi `StaffService.get(user.staffId)` → trả staff detail.

---

### 4.2 GET /staff

**UC:** UC11 (Owner/Staff xem danh sách nhân viên)
**Auth:** JWT
**RBAC:** `staff.read`

**Description:** List staff có pagination + filter. Mặc định chỉ trả active records (`deletedAt IS NULL`). Caller có `staff.read` (owner + staff) đều thấy toàn bộ danh sách — không có ownership filter.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `sort` | string | `staff_code:asc` | Whitelist: `staffCode:asc`, `staffCode:desc`, `fullName:asc`, `fullName:desc`. |
| `position` | string | — | Filter theo vị trí: `owner` / `staff` / `trainer` / `member`. |
| `status` | string | `active` | `active` = chỉ `deletedAt IS NULL`; `deleted` = chỉ `deletedAt IS NOT NULL`. Chỉ owner mới được dùng `status=deleted`. |
| `search` | string | — | Tìm kiếm theo `staffCode`, `fullName`, hoặc `email` (case-insensitive contains). |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1",
      "userId": "5",
      "staffCode": "STF-2026-000001",
      "position": "staff",
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
- WHEN `status=deleted` AND caller không phải `owner` role → 400 `FORBIDDEN`. (Owner-only để tránh info leak về deleted staff.)
- WHEN `sort` truyền giá trị ngoài whitelist → 400 `VALIDATION_ERROR`.
- ELSE query với filter đã apply + pagination.

---

### 4.3 POST /staff

**UC:** UC11 (Owner tạo tài khoản nhân viên mới)
**Auth:** JWT
**RBAC:** `staff.create`

**Description:** Tạo nhân viên mới. Server tạo `users` (status=`pending_verification`) + `staff` trong 1 transaction (BR-S01). `staffCode` tự gen server-side — client không được truyền. Email invite gửi placeholder (v1.0: `console.log`).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | Format email, UNIQUE. |
| `phone` | string | no | ≤ 20 ký tự. |
| `fullName` | string | yes | 2-200 ký tự. |
| `position` | string | yes | Enum: `owner` / `staff` / `trainer` / `member`. |
| `groupIds` | string[] | no | Mảng `groupId` (BigInt string). Gán vào group ngay khi tạo. Mỗi groupId phải tồn tại trong `groups`. |

```json
{
  "email": "nva@gym.local",
  "phone": "0901234567",
  "fullName": "Nguyen Van A",
  "position": "staff",
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
    "position": "staff",
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

### 4.4 GET /staff/trainers

**UC:** UC11 (Lấy danh sách trainer/PT để assign cho member)
**Auth:** JWT
**RBAC:** Không cần thêm permission — không có `@RequirePermission` trên endpoint này.

**Description:** Trả danh sách staff active có `position` là `trainer` hoặc `pt`. Dùng để member/staff chọn trainer khi setup subscription. Không có pagination — trả toàn bộ danh sách, sắp xếp `staffCode ASC`.

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "staffId": "2",
      "fullName": "Tran Thi B",
      "position": "trainer"
    },
    {
      "staffId": "3",
      "fullName": "Le Van C",
      "position": "pt"
    }
  ]
}
```

**Note:** Response chỉ trả 3 fields (`staffId`, `fullName`, `position`) — không trả email/phone/staffCode. Đây là intentional minimal response cho use case chọn trainer.

**Errors:** `401` (JWT bắt buộc — controller có `@UseGuards(PermissionsGuard)` toàn bộ).

**WHEN-THEN-ELSE:**

- WHEN JWT thiếu hoặc invalid → 401.
- ELSE query `staff WHERE deletedAt IS NULL AND position IN ('trainer', 'pt')` → map sang `{staffId, fullName, position}`.

---

### 4.5 GET /staff/:id

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
    "position": "staff",
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

### 4.6 PATCH /staff/:id

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
| `fullName` | string | no | 2-200 ký tự. |
| `phone` | string | no | ≤ 20 ký tự. Gửi `null` để xóa. |
| `position` | string | no | Enum: `owner` / `staff` / `trainer` / `member`. |

```json
{
  "position": "trainer",
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
    "position": "trainer",
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

### 4.7 DELETE /staff/:id

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

### 5.1 GET /staff/schedules/range

**UC:** UC11 (Xem lịch làm việc của tất cả staff trong khoảng thời gian)
**Auth:** JWT
**RBAC:** `schedule.read`

**Description:** Trả lịch làm việc của toàn bộ staff (active, `position='staff'`) trong khoảng `from`–`to`. Query params `from` và `to` là bắt buộc. Kết quả sắp xếp `workDate ASC`, sau đó `shift ASC`. Mỗi entry có thêm `staffCode` và `fullName` để dễ hiển thị.

**Query params:**

| Param | Type | Required | Mô tả |
|---|---|---|---|
| `from` | date | yes | `workDate >= from`. Format `YYYY-MM-DD`. |
| `to` | date | yes | `workDate <= to`. Format `YYYY-MM-DD`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "scheduleId": "10",
      "staffId": "1",
      "staffCode": "STF-2026-000001",
      "fullName": "Nguyen Van A",
      "shift": "morning",
      "workDate": "2026-06-01"
    },
    {
      "scheduleId": "11",
      "staffId": "2",
      "staffCode": "STF-2026-000002",
      "fullName": "Tran Thi B",
      "shift": "afternoon",
      "workDate": "2026-06-01"
    }
  ]
}
```

**Note:** Endpoint chỉ trả schedule của staff có `position='staff'` — không bao gồm trainer/pt/owner/member. `deletedAt` không trả trong response vì chỉ query active rows.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `from` hoặc `to` sai format hoặc thiếu. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `schedule.read`. |

**WHEN-THEN-ELSE:**

- WHEN `from` hoặc `to` thiếu hoặc sai format → service ném ParseError (thiếu param ở query string → NestJS sẽ pass string rỗng, service `parseDateOnly` sẽ throw nếu invalid).
- ELSE query `staff_schedules WHERE workDate BETWEEN from AND to AND deletedAt IS NULL AND staff.deletedAt IS NULL AND staff.position = 'staff'` → trả kèm `staffCode` + `fullName`.

---

### 5.2 GET /staff/:id/schedules

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

### 5.3 POST /staff/:id/schedules

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
| `schedules[].shift` | StaffShift | yes | Enum: `morning` / `afternoon` / `evening`. |
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

### 5.4 DELETE /staff/:id/schedules/:scheduleId

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

## 6. Endpoints — Staff Attendance

### 6.1 POST /staff/me/attendance/check-in

**UC:** UC11 (Staff tự chấm công vào)
**Auth:** JWT
**RBAC:** Không cần thêm permission — `staffId` lấy từ JWT payload.

**Description:** Mở phiên chấm công mới cho staff hiện tại. Mỗi staff chỉ có 1 phiên mở tại 1 thời điểm. Nếu có phiên mở từ ngày trước (quên chấm ra), phiên đó sẽ bị xóa (ngày công không hợp lệ) và phiên mới được tạo.

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "logId": "42",
    "staffId": "1",
    "checkIn": "2026-06-19T08:05:00.000Z",
    "checkOut": null,
    "durationMinutes": null
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId`. |
| 401 | `UNAUTHORIZED` | — |
| 409 | `ALREADY_CHECKED_IN` | Đã có phiên mở từ hôm nay — phải check-out trước. |

**WHEN-THEN-ELSE:**

- WHEN `user.staffId` null → 400 `STAFF_PROFILE_MISSING`.
- WHEN tồn tại phiên mở (`checkOut IS NULL`) từ hôm nay (cùng ngày VN) → 409 `ALREADY_CHECKED_IN`.
- WHEN tồn tại phiên mở từ ngày khác (quên chấm ra) → DELETE phiên đó (ngày công không hợp lệ), tạo phiên mới.
- ELSE INSERT `staff_attendance_logs { staffId, checkIn: NOW() }` → trả log mới.

---

### 6.2 POST /staff/me/attendance/check-out

**UC:** UC11 (Staff tự chấm công ra)
**Auth:** JWT
**RBAC:** Không cần thêm permission — `staffId` lấy từ JWT payload.

**Description:** Đóng phiên chấm công đang mở của staff hiện tại. Nếu check-out xảy ra vào ngày khác với check-in (qua đêm), phiên bị xóa và trả 409 `ATTENDANCE_VOIDED_DIFFERENT_DAY`.

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "logId": "42",
    "staffId": "1",
    "checkIn": "2026-06-19T08:05:00.000Z",
    "checkOut": "2026-06-19T17:10:00.000Z",
    "durationMinutes": 545
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId`. |
| 401 | `UNAUTHORIZED` | — |
| 409 | `NOT_CHECKED_IN` | Không có phiên mở — phải check-in trước. |
| 409 | `ATTENDANCE_VOIDED_DIFFERENT_DAY` | Phiên mở từ ngày khác; phiên bị xóa, cần check-in lại hôm nay. |

**WHEN-THEN-ELSE:**

- WHEN `user.staffId` null → 400 `STAFF_PROFILE_MISSING`.
- WHEN không có phiên nào với `checkOut IS NULL` → 409 `NOT_CHECKED_IN`.
- WHEN phiên mở từ ngày VN khác với hôm nay → DELETE phiên, 409 `ATTENDANCE_VOIDED_DIFFERENT_DAY`.
- ELSE UPDATE `staff_attendance_logs.checkOut = NOW()` WHERE `logId = open.logId` → trả log đã cập nhật với `durationMinutes` đã tính.

---

### 6.3 GET /staff/me/attendance

**UC:** UC11 (Staff xem lịch sử chấm công của chính mình)
**Auth:** JWT
**RBAC:** Không cần thêm permission — `staffId` lấy từ JWT payload.

**Description:** Lịch sử chấm công của staff hiện tại. Mặc định trả tháng hiện tại (từ ngày 1 đến cuối tháng). Sắp xếp `checkIn DESC`. Không soft-delete — records attendance log là immutable (trừ trường hợp xóa khi voided cross-day).

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `from` | datetime | đầu tháng hiện tại | Filter `checkIn >= from`. ISO 8601 date string. |
| `to` | datetime | cuối tháng hiện tại | Filter `checkIn <= to`. ISO 8601 date string. |
| `pageSize` | int | 100 | Max 200. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "logId": "42",
        "staffId": "1",
        "checkIn": "2026-06-19T08:05:00.000Z",
        "checkOut": "2026-06-19T17:10:00.000Z",
        "durationMinutes": 545
      },
      {
        "logId": "41",
        "staffId": "1",
        "checkIn": "2026-06-18T08:00:00.000Z",
        "checkOut": "2026-06-18T17:00:00.000Z",
        "durationMinutes": 540
      }
    ],
    "total": 19
  }
}
```

**Note:** Response shape là `{ data: { data: [], total: N } }` — service trả object `{ data: [], total }` bọc trong envelope `{ success, data }`. Đây là flat object, không có `meta` pagination vì `pageSize` là hard cap (không phải cursor/offset pagination).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `STAFF_PROFILE_MISSING` | JWT hợp lệ nhưng user không có `staffId`. |
| 400 | `VALIDATION_ERROR` | `from` / `to` sai format date string. |
| 401 | `UNAUTHORIZED` | — |

**WHEN-THEN-ELSE:**

- WHEN `user.staffId` null → 400 `STAFF_PROFILE_MISSING`.
- WHEN `from` thiếu → default đầu tháng hiện tại. WHEN `to` thiếu → default cuối tháng hiện tại.
- WHEN `pageSize` > 200 → service clamp về 200.
- ELSE query `staff_attendance_logs WHERE staffId=:staffId AND checkIn BETWEEN from AND to ORDER BY checkIn DESC LIMIT pageSize`.

---

## 7. Error Codes Appendix

Standard codes: xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 5:

| Code | HTTP | Trigger |
|---|---|---|
| `STAFF_NOT_FOUND` | 404 | `staffId` không tồn tại trong DB. Lưu ý: GET /staff/:id trả về cả staff đã soft-deleted (owner history) — `STAFF_NOT_FOUND` chỉ fire khi row hoàn toàn không tồn tại trong bảng. Các endpoint mutation (PATCH, DELETE) và schedule endpoints dùng code này khi staff tồn tại nhưng đã soft-deleted (context không cho phép thao tác). |
| `STAFF_ALREADY_DELETED` | 409 | Thao tác PATCH hoặc DELETE lên staff đã soft-deleted. |
| `STAFF_PROFILE_MISSING` | 400 | JWT hợp lệ nhưng user không có staff profile (`staffId` null). Áp dụng cho GET /staff/me và attendance endpoints. |
| `SCHEDULE_CONFLICT` | 409 | POST /staff/:id/schedules có ít nhất 1 entry `(staffId, shift, workDate)` trùng với row active trong DB. |
| `SCHEDULE_NOT_FOUND` | 404 | `scheduleId` không tồn tại, đã soft-deleted, hoặc không thuộc staffId trong path. |
| `STAFF_CODE_GENERATION_FAILED` | 500 | Server retry auto-gen `staffCode` 5 lần thất bại. Reuse pattern `MEMBER_CODE_GENERATION_FAILED` (conventions.md §12). |
| `ALREADY_CHECKED_IN` | 409 | POST /staff/me/attendance/check-in khi đã có phiên mở từ hôm nay. |
| `NOT_CHECKED_IN` | 409 | POST /staff/me/attendance/check-out khi không có phiên mở. |
| `ATTENDANCE_VOIDED_DIFFERENT_DAY` | 409 | POST /staff/me/attendance/check-out khi check-in từ ngày khác; phiên bị xóa. |

---

## 8. Audit Action Codes Used

Cross-ref với Architecture §4.4.1 và conventions.md §18:

| Code | Architecture status | Trigger |
|---|---|---|
| `staff.create` | Listed (conventions.md §18) | §4.3 POST /staff |
| `staff.update` | Listed (conventions.md §18) | §4.6 PATCH /staff/:id |
| `staff.delete` | Listed (conventions.md §18) | §4.7 DELETE /staff/:id |
| `schedule.assign` | New — chưa có trong conventions.md §18, cần thêm khi implement | §5.3 POST /staff/:id/schedules |
| `schedule.remove` | New — chưa có trong conventions.md §18, cần thêm khi implement | §5.4 DELETE /staff/:id/schedules/:scheduleId |

Lưu ý: `staff.assign-group` (khi POST /staff kèm `groupIds`) dùng code audit từ Module 2 (`group.assign-permission` pattern — xem Architecture §4.4.1). Nếu team quyết định tách riêng, thêm `staff.assign-group` vào Architecture §4.4.1 khi implement.

Attendance endpoints không có audit log — chỉ tạo/cập nhật bản ghi `staff_attendance_logs` trực tiếp.

---

## 9. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| GET /staff/me | IMPLEMENTED | — |
| GET /staff | IMPLEMENTED | — |
| POST /staff | IMPLEMENTED | — |
| GET /staff/trainers | IMPLEMENTED | — |
| GET /staff/schedules/range | IMPLEMENTED | — |
| GET /staff/:id | IMPLEMENTED | — |
| PATCH /staff/:id | IMPLEMENTED | — |
| DELETE /staff/:id | IMPLEMENTED | — |
| GET /staff/:id/schedules | IMPLEMENTED | — |
| POST /staff/:id/schedules | IMPLEMENTED | — |
| DELETE /staff/:id/schedules/:scheduleId | IMPLEMENTED | — |
| POST /staff/me/attendance/check-in | IMPLEMENTED | — |
| POST /staff/me/attendance/check-out | IMPLEMENTED | — |
| GET /staff/me/attendance | IMPLEMENTED | — |

Required Prisma index khi implement (kiểm tra `schema.prisma` trước khi thêm — có thể một số đã có):

- `@@index([staffId])` trên `staff_schedules` — FK side, dùng cho GET /staff/:id/schedules và conflict check. Prisma không tự tạo index cho FK trừ `@unique`.
- `@@index([workDate, shift])` trên `staff_schedules` — composite filter: GET schedule theo date range + shift filter.
- `@@index([userId])` trên `staff` — JOIN `staff → users` khi fetch fullName/email/phone (dùng trong GET /staff list).
- `@@index([staffId, checkIn])` trên `staff_attendance_logs` — filter theo staffId + date range cho GET /staff/me/attendance.

Partial unique index (không làm bằng Prisma native — cần raw SQL ngoài `schema.prisma`):

```sql
CREATE UNIQUE INDEX idx_staff_schedule_active
  ON staff_schedules(staff_id, shift, work_date)
  WHERE deleted_at IS NULL;
```

Thêm index này khi có migration runner. Hiện tại service dùng SELECT-then-INSERT guard trong transaction như fallback.

---

## 10. Cross-module Dependencies

- **Module 2 RBAC:** `POST /staff` kèm `groupIds` gọi `UsersAdminController.assignGroup` pattern từ Module 2. Group `pt` là prerequisite để staff có trainer permissions.
- **Module 4 Member-Subscription:** `Member.primaryTrainerId` FK → `Staff`. PT-if-primary ownership check trong Module 4 depend `staff.staffId`. Trainer dashboard hiển thị danh sách member được assign.
- **Module 6 Facility:** `maintenance_logs.reported_by_staff_id` FK → `Staff`. Staff soft-delete không xóa maintenance log (orphan acceptable — log immutable per Module 6 spec).
- **Module 7 Training:** `TrainingSession.trainerStaffId` FK → `Staff`. Session đã tạo không bị cascade delete khi staff bị soft-delete. Module 7 cần handle `trainerStaffId` tham chiếu deleted staff khi query.

---

## 11. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-24 | Lê Thanh An | Initial draft — 8 endpoint chia 2 resource group (Staff CRUD 5 + Staff Schedule 3). UC11 coverage. Soft delete cho cả staff + user trong 1 transaction (BR-S02). Bulk insert schedule all-or-nothing (BR-S03). SELECT-then-INSERT guard cho schedule conflict. Required Prisma index + partial unique SQL index defer khi implement. |
| 1.1.0 | 2026-06-19 | Lê Thanh An | Sync với controller thực tế — thêm 6 endpoint thiếu: GET /staff/me, GET /staff/trainers, GET /staff/schedules/range, POST /staff/me/attendance/check-in, POST /staff/me/attendance/check-out, GET /staff/me/attendance. Tổng lên 14 endpoint, tái cấu trúc thành 3 sub-sections (Staff Management, Schedule, Attendance). Sửa `position` enum (owner/staff/trainer/member, không phải pt/manager/receptionist/technician). Sửa `fullName` constraint (2-200 ký tự). Thêm `search` param cho GET /staff. Thêm error codes cho attendance. |
