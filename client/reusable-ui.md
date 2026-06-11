# Hướng dẫn tái sử dụng UI Frontend

Tài liệu này mô tả cách ghép các Components, Hooks, Layouts và CSS API hiện có.
Chuẩn màu sắc, typography và quy tắc thêm style được định nghĩa tại
[`design.md`](./design.md).

## 1. Quy ước import và lựa chọn API

Dùng alias `@/` thay cho đường dẫn tương đối dài:

```tsx
import { Page, PageHeader } from '@/components/shared/PageUI'
import { Select } from '@/components/Select'
import { useTrainerSessions } from '@/hooks/useTrainerSessions'
```

Thứ tự lựa chọn khi xây dựng màn hình:

1. Shared component trong `src/components`.
2. Alias hoặc component theo role như `MemberUI`, `TrainerUI`.
3. Hook nghiệp vụ trong `src/hooks`.
4. Class ngữ nghĩa trong `globals.css`.
5. Component mới nếu pattern có hành vi hoặc API tái sử dụng rõ ràng.

Không copy markup loading, empty, error, select, modal hoặc status badge giữa các
page.

## 2. Page foundation

Nguồn:

- [`PageUI.tsx`](./src/components/shared/PageUI.tsx)
- [`MemberUI.tsx`](./src/pages/member/components/MemberUI.tsx)
- [`TrainerUI.tsx`](./src/components/TrainerUI.tsx)

### 2.1. Export chung

| Component | Props chính | Vai trò |
| --- | --- | --- |
| `Page` | `children`, `className?` | Container dashboard tối đa 1280px |
| `PageHeader` | `title`, `eyebrow?`, `description?`, `actions?` | Heading và action chuẩn |
| `PageSkeleton` | `rows?` | Loading list/page |
| `PageEmptyState` | `title`, `description?`, `action?` | Empty state |
| `PageErrorState` | `message`, `onRetry?` | Error và retry |

Member aliases:

```tsx
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberEmptyState,
  MemberErrorState,
} from '@/pages/member/components/MemberUI'
```

Trainer aliases:

```tsx
import {
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerEmptyState,
  TrainerErrorState,
} from '@/components/TrainerUI'
```

Alias không tạo giao diện khác. Chúng giúp code theo role dễ đọc và cho phép mở
rộng API role tại một nơi.

### 2.2. Pattern trang tải dữ liệu

```tsx
export default function StudentsPage() {
  const { data, loading, error, reload } = useTrainerStudents()

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Học viên"
        title="Danh sách học viên"
        description="Theo dõi học viên đang được phân công."
      />

      {loading ? (
        <TrainerSkeleton rows={4} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState title="Chưa có học viên" />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {data.map((student) => (
            <article key={student.memberId} className="rogym-card rogym-card--compact">
              {student.fullName}
            </article>
          ))}
        </section>
      )}
    </TrainerPage>
  )
}
```

Không render empty state trong lúc `loading`. Error có thể giữ retry bằng hàm
`reload` từ hook.

## 3. TrainerUI

Nguồn: [`TrainerUI.tsx`](./src/components/TrainerUI.tsx)

### 3.1. `TrainerStatCard`

```tsx
<TrainerStatCard
  icon={<Users size={18} />}
  label="Học viên"
  value={total}
  hint="Đang được phân công"
/>
```

Props: `icon`, `label`, `value`, `hint?`.

### 3.2. `TrainerStatusBadge`

```tsx
<TrainerStatusBadge status={session.status} />
<TrainerStatusBadge status="Sắp bắt đầu" tone="warning" />
```

`tone` là `success | accent | warning | danger | muted`. Khi bỏ qua `tone`,
component dùng `statusTone()` và `statusLabel()` từ
[`lib/status.ts`](./src/lib/status.ts).

Ưu tiên component này cho status nghiệp vụ trainer. Với badge tổng quát không phụ
thuộc mapping status, dùng `.rogym-tone-badge` và `data-tone`.

### 3.3. `TrainerModal`

