// what a call answered, or why there's no answer, for the calls the tools make
// online (mod.io, GitHub) and what they do with it

export type Answer<T> = T | Problem;
// signedOut when mod.io refused the player's token
export type Problem = { problem: string; signedOut?: true };

export const isProblem = <T>(answer: Answer<T>): answer is Problem =>
  typeof answer === "object" && answer !== null && "problem" in answer;
