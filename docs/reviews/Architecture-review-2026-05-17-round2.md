# Review Report — `docs/Design/Architecture.md` (Round 2 Logic)

- Document: `docs/Design/Architecture.md` v1.1.0 (966 dòng) → fix sang v1.1.1
- Review date: 2026-05-17
- Round: 2 (Logic + Business Rule)
- Reviewer: `doc-logic-reviewer` (orchestrated via Agent tool)
- Cross-ref consulted: `docs/VI/SRS_VI.md`, `docs/Design/Database.md`, `server/prisma/schema.prisma`

> **Updated 2026-05-17 (post-fix):** 3 CRITICAL items đã FIXED per user decision (LOG-C01 restrict member_code, LOG-C02 defer idempotency, LOG-C03 defer lockout). 7 MAJOR + 4 MINOR vẫn OPEN — triage cho phase tiếp theo. Status column cập nhật bên dưới.

---

## 1. Executive Summary

| Metric | Pre-fix | Post-fix | Threshold | Status |
|---|---|---|---|---|
| Decision points analyzed | 41 | 41 | — | — |
| CRITICAL issues | 3 | 0 (3 FIXED) | 0 | PASS |
| MAJOR issues | 7 | 7 OPEN | ≤ 3 | FAIL |
| MINOR issues | 4 | 4 OPEN | — | — |

**Verdict (pre-fix): FAIL.** Architecture không thể serve cho API spec Module 1 Auth cho tới khi 3 CRITICAL resolved.

**Verdict (post-fix): MARGINAL FAIL** — 3 CRITICAL đã FIXED (defer v1.1+), 7 MAJOR vẫn OPEN. Per `docs/CLAUDE.md` §2.2 threshold "0 CRITICAL, ≤ 3 MAJOR" → vẫn FAIL vì 7 MAJOR. Tuy nhiên Module 1 Auth API spec không còn blocking absolute — có thể bắt đầu API spec với caveat:

- Module 1 Auth API spec OK (LOG-C03 defer means no lockout logic to spec; LOG-M06 admin unlock cũng defer cùng R20; LOG-M02 OTP resend invalidation cần fix khi spec).
- Module 4 Membership API spec cần fix LOG-M01 (timezone), LOG-M02, LOG-M03, LOG-M04 trước.
- Module Training API spec cần fix LOG-M05 (auto-close → no-show conflate).

**Status legend:**
- `OPEN` — chưa fix
- `PARTIAL` — phần nào fix
- `FIXED` — đã giải quyết
- `DEFER` — chuyển sang v1.1+

---

## 2. CRITICAL Issues (block release)

| ID | Location | Description | Status |
|---|---|---|---|
| LOG-C01 | Arch §3.3 line 219-248, §4.1.5 line 330-344; DB Database.md:712 | UC05B sequence diagram query `SELECT member WHERE card_id=?` nhưng `members` table không có column `card_id`. Spec flexible "có thể là `member_code`, `card_id`, hoặc QR payload" — implementation hardcode. UC05B endpoint unimplementable as written. | FIXED — Restrict v1.0 chỉ `member_code`. Architecture §3.3 sequence + §3.5 data shape + Database.md:712 body spec updated. RFID/QR defer v1.1 R21 (Roadmap). |
| LOG-C02 | Arch §4.2.2 line 373-375 | `POST /payments Idempotency-Key` claim "lưu key + response 24h" — không có storage substrate (không idempotency_keys table, không Redis). Anti-double-charge guarantee rỗng. | FIXED — Defer v1.1 R19. §4.2.2 rewrite: client disable button + UNIQUE `transaction_reference` (P2002→409); UC05B dedup `(device_id, occurred_at)` app-logic. Trade-off "hiếm hoi double-write" được note. |
| LOG-C03 | Arch §4.1.4 line 324, §5.2 cron line 524; schema.prisma `model User` | (A) Lockout counter UC00 "5 lần sai/15 phút" cần `failed_login_count` + `last_failed_login_at` — không có. (B) Cron `auth:unlock-expired-lockout` ghi audit action `auth.unlock` không có trong §4.4.1 scope. | FIXED — Defer v1.1 R20. §4.1.4 rewrite "V1.0 không lockout"; §4.4.1 bỏ `auth.lockout`/`auth.unlock` khỏi v1.0 scope; §5.2 9→8 job (xoá cron); §6.3 STRIDE D + OWASP A07 update note brute-force risk + WAF mitigation; Module 1 line 165 boundary sync. SRS UC00 chưa sync (defer round phase 6). |

### Recommendations cho CRITICAL

- **LOG-C01:** Chọn 1 trong 2 hướng:
  - (a) Add `members.card_id VARCHAR(50) UNIQUE NULLABLE` vào Database.md + schema.prisma + ERD; update UC05B sequence diagram SQL.
  - (b) Spec v1.0 chỉ support lookup by `member_code`; sửa Architecture §3.3 line 226 `SELECT WHERE member_code=?`; remove `card_id` references trong line 219, 248; update Database.md line 712.
