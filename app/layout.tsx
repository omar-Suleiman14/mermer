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
  title: "mermer",
  description:
    "the best clinic management system ever",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { lang, dir } = await getServerI18n();

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning style={{ fontSize: "106%" }}>
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
