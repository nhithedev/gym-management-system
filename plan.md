# Owner Pages Fix Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sửa toàn bộ bug, vấn đề UX, và code trùng lặp trong `client/src/pages/owner`.

**Architecture:** Bug/High fixes là thay đổi tại chỗ trong từng file. Medium fixes tạo shared utilities rồi refactor tất cả consumer. Low fixes là surgical edits nhỏ.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, `@/` alias → `client/src/`

---

## Files sẽ tạo mới

| File | Mục đích |
|------|----------|
| `client/src/lib/owner-constants.ts` | Centralize màu sắc và label dùng chung |
| `client/src/hooks/useDebounce.ts` | Generic debounce hook |

## Files sẽ sửa đổi

| File | Lý do |
|------|-------|
| `client/src/components/ui/Modal.tsx` | Thêm prop `size` để hỗ trợ nhiều width |
| `client/src/lib/date.ts` | Thêm `todayInputDate()`, `monthStartDate()` |
| `client/src/pages/owner/DashboardPage.tsx` | Bug: sai link, sai icon |
| `client/src/pages/owner/rbac/GroupsPage.tsx` | Bug: silent error; High: alert(); Medium: constants, Modal, debounce, PAGE_SIZE |
| `client/src/pages/owner/packages/PackagesPage.tsx` | Medium: constants, Modal, debounce, skeleton rows |
| `client/src/pages/owner/staff-management/UsersPage.tsx` | Bug: delete logic; High: labels EN, filter options; Medium: constants, debounce |
| `client/src/pages/owner/staff-management/UserDetailPage.tsx` | High: badge missing cases; Low: retry, cancel button; Medium: constants |
| `client/src/pages/owner/reports/RevenuePage.tsx` | Medium: extract helpers, fix state type, fix style conflict |
| `client/src/pages/owner/reports/MembersReportPage.tsx` | Medium: extract helpers |
| `client/src/pages/owner/reports/RenewalsReportPage.tsx` | Medium: extract helpers |
| `client/src/pages/owner/reports/StaffPerformanceReportPage.tsx` | Medium: extract helpers |

---

## BUG

### Task 1 — DashboardPage: sai link và sai icon

**Files:** `client/src/pages/owner/DashboardPage.tsx`

Vấn đề:
- Equipment alert có link `to="/staff/equipment"` — owner không có route `/owner/equipment`, xóa nút "Xem ngay" hoặc link đúng.
- QuickLink "Phân quyền & nhóm" dùng icon `Package` thay vì `Shield`.

- [x] Thêm `Shield` vào import lucide (xóa `Package` nếu không còn dùng):

```tsx
import {
  Users, MessageSquare, Wrench, TrendingUp, ArrowRight,
  AlertTriangle, Shield,
} from 'lucide-react'
```

- [x] Sửa Equipment alert: xóa `<Link to="/staff/equipment">Xem ngay →</Link>` vì chưa có route owner cho equipment. Giữ nội dung text cảnh báo, chỉ bỏ link.

- [x] Sửa QuickLink RBAC — tìm `<QuickLink` trỏ `/owner/rbac/groups`, đổi icon:

```tsx
<QuickLink to="/owner/rbac/groups" label="Phân quyền & nhóm" icon={<Shield size={16} />} />
```

---

### Task 2 — GroupsPage: openPermissions nuốt lỗi không thông báo

**Files:** `client/src/pages/owner/rbac/GroupsPage.tsx`

Vấn đề: `openPermissions` catch block có `/* ignore */` — khi API fail, user click "Phân quyền" nhưng modal không mở, không có feedback gì.

- [x] Thêm state `permissionsError`:

```tsx
const [permissionsError, setPermissionsError] = useState<string | null>(null)
```

- [x] Sửa `openPermissions`:

```tsx
async function openPermissions(group: Group) {
  if (group.name === 'owner') return
  setPermissionsError(null)
  try {
    const detail = await rbacService.getGroup(group.groupId)
    setPermissionsGroup(detail)
  } catch (err) {
    setPermissionsError(getApiError(err, 'Không thể tải quyền của nhóm.'))
  }
}
```

- [x] Hiển thị `permissionsError` trong JSX sau phần search/filter:

```tsx
{permissionsError && (
  <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
    {permissionsError}
  </div>
)}
```

---

### Task 3 — UsersPage: nút Xóa dựa vào filter state thay vì staff.status

**Files:** `client/src/pages/owner/staff-management/UsersPage.tsx`

Vấn đề: nút Xóa hiện với điều kiện `status === 'active'` (filter state), không phải `staff.status`. Nếu đang lọc "active", cả pending_verification cũng thấy nút Xóa.

- [x] Tìm dòng render nút Xóa, đổi điều kiện:

