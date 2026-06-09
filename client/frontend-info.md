# Frontend Reference — RoGym Client

Tài liệu tra cứu nhanh cho `client/src`. Cập nhật khi thay đổi cấu trúc lớn.
Xem `design.md` để tra chi tiết design system. Xem `docs/VI/SRS_VI.md` cho business logic / UC.

---

## 1. File Structure

```
client/src/
├── main.tsx
├── App.tsx                        ← toàn bộ route definitions
├── vite-env.d.ts
│
├── assets/
│   └── gym-bg.jpg                 ← ảnh nền dùng trong auth pages + hero
│
├── styles/
│   └── globals.css                ← Google Fonts import, @keyframes marquee, custom classes
│
├── lib/
│   └── utils.ts
│
├── types/
│   └── index.ts
│
├── stores/
│   └── authStore.ts               ← Zustand, persist key "gym-auth"
│
├── hooks/
│   └── useAuth.ts
│
├── services/
│   ├── api.ts                     ← axios instance
│   ├── auth.service.ts            ← login, logout, forgotPassword, resetPassword, me, lineLogin
│   ├── package.service.ts
│   ├── payment.service.ts
│   ├── rbac.service.ts
│   ├── subscription.service.ts
│   └── workout.service.ts
│
├── layouts/
│   ├── AuthLayout.tsx             ← redirect nếu đã auth, otherwise <Outlet />
│   ├── DashboardLayout.tsx        ← paddingLeft 72px + <Sidebar /> (fixed) + <Topbar /> + <Outlet />
│   ├── MemberLayout.tsx           // không dùng
│   └── TrainerLayout.tsx          // không dùng
│
├── components/
│   └── shared/
│       ├── ProtectedRoute.tsx     ← nhận allowedRoles: Role[]
│       ├── Sidebar.tsx            ← island fixed (left/top/bottom 12px), hover expand 60→220px, render menu theo role
│       ├── Topbar.tsx             ← sticky 56px, avatar dropdown (profile, payment member-only, logout)
│       ├── SpotlightCard.tsx
│       └── SectionHeader.tsx
│
└── pages/
    ├── auth/
    │   ├── _authui.tsx            ← SHARED AUTH COMPONENTS (xem §4)
    │   ├── LoginPage.tsx          ✅ implemented
    │   ├── ForgotPasswordPage.tsx ✅ implemented
    │   ├── ResetPasswordPage.tsx  ✅ implemented
    │   └── QuickLoginPage.tsx     ✅ implemented
    │
    ├── home/
    │   └── HomePage.tsx           ✅ implemented (Navbar, Hero, FeatureBar, Training, Coach, Pricing, CTA, Footer)
    │
    ├── member/
    │   ├── DashboardPage.tsx
    │   ├── ProfilePage.tsx
    │   ├── register/
    │   │   ├── RegisterPage.tsx       ✅ form UI, TODO: authService.register()
    │   │   ├── VerifyEmailPage.tsx    ✅ 6-box OTP, countdown, TODO: authService.verifyEmail()
    │   │   ├── PaymentPage.tsx        🔲 stub
    │   │   └── RegisterSuccessPage.tsx ✅ implemented
    │   ├── subscription/
    │   │   ├── CurrentPackagePage.tsx
    │   │   ├── BuyPackagePage.tsx
    │   │   ├── RenewPackagePage.tsx
    │   │   ├── PackageHistoryPage.tsx
    │   │   └── SubscriptionSetupPage.tsx
    │   ├── workout/
    │   │   ├── MyPlanPage.tsx
    │   │   ├── PlanBuilderPage.tsx
    │   │   ├── WorkoutHistoryPage.tsx
    │   │   ├── WorkoutSessionPage.tsx
    │   │   └── AttendanceHistoryPage.tsx
    │   ├── progress/
    │   │   ├── ProgressPage.tsx
    │   │   └── components/
    │   │       ├── ProgressChart.tsx
    │   │       └── ProgressLog.tsx
    │   ├── sessions/
    │   │   └── SessionHistoryPage.tsx
    │   └── feedback/
    │       ├── MyFeedbackPage.tsx
    │       └── SendFeedbackPage.tsx
    │
    ├── trainer/  (DashboardPage, ProfilePage, students/, sessions/, plans/, exercises/, attendance/)
    ├── staff/    (DashboardPage, ProfilePage, members/, check-in/, feedback/, facility/, equipment/)
    └── owner/    (DashboardPage, ProfilePage, packages/, staff-management/, rbac/, reports/)
```

---

## 2. Routing

Defined in `App.tsx`. Import theo path tương đối từ `src/`.

