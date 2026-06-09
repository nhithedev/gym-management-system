# Kế hoạch thiết kế và phát triển giao diện Trainer

## 1. Mục tiêu

Xây dựng đầy đủ khu vực `/trainer` cho huấn luyện viên (PT), bám theo:

1. Nghiệp vụ trong `docs/VI/SRS_VI.md`, trọng tâm UC05A, UC05B, UC05C và UC06C.
2. Contract hiện có trong `client/src/services`.
3. API backend thực tế tương ứng với member, training, workout, staff và facility.
4. Design system trong `client/design.md` và `client/src/styles/globals.css`.

Không dùng mock data trong bản hoàn thiện. Màn hình chưa đủ API phải có empty/error state rõ ràng hoặc được giữ sau feature flag, không tự giả lập dữ liệu.

## 2. Hiện trạng

- Toàn bộ 16 page trong `pages/trainer` đang là placeholder `return null`.
- Route và tiêu đề trang đã được khai báo trong `App.tsx` và `Topbar.tsx`.
- Sidebar đã có các nhóm: Dashboard, Học viên, Lịch dạy, Kế hoạch, Bài tập, Điểm danh, Hồ sơ.
- `LessonPlanListPage` và `CreateLessonPlanPage` trùng khái niệm với Workout Plan nhưng không có model/API riêng.
- `trainer.types.ts` là model cũ, khác với response thực tế trong các service.
- Hai `TrainerLayout.tsx` đều chỉ trả về `Outlet` và hiện không được route sử dụng; `DashboardLayout` mới là app shell thực tế.

## 3. Quyết định phạm vi

### 3.1 Hợp nhất Lesson Plan và Workout Plan

Dùng `workout_plans`, `workout_plan_days` và `workout_plan_exercises` làm một nguồn dữ liệu duy nhất cho "Giáo án/Kế hoạch tập".

- Giữ `/trainer/plans` là route chính.
- `LessonPlanListPage` chuyển hướng về `/trainer/plans`.
- `CreateLessonPlanPage` chuyển hướng sang flow tạo Workout Plan.
- Không tạo model `lesson_plans` mới trong phạm vi frontend này.
- Bỏ các mục Lesson Plan trùng lặp khỏi `Topbar` và route chính sau khi migration link hoàn tất.

### 3.2 Calendar là một view của Sessions

- `/trainer/sessions` có hai chế độ `Danh sách` và `Lịch`.
- `/trainer/calendar` được giữ làm compatibility route và mở sẵn calendar view.
- Cả hai view dùng chung query/filter và `trainingService.getSessions`.

### 3.3 Chỉ hiển thị dữ liệu backend thực sự hỗ trợ

- Session v1 chỉ có học viên, PT, phòng, thời gian và trạng thái.
- Không thêm "loại buổi" hoặc "ghi chú" vào form khi API chưa có field.
- Progress chỉ lưu `weight`, `bmi`, `goal`, `notes`, `recordedAt`.
- Chiều cao có thể nhập tạm để tính BMI phía client nhưng không được gửi như một field riêng.
- Không nhập body fat vì database/API chưa lưu giá trị này.
- Không hiển thị "điểm feedback trung bình" vì feedback hiện không có rating; thay bằng KPI có dữ liệu thật.

### 3.4 Workout Plan là template, không phải plan riêng theo từng member

Theo Module 10:

- `WorkoutPlan` là template gồm nhiều `WorkoutPlanDay`; mỗi ngày gồm nhiều `WorkoutPlanExercise`.
- Một template có thể được giao cho nhiều member thông qua `MemberWorkoutPlan`.
- Trainer tạo plan với `creatorType='staff'`; member tự tạo plan với `creatorType='member'`.
- Trainer list chỉ nhận plan trong scope của mình; không trộn plan cá nhân do member tạo vào màn quản lý Trainer.
- Với staff-created plan, API mutation dựa trên permission chứ không giới hạn đúng người tạo; với member-created plan, chỉ member owner được mutate.
- Mỗi member chỉ có một assignment `active` tại một thời điểm.
- Giao plan mới tự động chuyển assignment active cũ sang `replaced`.
- Workout log ghi kết quả thực tế trên assignment, không sửa ngược template.
- Khi plan đã có bất kỳ WorkoutLog nào, PATCH plan và toàn bộ mutation day/exercise bị write-block; DELETE plan dùng rule active-assignment riêng.

