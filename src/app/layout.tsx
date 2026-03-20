import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileNav } from "@/components/shared/mobile-nav";

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
      className={cn(GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('dockyard-theme');
                  if (mode === 'light') {
                    // User explicitly chose light mode — respect it
                  } else {
                    // Default to dark (Glass Observatory design direction)
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen text-foreground antialiased font-sans pb-16 md:pb-0">
        <TooltipProvider>
          {children}
          <MobileNav />
        </TooltipProvider>
      </body>
    </html>
  );
}
