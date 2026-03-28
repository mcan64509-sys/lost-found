"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

type HeaderUser = {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string | null;
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

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getInitials(name?: string, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (email?.trim()) return email[0].toUpperCase();
  return "?";
}

function navClass(active: boolean) {
  return active
    ? "rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/10"
    : "rounded-2xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white";
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<HeaderUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [claimCount, setClaimCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const menuRef = useRef<HTMLDivElement | null>(null);

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
          supabase.from("profiles").select("id,email,full_name,avatar_url").eq("id", sessionUser.id).maybeSingle(),
          supabase.from("claims").select("*", { count: "exact", head: true }).eq("owner_email", currentEmail).eq("status", "pending"),
          supabase.from("conversations").select("id, owner_email, claimant_email").or(`owner_email.eq.${currentEmail},claimant_email.eq.${currentEmail}`),
        ]);

        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          fullName: profile?.full_name || sessionUser.user_metadata?.full_name || "",
          avatarUrl: profile?.avatar_url || null,
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
      } catch (error) {
        console.error("Header load error:", error);
      }
    };

    loadHeaderData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadHeaderData();
    });

    window.addEventListener("focus", loadHeaderData);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", loadHeaderData);
    };
  }, [pathname]);

  // Bildirimleri sadece bir kez yükle
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const email = normalizeEmail(data.session?.user?.email);
      if (email) loadNotifications(email);
    }
    init();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      toast.error("Çıkış yapılırken bir hata oluştu.");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-lg font-black tracking-tight text-white transition hover:text-blue-300">
          Lost & Found
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/" className={navClass(pathname === "/")}>Ana Sayfa</Link>
          <Link href="/search" className={navClass(pathname === "/search")}>Ara</Link>
          <Link href="/messages" className="relative">
            <span className={navClass(pathname === "/messages" || pathname.startsWith("/messages/"))}>
              Mesajlar
            </span>
            {messageCount > 0 && (
              <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-lg">
                {messageCount > 99 ? "99+" : messageCount}
              </span>
            )}
          </Link>

          {user && (
            <div ref={notifRef} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const opening = !notifOpen;
                  setNotifOpen(opening);
                  if (opening && user.email) {
                    markAllRead(normalizeEmail(user.email));
                  }
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                  <div className="border-b border-slate-800 px-4 py-3">
                    <p className="font-semibold text-white">Bildirimler</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">Henüz bildirim yok.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            setNotifOpen(false);
                            router.push(`/items/${n.item_id}`);
                          }}
                          className={`w-full border-b border-slate-800 px-4 py-3 text-left transition last:border-0 hover:bg-slate-800 ${!n.is_read ? "bg-blue-500/5" : ""}`}
                        >
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{n.message}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(n.created_at).toLocaleDateString("tr-TR")}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }}
                className="relative overflow-hidden rounded-full ring-2 ring-slate-700 transition hover:ring-slate-500"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profil" className="h-11 w-11 object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center bg-slate-800 text-sm font-bold text-white">
                    {initials}
                  </div>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
                  <div className="border-b border-slate-800 px-3 pb-3 pt-2">
                    <p className="font-semibold text-white">{user.fullName || "Kullanıcı"}</p>
                    <p className="mt-1 text-sm text-slate-400">{user.email || "E-posta yok"}</p>
                  </div>
                  <div className="pt-2">
                    <Link href="/profile" onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white transition hover:bg-slate-800">
                      <span>Profil</span>
                      {claimCount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                          {claimCount > 99 ? "99+" : claimCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/my-items" onClick={() => setMenuOpen(false)}
                      className="mt-1 block rounded-xl px-3 py-2 text-sm text-white transition hover:bg-slate-800">
                      İlanlarım
                    </Link>
                    <Link href="/messages" onClick={() => setMenuOpen(false)}
                      className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white transition hover:bg-slate-800">
                      <span>Mesajlar</span>
                      {messageCount > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                          {messageCount > 99 ? "99+" : messageCount}
                        </span>
                      )}
                    </Link>
                    <button onClick={handleLogout}
                      className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-slate-800">
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
              Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}