// what the editor says when sharing a level on mod.io
import { errorMessage } from "./errorMessage";
import { isSignedOutError, type Uploaded } from "./modioApi";

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

// what an upload says, around its link to the level on mod.io
export function uploadedText({ isNew }: Uploaded): LinkedText {
  if (isNew) {
    return { before: "Upload successful, view it", link: "here", after: "." };
  }
  return { before: "Upload successful, view the new version", link: "here", after: "." };
}

// a line of text with a link in it: the link's text, or null for none
export interface LinkedText {
  before: string;
  link: string | null;
  after: string;
}

// what the dialog says of the map, around a link to it on mod.io if it's there
export function onlineText(isOnline: boolean): LinkedText {
  if (isOnline) {
    return {
      before: "This map has already been uploaded to mod.io, view it",
      link: "here",
      after: ". Alternatively, upload a new version below.",
    };
  }
  return { before: "This map isn't on mod.io yet.", link: null, after: "" };
}

// where a level's picture on mod.io comes from: the one it has, the view, or an
// image file
export type PictureChoice = "keep" | "view" | "image";

export const PICTURE_LABELS: Record<PictureChoice, string> = {
  keep: "Keep its picture",
  view: "The current level view from the level editor",
  image: "An image",
};

// a new level needs a picture; one already online can keep its own
export function pictureChoices(isOnline: boolean): PictureChoice[] {
  if (isOnline) {
    return ["keep", "view", "image"];
  }
  return ["view", "image"];
}

// why the level can't be uploaded as it's set up, or null if it can: a new level
// needs a summary (one already online keeps its own), and an image needs choosing
export function uploadProblem(
  isOnline: boolean,
  summary: string,
  choice: PictureChoice,
  hasImage: boolean,
): string | null {
  if (!isOnline) {
    const missingSummary = summaryProblem(summary);
    if (missingSummary) {
      return missingSummary;
    }
  }
  return pictureProblem(choice, hasImage);
}

export function pictureProblem(choice: PictureChoice, hasImage: boolean): string | null {
  if (choice === "image" && !hasImage) {
    return "Choose an image for its picture first.";
  }
  return null;
}

// what to do about a failed request: sign the player out if it was their sign-in
// that was refused, else say why it failed
export function failureOutcome(error: unknown): { signOut: true } | { problem: string } {
  if (isSignedOutError(error)) {
    return { signOut: true };
  }
  return { problem: errorMessage(error) };
}

// saves the level, then uploads it; what it uploaded, or null if it didn't save
export async function uploadAfterSaving(
  save: () => Promise<boolean>,
  upload: () => Promise<Uploaded>,
): Promise<Uploaded | null> {
  if (!(await save())) {
    return null;
  }
  return upload();
}
