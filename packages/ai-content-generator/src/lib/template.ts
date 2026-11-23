import { isBlank } from './blank'
import { ContentGeneratorError } from './errors'

// Prompt variables use single braces: {title}, {movie.year}.
// Double braces {{ }} are taken by Directus itself, which renders them with
// flow data ($trigger, $last, ...) before this operation runs.
// Only identifiers match, so JSON like {"a": 1} in a prompt is left alone.
const VARIABLE_PATTERN = /\{\s*([A-Za-z_][\w-]*(?:\.[\w-]+)*)\s*\}/g

function getPath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value === null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[key]
  }, source)
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Replaces {variable} placeholders. Throws when one is missing or blank
 * (empty, null, or flow data Directus couldn't find), so an incomplete
 * prompt is never sent.
 */
export function renderTemplate(template: string, variables: Record<string, unknown>): string {
  const missing = new Set<string>()

  const rendered = template.replace(VARIABLE_PATTERN, (_match, path: string) => {
    const value = getPath(variables, path)
    if (isBlank(value)) {
      missing.add(path)
      return ''
    }
    return stringify(value)
  })

  if (missing.size > 0) {
    throw new ContentGeneratorError(
      'MISSING_VARIABLES',
      `Prompt uses variables that are missing or empty: ${[...missing].join(', ')}. Check the Variables object and that the flow data they read exists.`,
    )
  }

  return rendered
}
