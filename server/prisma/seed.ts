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
  ExerciseCategory,
} from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getRuntimeDatabaseUrl } from '../src/prisma/database-url'

type ApiExercise = {
  name: string
  category: string
  muscleGroup: string
  equipmentNeeded: string
  description: string
  imageUrl: string
}

let EXERCISES_FROM_API: ApiExercise[] = []
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  EXERCISES_FROM_API = require('./exercises-cache.json') as ApiExercise[]
} catch {
  // Cache chua ton tai — chay `npm run fetch:exercises` truoc
}

// ---------------------------------------------------------------------------
// EXERCISE LIBRARY (20 bai tap)
// ---------------------------------------------------------------------------

const EXERCISE_LIBRARY = [
  {
    name: 'Squat',
    category: ExerciseCategory.strength,
    muscleGroup: 'Đùi trước, mông, gân kheo, core',
    equipmentNeeded: 'Tạ đòn và rack (tùy chọn)',
    description:
      'Đứng chân rộng bằng vai, siết core, đẩy hông ra sau và hạ người đến khi đùi gần song song sàn. Giữ gối cùng hướng mũi chân rồi đạp qua giữa bàn chân để đứng lên.',
    imageUrl: '/exercises/squat.png',
  },
  {
    name: 'Deadlift',
    category: ExerciseCategory.strength,
    muscleGroup: 'Lưng dưới, mông, gân kheo, cẳng tay',
    equipmentNeeded: 'Tạ đòn và bánh tạ',
    description:
      'Đặt thanh tạ sát ống chân, gập hông với lưng trung lập, nắm chắc thanh và đẩy sàn bằng hai chân. Đứng thẳng bằng cách duỗi hông, không ngửa lưng ở vị trí khóa.',
    imageUrl: '/exercises/deadlift.png',
  },
  {
    name: 'Bench Press',
    category: ExerciseCategory.strength,
    muscleGroup: 'Ngực, vai trước, tay sau',
    equipmentNeeded: 'Ghế phẳng, rack, tạ đòn',
    description:
      'Nằm chắc trên ghế, kéo bả vai về sau, hạ thanh tạ có kiểm soát về giữa ngực. Đẩy thanh lên theo đường hơi chéo về phía vai và luôn giữ cổ tay thẳng.',
    imageUrl: '/exercises/bench-press.png',
  },
  {
    name: 'Overhead Press',
    category: ExerciseCategory.strength,
    muscleGroup: 'Vai, tay sau, core',
    equipmentNeeded: 'Tạ đòn hoặc tạ đơn',
    description:
      'Giữ tạ ngang vai, siết mông và core, đẩy tạ thẳng qua đầu. Kết thúc khi tay duỗi và tạ nằm trên đường giữa cơ thể, tránh ưỡn lưng quá mức.',
    imageUrl: '/exercises/overhead-press.png',
  },
  {
    name: 'Barbell Row',
    category: ExerciseCategory.strength,
    muscleGroup: 'Lưng giữa, xô, vai sau, tay trước',
    equipmentNeeded: 'Tạ đòn',
    description:
      'Gập hông, giữ cột sống trung lập và thân người gần song song sàn. Kéo thanh tạ về bụng dưới bằng khuỷu tay, siết bả vai rồi hạ tạ chậm.',
    imageUrl: '/exercises/barbell-row.png',
  },
  {
    name: 'Pull-up',
    category: ExerciseCategory.strength,
    muscleGroup: 'Cơ xô, lưng trên, tay trước',
    equipmentNeeded: 'Xà đơn',
    description:
      'Treo người với vai chủ động, kéo khuỷu tay xuống và đưa ngực về phía xà. Hạ người có kiểm soát đến khi tay duỗi, không vung chân lấy đà.',
    imageUrl: '/exercises/pull-up.png',
  },
  {
    name: 'Push-up',
    category: ExerciseCategory.strength,
    muscleGroup: 'Ngực, tay sau, vai trước, core',
    equipmentNeeded: 'Không cần dụng cụ',
    description:
      'Giữ cơ thể thành một đường thẳng từ đầu đến gót, hạ ngực xuống bằng cách gập khuỷu khoảng 30-45 độ. Đẩy sàn ra xa và giữ hông không võng.',
    imageUrl: '/exercises/push-up.png',
  },
  {
    name: 'Lunge',
    category: ExerciseCategory.strength,
    muscleGroup: 'Đùi trước, mông, gân kheo',
    equipmentNeeded: 'Không cần dụng cụ hoặc tạ đơn',
    description:
      'Bước một chân về trước, hạ gối sau gần sàn và giữ thân người thẳng. Đạp qua bàn chân trước để trở về vị trí ban đầu, tránh để gối đổ vào trong.',
    imageUrl: '/exercises/lunge.png',
  },
  {
    name: 'Treadmill Run',
    category: ExerciseCategory.cardio,
    muscleGroup: 'Tim mạch, chân, mông',
    equipmentNeeded: 'Máy chạy bộ',
    description:
      'Khởi động ở tốc độ thấp, tăng dần đến vùng nhịp tim mục tiêu và giữ bước chân nhẹ dưới trọng tâm. Không bám tay vịn khi chạy ổn định.',
    imageUrl: '/exercises/treadmill-run.png',
  },
  {
    name: 'Jump Rope',
    category: ExerciseCategory.cardio,
    muscleGroup: 'Tim mạch, bắp chân, vai, core',
    equipmentNeeded: 'Dây nhảy',
    description:
      'Giữ khuỷu sát thân, quay dây chủ yếu bằng cổ tay và bật thấp bằng nửa trước bàn chân. Duy trì nhịp đều, tiếp đất mềm để giảm tải khớp.',
    imageUrl: '/exercises/jump-rope.png',
  },
  {
    name: 'Cycling',
    category: ExerciseCategory.cardio,
    muscleGroup: 'Tim mạch, đùi trước, mông, bắp chân',
    equipmentNeeded: 'Xe đạp tập',
    description:
      'Chỉnh yên để gối còn hơi chùng ở điểm thấp nhất, giữ lưng trung lập và đạp vòng tròn đều. Điều chỉnh kháng lực để duy trì đúng vùng cường độ.',
    imageUrl: '/exercises/cycling.png',
  },
  {
    name: 'Hip Flexor Stretch',
    category: ExerciseCategory.flexibility,
    muscleGroup: 'Cơ gấp hông, đùi trước',
    equipmentNeeded: 'Thảm tập',
    description:
      'Quỳ một gối, siết mông bên chân quỳ và đẩy hông nhẹ về trước. Giữ xương chậu trung lập, không ưỡn lưng để cảm nhận căng ở trước hông.',
    imageUrl: '/exercises/hip-flexor-stretch.png',
  },
  {
    name: 'Hamstring Stretch',
    category: ExerciseCategory.flexibility,
    muscleGroup: 'Gân kheo, bắp chân',
    equipmentNeeded: 'Thảm tập hoặc dây hỗ trợ',
    description:
      'Duỗi một chân, gập người từ khớp hông với lưng dài và hướng ngực về bàn chân. Chỉ đi đến mức căng dễ chịu, không giật nảy.',
    imageUrl: '/exercises/hamstring-stretch.png',
  },
  {
    name: 'Shoulder Stretch',
    category: ExerciseCategory.flexibility,
    muscleGroup: 'Vai sau, lưng trên',
    equipmentNeeded: 'Không cần dụng cụ',
    description:
      'Kéo một tay ngang qua ngực bằng tay còn lại, giữ vai thấp và thân người hướng thẳng. Duy trì lực kéo nhẹ, không ép vào khớp khuỷu.',
    imageUrl: '/exercises/shoulder-stretch.png',
  },
  {
    name: 'Single-Leg Stand',
    category: ExerciseCategory.balance,
    muscleGroup: 'Cổ chân, mông nhỡ, core',
    equipmentNeeded: 'Không cần dụng cụ',
    description:
      'Đứng trên một chân, hơi chùng gối trụ và giữ hông cân bằng. Nhìn vào một điểm cố định, siết core và tăng độ khó bằng cách nhắm mắt hoặc đổi bề mặt.',
    imageUrl: '/exercises/single-leg-stand.png',
  },
  {
    name: 'Plank',
    category: ExerciseCategory.balance,
    muscleGroup: 'Core, vai, mông',
    equipmentNeeded: 'Thảm tập',
    description:
      'Chống cẳng tay dưới vai, siết bụng và mông để cơ thể thành đường thẳng. Thở đều, không để hông võng hoặc nâng quá cao.',
    imageUrl: '/exercises/plank.png',
  },
  {
    name: 'Bosu Ball Squat',
    category: ExerciseCategory.balance,
    muscleGroup: 'Đùi, mông, cổ chân, core',
    equipmentNeeded: 'Bóng BOSU',
    description:
      'Đứng cân bằng trên BOSU, giữ ngực mở và hạ squat chậm trong biên độ kiểm soát. Ưu tiên ổn định gối, cổ chân trước khi tăng độ sâu.',
    imageUrl: '/exercises/bosu-ball-squat.png',
  },
  {
    name: 'Side Plank',
    category: ExerciseCategory.balance,
    muscleGroup: 'Cơ liên sườn, vai, mông nhỡ',
    equipmentNeeded: 'Thảm tập',
    description:
      'Chống khuỷu ngay dưới vai, xếp hai chân và nâng hông để cơ thể thành đường thẳng. Giữ đầu, vai và hông cùng mặt phẳng.',
    imageUrl: '/exercises/side-plank.png',
  },
  {
    name: 'Bird Dog',
    category: ExerciseCategory.balance,
    muscleGroup: 'Core, lưng dưới, mông, vai',
    equipmentNeeded: 'Thảm tập',
    description:
      'Từ tư thế bốn điểm, duỗi đồng thời tay và chân đối diện trong khi giữ hông vuông. Tạm dừng, kéo về chậm và tránh xoay thân.',
    imageUrl: '/exercises/bird-dog.png',
  },
  {
    name: 'Dead Bug',
    category: ExerciseCategory.balance,
    muscleGroup: 'Core sâu, cơ gấp hông',
    equipmentNeeded: 'Thảm tập',
    description:
      'Nằm ngửa, giữ lưng dưới áp nhẹ sàn rồi hạ tay và chân đối diện. Chỉ đi đến biên độ vẫn kiểm soát được xương chậu và nhịp thở.',
    imageUrl: '/exercises/dead-bug.png',
  },
]