- **LOG-C02:** Chọn 1 trong 3 hướng:
  - (a) Add `idempotency_keys(key, endpoint, response_body, expires_at)` table.
  - (b) Document dedup dùng `payments.transaction_reference` UNIQUE → P2002 → 409 (đã có UNIQUE constraint).
  - (c) Defer idempotency v1.1 (move §4.2.2 sang Roadmap §8).
- **LOG-C03:** 
  - Add `users.failed_login_count INT DEFAULT 0` + `users.last_failed_login_at TIMESTAMP NULL` vào Database.md + schema.prisma.
  - Add `auth.unlock` + `auth.admin-unlock` vào §4.4.1 audit scope table.

---

## 3. MAJOR Issues

| ID | Location | Description | Status |
|---|---|---|---|
| LOG-M01 | Arch §5.2 line 525 vs §3.3 line 231; SRS UC05B step 3 | Off-by-one timezone giữa cron `subscription:expire` (`end_date < today_vn`) và check-in endpoint (SRS dùng `CURRENT_DATE` UTC). Member check-in 00:00-07:00 VN time gặp inconsistency. Cần explicit note: tất cả subscription date compare dùng `today_vn`. | FIXED (phase 7) — Arch §4.5.2 promote thành named helper convention; SRS Glossary + 4 UC replace `CURRENT_DATE`→`today_vn`; Database.md Timezone Convention sync. |
| LOG-M02 | Arch §4.1.3 line 294-318 | OTP resend (`POST /auth/resend-verify` và `forgot-password` resend) không spec behavior với OTP cũ. `otp_codes` không có UNIQUE constraint `(user_id, purpose)` → multiple OTPs coexist. Security gap: old OTP vẫn valid tới expire. Cần spec DELETE old OTP trong cùng `$transaction` với INSERT new. | FIXED (phase 7) — Arch §4.1.3 sequence + §4.1.4 thêm "Single-active OTP invariant"; Database.md `otp_codes` convention section; SRS UC02 step 5. Application-level enforce (KHÔNG UNIQUE constraint). |
| LOG-M03 | Arch §5.2 line 527; SRS UC03B step 8a | "Sau 24h cron auto-cancel" — cron daily 00:15 giao 24h-48h window thực tế (subscription tạo 00:16 day D bị cancel 00:15 day D+2 = ~48h). Spec SRS nói "24h" — mismatch. | OPEN — defer next-session (1-line clarify cron spec là 24-48h window, hoặc đổi cron frequency). |
| LOG-M04 | Arch §4.3.2 line 416; SRS UC04B step 4 | UC04B cancel subscription `active` + có `pending` prepaid → activate prepaid `start_date=CURRENT_DATE` recompute `end_date`. Cascading logic không document trong Architecture. Dev đọc Architecture only sẽ miss. Cần add §4.3.3 với `$transaction` requirement + dùng `today_vn`. | OPEN — partial fix phase 7: SRS UC04B step 4 đã thêm `$transaction` + `today_vn`. Architecture §4.3.3 chưa add — defer next-session. |
| LOG-M05 | Arch §5.2 line 528 | Cron `training-session:auto-close` convert `scheduled` (chưa diễn ra, no attendance) → `completed`. UC12 KPI `COUNT(WHERE status='completed')` đếm cả no-show session → inflated PT performance. Fix: cron chỉ auto-close `in_progress`; `scheduled` past end_time → `cancelled`. Hoặc UC12 query thêm `EXISTS attendance_logs`. | FIXED (phase 7) — Arch §5.2 rewrite query-based split: `EXISTS attendance_logs`→`completed`, NOT EXISTS→`cancelled` + audit `training.no_show`. §4.4.1 audit thêm Module Training. SRS UC12 KPI note. Database.md `training_session_status` note rewrite. |
| LOG-M06 | Arch §4.1.4 line 324; SRS UC00 step 4c/4e | SRS nói "Liên hệ quản trị viên" + "Yêu cầu admin unlock". Architecture chỉ implement (1) UC02 reset password unlock, (2) cron auto-unlock 30min. Admin manual unlock path absent: không có endpoint, không có action code. | DEFERRED v1.1 R20 — cùng decision với LOG-C03 lockout defer. SRS UC00 step 4c/4e đã rewrite (phase 7) bỏ lockout flow. Admin unlock endpoint + `auth.admin-unlock` action implement cùng R20. |
| LOG-M07 | Arch §5.2 line 526 | Cron `subscription:activate-pending` "đã payment success" không spec query join. Cần `EXISTS (SELECT 1 FROM payments WHERE subscription_id=? AND status='success')` + composite index `(subscription_id, status)` (chưa có trong schema.prisma). | OPEN — partial fix phase 6 (round 3 quick-fix đã thêm `EXISTS` query). Composite index `(subscription_id, status)` chưa add vào schema.prisma — defer khi implement Module 4. |

