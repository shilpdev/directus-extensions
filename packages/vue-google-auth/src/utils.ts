/*
 * Only same-site paths may be used as the page to open after login, so a crafted link cannot send
 * the user to another site.
 * Example: "/orders/1" -> "/orders/1", "//evil.com" -> "/", "https://evil.com" -> "/"
 */
export function toSafePath(value: unknown, fallback = '/'): string {
  const path = String(value ?? '')
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback
}
