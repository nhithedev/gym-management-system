
# Module 7 — Training API (Training Sessions / Attendance / Member Progress)

| Field | Value |
|---|---|
| Document ID | GMS-API-M7-001 |
| Version | 1.0.0 |
| Status | Draft |

| Author | Le Thanh An (initial draft 2026-05-29) |
| Reviewers | TBD |
| Last Updated | 2026-05-29 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-4-Member-Subscription.md`](./Module-4-Member-Subscription.md), [`Module-6-Facility.md`](./Module-6-Facility.md), [`Architecture.md §3.3, §5.2`](../Architecture.md), [`Database.md §training_sessions, attendance_logs, member_progress`](../Database.md), [`SRS_VI.md UC05, UC06`](../../VI/SRS_VI.md) |

---

## 1. Muc dich & Pham vi

Module 7 dac ta API cho van hanh tap luyen: lap lich tap voi PT (`training_sessions`), ghi nhan check-in/check-out (`attendance_logs`), va ghi chi so tien do (`member_progress`). Bao trum UC05A, UC05B va phan write cua UC06.

In-scope: 11 endpoint chia 4 nhom resource:

- Training sessions: 5 endpoint.
- Attendance: 4 endpoint, gom device callback UC05B.
- Progress write: 2 endpoint. Read progress da co trong Module 4 `GET /members/:id/progress`.

Out-of-scope:

- WebSocket/SSE real-time UI. V1.0 dung polling 30s theo Architecture §4.2.1.
- RFID/QR payload rieng. V1.0 device gui `memberIdentifier = member_code`; `card_id` defer v1.1 R21.
- Package theo so buoi. V1.0 package time-based, attendance khong tru luot.
- Giao an chi tiet, bai tap, set/reps. Defer v1.1+.

## 2. Endpoint Inventory

### Training Sessions (UC05A)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/training-sessions` | UC05A | JWT | `session.read` HOAC `Self` HOAC `PT-if-primary` | NEW |
| 2 | GET | `/training-sessions/:id` | UC05A | JWT | `session.read` HOAC `Self` HOAC `PT-if-primary` | NEW |
| 3 | POST | `/training-sessions` | UC05A | JWT | `session.manage` | NEW |
| 4 | PATCH | `/training-sessions/:id` | UC05A | JWT | `session.manage` | NEW |
| 5 | POST | `/training-sessions/:id/cancel` | UC05A | JWT | `session.manage` | NEW |

### Attendance (UC05B)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 6 | GET | `/attendance-logs` | UC05B | JWT | `attendance.read` HOAC `Self` HOAC `PT-if-primary` | NEW |
| 7 | POST | `/attendance/manual-checkin` | UC05B fallback | JWT | `attendance.checkin` | NEW |
| 8 | PATCH | `/attendance-logs/:id/checkout` | UC05B | JWT | `attendance.checkin` | NEW |
| 9 | POST | `/devices/access-events` | UC05B | Device API key | `X-Device-API-Key` | NEW |

### Progress Write (UC06)

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 10 | POST | `/members/:id/progress` | UC06 | JWT | `progress.record` + `PT-if-primary` | NEW |
| 11 | DELETE | `/member-progress/:id` | UC06 | JWT | `progress.record` + owner of record, hoac `member.update` | NEW |

Permission catalog da co trong `server/prisma/seed.ts`: `session.read`, `session.manage`, `attendance.read`, `attendance.checkin`, `progress.read`, `progress.record`.

---

## 3. Data Model


### 3.1 `training_sessions`

| Field | Type | Constraint | Note |
|---|---|---|---|
| `sessionId` | BigInt string | PK | Auto-increment. |
| `memberId` | BigInt string | FK -> `members` | Member duoc PT lap lich. |
| `trainerStaffId` | BigInt string | FK -> `staff` | PT phu trach. |
| `roomId` | BigInt string | FK -> `gym_rooms` | Phong tap. |
| `assignmentId` | BigInt string \| null | FK -> `member_workout_plans` | Workout plan assignment dùng cho session; nullable để giữ session cũ. |
| `planDayId` | BigInt string \| null | FK -> `workout_plan_days` | Ngày tập cụ thể trong plan; dùng để member bắt đầu/log buổi tập khi đến giờ. |
| `startTime` | ISO datetime UTC | NOT NULL | Phai < `endTime`. |
| `endTime` | ISO datetime UTC | NOT NULL | Phai > `startTime`. |
| `status` | enum | `scheduled`, `in_progress`, `completed`, `cancelled` | Default `scheduled`. |
| `deletedAt` | timestamp | nullable | Soft delete. |

