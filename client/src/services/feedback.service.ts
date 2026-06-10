import api from './api'

export interface Feedback {
  feedbackId: string
  memberId: string
  memberCode?: string
  feedbackType: 'staff' | 'equipment' | 'service'
  content: string
  severity: 'low' | 'medium' | 'high'
  status: 'open' | 'in_progress' | 'resolved' | 'rejected'
  handledByStaffId?: string
  handledAt?: string
  subjectStaffId?: string
  subjectEquipmentId?: string
  createdAt: string
  sla?: { dueAt: string; overdue: boolean }
  member?: { fullName: string; memberCode: string }
  handledByStaff?: { fullName: string; staffCode: string }
  subjectStaff?: { fullName: string; staffCode: string }
  subjectEquipment?: { name: string; equipmentCode: string }
}

export interface FeedbackListParams {
  page?: number
  pageSize?: number
  status?: string
  feedbackType?: string
  severity?: string
  overdue?: boolean
  sort?: string
}

export interface PageMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

const feedbackService = {
  list: async (params?: FeedbackListParams): Promise<{ data: Feedback[]; meta: PageMeta }> => {
    const res = await api.get('/feedback', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  get: async (id: string): Promise<Feedback> => {
    const res = await api.get(`/feedback/${id}`)
    return res.data.data
  },

  create: async (dto: {
    memberId?: string
    feedbackType: string
    content: string
    severity?: string
    subjectStaffId?: string
    subjectEquipmentId?: string
  }): Promise<Feedback> => {
    const res = await api.post('/feedback', dto)
    return res.data.data
  },

  assign: async (id: string, handledByStaffId?: string): Promise<Feedback> => {
    const body = handledByStaffId ? { handledByStaffId } : {}
    const res = await api.patch(`/feedback/${id}/assign`, body)
    return res.data.data
  },

  updateStatus: async (
    id: string,
    dto: {
      status: 'in_progress' | 'resolved' | 'rejected'
      severity?: string
      resolutionNote?: string
    },
  ): Promise<Feedback> => {
    const res = await api.patch(`/feedback/${id}/status`, dto)
    return res.data.data
  },
}

export { feedbackService }
