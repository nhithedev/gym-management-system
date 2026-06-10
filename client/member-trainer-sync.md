# Member–Trainer Workout UI — Feature Spec

Tài liệu này mô tả thiết kế và nghiệp vụ của toàn bộ tính năng workout dành cho **member** và **trainer**. Mọi page mới hoặc thay đổi trong khu vực này đều phải tuân theo spec này.

---

## 1. Shared Components

### `IslandGroup<V>` — single-select tab group
**File:** `src/components/shared/IslandGroup.tsx`

```tsx
<IslandGroup
  options={[{ value: 'strength', label: 'Sức mạnh' }, ...]}
  value={selected}
  onChange={setSelected}
  color="#42e09e"   // optional, default T
/>
```

**Visual:** Container `flex overflow-hidden rounded-xl` với `border: 1px solid rgba(255,255,255,0.10)`. Active button: `background: ${color}22`, text = `color`. Inactive: transparent, text = `#8ab89c`. Dividers giữa buttons: `1px solid rgba(255,255,255,0.08)`.

---

### `IslandMultiGroup<V>` — multi-select pill group
**File:** `src/components/shared/IslandGroup.tsx`

```tsx
<IslandMultiGroup
  options={TRAINING_DAY_OPTIONS}
  values={selectedDays}
  onChange={setSelectedDays}
/>
```

**Visual:** `flex flex-wrap gap-2`. Mỗi pill là 1 button độc lập, active: `background: ${color}22`, `border: 1px solid ${color}44`. Inactive: `rgba(255,255,255,0.04)` bg, `rgba(255,255,255,0.08)` border.

---

## 2. Plan Builder — Shared Nghiệp Vụ (Member & Trainer)

### Thông tin 1 plan cần có

| Field | UI | Lưu trữ backend |
|-------|-----|-----------------|
| **Tên** | text input | `WorkoutPlan.name` |
| **Số buổi/tuần** | number input (1–7) | Encode vào `description`: `${n}x/tuần • ${m} phút/buổi\n...` |
| **Thời gian/buổi** | number input (phút) | Encode vào `description` (xem trên) |
| **Bắt đầu từ ngày** | `<input type="date">` | `WorkoutAssignment.startDate` khi `assignPlan` |
| **Ngày tập trong tuần** | `IslandMultiGroup` Mon–Sun | State UI only, metadata in description |
| **Mô tả** | textarea | `WorkoutPlan.description` (sau meta prefix) |

**Description encoding:**
```
{n}x/tuần • {m} phút/buổi
{user's own description text}
```

---

### Exercise Picker (trong form thêm bài tập)

Thay thế `<select>` raw bằng:
1. `IslandGroup` tabs: **Tất cả | Sức mạnh | Tim mạch | Linh hoạt | Thăng bằng**
2. Search input (`rogym-input pl-9`)
3. Scrollable list (`max-h-44 overflow-y-auto`) — click row để chọn
4. Selected pill với nút X để bỏ chọn
5. Sau khi chọn: hiện inputs Sets / Reps (hoặc Giây) / Tạ (kg) / Nghỉ (giây)

---

### Phân quyền Member vs Trainer

| Hành động | Member | Trainer |
|-----------|--------|---------|
| Xem danh sách bài tập | ✓ | ✓ |
| Tạo bài tập mới | ✗ | ✓ |
| Sửa / xóa bài tập | ✗ | ✓ |
| Tạo plan cá nhân | ✓ | ✓ |
| Sửa plan cá nhân | ✓ (chỉ plan tự tạo) | ✓ |
| Xóa plan | ✓ (chỉ plan tự tạo, không có log) | ✓ |
| Giao plan cho học viên | ✗ | ✓ |
| Xóa plan được PT giao | ✗ | — |
| Xem "Plan gợi ý từ PT" | ✓ | — |

---

## 3. Trang Kế Hoạch Của Tôi (`MyPlanPage`)

### 2 view modes (toggle bằng `IslandGroup`)