// ---------------------------------------------------------------------------
// TRAINER MINH - WORKOUT PLAN (4 TUAN, 3 BUOI/TUAN)
// ---------------------------------------------------------------------------

type PlanExercise = {
  name: string
  sets: number
  reps?: number
  durationSec: number
  weightKg?: number
  restSec: number
  notes: string
}

type PlanDay = {
  weekNumber: number
  dayOfWeek: number
  dayNumber: number
  name: string
  notes: string
  exercises: PlanExercise[]
}

const upperDay = (weekNumber: number, dayNumber: number, sets: number, reps: number): PlanDay => ({
  weekNumber,
  dayOfWeek: 1,
  dayNumber,
  name: 'Thân trên - Đẩy và ổn định vai',
  notes: 'Khởi động vai 8 phút; dừng set khi kỹ thuật bắt đầu giảm.',
  exercises: [
    {
      name: 'Bench Press',
      sets,
      reps,
      durationSec: 45,
      weightKg: 35 + weekNumber * 2.5,
      restSec: 90,
      notes: 'Giữ bả vai cố định trên ghế.',
    },
    {
      name: 'Overhead Press',
      sets: 3,
      reps: Math.max(6, reps - 2),
      durationSec: 40,
      weightKg: 20 + weekNumber * 2.5,
      restSec: 90,
      notes: 'Siết core, không ưỡn lưng.',
    },
    {
      name: 'Push-up',
      sets: 3,
      reps: reps + 4,
      durationSec: 40,
      restSec: 60,
      notes: 'Giữ thân người thành một đường thẳng.',
    },
    {
      name: 'Plank',
      sets: 3,
      durationSec: 30 + weekNumber * 10,
      restSec: 45,
      notes: 'Thở đều và siết mông.',
    },
  ],
})

const lowerDay = (weekNumber: number, dayNumber: number, sets: number, reps: number): PlanDay => ({
  weekNumber,
  dayOfWeek: 3,
  dayNumber,
  name: 'Thân dưới - Sức mạnh và kiểm soát',
  notes: 'Khởi động hông, gối và cổ chân trước khi vào set chính.',
  exercises: [
    {
      name: 'Squat',
      sets,
      reps,
      durationSec: 50,
      weightKg: 40 + weekNumber * 5,
      restSec: 120,
      notes: 'Gối theo hướng mũi chân.',
    },
    {
      name: 'Deadlift',
      sets: 3,
      reps: Math.max(6, reps - 2),
      durationSec: 45,
      weightKg: 50 + weekNumber * 5,
      restSec: 120,
      notes: 'Giữ thanh tạ sát chân.',
    },
    {
      name: 'Lunge',
      sets: 3,
      reps,
      durationSec: 45,
      restSec: 60,
      notes: 'Số rep tính cho mỗi bên.',
    },
    {
      name: 'Dead Bug',
      sets: 3,
      reps: 10,
      durationSec: 40,
      restSec: 45,
      notes: 'Giữ lưng dưới ổn định.',
    },
    {
      name: 'Hamstring Stretch',
      sets: 2,
      durationSec: 40,
      restSec: 20,
      notes: 'Giữ mỗi bên 40 giây.',
    },
  ],
})

const conditioningDay = (weekNumber: number, dayNumber: number, cardioSec: number): PlanDay => ({
  weekNumber,
  dayOfWeek: 5,
  dayNumber,
  name: 'Lưng, core và tim mạch',
  notes: 'Duy trì nhịp vừa; ưu tiên kỹ thuật hơn tốc độ.',
  exercises: [
    {
      name: 'Barbell Row',
      sets: 3,
      reps: 10,
      durationSec: 45,
      weightKg: 30 + weekNumber * 2.5,
      restSec: 90,
      notes: 'Kéo khuỷu về sau, không giật lưng.',
    },
    {
      name: 'Pull-up',
      sets: 3,
      reps: 6 + weekNumber,
      durationSec: 35,
      restSec: 120,
      notes: 'Dùng dây hỗ trợ nếu cần.',
    },
    {
      name: 'Bird Dog',
      sets: 3,
      reps: 10,
      durationSec: 40,
      restSec: 45,
      notes: 'Số rep tính cho mỗi bên.',
    },
    {
      name: 'Treadmill Run',
      sets: 1,
      durationSec: cardioSec,
      restSec: 0,
      notes: 'Giữ vùng nhịp tim 65-75% tối đa.',
    },
    {
      name: 'Hip Flexor Stretch',
      sets: 2,
      durationSec: 40,
      restSec: 20,
      notes: 'Giữ mỗi bên 40 giây.',
    },
  ],
})

const TRAINER_MINH_FOUR_WEEK_PLAN: PlanDay[] = [
  upperDay(1, 1, 3, 10),
  lowerDay(1, 2, 3, 10),
  conditioningDay(1, 3, 720),
  upperDay(2, 4, 4, 10),
  lowerDay(2, 5, 4, 10),
  conditioningDay(2, 6, 900),
  upperDay(3, 7, 4, 8),
  lowerDay(3, 8, 4, 8),
  conditioningDay(3, 9, 1080),
  upperDay(4, 10, 3, 8),
  lowerDay(4, 11, 3, 8),
  conditioningDay(4, 12, 720),
]

const prisma = new PrismaClient({ datasourceUrl: getRuntimeDatabaseUrl() })

const SEED_PASSWORD = 'Password123!'

