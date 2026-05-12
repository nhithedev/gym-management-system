import RoleDashboardPage from '@/components/common/RoleDashboardPage'

export default function TrainerDashboardPage() {
  return (
    <RoleDashboardPage
      roleLabel="Trainer"
      title="Màn hình huấn luyện dành cho tiến độ, lịch dạy và chất lượng coaching."
      description="Huấn luyện viên cần theo dõi học viên, giáo án và phản hồi nhanh để giữ tốc độ huấn luyện ổn định trong từng phiên tập."
      metrics={[
        { label: 'Học viên đang theo', value: '24', note: 'Danh sách học viên được phân công trong tuần.' },
        { label: 'Buổi dạy hôm nay', value: '05', note: 'Tổng số phiên training đã được xác nhận.' },
        { label: 'Giáo án active', value: '08', note: 'Các kế hoạch tập luyện đang áp dụng cho từng mục tiêu.' },
        { label: 'Đánh giá tốt', value: '96%', note: 'Tỷ lệ phản hồi tích cực sau các buổi huấn luyện.' },
      ]}
      sections={[
        {
          id: 'members',
          eyebrow: 'Học viên',
          title: 'Danh sách học viên đang kèm',
          description: 'Trạng thái từng học viên được đặt cùng một chỗ để trainer dễ quan sát mục tiêu, mức độ tiến triển và rào cản hiện tại.',
          cards: [
            { tag: 'Priority', title: 'Học viên mục tiêu giảm mỡ', description: 'Đang ở giai đoạn siết cường độ và theo dõi chỉ số cơ bản.' },
            { tag: 'Strength', title: 'Học viên tăng sức mạnh', description: 'Đang ưu tiên progressive overload và kiểm tra form bài tập.' },
            { tag: 'Recovery', title: 'Học viên phục hồi chấn thương', description: 'Lịch tập được điều chỉnh để giảm tải và phục hồi an toàn.' },
          ],
        },
        {
          id: 'schedule',
          eyebrow: 'Lịch dạy',
          title: 'Lịch coaching và phân ca',
          description: 'Trainer cần luồng lịch gọn để không đè lịch cá nhân, buổi nhóm và buổi one-on-one lên nhau.',
          cards: [
            { tag: 'Morning', title: '07:30 - Personal training', description: 'Buổi 1 kèm 1 đầu ngày dành cho mục tiêu sức mạnh.' },
            { tag: 'Noon', title: '12:00 - Technique review', description: 'Kiểm tra form động tác và chỉnh kỹ thuật cơ bản.' },
            { tag: 'Evening', title: '18:30 - Group session', description: 'Lớp nhóm tập trung vào sức bền và nhịp thở.' },
          ],
        },
        {
          id: 'programs',
          eyebrow: 'Bài tập',
          title: 'Giáo án và bài tập mẫu',
          description: 'Các chương trình huấn luyện được gom theo mục tiêu để thao tác nhanh khi cần thay đổi gói tập cho học viên.',
          cards: [
            { tag: 'Program', title: 'Upper body hypertrophy', description: 'Khối bài tập ưu tiên tăng cơ phần thân trên với mức tải tiến dần.' },
            { tag: 'Program', title: 'Fat loss circuit', description: 'Mạch bài tập đốt năng lượng phù hợp cho giai đoạn siết.' },
            { tag: 'Program', title: 'Mobility reset', description: 'Chuỗi động tác cải thiện độ linh hoạt và phòng tránh chấn thương.' },
          ],
        },
        {
          id: 'review',
          eyebrow: 'Đánh giá',
          title: 'Kết quả và phản hồi',
          description: 'Feedback cuối buổi được đưa vào một khu riêng để trainer nắm được buổi nào hiệu quả, buổi nào cần điều chỉnh.',
          cards: [
            { tag: 'Trend', title: 'Cải thiện form squat', description: 'Ghi nhận ổn định về biên độ và kiểm soát đầu gối.' },
            { tag: 'Trend', title: 'Cường độ cardio tăng', description: 'Nhịp tim phục hồi tốt hơn sau interval training.' },
            { tag: 'Note', title: 'Cần thêm mobility', description: 'Một số học viên cần thêm khối phục hồi trước bài nặng.' },
          ],
        },
      ]}
    />
  )
}