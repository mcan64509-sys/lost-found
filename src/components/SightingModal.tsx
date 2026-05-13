"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, X, Send, Loader2 } from "lucide-react";

const SightingMapInner = dynamic(() => import("./SightingMapInner"), { ssr: false });

type Props = {
  itemId: string;
  itemTitle: string;
  reporterEmail: string;
  onClose: () => void;
};

export default function SightingModal({ itemId, itemTitle, reporterEmail, onClose }: Props) {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationText, setLocationText] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleMapClick = useCallback((la: number, lo: number) => {
    setLat(la);
    setLng(lo);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lat || !lng) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sightings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, reporterEmail, lat, lng, locationText, note }),
      });
      if (res.ok) {
        setDone(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-in-up overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Gördüğüm Yeri İşaretle</p>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{itemTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-12 text-center animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Bildirim Gönderildi!</h3>
            <p className="text-sm text-slate-400 leading-6">
              İlan sahibine harita konumuyla birlikte bildirim iletildi.
              Katkın için teşekkürler.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Kapat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Map */}
            <div className="p-4">
              <p className="text-xs text-slate-500 mb-2">
                Haritada gördüğün konuma tıkla — pin bırak.
              </p>
              <div className="rounded-2xl overflow-hidden border border-slate-800 h-[260px]">
                <SightingMapInner onMapClick={handleMapClick} selectedLat={lat} selectedLng={lng} />
              </div>
              {lat && lng && (
                <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                  <MapPin className="w-3.5 h-3.5" />
                  {lat.toFixed(5)}, {lng.toFixed(5)} — konum seçildi
                </p>
              )}
            </div>

            <div className="px-4 space-y-3 pb-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Konum Açıklaması <span className="text-slate-600">(isteğe bağlı)</span>
                </label>
                <input
                  type="text"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600"
                  placeholder="Örn: Kadıköy Meydanı girişi"
                  maxLength={150}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Not <span className="text-slate-600">(isteğe bağlı)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600"
                  placeholder="Kısa bir not bırak..."
                />
              </div>

              <button
                type="submit"
                disabled={!lat || !lng || submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</>
                ) : (
                  <><Send className="w-4 h-4" /> Bildirimi Gönder</>
                )}
              </button>
              {!lat && (
                <p className="text-center text-xs text-slate-600">Devam etmek için haritada bir nokta seç</p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
