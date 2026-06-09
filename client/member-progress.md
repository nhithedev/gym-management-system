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

### File di chuyển
- `src/pages/member/register/PaymentPage.tsx` → `src/pages/member/subscription/PaymentPage.tsx` — chuyển sang đúng vị trí nghiệp vụ (subscription, không phải register flow). App.tsx đã cập nhật import đúng path.

### File xoá
- `plan-refactor.md` — file planning cũ, không cần thiết
- `src/components/shared/RoleDashboardPage.tsx` — component cũ đã thay thế
- `src/components/shared/SectionHeader.tsx` — component cũ đã thay thế

### File mới chưa track
- `src/pages/auth/_authui.tsx` — UI helpers cho auth pages
- `frontend-info.md`, `member-plan.md` — docs planning

### Session 3 — Topbar title + Sidebar sub-nav + Subscription pages

#### Layout / Shared components sửa
- **`src/components/shared/Topbar.tsx`** — thêm `getPageTitle(pathname)` map 50+ routes → title tiếng Việt; hiển thị title bên trái topbar (Anton 16px); áp dụng cho tất cả role
- **`src/components/shared/Sidebar.tsx`** — `NavItem` type thêm `children?: SubItem[]`; member nav có 3 group có sub-items (Gói tập, Lịch tập, Phản hồi); sub-items animate in/out (`maxHeight` transition) chỉ khi sidebar expanded VÀ group đang active

#### Pages Subscription (viết mới từ stub)
- **`src/pages/member/subscription/PaymentPage.tsx`** — trang public chọn gói + thanh toán. Flow: `subscriptionService.create` → `paymentService.create`. Parse `benefits` (JSON array hoặc newline-separated string). Slide-down payment panel sau khi chọn gói.
- **`src/pages/member/subscription/SubscriptionSetupPage.tsx`** — DashboardLayout; mount check active sub → redirect nếu có; hero section + package grid + payment panel.
- **`src/pages/member/subscription/CurrentPackagePage.tsx`** — hiện active sub với progress bar, alert banner khi ≤7 ngày, payment history 3 gần nhất. Toast khi `state.justActivated`.
- **`src/pages/member/subscription/BuyPackagePage.tsx`** — layout 2-col (package list + sticky order summary). Mount redirect nếu có active sub. Badge "Gói cũ" cho package đã dùng.
- **`src/pages/member/subscription/RenewPackagePage.tsx`** — Option A (gia hạn cùng gói) / Option B (chọn gói khác, expand list). `startDate` tính đúng: `endDate + 1 day` nếu chưa hết hạn, else today.
- **`src/pages/member/subscription/PackageHistoryPage.tsx`** — 2 tabs: Lịch sử gói tập (fetch khi mount) + Lịch sử thanh toán (lazy load khi chuyển tab). Filter client-side, pagination 10/page.

#### Ghi chú kỹ thuật
- Payment flow thực tế: `subscriptionService.create(memberId, packageId)` → lấy `subscriptionId` → `paymentService.create({ subscriptionId: Number(...), method, amount })`  
  *(khác với plan.md ban đầu — payment.service dùng `subscriptionId`, không phải `packageId`)*
- `Package.benefits` là `string | null` — parse thử JSON array, fallback split `\n`

### Session 4 — Sidebar fixes + Subscription store + RenewPage picker wheel + Dashboard fix

#### Stores mới
- **`src/stores/subscriptionStore.ts`** — Zustand store `hasActiveSub: boolean | null` (in-memory, không persist). Set bởi DashboardPage và CurrentPackagePage sau khi fetch subscriptions. Clear khi logout.

#### Shared components sửa
- **`src/components/shared/Sidebar.tsx`**:
  - Fix bug `isGroupActive` — logic cũ dùng `startsWith(base)` với base quá rộng (`/member/`) khiến mọi group đều active cùng lúc. Nay dùng `children.some(c => pathname === c.to || pathname.startsWith(c.to + '/'))`.
  - Sub-items chỉ expand khi sidebar đang hover **VÀ** group đang active (xoá trường hợp "Phản hồi" mở dù đang ở trang Gói tập).
  - Thêm `pt-1` padding-top cho container sub-items (mục con đầu tiên không còn sát với mục bố).
  - Delayed close 1 giây: `mouseLeave` set timeout 1000ms, `mouseEnter` cancel timer.
  - Dynamic subscription sub-items dựa trên `useSubscriptionStore`:
    - `hasActiveSub === true` → `[Gói hiện tại, Gia hạn, Lịch sử]` (ẩn "Mua gói")
    - `hasActiveSub === false` → `[Mua gói]` only
    - `hasActiveSub === null` → hiện tất cả 4 mục (chưa fetch)
  - Clear subscription store khi `isAuthenticated` chuyển thành false (logout).

