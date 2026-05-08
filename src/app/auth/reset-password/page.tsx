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
    // URL hash'inden token'ı al ve Supabase'e ver
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => setReady(true));
        return;
      }
    }

    // Alternatif: onAuthStateChange ile dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // Zaten oturum açık ve recovery modundaysa
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
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

    await supabase.auth.signOut();
    toast.success("Şifreniz güncellendi! Giriş yapabilirsiniz.");
    router.push("/auth/login");
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">Doğrulama bekleniyor...</p>
          <p className="text-sm text-slate-500">
            E-postanızdaki linke tıkladıktan sonra bu sayfa otomatik devam eder.
          </p>
          <Link href="/auth/forgot-password" className="mt-6 inline-block text-sm text-blue-400 hover:text-blue-300">
            Yeni link gönder →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="mb-2 text-3xl font-bold">Yeni Şifre Belirle</h1>
        <p className="mb-6 text-slate-400">Hesabınız için güçlü bir şifre girin.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Yeni Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="En az 6 karakter"
              minLength={6}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Şifre Tekrar</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="Şifreni tekrar gir"
              minLength={6}
              required
            />
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-400">Şifreler eşleşmiyor</p>
          )}

          <button
            type="submit"
            disabled={loading || password !== confirmPassword || password.length < 6}
            className="w-full rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {loading ? "Güncelleniyor..." : "Şifremi Güncelle"}
          </button>
        </form>
      </div>
    </main>
  );
}
