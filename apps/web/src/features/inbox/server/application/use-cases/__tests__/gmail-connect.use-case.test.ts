import { describe, expect, it, vi } from "vitest";
import { GmailAccessService } from "../../services/gmail-access.service";
import { CompleteGmailConnectUseCase } from "../complete-gmail-connect.use-case";
import { fakeCipher, fakeGmailGateway, fakeGmailRepository, fakeMonitor, gmailConnection, USER } from "./fake-inbox";
import type { GmailGateway } from "../../../domain/ports/inbox.ports";
import type { GmailConnectionRepository } from "../../../domain/repositories/gmail-connection.repository";

function connect(repository: GmailConnectionRepository, gateway: GmailGateway = fakeGmailGateway()) {
  const monitor = fakeMonitor();
  const access = new GmailAccessService(repository, gateway, fakeCipher, monitor);
  return new CompleteGmailConnectUseCase(repository, gateway, access, fakeCipher, monitor).execute(USER, "code-1");
}

describe("CompleteGmailConnectUseCase", () => {
  it("guarda la cuenta con el token cifrado y el watch activo", async () => {
    const repository = fakeGmailRepository();

    expect(await connect(repository)).toBe("connected");
    expect(repository.save).toHaveBeenCalledWith(USER, {
      email: "cesar@gmail.com",
      sealedRefreshToken: "sealed:refresh-1",
      status: "active",
      historyId: BigInt(1000),
      watchExpiresAt: new Date("2026-10-23"),
    });
  });

  it("sin Gmail configurado es unavailable", async () => {
    const gateway = fakeGmailGateway({ isAvailable: vi.fn().mockReturnValue(false) });

    expect(await connect(fakeGmailRepository(), gateway)).toBe("unavailable");
    expect(gateway.exchangeCode).not.toHaveBeenCalled();
  });

  it("sin permiso de lectura es scope_denied", async () => {
    const gateway = fakeGmailGateway({
      exchangeCode: vi.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r", canReadInbox: false }),
    });

    expect(await connect(fakeGmailRepository(), gateway)).toBe("scope_denied");
  });

  it("una cuenta conectada por otro usuario es taken", async () => {
    const repository = fakeGmailRepository({
      findByEmail: vi.fn().mockResolvedValue(gmailConnection({ userId: "user-2" })),
    });

    expect(await connect(repository)).toBe("taken");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("al cambiar de cuenta desconecta la anterior", async () => {
    const previous = gmailConnection({ email: "old@gmail.com" });
    const repository = fakeGmailRepository({ findByUser: vi.fn().mockResolvedValue(previous) });

    expect(await connect(repository)).toBe("connected");
    expect(repository.deleteById).toHaveBeenCalledWith("gmail-1");
  });
});

describe("GmailAccessService", () => {
  it("un token revocado marca la conexión y no devuelve acceso", async () => {
    const repository = fakeGmailRepository();
    const gateway = fakeGmailGateway({ refreshAccessToken: vi.fn().mockResolvedValue("revoked") });

    const access = new GmailAccessService(repository, gateway, fakeCipher, fakeMonitor());

    expect(await access.accessTokenFor(gmailConnection())).toBeNull();
    expect(gateway.refreshAccessToken).toHaveBeenCalledWith("open:sealed-refresh");
    expect(repository.markRevoked).toHaveBeenCalledWith("gmail-1");
  });

  it("si limpiar en Google falla igual borra la conexión", async () => {
    const repository = fakeGmailRepository({ findByUser: vi.fn().mockResolvedValue(gmailConnection()) });
    const gateway = fakeGmailGateway({ revokeToken: vi.fn().mockRejectedValue(new Error("network")) });
    const monitor = fakeMonitor();

    await new GmailAccessService(repository, gateway, fakeCipher, monitor).disconnect(USER);

    expect(monitor.warn).toHaveBeenCalledWith("inbox.gmail_disconnect_cleanup_failed", expect.anything());
    expect(repository.deleteById).toHaveBeenCalledWith("gmail-1");
  });
});
