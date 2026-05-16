# Review Report — `docs/Design/Database.md`

- Document: `docs/Design/Database.md` (1062 dòng)
- Review date: 2026-05-16
- Pipeline: 4 vòng (Structure + Anti-AI + Logic + Reader)
- Reviewer: orchestrated sub-agents

---

## 1. Executive Summary

| Phase | Status | Score / Issues | Threshold |
|---|---|---|---|
| Structural + Cross-ref | FAIL | 44/100 | ≥ 80 |
| Anti-AI Writing | NEEDS REVISION | AI score 22 (revised down to 17 sau cân nhắc) | ≤ 15 |
| Logic + Business Rule | FAIL | 3 CRITICAL, 7 MAJOR, 8 MINOR | 0 C, ≤ 3 M |
| Reader Comprehension | FAIL | HIGH 65% (13/20) | ≥ 90% |

**Verdict: FAIL toàn bộ.** DDL chính xác về mặt enum/constraint, nhưng thiếu metadata, thiếu Overview/Glossary, có forward-reference fail-on-run trong DDL, và một số cascade behavior chưa document.

## 2. CRITICAL Issues (block release)

| ID | File:Line | Mô tả |
|---|---|---|
| DB-C01 | Database.md:1-9 | Metadata block (Version, Author, Reviewer, Status, Last Updated, Document ID) hoàn toàn vắng. File bắt đầu thẳng bằng ToC. |
| DB-C02 | Database.md:7 vs body | ToC ghi `Supabase SQL (bootstrap)` nhưng section không tồn tại trong body. Broken ToC reference. |
| DB-C03 | Database.md:646 vs 648 | Mâu thuẫn đếm: body claim "12 soft + 9 hard = 21 bảng" nhưng danh sách hard delete liệt kê 10 mục (gồm `otp_codes` không có trong danh sách 21 bảng chính thức §1). |
| DB-C04 | Database.md:760-774 vs 776 | DDL forward reference: `CREATE TABLE members` khai báo `fk_members_primary_trainer → staff(staff_id)` nhưng `staff` được CREATE sau (line 776). DDL chạy tuần tự sẽ fail "relation staff does not exist". So sánh `users.avatar_file_id → files` đã giải quyết đúng bằng ALTER TABLE ở line 1056-1060. |
| DB-C05 | Database.md:696 | `subscription_status` enum thiếu state `paused`. Member tạm dừng gói (gãy chân, du lịch) không có cách model. Cron expire vẫn chạy → member mất ngày còn lại. Cần hoặc thêm enum value hoặc note "v1.0 không hỗ trợ pause". |
| DB-C06 | Database.md:697 | `training_session_status` thiếu `no_show`. Không phân biệt được "PT cancel trước 2h" vs "member vắng mặt" — báo cáo UC12 sai. |
| DB-C07 | toàn DDL | Cascade soft delete `users → members/staff/subscriptions/files` không định nghĩa. Khi soft delete user, `members` (1:1) còn `deleted_at IS NULL` → query mặc định trả member của user đã xóa. |

## 3. MAJOR Issues

### Structural
| ID | File:Line | Mô tả |
|---|---|---|
| DB-M01 | toàn file | Không có Glossary. BIGSERIAL, FK, PK, ERD, RBAC, DDL, OTP, RLS không được define. |
| DB-M02 | đầu file | Không có Overview/Purpose section. File bắt đầu thẳng từ ToC. Không có H1 (`# Database Design`). |
| DB-M03 | Database.md:858-871 | DDL `payments` thiếu `CREATE INDEX` cho `member_id` và `subscription_id` — cả hai là FK + WHERE-filter, nghiêm trọng cho bảng giao dịch tài chính. |
| DB-M04 | Database.md:931-945 | DDL `attendance_logs` thiếu index cho `member_id`, `subscription_id`, `session_id`. Bảng này query check-in history thường xuyên — sẽ full scan. |

