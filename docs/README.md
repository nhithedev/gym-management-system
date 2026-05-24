# Tài liệu dự án

## 1. Mục đích

Thư mục `docs/` chứa toàn bộ tài liệu thiết kế hệ thống Gym Management — từ SRS đến API spec, schema, HLD, và UIUX. README này là entry point duy nhất: xem cấu trúc tổng thể, tìm đúng tài liệu cho task cụ thể, và biết thứ tự đọc khi onboard.

Quy tắc viết và review tài liệu: [`CLAUDE.md`](./CLAUDE.md).

---

## 2. Cấu trúc tài liệu

```text
docs/
├── CLAUDE.md              ← đọc trước khi viết/review bất kỳ tài liệu nào
├── Design/
│   ├── Architecture.md    ← HLD: module decomposition, ADR, cron jobs, NFR, STRIDE
│   ├── Database.md        ← Schema: 20 model, 11 enum, data dictionary, DDL
│   └── API/               ← REST API: 10 module, 100 endpoint
│       ├── README.md          entry point API spec + traceability matrix UC→endpoint
│       ├── conventions.md     quy ước chung: auth, pagination, error envelope, RBAC
│       ├── Module-1-Auth.md            7 ep  — login, logout, forgot/reset, verify-email, LINE
│       ├── Module-2-RBAC.md           16 ep  — groups, permissions, users admin
│       ├── Module-3-Package.md         6 ep  — package CRUD + status toggle
│       ├── Module-4-Member-Subscription.md  14 ep  — member + subscription + payment
│       ├── Module-5-Staff.md           8 ep  — staff CRUD + schedule bulk
│       ├── Module-6-Facility.md       13 ep  — rooms + equipment + maintenance
│       ├── Module-7-Training.md        8 ep  — sessions + attendance + member progress
│       ├── Module-8-Feedback.md        5 ep  — feedback submit + staff handle workflow
│       ├── Module-9-Report.md          4 ep  — revenue, members, renewals, staff performance
│       ├── Module-10-Workout.md       19 ep  — exercises + plans + logs
│       └── openapi.yaml                       OpenAPI 3.0 (Module 1+2+3+4+6)
├── Design/UIUX/           ← role-screen mapping + navigation hierarchy (owner/staff)
├── VI/SRS_VI.md           ← SRS: 13 UC (UC00–UC12) với business rules + acceptance criteria
├── VI/Diagram/            ← 13 PlantUML source + rendered PNG
└── reviews/               ← output của /doc-review pipeline (xem §5 để biết trạng thái)
```

---

## 3. Thứ tự đọc để hiểu dự án

Người đọc mới theo path này từ trên xuống:

1. [`VI/SRS_VI.md`](./VI/SRS_VI.md) — hiểu bài toán: 13 use case, actors, business rules
2. [`Design/Architecture.md`](./Design/Architecture.md) — hiểu giải pháp: module decomposition, data flow, ADR
3. [`Design/Database.md`](./Design/Database.md) — hiểu dữ liệu: 20 model, relations, enums
4. [`Design/API/README.md`](./Design/API/README.md) — hiểu API surface: 100 endpoint, traceability UC→endpoint
5. Module spec cụ thể — đi sâu vào từng module cần làm

`Design/UIUX/` đọc song song với bước 4–5 nếu làm frontend. `reviews/` chỉ đọc khi cần biết issue đang open.

---

## 4. Tìm tài liệu theo task

| Task | Tài liệu cần đọc |
|---|---|
| Implement endpoint mới | [`API/conventions.md`](./Design/API/conventions.md) → module spec → [`Database.md`](./Design/Database.md) (field names) |
| Debug business rule | Module spec (WHEN-THEN-ELSE section) + [`SRS_VI.md`](./VI/SRS_VI.md) (UC tương ứng) |
| Thêm/sửa schema | [`Database.md`](./Design/Database.md) §3 (data dictionary) + [`Architecture.md`](./Design/Architecture.md) §4.4 (audit codes) |
| Thiết kế UI screen mới | [`SRS_VI.md`](./VI/SRS_VI.md) (acceptance criteria) + [`Design/UIUX/`](./Design/UIUX/) (role-screen map) |
| Viết test case | [`SRS_VI.md`](./VI/SRS_VI.md) §4 (UC flow + alternative flows) + module spec (error codes) |
| Viết/review tài liệu | [`CLAUDE.md`](./CLAUDE.md) §1 (cấu trúc bắt buộc) + §2 (review pipeline + pass/fail criteria) |
| Kiểm tra permission | [`Module-2-RBAC.md`](./Design/API/Module-2-RBAC.md) §3 (permission catalog) + module spec §2 (RBAC column) |
| Hiểu ADR/architecture decision | [`Architecture.md`](./Design/Architecture.md) §6 (15 ADR) |
| Xem open issues | [`reviews/`](./reviews/) — xem §5 bên dưới |

---

## 5. Trạng thái review

| File | Trạng thái | Ghi chú |
|---|---|---|
| [`reviews/API-review-2026-05-22.md`](./reviews/API-review-2026-05-22.md) | INCOMPLETE | Vòng 3 Reader chưa chạy; 4 MINOR open |
| [`reviews/Module-10-Workout-review-2026-05-24.md`](./reviews/Module-10-Workout-review-2026-05-24.md) | FAIL | 10 MAJOR open — phải fix trước khi implement |


