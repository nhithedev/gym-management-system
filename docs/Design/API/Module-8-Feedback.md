# Module 8 - Feedback API

| Field | Value |
|---|---|
| Document ID | GMS-API-M8-001 |
| Version | 1.0.0 |
| Status | Draft |
| Author | Le Thanh An (initial draft 2026-05-29) |
| Reviewers | TBD |
| Last Updated | 2026-05-29 |
| Related docs | [`conventions.md`](./conventions.md), [`Module-2-RBAC.md`](./Module-2-RBAC.md), [`Module-6-Facility.md`](./Module-6-Facility.md), [`Architecture.md §4.6, §5.2`](../Architecture.md), [`Database.md §feedback`](../Database.md), [`SRS_VI.md UC07`](../../VI/SRS_VI.md) |

---

## 1. Muc dich & Pham vi

Module 8 dac ta API tiep nhan va xu ly phan hoi cua hoi vien (`feedback` table). Bao trum UC07: member/staff tao phan hoi, staff tiep nhan, cap nhat ket qua xu ly, member xem trang thai phan hoi cua minh.

In-scope: 5 endpoint:

- List/detail feedback.
- Tao feedback.
- Tiep nhan feedback.
- Cap nhat trang thai xu ly.

Out-of-scope:

- In-app notification khi feedback duoc xu ly. V1.0 da bo notification feature.
- Email auto-escalation khi qua SLA. Defer v1.1 R16.
- File/anh dinh kem feedback. Defer toi khi Module Files hoan chinh.
- Anonymous feedback. V1.0 feedback phai gan `member_id`.

## 2. Endpoint Inventory

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/feedback` | UC07 | JWT | `feedback.read` HOAC `Self` | NEW |
| 2 | GET | `/feedback/:id` | UC07 | JWT | `feedback.read` HOAC `Self` | NEW |
| 3 | POST | `/feedback` | UC07 | JWT | `feedback.create` | NEW |
| 4 | PATCH | `/feedback/:id/assign` | UC07 | JWT | `feedback.handle` | NEW |
| 5 | PATCH | `/feedback/:id/status` | UC07 | JWT | `feedback.handle` | NEW |

Permission catalog da co trong `server/prisma/seed.ts`: `feedback.read`, `feedback.create`, `feedback.handle`.

---

## 3. Data Model

`feedback` (Database.md §feedback):

| Field | Type | Constraint | Note |
|---|---|---|---|
| `feedbackId` | BigInt string | PK | Auto-increment. |
| `memberId` | BigInt string | FK -> `members` | Nguoi gui phan hoi. |
| `feedbackType` | enum | `staff`, `equipment`, `service` | Quyet dinh subject required. |
| `content` | text | NOT NULL | Noi dung phan hoi. |
| `severity` | enum | `low`, `medium`, `high` | Default `low`. |
| `status` | enum | `open`, `in_progress`, `resolved`, `rejected` | Default `open`. |
| `handledByStaffId` | BigInt string | nullable FK -> `staff` | Nhan su dang xu ly / da xu ly. |
| `handledAt` | timestamp | nullable | Set khi terminal status `resolved`/`rejected`. |
| `subjectStaffId` | BigInt string | nullable FK -> `staff` | Required khi `feedbackType='staff'`. |
| `subjectEquipmentId` | BigInt string | nullable FK -> `equipment` | Required khi `feedbackType='equipment'`. |
| `createdAt` | timestamp | NOT NULL | Dung tinh SLA. |
| `deletedAt` | timestamp | nullable | Soft delete. |

Database CHECK `chk_feedback_subject`:

```text
feedbackType='staff'     -> subjectStaffId NOT NULL, subjectEquipmentId NULL
feedbackType='equipment' -> subjectEquipmentId NOT NULL, subjectStaffId NULL
feedbackType='service'   -> ca hai NULL
```

## 4. SLA & State Machine

SLA theo Architecture §4.6, tinh tu `createdAt` theo calendar days:

| Severity | SLA target |
|---|---|
| `high` | 1 ngay |
| `medium` | 3 ngay |
| `low` | 7 ngay |

API khong luu field `slaStatus` trong DB. Response co the tinh derived field:

```json
{
  "sla": {
    "dueAt": "2026-06-02T10:00:00.000Z",
    "overdue": false
  }
}
```

State machine:

```text
open -> in_progress -> resolved
open -> in_progress -> rejected
open -> rejected
```

Khong cho `resolved`/`rejected` quay lai `in_progress` trong v1.0. Neu can mo lai ticket, tao feedback moi.

---

## 5. Endpoints

### 5.1 GET /feedback

**UC:** UC07 dashboard feedback va "Phan hoi cua toi"  
**Auth:** JWT  
**RBAC:** `feedback.read` HOAC `Self`

List feedback co pagination/filter. Staff/Owner xem toan bo; member chi xem feedback cua minh.

**Query params:**

| Param | Type | Default | Mo ta |
|---|---|---|---|
| `page` | int | 1 | Pagination. |
| `pageSize` | int | 20 | Max 100. |
| `memberId` | string | - | Self bat buoc bang `self.member_id`. |
| `feedbackType` | enum | - | `staff`/`equipment`/`service`. |
| `severity` | enum | - | `low`/`medium`/`high`. |
| `status` | enum | - | `open`/`in_progress`/`resolved`/`rejected`. |
| `handledByStaffId` | string | - | Filter nguoi xu ly. |
| `subjectStaffId` | string | - | Filter feedback ve nhan su. |
| `subjectEquipmentId` | string | - | Filter feedback ve thiet bi. |
| `overdue` | boolean | false | Filter derived theo SLA. |
| `from` | date/datetime | - | `createdAt >= from`. |
| `to` | date/datetime | - | `createdAt <= to`. |
| `sort` | string | `created_at:desc` | Whitelist `created_at`, `severity`, `status`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "feedbackId": "20",
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "feedbackType": "equipment",
      "content": "May chay bo so 2 bi giat khi tang toc",
      "severity": "high",
      "status": "open",
      "handledByStaffId": null,
      "handledAt": null,
      "subjectStaffId": null,
      "subjectEquipmentId": "7",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "sla": {
        "dueAt": "2026-06-02T10:00:00.000Z",
        "overdue": false
      }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```

