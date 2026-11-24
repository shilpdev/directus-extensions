import type { AUTH_MODES } from './constants/session'

export type AuthMode = (typeof AUTH_MODES)[number]

export type Logger = {
  info: (message: string) => void
  error: (error: unknown, message?: string) => void
}

// Minimal shape of the endpoint context that Directus hands to extensions
export type EndpointContext = {
  database: any
  services: any
  env: Record<string, unknown>
  logger: Logger
  getSchema: () => Promise<any>
}

// One SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST entry: an exact origin, or a wildcard
// that accepts every subdomain of a domain ("https://*.app.com").
export type AllowedRedirect =
  | { origin: string }
  | { protocol: string, hostSuffix: string, port: string }

export type Config = {
  clientId: string
  clientSecret: string
  callbackUrl: string
  callbackPath: string
  secureCookies: boolean
  allowedRedirects: AllowedRedirect[]
}

export type GoogleProfile = {
  sub: string
  email: string
  firstName: string | null
  lastName: string | null
  // The photo URL Google puts in the ID token on every login
  picture: string | null
}

// Everything needed to finish a login, carried in the signed cookie
export type LoginFlow = {
  state: string
  nonce: string
  verifier: string
  redirect: string
  mode: AuthMode
}

type RouteHandler = (req: any, res: any) => unknown

// The part of the Express router that the routes use
export type Router = {
  get: (path: string, handler: RouteHandler) => unknown
  post: (path: string, handler: RouteHandler) => unknown
}
