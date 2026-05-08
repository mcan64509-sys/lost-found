export const PRODUCTS = {
  priority_bronze: {
    label: "🥉 Bronz Öncelik",
    desc: "30 gün boyunca ilanın listede öne çıkar",
    price_cents: 199,
    currency: "eur",
    priority_level: 1,
    days: 30,
    color: "border-amber-800/50 bg-amber-900/10 text-amber-600",
  },
  priority_silver: {
    label: "🥈 Gümüş Öncelik",
    desc: "30 gün üst sıralarda gösterilir",
    price_cents: 349,
    currency: "eur",
    priority_level: 2,
    days: 30,
    color: "border-slate-500/50 bg-slate-700/20 text-slate-300",
  },
  priority_gold: {
    label: "🥇 Altın Öncelik",
    desc: "30 gün maksimum görünürlük, en üst sıra",
    price_cents: 499,
    currency: "eur",
    priority_level: 3,
    days: 30,
    color: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  },
  subscription_monthly: {
    label: "⭐ Aylık Abonelik",
    desc: "Sınırsız Altın öncelikli ilan, her ay otomatik yenilenir",
    price_cents: 399,
    currency: "eur",
    priority_level: 3,
    days: 30,
    color: "border-purple-500/50 bg-purple-500/10 text-purple-400",
  },
} as const;

export type ProductType = keyof typeof PRODUCTS;
