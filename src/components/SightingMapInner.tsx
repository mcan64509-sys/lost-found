"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function RecenterOnPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });
  }, [lat, lng, map]);
  return null;
}

type Props = {
  onMapClick: (lat: number, lng: number) => void;
  selectedLat: number | null;
  selectedLng: number | null;
};

export default function SightingMapInner({ onMapClick, selectedLat, selectedLng }: Props) {
  return (
    <MapContainer center={[39.9, 32.86]} zoom={6} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      {selectedLat !== null && selectedLng !== null && (
        <>
          <Marker position={[selectedLat, selectedLng]} />
          <RecenterOnPin lat={selectedLat} lng={selectedLng} />
        </>
      )}
    </MapContainer>
  );
}
