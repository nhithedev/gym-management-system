import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Calendar, Clock, MapPin, User, CheckCircle, Edit2, XCircle, RefreshCw, AlertCircle, FileText } from "lucide-react";

export default function SessionDetail() {
  const navigate = useNavigate();
  // @ts-expect-error unused
  const { id } = useParams();
  // @ts-expect-error unused
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  // @ts-expect-error unused
  const [showCancelModal, setShowCancelModal] = useState(false);

  const session = {
    id: "SS001",
    member: {
      name: "Nguyễn Văn A",
      code: "MEM001",
      phone: "0901234567"
    },
    room: "Phòng 1",
    start_time: "16/05/2026 08:00",
    end_time: "16/05/2026 10:00",
    status: "completed",
    attendance_linked: true,
    checked_in_at: "16/05/2026 08:05",
    checked_out_at: "16/05/2026 09:55",
    notes: "Học viên có tiến bộ rõ rệt trong bài tập cardio. Tăng cường độ lên 15%.",
    created_at: "10/05/2026 14:30",
    created_by: "PT. Nguyễn Văn A"
  };

  const timeline = [
    { time: "10/05/2026 14:30", event: "Buổi tập được tạo", type: "created" },
    { time: "16/05/2026 08:05", event: "Học viên check-in", type: "checkin" },
    { time: "16/05/2026 09:55", event: "Học viên check-out", type: "checkout" },
    { time: "16/05/2026 10:00", event: "Buổi tập hoàn thành", type: "completed" }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return { bg: 'rgba(52, 211, 153, 0.1)', color: '#34D399', label: 'Hoàn thành' };
      case "in_progress": return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', label: 'Đang diễn ra' };
      case "scheduled": return { bg: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24', label: 'Đã lên lịch' };
      case "cancelled": return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', label: 'Đã hủy' };
      default: return { bg: '#282A2B', color: '#99907C', label: status };
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case "created": return <Calendar size={16} style={{ color: '#D4AF37' }} />;
      case "checkin": return <CheckCircle size={16} style={{ color: '#34D399' }} />;
      case "checkout": return <Clock size={16} style={{ color: '#6366F1' }} />;
      case "completed": return <CheckCircle size={16} style={{ color: '#34D399' }} />;
      case "cancelled": return <XCircle size={16} style={{ color: '#EF4444' }} />;
      default: return <AlertCircle size={16} style={{ color: '#99907C' }} />;
    }
  };

  const statusStyle = getStatusStyle(session.status);

  return (
    <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/trainer/sessions')}
              style={{ color: '#99907C' }}
              className="hover:underline"
            >
              Danh sách buổi tập
            </button>
            <span style={{ color: '#99907C' }}>/</span>
            <span style={{ color: '#E5E5E5' }}>Chi tiết buổi tập</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ color: '#D4AF37', fontSize: '2rem', fontWeight: 600 }}>
                Session #{session.id}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem', fontWeight: 600 }}
                >
                  {statusStyle.label}
                </div>
                {session.attendance_linked && (
                  <div className="flex items-center gap-2" style={{ color: '#34D399', fontSize: '0.875rem' }}>
                    <CheckCircle size={16} />
                    <span>Đã điểm danh</span>
                  </div>
                )}
              </div>
            </div>
            {session.status === "scheduled" && (
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/trainer/edit-session/${session.id}`)}
                  className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#282A2B',
                    color: '#D4AF37',
                    border: '1px solid #D4AF37',
                    fontWeight: 600
                  }}
                >
                  <Edit2 size={16} />
                  <span>Chỉnh sửa</span>
                </button>
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#282A2B',
                    color: '#6366F1',
                    border: '1px solid #6366F1',
                    fontWeight: 600
                  }}
                >
                  <RefreshCw size={16} />
                  <span>Đổi lịch</span>
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#282A2B',
                    color: '#EF4444',
                    border: '1px solid #EF4444',
                    fontWeight: 600
                  }}
                >
                  <XCircle size={16} />
                  <span>Hủy buổi tập</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Info */}
            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: '#1E2020',
                border: '1px solid #4D4635',
                borderRadius: '16px 16px 4px 4px'
              }}
            >
              <h2 className="mb-6" style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>
                Thông tin buổi tập
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#282A2B' }}
                  >
                    <Calendar size={20} style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <p style={{ color: '#99907C', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      Thời gian bắt đầu
                    </p>
                    <p style={{ color: '#E5E5E5', fontWeight: 600 }}>
                      {session.start_time}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#282A2B' }}
                  >
                    <Clock size={20} style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <p style={{ color: '#99907C', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      Thời gian kết thúc
                    </p>
                    <p style={{ color: '#E5E5E5', fontWeight: 600 }}>
                      {session.end_time}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#282A2B' }}
                  >
                    <MapPin size={20} style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <p style={{ color: '#99907C', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      Phòng tập
                    </p>
                    <p style={{ color: '#E5E5E5', fontWeight: 600 }}>
                      {session.room}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#282A2B' }}
                  >
                    <User size={20} style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <p style={{ color: '#99907C', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      Người tạo
                    </p>
                    <p style={{ color: '#E5E5E5', fontWeight: 600 }}>
                      {session.created_by}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Card */}
            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: '#1E2020',
                border: '1px solid #4D4635',
                borderRadius: '16px 16px 4px 4px'
              }}
            >
              <h2 className="mb-4" style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>
                Học viên
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ color: '#E5E5E5', fontSize: '1.125rem', fontWeight: 600 }}>
                    {session.member.name}
                  </p>
                  <p style={{ color: '#99907C', fontSize: '0.875rem' }}>
                    {session.member.code} • {session.member.phone}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/trainer/students/${session.member.code}`)}
                  className="px-4 py-2 rounded-full transition-all hover:scale-105"
                  style={{
                    backgroundColor: '#D4AF37',
                    color: '#000000',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Xem hồ sơ
                </button>
              </div>
            </div>

            {/* Attendance Block */}
            {session.attendance_linked && (
              <div
                className="p-6 rounded-lg"
                style={{
                  backgroundColor: '#1E2020',
                  border: '1px solid #4D4635',
                  borderRadius: '16px 16px 4px 4px'
                }}
              >
                <h2 className="mb-4" style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>
                  Thông tin điểm danh
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#282A2B' }}
                  >
                    <p style={{ color: '#99907C', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Check-in
                    </p>
                    <p style={{ color: '#34D399', fontWeight: 600, fontSize: '1.125rem' }}>
                      {session.checked_in_at}
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: '#282A2B' }}
                  >
                    <p style={{ color: '#99907C', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Check-out
                    </p>
                    <p style={{ color: '#6366F1', fontWeight: 600, fontSize: '1.125rem' }}>
                      {session.checked_out_at}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: '#1E2020',
                border: '1px solid #4D4635',
                borderRadius: '16px 16px 4px 4px'
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <FileText size={20} style={{ color: '#D4AF37' }} />
                <h2 style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>
                  Ghi chú
                </h2>
              </div>
              <p style={{ color: '#E5E5E5', lineHeight: '1.6' }}>
                {session.notes || "Chưa có ghi chú cho buổi tập này"}
              </p>
            </div>
          </div>

          {/* Timeline Sidebar */}
          <div>
            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: '#1E2020',
                border: '1px solid #4D4635',
                borderRadius: '16px 16px 4px 4px'
              }}
            >
              <h2 className="mb-6" style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>
                Timeline
              </h2>
              <div className="space-y-4">
                {timeline.map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#282A2B' }}
                      >
                        {getTimelineIcon(item.type)}
                      </div>
                      {idx < timeline.length - 1 && (
                        <div
                          className="w-0.5 flex-1 mt-2"
                          style={{ backgroundColor: '#4D4635', minHeight: '32px' }}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p style={{ color: '#E5E5E5', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {item.event}
                      </p>
                      <p style={{ color: '#99907C', fontSize: '0.875rem' }}>
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
