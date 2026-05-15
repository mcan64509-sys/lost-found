"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";
import { normalizeEmail } from "../../lib/utils";
import { PRODUCTS, type ProductType } from "../../lib/stripe-products";
import { Loader2 } from "lucide-react";

function formatTL(cents: number) {
  return (cents / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
}

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemType, setItemType] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      const email = normalizeEmail(data.session?.user?.email);
      setUserEmail(email);
      if (!email) router.push("/auth/login");

      if (itemId) {
        const { data: item } = await supabase
          .from("items")
          .select("title, type")
          .eq("id", itemId)
          .single();
        if (item) {
          setItemTitle(item.title);
          setItemType(item.type);
        }
      }
    }
    load();
  }, [itemId, router]);

  const products = (Object.entries(PRODUCTS) as [ProductType, typeof PRODUCTS[ProductType]][]).filter(
    ([key]) => itemType === "found" ? key === "standart_ilan" : true
  );

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

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12">

          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-white mb-3">İlanını Öne Çıkar</h1>
            {itemTitle ? (
              <p className="text-slate-400">
                <span className="text-white font-semibold">"{itemTitle}"</span> ilanı için seçim yap
              </p>
            ) : (
              <p className="text-slate-400">Daha fazla kişiye ulaş, daha hızlı sonuç al</p>
            )}
          </div>

          {/* Free tier info */}
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-4 text-sm text-slate-300">
            <span className="font-semibold text-white">İlk 3 ilanın ücretsiz!</span>{" "}
            4. ilanından itibaren Standart, Acil veya Altın paket seçmelisin.
            Acil ilanlar en üst sıraya, Altın ilanlar hemen altına çıkar.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {products.map(([key, product]) => (
              <div
                key={key}
                className={`relative rounded-3xl border p-6 flex flex-col gap-4 transition hover:scale-[1.02] ${product.color}`}
              >
                <div>
                  <div className="text-3xl mb-2">{product.label.split(" ")[0]}</div>
                  <h3 className="font-black text-white text-lg">
                    {product.label.split(" ").slice(1).join(" ")}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{product.desc}</p>
                </div>

                <div className="py-3 border-t border-b border-white/10">
                  <span className="text-3xl font-black text-white">{formatTL(product.price_cents)}</span>
                  <span className="text-slate-500 text-sm ml-1">/ 30 gün</span>
                </div>

                <ul className="space-y-2 flex-1">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(key)}
                  disabled={loading === key}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition disabled:opacity-50 ${
                    key === "altin_ilan"
                      ? "bg-yellow-500 text-slate-900 hover:bg-yellow-400"
                      : key === "acil_ilan"
                      ? "bg-red-600 text-white hover:bg-red-500"
                      : "bg-slate-600 text-white hover:bg-slate-500"
                  }`}
                >
                  {loading === key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Satın Al"
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-xl mb-1">🔒</div>
                <div className="font-semibold text-white">Güvenli Ödeme</div>
                <div className="text-xs text-slate-500 mt-0.5">Stripe altyapısı, 256-bit SSL</div>
              </div>
              <div>
                <div className="text-xl mb-1">💳</div>
                <div className="font-semibold text-white">Tüm Kartlar</div>
                <div className="text-xs text-slate-500 mt-0.5">Visa, Mastercard, Troy</div>
              </div>
              <div>
                <div className="text-xl mb-1">📋</div>
                <div className="font-semibold text-white">30 Gün Geçerli</div>
                <div className="text-xs text-slate-500 mt-0.5">Otomatik abonelik yok</div>
              </div>
            </div>
          </div>

          {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes("test") && (
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-xs text-amber-400">
              🧪 Test modu — Gerçek ödeme alınmaz. Test kartı: <strong>4242 4242 4242 4242</strong>
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
