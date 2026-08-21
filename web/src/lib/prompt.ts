import type { PsRecord } from "../types";

export function buildPrompt(record: PsRecord): string {
  return `You are helping a Smart India Hackathon team evaluate a problem statement.

PS Number: ${record.ps_number}
PS ID: ${record.ps_id}
Title: ${record.title}
Category: ${record.category}
Theme: ${record.theme}
Organization: ${record.organization}

Description:
${record.description_text}

Please propose: (1) a concrete technical approach, (2) feasibility for a student team in ~36 hours of build time after prep, (3) main risks, (4) a crisp one-paragraph pitch.`;
}
