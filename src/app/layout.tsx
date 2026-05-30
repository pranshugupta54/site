import type { Metadata } from "next";
import { Fraunces, Newsreader, JetBrains_Mono, Instrument_Serif, Sassy_Frass } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppearanceProvider, NO_FLASH_SCRIPT } from "@/components/providers";
import { Tofu } from "@/components/tofu";
import { FooterShell } from "@/components/footer-shell";
import { SITE } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", adjustFontFallback: false });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", adjustFontFallback: false });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument", display: "swap", adjustFontFallback: false });
const signature = Sassy_Frass({ subsets: ["latin"], weight: "400", variable: "--font-signature", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
  ),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.bio,
  icons: { icon: "/me.jpeg" },
  openGraph: { title: SITE.name, description: SITE.bio, type: "website" },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.bio,
    creator: "@pranshgupta54",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [fraunces, newsreader, jetbrains, instrument, signature, GeistSans, GeistMono]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="font-body antialiased">
        <AppearanceProvider>
          {children}
          <Tofu />
          <FooterShell />
        </AppearanceProvider>
      </body>
    </html>
  );
}
