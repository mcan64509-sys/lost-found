import "./globals.css";
import { Toaster } from "sonner";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: {
    default: "Lost & Found — Kayıp Eşya Platformu",
    template: "%s | Lost & Found",
  },
  description:
    "Kayıp eşyalarını bul, bulunan eşyaları sahiplerine kavuştur. Yapay zeka destekli eşleştirme sistemi.",
  keywords: ["kayıp eşya", "bulundu", "lost and found", "kayıp ilanı"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lost & Found",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Lost & Found",
    title: "Lost & Found — Kayıp Eşya Platformu",
    description:
      "Kayıp eşyalarını bul, bulunan eşyaları sahiplerine kavuştur.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lost & Found",
    description: "Kayıp eşyalarını bul, bulunan eşyaları sahiplerine kavuştur.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        {children}

      <Toaster position="top-center" expand={true} />

      </body>
    </html>
  );
}