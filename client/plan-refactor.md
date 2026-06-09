# Refactor Plan — Client Frontend

## Mục tiêu

Tái cấu trúc toàn bộ `client/src` theo tree feature-based mới nhất:
- Xóa sạch **nội dung bên trong** tất cả file màn hình → thay bằng stub `export default function ... { return null }`
- Di chuyển / đổi tên file theo đúng tree mới
- Viết lại `App.tsx` routing theo cấu trúc mới
- Cập nhật `ProtectedRoute` để hỗ trợ owner truy cập `/staff/*`
- Cập nhật `Sidebar` để nhận biết owner đang ở `/staff/*` và hiện nút switch
- Giữ nguyên: `services/`, `stores/`, `hooks/`, `lib/`, `types/` (chỉ tách file types)
- **Không build UI thực**, chỉ dọn cấu trúc sẵn để viết lại UI sau

---

## User Review Required

> [!IMPORTANT]
> **Toàn bộ nội dung UI hiện tại sẽ bị xóa** — không thể rollback nếu không có git. Đã có branch `feature/refactor-fe` riêng nên an toàn.

> [!WARNING]
> **`components/ui/` (shadcn primitives)** — giữ nguyên, KHÔNG xóa. Đây là base components.

> [!NOTE]
> **Routing `/staff/*`** sẽ cho phép cả `owner` lẫn `staff` truy cập. Owner dùng JWT riêng của mình, đủ quyền với mọi endpoint. Không cần thay đổi phía server.

---

## Tóm tắt kế hoạch

### 3 Phase chính:

| Phase | Nội dung | Số file ảnh hưởng |
|---------|---------|---------|
| 1 | Xóa duplicate, tạo thư mục, di chuyển + đổi tên, stub tất cả pages | ~60 files |
| 2 | Viết lại App.tsx, ProtectedRoute, Sidebar, Layouts | 5 files |
| 3 | Tách types/index.ts | 7 files |

### File mới được thêm (chưa có trong codebase):

| File | UC |
|---------|---------|
| member/workout/PlanBuilderPage.tsx | UC06B |
| member/progress/ProgressPage.tsx | UC06C wrapper |
| staff/members/MemberDetailPage.tsx | UC04A/B tại quầy |
| staff/check-in/CheckInPage.tsx | UC05C manual |
| owner/staff-management/UserDetailPage.tsx | UC11 lịch làm việc |

---

## Proposed Changes

### Phase 1 — Dọn & Di chuyển file

---

#### [DELETE] Các file bị xóa hoàn toàn (duplicate/thay thế)

| File cũ | Lý do xóa |
|---------|----------|
| `pages/member/MemberDashboard.tsx` | Duplicate, thay bằng `DashboardPage.tsx` |
| `pages/member/MemberLayout.tsx` (48B) | Duplicate với `layouts/MemberLayout.tsx` |
| `pages/member/RegisterOnline.tsx` | Gộp vào `register/RegisterPage.tsx` |
| `pages/member/VerifyEmail.tsx` | Gộp vào `register/VerifyEmailPage.tsx` |
| `pages/member/Payment.tsx` | Gộp vào `register/PaymentPage.tsx` |
| `pages/trainer/TrainerDashboard.tsx` | Duplicate, thay bằng `DashboardPage.tsx` |
| `components/common/` (toàn bộ folder) | Đổi tên → `components/shared/` |

---

#### [MODIFY] `src/types/` — tách thành nhiều file

```
types/
├── index.ts          ← re-export tất cả
├── auth.types.ts     ← Role, AuthUser, User
├── member.types.ts   ← Package, Subscription, Payment, Progress, WorkoutLog
├── trainer.types.ts  ← TrainingSession, WorkoutPlan, Exercise, LessonPlan
├── staff.types.ts    ← Equipment, Room, Feedback, MaintenanceLog
├── owner.types.ts    ← Report, Revenue, StaffSchedule
└── common.types.ts   ← ApiResponse, PaginatedResponse
```

---

#### [MODIFY] `src/components/common/` → `src/components/shared/`

Giữ nguyên nội dung hiện tại của:
- `ProtectedRoute.tsx` — sửa logic (xem Phase 2)
- `Sidebar.tsx` — xóa sạch nội dung, viết lại
- `Topbar.tsx` — stub
- `SectionHeader.tsx` — giữ nguyên
- `SpotlightCard.tsx` — giữ nguyên
- `RoleDashboardPage.tsx` — stub

---

#### [NEW/MOVE] Di chuyển & tạo stub cho tất cả pages

**`pages/auth/`** — giữ vị trí, xóa nội dung:

```
pages/auth/
├── LoginPage.tsx                        ← stub   [UC00]
├── ForgotPasswordPage.tsx               ← stub   [UC02 bước 1]
└── ResetPasswordPage.tsx                ← stub   [UC02 bước 2]
```

