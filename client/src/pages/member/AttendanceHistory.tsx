import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { Calendar, Clock, Activity, TrendingUp, Filter } from "lucide-react";

export default function AttendanceHistory() {
  const [dateRange, setDateRange] = useState<string>("this-month");

  const attendanceSummary = {
    total_this_month: 18,
    last_checkin: "Hôm nay, 08:30",
    streak: 5
  };

  const attendanceRecords = [
    {
      id: 1,
      checked_in_at: "16/05/2026 08:30",
      end_time: "16/05/2026 10:00",
      method: "QR Code",
      linked_session: "Personal Training với PT. Nguyễn Văn A",
      subscription: "Premium Package"
    },
    {
      id: 2,
      checked_in_at: "15/05/2026 17:00",
      end_time: "15/05/2026 18:30",
      method: "Member Code",
      linked_session: "Tự tập",
      subscription: "Premium Package"
    },
    {
      id: 3,
      checked_in_at: "14/05/2026 06:30",
      end_time: "14/05/2026 08:00",
      method: "QR Code",
      linked_session: "Yoga với PT. Trần Thị B",
      subscription: "Premium Package"
    },
    {
      id: 4,
      checked_in_at: "13/05/2026 09:00",
      end_time: "13/05/2026 10:30",
      method: "App Check-in",
      linked_session: "Cardio",
      subscription: "Premium Package"
    },
    {
      id: 5,
      checked_in_at: "12/05/2026 18:00",
      end_time: "12/05/2026 19:30",
      method: "QR Code",
      linked_session: "Strength Training với PT. Lê Văn C",
      subscription: "Premium Package"
    }
  ];

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Lịch sử điểm danh"
          description="Theo dõi tần suất check-in, streak và nhịp tập luyện của bạn."
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div
            className="p-6 rounded-[1.75rem] backdrop-blur-sm"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#f2ca50' }}
              >
                <Activity size={24} style={{ color: '#000000' }} />
              </div>
              <div>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                  Check-in tháng này
                </p>
                <p className="text-3xl font-semibold text-[#e2e2e2]">
                  {attendanceSummary.total_this_month}
                </p>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-[1.75rem] backdrop-blur-sm"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#f2ca50' }}
              >
                <Clock size={24} style={{ color: '#000000' }} />
              </div>
              <div>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                  Lần gần nhất
                </p>
                <p style={{ color: '#e2e2e2', fontSize: '1.125rem', fontWeight: 600 }}>
                  {attendanceSummary.last_checkin}
                </p>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-[1.75rem] backdrop-blur-sm"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#f2ca50' }}
              >
                <TrendingUp size={24} style={{ color: '#000000' }} />
              </div>
              <div>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                  Streak liên tiếp
                </p>
                <p className="text-3xl font-semibold text-[#e2e2e2]">
                  {attendanceSummary.streak} ngày
                </p>
              </div>
            </div>
          </div>
        </div>

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
            <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Thời gian:</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: "today", label: "Hôm nay" },
              { value: "this-week", label: "Tuần này" },
              { value: "this-month", label: "Tháng này" },
              { value: "last-month", label: "Tháng trước" },
              { value: "all", label: "Tất cả" }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setDateRange(filter.value)}
                className="px-4 py-2 rounded-full transition-all"
                style={{
                  backgroundColor: dateRange === filter.value ? '#f2ca50' : '#121414',
                  color: dateRange === filter.value ? '#000000' : '#e2e2e2',
                  fontSize: '0.875rem',
                  fontWeight: dateRange === filter.value ? 600 : 400
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Table */}
        <div
          className="rounded-[1.75rem] overflow-hidden backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#121414', borderBottom: '1px solid #4d4635' }}>
                  <th className="text-left p-4" style={{ color: '#f2ca50', fontWeight: 600 }}>
                    Thời gian check-in
                  </th>
                  <th className="text-left p-4" style={{ color: '#f2ca50', fontWeight: 600 }}>
                    Thời gian kết thúc
                  </th>
                  <th className="text-left p-4" style={{ color: '#f2ca50', fontWeight: 600 }}>
                    Phương thức
                  </th>
                  <th className="text-left p-4" style={{ color: '#f2ca50', fontWeight: 600 }}>
                    Buổi tập
                  </th>
                  <th className="text-left p-4" style={{ color: '#f2ca50', fontWeight: 600 }}>
                    Gói sử dụng
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, idx) => (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: idx < attendanceRecords.length - 1 ? '1px solid #4d4635' : 'none'
                    }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} style={{ color: '#f2ca50' }} />
                        <span style={{ color: '#e2e2e2' }}>
                          {record.checked_in_at}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock size={16} style={{ color: '#d0c5af' }} />
                        <span style={{ color: '#e2e2e2' }}>
                          {record.end_time}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className="inline-block px-3 py-1 rounded-full"
                        style={{ backgroundColor: '#121414', color: '#f2ca50', fontSize: '0.875rem' }}
                      >
                        {record.method}
                      </div>
                    </td>
                    <td className="p-4" style={{ color: '#e2e2e2' }}>
                      {record.linked_session}
                    </td>
                    <td className="p-4" style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                      {record.subscription}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {attendanceRecords.length === 0 && (
          <div
            className="p-12 rounded-[1.75rem] text-center backdrop-blur-sm"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <div
              className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{ backgroundColor: '#121414' }}
            >
              <Activity size={48} style={{ color: '#d0c5af' }} />
            </div>
            <h3 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Chưa có lịch sử điểm danh
            </h3>
            <p className="member-page-subtitle">
              Bắt đầu check-in để theo dõi tiến độ tập luyện
            </p>
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
