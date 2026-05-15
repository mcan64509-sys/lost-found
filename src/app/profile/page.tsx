"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import AppHeader from "../../components/AppHeader";
import PushNotificationButton from "../../components/PushNotificationButton";
import { normalizeEmail } from "../../lib/utils";

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

type ActiveTab = "items" | "incoming" | "outgoing" | "favorites" | "email_prefs" | "account";

type EmailPrefs = {
  notify_claims: boolean;
  notify_messages: boolean;
  notify_matches: boolean;
  notify_digest: boolean;
};

type FavoriteItem = {
  id: string;
  title: string;
  type: "lost" | "found";
  category: string | null;
  location: string | null;
  image_url: string | null;
  status: string | null;
};

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
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs>({
    notify_claims: true,
    notify_messages: true,
    notify_matches: true,
    notify_digest: false,
  });
  const [emailPrefsLoading, setEmailPrefsLoading] = useState(false);
  const [savingEmailPrefs, setSavingEmailPrefs] = useState(false);

  // Privacy mode
  const [privacyMode, setPrivacyMode] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Phone & referral
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<{ referred_email: string; created_at: string }[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);

  // Gamification
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState<string[]>([]);

  // API key
  const [apiKey, setApiKey] = useState("");
  const [generatingApiKey, setGeneratingApiKey] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // 2FA
  const [mfaFactors, setMfaFactors] = useState<{ id: string; factor_type: string; status: string }[]>([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaUnenrolling, setMfaUnenrolling] = useState(false);

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
    } catch {
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

      }

      if (itemsError) {
        setMyItems([]);
      } else {
        setMyItems((itemsData ?? []) as MyItem[]);
      }

      const avatarUrl = profileRow?.avatar_url ?? null;
      const fullName =
        profileRow?.full_name ?? sessionUser.user_metadata?.full_name ?? "";

      // Load privacy mode from profile
      setPrivacyMode(profileRow?.privacy_mode ?? false);
      setPhoneNumber(profileRow?.phone_number ?? "");
      setSmsEnabled(profileRow?.sms_notifications ?? false);
      setReferralCode(profileRow?.referral_code ?? "");
      setUserPoints(profileRow?.points ?? 0);
      setUserBadges(profileRow?.badges ?? []);
      setApiKey(profileRow?.api_key ?? "");

      // Load MFA factors
      supabase.auth.mfa.listFactors().then(({ data }) => {
        setMfaFactors((data?.all ?? []).map((f) => ({ id: f.id, factor_type: f.factor_type, status: f.status })));
      });

      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        fullName,
        phone: sessionUser.phone || "",
        emailConfirmed: !!sessionUser.email_confirmed_at,
        avatarUrl,
      });

      loadClaims(sessionUser.id, currentEmail);
    } catch {
      setUser(null);
      setMyItems([]);
    } finally {
      setLoading(false);
    }
  }, [loadClaims]);

  async function loadFavorites(email: string) {
    setFavoritesLoading(true);
    try {
      const res = await fetch(
        `/api/favorites?userEmail=${encodeURIComponent(email)}&withItems=true`
      );
      if (!res.ok) {
        setFavoriteItems([]);
        return;
      }
      const data = await res.json();
      setFavoriteItems((data.items ?? []) as FavoriteItem[]);
    } catch {
    } finally {
      setFavoritesLoading(false);
    }
  }

  async function loadEmailPrefs() {
    setEmailPrefsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/email-preferences`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmailPrefs({
          notify_claims: data.notify_claims ?? true,
          notify_messages: data.notify_messages ?? true,
          notify_matches: data.notify_matches ?? true,
          notify_digest: data.notify_digest ?? false,
        });
      }
    } catch {
    } finally {
      setEmailPrefsLoading(false);
    }
  }

  async function saveEmailPrefs() {
    if (!user?.email) return;
    setSavingEmailPrefs(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/email-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify(emailPrefs),
      });
      if (res.ok) {
        toast.success("Email tercihlerın kaydedildi.");
      } else {
        toast.error("Kaydedilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSavingEmailPrefs(false);
    }
  }

  async function handleApproveClaim(claim: Claim) {
    if (!user) return;
    try {
      setProcessingClaim(claim.id);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/claims/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ claimId: claim.id }),
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/claims/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ claimId: claim.id }),
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

  async function handleSaveProfile() {
    if (!user) return;
    try {
      setSavingProfile(true);
      const trimmedName = editName.trim();

      await Promise.all([
        supabase.from("profiles").update({ full_name: trimmedName }).eq("id", user.id),
        supabase.auth.updateUser({ data: { full_name: trimmedName } }),
      ]);

      setUser((prev) => prev ? { ...prev, fullName: trimmedName } : prev);
      setEditingProfile(false);
      toast.success("Profil güncellendi.");
    } catch {
      toast.error("Profil güncellenirken bir hata oluştu.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePrivacyMode(newValue: boolean) {
    if (!user) return;
    setSavingPrivacy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ privacy_mode: newValue })
        .eq("id", user.id);
      if (error) {
        toast.error("Kaydedilemedi: " + error.message);
        return;
      }
      setPrivacyMode(newValue);
      toast.success(newValue ? "Gizlilik modu etkinleştirildi." : "Gizlilik modu devre dışı bırakıldı.");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleSavePhone() {
    if (!user) return;
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: phoneNumber.trim() || null, sms_notifications: smsEnabled })
        .eq("id", user.id);
      if (error) { toast.error("Kaydedilemedi: " + error.message); return; }
      toast.success("Telefon bilgileri kaydedildi.");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSavingPhone(false);
    }
  }

  async function handleGenerateReferralCode() {
    if (!user) return;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("profiles").update({ referral_code: code }).eq("id", user.id);
    if (!error) { setReferralCode(code); toast.success("Referans kodunuz oluşturuldu!"); }
  }

  async function loadReferrals(email: string) {
    setReferralsLoading(true);
    const { data } = await supabase
      .from("referrals")
      .select("referred_email, created_at")
      .eq("referrer_email", email)
      .order("created_at", { ascending: false });
    setReferrals((data || []) as { referred_email: string; created_at: string }[]);
    setReferralsLoading(false);
  }

  async function handleGenerateApiKey() {
    if (!user) return;
    setGeneratingApiKey(true);
    try {
      const newKey = `bvm_${crypto.randomUUID().replace(/-/g, "")}`;
      const { error } = await supabase.from("profiles").update({ api_key: newKey }).eq("id", user.id);
      if (error) { toast.error("API anahtarı oluşturulamadı."); return; }
      setApiKey(newKey);
      setApiKeyVisible(true);
      toast.success("Yeni API anahtarı oluşturuldu!");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setGeneratingApiKey(false);
    }
  }

  async function handleMfaEnroll() {
    setMfaEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "BulanVarMı" });
      if (error || !data) { toast.error(error?.message || "2FA başlatılamadı."); return; }
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaFactorId(data.id);
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setMfaEnrolling(false);
    }
  }

  async function handleMfaVerify() {
    if (!mfaFactorId || !mfaCode) return;
    setMfaVerifying(true);
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeErr || !challengeData) { toast.error("Doğrulama başlatılamadı."); return; }
      const { error } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challengeData.id, code: mfaCode });
      if (error) { toast.error("Kod hatalı, tekrar deneyin."); return; }
      toast.success("2FA etkinleştirildi!");
      setMfaQrCode(null); setMfaSecret(null); setMfaCode("");
      const { data } = await supabase.auth.mfa.listFactors();
      setMfaFactors((data?.all ?? []).map((f) => ({ id: f.id, factor_type: f.factor_type, status: f.status })));
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setMfaVerifying(false);
    }
  }

  async function handleMfaUnenroll(factorId: string) {
    if (!confirm("2FA'yı kaldırmak istediğine emin misin?")) return;
    setMfaUnenrolling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) { toast.error(error.message); return; }
      setMfaFactors((prev) => prev.filter((f) => f.id !== factorId));
      toast.success("2FA kaldırıldı.");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setMfaUnenrolling(false);
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
                    <Image
                      src={user.avatarUrl}
                      alt="Profil resmi"
                      width={96}
                      height={96}
                      className="h-28 w-28 object-cover object-center"
                      unoptimized
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
                  onClick={() => { setEditName(user.fullName || ""); setEditingProfile(true); }}
                  className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
                >
                  Profili Düzenle
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-red-500 px-5 py-3 font-medium text-white transition hover:bg-red-600"
                >
                  Çıkış Yap
                </button>
              </div>

              {/* Profil düzenleme modalı */}
              {editingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-4">Profili Düzenle</h2>
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">Ad Soyad</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none"
                      />
                    </div>
                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="flex-1 rounded-xl bg-blue-500 px-4 py-2.5 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                      >
                        {savingProfile ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 font-medium text-white hover:bg-slate-700"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
            <button
              onClick={() => {
                setActiveTab("favorites");
                if (user?.email && favoriteItems.length === 0 && !favoritesLoading) {
                  loadFavorites(user.email);
                }
              }}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "favorites" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Favorilerim
            </button>
            <button
              onClick={() => setActiveTab("email_prefs")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "email_prefs" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Bildirimler
            </button>
            <button
              onClick={() => {
                setActiveTab("account");
                if (user?.email && referrals.length === 0 && !referralsLoading) {
                  loadReferrals(user.email);
                }
              }}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "account" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Hesap
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
                      ? "border-amber-500/40 bg-amber-500/20 text-amber-200"
                      : "border-emerald-500/40 bg-emerald-500/20 text-emerald-200";
                    return (
                      <Link key={item.id} href={`/items/${item.id}`}
                        className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl hover:shadow-black/20">
                        <div className="relative h-56 overflow-hidden">
                          <Image src={imageSrc} alt={item.title} className="object-cover transition duration-300 group-hover:scale-[1.03]" fill unoptimized />
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
                      pending: "border-yellow-500/40 bg-yellow-500/20 text-yellow-200",
                      approved: "border-green-500/40 bg-green-500/20 text-green-200",
                      rejected: "border-red-500/40 bg-red-500/20 text-red-200",
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

                        <div className="mt-4 grid gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm sm:grid-cols-2">
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

          {/* Favorilerim tab */}
          {activeTab === "favorites" && (
            <section className="mt-6">
              {favoritesLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                      <div className="h-40 animate-pulse bg-slate-800" />
                      <div className="space-y-2 p-4">
                        <div className="h-3 w-16 animate-pulse rounded-full bg-slate-800" />
                        <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-800" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : favoriteItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-800 p-10 text-center">
                  <p className="text-slate-400">Henüz favori ilanın yok.</p>
                  <p className="mt-2 text-sm text-slate-600">İlan detayında ★ Favori butonuna tıklayarak ekleyebilirsin.</p>
                  <Link href="/search" className="mt-5 inline-block rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                    İlanlara Göz At
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteItems.map((item) => {
                    const isLost = item.type === "lost";
                    const imageSrc = item.image_url || "https://placehold.co/800x600/0f172a/ffffff?text=Gorsel";
                    return (
                      <Link key={item.id} href={`/items/${item.id}`}
                        className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:border-slate-700">
                        <div className="relative h-40 overflow-hidden">
                          <Image src={imageSrc} alt={item.title} className="object-cover transition duration-300 group-hover:scale-105" fill unoptimized />
                        </div>
                        <div className="p-4">
                          <div className="mb-1 flex items-center gap-2">
                            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${isLost ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                              {isLost ? "Kayıp" : "Bulundu"}
                            </span>
                            {item.status === "resolved" && (
                              <span className="rounded-md bg-green-500/20 px-1.5 py-0.5 text-[11px] font-semibold text-green-300">Çözüldü</span>
                            )}
                          </div>
                          <h3 className="line-clamp-1 font-semibold text-white">{item.title}</h3>
                          {item.location && <p className="mt-0.5 text-xs text-slate-500">{item.location}</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Bildirim Tercihleri tab */}
          {activeTab === "email_prefs" && (
            <section className="mt-6 max-w-lg">
              {/* Gizlilik Modu */}
              <div className="mb-6 p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
                <h3 className="text-sm font-bold text-white mb-1">🔒 Gizlilik Modu</h3>
                <p className="text-xs text-slate-500 mb-4">Etkinleştirildiğinde, profilinizde kişisel bilgileriniz gizlenir.</p>
                <button
                  onClick={() => handleSavePrivacyMode(!privacyMode)}
                  disabled={savingPrivacy}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                    privacyMode
                      ? "border-purple-500/30 bg-purple-500/10"
                      : "border-slate-700 bg-slate-900 hover:border-slate-600"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {privacyMode ? "🔒 Gizlilik Modu Aktif" : "🔓 Gizlilik Modu Kapalı"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {privacyMode ? "E-posta adresiniz diğer kullanıcılardan gizleniyor." : "Profil bilgileriniz görünür."}
                    </p>
                  </div>
                  <div className={`ml-4 h-6 w-11 shrink-0 rounded-full transition-colors ${privacyMode ? "bg-purple-600" : "bg-slate-700"}`}>
                    <div className={`mt-0.5 ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${privacyMode ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </button>
                {savingPrivacy && <p className="mt-2 text-xs text-slate-500">Kaydediliyor...</p>}
              </div>

              <div className="mb-6 p-4 rounded-2xl border border-slate-800 bg-slate-900/60">
                <h3 className="text-sm font-bold text-white mb-2">🔔 Anlık Bildirimler (Push)</h3>
                <p className="text-xs text-slate-500 mb-3">Tarayıcı bildirimleri ile yeni eşleşmeler, mesajlar ve talep güncellemelerinden anında haberdar ol.</p>
                <PushNotificationButton />
              </div>
              <p className="mb-6 text-slate-400">Hangi durumlarda email bildirimi almak istediğini seç.</p>
              {emailPrefsLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-800" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {([
                    { key: "notify_claims", label: "Sahiplik Talepleri", desc: "Birileri ilanına talep gönderdiğinde" },
                    { key: "notify_messages", label: "Mesajlar", desc: "Yeni mesaj aldığında" },
                    { key: "notify_matches", label: "AI Eşleşmeler", desc: "İlanına benzer bir ilan eklendiğinde" },
                    { key: "notify_digest", label: "Haftalık Özet", desc: "Her hafta özet email al" },
                  ] as const).map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => setEmailPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                        emailPrefs[key]
                          ? "border-blue-500/30 bg-blue-500/10"
                          : "border-slate-700 bg-slate-900 hover:border-slate-600"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                      <div className={`ml-4 h-6 w-11 shrink-0 rounded-full transition-colors ${emailPrefs[key] ? "bg-blue-600" : "bg-slate-700"}`}>
                        <div className={`mt-0.5 ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${emailPrefs[key] ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={async () => {
                      if (!user?.email) return;
                      setSavingEmailPrefs(true);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch("/api/email-preferences", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session?.access_token ?? ""}`,
                          },
                          body: JSON.stringify(emailPrefs),
                        });
                        if (res.ok) { toast.success("Bildirim tercihleri kaydedildi."); }
                        else { toast.error("Kaydedilemedi."); }
                      } catch { toast.error("Bir hata oluştu."); }
                      finally { setSavingEmailPrefs(false); }
                    }}
                    disabled={savingEmailPrefs}
                    className="mt-2 w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingEmailPrefs ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Hesap tab */}
          {activeTab === "account" && (
            <section className="mt-6 max-w-lg space-y-6">
              {/* Telefon Numarası */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-bold text-white mb-1">📱 Telefon Numarası</h3>
                <p className="text-xs text-slate-500 mb-4">SMS bildirimleri için telefon numaranızı ekleyin.</p>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition mb-3"
                />
                <button
                  onClick={() => setSmsEnabled((v) => !v)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition mb-3 ${
                    smsEnabled ? "border-blue-500/30 bg-blue-500/10" : "border-slate-700 bg-slate-900 hover:border-slate-600"
                  }`}
                >
                  <span className="text-sm text-white">SMS Bildirimleri</span>
                  <div className={`h-6 w-11 shrink-0 rounded-full transition-colors ${smsEnabled ? "bg-blue-600" : "bg-slate-700"}`}>
                    <div className={`mt-0.5 ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${smsEnabled ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </button>
                <button
                  onClick={handleSavePhone}
                  disabled={savingPhone}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {savingPhone ? "Kaydediliyor..." : "Kaydet"}
                </button>
                {smsEnabled && (
                  <p className="mt-2 text-xs text-amber-400">⚠️ SMS bildirimleri yakında aktif edilecek.</p>
                )}
              </div>

              {/* Referral Code */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-bold text-white mb-1">🎁 Referans Programı</h3>
                <p className="text-xs text-slate-500 mb-4">Arkadaşlarınızı davet edin ve her kayıt için avantaj kazanın.</p>
                {referralCode ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                      <span className="flex-1 font-mono text-lg font-bold text-emerald-400 tracking-widest">{referralCode}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://bulanvarmi.vercel.app/auth/register?ref=${referralCode}`);
                          toast.success("Link kopyalandı!");
                        }}
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition"
                      >
                        Kopyala
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Paylaş: <span className="text-slate-400 font-mono">bulanvarmi.vercel.app/auth/register?ref={referralCode}</span>
                    </p>
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-400 mb-2">Davet Edilenler ({referrals.length})</p>
                      {referralsLoading ? (
                        <p className="text-xs text-slate-600">Yükleniyor...</p>
                      ) : referrals.length === 0 ? (
                        <p className="text-xs text-slate-600">Henüz davet edilen yok.</p>
                      ) : (
                        <div className="space-y-1">
                          {referrals.map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">{r.referred_email.replace(/(.{2}).*@/, "$1***@")}</span>
                              <span className="text-slate-600">{new Date(r.created_at).toLocaleDateString("tr-TR")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateReferralCode}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Referans Kodu Oluştur
                  </button>
                )}
              </div>

              {/* Puanlar & Rozetler */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-bold text-white mb-1">🏆 Puanlar & Rozetler</h3>
                <p className="text-xs text-slate-500 mb-4">İlan oluşturarak, çözerek ve topluma katkıda bulunarak puan kazan.</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                    <p className="text-2xl font-black text-amber-400">{userPoints}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Toplam Puan</p>
                  </div>
                  <div className="flex-1 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-center">
                    <p className="text-2xl font-black text-blue-400">{userBadges.length}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Rozet</p>
                  </div>
                </div>
                {userBadges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {userBadges.map((badge) => (
                      <span key={badge} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 space-y-1 text-xs text-slate-600">
                  <p>• İlan oluşturma: +10 puan</p>
                  <p>• İlanı çözüldü işaretleme: +50 puan</p>
                  <p>• "Gördüm" bildirimi: +5 puan</p>
                  <p>• Talep onaylatma: +20 puan</p>
                </div>
              </div>

              {/* 2FA */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-bold text-white mb-1">🔐 İki Faktörlü Doğrulama (2FA)</h3>
                <p className="text-xs text-slate-500 mb-4">Hesabınızı TOTP uygulamasıyla (Google Authenticator vb.) koruyun.</p>
                {mfaFactors.filter((f) => f.status === "verified").length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                      <span className="text-emerald-400 text-sm">✓ 2FA Aktif</span>
                    </div>
                    {mfaFactors.filter((f) => f.status === "verified").map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleMfaUnenroll(f.id)}
                        disabled={mfaUnenrolling}
                        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        {mfaUnenrolling ? "Kaldırılıyor..." : "2FA'yı Kaldır"}
                      </button>
                    ))}
                  </div>
                ) : mfaQrCode ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">Authenticator uygulamanızla QR kodu okutun:</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mfaQrCode} alt="2FA QR Code" className="mx-auto rounded-xl border border-slate-700 bg-white p-2 w-40 h-40" />
                    {mfaSecret && (
                      <p className="text-center font-mono text-xs text-slate-500 break-all">
                        Manuel: {mfaSecret}
                      </p>
                    )}
                    <input
                      type="text"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6 haneli kodu girin"
                      maxLength={6}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-lg font-mono text-white outline-none focus:border-blue-500 tracking-widest"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleMfaVerify}
                        disabled={mfaVerifying || mfaCode.length < 6}
                        className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {mfaVerifying ? "Doğrulanıyor..." : "Doğrula & Etkinleştir"}
                      </button>
                      <button
                        onClick={() => { setMfaQrCode(null); setMfaFactorId(null); setMfaCode(""); }}
                        className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-slate-800 transition"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleMfaEnroll}
                    disabled={mfaEnrolling}
                    className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {mfaEnrolling ? "Hazırlanıyor..." : "2FA Etkinleştir"}
                  </button>
                )}
              </div>

              {/* API Anahtarı */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-bold text-white mb-1">🔑 API Anahtarı</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Kendi sisteminizden ilan oluşturmak için API anahtarı kullanın.{" "}
                  <code className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">GET/POST /api/v1/items</code>
                </p>
                {apiKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                      <code className="flex-1 text-xs text-slate-300 font-mono truncate">
                        {apiKeyVisible ? apiKey : `${apiKey.slice(0, 8)}${"•".repeat(24)}`}
                      </code>
                      <button
                        onClick={() => setApiKeyVisible((v) => !v)}
                        className="text-xs text-slate-500 hover:text-slate-300 shrink-0"
                      >
                        {apiKeyVisible ? "Gizle" : "Göster"}
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("Kopyalandı!"); }}
                        className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
                      >
                        Kopyala
                      </button>
                    </div>
                    <button
                      onClick={handleGenerateApiKey}
                      disabled={generatingApiKey}
                      className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition"
                    >
                      {generatingApiKey ? "Oluşturuluyor..." : "Yeni Anahtar Oluştur (eskisi geçersiz olur)"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateApiKey}
                    disabled={generatingApiKey}
                    className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-semibold text-white hover:bg-slate-600 transition disabled:opacity-50"
                  >
                    {generatingApiKey ? "Oluşturuluyor..." : "API Anahtarı Oluştur"}
                  </button>
                )}
              </div>
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
                      pending: "border-yellow-500/40 bg-yellow-500/20 text-yellow-200",
                      approved: "border-green-500/40 bg-green-500/20 text-green-200",
                      rejected: "border-red-500/40 bg-red-500/20 text-red-200",
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

                        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Ayırt edici özellik</p>
                          <p className="mt-1 text-slate-300">{claim.distinctive_feature}</p>
                        </div>

                        {claim.status === "approved" && (
                          <div className="mt-3 rounded-xl border border-green-500/40 bg-green-500/20 p-3">
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

            <Image
              src={user.avatarUrl}
              alt="Profil resmi büyük önizleme"
              width={800}
              height={800}
              className="max-h-[85vh] max-w-[85vw] rounded-3xl object-contain shadow-2xl"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
}