UI phải phân biệt rõ:

- `Plan status`: `draft` → `active` → `archived`.
- `Assignment status`: `active` → `replaced` hoặc `completed`.
- `WorkoutLog`: kết quả actual theo từng set so với target trong template.

## 4. Điều kiện P0 trước khi phát triển UI

### 4.1 Đồng bộ danh tính Trainer

Backend login đã trả `staffId`, nhưng `auth.service.ts` và `AuthUser` phía client chưa giữ field này.

Cần:

- Thêm `staffId?: string | null` vào `ServerLoginData`, `ServerMeData` và `AuthUser`.
- Persist `staffId` trong `authStore`.
- Dùng `staffId` cho lịch làm việc, feedback theo PT và các query cần trainer identity.

### 4.2 Sửa phạm vi truy cập học viên

SRS yêu cầu PT chỉ thấy member có `primary_trainer_id = self.staff_id`.

Hiện tại:

- `GET /members` cho phép filter `trainerId`, nhưng backend chưa tự ép scope khi caller là trainer.
- Frontend filter bằng `trainerId` không đủ để bảo vệ dữ liệu.
- SRS yêu cầu PT chỉ assign cho primary member, nhưng Module 10 v1.1.0 ghi rõ caller ownership không required và PT có thể assign cho bất kỳ member nào.

Cần sửa backend trước khi phát hành:

- Trainer gọi `GET /members` luôn bị ép `primaryTrainerId = caller.staffId`.
- Chốt source of truth cho `POST /workout-plans/members/:memberId/assign`; đề xuất giữ rule SRS và kiểm tra primary trainer.
- Không dựa vào việc ẩn member trên UI làm authorization.

### 4.3 Bổ sung quyền đọc phòng cho Trainer

Form tạo session cần danh sách phòng, nhưng `GET /rooms` đang yêu cầu `room.manage` trong khi role trainer không có quyền này.

Giải pháp đề xuất:

- Tách quyền `room.read`, cấp cho trainer; hoặc
- Cho `session.manage` được đọc danh sách phòng active qua endpoint lookup riêng.

### 4.4 Chốt các API còn thiếu

Các chức năng sau chưa đủ contract:

- Trainer xem workout logs của một member cụ thể.
- Chuyển session thủ công sang `in_progress` hoặc `completed`.
- Đọc/cập nhật staff profile của chính trainer.
- Sửa trực tiếp target của một exercise đã nằm trong plan.

V1 có thể:

- Ẩn workout logs trong tab Giáo án cho đến khi có endpoint scoped theo member.
- Chỉ cho edit/cancel session; trạng thái completed dựa vào cron.
- Profile hiển thị dữ liệu auth cơ bản và lịch làm việc nếu API cho phép.
- Muốn đổi target exercise thì xóa và thêm lại; sau đó bổ sung PATCH endpoint ở phase sau.

### 4.5 Đồng bộ drift của Module 10

`Module-10-Workout.md` đang ở trạng thái Draft và có các điểm cần chốt:

- Tài liệu ghi 19 endpoint nhưng inventory chỉ liệt kê 18; backend hiện có thêm `GET /workout-plans/members/:memberId/assignments`.
- Module 10 chỉ yêu cầu plan có ít nhất một ngày khi activate/assign; SRS yêu cầu ít nhất một ngày và một bài tập.
- Module 10 mô tả PT có thể xóa exercise nếu có `exercise.delete`, nhưng role trainer trong seed hiện không có permission này.
- Module 10 ghi trainer cần endpoint riêng để xem workout log của member và defer v1.1; backend hiện tại vẫn chỉ resolve member context.
- Module 10 chỉ khóa status rollback của plan `archived`; các endpoint cấu trúc chưa có guard riêng theo status nếu plan chưa có log.

