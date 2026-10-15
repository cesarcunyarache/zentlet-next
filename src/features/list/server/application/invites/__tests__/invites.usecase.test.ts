import { describe, expect, it, vi } from "vitest";
import { AcceptInviteUseCase } from "../accept-invite.usecase";
import { CreateInviteUseCase } from "../create-invite.usecase";
import { EmailInviteUseCase } from "../email-invite.usecase";
import { PreviewInviteUseCase } from "../preview-invite.usecase";
import { RevokeInviteUseCase } from "../revoke-invite.usecase";
import {
  LIST_ID,
  OWNER,
  fakeCurrency,
  fakeInvites,
  fakeLists,
  fakeMembers,
  fakeNotifier,
  fakeTokens,
  membersWithRoles,
  storedInvite,
} from "../../__tests__/fakes";

const NOW = new Date("2026-10-10T12:00:00Z");
const GUEST = "guest-1";
const notMember = () => fakeMembers({ find: vi.fn().mockResolvedValue(null) });

describe("CreateInviteUseCase", () => {
  it("guarda solo el hash del token y vence en 7 días", async () => {
    const invites = fakeInvites();

    const result = await new CreateInviteUseCase(invites, fakeLists(), fakeMembers(), fakeTokens()).execute(
      OWNER,
      LIST_ID,
      { role: "viewer" },
      NOW,
    );

    expect(invites.create).toHaveBeenCalledWith(
      expect.objectContaining({ listId: LIST_ID, role: "viewer", tokenHash: "hashed", createdById: OWNER }),
    );
    expect(result).toMatchObject({ token: "plain-token-1234567890", invite: { expiresAt: new Date("2026-10-17T12:00:00Z") } });
  });

  it("solo el dueño invita", async () => {
    const result = await new CreateInviteUseCase(fakeInvites(), fakeLists(), membersWithRoles({ ed: "editor" }), fakeTokens()).execute(
      "ed",
      LIST_ID,
      { role: "viewer" },
    );

    expect(result).toEqual({ error: "forbidden" });
  });
});

describe("RevokeInviteUseCase", () => {
  it("una invitación ya usada no se puede revocar", async () => {
    const invites = fakeInvites({ revoke: vi.fn().mockResolvedValue(false) });

    expect(await new RevokeInviteUseCase(invites, fakeMembers()).execute(OWNER, LIST_ID, "invite-1")).toEqual({
      error: "invite_invalid",
    });
  });
});

describe("PreviewInviteUseCase", () => {
  it("busca por el hash del token, nunca por el token", async () => {
    const invites = fakeInvites({ findByTokenHash: vi.fn().mockResolvedValue(storedInvite()) });

    const result = await new PreviewInviteUseCase(invites, notMember(), fakeTokens()).execute(GUEST, "abc", NOW);

    expect(invites.findByTokenHash).toHaveBeenCalledWith("hash:abc");
    expect(result).toMatchObject({ isMember: false, invite: { list: { ownerName: "Ana" } } });
  });

  it("una invitación vencida no muestra la lista", async () => {
    const invites = fakeInvites({
      findByTokenHash: vi.fn().mockResolvedValue(storedInvite({ expiresAt: new Date("2026-10-01T00:00:00Z") })),
    });

    expect(await new PreviewInviteUseCase(invites, notMember(), fakeTokens()).execute(GUEST, "abc", NOW)).toEqual({
      error: "invite_invalid",
    });
  });
});

describe("AcceptInviteUseCase", () => {
  const accept = (invites = fakeInvites(), members = notMember(), currency = fakeCurrency(), notifier = fakeNotifier()) =>
    new AcceptInviteUseCase(invites, members, fakeTokens(), currency, notifier);
  const withInvite = (overrides = {}) => fakeInvites({ findByTokenHash: vi.fn().mockResolvedValue(storedInvite(overrides)) });

  it("une al invitado y avisa al dueño", async () => {
    const invites = withInvite();
    const notifier = fakeNotifier();

    const result = await accept(invites, notMember(), fakeCurrency(), notifier).execute(GUEST, "abc", NOW);

    expect(result).toEqual({ listId: LIST_ID, joined: true });
    expect(invites.accept).toHaveBeenCalledWith("invite-1", GUEST, NOW);
    expect(notifier.memberJoined).toHaveBeenCalledWith(OWNER, { listId: LIST_ID, listName: "Viaje a Cusco", memberName: "Ana" });
  });

  it("si ya es miembro no gasta la invitación", async () => {
    const invites = withInvite();

    expect(await accept(invites, fakeMembers()).execute(OWNER, "abc", NOW)).toEqual({ listId: LIST_ID, joined: false });
    expect(invites.accept).not.toHaveBeenCalled();
  });

  it("un editor con otra moneda no puede unirse", async () => {
    expect(await accept(withInvite(), notMember(), fakeCurrency("USD")).execute(GUEST, "abc", NOW)).toEqual({
      error: "currency_mismatch",
    });
  });

  it("un lector puede unirse aunque use otra moneda", async () => {
    const result = await accept(withInvite({ role: "viewer" }), notMember(), fakeCurrency("USD")).execute(GUEST, "abc", NOW);

    expect(result).toMatchObject({ joined: true });
  });

  it("si otra persona la usó primero, falla sin avisar a nadie", async () => {
    const invites = fakeInvites({
      findByTokenHash: vi.fn().mockResolvedValue(storedInvite()),
      accept: vi.fn().mockResolvedValue(false),
    });
    const notifier = fakeNotifier();

    expect(await accept(invites, notMember(), fakeCurrency(), notifier).execute(GUEST, "abc", NOW)).toEqual({
      error: "invite_invalid",
    });
    expect(notifier.memberJoined).not.toHaveBeenCalled();
  });
});

describe("EmailInviteUseCase", () => {
  const input = { role: "editor" as const, email: "diego@gmail.com", locale: "es" as const };

  function emailInvite({ members = fakeMembers(), sent = true } = {}) {
    const invites = fakeInvites();
    const mailer = { send: vi.fn().mockResolvedValue(sent) };
    const useCase = new EmailInviteUseCase(
      new CreateInviteUseCase(invites, fakeLists(), members, fakeTokens()),
      invites,
      fakeLists(),
      members,
      mailer,
    );
    return { useCase, invites, mailer };
  }

  it("crea la invitación a nombre del correo y la envía con el token", async () => {
    const { useCase, invites, mailer } = emailInvite();

    const result = await useCase.execute(OWNER, LIST_ID, input);

    expect(invites.create).toHaveBeenCalledWith(expect.objectContaining({ email: "diego@gmail.com" }));
    expect(mailer.send).toHaveBeenCalledWith({
      to: "diego@gmail.com",
      token: "plain-token-1234567890",
      inviterName: "Ana",
      listName: "Viaje a Cusco",
      locale: "es",
    });
    expect(result).toMatchObject({ invite: { email: "diego@gmail.com" } });
    expect(result).not.toHaveProperty("token");
  });

  it("si el correo no sale, revoca la invitación para no dejar un link huérfano", async () => {
    const { useCase, invites } = emailInvite({ sent: false });

    expect(await useCase.execute(OWNER, LIST_ID, input)).toEqual({ error: "email_failed" });
    expect(invites.revoke).toHaveBeenCalled();
  });

  it("un editor no puede invitar por correo", async () => {
    const { useCase, mailer } = emailInvite({ members: membersWithRoles({ ed: "editor" }) });

    expect(await useCase.execute("ed", LIST_ID, input)).toEqual({ error: "forbidden" });
    expect(mailer.send).not.toHaveBeenCalled();
  });
});
