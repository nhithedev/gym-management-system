# Workout Plan Feature — Design Spec
**Date:** 2026-05-23  
**Status:** Approved  
**Approach:** Approach A — Plan-as-Template + Execution Log  
**Scope:** MVP v1

---

## 1. Context

UC06 hiện tại chỉ theo dõi chỉ số cơ thể (weight, BMI, notes) qua bảng `member_progress`. Không có cơ chế để PT lập kế hoạch tập luyện cụ thể cho member, và member không có nơi để ghi nhận kết quả từng buổi tập.

Yêu cầu: thêm tính năng Workout Plan cho phép:
1. PT tạo và giao workout plan có cấu trúc cho member
2. Member tự tạo plan cá nhân (nếu không có PT hoặc muốn tập thêm)
3. Member ghi log kết quả thực tế từng buổi tập (actual vs target)
4. PT theo dõi tiến độ member qua workout logs

---

## 2. Quyết định thiết kế

- **Plan-as-Template**: PT tạo 1 plan template → giao cho nhiều member. Sửa template không ảnh hưởng log cũ.
- **1 plan active / member**: Giao plan mới sẽ set plan cũ thành `replaced`.
- **Plan structure**: theo ngày (Day 1, Day 2...) — không gắn với ngày cụ thể trong tuần.
- **Exercise library**: chung toàn gym. PT, Staff, Owner đều thêm được. Soft delete, block nếu đang dùng trong plan active.
- **Workout log**: Member tự log. PT không bắt buộc phải có mặt.
- **Member self-plan**: Member không có PT có thể tự tạo và giao plan cho chính mình.
- **UC06 giữ nguyên**: Body metrics (weight/BMI) không bị thay đổi. Workout plan là additive.

---

## 3. Data Model — 7 bảng mới

### Enums mới

```prisma
enum ExerciseCategory {
  strength
  cardio
  flexibility
  balance
}

enum WorkoutPlanStatus {
  draft
  active
  archived
}

enum WorkoutAssignmentStatus {
  active
  completed
  replaced
}

enum PlanCreatorType {
  staff
  member
}
```

### Bảng 1: `exercises` — Thư viện bài tập

```prisma
model Exercise {
  exerciseId        BigInt           @id @default(autoincrement()) @map("exercise_id")
  name              String           @db.VarChar(100)
  category          ExerciseCategory
  muscleGroup       String?          @map("muscle_group") @db.VarChar(100)
  equipmentNeeded   String?          @map("equipment_needed") @db.VarChar(100)
  description       String?          @db.Text
  createdByStaffId  BigInt?          @map("created_by_staff_id")
  deletedAt         DateTime?        @map("deleted_at") @db.Timestamp(6)
  createdAt         DateTime         @default(now()) @map("created_at") @db.Timestamp(6)

  createdByStaff    Staff?           @relation(fields: [createdByStaffId], references: [staffId], onDelete: SetNull)
  planExercises     WorkoutPlanExercise[]

  @@index([category])
  @@index([muscleGroup])
  @@map("exercises")
}
```

**Quy tắc:**
- `createdByStaffId = null` = bài tập mặc định của gym (seed data)
- Soft delete: block nếu còn `WorkoutPlanExercise` trong plan chưa archived

### Bảng 2: `workout_plans` — Plan template

```prisma
model WorkoutPlan {
  planId            BigInt            @id @default(autoincrement()) @map("plan_id")
  creatorStaffId    BigInt?           @map("creator_staff_id")
  creatorMemberId   BigInt?           @map("creator_member_id")
  creatorType       PlanCreatorType   @map("creator_type")
  name              String            @db.VarChar(100)
  description       String?           @db.Text
  status            WorkoutPlanStatus @default(draft)
  deletedAt         DateTime?         @map("deleted_at") @db.Timestamp(6)
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamp(6)

  creatorStaff      Staff?            @relation(fields: [creatorStaffId], references: [staffId], onDelete: SetNull)
  creatorMember     Member?           @relation("MemberCreatedPlans", fields: [creatorMemberId], references: [memberId], onDelete: SetNull)
  days              WorkoutPlanDay[]
  assignments       MemberWorkoutPlan[]

  // CHECK: (creator_staff_id IS NOT NULL) OR (creator_member_id IS NOT NULL)
  @@index([creatorStaffId])
  @@index([creatorMemberId])
  @@map("workout_plans")
}
```

