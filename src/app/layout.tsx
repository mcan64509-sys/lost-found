import "./globals.css";
import { Toaster } from "sonner";
import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "../contexts/LanguageContext";

export const viewport: Viewport = {
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: {
    default: "BulanVarMı? — Kayıp Eşya Platformu",
    template: "%s | BulanVarMı?",
  },
  description:
    "Kayıp eşyalarını bul, bulunan eşyaları sahiplerine kavuştur. Yapay zeka destekli eşleştirme sistemi.",
  keywords: ["kayıp eşya", "bulundu", "bulanvarmi", "kayıp ilanı", "bulan var mı"],
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
    title: "BulanVarMı?",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "BulanVarMı?",
    title: "BulanVarMı? — Kayıp Eşya Platformu",
    description:
      "Kayıp eşyalarını bul, bulunan eşyaları sahiplerine kavuştur.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BulanVarMı?",
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
        <LanguageProvider>
          {children}
          <Toaster position="top-center" expand={true} />
        </LanguageProvider>
      </body>
    </html>
  );
}