### Public

| Path | Component | Layout |
|---|---|---|
| `/` | `HomePage` | none |
| `/login` | `LoginPage` | `AuthLayout` |
| `/login/other` | `QuickLoginPage` | `AuthLayout` |
| `/forgot-password` | `ForgotPasswordPage` | `AuthLayout` |
| `/reset-password` | `ResetPasswordPage` | `AuthLayout` |
| `/member/register` | `RegisterPage` | none |
| `/member/verify-email` | `VerifyEmailPage` | none |
| `/member/payment` | `PaymentPage` | none |
| `/member/register-success` | `RegisterSuccessPage` | none |

### Protected — Member

Wrap: `ProtectedRoute allowedRoles={['member']}` → `DashboardLayout`

| Path | Component |
|---|---|
| `/member` | `DashboardPage` |
| `/member/profile` | `ProfilePage` |
| `/member/subscription/setup` | `SubscriptionSetupPage` |
| `/member/subscription/current` | `CurrentPackagePage` |
| `/member/subscription/buy` | `BuyPackagePage` |
| `/member/subscription/renew` | `RenewPackagePage` |
| `/member/subscription/history` | `PackageHistoryPage` |
| `/member/workout/plan` | `MyPlanPage` |
| `/member/workout/builder` | `PlanBuilderPage` |
| `/member/workout/history` | `WorkoutHistoryPage` |
| `/member/workout/session/:id` | `WorkoutSessionPage` |
| `/member/workout/attendance` | `AttendanceHistoryPage` |
| `/member/progress` | `ProgressPage` |
| `/member/sessions` | `SessionHistoryPage` |
| `/member/feedback` | `MyFeedbackPage` |
| `/member/feedback/send` | `SendFeedbackPage` |

### Protected — Trainer

Wrap: `ProtectedRoute allowedRoles={['trainer']}` → `DashboardLayout`

`/trainer`, `/trainer/profile`, `/trainer/students`, `/trainer/students/:id`, `/trainer/students/:id/progress`, `/trainer/students/:id/progress/list`, `/trainer/sessions`, `/trainer/sessions/create`, `/trainer/sessions/:id`, `/trainer/sessions/:id/edit`, `/trainer/calendar`, `/trainer/plans`, `/trainer/plans/:id/builder`, `/trainer/lesson-plans`, `/trainer/lesson-plans/create`, `/trainer/lesson-plans/:id/edit`, `/trainer/exercises`, `/trainer/attendance`

### Protected — Staff + Owner

Wrap: `ProtectedRoute allowedRoles={['staff', 'owner']}` → `DashboardLayout`

`/staff`, `/staff/profile`, `/staff/members`, `/staff/members/:id`, `/staff/check-in`, `/staff/feedback`, `/staff/facility`, `/staff/equipment`

### Protected — Owner only

Wrap: `ProtectedRoute allowedRoles={['owner']}` → `DashboardLayout`

`/owner`, `/owner/profile`, `/owner/packages`, `/owner/staff`, `/owner/staff/:id`, `/owner/rbac/groups`, `/owner/rbac/permissions`, `/owner/reports`, `/owner/reports/revenue`

### Role → default route after login

```ts
const roleRouteMap = {
  member:  "/member",
  trainer: "/trainer",
  staff:   "/staff",
  owner:   "/owner",
}
```

---

## 3. User Flows

### Registration flow (public, không qua AuthLayout)

```
/member/register
  → [form: name, phone, email, password, confirm]
  → TODO: authService.register()
  → navigate("/member/verify-email", { state: { email } })

/member/verify-email
  ← backTo="/member/register" (AuthShell prop)
  → [6-box OTP, countdown 60s resend]
  → TODO: authService.verifyEmail(email, otp)
  → navigate("/member/register-success")

/member/register-success
  → [success screen, không có back]
  → CTA "Tới gói tập của tôi" → navigate("/member/subscription/current")
    (ProtectedRoute sẽ redirect về /login nếu chưa có token)
```

### Auth flow

```
/login
  → Quên mật khẩu → navigate("/forgot-password")
  → Đăng ký ngay  → navigate("/member/register")
  → Vai trò khác  → navigate("/login/other")

/forgot-password
  → POST /auth/forgot-password(email)
  → sent = true → SentView (trong cùng page, không navigate)
  → "Nhập mã OTP" → navigate("/reset-password")

/reset-password
  → POST /auth/reset-password(email, otp, newPassword)
  → done = true → navigate("/login")
```

### Owner dual-mode (Sidebar logic)

