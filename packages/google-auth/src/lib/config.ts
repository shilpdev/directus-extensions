import type { AllowedRedirect, Config, EndpointContext } from "../types";
import { ENDPOINT_ID } from "../constants";
import { notConfiguredError } from "./errors";

// Example: "https://a.com, https://b.com" -> ["https://a.com", "https://b.com"]
const toList = (value: unknown): string[] =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

// "https://*.app.com" or "https://*.app.com:3000"
const WILDCARD = /^(https?):\/\/\*\.([a-z0-9.-]+)(?::(\d+))?\/?$/i;

/*
 * Parses one allow list entry. Returns null for a malformed one.
 * Examples:
 *   "https://app.com"     -> { origin: "https://app.com" }
 *   "https://*.app.com"   -> { protocol: "https:", hostSuffix: ".app.com", port: "" }
 */
function parseAllowed(entry: string): AllowedRedirect | null {
  const wildcard = entry.match(WILDCARD);
  if (wildcard) {
    const [, protocol, domain, port = ""] = wildcard;
    return { protocol: `${protocol!.toLowerCase()}:`, hostSuffix: `.${domain!.toLowerCase()}`, port };
  }

  try {
    return { origin: new URL(entry).origin };
  } catch {
    return null;
  }
}

/*
 * Reads the SHILP_GOOGLE_AUTH_* env variables. Returns null while the extension
 * is not configured, which keeps every route disabled.
 */
export function readConfig(env: Record<string, unknown>): Config | null {
  const clientId = String(env.SHILP_GOOGLE_AUTH_CLIENT_ID ?? "").trim();
  const clientSecret = String(env.SHILP_GOOGLE_AUTH_CLIENT_SECRET ?? "").trim();
  const publicUrl = String(env.PUBLIC_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  if (!clientId || !clientSecret || !publicUrl.startsWith("http")) return null;

  const callbackUrl = `${publicUrl}/${ENDPOINT_ID}/callback`;

  // One malformed entry should not disable login for the valid ones
  const allowedRedirects = toList(env.SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST)
    .map(parseAllowed)
    .filter((entry): entry is AllowedRedirect => entry !== null);

  return {
    clientId,
    clientSecret,
    callbackUrl,
    callbackPath: new URL(callbackUrl).pathname,
    secureCookies: callbackUrl.startsWith("https:"),
    allowedRedirects,
  };
}

export function requireConfig(context: EndpointContext): Config {
  const config = readConfig(context.env);
  if (!config) throw notConfiguredError();
  return config;
}

/*
 * Only the origin of the redirect is compared, so any page of an allowed
 * origin is accepted. A wildcard entry accepts any subdomain, at any depth,
 * with the same scheme and port, but not the bare domain itself.
 * Examples:
 *   "https://app.com"    allows "https://app.com/auth/google"
 *   "https://*.app.com"  allows "https://docs.app.com/login", not "https://app.com" or "http://docs.app.com"
 */
export function matchRedirect(config: Config, value: unknown): URL | null {
  if (typeof value !== "string" || !value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  // "https://app.com@evil.com" style URLs
  if (url.username || url.password) return null;

  const isAllowed = config.allowedRedirects.some((entry) =>
    "origin" in entry
      ? entry.origin === url.origin
      : url.protocol === entry.protocol
        && url.port === entry.port
        && url.hostname.endsWith(entry.hostSuffix),
  );

  return isAllowed ? url : null;
}