### Logic
| ID | File:Line | Mô tả |
|---|---|---|
| DB-M05 | Database.md:941 | `attendance_logs.method` không có `NOT NULL`. ERD mô tả method bắt buộc → DDL không khớp. |
| DB-M06 | Database.md:862 | `payments.amount` thiếu `CHECK (amount > 0)`. Có thể insert payment âm hoặc 0 → revenue sai. |
| DB-M07 | toàn DDL | Timestamps dùng `TIMESTAMP` (không `WITH TIME ZONE`). Không có Timezone Convention section. Server timezone không khai báo → `NOW()` ambiguous. |
| DB-M08 | Database.md:1017 | `staff_schedules` UNIQUE(staff_id, shift, work_date) không tính `deleted_at` → soft delete rồi re-assign cùng ca sẽ conflict. Cần partial unique index `WHERE deleted_at IS NULL`. |
| DB-M09 | Database.md:582, 648 | `files` orphan cleanup khi user/equipment xóa: chỉ có note "cleanup qua cron job" — không có spec frequency, không có rule cho `equipment_doc` khi equipment hard delete. |
| DB-M10 | DDL FK | Mọi FK không khai báo ON DELETE → default `NO ACTION`. Hợp lý nhưng không document — developer không biết behavior. |

### Anti-AI Writing
| ID | File:Line | Mô tả |
|---|---|---|
| DB-M11 | toàn §2 | "Định danh duy nhất của X" lặp 19/21 bảng — filler. Bỏ row PK khỏi attribute table, thay bằng convention note đầu §2. |
| DB-M12 | Database.md:674 | Claim "DECIMAL(12,2) để buffer mở rộng đa tiền tệ" — đa tiền tệ cần `currency_code` column + conversion table, không phải thêm thập phân. Claim chưa validate. |
| DB-M13 | toàn doc | Thiếu WHY cho 2 quyết định lớn: BIGSERIAL vs UUID (đề cập trong CLAUDE.md nhưng không trong Database.md); soft delete 12 vs hard delete 9 — không có lý do kỹ thuật ngoài "SRS UC08/UC09" và "immutable logs". |

## 4. MINOR Issues

