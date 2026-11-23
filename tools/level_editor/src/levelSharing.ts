// what the editor says when sharing a level on mod.io
import type { Uploaded } from "./modioApi";

export const SUMMARY_MAX = 250; // the longest summary mod.io takes

export function summaryProblem(summary: string): string | null {
  if (summary.trim() === "") {
    return "Write a summary for players first.";
  }
  if (summary.length > SUMMARY_MAX) {
    return `A summary can be at most ${SUMMARY_MAX} characters.`;
  }
  return null;
}

export function uploadButtonText(isOnline: boolean): string {
  if (isOnline) {
    return "Upload new version";
  }
  return "Upload";
}

export function uploadedText({ isNew }: Uploaded): string {
  if (isNew) {
    return "It's on mod.io.";
  }
  return "Its new version is on mod.io.";
}
