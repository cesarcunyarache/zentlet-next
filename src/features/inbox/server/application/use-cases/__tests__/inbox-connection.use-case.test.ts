import { describe, expect, it, vi } from "vitest";
import { CreateInboxConnectionUseCase } from "../create-inbox-connection.use-case";
import { GetInboxConnectionUseCase } from "../get-inbox-connection.use-case";
import {
  fakeEmailInboxRepository,
  fakeGmailGateway,
  fakeGmailRepository,
  fakeSenderRepository,
  sender,
  USER,
} from "./fake-inbox";

const mailbox = (domain: string | null = "in.zentlet.test") => ({ domain: () => domain });

describe("CreateInboxConnectionUseCase", () => {
  it("sin dominio de entrada configurado es email_import_unavailable", async () => {
    const repository = fakeEmailInboxRepository();

    expect(await new CreateInboxConnectionUseCase(repository, mailbox(null)).execute(USER)).toEqual({
      error: "email_import_unavailable",
    });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("asigna una dirección del dominio de entrada", async () => {
    const repository = fakeEmailInboxRepository();

    const result = await new CreateInboxConnectionUseCase(repository, mailbox()).execute(USER);

    expect(result).toMatchObject({ inbox: { userId: USER } });
    expect(vi.mocked(repository.insert).mock.calls[0][1]).toMatch(/@in\.zentlet\.test$/);
  });

  it("si ya tiene dirección la devuelve sin crear otra", async () => {
    const existing = { id: "inbox-1", userId: USER, address: "a@in.zentlet.test", verificationCode: null, verificationUrl: null, lastReceivedAt: null };
    const repository = fakeEmailInboxRepository({ findByUser: vi.fn().mockResolvedValue(existing) });

    expect(await new CreateInboxConnectionUseCase(repository, mailbox()).execute(USER)).toEqual({ inbox: existing });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("tras tres choques de dirección falla", async () => {
    const repository = fakeEmailInboxRepository({ insert: vi.fn().mockResolvedValue("conflict") });

    await expect(new CreateInboxConnectionUseCase(repository, mailbox()).execute(USER)).rejects.toThrow(
      "Could not allocate an inbox address",
    );
    expect(repository.insert).toHaveBeenCalledTimes(3);
  });
});

describe("GetInboxConnectionUseCase", () => {
  it("muestra sólo los remitentes bloqueados o de confianza", async () => {
    const blocked = sender({ id: "blocked", status: "blocked" });
    const manual = sender({ id: "manual", origin: "manual" });
    const unconfirmed = sender({ id: "unconfirmed" });
    const senders = fakeSenderRepository({ findAll: vi.fn().mockResolvedValue([blocked, manual, unconfirmed]) });

    const connection = await new GetInboxConnectionUseCase(
      fakeEmailInboxRepository(),
      senders,
      fakeGmailRepository(),
      mailbox(),
      fakeGmailGateway(),
    ).execute(USER);

    expect(connection.visibleSenders.map((visible) => visible.id)).toEqual(["blocked", "manual"]);
    expect(connection.isAvailable).toBe(true);
  });
});
