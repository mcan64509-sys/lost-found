"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "../../../../components/AppHeader";
import { supabase } from "../../../../lib/supabase";
import { toast } from "sonner";
import { normalizeEmail } from "../../../../lib/utils";

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
  user_id?: string | null;
  created_by_email?: string | null;
  createdByEmail?: string | null;
};

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [item, setItem] = useState<DbItem | null>(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [lostDate, setLostDate] = useState("");
  const [lostLocation, setLostLocation] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [distinctiveFeature, setDistinctiveFeature] = useState("");
  const [extraNote, setExtraNote] = useState("");

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoadingItem(true);
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          setItem(null);
          return;
        }
        setItem(data as DbItem);
      } catch {
        setItem(null);
      } finally {
        setLoadingItem(false);
      }
    };

    if (id) fetchItem();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!item) { toast.error("İlan bulunamadı."); return; }
    if (!fullName.trim() || !lostLocation.trim() || !distinctiveFeature.trim()) {
      toast.error("Lütfen zorunlu alanları doldur.");
      return;
    }

    try {
      setSubmitting(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { toast.error("Oturum alınamadı."); return; }

      const sessionUser = sessionData.session?.user;
      if (!sessionUser) {
        toast.error("Talep göndermek için giriş yapmalısın.");
        router.push("/auth/login");
        return;
      }

      const claimantUserId = sessionUser.id;
      const claimantEmail = normalizeEmail(sessionUser.email);
      const ownerEmail = normalizeEmail(item.created_by_email || item.createdByEmail || null);
      const ownerUserId = item.user_id || null;

      if (ownerUserId && claimantUserId === ownerUserId) {
        toast.error("Kendi ilanına talep gönderemezsin.");
        return;
      }

      if (!ownerUserId && ownerEmail && claimantEmail === ownerEmail) {
        toast.error("Kendi ilanına talep gönderemezsin.");
        return;
      }

      const { data: existingClaims } = await supabase
        .from("claims")
        .select("id,status")
        .eq("item_id", item.id)
        .eq("claimer_user_id", claimantUserId)
        .in("status", ["pending", "approved"]);

      if (existingClaims && existingClaims.length > 0) {
        toast.error("Bu ilan için zaten aktif bir sahiplik talebin var.");
        return;
      }

      const payload = {
        item_id: item.id,
        claimer_user_id: claimantUserId,
        claimer_email: claimantEmail || null,
        claimant_name: fullName.trim(),
        owner_user_id: ownerUserId,
        owner_email: ownerEmail || null,
        lost_date: lostDate || null,
        lost_location: lostLocation.trim(),
        brand_model: brandModel.trim() || null,
        distinctive_feature: distinctiveFeature.trim(),
        extra_note: extraNote.trim() || null,
        status: "pending",
      };

      const { error: insertError } = await supabase.from("claims").insert(payload);

      if (insertError) {
        toast.error("Sahiplik talebi gönderilemedi.");
        return;
      }

      // İlan sahibine bildirim gönder
      if (ownerEmail) {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: ownerEmail,
            type: "claim",
            title: "📬 Yeni sahiplik talebi!",
            message: `${fullName} adlı kullanıcı "${item.title}" ilanınız için sahiplik talebi gönderdi.`,
            itemId: item.id,
            relatedItemId: null,
          }),
        }).catch(() => {});
      }

      toast.success("Sahiplik talebi gönderildi.");
      router.push("/profile");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingItem) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-slate-400">İlan yükleniyor...</p>
          </div>
        </main>
      </>
    );
  }

  if (!item) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">← Ana Sayfa</Link>
            <h1 className="mt-4 text-3xl font-black">İlan bulunamadı</h1>
            <p className="mt-3 text-slate-400">Claim sayfasında ilan verisi alınamadı.</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link href={`/items/${item.id}`}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              İlana Geri Dön
            </Link>
            <Link href="/search"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              Aramaya Dön
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 md:p-8">
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-sm text-blue-200">
                İlan: <strong className="text-white">{item.title}</strong>
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Eşyanın sana ait olduğunu doğrulamaya yardımcı olacak bilgileri eksiksiz gir.
              </p>
            </div>

            <h1 className="mt-6 text-3xl font-black md:text-4xl">Sahiplik Talebi Gönder</h1>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Ad Soyad</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Eşyayı ne zaman kaybettin?</label>
                  <input type="date" value={lostDate} onChange={(e) => setLostDate(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500" required />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Nerede kaybettin?</label>
                <input type="text" value={lostLocation} onChange={(e) => setLostLocation(e.target.value)}
                  placeholder="Örn: Kadıköy / İstanbul"
                  className="w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Marka / Model</label>
                <input type="text" value={brandModel} onChange={(e) => setBrandModel(e.target.value)}
                  className="w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Ayırt Edici Özellik</label>
                <textarea value={distinctiveFeature} onChange={(e) => setDistinctiveFeature(e.target.value)}
                  rows={5} placeholder="Örn: Siyah kılıf, sağ alt köşede çizik"
                  className="w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Ek Not</label>
                <textarea value={extraNote} onChange={(e) => setExtraNote(e.target.value)}
                  rows={4} placeholder="Varsa ek bilgi gir"
                  className="w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500" />
              </div>

              <button type="submit" disabled={submitting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Gönderiliyor..." : "Sahiplik Talebi Gönder"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}