Overlap detection tren `(roomId, startTime, endTime)` thuc hien o application layer theo Database.md.

### 3.2 `attendance_logs`

| Field | Type | Constraint | Note |
|---|---|---|---|
| `attendanceId` | BigInt string | PK | Auto-increment. |
| `memberId` | BigInt string | FK -> `members` | Member check-in. |
| `subscriptionId` | BigInt string | FK -> `subscriptions` | Goi active tai thoi diem check-in. |
| `sessionId` | BigInt string | nullable FK -> `training_sessions` | Null neu tap tu do. |
| `startTime` | ISO datetime UTC | NOT NULL | Device/manual event time. |
| `endTime` | ISO datetime UTC | nullable | Set khi checkout. |
| `method` | enum | `realtime`, `manual`, `qr` | V1.0 device dung `realtime`, quay dung `manual`; `qr` reserved. |

### 3.3 `member_progress`

| Field | Type | Constraint | Note |
|---|---|---|---|
| `progressId` | BigInt string | PK | Auto-increment. |
| `memberId` | BigInt string | FK -> `members` | Member duoc danh gia. |
| `staffId` | BigInt string | FK -> `staff` | PT ghi nhan. |
| `weight` | decimal | nullable, > 0 | Kg. |
| `bmi` | decimal | nullable, 10-50 | Validate hop ly. |
| `goal` | string | nullable | Muc tieu. |
| `notes` | text | nullable | Ghi chu PT. |
| `recordedAt` | ISO datetime UTC | NOT NULL | Default NOW. |
| `deletedAt` | timestamp | nullable | Soft delete. |

---

## 4. Endpoints - Training Sessions

### 4.1 GET /training-sessions

**UC:** UC05A  
**Auth:** JWT  
**RBAC:** `session.read` HOAC `Self` HOAC `PT-if-primary`

List lich tap co pagination, filter theo member/PT/room/status/date range.

**Query params:**

| Param | Type | Default | Mo ta |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `memberId` | string | - | Filter member. Self bat buoc `memberId=self`. |
| `trainerStaffId` | string | - | Filter PT. PT mac dinh chi thay lich cua minh. |
| `roomId` | string | - | Filter phong. |
| `status` | enum | - | `scheduled`/`in_progress`/`completed`/`cancelled`. |
| `from` | datetime/date | - | `startTime >= from`. |
| `to` | datetime/date | - | `startTime <= to`. |
| `sort` | string | `start_time:asc` | Whitelist `start_time`, `end_time`, `status`. |


