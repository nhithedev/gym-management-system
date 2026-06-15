# Seed Data Plan

## Task: Bổ sung seed data cho gym-management-system

## Context

Project là một gym management system với backend NestJS + Prisma + PostgreSQL.
File seed hiện tại: `server/prisma/seed.ts` (2785 dòng).
Ngày hiện tại dùng làm mốc tính status: **2026-06-15**.

### Schema tóm tắt (các bảng liên quan)

```prisma
model User {
  userId       BigInt     @id @default(autoincrement())
  email        String     @unique @db.VarChar(255)
  phone        String?    @unique @db.VarChar(20)
  passwordHash String?
  fullName     String
  status       UserStatus  // active | locked | pending_verification
  createdAt    DateTime
  emailVerifiedAt DateTime?
  member       Member?
  staff        Staff?
  groups       UserGroup[]
}

model Member {
  memberId         BigInt  @id @default(autoincrement())
  userId           BigInt  @unique
  memberCode       String  @unique @db.VarChar(30)
  dateOfBirth      DateTime?
  address          String?
  primaryTrainerId BigInt?   // → Staff.staffId (trainer chính)
  subscriptions    Subscription[]
}

model Staff {
  staffId   BigInt  @id @default(autoincrement())
  userId    BigInt  @unique
  staffCode String  @unique @db.VarChar(30)
  position  String  // "owner" | "staff" | "trainer"
  schedules StaffSchedule[]
  managedSubscriptions Subscription[] @relation("SubscriptionTrainer")
  primaryForMembers    Member[]       @relation("MemberPrimaryTrainer")
}

model Package {
  packageCode  String         @unique
  name         String
  durationDays Int
  price        Decimal
  benefits     String?
  includesPt   Boolean        @default(false)
  status       PackageStatus  // active | inactive
}

model Subscription {
  subscriptionId BigInt             @id @default(autoincrement())
  memberId       BigInt
  packageId      BigInt
  trainerId      BigInt?            // → Staff.staffId, chỉ set khi Package.includesPt=true
  startDate      DateTime           @db.Date
  endDate        DateTime           @db.Date
  status         SubscriptionStatus // pending | active | expired | cancelled
  cancelledAt    DateTime?
}

model Payment {
  paymentId            BigInt        @id @default(autoincrement())
  memberId             BigInt
  subscriptionId       BigInt
  amount               Decimal
  method               PaymentMethod // cash | bank_card | ewallet
  status               PaymentStatus // success | failed
  transactionReference String?       @unique @db.VarChar(100)
  paidAt               DateTime
}

model GymRoom {
  roomId    BigInt  @id @default(autoincrement())
  roomCode  String  @unique @db.VarChar(30)
  name      String
  roomType  String?
  capacity  Int
  description String?
}

model Equipment {
  equipmentId   BigInt          @id @default(autoincrement())
  roomId        BigInt
  equipmentCode String          @unique @db.VarChar(30)
  name          String
  importDate    DateTime        @db.Date
  warrantyUntil DateTime?       @db.Date
  status        EquipmentStatus // active | broken | repairing | retired
}

model StaffSchedule {
  scheduleId BigInt     @id @default(autoincrement())
  staffId    BigInt
  shift      StaffShift // morning | afternoon | evening
  workDate   DateTime   @db.Date
  deletedAt  DateTime?
}
```

### Seed hiện tại đã có (KHÔNG xóa, chỉ bổ sung)

- 1 owner: `owner@gym.local` / STF-OWN-001
- 2 trainer: `trainer.minh@gym.local` (STF-PT-001), `trainer.huong@gym.local` (STF-PT-002)
- 1 staff: `staff.linh@gym.local` (STF-STA-001)
- 16 member: MB-2026-0001 đến MB-2026-0016
- 5 package: PKG-0001 đến PKG-0005 (PKG-0005 có includesPt=true nhưng inactive)
- 3 phòng: ROOM-001 (cardio), ROOM-002 (weights), ROOM-003 (multipurpose)
- 18 thiết bị: EQP-C001..C006, EQP-W001..W011, EQP-Y001..Y002
- 18 subscription + payment tương ứng
- 19 staff schedules cho 3 staff trên
- Training sessions, attendance logs, feedback, workout plans, member progress

