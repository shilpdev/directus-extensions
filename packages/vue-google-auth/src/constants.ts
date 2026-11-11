import type { InjectionKey } from 'vue'
import type { AuthContext } from './types'

export const AUTH_CONTEXT_KEY: InjectionKey<AuthContext> = Symbol('google-auth-context')

// Where the page to open after logging in is kept while the browser is at Google
export const RETURN_TO_KEY = 'google-auth-return-to'

// Tells the other tabs when this one logs in or out
export const CHANNEL_NAME = 'google-auth'
