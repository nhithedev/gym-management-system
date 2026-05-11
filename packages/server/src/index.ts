import 'dotenv/config'
import app from './app'
import { env } from './config/env'
import { db } from './config/db'
import logger from './utils/logger'

const PORT = env.PORT

async function bootstrap() {
  try {
    await db.connect()
    logger.info('Database connected')

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT} [${env.NODE_ENV}]`)
    })
  } catch (err) {
    logger.error('Failed to start server', err)
    process.exit(1)
  }
}

bootstrap()
