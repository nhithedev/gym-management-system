# Hướng dẫn tái sử dụng Components, Hooks và Layouts

Tài liệu này mô tả các thành phần dùng chung hiện có trong:

- [`src/components`](./src/components)
- [`src/hooks`](./src/hooks)
- [`src/layouts`](./src/layouts)

Mục tiêu là giúp màn hình mới dùng lại đúng component, giữ giao diện nhất quán và không lặp lại logic gọi API, loading, error hoặc phân quyền.

---

## 1. Quy ước chung

### Import bằng alias

Alias `@/` trỏ tới `client/src/`. Ưu tiên:

```tsx
import { DatePickerInput } from '@/components/DatePickerInput'
import { useTrainerSessions } from '@/hooks/useTrainerSessions'
import DashboardLayout from '@/layouts/DashboardLayout'
```

Không nên dùng đường dẫn tương đối nhiều cấp như `../../../components/...`.

### CSS và design system

Các component dùng class `rogym-*` và CSS variables được định nghĩa trong
`src/styles/globals.css`. Khi mở rộng giao diện:

- Ưu tiên `rogym-card`, `rogym-btn`, `rogym-input`, `rogym-field-label`.
- Dùng token `var(--rogym-...)` thay vì tạo màu mới nếu đã có token phù hợp.
- Tuân theo [`design.md`](./design.md).

### Provider và context cần thiết

| Thành phần | Phụ thuộc |
| --- | --- |
| `ProtectedRoute`, `AuthLayout`, `DashboardLayout`, `Sidebar`, `Topbar` | React Router và `useAuthStore` |
| `DashboardLayout`, `Sidebar`, `Topbar`, `SubscriptionRequired` | `useSubscriptionStore` |
| Các hook trainer | Axios/service đã cấu hình xác thực |
| `DatePickerInput` | `react-day-picker`, `date-fns`, locale tiếng Việt |

Các component dùng `Navigate`, `NavLink`, `Outlet`, `useNavigate` hoặc
`useLocation` phải được render bên trong router.

---

## 2. Chọn thành phần phù hợp

| Nhu cầu | Thành phần nên dùng |
| --- | --- |
| Khung trang, tiêu đề, loading, empty, error | `components/shared/PageUI.tsx` |
| Trang dành cho trainer | Các alias và component trong `components/TrainerUI.tsx` |
| Chọn một ngày | `DatePickerInput` |
| Hiển thị hoặc lọc bài tập | `ExerciseUI.tsx`, `exercise-data.ts` |
| Nhập sets, reps, thời lượng, mức tạ | `ExerciseTargetFields` |
| Hiển thị phương thức thanh toán | `payment-method-data.ts`, `PaymentMethodIcon` |
| Chặn route theo role | `ProtectedRoute` |
| Chặn route member chưa có gói active | `SubscriptionRequired` |
| Tải học viên, buổi tập, kế hoạch trainer | Các hook trong `src/hooks` |
| Trang đăng nhập/khôi phục mật khẩu | `AuthLayout` |
| Trang dashboard sau đăng nhập | `DashboardLayout` |

---

## 3. Components dùng chung

### 3.1. PageUI

File: [`src/components/shared/PageUI.tsx`](./src/components/shared/PageUI.tsx)

#### Danh sách export

| Export | Props chính | Công dụng |
| --- | --- | --- |
| `Page` | `children`, `className?` | Container trang, rộng tối đa `1280px` |
| `PageHeader` | `title`, `eyebrow?`, `description?`, `actions?` | Tiêu đề và nhóm CTA của trang |
| `PageSkeleton` | `rows?` | Skeleton khi đang tải, mặc định 3 dòng |
| `PageEmptyState` | `title`, `description?`, `action?` | Trạng thái không có dữ liệu |
| `PageErrorState` | `message`, `onRetry?` | Hiển thị lỗi và nút thử lại |

#### Pattern hiển thị dữ liệu

