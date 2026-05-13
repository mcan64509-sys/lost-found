"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "../../../components/AppHeader";
import ConfirmDialog from "../../../components/ConfirmDialog";
import QRCodeModal from "../../../components/QRCodeModal";
import SightingModal from "../../../components/SightingModal";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { normalizeEmail, isValidEmail } from "../../../lib/utils";

type DbItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  date: string | null;
  type: string | null;
  image_url: string | null;
  image: string | null;
  image_urls?: string[] | null;
  status: string | null;
  created_at: string | null;
  created_by_email?: string | null;
  embedding?: number[] | null;
  view_count?: number | null;
  reward_amount?: number | null;
  is_urgent?: boolean | null;
  is_featured?: boolean | null;
  priority_level?: number | null;
};

type MatchItem = {
  id: string;
  title: string;
  type: string;
  category: string;
  location: string;
  date: string;
  image_url: string;
  created_by_email: string;
  score: number;
  similarity: number;
};

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [item, setItem] = useState<DbItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [startingConv, setStartingConv] = useState<string | null>(null);
  const [closingItem, setClosingItem] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [showSightingModal, setShowSightingModal] = useState(false);

  // Rating
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        setNotFound(false);

        const [{ data: itemData, error: itemError }, { data: sessionData }] =
          await Promise.all([
            supabase.from("items").select("*").eq("id", id).single(),
            supabase.auth.getSession(),
          ]);

        if (itemError || !itemData) {
          setNotFound(true);
          setItem(null);
          return;
        }

        setItem(itemData as DbItem);
        const email = normalizeEmail(sessionData.session?.user?.email);
        setUserEmail(email);

        if (email) {
          fetch(`/api/favorites?userEmail=${encodeURIComponent(email)}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.itemIds && Array.isArray(d.itemIds)) {
                setIsFavorited(d.itemIds.includes(id));
              }
            })
            .catch(() => {});

          // Check if user already rated this item
          supabase
            .from("ratings")
            .select("id")
            .eq("item_id", id)
            .eq("rater_email", email)
            .maybeSingle()
            .then(({ data }) => { if (data) setAlreadyRated(true); });
        }

        // Load rating stats for this item's owner
        fetch(`/api/ratings/list?email=${encodeURIComponent(itemData.created_by_email || "")}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.avg != null) setRatingAvg(d.avg);
            if (d.count != null) setRatingCount(d.count);
          })
          .catch(() => {});

        fetch("/api/items/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: id }),
        }).catch(() => {});

        // Save to recently viewed (localStorage)
        try {
          const entry = {
            id: itemData.id,
            title: itemData.title,
            type: itemData.type,
            image_url: itemData.image_url,
            category: itemData.category,
            viewedAt: Date.now(),
          };
          const existing = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
          const filtered = existing.filter((e: { id: string }) => e.id !== entry.id);
          localStorage.setItem("recentlyViewed", JSON.stringify([entry, ...filtered].slice(0, 8)));
        } catch { /* localStorage unavailable */ }

        fetchMatches(id);
      } catch {
        setNotFound(true);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchItem();
  }, [id]);

  async function fetchMatches(itemId: string) {
    try {
      setMatchLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ itemId }),
      });

      const data = await res.json();
      if (data.matches) setMatches(data.matches);
    } catch {
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleStartConversation(match: MatchItem) {
    if (!userEmail) {
      router.push("/auth/login");
      return;
    }

    const senderEmail = normalizeEmail(userEmail);
    const receiverEmail = normalizeEmail(match.created_by_email);

    // Konuşma, eşleşen (karşı tarafın) ilanı üzerinden başlatılıyor
    const targetItemId = String(match.id || "").trim();
    const targetItemTitle = String(match.title || "").trim();
    const currentItemId = String(item?.id || "").trim();

    if (!isValidEmail(senderEmail)) {
      toast.error("Gönderen email bilgisi geçersiz.");
      return;
    }

    if (!isValidEmail(receiverEmail)) {
      toast.error("Karşı tarafın email bilgisi eksik veya geçersiz.");
      return;
    }

    if (senderEmail === receiverEmail) {
      toast.error("Kendinle konuşma başlatamazsın.");
      return;
    }

    if (!targetItemId || !targetItemTitle) {
      toast.error("Eşleşen ilan bilgisi eksik.");
      return;
    }

    try {
      setStartingConv(match.id);

      const payload = {
        senderEmail,
        receiverEmail,
        itemId: targetItemId,
        itemTitle: targetItemTitle,
        matchedItemId: currentItemId || null,
      };

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/messages/start-conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Konuşma başlatılamadı.");
        return;
      }

      if (data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
        return;
      }

      toast.error("Konuşma ID dönmedi.");
    } catch {
      toast.error("Konuşma başlatılamadı.");
    } finally {
      setStartingConv(null);
    }
  }

  const isOwner = useMemo(() => {
    if (!item || !userEmail) return false;
    return normalizeEmail(item.created_by_email) === normalizeEmail(userEmail);
  }, [item, userEmail]);

  async function handleCloseItem() {
    if (!item) return;
    try {
      setClosingItem(true);
      const { error } = await supabase
        .from("items")
        .update({ status: "resolved" })
        .eq("id", item.id)
        .eq("created_by_email", userEmail);

      if (error) {
        toast.error(`İlan kapatılamadı: ${error.message}`);
        return;
      }

      setItem((prev) => prev ? { ...prev, status: "resolved" } : prev);
      setOpenMenu(false);
      toast.success("İlan çözüldü olarak işaretlendi.");

      // Konuşmalara sistem mesajı gönder
      const systemContent = item.type === "lost"
        ? "✅ İlan sahibi eşyasını buldu. Bu ilan çözüme kavuştu."
        : "✅ Eşya sahibine ulaşıldı. Bu ilan çözüme kavuştu.";

      fetch("/api/messages/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, content: systemContent }),
      }).catch(() => {});
    } catch {
      toast.error("İlan kapatılırken bir hata oluştu.");
    } finally {
      setClosingItem(false);
    }
  }

  async function handleToggleFavorite() {
    if (!userEmail) {
      toast.error("Favorilere eklemek için giriş yapmalısın.");
      return;
    }
    try {
      setTogglingFav(true);
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, itemId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFavorited(data.favorited);
        toast.success(data.favorited ? "Favorilere eklendi." : "Favorilerden çıkarıldı.");
      } else {
        toast.error("Bir hata oluştu.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setTogglingFav(false);
    }
  }

  async function handleSubmitReport() {
    if (!userEmail) {
      toast.error("Şikayet göndermek için giriş yapmalısın.");
      return;
    }
    if (!reportReason) {
      toast.error("Lütfen bir sebep seçin.");
      return;
    }
    try {
      setSubmittingReport(true);
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: id, reporterEmail: userEmail, reason: reportReason, details: reportDetails }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Şikayetiniz alındı, incelenecek.");
        setShowReportModal(false);
        setReportReason("");
        setReportDetails("");
      } else {
        toast.error(data.error || "Şikayet gönderilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSubmittingReport(false);
    }
  }

  async function handleSubmitRating() {
    if (!userEmail || !item) return;
    if (ratingScore < 1) { toast.error("Lütfen bir puan seçin."); return; }
    try {
      setSubmittingRating(true);
      const res = await fetch("/api/ratings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          rater_email: userEmail,
          rated_email: item.created_by_email,
          score: ratingScore,
          comment: ratingComment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlreadyRated(true);
        setRatingCount((c) => c + 1);
        setRatingAvg((prev) =>
          prev != null ? (prev * ratingCount + ratingScore) / (ratingCount + 1) : ratingScore
        );
        toast.success("Değerlendirmeniz kaydedildi.");
      } else {
        toast.error(data.error || "Değerlendirme gönderilemedi.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSubmittingRating(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/items/${id}`;
    const shareData = { title: item?.title || "Lost & Found İlanı", text: item?.description || "", url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url).catch(() => {});
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  }

  async function handleDeleteItem() {
    if (!item) return;
    try {
      setDeleting(true);
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id)
        .eq("created_by_email", userEmail);

      if (error) {
        toast.error(`İlan silinemedi: ${error.message}`);
        return;
      }

      toast.success("İlan kaldırıldı.");
      router.push("/my-items");
    } catch (error) {
      toast.error("İlan silinirken bir hata oluştu.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-slate-400">İlan yükleniyor...</p>
          </div>
        </main>
      </>
    );
  }

  if (notFound || !item) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">← Ana Sayfa</Link>
            <h1 className="mt-4 text-3xl font-black">İlan bulunamadı</h1>
            <p className="mt-3 text-slate-400">Bu ilan silinmiş olabilir ya da henüz yüklenmemiş olabilir.</p>
          </div>
        </main>
      </>
    );
  }

  const allImages = item ? [item.image_url, ...(item.image_urls || [])].filter(Boolean) as string[] : [];
  const imageSrc = allImages[activeImageIndex] || allImages[0] || "https://placehold.co/1200x900/0f172a/ffffff?text=Gorsel";
  const itemTypeText = item.type === "lost" ? "Kayıp İlanı" : item.type === "found" ? "Bulundu İlanı" : "İlan";
  const typeClasses =
    item.type === "lost"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

  return (
    <>
      <AppHeader />

      {showSightingModal && item && userEmail && (
        <SightingModal
          itemId={item.id}
          itemTitle={item.title}
          reporterEmail={userEmail}
          onClose={() => setShowSightingModal(false)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmClose}
        message={item.type === "lost" ? "Eşyan bulundu mu?" : "Sahibine ulaşıldı mı?"}
        description="İlan çözüldü olarak işaretlenecek ve yeni talepler alınamayacak."
        confirmLabel={item.type === "lost" ? "Evet, bulundu" : "Evet, ulaşıldı"}
        onConfirm={() => { setConfirmClose(false); handleCloseItem(); }}
        onCancel={() => setConfirmClose(false)}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        message="İlanı kaldırmak istediğine emin misin?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Evet, kaldır"
        danger
        onConfirm={() => { setConfirmDelete(false); handleDeleteItem(); }}
        onCancel={() => setConfirmDelete(false)}
      />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              Ana Sayfa
            </Link>
            <Link href="/search" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              Aramaya Dön
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
              {isOwner && (
                <div className="absolute left-4 top-4 z-20">
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu((prev) => !prev)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-xl text-white backdrop-blur transition hover:bg-black/70"
                    >
                      •••
                    </button>
                    {openMenu && (
                      <div className="absolute left-0 top-12 w-52 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                        <button
                          onClick={() => router.push(`/items/${item.id}/edit`)}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-slate-800"
                        >
                          İlanı düzenle
                        </button>
                        {item.status !== "resolved" && (
                          <button
                            onClick={() => { setOpenMenu(false); setConfirmClose(true); }}
                            disabled={closingItem}
                            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-green-300 transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            {item.type === "lost" ? "Eşyam bulundu / Kapat" : "Sahibine ulaşıldı / Kapat"}
                          </button>
                        )}
                        <button
                          onClick={() => { setOpenMenu(false); setConfirmDelete(true); }}
                          disabled={deleting}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          İlanı kaldır
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="relative h-[320px] w-full md:h-[440px]">
                <Image src={imageSrc} alt={item.title} className="object-cover" fill unoptimized />
              </div>

              {allImages.length > 1 && (
                <div className="flex gap-2 p-3 border-t border-slate-800 bg-slate-900/80 overflow-x-auto">
                  {allImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        i === activeImageIndex ? "border-blue-500" : "border-slate-700 opacity-60 hover:opacity-80"
                      }`}
                    >
                      <Image src={url} alt={`Resim ${i+1}`} width={56} height={56} className="h-14 w-14 object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeClasses}`}>
                  {itemTypeText}
                </span>
                {item.category && (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {item.category}
                  </span>
                )}
                {item.is_featured && (
                  <span className="rounded-full border border-yellow-500/40 bg-yellow-500/15 px-3 py-1 text-xs font-bold text-yellow-400">
                    ⭐ Öne Çıkan
                  </span>
                )}
                {item.is_urgent && (
                  <span className="rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400">
                    🔴 Acil
                  </span>
                )}
                {item.status === "resolved" && (
                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                    Çözüldü
                  </span>
                )}
              </div>

              {item.reward_amount && item.reward_amount > 0 && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
                  <div className="text-2xl">💰</div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Ödül Teklifi</div>
                    <div className="text-xl font-black text-white mt-0.5">{item.reward_amount.toLocaleString("tr-TR")} TL</div>
                    <div className="text-xs text-emerald-300/70 mt-0.5">Eşyayı sahibine ulaştırana verilecek</div>
                  </div>
                </div>
              )}

              <h1 className="mt-5 text-3xl font-black md:text-4xl">{item.title}</h1>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Konum</p>
                  <p className="mt-2 text-sm text-slate-200">{item.location || "Konum belirtilmedi"}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tarih</p>
                  <p className="mt-2 text-sm text-slate-200">{item.date || "Tarih belirtilmedi"}</p>
                </div>
              </div>

              {(item.view_count ?? 0) > 0 && (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Görüntülenme</p>
                  <p className="mt-2 text-sm text-slate-200">👁 {item.view_count} kez görüntülendi</p>
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">Açıklama</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-300">
                  {item.description || "Bu ilan için açıklama bulunmuyor."}
                </p>
              </div>

              {!isOwner && item.type === "found" && item.status !== "resolved" && (
                <div className="mt-8">
                  <Link
                    href={`/items/${item.id}/claim`}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
                  >
                    Bu eşya benim olabilir
                  </Link>
                </div>
              )}

              {/* "Gördüm" butonu — sadece kayıp ilanlarında, sahip olmayan kullanıcılara */}
              {!isOwner && item.type === "lost" && item.status !== "resolved" && (
                <div className="mt-8">
                  {userEmail ? (
                    <button
                      onClick={() => setShowSightingModal(true)}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 font-bold text-slate-950 transition-all hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20"
                    >
                      <span className="relative flex items-center justify-center gap-2">
                        <span className="text-lg">👁</span>
                        Bu eşyayı / hayvanı gördüm!
                      </span>
                      <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-4 font-semibold text-amber-400 transition hover:bg-amber-500/20"
                    >
                      <span>👁</span>
                      Gördüm bildir — Giriş yap
                    </Link>
                  )}
                  <p className="mt-2 text-center text-xs text-slate-600">
                    Bu eşyayı veya hayvanı gördüysen haritada işaretle, ilan sahibine bildir.
                  </p>
                </div>
              )}
              {!isOwner && item.status === "resolved" && (
                <div className="mt-8 space-y-3">
                  <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                    <p className="text-sm text-green-200">Bu ilan çözüme kavuştu, artık talep gönderilemiyor.</p>
                  </div>

                  {/* Rating section */}
                  {userEmail && (
                    alreadyRated ? (
                      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-center">
                        <p className="text-sm text-slate-400">✓ Bu ilan için değerlendirmenizi yaptınız.</p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                        <p className="mb-3 text-sm font-semibold text-white">İlan sahibini değerlendir</p>
                        <div className="flex gap-1 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onMouseEnter={() => setRatingHover(star)}
                              onMouseLeave={() => setRatingHover(0)}
                              onClick={() => setRatingScore(star)}
                              className={`text-2xl transition ${
                                star <= (ratingHover || ratingScore) ? "text-amber-400" : "text-slate-600"
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          placeholder="Yorum ekle (isteğe bağlı)"
                          rows={2}
                          maxLength={300}
                          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 mb-3"
                        />
                        <button
                          onClick={handleSubmitRating}
                          disabled={submittingRating || ratingScore < 1}
                          className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
                        >
                          {submittingRating ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleToggleFavorite}
                  disabled={togglingFav}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                    isFavorited
                      ? "border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                      : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {isFavorited ? "★ Favoride" : "☆ Favori"}
                </button>
                <button
                  onClick={handleShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  {shareSuccess ? "✓ Kopyalandı!" : "↗ Paylaş"}
                </button>
                <button
                  onClick={() => setShowQR(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  ▦ QR Kod
                </button>
              </div>

              {/* İlan sahibi için Öne Çıkar butonu */}
              {isOwner && item.status !== "resolved" && (
                <div className="mt-3">
                  <a
                    href={`/upgrade?item=${id}`}
                    className="flex items-center justify-center gap-2 w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition"
                  >
                    ⭐ İlanı Öne Çıkar
                    {(item.priority_level ?? 0) > 0 && (
                      <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">
                        {item.priority_level === 3 ? "🥇 Altın" : item.priority_level === 2 ? "🥈 Gümüş" : "🥉 Bronz"} aktif
                      </span>
                    )}
                  </a>
                </div>
              )}

              {!isOwner && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="w-full rounded-2xl border border-slate-800 py-2 text-xs text-slate-600 transition hover:border-red-500/30 hover:text-red-400"
                  >
                    ⚑ Bu ilanı şikayet et
                  </button>
                </div>
              )}

              {/* Rating stats for this item's owner */}
              {ratingCount > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span className="text-amber-400 text-base">{"★".repeat(Math.round(ratingAvg ?? 0))}{"☆".repeat(5 - Math.round(ratingAvg ?? 0))}</span>
                  <span className="text-sm font-semibold text-white">{(ratingAvg ?? 0).toFixed(1)}</span>
                  <span className="text-xs text-slate-500">({ratingCount} değerlendirme)</span>
                  <Link href={`/users/${encodeURIComponent(item.created_by_email || "")}`} className="ml-auto text-xs text-blue-400 hover:text-blue-300">
                    Profile git →
                  </Link>
                </div>
              )}

              {isOwner && (
                <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-sm text-blue-200">
                    Bu ilan sana ait. Menüden düzenleme veya kaldırma işlemlerini yapabilirsin.
                  </p>
                </div>
              )}

              {/* QR Kod Modalı */}
              {showQR && item && (
                <QRCodeModal
                  url={`${window.location.origin}/items/${id}`}
                  title={item.title}
                  onClose={() => setShowQR(false)}
                />
              )}

              {/* Şikayet Modalı */}
              {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                    <h2 className="mb-1 text-lg font-bold text-white">İlanı Şikayet Et</h2>
                    <p className="mb-5 text-sm text-slate-500">Şikayet sebebini seçin ve gönderin.</p>

                    <div className="space-y-2">
                      {[
                        { value: "spam", label: "Spam / Reklam" },
                        { value: "yaniltici", label: "Yanıltıcı / Sahte bilgi" },
                        { value: "uygunsuz", label: "Uygunsuz içerik" },
                        { value: "duplicate", label: "Mükerrer ilan" },
                        { value: "diger", label: "Diğer" },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                            reportReason === opt.value
                              ? "border-blue-500 bg-blue-500/10 text-white"
                              : "border-slate-700 text-slate-400 hover:border-slate-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={opt.value}
                            checked={reportReason === opt.value}
                            onChange={() => setReportReason(opt.value)}
                            className="accent-blue-500"
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Ek açıklama (isteğe bağlı)"
                      rows={3}
                      maxLength={500}
                      className="mt-4 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
                    />

                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={handleSubmitReport}
                        disabled={submittingReport || !reportReason}
                        className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        {submittingReport ? "Gönderiliyor..." : "Şikayet Gönder"}
                      </button>
                      <button
                        onClick={() => { setShowReportModal(false); setReportReason(""); setReportDetails(""); }}
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Eşleşmeler Bölümü */}
          <div className="mt-12">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                {item.type === "lost" ? "Olası Buluntu Eşleşmeleri" : "Olası Kayıp Eşleşmeleri"}
              </h2>
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                AI Destekli
              </span>
            </div>

            {matchLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="h-40 rounded-xl bg-slate-800" />
                    <div className="mt-3 h-4 w-2/3 rounded bg-slate-800" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-slate-800" />
                  </div>
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-slate-400">Şu an için eşleşen ilan bulunamadı.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => {
                  // Eşleşen ilanın sahibi ben miyim?
                  const matchIsOwner =
                    normalizeEmail(match.created_by_email) === normalizeEmail(userEmail);

                  return (
                    <div
                      key={match.id}
                      className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:border-blue-500/50"
                    >
                      <Link href={`/items/${match.id}`}>
                        {match.image_url && (
                          <div className="relative h-40 overflow-hidden">
                            <Image
                              src={match.image_url}
                              alt={match.title}
                              className="object-cover transition group-hover:scale-105"
                              fill
                              unoptimized
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                match.type === "lost"
                                  ? "bg-amber-500/10 text-amber-300"
                                  : "bg-emerald-500/10 text-emerald-300"
                              }`}
                            >
                              {match.type === "lost" ? "Kayıp" : "Bulundu"}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                match.score >= 0.85 ? "text-green-400" : "text-slate-400"
                              }`}
                            >
                              %{Math.round(match.score * 100)} uyum
                              {match.score >= 0.85 && " ✨"}
                            </span>
                          </div>
                          <h3 className="mt-2 font-semibold text-white">{match.title}</h3>
                          <p className="mt-1 text-xs text-slate-400">{match.category}</p>
                          {match.location && (
                            <p className="mt-1 text-xs text-slate-500">📍 {match.location}</p>
                          )}
                        </div>
                      </Link>

                      {match.score >= 0.85 && !matchIsOwner && (
                        <div className="border-t border-slate-700 p-3">
                          {userEmail ? (
                            <button
                              onClick={() => handleStartConversation(match)}
                              disabled={startingConv === match.id}
                              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                              {startingConv === match.id ? "Başlatılıyor..." : "💬 Mesaj Gönder"}
                            </button>
                          ) : (
                            <Link
                              href="/auth/login"
                              className="block w-full rounded-xl border border-blue-500/40 px-4 py-2 text-center text-sm font-semibold text-blue-400 transition hover:bg-blue-500/10"
                            >
                              Giriş yap ve iletişime geç →
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Kendi ilanın eşleşmelerde çıkıyorsa bilgi ver */}
                      {matchIsOwner && (
                        <div className="border-t border-slate-700 p-3">
                          <p className="text-center text-xs text-slate-500">Bu ilan sana ait</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}