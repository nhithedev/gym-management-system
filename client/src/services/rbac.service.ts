import api from './api'

export interface Permission {
  permissionId: string
  code: string
  description: string | null
}

export interface Group {
  groupId: string
  name: string
  description: string | null
  memberCount: number
  permissionCount: number
  deletedAt: string | null
}

export interface GroupDetail extends Group {
  permissions: Permission[]
}

export interface CreateGroupDto {
  name: string
  description?: string
}

export interface UpdateGroupDto {
  name?: string
  description?: string
}

export const rbacService = {
  listPermissions: async (params?: {
    page?: number
    pageSize?: number
    resource?: string
  }): Promise<{ data: Permission[]; meta: { page: number; pageSize: number; total: number } }> => {
    const res = await api.get<{
      success: boolean
      data: Permission[]
      meta: { page: number; pageSize: number; total: number }
    }>('/permissions', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  listGroups: async (params?: {
    page?: number
    pageSize?: number
    search?: string
    includeDeleted?: boolean
  }): Promise<{ data: Group[]; meta: { page: number; pageSize: number; total: number } }> => {
    const res = await api.get<{
      success: boolean
      data: Group[]
      meta: { page: number; pageSize: number; total: number }
    }>('/groups', { params })
    return { data: res.data.data, meta: res.data.meta }
  },

  getGroup: async (id: string): Promise<GroupDetail> => {
    const res = await api.get<{ success: boolean; data: GroupDetail }>(`/groups/${id}`)
    return res.data.data
  },

  createGroup: async (dto: CreateGroupDto): Promise<Group> => {
    const res = await api.post<{ success: boolean; data: Group }>('/groups', dto)
    return res.data.data
  },

  updateGroup: async (id: string, dto: UpdateGroupDto): Promise<Group> => {
    const res = await api.patch<{ success: boolean; data: Group }>(`/groups/${id}`, dto)
    return res.data.data
  },

  deleteGroup: async (id: string): Promise<void> => {
    await api.delete(`/groups/${id}`)
  },

  assignPermissions: async (groupId: string, permissions: string[]): Promise<void> => {
    await api.post(`/groups/${groupId}/permissions`, { permissions })
  },

  revokePermission: async (groupId: string, permissionId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}/permissions/${permissionId}`)
  },
}
