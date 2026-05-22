# API Documentation Review — Executive Summary

| Field | Value |
|---|---|
| Document | docs/Design/API/ (8 files: README, conventions, Module-1/2/3/4/6, openapi.yaml) |
| Date | 2026-05-22 |
| Reviewer | doc-review pipeline (automated) |
| Status | INCOMPLETE — Vòng 3 Reader Test chưa chạy |

---

## Review Pipeline Status

| Vòng | Tên | Status | Score / Issues |
|---|---|---|---|
| 1a | Structure + Cross-Reference | FAIL | 61/100 (trước fix) → re-run cần confirm |
| 1b | Anti-AI Writing | PASS | AI Score: 4 (HUMAN) |
| 2 | Logic + Business Rule | FAIL | 3C, 7M, 4m |
| 3 | Reader Comprehension | CHƯA CHẠY | — |
| **OVERALL** | | **FAIL** | |

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

**[LOG-C001]** `PATCH /subscriptions/:id/cancel` — Self ownership validation thiếu
- File: Module-4-Member-Subscription.md §4.3
- Vấn đề: WHEN-THEN không có branch verify `subscription.member.user_id = jwt.sub` khi caller dùng `Self` token (không có `subscription.cancel` permission). Member A có thể cancel sub của Member B nếu biết `subscription_id`.
- Fix cần: Thêm WHEN: `WHEN subscription.member.user_id != jwt.sub AND caller không có subscription.cancel → 403 FORBIDDEN`. Document OwnershipGuard join path: `subscription → member → user`.

**[LOG-C002]** Equipment dead state khi set `status='broken'` trực tiếp qua PATCH
- File: Module-6-Facility.md §5.4, §6.2
- Vấn đề: `PATCH /equipment/:id` cho phép set `status='broken'` nhưng không tạo maintenance log. State machine sau đó không có exit path tiêu chuẩn (§6.3 cần log ở `reported` để transition `reported→repairing`). Equipment stuck ở `broken` là dead state.
- Fix cần: Hoặc block direct `broken` PATCH (chỉ trigger qua POST maintenance-log), hoặc auto-create log khi set `broken`. Thêm error code `USE_MAINTENANCE_LOG_ENDPOINT`.

**[LOG-C003]** Race condition: concurrent `POST /equipment/:id/maintenance-logs`
- File: Module-6-Facility.md §6.2
- Vấn đề: 2 staff đồng thời POST maintenance log → cả 2 pass `NOT EXISTS open log` check → 2 log `reported` cùng tồn tại, phá vỡ invariant "max 1 open log per equipment". Không có locking strategy được document.
- Fix cần: Thêm `SELECT FOR UPDATE` hoặc UNIQUE partial index `(equipment_id) WHERE status IN ('reported','repairing')`. Document trong §6.2 Notes giống Module-4 §4.3 race condition pattern.

### MAJOR — fix trước release

| ID | File | Mô tả ngắn |
|---|---|---|
| LOG-M001 | Module-2-RBAC.md §4.16 | Last-owner query bug: count include current user → có thể xóa owner cuối cùng |
| LOG-M002 | Module-3-Package.md §4.4 | Implicit assumption: package editable sau khi tất cả sub expired — chưa document |
| LOG-M003 | Module-4 §4.2 | Member có thể tạo sub cho member khác — thiếu ownership check trên `POST /subscriptions` |
| LOG-M004 | Module-6-Facility.md §5.5 | `?force=true` DELETE equipment — role check "chỉ owner" không có error code, không trong query params table |
| LOG-M005 | Module-4 §4.3 | Audit code drift: `subscription.activate` vs `subscription.create` cho cascade-activated — chưa resolve |
| LOG-M006 | Module-4 §4.1 | `Self` token resolve `member_id` từ `jwt.sub` — join path không document, error case khi user không có member profile thiếu |
| LOG-M007 | Module-1-Auth.md §3.5 | `POST /auth/reset-password` xóa ALL OTP kể cả `email_verify` purpose — có thể block user đang verify email |

### MINOR

| ID | File | Mô tả |
|---|---|---|
| LOG-m001 | Module-6-Facility.md §4.4/5.4 | Empty PATCH body không có error code |
| LOG-m002 | Module-3-Package.md §4.1 | `status` filter dùng "role là member" thay vì permission code |
| LOG-m003 | conventions.md §12 vs Module-3/6 §4.3 | Retry count inconsistency: conventions 5, Module-3/6 10 |
| LOG-m004 | conventions.md §20 vs Module-6-Facility.md §1 | `maintenance_logs` hard-delete convention mâu thuẫn với "no DELETE endpoint" |

---

## Recommended Actions (theo priority)

1. **Fix 3 CRITICAL logic gaps** (LOG-C001/C002/C003) — 30-45 phút. Chủ yếu là thêm WHEN-THEN branches và Notes vào Module-4 §4.3 và Module-6 §5.4/6.2.
2. **Fix LOG-M001, LOG-M003, LOG-M007** — high security/data integrity risk.
3. **Re-run Vòng 2 Logic** sau khi fix CRITICAL để confirm clean.
4. **Chạy Vòng 3 Reader Test** sau khi Logic pass.
5. **Fix MINOR issues** (STR-m001..m005, LOG-m001..m004) — có thể batch trong 1 pass.

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
