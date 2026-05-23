# API Documentation Review — Executive Summary

| Field | Value |
|---|---|
| Document | docs/Design/API/ (8 files: README, conventions, Module-1/2/3/4/6, openapi.yaml) |
| Date | 2026-05-22 |
| Reviewer | doc-review pipeline (automated) |
| Status | INCOMPLETE — CRITICAL/MAJOR gaps FIXED 2026-05-22; Vòng 3 Reader Test chưa chạy; 4 MINOR open |

---

## Review Pipeline Status

| Vòng | Tên | Status | Score / Issues |
|---|---|---|---|
| 1a | Structure + Cross-Reference | FAIL | 61/100 (trước fix) → re-run cần confirm |
| 1b | Anti-AI Writing | PASS | AI Score: 4 (HUMAN) |
| 2 | Logic + Business Rule | FIXED (C/M) | 3C FIXED, 7M FIXED, 4m open |
| 3 | Reader Comprehension | CHƯA CHẠY | — |
| **OVERALL** | | **INCOMPLETE** | Vòng 3 pending + 4 MINOR open |

---

## Vòng 1a — Structural Fixes Applied (2026-05-22)

Các issues đã fix trong session này:

| ID | Severity | Mô tả | Status |
|---|---|---|---|
| STR-C001 | CRITICAL | Permission count "35" → "38" (Module-2, conventions) | FIXED |
| STR-C002 | CRITICAL | Stale open item `subscription.cancel` (README §9, Module-4 §3.11, §4.3) | FIXED |
| STR-M001 | MAJOR | Pagination meta `total` → `totalItems`/`totalPages` (Module-2/3/6) | FIXED |
| STR-M002 | MAJOR | Audit drift status "DRIFT" → "Listed" (Module-2/3/6) | FIXED |
| STR-M003 | MAJOR | Rate limit conflict `resend-verify` 1/60s vs 3/h — 3/h chốt authoritative | FIXED |
| STR-M004 | MAJOR | openapi.yaml thiếu `x-last-updated` + Document ID | FIXED |
| STR-M005 | MAJOR | Module-4 §7 stale RBAC notation guidance `member.read.own` | FIXED |

Chưa fix (MINOR — defer):

| ID | Severity | Mô tả |
|---|---|---|
| STR-m001 | MINOR | Glossary duplication README.md §8 vs conventions.md §22 |
| STR-m002 | MINOR | Error code name `MEMBER_CODE_GENERATION_FAILED` dùng cho room/equipment |
| STR-m003 | MINOR | openapi.yaml `OTP_INVALID` không map riêng trong responses |
| STR-m004 | MINOR | Module-2 GET /permissions example meta count cũ |
| STR-m005 | MINOR | conventions.md version chưa bump sau phase 11 §4 update |

---

## Vòng 1b — Anti-AI Writing

**PASS. AI Score: 4.** Không có AI-tells đáng kể. Writing rõ ràng human-authored với file:line references, race condition analysis, explicit gap acknowledgments.

---

## Vòng 2 — Logic Issues (cần fix trước implement)

### CRITICAL — phải fix trước khi implement

**[LOG-C001] FIXED — Module-4 v1.0.3 (2026-05-22)** `PATCH /subscriptions/:id/cancel` — Self ownership validation thiếu
- File: Module-4-Member-Subscription.md §4.3
- Vấn đề: WHEN-THEN không có branch verify `subscription.member.user_id = jwt.sub` khi caller dùng `Self` token (không có `subscription.cancel` permission). Member A có thể cancel sub của Member B nếu biết `subscription_id`.
- Fix: OwnershipGuard integrate vào §4.3 WHEN-THEN-ELSE — ownership check là WHEN branch đầu tiên. Join path `subscription → member → user` document trong Notes.

**[LOG-C002] FIXED — Module-6 v1.0.2 (2026-05-22)** Equipment dead state khi set `status='broken'` trực tiếp qua PATCH
- File: Module-6-Facility.md §5.4
- Vấn đề: `PATCH /equipment/:id` cho phép set `status='broken'` nhưng không tạo maintenance log. State machine sau đó không có exit path tiêu chuẩn.
- Fix: §5.4 thêm WHEN `body.status='broken'` → 409 `USE_MAINTENANCE_LOG_ENDPOINT`. Transition `active → broken` chỉ trigger qua POST `/equipment/:id/maintenance-logs`.

