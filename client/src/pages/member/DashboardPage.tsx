import RoleDashboardPage from '@/components/common/RoleDashboardPage'

export default function MemberDashboardPage() {
  return (
    <RoleDashboardPage
      roleLabel="Member"
      title="Không gian hội viên mượt, rõ và tập trung vào tiến độ cá nhân."
      description="Tất cả thông tin về gói tập, lịch tập, tiến độ và phản hồi được đặt trên cùng một luồng để hội viên nắm trạng thái ngay lập tức."
      metrics={[
        { label: 'Gói đang dùng', value: 'Active', note: 'Theo dõi hạn dùng và quyền lợi đang mở.' },
        { label: 'Buổi hôm nay', value: '02', note: 'Lịch tập hiển thị theo ngày và tuần.' },
        { label: 'Tiến độ tháng', value: '87%', note: 'So sánh số buổi hoàn thành với mục tiêu.' },
        { label: 'Phản hồi chờ xử lý', value: '03', note: 'Nội dung hỗ trợ được gom vào một nơi.' },
      ]}
      sections={[
        {
          id: 'packages',
          eyebrow: 'Dịch vụ',
          title: 'Gói tập và quyền lợi',
          description: 'Nhìn nhanh lịch sử gói tập, ưu đãi đang hiệu lực và trạng thái thanh toán để không bị đứt quãng hành trình tập luyện.',
          cards: [
            { tag: 'Current', title: 'Gói Premium 12 tháng', description: 'Bao gồm 3 buổi PT mỗi tuần, lịch linh hoạt và ưu tiên đặt lớp.' },
            { tag: 'Renewal', title: 'Gia hạn tự động trước 7 ngày', description: 'Đảm bảo hội viên không bị gián đoạn quyền truy cập dịch vụ.' },
            { tag: 'Benefit', title: 'Ưu đãi dành cho người dùng trung thành', description: 'Ghi nhận các quyền lợi tích lũy theo thời gian sử dụng.' },
          ],
        },
        {
          id: 'schedule',
          eyebrow: 'Lịch tập',
          title: 'Lịch tập theo nhịp sinh hoạt',
          description: 'Khối lịch được ưu tiên hiển thị rõ ràng để hội viên biết buổi nào đã đặt, buổi nào đã hoàn thành và buổi nào còn trống.',
          cards: [
            { tag: 'Today', title: '18:00 - Upper body', description: 'Phiên tập sức mạnh với nhịp độ ổn định và thời lượng 60 phút.' },
            { tag: 'Tomorrow', title: '07:00 - Cardio core', description: 'Buổi tập buổi sáng để giữ nhịp vận động trước giờ làm việc.' },
            { tag: 'Weekend', title: '16:00 - Recovery session', description: 'Buổi phục hồi nhẹ giúp cân bằng tải tập trong tuần.' },
          ],
        },
        {
          id: 'progress',
          eyebrow: 'Theo dõi',
          title: 'Tiến độ và động lực',
          description: 'Dữ liệu tiến độ được trình bày bằng ngôn ngữ dễ đọc, giúp hội viên nhìn thấy thay đổi mà không cần tìm qua nhiều màn hình.',
          cards: [
            { tag: 'Consistency', title: '14 buổi liên tiếp', description: 'Chuỗi duy trì luyện tập cho thấy thói quen đang đi đúng hướng.' },
            { tag: 'Strength', title: '+12% tải tạ', description: 'Các chỉ số sức mạnh đang tăng ổn định qua từng tuần.' },
            { tag: 'Cardio', title: 'Giảm 8 nhịp nghỉ', description: 'Khả năng phục hồi tim mạch được cải thiện rõ rệt.' },
          ],
        },
        {
          id: 'feedback',
          eyebrow: 'Hỗ trợ',
          title: 'Phản hồi và trao đổi',
          description: 'Tất cả góp ý được gom lại ở cùng một khu vực để đội ngũ hỗ trợ phản hồi nhanh hơn và minh bạch hơn.',
          cards: [
            { tag: 'Pending', title: 'Hỏi về lịch PT cá nhân', description: 'Một câu hỏi đang chờ xác nhận khung giờ phù hợp trong tuần.' },
            { tag: 'Solved', title: 'Điều chỉnh chế độ tập', description: 'Ghi nhận thay đổi từ huấn luyện viên để cập nhật cường độ phù hợp.' },
            { tag: 'Note', title: 'Đánh giá chất lượng phòng tập', description: 'Phản hồi đã được tổng hợp cho bộ phận vận hành và cơ sở vật chất.' },
          ],
        },
      ]}
    />
  )
}