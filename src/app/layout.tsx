import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#D71920",
};

export const metadata: Metadata = {
  title: "CONNECTA TELECOM CRM",
  description: "CRM comercial da Connecta Telecom com atendimento, vendas e automações.",
  icons: {
    icon: [
      { url: "/brand/connecta-favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/brand/connecta-favicon-32.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/brand/connecta-favicon-16.png?v=2", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: { url: "/brand/connecta-apple-icon.png?v=2", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={manrope.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
