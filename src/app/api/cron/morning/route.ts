import { NextRequest, NextResponse } from "next/server";

// Sabah cron'u: alerts/check + expiry-reminder
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization") || "";
  const secret = new URL(req.url).searchParams.get("secret");
  const authorized = bearer === `Bearer ${process.env.CRON_SECRET}` || secret === process.env.CRON_SECRET;
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://bulanvarmi.com";
  const s = process.env.CRON_SECRET;

  const [alertsResult, expiryResult] = await Promise.allSettled([
    fetch(`${base}/api/alerts/check`, { headers: { authorization: `Bearer ${s}` } })
      .then((r) => r.json()),
    fetch(`${base}/api/items/expiry-reminder`, { headers: { authorization: `Bearer ${s}` } })
      .then((r) => r.json()),
  ]);

  return NextResponse.json({
    alerts: alertsResult.status === "fulfilled" ? alertsResult.value : { error: "failed" },
    expiry: expiryResult.status === "fulfilled" ? expiryResult.value : { error: "failed" },
  });
}
