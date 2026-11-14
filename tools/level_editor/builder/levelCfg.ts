// a level source's level.cfg: the scale, turn, sky, camera and music (and its volume) the level is built with,
// one "key = value" a line. the build reads it strictly, so a mistake stops it
// with a message; the editor reads it leniently (server/levelCfg.ts)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SCALE } from "../src/coords";
import { CAMERA_ANGLE_MAX, CAMERA_ANGLE_MIN, CAMERA_DISTANCE_MAX, CAMERA_DISTANCE_MIN, DEFAULT_CAMERA, isCameraAngle, isCameraDistance, type Camera } from "../src/camera";
import { AUDIO_SONG_EXTENSIONS, DEFAULT_MUSIC, DEFAULT_MUSIC_VOLUME, isAudioSongName, isMusicName, isMusicVolume, MUSIC_VOLUME_MAX, MUSIC_VOLUME_MIN, SOUNDTRACKS } from "../src/music";
import { DEFAULT_SKY, isSkySplit, parseRgb, SKY_ROWS, type Rgb, type Sky } from "../src/sky";

export const LEVEL_CFG = "level.cfg";

export interface LevelOptions {
  scale: number; // game units per blender metre
  turn: number;  // degrees to turn the level about the up axis
  sky: Sky;
  camera: Camera;
  music: string; // one of SOUNDTRACKS' names, or an audio file in the level's folder (isAudioSongName)
  musicVolume: number; // how loud an audio file music plays, a percent of the game's music loudness
}

// what a level.cfg sets, each by its key
export interface LevelCfgSettings {
  scale?: number;
  turn?: number;
  sky_top?: Rgb;
  sky_bottom?: Rgb;
  sky_split?: number;
  camera_distance?: number;
  camera_angle?: number;
  music?: string;
  music_volume?: number;
}

const WHOLE_NUMBERS = ["scale", "turn"];
const COLOURS = ["sky_top", "sky_bottom"];
const SETTINGS = [...WHOLE_NUMBERS, ...COLOURS, "sky_split", "camera_distance", "camera_angle", "music", "music_volume"];

const isComment = (line: string) => line === "" || line.startsWith("#");
const isWholeNumber = (value: string) => /^[+-]?\d+$/.test(value);

function readWholeNumber(key: string, value: string, where: string): number {
  if (!isWholeNumber(value)) {
    throw new Error(`${where}: ${key} has to be a whole number, not ${value || "nothing"}`);
  }
  return Number(value);
}

function readColour(key: string, value: string, where: string): Rgb {
  const colour = parseRgb(value);
  if (!colour) {
    throw new Error(`${where}: ${key} has to be red, green, blue (0 to 255 each), not ${value || "nothing"}`);
  }
  return colour;
}

function readSkySplit(value: string, where: string): number {
  const split = readWholeNumber("sky_split", value, where);
  if (!isSkySplit(split)) {
    throw new Error(`${where}: sky_split has to be 0 to ${SKY_ROWS}, not ${value}`);
  }
  return split;
}

function readCameraDistance(value: string, where: string): number {
  const distance = Number(value);
  if (value === "" || !isCameraDistance(distance)) {
    throw new Error(`${where}: camera_distance has to be ${CAMERA_DISTANCE_MIN} to ${CAMERA_DISTANCE_MAX}, not ${value || "nothing"}`);
  }
  return distance;
}

function readCameraAngle(value: string, where: string): number {
  const angle = readWholeNumber("camera_angle", value, where);
  if (!isCameraAngle(angle)) {
    throw new Error(`${where}: camera_angle has to be ${CAMERA_ANGLE_MIN} to ${CAMERA_ANGLE_MAX}, not ${value}`);
  }
  return angle;
}