**[LOG-C003] FIXED — Module-6 v1.0.2 (2026-05-22)** Race condition: concurrent `POST /equipment/:id/maintenance-logs`
- File: Module-6-Facility.md §6.2
- Vấn đề: 2 staff đồng thời POST maintenance log → cả 2 pass `NOT EXISTS open log` check → 2 log `reported` cùng tồn tại.
- Fix: §6.2 mandate `SELECT ... FOR UPDATE` trong transaction; §9 thêm UNIQUE partial index `idx_maintenance_open ON maintenance_logs(equipment_id) WHERE status IN ('reported','repairing')` làm defense-in-depth.

### MAJOR — fix trước release

| ID | File | Mô tả ngắn | Status |
|---|---|---|---|
| LOG-M001 | Module-2-RBAC.md §4.16 | Last-owner query bug: count include current user → có thể xóa owner cuối cùng | FIXED v1.0.2 |
| LOG-M002 | Module-3-Package.md §4.4 | Implicit assumption: package editable sau khi tất cả sub expired — chưa document | FIXED v1.0.2 |
| LOG-M003 | Module-4 §4.2 | Member có thể tạo sub cho member khác — thiếu ownership check trên `POST /subscriptions` | FIXED v1.0.3 |
| LOG-M004 | Module-6-Facility.md §5.5 | `?force=true` DELETE equipment — role check "chỉ owner" không có error code, không trong query params table | FIXED v1.0.3 |
| LOG-M005 | Module-4 §4.3 | Audit code drift: `subscription.activate` vs `subscription.create` cho cascade-activated — chưa resolve | FIXED v1.0.5 |
| LOG-M006 | Module-4 §4.1 | `Self` token resolve `member_id` từ `jwt.sub` — join path không document, error case khi user không có member profile thiếu | FIXED v1.0.5 |
| LOG-M007 | Module-1-Auth.md §3.5 | `POST /auth/reset-password` xóa ALL OTP kể cả `email_verify` purpose — có thể block user đang verify email | FIXED v1.0.3 |

### MINOR

| ID | File | Mô tả |
|---|---|---|
| LOG-m001 | Module-6-Facility.md §4.4/5.4 | Empty PATCH body không có error code |
| LOG-m002 | Module-3-Package.md §4.1 | `status` filter dùng "role là member" thay vì permission code |
| LOG-m003 | conventions.md §12 vs Module-3/6 §4.3 | Retry count inconsistency: conventions 5, Module-3/6 10 |
| LOG-m004 | conventions.md §20 vs Module-6-Facility.md §1 | `maintenance_logs` hard-delete convention mâu thuẫn với "no DELETE endpoint" |

---

## Recommended Actions (cập nhật 2026-05-24)

~~1. Fix 3 CRITICAL logic gaps (LOG-C001/C002/C003) — DONE 2026-05-22~~
~~2. Fix LOG-M001, LOG-M003, LOG-M007 — DONE 2026-05-22~~
~~3. Re-run Vòng 2 Logic — DONE: tất cả C/M fixed~~

Còn lại theo priority:

1. **Chạy Vòng 3 Reader Test** — next action.
2. **Fix MINOR issues** (STR-m001..m005, LOG-m001..m004) — batch trong 1 pass trước hoặc sau Vòng 3.

---

## Files Changed This Session (2026-05-22)

