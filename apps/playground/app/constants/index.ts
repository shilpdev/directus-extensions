// Refresh the access token this long before it expires
export const REFRESH_MARGIN_MS = 60 * 1000

// Wait this long before retrying a refresh that failed because Directus was unreachable
export const REFRESH_RETRY_MS = 10 * 1000
