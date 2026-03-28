"use client";

import dynamic from "next/dynamic";
import type { ItemMarker } from "./SearchMiniMapInner";

const MiniMapInner = dynamic(() => import("./SearchMiniMapInner"), {
  ssr: false,
});

type Props = {
  lat: number;
  lng: number;
  radiusKm: number;
  items?: ItemMarker[];
};

export default function SearchMiniMap({ lat, lng, radiusKm, items = [] }: Props) {
  return (
    <MiniMapInner
      key={`${lat}-${lng}-${radiusKm}`}
      lat={lat}
      lng={lng}
      radiusKm={radiusKm}
      items={items}
    />
  );
}