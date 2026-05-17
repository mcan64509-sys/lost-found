"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.push("/auth/login"); return; }
      // If user already has email, no need to complete profile
      if (data.session.user.email) { router.push(redirect); return; }
      setPhone(data.session.user.phone || "");
      setCheckingSession(false);
    }
    check();
  }, [redirect, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { toast.error("Ad Soyad gerekli."); return; }
    if (!email.trim()) { toast.error("E-posta adresi gerekli."); return; }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { router.push("/auth/login"); return; }
      const userId = session.session.user.id;

      // Update auth user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        email,
        data: { full_name: fullName },
      });
      if (updateError) { toast.error(updateError.message); return; }

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: userId,
        email,
        full_name: fullName,
        phone_number: phone,
      }, { onConflict: "id" });

      toast.success("Profilin oluşturuldu! E-postana bir onay maili gönderdik.");
      router.push(redirect);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Profilini Tamamla</h1>
            <p className="mt-1 text-sm text-slate-400">
              Telefon ile kaydoldun. Hesabını tamamlamak için bilgilerini gir.
            </p>
          </div>

          {phone && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <span className="text-emerald-400 text-sm">✓</span>
              <span className="text-sm text-emerald-300 font-medium">{phone} doğrulandı</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Ad Soyad</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adın ve soyadın"
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-300">E-posta Adresi</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500 transition"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                İlan bildirimleri ve mesajların bu adrese gönderilecek.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-60 transition"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : "Profili Tamamla"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={null}>
      <CompleteProfileForm />
    </Suspense>
  );
}
