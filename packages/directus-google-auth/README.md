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
| `SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST` | Comma separated frontend origins a login may return to, e.g. `https://app.com`. Any page of an allowed origin is accepted. |

`PUBLIC_URL` and `SECRET` are Directus' own settings and are required too. The callback URL is always `<PUBLIC_URL>/shilp/google-auth/callback`.

### Registration

Sign up follows Directus' own **Public Registration** setting (Settings > Project Settings > User Registration). When it is on, new Google users are created with the **Public Registration Role**. When it is off, only existing users can sign in. An existing user with the same Google verified email is signed in as that user.

## Flow A: redirect (works for any frontend)

1. Send the browser to

   ```
   GET <DIRECTUS>/shilp/google-auth/start?redirect_uri=https://app.com/auth/callback
   ```

2. The user signs in at Google and lands on your `redirect_uri` URL with either
   - `?code=<code>`: success, or
   - `?error=<ERROR_CODE>`: failure (see below).
3. Trade the code for tokens with the standard Directus endpoint. It works with every mode (`json`, `cookie`, `session`) and with the Directus SDK's `refresh()`:

   ```bash
   curl -X POST <DIRECTUS>/auth/refresh \
     -H 'content-type: application/json' \
     -d '{"refresh_token": "<code>", "mode": "json"}'
   ```

   The code is a normal refresh token that lives for 2 minutes and works once, because Directus rotates it on the first use. Always trade it right away.

From then on, the session is a regular Directus session: refresh with `/auth/refresh`, log out with `/auth/logout`.

## Flow B: Google Identity Services (button / One Tap)

If your frontend already gets the Google ID token in the browser:

```bash
curl -X POST <DIRECTUS>/shilp/google-auth/token \
  -H 'content-type: application/json' \
  -d '{"credential": "<google id token>"}'
# { "data": { "access_token": "...", "refresh_token": "...", "expires": 900000 } }
```

The token is verified against Google's keys and must be issued for `SHILP_GOOGLE_AUTH_CLIENT_ID`.

## Error codes

`ACCESS_DENIED`, `INVALID_STATE`, `GOOGLE_EXCHANGE_FAILED`, `INVALID_GOOGLE_TOKEN`, `EMAIL_NOT_VERIFIED`, `SIGNUP_DISABLED`, `MISCONFIGURED`, `USER_NOT_ACTIVE`, `USER_NOT_ALLOWED`, `NOT_CONFIGURED`, `INVALID_REDIRECT`, `INVALID_PAYLOAD`.

## How users are handled

- Only Google accounts with a **verified email** are accepted.
- A user is matched by Google id (`external_identifier = google:<sub>`), then by email.
- New users are created through Directus' `UsersService` with the public registration role, status `active`, no password, so normal hooks and user limits apply. Names come from the Google profile.
- Users are stored with the built-in `default` provider. Directus only refreshes sessions of users whose provider is registered, and `default` always is. They can't sign in with a password unless one is set later (for example through a password reset).
- Tokens are issued by Directus' own `AuthenticationService`, so roles, policies and `auth.*` hooks behave as for a normal login.
- Existing users from other providers (LDAP, SAML, ...), users with 2FA and non active users are refused.

## Security notes

- The redirect is checked against the allow list both when starting and when finishing the login.
- State, nonce and PKCE live in a signed, httpOnly cookie, so a login can only be completed by the browser that started it.
- The Directus rate limiter and `LOGIN_STALL_TIME` do not apply to these endpoints. Add rate limiting at your proxy if needed.
