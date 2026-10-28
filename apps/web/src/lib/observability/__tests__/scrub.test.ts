import { describe, expect, it } from "vitest";
import { redactSearchQuery, withoutQueryData } from "../scrub";

describe("redactSearchQuery", () => {
  it("oculta el texto de búsqueda y conserva el resto de la URL", () => {
    expect(redactSearchQuery("/api/transaction?from=2026-09-01&q=farmacia%20mama&to=2026-10-01")).toBe(
      "/api/transaction?from=2026-09-01&q=[Filtered]&to=2026-10-01",
    );
    expect(redactSearchQuery("/api/transaction?q=taxi#top")).toBe("/api/transaction?q=[Filtered]#top");
  });

  it("no toca parámetros que sólo terminan en q", () => {
    expect(redactSearchQuery("/x?faq=1&seq=2")).toBe("/x?faq=1&seq=2");
  });

  it("recorre objetos y arrays anidados sin mutar el original", () => {
    const event = {
      request: { url: "https://app/api/transaction?q=regalo" },
      breadcrumbs: [{ data: { url: "/api/transaction?q=hotel&from=2026-01-01" } }, { data: { status: 200 } }],
    };

    expect(redactSearchQuery(event)).toEqual({
      request: { url: "https://app/api/transaction?q=[Filtered]" },
      breadcrumbs: [{ data: { url: "/api/transaction?q=[Filtered]&from=2026-01-01" } }, { data: { status: 200 } }],
    });
    expect(event.request.url).toBe("https://app/api/transaction?q=regalo");
  });

  it("deja pasar valores que no son texto ni objetos", () => {
    expect(redactSearchQuery(42)).toBe(42);
    expect(redactSearchQuery(null)).toBeNull();
    expect(redactSearchQuery(undefined)).toBeUndefined();
  });
});

describe("withoutQueryData", () => {
  const prismaMessage = [
    "Invalid `prisma.transaction.create()` invocation:",
    "",
    '{ data: { description: "Farmacia", amount: 25.5 } }',
    "",
    "Unique constraint failed on the fields: (`id`)",
  ].join("\n");

  it("quita de un error de Prisma los argumentos de la query y conserva operación y motivo", () => {
    const original = new Error(prismaMessage);
    original.name = "PrismaClientKnownRequestError";

    const safe = withoutQueryData(original) as Error;

    expect(safe.message).toBe(
      "Invalid `prisma.transaction.create()` invocation: Unique constraint failed on the fields: (`id`)",
    );
    expect(safe.message).not.toContain("Farmacia");
    expect(safe.name).toBe("PrismaClientKnownRequestError");
    expect(safe.stack).not.toContain("Farmacia");
  });

  it("devuelve igual cualquier otro error o valor", () => {
    const plain = new Error("connection reset");
    expect(withoutQueryData(plain)).toBe(plain);
    expect(withoutQueryData("texto")).toBe("texto");
  });
});
