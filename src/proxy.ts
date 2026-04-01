import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./lib/ratelimit";

const RATE_LIMITED_PATHS = [
  "/api/report",
  "/api/favorites",
  "/api/items",
  "/api/claims",
  "/api/messages",
  "/api/embed",
];

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isRateLimited = RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p));
  if (!isRateLimited) return NextResponse.next();

  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return NextResponse.next();

  const ip = getIp(req);
  const { allowed, remaining, resetAt } = await checkRateLimit(ip);

  const headers = {
    "X-RateLimit-Limit": String(60),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return new NextResponse(
      JSON.stringify({ error: "Çok fazla istek gönderildi. Lütfen biraz bekleyin." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          ...headers,
        },
      }
    );
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
