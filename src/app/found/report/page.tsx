"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { uploadItemImage } from "../../../lib/storage";
import { toast } from "sonner";
import LocationPickerModal from "../../../components/LocationPickerModal";
import ImageCropModal from "../../../components/ImageCropModal";
import AppHeader from "../../../components/AppHeader";
import { normalizeEmail } from "../../../lib/utils";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Calendar,
  ImageIcon,
  Loader2,
  Tag,
  FileText,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Temel Bilgiler", icon: <FileText className="w-4 h-4" /> },
  { id: 2, label: "Konum & Tarih", icon: <MapPin className="w-4 h-4" /> },
  { id: 3, label: "Görseller", icon: <ImageIcon className="w-4 h-4" /> },
];

const CATEGORIES = [
  { value: "Telefon", label: "📱 Telefon" },
  { value: "Cüzdan", label: "👛 Cüzdan" },
  { value: "Anahtar", label: "🔑 Anahtar" },
  { value: "Çanta", label: "🎒 Çanta" },
  { value: "Laptop", label: "💻 Laptop" },
  { value: "Saat / Takı", label: "⌚ Saat / Takı" },
  { value: "Kimlik / Evrak", label: "🪪 Kimlik / Evrak" },
  { value: "Evcil Hayvan", label: "🐾 Evcil Hayvan" },
  { value: "Diğer", label: "📦 Diğer (manuel giriş)" },
];


const PET_SPECIES = ["Kedi", "Köpek", "Kuş", "Tavşan", "Hamster", "Diğer"];

