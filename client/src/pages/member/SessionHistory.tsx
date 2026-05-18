import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { Dumbbell, Clock, User, MapPin, Filter, ChevronDown } from "lucide-react";

export default function SessionHistory() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const upcomingSessions = [
    {
      id: "S001",
      session_name: "Personal Training",
      trainer: "PT. Nguyễn Văn A",
      room: "Phòng 1",
      start_time: "Hôm nay, 10:00",
      end_time: "Hôm nay, 11:00",
      status: "scheduled"
    }
  ];

  const pastSessions = [
    {
      id: "S002",
      session_name: "Yoga",
      trainer: "PT. Trần Thị B",
      room: "Phòng 2",
      start_time: "Hôm qua, 17:00",
      end_time: "Hôm qua, 18:00",
      status: "completed",
      attendance_linked: true
    },
    {
      id: "S003",
      session_name: "Cardio Session",
      trainer: "PT. Lê Văn C",
      room: "Phòng 3",
      start_time: "15/05/2026, 09:00",
      end_time: "15/05/2026, 10:00",
      status: "completed",
      attendance_linked: true
    },
    {
      id: "S004",
      session_name: "Strength Training",
      trainer: "PT. Nguyễn Văn A",
      room: "Phòng 1",
      start_time: "14/05/2026, 14:00",
      end_time: "14/05/2026, 15:30",
      status: "cancelled",
      attendance_linked: false
    }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "scheduled":
        return { bg: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24', label: 'Đã đặt lịch' };
      case "completed":
        return { bg: 'rgba(52, 211, 153, 0.1)', color: '#34D399', label: 'Hoàn thành' };
      case "cancelled":
        return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', label: 'Đã hủy' };
      case "in_progress":
        return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', label: 'Đang diễn ra' };
      default:
        return { bg: '#121414', color: '#d0c5af', label: status };
    }
  };

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Lịch sử buổi tập"
          description="Xem lịch hẹn, buổi hoàn thành và buổi đã hủy theo từng trạng thái."
        />

        {/* Filters */}
        <div
          className="p-4 rounded-[1.75rem] mb-6 flex items-center gap-4 flex-wrap backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <div className="flex items-center gap-2">
            <Filter size={20} style={{ color: '#f2ca50' }} />
            <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Trạng thái:</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "Tất cả" },
              { value: "scheduled", label: "Đã đặt" },
              { value: "completed", label: "Hoàn thành" },
              { value: "cancelled", label: "Đã hủy" }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  backgroundColor: statusFilter === filter.value ? '#f2ca50' : '#121414',
                  color: statusFilter === filter.value ? '#000000' : '#e2e2e2',
                  fontSize: '0.875rem',
                  fontWeight: statusFilter === filter.value ? 600 : 400
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="member-card-title text-2xl mb-4">
              Buổi tập sắp tới
            </h2>
            <div className="space-y-4">
              {upcomingSessions.map((session) => {
                const statusStyle = getStatusStyle(session.status);
                return (
                  <div
                    key={session.id}
                    className="p-6 rounded-[1.75rem] backdrop-blur-sm"
                    style={{
                      backgroundColor: '#1a1a1a',
                      border: '2px solid #f2ca50',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: '#f2ca50' }}
                        >
                          <Dumbbell size={28} style={{ color: '#000000' }} />
                        </div>
                        <div>
                          <h3 style={{ color: '#e2e2e2', fontSize: '1.25rem', fontWeight: 600 }}>
                            {session.session_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <User size={14} style={{ color: '#d0c5af' }} />
                            <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                              {session.trainer}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem', fontWeight: 600 }}
                      >
                        {statusStyle.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock size={16} style={{ color: '#f2ca50' }} />
                        <div>
                          <p style={{ color: '#d0c5af', fontSize: '0.75rem' }}>Thời gian</p>
                          <p style={{ color: '#e2e2e2', fontSize: '0.875rem', fontWeight: 600 }}>
                            {session.start_time} - {session.end_time.split(', ')[1]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} style={{ color: '#f2ca50' }} />
                        <div>
                          <p style={{ color: '#d0c5af', fontSize: '0.75rem' }}>Địa điểm</p>
                          <p style={{ color: '#e2e2e2', fontSize: '0.875rem', fontWeight: 600 }}>
                            {session.room}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Sessions */}
        <div>
          <h2 className="member-card-title text-2xl mb-4">
            Lịch sử
          </h2>
          <div className="space-y-4">
            {pastSessions.map((session) => {
              const statusStyle = getStatusStyle(session.status);
              const isExpanded = expandedId === session.id;

              return (
                <div
                  key={session.id}
                  className="rounded-[1.75rem] backdrop-blur-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #4d4635',
                  }}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className="w-full p-6 text-left transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: '#121414' }}
                        >
                          <Dumbbell size={24} style={{ color: '#f2ca50' }} />
                        </div>
                        <div className="flex-1">
                          <h4 style={{ color: '#e2e2e2', fontWeight: 600, fontSize: '1.125rem' }}>
                            {session.session_name}
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1">
                              <User size={14} style={{ color: '#d0c5af' }} />
                              <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                {session.trainer}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={14} style={{ color: '#d0c5af' }} />
                              <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                                {session.start_time}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem', fontWeight: 600 }}
                        >
                          {statusStyle.label}
                        </div>
                        <ChevronDown
                          size={20}
                          style={{
                            color: '#d0c5af',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                            transition: 'transform 0.2s'
                          }}
                        />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className="px-6 pb-6"
                      style={{ borderTop: '1px solid #4d4635' }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                          <p style={{ color: '#d0c5af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Địa điểm
                          </p>
                          <div className="flex items-center gap-2">
                            <MapPin size={16} style={{ color: '#f2ca50' }} />
                            <span style={{ color: '#e2e2e2', fontWeight: 600 }}>
                              {session.room}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 rounded-[1.75rem]" style={{ backgroundColor: '#121414' }}>
                          <p style={{ color: '#d0c5af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            Attendance
                          </p>
                          <span style={{ color: session.attendance_linked ? '#34D399' : '#EF4444', fontWeight: 600 }}>
                            {session.attendance_linked ? "Đã điểm danh" : "Chưa điểm danh"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
