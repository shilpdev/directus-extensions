import type { ProviderId } from './meta'

export type OutputFormat = 'text' | 'json'

/** Provider-neutral request built by the operation handler. */
export interface GenerateRequest {
  model: string
  prompt: string
  systemPrompt?: string
  maxTokens: number
  outputFormat: OutputFormat
  /** JSON Schema the output must match, when outputFormat is `json`. */
  jsonSchema?: Record<string, unknown>
  /** Options only one provider understands, e.g. Claude's `effort`. */
  providerOptions: Record<string, unknown>
}

export interface GenerateResult {
  /** Raw generated text. For JSON output this is the JSON string. */
  text: string
  /** Parsed object when outputFormat is `json`, otherwise null. */
  json: unknown
  provider: ProviderId
  /** Model ID the provider reports for the output. */
  model: string
  stop_reason: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

/**
 * To add a provider (ChatGPT, Gemini, ...):
 * 1. add its metadata to PROVIDERS in ./meta.ts
 * 2. implement this interface in ./<provider>.ts
 * 3. register it in ./index.ts
 */
export interface AiProvider {
  id: ProviderId
  generate(request: GenerateRequest, apiKey: string): Promise<GenerateResult>
}
