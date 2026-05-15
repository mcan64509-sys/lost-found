"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "../../../components/AppHeader";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

type UserProfile = {
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_banned: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  totalItems: number;
  lostCount: number;
  foundCount: number;
  resolvedCount: number;
  helpedCount: number;
};

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "ratingAvg" | "totalItems" | "helpedCount">("created_at");
  const [togglingBan, setTogglingBan] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setUnauthorized(true); return; }

      const userEmail = session.user.email?.toLowerCase().trim() || "";
      if (!ADMIN_EMAILS.includes(userEmail)) { setUnauthorized(true); return; }

      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/profiles?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Yüklenemedi.");
        return;
      }
      setProfiles(data.profiles ?? []);
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  async function handleToggleBan(email: string, currentBanned: boolean) {
    setTogglingBan(email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ targetEmail: email, ban: !currentBanned }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => p.email === email ? { ...p, is_banned: !currentBanned } : p)
        );
        toast.success(!currentBanned ? "Kullanıcı engellendi." : "Engel kaldırıldı.");
      } else {
        toast.error(data.error || "İşlem başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setTogglingBan(null);
    }
  }

  const sorted = [...profiles].sort((a, b) => {
    if (sortBy === "ratingAvg") return (b.ratingAvg ?? -1) - (a.ratingAvg ?? -1);
    if (sortBy === "totalItems") return b.totalItems - a.totalItems;
    if (sortBy === "helpedCount") return b.helpedCount - a.helpedCount;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (unauthorized) {
    return (
      <>
        <AppHeader />
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <p className="text-6xl font-black text-slate-700">403</p>
            <p className="mt-4 text-xl font-semibold">Yetkisiz erişim</p>
            <Link href="/" className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
              Ana Sayfa
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href="/admin" className="text-sm text-slate-500 hover:text-white transition">
                  ← Admin
                </Link>
                <span className="text-slate-700">/</span>
              </div>
              <h1 className="text-3xl font-black">Kullanıcı Profilleri & Puanlar</h1>
              <p className="mt-1 text-slate-400">{profiles.length} kullanıcı</p>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="E-posta veya isim ara..."
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 w-64"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="created_at">En yeni</option>
                <option value="ratingAvg">En yüksek puan</option>
                <option value="totalItems">En çok ilan</option>
                <option value="helpedCount">En çok yardım</option>
              </select>
            </div>
          </div>

          {/* Summary stats */}
          {!loading && (
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Toplam Kullanıcı", value: profiles.length, color: "text-white" },
                { label: "Engellenen", value: profiles.filter((p) => p.is_banned).length, color: "text-red-400" },
                { label: "Değerlendirme Alan", value: profiles.filter((p) => p.ratingCount > 0).length, color: "text-amber-400" },
                { label: "Yardım Eden", value: profiles.filter((p) => p.helpedCount > 0).length, color: "text-emerald-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-800" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 p-12 text-center">
              <p className="text-slate-400">Kullanıcı bulunamadı.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((profile) => {
                const initials = profile.full_name
                  ? profile.full_name.trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                  : profile.email[0].toUpperCase();

                return (
                  <div
                    key={profile.email}
                    className={`rounded-2xl border bg-slate-900 p-4 transition ${
                      profile.is_banned
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name || profile.email}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-lg font-black text-white">
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white truncate">
                            {profile.full_name || "İsimsiz"}
                          </p>
                          {profile.is_banned && (
                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                              Engellendi
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{profile.email}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Üye: {new Date(profile.created_at).toLocaleDateString("tr-TR")}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-wrap gap-4 text-center">
                        <div>
                          <p className="text-base font-black text-white">{profile.totalItems}</p>
                          <p className="text-[10px] text-slate-500">İlan</p>
                        </div>
                        <div>
                          <p className="text-base font-black text-emerald-400">{profile.helpedCount}</p>
                          <p className="text-[10px] text-slate-500">Yardım</p>
                        </div>
                        <div>
                          <p className="text-base font-black text-green-400">{profile.resolvedCount}</p>
                          <p className="text-[10px] text-slate-500">Çözüldü</p>
                        </div>
                        <div>
                          {profile.ratingAvg != null ? (
                            <>
                              <p className="text-base font-black text-amber-400">
                                ★ {profile.ratingAvg.toFixed(1)}
                              </p>
                              <p className="text-[10px] text-slate-500">{profile.ratingCount} puan</p>
                            </>
                          ) : (
                            <>
                              <p className="text-base font-black text-slate-600">—</p>
                              <p className="text-[10px] text-slate-500">Puan yok</p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/users/${encodeURIComponent(profile.email)}`}
                          className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 transition"
                        >
                          Profil
                        </Link>
                        <button
                          onClick={() => handleToggleBan(profile.email, profile.is_banned)}
                          disabled={togglingBan === profile.email}
                          className={`rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
                            profile.is_banned
                              ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                              : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {togglingBan === profile.email ? "..." : profile.is_banned ? "Engeli Kaldır" : "Engelle"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
