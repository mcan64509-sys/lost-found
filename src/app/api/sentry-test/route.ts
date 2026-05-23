import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const client = Sentry.getClient();

  const err = new Error("🧪 Sentry test hatası — bu kasıtlı oluşturuldu");
  Sentry.captureException(err);
  await Sentry.flush(3000);

  return NextResponse.json({
    dsn_set: !!dsn,
    dsn_preview: dsn ? dsn.slice(0, 20) + "..." : null,
    sentry_client_initialized: !!client,
    sent: true,
  }, { status: 500 });
}
