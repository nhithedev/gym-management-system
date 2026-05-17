# SRS_VI.md — Round 2 Logic Review

| Field | Value |
|---|---|
| Document under review | `docs/VI/SRS_VI.md` v1.0.0 (~1169 lines, UC00-UC12) |
| Cross-references | `docs/Design/Architecture.md` v1.1.4, `docs/Design/Database.md`, `server/prisma/schema.prisma` |
| Reviewer | `doc-logic-reviewer` agent (vòng 2 pipeline /doc-review) |
| Date | 2026-05-17 |
| Pipeline context | Round 1 (Structure + Anti-AI) đã chạy phase 8. Round 3 Reader + Round 4 Executive Summary defer session sau. |

---

## Executive Summary

**Verdict: FAIL** — Score 52/100 (Logic).

| Severity | Count | Threshold (per docs/CLAUDE.md §2.2) | Pass? |
|---|---|---|---|
| CRITICAL | 2 | 0 | FAIL |
| MAJOR | 5 | ≤ 3 | FAIL |
| MINOR | 3 | n/a | — |

Decision points analyzed: 47. Spot-check verified 2 CRITICAL legitimate (parent verify against Database.md enum + SRS line 496/520; agent claim không hallucinate).

Escalation per `docs/CLAUDE.md §3.2`: CRITICAL → dừng pipeline, escalate fix-vs-defer.

---

## CRITICAL Findings

### LOG2-C01 — `user_disabled` phantom state

**Location:** Architecture v1.1.4 §4.4.1 audit payload `auth.login` — cross-impact UC00 step 4/4b.

**Quote (Architecture):** `reason?: 'invalid_credentials' | 'email_not_verified' | 'user_disabled'`

**Quote (Database.md line 752):** `CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'locked');`

**Quote (`schema.prisma:21-27`):** `enum UserStatus { pending_verification active locked }`

**Mismatch:** Reason value `user_disabled` không map tới bất kỳ DB state nào. Không có UC nào trong SRS define đường dẫn nào set user thành "disabled" state. `locked` đã defer v1.1 R20.

**Why critical:** Developer implement audit interceptor cho `auth.login` sẽ gặp `user_disabled` trong spec, đoán có column `is_disabled` hoặc status mới → code drift. Hoặc skip reason → audit trail thiếu nguồn block lý do.

**Suggested fix (3 option):**
- **Option A** (recommended): Đổi `'user_disabled'` → `'user_deleted'` mapping với `users.deleted_at IS NOT NULL`. UC00 step 4 đã check `deleted_at IS NULL` mặc định.
- **Option B**: Giữ `user_disabled`, define explicit "v1.1 placeholder reason, code v1.0 không sinh" trong Architecture §4.4.1.
- **Option C**: Bỏ hẳn reason value này, để `reason` enum chỉ 2 value v1.0 (`invalid_credentials`, `email_not_verified`).

---

### LOG2-C02 — "Ghi nhớ đăng nhập" checkbox TTL undefined

**Location:** SRS UC00 step 2 (line 496), Dữ liệu đầu vào row 3 (line 520), Hậu điều kiện.

**Quote (SRS line 496):** "Hệ thống hiển thị giao diện đăng nhập (form email + password, checkbox 'Ghi nhớ đăng nhập', link 'Quên mật khẩu')"

**Quote (SRS line 520):** "| 3 | Ghi nhớ đăng nhập | Checkbox kéo dài TTL token | Không | boolean | true |"

**Quote (SRS Hậu điều kiện):** "JWT được cấp phát (TTL 7 ngày)"

**Quote (Architecture §4.1.1):** không mention conditional TTL theo remember-me.

**Mismatch:** Input field "kéo dài TTL" không có target value. JWT TTL hardcoded 7 ngày stateless. Không có spec cho extended TTL (14d? 30d? 90d?), không có implementation hint.

