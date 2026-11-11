import { REFRESH_MARGIN_MS, REFRESH_RETRY_MS } from '~/constants'
import type { AuthAdapter, AuthHooks } from '@shilp.dev/vue-google-auth'

type Tokens = {
  access_token: string
  refresh_token?: string
  // Lifetime of the access token in milliseconds
  expires: number
}

type DirectusAdapterOptions = {
  directusUrl: string
  // Route prefix of the @shilp.dev/directus-google-auth extension
  endpoint?: string
}

// Directus errors look like { errors: [{ message }] }
const toError = (caught: any) =>
  new Error(caught?.data?.errors?.[0]?.message ?? caught?.message ?? 'Unexpected error')

// The short lived access token, in memory only
export function useDirectusSession() {
  return {
    accessToken: useState<string | null>('directus-access-token', () => null),
    expiresAt: useState<number | null>('directus-expires-at', () => null),
  }
}

/*
 * Connects the auth components to Directus:
 * - The refresh token never reaches JavaScript. Directus keeps it in an httpOnly cookie
 *   (`mode: 'cookie'`), so a page reload restores the session with one POST /auth/refresh.
 * - Directus rotates the refresh token on every refresh, so refreshes are serialized: one at a
 *   time in this tab (inflight) and one at a time across tabs (Web Locks).
 */
let inflight: Promise<boolean> | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let isListening = false

export function createDirectusAdapter(options: DirectusAdapterOptions): AuthAdapter {
  const { endpoint = 'shilp/google-auth' } = options
  const baseUrl = options.directusUrl.replace(/\/+$/, '')
  const { accessToken, expiresAt } = useDirectusSession()

  // Set by <Auth> through connect()
  let hooks: AuthHooks | null = null
  const log = (message: string) => hooks?.log(message)

  function clearSession() {
    clearTimeout(timer)
    accessToken.value = null
    expiresAt.value = null
  }

  function scheduleRefresh(delay: number) {
    clearTimeout(timer)
    timer = setTimeout(() => void refresh(), Math.max(delay, 0))
  }

  function applyTokens(tokens: Tokens) {
    accessToken.value = tokens.access_token
    expiresAt.value = Date.now() + tokens.expires
    scheduleRefresh(tokens.expires - REFRESH_MARGIN_MS)
  }

  // Trades the refresh token cookie (or a given refresh token) for a new access token.
  // Resolves false when there is no valid session. Never rejects.
  function refresh(refreshToken?: string): Promise<boolean> {
    inflight ??= (async () => {
      try {
        // The lock makes tabs take turns: the second one sends the cookie the first one just rotated
        const run = () => requestTokens(refreshToken)
        return navigator.locks ? await navigator.locks.request('directus-refresh', run) : await run()
      } finally {
        inflight = null
      }
    })()

    return inflight
  }

  async function requestTokens(refreshToken?: string): Promise<boolean> {
    try {
      const response = await $fetch<{ data: Tokens }>(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        body: { mode: 'cookie', ...(refreshToken ? { refresh_token: refreshToken } : {}) },
      })

      applyTokens(response.data)
      log('POST /auth/refresh -> new access token')
      return true
    } catch (caught: any) {
      const code = caught?.statusCode ?? caught?.response?.status

      if (code && code < 500) {
        log(`POST /auth/refresh -> ${code}, no valid session`)

        if (accessToken.value) {
          clearSession()
          // Directus says the session is gone (expired, logged out elsewhere, suspended user)
          hooks?.expire()
        }

        return false
      }

      // Directus is unreachable: keep what we have and try again shortly
      log('POST /auth/refresh -> network or server error, retrying')
      if (accessToken.value) scheduleRefresh(REFRESH_RETRY_MS)
      return false
    }
  }

  // Request helper for the Directus API: adds the token, refreshes first when it is about to
  // expire, and retries once when Directus still answers 401.
  async function request<T>(path: string, requestOptions: Record<string, any> = {}): Promise<T> {
    if (!accessToken.value || (expiresAt.value ?? 0) - Date.now() < REFRESH_MARGIN_MS) {
      await refresh()
    }

    const send = () =>
      $fetch<T>(`${baseUrl}${path}`, {
        ...requestOptions,
        headers: { ...requestOptions.headers, Authorization: `Bearer ${accessToken.value}` },
      })

    try {
      return await send()
    } catch (caught: any) {
      if (caught?.statusCode === 401 && (await refresh())) return await send()
      throw caught
    }
  }

  // Timers are throttled in background tabs, so check again when the tab comes back
  function listenForVisibility() {
    if (isListening) return
    isListening = true

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !accessToken.value) return
      if ((expiresAt.value ?? 0) - Date.now() < REFRESH_MARGIN_MS) void refresh()
    })
  }

  return {
    connect(authHooks) {
      hooks = authHooks
    },

    async getUser() {
      if (!accessToken.value && !(await refresh())) return null
      listenForVisibility()

      const response = await request<{ data: Record<string, any> }>('/users/me', {
        query: { fields: 'id,email,first_name,last_name,role.name' },
      })

      log(`GET /users/me -> ${response.data.email}`)
      return response.data
    },

    // Trading the one time code with mode "cookie" makes Directus set the httpOnly session cookie
    async exchangeCode(code) {
      if (!(await refresh(code))) throw new Error('The code is invalid or expired')
    },

    async exchangeCredential(credential) {
      try {
        log(`POST /${endpoint}/token`)
        const response = await $fetch<{ data: Tokens }>(`${baseUrl}/${endpoint}/token`, {
          method: 'POST',
          body: { credential },
        })

        if (!(await refresh(response.data.refresh_token))) throw new Error('Could not start the session')
      } catch (caught) {
        throw toError(caught)
      }
    },

    async logout() {
      log('POST /auth/logout')

      // The cookie holds the refresh token, so no token is sent
      await $fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        body: { mode: 'cookie' },
      }).catch(() => {})

      clearSession()
    },
  }
}
