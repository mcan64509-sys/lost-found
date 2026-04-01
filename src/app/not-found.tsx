"use client";

import Link from "next/link";
import AppHeader from "../components/AppHeader";

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <p className="text-8xl font-black text-slate-800">404</p>
          <h1 className="mt-4 text-2xl font-bold">Sayfa bulunamadı</h1>
          <p className="mt-3 text-slate-400">
            Aradığın sayfa mevcut değil veya kaldırılmış olabilir.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Ana Sayfaya Dön
            </Link>
            <Link
              href="/search"
              className="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
            >
              İlan Ara
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
