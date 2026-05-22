# Module 6 — Facility API (Room / Equipment / Maintenance)

| Field | Value |
|---|---|
| Document ID | GMS-API-M6-001 |
| Version | 1.0.3 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-18) |
| Reviewers | TBD |
| Last Updated | 2026-05-22 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-2-RBAC.md`](./Module-2-RBAC.md), [`Architecture.md §4.4`](../Architecture.md), [`Database.md §gym_rooms, equipment, maintenance_logs`](../Database.md), [`SRS_VI.md UC08, UC09`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 6 đặc tả endpoint quản lý cơ sở vật chất: phòng tập (`gym_rooms`), thiết bị (`equipment`), nhật ký bảo trì (`maintenance_logs`). Bao trùm UC08 (Quản lý thông tin phòng tập) + UC09 (Quản lý và Bảo trì thiết bị).

3 bảng này áp dụng **hard delete** (Database.md "Soft Delete Convention" v1.0). `maintenance_logs` immutable cho audit history — chỉ INSERT + UPDATE state, không có DELETE qua API.

In-scope: 13 endpoint chia 3 resource group (Rooms 5 + Equipment 5 + Maintenance 3).

Out-of-scope:

- Cost tracking, parts replaced, preventive maintenance schedule — defer v1.1+ (SRS UC09 Ghi chú v1.0).
- Room booking/reservation flow — thuộc Module 7 Training (`POST /training-sessions` reference `roomId`).
- Equipment usage telemetry, IoT sensor — defer v1.1+.
- Photo upload cho equipment/maintenance — defer khi Module 4 Files endpoint hoàn thành.

## 2. Endpoint Inventory

### Rooms (UC08)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/rooms` | UC08 | JWT | `room.manage` | NEW |
| 2 | GET | `/rooms/:id` | UC08 | JWT | `room.manage` | NEW |
| 3 | POST | `/rooms` | UC08 | JWT | `room.manage` | NEW |
| 4 | PATCH | `/rooms/:id` | UC08 | JWT | `room.manage` | NEW |
| 5 | DELETE | `/rooms/:id` | UC08 (step 3c) | JWT | `room.manage` | NEW |

### Equipment (UC09 CRUD)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 6 | GET | `/equipment` | UC09 | JWT | `equipment.manage` | NEW |
| 7 | GET | `/equipment/:id` | UC09 | JWT | `equipment.manage` | NEW |
| 8 | POST | `/equipment` | UC09 | JWT | `equipment.manage` | NEW |
| 9 | PATCH | `/equipment/:id` | UC09 | JWT | `equipment.manage` | NEW |
| 10 | DELETE | `/equipment/:id` | UC09 (step 4a) | JWT | `equipment.manage` | NEW |

### Maintenance (UC09 báo hỏng + sửa chữa)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 11 | GET | `/equipment/:id/maintenance-logs` | UC09 | JWT | `maintenance.read` | NEW |
| 12 | POST | `/equipment/:id/maintenance-logs` | UC09 (step 4) | JWT | `maintenance.report` | NEW |
| 13 | PATCH | `/maintenance-logs/:id` | UC09 (step 6-7) | JWT | `maintenance.resolve` | NEW |

Tổng: 13 endpoint, 0 implemented.

Permission catalog (`seed.ts` lines 49-53):

- `room.manage`: owner/staff only.
- `equipment.manage`: owner/staff only.
- `maintenance.read`: owner/staff/trainer.
- `maintenance.report`: owner/staff/trainer (báo hỏng — bất kỳ ai phát hiện đều report được).
- `maintenance.resolve`: owner/staff only (technician thuộc role `staff` với `position='technician'` — RBAC qua group `staff`, ownership qua `staff.position` check khi cần granular).

V1.0 KHÔNG có separate `room.read` / `equipment.read` permission code — list/detail dùng cùng `*.manage`. Member không browse rooms/equipment trực tiếp qua API (staff/PT scope).

---

## 3. Data Model

### 3.1 `gym_rooms` (Database.md §gym_rooms)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `roomId` | BigInt (string in JSON) | PK | Auto-increment. |
| `roomCode` | string(30) | UNIQUE | Format `RM-XXX` (3-digit), auto-gen nếu client không truyền. |
| `name` | string(100) | NOT NULL | Vd "Yoga Studio 1". |
| `roomType` | string(50) | NULL | Vd "Yoga", "Fitness", "Cardio", "Group Class". Free-form v1.0, không enum. |
| `capacity` | int | > 0 | Sức chứa tối đa (số người). |
| `description` | string(255) | NULL | Mô tả ngắn. |

