// checking and sending what the player types to sign in to mod.io: their email,
// then the code mod.io emails them
import { errorMessage } from "./errorMessage";

const EMAIL = /^[^@\s]+@[^@\s]+$/;
const CODE = /^[A-Z0-9]{5}$/;

export function emailProblem(email: string): string | null {
  if (!EMAIL.test(email.trim())) {
    return "Type the email you sign in to mod.io with.";
  }
  return null;
}

// the code as mod.io takes it, from what was typed
export const typedSignInCode = (typed: string) => typed.trim().toUpperCase();

export function signInCodeProblem(code: string): string | null {
  if (!CODE.test(code)) {
    return "The code mod.io emailed is 5 letters and digits.";
  }
  return null;
}

// sends to the editor server, or a test's stand-in for it
type Send = (text: string) => Promise<void>;

// runs a request; why it failed, or null if it didn't
export async function attempt(request: () => Promise<void>): Promise<string | null> {
  try {
    await request();
    return null;
  } catch (error) {
    return errorMessage(error);
  }
}

// sends the email typed, without the spaces around it; why it wasn't sent (it isn't
// an email, or the server refused it), or null if it was
export async function trySendEmail(typed: string, send: Send): Promise<string | null> {
  const email = typed.trim();
  return emailProblem(email) ?? attempt(() => send(email));
}

// sends the code typed, as mod.io takes it; why it wasn't sent (it isn't a code,
// or the server refused it), or null if it was
export async function trySendCode(typed: string, send: Send): Promise<string | null> {
  const code = typedSignInCode(typed);
  return signInCodeProblem(code) ?? attempt(() => send(code));
}
