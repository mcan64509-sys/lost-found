"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }

    if (password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Şifreniz güncellendi. Giriş yapabilirsiniz.");
    router.push("/auth/login");
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
          <p className="text-slate-400">Doğrulama bekleniyor...</p>
          <p className="mt-2 text-xs text-slate-600">
            E-postanızdaki linke tıklayarak bu sayfaya geldiyseniz lütfen bekleyin.
          </p>
          <Link href="/auth/login" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">
            Giriş sayfasına dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="mb-2 text-3xl font-bold">Yeni Şifre Belirle</h1>
        <p className="mb-6 text-slate-400">Hesabınız için yeni bir şifre girin.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Yeni Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Şifre Tekrar</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Güncelleniyor..." : "Şifremi Güncelle"}
          </button>
        </form>
      </div>
    </main>
  );
}
