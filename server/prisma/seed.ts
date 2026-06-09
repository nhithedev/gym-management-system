/**
 * Seed RBAC + user/staff/member mau cho dev (theo SRS / Database.md).
 *
 * 4 ROLES (theo SRS_VI.md muc 2.1):
 *   owner   = Chu phong tap
 *   staff   = Nhan vien quan ly
 *   trainer = Huan luyen vien (PT)
 *   member  = Hoi vien
 *
 * Chay: `npm run prisma:seed` (hoac `npx prisma db seed`).
 * Script tu xoa toan bo du lieu 7 bang RBAC/profile truoc khi insert lai
 * de luon o trang thai sach (idempotent).
 */

import {
  PrismaClient,
  UserStatus,
  ExerciseCategory,
  PackageStatus,
  EquipmentStatus,
  MaintenanceStatus,
  SubscriptionStatus,
  PaymentMethod,
  PaymentStatus,
  FeedbackType,
  FeedbackSeverity,
  FeedbackStatus,
  AttendanceMethod,
  StaffShift,
  TrainingSessionStatus,
  WorkoutPlanStatus,
  PlanCreatorType,
  WorkoutAssignmentStatus,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const SEED_PASSWORD = 'Password123!'

const PERMISSIONS = [
  // Quan ly tai khoan & phan quyen (Quy trinh 2.4.6)
  { code: 'user.read',           name: 'Xem tai khoan',         description: 'Xem danh sach va chi tiet tai khoan he thong' },
  { code: 'user.create',         name: 'Tao tai khoan',         description: 'Tao tai khoan moi (kem dang ky ho so)' },
  { code: 'user.update',         name: 'Cap nhat tai khoan',    description: 'Sua thong tin / khoa / mo khoa tai khoan' },
  { code: 'user.delete',         name: 'Xoa tai khoan',         description: 'Xoa tai khoan khoi he thong' },
  { code: 'rbac.manage',         name: 'Quan ly phan quyen',    description: 'Tao/sua/xoa nhom, gan quyen va gan user vao nhom (2.4.6)' },
  // Hoi vien (UC03)
  { code: 'member.read',         name: 'Xem hoi vien',          description: 'Xem ho so hoi vien' },
  { code: 'member.create',       name: 'Tao hoi vien',          description: 'Dang ky hoi vien moi (UC03)' },
  { code: 'member.update',       name: 'Cap nhat hoi vien',     description: 'Sua ho so hoi vien' },
  { code: 'member.delete',       name: 'Xoa hoi vien',          description: 'Xoa ho so hoi vien' },
  // Nhan su / PT (UC11)
  { code: 'staff.read',          name: 'Xem nhan su',           description: 'Xem danh sach nhan su / PT' },
  { code: 'staff.create',        name: 'Tao nhan su',           description: 'Them nhan su / PT moi (UC11)' },
  { code: 'staff.update',        name: 'Cap nhat nhan su',      description: 'Sua ho so nhan su (UC11)' },
  { code: 'staff.delete',        name: 'Xoa nhan su',           description: 'Xoa nhan su (UC11)' },
  // Goi tap & dang ky (UC04, UC10)
  { code: 'package.read',        name: 'Xem goi tap',           description: 'Xem danh muc goi tap' },
  { code: 'package.manage',      name: 'Quan ly goi tap',       description: 'Tao / sua / ngung kinh doanh goi tap (UC10)' },
  { code: 'subscription.read',   name: 'Xem dang ky goi',       description: 'Xem cac luot dang ky cua hoi vien' },
  { code: 'subscription.create', name: 'Tao dang ky goi',       description: 'Ban / gia han goi cho hoi vien (UC03, UC04)' },
  { code: 'subscription.cancel', name: 'Huy dang ky goi',       description: 'Huy goi tap dang active/pending (UC04B)' },
  // Thanh toan (UC03, UC04)
  { code: 'payment.read',        name: 'Xem thanh toan',        description: 'Xem lich su giao dich' },
  { code: 'payment.create',      name: 'Tao giao dich',         description: 'Ghi nhan thanh toan (UC03, UC04)' },
  { code: 'payment.refund',      name: 'Hoan tien',             description: 'Thuc hien hoan tien giao dich' },
  // Phong tap, thiet bi, bao tri (UC08, UC09)
  { code: 'room.manage',         name: 'Quan ly phong tap',     description: 'Tao / sua / xoa phong tap (UC08)' },
  { code: 'equipment.manage',    name: 'Quan ly thiet bi',      description: 'Quan ly danh muc thiet bi (UC09)' },
  { code: 'maintenance.read',    name: 'Xem nhat ky bao tri',   description: 'Xem cac phieu bao tri' },
  { code: 'maintenance.report',  name: 'Bao loi thiet bi',      description: 'Tao phieu bao tri / bao loi (UC09)' },
  { code: 'maintenance.resolve', name: 'Xu ly bao tri',         description: 'Cap nhat ket qua xu ly phieu bao tri (UC09)' },
  // Lich tap / cham cong / tien do (UC05, UC06)
  { code: 'session.read',        name: 'Xem lich tap',          description: 'Xem lich tap voi PT (UC05)' },
  { code: 'session.manage',      name: 'Quan ly lich tap',      description: 'Tao / sua / huy lich tap (UC05)' },
  { code: 'attendance.read',     name: 'Xem cham cong',         description: 'Xem nhat ky check-in / ghi nhan tu dong' },
  { code: 'attendance.checkin',  name: 'Check-in hoi vien',     description: 'Ghi nhan check-in / check-out (UC05 fallback)' },
  { code: 'progress.read',       name: 'Xem tien do tap',       description: 'Xem chi so tien do hoi vien (UC06)' },
  { code: 'progress.record',     name: 'Ghi nhan tien do',      description: 'Ghi chi so BMI / can nang / muc tieu (UC06)' },
  // Phan hoi & thong bao (UC07, 2.4.5)
  { code: 'feedback.read',       name: 'Xem phan hoi',          description: 'Xem phan hoi cua hoi vien' },
  { code: 'feedback.create',     name: 'Gui phan hoi',          description: 'Hoi vien / nhan vien tai quay gui phan hoi (UC07)' },
  { code: 'feedback.handle',     name: 'Xu ly phan hoi',        description: 'Tiep nhan / phan loai / xu ly phan hoi (2.4.5)' },
  // V1.0 da bo notification feature (xem Database.md). Re-add khi UC14 phuc hoi o v1.1+.
  // Lich lam viec & bao cao (UC11, UC12)
  { code: 'schedule.read',       name: 'Xem lich lam viec',     description: 'Xem lich ca lam cua nhan su' },
  { code: 'schedule.manage',     name: 'Quan ly lich lam viec', description: 'Phan ca cho nhan su (UC11)' },
  { code: 'report.view',         name: 'Xem bao cao',           description: 'Xem cac bao cao thong ke (UC12)' },
  // Workout plan & log (UC05A, UC06A, UC06B)
  { code: 'exercise.read',       name: 'Xem danh sach bai tap', description: 'Xem exercise library' },
  { code: 'exercise.create',     name: 'Tao bai tap',           description: 'Them exercise vao library' },
  { code: 'exercise.update',     name: 'Cap nhat bai tap',      description: 'Sua thong tin exercise' },
  { code: 'exercise.delete',     name: 'Xoa bai tap',           description: 'Soft delete exercise' },
  { code: 'workout_plan.create', name: 'Tao workout plan',      description: 'Tao plan template moi' },
  { code: 'workout_plan.update', name: 'Cap nhat workout plan', description: 'Sua plan template' },
  { code: 'workout_plan.delete', name: 'Xoa workout plan',      description: 'Soft delete plan template' },
  { code: 'workout_plan.assign', name: 'Giao plan cho member',  description: 'Assign plan cho member (UC05A)' },
  { code: 'workout_log.create',  name: 'Ghi buoi tap',          description: 'Member log workout session (UC06A)' },
  { code: 'workout_log.read',    name: 'Xem lich su tap',       description: 'Xem workout history' },
  { code: 'workout_log.update',  name: 'Sua buoi tap',          description: 'Sua workout log trong 24h' },
] as const

const GROUPS = [
  {
    name: 'owner',
    description:
      'Chu phong tap: quyen cao nhat. Quan ly tong the hoat dong kinh doanh, nhan su, ' +
      'gioi han quyen he thong va xem bao cao (UC11, UC12, Quy trinh 2.4.6).',
  },
  {
    name: 'staff',
    description:
      'Nhan vien quan ly: thuc hien nghiep vu hanh chinh - dang ky hoi vien, gia han goi tap, ' +
      'quan ly phong tap/thiet bi, tiep nhan va xu ly phan hoi (UC03, UC04, UC07-UC10).',
  },
  {
    name: 'trainer',
    description:
      'Huan luyen vien (PT): quan ly danh sach hoc vien, lap giao an, theo doi va danh gia ' +
      'tien do tap luyen (UC05, UC06).',
  },
  {
    name: 'member',
    description:
      'Hoi vien: su dung dich vu - theo doi goi tap, lich tap, tien do va gui phan hoi ' +
      '(UC04 tu gia han, UC05, UC06 xem ket qua, UC07).',
  },
] as const

/** Permission codes mapped to each role. */
const ROLE_PERMISSIONS: Record<(typeof GROUPS)[number]['name'], string[]> = {
  owner: PERMISSIONS.map((p) => p.code), // toan quyen
  staff: [
    'user.read', 'user.create', 'user.update',
    'member.read', 'member.create', 'member.update', 'member.delete',
    'staff.read',
    'package.read', 'package.manage',
    'subscription.read', 'subscription.create', 'subscription.cancel',
    'payment.read', 'payment.create', 'payment.refund',
    'room.manage',
    'equipment.manage',
    'maintenance.read', 'maintenance.report', 'maintenance.resolve',
    'session.read',
    'attendance.read', 'attendance.checkin',
    'progress.read',
    'feedback.read', 'feedback.create', 'feedback.handle',
    'schedule.read',
    'exercise.read', 'exercise.create', 'exercise.update', 'exercise.delete',
    'workout_plan.assign', 'workout_log.read',
  ],
  trainer: [
    'member.read',
    'package.read',
    'subscription.read',
    'maintenance.read', 'maintenance.report',
    'session.read', 'session.manage',
    'attendance.read', 'attendance.checkin',
    'progress.read', 'progress.record',
    'feedback.read',
    'schedule.read',
    'exercise.read', 'exercise.create', 'exercise.update',
    'workout_plan.create', 'workout_plan.update', 'workout_plan.delete', 'workout_plan.assign',
    'workout_log.read',
  ],
  member: [
    'package.read',
    'subscription.read', 'subscription.create', 'subscription.cancel',
    'payment.read', 'payment.create',
    'session.read',
    'attendance.read',
    'progress.read',
    'feedback.read', 'feedback.create',
    'exercise.read',
    'workout_plan.create', 'workout_plan.update', 'workout_plan.delete',
    'workout_log.create', 'workout_log.read', 'workout_log.update',
  ],
}

interface SeedUser {
  email: string
  phone: string
  fullName: string
  status: UserStatus
  createdAt: Date
  role: (typeof GROUPS)[number]['name']
  staff?: { staffCode: string; position: string }
  member?: { memberCode: string; dateOfBirth: Date; address: string }
}

const USERS: SeedUser[] = [
  {
    email: 'owner@gym.local', phone: '0900000001', fullName: 'Pham Quoc Hung',
    status: UserStatus.active, createdAt: new Date('2026-01-01T08:00:00'),
    role: 'owner',
    staff: { staffCode: 'STF-OWN-001', position: 'owner' },
  },
  {
    email: 'staff.linh@gym.local', phone: '0900000002', fullName: 'Nguyen Thi Linh',
    status: UserStatus.active, createdAt: new Date('2026-01-02T08:00:00'),
    role: 'staff',
    staff: { staffCode: 'STF-STA-001', position: 'staff' },
  },
  {
    email: 'trainer.minh@gym.local', phone: '0900000003', fullName: 'Tran Quang Minh',
    status: UserStatus.active, createdAt: new Date('2026-01-03T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-001', position: 'trainer' },
  },
  {
    email: 'trainer.huong@gym.local', phone: '0900000004', fullName: 'Le Thi Huong',
    status: UserStatus.active, createdAt: new Date('2026-01-04T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-002', position: 'trainer' },
  },
  {
    email: 'nguyen.van.a@email.com', phone: '0911000001', fullName: 'Nguyen Van A',
    status: UserStatus.active, createdAt: new Date('2026-02-01T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0001', dateOfBirth: new Date('1995-04-12'), address: '12 Le Loi, Q.1, TP.HCM' },
  },
  {
    email: 'tran.thi.b@email.com', phone: '0911000002', fullName: 'Tran Thi B',
    status: UserStatus.active, createdAt: new Date('2026-02-02T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0002', dateOfBirth: new Date('1998-09-23'), address: '45 Nguyen Hue, Q.1, TP.HCM' },
  },
  {
    email: 'le.van.c@email.com', phone: '0911000003', fullName: 'Le Van C',
    status: UserStatus.active, createdAt: new Date('2026-02-03T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0003', dateOfBirth: new Date('1990-01-30'), address: '88 Cach Mang Thang 8, Q.3, HCM' },
  },
  {
    email: 'pham.thi.d@email.com', phone: '0911000004', fullName: 'Pham Thi D',
    status: UserStatus.active, createdAt: new Date('2026-02-04T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0004', dateOfBirth: new Date('2001-07-15'), address: '21 Pasteur, Q.3, TP.HCM' },
  },
  {
    email: 'hoang.van.e@email.com', phone: '0911000005', fullName: 'Hoang Van E',
    status: UserStatus.active, createdAt: new Date('2026-02-05T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0005', dateOfBirth: new Date('1993-12-05'), address: '7 Tran Hung Dao, Q.5, TP.HCM' },
  },
  {
    email: 'vu.thi.f@email.com', phone: '0911000006', fullName: 'Vu Thi F',
    status: UserStatus.locked, createdAt: new Date('2026-02-06T09:30:00'),
    role: 'member',
    member: { memberCode: 'MB-2026-0006', dateOfBirth: new Date('1996-06-18'), address: '102 Vo Van Tan, Q.3, TP.HCM' },
  },
]

async function reset(): Promise<void> {
  // Xoa theo thu tu dependency: leaf tables truoc, parent tables sau
  await prisma.$transaction([
    // Workout leaf tables
    prisma.workoutLogSet.deleteMany(),
    prisma.workoutLog.deleteMany(),
    prisma.workoutPlanExercise.deleteMany(),
    prisma.workoutPlanDay.deleteMany(),
    prisma.memberWorkoutPlan.deleteMany(),
    prisma.workoutPlan.deleteMany(),
    prisma.exercise.deleteMany(),
    // Subscription/payment
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    // Cac bang phu thuoc member/staff khac
    prisma.attendanceLog.deleteMany(),
    prisma.memberProgress.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.trainingSession.deleteMany(),
    prisma.staffSchedule.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.auditLog.deleteMany(),
    // RBAC + profile
    prisma.groupPermission.deleteMany(),
    prisma.userGroup.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.group.deleteMany(),
    prisma.member.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

async function seedPermissions(): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>()
  for (const p of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description },
      create: p,
    })
    map.set(row.code, row.permissionId)
  }
  return map
}

