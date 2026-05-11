import RoleDashboardPage from '@/components/common/RoleDashboardPage'

export default function StaffDashboardPage() {
  return (
    <RoleDashboardPage
      roleLabel="Staff"
      title="Khung vận hành cho đội ngũ quản lý cần tốc độ và tính rõ ràng."
      description="Giao diện dành cho staff tập trung vào hội viên, phòng tập, thiết bị và luồng xử lý phản hồi để mọi tác vụ vận hành đi qua một cấu trúc duy nhất."
      metrics={[
        { label: 'Hội viên đang hoạt động', value: '1,240', note: 'Tổng hợp trạng thái thành viên theo thời gian thực.' },
        { label: 'Lịch xử lý hôm nay', value: '18', note: 'Các đầu việc được ưu tiên theo độ khẩn và mốc giờ.' },
        { label: 'Thiết bị cần kiểm tra', value: '06', note: 'Số mục đang chờ bảo trì hoặc xác minh lỗi.' },
        { label: 'Phản hồi mở', value: '11', note: 'Gom từ quầy lễ tân, hội viên và đội vận hành.' },
      ]}
      sections={[
        {
          id: 'members',
          eyebrow: 'Hội viên',
          title: 'Bộ hồ sơ hội viên',
          description: 'Nhân sự front desk cần nhìn thấy trạng thái đăng ký, thanh toán và lịch sử ra vào để hỗ trợ nhanh và đúng.',
          cards: [
            { tag: 'Profile', title: 'Thông tin hội viên đầy đủ', description: 'Một hồ sơ chứa thông tin liên hệ, trạng thái gói và ghi chú hỗ trợ.' },
            { tag: 'Check-in', title: 'Lượt vào phòng tập', description: 'Nhật ký check-in giúp đối soát hoạt động theo ngày.' },
            { tag: 'Membership', title: 'Gia hạn và nhắc phí', description: 'Theo dõi thời hạn gói trước khi phát sinh gián đoạn dịch vụ.' },
          ],
        },
        {
          id: 'rooms',
          eyebrow: 'Phòng tập',
          title: 'Phân bổ không gian',
          description: 'Khu vực này giúp staff biết phòng nào đang mở, đang đầy hoặc cần dọn dẹp trước ca tiếp theo.',
          cards: [
            { tag: 'Room A', title: 'Full body zone', description: 'Phòng đa năng cho lớp nhóm và huấn luyện cá nhân.' },
            { tag: 'Room B', title: 'Cardio area', description: 'Theo dõi tải sử dụng để điều phối luồng hội viên.' },
            { tag: 'Room C', title: 'Recovery corner', description: 'Khu hồi phục nhẹ và các thiết bị hỗ trợ giãn cơ.' },
          ],
        },
        {
          id: 'equipment',
          eyebrow: 'Thiết bị',
          title: 'Quản lý thiết bị và bảo trì',
          description: 'Thiết bị được gom theo trạng thái để nhanh chóng xác định món nào cần khóa, sửa hoặc kiểm tra lại.',
          cards: [
            { tag: 'Maintenance', title: 'Máy chạy bộ số 03', description: 'Đang chờ xác nhận từ bộ phận kỹ thuật sau khi phát hiện âm thanh bất thường.' },
            { tag: 'Active', title: 'Khu tạ tự do', description: 'Đã sẵn sàng vận hành với kiểm tra an toàn đầu ca.' },
            { tag: 'Repairing', title: 'Máy kéo cáp', description: 'Đã tạm dừng sử dụng và ghi nhận lịch sửa chữa.' },
          ],
        },
        {
          id: 'feedback',
          eyebrow: 'Hỗ trợ',
          title: 'Xử lý phản hồi theo luồng',
          description: 'Phản hồi được phân loại để staff biết vấn đề nào thuộc dịch vụ, vấn đề nào thuộc thiết bị hay quy trình.',
          cards: [
            { tag: 'Queue', title: 'Phản hồi chờ phân công', description: 'Các yêu cầu mới được đưa vào hàng đợi xử lý trong ca.' },
            { tag: 'Service', title: 'Góp ý về trải nghiệm', description: 'Kết quả được chuyển đến đội vận hành để cải thiện chất lượng.' },
            { tag: 'Resolved', title: 'Đã đóng sau phản hồi', description: 'Lưu lại biên bản và note xử lý để tra cứu sau này.' },
          ],
        },
      ]}
    />
  )
}