```tsx
{staff.status !== 'deleted' && (
  <button
    className="rogym-btn rogym-btn--danger rogym-btn--nav"
    disabled={deletingId === staff.staffId}
    onClick={() => handleDelete(staff)}
  >
    {deletingId === staff.staffId ? (
      <LoaderCircle size={14} className="animate-spin" />
    ) : (
      <Trash2 size={14} />
    )}
    Xóa
  </button>
)}
```

---

## HIGH

### Task 4 — GroupsPage: thay alert() bằng inline error

**Files:** `client/src/pages/owner/rbac/GroupsPage.tsx`

Vấn đề: `alert('Nhóm đang có thành viên...')` trong `handleDelete` block UI thread.

- [x] Thêm state `deleteError`:

```tsx
const [deleteError, setDeleteError] = useState<string | null>(null)
```

- [x] Sửa `handleDelete` — xóa `alert(...)`:

```tsx
async function handleDelete(group: Group) {
  if (SYSTEM_GROUPS.has(group.name)) return
  setDeleteError(null)
  try {
    await rbacService.deleteGroup(group.groupId)
    setGroups((prev) => prev.filter((g) => g.groupId !== group.groupId))
    setTotal((t) => t - 1)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 409) {
      setDeleteError('Nhóm đang có thành viên, không thể xóa.')
    } else {
      setDeleteError(getApiError(err, 'Xóa thất bại.'))
    }
  }
}
```

- [x] Hiển thị `deleteError` trong JSX sau phần search/filter:

```tsx
{deleteError && (
  <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
    {deleteError}
  </div>
)}
```

---

### Task 5 — UsersPage: position filter options tiếng Anh

**Files:** `client/src/pages/owner/staff-management/UsersPage.tsx`

Vấn đề: `<option>` text hiển thị "staff", "trainer", "owner" thô.

- [x] Sửa option labels:

```tsx
<option value="">Tất cả vị trí</option>
<option value="staff">Nhân viên</option>
<option value="trainer">Huấn luyện viên</option>
<option value="owner">Quản lý</option>
```

---

### Task 6 — UsersPage: status filter thiếu pending_verification và locked

**Files:** `client/src/pages/owner/staff-management/UsersPage.tsx`

Vấn đề: filter chỉ có 'active' và 'deleted'.

- [x] Sửa status filter select — đủ 4 trạng thái:

```tsx
<option value="active">Hoạt động</option>
<option value="pending_verification">Chờ xác thực</option>
<option value="locked">Bị khóa</option>
<option value="deleted">Đã xóa</option>
```

---

### Task 7 — UserDetailPage: status badge thiếu case locked và deleted

**Files:** `client/src/pages/owner/staff-management/UserDetailPage.tsx`

Vấn đề: badge chỉ xử lý `active` / else → 'Chờ xác thực'.

- [x] Thêm const mapping sau `POSITION_COLOR`:

```tsx
const STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  pending_verification: '#f59e0b',
  locked: '#ef4444',
  deleted: '#6b7280',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động',
  pending_verification: 'Chờ xác thực',
  locked: 'Bị khóa',
  deleted: 'Đã xóa',
}
```

- [x] Sửa `<OwnerBadge>`:

```tsx
<OwnerBadge
  label={STATUS_LABEL[staff.status] ?? staff.status}
  color={STATUS_COLOR[staff.status] ?? '#6b7280'}
/>
```

---

## MEDIUM

### Task 8 — Tạo owner-constants.ts, refactor 8 files

**Files:**
- Tạo: `client/src/lib/owner-constants.ts`
- Sửa: DashboardPage, PackagesPage, GroupsPage, UsersPage, UserDetailPage, RevenuePage, MembersReportPage, StaffPerformanceReportPage

- [x] Tạo `client/src/lib/owner-constants.ts`:

```ts
export const OWNER_ACCENT = '#06c384'

export const PACKAGE_STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  inactive: '#f59e0b',
}
export const PACKAGE_STATUS_LABEL: Record<string, string> = {
  active: 'Đang bán',
  inactive: 'Ngừng bán',
}

export const USER_STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  pending_verification: '#f59e0b',
  locked: '#ef4444',
  deleted: '#6b7280',
}
export const USER_STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động',
  pending_verification: 'Chờ xác thực',
  locked: 'Bị khóa',
  deleted: 'Đã xóa',
}

export const STAFF_POSITION_COLOR: Record<string, string> = {
  staff: '#3b82f6',
  trainer: '#8b5cf6',
  owner: '#f59e0b',
  member: OWNER_ACCENT,
}
```

- [x] Sửa `DashboardPage.tsx`: import `OWNER_ACCENT`; xóa `const G`; thay `G` → `OWNER_ACCENT`.