async function seedGroups(
  permissionMap: Map<string, bigint>,
): Promise<Map<string, bigint>> {
  const groupMap = new Map<string, bigint>()
  for (const g of GROUPS) {
    const row = await prisma.group.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: g,
    })
    groupMap.set(g.name, row.groupId)

    // Reset & re-gan permissions cho group
    await prisma.groupPermission.deleteMany({ where: { groupId: row.groupId } })
    const permCodes = ROLE_PERMISSIONS[g.name]
    if (permCodes.length > 0) {
      await prisma.groupPermission.createMany({
        data: permCodes.map((code) => {
          const permissionId = permissionMap.get(code)
          if (permissionId === undefined) {
            throw new Error(`Permission code khong ton tai: ${code}`)
          }
          return { groupId: row.groupId, permissionId }
        }),
        skipDuplicates: true,
      })
    }
  }
  return groupMap
}

async function seedUsers(groupMap: Map<string, bigint>): Promise<void> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  for (const u of USERS) {
    const userRow = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        passwordHash,
      },
      create: {
        email: u.email,
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        passwordHash,
        createdAt: u.createdAt,
      },
    })

    if (u.staff) {
      await prisma.staff.upsert({
        where: { staffCode: u.staff.staffCode },
        update: { userId: userRow.userId, position: u.staff.position },
        create: {
          userId: userRow.userId,
          staffCode: u.staff.staffCode,
          position: u.staff.position,
        },
      })
    }

    if (u.member) {
      await prisma.member.upsert({
        where: { memberCode: u.member.memberCode },
        update: {
          userId: userRow.userId,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
        },
        create: {
          userId: userRow.userId,
          memberCode: u.member.memberCode,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
          createdAt: u.createdAt,
        },
      })
    }

    const groupId = groupMap.get(u.role)
    if (groupId === undefined) {
      throw new Error(`Group khong ton tai: ${u.role}`)
    }
    await prisma.userGroup.upsert({
      where: { userId_groupId: { userId: userRow.userId, groupId } },
      update: {},
      create: { userId: userRow.userId, groupId },
    })
  }
}

