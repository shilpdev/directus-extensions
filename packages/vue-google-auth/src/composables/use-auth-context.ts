import { inject } from 'vue'
import { AUTH_CONTEXT_KEY } from '../constants'
import type { AuthContext } from '../types'

// The state and actions <Auth> shares. Only works inside <Auth>.
export function useAuthContext(): AuthContext {
  const context = inject(AUTH_CONTEXT_KEY, undefined)

  if (!context) {
    throw new Error('Auth components must be used inside <Auth>')
  }

  return context
}
