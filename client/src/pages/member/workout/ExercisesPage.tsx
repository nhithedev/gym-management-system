import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, ImageIcon, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  MemberEmptyState,
  MemberErrorState,
  MemberPage,
  MemberPageHeader,
  MemberSkeleton,
} from '../components/MemberUI'
import workoutService, { type Exercise, type ExerciseCategory } from '@/services/workout.service'
import { getApiError } from '@/lib/api-error'

const T = '#42e09e'
const BG_CARD = '#0f1c16'

const CATEGORIES: Array<{ value: ExerciseCategory | ''; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'strength', label: 'Sức mạnh' },
  { value: 'cardio', label: 'Tim mạch' },
  { value: 'flexibility', label: 'Linh hoạt' },
  { value: 'balance', label: 'Thăng bằng' },
]

const CATEGORY_LABEL: Record<string, string> = {
  strength: 'Sức mạnh',
  cardio: 'Tim mạch',
  flexibility: 'Linh hoạt',
  balance: 'Thăng bằng',
}

export default function MemberExercisesPage() {
  const navigate = useNavigate()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Exercise | null>(null)

  // Filter popup
  const [showPopup, setShowPopup] = useState(false)
  const [draftCategory, setDraftCategory] = useState<ExerciseCategory | ''>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setExercises(await workoutService.getExercises({ category: category || undefined }))
    } catch (err) {
      setError(getApiError(err, 'Không thể tải thư viện bài tập.'))
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('vi')
    if (!q) return exercises
    return exercises.filter((ex) =>
      [ex.name, ex.muscleGroup, ex.equipmentNeeded, ex.description]
        .filter(Boolean)
        .some((v) => v!.toLocaleLowerCase('vi').includes(q))
    )
  }, [exercises, search])

  const activeCount = category ? 1 : 0

  function openPopup() {
    setDraftCategory(category)
    setShowPopup(true)
  }

  function applyFilter() {
    setCategory(draftCategory)
    setShowPopup(false)
  }

  return (
    <MemberPage>
      <MemberPageHeader
        eyebrow="Lịch tập"
        title="Thư viện bài tập"
        description="Các bài tập do PT đề xuất — dùng để xây dựng kế hoạch cá nhân"
        actions={
          <button
            type="button"
            className="rogym-btn rogym-btn--primary"
            onClick={() => navigate('/member/workout/builder')}
          >
            <Dumbbell size={15} /> Mở Plan Builder
          </button>
        }
      />

      {/* Search + filter */}
      <div
        style={{
          background: BG_CARD,
          border: '1px solid rgba(66,224,158,0.08)',
          borderRadius: 16,
          padding: '14px 16px',
        }}
        className="flex items-center gap-3"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} style={{ color: '#8ab89c' }} />
          <input
            className="rogym-input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, nhóm cơ, dụng cụ..."
          />
        </div>

        {/* Filter button + popup */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={openPopup}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              background: activeCount > 0 ? `${T}22` : 'rgba(255,255,255,0.06)',
              color: activeCount > 0 ? T : '#8ab89c',
              border: `1px solid ${activeCount > 0 ? T + '44' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <SlidersHorizontal size={13} />
            Lọc
            {activeCount > 0 && (
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: T, color: '#0a1f17' }}
              >
                {activeCount}
              </span>
            )}
          </button>

          {showPopup && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowPopup(false)} />
              <div
                className="absolute right-0 top-full z-20 mt-2"
                style={{
                  background: '#0a1f17',
                  border: '1px solid rgba(6,195,132,0.25)',
                  borderRadius: 20,
                  padding: '20px',
                  minWidth: 260,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                }}
              >
                <p className="mb-4 text-sm font-bold text-white">Bộ lọc</p>

                <p className="rogym-field-label mb-2">Loại bài tập</p>
                <div className="mb-5 flex flex-wrap gap-2">
                  {CATEGORIES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraftCategory(opt.value)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={{
                        background: draftCategory === opt.value ? `${T}22` : 'rgba(255,255,255,0.04)',
                        color: draftCategory === opt.value ? T : '#8ab89c',
                        border: `1px solid ${draftCategory === opt.value ? T + '44' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" className="rogym-btn rogym-btn--outline-white px-4" onClick={() => setShowPopup(false)}>Hủy</button>
                  <button type="button" className="rogym-btn rogym-btn--primary px-4" onClick={applyFilter}>Lưu</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <MemberErrorState message={error} onRetry={load} />}

      {loading ? (
        <MemberSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <MemberEmptyState
          title="Không tìm thấy bài tập"
          description="Thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ex) => (
            <article
              key={ex.exerciseId}
              className="flex cursor-pointer flex-col overflow-hidden rounded-[20px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              style={{ background: BG_CARD, border: '1px solid rgba(66,224,158,0.10)' }}
              onClick={() => setDetail(ex)}
            >
              <div className="aspect-[6/4] overflow-hidden border-b border-white/5 bg-black/20">
                {ex.imageUrl ? (
                  <img src={ex.imageUrl} alt={`Minh họa ${ex.name}`} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center" style={{ color: '#4a7060' }}>
                    <ImageIcon size={32} />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-white">{ex.name}</h2>
                    <p className="mt-1 text-xs uppercase tracking-wider" style={{ color: '#8ab89c' }}>
                      {CATEGORY_LABEL[ex.category] ?? ex.category}
                    </p>
                  </div>
                  {ex.muscleGroup && (
                    <span className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium" style={{ background: `${T}18`, color: T }}>
                      {ex.muscleGroup}
                    </span>
                  )}
                </div>
                <p className="mt-3 flex-1 text-sm leading-6" style={{ color: '#bbcabf' }}>
                  {ex.description ?? 'Chưa có mô tả.'}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-xs" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div>
                    <span style={{ color: '#8ab89c' }}>Nhóm cơ</span>
                    <div className="mt-1 text-white">{ex.muscleGroup ?? '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#8ab89c' }}>Dụng cụ</span>
                    <div className="mt-1 text-white">{ex.equipmentNeeded ?? 'Không cần'}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setDetail(null)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-[24px]"
            style={{ background: '#0a1710', border: '1px solid rgba(66,224,158,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {detail.imageUrl && (
              <div className="aspect-[16/7] overflow-hidden">
                <img src={detail.imageUrl} alt={`Minh họa ${detail.name}`} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{detail.name}</h2>
                  <p className="mt-1 text-xs uppercase tracking-wider" style={{ color: T }}>
                    {CATEGORY_LABEL[detail.category] ?? detail.category}
                  </p>
                </div>
                <button type="button" className="rogym-btn rogym-btn--icon rogym-btn--elevated" onClick={() => setDetail(null)}>
                  <X size={16} />
                </button>
              </div>
              {detail.description && (
                <p className="mt-4 text-sm leading-7" style={{ color: '#bbcabf' }}>{detail.description}</p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs" style={{ color: '#8ab89c' }}>Nhóm cơ</p>
                  <p className="mt-1 text-sm font-semibold text-white">{detail.muscleGroup ?? '—'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-xs" style={{ color: '#8ab89c' }}>Dụng cụ cần</p>
                  <p className="mt-1 text-sm font-semibold text-white">{detail.equipmentNeeded ?? 'Không cần'}</p>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" className="rogym-btn rogym-btn--outline-white flex-1 justify-center" onClick={() => setDetail(null)}>Đóng</button>
                <button
                  type="button"
                  className="rogym-btn rogym-btn--primary flex-1 justify-center"
                  onClick={() => { setDetail(null); navigate('/member/workout/builder') }}
                >
                  <Dumbbell size={14} /> Thêm vào Plan Builder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MemberPage>
  )
}
