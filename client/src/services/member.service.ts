import api from './api'

export interface Member {
  memberId: string
  memberCode: string
  userId: string
  email: string
  fullName: string
  phone: string
  status: 'pending_verification' | 'active' | 'locked'
  dateOfBirth?: string
  address?: string
  primaryTrainerId?: string
  createdAt: string
}

export interface MemberListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  sort?: string
}

export interface MemberMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface CreateMemberDto {
  fullName: string
  email: string
  phone: string
  dateOfBirth?: string
  address?: string
  packageId: string
  paymentMethod: 'cash' | 'bank_card' | 'ewallet'
  transactionReference?: string
}

const memberService = {
  list: async (params?: MemberListParams): Promise<{ data: Member[]; meta: MemberMeta }> => {
    const res = await api.get('/members', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  get: async (id: string): Promise<Member> => {
    const res = await api.get(`/members/${id}`)
    return res.data.data
  },

  create: async (dto: CreateMemberDto): Promise<Member> => {
    const res = await api.post('/members', dto)
    return res.data.data
  },

  update: async (
    id: string,
    dto: Partial<{ fullName: string; phone: string; address: string; dateOfBirth: string }>,
  ): Promise<Member> => {
    const res = await api.patch(`/members/${id}`, dto)
    return res.data.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/members/${id}`)
  },
}

export { memberService }
