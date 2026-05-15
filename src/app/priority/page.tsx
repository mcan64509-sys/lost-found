"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import AuthGuard from "../../components/AuthGuard";
import { supabase } from "../../lib/supabase";
import { Star, Flame, ArrowRight, MapPin, Eye, Trophy, Zap } from "lucide-react";

type PriorityItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
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
};

const LEVEL_CONFIG = {
  3: { label: "Altın", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", badge: "bg-yellow-500 text-slate-950", icon: "🥇" },
  2: { label: "Gümüş", color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/30", badge: "bg-slate-400 text-slate-950", icon: "🥈" },
  1: { label: "Bronz", color: "text-amber-600", bg: "bg-amber-900/20 border-amber-800/30", badge: "bg-amber-700 text-white", icon: "🥉" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  return `${Math.floor(hrs / 24)}g önce`;
}

function PriorityCard({ item }: { item: PriorityItem }) {
  const cfg = LEVEL_CONFIG[item.priority_level as 1 | 2 | 3] ?? LEVEL_CONFIG[1];
  const img = item.image_url || (item.image_urls?.[0]);

  return (
    <Link href={`/items/${item.id}`} className={`block rounded-2xl border ${cfg.bg} bg-slate-900/60 overflow-hidden hover:scale-[1.01] transition-transform group`}>
      <div className="relative h-44 overflow-hidden bg-slate-800">
        {img ? (
          <img src={img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-slate-700">
            {item.category === "Evcil Hayvan" ? "🐾" : "📦"}
          </div>
        )}
        {/* Üst rozetler */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.icon} {cfg.label}
          </span>
          {item.is_urgent && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">🔴 Acil</span>
          )}
        </div>
        {/* Tip */}
        <div className="absolute top-2 right-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.type === "lost" ? "bg-red-500/90 text-white" : "bg-emerald-500/90 text-white"}`}>
            {item.type === "lost" ? "Kayıp" : "Bulundu"}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 flex-1">{item.title}</h3>
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{item.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {item.location}
            </span>
          )}
          {item.view_count != null && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {item.view_count}
            </span>
          )}
          <span>{timeAgo(item.created_at)}</span>
        </div>

        {item.reward_amount && item.reward_amount > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
            💰 {item.reward_amount.toLocaleString("tr-TR")} TL ödül
          </div>
        )}
      </div>
    </Link>
  );
}

export default function PriorityPage() {
  const [items, setItems] = useState<PriorityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<number | "all">("all");
  const [activeType, setActiveType] = useState<"all" | "lost" | "found">("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("items")
        .select("id,title,description,category,location,type,image_url,image_urls,priority_level,reward_amount,is_urgent,view_count,created_at,status")
        .gt("priority_level", 0)
        .neq("status", "resolved")
        .eq("moderation_status", "approved")
        .order("priority_level", { ascending: false })
        .order("created_at", { ascending: false });
      setItems((data as PriorityItem[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter((item) => {
    if (activeLevel !== "all" && item.priority_level !== activeLevel) return false;
    if (activeType !== "all" && item.type !== activeType) return false;
    return true;
  });

  const goldCount = items.filter((i) => i.priority_level === 3).length;
  const silverCount = items.filter((i) => i.priority_level === 2).length;
  const bronzeCount = items.filter((i) => i.priority_level === 1).length;

  return (
    <AuthGuard>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10">

          {/* Başlık */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Öncelikli İlanlar</h1>
                <p className="text-slate-500 text-sm mt-0.5">Sahipleri tarafından öne çıkarılan, acil veya ödüllü ilanlar</p>
              </div>
            </div>
          </div>

          {/* Öncelik açıklamaları */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-center gap-3">
              <span className="text-2xl">🥇</span>
              <div>
                <div className="font-bold text-yellow-400 text-sm">Altın Öncelik</div>
                <div className="text-xs text-slate-500 mt-0.5">En üst sıralarda gösterilir, en fazla görünürlük</div>
                <div className="text-xs font-bold text-yellow-500 mt-1">{goldCount} aktif ilan</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-500/20 bg-slate-500/5 p-4 flex items-center gap-3">
              <span className="text-2xl">🥈</span>
              <div>
                <div className="font-bold text-slate-300 text-sm">Gümüş Öncelik</div>
                <div className="text-xs text-slate-500 mt-0.5">Normal ilanların üzerinde listelenir</div>
                <div className="text-xs font-bold text-slate-400 mt-1">{silverCount} aktif ilan</div>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-800/20 bg-amber-900/10 p-4 flex items-center gap-3">
              <span className="text-2xl">🥉</span>
              <div>
                <div className="font-bold text-amber-600 text-sm">Bronz Öncelik</div>
                <div className="text-xs text-slate-500 mt-0.5">Temel öne çıkarma, standart görünürlük artışı</div>
                <div className="text-xs font-bold text-amber-700 mt-1">{bronzeCount} aktif ilan</div>
              </div>
            </div>
          </div>

          {/* Filtreler */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex rounded-xl overflow-hidden border border-slate-700 text-sm font-semibold">
              {(["all", "lost", "found"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-4 py-2 transition ${activeType === t ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
                >
                  {t === "all" ? "Tüm Tipler" : t === "lost" ? "Kayıp" : "Bulundu"}
                </button>
              ))}
            </div>

            <div className="flex rounded-xl overflow-hidden border border-slate-700 text-sm font-semibold">
              {([["all", "Tüm Seviyeler"], [3, "🥇 Altın"], [2, "🥈 Gümüş"], [1, "🥉 Bronz"]] as const).map(([v, l]) => (
                <button
                  key={String(v)}
                  onClick={() => setActiveLevel(v)}
                  className={`px-4 py-2 transition ${activeLevel === v ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* İlanlar */}
          {loading ? (
            <div className="text-center py-20 text-slate-500">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Star className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">Bu filtrede öncelikli ilan bulunamadı.</p>
              <p className="text-sm text-slate-600 mt-2">İlan verirken "Öncelik Seviyesi" seçerek ilanını öne çıkarabilirsin.</p>
              <Link href="/lost/report" className="inline-flex items-center gap-2 mt-4 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition">
                İlan Ver <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <PriorityCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Öncelik alma CTA */}
          <div className="mt-12 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
            <Zap className="w-10 h-10 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">İlanını Öne Çıkar</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
              Kayıp veya bulduğun eşyanın ilanını öncelikli yaparak daha fazla kişinin görmesini sağla.
              Bronz, Gümüş veya Altın öncelik seçenekleriyle ilanın listelerde öne çıkar.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/lost/report" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition">
                Kayıp İlanı Ver <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/found/report" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-400 transition">
                Bulundu İlanı Ver <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