#### Pages Subscription sửa
- **`src/pages/member/subscription/CurrentPackagePage.tsx`**:
  - Xoá cặp buttons top-right (Gia hạn gói / Lịch sử) và block actions cuối trang — navigation đã có trong sidebar.
  - Gọi `setHasActiveSub(!!active)` sau khi fetch subscriptions.
  - **[Session 5]** Thêm chức năng hủy gói (UC04B): nút "Hủy gói" hiện cho `active`/`pending`; confirmation dialog overlay (blur backdrop, cảnh báo không hoàn tiền); `handleCancel` gọi `subscriptionService.cancel()` → re-fetch để detect cascade-activate (pending prepaid được activate tự động); update `hasActiveSub` store; redirect sang setup nếu không còn sub.
  - Dọn unused `BtnOutline` và `isExpired` (pre-existing TS errors).
- **`src/pages/member/subscription/RenewPackagePage.tsx`** — **UI overhaul hoàn toàn**:
  - Layout 2 cột: trái là picker wheel, phải là payment card sticky.
  - Picker wheel: scroll-snap vertical (`scrollSnapType: 'y mandatory'`, `scrollSnapAlign: 'center'`), 5 items hiển thị (ITEM_H=84, CONTAINER_H=420), gradient fade top/bottom, center highlight band.
  - Item opacity theo khoảng cách từ center: 0→1, 1→0.48, 2+→0.18.
  - Font size animated theo selection: selected=17/19px, non-selected=15/16px.
  - Cuộn tới package hiện tại khi load (`scrollRef.current.scrollTop = idx * ITEM_H` on first load).
  - Bỏ layout `maxWidth: 680, margin: auto`.
  - **[Session 5]** Infinite scroll picker: render 3 bản copy danh sách gói (`displayItems`), track `centerDisplayIdx` state; scroll handler tự nhảy về copy giữa khi đến gần biên (silent `scrollTop` reassignment + `isJumping` ref guard). Key theo `${displayIdx}-${packageId}` để tránh react key conflict.
  - **[Session 5]** Viewport-fit layout: outer div `height: calc(100dvh - 104px); overflow: hidden; paddingBottom: 8; display: flex; flex-direction: column`. Grid dùng `gridTemplateColumns: '1fr 400px'`, `rowGap: 16`, `columnGap: 24`, `flex: 1`, `minHeight: 0`.
  - **[Session 5]** Grid rows — cấu trúc then chốt: sub-info card và picker là **direct grid items** trong 2 row riêng biệt (`gridTemplateRows: currentSub ? 'auto 1fr' : '1fr'`), không bọc trong flex column. Picker ở row `1fr` → có definite height → `height: '100%'` bên trong resolve đúng, `overflow: hidden` + `border-radius` không bị clip. Payment card `gridRow: '1 / -1'` span tất cả rows → bằng chiều cao phần trái. Trước đây dùng flex column bọc left side → picker dùng `flex: 1; min-height: CONTAINER_H` → height không definite → `height: 100%` bên trong không resolve → scroll container bị clip tại đáy outer div.
  - **[Session 5]** Column width: `1fr 400px` (tăng từ 300px). Payment card không còn sticky; dùng `flex: 1; display: flex; flex-direction: column` để fill đủ chiều cao. Spacer `flex: 1` đẩy confirm button xuống đáy card.
  - **[Session 5]** Center highlight band dùng `top: 50%; transform: translateY(-50%)` để luôn căn giữa bất kể picker có grow thêm.
- **useEffect deps**: fix thêm `navigate`, `clearAuth` vào deps array cho tất cả subscription pages (`CurrentPackagePage`, `BuyPackagePage`, `RenewPackagePage`, `SubscriptionSetupPage`, `PackageHistoryPage`). Fix `[location.state?.justActivated]` dep trong `CurrentPackagePage`.

