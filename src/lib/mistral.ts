// ============================================================
// MARKITX LINKEDIN AUTOMATION — MISTRAL CLIENT
// ============================================================
// Wraps the Mistral SDK with retry logic, error handling,
// and structured output parsing. All agents route through here.

import Mistral from "@mistralai/mistralai";

let _client: Mistral | null = null;

export function getMistralClient(): Mistral {
  if (!_client) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY not set");
    _client = new Mistral({ apiKey });
  }
  return _client;
}

// ============================================================
// CORE COMPLETION FUNCTION
// model: mistral-large-latest for agents, mistral-small-latest
// for fast/cheap tasks like hashtag gen and scoring
// ============================================================

export interface CompletionOptions {
  system: string;
  user: string;
  model?: "mistral-large-latest" | "mistral-small-latest" | "open-mixtral-8x22b";
  temperature?: number;
  max_tokens?: number;
  json_mode?: boolean;
}

export async function complete(options: CompletionOptions): Promise<string> {
  const client = getMistralClient();

  const model = options.model ?? "mistral-large-latest";
  const temperature = options.temperature ?? 0.85;
  const max_tokens = options.max_tokens ?? 2000;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
  ];

  const response = await client.chat.complete({
    model,
    messages,
    temperature,
    maxTokens: max_tokens,
    ...(options.json_mode ? { responseFormat: { type: "json_object" } } : {}),
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error(`Mistral returned empty content for model ${model}`);
  }

  return content.trim();
}

// ============================================================
// JSON COMPLETION — parses and validates JSON from Mistral
// Use when you need structured output from an agent
// ============================================================

export async function completeJSON<T>(options: CompletionOptions): Promise<T> {
  const raw = await complete({ ...options, json_mode: true });

  try {
    // Strip any accidental markdown fences Mistral might add
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Failed to parse JSON from Mistral response:\n${raw}`);
  }
}

// ============================================================
// RETRY WRAPPER — for flaky API calls in production
// ============================================================

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}
