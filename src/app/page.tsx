"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "../components/AppHeader";
import HomeBanner from "../components/HomeBanner";
import { useLanguage } from "../contexts/LanguageContext";
import { supabase } from "../lib/supabase";

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

export default function HomePage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, resolved: 0 });
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setIsAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

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
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
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