```tsx
<TrainerModal
  open={open}
  title="Cập nhật buổi học"
  onClose={() => setOpen(false)}
  footer={
    <>
      <button className="rogym-btn rogym-btn--outline-white" onClick={onCancel}>
        Hủy
      </button>
      <SubmitButton form="session-form" loading={saving}>
        Lưu
      </SubmitButton>
    </>
  }
>
  <form id="session-form">{fields}</form>
</TrainerModal>
```

Props: `open`, `title`, `children`, `onClose`, `footer?`.

Modal hiện xử lý visual shell và dialog semantics. Page sở hữu form state, submit
và quy tắc đóng modal.

### 3.4. `SubmitButton`

Props: `loading?`, `disabled?`, `form?`, `children`.

Component tự khóa button khi loading và hiển thị spinner.

### 3.5. `TrainerSelect` và `StudentCombobox`

`TrainerSelect` là alias của shared `Select`. `StudentCombobox` nhận:

| Prop | Kiểu |
| --- | --- |
| `students` | `TrainerStudentSummary[]` |
| `value` | `string` |
| `onChange` | `(value: string) => void` |
| `disabled?` | `boolean` |

Tên hiện tại là `StudentCombobox`, nhưng implementation đang dùng select danh sách,
không có text search.

## 4. Form components

### 4.1. `Select`

Nguồn: [`Select.tsx`](./src/components/Select.tsx)

```tsx
<Select
  value={status}
  onValueChange={setStatus}
  ariaLabel="Trạng thái buổi học"
>
  <option value="">Tất cả trạng thái</option>
  <option value="scheduled">Đã lên lịch</option>
  <option value="completed">Hoàn thành</option>
</Select>
```

| Prop | Ghi chú |
| --- | --- |
| `value` | Controlled string value |
| `onValueChange` | Nhận string mới |
| `children` | Các phần tử `option` |
| `disabled?`, `required?` | Trạng thái form |
| `name?` | Tên field |
| `ariaLabel?` | Accessible name khi thiếu label ngoài |
| `className?` | Mở rộng layout, không thay skin |

`Select` chuyển option sang Radix Select và dùng các class
`.rogym-select`, `.rogym-select__content`, `.rogym-select__item`.

### 4.2. `DatePickerInput`

Nguồn: [`DatePickerInput.tsx`](./src/components/DatePickerInput.tsx)

```tsx
<DatePickerInput
  value={from}
  onChange={setFrom}
  min="2026-01-01"
  aria-label="Từ ngày"
/>
```

- Input/output: `yyyy-MM-dd`.
- Hiển thị: `dd/MM/yyyy`.
- Props: `value`, `onChange`, `placeholder?`, `disabled?`, `min?`, `max?`,
  `aria-label?`, `className?`.

### 4.3. `DateTimePickerInput`

Nguồn: [`DateTimePickerInput.tsx`](./src/components/DateTimePickerInput.tsx)

```tsx
<DateTimePickerInput
  value={startsAt}
  onChange={setStartsAt}
  minuteStep={15}
  aria-label="Thời gian bắt đầu"
/>
```

- Input/output: `yyyy-MM-ddTHH:mm`.
- `min` và `max` dùng phần ngày để giới hạn calendar.
- `minuteStep` mặc định là `5`.

Hai date picker đã cấu hình locale tiếng Việt và popover. Không dùng native input
khác style cho cùng use case nếu không có yêu cầu đặc biệt.

## 5. Workout components và helpers

Nguồn:

- [`ExerciseUI.tsx`](./src/components/workout/ExerciseUI.tsx)
- [`PlanBuilderUI.tsx`](./src/components/workout/PlanBuilderUI.tsx)
- [`exercise-data.ts`](./src/components/workout/exercise-data.ts)

### 5.1. `ExerciseCard`

Props:

| Prop | Vai trò |
| --- | --- |
| `exercise` | Dữ liệu `Exercise` |
| `action?` | Action ở góc card |
| `onClick?` | Bật trạng thái interactive |
| `imageAspect?` | Class aspect ratio, mặc định `aspect-[6/4]` |

