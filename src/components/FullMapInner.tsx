"use client";

import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ItemMarker } from "./SearchMiniMapInner";

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createColoredIcon(type: "lost" | "found") {
  const color = type === "lost" ? "#ef4444" : "#22c55e";
  return L.divIcon({
    html: `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z"
          fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="6" fill="white"/>
      </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
    className: "",
  });
}

type Props = {
  lat: number;
  lng: number;
  radiusKm: number;
  items: ItemMarker[];
};

export default function FullMapInner({ lat, lng, radiusKm, items }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={11}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Circle center={[lat, lng]} radius={radiusKm * 1000} />

      {items.map((item) => (
        <Marker
          key={item.id}
          position={[item.lat, item.lng]}
          icon={createColoredIcon(item.type)}
        >
          <Popup maxWidth={220}>
            <div style={{ minWidth: "160px", fontFamily: "sans-serif" }}>
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  style={{
                    width: "100%",
                    height: "100px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    marginBottom: "8px",
                  }}
                />
              )}
              <span style={{
                background: item.type === "lost" ? "#ef4444" : "#22c55e",
                color: "white", fontSize: "10px", padding: "2px 8px",
                borderRadius: "99px", fontWeight: 600,
              }}>
                {item.type === "lost" ? "Kayıp" : "Bulundu"}
              </span>
              <div style={{ fontWeight: 600, fontSize: "13px", margin: "6px 0 2px" }}>
                {item.title}
              </div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
                {item.category}
              </div>
              <a href={`/items/${item.id}`} style={{
                display: "block", textAlign: "center", background: "#3b82f6",
                color: "white", padding: "5px", borderRadius: "6px",
                fontSize: "12px", textDecoration: "none",
              }}>
                İlana Git →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}