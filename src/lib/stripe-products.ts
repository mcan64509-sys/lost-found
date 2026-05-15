export const PRODUCTS = {
  standart_ilan: {
    label: "📋 Standart İlan",
    desc: "İlk 3 ilanınız ücretsiz. Ek ilanlar için Standart paket.",
    price_cents: 999, // 9,99 ₺
    currency: "try",
    priority_level: 1,
    is_urgent: false,
    days: 30,
    color: "border-slate-500/50 bg-slate-500/10 text-slate-300",
    features: [
      "📋 Standart ilan rozeti",
      "30 gün yayında kalır",
      "Arama sonuçlarında görünür",
    ],
  },
  acil_ilan: {
    label: "🚨 Acil İlan",
    desc: "En üst sıralarda gösterilir — acil kayıp durumları için",
    price_cents: 2999, // 29,99 ₺
    currency: "try",
    priority_level: 3,
    is_urgent: true,
    days: 30,
    color: "border-red-500/50 bg-red-500/10 text-red-400",
    features: [
      "🚨 Kırmızı Acil rozeti",
      "Tüm ilanların EN ÜSTÜNDE çıkar",
      "30 gün geçerli",
    ],
  },
  altin_ilan: {
    label: "⭐ Altın İlan",
    desc: "Üst sıralarda yüksek görünürlük — geniş kitlelere ulaş",
    price_cents: 4999, // 49,99 ₺
    currency: "try",
    priority_level: 2,
    is_urgent: false,
    days: 30,
    color: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
    features: [
      "⭐ Altın rozet",
      "Acil ilanların hemen altında",
      "30 gün geçerli",
    ],
  },
} as const;

export type ProductType = keyof typeof PRODUCTS;
