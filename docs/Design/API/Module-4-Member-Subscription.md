# Module 4 — Member / Subscription / Payment API

| Field | Value |
|---|---|
| Document ID | GMS-API-M4-001 |
| Version | 1.1.0 |
| Status | Draft |
| Author | Lê Thanh An (initial draft 2026-05-17) |
| Reviewers | TBD |
| Last Updated | 2026-06-19 |
| Related docs | [`conventions.md`](./conventions.md), [`Architecture.md §3.1, §4.3.3, §4.5.2, §5.2`](../Architecture.md), [`Database.md §USER, MEMBER, SUBSCRIPTION, PAYMENT`](../Database.md), [`SRS_VI.md UC03A, UC03B, UC04A, UC04B, UC06, UC11`](../../VI/SRS_VI.md) |

---

## 1. Mục đích & Phạm vi

Module 4 đặc tả endpoint quản lý hội viên + lượt đăng ký gói tập + thanh toán. Bao trùm 5 UC: đăng ký tại quầy (UC03A), đăng ký online (UC03B), gia hạn gói (UC04A), hủy gói (UC04B), theo dõi tiến độ (UC06). Subset UC11 (quản lý hội viên: list/update/delete) cũng nằm ở đây để giữ resource group nhất quán; quản lý nhân sự thuộc Module 5 Staff.

In-scope: 24 endpoint chia 4 resource (Members 12 / Subscriptions 6 / Payments 2 / Payment Accounts 4).

Out-of-scope:

- Package CRUD (Module 3). Module 4 chỉ tham chiếu `packages.package_id` qua FK.
- Staff management (Module 5).
- Training sessions, attendance logs (Module 7).
- Progress read by staff/trainer — xem `GET /members/:id/progress` sẽ spec ở Module 7.
- Refund flow (defer v1.1 — không có UC v1.0).
- Upgrade/downgrade giữa kỳ (defer v1.1+ — Architecture ADR-009).

## 2. Endpoint Inventory

### Members

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 1 | GET | `/members/me` | — | JWT | `Self` |
| 2 | PATCH | `/members/me` | — | JWT | `Self` |
| 3 | GET | `/members/me/trainers` | — | JWT | `Self` |
| 4 | PATCH | `/members/me/trainer` | — | JWT | `Self` |
| 5 | POST | `/members/me/progress` | UC06 | JWT | `Self` |
| 6 | POST | `/members` | UC03A | JWT | `member.create` |
| 7 | POST | `/members/self-register` | UC03B | Public | `Public` |
| 8 | GET | `/members` | UC11 list | JWT | `member.read` |
| 9 | GET | `/members/:id` | — | JWT | `member.read` HOẶC `Self` |
| 10 | PATCH | `/members/:id` | UC11 update | JWT | `member.update` HOẶC `Self` (field allowlist) |
| 11 | DELETE | `/members/:id` | UC11 delete | JWT | `member.delete` |
| 12 | PATCH | `/members/:id/assign-trainer` | UC11 | JWT | `member.update` |

### Subscriptions

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 13 | POST | `/subscriptions` | UC03A/B, UC04A | JWT | `subscription.create` |
| 14 | GET | `/subscriptions` | — | JWT | `subscription.read` HOẶC `Self` (`memberId=self` bắt buộc) |
| 15 | GET | `/subscriptions/member/:memberId` | — | JWT | `subscription.read` |
| 16 | PATCH | `/subscriptions/:id/cancel` | UC04B | JWT | `subscription.cancel` |
| 17 | POST | `/subscriptions/:id/renew` | UC04A | JWT | `subscription.create` |
| 18 | GET | `/subscriptions/:id` | — | JWT | `subscription.read` HOẶC `Self` |

### Payments

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 19 | POST | `/payments` | UC03A/B, UC04A | JWT | `payment.create` |
| 20 | GET | `/payments` | — | JWT | `payment.read` HOẶC `Self` (`memberId=self` bắt buộc) |

### Payment Accounts

| # | Method | Path | UC | Auth | RBAC |
|---|---|---|---|---|---|
| 21 | GET | `/members/:memberId/payment-accounts` | — | JWT | `Self` HOẶC staff/owner |
| 22 | POST | `/members/:memberId/payment-accounts` | — | JWT | `Self` HOẶC staff/owner |
| 23 | PATCH | `/members/:memberId/payment-accounts/:accountId` | — | JWT | `Self` HOẶC staff/owner |
| 24 | DELETE | `/members/:memberId/payment-accounts/:accountId` | — | JWT | `Self` HOẶC staff/owner |

---

## 3. Members

### 3.0 GET /members/me

**UC:** —
**Auth:** JWT
**RBAC:** `Self` (authenticated member)

**Description:** Member lấy profile của chính mình. Không cần permission đặc biệt — chỉ cần JWT hợp lệ có `memberId`.

**Response 200 OK:** Cùng shape với GET /members/:id.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | JWT hợp lệ nhưng user không gắn với hội viên nào (`memberId` null) |

---

### 3.0b PATCH /members/me

**UC:** —
**Auth:** JWT
**RBAC:** `Self` (authenticated member)

**Description:** Member cập nhật profile của chính mình. Giới hạn field giống `PATCH /members/:id` khi Self caller (§3.5).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `fullName` | string | no | `@Length(2, 100)` |
| `phone` | string | no | — |
| `dateOfBirth` | string (YYYY-MM-DD) | no | `@IsDateString` |
| `address` | string | no | `@Length(0, 200)` |

**Response 200 OK:** Trả member object đầy đủ.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | JWT không gắn với hội viên |
| 409 | `DUPLICATE_VALUE` | Phone đã tồn tại ở user khác |

---

### 3.0c GET /members/me/trainers

**UC:** —
**Auth:** JWT
**RBAC:** `Self` (authenticated member)

**Description:** Lấy danh sách PT khả dụng mà member có thể tự chọn (tự gán). Không cần permission đặc biệt.

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "staffId": "3",
      "fullName": "Phạm PT C",
      "specialization": "Strength & Conditioning"
    }
  ]
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |

---

### 3.0d PATCH /members/me/trainer

