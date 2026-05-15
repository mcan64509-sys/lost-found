"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Bot, ShieldCheck, MessageCircle, MapPin, Star } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

const SLIDE_CONFIG = [
  {
    gradient: "from-violet-950 via-slate-950 to-slate-950",
    glowColor: "bg-violet-500/25",
    glowColor2: "bg-violet-500/10",
    accent: "text-violet-300",
    badge: "bg-violet-500/20 border-violet-500/30 text-violet-300",
    iconBg: "bg-violet-500/15 border-violet-500/25",
    iconColor: "text-violet-400",
    dot: "bg-violet-400",
    Icon: Bot,
  },
  {
    gradient: "from-amber-950 via-slate-950 to-slate-950",
    glowColor: "bg-amber-500/20",
    glowColor2: "bg-amber-500/10",
    accent: "text-amber-300",
    badge: "bg-amber-500/20 border-amber-500/30 text-amber-300",
    iconBg: "bg-amber-500/15 border-amber-500/25",
    iconColor: "text-amber-400",
    dot: "bg-amber-400",
    Icon: ShieldCheck,
  },
  {
    gradient: "from-blue-950 via-slate-950 to-slate-950",
    glowColor: "bg-blue-500/20",
    glowColor2: "bg-blue-500/10",
    accent: "text-blue-300",
    badge: "bg-blue-500/20 border-blue-500/30 text-blue-300",
    iconBg: "bg-blue-500/15 border-blue-500/25",
    iconColor: "text-blue-400",
    dot: "bg-blue-400",
    Icon: MessageCircle,
  },
  {
    gradient: "from-emerald-950 via-slate-950 to-slate-950",
    glowColor: "bg-emerald-500/20",
    glowColor2: "bg-emerald-500/10",
    accent: "text-emerald-300",
    badge: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
    iconBg: "bg-emerald-500/15 border-emerald-500/25",
    iconColor: "text-emerald-400",
    dot: "bg-emerald-400",
    Icon: MapPin,
  },
  {
    gradient: "from-rose-950 via-slate-950 to-slate-950",
    glowColor: "bg-rose-500/20",
    glowColor2: "bg-rose-500/10",
    accent: "text-rose-300",
    badge: "bg-rose-500/20 border-rose-500/30 text-rose-300",
    iconBg: "bg-rose-500/15 border-rose-500/25",
    iconColor: "text-rose-400",
    dot: "bg-rose-400",
    Icon: Star,
  },
];

export default function HomeBanner() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStart = useRef(0);

  const slides = t.banners;
  const total = slides.length;

  function goTo(index: number) {
    setCurrent(index);
  }

  function next() {
    setCurrent((c) => (c + 1) % total);
  }

  function prev() {
    setCurrent((c) => (c - 1 + total) % total);
  }

  function resetInterval() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setCurrent((c) => (c + 1) % total), 5500);
  }

  useEffect(() => {
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const slide = slides[current];
  const cfg = SLIDE_CONFIG[current % SLIDE_CONFIG.length];
  const { Icon } = cfg;

  return (
    <div
      className="relative overflow-hidden"
      style={{ minHeight: "52vh" }}
      onTouchStart={(e) => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 48) {
          diff > 0 ? next() : prev();
          resetInterval();
        }
      }}
    >
      {/* Animated background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} transition-all duration-700`} />
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl ${cfg.glowColor} transition-all duration-700`} />
      <div className={`absolute -bottom-16 right-0 w-72 h-72 rounded-full blur-3xl ${cfg.glowColor2} transition-all duration-700`} />
      {/* subtle grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      {/* Slide content */}
      <div
        key={current}
        className="relative flex flex-col items-center justify-center text-center px-6 py-14 md:py-20 min-h-[52vh] animate-fade-in-up"
      >
        {/* Icon bubble */}
        <div className={`mb-5 w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl border ${cfg.iconBg} flex items-center justify-center animate-bounce-in shadow-lg`}
          style={{ animationDelay: "80ms" }}>
          <Icon className={`w-8 h-8 md:w-10 md:h-10 ${cfg.iconColor} animate-float`} />
        </div>

        {/* Slide number badge */}
        <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-widest uppercase ${cfg.badge}`}
          style={{ animationDelay: "120ms" }}>
          {current + 1} / {total}
        </div>

        {/* Title */}
        <h2 className={`text-3xl md:text-5xl font-black mb-4 ${cfg.accent} leading-tight max-w-xl animate-fade-in-up`}
          style={{ animationDelay: "160ms" }}>
          {slide.title}
        </h2>

        {/* Description */}
        <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-md animate-fade-in"
          style={{ animationDelay: "240ms" }}>
          {slide.sub}
        </p>
      </div>

      {/* Left arrow */}
      <button
        onClick={() => { prev(); resetInterval(); }}
        aria-label="Previous"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white/70 hover:bg-black/50 hover:text-white transition backdrop-blur-sm"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Right arrow */}
      <button
        onClick={() => { next(); resetInterval(); }}
        aria-label="Next"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white/70 hover:bg-black/50 hover:text-white transition backdrop-blur-sm"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { goTo(i); resetInterval(); }}
            aria-label={`Slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current ? `w-5 h-2 ${cfg.dot}` : "w-2 h-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
