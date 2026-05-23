# TÀI LIỆU PHÂN RÃ ROLE VÀ MÀN HÌNH HỆ THỐNG QUẢN LÝ GYM

## 1. Mục đích tài liệu

Tài liệu này dùng để:

- Phân chia module cho frontend/backend
- Làm cơ sở thiết kế UI/UX
- Hỗ trợ thiết kế database
- Hỗ trợ viết API
- Hỗ trợ phân quyền RBAC
- Hỗ trợ quản lý task cho team

Tài liệu tập trung vào:

- Role trong hệ thống
- Các module/màn hình chính
- Chức năng của từng module
- Quyền thao tác của từng role

## 2. Tổng quan Role hệ thống

| Role | Mô tả |
| --- | --- |
| Hội viên | Người sử dụng dịch vụ gym |
| Huấn luyện viên (PT) | Theo dõi và hướng dẫn hội viên |
| Nhân viên quản lý | Quản lý hội viên, thiết bị, phản hồi |
| Chủ phòng tập (Admin) | Quản trị toàn bộ hệ thống |

## 3. Màn hình dùng chung

Các màn hình dưới đây được sử dụng cho mọi role.

### 3.1 Đăng nhập

**Chức năng**

- Đăng nhập hệ thống
- Xác thực tài khoản
- Điều hướng theo role

**Thành phần chính**

- Email
- Password
- Remember me
- Quên mật khẩu

**Quyền truy cập**

- Tất cả role

### 3.2 Quên mật khẩu

**Chức năng**

- Gửi OTP
- Xác minh OTP
- Đổi mật khẩu mới

**Thành phần chính**

- Input email/SĐT
- OTP
- Password mới

**Quyền truy cập**

- Tất cả role

### 3.3 Hồ sơ cá nhân

**Chức năng**

- Xem thông tin cá nhân
- Cập nhật thông tin
- Đổi mật khẩu
- Đổi avatar

**Dữ liệu hiển thị**

- Họ tên
- Email
- SĐT
- Vai trò

**Quyền truy cập**

- Tất cả role

## 4. ROLE: HỘI VIÊN

### 4.1 Quyền hạn

**Hội viên có thể**

- Xem gói tập
- Gia hạn gói tập
- Xem lịch tập
- Theo dõi tiến độ
- Gửi phản hồi
- Xem lịch sử tập luyện

**Hội viên không thể**

- Quản lý hệ thống
- Quản lý thiết bị
- Quản lý nhân sự
- Xem báo cáo doanh thu

### 4.2 Dashboard hội viên

**Mục đích**

Trang tổng quan cho hội viên.

**Chức năng**

- Xem gói tập hiện tại
- Xem số buổi còn lại
- Xem lịch tập hôm nay
- Xem tiến độ tập luyện
- Xem thông báo

**Thành phần chính**

**Card gói tập**

- Tên gói
- Ngày hết hạn
- Số buổi còn lại

**Card lịch tập**

- Buổi tập hôm nay
- PT phụ trách
- Giờ tập

**Card tiến độ**

- Cân nặng hiện tại
- Mục tiêu
- % hoàn thành

**Notification**

- Nhắc lịch tập
- Nhắc gia hạn
- Phản hồi từ hệ thống

### 4.3 Module Quản lý gói tập

**Chức năng**

- Xem gói tập hiện tại
- Gia hạn gói tập
- Xem lịch sử thanh toán
- Xem quyền lợi gói tập

**Thành phần chính**

**Thông tin gói tập**

- Tên gói
- Giá
- Thời hạn
- Số buổi còn lại

**Danh sách gói tập**

- Gói cơ bản
- Gói nâng cao
- Gói PT

**Thanh toán**

- QR Banking
- Ví điện tử
- Tiền mặt (nếu tại quầy)

**Popup/Flow liên quan**

- Popup xác nhận thanh toán
- Popup hóa đơn
- Popup gia hạn thành công

### 4.4 Module Quản lý lịch tập

**Chức năng**

- Xem lịch tập
- Xem trạng thái check-in
- Xem lịch sử tập luyện

**Thành phần chính**

**Calendar**

- Theo ngày
- Theo tuần

**Attendance History**

- Thời gian check-in
- Thời gian check-out
- PT phụ trách

**Trạng thái buổi tập**