---

## Yêu cầu bổ sung

### A. Package (thêm mới)

Thêm **3 package active có PT** để dùng cho subscription của 40 member có trainer:

- PKG-0006: "Gói PT Cá Nhân 1 Tháng", durationDays=30, price=1_500_000, includesPt=true, active
- PKG-0007: "Gói PT Cá Nhân 3 Tháng", durationDays=90, price=3_800_000, includesPt=true, active
- PKG-0008: "Gói PT Cá Nhân 6 Tháng", durationDays=180, price=6_500_000, includesPt=true, active

### B. User + Staff + Member (thêm mới)

Thêm **97 user mới** (tổng cộng với 4 user hiện tại = 101):
- **15 trainer** mới: position="trainer", staffCode dạng STF-PT-003..STF-PT-017
- **15 staff** mới: position="staff", staffCode dạng STF-STA-002..STF-STA-016
- **70 member** mới: memberCode dạng MB-2026-0017..MB-2026-0086

**Quy tắc sinh User:**
- email: dạng `{tên}.{họ}.{số}@gym.local` (ví dụ: `an.nguyen.017@gym.local`)
- phone: dạng `09XXXXXXXX`, số duy nhất, bắt đầu từ `0912000001` tăng dần
- fullName: tên Việt Nam thực tế, đa dạng, không dùng ký tự đặc biệt trong email
- passwordHash: bcrypt của "Password123!" (tái sử dụng hash đã tính sẵn trong seed)
- status phân bổ cho 97 user mới: 82 active, 10 pending_verification, 5 locked
- emailVerifiedAt: null nếu status=pending_verification, ngược lại = createdAt
- createdAt: trải đều từ 2026-01-05 đến 2026-06-10

**Quy tắc sinh Staff (15 trainer + 15 staff):**
- Trainer: role='trainer', gán vào group 'trainer'
- Staff: role='staff', gán vào group 'staff'

**Quy tắc sinh Member (70 member mới):**
- dateOfBirth: tuổi từ 18 đến 55, đa dạng
- address: địa chỉ TP.HCM thực tế, đa dạng quận
- **40 member đầu (MB-2026-0017..MB-2026-0056)**: sẽ có subscription với trainer
  - primaryTrainerId: phân bổ theo bảng trainer workload bên dưới
- **30 member còn lại (MB-2026-0057..MB-2026-0086)**: không có trainer
  - primaryTrainerId: null

**Phân bổ trainer workload (40 subscription có trainer cho 15 trainer mới):**
- STF-PT-003..STF-PT-007 (5 trainer): mỗi người phụ trách **5 member** (tổng 25)
- STF-PT-008..STF-PT-012 (5 trainer): mỗi người phụ trách **2 member** (tổng 10)
- STF-PT-013..STF-PT-017 (5 trainer): mỗi người phụ trách **1 member** (tổng 5)
- Tổng: 25 + 10 + 5 = 40 member có trainer ✓
- Trainer STF-PT-001 và STF-PT-002 (đã có) giữ nguyên member hiện tại

### C. GymRoom (thêm mới)

Thêm **7 phòng mới** (tổng với 3 phòng hiện tại = 10):

| roomCode | name | roomType | capacity |
|---|---|---|---|
| ROOM-004 | Phòng Yoga & Thiền | yoga | 20 |
| ROOM-005 | Phòng Functional Training | functional | 15 |
| ROOM-006 | Phòng Group Class | group_class | 25 |
| ROOM-007 | Phòng Spinning | spinning | 20 |
| ROOM-008 | Phòng Calisthenics | calisthenics | 12 |
| ROOM-009 | Phòng Phục Hồi Chức Năng | rehabilitation | 10 |
| ROOM-010 | Phòng VIP PT | vip_pt | 6 |

### D. Equipment (thêm mới)

