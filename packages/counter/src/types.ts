import type { EndpointExtensionContext, SchemaOverview } from '@directus/types'

export type Database = EndpointExtensionContext['database']

export type Logger = EndpointExtensionContext['logger']

export type CollectionInfo = SchemaOverview['collections'][string]

export type EndpointContext = EndpointExtensionContext & {
  // Allow listed collection -> its counter field
  counters: Map<string, string>
}
