import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle, ChevronRight } from "lucide-react";

export default function MyFeedback() {
  const [activeTab, setActiveTab] = useState<string>("open");

  const feedbackList = [
    {
      id: "FB001",
      type: "equipment",
      subject: "Treadmill #1",
      severity: "high",
      status: "in_progress",
      created_at: "15/05/2026 10:30",
      handled_at: null,
      content: "Treadmill bị lỗi màn hình, không hiển thị thông số",
      overdue: false
    },
    {
      id: "FB002",
      type: "service",
      subject: null,
      severity: "medium",
      status: "resolved",
      created_at: "10/05/2026 14:20",
      handled_at: "12/05/2026 09:00",
      content: "Đề xuất tăng giờ mở cửa vào buổi tối",
      overdue: false
    },
    {
      id: "FB003",
      type: "staff",
      subject: "PT. Nguyễn Văn A",
      severity: "low",
      status: "rejected",
      created_at: "05/05/2026 16:00",
      handled_at: "06/05/2026 10:00",
      content: "Góp ý về phương pháp hướng dẫn",
      overdue: false
    }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open":
        return { bg: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24', label: 'Chờ xử lý', icon: Clock };
      case "in_progress":
        return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', label: 'Đang xử lý', icon: AlertTriangle };
      case "resolved":
        return { bg: 'rgba(52, 211, 153, 0.1)', color: '#34D399', label: 'Đã xử lý', icon: CheckCircle };
      case "rejected":
        return { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', label: 'Từ chối', icon: XCircle };
      default:
        return { bg: '#121414', color: '#d0c5af', label: status, icon: Clock };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return '#EF4444';
      case "medium": return '#FBBF24';
      case "low": return '#6366F1';
      default: return '#d0c5af';
    }
  };

  const filteredFeedback = feedbackList.filter(fb => {
    if (activeTab === "all") return true;
    if (activeTab === "open") return fb.status === "open";
    if (activeTab === "in_progress") return fb.status === "in_progress";
    if (activeTab === "resolved") return fb.status === "resolved";
    if (activeTab === "rejected") return fb.status === "rejected";
    return true;
  });

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
        <MessageSquare size={48} style={{ color: '#d0c5af' }} />
      </div>
      <h3 style={{ color: '#e2e2e2', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        Chưa có phản hồi nào
      </h3>
      <p className="member-page-subtitle">
        Các phản hồi bạn gửi sẽ hiển thị ở đây
      </p>
    </div>
  );

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Phản hồi của tôi"
          description="Theo dõi trạng thái từng phản hồi và lịch sử xử lý."
        />

        {/* Tabs */}
        <div
          className="p-2 rounded-[1.75rem] mb-6 flex gap-2 flex-wrap backdrop-blur-sm"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #4d4635',
          }}
        >
          {[
            { value: "open", label: "Chờ xử lý", count: feedbackList.filter(f => f.status === "open").length },
            { value: "in_progress", label: "Đang xử lý", count: feedbackList.filter(f => f.status === "in_progress").length },
            { value: "resolved", label: "Đã xử lý", count: feedbackList.filter(f => f.status === "resolved").length },
            { value: "rejected", label: "Từ chối", count: feedbackList.filter(f => f.status === "rejected").length }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className="px-4 py-2 rounded-xl transition-all flex items-center gap-2"
              style={{
                backgroundColor: activeTab === tab.value ? '#f2ca50' : 'transparent',
                color: activeTab === tab.value ? '#000000' : '#e2e2e2',
                fontWeight: activeTab === tab.value ? 600 : 400
              }}
            >
              <span>{tab.label}</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: activeTab === tab.value ? '#000000' : '#121414',
                  color: activeTab === tab.value ? '#f2ca50' : '#e2e2e2'
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Feedback List */}
        {filteredFeedback.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map((feedback) => {
              const statusStyle = getStatusStyle(feedback.status);
              const StatusIcon = statusStyle.icon;

              return (
                <div
                  key={feedback.id}
                  className="p-6 rounded-[1.75rem] transition-all hover:scale-[1.01] cursor-pointer backdrop-blur-sm"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #4d4635',
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#121414' }}
                      >
                        <MessageSquare size={24} style={{ color: '#f2ca50' }} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 style={{ color: '#e2e2e2', fontWeight: 600, fontSize: '1.125rem' }}>
                            {feedback.type === "staff" ? "Nhân viên" : feedback.type === "equipment" ? "Thiết bị" : "Dịch vụ"}
                          </h3>
                          {feedback.subject && (
                            <span
                              className="px-2 py-1 rounded-full"
                              style={{ backgroundColor: '#121414', color: '#f2ca50', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              {feedback.subject}
                            </span>
                          )}
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getSeverityColor(feedback.severity) }}
                          />
                        </div>

                        <p style={{ color: '#d0c5af', marginBottom: '0.75rem' }}>
                          {feedback.content}
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span style={{ color: '#d0c5af' }}>ID:</span>
                            <span style={{ color: '#e2e2e2', fontWeight: 600 }}>{feedback.id}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} style={{ color: '#d0c5af' }} />
                            <span style={{ color: '#d0c5af' }}>{feedback.created_at}</span>
                          </div>
                          {feedback.handled_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle size={14} style={{ color: '#34D399' }} />
                              <span style={{ color: '#d0c5af' }}>Xử lý: {feedback.handled_at}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="px-3 py-1 rounded-full flex items-center gap-2"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                      >
                        <StatusIcon size={16} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                          {statusStyle.label}
                        </span>
                      </div>
                      <ChevronRight size={20} style={{ color: '#d0c5af' }} />
                    </div>
                  </div>

                  {feedback.overdue && (
                    <div
                      className="p-3 rounded-xl flex items-center gap-2"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                    >
                      <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                      <span style={{ color: '#EF4444', fontSize: '0.875rem', fontWeight: 600 }}>
                        Quá hạn xử lý
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
