import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || "mcan64509@gmail.com").toLowerCase().trim();

export type AdminPermission =
  | "ban_users"
  | "delete_users"
  | "delete_items"
  | "moderate_items"
  | "view_users"
  | "manage_reports"
  | "manage_blacklist"
  | "send_announcements"
  | "manage_support"
  | "manage_stories"
  | "manage_requests";

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  ban_users: "Kullanıcı Banlama",
  delete_users: "Kullanıcı Silme",
  delete_items: "İlan Silme",
  moderate_items: "İlan Moderasyon",
  view_users: "Kullanıcı Listesi",
  manage_reports: "Şikayet Yönetimi",
  manage_blacklist: "Kara Liste",
  send_announcements: "Duyuru Gönderme",
  manage_support: "Destek Yönetimi",
  manage_stories: "Başarı Hikayeleri",
  manage_requests: "Kullanıcı İstekleri",
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as AdminPermission[];

export type AdminRow = {
  email: string;
  ban_users: boolean;
  delete_users: boolean;
  delete_items: boolean;
  moderate_items: boolean;
  view_users: boolean;
  manage_reports: boolean;
  manage_blacklist: boolean;
  send_announcements: boolean;
  manage_support: boolean;
  manage_stories: boolean;
  manage_requests: boolean;
  granted_by: string;
  created_at: string;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export function isSuperAdmin(email: string): boolean {
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}

export function getSuperAdminEmail(): string {
  return SUPER_ADMIN_EMAIL;
}

async function getCallerEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;
  return user.email.toLowerCase().trim();
}

// Herhangi bir admin yetkisi var mı? (süper admin veya tabloda kayıtlı)
export async function getAdminEmail(req: NextRequest): Promise<string | null> {
  const email = await getCallerEmail(req);
  if (!email) return null;
  if (isSuperAdmin(email)) return email;

  const { data } = await supabaseAdmin
    .from("admin_permissions")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  return data ? email : null;
}

// Belirli bir yetki var mı?
export async function verifyPermission(
  req: NextRequest,
  permission: AdminPermission
): Promise<string | null> {
  const email = await getCallerEmail(req);
  if (!email) return null;
  if (isSuperAdmin(email)) return email;

  const { data } = await supabaseAdmin
    .from("admin_permissions")
    .select(permission)
    .eq("email", email)
    .maybeSingle();

  if (!data || !data[permission]) return null;
  return email;
}

// Sadece süper admin
export async function verifySuperAdmin(req: NextRequest): Promise<string | null> {
  const email = await getCallerEmail(req);
  if (!email || !isSuperAdmin(email)) return null;
  return email;
}
