"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AppHeader from "../../components/AppHeader";
import AuthGuard from "../../components/AuthGuard";
import { supabase } from "../../lib/supabase";
import { MapPin, Filter, LocateFixed } from "lucide-react";
import type { ItemMarker } from "../../components/SearchMiniMapInner";

const MapViewInner = dynamic(() => import("../../components/MapViewInner"), { ssr: false });

type MapItem = ItemMarker & {
  pet_species?: string;
};

const CATEGORIES = ["Tümü", "Telefon", "Cüzdan", "Anahtar", "Çanta", "Laptop", "Saat / Takı", "Kimlik / Evrak", "Evcil Hayvan", "Diğer"];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPage() {
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [catFilter, setCatFilter] = useState("Tümü");
  const [showFilters, setShowFilters] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  function toggleRadius() {
    if (radiusKm !== null) { setRadiusKm(null); setUserLoc(null); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setRadiusKm(5); setLocLoading(false); },
      () => { alert("Konum alınamadı. Tarayıcı iznini kontrol edin."); setLocLoading(false); }
    );
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("items")
        .select("id, title, type, category, lat, lng, image_url, pet_species, status")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .neq("status", "resolved")
        .eq("moderation_status", "approved")
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
    if (radiusKm !== null && userLoc && item.lat && item.lng) {
      return haversineKm(userLoc.lat, userLoc.lng, item.lat, item.lng) <= radiusKm;
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

              <button
                onClick={toggleRadius}
                disabled={locLoading}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${radiusKm !== null ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-slate-700 text-slate-400 hover:text-white"}`}
              >
                <LocateFixed className="w-3.5 h-3.5" />
                {locLoading ? "Konum alınıyor..." : radiusKm !== null ? `${radiusKm} km` : "Yarıçap"}
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

          {/* Yarıçap filtresi */}
          {radiusKm !== null && (
            <div className="mx-auto max-w-7xl mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Yarıçap:</span>
              {[1, 5, 10, 25, 50].map((km) => (
                <button
                  key={km}
                  onClick={() => setRadiusKm(km)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    radiusKm === km
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {km} km
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
