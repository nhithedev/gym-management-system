import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { UserStatus } from '@prisma/client'
import { UsersService } from '../users/users.service'
import { JwtPayload } from './types/jwt-payload.interface'

export interface LoginResult {
  accessToken: string
  user: {
    userId: string
    email: string
    fullName: string
    roles: string[]
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** UC00 - Dang nhap. */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmailWithRoles(email)
    if (!user) {
      throw new UnauthorizedException('Email hoac mat khau khong dung')
    }
    if (user.status === UserStatus.locked) {
      throw new UnauthorizedException('Tai khoan da bi khoa')
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      throw new UnauthorizedException('Email hoac mat khau khong dung')
    }

    const payload: JwtPayload = {
      sub: user.userId.toString(),
      email: user.email,
      roles: user.roles,
    }
    const accessToken = await this.jwt.signAsync(payload)

    return {
      accessToken,
      user: {
        userId: user.userId.toString(),
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
      },
    }
  }

  /**
   * UC02 - Quen mat khau (phat OTP).
   * Hien tai chua tich hop mail/SMS, chi log de tien implement sau.
   * Tra ve thanh cong du email co ton tai hay khong (tranh user enumeration).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.users.findByEmailWithRoles(email)
    if (user) {
      // TODO: phat OTP, luu vao bang otp_codes va gui mail/SMS.
      this.logger.log(`[forgotPassword] OTP request cho ${email}`)
    } else {
      this.logger.log(`[forgotPassword] Email khong ton tai (giau loi): ${email}`)
    }
    return {
      message: 'Neu email ton tai trong he thong, ma OTP da duoc gui',
    }
  }

  /**
   * UC02 - Dat lai mat khau bang OTP.
   * Tam thoi chua co bang otp, throw UnauthorizedException de bao "OTP sai" toi khi them.
   */
  async resetPassword(_email: string, _otp: string, _newPassword: string): Promise<void> {
    // TODO: verify otp tu bang otp_codes; neu hop le -> bcrypt.hash(newPassword) + update users.passwordHash
    throw new UnauthorizedException('Chuc nang reset password chua duoc trien khai')
  }
}
