import { AUTH_MODES, DEFAULT_AUTH_MODE } from '../constants/session'
import type { AuthMode } from '../types'
import { LoginError } from './errors'

// Reads the `mode` the frontend asked for. Example: undefined -> "session", "json" -> "json"
export function parseAuthMode(value: unknown): AuthMode {
  if (value === undefined) return DEFAULT_AUTH_MODE

  if (!AUTH_MODES.includes(value as AuthMode)) {
    throw new LoginError(400, 'INVALID_PAYLOAD', `"mode" must be one of: ${AUTH_MODES.join(', ')}`)
  }

  return value as AuthMode
}
