import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code ?? 'ERROR',
      message: err.message,
    })
  }

  logger.error('Unhandled error', err)

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
  })
}
