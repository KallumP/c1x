import { useEffect, useState } from "react";
import {
  fetchSignedIn,
  sendSignInEmail,
  signOutOfModio,
  submitSignInCode,
} from "../modioApi";
import { attempt, trySendCode, trySendEmail } from "../modioSignIn";
import { errorMessage } from "../errorMessage";

type SignInStep = "email" | "code";

// signing in to mod.io: the player's email, then the code mod.io emails them
export function useModioAccount() {
  // null until the server says
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [step, setStep] = useState<SignInStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    fetchSignedIn().then(setSignedIn, (error) => setProblem(errorMessage(error)));
  }, []);

  // runs a step, busy until it's done, showing why if it failed; whether it worked
  const runStep = async (step: () => Promise<string | null>): Promise<boolean> => {
    setIsBusy(true);
    try {
      const failure = await step();
      setProblem(failure);
      return failure === null;
    } finally {
      setIsBusy(false);
    }
  };

  const sendEmail = async () => {
    if (await runStep(() => trySendEmail(email, sendSignInEmail))) {
      setStep("code");
    }
  };

  const sendCode = async () => {
    if (await runStep(() => trySendCode(code, submitSignInCode))) {
      setSignedIn(true);
    }
  };

  // back to typing the email, to send another code
  const startAgain = () => {
    setStep("email");
    setCode("");
    setProblem(null);
  };

  // back to the email step: the player signed out, or their sign-in ran out or was
  // refused
  const returnToSignIn = () => {
    setSignedIn(false);
    startAgain();
  };

  const signOut = async () => {
    if (await runStep(() => attempt(signOutOfModio))) {
      returnToSignIn();
    }
  };

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
    returnToSignIn,
  };
}
