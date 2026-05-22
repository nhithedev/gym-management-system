import api from './api'

export interface Subscription {
  subscriptionId: string
  memberId: string
  packageId: string
  packageName: string | null
  startDate: string
  endDate: string
  status: 'pending' | 'active' | 'expired' | 'cancelled'
  daysLeft: number | null
  cancelledAt: string | null
  createdAt: string
}

const subscriptionService = {
  getByMember: async (memberId: string): Promise<Subscription[]> => {
    const res = await api.get<{ success: boolean; data: Subscription[] }>(
      `/subscriptions/member/${memberId}`,
    )
    return res.data.data
  },

  create: async (memberId: string, packageId: string): Promise<Subscription> => {
    const res = await api.post<{ success: boolean; data: Subscription }>(
      '/subscriptions',
      { memberId: Number(memberId), packageId: Number(packageId) },
    )
    return res.data.data
  },

  cancel: async (subscriptionId: string): Promise<Subscription> => {
    const res = await api.patch<{ success: boolean; data: Subscription }>(
      `/subscriptions/${subscriptionId}/cancel`,
    )
    return res.data.data
  },
}

export default subscriptionService