- [x] Sửa `PackagesPage.tsx`: import `OWNER_ACCENT, PACKAGE_STATUS_COLOR, PACKAGE_STATUS_LABEL`; xóa `const G, STATUS_COLOR, STATUS_LABEL`; thay tên.

- [x] Sửa `GroupsPage.tsx`: import `OWNER_ACCENT`; xóa `const G`; thay `G` → `OWNER_ACCENT`.

- [x] Sửa `UsersPage.tsx`: import `OWNER_ACCENT, STAFF_POSITION_COLOR, USER_STATUS_COLOR, USER_STATUS_LABEL`; xóa local consts; thay tên.

- [x] Sửa `UserDetailPage.tsx`: import `OWNER_ACCENT, STAFF_POSITION_COLOR, USER_STATUS_COLOR, USER_STATUS_LABEL`; xóa local consts (STATUS_COLOR/LABEL từ Task 7 → chuyển thành import); thay tên.

- [x] Sửa `RevenuePage.tsx`: import `OWNER_ACCENT`; xóa `const G`; thay `G` → `OWNER_ACCENT`.

- [x] Sửa `MembersReportPage.tsx`: tương tự RevenuePage.

- [x] Sửa `StaffPerformanceReportPage.tsx`: tương tự RevenuePage.

- [ ] Sửa `RenewalsReportPage.tsx`: import `OWNER_ACCENT`; đổi `RENEWED_COLOR = '#06c384'` → `const RENEWED_COLOR = OWNER_ACCENT`.

---

### Task 9 — Tạo useDebounce, refactor 3 files

**Files:**
- Tạo: `client/src/hooks/useDebounce.ts`
- Sửa: PackagesPage, GroupsPage, UsersPage

- [x] Tạo `client/src/hooks/useDebounce.ts`:

```ts
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
```

- [ ] Sửa `PackagesPage.tsx`: import `useDebounce`; xóa `useState` debounced + `useEffect` debounce inline; thêm `const debouncedSearch = useDebounce(search)`.

- [x] Sửa `GroupsPage.tsx`: tương tự.

- [x] Sửa `UsersPage.tsx`: tương tự.

---

### Task 10 — Extract date helpers vào lib/date.ts, refactor 4 report pages

**Files:**
- Sửa: `client/src/lib/date.ts` (append)
- Sửa: RevenuePage, MembersReportPage, RenewalsReportPage, StaffPerformanceReportPage

- [x] Đọc `client/src/lib/date.ts`, sau đó append:

```ts
export function todayInputDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
}

export function monthStartDate(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}
```

> Lưu ý: Dùng tên `todayInput` / `monthStart` (đã có sẵn trong date.ts) thay vì tạo tên mới `todayInputDate`/`monthStartDate`.

- [x] Sửa `RevenuePage.tsx`: import `todayInput, monthStart`; xóa local functions; thay tên trong toàn file.

- [x] Sửa `MembersReportPage.tsx`: tương tự.

- [x] Sửa `RenewalsReportPage.tsx`: tương tự.

- [x] Sửa `StaffPerformanceReportPage.tsx`: tương tự.

---

### Task 11 — Thêm size prop vào Modal, refactor PackagesPage và GroupsPage

**Files:**
- Sửa: `client/src/components/ui/Modal.tsx`
- Sửa: PackagesPage, GroupsPage

- [x] Sửa `Modal.tsx` — thêm `size` prop với default `'xl'` (backward compat):

```tsx
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  size?: ModalSize
}

export function Modal({ open, title, children, onClose, footer, size = 'xl' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`max-h-[90vh] w-full ${SIZE_CLASS[size]} overflow-y-auto rounded-2xl border border-white/10 bg-[var(--rogym-bg-card)] shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 id="modal-title" className="text-lg font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            className="rogym-btn rogym-btn--icon rogym-btn--elevated"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] Sửa `PackagesPage.tsx`:
  - Import `Modal` từ `@/components/ui/Modal`
  - Xóa `<div className="fixed inset-0 z-50 ...">` wrapper trong `PackageModal`; bọc content trong `<Modal open title="..." onClose={onClose} size="lg" footer={...}>`; chuyển form buttons vào `footer` prop
  - Tương tự `DeleteConfirmModal` với `size="sm"`

- [ ] Sửa `GroupsPage.tsx`:
  - Import `Modal`
  - Xóa inline modal wrapper trong `EditGroupModal`; bọc trong `<Modal open title="Sửa nhóm quyền" onClose={onClose} size="md" footer={...}>`
  - Tương tự `PermissionsModal` với `size="2xl"`

---

### Task 12 — RevenuePage: fix state type và style conflict

**Files:** `client/src/pages/owner/reports/RevenuePage.tsx`

