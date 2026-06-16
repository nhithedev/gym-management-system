# Employee Performance Report — Month/Quarter Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-form date range picker on the Employee Performance Report page with a 3-mode segmented control (Tháng / Quý / Tùy chỉnh), where Month and Quarter modes auto-compute from/to dates and auto-fetch.

**Architecture:** All changes are frontend-only in one file. Helper functions compute YYYY-MM-DD date ranges from (year, month) or (year, quarter). The existing API call signature is unchanged. Month and Quarter modes auto-fetch via useEffect; Custom mode keeps the manual "Xem báo cáo" button.

**Tech Stack:** React, TypeScript, Tailwind CSS, Radix UI via `OwnerSelect` component, existing `rogym-filter-chip` CSS class for segmented control.

---

### Task 1: Replace filter state and add date helpers

**Files:**
- Modify: `client/src/pages/owner/reports/EmployeePerformanceReportPage.tsx`

- [ ] **Step 1: Read the current file to confirm starting state**

  Run: open `client/src/pages/owner/reports/EmployeePerformanceReportPage.tsx` in editor or use Read tool.
  Confirm top of file imports `todayInput, monthStart` from `@/lib/date` and `OwnerDateRangeFilter` from `@/components/OwnerUI`.

- [ ] **Step 2: Replace imports**

  Remove `todayInput, monthStart` from `@/lib/date` import (still need `todayInput` for custom mode max).
  Remove `OwnerDateRangeFilter` from `@/components/OwnerUI` import.
  Add `OwnerSelect` to `@/components/OwnerUI` import.
  Add `LoaderCircle` from `lucide-react`.

  New import block at top of file:

  ```tsx
  import { useEffect, useState, useCallback } from 'react'
  import { LoaderCircle } from 'lucide-react'
  import { getApiError } from '@/lib/api-error'
  import { todayInput } from '@/lib/date'
  import { reportService, type EmployeePerformanceItem } from '@/services/report.service'
  import {
    OwnerEmptyState,
    OwnerErrorState,
    OwnerPage,
    OwnerPageHeader,
    OwnerSkeleton,
    OwnerBadge,
    OwnerSelect,
  } from '@/components/OwnerUI'
  import { scoreColor, scoreLabel } from '@/lib/score-utils'
  ```

