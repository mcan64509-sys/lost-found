"use client";

import dynamic from "next/dynamic";
import type { ItemMarker } from "./SearchMiniMapInner";

const FullMapInner = dynamic(() => import("./FullMapInner"), { ssr: false });

type Props = {
  isOpen: boolean;
  lat: number;
  lng: number;
  radiusKm: number;
  items: ItemMarker[];
  onClose: () => void;
};

export default function FullMapModal({ isOpen, lat, lng, radiusKm, items, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="relative h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-[10001] flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-xl text-white hover:bg-black/80"
        >
          ×
        </button>

        <div className="absolute left-4 top-4 z-[10001] flex gap-3 rounded-xl bg-black/60 px-3 py-2 text-xs text-white">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            Kayıp ({items.filter(i => i.type === "lost").length})
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            Bulundu ({items.filter(i => i.type === "found").length})
          </span>
        </div>

        <FullMapInner lat={lat} lng={lng} radiusKm={radiusKm} items={items} />
      </div>
    </div>
  );
}