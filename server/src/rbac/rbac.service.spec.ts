import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

jest.mock('../common/guards/permissions.guard', () => ({
  invalidatePermCache: jest.fn(),
}))
import { invalidatePermCache } from '../common/guards/permissions.guard'

import { RbacService } from './rbac.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGroup(overrides: object = {}) {
  return {
    groupId: 1n,
    name: 'custom_group',
    description: 'A custom group',
    deletedAt: null,
    _count: { users: 0, permissions: 0 },
    permissions: [],
    ...overrides,
  }
}

function makeUser(overrides: object = {}) {
  return {
    userId: 50n,
    email: 'user@gym.local',
    fullName: 'Test User',
    phone: null,
    status: 'active',
    emailVerifiedAt: null,
    avatarFileId: null,
    createdAt: new Date(),
    deletedAt: null,
    groups: [],
    member: null,
    staff: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  group: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  groupPermission: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  },
  permission: {
    findMany: jest.fn(),
  },
  userGroup: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  member: {
    update: jest.fn(),
  },
  staff: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockAudit = {
  log: jest.fn(),
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('RbacService', () => {
  let service: RbacService

  beforeEach(() => {
    service = new RbacService(mockPrisma as any, mockAudit as any)
    jest.clearAllMocks()

    // Default transaction passthrough
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn(mockPrisma)
    )
  })

  // ─────────────────────────────────────────────────────────────────
  // createGroup
  // ─────────────────────────────────────────────────────────────────

  describe('createGroup', () => {
    it('throws BadRequestException when name is a system group name', async () => {
      const dto = { name: 'owner', description: 'Trying to create owner group' }

      await expect(service.createGroup(dto as any, 1n)).rejects.toThrow(BadRequestException)
    })

    it('creates group and calls audit.log on happy path', async () => {
      const dto = { name: 'custom_group', description: 'Custom group description' }
      const createdGroup = makeGroup()
      mockPrisma.permission.findMany.mockResolvedValue([])
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) => {
        const tx = { group: { create: jest.fn().mockResolvedValue(createdGroup) } }
        return fn(tx)
      })

      const result = await service.createGroup(dto as any, 1n)

      expect(result.data.name).toBe('custom_group')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'group.create' })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // updateGroup
  // ─────────────────────────────────────────────────────────────────

  describe('updateGroup', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(null)

      await expect(service.updateGroup(1n, { name: 'new_name' } as any, 1n)).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws BadRequestException when trying to rename a system group', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(makeGroup({ name: 'owner' }))

      await expect(service.updateGroup(1n, { name: 'new_name' } as any, 1n)).rejects.toThrow(
        BadRequestException
      )
    })

    it('updates name and description on happy path', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(makeGroup({ name: 'custom_group' }))
      const updated = makeGroup({ name: 'updated_name', description: 'New desc' })
      mockPrisma.group.update.mockResolvedValue(updated)

      const result = await service.updateGroup(
        1n,
        { name: 'updated_name', description: 'New desc' } as any,
        1n
      )

      expect(result.data.name).toBe('updated_name')
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'group.update' })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // deleteGroup
  // ─────────────────────────────────────────────────────────────────

  describe('deleteGroup', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(null)

      await expect(service.deleteGroup(1n, 1n)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when group is a system group', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(makeGroup({ name: 'staff' }))

      await expect(service.deleteGroup(1n, 1n)).rejects.toThrow(ConflictException)
    })

    it('throws ConflictException when group still has users', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(makeGroup({ _count: { users: 3 } }))

      await expect(service.deleteGroup(1n, 1n)).rejects.toThrow(ConflictException)
    })

    it('soft deletes group and calls audit on happy path', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(
        makeGroup({ name: 'custom_group', _count: { users: 0 } })
      )
      mockPrisma.group.update.mockResolvedValue({})

      await service.deleteGroup(1n, 1n)

      expect(mockPrisma.group.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: 1n },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'group.delete' })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // assignPermissions
  // ─────────────────────────────────────────────────────────────────

  describe('assignPermissions', () => {
    it('throws NotFoundException when group does not exist', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(null)

      await expect(service.assignPermissions(1n, ['1'], 1n)).rejects.toThrow(NotFoundException)
    })

    it('creates only permissions not already assigned and calls invalidatePermCache', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(makeGroup())
      // perm 1 already exists, perm 2 is new
      mockPrisma.groupPermission.findMany.mockResolvedValue([{ permissionId: 1n }])
      mockPrisma.groupPermission.createMany.mockResolvedValue({ count: 1 })
      mockPrisma.permission.findMany.mockResolvedValue([
        { permissionId: 1n, code: 'perm.read' },
        { permissionId: 2n, code: 'perm.write' },
      ])

      const result = await service.assignPermissions(1n, ['1', '2'], 1n)

      expect(mockPrisma.groupPermission.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ groupId: 1n, permissionId: 2n }],
        })
      )
      expect(invalidatePermCache).toHaveBeenCalledWith(1n)
      expect(result.data.added).toContain('perm.write')
      expect(result.data.skipped).toContain('perm.read')
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // revokePermission
  // ─────────────────────────────────────────────────────────────────

  describe('revokePermission', () => {
    it('throws NotFoundException when permission assignment does not exist', async () => {
      mockPrisma.groupPermission.findUnique.mockResolvedValue(null)

      await expect(service.revokePermission(1n, 1n, 1n)).rejects.toThrow(NotFoundException)
    })

    it('deletes the assignment and calls invalidatePermCache on happy path', async () => {
      mockPrisma.groupPermission.findUnique.mockResolvedValue({ groupId: 1n, permissionId: 1n })
      mockPrisma.groupPermission.delete.mockResolvedValue({})

      await service.revokePermission(1n, 1n, 99n)

      expect(mockPrisma.groupPermission.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId_permissionId: { groupId: 1n, permissionId: 1n } },
        })
      )
      expect(invalidatePermCache).toHaveBeenCalledWith(1n)
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // assignUserGroup
  // ─────────────────────────────────────────────────────────────────

  describe('assignUserGroup', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await expect(service.assignUserGroup(50n, 1n, 1n)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when group does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser())
      mockPrisma.group.findFirst.mockResolvedValue(null)

      await expect(service.assignUserGroup(50n, 1n, 1n)).rejects.toThrow(BadRequestException)
    })

    it('returns wasAlreadyAssigned=true without creating when assignment already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser())
      mockPrisma.group.findFirst.mockResolvedValue(makeGroup())
      mockPrisma.userGroup.findUnique.mockResolvedValue({ userId: 50n, groupId: 1n })

      const result = await service.assignUserGroup(50n, 1n, 1n)

      expect(result.data.wasAlreadyAssigned).toBe(true)
      expect(mockPrisma.userGroup.create).not.toHaveBeenCalled()
    })

    it('creates assignment and calls invalidatePermCache on happy path', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser())
      mockPrisma.group.findFirst.mockResolvedValue(makeGroup({ name: 'custom_group' }))
      mockPrisma.userGroup.findUnique.mockResolvedValue(null)
      mockPrisma.userGroup.create.mockResolvedValue({})

      const result = await service.assignUserGroup(50n, 1n, 99n)

      expect(result.data.wasAlreadyAssigned).toBe(false)
      expect(invalidatePermCache).toHaveBeenCalledWith(50n)
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.assign-group' })
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // revokeUserGroup
  // ─────────────────────────────────────────────────────────────────

  describe('revokeUserGroup', () => {
    it('throws NotFoundException when assignment does not exist', async () => {
      mockPrisma.userGroup.findUnique.mockResolvedValue(null)

      await expect(service.revokeUserGroup(50n, 1n, 99n)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when this is the last group for the user', async () => {
      mockPrisma.userGroup.findUnique.mockResolvedValue({ userId: 50n, groupId: 1n })
      mockPrisma.userGroup.count.mockResolvedValue(1)

      await expect(service.revokeUserGroup(50n, 1n, 99n)).rejects.toThrow(ConflictException)
    })

    it('deletes assignment and calls invalidatePermCache on happy path', async () => {
      mockPrisma.userGroup.findUnique.mockResolvedValue({ userId: 50n, groupId: 1n })
      mockPrisma.userGroup.count.mockResolvedValue(2)
      mockPrisma.userGroup.delete.mockResolvedValue({})

      await service.revokeUserGroup(50n, 1n, 99n)

      expect(mockPrisma.userGroup.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_groupId: { userId: 50n, groupId: 1n } },
        })
      )
      expect(invalidatePermCache).toHaveBeenCalledWith(50n)
    })
  })

  // ─────────────────────────────────────────────────────────────────
  // deleteUser
  // ─────────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('throws ConflictException when user tries to delete themselves', async () => {
      await expect(service.deleteUser(50n, 50n)).rejects.toThrow(ConflictException)
    })

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await expect(service.deleteUser(50n, 99n)).rejects.toThrow(NotFoundException)
    })

    it('throws ConflictException when deleting the last owner', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({
          groups: [{ group: { name: 'owner' } }],
          member: null,
          staff: null,
        })
      )
      mockPrisma.userGroup.count.mockResolvedValue(1) // only 1 owner left

      await expect(service.deleteUser(50n, 99n)).rejects.toThrow(ConflictException)
    })

    it('soft deletes user + member + staff in transaction on happy path', async () => {
      const memberRecord = { memberId: 10n }
      const staffRecord = { staffId: 20n }

      mockPrisma.user.findFirst.mockResolvedValue(
        makeUser({
          groups: [{ group: { name: 'trainer' } }],
          member: memberRecord,
          staff: staffRecord,
        })
      )

      const txUser = { update: jest.fn().mockResolvedValue({}) }
      const txMember = { update: jest.fn().mockResolvedValue({}) }
      const txStaff = { update: jest.fn().mockResolvedValue({}) }

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
        fn({ user: txUser, member: txMember, staff: txStaff })
      )

      await service.deleteUser(50n, 99n)

      expect(txUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 50n },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(txMember.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { memberId: 10n } })
      )
      expect(txStaff.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { staffId: 20n } })
      )
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'user.delete' }))
    })
  })
})
