import { NUMERIC_FIELD_TYPES } from '../constants'
import type { CollectionInfo } from '../types'

// Alias fields (o2m, m2m, presentation) have no column, so they can't be read or counted
export function getColumnField(collectionInfo: CollectionInfo, field: string) {
  const fieldInfo = collectionInfo.fields[field]

  if (!fieldInfo || fieldInfo.alias) return null

  return fieldInfo
}

/*
 * The allow list is checked against the live schema, which can change while Directus runs.
 * Returns what is wrong with the counter, or null when it can be incremented.
 * Example: "field "memes.title" is "string", not numeric"
 */
export function getCounterProblem(collectionInfo: CollectionInfo, collection: string, counter: string) {
  const counterField = getColumnField(collectionInfo, counter)

  if (!counterField) {
    return `field "${collection}.${counter}" doesn't exist`
  }

  if (!NUMERIC_FIELD_TYPES.includes(counterField.type)) {
    return `field "${collection}.${counter}" is "${counterField.type}", not numeric`
  }

  return null
}
