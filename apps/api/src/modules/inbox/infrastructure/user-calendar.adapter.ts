import { Injectable } from '@nestjs/common';
import { UserCalendar } from '../domain/user-calendar.js';

// apps/web backs this with the preference module's timezone-aware use case.
// This module intentionally has no dependency on preference, so it defaults
// to the received-at date in UTC until a future wiring layer supplies one.
@Injectable()
export class UtcUserCalendar extends UserCalendar {
  async localDate(_userId: string, at: Date): Promise<string> {
    return at.toISOString().slice(0, 10);
  }
}
