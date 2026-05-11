import { Request, Response, NextFunction } from 'express'
import { AppError } from '../middlewares/errorHandler'

// TODO: implement auth service calls

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      throw new AppError(400, 'Email và mật khẩu là bắt buộc', 'VALIDATION_ERROR')
    }
    // TODO: authService.login(email, password)
    res.json({ success: true, message: 'Login endpoint — chưa implement' })
  } catch (err) {
    next(err)
  }
}

export async function logout(_req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: invalidate token / clear session
    res.json({ success: true, message: 'Đăng xuất thành công' })
  } catch (err) {
    next(err)
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    if (!email) throw new AppError(400, 'Email là bắt buộc', 'VALIDATION_ERROR')
    // TODO: authService.sendOtp(email)
    res.json({ success: true, message: 'OTP đã được gửi nếu email tồn tại' })
  } catch (err) {
    next(err)
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) {
      throw new AppError(400, 'Thiếu thông tin bắt buộc', 'VALIDATION_ERROR')
    }
    // TODO: authService.resetPassword(email, otp, newPassword)
    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' })
  } catch (err) {
    next(err)
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    // req.user được gán bởi authenticate middleware
    res.json({ success: true, data: req.user })
  } catch (err) {
    next(err)
  }
}
