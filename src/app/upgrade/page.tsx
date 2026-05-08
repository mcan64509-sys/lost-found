"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";
import { normalizeEmail } from "../../lib/utils";
import { PRODUCTS, type ProductType } from "../../lib/stripe";
import { Star, Zap, Check, ArrowRight, Loader2 } from "lucide-react";

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      const email = normalizeEmail(data.session?.user?.email);
      setUserEmail(email);
      if (!email) router.push("/auth/login");

      if (itemId) {
        const { data: item } = await supabase.from("items").select("title").eq("id", itemId).single();
        if (item) setItemTitle(item.title);
      }
    }
    load();
  }, [itemId, router]);

  async function handleCheckout(productType: ProductType) {
    if (!userEmail) { router.push("/auth/login"); return; }
    setLoading(productType);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType, itemId, userEmail }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Ödeme başlatılamadı: " + data.error);
    } finally {
      setLoading(null);
    }
  }

  const products = Object.entries(PRODUCTS) as [ProductType, typeof PRODUCTS[ProductType]][];

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12">

          {/* Başlık */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-4xl font-black text-white mb-3">İlanını Öne Çıkar</h1>
            {itemTitle ? (
              <p className="text-slate-400">
                <span className="text-white font-semibold">"{itemTitle}"</span> ilanı için öncelik seç
              </p>
            ) : (
              <p className="text-slate-400">Daha fazla kişiye ulaş, daha hızlı sonuç al</p>
            )}
          </div>

          {/* Ürün kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {products.map(([key, product]) => {
              const isSubscription = key === "subscription_monthly";
              const price = (product.price_cents / 100).toFixed(2);

              return (
                <div
                  key={key}
                  className={`relative rounded-3xl border p-6 flex flex-col ${product.color} ${isSubscription ? "ring-2 ring-purple-500/50" : ""}`}
                >
                  {isSubscription && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      EN İYİ DEĞER
                    </div>
                  )}

                  <div className="text-3xl mb-3">{product.label.split(" ")[0]}</div>
                  <h3 className="font-black text-white text-lg mb-1">
                    {product.label.split(" ").slice(1).join(" ")}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 flex-1">{product.desc}</p>

                  <div className="mb-4">
                    <span className="text-3xl font-black text-white">€{price}</span>
                    {isSubscription && <span className="text-slate-500 text-sm">/ay</span>}
                    {!isSubscription && <span className="text-slate-500 text-sm"> / 30 gün</span>}
                  </div>

                  {/* Özellikler */}
                  <ul className="space-y-1.5 mb-5">
                    {key === "priority_bronze" && [
                      "Listede öne çıkar",
                      "Bronz rozet",
                      "30 gün geçerli",
                    ].map((f) => <li key={f} className="flex items-center gap-2 text-xs text-slate-400"><Check className="w-3 h-3 text-amber-600" />{f}</li>)}
                    {key === "priority_silver" && [
                      "Üst sıralarda gösterilir",
                      "Gümüş rozet",
                      "30 gün geçerli",
                    ].map((f) => <li key={f} className="flex items-center gap-2 text-xs text-slate-400"><Check className="w-3 h-3 text-slate-300" />{f}</li>)}
                    {key === "priority_gold" && [
                      "En üst sırada",
                      "Altın rozet",
                      "30 gün geçerli",
                    ].map((f) => <li key={f} className="flex items-center gap-2 text-xs text-slate-400"><Check className="w-3 h-3 text-yellow-400" />{f}</li>)}
                    {key === "subscription_monthly" && [
                      "Sınırsız Altın ilan",
                      "Her ay otomatik yenilenir",
                      "İstediğin zaman iptal",
                    ].map((f) => <li key={f} className="flex items-center gap-2 text-xs text-slate-400"><Check className="w-3 h-3 text-purple-400" />{f}</li>)}
                  </ul>

                  <button
                    onClick={() => handleCheckout(key)}
                    disabled={loading === key}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                      isSubscription
                        ? "bg-purple-500 text-white hover:bg-purple-400"
                        : "bg-white/10 text-white hover:bg-white/20"
                    } disabled:opacity-50`}
                  >
                    {loading === key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>Satın Al <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Güven bilgileri */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-xl mb-1">🔒</div>
                <div className="font-semibold text-white">Güvenli Ödeme</div>
                <div className="text-xs text-slate-500 mt-0.5">Stripe altyapısı, 256-bit SSL şifreleme</div>
              </div>
              <div>
                <div className="text-xl mb-1">💳</div>
                <div className="font-semibold text-white">Tüm Kartlar Kabul</div>
                <div className="text-xs text-slate-500 mt-0.5">Visa, Mastercard, American Express</div>
              </div>
              <div>
                <div className="text-xl mb-1">↩️</div>
                <div className="font-semibold text-white">İptal Garantisi</div>
                <div className="text-xs text-slate-500 mt-0.5">Aboneliği istediğin zaman iptal edebilirsin</div>
              </div>
            </div>
          </div>

          {/* Test modu notu */}
          {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes("test") && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-400">
              🧪 Test modu aktif — Gerçek ödeme alınmaz. Test kartı: <strong>4242 4242 4242 4242</strong>, tarih: herhangi gelecek tarih, CVV: herhangi 3 rakam
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function UpgradePage() {
  return (
    <Suspense>
      <UpgradeContent />
    </Suspense>
  );
}
