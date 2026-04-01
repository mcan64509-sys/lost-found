import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const { data: item } = await supabase
    .from("items")
    .select("title, description, type, category, location, image_url")
    .eq("id", id)
    .maybeSingle();

  if (!item) {
    return { title: "İlan Bulunamadı" };
  }

  const typeLabel = item.type === "lost" ? "Kayıp" : "Bulundu";
  const title = `${typeLabel}: ${item.title}`;
  const description =
    item.description ||
    `${typeLabel} ilan — ${item.category ?? ""} ${item.location ? `· ${item.location}` : ""}`.trim();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: item.image_url ? [{ url: item.image_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: item.image_url ? [item.image_url] : [],
    },
  };
}

export default function ItemLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
