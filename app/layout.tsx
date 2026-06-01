import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/lib/i18n/client";
import { getServerI18n } from "@/lib/i18n/server";
import { HtmlDirSync } from "@/components/html-dir-sync";
import { SwRegistry } from "@/components/sw-registry";
import { Cairo } from "next/font/google";
import dynamic from "next/dynamic";

// Lazy-load Toaster — not needed for initial render, reduces first-load JS
const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster }))
);

// Cairo — optimized, self-hosted Arabic font via next/font
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-cairo",
  preload: true,
});

export const metadata: Metadata = {
  title: "mermer — Find & Book Doctors in Egypt",
  description: "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "mermer",
  },
  openGraph: {
    title: "mermer — Find & Book Doctors in Egypt",
    description: "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation.",
    url: "https://mermereg.com",
    siteName: "mermer",
    images: [
      {
        url: "/icon.svg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "mermer — Find & Book Doctors in Egypt",
    description: "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation.",
    images: ["/icon.svg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang, dir } = await getServerI18n();

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning style={{ fontSize: "106%" }}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_CONVEX_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_CONVEX_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "MedicalBusiness",
                  "@id": "https://mermereg.com/#organization",
                  "name": "mermer",
                  "url": "https://mermereg.com",
                  "logo": "https://mermereg.com/icon.svg",
                  "description": "Find & Book Doctors in Egypt",
                },
                {
                  "@type": "MedicalClinic",
                  "@id": "https://mermereg.com/#clinic",
                  "name": "mermer Clinic Platform",
                  "url": "https://mermereg.com",
                  "description": "Clinic management and booking platform for Egypt",
                }
              ]
            })
          }}
        />
      </head>
      <body className={`antialiased ${cairo.variable}`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClerkProvider dynamic>
            <ConvexClientProvider>
              <I18nProvider initialLang={lang}>
                <HtmlDirSync />
                <SwRegistry />
                {children}
                <Toaster richColors />
              </I18nProvider>
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
