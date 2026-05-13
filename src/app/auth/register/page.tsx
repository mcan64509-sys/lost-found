"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Building2, User, ArrowRight, CheckCircle2 } from "lucide-react";

type AccountType = "personal" | "business";

const BUSINESS_TYPES = [
  "Kargo / Lojistik",
  "Otel / Konaklama",
  "Alışveriş Merkezi",
  "Ulaşım (Otobüs, Metro, Taksi)",
  "Hastane / Klinik",
  "Okul / Üniversite",
  "Restoran / Kafe",
  "Diğer İşletme",
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType>("personal");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          account_type: accountType,
          company_name: accountType === "business" ? companyName : null,
          company_type: accountType === "business" ? companyType : null,
        },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Update profiles row if it was auto-created
    if (authData.user) {
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        account_type: accountType,
        company_name: accountType === "business" ? companyName : null,
        company_type: accountType === "business" ? companyType : null,
      }, { onConflict: "id" });
    }

    setLoading(false);
    toast.success("Kayıt başarılı! E-posta adresinizi doğruladıktan sonra giriş yapabilirsiniz.");
    router.push("/auth/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      {/* Decorative bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Ana Sayfa
        </Link>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur p-8 shadow-2xl shadow-black/40">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 flex items-center justify-center text-slate-950 text-xs font-black">
                BV
              </div>
              <span className="text-sm font-semibold text-slate-400">BulanVarMı?</span>
            </div>
            <h1 className="mt-3 text-2xl font-black text-white">Hesap Oluştur</h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === 1 ? "Hesap türünü seç" : "Bilgilerini gir"}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step >= s
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 text-slate-500"
                }`}>
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 2 && (
                  <div className={`h-px w-10 transition-all duration-300 ${step > s ? "bg-blue-500" : "bg-slate-800"}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── Step 1: Account type ──────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <button
                type="button"
                onClick={() => setAccountType("personal")}
                className={`w-full flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200 ${
                  accountType === "personal"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-slate-700 hover:border-slate-600 bg-slate-900"
                }`}
              >
                <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  accountType === "personal" ? "bg-blue-500/20" : "bg-slate-800"
                }`}>
                  <User className={`w-5 h-5 ${accountType === "personal" ? "text-blue-400" : "text-slate-500"}`} />
                </div>
                <div>
                  <div className="font-semibold text-white">Kişisel Hesap</div>
                  <div className="mt-1 text-xs text-slate-500 leading-5">
                    Bireysel kullanıcılar için. Kayıp eşya ilanı oluştur,
                    bulunan eşyaları sahiplerine kavuştur.
                  </div>
                </div>
                <div className={`ml-auto mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                  accountType === "personal" ? "border-blue-500 bg-blue-500" : "border-slate-600"
                }`} />
              </button>

              <button
                type="button"
                onClick={() => setAccountType("business")}
                className={`w-full flex items-start gap-4 rounded-2xl border p-5 text-left transition-all duration-200 ${
                  accountType === "business"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-700 hover:border-slate-600 bg-slate-900"
                }`}
              >
                <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  accountType === "business" ? "bg-emerald-500/20" : "bg-slate-800"
                }`}>
                  <Building2 className={`w-5 h-5 ${accountType === "business" ? "text-emerald-400" : "text-slate-500"}`} />
                </div>
                <div>
                  <div className="font-semibold text-white">Şirket / İşletme Hesabı</div>
                  <div className="mt-1 text-xs text-slate-500 leading-5">
                    Kargo firmaları, oteller, AVM'ler ve diğer işletmeler için.
                    Toplu ilan yönetimi ve işletme profili.
                  </div>
                </div>
                <div className={`ml-auto mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                  accountType === "business" ? "border-emerald-500 bg-emerald-500" : "border-slate-600"
                }`} />
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className={`mt-2 w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-sm transition-all ${
                  accountType === "business"
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "bg-blue-500 text-white hover:bg-blue-400"
                }`}
              >
                Devam Et
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Details form ─────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              {accountType === "business" && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 mb-2">
                  <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-300 font-medium">Şirket / İşletme Hesabı</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  {accountType === "business" ? "Yetkili Adı Soyadı" : "Ad Soyad"}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                  placeholder={accountType === "business" ? "Ahmet Yılmaz" : "Ad Soyad"}
                  required
                />
              </div>

              {accountType === "business" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      İşletme / Şirket Adı
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                      placeholder="ABC Kargo Ltd. Şti."
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      İşletme Türü
                    </label>
                    <select
                      value={companyType}
                      onChange={(e) => setCompanyType(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors"
                      required
                    >
                      <option value="">Seçiniz</option>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  E-posta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                  placeholder="ornek@email.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Şifre
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  ← Geri
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-[2] rounded-xl px-6 py-3 text-sm font-bold text-white transition-all disabled:opacity-60 ${
                    accountType === "business"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      : "bg-blue-500 hover:bg-blue-400"
                  }`}
                >
                  {loading ? "Oluşturuluyor..." : "Hesap Oluştur"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Zaten hesabın var mı?{" "}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