Ảnh đã dùng `loading="lazy"`. Action bên trong card cần chặn event bubbling nếu có
hành vi khác với `onClick` của card.

### 5.2. `ExerciseCategoryFilterPopover`

Props: `open`, `value`, `onChange`, `onApply`, `onClose`.

Giá trị category dùng type `ExerciseCategoryFilter`. Danh sách option lấy từ
`EXERCISE_CATEGORY_OPTIONS`, không khai báo lại trong page.

### 5.3. `NumberField`

```tsx
<NumberField label="Số sets" value={sets} min={1} onChange={setSets} />
```

Props: `label`, `value`, `min`, `onChange`, `className?`.

### 5.4. `ExerciseTargetFields`

Component gom field sets, reps, duration, weight và rest:

```tsx
<ExerciseTargetFields
  category={exercise.category}
  values={targets}
  onChange={{
    sets: (sets) => setTargets((old) => ({ ...old, sets })),
    reps: (reps) => setTargets((old) => ({ ...old, reps })),
    duration: (duration) => setTargets((old) => ({ ...old, duration })),
    weight: (weight) => setTargets((old) => ({ ...old, weight })),
    restSeconds: (restSeconds) => setTargets((old) => ({ ...old, restSeconds })),
  }}
/>
```

Các option:

- `durationMode`: `cardio-only | always`.
- `gridClassName`: layout grid tùy ngữ cảnh.
- `compact`: giảm spacing field.
- `restOutsideGrid`: đặt rest field ngoài grid.
- `weightPlaceholder`: placeholder cho mức tạ.

### 5.5. Exercise helpers

| Export | Vai trò |
| --- | --- |
| `EXERCISE_CATEGORY_OPTIONS` | Option và label chuẩn |
| `getExerciseCategoryLabel()` | Chuyển enum thành tiếng Việt |
| `filterExercises()` | Search/category filter nhất quán |

`filterExercises()` hỗ trợ tìm theo tên, nhóm cơ, dụng cụ và tùy chọn mô tả.

## 6. Payment components và helpers

Nguồn:

- [`payment-methods.tsx`](./src/components/payment/payment-methods.tsx)
- [`payment-method-data.ts`](./src/components/payment/payment-method-data.ts)

| Export | Vai trò |
| --- | --- |
| `PaymentMethodIcon` | Icon theo `PaymentMethod` |
| `PAYMENT_METHOD_OPTIONS` | Danh sách option chuẩn |
| `getPaymentMethodLabel()` | Label đầy đủ hoặc compact |
| `maskPaymentAccountRef()` | Chỉ hiển thị bốn ký tự cuối |

```tsx
<span className="inline-flex items-center gap-2">
  <PaymentMethodIcon method={method} />
  {getPaymentMethodLabel(method)}
</span>
```

Không tự tạo mapping icon/label thanh toán trong từng page.

## 7. Charts

Nguồn:

- [`MemberWeightChart.tsx`](./src/components/charts/MemberWeightChart.tsx)
- [`StudentProgressChart.tsx`](./src/components/charts/StudentProgressChart.tsx)

```tsx
<div className="h-72">
  <StudentProgressChart data={points} />
</div>
```

`StudentProgressChart` cần parent có chiều cao vì dùng `ResponsiveContainer` với
`height="100%"`. `MemberWeightChart` có chiều cao 220px nội bộ.

Dữ liệu:

```ts
type ProgressPoint = {
  date: string
  weight: number | null
  bmi: number | null
}

type WeightPoint = {
  date: string
  weight: number
}
```

Nếu thêm chart mới, hãy tái sử dụng chart wrapper/theme hiện có thay vì lặp cấu
hình màu, tooltip và axis tại page.

## 8. Hooks

### 8.1. `useTrainerStudents`

Nguồn: [`useTrainerStudents.ts`](./src/hooks/useTrainerStudents.ts)

