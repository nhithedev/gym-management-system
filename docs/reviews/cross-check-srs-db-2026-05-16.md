# Cross-Check Report — `SRS_VI.md` ↔ `Database.md`

- Date: 2026-05-16
- Method: manual cross-reference sau khi 2 pipeline review xong
- Mục đích: phát hiện drift giữa specification (SRS) và data design (Database) còn sót sau khi sync session 2026-05-16

---

## 1. Verification Table

| # | Concept | SRS Reference | Database Reference | Status |
|---|---|---|---|---|
| 1 | Enum `user_status` | SRS:498, SRS:510, SRS:1093 (UC00, UC13) — values `active`, `locked`, `pending_verification` | Database:310, 685 — `('pending_verification','active','locked')` | MATCH |
| 2 | Enum `subscription_status` | SRS:735 — `'cancelled'`; UC04 mention `pending/active` | Database:400, 696 — `('pending','active','expired','cancelled')` | MATCH (nhưng cả 2 cùng thiếu `paused` — xem DB-C05) |
| 3 | Enum `training_session_status` | SRS:476 (gián tiếp qua text) | Database:476, 697 — `('scheduled','in_progress','completed','cancelled')` | MATCH (cả 2 cùng thiếu `no_show` — xem DB-C06) |
| 4 | Enum `feedback_status` | SRS UC07 reference | Database:518, 693 — `('open','in_progress','resolved','rejected')` | MATCH |
| 5 | Enum `payment_method` | UC03A, UC04A reference | Database:418, 687 — `('cash','bank_card','ewallet')` | MATCH |
| 6 | Enum `payment_status` | UC03A reference | Database:419, 688 — `('success','failed')` | MATCH (cả 2 cùng thiếu `pending` cho async callback — xem DB-N05) |
| 7 | Enum `file_type` | SRS UC13/UC14 (avatar via UC03) | Database:577, 698 — `('avatar','document','equipment_doc')` | MATCH |
| 8 | Field `users.email_verified_at` | SRS:498, SRS:510, SRS:649, SRS:1103, SRS:1122 (UC00/UC03/UC13) | Database `users` table (DDL line 745+) | MATCH |
| 9 | Field `users.avatar_file_id` | SRS không reference trực tiếp; chỉ qua UC13 và §4.8 | Database:312, DDL line 1056-1060 (FK riêng ALTER TABLE) | PARTIAL — SRS chưa nói rõ workflow update avatar. Field tồn tại nhưng không có UC tương ứng. |
| 10 | Field `members.primary_trainer_id` | SRS:117 (Glossary), SRS:140 (Actor), SRS:615, SRS:755, SRS:821, SRS:827, SRS:838, SRS:843 (UC03A, UC05A, UC06) | Database:325, DDL line 771 (FK → `staff.staff_id`, `ON DELETE SET NULL`) | MATCH về semantic. DDL có forward-reference bug (xem DB-C04). |
| 11 | Field `subscriptions.cancelled_at` | SRS:735 (UC04B step 4) | Database `subscriptions` table | MATCH |
| 12 | Business rule: UC04 cancel không hoàn tiền | SRS §3.5.2 hậu điều kiện | Database không cần model (no refund table) | MATCH |
| 13 | Business rule: UC06 PT chỉ thấy member của mình | SRS:821, SRS:827, SRS:843 (filter `primary_trainer_id = self.staff_id`) | Database `members.primary_trainer_id` FK | MATCH |
| 14 | Business rule: UC13 verify-email cho cả UC03A và UC03B | SRS:649, SRS:1103 + Glossary §1.3 | Database `users.email_verified_at` + `otp_codes` (table mention only) | PARTIAL — Database không define schema `otp_codes` (xem DB-N10) |
| 15 | Convention: pagination 20/100 | SRS §4.9 line 1286 | Database không có convention API | OUT OF SCOPE — Database không cần document API; OK |
| 16 | Convention: datetime ISO 8601 UTC | SRS §4.9 line 1286 | Database TIMESTAMP without timezone (DDL toàn bộ) | DRIFT — SRS nói UTC, Database không document timezone; `CURRENT_DATE` ambiguous (xem SRS-M11, DB-M07) |
| 17 | Convention: soft delete (12 bảng) vs hard delete (9 bảng) | SRS UC10 "vô hiệu hóa vs xóa" (line 992) | Database:646-657 — "12 soft + 9 hard = 21 bảng" nhưng list hard có 10 mục gồm `otp_codes` | DRIFT — Database đếm không khớp với 21 bảng nghiệp vụ (xem DB-C03) |
| 18 | Business rule: design "time-based only", bỏ `session_limit` | SRS:803, SRS:996 + Glossary:112 ("v1.0 chỉ time-based, không track số buổi") | Database:389, 406, DDL line 827, 844 (REMOVED) | DRIFT — SRS:315 (quy trình 2.4.2) còn câu "Số buổi tập còn lại sẽ được hệ thống tự động trừ đi" — copy-paste ghost (xem SRS-C01) |
| 19 | Cron job spec (§2.5 SRS) | SRS:452-470 — 6 jobs | Database không document cron — OK (out of scope) | PARTIAL — SRS reference jobs không tồn tại: `subscription:cancel-unpaid` (UC03B:661), `auth:unlock-expired` (UC00:511), `training-session:auto-close` (UC05A:772). Cần thêm trong SRS §2.5. |
| 20 | Background job idempotency / multi-instance | SRS:466 "idempotent" | Database không document distributed lock | DRIFT nhỏ — SRS cần thêm note cho multi-instance (xem SRS-M13). Database không cần. |
| 21 | `otp_codes` table | SRS UC02, UC13 reference field `expires_at`, `attempt_count` | Database:657 mention name only, không có DDL/attribute table | DRIFT — `otp_codes` schema chỉ ở Prisma `schema.prisma` (codebase), không document trong Database.md. SRS:582 reference `attempt_count` field chưa định nghĩa. |
| 22 | Enum `staff.position` | SRS:140 — `pt`/`manager`/`receptionist`/`technician` | Database:336, DDL:779 — VARCHAR(50), không có CREATE TYPE | DRIFT nhỏ — SRS treat như enum, Database dùng free-text VARCHAR (xem DB-N03) |

