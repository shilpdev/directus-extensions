// Route prefix of the endpoint, e.g. GET <PUBLIC_URL>/shilp/google-auth/start
export const ENDPOINT_ID = "shilp/google-auth";

export const LOG_PREFIX = `[${ENDPOINT_ID}]`;

/*
 * Users are stored with the built-in `default` provider. Directus only
 * refreshes sessions of users whose provider is registered, and `default`
 * always is.
 */
export const DIRECTUS_USER_PROVIDER = "default";

export const FLOW_COOKIE_NAME = "google_auth_state";

export const FLOW_COOKIE_TTL_SECONDS = 10 * 60;

/*
 * How long the session row created at login lives before it is refreshed.
 * In "session" mode /callback and /token refresh it right away. In "json" mode it is the one
 * time code of the redirect flow: the frontend has this long to trade it with POST /auth/refresh.
 */
export const SESSION_CODE_TTL_MS = 2 * 60 * 1000
