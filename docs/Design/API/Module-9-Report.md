# Module 9 — Report API

| Field | Value |
|---|---|
| Document ID | GMS-API-M9-001 |
| Version | 1.1.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-24) |
| Reviewers | TBD |
| Last Updated | 2026-06-19 |
| Related docs | [`conventions.md`](./conventions.md), [`Architecture.md`](../Architecture.md), [`Database.md`](../Database.md), [`SRS_VI.md UC12`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 9 đặc tả 7 endpoint báo cáo tổng hợp (aggregation) phục vụ UC12 (Xem báo cáo thống kê). Tất cả endpoint đều read-only — truy vấn trực tiếp DB, không mutate dữ liệu.

In-scope:

- Báo cáo doanh thu theo khoảng thời gian (`/reports/revenue`).
- Báo cáo hội viên mới theo khoảng thời gian (`/reports/members`).
- Báo cáo tỷ lệ gia hạn (`/reports/renewals`).
- Báo cáo hiệu suất nhân viên (`/reports/employee-performance`).
- Báo cáo chi tiết hiệu suất nhân viên (`/reports/employee-performance/:staffId/detail`).
- Báo cáo hiệu suất PT (`/reports/staff-performance`).
- Báo cáo gói tập bán chạy nhất (`/reports/top-packages`).

Out-of-scope:

- Export PDF/Excel — defer v1.1 (BR-R07).
- Cache layer — v1.0 query trực tiếp DB, không có cache (BR-R06).
- Max date range enforcement — không giới hạn v1.0 (BR-R06). Queries lớn chịu latency cao — owner chịu trách nhiệm chọn range hợp lý.
- Báo cáo tồn kho thiết bị, lịch sử bảo trì tổng hợp — thuộc Module 6.
- Dashboard real-time widget (count hiện tại) — thuộc owner dashboard, không thuộc Report module.

---

## 2. Endpoint Inventory

| # | Method | Path | UC | Auth | RBAC | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/reports/revenue` | UC12 | JWT | `report.view` | IMPLEMENTED |
| 2 | GET | `/reports/members` | UC12 | JWT | `report.view` | IMPLEMENTED |
| 3 | GET | `/reports/renewals` | UC12 | JWT | `report.view` | IMPLEMENTED |
| 4 | GET | `/reports/employee-performance` | UC12 | JWT | `report.view` | IMPLEMENTED |
| 5 | GET | `/reports/employee-performance/:staffId/detail` | UC12 | JWT | `report.view` | IMPLEMENTED |
| 6 | GET | `/reports/staff-performance` | UC12 | JWT | `report.view` | IMPLEMENTED |
| 7 | GET | `/reports/top-packages` | UC12 | JWT | `report.view` | IMPLEMENTED |

Tổng: 7 endpoint, 7 implemented.

Permission `report.view` (`seed.ts` line 70): chỉ group `owner` được gán (seed `ROLE_PERMISSIONS.owner` bao gồm toàn bộ permission catalog — xem `seed.ts` line 114). `staff`, `trainer`, `member` không có `report.view`.

---

## 3. Common Query Parameters

Tất cả 4 endpoint dùng chung 2 query param sau:

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | Ngày bắt đầu range (inclusive). Phải `<= to`. |
| `to` | `YYYY-MM-DD` | Yes | Ngày kết thúc range (inclusive). Phải `<= today_vn`. |

`today_vn` = ngày hiện tại theo timezone `Asia/Ho_Chi_Minh` (conventions.md §10).

Validation fail → 400 `INVALID_DATE_RANGE`. Chi tiết xem BR-R01 (§8).

---

## 4. Data Sources

Bảng DB mỗi endpoint truy vấn:

| Endpoint | Bảng chính | Join/Filter |
|---|---|---|
| `/reports/revenue` | `payments` | `WHERE status='success' AND paid_at BETWEEN from AND to` |
| `/reports/members` | `members` | `WHERE created_at BETWEEN from AND to AND deleted_at IS NULL` |
| `/reports/renewals` | `subscriptions` | `members` left join `subscriptions`; filter `end_date` / `created_at` trong range |
| `/reports/staff-performance` | `staff`, `training_sessions` | `staff.position='trainer'`, `sessions.status='completed'`, `sessions.start_time BETWEEN from AND to`; join `feedback` cho score |

Schema field mapping (verified từ `server/prisma/schema.prisma`):

- `Payment.paidAt` → `paid_at` (Timestamp). `Payment.status` → enum `success | failed`.
- `Member.createdAt` → `created_at` (Timestamp). `Member.deletedAt` → `deleted_at`.
- `TrainingSession.startTime` → `start_time` (Timestamp). `TrainingSession.status` → enum `scheduled | in_progress | completed | cancelled`.
- `Staff.position` → string (không phải enum). Seed dùng value `'trainer'` cho PT — filter staff performance dùng `position = 'trainer'`.
- `Feedback.severity` → enum `low | medium | high`. Score mapping: `low=1, medium=2, high=3`.

---

## 5. Report Endpoints

### 5.1 GET /reports/revenue

**UC:** UC12 (Owner xem báo cáo doanh thu)
**Auth:** JWT
**RBAC:** `report.view`

**Description:** Tổng hợp doanh thu từ `payments` trong khoảng `[from, to]`. Chỉ tính payment có `status='success'`. Trả tổng và breakdown theo ngày.

**Query params:** xem §3 Common Query Parameters.

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "total": "15000000",
    "currency": "VND",
    "breakdown": [
      { "date": "2026-05-01", "amount": "2000000" },
      { "date": "2026-05-02", "amount": "3500000" }
    ]
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`total` là string (Decimal serialize theo convention BigInt/Decimal). `breakdown` là array các ngày có ít nhất 1 payment thành công — ngày không có payment không xuất hiện trong array (không trả `amount: "0"` cho ngày trống).

`currency` cố định `"VND"` v1.0 — không có multi-currency.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai `YYYY-MM-DD`. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB — log chi tiết server-side, trả generic message. |

**Audit:** Không log (read-only, conventions.md §18).

**Aggregation:**

```sql
SELECT
  DATE(paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
  SUM(amount) AS amount
FROM payments
WHERE status = 'success'
  AND paid_at >= '{from}'::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
  AND paid_at < ('{to}'::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
GROUP BY date
ORDER BY date ASC
```

`total` = SUM toàn bộ rows trong range (không group by date).

**WHEN-THEN-ELSE:**

- WHEN `from` hoặc `to` thiếu → 400 `INVALID_DATE_RANGE` ("Thiếu tham số from hoặc to").
- WHEN `from` > `to` → 400 `INVALID_DATE_RANGE` ("from phải trước hoặc bằng to").
- WHEN `to` > `today_vn` → 400 `INVALID_DATE_RANGE` ("to không được vượt quá ngày hiện tại").
- WHEN format sai (không phải `YYYY-MM-DD`) → 400 `INVALID_DATE_RANGE`.
- WHEN range hợp lệ nhưng không có payment nào → `data: { total: "0", currency: "VND", breakdown: [] }`, HTTP 200.
- WHEN DB query fail → catch exception, log chi tiết, trả 500 `REPORT_QUERY_ERROR`.
- ELSE truy vấn aggregation, trả 200 với `data` và `meta`.

---

### 5.2 GET /reports/members

**UC:** UC12 (Owner xem báo cáo hội viên mới)
**Auth:** JWT
**RBAC:** `report.view`

**Description:** Đếm hội viên đăng ký mới trong khoảng `[from, to]`. `Member.createdAt` là thời điểm tạo record trong `members`. Chỉ tính member chưa bị soft-delete (`deleted_at IS NULL`). Trả tổng và breakdown theo ngày.

**Query params:** xem §3 Common Query Parameters.

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "total": 12,
    "breakdown": [
      { "date": "2026-05-01", "count": 3 },
      { "date": "2026-05-05", "count": 2 }
    ]
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`total` là số nguyên. `breakdown` chỉ chứa ngày có ít nhất 1 hội viên mới.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

**Audit:** Không log.

**Aggregation:**

```sql
SELECT
  DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
  COUNT(*) AS count
FROM members
WHERE deleted_at IS NULL
  AND created_at >= '{from}'::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
  AND created_at < ('{to}'::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
GROUP BY date
ORDER BY date ASC
```

`total` = SUM `count` trên tất cả rows (không query lại — tính từ breakdown hoặc COUNT(*) không group by).

**WHEN-THEN-ELSE:**

- WHEN `from` / `to` thiếu hoặc format sai → 400 `INVALID_DATE_RANGE`.
- WHEN `from` > `to` → 400 `INVALID_DATE_RANGE`.
- WHEN `to` > `today_vn` → 400 `INVALID_DATE_RANGE`.
- WHEN range hợp lệ nhưng không có hội viên mới → `data: { total: 0, breakdown: [] }`, HTTP 200.
- WHEN DB query fail → 500 `REPORT_QUERY_ERROR`.
- ELSE trả 200 với tổng và breakdown.

---

### 5.3 GET /reports/renewals

**UC:** UC12 (Owner xem tỷ lệ gia hạn)
**Auth:** JWT
**RBAC:** `report.view`

**Description:** Tính tỷ lệ gia hạn của hội viên trong khoảng `[from, to]`. Định nghĩa:

- `eligible` = DISTINCT member có ít nhất 1 subscription với `end_date BETWEEN from AND to` (subscription hết hạn trong range). Member phải `deleted_at IS NULL`. Không lọc `deleted_at` trên subscription (subscription record giữ nguyên sau khi hết hạn).
- `renewed` = member trong `eligible` có thêm ít nhất 1 subscription mới với `start_date > MAX(end_date của subscription hết hạn trong range)` — tức là đã ký hợp đồng mới sau khi subscription cũ hết hạn.
- `churned` = `eligible - renewed`.
- `renewalRate` = `renewed / eligible` (float, round 2 decimal). Nếu `eligible = 0` → `renewalRate = null`.

**Query params:** xem §3 Common Query Parameters.

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "renewed": 8,
    "churned": 4,
    "renewalRate": 0.67
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`renewalRate` là float hoặc `null`. `renewed` và `churned` là số nguyên.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

**Audit:** Không log.

**Aggregation approach:**

```
eligible_members = SELECT DISTINCT s.member_id FROM subscriptions s
  INNER JOIN members m ON m.member_id = s.member_id
  WHERE s.end_date BETWEEN '{from}' AND '{to}'
    AND m.deleted_at IS NULL

renewed_members = SELECT e.member_id FROM eligible_members e
  WHERE EXISTS (
    SELECT 1 FROM subscriptions s2
    WHERE s2.member_id = e.member_id
      AND s2.start_date > (
        SELECT MAX(s1.end_date) FROM subscriptions s1
        WHERE s1.member_id = e.member_id
          AND s1.end_date BETWEEN '{from}' AND '{to}'
      )
  )
```

Implementation có thể dùng app-layer (Prisma findMany + Set operations) thay raw SQL nếu tiện hơn, miễn semantics giống nhau.

**WHEN-THEN-ELSE:**

- WHEN `from` / `to` thiếu hoặc format sai → 400 `INVALID_DATE_RANGE`.
- WHEN `from` > `to` → 400 `INVALID_DATE_RANGE`.
- WHEN `to` > `today_vn` → 400 `INVALID_DATE_RANGE`.
- WHEN `eligible = 0` → `data: { renewed: 0, churned: 0, renewalRate: null }`, HTTP 200. Không trả 404 — kết quả hợp lệ khi không có subscription hết hạn trong range.
- WHEN DB query fail → 500 `REPORT_QUERY_ERROR`.
- ELSE tính `eligible`, `renewed`, `churned`, `renewalRate`, trả 200.

---

### 5.4 GET /reports/staff-performance

**UC:** UC12 (Owner xem hiệu suất PT)
**Auth:** JWT
**RBAC:** `report.view`

**Description:** Tổng hợp hiệu suất từng PT trong khoảng `[from, to]`. Chỉ tính staff có `position = 'trainer'` (giá trị từ seed.ts — không phải enum). Session tính là `status = 'completed'` và `start_time` trong range. `avgFeedbackSeverityScore` là trung bình điểm severity của feedback `type='staff'` và `subject_staff_id = staffId` trong cùng range `[from, to]` (dựa trên `feedback.created_at`). Score mapping: `low=1, medium=2, high=3`. Trả `null` nếu không có feedback nào trong range. Query param `staffId` là tùy chọn — nếu truyền, chỉ trả dữ liệu PT đó, nếu không truyền trả tất cả PT.

**Query params:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |
| `staffId` | string | No | Filter 1 PT cụ thể (BigInt string). Nếu truyền nhưng staff không tồn tại hoặc không phải `position='trainer'` → trả `data: []`. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1001",
      "staffCode": "STF-2026-000001",
      "fullName": "Nguyen Van A",
      "completedSessions": 24,
      "avgFeedbackSeverityScore": 1.5
    },
    {
      "staffId": "1002",
      "staffCode": "STF-2026-000002",
      "fullName": "Le Thi B",
      "completedSessions": 18,
      "avgFeedbackSeverityScore": null
    }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`staffId` là string (BigInt). `staffCode` format `STF-{YYYY}-{6 digits}` (conventions.md §12). `avgFeedbackSeverityScore` là float (round 2 decimal) hoặc `null`. Kết quả sắp xếp theo `completedSessions DESC` mặc định.

