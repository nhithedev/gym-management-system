# Module 7 — Training API (Training Sessions / Attendance / Member Progress)

| Field | Value |
|---|---|
| Document ID | GMS-API-M7-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-24) |
| Reviewers | TBD |
| Last Updated | 2026-05-24 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-5-Staff.md`](./Module-5-Staff.md), [`Architecture.md`](../Architecture.md), [`Database.md`](../Database.md), [`SRS_VI.md UC05B UC06C`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 7 đặc tả endpoint cho 3 resource group: lịch tập cá nhân (`training_sessions`), nhật ký check-in (`attendance_logs`), và tiến độ cơ thể (`member_progress`).

UCs bao trùm:

- **UC05B** — Lập lịch tập với PT: tạo / sửa / hủy buổi tập, xem lịch, truy cập trạng thái buổi.
- **UC05C** — Check-in real-time: tài liệu này bao phủ **manual fallback** (`method='manual'` và `method='qr'` do staff xử lý). Real-time device check-in qua `POST /devices/access-events` (Architecture §3.3) nằm ngoài scope Module 7 — chỉ endpoint 6 (`POST /attendance-logs`) phủ fallback.
- **UC06C** — Ghi tiến độ cơ thể: PT hoặc owner/staff ghi chỉ số cân nặng, BMI, mục tiêu.

In-scope: 8 endpoint.

Out-of-scope:

- Real-time QR / device integration (Architecture §3.3) — `POST /devices/access-events` là endpoint riêng, không thuộc Module 7.
- `method='realtime'` không được chấp nhận tại `POST /attendance-logs` — đây là method do device ghi, không do staff gọi.
- GET `/members/:id/progress` trong Module 4 là stub đọc cơ bản. Module 7 sở hữu authoritative GET (§6.1) và POST (§6.2) cho MemberProgress.
- Bài tập tập luyện (WorkoutLog, WorkoutPlan) — thuộc Module 10. MemberProgress chỉ ghi đo lường cơ thể (cân nặng, BMI), không ghi hiệu suất tập.

---

## 2. Endpoint Inventory

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/training-sessions` | UC05B | JWT | `session.read` | NEW |
| 2 | POST | `/training-sessions` | UC05B | JWT | `session.manage` | NEW |
| 3 | GET | `/training-sessions/:id` | UC05B | JWT | `session.read` | NEW |
| 4 | PATCH | `/training-sessions/:id` | UC05B | JWT | `session.manage` | NEW |
| 5 | DELETE | `/training-sessions/:id` | UC05B | JWT | `session.manage` | NEW |
| 6 | POST | `/attendance-logs` | UC05C | JWT | `attendance.checkin` | NEW |
| 7 | GET | `/members/:id/progress` | UC06C | JWT | `progress.read` | NEW |
| 8 | POST | `/members/:id/progress` | UC06C | JWT | `progress.record` | NEW |

Tổng: 8 endpoint, 0 implemented.

Permission catalog (`seed.ts` lines 56-61):

- `session.read`: owner, staff, trainer (pt), member.
- `session.manage`: owner, trainer (pt). (Staff không có `session.manage` — xem §4.2 note về `trainerStaffId`.)
- `attendance.checkin`: owner, staff, trainer (pt).
- `progress.read`: owner, staff, trainer (pt), member.
- `progress.record`: owner, trainer (pt).

---

## 3. Data Model

### 3.1 `training_sessions` (soft delete — có `deletedAt`)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `sessionId` | BigInt (string in JSON) | PK | Auto-increment. |
| `memberId` | BigInt (string in JSON) | FK → `members.member_id` NOT NULL | Member đặt lịch. |
| `trainerStaffId` | BigInt (string in JSON) | FK → `staff.staff_id` NOT NULL | PT phụ trách. |
| `roomId` | BigInt (string in JSON) | FK → `gym_rooms.room_id` NOT NULL | Phòng tập. |
| `startTime` | DateTime | NOT NULL, UTC stored | Wire: ISO 8601 UTC. Display: Asia/Ho_Chi_Minh (UTC+7). |
| `endTime` | DateTime | NOT NULL, UTC stored, > startTime | Wire: ISO 8601 UTC. |
| `status` | `TrainingSessionStatus` enum | NOT NULL, default `scheduled` | Xem §3.4 và state machine §3.5. |
| `deletedAt` | DateTime? | NULL = active | Soft delete — filter `deletedAt IS NULL` trong mọi query. |
| `createdAt` | DateTime | NOT NULL, auto | Thời điểm tạo bản ghi. |

Không có `updatedAt` trong schema v1.0 — audit via `audit_logs`.

