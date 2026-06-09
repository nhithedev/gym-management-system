# MEMBER IMPLEMENTATION PLAN — Gym Management System

> **Mục đích:** Tài liệu self-contained để implement toàn bộ 20 pages thuộc role **Member**. Không cần đọc thêm file nào khác. Mỗi page được mô tả đầy đủ: layout, UI, API calls, state, error handling, navigation, service signatures.

---

## DESIGN SYSTEM REFERENCE (áp dụng cho mọi page)

| Token | Value |
|-------|-------|
| Font heading | `Anton` |
| Font body | `Be Vietnam Pro` |
| `--green-primary` | `#06c384` |
| `--teal-accent` | `#42e09e` |
| `--bg-base` | `#080e0b` |
| `--bg-card` | `#0f1c16` |
| `--text-primary` | `#ffffff` |
| `--text-secondary` | `#bbcabf` |
| Border radius card (nhỏ) | `rounded-2xl` |
| Border radius card (lớn) | `rounded-[40px]` |
| Border radius button | `rounded-full` |
| Border radius input | `rounded-xl` |
| Input focus border | `#42e09e` |
| Icons | `lucide-react` only — NO emoji |
| Hover | Sweep/shimmer animation — NO `transform: scale` |
| Button animation | `after:` pseudo sweep left→right on hover |

---

## SHARED COMPONENTS REFERENCE

```
src/layouts/DashboardLayout.tsx   — paddingLeft 80px, Sidebar fixed + Topbar sticky h-14, <Outlet />
src/layouts/AuthLayout.tsx        — redirect nếu đã auth
src/pages/auth/_authui.tsx        — AuthShell, BtnPrimary, BtnOutlineWhite, TextLink, MutedLink,
                                    Field, PasswordField, ErrorMsg, Divider
```

### AuthShell Props
```ts
AuthShell({ children, maxWidth?: number = 400, backTo?: string = "/", backLabel?: string })
```

### Auth Store
```ts
// src/stores/authStore.ts — Zustand, persisted key "gym-auth"
interface AuthUser {
  userId: string
  email: string
  fullName: string
  roles: Role[]
  status?: string
  phone?: string
  memberId?: string
}
const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore()
```

---

## SERVICES REFERENCE

### Services có sẵn
| File | Functions |
|------|-----------|
| `src/services/api.ts` | axios instance, base `/api/v1`, Bearer token auto-inject |
| `src/services/auth.service.ts` | `login`, `logout`, `forgotPassword`, `resetPassword`, `me` |
| `src/services/package.service.ts` | package CRUD |
| `src/services/payment.service.ts` | `list`, `create` |
| `src/services/rbac.service.ts` | RBAC helpers |
| `src/services/subscription.service.ts` | subscription CRUD |
| `src/services/workout.service.ts` | workout CRUD |

### Services cần tạo mới
| File | Functions cần implement |
|------|------------------------|
| `src/services/auth.service.ts` (extend) | `register(name, phone, email, password)`, `verifyEmail(email, otp)`, `resendVerification(email)` |
| `src/services/member.service.ts` | `getProfile(id)`, `updateProfile(id, data)`, `getProgress(id)` |
| `src/services/training.service.ts` | `getSessions(params)`, `getAttendance(params)` |
| `src/services/feedback.service.ts` | `list(params)`, `getById(id)`, `create(data)` |
| `src/services/exercise.service.ts` | `list(params)` |
| `src/services/workoutLog.service.ts` | `list(params)`, `create(data)`, `getById(id)` |

---

## NAVIGATION MAP (tổng quan)

```
/member/register
    └──(success)──► /member/verify-email
                        └──(verified)──► /member/register-success
                                             └──(CTA)──► /member/payment
                                                            └──(paid)──► /member (Dashboard)

/member (Dashboard)
    ├── /member/profile
    ├── /member/subscription/setup    (nếu chưa có gói)
    ├── /member/subscription/current
    │       ├── /member/subscription/buy
    │       ├── /member/subscription/renew
    │       └── /member/subscription/history
    ├── /member/workout/plan
    │       └── /member/workout/builder
    ├── /member/workout/history
    │       └── /member/workout/session/:id
    ├── /member/workout/attendance
    ├── /member/progress
    ├── /member/sessions
    ├── /member/feedback
    └── /member/feedback/send
```

---

# REGISTER FLOW (PUBLIC)

---

## 1. RegisterPage — `/member/register`

### Mô tả ngắn
Form đăng ký tài khoản Member mới. Gọi self-register endpoint, sau đó chuyển sang trang xác minh email.

### Layout & Wrapper
- **Wrapper:** `AuthLayout` (redirect nếu đã auth)
- **Shell:** `AuthShell` với `maxWidth=460`, `backTo="/"`, `backLabel="Về trang chủ"`
- File: `src/pages/member/RegisterPage.tsx`

### UI Components

#### Header
- Logo gym (nếu có) hoặc icon `Dumbbell` từ lucide-react, màu `#06c384`, size 40px
- Heading `Anton` "Đăng ký thành viên", cỡ 28px, màu white
- Sub-text `Be Vietnam Pro` "Tạo tài khoản để bắt đầu hành trình của bạn", màu `#bbcabf`

#### Form Fields (sử dụng component `Field` từ `_authui.tsx`)
1. **Họ và tên** — `name="fullName"`, placeholder "Nguyễn Văn A", required, `User` icon
2. **Số điện thoại** — `name="phone"`, type tel, placeholder "0912 345 678", required, `Phone` icon
3. **Email** — `name="email"`, type email, placeholder "email@example.com", required, `Mail` icon
4. **Mật khẩu** — `PasswordField`, `name="password"`, min 8 ký tự, icon toggle show/hide
5. **Xác nhận mật khẩu** — `PasswordField`, `name="confirmPassword"`, phải khớp password

#### Checkbox
- `[ ]` Tôi đồng ý với **Điều khoản dịch vụ** (TextLink) và **Chính sách bảo mật** (TextLink)

#### CTA Button
- `BtnPrimary` full-width: "Đăng ký ngay" — sweep animation, disabled khi loading
- Loading state: spinner icon bên trái + text "Đang xử lý..."

#### Footer
- `MutedLink`: "Đã có tài khoản? **Đăng nhập**" → `/login`

#### Error display
- `ErrorMsg` component hiện dưới form khi có lỗi toàn cục

### Data & API Calls

| Call | Method | Endpoint | Body | Response fields dùng |
|------|--------|----------|------|---------------------|
| Register | POST | `/api/v1/members/self-register` | `{ fullName, phone, email, password }` | `userId`, `email`, `message` |

### State cần quản lý
```ts
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [agreed, setAgreed] = useState(false)
// react-hook-form hoặc controlled inputs cho 5 fields
```

### Error Handling
| HTTP | Điều kiện | UI phản hồi |
|------|-----------|-------------|
| 400 | Thiếu field / format sai | `ErrorMsg` liệt kê lỗi từng field |
| 409 | Email đã tồn tại | `ErrorMsg`: "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác." |
| 429 | Quá nhiều request | `ErrorMsg`: "Bạn thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau vài phút." |
| Network | Mất kết nối | `ErrorMsg`: "Không thể kết nối. Kiểm tra mạng và thử lại." |

### Navigation
- **Đến page này từ:** `/login` (link "Đăng ký"), `/` (CTA landing page)
- **Rời page này:**
  - Success → `navigate("/member/verify-email", { state: { email } })`
  - Click "Đăng nhập" → `/login`

### Service file cần tạo/dùng
```ts
// src/services/auth.service.ts — thêm function:
export async function register(
  fullName: string,
  phone: string,
  email: string,
  password: string
): Promise<{ userId: string; email: string; message: string }> {
  const { data } = await api.post('/members/self-register', { fullName, phone, email, password })
  return data
}
```

### Ghi chú / Edge cases
- Password validation client-side: min 8 chars, ít nhất 1 chữ hoa, 1 số
- `confirmPassword` chỉ validate client-side, không gửi lên server
- Nếu user đã đăng nhập, `AuthLayout` redirect về `/member` trước khi render form
- Checkbox `agreed` phải được tick thì mới enable nút đăng ký

---

## 2. VerifyEmailPage — `/member/verify-email`

### Mô tả ngắn
Nhập mã OTP 6 chữ số được gửi về email để xác minh tài khoản. Hỗ trợ resend OTP.

### Layout & Wrapper
- **Wrapper:** `AuthLayout`
- **Shell:** `AuthShell` với `maxWidth=420`, `backTo="/member/register"`, `backLabel="Quay lại đăng ký"`
- File: `src/pages/member/VerifyEmailPage.tsx`

### UI Components

#### Header
- Icon `MailCheck` (lucide), màu `#06c384`, size 48px, căn giữa
- Heading "Xác minh email" (`Anton`, 26px)
- Sub-text: "Chúng tôi đã gửi mã 6 chữ số đến **{email}**" (email lấy từ `location.state.email`)

#### OTP Input
- 6 ô input rời nhau, mỗi ô `w-12 h-14`, `rounded-xl`, border `#42e09e` khi focus
- Auto-focus ô tiếp theo sau khi nhập
- Paste tự động điền toàn bộ 6 ô
- Backspace xóa và focus ô trước

#### CTA Button
- `BtnPrimary` full-width: "Xác minh" — disabled nếu chưa nhập đủ 6 số
- Loading: "Đang xác minh..."

#### Resend section
- Countdown timer: "Gửi lại mã sau **{seconds}s**" (countdown từ 60s)
- Sau khi hết giờ: `TextLink` "Gửi lại mã OTP" → gọi resend API
- Sau khi resend: reset countdown 60s, hiện toast "Đã gửi lại mã"

#### Error display
- `ErrorMsg` dưới OTP inputs

### Data & API Calls

| Call | Method | Endpoint | Body | Response fields dùng |
|------|--------|----------|------|---------------------|
| Verify OTP | POST | `/api/v1/auth/verify-email` | `{ email, otp }` | `message`, `token?` |
| Resend OTP | POST | `/api/v1/auth/resend-verify` | `{ email }` | `message` |

### State cần quản lý
```ts
const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const [countdown, setCountdown] = useState(60)
const [resending, setResending] = useState(false)
// email từ location.state.email
```

