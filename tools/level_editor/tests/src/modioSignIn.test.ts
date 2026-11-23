import { describe, expect, test } from "vitest";
import { emailProblem, signInCode, signInCodeProblem } from "../../src/modioSignIn";

describe("the email to sign in to mod.io with", () => {
  test("is fine with something before and after an @", () => {
    expect(emailProblem("me@example.com")).toBeNull();
  });

  test.each(["", "me", "@example.com", "me@"])("needs to be an email: %j", (email) => {
    expect(emailProblem(email)).toBe("Type the email you sign in to mod.io with.");
  });
});

describe("the code mod.io emails", () => {
  test("is what was typed, in capitals, without spaces around it", () => {
    expect(signInCode(" ab12c ")).toBe("AB12C");
  });

  test("is fine with 5 letters and digits", () => {
    expect(signInCodeProblem("AB12C")).toBeNull();
  });

  test.each(["", "AB12", "AB12CD", "AB-2C"])("needs 5 letters and digits: %j", (code) => {
    expect(signInCodeProblem(code)).toBe("The code mod.io emailed is 5 letters and digits.");
  });
});
