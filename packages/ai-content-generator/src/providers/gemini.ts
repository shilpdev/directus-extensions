import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel, type GenerateContentConfig, type GenerateContentResponse } from '@google/genai'
import { ContentGeneratorError } from '../lib/errors'
import { GEMINI_THINKING_LEVELS } from './meta'
import type { AiProvider, GenerateRequest, GenerateResult } from './types'

const THINKING_LEVELS: Record<(typeof GEMINI_THINKING_LEVELS)[number], ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
}

// Finish reasons that mean Gemini blocked the output instead of finishing it.
const BLOCKED_REASONS = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
])

/** Number option from the form: empty means "use the model default". */
function toNumber(value: unknown, name: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new ContentGeneratorError('INVALID_OPTION', `${name} must be a number from ${min} to ${max}.`)
  }
  return number
}

function buildConfig(request: GenerateRequest): GenerateContentConfig {
  const options = request.providerOptions
  const config: GenerateContentConfig = { maxOutputTokens: request.maxTokens }

  if (request.systemPrompt) config.systemInstruction = request.systemPrompt

  const temperature = toNumber(options.temperature, 'Temperature', 0, 2)
  const topP = toNumber(options.top_p, 'Top P', 0, 1)
  const topK = toNumber(options.top_k, 'Top K', 1, 1000)
  if (temperature !== undefined) config.temperature = temperature
  if (topP !== undefined) config.topP = topP
  if (topK !== undefined) config.topK = Math.round(topK)

  const level = THINKING_LEVELS[options.thinking_level as keyof typeof THINKING_LEVELS]
  if (level) config.thinkingConfig = { thinkingLevel: level }

  if (request.outputFormat === 'json' && request.jsonSchema) {
    config.responseMimeType = 'application/json'
    config.responseJsonSchema = request.jsonSchema
  }

  return config
}

export const geminiProvider: AiProvider = {
  id: 'gemini',

  async generate(request: GenerateRequest, apiKey: string): Promise<GenerateResult> {
    const ai = new GoogleGenAI({ apiKey })

    let response: GenerateContentResponse
    try {
      response = await ai.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: buildConfig(request),
      })
    } catch (error) {
      if (error instanceof ApiError) {
        // Gemini reports an invalid key as 400 API_KEY_INVALID, not 401.
        if (error.status === 401 || error.status === 403 || error.message.includes('API_KEY_INVALID')) {
          throw new ContentGeneratorError('PROVIDER_AUTH', 'Gemini rejected the API key. Check SHILP_AI_CONTENT_GENERATOR_GEMINI_TOKEN.')
        }
        if (error.status === 404) {
          throw new ContentGeneratorError('PROVIDER_MODEL', `Gemini model "${request.model}" was not found.`)
        }
        if (error.status === 429) {
          throw new ContentGeneratorError('PROVIDER_RATE_LIMIT', `Gemini rate limit or quota reached, try again later: ${error.message}`)
        }
        if (error.status === 400) {
          throw new ContentGeneratorError('PROVIDER_BAD_REQUEST', `Gemini rejected the request: ${error.message}`)
        }
        throw new ContentGeneratorError('PROVIDER_ERROR', `Gemini API error ${error.status}: ${error.message}`)
      }
      throw error
    }

    const blockReason = response.promptFeedback?.blockReason
    if (blockReason) {
      throw new ContentGeneratorError('PROVIDER_REFUSAL', `Gemini blocked the prompt (${blockReason}).`)
    }

    const finishReason = response.candidates?.[0]?.finishReason ?? null
    if (finishReason && BLOCKED_REASONS.has(finishReason)) {
      throw new ContentGeneratorError('PROVIDER_REFUSAL', `Gemini declined to generate this content (${finishReason}).`)
    }

    const text = (response.text ?? '').trim()

    if (finishReason === FinishReason.MAX_TOKENS && (request.outputFormat === 'json' || text === '')) {
      // Thinking tokens count toward the limit too, so a low limit can leave no room for the answer.
      throw new ContentGeneratorError('OUTPUT_TRUNCATED', 'Output hit Max Tokens before it was complete. Raise Max Tokens or lower the thinking level.')
    }

    let json: unknown = null
    if (request.outputFormat === 'json') {
      try {
        json = JSON.parse(text)
      } catch {
        throw new ContentGeneratorError('INVALID_JSON', 'Gemini did not return valid JSON.')
      }
    }

    return {
      text,
      json,
      provider: 'gemini',
      model: response.modelVersion ?? request.model,
      stop_reason: finishReason,
      usage: {
        input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
        output_tokens: (response.usageMetadata?.candidatesTokenCount ?? 0) + (response.usageMetadata?.thoughtsTokenCount ?? 0),
      },
    }
  },
}
