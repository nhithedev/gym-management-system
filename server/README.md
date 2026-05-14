# Gym Management — Server

REST API backend cho hệ thống Quản lý phòng tập Gym. Xây dựng bằng **Node.js 20 + NestJS 10 + TypeScript**, dùng **PostgreSQL** và **Prisma ORM**, xác thực bằng **JWT** (`passport-jwt`).

> Tổng quan toàn dự án: [README ở root](../README.md). Lược đồ DB: [`docs/Design/Database.md`](../docs/Design/Database.md).

---

## 1. Công nghệ sử dụng

| Nhóm | Thư viện |
| --- | --- |
| Runtime & ngôn ngữ | Node.js 20, TypeScript 5 |
| Framework | NestJS (`@nestjs/core`, `@nestjs/platform-express`) |
| Database | PostgreSQL |
| ORM | Prisma (`@prisma/client`, migrations trong `prisma/migrations`) |
| Auth | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcryptjs` |
| Validation | `class-validator`, `class-transformer` |
| Bảo mật | `helmet`, CORS qua NestJS |
| Logging | NestJS `Logger` / `winston` (`utils/logger.ts`) |

Phiên bản Node có thể khoá tại [`.nvmrc`](./.nvmrc).

---

## 2. Cấu trúc thư mục

```text
server/
├── prisma/
│   ├── schema.prisma          # 19 model + 11 enum (khớp Database.md)
│   ├── seed.ts                # Seed RBAC + user/staff/member mẫu
│   └── migrations/            # Prisma Migrate SQL
├── src/
│   ├── main.ts                # Bootstrap: helmet, CORS, ValidationPipe, prefix api/v1
│   ├── app.module.ts
│   ├── config/
│   │   └── configuration.ts   # Validate env (class-validator)
│   ├── prisma/
│   │   ├── prisma.module.ts   # @Global()
│   │   └── prisma.service.ts  # PrismaClient lifecycle
│   ├── auth/                  # JWT, guards, DTO, login/forgot/reset/me
│   ├── users/                 # findByEmailWithRoles (join user_groups → groups)
│   ├── health/
│   ├── common/filters/        # HttpExceptionFilter + map Prisma errors
│   └── utils/logger.ts
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 3. Yêu cầu hệ thống

- Node.js ≥ 20  
- npm ≥ 10  
- PostgreSQL ≥ 14  

---

## 4. Cài đặt & chạy

```bash
cd server
cp .env.example .env          # chỉnh DATABASE_URL, DIRECT_URL (Prisma migrate), JWT_SECRET, ...
npm install
npx prisma generate
npm run prisma:migrate        # tạo schema (lần đầu: prisma migrate dev)
npm run prisma:seed           # dữ liệu mẫu (owner@gym.local, Password123!, ...)
npm run dev                   # http://localhost:3000 — Nest watch mode
```

### Build production

```bash
npm run build
npm run start:prod            # node dist/main.js
```

---

## 5. Scripts

| Lệnh | Mô tả |
| --- | --- |
| `npm run dev` | `nest start --watch` |
| `npm run build` | `nest build` → `dist/` |
| `npm start` | `node dist/main.js` |
| `npm run start:prod` | Giống `npm start` |
| `npm run lint` | ESLint `src/**/*.ts` |
| `npm run format` | Prettier |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:deploy` | `prisma migrate deploy` |
| `npm run prisma:seed` | `prisma db seed` |
| `npm run prisma:studio` | Prisma Studio |
| `npm run prisma:reset` | Reset DB + migrate + seed (dev) |

---

## 6. Biến môi trường

Tham khảo [`.env.example`](./.env.example).

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Connection string PostgreSQL cho Prisma (`url` trong `schema.prisma`) |
| `DIRECT_URL` | –\* | Chuỗi kết nối trực tiếp tới Postgres cho `directUrl` (Prisma migrate/generate — với DB qua pooler như Supabase nên có; có thể trùng `DATABASE_URL` nếu local không dùng pooler) |
| `JWT_SECRET` | **yes** | Khóa ký JWT |
| `JWT_EXPIRES_IN` | – | Mặc định `7d` |
| `NODE_ENV` | – | `development` / `production` / `test` |
| `PORT` | – | Mặc định `3000` |
| `CLIENT_URL` | – | Origin CORS (VD: `http://localhost:5173`) |
| `SMTP_*` | – | Tuỳ chọn (forgot password sau này) |