Đề xuất:

- Bổ sung assignment-list endpoint vào tài liệu API chính thức.
- Backend enforce ít nhất một ngày và một exercise trước khi activate/assign để khớp SRS; frontend validate cùng rule.
- Giữ nút xóa exercise ẩn với trainer cho đến khi RBAC được thay đổi rõ ràng.
- Không gọi `GET /workout-logs` từ màn Trainer.
- Nếu sản phẩm coi archived plan là readonly, bổ sung backend guard; không chỉ disable control ở frontend.

## 5. Kế hoạch service layer

### `auth.service.ts` và `authStore.ts`

- Nhận và lưu `staffId`.
- Chuẩn hóa type của login và `/auth/me`.

### `member.service.ts`

Thêm:

- `list(params)` gọi `GET /members`.
- `getById(memberId)` gọi `GET /members/:id`.
- Type `TrainerStudentSummary` gồm `activeSubscription`.
- Type `TrainerStudentDetail` gồm subscriptions và primary trainer.
- Giữ `getProgress`.
- Thêm `createProgress(memberId, payload)`.
- Thêm `deleteProgress(progressId)`.

Không dùng `getProfile(memberId)` hiện tại cho trainer vì method này bỏ qua ID và luôn gọi `/members/me`.

### `training.service.ts`

Mở rộng type:

- `TrainingSession.memberName`.
- `TrainingSessionDetail.attendanceLogs`.
- `AttendanceLog.memberCode`, `memberName`, `subscriptionId`.
- `MemberProgress` phản ánh decimal có thể trả về dưới dạng string/null.

Thêm:

- `getSession(id)`.
- `createSession(payload)`.
- `updateSession(id, payload)`.
- `cancelSession(id, reason?)`.
- Query `trainerStaffId`, `roomId`, `from`, `to`.
- `manualCheckin(payload)`.
- `checkout(attendanceId, endedAt)`.

### `workout.service.ts`

Thêm:

- `getAssignments(memberId, { status, limit })`.
- Type assignment detail có plan và days; assignment status là `active`, `replaced`, `completed`.
- Error mapping cho `PLAN_NOT_ACTIVE`, `INVALID_TRANSITION`, `RESOURCE_NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST` và `CONFLICT`.
- Helper nhận diện write-block để chuyển Plan Builder sang readonly sau response 409.
- Normalizer giữ mọi BigInt ID dưới dạng string.
- Parser Decimal cho `targetWeightKg` và `actualWeightKg`; chỉ parse sang number tại lớp hiển thị/tính toán.
- Formatter UTC ISO sang timezone local khi render `createdAt` và `loggedAt`.

Không dùng `getLogs()` cho trainer: backend hiện resolve caller thành member và sẽ trả 403 cho tài khoản chỉ có role trainer.

Contract cần giữ nguyên:

- `getPlans()` không có pagination/filter API; trainer nhận các staff-created plan trong scope role và lọc status phía client.
- `getPlan(id)` trả cấu trúc đầy đủ days → exercises, đã sort theo `dayNumber` và `orderIndex`.
- Không có endpoint PATCH cho `WorkoutPlanExercise`.
- Không có endpoint reorder ngày/bài tập; `dayNumber` và `orderIndex` được gửi lúc tạo và phải unique trong parent.
- `deletePlan`, `deletePlanDay`, `deletePlanExercise` có thể trả 409 do active assignment, write-block hoặc FK reference.

### Service lookup mới

- `facility.service.ts`: đọc danh sách phòng sau khi quyền API được chốt.
- `staff.service.ts`: đọc hồ sơ trainer và `GET /staff/:id/schedules`.

## 6. Kiến trúc frontend đề xuất