async function seedExercises(): Promise<void> {
  if (await prisma.exercise.count() > 0) return

  const defaults: { name: string; category: ExerciseCategory; muscleGroup: string | null }[] = [
    { name: 'Squat',              category: ExerciseCategory.strength,    muscleGroup: 'legs' },
    { name: 'Deadlift',           category: ExerciseCategory.strength,    muscleGroup: 'back,legs' },
    { name: 'Bench Press',        category: ExerciseCategory.strength,    muscleGroup: 'chest' },
    { name: 'Overhead Press',     category: ExerciseCategory.strength,    muscleGroup: 'shoulders' },
    { name: 'Barbell Row',        category: ExerciseCategory.strength,    muscleGroup: 'back' },
    { name: 'Pull-up',            category: ExerciseCategory.strength,    muscleGroup: 'back,biceps' },
    { name: 'Push-up',            category: ExerciseCategory.strength,    muscleGroup: 'chest,triceps' },
    { name: 'Lunge',              category: ExerciseCategory.strength,    muscleGroup: 'legs' },
    { name: 'Treadmill Run',      category: ExerciseCategory.cardio,      muscleGroup: null },
    { name: 'Jump Rope',          category: ExerciseCategory.cardio,      muscleGroup: null },
    { name: 'Cycling',            category: ExerciseCategory.cardio,      muscleGroup: null },
    { name: 'Hip Flexor Stretch', category: ExerciseCategory.flexibility, muscleGroup: 'hips' },
    { name: 'Hamstring Stretch',  category: ExerciseCategory.flexibility, muscleGroup: 'legs' },
    { name: 'Shoulder Stretch',   category: ExerciseCategory.flexibility, muscleGroup: 'shoulders' },
    { name: 'Single-Leg Stand',   category: ExerciseCategory.balance,     muscleGroup: 'legs' },
    { name: 'Plank',              category: ExerciseCategory.balance,     muscleGroup: 'core' },
    { name: 'Bosu Ball Squat',    category: ExerciseCategory.balance,     muscleGroup: 'legs,core' },
    { name: 'Side Plank',         category: ExerciseCategory.balance,     muscleGroup: 'core' },
    { name: 'Bird Dog',           category: ExerciseCategory.balance,     muscleGroup: 'core,back' },
    { name: 'Dead Bug',           category: ExerciseCategory.balance,     muscleGroup: 'core' },
  ]

  await prisma.exercise.createMany({
    data: defaults.map((e) => ({
      name: e.name,
      category: e.category,
      muscleGroup: e.muscleGroup,
      createdByStaffId: null,
      deletedAt: null,
    })),
  })
  console.log('[seed] seeded 20 default exercises')
}

