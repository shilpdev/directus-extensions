import type { Router } from 'express'
import { CounterError, invalidConfigError, sendError } from '../lib/errors'
import { findItemIds, incrementCounter } from '../lib/items'
import { getColumnField, getCounterProblem } from '../lib/schema'
import type { EndpointContext } from '../types'

/*
 * POST /shilp/counter/:collection/:finderField/:finderValue
 * Example: POST /shilp/counter/memes/slug/funny-cat -> memes.views of that meme + 1
 * Public, so counters work on public websites. It needs no collection permissions either,
 * so the counter can stay read-only for every role. Only allow listed counters can change.
 */
export function registerIncrementRoute(router: Router, { database, getSchema, logger, counters }: EndpointContext) {
  router.post('/:collection/:finderField/:finderValue', async (req, res) => {
    try {
      const { collection, finderField, finderValue } = req.params

      if (counters.size === 0) {
        throw new CounterError(503, 'NOT_CONFIGURED', 'No counters are configured')
      }

      const counter = counters.get(collection)

      if (!counter) {
        throw new CounterError(404, 'COLLECTION_NOT_FOUND', `Collection "${collection}" is not in the counter allow list`)
      }

      const schema = await getSchema()
      const collectionInfo = schema.collections[collection]

      if (!collectionInfo) {
        throw invalidConfigError(`collection "${collection}" doesn't exist`, logger)
      }

      const counterProblem = getCounterProblem(collectionInfo, collection, counter)

      if (counterProblem) {
        throw invalidConfigError(counterProblem, logger)
      }

      if (!getColumnField(collectionInfo, finderField)) {
        throw new CounterError(404, 'FIELD_NOT_FOUND', `Field "${finderField}" doesn't exist in collection "${collection}"`)
      }

      const primary = collectionInfo.primary
      const ids = await findItemIds({ database, logger, collection, primary, finderField, finderValue })

      if (ids.length === 0) {
        throw new CounterError(404, 'ITEM_NOT_FOUND', `No item in "${collection}" has ${finderField} "${finderValue}"`)
      }

      if (ids.length > 1) {
        throw new CounterError(
          409,
          'MULTIPLE_ITEMS_FOUND',
          `More than one item in "${collection}" has ${finderField} "${finderValue}"`,
        )
      }

      const id = ids[0]
      const count = await incrementCounter({ database, collection, primary, id, counter })

      return res.json({ data: { [primary]: id, [counter]: count } })
    } catch (error) {
      return sendError(res, error, logger)
    }
  })
}
