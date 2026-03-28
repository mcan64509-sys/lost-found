"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { uploadItemImage } from "../../../lib/storage";
import { toast } from "sonner";
import LocationPickerModal from "../../../components/LocationPickerModal";

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export default function LostReportPage() {
  const router = useRouter();

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
  const [submitting, setSubmitting] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) { setSelectedImage(null); setPreviewUrl(""); return; }
    if (!file.type.startsWith("image/")) { toast.error("Lütfen geçerli bir görsel seç."); return; }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) { toast.error("Oturum alınamadı."); return; }
      const user = data.session?.user;
      if (!user) { toast.error("İlan oluşturmak için giriş yapmalısın."); return; }
      if (!selectedImage) { toast.error("Lütfen bir görsel seç."); return; }

      const createdByEmail = normalizeEmail(user.email);
      const uploadResult = await uploadItemImage(selectedImage, createdByEmail);

      const { data: newItem, error: insertError } = await supabase
        .from("items")
        .insert({
          type: "lost",
          title,
          category,
          location,
          date,
          description,
          created_by_email: createdByEmail,
          image_url: uploadResult.publicUrl,
          lat,
          lng,
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      // Embedding arka planda oluştur
      if (newItem) {
        fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: newItem.id,
            title,
            description,
            category,
            location,
          }),
        }).catch((err) => console.error("Embed request failed:", err));
      }

      router.push("/profile");
    } catch (error) {
      console.error("Lost item create error:", error);
      toast.error(error instanceof Error ? error.message : "İlan oluşturulurken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-white transition hover:bg-slate-900">← Ana Sayfa</Link>
        <h1 className="mb-2 mt-4 text-4xl font-bold">Kayıp Eşya Bildir</h1>
        <p className="mb-8 text-slate-400">Kaybettiğin eşya için ilan oluştur.</p>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Eşya Adı</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Siyah iPhone 13"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" required>
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
            <label className="mb-2 block text-sm text-slate-300">Kaybolduğu Konum</label>
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
            <label className="mb-2 block text-sm text-slate-300">Kaybolma Tarihi</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Açıklama</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Eşyayı nerede, nasıl kaybettiğini yaz..." rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Eşya Görseli</label>
            <input type="file" accept="image/*" onChange={handleImageChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-white hover:file:bg-slate-700" required />
            {previewUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                <img src={previewUrl} alt="Önizleme" className="h-64 w-full object-cover" />
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-xl bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "İlan oluşturuluyor..." : "Kayıp İlanı Oluştur"}
          </button>
        </form>
      </div>

      <LocationPickerModal
        isOpen={locationModalOpen}
        initialLocation={{ name: location || "Türkiye", lat: lat ?? 39.9334, lng: lng ?? 32.8597, radiusKm: 10 }}
        onClose={() => setLocationModalOpen(false)}
        onApply={(selected) => { setLat(selected.lat); setLng(selected.lng); setLocation(selected.name); setLocationModalOpen(false); }}
      />
    </main>
  );
}