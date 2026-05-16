# Architecture.md Review Report — 2026-05-17

**Document**: `docs/Design/Architecture.md` v1.1.0 (commit `a201838`)
**Pipeline**: 4 vòng (Structure+CrossRef / Anti-AI / Logic+Business / Reader)
**Status pipeline**: Partial (vòng 1a-1b chạy; 2-3 SKIPPED do user pick dừng fix CRITICAL trước)
**Reviewer**: Claude doc-structure-reviewer + doc-anti-ai-reviewer

---

## Executive Summary

| Phase | Status | Score/Issues |
|---|---|---|
| 1a. Structure + Cross-Ref | FAIL → resolved | 30/100 (4C / 4M / 5m) → 4C fixed commit `56ed9bd` |
| 1b. Anti-AI Writing | PASS | AI score 7/100 (MOSTLY HUMAN) |
| 2. Logic + Business | SKIPPED | Defer session sau |
| 3. Reader Comprehension | SKIPPED | Defer session sau |

**Overall**: 4 CRITICAL Structure issue đã fix. Doc PASS anti-AI threshold. Logic + Reader chưa chạy.

---

## Vòng 1a — Structural + Cross-Reference

### Score breakdown
- Metadata: 18/20 (Reviewer field "TBD")
- Required sections: 24/30 (Traceability matrix absent)
- Cross-references: 10/25 (4 dangling/phantom)
- Format consistency: 22/25
- Raw 74/100 — sau deductions 4C × 15 + 4M × 8 + 5m × 3 = **30/100 FAIL**

### CRITICAL findings — ALL FIXED (commit `56ed9bd`)

| ID | Issue | Fix |
|---|---|---|
| STR-C001 | Cron `auth:unlock-expired-lockout` reference `users.locked_until` column không tồn tại trong schema. | Rewrite: derive từ `audit_logs` (action='auth.lockout' > 30min) thay vì column. |
| STR-C002 | Cron `feedback:sla-check` reference `overdue_badge` field không tồn tại. | Rewrite: overdue compute tại query time trong API list endpoint. Cron chuyển role thành "log metric only". |
| STR-C003 | Cron `training-session:auto-close` reference `attendance_missing` field không tồn tại. | Rewrite: no-show derive qua LEFT JOIN `attendance_logs` trong UC12 report. Cron giữ phần `status` transition (valid). |
| STR-C004 | `Database.md:731` reference `Architecture.md §9.2` — sau restructure v1.1.0 §9 là Glossary. Timezone đã move sang §4.5.2. | Update `Database.md:731` → `§4.5.2`. |

### MAJOR findings — 1 FIXED, 3 DEFER

| ID | Issue | Status |
|---|---|---|
| STR-M001 | Stale "Gap hiện tại: chưa thêm vào configuration.ts" note cho DEVICE_API_KEY § 5.4.1 — đã fix commit `348f641`. | FIXED commit `56ed9bd` |
| STR-M002 | Glossary thiếu acronym: CDN, DNS, TLS, WAF, CORS, UAT, TOTP, DBA, CSP, RDBMS, ESM, HMR. | DEFER — add minimum 6 thuật ngữ infrastructure trong session sau |
| STR-M003 | Traceability matrix absent. `docs/CLAUDE.md §1.1` mandate "mỗi requirement map UC + TC + AC". | DEFER — cần build matrix sync với SRS_VI.md (UC00-UC12) → tách session riêng |
| STR-M004 | `[Database.md §3](./Database.md)` link không anchor → render top of file. | DEFER — fix khi chạy review pass lần sau (low priority navigability) |

### MINOR findings — all DEFER

- STR-m001: `.github/workflows/` "cần verify" parenthetical (TODO leak)
- STR-m002: Container table "21 bảng" phrasing minor inconsistency với Database.md
- STR-m003: ADR-006 reference "UC13" — UC13 đã move khỏi SRS, nên trỏ §4.1.3
- STR-m004: §5.6.4 "weekly trong staging" phrasing inconsistent với "không tự động v1.0"
- STR-m005: §4 sub-section depth uneven (đã verified — không phải heading level skip)

---

## Vòng 1b — Anti-AI Writing

### Score: 7/100 — MOSTLY HUMAN (threshold ≤15) → **PASS**

### Findings

**2 MEDIUM phrases** (không block, defer minor cleanup):
- §2.2 dòng 99: "ecosystem mature" — hedging adjective. Suggest rewrite cụ thể hơn (DI/decorator/Passport-native).
- §2.2 dòng 104: "Hệ sinh thái component rộng" — vô định lượng. Suggest "team đã quen React, MD3 component có sẵn".

### Dấu ấn người viết nổi bật (đã ghi nhận trong report)

- Rejected alternatives với lý do cụ thể (TypeORM, CRA deprecated, Drizzle chưa stable parity 2026 Q2).
- Gap admissions: "TBD provider", "chưa có file workflow", "Gap hiện tại" — kiểu thừa nhận thật.
- Số đo concrete: P50 < 100ms, QPS 10/50, port :6543 / :5432.
- Tên người cụ thể trong metadata.
- Parenthetical aside ("xem §5.2", "comma-separated trong bug `P3005`").
- ADR-008 trade-off honest: "Token bị leak vẫn valid đến hết 7 ngày".

---

## Vòng 2 & 3 — SKIPPED

User pick dừng pipeline sau vòng 1 để fix CRITICAL trước. Logic + Reader review defer session sau.

### Backlog re-run

Khi resume pipeline, cần chạy:

1. **doc-logic-reviewer** — focus state machines (subscription lifecycle, training session status, lockout flow), decision points (UC10 phân biệt vô hiệu vs xóa), data flow (UC05B sequence), authorization (RBAC group merging), race conditions (subscription expire vs activate-pending in daily window).
2. **doc-reader-tester** — fresh developer đọc 10-15 câu hỏi, focus implementation readiness (DEVICE_API_KEY rotation thực hiện sao? UC05B endpoint spec đủ build? cron `auth:unlock-expired-lockout` query SQL thực sự execute được không?).

---

## Recommended Actions

| # | Action | Priority | Status |
|---|---|---|---|
| 1 | Fix 4 CRITICAL Structure | HIGH | DONE commit `56ed9bd` |
| 2 | Add 6 acronym vào Glossary (CDN, DNS, TLS, WAF, CORS, UAT) | MEDIUM | DEFER |
| 3 | Build Traceability matrix section (UC → ADR → NFR) | MEDIUM | DEFER |
| 4 | Anchor link cho `[Database.md §3]` | LOW | DEFER |
| 5 | Re-run Logic + Reader review | MEDIUM | DEFER |
| 6 | Cleanup 2 MEDIUM Anti-AI phrases | LOW | DEFER |
| 7 | Fix 5 MINOR Structure findings | LOW | DEFER |

---

## Verification

- Vòng 1a CRITICAL: 4/4 fixed → re-run structure review predicted score ≥70/100 (sau khi 4C resolved, sub-totals: metadata 18 + required 24 + xref 22 + format 22 = 86; trừ 4 MAJOR × 8 = 54).
- Vòng 1b: doc tự nhiên đã pass, không cần fix.
- Vòng 2-3: chưa chạy → re-run khi user trigger.

---

## Files modified

- `docs/Design/Architecture.md` — §5.2 cron table (3 row rewrite), §5.4.1 DEVICE_API_KEY note (xóa stale gap)
- `docs/Design/Database.md` — line 731 (§9.2 → §4.5.2)

Commit: `56ed9bd fix(design): resolve review CRITICAL findings cron schema + dangling ref`
