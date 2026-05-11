-- Migration 001: Initial schema
-- Run with: npm run db:migrate

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Roles & Users ────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('owner', 'staff', 'trainer', 'member');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(50) NOT NULL,
  last_name     VARCHAR(50) NOT NULL,
  phone         VARCHAR(10) UNIQUE NOT NULL,
  role          user_role NOT NULL DEFAULT 'member',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Member-specific fields
CREATE TABLE members (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  member_code      VARCHAR(20) UNIQUE NOT NULL,
  date_of_birth    DATE NOT NULL,
  hometown         VARCHAR(100),
  fingerprint_data BYTEA
);

-- ─── Permission groups (RBAC) ─────────────────────────────────
CREATE TABLE permission_groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_groups (
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES permission_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE group_permissions (
  group_id        UUID REFERENCES permission_groups(id) ON DELETE CASCADE,
  permission_code VARCHAR(100) NOT NULL,
  PRIMARY KEY (group_id, permission_code)
);

-- ─── Packages ─────────────────────────────────────────────────
CREATE TABLE packages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(100) UNIQUE NOT NULL,
  duration_days  INT NOT NULL,
  session_count  INT NOT NULL,
  price          NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  benefits       TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE member_packages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id          UUID NOT NULL REFERENCES users(id),
  package_id         UUID NOT NULL REFERENCES packages(id),
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  sessions_remaining INT NOT NULL,
  is_paid            BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method     VARCHAR(20) CHECK (payment_method IN ('cash','card','ewallet')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Rooms & Equipment ────────────────────────────────────────
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(20) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  capacity    INT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE equipment_status AS ENUM ('active','broken','repairing','inactive');

CREATE TABLE equipment (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 VARCHAR(20) UNIQUE NOT NULL,
  name                 VARCHAR(100) NOT NULL,
  room_id              UUID REFERENCES rooms(id) ON DELETE SET NULL,
  purchase_date        DATE NOT NULL,
  warranty_date        DATE,
  status               equipment_status NOT NULL DEFAULT 'active',
  last_maintenance_at  DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  reported_by  UUID NOT NULL REFERENCES users(id),
  issue_desc   TEXT NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES users(id),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Training sessions & Progress ─────────────────────────────
CREATE TABLE training_sessions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id  UUID NOT NULL REFERENCES users(id),
  trainer_id UUID REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ,
  notes      TEXT
);

CREATE TABLE progress_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id     UUID NOT NULL REFERENCES users(id),
  trainer_id    UUID NOT NULL REFERENCES users(id),
  weight        NUMERIC(5,2),
  bmi           NUMERIC(5,2),
  goal          TEXT,
  trainer_note  TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Feedback ─────────────────────────────────────────────────
CREATE TYPE feedback_category AS ENUM ('staff','equipment','service');
CREATE TYPE feedback_status   AS ENUM ('pending','processing','resolved');

CREATE TABLE feedbacks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id     UUID NOT NULL REFERENCES users(id),
  category      feedback_category NOT NULL,
  content       TEXT NOT NULL,
  status        feedback_status NOT NULL DEFAULT 'pending',
  resolved_note TEXT,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── OTP for password reset ───────────────────────────────────
CREATE TABLE otp_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_phone    ON users(phone);
CREATE INDEX idx_mp_member      ON member_packages(member_id);
CREATE INDEX idx_ts_member      ON training_sessions(member_id);
CREATE INDEX idx_ts_start       ON training_sessions(start_time);
CREATE INDEX idx_feedback_status ON feedbacks(status);
