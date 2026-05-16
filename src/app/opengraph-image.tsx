import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BulanVarMı? — Kayıp Eşya Platformu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #0c1a2e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          position: "relative",
        }}
      >
        {/* Background circles */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(14, 165, 233, 0.08)",
            top: -100,
            right: -100,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(14, 165, 233, 0.05)",
            bottom: -50,
            left: -50,
            display: "flex",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "#0ea5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            fontSize: 48,
            color: "white",
            fontWeight: "bold",
          }}
        >
          ?
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: "white",
            marginBottom: 16,
            letterSpacing: -2,
          }}
        >
          BulanVarMı?
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            marginBottom: 40,
          }}
        >
          Kayıp Eşya Platformu
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 20,
            color: "#0ea5e9",
            padding: "12px 32px",
            border: "1px solid rgba(14, 165, 233, 0.3)",
            borderRadius: 50,
          }}
        >
          Kayıp eşyalarını bul · Yapay zeka destekli eşleştirme
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#475569",
          }}
        >
          bulanvarmi.com
        </div>
      </div>
    ),
    { ...size }
  );
}
