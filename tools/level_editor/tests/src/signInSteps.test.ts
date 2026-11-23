import { describe, expect, test } from "vitest";
import { trySendCode, trySendEmail } from "../../src/modioSignIn";

// a stand-in for sending to the editor server: what it was sent, failing with
// refusal if there's one
function standInSend(refusal?: string) {
  const sent: string[] = [];
  const send = async (text: string) => {
    sent.push(text);
    if (refusal) {
      throw new Error(refusal);
    }
  };
  return { send, sent };
}

describe("sending the email to sign in with", () => {
  test("sends it without the spaces around it, with nothing wrong", async () => {
    const { send, sent } = standInSend();
    expect(await trySendEmail(" me@example.com ", send)).toBeNull();
    expect(sent).toEqual(["me@example.com"]);
  });

  test("sends nothing when it isn't an email, saying so", async () => {
    const { send, sent } = standInSend();
    expect(await trySendEmail("me", send)).toBe(
      "Type the email you sign in to mod.io with.",
    );
    expect(sent).toEqual([]);
  });

  test("is why the server refused it", async () => {
    const { send } = standInSend("Invalid email.");
    expect(await trySendEmail("me@example.com", send)).toBe("Invalid email.");
  });
});

describe("sending the code mod.io emailed", () => {
  test("sends it as mod.io takes it, with nothing wrong", async () => {
    const { send, sent } = standInSend();
    expect(await trySendCode(" ab12c ", send)).toBeNull();
    expect(sent).toEqual(["AB12C"]);
  });

  test("sends nothing when it isn't a code, saying so", async () => {
    const { send, sent } = standInSend();
    expect(await trySendCode("ab", send)).toBe(
      "The code mod.io emailed is 5 letters and digits.",
    );
    expect(sent).toEqual([]);
  });

  test("is why the server refused it", async () => {
    const { send } = standInSend("The security code is invalid.");
    expect(await trySendCode("AB12C", send)).toBe("The security code is invalid.");
  });
});