**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {

      "sessionId": "10",
      "memberId": "5",
      "memberName": "Nguyen Van A",
      "trainerStaffId": "3",
      "trainerName": "Tran Quang Minh",
      "roomId": "1",
      "roomName": "Yoga Studio 1",
      "startTime": "2026-06-01T10:00:00.000Z",
      "endTime": "2026-06-01T11:00:00.000Z",
      "status": "scheduled"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```

**Business rules:**

```text
WHEN caller chi match Self
THEN bat buoc filter memberId = self.member_id
ELSE Owner/Staff/PT co session.read co the filter theo pham vi role

WHEN caller la PT
THEN default trainerStaffId = self.staff_id, tru khi co quyen owner/staff rong hon
```

**Audit:** Khong log GET.

### 4.2 GET /training-sessions/:id

**Auth:** JWT  
**RBAC:** `session.read` HOAC `Self` HOAC `PT-if-primary`

Tra detail 1 session kem attendance gan voi session neu co. Session co lien ket workout plan tra them `workoutPlan` summary va `planDay` detail gom exercises.

**Response 200 OK:** training session object + `attendanceLogs: []`.

**Errors:** `401`, `403`, `404`.

### 4.3 POST /training-sessions

**UC:** UC05A  
**Auth:** JWT  
**RBAC:** `session.manage`

PT tao lich tap cho member minh phu trach; Owner/Staff co the tao thay khi can dieu phoi.


**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|

| `memberId` | string | yes | Member active, not deleted. |
| `trainerStaffId` | string | conditional | Owner/Staff co the truyen; PT mac dinh self. |
| `roomId` | string | yes | FK `gym_rooms`. |
| `assignmentId` | string | required for PT-created linked sessions | Active assignment thuoc member. |
| `planDayId` | string | required for PT-created linked sessions | WorkoutPlanDay thuoc plan cua assignment. |
| `startTime` | ISO datetime UTC | yes | Phai trong tuong lai hoac hien tai + grace 5 phut. |
| `endTime` | ISO datetime UTC | yes | > `startTime`. |

```json
{
  "memberId": "5",
  "roomId": "1",
  "assignmentId": "15",
  "planDayId": "42",
  "startTime": "2026-06-01T10:00:00.000Z",
  "endTime": "2026-06-01T11:00:00.000Z"
}
```

**Business rule — workout plan link:** PT-created sessions must include both `assignmentId` and `planDayId`. Backend validates assignment is `active`, belongs to `memberId`, and `planDayId` belongs to the assigned plan. Owner/Staff-created legacy sessions may omit the link.

**Response 201 Created:** session detail.


**Errors:**

| HTTP | Code | Trigger |
|---|---|---|

| 400 | `VALIDATION_ERROR` | Time invalid, field format sai. |
| 400 | `FK_CONSTRAINT` | `memberId`, `trainerStaffId`, hoac `roomId` khong ton tai. |
| 403 | `TRAINER_NOT_ASSIGNED` | PT tao lich cho member khong phai primary. |
| 409 | `MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION` | Khong co subscription active tai ngay `startTime` theo `today_vn`. |
| 409 | `ROOM_TIME_OVERLAP` | Phong da co session khac overlap va status != `cancelled`. |
| 409 | `TRAINER_TIME_OVERLAP` | PT da co session khac overlap va status != `cancelled`. |

**Business rules:**

```text
WHEN caller la PT
THEN trainerStaffId = self.staff_id AND member.primary_trainer_id = self.staff_id
ELSE Owner/Staff co the tao cho bat ky PT active

WHEN khong co subscription status='active' voi start_date <= session_date_vn <= end_date
THEN 409 MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION
ELSE proceed

WHEN EXISTS training_sessions cung room overlap AND status != 'cancelled' AND deleted_at IS NULL
THEN 409 ROOM_TIME_OVERLAP
ELSE proceed

WHEN EXISTS training_sessions cung trainer overlap AND status != 'cancelled' AND deleted_at IS NULL
THEN 409 TRAINER_TIME_OVERLAP
ELSE INSERT status='scheduled'
```

**Audit:** `training.create` voi `after_data` = session object. Drift moi, xem §8.

### 4.4 PATCH /training-sessions/:id

**Auth:** JWT  
**RBAC:** `session.manage`

Reschedule hoac doi phong/PT truoc gio tap.

**Request body:** partial `trainerStaffId`, `roomId`, `startTime`, `endTime`.

**Errors:** `401`, `403`, `404`, `409 SESSION_ALREADY_STARTED`, `409 ROOM_TIME_OVERLAP`, `409 TRAINER_TIME_OVERLAP`.

**Business rules:**

```text
WHEN session.status IN ('completed', 'cancelled') OR NOW() >= startTime
THEN 409 SESSION_ALREADY_STARTED
ELSE validate overlap nhu POST
```

**Audit:** `training.update`. Drift moi, xem §8.

### 4.5 POST /training-sessions/:id/cancel

**Auth:** JWT  
**RBAC:** `session.manage`

Huy session chu dong. PT chi duoc huy truoc `startTime - 2h`; Owner/Staff co the huy bat ky luc truoc khi completed.

**Request body:**

```json
{ "reason": "Member xin doi lich" }
```

**Errors:** `401`, `403`, `404`, `409 SESSION_CANCEL_WINDOW_CLOSED`, `409 SESSION_NOT_CANCELLABLE`.

**Business rules:**

```text
WHEN session.status IN ('completed', 'cancelled')
THEN 409 SESSION_NOT_CANCELLABLE
ELSE proceed

WHEN caller la PT AND NOW() > session.start_time - INTERVAL '2 hours'
THEN 409 SESSION_CANCEL_WINDOW_CLOSED
ELSE UPDATE status='cancelled'
```

**Audit:** `training.cancel` voi payload `{reason, cancelled_by}`.

---

## 5. Endpoints - Attendance

### 5.1 GET /attendance-logs

**Auth:** JWT  
**RBAC:** `attendance.read` HOAC `Self` HOAC `PT-if-primary`

List attendance co filter `memberId`, `subscriptionId`, `sessionId`, `method`, `from`, `to`. Self bat buoc `memberId=self`. PT chi xem member co `primary_trainer_id=self.staff_id`.

### 5.2 POST /attendance/manual-checkin

**UC:** UC05B fallback tai quay  
**Auth:** JWT  
**RBAC:** `attendance.checkin`

Nhan vien/PT ghi check-in thu cong bang `memberCode` khi device fail.

**Request body:**

```json
{
  "memberCode": "MEM-2026-000123",
  "occurredAt": "2026-06-01T10:05:00.000Z"
}
```

**Response 201 Created:** attendance log + member + subscription summary.

**Errors:** `404 MEMBER_NOT_FOUND`, `403 MEMBER_NO_ACTIVE_SUBSCRIPTION`, `409 ATTENDANCE_ALREADY_OPEN`.

**Audit:** `attendance.manual-checkin`.

### 5.3 PATCH /attendance-logs/:id/checkout

**Auth:** JWT  
**RBAC:** `attendance.checkin`

Set `endTime` cho attendance dang mo.

**Request body:**

```json
{ "endedAt": "2026-06-01T11:05:00.000Z" }
```

**Errors:** `404`, `409 ATTENDANCE_ALREADY_CLOSED`, `400 VALIDATION_ERROR` neu `endedAt <= startTime`.

**Audit:** `attendance.checkout`. Drift moi, xem §8.

### 5.4 POST /devices/access-events

**UC:** UC05B real-time check-in  
**Auth:** `X-Device-API-Key` header, khong dung JWT  
**RBAC:** Device API key compare voi env `DEVICE_API_KEY` bang timing-safe compare.

**Request body:**

| Field | Type | Required | Note |
|---|---|---|---|
| `memberIdentifier` | string | yes | V1.0 bat buoc la `member_code`. |
| `occurredAt` | ISO datetime UTC | yes | Thoi diem device ghi nhan. |
| `deviceId` | string | yes | Dung debug + dedupe. |

```json
{
  "memberIdentifier": "MEM-2026-000123",
  "occurredAt": "2026-06-01T10:05:00.000Z",
  "deviceId": "DEV-FRONT-01"
}
```

**Response 200 OK:**


```json
{
  "success": true,
  "data": {

    "attendanceLogId": "99",
    "deduped": false,
    "member": {
      "memberId": "5",
      "memberCode": "MEM-2026-000123",
      "fullName": "Nguyen Van A",
      "photoUrl": null
    },
    "subscription": {
      "subscriptionId": "12",
      "endDate": "2026-08-30"
    },
    "sessionId": "10"

  }
}
```

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|

| 401 | `UNAUTHORIZED` | API key thieu/sai. |
| 404 | `MEMBER_NOT_FOUND` | Khong tim thay `member_code` hoac member soft-deleted. |
| 403 | `MEMBER_NO_ACTIVE_SUBSCRIPTION` | Khong co active subscription tai `today_vn`. |
| 409 | `ATTENDANCE_ALREADY_OPEN` | Da co attendance open trong ngay cho member nay. |

**Business rules:**

```text
WHEN ton tai attendance log cung (deviceId, occurredAt) trong cua so 60s
THEN skip insert va tra 200 voi attendance cu + deduped=true
ELSE proceed

WHEN member khong ton tai OR deleted_at IS NOT NULL
THEN 404 MEMBER_NOT_FOUND
ELSE proceed

WHEN khong co subscriptions status='active' AND start_date <= today_vn AND end_date >= today_vn
THEN 403 MEMBER_NO_ACTIVE_SUBSCRIPTION
ELSE proceed

WHEN co training_session cua member voi status='scheduled' AND start_time <= occurredAt <= end_time
THEN link sessionId va optional update status='in_progress'
ELSE sessionId = null

ALWAYS INSERT attendance_logs(method='realtime', start_time=occurredAt)
AND audit attendance.realtime-checkin voi actor_user_id=NULL
```

---

## 6. Endpoints - Progress Write

### 6.1 POST /members/:id/progress

**UC:** UC06  
**Auth:** JWT  
**RBAC:** `progress.record` + `PT-if-primary`

PT ghi chi so tien do cho member minh phu trach. Owner/Staff co `member.update` co the override khi can nhap bu ho so.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|

| `weight` | decimal | no | > 0 va <= 500. |
| `bmi` | decimal | no | 10-50. |
| `goal` | string | no | <= 255. |
| `notes` | string | no | <= 2000. |
| `recordedAt` | ISO datetime UTC | no | Default NOW; khong duoc tuong lai > 5 phut. |

**Response 201 Created:** progress object.

**Errors:** `401`, `403`, `404`, `400 VALIDATION_ERROR`.

**Audit:** `progress.record`. Drift moi, xem §8.

### 6.2 DELETE /member-progress/:id

**Auth:** JWT  
**RBAC:** `progress.record` + owner of record, hoac `member.update`

Soft delete progress record khi PT nhap sai. Khong hard delete de giu audit trail.

**Response 204 No Content.**

**Audit:** `progress.delete`. Drift moi, xem §8.

---

## 7. Domain Error Codes

Standard codes: xem [`conventions.md §6`](./conventions.md).

| Code | HTTP | Trigger |
|---|---|---|
| `TRAINER_NOT_ASSIGNED` | 403 | PT thao tac member khong phai primary. |
| `MEMBER_HAS_NO_ACTIVE_SUBSCRIPTION` | 409 | Lap lich khi member khong co goi active tai ngay session. |
| `MEMBER_NO_ACTIVE_SUBSCRIPTION` | 403 | Check-in khi khong co goi active tai `today_vn`. |
| `ROOM_TIME_OVERLAP` | 409 | Phong co session overlap. |
| `TRAINER_TIME_OVERLAP` | 409 | PT co session overlap. |
| `SESSION_ALREADY_STARTED` | 409 | Sua lich khi session da bat dau. |
| `SESSION_CANCEL_WINDOW_CLOSED` | 409 | PT huy tre hon 2 gio truoc start. |
| `SESSION_NOT_CANCELLABLE` | 409 | Session da completed/cancelled. |
| `MEMBER_NOT_FOUND` | 404 | Device/manual check-in khong tim thay member. |
| `ATTENDANCE_ALREADY_OPEN` | 409 | Member da co attendance open. |
| `ATTENDANCE_ALREADY_CLOSED` | 409 | Checkout attendance da co `endTime`. |

## 8. Audit Action Codes Used

Da co trong Architecture v1.1.6 / conventions:

- `attendance.realtime-checkin`
- `attendance.manual-checkin`
- `training.cancel`
- `training.no_show`

Drift can sync vao Architecture phase tiep theo:

| Code | Trigger |
|---|---|
| `training.create` | POST `/training-sessions` |
| `training.update` | PATCH `/training-sessions/:id` |
| `attendance.checkout` | PATCH `/attendance-logs/:id/checkout` |
| `progress.record` | POST `/members/:id/progress` |
| `progress.delete` | DELETE `/member-progress/:id` |

## 9. Cron Interaction

- `training-session:auto-close` moi 15 phut:
  - Session `scheduled`/`in_progress` da qua `end_time + 15m` va co attendance matching `session_id` -> `completed`.
  - Khong co attendance -> `cancelled` + audit `training.no_show`.
- Endpoint Module 7 khong tu dong close session khi list. UI hien trang thai hien tai tu DB; cron la source of truth cho auto-close.

## 10. Cross-module Dependencies

- **Module 4:** Check active subscription khi tao session va check-in.
- **Module 6:** `roomId` FK vao `gym_rooms`; Module 6 block delete room neu con upcoming session.
- **Module 5 Staff:** `trainerStaffId` FK vao `staff`; PT filter bang `position`/group.
- **Module 9 Report:** Dung `training_sessions.completed`, `attendance_logs`, `member_progress` cho KPI.

## 11. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| All 11 | NOT IMPLEMENTED | Can scaffold `sessions/`, `attendance/`, progress write service. |

Required index khi implement:

- `training_sessions`: `@@index([memberId, startTime])`, `@@index([trainerStaffId, startTime])`, `@@index([roomId, startTime, endTime])`, `@@index([assignmentId])`, `@@index([planDayId])` da document trong Database.md.
- `attendance_logs`: can xem xet app-level dedupe storage `(deviceId, occurredAt)` neu them column v1.1; v1.0 chua co `device_id` column nen dedupe chi co the cache in-memory 60s hoac query theo member/start_time gan dung.
- `member_progress`: `@@index([memberId, recordedAt])` da document.

## 12. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-29 | Le Thanh An | Initial draft - 11 endpoint cho UC05A, UC05B, UC06 write. Chot device callback `POST /devices/access-events`, manual check-in fallback, progress write. Flag 5 audit code drift moi va note dedupe gap vi `attendance_logs` chua co `device_id`. |