### Bảng 3: `workout_plan_days` — Ngày tập trong plan

```prisma
model WorkoutPlanDay {
  planDayId   BigInt   @id @default(autoincrement()) @map("plan_day_id")
  planId      BigInt   @map("plan_id")
  dayNumber   Int      @map("day_number")
  name        String   @db.VarChar(100)
  notes       String?  @db.Text

  plan        WorkoutPlan          @relation(fields: [planId], references: [planId], onDelete: Cascade)
  exercises   WorkoutPlanExercise[]
  logs        WorkoutLog[]

  @@unique([planId, dayNumber])
  @@map("workout_plan_days")
}
```

### Bảng 4: `workout_plan_exercises` — Bài tập trong ngày, kèm target

```prisma
model WorkoutPlanExercise {
  planExerciseId     BigInt    @id @default(autoincrement()) @map("plan_exercise_id")
  planDayId          BigInt    @map("plan_day_id")
  exerciseId         BigInt    @map("exercise_id")
  orderIndex         Int       @map("order_index")
  targetSets         Int       @map("target_sets")
  targetReps         Int?      @map("target_reps")
  targetDurationSec  Int?      @map("target_duration_sec")
  targetWeightKg     Decimal?  @map("target_weight_kg") @db.Decimal(6, 2)
  restSeconds        Int?      @default(60) @map("rest_seconds")
  notes              String?   @db.Text

  planDay   WorkoutPlanDay @relation(fields: [planDayId], references: [planDayId], onDelete: Cascade)
  exercise  Exercise       @relation(fields: [exerciseId], references: [exerciseId])
  logSets   WorkoutLogSet[]

  @@unique([planDayId, orderIndex])
  @@index([exerciseId])
  @@map("workout_plan_exercises")
}
```

**Quy tắc:**
- `targetReps` null → bài tập theo thời gian (cardio), dùng `targetDurationSec`
- `targetWeightKg` null → bodyweight exercise

### Bảng 5: `member_workout_plans` — Giao plan cho member

```prisma
model MemberWorkoutPlan {
  assignmentId       BigInt                  @id @default(autoincrement()) @map("assignment_id")
  memberId           BigInt                  @map("member_id")
  planId             BigInt                  @map("plan_id")
  assignedByStaffId  BigInt?                 @map("assigned_by_staff_id")
  startDate          DateTime                @map("start_date") @db.Date
  status             WorkoutAssignmentStatus @default(active)
  endedAt            DateTime?               @map("ended_at") @db.Timestamp(6)
  notes              String?                 @db.Text
  createdAt          DateTime                @default(now()) @map("created_at") @db.Timestamp(6)

  member          Member      @relation(fields: [memberId], references: [memberId])
  plan            WorkoutPlan @relation(fields: [planId], references: [planId])
  assignedByStaff Staff?      @relation(fields: [assignedByStaffId], references: [staffId], onDelete: SetNull)
  logs            WorkoutLog[]

  // Partial UNIQUE(member_id) WHERE status = 'active' — thêm qua SQL migration riêng
  @@index([memberId, status])
  @@index([planId])
  @@map("member_workout_plans")
}
```

**Quy tắc:**
- `assignedByStaffId = null` → member tự giao cho chính mình
- Constraint 1 active / member: enforce trong service layer + partial unique index

### Bảng 6: `workout_logs` — Một buổi tập thực tế

```prisma
model WorkoutLog {
  logId          BigInt    @id @default(autoincrement()) @map("log_id")
  memberId       BigInt    @map("member_id")
  assignmentId   BigInt    @map("assignment_id")
  planDayId      BigInt    @map("plan_day_id")
  loggedAt       DateTime  @map("logged_at") @db.Timestamp(6)
  durationMin    Int?      @map("duration_min")
  notes          String?   @db.Text

  member       Member            @relation(fields: [memberId], references: [memberId])
  assignment   MemberWorkoutPlan @relation(fields: [assignmentId], references: [assignmentId])
  planDay      WorkoutPlanDay    @relation(fields: [planDayId], references: [planDayId])
  sets         WorkoutLogSet[]

  @@index([memberId, loggedAt(sort: Desc)])
  @@index([assignmentId])
  @@map("workout_logs")
}
```