### Error Handling
| HTTP | Điều kiện | UI phản hồi |
|------|-----------|-------------|
| 400 | OTP sai định dạng | `ErrorMsg`: "Mã OTP không hợp lệ." |
| 410 | OTP hết hạn | `ErrorMsg`: "Mã OTP đã hết hạn. Vui lòng gửi lại mã." |
| 404 | Email không tồn tại | `ErrorMsg`: "Email không tìm thấy trong hệ thống." |
| 429 | Quá nhiều lần thử | `ErrorMsg`: "Quá nhiều lần thử. Vui lòng đợi trước khi thử lại." — disable button 30s |

### Navigation
- **Đến page này từ:** `RegisterPage` (sau register thành công) với `state: { email }`
- **Guard:** Nếu `location.state?.email` không có → redirect `/member/register`
- **Rời page này:**
  - Verify thành công → `navigate("/member/register-success", { state: { email } })`

### Service file cần tạo/dùng
```ts
// src/services/auth.service.ts — thêm:
export async function verifyEmail(email: string, otp: string): Promise<{ message: string }> {
  const { data } = await api.post('/auth/verify-email', { email, otp })
  return data
}
export async function resendVerification(email: string): Promise<{ message: string }> {
  const { data } = await api.post('/auth/resend-verify', { email })
  return data
}
```

### Ghi chú / Edge cases
- useEffect với interval cho countdown, cleanup khi unmount
- OTP inputs dùng ref array để control focus
- Nếu server trả token kèm verify success, có thể gọi `setAuth` và redirect thẳng dashboard (check response schema thực tế)
- Page không persist qua refresh — nếu mất `state.email`, redirect về register

---

## 3. RegisterSuccessPage — `/member/register-success`

### Mô tả ngắn
Thông báo đăng ký thành công và hướng dẫn bước tiếp theo: đăng nhập và chọn gói tập.

### Layout & Wrapper
- **Wrapper:** `AuthLayout`
- **Shell:** `AuthShell` với `maxWidth=460`, không có backTo
- File: `src/pages/member/RegisterSuccessPage.tsx`

### UI Components

#### Success illustration
- Icon `CheckCircle2` (lucide), màu `#06c384`, size 72px, căn giữa
- Animation: fade-in + scale từ 0.8→1 trong 400ms (CSS transition, không dùng transform:scale on hover)

#### Heading & text
- Heading `Anton` "Đăng ký thành công!" size 30px
- Body: "Tài khoản của bạn đã được xác minh. Hãy đăng nhập và chọn gói tập để bắt đầu."

#### Steps preview (3 bước dọc)
```
[ 1 ] Đăng nhập vào tài khoản
[ 2 ] Chọn gói tập phù hợp
[ 3 ] Thanh toán và bắt đầu tập
```
Mỗi step: số trong circle `#06c384` + text `Be Vietnam Pro`

#### CTA Buttons
- `BtnPrimary` full-width: "Đăng nhập ngay" → `/login`
- `BtnOutlineWhite` full-width: "Khám phá gói tập" → `/member/payment` (hoặc trang public packages)

### Data & API Calls
Không có API call (page tĩnh).

### State cần quản lý
```ts
// Không cần state động
// email từ location.state.email (display only)
```

### Error Handling
- Không có API call — không cần error handling

### Navigation
- **Đến page này từ:** `VerifyEmailPage` (sau verify thành công) với `state: { email }`
- **Guard:** Nếu `location.state?.email` không có → redirect `/member/register`
- **Rời page này:**
  - "Đăng nhập ngay" → `/login`
  - "Khám phá gói tập" → `/member/payment`

### Service file cần tạo/dùng
Không cần service mới.

### Ghi chú / Edge cases
- Page này là terminal trong register flow — không có back button
- Nếu user đã auth và vào URL trực tiếp, `AuthLayout` sẽ redirect về `/member`

---

## 4. PaymentPage — `/member/payment`

### Mô tả ngắn
Trang public cho phép member (đã đăng nhập hoặc guest) xem danh sách gói tập và thực hiện thanh toán để kích hoạt subscription.

### Layout & Wrapper
- **Wrapper:** Không dùng `AuthLayout` — page public, có thể truy cập khi chưa đăng nhập
- Container: `max-w-4xl mx-auto px-4 py-8`, background `#080e0b`
- File: `src/pages/member/PaymentPage.tsx`

### UI Components

#### Header
- Heading `Anton` "Chọn gói tập của bạn" size 36px
- Sub-text màu `#bbcabf`: "Đầu tư vào sức khỏe — linh hoạt và phù hợp với mọi mục tiêu"

#### Package Cards Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`)
Mỗi card (`rounded-[40px]`, bg `#0f1c16`, border 1px solid `#1a2d22`):
- Badge "Phổ biến nhất" (nếu package có tag, hiện pill `#06c384`)
- Package name `Anton` 22px
- Giá `Anton` 36px màu `#06c384` + "/tháng" nhỏ
- Duration: icon `Calendar` + "{durationDays} ngày"
- Benefits list: icon `Check` màu `#42e09e` + từng benefit string
- `BtnPrimary` "Chọn gói này" — gọi handleSelectPackage(package)

#### Selected package summary (hiện sau khi chọn)
Card sticky bottom hoặc section riêng:
- Tên gói, giá
- `Divider`
- **Payment method selector:**
  - Radio buttons: `[ ] Tiền mặt`, `[ ] Thẻ ngân hàng`, `[ ] Ví điện tử`
  - Icon tương ứng: `Banknote`, `CreditCard`, `Wallet`
- **BtnPrimary** "Thanh toán {amount} VNĐ"
- Loading: "Đang xử lý thanh toán..."

#### Loading skeleton
Khi fetch packages: 3 skeleton cards (pulse animation)

#### Empty state
Nếu không có package active: icon `PackageX` + "Hiện tại chưa có gói tập nào. Vui lòng liên hệ gym."

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Lấy danh sách gói | GET | `/api/v1/packages` | `?status=active` | `packageId`, `packageCode`, `name`, `durationDays`, `price`, `benefits`, `status` |
| Tạo thanh toán | POST | `/api/v1/payments` | `{ memberId, packageId, method, amount }` | `paymentId`, `status`, `transactionReference` |
| Tạo subscription | POST | `/api/v1/subscriptions` | `{ memberId, packageId, startDate }` | `subscriptionId`, `status` |

### State cần quản lý
```ts
const [packages, setPackages] = useState<Package[]>([])
const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_card' | 'ewallet'>('cash')
const [loading, setLoading] = useState(true)      // fetch packages
const [paying, setPaying] = useState(false)        // payment processing
const [error, setError] = useState<string | null>(null)
```

### Error Handling
| HTTP | Điều kiện | UI phản hồi |
|------|-----------|-------------|
| 400 | Thiếu field thanh toán | `ErrorMsg`: "Thiếu thông tin thanh toán. Vui lòng thử lại." |
| 401 | Chưa đăng nhập khi thanh toán | Redirect `/login?returnTo=/member/payment` |
| 404 | Package không tồn tại | `ErrorMsg`: "Gói tập không còn tồn tại. Vui lòng chọn gói khác." |
| 409 | Đã có subscription active | Redirect `/member/subscription/current` với toast "Bạn đã có gói tập đang hoạt động." |
| 500 | Lỗi server | `ErrorMsg`: "Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại sau." |

### Navigation
- **Đến page này từ:** `RegisterSuccessPage`, sidebar, landing page
- **Rời page này:**
  - Thanh toán thành công → `navigate("/member", { state: { paymentSuccess: true } })`
  - Hoặc nếu chưa login → `/login?returnTo=/member/payment`

### Service file cần tạo/dùng
```ts
// src/services/package.service.ts — dùng sẵn:
getPackages(params?: { status?: string }): Promise<Package[]>

// src/services/payment.service.ts — dùng sẵn:
createPayment(data: { memberId, packageId, method, amount }): Promise<Payment>

// src/services/subscription.service.ts — dùng sẵn:
createSubscription(data: { memberId, packageId, startDate }): Promise<Subscription>
```

### Ghi chú / Edge cases
- `memberId` lấy từ `useAuthStore().user.memberId`
- Nếu chưa login và click "Thanh toán": prompt đăng nhập trước, lưu selected package vào sessionStorage
- Flow thanh toán: tạo payment → nếu success → tạo subscription → navigate dashboard
- `startDate` = ngày hiện tại ISO string

---

# CORE PAGES

---

## 5. DashboardPage — `/member`

### Mô tả ngắn
Trang chủ của member sau khi đăng nhập, hiển thị tóm tắt subscription, lịch tập sắp tới, tiến độ và thông báo nhanh.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout` (paddingLeft 80px, Sidebar + Topbar)
- File: `src/pages/member/DashboardPage.tsx`

### UI Components

#### Welcome Banner
- "Xin chào, **{fullName}** 👋" — dùng font `Anton` cho tên, `Be Vietnam Pro` còn lại
- Sub-text: ngày hôm nay định dạng "Thứ Ba, 15 tháng 1, 2025"
- Bên phải: avatar hoặc icon `User` trong circle `#06c384`

#### Subscription Status Card (`rounded-[40px]`, bg `#0f1c16`, full-width)
- Trạng thái: badge pill (active=`#06c384`, pending=amber, expired=red, no-sub=gray)
- Tên gói: `Anton` 20px
- Progress bar: ngày đã dùng / tổng ngày (màu `#06c384`)
- "Còn {n} ngày" | "Hết hạn {date}"
- CTA: nếu expired → `BtnPrimary` "Gia hạn ngay" → `/member/subscription/renew`
- CTA: nếu no-sub → `BtnPrimary` "Chọn gói tập" → `/member/subscription/setup`

#### Stats Row (`grid grid-cols-2 md:grid-cols-4 gap-4`)
Mỗi stat card (`rounded-2xl`, bg `#0f1c16`):
1. **Buổi tập tháng này** — icon `Dumbbell`, số + "buổi"
2. **Check-in tuần này** — icon `CheckSquare`, số
3. **Cân nặng hiện tại** — icon `Scale`, số + "kg"
4. **BMI** — icon `Activity`, số