Không có `status`, không có `deletedAt` (hard delete). Không có `createdAt`/`updatedAt` v1.0 — Database.md `gym_rooms` không khai báo, chấp nhận trade-off audit qua `audit_logs.action='room.create'`.

### 3.2 `equipment` (Database.md §equipment)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `equipmentId` | BigInt | PK | — |
| `roomId` | BigInt | FK → `gym_rooms.room_id` | NOT NULL. |
| `equipmentCode` | string(30) | UNIQUE | Format `EQ-XXXXXX` (6-digit), auto-gen. |
| `name` | string(100) | NOT NULL | Vd "Treadmill X3 Pro". |
| `importDate` | date | NOT NULL | Ngày nhập kho. |
| `warrantyUntil` | date | NULL | Ngày hết bảo hành. |
| `status` | enum `active` / `broken` / `repairing` / `retired` | NOT NULL, default `active` | State machine — xem §3.4. |

Enum source: `schema.prisma:51-57` `EquipmentStatus`.

### 3.3 `maintenance_logs` (Database.md §maintenance_logs)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `maintenanceId` | BigInt | PK | — |
| `equipmentId` | BigInt | FK → `equipment.equipment_id` | NOT NULL. |
| `reportedByStaffId` | BigInt | FK → `staff.staff_id` | NOT NULL — người báo hỏng. |
| `description` | text | NOT NULL | Mô tả lỗi tự do. |
| `status` | enum `reported` / `repairing` / `resolved` / `failed` | NOT NULL, default `reported` | State machine — xem §3.4. |
| `reportedAt` | timestamp | NOT NULL | Auto khi INSERT. |
| `resolvedAt` | timestamp | NULL | Set khi `status` chuyển `resolved`/`failed`. |

Enum source: `schema.prisma:60-66` `MaintenanceStatus`. Immutable v1.0 — không có DELETE, không UPDATE `description` (chỉ UPDATE `status` + `resolvedAt`).

### 3.4 State Machines

**Equipment lifecycle:**

```text
active ──(report problem)──> broken
broken ──(technician accept)──> repairing
repairing ──(repair success)──> active
repairing ──(repair fail)──> retired
active ──(manual decommission)──> retired  (PATCH /equipment/:id with status='retired')
```

Transitions trigger qua endpoint:

- `active → broken`: implicit khi POST `/equipment/:id/maintenance-logs` với status default `reported`.
- `broken → repairing`: implicit khi PATCH `/maintenance-logs/:id` set `status='repairing'`.
- `repairing → active`: implicit khi PATCH `/maintenance-logs/:id` set `status='resolved'`.
- `repairing → retired`: implicit khi PATCH `/maintenance-logs/:id` set `status='failed'`.
- `* → retired` (manual): PATCH `/equipment/:id` với body `status='retired'`. KHÔNG cho phép chuyển ngược từ `retired` về `active` v1.0.

**Maintenance lifecycle:**

```text
reported ──(technician accept)──> repairing
repairing ──(success)──> resolved (resolvedAt = NOW)
repairing ──(fail)──> failed (resolvedAt = NOW)
```

KHÔNG cho phép skip state (vd `reported → resolved` không qua `repairing`).

---

## 4. Endpoints — Rooms

### 4.1 GET /rooms

**UC:** UC08 (Staff/Owner xem danh sách phòng để gán equipment/session)
**Auth:** JWT
**RBAC:** `room.manage`

**Description:** List room có pagination + filter.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `roomType` | string | — | Filter exact match (vd `Yoga`). |
| `search` | string | — | LIKE `name` hoặc `roomCode`. |
| `sort` | string | `room_code:asc` | `name:asc`, `capacity:desc` thường dùng. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "roomId": "1",
      "roomCode": "RM-001",
      "name": "Yoga Studio 1",
      "roomType": "Yoga",
      "capacity": 20,
      "description": "Tang 2, kinh chong sap"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 8, "totalPages": 1 }
}
```

**Errors:** `401`, `403` (thiếu `room.manage`).

**Audit:** Không log (read-only).

---

### 4.2 GET /rooms/:id

**UC:** UC08
**Auth:** JWT
**RBAC:** `room.manage`

**Description:** Detail 1 room + statistics tóm tắt (count equipment + count training session active dùng phòng này — UI hiển thị "Có thể xóa hay không").

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "roomId": "1",
    "roomCode": "RM-001",
    "name": "Yoga Studio 1",
    "roomType": "Yoga",
    "capacity": 20,
    "description": "...",
    "stats": {
      "equipmentCount": 12,
      "activeSessionsCount": 3
    }
  }
}
```

