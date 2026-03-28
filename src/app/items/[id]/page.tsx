"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "../../../components/AppHeader";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

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
  status: string | null;
  created_at: string | null;
  created_by_email?: string | null;
  embedding?: number[] | null;
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

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function isValidEmail(value?: string | null) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
        setUserEmail(normalizeEmail(sessionData.session?.user?.email));

        fetchMatches(id);
      } catch (err) {
        console.error("Beklenmeyen hata:", err);
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
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const data = await res.json();
      if (data.matches) setMatches(data.matches);
    } catch (err) {
      console.error("Match fetch error:", err);
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

      const res = await fetch("/api/messages/start-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (error) {
      console.error("Start conversation error:", error);
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
      }).catch((err) => console.error("System message error:", err));
    } catch {
      toast.error("İlan kapatılırken bir hata oluştu.");
    } finally {
      setClosingItem(false);
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

  const imageSrc = item.image_url || item.image || "https://placehold.co/1200x900/0f172a/ffffff?text=Gorsel";
  const itemTypeText = item.type === "lost" ? "Kayıp İlanı" : item.type === "found" ? "Bulundu İlanı" : "İlan";
  const typeClasses =
    item.type === "lost"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

  return (
    <>
      <AppHeader />

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
              <div className="h-[320px] w-full md:h-[440px]">
                <img src={imageSrc} alt={item.title} className="h-full w-full object-cover" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeClasses}`}>
                  {itemTypeText}
                </span>
                {item.category && (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {item.category}
                  </span>
                )}
                {item.status === "resolved" && (
                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                    Çözüldü
                  </span>
                )}
              </div>

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
              {!isOwner && item.status === "resolved" && (
                <div className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                  <p className="text-sm text-green-200">Bu ilan çözüme kavuştu, artık talep gönderilemiyor.</p>
                </div>
              )}

              {isOwner && (
                <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <p className="text-sm text-blue-200">
                    Bu ilan sana ait. Menüden düzenleme veya kaldırma işlemlerini yapabilirsin.
                  </p>
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
                          <div className="h-40 overflow-hidden">
                            <img
                              src={match.image_url}
                              alt={match.title}
                              className="h-full w-full object-cover transition group-hover:scale-105"
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

                      {/* 
                        Mesaj Gönder butonu:
                        - Uyum skoru %85 ve üzeri olmalı
                        - Eşleşen ilanın sahibi ben olmamalıyım
                        - Giriş yapmış olmalıyım
                      */}
                      {match.score >= 0.85 && !matchIsOwner && userEmail && (
                        <div className="border-t border-slate-700 p-3">
                          <button
                            onClick={() => handleStartConversation(match)}
                            disabled={startingConv === match.id}
                            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                          >
                            {startingConv === match.id ? "Başlatılıyor..." : "💬 Mesaj Gönder"}
                          </button>
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