**`pages/home/`** — giữ vị trí, xóa nội dung:

```
pages/home/
└── HomePage.tsx                         ← stub
```

**`pages/member/`** — tái cấu trúc hoàn toàn:

```
pages/member/
├── DashboardPage.tsx                    ← stub   (từ MemberDashboard.tsx)
├── ProfilePage.tsx                      ← stub   (từ Profile.tsx)
├── register/
│   ├── RegisterPage.tsx                 ← stub   (từ RegisterPage.tsx)   [UC03B]
│   ├── VerifyEmailPage.tsx              ← stub   (từ VerifyEmailPage.tsx) [UC03B]
│   ├── PaymentPage.tsx                  ← stub   (từ PaymentPage.tsx)    [UC03B]
│   └── RegisterSuccessPage.tsx          ← stub   (từ RegisterSuccess.tsx)[UC03B]
├── subscription/
│   ├── CurrentPackagePage.tsx           ← stub   (từ CurrentPackage.tsx) [UC04A/B]
│   ├── BuyPackagePage.tsx               ← stub   (từ BuyPackage.tsx)     [UC04A]
│   ├── RenewPackagePage.tsx             ← stub   (từ RenewPackage.tsx)   [UC04A]
│   └── PackageHistoryPage.tsx           ← stub   (từ PackageHistory.tsx) [UC04A/B]
├── workout/
│   ├── MyPlanPage.tsx                   ← stub   (từ MyPlanPage.tsx)     [UC06A]
│   ├── PlanBuilderPage.tsx              ← NEW stub                        [UC06B]
│   ├── WorkoutHistoryPage.tsx           ← stub   (từ WorkoutHistoryPage) [UC06A]
│   ├── WorkoutSessionPage.tsx           ← stub   (từ WorkoutSessionPage) [UC06A]
│   └── AttendanceHistoryPage.tsx        ← stub   (từ AttendanceHistory)  [UC05C]
├── progress/
│   ├── ProgressPage.tsx                 ← NEW stub                        [UC06C]
│   └── components/
│       ├── ProgressChart.tsx            ← stub   (từ ProgressChart.tsx)  [UC06C component]
│       └── ProgressLog.tsx              ← stub   (từ ProgressLog.tsx)    [UC06C component]
├── sessions/
│   └── SessionHistoryPage.tsx           ← stub   (từ SessionHistory.tsx) [UC05B]
└── feedback/
    ├── MyFeedbackPage.tsx               ← stub   (từ MyFeedback.tsx)     [UC07]
    └── SendFeedbackPage.tsx             ← stub   (từ SendFeedback.tsx)   [UC07]
```

**`pages/trainer/`** — tái cấu trúc:

```
pages/trainer/
├── DashboardPage.tsx                    ← stub   (bỏ TrainerDashboard.tsx)
├── ProfilePage.tsx                      ← stub   (từ TrainerProfile.tsx)
├── students/
│   ├── StudentsListPage.tsx             ← stub   (từ StudentsList.tsx)   [UC06C]
│   ├── StudentDetailPage.tsx            ← stub   (từ StudentDetail.tsx)  [UC06C]
│   ├── AddProgressPage.tsx              ← stub   (từ AddProgress.tsx)    [UC06C]
│   └── ProgressListPage.tsx             ← stub   (từ ProgressList.tsx)   [UC06C]
├── sessions/
│   ├── SessionsListPage.tsx             ← stub   (từ SessionsList.tsx)   [UC05B]
│   ├── SessionDetailPage.tsx            ← stub   (từ SessionDetail.tsx)  [UC05B]
│   ├── CreateSessionPage.tsx            ← stub   (từ CreateSession.tsx)  [UC05B]
│   └── CalendarPage.tsx                 ← stub   (từ CalendarView.tsx)   [UC05B]
├── plans/
│   ├── WorkoutPlansPage.tsx             ← stub   (giữ tên)               [UC05A]
│   ├── PlanBuilderPage.tsx              ← stub   (giữ tên)               [UC05A]
│   ├── LessonPlanListPage.tsx           ← stub   (từ LessonPlanList.tsx) [UC05A]
│   └── CreateLessonPlanPage.tsx         ← stub   (từ CreateLessonPlan)   [UC05A]
├── exercises/
│   └── ExercisesPage.tsx                ← stub   (giữ tên)               [UC05A thư viện]
└── attendance/
    └── AttendanceHistoryPage.tsx        ← stub   (từ AttendanceHistory)  [UC05C]
```

**`pages/staff/`** — bổ sung 2 file mới:

