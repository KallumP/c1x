import { describe, expect, test } from "vitest";
import {
  addLevelFile,
  addLevelMod,
  downloadLevelZip,
  findOwnLevelMod,
  listOnlineLevels,
  fetchOnlineLevel,
  setLevelLogo,
  MODIO_GAME,
  emailSignInCode,
  signInWithCode,
} from "../../scripts/modio";

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
const sentHeader = (init: RequestInit | undefined, name: string) =>
  new Headers(init?.headers).get(name);
const LOGO = new Uint8Array([1, 2, 3]);
const ZIP = new Uint8Array([4, 5, 6]);
const NEW_LEVEL = {
  name: "Tide Ruins",
  summary: "A beach.",
  folder: "1_tide_ruins",
  logo: LOGO,
};
const MOD_ANSWER = {
  id: 17302,
  profile_url: "https://test.mod.io/g/crash-1-n-hanced/m/tide-ruins",
};

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
    expect(sentHeader(requests[0].init, "Authorization")).toBe("Bearer token");
  });

  test("sends its name, summary and Level tag", async () => {
    const { fetchUrl, requests } = standInFetch(MOD_ANSWER);
    await addLevelMod("token", NEW_LEVEL, fetchUrl);
    const form = formOf(requests[0].init);
    expect([form.get("name"), form.get("summary"), form.get("tags[]")]).toEqual([
      "Tide Ruins",
      "A beach.",
      "Level",
    ]);
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
    expect([logo.name, logo.type, new Uint8Array(await logo.arrayBuffer())]).toEqual([
      "logo.png",
      "image/png",
      LOGO,
    ]);
  });

  test("is the new mod's id and page", async () => {
    const { fetchUrl } = standInFetch(MOD_ANSWER);
    expect(await addLevelMod("token", NEW_LEVEL, fetchUrl)).toEqual({
      id: 17302,
      page: MOD_ANSWER.profile_url,
    });
  });

  test("is mod.io's reason when it refuses", async () => {
    const refusal = {
      error: {
        code: 422,
        message: "Validation failed.",
        errors: { summary: "Too long." },
      },
    };
    const { fetchUrl } = standInFetch(refusal, 422);
    expect(await addLevelMod("token", NEW_LEVEL, fetchUrl)).toEqual({
      problem: "Validation failed. Too long.",
    });
  });

  test("is what mod.io answered when its refusal isn't json", async () => {
    const fetchUrl = async () => new Response("Bad Gateway", { status: 502 });
    expect(await addLevelMod("token", NEW_LEVEL, fetchUrl)).toEqual({
      problem: "mod.io answered 502",
    });
  });

  test("says when mod.io can't be reached", async () => {
    const fetchUrl = async () => { throw new Error("offline"); };
    expect(await addLevelMod("token", NEW_LEVEL, fetchUrl)).toEqual({
      problem: "mod.io couldn't be reached (offline)",
    });
  });
});

describe("adding a level's file", () => {
  test("posts to its mod's files", async () => {
    const { fetchUrl, requests } = standInFetch({ id: 1 });
    await addLevelFile("token", 17302, ZIP, fetchUrl);
    expect(requests[0].url).toBe(
      `${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}/mods/17302/files`,
    );
  });

  test("sends the zip as its file data", async () => {
    const { fetchUrl, requests } = standInFetch({ id: 1 });
    await addLevelFile("token", 17302, ZIP, fetchUrl);
    const file = formOf(requests[0].init).get("filedata") as File;
    expect([file.name, new Uint8Array(await file.arrayBuffer())]).toEqual([
      "level.zip",
      ZIP,
    ]);
  });

  test("signs in with the player's token", async () => {
    const { fetchUrl, requests } = standInFetch({ id: 1 });
    await addLevelFile("token", 17302, ZIP, fetchUrl);
    expect(sentHeader(requests[0].init, "Authorization")).toBe("Bearer token");
  });
});

const formFields = (init?: RequestInit) => Object.fromEntries(
  new URLSearchParams(String(init?.body)),
);

