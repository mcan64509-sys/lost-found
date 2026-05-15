"use client";

import { useRef, useState, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type Props = {
  imageSrc: string;
  fileName: string;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
};

function centerAspectCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, width / height, width, height),
    width,
    height
  );
}

async function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas boş"));
    }, "image/jpeg", 0.92);
  });
}

export default function ImageCropModal({ imageSrc, fileName, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }, []);

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0) return;
    setConfirming(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const baseName = fileName.replace(/\.[^.]+$/, "");
      const file = new File([blob], `${baseName}_cropped.jpg`, { type: "image/jpeg" });
      onConfirm(file);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">Fotoğrafı Kırp</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAspect(undefined)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${aspect === undefined ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              Serbest
            </button>
            <button
              onClick={() => setAspect(1)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${aspect === 1 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              1:1
            </button>
            <button
              onClick={() => setAspect(4 / 3)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${aspect === 4 / 3 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              4:3
            </button>
            <button
              onClick={() => setAspect(16 / 9)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${aspect === 16 / 9 ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              16:9
            </button>
          </div>
        </div>

        {/* Crop area */}
        <div className="flex max-h-[60vh] items-center justify-center overflow-auto bg-slate-950 p-4">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={50}
            minHeight={50}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Kırpılacak görsel"
              onLoad={onImageLoad}
              style={{ maxHeight: "55vh", maxWidth: "100%", objectFit: "contain" }}
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !completedCrop || completedCrop.width === 0}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {confirming ? "İşleniyor..." : "Görseli Kırp"}
          </button>
        </div>
      </div>
    </div>
  );
}
