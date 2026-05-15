"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import AuthGuard from "../../components/AuthGuard";
import { supabase } from "../../lib/supabase";
import { MapPin, Eye, Search, Filter, ArrowRight, Heart } from "lucide-react";

type PetItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  type: string;
  image_url: string | null;
  image_urls: string[] | null;
  priority_level: number;
  reward_amount: number | null;
  is_urgent: boolean | null;
  view_count: number | null;
  created_at: string;
  status: string | null;
  pet_species: string | null;
  pet_breed: string | null;
  pet_color: string | null;
  pet_age: string | null;
  pet_microchip: string | null;
};

const PET_SPECIES = ["Tümü", "Kedi", "Köpek", "Kuş", "Tavşan", "Hamster", "Diğer"];

const SPECIES_EMOJI: Record<string, string> = {
  Kedi: "🐱", Köpek: "🐶", Kuş: "🐦", Tavşan: "🐰", Hamster: "🐹", Diğer: "🐾",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

function PetCard({ item }: { item: PetItem }) {
  const img = item.image_url || item.image_urls?.[0];
  const emoji = SPECIES_EMOJI[item.pet_species ?? ""] ?? "🐾";

  return (
    <Link href={`/items/${item.id}`} className="block rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-600 hover:scale-[1.01] transition-all group">
      <div className="relative h-44 overflow-hidden bg-slate-800">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{emoji}</div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === "lost" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}>
            {item.type === "lost" ? "Kayıp" : "Bulundu"}
          </span>
          {item.is_urgent && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">🔴 Acil</span>
          )}
          {(item.priority_level ?? 0) > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">⭐</span>
          )}
        </div>
        {item.pet_species && (
          <div className="absolute top-2 right-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-sm border border-slate-700">
              {emoji} {item.pet_species}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white text-sm mb-1 line-clamp-2">{item.title}</h3>

        {/* Hayvan detayları */}
        <div className="flex flex-wrap gap-2 mb-2">
          {item.pet_breed && (
            <span className="text-xs bg-slate-800 text-slate-400 rounded-lg px-2 py-0.5">{item.pet_breed}</span>
          )}
          {item.pet_color && (
            <span className="text-xs bg-slate-800 text-slate-400 rounded-lg px-2 py-0.5">{item.pet_color}</span>
          )}
          {item.pet_age && (
            <span className="text-xs bg-slate-800 text-slate-400 rounded-lg px-2 py-0.5">{item.pet_age}</span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{item.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          {item.location && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>
          )}
          {item.view_count != null && (
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {item.view_count}</span>
          )}
          <span>{timeAgo(item.created_at)}</span>
        </div>

        {item.reward_amount && item.reward_amount > 0 && (
          <div className="mt-2 text-sm font-bold text-emerald-400">
            💰 {item.reward_amount.toLocaleString("tr-TR")} TL ödül
          </div>
        )}
        {item.pet_microchip && (
          <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
            📡 Mikroçip: {item.pet_microchip}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function PetsPage() {
  const [items, setItems] = useState<PetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [speciesFilter, setSpeciesFilter] = useState("Tümü");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("items")
        .select("id,title,description,location,type,image_url,image_urls,priority_level,reward_amount,is_urgent,view_count,created_at,status,pet_species,pet_breed,pet_color,pet_age,pet_microchip")
        .eq("category", "Evcil Hayvan")
        .neq("status", "resolved")
        .eq("moderation_status", "approved")
        .order("priority_level", { ascending: false })
        .order("created_at", { ascending: false });
      setItems((data as PetItem[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (speciesFilter !== "Tümü" && item.pet_species !== speciesFilter) return false;
    if (keyword && !item.title.toLowerCase().includes(keyword.toLowerCase()) &&
        !(item.description ?? "").toLowerCase().includes(keyword.toLowerCase())) return false;
    return true;
  });

  const lostCount = items.filter((i) => i.type === "lost").length;
  const foundCount = items.filter((i) => i.type === "found").length;

  return (
    <AuthGuard>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10">

          {/* Başlık */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center text-2xl">🐾</div>
              <div>
                <h1 className="text-3xl font-black text-white">Evcil Hayvan İlanları</h1>
                <p className="text-slate-500 text-sm mt-0.5">Kayıp ve bulunan evcil hayvanlar için özel bölüm</p>
              </div>
            </div>

            {/* İstatistik */}
            <div className="flex gap-4 mt-4">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-center">
                <div className="text-xl font-black text-red-400">{lostCount}</div>
                <div className="text-xs text-slate-500">Kayıp</div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-center">
                <div className="text-xl font-black text-emerald-400">{foundCount}</div>
                <div className="text-xs text-slate-500">Bulundu</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-center">
                <div className="text-xl font-black text-white">{items.length}</div>
                <div className="text-xs text-slate-500">Toplam</div>
              </div>
            </div>
          </div>

          {/* Arama + filtreler */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-6 space-y-3">
            {/* Arama */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Hayvan adı, renk, ırk ile ara..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-600"
              />
            </div>

            {/* Tip + Tür filtreleri */}
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-xl overflow-hidden border border-slate-700 text-sm font-semibold">
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
              {PET_SPECIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeciesFilter(s)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                    speciesFilter === s ? "bg-pink-500/20 border-pink-500/50 text-pink-400" : "border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  {SPECIES_EMOJI[s] ?? ""} {s}
                </button>
              ))}
            </div>
          </div>

          {/* İlanlar */}
          {loading ? (
            <div className="text-center py-20 text-slate-500">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🐾</div>
              <p className="text-slate-500 mb-2">Bu filtrede ilan bulunamadı.</p>
              <p className="text-sm text-slate-600">İlan verirken "Evcil Hayvan" kategorisini seç.</p>
              <Link href="/lost/report" className="inline-flex items-center gap-2 mt-4 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-400 transition">
                İlan Ver <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <PetCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Bilgi kutusu */}
          <div className="mt-12 rounded-3xl border border-pink-500/20 bg-pink-500/5 p-8">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="text-4xl">💡</div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white mb-2">Evcil Hayvan İlanı İpuçları</h2>
                <ul className="text-sm text-slate-400 space-y-1.5">
                  <li>• Hayvanın net fotoğraflarını ekle, mümkünse birden fazla açıdan</li>
                  <li>• Mikroçip numarasını biliyorsan mutlaka belirt — veterinerlerin direkt ulaşmasını sağlar</li>
                  <li>• Renk, ırk, yaş, boyut gibi ayırt edici özelliklerini detaylı yaz</li>
                  <li>• Kayıp günü ve konumu mümkün olduğunca doğru gir</li>
                  <li>• Ödül teklifin varsa belirt — daha fazla kişinin dikkatini çeker</li>
                  <li>• İlanı <strong className="text-white">Öncelikli</strong> yaparak görünürlüğü artır</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
