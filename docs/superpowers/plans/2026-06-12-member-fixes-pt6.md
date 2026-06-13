# Member Fixes PT-6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 member-page improvements: realtime subscription expiry detection, merged calendar+list view, attendance tab, and in-place package switching.

**Architecture:**
- Expiry detection: `useSubscriptionExpiry` hook (1-minute API poll) mounted in `DashboardLayout`; when active sub disappears, sets `hasActiveSub=false`, shows toast, navigates to setup.
- Merged calendar: remove toggle from `WorkoutSchedulePage`, show `CalendarView` (65%) + `SessionSidebar` (35%) side-by-side in one view.
- Attendance tab: add top-level tab nav (Lich tap / Diem danh) to `WorkoutSchedulePage`; attendance tab loads `AttendanceLog` records for the current member.
- Package switch: `POST /subscriptions/:id/switch` atomically cancels current active sub + creates new active sub starting today; `CurrentPackagePage` adds "Chuyen goi" button + package picker dialog.

**Tech Stack:** React 18, TypeScript, Zustand, NestJS, Prisma, Tailwind

---

## File Map

| File | Create/Modify | Purpose |
|------|--------------|---------|
| `client/src/hooks/useSubscriptionExpiry.ts` | Create | Poll subscription status every 60s |
| `client/src/layouts/DashboardLayout.tsx` | Modify | Mount expiry hook + expiry toast |
| `client/src/pages/member/workout/WorkoutSchedulePage.tsx` | Modify | Merged layout + attendance tab |
| `client/src/services/subscription.service.ts` | Modify | Add `switchPackage` method |
| `client/src/pages/member/subscription/CurrentPackagePage.tsx` | Modify | Add switch button + package picker modal |
| `server/src/subscriptions/dto/switch-subscription.dto.ts` | Create | DTO for switch endpoint |
| `server/src/subscriptions/subscriptions.service.ts` | Modify | Add `switchSubscription` method |
| `server/src/subscriptions/subscriptions.controller.ts` | Modify | Add `POST /:id/switch` endpoint |

---

## Task 1: Realtime Subscription Expiry Detection

**Files:**
- Create: `client/src/hooks/useSubscriptionExpiry.ts`
- Modify: `client/src/layouts/DashboardLayout.tsx`

- [ ] **Step 1: Create the expiry hook**

Create `client/src/hooks/useSubscriptionExpiry.ts`:

```typescript
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import subscriptionService from '@/services/subscription.service'

const POLL_INTERVAL_MS = 60_000

export function useSubscriptionExpiry(onExpired: () => void) {
  const memberId = useAuthStore(s => s.user?.memberId)
  const hasActiveSub = useSubscriptionStore(s => s.hasActiveSub)
  const setHasActiveSub = useSubscriptionStore(s => s.setHasActiveSub)
  const callbackRef = useRef(onExpired)
  callbackRef.current = onExpired

  useEffect(() => {
    if (!memberId || hasActiveSub !== true) return

    const check = async () => {
      try {
        const subs = await subscriptionService.getByMember(memberId)
        const today = new Date()
        const stillActive = subs.some(
          s => s.status === 'active' && new Date(s.endDate) >= today
        )
        if (!stillActive) {
          setHasActiveSub(false)
          callbackRef.current()
        }
      } catch {
        // mang loi → khong tu dong expire de tranh false positive
      }
    }

    const id = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [memberId, hasActiveSub, setHasActiveSub])
}
```

- [ ] **Step 2: Modify DashboardLayout to use the hook**

Read current `client/src/layouts/DashboardLayout.tsx` first, then replace with:

