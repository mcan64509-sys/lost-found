"use client";

import { useEffect } from "react";
import L, { LatLngExpression } from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  center: { lat: number; lng: number };
  radiusKm: number;
  onChangeLocation: (lat: number, lng: number) => void;
};

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RecenterMap({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), {
      animate: true,
    });
  }, [center, map]);

  return null;
}

function ClickHandler({
  onChangeLocation,
}: {
  onChangeLocation: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChangeLocation(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function LocationPickerMap({
  center,
  radiusKm,
  onChangeLocation,
}: Props) {
  const position: LatLngExpression = [center.lat, center.lng];

  return (
    <MapContainer
      center={position}
      zoom={10}
      scrollWheelZoom
      className="h-[320px] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap center={center} />
      <ClickHandler onChangeLocation={onChangeLocation} />

      <Marker position={position} />
      <Circle center={position} radius={radiusKm * 1000} />
    </MapContainer>
  );
}