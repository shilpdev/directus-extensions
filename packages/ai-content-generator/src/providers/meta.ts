// Provider metadata shared by the app (options form) and the api (handler).
// Keep this file free of SDK imports so the app bundle stays small.

export type ProviderId = 'claude' | 'gemini'

export interface ProviderMeta {
  id: ProviderId
  label: string
  /** Env variable that holds the API key/token for this provider. */
  tokenEnvKey: string
  /** Env variable with the comma separated list of allowed model IDs. */
  modelsEnvKey: string
}

export const CLAUDE_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type ClaudeEffort = (typeof CLAUDE_EFFORTS)[number]

export const GEMINI_THINKING_LEVELS = ['minimal', 'low', 'medium', 'high'] as const
export type GeminiThinkingLevel = (typeof GEMINI_THINKING_LEVELS)[number]

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  claude: {
    id: 'claude',
    label: 'Claude (Anthropic)',
    tokenEnvKey: 'SHILP_AI_CONTENT_GENERATOR_CLAUDE_TOKEN',
    modelsEnvKey: 'SHILP_AI_CONTENT_GENERATOR_CLAUDE_MODELS',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    tokenEnvKey: 'SHILP_AI_CONTENT_GENERATOR_GEMINI_TOKEN',
    modelsEnvKey: 'SHILP_AI_CONTENT_GENERATOR_GEMINI_MODELS',
  },
}

export const DEFAULT_PROVIDER: ProviderId = 'claude'
export const DEFAULT_MAX_TOKENS = 4096

/** Ids shared between the bundle entries. */
export const EXTENSION_ID = 'shilp-ai-content-generator'
export const MODEL_INTERFACE_ID = 'shilp-ai-content-generator-model-select'

export function isProviderId(value: unknown): value is ProviderId {
  // Own keys only, so "toString", "__proto__" etc. are not taken as providers.
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDERS, value)
}
