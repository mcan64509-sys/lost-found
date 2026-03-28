"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  isOpen: boolean;
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  isOpen,
  message,
  description,
  confirmLabel = "Evet, devam et",
  cancelLabel = "İptal",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-white">{message}</p>
        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              danger
                ? "border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                : "border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