#### Dashboard sửa
- **`src/pages/member/DashboardPage.tsx`**:
  - Fix progress bar: dùng `subscription.daysLeft` (server-authoritative) thay vì tự tính lại từ `startDate/endDate`. `daysUsed = totalDays - daysLeft`, `pct = daysUsed / totalDays * 100`.
  - Gọi `setHasActiveSub(subs.some(s => s.status === 'active' || s.status === 'pending'))` sau fetch.

### Session 6 — Member onboarding flow + Subscription gate + Payment method page + PaymentAccount API

#### Register form
- **`src/pages/auth/_authui.tsx`** — thêm `autoComplete` và `name` props vào `Field` component, pass-through xuống `<input>`
- **`src/pages/member/register/RegisterPage.tsx`**:
  - Thêm trường `dateOfBirth` (required) và `address` (optional)
  - Thứ tự field: Họ và tên → Email → Số điện thoại → Ngày sinh → Địa chỉ → Mật khẩu → Xác nhận (fix Chrome autofill điền tên đúng vào trường tên, không nhảy vào SĐT)
  - Proper `autocomplete` attributes: `name`, `email`, `tel`, `bday`, `street-address`
  - Navigate state thêm `password`: `navigate("/member/verify-email", { state: { email, password } })`
- **`src/services/auth.service.ts`** — `register()` nhận thêm `dateOfBirth: string` và `address?: string`, gửi lên API

#### Server self-register fix
- **`server/src/members/dto/self-register.dto.ts`**:
  - Xoá hoàn toàn `packageId` (gây lỗi `packageId must be a positive number` khi register vì `@Type(() => Number)` coerce `undefined` → `NaN`)
  - Thêm `@IsDateString() dateOfBirth` và `@IsOptional() @IsString() @Length(0,200) address`
  - Xoá imports không dùng: `IsPositive`, `Type`
- **`server/src/members/members.service.ts`** — xoá package lookup và subscription creation khỏi `selfRegister()`; transaction chỉ tạo: user, member, userGroup, OTP. Trả về `{ user, member }` (không có subscription)

#### Auto-login sau verify email
- **`src/pages/member/register/VerifyEmailPage.tsx`** — sau OTP thành công: auto-login bằng password từ `location.state`, gọi `authService.login()` → `setAuth(user, token)` trước khi navigate sang register-success
- **`src/pages/member/register/RegisterSuccessPage.tsx`** — CTA đổi destination: `/member/subscription/setup` (trước là `/member/subscription/current`)

#### Subscription-aware layout + route gate
- **`src/layouts/DashboardLayout.tsx`** — viết lại hoàn toàn: fetch subscription khi mount (nếu là member + `hasActiveSub === null`); sidebar chỉ render khi `hasActiveSub === true` (với member); `paddingLeft` 80 khi có sidebar, 0 khi không; non-member roles luôn có sidebar
- **`src/components/shared/SubscriptionRequired.tsx`** (file mới) — guard Outlet: `null` → spinner, `false` → redirect `/member/subscription/setup`, `true` → `<Outlet />`
- **`src/App.tsx`** — cấu trúc lại member routes:
  - Không cần sub: `profile`, `subscription/setup`, `subscription/buy`, `subscription/buy/payment`, `subscription/current`, `subscription/renew`, `subscription/renew/payment`, `subscription/history`
  - Gated bởi `<SubscriptionRequired>`: `/member` (dashboard), `workout/*`, `progress`, `sessions`, `feedback/*`
  - Thêm import: `SubscriptionRequired`, `BuyPaymentPage`, `RenewPaymentPage`

#### Tách payment method ra trang riêng
- **`src/pages/member/subscription/SubscriptionSetupPage.tsx`** — xoá phần chọn payment method; thay nút confirm bằng "Tiếp tục thanh toán →"; `handleContinue()` navigate `/member/subscription/buy/payment` với state `{ packageId, packageName, price, durationDays }`
- **`src/pages/member/subscription/BuyPackagePage.tsx`** — tương tự: xoá payment imports/state, đổi nút sang "Tiếp tục thanh toán →"; `handleContinue()` navigate `/member/subscription/buy/payment`; fix xoá `clearAuth` không dùng
- **`src/pages/member/subscription/RenewPackagePage.tsx`** — tương tự: xoá `METHOD_OPTIONS`, `method`/`submitting`/`error` state, `handleRenew`; thêm `handleContinue()` navigate `/member/subscription/renew/payment` với state `{ packageId, packageName, price, durationDays, renewStart: renewStart.toISOString() }`
- **`src/pages/member/subscription/BuyPaymentPage.tsx`** (file mới) — trang thanh toán mua gói mới:
  - Guard: redirect về `/member/subscription/setup` nếu không có location.state
  - Order summary bar top
  - Grid 2 card: trái (phương thức + fields + checkbox lưu) / phải (tài khoản đã liên kết)
  - `handleConfirm`: `subscriptionService.create()` + `paymentService.create()` → nếu `saveAccount && method !== 'cash'` thì `paymentAccountService.create()` (lỗi swallowed) → `setHasActiveSub(true)` → navigate `/member`
  - Handle 409: coi là đã có sub, set store và navigate luôn
