const ALLOWED = new Set([
  "http://localhost:8080",
  "https://vettale.shop",
  "https://admin.vettale.com",
]);

export function corsHeaders(origin: string | null) {
  const allow = ALLOWED.has(origin ?? "") ? (origin as string) : "http://localhost:8080";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}







