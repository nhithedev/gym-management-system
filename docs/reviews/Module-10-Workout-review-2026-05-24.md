# Module-10-Workout API Review — Executive Summary

| Field | Value |
|---|---|
| Document | docs/Design/API/Module-10-Workout.md (v1.0.0 Draft) |
| Date | 2026-05-24 |
| Reviewer | doc-review pipeline (automated) |
| Status | FAIL — 8 CRITICAL (3 structural + 5 logic) must fix before implementation |

---

## Review Pipeline Status

| Vòng | Tên | Status | Score / Issues |
|---|---|---|---|
| 1a | Structure + Cross-Reference | FAIL | 60/100 — 3C, 6M, 7m |
| 1b | Anti-AI Writing | PASS | AI Score: 8 (HUMAN) |
| 2 | Logic + Business Rule | FAIL | 5C, 9M, 6m, 3S |
| 3 | Reader Comprehension | FAIL | 67% HIGH confidence (threshold 90%), 20% LOW |
| **OVERALL** | | **FAIL** | 8 CRITICAL open |

---

## Vòng 1a — Structural Issues

### CRITICAL

| ID | Mô tả | Fix |
|---|---|---|
| STR-C001 | README.md ghi "WorkoutPlans 12" nhưng spec §1 và inventory table có 11 endpoint — count mismatch tạo contractual ambiguity | Sửa README.md: "WorkoutPlans 11" |
| STR-C002 | 9 audit action codes (`exercise.create/update/delete`, `workout_plan.create/update/delete/assign`, `workout_log.create/update`) không có trong global catalog `conventions.md §18` và `Architecture §4.4.1` | Thêm vào conventions.md §18 và Architecture §4.4.1 |
| STR-C003 | Module dùng `RESOURCE_NOT_FOUND` (9 chỗ) nhưng `conventions.md §6` catalog định nghĩa `NOT_FOUND` cho HTTP 404. Project-wide policy decision cần chốt — nếu giữ `RESOURCE_NOT_FOUND` thì conventions.md phải update, không phải module | Chốt policy: conventions.md vs module |

### MAJOR

| ID | Mô tả |
|---|---|
| STR-M001 | GET /exercises, GET /workout-plans, GET /workout-logs không có pagination spec — vi phạm conventions.md §7 |
| STR-M002 | GET /workout-plans và GET /workout-plans/:id gate trên `workout_plan.create` — không có `workout_plan.read` permission. `staff` role không có `workout_plan.create` → không list được plan |
| STR-M003 | Glossary §3 claim "partial unique index" trên `member_workout_plans(member_id) WHERE status='active'` nhưng schema.prisma chỉ có `@@index([memberId, status])` — không phải unique constraint |
| STR-M004 | Thiếu `UNAUTHORIZED 401` trong error tables: §4.3, §4.4, §6.1, §6.2, §6.3 |
| STR-M005 | GET /workout-plans (§5.1) visibility rules mâu thuẫn cho `owner` role (bullet 1 vs bullet 3) và `staff` role không được xử lý nhất quán |
| STR-M006 | DELETE /workout-plans/:id/days/:dayId (§5.8) không có error code table |

### MINOR (7 issues — STR-m001..m007)

Chi tiết trong section riêng bên dưới.

---

## Vòng 1b — Anti-AI Writing

**PASS. AI Score: 8 (HUMAN).** Document có nhiều human signals rõ ràng: "v1.0 accept risk" note, defer/TBD cụ thể, trade-off design decision được giải thích, business terms tự đặt tên (`Plan-as-template`, `Write-block`). Hai phrase nhẹ cần sửa:

- §4.1: "Có thể filter" → "Filter hỗ trợ: `category` exact match, `muscleGroup` ILIKE search"
- §1 Out-of-scope: "giữ loose coupling qua text field" → làm rõ implication kỹ thuật (không FK đến Module 6)

---

## Vòng 2 — Logic Issues

### CRITICAL (phải fix trước implement)

