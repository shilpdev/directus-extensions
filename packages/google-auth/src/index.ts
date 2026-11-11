import { defineEndpoint } from '@directus/extensions-sdk'
import { ENDPOINT_ID } from './constants'
import { registerCallbackRoute } from './routes/callback'
import { registerStartRoute } from './routes/start'
import { registerTokenRoute } from './routes/token'
import type { EndpointContext } from './types'

export default defineEndpoint({
  id: ENDPOINT_ID,
  handler: (router, directusContext) => {
    const context = directusContext as unknown as EndpointContext

    registerStartRoute(router, context)
    registerCallbackRoute(router, context)
    registerTokenRoute(router, context)
  },
})