### Bảng 7: `workout_log_sets` — Kết quả từng set

```prisma
model WorkoutLogSet {
  logSetId           BigInt    @id @default(autoincrement()) @map("log_set_id")
  logId              BigInt    @map("log_id")
  planExerciseId     BigInt    @map("plan_exercise_id")
  setNumber          Int       @map("set_number")
  actualReps         Int?      @map("actual_reps")
  actualWeightKg     Decimal?  @map("actual_weight_kg") @db.Decimal(6, 2)
  actualDurationSec  Int?      @map("actual_duration_sec")
  completed          Boolean   @default(true)

  log          WorkoutLog          @relation(fields: [logId], references: [logId], onDelete: Cascade)
  planExercise WorkoutPlanExercise @relation(fields: [planExerciseId], references: [planExerciseId])

  @@unique([logId, planExerciseId, setNumber])
  @@index([planExerciseId])
  @@map("workout_log_sets")
}
```

---

## 4. Use Cases — Cấu trúc đã gộp

UC14 và UC15 từ bản draft trước đã được gộp vào UC05/UC06 theo actor-based grouping. Các label UC14/UC15 không còn dùng trong SRS. Mapping:

- UC05A (mới): PT tạo và giao workout plan ← UC14 luồng chính
- UC06A (mới): Member ghi nhận buổi tập ← UC15
- UC06B (mới): Member tự tạo plan ← UC14 sub-flow A
- UC05B/C và UC06C: giữ nguyên content cũ (scheduling, real-time check-in, body metrics)

### UC05A — Quản lý Workout Plan (PT tạo và giao)

| Thông tin | Chi tiết |
|-----------|---------|
| **Mã Use case** | UC05A |
| **Tên Use case** | Quản lý Workout Plan |
| **Tác nhân** | Huấn luyện viên (PT), Member (tự tạo plan), Chủ phòng tập, Nhân viên quản lý |
| **Tiền điều kiện** | PT đã đăng nhập với `position='pt'`; hoặc Member đã đăng nhập (tự tạo plan) |

#### Luồng chính — PT tạo và giao plan

| STT | Thực hiện bởi | Hành động |
|-----|--------------|----------|
| 1 | PT | Vào "Quản lý Plan", chọn "Tạo plan mới" |
| 2 | PT | Nhập tên plan, mô tả; thêm các ngày tập (Day 1, Day 2...) với tên ngày |
| 3 | PT | Trong mỗi ngày: tìm kiếm exercise từ library, thêm vào, đặt target_sets / target_reps / target_weight_kg / rest_seconds |
| 4 | PT | Lưu plan với `status='draft'`; có thể chỉnh sửa trước khi giao |
| 5 | PT | Chọn "Giao plan" → chọn member (danh sách member có `primary_trainer_id = self.staff_id`), chọn `start_date` |
| 6 | Hệ thống | Kiểm tra member có plan `active` không → nếu có, cảnh báo xác nhận. Set plan cũ `status='replaced'`, `ended_at=NOW()`. Tạo `member_workout_plans` mới `status='active'`. Ghi audit `workout_plan.assign`. |
| 7 | Hệ thống | Ghi audit log. Member có thể xem plan ngay sau khi giao. |

#### Luồng thay thế

| STT | Thực hiện bởi | Hành động |
|-----|--------------|----------|
| 3a | PT | Exercise chưa có trong library → PT chọn "Thêm bài tập mới" → nhập name/category/muscle_group → thêm vào library rồi dùng ngay |
| 5a | PT | Member đã có plan active → hiển thị cảnh báo "Giao plan mới sẽ thay thế [tên plan cũ]. Xác nhận?" → PT confirm |
| 5b | PT | PT chọn member không thuộc danh sách quản lý → 403 |

#### Sub-flow A — Member tự tạo plan cá nhân

| STT | Thực hiện bởi | Hành động |
|-----|--------------|----------|
| 1 | Member | Vào "Plan của tôi" → "Tạo plan cá nhân" |
| 2 | Member | Nhập tên plan, thêm ngày, chọn bài tập từ library, đặt target |
| 3 | Member | "Kích hoạt plan này" → tạo `member_workout_plans` với `assignedByStaffId=null`, `status='active'` |
| 4 | Hệ thống | Nếu đang có plan active (PT-assigned hoặc self) → cảnh báo override |

