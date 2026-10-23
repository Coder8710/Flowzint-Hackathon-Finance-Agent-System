import type { Metadata } from "next";
import "./globals.css";
import { AnalysisProvider } from "@/components/AnalysisContext";
import { ThemeInitializer } from "@/components/ThemeInitializer";

export const metadata: Metadata = {
  title: "Stockmaster.ai — AI Investment Research",
  description:
    "AI-powered multi-agent investment research. Get Buy/Hold/Sell recommendations with fundamental, technical, news, sentiment, risk, and portfolio analysis.",
  keywords: ["stock analysis", "AI finance", "investment research", "equity analysis"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeInitializer />
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}