#### Upcoming Sessions (`rounded-2xl`)
- Title "Lịch tập sắp tới" + link "Xem tất cả" → `/member/sessions`
- List 3 session gần nhất:
  - Icon `Calendar` + ngày giờ
  - Trainer name, room
  - Badge status (scheduled=blue, cancelled=red)
- Empty state: icon `CalendarX` + "Chưa có lịch tập nào sắp tới"

#### My Workout Plan Widget
- Title "Kế hoạch tập" + link "Chi tiết" → `/member/workout/plan`
- Tên plan hiện tại (active assignment)
- Progress: "Tuần {n} · Ngày {d}"
- `BtnPrimary` nhỏ "Bắt đầu hôm nay" → `/member/workout/plan`
- Empty state: "Chưa có kế hoạch. **Tạo ngay**" → `/member/workout/builder`

#### Recent Feedback Widget
- Title "Phản hồi gần đây" + link "Xem tất cả" → `/member/feedback`
- 2 feedback mới nhất: type badge + status badge + preview content 1 dòng
- Empty state: "Chưa có phản hồi nào"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Subscription hiện tại | GET | `/api/v1/subscriptions` | `?memberId={id}&status=active` | `subscriptionId`, `packageId`, `startDate`, `endDate`, `status` + join package `name` |
| Thông tin gói | GET | `/api/v1/packages/{packageId}` | — | `name`, `durationDays` |
| Sessions sắp tới | GET | `/api/v1/training/sessions` | `?memberId={id}&status=scheduled&limit=3` | `sessionId`, `startTime`, `endTime`, `trainerStaffId`, `roomId`, `status` |
| Progress mới nhất | GET | `/api/v1/members/{id}/progress` | `?limit=1` | `weight`, `bmi`, `recordedAt` |
| Stats tháng | GET | `/api/v1/training/attendance` | `?memberId={id}&month={YYYY-MM}` | count |
| Active workout plan | GET | `/api/v1/workout/plans/assignments` | `?memberId={id}&status=active` | `planId`, `startDate`, plan `name` |
| Feedbacks gần đây | GET | `/api/v1/feedback` | `?memberId={id}&limit=2&sort=createdAt:desc` | `feedbackId`, `feedbackType`, `content`, `status`, `createdAt` |

### State cần quản lý
```ts
const [subscription, setSubscription] = useState<Subscription | null>(null)
const [sessions, setSessions] = useState<TrainingSession[]>([])
const [progress, setProgress] = useState<MemberProgress | null>(null)
const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlanAssignment | null>(null)
const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
const [stats, setStats] = useState({ sessionsThisMonth: 0, checkinsThisWeek: 0 })
const [loading, setLoading] = useState(true)
```

### Error Handling
- Mỗi widget load độc lập (Promise.allSettled) — lỗi 1 widget không ảnh hưởng widget khác
- Widget lỗi: hiện icon `AlertCircle` + "Không thể tải dữ liệu" trong widget đó
- 401: `clearAuth()` → redirect `/login`

### Navigation
- **Đến page này từ:** Login, PaymentPage (sau thanh toán), mọi page có sidebar
- **Rời page này:** Qua sidebar hoặc các link/button trong dashboard

### Service file cần tạo/dùng
```ts
// src/services/member.service.ts:
getProgress(memberId: string, params?: { limit?: number }): Promise<MemberProgress[]>

// src/services/training.service.ts:
getSessions(params: { memberId: string; status?: string; limit?: number }): Promise<TrainingSession[]>
getAttendance(params: { memberId: string; month?: string }): Promise<AttendanceLog[]>

// src/services/feedback.service.ts:
list(params: { memberId: string; limit?: number; sort?: string }): Promise<Feedback[]>
```

### Ghi chú / Edge cases
- Dùng `Promise.allSettled` để load tất cả widgets song song, không block nhau
- `memberId` lấy từ `useAuthStore().user.memberId`
- Nếu `state.paymentSuccess === true` (từ PaymentPage navigate): hiện toast "Thanh toán thành công! Gói tập đã được kích hoạt."
- Subscription status phải check cả `endDate < today` để detect expired kể cả khi status DB chưa update

---

## 6. ProfilePage — `/member/profile`

### Mô tả ngắn
Xem và chỉnh sửa thông tin cá nhân của member: avatar, thông tin cơ bản, đổi mật khẩu.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/ProfilePage.tsx`

### UI Components

#### Profile Header Card (`rounded-[40px]`, bg `#0f1c16`)
- Avatar: circle 96px, bg `#06c384`, chữ cái đầu tên (hoặc upload ảnh sau)
- Họ tên `Anton` 24px
- Email + Phone màu `#bbcabf`
- Member code badge: "MC-{memberCode}"
- `BtnOutlineWhite` nhỏ: "Chỉnh sửa" — toggle edit mode

#### Personal Info Section (`rounded-2xl`)
Title "Thông tin cá nhân" + Edit button (icon `Pencil`)

**View mode:**
| Label | Value |
|-------|-------|
| Họ và tên | {fullName} |
| Email | {email} |
| Số điện thoại | {phone} |
| Ngày sinh | {dateOfBirth} hoặc "Chưa cập nhật" |
| Địa chỉ | {address} hoặc "Chưa cập nhật" |
| HLV phụ trách | {trainerName} hoặc "Chưa phân công" |
| Ngày tham gia | {createdAt} |

**Edit mode:**
- `Field` cho: fullName (readonly?), phone, dateOfBirth (date input), address (textarea)
- Email: readonly (không cho đổi)
- `BtnPrimary` "Lưu thay đổi" + `BtnOutlineWhite` "Hủy"

#### Change Password Section (`rounded-2xl`)
- Title "Đổi mật khẩu" — collapsible (click để mở)
- Fields: Mật khẩu hiện tại, Mật khẩu mới (min 8), Xác nhận mật khẩu mới
- `BtnPrimary` "Cập nhật mật khẩu"
- Success: inline green text "Mật khẩu đã được cập nhật"

#### Membership Info Section (`rounded-2xl`)
- Member Code, ngày tham gia
- Trainer được phân công (nếu có): avatar + tên + specialization

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Lấy profile | GET | `/api/v1/members/{memberId}` | — | `memberId`, `memberCode`, `dateOfBirth`, `address`, `primaryTrainerId`, `createdAt`, join `userId` fields |
| Update profile | PATCH | `/api/v1/members/{memberId}` | `{ phone?, dateOfBirth?, address? }` | updated member object |
| Đổi mật khẩu | POST | `/api/v1/auth/change-password` | `{ currentPassword, newPassword }` | `message` |

### State cần quản lý
```ts
const [profile, setProfile] = useState<MemberProfile | null>(null)
const [isEditing, setIsEditing] = useState(false)
const [editData, setEditData] = useState<Partial<MemberProfile>>({})
const [saving, setSaving] = useState(false)
const [pwSection, setPwSection] = useState(false)   // collapsed/expanded
const [pwData, setPwData] = useState({ current: '', newPw: '', confirm: '' })
const [pwLoading, setPwLoading] = useState(false)
const [pwSuccess, setPwSuccess] = useState(false)
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(true)
```

### Error Handling
| HTTP | Điều kiện | UI phản hồi |
|------|-----------|-------------|
| 400 | Dữ liệu không hợp lệ | `ErrorMsg` dưới form |
| 401 | Mật khẩu hiện tại sai | `ErrorMsg` trên password section |
| 403 | Không có quyền sửa | Toast "Bạn không có quyền thực hiện thao tác này." |
| 404 | Member không tìm thấy | Redirect `/member` với toast lỗi |

### Navigation
- **Đến page này từ:** Sidebar item "Hồ sơ", Topbar avatar menu
- **Rời page này:** Sidebar navigation

### Service file cần tạo/dùng
```ts
// src/services/member.service.ts:
getProfile(memberId: string): Promise<MemberProfile>
updateProfile(memberId: string, data: Partial<MemberProfile>): Promise<MemberProfile>
```

### Ghi chú / Edge cases
- `memberId` từ `useAuthStore().user.memberId`
- Khi update thành công, sync lại `authStore.setAuth` với `fullName` mới (nếu thay đổi)
- `dateOfBirth` hiển thị format "dd/MM/yyyy", gửi lên server format "YYYY-MM-DD"
- Validation client: phone regex VN, address max 200 chars

---

# SUBSCRIPTION PAGES

---

## 7. SubscriptionSetupPage — `/member/subscription/setup`

### Mô tả ngắn
Trang hướng dẫn member chưa có gói tập lần đầu đăng ký gói. Redirect thẳng sang trang mua gói hoặc hiển thị wizard chọn gói.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/subscription/SubscriptionSetupPage.tsx`

### UI Components

#### Hero section (`rounded-[40px]`, bg gradient `#0f1c16` → `#06c384` 10%)
- Icon `ShoppingBag`, size 64px, màu `#06c384`
- Heading `Anton` "Bắt đầu hành trình của bạn"
- Sub-text: "Chọn gói tập phù hợp để truy cập đầy đủ tính năng"

#### Package Cards (tương tự PaymentPage)
- 3 cols grid, từng card `rounded-[40px]`
- Thêm highlight "Được chọn nhiều nhất" cho gói phổ biến
- Click card → highlight + hiện payment section

#### Payment Method (sau khi chọn gói)
- Animated slide-down panel
- Radio: Tiền mặt / Thẻ ngân hàng / Ví điện tử
- Summary: tên gói, giá, thời hạn
- `BtnPrimary` "Xác nhận thanh toán"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Danh sách gói active | GET | `/api/v1/packages` | `?status=active` | `packageId`, `name`, `durationDays`, `price`, `benefits` |
| Kiểm tra subscription | GET | `/api/v1/subscriptions` | `?memberId={id}&status=active` | `subscriptionId` (check exists) |
| Tạo payment | POST | `/api/v1/payments` | `{ memberId, packageId, method, amount }` | `paymentId`, `status` |
| Tạo subscription | POST | `/api/v1/subscriptions` | `{ memberId, packageId, startDate }` | `subscriptionId`, `status` |