**UC:** —
**Auth:** JWT
**RBAC:** `Self` (authenticated member)

**Description:** Member tự gán hoặc hủy PT của mình. Khác với `PATCH /members/:id/assign-trainer` (yêu cầu `member.update` permission — Staff/Owner only), endpoint này cho phép member tự chọn.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `trainerId` | integer \| null | no | FK `staff.staff_id`; `null` để hủy gán |

```json
{ "trainerId": 3 }
```

Gửi `{ "trainerId": null }` hoặc omit field để hủy gán PT.

**Response 200 OK:** Trả member object sau khi update.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 400 | `FK_CONSTRAINT` | `trainerId` không tồn tại hoặc không phải PT |

---

### 3.0e POST /members/me/progress

**UC:** UC06 — Member tự ghi chỉ số
**Auth:** JWT
**RBAC:** `Self` (authenticated member)

**Description:** Member tự ghi cân nặng và chiều cao. Không cần permission đặc biệt. Khác với POST progress do Staff/Trainer ghi (Module 7).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `weight` | number | yes | `@Min(1)` `@Max(500)` — kg |
| `height` | number | no | `@Min(50)` `@Max(300)` — cm |

```json
{ "weight": 68.5, "height": 172 }
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "progressId": "45",
    "memberId": "5",
    "weight": 68.5,
    "height": 172,
    "recordedAt": "2026-06-19T08:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / weight out of range |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | JWT không gắn với hội viên |

---

### 3.1 GET /members

**UC:** UC11 (list member để quản lý)
**Auth:** JWT
**RBAC:** `member.read`

**Description:** List hội viên với pagination + filter. Mặc định ẩn `deleted_at IS NOT NULL`.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `page` | integer | no | 1 | `@Min(1)` |
| `pageSize` | integer | no | 20 | `@Min(1)` `@Max(100)` |
| `sort` | string | no | `created_at:desc` | whitelist: `created_at`, `member_code`, `full_name` |
| `status` | enum | no | — | `pending_verification`, `active`, `locked` (filter theo `users.status`) |
| `trainerId` | string | no | — | filter `primary_trainer_id` |
| `search` | string | no | — | match `member_code` ILIKE / `full_name` ILIKE |
| `includeDeleted` | boolean | no | false | chỉ Owner — bao gồm soft-deleted |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "userId": "7",
      "email": "a@gym.local",
      "fullName": "Nguyễn Văn A",
      "phone": "+84901234567",
      "status": "active",
      "dateOfBirth": "1995-06-15",
      "address": "12 Lê Lợi, Q1",
      "primaryTrainerId": "3",
      "createdAt": "2026-04-12T08:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 137, "totalPages": 7 }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Query param sai format / out-of-range / sort field ngoài whitelist |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner/Staff / `includeDeleted=true` mà role không phải Owner |

**Business rules:**

```text
WHEN role là Staff (không phải Owner)
THEN ignore param includeDeleted, query luôn filter deleted_at IS NULL
ELSE Owner có thể set includeDeleted=true để xem soft-deleted

WHEN trainerId provided
THEN filter WHERE primary_trainer_id = trainerId AND deleted_at IS NULL
ELSE no trainer filter
```

**Audit:** Không (GET).

---

### 3.2 GET /members/:id

**UC:** —
**Auth:** JWT
**RBAC:** `member.read` HOẶC `Self` HOẶC `PT-if-primary`

**Description:** Lấy chi tiết 1 hội viên. PT chỉ thấy nếu là `primary_trainer_id`. Member chỉ thấy chính mình.

**Path param:** `id` = `member_id` (string BigInt).

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "userId": "7",
    "email": "a@gym.local",
    "fullName": "Nguyễn Văn A",
    "phone": "+84901234567",
    "status": "active",
    "emailVerifiedAt": "2026-04-12T08:30:00.000Z",
    "dateOfBirth": "1995-06-15",
    "address": "12 Lê Lợi, Q1",
    "primaryTrainerId": "3",
    "avatarFileId": "42",
    "createdAt": "2026-04-12T08:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject (PT không phải primary, hoặc Member khác Self) |
| 404 | `NOT_FOUND` | `member_id` không tồn tại hoặc `deleted_at IS NOT NULL` (trừ Owner có `?includeDeleted=true`) |

**Business rules:**

```text
WHEN role là Owner hoặc Staff
THEN bypass ownership, trả resource
ELSE check ownership

WHEN role là PT
THEN check member.primary_trainer_id = self.staff_id
ELSE proceed

WHEN role là Member
THEN check member.user_id = jwt.sub
ELSE 403

WHEN member.deleted_at IS NOT NULL AND không phải Owner with includeDeleted=true
THEN 404
```

**Audit:** Không (GET).

---

### 3.3 POST /members

**UC:** UC03A — Đăng ký tại quầy
**Auth:** JWT
**RBAC:** `member.create`

**Description:** Staff tạo tài khoản hội viên mới tại quầy. Sinh `member_code` tự động (`MEM-YYYY-XXXXXX`). User tạo với `status='pending_verification'`; gửi OTP email verify (UC13). Subscription + Payment KHÔNG tạo cùng request — Staff gọi `POST /subscriptions` + `POST /payments` riêng sau khi member verify email (Architecture decision: tách atomic per-resource).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` UNIQUE |
| `password` | string | yes | `@Length(8, 100)` |
| `fullName` | string | yes | `@Length(2, 100)` |
| `phone` | string | no | optional |
| `dateOfBirth` | string (YYYY-MM-DD) | yes | `@IsDateString` |
| `address` | string | no | `@Length(0, 200)` |
| `packageId` | integer | yes | FK `packages.package_id` |
| `paymentMethod` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `transactionReference` | string | no | — |