PT soft-deleted (`staff.deleted_at IS NOT NULL` tại thời điểm query) không xuất hiện trong kết quả — bỏ qua bằng `WHERE staff.deleted_at IS NULL`.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 400 | `VALIDATION_ERROR` | `staffId` truyền nhưng không phải format string số nguyên hợp lệ. |
| 401 | `UNAUTHORIZED` | — |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

**Audit:** Không log.

**Aggregation approach:**

```
SELECT
  s.staff_id,
  s.staff_code,
  u.full_name,
  COUNT(ts.session_id) FILTER (WHERE ts.status = 'completed') AS completed_sessions,
  AVG(
    CASE f.severity WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END
  ) AS avg_feedback_severity_score
FROM staff s
JOIN users u ON s.user_id = u.user_id
LEFT JOIN training_sessions ts
  ON ts.trainer_staff_id = s.staff_id
  AND ts.status = 'completed'
  AND ts.start_time >= '{from}'::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
  AND ts.start_time < ('{to}'::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
  AND ts.deleted_at IS NULL
LEFT JOIN feedback f
  ON f.subject_staff_id = s.staff_id
  AND f.feedback_type = 'staff'
  AND f.created_at >= '{from}'::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
  AND f.created_at < ('{to}'::date + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh'
  AND f.deleted_at IS NULL
WHERE s.position = 'trainer'
  AND s.deleted_at IS NULL
  [AND s.staff_id = {staffId}  -- nếu query param staffId được truyền]
GROUP BY s.staff_id, s.staff_code, u.full_name
ORDER BY completed_sessions DESC, s.staff_id ASC
```

