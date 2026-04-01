"use client";

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LocationPickerModal from "../../components/LocationPickerModal";
import SearchMiniMap from "../../components/SearchMiniMap";
import FullMapModal from "../../components/FullMapModal";
import { supabase } from "../../lib/supabase";
import type { ItemMarker } from "../../components/SearchMiniMapInner";

type SearchItem = ItemMarker & {
  created_at: string;
  view_count: number | null;
  status: string | null;
  description: string | null;
  location: string | null;
};

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

const SORT_OPTIONS = [
  { value: "newest", label: "En yeni" },
  { value: "oldest", label: "En eski" },
  { value: "most_viewed", label: "En çok görüntülenen" },
];

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL'den başlangıç değerleri
  const [itemType, setItemType] = useState(() => searchParams.get("type") || "Tümü");
  const [category, setCategory] = useState(() => searchParams.get("cat") || "Tüm kategoriler");
  const [keyword, setKeyword] = useState(() => searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "newest");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(defaultLocation);
  const [openLost, setOpenLost] = useState(true);
  const [openFound, setOpenFound] = useState(true);
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const isFirstRender = useRef(true);
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") || "");
  const [hideResolved, setHideResolved] = useState(() => searchParams.get("hide_resolved") === "1");

  // URL'yi güncelle
  const syncUrl = useCallback((params: Record<string, string>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "Tümü" && v !== "Tüm kategoriler" && v !== "newest") {
        current.set(k, v);
      } else {
        current.delete(k);
      }
    });
    router.replace(`/search?${current.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleTypeChange = (v: string) => { setItemType(v); syncUrl({ type: v }); };
  const handleCategoryChange = (v: string) => { setCategory(v); syncUrl({ cat: v }); };
  const handleKeywordChange = (v: string) => { setKeyword(v); syncUrl({ q: v }); };
  const handleSortChange = (v: string) => { setSortBy(v); syncUrl({ sort: v }); };
  const handleDateFromChange = (v: string) => { setDateFrom(v); syncUrl({ from: v }); };
  const handleDateToChange = (v: string) => { setDateTo(v); syncUrl({ to: v }); };
  const handleHideResolvedChange = (v: boolean) => { setHideResolved(v); syncUrl({ hide_resolved: v ? "1" : "" }); };

  // Load search history from localStorage
  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      setSearchHistory(h);
    } catch { /* ignore */ }
  }, []);

  // Save keyword to history when user types — skip first render (URL param on mount)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!keyword.trim() || keyword.trim().length < 2) return;
    try {
      const existing: string[] = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      const updated = [keyword.trim(), ...existing.filter(h => h.toLowerCase() !== keyword.trim().toLowerCase())].slice(0, 5);
      localStorage.setItem("searchHistory", JSON.stringify(updated));
      setSearchHistory(updated);
    } catch { /* ignore */ }
  }, [keyword]);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("id, type, title, description, category, location, lat, lng, image_url, created_at, view_count, status")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (!error) setAllItems(data as SearchItem[]);
      setLoading(false);
    }
    fetchItems();
  }, []);

  useEffect(() => {
    setVisibleCount(12);
  }, [itemType, category, keyword, selectedLocation, sortBy, dateFrom, dateTo, hideResolved]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [openLost, openFound]);

  const filteredItems = useMemo(() => {
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    const filtered = allItems.filter((item) => {
      const dist = getDistanceKm(selectedLocation.lat, selectedLocation.lng, item.lat, item.lng);
      if (dist > selectedLocation.radiusKm) return false;
      if (itemType === "Kayıp" && item.type !== "lost") return false;
      if (itemType === "Buluntu" && item.type !== "found") return false;
      if (category !== "Tüm kategoriler" && item.category !== category) return false;
      if (keyword.trim()) {
        const kw = keyword.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(kw);
        const inDesc = item.description?.toLowerCase().includes(kw) ?? false;
        const inLocation = item.location?.toLowerCase().includes(kw) ?? false;
        if (!inTitle && !inDesc && !inLocation) return false;
      }
      if (hideResolved && item.status === "resolved") return false;
      if (fromMs && new Date(item.created_at).getTime() < fromMs) return false;
      if (toMs && new Date(item.created_at).getTime() > toMs) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "most_viewed") return (b.view_count ?? 0) - (a.view_count ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest
    });
  }, [allItems, selectedLocation, itemType, category, keyword, sortBy]);

  const lostItems = filteredItems.filter((i) => i.type === "lost");
  const foundItems = filteredItems.filter((i) => i.type === "found");

  const handleClear = () => {
    setItemType("Tümü");
    setCategory("Tüm kategoriler");
    setKeyword("");
    setSortBy("newest");
    setDateFrom("");
    setDateTo("");
    setHideResolved(false);
    setSelectedLocation(defaultLocation);
    router.replace("/search", { scroll: false });
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
              <select value={itemType} onChange={(e) => handleTypeChange(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="h-14 rounded-2xl border border-slate-600 bg-slate-950 px-4 text-white">
                {itemTypes.map((type) => <option key={type}>{type}</option>)}
              </select>

              <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="h-14 rounded-2xl border border-slate-600 bg-slate-950 px-4 text-white">
                {categories.map((cat) => <option key={cat}>{cat}</option>)}
              </select>

              <div className="flex flex-col gap-1">
                <input value={keyword} onChange={(e) => handleKeywordChange(e.target.value)}
                  placeholder="Anahtar kelime (başlıkta ara)" className="h-14 rounded-2xl border border-slate-600 bg-slate-950 px-4 text-white placeholder:text-slate-500" />
                {searchHistory.length > 0 && !keyword && (
                  <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">Son aramalar:</span>
                    {searchHistory.map((h) => (
                      <button key={h} onClick={() => handleKeywordChange(h)}
                        className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-400 hover:text-white hover:border-slate-500 transition">
                        {h}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); localStorage.removeItem("searchHistory"); setSearchHistory([]); }}
                      className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-400 hover:bg-red-500/20 transition">
                      × Geçmişi Sil
                    </button>
                  </div>
                )}
              </div>

              <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="h-14 rounded-2xl border border-slate-600 bg-slate-950 px-4 text-white">
                {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 px-1">Başlangıç tarihi</label>
                <input type="date" value={dateFrom} onChange={(e) => handleDateFromChange(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="h-14 rounded-2xl border border-slate-600 bg-slate-950 px-4 text-white" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 px-1">Bitiş tarihi</label>
                <input type="date" value={dateTo} onChange={(e) => handleDateToChange(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="h-14 rounded-2xl border border-slate-600 bg-slate-950 px-4 text-white" />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-3">
                <div
                  onClick={() => handleHideResolvedChange(!hideResolved)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${hideResolved ? "bg-blue-600" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${hideResolved ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm text-slate-300">Çözüme kavuşanları gizle</span>
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleClear} className="rounded-2xl border border-slate-600 bg-slate-800 px-6 py-3 text-white hover:bg-slate-700">Temizle</button>
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
              className="mt-4 h-12 w-full rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition">
              Konumu Değiştir
            </button>
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">{selectedLocation.name}</p>
              <p className="mt-0.5 text-slate-500">{selectedLocation.radiusKm} km yarıçap</p>
            </div>

            <div className="mt-6 space-y-2">
              <button
                onClick={() => setOpenLost((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl bg-red-500/10 px-4 py-3 text-sm transition hover:bg-red-500/20"
              >
                <span className="text-red-400">Kayıp</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-400">{lostItems.length}</span>
                  <span className={`text-red-400 transition-transform duration-200 inline-block ${openLost ? "rotate-90" : ""}`}>›</span>
                </div>
              </button>
              {openLost && (
                <div className="space-y-2 pl-1">
                  {lostItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">Bu bölgede kayıp ilan yok.</p>
                  ) : (
                    lostItems.slice(0, visibleCount).map((item) => (
                      <a key={item.id} href={`/items/${item.id}`}
                        className="flex items-center justify-between rounded-xl bg-[#020b24] px-4 py-3 text-sm hover:bg-red-500/10 transition">
                        <div>
                          <div className="flex items-center gap-2 font-medium text-white">
                            {item.title}
                            {item.status === "resolved" && (
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-300">Çözüldü</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{item.category}</div>
                        </div>
                        <span className="text-red-400">›</span>
                      </a>
                    ))
                  )}
                  {visibleCount < lostItems.length && (
                    <div ref={sentinelRef} className="flex justify-center py-3">
                      <span className="text-xs text-slate-500">Yükleniyor...</span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setOpenFound((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl bg-green-500/10 px-4 py-3 text-sm transition hover:bg-green-500/20"
              >
                <span className="text-green-400">Bulundu</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-green-400">{foundItems.length}</span>
                  <span className={`text-green-400 transition-transform duration-200 inline-block ${openFound ? "rotate-90" : ""}`}>›</span>
                </div>
              </button>
              {openFound && (
                <div className="space-y-2 pl-1">
                  {foundItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-500">Bu bölgede buluntu ilan yok.</p>
                  ) : (
                    <>
                      {foundItems.slice(0, visibleCount).map((item) => (
                        <a key={item.id} href={`/items/${item.id}`}
                          className="flex items-center justify-between rounded-xl bg-[#020b24] px-4 py-3 text-sm hover:bg-green-500/10 transition">
                          <div>
                            <div className="flex items-center gap-2 font-medium text-white">
                              {item.title}
                              {item.status === "resolved" && (
                                <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-300">Çözüldü</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{item.category}</div>
                          </div>
                          <span className="text-green-400">›</span>
                        </a>
                      ))}
                      {visibleCount < foundItems.length && (
                        <div ref={sentinelRef} className="flex justify-center py-3">
                          <span className="text-xs text-slate-500">Yükleniyor...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* İlan Listesi */}
        {!loading && filteredItems.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-5 text-2xl font-bold text-white">
              Eşleşen İlanlar
              <span className="ml-3 text-base font-normal text-slate-400">({filteredItems.length})</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.slice(0, visibleCount).map((item) => (
                <a
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#081633] transition hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-slate-800">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      </div>
                    )}
                    <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${item.type === "lost" ? "bg-red-500/90 text-white" : "bg-green-500/90 text-white"}`}>
                      {item.type === "lost" ? "Kayıp" : "Bulundu"}
                    </span>
                    {item.status === "resolved" && (
                      <span className="absolute right-3 top-3 rounded-full bg-blue-500/90 px-2.5 py-1 text-[11px] font-bold text-white">
                        Çözüldü
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-semibold text-white line-clamp-2 leading-snug">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{item.description}</p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex flex-col gap-0.5">
                        {item.category && <span className="text-xs text-slate-500">{item.category}</span>}
                        {item.location && <span className="text-xs text-slate-500 truncate max-w-[140px]">{item.location}</span>}
                      </div>
                      <span className="text-xs text-slate-600">
                        {new Date(item.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {visibleCount < filteredItems.length && (
              <div ref={sentinelRef} className="mt-8 flex justify-center">
                <span className="text-sm text-slate-500">Daha fazla yükleniyor...</span>
              </div>
            )}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (keyword || category !== "Tüm kategoriler" || itemType !== "Tümü" || dateFrom || dateTo) && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-700 bg-[#081633] p-10 text-center">
            <p className="text-lg font-semibold text-white">Eşleşen ilan bulunamadı</p>
            <p className="mt-2 text-sm text-slate-400">Farklı anahtar kelime veya filtreler deneyin.</p>
          </div>
        )}
      </div>

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        initialLocation={selectedLocation}
        onClose={() => setIsLocationModalOpen(false)}
        onApply={(loc) => {
          setSelectedLocation(loc);
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

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030b24]" />}>
      <SearchPageContent />
    </Suspense>
  );
}