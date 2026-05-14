"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Item = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  date: string | null;
  type: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  reward_amount?: number | null;
  is_urgent?: boolean | null;
};

export default function PosterPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    supabase
      .from("items")
      .select("id, title, description, category, location, date, type, image_url, image_urls, reward_amount, is_urgent")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setItem(data as Item);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-400">İlan bulunamadı.</p>
      </div>
    );
  }

  const isLost = item.type === "lost";
  const mainImage = item.image_urls?.[0] || item.image_url;
  const itemUrl = `${origin}/items/${id}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { size: A4; margin: 1cm; }
      `}</style>

      {/* Print controls — hidden on print */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <a href={`/items/${id}`} className="text-sm text-slate-400 hover:text-white transition">← İlana Dön</a>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100 transition"
          >
            🖨️ Yazdır / PDF
          </button>
        </div>
      </div>

      {/* Poster content — A4 optimized */}
      <div className="min-h-screen bg-white pt-16 print:pt-0">
        <div className="mx-auto max-w-[794px] min-h-[1123px] bg-white p-10 print:p-8 print:max-w-none relative">

          {/* Header bar */}
          <div className={`rounded-2xl print:rounded-lg p-5 mb-6 ${isLost ? "bg-amber-50 border-2 border-amber-400" : "bg-emerald-50 border-2 border-emerald-400"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black tracking-widest uppercase mb-2 ${isLost ? "bg-amber-400 text-white" : "bg-emerald-500 text-white"}`}>
                  {isLost ? "🔴 KAYIP" : "🟢 BULUNDU"}
                  {item.is_urgent && <span className="ml-1">⚡ ACİL</span>}
                </div>
                <h1 className="text-3xl print:text-2xl font-black text-gray-900 leading-tight">{item.title}</h1>
                {item.reward_amount && item.reward_amount > 0 && (
                  <p className="mt-1 text-amber-600 font-bold text-lg">💰 {item.reward_amount.toLocaleString("tr-TR")} TL Ödül</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium">BulanVarMı?</p>
                <p className="text-xs text-gray-500">bulanvarmi.vercel.app</p>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Image */}
            {mainImage && (
              <div className="flex-shrink-0 w-52 print:w-44">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImage}
                  alt={item.title}
                  className="w-full aspect-square object-cover rounded-2xl print:rounded-lg border-2 border-gray-200"
                />
              </div>
            )}

            {/* Details */}
            <div className="flex-1 space-y-3">
              {item.description && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Açıklama</p>
                  <p className="text-gray-800 text-sm leading-relaxed">{item.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {item.category && (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Kategori</p>
                    <p className="text-sm font-semibold text-gray-800">📂 {item.category}</p>
                  </div>
                )}
                {item.location && (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Konum</p>
                    <p className="text-sm font-semibold text-gray-800">📍 {item.location}</p>
                  </div>
                )}
                {item.date && (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tarih</p>
                    <p className="text-sm font-semibold text-gray-800">📅 {new Date(item.date).toLocaleDateString("tr-TR")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QR + URL section */}
          <div className={`mt-8 rounded-2xl print:rounded-lg p-5 border-2 ${isLost ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-base font-black text-gray-900 mb-1">
                  {isLost ? "Bu eşyayı bulduysanız lütfen iletişime geçin!" : "Bu eşya sizin mi? Talep gönderin!"}
                </p>
                <p className="text-xs text-gray-500 mb-2">Aşağıdaki bağlantıya giderek sahiplik talebi oluşturabilirsiniz.</p>
                <div className="inline-flex items-center gap-2 rounded-xl bg-white border border-gray-300 px-3 py-2">
                  <span className="text-xs font-mono text-gray-700 break-all">{itemUrl}</span>
                </div>
              </div>
              {/* QR placeholder — browser will print the URL */}
              <div className="flex-shrink-0 w-24 h-24 rounded-xl bg-white border-2 border-gray-300 flex flex-col items-center justify-center text-center">
                <span className="text-3xl">📱</span>
                <p className="text-[8px] text-gray-400 mt-1 leading-3">QR için siteyi ziyaret edin</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Bu afiş BulanVarMı? platformu üzerinden oluşturulmuştur. • bulanvarmi.vercel.app
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
