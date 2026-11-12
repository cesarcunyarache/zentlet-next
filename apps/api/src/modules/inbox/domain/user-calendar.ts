// Resolves "today" in the user's own timezone/locale. apps/web backs this
// with the preference module; this module only depends on the port so it
// never has to import across module boundaries.
export abstract class UserCalendar {
  abstract localDate(userId: string, at: Date): Promise<string>;
}
