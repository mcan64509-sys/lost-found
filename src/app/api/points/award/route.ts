import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POINT_VALUES: Record<string, number> = {
  create_item:     10,
  resolve_item:    50,
  sighting:         5,
  claim_approved:  20,
};

const BADGES: Record<string, { threshold: number; badge: string }[]> = {
  create_item:    [{ threshold: 1, badge: "🏅 İlk İlan" }, { threshold: 10, badge: "📋 Düzenli İlan" }],
  resolve_item:   [{ threshold: 1, badge: "✅ İlk Çözüm" }, { threshold: 5, badge: "🌟 Kahraman" }],
};

export async function POST(req: NextRequest) {
  // Sadece sunucu-taraflı iç çağrılar kabul edilir; kullanıcı doğrudan çağıramaz
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { userId, action } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const pts = POINT_VALUES[action];
  if (!pts) return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("points, badges")
    .eq("id", user.id)
    .maybeSingle();

  const currentPoints = (profile?.points ?? 0) + pts;
  const currentBadges: string[] = profile?.badges ?? [];

  // Check new badges
  const newBadges = [...currentBadges];
  const actionBadges = BADGES[action] ?? [];
  for (const b of actionBadges) {
    if (currentPoints >= b.threshold * POINT_VALUES[action] && !newBadges.includes(b.badge)) {
      newBadges.push(b.badge);
    }
  }

  await supabaseAdmin
    .from("profiles")
    .update({ points: currentPoints, badges: newBadges })
    .eq("id", user.id);

  return NextResponse.json({ success: true, points: currentPoints, badges: newBadges });
}
