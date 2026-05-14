"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { Lock, UserPlus, LogIn } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [status, setStatus] = useState<"checking" | "authed" | "guest">("checking");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "authed" : "guest");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setStatus(session ? "authed" : "guest");
    });
    return () => subscription.unsubscribe();
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-white animate-spin" />
          <p className="text-slate-500 text-sm">{t.auth.checking}</p>
        </div>
      </div>
    );
  }

  if (status === "guest") {
    const redirect = encodeURIComponent(pathname);
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl shadow-black/40">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/20">
              <Lock className="h-7 w-7 text-amber-400" />
            </div>

            <h1 className="text-2xl font-black text-white mb-3">
              {t.auth.loginRequired}
            </h1>
            <p className="text-slate-400 text-sm leading-7 mb-8">
              {t.auth.loginRequiredDesc}
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href={`/auth/login?redirect=${redirect}`}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-slate-100 transition-all"
              >
                <LogIn className="w-4 h-4" />
                {t.auth.login}
              </Link>
              <Link
                href={`/auth/register?redirect=${redirect}`}
                className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-700 bg-slate-800 px-6 py-3.5 text-sm font-bold text-white hover:bg-slate-700 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                {t.auth.register}
              </Link>
            </div>

            <p className="mt-5 text-xs text-slate-600">{t.auth.freeNote}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
