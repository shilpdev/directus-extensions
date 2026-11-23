import Anthropic from '@anthropic-ai/sdk'
import { ContentGeneratorError } from '../lib/errors'
import { CLAUDE_EFFORTS, type ClaudeEffort } from './meta'
import type { AiProvider, GenerateRequest, GenerateResult } from './types'

function toEffort(value: unknown): ClaudeEffort | undefined {
  return CLAUDE_EFFORTS.find((effort) => effort === value)
}

export const claudeProvider: AiProvider = {
  id: 'claude',

  async generate(request: GenerateRequest, apiKey: string): Promise<GenerateResult> {
    const client = new Anthropic({ apiKey })
    const effort = toEffort(request.providerOptions.effort)

    const outputConfig: Anthropic.OutputConfig = {}
    if (effort) outputConfig.effort = effort
    if (request.outputFormat === 'json' && request.jsonSchema) {
      outputConfig.format = { type: 'json_schema', schema: request.jsonSchema }
    }

    let message: Anthropic.Message
    try {
      // Streaming avoids HTTP timeouts on large max_tokens values.
      const stream = client.messages.stream({
        model: request.model,
        max_tokens: request.maxTokens,
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        messages: [{ role: 'user', content: request.prompt }],
        ...(Object.keys(outputConfig).length > 0 ? { output_config: outputConfig } : {}),
      })
      message = await stream.finalMessage()
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new ContentGeneratorError('PROVIDER_AUTH', 'Claude rejected the API token. Check SHILP_AI_CONTENT_GENERATOR_CLAUDE_TOKEN.')
      }
      if (error instanceof Anthropic.NotFoundError) {
        throw new ContentGeneratorError('PROVIDER_MODEL', `Claude model "${request.model}" was not found.`)
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new ContentGeneratorError('PROVIDER_RATE_LIMIT', `Claude rate limit reached, try again later: ${error.message}`)
      }
      if (error instanceof Anthropic.BadRequestError) {
        throw new ContentGeneratorError('PROVIDER_BAD_REQUEST', `Claude rejected the request: ${error.message}`)
      }
      if (error instanceof Anthropic.APIError) {
        throw new ContentGeneratorError('PROVIDER_ERROR', `Claude API error ${error.status ?? ''}: ${error.message}`)
      }
      throw error
    }

    if (message.stop_reason === 'refusal') {
      const category = message.stop_details?.category
      throw new ContentGeneratorError('PROVIDER_REFUSAL', `Claude declined to generate this content${category ? ` (${category})` : ''}.`)
    }

    const text = message.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('')
      .trim()

    if (message.stop_reason === 'max_tokens' && request.outputFormat === 'json') {
      throw new ContentGeneratorError('OUTPUT_TRUNCATED', 'Output hit Max Tokens before the JSON was complete. Raise Max Tokens.')
    }

    let json: unknown = null
    if (request.outputFormat === 'json') {
      try {
        json = JSON.parse(text)
      } catch {
        throw new ContentGeneratorError('INVALID_JSON', 'Claude did not return valid JSON.')
      }
    }

    return {
      text,
      json,
      provider: 'claude',
      model: message.model,
      stop_reason: message.stop_reason,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    }
  },
}
