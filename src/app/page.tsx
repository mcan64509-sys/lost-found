"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import SearchMiniMap from "../components/SearchMiniMap";
import { supabase } from "../lib/supabase";
import { X, AlertCircle, CheckCircle2, ArrowRight, MapPin, Calendar, Tag, ChevronRight, Loader2 } from "lucide-react";

type HomeItem = {
  id: string;
  type: "lost" | "found";
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  date: string | null;
  image_url: string | null;
  created_at: string;
  lat?: number | null;
  lng?: number | null;
};

export default function HomePage() {
  const [items, setItems] = useState<HomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showSelection, setShowSelection] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadLatestItems = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .order("created_at", { ascending: false })
          .range(0, 9);

        if (error) {
          setItems([]);
          return;
        }
        const result = (data ?? []) as HomeItem[];
        setItems(result);
        if (result.length < 10) setHasMore(false);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadLatestItems();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    try {
      setLoadingMore(true);
      const from = page * 10;
      const to = page * 10 + 9;
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        return;
      }
      const result = (data ?? []) as HomeItem[];
      setItems((prev) => [...prev, ...result]);
      setPage((prev) => prev + 1);
      if (result.length < 10) setHasMore(false);
    } catch {
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore]);

  const lostCount = useMemo(
    () => items.filter((item) => item.type === "lost").length,
    [items]
  );
  const foundCount = useMemo(
    () => items.filter((item) => item.type === "found").length,
    [items]
  );

  return (
    <>
      <AppHeader />

      {/* SEÇİM MODALI */}
      {showSelection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setShowSelection(false)}
              className="absolute -top-12 right-0 text-slate-400 hover:text-white flex items-center gap-2 bg-transparent border-none cursor-pointer"
            >
              <X className="w-5 h-5" />
              <span className="text-sm">Kapat</span>
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Ne tür bir ilan oluşturmak istiyorsun?
              </h2>
              <p className="text-slate-400 text-sm">
                Bildirmek istediğin durumu seç ve devam et.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* KAYIP İLANI */}
              <button
                onClick={() => router.push("/lost/report")}
                className="group flex flex-col items-center text-center rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 hover:bg-amber-500/15 transition-all cursor-pointer"
              >
                <AlertCircle className="w-10 h-10 text-amber-400 mb-4" />
                <div className="text-xs font-semibold text-amber-300 uppercase tracking-widest mb-2">
                  Kaybettiğin eşya için
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                  Kayıp İlanı Ver
                </h3>
                <p className="text-slate-400 text-sm leading-6 mb-5">
                  Kaybettiğin eşyayı sisteme ekle, bulanlar sana ulaşsın.
                </p>
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  Devam Et <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* BULUNDU İLANI */}
              <button
                onClick={() => router.push("/found/report")}
                className="group flex flex-col items-center text-center rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 hover:bg-emerald-500/15 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-4" />
                <div className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-2">
                  Bulduğun eşya için
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                  Bulundu İlanı Ver
                </h3>
                <p className="text-slate-400 text-sm leading-6 mb-5">
                  Bulduğun eşyayı sisteme ekle, sahibi talep göndersin.
                </p>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  Devam Et <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="mb-5 inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-300">
                  Kayıp & Buluntu için hızlı ve güvenli akış
                </div>

                <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                  Kayıp eşyaları bul,
                  <br />
                  bulunan eşyaları sahibine ulaştır.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                  İlan oluştur, talepleri yönet, onaylanan eşleşmelerde doğrudan
                  mesajlaş. Düzenli, hızlı ve güven veren bir deneyim.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {/* İLAN VER - MODAL AÇAR */}
                  <button
                    onClick={() => setShowSelection(true)}
                    className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-5 text-left transition hover:bg-blue-500/15"
                  >
                    <div className="text-sm font-semibold text-blue-300">
                      Kaybettiğin veya bulduğun eşya için
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">
                      İlan Ver
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Kayıp ya da bulundu ilanı oluşturmak için tıkla.
                    </p>
                  </button>

                  {/* İLANLARI TARA */}
                  <Link
                    href="/search"
                    className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5 transition hover:bg-amber-500/15"
                  >
                    <div className="text-sm font-semibold text-amber-300">
                      Kayıp eşyan için
                    </div>
                    <div className="mt-2 text-2xl font-black text-white">
                      İlanları Tara
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Benzer bulunan ilanları filtrele, uygun eşleşmeyi bul.
                    </p>
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
                  <div className="text-sm text-slate-400">Son 10 ilanda</div>
                  <div className="mt-3 text-4xl font-black text-white">
                    {items.length}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Güncel ilan sayısı
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                  <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
                    <div className="text-sm text-amber-300">Kayıp</div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {lostCount}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                    <div className="text-sm text-emerald-300">Bulundu</div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {foundCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mini Harita Bölümü */}
        {items.filter(i => i.lat && i.lng).length > 0 && (
          <section className="mx-auto max-w-7xl px-6 pb-2 pt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Haritada İlanlar</h2>
                <p className="text-sm text-slate-500">{items.filter(i => i.lat && i.lng).length} ilan konuma sahip</p>
              </div>
              <Link href="/search" className="text-sm text-blue-400 hover:text-blue-300">
                Tüm haritayı aç →
              </Link>
            </div>
            <div className="relative z-0 overflow-hidden rounded-2xl border border-slate-800" style={{ height: 280, isolation: "isolate" }}>
              <SearchMiniMap
                lat={39.9334}
                lng={32.8597}
                radiusKm={500}
                items={items.filter(i => i.lat && i.lng).map(i => ({
                  id: i.id,
                  type: i.type,
                  title: i.title,
                  category: i.category || "",
                  lat: i.lat!,
                  lng: i.lng!,
                  image_url: i.image_url || "",
                }))}
              />
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Son İlanlar</h2>
              <p className="mt-0.5 text-sm text-slate-500">En yeni kayıp ve bulundu ilanları</p>
            </div>
            <Link
              href="/search"
              className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
            >
              Tümünü Gör <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                  <div className="h-20 w-20 flex-shrink-0 animate-pulse rounded-xl bg-slate-800" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-16 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
              <p className="text-sm text-slate-500">Henüz ilan yok.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const imageSrc =
                  item.image_url ||
                  "https://placehold.co/1200x900/0f172a/ffffff?text=Gorsel";
                const isLost = item.type === "lost";
                const typeLabel = isLost ? "Kayıp" : "Bulundu";
                const badgeClasses = isLost
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30";

                return (
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className="group flex gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700 hover:bg-slate-800/60"
                  >
                    {/* Thumbnail */}
                    <Image
                      src={imageSrc}
                      alt={item.title}
                      width={64}
                      height={64}
                      className="h-16 w-16 flex-shrink-0 rounded-xl object-cover transition duration-300 group-hover:scale-105"
                      unoptimized
                    />

                    {/* Info */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${badgeClasses}`}>
                            {typeLabel}
                          </span>
                          {item.category && (
                            <span className="text-[11px] text-slate-600">{item.category}</span>
                          )}
                        </div>
                        <h3 className="line-clamp-1 text-sm font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 line-clamp-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {item.location || "Konum belirtilmedi"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        {item.date && (
                          <span className="text-[11px] text-slate-600">{item.date}</span>
                        )}
                        <span className="ml-auto text-xs text-blue-500 transition group-hover:text-blue-400">
                          Detay →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto mt-6 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Daha Fazla Yükle
              </button>
            </div>
          )}
        </section>

        <footer className="mx-auto max-w-7xl border-t border-slate-800 px-6 py-8 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <p>© {new Date().getFullYear()} Lost &amp; Found — Kayıp eşyaları bul, sahibine kavuştur.</p>
            <div className="flex gap-5">
              <Link href="/gizlilik" className="hover:text-slate-400 transition">Gizlilik Politikası</Link>
              <Link href="/kullanim-sartlari" className="hover:text-slate-400 transition">Kullanım Şartları</Link>
              <Link href="/favorites" className="hover:text-slate-400 transition">Favorilerim</Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}