- Owner ở `/owner/*` → render Owner menu + nút "Chế độ vận hành" → navigate `/staff`
- Owner ở `/staff/*` → render Staff menu + nút "← Quay về Owner" → navigate `/owner`
- `ProtectedRoute` cho `/staff` nhận `allowedRoles={['staff', 'owner']}` nên owner vào được

---

## 4. Shared Auth UI — `pages/auth/_authui.tsx`

Import: `import { ... } from "@/pages/auth/_authui"`

### Constants

```ts
G  = "#06c384"   // green primary
T  = "#42e09e"   // teal accent
GD = "#00492f"   // green dark (text on green)
```

### Components

| Export | Props | Dùng khi |
|---|---|---|
| `AuthShell` | `children, maxWidth?=400, backTo?="/", backLabel?="Trang chủ"` | Wrapper toàn trang auth (blur bg + logo + glass card + back link) |
| `BtnPrimary` | `children, type?, onClick?, disabled?` | Nút xanh sweep, full-width |
| `BtnOutlineWhite` | `children, type?, onClick?, disabled?` | Nút outline trắng, full-width |
| `TextLink` | `children, onClick?, to?` | Link trắng, underline teal khi hover |
| `MutedLink` | `children, onClick?, to?` | Link mờ (rgba 0.4), underline khi hover |
| `Field` | `label, type?, placeholder?, value, onChange, icon?, right?` | Input field với label + icon prefix |
| `PasswordField` | `label, placeholder?, value, onChange, icon?` | Field với toggle show/hide password |
| `ErrorMsg` | `message` | Text đỏ #ff6b6b centered |
| `Divider` | `label` | Line với text giữa |

**`AuthShell` backTo:** Mặc định `"/"` (về homepage) — đổi thành path page trước đó khi trong multi-step flow (vd: VerifyEmailPage dùng `backTo="/member/register"`).

---

## 5. Store — `authStore.ts`

```ts
// Zustand, persisted to localStorage key "gym-auth"

interface AuthUser {
  userId: string
  email: string
  fullName: string
  roles: Role[]          // ["member"] | ["trainer"] | ["staff"] | ["owner"]
  status?: string
  phone?: string | null
  memberId?: string | null
}

// Usage
const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore()

setAuth(user, token)   // sau login thành công
clearAuth()            // logout
```

---

## 6. Services — `auth.service.ts`

```ts
authService.login(email, password)
  → Promise<{ user: AuthUser, token: string }>

authService.logout()
  → POST /auth/logout

authService.forgotPassword(email)
  → POST /auth/forgot-password

authService.resetPassword(email, otp, newPassword)
  → POST /auth/reset-password

authService.me()
  → GET /auth/me → AuthUser

authService.lineLogin(idToken)
  → Promise<{ user: AuthUser, token: string }>
```

**Thiếu (TODO):**
- `authService.register(name, phone, email, password)` — cần implement
- `authService.verifyEmail(email, otp)` — cần implement
- `authService.resendVerification(email)` — cần implement

---

## 7. Design Tokens Nhanh

> Chi tiết đầy đủ ở `design.md`. Đây là những giá trị dùng thường xuyên nhất.

### Màu

```
#06c384   G — green primary (button bg, accent)
#08d891   G-hover — sweep layer trên green button
#42e09e   T — teal (text accent, focus border, icon highlight)
#00492f   GD — text trên nền green

#080e0b   bg-base (nền trang chính)
#0f1c16   bg-card (card trên dark)
#132218   bg-card-hover

#fff      text-primary
#bbcabf   text-secondary (body)
#8ab89c   text-muted
rgba(255,255,255,0.45)  text-dim
rgba(255,255,255,0.25)  text-faint
```

### Typography

```
Anton          → section H2 lớn (clamp), logo, giá, số thống kê
Be Vietnam Pro → mọi thứ còn lại (body, button, label, input, card heading)

Trong auth card (glass card): KHÔNG dùng Anton, dùng Be Vietnam Pro 22px w-700 cho heading
```

### Quy tắc nhanh

- Nút: `rounded-full` + sweep animation (translateX -100% → 0)
- Link: underline slide từ trái, `transition: width 0.28s cubic-bezier(0.4,0,0.2,1)`
- Card tối: `rounded-[40px]` (lớn) / `rounded-2xl` (nhỏ)
- Glass card (auth): `rounded-2xl`, `backdrop-blur: 28px`, `bg: rgba(12,22,17,0.82)`
- Input: `rounded-xl`, focus border `#42e09e`
- Icons: lucide-react, KHÔNG dùng emoji
- KHÔNG dùng `transform: scale` trên hover button/text

### fonts trong globals.css

```css
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Anton&display=swap');
```

