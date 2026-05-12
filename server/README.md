# Gym Management — Server

REST API backend cho hệ thống Quản lý phòng tập Gym. Xây dựng bằng **Node.js 20 + Express 4 + TypeScript**, dùng **PostgreSQL** làm cơ sở dữ liệu chính, xác thực bằng **JWT**.

> Tổng quan toàn dự án xem tại [README ở root](../README.md). Lược đồ DB chi tiết: [`docs/Design/Database.md`](../docs/Design/Database.md).

---

## 1. Công nghệ sử dụng

| Nhóm | Thư viện |
| --- | --- |
| Runtime & ngôn ngữ | Node.js 20, TypeScript 5 |
| Framework | Express 4 |
| Database | PostgreSQL (driver `pg`) |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Validation | `express-validator` |
| Bảo mật | `helmet`, `cors` |
| Logging | `winston`, `morgan` |
| Cấu hình | `dotenv` |
| Dev tools | `tsx` (watch mode), ESLint, Prettier, EditorConfig |

Phiên bản Node được khoá tại [`.nvmrc`](./.nvmrc) (Node 20).

---

## 2. Cấu trúc thư mục

```text
server/
├── src/
│   ├── config/
│   │   ├── db.ts             # Pool kết nối PostgreSQL
│   │   └── env.ts            # Đọc & validate biến môi trường
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── db/
│   │   ├── migrations/       # File *.sql tăng dần theo số thứ tự
│   │   │   └── 001_initial_schema.sql
│   │   ├── migrate.ts        # Runner áp dụng migration
│   │   └── seed.ts           # Tạo admin user mặc định
│   ├── middlewares/
│   │   ├── auth.ts           # Kiểm tra JWT, gắn req.user
│   │   ├── errorHandler.ts   # Bắt lỗi tập trung
│   │   └── notFound.ts       # 404 handler
│   ├── routes/
│   │   ├── index.ts          # Gom các route con dưới /api/v1
│   │   └── auth.routes.ts
│   ├── types/                # Types & interface dùng chung
│   ├── utils/
│   │   └── logger.ts         # Winston logger
│   ├── app.ts                # Tạo Express app (middlewares + routes)
│   └── index.ts              # Entry point: tạo HTTP server, listen PORT
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 3. Yêu cầu hệ thống

- Node.js >= 20 (khớp với `.nvmrc`)
- npm >= 10
- PostgreSQL >= 14 đang chạy local (hoặc kết nối tới một instance bất kỳ).

---

## 4. Cài đặt & chạy

```bash
cd server
cp .env.example .env          # chỉnh DB_*, JWT_SECRET, ...
npm install
npm run db:migrate            # áp dụng migration trong src/db/migrations
npm run db:seed               # tuỳ chọn: tạo admin mặc định
npm run dev                   # http://localhost:3000
```

### Build production

```bash
npm run build                 # tsc -> dist/
npm start                     # node dist/index.js
```

---

## 5. Scripts có sẵn

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | `tsx watch src/index.ts` — auto reload khi đổi code |
| `npm run build` | `tsc` biên dịch ra `dist/` |
| `npm start` | Chạy bản build: `node dist/index.js` |
| `npm run lint` | ESLint trên `src/**/*.ts` |
| `npm run format` | Prettier format `src/**/*.{ts,json}` |
| `npm run db:migrate` | Chạy lần lượt các file SQL trong `src/db/migrations/` |
| `npm run db:seed` | Tạo admin mặc định theo `SEED_ADMIN_*` |

---

## 6. Biến môi trường

File `.env` (đã `gitignore`) được nạp qua `dotenv`. Tham khảo đầy đủ ở [`.env.example`](./.env.example).

| Biến | Mặc định | Bắt buộc | Mô tả |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` | – | `development` / `production` / `test` |
| `PORT` | `3000` | – | Cổng HTTP server lắng nghe |
| `CLIENT_URL` | `http://localhost:5173` | – | Origin được CORS cho phép |
| `DB_HOST` | `localhost` | yes | Host PostgreSQL |
| `DB_PORT` | `5432` | yes | Cổng PostgreSQL |
| `DB_NAME` | `gym_management` | yes | Tên database |
| `DB_USER` | `postgres` | yes | User DB |
| `DB_PASSWORD` | `postgres` | yes | Mật khẩu DB |
| `JWT_SECRET` | – | **yes** | Chuỗi ngẫu nhiên đủ dài (>= 32 ký tự) |
| `JWT_EXPIRES_IN` | `7d` | – | Thời hạn token (`60`, `1h`, `7d`, ...) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | – | – | Cấu hình mail (forgot password) |
| `SEED_ADMIN_EMAIL` | `admin@gym.local` | – | Email admin tạo bởi `db:seed` |
| `SEED_ADMIN_PASSWORD` | `ChangeMe123!` | – | Mật khẩu admin seed (đổi ngay sau lần đăng nhập đầu) |
| `SEED_ADMIN_NAME` | `System Admin` | – | Tên hiển thị admin |