- Đã hoàn thành
- Sắp diễn ra
- Đã hủy
- Hết hạn gói

### 4.5 Module Theo dõi tiến độ

**Chức năng**

- Xem tiến độ tập luyện
- Xem biểu đồ sức khỏe
- Xem nhận xét PT

**Dữ liệu hiển thị**

- Cân nặng
- BMI
- Body fat
- Mục tiêu
- Đánh giá PT

**Thành phần chính**

**Progress Chart**

- Biểu đồ cân nặng
- Biểu đồ mục tiêu

**PT Evaluation**

- Nhận xét
- Đề xuất luyện tập

### 4.6 Module Feedback

**Chức năng**

- Gửi phản hồi
- Theo dõi trạng thái phản hồi

**Loại phản hồi**

- Thiết bị
- Nhân viên
- Dịch vụ

**Thành phần chính**

- Dropdown loại feedback
- Nội dung phản hồi
- Upload hình ảnh
- Trạng thái xử lý

## 5. ROLE: HUẤN LUYỆN VIÊN (PT)

### 5.1 Quyền hạn

**PT có thể**

- Xem học viên
- Theo dõi tiến độ học viên
- Đánh giá học viên
- Quản lý giáo án
- Xem lịch làm việc

**PT không thể**

- Quản lý nhân sự
- Quản lý tài chính
- Quản trị hệ thống

### 5.2 Dashboard PT

**Chức năng**

- Xem lịch dạy hôm nay
- Xem số học viên
- Xem lịch hẹn gần nhất
- Xem KPI cá nhân

**Thành phần chính**

**Lịch hôm nay**

- Ca làm việc
- Hội viên
- Phòng tập

**KPI**

- Số session
- Số học viên
- Đánh giá trung bình

### 5.3 Module Quản lý hội viên

**Chức năng**

- Xem danh sách học viên
- Tìm kiếm học viên
- Xem chi tiết học viên

**Thành phần chính**

**Member List**

- Mã hội viên
- Họ tên
- Gói tập
- Trạng thái

**Member Detail**

- Hồ sơ
- Tiến độ
- Lịch sử tập
- Giáo án

**Bộ lọc**

- Theo gói tập
- Theo trạng thái
- Theo PT

### 5.4 Module Theo dõi tiến độ học viên

**Chức năng**

- Nhập chỉ số cơ thể
- Cập nhật tiến độ
- Đánh giá học viên
- Xem biểu đồ tiến độ

**Dữ liệu nhập**

- Cân nặng
- BMI
- Body fat
- Nhận xét

**Thành phần chính**

**Progress Update**

- Form cập nhật chỉ số

**Progress Chart**

- Biểu đồ tiến độ
- So sánh theo thời gian

### 5.5 Module Quản lý giáo án

**Chức năng**

- Tạo giáo án
- Chỉnh sửa giáo án
- Gán giáo án cho hội viên

**Dữ liệu giáo án**

- Tên giáo án
- Danh sách bài tập
- Mục tiêu
- Thời lượng

### 5.6 Module Lịch làm việc PT

**Chức năng**

- Xem lịch làm việc
- Xem lịch hẹn hội viên
- Theo dõi session

**Thành phần chính**

- Calendar
- Session list
- Ca làm việc

## 6. ROLE: NHÂN VIÊN QUẢN LÝ

### 6.1 Quyền hạn

**Nhân viên có thể**

- Đăng ký hội viên
- Gia hạn gói tập
- Quản lý thiết bị
- Quản lý phòng tập
- Xử lý phản hồi

**Nhân viên không thể**

- Phân quyền hệ thống
- Quản lý role
- Xem toàn bộ báo cáo tài chính

### 6.2 Dashboard nhân viên

**Chức năng**

- Xem hội viên mới
- Xem giao dịch hôm nay
- Xem feedback chờ xử lý
- Xem thiết bị lỗi

**Thành phần chính**

**Thống kê nhanh**

- Hội viên mới
- Giao dịch hôm nay
- Thiết bị lỗi

**Feedback Pending**

- Danh sách phản hồi chờ xử lý

### 6.3 Module Quản lý hội viên

**Chức năng**

- Đăng ký hội viên mới
- Tra cứu hội viên
- Gia hạn gói tập
- Xem lịch sử thanh toán

**Thành phần chính**

**Register Form**

