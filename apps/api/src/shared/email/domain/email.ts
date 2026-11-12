export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export abstract class EmailSender {
  abstract readonly name: string;
  abstract send(email: Email, from: string): Promise<void>;
}