**Errors:** `401`, `403`, `404`.

---

### 4.3 POST /rooms

**UC:** UC08 (step 3 thêm mới)
**Auth:** JWT
**RBAC:** `room.manage`

**Description:** Tạo room mới. Auto-gen `roomCode` nếu client không truyền.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `roomCode` | string | no | UNIQUE, `^RM-[0-9]{3}$`. Server auto-gen nếu omit. |
| `name` | string | yes | 1-100 ký tự. |
| `roomType` | string | no | ≤ 50 ký tự. |
| `capacity` | int | yes | Range 1-1000. |
| `description` | string | no | ≤ 255 ký tự. |

```json
{
  "name": "Yoga Studio 1",
  "roomType": "Yoga",
  "capacity": 20,
  "description": "Tang 2"
}
```

**Response 201 Created:** Room detail (không có `stats`).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid, capacity ≤ 0, roomCode format sai. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `room.manage`. |
| 409 | `DUPLICATE_VALUE` | `roomCode` đã tồn tại (P2002). |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Server retry auto-gen `roomCode` 10 lần đều conflict (cực hiếm — 999 max RM codes phải đầy mới). |

**Audit:** `room.create` với `after_data` = room object. (Architecture v1.1.6 chưa list — xem §6 drift.)

**WHEN-THEN-ELSE:**

- WHEN `roomCode` không truyền → server gen `RM-XXX` từ sequence (next available 3-digit). Retry tới 10 lần nếu UNIQUE conflict.
- WHEN `capacity` ≤ 0 hoặc > 1000 → 400 `VALIDATION_ERROR`.
- WHEN `roomCode` truyền format sai (không match `^RM-[0-9]{3}$`) → 400 `VALIDATION_ERROR`.
- ELSE INSERT + audit.

---

### 4.4 PATCH /rooms/:id

**UC:** UC08 (step 3b cập nhật)
**Auth:** JWT
**RBAC:** `room.manage`

**Description:** Update room metadata. Cho phép thay đổi mọi field. Lưu ý: thay đổi `capacity` không validate so với số người đang đặt session — staff chịu trách nhiệm.

**Request body:** Tất cả field optional, ít nhất 1 field phải có.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `roomCode` | string | no | UNIQUE format `^RM-[0-9]{3}$`. |
| `name` | string | no | 1-100. |
| `roomType` | string | no | ≤ 50. |
| `capacity` | int | no | Range 1-1000. |
| `description` | string | no | ≤ 255. |

**Response 200 OK:** Room detail.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Format invalid. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Room không tồn tại. |
| 409 | `DUPLICATE_VALUE` | `roomCode` collision. |

**Audit:** `room.update` với `before_data` + `after_data`. (Drift — xem §6.)

---

### 4.5 DELETE /rooms/:id

**UC:** UC08 (step 3c)
**Auth:** JWT
**RBAC:** `room.manage`

**Description:** **Hard delete** room. KHÔNG khôi phục được.

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Room không tồn tại. |
| 409 | `ROOM_HAS_EQUIPMENT` | Còn `equipment.room_id` tham chiếu room này. |
| 409 | `ROOM_HAS_ACTIVE_SESSIONS` | Còn `training_sessions` với `room_id=:id` AND `end_time > NOW()` AND `deleted_at IS NULL`. |

**Audit:** `room.delete` với `before_data` = room object. (Drift — xem §6.)

**WHEN-THEN-ELSE:**

- WHEN `EXISTS equipment WHERE room_id=:id` → 409 `ROOM_HAS_EQUIPMENT` với `details: { equipmentCount }`. Client phải reassign hoặc xóa equipment trước.
- WHEN `EXISTS training_sessions WHERE room_id=:id AND end_time > NOW() AND deleted_at IS NULL` → 409 `ROOM_HAS_ACTIVE_SESSIONS` với `details: { upcomingSessionCount }`. Client phải reschedule hoặc cancel session trước.
- ELSE DELETE + audit. SRS UC08 step 3c yêu cầu xác nhận double ở UI layer (frontend show modal "Xác nhận xóa vĩnh viễn?"), backend không enforce double-confirm.

---

## 5. Endpoints — Equipment

### 5.1 GET /equipment

**UC:** UC09 (step 2 list thiết bị)
**Auth:** JWT
**RBAC:** `equipment.manage`

