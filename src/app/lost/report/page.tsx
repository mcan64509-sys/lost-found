"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { uploadItemImage } from "../../../lib/storage";
import { toast } from "sonner";
import LocationPickerModal from "../../../components/LocationPickerModal";
import ImageCropModal from "../../../components/ImageCropModal";
import { normalizeEmail } from "../../../lib/utils";

export default function LostReportPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const validFiles = files.filter(f => f.type.startsWith("image/")).slice(0, 5);
    if (validFiles.length === 0) return;
    const remaining = 5 - selectedImages.length;
    if (remaining <= 0) return;
    // Kırpma modalını ilk seçilen görsel için aç
    const first = validFiles[0];
    setCropFileName(first.name);
    setCropSrc(URL.createObjectURL(first));
    // Birden fazla seçildiyse gerisini direkt ekle
    if (validFiles.length > 1) {
      const rest = validFiles.slice(1, remaining);
      setSelectedImages(prev => [...prev, ...rest]);
      rest.forEach(f => setPreviewUrls(prev => [...prev, URL.createObjectURL(f)]));
    }
  }

  function handleCropConfirm(croppedFile: File) {
    setSelectedImages(prev => [...prev, croppedFile]);
    setPreviewUrls(prev => [...prev, URL.createObjectURL(croppedFile)]);
    setCropSrc(null);
  }

  function removeImage(index: number) {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) { toast.error("Oturum alınamadı."); return; }
      const user = data.session?.user;
      if (!user) { toast.error("İlan oluşturmak için giriş yapmalısın."); return; }
      if (selectedImages.length === 0) { toast.error("Lütfen bir görsel seç."); return; }

      const createdByEmail = normalizeEmail(user.email);

      // Ban check
      const { data: profile } = await supabase.from("profiles").select("is_banned").eq("email", createdByEmail).maybeSingle();
      if (profile?.is_banned) { toast.error("Hesabınız engellendi. İlan oluşturamazsınız."); return; }
      const uploadPromises = selectedImages.map(img => uploadItemImage(img, createdByEmail));
      const uploadResults = await Promise.all(uploadPromises);
      const [firstUrl, ...restUrls] = uploadResults.map(r => r.publicUrl);

      const finalCategory = category === "Diğer" ? customCategory.trim() || "Diğer" : category;
      const finalDate = date && time ? `${date} ${time}` : date;

      const { data: newItem, error: insertError } = await supabase
        .from("items")
        .insert({
          type: "lost",
          title,
          category: finalCategory,
          location,
          date: finalDate,
          description,
          created_by_email: createdByEmail,
          image_url: firstUrl,
          image_urls: restUrls,
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
            category: finalCategory,
            location,
          }),
        }).catch(() => {});
      }

      router.push("/profile");
    } catch (error) {
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
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-slate-300">Eşya Adı</label>
              <span className={`text-xs ${title.length > 70 ? "text-red-400" : "text-slate-500"}`}>{title.length}/80</span>
            </div>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Örn: Siyah iPhone 13"
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Kategori</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              style={{ colorScheme: "dark" }}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none" required>
              <option value="">Kategori seç</option>
              <option value="Telefon">Telefon</option>
              <option value="Cüzdan">Cüzdan</option>
              <option value="Anahtar">Anahtar</option>
              <option value="Çanta">Çanta</option>
              <option value="Laptop">Laptop</option>
              <option value="Saat / Takı">Saat / Takı</option>
              <option value="Kimlik / Evrak">Kimlik / Evrak</option>
              <option value="Diğer">Diğer (manuel giriş)</option>
            </select>
            {category === "Diğer" && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Kategoriyi yaz..."
                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none"
                required
              />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Kaybolduğu Konum</label>
            <div className="flex gap-2">
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Örn: Kadıköy / İstanbul"
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none" required />
              <button type="button" onClick={() => setLocationModalOpen(true)}
                className="shrink-0 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white hover:bg-slate-700">
                🗺️ Haritadan Seç
              </button>
            </div>
            {lat && lng && (
              <p className="mt-1 text-xs text-green-400">✓ Konum seçildi: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Kaybolma Tarihi ve Saati</label>
            <div className="flex divide-x divide-slate-600 overflow-hidden rounded-xl border border-slate-600 bg-slate-950">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="flex-1 bg-transparent px-4 py-3 text-white outline-none" required />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="w-36 bg-transparent px-4 py-3 text-white outline-none" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-slate-300">Açıklama</label>
              <span className={`text-xs ${description.length > 900 ? "text-red-400" : "text-slate-500"}`}>{description.length}/1000</span>
            </div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              placeholder="Eşyayı nerede, nasıl kaybettiğini yaz..." rows={5}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none" required />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Eşya Görselleri <span className="text-slate-500">(max 5)</span>
            </label>

            {previewUrls.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative overflow-hidden rounded-xl border border-slate-700">
                    <Image src={url} alt={`Resim ${i+1}`} width={200} height={96} className="h-24 w-full object-cover" unoptimized />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">Ana</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedImages.length < 5 && (
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-white hover:file:bg-slate-700"
                required={selectedImages.length === 0}
              />
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

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          fileName={cropFileName}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </main>
  );
}