\* `DIRECT_URL` được khai báo trong [`prisma/schema.prisma`](./prisma/schema.prisma): thiếu biến này sẽ lỗi khi `npx prisma generate` / `npm run prisma:*` nếu schema vẫn dùng `directUrl`.

---

## 7. Database

**Nguồn migrate duy nhất:** [`prisma/migrations/`](./prisma/migrations/) (Prisma Migrate). Mọi file SQL còn lưu dưới `src/db/**` (nếu có trong repo) chỉ để **tham chiếu / lịch sử**, không được pipeline chạy tự động.

Schema do **Prisma Migrate** quản lý. `PrismaService` **không** gọi `$connect()` lúc bootstrap — ứng dụng vẫn chạy được khi DB tạm lỗi; `/health` báo `db: down`, Prisma kết nối khi có truy vấn đầu tiên.

Seed chạy `prisma/seed.ts`: reset các bảng RBAC/profile liên quan rồi upsert permissions, groups, users, staff, members, `user_groups`, `group_permissions`.

User thử nghiệm sau seed:

- Email: `owner@gym.local`  
- Mật khẩu: `Password123!`  

*(Đổi ngay trong môi trường thật.)*

### Supabase (PostgreSQL)

Server chỉ **dùng Postgres của Supabase** qua Prisma (JWT vẫn do NestJS cấp, không bắt buộc tích hợp Supabase Auth).

1. Tạo project tại [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/database).
2. Vào **Project Settings → Database → Connection string**:
   - **`DATABASE_URL`**: chọn **Transaction pooler** (host `*.pooler.supabase.com`, cổng **6543**). Thêm `?pgbouncer=true` (và `sslmode=require` nếu dashboard gợi ý). Đây là chuỗi dùng cho **Prisma Client** (runtime Nest).
   - **`DIRECT_URL`**: chọn **Direct connection** (`db.<project-ref>.supabase.co`, cổng **5432**), không qua pooler transaction. Prisma dùng cho **`prisma migrate` / `prisma migrate deploy`**.
3. Ghi vào `.env` (đổi mật khẩu, **URL-encode** ký tự đặc biệt trong mật khẩu; host vùng lấy đúng theo dashboard, không cứng region).
4. Trong `server/`:

```bash
npx prisma generate
npm run prisma:deploy       # đẩy các file trong prisma/migrations/ lên DB Supabase
npm run prisma:seed         # tuỳ chọn — dữ liệu RBAC/user mẫu
npm run dev
```

