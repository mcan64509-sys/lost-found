"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "../../../components/AppHeader";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type PublicItem = {
  id: string;
  title: string;
  type: "lost" | "found";
  category: string | null;
  location: string | null;
  image_url: string | null;
  status: string | null;
  created_at: string;
};

type Rating = {
  id: string;
  rater_email: string;
  score: number;
  comment: string | null;
  created_at: string;
};

function StarRow({ score, size = "base" }: { score: number; size?: "sm" | "base" | "lg" }) {
  const sz = size === "lg" ? "text-xl" : size === "sm" ? "text-xs" : "text-sm";
  return (
    <span className={sz}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= score ? "text-amber-400" : "text-slate-600"}>★</span>
      ))}
    </span>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const emailParam = decodeURIComponent(params.email as string);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"items" | "ratings">("items");
  const [viewerEmail, setViewerEmail] = useState("");
  const [isBanned, setIsBanned] = useState(false);
  const [togglingBan, setTogglingBan] = useState(false);
  const [showProfileReport, setShowProfileReport] = useState(false);
  const [profileReportReason, setProfileReportReason] = useState("");
  const [profileReportDetails, setProfileReportDetails] = useState("");
  const [submittingProfileReport, setSubmittingProfileReport] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const vEmail = session?.user?.email?.toLowerCase().trim() || "";
        setViewerEmail(vEmail);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, created_at, is_banned")
          .eq("email", emailParam)
          .maybeSingle();

        if (!profileData) {
          const { data: anyItem } = await supabase
            .from("items")
            .select("id")
            .eq("created_by_email", emailParam)
            .limit(1)
            .maybeSingle();

          if (!anyItem) { setNotFound(true); return; }
          setProfile({ full_name: null, avatar_url: null, created_at: new Date().toISOString() });
          setIsBanned(false);
        } else {
          setProfile(profileData);
          setIsBanned(!!(profileData as { is_banned?: boolean }).is_banned);
        }

        const { data: itemsData } = await supabase
          .from("items")
          .select("id, title, type, category, location, image_url, status, created_at")
          .eq("created_by_email", emailParam)
          .neq("status", "expired")
          .order("created_at", { ascending: false })
          .limit(48);

        setItems((itemsData ?? []) as PublicItem[]);

        const ratingsRes = await fetch(`/api/ratings/list?email=${encodeURIComponent(emailParam)}`);
        if (ratingsRes.ok) {
          const ratingsData = await ratingsRes.json();
          setRatings(ratingsData.ratings ?? []);
          setRatingAvg(ratingsData.avg ?? null);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [emailParam]);

  const isAdmin = ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(viewerEmail);
  const isOwnProfile = viewerEmail === emailParam.toLowerCase();

  async function handleToggleBan() {
    setTogglingBan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ targetEmail: emailParam, ban: !isBanned }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsBanned(!isBanned);
        toast.success(!isBanned ? "Kullanıcı engellendi." : "Engel kaldırıldı.");
      } else {
        toast.error(data.error || "İşlem başarısız.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setTogglingBan(false);
    }
  }

  async function handleProfileReport() {
    if (!profileReportReason) { toast.error("Şikayet sebebi seçin."); return; }
    setSubmittingProfileReport(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportedUserEmail: emailParam, reporterEmail: viewerEmail, reason: profileReportReason, details: profileReportDetails }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Şikayetiniz alındı.");
        setShowProfileReport(false);
        setProfileReportReason("");
        setProfileReportDetails("");
      } else {
        toast.error(data.error || "Gönderilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSubmittingProfileReport(false);
    }
  }

  const lostCount = items.filter((i) => i.type === "lost").length;
  const foundCount = items.filter((i) => i.type === "found").length;
  const resolvedCount = items.filter((i) => i.status === "resolved").length;
  const helpedCount = items.filter((i) => i.type === "found" && i.status === "resolved").length;

  const initials = profile?.full_name
    ? profile.full_name.trim().split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : emailParam[0].toUpperCase();

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
          <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-slate-800" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-48 rounded bg-slate-800" />
                <div className="h-4 w-32 rounded bg-slate-800" />
                <div className="flex gap-4 mt-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 w-14 rounded-xl bg-slate-800" />)}
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-52 rounded-2xl bg-slate-800" />)}
            </div>
          </div>
        </main>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <AppHeader />
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center">
            <p className="text-6xl font-black text-slate-700">404</p>
            <p className="mt-4 text-xl font-semibold">Kullanıcı bulunamadı</p>
            <Link href="/" className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
              Ana Sayfaya Dön
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl">

          {/* Profile Card */}
          <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name || emailParam}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-700"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-black text-white ring-2 ring-slate-700">
                    {initials}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-white">
                    {profile?.full_name || "İsimsiz Kullanıcı"}
                  </h1>
                  {isBanned && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">Engellendi</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  Üye: {new Date(profile!.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
                </p>

                {/* Rating summary */}
                {ratingAvg != null && (
                  <div className="mt-2 flex items-center gap-2">
                    <StarRow score={Math.round(ratingAvg)} size="base" />
                    <span className="font-bold text-white">{ratingAvg.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">({ratings.length} değerlendirme)</span>
                  </div>
                )}

                {/* Stats */}
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    { label: "Toplam", value: items.length, color: "text-white" },
                    { label: "Kayıp İlan", value: lostCount, color: "text-amber-400" },
                    { label: "Bulundu İlan", value: foundCount, color: "text-emerald-400" },
                    { label: "Çözüldü", value: resolvedCount, color: "text-green-400" },
                    ...(helpedCount > 0 ? [{ label: "Yardım Etti", value: helpedCount, color: "text-teal-400" }] : []),
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-center min-w-[60px]">
                      <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 items-end">
                {viewerEmail && !isOwnProfile && !isAdmin && (
                  <button
                    onClick={() => setShowProfileReport(true)}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:border-red-500/40 hover:text-red-400 transition"
                  >
                    ⚑ Şikayet Et
                  </button>
                )}
                {isAdmin && !isOwnProfile && (
                  <button
                    onClick={handleToggleBan}
                    disabled={togglingBan}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      isBanned
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {togglingBan ? "..." : isBanned ? "Engeli Kaldır" : "Engelle"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-1">
            <button
              onClick={() => setActiveTab("items")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                activeTab === "items" ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              📋 İlanlar ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("ratings")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                activeTab === "ratings" ? "bg-slate-700 text-white shadow" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              ★ Değerlendirmeler ({ratings.length})
            </button>
          </div>

          {/* Items Tab */}
          {activeTab === "items" && (
            <>
              {items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 p-12 text-center">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="font-semibold text-slate-300">Henüz ilan yok</p>
                  <p className="mt-1 text-sm text-slate-500">Bu kullanıcının aktif ilanı bulunmuyor.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const isLost = item.type === "lost";
                    const imageSrc = item.image_url || "https://placehold.co/600x400/0f172a/334155?text=+";
                    return (
                      <Link
                        key={item.id}
                        href={`/items/${item.id}`}
                        className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl hover:shadow-black/20"
                      >
                        {/* Image */}
                        <div className="relative h-44 overflow-hidden bg-slate-800">
                          <Image
                            src={imageSrc}
                            alt={item.title}
                            fill
                            className="object-cover transition duration-300 group-hover:scale-105"
                            unoptimized
                          />
                          {/* Type badge */}
                          <div className="absolute left-3 top-3">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                              isLost
                                ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                                : "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                            }`}>
                              {isLost ? "Kayıp" : "Bulundu"}
                            </span>
                          </div>
                          {/* Resolved badge */}
                          {item.status === "resolved" && (
                            <div className="absolute right-3 top-3">
                              <span className="rounded-full border border-green-500/30 bg-green-500/20 px-2.5 py-1 text-[11px] font-bold text-green-300">
                                ✓ Çözüldü
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Content */}
                        <div className="p-4">
                          {item.category && (
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.category}</p>
                          )}
                          <h3 className="line-clamp-1 font-bold text-white">{item.title}</h3>
                          {item.location && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                              <span>📍</span> {item.location}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-slate-600">
                            {new Date(item.created_at).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Ratings Tab */}
          {activeTab === "ratings" && (
            <>
              {ratings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 p-12 text-center">
                  <p className="text-4xl mb-3">⭐</p>
                  <p className="font-semibold text-slate-300">Henüz değerlendirme yok</p>
                  <p className="mt-1 text-sm text-slate-500">Bu kullanıcı henüz değerlendirilmemiş.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary bar */}
                  {ratingAvg != null && (
                    <div className="flex items-center gap-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 mb-5">
                      <div className="text-center">
                        <p className="text-4xl font-black text-amber-400">{ratingAvg.toFixed(1)}</p>
                        <StarRow score={Math.round(ratingAvg)} size="base" />
                      </div>
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = ratings.filter((r) => r.score === star).length;
                          const pct = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-2 text-right text-slate-400">{star}</span>
                              <span className="text-amber-400">★</span>
                              <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-4 text-right text-slate-500">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-white">{ratings.length}</p>
                        <p className="text-xs text-slate-500">değerlendirme</p>
                      </div>
                    </div>
                  )}

                  {ratings.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white flex-shrink-0">
                            {r.rater_email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-300">
                              {r.rater_email.split("@")[0]}
                            </p>
                            <StarRow score={r.score} size="sm" />
                          </div>
                        </div>
                        <span className="text-xs text-slate-600 flex-shrink-0">
                          {new Date(r.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="mt-3 text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                          "{r.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Profile Report Modal */}
      {showProfileReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Profili Şikayet Et</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Şikayet sebebi *</label>
                <select
                  value={profileReportReason}
                  onChange={(e) => setProfileReportReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="">Seçin...</option>
                  <option value="spam">Spam / Reklam</option>
                  <option value="yaniltici">Yanıltıcı Profil</option>
                  <option value="uygunsuz">Uygunsuz Davranış</option>
                  <option value="duplicate">Sahte / Kopya Hesap</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Detay (opsiyonel)</label>
                <textarea
                  value={profileReportDetails}
                  onChange={(e) => setProfileReportDetails(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Açıklayın..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowProfileReport(false)}
                  className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 transition"
                >
                  İptal
                </button>
                <button
                  onClick={handleProfileReport}
                  disabled={submittingProfileReport || !profileReportReason}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {submittingProfileReport ? "Gönderiliyor..." : "Şikayet Gönder"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Actions Panel */}
      {isAdmin && !isOwnProfile && (
        <div className="fixed bottom-4 right-4 z-40 rounded-2xl border border-blue-500/30 bg-blue-950/90 backdrop-blur-sm px-4 py-3 shadow-xl flex items-center gap-3">
          <span className="text-xs font-semibold text-blue-400">Admin</span>
          <Link
            href={`/messages?compose=${encodeURIComponent(emailParam)}`}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700 transition"
          >
            Mesaj Gönder
          </Link>
          <button
            onClick={handleToggleBan}
            disabled={togglingBan}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              isBanned
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {togglingBan ? "..." : isBanned ? "Engeli Kaldır" : "Engelle"}
          </button>
        </div>
      )}
    </>
  );
}
