// In-memory fixed-window rate limiter. Per serverless instance only — basic
// abuse protection without external storage.

const BUCKETS = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  // poda: sin esto el Map crece con cada IP distinta
  if (BUCKETS.size > 500) {
    for (const [k, v] of BUCKETS) if (now > v.reset) BUCKETS.delete(k);
  }
  const entry = BUCKETS.get(key);
  if (!entry || now > entry.reset) {
    BUCKETS.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// x-real-ip lo pone Vercel y el cliente no lo puede falsear; x-forwarded-for sí
// (el cliente agrega valores a la izquierda), así que va de segunda opción.
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

// Shared guard for mutation endpoints: 60 writes/min per IP.
export function checkMutationLimit(request: Request): boolean {
  return checkRateLimit("mut:" + clientIp(request), 60, 60_000);
}
