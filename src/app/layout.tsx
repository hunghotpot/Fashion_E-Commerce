import type { Metadata, Viewport } from "next";
import { Cormorant, Montserrat } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

// "Ấm áp tinh tế": Cormorant for headings, Montserrat for body/UI.
// The "vietnamese" subset is required for the UI copy.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const cormorant = Cormorant({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#faf7f2" };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "Cửa hàng thời trang trực tuyến",
  openGraph: { siteName: SITE_NAME, locale: "vi_VN", type: "website" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${montserrat.variable} ${cormorant.variable}`}>
      <body className="antialiased overflow-x-clip">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
