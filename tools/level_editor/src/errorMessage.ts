// what went wrong, from whatever was thrown: an Error's message, or the thing
// itself as text
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