| ID | File:Line | Mô tả |
|---|---|---|
| DB-N01 | Database.md:834 | `packages.price CHECK (price >= 0)` cho phép gói 0đ — có ý đồ trial hay accident? Document rõ. |
| DB-N02 | Database.md:762 | `members.date_of_birth NOT NULL` không có CHECK age tối thiểu (16+? 18+?). |
| DB-N03 | Database.md:779 | `staff.position` dùng `VARCHAR(50)` thay vì enum — không có constraint, dễ typo. |
| DB-N04 | Database.md:877 | `gym_rooms.room_type VARCHAR(50)` không enum/CHECK — filter sẽ lỗi `cardio` vs `Cardio`. |
| DB-N05 | Database.md:688 | `payment_status` chỉ `success/failed` — thiếu `pending` cho async callback (ewallet/bank_card). |
| DB-N06 | Database.md:569 | `audit_logs` retention "đề xuất 1 năm" — không có cron spec. |
| DB-N07 | Database.md:891 | `equipment.fk_equipment_room` không khai báo `ON DELETE`. |
| DB-N08 | Database.md:905 | `maintenance_logs.fk_maintenance_staff` không khai báo `ON DELETE`. |
| DB-N09 | Database.md:15-54 vs §3 | ERD Mermaid có 22 quan hệ vs phần text claim 29 (#1-#29). Cần đối chiếu lại để khẳng định mismatch thật hay do pack quan hệ. |
| DB-N10 | Database.md:657 | `otp_codes` được mention nhưng không có DDL/attribute table cho bảng này trong Database.md. Reader không biết schema. |

## 5. Detailed Sub-Reports

### 5.1 Structure (Score 44/100)

Metadata 0/20, Required Sections 15/30, Cross-references 18/25, Format 22/25. Gaps lớn: không metadata, không Overview, không Glossary, broken ToC entry, mâu thuẫn đếm soft/hard delete.

### 5.2 Anti-AI Writing (Score 17-22)

Tích cực: phần DDL, Convention section, relationship table viết kỹ thuật, có số (10MB, 45 chars, 1 năm retention), có TBD v1.1+ rõ, có rejected alternative (`btree_gist` extension).

Tiêu cực: PK description "Định danh duy nhất của X" lặp 19/21 bảng — filler. Junction table description "Tham chiếu tới X". Thiếu WHY cho BIGSERIAL/soft-delete-split.

### 5.3 Logic (3 CRITICAL, 7 MAJOR, 8 MINOR)

Flow verification FAIL: cascade soft delete user→member/staff, staff_schedules re-assign sau soft delete. Subscription/training-session lifecycle WARN do thiếu state `paused`/`no_show`.

### 5.4 Reader Comprehension (HIGH 65%)

Câu LOW: cascade soft delete behavior, timestamp timezone, no_show flow, file orphan cleanup, audit log scope, otp_codes schema, migration strategy. Câu HIGH: enum khai báo, soft/hard delete list, currency, UNIQUE+NULL, ERD count.

## 6. Recommended Actions (ưu tiên)

1. **DB-C04**: tách `fk_members_primary_trainer` ra khỏi `CREATE TABLE members` bằng `ALTER TABLE` ở cuối DDL, giống pattern `users.avatar_file_id`. Verify DDL chạy tuần tự không lỗi.
2. **DB-C01, DB-M01, DB-M02**: thêm metadata header (Version 1.0.0, Author, Reviewers, Status, Last Updated 2026-05-16, Document ID `GMS-DB-DESIGN-001`), H1 title, Overview section ngắn, Glossary section.
3. **DB-C02**: bỏ entry `Supabase SQL (bootstrap)` khỏi ToC HOẶC thêm section đó vào body.
4. **DB-C03**: chốt: `otp_codes` có thuộc 21 bảng không? Nếu có, thêm vào §1; nếu không, sửa câu "12 soft + 9 hard = 21" thành "+ 1 bảng phụ trợ otp_codes (hard delete, không thuộc 21 bảng nghiệp vụ)".
5. **DB-C05, DB-C06**: thêm `paused` vào `subscription_status` HOẶC note rõ "v1.0 không hỗ trợ pause"; thêm `no_show` vào `training_session_status` HOẶC dùng cột `attendance_confirmed BOOLEAN`.
6. **DB-C07**: thêm Cascade Soft Delete section: "Khi soft delete `users`, application transaction phải đồng thời set `deleted_at` cho `members`, `staff`, `subscriptions`, `files` của user — dùng `$transaction` trong service layer."
7. **DB-M03, DB-M04**: thêm `CREATE INDEX` cho FK columns thiếu — `payments(member_id)`, `payments(subscription_id)`, `attendance_logs(member_id)`, `attendance_logs(subscription_id)`, `attendance_logs(session_id)`, `maintenance_logs(equipment_id)`, `maintenance_logs(reported_by_staff_id)`, `notifications(user_id)` (chưa verify), `subscriptions(package_id)` (chưa verify).
8. **DB-M05**: thêm `NOT NULL` cho `attendance_logs.method`.
9. **DB-M06**: thêm `CHECK (amount > 0)` cho `payments.amount`.
10. **DB-M07**: chuyển toàn bộ TIMESTAMP → `TIMESTAMPTZ` HOẶC document explicit "DB session timezone = UTC, application chịu trách nhiệm convert".
11. **DB-M08**: chuyển `uq_schedules_staff_shift_date` thành partial unique index `WHERE deleted_at IS NULL`.
12. **DB-M11**: bỏ row PK + row `created_at` filler khỏi attribute table, thay bằng convention note ngắn ở đầu §2.

## 7. Verification Notes

- Line numbers verified bằng Grep/Read.
- Cross-check với SRS_VI.md xem `cross-check-srs-db-2026-05-16.md`.
- Một số tham chiếu `otp_codes` cần codebase audit (file này không define schema).
