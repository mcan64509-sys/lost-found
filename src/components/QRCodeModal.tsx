"use client";

import { useEffect, useRef } from "react";
import { X, Download, Share2 } from "lucide-react";
import QRCode from "qrcode";

type Props = {
  url: string;
  title: string;
  onClose: () => void;
};

export default function QRCodeModal({ url, title, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 240,
        margin: 2,
        color: { dark: "#ffffff", light: "#0f172a" },
      });
    }
  }, [url]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ilan-qr-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Bağlantı kopyalandı!");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">QR Kod</h3>
            <p className="text-xs text-slate-500 mt-0.5">Bu ilanı QR kod ile paylaş</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="rounded-2xl overflow-hidden border border-slate-700 p-3 bg-slate-950">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mb-5 break-all px-2">{url}</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            İndir
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            <Share2 className="w-4 h-4" />
            Paylaş
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          QR kodu çıktı alıp ilanı olan yere yapıştırabilirsin
        </p>
      </div>
    </div>
  );
}
