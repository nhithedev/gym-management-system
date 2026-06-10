import api from './api'

export type PaymentMethod = 'cash' | 'bank_card' | 'ewallet'

export interface CreatePaymentPayload {
  memberId: number
  subscriptionId: number
  method: PaymentMethod
  amount: number
  transactionReference?: string
}

export interface Payment {
  paymentId: string
  memberId: string
  subscriptionId: string
  packageName: string
  amount: string
  method: PaymentMethod
  status: 'success' | 'failed'
  transactionReference: string | null
  paidAt: string
}

const paymentService = {
  create: async (payload: CreatePaymentPayload) => {
    const res = await api.post<{ success: boolean; data: unknown }>('/payments', payload)
    return res.data
  },

  listByMember: async (memberId: string): Promise<Payment[]> => {
    const res = await api.get<{ success: boolean; data: Payment[]; meta: unknown }>(
      '/payments',
      { params: { memberId, pageSize: 100 } },
    )
    return res.data.data
  },
}

export default paymentService
