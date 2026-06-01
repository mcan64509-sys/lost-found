"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur p-10 shadow-2xl shadow-black/40">

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-500/15 flex items-center justify-center">
              <MailCheck className="w-10 h-10 text-blue-400" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white mb-2">E-postanı Doğrula</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-2">
            Doğrulama bağlantısı gönderildi:
          </p>
          {email && (
            <p className="text-white font-semibold text-sm mb-6 break-all">{email}</p>
          )}
          <p className="text-slate-500 text-xs leading-relaxed mb-8">
            E-postana gel ve &quot;Hesabımı Doğrula&quot; butonuna tıkla. Spam/gereksiz klasörünü de kontrol et.
          </p>

          <Link
            href="/auth/login"
            className="block w-full rounded-xl bg-blue-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-400 transition-colors"
          >
            Giriş Yap
          </Link>

          <Link
            href="/"
            className="mt-3 block w-full rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>

        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
