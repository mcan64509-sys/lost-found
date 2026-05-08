"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";
import { normalizeEmail } from "../../lib/utils";
import { toast } from "sonner";
import {
  Bell,
  Plus,
  Trash2,
  Search,
  Tag,
  MapPin,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";

type Alert = {
  id: string;
  user_email: string;
  keyword: string;
  category: string;
  item_type: string;
  location_name: string;
  radius_km: number;
  is_active: boolean;
  last_notified_at: string | null;
  created_at: string;
};

const CATEGORIES = [
  "Tüm kategoriler", "Cüzdan", "Telefon", "Anahtar", "Çanta",
  "Laptop", "Saat / Takı", "Kimlik / Evrak", "Diğer",
];

export default function AlertsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Tüm kategoriler");
  const [itemType, setItemType] = useState("all");
  const [locationName, setLocationName] = useState("");
  const [radiusKm, setRadiusKm] = useState(50);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const email = normalizeEmail(data.session?.user?.email);
      if (!email) {
        router.push("/auth/login");
        return;
      }
      setUserEmail(email);
      loadAlerts(email);
    }
    init();
  }, [router]);

  async function loadAlerts(email: string) {
    setLoading(true);
    const res = await fetch(`/api/alerts?userEmail=${encodeURIComponent(email)}`);
    const data = await res.json();
    setAlerts(data.alerts || []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!keyword.trim() && category === "Tüm kategoriler" && itemType === "all") {
      toast.error("En az bir filtre seçmelisin (anahtar kelime, kategori veya tür).");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: userEmail,
          keyword: keyword.trim(),
          category: category === "Tüm kategoriler" ? "" : category,
          item_type: itemType,
          location_name: locationName,
          radius_km: radiusKm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Uyarı oluşturulamadı.");
        return;
      }
      toast.success("Arama uyarısı oluşturuldu!");
      setAlerts((prev) => [data.alert, ...prev]);
      setShowForm(false);
      setKeyword("");
      setCategory("Tüm kategoriler");
      setItemType("all");
      setLocationName("");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/alerts?id=${id}&userEmail=${encodeURIComponent(userEmail)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Uyarı silindi.");
    }
  }

  async function handleToggle(alert: Alert) {
    const res = await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: alert.id, user_email: userEmail, is_active: !alert.is_active }),
    });
    if (res.ok) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_active: !a.is_active } : a))
      );
    }
  }

  const typeLabel = (t: string) => {
    if (t === "lost") return { label: "Kayıp", icon: <AlertCircle className="w-3 h-3" />, color: "text-amber-400 bg-amber-500/15 border-amber-500/25" };
    if (t === "found") return { label: "Bulundu", icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25" };
    return { label: "Tümü", icon: <Search className="w-3 h-3" />, color: "text-slate-400 bg-slate-700 border-slate-600" };
  };

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">

          {/* Başlık */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Arama Uyarıları</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Kriterlene uyan yeni ilan eklenince e-posta al
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "İptal" : "Yeni Uyarı"}
            </button>
          </div>

          {/* AÇIKLAMA */}
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/8 p-5">
            <p className="text-sm text-blue-200 leading-6">
              <strong className="text-white">Nasıl çalışır?</strong> Belirlediğin kriterlere uyan yeni bir ilan eklendiğinde
              sana e-posta bildirimi gönderilir. En fazla 10 uyarı oluşturabilirsin.
            </p>
          </div>

          {/* YENİ UYARI FORMU */}
          {showForm && (
            <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <h2 className="text-base font-bold text-white mb-4">Yeni Arama Uyarısı</h2>

              {/* Anahtar kelime */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Anahtar Kelime</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Örn: iPhone, cüzdan, çanta..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* İlan türü */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">İlan Türü</label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { value: "all", label: "Tümü" },
                      { value: "lost", label: "Kayıp ilanlar" },
                      { value: "found", label: "Bulundu ilanlar" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setItemType(t.value)}
                        className={`rounded-xl border px-3 py-2 text-sm text-left transition ${
                          itemType === t.value
                            ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                            : "border-slate-700 bg-slate-800/40 text-slate-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kategori */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Kategori</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-3 text-sm text-white outline-none"
                    >
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Konum (isteğe bağlı)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-500" />
                      <input
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Örn: İstanbul"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500 transition disabled:opacity-50"
                >
                  <Bell className="w-4 h-4" />
                  {creating ? "Oluşturuluyor..." : "Uyarı Oluştur"}
                </button>
              </div>
            </div>
          )}

          {/* ALERT LİSTESİ */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 p-14 text-center">
              <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-lg font-bold text-white mb-2">Henüz uyarı yok</p>
              <p className="text-sm text-slate-500 mb-6">
                Arama kriterleri belirle, eşleşen ilan eklenince e-posta al.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition"
              >
                <Plus className="w-4 h-4" />
                İlk uyarını oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const type = typeLabel(alert.item_type);
                return (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-5 transition ${
                      alert.is_active ? "border-slate-800 bg-slate-900/60" : "border-slate-800/50 bg-slate-900/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Kriterler */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${type.color}`}>
                            {type.icon}
                            {type.label}
                          </span>
                          {alert.keyword && (
                            <span className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                              <Search className="w-3 h-3" />
                              {alert.keyword}
                            </span>
                          )}
                          {alert.category && (
                            <span className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                              <Tag className="w-3 h-3" />
                              {alert.category}
                            </span>
                          )}
                          {alert.location_name && (
                            <span className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                              <MapPin className="w-3 h-3" />
                              {alert.location_name}
                            </span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.created_at).toLocaleDateString("tr-TR")}
                          </span>
                          {alert.last_notified_at && (
                            <span>Son bildirim: {new Date(alert.last_notified_at).toLocaleDateString("tr-TR")}</span>
                          )}
                        </div>
                      </div>

                      {/* Aksiyonlar */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggle(alert)}
                          className="text-slate-400 hover:text-white transition"
                          title={alert.is_active ? "Pasif yap" : "Aktif yap"}
                        >
                          {alert.is_active
                            ? <ToggleRight className="w-6 h-6 text-blue-400" />
                            : <ToggleLeft className="w-6 h-6" />
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {alerts.length > 0 && (
            <div className="mt-4 text-center text-xs text-slate-600">
              {alerts.length}/10 uyarı kullanılıyor
            </div>
          )}
        </div>
      </main>
    </>
  );
}
