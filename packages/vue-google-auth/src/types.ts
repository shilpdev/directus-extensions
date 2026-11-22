export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

// Whatever your backend returns for the signed in user
export type AuthUserData = Record<string, any>

export type AuthLogEntry = {
  time: string
  message: string
}

/*
 * The only things the components need from your backend. Every method should throw an Error with
 * a readable message when it fails.
 */
export type AuthAdapter = {
  // The signed in user, or null when there is no session. Also used to restore a session on app start.
  getUser: () => Promise<AuthUserData | null>
  // Google button flow: trade Google's ID token for a session
  exchangeCredential?: (credential: string) => Promise<void>
  // End the session on the backend
  logout?: () => Promise<void>
  /*
   * Called once by <Auth> with hooks your adapter can use: `log` writes to the log, and `expire`
   * tells the components the session ended without the user asking (for example a refresh failed).
   */
  connect?: (hooks: AuthHooks) => void
}

export type AuthHooks = {
  log: (message: string) => void
  expire: () => void
}

// What <Auth> shares with every component inside it
export type AuthContext = {
  adapter: AuthAdapter
  status: AuthStatus
  isAuthenticated: boolean
  user: AuthUserData | null
  error: string | null
  logs: AuthLogEntry[]
  log: (message: string) => void
  clearError: () => void
  // Asks the adapter for the current user. Runs when <Auth> mounts.
  restoreSession: () => Promise<void>
  // Runs a login (`exchange` trades a code or credential for a session), then loads the user
  startSession: (exchange: () => Promise<void>) => Promise<boolean>
  // The session ended somewhere else. Only local state changes.
  expireSession: () => void
  // The user logged out here: clear local state and tell the other tabs
  endSession: () => void
}