### State cần quản lý
```ts
const [packages, setPackages] = useState<Package[]>([])
const [selected, setSelected] = useState<string | null>(null)    // packageId
const [method, setMethod] = useState<PaymentMethod>('cash')
const [loading, setLoading] = useState(true)
const [submitting, setSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Error Handling
- 409 (đã có sub active): redirect `/member/subscription/current`
- 400/500: `ErrorMsg` dưới nút xác nhận

### Navigation
- **Đến page này từ:** Dashboard (khi no-sub), sidebar
- **Rời page này:**
  - Thanh toán OK → `navigate("/member/subscription/current", { state: { justActivated: true } })`
  - Đã có sub → redirect `/member/subscription/current`

### Service file cần tạo/dùng
Dùng package.service, payment.service, subscription.service đã có.

### Ghi chú / Edge cases
- Nếu member đã có subscription active → redirect ngay khi mount (check trong useEffect)
- Flow: tạo payment → nếu `payment.status === 'success'` → tạo subscription

---

## 8. CurrentPackagePage — `/member/subscription/current`

### Mô tả ngắn
Hiển thị chi tiết gói tập đang dùng: tên, ngày bắt đầu/hết hạn, tiến độ còn lại, lịch sử thanh toán liên quan.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/subscription/CurrentPackagePage.tsx`

### UI Components

#### Active Subscription Card (`rounded-[40px]`, bg `#0f1c16`)
- Badge "Đang hoạt động" (green pill) hoặc "Đã hết hạn" (red)
- Tên gói `Anton` 28px
- Thanh tiến độ:
  - Màu `#06c384`, border-radius full
  - Label: "{daysUsed} ngày đã dùng / {totalDays} ngày"
  - Label phải: "Còn {daysLeft} ngày"
- Ngày bắt đầu: icon `CalendarCheck` + date
- Ngày hết hạn: icon `CalendarX` + date (màu đỏ nếu < 7 ngày)

#### Benefits list
- Heading "Quyền lợi gói tập"
- List check items từ `package.benefits[]`

#### Action Buttons
- `BtnPrimary` "Gia hạn gói" → `/member/subscription/renew`
- `BtnOutlineWhite` "Xem lịch sử" → `/member/subscription/history`
- (Nếu expired) `BtnPrimary` "Mua gói mới" → `/member/subscription/buy`

#### Payment History Preview (3 gần nhất)
- Heading "Lịch sử thanh toán"
- Mỗi row: ngày + method badge + amount + status badge
- Link "Xem tất cả" → `/member/subscription/history`

#### Alert Banner
- Nếu còn ≤ 7 ngày: amber banner với icon `AlertTriangle` + "Gói tập sắp hết hạn trong {n} ngày. Hãy gia hạn ngay."
- Nếu no active sub: gray card + "Bạn chưa có gói tập nào đang hoạt động." + `BtnPrimary` "Chọn gói"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Subscription active | GET | `/api/v1/subscriptions` | `?memberId={id}&status=active` | toàn bộ subscription + package |
| Thông tin package | GET | `/api/v1/packages/{packageId}` | — | `name`, `durationDays`, `price`, `benefits` |
| Payment history | GET | `/api/v1/payments` | `?memberId={id}&limit=3&sort=paidAt:desc` | `paymentId`, `amount`, `method`, `status`, `paidAt` |

### State cần quản lý
```ts
const [subscription, setSubscription] = useState<Subscription | null>(null)
const [packageInfo, setPackageInfo] = useState<Package | null>(null)
const [payments, setPayments] = useState<Payment[]>([])
const [loading, setLoading] = useState(true)
```

### Error Handling
- 404: "Không tìm thấy thông tin gói tập." + `BtnPrimary` "Mua gói mới"
- 401: clearAuth + redirect login

### Navigation
- **Đến page này từ:** Dashboard, sidebar "Gói tập", SubscriptionSetupPage (sau activate)
- **Rời page này:** Renew, Buy, History pages

### Service file cần tạo/dùng
subscription.service, package.service, payment.service (đã có)

### Ghi chú / Edge cases
- `daysLeft = Math.ceil((endDate - today) / 86400000)`
- Nếu `state.justActivated === true`: hiện confetti animation (simple CSS) + toast "Gói tập đã được kích hoạt thành công!"
- Handle trường hợp có nhiều subscription (lấy cái active nhất, sort theo startDate desc)

---

## 9. BuyPackagePage — `/member/subscription/buy`

