import { Resend } from "resend";
import { GATEWAY_BASE_URL } from "@/lib/pricing";

let client: Resend | null = null;

function getResend(): Resend {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY must be set");
  client = new Resend(apiKey);
  return client;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type OnboardingEmailInput = {
  to: string;
  keySecret: string;
  amountUsd: number;
  quotaGranted: number;
  isTopup: boolean;
};

export async function sendOnboardingEmail(input: OnboardingEmailInput): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM must be set");

  const key = escapeHtml(input.keySecret);
  const base = escapeHtml(GATEWAY_BASE_URL);
  const usd = (input.quotaGranted / 500_000).toFixed(2);
  const subject = input.isTopup
    ? `Your API key was topped up with $${usd} of credit`
    : "Your new API key is ready";

  const curl = `curl ${base}/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-3-5-sonnet","messages":[{"role":"user","content":"Hello"}]}'`;

  const python = `from openai import OpenAI

client = OpenAI(api_key="${key}", base_url="${base}")
resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp.choices[0].message.content)`;

  const pre =
    'style="background:#0f1115;color:#e4e4e7;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;white-space:pre"';

  const html = `<!doctype html>
<html><body style="margin:0;background:#08090a;font-family:-apple-system,Segoe UI,sans-serif;color:#e4e4e7">
<div style="max-width:600px;margin:0 auto;padding:32px 24px">
  <h1 style="font-size:20px;color:#fff;margin:0 0 8px">${escapeHtml(subject)}</h1>
  <p style="color:#a1a1aa;margin:0 0 24px">Payment of $${input.amountUsd.toFixed(2)} received. ${
    input.isTopup ? "Credit was added to your existing key." : "Here is everything you need to start."
  }</p>
  <h2 style="font-size:14px;color:#fff;margin:24px 0 8px">API key</h2>
  <pre ${pre}>${key}</pre>
  <h2 style="font-size:14px;color:#fff;margin:24px 0 8px">Base URL</h2>
  <pre ${pre}>${base}</pre>
  <h2 style="font-size:14px;color:#fff;margin:24px 0 8px">Quickstart (curl)</h2>
  <pre ${pre}>${curl}</pre>
  <h2 style="font-size:14px;color:#fff;margin:24px 0 8px">OpenAI Python SDK</h2>
  <pre ${pre}>${python}</pre>
  <p style="color:#71717a;font-size:12px;margin-top:32px">Treat this key like a password. Credit granted: $${usd} (${input.quotaGranted.toLocaleString(
    "en-US",
  )} quota units). Credit never expires.</p>
</div></body></html>`;

  const text = [
    subject,
    "",
    `API key: ${input.keySecret}`,
    `Base URL: ${GATEWAY_BASE_URL}`,
    "",
    "Quickstart:",
    curl.replace(/&quot;/g, '"'),
  ].join("\n");

  const { error } = await getResend().emails.send({
    from,
    to: input.to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}
