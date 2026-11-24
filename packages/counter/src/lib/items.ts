import { LOG_PREFIX } from '../constants'
import type { Database, Logger } from '../types'

type FindParams = {
  database: Database
  logger: Logger
  collection: string
  primary: string
  finderField: string
  finderValue: string
}

/*
 * Returns the primary keys of up to 2 items whose finder field has the value:
 * 2 is enough to tell that the field isn't unique and no single item can be picked.
 * A value the column can't hold (e.g. "abc" for a uuid or integer id in Postgres) makes
 * the query fail. No item can have such a value, so it is treated as no match.
 */
export async function findItemIds({ database, logger, collection, primary, finderField, finderValue }: FindParams) {
  try {
    const rows = await database(collection).select(primary).where(finderField, finderValue).limit(2)

    return rows.map((row) => row[primary])
  } catch (error) {
    logger.debug(error, `${LOG_PREFIX} lookup of ${collection}.${finderField} "${finderValue}" failed`)

    return []
  }
}

type IncrementParams = {
  database: Database
  collection: string
  primary: string
  id: string | number
  counter: string
}

/*
 * One atomic UPDATE ... SET views = COALESCE(views, 0) + 1, so concurrent hits are never lost
 * and an empty counter starts at 1. Returns the new count.
 */
export async function incrementCounter({ database, collection, primary, id, counter }: IncrementParams) {
  await database(collection)
    .where(primary, id)
    .update({ [counter]: database.raw('COALESCE(??, 0) + 1', [counter]) })

  const item = await database(collection).select(counter).where(primary, id).first()

  return Number(item[counter])
}
