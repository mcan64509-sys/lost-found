"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type AdminItem = {
  id: string;
  title: string;
  type: "lost" | "found";
  category: string | null;
  location: string | null;
  status: string | null;
  created_by_email: string | null;
  created_at: string;
  view_count: number | null;
  is_featured: boolean | null;
  is_urgent: boolean | null;
  reward_amount: number | null;
};

type Report = {
  id: string;
  item_id: string;
  reporter_email: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  item_title?: string;
};

type DayCount = { day: string; kayip: number; bulundu: number };

type Sighting = {
  id: string;
  item_id: string;
  reporter_email: string;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  created_at: string;
  item_title?: string;
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_banned: boolean;
  is_blacklisted: boolean;
  item_count: number;
  resolved_count: number;
};

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const REASON_LABELS: Record<string, string> = {
  spam: "Spam / Reklam",
  yaniltici: "Yanıltıcı",
  uygunsuz: "Uygunsuz İçerik",
  duplicate: "Mükerrer",
  diger: "Diğer",
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "items" | "reports" | "users" | "sightings" | "moderation">("stats");
  const [pendingItems, setPendingItems] = useState<AdminItem[]>([]);
  const [moderating, setModerating] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [togglingBan, setTogglingBan] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [blacklisting, setBlacklisting] = useState<string | null>(null);
  const [updatingReport, setUpdatingReport] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0, lost: 0, found: 0, resolved: 0, views: 0,
    pendingReports: 0,
  });
  const [sendingReminders, setSendingReminders] = useState(false);
  const [chartData, setChartData] = useState<DayCount[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.toLowerCase().trim() || "";
      if (!email || (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email))) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      setAdminEmail(email);
      loadData(session?.access_token);
    };
    init();
  }, []);

  async function loadData(token?: string) {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = token || session?.access_token || "";
    const [{ data: itemData }, { data: sightingData }, usersRes, reportsRes] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("sightings").select("*, items(title)").order("created_at", { ascending: false }).limit(200),
      fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
      fetch("/api/admin/reports", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
    ]);
    const reportData = reportsRes.reports ?? [];

    const all = (itemData || []) as AdminItem[];
    setItems(all);
    setStats({
      total: all.length,
      lost: all.filter((i) => i.type === "lost").length,
      found: all.filter((i) => i.type === "found").length,
      resolved: all.filter((i) => i.status === "resolved").length,
      views: all.reduce((acc, i) => acc + (i.view_count || 0), 0),
      pendingReports: (reportData as Report[]).filter((r) => r.status === "pending").length,
    });

    // Recharts için son 14 günlük günlük veri
    const days: DayCount[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
      const datePrefix = d.toISOString().slice(0, 10);
      days.push({
        day: dayStr,
        kayip: all.filter((item) => item.type === "lost" && item.created_at.startsWith(datePrefix)).length,
        bulundu: all.filter((item) => item.type === "found" && item.created_at.startsWith(datePrefix)).length,
      });
    }
    setChartData(days);

    setReports(reportData as Report[]);

    const sightingsWithTitle = (sightingData || []).map((s: Record<string, unknown>) => ({
      ...(s as Sighting),
      item_title: (s.items as { title?: string } | null)?.title || "—",
    }));
    setSightings(sightingsWithTitle);

    setAdminUsers(usersRes.users ?? []);

    // Load pending moderation items
    const { data: pendingData } = await supabase
      .from("items")
      .select("*")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false });
    setPendingItems((pendingData || []) as AdminItem[]);

    setLoading(false);
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Bu ilanı silmek istediğine emin misin?")) return;
    setDeleting(id);
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) { toast.error("Silinemedi."); }
    else { toast.success("İlan silindi."); setItems((prev) => prev.filter((i) => i.id !== id)); }
    setDeleting(null);
  }

  async function handleToggleFeatured(id: string, current: boolean | null) {
    const newVal = !current;
    const featuredUntil = newVal ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    const { error } = await supabase
      .from("items")
      .update({ is_featured: newVal, featured_until: featuredUntil })
      .eq("id", id);
    if (error) { toast.error("Güncellenemedi."); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_featured: newVal } : i));
    toast.success(newVal ? "⭐ İlan öne çıkarıldı (7 gün)." : "Öne çıkarma kaldırıldı.");
  }

  async function handleToggleUrgent(id: string, current: boolean | null) {
    const newVal = !current;
    const { error } = await supabase.from("items").update({ is_urgent: newVal }).eq("id", id);
    if (error) { toast.error("Güncellenemedi."); return; }
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_urgent: newVal } : i));
    toast.success(newVal ? "🔴 Acil işareti eklendi." : "Acil işareti kaldırıldı.");
  }

  async function handleToggleBan(targetEmail: string, currentBan: boolean) {
    setTogglingBan(targetEmail);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ targetEmail, ban: !currentBan }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => u.email === targetEmail ? { ...u, is_banned: !currentBan } : u)
        );
        toast.success(!currentBan ? "Kullanıcı engellendi." : "Engel kaldırıldı.");
      } else {
        toast.error(data.error || "İşlem başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setTogglingBan(null);
    }
  }

  async function handleDeleteUser(userId: string, userEmail: string) {
    if (!confirm(`"${userEmail}" hesabını kalıcı olarak silmek istediğine emin misin?\n\nBu işlem geri alınamaz.`)) return;
    setDeletingUser(userEmail);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ targetUserId: userId, targetEmail: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUsers((prev) => prev.filter((u) => u.email !== userEmail));
        toast.success("Kullanıcı silindi.");
      } else {
        toast.error(data.error || "Silinemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setDeletingUser(null);
    }
  }

  async function handleToggleBlacklist(targetEmail: string, currentBlacklist: boolean) {
    setBlacklisting(targetEmail);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ targetEmail, blacklist: !currentBlacklist }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => u.email === targetEmail ? { ...u, is_blacklisted: !currentBlacklist } : u)
        );
        toast.success(!currentBlacklist ? "E-posta kara listeye alındı." : "Kara listeden çıkarıldı.");
      } else {
        toast.error(data.error || "İşlem başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setBlacklisting(null);
    }
  }

  async function handleModerateItem(itemId: string, action: "approve" | "reject") {
    setModerating(itemId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/moderate-item", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ itemId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingItems((prev) => prev.filter((i) => i.id !== itemId));
        toast.success(action === "approve" ? "İlan onaylandı." : "İlan reddedildi ve silindi.");
      } else {
        toast.error(data.error || "İşlem başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setModerating(null);
    }
  }

  async function handleSendExpiryReminders() {
    setSendingReminders(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/items/expiry-reminder", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Hatırlatıcılar gönderildi: ${data.sent ?? 0} / ${data.total ?? 0} ilan`);
      } else {
        toast.error(data.error || "Gönderilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSendingReminders(false);
    }
  }

  async function handleReportAction(reportId: string, action: "reviewed" | "dismissed") {
    setUpdatingReport(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ reportId, status: action }),
      });
      if (res.ok) {
        toast.success(action === "reviewed" ? "Raporlandı olarak işaretlendi." : "Reddedildi.");
        setReports((prev) =>
          prev.map((r) => r.id === reportId ? { ...r, status: action } : r)
        );
        setStats((prev) => ({ ...prev, pendingReports: Math.max(0, prev.pendingReports - 1) }));
      } else {
        const d = await res.json();
        toast.error(d.error || "Güncellenemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
    setUpdatingReport(null);
  }

  if (authorized === null) return null;

  if (!authorized) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-20 text-white text-center">
          <h1 className="text-3xl font-bold">Yetkisiz Erişim</h1>
          <p className="mt-3 text-slate-400">Bu sayfaya erişim yetkiniz yok.</p>
          <Link href="/" className="mt-6 inline-block text-blue-400 hover:text-blue-300">← Ana Sayfa</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white animate-fade-in">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Paneli</h1>
              <p className="mt-1 text-slate-500">Site yönetimi · {adminEmail}</p>
            </div>
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800 transition">← Ana Sayfa</Link>
          </div>

          {/* Tab bar */}
          <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-1 backdrop-blur-sm">
            {([
              ["stats", "📊 İstatistikler", 0],
              ["items", "📋 İlanlar", items.length],
              ["reports", "⚑ Şikayetler", stats.pendingReports],
              ["users", "👥 Kullanıcılar", adminUsers.length],
              ["sightings", "👁 Gördüm", sightings.length],
              ["moderation", "🛡 Moderasyon", pendingItems.length],
            ] as const).map(([tab, label, count]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`relative flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${activeTab === tab ? "bg-slate-700 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}>
                {label}
                {count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    tab === "reports" && count > 0 ? "bg-red-500 text-white animate-pulse" :
                    "bg-slate-700 text-slate-300"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-slate-400">Yükleniyor...</div>
          ) : activeTab === "stats" ? (
            <div className="space-y-8">
              {/* Stat kartları */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 stagger">
                {[
                  { label: "Toplam İlan", value: stats.total, color: "text-white", border: "border-slate-800" },
                  { label: "Kayıp", value: stats.lost, color: "text-amber-300", border: "border-amber-500/20" },
                  { label: "Bulundu", value: stats.found, color: "text-emerald-300", border: "border-emerald-500/20" },
                  { label: "Çözüldü", value: stats.resolved, color: "text-green-300", border: "border-green-500/20" },
                  { label: "Görüntülenme", value: stats.views, color: "text-blue-300", border: "border-blue-500/20" },
                ].map((s) => (
                  <div key={s.label} className={`group rounded-2xl border ${s.border} bg-slate-900 p-5 hover:bg-slate-800/50 transition-all duration-200 animate-fade-in-up`}>
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p className={`mt-2 text-3xl font-black transition-transform duration-200 group-hover:scale-105 ${s.color}`}>{s.value.toLocaleString("tr-TR")}</p>
                  </div>
                ))}
              </div>

              {/* Grafik */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-6 text-lg font-bold">Son 14 Gün — Günlük İlan Sayısı</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, color: "#e2e8f0" }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Bar dataKey="kayip" name="Kayıp" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bulundu" name="Bulundu" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Admin Araçları */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-4 text-lg font-bold">Admin Araçları</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleSendExpiryReminders}
                    disabled={sendingReminders}
                    className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50"
                  >
                    {sendingReminders ? "Gönderiliyor..." : "⏰ Bitiş Hatırlatmalarını Gönder"}
                  </button>
                </div>
              </div>

              {/* Kategori dağılımı */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="mb-4 text-lg font-bold">Kategori Dağılımı</h2>
                <div className="space-y-2">
                  {Object.entries(
                    items.reduce((acc: Record<string, number>, item) => {
                      const cat = item.category || "Belirtilmemiş";
                      acc[cat] = (acc[cat] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="w-36 truncate text-sm text-slate-400">{cat}</span>
                        <div className="flex-1 rounded-full bg-slate-800 h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${Math.round((count / stats.total) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs text-slate-500">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : activeTab === "items" ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.type === "lost" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                        {item.type === "lost" ? "Kayıp" : "Bulundu"}
                      </span>
                      {item.status === "resolved" && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-300">Çözüldü</span>
                      )}
                      <Link href={`/items/${item.id}`} className="truncate text-sm font-medium text-white hover:text-blue-300">{item.title}</Link>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.created_by_email} · {item.category} · 👁 {item.view_count || 0} · {new Date(item.created_at).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        item.is_featured
                          ? "border-yellow-500/40 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                          : "border-slate-700 bg-slate-800 text-slate-400 hover:border-yellow-500/30 hover:text-yellow-400"
                      }`}
                      title={item.is_featured ? "Öne çıkarmayı kaldır" : "Öne çıkar"}
                    >
                      {item.is_featured ? "⭐ Featured" : "⭐"}
                    </button>
                    <button
                      onClick={() => handleToggleUrgent(item.id, item.is_urgent)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        item.is_urgent
                          ? "border-red-500/40 bg-red-500/20 text-red-400 hover:bg-red-500/10"
                          : "border-slate-700 bg-slate-800 text-slate-400 hover:border-red-500/30 hover:text-red-400"
                      }`}
                      title={item.is_urgent ? "Acili kaldır" : "Acil işaretle"}
                    >
                      🔴
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={deleting === item.id}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deleting === item.id ? "..." : "Sil"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "users" ? (
            <div className="space-y-2">
              {adminUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500">
                  Henüz kullanıcı yok.
                </div>
              ) : (
                adminUsers.map((u) => {
                  const initials = u.full_name
                    ? u.full_name.trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                    : u.email[0].toUpperCase();
                  return (
                    <div key={u.email} className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${u.is_banned ? "border-red-500/20 bg-red-500/5" : u.is_blacklisted ? "border-orange-500/20 bg-orange-500/5" : "border-slate-800 bg-slate-900"}`}>
                      <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white overflow-hidden">
                        {u.avatar_url ? (
                          <Image src={u.avatar_url} alt={u.full_name || u.email} width={36} height={36} className="h-9 w-9 rounded-full object-cover" unoptimized />
                        ) : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-white truncate">{u.full_name || "—"}</p>
                          {u.is_banned && (
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-300">Engelli</span>
                          )}
                          {u.is_blacklisted && (
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-300">Kara Liste</span>
                          )}
                          {ADMIN_EMAILS.includes(u.email.toLowerCase()) && (
                            <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-300">Admin</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                      <div className="shrink-0 text-center hidden sm:block">
                        <p className="text-sm font-bold text-white">{u.item_count}</p>
                        <p className="text-[10px] text-slate-500">İlan</p>
                      </div>
                      <div className="shrink-0 text-center hidden sm:block">
                        <p className="text-sm font-bold text-green-400">{u.resolved_count}</p>
                        <p className="text-[10px] text-slate-500">Çözüldü</p>
                      </div>
                      <div className="shrink-0 text-right hidden md:block">
                        <p className="text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString("tr-TR")}</p>
                      </div>
                      <Link
                        href={`/users/${encodeURIComponent(u.email)}`}
                        className="shrink-0 rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        Profil
                      </Link>
                      {u.email.toLowerCase() !== adminEmail && (
                        <>
                          <button
                            onClick={() => handleToggleBan(u.email, u.is_banned)}
                            disabled={togglingBan === u.email}
                            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                              u.is_banned
                                ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                                : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            }`}
                          >
                            {togglingBan === u.email ? "..." : u.is_banned ? "Engeli Kaldır" : "Engelle"}
                          </button>
                          <button
                            onClick={() => handleToggleBlacklist(u.email, u.is_blacklisted)}
                            disabled={blacklisting === u.email}
                            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                              u.is_blacklisted
                                ? "border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700"
                                : "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                            }`}
                          >
                            {blacklisting === u.email ? "..." : u.is_blacklisted ? "Kara Listeden Çıkar" : "Kara Liste"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deletingUser === u.email}
                            className="shrink-0 rounded-xl border border-red-600/40 bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/20 transition disabled:opacity-50"
                          >
                            {deletingUser === u.email ? "..." : "Hesabı Sil"}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === "sightings" ? (
            /* Sightings tab */
            <div className="space-y-3">
              {/* Özet */}
              <div className="grid gap-4 sm:grid-cols-3 mb-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">Toplam Bildirim</p>
                  <p className="mt-1 text-2xl font-black text-amber-400">{sightings.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">Farklı İlan</p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {new Set(sightings.map((s) => s.item_id)).size}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-xs text-slate-500">Farklı Bildiren</p>
                  <p className="mt-1 text-2xl font-black text-blue-400">
                    {new Set(sightings.map((s) => s.reporter_email)).size}
                  </p>
                </div>
              </div>

              {sightings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500">
                  Henüz "Gördüm" bildirimi yok.
                </div>
              ) : (
                sightings.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            👁 Gördüm
                          </span>
                          <Link
                            href={`/items/${s.item_id}`}
                            className="text-sm font-semibold text-white hover:text-amber-300 truncate max-w-xs"
                          >
                            {s.item_title}
                          </Link>
                        </div>
                        <p className="text-xs text-slate-500">
                          <span className="text-slate-400">{s.reporter_email}</span>
                          {" · "}
                          {new Date(s.created_at).toLocaleString("tr-TR")}
                        </p>
                        {s.location_text && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                            <span className="text-amber-400">📍</span>
                            {s.location_text}
                          </p>
                        )}
                        {s.lat != null && s.lng != null && (
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=16/${s.lat}/${s.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            🗺 {s.lat.toFixed(5)}, {s.lng.toFixed(5)} — Haritada Gör ↗
                          </a>
                        )}
                        {s.note && (
                          <p className="mt-1.5 text-xs text-slate-400 italic border-l-2 border-slate-700 pl-2">
                            "{s.note}"
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/items/${s.item_id}`}
                        className="shrink-0 rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
                      >
                        İlana Git →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "moderation" ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
                <p className="font-semibold text-white mb-1">🛡 Moderasyon Kuyruğu</p>
                <p>İlanları <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">moderation_status = pending</code> yaparak buraya yönlendirebilirsin. Admin onaylayabilir veya reddedebilir.</p>
              </div>
              {pendingItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500">
                  Onay bekleyen ilan yok.
                </div>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.type === "lost" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                          {item.type === "lost" ? "Kayıp" : "Bulundu"}
                        </span>
                        <Link href={`/items/${item.id}`} className="truncate text-sm font-medium text-white hover:text-blue-300">{item.title}</Link>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.created_by_email} · {item.category} · {new Date(item.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleModerateItem(item.id, "approve")}
                        disabled={moderating === item.id}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {moderating === item.id ? "..." : "Onayla"}
                      </button>
                      <button
                        onClick={() => handleModerateItem(item.id, "reject")}
                        disabled={moderating === item.id}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {moderating === item.id ? "..." : "Reddet & Sil"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Reports tab */
            <div className="space-y-3 animate-fade-in-up">
              {reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-slate-500">
                  Henüz şikayet yok.
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className={`rounded-2xl border p-4 ${report.status === "pending" ? "border-red-500/20 bg-red-500/5" : "border-slate-800 bg-slate-900 opacity-60"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            report.status === "pending" ? "bg-red-500/20 text-red-300" :
                            report.status === "reviewed" ? "bg-green-500/20 text-green-300" :
                            "bg-slate-700 text-slate-400"
                          }`}>
                            {report.status === "pending" ? "Bekliyor" : report.status === "reviewed" ? "İncelendi" : "Reddedildi"}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{REASON_LABELS[report.reason] || report.reason}</span>
                        </div>
                        <Link href={`/items/${report.item_id}`} className="text-sm font-semibold text-white hover:text-blue-300">
                          {report.item_title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {report.reporter_email} · {new Date(report.created_at).toLocaleDateString("tr-TR")}
                        </p>
                        {report.details && (
                          <p className="mt-2 text-xs text-slate-400 italic">"{report.details}"</p>
                        )}
                      </div>

                      {report.status === "pending" && (
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleReportAction(report.id, "reviewed")}
                            disabled={updatingReport === report.id}
                            className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                          >
                            İncelendi
                          </button>
                          <button
                            onClick={() => handleReportAction(report.id, "dismissed")}
                            disabled={updatingReport === report.id}
                            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
