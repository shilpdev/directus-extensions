import ms, { type StringValue } from 'ms'
import {
  DEFAULT_SESSION_COOKIE_NAME,
  DEFAULT_SESSION_COOKIE_SAME_SITE,
  DEFAULT_SESSION_COOKIE_TTL,
  USER_AGENT_MAX_LENGTH,
} from '../constants/session'
import type { EndpointContext } from '../types'
import { randomToken } from './http'

/*
 * Creates a session row and returns its refresh token. The row is valid
 * for a short time only, because the first refresh (which rotates the
 * token) replaces it with a session that lasts REFRESH_TOKEN_TTL.
 */
export async function createSession(
  context: EndpointContext,
  req: any,
  userId: string,
  validForMs: number,
): Promise<string> {
  const token = randomToken(48)

  await context.database('directus_sessions').insert({
    token,
    user: userId,
    expires: new Date(Date.now() + validForMs),
    ip: req.accountability.ip,
    user_agent: req.get('user-agent')?.substring(0, USER_AGENT_MAX_LENGTH) ?? null,
    origin: req.get('origin') ?? null,
  })

  return token
}

/*
 * Turns a session row into Directus' own session cookie, the one a login
 * with `mode: "session"` sets, so the frontend is logged in without
 * handling a token. The cookie follows the SESSION_COOKIE_* env variables.
 */
export async function setSessionCookie(context: EndpointContext, res: any, refreshToken: string) {
  const { env } = context

  const auth = new context.services.AuthenticationService({
    schema: await context.getSchema(),
    accountability: null,
  })

  const { accessToken } = await auth.refresh(refreshToken, { session: true })

  res.cookie(String(env.SESSION_COOKIE_NAME ?? DEFAULT_SESSION_COOKIE_NAME), accessToken, {
    httpOnly: true,
    domain: env.SESSION_COOKIE_DOMAIN || undefined,
    // Directus accepts "1d", "15m" or milliseconds. Example: "1d" -> 86400000
    maxAge: ms(String(env.SESSION_COOKIE_TTL ?? DEFAULT_SESSION_COOKIE_TTL) as StringValue),
    secure: String(env.SESSION_COOKIE_SECURE) === 'true',
    sameSite: String(env.SESSION_COOKIE_SAME_SITE ?? DEFAULT_SESSION_COOKIE_SAME_SITE),
    path: '/',
  })
}