**Validation khi giao plan (assign):**
- Plan phải có `status != 'archived'` và ít nhất 1 day, mỗi day phải có ít nhất 1 exercise → nếu không thoả → 422 "Plan chưa đủ nội dung để giao"
- Plan phải là `draft` hoặc `active` — không giao được plan `archived`

**Vòng đời MemberWorkoutPlan trong MVP:**
- Trạng thái `completed` chỉ được set thủ công bởi PT/Owner (PATCH assignment status)
- Member không có button "Complete plan" trong v1. Plan ở `active` cho đến khi PT giao plan mới (→ `replaced`) hoặc PT đánh dấu hoàn thành (→ `completed`)

**Authorization:**
- PT chỉ giao plan cho member có `primary_trainer_id = self.staff_id`
- Owner có thể giao cho bất kỳ member
- PT xem tất cả plan trong library (read-only với plan của PT khác)
- PT chỉ sửa/xóa plan do mình tạo (`creator_staff_id = self.staff_id`)
- Member chỉ sửa/xóa plan do mình tạo (`creator_member_id = self.member_id`)
- Member không được sửa plan do PT giao

---

### UC06A — Ghi nhận buổi tập (Member)

| Thông tin | Chi tiết |
|-----------|---------|
| **Mã Use case** | UC06A |
| **Tên Use case** | Ghi nhận buổi tập |
| **Tác nhân** | Hội viên (Member) |
| **Tiền điều kiện** | Member đã đăng nhập; có `member_workout_plans.status = 'active'` |

#### Luồng chính — Ghi log buổi tập

| STT | Thực hiện bởi | Hành động |
|-----|--------------|----------|
| 1 | Member | Vào "Plan của tôi", xem danh sách ngày tập (Day 1, Day 2...) |
| 2 | Member | Chọn ngày tập hôm nay → xem danh sách bài tập với target (sets × reps @ weight) |
| 3 | Member | Nhấn "Bắt đầu buổi tập" → hệ thống tạo `workout_logs` với `logged_at=NOW()` |
| 4 | Member | Lần lượt ghi kết quả từng set: `actual_reps`, `actual_weight_kg`. Tick "hoàn thành" hoặc bỏ qua |
| 5 | Member | Nhấn "Kết thúc buổi tập" → nhập `duration_min` (tùy chọn), ghi chú (tùy chọn) |
| 6 | Hệ thống | Lưu tất cả `workout_log_sets`. Tính % hoàn thành = số set `completed=true` / tổng target sets. Ghi audit `workout_log.create`. |
| 7 | Member | Xem summary: % hoàn thành, tổng volume = Σ(actual_weight_kg × actual_reps) |

#### Sub-flow B — Member xem lịch sử buổi tập

| STT | Thực hiện bởi | Hành động |
|-----|--------------|----------|
| 1 | Member | Vào tab "Lịch sử tập" |
| 2 | Hệ thống | Hiển thị danh sách `workout_logs` sắp xếp theo `logged_at` giảm dần: ngày, tên Day, % hoàn thành, tổng volume |
| 3 | Member | Chọn 1 buổi → xem chi tiết từng bài: target vs actual, từng set |

#### Luồng thay thế

| STT | Thực hiện bởi | Hành động |
|-----|--------------|----------|
| 1a | Member | Không có plan active → hiển thị "Chưa có kế hoạch tập. Liên hệ PT hoặc tự tạo plan." |
| 3a | Member | Trong ngày đã có log cho cùng `plan_day_id` → cảnh báo "Bạn đã tập [Ngày X] rồi. Tạo log mới?" |
| 4a | Member | Bỏ qua 1 bài tập → `completed=false` cho tất cả set của bài đó, vẫn lưu log |

**PT xem tiến độ member:**
- Vào `/trainer/members/:memberId/progress` tab "Workout Logs"
- Xem lịch sử buổi tập: ngày, Day, % hoàn thành
- Xem trend trọng lượng theo thời gian cho từng exercise (từ `workout_log_sets.actual_weight_kg`)

---

