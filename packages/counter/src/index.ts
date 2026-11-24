import { defineEndpoint } from '@directus/extensions-sdk'
import { ALLOW_LIST_ENV, ENDPOINT_ID, LOG_PREFIX } from './constants'
import { readAllowList } from './lib/allow-list'
import { registerIncrementRoute } from './routes/increment'

export default defineEndpoint({
  id: ENDPOINT_ID,
  handler: (router, directusContext) => {
    const { env, logger } = directusContext
    const counters = readAllowList(env[ALLOW_LIST_ENV], logger)

    if (counters.size === 0) {
      logger.warn(`${LOG_PREFIX} ${ALLOW_LIST_ENV} is empty, nothing can be counted`)
    }

    registerIncrementRoute(router, { ...directusContext, counters })
  },
})