> Lưu ý bảo mật: **không** commit `.env`. Trong môi trường thật, đổi `JWT_SECRET` và `SEED_ADMIN_PASSWORD`.

---

## 7. Database

### Migration

Mỗi thay đổi schema là một file `.sql` mới trong `src/db/migrations/`, đặt tên theo dạng `NNN_<mô_tả>.sql` (số tăng dần). Runner `src/db/migrate.ts` sẽ chạy lần lượt các file chưa được áp dụng.

```bash
npm run db:migrate
```

### Seed

`src/db/seed.ts` tạo một tài khoản admin theo các biến `SEED_ADMIN_*`. Có thể chạy nhiều lần, idempotent.

```bash
npm run db:seed
```

### Schema chi tiết

Toàn bộ ERD, bảng, ràng buộc xem trong [`docs/Design/Database.md`](../docs/Design/Database.md).

---

## 8. API

Tất cả endpoint nằm dưới prefix **`/api/v1`** (xem `src/routes/index.ts`).

### Đã triển khai — `auth`

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | – | Đăng nhập, trả JWT |
| `POST` | `/api/v1/auth/logout` | Bearer | Đăng xuất (thu hồi/blacklist token nếu có) |
| `POST` | `/api/v1/auth/forgot-password` | – | Gửi email khôi phục mật khẩu |
| `POST` | `/api/v1/auth/reset-password` | – | Đặt lại mật khẩu bằng token |
| `GET`  | `/api/v1/auth/me` | Bearer | Thông tin tài khoản hiện tại |

### Dự kiến (đã skeleton, sẽ bật khi có controller)

`/members`, `/packages`, `/equipment`, `/rooms`, `/staff`, `/reports`.

### Format phản hồi

Quy ước trả về JSON:

```jsonc
// Thành công
{ "data": { /* payload */ } }

// Lỗi (được errorHandler chuẩn hoá)
{ "error": { "message": "...", "code": "ERROR_CODE" } }
```

### Authentication

Truyền JWT qua header:

```
Authorization: Bearer <token>
```

---

## 9. Quy ước phát triển

- **Tổ chức code**: tách rõ `routes` → `controllers` → (sau này) `services` → `db` (queries).
- **Validation**: dùng `express-validator` trong controller hoặc middleware riêng.
- **Error handling**: throw error trong controller, để `middlewares/errorHandler.ts` xử lý tập trung. Không gọi `res.status(...).json(...)` cho error trực tiếp.
- **Logging**: dùng `utils/logger.ts` (Winston), không `console.log` trong code production.
- **Bảo mật**:
  - Mọi route ghi/đọc dữ liệu nhạy cảm phải đi qua middleware `authenticate` (và `authorize` khi đã có RBAC).
  - Mật khẩu **luôn** băm bằng `bcryptjs` (`hash(password, 10)` trở lên).
  - Không log token, mật khẩu, hay PII.
- **TypeScript**: bật strict, ưu tiên type rõ ràng; tránh `any`.
- Trước khi commit: `npm run lint && npm run build` cần pass.

---

## 10. Khắc phục sự cố

- **`ECONNREFUSED` khi kết nối DB**: kiểm tra PostgreSQL đang chạy và `DB_*` trong `.env`.
- **`password authentication failed`**: sai `DB_USER` / `DB_PASSWORD`.
- **`relation "users" does not exist`**: chưa chạy `npm run db:migrate`.
- **`JsonWebTokenError: invalid signature`**: `JWT_SECRET` đã đổi sau khi token được phát hành — yêu cầu client đăng nhập lại.
- **Port 3000 bị chiếm**: đổi `PORT` trong `.env`.

---

## 11. Tham khảo

- [Express](https://expressjs.com/)
- [node-postgres (`pg`)](https://node-postgres.com/)
- [`jsonwebtoken`](https://github.com/auth0/node-jsonwebtoken)
- [express-validator](https://express-validator.github.io/)
- [Winston](https://github.com/winstonjs/winston)
