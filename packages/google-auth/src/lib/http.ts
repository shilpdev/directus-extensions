import { randomBytes } from 'node:crypto'
import { LOG_PREFIX } from '../constants'
import type { Logger } from '../types'
import { LoginError } from './errors'

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')

// Responds in the same shape as Directus' own errors
export function sendError(res: any, error: unknown, logger: Logger) {
  const loginError = error instanceof LoginError ? error : null

  if (!loginError) logger.error(error, `${LOG_PREFIX} unexpected error`)

  res.status(loginError?.status ?? 500).json({
    errors: [
      {
        message: loginError?.message ?? 'Unexpected error',
        extensions: { code: loginError?.code ?? 'INTERNAL_SERVER_ERROR' },
      },
    ],
  })
}
