import { FLOW_COOKIE_NAME, LOG_PREFIX, SESSION_CODE_TTL_MS } from '../constants'
import { requireConfig } from '../lib/config'
import { LoginError } from '../lib/errors'
import { verifyFlow } from '../lib/flow-cookie'
import { exchangeCode, verifyIdToken } from '../lib/google'
import { sendError } from '../lib/http'
import { createSession, setSessionCookie } from '../lib/session'
import { findOrCreateUser } from '../lib/users'
import type { Config, EndpointContext, LoginFlow, Router } from '../types'

/*
 * GET /shilp/google-auth/callback
 * Google sends the browser here. On success the browser is redirected to the
 * frontend with `?picture=...` and, depending on the mode chosen in /start,
 * either the Directus session cookie is set ("session") or `?code=...` is added
 * ("json"). On failure it gets `?error=<CODE>`.
 */
export function registerCallbackRoute(router: Router, context: EndpointContext) {
  router.get('/callback', async (req, res) => {
    let config: Config
    let flow: LoginFlow

    // Until the flow cookie is verified there is no safe redirect, so errors are shown here
    try {
      config = requireConfig(context)
      flow = await verifyFlow(context, req.cookies?.[FLOW_COOKIE_NAME])
      res.clearCookie(FLOW_COOKIE_NAME, { path: config.callbackPath })
    } catch (error) {
      return sendError(res, error, context.logger)
    }

    // Already checked against the allow list in /start, and the cookie is signed
    const redirect = new URL(flow.redirect)

    const backToFrontend = (params: Record<string, string>) => {
      for (const [key, value] of Object.entries(params)) redirect.searchParams.set(key, value)
      res.set('Cache-Control', 'no-store').redirect(redirect.toString())
    }

    try {
      if (req.query.error) throw new LoginError(401, 'ACCESS_DENIED', 'Google sign in was cancelled')

      if (!req.query.code || req.query.state !== flow.state) {
        throw new LoginError(400, 'INVALID_STATE', 'The login session does not match')
      }

      const idToken = await exchangeCode({
        code: String(req.query.code),
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.callbackUrl,
        codeVerifier: flow.verifier,
      })

      const profile = await verifyIdToken(idToken, {
        clientId: config.clientId,
        nonce: flow.nonce,
      })

      const userId = await findOrCreateUser(context, profile)

      const sessionToken = await createSession(context, req, userId, SESSION_CODE_TTL_MS)

      /*
       * Google's photo URL travels in the redirect, so the frontend can show
       * it without it being stored in Directus. It is only a display hint.
       */
      const picture: Record<string, string> = profile.picture ? { picture: profile.picture } : {}

      if (flow.mode === 'json') {
        // The frontend trades the code for tokens with POST /auth/refresh { mode: "json", refresh_token: code }
        return backToFrontend({ code: sessionToken, ...picture })
      }

      /*
       * The login is the session cookie Directus itself uses (see
       * setSessionCookie), set here on the way back to the frontend. The
       * frontend and Directus must share a parent domain for the browser to
       * send it (SESSION_COOKIE_DOMAIN).
       */
      await setSessionCookie(context, res, sessionToken)
      backToFrontend(picture)
    } catch (error) {
      if (error instanceof LoginError) return backToFrontend({ error: error.code })

      context.logger.error(error, `${LOG_PREFIX} callback failed`)
      backToFrontend({ error: 'INTERNAL_SERVER_ERROR' })
    }
  })
}