**List view (default):**
- 2 cột 50/50: **Do PT giao** (trái) | **Kế hoạch cá nhân** (phải)
- PT plans: badge "PT giao" màu G (#06c384), không có nút Xóa/Sửa
- Self plans: badge "Cá nhân" màu T, có nút Xóa (với confirm), nút Sửa → navigate to builder
- Mỗi plan card: expandable → hiện danh sách ngày tập + nút "Bắt đầu" từng ngày

**Calendar view:**
- Month grid (Mon–Sun), nav prev/next tháng
- Điểm màu: 🟢 (G = #06c384) = PT plan, 🔵 (T = #42e09e) = self plan
- Click ngày có điểm → popup `DayEventsPopup`: hiện plan name, day name, CTA "Bắt đầu"
- Today cell: `background: ${T}15`, `border: 1px solid ${T}44`

**Date calculation algorithm:**
```ts
// assignment.startDate = "2026-06-10"
// day.weekNumber (1-based), day.dayOfWeek (1-7, sequential)
const offset = (day.weekNumber - 1) * 7 + (day.dayOfWeek - 1)
const date = new Date(assignment.startDate)
date.setDate(date.getDate() + offset)
```

**API:** `workoutService.getAssignments(memberId)` (không filter) → partition by `assignedByStaffId`.

---

## 4. Trang Lịch PT (`WorkoutSchedulePage`)

### 3-section layout

**Section A — Hero card (next session):**
- Lấy `upcoming[0]` (session sắp nhất, `status: 'scheduled'`, sorted asc)
- Hiện: trainer avatar placeholder, trainer name, datetime lớn, room, status badge
- Countdown label: "Hôm nay" / "Ngày mai" / "Còn X ngày"
- Nếu không có session: empty state card

**Section B — Two-column list:**
- Cột trái: `upcoming.slice(1)` — upcoming sessions
  - Hover → tooltip floating (absolute child) hiện datetime đầy đủ + trainer + room
- Cột phải: `completed` sessions (sorted desc)
  - `opacity: 0.55`, `filter: grayscale(0.2)`, line-through trên date text

**API:**
```ts
trainingService.getSessions({ status: 'scheduled', pageSize: 20, sort: 'start_time:asc' })
trainingService.getSessions({ status: 'completed', pageSize: 15, sort: 'start_time:desc' })
```

---

## 5. Filter Popup Spec (roadmap)

Popup bộ lọc cho exercise picker — chưa implement, cần thêm trong bước tiếp theo:

```
┌── Bộ lọc ──────────────────────────────────┐
│ Giới tính                                   │
│ [Nam] [Nữ]                                  │
│                                             │
│ Trình độ                                    │
│ [Beginner] [Advanced]                       │
│                                             │
│ Mục tiêu tập luyện                          │
│ [Build Muscle Mass] [Build Strength]         │
│ [Olympic Lift]      [Power Lift]            │
│ [Get Lean and Burn Fat]                     │
│                              [Lưu] [Hủy]   │
└─────────────────────────────────────────────┘
```

Hiện tại backend Exercise model chưa có các field này. Cần migration:
- `Exercise.targetGender: 'male' | 'female' | 'both'`
- `Exercise.difficulty: 'beginner' | 'advanced'`
- `Exercise.fitnessGoals: string[]` (JSON array)

---

## 6. PT Recommended Plans

**Backend endpoint:** `GET /workout-plans/suggested`
- Returns: plans where `creatorType = 'staff'`, `status = 'active'`, `deletedAt = null`
- No permission guard — any authenticated user can call

**Frontend service:** `workoutService.getSuggestedPlans()`

**UI trong PlanBuilderPage (phase 'name'):**
- `SuggestedPlanCard` component — hiện: plan name, PT badge, totalDays, totalExercises, estimated duration/day
- Expandable → hiện từng day với exercises
- "Dùng plan này" → `useSuggestedPlan()`: assign plan trực tiếp, navigate to `/member/workout/plan`

---

## 7. Sidebar Navigation (Member)

```
Lịch tập (maxHeight tính đúng: n × 34 + 16px)
  ├── Kế hoạch         → /member/workout/plan
  ├── Bài tập          → /member/workout/exercises
  ├── Tạo kế hoạch     → /member/workout/builder
  ├── Lịch sử          → /member/workout/history
  ├── Điểm danh        → /member/workout/attendance
  └── Lịch PT          → /member/workout/sessions
```

**Clip bug fix (Sidebar.tsx line 123):**
```ts
// Cũ — thiếu gap
maxHeight: showChildren ? item.children!.length * SUB_ITEM_H + 8 : 0

// Mới — bao gồm gap-0.5 (2px/item) + breathing room
maxHeight: showChildren ? item.children!.length * (SUB_ITEM_H + 2) + 16 : 0
```
