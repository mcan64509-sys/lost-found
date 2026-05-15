"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "../../../components/AppHeader";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

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
        // Get current viewer
        const { data: { session } } = await supabase.auth.getSession();
        const vEmail = session?.user?.email?.toLowerCase().trim() || "";
        setViewerEmail(vEmail);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, created_at, is_banned")
          .eq("email", emailParam)
          .maybeSingle();

        if (!profileData) {
          setNotFound(true);
          return;
        }

        setProfile(profileData);
        setIsBanned(!!(profileData as { is_banned?: boolean }).is_banned);

        const { data: itemsData } = await supabase
          .from("items")
          .select("id, title, type, category, location, image_url, status, created_at")
          .eq("created_by_email", emailParam)
          .neq("status", "expired")
          .order("created_at", { ascending: false })
          .limit(24);

        setItems((itemsData ?? []) as PublicItem[]);

        // Load ratings
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
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
        body: JSON.stringify({
          reportedUserEmail: emailParam,
          reporterEmail: viewerEmail,
          reason: profileReportReason,
          details: profileReportDetails,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Şikayetiniz alındı, incelenecek.");
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
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-4xl animate-pulse space-y-6">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-slate-800" />
              <div className="space-y-2">
                <div className="h-6 w-48 rounded bg-slate-800" />
                <div className="h-4 w-32 rounded bg-slate-800" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-slate-800" />
              ))}
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
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          {/* Profile Card */}
          <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:flex-row sm:items-center">
            <div className="flex-shrink-0">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || emailParam}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-slate-700"
                  unoptimized
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-3xl font-black text-white ring-2 ring-slate-600">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile?.full_name || "İsimsiz Kullanıcı"}</h1>
              <p className="mt-1 text-sm text-slate-400">
                Üye: {new Date(profile!.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
              </p>
              <div className="mt-4 flex flex-wrap gap-6">
                <div className="text-center">
                  <p className="text-xl font-black text-white">{items.length}</p>
                  <p className="text-xs text-slate-500">Toplam</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-amber-400">{lostCount}</p>
                  <p className="text-xs text-slate-500">Kayıp</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-emerald-400">{foundCount}</p>
                  <p className="text-xs text-slate-500">Bulundu</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-black text-green-400">{resolvedCount}</p>
                  <p className="text-xs text-slate-500">Çözüldü</p>
                </div>
                {helpedCount > 0 && (
                  <div className="text-center">
                    <p className="text-xl font-black text-teal-400">{helpedCount}</p>
                    <p className="text-xs text-slate-500">Yardım Etti</p>
                  </div>
                )}
                {ratingAvg != null && (
                  <div className="text-center">
                    <p className="text-xl font-black text-amber-300 flex items-center gap-1">
                      ★ {ratingAvg.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-500">{ratings.length} yorum</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile report button — for non-admin logged-in users viewing others */}
          {viewerEmail && !isOwnProfile && !isAdmin && (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowProfileReport(true)}
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-500 hover:border-red-500/40 hover:text-red-400 transition"
              >
                ⚑ Profili Şikayet Et
              </button>
            </div>
          )}

          {/* Profile report modal */}
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
                      placeholder="Şikayetinizi açıklayın..."
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

          {/* Admin actions */}
          {isAdmin && !isOwnProfile && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-4">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Admin Eylemler</span>
              <div className="flex flex-wrap gap-2 ml-auto">
                <Link
                  href={`/messages?compose=${encodeURIComponent(emailParam)}`}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 transition"
                >
                  Mesaj Gönder
                </Link>
                <button
                  onClick={handleToggleBan}
                  disabled={togglingBan}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    isBanned
                      ? "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                      : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  {togglingBan ? "..." : isBanned ? "Engeli Kaldır" : "Kullanıcıyı Engelle"}
                </button>
              </div>
            </div>
          )}

          {/* Banned notice */}
          {isBanned && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3">
              <p className="text-sm text-red-300">Bu kullanıcı engellendi.</p>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-2 border-b border-slate-800 pb-0">
            <button
              onClick={() => setActiveTab("items")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px ${
                activeTab === "items"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              İlanlar ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("ratings")}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition -mb-px ${
                activeTab === "ratings"
                  ? "border-amber-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Değerlendirmeler ({ratings.length})
            </button>
          </div>

          {activeTab === "ratings" && (
            <div>
              {ratings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
                  <p className="text-slate-400">Henüz değerlendirme yok.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratings.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-amber-400 text-base">
                          {"★".repeat(r.score)}{"☆".repeat(5 - r.score)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-slate-300 leading-relaxed">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "items" && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
              <p className="text-slate-400">Bu kullanıcının aktif ilanı yok.</p>
            </div>
          )}
          {activeTab === "items" && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => {
                const isLost = item.type === "lost";
                const badgeClasses = isLost
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30";
                const imageSrc = item.image_url || "https://placehold.co/800x600/0f172a/ffffff?text=Gorsel";

                return (
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700 hover:bg-slate-800/60"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={imageSrc}
                        alt={item.title}
                        className="object-cover transition duration-300 group-hover:scale-105"
                        fill
                        unoptimized
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${badgeClasses}`}>
                          {isLost ? "Kayıp" : "Bulundu"}
                        </span>
                        {item.status === "resolved" && (
                          <span className="rounded-md bg-green-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-green-300 ring-1 ring-green-500/30">
                            Çözüldü
                          </span>
                        )}
                        {item.category && (
                          <span className="text-[11px] text-slate-600">{item.category}</span>
                        )}
                      </div>
                      <h3 className="line-clamp-1 text-sm font-semibold text-white">{item.title}</h3>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {item.location || "Konum belirtilmedi"}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 text-xs text-blue-500 transition group-hover:text-blue-400">
                      Detay →
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
