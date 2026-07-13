"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, MessageCircle, FolderOpen } from "lucide-react";

const HIDE_ON = ["/admin", "/auth/", "/lost/report", "/found/report", "/items/", "/messages/"];

export default function BottomNav() {
  const pathname = usePathname();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[#1a2744] bg-[#070d1c]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", transform: "translateZ(0)" }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-1.5">
        <NavItem href="/" label="Anasayfa" icon={<Home className="w-5 h-5" />} active={pathname === "/"} />
        <NavItem href="/search" label="Ara" icon={<Search className="w-5 h-5" />} active={pathname.startsWith("/search")} />

        {/* Merkez CTA butonu */}
        <Link href="/lost/report" className="flex flex-col items-center gap-1 -mt-5">
          <div className="w-13 h-13 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40 hover:bg-blue-500 active:scale-95 transition-all w-[52px] h-[52px]">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] text-slate-500 font-medium">İlan Ver</span>
        </Link>

        <NavItem href="/messages" label="Mesajlar" icon={<MessageCircle className="w-5 h-5" />} active={pathname.startsWith("/messages")} />
        <NavItem href="/my-items" label="İlanlarım" icon={<FolderOpen className="w-5 h-5" />} active={pathname.startsWith("/my-items")} />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
        active ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
