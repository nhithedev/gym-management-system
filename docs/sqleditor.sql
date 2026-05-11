-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =========================
-- USERS
-- =========================

create table users (
    id uuid primary key default gen_random_uuid(),

    email varchar(255) unique not null,
    password_hash text not null,

    full_name varchar(100) not null,
    phone varchar(20) unique,

    status varchar(20) default 'active',

    created_at timestamp default now(),
    updated_at timestamp
);

-- =========================
-- MEMBERS
-- =========================

create table members (
    id uuid primary key default gen_random_uuid(),

    user_id uuid unique references users(id) on delete cascade,

    member_code varchar(30) unique not null,

    date_of_birth date,
    address text,

    fingerprint_data text,

    created_at timestamp default now()
);

-- =========================
-- STAFF
-- =========================

create table staff (
    id uuid primary key default gen_random_uuid(),

    user_id uuid unique references users(id) on delete cascade,

    staff_code varchar(30) unique not null,

    position varchar(50),

    hire_date date,

    status varchar(20) default 'active'
);

-- =========================
-- PACKAGES
-- =========================

create table packages (
    id uuid primary key default gen_random_uuid(),

    name varchar(100) unique not null,

    duration_days int not null,

    session_limit int,

    price decimal(12,2) not null,

    description text,

    is_active boolean default true
);

-- =========================
-- SUBSCRIPTIONS
-- =========================

create table subscriptions (
    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete set null,

    package_id uuid references packages(id) on delete set null,

    start_date date not null,
    end_date date not null,

    remaining_sessions int,

    status varchar(20) default 'active',

    created_at timestamp default now()
);

-- =========================
-- PAYMENTS
-- =========================

create table payments (
    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete set null,

    subscription_id uuid references subscriptions(id) on delete set null,

    amount decimal(12,2) not null,

    method varchar(30) not null,

    status varchar(20) not null,

    paid_at timestamp,

    note text
);

-- =========================
-- GYM ROOMS
-- =========================

create table gym_rooms (
    id uuid primary key default gen_random_uuid(),

    room_code varchar(30) unique not null,

    name varchar(100) not null,

    room_type varchar(50),

    capacity int,

    status varchar(20) default 'active'
);

-- =========================
-- EQUIPMENT
-- =========================

create table equipment (
    id uuid primary key default gen_random_uuid(),

    room_id uuid references gym_rooms(id) on delete set null,

    equipment_code varchar(30) unique not null,

    name varchar(100) not null,

    origin varchar(100),

    import_date date,

    warranty_until date,

    status varchar(30) default 'active'
);

-- =========================
-- MAINTENANCE LOGS
-- =========================

create table maintenance_logs (
    id uuid primary key default gen_random_uuid(),

    equipment_id uuid references equipment(id) on delete set null,

    reported_by uuid references staff(id) on delete set null,

    description text not null,

    status varchar(30) default 'reported',

    reported_at timestamp default now(),

    completed_at timestamp
);

-- =========================
-- TRAINING SESSIONS
-- =========================

create table training_sessions (
    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete set null,

    trainer_id uuid references staff(id) on delete set null,

    room_id uuid references gym_rooms(id) on delete set null,

    start_time timestamp not null,

    end_time timestamp not null,

    status varchar(20) default 'scheduled'
);

-- =========================
-- ATTENDANCE LOGS
-- =========================

create table attendance_logs (
    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete set null,

    subscription_id uuid references subscriptions(id) on delete set null,

    session_id uuid references training_sessions(id) on delete set null,

    checkin_time timestamp,

    checkout_time timestamp,

    method varchar(30),

    note text
);

-- =========================
-- MEMBER PROGRESS
-- =========================

create table member_progress (
    id uuid primary key default gen_random_uuid(),

    member_id uuid references members(id) on delete set null,

    weight decimal(5,2),

    height decimal(5,2),

    bmi decimal(5,2),

    goal text,

    trainer_comment text,

    recorded_at timestamp default now()
);

-- =========================
-- FEEDBACKS
-- =========================

create table feedbacks (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id) on delete set null,

    target_type varchar(30) not null,

    rating int,

    content text not null,

    status varchar(20) default 'pending',

    created_at timestamp default now(),

    resolved_by uuid references staff(id) on delete set null,

    resolved_at timestamp
);

-- =========================
-- NOTIFICATIONS
-- =========================

create table notifications (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references users(id) on delete cascade,

    title varchar(255) not null,

    content text not null,

    is_read boolean default false,

    created_at timestamp default now()
);