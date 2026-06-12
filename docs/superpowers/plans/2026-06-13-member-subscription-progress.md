# Member Subscription Check & Progress Self-Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Redirect member after login based on active subscription validity. (2) Fix DashboardPage subscription selection to show the correct active package. (3) Allow member to self-record weight/height, auto-compute and display BMI.

**Architecture:** Login check calls subscriptions API after auth, then navigates to dashboard or payment-accounts. Dashboard fix improves subscription selection priority. Progress self-report adds a new `/members/me/progress` endpoint (no permission required), makes `staffId` nullable, adds `height` field to `MemberProgress`, and adds a self-report form to ProgressPage.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, Vite, Zustand, TypeScript.

---

## File Map

**Modified:**
- `server/prisma/schema.prisma` — make `staffId` optional, add `height` field to `MemberProgress`
- `server/src/training/training.service.ts` — fix `serializeProgress` null staffId + add height
- `server/src/members/members.service.ts` — add `recordSelfProgress` method
- `server/src/members/members.controller.ts` — add `POST /members/me/progress` route
- `client/src/pages/auth/LoginPage.tsx` — subscription validity check after member login
- `client/src/pages/member/DashboardPage.tsx` — accurate subscription selection logic
- `client/src/services/training.service.ts` — add `height` to `MemberProgress` interface
- `client/src/services/member.service.ts` — add `recordSelfProgress` method
- `client/src/pages/member/progress/ProgressPage.tsx` — add self-report form

**Created:**
- `server/src/members/dto/self-progress.dto.ts` — DTO for member self-reporting

---

## Task 1: Schema — make staffId optional, add height to MemberProgress

**Files:**
- Modify: `server/prisma/schema.prisma` (lines ~273-287)

- [ ] **Step 1: Edit schema.prisma**

Change `MemberProgress` model from:
```prisma
model MemberProgress {
  progressId BigInt    @id @default(autoincrement()) @map("progress_id")
  memberId   BigInt    @map("member_id")
  staffId    BigInt    @map("staff_id")
  weight     Decimal?  @db.Decimal(6, 2)
  bmi        Decimal?  @db.Decimal(5, 2)
  goal       String?   @db.VarChar(255)
  notes      String?
  recordedAt DateTime  @map("recorded_at") @db.Timestamp(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamp(6)
  member     Member    @relation(fields: [memberId], references: [memberId])
  staff      Staff     @relation(fields: [staffId], references: [staffId])

  @@map("member_progress")
}
```
To:
```prisma
model MemberProgress {
  progressId BigInt    @id @default(autoincrement()) @map("progress_id")
  memberId   BigInt    @map("member_id")
  staffId    BigInt?   @map("staff_id")
  weight     Decimal?  @db.Decimal(6, 2)
  height     Decimal?  @db.Decimal(5, 1) @map("height")
  bmi        Decimal?  @db.Decimal(5, 2)
  goal       String?   @db.VarChar(255)
  notes      String?
  recordedAt DateTime  @map("recorded_at") @db.Timestamp(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamp(6)
  member     Member    @relation(fields: [memberId], references: [memberId])
  staff      Staff?    @relation(fields: [staffId], references: [staffId])

  @@map("member_progress")
}
```

- [ ] **Step 2: Push schema to DB**

```bash
cd server
npm run prisma:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npm run prisma:generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add height field and make staffId optional in MemberProgress"
```

---

## Task 2: Backend — fix serializeProgress + new self-report endpoint

**Files:**
- Modify: `server/src/training/training.service.ts` (lines ~1145-1157)
- Create: `server/src/members/dto/self-progress.dto.ts`
- Modify: `server/src/members/members.service.ts`
- Modify: `server/src/members/members.controller.ts`

- [ ] **Step 1: Fix serializeProgress to handle nullable staffId and new height field**

