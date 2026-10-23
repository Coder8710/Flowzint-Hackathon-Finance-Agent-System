import type { Metadata } from "next";
import "./globals.css";
import { AnalysisProvider } from "@/components/AnalysisContext";

export const metadata: Metadata = {
  title: "Stockmaster.ai — Multi-Agent Stock Analyzer",
  description:
    "AI-powered multi-agent finance assistant that analyzes stocks using real-time news, fundamentals, technicals, sentiment, and risk analysis. Get Buy/Sell/Hold recommendations with confidence scores.",
  keywords: ["stock analysis", "AI finance", "investment", "multi-agent", "stock analyzer"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}