```tsx
import {
  Page,
  PageEmptyState,
  PageErrorState,
  PageHeader,
  PageSkeleton,
} from '@/components/shared/PageUI'

export function ExamplePage() {
  const { data, loading, error, reload } = useExampleData()

  return (
    <Page>
      <PageHeader
        eyebrow="Quản lý"
        title="Danh sách dữ liệu"
        description="Mô tả ngắn cho màn hình."
        actions={
          <button className="rogym-btn rogym-btn--primary">
            Tạo mới
          </button>
        }
      />

      {loading ? (
        <PageSkeleton rows={5} />
      ) : error ? (
        <PageErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <PageEmptyState
          title="Chưa có dữ liệu"
          description="Tạo bản ghi đầu tiên để bắt đầu."
        />
      ) : (
        <DataList data={data} />
      )}
    </Page>
  )
}
```

Nên giữ thứ tự trạng thái: `loading` -> `error` -> `empty` -> nội dung.

### 3.2. TrainerUI

File: [`src/components/TrainerUI.tsx`](./src/components/TrainerUI.tsx)

`TrainerUI` export lại `PageUI` với tên dành cho trainer:

| Alias trainer | Export gốc |
| --- | --- |
| `TrainerPage` | `Page` |
| `TrainerPageHeader` | `PageHeader` |
| `TrainerSkeleton` | `PageSkeleton` |
| `TrainerEmptyState` | `PageEmptyState` |
| `TrainerErrorState` | `PageErrorState` |

Trang trainer nên import qua `TrainerUI` để các import cùng một nguồn:

```tsx
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSkeleton,
} from '@/components/TrainerUI'
```

#### `TrainerStatCard`

Hiển thị một chỉ số trên dashboard.

```tsx
<TrainerStatCard
  icon={<Users size={20} />}
  label="Học viên"
  value={total}
  hint="Đang được phân công"
/>
```

Props: `icon`, `label`, `value`, `hint?`.

#### `TrainerStatusBadge`

```tsx
<TrainerStatusBadge status={session.status} />
<TrainerStatusBadge status="custom" tone="warning" />
```

- `status` được chuyển thành nhãn qua `statusLabel`.
- Nếu không truyền `tone`, màu được xác định bởi `statusTone`.
- `tone` hỗ trợ: `success`, `accent`, `warning`, `danger`, `muted`.

#### `TrainerModal`

Modal được điều khiển hoàn toàn bởi component cha.

```tsx
<TrainerModal
  open={open}
  title="Xác nhận thao tác"
  onClose={() => setOpen(false)}
  footer={
    <>
      <button
        type="button"
        className="rogym-btn rogym-btn--outline-white"
        onClick={() => setOpen(false)}
      >
        Hủy
      </button>
      <SubmitButton form="example-form" loading={submitting}>
        Lưu
      </SubmitButton>
    </>
  }
>
  <form id="example-form" onSubmit={handleSubmit}>
    {/* fields */}
  </form>
</TrainerModal>
```

`TrainerModal` chỉ render khi `open = true`. Component cha chịu trách nhiệm quản
lý state, submit và đóng modal.

#### `SubmitButton`

Props: `loading?`, `disabled?`, `form?`, `children`.

- Luôn có `type="submit"`.
- Khi `loading`, nút bị disable và hiển thị spinner.
- Dùng `form` để submit form nằm ngoài nút, ví dụ footer của modal.

#### `TrainerSelect`

Select được xây trên Radix UI nhưng nhận các thẻ `<option>` làm cấu hình:

```tsx
<TrainerSelect
  name="status"
  value={status}
  onValueChange={setStatus}
  ariaLabel="Trạng thái"
>
  <option value="">Mọi trạng thái</option>
  <option value="scheduled">Đã lên lịch</option>
  <option value="completed">Hoàn thành</option>
</TrainerSelect>
```

Props:

| Prop | Kiểu | Ghi chú |
| --- | --- | --- |
| `value` | `string` | Giá trị đang chọn |
| `onValueChange` | `(value: string) => void` | Callback thay đổi |
| `children` | `ReactNode` | Các `<option>` trực tiếp |
| `disabled?` | `boolean` | Khóa select |
| `required?` | `boolean` | Không hiển thị option có value rỗng |
| `name?` | `string` | Tên field |
| `ariaLabel?` | `string` | Nhãn truy cập |
| `className?` | `string` | Bổ sung class cho trigger |

