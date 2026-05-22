import { useMemo, useState } from 'react'
import { MessageSquare, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

type FeedbackItem = {
  id: string
  member: string
  type: string
  status: 'Chờ xử lý' | 'Đang xử lý' | 'Đã xử lý'
  subject: string
  createdAt: string
}

const sampleFeedback: FeedbackItem[] = [
  { id: '1', member: 'Nguyễn Văn A', type: 'Thiết bị', status: 'Chờ xử lý', subject: 'Máy chạy bộ bị rung', createdAt: '2024-05-20 09:12' },
  { id: '2', member: 'Trần Thị B', type: 'Dịch vụ', status: 'Đang xử lý', subject: 'Phòng tập quá đông giờ cao điểm', createdAt: '2024-05-20 10:05' },
  { id: '3', member: 'Lê Văn C', type: 'Thanh toán', status: 'Đã xử lý', subject: 'Hóa đơn bị trùng', createdAt: '2024-05-19 16:42' },
]

const statusClasses: Record<FeedbackItem['status'], string> = {
  'Chờ xử lý': 'bg-warning/10 text-warning',
  'Đang xử lý': 'bg-primary/10 text-primary',
  'Đã xử lý': 'bg-green-100 text-green-700',
}

export default function FeedbackPage() {
  const [selectedId, setSelectedId] = useState(sampleFeedback[0]?.id)
  const selectedFeedback = useMemo(() => sampleFeedback.find((item) => item.id === selectedId), [selectedId])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold">Quản lý phản hồi</p>
          <h1 className="mt-2 text-3xl font-semibold">Đơn phản hồi</h1>
          <p className="mt-2 text-sm text-on-surface/70">Xem danh sách phản hồi, phân loại và cập nhật trạng thái xử lý.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">
          <MessageSquare className="w-4 h-4" />
          Thêm phản hồi mới
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-on-surface-variant">Danh sách phản hồi</div>
            <div className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm text-on-surface-variant">
              <Clock className="w-4 h-4" /> 3 phản hồi
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {sampleFeedback.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full rounded-3xl border p-4 text-left transition ${selectedId === item.id ? 'border-primary bg-primary/5' : 'border-outline hover:border-primary/80'}`}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">{item.member}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[item.status]}`}>{item.status}</span>
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">{item.subject}</p>
                <p className="mt-2 text-xs text-on-surface-variant">{item.createdAt}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-high p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-on-surface-variant">Chi tiết</p>
              <h2 className="mt-2 text-2xl font-semibold">{selectedFeedback?.subject}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedFeedback ? statusClasses[selectedFeedback.status] : ''}`}>
              {selectedFeedback?.status}
            </span>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-3xl bg-surface p-5">
              <p className="text-sm font-semibold">Người gửi</p>
              <p className="mt-2 text-sm text-on-surface-variant">{selectedFeedback?.member}</p>
            </div>
            <div className="rounded-3xl bg-surface p-5">
              <p className="text-sm font-semibold">Loại phản hồi</p>
              <p className="mt-2 text-sm text-on-surface-variant">{selectedFeedback?.type}</p>
            </div>
            <div className="rounded-3xl bg-surface p-5">
              <p className="text-sm font-semibold">Nội dung</p>
              <p className="mt-2 text-sm text-on-surface-variant">Nội dung chi tiết yêu cầu xử lý sẽ hiển thị ở đây khi kết nối backend.</p>
            </div>
            <div className="rounded-3xl bg-surface p-5">
              <p className="text-sm font-semibold">Lịch sử xử lý</p>
              <ul className="mt-3 space-y-3 text-sm text-on-surface-variant">
                <li className="rounded-2xl bg-surface-container p-3">[09:20] Nhận phản hồi và phân công cho bộ phận kỹ thuật.</li>
                <li className="rounded-2xl bg-surface-container p-3">[10:05] Kiểm tra thực tế và ghi nhận máy có hiện tượng rung.</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"><CheckCircle className="w-4 h-4" /> Đánh dấu đã xử lý</button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-outline px-4 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-high"><AlertTriangle className="w-4 h-4" /> Chuyển sang kỹ thuật</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