**Why critical:** UI checkbox visible nhưng không wired = misleading UX. Hoặc developer guess TTL value → security risk (token quá dài nếu chọn sai).

**Suggested fix (2 option):**
- **Option A** (recommended): Bỏ checkbox khỏi UI spec, note "TTL cố định 7 ngày v1.0, remember-me defer v1.1 cùng refresh token (Architecture §8 R1)."
- **Option B**: Define explicit TTL pair, vd "false → 7 ngày, true → 30 ngày", và update Architecture §4.1.1 thêm conditional logic.

---

## MAJOR Findings

### LOG2-M01 — UC00 failed-login audit missing trong SRS

**Location:** SRS UC00 step 6 (success only) vs Architecture §4.4.1 + §4.4.2.

**Quote (SRS step 6):** "ghi `audit_logs` action `auth.login` với IP + user-agent" — chỉ trong success flow.

**Quote (Architecture §4.4.1):** "`auth.login` (ghi CẢ success lẫn failed — payload `{success: boolean, reason?: ...}`)"

**Quote (Architecture §4.4.2):** "Interceptor phải catch exception trước khi propagate"

**Mismatch:** SRS UC00 alternative flows 4b/4c/4d không mention audit write. Brute-force forensics (Architecture §4.4.2 stated rationale for replacing lockout defer R20) sẽ không hoạt động nếu chỉ implement theo SRS.

**Suggested fix:** Thêm note SRS UC00 step 4b + 4c: "Ghi `audit_logs` action `auth.login` với `{success: false, reason: 'invalid_credentials'|'email_not_verified'}`, `actor_user_id=NULL` khi credential không khớp."

**Estimate fix:** ~5 phút.

---

### LOG2-M02 — UC04B cascade missing `subscription.activate` audit

**Location:** SRS UC04B step 4 vs Architecture §4.3.3 code sample.

**Quote (SRS UC04B step 4):** "ghi `audit_logs` action `subscription.cancel`"

**Quote (Architecture §4.3.3):** 2 audit rows — `subscription.cancel` + conditional `subscription.activate`.

**Quote (Architecture v1.1.4 §4.4.1):** Subscription row giờ liệt kê `subscription.activate` với payload `{activated_from: 'cron' | 'cascade_cancel'}`.

**Mismatch:** SRS chỉ đề cập 1 audit row. Owner trace "cancel X → activate Y" sẽ incomplete.

**Suggested fix:** Update SRS UC04B step 4: "ghi `audit_logs` action `subscription.cancel`; nếu có cascade activate → ghi thêm `audit_logs` action `subscription.activate` với payload `{activated_from: 'cascade_cancel'}` trong cùng `$transaction`."

**Estimate fix:** ~5 phút.

---

### LOG2-M03 — UC05B step 4 `in_progress` transition mâu thuẫn Architecture cron rationale

**Location:** SRS UC05B step 4 vs Architecture §5.2 cron `training-session:auto-close` rationale.

**Quote (SRS UC05B step 4):** "nếu tại thời điểm đó có `training_session` của member ở `status='scheduled'` thì link `session_id` và chuyển session `status='in_progress'`"

**Quote (Architecture §5.2):** "Lý do query-based thay vì status-based: tránh dependency vào UC05B/UC05A có update `in_progress` hay không (v1.0 không bắt buộc transition này)."

**Mismatch:** SRS nói transition IS performed; Architecture nói v1.0 KHÔNG bắt buộc transition.

**Why major:** Module 7 Training developer cần authoritative answer. Hậu điều kiện SRS ghi flow `scheduled → in_progress → completed` không match Architecture cron query-based design.

**Suggested fix:**
- **Option A** (recommended): SRS step 4 thêm note "Chuyển `status='in_progress'` là **optional v1.0** — cron `training-session:auto-close` query-based theo EXISTS attendance_logs, không phụ thuộc transition này (xem Architecture §5.2)."
- **Option B**: Bỏ transition khỏi SRS step 4 hoàn toàn; document UI hint, không phải DB state change.