Không bọc các `<option>` trong fragment hoặc component trung gian vì
`TrainerSelect` đọc trực tiếp props của từng child.

#### `StudentCombobox`

Wrapper của `TrainerSelect` dành cho `TrainerStudentSummary[]`.

```tsx
<StudentCombobox
  students={students}
  value={memberId}
  onChange={setMemberId}
  disabled={loadingStudents}
/>
```

Option hiển thị theo định dạng `memberCode - fullName`.

### 3.3. DatePickerInput

File: [`src/components/DatePickerInput.tsx`](./src/components/DatePickerInput.tsx)

```tsx
<DatePickerInput
  value={date}
  onChange={setDate}
  min="2026-01-01"
  max="2026-12-31"
  placeholder="Chọn ngày bắt đầu"
  aria-label="Ngày bắt đầu"
/>
```

Quy ước giá trị:

- Giá trị đầu vào và đầu ra: `yyyy-MM-dd`, ví dụ `2026-06-11`.
- Giá trị hiển thị: `dd/MM/yyyy`.
- `min` và `max` cũng phải dùng `yyyy-MM-dd`.
- Locale lịch là tiếng Việt.
- Component không cung cấp nút xóa ngày; component cha phải tự đặt value về `''`.

Prop `required` hiện có trong type nhưng không được truyền xuống một input native.
Nếu field bắt buộc, cần kiểm tra value trong logic validate/submit của form.

### 3.4. Workout components

#### `ExerciseCard`

File: [`src/components/workout/ExerciseUI.tsx`](./src/components/workout/ExerciseUI.tsx)

```tsx
<ExerciseCard
  exercise={exercise}
  imageAspect="aspect-video"
  onClick={() => openDetail(exercise)}
  action={
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        addExercise(exercise)
      }}
    >
      Thêm
    </button>
  }
/>
```

Props: `exercise`, `action?`, `onClick?`, `imageAspect?`.

Nếu card có `onClick` và `action` chứa button riêng, gọi
`event.stopPropagation()` để thao tác của button không đồng thời mở card.

#### `ExerciseCategoryFilterPopover`

Popover là controlled component:

```tsx
const [open, setOpen] = useState(false)
const [category, setCategory] = useState<ExerciseCategoryFilter>('')
const [draftCategory, setDraftCategory] = useState<ExerciseCategoryFilter>('')

function openFilter() {
  setDraftCategory(category)
  setOpen(true)
}

return (
  <div className="relative">
    <button type="button" onClick={openFilter}>
      Lọc
    </button>
    <ExerciseCategoryFilterPopover
      open={open}
      value={draftCategory}
      onChange={setDraftCategory}
      onApply={() => {
        setCategory(draftCategory)
        setOpen(false)
      }}
      onClose={() => setOpen(false)}
    />
  </div>
)
```

Parent nên có `position: relative` vì panel dùng `absolute right-0 top-full`.
Dùng state `draft` nếu chỉ muốn áp dụng bộ lọc sau khi người dùng bấm "Lưu".

#### Tiện ích trong `exercise-data.ts`

| Export | Công dụng |
| --- | --- |
| `ExerciseCategoryFilter` | Type category hoặc chuỗi rỗng |
| `EXERCISE_CATEGORY_OPTIONS` | Danh sách option category |
| `getExerciseCategoryLabel(category)` | Chuyển category thành nhãn tiếng Việt |
| `filterExercises(...)` | Lọc theo category và từ khóa |

```tsx
const filtered = useMemo(
  () => filterExercises(exercises, search, category, true),
  [exercises, search, category],
)
```

Tham số thứ tư `includeDescription` quyết định có tìm trong mô tả hay không.

#### `NumberField` và `ExerciseTargetFields`