Input tùy chọn: `page`, `pageSize`, `search`, `status`.

Output:

```ts
{
  data,
  total,
  totalPages,
  loading,
  error,
  reload,
}
```

### 8.2. `useTrainerSessions`

Nguồn: [`useTrainerSessions.ts`](./src/hooks/useTrainerSessions.ts)

Filter hỗ trợ: `memberId`, `roomId`, `status`, `from`, `to`, `page`, `pageSize`,
`sort`.

Output: `data`, `total`, `loading`, `error`, `reload`.

### 8.3. `useTrainerPlans`

Nguồn: [`useTrainerPlans.ts`](./src/hooks/useTrainerPlans.ts)

Không nhận input. Output: `data`, `loading`, `error`, `reload`.

### 8.4. Quy tắc dùng hook

- Hook tự tải lại khi dependency filter thay đổi.
- Debounce search text trước khi truyền vào hook để tránh gọi API theo từng phím.
- Không gọi `reload()` trong effect phụ thuộc chính `reload` nếu hook đã tự load.
- Dùng `reload` sau create/update/delete thành công.
- Không sao chép state `loading/error/data` vào state thứ hai nếu không cần biến
  đổi dữ liệu.
- Memoize dữ liệu tính toán nặng; không memoize JSX nhỏ chỉ để “tối ưu”.

Ví dụ debounce:

```tsx
const [searchInput, setSearchInput] = useState('')
const deferredSearch = useDeferredValue(searchInput)
const students = useTrainerStudents({ search: deferredSearch, page: 1 })
```

## 9. Layouts và route guards

### 9.1. `AuthLayout`

Nguồn: [`AuthLayout.tsx`](./src/layouts/AuthLayout.tsx)

- Render `<Outlet />` cho route auth.
- Redirect người dùng đã đăng nhập về route theo role.
- Có `Suspense` fallback cho lazy page.

```tsx
<Route element={<AuthLayout />}>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
</Route>
```

### 9.2. `DashboardLayout`

Nguồn: [`DashboardLayout.tsx`](./src/layouts/DashboardLayout.tsx)

- Sở hữu `Sidebar`, `Topbar`, main scroll area và route `Outlet`.
- Tải trạng thái subscription cho member.
- Ẩn sidebar với member chưa có subscription.
- Dùng `PageSkeleton` làm lazy fallback.

Page con không render lại sidebar/topbar và không tự thêm `min-height: 100vh`.

### 9.3. `ProtectedRoute`

Nguồn: [`ProtectedRoute.tsx`](./src/components/shared/ProtectedRoute.tsx)

```tsx
<ProtectedRoute allowedRoles={['trainer']}>
  <DashboardLayout />
</ProtectedRoute>
```

Component redirect về `/login` khi chưa có user và về `/` khi role không được
phép.

### 9.4. `SubscriptionRequired`

Nguồn:
[`SubscriptionRequired.tsx`](./src/components/shared/SubscriptionRequired.tsx)

Dùng như route wrapper cho khu vực member yêu cầu gói tập:

```tsx
<Route element={<SubscriptionRequired />}>
  <Route path="workout/plan" element={<WorkoutPlanPage />} />
</Route>
```

Khi subscription chưa được tải, component hiển thị loading. Khi không có gói,
component redirect về `/member/subscription/setup`.

### 9.5. `Sidebar` và `Topbar`

Đây là shell component do `DashboardLayout` sở hữu. Không import trực tiếp vào
page. Menu/sidebar theo role và title topbar theo route được cấu hình tại chính hai
component này.

## 10. CSS API tái sử dụng

### 10.1. Foundation

| Nhu cầu | Class |
| --- | --- |
| Root public page | `.rogym-page` |
| Container | `.rogym-container` |
| Section | `.rogym-section` và variant |
| Card | `.rogym-card` và modifier |
| Label/input | `.rogym-field-label`, `.rogym-input` |
| Divider | `.rogym-divider` |
| Scrollbar | `.app-scrollbar` |

