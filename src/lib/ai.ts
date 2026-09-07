/**
 * Thin client for any OpenAI-compatible chat API (OpenAI, Groq, Ollama,
 * OpenRouter…). Configure with AI_API_KEY / AI_BASE_URL / AI_MODEL.
 * Every caller must handle the null return (no key configured or request
 * failed) by falling back to heuristics — the app never depends on AI.
 */

export function aiEnabled() {
  return Boolean(process.env.AI_API_KEY);
}

export async function aiChat(
  messages: { role: "system" | "user"; content: string }[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string | null> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 600,
        temperature: 0.4,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