- Thông tin cá nhân
- Chọn gói tập
- Thanh toán
- Đăng ký vân tay

**Member Search**

- Tìm kiếm theo tên
- Theo SĐT
- Theo trạng thái gói

**Payment**

- QR
- Tiền mặt
- Ví điện tử

**Popup/Flow liên quan**

- Popup xác nhận thanh toán
- Popup in hóa đơn
- Popup gia hạn thành công

### 6.4 Module Quản lý phản hồi

**Chức năng**

- Xem feedback
- Phân loại feedback
- Chuyển xử lý
- Cập nhật trạng thái

**Thành phần chính**

**Feedback List**

- Người gửi
- Loại phản hồi
- Trạng thái

**Feedback Detail**

- Nội dung
- Hình ảnh
- Lịch sử xử lý

**Trạng thái**

- Đã tiếp nhận
- Đang xử lý
- Đã xử lý

### 6.5 Module Quản lý phòng tập

**Chức năng**

- Thêm phòng tập
- Sửa phòng tập
- Xóa phòng tập

**Dữ liệu hiển thị**

- Mã phòng
- Tên phòng
- Sức chứa
- Mô tả

### 6.6 Module Quản lý thiết bị

**Chức năng**

- Thêm thiết bị
- Chỉnh sửa thiết bị
- Theo dõi trạng thái thiết bị
- Bảo trì thiết bị

**Thành phần chính**

**Equipment List**

- Mã thiết bị
- Tên thiết bị
- Trạng thái
- Ngày nhập

**Equipment Detail**

- Lịch sử sửa chữa
- Thông tin bảo hành
- Phòng sử dụng

**Maintenance**

- Báo hỏng
- Chuyển sửa chữa
- Hoàn tất sửa chữa

**Trạng thái thiết bị**

- Hoạt động
- Hỏng
- Đang sửa
- Ngừng hoạt động

## 7. ROLE: CHỦ PHÒNG TẬP (ADMIN)

### 7.1 Quyền hạn

**Admin có thể**

- Quản trị toàn hệ thống
- Quản lý nhân sự
- Phân quyền
- Quản lý gói tập
- Xem báo cáo thống kê

Admin là role cao nhất hệ thống

### 7.2 Dashboard Admin

**Chức năng**

- Xem doanh thu
- Xem số lượng hội viên
- Xem hiệu suất PT
- Xem trạng thái hệ thống

**Thành phần chính**

**Revenue Overview**

- Tổng doanh thu
- Doanh thu tháng
- Tỷ lệ gia hạn

**Member Statistics**

- Hội viên mới
- Hội viên active
- Hội viên inactive

**PT Statistics**

- Hiệu suất PT
- Số session
- Đánh giá PT

### 7.3 Module Quản lý nhân sự

**Chức năng**

- Thêm nhân viên
- Chỉnh sửa nhân viên
- Khóa tài khoản
- Gán role

**Thành phần chính**

**Staff List**

- Họ tên
- Vai trò
- Trạng thái

**Staff Detail**

- Hồ sơ
- KPI
- Lịch làm việc
- Đánh giá

### 7.4 Module Phân quyền hệ thống

**Chức năng**

- Tạo nhóm quyền
- Chỉnh sửa nhóm quyền
- Gán quyền chức năng
- Gán user vào role

**Thành phần chính**

**Role List**

- Admin
- PT
- Sales
- Receptionist

**Permission Matrix**

- Xem báo cáo
- Quản lý thiết bị
- Quản lý hội viên
- Quản lý nhân sự

**User Assignment**

- Thêm user vào nhóm
- Xóa user khỏi nhóm

### 7.5 Module Quản lý gói tập

**Chức năng**

- Tạo gói tập
- Chỉnh sửa gói tập
- Vô hiệu hóa gói tập

**Dữ liệu gói tập**

- Tên gói
- Giá
- Số buổi
- Thời hạn
- Quyền lợi

**Validation**

- Giá âm
- Trùng tên gói
- Dữ liệu thiếu

### 7.6 Module Báo cáo thống kê

**Chức năng**

- Xem báo cáo doanh thu
- Xem báo cáo hội viên
- Xem báo cáo PT
- Xem báo cáo thiết bị
- Xuất PDF/Excel

**Bộ lọc**

- Theo ngày
- Theo tháng
- Theo quý
- Theo năm

**Thành phần chính**

