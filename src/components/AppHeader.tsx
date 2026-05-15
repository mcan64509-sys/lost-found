"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { normalizeEmail } from "../lib/utils";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  Bell,
  Building2,
  ChevronDown,
  Heart,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  PlusCircle,
  Search,
  Settings,
  FileText,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";

type HeaderUser = {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string | null;
  accountType?: string | null;
};

type ConversationRow = {
  id: string;
  owner_email: string;
  claimant_email: string;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  item_id: string;
  is_read: boolean;
  created_at: string;
};

function getInitials(name?: string, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (email?.trim()) return email[0].toUpperCase();
  return "?";
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const [user, setUser] = useState<HeaderUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [claimCount, setClaimCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showIlanMenu, setShowIlanMenu] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackDesc, setFeedbackDesc] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const notifRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const ilanRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const [userEmail, setUserEmail] = useState("");

  const initials = useMemo(
    () => getInitials(user?.fullName, user?.email),
    [user?.fullName, user?.email]
  );

  async function loadNotifications(email: string) {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) ?? []);
  }

  async function markAllRead(email: string) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_email", email)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  useEffect(() => {
    const loadHeaderData = async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session?.user) {
          setUser(null);
          setClaimCount(0);
          setMessageCount(0);
          return;
        }
        const sessionUser = sessionData.session.user;
        const currentEmail = normalizeEmail(sessionUser.email);
        const [
          { data: profile },
          { count: pendingClaims },
          { data: conversations },
        ] = await Promise.all([
          supabase.from("profiles").select("id,email,full_name,avatar_url,account_type").eq("id", sessionUser.id).maybeSingle(),
          supabase.from("claims").select("*", { count: "exact", head: true }).eq("owner_email", currentEmail).eq("status", "pending"),
          supabase.from("conversations").select("id, owner_email, claimant_email").or(`owner_email.eq.${currentEmail},claimant_email.eq.${currentEmail}`),
        ]);
        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          fullName: profile?.full_name || sessionUser.user_metadata?.full_name || "",
          avatarUrl: profile?.avatar_url || null,
          accountType: profile?.account_type || null,
        });
        setClaimCount(pendingClaims || 0);
        const conversationIds = ((conversations ?? []) as ConversationRow[]).map((c) => c.id);
        if (conversationIds.length === 0) {
          setMessageCount(0);
        } else {
          const { data: unreadMessages } = await supabase
            .from("messages")
            .select("id")
            .in("conversation_id", conversationIds)
            .eq("is_read", false)
            .neq("sender_email", currentEmail);
          setMessageCount((unreadMessages || []).length);
        }
      } catch { /* ignore */ }
    };

    loadHeaderData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { loadHeaderData(); });
    window.addEventListener("focus", loadHeaderData);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", loadHeaderData);
    };
  }, [pathname]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const email = normalizeEmail(data.session?.user?.email);
      if (email) loadNotifications(email);
    }
    init();
  }, []);

  useEffect(() => {
    async function resolveEmail() {
      const { data } = await supabase.auth.getSession();
      const email = normalizeEmail(data.session?.user?.email);
      setUserEmail(email);
    }
    resolveEmail();
  }, [user]);

  useEffect(() => {
    if (!userEmail) return;
    const notifChannel = supabase
      .channel(`browser-notif-${userEmail}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_email=eq.${userEmail}` },
        (payload) => {
          loadNotifications(userEmail);
          if ("Notification" in window && Notification.permission === "granted" && document.visibilityState === "hidden") {
            const n = payload.new as { title?: string; message?: string };
            new Notification(n.title || "Lost & Found", { body: n.message || "", icon: "/favicon.ico" });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(notifChannel); };
  }, [userEmail]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (ilanRef.current && !ilanRef.current.contains(e.target as Node)) setShowIlanMenu(false);
      if (aboutRef.current && !aboutRef.current.contains(e.target as Node)) setAboutOpen(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleFeedbackSubmit() {
    if (!userEmail) { toast.error(t.feedback.loginRequired); return; }
    if (!feedbackType || !feedbackTitle.trim() || !feedbackDesc.trim()) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    setSubmittingFeedback(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, type: feedbackType, title: feedbackTitle.trim(), description: feedbackDesc.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t.feedback.success);
        setShowFeedback(false);
        setFeedbackType(""); setFeedbackTitle(""); setFeedbackDesc("");
      } else {
        toast.error(data.error || "Gönderilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSubmittingFeedback(false);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      toast.error(t.nav.logoutError);
    }
  }

  const isActive = (path: string) =>
    pathname === path || (path !== "/" && pathname.startsWith(path));

  const navLinkClass = (path: string) =>
    `relative text-sm font-medium transition-colors ${
      isActive(path)
        ? "text-white"
        : "text-slate-400 hover:text-white"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">

          {/* LOGO */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-black text-lg tracking-tight hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-slate-950 text-xs font-black">
              BV
            </div>
            <span className="hidden sm:block">BulanVarMı?</span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className={navLinkClass("/") + " px-4 py-2 rounded-xl hover:bg-white/5"}>
              {t.nav.home}
              {isActive("/") && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
            </Link>
            <Link href="/search" className={navLinkClass("/search") + " px-4 py-2 rounded-xl hover:bg-white/5"}>
              {t.nav.listings}
              {isActive("/search") && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
            </Link>
          </nav>

          {/* SAĞ KISIM */}
          <div className="flex items-center gap-2">

            {/* HAKKINDA (3 nokta) — masaüstünde görünür */}
            <div ref={aboutRef} className="relative hidden sm:block">
              <button
                onClick={(e) => { e.stopPropagation(); setAboutOpen((v) => !v); }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition"
                title={t.about.title}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {aboutOpen && (
                <div className="fixed top-[65px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-80 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-scale-in z-50">
                  <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-3">
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    <p className="font-bold text-white text-sm">{t.about.title}</p>
                  </div>
                  <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                    {t.about.items.map((item, i) => (
                      <div key={i} className="rounded-xl border border-slate-800 bg-slate-800/50 p-3">
                        <p className="text-xs font-semibold text-white mb-1">{item.q}</p>
                        <p className="text-xs text-slate-400 leading-5">{item.a}</p>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-slate-800 text-center">
                      <p className="text-[10px] text-slate-600">bulanvarmi1@gmail.com</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* GERİ BİLDİRİM */}
            {userEmail && (
              <button
                onClick={() => setShowFeedback(true)}
                title={t.feedback.navLabel}
                className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 hover:border-blue-500/40 hover:text-blue-400 transition"
              >
                💬 {t.feedback.navLabel}
              </button>
            )}

            {/* DİL SEÇİCİ */}
            <LanguageSwitcher />

            {/* İLAN VER dropdown */}
            <div ref={ilanRef} className="relative hidden md:block">
              <button
                onClick={(e) => { e.stopPropagation(); setShowIlanMenu((v) => !v); }}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                {t.nav.postAd}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showIlanMenu ? "rotate-180" : ""}`} />
              </button>
              {showIlanMenu && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-scale-in">
                  <div className="p-1.5">
                    <button
                      onClick={() => { setShowIlanMenu(false); router.push("/lost/report"); }}
                      className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left hover:bg-amber-500/10 transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 text-base">!</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white group-hover:text-amber-400 transition-colors">{t.nav.lostAd}</div>
                        <div className="text-xs text-slate-500">{t.nav.lostAdDesc}</div>
                      </div>
                    </button>
                    <button
                      onClick={() => { setShowIlanMenu(false); router.push("/found/report"); }}
                      className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-left hover:bg-emerald-500/10 transition group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-400 text-base">✓</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{t.nav.foundAd}</div>
                        <div className="text-xs text-slate-500">{t.nav.foundAdDesc}</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* MESAJLAR — mobilde gizli (hamburger menüde var) */}
            <Link
              href="/messages"
              className="relative hidden sm:flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition"
              title={t.nav.messages}
            >
              <MessageCircle className="w-5 h-5" />
              {messageCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white leading-none py-0.5">
                  {messageCount > 99 ? "99+" : messageCount}
                </span>
              )}
            </Link>

            {/* BİLDİRİMLER */}
            {user && (
              <div ref={notifRef} className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const opening = !notifOpen;
                    setNotifOpen(opening);
                    if (opening && user.email) markAllRead(normalizeEmail(user.email));
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition"
                  title={t.nav.notifications}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none py-0.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed top-[65px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-80 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-scale-in z-50">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                      <p className="font-bold text-white text-sm">{t.nav.notifications}</p>
                      {unreadCount > 0 && (
                        <span className="text-xs text-slate-500">{unreadCount} {t.nav.unread}</span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">{t.nav.noNotifications}</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => { setNotifOpen(false); router.push(`/items/${n.item_id}`); }}
                            className={`w-full border-b border-slate-800 px-4 py-3 text-left transition last:border-0 hover:bg-slate-800 ${!n.is_read ? "bg-blue-500/5 border-l-2 border-l-blue-500" : ""}`}
                          >
                            <p className="text-xs font-semibold text-white">{n.title}</p>
                            <p className="mt-0.5 text-xs leading-5 text-slate-400">{n.message}</p>
                            <p className="mt-1 text-[10px] text-slate-600">
                              {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* KULLANICI MENÜSÜ */}
            {user ? (
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 pl-1 pr-3 py-1 hover:border-slate-600 transition"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Profil" className="h-8 w-8 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm text-white max-w-[100px] truncate">
                    {user.fullName?.split(" ")[0] || "Profil"}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div className="fixed top-[65px] left-4 right-4 sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-64 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-scale-in z-50">
                    <div className="border-b border-slate-800 px-4 py-3 bg-slate-800/50">
                      <p className="font-semibold text-white text-sm">{user.fullName || "Kullanıcı"}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                    </div>
                    <div className="p-1.5">
                      <Link href="/profile" onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                        <div className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4" />
                          <span>{t.nav.profile}</span>
                        </div>
                        {claimCount > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {claimCount > 99 ? "99+" : claimCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/my-items" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                        <FileText className="w-4 h-4" />
                        <span>{t.nav.myListings}</span>
                      </Link>
                      <Link href="/favorites" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                        <Heart className="w-4 h-4" />
                        <span>{t.nav.favorites}</span>
                      </Link>
                      <Link href="/alerts" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                        <Bell className="w-4 h-4" />
                        <span>{t.nav.alerts}</span>
                      </Link>
                      {user.accountType === "business" && (
                        <Link href="/business" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition">
                          <Building2 className="w-4 h-4" />
                          <span>{t.nav.businessPanel}</span>
                        </Link>
                      )}
                      <Link href="/messages" onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                        <div className="flex items-center gap-2.5">
                          <MessageCircle className="w-4 h-4" />
                          <span>{t.nav.messages}</span>
                        </div>
                        {messageCount > 0 && (
                          <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {messageCount > 99 ? "99+" : messageCount}
                          </span>
                        )}
                      </Link>
                      <div className="border-t border-slate-800 mt-1 pt-1">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition">
                          <LogOut className="w-4 h-4" />
                          <span>{t.nav.logout}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login"
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition">
                  {t.nav.login}
                </Link>
                <Link href="/auth/register"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100 transition">
                  {t.nav.register}
                </Link>
              </div>
            )}

            {/* MOBİL HAMBURGER */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* MOBİL MENÜ */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-1 animate-fade-in-down">
            <button
              onClick={() => { setMobileOpen(false); setAboutOpen((v) => !v); }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition"
            >
              <MoreHorizontal className="w-4 h-4" />
              {t.about.title}
            </button>
            <Link href="/" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive("/") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              {t.nav.home}
            </Link>
            <Link href="/search" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive("/search") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              <Search className="w-4 h-4" />
              {t.nav.listings}
            </Link>
            <Link href="/hikayeler" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive("/hikayeler") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              🎉 {t.nav.stories}
            </Link>
            <Link href="/kayip-buro" onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive("/kayip-buro") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              🏢 {t.nav.bureaus}
            </Link>
            <Link href="/messages" onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${isActive("/messages") ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4" />
                {t.nav.messages}
              </div>
              {messageCount > 0 && (
                <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{messageCount}</span>
              )}
            </Link>
            <div className="border-t border-slate-800 pt-3 mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMobileOpen(false); router.push("/lost/report"); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950"
              >
                {t.nav.lostAd}
              </button>
              <button
                onClick={() => { setMobileOpen(false); router.push("/found/report"); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950"
              >
                {t.nav.foundAd}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setShowFeedback(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-white">{t.feedback.modalTitle}</h3>
              <p className="mt-1 text-sm text-slate-400">{t.feedback.modalSubtitle}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">{t.feedback.typeLabel} *</label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="">{t.feedback.selectType}</option>
                  {Object.entries(t.feedback.types).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">{t.feedback.titleLabel} *</label>
                <input
                  type="text"
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  maxLength={120}
                  placeholder={t.feedback.titlePlaceholder}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">{t.feedback.descLabel} *</label>
                <textarea
                  value={feedbackDesc}
                  onChange={(e) => setFeedbackDesc(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder={t.feedback.descPlaceholder}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowFeedback(false)}
                  className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 transition"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={submittingFeedback || !feedbackType || !feedbackTitle.trim() || !feedbackDesc.trim()}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {submittingFeedback ? t.feedback.submitting : t.feedback.submit}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
