import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { OtpInvalidException } from './exceptions/otp-invalid.exception'
import { OtpExpiredException } from './exceptions/otp-expired.exception'
import { EmailAlreadyVerifiedException } from './exceptions/email-already-verified.exception'

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

jest.mock('crypto', () => ({
  randomInt: jest.fn(),
}))

const mockPrisma = {
  user: { update: jest.fn(), findUnique: jest.fn() },
  staff: { findFirst: jest.fn() },
  member: { findFirst: jest.fn(), count: jest.fn() },
  $transaction: jest.fn(),
}

const mockUsersService = {
  findByEmailWithRoles: jest.fn(),
  findByLineIdWithRoles: jest.fn(),
}

const mockJwtService = {
  signAsync: jest.fn(),
}

const mockAuditService = {
  log: jest.fn(),
}

const mockRateLimitService = {
  isAllowed: jest.fn(),
}

const mockConfigService = {
  get: jest.fn(),
}

const mockOtpStore = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  incrementAttempts: jest.fn(),
}

const baseUser = {
  userId: 1n,
  email: 'user@gym.local',
  fullName: 'Test User',
  passwordHash: '$2b$12$currenthash',
  status: 'active',
  emailVerifiedAt: new Date(),
  lineId: null,
  roles: ['member' as const],
  deletedAt: null,
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(() => {
    service = new AuthService(
      mockPrisma as any,
      mockUsersService as any,
      mockJwtService as any,
      mockAuditService as any,
      mockRateLimitService as any,
      mockConfigService as any,
      mockOtpStore as any
    )
    jest.clearAllMocks()
    mockJwtService.signAsync.mockResolvedValue('mock.jwt.token')
    mockAuditService.log.mockResolvedValue(undefined)
  })

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------

  describe('login', () => {
    it('returns accessToken and user data on valid credentials', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })

      const result = await service.login('user@gym.local', 'Password123!')

      expect(result.accessToken).toBe('mock.jwt.token')
      expect(result.user.userId).toBe('1')
      expect(result.user.email).toBe('user@gym.local')
      expect(result.user.roles).toEqual(['member'])
    })

    it('JWT payload sub is userId as string (BigInt serialization)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await service.login('user@gym.local', 'Password123!')

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: '1', email: 'user@gym.local', roles: ['member'] })
      )
    })

    it('JWT payload includes staffId as string when staff record exists', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, roles: ['staff'] })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue({ staffId: 5n })
      mockPrisma.member.findFirst.mockResolvedValue(null)

      await service.login('user@gym.local', 'Password123!')

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: '5' })
      )
    })

    it('JWT payload includes memberId as string when member record exists', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 42n })

      await service.login('user@gym.local', 'Password123!')

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: '42' })
      )
    })

    it('throws UnauthorizedException when email is not found (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      await expect(service.login('nobody@gym.local', 'pass')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when passwordHash is null (LINE-only account)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, passwordHash: null })

      await expect(service.login('user@gym.local', 'pass')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when password is wrong', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(service.login('user@gym.local', 'wrongpass')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('email-not-found and wrong-password produce the same error message (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)
      const emailErr = await service
        .login('x@gym.local', 'p')
        .catch((e) => e as UnauthorizedException)

      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
      const passErr = await service
        .login('user@gym.local', 'wrong')
        .catch((e) => e as UnauthorizedException)

      expect((emailErr as UnauthorizedException).message).toBe(
        (passErr as UnauthorizedException).message
      )
    })

    it('throws UnauthorizedException with lock message when account is locked', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, status: 'locked' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const err = await service.login('user@gym.local', 'Password123!').catch((e) => e)

      expect(err).toBeInstanceOf(UnauthorizedException)
      expect(err.message).toBe('Tài khoản đã bị khoá')
    })

    it('activates account and returns token when status is pending_verification (first login)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({
        ...baseUser,
        status: 'pending_verification',
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue(null)

      const result = await service.login('user@gym.local', 'Password123!')

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: baseUser.userId },
          data: expect.objectContaining({ status: 'active' }),
        })
      )
      expect(result).toHaveProperty('accessToken')
    })

    it('validates password BEFORE checking status (locked account with wrong password shows generic error)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, status: 'locked' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const err = await service.login('user@gym.local', 'wrong').catch((e) => e)

      expect(err).toBeInstanceOf(UnauthorizedException)
      expect(err.message).toBe('Email hoặc mật khẩu không đúng')
    })
  })

  // ---------------------------------------------------------------------------
  // forgotPassword
  // ---------------------------------------------------------------------------

  describe('forgotPassword', () => {
    const SUCCESS_MSG = 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi'

    it('returns generic message when email does not exist (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      const result = await service.forgotPassword('nobody@gym.local')

      expect(result.message).toBe(SUCCESS_MSG)
    })

    it('returns generic message silently when rate limited, does not store OTP', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockRateLimitService.isAllowed.mockReturnValue(false)

      const result = await service.forgotPassword('user@gym.local')

      expect(result.message).toBe(SUCCESS_MSG)
      expect(mockOtpStore.set).not.toHaveBeenCalled()
    })

    it('stores hashed OTP in otpStore for purpose password_reset when allowed', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockRateLimitService.isAllowed.mockReturnValue(true)
      ;(randomInt as jest.Mock).mockReturnValue(654321)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$otphash')

      await service.forgotPassword('user@gym.local')

      expect(mockOtpStore.set).toHaveBeenCalledWith(
        baseUser.userId,
        'password_reset',
        '$2b$10$otphash',
        expect.any(Number)
      )
    })

    it('returns devOtp field in non-production environment', async () => {
      const orig = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockRateLimitService.isAllowed.mockReturnValue(true)
      ;(randomInt as jest.Mock).mockReturnValue(123456)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hash')

      const result = await service.forgotPassword('user@gym.local')

      expect((result as any).devOtp).toBe('123456')
      process.env.NODE_ENV = orig
    })

    it('does not include devOtp in production environment', async () => {
      const orig = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockRateLimitService.isAllowed.mockReturnValue(true)
      ;(randomInt as jest.Mock).mockReturnValue(123456)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hash')

      const result = await service.forgotPassword('user@gym.local')

      expect((result as any).devOtp).toBeUndefined()
      process.env.NODE_ENV = orig
    })

    it('uses rate limit key forgot-password:<email>', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockRateLimitService.isAllowed.mockReturnValue(false)

      await service.forgotPassword('user@gym.local')

      expect(mockRateLimitService.isAllowed).toHaveBeenCalledWith(
        'forgot-password:user@gym.local',
        3,
        expect.any(Number)
      )
    })
  })

  // ---------------------------------------------------------------------------
  // resetPassword
  // ---------------------------------------------------------------------------

  describe('resetPassword', () => {
    it('throws UnauthorizedException when email is not found', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      await expect(service.resetPassword('nobody@gym.local', '123456', 'newpass')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException when no OTP entry exists', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockOtpStore.get.mockReturnValue(undefined)

      await expect(service.resetPassword('user@gym.local', '123456', 'newpass')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException and deletes expired OTP entry', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() - 1,
        attemptCount: 0,
      })

      await expect(service.resetPassword('user@gym.local', '123456', 'newpass')).rejects.toThrow(
        UnauthorizedException
      )
      expect(mockOtpStore.delete).toHaveBeenCalledWith(baseUser.userId, 'password_reset')
    })

    it('throws UnauthorizedException when OTP is wrong', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() + 600_000,
        attemptCount: 0,
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(service.resetPassword('user@gym.local', '000000', 'newpass')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('updates passwordHash with salt 12 and deletes OTP on success', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() + 600_000,
        attemptCount: 0,
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash')
      mockPrisma.user.update.mockResolvedValue({})

      await service.resetPassword('user@gym.local', '123456', 'NewPass1!')

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass1!', 12)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: baseUser.userId },
          data: expect.objectContaining({ passwordHash: '$2b$12$newhash' }),
        })
      )
      expect(mockOtpStore.delete).toHaveBeenCalledWith(baseUser.userId, 'password_reset')
    })
  })

  // ---------------------------------------------------------------------------
  // verifyEmail
  // ---------------------------------------------------------------------------

  describe('verifyEmail', () => {
    const unverifiedUser = { ...baseUser, emailVerifiedAt: null, status: 'pending_verification' }

    it('throws NotFoundException when email is not found', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      await expect(service.verifyEmail('nobody@gym.local', '123456')).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws EmailAlreadyVerifiedException when emailVerifiedAt is not null', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({
        ...baseUser,
        emailVerifiedAt: new Date(),
      })

      await expect(service.verifyEmail('user@gym.local', '123456')).rejects.toThrow(
        EmailAlreadyVerifiedException
      )
    })

    it('throws NotFoundException when no OTP entry exists', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockOtpStore.get.mockReturnValue(undefined)

      await expect(service.verifyEmail('user@gym.local', '123456')).rejects.toThrow(
        NotFoundException
      )
    })

    it('throws OtpExpiredException and deletes entry when OTP TTL has passed', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() - 1,
        attemptCount: 0,
      })

      await expect(service.verifyEmail('user@gym.local', '123456')).rejects.toThrow(
        OtpExpiredException
      )
      expect(mockOtpStore.delete).toHaveBeenCalledWith(baseUser.userId, 'email_verify')
    })

    it('throws OtpExpiredException and deletes entry when attemptCount reaches max (5)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() + 600_000,
        attemptCount: 5,
      })

      await expect(service.verifyEmail('user@gym.local', '123456')).rejects.toThrow(
        OtpExpiredException
      )
      expect(mockOtpStore.delete).toHaveBeenCalledWith(baseUser.userId, 'email_verify')
    })

    it('throws OtpInvalidException and increments attempts when OTP is wrong', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() + 600_000,
        attemptCount: 2,
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(service.verifyEmail('user@gym.local', '000000')).rejects.toThrow(
        OtpInvalidException
      )
      expect(mockOtpStore.incrementAttempts).toHaveBeenCalledWith(baseUser.userId, 'email_verify')
    })

    it('boundary: attemptCount=4 increments (does not delete) on wrong OTP', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() + 600_000,
        attemptCount: 4,
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(service.verifyEmail('user@gym.local', 'wrong')).rejects.toThrow(
        OtpInvalidException
      )
      expect(mockOtpStore.incrementAttempts).toHaveBeenCalled()
      expect(mockOtpStore.delete).not.toHaveBeenCalled()
    })

    it('activates account, sets emailVerifiedAt, and deletes OTP on success', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() + 600_000,
        attemptCount: 0,
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({})

      await service.verifyEmail('user@gym.local', '123456')

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: baseUser.userId },
          data: expect.objectContaining({ status: 'active' }),
        })
      )
      expect(mockOtpStore.delete).toHaveBeenCalledWith(baseUser.userId, 'email_verify')
    })
  })

  // ---------------------------------------------------------------------------
  // changePassword
  // ---------------------------------------------------------------------------

  describe('changePassword', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.changePassword(1n, 'current', 'new')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException when passwordHash is null (LINE-only account)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 1n, passwordHash: null })

      await expect(service.changePassword(1n, 'current', 'new')).rejects.toThrow(
        UnauthorizedException
      )
    })

    it('throws UnauthorizedException with correct message when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 1n, passwordHash: '$2b$12$hash' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const err = await service.changePassword(1n, 'wrong', 'new').catch((e) => e)

      expect(err).toBeInstanceOf(UnauthorizedException)
      expect(err.message).toBe('Mật khẩu hiện tại không đúng')
    })

    it('hashes new password with bcrypt salt 12 and updates DB on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ userId: 1n, passwordHash: '$2b$12$hash' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash')
      mockPrisma.user.update.mockResolvedValue({})

      await service.changePassword(1n, 'CurrentPass1!', 'NewPass1!')

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass1!', 12)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1n },
          data: { passwordHash: '$2b$12$newhash' },
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // lineLogin (key paths)
  // ---------------------------------------------------------------------------

  describe('lineLogin', () => {
    const lineProfile = { sub: 'U1234567890', name: 'LINE User', email: 'line@gmail.com' }
    const lineUser = { ...baseUser, roles: ['member' as const], lineId: 'U1234567890' }

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('TEST_CHANNEL_ID')
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(lineProfile),
      })
    })

    it('issues JWT when user is found by lineId', async () => {
      mockUsersService.findByLineIdWithRoles.mockResolvedValue(lineUser)
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 20n })

      const result = await service.lineLogin('valid_id_token')

      expect(result.accessToken).toBe('mock.jwt.token')
      expect(result.user.roles).toEqual(['member'])
    })

    it('throws ForbiddenException when user has non-member role (LINE is member-only)', async () => {
      mockUsersService.findByLineIdWithRoles.mockResolvedValue({
        ...lineUser,
        roles: ['owner' as const],
      })

      await expect(service.lineLogin('valid_id_token')).rejects.toThrow(ForbiddenException)
    })

    it('throws UnauthorizedException when LINE account is locked', async () => {
      mockUsersService.findByLineIdWithRoles.mockResolvedValue({
        ...lineUser,
        status: 'locked',
      })

      await expect(service.lineLogin('valid_id_token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when LINE_CHANNEL_ID is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined)

      await expect(service.lineLogin('token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when LINE API returns non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false })

      await expect(service.lineLogin('invalid_token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when LINE API call throws a network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      await expect(service.lineLogin('token')).rejects.toThrow(UnauthorizedException)
    })

    it('links lineId to existing account found by email when not found by lineId', async () => {
      const profileWithEmail = { sub: 'U_LINKED', name: 'Linked User', email: 'user@gym.local' }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(profileWithEmail),
      })
      mockUsersService.findByLineIdWithRoles.mockResolvedValue(null)
      mockUsersService.findByEmailWithRoles.mockResolvedValue({ ...baseUser, lineId: null })
      mockPrisma.user.update.mockResolvedValue({})
      mockPrisma.staff.findFirst.mockResolvedValue(null)
      mockPrisma.member.findFirst.mockResolvedValue({ memberId: 10n })

      const result = await service.lineLogin('valid_token')

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { lineId: 'U_LINKED' } })
      )
      expect(result.accessToken).toBe('mock.jwt.token')
    })

    it('creates new member via transaction when no existing account matches', async () => {
      const profileNoEmail = { sub: 'U_BRAND_NEW', name: 'Brand New' }
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(profileNoEmail),
      })
      mockUsersService.findByLineIdWithRoles.mockResolvedValue(null)
      mockPrisma.member.count.mockResolvedValue(5)
      mockPrisma.member.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ memberId: 99n })

      const createdUser = {
        userId: 99n,
        email: 'line_U_BRAND_NEW@line.local',
        fullName: 'Brand New',
        passwordHash: null,
        lineId: 'U_BRAND_NEW',
        status: 'active',
        emailVerifiedAt: new Date(),
        roles: ['member' as const],
        deletedAt: null,
      }
      const mockTx = {
        user: { create: jest.fn().mockResolvedValue(createdUser) },
        member: { create: jest.fn().mockResolvedValue({}) },
        group: { findUnique: jest.fn().mockResolvedValue(null) },
        userGroup: { create: jest.fn() },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx))
      mockPrisma.staff.findFirst.mockResolvedValue(null)

      const result = await service.lineLogin('brand_new_token')

      expect(mockTx.user.create).toHaveBeenCalled()
      expect(mockTx.member.create).toHaveBeenCalled()
      expect(result.user.userId).toBe('99')
    })
  })

  // ---------------------------------------------------------------------------
  // External dependency failures (Phase 8)
  // ---------------------------------------------------------------------------

  describe('external dependency failures', () => {
    it('propagates error when bcrypt.hash throws in resetPassword', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      mockOtpStore.get.mockReturnValue({
        codeHash: '$2b$10$hash',
        expiresAt: Date.now() + 600_000,
        attemptCount: 0,
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockRejectedValue(new Error('bcrypt.hash failed'))

      await expect(service.resetPassword('user@gym.local', '123456', 'NewPass1!')).rejects.toThrow(
        'bcrypt.hash failed'
      )
    })

    it('propagates error when bcrypt.compare throws in login', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(baseUser)
      ;(bcrypt.compare as jest.Mock).mockRejectedValue(new Error('bcrypt.compare failed'))

      await expect(service.login('user@gym.local', 'Password123!')).rejects.toThrow(
        'bcrypt.compare failed'
      )
    })

    it('propagates network error when prisma.user.findUnique throws in changePassword', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB connection lost'))

      await expect(service.changePassword(1n, 'current', 'new')).rejects.toThrow(
        'DB connection lost'
      )
    })
  })

  // ---------------------------------------------------------------------------
  // resendVerify
  // ---------------------------------------------------------------------------

  describe('resendVerify', () => {
    const unverifiedUser = { ...baseUser, emailVerifiedAt: null, status: 'pending_verification' }
    const RESEND_MSG = 'Nếu email tồn tại và chưa xác thực, mã OTP mới đã được gửi'

    it('returns generic message when user is not found (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(null)

      const result = await service.resendVerify('nobody@gym.local')

      expect(result.message).toBe(RESEND_MSG)
      expect(mockOtpStore.set).not.toHaveBeenCalled()
    })

    it('returns generic message when user email is already verified (anti-enumeration)', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue({
        ...baseUser,
        emailVerifiedAt: new Date(),
      })

      const result = await service.resendVerify('user@gym.local')

      expect(result.message).toBe(RESEND_MSG)
      expect(mockOtpStore.set).not.toHaveBeenCalled()
    })

    it('returns generic message when rate limited, does not store OTP', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockRateLimitService.isAllowed.mockReturnValue(false)

      const result = await service.resendVerify('user@gym.local')

      expect(result.message).toBe(RESEND_MSG)
      expect(mockOtpStore.set).not.toHaveBeenCalled()
    })

    it('stores hashed OTP with email_verify purpose when rate limit allows', async () => {
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockRateLimitService.isAllowed.mockReturnValue(true)
      ;(randomInt as jest.Mock).mockReturnValue(987654)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$resendHash')

      await service.resendVerify('user@gym.local')

      expect(mockOtpStore.set).toHaveBeenCalledWith(
        baseUser.userId,
        'email_verify',
        '$2b$10$resendHash',
        expect.any(Number)
      )
    })

    it('includes devOtp in response when NODE_ENV is not production', async () => {
      const orig = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      mockUsersService.findByEmailWithRoles.mockResolvedValue(unverifiedUser)
      mockRateLimitService.isAllowed.mockReturnValue(true)
      ;(randomInt as jest.Mock).mockReturnValue(111111)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$h')

      const result = await service.resendVerify('user@gym.local')

      expect((result as any).devOtp).toBe('111111')
      process.env.NODE_ENV = orig
    })
  })
})
