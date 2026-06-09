# Member Progress — Tóm tắt thay đổi chưa commit

---

## Client (`client/`)

### Services mới (file mới)
- **`src/services/member.service.ts`** — `getProfile()` → `GET /members/me`, `updateProfile()` → `PATCH /members/me`, `getProgress()` → `GET /members/:id/progress`
- **`src/services/training.service.ts`** — `getSessions()` → `GET /training-sessions`, `getAttendance()` → `GET /attendance-logs`
  - Bug fix: đổi `limit` → `pageSize` (backend DTO dùng `pageSize`); `month` param được convert sang `from`/`to` trước khi gọi API; fix `meta.total` → `meta.totalItems`
- **`src/services/feedback.service.ts`** — `list()`, `getById()`, `create()` → `GET/POST /feedback`
  - Bug fix: đổi `limit` → `pageSize`; fix `meta.total` → `meta.totalItems`

### Services sửa
- **`src/services/auth.service.ts`** — thêm 3 method: `register()` → `POST /members/self-register`, `verifyEmail()` → `POST /auth/verify-email`, `resendVerification()` → `POST /auth/resend-verify`

### Pages Member (viết lại từ stub)
- **`src/pages/member/DashboardPage.tsx`** — Dashboard đầy đủ với 6 widget: welcome banner, subscription card + progress bar, 4 stat cards (buổi tập, check-in, cân nặng, BMI), upcoming sessions, workout plan, recent feedbacks. Mỗi widget load độc lập.
  - Bug fix: `getSessions` call đổi `limit: 3` → `pageSize: 3`; `feedbackService.list` đổi `limit: 2` → `pageSize: 2` và `sort: 'createdAt:desc'` → `'created_at:desc'`; bỏ `memberId` khỏi cả hai call (backend member tự filter theo JWT)
- **`src/pages/member/ProfilePage.tsx`** — Xem/edit thông tin cá nhân (phone, ngày sinh, địa chỉ), đổi mật khẩu collapsible.
  - Bug fix: `setAuth({ user: ..., token })` → `setAuth(user, token)` (sai số tham số)

### Pages Auth/Register (nối API)
- **`src/pages/member/register/RegisterPage.tsx`** — thay TODO bằng `authService.register()`, xử lý lỗi 409/429/network
- **`src/pages/member/register/VerifyEmailPage.tsx`** — thay TODO bằng `authService.verifyEmail()` + `resendVerification()`, xử lý lỗi 410/404/429
- **`src/pages/member/register/RegisterSuccessPage.tsx`** — UI viết lại; bug fix: bỏ import `GD` không dùng
- **`src/pages/auth/LoginPage.tsx`**, **`ForgotPasswordPage.tsx`**, **`ResetPasswordPage.tsx`**, **`QuickLoginPage.tsx`** — UI refactor

### UI/Layout refactor
- **`src/App.tsx`** — cập nhật routes
- **`src/components/shared/Sidebar.tsx`**, **`Topbar.tsx`** — refactor UI
- **`src/layouts/AuthLayout.tsx`**, **`DashboardLayout.tsx`** — refactor layout
- **`src/pages/home/HomePage.tsx`** — viết lại UI
- **`src/styles/globals.css`** — thêm font/utility classes
- **`tailwind.config.js`** — cập nhật theme

### File xoá
- `plan-refactor.md` — file planning cũ, không cần thiết
- `src/components/shared/RoleDashboardPage.tsx` — component cũ đã thay thế
- `src/components/shared/SectionHeader.tsx` — component cũ đã thay thế

### File mới chưa track
- `src/pages/auth/_authui.tsx` — UI helpers cho auth pages
- `frontend-info.md`, `member-plan.md` — docs planning

---

## Server (`server/`)

### Auth
- **`src/auth/auth.service.ts`** — thêm `changePassword()`: verify mật khẩu hiện tại bằng bcrypt, hash mật khẩu mới, ghi audit log
- **`src/auth/auth.controller.ts`** — thêm `POST /auth/change-password`: validate input, gọi `authService.changePassword()`

### Members
- **`src/members/members.controller.ts`** — thêm 2 endpoint không cần permission guard (dùng JWT identity):
  - `GET /members/me` — member xem profile của chính mình
  - `PATCH /members/me` — member cập nhật profile của chính mình

### Training
- **`src/training/training.controller.ts`** — thêm `GET /members/:id/progress` (permission: `progress.read`)
- **`src/training/training.service.ts`** — thêm `listProgress()`: filter by date range, giới hạn limit, enforce member chỉ xem progress của mình

### Feedback
- **`src/feedback/feedback.controller.ts`** — bỏ `@RequirePermission('feedback.read')` khỏi `GET /feedback` và `GET /feedback/:id`; authorization được xử lý ở service layer (member tự động filter theo `memberId` của mình)

### Workout Plans
- **`src/workout/workout-plans/workout-plans.controller.ts`** — thêm `GET /workout-plans/members/:memberId/assignments` (không cần permission, service tự enforce)
- **`src/workout/workout-plans/workout-plans.service.ts`** — thêm `listAssignments()`: query `MemberWorkoutPlan` kèm `plan` relation, filter theo status/limit, member chỉ xem assignments của mình

### Seed
- **`prisma/seed.ts`** — thêm `feedback.read` vào member group permissions (cho lần reseed sau)

### Seed
- **`prisma/seed.ts`** — thêm `feedback.read` vào member group permissions (cho lần reseed sau)

### File xoá
- `server/.env.example` — bị xoá (cần xem lại nếu cần khôi phục)

---

## Bugs đã fix (debug session — test với nguyen.van.a@email.com)

| Triệu chứng | Nguyên nhân | File sửa |
|---|---|---|
| Sessions widget → Error | FE gửi `limit` nhưng DTO chỉ nhận `pageSize`; `forbidNonWhitelisted: true` → 400 | `training.service.ts`, `DashboardPage.tsx` |
| Attendance count sai/0 | FE gửi `month: 'YYYY-MM'` nhưng DTO chỉ nhận `from`/`to` → 400, fallback 0 | `training.service.ts` (convert `month` → `from`/`to`) |
| Feedback widget → Error | FE gửi `limit` nhưng DTO chỉ nhận `pageSize` → 400; sort key sai `createdAt` → `created_at` | `feedback.service.ts`, `DashboardPage.tsx` |
| Count stats luôn bằng `.length` | FE đọc `meta.total` nhưng backend trả `meta.totalItems` | `training.service.ts`, `feedback.service.ts` |
| `GET /feedback` → 403 | Member thiếu permission `feedback.read`; service đã tự filter nhưng guard chặn trước | `feedback.controller.ts` (bỏ `@RequirePermission`) |
| `GET /workout-plans/members/:id/assignments` → 404 | Endpoint chưa tồn tại | `workout-plans.controller.ts`, `workout-plans.service.ts` |
| ProfilePage crash khi save | `setAuth({ user, token })` sai signature, phải là `setAuth(user, token)` | `ProfilePage.tsx` |
| RegisterSuccessPage TS error | Import `GD` không dùng | `RegisterSuccessPage.tsx` |
| Server không pick up thay đổi | `nest start --watch` trên Windows đôi khi không detect file changes khi nhiều file ghi liên tiếp | Restart server thủ công (kill PID + npm run dev) |
