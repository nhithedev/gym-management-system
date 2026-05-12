import RoleDashboardPage from '@/components/common/RoleDashboardPage'

export default function OwnerDashboardPage() {
  return (
    <RoleDashboardPage
      roleLabel="Owner"
      title="Bảng điều hành cho chủ phòng tập với ưu tiên vào doanh thu, nhân sự và kiểm soát."
      description="Màn hình owner gom những tín hiệu quan trọng nhất về nhân sự, phân quyền, doanh số và báo cáo để ra quyết định nhanh trên một giao diện thống nhất."
      metrics={[
        { label: 'Doanh thu tháng', value: '1.8B', note: 'Tổng hợp từ gói tập, PT và dịch vụ đi kèm.' },
        { label: 'Nhân sự active', value: '32', note: 'Tình trạng nhân sự đang làm việc theo ca.' },
        { label: 'Báo cáo mở', value: '07', note: 'Những đầu việc đang chờ duyệt hoặc xem lại.' },
        { label: 'Tỷ lệ giữ chân', value: '92%', note: 'Theo dõi sức khỏe kinh doanh dài hạn của hệ thống.' },
      ]}
      sections={[
        {
          id: 'staff',
          eyebrow: 'Nhân sự',
          title: 'Đội ngũ và ca làm',
          description: 'Chủ phòng tập cần biết ai đang làm việc, ai đang nghỉ và ai cần điều phối lại để giữ vận hành trơn tru.',
          cards: [
            { tag: 'HR', title: 'Kế hoạch nhân sự tuần', description: 'Phân bổ ca để không thiếu người ở giờ cao điểm.' },
            { tag: 'Ops', title: 'Nhân viên front desk', description: 'Theo dõi tình trạng hỗ trợ hội viên tại quầy.' },
            { tag: 'Coaching', title: 'Huấn luyện viên trực ca', description: 'Ghi nhận số buổi và mức độ lấp đầy theo lịch.' },
          ],
        },
        {
          id: 'permissions',
          eyebrow: 'Phân quyền',
          title: 'Kiểm soát truy cập',
          description: 'Các vai trò được mô tả rõ để owner điều chỉnh quyền truy cập của staff, trainer và các nhóm liên quan.',
          cards: [
            { tag: 'Access', title: 'Quyền xem báo cáo', description: 'Chỉ cấp cho nhóm có trách nhiệm tổng hợp và duyệt số liệu.' },
            { tag: 'Access', title: 'Quyền thao tác hội viên', description: 'Giới hạn đúng phạm vi tác nghiệp theo vị trí công việc.' },
            { tag: 'Audit', title: 'Lịch sử thay đổi quyền', description: 'Ghi lại ai chỉnh gì và vào thời điểm nào để kiểm toán.' },
          ],
        },
        {
          id: 'finance',
          eyebrow: 'Doanh thu',
          title: 'Sức khỏe tài chính',
          description: 'Khối doanh thu cho thấy dòng tiền đang đến từ đâu, dòng nào đang giảm và đâu là điểm cần ưu tiên tối ưu.',
          cards: [
            { tag: 'Revenue', title: 'Gói tập định kỳ', description: 'Nguồn thu lõi từ hội viên đang hoạt động.' },
            { tag: 'Revenue', title: 'Dịch vụ PT', description: 'Dòng tiền bổ sung từ huấn luyện cá nhân và nhóm nhỏ.' },
            { tag: 'Revenue', title: 'Dịch vụ phụ trợ', description: 'Các khoản bổ sung như đồ uống, phụ kiện hoặc dịch vụ khác.' },
          ],
        },
        {
          id: 'reports',
          eyebrow: 'Báo cáo',
          title: 'Báo cáo quản trị',
          description: 'Báo cáo được đặt ở cuối cùng nhưng luôn đủ nổi bật để owner đọc nhanh xu hướng thay vì dò qua bảng số thô.',
          cards: [
            { tag: 'Insight', title: 'Tăng trưởng theo tháng', description: 'So sánh doanh thu, hội viên mới và tỷ lệ duy trì.' },
            { tag: 'Insight', title: 'Hiệu suất chi nhánh', description: 'Đối chiếu kết quả giữa các khu vực hoặc ca làm.' },
            { tag: 'Insight', title: 'Cảnh báo vận hành', description: 'Những điểm đỏ cần phản hồi ngay trước khi ảnh hưởng trải nghiệm.' },
          ],
        },
      ]}
    />
  )
}