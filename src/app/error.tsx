"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white">
      <div className="text-center">
        <p className="text-8xl font-black text-slate-800">500</p>
        <h1 className="mt-4 text-2xl font-bold">Bir şeyler ters gitti</h1>
        <p className="mt-3 text-slate-400">
          Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-600">
            Hata kodu: {error.digest}
          </p>
        )}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </main>
  );
}
