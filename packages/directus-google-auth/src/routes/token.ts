import { SESSION_CODE_TTL_MS } from '../constants'
import { requireConfig } from '../lib/config'
import { LoginError } from '../lib/errors'
import { verifyIdToken } from '../lib/google'
import { sendError } from '../lib/http'
import { createSession } from '../lib/session'
import { findOrCreateUser } from '../lib/users'
import type { EndpointContext, Router } from '../types'

/*
 * POST /shilp/google-auth/token { "credential": "<Google ID token>" }
 * For frontends that use Google Identity Services (button or One Tap) and
 * get the ID token in the browser. Responds like POST /auth/login in json
 * mode.
 */
export function registerTokenRoute(router: Router, context: EndpointContext) {
  router.post('/token', async (req, res) => {
    try {
      const config = requireConfig(context)

      const credential = req.body?.credential
      if (typeof credential !== 'string' || !credential) {
        throw new LoginError(400, 'INVALID_PAYLOAD', '"credential" is required')
      }

      const profile = await verifyIdToken(credential, {
        clientId: config.clientId,
      })

      const userId = await findOrCreateUser(context, profile)
      const refreshToken = await createSession(context, req, userId, SESSION_CODE_TTL_MS)

      /*
       * Let Directus itself issue the tokens, so roles, 2FA enforcement and
       * hooks behave exactly like a normal login.
       */
      const auth = new context.services.AuthenticationService({
        accountability: req.accountability,
        schema: await context.getSchema(),
        knex: context.database,
      })

      const tokens = await auth.refresh(refreshToken)

      res.set('Cache-Control', 'no-store').json({
        data: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires: tokens.expires,
        },
      })
    } catch (error) {
      sendError(res, error, context.logger)
    }
  })
}