- [ ] Sửa state `total`:

```tsx
const [total, setTotal] = useState<number>(0)
```

Cập nhật mọi `setTotal(...)` đảm bảo truyền số; xóa mọi `Number(total)` wrapper.

> Lưu ý: `RevenueData.total` được type là `string` trong service — cần cast hoặc sửa service type trước khi đổi state type.

- [x] Sửa KPI card — xóa `text-white` vì `style={{ color: OWNER_ACCENT }}` đã override:

```tsx
<div className="text-2xl font-bold" style={{ color: OWNER_ACCENT }}>
  {formatVnd(total)}
</div>
```

---

## LOW

### Task 13 — GroupsPage: thay magic number 20 bằng PAGE_SIZE

**Files:** `client/src/pages/owner/rbac/GroupsPage.tsx`

- [x] Thêm sau imports: `const PAGE_SIZE = 20`
- [x] Thay tất cả hardcode `20` trong fetch params và tính total pages.

---

### Task 14 — UserDetailPage: retry không dùng window.location.reload()

**Files:** `client/src/pages/owner/staff-management/UserDetailPage.tsx`

- [x] Tách fetch logic thành `loadStaff` (useCallback), dùng làm `useEffect` dependency và `onRetry`:

```tsx
const loadStaff = useCallback(() => {
  if (!id) return
  setLoading(true)
  setError(null)
  // ... fetch logic hiện tại
}, [id])

useEffect(() => { loadStaff() }, [loadStaff])

// error state:
if (error) return <OwnerPage><OwnerErrorState message={error} onRetry={loadStaff} /></OwnerPage>
```

---

### Task 15 — UserDetailPage: nút Hủy trong delete confirm dùng đúng class

**Files:** `client/src/pages/owner/staff-management/UserDetailPage.tsx`

- [x] Tìm nút Hủy trong delete confirmation, thay inline style:

```tsx
<button
  className="flex-1 rogym-btn rogym-btn--outline-white"
  onClick={() => setShowDeleteConfirm(false)}
>
  Hủy
</button>
```

---

### Task 16 — Skeleton rows hợp lý hơn

**Files:** PackagesPage, UsersPage

- [x] `PackagesPage.tsx`: đổi `<OwnerSkeleton rows={PAGE_SIZE} />` → `<OwnerSkeleton rows={6} />`
- [x] `UsersPage.tsx`: tương tự.

---

## Thứ tự thực hiện

```
Task 1  BUG   DashboardPage: link + icon               [DONE]
Task 2  BUG   GroupsPage: openPermissions silent error  [DONE]
Task 3  BUG   UsersPage: delete button condition        [DONE]
Task 4  HIGH  GroupsPage: alert() → inline error        [DONE]
Task 5  HIGH  UsersPage: position filter labels         [DONE]
Task 6  HIGH  UsersPage: status filter options          [DONE]
Task 7  HIGH  UserDetailPage: badge missing cases       [DONE]
Task 8  MED   Tạo owner-constants.ts + refactor 8 files [PARTIAL — RenewalsReportPage còn lại]
Task 9  MED   Tạo useDebounce + refactor 3 files        [PARTIAL — PackagesPage còn lại]
Task 10 MED   Extract date helpers + refactor 4 pages   [DONE]
Task 11 MED   Modal size prop + refactor PackagesPage, GroupsPage [PARTIAL — Modal.tsx done; inline refactor chưa làm]
Task 12 MED   RevenuePage: state type + style conflict   [PARTIAL — style done; state type chưa làm]
Task 13 LOW   GroupsPage: PAGE_SIZE constant             [DONE]
Task 14 LOW   UserDetailPage: retry function             [DONE]
Task 15 LOW   UserDetailPage: cancel button class        [DONE]
Task 16 LOW   Skeleton rows                              [DONE]
```

## Còn lại

- **Task 8**: `RenewalsReportPage.tsx` — thêm `import { OWNER_ACCENT }`, đổi `const RENEWED_COLOR = '#06c384'` → `const RENEWED_COLOR = OWNER_ACCENT`
- **Task 9**: `PackagesPage.tsx` — import `useDebounce`; xóa `useState debouncedSearch` + `useEffect` debounce inline; thêm `const debouncedSearch = useDebounce(search)`
- **Task 11**: `PackagesPage.tsx` và `GroupsPage.tsx` — refactor `PackageModal`, `DeleteConfirmModal`, `EditGroupModal`, `PermissionsModal` để dùng `<Modal size="...">` thay vì inline div overlay
- **Task 12**: `RevenuePage.tsx` — đổi `useState<string>('0')` → `useState<number>(0)`; sửa `setTotal` call và `RevenueData.total` type nếu cần
