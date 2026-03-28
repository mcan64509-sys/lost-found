import "./globals.css";
import { Toaster } from "sonner";

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