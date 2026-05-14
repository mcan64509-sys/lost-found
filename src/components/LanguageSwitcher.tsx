"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { type Locale, localeFlags, localeNames } from "../lib/i18n";
import { ChevronDown } from "lucide-react";

const LOCALES: Locale[] = ["tr", "en", "nl", "de"];

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-white transition"
        title="Language / Dil"
      >
        <span className="text-base leading-none">{localeFlags[locale]}</span>
        <span className="hidden sm:block font-medium">{locale.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-scale-in z-50">
          <div className="p-1">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => { setLocale(l); setOpen(false); }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition ${
                  locale === l
                    ? "bg-white/10 text-white font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-base">{localeFlags[l]}</span>
                <span>{localeNames[l]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
