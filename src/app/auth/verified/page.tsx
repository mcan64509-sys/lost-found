"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function VerifiedPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-600/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur p-10 shadow-2xl shadow-black/40">

          {/* Icon */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationIterationCount: 3 }} />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white mb-2">Hesabın Doğrulandı!</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            E-posta adresin başarıyla onaylandı.<br />
            Artık BulanVarMı? platformunu kullanmaya başlayabilirsin.
          </p>

          <Link
            href="/"
            className="block w-full rounded-xl bg-emerald-500 px-6 py-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95"
          >
            Siteye Devam Et →
          </Link>

          <Link
            href="/lost/report"
            className="mt-3 block w-full rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            İlan Oluştur
          </Link>

        </div>
      </div>
    </main>
  );
}