```typescript
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/shared/Sidebar';
import Topbar from '@/components/shared/Topbar';
import { PageSkeleton } from '@/components/shared/PageUI';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import subscriptionService from '@/services/subscription.service';
import { useSubscriptionExpiry } from '@/hooks/useSubscriptionExpiry';

export default function DashboardLayout() {
  const user = useAuthStore((state) => state.user);
  const hasActiveSub = useSubscriptionStore((state) => state.hasActiveSub);
  const setHasActiveSub = useSubscriptionStore((state) => state.setHasActiveSub);
  const [showExpiryToast, setShowExpiryToast] = useState(false);
  const navigate = useNavigate();

  const isMember = user?.roles[0] === 'member';

  useEffect(() => {
    if (!isMember || hasActiveSub !== null || !user?.memberId) return;
    subscriptionService.getByMember(user.memberId).then((subs) => {
      setHasActiveSub(subs.some((s) => s.status === 'active'));
    }).catch(() => {
      setHasActiveSub(false);
    });
  }, [isMember, hasActiveSub, user?.memberId, setHasActiveSub]);

  useSubscriptionExpiry(() => {
    if (!isMember) return;
    setShowExpiryToast(true);
    setTimeout(() => {
      setShowExpiryToast(false);
      navigate('/member/subscription/setup', { replace: true });
    }, 3000);
  });

  const showSidebar = isMember ? hasActiveSub === true : true;

  return (
    <div className={`rogym-dashboard-layout min-h-screen bg-[#080e0b] ${showSidebar ? 'has-sidebar' : ''}`}>
      {showSidebar && <Sidebar />}
      <div className="flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          {showExpiryToast && (
            <div className="fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl bg-red-900/90 text-red-200 text-sm font-medium shadow-xl border border-red-700/40">
              Goi tap da het han. Dang chuyen ve trang dang ky...
            </div>
          )}
          <Suspense fallback={<PageSkeleton rows={4} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on the two new/modified files.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useSubscriptionExpiry.ts client/src/layouts/DashboardLayout.tsx
git commit -m "feat: detect subscription expiry in realtime with 1-min poll"
```

---

## Task 2 + 3: Merged Calendar View + Attendance Tab

**Files:**
- Modify: `client/src/pages/member/workout/WorkoutSchedulePage.tsx`

Two changes combined in one file:
- Remove the `PillToggle` / `ViewMode` toggle, render `CalendarView` (65%) + `SessionSidebar` (35%) always in a CSS grid.
- Add top-level tab navigation: "Lich tap" (shows the split grid) vs "Diem danh" (shows `AttendanceTab`).

- [ ] **Step 5: Read current WorkoutSchedulePage.tsx**

Read `client/src/pages/member/workout/WorkoutSchedulePage.tsx` in full before editing.

- [ ] **Step 6: Add necessary imports**

Ensure these imports are present at top of file:

```typescript
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar, CalendarX, ChevronLeft, ChevronRight,
  Clock, MapPin, User, ArrowLeftRight,
} from 'lucide-react'
import { trainingService, type TrainingSession, type AttendanceLog } from '@/services/training.service'
import { useAuthStore } from '@/stores/authStore'
import {
  MemberEmptyState, MemberErrorState, MemberPage,
  MemberPageHeader, MemberSkeleton,
} from '../components/MemberUI'
import { getApiError } from '@/lib/api-error'
```

- [ ] **Step 7: Add constants and helpers**

After existing `STATUS_LABEL`, add:

```typescript
const METHOD_LABEL: Record<string, { label: string; tone: string }> = {
  realtime: { label: 'Thiet bi', tone: 'info' },
  manual:   { label: 'Nhan vien', tone: 'warning' },
  qr:       { label: 'QR',        tone: 'muted' },
}
```

Add helper functions (after existing helpers):

```typescript
function fmtDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return '--'
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  if (mins < 60) return `${mins} phut`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function fmtDateGroup(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}
```

- [ ] **Step 8: Add AttendanceTab component**

Add before the main `WorkoutSchedulePage` export:

```typescript
function AttendanceTab({ memberId }: { memberId: string }) {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    trainingService.getAttendance({ memberId, pageSize: 100 })
      .then(res => {
        const sorted = [...res.data].sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
        setLogs(sorted)
      })
      .catch(err => setError(getApiError(err, 'Khong the tai du lieu diem danh.')))
      .finally(() => setLoading(false))
  }, [memberId])

  if (loading) return <MemberSkeleton rows={4} />
  if (error) return <MemberErrorState message={error} />

  if (logs.length === 0) {
    return (
      <MemberEmptyState
        title="Chua co lan diem danh nao"
        description="Du lieu diem danh cua ban se hien thi o day sau khi check-in."
      />
    )
  }

  const groups = new Map<string, AttendanceLog[]>()
  for (const log of logs) {
    const key = fmtDateGroup(log.startTime)
    const arr = groups.get(key) ?? []
    arr.push(log)
    groups.set(key, arr)
  }

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([dateLabel, group]) => (
        <section key={dateLabel} className="rounded-[20px] p-5 rogym-sx-25952519">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider rogym-sx-ed519d00">
            {dateLabel}
          </h3>
          <div className="space-y-2">
            {group.map(log => {
              const method = METHOD_LABEL[log.method] ?? { label: log.method, tone: 'muted' }
              return (
                <div
                  key={log.attendanceId}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 rogym-sx-a15e2a7c"
                >
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="rogym-sx-f27dac31 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {fmtTime(log.startTime)}
                        {log.endTime ? ` → ${fmtTime(log.endTime)}` : ''}
                      </p>
                      <p className="text-xs rogym-sx-5e5c39ab mt-0.5">
                        {fmtDuration(log.startTime, log.endTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="rogym-tone-badge" data-tone={method.tone}>
                      {method.label}
                    </span>
                    {log.sessionId && (
                      <span className="rogym-tone-badge" data-tone="success">
                        Buoi PT
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 9: Replace main WorkoutSchedulePage export**

Remove the `ViewMode` type, `PillToggle`, and `view` state. Replace `WorkoutSchedulePage`:

```typescript
type PageTab = 'schedule' | 'attendance'

export default function WorkoutSchedulePage() {
  const memberId = useAuthStore(s => s.user?.memberId) ?? ''
  const [tab, setTab] = useState<PageTab>('schedule')
  const [upcoming, setUpcoming] = useState<TrainingSession[]>([])
  const [past, setPast] = useState<TrainingSession[]>([])
  const [all, setAll] = useState<TrainingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      trainingService.getSessions({ status: 'scheduled', pageSize: 50, sort: 'start_time:asc' }),
      trainingService.getSessions({ status: 'completed', pageSize: 30, sort: 'start_time:desc' }),
      trainingService.getSessions({ status: 'cancelled', pageSize: 30, sort: 'start_time:desc' }),
    ])
      .then(([upRes, doneRes, cancelRes]) => {
        setUpcoming(upRes.data)
        setPast(doneRes.data)
        setAll([...upRes.data, ...doneRes.data, ...cancelRes.data])
      })
      .catch(err => setError(getApiError(err, 'Khong the tai lich tap.')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  if (loading) return (
    <MemberPage>
      <MemberPageHeader eyebrow="Lich tap" title="Lich cua toi" />
      <MemberSkeleton rows={5} />
    </MemberPage>
  )

  if (error) return (
    <MemberPage>
      <MemberPageHeader eyebrow="Lich tap" title="Lich cua toi" />
      <MemberErrorState message={error} onRetry={loadSessions} />
    </MemberPage>
  )

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Lich tap"
        title="Lich cua toi"
        description="Cac buoi tap va diem danh ca nhan."
        actions={
          <div className="flex gap-1.5">
            {([
              { v: 'schedule' as PageTab, label: 'Lich tap', icon: <Calendar size={13} /> },
              { v: 'attendance' as PageTab, label: 'Diem danh', icon: <Clock size={13} /> },
            ] as const).map(({ v, label, icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setTab(v)}
                className={`rogym-filter-chip flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === v ? 'is-active' : ''}`}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'schedule' ? (
        <div className="grid gap-5 lg:grid-cols-[65fr_35fr]">
          <CalendarView sessions={all} />
          <SessionSidebar upcoming={upcoming} past={past} />
        </div>
      ) : (
        <AttendanceTab memberId={memberId} />
      )}
    </MemberPage>
  )
}
```

- [ ] **Step 10: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add client/src/pages/member/workout/WorkoutSchedulePage.tsx
git commit -m "feat: merge calendar/list view and add attendance tab"
```

---

## Task 4: Package Switch Feature

**Files:**
- Create: `server/src/subscriptions/dto/switch-subscription.dto.ts`
- Modify: `server/src/subscriptions/subscriptions.service.ts`
- Modify: `server/src/subscriptions/subscriptions.controller.ts`
- Modify: `client/src/services/subscription.service.ts`
- Modify: `client/src/pages/member/subscription/CurrentPackagePage.tsx`

### 4a — Server DTO

- [ ] **Step 12: Create switch DTO**

Create `server/src/subscriptions/dto/switch-subscription.dto.ts`:

```typescript
import { IsInt, Min } from 'class-validator'

export class SwitchSubscriptionDto {
  @IsInt()
  @Min(1)
  newPackageId: number
}
```

### 4b — Service method

- [ ] **Step 13: Read subscriptions.service.ts**

Read `server/src/subscriptions/subscriptions.service.ts` to locate:
- `cancelSubscription` method (copy its `NotFoundException`, `ConflictException`, `assertCanAccessSubscription`, `serializeSubscription`, `todayVN`, `addDays`, `audit.log` usage patterns)
- Existing imports block

- [ ] **Step 14: Add switchSubscription method**

After the closing `}` of `cancelSubscription`, add:

```typescript
async switchSubscription(
  subscriptionId: bigint,
  dto: SwitchSubscriptionDto,
  caller: AuthenticatedUser,
) {
  const sub = await this.prisma.subscription.findFirst({
    where: { subscriptionId, deletedAt: null },
    include: { member: { include: { user: true } }, package: true },
  })
  if (!sub) {
    throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Subscription khong ton tai' })
  }
  if (sub.status !== SubscriptionStatus.active) {
    throw new ConflictException({
      success: false,
      code: 'SUBSCRIPTION_NOT_ACTIVE',
      message: 'Chi co the chuyen goi dang hoat dong',
    })
  }
  await this.assertCanAccessSubscription(sub.memberId, sub.member.userId, caller)

  const newPkg = await this.prisma.package.findFirst({
    where: { packageId: BigInt(dto.newPackageId), status: 'active', deletedAt: null },
  })
  if (!newPkg) {
    throw new BadRequestException({
      success: false,
      code: 'PACKAGE_NOT_FOUND',
      message: 'Goi tap khong ton tai hoac da ngung kinh doanh',
    })
  }

  const today = todayVN()
  const endDate = addDays(today, newPkg.durationDays - 1)

  const newSub = await this.prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { subscriptionId },
      data: { status: SubscriptionStatus.cancelled, cancelledAt: new Date() },
    })
    return tx.subscription.create({
      data: {
        memberId: sub.memberId,
        packageId: newPkg.packageId,
        startDate: today,
        endDate,
        status: SubscriptionStatus.active,
      },
      include: { package: true },
    })
  })

  this.audit.log({
    actorUserId: caller.userId,
    action: 'subscription.switch',
    resourceType: 'subscription',
    resourceId: newSub.subscriptionId.toString(),
    afterData: {
      from: subscriptionId.toString(),
      to: newSub.subscriptionId.toString(),
      newPackageId: dto.newPackageId,
    } as unknown as Record<string, unknown>,
  })

  return { data: this.serializeSubscription(newSub) }
}
```

Also add `SwitchSubscriptionDto` to the import line for DTOs at the top of the file.

### 4c — Controller endpoint

- [ ] **Step 15: Read subscriptions.controller.ts**

Read `server/src/subscriptions/subscriptions.controller.ts` to locate the `cancel` handler and its import block.

- [ ] **Step 16: Add switch endpoint**

Add import for DTO:
```typescript
import { SwitchSubscriptionDto } from './dto/switch-subscription.dto'
```

Add endpoint after the `cancel` handler:

```typescript
@Post(':id/switch')
@HttpCode(HttpStatus.OK)
@RequirePermission('subscription.cancel')
async switch(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: SwitchSubscriptionDto,
  @CurrentUser() user: AuthenticatedUser,
) {
  const result = await this.subscriptions.switchSubscription(BigInt(id), dto, user)
  return { success: true, ...result }
}
```

- [ ] **Step 17: TypeScript check server**

```bash
cd server && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 18: Commit server**

```bash
git add \
  server/src/subscriptions/dto/switch-subscription.dto.ts \
  server/src/subscriptions/subscriptions.service.ts \
  server/src/subscriptions/subscriptions.controller.ts
git commit -m "feat: add POST /subscriptions/:id/switch endpoint"
```

### 4d — Client service

- [ ] **Step 19: Add switchPackage to subscription service**

Read `client/src/services/subscription.service.ts`. Find the `cancel` method. After it, add:

```typescript
  switchPackage: async (subscriptionId: string, newPackageId: string): Promise<Subscription> => {
    const res = await api.post<{ success: boolean; data: Subscription }>(
      `/subscriptions/${subscriptionId}/switch`,
      { newPackageId: Number(newPackageId) },
    )
    return res.data.data
  },
```

### 4e — Client UI

- [ ] **Step 20: Read CurrentPackagePage.tsx**

Read `client/src/pages/member/subscription/CurrentPackagePage.tsx` in full to understand the current button layout, state variables, and imports.

- [ ] **Step 21: Add ArrowLeftRight to lucide imports**

Find the lucide import line and add `ArrowLeftRight` to it.

- [ ] **Step 22: Add switch state variables**

After the `cancelling` / `cancelError` state declarations, add:

```typescript
const [showSwitchModal, setShowSwitchModal]   = useState(false)
const [availablePkgs, setAvailablePkgs]       = useState<Package[]>([])
const [pkgsLoading, setPkgsLoading]           = useState(false)
const [switchTarget, setSwitchTarget]         = useState<Package | null>(null)
const [switching, setSwitching]               = useState(false)
const [switchError, setSwitchError]           = useState<string | null>(null)
```

- [ ] **Step 23: Add handleOpenSwitch and handleSwitch functions**

After `handleCancel`, add:

```typescript
async function handleOpenSwitch() {
  if (!subscription) return
  setShowSwitchModal(true)
  setSwitchError(null)
  setSwitchTarget(null)
  if (availablePkgs.length === 0) {
    setPkgsLoading(true)
    try {
      const res = await packageService.list({ status: 'active', pageSize: 50 })
      setAvailablePkgs(res.data.filter(p => p.packageId !== subscription.packageId))
    } catch {
      setSwitchError('Khong the tai danh sach goi tap.')
    } finally {
      setPkgsLoading(false)
    }
  }
}

async function handleSwitch() {
  if (!switchTarget || !subscription) return
  setSwitching(true)
  setSwitchError(null)
  try {
    await subscriptionService.switchPackage(
      String(subscription.subscriptionId),
      String(switchTarget.packageId),
    )
    setShowSwitchModal(false)
    setSwitchTarget(null)
    if (user?.memberId) {
      const subs = await subscriptionService.getByMember(user.memberId)
      const sorted = subs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setAllSubs(sorted)
      const today = new Date()
      const active =
        sorted.find(s => s.status === 'active' && new Date(s.endDate) >= today) ??
        sorted.find(s => s.status === 'pending' && new Date(s.endDate) >= today)
      setSubscription(active ?? null)
      setHasActiveSub(!!active)
      if (active?.packageId) {
        packageService.get(String(active.packageId)).then(setPkg).catch(() => {})
      }
    }
    setToast(`Da chuyen sang goi "${switchTarget.name}" thanh cong.`)
    setTimeout(() => setToast(null), 4000)
  } catch (err) {
    const e = err as { response?: { data?: { message?: string } } }
    setSwitchError(e?.response?.data?.message || 'Co loi xay ra. Vui long thu lai.')
  } finally {
    setSwitching(false)
  }
}
```

**Note:** Match actual function names (`setAllSubs`, `setToast`, `setSubscription`, `setHasActiveSub`, `setPkg`) to what's in the existing component — read Step 20 output to verify names before writing.

- [ ] **Step 24: Add switch modal JSX**

Find the cancel dialog's closing JSX block. After it (before the main card content), add:

```tsx
{showSwitchModal && (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="rounded-2xl p-8 max-w-md w-full rogym-card max-h-[80vh] flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <ArrowLeftRight size={22} className="text-[var(--rogym-teal)] shrink-0" />
        <h3 className="text-lg font-bold text-white m-0">Chuyen goi tap</h3>
      </div>
      <p className="text-sm rogym-sx-5e5c39ab mb-4">
        Goi hien tai (<strong className="text-white">{subscription?.packageName}</strong>) se ket thuc ngay.
        Goi moi bat dau hom nay.
      </p>

      {pkgsLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin border-[var(--rogym-teal)]" />
        </div>
      ) : availablePkgs.length === 0 ? (
        <p className="text-sm rogym-sx-5e5c39ab text-center py-8">
          Khong co goi khac de chuyen.
        </p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {availablePkgs.map(p => (
            <button
              key={p.packageId}
              type="button"
              onClick={() => setSwitchTarget(t => t?.packageId === p.packageId ? null : p)}
              className={`w-full text-left rounded-xl px-4 py-3 transition-colors border ${
                switchTarget?.packageId === p.packageId
                  ? 'border-[var(--rogym-teal)] bg-[var(--rogym-teal)]/10'
                  : 'border-white/10 rogym-sx-a15e2a7c'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <p className="text-xs rogym-sx-5e5c39ab mt-0.5">
                    {p.durationDays} ngay{p.includesPt ? ' · Co PT' : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-[var(--rogym-teal)] shrink-0">
                  {Number(p.price).toLocaleString('vi-VN')}d
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {switchError && <p className="text-red-300 text-sm mb-3">{switchError}</p>}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => { setShowSwitchModal(false); setSwitchTarget(null); setSwitchError(null) }}
          className="rogym-btn rogym-btn--outline-white flex-1"
        >
          Huy
        </button>
        <button
          onClick={handleSwitch}
          disabled={!switchTarget || switching}
          className="rogym-btn rogym-btn--primary flex-1 disabled:opacity-40"
        >
          {switching ? 'Dang chuyen...' : 'Xac nhan chuyen'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 25: Add "Chuyen goi" button**

Find the button row (the `flex justify-between gap-3` div inside `{(subscription.status === 'active' || subscription.status === 'pending') && ...}`). Add the switch button between the cancel and renew buttons (only when `subscription.status === 'active'`):

```tsx
{subscription.status === 'active' && (
  <button
    onClick={handleOpenSwitch}
    className="rogym-btn rogym-btn--outline-white flex items-center gap-1.5"
  >
    <ArrowLeftRight size={14} />
    Chuyen goi
  </button>
)}
```

- [ ] **Step 26: TypeScript check client**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 27: Commit client**

```bash
git add \
  client/src/services/subscription.service.ts \
  client/src/pages/member/subscription/CurrentPackagePage.tsx
git commit -m "feat: add in-place package switch without leaving subscription page"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| Goi het han realtime → toast → redirect setup | Task 1 |
| Tab diem danh: checkin nhan vien + buoi PT | Task 2+3 |
| Lich cua toi: gop 2 man, calendar 65% trai | Task 2+3 |
| Chuyen goi khong ve setup, goi cu vao lich su | Task 4 |

All 4 requirements covered.

### Placeholder scan

No TBD, TODO, or vague steps. All steps include full code.

### Type consistency

- `SwitchSubscriptionDto.newPackageId: number` → `BigInt(dto.newPackageId)` in service — consistent.
- `subscriptionService.switchPackage(subscriptionId: string, newPackageId: string)` → `Number(newPackageId)` in axios body — consistent.
- `AttendanceLog` imported from `@/services/training.service` — already exported there per session context.
- `useSubscriptionExpiry(onExpired: () => void)` → called in DashboardLayout with `() => { ... }` — consistent.
- Step 23 note: verify `setAllSubs`, `setToast`, `setSubscription`, `setHasActiveSub`, `setPkg` against actual component before editing.
