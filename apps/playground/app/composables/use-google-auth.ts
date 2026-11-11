import { ENDPOINT_ID } from '~/constants'

type Tokens = {
  access_token: string
  refresh_token: string
  expires: number
}

type DirectusUser = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: { name: string } | null
}

type LogEntry = { time: string; message: string }

const errorMessage = (error: any) =>
  error?.data?.errors?.[0]?.message ?? error?.message ?? 'Unexpected error'

export function useGoogleAuth() {
  const { public: config } = useRuntimeConfig()
  const directusUrl = config.directusUrl.replace(/\/+$/, '')

  // Tokens live in memory only, so a page reload logs out. That is enough for a playground.
  const tokens = useState<Tokens | null>('google-auth-tokens', () => null)
  const user = useState<DirectusUser | null>('google-auth-user', () => null)
  const error = useState<string | null>('google-auth-error', () => null)
  const logs = useState<LogEntry[]>('google-auth-logs', () => [])

  const log = (message: string) => {
    logs.value.unshift({ time: new Date().toLocaleTimeString(), message })
  }

  async function loadUser() {
    const response = await $fetch<{ data: DirectusUser }>(`${directusUrl}/users/me`, {
      headers: { Authorization: `Bearer ${tokens.value!.access_token}` },
      query: { fields: 'id,email,first_name,last_name,role.name' },
    })

    user.value = response.data
    log(`GET /users/me -> ${response.data.email}`)
  }

  async function finishLogin(newTokens: Tokens) {
    tokens.value = newTokens
    error.value = null
    await loadUser()
  }

  // Flow A: the browser goes to Directus, then Google, then comes back with ?code=
  function loginWithRedirect() {
    const redirect = `${window.location.origin}/`
    log(`Redirecting to /${ENDPOINT_ID}/start`)
    window.location.href = `${directusUrl}/${ENDPOINT_ID}/start?redirect=${encodeURIComponent(redirect)}`
  }

  // Flow A, second half: trade the one time code for real tokens
  async function exchangeCode(code: string) {
    try {
      log('POST /auth/refresh with the code')
      const response = await $fetch<{ data: Tokens }>(`${directusUrl}/auth/refresh`, {
        method: 'POST',
        body: { refresh_token: code, mode: 'json' },
      })
      await finishLogin(response.data)
    } catch (caught) {
      error.value = errorMessage(caught)
      log(`Code exchange failed: ${error.value}`)
    }
  }

  // Flow B: the Google button gives an ID token in the browser
  async function loginWithCredential(credential: string) {
    try {
      log(`POST /${ENDPOINT_ID}/token`)
      const response = await $fetch<{ data: Tokens }>(`${directusUrl}/${ENDPOINT_ID}/token`, {
        method: 'POST',
        body: { credential },
      })
      await finishLogin(response.data)
    } catch (caught) {
      error.value = errorMessage(caught)
      log(`Token login failed: ${error.value}`)
    }
  }

  async function logout() {
    if (tokens.value) {
      await $fetch(`${directusUrl}/auth/logout`, {
        method: 'POST',
        body: { refresh_token: tokens.value.refresh_token, mode: 'json' },
      }).catch(() => {})
      log('POST /auth/logout')
    }

    tokens.value = null
    user.value = null
  }

  return { tokens, user, error, logs, log, loginWithRedirect, exchangeCode, loginWithCredential, logout }
}
