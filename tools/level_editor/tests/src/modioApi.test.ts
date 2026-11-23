import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchOwnLevelMod, isSignedOutError } from "../../src/modioApi";

afterEach(() => { vi.unstubAllGlobals(); });

// the editor server answering every request with status and text
const serverAnswers = (status: number, text: string) =>
  vi.stubGlobal("fetch", async () => new Response(text, { status }));

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
    serverAnswers(400, "Your access token has expired.");
    await expect(fetchOwnLevelMod("1_tide_ruins")).rejects.toThrow("Your access token has expired.");
  });

  test("signs the player out when it's a 401", async () => {
    serverAnswers(401, "Sign in to mod.io first.");
    expect(isSignedOutError(await thrownBy(fetchOwnLevelMod("1_tide_ruins")))).toBe(true);
  });

  test("doesn't sign the player out when it's anything else", async () => {
    serverAnswers(400, "Validation failed.");
    expect(isSignedOutError(await thrownBy(fetchOwnLevelMod("1_tide_ruins")))).toBe(false);
  });

  test("doesn't sign the player out when the server can't be reached", () => {
    expect(isSignedOutError(new TypeError("Failed to fetch"))).toBe(false);
  });
});