describe("sending a sign-in code", () => {
  test("posts the email and the game's api key to mod.io's email request", async () => {
    const { fetchUrl, requests } = standInFetch({ code: 200 });
    await emailSignInCode("me@example.com", fetchUrl);
    expect(requests[0].url).toBe(`${MODIO_GAME.apiUrl}/oauth/emailrequest`);
    expect(formFields(requests[0].init)).toEqual({
      api_key: MODIO_GAME.apiKey,
      email: "me@example.com",
    });
  });

  test("sends them as a form", async () => {
    const { fetchUrl, requests } = standInFetch({ code: 200 });
    await emailSignInCode("me@example.com", fetchUrl);
    const contentType = sentHeader(requests[0].init, "Content-Type");
    expect(contentType).toBe("application/x-www-form-urlencoded");
  });

  test("is nothing wrong once it's sent", async () => {
    const { fetchUrl } = standInFetch({ code: 200 });
    expect(await emailSignInCode("me@example.com", fetchUrl)).toEqual({});
  });
});

describe("signing in with a code", () => {
  test("posts the code and the game's api key to mod.io's email exchange", async () => {
    const { fetchUrl, requests } = standInFetch({
      access_token: "token",
      date_expires: 1800000000,
    });
    await signInWithCode("AB12C", fetchUrl);
    expect(requests[0].url).toBe(`${MODIO_GAME.apiUrl}/oauth/emailexchange`);
    expect(formFields(requests[0].init)).toEqual({
      api_key: MODIO_GAME.apiKey,
      security_code: "AB12C",
    });
  });

  test("is the player's token and when it runs out", async () => {
    const { fetchUrl } = standInFetch({
      access_token: "token",
      date_expires: 1800000000,
    });
    expect(await signInWithCode("AB12C", fetchUrl)).toEqual({
      token: "token",
      expires: 1800000000,
    });
  });

  test("is mod.io's reason, not signed out, when it refuses a wrong code", async () => {
    const { fetchUrl } = standInFetch(
      { error: { code: 401, message: "The security code is invalid." } },
      401,
    );
    expect(await signInWithCode("WRONG", fetchUrl)).toEqual({
      problem: "The security code is invalid.",
    });
  });
});

describe("finding the player's own mod for a level", () => {
  const OWN_MODS = {
    data: [{
      id: 17302,
      metadata_blob: "1_tide_ruins",
      profile_url: MOD_ANSWER.profile_url,
    }],
  };

  test("asks for the player's mods of the game with the level's folder as their metadata", async () => {
    const { fetchUrl, requests } = standInFetch(OWN_MODS);
    await findOwnLevelMod("token", "1_tide_ruins", fetchUrl);
    const url = new URL(requests[0].url);
    expect(`${url.origin}${url.pathname}`).toBe(`${MODIO_GAME.apiUrl}/me/mods`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      game_id: String(MODIO_GAME.gameId),
      metadata_blob: "1_tide_ruins",
    });
  });

  test("signs in with the player's token", async () => {
    const { fetchUrl, requests } = standInFetch(OWN_MODS);
    await findOwnLevelMod("token", "1_tide_ruins", fetchUrl);
    expect(sentHeader(requests[0].init, "Authorization")).toBe("Bearer token");
  });

  test("is the mod's id and page", async () => {
    const { fetchUrl } = standInFetch(OWN_MODS);
    expect(await findOwnLevelMod("token", "1_tide_ruins", fetchUrl)).toEqual({
      id: 17302,
      page: MOD_ANSWER.profile_url,
    });
  });

  test("is none when the player has no mod for it", async () => {
    const { fetchUrl } = standInFetch({ data: [] });
    expect(await findOwnLevelMod("token", "1_tide_ruins", fetchUrl)).toBeNull();
  });

  test("is none when mod.io answers with another level's mod", async () => {
    const { fetchUrl } = standInFetch({
      data: [{ id: 1, metadata_blob: "2_mossy_creek", profile_url: "" }],
    });
    expect(await findOwnLevelMod("token", "1_tide_ruins", fetchUrl)).toBeNull();
  });

  test("is mod.io's reason, signed out, when it refuses the player's token", async () => {
    const { fetchUrl } = standInFetch(
      { error: { code: 401, message: "Your access token has expired." } },
      401,
    );
    expect(await findOwnLevelMod("token", "1_tide_ruins", fetchUrl)).toEqual({
      problem: "Your access token has expired.",
      signedOut: true,
    });
  });
});

