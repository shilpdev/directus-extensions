/**
 * True for values that carry no data. Directus renders flow data that doesn't
 * exist, e.g. `{{ $last.year }}` when there is no year, as the text
 * "undefined" (and empty fields as "null" or ""), so those count as blank too.
 */
export function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value !== 'string') return false
  const text = value.trim()
  return text === '' || text === 'undefined' || text === 'null'
}