| ID | File / Section | Mô tả | Fix |
|---|---|---|---|
| LOG-C001 | §5.4, §5.6–5.10 | Không có ownership check trên PATCH plan và sub-endpoints — Member A có thể mutate plan của Member B hoặc trainer khác | Thêm rule: creator_type='member' → chỉ creator-member mới sửa; staff/trainer có thể sửa mọi plan (hoặc chọn policy khác và document rõ) |
| LOG-C002 | §3 Glossary, BR-W01, §5.11 | Partial unique index claim không đúng — schema.prisma chỉ có `@@index([memberId, status])` không phải unique. Race condition concurrent assign không có DB-level guard | Thêm `CREATE UNIQUE INDEX ... WHERE status = 'active'` hoặc `SELECT ... FOR UPDATE` trong transaction assign; sửa Glossary |
| LOG-C003 | §5.4, §5.6–5.10, BR-W02 | Write-block chỉ document tại PATCH plan (§5.4) nhưng 5 sub-endpoints (add/delete day, add/delete exercise) không check — có thể bypass write-block hoàn toàn | Apply write-block `assertPlanNotLocked(planId)` cho tất cả §5.6–5.10; §5.8 day delete cần trả 409 thay vì gây P2003 FK error |
| LOG-C004 | §6.2 Business rules | Member resolution path từ `jwt.sub` → `memberId` không document; error code 400 cho "assignment không thuộc caller" vi phạm convention (nên 403); enumeration risk | Document join path; tách error code: 403 cho ownership violation, 400/409 cho assignment không active |
| LOG-C005 | §5.4, §5.11, §5.1, BR-W02 | Status machine dead state: plan `draft` có thể được assign → có log → write-block fires → plan stuck in draft, không thể transition sang active hay archived. Archived plan có thể được assign (§5.11 không check status) | §5.11 thêm: "WHEN plan.status != 'active' THEN 400 PLAN_NOT_ACTIVE"; §5.4 document full transition matrix |

### MAJOR (9 issues)

| ID | Mô tả |
|---|---|
| LOG-M001 | GET /workout-plans dùng `workout_plan.create` làm gate — staff có `workout_plan.assign` không có `workout_plan.create` → assign workflow bị broken |
| LOG-M002 | GET /workout-logs không define behavior khi caller là trainer/staff (không có member profile) — có thể trả all logs (security breach) hoặc error |
| LOG-M003 | POST /workout-logs: planDayId validation không document join path — developer có thể chỉ check "planDayId exists" thay vì "planDayId thuộc plan của assignment" |
| LOG-M004 | DELETE /exercises: protection rule "active assignment" quá narrow — exercise trong plan có completed/replaced assignment vẫn có WorkoutLogSet tham chiếu; FK Restrict sẽ block delete bất kể assignment status |
| LOG-M005 | PATCH /workout-plans/:id/days/:dayId (§5.7): thiếu write-block check + thiếu validation dayId thuộc planId. Áp dụng tương tự cho §5.8, §5.9, §5.10 |
| LOG-M006 | POST /workout-plans/members/:memberId/assign không document cách populate `assignedByStaffId` (null khi member self-assign, staffId khi PT assign) |
| LOG-M007 | 24h edit window: `loggedAt` là client-supplied → member có thể backdate log 25h → log ngay lập tức immutable khi tạo. Cần validate max backdate window |
| LOG-M008 | DELETE /workout-plans/:id/days/:dayId/exercises/:peId: spec claim "onDelete: Cascade" nhưng schema default là `Restrict` — sẽ throw P2003 unhandled 500, không phải 200 OK |
| LOG-M009 | GET /workout-plans (§5.1) visibility rules mâu thuẫn + không document cách resolve `caller.staffId` từ jwt.sub |

### MINOR (6 issues — LOG-N001..N006)

Xem phần bên dưới.

### SUGGESTION (3 items — LOG-S001..S003)

- LOG-S001: Self-assign path `/workout-plans/members/:memberId/assign` semantic awkward với UC06B
- LOG-S002: `MemberWorkoutPlan.status = 'completed'` không có endpoint nào trigger — dead state
- LOG-S003: Không có endpoint để member biết current assignment của mình (GET my-assignment) — circular dependency cho first-time log

---

## Vòng 3 — Reader Comprehension

**Verdict: PARTIAL (67% HIGH confidence, 20% LOW — threshold 90% HIGH / <20% LOW)**

