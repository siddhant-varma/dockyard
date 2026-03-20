import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";

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
  metadataBase: new URL(
    process.env.AUTH_URL ?? "http://localhost:3000"
  ),
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
      className={cn(GeistSans.variable, GeistMono.variable, "dark")}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