```json
{
  "email": "newmember@gym.local",
  "password": "InitPass123!",
  "fullName": "Nguyễn Văn A",
  "phone": "+84901234567",
  "dateOfBirth": "1995-06-15",
  "address": "12 Lê Lợi, Q1",
  "packageId": 3,
  "paymentMethod": "cash"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "userId": "7",
    "email": "newmember@gym.local",
    "fullName": "Nguyễn Văn A",
    "status": "pending_verification",
    "createdAt": "2026-05-17T10:30:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Staff/Owner |
| 409 | `DUPLICATE_VALUE` | Email hoặc phone đã tồn tại (P2002) |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry 5 lần sinh `member_code` đều collision |

**Business rules:**

```text
WHEN email hoặc phone đã tồn tại trong users
THEN 409 DUPLICATE_VALUE
ELSE proceed

WHEN sinh member_code 5 lần đều collision
THEN 500 MEMBER_CODE_GENERATION_FAILED
ELSE proceed

WHEN proceed
THEN $transaction(
  INSERT users (status='pending_verification', password_hash=bcrypt(password, 12));
  INSERT members (user_id, member_code);
  INSERT user_groups (group='member');
  INSERT otp_codes (purpose='email_verify', expires_at=NOW()+10min);
  INSERT audit_logs (action='member.create')
)
AND log OTP stdout v1.0 (TODO: gửi email khi SMTP ready)
```

**Audit:** `member.create`. `before_data` NULL, `after_data` = member + user shape (mask `password_hash`).

**Rate limit:** Không.

**Notes:**

- `member_code` format `MEM-{YYYY}-{6 digits}`, năm hiện tại (`today_vn`). Random 6 digits + retry collision (conventions §12).
- Password hash bcrypt cost 12 (cùng pattern `auth.service.ts:97`).
- OTP gửi qua email pending SMTP integration (Architecture §8 R8). V1.0 log stdout.
- Member group ID lookup từ `groups WHERE name='member'` (seed data).

---

### 3.4 POST /members/self-register

**UC:** UC03B — Đăng ký online (member tự đăng ký từ landing page)
**Auth:** Public
**RBAC:** `Public`

**Description:** Member tự đăng ký không cần Staff. Tạo user + member + OTP verify email. Optional: tạo subscription `pending` với `packageId` chọn từ landing page; subscription chuyển `active` sau khi member pay (cron daily 00:10 `subscription:activate-pending`) hoặc cancel sau 24-48h nếu chưa pay (cron `subscription:cancel-unpaid-pending`).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `email` | string | yes | `@IsEmail` UNIQUE |
| `password` | string | yes | `@Length(8, 100)` |
| `fullName` | string | yes | `@Length(2, 100)` |
| `phone` | string | no | optional |
| `dateOfBirth` | string (YYYY-MM-DD) | no | `@IsDateString` |
| `address` | string | no | `@Length(0, 200)` |
| `packageId` | integer | no | FK `packages.package_id`, status='active', `deleted_at IS NULL` |

```json
{
  "email": "selfreg@gym.local",
  "password": "MyPass123!",
  "fullName": "Trần Thị B",
  "phone": "+84909999999",
  "dateOfBirth": "1998-03-22",
  "packageId": 3
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "memberId": "6",
    "memberCode": "MEM-2026-000006",
    "userId": "8",
    "email": "selfreg@gym.local",
    "status": "pending_verification",
    "subscription": {
      "subscriptionId": "12",
      "packageId": "3",
      "status": "pending"
    }
  }
}
```

`subscription` null nếu không truyền `packageId`.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `FK_CONSTRAINT` | `packageId` không tồn tại / `status='inactive'` / soft-deleted |
| 409 | `DUPLICATE_VALUE` | Email hoặc phone đã tồn tại |
| 500 | `MEMBER_CODE_GENERATION_FAILED` | Retry sinh code thất bại |

**Business rules:**

```text
WHEN email/phone duplicate
THEN 409
ELSE proceed

WHEN packageId provided
THEN validate packages.status='active' AND deleted_at IS NULL, fail → 400 FK_CONSTRAINT
ELSE skip subscription creation

WHEN packageId valid
THEN $transaction(
  INSERT users + members + user_groups + otp_codes + audit_logs (member.create);
  INSERT subscriptions (status='pending', start_date=today_vn, end_date=today_vn + package.durationDays - 1);
  INSERT audit_logs (action='subscription.create')
)
ELSE $transaction(users + members + user_groups + otp_codes + audit_logs)

ALWAYS log OTP stdout v1.0
```

**Audit:** `member.create` + (nếu có subscription) `subscription.create`. `actor_user_id` NULL (public endpoint).

**Rate limit:** Không enforce v1.0. CAPTCHA defer v1.1 (Architecture §8 R23).

**Notes:**

- Subscription `start_date = today_vn`, `end_date = start_date + package.duration_days - 1` (inclusive). Architecture §4.5.2 `today_vn`.
- Subscription ở `pending` → cron daily 00:15 `subscription:cancel-unpaid-pending` cancel nếu sau 24-48h vẫn chưa có `payments WHERE status='success'` (Architecture §5.2 + LOG-M03 fix phase 8).
- Member phải verify email trước khi login (UC13).
- `packageId` validate FK constraint qua Prisma — fail → P2003 → 400 (conventions §6).

---

### 3.5 PATCH /members/:id

**UC:** UC11 update (Staff/Owner) hoặc Self update profile
**Auth:** JWT
**RBAC:** `member.update` HOẶC `Self` (field allowlist)

**Description:** Cập nhật profile hội viên. Self chỉ được update subset field (`phone`, `address`, `dateOfBirth`, `fullName`); Staff/Owner update mọi field trừ system-managed (`memberId`, `memberCode`, `userId`, `status`).

**Path param:** `id` = `member_id`.

**Request body (partial):**

| Field | Type | Constraint | Self allowed |
|---|---|---|---|
| `fullName` | string | `@Length(2, 200)` | yes |
| `phone` | string | `@IsPhoneNumber('VN')` UNIQUE | yes |
| `dateOfBirth` | string (YYYY-MM-DD) | — | yes |
| `address` | string | `@MaxLength(200)` | yes |
| `primaryTrainerId` | string | FK `staff.staff_id` | no (Staff/Owner only — note: dùng `/assign-trainer` endpoint dưới đây thay vì PATCH chung) |

```json
{ "phone": "+84901234568", "address": "34 Trần Hưng Đạo, Q1" }
```

**Response 200 OK:** Trả member object đầy đủ (giống GET /members/:id).

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / chứa field không cho phép với role |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject / Self gửi field ngoài allowlist |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / soft-deleted |
| 409 | `DUPLICATE_VALUE` | Phone đã tồn tại ở user khác |

**Business rules:**

```text
WHEN role là Self (member tự update)
THEN whitelist fields = [fullName, phone, dateOfBirth, address]
AND reject body chứa field khác → 400 VALIDATION_ERROR
ELSE Owner/Staff full update (trừ system-managed)