**Description:** List equipment có pagination + filter theo room/status.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | — |
| `pageSize` | int | 20 | Max 100. |
| `roomId` | string | — | Filter equipment trong room cụ thể. |
| `status` | enum | — | `active` / `broken` / `repairing` / `retired`. |
| `search` | string | — | LIKE `name` hoặc `equipmentCode`. |
| `warrantyExpiring` | boolean | false | true → filter `warranty_until <= today_vn + 30 days` (dashboard cảnh báo hết bảo hành). |
| `sort` | string | `equipment_code:asc` | `import_date:desc`, `warranty_until:asc` thường dùng. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "equipmentId": "1",
      "equipmentCode": "EQ-000001",
      "roomId": "1",
      "name": "Treadmill X3 Pro",
      "importDate": "2025-06-15",
      "warrantyUntil": "2027-06-15",
      "status": "active"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 47, "totalPages": 3 }
}
```

**Errors:** `401`, `403`.

**Audit:** Không log (read-only).

---

### 5.2 GET /equipment/:id

**UC:** UC09
**Auth:** JWT
**RBAC:** `equipment.manage`

**Description:** Detail 1 equipment + stats maintenance (latest open log nếu có).

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "equipmentId": "1",
    "equipmentCode": "EQ-000001",
    "roomId": "1",
    "room": { "roomCode": "RM-001", "name": "Cardio Zone" },
    "name": "Treadmill X3 Pro",
    "importDate": "2025-06-15",
    "warrantyUntil": "2027-06-15",
    "status": "active",
    "openMaintenance": null,
    "stats": {
      "totalMaintenanceLogs": 3,
      "lastResolvedAt": "2026-03-10T14:00:00.000Z"
    }
  }
}
```

`openMaintenance` chứa maintenance log gần nhất với `status IN ('reported', 'repairing')` nếu có, NULL nếu không. Dùng cho UI hiển thị "Đang sửa".

**Errors:** `401`, `403`, `404`.

---

### 5.3 POST /equipment

**UC:** UC09 (step 3 thêm mới)
**Auth:** JWT
**RBAC:** `equipment.manage`

**Description:** Tạo equipment mới. Auto-gen `equipmentCode`. Default `status='active'`.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `equipmentCode` | string | no | UNIQUE, `^EQ-[0-9]{6}$`. Auto-gen nếu omit. |
| `roomId` | string | yes | FK → `gym_rooms`. Phải tồn tại. |
| `name` | string | yes | 1-100. |
| `importDate` | date | yes | Format `YYYY-MM-DD`. Không được tương lai > today_vn. |
| `warrantyUntil` | date | no | Format `YYYY-MM-DD`. Phải >= `importDate` nếu có. |

```json
{
  "roomId": "1",
  "name": "Treadmill X3 Pro",
  "importDate": "2025-06-15",
  "warrantyUntil": "2027-06-15"
}
```

**Response 201 Created:** Equipment detail (không có `stats`).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Format invalid, `warrantyUntil < importDate`, `importDate > today_vn`. |
| 400 | `FK_CONSTRAINT` | `roomId` không tồn tại. |
| 401/403 | — | — |
| 409 | `DUPLICATE_VALUE` | `equipmentCode` đã tồn tại. |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry auto-gen thất bại. |

**Audit:** `equipment.create` (đã có Architecture §4.4.1).

**WHEN-THEN-ELSE:**

- WHEN `warrantyUntil` truyền AND `warrantyUntil < importDate` → 400 `VALIDATION_ERROR`.
- WHEN `importDate > today_vn` → 400 `VALIDATION_ERROR` ("Ngày nhập không được tương lai").
- WHEN `roomId` không tồn tại → 400 `FK_CONSTRAINT`.
- ELSE INSERT với `status='active'` + audit.

---

### 5.4 PATCH /equipment/:id

**UC:** UC09 (step 3 cập nhật)
**Auth:** JWT
**RBAC:** `equipment.manage`

**Description:** Update equipment metadata + manual status change. Status change auto-trigger qua maintenance flow trong hầu hết trường hợp — endpoint này dùng cho rare case (vd staff manually retire equipment không qua maintenance).

**Request body:** Tất cả field optional, ít nhất 1 field.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `roomId` | string | no | FK. |
| `name` | string | no | 1-100. |
| `importDate` | date | no | — |
| `warrantyUntil` | date | no | >= `importDate`. |
| `status` | enum | no | `active`/`broken`/`repairing`/`retired`. **Restrictions:** xem WHEN-THEN-ELSE. |

