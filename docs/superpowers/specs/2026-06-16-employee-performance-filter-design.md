# Employee Performance Report — Month/Quarter Filter

**Date:** 2026-06-16
**Scope:** `client/src/pages/owner/reports/EmployeePerformanceReportPage.tsx` only. Backend unchanged.

## Problem

The current filter is a free-form date range picker (from/to). Users cannot quickly select a specific month or quarter without manually computing start/end dates.

## Solution

Replace the existing filter with a segmented control that supports 3 modes: Month, Quarter, Custom range. Month and Quarter modes compute `from`/`to` dates in the frontend before calling the existing API.

## UI Layout

```
[Tháng]  [Quý]  [Tùy chỉnh]    ← segmented control (3 buttons)

// Mode: Tháng
[Dropdown năm ▾]  [Dropdown tháng ▾]

// Mode: Quý
[Dropdown năm ▾]  [Dropdown quý ▾]

// Mode: Tùy chỉnh
Từ [date input]  Đến [date input]  [Xem báo cáo]
```

## Behavior

- **Default on load:** Mode = Tháng, year = current year, month = current month. Fetches data immediately.
- **Month/Quarter mode:** Any dropdown change triggers API call automatically. No confirm button.
- **Custom mode:** Requires "Xem báo cáo" button click to fetch (same as current behavior).
- **Year range:** 2020 to current year (inclusive).

## Date Range Computation (frontend only)

| Mode | Selection | from | to |
|------|-----------|------|----|
| Tháng | Tháng 3 / 2025 | 2025-03-01 | 2025-03-31 |
| Quý | Quý 1 / 2025 | 2025-01-01 | 2025-03-31 |
| Quý | Quý 2 / 2025 | 2025-04-01 | 2025-06-30 |
| Quý | Quý 3 / 2025 | 2025-07-01 | 2025-09-30 |
| Quý | Quý 4 / 2025 | 2025-10-01 | 2025-12-31 |
| Tùy chỉnh | user input | user-selected | user-selected |

Month end date uses `new Date(year, month, 0)` to get the last day correctly (handles 28/29/30/31 day months).

## Quarter Definitions

- Q1: tháng 1–3
- Q2: tháng 4–6
- Q3: tháng 7–9
- Q4: tháng 10–12

## Dropdown Options

**Năm:** 2020, 2021, ..., current year (ascending, default = current year).

**Tháng:** Tháng 1 – Tháng 12 (default = current month).

**Quý:** Quý 1 – Quý 4 (default = current quarter based on current month).

## State Shape

```typescript
type FilterMode = 'month' | 'quarter' | 'custom';

// Month mode
{ mode: 'month', year: number, month: number }  // month: 1-12

// Quarter mode
{ mode: 'quarter', year: number, quarter: number }  // quarter: 1-4

// Custom mode
{ mode: 'custom', from: string, to: string }  // YYYY-MM-DD
```

## Constraints

- Backend API signature unchanged: `getEmployeePerformance(from: string, to: string)`.
- No new files — all changes in `EmployeePerformanceReportPage.tsx`.
- Style follows existing Tailwind/MD3 tokens used on the page.
