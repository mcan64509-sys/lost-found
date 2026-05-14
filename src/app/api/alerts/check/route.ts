import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAlertMatchEmail } from "../../../../lib/email";

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Bu endpoint pg_cron veya harici cron tarafından her saat çağrılır
// GET /api/alerts/check?secret=xxx
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Son 1 saatte eklenen ilanları al
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: newItems } = await supabase
    .from("items")
    .select("id, title, type, category, location, description, created_at, lat, lng")
    .gte("created_at", oneHourAgo);

  if (!newItems || newItems.length === 0) {
    return NextResponse.json({ checked: 0, notified: 0 });
  }

  // Aktif alertleri al
  const { data: alerts } = await supabase
    .from("search_alerts")
    .select("*")
    .eq("is_active", true);

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ checked: newItems.length, notified: 0 });
  }

  let notifiedCount = 0;

  for (const alert of alerts) {
    const matched = newItems.filter((item) => {
      // Tip filtresi
      if (alert.item_type && alert.item_type !== "all") {
        const typeMap: Record<string, string> = { lost: "lost", found: "found" };
        if (item.type !== typeMap[alert.item_type]) return false;
      }
      // Kategori filtresi
      if (alert.category && alert.category !== "" && item.category !== alert.category) return false;
      // Keyword filtresi
      if (alert.keyword && alert.keyword.trim() !== "") {
        const kw = alert.keyword.toLowerCase();
        const inTitle = item.title?.toLowerCase().includes(kw);
        const inDesc = item.description?.toLowerCase().includes(kw);
        const inLoc = item.location?.toLowerCase().includes(kw);
        if (!inTitle && !inDesc && !inLoc) return false;
      }
      // Coğrafi mesafe filtresi — sadece hem alert hem item koordinatları varsa
      if (alert.lat != null && alert.lng != null && item.lat != null && item.lng != null) {
        const radiusKm = alert.radius_km || 50;
        const distKm = haversineDistanceKm(alert.lat, alert.lng, item.lat, item.lng);
        if (distKm > radiusKm) return false;
      }
      return true;
    });

    if (matched.length > 0) {
      try {
        await sendAlertMatchEmail({
          userEmail: alert.user_email,
          keyword: alert.keyword || alert.category || "Kayıp & Buluntu",
          matchedItems: matched,
        });

        await supabase
          .from("search_alerts")
          .update({ last_notified_at: new Date().toISOString() })
          .eq("id", alert.id);

        notifiedCount++;
      } catch {
        // email hatası sessizce geç
      }
    }
  }

  return NextResponse.json({ checked: newItems.length, notified: notifiedCount });
}
