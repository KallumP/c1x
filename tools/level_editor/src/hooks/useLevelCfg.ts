import { useEffect, useState } from "react";
import { fetchLevelCfg, saveLevelCfg, type LevelCfg, type LevelInfo } from "../api";
import { DEFAULT_CAMERA, type Camera } from "../camera";
import { DEFAULT_SCALE } from "../coords";
import { DEFAULT_MUSIC, DEFAULT_MUSIC_VOLUME } from "../music";
import { DEFAULT_SKY, isSameSky } from "../sky";

const isSameCamera = (first: Camera, second: Camera) => first.distance === second.distance && first.angle === second.angle;

const sameCfg = (first: LevelCfg, second: LevelCfg) =>
  first.turn === second.turn && first.scale === second.scale && isSameSky(first.sky, second.sky) && isSameCamera(first.camera, second.camera)
  && first.music === second.music && first.musicVolume === second.musicVolume;

// the level list's scale, until level.cfg is read, so boxes don't change size as it opens
const listedCfg = (level: LevelInfo | null): LevelCfg => ({ turn: 0, scale: level ? level.scale : DEFAULT_SCALE, sky: DEFAULT_SKY, camera: DEFAULT_CAMERA, music: DEFAULT_MUSIC, musicVolume: DEFAULT_MUSIC_VOLUME });

// the open level's turn, scale, sky, camera and music as they're edited: read from its level.cfg when it
// opens, and written back on save. unsaved is whether they differ from the file
export function useLevelCfg(level: LevelInfo | null, onError: (message: string) => void) {
  const [cfg, setCfg] = useState<LevelCfg>(listedCfg(level));
  const [savedCfg, setSavedCfg] = useState<LevelCfg>(listedCfg(level));

  useEffect(() => {
    setCfg(listedCfg(level));
    setSavedCfg(listedCfg(level));
    if (!level) {
      return;
    }
    let isLatestLoad = true; // false once the level changes, so a late load is dropped
    const loadCfg = async () => {
      try {
        const fetchedCfg = await fetchLevelCfg(level.name);
        if (isLatestLoad) {
          setCfg(fetchedCfg);
          setSavedCfg(fetchedCfg);
        }
      } catch (error) {
        if (isLatestLoad) {
          onError(`level.cfg ${error instanceof Error ? error.message : error}`);
        }
      }
    };
    loadCfg();
    return () => {
      isLatestLoad = false;
    };
  }, [level, onError]);

  const change = (changes: Partial<LevelCfg>) => setCfg((current) => ({ ...current, ...changes }));

  // whether it saved
  const save = async (): Promise<boolean> => {
    if (!level) {
      return false;
    }
    try {
      await saveLevelCfg(level.name, cfg);
      setSavedCfg(cfg);
      return true;
    } catch (error) {
      onError(`couldn't save level.cfg: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  };

  return { cfg, change, unsaved: !sameCfg(cfg, savedCfg), save };
}