| File | Thay đổi |
|---|---|
| docs/Design/API/README.md | v1.0.2 → v1.0.3. Open Items: close subscription.cancel + Architecture drift. |
| docs/Design/API/conventions.md | Không thay đổi (STR-m005 defer) |
| docs/Design/API/Module-1-Auth.md | v1.0.1 → v1.0.2. Rate limit §3.7 resolved. |
| docs/Design/API/Module-2-RBAC.md | v1.0.0 → v1.0.1. Permission count 38, meta keys, drift status. |
| docs/Design/API/Module-3-Package.md | v1.0.0 → v1.0.1. Meta keys, drift status. |
| docs/Design/API/Module-4-Member-Subscription.md | v1.0.1 → v1.0.2. subscription.cancel stale notes, §7 stale guidance. |
| docs/Design/API/Module-6-Facility.md | v1.0.0 → v1.0.1. Meta keys, §8 Audit section full table. |
| docs/Design/API/openapi.yaml | Thêm x-document-id + x-last-updated. |
| docs/Design/Architecture.md | v1.1.6 → v1.1.7. §4.4.1 thêm Room row + Equipment.update/maintenance.update. |
| CLAUDE.md | subscription.cancel stale entry fixed; Architecture status updated; Bước tiếp theo renumbered. |

---

## Post-Review Fixes (2026-05-22, cùng ngày)

Tất cả CRITICAL và MAJOR issues đã được fix ngay sau khi review report được viết, trong cùng session 2026-05-22. Review report không phản ánh điều này cho đến khi cập nhật 2026-05-24.

| ID | File → Version | Fix tóm tắt |
|---|---|---|
| LOG-C001 | Module-4 v1.0.2 → **v1.0.3** | §4.3 OwnershipGuard là WHEN branch đầu tiên; join path document trong Notes |
| LOG-C002 | Module-6 v1.0.1 → **v1.0.2** | §5.4 block direct `status='broken'` PATCH → 409 `USE_MAINTENANCE_LOG_ENDPOINT` |
| LOG-C003 | Module-6 v1.0.1 → **v1.0.2** | §6.2 `SELECT FOR UPDATE` trong transaction + UNIQUE partial index `idx_maintenance_open` tại §9 |
| LOG-M001 | Module-2 v1.0.1 → **v1.0.2** | §4.16 last-owner query thêm `JOIN users + u.deletedAt IS NULL` |
| LOG-M002 | Module-3 v1.0.1 → **v1.0.2** | §4.4 thêm Note: PATCH `durationDays`/`price` được phép khi tất cả sub đã `expired`/`cancelled` |
| LOG-M003 | Module-4 v1.0.2 → **v1.0.3** | §4.2 ownership check: member chỉ tạo sub cho chính mình; 403 error documented |
| LOG-M004 | Module-6 v1.0.2 → **v1.0.3** | §5.5 query params table cho `?force`; WHEN `FORCE_DELETE_REQUIRES_OWNER` (403) |
| LOG-M005 | Module-4 v1.0.4 → **v1.0.5** | §4.3 resolve `subscription.activate` audit drift (Architecture v1.1.4 confirmed) |
| LOG-M006 | Module-4 v1.0.4 → **v1.0.5** | §4.1 Self `member_id` resolution join path + `MEMBER_PROFILE_NOT_FOUND` error case |
| LOG-M007 | Module-1 v1.0.2 → **v1.0.3** | §3.5 scope OTP DELETE đến `purpose='password_reset'` — tránh xoá `email_verify` OTP |

Các fixes bổ sung (phát hiện khi apply):

| ID | File → Version | Fix tóm tắt |
|---|---|---|
| LOG-M008 | Module-6 v1.0.3 → **v1.0.4** | §5.5 reorder WHEN: `?force` permission check trước open-maintenance check (tránh info leak) |
| LOG-M009 | Module-4 v1.0.5 → **v1.0.6** | §4.2 `EMAIL_NOT_VERIFIED` check thêm caller role condition (Staff/Owner bypass UC03A) |
| LOG-M010 | Module-4 v1.0.5 → **v1.0.6** | §4.3 Notes clarify `package.durationDays` source trong cascade activate |

**Spec versions sau tất cả fixes:** Module-1 v1.0.4 · Module-2 v1.0.2 · Module-3 v1.0.2 · Module-4 v1.0.6 · Module-6 v1.0.4

**Còn open:** 4 MINOR (LOG-m001..m004, STR-m001..m005) + Vòng 3 Reader Test chưa chạy.
