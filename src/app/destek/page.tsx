"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  HelpCircle,
} from "lucide-react";

const SUBJECTS = [
  "Hesap Sorunu",
  "Teknik Sorun",
  "İlan Sorunu",
  "Ödeme Sorunu",
  "Gizlilik & KVKK",
  "İş Birliği",
  "Diğer",
];

const FAQ = [
  {
    q: "İlanım neden onaylanmadı?",
    a: "İlanlar platform kurallarına uygunluk açısından incelenir. Fotoğraf, açıklama veya kategori eksikliği nedeniyle bekleyebilir.",
  },
  {
    q: "Kayıp eşyamı nasıl bulabilirim?",
    a: "Arama sayfasında filtreler ve AI eşleştirme sistemiyle benzer ilanları bulabilirsiniz. Uyarı da kurabilirsiniz.",
  },
  {
    q: "Hesabımı nasıl silerim?",
    a: "Profil → Hesap sekmesinden hesap silme talebinde bulunabilir ya da destek formu üzerinden bizimle iletişime geçebilirsiniz.",
  },
  {
    q: "Ödeme iadesi alabilir miyim?",
    a: "Öne çıkarma ödemelerinde 24 saat içinde talep edilmişse iade mümkündür. Destek formuyla başvurun.",
  },
];

export default function DestekPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gönderilemedi."); return; }
      setSent(true);
    } catch {
      setError("Bağlantı hatası, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
            ← Ana Sayfa
          </Link>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
              <HelpCircle className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">Destek & İletişim</h1>
              <p className="mt-1.5 text-slate-400">Sorunun veya sorunuz mu var? Formu doldurun, size e-posta ile geri dönelim.</p>
            </div>
          </div>

          {/* Stat kartları */}
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <Zap className="mx-auto mb-1.5 h-5 w-5 text-amber-400" />
              <p className="text-lg font-bold text-white">{"< 24s"}</p>
              <p className="text-xs text-slate-500">Ortalama yanıt</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <ShieldCheck className="mx-auto mb-1.5 h-5 w-5 text-emerald-400" />
              <p className="text-lg font-bold text-white">%100</p>
              <p className="text-xs text-slate-500">Yanıtlanma oranı</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center">
              <Clock className="mx-auto mb-1.5 h-5 w-5 text-blue-400" />
              <p className="text-lg font-bold text-white">7/24</p>
              <p className="text-xs text-slate-500">İzleme</p>
            </div>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* SOL: Form */}
          <div>
            {sent ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-emerald-900/20 p-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Mesajınız gönderildi!</h2>
                <p className="mt-3 max-w-sm text-sm text-slate-400">
                  <strong className="text-white">{email}</strong> adresine alındı bilgisi gönderdik.
                  En kısa sürede geri döneceğiz.
                </p>
                <button
                  onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
                  className="mt-8 rounded-xl border border-slate-700 px-6 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
                >
                  Yeni mesaj gönder
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
                <h2 className="mb-6 text-lg font-bold text-white">Mesaj Gönder</h2>
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">Ad Soyad *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={100}
                        placeholder="Adınızı girin"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-600 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-400">E-posta *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="ornek@mail.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-600 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Konu *</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                    >
                      <option value="">Konu seçin...</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-400">Mesajınız *</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={6}
                      maxLength={2000}
                      placeholder="Sorununuzu veya sorunuzu detaylıca açıklayın..."
                      className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-600 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                    />
                    <p className="mt-1.5 text-right text-xs text-slate-600">{message.length}/2000</p>
                  </div>

                  {error && (
                    <div className="rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !email.trim() || !subject || !message.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Mesaj Gönder
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* SAĞ: Sidebar */}
          <div className="space-y-4">
            {/* İletişim bilgileri */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="mb-4 text-sm font-bold text-white">İletişim</h3>
              <div className="space-y-3">
                <a
                  href="mailto:support@bulanvarmi.com"
                  className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3.5 transition hover:border-blue-500/30 hover:bg-slate-800"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                    <Mail className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">E-posta</p>
                    <p className="text-[11px] text-slate-400">support@bulanvarmi.com</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Yanıt süresi</p>
                    <p className="text-[11px] text-slate-400">Genellikle 24 saat içinde</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hızlı linkler */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="mb-3 text-sm font-bold text-white">Hızlı Erişim</h3>
              <div className="space-y-1">
                {[
                  { label: "İlan Oluştur", href: "/lost/report" },
                  { label: "İlanları Ara", href: "/search" },
                  { label: "Mesajlarım", href: "/messages" },
                  { label: "Profilim", href: "/profile" },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800/60 hover:text-white"
                  >
                    {label}
                    <span className="text-slate-600">→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* SSS */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="mb-4 text-sm font-bold text-white">Sık Sorulan Sorular</h3>
              <div className="space-y-2">
                {FAQ.map((item, i) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-slate-800/30 overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <p className="text-xs font-semibold text-white">{item.q}</p>
                      {openFaq === i
                        ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      }
                    </button>
                    {openFaq === i && (
                      <div className="border-t border-slate-800 px-4 pb-3 pt-2">
                        <p className="text-xs leading-5 text-slate-400">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
