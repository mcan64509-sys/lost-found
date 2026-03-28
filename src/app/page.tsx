"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { supabase } from "../lib/supabase";
import { X, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

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
};

export default function HomePage() {
  const [items, setItems] = useState<HomeItem[]>([]);
  const [loading, setLoading] = useState(true);
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
          .limit(10);

        if (error) {
          console.error("Home items fetch error:", error);
          setItems([]);
          return;
        }
        setItems((data ?? []) as HomeItem[]);
      } catch (error) {
        console.error("Home page unexpected error:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadLatestItems();
  }, []);

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

        <section className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Son İlanlar</h2>
              <p className="mt-2 text-slate-400">
                En yeni kayıp ve bulundu ilanları burada görünüyor.
              </p>
            </div>
            <Link
              href="/search"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900"
            >
              Tümünü Gör
            </Link>
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
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
              <h3 className="text-2xl font-bold">Henüz ilan yok</h3>
              <p className="mt-3 text-slate-400">
                İlk ilanlar geldiğinde burada listelenecek.
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
                  <Link
                    key={item.id}
                    href={`/items/${item.id}`}
                    className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 transition hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl hover:shadow-black/20"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={imageSrc}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute left-4 top-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeClasses}`}>
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
                          <span className="text-xs text-slate-500">{item.date}</span>
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
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}