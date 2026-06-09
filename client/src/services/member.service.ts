import api from './api'

export interface MemberProfile {
  memberId: string
  memberCode: string
  userId: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string | null
  address: string | null
  primaryTrainerId: string | null
  trainerName: string | null
  createdAt: string
}

export interface MemberProgress {
  progressId: string
  memberId: string
  weight: number
  bmi: number
  goal: string | null
  notes: string | null
  recordedAt: string
  staffId: string | null
}

export const memberService = {
  getProfile: async (_memberId: string): Promise<MemberProfile> => {
    const res = await api.get<{ success: boolean; data: MemberProfile }>('/members/me')
    return res.data.data
  },

  updateProfile: async (
    _memberId: string,
    data: Partial<Pick<MemberProfile, 'phone' | 'dateOfBirth' | 'address'>>,
  ): Promise<MemberProfile> => {
    const res = await api.patch<{ success: boolean; data: MemberProfile }>('/members/me', data)
    return res.data.data
  },

  getProgress: async (
    memberId: string,
    params?: { from?: string; to?: string; limit?: number },
  ): Promise<MemberProgress[]> => {
    const res = await api.get<{ success: boolean; data: MemberProgress[] }>(
      `/members/${memberId}/progress`,  // training controller: GET /members/:id/progress
      { params },
    )
    return res.data.data
  },
}