`AVG` trên NULL-safe: Postgres `AVG` tự bỏ qua NULL → nếu không có feedback nào → NULL → serialize thành `null` trong JSON.

**WHEN-THEN-ELSE:**

- WHEN `from` / `to` thiếu hoặc format sai → 400 `INVALID_DATE_RANGE`.
- WHEN `from` > `to` → 400 `INVALID_DATE_RANGE`.
- WHEN `to` > `today_vn` → 400 `INVALID_DATE_RANGE`.
- WHEN `staffId` truyền nhưng không phải format string số nguyên hợp lệ → 400 `VALIDATION_ERROR`.
- WHEN không có PT nào có `position='trainer'` (hoặc `staffId` không match) → `data: []`, HTTP 200.
- WHEN PT có session trong range nhưng không có feedback → `avgFeedbackSeverityScore: null` cho PT đó.
- WHEN DB query fail → 500 `REPORT_QUERY_ERROR`.
- ELSE trả 200 với array PT và `meta`.

---

### 5.5 GET /reports/employee-performance

**UC:** UC12 (Owner xem báo cáo hiệu suất nhân viên)
**Auth:** JWT
**RBAC:** `report.view`

**Description:** Tổng hợp hiệu suất tất cả nhân viên (bao gồm trainer, staff) trong khoảng `[from, to]`. Trả tổng số session hoàn thành và thông tin nhân viên.

