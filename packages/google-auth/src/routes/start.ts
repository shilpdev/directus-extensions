import { createHash } from 'node:crypto'
import { FLOW_COOKIE_NAME, FLOW_COOKIE_TTL_SECONDS } from '../constants'
import { GOOGLE_AUTH_URL, GOOGLE_SCOPE } from '../constants/google'
import { matchRedirect, requireConfig } from '../lib/config'
import { LoginError } from '../lib/errors'
import { signFlow } from '../lib/flow-cookie'
import { randomToken, sendError } from '../lib/http'
import type { EndpointContext, Router } from '../types'

/*
 * GET /shilp/google-auth/start?redirect_uri=https://app.example.com/auth/callback
 * Send the browser here. It continues to Google, and afterwards comes back
 * to `redirect_uri`.
 */
export function registerStartRoute(router: Router, context: EndpointContext) {
  router.get('/start', async (req, res) => {
    try {
      const config = requireConfig(context)

      const redirect = matchRedirect(config, req.query.redirect_uri)
      if (!redirect) {
        throw new LoginError(400, 'INVALID_REDIRECT', 'redirect_uri is missing or not in SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST')
      }

      const state = randomToken()
      const nonce = randomToken()
      const verifier = randomToken()

      const cookie = await signFlow(context, { state, nonce, verifier, redirect: redirect.toString() })

      res.cookie(FLOW_COOKIE_NAME, cookie, {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: 'lax',
        maxAge: FLOW_COOKIE_TTL_SECONDS * 1000,
        path: config.callbackPath,
      })

      const url = new URL(GOOGLE_AUTH_URL)
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.callbackUrl,
        response_type: 'code',
        scope: GOOGLE_SCOPE,
        state,
        nonce,
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256',
        prompt: 'select_account',
      }).toString()

      res.set('Cache-Control', 'no-store').redirect(url.toString())
    } catch (error) {
      sendError(res, error, context.logger)
    }
  })
}
