"use client";

import Link from "next/link";

type Props = {
  itemTitle: string;
  itemId: string;
  onClose: () => void;
};

export default function StoryInviteModal({ itemTitle, itemId, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-slate-900 p-8 shadow-2xl text-center animate-fade-in">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-black text-white mb-2">Harika!</h2>
        <p className="text-sm text-slate-400 mb-1">
          <span className="text-white font-semibold">"{itemTitle}"</span> ilanın çözüme kavuştu.
        </p>
        <p className="text-sm text-slate-400 mb-6">
          Bu güzel deneyimi topluluğumuzla paylaşmak ister misin? Hikayen başkalarına ilham verebilir.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/hikayeler?item=${encodeURIComponent(itemTitle)}`}
            onClick={onClose}
            className="w-full rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            ✍️ Hikayemi Paylaş
          </Link>
          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-700 px-6 py-3 text-sm text-slate-400 hover:bg-slate-800 transition"
          >
            Şimdi değil
          </button>
        </div>
      </div>
    </div>
  );
}