**Query params:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "staffId": "1001",
      "staffCode": "STF-2026-000001",
      "fullName": "Nguyen Van A",
      "completedSessions": 24
    },
    {
      "staffId": "1002",
      "staffCode": "STF-2026-000002",
      "fullName": "Le Thi B",
      "completedSessions": 18
    }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`staffId` là string (BigInt). `staffCode` format `STF-{YYYY}-{6 digits}`. Nhân viên soft-deleted không xuất hiện trong kết quả.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

**Audit:** Không log.

**WHEN-THEN-ELSE:**

- WHEN `from` / `to` thiếu hoặc format sai → 400 `INVALID_DATE_RANGE`.
- WHEN `from` > `to` → 400 `INVALID_DATE_RANGE`.
- WHEN `to` > `today_vn` → 400 `INVALID_DATE_RANGE`.
- WHEN không có nhân viên nào có session trong range → `data: []`, HTTP 200.
- WHEN DB query fail → 500 `REPORT_QUERY_ERROR`.
- ELSE trả 200 với array nhân viên và `meta`.

---

### 5.6 GET /reports/employee-performance/:staffId/detail

**UC:** UC12 (Owner xem chi tiết hiệu suất nhân viên cụ thể)
**Auth:** JWT
**RBAC:** `report.view`