In `server/src/training/training.service.ts`, find the `serializeProgress` method (~line 1145) and replace:
```typescript
private serializeProgress(progress: Prisma.MemberProgressGetPayload<object>) {
  return {
    progressId: progress.progressId.toString(),
    memberId: progress.memberId.toString(),
    staffId: progress.staffId.toString(),
    staffName: null as string | null,
    weight: progress.weight != null ? Number(progress.weight) : null,
    bmi: progress.bmi != null ? Number(progress.bmi) : null,
    goal: progress.goal,
    notes: progress.notes,
    recordedAt: progress.recordedAt,
  }
}
```
With:
```typescript
private serializeProgress(progress: Prisma.MemberProgressGetPayload<object>) {
  return {
    progressId: progress.progressId.toString(),
    memberId: progress.memberId.toString(),
    staffId: progress.staffId?.toString() ?? null,
    staffName: null as string | null,
    weight: progress.weight != null ? Number(progress.weight) : null,
    height: progress.height != null ? Number(progress.height) : null,
    bmi: progress.bmi != null ? Number(progress.bmi) : null,
    goal: progress.goal,
    notes: progress.notes,
    recordedAt: progress.recordedAt,
  }
}
```

- [ ] **Step 2: Create SelfProgressDto**

Create `server/src/members/dto/self-progress.dto.ts`:
```typescript
import { IsNumber, IsOptional, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class SelfProgressDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  weight!: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(300)
  height?: number
}
```

- [ ] **Step 3: Add recordSelfProgress to MembersService**

In `server/src/members/members.service.ts`, check if `Prisma` is imported from `@prisma/client`. If not, add:
```typescript
import { Prisma } from '@prisma/client'
```

Then add the method:
```typescript
async recordSelfProgress(memberId: bigint, dto: { weight: number; height?: number }) {
  const member = await this.prisma.member.findFirst({
    where: { memberId, deletedAt: null },
    select: { memberId: true },
  })
  if (!member) {
    throw new NotFoundException({ success: false, code: 'NOT_FOUND', message: 'Member không tồn tại' })
  }

  let bmi: number | null = null
  if (dto.height && dto.height > 0) {
    const heightM = dto.height / 100
    bmi = Math.round((dto.weight / (heightM * heightM)) * 10) / 10
  }

  const progress = await this.prisma.memberProgress.create({
    data: {
      memberId: member.memberId,
      staffId: null,
      weight: new Prisma.Decimal(dto.weight),
      height: dto.height != null ? new Prisma.Decimal(dto.height) : null,
      bmi: bmi != null ? new Prisma.Decimal(bmi) : null,
      recordedAt: new Date(),
    },
  })

  return {
    data: {
      progressId: progress.progressId.toString(),
      memberId: progress.memberId.toString(),
      staffId: null,
      staffName: null,
      weight: Number(progress.weight),
      height: progress.height != null ? Number(progress.height) : null,
      bmi: progress.bmi != null ? Number(progress.bmi) : null,
      goal: null,
      notes: null,
      recordedAt: progress.recordedAt,
    },
  }
}
```

- [ ] **Step 4: Add POST /members/me/progress to MembersController**

In `server/src/members/members.controller.ts`, add import:
```typescript
import { SelfProgressDto } from './dto/self-progress.dto'
```

Add the route after the existing `@Patch('me')` block (~line 36):
```typescript
/** Member tự ghi chỉ số cân nặng / chiều cao */
@Post('me/progress')
@HttpCode(HttpStatus.CREATED)
async recordSelfProgress(
  @Body() dto: SelfProgressDto,
  @CurrentUser() user: AuthenticatedUser,
) {
  if (!user.memberId) throw new NotFoundException('Tài khoản này không gắn với hội viên nào')
  const result = await this.members.recordSelfProgress(user.memberId, dto)
  return { success: true, ...result }
}
```

- [ ] **Step 5: Build server to verify**

```bash
cd server
npm run build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/members/dto/self-progress.dto.ts server/src/members/members.service.ts server/src/members/members.controller.ts server/src/training/training.service.ts
git commit -m "feat: add member self-progress endpoint and fix serializer for nullable staffId"
```

---

## Task 3: LoginPage — redirect member based on subscription validity

**Files:**
- Modify: `client/src/pages/auth/LoginPage.tsx`

- [ ] **Step 1: Add subscription import**

At the top of `LoginPage.tsx`, add after the existing imports:
```typescript
import subscriptionService from '@/services/subscription.service'
```

- [ ] **Step 2: Replace handleSubmit**