- **`src/pages/member/subscription/RenewPaymentPage.tsx`** (file mới) — tương tự nhưng cho gia hạn: `handleConfirm` navigate `/member/subscription/current` sau success; không cần `setHasActiveSub`

#### PaymentAccount — server + client
- **`server/prisma/schema.prisma`** — thêm model `PaymentAccount` (accountId, memberId, type: PaymentMethod, provider, accountRef, label, isDefault, createdAt, deletedAt); thêm `paymentAccounts PaymentAccount[]` relation trên `Member`
- `prisma db push` — bảng `payment_accounts` được tạo trên DB
- **`server/src/payment-accounts/dto/create-payment-account.dto.ts`** (file mới)
- **`server/src/payment-accounts/payment-accounts.service.ts`** (file mới) — `list()`, `create()` (set isDefault unset others), `remove()` (soft-delete + ownership check)
- **`server/src/payment-accounts/payment-accounts.controller.ts`** (file mới) — `GET/POST /members/:memberId/payment-accounts`, `DELETE /members/:memberId/payment-accounts/:accountId`; `assertAccess()` cho phép member xem account của chính mình hoặc staff/owner
- **`server/src/payment-accounts/payment-accounts.module.ts`** (file mới)
- **`server/src/app.module.ts`** — đăng ký `PaymentAccountsModule`
- **`src/services/paymentAccount.service.ts`** (file mới) — `list()`, `create()`, `remove()`

#### Wiring right card (tài khoản liên kết) trong payment pages
- `BuyPaymentPage` và `RenewPaymentPage` đều có:
  - Fetch `paymentAccountService.list(memberId)` on mount với 2-item skeleton khi loading
  - Mỗi account: icon method + tên provider + masked accountRef (ví dụ `••••6789`)
  - Click account → fill left card (setMethod + setBankName/setAccountNo hoặc setProvider/setPhoneNo)
  - Trash icon → soft-delete account, optimistic remove khỏi list
  - Empty state khi chưa có account

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

### Session 7 — 404 payment-accounts fix + Scroll picker init fix

#### Server — PaymentAccountsController routing fix
- **`server/src/payment-accounts/payment-accounts.controller.ts`** — đổi `@Controller('members')` → `@Controller()` (empty prefix) với full paths trong từng method: `@Get('members/:memberId/payment-accounts')`, `@Post('members/:memberId/payment-accounts')`, `@Delete('members/:memberId/payment-accounts/:accountId')`
  - **Root cause 404**: NestJS bị conflict khi hai controller cùng prefix `@Controller('members')` (`MembersController` + `PaymentAccountsController`), khiến routes từ `PaymentAccountsController` không được đăng ký đúng. Dùng empty prefix tránh conflict hoàn toàn.

#### Client — Scroll picker initialization fix
- **`src/pages/member/subscription/SubscriptionSetupPage.tsx`** — thêm `loading` vào deps của scroll init effect: `useEffect(() => {...}, [loading, packages])`; thêm guard `if (loading || ...)` trong effect body
- **`src/pages/member/subscription/RenewPackagePage.tsx`** — tương tự: thêm `loading` vào deps: `useEffect(() => {...}, [loading, allPackages, selectedId])`
  - **Root cause picker sai**: scroll init effect chạy khi `packages` thay đổi, nhưng lúc đó `loading=true` → scroll element chưa render → `scrollRef.current === null` → early return → `scrollTop` không được set → picker stuck ở vị trí 0 với `centerDisplayIdx` không đồng bộ. Thêm `loading` vào deps đảm bảo effect re-run sau khi `loading=false` và scrollRef đã được mount.

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
