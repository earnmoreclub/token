export type Locale = "en" | "zh-TW";

export const LOCALES: readonly Locale[] = ["en", "zh-TW"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

const en = {
  nav: { models: "Models", pricing: "Pricing", balance: "Check Balance", docs: "Docs", getKey: "Get a key" },
  hero: {
    tag: "Universal AI Gateway • High Concurrency",
    title: "Global Multi-Model API Access with a Single Key",
    subtitle: "Seamlessly switch between Claude 3.5, GPT-4o, and DeepSeek with one OpenAI-compatible endpoint.",
    cta: "Get Instant API Key",
    compare: "Compare prices",
  },
  pricing: {
    popular: "MOST POPULAR",
    buyNow: "Purchase Quota",
    topUpExisting: "Top-up Existing Key",
    enterEmail: "Your Delivery Email",
    enterKeyOptional: "Existing Key (Optional for Top-Up)",
  },
  success: {
    title: "Payment Confirmed & Key Ready",
    topupTitle: "Payment Confirmed & Key Topped Up",
    copyKey: "Copy API Key",
    copied: "Copied!",
  },
};

/** Shape of every dictionary. zh-TW is type-checked against en, so missing keys fail the build. */
export type Dictionary = typeof en;

const zhTW: Dictionary = {
  nav: { models: "模型列表", pricing: "價格方案", balance: "額度查詢", docs: "使用文檔", getKey: "取得密鑰" },
  hero: {
    tag: "通用 AI 網關 • 高併發低延遲",
    title: "單一 API 密鑰，直通全球頂級大語言模型",
    subtitle: "全面支援 Claude 3.5、GPT-4o、DeepSeek 與 Kimi，無縫相容 OpenAI SDK 規格。",
    cta: "即時取得 API 密鑰",
    compare: "比較價格",
  },
  pricing: {
    popular: "最受歡迎",
    buyNow: "立即購買額度",
    topUpExisting: "現有密鑰儲值",
    enterEmail: "接收密鑰電子信箱",
    enterKeyOptional: "現有 API 密鑰 (如需加額請填寫)",
  },
  success: {
    title: "付款成功，密鑰已即時開通",
    topupTitle: "付款成功，密鑰已完成儲值",
    copyKey: "複製 API 密鑰",
    copied: "已複製！",
  },
};

export const dictionaries: Record<Locale, Dictionary> = {
  en,
  "zh-TW": zhTW,
};