const PERMISSIONS = [
  // Quan ly tai khoan & phan quyen (Quy trinh 2.4.6)
  {
    code: 'user.read',
    name: 'Xem tai khoan',
    description: 'Xem danh sach va chi tiet tai khoan he thong',
  },
  {
    code: 'user.create',
    name: 'Tao tai khoan',
    description: 'Tao tai khoan moi (kem dang ky ho so)',
  },
  {
    code: 'user.update',
    name: 'Cap nhat tai khoan',
    description: 'Sua thong tin / khoa / mo khoa tai khoan',
  },
  { code: 'user.delete', name: 'Xoa tai khoan', description: 'Xoa tai khoan khoi he thong' },
  {
    code: 'rbac.manage',
    name: 'Quan ly phan quyen',
    description: 'Tao/sua/xoa nhom, gan quyen va gan user vao nhom (2.4.6)',
  },
  // Hoi vien (UC03)
  { code: 'member.read', name: 'Xem hoi vien', description: 'Xem ho so hoi vien' },
  { code: 'member.create', name: 'Tao hoi vien', description: 'Dang ky hoi vien moi (UC03)' },
  { code: 'member.update', name: 'Cap nhat hoi vien', description: 'Sua ho so hoi vien' },
  { code: 'member.delete', name: 'Xoa hoi vien', description: 'Xoa ho so hoi vien' },
  // Nhan su / PT (UC11)
  { code: 'staff.read', name: 'Xem nhan su', description: 'Xem danh sach nhan su / PT' },
  { code: 'staff.create', name: 'Tao nhan su', description: 'Them nhan su / PT moi (UC11)' },
  { code: 'staff.update', name: 'Cap nhat nhan su', description: 'Sua ho so nhan su (UC11)' },
  { code: 'staff.delete', name: 'Xoa nhan su', description: 'Xoa nhan su (UC11)' },
  // Goi tap & dang ky (UC04, UC10)
  { code: 'package.read', name: 'Xem goi tap', description: 'Xem danh muc goi tap' },
  {
    code: 'package.manage',
    name: 'Quan ly goi tap',
    description: 'Tao / sua / ngung kinh doanh goi tap (UC10)',
  },
  {
    code: 'subscription.read',
    name: 'Xem dang ky goi',
    description: 'Xem cac luot dang ky cua hoi vien',
  },
  {
    code: 'subscription.create',
    name: 'Tao dang ky goi',
    description: 'Ban / gia han goi cho hoi vien (UC03, UC04)',
  },
  {
    code: 'subscription.cancel',
    name: 'Huy dang ky goi',
    description: 'Huy goi tap dang active/pending (UC04B)',
  },
  // Thanh toan (UC03, UC04)
  { code: 'payment.read', name: 'Xem thanh toan', description: 'Xem lich su giao dich' },
  {
    code: 'payment.create',
    name: 'Tao giao dich',
    description: 'Ghi nhan thanh toan (UC03, UC04)',
  },
  { code: 'payment.refund', name: 'Hoan tien', description: 'Thuc hien hoan tien giao dich' },
  // Phong tap, thiet bi, bao tri (UC08, UC09)
  {
    code: 'room.manage',
    name: 'Quan ly phong tap',
    description: 'Tao / sua / xoa phong tap (UC08)',
  },
  {
    code: 'equipment.manage',
    name: 'Quan ly thiet bi',
    description: 'Quan ly danh muc thiet bi (UC09)',
  },
  { code: 'maintenance.read', name: 'Xem nhat ky bao tri', description: 'Xem cac phieu bao tri' },
  {
    code: 'maintenance.report',
    name: 'Bao loi thiet bi',
    description: 'Tao phieu bao tri / bao loi (UC09)',
  },
  {
    code: 'maintenance.resolve',
    name: 'Xu ly bao tri',
    description: 'Cap nhat ket qua xu ly phieu bao tri (UC09)',
  },
  // Lich tap / cham cong / tien do (UC05, UC06)
  { code: 'session.read', name: 'Xem lich tap', description: 'Xem lich tap voi PT (UC05)' },
  {
    code: 'session.manage',
    name: 'Quan ly lich tap',
    description: 'Tao / sua / huy lich tap (UC05)',
  },
  {
    code: 'attendance.read',
    name: 'Xem cham cong',
    description: 'Xem nhat ky check-in / ghi nhan tu dong',
  },
  {
    code: 'attendance.checkin',
    name: 'Check-in hoi vien',
    description: 'Ghi nhan check-in / check-out (UC05 fallback)',
  },
  {
    code: 'progress.read',
    name: 'Xem tien do tap',
    description: 'Xem chi so tien do hoi vien (UC06)',
  },
  {
    code: 'progress.record',
    name: 'Ghi nhan tien do',
    description: 'Ghi chi so BMI / can nang / muc tieu (UC06)',
  },
  // Phan hoi & thong bao (UC07, 2.4.5)
  { code: 'feedback.read', name: 'Xem phan hoi', description: 'Xem phan hoi cua hoi vien' },
  {
    code: 'feedback.create',
    name: 'Gui phan hoi',
    description: 'Hoi vien / nhan vien tai quay gui phan hoi (UC07)',
  },
  {
    code: 'feedback.handle',
    name: 'Xu ly phan hoi',
    description: 'Tiep nhan / phan loai / xu ly phan hoi (2.4.5)',
  },
  // V1.0 da bo notification feature (xem Database.md). Re-add khi UC14 phuc hoi o v1.1+.
  // Lich lam viec & bao cao (UC11, UC12)
  { code: 'schedule.read', name: 'Xem lich lam viec', description: 'Xem lich ca lam cua nhan su' },
  {
    code: 'schedule.manage',
    name: 'Quan ly lich lam viec',
    description: 'Phan ca cho nhan su (UC11)',
  },
  { code: 'report.view', name: 'Xem bao cao', description: 'Xem cac bao cao thong ke (UC12)' },
  // Workout plan & log (UC05A, UC06A, UC06B)
  { code: 'exercise.read', name: 'Xem danh sach bai tap', description: 'Xem exercise library' },
  { code: 'exercise.create', name: 'Tao bai tap', description: 'Them exercise vao library' },
  { code: 'exercise.update', name: 'Cap nhat bai tap', description: 'Sua thong tin exercise' },
  { code: 'exercise.delete', name: 'Xoa bai tap', description: 'Soft delete exercise' },
  { code: 'workout_plan.create', name: 'Tao workout plan', description: 'Tao plan template moi' },
  { code: 'workout_plan.update', name: 'Cap nhat workout plan', description: 'Sua plan template' },
  {
    code: 'workout_plan.delete',
    name: 'Xoa workout plan',
    description: 'Soft delete plan template',
  },
  {
    code: 'workout_plan.assign',
    name: 'Giao plan cho member',
    description: 'Assign plan cho member (UC05A)',
  },
  {
    code: 'workout_log.create',
    name: 'Ghi buoi tap',
    description: 'Member log workout session (UC06A)',
  },
  { code: 'workout_log.read', name: 'Xem lich su tap', description: 'Xem workout history' },
  { code: 'workout_log.update', name: 'Sua buoi tap', description: 'Sua workout log trong 24h' },
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
    'user.read',
    'user.create',
    'user.update',
    'member.read',
    'member.create',
    'member.update',
    'member.delete',
    'staff.read',
    'package.read',
    'package.manage',
    'subscription.read',
    'subscription.create',
    'subscription.cancel',
    'payment.read',
    'payment.create',
    'payment.refund',
    'room.manage',
    'equipment.manage',
    'maintenance.read',
    'maintenance.report',
    'maintenance.resolve',
    'session.read',
    'attendance.read',
    'attendance.checkin',
    'progress.read',
    'feedback.read',
    'feedback.create',
    'feedback.handle',
    'schedule.read',
    'exercise.read',
    'exercise.create',
    'exercise.update',
    'exercise.delete',
    'workout_plan.assign',
    'workout_log.read',
  ],
  trainer: [
    'member.read',
    'package.read',
    'subscription.read',
    'maintenance.read',
    'maintenance.report',
    'session.read',
    'session.manage',
    'attendance.read',
    'progress.read',
    'progress.record',
    'feedback.read',
    'schedule.read',
    'exercise.read',
    'exercise.create',
    'exercise.update',
    'workout_plan.create',
    'workout_plan.update',
    'workout_plan.delete',
    'workout_plan.assign',
    'workout_log.read',
  ],
  member: [
    'package.read',
    'subscription.read',
    'subscription.create',
    'subscription.cancel',
    'payment.read',
    'payment.create',
    'session.read',
    'attendance.read',
    'progress.read',
    'feedback.read',
    'feedback.create',
    'exercise.read',
    'workout_plan.create',
    'workout_plan.update',
    'workout_plan.delete',
    'workout_log.create',
    'workout_log.read',
    'workout_log.update',
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
  member?: {
    memberCode: string
    dateOfBirth: Date
    address: string
    primaryTrainerStaffCode?: string
  }
}