**Business rules:**

```text
WHEN caller la member chi match Self
THEN force memberId = self.member_id va ignore handledByStaffId filter
ELSE staff/owner co feedback.read co the filter rong

WHEN overdue=true
THEN service tinh dueAt theo severity va filter status IN ('open','in_progress') AND dueAt < NOW()
ELSE khong filter SLA
```

**Audit:** Khong log GET.

### 5.2 GET /feedback/:id

**Auth:** JWT  
**RBAC:** `feedback.read` HOAC `Self`

Tra detail 1 feedback, gom expanded subject neu co.

**Response 200 OK:** feedback object + `member`, `subjectStaff`, `subjectEquipment`, `handledByStaff`, `sla`.

**Errors:** `401`, `403`, `404`.

### 5.3 POST /feedback

**UC:** UC07 gui phan hoi  
**Auth:** JWT  
**RBAC:** `feedback.create`

Member tao feedback cua chinh minh; staff co the tao giup tai quay bang `memberId`.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | conditional | Staff/Owner gui ho. Member self khong can truyen. |
| `feedbackType` | enum | yes | `staff`/`equipment`/`service`. |
| `content` | string | yes | 10-2000 ky tu. |
| `severity` | enum | no | Default `low`. |
| `subjectStaffId` | string | conditional | Required khi `feedbackType='staff'`. |
| `subjectEquipmentId` | string | conditional | Required khi `feedbackType='equipment'`. |

```json
{
  "feedbackType": "equipment",
  "content": "May chay bo so 2 bi giat khi tang toc",
  "severity": "high",
  "subjectEquipmentId": "7"
}
```

**Response 201 Created:** feedback object status `open`.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Content qua ngan/dai, enum invalid. |
| 400 | `FEEDBACK_SUBJECT_MISMATCH` | Type va subject khong khop rule. |
| 400 | `FK_CONSTRAINT` | `memberId`, `subjectStaffId`, hoac `subjectEquipmentId` khong ton tai. |
| 403 | `FORBIDDEN` | Member co gang tao feedback cho member khac. |

**Business rules:**

```text
WHEN caller la member
THEN memberId = self.member_id, reject body memberId khac
ELSE staff/owner co feedback.create co the tao ho

WHEN feedbackType='staff' AND subjectStaffId IS NULL
THEN 400 FEEDBACK_SUBJECT_MISMATCH
ELSE proceed

WHEN feedbackType='equipment' AND subjectEquipmentId IS NULL
THEN 400 FEEDBACK_SUBJECT_MISMATCH
ELSE proceed

WHEN feedbackType='service' AND (subjectStaffId OR subjectEquipmentId)
THEN 400 FEEDBACK_SUBJECT_MISMATCH
ELSE INSERT status='open'
```

**Audit:** `feedback.create`. Drift can sync, xem §7.

### 5.4 PATCH /feedback/:id/assign

**UC:** UC07 staff tiep nhan phan hoi  
**Auth:** JWT  
**RBAC:** `feedback.handle`

Gan feedback cho staff xu ly va chuyen `open -> in_progress`. Neu khong truyen `handledByStaffId`, server dung `self.staff_id`.

**Request body:**

```json
{ "handledByStaffId": "4" }
```

**Response 200 OK:** feedback object da update.

**Errors:** `401`, `403`, `404`, `409 FEEDBACK_ALREADY_CLOSED`, `409 FEEDBACK_ALREADY_ASSIGNED`.

**Business rules:**

```text
WHEN feedback.status IN ('resolved','rejected')
THEN 409 FEEDBACK_ALREADY_CLOSED
ELSE proceed

WHEN feedback.status='in_progress' AND handledByStaffId khac current
THEN 409 FEEDBACK_ALREADY_ASSIGNED
ELSE UPDATE handled_by_staff_id, status='in_progress'
```

