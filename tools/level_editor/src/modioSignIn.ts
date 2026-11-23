// checking what the player types to sign in to mod.io: their email, then the
// code mod.io emails them

const EMAIL = /^[^@\s]+@[^@\s]+$/;
const CODE = /^[A-Z0-9]{5}$/;

export function emailProblem(email: string): string | null {
  if (!EMAIL.test(email.trim())) {
    return "Type the email you sign in to mod.io with.";
  }
  return null;
}

// the code as mod.io takes it, from what was typed
export const signInCode = (typed: string) => typed.trim().toUpperCase();

export function signInCodeProblem(code: string): string | null {
  if (!CODE.test(code)) {
    return "The code mod.io emailed is 5 letters and digits.";
  }
  return null;
}
