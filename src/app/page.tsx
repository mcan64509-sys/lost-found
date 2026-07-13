"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AppHeader from "../components/AppHeader";
import HomeBanner from "../components/HomeBanner";
import ScrollToTop from "../components/ScrollToTop";
import { useLanguage } from "../contexts/LanguageContext";
import { supabase } from "../lib/supabase";
import { useCountUp } from "../hooks/useCountUp";

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
  { dbKey: "Telefon",      emoji: "📱", i18n: "phone"   as const, glow: "hover:shadow-blue-500/20   hover:border-blue-500/40" },
  { dbKey: "Cüzdan",       emoji: "👛", i18n: "wallet"  as const, glow: "hover:shadow-yellow-500/20  hover:border-yellow-500/40" },
  { dbKey: "Anahtar",      emoji: "🔑", i18n: "key"     as const, glow: "hover:shadow-orange-500/20  hover:border-orange-500/40" },
  { dbKey: "Çanta",        emoji: "👜", i18n: "bag"     as const, glow: "hover:shadow-pink-500/20    hover:border-pink-500/40" },
  { dbKey: "Laptop",       emoji: "💻", i18n: "laptop"  as const, glow: "hover:shadow-cyan-500/20    hover:border-cyan-500/40" },
  { dbKey: "Evcil Hayvan", emoji: "🐾", i18n: "pet"     as const, glow: "hover:shadow-emerald-500/20 hover:border-emerald-500/40" },
  { dbKey: "Diğer",        emoji: "📦", i18n: "other"   as const, glow: "hover:shadow-slate-400/20   hover:border-slate-400/40" },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type RecentItem = { id: string; title: string; type: string; image_url: string | null; category: string | null; viewedAt: number };