WHEN body chứa primaryTrainerId
THEN reject 400, hướng dẫn dùng /assign-trainer endpoint
ELSE proceed
```

**Audit:** `member.update`. `before_data` = snapshot trước; `after_data` = snapshot sau. Mask `password_hash` luôn.

---

### 3.6 DELETE /members/:id

**UC:** UC11 delete
**Auth:** JWT
**RBAC:** `member.delete`

**Description:** Soft-delete hội viên (`deleted_at = NOW()`). KHÔNG cascade subscription/payment — giữ history cho audit/refund. User account `users.deleted_at` cũng set; user mất quyền login.

**Path param:** `id` = `member_id`.

**Response 200 OK:**

```json
{ "success": true, "message": "Đã xóa hội viên MEM-2026-000005" }
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / đã soft-deleted |

**Business rules:**

```text
WHEN member có active subscription
THEN soft-delete vẫn proceed; subscription giữ status='active' nhưng UC05B check-in sẽ reject (member.deleted_at IS NOT NULL)
ELSE proceed

ALWAYS $transaction(
  UPDATE members SET deleted_at=NOW() WHERE member_id=?;
  UPDATE users SET deleted_at=NOW() WHERE user_id=member.user_id;
  INSERT audit_logs (action='member.delete')
)
```

**Audit:** `member.delete`. `before_data` = snapshot, `after_data` NULL.

**Notes:**

- Cascade soft-delete users — xem Database.md §Cascade Soft Delete Convention.
- Restore (undo soft-delete) defer v1.1 — không có UC v1.0. Owner cần restore phải edit DB manual.

---

### 3.7 PATCH /members/:id/assign-trainer

**UC:** UC11 — gán PT cố định
**Auth:** JWT
**RBAC:** `member.update`

**Description:** Gán hoặc bỏ gán PT chính cho hội viên. PT chính ảnh hưởng UC06 (PT chỉ thấy member mình phụ trách).

**Path param:** `id` = `member_id`.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `trainerId` | string \| null | yes | FK `staff.staff_id` với `position='pt'` và `deleted_at IS NULL`, hoặc `null` để bỏ gán |

```json
{ "trainerId": "3" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "memberId": "5",
    "primaryTrainerId": "3",
    "primaryTrainerName": "Phạm PT C"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `FK_CONSTRAINT` | `trainerId` không tồn tại / không phải position `pt` / đã soft-delete |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Owner/Staff |
| 404 | `NOT_FOUND` | `member_id` không tồn tại / soft-deleted |

**Business rules:**

```text
WHEN trainerId là null
THEN UPDATE members SET primary_trainer_id=NULL (bỏ gán)
ELSE validate staff.position='pt' AND staff.deleted_at IS NULL, fail → 400

WHEN validation pass
THEN UPDATE members SET primary_trainer_id=trainerId
AND INSERT audit_logs (action='member.assign-trainer')
```

**Audit:** `member.assign-trainer`. `before_data` = `{primaryTrainerId: <old>}`, `after_data` = `{primaryTrainerId: <new>}`.

---

## 4. Subscriptions

### 4.1 GET /subscriptions

**UC:** —
**Auth:** JWT
**RBAC:** `subscription.read` HOẶC `Self` (`memberId=self` bắt buộc khi chỉ có `Self`)

**Description:** List lượt đăng ký gói. Self bắt buộc filter `memberId=self`.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `memberId` | string | Self bắt buộc | — | FK `members.member_id` |
| `status` | enum | no | — | `pending`, `active`, `expired`, `cancelled` |
| `page` | integer | no | 1 | — |
| `pageSize` | integer | no | 20 | max 100 |
| `sort` | string | no | `start_date:desc` | whitelist: `start_date`, `end_date`, `created_at` |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "subscriptionId": "12",
      "memberId": "5",
      "memberCode": "MEM-2026-000005",
      "packageId": "3",
      "packageName": "Gold 3 tháng",
      "startDate": "2026-05-01",
      "endDate": "2026-07-31",
      "status": "active",
      "cancelledAt": null,
      "createdAt": "2026-04-28T09:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Self không truyền `memberId=self` / truyền `memberId` khác |
| 403 | `MEMBER_PROFILE_NOT_FOUND` | Self token nhưng `jwt.sub` không có member profile (vd: staff user gọi endpoint với Self token). |

**Business rules:**

```text
WHEN role là Self
THEN bắt buộc memberId param = self.member_id, fail → 403
ELSE Owner/Staff có thể list mọi member hoặc filter optional
```

**Note — Self token `member_id` resolution:**
`self.member_id` được lookup từ: `SELECT memberId FROM members WHERE userId = jwt.sub AND deletedAt IS NULL`. Nếu không tìm thấy member profile (ví dụ: staff user hoặc user không có member record) → 403 `MEMBER_PROFILE_NOT_FOUND`.

**Audit:** Không (GET).

---

### 4.1b GET /subscriptions/member/:memberId

**UC:** —
**Auth:** JWT
**RBAC:** `subscription.read`

**Description:** List tất cả subscription của 1 member cụ thể, truy vấn qua path param thay vì query param. Tiện lợi cho Staff/Owner khi xem subscription history của một member.

**Path param:** `memberId` = `member_id` (integer).

**Response 200 OK:** Cùng shape với GET /subscriptions.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không có `subscription.read` |
| 404 | `NOT_FOUND` | `memberId` không tồn tại |

**Audit:** Không (GET).

---

### 4.2 POST /subscriptions

**UC:** UC03A/B (purchase mới), UC04A (renewal)
**Auth:** JWT
**RBAC:** `subscription.create` (controller scope `memberId=self` khi caller role `member` cho UC04A self-renew; UC03B online self-register đi qua `/members/self-register` ở §3.4, không gọi trực tiếp endpoint này)

**Description:** Tạo subscription mới cho member. Xử lý cả purchase mới + renewal qua state member hiện tại. Subscription tạo ở `pending` (chờ payment); chuyển `active` khi `POST /payments` thành công (nếu `start_date <= today_vn`) hoặc cron daily 00:10 `subscription:activate-pending` (khi `start_date` đến).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | FK `members.member_id`, `status='active'`, `deleted_at IS NULL` |
| `packageId` | string | yes | FK `packages.package_id`, `status='active'`, `deleted_at IS NULL` |

```json
{ "memberId": "5", "packageId": "3" }
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "subscriptionId": "15",
    "memberId": "5",
    "packageId": "3",
    "startDate": "2026-08-01",
    "endDate": "2026-10-31",
    "status": "pending",
    "createdAt": "2026-05-17T10:30:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 400 | `FK_CONSTRAINT` | `memberId` / `packageId` không tồn tại |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Member gọi với `memberId` không phải self (OwnershipGuard) |
