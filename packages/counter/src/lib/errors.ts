import { ALLOW_LIST_ENV, LOG_PREFIX } from '../constants'
import type { Logger } from '../types'

export class CounterError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

/*
 * A counter in the allow list that the schema can't increment. It is the admin's mistake,
 * not the visitor's, so it is logged for them and answered as a server error.
 */
export function invalidConfigError(problem: string, logger: Logger) {
  logger.error(`${LOG_PREFIX} ${ALLOW_LIST_ENV}: ${problem}`)

  return new CounterError(500, 'INVALID_CONFIG', `Invalid counter: ${problem}`)
}

// Responds in the same shape as Directus' own errors
export function sendError(res: any, error: unknown, logger: Logger) {
  if (!(error instanceof CounterError)) {
    logger.error(error, `${LOG_PREFIX} unexpected error`)

    return res.status(500).json({
      errors: [{ message: 'Unexpected error', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
    })
  }

  return res.status(error.status).json({
    errors: [{ message: error.message, extensions: { code: error.code } }],
  })
}
