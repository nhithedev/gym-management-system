import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
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

const G = '#06c384'
const T = '#42e09e'
const BG_CARD = '#0f1c16'

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

function bmiColor(bmi: number): string {
  if (bmi < 18.5) return '#f59e0b'
  if (bmi < 25) return G
  if (bmi < 30) return '#f59e0b'
  return '#ef4444'
}

const RANGES = [
  { label: '1T', days: 30 },
  { label: '3T', days: 90 },
  { label: '6T', days: 180 },
  { label: 'Tất cả', days: null as number | null },
]

export default function ProgressPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<MemberProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rangeIdx, setRangeIdx] = useState(3)

  const loadProgress = useCallback(async () => {
    if (!user?.memberId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await trainingService.listProgress(String(user.memberId)))
    } catch (err) {
      setError(getApiError(err, 'Không thể tải dữ liệu tiến độ.'))
    } finally {
      setLoading(false)
    }
  }, [user?.memberId])

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
  const chartData = filtered
    .filter((d) => d.weight != null)
    .map((d) => ({ date: fmtDateShort(d.recordedAt), weight: d.weight }))
    .reverse()

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
              style={{
                background: BG_CARD,
                border: '1px solid rgba(66,224,158,0.10)',
                borderRadius: 20,
                padding: '20px 24px',
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: T, letterSpacing: '0.15em' }}
              >
                Cân nặng hiện tại
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {latest.weight != null ? `${latest.weight} kg` : '—'}
              </p>
              <p className="mt-1 text-xs" style={{ color: '#bbcabf' }}>
                Ghi lúc {fmtDate(latest.recordedAt)}
              </p>
            </div>
            <div
              style={{
                background: BG_CARD,
                border: '1px solid rgba(66,224,158,0.10)',
                borderRadius: 20,
                padding: '20px 24px',
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: T, letterSpacing: '0.15em' }}
              >
                BMI hiện tại
              </p>
              <p
                className="mt-2 text-3xl font-bold"
                style={{ color: latest.bmi != null ? bmiColor(latest.bmi) : 'white' }}
              >
                {latest.bmi != null ? latest.bmi.toFixed(1) : '—'}
              </p>
              {latest.bmi != null && (
                <p className="mt-1 text-xs" style={{ color: '#bbcabf' }}>
                  {bmiLabel(latest.bmi)}
                </p>
              )}
            </div>
          </div>

          {/* Chart */}
          <div
            style={{
              background: BG_CARD,
              border: '1px solid rgba(66,224,158,0.10)',
              borderRadius: 20,
              padding: '20px 24px',
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Biểu đồ cân nặng</p>
              <div className="flex gap-1">
                {RANGES.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setRangeIdx(i)}
                    className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                      background: rangeIdx === i ? `${G}22` : 'transparent',
                      color: rangeIdx === i ? G : '#bbcabf',
                      border: rangeIdx === i ? `1px solid ${G}55` : '1px solid transparent',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length < 2 ? (
              <p className="py-8 text-center text-sm" style={{ color: '#bbcabf' }}>
                Cần ít nhất 2 lần đo cân nặng để hiển thị biểu đồ
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#bbcabf', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#bbcabf', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1a2d22',
                      border: `1px solid ${G}33`,
                      borderRadius: 10,
                      color: '#fff',
                      fontSize: 12,
                    }}
                    formatter={(val: number) => [`${val} kg`, 'Cân nặng']}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke={G}
                    strokeWidth={2.5}
                    dot={{ fill: G, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* History */}
          <div
            style={{
              background: BG_CARD,
              border: '1px solid rgba(66,224,158,0.10)',
              borderRadius: 20,
              padding: '20px 24px',
            }}
          >
            <p className="mb-4 text-sm font-semibold text-white">Lịch sử đo chỉ số</p>
            <div>
              {filtered.map((entry, i) => (
                <div
                  key={entry.progressId}
                  className="flex items-start justify-between py-3"
                  style={{
                    borderBottom:
                      i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: '#bbcabf' }}>
                      {fmtDate(entry.recordedAt)}
                    </p>
                    {entry.goal && <p className="mt-0.5 text-sm text-white">{entry.goal}</p>}
                    {entry.notes && (
                      <p className="mt-0.5 text-xs" style={{ color: '#8ab89c' }}>
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    {entry.weight != null && (
                      <p className="text-sm font-semibold text-white">{entry.weight} kg</p>
                    )}
                    {entry.bmi != null && (
                      <p className="text-xs mt-0.5" style={{ color: bmiColor(entry.bmi) }}>
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
