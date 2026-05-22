import api from './api'

export interface Permission {
  permissionId: string
  code: string
  name: string
  description: string | null
}

export interface Group {
  groupId: string
  name: string
  description: string | null
  memberCount: number
  permissionCount?: number
  permissions?: Permission[]
  deletedAt: string | null
}

export interface UserAdmin {
  userId: string
  email: string
  fullName: string
  phone: string | null
  status: 'active' | 'pending_verification' | 'locked'
  emailVerifiedAt: string | null
  roles: string[]
  createdAt: string
  deletedAt: string | null
}

export interface Meta {
  page: number
  pageSize: number
  total: number
}

const rbacService = {
  // ── Permissions ──────────────────────────────────────────────

  async listPermissions(page = 1, pageSize = 50, resource?: string) {
    const params: Record<string, unknown> = { page, pageSize }
    if (resource) params.resource = resource
    const res = await api.get<{ success: boolean; data: Permission[]; meta: Meta }>('/permissions', { params })
    return res.data
  },

  // ── Groups ───────────────────────────────────────────────────

  async listGroups(page = 1, pageSize = 20, search?: string) {
    const params: Record<string, unknown> = { page, pageSize }
    if (search) params.search = search
    const res = await api.get<{ success: boolean; data: Group[]; meta: Meta }>('/groups', { params })
    return res.data
  },

  async getGroup(id: string) {
    const res = await api.get<{ success: boolean; data: Group }>(`/groups/${id}`)
    return res.data
  },

  async createGroup(body: { name: string; description: string; permissions?: string[] }) {
    const res = await api.post<{ success: boolean; data: Group }>('/groups', body)
    return res.data
  },

  async updateGroup(id: string, body: { name?: string; description?: string }) {
    const res = await api.patch<{ success: boolean; data: Group }>(`/groups/${id}`, body)
    return res.data
  },

  async deleteGroup(id: string) {
    await api.delete(`/groups/${id}`)
  },

  async assignPermissions(groupId: string, permissions: string[]) {
    const res = await api.post<{ success: boolean; data: { groupId: string; added: string[]; skipped: string[] } }>(
      `/groups/${groupId}/permissions`,
      { permissions },
    )
    return res.data
  },

  async revokePermission(groupId: string, permissionId: string) {
    await api.delete(`/groups/${groupId}/permissions/${permissionId}`)
  },

  // ── Users ────────────────────────────────────────────────────

  async listUsers(params: {
    page?: number
    pageSize?: number
    search?: string
    role?: string
    status?: string
    groupId?: string
  } = {}) {
    const res = await api.get<{ success: boolean; data: UserAdmin[]; meta: Meta }>('/users', { params })
    return res.data
  },

  async getUser(id: string) {
    const res = await api.get<{ success: boolean; data: UserAdmin & { groups: { groupId: string; name: string }[]; member: unknown; staff: unknown } }>(`/users/${id}`)
    return res.data
  },

  async updateUser(id: string, body: { fullName?: string; phone?: string; status?: string }) {
    const res = await api.patch<{ success: boolean; data: UserAdmin }>(`/users/${id}`, body)
    return res.data
  },

  async deleteUser(id: string) {
    await api.delete(`/users/${id}`)
  },

  async assignUserGroup(userId: string, groupId: string) {
    const res = await api.post<{ success: boolean; data: { userId: string; groupId: string; groupName: string; wasAlreadyAssigned: boolean } }>(
      `/users/${userId}/groups`,
      { groupId },
    )
    return res.data
  },

  async revokeUserGroup(userId: string, groupId: string) {
    await api.delete(`/users/${userId}/groups/${groupId}`)
  },
}

export default rbacService
