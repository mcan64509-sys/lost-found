"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function VerifiedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {/* Animasyonlu onay ikonu */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-500">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Hesabın Doğrulandı!</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          E-posta adresin başarıyla onaylandı.<br />
          Artık BulanVarMı? platformunu kullanmaya başlayabilirsin.
        </p>

        <button
          onClick={() => router.push("/")}
          className="w-full rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-slate-950 hover:bg-emerald-400 transition-all active:scale-95"
        >
          Platforma Devam Et →
        </button>

        <p className="mt-4 text-sm text-slate-600">
          {countdown > 0 ? `${countdown} saniye içinde otomatik yönlendiriliyorsun` : "Yönlendiriliyor..."}
        </p>

      </div>
    </main>
  );
}
