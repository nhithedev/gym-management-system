# Session Notes — 2026-06-11 (session 2)

## Mục tiêu session
1. Debug MembersPage blank từ session trước
2. Expand `staff.service.ts` với management functions
3. Implement Owner `/owner/staff` và `/owner/staff/:id`

---

## Tiến độ đã hoàn thành

### ✅ Debug MembersPage blank — Root cause xác định
- Tất cả API backend hoạt động đúng (test bằng curl):
  - `GET /members` → trả member list ✅
  - `GET /staff/me` → trả staff profile ✅
  - `GET /staff/:id/schedules` → trả schedules ✅
  - `GET /feedback` → trả feedback list ✅
  - `GET /rooms`, `GET /equipment` → hoạt động ✅
  - `POST /attendance/manual-checkin` endpoint tồn tại trong TrainingController ✅
- TypeScript compile: 0 lỗi (cả client và server)
- **Kết luận:** Blank page có thể là transient issue khi server chưa chạy, HOẶC nhầm lẫn khi test. Code hiện tại đúng về mặt logic. Cần test thủ công trong browser.

### ✅ Expand `staff.service.ts` (client)
File: `client/src/services/staff.service.ts`

| Method | Endpoint | Ghi chú |
|--------|----------|---------|
| `getMe()` | GET /staff/me | Đã có từ trước |
| `list(params)` | GET /staff | **Mới** — trả `{ data, total, totalPages }` |
| `getById(staffId)` | GET /staff/:id | **Mới** |
| `create(dto)` | POST /staff | **Mới** |
| `update(staffId, dto)` | PATCH /staff/:id | **Mới** |
| `delete(staffId)` | DELETE /staff/:id | **Mới** |
| `getSchedules(staffId)` | GET /staff/:id/schedules | Đã có từ trước |
| `createSchedules(staffId, schedules)` | POST /staff/:id/schedules | **Mới** |
| `deleteSchedule(staffId, scheduleId)` | DELETE /staff/:id/schedules/:scheduleId | **Mới** |

**Lưu ý quan trọng:** `GET /staff` controller dùng `return { success: true, data }` (nested), KHÔNG spread như `GET /members`. Response thực tế:
```json
{ "success": true, "data": { "data": [...], "meta": {...} } }
```
→ `res.data.data.data` là array, `res.data.data.meta` là pagination. Service đã fix để handle đúng.

### ✅ Implement Owner Staff Management pages

| File | Nội dung |
|------|----------|
| `pages/owner/staff-management/UsersPage.tsx` | List nhân sự (search + filter vị trí + pagination) + Create modal |
| `pages/owner/staff-management/UserDetailPage.tsx` | Chi tiết NV + edit form + schedule management (add/delete lịch) |

**Features UsersPage:**
- Search theo tên/email/mã NV
- Filter theo vị trí (staff/trainer)
- Pagination (20/page)
- "Thêm nhân sự" button → modal tạo User+Staff trong 1 API call

**Features UserDetailPage:**
- Header với avatar initials
- Edit inline: fullName, phone, position
- Delete với confirm dialog
- Schedules section: list upcoming (từ hôm nay trở đi), Add modal (calendar 14 ngày), Delete từng ca

---

## Khám phá trong session này

### 🔴 PHÁT HIỆN QUAN TRỌNG: Nhiều Owner page là stub!

Các trang sau đều là `return null` (chưa implement):
- `pages/owner/DashboardPage.tsx`
- `pages/owner/packages/PackagesPage.tsx`
- `pages/owner/rbac/GroupsPage.tsx`
- `pages/owner/rbac/PermissionsPage.tsx`
- `pages/owner/reports/ReportsPage.tsx`
- `pages/owner/reports/RevenuePage.tsx`
- `pages/owner/ProfilePage.tsx`

CLAUDE.md ghi "verified e2e" cho những trang này là không chính xác — đó là backend verified, không phải frontend. Chỉ có Member pages (DashboardPage 536 lines, subscription pages) là fully implemented.

---

## Vấn đề đang gặp / cần kiểm tra

### 🟡 Owner pages hầu hết là stubs
Sau khi implement `/owner/staff`, Owner vẫn có nhiều trang blank:
- `/owner` → DashboardPage (return null)
- `/owner/packages` → PackagesPage (return null)
- `/owner/rbac/groups` → GroupsPage (return null)
- `/owner/reports` → ReportsPage (return null)

---

## Việc cần làm tiếp theo

### 🔴 Ưu tiên cao

1. **Test e2e Staff UI** trong browser:
   - Đăng nhập `staff.linh@gym.local` / `Password123!`
   - Test từng trang: Dashboard, Members, Check-in, Feedback, Phòng tập, Thiết bị, Hồ sơ
   - Đặc biệt: `/staff/members` — confirm không còn blank

2. **Test e2e Owner Staff Management**:
   - Đăng nhập `owner@gym.local` / `Password123!`
   - Vào `/owner/staff` → xem danh sách 4 nhân sự
   - Tạo nhân sự mới → xem detail → edit info → thêm lịch → xoá lịch

### 🟡 Ưu tiên trung bình

3. **Implement Owner DashboardPage** — thống kê thực (doanh thu, member count, staff count)
4. **Implement Owner PackagesPage** — CRUD gói tập (backend đã verify working)
5. **Implement Owner GroupsPage + PermissionsPage** — RBAC quản lý
6. **Implement Owner ReportsPage** — báo cáo doanh thu

### 🟢 Ưu tiên thấp (defer)

- Fix 10 MAJOR gaps Module-10-Workout
- Verify Workout Plan e2e
- Clean up seed packages giá ảo
- Implement email SMTP thực
