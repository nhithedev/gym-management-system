# Review Report — `docs/VI/SRS_VI.md`

- Document: `docs/VI/SRS_VI.md` (1349 dòng)
- Review date: 2026-05-16
- Pipeline: 4 vòng (Structure + Anti-AI + Logic + Reader)
- Reviewer: orchestrated sub-agents (`doc-structure-reviewer`, `doc-anti-ai-reviewer`, `doc-logic-reviewer`, `doc-reader-tester`)

---

## 1. Executive Summary

| Phase | Status | Score / Issues | Threshold |
|---|---|---|---|
| Structural + Cross-ref | FAIL | 61/100 | ≥ 80 |
| Anti-AI Writing | NEEDS REVISION | AI score 18 | ≤ 15 |
| Logic + Business Rule | FAIL | 3 CRITICAL, 8 MAJOR, 5 MINOR | 0 C, ≤ 3 M |
| Reader Comprehension | FAIL | HIGH 36% (5/14) | ≥ 90% |

**Verdict: FAIL toàn bộ 4 vòng.** Tài liệu có nội dung kỹ thuật tốt nhưng còn lỗi cấu trúc, mâu thuẫn nội bộ và ambiguity ở mức không thể implement được toàn bộ flow.

## 2. CRITICAL Issues (block release)

| ID | File:Line | Mô tả |
|---|---|---|
| SRS-C01 | SRS_VI.md:315 | Quy trình 2.4.2 step 3 còn câu "Số buổi tập còn lại sẽ được hệ thống tự động trừ đi" — mâu thuẫn trực tiếp với design "time-based only" đã chốt ở SRS:803, SRS:996, Database:389, Database:406. Đây là copy-paste ghost từ thiết kế cũ trước khi bỏ `session_limit`. |
| SRS-C02 | SRS_VI.md:40-63 | UC13, UC14 (lines 1086, 1128) và §4.9, §4.10, §4.11 không có entry trong Mục lục — 25% nội dung mới nhất bị invisible khỏi navigation. |
| SRS-C03 | SRS_VI.md:511 | UC00 step 4e: "khóa tạm 30 phút" nhưng không có cron job nào trong §2.5 (lines 456-463) handle auto-unlock. User bị lock vĩnh viễn cho đến khi admin/UC02 can thiệp → dead state với boundary 30 phút là sai. |
| SRS-C04 | SRS_VI.md:661 | UC03B step 8a reference "cron auto-cancel sau 24h" nhưng §2.5 không định nghĩa job này. Subscription `pending` không bao giờ bị cancel tự động. |
| SRS-C05 | SRS_VI.md:646-647 | UC03B email-UNIQUE check không atomic giữa step 2 (validate) và step 3 (INSERT). Race condition: 2 request submit cùng email → response P2002 raw lọt ra client thay vì business error. |

## 3. MAJOR Issues (must fix)

### Structural
| ID | File:Line | Mô tả |
|---|---|---|
| SRS-M01 | SRS_VI.md:1-6 | Metadata thiếu Author (tên cá nhân), Reviewers, Document ID. Version `1.0` không đúng `MAJOR.MINOR.PATCH`. |
| SRS-M02 | SRS_VI.md:5 | Date `28 tháng 4 năm 2026` không phải ISO 8601 (`2026-04-28`). |
| SRS-M03 | SRS_VI.md:109-122 | Glossary thiếu acronym: JWT, OTP, SLA, KPI, RBAC, SMTP, MRR, ARPU, BMI, RTO, RPO, APM. |
| SRS-M04 | toàn file | Không có Traceability Matrix (requirement ↔ UC ↔ test case). |
| SRS-M05 | SRS_VI.md:124-130 | References không có version/link/ngày — `Tài liệu mẫu SRS tiêu chuẩn` không verifiable. |

### Logic
| ID | File:Line | Mô tả |
|---|---|---|
| SRS-M06 | SRS_VI.md:582 | UC02 step 8a: "max 5 lần/OTP" nhưng `attempt_count` không được khai báo trong schema `otp_codes` (Database.md cũng không có). |
| SRS-M07 | SRS_VI.md:715 | UC04A rule "chỉ 1 subscription pending" — không rõ scope (per-member hay per-package). |
| SRS-M08 | SRS_VI.md:707, 715 | UC03A step 7d (`status='active'` ngay) vs UC04A step 4 (`pending` nếu còn gói cũ): không phân biệt rõ channel (tại quầy vs online). |
| SRS-M09 | SRS_VI.md:772 | UC05A: session sau ngưỡng 2h có thể PT cancel không? Cơ chế "tự động" chuyển `completed` là gì — cron, trigger? Không có job tương ứng trong §2.5. |
| SRS-M10 | SRS_VI.md:979, 1064 | Currency rounding không specify cho phép tính trung gian (discount, proration). UC12 dùng `SUM(payments.amount)` — constraint integer không khai báo. |
| SRS-M11 | SRS_VI.md:1286 vs 707 | `Datetime ISO 8601 UTC` (§4.9) vs `CURRENT_DATE` trong UC03A/UC04A — chưa nói rõ timezone của `CURRENT_DATE` (UTC vs Asia/Ho_Chi_Minh). Gói tập có thể bắt đầu sai 1 ngày khi member thanh toán quanh nửa đêm VN. |
| SRS-M12 | SRS_VI.md:1198 | NFR §4.3: "≥ 1000 giao dịch/giây" không testable — thiếu tool, hardware, payload, định nghĩa "giao dịch". |
| SRS-M13 | SRS_VI.md:458-459 | §2.5 jobs không document distributed lock cho multi-instance. Tài liệu nói "idempotent" nhưng không đủ với concurrent write. |

