import { useState } from "react";
import MemberLayout from "@/layouts/MemberLayout";
import SectionHeader from "@/components/common/SectionHeader";
import { useNavigate } from "react-router";
import { MessageSquare, AlertCircle } from "lucide-react";

export default function SendFeedback() {
  const navigate = useNavigate();
  const [feedbackType, setFeedbackType] = useState<string>("service");
  const [severity, setSeverity] = useState<string>("medium");
  const [subject, setSubject] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const staffList = ["PT. Nguyễn Văn A", "PT. Trần Thị B", "Staff Lê Văn C"];
  const equipmentList = ["Treadmill #1", "Bike #2", "Bench Press", "Squat Rack"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!content) newErrors.content = "Nội dung không được để trống";
    if (feedbackType === "staff" && !subject) newErrors.subject = "Vui lòng chọn nhân viên";
    if (feedbackType === "equipment" && !subject) newErrors.subject = "Vui lòng chọn thiết bị";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      navigate("/member/my-feedback");
    }, 1500);
  };

  return (
    <MemberLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <SectionHeader
          title="Gửi phản hồi"
          description="Gửi góp ý, báo lỗi hoặc đề xuất để đội ngũ xử lý nhanh hơn."
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <form onSubmit={handleSubmit}>
            <div
              className="p-6 rounded-[1.75rem] mb-6 backdrop-blur-sm"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #4d4635',
              }}
            >
              <h3 className="member-card-title mb-6">
                Thông tin phản hồi
              </h3>

              <div className="space-y-6">
                {/* Feedback Type */}
                <div>
                  <label className="block mb-3" style={{ color: '#e2e2e2', fontWeight: 600 }}>
                    Loại phản hồi *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "staff", label: "Nhân viên" },
                      { value: "equipment", label: "Thiết bị" },
                      { value: "service", label: "Dịch vụ" }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setFeedbackType(type.value);
                          setSubject("");
                        }}
                        className="p-3 rounded-xl transition-all"
                        style={{
                          backgroundColor: feedbackType === type.value ? '#f2ca50' : '#121414',
                          color: feedbackType === type.value ? '#000000' : '#e2e2e2',
                          border: `2px solid ${feedbackType === type.value ? '#f2ca50' : '#4d4635'}`,
                          fontWeight: feedbackType === type.value ? 600 : 400
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Subject Picker */}
                {(feedbackType === "staff" || feedbackType === "equipment") && (
                  <div>
                    <label className="block mb-2" style={{ color: '#e2e2e2', fontWeight: 600 }}>
                      {feedbackType === "staff" ? "Chọn nhân viên *" : "Chọn thiết bị *"}
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-[1.75rem] outline-none"
                      style={{
                        backgroundColor: '#121414',
                        color: '#e2e2e2',
                        border: errors.subject ? '1px solid #EF4444' : '1px solid #4d4635'
                      }}
                    >
                      <option value="">-- Chọn {feedbackType === "staff" ? "nhân viên" : "thiết bị"} --</option>
                      {(feedbackType === "staff" ? staffList : equipmentList).map((item, idx) => (
                        <option key={idx} value={item}>{item}</option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="mt-1 text-sm" style={{ color: '#EF4444' }}>
                        {errors.subject}
                      </p>
                    )}
                  </div>
                )}

                {/* Severity */}
                <div>
                  <label className="block mb-3" style={{ color: '#e2e2e2', fontWeight: 600 }}>
                    Mức độ ưu tiên
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "low", label: "Thấp", color: '#6366F1' },
                      { value: "medium", label: "Trung bình", color: '#FBBF24' },
                      { value: "high", label: "Cao", color: '#EF4444' }
                    ].map((sev) => (
                      <button
                        key={sev.value}
                        type="button"
                        onClick={() => setSeverity(sev.value)}
                        className="p-3 rounded-xl transition-all"
                        style={{
                          backgroundColor: severity === sev.value ? sev.color : '#121414',
                          color: severity === sev.value ? '#000000' : '#e2e2e2',
                          border: `2px solid ${severity === sev.value ? sev.color : '#4d4635'}`,
                          fontWeight: severity === sev.value ? 600 : 400
                        }}
                      >
                        {sev.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block mb-2" style={{ color: '#e2e2e2', fontWeight: 600 }}>
                    Nội dung phản hồi *
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    placeholder="Mô tả chi tiết vấn đề hoặc ý kiến của bạn..."
                    className="w-full px-4 py-3 rounded-[1.75rem] outline-none resize-none"
                    style={{
                      backgroundColor: '#121414',
                      color: '#e2e2e2',
                      border: errors.content ? '1px solid #EF4444' : '1px solid #4d4635'
                    }}
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm" style={{ color: '#EF4444' }}>
                      {errors.content}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Info Note */}
          </form>

          <div className="space-y-6">
            <div
              className="p-4 rounded-[1.75rem] flex items-start gap-3"
              style={{
                backgroundColor: 'rgba(242, 202, 80, 0.1)',
                border: '1px solid #f2ca50'
              }}
            >
              <AlertCircle size={20} style={{ color: '#f2ca50', flexShrink: 0, marginTop: '0.125rem' }} />
              <div>
                <p style={{ color: '#f2ca50', fontSize: '0.875rem' }}>
                  Phản hồi của bạn sẽ được xem xét và xử lý trong vòng 24-48 giờ.
                  Bạn có thể theo dõi trạng thái xử lý tại mục &quot;Phản hồi của tôi&quot;.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/member')}
                className="flex-1 py-3 rounded-full transition-all"
                style={{
                  backgroundColor: 'transparent',
                  color: '#d0c5af',
                  border: '1px solid #4d4635'
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#f2ca50',
                  color: '#000000',
                  fontWeight: 600
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare size={20} />
                    <span>Gửi phản hồi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}
