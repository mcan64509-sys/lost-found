"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppHeader from "../../../components/AppHeader";
import { CheckCircle2, ArrowRight, Star } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (sessionId) {
      // Kısa bekleme — webhook işlemesi için
      setTimeout(() => setVerified(true), 2000);
    }
  }, [sessionId]);

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Ödeme Başarılı!</h1>
          <p className="text-slate-400 mb-2">
            Öncelik seviyeniz güncellendi. İlanınız artık listelerde öne çıkıyor.
          </p>
          <p className="text-xs text-slate-600 mb-8">
            Onay e-postası {sessionId ? "kayıtlı adresinize" : ""} gönderildi.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/search"
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              <Star className="w-4 h-4" />
              İlanları Gör
            </Link>
            <Link
              href="/my-items"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-700 transition"
            >
              İlanlarım <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