### UC06B — Member tự tạo plan cá nhân

| Thông tin | Chi tiết |
|-----------|---------|
| **Mã Use case** | UC06B |
| **Tên Use case** | Tự tạo workout plan |
| **Tác nhân** | Hội viên (Member) |
| **Tiền điều kiện** | Member đã đăng nhập; có quyền `workout_plan.create` |

#### Luồng chính

| STT | Thực hiện bởi | Hành động |
|-----|--------------|----------|
| 1 | Member | Vào "Plan của tôi" → "Tạo plan cá nhân" |
| 2 | Member | Nhập tên plan, thêm ngày tập, chọn bài tập từ library, đặt target_sets/target_reps/target_weight |
| 3 | Member | "Kích hoạt plan này" → tạo `member_workout_plans` với `assignedByStaffId=null`, `status='active'` |
| 4 | Hệ thống | Nếu đang có plan active → cảnh báo override, set plan cũ `status='replaced'`. Ghi audit `workout_plan.assign`. |

**Authorization:**

- Member chỉ tạo/sửa/xóa plan do mình tạo (`creator_member_id = self.member_id`).
- Member không được sửa plan do PT giao.

---

## 5. API Endpoints — Module 10: Workout

### Exercise Library

| Method | Path | Actor | Mô tả |
|--------|------|-------|-------|
| GET | /exercises | All authenticated | List exercises (filter by category, muscle_group) |
| POST | /exercises | Staff, Owner, Trainer | Tạo bài tập mới |
| PATCH | /exercises/:id | Creator hoặc Owner/Staff | Cập nhật |
| DELETE | /exercises/:id | Owner/Staff | Soft delete (block nếu đang dùng trong active plan) |

### Workout Plans

| Method | Path | Actor | Mô tả |
|--------|------|-------|-------|
| GET | /workout-plans | Trainer (own + shared), Owner (all), Member (own) | List plans |
| POST | /workout-plans | Trainer, Member | Tạo plan mới (status=draft) |
| GET | /workout-plans/:id | Creator hoặc authorized | Chi tiết plan + days + exercises |
| PATCH | /workout-plans/:id | Creator | Sửa (block nếu có workout_log đã tạo) |
| DELETE | /workout-plans/:id | Creator, Owner/Staff | Soft delete (block nếu đang assigned active) |
| POST | /workout-plans/:id/days | Creator | Thêm ngày tập |
| PATCH | /workout-plans/:id/days/:dayId | Creator | Sửa ngày (tên, notes) |
| DELETE | /workout-plans/:id/days/:dayId | Creator | Xóa ngày (block nếu có workout_log) |
| POST | /workout-plans/:id/days/:dayId/exercises | Creator | Thêm exercise vào ngày |
| PATCH | /workout-plans/:id/days/:dayId/exercises/:peId | Creator | Sửa target |
| DELETE | /workout-plans/:id/days/:dayId/exercises/:peId | Creator | Xóa exercise khỏi ngày |

### Member Plan Assignment

| Method | Path | Actor | Mô tả |
|--------|------|-------|-------|
| POST | /members/:memberId/workout-plan | Trainer (member của mình), Owner, Member (self) | Giao plan |
| GET | /members/:memberId/workout-plan | Trainer, Owner, Member (self) | Plan đang active |
| GET | /members/:memberId/workout-plans | Trainer, Owner, Member (self) | Lịch sử tất cả plan |

### Workout Logs

| Method | Path | Actor | Mô tả |
|--------|------|-------|-------|
| POST | /workout-logs | Member (self) | Tạo log buổi tập (kèm sets) |
| GET | /workout-logs | Member (self), Trainer (member của mình), Owner | List logs |
| GET | /workout-logs/:id | Creator hoặc authorized | Chi tiết log + sets |
| PATCH | /workout-logs/:id | Member (self, trong 24h) | Sửa log |

---

## 6. Permissions mới

