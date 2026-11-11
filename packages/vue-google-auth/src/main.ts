export { default as Auth } from './components/auth.vue'
export { default as AuthCallback } from './components/callback.vue'
export { default as AuthError } from './components/error.vue'
export { default as AuthGoogleButton } from './components/google-button.vue'
export { default as AuthLoading } from './components/loading.vue'
export { default as AuthLog } from './components/log.vue'
export { default as AuthLoginButton } from './components/login-button.vue'
export { default as AuthLogoutButton } from './components/logout-button.vue'
export { default as AuthSignedIn } from './components/signed-in.vue'
export { default as AuthSignedOut } from './components/signed-out.vue'
export { default as AuthUser } from './components/user.vue'

export { useAuthContext } from './composables/use-auth-context'
export { toSafePath } from './utils'
export type {
  AuthAdapter,
  AuthContext,
  AuthHooks,
  AuthLogEntry,
  AuthStatus,
  AuthUserData,
} from './types'
