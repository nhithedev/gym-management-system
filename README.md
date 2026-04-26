# 🏋️ Hệ Thống Quản Lý Phòng Tập Gym

## 1. Mô Tả Dự Án

Hệ thống quản lý phòng tập gym được thiết kế nhằm hỗ trợ chủ phòng tập và nhân viên trong việc quản lý hiệu quả các hoạt động vận hành, bao gồm:

- Quản lý phòng tập và thiết bị
- Quản lý nhân sự
- Quản lý hội viên và gói tập
- Báo cáo thống kê

Bằng cách cung cấp một nền tảng kỹ thuật số tích hợp, hệ thống giúp tối ưu hóa quy trình quản lý, giảm thiểu sai sót và nâng cao trải nghiệm của hội viên.

---

## 2. Đối Tượng Sử Dụng

| Đối tượng | Vai trò |
|---|---|
| **Chủ phòng tập** | Quản lý tổng thể hoạt động kinh doanh: doanh thu, nhân sự, hội viên, thiết bị và phản hồi khách hàng |
| **Nhân viên quản lý** | Theo dõi hoạt động hàng ngày, kiểm soát đăng ký, gia hạn gói tập và xử lý phản hồi hội viên |
| **Huấn luyện viên cá nhân** | Quản lý danh sách học viên, theo dõi lịch tập, hướng dẫn và đánh giá tiến độ tập luyện |
| **Hội viên** | Đăng ký, theo dõi gói tập, quản lý lịch sử tập luyện và đánh giá chất lượng dịch vụ |

---

## 3. Chức Năng Chính

### 3.1 Quản Lý Phòng Tập

- **Thông tin phòng tập:** Lưu trữ và cập nhật thông tin phòng tập (mã phòng, tên phòng, loại phòng: gym, yoga, fitness, v.v.), số lượng phòng và tình trạng hoạt động.
- **Thiết bị tập luyện:** Theo dõi danh sách thiết bị (mã thiết bị, tên thiết bị, số lượng, ngày nhập, bảo hành, xuất xứ, trạng thái sử dụng).
- **Nhân sự:** Phân quyền cho các nhóm nhân sự (nhân viên kinh doanh, chăm sóc khách hàng, huấn luyện viên), theo dõi lịch làm việc và đánh giá hiệu suất.
- **Phản hồi hội viên:** Tiếp nhận và xử lý đánh giá, phản hồi về nhân viên và cơ sở vật chất.

### 3.2 Quản Lý Hội Viên

- **Thông tin cá nhân:** Ghi nhận họ tên, tuổi, nghề nghiệp, thông tin liên hệ, sinh nhật, loại thành viên và dấu vân tay (nếu có).
- **Đăng ký & gia hạn:** Theo dõi ngày đăng ký, loại đăng ký (theo buổi / tháng / năm) và tình trạng gia hạn.
- **Lịch sử sử dụng dịch vụ:** Ghi nhận số buổi tập, thời gian tập, các dịch vụ đã sử dụng và mức độ tham gia.
- **Tài khoản hội viên:** Hội viên đăng nhập để theo dõi gói tập, lịch tập, phản hồi và nhận thông tin khuyến mãi.

### 3.3 Quản Lý Gói Tập

- **Thiết lập gói tập:** Định nghĩa các loại gói (gói 3 tháng, 6 tháng, 1 năm, theo buổi, VIP, tập cá nhân với huấn luyện viên).
- **Đăng ký & thanh toán:** Xác nhận đăng ký, ghi nhận thanh toán, cấp biên lai và gia hạn gói tập.

### 3.4 Báo Cáo Thống Kê

- **Doanh thu:** Thống kê theo ngày, tuần, tháng, quý, năm.
- **Đăng ký & gia hạn:** Báo cáo hội viên mới, hội viên gia hạn, số buổi tập đã sử dụng.
- **Hiệu suất nhân viên:** Đánh giá dựa trên phản hồi hội viên và hoạt động quản lý.

---

## 4. Quy Trình Nghiệp Vụ

### 4.1 Đăng Ký Hội Viên Mới

```
1. Hội viên cung cấp thông tin cá nhân và chọn gói tập.
2. Nhân viên tiếp nhận, tạo hồ sơ hội viên trên hệ thống.
3. Hội viên thanh toán (tiền mặt, thẻ ngân hàng, ví điện tử).
4. Hệ thống cấp mã hội viên và cập nhật danh sách hội viên.
```

### 4.2 Ghi Nhận Lịch Sử Tập Luyện & Theo Dõi Gói Tập

```
1. Hội viên đăng nhập vào hệ thống qua ứng dụng hoặc website.
2. Hệ thống hiển thị thông tin gói tập, lịch sử sử dụng, số buổi còn lại.
3. Nhân viên / huấn luyện viên ghi nhận lịch sử tập luyện.
4. Hội viên có thể gia hạn gói tập trực tuyến.
```

### 4.3 Bảo Trì Thiết Bị

```
1. Nhân viên kiểm tra tình trạng thiết bị định kỳ.
2. Nếu phát hiện lỗi, nhân viên báo cáo trên hệ thống.
3. Hệ thống thông báo cho bộ phận bảo trì để xử lý.
4. Sau khi sửa chữa, trạng thái thiết bị được cập nhật lại.
```

---

## 5. Công Nghệ Sử Dụng

> *(Cập nhật khi stack công nghệ được xác định)*

---

## 6. Hướng Dẫn Cài Đặt

> *(Cập nhật khi có hướng dẫn cụ thể)*

---

## 7. Đóng Góp

Mọi đóng góp đều được hoan nghênh. Vui lòng tạo **Issue** hoặc **Pull Request** để thảo luận trước khi thay đổi.

---

## 8. Giấy Phép

> *(Cập nhật khi có thông tin giấy phép)*