Replace the entire `handleSubmit` function (lines 58-71):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError('')
  setLoading(true)
  try {
    const { user, token } = await authService.login(email, pass)
    setAuth(user, token)

    if (user.roles[0] === 'member' && user.memberId) {
      try {
        const subs = await subscriptionService.getByMember(user.memberId)
        const now = new Date()
        const hasValid = subs.some(
          (s) =>
            s.status === 'active' &&
            new Date(s.startDate) <= now &&
            new Date(s.endDate) >= now,
        )
        navigate(hasValid ? '/member/dashboard' : '/member/payment-accounts', { replace: true })
      } catch {
        navigate('/member/dashboard', { replace: true })
      }
    } else {
      navigate(roleRouteMap[user.roles[0]] ?? '/', { replace: true })
    }
  } catch {
    setError('Email hoặc mật khẩu không đúng.')
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/auth/LoginPage.tsx
git commit -m "feat: redirect member to payment-accounts if no active subscription on login"
```

---

## Task 4: DashboardPage — accurate subscription selection

**Files:**
- Modify: `client/src/pages/member/DashboardPage.tsx` (lines ~447-514)

- [ ] **Step 1: Fix subscription selection and setHasActiveSub (line ~449)**

Inside the `useEffect`, find:
```typescript
const active = subs.find((s) => s.status === 'active') ?? subs[0] ?? null
setSubscription(active)
setHasActiveSub(subs.some(s => s.status === 'active' || s.status === 'pending'))
```
Replace with:
```typescript
const now = new Date()
const validActive = subs.find(
  (s) =>
    s.status === 'active' &&
    new Date(s.startDate) <= now &&
    new Date(s.endDate) >= now,
)
const active = validActive ?? subs.find((s) => s.status === 'active') ?? subs[0] ?? null
setSubscription(active)
setHasActiveSub(validActive != null)
```

- [ ] **Step 2: Fix profile subscription selection (line ~505)**

Find:
```typescript
const activeSub = p.subscriptions?.find(s => s.status === 'active') ?? p.subscriptions?.[0]
```
Replace with:
```typescript
const now = new Date()
const activeSub =
  p.subscriptions?.find(
    s => s.status === 'active' && new Date(s.startDate) <= now && new Date(s.endDate) >= now,
  ) ??
  p.subscriptions?.find(s => s.status === 'active') ??
  p.subscriptions?.[0]
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/member/DashboardPage.tsx
git commit -m "fix: prefer date-valid active subscription in DashboardPage"
```

---

## Task 5: Frontend — self-report form in ProgressPage

**Files:**
- Modify: `client/src/services/training.service.ts`
- Modify: `client/src/services/member.service.ts`
- Modify: `client/src/pages/member/progress/ProgressPage.tsx`

- [ ] **Step 1: Add height to MemberProgress interface (training.service.ts ~line 40)**

Find:
```typescript
export interface MemberProgress {
  progressId: string
  memberId: string
  staffId: string | null
  staffName: string | null
  weight: number | null
  bmi: number | null
  goal: string | null
  notes: string | null
  recordedAt: string
}
```
Replace with:
```typescript
export interface MemberProgress {
  progressId: string
  memberId: string
  staffId: string | null
  staffName: string | null
  weight: number | null
  height: number | null
  bmi: number | null
  goal: string | null
  notes: string | null
  recordedAt: string
}
```

Find `MemberProgressResponse` (~line 52):
```typescript
type MemberProgressResponse = Omit<MemberProgress, 'weight' | 'bmi'> & {
  weight: number | string | null
  bmi: number | string | null
}
```
Replace with:
```typescript
type MemberProgressResponse = Omit<MemberProgress, 'weight' | 'height' | 'bmi'> & {
  weight: number | string | null
  height: number | string | null
  bmi: number | string | null
}
```

Update `listProgress` map to include height:
```typescript
return res.data.data.map((progress) => ({
  ...progress,
  weight: toNullableNumber(progress.weight),
  height: toNullableNumber(progress.height),
  bmi: toNullableNumber(progress.bmi),
}))
```

- [ ] **Step 2: Add recordSelfProgress to member.service.ts**

Confirm `MemberProgress` is importable from `training.service.ts` or already used. Then add after `createProgress` (~line 163):
```typescript
recordSelfProgress: async (data: { weight: number; height?: number }): Promise<MemberProgress> => {
  const res = await api.post<{ success: boolean; data: MemberProgress }>(
    '/members/me/progress',
    data,
  )
  return res.data.data
},
```

- [ ] **Step 3: Replace ProgressPage.tsx**

Replace the entire content of `client/src/pages/member/progress/ProgressPage.tsx` with the following. Key changes vs original: added `SelfReportForm` component, "Ghi chỉ số" toggle button in header, empty-state shows form directly, history rows show `height`, description text updated.

```typescript
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberErrorState,
} from '../components/MemberUI'
import { trainingService, type MemberProgress } from '@/services/training.service'
import { memberService } from '@/services/member.service'
import { useAuthStore } from '@/stores/authStore'
import { getApiError } from '@/lib/api-error'

