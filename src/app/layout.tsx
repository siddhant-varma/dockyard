/**
 * Root layout — DockYard Layout Shell.
 *
 * A max-width frame (1600px) centers the entire app on ultra-wide screens.
 * Header, sidebar, and canvas all live inside the same frame so they align.
 *
 * On narrow screens (<640px): sidebar becomes a bottom tab bar.
 * On wide screens (>1600px): frame centers with background visible on sides.
 */

import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { JetBrains_Mono } from "next/font/google";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HeaderBar } from "@/components/layout/header-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: {
    default: "DockYard",
    template: "%s — DockYard",
  },
  description:
    "Open-source operations platform — project discovery, health monitoring, and deployment management.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "DockYard",
    description:
      "Open-source operations platform — project discovery, health monitoring, and deployment management.",
    siteName: "DockYard",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(GeistSans.variable, GeistMono.variable, jetbrainsMono.variable, "dark")}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
       <TooltipProvider>
        {/* Frame — single max-width container for header + sidebar + canvas */}
        <div className="relative mx-auto min-h-screen max-w-[1600px] overflow-x-hidden">
          {/* Header Bar — sticky top, spans full frame width */}
          <div className="sticky top-0 z-50">
            <HeaderBar />
          </div>

          {/* Below header: sidebar + canvas side by side */}
          <div className="flex">
            {/* Sidebar — sticky flex child, hidden on mobile */}
            <Sidebar />

            {/* Canvas — main content, fills remaining width */}
            <main className="min-w-0 min-h-[calc(100vh-3rem)] flex-1 pb-16 sm:pb-0">
              <div className="mx-auto max-w-[1280px] px-4 py-5 sm:p-6">
                {children}
                <Footer />
              </div>
            </main>
          </div>
        </div>
       </TooltipProvider>
      </body>
    </html>
  );
}
