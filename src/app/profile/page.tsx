"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import AppHeader from "../../components/AppHeader";

type UserProfile = {
  id: string;
  email?: string;
  fullName?: string;
  phone?: string;
  emailConfirmed?: boolean;
  avatarUrl?: string | null;
};

type MyItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  date: string | null;
  type: "lost" | "found";
  image_url: string | null;
  created_at: string;
};

type Claim = {
  id: string;
  item_id: string;
  claimer_user_id: string;
  claimer_email: string | null;
  claimant_name: string;
  owner_user_id: string | null;
  owner_email: string | null;
  lost_date: string | null;
  lost_location: string;
  brand_model: string | null;
  distinctive_feature: string;
  extra_note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  items?: {
    id: string;
    title: string;
    type: string;
    image_url: string | null;
    location: string | null;
  } | null;
};

function getInitials(name?: string, email?: string) {
  if (name?.trim()) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  if (email?.trim()) {
    return email.slice(0, 1).toUpperCase();
  }

  return "?";
}

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

type ActiveTab = "items" | "incoming" | "outgoing";

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [myItems, setMyItems] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("items");
  const [incomingClaims, setIncomingClaims] = useState<Claim[]>([]);
  const [outgoingClaims, setOutgoingClaims] = useState<Claim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [processingClaim, setProcessingClaim] = useState<string | null>(null);

  const initials = useMemo(
    () => getInitials(user?.fullName, user?.email),
    [user?.fullName, user?.email]
  );

  const loadClaims = useCallback(async (userId: string, userEmail: string) => {
    try {
      setClaimsLoading(true);
      const [incomingRes, outgoingRes] = await Promise.all([
        fetch(`/api/claims/incoming?userId=${encodeURIComponent(userId)}&userEmail=${encodeURIComponent(userEmail)}`),
        fetch(`/api/claims/outgoing?userId=${encodeURIComponent(userId)}`),
      ]);
      const [incomingData, outgoingData] = await Promise.all([
        incomingRes.json(),
        outgoingRes.json(),
      ]);
      setIncomingClaims(incomingData.claims ?? []);
      setOutgoingClaims(outgoingData.claims ?? []);
    } catch (error) {
      console.error("loadClaims error:", error);
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        setUser(null);
        setMyItems([]);
        return;
      }

      const sessionUser = sessionData.session?.user;

      if (!sessionUser) {
        setUser(null);
        setMyItems([]);
        return;
      }

      const currentEmail = normalizeEmail(sessionUser.email);

      const [{ data: profileRow, error: profileError }, { data: itemsData, error: itemsError }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", sessionUser.id).maybeSingle(),
          supabase
            .from("items")
            .select("*")
            .eq("created_by_email", currentEmail)
            .order("created_at", { ascending: false }),
        ]);

      if (profileError) {
        console.error("Profile fetch error:", profileError);
      }

      if (!profileRow) {
        const payload = {
          id: sessionUser.id,
          email: sessionUser.email ?? null,
          full_name: sessionUser.user_metadata?.full_name ?? null,
          avatar_url: null,
        };

        const { error: insertError } = await supabase
          .from("profiles")
          .upsert(payload);

        if (insertError) {
          console.error("Profile upsert error:", insertError);
        }
      }

      if (itemsError) {
        console.error("My items fetch error:", itemsError);
        setMyItems([]);
      } else {
        setMyItems((itemsData ?? []) as MyItem[]);
      }

      const avatarUrl = profileRow?.avatar_url ?? null;
      const fullName =
        profileRow?.full_name ?? sessionUser.user_metadata?.full_name ?? "";

      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        fullName,
        phone: sessionUser.phone || "",
        emailConfirmed: !!sessionUser.email_confirmed_at,
        avatarUrl,
      });

      loadClaims(sessionUser.id, currentEmail);
    } catch (error) {
      console.error("loadProfile error:", error);
      setUser(null);
      setMyItems([]);
    } finally {
      setLoading(false);
    }
  }, [loadClaims]);

  async function handleApproveClaim(claim: Claim) {
    if (!user) return;
    try {
      setProcessingClaim(claim.id);
      const res = await fetch("/api/claims/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          ownerUserId: user.id,
          ownerEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Talep onaylanamadı."); return; }
      toast.success("Talep onaylandı.");
      setIncomingClaims((prev) =>
        prev.map((c) => c.id === claim.id ? { ...c, status: "approved" } : c)
      );
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setProcessingClaim(null);
    }
  }

  async function handleRejectClaim(claim: Claim) {
    if (!user) return;
    try {
      setProcessingClaim(claim.id);
      const res = await fetch("/api/claims/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: claim.id,
          ownerUserId: user.id,
          ownerEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Talep reddedilemedi."); return; }
      toast.success("Talep reddedildi.");
      setIncomingClaims((prev) =>
        prev.map((c) => c.id === claim.id ? { ...c, status: "rejected" } : c)
      );
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setProcessingClaim(null);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!isAvatarPreviewOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAvatarPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isAvatarPreviewOpen]);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingAvatar(true);

      if (!file.type.startsWith("image/")) {
        toast.error("Lütfen bir görsel dosyası seç.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Dosya boyutu 5 MB'dan küçük olmalı.");
        return;
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        toast.error(`Profil resmi yüklenemedi: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: user.fullName ?? null,
        avatar_url: avatarUrl,
      });

      if (updateError) {
        console.error("Avatar profile update error:", updateError);
        toast.error(`Profil resmi kaydedilemedi: ${updateError.message}`);
        return;
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              avatarUrl,
            }
          : prev
      );

      toast.success("Profil resmi güncellendi.");
    } catch (error) {
      console.error("handleAvatarChange error:", error);

      if (error instanceof Error) {
        toast.error(`Profil resmi yüklenirken hata oluştu: ${error.message}`);
      } else {
        toast.error("Profil resmi yüklenirken bir hata oluştu.");
      }
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-slate-400">Profil yükleniyor...</p>
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              ← Ana Sayfa
            </Link>

            <h1 className="mt-4 text-3xl font-bold">Profil</h1>
            <p className="mt-3 text-slate-400">
              Bu sayfayı görmek için giriş yapmalısın.
            </p>

            <div className="mt-6 flex gap-3">
              <Link
                href="/auth/login"
                className="rounded-xl bg-blue-500 px-5 py-3 text-white hover:bg-blue-600"
              >
                Giriş Yap
              </Link>

              <Link
                href="/auth/register"
                className="rounded-xl border border-slate-700 px-5 py-3 text-white hover:bg-slate-800"
              >
                Kayıt Ol
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
            ← Ana Sayfa
          </Link>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => user.avatarUrl && setIsAvatarPreviewOpen(true)}
                  className={`relative overflow-hidden rounded-full ring-4 ring-slate-800 transition ${
                    user.avatarUrl
                      ? "cursor-zoom-in hover:scale-[1.03]"
                      : "cursor-default"
                  }`}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Profil resmi"
                      className="h-28 w-28 object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center bg-slate-800 text-3xl font-bold text-white">
                      {initials}
                    </div>
                  )}

                  {user.avatarUrl && (
                    <div className="absolute inset-0 bg-black/0 transition hover:bg-black/10" />
                  )}
                </button>

                <div>
                  <h1 className="text-3xl font-bold md:text-4xl">
                    {user.fullName || "Kullanıcı"}
                  </h1>
                  <p className="mt-1 text-lg text-slate-300">
                    {user.email || "E-posta yok"}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {user.emailConfirmed
                      ? "E-posta doğrulandı"
                      : "E-posta doğrulaması bekleniyor"}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 md:w-[280px]">
                <label className="cursor-pointer rounded-2xl bg-blue-600 px-5 py-3 text-center font-medium text-white transition hover:bg-blue-700">
                  {uploadingAvatar ? "Yükleniyor..." : "Profil resmi yükle"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>

                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600"
                >
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>

          {/* Tab navigasyonu */}
          <div className="mt-10 flex gap-1 rounded-2xl border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setActiveTab("items")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "items" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              İlanlarım
              {myItems.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-xs">{myItems.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("incoming")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "incoming" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Gelen Talepler
              {incomingClaims.filter((c) => c.status === "pending").length > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {incomingClaims.filter((c) => c.status === "pending").length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("outgoing")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "outgoing" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Gönderilen Talepler
              {outgoingClaims.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-xs">{outgoingClaims.length}</span>
              )}
            </button>
          </div>

          {/* İlanlarım tab */}
          {activeTab === "items" && (
            <section className="mt-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <p className="text-slate-400">Oluşturduğun ilanları buradan kontrol edebilirsin.</p>
                <Link href="/search" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
                  Aramaya Git
                </Link>
              </div>
              {myItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
                  <h3 className="text-2xl font-bold">Henüz ilanın yok</h3>
                  <p className="mt-3 text-slate-400">İlk ilanını oluşturduğunda burada görünecek.</p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {myItems.map((item) => {
                    const imageSrc = item.image_url || "https://placehold.co/1200x900/0f172a/ffffff?text=Gorsel";
                    const typeLabel = item.type === "lost" ? "Kayıp İlanı" : "Bulundu İlanı";
                    const typeClasses = item.type === "lost"
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
                    return (
                      <Link key={item.id} href={`/items/${item.id}`}
                        className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl hover:shadow-black/20">
                        <div className="relative h-56 overflow-hidden">
                          <img src={imageSrc} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                          <div className="absolute left-4 top-4">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeClasses}`}>{typeLabel}</span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs text-slate-500">{item.category || "Kategori yok"}</span>
                            {item.date && <span className="text-xs text-slate-500">{item.date}</span>}
                          </div>
                          <h3 className="line-clamp-1 text-xl font-bold text-white">{item.title}</h3>
                          <p className="mt-2 line-clamp-1 text-sm text-slate-400">{item.location || "Konum belirtilmedi"}</p>
                          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">{item.description || "Açıklama bulunmuyor."}</p>
                          <div className="mt-5 inline-flex items-center text-sm font-medium text-blue-400 transition group-hover:text-blue-300">
                            Detayı görüntüle →
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Gelen Talepler tab */}
          {activeTab === "incoming" && (
            <section className="mt-6">
              <p className="mb-6 text-slate-400">İlanlarına gelen sahiplik taleplerini buradan yönetebilirsin.</p>
              {claimsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="h-4 w-1/3 rounded bg-slate-800" />
                      <div className="mt-3 h-3 w-2/3 rounded bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : incomingClaims.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
                  <h3 className="text-xl font-bold">Henüz gelen talep yok</h3>
                  <p className="mt-3 text-slate-400">İlanlarına sahiplik talebi geldiğinde burada görünecek.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incomingClaims.map((claim) => {
                    const statusColors = {
                      pending: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
                      approved: "border-green-500/20 bg-green-500/10 text-green-300",
                      rejected: "border-red-500/20 bg-red-500/10 text-red-300",
                    };
                    const statusLabels = { pending: "Bekliyor", approved: "Onaylandı", rejected: "Reddedildi" };
                    return (
                      <div key={claim.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[claim.status]}`}>
                                {statusLabels[claim.status]}
                              </span>
                              {claim.items && (
                                <Link href={`/items/${claim.item_id}`} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                                  {claim.items.title}
                                </Link>
                              )}
                            </div>
                            <p className="mt-2 text-sm font-medium text-white">{claim.claimant_name}</p>
                            <p className="text-xs text-slate-400">{claim.claimer_email}</p>
                          </div>
                          <p className="text-xs text-slate-500">
                            {new Date(claim.created_at).toLocaleDateString("tr-TR")}
                          </p>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Kayıp konumu</p>
                            <p className="mt-1 text-slate-300">{claim.lost_location}</p>
                          </div>
                          {claim.lost_date && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Kayıp tarihi</p>
                              <p className="mt-1 text-slate-300">{claim.lost_date}</p>
                            </div>
                          )}
                          {claim.brand_model && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Marka / Model</p>
                              <p className="mt-1 text-slate-300">{claim.brand_model}</p>
                            </div>
                          )}
                          <div className="sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Ayırt edici özellik</p>
                            <p className="mt-1 text-slate-300">{claim.distinctive_feature}</p>
                          </div>
                          {claim.extra_note && (
                            <div className="sm:col-span-2">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Ek not</p>
                              <p className="mt-1 text-slate-300">{claim.extra_note}</p>
                            </div>
                          )}
                        </div>

                        {claim.status === "pending" && (
                          <div className="mt-4 flex gap-3">
                            <button
                              onClick={() => handleApproveClaim(claim)}
                              disabled={processingClaim === claim.id}
                              className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                            >
                              {processingClaim === claim.id ? "İşleniyor..." : "Onayla"}
                            </button>
                            <button
                              onClick={() => handleRejectClaim(claim)}
                              disabled={processingClaim === claim.id}
                              className="flex-1 rounded-xl bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-600/30 disabled:opacity-60"
                            >
                              {processingClaim === claim.id ? "İşleniyor..." : "Reddet"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Gönderilen Talepler tab */}
          {activeTab === "outgoing" && (
            <section className="mt-6">
              <p className="mb-6 text-slate-400">Başkalarının ilanlarına gönderdiğin sahiplik taleplerinin durumu.</p>
              {claimsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="h-4 w-1/3 rounded bg-slate-800" />
                      <div className="mt-3 h-3 w-2/3 rounded bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : outgoingClaims.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
                  <h3 className="text-xl font-bold">Henüz talep göndermedin</h3>
                  <p className="mt-3 text-slate-400">Bulundu ilanlarına sahiplik talebi gönderdiğinde burada görünecek.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {outgoingClaims.map((claim) => {
                    const statusColors = {
                      pending: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
                      approved: "border-green-500/20 bg-green-500/10 text-green-300",
                      rejected: "border-red-500/20 bg-red-500/10 text-red-300",
                    };
                    const statusLabels = { pending: "Değerlendiriliyor", approved: "Onaylandı", rejected: "Reddedildi" };
                    return (
                      <div key={claim.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[claim.status]}`}>
                                {statusLabels[claim.status]}
                              </span>
                              {claim.items && (
                                <Link href={`/items/${claim.item_id}`} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                                  {claim.items.title}
                                </Link>
                              )}
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                              Talep tarihi: {new Date(claim.created_at).toLocaleDateString("tr-TR")}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Ayırt edici özellik</p>
                          <p className="mt-1 text-slate-300">{claim.distinctive_feature}</p>
                        </div>

                        {claim.status === "approved" && (
                          <div className="mt-3 rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                            <p className="text-sm text-green-200">Talebiniz onaylandı! İlan sahibiyle iletişime geçebilirsiniz.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {isAvatarPreviewOpen && user.avatarUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
          onClick={() => setIsAvatarPreviewOpen(false)}
        >
          <div
            className="relative max-h-[85vh] max-w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAvatarPreviewOpen(false)}
              className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-black shadow-lg transition hover:scale-105"
            >
              ×
            </button>

            <img
              src={user.avatarUrl}
              alt="Profil resmi büyük önizleme"
              className="max-h-[85vh] max-w-[85vw] rounded-3xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}