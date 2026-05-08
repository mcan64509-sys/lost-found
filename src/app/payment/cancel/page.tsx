"use client";

import Link from "next/link";
import AppHeader from "../../../components/AppHeader";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Ödeme İptal Edildi</h1>
          <p className="text-slate-400 mb-8">
            Ödeme tamamlanmadı, herhangi bir ücret alınmadı.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/upgrade"
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              Tekrar Dene
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