export default function FoundReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");

  // Evcil hayvan alanları
  const [petSpecies, setPetSpecies] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petColor, setPetColor] = useState("");
  const [petMicrochip, setPetMicrochip] = useState("");
  const [petAge, setPetAge] = useState("");

  // Step 2
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Step 3
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const DRAFT_KEY = "found_form_draft";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const d = JSON.parse(saved);
      if (d.title) setTitle(d.title);
      if (d.category) setCategory(d.category);
      if (d.customCategory) setCustomCategory(d.customCategory);
      if (d.description) setDescription(d.description);
      if (d.location) setLocation(d.location);
      if (d.date) setDate(d.date);
      if (d.time) setTime(d.time);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!title && !category && !description && !location) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        title, category, customCategory, description, location, date, time,
      }));
    } catch { /* ignore */ }
  }, [title, category, customCategory, description, location, date, time]);

  function canGoNext() {
    if (step === 1) return title.trim() !== "" && category !== "" && description.trim() !== "";
    if (step === 2) return location.trim() !== "" && date !== "";
    return true;
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const validFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, 5);
    if (validFiles.length === 0) return;
    const remaining = 5 - selectedImages.length;
    if (remaining <= 0) return;
    const first = validFiles[0];
    setCropFileName(first.name);
    setCropSrc(URL.createObjectURL(first));
    if (validFiles.length > 1) {
      const rest = validFiles.slice(1, remaining);
      setSelectedImages((prev) => [...prev, ...rest]);
      rest.forEach((f) => setPreviewUrls((prev) => [...prev, URL.createObjectURL(f)]));
    }
  }

  function handleCropConfirm(croppedFile: File) {
    setSelectedImages((prev) => [...prev, croppedFile]);
    setPreviewUrls((prev) => [...prev, URL.createObjectURL(croppedFile)]);
    setCropSrc(null);
  }

  function removeImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (selectedImages.length === 0) {
      toast.error("Lütfen en az bir görsel ekle.");
      return;
    }
    try {
      setSubmitting(true);
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) {
        toast.error("İlan oluşturmak için giriş yapmalısın.");
        router.push("/auth/login");
        return;
      }
      const user = data.session.user;
      const createdByEmail = normalizeEmail(user.email);

      const { data: profile } = await supabase.from("profiles").select("is_banned").eq("email", createdByEmail).maybeSingle();
      if (profile?.is_banned) { toast.error("Hesabınız engellendi. İlan oluşturamazsınız."); return; }

      const { count: itemCount } = await supabase
        .from("items")
        .select("id", { count: "exact", head: true })
        .eq("created_by_email", createdByEmail)
        .neq("status", "expired");

      const uploadResults = await Promise.all(selectedImages.map((img) => uploadItemImage(img, createdByEmail)));
      const [firstUrl, ...restUrls] = uploadResults.map((r) => r.publicUrl);

      const finalCategory = category === "Diğer" ? customCategory.trim() || "Diğer" : category;
      const finalDate = date && time ? `${date} ${time}` : date;

      const { data: newItem, error: insertError } = await supabase
        .from("items")
        .insert({
          type: "found",
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
          is_urgent: false,
          priority_level: 0,
          pet_species: finalCategory === "Evcil Hayvan" ? petSpecies || null : null,
          pet_breed: finalCategory === "Evcil Hayvan" ? petBreed || null : null,
          pet_color: finalCategory === "Evcil Hayvan" ? petColor || null : null,
          pet_microchip: finalCategory === "Evcil Hayvan" ? petMicrochip || null : null,
          pet_age: finalCategory === "Evcil Hayvan" ? petAge || null : null,
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      if (newItem) {
        fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: newItem.id, title, description, category: finalCategory, location }),
        }).catch(() => {});
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      fetch("/api/points/award", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ action: "create_item" }),
      }).catch(() => {});

      toast.success("Bulundu ilanınız alındı! Admin onayından sonra yayınlanacak.");
      if (newItem && (itemCount ?? 0) >= 3) {
        router.push(`/upgrade?item=${newItem.id}`);
      } else {
        router.push("/my-items");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İlan oluşturulurken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-2xl px-4 py-10">

          {/* Başlık */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Bulundu İlanı Oluştur</h1>
              <p className="text-sm text-slate-500 mt-0.5">Bulduğun eşyayı adım adım tanımla</p>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center mb-8">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all ${
                      step > s.id
                        ? "bg-emerald-500 border-emerald-500 text-slate-950"
                        : step === s.id
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 bg-slate-900 text-slate-600"
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
                  </div>
                  <span className={`text-[11px] font-semibold whitespace-nowrap ${step === s.id ? "text-emerald-400" : step > s.id ? "text-slate-400" : "text-slate-600"}`}>
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 mb-5 transition-colors ${step > s.id ? "bg-emerald-500/50" : "bg-slate-800"}`} />
                )}
              </div>
            ))}
          </div>

          {/* ADIM 1: Temel Bilgiler */}
          {step === 1 && (
            <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-7">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Eşya hakkında bilgi ver</h2>
                <p className="text-sm text-slate-500 mt-1">Bulduğun eşyayı mümkün olduğunca detaylı tarif et. Bu bilgiler sahibinin eşyasını tanımasını sağlar.</p>
              </div>

              {/* Eşya adı */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Eşya Adı *</label>
                  <span className={`text-xs ${title.length > 70 ? "text-amber-400" : "text-slate-600"}`}>{title.length}/80</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                  placeholder="Örn: Kahverengi deri cüzdan"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition"
                  required
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-slate-600">Renk, marka veya diğer ayırt edici özellikler ekle</p>
              </div>

              {/* Kategori */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                  <Tag className="w-3.5 h-3.5" />
                  Kategori *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`rounded-xl border px-4 py-2.5 text-sm text-left transition ${
                        category === cat.value
                          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                          : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-white"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {category === "Diğer" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Kategoriyi yaz..."
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-slate-600"
                    required
                  />
                )}
              </div>

              {/* Açıklama */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Açıklama *</label>
                  <span className={`text-xs ${description.length > 900 ? "text-amber-400" : "text-slate-600"}`}>{description.length}/1000</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                  placeholder="Eşyanın özellikleri, içindekiler (varsa), özel işaretler, bulunduğu koşullar vb. detaylı yaz."
                  rows={5}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition resize-none"
                  required
                />
              </div>


              {/* Evcil Hayvan Alanları */}
              {category === "Evcil Hayvan" && (
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider">🐾 Hayvan Bilgileri</p>
                  <p className="text-xs text-slate-500">Bu bilgiler evcil hayvan ilanları sayfasında arama ve filtreleme için kullanılır.</p>

                  <div>
                    <label className="text-sm font-semibold text-slate-300 mb-2 block">Hayvan Türü</label>
                    <div className="flex flex-wrap gap-2">
                      {PET_SPECIES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPetSpecies(s)}
                          className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                            petSpecies === s
                              ? "border-pink-500/50 bg-pink-500/10 text-pink-400"
                              : "border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white"
                          }`}
                        >
                          {s === "Kedi" ? "🐱" : s === "Köpek" ? "🐶" : s === "Kuş" ? "🐦" : s === "Tavşan" ? "🐰" : s === "Hamster" ? "🐹" : "🐾"} {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Irk / Cins</label>
                      <input type="text" value={petBreed} onChange={(e) => setPetBreed(e.target.value)} placeholder="Örn: Golden Retriever" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-pink-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Renk / Desen</label>
                      <input type="text" value={petColor} onChange={(e) => setPetColor(e.target.value)} placeholder="Örn: Sarı-beyaz" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-pink-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Yaşı / Büyüklüğü</label>
                      <input type="text" value={petAge} onChange={(e) => setPetAge(e.target.value)} placeholder="Örn: 2 yaşında, orta boy" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-pink-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Mikroçip No (varsa)</label>
                      <input type="text" value={petMicrochip} onChange={(e) => setPetMicrochip(e.target.value)} placeholder="15 haneli numara" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-pink-500/50" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADIM 2: Konum & Tarih */}
          {step === 2 && (
            <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-7">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Nerede ve ne zaman buldun?</h2>
                <p className="text-sm text-slate-500 mt-1">Bu bilgiler sahibinin eşyasını nerede kaybettiğiyle karşılaştırılır.</p>
              </div>

              {/* Konum */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Bulunduğu Konum *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Örn: Beşiktaş / İstanbul"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 outline-none focus:border-slate-600 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setLocationModalOpen(true)}
                    className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition"
                  >
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Haritadan Seç
                  </button>
                </div>
                {lat && lng ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Harita konumu seçildi: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-600">İsteğe bağlı: haritadan da pin bırakabilirsin</p>
                )}
              </div>

              {/* Tarih & Saat */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Bulunma Tarihi *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Tarih</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-slate-600 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Saat (isteğe bağlı)</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-slate-600 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Özet */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Adım 1 özeti</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Eşya:</span>
                    <span className="text-white font-medium">{title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Kategori:</span>
                    <span className="text-emerald-400">{category === "Diğer" ? customCategory || "Diğer" : category}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ADIM 3: Görseller */}
          {step === 3 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-7">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Eşya görselleri</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Görseller sahibinin eşyasını tanımasını kolaylaştırır. En az 1, en fazla 5 görsel yükle.
                </p>
              </div>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative overflow-hidden rounded-2xl border border-slate-700 aspect-square">
                      <Image src={url} alt={`Resim ${i + 1}`} fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600 transition"
                      >
                        ×
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Ana Görsel
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedImages.length < 5 && (
                <label className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition ${
                  previewUrls.length === 0
                    ? "border-slate-700 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                    : "border-slate-800 hover:border-slate-700"
                }`}>
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white">Görsel ekle</p>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP — Max 5 görsel</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="sr-only"
                    required={selectedImages.length === 0}
                  />
                </label>
              )}

              {selectedImages.length > 0 && (
                <p className="mt-3 text-xs text-slate-500 text-center">
                  {selectedImages.length}/5 görsel — {5 - selectedImages.length} daha ekleyebilirsin
                </p>
              )}

              {/* Final özet */}
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">İlan Özeti</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Eşya:</span>
                    <span className="text-white font-medium">{title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Kategori:</span>
                    <span className="text-white">{category === "Diğer" ? customCategory || "Diğer" : category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Konum:</span>
                    <span className="text-white">{location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-20">Tarih:</span>
                    <span className="text-white">{date} {time && `- ${time}`}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NAVİGASYON BUTONLARI */}
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (!canGoNext()) {
                    toast.error("Lütfen tüm zorunlu alanları doldur.");
                    return;
                  }
                  setStep((s) => s + 1);
                }}
                disabled={!canGoNext()}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Devam Et
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || selectedImages.length === 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    İlan oluşturuluyor...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Bulundu İlanı Oluştur
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      <LocationPickerModal
        isOpen={locationModalOpen}
        initialLocation={{ name: location || "Türkiye", lat: lat ?? 39.9334, lng: lng ?? 32.8597, radiusKm: 10 }}
        onClose={() => setLocationModalOpen(false)}
        onApply={(selected) => {
          setLat(selected.lat);
          setLng(selected.lng);
          setLocation(selected.name);
          setLocationModalOpen(false);
        }}
      />

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          fileName={cropFileName}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  );
}
