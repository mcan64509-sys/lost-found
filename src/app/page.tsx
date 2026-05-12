"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { supabase } from "../lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MapPin,
  MessageCircle,
  Bell,
  Star,
  Shield,
  Zap,
  FileText,
  HandshakeIcon,
  PlusCircle,
  ScanSearch,
  Search,
  Eye,
  ChevronDown,
} from "lucide-react";

type PriorityPreview = {
  id: string;
  title: string;
  type: string;
  image_url: string | null;
  priority_level: number;
  category: string | null;
  location: string | null;
  reward_amount: number | null;
};

export default function HomePage() {
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, resolved: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [priorityItems, setPriorityItems] = useState<PriorityPreview[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setShowPopup(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function loadStats() {
      const [
        { count: total },
        { count: lost },
        { count: found },
        { count: resolved },
      ] = await Promise.all([
        supabase.from("items").select("*", { count: "exact", head: true }),
        supabase.from("items").select("*", { count: "exact", head: true }).eq("type", "lost"),
        supabase.from("items").select("*", { count: "exact", head: true }).eq("type", "found"),
        supabase.from("items").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      ]);
      setStats({
        total: total ?? 0,
        lost: lost ?? 0,
        found: found ?? 0,
        resolved: resolved ?? 0,
      });
      setStatsLoaded(true);
    }
    async function loadPriority() {
      const { data } = await supabase
        .from("items")
        .select("id,title,type,image_url,priority_level,category,location,reward_amount")
        .gt("priority_level", 0)
        .neq("status", "resolved")
        .order("priority_level", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6);
      setPriorityItems((data as PriorityPreview[]) ?? []);
    }
    loadStats();
    loadPriority();
  }, []);

  return (
    <>
      <AppHeader />

      {/* Bilgi pop-up */}
      {showPopup && (
        <div className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 animate-fade-in-down">
          <div className="w-full max-w-sm flex items-start gap-3 rounded-2xl border border-blue-500/30 bg-slate-900/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/40">
            <Zap className="mt-0.5 w-4 h-4 shrink-0 fill-blue-400 text-blue-400" />
            <p className="text-xs text-slate-300 leading-5">
              Uygulamamız Hakkında İlgi Çekici Detaylar İçin Lütfen Göz Atın
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="ml-auto shrink-0 text-slate-500 hover:text-slate-300 transition text-base leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <main className="bg-slate-950 text-white">

        {/* ══════════════════════════════════════════════════════════
            1. HERO — Platform kimliği ve ana aksiyon
        ══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center">
          {/* Dekoratif arka plan */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-60 -left-32 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl" />
            <div className="absolute -top-20 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-emerald-600/6 blur-3xl" />
            {/* Grid deseni */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28 w-full">
            {/* Üst etiket */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-5 py-2 text-sm text-blue-300">
                <Zap className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                Türkiye'nin kayıp &amp; buluntu platformu
              </div>
            </div>

            {/* Ana başlık */}
            <div className="text-center max-w-5xl mx-auto mb-8">
              <h1 className="text-5xl font-black leading-[1.1] md:text-7xl lg:text-8xl">
                <span className="text-amber-400">Kayıp</span> eşyaları bul,{" "}
                <br className="hidden sm:block" />
                <span className="text-emerald-400">bulunanları</span> sahibine{" "}
                <br className="hidden sm:block" />
                kavuştur.
              </h1>
              <p className="mt-8 text-lg leading-8 text-slate-400 md:text-xl max-w-2xl mx-auto">
                İlan oluştur, yapay zeka eşleştirmesiyle sahiplerini bul,
                güvenli talep sistemiyle teslim et. Hızlı, şeffaf ve güvenilir.
              </p>
            </div>

            {/* CTA Butonları */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={() => router.push("/lost/report")}
                className="group flex items-center justify-center gap-3 rounded-2xl bg-amber-500 px-8 py-4 text-base font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
              >
                <AlertCircle className="w-5 h-5" />
                Kayıp İlanı Ver
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => router.push("/found/report")}
                className="group flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                Bulundu İlanı Ver
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/search"
                className="flex items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-8 py-4 text-base font-bold text-white hover:border-slate-600 hover:bg-slate-800 transition-all"
              >
                <ScanSearch className="w-5 h-5 text-slate-400" />
                İlanları Ara
              </Link>
            </div>

            {/* İstatistik bantı */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-12">
              {[
                { label: "Toplam İlan", value: statsLoaded ? stats.total : "—", color: "text-white" },
                { label: "Kayıp İlanı", value: statsLoaded ? stats.lost : "—", color: "text-amber-400" },
                { label: "Bulundu İlanı", value: statsLoaded ? stats.found : "—", color: "text-emerald-400" },
                { label: "Çözüme Kavuştu", value: statsLoaded ? stats.resolved : "—", color: "text-blue-400" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Aşağı ok */}
            <div className="flex justify-center mt-8 animate-bounce">
              <ChevronDown className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            2. NE YAPMAK İSTİYORSUN? — İki net akış
        ══════════════════════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60 bg-slate-900/20">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Senin için ne yapabiliriz?</span>
              <h2 className="text-3xl font-black text-white md:text-4xl">
                İki farklı senaryo, tek platform
              </h2>
              <p className="mt-4 text-slate-500 max-w-xl mx-auto text-sm leading-7">
                Eşyaını mı kaybettin yoksa bir eşya mı buldun?
                Her iki durum için de ayrı ve detaylı bir süreç sunuyoruz.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">

              {/* KAYIP KARTI */}
              <div className="group relative rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-8 hover:border-amber-500/40 transition-all">
                <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-30 transition-opacity">
                  <AlertCircle className="w-20 h-20 text-amber-500" />
                </div>
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-5">
                    <AlertCircle className="w-3 h-3" />
                    Eşyamı kaybettim
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">Kayıp İlanı</h3>
                  <p className="text-slate-400 text-sm leading-7 mb-6">
                    Kaybettiğin eşyayı sisteme ekle. Birisi bulduysa ve ilan verdiyse
                    yapay zeka otomatik eşleştirme yapar ve sana bildirim gönderir.
                  </p>

                  <div className="space-y-4 mb-8">
                    {[
                      { n: "01", t: "Eşyayı tarif et", d: "İsim, kategori, açıklama ve fotoğraf ekle" },
                      { n: "02", t: "Konum & tarih gir", d: "Kaybettiğin yer ve tarihi belirt" },
                      { n: "03", t: "AI eşleştirme başlar", d: "Sistem benzer ilanları otomatik tarar" },
                      { n: "04", t: "Talep al & teslim et", d: "Gelen talebi değerlendir, mesajlaş" },
                    ].map((s) => (
                      <div key={s.n} className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
                          {s.n}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">{s.t}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{s.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => router.push("/lost/report")}
                      className="group/btn w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-4 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-all"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Kayıp İlanı Oluştur
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <Link
                      href="/search?type=found"
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-500/25 px-6 py-3 text-sm font-semibold text-amber-400 hover:bg-amber-500/10 transition-all"
                    >
                      <Search className="w-4 h-4" />
                      Bulunan ilanları tara
                    </Link>
                  </div>
                </div>
              </div>

              {/* BULUNDU KARTI */}
              <div className="group relative rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 p-8 hover:border-emerald-500/40 transition-all">
                <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-30 transition-opacity">
                  <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                </div>
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-5">
                    <CheckCircle2 className="w-3 h-3" />
                    Bir eşya buldum
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">Bulundu İlanı</h3>
                  <p className="text-slate-400 text-sm leading-7 mb-6">
                    Birinin eşyasını bulduysan sisteme ekle. Sahibi ilan oluşturmuşsa
                    eşleştirme otomatik yapılır. Sahibi talep gönderince sen onaylarsın.
                  </p>

                  <div className="space-y-4 mb-8">
                    {[
                      { n: "01", t: "Eşyayı tarif et", d: "İsim, kategori, açıklama ve fotoğraf ekle" },
                      { n: "02", t: "Konum & tarih gir", d: "Nerede, ne zaman bulduğunu belirt" },
                      { n: "03", t: "Sahip talep gönderir", d: "Sistem sahibini arar ve bildirim gönderir" },
                      { n: "04", t: "Talebi onayla & teslim et", d: "Talebi değerlendir, mesajlaş, teslim et" },
                    ].map((s) => (
                      <div key={s.n} className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {s.n}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">{s.t}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{s.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => router.push("/found/report")}
                      className="group/btn w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-all"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Bulundu İlanı Oluştur
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <Link
                      href="/search?type=lost"
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 px-6 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    >
                      <Search className="w-4 h-4" />
                      Kayıp ilanlarını tara
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3. NASIL ÇALIŞIR — Süreç özeti
        ══════════════════════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Süreç</span>
              <h2 className="text-3xl font-black text-white md:text-4xl">Nasıl çalışır?</h2>
              <p className="mt-4 text-slate-500 max-w-xl mx-auto text-sm leading-7">
                Kayıp eşyandan eşleşmeye, eşleşmeden güvenli teslime kadar
                tüm adımlar tek platformda.
              </p>
            </div>

            {/* Adım çizgisi */}
            <div className="relative">
              {/* Yatay çizgi - masaüstü */}
              <div className="hidden lg:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

              <div className="grid lg:grid-cols-4 gap-8">
                {[
                  {
                    icon: <FileText className="w-6 h-6 text-blue-400" />,
                    bg: "bg-blue-500/10 border-blue-500/20",
                    iconBg: "bg-blue-500/20",
                    num: "1",
                    title: "İlan Oluştur",
                    desc: "Kaybettiğin veya bulduğun eşyayı detaylı tarif et. Fotoğraf, konum ve kategori ekle.",
                  },
                  {
                    icon: <Zap className="w-6 h-6 text-violet-400" />,
                    bg: "bg-violet-500/10 border-violet-500/20",
                    iconBg: "bg-violet-500/20",
                    num: "2",
                    title: "AI Eşleştirme",
                    desc: "Yapay zeka, kayıp ve bulundu ilanlarını karşılaştırarak benzer eşyaları otomatik eşleştirir.",
                  },
                  {
                    icon: <Shield className="w-6 h-6 text-amber-400" />,
                    bg: "bg-amber-500/10 border-amber-500/20",
                    iconBg: "bg-amber-500/20",
                    num: "3",
                    title: "Güvenli Talep",
                    desc: "Eşya sahibi sahiplik talebi gönderir. İlan sahibi talebi inceler ve onaylar veya reddeder.",
                  },
                  {
                    icon: <HandshakeIcon className="w-6 h-6 text-emerald-400" />,
                    bg: "bg-emerald-500/10 border-emerald-500/20",
                    iconBg: "bg-emerald-500/20",
                    num: "4",
                    title: "Teslim",
                    desc: "Talep onaylanınca mesajlaşma kanalı açılır. Buluşma noktası belirlenir, eşya teslim edilir.",
                  },
                ].map((step) => (
                  <div key={step.num} className={`relative rounded-3xl border ${step.bg} p-7 text-center`}>
                    <div className="flex justify-center mb-5">
                      <div className={`w-14 h-14 rounded-2xl ${step.iconBg} flex items-center justify-center`}>
                        {step.icon}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Adım {step.num}</div>
                    <h3 className="text-lg font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-6">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            4. PLATFORM ÖZELLİKLERİ
        ══════════════════════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60 bg-slate-900/20">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Neler var?</span>
              <h2 className="text-3xl font-black text-white md:text-4xl">Platform özellikleri</h2>
              <p className="mt-4 text-slate-500 max-w-xl mx-auto text-sm leading-7">
                Kayıp eşyaları bulmayı kolaylaştıran tüm araçlar tek çatı altında.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: <Zap className="w-5 h-5 text-violet-400" />,
                  iconBg: "bg-violet-500/15",
                  title: "Yapay Zeka Eşleştirme",
                  desc: "Sistem, kayıp ve bulundu ilanlarını metinsel benzerlik ile otomatik eşleştirir. Benzer eşyalar için anında bildirim.",
                  tag: "AI Destekli",
                  tagColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
                },
                {
                  icon: <MessageCircle className="w-5 h-5 text-blue-400" />,
                  iconBg: "bg-blue-500/15",
                  title: "Anlık Mesajlaşma",
                  desc: "Sahiplik talebi onaylanınca güvenli bir mesajlaşma kanalı açılır. Kişisel bilgi paylaşmak zorunda kalmazsın.",
                  tag: "Gerçek Zamanlı",
                  tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                },
                {
                  icon: <Bell className="w-5 h-5 text-amber-400" />,
                  iconBg: "bg-amber-500/15",
                  title: "Akıllı Bildirimler",
                  desc: "Yeni eşleşme, talep veya mesaj geldiğinde uygulama içi ve e-posta bildirimi alırsın. Hiçbir şeyi kaçırmazsın.",
                  tag: "E-posta + Uygulama",
                  tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                },
                {
                  icon: <MapPin className="w-5 h-5 text-emerald-400" />,
                  iconBg: "bg-emerald-500/15",
                  title: "Harita ile Arama",
                  desc: "İlanları harita üzerinde gör. Belirli bir konuma yakın ilanları km bazında filtrele. Interaktif harita desteği.",
                  tag: "Konum Tabanlı",
                  tagColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  icon: <Shield className="w-5 h-5 text-rose-400" />,
                  iconBg: "bg-rose-500/15",
                  title: "Güvenli Talep Sistemi",
                  desc: "Sahiplik talebi sistemi, eşyaların gerçek sahibine ulaşmasını sağlar. Şüpheli talepleri raporla, güvenli kal.",
                  tag: "Doğrulanmış",
                  tagColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                },
                {
                  icon: <Star className="w-5 h-5 text-yellow-400" />,
                  iconBg: "bg-yellow-500/15",
                  title: "Puanlama & Güven",
                  desc: "Başarılı teslimler sonrası kullanıcılar birbirini puanlar. Güvenilir bir profil oluştur, toplulukla güvende kal.",
                  tag: "Topluluk",
                  tagColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
                },
                {
                  icon: <Eye className="w-5 h-5 text-cyan-400" />,
                  iconBg: "bg-cyan-500/15",
                  title: "İlan Takibi",
                  desc: "İlanlarını tek panelden yönet. Görüntülenme sayısını izle. Süresi dolan ilanları bir tıkla 60 gün uzat.",
                  tag: "Panel",
                  tagColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                },
                {
                  icon: <Search className="w-5 h-5 text-pink-400" />,
                  iconBg: "bg-pink-500/15",
                  title: "Gelişmiş Arama",
                  desc: "Kategori, konum, tarih ve tipe göre filtrele. En yeni, en eski veya en çok görüntülenen sırasında listele.",
                  tag: "Filtreleme",
                  tagColor: "text-pink-400 bg-pink-500/10 border-pink-500/20",
                },
                {
                  icon: <HandshakeIcon className="w-5 h-5 text-orange-400" />,
                  iconBg: "bg-orange-500/15",
                  title: "Çözüme Kavuşma Takibi",
                  desc: "Eşya teslim edilince ilan 'Çözüldü' olarak işaretlenir. Hem kayıp hem bulundu tarafı puanlama yapabilir.",
                  tag: "Şeffaf",
                  tagColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center flex-shrink-0`}>
                      {f.icon}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${f.tagColor}`}>
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-6">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            5. Öncelikli İlanlar + Hızlı Erişim
        ══════════════════════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60 bg-slate-900/20">
          <div className="mx-auto max-w-7xl px-6 py-16">
            {/* Hızlı Erişim Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
              <Link href="/map" className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all">
                <div className="text-3xl mb-3">🗺️</div>
                <h3 className="font-bold text-white mb-1">Harita Görünümü</h3>
                <p className="text-sm text-slate-500">Kayıp ve bulunan eşyaları harita üzerinde görüntüle, konuma göre ara</p>
                <div className="mt-3 text-xs font-semibold text-blue-400 group-hover:text-blue-300 flex items-center gap-1">Haritayı Aç <ArrowRight className="w-3 h-3" /></div>
              </Link>
              <Link href="/priority" className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all">
                <div className="text-3xl mb-3">⭐</div>
                <h3 className="font-bold text-white mb-1">Öncelikli İlanlar</h3>
                <p className="text-sm text-slate-500">Öne çıkarılmış, ödüllü ve acil ilanları tek sayfada gör</p>
                <div className="mt-3 text-xs font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">Öncelikli İlanlar <ArrowRight className="w-3 h-3" /></div>
              </Link>
              <Link href="/pets" className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-pink-500/40 hover:bg-pink-500/5 transition-all">
                <div className="text-3xl mb-3">🐾</div>
                <h3 className="font-bold text-white mb-1">Evcil Hayvanlar</h3>
                <p className="text-sm text-slate-500">Kayıp ve bulunan evcil hayvanlar için özel ilan sayfası</p>
                <div className="mt-3 text-xs font-semibold text-pink-400 group-hover:text-pink-300 flex items-center gap-1">Hayvan İlanları <ArrowRight className="w-3 h-3" /></div>
              </Link>
            </div>

            {/* Öncelikli İlanlar Bölümü */}
            {priorityItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Öncelikli İlanlar</h2>
                      <p className="text-xs text-slate-500">Öne çıkarılmış en güncel ilanlar</p>
                    </div>
                  </div>
                  <Link href="/priority" className="text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition">
                    Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {priorityItems.map((item) => (
                    <Link key={item.id} href={`/items/${item.id}`} className="group rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-amber-500/30 transition">
                      <div className="h-28 bg-slate-800 overflow-hidden relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            {item.category === "Evcil Hayvan" ? "🐾" : "📦"}
                          </div>
                        )}
                        <div className="absolute top-1 left-1">
                          <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full">
                            {item.priority_level === 3 ? "🥇" : item.priority_level === 2 ? "🥈" : "🥉"}
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{item.title}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{item.type === "lost" ? "Kayıp" : "Bulundu"}</p>
                        {item.reward_amount && item.reward_amount > 0 && (
                          <p className="text-[10px] font-bold text-emerald-400 mt-0.5">💰 {item.reward_amount.toLocaleString("tr-TR")} TL</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            6. CTA — Son aksiyon çağrısı
        ══════════════════════════════════════════════════════════ */}
        <section className="border-t border-slate-800/60">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-12 text-center relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-amber-500/8 blur-3xl" />
                <div className="absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-emerald-500/8 blur-3xl" />
              </div>
              <div className="relative">
                <h2 className="text-3xl font-black text-white md:text-4xl mb-4">
                  Eşyaların için harekete geç
                </h2>
                <p className="text-slate-400 text-sm mb-10 max-w-lg mx-auto leading-7">
                  Platform ücretsiz. Kayıp ilanı ver, bulundu ilanı oluştur
                  veya mevcut ilanları tara. Kayıt olman yeterli.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => router.push("/lost/report")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-8 py-4 text-sm font-bold text-slate-950 hover:bg-amber-400 transition"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Kayıp İlanı Ver
                  </button>
                  <button
                    onClick={() => router.push("/found/report")}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Bulundu İlanı Ver
                  </button>
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-8 py-4 text-sm font-bold text-white hover:bg-slate-800 transition"
                  >
                    <ScanSearch className="w-4 h-4 text-slate-400" />
                    İlanları İncele
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-slate-800/60">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-white">Lost &amp; Found</div>
                <div className="text-xs text-slate-600 mt-1">
                  © {new Date().getFullYear()} Kayıp eşyaları bul, sahibine kavuştur.
                </div>
              </div>
              <div className="flex flex-wrap gap-5 text-xs text-slate-600">
                <Link href="/gizlilik" className="hover:text-slate-400 transition">Gizlilik Politikası</Link>
                <Link href="/kullanim-sartlari" className="hover:text-slate-400 transition">Kullanım Şartları</Link>
                <Link href="/iade-politikasi" className="hover:text-slate-400 transition">İade Politikası</Link>
                <Link href="/favorites" className="hover:text-slate-400 transition">Favorilerim</Link>
                <Link href="/search" className="hover:text-slate-400 transition">Tüm İlanlar</Link>
              </div>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