| Câu hỏi | Confidence | Issue |
|---|---|---|
| 1. Member xem plan của trainer | HIGH | OK |
| 2. Write-block sau khi có log | HIGH | OK |
| 3. Assignment không thuộc caller | HIGH | OK — nhưng spec dùng 400 thay vì 403 |
| 4. Staff permission check | MEDIUM | Spec không có role-permission table |
| 5. POST /days sau khi có log | LOW | Write-block không document cho sub-endpoints |
| 6. Member UC06B flow | LOW | Permission mapping không document |
| 7. Delete exercise đang dùng | HIGH | OK |
| 8. Filter log theo thời gian | HIGH | OK — không có filter |
| 9. Replace flow status | HIGH | OK |
| 10. 24h edit window | HIGH | OK |
| 11. Archive plan với active assignments | LOW | Không bị block — dead state risk |
| 12. `sets: []` cho phép | HIGH | OK |
| 13. Transaction replace | HIGH | OK |
| 14. 401 GET /exercises | MEDIUM | §4.1 không có error table |
| 15. Assign archived plan | HIGH | OK — gap rõ ràng, không phải ambiguity |

**TOP 3 ambiguities (developer không thể implement đúng từ tài liệu):**

1. Write-block không nhất quán — §5.6 POST /days và các sub-endpoints không nêu có bị write-block hay không → 2 developer implement 2 cách khác nhau đều "đúng theo tài liệu"
2. Permission mapping cho UC06B — member cần `workout_plan.update` để add day/exercise nhưng tài liệu không document role-permission table; nếu cấp `workout_plan.update` cho member họ có thể sửa plan của trainer
3. Archive plan với active assignments không bị block — sau archive, member đang có active assignment trỏ plan archived, không rõ còn log được không

---

## Recommended Actions — Theo Priority

### Phải fix trước implement (CRITICAL × 8)

1. **LOG-C002 + STR-M003** (cùng issue, khác file): Thêm partial unique index thực sự vào schema.prisma + sửa Glossary §3
2. **LOG-C003**: Apply write-block check (`assertPlanNotLocked`) cho §5.6, §5.7, §5.8, §5.9, §5.10
3. **LOG-C005**: Thêm plan.status validation vào §5.11 assign; document full transition matrix §5.4
4. **LOG-C001**: Chọn và document ownership policy cho plan mutation endpoints
5. **LOG-C004**: Document member resolution path; sửa error code ownership violation → 403
6. **STR-C001**: Sửa README.md endpoint count (WorkoutPlans 12 → 11)
7. **STR-C002**: Đăng ký 9 audit codes vào conventions.md §18 và Architecture §4.4.1
8. **STR-C003**: Chốt policy RESOURCE_NOT_FOUND vs NOT_FOUND

### Phải fix trước release (MAJOR × 15)

- LOG-M001: Giải quyết RBAC cho GET /workout-plans (staff không list được)
- LOG-M002: Document GET /workout-logs behavior cho staff/trainer caller
- LOG-M003: Làm rõ planDayId validation chain trong §6.2
- LOG-M004: Sửa DELETE /exercises protection rule — check any WorkoutPlanExercise reference
- LOG-M005: Thêm validation dayId ∈ planId cho §5.7, §5.8, §5.9, §5.10
- LOG-M006: Document `assignedByStaffId` resolution trong §5.11
- LOG-M007: Thêm `loggedAt` max backdate validation vào §6.2
- LOG-M008: Sửa §5.10 — onDelete là Restrict không phải Cascade; document 409 khi có WorkoutLogSet
- LOG-M009: Rewrite §5.1 visibility rules thành bảng rõ ràng per-role
- STR-M001: Thêm pagination spec cho §4.1, §5.1, §6.1
- STR-M002: Giải quyết `workout_plan.create` làm read gate
- STR-M004: Thêm UNAUTHORIZED 401 vào §4.3, §4.4, §6.1–6.3
- STR-M005: Sửa visibility rules mâu thuẫn §5.1
- STR-M006: Thêm error code table cho §5.8

---

## MINOR Issues Open