### Mô tả ngắn
Mua gói tập mới khi member chưa có hoặc gói đã hết hạn (khác với Renew là gia hạn gói cũ).

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/subscription/BuyPackagePage.tsx`

### UI Components

#### Page Header
- Breadcrumb: "Gói tập > Mua gói mới"
- Heading `Anton` "Mua gói tập mới"

#### Package Selection Grid
- Tương tự PaymentPage, layout `grid grid-cols-1 md:grid-cols-3`
- Thêm badge "Hiện tại" (gray) nếu member đang dùng gói đó (expired)

#### Order Summary Panel (sticky right column hoặc bottom)
- Tên gói đã chọn
- Thời hạn, giá
- Bắt đầu từ: hôm nay
- Hết hạn dự kiến: hôm nay + durationDays
- Payment method selector
- `BtnPrimary` full-width "Xác nhận mua"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Packages | GET | `/api/v1/packages` | `?status=active` | `packageId`, `name`, `durationDays`, `price`, `benefits` |
| Create payment | POST | `/api/v1/payments` | `{ memberId, packageId, method, amount }` | `paymentId`, `status` |
| Create subscription | POST | `/api/v1/subscriptions` | `{ memberId, packageId, startDate }` | `subscriptionId`, `endDate` |

### State cần quản lý
```ts
const [packages, setPackages] = useState<Package[]>([])
const [selectedId, setSelectedId] = useState<string | null>(null)
const [method, setMethod] = useState<'cash' | 'bank_card' | 'ewallet'>('cash')
const [submitting, setSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Error Handling
- 409 đã có sub active: toast cảnh báo + redirect `/member/subscription/current`
- Tương tự PaymentPage

### Navigation
- **Đến page này từ:** CurrentPackagePage (expired state), Sidebar
- **Rời page này:** Success → `/member/subscription/current`

### Service file cần tạo/dùng
package.service, payment.service, subscription.service (đã có)

### Ghi chú / Edge cases
- Redirect `/member/subscription/current` nếu member đang có subscription active khi mount
- Confirm dialog trước khi thanh toán nếu đang có gói sắp hết hạn (để tránh overlap)

---

## 10. RenewPackagePage — `/member/subscription/renew`

### Mô tả ngắn
Gia hạn gói tập hiện tại. Start date = ngày hết hạn của gói cũ + 1 ngày.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/subscription/RenewPackagePage.tsx`

### UI Components

#### Current Package Summary (read-only card)
- Tên gói đang dùng
- "Hết hạn ngày: {endDate}"
- "Gia hạn sẽ bắt đầu từ: {endDate + 1 ngày}"

#### Renew Options
- Option A: "Gia hạn cùng gói" ({currentPackageName}, {price}) — pre-selected
- Option B: "Chọn gói khác" → expand danh sách packages

#### Payment Section
- Method selector (giống các trang trước)
- Total: {price} VNĐ
- Ngày bắt đầu mới, ngày hết hạn mới (preview)
- `BtnPrimary` "Gia hạn ngay"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Sub hiện tại | GET | `/api/v1/subscriptions` | `?memberId={id}&status=active` | `packageId`, `endDate` |
| Package hiện tại | GET | `/api/v1/packages/{packageId}` | — | `name`, `price`, `durationDays` |
| Tất cả packages | GET | `/api/v1/packages` | `?status=active` | list |
| Create payment | POST | `/api/v1/payments` | `{ memberId, packageId, method, amount }` | `paymentId`, `status` |
| Create subscription | POST | `/api/v1/subscriptions` | `{ memberId, packageId, startDate }` | `subscriptionId` |

### State cần quản lý
```ts
const [currentSub, setCurrentSub] = useState<Subscription | null>(null)
const [selectedPackageId, setSelectedPackageId] = useState<string>('')
const [showOtherPackages, setShowOtherPackages] = useState(false)
const [method, setMethod] = useState<PaymentMethod>('cash')
const [submitting, setSubmitting] = useState(false)
```

### Error Handling
- Tương tự BuyPackagePage
- Nếu no active sub: redirect `/member/subscription/buy`

### Navigation
- **Đến page này từ:** CurrentPackagePage, Dashboard renewal alert
- **Rời page này:** Success → `/member/subscription/current`

### Service file cần tạo/dùng
Dùng service đã có.

### Ghi chú / Edge cases
- `startDate` cho subscription mới = `currentSub.endDate + 1 day` (bảo đảm không overlap)
- Nếu gói đã expired (`endDate < today`): `startDate = today`
- Pre-select packageId = gói hiện tại (set trong useEffect sau fetch)

---

## 11. PackageHistoryPage — `/member/subscription/history`

### Mô tả ngắn
Lịch sử toàn bộ subscription và thanh toán của member.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/subscription/PackageHistoryPage.tsx`

### UI Components

#### Tab Bar
- Tab 1: "Lịch sử gói tập" (Subscription history)
- Tab 2: "Lịch sử thanh toán" (Payment history)
- Active tab: border-bottom `#06c384`

#### Subscription History Tab
List các subscription (sorted by startDate desc), mỗi row:
- Package name `Anton` 16px
- Badge status: active (green), expired (gray), cancelled (red), pending (amber)
- Ngày bắt đầu → ngày hết hạn
- Nếu cancelled: "Huỷ lúc {cancelledAt}"
- Accordion expand: xem payment liên quan

#### Payment History Tab
Table/list các payment (sorted by paidAt desc):
| Cột | Data |
|-----|------|
| Ngày | `paidAt` |
| Gói | package name qua subscriptionId |
| Phương thức | method badge (cash/bank_card/ewallet) |
| Số tiền | `amount` VNĐ |
| Trạng thái | status badge (success=green, failed=red) |
| Mã GD | `transactionReference` truncated |

- Pagination: 10 items/page
- Filter: by method, by status

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Subscriptions | GET | `/api/v1/subscriptions` | `?memberId={id}&sort=startDate:desc` | toàn bộ fields |
| Packages batch | GET | `/api/v1/packages` | `?ids={id1,id2,...}` | `packageId`, `name` |
| Payments | GET | `/api/v1/payments` | `?memberId={id}&sort=paidAt:desc&page={n}&limit=10` | toàn bộ fields |

### State cần quản lý
```ts
const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions')
const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
const [payments, setPayments] = useState<Payment[]>([])
const [page, setPage] = useState(1)
const [total, setTotal] = useState(0)
const [loading, setLoading] = useState(true)
const [methodFilter, setMethodFilter] = useState<string>('all')
const [statusFilter, setStatusFilter] = useState<string>('all')
```

### Error Handling
- Empty state tab subscriptions: icon `PackageSearch` + "Chưa có lịch sử gói tập nào."
- Empty state tab payments: icon `ReceiptText` + "Chưa có giao dịch nào."
- 401: clearAuth + redirect login

### Navigation
- **Đến page này từ:** CurrentPackagePage, Sidebar
- **Rời page này:** Sidebar navigation

### Service file cần tạo/dùng
subscription.service, payment.service (đã có)

### Ghi chú / Edge cases
- Lazy load tab data: chỉ fetch payment khi user click tab đó lần đầu
- Package name: join từ packages array (fetch 1 lần, cache trong state)
- Format tiền tệ: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`

---

# WORKOUT PAGES

---

## 12. MyPlanPage — `/member/workout/plan`

### Mô tả ngắn
Xem kế hoạch tập đang được giao (active assignment), chi tiết từng ngày tập với bài tập, sets, reps.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/workout/MyPlanPage.tsx`

### UI Components

#### Plan Header Card (`rounded-[40px]`)
- Tên plan `Anton` 24px
- Assigned by: Staff tên / "Tự tạo"
- Start date
- Status badge: active (green) / completed (gray)
- `BtnOutlineWhite` "Xem lịch sử" → `/member/workout/history`
- `BtnPrimary` nhỏ "Tạo plan mới" → `/member/workout/builder`

#### Week/Day Navigator
- Horizontal scroll day tabs: "Ngày 1", "Ngày 2", ..., "Ngày N"
- Active day: bg `#06c384`, text white
- Completed day: check icon + dimmed

#### Day Detail (khi chọn ngày)
- Day name: "Ngày {n} — {dayName}" `Anton`
- Notes của ngày (nếu có) — italic, màu `#bbcabf`
- Exercise list (card mỗi bài):
  - Tên bài tập, category badge (strength/cardio/flexibility/balance)
  - Muscle group tag
  - Target: {targetSets} sets × {targetReps} reps hoặc {targetDurationSec}s
  - Weight: {targetWeightKg} kg
  - Rest: {restSeconds}s
  - Description accordion expand

#### Log Today Button
- Fixed bottom bar: `BtnPrimary` full-width "Ghi lại buổi tập hôm nay" → `/member/workout/session/{assignmentId}?day={planDayId}`

#### Empty state (no active plan)
- Icon `ClipboardList` + "Bạn chưa có kế hoạch tập nào."
- `BtnPrimary` "Tạo kế hoạch" → `/member/workout/builder`

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Active assignment | GET | `/api/v1/workout/plans/assignments` | `?memberId={id}&status=active` | `assignmentId`, `planId`, `startDate`, `status` |
| Plan details | GET | `/api/v1/workout/plans/{planId}` | — | `planId`, `name`, `description`, days array |
| Plan days | GET | `/api/v1/workout/plans/{planId}/days` | — | `planDayId`, `dayNumber`, `name`, `notes`, exercises array |
| Exercises per day | GET | `/api/v1/workout/plans/{planId}/days/{dayId}/exercises` | — | `exerciseId`, `name`, `category`, `muscleGroup`, `targetSets`, `targetReps`, `targetDurationSec`, `targetWeightKg`, `restSeconds`, `orderIndex` |

### State cần quản lý
```ts
const [assignment, setAssignment] = useState<WorkoutAssignment | null>(null)
const [plan, setPlan] = useState<WorkoutPlan | null>(null)
const [days, setDays] = useState<WorkoutPlanDay[]>([])
const [selectedDay, setSelectedDay] = useState<number>(0)
const [loading, setLoading] = useState(true)
```

### Error Handling
- 404 plan không tồn tại: "Kế hoạch tập không còn tồn tại." + CTA tạo mới
- 403: toast "Bạn không có quyền xem kế hoạch này."

### Navigation
- **Đến page này từ:** Dashboard widget, Sidebar "Kế hoạch tập"
- **Rời page này:**
  - "Ghi lại buổi tập" → `/member/workout/session/{assignmentId}?day={planDayId}`
  - "Tạo plan mới" → `/member/workout/builder`
  - "Xem lịch sử" → `/member/workout/history`

### Service file cần tạo/dùng
```ts
// src/services/workout.service.ts (mở rộng):
getAssignments(params: { memberId: string; status?: string }): Promise<WorkoutAssignment[]>
getPlan(planId: string): Promise<WorkoutPlan>
getPlanDays(planId: string): Promise<WorkoutPlanDay[]>
getPlanDayExercises(planId: string, dayId: string): Promise<WorkoutPlanExercise[]>
```

### Ghi chú / Edge cases
- Fetch exercises lazily: chỉ fetch ngày đang xem (selectedDay)
- `orderIndex` sort exercises trong ngày
- Nếu member có nhiều assignments active (edge case): lấy cái mới nhất theo `startDate`

---

## 13. PlanBuilderPage — `/member/workout/builder`

### Mô tả ngắn
Tạo kế hoạch tập cá nhân. Member tự chọn tên plan, thêm ngày tập, chọn bài tập cho mỗi ngày.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/workout/PlanBuilderPage.tsx`

### UI Components

#### Step Indicator (3 bước)
```
[1] Thông tin plan  →  [2] Thiết kế ngày tập  →  [3] Xác nhận
```
Active step: circle `#06c384`, completed: check icon

#### Step 1: Plan Info
- `Field` "Tên kế hoạch" (required)
- `Field` (textarea) "Mô tả" (optional)
- `BtnPrimary` "Tiếp theo"

#### Step 2: Design Days
- **Add day button:** `BtnOutlineWhite` "+ Thêm ngày tập"
- Mỗi ngày (drag-to-reorder, sử dụng simple up/down arrows thay cho DnD):
  - Header: "Ngày {n}" + input tên ngày + textarea notes + `Trash2` icon xóa
  - Exercise list trong ngày:
    - Mỗi exercise: tên bài + sets input + reps input + weight input + rest input + `X` remove
  - `BtnOutlineWhite` "+ Thêm bài tập" → mở modal chọn bài

**Exercise Picker Modal:**
- Search input tìm theo tên
- Filter by category (strength/cardio/flexibility/balance)
- List exercises: tên + category badge + muscle group
- Click → add vào ngày đang chọn
- Default values: sets=3, reps=10, rest=60

#### Step 3: Review & Confirm
- Summary card: tên plan, {n} ngày, tổng {m} bài tập
- List ngày: "Ngày 1 — {name}: bài1, bài2, ..."
- `BtnPrimary` "Tạo kế hoạch" (submit)
- `BtnOutlineWhite` "Sửa lại"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Danh sách exercises | GET | `/api/v1/workout/exercises` | `?category={cat}&search={q}` | `exerciseId`, `name`, `category`, `muscleGroup`, `equipmentNeeded` |
| Tạo plan | POST | `/api/v1/workout/plans` | `{ name, description, creatorType: 'member' }` | `planId` |
| Tạo plan day | POST | `/api/v1/workout/plans/{planId}/days` | `{ dayNumber, name, notes }` | `planDayId` |
| Thêm exercise vào day | POST | `/api/v1/workout/plans/{planId}/days/{dayId}/exercises` | `{ exerciseId, targetSets, targetReps?, targetDurationSec?, targetWeightKg?, restSeconds, orderIndex }` | `planExerciseId` |
| Tạo assignment | POST | `/api/v1/workout/plans/assignments` | `{ memberId, planId, startDate, status: 'active' }` | `assignmentId` |

### State cần quản lý
```ts
const [step, setStep] = useState(1)
const [planName, setPlanName] = useState('')
const [planDesc, setPlanDesc] = useState('')
const [days, setDays] = useState<BuilderDay[]>([])
const [exercises, setExercises] = useState<Exercise[]>([])
const [exerciseSearch, setExerciseSearch] = useState('')
const [categoryFilter, setCategoryFilter] = useState<string>('all')
const [modalOpen, setModalOpen] = useState(false)
const [targetDayIdx, setTargetDayIdx] = useState<number>(0)
const [submitting, setSubmitting] = useState(false)
```

### Error Handling
- 400: hiện lỗi inline trên step hiện tại
- 404 exercise not found: toast "Bài tập không còn tồn tại. Vui lòng chọn bài khác."
- Validation: plan cần ít nhất 1 ngày, mỗi ngày ít nhất 1 bài tập

### Navigation
- **Đến page này từ:** MyPlanPage, Dashboard empty state
- **Rời page này:**
  - Submit thành công → `navigate("/member/workout/plan", { state: { newPlanCreated: true } })`
  - Cancel → `/member/workout/plan`

### Service file cần tạo/dùng
```ts
// src/services/exercise.service.ts:
list(params?: { category?: string; search?: string }): Promise<Exercise[]>

// src/services/workout.service.ts (mở rộng):
createPlan(data: { name, description, creatorType }): Promise<WorkoutPlan>
createPlanDay(planId: string, data: { dayNumber, name, notes }): Promise<WorkoutPlanDay>
addExerciseToDay(planId: string, dayId: string, data: ExerciseTarget): Promise<WorkoutPlanExercise>
createAssignment(data: { memberId, planId, startDate, status }): Promise<WorkoutAssignment>
```

### Ghi chú / Edge cases
- Sequential API calls: tạo plan → tạo từng day → add exercises vào từng day → tạo assignment
- Nếu bất kỳ step nào fail: rollback (DELETE plan vừa tạo)
- Exercises fetch khi mở modal lần đầu (lazy), cache kết quả
- `orderIndex` = vị trí trong array exercises của ngày

---

## 14. WorkoutHistoryPage — `/member/workout/history`

### Mô tả ngắn
Danh sách tất cả workout logs (buổi tập đã ghi lại) với bộ lọc theo thời gian và plan.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/workout/WorkoutHistoryPage.tsx`

### UI Components

#### Stats Summary Row
- "Tổng buổi tập: **{total}**"
- "Tháng này: **{thisMonth}**"
- "Tuần này: **{thisWeek}**"

#### Filter Bar
- Date range picker (tháng/năm hoặc custom range)
- Dropdown "Tất cả kế hoạch" → list plan names từ assignments
- `BtnOutlineWhite` "Lọc" + `BtnOutlineWhite` nhỏ "Reset"

#### Log List (sorted by loggedAt desc)
Mỗi log card (`rounded-2xl`):
- Ngày tập: `CalendarDays` icon + "Thứ X, DD/MM/YYYY"
- Plan name + Day name
- Duration: `Clock` icon + "{durationMin} phút"
- Notes preview (1 dòng, truncate)
- "→ Chi tiết" link → `/member/workout/session/{logId}` (xem chi tiết log)

#### Pagination
10 logs/page, Prev/Next buttons

#### Empty state
Icon `ClipboardX` + "Chưa có buổi tập nào được ghi lại." + `BtnPrimary` "Ghi lại ngay"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Workout logs | GET | `/api/v1/workout/logs` | `?memberId={id}&page={n}&limit=10&from={date}&to={date}&planId={id}` | `logId`, `assignmentId`, `planDayId`, `loggedAt`, `durationMin`, `notes`, join plan/day names |
| Assignments list | GET | `/api/v1/workout/plans/assignments` | `?memberId={id}` | `assignmentId`, `planId`, plan `name` |

### State cần quản lý
```ts
const [logs, setLogs] = useState<WorkoutLog[]>([])
const [assignments, setAssignments] = useState<WorkoutAssignment[]>([])
const [page, setPage] = useState(1)
const [total, setTotal] = useState(0)
const [filters, setFilters] = useState({ from: '', to: '', planId: '' })
const [loading, setLoading] = useState(true)
```

### Error Handling
- Empty: empty state component
- 401: clearAuth + redirect

### Navigation
- **Đến page này từ:** MyPlanPage, Sidebar "Lịch sử tập"
- **Rời page này:**
  - Click log → `/member/workout/session/{logId}`
  - "Ghi lại ngay" → `/member/workout/plan`

### Service file cần tạo/dùng
```ts
// src/services/workoutLog.service.ts:
list(params: { memberId: string; page?: number; limit?: number; from?: string; to?: string; planId?: string }): Promise<{ data: WorkoutLog[]; total: number }>
```

### Ghi chú / Edge cases
- Refetch khi filter thay đổi (useEffect dependency array)
- Plan name join: fetch assignments 1 lần, tạo map `assignmentId → planName`

---

## 15. WorkoutSessionPage — `/member/workout/session/:id`

### Mô tả ngắn
Trang active recording một buổi tập: ghi lại từng set thực tế (reps, weight, duration) so với target. `:id` là `assignmentId` khi bắt đầu mới, hoặc `logId` khi xem lại.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/workout/WorkoutSessionPage.tsx`

### UI Components

#### Session Header
- Tên ngày tập, ngày hiện tại
- Timer: "⏱ {HH:MM:SS}" đang chạy khi record mode, hiện duration khi view mode
- `BtnOutlineWhite` "Kết thúc & Lưu" (chỉ trong record mode)

#### Exercise Cards (list dọc)
Mỗi exercise card (`rounded-2xl`):
- Tên bài tập `Anton` 18px + category badge
- Target: "Mục tiêu: {sets} sets × {reps} reps @ {weight}kg"
- Set logger table:

| Set | Reps thực tế | Weight thực tế | Duration | Hoàn thành |
|-----|-------------|----------------|----------|------------|
| 1   | [input]     | [input]        | [input]  | [checkbox] |
| 2   | [input]     | [input]        | [input]  | [checkbox] |
| +   | `BtnOutlineWhite` nhỏ "+ Thêm set" |

- Progress: "{completedSets}/{totalSets} sets hoàn thành" progress bar

#### Session Notes
- Textarea "Ghi chú buổi tập..." ở cuối page

#### View Mode (xem log cũ)
- Tất cả inputs readonly
- Hiện actual values đã ghi
- "Ghi lại vào: {loggedAt}" header

### Data & API Calls

**Record mode (params: assignmentId + ?day=planDayId):**

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Plan day exercises | GET | `/api/v1/workout/plans/{planId}/days/{dayId}/exercises` | — | exercises + targets |
| Save log | POST | `/api/v1/workout/logs` | `{ memberId, assignmentId, planDayId, loggedAt, durationMin, notes }` | `logId` |
| Save log sets | POST | `/api/v1/workout/logs/{logId}/sets` | `[{ planExerciseId, setNumber, actualReps, actualWeightKg, actualDurationSec, completed }]` | — |

**View mode (params: logId):**

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Get log | GET | `/api/v1/workout/logs/{logId}` | — | `logId`, `planDayId`, `loggedAt`, `durationMin`, `notes` |
| Get log sets | GET | `/api/v1/workout/logs/{logId}/sets` | — | toàn bộ WorkoutLogSet fields |

### State cần quản lý
```ts
const [mode, setMode] = useState<'record' | 'view'>('record')
const [exercises, setExercises] = useState<PlanExercise[]>([])
const [sets, setSets] = useState<Record<string, LogSetInput[]>>({})   // key = planExerciseId
const [notes, setNotes] = useState('')
const [elapsed, setElapsed] = useState(0)    // seconds, for timer
const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null)
const [saving, setSaving] = useState(false)
const [logData, setLogData] = useState<WorkoutLog | null>(null)   // view mode
```

### Error Handling
- 400 save log: "Dữ liệu không hợp lệ. Kiểm tra lại các set." inline error
- Nếu save fail: giữ nguyên form data, cho retry
- Unsaved changes guard: nếu navigate away trong record mode → confirm dialog "Dữ liệu chưa lưu. Bạn có muốn thoát không?"

### Navigation
- **Đến page này từ:**
  - MyPlanPage → record mode: `/member/workout/session/{assignmentId}?day={planDayId}`
  - WorkoutHistoryPage → view mode: `/member/workout/session/{logId}`
- **Rời page này:**
  - Lưu thành công → `navigate("/member/workout/history", { state: { justLogged: true } })`
  - Cancel → back với browser history

### Service file cần tạo/dùng
```ts
// src/services/workoutLog.service.ts:
create(data: { memberId, assignmentId, planDayId, loggedAt, durationMin, notes }): Promise<WorkoutLog>
createSets(logId: string, sets: LogSetInput[]): Promise<void>
getById(logId: string): Promise<WorkoutLog>
getSets(logId: string): Promise<WorkoutLogSet[]>
```

### Ghi chú / Edge cases
- Timer: `setInterval(1000)` từ khi load page record mode, cleanup on unmount
- Mode detection: nếu URL param `id` matches existing logId format → view mode; nếu có `?day=` query → record mode
- `durationMin = Math.round(elapsed / 60)` khi save
- Khi save: gọi `createLog` trước, lấy `logId`, rồi `createSets` với toàn bộ sets

---

## 16. AttendanceHistoryPage — `/member/workout/attendance`

### Mô tả ngắn
Lịch sử check-in/attendance của member, hiển thị dạng calendar + list.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/workout/AttendanceHistoryPage.tsx`

### UI Components

#### Summary Cards Row
- "Tổng check-in: **{total}**"
- "Tháng này: **{thisMonth}**"
- "Streak hiện tại: **{streak} ngày**"
- "Streak dài nhất: **{maxStreak} ngày**"

#### Calendar View (month view)
- Tháng/năm navigator (Prev / Next month)
- Grid 7×5/6 ô ngày
- Ngày có check-in: circle bg `#06c384`
- Ngày hôm nay: border `#42e09e`
- Hover ngày: tooltip "Check-in lúc {time}, {method}"

#### List View (toggle button)
- Switch giữa Calendar / List view
- List: table với cột `Ngày | Giờ vào | Giờ ra | Phương thức | Session`
- Phương thức badge: realtime/manual/qr
- 20 items/page pagination

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Attendance logs | GET | `/api/v1/training/attendance` | `?memberId={id}&month={YYYY-MM}&page={n}&limit=20` | `attendanceId`, `startTime`, `endTime`, `method`, `sessionId` |

### State cần quản lý
```ts
const [currentMonth, setCurrentMonth] = useState(new Date())
const [attendances, setAttendances] = useState<AttendanceLog[]>([])
const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
const [page, setPage] = useState(1)
const [total, setTotal] = useState(0)
const [loading, setLoading] = useState(true)
```

### Error Handling
- Empty state (tháng không có check-in): "Không có dữ liệu check-in cho tháng này."

### Navigation
- **Đến page này từ:** Sidebar "Điểm danh", Dashboard
- **Rời page này:** Sidebar navigation

### Service file cần tạo/dùng
```ts
// src/services/training.service.ts:
getAttendance(params: { memberId: string; month?: string; page?: number; limit?: number }): Promise<{ data: AttendanceLog[]; total: number }>
```

### Ghi chú / Edge cases
- Refetch khi đổi tháng
- Streak tính client-side từ sorted attendances array: đếm consecutive ngày có check-in
- `endTime` có thể null nếu member chưa check-out → hiện "Đang tập"

---

# TRACKING & FEEDBACK PAGES

---

## 17. ProgressPage — `/member/progress`

### Mô tả ngắn
Xem và theo dõi tiến độ thể chất: cân nặng, BMI, mục tiêu, ghi chú từ trainer qua thời gian.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/ProgressPage.tsx`

### UI Components

#### Current Stats Cards (hàng ngang)
4 stat cards (`rounded-2xl`):
1. Cân nặng hiện tại (kg) — giá trị mới nhất
2. BMI — với nhãn (Gầy/Bình thường/Thừa cân/Béo phì)
3. Mục tiêu — `goal` text string
4. Cập nhật lần cuối — `recordedAt` relative time

#### Weight Progress Chart
- Line chart (dùng `recharts` hoặc SVG đơn giản)
- X-axis: ngày ghi nhận
- Y-axis: cân nặng (kg)
- Data points: circles màu `#06c384`
- Hover tooltip: "{weight}kg — {date}"
- Màu đường: `#42e09e`
- Filter: 1 tháng / 3 tháng / 6 tháng / Tất cả

#### BMI History Table
| Ngày | Cân nặng | BMI | Mục tiêu | Ghi chú | Staff |
|------|---------|-----|----------|---------|-------|
| ... | ... | ... | ... | ... | ... |

#### Empty state
Icon `TrendingUp` + "Chưa có dữ liệu tiến độ. Nhờ trainer ghi nhận chỉ số của bạn."

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Progress history | GET | `/api/v1/members/{memberId}/progress` | `?from={date}&to={date}` | `progressId`, `weight`, `bmi`, `goal`, `notes`, `recordedAt`, `staffId` |

### State cần quản lý
```ts
const [progress, setProgress] = useState<MemberProgress[]>([])
const [timeFilter, setTimeFilter] = useState<'1m' | '3m' | '6m' | 'all'>('3m')
const [loading, setLoading] = useState(true)
```

### Error Handling
- 404: empty state + "Dữ liệu chưa được cập nhật."
- Lỗi chart render: fallback table view

### Navigation
- **Đến page này từ:** Sidebar "Tiến độ", Dashboard stat card
- **Rời page này:** Sidebar navigation

### Service file cần tạo/dùng
```ts
// src/services/member.service.ts:
getProgress(memberId: string, params?: { from?: string; to?: string }): Promise<MemberProgress[]>
```

### Ghi chú / Edge cases
- BMI classification: < 18.5 Gầy, 18.5-24.9 Bình thường, 25-29.9 Thừa cân, ≥30 Béo phì — màu text tương ứng
- Filter dates: tính `from` từ `timeFilter` relative to today
- Chart chỉ hiện khi có ≥ 2 data points; 1 data point → hiện số to + không có chart

---

## 18. SessionHistoryPage — `/member/sessions`

### Mô tả ngắn
Lịch sử và lịch sắp tới các buổi tập với trainer (TrainingSession), không phải workout logs.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/SessionHistoryPage.tsx`

### UI Components

#### Tab Bar
- "Sắp tới" (upcoming: scheduled/in_progress)
- "Đã hoàn thành" (completed)
- "Đã huỷ" (cancelled)

#### Session Cards (mỗi tab)
Mỗi session card (`rounded-2xl`):
- Ngày giờ: `Calendar` icon + "Thứ X, DD/MM HH:MM"
- Thời lượng: `Clock` icon + "{duration} phút"
- Trainer: `UserCircle` icon + trainer name
- Phòng: `MapPin` icon + room name/number
- Status badge: scheduled (blue), in_progress (amber), completed (green), cancelled (red)
- (Upcoming) Countdown: "Còn {n} giờ" nếu < 24h

#### Upcoming: Empty state
Icon `CalendarPlus` + "Không có buổi tập nào sắp tới. Liên hệ trainer để đặt lịch."

#### Completed: Empty state
Icon `CalendarCheck` + "Chưa có buổi tập nào hoàn thành."

#### Filter (Completed tab only)
- Tháng picker
- Trainer filter (nếu có nhiều trainer)

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Upcoming sessions | GET | `/api/v1/training/sessions` | `?memberId={id}&status=scheduled,in_progress&sort=startTime:asc` | `sessionId`, `startTime`, `endTime`, `trainerStaffId`, `roomId`, `status` |
| Completed sessions | GET | `/api/v1/training/sessions` | `?memberId={id}&status=completed&sort=startTime:desc&page={n}&limit=10` | same fields |
| Cancelled sessions | GET | `/api/v1/training/sessions` | `?memberId={id}&status=cancelled&sort=startTime:desc&page={n}&limit=10` | same fields |

### State cần quản lý
```ts
const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming')
const [sessions, setSessions] = useState<TrainingSession[]>([])
const [page, setPage] = useState(1)
const [total, setTotal] = useState(0)
const [loading, setLoading] = useState(true)
```

### Error Handling
- 401: clearAuth + redirect
- Lỗi fetch: icon `WifiOff` + "Không tải được dữ liệu. Thử lại."

### Navigation
- **Đến page này từ:** Dashboard "Xem tất cả" sessions widget, Sidebar
- **Rời page này:** Sidebar navigation

### Service file cần tạo/dùng
```ts
// src/services/training.service.ts:
getSessions(params: {
  memberId: string
  status?: string
  sort?: string
  page?: number
  limit?: number
}): Promise<{ data: TrainingSession[]; total: number }>
```

### Ghi chú / Edge cases
- Lazy fetch mỗi tab: chỉ fetch khi tab được active lần đầu, cache kết quả
- Duration = `(endTime - startTime) / 60000` phút
- Trainer name: join từ staff lookup (có thể cần thêm endpoint `GET /staff/{id}` — xem training.controller.ts)
- Status multi-value query: `?status=scheduled,in_progress` — verify backend hỗ trợ comma-separated

---

## 19. MyFeedbackPage — `/member/feedback`

### Mô tả ngắn
Danh sách tất cả feedback member đã gửi, với filter theo trạng thái và loại.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/feedback/MyFeedbackPage.tsx`

### UI Components

#### Page Header
- Heading `Anton` "Phản hồi của tôi"
- `BtnPrimary` "+ Gửi phản hồi mới" → `/member/feedback/send`

#### Filter Bar
- Dropdown "Loại": Tất cả / Nhân viên / Thiết bị / Dịch vụ
- Dropdown "Trạng thái": Tất cả / Mở / Đang xử lý / Đã giải quyết / Từ chối
- `BtnOutlineWhite` nhỏ "Reset"

#### Feedback List
Mỗi card (`rounded-2xl`):
- **Header row:** Date/time `createdAt` + Type badge (staff/equipment/service)
- **Severity badge:** low (green), medium (amber), high (red)
- **Status badge:** open (blue), in_progress (amber), resolved (green), rejected (gray)
- **Content preview:** truncate 2 dòng
- **Expand button:** "Xem chi tiết" → expand card hoặc navigate tới `/member/feedback/{id}`
- **Expanded view:**
  - Full content
  - Subject: tên staff/thiết bị nếu có
  - Handler: "Được xử lý bởi {staffName}" + `handledAt` (nếu resolved/rejected)
  - Response (nếu có từ staff)

#### Empty state (sau filter)
Icon `MessageSquareOff` + "Không có phản hồi nào khớp bộ lọc."

#### Empty state (chưa gửi gì)
Icon `MessageSquarePlus` + "Bạn chưa gửi phản hồi nào." + `BtnPrimary` "Gửi phản hồi đầu tiên"

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Feedback list | GET | `/api/v1/feedback` | `?memberId={id}&feedbackType={type}&status={status}&sort=createdAt:desc&page={n}&limit=10` | `feedbackId`, `feedbackType`, `content`, `severity`, `status`, `handledByStaffId`, `handledAt`, `subjectStaffId`, `subjectEquipmentId`, `createdAt` |

### State cần quản lý
```ts
const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
const [page, setPage] = useState(1)
const [total, setTotal] = useState(0)
const [typeFilter, setTypeFilter] = useState<string>('all')
const [statusFilter, setStatusFilter] = useState<string>('all')
const [expandedId, setExpandedId] = useState<string | null>(null)
const [loading, setLoading] = useState(true)
```

### Error Handling
- 404: empty state
- 401: clearAuth + redirect

### Navigation
- **Đến page này từ:** Dashboard feedback widget, Sidebar "Phản hồi"
- **Rời page này:**
  - "+ Gửi phản hồi mới" → `/member/feedback/send`

### Service file cần tạo/dùng
```ts
// src/services/feedback.service.ts:
list(params: {
  memberId: string
  feedbackType?: string
  status?: string
  sort?: string
  page?: number
  limit?: number
}): Promise<{ data: Feedback[]; total: number }>
```

### Ghi chú / Edge cases
- Refetch khi filter thay đổi (reset page về 1)
- `expandedId` cho inline expand — chỉ 1 card expand tại một lúc
- Feedback `status` thay đổi real-time nếu staff xử lý → không cần, static view đủ

---

## 20. SendFeedbackPage — `/member/feedback/send`

### Mô tả ngắn
Form gửi phản hồi mới về nhân viên, thiết bị, hoặc dịch vụ gym.

### Layout & Wrapper
- **Wrapper:** `DashboardLayout`
- File: `src/pages/member/feedback/SendFeedbackPage.tsx`

### UI Components

#### Page Header
- Breadcrumb: "Phản hồi > Gửi phản hồi mới"
- Heading `Anton` "Gửi phản hồi"
- Sub-text: "Phản hồi của bạn giúp gym phục vụ tốt hơn"

#### Step 1: Feedback Type selector
3 option cards ngang:
```
[  Nhân viên  ] [  Thiết bị  ] [  Dịch vụ  ]
```
Mỗi card: icon + label, click → selected (border `#06c384`)

**Icons:**
- Nhân viên: `UserCheck`
- Thiết bị: `Wrench`
- Dịch vụ: `Building2`

#### Step 2: Subject selector (conditional)
- **Nếu type = "staff":** Dropdown chọn trainer/staff theo tên
  - Fetch list staff endpoint hoặc hiện trainer được phân công
- **Nếu type = "equipment":** Dropdown hoặc text input tên thiết bị
- **Nếu type = "service":** Không hiện subject selector

#### Step 3: Feedback form
- **Mức độ nghiêm trọng** (radio buttons với icon):
  - `[ ] Thấp` (green circle) — góp ý nhỏ
  - `[ ] Trung bình` (amber circle) — vấn đề cần chú ý
  - `[ ] Cao` (red circle) — vấn đề nghiêm trọng
- **Nội dung phản hồi** (Textarea, required, min 20 chars, max 500 chars)
  - Placeholder: "Mô tả chi tiết vấn đề hoặc đề xuất của bạn..."
  - Character counter: "{n}/500"
- `BtnPrimary` full-width "Gửi phản hồi"
- `BtnOutlineWhite` "Hủy" → `/member/feedback`

#### Success state (sau submit)
- Thay form bằng success view (không navigate)
- Icon `CheckCircle2` màu `#06c384`, size 64px
- "Phản hồi đã được gửi thành công!"
- "Chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất."
- `BtnPrimary` "Xem phản hồi của tôi" → `/member/feedback`
- `BtnOutlineWhite` "Gửi phản hồi khác" → reset form

### Data & API Calls

| Call | Method | Endpoint | Params/Body | Response fields dùng |
|------|--------|----------|-------------|---------------------|
| Gửi feedback | POST | `/api/v1/feedback` | `{ memberId, feedbackType, content, severity, subjectStaffId?, subjectEquipmentId? }` | `feedbackId`, `status` |
| List staff (nếu type=staff) | GET | `/api/v1/staff` | `?role=trainer&gym={gymId}` | `staffId`, `fullName` |

### State cần quản lý
```ts
const [feedbackType, setFeedbackType] = useState<'staff' | 'equipment' | 'service' | null>(null)
const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('low')
const [content, setContent] = useState('')
const [subjectStaffId, setSubjectStaffId] = useState<string>('')
const [subjectEquipmentId, setSubjectEquipmentId] = useState<string>('')
const [staffList, setStaffList] = useState<Staff[]>([])
const [submitting, setSubmitting] = useState(false)
const [success, setSuccess] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Error Handling
| HTTP | Điều kiện | UI phản hồi |
|------|-----------|-------------|
| 400 | Content quá ngắn hoặc thiếu type | Inline error dưới field tương ứng |
| 401 | Chưa đăng nhập | Redirect `/login?returnTo=/member/feedback/send` |
| 403 | Không có quyền gửi | `ErrorMsg`: "Bạn không có quyền thực hiện thao tác này." |
| 429 | Spam protection | `ErrorMsg`: "Bạn đã gửi quá nhiều phản hồi. Vui lòng đợi trước khi gửi tiếp." |
| 500 | Server error | `ErrorMsg`: "Gửi phản hồi thất bại. Vui lòng thử lại sau." |

### Navigation
- **Đến page này từ:** MyFeedbackPage, Dashboard "Gửi phản hồi"
- **Rời page này:**
  - Submit success (via button) → `/member/feedback`
  - "Hủy" → `/member/feedback`

### Service file cần tạo/dùng
```ts
// src/services/feedback.service.ts:
create(data: {
  memberId: string
  feedbackType: 'staff' | 'equipment' | 'service'
  content: string
  severity: 'low' | 'medium' | 'high'
  subjectStaffId?: string
  subjectEquipmentId?: string
}): Promise<Feedback>
```

### Ghi chú / Edge cases
- `feedbackType` phải được chọn trước khi hiện form chi tiết (guard trong render)
- Staff list lazy fetch: chỉ fetch khi `feedbackType === 'staff'`
- Character limit 500 — disable submit nếu `content.length < 20 || content.length > 500`
- Sau submit success: không navigate tự động — cho user quyết định

---

# SUMMARY: SERVICE FILES CẦN TẠO

## `src/services/member.service.ts` (tạo mới)
```ts
import api from './api'

export const memberService = {
  getProfile: (memberId: string) =>
    api.get(`/members/${memberId}`).then(r => r.data),

  updateProfile: (memberId: string, data: Partial<MemberProfile>) =>
    api.patch(`/members/${memberId}`, data).then(r => r.data),

  getProgress: (memberId: string, params?: { from?: string; to?: string; limit?: number }) =>
    api.get(`/members/${memberId}/progress`, { params }).then(r => r.data),
}
```

## `src/services/training.service.ts` (tạo mới)
```ts
import api from './api'

export const trainingService = {
  getSessions: (params: SessionQuery) =>
    api.get('/training/sessions', { params }).then(r => r.data),

  getAttendance: (params: AttendanceQuery) =>
    api.get('/training/attendance', { params }).then(r => r.data),
}
```

## `src/services/feedback.service.ts` (tạo mới)
```ts
import api from './api'

export const feedbackService = {
  list: (params: FeedbackQuery) =>
    api.get('/feedback', { params }).then(r => r.data),

  getById: (feedbackId: string) =>
    api.get(`/feedback/${feedbackId}`).then(r => r.data),

  create: (data: CreateFeedbackDto) =>
    api.post('/feedback', data).then(r => r.data),
}
```

## `src/services/exercise.service.ts` (tạo mới)
```ts
import api from './api'

export const exerciseService = {
  list: (params?: { category?: string; search?: string }) =>
    api.get('/workout/exercises', { params }).then(r => r.data),
}
```

## `src/services/workoutLog.service.ts` (tạo mới)
```ts
import api from './api'

export const workoutLogService = {
  list: (params: WorkoutLogQuery) =>
    api.get('/workout/logs', { params }).then(r => r.data),

  getById: (logId: string) =>
    api.get(`/workout/logs/${logId}`).then(r => r.data),

  create: (data: CreateWorkoutLogDto) =>
    api.post('/workout/logs', data).then(r => r.data),

  createSets: (logId: string, sets: LogSetInput[]) =>
    api.post(`/workout/logs/${logId}/sets`, sets).then(r => r.data),

  getSets: (logId: string) =>
    api.get(`/workout/logs/${logId}/sets`).then(r => r.data),
}
```

## `src/services/auth.service.ts` (extend — thêm 3 functions)
```ts
// Thêm vào file hiện có:
export async function register(
  fullName: string,
  phone: string,
  email: string,
  password: string
) {
  const { data } = await api.post('/members/self-register', { fullName, phone, email, password })
  return data
}

export async function verifyEmail(email: string, otp: string) {
  const { data } = await api.post('/auth/verify-email', { email, otp })
  return data
}

export async function resendVerification(email: string) {
  const { data } = await api.post('/auth/resend-verify', { email })
  return data
}
```

---

# ROUTING CONFIGURATION (kiểm tra lại App.tsx)

```tsx
// Public routes (không cần auth)
<Route path="/member/register" element={<RegisterPage />} />
<Route path="/member/verify-email" element={<VerifyEmailPage />} />
<Route path="/member/register-success" element={<RegisterSuccessPage />} />
<Route path="/member/payment" element={<PaymentPage />} />

// Protected routes (require role: member)
<Route element={<RequireAuth roles={['member']} />}>
  <Route element={<DashboardLayout />}>
    <Route path="/member" element={<DashboardPage />} />
    <Route path="/member/profile" element={<ProfilePage />} />

    {/* Subscription */}
    <Route path="/member/subscription/setup" element={<SubscriptionSetupPage />} />
    <Route path="/member/subscription/current" element={<CurrentPackagePage />} />
    <Route path="/member/subscription/buy" element={<BuyPackagePage />} />
    <Route path="/member/subscription/renew" element={<RenewPackagePage />} />
    <Route path="/member/subscription/history" element={<PackageHistoryPage />} />

    {/* Workout */}
    <Route path="/member/workout/plan" element={<MyPlanPage />} />
    <Route path="/member/workout/builder" element={<PlanBuilderPage />} />
    <Route path="/member/workout/history" element={<WorkoutHistoryPage />} />
    <Route path="/member/workout/session/:id" element={<WorkoutSessionPage />} />
    <Route path="/member/workout/attendance" element={<AttendanceHistoryPage />} />

    {/* Tracking & Feedback */}
    <Route path="/member/progress" element={<ProgressPage />} />
    <Route path="/member/sessions" element={<SessionHistoryPage />} />
    <Route path="/member/feedback" element={<MyFeedbackPage />} />
    <Route path="/member/feedback/send" element={<SendFeedbackPage />} />
  </Route>
</Route>
```

---

# SIDEBAR NAVIGATION (DashboardLayout)

Các sidebar items cho role Member:

| Icon | Label | Path |
|------|-------|------|
| `LayoutDashboard` | Tổng quan | `/member` |
| `User` | Hồ sơ | `/member/profile` |
| `Package` | Gói tập | `/member/subscription/current` |
| `Dumbbell` | Kế hoạch tập | `/member/workout/plan` |
| `ClipboardList` | Lịch sử tập | `/member/workout/history` |
| `QrCode` | Điểm danh | `/member/workout/attendance` |
| `TrendingUp` | Tiến độ | `/member/progress` |
| `CalendarDays` | Lịch hẹn | `/member/sessions` |
| `MessageSquare` | Phản hồi | `/member/feedback` |

---

# COMMON PATTERNS

## Pattern: Protected page với auth check
```tsx
useEffect(() => {
  const { user, isAuthenticated } = useAuthStore.getState()
  if (!isAuthenticated || !user?.memberId) {
    navigate('/login', { replace: true })
    return
  }
  fetchData(user.memberId)
}, [])
```

## Pattern: Xử lý API lỗi chuẩn
```tsx
try {
  setLoading(true)
  const data = await someService.call(params)
  setData(data)
} catch (err: any) {
  const status = err?.response?.status
  if (status === 401) {
    clearAuth()
    navigate('/login')
  } else if (status === 403) {
    setError('Bạn không có quyền truy cập.')
  } else if (status === 404) {
    setError('Không tìm thấy dữ liệu.')
  } else {
    setError(err?.response?.data?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.')
  }
} finally {
  setLoading(false)
}
```

## Pattern: Loading skeleton (áp dụng cho mọi list/card)
```tsx
if (loading) {
  return (
    <div className="animate-pulse space-y-4">
      {Array(3).fill(0).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-[#0f1c16]/60" />
      ))}
    </div>
  )
}
```

## Pattern: Navigate với state
```tsx
// Gửi state
navigate('/member/verify-email', { state: { email: formEmail } })

// Nhận state
const location = useLocation()
const email = location.state?.email
// Guard nếu thiếu state bắt buộc
if (!email) { navigate('/member/register', { replace: true }); return null }
```

## Pattern: Toast notifications
```tsx
// Giả sử dùng react-hot-toast hoặc tương đương
import toast from 'react-hot-toast'
toast.success('Lưu thành công!')
toast.error('Đã có lỗi xảy ra.')
```

## Pattern: Empty State component
```tsx
function EmptyState({ icon: Icon, message, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Icon className="text-[#bbcabf] w-12 h-12" />
      <p className="text-[#bbcabf] text-center">{message}</p>
      {cta}
    </div>
  )
}
```

---


*Tài liệu này được tạo để phục vụ implementation — không cần đọc thêm file nào khác trong dự án.*