---

## 4. MINOR Issues

| ID | Location | Description | Status |
|---|---|---|---|
| LOG-N01 | Arch §4.1.3 line 295-318 | Anti-enumeration policy không stated cho `resend-verify`. Forgot-password có ("always 200 regardless of existence"); verify resend không có → potential account enumeration. | OPEN |
| LOG-N02 | Arch §6.3 STRIDE Tampering line 746 | "audit_logs append-only" claim v1.0 — thực tế enforce chỉ ở application layer; DB-level revoke UPDATE/DELETE defer v1.1 với RLS. STRIDE row không acknowledge gap. | OPEN |
| LOG-N03 | Arch §5.2 line 530 vs §4.6 line 469-477 | Feedback SLA cron contradiction: §4.6 "cron tính lại badge" implies stored field; §5.2 "log metric" + "overdue derive tại query time" implies computed. Reconcile required. | OPEN |
| LOG-N04 | Arch §4.1.5 line 340 vs §5.4.2 line 625 | Device API key rotation procedure: §4.1.5 nói "deploy env mới → restart"; §5.4.2 chỉ ghi "restart-required". Container deployment context cần "re-deploy" làm bước 1. | OPEN |

---

## 5. Logic Flow Verification

| Flow | Decisions | Reachable | Terminates | Race-Free | Verdict |
|---|---|---|---|---|---|
| Login lockout (UC00 + cron) | 4 | OK | FAIL (admin unlock unreachable) | WARN (counter not in DB) | FAIL |
| Email Verify §4.1.3 | 5 | OK | OK | WARN (old OTP coexist) | WARN |
| Password Reset §4.1.4 | 4 | OK | OK | OK | PASS |
| Subscription lifecycle | 6 | OK | OK | OK (cron ordering documented) | PASS |
| UC05B Device check-in §3.3 | 4 | FAIL (`card_id` not in schema) | — | WARN (no dedup UNIQUE) | FAIL |
| Idempotency POST /payments | 2 | FAIL (no storage) | — | — | FAIL |
| Training auto-close cron | 2 | OK | OK | WARN (no-show counted completed) | WARN |
| Feedback SLA badge | 2 | OK | OK | — | WARN (contradictory spec) |
| Cancel + cascade activation | 3 | OK | OK | OK (transaction needed) | WARN (not in Architecture) |

---

## 6. Verdict

**Pre-fix: FAIL.** 3 CRITICAL, 7 MAJOR, 4 MINOR. Threshold violated.

**Post-fix: MARGINAL FAIL** — 0 CRITICAL, 7 MAJOR OPEN. Vẫn vượt threshold `≤ 3 MAJOR` per `docs/CLAUDE.md` §2.2. Cần fix tối thiểu 4 MAJOR (LOG-M01/M02/M05/M06) hoặc explicit defer trước khi PASS.

Per `docs/CLAUDE.md` §3.2 "phát hiện CRITICAL → dừng pipeline, escalate" — đã escalate đầu phase 5b, user chốt defer all 3 CRITICAL. Pipeline tiếp tục với round 3 Reader.

Module spec readiness post-fix:

- Module 1 Auth: UNBLOCKED (LOG-C03 defer, LOG-M06 cùng R20 defer). Có thể spec — chỉ note "v1.0 không lockout".
- Module 4 Membership: BLOCKED — LOG-M01 (timezone) + LOG-M02 (OTP resend) + LOG-M03 (24h) + LOG-M04 (cascade) cần fix.
- Module 7 Training: PARTIAL — LOG-C01 fix mở khoá UC05B; LOG-M05 (auto-close vs no-show) vẫn open.
- Module Payment: UNBLOCKED (LOG-C02 defer; UNIQUE `transaction_reference` đủ v1.0).

Recommendation: Fix LOG-M01/M02/M05 trước khi spec Module 4/7. LOG-M03/M04/M06/M07 + 4 MINOR triage round phase tiếp.

---

## 7. Resolved Open Questions

1. **LOG-C01:** Restrict UC05B v1.0 chỉ `member_code`. FIXED.
2. **LOG-C02:** Defer idempotency v1.1+ (R19). FIXED.
3. **LOG-C03:** Defer lockout v1.1+ (R20). FIXED.

## 8. Open Questions (defer)

1. **LOG-M03 24h boundary:** Accept 24-48h window (document) hay đổi sang hourly cron?
2. **LOG-M05 auto-close:** Cron skip `scheduled` (state semantics), hay UC12 query `EXISTS attendance_logs` (report-only fix)?
