import { readMe } from '@directus/sdk'

export type AuthUser = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: { name: string } | null
}

// The signed in user, shared by every page and component
export function useAuth() {
  const { $directus } = useNuxtApp()

  const user = useState<AuthUser | null>('auth-user', () => null)
  // True once the session has been checked after the page loaded
  const isChecked = useState('auth-checked', () => false)

  // Loads the user behind the session cookie. Resolves null when there is no valid session.
  async function fetchUser() {
    try {
      /*
       * After a page load the SDK knows nothing about the session cookie. refresh() checks it and
       * tells the SDK when it expires, so the SDK keeps refreshing it by itself afterwards.
       */
      await $directus.refresh()
      user.value = (await $directus.request(
        readMe({ fields: ['id', 'email', 'first_name', 'last_name', { role: ['name'] }] }),
      )) as AuthUser
    } catch {
      user.value = null
    }

    isChecked.value = true
    return user.value
  }

  async function logout() {
    await $directus.logout().catch(() => {})
    user.value = null
  }

  return { user, isChecked, fetchUser, logout }
}
