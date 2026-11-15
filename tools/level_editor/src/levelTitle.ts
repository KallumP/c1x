// a custom level's title, shown on its loading screen (level.cfg's title, set under Level in the editor):
// the build draws it in the letters the game's own loading screens name their levels in
// (builder/signFont.ts), so it can only have the characters they have

export const TITLE_MAX_LENGTH = 20; // as long as the game's longest name, Fumbling in the Dark

// the characters the letters draw, besides letters (drawn as capitals)
export const TITLE_PUNCTUATION = " .";

const isTitleCharacter = (character: string) => /^[A-Za-z]$/.test(character) || TITLE_PUNCTUATION.includes(character);

const capitalised = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

// a title as it's typed, keeping only the characters the letters draw, up to the most there can be
export function drawableTitle(typed: string): string {
  return [...typed].filter(isTitleCharacter).join("").slice(0, TITLE_MAX_LENGTH);
}

// words without the number in front that orders the levels, if they have one
function withoutOrderNumber(words: string[]): string[] {
  if (words.length > 1 && /^\d+$/.test(words[0])) {
    return words.slice(1);
  }
  return words;
}

// a level's title when its level.cfg doesn't give one: its folder's name in words, without the
// number in front that orders the levels ("1_tide_ruins" is "Tide Ruins") or what can't be drawn
export function defaultLevelTitle(folderName: string): string {
  const words = withoutOrderNumber(folderName.split("_").filter((word) => word !== ""));
  const drawableWords = words.map(drawableTitle).filter((word) => word !== "");
  return drawableTitle(drawableWords.map(capitalised).join(" ")).trim();
}

// why a title can't be drawn on the loading screen, or null if it can
export function levelTitleProblem(title: string): string | null {
  if (title.length > TITLE_MAX_LENGTH) {
    return `a title can be at most ${TITLE_MAX_LENGTH} characters, and this is ${title.length}`;
  }
  const unknown = [...title].find((character) => !isTitleCharacter(character));
  if (unknown !== undefined) {
    return `a title can only have letters, spaces and full stops, as the game's loading screens do, not ${unknown}`;
  }
  return null;
}
