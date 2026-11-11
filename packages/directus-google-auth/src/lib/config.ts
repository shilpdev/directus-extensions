import type { Config, EndpointContext } from "../types";
import { ENDPOINT_ID } from "../constants";
import { notConfiguredError } from "./errors";

// Example: "https://a.com, https://b.com" -> ["https://a.com", "https://b.com"]
const toList = (value: unknown): string[] =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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

  console.log(env);

  if (!clientId || !clientSecret || !publicUrl.startsWith("http")) return null;

  const callbackUrl = `${publicUrl}/${ENDPOINT_ID}/callback`;

  const allowedRedirects: URL[] = [];
  for (const entry of toList(env.SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST)) {
    try {
      allowedRedirects.push(new URL(entry));
    } catch {
      // One malformed entry should not disable login for the valid ones
    }
  }

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
 * origin is accepted.
 * Example: "https://app.com" allows "https://app.com/auth/google"
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

  const isAllowed = config.allowedRedirects.some(
    (entry) => entry.origin === url.origin,
  );

  return isAllowed ? url : null;
}
