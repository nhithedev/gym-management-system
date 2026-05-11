import { Router } from 'express'
import authRouter from './auth.routes'
// import memberRouter from './member.routes'
// import packageRouter from './package.routes'
// import equipmentRouter from './equipment.routes'
// import roomRouter from './room.routes'
// import staffRouter from './staff.routes'
// import reportRouter from './report.routes'

const router = Router()

router.use('/auth', authRouter)
// router.use('/members', memberRouter)
// router.use('/packages', packageRouter)
// router.use('/equipment', equipmentRouter)
// router.use('/rooms', roomRouter)
// router.use('/staff', staffRouter)
// router.use('/reports', reportRouter)

export default router
