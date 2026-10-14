/**
 * Valida el parámetro `next` del login para evitar open redirects
 * (`//evil.com`, `https://evil.com`, `/\evil.com`).
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
