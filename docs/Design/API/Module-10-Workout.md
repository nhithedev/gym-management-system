# Module 10 — Workout Plan API

| Field | Value |
|---|---|
| Document ID | GMS-API-M10-001 |
| Version | 1.2.0 |
| Status | Draft |
| Author | Lê Thanh An (2026-05-23) |
| Reviewers | TBD |
| Last Updated | 2026-06-19 |
| Related docs | [`conventions.md`](./conventions.md), [`Architecture.md §4.3`](../Architecture.md), [`Database.md §EXERCISE, WORKOUT_PLAN, WORKOUT_LOG`](../Database.md), [`SRS_VI.md UC05A, UC06A, UC06B`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 10 đặc tả endpoint cho tính năng Workout Plan: thư viện bài tập, tạo/giao kế hoạch tập luyện, và ghi nhận kết quả buổi tập.

Ba UC bao phủ:

- UC05A — PT tạo workout plan template, cấu trúc ngày/bài tập, giao cho member.
- UC06A — Member ghi kết quả buổi tập (actual vs target), xem lịch sử.
- UC06B — Member tự tạo workout plan cho bản thân (không cần PT).

In-scope: 25 endpoint chia 3 resource (Exercises 6 / WorkoutPlans 16 / WorkoutLogs 3).

Out-of-scope v1.0:

- Workout plan template sharing/marketplace (defer v1.1).
- Progress analytics và recommendation engine (defer v1.2).
- Equipment-linked exercises tham chiếu Module 6 Facility (giữ loose coupling qua `equipment_needed` text field).

## 2. Endpoint Inventory

### Exercises

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 1 | GET | `/exercises` | — | JWT | `exercise.read` |
| 2 | POST | `/exercises` | UC05A | JWT | `exercise.create` |
| 3 | GET | `/exercises/external` | — | JWT | `exercise.read` |
| 4 | POST | `/exercises/import` | UC05A | JWT | `exercise.create` |
| 5 | PATCH | `/exercises/:id` | UC05A | JWT | `exercise.update` |
| 6 | DELETE | `/exercises/:id` | UC05A | JWT | `exercise.delete` |

### Workout Plans

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 7 | GET | `/workout-plans` | UC05A, UC06B | JWT | `workout_plan.create` |
| 8 | POST | `/workout-plans` | UC05A, UC06B | JWT | `workout_plan.create` |
| 9 | GET | `/workout-plans/suggested` | — | JWT | authenticated |
| 10 | GET | `/workout-plans/members/:memberId/assignments` | UC05A | JWT | authenticated |
| 11 | POST | `/workout-plans/members/:memberId/assign` | UC05A | JWT | authenticated |
| 12 | DELETE | `/workout-plans/assignments/:assignmentId` | UC05A | JWT | authenticated |
| 13 | GET | `/workout-plans/:id` | — | JWT | `workout_plan.create` |
| 14 | PATCH | `/workout-plans/:id` | UC05A | JWT | `workout_plan.update` |
| 15 | DELETE | `/workout-plans/:id` | UC05A | JWT | `workout_plan.delete` |
| 16 | GET | `/workout-plans/:id/assignments` | UC05A | JWT | `workout_plan.create` |
| 17 | POST | `/workout-plans/:id/days` | UC05A | JWT | `workout_plan.update` |
| 18 | PATCH | `/workout-plans/:id/days/:dayId` | UC05A | JWT | `workout_plan.update` |
| 19 | DELETE | `/workout-plans/:id/days/:dayId` | UC05A | JWT | `workout_plan.update` |
| 20 | POST | `/workout-plans/:id/days/:dayId/exercises` | UC05A | JWT | `workout_plan.update` |
| 21 | PATCH | `/workout-plans/:id/days/:dayId/exercises/:peId` | UC05A | JWT | `workout_plan.update` |
| 22 | DELETE | `/workout-plans/:id/days/:dayId/exercises/:peId` | UC05A | JWT | `workout_plan.update` |

### Workout Logs

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 23 | GET | `/workout-logs` | UC06A | JWT | `workout_log.read` |
| 24 | POST | `/workout-logs` | UC06A | JWT | `workout_log.create` |
| 25 | PATCH | `/workout-logs/:id` | UC06A | JWT | `workout_log.update` |

---

## 3. Glossary

| Term | Definition |
|---|---|
| Exercise | Đơn vị bài tập trong thư viện dùng chung. Có category (strength/cardio/flexibility/balance), muscle group text. Soft-deleted khi không còn sử dụng. |
| WorkoutPlan | Template kế hoạch tập luyện. Tạo một lần, giao cho nhiều member. Không sửa template khi đã có WorkoutLog. Status: `draft` → `active` → `archived`. |
| WorkoutPlanDay | Một buổi tập trong plan (Day 1, Day 2…). Chứa danh sách WorkoutPlanExercise. Unique constraint: `(planId, dayNumber)`. |
| WorkoutPlanExercise | Một bài tập trong một ngày của plan, bao gồm target (sets, reps, weight, duration, rest). Unique constraint: `(planDayId, orderIndex)`. |
| MemberWorkoutPlan | Assignment record: giao WorkoutPlan cho Member. Mỗi member chỉ có 1 assignment `active` tại một thời điểm — enforced qua `SELECT ... FOR UPDATE` trong assign transaction. Status: `active` → `replaced` hoặc `completed`. |
| WorkoutLog | Bản ghi một buổi tập thực tế của member. Liên kết với MemberWorkoutPlan và WorkoutPlanDay. |
| WorkoutLogSet | Kết quả thực tế của từng set trong buổi tập (actual reps/weight/duration so với target). |
| Plan-as-template | WorkoutPlan là template bất biến sau khi có log. Việc giao plan tạo MemberWorkoutPlan mới; log ghi vào MemberWorkoutPlan không sửa template. |
| Write-block | PATCH /workout-plans/:id trả 409 nếu plan đã có WorkoutLog. Bảo vệ historical data integrity. |
| Active-plan-per-member | Constraint mỗi member chỉ có 1 assignment `active` tổng cộng, bất kể member tự tạo hay PT giao. Enforced qua: (1) `SELECT ... WHERE memberId=:id AND status='active' FOR UPDATE` đầu assign transaction để serialize concurrent calls; (2) application replace toàn bộ active assignment trước khi tạo assignment mới. `@@index([memberId, status])` trong schema.prisma hỗ trợ lookup nhưng không phải unique index — không có DB-level guard. |
| 24h edit window | WorkoutLog chỉ có thể PATCH trong vòng 24 giờ kể từ `logged_at`. Sau đó read-only. |
| creatorType | Phân biệt `staff` (PT/trainer/staff tạo) vs `member` (member tự tạo). Ảnh hưởng visibility khi list. |

---

## 4. Exercises

### 4.1 GET /exercises

**UC:** Cross-cutting (xem danh mục bài tập)
**Auth:** JWT
**RBAC:** `exercise.read`

**Description:** List tất cả bài tập chưa bị soft-delete. Có thể filter theo category và muscleGroup.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `category` | enum | no | — | `strength`, `cardio`, `flexibility`, `balance` |
| `muscleGroup` | string | no | — | ILIKE search trong `muscle_group` |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "exerciseId": "1",
      "name": "Squat",
      "category": "strength",
      "muscleGroup": "legs",
      "equipmentNeeded": null,
      "description": null,
      "imageUrl": null,
      "createdByStaffId": null,
      "deletedAt": null,
      "createdAt": "2026-05-23T08:00:00Z"
    }
  ]
}
```

**Notes:** `deleted_at IS NOT NULL` records không trả về. Seeded 20 bài tập mặc định khi init DB.

---

### 4.2 POST /exercises

**UC:** UC05A (PT tạo bài tập vào library)
**Auth:** JWT
**RBAC:** `exercise.create`

**Request Body:**

```json
{
  "name": "Cable Fly",
  "category": "strength",
  "muscleGroup": "chest",
  "equipmentNeeded": "cable machine",
  "description": "Isolation exercise for chest muscles",
  "imageUrl": "https://example.com/cable-fly.jpg"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | 1-100 chars |
| `category` | enum | yes | `strength` / `cardio` / `flexibility` / `balance` |
| `muscleGroup` | string | no | max 100 chars |
| `equipmentNeeded` | string | no | max 100 chars |
| `description` | string | no | text |
| `imageUrl` | string | no | max 1000 chars |

**Response 201 Created:** Exercise object như GET response.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field constraint vi phạm |
| `UNAUTHORIZED` | 401 | JWT missing/invalid |
| `FORBIDDEN` | 403 | Role không có `exercise.create` |

**Audit:** `exercise.create` — payload `{exerciseId, name, category}`

---

### 4.3 GET /exercises/external

**Auth:** JWT
**RBAC:** `exercise.read`

**Description:** Proxy tới ExerciseDB API bên ngoài. Trả về danh sách bài tập từ nguồn external, không lưu vào DB.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `category` | string | no | — | Filter theo category từ ExerciseDB |
| `name` | string | no | — | Filter theo tên bài tập |
| `limit` | integer | no | — | Số kết quả tối đa trả về |
| `offset` | integer | no | — | Vị trí bắt đầu cho pagination |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [...]
}
```

---

### 4.4 POST /exercises/import

**UC:** UC05A (import bài tập từ ExerciseDB vào library)
**Auth:** JWT
**RBAC:** `exercise.create`

**Request Body:**

```json
{
  "name": "Barbell Squat",
  "category": "strength",
  "muscleGroup": "legs",
  "equipmentNeeded": "barbell",
  "description": "Compound lower body exercise",
  "imageUrl": "https://example.com/squat.jpg"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | — |
| `category` | enum | yes | `strength` / `cardio` / `flexibility` / `balance` |
| `muscleGroup` | string | no | — |
| `equipmentNeeded` | string | no | — |
| `description` | string | no | — |
| `imageUrl` | string | no | — |

**Response 200 OK:** Exercise object vừa import.

**Notes:** `@HttpCode(200)` override default 201 — endpoint import trả 200, không phải 201.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field constraint vi phạm |
| `UNAUTHORIZED` | 401 | JWT missing/invalid |
| `FORBIDDEN` | 403 | Role không có `exercise.create` |

---

### 4.5 PATCH /exercises/:id

**UC:** UC05A
**Auth:** JWT
**RBAC:** `exercise.update`

**Request Body:** Partial, bất kỳ field nào trong CreateExerciseDto.

**Response 200 OK:** Updated exercise object.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Exercise không tồn tại hoặc đã soft-deleted |
| `FORBIDDEN` | 403 | Role không có `exercise.update` |

**Audit:** `exercise.update` — payload `{exerciseId, changedFields}`

---

### 4.6 DELETE /exercises/:id

**UC:** UC05A (PT xóa bài tập khỏi library)
**Auth:** JWT
**RBAC:** `exercise.delete`

**Business rules:**

- WHEN exercise đang được tham chiếu bởi WorkoutPlanExercise trong plan có assignment `active` THEN 409 ConflictException — không thể xóa.
- WHEN không có active reference THEN soft-delete (`deleted_at = NOW()`).

**Response 200 OK:**

```json
{ "success": true }
```

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Exercise không tồn tại hoặc đã soft-deleted |
| `CONFLICT` | 409 | Exercise đang dùng trong active plan |

**Audit:** `exercise.delete` — payload `{exerciseId}`

---

## 5. Workout Plans

**Ownership policy cho mutation endpoints (§5.4–§5.10):**

- WHEN `creator_type = 'member'` THEN chỉ member tạo plan (`creator_member_id = caller.memberId`) mới được mutate. Caller khác → 403 `FORBIDDEN`.
- WHEN `creator_type = 'staff'` THEN bất kỳ caller nào có permission tương ứng (`workout_plan.update` / `workout_plan.delete`) đều được phép — không có owner-restriction cho staff-created plans.

**Write-block policy (BR-W02) — áp dụng cho §5.4 và §5.6–§5.10:**

WHEN `EXISTS (SELECT 1 FROM workout_logs wl JOIN member_workout_plans mwp ON mwp.assignment_id = wl.assignment_id WHERE mwp.plan_id = :planId)` THEN 409 `CONFLICT` — plan bất biến sau khi có log.

### 5.1 GET /workout-plans

**UC:** UC05A (trainer list plan của mình), UC06B (member list plan tự tạo)
**Auth:** JWT
**RBAC:** `workout_plan.create`

**Description:** List plans có filter theo role:
- `trainer` / `owner`: chỉ thấy plan do staff đó tạo (hoặc tất cả nếu owner).
- `member` (không có staff/trainer role): chỉ thấy plan do chính member đó tạo.
- `staff` / `owner`: thấy tất cả plans.

**Response 200 OK:** Array of plan objects, mỗi plan include days và exercises.

---

### 5.2 POST /workout-plans

**UC:** UC05A (PT tạo plan), UC06B (member tự tạo)
**Auth:** JWT
**RBAC:** `workout_plan.create`

**Request Body:**

```json
{
  "name": "Beginner Full Body 3x/week",
  "description": "Kế hoạch 12 tuần cho người mới"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | yes | 1-100 chars |
| `description` | string | no | text |

**Business rule — creatorType resolution:**
- WHEN caller có role `staff`, `trainer`, hoặc `owner` THEN `creator_type = 'staff'`, link `creator_staff_id`.
- WHEN caller chỉ có role `member` THEN `creator_type = 'member'`, link `creator_member_id`.

**Response 201 Created:** WorkoutPlan object với `status: "draft"`.

**Audit:** `workout_plan.create` — payload `{planId, name, creatorType}`

---

### 5.3 GET /workout-plans/suggested

**Auth:** JWT
**RBAC:** authenticated (no specific permission required)

**Description:** Trả về danh sách workout plan được đề xuất (suggested). Không yêu cầu RBAC permission — chỉ cần JWT hợp lệ.

**Response 200 OK:** Array of suggested plan objects.

---

### 5.4 GET /workout-plans/members/:memberId/assignments

**UC:** UC05A
**Auth:** JWT
**RBAC:** authenticated (no specific permission required)

**Path params:**

| Param | Type | Required |
|---|---|---|
| `memberId` | integer | yes |

**Query params:**

| Param | Type | Required | Description |
|---|---|---|---|
| `status` | string | no | Filter theo assignment status |
| `limit` | integer | no | Số kết quả tối đa |

**Response 200 OK:** Danh sách MemberWorkoutPlan assignments của member.

---

### 5.5 POST /workout-plans/members/:memberId/assign

**UC:** UC05A (PT giao plan cho member)
**Auth:** JWT
**RBAC:** authenticated (no specific permission required)

**Request Body:**

```json
{
  "planId": 5,
  "startDate": "2026-06-01",
  "notes": "Bắt đầu sau buổi evaluation"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `planId` | integer | yes | plan phải tồn tại, không soft-deleted |
| `startDate` | date string | yes | ISO 8601 `YYYY-MM-DD` |
| `notes` | string | no | text |

**Business rules — assignment transaction:**

0. WHEN `plan.status != 'active'` THEN 400 `PLAN_NOT_ACTIVE` — chỉ active plan mới có thể assign. Draft và archived plan bị từ chối.
1. Validate plan tồn tại, chưa soft-deleted, và có ít nhất 1 WorkoutPlanDay.
2. Trong transaction: `SELECT * FROM member_workout_plans WHERE member_id=:memberId AND status='active' FOR UPDATE`. WHEN tìm thấy THEN set toàn bộ active assignment thành `status='replaced'`, `ended_at=NOW()`, lưu `replacedAssignmentId` đầu tiên cho audit.
3. Tạo MemberWorkoutPlan mới với `status='active'`.

Bước 2 và 3 trong cùng DB transaction. `FOR UPDATE` ở bước 2 serialize concurrent assign calls cho cùng member.

**Notes:**
- `assignedByStaffId`: NULL khi member self-assign (caller không có staff profile); staffId khi PT/staff assign — resolve qua `staff.findFirst({ where: { userId: jwt.sub } })`.
- Member resolution cho `:memberId` param: lookup `members.memberId = :memberId` trực tiếp. Caller ownership không required — staff/PT có thể assign cho bất kỳ member nào.

**Response 201 Created:** MemberWorkoutPlan object mới.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan hoặc Member không tồn tại |
| `BAD_REQUEST` | 400 | Plan chưa có ngày tập nào |
| `PLAN_NOT_ACTIVE` | 400 | Plan không ở trạng thái `active` |

**Audit:** `workout_plan.assign` — payload `{assignmentId, memberId, planId, replacedAssignmentId?}`

---

### 5.6 DELETE /workout-plans/assignments/:assignmentId

**Auth:** JWT
**RBAC:** authenticated (no specific permission required)

**Path params:**

| Param | Type | Required |
|---|---|---|
| `assignmentId` | integer | yes |

**Response 200 OK:**

```json
{ "success": true }
```

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Assignment không tồn tại |
| `FORBIDDEN` | 403 | Caller không có quyền xóa assignment này |

---

### 5.7 GET /workout-plans/:id

**Auth:** JWT
**RBAC:** `workout_plan.create`

**Response 200 OK:** Full plan detail gồm days → exercises (include exercise library data), sorted by dayNumber/orderIndex.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại hoặc soft-deleted |

---

### 5.8 PATCH /workout-plans/:id

**UC:** UC05A (cập nhật template hoặc activate plan)
**Auth:** JWT
**RBAC:** `workout_plan.update`

**Request Body:** Partial — bất kỳ field nào:

```json
{
  "name": "Updated name",
  "status": "active"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | no | max 100 chars |
| `description` | string | no | text |
| `status` | enum | no | `draft` / `active` / `archived` |

**Business rule — write-block:**
- WHEN tồn tại ít nhất 1 WorkoutLog thuộc assignment của plan này THEN 409 `CONFLICT` — template bất biến sau khi có log.

**Status transition matrix:**

| From | To | Trigger | Guard |
|---|---|---|---|
| `draft` | `active` | PATCH `status='active'` | Plan phải có ≥1 WorkoutPlanDay (400 nếu không) |
| `draft` | `archived` | PATCH `status='archived'` | — |
| `active` | `archived` | PATCH `status='archived'` | Không có MemberWorkoutPlan `status='active'` trỏ plan (409 `CONFLICT` nếu có) |
| `archived` | — | — | Terminal state — mọi PATCH status → 400 `INVALID_TRANSITION` |

Lưu ý: write-block (plan có log) block tất cả PATCH plan bao gồm status transitions. §5.5 yêu cầu plan phải `active` trước khi assign — ngăn draft plan tích lũy log và bị khoá trong `draft`.
**Response 200 OK:** Updated plan object.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `CONFLICT` | 409 | Plan đã có workout log — write-block |

**Audit:** `workout_plan.update` — payload `{planId, changedFields}`

---

### 5.9 DELETE /workout-plans/:id

**Auth:** JWT
**RBAC:** `workout_plan.delete`

**Business rules:**
- WHEN tồn tại MemberWorkoutPlan với `status = 'active'` cho plan này THEN 409.
- WHEN không có active assignment THEN soft-delete plan (`deleted_at = NOW()`).

**Response 200 OK:**

```json
{ "success": true }
```

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `CONFLICT` | 409 | Plan đang active cho ít nhất 1 member |

**Audit:** `workout_plan.delete` — payload `{planId}`

---

### 5.10 GET /workout-plans/:id/assignments

**Auth:** JWT
**RBAC:** `workout_plan.create`

**Description:** List tất cả MemberWorkoutPlan assignments của một plan cụ thể.

**Response 200 OK:** Array of MemberWorkoutPlan objects.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `FORBIDDEN` | 403 | Role không có `workout_plan.create` |

---

### 5.11 POST /workout-plans/:id/days

**UC:** UC05A (thêm ngày tập vào plan)
**Auth:** JWT
**RBAC:** `workout_plan.update`

**Request Body:**

```json
{
  "dayNumber": 1,
  "name": "Day 1 — Chest & Triceps",
  "notes": "Focus on form, not weight",
  "weekNumber": 1,
  "dayOfWeek": 1
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `dayNumber` | integer | yes | `@Min(1)` — unique trong plan |
| `name` | string | yes | 1-100 chars |
| `notes` | string | no | text |
| `weekNumber` | integer | no | `@Min(1)` |
| `dayOfWeek` | integer | no | `@Min(1)`, `@Max(7)` |

**Business rules:**
- Validate `:id` plan tồn tại và chưa soft-deleted.
- Apply write-block (xem §5 Write-block policy): WHEN plan đã có WorkoutLog THEN 409 `CONFLICT`.

**Response 201 Created:** WorkoutPlanDay object.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan không tồn tại |
| `CONFLICT` | 409 | `dayNumber` đã tồn tại trong plan hoặc write-block |

---

### 5.12 PATCH /workout-plans/:id/days/:dayId

**Auth:** JWT
**RBAC:** `workout_plan.update`

**Request Body:** Partial — bất kỳ field nào:

| Field | Type | Required | Constraint |
|---|---|---|---|
| `name` | string | no | max 100 chars |
| `notes` | string | no | text |
| `dayNumber` | integer | no | `@Min(1)` |
| `weekNumber` | integer | no | `@Min(1)` |
| `dayOfWeek` | integer | no | `@Min(1)`, `@Max(7)` |

**Business rules:**
- Validate `:dayId` thuộc `:id` plan (404 nếu day không tồn tại hoặc thuộc plan khác).
- Apply write-block (xem §5 Write-block policy): WHEN plan đã có WorkoutLog THEN 409 `CONFLICT`.

**Response 200 OK:** Updated WorkoutPlanDay.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan hoặc Day không tồn tại |
| `CONFLICT` | 409 | Write-block: plan đã có workout log |

**Audit:** `workout_plan.update` — payload `{planId, dayId, changedFields}`

---

### 5.13 DELETE /workout-plans/:id/days/:dayId

**Auth:** JWT
**RBAC:** `workout_plan.update`

**Business rules:**
- Validate `:dayId` thuộc `:id` plan (404 nếu day không tồn tại hoặc thuộc plan khác).
- Apply write-block (xem §5 Write-block policy): WHEN plan đã có WorkoutLog THEN 409 `CONFLICT`.
- WHEN delete succeeds THEN cascade delete WorkoutPlanExercise trong ngày đó (`onDelete: Cascade` trên WorkoutPlanExercise → WorkoutPlanDay FK).

**Response 200 OK:**

```json
{ "success": true }
```

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan hoặc Day không tồn tại |
| `CONFLICT` | 409 | Write-block: plan đã có workout log |

---

### 5.14 POST /workout-plans/:id/days/:dayId/exercises

**UC:** UC05A (thêm bài tập vào ngày)
**Auth:** JWT
**RBAC:** `workout_plan.update`

**Request Body:**

```json
{
  "exerciseId": 1,
  "orderIndex": 0,
  "targetSets": 3,
  "targetReps": 10,
  "targetWeightKg": 60.0,
  "restSeconds": 90,
  "notes": "RPE 8"
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `exerciseId` | integer | yes | must reference existing Exercise |
| `orderIndex` | integer | yes | `@Min(0)` — unique trong day |
| `targetSets` | integer | yes | `@Min(1)` |
| `targetReps` | integer | no | `@Min(1)` |
| `targetDurationSec` | integer | no | `@Min(1)` — dùng cho cardio/flexibility |
| `targetWeightKg` | decimal(6,2) | no | `@Min(0)` |
| `restSeconds` | integer | no | default 60, `@Min(0)` |
| `notes` | string | no | text |

**Business rules:**
- Validate `:dayId` thuộc `:id` plan và `exerciseId` tồn tại (chưa soft-deleted).
- Apply write-block (xem §5 Write-block policy): WHEN plan đã có WorkoutLog THEN 409 `CONFLICT`.

**Response 201 Created:** WorkoutPlanExercise object.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Day hoặc Exercise không tồn tại |
| `CONFLICT` | 409 | `orderIndex` đã tồn tại trong day hoặc write-block |

---

### 5.15 PATCH /workout-plans/:id/days/:dayId/exercises/:peId

**Auth:** JWT
**RBAC:** `workout_plan.update`

**Request Body:** Partial — bất kỳ field nào:

| Field | Type | Required | Constraint |
|---|---|---|---|
| `targetSets` | integer | no | `@Min(1)` |
| `targetReps` | integer | no | `@Min(1)` |
| `targetDurationSec` | integer | no | `@Min(1)` |
| `targetWeightKg` | decimal(6,2) | no | `@Min(0)` |
| `restSeconds` | integer | no | `@Min(0)` |
| `notes` | string | no | text |

**Business rules:**
- Validate `:peId` thuộc `:dayId` thuộc `:id` plan.
- Apply write-block (xem §5 Write-block policy): WHEN plan đã có WorkoutLog THEN 409 `CONFLICT`.

**Response 200 OK:** Updated WorkoutPlanExercise object.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan, Day, hoặc PlanExercise không tồn tại |
| `CONFLICT` | 409 | Write-block: plan đã có workout log |

**Audit:** `workout_plan.update` — payload `{planId, dayId, peId, changedFields}`

---

### 5.16 DELETE /workout-plans/:id/days/:dayId/exercises/:peId

**Auth:** JWT
**RBAC:** `workout_plan.update`

**Business rules:**
- Validate `:peId` thuộc `:dayId` thuộc `:id` plan.
- Apply write-block (xem §5 Write-block policy): WHEN plan đã có WorkoutLog THEN 409 `CONFLICT`. (Write-block fires trước FK check.)
- WHEN tồn tại WorkoutLogSet tham chiếu `:peId` THEN 409 `CONFLICT` — `onDelete: Restrict` trên `WorkoutLogSet.planExerciseId` FK sẽ throw P2003; bắt và trả 409 thay vì 500.
- WHEN không có WorkoutLogSet references THEN hard delete WorkoutPlanExercise row.

**Response 200 OK:**

```json
{ "success": true }
```

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Plan, Day, hoặc PlanExercise không tồn tại |
| `CONFLICT` | 409 | Write-block hoặc có WorkoutLogSet tham chiếu |

---

## 6. Workout Logs

### 6.1 GET /workout-logs

**UC:** UC06A (member xem lịch sử buổi tập)
**Auth:** JWT
**RBAC:** `workout_log.read`

**Description:** List 50 workout logs gần nhất của member đang đăng nhập, sorted `logged_at DESC`. Include planDay và sets (với target từ exercise library).

**Notes:** Endpoint này scoped về member context: nếu caller là member, tự động filter `member_id = caller`. Trainer/staff cần endpoint riêng để xem log của member cụ thể (defer v1.1).

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "logId": "10",
      "memberId": "5",
      "assignmentId": "3",
      "planDayId": "2",
      "loggedAt": "2026-05-23T07:30:00Z",
      "durationMin": 65,
      "notes": null,
      "planDay": {
        "planDayId": "2",
        "dayNumber": 1,
        "name": "Day 1 — Chest & Triceps"
      },
      "sets": [
        {
          "logSetId": "1",
          "planExerciseId": "3",
          "setNumber": 1,
          "actualReps": 10,
          "actualWeightKg": "60.00",
          "actualDurationSec": null,
          "completed": true,
          "planExercise": {
            "targetSets": 3,
            "targetReps": 10,
            "targetWeightKg": "60.00",
            "exercise": {
              "exerciseId": "1",
              "name": "Bench Press"
            }
          }
        }
      ]
    }
  ]
}
```

---

### 6.2 POST /workout-logs

**UC:** UC06A (member ghi nhận kết quả buổi tập)
**Auth:** JWT
**RBAC:** `workout_log.create`

**Request Body:**

```json
{
  "assignmentId": 3,
  "planDayId": 2,
  "loggedAt": "2026-05-23T07:30:00Z",
  "durationMin": 65,
  "notes": "Felt strong today",
  "sets": [
    {
      "planExerciseId": 3,
      "setNumber": 1,
      "actualReps": 10,
      "actualWeightKg": 62.5,
      "completed": true
    },
    {
      "planExerciseId": 3,
      "setNumber": 2,
      "actualReps": 8,
      "actualWeightKg": 60.0,
      "completed": true
    }
  ]
}
```

| Field | Type | Required | Constraint |
|---|---|---|---|
| `assignmentId` | integer | yes | phải là assignment `active` của caller |
| `planDayId` | integer | yes | phải thuộc plan của assignment |
| `loggedAt` | datetime string | yes | ISO 8601 |
| `durationMin` | integer | no | `@Min(1)` |
| `notes` | string | no | text |
| `sets` | array | yes | mảng LogSet, có thể rỗng |
| `sets[].planExerciseId` | integer | yes | phải thuộc planDay |
| `sets[].setNumber` | integer | yes | unique trong `(logId, planExerciseId)` |
| `sets[].actualReps` | integer | no | actual vs target |
| `sets[].actualWeightKg` | decimal | no | decimal(6,2) |
| `sets[].actualDurationSec` | integer | no | cho cardio/flexibility |
| `sets[].completed` | boolean | no | default `true` |

**Business rules:**

- Member resolution: `jwt.sub → users.userId → members.memberId`. WHEN caller không có member profile THEN 403 `FORBIDDEN`.
- WHEN `assignmentId` không thuộc member đang đăng nhập THEN 403 `FORBIDDEN` (ownership violation — không phải 400).
- WHEN assignment không có `status = 'active'` THEN 400 `BAD_REQUEST`.
- Validate `planDayId` thuộc plan của assignment: `workout_plan_days.planId = assignment.planId`. WHEN không khớp THEN 400 `VALIDATION_ERROR`.
- WorkoutLog và tất cả WorkoutLogSet tạo trong cùng DB transaction.

**Response 201 Created:** WorkoutLog object include sets.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `FORBIDDEN` | 403 | Caller không có member profile hoặc assignment không thuộc caller |
| `BAD_REQUEST` | 400 | Assignment không active |
| `VALIDATION_ERROR` | 400 | `planDayId` không thuộc plan của assignment |

**Audit:** `workout_log.create` — payload `{logId, assignmentId, planDayId, setCount}`

---

### 6.3 PATCH /workout-logs/:id

**UC:** UC06A (sửa lỗi trong log vừa ghi)
**Auth:** JWT
**RBAC:** `workout_log.update`

**Request Body:** Chỉ `notes` và `durationMin` — không sửa sets qua endpoint này (v1.0).

```json
{
  "notes": "Correction: actually completed 3 sets",
  "durationMin": 70
}
```

**Business rules:**

- WHEN `logged_at < NOW() - 24h` THEN 403 — edit window đã hết.
- WHEN caller không phải member owner của log THEN 403.

**Response 200 OK:** Updated WorkoutLog object.

**Error codes:**

| Code | HTTP | Condition |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Log không tồn tại |
| `FORBIDDEN` | 403 | Ngoài 24h edit window hoặc không phải owner |

**Audit:** `workout_log.update` — payload `{logId, changedFields}`

---

## 7. Business Rules Summary

| Rule ID | Rule |
|---|---|
| BR-W01 | Mỗi member chỉ có 1 MemberWorkoutPlan `status = 'active'`. Assign plan mới auto-replace assignment cũ. |
| BR-W02 | WorkoutPlan template bất biến sau khi có WorkoutLog. PATCH plan trả 409 khi vi phạm. |
| BR-W03 | WorkoutLog chỉ sửa được trong 24h kể từ `logged_at`. |
| BR-W04 | Exercise soft-delete bị block khi đang tham chiếu bởi plan có active assignment. |
| BR-W05 | Assign plan yêu cầu plan phải có ít nhất 1 WorkoutPlanDay. |
| BR-W06 | Replace flow (BR-W01) chạy trong DB transaction: `updated_many(old→replaced)` + `create(new)` atomic. |

---

## 8. Data Notes

**BigInt serialization:** Tất cả PK (exerciseId, planId, planDayId, planExerciseId, assignmentId, logId, logSetId) trả về dạng string trong JSON response (xem `main.ts` BigInt patch).

**Decimal fields:** `targetWeightKg`, `actualWeightKg` trả về dạng string `"60.00"` từ Prisma Decimal.

**Timezone:** `loggedAt` và `createdAt` là UTC ISO 8601. Client chịu trách nhiệm convert sang local timezone khi hiển thị.

---

## 9. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-05-23 | Lê Thanh An | Initial draft — 19 endpoints (Exercises 4 + WorkoutPlans 11 + WorkoutLogs 3). UC05A/UC06A/UC06B. Business rules BR-W01..W06. |
| 1.1.0 | 2026-05-24 | Lê Thanh An | Post-review fixes (8 CRITICAL): LOG-C001 ownership policy §5 (member vs staff creator_type); LOG-C002 Glossary §3 Active-plan-per-member rewrite + SELECT FOR UPDATE §5.11; LOG-C003 write-block BR-W02 mở rộng sang §5.6–5.10; LOG-C004 member resolution path + ownership violation 400→403 §6.2; LOG-C005 status transition matrix §5.4 + PLAN_NOT_ACTIVE guard §5.11. Thêm P2003/FK Restrict handling §5.10. |
| 1.2.0 | 2026-06-19 | Lê Thanh An | Sync với controllers: thêm 6 routes thiếu (GET /exercises/external, POST /exercises/import, GET /workout-plans/suggested, GET /workout-plans/members/:memberId/assignments, DELETE /workout-plans/assignments/:assignmentId, GET /workout-plans/:id/assignments, PATCH /workout-plans/:id/days/:dayId/exercises/:peId). Sửa RBAC assign từ workout_plan.assign → authenticated. Sửa HTTP status DELETE từ 204 → 200 cho exercises/:id, workout-plans/:id, workout-plans/:id/days/:dayId, workout-plans/:id/days/:dayId/exercises/:peId, workout-plans/assignments/:assignmentId. Thêm imageUrl field vào CreateExerciseDto/ImportExerciseDto. Thêm weekNumber/dayOfWeek vào AddPlanDayDto/UpdatePlanDayDto. Cập nhật tổng route count: 19 → 25. |