| 403 | `EMAIL_NOT_VERIFIED` | Self/member caller và member chưa verify email. Staff/Owner bypass (UC03A counter registration). |
| 409 | `SUBSCRIPTION_ALREADY_PENDING` | Member đã có subscription `pending` (chưa pay) |

**Business rules:**

```text
WHEN jwt.role = 'member'
  AND body.memberId != (SELECT memberId FROM members WHERE userId = jwt.sub)
THEN 403 FORBIDDEN (member chỉ được tạo subscription cho chính mình; counter registration dùng staff token)
ELSE proceed

WHEN jwt.role NOT IN ('owner', 'staff') AND member.users.email_verified_at IS NULL
THEN 403 EMAIL_NOT_VERIFIED
(chỉ áp dụng Self/member caller — Staff/Owner bypass để hỗ trợ UC03A counter registration
 khi member mới tạo tại quầy chưa kịp verify email)
ELSE proceed

WHEN tồn tại subscriptions WHERE member_id=? AND status='pending'
THEN 409 SUBSCRIPTION_ALREADY_PENDING (member phải pay pending hiện tại hoặc cancel trước khi tạo mới)
ELSE proceed

WHEN tồn tại subscriptions WHERE member_id=? AND status='active'
THEN renewal flow: start_date = activeSubscription.end_date + 1 day, end_date = start_date + package.durationDays - 1
ELSE new purchase flow: start_date = today_vn, end_date = today_vn + package.durationDays - 1

ALWAYS INSERT subscriptions (status='pending', start_date, end_date)
AND INSERT audit_logs (action = renewal ? 'subscription.renew' : 'subscription.create')
```

**Audit:** `subscription.create` (purchase mới) hoặc `subscription.renew` (renewal — phân biệt qua context có active subscription cùng member tại thời điểm INSERT). `after_data` = subscription shape.

**Notes:**

- Date arithmetic dùng `today_vn` (Architecture §4.5.2). `start_date = today_vn` hoặc `start_date = activeSubscription.end_date + 1 day` (date math, không phải datetime).
- `end_date = start_date + durationDays - 1` (inclusive). Vd package 30 ngày, start 2026-05-01 → end 2026-05-30.
- `pending` subscription chuyển `active` qua 2 path:
  - `POST /payments` success AND `start_date <= today_vn` → activate ngay trong cùng `$transaction` (xem §5.1).
  - Cron daily 00:10 `subscription:activate-pending` activate khi `start_date` đến (Architecture §5.2).
- Cron daily 00:15 `subscription:cancel-unpaid-pending` cancel `pending` sau 24-48h nếu vẫn `NOT EXISTS payments WHERE status='success'` (Architecture §5.2 + LOG-M03 phase 8).

---

### 4.3 PATCH /subscriptions/:id/cancel

**UC:** UC04B — Hủy gói
**Auth:** JWT
**RBAC:** `subscription.cancel` HOẶC `Self`

**Description:** Hủy subscription `active` hoặc `pending`. Nếu member có subscription `pending` đã thanh toán (prepaid renewal), activate ngay trong cùng `$transaction` (cascade — Architecture §4.3.3). Không refund v1.0.

**Path param:** `id` = `subscription_id`.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `reason` | string | no | `@MaxLength(500)` — lưu vào audit `before_data.reason` |

```json
{ "reason": "Member chuyển nơi ở" }
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "cancelledSubscription": {
      "subscriptionId": "12",
      "status": "cancelled",
      "cancelledAt": "2026-05-17T10:30:00.000Z"
    },
    "activatedSubscription": {
      "subscriptionId": "15",
      "status": "active",
      "startDate": "2026-05-17",
      "endDate": "2026-08-15"
    }
  }
}
```

`activatedSubscription` = null nếu không có pending prepaid để cascade.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại / soft-deleted / đã `cancelled`/`expired` (P2025 hoặc filter no match) |
| 409 | `SUBSCRIPTION_NOT_CANCELLABLE` | Subscription `status` không phải `active` hoặc `pending` |

**Business rules:**

```text
WHEN NOT EXISTS (SELECT 1 FROM subscriptions WHERE subscriptionId = :id AND deletedAt IS NULL AND status NOT IN ('cancelled', 'expired'))
THEN 404 NOT_FOUND (subscription không tồn tại / soft-deleted / đã cancelled hoặc expired)
ELSE proceed

WHEN jwt.role NOT IN ('owner', 'staff')
  AND (SELECT m.userId FROM subscriptions s
       JOIN members m ON s.memberId = m.memberId
       WHERE s.subscriptionId = :id) != jwt.sub
THEN 403 FORBIDDEN (OwnershipGuard — member cancel subscription không phải của mình)
ELSE proceed

WHEN subscription.status NOT IN ('active', 'pending')
THEN 409 SUBSCRIPTION_NOT_CANCELLABLE
ELSE proceed

WHEN subscription.status = 'active' AND tồn tại subscriptions WHERE member_id=subscription.member_id AND status='pending' AND EXISTS payments WHERE subscription_id=pending.id AND status='success'
THEN cascade activate pending (Architecture §4.3.3)
ELSE chỉ cancel, KHÔNG activate

ALWAYS $transaction(
  UPDATE subscriptions SET status='cancelled', cancelled_at=NOW() WHERE id=:id;
  IF cascade THEN UPDATE pending SET status='active', start_date=today_vn, end_date=today_vn + package.durationDays - 1;
  INSERT audit_logs (action='subscription.cancel');
  IF cascade THEN INSERT audit_logs (action='subscription.activate')
)
```

