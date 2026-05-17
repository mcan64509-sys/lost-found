"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Send, CheckCircle2 } from "lucide-react";

const SUBJECTS = [
  "Hesap Sorunu",
  "Teknik Sorun",
  "İlan Sorunu",
  "Ödeme Sorunu",
  "Gizlilik & KVKK",
  "İş Birliği",
  "Diğer",
];

export default function DestekPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
          ← Ana Sayfa
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Destek & İletişim</h1>
          <p className="mt-2 text-slate-400">Sorunun veya sorunuz mu var? Formu doldurun, size e-posta ile geri dönelim.</p>
        </div>

        {/* İletişim kartları */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href="mailto:destek@bulanvarmi.com"
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-blue-500/40 hover:bg-slate-800/50"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <Mail className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">E-posta</p>
              <p className="text-xs text-slate-400 select-all">destek@bulanvarmi.com</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Yanıt süresi</p>
              <p className="text-xs text-slate-400">Genellikle 24 saat içinde</p>
            </div>
          </div>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-900/20 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Mesajınız gönderildi!</h2>
            <p className="mt-2 text-sm text-slate-400">
              <strong className="text-white">{email}</strong> adresine alındı bilgisi gönderdik.
              En kısa sürede size geri döneceğiz.
            </p>
            <button
              onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
              className="mt-6 rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Yeni mesaj gönder
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Ad Soyad *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Adınızı girin"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition"
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Konu *</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none transition"
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
                rows={5}
                maxLength={2000}
                placeholder="Sorununuzu veya sorunuzu detaylıca açıklayın..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition"
              />
              <p className="mt-1 text-right text-xs text-slate-600">{message.length}/2000</p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim() || !subject || !message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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
          </form>
        )}
      </div>
    </main>
  );
}
