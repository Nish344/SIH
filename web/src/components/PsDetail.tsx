import { buildPrompt } from "../lib/prompt";
import { openLlm, type LlmProvider } from "../lib/llmLinks";
import { contactHref, formatAbsoluteTime, isLinkableContact } from "../lib/format";
import type { PsRecord } from "../types";

type PsDetailProps = {
  record: PsRecord | null;
  sourceUrl: string;
  onToast: (message: string) => void;
};

const LLM_BUTTONS: { provider: LlmProvider; label: string }[] = [
  { provider: "chatgpt", label: "ChatGPT" },
  { provider: "claude", label: "Claude" },
  { provider: "gemini", label: "Gemini" },
];

export function PsDetail({ record, sourceUrl, onToast }: PsDetailProps) {
  if (!record) {
    return (
      <div className="ps-detail empty">
        <p>Select a problem statement to view details.</p>
      </div>
    );
  }

  async function handleLlm(provider: LlmProvider, action: "copy" | "open") {
    const prompt = buildPrompt(record!);
    const plan = openLlm(provider, prompt);

    if (plan.mode === "copy_fallback" || action === "copy") {
      try {
        await navigator.clipboard.writeText(prompt);
      } catch {
        onToast("Could not copy to clipboard — check browser permissions.");
        return;
      }
    }

    if (action === "open") {
      window.open(plan.url, "_blank", "noopener,noreferrer");
    }

    if (plan.mode === "copy_fallback" && action === "open") {
      onToast("Prompt copied — paste it in the chat window.");
    } else if (action === "copy") {
      onToast("Prompt copied to clipboard.");
    }
  }

  return (
    <article className="ps-detail">
      <header className="detail-header">
        <span className="detail-ps-num">{record.ps_number}</span>
        <h2>{record.title}</h2>
        <p className="detail-org">{record.organization}</p>
      </header>

      <div className="detail-meta">
        <div>
          <span className="meta-label">Category</span>
          <span>{record.category}</span>
        </div>
        <div>
          <span className="meta-label">Theme</span>
          <span>{record.theme}</span>
        </div>
        <div>
          <span className="meta-label">Department</span>
          <span>{record.department}</span>
        </div>
        <div>
          <span className="meta-label">Deadline</span>
          <span>{record.deadline}</span>
        </div>
        {record.contact && (
          <div>
            <span className="meta-label">Contact</span>
            {isLinkableContact(record.contact) ? (
              <a href={contactHref(record.contact)} target="_blank" rel="noopener noreferrer">
                {record.contact}
              </a>
            ) : (
              <span>{record.contact}</span>
            )}
          </div>
        )}
      </div>

      <div className="detail-links">
        {record.dataset_url && (
          <a href={record.dataset_url} target="_blank" rel="noopener noreferrer">
            Dataset
          </a>
        )}
        {record.youtube_url && (
          <a href={record.youtube_url} target="_blank" rel="noopener noreferrer">
            YouTube
          </a>
        )}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          Official catalogue
        </a>
      </div>

      <div className="detail-description">
        <h3>Description</h3>
        <p>{record.description_text}</p>
      </div>

      <div className="detail-llm">
        <button type="button" onClick={() => handleLlm("chatgpt", "copy")}>
          Copy prompt
        </button>
        {LLM_BUTTONS.map(({ provider, label }) => (
          <button key={provider} type="button" onClick={() => handleLlm(provider, "open")}>
            Open {label}
          </button>
        ))}
      </div>

      <footer className="detail-footer">
        <span>Scraped {formatAbsoluteTime(record.scraped_at)}</span>
      </footer>
    </article>
  );
}