```text
pages/trainer/
  components/
    TrainerPageHeader.tsx
    TrainerStatCard.tsx
    TrainerStatusBadge.tsx
    TrainerDataTable.tsx
    TrainerFilterBar.tsx
    StudentCombobox.tsx
    TrainerEmptyState.tsx
    TrainerErrorState.tsx
    TrainerSkeleton.tsx
    ConfirmActionDialog.tsx
  attendance/
  exercises/
  plans/
  sessions/
  students/
  DashboardPage.tsx
  ProfilePage.tsx

hooks/
  useTrainerStudents.ts
  useTrainerSessions.ts
  useTrainerPlans.ts

lib/
  utils.ts
  date.ts
  status.ts
  api-error.ts
```

Giữ data fetching theo pattern hiện tại của dự án (`useEffect`, `useState`, service functions). Chưa đưa TanStack Query vào riêng module trainer nếu toàn dự án chưa dùng, tránh tạo hai chuẩn state management song song.

Quy tắc đặt code dùng chung:

- Hook đặt trong `src/hooks` và dùng prefix `useTrainer*` khi contract còn đặc thù cho role trainer.
- Utility dùng được cho nhiều module đặt trong `src/lib` theo file có chủ đề rõ ràng.
- `src/lib/utils.ts` tiếp tục chứa helper nền tảng ngắn như `cn`; không gom date formatting, status mapping và API error parsing vào cùng một file.
- Logic chỉ phục vụ một component/page vẫn đặt gần component/page đó, không đưa ra global chỉ để giảm số dòng trong file.

Filter, tab và pagination quan trọng nên đồng bộ với URL search params để back/forward và deep link hoạt động đúng.

## 7. Quy chuẩn giao diện

`design.md` là source of truth khi có khác biệt với tài liệu UI cũ.

- App background: `var(--rogym-bg-base)`.
- Nội dung có `max-width: 1280px`, căn giữa, responsive padding.
- Dùng Be Vietnam Pro cho toàn bộ dashboard, form, table và nội dung tương tác.
- Không dùng Anton cho page title/form; Anton chỉ giữ cho logo và các section lớn của homepage.
- Card dữ liệu dùng `.rogym-card` hoặc `.rogym-card--compact`.
- Input/select/textarea dùng `.rogym-input` hoặc `.input-base`.
- Button dùng `.rogym-btn` và variant tương ứng để có sweep trái sang phải.
- Text action dùng `.rogym-text-link` để có underline trái sang phải.
- Không scale, bounce hoặc translate button/text khi hover.
- Dùng `lucide-react`, không dùng emoji.
- Table desktop phải có card/list fallback trên mobile, không ép horizontal scroll cho thao tác chính.
- Mọi page có đủ loading, empty, error, forbidden và retry state.
- Tôn trọng `prefers-reduced-motion`.

Status badge:

- `scheduled`, `active`: green/teal.
- `in_progress`: teal nổi bật.
- `completed`: green dịu.
- `cancelled`, `expired`: error.
- `draft`: muted.
- `archived`, `replaced`: dim.

## 8. Đặc tả từng màn hình

### 8.1 Dashboard

Route: `/trainer`

KPI khả thi:

- Tổng học viên đang quản lý.
- Số session hôm nay.
- Session completed trong tháng.
- Session sắp tới gần nhất.

Widgets:

- Lịch hôm nay.
- Lịch 7 ngày tới.
- Học viên sắp hết hạn gói.
- Học viên chưa có progress hoặc progress gần nhất đã quá 14 ngày, chỉ triển khai khi có query hiệu quả; tránh N+1 request.

Quick actions:

- Tạo session.
- Ghi progress.
- Tạo workout plan.
- Mở calendar.

Không dùng KPI "feedback trung bình" khi schema chưa có rating.

### 8.2 Danh sách học viên

Route: `/trainer/students`

- Search theo tên, email hoặc mã member.
- Filter trạng thái tài khoản/gói.
- Desktop table: member code, họ tên, gói active, ngày hết hạn, trạng thái, session kế tiếp.
- Mobile card: thông tin chính và hai action.
- Action: xem chi tiết, ghi progress.
- Pagination server-side.