export default function HomePage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, resolved: 0 });
  const countTotal    = useCountUp(stats.total);
  const countLost     = useCountUp(stats.lost);
  const countFound    = useCountUp(stats.found);
  const countResolved = useCountUp(stats.resolved);
  const [isAuthed, setIsAuthed] = useState(false);
  const [nearbyItems, setNearbyItems] = useState<NearbyItem[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [geoAsked, setGeoAsked] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    } catch {
      return [];
    }
  });
  const [catCounts, setCatCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setIsAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -32px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
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
          .eq("moderation_status", "approved")
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
    const cats = ["Telefon", "Cüzdan", "Anahtar", "Çanta", "Laptop", "Evcil Hayvan", "Diğer"];
    Promise.all(
      cats.map((cat) =>
        supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("moderation_status", "approved")
          .eq("status", "active")
          .eq("category", cat)
      )
    ).then((results) => {
      const counts: Record<string, number> = {};
      cats.forEach((cat, i) => { counts[cat] = results[i].count ?? 0; });
      setCatCounts(counts);
    });
  }, []);

  useEffect(() => {
    // 4 parallel COUNT queries — no data transfer, only header
    Promise.all([
      supabase.from("items").select("*", { count: "exact", head: true }).eq("moderation_status", "approved"),
      supabase.from("items").select("*", { count: "exact", head: true }).eq("moderation_status", "approved").eq("type", "lost"),
      supabase.from("items").select("*", { count: "exact", head: true }).eq("moderation_status", "approved").eq("type", "found"),
      supabase.from("items").select("*", { count: "exact", head: true }).eq("moderation_status", "approved").eq("status", "resolved"),
    ]).then(([total, lost, found, resolved]) => {
      setStats({
        total:    total.count    ?? 0,
        lost:     lost.count     ?? 0,
        found:    found.count    ?? 0,
        resolved: resolved.count ?? 0,
      });
    });
  }, []);

  return (
    <>
      <AppHeader />

      <main className="bg-slate-950 text-white min-h-screen relative overflow-x-hidden">

        {/* Ambient background glow */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-blue-600/5 blur-[120px]" />
          <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] rounded-full bg-violet-600/4 blur-[100px]" />
        </div>

        <div className="relative z-10">
          {/* ── BANNER ── */}
          <HomeBanner />

          {/* ── İSTATİSTİKLER ── */}
          <div className="border-b border-slate-800/60 bg-gradient-to-b from-slate-900/60 to-slate-950 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 py-5">
              <div className="grid grid-cols-4 divide-x divide-slate-800/60">
                {[
                  { label: t.home.statTotal,    value: countTotal,    color: "text-white",       glow: "",                                                  href: "/search" },
                  { label: t.home.statLost,     value: countLost,     color: "text-amber-400",   glow: "drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]",       href: "/search?type=lost" },
                  { label: t.home.statFound,    value: countFound,    color: "text-emerald-400", glow: "drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]",       href: "/search?type=found" },
                  { label: t.home.statResolved, value: countResolved, color: "text-blue-400",    glow: "drop-shadow-[0_0_10px_rgba(96,165,250,0.4)]",       href: "/search?status=resolved" },
                ].map((s) => (
                  <Link
                    key={s.label}
                    href={isAuthed ? s.href : `/auth/login?redirect=${s.href}`}
                    className="group text-center px-3 py-3 cursor-pointer hover:bg-slate-800/40 transition-colors duration-150 rounded-xl"
                  >
                    <div className={`text-xl md:text-3xl font-black transition-all duration-300 group-hover:scale-110 ${s.color} ${s.glow}`}>
                      {s.value.toLocaleString()}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-0.5 leading-tight group-hover:text-slate-400 transition-colors">
                      {s.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── KATEGORİLER ── */}
          <section className="mx-auto max-w-7xl px-4 py-10 md:py-14 reveal">
            <div className="flex items-center justify-center mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
              <h2 className="text-[11px] font-bold text-slate-500 tracking-widest uppercase px-4">
                {t.cats.all}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3 stagger">
              {/* Acil İlanlar */}
              <Link
                href={isAuthed ? "/search?urgent=true" : "/auth/login?redirect=/search?urgent=true"}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 hover:border-amber-400/70 hover:bg-amber-500/20 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-200"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-200">★</span>
                <span className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300 transition-colors text-center leading-tight">
                  Acil İlanlar
                </span>
              </Link>
              {CATEGORY_ITEMS.map((cat) => (
                <Link
                  key={cat.dbKey}
                  href={isAuthed ? `/search?cat=${encodeURIComponent(cat.dbKey)}` : `/auth/login?redirect=/search?cat=${encodeURIComponent(cat.dbKey)}`}
                  className={`group flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:bg-slate-800/80 hover:-translate-y-1.5 hover:shadow-lg transition-all duration-200 ${cat.glow}`}
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{cat.emoji}</span>
                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-white transition-colors text-center leading-tight">
                    {t.cats[cat.i18n]}
                  </span>
                  {catCounts[cat.dbKey] ? (
                    <span className="text-[9px] text-slate-600 group-hover:text-slate-500 transition-colors">{catCounts[cat.dbKey]}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>

          {/* ── SON GÖRÜNTÜLENENLER ── */}
          {recentlyViewed.length > 0 && (
            <section className="mx-auto max-w-7xl px-4 pb-4 reveal">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">Son Görüntülenenler</span>
                <button
                  onClick={() => { localStorage.removeItem("recentlyViewed"); setRecentlyViewed([]); }}
                  className="text-[10px] text-slate-700 hover:text-slate-400 transition"
                >
                  Temizle
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {recentlyViewed.map((item) => (
                  <Link
                    key={item.id}
                    href={isAuthed ? `/items/${item.id}` : `/auth/login?redirect=/items/${item.id}`}
                    className="flex-shrink-0 flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-900/50 px-3 py-2 hover:bg-slate-800/70 hover:border-slate-700 transition-all duration-150 group"
                  >
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.title} fill className="object-cover" sizes="32px" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-600 text-xs">📦</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate max-w-[110px] group-hover:text-blue-300 transition-colors">{item.title}</p>
                      <span className={`text-[10px] font-bold ${item.type === "lost" ? "text-amber-400" : "text-emerald-400"}`}>
                        {item.type === "lost" ? "Kayıp" : "Bulundu"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── YAKINIMDAKI İLANLAR ── */}
          <section className="mx-auto max-w-7xl px-4 pb-10 reveal delay-100">
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">{t.home.nearbyTitle}</h2>
                  <p className="text-xs text-slate-500">{t.home.nearbyDesc}</p>
                </div>
                {!geoAsked && (
                  <button
                    onClick={requestNearby}
                    className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 hover:border-blue-400/50 hover:scale-105 active:scale-95 transition-all duration-150 animate-pulse-glow"
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
                      className={`group rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-200 ${item.type === "lost" ? "card-lost" : "card-found"}`}
                    >
                      <div className="relative aspect-square bg-slate-800">
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
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

          <ScrollToTop />

          {/* ── FOOTER ── */}
          <footer className="border-t border-slate-800/40 mt-4 bg-gradient-to-b from-slate-950 to-slate-950 pb-20 md:pb-0">
            <div className="mx-auto max-w-7xl px-4 py-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <div className="text-base font-black text-white tracking-tight">BulanVarMı?</div>
                  <div className="text-xs text-slate-600 mt-1">
                    © {new Date().getFullYear()} {t.home.footerTagline}
                  </div>
                </div>
                <div className="flex flex-wrap gap-5 text-xs text-slate-500">
                  {[
                    { href: "/gizlilik",          label: t.home.footerPrivacy },
                    { href: "/kullanim-sartlari", label: t.home.footerTerms },
                    { href: "/hikayeler",         label: t.home.footerStories },
                    { href: "/kayip-buro",        label: t.home.footerBureaus },
                  ].map((link) => (
                    <Link key={link.href} href={link.href}
                      className="hover:text-slate-300 transition-colors duration-150 hover:underline underline-offset-2">
                      {link.label}
                    </Link>
                  ))}
                  {isAuthed && (
                    <Link href="/favorites" className="hover:text-slate-300 transition-colors duration-150 hover:underline underline-offset-2">
                      {t.home.footerFavorites}
                    </Link>
                  )}
                  <Link href={isAuthed ? "/search" : "/auth/login"}
                    className="hover:text-slate-300 transition-colors duration-150 hover:underline underline-offset-2">
                    {t.home.footerAllListings}
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </div>

      </main>
    </>
  );
}
