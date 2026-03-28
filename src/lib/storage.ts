import { supabase } from "./supabase";

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export async function uploadItemImage(file: File, userEmail: string) {
  if (!file) {
    throw new Error("Yüklenecek dosya bulunamadı.");
  }

  const normalizedEmail = (userEmail || "anonymous")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  const safeName = sanitizeFileName(file.name);
  const extension = getFileExtension(file.name);
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).slice(2, 8);

  const finalFileName = extension
    ? `${timestamp}-${randomPart}.${extension}`
    : `${timestamp}-${randomPart}-${safeName}`;

  const filePath = `${normalizedEmail}/${finalFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from("item-images")
    .getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  };
}