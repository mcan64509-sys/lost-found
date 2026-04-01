"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
});

type SelectedLocation = {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  isOpen: boolean;
  initialLocation: SelectedLocation;
  onClose: () => void;
  onApply: (location: SelectedLocation) => void;
};

const radiusOptions = [1, 2, 5, 10, 20, 40, 60, 65, 80, 100, 250, 500];

export default function LocationPickerModal({
  isOpen,
  initialLocation,
  onClose,
  onApply,
}: Props) {
  const [query, setQuery] = useState(initialLocation.name);
  const [lat, setLat] = useState(initialLocation.lat);
  const [lng, setLng] = useState(initialLocation.lng);
  const [radiusKm, setRadiusKm] = useState(initialLocation.radiusKm);
  const [loading, setLoading] = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(initialLocation.name);
    setLat(initialLocation.lat);
    setLng(initialLocation.lng);
    setRadiusKm(initialLocation.radiusKm);
  }, [initialLocation, isOpen]);

  // Kullanıcı yazarken debounce ile Nominatim'e sor
  function handleQueryChange(value: string) {
    setQuery(value);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1`,
          { headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      }
    }, 350);
  }

  function handleSuggestionSelect(s: Suggestion) {
    setLat(Number(s.lat));
    setLng(Number(s.lon));
    setQuery(s.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { Accept: "application/json" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setLat(Number(data[0].lat));
        setLng(Number(data[0].lon));
        setQuery(data[0].display_name);
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        toast.error("Konum bulunamadı.");
      }
    } catch {
      toast.error("Konum aranırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Tarayıcı konum desteği vermiyor."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setQuery("Mevcut Konum");
        setSuggestions([]);
      },
      () => toast.error("Konum alınamadı.")
    );
  };

  const handleApply = () => {
    onApply({ name: query || "Seçilen Konum", lat, lng, radiusKm });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div className="relative z-[10000] w-full max-w-3xl rounded-[28px] border border-white/10 bg-white text-black shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <h2 className="text-2xl font-bold">Konumu değiştir</h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-600 transition hover:bg-zinc-200"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-sm text-zinc-600">
              Şehir, semt veya posta kodu ile arama yapın.
            </label>

            {/* Input + öneriler */}
            <div className="relative">
              <div className="flex gap-3">
                <input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Örn: Amsterdam, Utrecht, 3400"
                  className="h-14 flex-1 rounded-2xl border border-zinc-300 px-4 outline-none transition focus:border-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="h-14 rounded-2xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Aranıyor..." : "Ara"}
                </button>
              </div>

              {/* Öneri listesi */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-[60px] z-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      onMouseDown={() => handleSuggestionSelect(s)}
                      className="cursor-pointer px-4 py-3 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {s.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_200px]">
            <button
              onClick={handleUseMyLocation}
              className="h-14 rounded-2xl border border-zinc-300 bg-zinc-50 px-4 text-left font-medium transition hover:bg-zinc-100"
            >
              Konumumu kullan
            </button>

            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="h-14 rounded-2xl border border-zinc-300 px-4 outline-none transition focus:border-blue-500"
            >
              {radiusOptions.map((km) => (
                <option key={km} value={km}>{km} kilometre</option>
              ))}
            </select>
          </div>

          <div className="relative z-[10001] overflow-hidden rounded-2xl border border-zinc-200">
            <LocationPickerMap
              center={{ lat, lng }}
              radiusKm={radiusKm}
              onChangeLocation={async (newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
                // Reverse geocode to update displayed name
                try {
                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`,
                    { headers: { Accept: "application/json" } }
                  );
                  const data = await res.json();
                  if (data?.display_name) {
                    const short = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.display_name.split(",")[0];
                    setQuery(short);
                  }
                } catch { setQuery("Seçilen Konum"); }
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
            <div className="text-sm text-zinc-600">
              Haritada bir noktaya tıklayarak da konum seçebilirsin.
            </div>
            <button
              onClick={handleApply}
              className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Uygula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}