## 2. Drift Summary

### CRITICAL drift (block release)
- **D-C01** (concept #18): SRS:315 còn logic "trừ số buổi tập" mâu thuẫn time-based-only design. → fix SRS_VI.md:315.
- **D-C02** (concept #19): SRS reference 3 cron jobs không có trong §2.5. → thêm `auth:unlock-expired`, `subscription:cancel-unpaid-pending`, `training-session:auto-close` vào SRS §2.5.

### MAJOR drift
- **D-M01** (concept #21): `otp_codes` không có schema trong Database.md mặc dù SRS reference field `attempt_count`. → bổ sung attribute table cho `otp_codes` trong Database.md §2, hoặc thêm note "schema cụ thể ở `server/prisma/schema.prisma`".
- **D-M02** (concept #17): Database đếm soft/hard delete không khớp 21 bảng nghiệp vụ — `otp_codes` thuộc list hard delete nhưng không thuộc 21 bảng. → fix Database.md:646-657 (xem DB-C03).
- **D-M03** (concept #16): timezone DRIFT — SRS nói UTC, Database dùng TIMESTAMP without timezone. → cả 2 file cùng cần thống nhất một convention (recommend `TIMESTAMPTZ` + UTC).

### MINOR drift
- **D-N01** (concept #9): `users.avatar_file_id` có ở Database nhưng SRS không có UC update avatar. → thêm UC15 hoặc note tại UC10 (Edit profile).
- **D-N02** (concept #22): `staff.position` SRS treat như enum nhưng DDL dùng VARCHAR. → thống nhất: tạo `staff_position` enum trong Database hoặc đổi SRS thành "free-text với liệt kê convention".
- **D-N03** (concept #14): `otp_codes` schema không có trong Database — đã list ở D-M01.

## 3. No-Drift Concepts (verified)

Các concept dưới đây đã verify khớp giữa SRS và Database, không cần action:

- Enum `user_status`, `feedback_status`, `payment_method`, `file_type` — match.
- Field `users.email_verified_at`, `members.primary_trainer_id`, `subscriptions.cancelled_at` — match.
- Business rule UC04 no-refund, UC06 PT scope, UC13 email-verify cho cả UC03A/UC03B (semantic match).
- Convention pagination 20/100 — out-of-scope cho Database, không drift.

## 4. Recommended Synchronization Actions

Theo thứ tự ưu tiên:

1. **Fix SRS_VI.md:315** — xóa câu "Số buổi tập còn lại sẽ được hệ thống tự động trừ đi". 1 dòng.
2. **Bổ sung SRS §2.5** với 3 cron jobs mới: `auth:unlock-expired-lockout`, `subscription:cancel-unpaid-pending`, `training-session:auto-close`.
3. **Database.md § Soft Delete** — fix counting hoặc define rõ vai trò `otp_codes` (auxiliary table, không thuộc 21 bảng nghiệp vụ).
4. **Database.md §2** — thêm attribute table cho `otp_codes` (mô tả fields: `otp_id`, `user_id`, `code_hash`, `expires_at`, `attempt_count`, `created_at`). Hoặc note "Schema cụ thể trong `server/prisma/schema.prisma`".
5. **Cả 2 file** — thống nhất timezone convention. Recommend: DB chuyển `TIMESTAMPTZ`, application luôn UTC; SRS §4.9 ghi rõ "Server PostgreSQL session timezone UTC; `CURRENT_DATE` cast theo `Asia/Ho_Chi_Minh` khi cần ngày bản địa".
6. **Database.md** — chốt enum vs VARCHAR cho `staff.position` và `gym_rooms.room_type`. Recommend tạo `staff_position` enum để đồng bộ với cách document trong SRS.
7. **SRS** — thêm UC update avatar (hoặc note tại UC10) để khớp với field `users.avatar_file_id`.

## 5. Verification Notes

- 22 concept đã verify (target plan ≥ 5).
- Mỗi finding kèm line number trực tiếp (đã verify bằng Grep).
- Drift CRITICAL = 2, MAJOR = 3, MINOR = 3. Tổng 8 drift trên 22 concept (~36%).
- Hệ thống enum chính (user_status, subscription_status, training_session_status, feedback_status, payment_method, payment_status, file_type) đều khớp — đây là kết quả tốt của sync session 2026-05-16.
- Drift còn lại tập trung ở (a) copy-paste ghost từ design cũ (SRS:315), (b) cron jobs reference nhưng chưa list (SRS §2.5), (c) `otp_codes` schema không document (Database §2), (d) timezone convention chưa thống nhất.