### 3.2 `attendance_logs` (hard delete — KHÔNG có `deletedAt`)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `attendanceId` | BigInt (string in JSON) | PK | Auto-increment. |
| `memberId` | BigInt (string in JSON) | FK → `members.member_id` NOT NULL | Member check-in. |
| `subscriptionId` | BigInt (string in JSON) | FK → `subscriptions.subscription_id` NOT NULL | Subscription active tại thời điểm check-in. |
| `sessionId` | BigInt? (string in JSON) | FK → `training_sessions.session_id` NULL | Nullable — NULL khi walk-in không theo lịch cụ thể. |
| `startTime` | DateTime | NOT NULL, UTC | Thời điểm bắt đầu check-in. |
| `endTime` | DateTime? | NULL | Thời điểm kết thúc — không phải lúc nào cũng ghi nhận. |
| `method` | `AttendanceMethod` enum | NOT NULL | `manual` / `qr` qua endpoint này. `realtime` chỉ do device ghi. |

Hard delete: không có `deletedAt`. Records là audit trail bất biến.

### 3.3 `member_progress` (soft delete — có `deletedAt`)

| Field | Type | Constraint | Note |
|---|---|---|---|
| `progressId` | BigInt (string in JSON) | PK | Auto-increment. |
| `memberId` | BigInt (string in JSON) | FK → `members.member_id` NOT NULL | Member được đo. |
| `staffId` | BigInt (string in JSON) | FK → `staff.staff_id` NOT NULL | Người ghi nhận (PT hoặc staff). |
| `weight` | Decimal(6,2)? | NULL | Cân nặng (kg). Nullable — không bắt buộc ghi. |
| `bmi` | Decimal(5,2)? | NULL | BMI. Nullable. |
| `goal` | string? (≤ 255) | NULL | Mục tiêu tập luyện. |
| `notes` | string? (text) | NULL | Ghi chú thêm. |
| `recordedAt` | DateTime | NOT NULL | Thời điểm đo. Không được tương lai (BR-T07). |
| `deletedAt` | DateTime? | NULL = active | Soft delete. |

### 3.4 Enums

**`TrainingSessionStatus`:**

| Value | Ý nghĩa |
|---|---|
| `scheduled` | Đã lên lịch, chờ diễn ra |
| `in_progress` | Đang diễn ra (optional transition v1.0) |
| `completed` | Đã hoàn thành |
| `cancelled` | Đã hủy |

**`AttendanceMethod`:**

| Value | Ý nghĩa |
|---|---|
| `manual` | Staff nhập tay |
| `qr` | Staff quét mã QR của member |
| `realtime` | Device tự ghi (Architecture §3.3) — KHÔNG chấp nhận tại `POST /attendance-logs` |

### 3.5 State Machine: TrainingSession

Biểu đồ trạng thái:

```text
[scheduled] ──(start session)──> [in_progress] ──(end session)──> [completed]
     │    └──────────────────────────(end session, skip in_progress)──────────┘
     │
     ├── PATCH cancel (now ≤ startTime - 2h) ─────────────────────► [cancelled]
     │   audit: training.cancel
     │
     └── cron: no-show (no AttendanceLog after endTime + 2h) ──────► [cancelled]
         audit: training.no_show

[in_progress] ─── PATCH force cancel (owner only) ──────────────► [cancelled]
              audit: training.cancel
```

Valid transitions:

| From | To | Trigger | Ghi chú |
|---|---|---|---|
| `scheduled` | `in_progress` | PATCH `status='in_progress'` | Optional step v1.0. |
| `scheduled` | `cancelled` | PATCH `status='cancelled'` | Chỉ khi `now() <= startTime - 2h` (BR-T04). |
| `scheduled` | `completed` | PATCH `status='completed'` | Skip `in_progress`, immediate. |
| `in_progress` | `completed` | PATCH `status='completed'` | — |
| `in_progress` | `cancelled` | PATCH `status='cancelled'` | Force cancel, owner only. Staff không có `session.manage`. BR-T04 không áp dụng. |

Invalid transitions (trả 422 `INVALID_STATUS_TRANSITION`):

- Bất kỳ transition từ `completed` hoặc `cancelled` (terminal states).
- `in_progress → scheduled` (không thể hoàn nguyên).

Cron `training-session:auto-close` (Architecture §5.2): session `status='scheduled'` mà không có AttendanceLog sau `endTime + 2h` → tự động set `status='cancelled'`, audit `training.no_show`. Cron chạy độc lập, không qua endpoint PATCH.

---

## 4. Endpoints — Training Session

### 4.1 GET /training-sessions

**UC:** UC05B
**Auth:** JWT
**RBAC:** `session.read`

**Description:** List training sessions có pagination + filter. Visibility được lọc tự động theo role — không có query param toggle role.

