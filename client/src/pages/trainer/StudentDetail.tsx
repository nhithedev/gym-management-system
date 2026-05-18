import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { User, Phone, Mail, Calendar, Target, Package, Dumbbell, Activity, TrendingUp } from "lucide-react";

export default function StudentDetail() {
  const navigate = useNavigate();
  const { id: _id } = useParams();
  void _id;
  const [activeTab, setActiveTab] = useState("overview");

  const student = {
    member_code: "MB001",
    full_name: "Nguyễn Văn A",
    phone: "0123456789",
    email: "nguyenvana@email.com",
    dob: "20/05/1995",
    current_package: "Premium Package",
    package_status: "active",
    package_end_date: "16/11/2026",
    primary_trainer: "PT. Nguyễn Văn A",
    latest_goal: "Giảm 5kg trong 3 tháng"
  };

  const upcomingSession = {
    date: "16/05/2026",
    time: "10:00 - 11:00",
    type: "Personal Training",
    room: "Phòng 1"
  };

  const latestProgress = {
    date: "15/05/2026",
    weight: 75.5,
    bmi: 23.8,
    weight_change: -2.5
  };

  const sessions = [
    { id: 1, date: "16/05/2026", time: "10:00 - 11:00", type: "Personal Training", status: "scheduled" },
    { id: 2, date: "14/05/2026", time: "14:00 - 15:00", type: "Cardio", status: "completed" },
    { id: 3, date: "12/05/2026", time: "09:00 - 10:00", type: "Yoga", status: "completed" }
  ];

  const attendanceRecords = [
    { date: "15/05/2026", time: "08:30", session: "Cardio - Phòng 1" },
    { date: "14/05/2026", time: "14:00", session: "Personal Training - Phòng 1" },
    { date: "12/05/2026", time: "09:00", session: "Yoga - Phòng 2" }
  ];

  const progressRecords = [
    { date: "15/05/2026", weight: 75.5, bmi: 23.8, change: -1.0 },
    { date: "10/05/2026", weight: 76.5, bmi: 24.1, change: -1.0 },
    { date: "05/05/2026", weight: 77.5, bmi: 24.4, change: 0 }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "scheduled": return { bg: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24', label: 'Đã lên lịch' };
      case "completed": return { bg: 'rgba(52, 211, 153, 0.1)', color: '#34D399', label: 'Hoàn thành' };
      case "cancelled": return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', label: 'Đã hủy' };
      default: return { bg: '#282A2B', color: '#99907C', label: status };
    }
  };

  return (
    <div className="p-8">
        {/* Header Card */}
        <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D4AF37' }}>
                <User size={40} style={{ color: '#000000' }} />
              </div>
              <div>
                <h1 style={{ color: '#E5E5E5', fontSize: '2rem', fontWeight: 600 }}>{student.full_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 rounded-full" style={{ backgroundColor: '#282A2B', color: '#D4AF37', fontSize: '0.875rem', fontWeight: 600 }}>{student.member_code}</span>
                  <div className="px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34D399', fontSize: '0.875rem', fontWeight: 600 }}>Active</div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/trainer/create-session', { state: { student } })} className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105" style={{ backgroundColor: '#D4AF37', color: '#000000', fontWeight: 600 }}>
                <Dumbbell size={16} />
                <span>Tạo buổi tập</span>
              </button>
              <button onClick={() => navigate('/trainer/add-progress', { state: { student } })} className="px-4 py-2 rounded-full flex items-center gap-2 transition-all hover:scale-105" style={{ backgroundColor: 'transparent', border: '1px solid #D4AF37', color: '#D4AF37', fontWeight: 600 }}>
                <TrendingUp size={16} />
                <span>Thêm tiến độ</span>
              </button>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#282A2B' }}>
              <div className="flex items-center gap-2 mb-2">
                <Phone size={16} style={{ color: '#D4AF37' }} />
                <p style={{ color: '#99907C', fontSize: '0.875rem' }}>Điện thoại</p>
              </div>
              <p style={{ color: '#E5E5E5', fontWeight: 600 }}>{student.phone}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#282A2B' }}>
              <div className="flex items-center gap-2 mb-2">
                <Mail size={16} style={{ color: '#D4AF37' }} />
                <p style={{ color: '#99907C', fontSize: '0.875rem' }}>Email</p>
              </div>
              <p style={{ color: '#E5E5E5', fontWeight: 600, fontSize: '0.875rem' }}>{student.email}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#282A2B' }}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} style={{ color: '#D4AF37' }} />
                <p style={{ color: '#99907C', fontSize: '0.875rem' }}>Ngày sinh</p>
              </div>
              <p style={{ color: '#E5E5E5', fontWeight: 600 }}>{student.dob}</p>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#282A2B' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} style={{ color: '#D4AF37' }} />
                <p style={{ color: '#99907C', fontSize: '0.875rem' }}>Mục tiêu</p>
              </div>
              <p style={{ color: '#E5E5E5', fontWeight: 600, fontSize: '0.875rem' }}>{student.latest_goal}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-2 rounded-lg mb-6 flex gap-2" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
          {[
            { value: "overview", label: "Tổng quan" },
            { value: "sessions", label: "Buổi tập" },
            { value: "attendance", label: "Attendance" },
            { value: "progress", label: "Tiến độ" }
          ].map((tab) => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)} className="px-4 py-2 rounded-lg transition-all" style={{ backgroundColor: activeTab === tab.value ? '#D4AF37' : 'transparent', color: activeTab === tab.value ? '#000000' : '#E5E5E5', fontWeight: activeTab === tab.value ? 600 : 400 }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
              <div className="flex items-center gap-3 mb-4">
                <Package size={24} style={{ color: '#D4AF37' }} />
                <h3 style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>Gói hiện tại</h3>
              </div>
              <p style={{ color: '#E5E5E5', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{student.current_package}</p>
              <p style={{ color: '#99907C', fontSize: '0.875rem' }}>Hết hạn: {student.package_end_date}</p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
              <div className="flex items-center gap-3 mb-4">
                <Dumbbell size={24} style={{ color: '#D4AF37' }} />
                <h3 style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>Session tiếp theo</h3>
              </div>
              <p style={{ color: '#E5E5E5', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{upcomingSession.type}</p>
              <p style={{ color: '#99907C', fontSize: '0.875rem' }}>{upcomingSession.date} • {upcomingSession.time}</p>
              <p style={{ color: '#99907C', fontSize: '0.875rem' }}>{upcomingSession.room}</p>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={24} style={{ color: '#D4AF37' }} />
                <h3 style={{ color: '#D4AF37', fontSize: '1.25rem', fontWeight: 600 }}>Progress gần nhất</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ color: '#99907C', fontSize: '0.875rem' }}>Cân nặng</p>
                  <p style={{ color: '#E5E5E5', fontSize: '1.5rem', fontWeight: 600 }}>{latestProgress.weight}kg</p>
                </div>
                <div>
                  <p style={{ color: '#99907C', fontSize: '0.875rem' }}>BMI</p>
                  <p style={{ color: '#E5E5E5', fontSize: '1.5rem', fontWeight: 600 }}>{latestProgress.bmi}</p>
                </div>
              </div>
              <p style={{ color: latestProgress.weight_change < 0 ? '#34D399' : '#EF4444', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 600 }}>
                {latestProgress.weight_change > 0 ? '+' : ''}{latestProgress.weight_change}kg
              </p>
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
            <h2 className="mb-6" style={{ color: '#D4AF37', fontSize: '1.5rem', fontWeight: 600 }}>Lịch sử buổi tập</h2>
            <div className="space-y-3">
              {sessions.map((session) => {
                const statusStyle = getStatusStyle(session.status);
                return (
                  <div key={session.id} className="p-4 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#282A2B' }}>
                    <div>
                      <p style={{ color: '#E5E5E5', fontWeight: 600 }}>{session.type}</p>
                      <p style={{ color: '#99907C', fontSize: '0.875rem' }}>{session.date} • {session.time}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontSize: '0.875rem', fontWeight: 600 }}>
                      {statusStyle.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
            <h2 className="mb-6" style={{ color: '#D4AF37', fontSize: '1.5rem', fontWeight: 600 }}>Timeline check-in</h2>
            <div className="space-y-3">
              {attendanceRecords.map((record, idx) => (
                <div key={idx} className="p-4 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#282A2B' }}>
                  <div>
                    <p style={{ color: '#E5E5E5', fontWeight: 600 }}>{record.session}</p>
                    <p style={{ color: '#99907C', fontSize: '0.875rem' }}>{record.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity size={16} style={{ color: '#D4AF37' }} />
                    <span style={{ color: '#E5E5E5' }}>{record.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div>
            <div className="p-6 rounded-lg mb-6" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
              <h2 className="mb-6" style={{ color: '#D4AF37', fontSize: '1.5rem', fontWeight: 600 }}>Biểu đồ tiến độ</h2>
              <div className="h-64 flex items-end gap-4">
                {progressRecords.map((record, idx) => {
                  const height = (record.weight / Math.max(...progressRecords.map(r => r.weight))) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full rounded-t-lg transition-all hover:opacity-80" style={{ height: `${height}%`, backgroundColor: '#D4AF37', minHeight: '40px' }} />
                      <p style={{ color: '#99907C', fontSize: '0.75rem' }}>{record.date.split('/')[0]}/{record.date.split('/')[1]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#1E2020', border: '1px solid #4D4635', borderRadius: '16px 16px 4px 4px' }}>
              <h2 className="mb-6" style={{ color: '#D4AF37', fontSize: '1.5rem', fontWeight: 600 }}>Bản ghi gần đây</h2>
              <div className="space-y-3">
                {progressRecords.map((record, idx) => (
                  <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: '#282A2B' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p style={{ color: '#E5E5E5', fontWeight: 600 }}>{record.date}</p>
                      {record.change !== 0 && (
                        <span style={{ color: record.change < 0 ? '#34D399' : '#EF4444', fontSize: '0.875rem', fontWeight: 600 }}>
                          {record.change > 0 ? '+' : ''}{record.change}kg
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p style={{ color: '#99907C', fontSize: '0.875rem' }}>Cân nặng</p>
                        <p style={{ color: '#E5E5E5', fontSize: '1.25rem', fontWeight: 600 }}>{record.weight}kg</p>
                      </div>
                      <div>
                        <p style={{ color: '#99907C', fontSize: '0.875rem' }}>BMI</p>
                        <p style={{ color: '#E5E5E5', fontSize: '1.25rem', fontWeight: 600 }}>{record.bmi}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
