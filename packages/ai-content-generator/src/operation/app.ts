import { defineOperationApp } from '@directus/extensions-sdk'
import {
  CLAUDE_EFFORTS,
  DEFAULT_MAX_TOKENS,
  DEFAULT_PROVIDER,
  EXTENSION_ID,
  GEMINI_THINKING_LEVELS,
  MODEL_INTERFACE_ID,
  PROVIDERS,
  isProviderId,
} from '../providers/meta'

const VARIABLES_PLACEHOLDER = `{
  "title": "{{ $last.title }}",
  "year": "{{ $last.year }}",
  "genres": "{{ $last.genres }}"
}`

const PROMPT_PLACEHOLDER = `Write a 120 word description for the movie {title} ({year}).
Genres: {genres}. Do not reveal the ending.`

const JSON_SCHEMA_PLACEHOLDER = `{
  "type": "object",
  "properties": {
    "short_description": { "type": "string" },
    "long_description": { "type": "string" }
  },
  "required": ["short_description", "long_description"],
  "additionalProperties": false
}`

export default defineOperationApp({
  id: EXTENSION_ID,
  name: 'AI Content Generator',
  icon: 'auto_awesome',
  description: 'Generate content with AI (Claude, Gemini) from a prompt and variables.',

  overview: ({ provider, model, output_format }) => {
    const meta = PROVIDERS[isProviderId(provider) ? provider : DEFAULT_PROVIDER]
    return [
      { label: 'Provider', text: meta.label },
      { label: 'Model', text: model || 'Default (first allowed model)' },
      { label: 'Output', text: output_format === 'json' ? 'JSON' : 'Text' },
    ]
  },

  options: (options) => {
    const provider = isProviderId(options?.provider) ? options.provider : DEFAULT_PROVIDER
    const meta = PROVIDERS[provider]
    const isJson = options?.output_format === 'json'

    return [
      {
        field: 'provider',
        name: 'AI Provider',
        type: 'string' as const,
        schema: { default_value: DEFAULT_PROVIDER },
        meta: {
          width: 'full',
          interface: 'select-dropdown',
          required: true,
          options: {
            choices: Object.values(PROVIDERS).map((p) => ({ text: p.label, value: p.id })),
          },
        },
      },
      {
        field: 'token_notice',
        type: 'alias' as const,
        meta: {
          width: 'full',
          interface: 'presentation-notice',
          options: {
            color: 'warning',
            icon: 'key',
            text: `The ${meta.label} API token is read from the <code>${meta.tokenEnvKey}</code> environment variable, and the allowed models from <code>${meta.modelsEnvKey}</code> (comma separated). Add them to your Directus <code>.env</code> file and restart Directus. Never paste the token in this form.`,
          },
        },
      },
      {
        field: 'variables',
        name: 'Variables',
        type: 'json' as const,
        meta: {
          width: 'full',
          interface: 'input-code',
          note: 'Key/value pairs used in the prompt as <code>{key}</code>. Values can use Directus flow data, e.g. <code>{{ $last.title }}</code>.',
          options: { language: 'json', placeholder: VARIABLES_PLACEHOLDER, template: VARIABLES_PLACEHOLDER },
        },
      },
      {
        field: 'prompt',
        name: 'Prompt',
        type: 'text' as const,
        meta: {
          width: 'full',
          interface: 'input-multiline',
          required: true,
          note: 'Reference variables with single braces: <code>{title}</code>, nested: <code>{movie.year}</code>. A missing or empty variable fails the flow.',
          options: { placeholder: PROMPT_PLACEHOLDER },
        },
      },
      {
        field: 'system_prompt',
        name: 'System Prompt',
        type: 'text' as const,
        meta: {
          width: 'full',
          interface: 'input-multiline',
          note: 'Optional. Tone, brand voice, rules. Supports <code>{variables}</code> too.',
          options: { placeholder: 'You are a copywriter for a movie streaming site. Reply with the text only.' },
        },
      },
      {
        field: 'model',
        name: 'Model',
        type: 'string' as const,
        meta: {
          width: 'full',
          interface: MODEL_INTERFACE_ID,
          note: `Models come from <code>${meta.modelsEnvKey}</code>. Leave empty to use the first one.`,
          options: { provider },
        },
      },
      {
        field: 'max_tokens',
        name: 'Max Tokens',
        type: 'integer' as const,
        schema: { default_value: DEFAULT_MAX_TOKENS },
        meta: {
          width: 'half',
          interface: 'input',
          note: 'Upper limit of the generated output. The output is cut off when it is reached.',
          options: { min: 1, max: 128000, placeholder: String(DEFAULT_MAX_TOKENS) },
        },
      },
      ...(provider === 'claude'
        ? [
            {
              field: 'claude_effort',
              name: 'Effort',
              type: 'string' as const,
              schema: { default_value: 'medium' },
              meta: {
                width: 'half' as const,
                interface: 'select-dropdown',
                note: 'Higher effort = better quality on hard tasks, but slower and more tokens. "low" is fine for short copy.',
                options: { choices: CLAUDE_EFFORTS.map((effort) => ({ text: effort, value: effort })) },
              },
            },
          ]
        : []),
      ...(provider === 'gemini'
        ? [
            {
              field: 'gemini_thinking_level',
              name: 'Thinking Level',
              type: 'string' as const,
              meta: {
                width: 'half' as const,
                interface: 'select-dropdown',
                note: 'Empty = model default. Not every model supports every level. Thinking tokens count toward Max Tokens.',
                options: {
                  allowNone: true,
                  placeholder: 'Model default',
                  choices: GEMINI_THINKING_LEVELS.map((level) => ({ text: level, value: level })),
                },
              },
            },
            {
              field: 'gemini_temperature',
              name: 'Temperature',
              type: 'float' as const,
              meta: {
                width: 'half' as const,
                interface: 'input',
                note: '0 to 2. Lower = more focused, higher = more creative. Empty = model default.',
                options: { min: 0, max: 2, step: 0.1, placeholder: 'Model default' },
              },
            },
            {
              field: 'gemini_top_p',
              name: 'Top P',
              type: 'float' as const,
              meta: {
                width: 'half' as const,
                interface: 'input',
                note: '0 to 1. Empty = model default.',
                options: { min: 0, max: 1, step: 0.05, placeholder: 'Model default' },
              },
            },
            {
              field: 'gemini_top_k',
              name: 'Top K',
              type: 'integer' as const,
              meta: {
                width: 'half' as const,
                interface: 'input',
                note: 'Empty = model default.',
                options: { min: 1, placeholder: 'Model default' },
              },
            },
          ]
        : []),
      {
        field: 'output_format',
        name: 'Output Format',
        type: 'string' as const,
        schema: { default_value: 'text' },
        meta: {
          width: 'full',
          interface: 'select-radio',
          options: {
            choices: [
              { text: 'Text', value: 'text' },
              { text: 'JSON (matches a schema)', value: 'json' },
            ],
          },
        },
      },
      ...(isJson
        ? [
            {
              field: 'json_schema',
              name: 'JSON Schema',
              type: 'json' as const,
              meta: {
                width: 'full' as const,
                interface: 'input-code',
                required: true,
                note: 'The output is guaranteed to match this schema. Read the result from <code>{{ $last.json }}</code>.',
                options: { language: 'json', placeholder: JSON_SCHEMA_PLACEHOLDER, template: JSON_SCHEMA_PLACEHOLDER },
              },
            },
          ]
        : []),
    ]
  },
})