**Estimate fix:** ~10 phút.

---

### LOG2-M04 — UC04A path (b) immediate activation — audit payload undefined

**Location:** SRS UC04A step 4 branch (b), step 5.

**Quote (SRS UC04A step 4b):** "Nếu không có gói active → new subscription `status='active'`"

**Quote (SRS UC04A step 5):** "ghi `audit_logs` action `subscription.renew`"

**Quote (Architecture §4.4.1):** `subscription.activate` payload `{activated_from: 'cron' | 'cascade_cancel'}` — không có value cho immediate activation.

**Mismatch:** Audit cho path (b) ambiguous. Là `subscription.renew` thuần, hay cộng thêm `subscription.activate` với `activated_from: 'immediate_payment'`?

**Suggested fix:**
- **Option A** (recommended): `subscription.renew` cover cả 2 path. Khi cần forensics "thời điểm active", suy ra qua `before_data.status` trong audit row renew.
- **Option B**: Thêm `'immediate_payment'` vào Architecture §4.4.1 payload `activated_from` enum, sync với UC04A step 5.

**Estimate fix:** ~10 phút (option A) hoặc ~15 phút (option B).

---

### LOG2-M05 — `users.status='locked'` orphan state

**Location:** SRS UC00 step 4 (check `status='active'`) vs Database.md `user_status` enum.

**Quote (SRS UC00 Ghi chú lockout):** "Login lockout cơ chế defer v1.1+ (R20)"

**Quote (Database.md line 752):** `user_status` enum chứa `locked`.

**Quote (`schema.prisma:21-27`):** Same.

**Mismatch:** Enum value `locked` exist nhưng không có UC nào define transition vào/ra. V1.0 code không set nhưng schema vẫn chứa → dead state.

**Suggested fix:** Thêm Ghi chú lockout SRS UC00: "Giá trị `locked` trong `user_status` enum tồn tại như placeholder cho v1.1 R20, v1.0 code MUST NOT set. UC00 step 4 check `status='active'` đã đủ block bất kỳ status nào khác (kể cả `locked` nếu manually set)."

**Estimate fix:** ~5 phút.

---

## MINOR Findings

### LOG2-m01 — UC04A `end_date + 1 day` timezone unclear

**Suggested fix:** Note explicit dayjs/today_vn convention. ~3 phút.

### LOG2-m02 — UC03A step 7 missing `subscription.create` + `payment.success` audit

**Suggested fix:** Thêm note "Audit also includes subscription.create + payment.success per Architecture §4.4.1." ~3 phút.

### LOG2-m03 — UC05B step 3b `method='qr'` mâu thuẫn v1.0 member_code only

**Quote (SRS UC05B step 3b):** "gợi ý lễ tân check-in thủ công (`method='manual'`) hoặc quét QR (`method='qr'`)"

**Quote (SRS UC05B step 3):** "tìm `member` qua `member_code` (v1.0; RFID/QR defer v1.1 R21)"

**Suggested fix:** Bỏ `method='qr'` khỏi step 3b. ~3 phút.

---

## Sample Logic Checks (chứng minh verify)

| # | Check | Result |
|---|---|---|
| 1 | SRS UC00 step 6 vs Architecture §4.4.1 `auth.login` audit scope | MISMATCH → LOG2-M01 |
| 2 | SRS UC04B step 4 vs Architecture §4.3.3 code sample | MISMATCH → LOG2-M02 |
| 3 | Architecture §4.4.1 `user_disabled` vs Database.md `user_status` enum | MISMATCH → LOG2-C01 |
| 4 | SRS UC05B step 3 member_code only vs step 3b `method='qr'` fallback | INTERNAL MISMATCH → LOG2-m03 |
| 5 | `CURRENT_DATE` grep trong SRS body | PASS — chỉ còn trong Glossary (intentional note) |

