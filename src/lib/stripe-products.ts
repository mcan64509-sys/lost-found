export const PRODUCTS = {
  acil_ilan: {
    label: "🚨 Acil İlan",
    desc: "30 gün boyunca 'Acil' rozeti ile üst sıralarda gösterilir",
    price_cents: 2999, // 29,99 ₺
    currency: "try",
    priority_level: 1,
    is_urgent: true,
    days: 30,
    color: "border-red-500/50 bg-red-500/10 text-red-400",
    features: [
      "🚨 Kırmızı Acil rozeti",
      "Arama listesinde öne çıkar",
      "30 gün geçerli",
    ],
  },
  altin_ilan: {
    label: "⭐ Altın İlan",
    desc: "30 gün maksimum görünürlük, arama sonuçlarında en üst sıra",
    price_cents: 4999, // 49,99 ₺
    currency: "try",
    priority_level: 3,
    is_urgent: false,
    days: 30,
    color: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
    features: [
      "⭐ Altın rozet",
      "En üst sırada listelenir",
      "30 gün geçerli",
    ],
  },
} as const;

export type ProductType = keyof typeof PRODUCTS;
