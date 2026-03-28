"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

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
  created_by_email: string;
};

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export default function MyItemsPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");
  const [items, setItems] = useState<MyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadMyItems = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const sessionUser = sessionData.session?.user;

      if (!sessionUser?.email) {
        setUserEmail("");
        setItems([]);
        setLoading(false);
        return;
      }

      const currentEmail = normalizeEmail(sessionUser.email);
      setUserEmail(currentEmail);

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("created_by_email", currentEmail)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setItems((data ?? []) as MyItem[]);
    } catch (error) {
      console.error("My items load error:", error);

      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("İlanlar yüklenirken bir hata oluştu.");
      }

      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyItems();

    const handleWindowClick = () => {
      setOpenMenuItemId(null);
    };

    const handleFocus = () => {
      loadMyItems();
    };

    window.addEventListener("click", handleWindowClick);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("click", handleWindowClick);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadMyItems]);

  async function handleDeleteItem(itemId: string) {
    try {
      setDeletingItemId(itemId);

      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId)
        .eq("created_by_email", userEmail);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("İlan kaldırıldı.");
      setOpenMenuItemId(null);
      await loadMyItems();
    } catch (error) {
      console.error("Delete item error:", error);

      if (error instanceof Error) {
        toast.error(`İlan silinemedi: ${error.message}`);
      } else {
        toast.error("İlan silinirken bir hata oluştu.");
      }
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <>
      <AppHeader />

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        message="İlanı kaldırmak istediğine emin misin?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Evet, kaldır"
        danger
        onConfirm={() => { const id = confirmDeleteId!; setConfirmDeleteId(null); handleDeleteItem(id); }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black md:text-4xl">İlanlarım</h1>
              <p className="mt-2 text-slate-400">
                Oluşturduğun kayıp ve bulundu ilanlarını buradan yönetebilirsin.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900"
              >
                ← Ana Sayfa
              </Link>

              <button
                onClick={loadMyItems}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Yenile
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900"
                >
                  <div className="h-56 animate-pulse bg-slate-800" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                    <div className="h-6 w-2/3 animate-pulse rounded bg-slate-800" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : !userEmail ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="text-2xl font-bold">Giriş yapman gerekiyor</h2>
              <p className="mt-2 text-slate-400">
                İlanlarını görmek için önce hesabına giriş yap.
              </p>

              <div className="mt-6 flex gap-3">
                <Link
                  href="/auth/login"
                  className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Giriş Yap
                </Link>

                <Link
                  href="/auth/register"
                  className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
                >
                  Kayıt Ol
                </Link>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
              <h3 className="text-2xl font-bold">Henüz ilanın yok</h3>
              <p className="mt-3 text-slate-400">
                İlk ilanını oluşturduğunda burada görünecek.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const imageSrc =
                  item.image_url ||
                  "https://placehold.co/1200x900/0f172a/ffffff?text=Gorsel";

                const typeLabel =
                  item.type === "lost" ? "Kayıp İlanı" : "Bulundu İlanı";

                const typeClasses =
                  item.type === "lost"
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

                return (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl hover:shadow-black/20"
                  >
                    <div className="absolute left-4 top-4 z-20">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuItemId((prev) =>
                              prev === item.id ? null : item.id
                            );
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-xl text-white backdrop-blur transition hover:bg-black/70"
                        >
                          ⋮
                        </button>

                        {openMenuItemId === item.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-12 w-44 rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl"
                          >
                            <button
                              onClick={() => router.push(`/items/${item.id}/edit`)}
                              className="w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-slate-800"
                            >
                              İlanı düzenle
                            </button>

                            <button
                              onClick={() => { setOpenMenuItemId(null); setConfirmDeleteId(item.id); }}
                              disabled={deletingItemId === item.id}
                              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-slate-800 disabled:opacity-60"
                            >
                              İlanı kaldır
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link href={`/items/${item.id}`} className="block">
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={imageSrc}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />

                        <div className="absolute left-16 top-4">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeClasses}`}
                          >
                            {typeLabel}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">
                            {item.category || "Kategori yok"}
                          </span>

                          {item.date && (
                            <span className="text-xs text-slate-500">
                              {item.date}
                            </span>
                          )}
                        </div>

                        <h3 className="line-clamp-1 text-xl font-bold text-white">
                          {item.title}
                        </h3>

                        <p className="mt-2 line-clamp-1 text-sm text-slate-400">
                          {item.location || "Konum belirtilmedi"}
                        </p>

                        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">
                          {item.description || "Açıklama bulunmuyor."}
                        </p>

                        <div className="mt-5 inline-flex items-center text-sm font-medium text-blue-400 transition group-hover:text-blue-300">
                          Detayı görüntüle →
                        </div>
                      </div>
                    </Link>
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