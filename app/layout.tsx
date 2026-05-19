import type { Metadata } from "next";
import { Cairo, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { I18nProvider } from "@/lib/i18n";
import { HtmlDirSync } from "@/components/html-dir-sync";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Marmar — Clinic Management for Solo Doctors",
  description:
    "Marmar handles your paperwork, patient history, and reminders — so you can focus on what matters.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ fontSize: "106%" }}>
      <body
        className={cn(
          plusJakarta.variable,
          playfair.variable,
          cairo.variable,
          "antialiased"
        )}
        suppressHydrationWarning
      >
        <ClerkProvider dynamic>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <I18nProvider>
                <HtmlDirSync />
                {children}
                <Toaster richColors />
              </I18nProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
