"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "../components/AppHeader";
import HomeBanner from "../components/HomeBanner";
import { useLanguage } from "../contexts/LanguageContext";
import { supabase } from "../lib/supabase";

type NearbyItem = {
  id: string;
  title: string;
  type: string;
  category: string | null;
  location: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
};

const CATEGORY_ITEMS = [
  { dbKey: "Telefon",       emoji: "📱", i18n: "phone" as const },
  { dbKey: "Cüzdan",        emoji: "👛", i18n: "wallet" as const },
  { dbKey: "Anahtar",       emoji: "🔑", i18n: "key" as const },
  { dbKey: "Çanta",         emoji: "👜", i18n: "bag" as const },
  { dbKey: "Laptop",        emoji: "💻", i18n: "laptop" as const },
  { dbKey: "Saat / Takı",   emoji: "⌚", i18n: "watch" as const },
  { dbKey: "Kimlik / Evrak",emoji: "🪪", i18n: "id" as const },
  { dbKey: "Evcil Hayvan",  emoji: "🐾", i18n: "pet" as const },
  { dbKey: "Diğer",         emoji: "📦", i18n: "other" as const },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomePage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, resolved: 0 });
  const [isAuthed, setIsAuthed] = useState(false);
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [geoAsked, setGeoAsked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setIsAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  function requestNearby() {
    if (!navigator.geolocation) { setGeoError(true); return; }
    setNearbyLoading(true);
    setGeoAsked(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { data } = await supabase
          .from("items")
          .select("id, title, type, category, location, image_url, lat, lng")
          .eq("status", "active")
          .not("lat", "is", null)
          .not("lng", "is", null)
          .limit(100);
        const filtered = ((data || []) as NearbyItem[])
          .filter((item) => item.lat && item.lng && haversineKm(latitude, longitude, item.lat, item.lng) <= 20)
          .slice(0, 8);
        setNearbyItems(filtered);
        setNearbyLoading(false);
      },
      () => { setGeoError(true); setNearbyLoading(false); }
    );
  }

  useEffect(() => {
    Promise.all([
      supabase.from("items").select("*", { count: "exact", head: true }),
      supabase.from("items").select("*", { count: "exact", head: true }).eq("type", "lost"),
      supabase.from("items").select("*", { count: "exact", head: true }).eq("type", "found"),
      supabase.from("items").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    ]).then(([{ count: total }, { count: lost }, { count: found }, { count: resolved }]) => {
      setStats({ total: total ?? 0, lost: lost ?? 0, found: found ?? 0, resolved: resolved ?? 0 });
    });
  }, []);

  return (
    <>
      <AppHeader />

      <main className="bg-slate-950 text-white min-h-screen">

        {/* ── BANNER ── */}
        <HomeBanner />

        {/* ── İSTATİSTİKLER ── */}
        <div className="border-b border-slate-800/60 bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <div className="grid grid-cols-4 divide-x divide-slate-800">
              {[
                { label: t.home.statTotal,    value: stats.total,    color: "text-white" },
                { label: t.home.statLost,     value: stats.lost,     color: "text-amber-400" },
                { label: t.home.statFound,    value: stats.found,    color: "text-emerald-400" },
                { label: t.home.statResolved, value: stats.resolved, color: "text-blue-400" },
              ].map((s) => (
                <div key={s.label} className="text-center px-3 py-1">
                  <div className={`text-xl md:text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] md:text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── KATEGORİLER ── */}
        <section className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <h2 className="text-lg font-bold text-slate-300 mb-5 text-center tracking-wide uppercase text-xs">
            {t.cats.all}
          </h2>
          <div className="hidden sm:grid sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {CATEGORY_ITEMS.map((cat) => (
              <Link
                key={cat.dbKey}
                href={isAuthed ? `/search?cat=${encodeURIComponent(cat.dbKey)}` : `/auth/login?redirect=/search?cat=${encodeURIComponent(cat.dbKey)}`}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-150"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white transition-colors text-center leading-tight">
                  {t.cats[cat.i18n]}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── YAKINIMDAKI İLANLAR ── */}
        <section className="mx-auto max-w-7xl px-4 pb-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-white">{t.home.nearbyTitle}</h2>
                <p className="text-xs text-slate-500">{t.home.nearbyDesc}</p>
              </div>
              {!geoAsked && (
                <button
                  onClick={requestNearby}
                  className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition"
                >
                  📍 {t.home.nearbyEnable}
                </button>
              )}
            </div>
            {nearbyLoading && <p className="text-sm text-slate-500 py-4 text-center">Konum alınıyor...</p>}
            {geoError && <p className="text-sm text-slate-500 py-4 text-center">Konum alınamadı. Tarayıcı iznini kontrol edin.</p>}
            {geoAsked && !nearbyLoading && !geoError && nearbyItems.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">{t.home.nearbyEmpty}</p>
            )}
            {nearbyItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {nearbyItems.map((item) => (
                  <Link
                    key={item.id}
                    href={isAuthed ? `/items/${item.id}` : `/auth/login?redirect=/items/${item.id}`}
                    className="group rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden hover:border-slate-600 transition"
                  >
                    <div className="relative aspect-square bg-slate-800">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-600 text-2xl">📦</div>
                      )}
                      <span className={`absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${item.type === "lost" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
                        {item.type === "lost" ? "Kayıp" : "Bulundu"}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">📍 {item.location || "—"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t border-slate-800/60 mt-6">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-white">BulanVarMı?</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  © {new Date().getFullYear()} {t.home.footerTagline}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                <Link href="/gizlilik"         className="hover:text-slate-400 transition">{t.home.footerPrivacy}</Link>
                <Link href="/kullanim-sartlari" className="hover:text-slate-400 transition">{t.home.footerTerms}</Link>
                <Link href="/iade-politikasi"   className="hover:text-slate-400 transition">{t.home.footerRefund}</Link>
                <Link href="/hikayeler"         className="hover:text-slate-400 transition">{t.home.footerStories}</Link>
                <Link href="/kayip-buro"        className="hover:text-slate-400 transition">{t.home.footerBureaus}</Link>
                {isAuthed && (
                  <Link href="/favorites" className="hover:text-slate-400 transition">{t.home.footerFavorites}</Link>
                )}
                <Link href={isAuthed ? "/search" : "/auth/login"} className="hover:text-slate-400 transition">
                  {t.home.footerAllListings}
                </Link>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
