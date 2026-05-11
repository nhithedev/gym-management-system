import { Router } from 'express'
import { login, logout, forgotPassword, resetPassword, me } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth'

const router = Router()

router.post('/login', login)
router.post('/logout', authenticate, logout)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/me', authenticate, me)

export default router