```
pages/staff/
├── DashboardPage.tsx                    ← stub
├── ProfilePage.tsx                      ← stub
├── members/
│   ├── MembersPage.tsx                  ← stub   (giữ tên)               [UC03A + list]
│   └── MemberDetailPage.tsx             ← NEW stub                        [UC04A/B tại quầy]
├── check-in/
│   └── CheckInPage.tsx                  ← NEW stub                        [UC05C manual]
├── feedback/
│   └── FeedbackPage.tsx                 ← stub   (giữ tên)               [UC07 xử lý]
├── facility/
│   └── FacilityPage.tsx                 ← stub   (giữ tên)               [UC08]
└── equipment/
    └── EquipmentPage.tsx                ← stub   (giữ tên)               [UC09]
```

**`pages/owner/`** — thu gọn (không có facility/equipment riêng, dùng /staff):

```
pages/owner/
├── DashboardPage.tsx                    ← stub
├── ProfilePage.tsx                      ← stub
├── packages/
│   └── PackagesPage.tsx                 ← stub   (giữ tên)               [UC10]
├── staff-management/
│   ├── UsersPage.tsx                    ← stub   (giữ tên)               [UC11]
│   └── UserDetailPage.tsx               ← NEW stub                        [UC11 chi tiết + schedule]
├── rbac/
│   ├── GroupsPage.tsx                   ← stub   (giữ tên)               [UC11 / 2.4.6]
│   └── PermissionsPage.tsx              ← stub   (giữ tên)               [UC11 / 2.4.6.3]
└── reports/
    ├── ReportsPage.tsx                  ← stub   (giữ tên)               [UC12]
    └── RevenuePage.tsx                  ← stub   (giữ tên)               [UC12]
```

---

### Phase 2 — Viết lại core files

---

#### [MODIFY] `src/components/shared/ProtectedRoute.tsx`

Sửa để nhận `allowedRoles: Role[]` thay vì 1 role duy nhất:

```tsx
interface Props {
  allowedRoles: Role[]
}
// Nếu user.roles[0] không nằm trong allowedRoles → redirect /login hoặc /
```

Routing App.tsx sẽ dùng:
- `/staff/*` → `allowedRoles={['staff', 'owner']}` ← owner vào được
- `/owner/*` → `allowedRoles={['owner']}`

---

#### [MODIFY] `src/components/shared/Sidebar.tsx` — xóa sạch, viết mới

Logic render menu theo context:

```
useLocation() → pathname
useAuthStore() → user.roles[0]

if role === 'owner' && pathname.startsWith('/staff'):
  → render STAFF menu items
  → hiện nút "← Quay về Owner" (navigate '/owner')

if role === 'owner' && pathname.startsWith('/owner'):
  → render OWNER menu items
  → hiện nút "🔧 Chế độ vận hành" (navigate '/staff')

if role === 'staff':
  → render STAFF menu items (không có nút switch)

if role === 'trainer':
  → render TRAINER menu items

if role === 'member':
  → render MEMBER menu items
```

Menu items theo role:

| Role / Mode | Sidebar items |
|-------------|--------------|
| **Member** | Dashboard, Gói tập, Lịch tập, Tiến độ, Phản hồi |
| **Trainer** | Dashboard, Học viên, Lịch dạy, Kế hoạch, Bài tập, Điểm danh |
| **Staff** | Dashboard, Hội viên, Check-in, Phản hồi, Phòng tập, Thiết bị |
| **Owner (owner mode)** | Dashboard, Gói tập, Nhân sự, Phân quyền, Báo cáo + **nút switch** |
| **Owner (staff mode)** | (staff menu) + **nút quay về** |

---

#### [MODIFY] `src/App.tsx` — viết lại hoàn toàn

