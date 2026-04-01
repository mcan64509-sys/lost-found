"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : "/auth/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <Link href="/auth/login" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
          ← Giriş Yap
        </Link>

        <h1 className="mb-2 mt-4 text-3xl font-bold">Şifremi Unuttum</h1>
        <p className="mb-6 text-slate-400">
          E-posta adresinize şifre sıfırlama linki gönderilecek.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
            <p className="font-semibold text-green-300">E-posta gönderildi!</p>
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-medium text-white">{email}</span> adresine şifre sıfırlama linki gönderildi. Gelen kutunuzu kontrol edin.
            </p>
            <Link
              href="/auth/login"
              className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Giriş sayfasına dön →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none"
                placeholder="ornek@mail.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
            >
              {loading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
