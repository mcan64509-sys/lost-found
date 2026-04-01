"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

type FavoriteItem = {
  id: string;
  title: string;
  type: "lost" | "found";
  category: string | null;
  location: string | null;
  date: string | null;
  image_url: string | null;
  status: string | null;
  created_at: string;
};

export default function FavoritesPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email?.trim().toLowerCase() ?? null;
      setUserEmail(email);

      if (!email) {
        setLoading(false);
        return;
      }

      await loadFavorites(email);
    }
    init();
  }, []);

  async function loadFavorites(email: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/favorites?userEmail=${encodeURIComponent(email)}&withItems=true`
      );
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems((data.items ?? []) as FavoriteItem[]);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(itemId: string) {
    if (!userEmail) return;
    setRemovingId(itemId);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, itemId }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        toast.success("Favorilerden çıkarıldı.");
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Favorilerim</h1>
              <p className="mt-1 text-slate-400">Kaydettiğin ilanlar burada listeleniyor.</p>
            </div>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900"
            >
              ← Ana Sayfa
            </Link>
          </div>

          {!userEmail ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
              <h2 className="text-xl font-bold">Giriş yapman gerekiyor</h2>
              <p className="mt-2 text-slate-400">Favorilerini görmek için hesabına giriş yap.</p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/auth/login" className="rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
                  Giriş Yap
                </Link>
                <Link href="/auth/register" className="rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                  Kayıt Ol
                </Link>
              </div>
            </div>
          ) : loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  <div className="h-48 animate-pulse bg-slate-800" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-20 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center">
              <p className="text-lg font-semibold text-slate-300">Henüz favori ilanın yok</p>
              <p className="mt-2 text-sm text-slate-500">
                İlan detayına girerek ★ Favori butonuna tıklayarak kaydet.
              </p>
              <Link
                href="/search"
                className="mt-6 inline-block rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                İlanlara Göz At
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const isLost = item.type === "lost";
                const badgeClasses = isLost
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30";
                const imageSrc = item.image_url || "https://placehold.co/800x600/0f172a/ffffff?text=Gorsel";

                return (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:border-slate-700"
                  >
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-slate-400 backdrop-blur transition hover:bg-red-500/80 hover:text-white disabled:opacity-50"
                      title="Favoriden çıkar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <Link href={`/items/${item.id}`}>
                      <div className="relative h-44 overflow-hidden">
                        <Image
                          src={imageSrc}
                          alt={item.title}
                          className="object-cover transition duration-300 group-hover:scale-105"
                          fill
                          unoptimized
                        />
                      </div>
                      <div className="p-4">
                        <div className="mb-2 flex items-center gap-2">
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
                        <h3 className="line-clamp-1 font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {item.location || "Konum belirtilmedi"}
                        </p>
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
