import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "TokenGate — Prepaid LLM API Keys",
  description:
    "Claude 3.5 Sonnet, GPT-4o, DeepSeek-V3, Kimi and GLM behind one OpenAI-compatible endpoint. Pay once, get your key instantly.",
};

export const viewport: Viewport = {
  themeColor: "#08090a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Matches LanguageProvider's default; the provider updates it on the client.
    <html lang="zh-TW">
      <body className="min-h-screen font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