const MemberWeightChart = lazy(() => import('@/components/charts/MemberWeightChart'))

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtDateShort(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Thiếu cân'
  if (bmi < 25) return 'Bình thường'
  if (bmi < 30) return 'Thừa cân'
  return 'Béo phì'
}

function bmiTone(bmi: number): string {
  if (bmi < 18.5) return 'warning'
  if (bmi < 25) return 'success'
  if (bmi < 30) return 'warning'
  return 'danger'
}

function computeBmi(weightKg: number, heightCm: number): number {
  const hm = heightCm / 100
  return Math.round((weightKg / (hm * hm)) * 10) / 10
}

const RANGES = [
  { label: '1T', days: 30 },
  { label: '3T', days: 90 },
  { label: '6T', days: 180 },
  { label: 'Tất cả', days: null as number | null },
]

function SelfReportForm({ onSuccess }: { onSuccess: () => void }) {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weightNum = parseFloat(weight)
  const heightNum = parseFloat(height)
  const previewBmi =
    !isNaN(weightNum) && weightNum > 0 && !isNaN(heightNum) && heightNum > 0
      ? computeBmi(weightNum, heightNum)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Cân nặng không hợp lệ.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await memberService.recordSelfProgress({
        weight: weightNum,
        height: !isNaN(heightNum) && heightNum > 0 ? heightNum : undefined,
      })
      setWeight('')
      setHeight('')
      onSuccess()
    } catch (err) {
      setError(getApiError(err, 'Không thể lưu chỉ số. Vui lòng thử lại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rogym-sx-103d1cc8 p-5">
      <p className="text-sm font-semibold text-white mb-4">Ghi chỉ số mới</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs rogym-sx-6e4f9432">Cân nặng (kg)</label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="500"
              placeholder="Vd: 65.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-base"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs rogym-sx-6e4f9432">Chiều cao (cm)</label>
            <input
              type="number"
              step="0.1"
              min="50"
              max="300"
              placeholder="Vd: 170"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="input-base"
            />
          </div>
        </div>

        {previewBmi != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="rogym-sx-d88f932f">BMI dự tính:</span>
            <span className="rogym-tone-text font-semibold" data-tone={bmiTone(previewBmi)}>
              {previewBmi.toFixed(1)} — {bmiLabel(previewBmi)}
            </span>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary self-start">
          {submitting ? 'Đang lưu...' : 'Lưu chỉ số'}
        </button>
      </form>
    </div>
  )
}

export default function ProgressPage() {
  const memberId = useAuthStore((state) => state.user?.memberId)
  const [data, setData] = useState<MemberProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeIdx, setRangeIdx] = useState(3)
  const [showForm, setShowForm] = useState(false)

  const loadProgress = useCallback(async () => {
    if (!memberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await trainingService.listProgress(String(memberId)))
    } catch (err) {
      setError(getApiError(err, 'Không thể tải dữ liệu tiến độ.'))
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const filtered = useMemo(() => {
    const days = RANGES[rangeIdx].days
    if (!days) return data
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return data.filter((d) => new Date(d.recordedAt) >= cutoff)
  }, [data, rangeIdx])

  const latest = data[0]
  const chartData = useMemo(
    () =>
      filtered
        .filter((entry): entry is MemberProgress & { weight: number } => entry.weight != null)
        .map((entry) => ({ date: fmtDateShort(entry.recordedAt), weight: entry.weight }))
        .reverse(),
    [filtered],
  )

  function handleFormSuccess() {
    setShowForm(false)
    void loadProgress()
  }

  return (
    <MemberPage>
      <div className="flex items-start justify-between gap-4">
        <MemberPageHeader
          eyebrow="Sức khoẻ & Thể chất"
          title="Tiến độ của tôi"
          description="Theo dõi cân nặng, chiều cao và chỉ số BMI"
        />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary shrink-0 mt-1"
        >
          {showForm ? 'Đóng' : 'Ghi chỉ số'}
        </button>
      </div>

      {showForm && <SelfReportForm onSuccess={handleFormSuccess} />}

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error ? (
        <MemberErrorState message={error} onRetry={loadProgress} />
      ) : data.length === 0 ? (
        <div className="space-y-5">
          {!showForm && <SelfReportForm onSuccess={handleFormSuccess} />}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rogym-sx-103d1cc8">
              <p className="text-xs font-semibold uppercase tracking-wider rogym-sx-6e4f9432">
                Cân nặng hiện tại
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {latest.weight != null ? `${latest.weight} kg` : '—'}
              </p>
              <p className="mt-1 text-xs rogym-sx-d88f932f">
                Ghi lúc {fmtDate(latest.recordedAt)}
              </p>
            </div>
            <div className="rogym-sx-103d1cc8">
              <p className="text-xs font-semibold uppercase tracking-wider rogym-sx-6e4f9432">
                BMI hiện tại
              </p>
              <p
                className="rogym-tone-text mt-2 text-3xl font-bold"
                data-tone={latest.bmi != null ? bmiTone(latest.bmi) : 'default'}
              >
                {latest.bmi != null ? latest.bmi.toFixed(1) : '—'}
              </p>
              {latest.bmi != null && (
                <p className="mt-1 text-xs rogym-sx-d88f932f">{bmiLabel(latest.bmi)}</p>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="rogym-sx-103d1cc8">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Biểu đồ cân nặng</p>
              <div className="flex gap-1">
                {RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRangeIdx(i)}
                    className={`rogym-range-chip rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      rangeIdx === i ? 'is-active' : ''
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length < 2 ? (
              <p className="py-8 text-center text-sm rogym-sx-d88f932f">
                Cần ít nhất 2 lần đo cân nặng để hiển thị biểu đồ
              </p>
            ) : (
              <Suspense fallback={<div className="h-[220px] animate-pulse rounded-xl bg-white/5" />}>
                <MemberWeightChart data={chartData} />
              </Suspense>
            )}
          </div>

          {/* History */}
          <div className="rogym-sx-103d1cc8">
            <p className="mb-4 text-sm font-semibold text-white">Lịch sử đo chỉ số</p>
            <div>
              {filtered.map((entry) => (
                <div
                  key={entry.progressId}
                  className="rogym-list-row flex items-start justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium rogym-sx-d88f932f">
                      {fmtDate(entry.recordedAt)}
                    </p>
                    {entry.goal && <p className="mt-0.5 text-sm text-white">{entry.goal}</p>}
                    {entry.notes && (
                      <p className="mt-0.5 text-xs rogym-sx-5e5c39ab">{entry.notes}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    {entry.weight != null && (
                      <p className="text-sm font-semibold text-white">{entry.weight} kg</p>
                    )}
                    {entry.height != null && (
                      <p className="text-xs rogym-sx-d88f932f mt-0.5">{entry.height} cm</p>
                    )}
                    {entry.bmi != null && (
                      <p className="rogym-tone-text text-xs mt-0.5" data-tone={bmiTone(entry.bmi)}>
                        BMI {entry.bmi.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/services/training.service.ts client/src/services/member.service.ts client/src/pages/member/progress/ProgressPage.tsx
git commit -m "feat: member self-report weight/height with auto BMI in ProgressPage"
```

---

## Self-Review

**Spec coverage:**
1. Post-login subscription check → Task 3
2. DashboardPage accurate status → Task 4
3. ProgressPage self-update weight/height + BMI → Tasks 1, 2, 5

**Type consistency:**
- `height` added to `MemberProgress` in Task 5 Step 1 matches serializer in Task 2 Step 1
- `SelfProgressDto.weight/height` matches `recordSelfProgress(data: { weight, height? })` parameter
- Frontend `memberService.recordSelfProgress` POSTs to `/members/me/progress` which Task 2 Step 4 registers

**Known constraint:** The existing `POST /members/:id/progress` (TrainingController) always has a staffId from trainer/staff callers — no breakage. Making staffId nullable in schema is backward-compatible for existing rows.
