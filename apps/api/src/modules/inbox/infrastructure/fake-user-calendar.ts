import { UserCalendar } from '../domain/user-calendar.js';

export class FakeUserCalendar extends UserCalendar {
  constructor(private readonly isoDate: string = '2026-09-25') {
    super();
  }

  async localDate(): Promise<string> {
    return this.isoDate;
  }
}