**Audit:** `subscription.cancel` với `before_data` = subscription trước, `after_data` = subscription sau. Nếu cascade: thêm 1 audit row `subscription.activate` với `details.activated_from = 'cascade_cancel'` (Architecture §4.4.1 v1.1.4 đã có code này).

**Notes:**

- Race condition: 2 user concurrent cancel cùng `active` → lần 2 nhận P2025 (Architecture §4.3.2). Filter map → 404. Không dùng `SELECT FOR UPDATE` v1.0.
- `today_vn` cho `start_date` recompute khi cascade — không giữ `start_date` cũ của pending vì gói cũ kết thúc sớm hơn dự kiến.
- `package.durationDays` trong cascade activate lấy từ `packages` JOIN qua `pending.packageId`. Nếu package đã bị soft-deleted (`packages.deletedAt IS NOT NULL`), vẫn có thể JOIN vì subscription đang active vẫn giữ FK valid. Nếu package hoàn toàn không tồn tại (hard delete — không xảy ra trong hệ thống này vì packages chỉ soft-delete), dùng `pending.end_date - pending.start_date + 1` làm fallback duration.

---

### 4.4 POST /subscriptions/:id/renew

**UC:** UC04A — Gia hạn gói tập
**Auth:** JWT
**RBAC:** `subscription.create`

**Description:** Gia hạn subscription hiện tại — tạo subscription mới kế tiếp cùng member. Subscription mới bắt đầu ngay sau `end_date` của subscription hiện tại. Trả về 200 OK (không phải 201) vì là action trên resource đã tồn tại.

**Path param:** `id` = `subscription_id` (integer).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `method` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `transactionReference` | string | no | optional |

```json
{ "method": "cash" }
```

**Response 200 OK:** Trả subscription mới được tạo.

