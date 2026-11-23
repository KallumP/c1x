import { describe, expect, test } from "vitest";
import { addLevelFile, addLevelMod, MODIO_GAME } from "../../scripts/modio";

// a stand-in for fetch answering every request with answer, and the requests it was sent
function standInFetch(answer: unknown, status = 200) {
  const requests: { url: string; init?: RequestInit }[] = [];
  const fetchUrl = async (url: string, init?: RequestInit) => {
    requests.push({ url, init });
    return new Response(JSON.stringify(answer), { status });
  };
  return { fetchUrl, requests };
}

const formOf = (init?: RequestInit) => init?.body as FormData;
const LOGO = new Uint8Array([1, 2, 3]);
const ZIP = new Uint8Array([4, 5, 6]);
const NEW_LEVEL = { name: "Tide Ruins", summary: "A beach.", folder: "1_tide_ruins", logo: LOGO };
const MOD_ANSWER = { id: 17302, profile_url: "https://test.mod.io/g/crash-1-n-hanced/m/tide-ruins" };

describe("adding a level's mod", () => {
  test("posts to the game's mods", async () => {
    const { fetchUrl, requests } = standInFetch(MOD_ANSWER);
    await addLevelMod("token", NEW_LEVEL, fetchUrl);
    expect(requests[0].url).toBe(`${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}/mods`);
    expect(requests[0].init?.method).toBe("POST");
  });

  test("signs in with the player's token", async () => {
    const { fetchUrl, requests } = standInFetch(MOD_ANSWER);
    await addLevelMod("token", NEW_LEVEL, fetchUrl);
    expect(new Headers(requests[0].init?.headers).get("Authorization")).toBe("Bearer token");
  });

  test("sends its name, summary and Level tag", async () => {
    const { fetchUrl, requests } = standInFetch(MOD_ANSWER);
    await addLevelMod("token", NEW_LEVEL, fetchUrl);
    const form = formOf(requests[0].init);
    expect([form.get("name"), form.get("summary"), form.get("tags[]")]).toEqual(["Tide Ruins", "A beach.", "Level"]);
  });

  test("keeps the level's folder name as its metadata", async () => {
    const { fetchUrl, requests } = standInFetch(MOD_ANSWER);
    await addLevelMod("token", NEW_LEVEL, fetchUrl);
    expect(formOf(requests[0].init).get("metadata_blob")).toBe("1_tide_ruins");
  });

  test("sends its logo as a png", async () => {
    const { fetchUrl, requests } = standInFetch(MOD_ANSWER);
    await addLevelMod("token", NEW_LEVEL, fetchUrl);
    const logo = formOf(requests[0].init).get("logo") as File;
    expect([logo.name, logo.type, new Uint8Array(await logo.arrayBuffer())]).toEqual(["logo.png", "image/png", LOGO]);
  });

  test("is the new mod's id and page", async () => {
    const { fetchUrl } = standInFetch(MOD_ANSWER);
    expect(await addLevelMod("token", NEW_LEVEL, fetchUrl)).toEqual({ id: 17302, page: MOD_ANSWER.profile_url });
  });

  test("is mod.io's reason when it refuses", async () => {
    const { fetchUrl } = standInFetch({ error: { code: 422, message: "Validation failed.", errors: { summary: "Too long." } } }, 422);
    expect(await addLevelMod("token", NEW_LEVEL, fetchUrl)).toEqual({ problem: "Validation failed. Too long." });
  });

  test("says when mod.io can't be reached", async () => {
    const fetchUrl = async () => { throw new Error("offline"); };
    expect(await addLevelMod("token", NEW_LEVEL, fetchUrl)).toEqual({ problem: "mod.io couldn't be reached (offline)" });
  });
});

describe("adding a level's file", () => {
  test("posts to its mod's files", async () => {
    const { fetchUrl, requests } = standInFetch({ id: 1 });
    await addLevelFile("token", 17302, ZIP, fetchUrl);
    expect(requests[0].url).toBe(`${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}/mods/17302/files`);
  });

  test("sends the zip as its file data", async () => {
    const { fetchUrl, requests } = standInFetch({ id: 1 });
    await addLevelFile("token", 17302, ZIP, fetchUrl);
    const file = formOf(requests[0].init).get("filedata") as File;
    expect([file.name, new Uint8Array(await file.arrayBuffer())]).toEqual(["level.zip", ZIP]);
  });

  test("signs in with the player's token", async () => {
    const { fetchUrl, requests } = standInFetch({ id: 1 });
    await addLevelFile("token", 17302, ZIP, fetchUrl);
    expect(new Headers(requests[0].init?.headers).get("Authorization")).toBe("Bearer token");
  });

  test("is nothing wrong once it's added", async () => {
    const { fetchUrl } = standInFetch({ id: 1 });
    expect(await addLevelFile("token", 17302, ZIP, fetchUrl)).toEqual({});
  });

  test("is mod.io's reason when it refuses", async () => {
    const { fetchUrl } = standInFetch({ error: { code: 403, message: "You don't own this mod." } }, 403);
    expect(await addLevelFile("token", 17302, ZIP, fetchUrl)).toEqual({ problem: "You don't own this mod." });
  });
});
