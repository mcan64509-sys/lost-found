"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AppHeader from "../../components/AppHeader";
import AuthGuard from "../../components/AuthGuard";
import { supabase } from "../../lib/supabase";
import { MapPin, Filter, X } from "lucide-react";
import type { ItemMarker } from "../../components/SearchMiniMapInner";

const MapViewInner = dynamic(() => import("../../components/MapViewInner"), { ssr: false });

type MapItem = ItemMarker & {
  priority_level?: number;
  reward_amount?: number;
  pet_species?: string;
};

const CATEGORIES = ["Tümü", "Telefon", "Cüzdan", "Anahtar", "Çanta", "Laptop", "Saat / Takı", "Kimlik / Evrak", "Evcil Hayvan", "Diğer"];

export default function MapPage() {
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [catFilter, setCatFilter] = useState("Tümü");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("items")
        .select("id, title, type, category, lat, lng, image_url, priority_level, reward_amount, pet_species, status")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .neq("status", "resolved")
        .eq("moderation_status", "approved")
        .order("priority_level", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      setItems((data as MapItem[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (catFilter !== "Tümü") {
      if (catFilter === "Evcil Hayvan") return item.category === "Evcil Hayvan";
      return item.category === catFilter;
    }
    return true;
  });

  return (
    <AuthGuard>
      <AppHeader />
      <main className="bg-slate-950 text-white min-h-screen flex flex-col">

        {/* Üst bar */}
        <div className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Harita Görünümü</h1>
                <p className="text-xs text-slate-500">
                  {loading ? "Yükleniyor..." : `${filtered.length} ilan haritada gösteriliyor`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tip filtresi */}
              <div className="flex rounded-xl overflow-hidden border border-slate-700 text-xs font-semibold">
                {(["all", "lost", "found"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 transition ${typeFilter === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
                  >
                    {t === "all" ? "Tümü" : t === "lost" ? "Kayıp" : "Bulundu"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${showFilters ? "border-amber-500/50 bg-amber-500/10 text-amber-400" : "border-slate-700 text-slate-400 hover:text-white"}`}
              >
                <Filter className="w-3.5 h-3.5" />
                Kategori
                {catFilter !== "Tümü" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            </div>
          </div>

          {/* Kategori filtresi */}
          {showFilters && (
            <div className="mx-auto max-w-7xl mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCatFilter(cat); setShowFilters(false); }}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    catFilter === cat
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat === "Evcil Hayvan" ? "🐾 " + cat : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Renk açıklamaları */}
        <div className="px-4 py-2 border-b border-slate-800/50 bg-slate-900/40">
          <div className="mx-auto max-w-7xl flex items-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Kayıp ilan
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              Bulundu ilanı
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              Öncelikli ilan
            </div>
          </div>
        </div>

        {/* Harita */}
        <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 200px)" }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500 text-sm">Harita yükleniyor...</div>
            </div>
          ) : (
            <MapViewInner items={filtered} />
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
