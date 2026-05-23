import RoleDashboardPage from '@/components/common/RoleDashboardPage'

export default function StaffDashboardPage() {
  return (
    <RoleDashboardPage
      roleLabel="Staff"
      title="Bảng điều hành cho nhân viên quản lý hội viên, phòng tập và thiết bị."
      description="Giao diện staff tập trung vào những trạng thái cần xử lý nhanh: hội viên mới, giao dịch hôm nay, thiết bị lỗi và phản hồi đang chờ."
      metrics={[
        { label: 'Hội viên mới', value: '24', note: 'Số thành viên đăng ký mới trong ngày.' },
        { label: 'Giao dịch hôm nay', value: '18', note: 'Tổng số thanh toán và gia hạn xử lý trong ngày.' },
        { label: 'Thiết bị lỗi', value: '06', note: 'Số thiết bị đang chờ bảo trì hoặc xác minh.' },
        { label: 'Feedback pending', value: '11', note: 'Các phản hồi chưa được xử lý hoặc phân công.' },
      ]}
      sections={[
        {
          id: 'members',
          eyebrow: 'Hội viên',
          title: 'Quản lý hội viên chủ động',
          description: 'Nhanh chóng tìm, gia hạn gói và xem lịch sử thanh toán của từng hội viên tại quầy.',
          cards: [
            { tag: 'Đăng ký', title: 'Hội viên mới', description: 'Bắt đầu quy trình đăng ký nhanh cho khách hàng đến quầy.' },
            { tag: 'Tìm kiếm', title: 'Tra cứu hội viên', description: 'Tìm theo tên, số điện thoại hoặc trạng thái gói.' },
            { tag: 'Thanh toán', title: 'Gia hạn gói', description: 'Xử lý gia hạn và cập nhật lịch sử thanh toán tức thì.' },
          ],
        },
        {
          id: 'rooms',
          eyebrow: 'Phòng tập',
          title: 'Quản lý phòng tập',
          description: 'Nắm được tình trạng mở phòng, sức chứa và yêu cầu vệ sinh trước ca mới.',
          cards: [
            { tag: 'Thêm', title: 'Thêm phòng mới', description: 'Tạo phòng mới với mã, tên và sức chứa.' },
            { tag: 'Chỉnh sửa', title: 'Sửa phòng tập', description: 'Cập nhật thông tin phòng khi có thay đổi chức năng.' },
            { tag: 'Xóa', title: 'Xóa phòng', description: 'Loại bỏ phòng không còn sử dụng trong cấu trúc hoạt động.' },
          ],
        },
        {
          id: 'equipment',
          eyebrow: 'Thiết bị',
          title: 'Quản lý thiết bị',
          description: 'Theo dõi trạng thái thiết bị, lịch sử bảo trì và báo hỏng để đảm bảo an toàn vận hành.',
          cards: [
            { tag: 'Thêm', title: 'Thêm thiết bị', description: 'Nhập thiết bị vào hệ thống với mã và loại.' },
            { tag: 'Bảo trì', title: 'Bảo trì thiết bị', description: 'Lập lịch sửa chữa hoặc kiểm tra định kỳ.' },
            { tag: 'Tình trạng', title: 'Trạng thái thiết bị', description: 'Theo dõi hoạt động, hỏng hoặc đang sửa.' },
          ],
        },

        {
          id: 'feedback',
          eyebrow: 'Phản hồi',
          title: 'Theo dõi phản hồi',
          description: 'Xem danh sách feedback chờ xử lý và phân loại theo trạng thái để nhanh chóng phản hồi.',
          cards: [
            { tag: 'Mới', title: 'Feedback mới', description: 'Những phản hồi vừa được gửi từ hội viên hoặc lễ tân.' },
            { tag: 'Đang xử lý', title: 'Feedback đang xử lý', description: 'Yêu cầu đang được nhân viên vận hành xử lý.' },
            { tag: 'Đã xử lý', title: 'Feedback hoàn tất', description: 'Lưu lại kết quả xử lý để tra cứu sau này.' },
          ],
        },
      ]}
    />
  )
}