"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { uploadItemImage } from "../../../../lib/storage";
import { toast } from "sonner";
import LocationPickerModal from "../../../../components/LocationPickerModal";

type DbItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  date: string | null;
  type: "lost" | "found" | null;
  image_url: string | null;
  created_by_email: string | null;
  lat: number | null;
  lng: number | null;
};

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [item, setItem] = useState<DbItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [{ data: itemData, error: itemError }, { data: sessionData }] =
          await Promise.all([
            supabase.from("items").select("*").eq("id", id).single(),
            supabase.auth.getSession(),
          ]);

        if (itemError || !itemData) {
          setItem(null);
          return;
        }

        const currentEmail = normalizeEmail(sessionData.session?.user?.email);
        setUserEmail(currentEmail);

        setItem(itemData as DbItem);
        setTitle(itemData.title || "");
        setCategory(itemData.category || "");
        setLocation(itemData.location || "");
        setDate(itemData.date || "");
        setDescription(itemData.description || "");
        setLat(itemData.lat || null);
        setLng(itemData.lng || null);
      } catch (error) {
        console.error("Edit page unexpected error:", error);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const isOwner = useMemo(() => {
    if (!item || !userEmail) return false;
    return normalizeEmail(item.created_by_email) === normalizeEmail(userEmail);
  }, [item, userEmail]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) { setSelectedImage(null); setPreviewUrl(""); return; }
    if (!file.type.startsWith("image/")) { toast.error("Lütfen geçerli bir görsel seç."); return; }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;

    if (!title.trim() || !location.trim()) {
      toast.error("Başlık ve konum zorunlu.");
      return;
    }

    try {
      setSaving(true);

      let imageUrl: string | undefined;
      if (selectedImage) {
        setUploadingImage(true);
        const uploadResult = await uploadItemImage(selectedImage, userEmail);
        imageUrl = uploadResult.publicUrl;
        setUploadingImage(false);
      }

      const updatePayload: Record<string, unknown> = {
        title: title.trim(),
        category: category.trim() || null,
        location: location.trim(),
        date: date || null,
        description: description.trim() || null,
        lat,
        lng,
      };
      if (imageUrl) updatePayload.image_url = imageUrl;

      const { error } = await supabase
        .from("items")
        .update(updatePayload)
        .eq("id", item.id)
        .eq("created_by_email", userEmail);

      if (error) {
        console.error("Update item error:", error);
        toast.error("İlan güncellenemedi.");
        return;
      }

      // Embedding'i yeniden oluştur
      fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          location: location.trim(),
        }),
      }).catch((err) => console.error("Embed request failed:", err));

      toast.success("İlan güncellendi.");
      router.push(`/items/${item.id}`);
    } catch (error) {
      console.error("Update item unexpected error:", error);
      toast.error("İlan güncellenirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-slate-400">İlan düzenleme ekranı yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-2xl">
          <Link href="/profile" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">← Profile Dön</Link>
          <h1 className="mt-6 text-3xl font-bold">İlan bulunamadı</h1>
        </div>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-2xl">
          <Link href={`/items/${item.id}`} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">← İlana Dön</Link>
          <h1 className="mt-6 text-3xl font-bold">Bu ilanı düzenleyemezsin</h1>
          <p className="mt-2 text-slate-400">Sadece ilan sahibi düzenleme yapabilir.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href={`/items/${item.id}`} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">
          ← İlana Dön
        </Link>

        <h1 className="mb-8 mt-4 text-4xl font-bold">İlanı Düzenle</h1>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Başlık</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none">
              <option value="">Kategori seç</option>
              <option value="Telefon">Telefon</option>
              <option value="Cüzdan">Cüzdan</option>
              <option value="Anahtar">Anahtar</option>
              <option value="Çanta">Çanta</option>
              <option value="Laptop">Laptop</option>
              <option value="Saat / Takı">Saat / Takı</option>
              <option value="Kimlik / Evrak">Kimlik / Evrak</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Konum</label>
            <div className="flex gap-2">
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Örn: Kadıköy / İstanbul"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" required />
              <button type="button" onClick={() => setLocationModalOpen(true)}
                className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white hover:bg-slate-700">
                🗺️ Haritadan Seç
              </button>
            </div>
            {lat && lng && (
              <p className="mt-1 text-xs text-green-400">✓ Konum seçildi: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Tarih</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Açıklama</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Görseli Değiştir <span className="text-slate-500">(isteğe bağlı)</span></label>
            {item.image_url && !previewUrl && (
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-800">
                <img src={item.image_url} alt="Mevcut görsel" className="h-48 w-full object-cover" />
                <p className="bg-slate-900 px-3 py-1.5 text-xs text-slate-500">Mevcut görsel</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-white hover:file:bg-slate-700" />
            {previewUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
                <img src={previewUrl} alt="Yeni görsel önizleme" className="h-48 w-full object-cover" />
                <p className="bg-slate-900 px-3 py-1.5 text-xs text-slate-500">Yeni görsel</p>
              </div>
            )}
          </div>

          <button type="submit" disabled={saving || uploadingImage}
            className="w-full rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60">
            {uploadingImage ? "Görsel yükleniyor..." : saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </form>
      </div>

      <LocationPickerModal
        isOpen={locationModalOpen}
        initialLocation={{
          name: location || "Türkiye",
          lat: lat ?? 39.9334,
          lng: lng ?? 32.8597,
          radiusKm: 10,
        }}
        onClose={() => setLocationModalOpen(false)}
        onApply={(selected) => {
          setLat(selected.lat);
          setLng(selected.lng);
          setLocation(selected.name);
          setLocationModalOpen(false);
        }}
      />
    </main>
  );
}