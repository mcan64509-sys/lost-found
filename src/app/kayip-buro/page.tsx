"use client";

import Link from "next/link";
import AppHeader from "../../components/AppHeader";

const BUREAUS = [
  {
    city: "İstanbul",
    emoji: "🏙️",
    offices: [
      { name: "İstanbul Emniyet Müdürlüğü — Kayıp Eşya Bürosu", address: "Vatan Cad. No:1, Fatih/İstanbul", phone: "0212 636 44 44", note: "İlgili ilçe karakoluna başvurun." },
      { name: "İBB Müşteri Hizmetleri", address: "Saraçhane, Fatih/İstanbul", phone: "153", note: "Toplu taşıma (metro, otobüs) kayıp eşyaları için." },
    ],
  },
  {
    city: "Ankara",
    emoji: "🏛️",
    offices: [
      { name: "Ankara İl Emniyet Müdürlüğü — Kayıp Eşya", address: "Dikmen Cad., Çankaya/Ankara", phone: "0312 466 44 55", note: "Kayıp eşyalar için ilgili ilçe emniyetine başvurun." },
      { name: "EGO Genel Müdürlüğü", address: "Hipodrom Cad. No:5, Altındağ/Ankara", phone: "0312 212 50 00", note: "Toplu taşıma araçlarında unutulan eşyalar için." },
    ],
  },
  {
    city: "İzmir",
    emoji: "🌊",
    offices: [
      { name: "İzmir İl Emniyet Müdürlüğü", address: "Konak/İzmir", phone: "0232 483 70 70", note: "Kaybolan eşyaları en yakın karakola bildirin." },
      { name: "İzmir Büyükşehir Belediyesi — ESHOT", address: "Konak/İzmir", phone: "0232 461 31 00", note: "Şehir içi ulaşımda kayıp eşyalar için." },
    ],
  },
  {
    city: "Bursa",
    emoji: "🌿",
    offices: [
      { name: "Bursa İl Emniyet Müdürlüğü", address: "Setbaşı Mah., Osmangazi/Bursa", phone: "0224 295 50 00", note: "Kayıp bildirimi için ilçe emniyetine başvurun." },
      { name: "Bursaray (BursaUlaşım)", address: "Osmangazi/Bursa", phone: "0224 716 77 77", note: "Metro veya otobüste unutulan eşyalar." },
    ],
  },
  {
    city: "Antalya",
    emoji: "🌴",
    offices: [
      { name: "Antalya İl Emniyet Müdürlüğü", address: "Güzeloba Mah., Muratpaşa/Antalya", phone: "0242 345 12 00", note: "Kayıp eşya bildirimi için." },
      { name: "Antalya Büyükşehir Belediyesi Ulaşım", address: "Muratpaşa/Antalya", phone: "0242 249 21 00", note: "Toplu taşıma araçlarındaki kayıplar için." },
    ],
  },
  {
    city: "Hava Limanları",
    emoji: "✈️",
    offices: [
      { name: "İstanbul Havalimanı — Kayıp Eşya", address: "İstanbul Airport, Arnavutköy/İstanbul", phone: "444 1 442", note: "Uçuşlarda unutulan eşyalar için hava limanı kayıp eşya bürosu." },
      { name: "Sabiha Gökçen Havalimanı", address: "Pendik/İstanbul", phone: "0216 588 80 00", note: "Kayıp eşya için havalimanı güvenlik masasına başvurun." },
      { name: "Esenboğa Havalimanı (Ankara)", address: "Akyurt/Ankara", phone: "0312 590 40 00", note: "Uçuş kayıp eşyaları için Esenboğa Havalimanı kayıp bürosu." },
    ],
  },
];

const TIPS = [
  { icon: "📋", title: "Tutanak Alın", desc: "Kayıp eşyaları için mutlaka resmi tutanak veya kayıp belgesi alın. Sigorta ve takip için gereklidir." },
  { icon: "📸", title: "Fotoğraf Saklayın", desc: "Değerli eşyalarınızın fotoğraflarını ve seri numaralarını saklayın. Bulma sürecini kolaylaştırır." },
  { icon: "⏰", title: "Hemen Bildirin", desc: "Kayıp fark edildiği anda ilgili yere bildirin. İlk 24-48 saat en kritik süreçtir." },
  { icon: "🔔", title: "BulanVarMı? Kullanın", desc: "BulanVarMı? üzerinden ilan verin. Yapay zeka eşleştirme ile çok daha hızlı sonuç alabilirsiniz." },
];

export default function KayipBuroPage() {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">

          <div className="mb-4">
            <Link href="/" className="text-sm text-slate-500 hover:text-white transition">← Ana Sayfa</Link>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/25 mb-4">
              <span className="text-3xl">🏢</span>
            </div>
            <h1 className="text-3xl font-black mb-2">Kayıp Eşya Büroları</h1>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Türkiye'deki resmi kayıp eşya büroları ve emniyet müdürlüklerinin iletişim bilgileri.
            </p>
          </div>

          {/* CTA Banner */}
          <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="text-3xl">💡</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold text-amber-300 text-sm">BulanVarMı? ile daha hızlı bulun</p>
              <p className="text-xs text-slate-400 mt-1">Resmi yolların yanı sıra platformumuza ilan vererek yapay zeka destekli eşleştirme ile daha hızlı sonuç alabilirsiniz.</p>
            </div>
            <Link
              href="/lost/report"
              className="flex-shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              Kayıp İlanı Ver →
            </Link>
          </div>

          {/* Bureaus by city */}
          <div className="space-y-6 mb-10">
            {BUREAUS.map((b) => (
              <div key={b.city} className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-800/50">
                  <span className="text-2xl">{b.emoji}</span>
                  <h2 className="font-bold text-white">{b.city}</h2>
                </div>
                <div className="divide-y divide-slate-800">
                  {b.offices.map((o, i) => (
                    <div key={i} className="px-5 py-4">
                      <p className="font-semibold text-white text-sm mb-1">{o.name}</p>
                      <p className="text-xs text-slate-500 mb-1">📍 {o.address}</p>
                      <p className="text-xs text-blue-400 mb-1">📞 {o.phone}</p>
                      {o.note && <p className="text-xs text-slate-600 italic">{o.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">Kayıp Eşya İpuçları</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TIPS.map((tip) => (
                <div key={tip.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex gap-3">
                  <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{tip.title}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-slate-700 mt-8">
            Bu bilgiler genel bilgi amaçlıdır. Güncel iletişim bilgileri için lütfen resmi kurumların web sitelerini kontrol edin.
          </p>
        </div>
      </main>
    </>
  );
}
