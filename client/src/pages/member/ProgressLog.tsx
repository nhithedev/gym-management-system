import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { Calendar, User, TrendingUp, TrendingDown, Filter, FileText } from "lucide-react";

export default function ProgressLog() {
  const [dateRange, setDateRange] = useState<string>("all");

  const progressRecords = [
    {
      id: 1,
      recorded_at: "15/05/2026 10:30",
      weight: 75.5,
      bmi: 23.8,
      goal: "Giảm cân",
      notes: "Tiến độ tốt, tiếp tục duy trì chế độ ăn uống và luyện tập",
      recorded_by: "PT. Nguyễn Văn A",
      weight_change: -1.0,
      bmi_change: -0.3
    },
    {
      id: 2,
      recorded_at: "10/05/2026 14:20",
      weight: 76.5,
      bmi: 24.1,
      goal: "Giảm cân",
      notes: "Cân nặng giảm nhẹ, cần tăng cường cardio",
      recorded_by: "PT. Nguyễn Văn A",
      weight_change: -1.0,
      bmi_change: -0.3
    },
    {
      id: 3,
      recorded_at: "05/05/2026 09:15",
      weight: 77.5,
      bmi: 24.4,
      goal: "Giảm cân",
      notes: "Bắt đầu chương trình, thiết lập mục tiêu giảm 5kg",
      recorded_by: "PT. Nguyễn Văn A",
      weight_change: 0,
      bmi_change: 0
    }
  ];

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Nhật ký tiến độ"
          description="Bản ghi PT cập nhật theo buổi tập, kèm nhận xét và thay đổi số đo."
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
            <span style={{ color: '#e2e2e2', fontWeight: 600 }}>Thời gian:</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { value: "all", label: "Tất cả" },
              { value: "this-month", label: "Tháng này" },
              { value: "last-month", label: "Tháng trước" },
              { value: "3-months", label: "3 tháng gần đây" }
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

        {/* Progress Records */}
        <div className="space-y-4">
          {progressRecords.map((record) => (
            <div
              key={record.id}
              className="p-6 rounded-[1.75rem] backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#f2ca50' }}
                  >
                    <FileText size={24} style={{ color: '#000000' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={16} style={{ color: '#d0c5af' }} />
                      <span style={{ color: '#e2e2e2', fontWeight: 600 }}>
                        {record.recorded_at}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} style={{ color: '#d0c5af' }} />
                      <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                        Ghi nhận bởi {record.recorded_by}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: '#121414', color: '#f2ca50', fontSize: '0.875rem', fontWeight: 600 }}
                >
                  {record.goal}
                </div>
              </div>

              {/* Measurements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div
                  className="p-4 rounded-[1.75rem]"
                  style={{ backgroundColor: '#121414' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                      Cân nặng
                    </span>
                    {record.weight_change !== 0 && (
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: record.weight_change < 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: record.weight_change < 0 ? '#34D399' : '#EF4444',
                          fontSize: '0.75rem'
                        }}
                      >
                        {record.weight_change < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                        <span style={{ fontWeight: 600 }}>
                          {record.weight_change > 0 ? '+' : ''}{record.weight_change} kg
                        </span>
                      </div>
                    )}
                  </div>
                  <p style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600 }}>
                    {record.weight} kg
                  </p>
                </div>

                <div
                  className="p-4 rounded-[1.75rem]"
                  style={{ backgroundColor: '#121414' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: '#d0c5af', fontSize: '0.875rem' }}>
                      BMI
                    </span>
                    {record.bmi_change !== 0 && (
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: record.bmi_change < 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: record.bmi_change < 0 ? '#34D399' : '#EF4444',
                          fontSize: '0.75rem'
                        }}
                      >
                        {record.bmi_change < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                        <span style={{ fontWeight: 600 }}>
                          {record.bmi_change > 0 ? '+' : ''}{record.bmi_change}
                        </span>
                      </div>
                    )}
                  </div>
                  <p style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600 }}>
                    {record.bmi}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {record.notes && (
                <div
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(242, 202, 80, 0.1)', border: '1px solid #f2ca50' }}
                >
                  <p style={{ color: '#d0c5af', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Ghi chú từ PT:
                  </p>
                  <p style={{ color: '#e2e2e2' }}>
                    {record.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {progressRecords.length === 0 && (
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
              <FileText size={48} style={{ color: '#d0c5af' }} />
            </div>
            <h3 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Chưa có bản ghi tiến độ
            </h3>
            <p className="member-page-subtitle">
              PT sẽ ghi nhận tiến độ của bạn sau mỗi buổi tập
            </p>
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