**Revenue Report**

- Doanh thu theo thời gian
- Doanh thu theo gói tập

**Member Report**

- Hội viên mới
- Hội viên gia hạn
- Hội viên inactive

**PT Report**

- Hiệu suất PT
- Session PT
- Đánh giá PT

**Equipment Report**

- Thiết bị hỏng
- Chi phí bảo trì

## 8. Ma trận Role và Module

| Module | Hội viên | PT | Nhân viên | Admin |
| --- | --- | --- | --- | --- |
| Dashboard | X | X | X | X |
| Hồ sơ cá nhân | X | X | X | X |
| Quản lý gói tập | X | | X | X |
| Quản lý lịch tập | X | X | | |
| Theo dõi tiến độ | X | X | | |
| Feedback | X | | X | X |
| Quản lý hội viên | | X | X | X |
| Quản lý giáo án | | X | | |
| Quản lý thiết bị | | | X | X |
| Quản lý phòng tập | | | X | X |
| Quản lý nhân sự | | | | X |
| Phân quyền hệ thống | | | | X |
| Báo cáo thống kê | | | | X |

## 9. Đặc tả tương tác Frontend (Frontend Interaction Specification)

Phần này hỗ trợ team frontend triển khai giao diện trước khi backend hoàn thiện.

Bao gồm:

- UI Flow
- UI State
- Validation
- Component Behavior
- Permission UI

### 9.1 Quy chuẩn UI chung

**Loading State**

Khi đang tải dữ liệu:

- Hiển thị skeleton loading hoặc spinner
- Disable các button submit
- Không cho thao tác nhiều lần

**Empty State**

Khi không có dữ liệu:

- Hiển thị thông báo phù hợp
- Có button điều hướng nếu cần

Ví dụ:

- "Không có lịch tập"
- "Chưa có phản hồi nào"

**Error State**

Khi lỗi hệ thống hoặc lỗi mạng:

- Hiển thị toast/message lỗi
- Có nút retry nếu cần

Ví dụ:

- "Không thể tải dữ liệu"
- "Kết nối thất bại"

**Success State**

Khi thao tác thành công:

- Hiển thị toast success
- Refresh dữ liệu liên quan
- Đóng modal nếu cần

### 9.2 Chuẩn Modal/Popup

**Quy tắc chung**

- Modal có overlay nền tối
- ESC hoặc click outside có thể đóng
- Disable nút submit khi loading
- Có nút Cancel và Confirm

**Các modal phổ biến**

- Modal thanh toán
- Modal xác nhận xóa
- Modal chi tiết thiết bị
- Modal feedback detail
- Modal thêm/sửa dữ liệu

### 9.3 Chuẩn Form Validation

**Validation phía frontend**

**Email**

- Đúng định dạng email

**SĐT**

- Chỉ chứa số
- 10 chữ số

**Password**

- Tối thiểu 8 ký tự

**Required Field**

- Các field bắt buộc không được để trống

**Hiển thị lỗi**

- Error message hiển thị dưới input
- Border input chuyển màu đỏ

### 9.4 Chuẩn Notification

**Toast Message**

**Success**

- Màu xanh
- Tự đóng sau vài giây

**Error**

- Màu đỏ
- Hiển thị rõ nguyên nhân

**Warning**

- Màu vàng

### 9.5 Quy chuẩn Permission UI

Frontend phải kiểm tra role để:

- Ẩn button
- Disable action
- Chặn truy cập route

**Ví dụ**

| Chức năng | Member | PT | Staff | Admin |
| --- | --- | --- | --- | --- |
| Quản lý nhân sự | x | x | x | v |
| Quản lý thiết bị | x | x | v | v |
| Báo cáo thống kê | x | x | x | v |

### 9.6 Frontend Interaction theo Module

#### 9.6.1 Module Quản lý gói tập

**Flow Gia hạn gói**

1. User bấm "Gia hạn"
2. Mở modal chọn gói
3. User chọn payment method
4. Bấm thanh toán
5. Hiển thị loading
6. Thành công:
   - Đóng modal
   - Refresh package info
   - Hiện toast success
7. Thất bại:
   - Hiện toast error

**UI State**

**Loading**

- Disable button thanh toán
- Hiện spinner

**Success**

- Hiện "Gia hạn thành công"

**Error**

- Hiện "Thanh toán thất bại"

