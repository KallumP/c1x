import { describe, expect, test } from "vitest";
import { fetchOwnLevelMod, isSignedOutError, uploadLevel } from "../../src/modioApi";

// a stand-in for fetch, the editor server answering every request with status and text
const serverAnswering = (status: number, text: string) =>
  async () => new Response(text, { status });

// what a request to the editor server threw
async function thrownBy(request: Promise<unknown>): Promise<unknown> {
  try {
    await request;
  } catch (error) {
    return error;
  }
  return null;
}

describe("a request the editor server refuses", () => {
  test("throws its text", async () => {
    const fetchUrl = serverAnswering(400, "Your access token has expired.");
    await expect(fetchOwnLevelMod("1_tide_ruins", fetchUrl)).rejects.toThrow(
      "Your access token has expired.",
    );
  });

  test("signs the player out when it's a 401", async () => {
    const fetchUrl = serverAnswering(401, "Sign in to mod.io first.");
    const thrown = await thrownBy(fetchOwnLevelMod("1_tide_ruins", fetchUrl));
    expect(isSignedOutError(thrown)).toBe(true);
  });

  test("doesn't sign the player out when it's anything else", async () => {
    const fetchUrl = serverAnswering(400, "Validation failed.");
    const thrown = await thrownBy(fetchOwnLevelMod("1_tide_ruins", fetchUrl));
    expect(isSignedOutError(thrown)).toBe(false);
  });

  test("doesn't sign the player out when the server can't be reached", () => {
    expect(isSignedOutError(new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("uploading a level through the editor server", () => {
  // a stand-in for fetch answering with an upload, and the requests it was sent
  function serverUploading() {
    const requests: { url: string; init?: RequestInit }[] = [];
    const fetchUrl = async (url: string, init?: RequestInit) => {
      requests.push({ url, init });
      return Response.json({ mod: { id: 17302 }, isNew: true });
    };
    return { fetchUrl, requests };
  }

  test("posts to the level's upload path", async () => {
    const { fetchUrl, requests } = serverUploading();
    await uploadLevel("1_tide_ruins", "AQID", fetchUrl);
    expect(requests[0].url).toBe("/api/modio/levels/1_tide_ruins/upload");
    expect(requests[0].init?.method).toBe("POST");
  });

  test("sends only its picture", async () => {
    const { fetchUrl, requests } = serverUploading();
    await uploadLevel("1_tide_ruins", "AQID", fetchUrl);
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({ logo: "AQID" });
  });
});
