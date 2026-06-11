import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import {
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
  MemberEmptyState,
  MemberErrorState,
} from '../components/MemberUI'
import { trainingService, type MemberProgress } from '@/services/training.service'
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

const RANGES = [
  { label: '1T', days: 30 },
  { label: '3T', days: 90 },
  { label: '6T', days: 180 },
  { label: 'Tất cả', days: null as number | null },
]

export default function ProgressPage() {
  const memberId = useAuthStore((state) => state.user?.memberId)
  const [data, setData] = useState<MemberProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeIdx, setRangeIdx] = useState(3)

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
    [filtered]
  )

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Sức khoẻ & Thể chất"
        title="Tiến độ của tôi"
        description="Chỉ số cơ thể được ghi nhận bởi PT của bạn"
      />

      {loading ? (
        <MemberSkeleton rows={4} />
      ) : error ? (
        <MemberErrorState message={error} onRetry={loadProgress} />
      ) : data.length === 0 ? (
        <MemberEmptyState
          title="Chưa có chỉ số nào"
          description="PT của bạn chưa ghi nhận chỉ số nào. Hãy liên hệ PT để bắt đầu theo dõi tiến độ."
        />
      ) : (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="rogym-sx-103d1cc8"
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider rogym-sx-6e4f9432"
                
              >
                Cân nặng hiện tại
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {latest.weight != null ? `${latest.weight} kg` : '—'}
              </p>
              <p className="mt-1 text-xs rogym-sx-d88f932f" >
                Ghi lúc {fmtDate(latest.recordedAt)}
              </p>
            </div>
            <div
              className="rogym-sx-103d1cc8"
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider rogym-sx-6e4f9432"
                
              >
                BMI hiện tại
              </p>
              <p
                className="rogym-tone-text mt-2 text-3xl font-bold"
                data-tone={latest.bmi != null ? bmiTone(latest.bmi) : 'default'}
              >
                {latest.bmi != null ? latest.bmi.toFixed(1) : '—'}
              </p>
              {latest.bmi != null && (
                <p className="mt-1 text-xs rogym-sx-d88f932f" >
                  {bmiLabel(latest.bmi)}
                </p>
              )}
            </div>
          </div>

          {/* Chart */}
          <div
            className="rogym-sx-103d1cc8"
          >
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
              <p className="py-8 text-center text-sm rogym-sx-d88f932f" >
                Cần ít nhất 2 lần đo cân nặng để hiển thị biểu đồ
              </p>
            ) : (
              <Suspense fallback={<div className="h-[220px] animate-pulse rounded-xl bg-white/5" />}>
                <MemberWeightChart data={chartData} />
              </Suspense>
            )}
          </div>

          {/* History */}
          <div
            className="rogym-sx-103d1cc8"
          >
            <p className="mb-4 text-sm font-semibold text-white">Lịch sử đo chỉ số</p>
            <div>
              {filtered.map((entry) => (
                <div
                  key={entry.progressId}
                  className="rogym-list-row flex items-start justify-between py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium rogym-sx-d88f932f" >
                      {fmtDate(entry.recordedAt)}
                    </p>
                    {entry.goal && <p className="mt-0.5 text-sm text-white">{entry.goal}</p>}
                    {entry.notes && (
                      <p className="mt-0.5 text-xs rogym-sx-5e5c39ab" >
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    {entry.weight != null && (
                      <p className="text-sm font-semibold text-white">{entry.weight} kg</p>
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