Visibility rules (server-side automatic filter):
- Caller có role `pt` (trainer): chỉ thấy session với `trainerStaffId = self.staffId`.
- Caller có role `member`: chỉ thấy session với `memberId = self.memberId`.
- Caller có role `owner` hoặc `staff`: thấy tất cả session.

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `memberId` | string | — | Filter theo member (BigInt string). Owner/staff only — PT và member bị filter tự động, param này ignored nếu role không phù hợp. |
| `trainerStaffId` | string | — | Filter theo trainer (BigInt string). Ignored nếu caller là PT (auto-filtered đến self). |
| `roomId` | string | — | Filter theo phòng (BigInt string). |
| `status` | enum | — | `scheduled` / `in_progress` / `completed` / `cancelled`. |
| `from` | date | — | Filter `startTime >= from` (ISO date `YYYY-MM-DD`, so sánh UTC start-of-day VN timezone). |
| `to` | date | — | Filter `startTime <= to` (ISO date `YYYY-MM-DD`, so sánh UTC end-of-day VN timezone). |

Default sort: `startTime:asc`. Query chỉ trả records với `deletedAt IS NULL`.

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "sessionId": "1",
      "memberId": "10",
      "trainerStaffId": "3",
      "roomId": "2",
      "startTime": "2026-06-01T02:00:00.000Z",
      "endTime": "2026-06-01T03:00:00.000Z",
      "status": "scheduled",
      "deletedAt": null,
      "createdAt": "2026-05-24T08:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 5, "totalPages": 1 }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `session.read`. |

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN caller là `pt` → server thêm `WHERE trainerStaffId = self.staffId` vào query, bất kể `trainerStaffId` param truyền.
- WHEN caller là `member` → server thêm `WHERE memberId = self.memberId` vào query, bất kể `memberId` param truyền.
- WHEN `from > to` (cả hai truyền) → 400 `VALIDATION_ERROR`.
- WHEN `pageSize > 100` → 400 `VALIDATION_ERROR`.
- ELSE query với filter + visibility rule + pagination.

---

### 4.2 POST /training-sessions

**UC:** UC05B
**Auth:** JWT
**RBAC:** `session.manage`

**Description:** Tạo buổi tập mới. Business rules: BR-T01, BR-T02, BR-T03, BR-T05.

Lưu ý `trainerStaffId`:
- Caller là `pt`: server **bỏ qua** `trainerStaffId` trong body, tự set `trainerStaffId = self.staffId`. Client có thể không truyền field này.
- Caller là `owner`: `trainerStaffId` **bắt buộc** trong body.
- `staff` không có `session.manage` permission — không thể tạo session.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | BigInt string. Member phải tồn tại và không bị soft-delete. |
| `roomId` | string | yes | BigInt string. Room phải tồn tại. |
| `startTime` | string | yes | ISO 8601 UTC. |
| `endTime` | string | yes | ISO 8601 UTC. Phải > `startTime` (BR-T01). |
| `trainerStaffId` | string | no (khi PT caller), yes (khi owner caller) | BigInt string. Staff phải tồn tại và có `position='pt'`. |