**Description:** Tổng hợp chi tiết hiệu suất của một nhân viên cụ thể trong khoảng `[from, to]`. Trả thông tin nhân viên, số session hoàn thành, và chi tiết breakdown session.

**Path Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `staffId` | string | Yes | ID của nhân viên (BigInt string) |

**Query params:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "staffId": "1001",
    "staffCode": "STF-2026-000001",
    "fullName": "Nguyen Van A",
    "position": "trainer",
    "completedSessions": 24,
    "totalHours": 48.5,
    "breakdown": [
      { "date": "2026-05-01", "sessionCount": 2, "hours": 4.0 },
      { "date": "2026-05-02", "sessionCount": 3, "hours": 6.5 }
    ]
  },
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`staffId` là string (BigInt). `totalHours` là float. `breakdown` chỉ chứa ngày có session hoàn thành.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 404 | `NOT_FOUND` | nhân viên với ID `staffId` không tồn tại hoặc đã bị soft-delete. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

**Audit:** Không log.

**WHEN-THEN-ELSE:**

- WHEN `from` / `to` thiếu hoặc format sai → 400 `INVALID_DATE_RANGE`.
- WHEN `from` > `to` → 400 `INVALID_DATE_RANGE`.
- WHEN `to` > `today_vn` → 400 `INVALID_DATE_RANGE`.
- WHEN nhân viên không tồn tại hoặc đã bị soft-delete → 404 `NOT_FOUND`.
- WHEN nhân viên tồn tại nhưng không có session trong range → `data: { ..., completedSessions: 0, breakdown: [] }`, HTTP 200.
- WHEN DB query fail → 500 `REPORT_QUERY_ERROR`.
- ELSE trả 200 với chi tiết nhân viên và `meta`.

---

### 5.7 GET /reports/top-packages

**UC:** UC12 (Owner xem báo cáo gói tập bán chạy)
**Auth:** JWT
**RBAC:** `report.view`

