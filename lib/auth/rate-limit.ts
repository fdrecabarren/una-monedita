// In-memory fixed-window rate limiter. Per serverless instance only — basic
// abuse protection without external storage, enough for a single-user app.

const BUCKETS = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = BUCKETS.get(key);
  if (!entry || now > entry.reset) {
    BUCKETS.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

// Shared guard for mutation endpoints: 60 writes/min per IP.
export function checkMutationLimit(request: Request): boolean {
  return checkRateLimit("mut:" + clientIp(request), 60, 60_000);
}