// ---------------------------------------------------------------------------
// MOCK DATA: Packages
// ---------------------------------------------------------------------------

const PACKAGES_DATA = [
  { packageCode: 'PKG-0001', name: 'Goi Co Ban 1 Thang',     durationDays: 30,  price: 500000,  benefits: 'Tap tu do tat ca may, phong va gio mo cua',                     status: PackageStatus.active   },
  { packageCode: 'PKG-0002', name: 'Goi Tieu Chuan 3 Thang', durationDays: 90,  price: 1200000, benefits: 'Tap tu do + 1 buoi tham van PT + tu giu do ca nhan',             status: PackageStatus.active   },
  { packageCode: 'PKG-0003', name: 'Goi Cao Cap 6 Thang',    durationDays: 180, price: 2000000, benefits: 'Tap tu do + 4 buoi PT mien phi + tu giu do + nuoc uong',         status: PackageStatus.active   },
  { packageCode: 'PKG-0004', name: 'Goi Premium 1 Nam',      durationDays: 365, price: 3500000, benefits: 'Tap tu do + 12 buoi PT + tu giu do + ao dong phuc + nuoc uong',  status: PackageStatus.active   },
  { packageCode: 'PKG-0005', name: 'Goi PT Ca Nhan 1 Thang', durationDays: 30,  price: 1500000, benefits: '8 buoi tap 1-1 voi PT ca nhan, phan tich co the mien phi',       status: PackageStatus.inactive },
]

// ---------------------------------------------------------------------------
// MOCK DATA: GymRooms + Equipment
// ---------------------------------------------------------------------------

const ROOMS_DATA = [
  { roomCode: 'ROOM-001', name: 'Phong Cardio',    roomType: 'cardio',       capacity: 30, description: 'May chay bo, xe dap tap, elliptical trainer' },
  { roomCode: 'ROOM-002', name: 'Phong Ta & May',  roomType: 'weights',      capacity: 20, description: 'Ta tu do, may tap co bap da chuc nang' },
  { roomCode: 'ROOM-003', name: 'Phong Yoga & PT', roomType: 'multipurpose', capacity: 15, description: 'Yoga, gian co va PT ca nhan 1-1' },
]

const EQUIPMENT_DATA: {
  roomCode: string; equipmentCode: string; name: string
  importDate: Date; warrantyUntil: Date | null; status: EquipmentStatus
}[] = [
  { roomCode: 'ROOM-001', equipmentCode: 'EQP-C001', name: 'May Chay Bo Life Fitness #1', importDate: new Date('2024-01-15'), warrantyUntil: new Date('2027-01-15'), status: EquipmentStatus.active    },
  { roomCode: 'ROOM-001', equipmentCode: 'EQP-C002', name: 'May Chay Bo Life Fitness #2', importDate: new Date('2024-01-15'), warrantyUntil: new Date('2027-01-15'), status: EquipmentStatus.active    },
  { roomCode: 'ROOM-001', equipmentCode: 'EQP-C003', name: 'Xe Dap Tap Technogym',        importDate: new Date('2024-03-10'), warrantyUntil: new Date('2027-03-10'), status: EquipmentStatus.active    },
  { roomCode: 'ROOM-002', equipmentCode: 'EQP-W001', name: 'Bo Ta Don 5-40kg',            importDate: new Date('2024-01-20'), warrantyUntil: null,                   status: EquipmentStatus.active    },
  { roomCode: 'ROOM-002', equipmentCode: 'EQP-W002', name: 'May Ep Nguc Life Fitness',    importDate: new Date('2023-06-01'), warrantyUntil: new Date('2026-06-01'), status: EquipmentStatus.repairing },
  { roomCode: 'ROOM-002', equipmentCode: 'EQP-W003', name: 'May Keo Cap Lat Pulldown',    importDate: new Date('2023-09-15'), warrantyUntil: new Date('2026-09-15'), status: EquipmentStatus.active    },
  { roomCode: 'ROOM-002', equipmentCode: 'EQP-W004', name: 'Ghe Tap Bung Bao Ve Lung',   importDate: new Date('2024-02-10'), warrantyUntil: null,                   status: EquipmentStatus.active    },
  { roomCode: 'ROOM-003', equipmentCode: 'EQP-Y001', name: 'Bo 15 Tham Yoga Manduka',    importDate: new Date('2024-02-01'), warrantyUntil: null,                   status: EquipmentStatus.active    },
  { roomCode: 'ROOM-003', equipmentCode: 'EQP-Y002', name: 'Bo Day Khang Luc Theraband', importDate: new Date('2024-02-01'), warrantyUntil: null,                   status: EquipmentStatus.active    },
]

// ---------------------------------------------------------------------------
// Seed functions: Packages / Rooms+Equipment / Subscriptions+Payments
// ---------------------------------------------------------------------------

async function seedPackages(): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>()
  for (const p of PACKAGES_DATA) {
    const row = await prisma.package.upsert({
      where:  { packageCode: p.packageCode },
      update: { name: p.name, durationDays: p.durationDays, price: p.price, benefits: p.benefits, status: p.status },
      create: { packageCode: p.packageCode, name: p.name, durationDays: p.durationDays, price: p.price, benefits: p.benefits, status: p.status },
    })
    map.set(p.packageCode, row.packageId)
  }
  console.log(`[seed] seeded ${PACKAGES_DATA.length} packages`)
  return map
}

