import { ALLOW_LIST_ENV, LOG_PREFIX } from '../constants'
import type { Logger } from '../types'

/*
 * Maps each allow listed collection to its counter field.
 * Example: "memes.views, origins.views" -> { memes: "views", origins: "views" }
 * The URL can't say which counter to increment, so a collection has only one.
 * Malformed and repeated entries are skipped with a warning.
 */
export function readAllowList(value: unknown, logger: Logger) {
  const counters = new Map<string, string>()

  const entries = String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  for (const entry of entries) {
    const dotIndex = entry.lastIndexOf('.')
    const collection = entry.slice(0, dotIndex)
    const counter = entry.slice(dotIndex + 1)

    if (!collection || !counter) {
      logger.warn(`${LOG_PREFIX} skipping "${entry}" in ${ALLOW_LIST_ENV}: expected "collection.field"`)
      continue
    }

    if (counters.has(collection)) {
      logger.warn(
        `${LOG_PREFIX} skipping "${entry}" in ${ALLOW_LIST_ENV}: "${collection}" already counts "${counters.get(collection)}"`,
      )
      continue
    }

    counters.set(collection, counter)
  }

  return counters
}
