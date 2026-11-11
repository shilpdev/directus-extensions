import { randomToken } from './http'
import type { EndpointContext } from '../types'

/*
 * Creates a session row and returns its refresh token. The row is valid
 * for a short time only. The first refresh call (which rotates the token)
 * extends it to the normal REFRESH_TOKEN_TTL.
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
    ip: req.accountability?.ip ?? null,
    user_agent: req.get('user-agent')?.substring(0, 1024) ?? null,
    origin: req.get('origin') ?? null,
  })

  return token
}
