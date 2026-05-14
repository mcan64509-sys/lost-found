"use client";

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LocationPickerModal from "../../components/LocationPickerModal";
import SearchMiniMap from "../../components/SearchMiniMap";
import FullMapModal from "../../components/FullMapModal";
import AppHeader from "../../components/AppHeader";
import AuthGuard from "../../components/AuthGuard";
import { supabase } from "../../lib/supabase";
import type { ItemMarker } from "../../components/SearchMiniMapInner";
import {
  Search,
  MapPin,
  Filter,
  X,
  Map,
  ChevronDown,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  Eye,
  Calendar,
  Tag,
  ArrowRight,
} from "lucide-react";

type SearchItem = ItemMarker & {
  created_at: string;
  view_count: number | null;
  status: string | null;
  description: string | null;
  location: string | null;
  reward_amount?: number | null;
  is_urgent?: boolean | null;
  is_featured?: boolean | null;
  priority_level?: number | null;
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

const CATEGORIES = [
  "Tüm kategoriler", "Cüzdan", "Telefon", "Anahtar", "Çanta",
  "Laptop", "Saat / Takı", "Kimlik / Evrak", "Evcil Hayvan", "Diğer",
];

const SORT_OPTIONS = [
  { value: "newest", label: "En yeni" },
  { value: "oldest", label: "En eski" },
  { value: "most_viewed", label: "En çok görüntülenen" },
];

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

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"all" | "lost" | "found">(
    () => {
      const t = searchParams.get("type");
      if (t === "lost") return "lost";
      if (t === "found") return "found";
      return "all";
    }
  );
  const [category, setCategory] = useState(() => searchParams.get("cat") || "Tüm kategoriler");
  const [keyword, setKeyword] = useState(() => searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "newest");
  const [dateFrom, setDateFrom] = useState(() => searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(() => searchParams.get("to") || "");
  const [hideResolved, setHideResolved] = useState(() => searchParams.get("hide_resolved") === "1");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>(defaultLocation);
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const syncUrl = useCallback((params: Record<string, string>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "all" && v !== "Tüm kategoriler" && v !== "newest") {
        current.set(k, v);
      } else {
        current.delete(k);
      }
    });
    router.replace(`/search?${current.toString()}`, { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem("searchHistory") || "[]");
      setSearchHistory(h);
    } catch { /* ignore */ }
  }, []);

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
        .select("id, type, title, description, category, location, lat, lng, image_url, created_at, view_count, status, reward_amount, is_urgent, is_featured, priority_level")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (!error) setAllItems(data as SearchItem[]);
      setLoading(false);
    }
    fetchItems();
  }, []);

  useEffect(() => { setVisibleCount(12); }, [activeTab, category, keyword, selectedLocation, sortBy, dateFrom, dateTo, hideResolved]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount((prev) => prev + 12); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const filteredItems = useMemo(() => {
    const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    const filtered = allItems.filter((item) => {
      const dist = getDistanceKm(selectedLocation.lat, selectedLocation.lng, item.lat, item.lng);
      if (dist > selectedLocation.radiusKm) return false;
      if (activeTab === "lost" && item.type !== "lost") return false;
      if (activeTab === "found" && item.type !== "found") return false;
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
      // Featured ilanlar her zaman üstte
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      // Öncelikli ilanlar (priority_level yüksek olan önce)
      const aPriority = a.priority_level ?? 0;
      const bPriority = b.priority_level ?? 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      // Urgent ilanlar sonra
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "most_viewed") return (b.view_count ?? 0) - (a.view_count ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [allItems, selectedLocation, activeTab, category, keyword, sortBy, dateFrom, dateTo, hideResolved]);

  const lostItems = filteredItems.filter((i) => i.type === "lost");
  const foundItems = filteredItems.filter((i) => i.type === "found");
  const displayedItems = activeTab === "all" ? filteredItems : activeTab === "lost" ? lostItems : foundItems;

  const hasActiveFilter = keyword || category !== "Tüm kategoriler" || sortBy !== "newest" || dateFrom || dateTo || hideResolved;

  const handleClear = () => {
    setActiveTab("all");
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
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">

        {/* ── ÜSTTEKI BAŞLIK & ARAMA ── */}
        <div className="border-b border-slate-800/60 bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-black text-white">İlan Ara</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {loading ? "Yükleniyor..." : `${filteredItems.length} ilan bulundu`}
                  {selectedLocation.name && (
                    <span className="ml-2 text-slate-600">— {selectedLocation.name} ({selectedLocation.radiusKm} km)</span>
                  )}
                </p>
              </div>

              {/* Arama kutusu */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  ref={searchInputRef}
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); syncUrl({ q: e.target.value }); }}
                  placeholder="Başlık, açıklama veya konum ara..."
                  className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-slate-600 transition"
                />
                {keyword && (
                  <button
                    onClick={() => { setKeyword(""); syncUrl({ q: "" }); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtreler butonu */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${showFilters || hasActiveFilter ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : "border-slate-700 bg-slate-900 text-slate-300 hover:text-white"}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtreler
                  {hasActiveFilter && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </button>
                <button
                  onClick={() => setIsFullMapOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition"
                >
                  <Map className="w-4 h-4" />
                  Harita
                </button>
              </div>
            </div>

            {/* Arama geçmişi */}
            {searchHistory.length > 0 && !keyword && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-[11px] text-slate-600 uppercase tracking-wider">Son aramalar:</span>
                {searchHistory.map((h) => (
                  <button key={h} onClick={() => { setKeyword(h); syncUrl({ q: h }); }}
                    className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition">
                    {h}
                  </button>
                ))}
                <button
                  onClick={() => { localStorage.removeItem("searchHistory"); setSearchHistory([]); }}
                  className="rounded-full border border-red-500/20 bg-red-500/5 px-2 py-1 text-[10px] text-red-500 hover:bg-red-500/10 transition">
                  Sil
                </button>
              </div>
            )}

            {/* FİLTRE PANELİ */}
            {showFilters && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Kategori */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Kategori</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); syncUrl({ cat: e.target.value }); }}
                        style={{ colorScheme: "dark" }}
                        className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 text-sm text-white outline-none appearance-none"
                      >
                        {CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sıralama */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Sıralama</label>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); syncUrl({ sort: e.target.value }); }}
                        style={{ colorScheme: "dark" }}
                        className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none appearance-none"
                      >
                        {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Başlangıç tarihi */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Başlangıç Tarihi</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); syncUrl({ from: e.target.value }); }}
                        style={{ colorScheme: "dark" }}
                        className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 text-sm text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Bitiş tarihi */}
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Bitiş Tarihi</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); syncUrl({ to: e.target.value }); }}
                        style={{ colorScheme: "dark" }}
                        className="w-full h-10 rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 text-sm text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                  {/* Konum */}
                  <button
                    onClick={() => setIsLocationModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:text-white transition"
                  >
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-white">{selectedLocation.name}</span>
                    <span className="text-slate-500">({selectedLocation.radiusKm} km)</span>
                  </button>

                  <div className="flex items-center gap-4">
                    {/* Çözüldü gizle toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => { setHideResolved(!hideResolved); syncUrl({ hide_resolved: !hideResolved ? "1" : "" }); }}
                        className={`relative w-9 h-5 rounded-full transition-colors ${hideResolved ? "bg-blue-600" : "bg-slate-700"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${hideResolved ? "translate-x-4" : ""}`} />
                      </div>
                      <span className="text-xs text-slate-400">Çözülenleri gizle</span>
                    </label>

                    {hasActiveFilter && (
                      <button onClick={handleClear}
                        className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 transition">
                        <X className="w-3.5 h-3.5" />
                        Temizle
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">

          {/* ── SEKMELER ── */}
          <div className="flex items-center gap-1 mb-6 p-1 rounded-2xl border border-slate-800 bg-slate-900/60 w-fit">
            {[
              { key: "all", label: "Tümü", count: filteredItems.length, color: "text-white" },
              { key: "lost", label: "Kayıp İlanlar", count: lostItems.length, color: "text-amber-400", icon: <AlertCircle className="w-3.5 h-3.5" /> },
              { key: "found", label: "Bulundu İlanlar", count: foundItems.length, color: "text-emerald-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key as "all" | "lost" | "found"); syncUrl({ type: tab.key }); }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`text-xs font-bold ${activeTab === tab.key ? tab.color : "text-slate-600"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── MİNİ HARİTA ── */}
          {filteredItems.filter(i => i.lat && i.lng).length > 0 && (
            <div className="mb-6 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs text-slate-400">Kayıp ({lostItems.length})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-400">Bulundu ({foundItems.length})</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsFullMapOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  <Map className="w-3.5 h-3.5" />
                  Tam ekran aç
                </button>
              </div>
              <div className="search-mini-map relative z-0" style={{ height: 220, isolation: "isolate" }}>
                <SearchMiniMap
                  lat={selectedLocation.lat}
                  lng={selectedLocation.lng}
                  radiusKm={selectedLocation.radiusKm}
                  items={filteredItems}
                />
              </div>
            </div>
          )}

          {/* ── İLAN LİSTESİ ── */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="h-44 animate-pulse bg-slate-800" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 w-16 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-16 text-center">
              <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-lg font-bold text-white mb-2">Eşleşen ilan bulunamadı</p>
              <p className="text-sm text-slate-500 mb-6">
                Farklı anahtar kelime, kategori veya konumla tekrar dene.
              </p>
              {hasActiveFilter && (
                <button onClick={handleClear}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:text-white transition">
                  <X className="w-4 h-4" />
                  Filtreleri temizle
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedItems.slice(0, visibleCount).map((item) => {
                  const isLost = item.type === "lost";
                  return (
                    <Link
                      key={item.id}
                      href={`/items/${item.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:shadow-lg hover:shadow-black/30 transition-all"
                    >
                      {/* Görsel */}
                      <div className="relative h-44 overflow-hidden bg-slate-800">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                        {/* Tip badge */}
                        <div className="absolute top-3 left-3 flex flex-wrap items-start gap-1.5 max-w-[85%]">
                          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            isLost
                              ? "bg-amber-500/90 text-slate-950"
                              : "bg-emerald-500/90 text-slate-950"
                          }`}>
                            {isLost ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {isLost ? "Kayıp" : "Bulundu"}
                          </span>
                          {item.is_featured && (
                            <span className="rounded-full bg-yellow-400/90 px-2 py-1 text-[11px] font-bold text-slate-950">
                              ⭐ Öne Çıkan
                            </span>
                          )}
                          {(item.priority_level ?? 0) > 0 && !item.is_featured && (
                            <span className="rounded-full bg-amber-500/90 px-2 py-1 text-[11px] font-bold text-slate-950">
                              {item.priority_level === 3 ? "🥇" : item.priority_level === 2 ? "🥈" : "🥉"} Öncelikli
                            </span>
                          )}
                          {item.is_urgent && (
                            <span className="rounded-full bg-red-500/90 px-2 py-1 text-[11px] font-bold text-white">
                              🔴 Acil
                            </span>
                          )}
                          {item.status === "resolved" && (
                            <span className="rounded-full bg-blue-500/90 px-2 py-1 text-[11px] font-bold text-white">
                              Çözüldü
                            </span>
                          )}
                        </div>
                        {/* Ödül badge */}
                        {item.reward_amount && item.reward_amount > 0 && (
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 backdrop-blur-sm">
                            <span className="text-[11px] font-bold text-slate-950">💰 {item.reward_amount.toLocaleString("tr-TR")} TL ödül</span>
                          </div>
                        )}
                        {/* Görüntülenme */}
                        {item.view_count !== null && item.view_count > 0 && (
                          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
                            <Eye className="w-3 h-3 text-slate-300" />
                            <span className="text-[10px] text-slate-300">{item.view_count}</span>
                          </div>
                        )}
                      </div>

                      {/* İçerik */}
                      <div className="flex flex-col flex-1 p-4">
                        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-2">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-5">{item.description}</p>
                        )}
                        <div className="mt-auto space-y-1.5">
                          {item.category && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Tag className="w-3 h-3" />
                              {item.category}
                            </div>
                          )}
                          {item.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                          <span className="text-[11px] text-slate-600">
                            {new Date(item.created_at).toLocaleDateString("tr-TR")}
                          </span>
                          <span className="text-xs text-blue-400 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                            Detay <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {visibleCount < displayedItems.length && (
                <div ref={sentinelRef} className="mt-8 flex justify-center">
                  <span className="text-sm text-slate-500">Daha fazla yükleniyor...</span>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        initialLocation={selectedLocation}
        onClose={() => setIsLocationModalOpen(false)}
        onApply={(loc) => { setSelectedLocation(loc); setIsLocationModalOpen(false); }}
      />

      <FullMapModal
        isOpen={isFullMapOpen}
        lat={selectedLocation.lat}
        lng={selectedLocation.lng}
        radiusKm={selectedLocation.radiusKm}
        items={filteredItems}
        onClose={() => setIsFullMapOpen(false)}
      />
    </>
  );
}

export default function SearchPageWrapper() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <SearchPageContent />
      </Suspense>
    </AuthGuard>
  );
}
