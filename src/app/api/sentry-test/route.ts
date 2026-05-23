import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  const err = new Error("🧪 Sentry test hatası — bu kasıtlı oluşturuldu");
  Sentry.captureException(err);
  throw err;
}