### @keyframes

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-33.333%); }
}
/* Dùng: animation: "marquee 22s linear infinite" */
/* FeatureBar lặp items × 3, nên -33.333% = 1 loop hoàn chỉnh */
```

---

## 8. Conventions

- Pages dùng các function component nội bộ (không export) cho sub-views, vd `ForgotView`, `SentView` trong `ForgotPasswordPage`
- Shared primitives cho toàn bộ auth UI sống ở `_authui.tsx` (underscore = internal/shared trong folder)
- `navigate()` dùng để chuyển trang trong flow (không dùng `<Link>` cho CTA buttons)
- `<Link>` dùng cho inline text links (`TextLink to=...`, `MutedLink to=...`)
- State truyền giữa pages qua `navigate(path, { state: { ... } })` + `useLocation().state`
- Back navigation: trang đầu flow → homepage, trang giữa flow → trang trước (dùng `backTo` prop của AuthShell)
- Không có global error boundary hiện tại

---

## 9. Shared Authenticated Layout

Tất cả 4 role dùng chung `DashboardLayout` sau khi auth.

### DashboardLayout

```
<div style={{ paddingLeft: 80 }}>   ← 68px sidebar collapsed + 12px gap
  <Sidebar />                        ← position: fixed, tự quản lý vị trí
  <div flex-col min-h-screen>
    <Topbar />                        ← sticky top-0, h-14
    <main overflow-auto p-6>
      <Outlet />
    </main>
  </div>
</div>
```

### Sidebar (island hover-expand)

- **Vị trí:** `fixed left-3 top-3 bottom-3`, `z-40`, `border-radius: 20px`
- **Theme:** `bg #0f1c16`, `border rgba(66,224,158,0.08)`, `box-shadow 0 8px 32px rgba(0,0,0,0.4)`
- **Collapsed:** width `68px`, chỉ hiện icon (centered), không có border dưới logo
- **Expanded:** width `220px` khi hover, hiện icon + label; transition `280ms cubic-bezier(0.4,0,0.2,1)`
- **Active nav:** `bg #06c384/15`, `color #42e09e` | **Hover:** `bg white/5`, `color white`
- **Owner:** có nút switch "Chế độ vận hành" / "Quay về Owner" — co lại thành icon khi collapsed
- **Không có logout** (đã chuyển sang avatar dropdown ở Topbar)

### Topbar

- **Style:** `h-14`, `bg rgba(8,14,11,0.92)`, `backdrop-filter blur(16px)`, `border-bottom rgba(66,224,158,0.08)`
- **Avatar:** circle 34px, bg `#06c384`, initial đầu của `user.fullName`

### Avatar Dropdown

- **Theme đồng bộ với sidebar:** `bg #0f1c16`, `border rgba(66,224,158,0.08)`, `box-shadow 0 8px 32px rgba(0,0,0,0.4)`, `border-radius: 16px`
- **Divider:** `rgba(255,255,255,0.05)`
- **Items:** Hồ sơ → `/{role}/profile` | Tài khoản thanh toán (member only) → `/member/subscription/current` | Đăng xuất → `clearAuth()` + navigate `/login`
- **Đóng:** click outside

### Mock Accounts (QuickLoginPage)

4 card ở `/login/other` — click gọi `setAuth(mockUser, 'mock-token')` trực tiếp (bypass API):

| Label | Role | Email | Name |
|---|---|---|---|
| Member | `member` | member@rogym.vn | Nguyễn Văn An |
| Trainer | `trainer` | trainer@rogym.vn | Trần Thị Bình |
| Staff | `staff` | staff@rogym.vn | Lê Văn Cường |
| Owner | `owner` | owner@rogym.vn | Phạm Thị Dung |

---

## 10. Pages Đã Implement

| Page | Status | Ghi chú |
|---|---|---|
| `HomePage` | ✅ full | Navbar, Hero, FeatureBar marquee, Training, Coach, Pricing, CTA, Footer |
| `LoginPage` | ✅ full | |
| `ForgotPasswordPage` | ✅ full | forgot + sent state trong 1 page |
| `ResetPasswordPage` | ✅ full | |
| `QuickLoginPage` | ✅ full | 4 mock account cards (bypass API) + real login form |
| `member/register/RegisterPage` | ✅ UI | TODO: API call |
| `member/register/VerifyEmailPage` | ✅ UI | TODO: API call, 6-box OTP |
| `member/register/RegisterSuccessPage` | ✅ full | |
| `member/register/PaymentPage` | 🔲 stub | |
| Tất cả trang còn lại | 🔲 stub / chưa build | |