### Anti-AI Writing
| ID | File:Line | Mô tả |
|---|---|---|
| SRS-M14 | SRS_VI.md:87 | "hỗ trợ quản lý toàn diện" — filler, "toàn diện" không thêm thông tin. |
| SRS-M15 | SRS_VI.md:1222-1241 | §4.5, §4.6, §4.7 mỗi section chỉ có 2-3 bullet generic, không có metric đo lường được. |
| SRS-M16 | SRS_VI.md:179, 199, 216, 234 | Mở đầu section 2.3.x lặp pattern "Nhóm này tập trung vào..." — placeholder rỗng. |

## 4. MINOR Issues

| ID | File:Line | Mô tả |
|---|---|---|
| SRS-N01 | SRS_VI.md:195 | Duplicate paragraph với SRS:189. |
| SRS-N02 | SRS_VI.md:1349 | "Trạng thái: Hoàn thành" ở footer không dùng vocabulary chuẩn (Draft/In Review/Approved). |
| SRS-N03 | SRS_VI.md:1210 vs 511 | §4.4 "khóa sau 5 lần sai" thiếu window 15 phút mà UC00:511 đã specify. |
| SRS-N04 | SRS_VI.md:630 vs 600 | UC03A step 7a (cho phép check-in chưa verify) — không cross-ref UC05B step 3. |
| SRS-N05 | SRS_VI.md:1342 | "Tài liệu này được phát triển dựa trên chuẩn ITSS..." — boilerplate AI, không có giá trị thông tin. |
| SRS-N06 | SRS_VI.md:805 | UC04A: edge case `pending → cancelled` không có payment record, ảnh hưởng UC12 report. |
| SRS-N07 | SRS_VI.md:1198 | "≥ 1000 TPS" thiếu realistic context cho gym vừa/nhỏ. |
| SRS-N08 | SRS_VI.md:582 | UC02: nơi lưu failed counter (`attempt_count`) không document. |

## 5. Detailed Sub-Reports

### 5.1 Structure + Cross-Reference (Score 61/100)

Metadata 6/20, Required Sections 22/30, Cross-references 18/25, Format Consistency 21/25.

Gaps chính: thiếu Author/Reviewer/Doc ID; Mục lục không bao gồm UC13/UC14/§4.9-4.11; Glossary thiếu 12+ acronym; không có Traceability Matrix.

### 5.2 Anti-AI Writing (AI score 18, SUSPICIOUS)

Tích cực: phần kỹ thuật (§3, §2.5, §4.3-4.4, §4.8-4.11) viết tốt — có số, có rejected alternatives, có v1.0 limitation rõ ràng.

Tiêu cực: filler mở đầu section 2.3.x; NFR §4.1/4.5/4.6/4.7 placeholder không metric. Cụm "toàn diện", "đảm bảo" (9 lần), "thân thiện dễ sử dụng" lặp.

### 5.3 Logic + Business Rule (3 CRITICAL, 8 MAJOR, 5 MINOR)

Flow verification: UC00 (FAIL), UC03B (FAIL), UC05A (FAIL), UC05B (WARN race), §2.5 jobs (WARN multi-instance). UC02, UC03A, UC04A, UC04B, UC13 PASS.

### 5.4 Reader Comprehension (HIGH 36%)

7/14 câu LOW confidence — phần lớn là cron job spec thiếu (auto-unlock, cancel-unpaid), no-show status không define, timezone CURRENT_DATE, RBAC permission matrix, NFR not testable.

## 6. Recommended Actions (ưu tiên)

1. **SRS-C01** (1 dòng): xoá hoặc viết lại line 315 — bỏ "Số buổi tập còn lại sẽ được hệ thống tự động trừ đi".
2. **SRS-C02** (Mục lục): thêm entry cho UC13, UC14, §4.9, §4.10, §4.11.
3. **SRS-C03, SRS-C04, SRS-M09** (§2.5): thêm 3 cron jobs — `auth:unlock-expired-lockout` (per 5 min), `subscription:cancel-unpaid-pending` (daily), `training-session:auto-close` (per 15 min).
4. **SRS-C05**: thêm note tại UC03B step 2a: "Lỗi P2002 từ DB UNIQUE phải catch tại service layer, trả 409 với message business-friendly."
5. **SRS-M11**: thêm convention "Server PostgreSQL `timezone='Asia/Ho_Chi_Minh'` cho `CURRENT_DATE` operations" hoặc dùng `(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`.
6. **SRS-M01, SRS-M02, SRS-M03, SRS-M04**: bổ sung metadata header + Traceability Matrix + Glossary mở rộng.
7. **SRS-M15**: viết lại §4.5/4.6/4.7 với metric cụ thể (MTBF, uptime, scope exclusion).

## 7. Verification Notes

- Tất cả line number trong report đã verify trực tiếp bằng Grep/Read.
- Database.md cross-reference đã verify ở session cross-check (xem `cross-check-srs-db-2026-05-16.md`).
- Pipeline thực tế chạy 4 vòng (`doc-business-reviewer` và `doc-cross-ref-reviewer` merge vào logic + structure agent tương ứng).