```json
{
  "memberId": "10",
  "roomId": "2",
  "startTime": "2026-06-01T02:00:00.000Z",
  "endTime": "2026-06-01T03:00:00.000Z",
  "trainerStaffId": "3"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "sessionId": "1",
    "memberId": "10",
    "trainerStaffId": "3",
    "roomId": "2",
    "startTime": "2026-06-01T02:00:00.000Z",
    "endTime": "2026-06-01T03:00:00.000Z",
    "status": "scheduled",
    "deletedAt": null,
    "createdAt": "2026-05-24T10:30:00.000Z"
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid, `endTime <= startTime`. |
| 400 | `FK_CONSTRAINT` | `memberId`, `roomId`, hoặc `trainerStaffId` không tồn tại. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `session.manage`. |
| 403 | `TRAINER_MEMBER_MISMATCH` | Caller là PT và `memberId` không map đến `member.primaryTrainerId = self.staffId` (BR-T05). |
| 409 | `ROOM_OVERLAP` | BR-T02: roomId đã có session khác với `status != 'cancelled'` và thời gian giao nhau. |
| 422 | `MEMBER_SUBSCRIPTION_INACTIVE` | BR-T03: member không có subscription `status='active'` tại `startTime`. |

**Audit:** `training.create` với `after_data` = session object.

**WHEN-THEN-ELSE:**

- WHEN `endTime <= startTime` → 400 `VALIDATION_ERROR` (BR-T01).
- WHEN caller là `pt` AND `member.primaryTrainerId != self.staffId` → 403 `TRAINER_MEMBER_MISMATCH` (BR-T05). Check trước khi lookup room/subscription để giảm query không cần thiết.
- WHEN caller là `owner` AND `trainerStaffId` không truyền → 400 `VALIDATION_ERROR` (`trainerStaffId` required for owner caller).
- WHEN `NOT EXISTS subscription WHERE memberId=body.memberId AND status='active' AND startDate <= startTime AND endDate >= DATE(startTime)` → 422 `MEMBER_SUBSCRIPTION_INACTIVE` (BR-T03).
- WHEN `EXISTS training_sessions WHERE roomId=body.roomId AND status != 'cancelled' AND deletedAt IS NULL AND startTime < body.endTime AND endTime > body.startTime` → 409 `ROOM_OVERLAP` (BR-T02).
- ELSE INSERT với `status='scheduled'` + audit `training.create`.

---

### 4.3 GET /training-sessions/:id

**UC:** UC05B
**Auth:** JWT
**RBAC:** `session.read`

**Description:** Detail 1 training session. Bao gồm stub thông tin member và room.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | BigInt string. `sessionId`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "sessionId": "1",
    "memberId": "10",
    "member": {
      "memberId": "10",
      "fullName": "Tran Thi B"
    },
    "trainerStaffId": "3",
    "trainer": {
      "staffId": "3",
      "fullName": "Nguyen Van PT",
      "staffCode": "STF-2026-000003"
    },
    "roomId": "2",
    "room": {
      "roomId": "2",
      "roomCode": "RM-002",
      "name": "Phong tap ca nhan"
    },
    "startTime": "2026-06-01T02:00:00.000Z",
    "endTime": "2026-06-01T03:00:00.000Z",
    "status": "scheduled",
    "deletedAt": null,
    "createdAt": "2026-05-24T10:30:00.000Z"
  }
}
```

Visibility rules áp dụng: PT chỉ thấy session của mình, member chỉ thấy session của mình. Nếu caller không có quyền xem session cụ thể này → trả 404 `SESSION_NOT_FOUND` (không phân biệt "không tồn tại" vs "không có quyền" để tránh info leak).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `session.read`. |
| 404 | `SESSION_NOT_FOUND` | sessionId không tồn tại, đã soft-delete, hoặc caller không có quyền xem. |

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN session không tồn tại HOẶC `deletedAt IS NOT NULL` → 404 `SESSION_NOT_FOUND`.
- WHEN caller là `pt` AND `session.trainerStaffId != self.staffId` → 404 `SESSION_NOT_FOUND`.
- WHEN caller là `member` AND `session.memberId != self.memberId` → 404 `SESSION_NOT_FOUND`.
- ELSE trả detail session + member stub + room stub.

---

### 4.4 PATCH /training-sessions/:id

**UC:** UC05B
**Auth:** JWT
**RBAC:** `session.manage`

**Description:** Cập nhật thông tin buổi tập. Cho phép update metadata (`startTime`, `endTime`, `roomId`) hoặc chuyển trạng thái (`status`). Xem state machine §3.5.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | BigInt string. `sessionId`. |

**Request body:** Tất cả field optional, ít nhất 1 field phải có.

| Field | Type | Required | Constraint |
|---|---|---|---|
| `startTime` | string | no | ISO 8601 UTC. Phải < `endTime` (hiện tại hoặc body). |
| `endTime` | string | no | ISO 8601 UTC. Phải > `startTime`. |
| `roomId` | string | no | BigInt string. Room phải tồn tại. |
| `status` | enum | no | `in_progress` / `completed` / `cancelled`. Xem valid transitions §3.5. |

```json
{ "status": "cancelled" }
```

**Response 200 OK:** Session object đã update.