File: [`src/components/workout/PlanBuilderUI.tsx`](./src/components/workout/PlanBuilderUI.tsx)

```tsx
<ExerciseTargetFields
  category={selectedExercise?.category}
  values={{
    sets,
    reps,
    duration,
    weight,
    restSeconds,
  }}
  onChange={{
    sets: setSets,
    reps: setReps,
    duration: setDuration,
    weight: setWeight,
    restSeconds: setRestSeconds,
  }}
  weightPlaceholder="Tùy chọn"
/>
```

Quy tắc hiển thị:

- Bài `cardio`: ẩn reps, hiển thị duration.
- Category khác: hiển thị reps.
- `durationMode="always"`: luôn hiển thị duration.
- `restOutsideGrid`: đưa field thời gian nghỉ ra ngoài grid.
- `compact`: giảm khoảng cách giữa label và input.

`weight` dùng kiểu `string` để giữ được trạng thái input rỗng. Chỉ chuyển sang
`number` khi tạo payload gửi API.

### 3.5. Payment components và utilities

Files:

- [`src/components/payment/payment-method-data.ts`](./src/components/payment/payment-method-data.ts)
- [`src/components/payment/payment-methods.tsx`](./src/components/payment/payment-methods.tsx)

```tsx
import {
  PAYMENT_METHOD_OPTIONS,
  getPaymentMethodLabel,
  maskPaymentAccountRef,
} from '@/components/payment/payment-method-data'
import { PaymentMethodIcon } from '@/components/payment/payment-methods'

<PaymentMethodIcon method={payment.method} size={20} />
<span>{getPaymentMethodLabel(payment.method)}</span>
<span>{maskPaymentAccountRef(payment.accountReference)}</span>
```

| Export | Công dụng |
| --- | --- |
| `PAYMENT_METHOD_OPTIONS` | Option gồm value, label, shortLabel và icon |
| `getPaymentMethodLabel(method, compact?)` | Nhãn đầy đủ hoặc rút gọn |
| `maskPaymentAccountRef(reference)` | Chỉ để lộ 4 ký tự cuối |
| `PaymentMethodIcon` | Icon tương ứng phương thức, fallback là tiền mặt |

### 3.6. Route và shell components

#### `ProtectedRoute`

File: [`src/components/shared/ProtectedRoute.tsx`](./src/components/shared/ProtectedRoute.tsx)

```tsx
<ProtectedRoute allowedRoles={['trainer', 'owner']}>
  <DashboardLayout />
</ProtectedRoute>
```

- Chưa đăng nhập: chuyển tới `/login`.
- Role không hợp lệ: chuyển tới `/`.
- Hiện tại component kiểm tra `user.roles[0]`, vì vậy role đầu tiên là role có
  hiệu lực trong điều hướng.

#### `SubscriptionRequired`

File:
[`src/components/shared/SubscriptionRequired.tsx`](./src/components/shared/SubscriptionRequired.tsx)

Component này dành cho nested route:

```tsx
<Route element={<SubscriptionRequired />}>
  <Route path="/member/workout/plan" element={<MyPlanPage />} />
  <Route path="/member/progress" element={<ProgressPage />} />
</Route>
```

- `hasActiveSub === null`: hiển thị loading.
- `hasActiveSub === false`: chuyển tới `/member/subscription/setup`.
- `hasActiveSub === true`: render route con qua `<Outlet />`.

#### `Sidebar` và `Topbar`

Hai component này đã được ghép trong `DashboardLayout`. Trang nghiệp vụ không
nên render lại trực tiếp, tránh xuất hiện hai sidebar/topbar hoặc chạy trùng logic
store và điều hướng.

---

## 4. Hooks

Các hook hiện tại tự gọi API khi mount và gọi lại khi filter trong dependency
thay đổi. Mỗi hook trả về `loading`, `error` và `reload` để trang xử lý trạng
thái thống nhất.

Không gọi hook trong `if`, vòng lặp hoặc callback. Luôn gọi ở cấp cao nhất của
React component.

### 4.1. `useTrainerStudents`

