import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySuperAdmin, ALL_PERMISSIONS, AdminPermission, getSuperAdminEmail } from "../../../../lib/adminAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — tüm admin listesi ve yetkileri
export async function GET(req: NextRequest) {
  const superAdmin = await verifySuperAdmin(req);
  if (!superAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("admin_permissions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ admins: data ?? [], superAdminEmail: getSuperAdminEmail() });
}

// POST — yeni admin ekle
export async function POST(req: NextRequest) {
  const superAdmin = await verifySuperAdmin(req);
  if (!superAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { email } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email gerekli" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === getSuperAdminEmail()) {
    return NextResponse.json({ error: "Süper admin zaten en yüksek yetkiye sahip" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("admin_permissions")
    .insert({ email: normalizedEmail, granted_by: superAdmin });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Bu email zaten admin listesinde" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH — yetkileri güncelle
export async function PATCH(req: NextRequest) {
  const superAdmin = await verifySuperAdmin(req);
  if (!superAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { email, permissions } = await req.json();
  if (!email || !permissions || typeof permissions !== "object") {
    return NextResponse.json({ error: "email ve permissions gerekli" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === getSuperAdminEmail()) {
    return NextResponse.json({ error: "Süper adminin yetkileri değiştirilemez" }, { status: 400 });
  }

  // Sadece geçerli permission alanlarını al
  const updates: Partial<Record<AdminPermission, boolean>> = {};
  for (const perm of ALL_PERMISSIONS) {
    if (perm in permissions) {
      updates[perm] = !!permissions[perm];
    }
  }

  const { error } = await supabaseAdmin
    .from("admin_permissions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("email", normalizedEmail);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE — admin kaldır
export async function DELETE(req: NextRequest) {
  const superAdmin = await verifySuperAdmin(req);
  if (!superAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email gerekli" }, { status: 400 });

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === getSuperAdminEmail()) {
    return NextResponse.json({ error: "Süper admin kaldırılamaz" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("admin_permissions")
    .delete()
    .eq("email", normalizedEmail);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