**Response 200 OK:** Equipment detail.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | — |
| 400 | `FK_CONSTRAINT` | `roomId` không tồn tại. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Equipment không tồn tại. |
| 409 | `EQUIPMENT_HAS_OPEN_MAINTENANCE` | Body có `status` change AND có `maintenance_logs` với `status IN ('reported','repairing')`. |
| 409 | `EQUIPMENT_INVALID_STATE_TRANSITION` | Status transition không hợp lệ (vd `retired → active`). |
| 409 | `USE_MAINTENANCE_LOG_ENDPOINT` | Body có `status='broken'` — dùng POST `/equipment/:id/maintenance-logs` thay thế. |

**Audit:** `equipment.update` với `before_data` + `after_data`. (Drift — xem §6, code mới.)

**WHEN-THEN-ELSE:**

- WHEN body có `status` AND `EXISTS maintenance_logs WHERE equipment_id=:id AND status IN ('reported','repairing')` → 409 `EQUIPMENT_HAS_OPEN_MAINTENANCE`. Client phải close maintenance log trước (PATCH `/maintenance-logs/:id` với `status='resolved'`/`'failed'`).
- WHEN body có `status='active'` AND current status = `retired` → 409 `EQUIPMENT_INVALID_STATE_TRANSITION` ("Không thể khôi phục thiết bị đã thanh lý").
- WHEN body có `status='broken'` → 409 `USE_MAINTENANCE_LOG_ENDPOINT`. Transition `active → broken` chỉ được trigger qua POST `/equipment/:id/maintenance-logs`. PATCH trực tiếp bị chặn để tránh dead state (equipment broken mà không có maintenance log tracking).
- WHEN body có `warrantyUntil` change AND new value < `importDate` → 400 `VALIDATION_ERROR`.
- ELSE UPDATE + audit.

---

### 5.5 DELETE /equipment/:id

**UC:** UC09 (step 4a thanh lý)
**Auth:** JWT
**RBAC:** `equipment.manage`

**Description:** **Hard delete** equipment. SRS UC09 step 4a khuyến nghị dùng `status='retired'` thay vì delete — giữ history cho audit. Delete chỉ dùng khi import nhầm.

**Query params:**

| Param | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `force` | boolean | no | false | Cho phép delete kèm cascade xóa `maintenance_logs` đã resolved/failed (history sẽ mất vĩnh viễn). Chỉ role `owner`. Non-owner gửi `?force=true` → 403 `FORCE_DELETE_REQUIRES_OWNER`. |

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401/403 | — | — |
| 403 | `FORCE_DELETE_REQUIRES_OWNER` | `?force=true` nhưng `jwt.role != 'owner'`. |
| 404 | `NOT_FOUND` | Equipment không tồn tại. |
| 409 | `EQUIPMENT_HAS_OPEN_MAINTENANCE` | Có `maintenance_logs` với `status IN ('reported','repairing')`. |
| 409 | `EQUIPMENT_HAS_RESOLVED_MAINTENANCE` | Có `maintenance_logs` đã `resolved`/`failed` (history sẽ mất nếu delete). Khuyến nghị dùng `status='retired'`. |

**Audit:** `equipment.delete` (đã có Architecture §4.4.1) với `before_data` = equipment object.

**WHEN-THEN-ELSE:**

- WHEN `EXISTS maintenance_logs WHERE equipment_id=:id AND status IN ('reported','repairing')` → 409 `EQUIPMENT_HAS_OPEN_MAINTENANCE`.
- WHEN `?force=true AND jwt.role != 'owner'` → 403 `FORCE_DELETE_REQUIRES_OWNER`.
- WHEN `EXISTS maintenance_logs WHERE equipment_id=:id AND status IN ('resolved','failed')` → 409 `EQUIPMENT_HAS_RESOLVED_MAINTENANCE` với hint trong message khuyến nghị retire. Override bằng `?force=true` (chỉ owner — xem branch trên) để delete kèm cascade `maintenance_logs` (hard delete FK).
- ELSE DELETE equipment + cascade DELETE `maintenance_logs` (Database.md FK `ON DELETE CASCADE` — nếu khác, document gap). Audit `equipment.delete`.

---

## 6. Endpoints — Maintenance

### 6.1 GET /equipment/:id/maintenance-logs

**UC:** UC09 (step 5 dashboard technician)
**Auth:** JWT
**RBAC:** `maintenance.read`