```json
{
  "success": true,
  "data": {
    "subscriptionId": "16",
    "memberId": "5",
    "packageId": "3",
    "startDate": "2026-08-01",
    "endDate": "2026-10-29",
    "status": "pending",
    "createdAt": "2026-06-19T10:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không có `subscription.create` |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại |

**Audit:** `subscription.renew`.

---

### 4.5 GET /subscriptions/:id

**UC:** —
**Auth:** JWT
**RBAC:** `subscription.read` HOẶC `Self`

**Description:** Lấy chi tiết 1 subscription. Self check qua `subscription.member.user_id = jwt.sub`.

**Path param:** `id` = `subscription_id`.

**Response 200 OK:** Cùng shape item của §4.1 + thêm field `package` expanded:

```json
{
  "success": true,
  "data": {
    "subscriptionId": "12",
    "memberId": "5",
    "memberCode": "MEM-2026-000005",
    "package": {
      "packageId": "3",
      "packageCode": "PKG-0003",
      "name": "Gold 3 tháng",
      "durationDays": 90,
      "price": "3000000.00"
    },
    "startDate": "2026-05-01",
    "endDate": "2026-07-29",
    "status": "active",
    "cancelledAt": null,
    "createdAt": "2026-04-28T09:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | OwnershipGuard reject |
| 404 | `NOT_FOUND` | `subscription_id` không tồn tại / soft-deleted |

**Audit:** Không (GET).

---

## 5. Payments

### 5.1 POST /payments

**UC:** UC03A/B, UC04A — Ghi nhận thanh toán
**Auth:** JWT
**RBAC:** `payment.create`

**Description:** Staff ghi nhận thanh toán cho subscription `pending`. Nếu `status='success'` AND subscription `start_date <= today_vn` AND không có subscription `active` đang chiếm slot → activate ngay (cùng `$transaction`). Ngược lại giữ `pending`, cron daily 00:10 activate khi `start_date` đến.

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `memberId` | string | yes | FK `members.member_id` |
| `subscriptionId` | string | yes | FK `subscriptions.subscription_id`, `status='pending'` |
| `amount` | string (decimal) | yes | `> 0`, không phần thập phân khác 0 (VND integer) |
| `method` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `transactionReference` | string | conditional | UNIQUE; required khi `method != 'cash'`; nullable khi `method='cash'` |
| `status` | enum | no | `success` (default), `failed` |

```json
{
  "memberId": "5",
  "subscriptionId": "12",
  "amount": "3000000.00",
  "method": "bank_card",
  "transactionReference": "VPB-20260517-0001",
  "status": "success"
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "paymentId": "33",
    "memberId": "5",
    "subscriptionId": "12",
    "amount": "3000000.00",
    "method": "bank_card",
    "transactionReference": "VPB-20260517-0001",
    "status": "success",
    "paidAt": "2026-05-17T10:30:00.000Z",
    "subscription": {
      "subscriptionId": "12",
      "status": "active",
      "startDate": "2026-05-17",
      "endDate": "2026-08-14"
    }
  }
}
```

`subscription.status` trả `active` nếu activate ngay, `pending` nếu chờ cron.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format / amount không match `package.price` ± rounding (validate optional, defer khi cần discount logic) |
| 400 | `FK_CONSTRAINT` | `memberId` / `subscriptionId` không tồn tại |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Role không phải Staff/Owner |
| 409 | `DUPLICATE_VALUE` | `transactionReference` đã tồn tại (P2002) |
| 409 | `SUBSCRIPTION_NOT_PENDING` | `subscription.status != 'pending'` |

**Business rules:**

```text
WHEN method != 'cash' AND transactionReference rỗng
THEN 400 VALIDATION_ERROR
ELSE proceed

WHEN method = 'cash'
THEN transactionReference có thể NULL — accept double-charge risk (conventions §13)
ELSE transactionReference UNIQUE check

WHEN subscription.status != 'pending'
THEN 409 SUBSCRIPTION_NOT_PENDING
ELSE proceed

WHEN status='success' AND subscription.start_date <= today_vn AND không có member subscription khác status='active'
THEN $transaction(
  INSERT payments;
  UPDATE subscriptions SET status='active';
  INSERT audit_logs (action='payment.success');
  INSERT audit_logs (action='subscription.create' với note 'activated by payment')
)
ELSE WHEN status='success'
THEN $transaction(INSERT payments; INSERT audit_logs (action='payment.success'))
  AND subscription giữ pending, chờ cron daily 00:10 activate khi start_date đến

WHEN status='failed'
THEN $transaction(INSERT payments; INSERT audit_logs (action='payment.fail'))
  AND subscription giữ pending; cron daily 00:15 sẽ cancel sau 24-48h nếu không có payment success khác
```

**Audit:** `payment.success` hoặc `payment.fail`. `after_data` mask `transactionReference` ở UI listing (giữ full trong DB cho reconciliation).

**Idempotency:** UNIQUE `transaction_reference` (Database.md). Duplicate → 409 (conventions §13). `method='cash'` không có reference — accept double-charge risk, mitigate qua audit log review.

**Notes:**

- `amount` validate `> 0` (Database.md CHECK constraint).
- Composite index `(subscription_id, status)` trên `payments` defer khi build (Architecture §5.2 LOG-M07 phase 8) — chưa có trong Prisma schema v1.0.
- Activation logic phối hợp với cron `subscription:activate-pending` (Architecture §5.2). Sau commit, cron check `EXISTS payments WHERE subscription_id=? AND status='success'` — nếu hit và `start_date <= today_vn`, activate.

---

### 5.2 GET /payments

**UC:** —
**Auth:** JWT
**RBAC:** `payment.read` HOẶC `Self` (`memberId=self` bắt buộc khi chỉ có `Self`)

**Description:** List payments. Self bắt buộc `memberId=self`. Filter theo subscription / status / date range.

**Query params:**

| Param | Type | Required | Default | Constraint |
|---|---|---|---|---|
| `memberId` | string | Self bắt buộc | — | FK |
| `subscriptionId` | string | no | — | FK |
| `status` | enum | no | — | `success`, `failed` |
| `method` | enum | no | — | `cash`, `bank_card`, `ewallet` |
| `from` | string (ISO date) | no | — | filter `paid_at >= from` |
| `to` | string (ISO date) | no | — | filter `paid_at <= to` |
| `page` | integer | no | 1 | — |
| `pageSize` | integer | no | 20 | max 100 |
| `sort` | string | no | `paid_at:desc` | whitelist: `paid_at`, `amount` |

**Response 200 OK:**

```json
{
  "success": true,
  "data": [
    {
      "paymentId": "33",
      "memberId": "5",
      "subscriptionId": "12",
      "amount": "3000000.00",
      "method": "bank_card",
      "transactionReference": "VPB-20260517-0001",
      "status": "success",
      "paidAt": "2026-05-17T10:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "totalItems": 4, "totalPages": 1 }
}
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 403 | `FORBIDDEN` | Self không truyền `memberId=self` / truyền `memberId` khác |

**Audit:** Không (GET).

---

## 5b. Payment Accounts

Payment Accounts được xử lý bởi `PaymentAccountsController` trong `server/src/payments/payments.controller.ts`. Controller này dùng root-level prefix, các route gắn với `members/:memberId/payment-accounts`.

**Auth:** JWT
**RBAC:** `Self` (member đang đăng nhập có `memberId` khớp với param) HOẶC staff/owner role. Không dùng `@RequirePermission` — access control thực hiện qua `assertAccess()` private method trong controller (check `user.memberId === memberId` hoặc `user.roles` gồm `staff`/`owner`).

### 5b.1 GET /members/:memberId/payment-accounts

**Description:** Lấy danh sách tài khoản thanh toán của member.

**Path param:** `memberId` = member ID (integer).

**Response 200 OK:**

```json
[
  {
    "id": 1,
    "memberId": "5",
    "type": "bank_card",
    "provider": "Vietcombank",
    "accountRef": "****1234",
    "label": "Thẻ chính",
    "isDefault": true
  }
]
```

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self và không phải staff/owner |

---

### 5b.2 POST /members/:memberId/payment-accounts

**Description:** Tạo tài khoản thanh toán mới cho member.

**Path param:** `memberId` = member ID (integer).

**Request body:**

| Field | Type | Required | Constraint |
|---|---|---|---|
| `type` | enum | yes | `cash`, `bank_card`, `ewallet` |
| `provider` | string | no | `@Length(0, 100)` |
| `accountRef` | string | no | `@Length(0, 100)` |
| `label` | string | no | `@Length(0, 100)` |
| `isDefault` | boolean | no | — |

```json
{ "type": "bank_card", "provider": "Vietcombank", "accountRef": "1234567890", "label": "Thẻ chính", "isDefault": true }
```

**Response 201 Created:** Trả payment account object vừa tạo.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body sai format |
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self và không phải staff/owner |

---

### 5b.3 PATCH /members/:memberId/payment-accounts/:accountId

**Description:** Đặt tài khoản thanh toán làm default. Action duy nhất là set default — không update các field khác.

**Path params:**
- `memberId` = member ID (integer)
- `accountId` = payment account ID (integer)

**Response 200 OK:** Trả payment account object sau update.

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self/staff/owner hoặc `accountId` không tồn tại |

---

### 5b.4 DELETE /members/:memberId/payment-accounts/:accountId

**Description:** Xóa tài khoản thanh toán.

**Path params:**
- `memberId` = member ID (integer)
- `accountId` = payment account ID (integer)

**Response 204 No Content.**

**Errors:**

| Status | Code | Khi nào |
|---|---|---|
| 401 | `UNAUTHORIZED` | JWT thiếu |
| 404 | `NOT_FOUND` | Caller không phải Self/staff/owner hoặc `accountId` không tồn tại |

---

## 6. Domain Error Codes

Codes specific cho Module 4 (ngoài standard codes ở `conventions.md §6`):

| Code | HTTP | Trigger |
|---|---|---|
| `MEMBER_CODE_GENERATION_FAILED` | 500 | Retry 5 lần sinh `member_code` đều collision |
| `MEMBER_PROFILE_NOT_FOUND` | 403 | Self token nhưng `jwt.sub` không có member record (user chưa có profile member hoặc member đã xóa). |
| `EMAIL_NOT_VERIFIED` | 403 | Self/member caller và member chưa verify email. Staff/Owner bypass (UC03A counter registration). |
| `SUBSCRIPTION_ALREADY_PENDING` | 409 | Tạo subscription mới khi member còn `pending` chưa pay |
| `SUBSCRIPTION_NOT_CANCELLABLE` | 409 | Cancel subscription có `status` ngoài (`active`, `pending`) |
| `SUBSCRIPTION_NOT_PENDING` | 409 | Tạo payment cho subscription không ở `status='pending'` |

## 7. Cross-Module References

- **Module 3 Package (stub):** `POST /subscriptions` body có `packageId` → validate FK `packages.package_id` với `status='active'` AND `deleted_at IS NULL`. Module 3 Package CRUD chưa spec; frontend tạm truy vấn raw Prisma hoặc dùng seed data. Khi Module 3 spec hoàn chỉnh, FK validation refactor sang dùng service injection.
- **Module 5 Staff (stub):** `PATCH /members/:id/assign-trainer` body có `trainerId` → validate FK `staff.staff_id` với `position='pt'` AND `deleted_at IS NULL`. Module 5 Staff CRUD chưa spec.
- **Module 7 Training (stub):** `POST /members/me/progress` (§3.0e) cho member tự ghi chỉ số cơ bản (cân nặng, chiều cao). `GET /members/:id/progress` và POST progress do Staff/Trainer ghi defer Module 7 vì gắn với training session diary.
- **Module 2 RBAC:** RBAC column dùng permission code notation từ `seed.ts` (`member.read`, `subscription.cancel`, v.v.) theo `conventions.md §4`. Module 2 đã spec đầy đủ (phase 10).

## 8. Implementation Status

Toàn bộ 24 endpoint **đã implement**. Controllers:

- `server/src/members/members.controller.ts` — 12 routes
- `server/src/membership/subscriptions/subscriptions.controller.ts` — 6 routes
- `server/src/payments/payments.controller.ts` — 2 routes (`PaymentsController`) + 4 routes (`PaymentAccountsController`)

Prisma schema thêm khi build:

- Composite index `@@index([subscriptionId, status])` trên `payments` (Architecture §5.2 LOG-M07).
- `@@index([memberId, status])` trên `subscriptions` (filter by member + status).

## 9. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-05-17 | Lê Thanh An | Initial draft — 14 endpoint chia 3 resource (Members 8 + Subscriptions 4 + Payments 2). |
| 1.0.1 | 2026-05-18 | Lê Thanh An | Phase 11 RBAC retrofit: thay role notation cũ (`Owner, Staff, PT-if-primary, Self`) bằng permission code từ `seed.ts` (`member.read` / `member.create` / `member.update` / `member.delete` / `subscription.read` / `subscription.create` / `subscription.cancel` / `payment.read` / `payment.create` / `progress.read`) + special token `Self` / `PT-if-primary` / `Public`. Mapping theo `conventions.md §4.2` (phase 11 update). Ghi chú sai lệch (đã sửa v1.0.2): `subscription.cancel` thực tế đã có trong `seed.ts:44` từ trước — không phải gap mới. |
| 1.0.2 | 2026-05-22 | Lê Thanh An | Phase 12 doc-review: xóa stale gap note `subscription.cancel` khỏi §3.11 RBAC cell + endpoint inventory row 11 (code đã có trong seed.ts:44, verified 2026-05-22). Update §7 Cross-Module References: bỏ stale RBAC notation guidance. |
| 1.0.3 | 2026-05-22 | Lê Thanh An | LOG-C001: Integrate OwnershipGuard vào §4.3 WHEN-THEN-ELSE — ownership check là WHEN branch đầu tiên. LOG-M003: Thêm ownership check đầu §4.2 WHEN-THEN-ELSE — member chỉ tạo subscription cho chính mình; sửa 403 error description. |
| 1.0.4 | 2026-05-22 | Lê Thanh An | §4.3 thêm WHEN NOT EXISTS 404 check trước ownership guard — guard explicit 404 khi subscription soft-deleted/cancelled/expired. |
| 1.0.5 | 2026-05-22 | Lê Thanh An | LOG-M005: §4.3 Audit + Notes — resolve subscription.activate audit drift (Architecture v1.1.4 confirmed, xóa drift flag). LOG-M006: §4.1 thêm Note Self member_id resolution join path + 403 MEMBER_PROFILE_NOT_FOUND error case. |
| 1.0.6 | 2026-05-22 | Lê Thanh An | LOG-M009: §4.2 EMAIL_NOT_VERIFIED check thêm caller role condition (Staff/Owner bypass cho UC03A counter registration). LOG-M010: §4.3 Notes clarify package.durationDays source trong cascade activate. LOG-m002: §6 thêm MEMBER_PROFILE_NOT_FOUND vào Domain Error Codes table. |
| 1.1.0 | 2026-06-19 | Lê Thanh An | Sync với controllers thực tế. Thêm 5 self-service member endpoints (GET/PATCH /members/me, GET /members/me/trainers, PATCH /members/me/trainer, POST /members/me/progress). Thêm POST /members/self-register đã có trong doc. Thêm GET /subscriptions/member/:memberId, POST /subscriptions/:id/renew. Thêm section 5b Payment Accounts (4 routes). Xóa phantom GET /members/:id/progress (không có trong controller). Fix DTO fields POST /members (thêm packageId, paymentMethod; fix password length constraint). Fix DTO fields POST /members/self-register (phone optional, address optional). Cập nhật scope count 14→24. |