const TRAINER_MINH_MEMBERS: SeedUser[] = [
  {
    email: 'gia.bao.mock@gym.local',
    phone: '0911000007',
    fullName: 'Hoang Gia Bao',
    status: UserStatus.active,
    createdAt: new Date('2026-04-20T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0007',
      dateOfBirth: new Date('1994-02-18'),
      address: '15 Nguyen Van Troi, Q. Phu Nhuan, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'minh.chau.mock@gym.local',
    phone: '0911000008',
    fullName: 'Nguyen Minh Chau',
    status: UserStatus.active,
    createdAt: new Date('2026-04-25T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0008',
      dateOfBirth: new Date('1999-08-07'),
      address: '82 Phan Xich Long, Q. Phu Nhuan, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'duc.duy.mock@gym.local',
    phone: '0911000009',
    fullName: 'Tran Duc Duy',
    status: UserStatus.active,
    createdAt: new Date('2026-05-01T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0009',
      dateOfBirth: new Date('1988-11-21'),
      address: '34 Dien Bien Phu, Q. Binh Thanh, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'thu.ha.mock@gym.local',
    phone: '0911000010',
    fullName: 'Le Thu Ha',
    status: UserStatus.active,
    createdAt: new Date('2026-05-08T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0010',
      dateOfBirth: new Date('2000-05-14'),
      address: '106 Ly Chinh Thang, Q.3, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'quoc.khanh.mock@gym.local',
    phone: '0911000011',
    fullName: 'Pham Quoc Khanh',
    status: UserStatus.active,
    createdAt: new Date('2026-05-15T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0011',
      dateOfBirth: new Date('1992-09-03'),
      address: '57 Nguyen Trai, Q.5, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'ngoc.lan.mock@gym.local',
    phone: '0911000012',
    fullName: 'Vo Ngoc Lan',
    status: UserStatus.active,
    createdAt: new Date('2026-05-22T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0012',
      dateOfBirth: new Date('1997-12-19'),
      address: '23 Hoang Van Thu, Q. Tan Binh, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'thanh.nam.mock@gym.local',
    phone: '0911000013',
    fullName: 'Bui Thanh Nam',
    status: UserStatus.active,
    createdAt: new Date('2026-05-28T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0013',
      dateOfBirth: new Date('1985-06-26'),
      address: '91 Cong Hoa, Q. Tan Binh, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'mai.phuong.mock@gym.local',
    phone: '0911000014',
    fullName: 'Do Mai Phuong',
    status: UserStatus.active,
    createdAt: new Date('2026-06-01T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0014',
      dateOfBirth: new Date('2002-03-10'),
      address: '44 Vo Thi Sau, Q.3, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'hoang.son.mock@gym.local',
    phone: '0911000015',
    fullName: 'Dang Hoang Son',
    status: UserStatus.pending_verification,
    createdAt: new Date('2026-06-05T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0015',
      dateOfBirth: new Date('1996-10-30'),
      address: '70 Au Co, Q. Tan Phu, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
  {
    email: 'bao.tram.mock@gym.local',
    phone: '0911000016',
    fullName: 'Truong Bao Tram',
    status: UserStatus.locked,
    createdAt: new Date('2026-06-08T09:00:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0016',
      dateOfBirth: new Date('1991-01-16'),
      address: '11 Kha Van Can, TP. Thu Duc, TP.HCM',
      primaryTrainerStaffCode: 'STF-PT-001',
    },
  },
]

const TRAINER_MINH_MEMBER_CODES = TRAINER_MINH_MEMBERS.map((user) => user.member!.memberCode)

const USERS: SeedUser[] = [
  {
    email: 'owner@gym.local',
    phone: '0900000001',
    fullName: 'Pham Quoc Hung',
    status: UserStatus.active,
    createdAt: new Date('2026-01-01T08:00:00'),
    role: 'owner',
    staff: { staffCode: 'STF-OWN-001', position: 'owner' },
  },
  {
    email: 'staff.linh@gym.local',
    phone: '0900000002',
    fullName: 'Nguyen Thi Linh',
    status: UserStatus.active,
    createdAt: new Date('2026-01-02T08:00:00'),
    role: 'staff',
    staff: { staffCode: 'STF-STA-001', position: 'staff' },
  },
  {
    email: 'trainer.minh@gym.local',
    phone: '0900000003',
    fullName: 'Tran Quang Minh',
    status: UserStatus.active,
    createdAt: new Date('2026-01-03T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-001', position: 'trainer' },
  },
  {
    email: 'trainer.huong@gym.local',
    phone: '0900000004',
    fullName: 'Le Thi Huong',
    status: UserStatus.active,
    createdAt: new Date('2026-01-04T08:00:00'),
    role: 'trainer',
    staff: { staffCode: 'STF-PT-002', position: 'trainer' },
  },
  {
    email: 'nguyen.van.a@email.com',
    phone: '0911000001',
    fullName: 'Nguyen Van A',
    status: UserStatus.active,
    createdAt: new Date('2026-02-01T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0001',
      dateOfBirth: new Date('1995-04-12'),
      address: '12 Le Loi, Q.1, TP.HCM',
    },
  },
  {
    email: 'tran.thi.b@email.com',
    phone: '0911000002',
    fullName: 'Tran Thi B',
    status: UserStatus.active,
    createdAt: new Date('2026-02-02T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0002',
      dateOfBirth: new Date('1998-09-23'),
      address: '45 Nguyen Hue, Q.1, TP.HCM',
    },
  },
  {
    email: 'le.van.c@email.com',
    phone: '0911000003',
    fullName: 'Le Van C',
    status: UserStatus.active,
    createdAt: new Date('2026-02-03T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0003',
      dateOfBirth: new Date('1990-01-30'),
      address: '88 Cach Mang Thang 8, Q.3, HCM',
    },
  },
  {
    email: 'pham.thi.d@email.com',
    phone: '0911000004',
    fullName: 'Pham Thi D',
    status: UserStatus.active,
    createdAt: new Date('2026-02-04T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0004',
      dateOfBirth: new Date('2001-07-15'),
      address: '21 Pasteur, Q.3, TP.HCM',
    },
  },
  {
    email: 'hoang.van.e@email.com',
    phone: '0911000005',
    fullName: 'Hoang Van E',
    status: UserStatus.active,
    createdAt: new Date('2026-02-05T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0005',
      dateOfBirth: new Date('1993-12-05'),
      address: '7 Tran Hung Dao, Q.5, TP.HCM',
    },
  },
  {
    email: 'vu.thi.f@email.com',
    phone: '0911000006',
    fullName: 'Vu Thi F',
    status: UserStatus.locked,
    createdAt: new Date('2026-02-06T09:30:00'),
    role: 'member',
    member: {
      memberCode: 'MB-2026-0006',
      dateOfBirth: new Date('1996-06-18'),
      address: '102 Vo Van Tan, Q.3, TP.HCM',
    },
  },
  ...TRAINER_MINH_MEMBERS,
]

async function reset(): Promise<void> {
  // Thu tu: leaf tables truoc, parent tables sau
  await prisma.$transaction([
    // Workout (leaf → plan)
    prisma.workoutLogSet.deleteMany(),
    prisma.workoutLog.deleteMany(),
    prisma.workoutPlanExercise.deleteMany(),
    prisma.workoutPlanDay.deleteMany(),
    prisma.memberWorkoutPlan.deleteMany(),
    prisma.workoutPlan.deleteMany(),
    prisma.exercise.deleteMany(),
    // Phu thuoc member/staff/subscription/equipment
    prisma.attendanceLog.deleteMany(),
    prisma.memberProgress.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.trainingSession.deleteMany(),
    prisma.staffSchedule.deleteMany(),
    prisma.maintenanceLog.deleteMany(),
    prisma.paymentAccount.deleteMany(),
    // Subscription/payment/package
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.package.deleteMany(),
    // Co so vat chat
    prisma.equipment.deleteMany(),
    prisma.gymRoom.deleteMany(),
    // Auth + files
    prisma.auditLog.deleteMany(),
    prisma.file.deleteMany(),
    // RBAC
    prisma.groupPermission.deleteMany(),
    prisma.userGroup.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.group.deleteMany(),
    // Profiles + users
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

async function seedGroups(permissionMap: Map<string, bigint>): Promise<Map<string, bigint>> {
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
    const emailVerifiedAt = u.status === UserStatus.pending_verification ? null : u.createdAt
    const userRow = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        emailVerifiedAt,
        passwordHash,
      },
      create: {
        email: u.email,
        phone: u.phone,
        fullName: u.fullName,
        status: u.status,
        emailVerifiedAt,
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
      const primaryTrainer = u.member.primaryTrainerStaffCode
        ? await prisma.staff.findUnique({
            where: { staffCode: u.member.primaryTrainerStaffCode },
            select: { staffId: true },
          })
        : null
      if (u.member.primaryTrainerStaffCode && !primaryTrainer) {
        throw new Error(`Trainer staff code khong ton tai: ${u.member.primaryTrainerStaffCode}`)
      }

      await prisma.member.upsert({
        where: { memberCode: u.member.memberCode },
        update: {
          userId: userRow.userId,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
          primaryTrainerId: primaryTrainer?.staffId ?? null,
        },
        create: {
          userId: userRow.userId,
          memberCode: u.member.memberCode,
          dateOfBirth: u.member.dateOfBirth,
          address: u.member.address,
          primaryTrainerId: primaryTrainer?.staffId ?? null,
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
  if ((await prisma.exercise.count()) > 0) return

  const existingNames = new Set(EXERCISE_LIBRARY.map((e) => e.name.toLowerCase()))

  const apiExercises = EXERCISES_FROM_API.filter(
    (e) => !existingNames.has(e.name.toLowerCase())
  ).map((e) => ({
    name: e.name,
    category: e.category as ExerciseCategory,
    muscleGroup: e.muscleGroup,
    equipmentNeeded: e.equipmentNeeded,
    description: e.description,
    imageUrl: e.imageUrl,
    createdByStaffId: null,
    deletedAt: null,
  }))

  const allExercises = [
    ...EXERCISE_LIBRARY.map((e) => ({ ...e, createdByStaffId: null, deletedAt: null })),
    ...apiExercises,
  ]
  await prisma.exercise.createMany({ data: allExercises })
  console.log(
    `[seed] seeded ${allExercises.length} exercises (${EXERCISE_LIBRARY.length} library + ${apiExercises.length} from API cache)`
  )
}

// ---------------------------------------------------------------------------
// MOCK DATA: Packages
// ---------------------------------------------------------------------------

const PACKAGES_DATA = [
  {
    packageCode: 'PKG-0001',
    name: 'Goi Co Ban 1 Thang',
    durationDays: 30,
    price: 500000,
    benefits: 'Tap tu do tat ca may, phong va gio mo cua',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0002',
    name: 'Goi Tieu Chuan 3 Thang',
    durationDays: 90,
    price: 1200000,
    benefits: 'Tap tu do + 1 buoi tham van PT + tu giu do ca nhan',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0003',
    name: 'Goi Cao Cap 6 Thang',
    durationDays: 180,
    price: 2000000,
    benefits: 'Tap tu do + 4 buoi PT mien phi + tu giu do + nuoc uong',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0004',
    name: 'Goi Premium 1 Nam',
    durationDays: 365,
    price: 3500000,
    benefits: 'Tap tu do + 12 buoi PT + tu giu do + ao dong phuc + nuoc uong',
    status: PackageStatus.active,
  },
  {
    packageCode: 'PKG-0005',
    name: 'Goi PT Ca Nhan 1 Thang',
    durationDays: 30,
    price: 1500000,
    benefits: '8 buoi tap 1-1 voi PT ca nhan, phan tich co the mien phi',
    status: PackageStatus.inactive,
  },
]

// ---------------------------------------------------------------------------
// MOCK DATA: GymRooms + Equipment
// ---------------------------------------------------------------------------

const ROOMS_DATA = [
  {
    roomCode: 'ROOM-001',
    name: 'Phong Cardio',
    roomType: 'cardio',
    capacity: 30,
    description: 'May chay bo, xe dap tap, elliptical trainer',
  },
  {
    roomCode: 'ROOM-002',
    name: 'Phong Ta & May',
    roomType: 'weights',
    capacity: 20,
    description: 'Ta tu do, may tap co bap da chuc nang',
  },
  {
    roomCode: 'ROOM-003',
    name: 'Phong Yoga & PT',
    roomType: 'multipurpose',
    capacity: 15,
    description: 'Yoga, gian co va PT ca nhan 1-1',
  },
]

const EQUIPMENT_DATA: {
  roomCode: string
  equipmentCode: string
  name: string
  importDate: Date
  warrantyUntil: Date | null
  status: EquipmentStatus
}[] = [
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C001',
    name: 'May Chay Bo Life Fitness #1',
    importDate: new Date('2024-01-15'),
    warrantyUntil: new Date('2027-01-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C002',
    name: 'May Chay Bo Life Fitness #2',
    importDate: new Date('2024-01-15'),
    warrantyUntil: new Date('2027-01-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C003',
    name: 'Xe Dap Tap Technogym',
    importDate: new Date('2024-03-10'),
    warrantyUntil: new Date('2027-03-10'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W001',
    name: 'Bo Ta Don 5-40kg',
    importDate: new Date('2024-01-20'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W002',
    name: 'May Ep Nguc Life Fitness',
    importDate: new Date('2023-06-01'),
    warrantyUntil: new Date('2026-06-01'),
    status: EquipmentStatus.repairing,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W003',
    name: 'May Keo Cap Lat Pulldown',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W004',
    name: 'Ghe Tap Bung Bao Ve Lung',
    importDate: new Date('2024-02-10'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-003',
    equipmentCode: 'EQP-Y001',
    name: 'Bo 15 Tham Yoga Manduka',
    importDate: new Date('2024-02-01'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-003',
    equipmentCode: 'EQP-Y002',
    name: 'Bo Day Khang Luc Theraband',
    importDate: new Date('2024-02-01'),
    warrantyUntil: null,
    status: EquipmentStatus.active,
  },
  // Cardio bo sung (ROOM-001)
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C004',
    name: 'Elliptical Trainer Technogym',
    importDate: new Date('2024-03-10'),
    warrantyUntil: new Date('2027-03-10'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C005',
    name: 'May Cheo Thuyen Concept2',
    importDate: new Date('2024-06-15'),
    warrantyUntil: new Date('2027-06-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-001',
    equipmentCode: 'EQP-C006',
    name: 'Air Bike Assault Fitness',
    importDate: new Date('2024-08-20'),
    warrantyUntil: new Date('2026-08-20'),
    status: EquipmentStatus.active,
  },
  // Strength bo sung (ROOM-002)
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W005',
    name: 'May Ep Chan Life Fitness',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W006',
    name: 'May Dui Truoc Leg Extension',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W007',
    name: 'May Dui Sau Leg Curl',
    importDate: new Date('2023-09-15'),
    warrantyUntil: new Date('2026-09-15'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W008',
    name: 'May Cap Da Nang Functional Trainer',
    importDate: new Date('2024-01-20'),
    warrantyUntil: new Date('2027-01-20'),
    status: EquipmentStatus.active,
  },
  {
    roomCode: 'ROOM-002',
    equipmentCode: 'EQP-W009',
    name: 'Smith Machine',
    importDate: new Date('2024-01-20'),
    warrantyUntil: new Date('2027-01-20'),
    status: EquipmentStatus.active,
  },
]

// ---------------------------------------------------------------------------
// Seed functions: Packages / Rooms+Equipment / Subscriptions+Payments
// ---------------------------------------------------------------------------

async function seedPackages(): Promise<Map<string, bigint>> {
  const map = new Map<string, bigint>()
  for (const p of PACKAGES_DATA) {
    const row = await prisma.package.upsert({
      where: { packageCode: p.packageCode },
      update: {
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        benefits: p.benefits,
        status: p.status,
      },
      create: {
        packageCode: p.packageCode,
        name: p.name,
        durationDays: p.durationDays,
        price: p.price,
        benefits: p.benefits,
        status: p.status,
      },
    })
    map.set(p.packageCode, row.packageId)
  }
  console.log(`[seed] seeded ${PACKAGES_DATA.length} packages`)
  return map
}

async function seedRoomsAndEquipment(): Promise<{
  roomMap: Map<string, bigint>
  equipMap: Map<string, bigint>
}> {
  const roomMap = new Map<string, bigint>()
  for (const r of ROOMS_DATA) {
    const row = await prisma.gymRoom.upsert({
      where: { roomCode: r.roomCode },
      update: {
        name: r.name,
        roomType: r.roomType,
        capacity: r.capacity,
        description: r.description,
      },
      create: r,
    })
    roomMap.set(r.roomCode, row.roomId)
  }

  const equipMap = new Map<string, bigint>()
  for (const e of EQUIPMENT_DATA) {
    const roomId = roomMap.get(e.roomCode)!
    const row = await prisma.equipment.upsert({
      where: { equipmentCode: e.equipmentCode },
      update: { name: e.name, status: e.status },
      create: {
        roomId,
        equipmentCode: e.equipmentCode,
        name: e.name,
        importDate: e.importDate,
        warrantyUntil: e.warrantyUntil,
        status: e.status,
      },
    })
    equipMap.set(e.equipmentCode, row.equipmentId)
  }

  // 1 maintenance log cho may ep nguc dang sua chua
  const staffLinh = await prisma.staff.findUnique({ where: { staffCode: 'STF-STA-001' } })
  if (staffLinh) {
    await prisma.maintenanceLog.deleteMany({ where: { equipmentId: equipMap.get('EQP-W002') } })
    await prisma.maintenanceLog.create({
      data: {
        equipmentId: equipMap.get('EQP-W002')!,
        reportedByStaffId: staffLinh.staffId,
        description:
          'May ep nguc bi tieng keu bat thuong, lo xo ben phai co dau hieu gian ra. Can kiem tra va thay the linh kien.',
        status: MaintenanceStatus.repairing,
        reportedAt: new Date('2026-05-20T09:00:00'),
      },
    })
  }

  console.log(
    `[seed] seeded ${ROOMS_DATA.length} rooms, ${EQUIPMENT_DATA.length} equipment, 1 maintenance log`
  )
  return { roomMap, equipMap }
}

async function seedSubscriptionsAndPayments(pkgMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where: {
      memberCode: {
        in: [
          'MB-2026-0001',
          'MB-2026-0002',
          'MB-2026-0003',
          'MB-2026-0004',
          'MB-2026-0005',
          'MB-2026-0006',
          ...TRAINER_MINH_MEMBER_CODES,
        ],
      },
    },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))

  type SubEntry = {
    memberCode: string
    pkgCode: string
    startDate: Date
    endDate: Date
    status: SubscriptionStatus
    cancelledAt?: Date
    payment?: { paidAt: Date; method: PaymentMethod; amount: number }
  }
  const subData: SubEntry[] = [
    {
      memberCode: 'MB-2026-0001',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-05-29'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-03-01T10:30:00'),
        method: PaymentMethod.cash,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0002',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-05-05'),
      endDate: new Date('2026-06-04'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-05T14:00:00'),
        method: PaymentMethod.bank_card,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0003',
      pkgCode: 'PKG-0003',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-07-14'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-01-15T09:00:00'),
        method: PaymentMethod.ewallet,
        amount: 2000000,
      },
    },
    {
      memberCode: 'MB-2026-0004',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-30'),
      status: SubscriptionStatus.pending,
    },
    {
      memberCode: 'MB-2026-0005',
      pkgCode: 'PKG-0002',
      startDate: new Date('2025-11-15'),
      endDate: new Date('2026-02-13'),
      status: SubscriptionStatus.expired,
      payment: {
        paidAt: new Date('2025-11-15T11:00:00'),
        method: PaymentMethod.cash,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0006',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-03-02'),
      status: SubscriptionStatus.cancelled,
      cancelledAt: new Date('2026-02-15T10:00:00'),
      payment: {
        paidAt: new Date('2026-02-01T15:00:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0007',
      pkgCode: 'PKG-0003',
      startDate: new Date('2026-04-20'),
      endDate: new Date('2026-10-16'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-04-20T09:15:00'),
        method: PaymentMethod.bank_card,
        amount: 2000000,
      },
    },
    {
      memberCode: 'MB-2026-0008',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-04-25'),
      endDate: new Date('2026-07-23'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-04-25T10:30:00'),
        method: PaymentMethod.ewallet,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0009',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-07-04'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-06-05T08:45:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0010',
      pkgCode: 'PKG-0004',
      startDate: new Date('2026-05-08'),
      endDate: new Date('2027-05-07'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-08T15:00:00'),
        method: PaymentMethod.bank_card,
        amount: 3500000,
      },
    },
    {
      memberCode: 'MB-2026-0011',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-05-15'),
      endDate: new Date('2026-08-12'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-15T11:20:00'),
        method: PaymentMethod.cash,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0012',
      pkgCode: 'PKG-0003',
      startDate: new Date('2026-05-22'),
      endDate: new Date('2026-11-17'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-22T17:10:00'),
        method: PaymentMethod.ewallet,
        amount: 2000000,
      },
    },
    {
      memberCode: 'MB-2026-0013',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-05-28'),
      endDate: new Date('2026-06-26'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-05-28T07:50:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
    {
      memberCode: 'MB-2026-0014',
      pkgCode: 'PKG-0002',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-29'),
      status: SubscriptionStatus.active,
      payment: {
        paidAt: new Date('2026-06-01T13:40:00'),
        method: PaymentMethod.bank_card,
        amount: 1200000,
      },
    },
    {
      memberCode: 'MB-2026-0015',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-07-04'),
      status: SubscriptionStatus.pending,
    },
    {
      memberCode: 'MB-2026-0016',
      pkgCode: 'PKG-0001',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-30'),
      status: SubscriptionStatus.expired,
      payment: {
        paidAt: new Date('2026-04-01T16:30:00'),
        method: PaymentMethod.cash,
        amount: 500000,
      },
    },
  ]

  let paymentCount = 0
  for (const s of subData) {
    const sub = await prisma.subscription.create({
      data: {
        memberId: mMap.get(s.memberCode)!,
        packageId: pkgMap.get(s.pkgCode)!,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        cancelledAt: s.cancelledAt,
      },
    })
    if (s.payment) {
      await prisma.payment.create({
        data: {
          memberId: mMap.get(s.memberCode)!,
          subscriptionId: sub.subscriptionId,
          amount: s.payment.amount,
          method: s.payment.method,
          status: PaymentStatus.success,
          paidAt: s.payment.paidAt,
        },
      })
      paymentCount++
    }
  }
  console.log(`[seed] seeded ${subData.length} subscriptions + ${paymentCount} payments`)
}

// ---------------------------------------------------------------------------
// Seed functions: Schedules / Progress / Sessions / Attendance / Feedback
// ---------------------------------------------------------------------------

async function seedStaffSchedules(): Promise<void> {
  const staffList = await prisma.staff.findMany({
    where: { staffCode: { in: ['STF-STA-001', 'STF-PT-001', 'STF-PT-002'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))

  await prisma.staffSchedule.deleteMany({})
  await prisma.staffSchedule.createMany({
    data: [
      // Linh (staff): ca sang, ca tuan
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-26'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-27'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-28'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-29'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-30'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-06-02'),
      },
      {
        staffId: sMap.get('STF-STA-001')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-06-03'),
      },
      // Minh (PT): ca chieu, Mon/Wed/Fri
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-05-26'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-05-28'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-05-30'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-06-02'),
      },
      {
        staffId: sMap.get('STF-PT-001')!,
        shift: StaffShift.afternoon,
        workDate: new Date('2026-06-04'),
      },
      // Huong (PT): ca sang, Tue/Thu/Sat
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-27'),
      },
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-29'),
      },
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-05-31'),
      },
      {
        staffId: sMap.get('STF-PT-002')!,
        shift: StaffShift.morning,
        workDate: new Date('2026-06-03'),
      },
    ],
  })
  console.log('[seed] seeded 16 staff schedules')
}

async function seedMemberProgress(): Promise<void> {
  const members = await prisma.member.findMany({
    where: {
      memberCode: {
        in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0003', ...TRAINER_MINH_MEMBER_CODES],
      },
    },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffMinh = await prisma.staff.findUnique({
    where: { staffCode: 'STF-PT-001' },
    select: { staffId: true },
  })
  if (!staffMinh) return

  await prisma.memberProgress.deleteMany({})
  await prisma.memberProgress.createMany({
    data: [
      // Nguyen Van A — giam can, theo do 3 lan
      {
        memberId: mMap.get('MB-2026-0001')!,
        staffId: staffMinh.staffId,
        weight: 75.0,
        bmi: 23.5,
        goal: 'Giam mo bung, tang co bap tay va nguc',
        notes: 'The luc tot, can cai thien che do an',
        recordedAt: new Date('2026-03-15T09:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        staffId: staffMinh.staffId,
        weight: 73.2,
        bmi: 22.9,
        goal: 'Giam mo bung, tang co bap tay va nguc',
        notes: 'Giam 1.8kg sau 5 tuan, tien do tot',
        recordedAt: new Date('2026-04-20T09:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        staffId: staffMinh.staffId,
        weight: 71.5,
        bmi: 22.3,
        goal: 'Giam mo bung, tang co bap tay va nguc',
        notes: 'Dat muc tieu -3.5kg, tiep tuc duy tri gian do',
        recordedAt: new Date('2026-05-25T09:00:00'),
      },
      // Tran Thi B — giam can nhe, theo do 2 lan
      {
        memberId: mMap.get('MB-2026-0002')!,
        staffId: staffMinh.staffId,
        weight: 58.0,
        bmi: 22.1,
        goal: 'Giam can, tang cuong suc de khang',
        notes: 'Tap trung cardio va dinh duong',
        recordedAt: new Date('2026-05-08T10:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0002')!,
        staffId: staffMinh.staffId,
        weight: 57.0,
        bmi: 21.7,
        goal: 'Giam can, tang cuong suc de khang',
        notes: 'Giam 1kg sau 3 tuan, nang luong on dinh',
        recordedAt: new Date('2026-05-22T10:00:00'),
      },
      // Le Van C — tang co bap, theo do 3 lan
      {
        memberId: mMap.get('MB-2026-0003')!,
        staffId: staffMinh.staffId,
        weight: 85.0,
        bmi: 27.3,
        goal: 'Tang co bap, giam mo the',
        notes: 'Can can bang protein + carb',
        recordedAt: new Date('2026-01-20T14:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0003')!,
        staffId: staffMinh.staffId,
        weight: 83.5,
        bmi: 26.8,
        goal: 'Tang co bap, giam mo the',
        notes: 'Tang suc manh squat & deadlift ro rang',
        recordedAt: new Date('2026-03-15T14:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0003')!,
        staffId: staffMinh.staffId,
        weight: 82.0,
        bmi: 26.3,
        goal: 'Tang co bap, giam mo the',
        notes: 'Tien do tot, can them thoi gian nghi phuc hoi',
        recordedAt: new Date('2026-05-10T14:00:00'),
      },
      // Mock students cua trainer Minh
      {
        memberId: mMap.get('MB-2026-0007')!,
        staffId: staffMinh.staffId,
        weight: 81.5,
        bmi: 26.1,
        goal: 'Giam 6kg va cai thien suc ben',
        notes: 'Danh gia ban dau, uu tien cardio nhe',
        recordedAt: new Date('2026-04-22T08:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0007')!,
        staffId: staffMinh.staffId,
        weight: 79.8,
        bmi: 25.6,
        goal: 'Giam 6kg va cai thien suc ben',
        notes: 'Duy tri tot lich tap 3 buoi moi tuan',
        recordedAt: new Date('2026-05-18T08:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0007')!,
        staffId: staffMinh.staffId,
        weight: 78.6,
        bmi: 25.2,
        goal: 'Giam 6kg va cai thien suc ben',
        notes: 'Tien do on dinh, tang them cardio cuoi buoi',
        recordedAt: new Date('2026-06-08T08:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0008')!,
        staffId: staffMinh.staffId,
        weight: 54.0,
        bmi: 20.3,
        goal: 'Tang co than duoi va cai thien tu the',
        notes: 'Can tap trung squat va hip hinge dung ky thuat',
        recordedAt: new Date('2026-04-28T09:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0008')!,
        staffId: staffMinh.staffId,
        weight: 54.8,
        bmi: 20.6,
        goal: 'Tang co than duoi va cai thien tu the',
        notes: 'Suc manh chan tang, tu the squat tot hon',
        recordedAt: new Date('2026-06-06T09:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0009')!,
        staffId: staffMinh.staffId,
        weight: 92.0,
        bmi: 29.4,
        goal: 'Giam mo va kiem soat huyet ap',
        notes: 'Bat dau voi cuong do thap, theo doi nhip tim',
        recordedAt: new Date('2026-05-03T17:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0009')!,
        staffId: staffMinh.staffId,
        weight: 89.7,
        bmi: 28.7,
        goal: 'Giam mo va kiem soat huyet ap',
        notes: 'Giam 2.3kg, kha nang phuc hoi tot',
        recordedAt: new Date('2026-06-07T17:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0010')!,
        staffId: staffMinh.staffId,
        weight: 49.5,
        bmi: 18.9,
        goal: 'Tang 3kg co nac',
        notes: 'Can tang protein va tap khang luc deu',
        recordedAt: new Date('2026-05-10T10:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0010')!,
        staffId: staffMinh.staffId,
        weight: 50.4,
        bmi: 19.2,
        goal: 'Tang 3kg co nac',
        notes: 'Tang can dung huong, tiep tuc giu muc ta',
        recordedAt: new Date('2026-06-09T10:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0011')!,
        staffId: staffMinh.staffId,
        weight: 76.2,
        bmi: 24.1,
        goal: 'Tang suc manh tong the',
        notes: 'Nen tang tot, can cai thien do linh hoat vai',
        recordedAt: new Date('2026-05-17T15:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0011')!,
        staffId: staffMinh.staffId,
        weight: 76.8,
        bmi: 24.3,
        goal: 'Tang suc manh tong the',
        notes: 'Bench press va deadlift tien bo ro',
        recordedAt: new Date('2026-06-08T15:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0012')!,
        staffId: staffMinh.staffId,
        weight: 61.0,
        bmi: 22.4,
        goal: 'Giam dau lung va tang do deo dai',
        notes: 'Uu tien core, mobility va ky thuat tho',
        recordedAt: new Date('2026-05-25T18:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0013')!,
        staffId: staffMinh.staffId,
        weight: 84.3,
        bmi: 27.0,
        goal: 'Giam mo noi tang',
        notes: 'Lich tap 3 buoi, ket hop di bo moi ngay',
        recordedAt: new Date('2026-05-30T07:00:00'),
      },
      {
        memberId: mMap.get('MB-2026-0014')!,
        staffId: staffMinh.staffId,
        weight: 52.6,
        bmi: 19.8,
        goal: 'Tang suc ben va giu dang',
        notes: 'Danh gia dau vao, the luc kha',
        recordedAt: new Date('2026-06-03T16:00:00'),
      },
    ],
  })
  console.log('[seed] seeded 22 member progress records')
}

async function seedTrainingSessions(roomMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where: { memberCode: { in: ['MB-2026-0001', 'MB-2026-0002', ...TRAINER_MINH_MEMBER_CODES] } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffList = await prisma.staff.findMany({
    where: { staffCode: { in: ['STF-PT-001', 'STF-PT-002'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))
  const roomId = roomMap.get('ROOM-003')!

  await prisma.trainingSession.deleteMany({})
  await prisma.trainingSession.createMany({
    data: [
      // Member A + Trainer Minh
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-05-20T07:00:00'),
        endTime: new Date('2026-05-20T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-05-22T07:00:00'),
        endTime: new Date('2026-05-22T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-05-27T07:00:00'),
        endTime: new Date('2026-05-27T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0001')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-02T07:00:00'),
        endTime: new Date('2026-06-02T08:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // Member B + Trainer Huong
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-05-20T09:00:00'),
        endTime: new Date('2026-05-20T10:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-05-27T09:00:00'),
        endTime: new Date('2026-05-27T10:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0002')!,
        trainerStaffId: sMap.get('STF-PT-002')!,
        roomId,
        startTime: new Date('2026-06-03T09:00:00'),
        endTime: new Date('2026-06-03T10:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      // 10 mock members cua Trainer Minh
      {
        memberId: mMap.get('MB-2026-0007')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-03T07:00:00'),
        endTime: new Date('2026-06-03T08:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0007')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-11T07:00:00'),
        endTime: new Date('2026-06-11T08:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      {
        memberId: mMap.get('MB-2026-0008')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-04T08:30:00'),
        endTime: new Date('2026-06-04T09:30:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0008')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-12T08:30:00'),
        endTime: new Date('2026-06-12T09:30:00'),
        status: TrainingSessionStatus.scheduled,
      },
      {
        memberId: mMap.get('MB-2026-0009')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-06T10:00:00'),
        endTime: new Date('2026-06-06T11:00:00'),
        status: TrainingSessionStatus.cancelled,
      },
      {
        memberId: mMap.get('MB-2026-0009')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-13T10:00:00'),
        endTime: new Date('2026-06-13T11:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      {
        memberId: mMap.get('MB-2026-0010')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-07T14:00:00'),
        endTime: new Date('2026-06-07T15:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0010')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-14T14:00:00'),
        endTime: new Date('2026-06-14T15:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      {
        memberId: mMap.get('MB-2026-0011')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-08T15:30:00'),
        endTime: new Date('2026-06-08T16:30:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0011')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-15T15:30:00'),
        endTime: new Date('2026-06-15T16:30:00'),
        status: TrainingSessionStatus.scheduled,
      },
      {
        memberId: mMap.get('MB-2026-0012')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-09T17:00:00'),
        endTime: new Date('2026-06-09T18:00:00'),
        status: TrainingSessionStatus.completed,
      },
      {
        memberId: mMap.get('MB-2026-0012')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-16T17:00:00'),
        endTime: new Date('2026-06-16T18:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
      {
        memberId: mMap.get('MB-2026-0013')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-17T07:30:00'),
        endTime: new Date('2026-06-17T08:30:00'),
        status: TrainingSessionStatus.scheduled,
      },
      {
        memberId: mMap.get('MB-2026-0014')!,
        trainerStaffId: sMap.get('STF-PT-001')!,
        roomId,
        startTime: new Date('2026-06-18T16:00:00'),
        endTime: new Date('2026-06-18T17:00:00'),
        status: TrainingSessionStatus.scheduled,
      },
    ],
  })
  console.log('[seed] seeded 21 training sessions')
}

async function seedAttendanceLogs(): Promise<void> {
  const activeSubs = await prisma.subscription.findMany({
    where: { status: SubscriptionStatus.active },
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

  const logs: {
    subscriptionId: bigint
    memberId: bigint
    startTime: Date
    endTime: Date
    method: AttendanceMethod
  }[] = []
  for (const sub of activeSubs) {
    // Moi member check-in 4-6 lan tuy memberId
    const count = 4 + Number(sub.memberId % 3n)
    for (const [start, end] of checkInSlots.slice(0, count)) {
      logs.push({
        subscriptionId: sub.subscriptionId,
        memberId: sub.memberId,
        startTime: start,
        endTime: end,
        method: AttendanceMethod.manual,
      })
    }
  }

  await prisma.attendanceLog.createMany({ data: logs })
  console.log(`[seed] seeded ${logs.length} attendance logs`)
}

async function seedFeedback(equipMap: Map<string, bigint>): Promise<void> {
  const members = await prisma.member.findMany({
    where: { memberCode: { in: ['MB-2026-0001', 'MB-2026-0002', 'MB-2026-0003'] } },
    select: { memberId: true, memberCode: true },
  })
  const mMap = new Map(members.map((m) => [m.memberCode, m.memberId]))
  const staffList = await prisma.staff.findMany({
    where: { staffCode: { in: ['STF-STA-001', 'STF-PT-001'] } },
    select: { staffId: true, staffCode: true },
  })
  const sMap = new Map(staffList.map((s) => [s.staffCode, s.staffId]))

  await prisma.feedback.deleteMany({})
  for (const fb of [
    {
      memberId: mMap.get('MB-2026-0001')!,
      feedbackType: FeedbackType.service,
      content:
        'Phong tap sach se, nhan vien than thien. De nghi mo them gio buoi toi (sau 21:00) de phu hop voi lich lam viec cua hoi vien.',
      severity: FeedbackSeverity.low,
      status: FeedbackStatus.resolved,
      handledByStaffId: sMap.get('STF-STA-001')!,
      handledAt: new Date('2026-03-10T11:00:00'),
      createdAt: new Date('2026-03-08T18:00:00'),
    },
    {
      memberId: mMap.get('MB-2026-0002')!,
      feedbackType: FeedbackType.equipment,
      content:
        'May ep nguc khu vuc ta may bi tieng keu bat thuong khi su dung. Toi khong dam dung vi lo ngai mat an toan.',
      severity: FeedbackSeverity.medium,
      status: FeedbackStatus.in_progress,
      subjectEquipmentId: equipMap.get('EQP-W002')!,
      handledByStaffId: sMap.get('STF-STA-001')!,
      handledAt: new Date('2026-05-21T09:00:00'),
      createdAt: new Date('2026-05-20T19:30:00'),
    },
    {
      memberId: mMap.get('MB-2026-0003')!,
      feedbackType: FeedbackType.staff,
      content:
        'PT Minh rat nhiet tinh va chuyen nghiep. Giao trinh phu hop trinh do, toi cam thay tien bo ro rang sau 2 thang tap.',
      severity: FeedbackSeverity.low,
      status: FeedbackStatus.open,
      subjectStaffId: sMap.get('STF-PT-001')!,
      createdAt: new Date('2026-05-25T20:00:00'),
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
  const [staffMinh, memberA, showcaseMember] = await Promise.all([
    prisma.staff.findUnique({ where: { staffCode: 'STF-PT-001' }, select: { staffId: true } }),
    prisma.member.findUnique({ where: { memberCode: 'MB-2026-0001' }, select: { memberId: true } }),
    prisma.member.findUnique({ where: { memberCode: 'MB-2026-0007' }, select: { memberId: true } }),
  ])
  if (!staffMinh || !memberA || !showcaseMember) return

  // Xoa workout data truoc (idempotent khi chay lai)
  await prisma.workoutLogSet.deleteMany({})
  await prisma.workoutLog.deleteMany({})
  await prisma.memberWorkoutPlan.deleteMany({})
  await prisma.workoutPlan.deleteMany({ where: { creatorStaffId: staffMinh.staffId } })

  const exercises = await prisma.exercise.findMany({
    where: {
      name: {
        in: [
          ...new Set(
            TRAINER_MINH_FOUR_WEEK_PLAN.flatMap((day) =>
              day.exercises.map((exercise) => exercise.name)
            )
          ),
        ],
      },
    },
    select: { exerciseId: true, name: true },
  })
  const exMap = new Map(exercises.map((e) => [e.name, e.exerciseId]))

  // Tao plan
  const plan = await prisma.workoutPlan.create({
    data: {
      creatorStaffId: staffMinh.staffId,
      creatorType: PlanCreatorType.staff,
      name: 'Chuong Trinh Suc Manh Nen Tang 4 Tuan',
      description:
        'Giao an 4 tuan, 3 buoi moi tuan, day du set, rep, thoi gian tap va thoi gian nghi.',
      status: WorkoutPlanStatus.active,
    },
  })

  const createdDays = []
  for (const dayDefinition of TRAINER_MINH_FOUR_WEEK_PLAN) {
    const day = await prisma.workoutPlanDay.create({
      data: {
        planId: plan.planId,
        weekNumber: dayDefinition.weekNumber,
        dayOfWeek: dayDefinition.dayOfWeek,
        dayNumber: dayDefinition.dayNumber,
        name: dayDefinition.name,
        notes: dayDefinition.notes,
      },
    })
    createdDays.push(day)

    await prisma.workoutPlanExercise.createMany({
      data: dayDefinition.exercises.map((exercise, index) => ({
        planDayId: day.planDayId,
        exerciseId: exMap.get(exercise.name)!,
        orderIndex: index + 1,
        targetSets: exercise.sets,
        targetReps: exercise.reps ?? null,
        targetDurationSec: exercise.durationSec,
        targetWeightKg: exercise.weightKg ?? null,
        restSeconds: exercise.restSec,
        notes: exercise.notes,
      })),
    })
  }
  const day1 = createdDays[0]

  // Gan plan cho Member A
  const assignment = await prisma.memberWorkoutPlan.create({
    data: {
      memberId: memberA.memberId,
      planId: plan.planId,
      assignedByStaffId: staffMinh.staffId,
      startDate: new Date('2026-03-15'),
      status: WorkoutAssignmentStatus.active,
      notes: 'Tap 3 buoi/tuan (Mon-Wed-Fri). Nghi it nhat 1 ngay giua cac buoi.',
    },
  })

  // Mock member dau tien cua Trainer Minh co san giao an active de test tab "Giao an".
  await prisma.memberWorkoutPlan.create({
    data: {
      memberId: showcaseMember.memberId,
      planId: plan.planId,
      assignedByStaffId: staffMinh.staffId,
      startDate: new Date('2026-05-01'),
      status: WorkoutAssignmentStatus.active,
      notes: 'Mock assignment cho man hinh chi tiet hoc vien cua Trainer Minh.',
    },
  })

  // 1 workout log: Member A, Day 1, ngay 2026-05-26
  const day1Exercises = await prisma.workoutPlanExercise.findMany({
    where: { planDayId: day1.planDayId },
    select: { planExerciseId: true, orderIndex: true },
    orderBy: { orderIndex: 'asc' },
  })
  const log = await prisma.workoutLog.create({
    data: {
      memberId: memberA.memberId,
      assignmentId: assignment.assignmentId,
      planDayId: day1.planDayId,
      loggedAt: new Date('2026-05-26T07:30:00'),
      durationMin: 50,
      notes: 'Cam giac tot, tang trong luong bench press so voi buoi truoc.',
    },
  })

  const [benchEx, pushupEx] = day1Exercises
  await prisma.workoutLogSet.createMany({
    data: [
      // Bench Press
      {
        logId: log.logId,
        planExerciseId: benchEx.planExerciseId,
        setNumber: 1,
        actualReps: 10,
        actualWeightKg: 40,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: benchEx.planExerciseId,
        setNumber: 2,
        actualReps: 10,
        actualWeightKg: 42.5,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: benchEx.planExerciseId,
        setNumber: 3,
        actualReps: 9,
        actualWeightKg: 42.5,
        completed: true,
      },
      // Push-up
      {
        logId: log.logId,
        planExerciseId: pushupEx.planExerciseId,
        setNumber: 1,
        actualReps: 15,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: pushupEx.planExerciseId,
        setNumber: 2,
        actualReps: 15,
        completed: true,
      },
      {
        logId: log.logId,
        planExerciseId: pushupEx.planExerciseId,
        setNumber: 3,
        actualReps: 12,
        completed: true,
      },
    ],
  })
  console.log('[seed] seeded 1 workout plan (4 weeks, 12 days) + 2 assignments + 1 log + 6 sets')
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
    users: await prisma.user.count(),
    staff: await prisma.staff.count(),
    members: await prisma.member.count(),
    packages: await prisma.package.count(),
    subscriptions: await prisma.subscription.count(),
    payments: await prisma.payment.count(),
    rooms: await prisma.gymRoom.count(),
    equipment: await prisma.equipment.count(),
    groups: await prisma.group.count(),
    permissions: await prisma.permission.count(),
    exercises: await prisma.exercise.count(),
    workout_plans: await prisma.workoutPlan.count(),
    attendance_logs: await prisma.attendanceLog.count(),
    feedback: await prisma.feedback.count(),
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
