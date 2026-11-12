export abstract class WhatsappMessenger {
  abstract send(phone: string, text: string): Promise<void>;
}
