"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LocationPickerModal from "../../components/LocationPickerModal";
import SearchMiniMap from "../../components/SearchMiniMap";
import FullMapModal from "../../components/FullMapModal";
import { supabase } from "../../lib/supabase";
import type { ItemMarker } from "../../components/SearchMiniMapInner";

type SelectedLocation = {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

const defaultLocation: SelectedLocation = {
  name: "Bursa, Türkiye",
  lat: 40.1885,
  lng: 29.061,
  radiusKm: 40,
};

const categories = [
  "Tüm kategoriler", "Cüzdan", "Telefon", "Anahtar", "Çanta",
  "Laptop", "Saat / Takı", "Kimlik / Evrak", "Diğer",
];

const itemTypes = ["Tümü", "Kayıp", "Buluntu"];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SearchPage() {
  const [itemType, setItemType] = useState("Tümü");
  const [category, setCategory] = useState("Tüm kategoriler");
  const [keyword, setKeyword] = useState("");
  const [locationText, setLocationText] = useState("");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(defaultLocation);
  const [openList, setOpenList] = useState<"lost" | "found" | null>(null);
  const [allItems, setAllItems] = useState<ItemMarker[]>([]);
  const [loading, setLoading] = useState(false);

  const locationSummary = useMemo(() => {
    return `${selectedLocation.name} · ${selectedLocation.radiusKm} km`;
  }, [selectedLocation]);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("id, type, title, category, lat, lng, image_url")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (error) console.error("Items fetch error:", error.message);
      else setAllItems(data as ItemMarker[]);
      setLoading(false);
    }
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const dist = getDistanceKm(selectedLocation.lat, selectedLocation.lng, item.lat, item.lng);
      if (dist > selectedLocation.radiusKm) return false;
      if (itemType === "Kayıp" && item.type !== "lost") return false;
      if (itemType === "Buluntu" && item.type !== "found") return false;
      if (category !== "Tüm kategoriler" && item.category !== category) return false;
      if (keyword.trim() && !item.title.toLowerCase().includes(keyword.toLowerCase())) return false;
      return true;
    });
  }, [allItems, selectedLocation, itemType, category, keyword]);

  const lostItems = filteredItems.filter((i) => i.type === "lost");
  const foundItems = filteredItems.filter((i) => i.type === "found");

  const handleClear = () => {
    setItemType("Tümü");
    setCategory("Tüm kategoriler");
    setKeyword("");
    setLocationText("");
    setSelectedLocation(defaultLocation);
  };

  return (
    <main className="min-h-screen bg-[#030b24] px-4 py-10 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-4xl">
          <Link href="/" className="mb-4 inline-block rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
            ← Ana Sayfa
          </Link>
          <h1 className="text-4xl font-extrabold md:text-6xl">
            Kayıp ve Buluntu<br />İlanları Filtrele
          </h1>
          <p className="mt-4 text-slate-300">
            Konum, kategori ve anahtar kelimelerle ilanları filtrele.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.95fr]">
          <section className="rounded-[32px] border border-white/10 bg-[#081633] p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <select value={itemType} onChange={(e) => setItemType(e.target.value)}
                className="h-14 rounded-2xl bg-[#020b24] px-4">
                {itemTypes.map((type) => <option key={type} className="text-black">{type}</option>)}
              </select>

              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="h-14 rounded-2xl bg-[#020b24] px-4">
                {categories.map((cat) => <option key={cat} className="text-black">{cat}</option>)}
              </select>

              <input value={locationText} onChange={(e) => setLocationText(e.target.value)}
                placeholder="Konum gir" className="h-14 rounded-2xl bg-[#020b24] px-4" />

              <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="Anahtar kelime" className="h-14 rounded-2xl bg-[#020b24] px-4" />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleClear} className="rounded-2xl border px-6 py-3">Temizle</button>
              <span className="text-sm text-slate-400">
                {loading ? "Yükleniyor..." : `${filteredItems.length} ilan bulundu`}
              </span>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex justify-between">
                <h2 className="text-xl font-bold">Mini Harita</h2>
                <button
                  onClick={() => setIsFullMapOpen(true)}
                  className="rounded-xl bg-blue-600 px-4 py-2"
                >
                  Aç
                </button>
              </div>

              <div className="mb-2 flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500" />Kayıp
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full bg-green-500" />Bulundu
                </span>
              </div>

              <div className="search-mini-map relative z-0 overflow-hidden rounded-2xl">
                <SearchMiniMap
                  lat={selectedLocation.lat}
                  lng={selectedLocation.lng}
                  radiusKm={selectedLocation.radiusKm}
                  items={filteredItems}
                />
              </div>
            </div>
          </section>

          <aside className="rounded-[32px] border border-white/10 bg-[#081633] p-6">
            <h2 className="text-xl font-bold">Konum</h2>
            <button onClick={() => setIsLocationModalOpen(true)}
              className="mt-4 h-12 w-full rounded-xl bg-[#020b24]">
              Konumu Değiştir
            </button>
            <div className="mt-4 rounded-xl bg-[#020b24] p-4">{selectedLocation.name}</div>
            <div className="mt-2 rounded-xl bg-[#020b24] p-4">{selectedLocation.radiusKm} km</div>
            <div className="mt-2 rounded-xl bg-[#020b24] p-4">{locationSummary}</div>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => setOpenList(openList === "lost" ? null : "lost")}
                className="flex w-full items-center justify-between rounded-xl bg-red-500/10 px-4 py-3 text-sm transition hover:bg-red-500/20"
              >
                <span className="text-red-400">Kayıp</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-400">{lostItems.length}</span>
                  <span className={`text-red-400 transition-transform duration-200 inline-block ${openList === "lost" ? "rotate-90" : ""}`}>›</span>
                </div>
              </button>
              {openList === "lost" && (
                <div className="space-y-2 pl-1">
                  {lostItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">Bu bölgede kayıp ilan yok.</p>
                  ) : (
                    lostItems.map((item) => (
                      <a key={item.id} href={`/items/${item.id}`}
                        className="flex items-center justify-between rounded-xl bg-[#020b24] px-4 py-3 text-sm hover:bg-red-500/10 transition">
                        <div>
                          <div className="font-medium text-white">{item.title}</div>
                          <div className="text-xs text-slate-400">{item.category}</div>
                        </div>
                        <span className="text-red-400">›</span>
                      </a>
                    ))
                  )}
                </div>
              )}

              <button
                onClick={() => setOpenList(openList === "found" ? null : "found")}
                className="flex w-full items-center justify-between rounded-xl bg-green-500/10 px-4 py-3 text-sm transition hover:bg-green-500/20"
              >
                <span className="text-green-400">Bulundu</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-400">{foundItems.length}</span>
                  <span className={`text-green-400 transition-transform duration-200 inline-block ${openList === "found" ? "rotate-90" : ""}`}>›</span>
                </div>
              </button>
              {openList === "found" && (
                <div className="space-y-2 pl-1">
                  {foundItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">Bu bölgede buluntu ilan yok.</p>
                  ) : (
                    foundItems.map((item) => (
                      <a key={item.id} href={`/items/${item.id}`}
                        className="flex items-center justify-between rounded-xl bg-[#020b24] px-4 py-3 text-sm hover:bg-green-500/10 transition">
                        <div>
                          <div className="font-medium text-white">{item.title}</div>
                          <div className="text-xs text-slate-400">{item.category}</div>
                        </div>
                        <span className="text-green-400">›</span>
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        initialLocation={selectedLocation}
        onClose={() => setIsLocationModalOpen(false)}
        onApply={(loc) => {
          setSelectedLocation(loc);
          setLocationText(loc.name);
        }}
      />

      <FullMapModal
        isOpen={isFullMapOpen}
        lat={selectedLocation.lat}
        lng={selectedLocation.lng}
        radiusKm={selectedLocation.radiusKm}
        items={filteredItems}
        onClose={() => setIsFullMapOpen(false)}
      />
    </main>
  );
}