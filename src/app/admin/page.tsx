"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "../../components/AppHeader";
import PushNotificationButton from "../../components/PushNotificationButton";
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
  moderation_status: string | null;
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
  item_owner_email?: string | null;
  reported_user_email?: string | null;
};

type DayCount = { day: string; kayip: number; bulundu: number };

type UserRequest = {
  id: string;
  user_email: string;
  type: string;
  title: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
};

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

type Story = {
  id: string;
  user_email: string;
  item_title: string;
  story: string;
  approved: boolean;
  created_at: string;
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

type TabId = "stats" | "items" | "reports" | "users" | "sightings" | "moderation" | "requests" | "stories" | "announce" | "support";

type SupportSession = {
  id: string;
  user_email: string;
  user_name: string | null;
  status: "waiting" | "active" | "closed";
  created_at: string;
  updated_at: string;
};

type SupportMessage = {
  id: string;
  session_id: string;
  sender_type: "user" | "admin";
  sender_email: string;
  content: string;
  created_at: string;
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("stats");
  const [pendingStories, setPendingStories] = useState<Story[]>([]);
  const [approvingStory, setApprovingStory] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState<AdminItem[]>([]);
  const [moderating, setModerating] = useState<string | null>(null);
  const [bulkModerating, setBulkModerating] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminEmail, setAdminEmail] = useState("");
  const [togglingBan, setTogglingBan] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; ownerEmail: string } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [blacklisting, setBlacklisting] = useState<string | null>(null);
  const [updatingReport, setUpdatingReport] = useState<string | null>(null);
  const [evaluatingReport, setEvaluatingReport] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [stats, setStats] = useState({
    total: 0, lost: 0, found: 0, resolved: 0, views: 0,
    pendingReports: 0,
  });
  const [sendingReminders, setSendingReminders] = useState(false);
  const [sendingDailyReport, setSendingDailyReport] = useState(false);
  const [chartData, setChartData] = useState<DayCount[]>([]);
  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);
  const [updatingRequest, setUpdatingRequest] = useState<string | null>(null);
  const [requestResponse, setRequestResponse] = useState<Record<string, string>>({});
  const [announceSubject, setAnnounceSubject] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [announceTargets, setAnnounceTargets] = useState<"all" | "custom">("all");
  const [announceCustomEmails, setAnnounceCustomEmails] = useState("");
  const [announceSendEmail, setAnnounceSendEmail] = useState(true);
  const [announceSendNotif, setAnnounceSendNotif] = useState(true);
  const [announcing, setAnnouncing] = useState(false);

  // Canlı Destek
  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SupportSession | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const supportBottomRef = useRef<HTMLDivElement>(null);
  const [joinModal, setJoinModal] = useState<SupportSession | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinRole, setJoinRole] = useState<"Müşteri Temsilcisi" | "Admin">("Müşteri Temsilcisi");
  const [adminDisplayName, setAdminDisplayName] = useState("");

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

      // URL param: ?tab=support
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "support") {
        setActiveTab("support");
        loadSupportSessions(session?.access_token || "");
        const sessionParam = urlParams.get("session");
        if (sessionParam) {
          setTimeout(() => openSupportSession({ id: sessionParam } as SupportSession, session?.access_token || ""), 500);
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem("admin_support_name") || "";
    const savedRole = (localStorage.getItem("admin_support_role") as "Müşteri Temsilcisi" | "Admin") || "Müşteri Temsilcisi";
    if (savedName) {
      setJoinName(savedName);
      setJoinRole(savedRole);
      setAdminDisplayName(`${savedRole} - ${savedName}`);
    }
  }, []);

  async function loadData(token?: string) {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = token || session?.access_token || "";
    const [{ data: itemData }, { data: sightingData }, usersRes, reportsRes, requestsRes] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("sightings").select("*, items(title)").order("created_at", { ascending: false }).limit(200),
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()),
      fetch("/api/admin/reports", { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()),
      fetch("/api/admin/requests", { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()),
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
    setUserRequests(requestsRes.requests ?? []);
    const { data: pendingData } = await supabase
      .from("items")
      .select("*")
      .in("moderation_status", ["pending", "flagged"])
      .order("created_at", { ascending: false });
    setPendingItems((pendingData || []) as AdminItem[]);
    const { data: { session: s2 } } = await supabase.auth.getSession();
    const storyRes = await fetch("/api/admin/stories", {
      headers: { Authorization: `Bearer ${s2?.access_token || ""}` },
    });
    if (storyRes.ok) {
      const storyJson = await storyRes.json();
      setPendingStories((storyJson.stories || []) as Story[]);
    }
    setLoading(false);
  }

  async function loadSupportSessions(token: string) {
    setSupportLoading(true);
    try {
      const res = await fetch("/api/support/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSupportSessions(data.sessions ?? []);
    } catch {
    } finally {
      setSupportLoading(false);
    }
  }

  async function openSupportSession(session: SupportSession, token?: string, skipModal = false) {
    if (!skipModal && session.status === "waiting") {
      setJoinModal(session);
      return;
    }
    const { data: { session: s } } = await supabase.auth.getSession();
    const t = token || s?.access_token || "";
    setSelectedSession(session);
    const res = await fetch(`/api/support/messages?sessionId=${session.id}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const data = await res.json();
    setSupportMessages(data.messages ?? []);
    setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    // Realtime subscription
    const ch = supabase
      .channel(`admin-support-${session.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `session_id=eq.${session.id}`,
      }, (payload) => {
        setSupportMessages((prev) => {
          const msg = payload.new as SupportMessage;
          if (prev.some((m) => m.id === msg.id)) return prev;
          const withoutTemp = prev.filter(
            (m) => !(m.id.startsWith("tmp-") && m.sender_type === msg.sender_type && m.content === msg.content)
          );
          return [...withoutTemp, msg];
        });
        setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "support_sessions",
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        const updated = payload.new as SupportSession;
        setSelectedSession(updated);
        setSupportSessions((prev) => prev.map((s) => s.id === updated.id ? updated : s));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }

  async function confirmJoin() {
    if (!joinModal || !joinName.trim()) return;
    const displayName = `${joinRole} - ${joinName.trim()}`;
    setAdminDisplayName(displayName);
    localStorage.setItem("admin_support_name", joinName.trim());
    localStorage.setItem("admin_support_role", joinRole);
    await supabase.from("support_sessions").update({ admin_name: displayName }).eq("id", joinModal.id);
    const session = { ...joinModal };
    setJoinModal(null);
    await openSupportSession(session, undefined, true);
  }

  async function sendSupportReply() {
    if (!supportInput.trim() || !selectedSession || !adminEmail) return;
    const text = supportInput.trim();
    setSupportInput("");

    // Optimistic: hemen göster
    const tempId = `tmp-${Date.now()}`;
    setSupportMessages((prev) => [...prev, {
      id: tempId,
      session_id: selectedSession.id,
      sender_type: "admin" as const,
      sender_email: adminEmail,
      content: text,
      created_at: new Date().toISOString(),
    }]);
    setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 20);

    try {
      const { error } = await supabase.from("support_messages").insert({
        session_id: selectedSession.id,
        sender_type: "admin",
        sender_email: adminEmail,
        content: text,
      });
      if (error) {
        setSupportMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
      if (selectedSession.status === "waiting") {
        await supabase.from("support_sessions").update({
          status: "active",
          admin_email: adminEmail,
          admin_name: adminDisplayName || adminEmail,
        }).eq("id", selectedSession.id);
        setSupportSessions((prev) =>
          prev.map((s) => s.id === selectedSession.id ? { ...s, status: "active" } : s)
        );
        setSelectedSession((prev) => prev ? { ...prev, status: "active" } : prev);
      }
    } catch {
      setSupportMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  async function closeSupportSession(sessionId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    setClosingSession(true);
    await fetch("/api/support/close", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    setSupportSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
      setSupportMessages([]);
    }
    setClosingSession(false);
    toast.success("Oturum sonlandırıldı.");
  }

  function handleDeleteItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setDeleteTarget({ id, title: item.title, ownerEmail: item.created_by_email || "" });
    setDeleteReason("");
  }

  async function confirmDeleteItem() {
    if (!deleteTarget || !deleteReason.trim()) return;
    setDeleting(deleteTarget.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-item", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ itemId: deleteTarget.id, reason: deleteReason.trim() }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        toast.success("İlan silindi, kullanıcıya bildirim gönderildi.");
        setDeleteTarget(null);
      } else {
        const d = await res.json();
        toast.error(d.error || "Silinemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleFeatured(id: string, current: boolean | null) {
    const newVal = !current;
    const featuredUntil = newVal ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    const { error } = await supabase.from("items").update({ is_featured: newVal, featured_until: featuredUntil }).eq("id", id);
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ targetEmail, ban: !currentBan }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUsers((prev) => prev.map((u) => u.email === targetEmail ? { ...u, is_banned: !currentBan } : u));
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ targetEmail, blacklist: !currentBlacklist }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminUsers((prev) => prev.map((u) => u.email === targetEmail ? { ...u, is_blacklisted: !currentBlacklist } : u));
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

  async function handleBulkApprove() {
    const pendingOnly = pendingItems.filter((i) => i.moderation_status === "pending");
    if (pendingOnly.length === 0) { toast.error("Onaylanacak pending ilan yok."); return; }
    if (!confirm(`${pendingOnly.length} pending ilanı toplu onayla?`)) return;
    setBulkModerating(true);
    const { data: { session } } = await supabase.auth.getSession();
    const results = await Promise.allSettled(
      pendingOnly.map((item) =>
        fetch("/api/admin/moderate-item", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
          body: JSON.stringify({ itemId: item.id, action: "approve" }),
        })
      )
    );
    const approved = results.filter((r) => r.status === "fulfilled").length;
    setPendingItems((prev) => prev.filter((i) => i.moderation_status !== "pending"));
    toast.success(`${approved} ilan onaylandı.`);
    setBulkModerating(false);
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

  async function handleRequestAction(requestId: string, status: "in_progress" | "resolved" | "dismissed") {
    setUpdatingRequest(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ requestId, status, adminResponse: requestResponse[requestId] || "" }),
      });
      if (res.ok) {
        setUserRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status, admin_response: requestResponse[requestId] || null } : r));
        toast.success(status === "resolved" ? "Çözüldü olarak işaretlendi." : status === "in_progress" ? "İşleme alındı." : "Reddedildi.");
      } else {
        const d = await res.json();
        toast.error(d.error || "Güncellenemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    }
    setUpdatingRequest(null);
  }

  async function handleSendDailyReport() {
    setSendingDailyReport(true);
    try {
      // refreshSession garantili taze token sağlar
      const { data: refreshData } = await supabase.auth.refreshSession();
      const token = refreshData.session?.access_token;
      if (!token) {
        toast.error("Oturum bulunamadı, lütfen yeniden giriş yapın.");
        return;
      }
      const res = await fetch("/api/cron/error-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Gönderilemedi.");
      else if (data.emailError) toast.error(`Email hatası: ${data.emailError}`);
      else toast.success(`Günlük rapor gönderildi → ${data.sentTo}`);
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSendingDailyReport(false);
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
      if (res.ok) toast.success(`Hatırlatıcılar gönderildi: ${data.sent ?? 0} / ${data.total ?? 0} ilan`);
      else toast.error(data.error || "Gönderilemedi.");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSendingReminders(false);
    }
  }

  async function handleReportAction(reportId: string, action: "remove_item" | "warn_user" | "dismiss", message?: string) {
    setUpdatingReport(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ reportId, action, adminMessage: message || "" }),
      });
      if (res.ok) {
        toast.success(
          action === "remove_item" ? "İlan kaldırıldı, kullanıcıya bildirim gönderildi." :
          action === "warn_user" ? "Uyarı mesajı kullanıcıya gönderildi." : "Şikayet reddedildi."
        );
        const newStatus = action === "dismiss" ? "dismissed" : "reviewed";
        setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: newStatus } : r));
        setStats((prev) => ({ ...prev, pendingReports: Math.max(0, prev.pendingReports - 1) }));
        setEvaluatingReport(null);
        setReportMessage("");
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
        <main className="flex min-h-[80vh] flex-col items-center justify-center bg-[#080d1a] text-center px-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Yetkisiz Erişim</h1>
          <p className="mt-2 text-slate-400">Bu sayfaya erişim yetkiniz bulunmuyor.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition">
            ← Ana Sayfaya Dön
          </Link>
        </main>
      </>
    );
  }

  const navTabs: { id: TabId; label: string; icon: string; count: number; alert?: boolean }[] = [
    { id: "stats", label: "Genel Bakış", icon: "📊", count: 0 },
    { id: "items", label: "İlanlar", icon: "📋", count: items.length },
    { id: "reports", label: "Şikayetler", icon: "🚨", count: stats.pendingReports, alert: stats.pendingReports > 0 },
    { id: "users", label: "Kullanıcılar", icon: "👥", count: adminUsers.length },
    { id: "sightings", label: "Gördüm", icon: "👁", count: sightings.length },
    { id: "moderation", label: "Moderasyon", icon: "🛡", count: pendingItems.length, alert: pendingItems.length > 0 },
    { id: "requests", label: "İstekler", icon: "💬", count: userRequests.filter((r) => r.status === "pending").length },
    { id: "stories", label: "Hikayeler", icon: "✨", count: pendingStories.length },
    { id: "announce", label: "Duyuru", icon: "📢", count: 0 },
    { id: "support", label: "Canlı Destek", icon: "🎧", count: supportSessions.filter((s) => s.status === "waiting").length, alert: supportSessions.some((s) => s.status === "waiting") },
  ];

  return (
    <>
      <AppHeader />

      {/* Admin identity strip */}
      <div className="sticky top-0 z-30 border-b border-[#1a2744] bg-[#07101f]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-black shadow-lg shadow-blue-900/30">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Yönetim Merkezi</span>
                <span className="rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-blue-400">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{adminEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats.pendingReports > 0 && (
              <button
                onClick={() => setActiveTab("reports")}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {stats.pendingReports} şikayet
              </button>
            )}
            {pendingItems.length > 0 && (
              <button
                onClick={() => setActiveTab("moderation")}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {pendingItems.length} moderasyon
              </button>
            )}
            <PushNotificationButton />
            <Link href="/admin/profiles" className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition">
              👤 Profiller
            </Link>
            <Link href="/" className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition">
              ← Siteye Dön
            </Link>
          </div>
        </div>
      </div>

      <main className="min-h-screen bg-[#080d1a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">

          {/* Tab navigation */}
          <div className="mb-6 flex gap-0.5 overflow-x-auto rounded-2xl border border-[#1a2744] bg-[#07101f] p-1">
            {navTabs.map(({ id, label, icon, count, alert }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={async () => {
                    setActiveTab(id);
                    if (id === "support" && supportSessions.length === 0) {
                      const { data: { session } } = await supabase.auth.getSession();
                      loadSupportSessions(session?.access_token || "");
                    }
                  }}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                      : "text-slate-500 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <span className="text-sm">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                  {count > 0 && (
                    <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                      alert ? "bg-red-500 text-white" :
                      isActive ? "bg-white/20 text-white" :
                      "bg-slate-700 text-slate-300"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Loading skeleton */}
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-800/40" />
                ))}
              </div>
              <div className="h-64 rounded-2xl bg-slate-800/40" />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-48 rounded-2xl bg-slate-800/40" />
                <div className="h-48 rounded-2xl bg-slate-800/40" />
              </div>
            </div>

          ) : activeTab === "stats" ? (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { icon: "📋", label: "Toplam İlan", value: stats.total, cls: "border-[#1a2744] bg-[#0d1a2e]", txt: "text-white" },
                  { icon: "🔍", label: "Kayıp", value: stats.lost, cls: "border-amber-500/20 bg-amber-500/5", txt: "text-amber-300" },
                  { icon: "✅", label: "Bulundu", value: stats.found, cls: "border-emerald-500/20 bg-emerald-500/5", txt: "text-emerald-300" },
                  { icon: "🎉", label: "Çözüldü", value: stats.resolved, cls: "border-green-500/20 bg-green-500/5", txt: "text-green-300" },
                  { icon: "👁", label: "Görüntülenme", value: stats.views, cls: "border-purple-500/20 bg-purple-500/5", txt: "text-purple-300" },
                  {
                    icon: stats.pendingReports > 0 ? "⚠️" : "✅",
                    label: "Bekleyen Şikayet",
                    value: stats.pendingReports,
                    cls: stats.pendingReports > 0 ? "border-red-500/30 bg-red-500/10" : "border-[#1a2744] bg-[#0d1a2e]",
                    txt: stats.pendingReports > 0 ? "text-red-300" : "text-slate-400",
                  },
                ].map(({ icon, label, value, cls, txt }) => (
                  <div key={label} className={`rounded-2xl border p-4 ${cls}`}>
                    <div className="mb-3 text-xl">{icon}</div>
                    <p className={`text-2xl font-black ${txt}`}>{value.toLocaleString("tr-TR")}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-white">İlan Aktivitesi</h2>
                    <p className="text-xs text-slate-500">Son 14 gün — günlük yeni ilan sayısı</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />Kayıp
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Bulundu
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#07101f", border: "1px solid #1a2744", borderRadius: 12, color: "#e2e8f0", fontSize: 13 }}
                      labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
                      cursor={{ fill: "rgba(59,130,246,0.05)" }}
                    />
                    <Bar dataKey="kayip" name="Kayıp" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="bulundu" name="Bulundu" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Category distribution */}
                <div className="rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-5">
                  <h2 className="mb-4 text-sm font-bold text-white">Kategori Dağılımı</h2>
                  <div className="space-y-3">
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
                          <span className="w-32 shrink-0 truncate text-xs text-slate-400">{cat}</span>
                          <div className="flex-1 overflow-hidden rounded-full bg-slate-800 h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${Math.max(4, Math.round((count / stats.total) * 100))}%` }}
                            />
                          </div>
                          <span className="w-6 shrink-0 text-right text-xs font-bold text-slate-400">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-5">
                  <h2 className="mb-4 text-sm font-bold text-white">Hızlı İşlemler</h2>
                  <div className="space-y-2">
                    {[
                      {
                        icon: "⏰",
                        title: sendingReminders ? "Gönderiliyor..." : "Bitiş Hatırlatmaları",
                        desc: "Yakında sona erecek ilanlar için hatırlatma gönder",
                        onClick: handleSendExpiryReminders,
                        disabled: sendingReminders,
                        accent: "hover:border-amber-500/30 hover:bg-amber-500/5",
                      },
                      {
                        icon: "📊",
                        title: sendingDailyReport ? "Gönderiliyor..." : "Günlük Platform Raporu",
                        desc: "Admin e-postasına AI destekli platform özeti gönder",
                        onClick: handleSendDailyReport,
                        disabled: sendingDailyReport,
                        accent: "hover:border-blue-500/30 hover:bg-blue-500/5",
                      },
                    ].map(({ icon, title, desc, onClick, disabled, accent }) => (
                      <button
                        key={title}
                        onClick={onClick}
                        disabled={disabled}
                        className={`flex w-full items-center gap-3 rounded-xl border border-[#1a2744] bg-[#0a0f1e] px-4 py-3 text-left transition ${accent} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <span className="text-2xl">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{title}</p>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </div>
                        <span className="shrink-0 text-slate-600">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          ) : activeTab === "items" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  <span className="font-bold text-white">{items.length}</span> ilan
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#1a2744]">
                <div className="hidden sm:grid grid-cols-[80px_1fr_140px_80px_90px_160px] gap-3 border-b border-[#1a2744] bg-[#07101f] px-4 py-2.5">
                  {["Tür", "Başlık / Sahip", "Kategori", "Görüntü", "Tarih", "İşlemler"].map((h) => (
                    <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-[#1a2744]">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[80px_1fr_140px_80px_90px_160px] gap-3 items-center bg-[#0d1a2e] px-4 py-3 hover:bg-[#0f1f38] transition-colors">
                      <div>
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${item.type === "lost" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                          {item.type === "lost" ? "Kayıp" : "Bulundu"}
                        </span>
                        {item.status === "resolved" && (
                          <span className="mt-1 block rounded-md px-2 py-0.5 text-[10px] font-bold bg-green-500/15 text-green-300">Çözüldü</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.is_featured && <span className="text-[10px] text-yellow-400">⭐</span>}
                          {item.is_urgent && <span className="text-[10px] text-red-400">🔴</span>}
                          <Link href={`/items/${item.id}`} className="truncate text-sm font-medium text-white hover:text-blue-300">
                            {item.title}
                          </Link>
                        </div>
                        <p className="truncate text-[11px] text-slate-500">{item.created_by_email}</p>
                      </div>
                      <p className="truncate text-xs text-slate-400"><span className="sm:hidden text-slate-600 mr-1">Kategori:</span>{item.category || "—"}</p>
                      <p className="text-xs text-slate-400">👁 {(item.view_count || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-500"><span className="sm:hidden text-slate-600 mr-1">Tarih:</span>{new Date(item.created_at).toLocaleDateString("tr-TR")}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                          title={item.is_featured ? "Öne çıkarmayı kaldır" : "Öne çıkar"}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${item.is_featured ? "border-yellow-500/40 bg-yellow-500/15 text-yellow-400" : "border-[#1a2744] bg-[#0a0f1e] text-slate-500 hover:text-yellow-400"}`}
                        >⭐</button>
                        <button
                          onClick={() => handleToggleUrgent(item.id, item.is_urgent)}
                          title={item.is_urgent ? "Acili kaldır" : "Acil işaretle"}
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${item.is_urgent ? "border-red-500/40 bg-red-500/15 text-red-400" : "border-[#1a2744] bg-[#0a0f1e] text-slate-500 hover:text-red-400"}`}
                        >🔴</button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleting === item.id}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                        >{deleting === item.id ? "..." : "Sil"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          ) : activeTab === "users" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  <span className="font-bold text-white">{adminUsers.length}</span> kullanıcı
                </p>
              </div>
              {adminUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1a2744] p-12 text-center text-slate-500">Henüz kullanıcı yok.</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#1a2744]">
                  <div className="hidden md:grid grid-cols-[40px_1fr_70px_70px_100px_auto] gap-3 border-b border-[#1a2744] bg-[#07101f] px-4 py-2.5">
                    {["", "Kullanıcı", "İlan", "Çözüldü", "Kayıt", "İşlemler"].map((h) => (
                      <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{h}</span>
                    ))}
                  </div>
                  <div className="divide-y divide-[#1a2744]">
                    {adminUsers.map((u) => {
                      const initials = u.full_name
                        ? u.full_name.trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                        : (u.email?.[0] ?? "?").toUpperCase();
                      return (
                        <div key={u.email} className={`grid grid-cols-1 md:grid-cols-[40px_1fr_70px_70px_100px_auto] gap-3 items-center px-4 py-3 transition-colors ${u.is_banned ? "bg-red-500/5" : u.is_blacklisted ? "bg-orange-500/5" : "bg-[#0d1a2e] hover:bg-[#0f1f38]"}`}>
                          <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white overflow-hidden">
                            {u.avatar_url ? (
                              <Image src={u.avatar_url} alt={u.full_name || u.email} width={36} height={36} className="h-9 w-9 rounded-full object-cover" unoptimized />
                            ) : initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold text-white truncate">{u.full_name || "—"}</p>
                              {u.is_banned && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-300">Engelli</span>}
                              {u.is_blacklisted && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-orange-500/20 text-orange-300">Kara Liste</span>}
                              {ADMIN_EMAILS.includes(u.email.toLowerCase()) && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300">Admin</span>}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                          </div>
                          <p className="text-sm font-bold text-white"><span className="md:hidden text-[11px] text-slate-600 mr-1 font-normal">İlan:</span>{u.item_count}</p>
                          <p className="text-sm font-bold text-emerald-400"><span className="md:hidden text-[11px] text-slate-600 mr-1 font-normal">Çözüldü:</span>{u.resolved_count}</p>
                          <p className="text-xs text-slate-500"><span className="md:hidden text-slate-600 mr-1">Kayıt:</span>{new Date(u.created_at).toLocaleDateString("tr-TR")}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link href={`/users/${encodeURIComponent(u.email)}`} className="rounded-lg border border-[#1a2744] px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-800 transition">
                              Profil
                            </Link>
                            {u.email.toLowerCase() !== adminEmail && (
                              <>
                                <button
                                  onClick={() => handleToggleBan(u.email, u.is_banned)}
                                  disabled={togglingBan === u.email}
                                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${u.is_banned ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20" : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}
                                >
                                  {togglingBan === u.email ? "..." : u.is_banned ? "Engel Kaldır" : "Engelle"}
                                </button>
                                <button
                                  onClick={() => handleToggleBlacklist(u.email, u.is_blacklisted)}
                                  disabled={blacklisting === u.email}
                                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${u.is_blacklisted ? "border-[#1a2744] bg-slate-800 text-slate-400" : "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"}`}
                                >
                                  {blacklisting === u.email ? "..." : u.is_blacklisted ? "Kara Listeden Çıkar" : "Kara Liste"}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  disabled={deletingUser === u.email}
                                  className="rounded-lg border border-red-600/30 bg-red-600/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-600/20 transition disabled:opacity-50"
                                >
                                  {deletingUser === u.email ? "..." : "Sil"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          ) : activeTab === "sightings" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Toplam Bildirim", value: sightings.length, color: "text-amber-300" },
                  { label: "Farklı İlan", value: new Set(sightings.map((s) => s.item_id)).size, color: "text-white" },
                  { label: "Farklı Bildiren", value: new Set(sightings.map((s) => s.reporter_email)).size, color: "text-blue-300" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-4">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className={`mt-1.5 text-2xl font-black ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              {sightings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1a2744] p-12 text-center text-slate-500">Henüz &quot;Gördüm&quot; bildirimi yok.</div>
              ) : (
                <div className="space-y-2">
                  {sightings.map((s) => (
                    <div key={s.id} className="rounded-2xl border border-amber-500/10 bg-amber-500/5 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300">👁 Gördüm</span>
                            <Link href={`/items/${s.item_id}`} className="text-sm font-semibold text-white hover:text-amber-300 truncate max-w-xs">
                              {s.item_title}
                            </Link>
                          </div>
                          <p className="text-xs text-slate-500">
                            <span className="text-slate-400">{s.reporter_email}</span> · {new Date(s.created_at).toLocaleString("tr-TR")}
                          </p>
                          {s.location_text && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-300">
                              <span className="text-amber-400">📍</span>{s.location_text}
                            </p>
                          )}
                          {s.lat != null && s.lng != null && (
                            <a href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=16/${s.lat}/${s.lng}`} target="_blank" rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                              🗺 {s.lat.toFixed(5)}, {s.lng.toFixed(5)} — Haritada Gör ↗
                            </a>
                          )}
                          {s.note && (
                            <p className="mt-1.5 border-l-2 border-slate-700 pl-2 text-xs italic text-slate-400">&quot;{s.note}&quot;</p>
                          )}
                        </div>
                        <Link href={`/items/${s.item_id}`} className="shrink-0 rounded-xl border border-[#1a2744] px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition">
                          İlana Git →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          ) : activeTab === "moderation" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-4">
                <span className="text-lg shrink-0">🛡</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Moderasyon Kuyruğu</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Yeni ilanlar <code className="rounded bg-slate-800 px-1 py-0.5">pending</code>, AI tarafından bayraklananlar{" "}
                    <code className="rounded bg-slate-800 px-1 py-0.5">flagged</code> olarak burada görünür.
                  </p>
                </div>
                {pendingItems.filter((i) => i.moderation_status === "pending").length > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkModerating}
                    className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
                  >
                    {bulkModerating ? "Onaylanıyor..." : `Hepsini Onayla (${pendingItems.filter((i) => i.moderation_status === "pending").length})`}
                  </button>
                )}
              </div>
              {pendingItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1a2744] p-12 text-center text-slate-500">Onay bekleyen ilan yok. ✓</div>
              ) : (
                pendingItems.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${item.moderation_status === "flagged" ? "border-red-500/25 bg-red-500/5" : "border-amber-500/15 bg-amber-500/5"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.type === "lost" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                          {item.type === "lost" ? "Kayıp" : "Bulundu"}
                        </span>
                        {item.moderation_status === "flagged" && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-300">🚩 AI Bayraklandı</span>
                        )}
                        <Link href={`/items/${item.id}`} className="truncate text-sm font-medium text-white hover:text-blue-300">{item.title}</Link>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{item.created_by_email} · {item.category} · {new Date(item.created_at).toLocaleDateString("tr-TR")}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleModerateItem(item.id, "approve")}
                        disabled={moderating === item.id}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition"
                      >{moderating === item.id ? "..." : "Onayla"}</button>
                      <button
                        onClick={() => handleModerateItem(item.id, "reject")}
                        disabled={moderating === item.id}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition"
                      >{moderating === item.id ? "..." : "Reddet & Sil"}</button>
                    </div>
                  </div>
                ))
              )}
            </div>

          ) : activeTab === "requests" ? (
            <div className="space-y-3">
              {(() => {
                const TYPE_LABELS: Record<string, string> = {
                  feature_request: "💡 Özellik İsteği",
                  bug_report: "🐛 Hata Bildirimi",
                  complaint: "⚑ Şikayet",
                  other: "📝 Diğer",
                };
                const STATUS_CLS: Record<string, string> = {
                  pending: "bg-amber-500/20 text-amber-300",
                  in_progress: "bg-blue-500/20 text-blue-300",
                  resolved: "bg-green-500/20 text-green-300",
                  dismissed: "bg-slate-700 text-slate-400",
                };
                const STATUS_LBL: Record<string, string> = {
                  pending: "Bekliyor", in_progress: "İşlemde", resolved: "Çözüldü", dismissed: "Reddedildi",
                };
                if (userRequests.length === 0) {
                  return <div className="rounded-2xl border border-dashed border-[#1a2744] p-12 text-center text-slate-500">Henüz kullanıcı isteği yok.</div>;
                }
                return userRequests.map((req) => (
                  <div key={req.id} className={`rounded-2xl border p-4 ${req.status === "pending" ? "border-amber-500/15 bg-amber-500/5" : "border-[#1a2744] bg-[#0d1a2e]"}`}>
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CLS[req.status] ?? ""}`}>
                            {STATUS_LBL[req.status] ?? req.status}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">{TYPE_LABELS[req.type] ?? req.type}</span>
                        </div>
                        <p className="text-sm font-semibold text-white">{req.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{req.user_email} · {new Date(req.created_at).toLocaleDateString("tr-TR")}</p>
                        <p className="mt-2 text-xs text-slate-300 leading-relaxed">{req.description}</p>
                        {req.admin_response && (
                          <p className="mt-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
                            Admin yanıtı: {req.admin_response}
                          </p>
                        )}
                      </div>
                    </div>
                    {req.status !== "resolved" && req.status !== "dismissed" && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          placeholder="Admin yanıtı (opsiyonel)..."
                          value={requestResponse[req.id] ?? ""}
                          onChange={(e) => setRequestResponse((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          rows={2}
                          className="w-full rounded-xl border border-[#1a2744] bg-[#07101f] px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleRequestAction(req.id, "in_progress")} disabled={updatingRequest === req.id}
                            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50">
                            {updatingRequest === req.id ? "..." : "İşleme Al"}
                          </button>
                          <button onClick={() => handleRequestAction(req.id, "resolved")} disabled={updatingRequest === req.id}
                            className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition disabled:opacity-50">
                            {updatingRequest === req.id ? "..." : "✓ Çözüldü"}
                          </button>
                          <button onClick={() => handleRequestAction(req.id, "dismissed")} disabled={updatingRequest === req.id}
                            className="rounded-xl border border-[#1a2744] bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 transition disabled:opacity-50">
                            {updatingRequest === req.id ? "..." : "Reddet"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

          ) : activeTab === "stories" ? (
            <div className="space-y-3">
              {pendingStories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1a2744] p-12 text-center text-slate-500">Onay bekleyen hikaye yok. ✓</div>
              ) : (
                pendingStories.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                    <p className="text-xs text-slate-500 mb-1">{s.user_email} · {new Date(s.created_at).toLocaleDateString("tr-TR")}</p>
                    <p className="text-sm font-semibold text-white mb-2">&quot;{s.item_title}&quot;</p>
                    <p className="text-sm text-slate-300 whitespace-pre-line mb-3">{s.story}</p>
                    <div className="flex gap-2">
                      <button
                        disabled={approvingStory === s.id}
                        onClick={async () => {
                          setApprovingStory(s.id);
                          const { data: { session } } = await supabase.auth.getSession();
                          const res = await fetch("/api/admin/stories", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
                            body: JSON.stringify({ storyId: s.id }),
                          });
                          if (res.ok) { setPendingStories((prev) => prev.filter((x) => x.id !== s.id)); toast.success("Hikaye onaylandı."); }
                          else toast.error("Onaylanamadı.");
                          setApprovingStory(null);
                        }}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                      >{approvingStory === s.id ? "..." : "✓ Onayla"}</button>
                      <button
                        disabled={approvingStory === s.id}
                        onClick={async () => {
                          setApprovingStory(s.id);
                          const { data: { session } } = await supabase.auth.getSession();
                          const res = await fetch("/api/admin/stories", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
                            body: JSON.stringify({ storyId: s.id }),
                          });
                          if (res.ok) { setPendingStories((prev) => prev.filter((x) => x.id !== s.id)); toast.success("Hikaye silindi."); }
                          else toast.error("Silinemedi.");
                          setApprovingStory(null);
                        }}
                        className="rounded-xl border border-[#1a2744] bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition disabled:opacity-50"
                      >✗ Reddet</button>
                    </div>
                  </div>
                ))
              )}
            </div>

          ) : activeTab === "reports" ? (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#1a2744] p-12 text-center text-slate-500">Henüz şikayet yok. ✓</div>
              ) : (
                reports.map((report) => {
                  const isEvaluating = evaluatingReport === report.id;
                  const isPending = report.status === "pending";
                  return (
                    <div key={report.id} className={`rounded-2xl border transition-all ${isPending ? "border-red-500/20 bg-red-500/5" : "border-[#1a2744] bg-[#0d1a2e] opacity-60"}`}>
                      <div className="flex items-start justify-between gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              report.status === "pending" ? "bg-red-500/20 text-red-300" :
                              report.status === "reviewed" ? "bg-green-500/20 text-green-300" :
                              "bg-slate-700 text-slate-400"
                            }`}>
                              {report.status === "pending" ? "⏳ Bekliyor" : report.status === "reviewed" ? "✅ İncelendi" : "❌ Reddedildi"}
                            </span>
                            <span className="text-xs font-semibold text-slate-300">{REASON_LABELS[report.reason] || report.reason}</span>
                          </div>
                          {report.item_id ? (
                            <Link href={`/items/${report.item_id}`} target="_blank" className="text-sm font-semibold text-white hover:text-blue-300">
                              {report.item_title} ↗
                            </Link>
                          ) : (
                            <Link href={`/users/${encodeURIComponent(report.item_owner_email || report.reported_user_email || "")}`} target="_blank" className="text-sm font-semibold text-white hover:text-red-300">
                              👤 {report.item_owner_email || report.reported_user_email} ↗
                            </Link>
                          )}
                          <p className="mt-0.5 text-xs text-slate-500">
                            Şikayet eden: <span className="text-slate-400">{report.reporter_email}</span>
                            {report.item_owner_email && report.item_id && (
                              <> · Sahip: <span className="text-slate-400">{report.item_owner_email}</span></>
                            )}
                            {" · "}{new Date(report.created_at).toLocaleDateString("tr-TR")}
                          </p>
                          {report.details && (
                            <p className="mt-2 rounded-xl border border-[#1a2744] bg-slate-800/50 px-3 py-2 text-xs italic text-slate-400">
                              &quot;{report.details}&quot;
                            </p>
                          )}
                        </div>
                        {isPending && (
                          <button
                            onClick={() => {
                              if (isEvaluating) { setEvaluatingReport(null); setReportMessage(""); }
                              else { setEvaluatingReport(report.id); setReportMessage(`"${report.item_title}" ilanı hakkında aldığımız şikayeti inceledik. `); }
                            }}
                            className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${isEvaluating ? "border-[#1a2744] bg-slate-800 text-slate-400" : "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"}`}
                          >{isEvaluating ? "İptal" : "Değerlendir ▾"}</button>
                        )}
                      </div>
                      {isEvaluating && isPending && (
                        <div className="border-t border-[#1a2744] px-4 pb-4 pt-3 space-y-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-400">
                              Kullanıcıya gönderilecek mesaj <span className="text-slate-600">(opsiyonel)</span>
                            </label>
                            <textarea
                              value={reportMessage}
                              onChange={(e) => setReportMessage(e.target.value)}
                              rows={3}
                              className="w-full rounded-xl border border-[#1a2744] bg-[#07101f] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none resize-none"
                              placeholder="Admin mesajı yazın..."
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleReportAction(report.id, "remove_item", reportMessage)} disabled={updatingReport === report.id}
                              className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50">
                              {updatingReport === report.id ? "..." : "🗑 İlanı Kaldır + Bildirim"}
                            </button>
                            <button onClick={() => handleReportAction(report.id, "warn_user", reportMessage)} disabled={updatingReport === report.id}
                              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50">
                              {updatingReport === report.id ? "..." : "⚠️ İlanı Bırak + Uyarı"}
                            </button>
                            <button onClick={() => handleReportAction(report.id, "dismiss")} disabled={updatingReport === report.id}
                              className="rounded-xl border border-[#1a2744] bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-700 transition disabled:opacity-50">
                              {updatingReport === report.id ? "..." : "✗ Asılsız / Reddet"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          ) : activeTab === "announce" ? (
            <div className="max-w-xl space-y-5">
              <div className="rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-5">
                <h2 className="text-sm font-bold text-white mb-0.5">Duyuru Gönder</h2>
                <p className="text-xs text-slate-500">Kullanıcılara uygulama bildirimi ve/veya e-posta gönder.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Konu / Başlık</label>
                <input
                  value={announceSubject}
                  onChange={(e) => setAnnounceSubject(e.target.value)}
                  placeholder="Örn: Yeni özellik duyurusu"
                  className="w-full rounded-xl border border-[#1a2744] bg-[#0d1a2e] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Mesaj</label>
                <textarea
                  value={announceMessage}
                  onChange={(e) => setAnnounceMessage(e.target.value)}
                  rows={5}
                  placeholder="Kullanıcılara gönderilecek mesajı yazın..."
                  className="w-full rounded-xl border border-[#1a2744] bg-[#0d1a2e] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Alıcılar</label>
                <div className="flex gap-2 mb-2">
                  {(["all", "custom"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAnnounceTargets(t)}
                      className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${announceTargets === t ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-[#1a2744] bg-[#0d1a2e] text-slate-400 hover:border-slate-600"}`}
                    >
                      {t === "all" ? `Tüm kullanıcılar (${adminUsers.length})` : "Belirli kişiler"}
                    </button>
                  ))}
                </div>
                {announceTargets === "custom" && (
                  <textarea
                    value={announceCustomEmails}
                    onChange={(e) => setAnnounceCustomEmails(e.target.value)}
                    rows={3}
                    placeholder={"E-posta adreslerini virgülle ayırın\nornek@mail.com, diger@mail.com"}
                    className="w-full rounded-xl border border-[#1a2744] bg-[#0d1a2e] px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none resize-none"
                  />
                )}
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-400">Gönderim Türü</label>
                <div className="flex gap-4">
                  {[
                    { label: "Uygulama bildirimi", checked: announceSendNotif, set: setAnnounceSendNotif },
                    { label: "E-posta", checked: announceSendEmail, set: setAnnounceSendEmail },
                  ].map(({ label, checked, set }) => (
                    <label key={label} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="accent-blue-500 h-4 w-4" />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                disabled={announcing || !announceSubject.trim() || !announceMessage.trim()}
                onClick={async () => {
                  setAnnouncing(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const targets = announceTargets === "all"
                      ? "all"
                      : announceCustomEmails.split(",").map((e) => e.trim()).filter(Boolean);
                    const res = await fetch("/api/admin/announce", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
                      body: JSON.stringify({ subject: announceSubject, message: announceMessage, targets, sendEmail: announceSendEmail, sendNotification: announceSendNotif }),
                    });
                    const d = await res.json();
                    if (res.ok) {
                      toast.success(`Gönderildi — ${d.recipients} kişi${d.emailSent ? `, ${d.emailSent} e-posta` : ""}${d.notifSent ? `, ${d.notifSent} bildirim` : ""}`);
                      setAnnounceSubject(""); setAnnounceMessage(""); setAnnounceCustomEmails("");
                    } else toast.error(d.error || "Gönderilemedi.");
                  } catch {
                    toast.error("Bir hata oluştu.");
                  } finally {
                    setAnnouncing(false);
                  }
                }}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {announcing ? "Gönderiliyor..." : "📢 Gönder"}
              </button>
            </div>
          ) : activeTab === "support" ? (
            <div className="mt-6 flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-260px)] min-h-[400px]">
              {/* Session listesi — mobilde seçim varsa gizle */}
              <div className={`lg:w-72 lg:shrink-0 flex-col gap-2 overflow-y-auto ${selectedSession ? "hidden lg:flex" : "flex"}`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-white">Aktif Oturumlar</h2>
                  <button
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      loadSupportSessions(session?.access_token || "");
                    }}
                    className="text-xs text-slate-400 hover:text-white transition"
                  >
                    Yenile
                  </button>
                </div>
                {supportLoading ? (
                  <p className="text-sm text-slate-500">Yükleniyor...</p>
                ) : supportSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                    Bekleyen destek talebi yok.
                  </div>
                ) : (
                  supportSessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => openSupportSession(s)}
                      className={`text-left rounded-xl border p-3 transition ${
                        selectedSession?.id === s.id
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-slate-700 bg-slate-900 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{s.user_name || s.user_email}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.status === "waiting" ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"
                        }`}>
                          {s.status === "waiting" ? "Bekliyor" : "Aktif"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">{s.user_email}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {new Date(s.updated_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </button>
                  ))
                )}
              </div>

              {/* Chat alanı — mobilde seçim yoksa gizle */}
              <div className={`flex-1 flex-col rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden min-h-[500px] lg:min-h-0 ${selectedSession ? "flex" : "hidden lg:flex"}`}>
                {!selectedSession ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    Soldaki listeden bir oturum seçin.
                  </div>
                ) : (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => setSelectedSession(null)}
                          className="lg:hidden shrink-0 text-slate-400 hover:text-white transition text-sm"
                        >
                          ← Geri
                        </button>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{selectedSession.user_name || selectedSession.user_email}</p>
                          <p className="text-xs text-slate-400 truncate">{selectedSession.user_email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => closeSupportSession(selectedSession.id)}
                        disabled={closingSession}
                        className="shrink-0 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                      >
                        {closingSession ? "Kapatılıyor..." : "Oturumu Kapat"}
                      </button>
                    </div>

                    {/* Mesajlar */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {supportMessages.length === 0 && (
                        <p className="text-sm text-slate-500 text-center">Henüz mesaj yok. İlk mesajı siz gönderin.</p>
                      )}
                      {supportMessages.map((m) => (
                        <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                            m.sender_type === "admin"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-200"
                          }`}>
                            {m.sender_type === "user" && (
                              <p className="text-[10px] text-slate-400 mb-1">{m.sender_email}</p>
                            )}
                            {m.content}
                            <p className={`mt-1 text-[10px] ${m.sender_type === "admin" ? "text-blue-200" : "text-slate-500"}`}>
                              {new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={supportBottomRef} />
                    </div>

                    {/* Input */}
                    {selectedSession.status !== "closed" && (
                      <div className="flex gap-2 p-3 border-t border-slate-700 bg-slate-800">
                        <input
                          type="text"
                          value={supportInput}
                          onChange={(e) => setSupportInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendSupportReply()}
                          placeholder="Yanıt yaz..."
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-500"
                          disabled={sendingSupport}
                        />
                        <button
                          onClick={sendSupportReply}
                          disabled={!supportInput.trim() || sendingSupport}
                          className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 text-sm font-semibold text-white transition"
                        >
                          {sendingSupport ? "..." : "Gönder"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Join support session modal */}
      {joinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Oturuma Katıl</h2>
            <p className="text-xs text-slate-400 mb-5">
              <span className="text-white">{joinModal.user_name || joinModal.user_email}</span> bekliyor
            </p>

            <p className="text-xs font-semibold text-slate-400 mb-2">Rolünüz</p>
            <div className="flex gap-2 mb-4">
              {(["Müşteri Temsilcisi", "Admin"] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setJoinRole(role)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    joinRole === role
                      ? "border-blue-500 bg-blue-500/20 text-blue-300"
                      : "border-[#1a2744] bg-slate-800 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-slate-400 mb-2">Adınız</p>
            <input
              type="text"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinName.trim() && confirmJoin()}
              placeholder="Adınızı yazın..."
              autoFocus
              className="w-full mb-5 rounded-xl border border-[#1a2744] bg-[#07101f] px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />

            <div className="text-xs text-slate-500 mb-4 bg-slate-800/50 rounded-xl px-3 py-2">
              Görünecek isim: <span className="text-white font-semibold">{joinRole} - {joinName.trim() || "..."}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setJoinModal(null)}
                className="flex-1 rounded-xl border border-[#1a2744] bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
              >İptal</button>
              <button
                onClick={confirmJoin}
                disabled={!joinName.trim()}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >Oturumu Onayla →</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete item modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1a2744] bg-[#0d1a2e] p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-lg">🗑</div>
              <div>
                <h2 className="text-base font-bold text-white">İlanı Sil</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  <span className="text-white">&ldquo;{deleteTarget.title}&rdquo;</span> · {deleteTarget.ownerEmail} adresine bildirim gönderilecek.
                </p>
              </div>
            </div>
            <p className="mb-2 text-xs font-semibold text-slate-400">Silme sebebi</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {["Spam / Reklam", "Yanıltıcı / Sahte ilan", "Uygunsuz içerik", "Platform kuralları ihlali"].map((r) => (
                <button
                  key={r}
                  onClick={() => setDeleteReason(r)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${deleteReason === r ? "border-red-500 bg-red-500/20 text-red-400" : "border-[#1a2744] bg-slate-800 text-slate-400 hover:border-slate-600"}`}
                >{r}</button>
              ))}
            </div>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Veya özel sebep yazın..."
              rows={2}
              className="mb-4 w-full rounded-xl border border-[#1a2744] bg-[#07101f] px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-[#1a2744] bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
              >İptal</button>
              <button
                onClick={confirmDeleteItem}
                disabled={!deleteReason.trim() || deleting === deleteTarget.id}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >{deleting === deleteTarget.id ? "Siliniyor..." : "Kalıcı Olarak Sil"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