## Cross-reference table

| Check | SRS Claim | Cross-ref | Result |
|---|---|---|---|
| UC00 lockout defer | "defer v1.1 R20, mọi failed login trả 401 generic" | Architecture §4.1.4 | MATCH |
| UC02 single-active OTP | step 5 "DELETE old OTP trong `$transaction`" | Architecture §4.1.4 + Database.md otp_codes convention | MATCH |
| UC03B 24-48h window | step 8a | Architecture §5.2 | MATCH |
| UC05B member_code only | step 3 | Architecture §3.3 | MATCH |
| UC12 completed = attended | KPI formula | Architecture §5.2 cron auto-close | MATCH |
| UC07 SLA ref | "xem Architecture.md §4.6" | Architecture §4.6 | MATCH |
| `user_disabled` reason | N/A | Architecture §4.4.1 | MISMATCH (C01) |
| `subscription.activate` UC04B | UC04B step 4 cancel only | Architecture §4.3.3 + v1.1.4 §4.4.1 | MISMATCH (M02) |
| Session `in_progress` transition | UC05B step 4 mandatory | Architecture §5.2 optional v1.0 | MISMATCH (M03) |
| `locked` enum dead state | UC00 không define transition | Database.md enum value exists | GAP (M05) |

---

## Status Table

| ID | Severity | Finding | Status | Resolution |
|---|---|---|---|---|
| LOG2-C01 | CRITICAL | `user_disabled` phantom state | FIXED (Architecture v1.1.5) | Option A — đổi `user_disabled` → `user_deleted` (map với `deleted_at IS NOT NULL`). Architecture §4.4.1 + Changelog v1.1.5. |
| LOG2-C02 | CRITICAL | Remember-me checkbox TTL undefined | FIXED (SRS v1.0.1) | Option A — bỏ checkbox khỏi UI spec UC00 step 2 + input row 3, defer v1.1 R1. |
| LOG2-M01 | MAJOR | Failed-login audit missing trong SRS | FIXED (SRS v1.0.1) | UC00 step 4b + 4c + 4d (mới) thêm audit `auth.login` payload `{success:false, reason}`. |
| LOG2-M02 | MAJOR | UC04B `subscription.activate` audit missing | FIXED (SRS v1.0.1) | UC04B step 4 thêm conditional audit `subscription.activate` với `activated_from:'cascade_cancel'`. |
| LOG2-M03 | MAJOR | UC05B `in_progress` transition contradiction | FIXED (SRS v1.0.1) | UC05B step 4 + Hậu điều kiện clarify `in_progress` optional v1.0 — cron EXISTS-based. |
| LOG2-M04 | MAJOR | UC04A path (b) audit payload undefined | FIXED (SRS v1.0.1) | UC04A step 5 clarify `subscription.renew` cover cả 2 path; immediate activation không cần audit separate. |
| LOG2-M05 | MAJOR | `users.status='locked'` orphan | FIXED (SRS v1.0.1) | UC00 Ghi chú lockout thêm note `'locked'` enum là placeholder v1.1 R20, code v1.0 MUST NOT set. |
| LOG2-m01 | MINOR | UC04A end_date+1 timezone | FIXED (SRS v1.0.1) | UC04A step 4(a) clarify `dayjs(end_date).add(1, 'day')` date-only. |
| LOG2-m02 | MINOR | UC03A step 7 audit completeness | FIXED (SRS v1.0.1) | UC03A step 7(f) thêm `subscription.create` + `payment.success` audit codes. |
| LOG2-m03 | MINOR | UC05B step 3b `method='qr'` fallback | FIXED (SRS v1.0.1) | UC05B step 3b bỏ `method='qr'`, chốt manual qua `method='manual'` + nhập member_code. |

**Total: 10/10 FIXED** (phase 10 session 2026-05-17). Architecture bump v1.1.4 → v1.1.5; SRS bump v1.0.0 → v1.0.1.
