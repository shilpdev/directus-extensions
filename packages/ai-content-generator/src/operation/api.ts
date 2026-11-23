import { defineOperationApi } from '@directus/extensions-sdk'
import { isBlank } from '../lib/blank'
import { getAllowedModels, getToken } from '../lib/env'
import { ContentGeneratorError } from '../lib/errors'
import { renderTemplate } from '../lib/template'
import { providers } from '../providers'
import { DEFAULT_MAX_TOKENS, EXTENSION_ID, PROVIDERS, isProviderId } from '../providers/meta'
import type { GenerateResult, OutputFormat } from '../providers/types'

interface Options {
  provider?: string
  variables?: unknown
  prompt?: string
  system_prompt?: string | null
  model?: string | null
  max_tokens?: number | string | null
  output_format?: OutputFormat
  json_schema?: unknown
  /** Provider-only options, prefixed with the provider id, e.g. claude_effort. */
  [key: string]: unknown
}

/** Options named `<provider>_<name>`, returned as `{ <name>: value }`. */
function getProviderOptions(options: Options, providerId: string): Record<string, unknown> {
  const prefix = `${providerId}_`
  return Object.fromEntries(
    Object.entries(options)
      .filter(([key, value]) => key.startsWith(prefix) && !isBlank(value))
      .map(([key, value]) => [key.slice(prefix.length), value]),
  )
}

/** Directus may hand JSON options over as an object or as a string. */
function toObject(value: unknown, field: string): Record<string, unknown> | undefined {
  if (isBlank(value)) return undefined
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new ContentGeneratorError('INVALID_OPTION', `${field} is not valid JSON.`)
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ContentGeneratorError('INVALID_OPTION', `${field} must be a JSON object.`)
  }
  return parsed as Record<string, unknown>
}

function toMaxTokens(value: Options['max_tokens']): number {
  if (isBlank(value)) return DEFAULT_MAX_TOKENS
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1) {
    throw new ContentGeneratorError('INVALID_OPTION', 'Max Tokens must be a positive whole number.')
  }
  return number
}

export default defineOperationApi<Options>({
  id: EXTENSION_ID,

  handler: async (options, { env }): Promise<GenerateResult> => {
    const providerId = options.provider ?? 'claude'
    if (!isProviderId(providerId)) {
      throw new ContentGeneratorError('INVALID_OPTION', `Unknown AI provider "${providerId}".`)
    }
    const meta = PROVIDERS[providerId]

    const apiKey = getToken(env, meta)
    if (!apiKey) {
      throw new ContentGeneratorError('NOT_CONFIGURED', `Set ${meta.tokenEnvKey} in the Directus environment to use ${meta.label}.`)
    }

    const allowedModels = getAllowedModels(env, meta)
    if (allowedModels.length === 0) {
      throw new ContentGeneratorError('NOT_CONFIGURED', `Set ${meta.modelsEnvKey} to a comma separated list of model IDs to use ${meta.label}.`)
    }

    if (!options.prompt?.trim()) {
      throw new ContentGeneratorError('INVALID_OPTION', 'Prompt is required.')
    }

    const model = isBlank(options.model) ? allowedModels[0]! : String(options.model).trim()
    if (!allowedModels.includes(model)) {
      throw new ContentGeneratorError('MODEL_NOT_ALLOWED', `Model "${model}" is not in ${meta.modelsEnvKey}. Allowed: ${allowedModels.join(', ')}.`)
    }

    const outputFormat: OutputFormat = options.output_format === 'json' ? 'json' : 'text'
    const jsonSchema = outputFormat === 'json' ? toObject(options.json_schema, 'JSON Schema') : undefined
    if (outputFormat === 'json' && !jsonSchema) {
      throw new ContentGeneratorError('INVALID_OPTION', 'JSON Schema is required when Output Format is JSON.')
    }

    const variables = toObject(options.variables, 'Variables') ?? {}
    const prompt = renderTemplate(options.prompt, variables)
    const systemPrompt = !isBlank(options.system_prompt) ? renderTemplate(String(options.system_prompt), variables) : undefined

    return providers[providerId].generate(
      {
        model,
        prompt,
        systemPrompt,
        maxTokens: toMaxTokens(options.max_tokens),
        outputFormat,
        jsonSchema,
        providerOptions: getProviderOptions(options, providerId),
      },
      apiKey,
    )
  },
})
