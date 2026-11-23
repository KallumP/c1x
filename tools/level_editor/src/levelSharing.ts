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

// what an upload says, before its link to the level on mod.io
export function uploadedText({ isNew }: Uploaded): string {
  if (isNew) {
    return "Upload successful, see it on";
  }
  return "Upload successful, see the new version on";
}

// what the dialog says of the map, before a link to it on mod.io if it's there
export function onlineText(isOnline: boolean): string {
  if (isOnline) {
    return "This map is already on";
  }
  return "This map isn't on mod.io yet.";
}

// where a level's picture on mod.io comes from: the one it has, the view, or an image file
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

export function firstPictureChoice(isOnline: boolean): PictureChoice {
  return pictureChoices(isOnline)[0];
}

export function pictureProblem(choice: PictureChoice, hasImage: boolean): string | null {
  if (choice === "image" && !hasImage) {
    return "Choose an image for its picture first.";
  }
  return null;
}