File: [`src/hooks/useTrainerStudents.ts`](./src/hooks/useTrainerStudents.ts)

```tsx
const {
  data: students,
  total,
  totalPages,
  loading,
  error,
  reload,
} = useTrainerStudents({
  page: 1,
  pageSize: 12,
  search: search || undefined,
  status: status || undefined,
})
```

Input:

| Filter | Kiểu |
| --- | --- |
| `page` | `number?` |
| `pageSize` | `number?` |
| `search` | `string?` |
| `status` | `string?` |

Output:

| Field | Kiểu/ý nghĩa |
| --- | --- |
| `data` | `TrainerStudentSummary[]` |
| `total` | Tổng số kết quả |
| `totalPages` | Tổng số trang từ API |
| `loading` | Đang tải |
| `error` | Chuỗi lỗi hoặc `null` |
| `reload` | Gọi lại request hiện tại |

### 4.2. `useTrainerSessions`

File: [`src/hooks/useTrainerSessions.ts`](./src/hooks/useTrainerSessions.ts)

```tsx
const { data, total, loading, error, reload } = useTrainerSessions({
  memberId: memberId || undefined,
  roomId: roomId || undefined,
  status: status || undefined,
  from: from ? startOfLocalDayIso(from) : undefined,
  to: to ? endOfLocalDayIso(to) : undefined,
  page,
  pageSize: 12,
  sort: 'start_time:desc',
})
```

Filter hỗ trợ: `memberId`, `roomId`, `status`, `from`, `to`, `page`,
`pageSize`, `sort`.

`from` và `to` gửi vào API là datetime. Khi lấy từ `DatePickerInput`, nên chuyển
ngày local bằng `startOfLocalDayIso` và `endOfLocalDayIso`.

Hook chỉ trả `total`, không trả `totalPages`:

```tsx
const totalPages = Math.max(1, Math.ceil(total / pageSize))
```

### 4.3. `useTrainerPlans`

File: [`src/hooks/useTrainerPlans.ts`](./src/hooks/useTrainerPlans.ts)

```tsx
const { data: plans, loading, error, reload } = useTrainerPlans()
```

Hook không nhận filter và trả về:

- `data: WorkoutPlan[]`
- `loading`
- `error`
- `reload`

Sau mutation tạo, sửa hoặc xóa kế hoạch, gọi `await reload()` để đồng bộ lại
danh sách.

### 4.4. Quản lý filter để tránh gọi API quá nhiều

Vì hooks gọi lại API mỗi khi input thay đổi, không nên truyền trực tiếp giá trị
search đang gõ nếu không muốn request sau mỗi ký tự. Dùng state nháp và chỉ áp
dụng khi submit:

```tsx
const [searchInput, setSearchInput] = useState('')
const [search, setSearch] = useState('')

const result = useTrainerStudents({
  search: search || undefined,
})

function applySearch() {
  setSearch(searchInput.trim())
}
```

Với filter cần chia sẻ qua URL, dùng `useSearchParams` làm nguồn dữ liệu cho
hook. Khi filter đổi, đặt lại `page` về `1`.

---

## 5. Layouts và cấu hình route

### 5.1. `AuthLayout`

File: [`src/layouts/AuthLayout.tsx`](./src/layouts/AuthLayout.tsx)

Dùng cho các route chỉ dành cho khách:

```tsx
<Route element={<AuthLayout />}>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
</Route>
```

Nếu người dùng đã đăng nhập, layout chuyển về dashboard theo role đầu tiên:

| Role | Route |
| --- | --- |
| `member` | `/member` |
| `trainer` | `/trainer` |
| `staff` | `/staff` |
| `owner` | `/owner` |

Nếu chưa đăng nhập, layout render route con qua `<Outlet />`.

### 5.2. `DashboardLayout`

File: [`src/layouts/DashboardLayout.tsx`](./src/layouts/DashboardLayout.tsx)

Layout cung cấp:

- Nền dashboard.
- `Sidebar`.
- `Topbar`.
- Vùng nội dung route con qua `<Outlet />`.
- Kiểm tra subscription cho member nếu store chưa có dữ liệu.

