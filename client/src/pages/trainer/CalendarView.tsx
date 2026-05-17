import { useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";

export default function CalendarView() {
  const navigate = useNavigate();
  // @ts-expect-error unused
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "day">("week");

  const sessions = [
    { id: 1, member: "Nguyễn Văn A", room: "Phòng 1", start: "08:00", end: "09:00", status: "scheduled", day: 0 },
    { id: 2, member: "Trần Thị B", room: "Phòng 2", start: "09:30", end: "10:30", status: "in_progress", day: 0 },
    { id: 3, member: "Lê Văn C", room: "Phòng 1", start: "11:00", end: "12:00", status: "scheduled", day: 1 },
    { id: 4, member: "Phạm Thị D", room: "Phòng 3", start: "14:00", end: "15:00", status: "scheduled", day: 2 }
  ];

  const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return '#FBBF24';
      case "in_progress": return '#6366F1';
      case "completed": return '#34D399';
      case "cancelled": return '#EF4444';
      default: return '#99907C';
    }
  };

  return (
    <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 style={{ color: '#D4AF37', fontSize: '2rem', fontWeight: 600 }}>
              Lịch tập
            </h1>
            <p style={{ color: '#99907C' }}>
              Xem lịch tập theo thời gian biểu
            </p>
          </div>

          <button
            onClick={() => navigate('/trainer/create-session')}
            className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105"
            style={{
              backgroundColor: '#D4AF37',
              color: '#000000',
              fontWeight: 600
            }}
          >
            <Plus size={16} />
            <span>Tạo buổi tập mới</span>
          </button>
        </div>

        {/* Controls */}
        <div
          className="p-4 rounded-lg mb-6 flex items-center justify-between flex-wrap gap-4"
          style={{
            backgroundColor: '#1E2020',
            border: '1px solid #4D4635',
            borderRadius: '16px 16px 4px 4px'
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => {}}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: '#282A2B' }}
            >
              <ChevronLeft size={20} style={{ color: '#D4AF37' }} />
            </button>

            <div className="flex items-center gap-2">
              <Calendar size={20} style={{ color: '#D4AF37' }} />
              <span style={{ color: '#E5E5E5', fontWeight: 600 }}>
                Tuần 16/05/2026 - 22/05/2026
              </span>
            </div>

            <button
              onClick={() => {}}
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{ backgroundColor: '#282A2B' }}
            >
              <ChevronRight size={20} style={{ color: '#D4AF37' }} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {[
              { value: "day", label: "Ngày" },
              { value: "week", label: "Tuần" }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value as any)}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  backgroundColor: viewMode === mode.value ? '#D4AF37' : '#282A2B',
                  color: viewMode === mode.value ? '#000000' : '#E5E5E5',
                  fontSize: '0.875rem',
                  fontWeight: viewMode === mode.value ? 600 : 400
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: '#1E2020',
            border: '1px solid #4D4635',
            borderRadius: '16px 16px 4px 4px'
          }}
        >
          <div className="overflow-x-auto">
            <div style={{ minWidth: '800px' }}>
              {/* Header */}
              <div className="grid grid-cols-8" style={{ backgroundColor: '#282A2B' }}>
                <div className="p-3 border-r" style={{ borderColor: '#4D4635' }}>
                  <span style={{ color: '#D4AF37', fontWeight: 600 }}>Giờ</span>
                </div>
                {weekDays.map((day, idx) => (
                  <div key={idx} className="p-3 text-center border-r" style={{ borderColor: '#4D4635' }}>
                    <span style={{ color: '#D4AF37', fontWeight: 600 }}>{day}</span>
                    <p style={{ color: '#99907C', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {16 + idx}/05
                    </p>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              {timeSlots.map((time, timeIdx) => (
                <div key={timeIdx} className="grid grid-cols-8 border-t" style={{ borderColor: '#4D4635' }}>
                  <div className="p-3 border-r" style={{ borderColor: '#4D4635', backgroundColor: '#282A2B' }}>
                    <span style={{ color: '#99907C', fontSize: '0.875rem' }}>{time}</span>
                  </div>

                  {weekDays.map((_, dayIdx) => {
                    const daySession = sessions.find(s => s.day === dayIdx && s.start === time);
                    
                    return (
                      <div
                        key={dayIdx}
                        className="p-2 border-r min-h-[60px] relative"
                        style={{ borderColor: '#4D4635' }}
                      >
                        {daySession && (
                          <button
                            onClick={() => navigate(`/trainer/sessions/${daySession.id}`)}
                            className="w-full p-2 rounded text-left transition-all hover:scale-105"
                            style={{
                              backgroundColor: `${getStatusColor(daySession.status)}20`,
                              border: `1px solid ${getStatusColor(daySession.status)}`
                            }}
                          >
                            <p style={{ color: '#E5E5E5', fontWeight: 600, fontSize: '0.75rem' }}>
                              {daySession.member}
                            </p>
                            <p style={{ color: '#99907C', fontSize: '0.625rem' }}>
                              {daySession.room}
                            </p>
                            <p style={{ color: '#99907C', fontSize: '0.625rem' }}>
                              {daySession.start} - {daySession.end}
                            </p>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {sessions.length === 0 && (
          <div
            className="p-12 rounded-lg text-center mt-6"
            style={{
              backgroundColor: '#1E2020',
              border: '1px solid #4D4635',
              borderRadius: '16px 16px 4px 4px'
            }}
          >
            <p style={{ color: '#99907C' }}>
              Không có buổi tập trong tuần này
            </p>
          </div>
        )}
      </div>
  );
}