const LEVEL_ANSWER = {
  id: 17302,
  name: "Tide Ruins",
  metadata_blob: "1_tide_ruins",
  submitted_by: { username: "kallum" },
  modfile: { download: { binary_url: "https://mod.io/files/tide.zip" } },
};

describe("listing the levels on mod.io", () => {
  test("asks for all the game's mods, with the game's api key (each is a level, tagged or not)", async () => {
    const { fetchUrl, requests } = standInFetch({ data: [LEVEL_ANSWER] });
    await listOnlineLevels(fetchUrl);
    const url = new URL(requests[0].url);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}/mods`,
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({ api_key: MODIO_GAME.apiKey });
  });

  test("is each level's id, name and author", async () => {
    const { fetchUrl } = standInFetch({ data: [LEVEL_ANSWER] });
    expect(await listOnlineLevels(fetchUrl)).toEqual([
      {
        id: 17302,
        name: "Tide Ruins",
        author: "kallum",
        fileUrl: "https://mod.io/files/tide.zip",
      },
    ]);
  });

  test("leaves out a level with no file yet", async () => {
    const { fetchUrl } = standInFetch({ data: [{ ...LEVEL_ANSWER, modfile: null }] });
    expect(await listOnlineLevels(fetchUrl)).toEqual([]);
  });
});

describe("a level on mod.io, by its id", () => {
  test("asks for the mod with the game's api key", async () => {
    const { fetchUrl, requests } = standInFetch(LEVEL_ANSWER);
    await fetchOnlineLevel(17302, fetchUrl);
    const url = new URL(requests[0].url);
    expect(`${url.origin}${url.pathname}`).toBe(
      `${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}/mods/17302`,
    );
    expect(url.searchParams.get("api_key")).toBe(MODIO_GAME.apiKey);
  });

  test("is the level", async () => {
    const { fetchUrl } = standInFetch(LEVEL_ANSWER);
    expect(await fetchOnlineLevel(17302, fetchUrl)).toEqual({
      id: 17302,
      name: "Tide Ruins",
      author: "kallum",
      fileUrl: "https://mod.io/files/tide.zip",
    });
  });

  test("says when it has no file yet", async () => {
    const { fetchUrl } = standInFetch({ ...LEVEL_ANSWER, modfile: null });
    expect(await fetchOnlineLevel(17302, fetchUrl)).toEqual({
      problem: "Tide Ruins has no file on mod.io yet.",
    });
  });
});

describe("downloading a level's zip", () => {
  test("is the file's bytes", async () => {
    const fetchUrl = async () => new Response(new Uint8Array([1, 2, 3]));
    expect(await downloadLevelZip("https://mod.io/files/tide.zip", fetchUrl)).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  test("says when the download can't be reached", async () => {
    const fetchUrl = async () => { throw new Error("offline"); };
    expect(await downloadLevelZip("https://mod.io/files/tide.zip", fetchUrl)).toEqual({
      problem: "the download failed (offline)",
    });
  });

  test("says when the download is refused", async () => {
    const fetchUrl = async () => new Response("gone", { status: 404 });
    expect(await downloadLevelZip("https://mod.io/files/tide.zip", fetchUrl)).toEqual({
      problem: "the download answered 404",
    });
  });
});

describe("setting an online level's picture", () => {
  test("posts it to its mod's media", async () => {
    const { fetchUrl, requests } = standInFetch({ code: 201 });
    await setLevelLogo("token", 17302, LOGO, fetchUrl);
    expect(requests[0].url).toBe(
      `${MODIO_GAME.apiUrl}/games/${MODIO_GAME.gameId}/mods/17302/media`,
    );
    expect(requests[0].init?.method).toBe("POST");
  });

  test("sends it as the mod's logo", async () => {
    const { fetchUrl, requests } = standInFetch({ code: 201 });
    await setLevelLogo("token", 17302, LOGO, fetchUrl);
    expect(formOf(requests[0].init).has("logo")).toBe(true);
  });
});
