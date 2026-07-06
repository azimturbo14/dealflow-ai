import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DealFlow — Investment Intelligence for Venture Capital",
  description:
    "Screen hundreds of startups in seconds and surface the few most likely to become exceptional investments. Every score fully explained, every decision auditable.",
  keywords: [
    "venture capital",
    "deal flow",
    "startup screening",
    "investment intelligence",
    "explainable AI",
    "portfolio construction",
  ],
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "DealFlow — Investment Intelligence for Venture Capital",
    description:
      "Screen hundreds of startups in seconds and surface the few most likely to become exceptional investments.",
    siteName: "DealFlow",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${instrumentSans.variable} ${plexMono.variable} antialiased bg-canvas text-ink`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
