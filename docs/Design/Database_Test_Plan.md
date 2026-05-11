Ke hoach kiem tra Database

- [0. Pham vi va gia dinh](#0-pham-vi-va-gia-dinh)
- [1. Chuan bi](#1-chuan-bi)
- [2. Schema Testing](#2-schema-testing)
  - [2.1 Kiem tra ton tai bang va cot](#21-kiem-tra-ton-tai-bang-va-cot)
  - [2.2 Kiem tra rang buoc NOT NULL va UNIQUE](#22-kiem-tra-rang-buoc-not-null-va-unique)
  - [2.3 Kiem tra CHECK (neu can)](#23-kiem-tra-check-neu-can)
  - [2.4 Kiem tra khoa ngoai (FK)](#24-kiem-tra-khoa-ngoai-fk)
  - [2.5 Kiem tra kieu du lieu](#25-kiem-tra-kieu-du-lieu)
- [3. Data Integrity va CRUD](#3-data-integrity-va-crud)
  - [3.1 Seeding](#31-seeding)
  - [3.2 CRUD](#32-crud)
- [4. Business Rule Testing](#4-business-rule-testing)
  - [4.1 Logic thoi gian het han](#41-logic-thoi-gian-het-han)
  - [4.2 Logic check-in](#42-logic-check-in)
  - [4.3 Trang thai thanh toan va kich hoat](#43-trang-thai-thanh-toan-va-kich-hoat)
- [5. Performance va Security](#5-performance-va-security)
  - [5.1 Indexing](#51-indexing)
  - [5.2 Concurrency](#52-concurrency)
- [6. Deliverables](#6-deliverables)


## 0. Pham vi va gia dinh

- DB engine: PostgreSQL.
- Schema: dua theo ERD va DDL trong docs/Design/Database.md.
- Moi truong test: 1 database rieng (vi du: gym_test) hoac 1 schema rieng (vi du: test).
- Du lieu test co the bi xoa hoan toan sau moi dot kiem tra.
- ACL tang DB: khong can.

## 1. Chuan bi

1. Tao database/schema test.
2. Apply DDL.
3. Thiet lap time zone de test logic ngay gio: SET TIME ZONE 'Asia/Ho_Chi_Minh'.

## 2. Schema Testing

### 2.1 Kiem tra ton tai bang va cot

- Muc tieu: dam bao tat ca bang va cot ton tai dung nhu DDL.
- Lenh kiem tra (PostgreSQL):

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### 2.2 Kiem tra rang buoc NOT NULL va UNIQUE

- USERS.email NOT NULL + UNIQUE
- MEMBERS.member_code UNIQUE
- PACKAGES.package_code UNIQUE
- GYM_ROOMS.room_code UNIQUE

Test case mau:

```sql
-- NOT NULL
INSERT INTO users (email, password_hash, full_name, status)
VALUES (NULL, 'x', 'Test', 'active');

-- UNIQUE
INSERT INTO users (email, password_hash, full_name, status)
VALUES ('dup@example.com', 'x', 'A', 'active');
INSERT INTO users (email, password_hash, full_name, status)
VALUES ('dup@example.com', 'y', 'B', 'active');
```

Expected: cau lenh vi pham bi tu choi.

### 2.3 Kiem tra CHECK (neu can)

DDL hien tai chua co CHECK. Neu muon ngan gia tri am (price, session_limit) thi can CHECK.
Test ke hoach:

```sql
-- Ky vong that bai neu co CHECK; neu insert thanh cong thi ghi nhan gap
INSERT INTO packages (package_code, name, duration_days, session_limit, price, status)
VALUES ('PKG_NEG', 'Bad', 30, -1, -10000, 'active');
```

Expected: that bai neu co CHECK. Neu pass: ghi nhan thieu rang buoc.

### 2.4 Kiem tra khoa ngoai (FK)

- Khong cho phep tao ban ghi tham chieu khong ton tai.
- Khong cho phep xoa HLV neu dang co lich tap.

Test case mau:

```sql
-- FK insert
INSERT INTO subscriptions (member_id, package_id, start_date, end_date, remaining_sessions)
VALUES (999999, 999999, '2026-01-01', '2026-02-01', 10);

-- FK delete
-- Tao staff va training_session truoc, sau do thu xoa staff
DELETE FROM staff WHERE staff_id = 1;
```

Expected: insert/delete bi tu choi boi FK.

### 2.5 Kiem tra kieu du lieu

- Ngay thang: DATE/TIMESTAMP dung kieu.
- ID: BIGINT IDENTITY (hoac UUID neu schema sau nay doi).

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('user_id','member_id','start_date','end_date','paid_at');
```

Expected: kieu du lieu khop DDL.

## 3. Data Integrity va CRUD

### 3.1 Seeding

Muc tieu: 100-500 ban ghi cho bang chinh (members, packages).
Thu tu seeding de dam bao FK:

1. users
2. members, staff
3. groups, permissions, user_groups, group_permissions
4. packages
5. subscriptions
6. payments
7. gym_rooms
8. equipment
9. maintenance_logs
10. training_sessions
11. attendance_logs
12. member_progress
13. feedback
14. notifications
15. staff_schedules

Cong cu: Node faker. Neu khong su dung script, co the dung generate_series + random trong SQL.

### 3.2 CRUD

- Create: them member, package, subscription, payment, equipment.
- Read: tim member theo ten, member_code, phone.
- Update: doi status package tu Active sang Expired.
- Delete: thu xoa package dang co subscription (FK phai chan).

Vi du truy van Read:

```sql
SELECT m.member_id, u.full_name, u.phone, m.member_code
FROM members m
JOIN users u ON u.user_id = m.user_id
WHERE u.full_name ILIKE '%An%';
```

Vi du Update:

```sql
UPDATE packages
SET status = 'expired'
WHERE package_code = 'PKG001';
```

Expected: du lieu cap nhat dung va khong bi FK/constraint loi.

## 4. Business Rule Testing

### 4.1 Logic thoi gian het han

- Tao package voi duration_days: 30, 90, 365.
- Tao subscription start_date = '2026-01-01'.
- Kiem tra end_date = start_date + duration_days.

```sql
SELECT subscription_id, start_date, end_date
FROM subscriptions
WHERE subscription_id = :id;
```

Expected: end_date dung theo so ngay. Neu logic tinh ngay duoc xu ly o ung dung, can doi chieu ket qua khi ghi xuong DB.

### 4.2 Logic check-in

- Tao subscription da het han (end_date < CURRENT_DATE).
- Thu ghi nhan attendance_log.

Expected: neu co quy tac chan o DB (trigger/constraint), insert bi tu choi. Neu DB cho phep, ghi nhan la can thuc thi rule o ung dung hoac them trigger.

### 4.3 Trang thai thanh toan va kich hoat

- Dat payment.status = 'paid'.
- Kiem tra subscription duoc kich hoat (neu co cot status/activated_at). DDL hien tai chua co cot nay.

Expected: neu logic nam o ung dung, test o tang ung dung. Neu can enforce tai DB, can bo sung cot + trigger.

## 5. Performance va Security

### 5.1 Indexing

- Kiem tra index tu UNIQUE (users.email, users.phone, members.member_code, packages.package_code).
- Do hieu nang truy van theo phone/member_code:

```sql
EXPLAIN ANALYZE
SELECT m.member_id, u.full_name
FROM members m
JOIN users u ON u.user_id = m.user_id
WHERE u.phone = '0987654321';
```

Neu thoi gian cao, xem xet them index bo sung.

### 5.2 Concurrency

- Mo 2 session:
  - T1: BEGIN; SELECT ... FOR UPDATE tren members.
  - T2: UPDATE members cung row.
- Kiem tra block/timeout hoac lost update tuy isolation level.

Expected: he thong khong bi mat cap nhat (lost update).

## 6. Deliverables

- Test case matrix (ID, muc tieu, SQL, expected, actual).
- Script setup/teardown cho test DB.
- Bao cao ket qua theo tung nhom test o tren.
