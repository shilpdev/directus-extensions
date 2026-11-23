import type { ProviderMeta } from '../providers/meta'

/**
 * Allowed models for a provider, from its `*_MODELS` env variable.
 * Directus may already have split a comma separated value into an array,
 * so both forms are accepted. Order is kept; the first model is the default.
 */
export function getAllowedModels(env: Record<string, unknown>, meta: ProviderMeta): string[] {
  const raw = env[meta.modelsEnvKey]
  const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : []
  const models = items.map((item) => String(item).trim()).filter((item) => item !== '')
  return [...new Set(models)]
}

export function getToken(env: Record<string, unknown>, meta: ProviderMeta): string | undefined {
  const token = env[meta.tokenEnvKey]
  return typeof token === 'string' && token.trim() !== '' ? token.trim() : undefined
}
