"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download } from "lucide-react";

type Props = {
  title: string;
  type: string;
  category: string;
  location: string;
  imageUrl: string;
  onClose: () => void;
};

const CANVAS_W = 800;
const CANVAS_H = 420;

export default function SocialShareImageModal({
  title,
  type,
  category,
  location,
  imageUrl,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    function drawCard(itemImg: HTMLImageElement | null) {
      if (!ctx) return;

      // Background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Item image (right half) if available
      if (itemImg) {
        const imgX = CANVAS_W / 2;
        const imgW = CANVAS_W / 2;
        ctx.save();
        // Clip to right half
        ctx.beginPath();
        ctx.rect(imgX, 0, imgW, CANVAS_H);
        ctx.clip();
        // Draw image scaled to cover
        const scale = Math.max(imgW / itemImg.width, CANVAS_H / itemImg.height);
        const sw = itemImg.width * scale;
        const sh = itemImg.height * scale;
        const sx = imgX + (imgW - sw) / 2;
        const sy = (CANVAS_H - sh) / 2;
        ctx.drawImage(itemImg, sx, sy, sw, sh);
        // Gradient overlay from left on image
        const grad = ctx.createLinearGradient(imgX, 0, CANVAS_W, 0);
        grad.addColorStop(0, "rgba(15,23,42,1)");
        grad.addColorStop(0.35, "rgba(15,23,42,0.3)");
        grad.addColorStop(1, "rgba(15,23,42,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(imgX, 0, imgW, CANVAS_H);
        ctx.restore();
      }

      // Left side gradient from right
      const leftGrad = ctx.createLinearGradient(0, 0, CANVAS_W / 2, 0);
      leftGrad.addColorStop(0, "rgba(15,23,42,1)");
      leftGrad.addColorStop(1, "rgba(15,23,42,0.7)");
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, CANVAS_W / 2, CANVAS_H);

      // BulanVarMı? logo
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("BulanVarMı?", 40, 52);

      // Type badge
      const isLost = type === "lost";
      const badgeColor = isLost ? "#f59e0b" : "#10b981";
      const badgeBg = isLost ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)";
      const badgeText = isLost ? "KAYIP İLANI" : "BULUNDU İLANI";
      const badgeX = 40;
      const badgeY = 80;
      const badgeW = 130;
      const badgeH = 28;
      ctx.fillStyle = badgeBg;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
      ctx.fill();
      ctx.fillStyle = badgeColor;
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(badgeText, badgeX + 10, badgeY + 18);

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px sans-serif";
      // Word wrap
      const maxWidth = CANVAS_W / 2 - 80;
      const words = title.split(" ");
      let line = "";
      let lineY = 160;
      for (const word of words) {
        const testLine = line + word + " ";
        if (ctx.measureText(testLine).width > maxWidth && line !== "") {
          ctx.fillText(line.trim(), 40, lineY);
          line = word + " ";
          lineY += 42;
          if (lineY > 250) { ctx.fillText(line.trim() + "...", 40, lineY); break; }
        } else {
          line = testLine;
        }
      }
      if (lineY <= 250) ctx.fillText(line.trim(), 40, lineY);

      // Category & location
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px sans-serif";
      if (category) {
        ctx.fillText(category, 40, 300);
      }
      if (location) {
        ctx.fillText("📍 " + location, 40, 324);
      }

      // Divider
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 360);
      ctx.lineTo(CANVAS_W / 2 - 40, 360);
      ctx.stroke();

      // Watermark
      ctx.fillStyle = "#475569";
      ctx.font = "13px sans-serif";
      ctx.fillText("bulanvarmi.com", 40, 395);

      setRendered(true);
    }

    if (imageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => drawCard(img);
      img.onerror = () => drawCard(null);
      img.src = imageUrl;
    } else {
      drawCard(null);
    }
  }, [title, type, category, location, imageUrl]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `bulanvarmi-paylasim-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Sosyal Medya Görseli</h3>
            <p className="text-xs text-slate-500 mt-0.5">800×420 px — Instagram, Twitter, LinkedIn için ideal</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas preview */}
        <div className="rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 mb-4">
          <canvas
            ref={canvasRef}
            className="w-full h-auto"
            style={{ display: "block" }}
          />
        </div>

        {!rendered && (
          <p className="text-center text-sm text-slate-500 mb-4">Görsel oluşturuluyor...</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!rendered}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            PNG İndir
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 transition"
          >
            Kapat
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-600">
          Görseli sosyal medya paylaşımlarında kullanabilirsin
        </p>
      </div>
    </div>
  );
}