### 8.3 Chi tiết học viên

Route: `/trainer/students/:id`

Tab được lưu ở `?tab=overview|sessions|progress|workout`.

`overview`:

- Thông tin cá nhân read-only.
- Gói active và ngày hết hạn.
- Session gần nhất.
- Progress mới nhất.

`sessions`:

- Sessions của member.
- Tạo session mới với member được preselect.

`progress`:

- Biểu đồ cân nặng/BMI bằng `recharts`.
- Lịch sử progress.
- Ghi mới và xóa bản ghi do trainer tạo nếu API cho phép.

`workout`:

- Assignment active lấy từ assignment-list endpoint.
- Hiển thị lịch sử assignment `replaced`/`completed` ở dạng thu gọn nếu cần.
- Cấu trúc plan và các ngày/bài tập read-only, gồm target sets/reps/weight/duration/rest.
- Gán plan active mới.
- Workout log của member chỉ hiển thị sau khi backend có endpoint trainer-scoped.
- Khi assign plan mới, refresh assignment active; assignment cũ được backend atomically chuyển sang `replaced`.

### 8.4 Thêm và xem progress

Routes:

- `/trainer/students/:id/progress`
- `/trainer/students/:id/progress/list`

Form:

- Member cố định theo route; nếu mở từ quick action tổng thì dùng searchable combobox.
- `recordedAt`, weight, chiều cao tạm, BMI tự tính, goal, notes.
- Validate weight `0.1-500`, BMI `10-50`, thời gian không ở tương lai quá 5 phút.
- Sau khi lưu: navigate về tab progress và refresh dữ liệu.

Progress list dùng search combobox, không dùng chip member.

### 8.5 Sessions List và Calendar

Routes:

- `/trainer/sessions`
- `/trainer/calendar`

Filters:

- Status.
- Khoảng ngày.
- Học viên.
- Phòng nếu API lookup khả dụng.

List:

- Ngày/giờ, member, phòng, trạng thái.
- Edit chỉ khi `scheduled` và chưa bắt đầu.
- Cancel chỉ khi hợp lệ; UI giải thích rule trước 2 giờ.

Calendar:

- Day/week view.
- Session card hiển thị member, giờ, phòng, status.
- Click mở session detail.
- Không dùng thư viện calendar mới nếu grid CSS đáp ứng được day/week MVP.

### 8.6 Create/Edit Session

Routes:

- `/trainer/sessions/create`
- `/trainer/sessions/:id/edit`

Fields:

- Student combobox chỉ gồm học viên thuộc PT.
- Room combobox.
- Ngày, giờ bắt đầu, thời lượng; client tính `endTime`.

Validation:

- Start time hợp lệ.
- End time lớn hơn start time.
- Edit chỉ cho session `scheduled` chưa bắt đầu.
- Map lỗi 409 thành thông báo cụ thể: hết gói, trùng phòng, trùng lịch PT.

### 8.7 Session Detail

Route: `/trainer/sessions/:id`

- Member, room, start/end time, status.
- Attendance logs gắn với session.
- Action khả dụng hiện tại: sửa và hủy.
- Chỉ thêm "Bắt đầu/Hoàn thành" khi backend có status transition endpoint.

### 8.8 Workout Plans

Route: `/trainer/plans`

- `GET /workout-plans` trả array có sẵn days và exercises, không có pagination.
- List/card: tên, trạng thái, số ngày, số bài, ngày tạo.
- Filter status phía client nếu API list chưa hỗ trợ query.
- Search tên plan phía client trên dataset đã tải.
- Action theo trạng thái: mở builder, activate, archive, assign, delete.
- Tạo plan bằng modal ngắn; thành công chuyển tới builder.
- Plan mới luôn bắt đầu ở `draft`.
- Chỉ plan `active` mới được assign.
- `archived` là terminal và chỉ hiển thị readonly.
- Delete là soft-delete và bị block nếu plan còn assignment active.