Nên đặt `DashboardLayout` bên trong `ProtectedRoute` để luôn có user:

```tsx
<Route
  element={
    <ProtectedRoute allowedRoles={['trainer']}>
      <DashboardLayout />
    </ProtectedRoute>
  }
>
  <Route path="/trainer" element={<TrainerDashboardPage />} />
  <Route path="/trainer/students" element={<StudentsListPage />} />
</Route>
```

Với member, tách route được truy cập không cần gói tập và route yêu cầu gói
active:

```tsx
<Route
  element={
    <ProtectedRoute allowedRoles={['member']}>
      <DashboardLayout />
    </ProtectedRoute>
  }
>
  <Route path="/member/profile" element={<MemberProfilePage />} />
  <Route
    path="/member/subscription/setup"
    element={<SubscriptionSetupPage />}
  />

  <Route element={<SubscriptionRequired />}>
    <Route path="/member" element={<MemberDashboardPage />} />
    <Route path="/member/workout/plan" element={<MyPlanPage />} />
  </Route>
</Route>
```

Không đặt trang mua gói bên trong `SubscriptionRequired`, nếu không member chưa
có gói sẽ bị redirect lặp.

---

## 6. Ví dụ trang trainer hoàn chỉnh

Ví dụ dưới đây kết hợp layout page, hook, select và các trạng thái dữ liệu:

```tsx
import { useState } from 'react'
import { useTrainerStudents } from '@/hooks/useTrainerStudents'
import {
  TrainerEmptyState,
  TrainerErrorState,
  TrainerPage,
  TrainerPageHeader,
  TrainerSelect,
  TrainerSkeleton,
} from '@/components/TrainerUI'

export default function TrainerStudentsExamplePage() {
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useTrainerStudents({
    status: status || undefined,
  })

  return (
    <TrainerPage>
      <TrainerPageHeader
        eyebrow="Học viên"
        title="Danh sách học viên"
      />

      <div className="rogym-card rogym-card--compact p-4">
        <TrainerSelect value={status} onValueChange={setStatus}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đã khóa</option>
        </TrainerSelect>
      </div>

      {loading ? (
        <TrainerSkeleton rows={5} />
      ) : error ? (
        <TrainerErrorState message={error} onRetry={reload} />
      ) : data.length === 0 ? (
        <TrainerEmptyState title="Không tìm thấy học viên" />
      ) : (
        <div className="grid gap-4">
          {data.map((student) => (
            <article
              key={student.memberId}
              className="rogym-card rogym-card--compact p-5"
            >
              <h2 className="font-semibold text-white">
                {student.fullName}
              </h2>
              <p className="text-sm text-[var(--rogym-text-secondary)]">
                {student.memberCode}
              </p>
            </article>
          ))}
        </div>
      )}
    </TrainerPage>
  )
}
```

Route của trang chỉ cần đặt bên trong nhóm route đã có `DashboardLayout`; không
render layout thêm lần nữa trong page.

---

## 7. Checklist khi tạo màn hình mới

- Dùng alias `@/` cho import.
- Chọn `PageUI` hoặc alias trong `TrainerUI` trước khi tự tạo page shell.
- Xử lý đủ loading, error, empty và success.
- Dùng `reload` sau mutation cần làm mới danh sách.
- Đưa filter dùng chung/chia sẻ được lên URL bằng `useSearchParams`.
- Đặt lại page về `1` khi filter thay đổi.
- Dùng đúng định dạng `yyyy-MM-dd` cho `DatePickerInput`.
- Không render `Sidebar` hoặc `Topbar` trực tiếp trong page.
- Đặt layout và guard ở cấu hình route, không đặt trong component nội dung.
- Dùng `SubscriptionRequired` dưới dạng nested route có `<Outlet />`.
- Kiểm tra role đầu tiên trong `user.roles` vì guard và layout đang dựa vào
  `roles[0]`.
- Chạy `npm run lint` và `npm run build` trong `client/` trước khi hoàn tất.
