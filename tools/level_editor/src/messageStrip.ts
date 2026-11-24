// the strip under the level editor's toolbar: the level's error and a failed
// build's, or else the last build's warnings
import type { ActionStatus } from "./hooks/useLevelActions";

export interface StripLine {
  text: string;
  detail?: string; // shown on hover
}

export interface Strip {
  kind: "error" | "warning";
  lines: StripLine[];
}

function errorLines(error: string | null, status: ActionStatus | null): StripLine[] {
  const lines: StripLine[] = [];
  if (error) {
    lines.push({ text: error });
  }
  if (status?.failed) {
    lines.push({ text: status.text, detail: status.detail });
  }
  return lines;
}

// what the strip shows, if anything
export function messageStrip(error: string | null, status: ActionStatus | null, warnings: string[]): Strip | null {
  const errors = errorLines(error, status);
  if (errors.length > 0) {
    return { kind: "error", lines: errors };
  }
  if (warnings.length > 0) {
    return { kind: "warning", lines: warnings.map((warning) => ({ text: `Warning: ${warning}` })) };
  }
  return null;
}
