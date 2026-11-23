import { describe, expect, test } from "vitest";
import { fetchOwnLevelMod, isSignedOutError } from "../../src/modioApi";

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