async function seedRoomsAndEquipment(): Promise<{ roomMap: Map<string, bigint>; equipMap: Map<string, bigint> }> {
  const roomMap = new Map<string, bigint>()
  for (const r of ROOMS_DATA) {
    const row = await prisma.gymRoom.upsert({
      where:  { roomCode: r.roomCode },
      update: { name: r.name, roomType: r.roomType, capacity: r.capacity, description: r.description },
      create: r,
    })
    roomMap.set(r.roomCode, row.roomId)
  }

  const equipMap = new Map<string, bigint>()
  for (const e of EQUIPMENT_DATA) {
    const roomId = roomMap.get(e.roomCode)!
    const row = await prisma.equipment.upsert({
      where:  { equipmentCode: e.equipmentCode },
      update: { name: e.name, status: e.status },
      create: { roomId, equipmentCode: e.equipmentCode, name: e.name, importDate: e.importDate, warrantyUntil: e.warrantyUntil, status: e.status },
    })
    equipMap.set(e.equipmentCode, row.equipmentId)
  }

  // 1 maintenance log cho may ep nguc dang sua chua
  const staffLinh = await prisma.staff.findUnique({ where: { staffCode: 'STF-STA-001' } })
  if (staffLinh) {
    await prisma.maintenanceLog.deleteMany({ where: { equipmentId: equipMap.get('EQP-W002') } })
    await prisma.maintenanceLog.create({
      data: {
        equipmentId:       equipMap.get('EQP-W002')!,
        reportedByStaffId: staffLinh.staffId,
        description:       'May ep nguc bi tieng keu bat thuong, lo xo ben phai co dau hieu gian ra. Can kiem tra va thay the linh kien.',
        status:            MaintenanceStatus.repairing,
        reportedAt:        new Date('2026-05-20T09:00:00'),
      },
    })
  }

  console.log(`[seed] seeded ${ROOMS_DATA.length} rooms, ${EQUIPMENT_DATA.length} equipment, 1 maintenance log`)
  return { roomMap, equipMap }
}