// music: one of the soundtracks, by name, or an audio file in the level's folder
function readMusic(value: string, where: string, folder: string): string {
  if (isMusicName(value)) {
    return value;
  }
  if (!isAudioSongName(value)) {
    const names = SOUNDTRACKS.map(({ name }) => name).join(", ");
    throw new Error(`${where}: music has to be one of ${names}, or an audio file in the level's folder (${AUDIO_SONG_EXTENSIONS.join(", ")}), not ${value || "nothing"}`);
  }
  if (!existsSync(join(folder, value))) {
    throw new Error(`${where}: music is ${value}, but the level's folder has no file called that`);
  }
  return value;
}

function readMusicVolume(value: string, where: string): number {
  const volume = readWholeNumber("music_volume", value, where);
  if (!isMusicVolume(volume)) {
    throw new Error(`${where}: music_volume has to be ${MUSIC_VOLUME_MIN} to ${MUSIC_VOLUME_MAX}, not ${value}`);
  }
  return volume;
}

// the setting one line gives; an unknown setting, or a value it can't take, is an error
function readSetting(line: string, where: string, folder: string): [keyof LevelCfgSettings, number | Rgb | string] {
  const equals = line.indexOf("=");
  if (equals < 0) {
    throw new Error(`${where}: expected key = value`);
  }
  const key = line.slice(0, equals).trim();
  const value = line.slice(equals + 1).trim();
  if (!SETTINGS.includes(key)) {
    throw new Error(`${where}: unknown setting ${key} (it takes ${SETTINGS.join(", ")})`);
  }
  if (COLOURS.includes(key)) {
    return [key as keyof LevelCfgSettings, readColour(key, value, where)];
  }
  if (key === "sky_split") {
    return [key, readSkySplit(value, where)];
  }
  if (key === "camera_distance") {
    return [key, readCameraDistance(value, where)];
  }
  if (key === "camera_angle") {
    return [key, readCameraAngle(value, where)];
  }
  if (key === "music") {
    return [key, readMusic(value, where, folder)];
  }
  if (key === "music_volume") {
    return [key, readMusicVolume(value, where)];
  }
  return [key as keyof LevelCfgSettings, readWholeNumber(key, value, where)];
}

// the settings the level.cfg in folder gives (none without one)
export function readLevelCfg(folder: string): LevelCfgSettings {
  const path = join(folder, LEVEL_CFG);
  if (!existsSync(path)) {
    return {};
  }
  const settings: Record<string, number | Rgb | string> = {};
  readFileSync(path, "utf8").split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!isComment(line)) {
      const [key, value] = readSetting(line, `${path}, line ${index + 1}`, folder);
      settings[key] = value;
    }
  });
  return settings as LevelCfgSettings;
}

// the level's sky: what its level.cfg sets, else n. sanity beach's
function skyOf(settings: LevelCfgSettings): Sky {
  return {
    top: settings.sky_top ?? DEFAULT_SKY.top,
    bottom: settings.sky_bottom ?? DEFAULT_SKY.bottom,
    split: settings.sky_split ?? DEFAULT_SKY.split,
  };
}

// the level's camera: what its level.cfg sets, else where it always was
function cameraOf(settings: LevelCfgSettings): Camera {
  return {
    distance: settings.camera_distance ?? DEFAULT_CAMERA.distance,
    angle: settings.camera_angle ?? DEFAULT_CAMERA.angle,
  };
}

// the scale, turn, sky, camera and music for the level source in folder: those given, else its level.cfg's, else the defaults
export function levelOptions(folder: string, given: Partial<LevelOptions> = {}): LevelOptions {
  const settings = readLevelCfg(folder);
  return {
    scale: given.scale ?? settings.scale ?? DEFAULT_SCALE,
    turn: given.turn ?? settings.turn ?? 0,
    sky: given.sky ?? skyOf(settings),
    camera: given.camera ?? cameraOf(settings),
    music: given.music ?? settings.music ?? DEFAULT_MUSIC,
    musicVolume: given.musicVolume ?? settings.music_volume ?? DEFAULT_MUSIC_VOLUME,
  };
}