Chi tiết ví dụ chuỗi nằm trong [`.env.example`](./.env.example). Luồng Prisma ↔ Supabase: [Prisma + Supabase](https://www.prisma.io/docs/orm/overview/databases/supabase), [Integration guide](https://supabase.com/partners/integrations/prisma).

#### Kết nối Supabase đã có sẵn dữ liệu (DB không rỗng)

Nếu project Supabase đã tồn tại schema hoặc extension, `prisma:deploy` sẽ báo lỗi `P3005: The database schema is not empty`. Thay bằng `prisma db push` — đồng bộ schema trực tiếp mà không kiểm tra migration history:

```bash
npx dotenv -e .env -- prisma db push
```

Sau lần đầu push thành công, các migration tiếp theo dùng `prisma:deploy` bình thường.

#### DIRECT_URL: cổng 5432 bị block

Một số ISP/firewall chặn cổng 5432 của direct host (`db.<ref>.supabase.co:5432`). Kiểm tra trước:

```powershell
# PowerShell
Test-NetConnection -ComputerName "db.<ref>.supabase.co" -Port 5432 -InformationLevel Quiet
# False = bị block
```

Nếu bị block, dùng **Session pooler** (cùng host với Transaction pooler nhưng cổng **5432**, hỗ trợ DDL):

```env
# .env — thay DIRECT_URL
DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-X-<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

Lưu ý: username của Session pooler có dạng `postgres.<ref>` (giống Transaction pooler), khác với direct connection (`postgres`).

---

## 8. API

Prefix **`/api/v1`** cho các controller Nest (health được exclude khỏi prefix).

### Health

| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/health` | Public |

### Auth

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Public | Đăng nhập → JWT (`roles` trong payload) |
| `POST` | `/api/v1/auth/logout` | Bearer | Client chủ động bỏ token |
| `POST` | `/api/v1/auth/forgot-password` | Public | Stub OTP |
| `POST` | `/api/v1/auth/reset-password` | Public | Stub — chưa triển khai |
| `GET` | `/api/v1/auth/me` | Bearer | User hiện tại + roles (đọc lại từ DB) |

### Định dạng lỗi

```json
{ "success": false, "code": "...", "message": "...", "details": null }
```

### JWT

```
Authorization: Bearer <token>
```

RBAC runtime: **`RolesGuard`** + decorator `@Roles('owner', 'staff', ...)`. JWT chứa `roles` lúc login (không query permission chi tiết mỗi request).

### Ví dụ gọi API (curl / PowerShell)

**Health check:**

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"...","db":"ok"}
```

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**Đăng nhập:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.local","password":"Password123!"}'
```

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"email":"owner@gym.local","password":"Password123!"}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

Response trả `accessToken` và `user` với `roles: ["owner"]`. Lưu token để gọi các endpoint yêu cầu auth.

**Quên mật khẩu (lấy OTP):**

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.local"}'
```

OTP 6 chữ số được log ra console server (stdout). Khi SMTP được cấu hình, OTP sẽ được gửi qua email thay vì log.

**Đặt lại mật khẩu:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@gym.local","otp":"<OTP_6_CHU_SO>","newPassword":"NewPass456!"}'
```

OTP hết hạn sau 10 phút. Gọi `forgot-password` lại để lấy OTP mới nếu cần.

**Xem thông tin user đang đăng nhập:**

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

---

## 9. Quy ước phát triển

- Module/feature mới: `nest g module|controller|service`.  
- DTO dùng `class-validator`.  
- Truy vấn DB qua `PrismaService`.  
- Trước commit: `npm run lint && npm run build`.

---

## 10. Khắc phục sự cố

- **`P1001` / không kết nối được DB**: kiểm tra PostgreSQL và `DATABASE_URL`; với Supabase xác nhận `sslmode`, pooler `:6543` + `pgbouncer=true`, và `DIRECT_URL` đúng (direct `:5432`).  
- **Supabase + `migrate dev`**: migrate dev có thể cần shadow DB; với chỉ Postgres trên Supabase thường dùng `npm run prisma:deploy` (CI/prod) hoặc Postgres local để sinh migration mới, rồi deploy lên Supabase.  
- **`relation does not exist`**: chạy `npm run prisma:deploy` (Supabase/remote) hoặc `npm run prisma:migrate` (Postgres local có quyền tạo DB shadow).  
- **JWT invalid**: đổi `JWT_SECRET` → đăng nhập lại.  
- **Port bận**: đổi `PORT` trong `.env`.

---

## 11. Tham khảo

- [NestJS](https://docs.nestjs.com/)  
- [Prisma](https://www.prisma.io/docs)  
- [Prisma + Supabase](https://www.prisma.io/docs/orm/overview/databases/supabase)  
- [Supabase + Prisma (partner)](https://supabase.com/partners/integrations/prisma)  
- [Passport JWT](http://www.passportjs.org/)
