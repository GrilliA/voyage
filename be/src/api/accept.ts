import { BadInput } from "../core/errors.ts";

export function accept<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof BadInput) throw error;
    if (error instanceof Error) throw new BadInput(error.message);
    throw new BadInput("Richiesta non valida.");
  }
}
