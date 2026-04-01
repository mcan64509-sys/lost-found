/**
 * Rate limiter with Upstash Redis support + in-memory fallback.
 *
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars to
 * enable Redis-backed rate limiting (works correctly on serverless/Vercel).
 * Without those vars the limiter falls back to in-memory, which resets on
 * each cold start and is only reliable in single-instance / dev environments.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

// ── In-memory fallback ──────────────────────────────────────────────────────
const memStore = new Map<string, { count: number; resetAt: number }>();

function memCheck(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
  }
  entry.count += 1;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return { allowed: entry.count <= MAX_REQUESTS, remaining, resetAt: entry.resetAt };
}

// ── Upstash Redis ───────────────────────────────────────────────────────────
async function redisCheck(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const now = Date.now();
  const windowKey = `rl:${key}:${Math.floor(now / WINDOW_MS)}`;
  const resetAt = (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", windowKey],
      ["PEXPIRE", windowKey, WINDOW_MS],
    ]),
  });

  const data = await res.json() as [{ result: number }, unknown];
  const count = data[0].result;
  const remaining = Math.max(0, MAX_REQUESTS - count);
  return { allowed: count <= MAX_REQUESTS, remaining, resetAt };
}

// ── Public API ──────────────────────────────────────────────────────────────
import { NextRequest } from "next/server";

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  try {
    return hasRedis ? await redisCheck(ip) : memCheck(ip);
  } catch {
    // Redis unavailable → fall back to in-memory
    return memCheck(ip);
  }
}