**Audit:** `feedback.assign`. Drift can sync, xem §7.

### 5.5 PATCH /feedback/:id/status

**UC:** UC07 xu ly phan hoi  
**Auth:** JWT  
**RBAC:** `feedback.handle`

Cap nhat trang thai terminal `resolved`/`rejected`, hoac doi severity khi dang open/in_progress.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `status` | enum | yes | `in_progress`, `resolved`, `rejected`. |
| `severity` | enum | no | Cho phep staff reclassify. |
| `resolutionNote` | string | conditional | Required khi `resolved` hoac `rejected`; luu trong audit payload v1.0. |

```json
{
  "status": "resolved",
  "resolutionNote": "Da khoa may va tao phieu bao tri cho thiet bi."
}
```

**Response 200 OK:** feedback object da update.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Status invalid hoac thieu `resolutionNote`. |
| 409 | `FEEDBACK_ALREADY_CLOSED` | Feedback da `resolved`/`rejected`. |
| 409 | `FEEDBACK_INVALID_STATE_TRANSITION` | Chuyen trang thai nguoc/sai state machine. |

**Business rules:**

```text
WHEN current status IN ('resolved','rejected')
THEN 409 FEEDBACK_ALREADY_CLOSED
ELSE proceed

WHEN body.status IN ('resolved','rejected') AND resolutionNote blank
THEN 400 VALIDATION_ERROR
ELSE proceed

WHEN body.status='resolved' OR 'rejected'
THEN set handled_at=NOW(), handled_by_staff_id=self.staff_id neu chua co
ELSE IF body.status='in_progress'
THEN set handled_by_staff_id=self.staff_id neu chua co
```

**Audit:** `feedback.update` hoac `feedback.resolve` tuy transition. Drift can sync, xem §7.

**Note equipment escalation:** Neu feedbackType=`equipment` va severity=`high`, staff co the tao maintenance log bang Module 6 `POST /equipment/:id/maintenance-logs`. V1.0 khong auto-create maintenance log de tranh spam/false positive; UI nen hien action shortcut.

---

## 6. Domain Error Codes

Standard codes: xem [`conventions.md §6`](./conventions.md).

| Code | HTTP | Trigger |
|---|---|---|
| `FEEDBACK_SUBJECT_MISMATCH` | 400 | `feedbackType` va `subjectStaffId`/`subjectEquipmentId` khong khop CHECK rule. |
| `FEEDBACK_ALREADY_CLOSED` | 409 | Update/assign feedback da resolved/rejected. |
| `FEEDBACK_ALREADY_ASSIGNED` | 409 | Assign feedback dang in_progress cho staff khac. |
| `FEEDBACK_INVALID_STATE_TRANSITION` | 409 | Chuyen trang thai sai state machine. |

## 7. Audit Action Codes Used

Architecture v1.1.6 chua list row Feedback trong audit inventory. Module 8 de xuat cac code sau:

| Code | Trigger |
|---|---|
| `feedback.create` | POST `/feedback` |
| `feedback.assign` | PATCH `/feedback/:id/assign` |
| `feedback.update` | PATCH `/feedback/:id/status` khi reclassify hoac set `in_progress` |
| `feedback.resolve` | PATCH `/feedback/:id/status` -> `resolved` |
| `feedback.reject` | PATCH `/feedback/:id/status` -> `rejected` |

Flag de sync vao Architecture v1.1.7/v1.1.8 cung audit drift tu Module 7.

## 8. Cron Interaction

- `feedback:sla-check` hang gio tinh badge qua han theo severity va `createdAt`. V1.0 khong persist badge vao DB; cron co the log/metric hoac warm cache neu can.
- Report Module 9 su dung feedback `severity`, `status`, `subjectStaffId` de tinh diem hai long/khieu nai theo nhan su.

## 9. Cross-module Dependencies

- **Module 4 Member:** Feedback luon gan `memberId`; Self ownership check qua `feedback.member.user_id = jwt.sub`.
- **Module 5 Staff:** `subjectStaffId` va `handledByStaffId` FK vao `staff`.
- **Module 6 Facility:** `subjectEquipmentId` FK vao `equipment`; staff co the tao maintenance log thu cong tu feedback high severity.
- **Module 9 Report:** Feedback ve staff/equipment la dau vao KPI chat luong dich vu.

## 10. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| All 5 | NOT IMPLEMENTED | Can scaffold `feedback/` controller/service/dto va ownership check Self. |

Required index da document trong Database.md:

- `idx_feedback_status(status, severity, created_at DESC) WHERE deleted_at IS NULL`
- `idx_feedback_member(member_id, created_at DESC)`
- `idx_feedback_handler(handled_by_staff_id) WHERE status IN ('in_progress','open')`

## 11. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-05-29 | Le Thanh An | Initial draft - 5 endpoint UC07, state machine open/in_progress/resolved/rejected, SLA derived field, subject validation theo DB CHECK, flag audit code drift Feedback. |
