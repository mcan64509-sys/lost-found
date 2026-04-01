"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  item_id: string | null;
  is_read: boolean;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }

      const email = user.email.toLowerCase().trim();
      setUserEmail(email);

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_email", email)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data || []);

      // Hepsini okundu yap (UI'da da güncelle)
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_email", email)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      setLoading(false);
    };

    load();
  }, []);

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-black">Bildirimler</h1>
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              ← Ana Sayfa
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="h-4 w-48 rounded bg-slate-800" />
                  <div className="mt-2 h-3 w-full rounded bg-slate-800" />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
              <p className="text-2xl font-bold">Henüz bildirim yok</p>
              <p className="mt-2 text-slate-400">Yeni talepler ve mesajlar burada görünür.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id}
                  className={`rounded-2xl border p-5 transition ${
                    n.is_read
                      ? "border-slate-800 bg-slate-900"
                      : "border-blue-500/30 bg-blue-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{n.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{n.message}</p>
                      {n.item_id && (
                        <Link href={`/items/${n.item_id}`}
                          className="mt-3 inline-flex items-center text-sm text-blue-400 hover:text-blue-300">
                          İlanı görüntüle →
                        </Link>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{formatDate(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}