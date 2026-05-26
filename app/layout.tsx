import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { I18nProvider } from "@/lib/i18n/client";
import { getServerI18n } from "@/lib/i18n/server";
import { HtmlDirSync } from "@/components/html-dir-sync";
import { SwRegistry } from "@/components/sw-registry";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});



const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
      <body
        className={cn(
          lang === "ar" ? cairo.variable : inter.variable,
          "antialiased"
        )}
        suppressHydrationWarning
      >
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
