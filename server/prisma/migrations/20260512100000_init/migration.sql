-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'locked');

-- CreateEnum
CREATE TYPE "package_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cash', 'bank_card', 'ewallet');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "equipment_status" AS ENUM ('active', 'broken', 'repairing', 'retired');

-- CreateEnum
CREATE TYPE "maintenance_status" AS ENUM ('reported', 'repairing', 'resolved', 'failed');

-- CreateEnum
CREATE TYPE "feedback_type" AS ENUM ('staff', 'equipment', 'service');

-- CreateEnum
CREATE TYPE "feedback_severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "feedback_status" AS ENUM ('open', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "attendance_method" AS ENUM ('realtime', 'manual', 'qr');

-- CreateEnum
CREATE TYPE "staff_shift" AS ENUM ('morning', 'afternoon', 'evening');

-- CreateTable
CREATE TABLE "users" (
    "user_id" BIGSERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "status" "user_status" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "members" (
    "member_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "member_code" VARCHAR(30) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "address" VARCHAR(200),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "staff" (
    "staff_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "staff_code" VARCHAR(30) NOT NULL,
    "position" VARCHAR(50) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("staff_id")
);

-- CreateTable
CREATE TABLE "groups" (
    "group_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "groups_pkey" PRIMARY KEY ("group_id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "permission_id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "user_id" BIGINT NOT NULL,
    "group_id" BIGINT NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("user_id","group_id")
);

-- CreateTable
CREATE TABLE "group_permissions" (
    "group_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,

    CONSTRAINT "group_permissions_pkey" PRIMARY KEY ("group_id","permission_id")
);

-- CreateTable
CREATE TABLE "packages" (
    "package_id" BIGSERIAL NOT NULL,
    "package_code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "session_limit" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "benefits" VARCHAR(255),
    "status" "package_status" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("package_id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "subscription_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "package_id" BIGINT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "remaining_sessions" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "subscription_id" BIGINT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "payment_method" NOT NULL,
    "status" "payment_status" NOT NULL,
    "transaction_reference" VARCHAR(100),
    "paid_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "gym_rooms" (
    "room_id" BIGSERIAL NOT NULL,
    "room_code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "room_type" VARCHAR(50),
    "capacity" INTEGER NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "gym_rooms_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "equipment_id" BIGSERIAL NOT NULL,
    "room_id" BIGINT NOT NULL,
    "equipment_code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "import_date" DATE NOT NULL,
    "warranty_until" DATE,
    "status" "equipment_status" NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("equipment_id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "maintenance_id" BIGSERIAL NOT NULL,
    "equipment_id" BIGINT NOT NULL,
    "reported_by_staff_id" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "maintenance_status" NOT NULL,
    "reported_at" TIMESTAMP(6) NOT NULL,
    "resolved_at" TIMESTAMP(6),

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("maintenance_id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "session_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "trainer_staff_id" BIGINT NOT NULL,
    "room_id" BIGINT NOT NULL,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "attendance_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "subscription_id" BIGINT NOT NULL,
    "session_id" BIGINT,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6),
    "method" "attendance_method",

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "member_progress" (
    "progress_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "staff_id" BIGINT NOT NULL,
    "weight" DECIMAL(6,2),
    "bmi" DECIMAL(5,2),
    "goal" VARCHAR(255),
    "notes" TEXT,
    "recorded_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "member_progress_pkey" PRIMARY KEY ("progress_id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "feedback_id" BIGSERIAL NOT NULL,
    "member_id" BIGINT NOT NULL,
    "feedback_type" "feedback_type" NOT NULL,
    "content" TEXT NOT NULL,
    "severity" "feedback_severity",
    "status" "feedback_status",
    "handled_by_staff_id" BIGINT,
    "handled_at" TIMESTAMP(6),
    "subject_staff_id" BIGINT,
    "subject_equipment_id" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(6) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "staff_schedules" (
    "schedule_id" BIGSERIAL NOT NULL,
    "staff_id" BIGINT NOT NULL,
    "shift" "staff_shift" NOT NULL,
    "work_date" DATE NOT NULL,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_code_key" ON "members"("member_code");

-- CreateIndex
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staff_code_key" ON "staff"("staff_code");

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "packages_package_code_key" ON "packages"("package_code");

-- CreateIndex
CREATE UNIQUE INDEX "gym_rooms_room_code_key" ON "gym_rooms"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_equipment_code_key" ON "equipment"("equipment_code");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_permissions" ADD CONSTRAINT "group_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("group_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_permissions" ADD CONSTRAINT "group_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("permission_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("package_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "gym_rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("equipment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_reported_by_staff_id_fkey" FOREIGN KEY ("reported_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_trainer_staff_id_fkey" FOREIGN KEY ("trainer_staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "gym_rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("subscription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions"("session_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_progress" ADD CONSTRAINT "member_progress_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_progress" ADD CONSTRAINT "member_progress_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_handled_by_staff_id_fkey" FOREIGN KEY ("handled_by_staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_subject_staff_id_fkey" FOREIGN KEY ("subject_staff_id") REFERENCES "staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_subject_equipment_id_fkey" FOREIGN KEY ("subject_equipment_id") REFERENCES "equipment"("equipment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("staff_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint: feedback subject phai khop voi feedback_type
ALTER TABLE "feedback" ADD CONSTRAINT "chk_feedback_subject" CHECK (
    (feedback_type = 'staff'     AND subject_staff_id IS NOT NULL AND subject_equipment_id IS NULL)
 OR (feedback_type = 'equipment' AND subject_equipment_id IS NOT NULL AND subject_staff_id IS NULL)
 OR (feedback_type = 'service'   AND subject_staff_id IS NULL AND subject_equipment_id IS NULL)
);