### 10.2. Actions

```tsx
<div className="flex flex-wrap gap-3">
  <button className="rogym-btn rogym-btn--primary">Xác nhận</button>
  <button className="rogym-btn rogym-btn--outline-white">Hủy</button>
  <button className="rogym-btn rogym-btn--danger">Xóa</button>
</div>
```

Base `.rogym-btn` là bắt buộc. Variant không thay thế base.

### 10.3. State

```tsx
<span className="rogym-tone-badge is-compact" data-tone="success">
  Đang hoạt động
</span>

<button
  className={cn('rogym-choice-chip', active && 'is-active')}
  aria-pressed={active}
>
  Tất cả
</button>

<article className="rogym-calendar-session" data-status={session.status}>
  {session.title}
</article>
```

Các state phổ biến:

- Boolean modifier: `is-active`, `is-open`, `is-selected`, `is-visible`,
  `is-completed`, `is-danger`, `is-warning`.
- Tone: `data-tone`.
- Session: `data-status`.

### 10.4. Domain classes

Chỉ dùng trong đúng miền:

| Miền | Nhóm class |
| --- | --- |
| Auth | `.rogym-auth-*`, `.rogym-quick-role*`, `.rogym-otp-input` |
| Shell | `.rogym-dashboard-*`, `.rogym-sidebar*`, `.rogym-topbar*` |
| Payment | `.rogym-payment-*`, `.rogym-checkout-*` |
| Workout | `.rogym-plan-*`, `.rogym-exercise-*`, `.rogym-workout-*` |
| Session | `.rogym-session-*`, `.rogym-calendar-*` |
| Package | `.rogym-package-*`, `.rogym-package-picker*` |

### 10.5. Generated classes

`.rogym-sx-*` là class migration nội bộ. Không:

- Dùng chúng như design token.
- Đoán ý nghĩa từ hash.
- Sao chép sang component mới.
- Đưa chúng vào public component API.

Khi gặp class hash cần tái sử dụng, hãy đặt tên semantic mới trong `globals.css`.

## 11. Ví dụ trang trainer hoàn chỉnh

```tsx
import { useDeferredValue, useState } from 'react'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
  TrainerStatusBadge,
} from '@/components/TrainerUI'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'

export default function TrainerStudentsPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const { data, loading, error, reload } = useTrainerStudents({
    search: deferredSearch,
    pageSize: 20,
  })

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Trainer"
        title="Học viên"
        actions={
          <input
            className="rogym-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm học viên"
            aria-label="Tìm học viên"
          />
        }
      />

      {loading ? (
        <TrainerSkeleton rows={4} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState
          title="Không tìm thấy học viên"
          description="Thử thay đổi từ khóa hoặc bộ lọc."
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {data.map((student) => (
            <article
              key={student.memberId}
              className="rogym-card rogym-card--compact rogym-card--interactive"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold rogym-text-primary">
                    {student.fullName}
                  </h2>
                  <p className="mt-1 text-sm rogym-text-muted">
                    {student.memberCode}
                  </p>
                </div>
                <TrainerStatusBadge status={student.status} />
              </div>
            </article>
          ))}
        </section>
      )}
    </TrainerPage>
  )
}
```

## 12. Checklist tạo màn hình mới

- Dùng đúng layout và route guard.
- Dùng `PageUI` hoặc alias theo role.
- Có đủ loading, empty và error state.
- Dùng hook/service hiện có, không gọi cùng API ở nhiều effect.
- Search text được debounce/defer khi cần.
- Dùng `Select` và date picker dùng chung.
- Dùng helper label/status/payment/exercise thay vì mapping lặp.
- Style nằm trong `globals.css`; TSX chỉ tham chiếu class.
- Không tạo class `.rogym-sx-*`.
- Dynamic state dùng modifier hoặc `data-*`.
- Kiểm tra keyboard, focus, disabled và mobile.
- Chạy `npm run lint` và `npm run build` trong `client`.
