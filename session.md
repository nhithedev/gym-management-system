# Session Progress

## Công việc được giao
Hoàn thiện phần **Staff** cho hệ thống Gym Management — UX/UI + nối API thực.

---

## Đã hoàn thành

### Service files (mới tạo)
- [x] `client/src/services/member.service.ts` — CRUD hội viên (list, get, create, update, delete)
- [x] `client/src/services/facility.service.ts` — Rooms CRUD + Equipment CRUD + Maintenance logs
- [x] `client/src/services/feedback.service.ts` — list, get, create, assign, updateStatus

### Staff pages (đã cập nhật)
- [x] `client/src/pages/staff/DashboardPage.tsx`
  - Fetch stats thật từ 3 API song song (Promise.allSettled)
  - Hiển thị: hội viên active, thiết bị hỏng, feedback chờ xử lý
  - Quick action cards navigate đến từng sub-page
  - Loading state + fallback "—" khi API lỗi

- [x] `client/src/pages/staff/MembersPage.tsx`
  - Gọi GET /members với search + filter trạng thái + pagination
  - Modal đăng ký hội viên mới (POST /members): form đầy đủ, chọn gói tập, phương thức thanh toán
  - Table: mã HV, họ tên, phone, email, trạng thái, ngày tham gia
  - Pagination ChevronLeft/Right + tổng số hội viên

- [x] `client/src/pages/staff/FacilityPage.tsx`
  - Gọi GET /rooms với search
  - Master-detail layout: bảng trái + chi tiết phải
  - Modal thêm phòng (POST /rooms)
  - Modal sửa phòng (PATCH /rooms/:id)
  - Modal xác nhận xoá (DELETE /rooms/:id)

---

## Còn lại (chưa làm)

- [x] `client/src/pages/staff/EquipmentPage.tsx` — HOÀN THÀNH
  - Gọi GET /equipment với filter status + search + pagination
  - Master-detail: bảng + chi tiết + maintenance logs
  - Modal báo hỏng → POST /equipment/:id/maintenance-logs
  - Cập nhật trạng thái bảo trì → PATCH /maintenance-logs/:id
  - Badge status: active/broken/repairing/retired

- [x] `client/src/pages/staff/FeedbackPage.tsx` — HOÀN THÀNH
  - Gọi GET /feedback với filter status + pagination
  - Tab filter: Tất cả / Chờ / Đang xử lý / Đã xử lý / Từ chối
  - Chi tiết + SLA badge (overdue = đỏ)
  - Tiếp nhận → PATCH /feedback/:id/assign
  - Giải quyết (+ resolutionNote) → PATCH /feedback/:id/status resolved
  - Từ chối (+ lý do) → PATCH /feedback/:id/status rejected

- [x] Fix pre-existing TS error: `MembersPage.tsx` import `packageService` as default export

## Ghi chú kỹ thuật bổ sung
- TypeScript build: 0 lỗi sau khi hoàn thành
- Chưa chạy npm run dev để verify e2e — cần test sau khi server + client đang chạy

---

## Lưu ý kỹ thuật
- Backend FacilityModule + FeedbackModule đã import vào app.module.ts — API tồn tại
- server/.env đã cấu hình Supabase (password encode @ → %40)
- Chưa chạy npm run dev để verify — cần test sau khi xong 2 page còn lại
- ProfilePage.tsx đã dùng authService.me() thực — không cần sửa
