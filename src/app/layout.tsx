import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "DealFlow AI — Transparent Startup Screening",
  description:
    "AI-powered deal screening for venture funds. Evaluate 1,000+ startup applications in seconds — every score fully explained, every decision auditable.",
  keywords: [
    "venture capital",
    "deal flow",
    "startup screening",
    "explainable AI",
    "decision tree",
    "IT-Park Ventures",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "DealFlow AI — Transparent Startup Screening",
    description:
      "Evaluate 1,000+ startup applications in seconds. Every decision fully explainable.",
    siteName: "DealFlow AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${newsreader.variable} ${plexMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
