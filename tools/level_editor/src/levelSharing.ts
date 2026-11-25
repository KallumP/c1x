// what the editor says when sharing a level on mod.io
import { errorMessage } from "./errorMessage";
import { defaultLevelTitle } from "./levelTitle";
import { isSignedOutError, type Uploaded } from "./modioApi";

export function uploadButtonText(isOnline: boolean): string {
  if (isOnline) {
    return "Update level";
  }
  return "Upload";
}

// what an upload says once it's done
export function uploadedText({ isNew }: Uploaded): string {
  if (isNew) {
    return "Upload successful.";
  }
  return "Upload successful, a new version is up.";
}

// the name players see the level by on mod.io: its title, as the upload names it
// (levelOptions' titleOf), from level.cfg's title or else its folder's name
export function showsUpAsText(cfgTitle: string, folderName: string): string {
  return `This level will show up as: ${cfgTitle || defaultLevelTitle(folderName)}`;
}

// what the dialog says of whether the level has been uploaded
export function onlineText(isOnline: boolean): string {
  if (isOnline) {
    return "This level is already online. You can update the level if you've made changes below.";
  }
  return "This level hasn't been uploaded yet.";
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