Thêm **22 thiết bị mới** (tổng với 18 hiện tại = 40).
Phân bổ cho 7 phòng mới (ROOM-004..ROOM-010), ít nhất 2 thiết bị mỗi phòng.
Phân bổ status: 16 active, 3 repairing, 2 broken, 1 retired.
equipmentCode dạng `EQP-R4-001`, `EQP-R5-001`, ... theo số phòng.
Đa dạng warrantyUntil: một số hết bảo hành (trước 2026-06-15), một số còn bảo hành, một số null.

### E. Subscription + Payment (thêm mới)

Cần tạo subscription cho **tất cả 70 member mới** (MB-2026-0017..MB-2026-0086) và bổ sung thêm lịch sử cho một số member.

**Tổng cần tạo: ~85 subscription mới**

**Phân bổ cho 40 member có trainer (MB-2026-0017..MB-2026-0056):**
- Mỗi member có **1 subscription active** với package có PT (PKG-0006, PKG-0007, hoặc PKG-0008)
  - trainerId = staffId của trainer được phân bổ
  - startDate: trong khoảng 2026-01-01 đến 2026-06-01 (tính sao cho endDate ≥ 2026-06-15)
  - status: active
- **10 member trong số này** (bất kỳ 10 trong 40) có thêm **1 subscription expired** từ trước
  - Package không có PT (PKG-0001, PKG-0002, hoặc PKG-0003)
  - trainerId: null
  - endDate < 2026-06-15
  - status: expired

**Phân bổ cho 30 member không có trainer (MB-2026-0057..MB-2026-0086):**
- 20 member: **1 subscription active** với package không có PT (PKG-0001..PKG-0004)
  - trainerId: null
  - startDate + durationDays → endDate ≥ 2026-06-15
  - status: active
- 5 member: **1 subscription expired**
  - endDate < 2026-06-15, status: expired
- 3 member: **1 subscription cancelled**
  - cancelledAt được set, status: cancelled
- 2 member: **1 subscription pending** (chưa thanh toán)
  - status: pending, không có payment

**Payment:** Tạo 1 payment per subscription, NGOẠI TRỪ subscription có status=pending.
- PaymentMethod: phân bổ đều cash/bank_card/ewallet
- PaymentStatus: success
- transactionReference: dạng `TXN-{YYYYMMDD}-{số thứ tự 4 chữ số}` — PHẢI unique
- paidAt: cùng ngày với startDate của subscription

**Ràng buộc bắt buộc:**
- `endDate = startDate + durationDays của Package tương ứng` (tính chính xác theo ngày)
- `status=active` → `startDate ≤ 2026-06-15 ≤ endDate`
- `status=expired` → `endDate < 2026-06-15`
- `Subscription.trainerId != null` → `Package.includesPt = true`
- `Subscription.trainerId = null` → package không có PT

### F. StaffSchedule (thêm mới)

Thêm lịch cho **15 trainer mới + 15 staff mới** (STF-PT-003..STF-PT-017 và STF-STA-002..STF-STA-016).
Seed hiện tại đã có lịch cho STF-STA-001, STF-PT-001, STF-PT-002 — **không xóa**, chỉ append.

**Tạo lịch 2 tuần (2026-06-16 đến 2026-06-27, bỏ ngày Chủ nhật):**
- Mỗi trainer: lịch theo mẫu Mon/Wed/Fri = afternoon, Tue/Thu/Sat = morning
- Mỗi staff: lịch 5 ngày/tuần, xen kẽ morning và afternoon, một số ca evening
- Phân bổ đủ cả 3 shift (morning/afternoon/evening) qua tất cả staff

**Quy tắc đa dạng:**
- Không phải tất cả trainer đều có cùng một mẫu lịch
- Ít nhất 3 staff làm ca tối (evening) trong tuần
- Ít nhất 5 trainer không có lịch một số ngày (để test trường hợp rảnh lịch)

---

## Yêu cầu code

### Cấu trúc

