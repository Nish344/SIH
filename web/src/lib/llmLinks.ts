const URL_LENGTH_CUTOFF = 1800;

const BASE_URLS = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
  gemini: "https://gemini.google.com/app",
} as const;

const PREFILL_PREFIX = {
  chatgpt: "https://chatgpt.com/?q=",
  claude: "https://claude.ai/new?q=",
  gemini: "https://gemini.google.com/app?q=",
} as const;

export type LlmProvider = keyof typeof BASE_URLS;

export function openLlm(
  provider: LlmProvider,
  prompt: string,
): { mode: "prefill" | "copy_fallback"; url: string } {
  const url = PREFILL_PREFIX[provider] + encodeURIComponent(prompt);
  if (url.length <= URL_LENGTH_CUTOFF) {
    return { mode: "prefill", url };
  }
  return { mode: "copy_fallback", url: BASE_URLS[provider] };
}