**Description:** List maintenance log của 1 equipment cụ thể, sắp xếp `reportedAt:desc`.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | — |
| `pageSize` | int | 20 | — |
| `status` | enum | — | `reported`/`repairing`/`resolved`/`failed`. |
| `from` | date | — | Filter `reportedAt >= from`. |
| `to` | date | — | Filter `reportedAt <= to + 1 day`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "maintenanceId": "1",
      "equipmentId": "1",
      "reportedByStaff": {
        "staffId": "5",
        "staffCode": "STF-2026-000005",
        "fullName": "Nguyen Van A"
      },
      "description": "Day cap loose, can siet lai",
      "status": "resolved",
      "reportedAt": "2026-03-10T09:00:00.000Z",
      "resolvedAt": "2026-03-10T14:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 }
}
```

**Errors:** `401`, `403`, `404` (equipment không tồn tại).

**Audit:** Không log (read-only).

---

### 6.2 POST /equipment/:id/maintenance-logs

**UC:** UC09 (step 4 báo hỏng)
**Auth:** JWT
**RBAC:** `maintenance.report`

**Description:** Tạo maintenance log mới + chuyển `equipment.status='broken'`. 2 operation trong cùng `$transaction`.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `description` | string | yes | 10-1000 ký tự. |

```json
{ "description": "Day cap loose, may dao nguoc luc dung" }
```

**Response 201 Created:** Maintenance log object + reference equipment với status mới.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Description < 10 ký tự. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Equipment không tồn tại. |
| 409 | `EQUIPMENT_HAS_OPEN_MAINTENANCE` | Đã có log `status IN ('reported','repairing')` cho equipment này. Không cho phép 2 log open cùng lúc. |
| 409 | `EQUIPMENT_RETIRED` | Equipment đã `status='retired'` — không báo hỏng được. |

**Audit:** `maintenance.create` (đã có Architecture §4.4.1) với `after_data` = log object + `equipment_status_change: { from: 'active', to: 'broken' }`.

**WHEN-THEN-ELSE:**

- WHEN `EXISTS maintenance_logs WHERE equipment_id=:id AND status IN ('reported','repairing')` → 409 `EQUIPMENT_HAS_OPEN_MAINTENANCE`. Client phải resolve log cũ trước.
- WHEN equipment.status = 'retired' → 409 `EQUIPMENT_RETIRED`.
- WHEN equipment.status = 'broken' nhưng không có open log (data inconsistency edge case) → cho phép tạo log mới, không transition status (đã broken).
- ELSE `$transaction` [dùng SELECT FOR UPDATE để tránh race condition — xem Note bên dưới]:
  1. `SELECT maintenanceId FROM maintenance_logs WHERE equipment_id=:id AND status IN ('reported','repairing') FOR UPDATE` → nếu tìm thấy row → ROLLBACK + 409 `EQUIPMENT_HAS_OPEN_MAINTENANCE`.
  2. INSERT `maintenance_logs` với `status='reported'`, `reportedByStaffId` từ JWT staff lookup, `reportedAt=NOW()`.
  3. UPDATE `equipment.status = 'broken'` nếu hiện tại `active`.
  4. Audit `maintenance.create` với payload bao gồm equipment transition.

**Note — Race condition (LOG-C003):** Không có `FOR UPDATE`, 2 staff concurrent đều pass NOT EXISTS check trước khi INSERT, tạo 2 log open đồng thời — vi phạm invariant max-1-open-log. SELECT FOR UPDATE serialize writes. Thay thế: UNIQUE partial index tại DB layer (xem §9) — khi có index, concurrent INSERT thứ 2 sẽ fail với unique violation → map sang 409. Khuyến nghị: dùng cả hai (SELECT FOR UPDATE trong transaction + UNIQUE partial index) để defense-in-depth.

---

### 6.3 PATCH /maintenance-logs/:id

**UC:** UC09 (step 6 technician accept + step 7 resolve/fail)
**Auth:** JWT
**RBAC:** `maintenance.resolve`

**Description:** Cập nhật state maintenance log + transition equipment.status tương ứng. State machine xem §3.4.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `status` | enum | yes | `repairing`/`resolved`/`failed`. KHÔNG cho phép set lại `reported`. |

```json
{ "status": "resolved" }
```

**Response 200 OK:** Maintenance log object (đã update) + equipment ref với status mới.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Status không phải enum value. |
| 401/403 | — | — |
| 404 | `NOT_FOUND` | Maintenance log không tồn tại. |
| 409 | `MAINTENANCE_ALREADY_CLOSED` | Log đã ở `status='resolved'` hoặc `'failed'` — không cho update tiếp. |
| 409 | `MAINTENANCE_INVALID_STATE_TRANSITION` | Skip state (vd `reported → resolved` không qua `repairing`). |

**Audit:**

- Transition `reported → repairing`: `maintenance.update` với payload `{from: 'reported', to: 'repairing'}` + equipment transition `broken → repairing`.
- Transition `repairing → resolved`: `maintenance.resolve` (đã có Architecture §4.4.1) với `resolvedAt=NOW()` + equipment transition `repairing → active`.
- Transition `repairing → failed`: `maintenance.resolve` với payload `{outcome: 'failed'}` + equipment transition `repairing → retired`.

(`maintenance.update` cho transition middle là drift mới — xem §8.)

**WHEN-THEN-ELSE:**

- WHEN current `status='resolved'` HOẶC `'failed'` → 409 `MAINTENANCE_ALREADY_CLOSED`. Log immutable sau khi close.
- WHEN body `status='repairing'` AND current `status != 'reported'` → 409 `MAINTENANCE_INVALID_STATE_TRANSITION`.
- WHEN body `status='resolved'` HOẶC `'failed'` AND current `status != 'repairing'` → 409 `MAINTENANCE_INVALID_STATE_TRANSITION` (phải qua `repairing` trước).
- WHEN transition hợp lệ → `$transaction`:
  1. UPDATE `maintenance_logs.status = body.status`. Nếu close (`resolved`/`failed`), set `resolvedAt=NOW()`.
  2. UPDATE `equipment.status` theo state machine §3.4.
  3. Audit code tùy transition (xem mục Audit ở trên).
- ELSE 400.

**Note technician ownership v1.0:** RBAC `maintenance.resolve` đã giới hạn role owner/staff. UC09 step 6-7 ghi "Kỹ thuật viên" — kỹ thuật viên là staff với `position='technician'`. V1.0 KHÔNG enforce `position='technician'` check ở guard layer (group `staff` chung). Owner cũng có thể resolve nếu cần. Granular check defer v1.1+ nếu business cần.

---

## 7. Error Codes Appendix

Standard codes: xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 6:

| Code | HTTP | Trigger |
|---|---|---|
| `FORCE_DELETE_REQUIRES_OWNER` | 403 | DELETE `/equipment/:id?force=true` nhưng `jwt.role != 'owner'`. |
| `ROOM_HAS_EQUIPMENT` | 409 | DELETE room còn equipment tham chiếu. |
| `ROOM_HAS_ACTIVE_SESSIONS` | 409 | DELETE room còn training session upcoming. |
| `EQUIPMENT_HAS_OPEN_MAINTENANCE` | 409 | DELETE equipment hoặc PATCH status khi còn log `reported`/`repairing`. POST maintenance log khi đã có log open. |
| `EQUIPMENT_HAS_RESOLVED_MAINTENANCE` | 409 | DELETE equipment có history log resolved/failed. Hint dùng retire thay thế. |
| `EQUIPMENT_RETIRED` | 409 | POST maintenance log cho equipment đã retire. |
| `EQUIPMENT_INVALID_STATE_TRANSITION` | 409 | PATCH equipment status sai state machine (vd `retired → active`). |
| `USE_MAINTENANCE_LOG_ENDPOINT` | 409 | PATCH `/equipment/:id` với `status='broken'`; dùng POST `/equipment/:id/maintenance-logs` để báo hỏng thay thế. |
| `MAINTENANCE_ALREADY_CLOSED` | 409 | PATCH log đã ở `resolved`/`failed`. |
| `MAINTENANCE_INVALID_STATE_TRANSITION` | 409 | PATCH log skip state hoặc chuyển ngược. |
| `MEMBER_CODE_GENERATION_FAILED` | 500 | Server retry auto-gen `roomCode`/`equipmentCode` 10 lần thất bại. Reuse name pattern (xem Module 3 §5). |

---

## 8. Audit Action Codes Used

Cross-ref với Architecture v1.1.7 §4.4.1 (phase 12 sync):

| Code | Architecture status | Trigger |
|---|---|---|
| `room.create` | Listed (Architecture v1.1.7) | §4.3 |
| `room.update` | Listed (Architecture v1.1.7) | §4.4 |
| `room.delete` | Listed (Architecture v1.1.7) | §4.5 |
| `equipment.create` | Listed (Architecture v1.1.6) | §5.3 |
| `equipment.update` | Listed (Architecture v1.1.7) | §5.4 |
| `equipment.delete` | Listed (Architecture v1.1.6) | §5.5 |
| `maintenance.create` | Listed (Architecture v1.1.6) | §6.2 |
| `maintenance.update` | Listed (Architecture v1.1.7) | §6.3 |
| `maintenance.resolve` | Listed (Architecture v1.1.6) | §6.3 |

Tất cả 9 codes đã được sync. 5 codes mới (room.create/update/delete, equipment.update, maintenance.update) thêm vào Architecture v1.1.7 §4.4.1 phase 12. Không còn drift.

---

## 9. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| All 13 | NOT IMPLEMENTED | Module 6 PR scaffold sau Module 4 (Module 4 cung cấp `audit_logs` interceptor + transaction patterns). |

Required Prisma index khi implement (chưa có trong `schema.prisma`):

- `@@index([roomId])` trên `equipment` — query "list equipment per room" (§5.1 filter). Hiện chỉ có FK relation, không có explicit index — Prisma sinh implicit nhưng kiểm tra `prisma migrate diff` để chắc.
- `@@index([equipmentId, status])` trên `maintenance_logs` — query "EXISTS open maintenance" + list per equipment filter status (§5.4, §5.5, §6.1, §6.2). Composite index quan trọng cho check 409 conflict.
- UNIQUE partial index — enforce max-1-open-log invariant tại DB layer:

  ```sql
  CREATE UNIQUE INDEX idx_maintenance_open
    ON maintenance_logs(equipment_id)
    WHERE status IN ('reported', 'repairing');
  ```

  Concurrent INSERT thứ 2 sẽ fail với unique violation → service map sang 409 `EQUIPMENT_HAS_OPEN_MAINTENANCE`. Kết hợp với SELECT FOR UPDATE trong transaction (§6.2) để defense-in-depth.
- `@@index([status])` trên `equipment` — dashboard filter "warrantyExpiring" + status filter (§5.1).

Defer schema change khi implement Module 6 PR (atomic migration).

Cascade FK behavior cần verify:

- `equipment.room_id` → `gym_rooms.room_id`: hiện `ON DELETE NO ACTION` (Prisma default). Khớp với §4.5 (block DELETE room có equipment) — KHÔNG cần cascade.
- `maintenance_logs.equipment_id` → `equipment.equipment_id`: cần `ON DELETE CASCADE` cho flow §5.5 `?force=true`. Hiện Database.md không document — verify khi implement, sửa schema nếu cần.

---

## 10. Cross-module Dependencies

- **Module 7 Training:** `POST /training-sessions` reference `roomId`. Block DELETE room có upcoming session (§4.5 `ROOM_HAS_ACTIVE_SESSIONS`).
- **Module 8 Feedback:** `feedbacks.subject_equipment_id` reference `equipment`. Hard delete equipment không cascade feedback (FK `ON DELETE NO ACTION` per Database.md) — phải xử lý feedback trước hoặc set NULL. Document khi spec Module 8.
- **Module 2 RBAC:** `staff.position='technician'` defer v1.1+. V1.0 mọi staff có `maintenance.resolve` đều xử lý được.
- **Module 5 Staff:** `maintenance_logs.reported_by_staff_id` reference `staff`. Staff soft-delete (Database.md) — log vẫn giữ FK (orphan reference acceptable cho history immutable).

---

## 11. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-18 | Lê Thanh An | Initial draft phase 11 — 13 endpoint chia 3 resource (Rooms 5 + Equipment 5 + Maintenance 3). UC08 + UC09 full coverage. Hard delete cả 3 bảng per Database.md convention. Equipment state machine `active→broken→repairing→active/retired` + Maintenance state machine `reported→repairing→resolved/failed`. Block DELETE room còn equipment hoặc upcoming session. Block DELETE equipment còn maintenance open. Flag 5 audit code drift mới (`room.create`/`room.update`/`room.delete`/`equipment.update`/`maintenance.update`) cho Architecture v1.1.7 phase 12. Required Prisma index defer khi implement. |
| 1.0.1 | 2026-05-22 | Lê Thanh An | Phase 12 doc-review: pagination meta `total` → `totalItems`/`totalPages` (3 endpoints); §8 Audit section update — 5 drift codes đã sync vào Architecture v1.1.7, full table 9 codes với status Listed. |
| 1.0.2 | 2026-05-22 | Lê Thanh An | LOG-C002: Block direct `status='broken'` PATCH §5.4 + thêm `USE_MAINTENANCE_LOG_ENDPOINT` (§5.4 errors + §7). LOG-C003: Formalize race condition fix §6.2 (SELECT FOR UPDATE trong transaction) + UNIQUE partial index `idx_maintenance_open` trong §9. |
| 1.0.3 | 2026-05-22 | Lê Thanh An | LOG-M004: §5.5 thêm query params table cho `?force`; thêm WHEN branch `FORCE_DELETE_REQUIRES_OWNER` (403); thêm code vào §7 error codes. |
