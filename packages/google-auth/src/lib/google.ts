import { createRemoteJWKSet, jwtVerify } from 'jose'
import { GOOGLE_ISSUERS, GOOGLE_JWKS_URL, GOOGLE_TOKEN_URL } from '../constants/google'
import type { GoogleProfile } from '../types'
import { LoginError } from './errors'

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL))

// Swaps the authorization code for Google's ID token, server to server
export async function exchangeCode(params: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
  codeVerifier: string
}): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: params.codeVerifier,
    }),
  })

  const body = (await response.json().catch(() => ({}))) as { id_token?: string }

  if (!response.ok || !body.id_token) {
    throw new LoginError(401, 'GOOGLE_EXCHANGE_FAILED', 'Google rejected the authorization code')
  }

  return body.id_token
}

const toText = (value: unknown) => (typeof value === 'string' && value ? value : null)

// Checks signature, issuer, audience and expiry of a Google ID token and returns the profile
export async function verifyIdToken(
  idToken: string,
  options: { clientId: string; nonce?: string },
): Promise<GoogleProfile> {
  let claims: Record<string, unknown>

  try {
    const result = await jwtVerify(idToken, jwks, { issuer: GOOGLE_ISSUERS, audience: options.clientId })
    claims = result.payload
  } catch {
    throw new LoginError(401, 'INVALID_GOOGLE_TOKEN', 'The Google token is invalid or expired')
  }

  // The nonce only exists in the redirect flow, not for tokens from Google Identity Services
  if (options.nonce !== undefined && claims.nonce !== options.nonce) {
    throw new LoginError(401, 'INVALID_GOOGLE_TOKEN', 'The Google token does not match this login attempt')
  }

  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : ''

  if (!claims.sub || !email || claims.email_verified !== true) {
    throw new LoginError(403, 'EMAIL_NOT_VERIFIED', 'The Google account has no verified email')
  }

  return {
    sub: String(claims.sub),
    email,
    firstName: toText(claims.given_name),
    lastName: toText(claims.family_name),
    picture: toText(claims.picture),
  }
}
