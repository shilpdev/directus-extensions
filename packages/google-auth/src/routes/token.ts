import { SESSION_CODE_TTL_MS } from '../constants'
import { requireConfig } from '../lib/config'
import { parseAuthMode } from '../lib/auth-mode'
import { LoginError } from '../lib/errors'
import { verifyIdToken } from '../lib/google'
import { sendError } from '../lib/http'
import { createSession, setSessionCookie } from '../lib/session'
import { findOrCreateUser } from '../lib/users'
import type { EndpointContext, Router } from '../types'

/*
 * POST /shilp/google-auth/token { "credential": "<Google ID token>", "mode": "session" }
 * For frontends that use Google Identity Services (button or One Tap) and
 * get the ID token in the browser.
 * - "session" (default): sets the Directus session cookie and responds 204.
 *   The frontend must send the request with credentials (cookies) included.
 * - "json": responds like POST /auth/login in json mode.
 */
export function registerTokenRoute(router: Router, context: EndpointContext) {
  router.post('/token', async (req, res) => {
    try {
      const config = requireConfig(context)

      const credential = req.body?.credential
      if (typeof credential !== 'string' || !credential) {
        throw new LoginError(400, 'INVALID_PAYLOAD', '"credential" is required')
      }

      const mode = parseAuthMode(req.body?.mode)

      const profile = await verifyIdToken(credential, {
        clientId: config.clientId,
      })

      const userId = await findOrCreateUser(context, profile)

      const sessionToken = await createSession(context, req, userId, SESSION_CODE_TTL_MS)

      if (mode === 'session') {
        // Same as /callback: the login is the Directus session cookie, no token is returned
        await setSessionCookie(context, res, sessionToken)
        return res.set('Cache-Control', 'no-store').status(204).end()
      }

      /*
       * Let Directus itself issue the tokens, so roles, 2FA enforcement and
       * hooks behave exactly like a normal login.
       */
      const auth = new context.services.AuthenticationService({
        accountability: req.accountability,
        schema: await context.getSchema(),
        knex: context.database,
      })

      const tokens = await auth.refresh(sessionToken)

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
