import { useEffect, useState } from "react";
import { bootLevel, buildLevel, type LevelInfo } from "../api";

export interface ActionStatus {
  text: string;
  detail?: string; // the build's whole output, shown on hover
  failed?: boolean;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const lastLine = (output: string) => output.trim().split(/\r?\n/).pop() ?? "";

// building the open level, and setting the game to boot into it (or both, F5)
export function useLevelActions(level: LevelInfo | null, unsaved: boolean, save: () => Promise<boolean>) {
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<ActionStatus | null>(null);
  useEffect(() => setStatus(null), [level]);

  // saves first, as the build reads objects.json; true if it built
  const build = async (): Promise<boolean> => {
    if (!level || isBusy) {
      return false;
    }
    if (unsaved && !(await save())) {
      return false;
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
      return result.ok;
    } catch (error) {
      setStatus({ text: `Build failed: ${messageOf(error)}`, failed: true });
      return false;
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

  // boots only if the build worked
  const buildAndBoot = async () => {
    if (await build()) {
      await boot();
    }
  };

  return { isBusy, status, build, boot, buildAndBoot };
}
