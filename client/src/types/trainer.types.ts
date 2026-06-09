// Trainer-related types

export interface TrainingSession {
  id: string
  trainerId: string
  memberId: string
  scheduledAt: string
  duration: number
  status: 'scheduled' | 'completed' | 'cancelled'
  note?: string
}

export interface Exercise {
  id: string
  name: string
  description?: string
  muscleGroup?: string
  equipmentRequired?: string
}

export interface WorkoutPlan {
  id: string
  trainerId: string
  memberId: string
  name: string
  description?: string
  exercises: WorkoutPlanExercise[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutPlanExercise {
  exerciseId: string
  exerciseName?: string
  sets: number
  reps: number
  restSeconds?: number
  note?: string
}

export interface LessonPlan {
  id: string
  trainerId: string
  title: string
  description?: string
  sessionIds: string[]
  createdAt: string
  updatedAt: string
}
