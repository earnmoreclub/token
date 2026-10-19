"use client";

import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";

type Lang = "python" | "node" | "curl";

const LABELS: Record<Lang, string> = { python: "Python", node: "Node.js", curl: "cURL" };

export function buildSnippets(baseUrl: string, apiKey = "sk-your-key"): Record<Lang, string> {
  return {
    python: `from openai import OpenAI

client = OpenAI(
    api_key="${apiKey}",
    base_url="${baseUrl}",
)

resp = client.chat.completions.create(
    model="claude-3-5-sonnet",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(resp.choices[0].message.content)`,
    node: `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${apiKey}",
  baseURL: "${baseUrl}",
});

const resp = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(resp.choices[0].message.content);`,
    curl: `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"deepseek-v3","messages":[{"role":"user","content":"Hello!"}]}'`,
  };
}

export function CodeSwitcher({ baseUrl, apiKey }: { baseUrl: string; apiKey?: string }) {
  const [lang, setLang] = useState<Lang>("python");
  const snippets = buildSnippets(baseUrl, apiKey);

  return (
    <div className="overflow-hidden rounded-xl border border-navy-border bg-navy-card shadow-2xl shadow-brand-blue/10">
      <div className="flex items-center justify-between border-b border-navy-border px-3 py-2">
        <div role="tablist" aria-label="Code language" className="flex gap-1">
          {(Object.keys(LABELS) as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              id={`tab-${l}`}
              aria-selected={lang === l}
              aria-controls="code-panel"
              onClick={() => setLang(l)}
              className={`focus-brand rounded-md px-3 py-1 text-xs font-medium transition ${
                lang === l ? "bg-brand-blue text-white" : "text-ink-muted hover:text-brand-cyan"
              }`}
            >
              {LABELS[l]}
            </button>
          ))}
        </div>
        <CopyButton value={snippets[lang]} />
      </div>
      <pre
        id="code-panel"
        role="tabpanel"
        aria-labelledby={`tab-${lang}`}
        tabIndex={0}
        className="focus-brand overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-ink-body"
      >
        <code>{snippets[lang]}</code>
      </pre>
    </div>
  );
}
