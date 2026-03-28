"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Kayıt başarılı. Email doğrulaması gerekebilir.");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
          ← Ana Sayfa
        </Link>

        <h1 className="mt-4 mb-2 text-3xl font-bold">Kayıt Ol</h1>
        <p className="mb-6 text-slate-400">Yeni hesap oluştur.</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Ad Soyad
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 px-6 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-60"
          >
            {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Zaten hesabın var mı?{" "}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}