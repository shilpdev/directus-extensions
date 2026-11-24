# @shilp.dev/directus-google-auth

"Login with Google" for **custom frontends** on Directus. Directus' built-in Google SSO is meant for the admin app; this extension gives your own app a login that signs users in as normal Directus users, and registers them the first time they come.

It is an endpoint extension, mounted at `/shilp/google-auth`.

## Install

Copy this folder (or the built `dist` + `package.json`) to `extensions/directus-google-auth` and restart Directus. Or publish it to npm and install it as any other extension.

## Google setup

1. In Google Cloud Console, create an OAuth client of type **Web application**.
2. Add **Authorized redirect URI**: `<PUBLIC_URL>/shilp/google-auth/callback`
3. If you use the One Tap / button flow (`POST /token`), also add your frontend as an **Authorized JavaScript origin**.

## Configuration

All settings are environment variables of the Directus instance. The extension stays disabled until the client id and secret are set. Restart Directus after changing them.

| Variable | Description |
| --- | --- |
| `SHILP_GOOGLE_AUTH_CLIENT_ID` | Google OAuth client id. Required. |
| `SHILP_GOOGLE_AUTH_CLIENT_SECRET` | Google OAuth client secret. Required. |
| `SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST` | Comma separated frontend origins a login may return to, e.g. `https://app.com`. Any page of an allowed origin is accepted. Use `https://*.app.com` to accept every subdomain of `app.com` (same scheme and port; the bare `app.com` is not included, list it separately if needed). |

`PUBLIC_URL` and `SECRET` are Directus' own settings and are required too. The callback URL is always `<PUBLIC_URL>/shilp/google-auth/callback`.

### Registration

Sign up follows Directus' own **Public Registration** setting (Settings > Project Settings > User Registration). When it is on, new Google users are created with the **Public Registration Role**. When it is off, only existing users can sign in. An existing user with the same Google verified email is signed in as that user.

## Modes: session cookie or JWT

Both flows support two ways of holding the login. The frontend picks one with the `mode` parameter, and `session` is the default.

| | `session` (default) | `json` |
| --- | --- | --- |
| What the frontend gets | Directus' httpOnly session cookie. No token reaches JavaScript. | An access token and a refresh token it stores itself. |
| Directus SDK | `authentication('session', { credentials: 'include' })` | `authentication('json')` |
| Good for | Web apps on the same site as Directus. Safer against XSS. | Other domains, mobile or desktop apps, non-browser clients. |
| Needs | `SESSION_COOKIE_*` and CORS with credentials (see below). | Nothing special. Keep the tokens out of long lived storage if you can. |

## Flow A: redirect (works for any frontend)

1. Send the browser to

   ```
   GET <DIRECTUS>/shilp/google-auth/start?redirect_uri=https://app.com/auth/callback&mode=session
   ```

   `mode` is `session` or `json`. Anything else is rejected with `INVALID_PAYLOAD`.

2. The user signs in at Google, then the browser is sent to your `redirect_uri`.

### `mode=session`

The extension sets Directus' own session cookie (the one `POST /auth/login` with `mode: "session"` sets: `SESSION_COOKIE_NAME`, with the `SESSION_COOKIE_DOMAIN`, `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAME_SITE` and `SESSION_COOKIE_TTL` options) and redirects with

- nothing, or `?picture=<url>`: success. `picture` is the Google photo URL, when Google sent one; it is not stored anywhere. Or
- `?error=<ERROR_CODE>`: failure (see below).

From then on, the session is a regular Directus session: requests with `credentials: "include"` are authenticated by the cookie, refresh it with `POST /auth/refresh` (`{"mode": "session"}`), log out with `POST /auth/logout` (`{"mode": "session"}`).

For the browser to send the cookie, the frontend and Directus must be on the same site: set `SESSION_COOKIE_DOMAIN` to the shared parent domain (e.g. `.example.com` for `app.example.com` and `admin.example.com`), `SESSION_COOKIE_SECURE=true`, and enable CORS with credentials for the frontend origins (`CORS_ENABLED=true`, `CORS_ORIGIN`, `CORS_CREDENTIALS=true`).

With the Directus SDK, call `client.refresh()` once when the page loads (and on your callback page). The SDK knows nothing about the cookie until then, and the call also lets it refresh the session by itself from then on.

