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
    icon: "/brand/connecta-mark.svg",
    shortcut: "/brand/connecta-mark.svg",
    apple: "/brand/connecta-mark.svg",
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
