/*
 * Only paths of this app are accepted as a place to return to, so a crafted `?redirect=` can't
 * send a visitor to another site.
 * Example: "/settings" -> "/settings", "https://evil.com" -> "/", "//evil.com" -> "/"
 */
export function toSafePath(path: unknown) {
  if (typeof path !== 'string') return '/'

  return path.startsWith('/') && !path.startsWith('//') ? path : '/'
}
