import { useEffect, useState } from "react";
import { fetchSignedIn, sendSignInCode, sendSignInEmail, signOutOfModio } from "../modioApi";
import { emailProblem, signInCode, signInCodeProblem } from "../modioSignIn";

export type SignInStep = "email" | "code";

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// signing in to mod.io: the player's email, then the code mod.io emails them
export function useModioAccount() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null); // null until the server says
  const [step, setStep] = useState<SignInStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    fetchSignedIn().then(setSignedIn, (error) => setProblem(messageOf(error)));
  }, []);

  // runs a step after checking what was typed, busy until it's done; whether it worked
  const runStep = async (typedProblem: string | null, send: () => Promise<void>): Promise<boolean> => {
    setProblem(typedProblem);
    if (typedProblem) {
      return false;
    }
    setIsBusy(true);
    try {
      await send();
      return true;
    } catch (error) {
      setProblem(messageOf(error));
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const sendEmail = async () => {
    if (await runStep(emailProblem(email), () => sendSignInEmail(email.trim()))) {
      setStep("code");
    }
  };

  const sendCode = async () => {
    const typed = signInCode(code);
    if (await runStep(signInCodeProblem(typed), () => sendSignInCode(typed))) {
      setSignedIn(true);
    }
  };

  // back to typing the email, to send another code
  const startAgain = () => {
    setStep("email");
    setCode("");
    setProblem(null);
  };

  const signOut = async () => {
    if (await runStep(null, signOutOfModio)) {
      setSignedIn(false);
      startAgain();
    }
  };

  // the token ran out or was refused: sign in again
  const signedOut = () => setSignedIn(false);

  return {
    signedIn,
    step,
    email,
    setEmail,
    code,
    setCode,
    problem,
    isBusy,
    sendEmail,
    sendCode,
    startAgain,
    signOut,
    signedOut,
  };
}