```json
{
  "success": true,
  "data": {
    "sessionId": "1",
    "memberId": "10",
    "trainerStaffId": "3",
    "roomId": "2",
    "startTime": "2026-06-01T02:00:00.000Z",
    "endTime": "2026-06-01T03:00:00.000Z",
    "status": "cancelled",
    "deletedAt": null,
    "createdAt": "2026-05-24T10:30:00.000Z"
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid, `endTime <= startTime`. |
| 400 | `FK_CONSTRAINT` | `roomId` không tồn tại. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `session.manage`. |
| 404 | `SESSION_NOT_FOUND` | sessionId không tồn tại, đã soft-delete, hoặc caller là PT và `session.trainerStaffId != self.staffId` (anti-enumeration). |
| 409 | `ROOM_OVERLAP` | Update `roomId`/`startTime`/`endTime` gây overlap với session khác. |
| 422 | `INVALID_STATUS_TRANSITION` | Transition không hợp lệ theo state machine §3.5. |
| 422 | `CANCEL_TOO_LATE` | BR-T04: `status='cancelled'` từ `scheduled` nhưng `now() > startTime - 2h`. |

**Audit:**
- Transition → `cancelled`: `training.cancel` với `before_data.status` + `after_data.status`.
- Transition → `completed`: `training.complete` với `before_data.status` + `after_data.status`.
- Metadata update không trigger audit (chỉ log status changes).

**WHEN-THEN-ELSE:**

- WHEN session không tồn tại HOẶC `deletedAt IS NOT NULL` → 404 `SESSION_NOT_FOUND`.
- WHEN caller là `pt` AND `session.trainerStaffId != self.staffId` → 404 `SESSION_NOT_FOUND` (anti-enumeration — PT không thấy session của trainer khác).
- WHEN body có `status`:
  - WHEN current `status IN ('completed', 'cancelled')` → 422 `INVALID_STATUS_TRANSITION` (terminal states, không thể rời).
  - WHEN body `status='in_progress'` AND current `status != 'scheduled'` → 422 `INVALID_STATUS_TRANSITION`.
  - WHEN body `status='completed'` AND current `status NOT IN ('scheduled', 'in_progress')` → 422 `INVALID_STATUS_TRANSITION`.
  - WHEN body `status='cancelled'` AND current `status = 'scheduled'` AND `now() > startTime - 2h` → 422 `CANCEL_TOO_LATE` (BR-T04).
  - WHEN body `status='cancelled'` AND current `status = 'in_progress'` AND caller không phải `owner` → 403 `FORBIDDEN` (force cancel chỉ owner; staff không có `session.manage`, PT không thể force cancel buổi đang diễn ra).
  - WHEN body `status='scheduled'` truyền (bất kể current status) → 422 `INVALID_STATUS_TRANSITION` (không thể set về `scheduled`).
- WHEN body thay đổi `roomId` hoặc `startTime` hoặc `endTime`:
  - Check BR-T02 overlap với giá trị mới. Nếu overlap → 409 `ROOM_OVERLAP`.
  - `endTime` (mới hoặc hiện tại) phải > `startTime` (mới hoặc hiện tại) → nếu không 400 `VALIDATION_ERROR`.
- ELSE UPDATE session + audit nếu có status transition.

---

### 4.5 DELETE /training-sessions/:id

**UC:** UC05B
**Auth:** JWT
**RBAC:** `session.manage`

**Description:** Soft delete training session. Chỉ cho phép khi `status = 'scheduled'`. Session đã chuyển sang `in_progress`, `completed`, hoặc `cancelled` không xóa mềm qua endpoint này — dùng PATCH để cancel trước.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | BigInt string. `sessionId`. |

**Response 204 No Content.**

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `session.manage`. |
| 404 | `SESSION_NOT_FOUND` | sessionId không tồn tại, đã soft-delete, hoặc caller là PT và `session.trainerStaffId != self.staffId` (anti-enumeration). |
| 422 | `INVALID_STATUS_TRANSITION` | `status != 'scheduled'` — không thể xóa session không ở trạng thái scheduled. |

**Audit:** `training.delete` với `before_data` = session object. (Soft-delete là thao tác xóa bản ghi, khác với `training.cancel` là chuyển `status='cancelled'` — distinguishable trong audit log bởi audit code.)

**WHEN-THEN-ELSE:**

- WHEN session không tồn tại HOẶC `deletedAt IS NOT NULL` → 404 `SESSION_NOT_FOUND`.
- WHEN caller là `pt` AND `session.trainerStaffId != self.staffId` → 404 `SESSION_NOT_FOUND` (anti-enumeration).
- WHEN `session.status != 'scheduled'` → 422 `INVALID_STATUS_TRANSITION` với message gợi ý dùng PATCH để cancel nếu session đang in_progress.
- ELSE set `deletedAt = NOW()` + audit `training.delete`.

---

## 5. Endpoint — Attendance Log

### 5.1 POST /attendance-logs

**UC:** UC05C (manual fallback)
**Auth:** JWT
**RBAC:** `attendance.checkin`

**Description:** Ghi nhận check-in thủ công hoặc qua QR do staff/PT xử lý. Không chấp nhận `method='realtime'` — method đó do device ghi tự động qua `POST /devices/access-events` (Architecture §3.3, không thuộc Module 7).

Business rules: BR-T06.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | BigInt string. Member phải tồn tại. |
| `subscriptionId` | string | yes | BigInt string. Phải thuộc `memberId` và có `status='active'` (BR-T06). |
| `sessionId` | string | no | BigInt string hoặc null. FK `training_sessions`. Nullable — null = walk-in không gắn lịch tập cụ thể. |
| `method` | enum | yes | `manual` hoặc `qr`. `realtime` không được chấp nhận. |
| `startTime` | string | yes | ISO 8601 UTC. Thời điểm check-in. |
| `endTime` | string | no | ISO 8601 UTC hoặc null. Thời điểm checkout — không phải lúc nào cũng ghi. |

```json
{
  "memberId": "10",
  "subscriptionId": "5",
  "sessionId": "1",
  "method": "manual",
  "startTime": "2026-06-01T02:05:00.000Z"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "attendanceId": "42",
    "memberId": "10",
    "subscriptionId": "5",
    "sessionId": "1",
    "method": "manual",
    "startTime": "2026-06-01T02:05:00.000Z",
    "endTime": null
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid, `method='realtime'` (không hợp lệ cho endpoint này), `endTime <= startTime` nếu truyền. |
| 400 | `FK_CONSTRAINT` | `memberId`, `subscriptionId`, hoặc `sessionId` không tồn tại trong DB. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `attendance.checkin`. |
| 422 | `MEMBER_SUBSCRIPTION_INACTIVE` | BR-T06: `subscriptionId` không thuộc `memberId` hoặc subscription không có `status='active'`. |
| 404 | `SESSION_NOT_FOUND` | `sessionId` truyền nhưng không tồn tại hoặc đã soft-delete. |

**Audit:** `attendance.checkin` với `after_data` = attendance log object.

**WHEN-THEN-ELSE:**

- WHEN `method='realtime'` → 400 `VALIDATION_ERROR` ("method 'realtime' không được phép tại endpoint này — dùng device integration").
- WHEN `subscriptionId` không thuộc `memberId` HOẶC `subscription.status != 'active'` → 422 `MEMBER_SUBSCRIPTION_INACTIVE` (BR-T06).
- WHEN `sessionId` truyền AND session không tồn tại HOẶC `session.deletedAt IS NOT NULL` → 404 `SESSION_NOT_FOUND`.
- WHEN `endTime` truyền AND `endTime <= startTime` → 400 `VALIDATION_ERROR`.
- ELSE INSERT `attendance_logs` + audit `attendance.checkin`.

---

## 6. Endpoints — Member Progress

### 6.1 GET /members/:id/progress

**UC:** UC06C
**Auth:** JWT
**RBAC:** `progress.read`

**Description:** List tiến độ cơ thể của member, sắp xếp `recordedAt DESC`. Đây là authoritative GET cho MemberProgress (Module 4 chỉ có stub).

Visibility rules:
- Caller là `member`: chỉ thấy progress của chính mình (`memberId = self.memberId`). Nếu `:id` là member khác → 403 `FORBIDDEN`.
- Caller là `owner`, `staff`, hoặc `pt`: thấy progress của bất kỳ member nào.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | BigInt string. `memberId`. |

**Query params:**

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `from` | date | — | Filter `recordedAt >= from` (ISO date `YYYY-MM-DD`). |
| `to` | date | — | Filter `recordedAt <= to` (ISO date `YYYY-MM-DD`). |

Query chỉ trả records với `deletedAt IS NULL`.

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "progressId": "15",
      "memberId": "10",
      "staffId": "3",
      "weight": "68.50",
      "bmi": "22.10",
      "goal": "Giam 5kg trong 3 thang",
      "notes": "Hoi vien phan nan dau goi khi squat",
      "recordedAt": "2026-05-20T09:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 8, "totalPages": 1 }
}
```

`weight` và `bmi` trả về dưới dạng string decimal (Prisma `Decimal` serialize thành string).

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `from > to` (cả hai truyền). |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `progress.read` HOẶC member caller cố xem progress của member khác. |
| 404 | `NOT_FOUND` | `memberId` không tồn tại (Prisma P2025). |

**Audit:** Không log (read-only).

**WHEN-THEN-ELSE:**

- WHEN member `:id` không tồn tại HOẶC đã soft-delete → 404 `NOT_FOUND`.
- WHEN caller là `member` AND `self.memberId != :id` → 403 `FORBIDDEN`.
- WHEN `from > to` (cả hai truyền) → 400 `VALIDATION_ERROR`.
- ELSE query với filter `deletedAt IS NULL`, sort `recordedAt DESC` + pagination.

---

### 6.2 POST /members/:id/progress

**UC:** UC06C
**Auth:** JWT
**RBAC:** `progress.record`

**Description:** Ghi nhận chỉ số tiến độ mới cho member. Server tự set `staffId = self.staffId` (caller phải là staff/PT). Business rules: BR-T07.

**Path params:**

| Param | Type | Note |
|---|---|---|
| `id` | string | BigInt string. `memberId`. |

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `weight` | number | no | Decimal, format `XX.XX` (kg). Phải > 0 nếu truyền. |
| `bmi` | number | no | Decimal, format `XX.XX`. Phải > 0 nếu truyền. |
| `goal` | string | no | ≤ 255 ký tự. |
| `notes` | string | no | Text tự do. |
| `recordedAt` | string | yes | ISO 8601 UTC. Không được > now() (BR-T07). |

Ít nhất 1 trong `weight`, `bmi`, `goal`, `notes` phải có (cùng với `recordedAt`). Truyền tất cả null/omit cho mọi field đo lường → 400 `VALIDATION_ERROR`.

```json
{
  "weight": 68.5,
  "bmi": 22.1,
  "goal": "Giam 5kg trong 3 thang",
  "recordedAt": "2026-05-20T09:00:00.000Z"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "progressId": "15",
    "memberId": "10",
    "staffId": "3",
    "weight": "68.50",
    "bmi": "22.10",
    "goal": "Giam 5kg trong 3 thang",
    "notes": null,
    "recordedAt": "2026-05-20T09:00:00.000Z",
    "deletedAt": null
  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field format invalid, tất cả measurement fields đều omit/null, `weight` hoặc `bmi` ≤ 0. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `progress.record`. |
| 404 | `NOT_FOUND` | `memberId` không tồn tại (Prisma P2025). |
| 422 | `PROGRESS_FUTURE_DATE` | BR-T07: `recordedAt > now()`. |

**Audit:** `progress.record` với `after_data` = progress object.

**WHEN-THEN-ELSE:**

- WHEN member `:id` không tồn tại HOẶC đã soft-delete → 404 `NOT_FOUND`.
- WHEN `recordedAt > now()` → 422 `PROGRESS_FUTURE_DATE` (BR-T07).
- WHEN tất cả measurement fields (`weight`, `bmi`, `goal`, `notes`) đều omit hoặc null → 400 `VALIDATION_ERROR` ("Phải cung cấp ít nhất 1 chỉ số đo lường").
- WHEN `weight` truyền AND `weight <= 0` → 400 `VALIDATION_ERROR`.
- WHEN `bmi` truyền AND `bmi <= 0` → 400 `VALIDATION_ERROR`.
- ELSE INSERT với `staffId = self.staffId` (từ JWT + staff lookup) + audit `progress.record`.

---

## 7. Error Codes Appendix

Standard codes: xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 7:

| Code | HTTP | Trigger |
|---|---|---|
| `SESSION_NOT_FOUND` | 404 | `sessionId` không tồn tại, đã soft-delete, hoặc caller không có quyền xem session (anti-enumeration — §4.3). |
| `ROOM_OVERLAP` | 409 | BR-T02: `roomId` đã có session khác với `status != 'cancelled'` và thời gian giao nhau. |
| `MEMBER_SUBSCRIPTION_INACTIVE` | 422 | BR-T03 (POST /training-sessions): member không có subscription active tại `startTime`. BR-T06 (POST /attendance-logs): `subscriptionId` không thuộc member hoặc không active. |
| `CANCEL_TOO_LATE` | 422 | BR-T04: cancel session `scheduled` khi `now() > startTime - 2h`. |
| `TRAINER_MEMBER_MISMATCH` | 403 | BR-T05: PT caller tạo session cho member không có `primaryTrainerId = self.staffId`. |
| `INVALID_STATUS_TRANSITION` | 422 | Transition trạng thái không hợp lệ theo state machine §3.5. Áp dụng cả cho DELETE session có `status != 'scheduled'`. |
| `PROGRESS_FUTURE_DATE` | 422 | BR-T07: `recordedAt > now()` tại POST /members/:id/progress. |

---

## 8. Audit Action Codes Used

Cross-ref với `conventions.md §18`:

| Code | Status trong conventions.md §18 | Trigger |
|---|---|---|
| `training.create` | Chưa listed — drift mới | §4.2 POST /training-sessions |
| `training.cancel` | Listed (Training row) | §4.4 PATCH status=cancelled |
| `training.delete` | Chưa listed — drift mới | §4.5 DELETE (soft-delete bản ghi, khác với cancel status transition) |
| `training.complete` | Chưa listed — drift mới | §4.4 PATCH status=completed |
| `training.no_show` | Listed (Training row) | Cron `training-session:auto-close` |
| `attendance.checkin` | Chưa listed — drift mới | §5.1 POST /attendance-logs |
| `progress.record` | Chưa listed — drift mới | §6.2 POST /members/:id/progress |

conventions.md §18 Training row hiện chỉ có `training.cancel` và `training.no_show`. Bốn code mới (`training.create`, `training.complete`, `attendance.checkin`, `progress.record`) cần sync vào Architecture §4.4.1 và conventions.md §18 khi implement.

---

## 9. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| GET /training-sessions | NOT IMPLEMENTED | — |
| POST /training-sessions | NOT IMPLEMENTED | — |
| GET /training-sessions/:id | NOT IMPLEMENTED | — |
| PATCH /training-sessions/:id | NOT IMPLEMENTED | — |
| DELETE /training-sessions/:id | NOT IMPLEMENTED | — |
| POST /attendance-logs | NOT IMPLEMENTED | — |
| GET /members/:id/progress | NOT IMPLEMENTED | — |
| POST /members/:id/progress | NOT IMPLEMENTED | — |

Cron `training-session:auto-close` (Architecture §5.2):

- Trigger: chạy định kỳ (Architecture §5.2 không specify interval — khuyến nghị mỗi 15 phút).
- Logic: `SELECT * FROM training_sessions WHERE status='scheduled' AND end_time < NOW() - INTERVAL '2 hours' AND deleted_at IS NULL`.
- Action: batch UPDATE `status='cancelled'`, ghi audit `training.no_show` cho mỗi session.
- Fields touched: `status` (từ `scheduled` → `cancelled`).
- Không ghi `deletedAt` — record vẫn visible với `status='cancelled'`.

Required Prisma indexes khi implement (chưa có trong `schema.prisma`):

- `@@index([memberId])` trên `TrainingSession` — query §4.1 filter + §4.2 BR-T03 lookup.
- `@@index([trainerStaffId])` trên `TrainingSession` — query §4.1 visibility filter cho PT caller.
- `@@index([roomId])` trên `TrainingSession` — BR-T02 overlap check.
- `@@index([status, startTime])` trên `TrainingSession` — cron query + BR-T02 overlap check (composite).
- `@@index([memberId])` trên `AttendanceLog` — đã có trong schema: `@@index([memberId, startTime(sort: Desc)])`. Đủ dùng.
- `@@index([memberId])` trên `MemberProgress` — query §6.1 filter.
- `@@index([recordedAt])` trên `MemberProgress` — sort + from/to date filter §6.1.

Ghi chú schema:

- `TrainingSession.createdAt` không có trong `schema.prisma` hiện tại (§3.1 note). Cần thêm `createdAt DateTime @default(now()) @map("created_at")` khi implement hoặc omit khỏi response nếu trade-off được accept.
- `AttendanceLog` đã có `@@index([memberId, startTime(sort: Desc)])`, `@@index([subscriptionId])`, `@@index([sessionId])` trong schema — đủ cho use case Module 7.

---

## 10. Cross-module Dependencies

- **Module 4 (Member / Subscription):** `memberId` FK trong TrainingSession và AttendanceLog. `subscriptionId` FK trong AttendanceLog. `Member.primaryTrainerId` dùng cho BR-T05 check. Module 4 GET /members/:id có stub progress — Module 7 §6.1 là authoritative endpoint.
- **Module 5 (Staff):** `trainerStaffId` FK → `staff`. `staffId` FK trong MemberProgress. Staff soft-delete: khi staff bị xóa, session và progress records giữ FK (orphan reference acceptable cho history — cùng pattern với `maintenance_logs.reported_by_staff_id`).
- **Module 6 (Facility):** `roomId` FK → `gym_rooms`. Module 6 §4.5 block DELETE room còn upcoming training session (`ROOM_HAS_ACTIVE_SESSIONS`). Module 7 phụ thuộc Module 6 cho room existence check tại §4.2 và §4.4.
- **Module 10 (Workout):** `MemberProgress` ghi đo lường cơ thể (cân nặng, BMI, mục tiêu). `WorkoutLog` ghi hiệu suất tập (sets, reps, weight per exercise). Hai bảng độc lập — không có FK giữa chúng.

---

## 11. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-24 | Lê Thanh An | Initial draft — 8 endpoint: TrainingSession CRUD 5 + AttendanceLog 1 + MemberProgress 2. UC05B + UC05C (manual fallback) + UC06C. State machine `scheduled → in_progress/completed/cancelled`. BR-T01..BR-T07 đầy đủ. 4 audit code drift mới cần sync conventions.md + Architecture §4.4.1. |
| 1.0.1 | 2026-05-24 | Lê Thanh An | Quality review fixes — C1/C2: thêm PT ownership check vào PATCH + DELETE WHEN-THEN-ELSE và errors table (anti-enumeration 404). C3: thêm `subscriptionId` vào FK_CONSTRAINT trigger §5.1. C4: cập nhật PATCH §4.4 404 trigger nêu rõ ownership check. I4: vẽ lại state machine diagram để loại bỏ arrow gây nhầm lẫn cron → scheduled. I5: thêm 400 VALIDATION_ERROR vào errors table §6.1. I6: tách `training.delete` riêng khỏi `training.cancel` cho DELETE endpoint. I7: sửa force-cancel từ "owner/staff only" → "owner only" (staff không có session.manage). |
