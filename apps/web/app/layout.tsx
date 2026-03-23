import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GravityClaw - Deploy OpenClaw in Under 1 Minute",
  description:
    "One-click deploy your own 24/7 active OpenClaw AI agent on Zero Gravity Chain. No servers, no SSH, no complexity.",
  keywords: ["OpenClaw", "AI Agent", "Zero Gravity", "0G Chain", "Telegram Bot", "AI Assistant"],
  openGraph: {
    title: "GravityClaw - Deploy OpenClaw in Under 1 Minute",
    description: "One-click deploy your own 24/7 active OpenClaw AI agent on Zero Gravity Chain.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