```
PUBLIC ROUTES
─────────────────────────────────────────────────────
/                          HomePage
/login                     LoginPage              (AuthLayout)
/forgot-password           ForgotPasswordPage     (AuthLayout)
/reset-password            ResetPasswordPage      (AuthLayout)
/member/register           RegisterPage           (no layout)
/member/verify-email       VerifyEmailPage        (no layout)
/member/payment            PaymentPage            (no layout)
/member/register-success   RegisterSuccessPage    (no layout)

PROTECTED — MEMBER  [allowedRoles: member]
─────────────────────────────────────────────────────
/member                         DashboardPage
/member/profile                 ProfilePage
/member/subscription/current    CurrentPackagePage
/member/subscription/buy        BuyPackagePage
/member/subscription/renew      RenewPackagePage
/member/subscription/history    PackageHistoryPage
/member/workout/plan            MyPlanPage
/member/workout/builder         PlanBuilderPage
/member/workout/history         WorkoutHistoryPage
/member/workout/session/:id     WorkoutSessionPage
/member/workout/attendance      AttendanceHistoryPage
/member/progress                ProgressPage
/member/sessions                SessionHistoryPage
/member/feedback                MyFeedbackPage
/member/feedback/send           SendFeedbackPage

PROTECTED — TRAINER  [allowedRoles: trainer]
─────────────────────────────────────────────────────
/trainer                             DashboardPage
/trainer/profile                     ProfilePage
/trainer/students                    StudentsListPage
/trainer/students/:id                StudentDetailPage
/trainer/students/:id/progress       AddProgressPage
/trainer/students/:id/progress/list  ProgressListPage
/trainer/sessions                    SessionsListPage
/trainer/sessions/create             CreateSessionPage
/trainer/sessions/:id                SessionDetailPage
/trainer/sessions/:id/edit           CreateSessionPage
/trainer/calendar                    CalendarPage
/trainer/plans                       WorkoutPlansPage
/trainer/plans/:id/builder           PlanBuilderPage
/trainer/lesson-plans                LessonPlanListPage
/trainer/lesson-plans/create         CreateLessonPlanPage
/trainer/lesson-plans/:id/edit       CreateLessonPlanPage
/trainer/exercises                   ExercisesPage
/trainer/attendance                  AttendanceHistoryPage

PROTECTED — STAFF + OWNER  [allowedRoles: staff, owner]
─────────────────────────────────────────────────────
/staff                   DashboardPage
/staff/profile           ProfilePage
/staff/members           MembersPage
/staff/members/:id       MemberDetailPage
/staff/check-in          CheckInPage
/staff/feedback          FeedbackPage
/staff/facility          FacilityPage
/staff/equipment         EquipmentPage

PROTECTED — OWNER ONLY  [allowedRoles: owner]
─────────────────────────────────────────────────────
/owner                       DashboardPage
/owner/profile               ProfilePage
/owner/packages              PackagesPage
/owner/staff                 UsersPage
/owner/staff/:id             UserDetailPage
/owner/rbac/groups           GroupsPage
/owner/rbac/permissions      PermissionsPage
/owner/reports               ReportsPage
/owner/reports/revenue       RevenuePage

FALLBACK
─────────────────────────────────────────────────────
*                            Navigate to /
```

---

#### [MODIFY] `src/layouts/DashboardLayout.tsx` — stub

Giữ cấu trúc `<Sidebar> + <Topbar> + <main><Outlet /></main>`, xóa styling cũ, để class placeholder.

#### [MODIFY] `src/layouts/MemberLayout.tsx` — stub

#### [MODIFY] `src/layouts/TrainerLayout.tsx` — stub (hoặc merge vào DashboardLayout nếu cùng cấu trúc)

---

### Phase 3 — Dọn types

Tách `src/types/index.ts` thành các file, `index.ts` re-export hết. Không xóa type nào, chỉ tổ chức lại.

---

## Thứ tự thực hiện

```
Step 1  Xóa file duplicate
        - pages/member/MemberDashboard.tsx
        - pages/member/MemberLayout.tsx
        - pages/member/RegisterOnline.tsx
        - pages/member/VerifyEmail.tsx
        - pages/member/Payment.tsx
        - pages/trainer/TrainerDashboard.tsx

Step 2  Tạo thư mục con mới trong pages/
        member/: register/, subscription/, workout/, progress/, sessions/, feedback/
        trainer/: students/, sessions/, plans/, exercises/, attendance/
        staff/:   members/, check-in/, feedback/, facility/, equipment/
        owner/:   packages/, staff-management/, rbac/, reports/

Step 3  Di chuyển + đổi tên từng file → vị trí mới

Step 4  Xóa sạch nội dung bên trong tất cả page files → stub

Step 5  Đổi tên folder components/common/ → components/shared/

Step 6  Tách types/index.ts

Step 7  Viết lại App.tsx routing

Step 8  Viết lại ProtectedRoute.tsx (multi-role)

Step 9  Stub Sidebar.tsx với comment logic placeholder

Step 10 Stub các Layout files

Step 11 npm run build → kiểm tra không lỗi import
```

---

## Verification Plan

### Automated

```bash
cd client
npm run build   # pass, không có lỗi import broken
npm run lint    # không có unused import lớn
```

### Manual

- [ ] `npm run dev` khởi động được, không crash
- [ ] `/login` render được (stub không crash)
- [ ] `/member` redirect về `/login` khi chưa auth
- [ ] Owner login → vào `/owner` → click "Chế độ vận hành" → navigate `/staff` thành công
- [ ] Khi owner ở `/staff`, sidebar hiện nút "← Quay về Owner"
- [ ] Staff login → vào `/staff` được, nhưng KHÔNG vào được `/owner` (redirect)
- [ ] Không còn route cũ bị broken (tất cả 404 → redirect `/`)