- [ ] **Step 3: Add constants and helpers above the component**

  Insert after imports, before `export default function`:

  ```tsx
  type FilterMode = 'month' | 'quarter' | 'custom'

  const _now = new Date()
  const CURRENT_YEAR = _now.getFullYear()
  const CURRENT_MONTH = _now.getMonth() + 1
  const CURRENT_QUARTER = Math.ceil(CURRENT_MONTH / 3)
  const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i)

  const MONTH_OPTIONS = [
    { value: 1, label: 'Tháng 1' },
    { value: 2, label: 'Tháng 2' },
    { value: 3, label: 'Tháng 3' },
    { value: 4, label: 'Tháng 4' },
    { value: 5, label: 'Tháng 5' },
    { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' },
    { value: 8, label: 'Tháng 8' },
    { value: 9, label: 'Tháng 9' },
    { value: 10, label: 'Tháng 10' },
    { value: 11, label: 'Tháng 11' },
    { value: 12, label: 'Tháng 12' },
  ]

  const QUARTER_OPTIONS = [
    { value: 1, label: 'Quý 1 (Jan – Mar)' },
    { value: 2, label: 'Quý 2 (Apr – Jun)' },
    { value: 3, label: 'Quý 3 (Jul – Sep)' },
    { value: 4, label: 'Quý 4 (Oct – Dec)' },
  ]

  function pad(n: number) {
    return String(n).padStart(2, '0')
  }

  function getMonthRange(year: number, month: number): { from: string; to: string } {
    const lastDay = new Date(year, month, 0).getDate()
    return {
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${pad(lastDay)}`,
    }
  }

  function getQuarterRange(year: number, quarter: number): { from: string; to: string } {
    const startMonth = (quarter - 1) * 3 + 1
    const endMonth = quarter * 3
    const lastDay = new Date(year, endMonth, 0).getDate()
    return {
      from: `${year}-${pad(startMonth)}-01`,
      to: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
    }
  }
  ```

- [ ] **Step 4: Replace component state**

  Replace the existing 5 state declarations:
  ```tsx
  // OLD — delete these 5 lines
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayInput)
  const [data, setData] = useState<EmployeePerformanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  ```

  With:
  ```tsx
  const [mode, setMode] = useState<FilterMode>('month')
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(CURRENT_MONTH)
  const [quarter, setQuarter] = useState(CURRENT_QUARTER)
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  })
  const [customTo, setCustomTo] = useState(todayInput)
  const [data, setData] = useState<EmployeePerformanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  ```

- [ ] **Step 5: Refactor load callback and add auto-fetch effect**

  Replace the existing `load` callback and `useEffect`:

  ```tsx
  // OLD — delete these
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    reportService
      .getEmployeePerformance(from, to)
      .then(setData)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])
  ```

  With:

  ```tsx
  const load = useCallback((from: string, to: string) => {
    setLoading(true)
    setError(null)
    reportService
      .getEmployeePerformance(from, to)
      .then(setData)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false))
  }, [])

  // Auto-fetch for month/quarter; custom mode uses button
  useEffect(() => {
    if (mode === 'month') {
      const range = getMonthRange(year, month)
      load(range.from, range.to)
    } else if (mode === 'quarter') {
      const range = getQuarterRange(year, quarter)
      load(range.from, range.to)
    }
  }, [mode, year, month, quarter, load])
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/pages/owner/reports/EmployeePerformanceReportPage.tsx
  git commit -m "refactor(reports): replace employee filter state with month/quarter/custom modes"
  ```

---

### Task 2: Replace filter UI

**Files:**
- Modify: `client/src/pages/owner/reports/EmployeePerformanceReportPage.tsx`

- [ ] **Step 1: Replace `<OwnerDateRangeFilter ... />` with new filter block**

  In the JSX, find and delete:
  ```tsx
  <OwnerDateRangeFilter
    from={from}
    to={to}
    onFromChange={setFrom}
    onToChange={setTo}
    onLoad={load}
    loading={loading}
  />
  ```

  Replace with:

  ```tsx
  {/* Filter */}
  <div className="rogym-card rogym-card--compact space-y-4 p-5">
    {/* Segmented control */}
    <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 w-fit">
      {(['month', 'quarter', 'custom'] as FilterMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`rogym-filter-chip rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === m ? 'is-active' : ''
          }`}
        >
          {m === 'month' ? 'Tháng' : m === 'quarter' ? 'Quý' : 'Tùy chỉnh'}
        </button>
      ))}
    </div>

    {/* Dynamic inputs */}
    <div className="flex flex-wrap items-end gap-4">
      {(mode === 'month' || mode === 'quarter') && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium rogym-text-dim">Năm</label>
            <OwnerSelect
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
              ariaLabel="Năm"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </OwnerSelect>
          </div>

          {mode === 'month' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Tháng</label>
              <OwnerSelect
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
                ariaLabel="Tháng"
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </OwnerSelect>
            </div>
          )}

          {mode === 'quarter' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium rogym-text-dim">Quý</label>
              <OwnerSelect
                value={String(quarter)}
                onValueChange={(v) => setQuarter(Number(v))}
                ariaLabel="Quý"
              >
                {QUARTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </OwnerSelect>
            </div>
          )}
        </>
      )}

      {mode === 'custom' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium rogym-text-dim">Từ ngày</label>
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rogym-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium rogym-text-dim">Đến ngày</label>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayInput()}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rogym-input"
            />
          </div>
          <button
            className="rogym-btn rogym-btn--primary self-end"
            onClick={() => load(customFrom, customTo)}
            disabled={loading}
          >
            {loading && <LoaderCircle size={15} className="animate-spin" />}
            Xem báo cáo
          </button>
        </>
      )}
    </div>
  </div>
  ```

- [ ] **Step 2: Verify the final file compiles**

  Run from `client/`:
  ```bash
  npm run build
  ```
  Expected: no TypeScript errors. If there are errors, fix them before committing.

- [ ] **Step 3: Commit**

  ```bash
  git add client/src/pages/owner/reports/EmployeePerformanceReportPage.tsx
  git commit -m "feat(reports): add month/quarter filter to employee performance page"
  ```

---

### Task 3: Manual verification

**Files:** none (read-only verification)

- [ ] **Step 1: Start dev server**

  ```bash
  cd client && npm run dev
  ```

- [ ] **Step 2: Navigate to the page**

  Open `http://localhost:5173`, log in as owner, go to Báo cáo → Hiệu suất nhân viên.

- [ ] **Step 3: Verify default state**

  On load: segmented control shows "Tháng" active, year = current year, month = current month, table populates automatically (no button click needed).

- [ ] **Step 4: Verify Month mode**

  Change month dropdown → table refreshes without button click.
  Change year dropdown → table refreshes without button click.
  Check a past month with known data to confirm the date range is correct (e.g., Tháng 1 / 2025 should show schedules from 2025-01-01 to 2025-01-31).

- [ ] **Step 5: Verify Quarter mode**

  Click "Quý" tab.
  Year + quarter dropdowns appear, month dropdown disappears.
  Change quarter → table refreshes automatically.
  Verify Q1/2025 = Jan–Mar 2025 by comparing against known data.

- [ ] **Step 6: Verify Custom mode**

  Click "Tùy chỉnh" tab.
  Year/quarter dropdowns disappear, date pickers appear with "Xem báo cáo" button.
  Changing date inputs alone does NOT trigger a fetch.
  Clicking "Xem báo cáo" triggers fetch.

- [ ] **Step 7: Verify switching modes resets correctly**

  Switch from Tháng → Quý → Tùy chỉnh → Tháng. Table should reload with correct data each time Tháng or Quý is selected (auto-fetch).