```
exercise.read        — đọc library (tất cả authenticated)
exercise.create      — thêm bài tập (staff, owner, trainer)
exercise.update      — sửa (creator; owner/staff override)
exercise.delete      — xóa (owner, staff)

workout_plan.create  — tạo plan (trainer, member)
workout_plan.update  — sửa plan (creator)
workout_plan.delete  — xóa plan (creator; owner/staff override)
workout_plan.assign  — giao plan cho member (trainer với member của mình; owner bất kỳ)

workout_log.create   — ghi log buổi tập (member — chỉ cho bản thân)
workout_log.read     — đọc log (trainer đọc của member; member đọc của bản thân; owner tất cả)
workout_log.update   — sửa log trong 24h (member — chỉ của bản thân)
```

### Role mapping bổ sung

| Role | Permissions thêm |
|------|-----------------|
| Owner | Tất cả workout permissions |
| Staff | exercise CRUD, workout_plan.assign (bất kỳ member), workout_log.read |
| Trainer | exercise.create/update, workout_plan.create/update/delete/assign, workout_log.read |
| Member | exercise.read, workout_plan.create/update/delete (plan của mình), workout_log.create/read/update |

---

## 7. AuditLog actions mới

| Action | ResourceType | Khi nào |
|--------|-------------|---------|
| `workout_plan.create` | workout_plan | PT/member tạo plan |
| `workout_plan.update` | workout_plan | Sửa plan |
| `workout_plan.delete` | workout_plan | Xóa plan |
| `workout_plan.assign` | member_workout_plan | Giao plan cho member |
| `workout_log.create` | workout_log | Member ghi log buổi tập |
| `workout_log.update` | workout_log | Member sửa log |
| `exercise.create` | exercise | Thêm bài tập vào library |
| `exercise.delete` | exercise | Xóa bài tập |

---

## 8. Frontend — Trang mới cần thêm

**Trainer dashboard:**
- `/trainer/exercises` — Thư viện bài tập (CRUD)
- `/trainer/plans` — Danh sách plan (tạo mới, clone, giao)
- `/trainer/plans/:id/builder` — Plan builder (kéo thả ngày, thêm exercise)
- `/trainer/members/:memberId/progress` — Tab "Workout Logs" bên cạnh tab "Body Metrics"

**Member dashboard:**
- `/member/my-plan` — Plan hiện tại (danh sách Day, bài tập hôm nay)
- `/member/workout` — Ghi log buổi tập (session đang diễn ra)
- `/member/workout-history` — Lịch sử buổi tập
- `/member/self-plan` — Tự tạo plan (khi không có PT)

---

## 9. Integration với hệ thống hiện có

**UC06C (giữ nguyên):** Body metrics tracking (weight/BMI) qua `member_progress` không thay đổi. UC06C và UC05A/UC06A/UC06B là hai nhóm song song, cùng phục vụ "theo dõi tiến độ" nhưng ở hai chiều khác nhau (chỉ số cơ thể vs kết quả tập luyện).

**UC05 (TrainingSession):** Không thay đổi schema. `TrainingSession` và `WorkoutLog` là hai bảng độc lập — không có FK giữa hai. Trong UI PT session, có thể hiển thị plan của member để PT reference.

**Notification:** Trong MVP, khi PT giao plan chỉ ghi audit log. Push notification cho member defer v1.1.

**Schema hiện có:** 7 bảng mới hoàn toàn additive, không sửa bảng nào hiện có.

---

## 10. Verification

Sau khi implement, kiểm tra:

1. **Schema**: `npm run prisma:push` + `npm run prisma:generate` thành công, không có conflict
2. **UC05A happy path**: PT tạo plan → thêm day → thêm exercise → giao cho member → member thấy plan active
3. **UC05A replace flow**: Giao plan thứ 2 cho member đang có plan → plan cũ `status='replaced'`
4. **UC06A happy path**: Member chọn Day 1 → tạo log → nhập sets → kết thúc → xem summary
5. **UC06B member self-plan**: Member không có PT → tạo plan → activate → log buổi tập
6. **Authorization**: PT không giao được plan cho member của PT khác (403)
7. **Soft delete block**: Xóa exercise đang dùng trong active plan → 409

---

## 11. Roadmap v1.1 (defer)

- Progress charts: biểu đồ 1RM, tổng volume theo thời gian
- Plan templates: PT lưu plan thành template để tái dùng nhanh
- Exercise video/image URL
- Auto-progression: tự tăng weight đề xuất dựa trên log tuần trước
- Notification khi PT giao plan mới
- PT comment/feedback trên từng workout log
