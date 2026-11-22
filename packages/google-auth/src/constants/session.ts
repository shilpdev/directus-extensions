/*
 * Directus' own defaults for its session cookie. They apply when the
 * SESSION_COOKIE_* env variables are not set.
 */
export const DEFAULT_SESSION_COOKIE_NAME = 'directus_session_token'
export const DEFAULT_SESSION_COOKIE_TTL = '1d'
export const DEFAULT_SESSION_COOKIE_SAME_SITE = 'lax'

/*
 * How the frontend holds the login:
 * - "session": Directus' session cookie, set by the extension. No token reaches JavaScript.
 * - "json": the frontend gets tokens it stores itself (for other domains, mobile apps, ...).
 */
export const AUTH_MODES = ['session', 'json'] as const
export const DEFAULT_AUTH_MODE = 'session'

// Length of the `user_agent` column of `directus_sessions`
export const USER_AGENT_MAX_LENGTH = 1024
