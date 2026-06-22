"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Loader2, Phone, Mail } from "lucide-react";

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  // Already has + prefix — use as-is
  if (trimmed.startsWith("+")) return trimmed.replace(/\s/g, "");
  // 00 international prefix → +
  if (trimmed.startsWith("00")) return "+" + trimmed.slice(2).replace(/\s/g, "");
  // Bare Turkish number (10 digits starting with 5)
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) return "+9" + digits;
  if (digits.length === 10 && digits.startsWith("5")) return "+90" + digits;
  return "+" + digits.replace(/\s/g, "");
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [tab, setTab] = useState<"email" | "phone">("email");

  // Email tab
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Phone tab
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  function startCountdown() {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) { toast.error("Oturum oluşturulamadı. Email doğrulaması gerekiyor olabilir."); return; }
    window.location.href = redirect;
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        skipBrowserRedirect: true,
      },
    });
    if (error) { toast.error(error.message); setGoogleLoading(false); return; }
    if (data.url) window.location.href = data.url;
  }

  async function handleSendOtp() {
    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, "").length < 10) { toast.error("Geçerli bir telefon numarası gir (ülke kodu dahil)."); return; }
    setPhoneLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setPhoneLoading(false);
    if (error) { toast.error(error.message); return; }
    setOtpSent(true);
    startCountdown();
    toast.success("Doğrulama kodu gönderildi!");
    setTimeout(() => otpInputRef.current?.focus(), 100);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("6 haneli kodu gir."); return; }
    const normalized = normalizePhone(phone);
    setPhoneLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: otp,
      type: "sms",
    });
    setPhoneLoading(false);
    if (error) { toast.error("Kod hatalı veya süresi dolmuş."); return; }
    if (!data.session) { toast.error("Oturum oluşturulamadı."); return; }

    // New phone user (no email) → profile completion
    if (!data.session.user.email) {
      window.location.href = `/auth/complete-profile?redirect=${encodeURIComponent(redirect)}`;
      return;
    }

    toast.success("Giriş başarılı!");
    window.location.href = redirect;
  }

  async function handleResend() {
    if (countdown > 0) return;
    setOtp("");
    await handleSendOtp();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-800">
          ← Ana Sayfa
        </Link>

        <h1 className="mb-2 mt-4 text-3xl font-bold">Giriş Yap</h1>
        <p className="mb-6 text-slate-400">Hesabına giriş yap.</p>

        {/* Tab switcher */}
        <div className="mb-5 flex rounded-2xl border border-slate-700 bg-slate-950 p-1 gap-1">
          <button
            onClick={() => setTab("email")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === "email" ? "bg-blue-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" /> E-posta
          </button>
          <button
            onClick={() => setTab("phone")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === "phone" ? "bg-blue-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <Phone className="w-4 h-4" /> Telefon
          </button>
        </div>

        {tab === "email" ? (
          <>
            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="mb-4 w-full flex items-center justify-center gap-3 rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? "Yönlendiriliyor..." : "Google ile Giriş Yap"}
            </button>

            <div className="relative mb-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500">veya</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60 transition"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Giriş yapılıyor...</> : "Giriş Yap"}
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-400">
              <Link href="/auth/forgot-password" className="text-blue-400 hover:text-blue-300">Şifremi unuttum</Link>
            </p>
          </>
        ) : (
          /* ── Phone OTP tab ── */
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Telefon Numarası</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">+</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="90 5xx xxx xx xx"
                      className="w-full rounded-xl border border-slate-600 bg-slate-950 pl-8 pr-4 py-3 text-white outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Ülke koduyla gir: +90 (TR), +31 (NL), +49 (DE)…</p>
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={phoneLoading || phone.replace(/\D/g, "").length < 8}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {phoneLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</> : "Kod Gönder"}
                </button>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm text-slate-300">
                  <span className="font-semibold text-white">{normalizePhone(phone)}</span> numarasına kod gönderildi.{" "}
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(""); if (countdownRef.current) clearInterval(countdownRef.current); setCountdown(0); }}
                    className="text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    Değiştir
                  </button>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Doğrulama Kodu</label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="_ _ _ _ _ _"
                    className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] text-white outline-none focus:border-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={phoneLoading || otp.length !== 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  {phoneLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Doğrulanıyor...</> : "Giriş Yap"}
                </button>

                <div className="text-center text-sm text-slate-500">
                  {countdown > 0 ? (
                    <span>Kodu tekrar gönder ({countdown}s)</span>
                  ) : (
                    <button type="button" onClick={handleResend} className="text-blue-400 hover:text-blue-300">
                      Kodu tekrar gönder
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        <p className="mt-6 text-sm text-slate-400">
          Hesabın yok mu?{" "}
          <Link href="/auth/register" className="text-blue-400 hover:text-blue-300">Kayıt ol</Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