Ma trận action:

| Status     | Builder                      | Activate | Assign | Archive                                                   | Delete                            |
| ---------- | ---------------------------- | -------- | ------ | --------------------------------------------------------- | --------------------------------- |
| `draft`    | Edit                         | Có       | Không  | Có                                                        | Có nếu không bị conflict          |
| `active`   | Edit cho đến khi write-block | Không    | Có     | Chỉ khi không có assignment active và chưa bị write-block | Có nếu không có assignment active |
| `archived` | Readonly theo product rule   | Không    | Không  | Không                                                     | Có nếu không bị conflict          |

### 8.9 Plan Builder

Route: `/trainer/plans/:id/builder`

- Header plan: name, description, status.
- Cột hoặc accordion theo ngày tập.
- Ngày tập có `dayNumber >= 1`, unique trong plan; UI tự đề xuất số tiếp theo.
- Thêm/sửa tên và notes của ngày; xóa ngày sẽ cascade các exercise trong ngày.
- Exercise có `orderIndex >= 0`, unique trong ngày; UI tự gán index tiếp theo.
- Thêm/xóa exercise trong ngày; v1 chưa có edit/reorder exercise đã thêm.
- Target theo loại bài: sets/reps/weight hoặc duration; rest và notes.
- `targetSets` bắt buộc và tối thiểu 1.
- `targetReps` hoặc `targetDurationSec` được hiển thị theo category; weight tối thiểu 0, rest mặc định 60 giây.
- Khi server trả write-block `409 CONFLICT`, chuyển toàn bộ builder sang readonly và giải thích plan đã có workout log.
- Write-block áp dụng cho PATCH plan, thêm/sửa/xóa day và thêm/xóa exercise.
- Activate chỉ khi plan có ít nhất một ngày và một exercise theo rule đã chốt với SRS.
- Status transition một chiều: `draft → active → archived`; `draft → archived` cũng hợp lệ.
- Active plan chỉ archive được khi không còn assignment active.
- Archived là trạng thái cuối, không cho rollback; policy readonly toàn bộ cần backend guard bổ sung.
- Khi xóa plan exercise, map 409 do WorkoutLogSet reference thành thông báo dữ liệu lịch sử được bảo vệ.

### 8.10 Assign Plan

Modal dùng tại Workout Plans và Student Detail:

- Chọn member thuộc PT.
- Start date.
- Notes.
- Submit gọi `assignPlan`.
- Chỉ mở modal cho plan `active`.
- Gửi `planId` và `startDate` định dạng `YYYY-MM-DD`.
- Hiển thị cảnh báo rằng assignment active hiện tại sẽ được chuyển sang `replaced`.
- Backend thực hiện replace assignment cũ và tạo assignment mới trong cùng transaction.
- Map lỗi: `PLAN_NOT_ACTIVE`, plan/member không tồn tại, plan chưa đủ cấu trúc và ownership forbidden.
- Chống double-submit; không tự retry mutation assign.
- Thành công chuyển tới `/trainer/students/:memberId?tab=workout`.

### 8.11 Exercise Library

Route: `/trainer/exercises`

- API filter theo category và muscle group; search theo tên thực hiện phía client.
- Card/table: name, category, muscle group, equipment, description.
- Dữ liệu equipment là text `equipmentNeeded`, không liên kết trực tiếp với Facility/Equipment API.
- Trainer được tạo và sửa.
- Không hiển thị delete cho trainer vì role hiện không có `exercise.delete`.
- Form dùng `.rogym-input`; category là strength/cardio/flexibility/balance.
- Validate name 1-100 ký tự; muscle group và equipment tối đa 100 ký tự.
- Nếu sau này cấp quyền delete, map 409 khi exercise đang được plan có assignment active tham chiếu.

### 8.12 Ranh giới Workout Logs trong màn Trainer