#### 9.6.2 Module Lịch tập

**Flow Xem lịch tập**

1. User mở module lịch tập
2. Hệ thống fetch dữ liệu
3. Hiển thị calendar
4. User click session để xem chi tiết

**UI State**

**Empty**

- "Không có lịch tập"

**Error**

- "Không thể tải lịch tập"

#### 9.6.3 Module Feedback

**Flow Gửi phản hồi**

1. User nhập nội dung
2. User chọn loại phản hồi
3. Bấm gửi
4. Hiện loading
5. Thành công:
   - Reset form
   - Hiện toast success
6. Thất bại:
   - Hiện error message

**Validation**

- Nội dung không được để trống
- Phải chọn loại phản hồi

#### 9.6.4 Module Quản lý hội viên

**Flow Đăng ký hội viên**

1. Staff nhập thông tin hội viên
2. Chọn gói tập
3. Chọn phương thức thanh toán
4. Submit form
5. Thành công:
   - Tạo hội viên
   - Hiện hóa đơn
   - Reset form

**Validation**

- Email không trùng
- SĐT không trùng
- Required field không để trống

#### 9.6.5 Module Quản lý thiết bị

**Flow Bảo trì thiết bị**

1. Staff chọn thiết bị
2. Chuyển trạng thái "Hỏng"
3. Mở form bảo trì
4. Cập nhật kết quả sửa chữa
5. Chuyển trạng thái hoàn tất

**UI State**

**Badge trạng thái**

- Hoạt động
- Hỏng
- Đang sửa
- Ngừng hoạt động

#### 9.6.6 Module Báo cáo thống kê

**Flow Xem báo cáo**

1. Admin chọn loại báo cáo
2. Chọn khoảng thời gian
3. Hệ thống render chart/table
4. Có thể export PDF/Excel

**UI Components**

- Date picker
- Chart
- Table
- Export button

## 10. Tổng kết

Tài liệu hiện tại được tổ chức theo:
Role → Module → Chức năng → Thành phần chính

Cấu trúc này phù hợp cho:

- Team frontend chia module và thiết kế màn hình
- Team backend viết API
- Team database thiết kế entity
- Team tester viết testcase

Đây là format phù hợp hơn cho quá trình triển khai project thực tế thay vì liệt kê quá nhiều page nhỏ lẻ.

---

**Check tạm 23/5:**

- Ko biết đã nối API hết chưa nma khi chưa chạy server, có chỗ báo ko fetch được data và cũng có chỗ vẫn còn dùng mock

**Member:** chưa thay j

**Trainer:**

- Phần giáo án cũng tạm được tuy nhiên cần chỉnh lại phần input ở 1 số màn hình, vẫn còn bị trắng ở input
- \* Khi gán giáo án cho học viên xong, sẽ hiển thị và kiểm tra kết quả đó ở đâu? Sửa lại nhé
- Danh sách tiến độ: chỉnh sửa hộ tôi chỗ lọc theo học viên: chuyển thành thanh search, nếu bấm vào thanh search đó sẽ có dropdown tất cả học viên, và search sẽ tự động lọc kết quả dropdown đó thành tên học viên mong muốn
- Lịch dạy: chỉnh lại giúp tôi cái font title của phần "lịch theo lịch biểu" riêng nó đang không capslock, ở file components/common/sectionheader.tsx ấy

**Staff:**

- Thay toàn bộ màn hình dashboard (cái hiện tại là placeholder thôi, ko liên quan tới cái mình định làm), chỉnh thành các KPI của staff (cái này AI tự biết thôi, cứ đưa danh sách nghiệp vụ của role đó ra là được)
- Các nút input đang còn bị trắng
- Các title trang cần chỉnh lại để dùng font capslock (tham khảo file components/common/sectionheader.tsx cho tất cả các title)

**Owner:**

- Tương tự dashboard của staff, bỏ toàn bộ màn dashboard hiện tại và chuyển qua hiển thị các KPI hiện tại của owner (cái này AI tự biết thôi, cứ đưa danh sách nghiệp vụ của role đó ra là được)
- Input bộ lọc doanh thu/báo cáo bị trắng
- Owner role nên có 1 nút ở sidebar cho phép chuyển qua màn hình Staff (vì permission của staff thì owner cũng dùng được, còn staff không thể chuyển qua làm Owner được)
