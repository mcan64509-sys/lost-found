"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

type Story = {
  id: string;
  user_email: string;
  item_title: string;
  story: string;
  created_at: string;
};

export default function HikayelerPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [itemTitle, setItemTitle] = useState("");
  const [storyText, setStoryText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      setIsAuthed(!!user);
      setUserEmail(user?.email ?? "");

      const res = await fetch("/api/stories");
      const json = await res.json();
      setStories(json.stories ?? []);
      setLoading(false);
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemTitle.trim() || !storyText.trim()) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: userEmail, item_title: itemTitle, story: storyText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bir hata oluştu");
      toast.success("Hikayeniz gönderildi! İncelendikten sonra yayınlanacak.");
      setItemTitle("");
      setStoryText("");
      setShowForm(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">

          <div className="mb-4">
            <Link href="/" className="text-sm text-slate-500 hover:text-white transition">← Ana Sayfa</Link>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h1 className="text-3xl font-black mb-2">Başarı Hikayeleri</h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              BulanVarMı? sayesinde eşyalarına kavuşan kullanıcıların gerçek hikayeleri.
            </p>
          </div>

          {/* Submit story button */}
          {isAuthed && (
            <div className="mb-6 text-center">
              <button
                onClick={() => setShowForm((v) => !v)}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition"
              >
                {showForm ? "Formu Kapat" : "Hikayeni Paylaş 🎊"}
              </button>
            </div>
          )}

          {/* Submit form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
              <h2 className="font-bold text-emerald-400">Hikayeni Anlat</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Bulunan / Kavuşulan Eşya</label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Örn: Mavi çantam"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Hikayeni Anlat</label>
                <textarea
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Nasıl kaybettin? Platform nasıl yardımcı oldu? Eşyanla nasıl kavuştun?"
                  rows={5}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 transition resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? "Gönderiliyor..." : "Hikayemi Gönder"}
              </button>
              <p className="text-xs text-slate-600 text-center">Hikayeniz yayınlanmadan önce incelemeye alınır.</p>
            </form>
          )}

          {/* Stories list */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
          ) : stories.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-700">
              <p className="text-4xl mb-3">🌟</p>
              <p className="text-slate-400 font-semibold">Henüz paylaşılan hikaye yok.</p>
              <p className="text-slate-600 text-sm mt-1">İlk hikayeyi sen paylaş!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stories.map((s) => (
                <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg">🎉</div>
                    <div>
                      <p className="font-bold text-white text-sm">{s.item_title}</p>
                      <p className="text-xs text-slate-500">
                        {s.user_email.replace(/(.{2}).*@/, "$1***@")} · {new Date(s.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{s.story}</p>
                </div>
              ))}
            </div>
          )}

          {!isAuthed && (
            <div className="mt-10 text-center rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <p className="text-slate-400 mb-4">Hikayeni paylaşmak için giriş yapman gerekiyor.</p>
              <Link href="/auth/login?redirect=/hikayeler" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-slate-100 transition">
                Giriş Yap
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
