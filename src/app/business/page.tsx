"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/supabase";
import { normalizeEmail } from "../../lib/utils";
import { toast } from "sonner";
import { Building2, Package, CheckCircle2, Clock, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

type BusinessProfile = {
  id: string;
  email: string;
  full_name: string | null;
  account_type: string | null;
  company_name: string | null;
  company_type: string | null;
};

type BusinessItem = {
  id: string;
  title: string;
  type: "lost" | "found";
  category: string | null;
  location: string | null;
  status: string | null;
  created_at: string;
  view_count: number | null;
  image_url: string | null;
};

type SightingCount = {
  item_id: string;
  count: number;
};

export default function BusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [sightingCounts, setSightingCounts] = useState<Record<string, number>>({});
  const [converting, setConverting] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("sirket");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.push("/auth/login");
        return;
      }
      const email = normalizeEmail(user.email);

      const [{ data: profileData }, { data: itemsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, account_type, company_name, company_type")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("items")
          .select("id, title, type, category, location, status, created_at, view_count, image_url")
          .eq("created_by_email", email)
          .order("created_at", { ascending: false }),
      ]);

      setProfile(profileData as BusinessProfile | null);
      setItems((itemsData as BusinessItem[]) || []);

      // Sighting counts
      if (itemsData && itemsData.length > 0) {
        const itemIds = itemsData.map((i: BusinessItem) => i.id);
        const { data: sightings } = await supabase
          .from("sightings")
          .select("item_id")
          .in("item_id", itemIds);
        const counts: Record<string, number> = {};
        (sightings || []).forEach((s: { item_id: string }) => {
          counts[s.item_id] = (counts[s.item_id] || 0) + 1;
        });
        setSightingCounts(counts);
      }

      setLoading(false);
    }
    init();
  }, [router]);

  async function handleConvertToBusiness() {
    if (!profile) return;
    if (!companyName.trim()) {
      toast.error("Şirket adı giriniz.");
      return;
    }
    setConverting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          account_type: "business",
          company_name: companyName.trim(),
          company_type: companyType,
        })
        .eq("id", profile.id);
      if (error) {
        toast.error("Güncelleme başarısız: " + error.message);
        return;
      }
      setProfile((prev) =>
        prev
          ? { ...prev, account_type: "business", company_name: companyName.trim(), company_type: companyType }
          : prev
      );
      toast.success("Hesabınız kurumsal hesaba dönüştürüldü!");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setConverting(false);
    }
  }

  function toggleSelectItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedItems.size === 0) return;
    if (!confirm(`${selectedItems.size} ilanı silmek istediğine emin misin?`)) return;
    setBulkDeleting(true);
    try {
      const { error } = await supabase.from("items").delete().in("id", [...selectedItems]);
      if (error) { toast.error("Bazı ilanlar silinemedi."); return; }
      setItems((prev) => prev.filter((i) => !selectedItems.has(i.id)));
      setSelectedItems(new Set());
      toast.success("Seçili ilanlar silindi.");
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setBulkDeleting(false);
    }
  }

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-slate-400">Yükleniyor...</p>
          </div>
        </main>
      </>
    );
  }

  const isBusiness = profile?.account_type === "business";
  const totalItems = items.length;
  const activeItems = items.filter((i) => i.status !== "resolved").length;
  const resolvedItems = items.filter((i) => i.status === "resolved").length;
  const totalSightings = Object.values(sightingCounts).reduce((a, b) => a + b, 0);

  function exportCSV() {
    const header = ["ID", "Başlık", "Tür", "Kategori", "Konum", "Durum", "Görüntülenme", "Tarih"];
    const rows = items.map((item) => [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`,
      item.type === "lost" ? "Kayıp" : "Bulundu",
      item.category || "",
      `"${(item.location || "").replace(/"/g, '""')}"`,
      item.status || "active",
      String(item.view_count || 0),
      new Date(item.created_at).toLocaleDateString("tr-TR"),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulanvarmi-ilanlar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const companyTypeLabels: Record<string, string> = {
    sirket: "Şirket",
    belediye: "Belediye",
    okul: "Okul / Üniversite",
    hastane: "Hastane",
    otel: "Otel",
    diger: "Diğer Kurum",
  };

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
              ← Ana Sayfa
            </Link>
          </div>

          {!isBusiness ? (
            /* Kurumsal hesaba dönüştürme */
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 max-w-lg mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-black">Kurumsal Hesap</h1>
                  <p className="text-sm text-slate-500">Şirket veya kurum hesabına geç</p>
                </div>
              </div>

              <div className="space-y-4 mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                <p className="text-sm text-blue-200 font-semibold">Kurumsal hesap avantajları:</p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />Şirket adı ve rozeti</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />Tüm ilanları tek panelden yönet</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />İstatistik ve analitik görünümü</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">Şirket / Kurum Adı *</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Örn: ABC Şirketi"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">Kurum Türü</label>
                  <select
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                  >
                    {Object.entries(companyTypeLabels).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleConvertToBusiness}
                  disabled={converting}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {converting ? "Dönüştürülüyor..." : "Kurumsal Hesaba Geç"}
                </button>
              </div>
            </div>
          ) : (
            /* Kurumsal dashboard */
            <div className="space-y-6">
              {/* Başlık */}
              <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-blue-500/10 to-slate-900 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-black">{profile?.company_name}</h1>
                      <span className="rounded-full border border-blue-500/40 bg-blue-500/15 px-3 py-0.5 text-xs font-bold text-blue-400">
                        {companyTypeLabels[profile?.company_type || ""] || "Kurumsal"}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{profile?.email}</p>
                  </div>
                </div>
              </div>

              {/* İstatistikler */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Toplam İlan", value: totalItems, icon: <Package className="w-5 h-5 text-white" />, color: "text-white" },
                  { label: "Aktif", value: activeItems, icon: <Clock className="w-5 h-5 text-amber-400" />, color: "text-amber-400" },
                  { label: "Çözüldü", value: resolvedItems, icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, color: "text-emerald-400" },
                  { label: "Toplam Gördüm", value: totalSightings, icon: <Eye className="w-5 h-5 text-blue-400" />, color: "text-blue-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <div className="flex items-center gap-2 mb-2">{s.icon}<p className="text-xs text-slate-500">{s.label}</p></div>
                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Analitik */}
              {items.length > 0 && (() => {
                const catCounts: Record<string, number> = {};
                items.forEach((i) => { const c = i.category || "Diğer"; catCounts[c] = (catCounts[c] || 0) + 1; });
                const catData = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
                const statusData = [
                  { name: "Aktif", value: activeItems, color: "#f59e0b" },
                  { name: "Çözüldü", value: resolvedItems, color: "#10b981" },
                ];
                return (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                    <h2 className="text-lg font-bold mb-5">Analitik</h2>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Kategori Dağılımı</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={catData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} />
                            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0" }} />
                            <Bar dataKey="value" name="İlan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Durum Dağılımı</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                              {statusData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                            <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <p className="text-lg font-black text-blue-400">{items.reduce((a, i) => a + (i.view_count || 0), 0).toLocaleString("tr-TR")}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Toplam Görüntülenme</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <p className="text-lg font-black text-amber-400">{totalSightings}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Gördüm Bildirimi</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                        <p className="text-lg font-black text-emerald-400">
                          {totalItems > 0 ? Math.round((resolvedItems / totalItems) * 100) : 0}%
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Çözüm Oranı</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* İlan listesi */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h2 className="text-lg font-bold">İlanlarım</h2>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItems.size > 0 && (
                      <button
                        onClick={handleBulkDelete}
                        disabled={bulkDeleting}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        {bulkDeleting ? "Siliniyor..." : `🗑 ${selectedItems.size} İlanı Sil`}
                      </button>
                    )}
                    <button
                      onClick={exportCSV}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 transition"
                    >
                      ⬇️ CSV İndir
                    </button>
                    <Link
                      href="/my-items"
                      className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 transition"
                    >
                      Tümünü Gör →
                    </Link>
                  </div>
                </div>

                {/* Select all */}
                {items.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === items.length}
                      onChange={() => setSelectedItems(selectedItems.size === items.length ? new Set() : new Set(items.map((i) => i.id)))}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-slate-500">
                      {selectedItems.size > 0 ? `${selectedItems.size} ilan seçildi` : "Tümünü seç"}
                    </span>
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
                    Henüz ilan yok.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-2xl border bg-slate-950/60 px-4 py-3 transition ${selectedItems.has(item.id) ? "border-blue-500/40 bg-blue-500/5" : "border-slate-800 hover:border-slate-700"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          className="accent-blue-500 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {item.image_url && (
                          <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden">
                            <Image src={item.image_url} alt={item.title} fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <Link href={`/items/${item.id}`} className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.type === "lost" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                              {item.type === "lost" ? "Kayıp" : "Bulundu"}
                            </span>
                            {item.status === "resolved" && (
                              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-300">Çözüldü</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.category} · {item.location}</p>
                        </Link>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-xs text-slate-500">👁 {item.view_count || 0}</p>
                          {sightingCounts[item.id] > 0 && (
                            <p className="text-xs text-amber-400">{sightingCounts[item.id]} gördüm</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Çalışan ekle — Gelecek özellik */}
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-6">
                <h2 className="text-base font-bold mb-2">Çalışan Ekle</h2>
                <p className="text-sm text-slate-500 mb-3">
                  Ekip yönetimi özelliği yakında geliyor. Notlarınızı buraya ekleyebilirsiniz.
                </p>
                <textarea
                  rows={3}
                  placeholder="Takım notları, iletişim bilgileri vb..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition resize-none"
                />
                <p className="mt-2 text-xs text-slate-600">Tam ekip yönetimi yakında eklenecek.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
