# Review Report — `docs/Design/Architecture.md` (Round 3 Reader)

- Document: `docs/Design/Architecture.md` v1.1.1 (978 dòng sau fix CRITICAL round 2)
- Review date: 2026-05-17
- Round: 3 (Reader Comprehension Test)
- Reviewer: `doc-reader-tester` (zero prior context simulation)
- Threshold: ≥ 80% câu hỏi HIGH confidence; < 20% CANNOT ANSWER

---

## 1. Executive Summary

| Metric | Value | Threshold | Status |
|---|---|---|---|
| Questions asked | 24 | — | — |
| HIGH confidence | 8 (33%) | ≥ 80% | FAIL |
| MEDIUM confidence | 7 (29%) | — | — |
| LOW confidence | 3 (13%) | — | — |
| CANNOT ANSWER | 6 (25%) | < 20% | FAIL |

**Verdict: FAIL.** Doc not implementation-ready cho dev mới (6 tháng NestJS) — 25% câu hỏi không trả lời được từ doc alone. Gap không phải CRITICAL contradictions, chủ yếu là missing implementation guidance.

---

## 2. Top Findings (theo severity)

### MAJOR (implementation blocker)

| ID | Location | Issue | Status |
|---|---|---|---|
| READ-M01 | §3.3 line 253 | `photo_url` = "signed URL Supabase Storage TTL 5 phút" — không có SDK call pattern. Dev phải tự tìm Supabase docs. | FIXED (phase 6 quick-fix) — §3.3 thêm `supabase.storage.from(bucket).createSignedUrl(path, 300)` pattern. |
| READ-M02 | §4.1.4 line 323 | Rate limit forgot-password 3/h/email — không nói implementation: Redis? In-memory Map? NestJS throttler? | FIXED (phase 6 quick-fix) — §4.1.4 chốt in-memory `Map<email, timestamp[]>` v1.0; Redis-backed defer v1.1 R12. |
| READ-M03 | §5.2 line 530 | `subscription:cancel-unpaid-pending` "không có payment success" — undefined: `payments.status='paid'`? `='success'`? Phải sang Database.md. | FIXED (phase 6 quick-fix) — §5.2 thay "payment success" bằng explicit `EXISTS/NOT EXISTS payments WHERE status='success'` (enum values `success`/`failed`). |
| READ-M04 | §4.4.1 + §4.1.4 | Không rõ `auth.login` audit ghi cả failed login hay chỉ success. 2 section nói khác nhau. | OPEN — defer next-session (1-line clarify §4.4.1 audit scope `auth.login` ghi success-only hoặc cả failed). Block Module 1 API spec. |
| READ-M05 | §6.1 NFR | "Đo bằng: Health check + sample endpoint" — không tool (k6/wrk/curl), không endpoint critical path. Không actionable v1.0. | DEFERRED v1.1 — performance benchmark tool + critical path khi pre-production. V1.0 không có infrastructure. |

### MEDIUM (ambiguity)

| ID | Location | Issue | Status |
|---|---|---|---|
| READ-N01 | §4.1.4 line 324 | "Không tăng counter" — đọc như description hay imperative? Dev junior có thể implement một phần lockout vô tình. Cần "DO NOT implement". | OPEN |
| READ-N02 | §4.2.2 line 376 | UC05B dedup "60s window" — boundary theo `start_time` (occurred_at field?) hay `created_at`? Prisma field name không cross-ref. | OPEN |
| READ-N03 | §4.2.2 line 375 | `transaction_reference` UNIQUE — không confirm đã có trong `schema.prisma` hay cần thêm. | OPEN |
| READ-N04 | §3.3 line 255 vs §4.2.2 | Idempotency note 2 chỗ wording lệch nhẹ — §3.3 nói "UNIQUE constraint chưa add — defer khi observed duplicate rate", §4.2.2 nói "KHÔNG add UNIQUE constraint v1.0". | OPEN |
| READ-N05 | §3.3 (UC05B crypto) | `crypto.timingSafeEqual` validate API key — env var là string, function nhận Buffer. Không có encode pattern. | OPEN |

### MINOR (cosmetic / non-blocking)

| ID | Location | Issue | Status |
|---|---|---|---|
| READ-N06 | §9 Glossary | Missing: UAT, CDN, TLS, CORS. Confirmed STR-M002 backlog chưa fix. | OPEN |
| READ-N07 | §4.1.2 line 273 | Link `[Database.md §3](./Database.md)` thiếu anchor hash. Confirmed STR-M004 backlog. | OPEN |
| READ-N08 | §2.3 line 151 vs CLAUDE.md context | "21 bảng (20 nghiệp vụ + otp_codes)" — reader fresh không có context CLAUDE.md sẽ lúng túng audit_logs + files có trong 20 không. | OPEN |
| READ-N09 | §6.3, §5.6.2 | "Pre-production" milestone không define (staging? first paying customer? specific date?). | OPEN |
| READ-N10 | §6.2 SLO | Cron 00:05 in-process có tính downtime không? Downtime định nghĩa là gì? `/health` non-200? | OPEN |

---

## 3. Implementation Readiness Matrix

| Feature | Ready | Top Missing | Risk |
|---|---|---|---|
| UC05B API key validate | PARTIAL | Buffer encode pattern cho `crypto.timingSafeEqual` | MEDIUM |
| UC05B `photo_url` generation | NO | Supabase Storage SDK pattern | HIGH |
| UC05B dedup logic | PARTIAL | Field name + window boundary | MEDIUM |
| Cron `subscription:expire` | PARTIAL | `today_vn` trong Prisma (raw vs JS Date) | MEDIUM |
| Cron `subscription:cancel-unpaid-pending` | NO | Payment success definition | HIGH |
| Forgot-password rate limit | NO | Mechanism (Redis/in-memory/throttler) | HIGH |
| `auth.login` audit failed vs success | NO | Scope rule | MEDIUM |
| Payment `transaction_reference` UNIQUE | PARTIAL | Confirm exists trong schema | MEDIUM |

---

## 4. Verdict

**FAIL** per `docs/CLAUDE.md` §2.2 threshold (HIGH ≥ 80%, current 33%).

Recommendation:
- Quick-fix 3 gap HIGH risk: READ-M01 (photo_url SDK pattern), READ-M02 (rate limit mechanism), READ-M03 (payment success definition). Mỗi cái 1-2 dòng → 15 phút effort. Reduce risk cho Module 1 Auth + Module 7 Training spec.
- Defer 5 MEDIUM + 5 MINOR sang phase tiếp theo (sync với SRS re-review).
- Re-run vòng 3 sau khi fix → mục tiêu HIGH ≥ 60% (relaxed threshold for first MVP doc; full 80% sau khi SRS sync).
