import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";

export default function ProgressChart() {
  const progressSummary = {
    latest_weight: 75.5,
    latest_bmi: 23.8,
    weight_change: -2.5,
    bmi_change: -0.8
  };

  const weightData = [
    { date: "01/05", weight: 78, bmi: 24.6 },
    { date: "05/05", weight: 77.5, bmi: 24.4 },
    { date: "10/05", weight: 76.5, bmi: 24.1 },
    { date: "15/05", weight: 75.5, bmi: 23.8 }
  ];

  const EmptyState = () => (
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
        <TrendingUp size={48} style={{ color: '#d0c5af' }} />
      </div>
      <h3 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Chưa có bản ghi tiến độ
      </h3>
      <p style={{ color: '#d0c5af', marginBottom: '1rem' }}>
        Liên hệ với PT để bắt đầu theo dõi tiến độ của bạn
      </p>
    </div>
  );

  if (weightData.length === 0) {
    return (
      <MemberLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <SectionHeader
            title="Biểu đồ tiến độ"
            description="Theo dõi cân nặng, BMI và thay đổi cơ thể theo từng mốc thời gian."
          />
          <EmptyState />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Biểu đồ tiến độ"
          description="Theo dõi cân nặng, BMI và thay đổi cơ thể theo từng mốc thời gian."
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div
            className="p-6 rounded-[1.75rem] backdrop-blur-sm"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Activity size={24} style={{ color: '#f2ca50' }} />
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm`}
                style={{
                  backgroundColor: progressSummary.weight_change < 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: progressSummary.weight_change < 0 ? '#34D399' : '#EF4444'
                }}
              >
                {progressSummary.weight_change < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                <span style={{ fontWeight: 600 }}>{Math.abs(progressSummary.weight_change)}kg</span>
              </div>
            </div>
            <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>Cân nặng hiện tại</p>
            <p className="text-3xl font-semibold text-[#e2e2e2]">
              {progressSummary.latest_weight} kg
            </p>
          </div>

          <div
            className="p-6 rounded-[1.75rem] backdrop-blur-sm"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #4d4635',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Target size={24} style={{ color: '#f2ca50' }} />
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm`}
                style={{
                  backgroundColor: progressSummary.bmi_change < 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: progressSummary.bmi_change < 0 ? '#34D399' : '#EF4444'
                }}
              >
                {progressSummary.bmi_change < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                <span style={{ fontWeight: 600 }}>{Math.abs(progressSummary.bmi_change)}</span>
              </div>
            </div>
            <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>BMI hiện tại</p>
            <p className="text-3xl font-semibold text-[#e2e2e2]">
              {progressSummary.latest_bmi}
            </p>
          </div>

          <div
            className="p-6 rounded-[1.75rem] col-span-2 backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(242, 202, 80, 0.1)',
              border: '1px solid #f2ca50',
            }}
          >
            <p style={{ color: '#f2ca50', fontWeight: 600, marginBottom: '0.5rem' }}>
              Thay đổi so với lần trước
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>Cân nặng</p>
                <p className="member-card-title text-2xl">
                  {progressSummary.weight_change > 0 ? '+' : ''}{progressSummary.weight_change} kg
                </p>
              </div>
              <div>
                <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>BMI</p>
                <p className="member-card-title text-2xl">
                  {progressSummary.bmi_change > 0 ? '+' : ''}{progressSummary.bmi_change}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weight Chart */}
        <div
          className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <h2 className="member-card-title text-2xl mb-6">
            Cân nặng theo thời gian
          </h2>

          <div className="relative" style={{ height: '300px' }}>
            {/* Simple bar chart visualization */}
            <div className="h-full flex items-end gap-4">
              {weightData.map((data, idx) => {
                const height = (data.weight / Math.max(...weightData.map(d => d.weight))) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-lg transition-all hover:opacity-80 relative group"
                      style={{
                        height: `${height}%`,
                        backgroundColor: '#f2ca50',
                        minHeight: '40px'
                      }}
                    >
                      <div
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded"
                        style={{ backgroundColor: '#121414', whiteSpace: 'nowrap' }}
                      >
                        <span style={{ color: '#e2e2e2', fontSize: '0.875rem', fontWeight: 600 }}>
                          {data.weight} kg
                        </span>
                      </div>
                    </div>
                    <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>{data.date}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BMI Chart */}
        <div
          className="p-6 rounded-[1.75rem] backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          <h2 className="member-card-title text-2xl mb-6">
            BMI theo thời gian
          </h2>

          <div className="relative" style={{ height: '300px' }}>
            <div className="h-full flex items-end gap-4">
              {weightData.map((data, idx) => {
                const height = (data.bmi / Math.max(...weightData.map(d => d.bmi))) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-lg transition-all hover:opacity-80 relative group"
                      style={{
                        height: `${height}%`,
                        backgroundColor: '#C8C6C5',
                        minHeight: '40px'
                      }}
                    >
                      <div
                        className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded"
                        style={{ backgroundColor: '#121414', whiteSpace: 'nowrap' }}
                      >
                        <span style={{ color: '#e2e2e2', fontSize: '0.875rem', fontWeight: 600 }}>
                          {data.bmi}
                        </span>
                      </div>
                    </div>
                    <p style={{ color: '#d0c5af', fontSize: '0.875rem' }}>{data.date}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