Viết các hàm bổ sung vào `server/prisma/seed.ts`, **KHÔNG** thay đổi:
- Hàm `reset()`
- Các hàm và data arrays hiện tại
- Hàm `main()` — chỉ thêm lệnh gọi các hàm mới vào cuối main() trước phần đếm rows

Các hàm mới cần thêm:
1. `seedNewPackages(): Promise<Map<string, bigint>>`
2. `seedNewUsersStaffMembers(groupMap: Map<string, bigint>): Promise<{ trainerMap: Map<string, bigint>, memberMap: Map<string, bigint> }>`
3. `seedNewRoomsAndEquipment(): Promise<{ newRoomMap: Map<string, bigint> }>`
4. `seedNewSubscriptionsAndPayments(pkgMap: Map<string, bigint>): Promise<void>`
5. `seedNewStaffSchedules(): Promise<void>`

### Style code

- TypeScript, không dùng `any`
- Dùng `prisma.xxx.createMany()` cho bulk insert thay vì vòng lặp khi có thể
- Dùng `upsert` với `where: { uniqueField }` để idempotent
- Log `console.log('[seed] ...')` sau mỗi hàm với số bản ghi thực tế
- BigInt operations: dùng `Number(bigInt)` khi cần tính toán, không dùng `+` operator
- Không dùng random — tất cả data phải deterministic và reproducible

### Sinh tên và dữ liệu

Dùng mảng tĩnh (static arrays) để sinh tên, không dùng random. Ví dụ:

```typescript
const FIRST_NAMES = ['An', 'Bình', 'Chi', 'Dũng', 'Em', 'Phong', 'Giang', 'Huy', 'Ivy', 'Khánh',
  'Lan', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quân', 'Rồng', 'Sơn', 'Thảo', 'Uyên',
  'Vân', 'Xuân', 'Yến', 'Ánh', 'Bảo', 'Cường', 'Diễm', 'Đức', 'Hà', 'Hậu']

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']

// Ghép: LAST_NAMES[i % 16] + ' ' + MIDDLE + ' ' + FIRST_NAMES[i % 30]
```

Địa chỉ dùng mảng tĩnh ~20 địa chỉ TP.HCM thực tế, xoay vòng theo index.

Phone: bắt đầu từ `0912000001`, tăng dần theo index.

Email từ fullName: lowercase, bỏ dấu, dùng hàm replace thủ công (không import thêm package).

### Hàm helper cần implement

```typescript
function removeDiacritics(str: string): string {
  // Bảng map ký tự có dấu → không dấu cho tiếng Việt
  // Trả về string lowercase, chỉ a-z và khoảng trắng
}

function makeEmail(fullName: string, index: number): string {
  const parts = removeDiacritics(fullName).split(' ')
  return `${parts[parts.length - 1]}.${parts[0]}.${String(index).padStart(3, '0')}@gym.local`
}
```

---

## Deliverable

Toàn bộ code bổ sung dưới dạng **block TypeScript duy nhất** chứa:
1. Các constant arrays (tên, địa chỉ, v.v.)
2. Hàm helper `removeDiacritics`, `makeEmail`
3. 5 hàm seed mới kể trên
4. Đoạn thêm vào cuối `main()`:

```typescript
// Thêm vào cuối main(), trước phần đếm rows:
const newPkgMap = await seedNewPackages()
const { trainerMap, memberMap } = await seedNewUsersStaffMembers(groupMap)
await seedNewRoomsAndEquipment()
await seedNewSubscriptionsAndPayments(new Map([...packageMap, ...newPkgMap]))
await seedNewStaffSchedules()
```

Không viết lại toàn bộ file. Chỉ cung cấp phần bổ sung để paste vào trước hàm `main()`.

**Kiểm tra trước khi xuất:**
- Tất cả email unique (không trùng với email trong USERS + TRAINER_MINH_MEMBERS hiện tại)
- Tất cả phone unique (không trùng với dải `0900000001..0911000016`)
- Tất cả staffCode unique
- Tất cả memberCode unique
- transactionReference unique trong toàn bộ batch mới
- Không có subscription active nào có endDate < 2026-06-15
- Không có subscription với trainerId khi package.includesPt=false
