import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    throw new Error("🧪 Sentry test hatası — bu kasıtlı oluşturuldu");
  } catch (err) {
    Sentry.captureException(err);
    await Sentry.flush(3000);
    return NextResponse.json({ error: "test error captured", sent: true }, { status: 500 });
  }
}