```ts
const client = createDirectus('https://directus.example.com')
  .with(authentication('session', { credentials: 'include' }))
  .with(rest({ credentials: 'include' }))

await client.refresh()
const me = await client.request(readMe())
```

### `mode=json`

No cookie is set. The browser is redirected with

- `?code=<code>` (and `?picture=<url>` when Google sent one): success. The code is a one time Directus refresh token that works for **2 minutes**. Or
- `?error=<ERROR_CODE>`: failure.

Trade the code for tokens right away with `POST /auth/refresh`. It also rotates the code, so it works only once:

```bash
curl -X POST <DIRECTUS>/auth/refresh \
  -H 'content-type: application/json' \
  -d '{"mode": "json", "refresh_token": "<code>"}'
# { "data": { "access_token": "...", "refresh_token": "...", "expires": 900000 } }
```

With the Directus SDK, put the code in the SDK's storage as the refresh token and refresh once. After that the SDK keeps the tokens and refreshes them by itself:

```ts
import { authentication, createDirectus, memoryStorage, rest } from '@directus/sdk'

const storage = memoryStorage()
const client = createDirectus('https://directus.example.com')
  .with(authentication('json', { storage }))
  .with(rest())

// On your callback page, `code` is the ?code= from the URL
await storage.set({ access_token: null, refresh_token: code, expires: null, expires_at: null })
await client.refresh()
```

Remove `?code=` from the URL right away so a reload or a shared link can't reuse it.

## Flow B: Google Identity Services (button / One Tap)

If your frontend already gets the Google ID token in the browser, post it with the mode you want:

```bash
curl -i -X POST <DIRECTUS>/shilp/google-auth/token \
  -H 'content-type: application/json' \
  -d '{"credential": "<google id token>", "mode": "session"}'
```

- `mode: "session"` (default): responds **204** with a `Set-Cookie` for the Directus session cookie. The browser request must include credentials (`fetch(..., { credentials: 'include' })`), and `CORS_CREDENTIALS=true` with an explicit `CORS_ORIGIN` must be set on Directus.
- `mode: "json"`: responds like `POST /auth/login` in json mode: `{ "data": { "access_token": "...", "refresh_token": "...", "expires": 900000 } }`. With the SDK, store the tokens with `storage.set({ access_token, refresh_token, expires, expires_at: Date.now() + expires })`, or call `client.setToken(access_token)` for a token you will not refresh.

The token is verified against Google's keys and must be issued for `SHILP_GOOGLE_AUTH_CLIENT_ID`.

## Error codes

`ACCESS_DENIED`, `INVALID_STATE`, `GOOGLE_EXCHANGE_FAILED`, `INVALID_GOOGLE_TOKEN`, `EMAIL_NOT_VERIFIED`, `SIGNUP_DISABLED`, `MISCONFIGURED`, `USER_NOT_ACTIVE`, `USER_NOT_ALLOWED`, `NOT_CONFIGURED`, `INVALID_REDIRECT`, `INVALID_PAYLOAD`.

## How users are handled

- Only Google accounts with a **verified email** are accepted.
- A user is matched by Google id (`external_identifier = google:<sub>`), then by email.
- New users are created through Directus' `UsersService` with the public registration role, status `active`, no password, so normal hooks and user limits apply. Names come from the Google profile.
- Users are stored with the built-in `default` provider. Directus only refreshes sessions of users whose provider is registered, and `default` always is. They can't sign in with a password unless one is set later (for example through a password reset).
- Sessions and tokens are issued by Directus' own `AuthenticationService`, so roles, policies and `auth.*` hooks behave as for a normal login.
- Existing users from other providers (LDAP, SAML, ...), users with 2FA and non active users are refused.

## Security notes

- In `json` mode the one time code travels in the redirect URL, so it is only valid for 2 minutes and works once. Exchange it immediately and remove it from the URL.
- The redirect is checked against the allow list both when starting and when finishing the login.
- State, nonce and PKCE live in a signed, httpOnly cookie, so a login can only be completed by the browser that started it.
- The Directus rate limiter and `LOGIN_STALL_TIME` do not apply to these endpoints. Add rate limiting at your proxy if needed.