async function seedSubscriptionsAndPayments(pkgMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where:  { memberCode: { in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0003', 'MB-2026-0004', 'MB-2026-0005', 'MB-2026-0006'] } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))

  type SubEntry = {
    memberCode: string; pkgCode: string
    startDate: Date; endDate: Date; status: SubscriptionStatus; cancelledAt?: Date
    payment?: { paidAt: Date; method: PaymentMethod; amount: number }
  }
  const subData: SubEntry[] = [
    { memberCode: 'MB-2026-0001', pkgCode: 'PKG-0002', startDate: new Date('2026-03-01'), endDate: new Date('2026-05-29'), status: SubscriptionStatus.active,    payment: { paidAt: new Date('2026-03-01T10:30:00'), method: PaymentMethod.cash,       amount: 1200000 } },
    { memberCode: 'MB-2026-0002', pkgCode: 'PKG-0001', startDate: new Date('2026-05-05'), endDate: new Date('2026-06-04'), status: SubscriptionStatus.active,    payment: { paidAt: new Date('2026-05-05T14:00:00'), method: PaymentMethod.bank_card, amount: 500000  } },
    { memberCode: 'MB-2026-0003', pkgCode: 'PKG-0003', startDate: new Date('2026-01-15'), endDate: new Date('2026-07-14'), status: SubscriptionStatus.active,    payment: { paidAt: new Date('2026-01-15T09:00:00'), method: PaymentMethod.ewallet,   amount: 2000000 } },
    { memberCode: 'MB-2026-0004', pkgCode: 'PKG-0001', startDate: new Date('2026-06-01'), endDate: new Date('2026-06-30'), status: SubscriptionStatus.pending },
    { memberCode: 'MB-2026-0005', pkgCode: 'PKG-0002', startDate: new Date('2025-11-15'), endDate: new Date('2026-02-13'), status: SubscriptionStatus.expired,   payment: { paidAt: new Date('2025-11-15T11:00:00'), method: PaymentMethod.cash,       amount: 1200000 } },
    { memberCode: 'MB-2026-0006', pkgCode: 'PKG-0001', startDate: new Date('2026-02-01'), endDate: new Date('2026-03-02'), status: SubscriptionStatus.cancelled, cancelledAt: new Date('2026-02-15T10:00:00'), payment: { paidAt: new Date('2026-02-01T15:00:00'), method: PaymentMethod.cash, amount: 500000 } },
  ]

  for (const s of subData) {
    const sub = await prisma.subscription.create({
      data: { memberId: mMap.get(s.memberCode)!, packageId: pkgMap.get(s.pkgCode)!, startDate: s.startDate, endDate: s.endDate, status: s.status, cancelledAt: s.cancelledAt },
    })
    if (s.payment) {
      await prisma.payment.create({
        data: { memberId: mMap.get(s.memberCode)!, subscriptionId: sub.subscriptionId, amount: s.payment.amount, method: s.payment.method, status: PaymentStatus.success, paidAt: s.payment.paidAt },
      })
    }
  }
  console.log('[seed] seeded 6 subscriptions + 5 payments')
}

// ---------------------------------------------------------------------------
// Seed functions: Schedules / Progress / Sessions / Attendance / Feedback
// ---------------------------------------------------------------------------

async function seedStaffSchedules(): Promise<void> {
  const staffList = await prisma.staff.findMany({
    where:  { staffCode: { in: ['STF-STA-001', 'STF-PT-001', 'STF-PT-002'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))

  await prisma.staffSchedule.deleteMany({})
  await prisma.staffSchedule.createMany({
    data: [
      // Linh (staff): ca sang, ca tuan
      { staffId: sMap.get('STF-STA-001')!, shift: StaffShift.morning,   workDate: new Date('2026-05-26') },
      { staffId: sMap.get('STF-STA-001')!, shift: StaffShift.morning,   workDate: new Date('2026-05-27') },
      { staffId: sMap.get('STF-STA-001')!, shift: StaffShift.morning,   workDate: new Date('2026-05-28') },
      { staffId: sMap.get('STF-STA-001')!, shift: StaffShift.morning,   workDate: new Date('2026-05-29') },
      { staffId: sMap.get('STF-STA-001')!, shift: StaffShift.morning,   workDate: new Date('2026-05-30') },
      { staffId: sMap.get('STF-STA-001')!, shift: StaffShift.morning,   workDate: new Date('2026-06-02') },
      { staffId: sMap.get('STF-STA-001')!, shift: StaffShift.morning,   workDate: new Date('2026-06-03') },
      // Minh (PT): ca chieu, Mon/Wed/Fri
      { staffId: sMap.get('STF-PT-001')!,  shift: StaffShift.afternoon, workDate: new Date('2026-05-26') },
      { staffId: sMap.get('STF-PT-001')!,  shift: StaffShift.afternoon, workDate: new Date('2026-05-28') },
      { staffId: sMap.get('STF-PT-001')!,  shift: StaffShift.afternoon, workDate: new Date('2026-05-30') },
      { staffId: sMap.get('STF-PT-001')!,  shift: StaffShift.afternoon, workDate: new Date('2026-06-02') },
      { staffId: sMap.get('STF-PT-001')!,  shift: StaffShift.afternoon, workDate: new Date('2026-06-04') },
      // Huong (PT): ca sang, Tue/Thu/Sat
      { staffId: sMap.get('STF-PT-002')!,  shift: StaffShift.morning,   workDate: new Date('2026-05-27') },
      { staffId: sMap.get('STF-PT-002')!,  shift: StaffShift.morning,   workDate: new Date('2026-05-29') },
      { staffId: sMap.get('STF-PT-002')!,  shift: StaffShift.morning,   workDate: new Date('2026-05-31') },
      { staffId: sMap.get('STF-PT-002')!,  shift: StaffShift.morning,   workDate: new Date('2026-06-03') },
    ],
  })
  console.log('[seed] seeded 16 staff schedules')
}

async function seedMemberProgress(): Promise<void> {
  const members = await prisma.member.findMany({
    where:  { memberCode: { in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0003'] } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffMinh = await prisma.staff.findUnique({ where: { staffCode: 'STF-PT-001' }, select: { staffId: true } })
  if (!staffMinh) return

  await prisma.memberProgress.deleteMany({})
  await prisma.memberProgress.createMany({
    data: [
      // Nguyen Van A — giam can, theo do 3 lan
      { memberId: mMap.get('MB-2026-0001')!, staffId: staffMinh.staffId, weight: 75.0, bmi: 23.5, goal: 'Giam mo bung, tang co bap tay va nguc', notes: 'The luc tot, can cai thien che do an',            recordedAt: new Date('2026-03-15T09:00:00') },
      { memberId: mMap.get('MB-2026-0001')!, staffId: staffMinh.staffId, weight: 73.2, bmi: 22.9, goal: 'Giam mo bung, tang co bap tay va nguc', notes: 'Giam 1.8kg sau 5 tuan, tien do tot',              recordedAt: new Date('2026-04-20T09:00:00') },
      { memberId: mMap.get('MB-2026-0001')!, staffId: staffMinh.staffId, weight: 71.5, bmi: 22.3, goal: 'Giam mo bung, tang co bap tay va nguc', notes: 'Dat muc tieu -3.5kg, tiep tuc duy tri gian do', recordedAt: new Date('2026-05-25T09:00:00') },
      // Tran Thi B — giam can nhe, theo do 2 lan
      { memberId: mMap.get('MB-2026-0002')!, staffId: staffMinh.staffId, weight: 58.0, bmi: 22.1, goal: 'Giam can, tang cuong suc de khang',    notes: 'Tap trung cardio va dinh duong',                  recordedAt: new Date('2026-05-08T10:00:00') },
      { memberId: mMap.get('MB-2026-0002')!, staffId: staffMinh.staffId, weight: 57.0, bmi: 21.7, goal: 'Giam can, tang cuong suc de khang',    notes: 'Giam 1kg sau 3 tuan, nang luong on dinh',         recordedAt: new Date('2026-05-22T10:00:00') },
      // Le Van C — tang co bap, theo do 3 lan
      { memberId: mMap.get('MB-2026-0003')!, staffId: staffMinh.staffId, weight: 85.0, bmi: 27.3, goal: 'Tang co bap, giam mo the',            notes: 'Can can bang protein + carb',                     recordedAt: new Date('2026-01-20T14:00:00') },
      { memberId: mMap.get('MB-2026-0003')!, staffId: staffMinh.staffId, weight: 83.5, bmi: 26.8, goal: 'Tang co bap, giam mo the',            notes: 'Tang suc manh squat & deadlift ro rang',          recordedAt: new Date('2026-03-15T14:00:00') },
      { memberId: mMap.get('MB-2026-0003')!, staffId: staffMinh.staffId, weight: 82.0, bmi: 26.3, goal: 'Tang co bap, giam mo the',            notes: 'Tien do tot, can them thoi gian nghi phuc hoi',   recordedAt: new Date('2026-05-10T14:00:00') },
    ],
  })
  console.log('[seed] seeded 8 member progress records')
}

async function seedTrainingSessions(roomMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where:  { memberCode: { in: ['MB-2026-0001', 'MB-2026-0002'] } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffList = await prisma.staff.findMany({
    where:  { staffCode: { in: ['STF-PT-001', 'STF-PT-002'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))
  const roomId = roomMap.get('ROOM-003')!

  await prisma.trainingSession.deleteMany({})
  await prisma.trainingSession.createMany({
    data: [
      // Member A + Trainer Minh
      { memberId: mMap.get('MB-2026-0001')!, trainerStaffId: sMap.get('STF-PT-001')!, roomId, startTime: new Date('2026-05-20T07:00:00'), endTime: new Date('2026-05-20T08:00:00'), status: TrainingSessionStatus.completed },
      { memberId: mMap.get('MB-2026-0001')!, trainerStaffId: sMap.get('STF-PT-001')!, roomId, startTime: new Date('2026-05-22T07:00:00'), endTime: new Date('2026-05-22T08:00:00'), status: TrainingSessionStatus.completed },
      { memberId: mMap.get('MB-2026-0001')!, trainerStaffId: sMap.get('STF-PT-001')!, roomId, startTime: new Date('2026-05-27T07:00:00'), endTime: new Date('2026-05-27T08:00:00'), status: TrainingSessionStatus.completed },
      { memberId: mMap.get('MB-2026-0001')!, trainerStaffId: sMap.get('STF-PT-001')!, roomId, startTime: new Date('2026-06-02T07:00:00'), endTime: new Date('2026-06-02T08:00:00'), status: TrainingSessionStatus.scheduled  },
      // Member B + Trainer Huong
      { memberId: mMap.get('MB-2026-0002')!, trainerStaffId: sMap.get('STF-PT-002')!, roomId, startTime: new Date('2026-05-20T09:00:00'), endTime: new Date('2026-05-20T10:00:00'), status: TrainingSessionStatus.completed },
      { memberId: mMap.get('MB-2026-0002')!, trainerStaffId: sMap.get('STF-PT-002')!, roomId, startTime: new Date('2026-05-27T09:00:00'), endTime: new Date('2026-05-27T10:00:00'), status: TrainingSessionStatus.completed },
      { memberId: mMap.get('MB-2026-0002')!, trainerStaffId: sMap.get('STF-PT-002')!, roomId, startTime: new Date('2026-06-03T09:00:00'), endTime: new Date('2026-06-03T10:00:00'), status: TrainingSessionStatus.scheduled  },
    ],
  })
  console.log('[seed] seeded 7 training sessions')
}

async function seedAttendanceLogs(): Promise<void> {
  const activeSubs = await prisma.subscription.findMany({
    where:  { status: SubscriptionStatus.active },
    select: { subscriptionId: true, memberId: true },
  })
  if (activeSubs.length === 0) return

  await prisma.attendanceLog.deleteMany({})

  // 6 khung gio check-in khac nhau trong 2 tuan gan nhat
  const checkInSlots: [Date, Date][] = [
    [new Date('2026-05-20T06:30:00'), new Date('2026-05-20T08:15:00')],
    [new Date('2026-05-21T17:00:00'), new Date('2026-05-21T18:30:00')],
    [new Date('2026-05-23T06:45:00'), new Date('2026-05-23T08:00:00')],
    [new Date('2026-05-26T06:30:00'), new Date('2026-05-26T08:00:00')],
    [new Date('2026-05-27T17:15:00'), new Date('2026-05-27T18:45:00')],
    [new Date('2026-05-28T06:30:00'), new Date('2026-05-28T07:50:00')],
  ]

  const logs: { subscriptionId: bigint; memberId: bigint; startTime: Date; endTime: Date; method: AttendanceMethod }[] = []
  for (const sub of activeSubs) {
    // Moi member check-in 4-6 lan tuy memberId
    const count = 4 + Number(sub.memberId % 3n)
    for (const [start, end] of checkInSlots.slice(0, count)) {
      logs.push({ subscriptionId: sub.subscriptionId, memberId: sub.memberId, startTime: start, endTime: end, method: AttendanceMethod.manual })
    }
  }

  await prisma.attendanceLog.createMany({ data: logs })
  console.log(`[seed] seeded ${logs.length} attendance logs`)
}

async function seedFeedback(equipMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where:  { memberCode: { in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0003'] } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffList = await prisma.staff.findMany({
    where:  { staffCode: { in: ['STF-STA-001', 'STF-PT-001'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))

  await prisma.feedback.deleteMany({})
  for (const fb of [
    {
      memberId:          mMap.get('MB-2026-0001')!,
      feedbackType:      FeedbackType.service,
      content:           'Phong tap sach se, nhan vien than thien. De nghi mo them gio buoi toi (sau 21:00) de phu hop voi lich lam viec cua hoi vien.',
      severity:          FeedbackSeverity.low,
      status:            FeedbackStatus.resolved,
      handledByStaffId:  sMap.get('STF-STA-001')!,
      handledAt:         new Date('2026-03-10T11:00:00'),
      createdAt:         new Date('2026-03-08T18:00:00'),
    },
    {
      memberId:            mMap.get('MB-2026-0002')!,
      feedbackType:        FeedbackType.equipment,
      content:             'May ep nguc khu vuc ta may bi tieng keu bat thuong khi su dung. Toi khong dam dung vi lo ngai mat an toan.',
      severity:            FeedbackSeverity.medium,
      status:              FeedbackStatus.in_progress,
      subjectEquipmentId:  equipMap.get('EQP-W002')!,
      handledByStaffId:    sMap.get('STF-STA-001')!,
      handledAt:           new Date('2026-05-21T09:00:00'),
      createdAt:           new Date('2026-05-20T19:30:00'),
    },
    {
      memberId:        mMap.get('MB-2026-0003')!,
      feedbackType:    FeedbackType.staff,
      content:         'PT Minh rat nhiet tinh va chuyen nghiep. Giao trinh phu hop trinh do, toi cam thay tien bo ro rang sau 2 thang tap.',
      severity:        FeedbackSeverity.low,
      status:          FeedbackStatus.open,
      subjectStaffId:  sMap.get('STF-PT-001')!,
      createdAt:       new Date('2026-05-25T20:00:00'),
    },
  ]) {
    await prisma.feedback.create({ data: fb })
  }
  console.log('[seed] seeded 3 feedback entries')
}

// ---------------------------------------------------------------------------
// Seed function: Workout Plan + Assignment + Log
// ---------------------------------------------------------------------------

async function seedWorkoutPlansAndLogs(): Promise<void> {
  const staffMinh = await prisma.staff.findUnique({ where: { staffCode: 'STF-PT-001' }, select: { staffId: true } })
  const memberA   = await prisma.member.findUnique({ where: { memberCode: 'MB-2026-0001' }, select: { memberId: true } })
  if (!staffMinh || !memberA) return

  // Xoa workout data truoc (idempotent khi chay lai)
  await prisma.workoutLogSet.deleteMany({})
  await prisma.workoutLog.deleteMany({})
  await prisma.memberWorkoutPlan.deleteMany({})
  await prisma.workoutPlan.deleteMany({ where: { creatorStaffId: staffMinh.staffId } })

  const exercises = await prisma.exercise.findMany({
    where:  { name: { in: ['Bench Press', 'Push-up', 'Barbell Row', 'Pull-up', 'Squat', 'Lunge', 'Treadmill Run'] } },
    select: { exerciseId: true, name: true },
  })
  const exMap = new Map(exercises.map((e) => [e.name, e.exerciseId]))

  // Tao plan
  const plan = await prisma.workoutPlan.create({
    data: {
      creatorStaffId: staffMinh.staffId,
      creatorType:    PlanCreatorType.staff,
      name:           'Chuong Trinh Suc Manh Co Ban 3 Ngay',
      description:    'Chuong trinh tap suc manh 3 buoi/tuan cho nguoi moi, tap trung dong tac nen tang da khop.',
      status:         WorkoutPlanStatus.active,
    },
  })

  const day1 = await prisma.workoutPlanDay.create({ data: { planId: plan.planId, dayNumber: 1, name: 'Ngay 1 — Nguc & Tay Sau',  notes: 'Khoi dong 10 phut truoc khi bat dau' } })
  const day2 = await prisma.workoutPlanDay.create({ data: { planId: plan.planId, dayNumber: 2, name: 'Ngay 2 — Lung & Tay Truoc', notes: 'Giu lung thang khi thuc hien dong keo' } })
  const day3 = await prisma.workoutPlanDay.create({ data: { planId: plan.planId, dayNumber: 3, name: 'Ngay 3 — Chan & Cardio',    notes: 'Ket thuc bang 15 phut cardio nhe' } })

  await prisma.workoutPlanExercise.createMany({
    data: [
      { planDayId: day1.planDayId, exerciseId: exMap.get('Bench Press')!, orderIndex: 1, targetSets: 3, targetReps: 10, targetWeightKg: 40,   restSeconds: 90  },
      { planDayId: day1.planDayId, exerciseId: exMap.get('Push-up')!,     orderIndex: 2, targetSets: 3, targetReps: 15,                        restSeconds: 60  },
      { planDayId: day2.planDayId, exerciseId: exMap.get('Barbell Row')!, orderIndex: 1, targetSets: 3, targetReps: 10, targetWeightKg: 35,   restSeconds: 90  },
      { planDayId: day2.planDayId, exerciseId: exMap.get('Pull-up')!,     orderIndex: 2, targetSets: 3, targetReps:  8,                        restSeconds: 120 },
      { planDayId: day3.planDayId, exerciseId: exMap.get('Squat')!,       orderIndex: 1, targetSets: 4, targetReps: 10, targetWeightKg: 50,   restSeconds: 120 },
      { planDayId: day3.planDayId, exerciseId: exMap.get('Lunge')!,       orderIndex: 2, targetSets: 3, targetReps: 12,                        restSeconds: 60  },
      { planDayId: day3.planDayId, exerciseId: exMap.get('Treadmill Run')!, orderIndex: 3, targetSets: 1, targetDurationSec: 900, restSeconds: 0, notes: '15 phut chay toc do vua' },
    ],
  })

  // Gan plan cho Member A
  const assignment = await prisma.memberWorkoutPlan.create({
    data: {
      memberId:          memberA.memberId,
      planId:            plan.planId,
      assignedByStaffId: staffMinh.staffId,
      startDate:         new Date('2026-03-15'),
      status:            WorkoutAssignmentStatus.active,
      notes:             'Tap 3 buoi/tuan (Mon-Wed-Fri). Nghi it nhat 1 ngay giua cac buoi.',
    },
  })

  // 1 workout log: Member A, Day 1, ngay 2026-05-26
  const day1Exercises = await prisma.workoutPlanExercise.findMany({
    where:   { planDayId: day1.planDayId },
    select:  { planExerciseId: true, orderIndex: true },
    orderBy: { orderIndex: 'asc' },
  })
  const log = await prisma.workoutLog.create({
    data: {
      memberId:     memberA.memberId,
      assignmentId: assignment.assignmentId,
      planDayId:    day1.planDayId,
      loggedAt:     new Date('2026-05-26T07:30:00'),
      durationMin:  50,
      notes:        'Cam giac tot, tang trong luong bench press so voi buoi truoc.',
    },
  })

  const [benchEx, pushupEx] = day1Exercises
  await prisma.workoutLogSet.createMany({
    data: [
      // Bench Press
      { logId: log.logId, planExerciseId: benchEx.planExerciseId,  setNumber: 1, actualReps: 10, actualWeightKg: 40,   completed: true },
      { logId: log.logId, planExerciseId: benchEx.planExerciseId,  setNumber: 2, actualReps: 10, actualWeightKg: 42.5, completed: true },
      { logId: log.logId, planExerciseId: benchEx.planExerciseId,  setNumber: 3, actualReps:  9, actualWeightKg: 42.5, completed: true },
      // Push-up
      { logId: log.logId, planExerciseId: pushupEx.planExerciseId, setNumber: 1, actualReps: 15, completed: true },
      { logId: log.logId, planExerciseId: pushupEx.planExerciseId, setNumber: 2, actualReps: 15, completed: true },
      { logId: log.logId, planExerciseId: pushupEx.planExerciseId, setNumber: 3, actualReps: 12, completed: true },
    ],
  })
  console.log('[seed] seeded 1 workout plan (3 days, 7 exercises) + 1 assignment + 1 log + 6 sets')
}

async function main(): Promise<void> {
  console.log('[seed] reset RBAC + profile tables...')
  await reset()

  console.log('[seed] permissions...')
  const permissionMap = await seedPermissions()

  console.log('[seed] groups + group_permissions...')
  const groupMap = await seedGroups(permissionMap)

  console.log('[seed] users + staff + members + user_groups...')
  await seedUsers(groupMap)

  console.log('[seed] exercises...')
  await seedExercises()

  console.log('[seed] packages...')
  const packageMap = await seedPackages()

  console.log('[seed] rooms + equipment...')
  const { roomMap, equipMap } = await seedRoomsAndEquipment()

  console.log('[seed] subscriptions + payments...')
  await seedSubscriptionsAndPayments(packageMap)

  console.log('[seed] staff schedules...')
  await seedStaffSchedules()

  console.log('[seed] member progress...')
  await seedMemberProgress()

  console.log('[seed] training sessions...')
  await seedTrainingSessions(roomMap)

  console.log('[seed] attendance logs...')
  await seedAttendanceLogs()

  console.log('[seed] feedback...')
  await seedFeedback(equipMap)

  console.log('[seed] workout plans + logs...')
  await seedWorkoutPlansAndLogs()

  const counts = {
    users:              await prisma.user.count(),
    staff:              await prisma.staff.count(),
    members:            await prisma.member.count(),
    packages:           await prisma.package.count(),
    subscriptions:      await prisma.subscription.count(),
    payments:           await prisma.payment.count(),
    rooms:              await prisma.gymRoom.count(),
    equipment:          await prisma.equipment.count(),
    groups:             await prisma.group.count(),
    permissions:        await prisma.permission.count(),
    exercises:          await prisma.exercise.count(),
    workout_plans:      await prisma.workoutPlan.count(),
    attendance_logs:    await prisma.attendanceLog.count(),
    feedback:           await prisma.feedback.count(),
  }
  console.log('[seed] done. Row counts:', counts)
  console.log(`[seed] All seeded users share password: ${SEED_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
