import { useEffect, useState } from "react";
import type { LevelInfo } from "../api";
import { viewLogo } from "../levelLogo";
import { failureOutcome, uploadAfterSaving } from "../levelSharing";
import {
  fetchOwnLevelMod,
  uploadLevel,
  type LevelMod,
  type Uploaded,
} from "../modioApi";

// the editor's view, as a picture for the level, or null if there's no view
function takeViewPicture(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>(".viewport canvas");
  if (!canvas) {
    return null;
  }
  return viewLogo(canvas);
}

// the picture an upload sends: the view for a new level; none for a new version,
// which keeps the picture it has
function pictureToSend(online: LevelMod | null | undefined, view: string | null): string | null {
  if (online) {
    return null;
  }
  return view;
}

// uploading the open level to mod.io once the player's signed in: a new mod, its
// picture the view as it was when the Share dialog opened, or a new version of
// the one it has
export function useLevelUpload(
  level: LevelInfo,
  signedIn: boolean | null,
  save: () => Promise<boolean>,
  // the player's sign-in was refused, so they have to sign in again
  onSignedOut: () => void,
) {
  // undefined until mod.io says
  const [online, setOnline] = useState<LevelMod | null | undefined>(undefined);
  const [viewPicture, setViewPicture] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);

  useEffect(() => setViewPicture(takeViewPicture()), []);

  // why a request failed, or back to signing in if it was the sign-in that failed
  const showFailure = (error: unknown) => {
    const outcome = failureOutcome(error);
    if ("signOut" in outcome) {
      onSignedOut();
      return;
    }
    setProblem(outcome.problem);
  };

  useEffect(() => {
    setOnline(undefined);
    setUploaded(null);
    setProblem(null);
    if (!signedIn) {
      return;
    }
    fetchOwnLevelMod(level.name).then(setOnline, showFailure);
  }, [level, signedIn]);

  const sendUpload = async () => {
    const send = () => uploadLevel(level.name, pictureToSend(online, viewPicture));
    const done = await uploadAfterSaving(save, send);
    if (!done) {
      setProblem("It didn't save, so it wasn't uploaded.");
      return;
    }
    setUploaded(done);
    setOnline(done.mod);
  };

  const upload = async () => {
    if (isBusy) {
      return;
    }
    setProblem(null);
    setIsBusy(true);
    setUploaded(null);
    try {
      await sendUpload();
    } catch (error) {
      showFailure(error);
    } finally {
      setIsBusy(false);
    }
  };

  return { online, problem, isBusy, uploaded, upload };
}