**Description:** Tổng hợp các gói tập bán chạy nhất trong khoảng `[from, to]`. Sắp xếp theo số lượng bán (descending). Chỉ tính subscription được tạo trong range.

**Query params:**

| Param | Type | Required | Constraint |
|---|---|---|---|
| `from` | `YYYY-MM-DD` | Yes | xem §3. |
| `to` | `YYYY-MM-DD` | Yes | xem §3. |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "packageId": "1",
      "name": "Basic",
      "durationMonths": 1,
      "price": 500000,
      "soldCount": 42,
      "revenue": 21000000
    },
    {
      "packageId": "2",
      "name": "Premium",
      "durationMonths": 3,
      "price": 1200000,
      "soldCount": 28,
      "revenue": 33600000
    }
  ],
  "meta": { "from": "2026-05-01", "to": "2026-05-31" }
}
```

`packageId` là string (BigInt). `soldCount` là số lượng subscription. `revenue` là tổng doanh thu từ gói đó (không nhất thiết bằng `price * soldCount` nếu có discount). Gói không bán được không xuất hiện trong kết quả.

**Errors:**

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | `from > to` hoặc `to > today_vn` hoặc format sai. |
| 401 | `UNAUTHORIZED` | Token thiếu / sai / expired. |
| 403 | `FORBIDDEN` | Thiếu `report.view`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation từ DB. |

**Audit:** Không log.

**WHEN-THEN-ELSE:**

- WHEN `from` / `to` thiếu hoặc format sai → 400 `INVALID_DATE_RANGE`.
- WHEN `from` > `to` → 400 `INVALID_DATE_RANGE`.
- WHEN `to` > `today_vn` → 400 `INVALID_DATE_RANGE`.
- WHEN không có subscription nào trong range → `data: []`, HTTP 200.
- WHEN DB query fail → 500 `REPORT_QUERY_ERROR`.
- ELSE trả 200 với array gói tập và `meta`.

---

## 6. Error Codes Appendix

Standard codes: xem [`conventions.md §6`](./conventions.md).

Domain-specific Module 9:

| HTTP | Code | Trigger |
|---|---|---|
| 400 | `INVALID_DATE_RANGE` | BR-R01: `from > to`, `to > today_vn`, format sai `YYYY-MM-DD`, hoặc thiếu 1 trong 2 param. |
| 400 | `VALIDATION_ERROR` | `staffId` query param (§5.4) không phải string số nguyên hợp lệ. Standard code từ `conventions.md §6`. |
| 500 | `REPORT_QUERY_ERROR` | Lỗi aggregation DB — log chi tiết server-side (`console.error` hoặc logger), trả `{ success: false, code: "REPORT_QUERY_ERROR", message: "Lỗi khi tổng hợp báo cáo" }`. |

Empty range responses (không có data trong range) → HTTP 200 với `data` rỗng / zero values, KHÔNG phải 404 hay error.

---

## 7. Audit Action Codes Used

Tất cả 4 endpoint đều read-only. Theo conventions.md §18: "KHÔNG log GET". Không có audit action code nào được dùng trong Module 9.

---

## 8. Business Rules

| Code | Rule |
|---|---|
| BR-R01 | `from` và `to` bắt buộc. `from <= to`. `to <= today_vn`. Format `YYYY-MM-DD`. Vi phạm bất kỳ điều kiện nào → 400 `INVALID_DATE_RANGE`. |
| BR-R02 | Revenue: `SUM(payments.amount) WHERE status='success' AND paid_at BETWEEN from AND to`. Field `paid_at` (Prisma `paidAt`) được xác nhận từ `schema.prisma` line 341. |
| BR-R03 | Members: `COUNT(members) WHERE createdAt BETWEEN from AND to AND deletedAt IS NULL`. Chỉ đếm hội viên chưa bị soft-delete tại thời điểm query. |
| BR-R04 | Renewals: `eligible` = member có subscription `end_date` trong range. `renewed` = member trong `eligible` có thêm subscription mới sau khi subscription cũ hết hạn. `renewalRate = renewed / eligible` (round 2 decimal). Nếu `eligible = 0` → `renewalRate = null` (tránh chia-0). |
| BR-R05 | Staff performance: chỉ `position='trainer'` (string value từ seed). Sessions phải `status='completed'` và `start_time` trong range. `avgFeedbackSeverityScore`: `low=1, medium=2, high=3`, AVG; `null` nếu không có feedback về PT đó trong range. |
| BR-R06 | Không cache — query trực tiếp DB mỗi request. Không giới hạn max date range v1.0. |
| BR-R07 | Export PDF/Excel defer v1.1. |

---

## 9. Implementation Status

| Endpoint | Status | Note |
|---|---|---|
| GET /reports/revenue | IMPLEMENTED | Returns with `success: true` wrapper. |
| GET /reports/members | IMPLEMENTED | Returns with `success: true` wrapper. |
| GET /reports/renewals | IMPLEMENTED | Returns with `success: true` wrapper. |
| GET /reports/employee-performance | IMPLEMENTED | Returns with `success: true` wrapper. |
| GET /reports/employee-performance/:staffId/detail | IMPLEMENTED | Returns with `success: true` wrapper. |
| GET /reports/staff-performance | IMPLEMENTED | Returns with `success: true` wrapper. Query param `staffId` is optional. |
| GET /reports/top-packages | IMPLEMENTED | Returns with `success: true` wrapper. |

Recommended DB indexes khi implement (chưa có trong `schema.prisma` ngoài indexes hiện hữu):

- `@@index([paidAt])` trên `payments` — Revenue query lọc `paid_at` range. Hiện `schema.prisma` có `@@index([memberId, paidAt(sort: Desc)])` và `@@index([status, paidAt(sort: Desc)])` — index `[status, paidAt]` đủ cho query revenue (filter `status='success'` + range `paidAt`). Không cần thêm.
- `@@index([createdAt])` trên `members` — Members report lọc `created_at` range. Hiện chưa có index trên `created_at` đơn lẻ; cân nhắc thêm khi bảng `members` lớn.
- `@@index([startTime])` trên `training_sessions` — Staff performance query lọc `start_time` range. Hiện chưa có. Thêm `@@index([trainerStaffId, startTime(sort: Desc)])` composite để cover cả filter trainer và range.
- `@@index([subjectStaffId, createdAt])` trên `feedback` — Staff performance join feedback theo PT và range. Hiện chưa có index trên `subject_staff_id`. Thêm `@@index([subjectStaffId, createdAt(sort: Desc)])`.

Tất cả index change defer khi implement Module 9 PR (atomic với migration).

`position = 'trainer'` filter: `Staff.position` là `String` (không enum). Nếu seed thêm staff với position khác (`'owner'`, `'staff'`) thì query tự exclude. Nếu sau này thêm enum `StaffPosition`, cập nhật filter cho khớp enum value.

---

## 10. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.1.0 | 2026-06-19 | Lê Thanh An | Sync doc với implementation — add 3 missing endpoints: §5.5 employee-performance, §5.6 employee-performance/:staffId/detail, §5.7 top-packages. Update endpoint inventory từ 4 → 7. Mark tất cả endpoints IMPLEMENTED. Clarify staff-performance query param staffId là optional (dùng StaffPerformanceQueryDto). |
| 1.0.1 | 2026-05-24 | Lê Thanh An | Fix §5.2/§5.4 date arithmetic (`{to+1}` → proper INTERVAL syntax). Rewrite §5.3 renewals definition thành 1 definition nhất quán (eligible/renewed dựa trên MAX(end_date)). Thêm `VALIDATION_ERROR` vào §5.4 Errors table. Thêm `s.staff_id ASC` tie-breaker vào §5.4 ORDER BY. |
| 1.0.0 | 2026-05-24 | Lê Thanh An | Initial draft — 4 endpoint báo cáo read-only (revenue, members, renewals, staff-performance). UC12 coverage. Permission `report.view` owner-only. BR-R01..BR-R07. Field names verified từ schema.prisma. |
