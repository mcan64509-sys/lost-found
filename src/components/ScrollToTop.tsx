"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Yukarı çık"
      className="fixed bottom-24 right-4 md:bottom-8 md:right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800/90 text-slate-300 shadow-lg shadow-black/40 backdrop-blur-sm hover:bg-slate-700 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200 animate-fade-in"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}
