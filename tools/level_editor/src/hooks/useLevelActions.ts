import { useEffect, useState } from "react";
import { bootLevel, buildLevel, type LevelInfo } from "../api";

export interface ActionStatus {
  text: string;
  detail?: string; // the build's whole output, shown on hover
  failed?: boolean;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const lastLine = (output: string) => output.trim().split(/\r?\n/).pop() ?? "";

// building the open level with build_level.py, and setting the game to boot into it
export function useLevelActions(level: LevelInfo | null, unsaved: boolean, save: () => Promise<boolean>) {
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<ActionStatus | null>(null);
  useEffect(() => setStatus(null), [level]);

  // saves first, as the build reads objects.json
  const build = async () => {
    if (!level) {
      return;
    }
    if (unsaved && !(await save())) {
      return;
    }
    setIsBusy(true);
    setStatus({ text: "Building..." });
    try {
      const result = await buildLevel(level.name);
      if (result.ok) {
        setStatus({ text: `Built ${level.name}`, detail: result.output });
      } else {
        setStatus({ text: `Build failed: ${lastLine(result.output)}`, detail: result.output, failed: true });
      }
    } catch (error) {
      setStatus({ text: `Build failed: ${messageOf(error)}`, failed: true });
    } finally {
      setIsBusy(false);
    }
  };

  const boot = async () => {
    if (!level) {
      return;
    }
    try {
      await bootLevel(level.name);
      setStatus({ text: `The game boots into ${level.name}` });
    } catch (error) {
      setStatus({ text: `Couldn't set boot_level: ${messageOf(error)}`, failed: true });
    }
  };

  return { isBusy, status, build, boot };
}
