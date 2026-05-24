import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import workoutService, { WorkoutLog } from '@/services/workout.service'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calcVolume(log: WorkoutLog): number {
  if (!log.sets) return 0
  return log.sets.reduce((sum, s) => {
    const reps = s.actualReps ?? 0
    const kg = s.actualWeightKg ? parseFloat(s.actualWeightKg) : 0
    return sum + reps * kg
  }, 0)
}

export default function WorkoutHistoryPage() {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['workout-logs'],
    queryFn: () => workoutService.getLogs(),
  })

  function toggleExpand(logId: string) {
    setExpandedId(prev => (prev === logId ? null : logId))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lịch sử tập luyện</h1>
        <button
          onClick={() => navigate('/member/my-plan')}
          className="btn-secondary text-sm"
        >
          Xem plan của tôi
        </button>
      </div>

      {isLoading ? (
        <p className="text-on-surface-variant">Đang tải...</p>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <p className="text-lg mb-2">Chưa có buổi tập nào được ghi lại</p>
          <p className="text-sm">Hoàn thành buổi tập đầu tiên để thấy lịch sử ở đây.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log: WorkoutLog) => {
            const isExpanded = expandedId === log.logId
            const sets = log.sets ?? []
            const completedSets = sets.filter(s => s.completed).length
            const totalSets = sets.length
            const volume = calcVolume(log)

            return (
              <div key={log.logId} className="border border-outline-variant rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(log.logId)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-container-high text-left"
                >
                  <div className="flex gap-4 items-center">
                    <div>
                      <p className="font-semibold">{log.planDay?.name ?? `Day ${log.planDayId}`}</p>
                      <p className="text-xs text-on-surface-variant">{formatDate(log.loggedAt)}</p>
                    </div>
                    <div className="flex gap-3 text-sm text-on-surface-variant">
                      <span>{completedSets}/{totalSets} sets</span>
                      {volume > 0 && <span>{volume.toFixed(0)} kg·reps</span>}
                      {log.durationMin && <span>{log.durationMin} phút</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    {log.notes && (
                      <p className="text-sm text-on-surface-variant italic mb-3">{log.notes}</p>
                    )}
                    {sets.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-outline-variant">
                            <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">Bài tập</th>
                            <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">Set</th>
                            <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">Reps</th>
                            <th className="text-left py-2 pr-3 text-on-surface-variant font-medium">KG</th>
                            <th className="text-left py-2 text-on-surface-variant font-medium">Mục tiêu reps</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sets.map(s => (
                            <tr
                              key={s.logSetId}
                              className={`border-b border-outline-variant ${!s.completed ? 'opacity-50' : ''}`}
                            >
                              <td className="py-2 pr-3">
                                {s.planExercise?.exercise?.name ?? `Exercise`}
                              </td>
                              <td className="py-2 pr-3">{s.setNumber}</td>
                              <td className="py-2 pr-3">
                                <span className="font-medium">{s.actualReps ?? '—'}</span>
                                {s.planExercise?.targetReps && (
                                  <span className="text-on-surface-variant ml-1">/ {s.planExercise.targetReps}</span>
                                )}
                              </td>
                              <td className="py-2 pr-3">
                                <span className="font-medium">{s.actualWeightKg ? `${s.actualWeightKg}` : '—'}</span>
                                {s.planExercise?.targetWeightKg && (
                                  <span className="text-on-surface-variant ml-1">/ {s.planExercise.targetWeightKg}</span>
                                )}
                              </td>
                              <td className="py-2">
                                {s.completed ? (
                                  <span className="text-xs px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full">Hoàn thành</span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full">Bỏ qua</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-on-surface-variant">Không có dữ liệu set</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
