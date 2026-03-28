"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mounted) {
        setIsLoggedIn(!!user);
        setUserEmail(user?.email?.toLowerCase().trim() || "");
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
      setUserEmail(session?.user?.email?.toLowerCase().trim() || "");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Okunmamış bildirim sayısını çek
  useEffect(() => {
    if (!userEmail) { setUnreadCount(0); return; }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_email", userEmail)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Realtime dinle
    const channel = supabase
      .channel("notifications-navbar")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_email=eq.${userEmail}`,
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userEmail]);

  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-white">
          Lost&amp;Found
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-300 hover:text-white">Ana Sayfa</Link>
          <Link href="/search" className="text-slate-300 hover:text-white">Ara</Link>

          {isLoggedIn && (
            <>
              <Link href="/messages" className="text-slate-300 hover:text-white">Mesajlar</Link>

              {/* Bildirim Zili */}
              <Link href="/notifications" className="relative text-slate-300 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <Link href="/profile" className="text-slate-300 hover:text-white">Profilim</Link>
            </>
          )}

          {!isLoggedIn && (
            <>
              <Link href="/auth/login" className="text-slate-300 hover:text-white">Giriş</Link>
              <Link href="/auth/register" className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-500">
                Kayıt Ol
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}