| ID | Source | Mô tả |
|---|---|---|
| STR-m001 | Vòng 1a | §5.2 không có error code table |
| STR-m002 | Vòng 1a | §5.7 không có error code table và không có audit entry |
| STR-m003 | Vòng 1a | §5.10 không có error code table |
| STR-m004 | Vòng 1a | GET /workout-logs không có query params table |
| STR-m005 | Vòng 1a | Glossary term `creatorType` camelCase nhưng DB column là `creator_type` snake_case |
| STR-m006 | Vòng 1a | Related docs anchor `Architecture.md §4.3` misleading (§4.3 = Error Handling Standards) |
| STR-m007 | Vòng 1a | staff role không có `workout_plan.delete` — visibility và delete behavior chưa clarify |
| LOG-N001 | Vòng 2 | Duplicate exercise name không được document là allowed hay blocked |
| LOG-N002 | Vòng 2 | `sets: []` allowed nhưng không document là intentional design |
| LOG-N003 | Vòng 2 | Error code `CONFLICT` (409) không được list trong module appendix |
| LOG-N004 | Vòng 2 | 24h check spec nên clarify "86400 seconds UTC exactly" |
| LOG-N005 | Vòng 2 | List endpoints thiếu pagination meta (overlap với STR-M001) |
| LOG-N006 | Vòng 2 | Audit codes chưa đăng ký (overlap với STR-C002) |

---

## Fix Status — Phase 16 (2026-05-24)

### CRITICAL — Tất cả 8 đã FIXED (v1.1.0)

| ID | Status | Ghi chú |
|---|---|---|
| STR-C001 | FIXED | README.md: "WorkoutPlans 12" → "WorkoutPlans 11" |
| STR-C002 | FIXED | conventions.md §18 + Architecture.md §4.4.1: thêm 9 Workout audit codes |
| STR-C003 | FIXED | conventions.md §6: chốt policy — `RESOURCE_NOT_FOUND` là domain-specific 404 variant, `NOT_FOUND` là Prisma P2025 auto-map |
| LOG-C001 | FIXED | §5 thêm Ownership policy block (member vs staff creator_type) |
| LOG-C002 | FIXED | Glossary §3 rewrite — bỏ "partial unique index" claim, document SELECT FOR UPDATE. schema.prisma có TODO comment về raw SQL migration needed |
| LOG-C003 | FIXED | Write-block (BR-W02) extend sang §5.6, §5.7, §5.8, §5.9, §5.10 |
| LOG-C004 | FIXED | §6.2 member resolution path document; ownership violation 400 → 403 FORBIDDEN |
| LOG-C005 | FIXED | §5.4 status transition matrix; §5.11 PLAN_NOT_ACTIVE guard |

### MAJOR — 4/14 đã FIXED (v1.1.0), 10 còn OPEN

| ID | Status | Ghi chú |
|---|---|---|
| LOG-M005 | FIXED | §5.7, §5.8, §5.9, §5.10 thêm validation dayId ∈ planId + write-block |
| LOG-M006 | FIXED | §5.11 thêm `assignedByStaffId` resolution notes |
| LOG-M008 | FIXED | §5.10 rewrite — P2003 catch, 409 khi có WorkoutLogSet, bỏ Cascade claim |
| STR-M006 | FIXED | §5.8 thêm error code table |
| LOG-M001 | OPEN | RBAC gate GET /workout-plans (staff không list được) |
| LOG-M002 | OPEN | GET /workout-logs behavior cho staff/trainer caller |
| LOG-M003 | OPEN | planDayId validation chain §6.2 chưa document đầy đủ |
| LOG-M004 | OPEN | DELETE /exercises protection rule — any WorkoutPlanExercise reference |
| LOG-M007 | OPEN | `loggedAt` max backdate validation |
| LOG-M009 | OPEN | §5.1 visibility rules rewrite per-role |
| STR-M001 | OPEN | Pagination spec cho §4.1, §5.1, §6.1 |
| STR-M002 | OPEN | `workout_plan.create` làm read gate cho staff |
| STR-M004 | OPEN | UNAUTHORIZED 401 entry cho §4.3, §4.4, §6.1–6.3 |
| STR-M005 | OPEN | Visibility rules mâu thuẫn §5.1 |

### Spec Versions Thực Tế

- `docs/Design/API/Module-10-Workout.md` → **v1.1.0** (2026-05-24)
- `docs/Design/API/conventions.md` → **v1.0.1** (2026-05-24)
- `docs/Design/Architecture.md` → **v1.1.9** (2026-05-24)
- `docs/Design/API/README.md` → v1.0.4 (STR-C001 fix đã apply, version giữ nguyên — MINOR bump không warranted)
- `server/prisma/schema.prisma` → TODO comment thêm cho partial unique index (chưa có raw migration)

---

*Review bởi doc-review pipeline (automated) — 2026-05-24. Fix status update — 2026-05-24.*
