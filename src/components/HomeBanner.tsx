"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Search, Zap } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const SLIDE_CONFIG = [
  {
    gradient: "from-amber-900/60 via-slate-950 to-slate-950",
    glow: "bg-amber-500/20",
    accent: "text-amber-400",
    border: "border-amber-500/30",
    btnClass: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    icon: AlertCircle,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/15",
    route: "/lost/report",
    dot: "bg-amber-400",
  },
  {
    gradient: "from-emerald-900/60 via-slate-950 to-slate-950",
    glow: "bg-emerald-500/20",
    accent: "text-emerald-400",
    border: "border-emerald-500/30",
    btnClass: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/15",
    route: "/found/report",
    dot: "bg-emerald-400",
  },
  {
    gradient: "from-blue-900/60 via-slate-950 to-slate-950",
    glow: "bg-blue-500/20",
    accent: "text-blue-400",
    border: "border-blue-500/30",
    btnClass: "bg-blue-500 hover:bg-blue-400 text-white",
    icon: Search,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/15",
    route: "/search",
    dot: "bg-blue-400",
  },
  {
    gradient: "from-violet-900/60 via-slate-950 to-slate-950",
    glow: "bg-violet-500/20",
    accent: "text-violet-400",
    border: "border-violet-500/30",
    btnClass: "bg-violet-500 hover:bg-violet-400 text-white",
    icon: Zap,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/15",
    route: "/auth/register",
    dot: "bg-violet-400",
  },
];

export default function HomeBanner() {
  const { t } = useLanguage();
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = t.banners;
  const total = slides.length;

  function goTo(index: number) {
    if (animating) return;
    setAnimating(true);
    setCurrent(index);
    setTimeout(() => setAnimating(false), 400);
  }

  function next() {
    goTo((current + 1) % total);
  }

  function prev() {
    goTo((current - 1 + total) % total);
  }

  function resetInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(next, 5000);
  }

  useEffect(() => {
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Touch swipe
  const touchStart = useRef(0);

  const slide = slides[current];
  const config = SLIDE_CONFIG[current];
  const Icon = config.icon;

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{ minHeight: "56vh" }}
      onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); resetInterval(); }
      }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} transition-all duration-500`} />
      {/* Glow orb */}
      <div className={`absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-60 ${config.glow} transition-all duration-500`} />
      <div className={`absolute -bottom-10 right-10 w-60 h-60 rounded-full blur-3xl opacity-40 ${config.glow} transition-all duration-500`} />

      {/* Content */}
      <div
        key={current}
        className="relative flex flex-col items-center justify-center text-center px-6 py-16 md:py-24 min-h-[56vh] animate-fade-in-up"
      >
        {/* Icon */}
        <div className={`mb-6 w-20 h-20 rounded-3xl ${config.iconBg} border ${config.border} flex items-center justify-center`}>
          <Icon className={`w-10 h-10 ${config.iconColor}`} />
        </div>

        {/* Title */}
        <h2 className={`text-4xl md:text-6xl font-black mb-4 ${config.accent} leading-tight max-w-2xl`}>
          {slide.title}
        </h2>

        {/* Subtitle */}
        <p className="text-slate-300 text-base md:text-xl mb-10 max-w-lg leading-relaxed">
          {slide.sub}
        </p>

        {/* CTA Button */}
        <button
          onClick={() => router.push(config.route)}
          className={`px-8 py-4 rounded-2xl text-base font-black transition-all duration-200 shadow-lg ${config.btnClass} hover:-translate-y-0.5 hover:shadow-xl`}
        >
          {slide.cta}
        </button>
      </div>

      {/* Left arrow */}
      <button
        onClick={() => { prev(); resetInterval(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition backdrop-blur-sm"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Right arrow */}
      <button
        onClick={() => { next(); resetInterval(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition backdrop-blur-sm"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { goTo(i); resetInterval(); }}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? `w-6 h-2.5 ${config.dot}`
                : "w-2.5 h-2.5 bg-slate-600 hover:bg-slate-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
