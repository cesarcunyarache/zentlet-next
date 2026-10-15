import { describe, expect, it } from "vitest";
import { hashLinkCode } from "../../../../lib/link-code";
import { CreateLinkCodeUseCase } from "../create-link-code.use-case";
import { GetConnectionUseCase } from "../get-connection.use-case";
import { UnlinkWhatsappUseCase } from "../unlink-whatsapp.use-case";
import { fakeLinks, PHONE, USER } from "./fakes";

const NOW = new Date("2026-10-15T12:00:00.000Z");
const randomBytes = () => Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);

describe("CreateLinkCodeUseCase", () => {
  it("guarda solo el hash del código, con 10 minutos de vigencia", async () => {
    const { repository } = fakeLinks();
    const result = await new CreateLinkCodeUseCase(repository, "51999888777", randomBytes, () => NOW).execute(USER);

    expect(result).toEqual({
      linkCode: {
        code: "ABCD-EFGH",
        url: "https://wa.me/51999888777?text=vincular%20ABCD-EFGH",
        expiresAt: "2026-10-15T12:10:00.000Z",
      },
    });
    expect(repository.saveLinkCode).toHaveBeenCalledWith(USER, hashLinkCode("ABCDEFGH"), new Date("2026-10-15T12:10:00.000Z"));
  });

  it("sin número de WhatsApp configurado no está disponible", async () => {
    const { repository } = fakeLinks();
    expect(await new CreateLinkCodeUseCase(repository, null, randomBytes).execute(USER)).toEqual({ error: "not_available" });
    expect(repository.saveLinkCode).not.toHaveBeenCalled();
  });
});

describe("GetConnectionUseCase y UnlinkWhatsappUseCase", () => {
  it("muestra el número vinculado y lo desvincula", async () => {
    const { repository } = fakeLinks();
    const connection = new GetConnectionUseCase(repository, "51999888777");

    expect(await connection.execute(USER)).toMatchObject({ isAvailable: true, phone: PHONE });
    expect(await new UnlinkWhatsappUseCase(repository).execute(USER)).toEqual({ ok: true });
    expect(await connection.execute(USER)).toMatchObject({ phone: null, linkedAt: null });
    expect(await new UnlinkWhatsappUseCase(repository).execute(USER)).toEqual({ error: "not_linked" });
  });
});
