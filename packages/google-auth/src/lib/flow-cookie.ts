import { SignJWT, jwtVerify } from 'jose'
import { FLOW_COOKIE_TTL_SECONDS } from '../constants'
import type { EndpointContext, LoginFlow } from '../types'
import { LoginError } from './errors'

const signingKey = (context: EndpointContext) => new TextEncoder().encode(String(context.env.SECRET))

/*
 * The flow lives in a signed, httpOnly cookie, so the extension keeps no
 * state on the server and the flow is bound to the browser that started it.
 */
export function signFlow(context: EndpointContext, flow: LoginFlow): Promise<string> {
  return new SignJWT({ ...flow })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${FLOW_COOKIE_TTL_SECONDS}s`)
    .sign(signingKey(context))
}

export async function verifyFlow(context: EndpointContext, cookie: unknown): Promise<LoginFlow> {
  try {
    const { payload } = await jwtVerify(String(cookie ?? ''), signingKey(context))
    return payload as unknown as LoginFlow
  } catch {
    throw new LoginError(400, 'INVALID_STATE', 'The login session expired, please start again')
  }
}
