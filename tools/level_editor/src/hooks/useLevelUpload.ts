import { useEffect, useState } from "react";
import type { LevelInfo } from "../api";
import { viewLogo } from "../levelLogo";
import { summaryProblem } from "../levelSharing";
import { fetchOnlineLevel, uploadLevel, type LevelMod, type Uploaded } from "../modioApi";

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// the editor's view, as the level's logo
function takeLogo(): string {
  const canvas = document.querySelector<HTMLCanvasElement>(".viewport canvas");
  if (!canvas) {
    throw new Error("There's no view of the level to take its logo from.");
  }
  return viewLogo(canvas);
}

// uploading the open level to mod.io once the player's signed in: a new mod, with
// a summary and the view as its logo, or a new version of the one it has
export function useLevelUpload(level: LevelInfo | null, signedIn: boolean | null, save: () => Promise<boolean>) {
  const [online, setOnline] = useState<LevelMod | null | undefined>(undefined); // undefined until mod.io says
  const [summary, setSummary] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);

  useEffect(() => {
    setOnline(undefined);
    setUploaded(null);
    setProblem(null);
    if (!level || !signedIn) {
      return;
    }
    fetchOnlineLevel(level.name).then(setOnline, (error) => setProblem(messageOf(error)));
  }, [level, signedIn]);

  // a new level needs a summary; a new version keeps its mod's
  const typedProblem = () => {
    if (online) {
      return null;
    }
    return summaryProblem(summary);
  };

  const sendUpload = async (name: string) => {
    if (!(await save())) {
      setProblem("It didn't save, so it wasn't uploaded.");
      return;
    }
    const done = await uploadLevel(name, summary.trim(), takeLogo());
    setUploaded(done);
    setOnline(done.mod);
  };

  const upload = async () => {
    const found = typedProblem();
    setProblem(found);
    if (!level || found || isBusy) {
      return;
    }
    setIsBusy(true);
    setUploaded(null);
    try {
      await sendUpload(level.name);
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setIsBusy(false);
    }
  };

  return { online, summary, setSummary, problem, isBusy, uploaded, upload };
}
