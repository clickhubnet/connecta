import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { canonicalOrigin } from "@/lib/site-config";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#D71920",
};

const siteMetadata: Metadata = {
  metadataBase: new URL(canonicalOrigin),
  title: "CONNECTA TELECOM CRM",
  description: "CRM comercial da Connecta Telecom com atendimento, vendas e automações.",
  icons: {
    icon: [
      { url: "/brand/connecta-favicon-32.png?v=5", type: "image/png", sizes: "32x32" },
      { url: "/brand/connecta-favicon-16.png?v=5", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon.ico?v=5",
    apple: { url: "/brand/connecta-apple-icon.png?v=5", sizes: "180x180", type: "image/png" },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-connecta-pathname") || "/";
  const canonical = new URL(canonicalOrigin);
  canonical.pathname = pathname;
  return { ...siteMetadata, alternates: { canonical: canonical.toString() } };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
