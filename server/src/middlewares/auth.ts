import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from './errorHandler'

export interface JwtPayload {
  userId: string
  email: string
  role: 'owner' | 'staff' | 'trainer' | 'member'
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Bạn chưa đăng nhập', 'UNAUTHORIZED'))
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    next(new AppError(401, 'Token không hợp lệ hoặc đã hết hạn', 'INVALID_TOKEN'))
  }
}

export function authorize(...roles: JwtPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Bạn chưa đăng nhập', 'UNAUTHORIZED'))
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN'))
    }
    next()
  }
}