- Trainer không tạo hoặc sửa WorkoutLog; đây là luồng UC06A của member.
- Không gọi `workoutService.getLogs()` trong role trainer dù trainer có `workout_log.read`, vì endpoint hiện vẫn bắt caller có member profile.
- Tab workout của Student Detail chỉ bật phần lịch sử actual-vs-target khi có endpoint đọc log theo `memberId` với ownership guard PT-if-primary.
- Response tương lai cần giữ `planDay`, sets, `planExercise`, target và actual để UI so sánh.
- Rule sửa log trong 24 giờ chỉ áp dụng cho member owner và không tạo action edit trong Trainer UI.

### 8.13 Attendance

Route: `/trainer/attendance`

- Filter member, method, date range.
- Cột: member, check-in, check-out, method, session.
- Manual check-in bằng member code.
- Cho checkout attendance đang mở.
- Polling 30 giây nếu cần real-time view; dừng polling khi tab browser không active.

### 8.14 Profile

Route: `/trainer/profile`

MVP:

- Full name, email từ auth.
- Staff code, phone, position khi self staff API khả dụng.
- Lịch làm việc read-only.
- Đổi mật khẩu.
- Đăng xuất.

Không cho trainer sửa dữ liệu nhân sự nếu backend chỉ cấp `staff.update` cho owner/staff.

## 9. Thứ tự triển khai

### Phase 0 - Contract và authorization

- Đồng bộ `staffId`.
- Sửa member scope và assign-plan ownership.
- Chốt quyền đọc room.
- Đồng bộ Module 10: assignment-list endpoint, điều kiện plan hợp lệ và permission delete exercise.
- Mở rộng service/type.
- Chốt các endpoint còn thiếu hoặc feature flag.

### Phase 1 - UI foundation

- Component dùng chung, status map, date/error utils.
- Loading/empty/error/confirm states.
- Responsive table/card pattern.
- Chuẩn hóa Sidebar và Topbar, bỏ route Lesson Plan trùng lặp.

### Phase 2 - Students và Progress

- Students List.
- Student Detail overview/progress.
- Add Progress và Progress List.
- Assignment summary trong tab workout.

### Phase 3 - Sessions và Attendance

- Sessions List.
- Create/Edit/Detail.
- Calendar.
- Attendance history, manual check-in và checkout.

### Phase 4 - Workout Plans và Exercises

- Exercise Library.
- Workout Plans.
- Plan Builder.
- Assign flow.
- Student Detail workout tab.

### Phase 5 - Dashboard và Profile

- Dashboard aggregate sau khi các module nguồn ổn định.
- Profile và staff schedule.

### Phase 6 - Hardening

- Responsive 360/768/1280px.
- Keyboard/focus/reduced-motion.
- Error code mapping.
- Pagination và URL state.
- Kiểm tra timezone UTC/Vietnam.
- Build, lint và regression các role khác.

## 10. Tiêu chí hoàn thành

- Không còn page trainer trả về `null`.
- PT chỉ nhìn và thao tác trên học viên được phân công.
- Toàn bộ form dùng service thật và có validation/error state.
- Không có hai hệ Lesson Plan và Workout Plan song song.
- Session, progress, attendance và workout plan tuân thủ business rule trong SRS.
- Workout Plan tuân thủ BR-W01 đến BR-W06 của Module 10.
- BigInt ID luôn được giữ dưới dạng string; Decimal và UTC được normalize trước khi hiển thị.
- Không có mutation nào vượt contract: không edit/reorder plan exercise và không đọc workout log member bằng endpoint self-scoped.
- Assign plan mới atomically thay thế assignment active cũ và UI phản ánh đúng `active/replaced/completed`.
- Write-block đưa toàn bộ Plan Builder về readonly khi plan đã có workout log.
- Giao diện dùng token/class trong `globals.css`, không tạo palette cục bộ trùng lặp.
- Button có sweep; text link có underline; không scale button/text.
- Desktop và mobile đều sử dụng được bằng bàn phím.
- `npm run build` và `npm run lint` thành công.
